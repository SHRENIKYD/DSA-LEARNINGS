(function () {
  var topics = [], practice = [], quiz = [], interview = [];

  /* ---------- shared helpers for the visualizers (deterministic, no randomness) ---------- */
  // 32-bit FNV-1a followed by the MurmurHash3 finalizer (fmix32) so that similar
  // strings like "A#1" and "A#2" land far apart on the ring.
  function h32(s) {
    s = String(s);
    var h = 0x811c9dc5;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
    h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b);
    h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35);
    h ^= h >>> 16;
    return h >>> 0;
  }
  // position on a 0..359 degree ring
  function deg(s) { return h32(s) % 360; }
  // (x, y) for an angle measured clockwise from 12 o'clock, on a circle centred at (50, 50)
  function ringXY(angle, r) {
    var t = angle * Math.PI / 180;
    return { x: Math.round((50 + r * Math.sin(t)) * 10) / 10, y: Math.round((50 - r * Math.cos(t)) * 10) / 10 };
  }
  function words(s) { return String(s || '').trim().split(/[\s,]+/).filter(function (w) { return w.length > 0; }); }
  function copyObj(o) { var r = {}; for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) r[k] = o[k]; return r; }
  // parse "A" or "A@120" into {name, pos}
  function parsePlaced(tok, label) {
    var m = /^([A-Za-z0-9_:.\-#]+)(?:@(\d{1,3}))?$/.exec(tok);
    if (!m) throw new Error('Bad ' + label + ' "' + tok + '" — use a name like A or A@120 (angle 0-359)');
    var p = m[2] !== undefined ? Number(m[2]) : deg(m[1]);
    if (p > 359) throw new Error('Angles must be 0-359 (got ' + p + ')');
    return { name: m[1], pos: p };
  }
  // first server clockwise from angle a (inclusive). servers sorted by pos.
  function ownerOf(servers, a) {
    for (var i = 0; i < servers.length; i++) if (servers[i].pos >= a) return servers[i];
    return servers[0];
  }

  /* =====================================================================
     TOPIC 1 — Why modulo hashing breaks
     ===================================================================== */
  topics.push({
    title: 'Why hash(key) % N Breaks When Servers Change',
    analogy: `<p>Imagine a school with <b>4 lockers rows</b>. The rule is: "your row = your roll number % 4". It works great — until the school adds a <b>5th row</b>. Now the rule is "roll number % 5", and suddenly <b>almost every student</b> has to carry their stuff to a different row on the same morning. The hallway jams, books get lost, and nobody can find anything for a day.</p><p>That morning chaos is exactly what happens to a cache or database cluster that spreads keys with <code>hash(key) % N</code> and then changes N.</p>`,
    explain: `<p><b>The setup.</b> You have more data than one machine can hold, so you split it across N servers. The simplest rule anyone would write is:</p>
      <pre>server = hash(key) % N</pre>
      <p>The hash turns any key (<code>"user42"</code>, <code>"cat.jpg"</code>) into a big number; <code>% N</code> squashes it into 0 … N−1. Every client computes the same answer with no lookup table. It is fast, simple, and spreads keys evenly. ${H.c('g', 'While N never changes, it is perfect.')}</p>
      <p><b>The problem.</b> N <i>does</i> change: a server dies, you add capacity for Black Friday, you replace a machine. The moment N becomes N+1, the formula gives a different answer for most keys:</p>
      ${H.table(['key', 'hash', 'hash % 4', 'hash % 5', 'moved?'], [
        ['user1', '19', '3', '4', H.c('r', 'yes')],
        ['user2', '391', '3', '1', H.c('r', 'yes')],
        ['user3', '304', '0', '4', H.c('r', 'yes')],
        ['user4', '560', '0', '0', H.c('g', 'no')],
        ['user5', '817', '1', '2', H.c('r', 'yes')]
      ])}
      <p><b>How many move?</b> A key stays only if <code>h % N == h % (N+1)</code>. That happens for exactly N out of every N·(N+1) hash values — so only <b>1/(N+1)</b> of keys stay and <b>N/(N+1) move</b>. Going from 4 → 5 servers moves <b>80%</b> of keys. Going from 99 → 100 moves <b>99%</b>. The bigger your cluster, the worse it gets!</p>
      <p><b>Why that hurts in real life:</b></p>
      <ul>
        <li><b>Caches:</b> a "moved" key is a cache miss. 80% misses at once = a stampede of requests hitting the database → the database falls over (a <i>cache avalanche</i>).</li>
        <li><b>Databases/stores:</b> a moved key means <b>data must be copied</b> over the network. Moving 80% of 50 TB is a multi-day migration, while the cluster is also serving traffic.</li>
        <li><b>Failures:</b> a server crash is also "N changes". So one dead box reshuffles everything — exactly when you are already in trouble.</li>
      </ul>
      <p><b>What we actually want:</b> when one server joins or leaves, only about <b>1/N of the keys</b> should move — just the ones that must (the new server's fair share, or the dead server's keys). That property is called <b>minimal disruption</b>, and it is the whole reason consistent hashing exists.</p>`,
    clues: [
      '"servers are added and removed frequently" / "elastic scaling" → plain modulo is a red flag',
      '"minimize data movement when a node joins or leaves" → consistent hashing',
      '"cache cluster" + "avoid a cache stampede when a node dies" → avoid hash % N',
      'You catch yourself writing <code>shard = userId % numShards</code> for a growing system → say out loud what happens when numShards changes',
      '"rebalancing", "resharding", "re-partitioning without downtime" → you need a scheme with minimal movement'
    ],
    code: [{
      lang: 'python', run: true, title: 'Experiment: how many keys move with modulo vs a hash ring (runnable)',
      code: `import hashlib
import bisect

def h(s):
    # Stable hash (never use Python's built-in hash(): it is randomized per process!)
    return int.from_bytes(hashlib.md5(s.encode()).digest()[:8], "big")

keys = [f"user{i}" for i in range(20000)]

def modulo_moves(n):
    """Fraction of keys whose server changes when n servers become n + 1."""
    moved = sum(1 for k in keys if h(k) % n != h(k) % (n + 1))
    return moved / len(keys)

def ring_owner(tokens, owners, key):
    i = bisect.bisect_left(tokens, h(key))
    return owners[tokens[i % len(tokens)]]

def ring_moves(n, vnodes=100):
    def build(count):
        owners = {}
        for s in range(count):
            for v in range(vnodes):
                owners[h(f"server{s}#{v}")] = f"server{s}"
        return sorted(owners), owners
    t1, o1 = build(n)
    t2, o2 = build(n + 1)
    moved = sum(1 for k in keys if ring_owner(t1, o1, k) != ring_owner(t2, o2, k))
    return moved / len(keys)

print("N -> N+1 | modulo moves | theory N/(N+1) | ring moves | theory 1/(N+1)")
for n in (2, 4, 10):
    print(f"{n:>2} -> {n + 1:<3} | {modulo_moves(n):11.1%} | {n / (n + 1):14.1%} |"
          f" {ring_moves(n):9.1%} | {1 / (n + 1):13.1%}")
`
    }],
    codeTitle: ['Measure it yourself'],
    viz: {
      title: 'Modulo placement, then add one server',
      input: 'user1 user2 user3 user4 user5 user6 user7 user8 user9 user10 | 4',
      inputLabel: 'keys | number of servers N (we will add one more)',
      gen: function (input) {
        var parts = String(input).split('|');
        var keys = words(parts[0]);
        var n = parts.length > 1 ? Number(String(parts[1]).trim()) : 4;
        if (!keys.length) throw new Error('Enter some keys, then | and a server count, e.g. a b c d | 4');
        if (keys.length > 14) throw new Error('Use at most 14 keys so the table stays readable');
        if (!(n >= 1 && n <= 9) || Math.floor(n) !== n) throw new Error('Server count must be a whole number 1-9');
        var hs = keys.map(function (k) { return h32(k) % 1000; });
        var frames = [], rows = [];
        function serverMap(m, upto, newer) {
          var e = [];
          for (var s = 0; s < m; s++) {
            var ks = [];
            for (var i = 0; i < upto; i++) if ((newer ? hs[i] % m : hs[i] % n) === s) ks.push(keys[i]);
            e.push(['S' + s, ks.join(', ') || '—']);
          }
          return e;
        }
        frames.push({ narr: 'We have <b>' + n + ' servers</b> (S0 … S' + (n - 1) + '). Rule: <code>server = hash(key) % ' + n + '</code>. Our toy hash gives each key a number 0-999.', parts: [
          { type: 'array', label: 'servers', values: Array.apply(null, Array(n)).map(function (_, i) { return 'S' + i; }) },
          { type: 'code', label: 'placement rule', lang: 'python', code: 'h = hash(key)\nserver = h % N', hl: {} }
        ] });
        for (var i = 0; i < keys.length; i++) {
          rows.push([keys[i], hs[i], hs[i] + ' % ' + n + ' = ' + (hs[i] % n), 'S' + (hs[i] % n)]);
          var hl = {}; hl[i] = 'cur';
          var mh = {}; mh['S' + (hs[i] % n)] = 'ok';
          frames.push({ narr: '<b>' + keys[i] + '</b> hashes to ' + hs[i] + '. ' + hs[i] + ' % ' + n + ' = <b>' + (hs[i] % n) + '</b>, so it lives on <b>S' + (hs[i] % n) + '</b>.', parts: [
            { type: 'table', label: 'placement with N = ' + n, columns: ['key', 'hash', 'hash % N', 'server'], rows: rows.map(function (r) { return r.slice(); }), hl: hl },
            { type: 'map', label: 'who stores what', entries: serverMap(n, i + 1, false), hl: mh }
          ] });
        }
        var m = n + 1;
        frames.push({ narr: 'Traffic grows, so we add <b>S' + n + '</b>. Now N = ' + m + ' and the rule becomes <code>hash % ' + m + '</code>. Let us recompute every key…', parts: [
          { type: 'array', label: 'servers', values: Array.apply(null, Array(m)).map(function (_, i) { return 'S' + i; }), hl: (function () { var o = {}; o[n] = 'ok'; return o; })() },
          { type: 'code', label: 'placement rule', lang: 'python', code: 'h = hash(key)\nserver = h % (N + 1)   # N changed!', hl: { 2: 'bad' } }
        ] });
        var rows2 = [], moved = 0, hl2 = {};
        for (var j = 0; j < keys.length; j++) {
          var a = hs[j] % n, b = hs[j] % m, mv = a !== b;
          if (mv) moved++;
          rows2.push([keys[j], hs[j], 'S' + a, 'S' + b, mv ? 'MOVED' : 'stays']);
          hl2[j] = mv ? 'bad' : 'ok';
          var cur = copyObj(hl2); cur[j] = mv ? 'bad' : 'ok';
          frames.push({ narr: '<b>' + keys[j] + '</b>: ' + hs[j] + ' % ' + m + ' = ' + b + '. Before it was on S' + a + '. ' + (mv ? '<span class="c-r">Different server → the data must move (or it is a cache miss).</span>' : '<span class="c-g">Same server by luck → stays put.</span>'), parts: [
            { type: 'table', label: 'old vs new owner', columns: ['key', 'hash', 'old (% ' + n + ')', 'new (% ' + m + ')', 'result'], rows: rows2.map(function (r) { return r.slice(); }), hl: cur },
            { type: 'vars', label: 'running count', vals: { moved: moved, stayed: (j + 1 - moved), checked: j + 1 }, hl: { moved: mv ? 'bad' : '' } }
          ] });
        }
        var pct = Math.round(100 * moved / keys.length);
        var theory = Math.round(100 * n / m);
        frames.push({ narr: '<span class="c-r"><b>' + moved + ' of ' + keys.length + ' keys (' + pct + '%) moved</b></span> just because we added ONE server. Theory says N/(N+1) = ' + n + '/' + m + ' ≈ ' + theory + '%. The new server only deserved 1/' + m + ' ≈ ' + Math.round(100 / m) + '% of keys — everything else was pointless churn.', parts: [
          { type: 'bars', label: 'keys moved vs stayed', values: [moved, keys.length - moved], idxLabels: ['moved', 'stayed'], hl: { 0: 'bad', 1: 'ok' }, texts: [pct + '%', (100 - pct) + '%'] },
          { type: 'table', label: 'what we want instead', columns: ['scheme', 'keys moved when N → N+1'], rows: [['hash % N', '≈ N/(N+1) = ' + theory + '%'], ['consistent hashing', '≈ 1/(N+1) = ' + Math.round(100 / m) + '%']], hl: { 0: 'bad', 1: 'ok' } }
        ] });
        return frames;
      }
    },
    examples: [
      { title: 'Exact math: why only 1/(N+1) of keys stay', html: `<p>Look at hash values in one block of N·(N+1) numbers (the pattern repeats after that). For 3 → 4 servers, the block is 0…11:</p>
        ${H.table(['h', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11'], [
          ['h % 3', '0', '1', '2', '0', '1', '2', '0', '1', '2', '0', '1', '2'],
          ['h % 4', '0', '1', '2', '3', '0', '1', '2', '3', '0', '1', '2', '3'],
          ['same?', H.c('g', '✔'), H.c('g', '✔'), H.c('g', '✔'), H.c('r', '✘'), H.c('r', '✘'), H.c('r', '✘'), H.c('r', '✘'), H.c('r', '✘'), H.c('r', '✘'), H.c('r', '✘'), H.c('r', '✘'), H.c('r', '✘')]
        ])}
        <p>Only h = 0, 1, 2 agree → 3/12 = <b>1/4 stay</b>, <b>3/4 move</b>. In general only the first N values of every block agree, so N/(N(N+1)) = 1/(N+1) stay.</p>` },
      { title: 'A cache cluster loses one node', html: `<p>10 memcached servers, hit rate 95%, database handles 5,000 QPS of misses on a 100,000 QPS site. Server #7 dies → N = 9. With modulo, 9/10 = <b>90% of keys now point somewhere else</b>, so the hit rate drops to roughly 10%. Misses jump from 5,000 to ~90,000 QPS → the database melts.</p><p>With consistent hashing only server #7's keys (10%) miss: misses go from 5,000 to ~14,500 QPS — painful but survivable.</p>` },
      { title: 'Doubling instead of +1 is better, but still not great', html: `<p>Some teams only ever double N (4 → 8). Then a key stays if h % 8 == h % 4, which is true for half of all keys (h % 8 in {0,1,2,3}). So <b>50% move</b> — better than 80%, and every moved key goes from server s to server s+4 (a neat split). This "split every shard in two" trick is used by some systems, but it forces you to buy capacity in huge steps and still moves half the data.</p>` },
      { title: 'Where modulo is still fine', html: `<p>Modulo is okay when N <b>never changes</b> for the life of the data: e.g. a fixed 16384 Redis Cluster hash slots (<code>CRC16(key) % 16384</code>) — the number of <i>slots</i> never changes; only the slot→server table changes. Same with Kafka: <code>partition = hash(key) % numPartitions</code> works only because you rarely change the partition count (and when you do, per-key ordering breaks for a while).</p>` }
    ],
    deepDive: `<p><b>Two layers of mapping.</b> Every scalable partitioning scheme splits the problem in two: <code>key → partition</code> and <code>partition → server</code>. Modulo-on-servers glues them together, so changing servers changes partitions. Good schemes keep the first mapping stable and only move the second. Consistent hashing does this with a ring; "fixed partitions" schemes (Redis Cluster's 16384 slots, Couchbase's 1024 vBuckets, Riak's ring of 64+ partitions, Elasticsearch's fixed primary shard count) do it with a big constant number of buckets plus a small lookup table.</p>
      <p><b>The hash still matters.</b> <code>userId % N</code> without hashing is a trap: sequential IDs, timestamps or even-only IDs create skew (all new users on one shard, or half the shards empty when N is even). Always hash first with a well-mixed function (Murmur3, xxHash, MD5/SHA-1 for stable cross-language behavior). Never use language-specific hashes like Python's <code>hash()</code> (randomized per process) or rely on Java's <code>String.hashCode()</code> across languages.</p>
      <p><b>Cost model.</b> Moving a key costs: network bytes (data size), disk I/O on both sides, CPU for serialization, and — for caches — one extra database read. When estimating, multiply "fraction moved × total data" and divide by the throttled streaming rate (e.g. 50 TB × 0.8 at 200 MB/s ≈ 2.3 days). That number is usually the killer argument in an interview.</p>
      <p><b>Edge case — the remove case is worse than you think.</b> When a server dies and N drops from 10 to 9, modulo moves 9/10 of keys — including keys that lived on perfectly healthy servers. You turn a 10% outage into a 90% cold cache. Consistent hashing confines the blast radius to the failed node's keys.</p>`,
    aiEra: `<p><b>What AI changes:</b> ask an assistant to "shard users across Redis nodes" and you will very often get <code>nodes[hash(key) % len(nodes)]</code>. It compiles, passes a unit test with a fixed node list, and silently breaks the first time autoscaling adds a node. In Python it is even worse when the AI uses the built-in <code>hash()</code> — two app servers disagree on where a key lives.</p>
      <p><b>Use AI as a partner:</b> <code>Write a script that measures what fraction of 100k keys change owner when my sharding function goes from 8 to 9 nodes</code> — a 30-second experiment that proves or kills a design. Ask it to review: "what happens to this sharding code when the node list changes?"</p>
      <p><b>Where AI goes wrong:</b> it may claim "consistent hashing" while using modulo, or forget that a node failure is also a change in N.</p>
      <p><b>What you must still own:</b> spotting that N is not constant, quoting the N/(N+1) number, and choosing between a ring, fixed slots, or a lookup service for your workload.</p>`,
    problems: [{
      title: 'Count the Damage: 4 → 5 Cache Servers',
      level: 'Easy', tags: ['modulo hashing', 'estimation', 'cache'], companies: ['Amazon', 'Meta'],
      statement: `<p>Your photo-thumbnail cache uses <code>server = hash(url) % 4</code> across 4 memcached boxes holding 400 GB total, with a 96% hit rate and 200,000 reads/sec. You add a 5th box. Estimate (a) what fraction of keys change server, (b) the immediate hit rate, (c) the extra QPS the origin storage sees, and (d) what the fraction would be with consistent hashing.</p>`,
      constraints: `<p>Assume a uniform hash, equal-size servers, keys evenly distributed, and a cold new server.</p>`,
      example: `<p>Hash 7: 7 % 4 = ${H.c('y', '3')}, 7 % 5 = ${H.c('r', '2')} → moved. Hash 3: 3 % 4 = 3, 3 % 5 = 3 → ${H.c('g', 'stays')}. Do this for every residue 0..19 and count.</p>`,
      brute: { why: `<p>Naive design: keep modulo and "just add the server at 3 a.m. when traffic is low". It still invalidates 80% of the cache at once; by morning the cache has not refilled and the origin sees a 20× spike. Hoping for low traffic is not a design.</p>` },
      mcq: { q: 'Going from N to N+1 servers with modulo, what fraction of keys keep their server?', options: ['1/(N+1)', 'N/(N+1)', '1/2', '1/N²'], answer: 0, explain: 'Only hash values whose residue is below N in each block of N(N+1) agree: N/(N(N+1)) = 1/(N+1).' },
      hints: [`<p>A key stays only if h % 4 == h % 5. Write out h = 0..19 (one full block of 4·5) and count matches.</p>`, `<p>Moved keys are cache misses: new hit rate ≈ old hit rate × fraction that stayed.</p>`, `<p>Misses per second = reads × (1 − hit rate). Compare before vs after. For consistent hashing, only the new server's fair share (1/5) moves.</p>`],
      solution: {
        approach: `<p><b>(a)</b> In each block of 20 hash values only h = 0, 1, 2, 3 give the same answer for %4 and %5 → 4/20 = <b>20% stay, 80% move</b> (formula N/(N+1) = 4/5).</p>
          <p><b>(b)</b> The moved keys are not on their new server, so they miss. New hit rate ≈ 0.96 × 0.20 ≈ <b>19%</b>.</p>
          <p><b>(c)</b> Before: 200,000 × 4% = 8,000 misses/s. After: 200,000 × 81% ≈ 162,000 misses/s → about <b>20× more origin load</b>, for as long as it takes to refill ~320 GB.</p>
          <p><b>(d)</b> With consistent hashing the new box takes ≈ 1/5 of the key space, all of it from existing boxes: only <b>20%</b> of keys move; hit rate drops to ≈ 0.96 × 0.8 ≈ 77%, misses ≈ 46,000/s, and you can warm the new node gradually (e.g. add it with a low weight and raise it).</p>`,
        complexity: `<p>Modulo: N/(N+1) of keys move per change. Consistent hashing: ≈ 1/(N+1) move — the theoretical minimum.</p>`,
        followUps: ['What if you went from 4 to 8 servers instead?', 'How would you warm the new server before routing traffic to it?']
      }
    }]
  });

  /* =====================================================================
     TOPIC 2 — The hash ring
     ===================================================================== */
  topics.push({
    title: 'The Hash Ring: Walk Clockwise to Your Server',
    analogy: `<p>Picture a <b>round running track</b> with a few water stations placed around it. Every runner starts at a random spot and simply <b>runs clockwise until they reach the first water station</b> — that is "their" station.</p><p>Add a new station somewhere on the track: only the runners who start <i>just before it</i> (between the previous station and the new one) switch to it. Everyone else still reaches the same station as before. Remove a station: its runners just keep running to the next one. Nobody else is affected. That is consistent hashing.</p>`,
    explain: `<p><b>The idea (Karger et al., 1997 — invented for web caching at what became Akamai):</b> hash <i>both</i> servers and keys into the <b>same</b> number space, and bend that space into a circle.</p>
      <ol>
        <li><b>Make a ring.</b> Take the hash output range, e.g. 0 … 2<sup>32</sup>−1 (we use 0…359° in pictures). The value after the largest wraps to 0 — it is a circle.</li>
        <li><b>Place servers.</b> Hash each server's name or IP: <code>pos = hash("cache-A")</code>. That point on the circle is the server's <b>token</b>.</li>
        <li><b>Place keys.</b> Hash each key the same way: <code>pos = hash("user42")</code>.</li>
        <li><b>Find the owner.</b> From the key's position, <b>walk clockwise</b> until you hit a server token. That server owns the key. If you fall off the end, wrap to the first server.</li>
      </ol>
      ${H.table(['server', 'token (°)', 'owns the arc'], [['B', '58', '(316, 360) ∪ [0, 58]  ← wraps around 0'], ['C', '270', '(58, 270]'], ['A', '316', '(270, 316]']])}
      <p>Key at 219° → next clockwise token is C at 270° → ${H.c('b', 'C owns it')}. Key at 17° → B at 58°. Key at 330° → nothing until 360, wrap → B at 58°.</p>
      <p><b>Each server owns the arc that ends at its token</b> (from the previous token, exclusive, up to its own token, inclusive).</p>
      <p><b>Why this fixes the modulo disaster:</b></p>
      <ul>
        <li>${H.c('g', 'Add server D at 142°')}: only keys in the arc (58°, 142°] change owner — from C to D. Keys on A and B are untouched. On average a new server takes 1/(N+1) of the keys — exactly its fair share, and nothing more.</li>
        <li>${H.c('r', 'Remove server C')}: only C's keys move, to the next server clockwise (A). Everything else stays.</li>
      </ul>
      <p><b>How lookups are coded:</b> keep the server tokens in a <b>sorted structure</b> (a sorted array + binary search, or Java's <code>TreeMap.ceilingEntry</code>). Lookup = "smallest token ≥ hash(key), else the first token" → <b>O(log T)</b> for T tokens. Every client can build the same ring from the same server list, so no central lookup is needed on the hot path.</p>
      <p><b>The catch (fixed in the next topic):</b> with only one token per server, arcs are random lengths. In the table above C owns 212° of 360° — nearly 60% of all keys — while A owns only 46°. And when C dies, <i>all</i> its load lands on A alone.</p>`,
    clues: [
      '"distribute keys across N nodes" + "nodes come and go" → hash ring',
      '"only K/N keys should be remapped on average" — this is literally the consistent hashing definition',
      '"partition a key-value store / distributed cache" (Dynamo, Cassandra, memcached clients) → ring',
      '"stateless clients must agree on placement without a coordinator" → everyone builds the same ring from the member list',
      '"sticky routing" — the same user/session/URL should keep hitting the same backend even as the pool changes → consistent hash load balancing'
    ],
    code: [
      { lang: 'java', title: 'ConsistentHashRing.java — TreeMap ring with virtual nodes and replicas', code: `import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.*;

/**
 * A consistent hash ring with virtual nodes and replica lookup.
 *  - Positions ("tokens") live on a ring of 0 .. 2^63 - 1.
 *  - Each physical node is hashed onto the ring \`weight\` times ("node#0", "node#1", ...).
 *  - A key belongs to the first token at or after hash(key), wrapping around to the start.
 */
public class ConsistentHashRing {
    private final TreeMap<Long, String> ring = new TreeMap<>();      // token -> physical node
    private final Map<String, Integer> weights = new HashMap<>();   // node  -> number of vnodes
    private final int defaultVnodes;

    public ConsistentHashRing(int defaultVnodes) {
        this.defaultVnodes = defaultVnodes;
    }

    /** Stable 63-bit hash: first 8 bytes of MD5, sign bit cleared. Same answer on every machine. */
    static long hash(String s) {
        try {
            byte[] d = MessageDigest.getInstance("MD5").digest(s.getBytes(StandardCharsets.UTF_8));
            long h = 0;
            for (int i = 0; i < 8; i++) h = (h << 8) | (d[i] & 0xFF);
            return h >>> 1;
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("MD5 not available", e);
        }
    }

    public void addNode(String node) { addNode(node, defaultVnodes); }

    /** weight = number of virtual nodes; give bigger machines a bigger weight. */
    public void addNode(String node, int weight) {
        if (weights.containsKey(node)) removeNode(node);
        weights.put(node, weight);
        for (int i = 0; i < weight; i++) {
            ring.put(hash(node + "#" + i), node);   // a 63-bit collision is astronomically unlikely
        }
    }

    public void removeNode(String node) {
        Integer w = weights.remove(node);
        if (w == null) return;
        for (int i = 0; i < w; i++) ring.remove(hash(node + "#" + i), node);
    }

    /** Owner of a key: walk clockwise to the first token >= hash(key), wrap if needed. O(log V). */
    public String getNode(String key) {
        if (ring.isEmpty()) throw new IllegalStateException("ring is empty");
        Map.Entry<Long, String> e = ring.ceilingEntry(hash(key));
        return (e != null ? e : ring.firstEntry()).getValue();
    }

    /** Preference list: the first n DISTINCT physical nodes clockwise from the key. */
    public List<String> getReplicas(String key, int n) {
        List<String> out = new ArrayList<>();
        if (ring.isEmpty()) return out;
        n = Math.min(n, weights.size());
        long h = hash(key);
        // One full lap clockwise: tokens >= h, then wrap to tokens < h.
        List<Collection<String>> lap = List.of(ring.tailMap(h, true).values(), ring.headMap(h, false).values());
        for (Collection<String> part : lap) {
            for (String node : part) {
                if (!out.contains(node)) out.add(node);     // skip vnodes of a node we already picked
                if (out.size() == n) return out;
            }
        }
        return out;
    }

    public static void main(String[] args) {
        ConsistentHashRing r = new ConsistentHashRing(150);
        for (String n : List.of("A", "B", "C")) r.addNode(n);

        int keys = 30000;
        Map<String, String> before = new HashMap<>();
        Map<String, Integer> load = new TreeMap<>();
        for (int i = 0; i < keys; i++) {
            String k = "user:" + i, owner = r.getNode(k);
            before.put(k, owner);
            load.merge(owner, 1, Integer::sum);
        }
        System.out.println("load with 3 nodes : " + load);   // roughly 10k each

        r.addNode("D");                                     // scale out by one node
        int moved = 0;
        Map<String, Integer> movedFrom = new TreeMap<>();
        for (int i = 0; i < keys; i++) {
            String k = "user:" + i, now = r.getNode(k);
            if (!now.equals(before.get(k))) {
                moved++;
                movedFrom.merge(before.get(k), 1, Integer::sum);
                if (!now.equals("D")) throw new AssertionError("keys may only move TO the new node");
            }
        }
        // prints about 23-25%, taken from A, B and C roughly equally
        System.out.printf("moved after adding D: %.1f%% (ideal 25%%), taken from %s%n", 100.0 * moved / keys, movedFrom);
        System.out.println("replicas of user:42 = " + r.getReplicas("user:42", 3));
    }
}` },
      { lang: 'python', run: true, title: 'consistent_hash_ring.py — same ring in Python (runnable)', code: `import bisect
import hashlib
from collections import Counter


def stable_hash(s: str) -> int:
    """64-bit hash from MD5: identical on every machine and every run.
    (Python's built-in hash() is randomized per process -- never use it for routing.)"""
    return int.from_bytes(hashlib.md5(s.encode("utf-8")).digest()[:8], "big")


class ConsistentHashRing:
    def __init__(self, vnodes: int = 100):
        self.default_vnodes = vnodes
        self._tokens = []    # sorted list of token positions on the ring
        self._owner = {}     # token -> physical node
        self._weights = {}   # node -> number of virtual nodes

    def add_node(self, node: str, weight: int = None) -> None:
        if node in self._weights:
            self.remove_node(node)
        weight = weight or self.default_vnodes
        self._weights[node] = weight
        for i in range(weight):
            t = stable_hash(f"{node}#{i}")
            if t not in self._owner:            # ignore the (practically impossible) collision
                bisect.insort(self._tokens, t)
                self._owner[t] = node

    def remove_node(self, node: str) -> None:
        for i in range(self._weights.pop(node, 0)):
            t = stable_hash(f"{node}#{i}")
            if self._owner.get(t) == node:
                del self._owner[t]
                self._tokens.pop(bisect.bisect_left(self._tokens, t))

    def get_node(self, key: str) -> str:
        """First token clockwise at or after hash(key); wrap to index 0 past the end."""
        if not self._tokens:
            raise LookupError("ring is empty")
        i = bisect.bisect_left(self._tokens, stable_hash(key))
        return self._owner[self._tokens[i % len(self._tokens)]]

    def get_replicas(self, key: str, n: int) -> list:
        """Preference list: first n DISTINCT physical nodes walking clockwise."""
        out = []
        if not self._tokens:
            return out
        n = min(n, len(self._weights))
        start = bisect.bisect_left(self._tokens, stable_hash(key))
        for step in range(len(self._tokens)):
            node = self._owner[self._tokens[(start + step) % len(self._tokens)]]
            if node not in out:                  # skip other vnodes of an already-chosen node
                out.append(node)
                if len(out) == n:
                    break
        return out


if __name__ == "__main__":
    ring = ConsistentHashRing(vnodes=150)
    for name in ("A", "B", "C"):
        ring.add_node(name)

    keys = [f"user:{i}" for i in range(20000)]
    before = {k: ring.get_node(k) for k in keys}
    print("load with A,B,C :", dict(sorted(Counter(before.values()).items())))

    ring.add_node("D")                         # scale out
    after = {k: ring.get_node(k) for k in keys}
    moved = [k for k in keys if before[k] != after[k]]
    assert all(after[k] == "D" for k in moved), "keys only ever move TO the new node"
    print(f"moved after adding D: {len(moved) / len(keys):.1%} (ideal 25.0%)")
    print("taken from      :", dict(sorted(Counter(before[k] for k in moved).items())))

    ring.remove_node("B")                      # a node dies
    after_b = {k: ring.get_node(k) for k in keys}
    lost = [k for k in keys if after[k] != after_b[k]]
    assert all(after[k] == "B" for k in lost), "only B's keys move when B leaves"
    print(f"moved after B dies: {len(lost) / len(keys):.1%} -> spread to",
          dict(sorted(Counter(after_b[k] for k in lost).items())))
    print("replicas of user:42 (N=3):", ring.get_replicas("user:42", 3))
` }
    ],
    codeTitle: ['Java ring (TreeMap)', 'Python ring (bisect, runnable)'],
    viz: {
      title: 'Hash ring: keys walk clockwise to their owner',
      input: 'A B C | user1 user2 user3 user4 user5 user6 user7 user8 | D',
      inputLabel: 'servers | keys | server to add (names, or name@angle like D@142)',
      gen: function (input) {
        var seg = String(input).split('|');
        var sv = words(seg[0]).map(function (t) { return parsePlaced(t, 'server'); });
        var ks = words(seg[1] || '').map(function (t) { return parsePlaced(t, 'key'); });
        var add = words(seg[2] || '').map(function (t) { return parsePlaced(t, 'server'); })[0];
        if (sv.length < 1 || sv.length > 8) throw new Error('Give 1-8 servers before the first |');
        if (ks.length < 1 || ks.length > 10) throw new Error('Give 1-10 keys after the first |');
        var used = {};
        function uniq(s) { while (used[s.pos]) s.pos = (s.pos + 1) % 360; used[s.pos] = true; return s; }
        sv.forEach(uniq);
        if (add) uniq(add);
        var sortS = function (list) { return list.slice().sort(function (a, b) { return a.pos - b.pos; }); };
        function nodesFor(list, upto, tagKey) {
          var nodes = list.map(function (s) { var p = ringXY(s.pos, 42); return { id: 'S:' + s.name, label: s.name, x: p.x, y: p.y }; });
          for (var i = 0; i < upto; i++) { var q = ringXY(ks[i].pos, 22); nodes.push({ id: 'K:' + i, label: 'k' + (i + 1), x: q.x, y: q.y }); }
          return nodes;
        }
        function ringEdges(list) {
          var s = sortS(list), e = [];
          if (s.length > 1) for (var i = 0; i < s.length; i++) e.push(['S:' + s[i].name, 'S:' + s[(i + 1) % s.length].name]);
          return e;
        }
        function sTags(list) { var t = {}; list.forEach(function (s) { t['S:' + s.name] = '@' + s.pos + '°'; }); return t; }
        var frames = [], sorted = sortS(sv);
        frames.push({ narr: 'Hash every <b>server</b> onto a ring of 0-359° (0° is 12 o\'clock, angles grow clockwise). Arrows show the clockwise direction. Order on the ring: ' + sorted.map(function (s) { return s.name + ' @' + s.pos + '°'; }).join(' → ') + '.', parts: [
          { type: 'graph', label: 'the ring (servers only)', directed: true, height: 100, nodes: nodesFor(sv, 0), edges: ringEdges(sv), tags: sTags(sv) }
        ] });
        var owners = [], edges = ringEdges(sv);
        for (var i = 0; i < ks.length; i++) {
          var o = ownerOf(sorted, ks[i].pos), wrap = ks[i].pos > sorted[sorted.length - 1].pos;
          owners.push(o.name);
          var tags = sTags(sv); tags['K:' + i] = ks[i].name + ' @' + ks[i].pos + '°';
          var hl1 = {}; hl1['K:' + i] = 'cur';
          frames.push({ narr: 'Key <b>' + ks[i].name + '</b> (k' + (i + 1) + ') hashes to <b>' + ks[i].pos + '°</b>. Now walk clockwise from there…', parts: [
            { type: 'graph', directed: true, height: 100, nodes: nodesFor(sv, i + 1), edges: edges.slice(), hl: hl1, tags: tags }
          ] });
          edges.push(['K:' + i, 'S:' + o.name]);
          var hl2 = {}; hl2['K:' + i] = 'cur'; hl2['S:' + o.name] = 'sel';
          var eh = {}; eh['K:' + i + '-S:' + o.name] = 'ok';
          frames.push({ narr: (wrap ? 'No server after ' + ks[i].pos + '° before 360°, so we <b>wrap around</b> past 0° and ' : 'The ') + 'first server clockwise is <b>' + o.name + ' @' + o.pos + '°</b> → ' + o.name + ' owns ' + ks[i].name + '.', parts: [
            { type: 'graph', directed: true, height: 100, nodes: nodesFor(sv, i + 1), edges: edges.slice(), hl: hl2, ehl: eh, tags: tags }
          ] });
        }
        function ownMap(list, own) {
          return sortS(list).map(function (s) { var a = []; own.forEach(function (n, j) { if (n === s.name) a.push(ks[j].name); }); return [s.name + ' @' + s.pos + '°', a.join(', ') || '—']; });
        }
        frames.push({ narr: 'Final placement. Notice the arcs are <b>uneven</b> — a server whose predecessor is far away owns a big arc (and many keys).', parts: [
          { type: 'graph', directed: true, height: 100, nodes: nodesFor(sv, ks.length), edges: edges.slice(), tags: sTags(sv) },
          { type: 'map', label: 'owner → keys', entries: ownMap(sv, owners) }
        ] });
        if (!add) return frames;
        var sv2 = sv.concat([add]), sorted2 = sortS(sv2);
        var idx = sorted2.indexOf(add), pred = sorted2[(idx - 1 + sorted2.length) % sorted2.length], succ = sorted2[(idx + 1) % sorted2.length];
        var hlA = {}; hlA['S:' + add.name] = 'ok'; hlA['S:' + succ.name] = 'cur';
        frames.push({ narr: 'Scale out: add server <b>' + add.name + '</b>, which hashes to <b>' + add.pos + '°</b>. It lands between ' + pred.name + ' @' + pred.pos + '° and ' + succ.name + ' @' + succ.pos + '°. Only keys in the arc (' + pred.pos + '°, ' + add.pos + '°] can be affected — and they can only come from <b>' + succ.name + '</b>.', parts: [
          { type: 'graph', directed: true, height: 100, nodes: nodesFor(sv2, 0), edges: ringEdges(sv2), hl: hlA, tags: sTags(sv2) }
        ] });
        var owners2 = [], edges2 = ringEdges(sv2), hl3 = {}, eh3 = {}, rows = [], rh = {}, moved = 0;
        hl3['S:' + add.name] = 'ok';
        for (var j = 0; j < ks.length; j++) {
          var o2 = ownerOf(sorted2, ks[j].pos).name, mv = o2 !== owners[j];
          owners2.push(o2);
          edges2.push(['K:' + j, 'S:' + o2]);
          hl3['K:' + j] = mv ? 'bad' : 'done';
          eh3['K:' + j + '-S:' + o2] = mv ? 'bad' : '';
          rows.push([ks[j].name, ks[j].pos + '°', owners[j], o2, mv ? 'MOVED' : 'stays']);
          rh[j] = mv ? 'bad' : 'ok';
          if (mv) moved++;
        }
        frames.push({ narr: '<span class="c-r"><b>' + moved + '</b> of ' + ks.length + ' keys move</span> (all from ' + succ.name + ' to ' + add.name + '); <span class="c-g">' + (ks.length - moved) + ' stay exactly where they were</span>. With modulo, about ' + Math.round(100 * sv.length / (sv.length + 1)) + '% would have moved.', parts: [
          { type: 'graph', directed: true, height: 100, nodes: nodesFor(sv2, ks.length), edges: edges2, hl: hl3, ehl: eh3, tags: sTags(sv2) },
          { type: 'table', label: 'before vs after adding ' + add.name, columns: ['key', 'pos', 'old owner', 'new owner', 'result'], rows: rows, hl: rh }
        ] });
        frames.push({ narr: 'Summary: a join only steals one arc from one neighbour; a leave hands one arc to one neighbour. That is <b>minimal disruption</b>. (Next topic: virtual nodes fix the uneven arcs and the "one neighbour takes everything" problem.)', parts: [
          { type: 'map', label: 'owner → keys after the join', entries: ownMap(sv2, owners2), hl: (function () { var o = {}; o[add.name + ' @' + add.pos + '°'] = 'ok'; return o; })() },
          { type: 'vars', label: 'movement', vals: { keys: ks.length, moved: moved, 'ideal ≈ 1/(N+1)': Math.round(ks.length / (sv.length + 1) * 10) / 10 }, hl: { moved: 'bad' } }
        ] });
        return frames;
      }
    },
    examples: [
      { title: 'Lookup with wraparound', html: `<p>Tokens (sorted): ${H.arr([58, 142, 270, 316], { label: 'tokens', idx: false })} owners B, D, C, A.</p>
        ${H.table(['key pos', 'binary search: first token ≥ pos', 'owner'], [['17', '58', 'B'], ['142', '142 (equal counts!)', 'D'], ['300', '316', 'A'], ['330', 'none → wrap to index 0 → 58', H.c('y', 'B')]])}
        <p>The wrap case is the #1 bug in hand-written rings: always fall back to the first token.</p>` },
      { title: 'Server leaves: who inherits?', html: `<p>Ring B@58, D@142, C@270, A@316. C crashes. C owned (142°, 270°]. Walking clockwise from any key in that arc now skips C and reaches <b>A@316</b>. So A inherits <b>all</b> of C's keys (an extra ~35% of the ring on top of its own 13%). Keys on B and D are untouched. With virtual nodes, C's many small arcs would be spread across all survivors instead.</p>` },
      { title: 'How much movement on average?', html: `<p>With N servers placed randomly, a new server lands in a random arc and takes on average <b>1/(N+1)</b> of the ring. 9 servers → add 1 → ≈ 10% of keys move (vs 90% with modulo). The <i>variance</i> is high with one token per server, which is why we add virtual nodes.</p>` }
    ],
    deepDive: `<p><b>Formal property.</b> Karger et al. defined <i>monotonicity</i>: when buckets are added, keys only move from old buckets to new ones, never between old buckets. Both the ring and rendezvous hashing satisfy it; modulo does not.</p>
      <p><b>Data structure choices.</b> Sorted array + binary search is cache-friendly and fastest for read-mostly rings (rebuild and atomically swap on membership change — copy-on-write). <code>TreeMap</code>/<code>ConcurrentSkipListMap</code> suit frequent updates. Lookup O(log T) with T = N·v tokens: 1,000 nodes × 256 vnodes = 256k tokens → ~18 comparisons, well under a microsecond. Envoy's <code>ring_hash</code> load balancer builds a ring of at least 1,024 entries by default and does binary search over it.</p>
      <p><b>Hash choice.</b> Need good dispersion, not cryptographic strength: Murmur3 (Cassandra's default <code>Murmur3Partitioner</code>, token range −2<sup>63</sup> … 2<sup>63</sup>−1), xxHash, or MD5 (ketama/memcached clients, older Cassandra <code>RandomPartitioner</code>). All clients must use the <b>exact same</b> hash and token naming ("A#0", "A-0"…) or they disagree on ownership — a classic cross-language bug.</p>
      <p><b>Membership is the hard part.</b> The ring math is trivial; agreeing on <i>who is in the ring</i> is not. Systems use gossip (Dynamo, Cassandra), a coordination service (ZooKeeper/etcd), or a config push. During propagation two clients may briefly see different rings — designs tolerate that with replication, read repair, or "not my key" redirects (like Redis Cluster's <code>MOVED</code>).</p>
      <p><b>What consistent hashing does NOT solve:</b> hot keys (one celebrity key still lands on one server), range scans (hashing destroys key order — use range partitioning if you need <code>BETWEEN</code> queries), and heterogeneous hardware (fix with weights).</p>`,
    aiEra: `<p><b>What AI changes:</b> a ring implementation is a 40-line exercise an assistant writes instantly. The interview value moved from "can you code it" to "can you <b>reason about it</b>": movement fractions, membership agreement, failure behaviour, hot keys.</p>
      <p><b>Use AI as a partner:</b> generate a property-based test — <code>for random joins/leaves, assert keys only move to the new node or away from the removed node</code>. That single invariant catches wraparound bugs, collision bugs and wrong comparisons (<code>&gt;</code> vs <code>≥</code>).</p>
      <p><b>Where AI goes wrong:</b> forgetting the wrap to the first token, using <code>higherKey</code> instead of <code>ceilingKey</code> (keys exactly on a token go to the wrong server), using a per-process random hash, or building the ring from an unsorted list.</p>
      <p><b>AI-era use:</b> LLM inference routers hash a request's <b>prompt prefix</b> (system prompt + conversation so far) to pick a GPU replica, so repeated prefixes hit a warm KV cache — consistent hashing keeps most routes stable when the replica pool autoscales. <b>You must still own</b> the trade-off between cache affinity and even load.</p>`,
    problems: [{
      title: 'Which Keys Move When Node D Joins?',
      level: 'Medium', tags: ['hash ring', 'key movement'], companies: ['Amazon', 'Uber', 'LinkedIn'],
      statement: `<p>A ring of 0–359 has servers <b>A@40</b>, <b>B@130</b>, <b>C@250</b>. Keys: k1@10, k2@45, k3@100, k4@131, k5@200, k6@260, k7@300, k8@355. (1) Give each key's owner. (2) Server <b>D@180</b> joins — which keys move, from whom, to whom? (3) Then <b>A</b> crashes — which keys move and where?</p>`,
      constraints: `<p>Owner = first server clockwise at position ≥ key position; wrap past 359 to the smallest token.</p>`,
      example: `<p>k1@10 → first token ≥ 10 is A@40 → ${H.c('b', 'A')}. k8@355 → no token ≥ 355 → ${H.c('y', 'wrap')} → A@40.</p>`,
      brute: { why: `<p>Naive approach: recompute <code>hash % N</code> for all keys and diff — for this example, it would wrongly suggest most keys move. Or recompute every key on the ring and compare: correct, but you are scanning all data when only one arc can possibly change. Reason by arcs instead.</p>` },
      mcq: { q: 'When D@180 joins between B@130 and C@250, which arc changes owner?', options: ['(130, 180] moves from C to D', '(180, 250] moves from C to D', '(130, 180] moves from B to D', 'Every arc shifts a little'], answer: 0, explain: 'The new node takes the arc ending at its own token, starting after its predecessor — and that arc used to belong to its successor C.' },
      hints: [`<p>Write the arcs: A owns (250, 360) ∪ [0, 40], B owns (40, 130], C owns (130, 250].</p>`, `<p>A join at 180 splits C's arc into (130, 180] → D and (180, 250] → still C.</p>`, `<p>When A leaves, its whole arc goes to the next server clockwise after A — which is B@130.</p>`],
      solution: {
        approach: `<p><b>(1) Initial owners.</b> Arcs: A = (250, 359] ∪ [0, 40], B = (40, 130], C = (130, 250].</p>
          ${H.table(['key', 'pos', 'owner'], [['k1', '10', 'A'], ['k2', '45', 'B'], ['k3', '100', 'B'], ['k4', '131', 'C'], ['k5', '200', 'C'], ['k6', '260', 'A'], ['k7', '300', 'A'], ['k8', '355', 'A (wrap)']])}
          <p><b>(2) D@180 joins.</b> D takes (130, 180] from its successor C. Only <b>k4@131</b> is in that arc → <b>k4 moves C → D</b>. k5@200 is in (180, 250] → stays on C. 1 of 8 keys moves; no key moves between A, B, C.</p>
          <p><b>(3) A crashes.</b> A's arc (250, 359] ∪ [0, 40] goes to the next token clockwise after 40, which is <b>B@130</b>. Keys <b>k1, k6, k7, k8 move A → B</b>. B now holds 6 of 8 keys — a perfect illustration of why one token per node causes hot spots after failures (fix: virtual nodes).</p>`,
        complexity: `<p>Finding affected keys: O(log T) to locate the arc + O(keys in arc) to stream them — never a full scan when data is stored sorted by token (as Cassandra does).</p>`,
        followUps: ['How would virtual nodes change the answer to (3)?', 'If data is replicated N=2, which nodes must stream data in step (2)?']
      }
    }]
  });

  /* =====================================================================
     TOPIC 3 — Virtual nodes
     ===================================================================== */
  topics.push({
    title: 'Virtual Nodes: Evening Out the Load',
    analogy: `<p>Four friends split a big round pizza by each making <b>one random cut</b>. Someone ends up with half the pizza, someone with a sliver. Now let each friend make <b>100 tiny random cuts</b> and take every slice that ends at one of their cuts. Lots of small random pieces <b>average out</b> — everyone ends up with almost exactly a quarter.</p><p>And if one friend leaves, their 100 small slices are scattered all around the pizza, so <b>every</b> remaining friend gets a little extra — instead of one unlucky neighbour getting a whole half.</p>`,
    explain: `<p><b>Problem 1 — uneven arcs.</b> With one token per server, arc sizes are random. With N servers, the biggest arc is typically about <b>ln N</b> times the average — with 100 servers, the unluckiest owns ≈ 4–5× its fair share. You pay for 100 servers but the hottest one decides when you are "full".</p>
      <p><b>Problem 2 — failures dump on one neighbour.</b> When a server dies, its entire arc goes to the single next server clockwise, which may double its load and fall over too → <b>cascading failure</b>.</p>
      <p><b>Problem 3 — joins pull from one neighbour.</b> A new server only takes data from one existing server, so bootstrapping is slow (one source streams all of it).</p>
      <p><b>The fix — virtual nodes (vnodes):</b> put each physical server on the ring <b>many times</b> by hashing <code>"A#0"</code>, <code>"A#1"</code>, … <code>"A#v−1"</code>. The ring now has N·v tokens; every token still maps to its physical server.</p>
      ${H.table(['vnodes per server (v)', 'share of A, B, C, D (ideal 25% each)', 'worst / ideal'], [
        ['1', '25.1%, 15.2%, ' + H.c('r', '54.6%') + ', 5.1%', H.c('r', '2.18×')],
        ['10', '24.6%, 27.2%, 19.6%, 28.6%', H.c('y', '1.14×')],
        ['200', '25.1%, 25.0%, 23.6%, 26.4%', H.c('g', '1.06×')]
      ])}
      <p><b>Rule of thumb:</b> the spread (standard deviation) of each server's share shrinks like <b>1/√v</b>. So v = 100 gives roughly ±10% around the fair share; v = 256 about ±6%. Going from 100 to 400 vnodes only halves the spread — diminishing returns.</p>
      <p><b>Bonus powers of vnodes:</b></p>
      <ul>
        <li><b>Failure spreading:</b> a dead server's many small arcs go to many different successors → every survivor takes a small, equal bit of extra load.</li>
        <li><b>Parallel bootstrap:</b> a new server's vnodes land all over the ring, so it pulls data from <i>all</i> existing servers at once.</li>
        <li><b>Weights for different hardware:</b> a machine with 2× RAM/disk gets 2× vnodes → 2× the keys. A machine being warmed up can start with few vnodes and grow.</li>
      </ul>
      <p><b>The cost:</b> a bigger ring (N·v entries — memory and gossip size), slightly slower lookups (log of a bigger number), and — for replicated stores — more, smaller ranges to repair and stream, plus replica sets that touch more distinct node combinations (which affects availability when several nodes fail at once; see deep dive).</p>`,
    clues: [
      '"servers have different capacity" / "heterogeneous hardware" → weights via vnode count',
      '"one node is much hotter than the others even though keys are uniform" → too few tokens per node',
      '"when a node fails its neighbour gets overloaded" → vnodes spread the failed node\'s load',
      '"how many virtual nodes should we use?" → reason with 1/√v and the memory/repair cost',
      '"speed up adding a node / bootstrapping" → vnodes let the new node stream from everyone in parallel'
    ],
    code: [{
      lang: 'python', run: true, title: 'Measure load spread vs vnode count (runnable)',
      code: `import bisect
import hashlib
import statistics

def h(s):
    return int.from_bytes(hashlib.md5(s.encode()).digest()[:8], "big")

RING = 2 ** 64
servers = [f"node{i}" for i in range(10)]

def shares(vnodes, weights=None):
    """Exact fraction of the ring each server owns (sum of its arcs)."""
    weights = weights or {}
    tokens = sorted((h(f"{s}#{i}"), s) for s in servers for i in range(vnodes * weights.get(s, 1)))
    own = dict.fromkeys(servers, 0)
    for i, (t, s) in enumerate(tokens):
        prev = tokens[i - 1][0] if i else tokens[-1][0] - RING   # first arc wraps around
        own[s] += t - prev
    return {s: own[s] / RING for s in servers}

print("vnodes | max/ideal | min/ideal | stdev as % of ideal")
for v in (1, 4, 16, 64, 256, 1024):
    sh = list(shares(v).values())
    ideal = 1 / len(servers)
    print(f"{v:>6} | {max(sh) / ideal:9.2f} | {min(sh) / ideal:9.2f} | {statistics.pstdev(sh) / ideal:8.1%}")

# Weighted: node0 is a machine twice as big -> give it twice the vnodes
w = shares(256, weights={"node0": 2})
print("\\nweighted, node0 has 2x vnodes -> node0 share %.1f%% vs others ~%.1f%%"
      % (100 * w["node0"], 100 * statistics.mean(w[s] for s in servers[1:])))
`
    }],
    codeTitle: ['Vnode count experiment'],
    viz: {
      title: 'Virtual nodes balance the load',
      input: 'A B C D | 1 3 10 50 200 | C',
      inputLabel: 'servers | vnode counts to try | server that fails',
      gen: function (input) {
        var seg = String(input).split('|');
        var sv = words(seg[0]);
        var vs = words(seg[1] || '1 10 100').map(Number);
        var dead = words(seg[2] || '')[0];
        if (sv.length < 2 || sv.length > 8) throw new Error('Give 2-8 server names before the first |');
        if (!vs.length || vs.some(function (x) { return !(x >= 1 && x <= 1000) || Math.floor(x) !== x; })) throw new Error('vnode counts must be whole numbers 1-1000');
        if (vs.length > 8) throw new Error('Try at most 8 vnode counts');
        if (dead && sv.indexOf(dead) < 0) throw new Error('The failing server must be one of the servers listed');
        var RING = 4294967296;
        function tokens(list, v) {
          var pts = [];
          list.forEach(function (s) { for (var i = 0; i < v; i++) pts.push({ p: h32(s + '#' + i), s: s }); });
          pts.sort(function (a, b) { return a.p - b.p; });
          return pts;
        }
        function share(list, v) {
          var pts = tokens(list, v), o = {};
          list.forEach(function (s) { o[s] = 0; });
          for (var i = 0; i < pts.length; i++) {
            var prev = i ? pts[i - 1].p : pts[pts.length - 1].p - RING;
            o[pts[i].s] += pts[i].p - prev;
          }
          return list.map(function (s) { return Math.round(1000 * o[s] / RING) / 10; });
        }
        function hlMax(vals) {
          var mx = 0, mn = 0, hl = {};
          vals.forEach(function (x, i) { if (x > vals[mx]) mx = i; if (x < vals[mn]) mn = i; });
          hl[mx] = 'bad'; hl[mn] = 'win';
          return hl;
        }
        var frames = [], ideal = Math.round(1000 / sv.length) / 10;
        // small ring pictures: 1 token per server, then 3 tokens per server
        [1, 3].forEach(function (v) {
          var pts = tokens(sv, v).map(function (t) { return { name: t.s, deg: t.p % 360, s: t.s }; });
          var cnt = {};
          pts.forEach(function (t) { cnt[t.s] = (cnt[t.s] || 0) + 1; t.id = t.s + (v > 1 ? cnt[t.s] : ''); });
          pts.sort(function (a, b) { return a.deg - b.deg; });
          var nodes = [], lastDeg = -999, lastR = 32, hl = {}, tags = {};
          var cls = ['ok', 'cur', 'sel', 'win', 'bad', 'done', 'ok', 'cur'];
          pts.forEach(function (t) {
            var r = (t.deg - lastDeg < 13) ? (lastR === 42 ? 30 : 42) : 42;
            var q = ringXY(t.deg, r);
            nodes.push({ id: t.id, label: t.id, x: q.x, y: q.y });
            hl[t.id] = cls[sv.indexOf(t.s) % cls.length];
            tags[t.id] = t.deg + '°';
            lastDeg = t.deg; lastR = r;
          });
          var edges = [];
          if (nodes.length > 1) for (var i = 0; i < nodes.length; i++) edges.push([nodes[i].id, nodes[(i + 1) % nodes.length].id]);
          var sh = share(sv, v);
          frames.push({ narr: v === 1 ? 'With <b>1 token per server</b>, each server owns one arc of random length. Colours = physical servers. Some arcs are huge, some tiny — the shares are ' + sv.map(function (s, i) { return s + ' ' + sh[i] + '%'; }).join(', ') + '.' : 'Now hash each server <b>3 times</b> (A#0, A#1, A#2 → A1, A2, A3). Each server owns several smaller arcs scattered around the ring, so the totals start to even out: ' + sv.map(function (s, i) { return s + ' ' + sh[i] + '%'; }).join(', ') + '.', parts: [
            { type: 'graph', label: 'ring with ' + v + ' token(s) per server', directed: true, height: 100, nodes: nodes, edges: edges, hl: hl, tags: tags }
          ] });
        });
        // bars for each vnode count
        vs.forEach(function (v) {
          var sh = share(sv, v), mx = Math.max.apply(null, sh), mn = Math.min.apply(null, sh);
          var mean = 100 / sv.length, varr = 0;
          sh.forEach(function (x) { varr += (x - mean) * (x - mean); });
          var sd = Math.sqrt(varr / sh.length);
          frames.push({ narr: '<b>v = ' + v + '</b> vnodes per server (' + (v * sv.length) + ' tokens on the ring). Most loaded server owns <span class="c-r">' + mx + '%</span>, least loaded <span class="c-b">' + mn + '%</span> (fair share ' + ideal + '%). Worst/fair = <b>' + (mx / mean).toFixed(2) + '×</b>. ' + (v === 1 ? 'Random single arcs are very uneven.' : (mx / mean < 1.1 ? 'Nicely balanced — many small random arcs average out.' : 'Better, but still lumpy — more vnodes needed.')), parts: [
            { type: 'bars', label: '% of the ring owned (v = ' + v + ')', values: sh, idxLabels: sv, hl: hlMax(sh), texts: sh.map(function (x) { return x + '%'; }) },
            { type: 'vars', label: 'balance stats', vals: { 'vnodes/server': v, 'max ÷ fair': (mx / mean).toFixed(2), 'stdev % of fair': Math.round(100 * sd / mean) + '%', 'theory ≈ 1/√v': Math.round(100 / Math.sqrt(v)) + '%' }, hl: { 'max ÷ fair': mx / mean > 1.25 ? 'bad' : 'ok' } }
          ] });
        });
        if (dead) {
          var alive = sv.filter(function (s) { return s !== dead; });
          [Math.min.apply(null, vs), Math.max.apply(null, vs)].forEach(function (v) {
            var pts = tokens(sv, v), gain = {};
            alive.forEach(function (s) { gain[s] = 0; });
            // each dead token's arc goes to the next alive token clockwise
            for (var i = 0; i < pts.length; i++) {
              if (pts[i].s !== dead) continue;
              var prev = i ? pts[i - 1].p : pts[pts.length - 1].p - RING, arc = pts[i].p - prev;
              var j = (i + 1) % pts.length;
              while (pts[j].s === dead) j = (j + 1) % pts.length;
              gain[pts[j].s] += arc;
            }
            var g = alive.map(function (s) { return Math.round(1000 * gain[s] / RING) / 10; });
            var receivers = g.filter(function (x) { return x > 0; }).length;
            frames.push({ narr: '<b>' + dead + ' fails</b> with v = ' + v + '. Its arcs pass to the next surviving token clockwise. ' + (receivers <= 1 ? '<span class="c-r">One neighbour takes ALL of it</span> — a recipe for a cascading failure.' : receivers + ' of ' + alive.length + ' survivors share the extra load' + (v >= 50 ? ' <span class="c-g">almost evenly</span>.' : ', but unevenly.')), parts: [
              { type: 'bars', label: 'extra % of ring each survivor inherits from ' + dead + ' (v = ' + v + ')', values: g, idxLabels: alive, hl: hlMax(g), texts: g.map(function (x) { return '+' + x + '%'; }) }
            ] });
          });
        }
        var w = sv.map(function (s, i) { return i === 0 ? 2 : 1; }), pts2 = [];
        sv.forEach(function (s, i) { for (var k = 0; k < 100 * w[i]; k++) pts2.push({ p: h32(s + '#' + k), s: s }); });
        pts2.sort(function (a, b) { return a.p - b.p; });
        var o2 = {}; sv.forEach(function (s) { o2[s] = 0; });
        for (var t = 0; t < pts2.length; t++) { var pv = t ? pts2[t - 1].p : pts2[pts2.length - 1].p - RING; o2[pts2[t].s] += pts2[t].p - pv; }
        var ws = sv.map(function (s) { return Math.round(1000 * o2[s] / RING) / 10; });
        var hlw = {}; hlw[0] = 'sel';
        frames.push({ narr: '<b>Weights:</b> ' + sv[0] + ' is a machine twice as big, so it gets 200 vnodes while the others get 100. Its share is now about twice the others (' + ws[0] + '% vs ≈ ' + (Math.round(10 * (100 - ws[0]) / (sv.length - 1)) / 10) + '%). Same trick slowly ramps up a new, cold server.', parts: [
          { type: 'bars', label: '% of ring with weights (' + sv[0] + ' = 2×)', values: ws, idxLabels: sv, hl: hlw, texts: ws.map(function (x) { return x + '%'; }) }
        ] });
        return frames;
      }
    },
    examples: [
      { title: 'Choosing v for a 20-node cache', html: `<p>Goal: no node above ~110% of fair share. Spread ≈ 1/√v, and the worst of 20 nodes sits ~2 standard deviations high. Need 2/√v ≤ 0.10 → √v ≥ 20 → <b>v ≈ 400</b>. Ring size 20 × 400 = 8,000 tokens ≈ a few hundred KB — trivial for a client library. (Ketama-style memcached clients use 100–200 points per server for exactly this reason.)</p>` },
      { title: 'Heterogeneous fleet', html: `<p>Three nodes with 64 GB RAM and one with 128 GB. Use 128 vnodes per 64 GB → 128, 128, 128, 256. Total 640 tokens; the big node owns ≈ 256/640 = <b>40%</b>, each small one ≈ 20%. Memory utilisation is now even (each node ≈ the same % full).</p>` },
      { title: 'Cassandra token count (num_tokens)', html: `<p>Cassandra used <code>num_tokens: 256</code> by default for years. Cassandra 4.0 changed the default to <b>16</b>, together with <code>allocate_tokens_for_local_replication_factor: 3</code> — a smarter algorithm that <i>chooses</i> token positions to balance load instead of picking them at random. Fewer tokens = faster repairs and streaming, and fewer distinct replica sets (better availability when two nodes are down at once), while the allocator keeps balance good.</p>` },
      { title: 'Gradual warm-up of a new cache node', html: `<p>Adding a cold cache node with full weight causes an instant miss spike on its 1/(N+1) share. Instead add it with 10 vnodes, then 50, then 150 over 30 minutes. Each step moves a small slice of keys, letting the cache fill gradually and keeping the database's miss traffic smooth.</p>` }
    ],
    deepDive: `<p><b>The math.</b> With one random token per server, arc lengths behave like spacings of N uniform points: roughly exponential, so the largest is ~(ln N)/N of the ring — an O(log N) imbalance factor. With v tokens per server, each server's share is a sum of v such spacings; by the law of large numbers the relative standard deviation is ≈ 1/√v (more precisely about √(1/v) for large N). That is why 100–256 vnodes became the classic default.</p>
      <p><b>Random vs planned tokens.</b> The Dynamo paper (2007) compared strategies: (1) random tokens per node — partitions change whenever nodes join, making bulk transfer and Merkle-tree maintenance painful; (2) random tokens plus equal-sized partitions; (3) <b>split the ring into Q equal fixed partitions</b> and assign Q/S partitions per node — best balance and simplest bookkeeping. Many modern systems landed on the "many fixed partitions" idea: Riak (ring size 64–1024 partitions), Couchbase (1024 vBuckets), Redis Cluster (16384 slots), and ScyllaDB's newer <b>tablets</b> (tablets that can be split/merged and moved individually). Cassandra 4.0's token allocator keeps vnodes but places them deliberately.</p>
      <p><b>The availability trade-off.</b> With many random vnodes and replication factor 3, almost every combination of 3 nodes shares <i>some</i> range. So if any 2 nodes are down, some ranges have lost a quorum. Fewer tokens (or copysets-style placement) reduce the number of distinct replica sets, lowering the chance that a multi-node failure hits a quorum. More vnodes = better balance but larger "blast surface".</p>
      <p><b>Operational cost.</b> Each vnode range is a unit for repair (Merkle trees), streaming, and metadata in gossip. 1,000 nodes × 256 tokens = 256k ranges to track — this is why huge clusters reduce the token count.</p>`,
    aiEra: `<p><b>What AI changes:</b> an assistant will happily say "use 150 virtual nodes" (the ketama default it has seen a thousand times). The skill now is <b>justifying</b> the number for <i>your</i> cluster: target imbalance, ring memory, repair cost, and multi-failure availability.</p>
      <p><b>Use AI as a partner:</b> ask it to write the simulation above for your real node count and hardware weights, then sweep v. Ten seconds of simulation beats a confident guess.</p>
      <p><b>Where AI goes wrong:</b> naming vnodes inconsistently between services ("A-1" in Go, "A#1" in Python → two different rings), forgetting to remove all v tokens on node removal, or claiming vnodes fix hot <i>keys</i> (they only fix uneven <i>ranges</i>).</p>
      <p><b>AI infra angle:</b> GPU inference pools are heterogeneous (H100s next to older cards). Weighted consistent hashing — vnodes proportional to throughput — lets a prompt-prefix router send more sessions to faster GPUs while keeping KV-cache affinity. <b>You still own</b> picking weights from real benchmarks, not spec sheets.</p>`,
    problems: [{
      title: 'Pick a Virtual Node Count',
      level: 'Medium', tags: ['virtual nodes', 'capacity planning'], companies: ['Google', 'Netflix', 'Datadog'],
      statement: `<p>You are building a client-side sharding library for a 50-node cache fleet: 40 nodes have 64 GB RAM, 10 newer nodes have 128 GB. Requirements: (a) no node should hold more than ~115% of its fair share, (b) when a node dies its load must spread across many nodes, (c) the ring must fit easily in every app server's memory and rebuild in under 10 ms. Choose vnode counts and justify them.</p>`,
      constraints: `<p>Use spread ≈ 1/√v; assume the worst of 50 nodes is ~2.5 standard deviations above fair share; a ring entry costs ~50 bytes.</p>`,
      example: `<p>v = 16 → spread ≈ 25% → worst ≈ 1 + 2.5 × 0.25 = ${H.c('r', '1.62×')} fair share. v = 400 → spread 5% → worst ≈ ${H.c('g', '1.125×')}.</p>`,
      brute: { why: `<p>Naive design: one token per node, or the same vnode count for every node. One token: the worst node holds ~4× its share (ln 50 ≈ 3.9) and failures dump on one neighbour. Equal counts on unequal hardware: the 64 GB nodes fill up while the 128 GB nodes sit half-empty.</p>` },
      mcq: { q: 'To halve the load spread between nodes, by how much must you multiply the vnode count?', options: ['4×', '2×', '√2×', '16×'], answer: 0, explain: 'Spread ∝ 1/√v, so halving it needs √v to double → v × 4.' },
      hints: [`<p>Solve 2.5/√v ≤ 0.15 for the 64 GB nodes.</p>`, `<p>Weights: vnodes proportional to RAM — the 128 GB nodes get twice as many.</p>`, `<p>Ring size = Σ vnodes; multiply by bytes per entry; sorting a few tens of thousands of entries takes well under 10 ms.</p>`],
      solution: {
        approach: `<p><b>Balance.</b> Need 2.5/√v ≤ 0.15 → √v ≥ 16.7 → v ≥ 278. Round to <b>v = 300 for each 64 GB node</b> and <b>600 for each 128 GB node</b> (weights proportional to RAM, so every node ends up at roughly the same % utilisation).</p>
          <p><b>Ring size.</b> 40 × 300 + 10 × 600 = 18,000 tokens × ~50 bytes ≈ <b>0.9 MB</b> per app server — fine. Building = hash 18k strings + sort ≈ 2–5 ms; lookups are binary search over 18k entries (~15 comparisons).</p>
          <p><b>Failure spread.</b> A failed 64 GB node's 300 arcs land on ~300 successor tokens, which belong to nearly all 49 survivors → each gains ≈ 2% extra instead of one node doubling.</p>
          <p><b>Ops details.</b> Name tokens deterministically (<code>node-id#i</code>, using a stable node ID not an IP that can change); distribute the member list via config service; rebuild the ring copy-on-write and swap atomically; ramp new nodes from 10% to 100% weight over time to avoid a miss spike. Verify with a simulation of the real fleet before rollout.</p>`,
        complexity: `<p>Memory O(Σv); build O(Σv log Σv); lookup O(log Σv).</p>`,
        followUps: ['How would you avoid the ring changing when a node only restarts (no real membership change)?', 'What if you switched to bounded-load consistent hashing?']
      }
    }]
  });

  /* =====================================================================
     TOPIC 4 — Replication on the ring
     ===================================================================== */
  topics.push({
    title: 'Replication on the Ring: Preference Lists, Racks & Hinted Handoff',
    analogy: `<p>You keep copies of your house key with <b>three different friends</b>. The rule: "walk clockwise around the neighbourhood from your house and give a copy to the first three <b>different</b> friends you meet." If you pass the same friend's second house, you skip it — two copies at the same person is pointless.</p><p>Smarter still: make sure the three friends do not all live on the <b>same street</b> (a flood on one street would take out every copy). And if one friend is on holiday when you drop off a copy, you leave it with the next neighbour along with a note: "please give this to Carol when she is back" — that note is <b>hinted handoff</b>.</p>`,
    explain: `<p>One copy of data is one disk failure away from loss. Distributed stores keep <b>N replicas</b> (the <i>replication factor</i>, usually 3). The ring gives a neat, coordinator-free way to pick them.</p>
      <p><b>Rule (Dynamo / Cassandra SimpleStrategy):</b> find the key's position, then <b>keep walking clockwise</b> and collect the first <b>N distinct physical nodes</b>. That ordered list is the key's <b>preference list</b>. The first node is often called the <i>coordinator</i> or primary for that key.</p>
      ${H.table(['step', 'token met', 'physical node', 'action'], [['1', 'B1 @65°', 'B', H.c('g', 'pick #1')], ['2', 'A2 @110°', 'A', H.c('g', 'pick #2')], ['3', 'B2 @155°', 'B', H.c('r', 'skip — B already holds a copy')], ['4', 'C1 @200°', 'C', H.c('g', 'pick #3 → done')]])}
      <p><b>Why skip duplicates?</b> With virtual nodes, the next few tokens often belong to the same machine. Two "replicas" on one machine die together — that is not replication.</p>
      <p><b>Racks and zones.</b> Distinct machines are not enough: a rack switch or a whole availability zone (AZ) can fail. <b>Rack-aware placement</b> (Cassandra's <code>NetworkTopologyStrategy</code>) walks the ring but prefers nodes in racks/AZs not used yet; it only reuses a rack when every rack already has a replica. Across data centers you set a replica count per DC, e.g. <code>{'us-east': 3, 'eu-west': 3}</code>.</p>
      <p><b>Every node owns more than its own arc.</b> With N = 3, a node stores its own arc <i>plus</i> copies of the arcs of the 2 nodes before it. So each node holds ≈ N/(number of nodes) of all data. When a node joins, it must receive data for <b>N ranges</b>, and N old nodes each give up one range.</p>
      <p><b>Quorums.</b> Writes go to all N replicas; the client waits for <b>W</b> acks. Reads ask <b>R</b> replicas. If <b>R + W &gt; N</b> (e.g. N=3, W=2, R=2) every read overlaps the latest successful write on at least one replica.</p>
      <p><b>Hinted handoff (Dynamo's "sloppy quorum").</b> If replica C is down during a write, Dynamo sends C's copy to the <b>next healthy node</b> past the preference list, tagged with a <b>hint</b> ("this belongs to C"). When C returns, the hint is replayed to C and deleted. Writes stay available during short outages. Permanent divergence is later fixed by <b>anti-entropy</b> (Merkle-tree comparison) and <b>read repair</b>.</p>`,
    clues: [
      '"replication factor 3" / "survive the loss of a node / rack / AZ" → preference list with distinct physical nodes and racks',
      '"always writable" / "accept writes even when some replicas are down" → sloppy quorum + hinted handoff (Dynamo-style)',
      '"R + W &gt; N" / "tunable consistency" → quorums over the ring\'s preference list',
      '"a node joins — which nodes stream data to it?" → it takes N ranges, from the N nodes that used to hold them',
      '"multi-region" / "per-datacenter replica counts" → NetworkTopologyStrategy-style placement'
    ],
    code: [{
      lang: 'python', run: true, title: 'Preference list with distinct nodes, rack awareness and hinted handoff (runnable)',
      code: `# Fixed toy ring (angles 0-359) so the output is easy to follow.
# token position -> (vnode label, physical node)
RING = [(20, "A1", "A"), (65, "B1", "B"), (110, "A2", "A"), (155, "B2", "B"),
        (200, "C1", "C"), (245, "D1", "D"), (290, "C2", "C"), (335, "D2", "D")]
RACK = {"A": "rack1", "B": "rack1", "C": "rack2", "D": "rack3"}

def clockwise_from(pos):
    """Yield ring entries starting at the first token >= pos, one full lap."""
    start = next((i for i, t in enumerate(RING) if t[0] >= pos), 0)   # wrap to 0
    for step in range(len(RING)):
        yield RING[(start + step) % len(RING)]

def simple_strategy(pos, n):
    """Dynamo / Cassandra SimpleStrategy: first n DISTINCT physical nodes."""
    out = []
    for _, label, node in clockwise_from(pos):
        if node not in out:
            out.append(node)
            if len(out) == n:
                break
    return out

def rack_aware(pos, n):
    """NetworkTopologyStrategy idea: prefer racks not used yet; reuse racks only when all are used."""
    out, skipped, racks_used = [], [], set()
    all_racks = set(RACK.values())
    for _, label, node in clockwise_from(pos):
        if node in out or node in skipped:
            continue
        if RACK[node] not in racks_used:
            out.append(node)
            racks_used.add(RACK[node])
        else:
            skipped.append(node)            # remember, in ring order, for later
        if len(out) == n or racks_used == all_racks:
            break
    for node in skipped:                    # every rack used: fill from skipped nodes
        if len(out) == n:
            break
        out.append(node)
    return out

def write_targets(pos, n, down):
    """Sloppy quorum: each down replica's copy goes to the next healthy node, with a hint."""
    pref = simple_strategy(pos, n)
    missing = [node for node in pref if node in down]
    targets = [(node, None) for node in pref if node not in down]
    for _, label, node in clockwise_from(pos):
        if not missing:
            break
        chosen = [t for t, _ in targets]
        if node not in pref and node not in down and node not in chosen:
            targets.append((node, "hint for " + missing.pop(0)))
    return targets

key_pos = 50
print("simple  :", simple_strategy(key_pos, 3), "racks:", [RACK[x] for x in simple_strategy(key_pos, 3)])
print("rack    :", rack_aware(key_pos, 3), "racks:", [RACK[x] for x in rack_aware(key_pos, 3)])
print("C down  :", write_targets(key_pos, 3, down={"C"}))
`
    }],
    codeTitle: ['Replica placement'],
    viz: {
      title: 'Placing replicas by walking the ring',
      input: '50 3 C',
      inputLabel: 'key angle (0-359), replication factor N (1-4), down node (A-D or -)',
      gen: function (input) {
        var t = words(input);
        var pos = Number(t[0]), n = Number(t[1] || 3), down = (t[2] || '-').toUpperCase();
        if (!(pos >= 0 && pos <= 359) || Math.floor(pos) !== pos) throw new Error('First value: key angle 0-359');
        if (!(n >= 1 && n <= 4) || Math.floor(n) !== n) throw new Error('Second value: replication factor 1-4');
        if (down !== '-' && 'ABCD'.indexOf(down) < 0) throw new Error('Third value: a down node A, B, C, D or -');
        var RING = [[20, 'A1', 'A'], [65, 'B1', 'B'], [110, 'A2', 'A'], [155, 'B2', 'B'], [200, 'C1', 'C'], [245, 'D1', 'D'], [290, 'C2', 'C'], [335, 'D2', 'D']];
        var RACK = { A: 'r1', B: 'r1', C: 'r2', D: 'r3' };
        var nodes = RING.map(function (r) { var q = ringXY(r[0], 42); return { id: r[1], label: r[1], x: q.x, y: q.y }; });
        var kq = ringXY(pos, 20); nodes.push({ id: 'K', label: 'key', x: kq.x, y: kq.y });
        var edges = RING.map(function (r, i) { return [r[1], RING[(i + 1) % RING.length][1]]; });
        var start = 0; while (start < RING.length && RING[start][0] < pos) start++; if (start === RING.length) start = 0;
        edges.push(['K', RING[start][1]]);
        var baseTags = {}; RING.forEach(function (r) { baseTags[r[1]] = r[0] + '° ' + RACK[r[2]]; }); baseTags.K = pos + '°';
        function g(hl, ehl, tags) { return { type: 'graph', directed: true, height: 100, nodes: nodes, edges: edges, hl: hl, ehl: ehl, tags: tags || baseTags }; }
        var frames = [];
        frames.push({ narr: 'Ring with 4 physical nodes × 2 vnodes each (A1, A2 are both machine A). Racks: <b>A, B in r1</b>, C in r2, D in r3. Replication factor <b>N = ' + n + '</b>. The key sits at <b>' + pos + '°</b>.', parts: [
          g({ K: 'cur' }, {}),
          { type: 'table', label: 'physical nodes', columns: ['node', 'vnodes', 'rack'], rows: [['A', 'A1@20, A2@110', 'r1'], ['B', 'B1@65, B2@155', 'r1'], ['C', 'C1@200, C2@290', 'r2'], ['D', 'D1@245, D2@335', 'r3']] }
        ] });
        // ---- simple strategy walk
        var pref = [], hl = { K: 'cur' }, eh = {}, i = start, steps = 0, prevId = 'K';
        while (pref.length < n && steps < RING.length) {
          var r = RING[i], dup = pref.indexOf(r[2]) >= 0;
          eh[prevId + '-' + r[1]] = 'win';
          hl[r[1]] = dup ? 'bad' : 'ok';
          if (!dup) pref.push(r[2]);
          frames.push({ narr: 'Walk clockwise → token <b>' + r[1] + '</b> @' + r[0] + '° (machine ' + r[2] + '). ' + (dup ? '<span class="c-r">Skip:</span> machine ' + r[2] + ' already has a copy — two copies on one box die together.' : '<span class="c-g">Pick</span> ' + r[2] + ' as replica #' + pref.length + (pref.length === 1 ? ' (the coordinator / primary for this key).' : '.')), parts: [
            g(copyObj(hl), copyObj(eh)),
            { type: 'array', label: 'preference list (distinct machines)', values: pref.slice(), hl: (function () { var o = {}; o[pref.length - 1] = dup ? 'done' : 'ok'; return o; })() }
          ] });
          prevId = r[1]; i = (i + 1) % RING.length; steps++;
        }
        var racks = pref.map(function (x) { return RACK[x]; }), sameRack = racks.length !== racks.filter(function (x, k) { return racks.indexOf(x) === k; }).length;
        frames.push({ narr: 'SimpleStrategy result: <b>' + pref.join(', ') + '</b> on racks ' + racks.join(', ') + '. ' + (sameRack ? '<span class="c-r">Two replicas share a rack</span> — one rack power or switch failure would remove ' + racks.filter(function (x) { return x === 'r1'; }).length + ' copies at once.' : '<span class="c-g">All replicas on different racks.</span>'), parts: [
          { type: 'table', label: 'SimpleStrategy replicas', columns: ['#', 'node', 'rack'], rows: pref.map(function (x, k) { return [k + 1, x, RACK[x]]; }), hl: (function () { var o = {}; racks.forEach(function (x, k) { if (racks.indexOf(x) !== k || racks.lastIndexOf(x) !== k) o[k] = 'bad'; }); return o; })() }
        ] });
        // ---- rack-aware walk
        var ra = [], skipped = [], used = {}, allR = 3, hl2 = { K: 'cur' }, eh2 = {}, j = start, prev2 = 'K', seen = {};
        for (var s2 = 0; s2 < RING.length && ra.length < n && Object.keys(used).length < allR; s2++) {
          var q2 = RING[j], node = q2[2], why;
          eh2[prev2 + '-' + q2[1]] = 'win';
          if (ra.indexOf(node) >= 0 || seen[node]) { hl2[q2[1]] = 'done'; why = 'machine ' + node + ' already considered — skip.'; }
          else if (used[RACK[node]]) { hl2[q2[1]] = 'bad'; skipped.push(node); seen[node] = 1; why = '<span class="c-r">rack ' + RACK[node] + ' already has a replica</span> — set ' + node + ' aside for later.'; }
          else { hl2[q2[1]] = 'ok'; ra.push(node); used[RACK[node]] = 1; seen[node] = 1; why = '<span class="c-g">new rack ' + RACK[node] + '</span> → pick ' + node + '.'; }
          frames.push({ narr: 'Rack-aware walk: token <b>' + q2[1] + '</b> — ' + why, parts: [
            g(copyObj(hl2), copyObj(eh2)),
            { type: 'array', label: 'rack-aware replicas', values: ra.slice() },
            { type: 'set', label: 'racks used', items: Object.keys(used) }
          ] });
          prev2 = q2[1]; j = (j + 1) % RING.length;
        }
        while (ra.length < n && skipped.length) ra.push(skipped.shift());
        frames.push({ narr: 'Rack-aware result: <b>' + ra.join(', ') + '</b> on racks ' + ra.map(function (x) { return RACK[x]; }).join(', ') + '. (When every rack is used, remaining replicas come from the set-aside nodes in ring order.) This is the idea behind Cassandra\'s NetworkTopologyStrategy.', parts: [
          { type: 'table', label: 'rack-aware replicas', columns: ['#', 'node', 'rack'], rows: ra.map(function (x, k) { return [k + 1, x, RACK[x]]; }) }
        ] });
        // ---- hinted handoff
        if (down !== '-' && pref.indexOf(down) >= 0) {
          var targets = pref.filter(function (x) { return x !== down; }), extra = null, k2 = i, hl3 = {}, tags3 = copyObj(baseTags);
          for (var s3 = 0; s3 < RING.length; s3++) {
            var c = RING[(k2 + s3) % RING.length][2];
            if (c !== down && pref.indexOf(c) < 0) { extra = RING[(k2 + s3) % RING.length]; break; }
          }
          RING.forEach(function (r) { if (r[2] === down) hl3[r[1]] = 'bad'; else if (targets.indexOf(r[2]) >= 0) hl3[r[1]] = 'ok'; });
          if (extra) { hl3[extra[1]] = 'sel'; tags3[extra[1]] = 'hint → ' + down; }
          frames.push({ narr: '<b>' + down + ' is down</b> during a write. ' + (extra ? 'Dynamo-style sloppy quorum: keep walking past the preference list to the next healthy machine, <b>' + extra[2] + '</b>, and store ' + down + '\'s copy there with a <b>hint</b>. When ' + down + ' comes back, ' + extra[2] + ' replays the hint to it and deletes its temporary copy.' : 'No spare healthy node is left — the write can only reach ' + targets.length + ' replicas.'), parts: [
            g(hl3, {}, tags3),
            { type: 'table', label: 'write targets', columns: ['node', 'role'], rows: targets.map(function (x) { return [x, 'replica']; }).concat(extra ? [[extra[2], 'temporary copy + hint for ' + down]] : []), hl: extra ? (function () { var o = {}; o[targets.length] = 'sel'; return o; })() : {} }
          ] });
          frames.push({ narr: 'With W = 2 the client still gets 2 acks quickly, so the write succeeds. Later, <b>anti-entropy</b> (Merkle-tree comparison between replicas) and <b>read repair</b> fix anything the hints missed.', parts: [
            { type: 'vars', label: 'quorum check', vals: { N: n, W: Math.min(2, n), 'acks available': targets.length + (extra ? 1 : 0), 'write ok?': (targets.length + (extra ? 1 : 0)) >= Math.min(2, n) ? 'yes' : 'no' }, hl: { 'write ok?': 'ok' } }
          ] });
        } else {
          frames.push({ narr: (down === '-' ? 'No node is down' : down + ' is not in this key\'s preference list') + ', so the write goes straight to ' + pref.join(', ') + '. Try input "50 3 C" to see hinted handoff.', parts: [
            { type: 'vars', vals: { N: n, replicas: pref.join(',') } }
          ] });
        }
        return frames;
      }
    },
    examples: [
      { title: 'How much data does each node hold?', html: `<p>10 nodes, 20 TB of unique data, N = 3. Total stored = 60 TB → each node ≈ <b>6 TB</b> (3/10 of all keys). Plan disks for N × data ÷ nodes, plus headroom for compaction and for absorbing a dead neighbour's ranges.</p>` },
      { title: 'A node joins — who streams to it?', html: `<p>Ring without vnodes, N = 3, nodes in order P1 → P2 → P3 → P4. New node X lands between P1 and P2. X becomes replica #1 for (P1, X], #2 for the range ending at P1, and #3 for the range ending at the node before P1. Each of those ranges loses one old replica — P4, P3 and P2 respectively drop a copy (the old 3rd member falls off each list). So X streams ${H.c('b', '3 ranges')}, and 3 nodes can clean up afterwards. With vnodes, the same happens per token, from many nodes at once.</p>` },
      { title: 'Quorum arithmetic', html: `${H.table(['N', 'W', 'R', 'R+W&gt;N?', 'behaviour'], [['3', '2', '2', H.c('g', 'yes'), 'balanced, tolerates 1 replica down for both reads and writes'], ['3', '3', '1', H.c('g', 'yes'), 'fast reads, writes fail if any replica is down'], ['3', '1', '1', H.c('r', 'no'), 'fastest, may read stale data (eventual)']])}<p>Note: a <i>sloppy</i> quorum counts hinted nodes, so even R+W&gt;N does not guarantee reading the latest write during failures — that is the price of "always writable".</p>` }
    ],
    deepDive: `<p><b>Dynamo specifics (2007 paper).</b> The preference list contains more than N nodes so it can skip failed ones; the coordinator is the first healthy node in the list; data is versioned with <b>vector clocks</b>, and conflicting versions are returned to the client to reconcile (e.g. shopping-cart union). Membership and failure detection use <b>gossip</b>; replicas sync with <b>Merkle trees</b> per key range so only differing sub-ranges are exchanged.</p>
      <p><b>Cassandra differences.</b> Cassandra's coordinator (any node the client contacts) stores <b>hints</b> locally for down replicas (up to <code>max_hint_window</code>, 3 hours by default) and replays them later; hints do <i>not</i> count towards the consistency level except for <code>ANY</code>. Conflicts are resolved by <b>last-write-wins</b> timestamps per cell rather than vector clocks. <code>LOCAL_QUORUM</code> keeps a quorum within one data center for multi-DC latency.</p>
      <p><b>Rack-aware corner cases.</b> If you have fewer racks than replicas, replicas must share racks — keep racks equal in size or load becomes uneven (a node alone in its rack receives a replica of a much larger share of keys). This is why operators run "3 racks = 3 AZs, same node count per AZ".</p>
      <p><b>Copysets and multi-failure risk.</b> Random replica placement means that with many nodes, losing <i>any</i> 3 nodes simultaneously probably loses some data with N = 3. Copyset-style placement restricts replicas to a small number of node groups, trading recovery parallelism for a much lower probability of data loss.</p>
      <p><b>Ownership changes must be careful.</b> During a join, a range has a "pending" owner. Cassandra writes to both old and pending replicas until streaming completes, so no write falls in the gap. Get this wrong and you lose writes during rebalancing.</p>`,
    aiEra: `<p><b>What AI changes:</b> assistants know "replication factor 3" and "R + W &gt; N" by heart. What they often skip is the <b>distinct physical node</b> rule with vnodes, rack/AZ awareness, and what happens <i>during</i> membership changes — exactly what interviewers probe.</p>
      <p><b>Use AI as a partner:</b> have it build a small simulator: random ring, kill k random nodes, report the % of keys that lost quorum for different placement strategies and vnode counts. It turns a hand-wavy availability debate into numbers.</p>
      <p><b>Where AI goes wrong:</b> counting vnodes as replicas, claiming sloppy quorums give strong consistency, or confusing Dynamo (the 2007 paper's ring) with today's DynamoDB, which uses managed partitions replicated with Multi-Paxos rather than a client-visible ring.</p>
      <p><b>What you still own:</b> choosing N, W, R, rack layout and failure budget from the product's durability and latency needs, and explaining the trade-offs out loud.</p>`,
    problems: [{
      title: 'Place Three Replicas Safely',
      level: 'Medium', tags: ['replication', 'preference list', 'racks'], companies: ['Amazon', 'Apple', 'Netflix'],
      statement: `<p>Ring tokens (clockwise): A1@20, B1@65, A2@110, B2@155, C1@200, D1@245, C2@290, D2@335. Racks: A, B → r1; C → r2; D → r3. A key hashes to <b>50°</b>, replication factor <b>3</b>. (1) Give the preference list using "first N distinct machines". (2) Give it with rack-aware placement. (3) During a write, C is down — with a Dynamo-style sloppy quorum, which nodes receive the write and which holds a hint?</p>`,
      constraints: `<p>Distinct physical machines only; rack-aware placement prefers unused racks and reuses racks only after all racks are used.</p>`,
      example: `<p>Walk from 50°: ${H.c('g', 'B1')} → ${H.c('g', 'A2')} → ${H.c('r', 'B2 (dup)')} → ${H.c('g', 'C1')} …</p>`,
      brute: { why: `<p>Naive design: "the next 3 tokens clockwise". From 50° that is B1, A2, B2 → machines B, A, B: only <b>2 machines</b> hold the data, both in rack r1. One rack outage = data unavailable; one disk failure on B = 2 of 3 "replicas" gone.</p>` },
      mcq: { q: 'Why must the walk skip tokens whose physical machine already has a replica?', options: ['Two copies on one machine fail together, so they add no durability', 'To make lookups faster', 'Because vnodes cannot store data', 'To reduce the ring size'], answer: 0, explain: 'Replicas exist to survive independent failures; copies on the same machine (or rack) share a failure domain.' },
      hints: [`<p>Start at the first token ≥ 50° — that is B1@65.</p>`, `<p>For rack awareness: track racks used; set aside nodes whose rack is already used.</p>`, `<p>For the sloppy quorum: keep walking past the preference list for the next healthy machine not already a replica.</p>`],
      solution: {
        approach: `<p><b>(1) Distinct machines:</b> B1 → pick B; A2 → pick A; B2 → skip (B); C1 → pick C. Preference list <b>[B, A, C]</b>, racks r1, r1, r2 — two replicas in rack r1.</p>
          <p><b>(2) Rack-aware:</b> B1 → B (r1, new rack ✔); A2 → A is r1 (used) → set aside; B2 → B already chosen; C1 → C (r2 ✔); D1 → D (r3 ✔). Replicas <b>[B, C, D]</b> on three racks — survives any single rack failure.</p>
          <p><b>(3) C down, sloppy quorum on list [B, A, C]:</b> the write goes to B and A, and C's copy goes to the next healthy machine past the list: tokens after C1 are D1 → <b>D</b>, which stores the write with a hint "for C". With W = 2 the client is acknowledged after any two of B, A, D respond. When C recovers, D hands the data off and deletes its copy. Using the rack-aware list [B, C, D] instead, the walk past D1 continues C2 (down) → D2 (already a replica) → A1 → <b>A</b> gets the hint.</p>`,
        complexity: `<p>Walking the ring is O(T) worst case (T tokens) but stops after a handful of steps in practice; real systems cache the replica set per token range.</p>`,
        followUps: ['What if there were only 2 racks and N = 3?', 'How does Cassandra\'s hinted handoff differ from Dynamo\'s sloppy quorum?']
      }
    }]
  });

  /* =====================================================================
     TOPIC 5 — Rendezvous (highest random weight) hashing
     ===================================================================== */
  topics.push({
    title: 'Rendezvous Hashing (HRW) and Other Ring Alternatives',
    analogy: `<p>A new student must pick a lunch table. Instead of a seating chart, every table has a <b>secret dice roll for every student</b> — fixed forever, and anybody can recompute it. The student just sits at the table with the <b>highest roll</b>. If one table is removed, only the students who were sitting there move — each to their personal second-best table. If a new table arrives, it only "steals" the students for whom it rolls higher than their current favourite. No ring, no chart, no meeting needed.</p>`,
    explain: `<p><b>Rendezvous hashing</b> (a.k.a. <b>Highest Random Weight, HRW</b> — Thaler &amp; Ravishankar, 1996) gets the same minimal-movement property as the ring with an even simpler rule:</p>
      <pre>owner(key) = the server s with the largest hash(s, key)</pre>
      <p>Every client computes one score per server for this key and picks the max. Scores are pseudo-random, so each server wins about 1/N of the keys.</p>
      ${H.table(['key', 'S1', 'S2', 'S3', 'S4', 'winner'], [
        ['cat.jpg', '42.5', '37.7', '70.7', H.c('b', '96.8'), 'S4'],
        ['dog.png', '15.0', H.c('b', '89.3'), '80.5', '5.2', 'S2'],
        ['app.js', H.c('b', '83.3'), '49.7', '31.7', '44.4', 'S1']
      ])}
      <p><b>Remove S2:</b> only keys whose winner was S2 change — dog.png goes to its runner-up S3 (80.5). Nobody else is affected, because their max did not involve S2. <b>Add S5:</b> a key moves only if S5's score beats its current max — on average 1/(N+1) of keys, all moving <i>to</i> S5.</p>
      <p><b>Ring vs rendezvous at a glance:</b></p>
      ${H.table(['', 'hash ring + vnodes', 'rendezvous (HRW)'], [
        ['lookup cost', 'O(log(N·v)) binary search', 'O(N) — score every server'],
        ['memory', 'N·v tokens', 'just the server list'],
        ['balance', 'needs vnodes (~1/√v spread)', H.c('g', 'naturally even, no vnodes')],
        ['replicas', 'walk clockwise, skip duplicates', 'take the top-k scores — trivially distinct'],
        ['weights', 'vnode count ∝ weight', 'weighted score: w / −ln(u)'],
        ['best for', 'thousands of nodes, hot path lookups', 'tens to a few hundred nodes, simplicity']
      ])}
      <p><b>Other members of the family</b> (know the names and when to use them):</p>
      <ul>
        <li><b>Jump consistent hash</b> (Google, 2014): ~5 lines of code, no memory, O(log N) time, perfect balance — but servers must be numbered 0…N−1 and you can only add/remove at the <i>end</i>. Great for sharding into numbered storage buckets, bad for arbitrary node failures.</li>
        <li><b>Maglev hashing</b> (Google's network load balancer, 2016): builds a fixed lookup table (e.g. 65,537 slots) so lookups are O(1) with near-perfect balance; slightly more than minimal disruption on changes. Envoy offers it as the <code>maglev</code> LB policy.</li>
        <li><b>Consistent hashing with bounded loads</b> (Mirrokni et al., 2016): ring or HRW, but a server that is above c × average load (e.g. c = 1.25) is skipped and the key goes to the next candidate. Fixes hot spots; HAProxy implements it as <code>hash-balance-factor</code>.</li>
        <li><b>Fixed slots + lookup table</b> (Redis Cluster's 16384 slots): <code>slot = CRC16(key) % 16384</code>, plus a small slot → node map you move slot by slot.</li>
      </ul>`,
    clues: [
      '"small number of servers (tens)" + "simplest possible correct scheme" → rendezvous hashing',
      '"need k replicas / k candidate servers per key" → HRW top-k scores',
      '"O(1) lookup in a packet-processing load balancer" → Maglev',
      '"shards are numbered 0..N−1 and only grow" → jump consistent hash',
      '"some servers get too hot even with consistent hashing" → bounded-load consistent hashing'
    ],
    code: [
      { lang: 'python', run: true, title: 'Rendezvous hashing with weights and top-k replicas (runnable)', code: `import hashlib
import math
from collections import Counter

def score(server: str, key: str) -> float:
    """Pseudo-random number in (0, 1) that depends on BOTH server and key."""
    h = int.from_bytes(hashlib.md5(f"{server}:{key}".encode()).digest()[:8], "big")
    return (h + 1) / (2 ** 64 + 1)

def weighted_score(server, key, weight):
    # Weighted HRW: a server with weight 2 wins ~2x as often. Max of w / -ln(u).
    return weight / -math.log(score(server, key))

def owner(key, servers, weights=None):
    weights = weights or {}
    return max(servers, key=lambda s: weighted_score(s, key, weights.get(s, 1.0)))

def top_k(key, servers, k):
    """Replica set: the k highest-scoring servers (automatically distinct)."""
    return sorted(servers, key=lambda s: score(s, key), reverse=True)[:k]

servers = ["S1", "S2", "S3", "S4"]
keys = [f"obj{i}" for i in range(20000)]

before = {k: owner(k, servers) for k in keys}
print("balance       :", dict(sorted(Counter(before.values()).items())))

after_remove = {k: owner(k, ["S1", "S3", "S4"]) for k in keys}
moved = [k for k in keys if before[k] != after_remove[k]]
assert all(before[k] == "S2" for k in moved)          # only S2's keys move
print(f"remove S2     : {len(moved) / len(keys):.1%} moved (exactly S2's share)")

after_add = {k: owner(k, servers + ["S5"]) for k in keys}
moved = [k for k in keys if before[k] != after_add[k]]
assert all(after_add[k] == "S5" for k in moved)       # keys only move TO S5
print(f"add S5        : {len(moved) / len(keys):.1%} moved (ideal 20.0%)")

w = Counter(owner(k, servers, {"S1": 2.0}) for k in keys)
print("S1 weight 2   :", dict(sorted(w.items())), "-> S1 gets ~40%")
print("replicas obj7 :", top_k("obj7", servers, 3))
` },
      { lang: 'java', title: 'Rendezvous hashing and jump consistent hash in Java', code: `import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.*;

public class RendezvousDemo {
    static long hash64(String s) {
        try {
            byte[] d = MessageDigest.getInstance("MD5").digest(s.getBytes(StandardCharsets.UTF_8));
            long h = 0;
            for (int i = 0; i < 8; i++) h = (h << 8) | (d[i] & 0xFF);
            return h;
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    /** HRW: the server with the highest hash(server, key) wins. O(N) per lookup, no extra memory. */
    static String owner(String key, List<String> servers) {
        String best = null;
        long bestScore = 0;
        for (String s : servers) {
            long sc = hash64(s + ":" + key);
            // compare as unsigned so the whole 64-bit range counts; tie-break on name for determinism
            if (best == null || Long.compareUnsigned(sc, bestScore) > 0
                    || (sc == bestScore && s.compareTo(best) > 0)) {
                best = s;
                bestScore = sc;
            }
        }
        return best;
    }

    /** Jump consistent hash (Lamping & Veach, 2014): bucket in [0, numBuckets). Buckets only grow/shrink at the end. */
    static int jumpHash(long key, int numBuckets) {
        long b = -1, j = 0;
        while (j < numBuckets) {
            b = j;
            key = key * 2862933555777941757L + 1;                       // 64-bit LCG step
            j = (long) ((b + 1) * ((double) (1L << 31) / (double) ((key >>> 33) + 1)));
        }
        return (int) b;
    }

    public static void main(String[] args) {
        List<String> servers = new ArrayList<>(List.of("S1", "S2", "S3", "S4"));
        Map<String, Integer> load = new TreeMap<>();
        for (int i = 0; i < 10000; i++) load.merge(owner("obj" + i, servers), 1, Integer::sum);
        System.out.println("HRW load: " + load);

        int moved = 0;
        for (int i = 0; i < 10000; i++) {
            long k = hash64("obj" + i);
            if (jumpHash(k, 10) != jumpHash(k, 11)) moved++;
        }
        System.out.println("jump hash 10 -> 11 buckets moved " + moved / 100.0 + "% (ideal ~9.1%)");
    }
}` }
    ],
    codeTitle: ['Rendezvous (Python, runnable)', 'Rendezvous + Jump hash (Java)'],
    viz: {
      title: 'Rendezvous hashing: highest score wins',
      input: 'S1 S2 S3 S4 | cat.jpg dog.png home.css app.js logo.svg video.mp4 | S2 | S5',
      inputLabel: 'servers | keys | server to remove | server to add',
      gen: function (input) {
        var seg = String(input).split('|');
        var sv = words(seg[0]), ks = words(seg[1] || ''), rem = words(seg[2] || '')[0], add = words(seg[3] || '')[0];
        if (sv.length < 2 || sv.length > 8) throw new Error('Give 2-8 servers before the first |');
        if (ks.length < 1 || ks.length > 10) throw new Error('Give 1-10 keys after the first |');
        if (rem && sv.indexOf(rem) < 0) throw new Error('The server to remove must be in the server list');
        if (add && sv.indexOf(add) >= 0) throw new Error('The server to add must be a new name');
        function sc(s, k) { return Math.round(h32(s + ':' + k) / 4294967.296) / 10; }
        function win(list, k) { var b = list[0]; list.forEach(function (s) { if (sc(s, k) > sc(b, k) || (sc(s, k) === sc(b, k) && s > b)) b = s; }); return b; }
        var frames = [], owners = {};
        frames.push({ narr: 'No ring at all. For each key, every client computes a score <code>hash(server + ":" + key)</code> for <b>every</b> server (scaled to 0-100 here) and picks the <b>highest</b>. Same inputs → same scores on every machine.', parts: [
          { type: 'code', label: 'the whole algorithm', lang: 'python', code: 'def owner(key, servers):\n    return max(servers, key=lambda s: hash(s + ":" + key))', hl: { 2: 'cur' } },
          { type: 'array', label: 'servers', values: sv.slice() }
        ] });
        ks.forEach(function (k) {
          var vals = sv.map(function (s) { return sc(s, k); }), w = win(sv, k), hl = {};
          owners[k] = w; hl[sv.indexOf(w)] = 'sel';
          var sortedIdx = vals.map(function (v, i) { return i; }).sort(function (a, b) { return vals[b] - vals[a]; });
          hl[sortedIdx[1]] = 'win';
          frames.push({ narr: 'Key <b>' + k + '</b>: scores ' + sv.map(function (s, i) { return s + '=' + vals[i]; }).join(', ') + '. Highest is <b>' + w + '</b> → owner. (Runner-up ' + sv[sortedIdx[1]] + ' would take over if ' + w + ' disappeared; top-2 = a natural replica pair.)', parts: [
            { type: 'bars', label: 'scores for ' + k, values: vals, idxLabels: sv, hl: hl, texts: vals.map(String) }
          ] });
        });
        var rows = ks.map(function (k) { return [k, owners[k]]; });
        frames.push({ narr: 'Placement done. Each server wins roughly 1/' + sv.length + ' of keys on average — no virtual nodes needed, because every key gets an independent "dice roll" per server.', parts: [
          { type: 'table', label: 'owners', columns: ['key', 'owner'], rows: rows }
        ] });
        if (rem) {
          var sv2 = sv.filter(function (s) { return s !== rem; }), r2 = [], hl2 = {}, mv = 0;
          ks.forEach(function (k, i) { var o = win(sv2, k), m = o !== owners[k]; if (m) mv++; r2.push([k, owners[k], o, m ? 'MOVED' : 'stays']); hl2[i] = m ? 'bad' : 'ok'; });
          frames.push({ narr: '<b>' + rem + ' is removed.</b> Re-run max() without it. Only keys that ' + rem + ' was winning change owner (' + mv + ' of ' + ks.length + ') — each to its own runner-up, so the load spreads across <i>all</i> survivors.', parts: [
            { type: 'table', label: 'after removing ' + rem, columns: ['key', 'before', 'after', 'result'], rows: r2, hl: hl2 }
          ] });
        }
        if (add) {
          var sv3 = sv.concat([add]), r3 = [], hl3 = {}, mv3 = 0;
          ks.forEach(function (k, i) { var o = win(sv3, k), m = o !== owners[k]; if (m) mv3++; r3.push([k, owners[k] + ' (' + sc(owners[k], k) + ')', add + ' scores ' + sc(add, k), o, m ? 'MOVED' : 'stays']); hl3[i] = m ? 'bad' : 'ok'; });
          frames.push({ narr: '<b>' + add + ' joins</b> (starting from the original servers). A key moves only if ' + add + '\'s score beats its current best — ' + mv3 + ' of ' + ks.length + ' here (expected ≈ 1/' + sv3.length + '). Every moved key moves <b>to</b> ' + add + '.', parts: [
            { type: 'table', label: 'after adding ' + add, columns: ['key', 'old owner (score)', 'new server', 'new owner', 'result'], rows: r3, hl: hl3 }
          ] });
        }
        frames.push({ narr: 'Trade-off: each lookup scores all N servers (O(N)). With 10-100 servers that is nanoseconds-to-microseconds and needs zero extra memory; with 10,000 servers a ring (O(log)) or Maglev table (O(1)) is better.', parts: [
          { type: 'table', columns: ['scheme', 'lookup', 'memory', 'balance'], rows: [['ring + vnodes', 'O(log N·v)', 'N·v tokens', '≈ 1/√v spread'], ['rendezvous', 'O(N)', 'server list', 'even'], ['jump hash', 'O(log N)', 'none', 'perfect, numbered buckets only'], ['Maglev', 'O(1)', 'table ~65k', 'near-perfect']], hl: { 1: 'sel' } }
        ] });
        return frames;
      }
    },
    examples: [
      { title: 'Choosing 2 replicas with HRW', html: `<p>Scores for key "logo.svg": S1 97.0, S2 83.6, S3 25.2, S4 98.5. Sort descending → S4, S1, S2, S3. Replicas for N = 2: <b>S4, S1</b>. If S4 dies, the new list is S1, S2 — S1 was already a replica, so only one new copy (on S2) is needed. Top-k is always distinct; no "skip duplicates" logic.</p>` },
      { title: 'Weighted HRW', html: `<p>S1 is twice as big. Use score = w / −ln(u) where u ∈ (0,1) is the hash scaled down. With w = 2 for S1 and 1 for the others (4 servers), S1 wins 2/5 = <b>40%</b> of keys and the others 20% each — exact proportionality, still minimal movement. (Naively multiplying the raw hash by w does <i>not</i> give proportional shares.)</p>` },
      { title: 'Real deployments', html: `<p>Microsoft's CARP proxy-cache protocol used HRW to pick a cache per URL; GitHub's GLB load balancer uses rendezvous hashing to build its forwarding tables; Apache Ignite's default affinity function is rendezvous-based. Many service meshes and CDNs use ring or Maglev variants for the same "sticky but resilient" routing.</p>` }
    ],
    deepDive: `<p><b>Why HRW is minimal.</b> Removing server x changes the argmax only for keys where x was the argmax. Adding y changes it only where y's score is the new maximum, which by symmetry happens with probability 1/(N+1). So expected movement is exactly the theoretical minimum, with no variance from token placement.</p>
      <p><b>Making O(N) cheaper.</b> For large N, use a <b>skeleton-based / hierarchical HRW</b>: group servers into clusters, HRW-pick a cluster, then HRW within it → O(√N) or O(log N). Or precompute per-key results in a cache.</p>
      <p><b>Jump hash internals.</b> It simulates, for each key, the sequence of bucket counts at which the key would "jump" to the newly added bucket; jumps get rarer as N grows (probability 1/(n+1) at size n+1), giving O(ln N) expected iterations and perfect monotonicity. Limitation: removing bucket 3 of 10 is impossible without renumbering, so pair it with replication or a level of indirection (logical shard → physical node table).</p>
      <p><b>Maglev internals.</b> Each backend has a permutation of table slots (from two hashes: offset and skip); backends take turns claiming their next preferred empty slot until the prime-sized table is full. Result: each backend owns ~M/N slots (within ~1%), lookup is a single array index — ideal at millions of packets per second. On a change, the table is rebuilt; most slots keep their owner, with a little extra churn compared to the ring.</p>
      <p><b>Bounded loads.</b> Capacity per server = ⌈c · total/N⌉. Walk the ring (or HRW order) and assign to the first server with spare capacity. With c = 1.25, no server exceeds 125% of average, and expected movement on changes stays O(1/ε²)-bounded. Vimeo contributed it to HAProxy (<code>hash-balance-factor</code>) after it noticeably evened out load on their video cache tier.</p>`,
    aiEra: `<p><b>What AI changes:</b> asking "ring or rendezvous?" to an assistant gets you a generic table. The interview signal is <b>picking</b> one for the stated constraints: number of nodes, lookup rate, memory budget, need for weights, numbered vs named nodes.</p>
      <p><b>Use AI as a partner:</b> let it implement HRW, jump and ring behind one interface, then benchmark lookup latency and movement for your N. Ask it to explain Maglev's permutation table — then verify against the paper.</p>
      <p><b>Where AI goes wrong:</b> weighting HRW by multiplying the hash by w (wrong shares), comparing 64-bit hashes as signed numbers in Java (half the space behaves oddly), or suggesting jump hash for a cluster where arbitrary nodes fail.</p>
      <p><b>AI-era use:</b> agent and LLM gateways route sessions to model replicas; rendezvous hashing on <code>session_id</code> with bounded loads keeps a conversation on the replica holding its KV cache while preventing one viral session cluster from overloading a single GPU. <b>You still own</b> the choice of key (session vs prompt prefix) and the load bound.</p>`,
    problems: [{
      title: 'Ring or Rendezvous for a 24-Node Image Cache?',
      level: 'Medium', tags: ['rendezvous hashing', 'trade-offs', 'cache'], companies: ['Microsoft', 'Cloudflare', 'Pinterest'],
      statement: `<p>An image service puts 24 cache servers behind a fleet of 300 stateless API servers. Each API server must pick the cache for an image ID locally (no central router), at 50,000 lookups/sec per API server. Caches are added and removed a few times a week; 4 of them are bigger (2× RAM). Choose between a hash ring with vnodes and rendezvous hashing, and describe the full routing design.</p>`,
      constraints: `<p>Lookup must cost under ~2 µs; movement on change ≈ minimal; weights needed; all API servers must agree.</p>`,
      example: `<p>HRW cost: 24 hashes per lookup × ~40 ns ≈ ${H.c('g', '1 µs')}. Ring: binary search over 24 × 200 = 4,800 tokens ≈ 13 comparisons ≈ ${H.c('g', '0.2 µs')}. Both fit.</p>`,
      brute: { why: `<p>Naive design: <code>caches[hash(id) % 24]</code>. Every add/remove reshuffles ~96% of images → origin storage flood. A central "cache router" service is the other naive idea — it adds a network hop and a single point of failure to every image request.</p>` },
      mcq: { q: 'What is the main cost of rendezvous hashing compared to a ring?', options: ['O(N) score computations per lookup', 'Worse balance', 'More keys move on changes', 'It cannot support weights'], answer: 0, explain: 'HRW balances well and moves minimally, but each lookup must score all N servers.' },
      hints: [`<p>Compute lookup cost for both at N = 24. Is O(N) actually a problem here?</p>`, `<p>Weights: weighted HRW (w / −ln u) vs vnodes ∝ capacity.</p>`, `<p>Agreement: all API servers need the same member list — from where? What about the moment a cache dies?</p>`],
      solution: {
        approach: `<p><b>Choice: rendezvous hashing (weighted).</b> With only 24 nodes, O(N) scoring is ≈ 1 µs, well within budget, and it needs no vnode tuning: balance is naturally even and weights are exact (big caches get weight 2 → twice the images).</p>
          <p><b>Design:</b> (1) A config service (etcd/ZooKeeper or the service mesh's EDS) publishes the cache member list with weights and a version number. API servers subscribe and swap their list atomically. (2) Lookup: <code>max over caches of w / −ln(u(cache, imageId))</code> using a fast stable 64-bit hash (xxHash/Murmur3). (3) Failure: health checks remove a dead cache from the list; only its ~1/24 of images re-route, each to its runner-up, spreading the miss load across all 23 others. (4) Warm-up: add a new cache with weight 0.2 and raise it gradually. (5) Hot images: add a small local in-process cache on API servers and/or bounded loads (skip a cache above 1.25× average). (6) Replicas for very hot keys: read from the top-2 HRW caches.</p>
          <p><b>When I would pick the ring instead:</b> thousands of nodes, or a library ecosystem already using ketama (e.g. memcached clients), or if I need O(log N) lookups on a very hot path. For an L4 balancer at packet rate: Maglev.</p>`,
        complexity: `<p>HRW: O(N) per lookup, O(N) memory. Ring: O(log(N·v)) lookup, O(N·v) memory. Both move ≈ 1/N of keys per change.</p>`,
        followUps: ['How do you handle two API servers seeing different member lists for a few seconds?', 'How would bounded loads change cache hit rate?']
      }
    }]
  });

  /* =====================================================================
     TOPIC 6 — Real uses: Dynamo, Cassandra, CDNs, load balancers
     ===================================================================== */
  topics.push({
    title: 'Real Systems: Dynamo, Cassandra, CDNs, Caches & Load Balancers',
    analogy: `<p>Consistent hashing is like the <b>postcode system</b>. Once every house has a postcode and every sorting office covers a range of postcodes, any postman anywhere knows where a letter goes. Opening a new sorting office only re-assigns a few postcodes from its neighbours. Different countries (systems) use the same idea with local twists: some draw ranges on a ring, some use numbered slots, some pick the "best-scoring" office.</p>`,
    explain: `<p>Here is where you meet consistent hashing in production — and the twist each system adds.</p>
      ${H.table(['system', 'what is hashed', 'scheme', 'twist worth mentioning'], [
        ['<b>Amazon Dynamo</b> (2007 paper)', 'item key (MD5)', 'ring + virtual nodes', 'preference list of N distinct nodes, sloppy quorum, hinted handoff, vector clocks, Merkle trees, gossip'],
        ['<b>Apache Cassandra</b>', 'partition key (Murmur3)', 'ring, token range −2<sup>63</sup>…2<sup>63</sup>−1, vnodes (<code>num_tokens</code>, 16 by default since 4.0)', 'any node can coordinate; NetworkTopologyStrategy for racks/DCs; tunable consistency (ONE, QUORUM, LOCAL_QUORUM)'],
        ['<b>ScyllaDB / Riak</b>', 'partition key', 'Riak: fixed ring of partitions; Scylla: vnodes, moving to tablets', 'fixed or splittable partitions decouple key → partition from partition → node'],
        ['<b>Akamai-style CDNs</b>', 'URL / object name', 'consistent hashing (Karger et al. invented it for this)', 'each object cached on one or a few servers in a PoP, so the PoP\'s total RAM acts as one big cache'],
        ['<b>memcached clients</b> (ketama)', 'cache key (MD5)', 'ring with ~100-200 points per server', 'losing one server only loses its share of the cache'],
        ['<b>Envoy / Nginx / HAProxy</b>', 'header, cookie, IP or URI', '<code>ring_hash</code> / <code>maglev</code>; <code>hash … consistent</code>; <code>hash-type consistent</code>', 'sticky routing that survives backend scaling; HAProxy adds bounded load'],
        ['<b>Discord</b>', 'guild (server) ID', 'hash ring (open-sourced <code>ex_hash_ring</code>)', 'routes every guild to one Elixir process host'],
        ['<b>Redis Cluster</b>', 'key or <code>{hash tag}</code> (CRC16)', '16384 fixed slots, slot → node table', 'not a ring! Clients get <code>MOVED</code>/<code>ASK</code> redirects while slots migrate']
      ])}
      <p><b>A Cassandra write, step by step:</b> the client sends <code>INSERT … WHERE user_id = 42</code> to any node, which becomes the <b>coordinator</b>. The coordinator hashes the partition key with Murmur3 to get a token, looks up the token's replicas from the ring (respecting racks/DCs), sends the write to <b>all</b> replicas, and answers the client once the consistency level is met (QUORUM = 2 of 3). A down replica gets a stored hint for later.</p>
      <p><b>A CDN request, step by step:</b> DNS or anycast sends the user to a nearby PoP. Inside the PoP, an L4 balancer (often Maglev-style) spreads connections; then the request is routed by <b>consistent hashing on the URL</b> to the one cache server responsible for that object. Without this, every one of 40 servers in the PoP would cache its own copy of popular objects, and the PoP would hold 40× fewer distinct objects. On a miss, that server fetches from a parent tier or origin. Very hot objects are spread to several servers (top-k on the ring/HRW) to avoid a hot spot.</p>
      <p><b>Important contrasts to name:</b> <b>Kafka</b> uses <code>hash(key) % partitions</code> (fine, because the partition count rarely changes — but changing it breaks key ordering). <b>DynamoDB</b> (the managed service) is not the 2007 ring: it splits tables into partitions tracked by a metadata service and replicates each with Multi-Paxos. Range-partitioned systems (HBase, Bigtable, Spanner, CockroachDB) skip hashing to keep keys ordered for scans.</p>`,
    clues: [
      '"design a distributed key-value store" / "design Dynamo / Cassandra" → ring + vnodes + replication + quorums',
      '"design a CDN" or "cache cluster inside a data center" → consistent hash on URL/key to maximise cache hit rate',
      '"design a chat / gaming / collaboration server where all users of a room must land on the same host" → consistent hash on room ID',
      '"L4 load balancer at millions of packets per second" → Maglev-style table',
      '"we need range scans" → careful! hashing destroys order → range partitioning instead'
    ],
    code: [{
      lang: 'text', title: 'Config snippets you may be asked about', code: `# Cassandra (cassandra.yaml) - vnodes and the token allocator
num_tokens: 16
allocate_tokens_for_local_replication_factor: 3
partitioner: org.apache.cassandra.dht.Murmur3Partitioner

# CQL - replicas per data center, rack-aware
CREATE KEYSPACE shop WITH replication =
  {'class': 'NetworkTopologyStrategy', 'us-east': 3, 'eu-west': 3};

# Nginx - consistent hashing of the request URI to cache servers (ketama)
upstream cache_tier {
    hash $request_uri consistent;
    server cache1:8080;
    server cache2:8080 weight=2;
}

# HAProxy - consistent hashing with bounded load (no server above 125% of average)
backend video_cache
    balance uri
    hash-type consistent
    hash-balance-factor 125

# Envoy cluster - ring hash or maglev load balancing
lb_policy: RING_HASH        # or MAGLEV
ring_hash_lb_config: { minimum_ring_size: 1024 }`
    }],
    codeTitle: ['Real configuration'],
    viz: [{
      title: 'Cassandra write path on the ring',
      input: 'user42',
      inputLabel: 'partition key',
      gen: function (input) {
        var key = String(input || '').trim();
        if (!key || key.length > 30) throw new Error('Enter a partition key (1-30 characters), e.g. user42');
        var nodesOrder = ['N1', 'N2', 'N3', 'N4', 'N5', 'N6'];
        var start = h32(key) % 6, reps = [nodesOrder[start], nodesOrder[(start + 1) % 6], nodesOrder[(start + 2) % 6]];
        var coord = nodesOrder[(start + 3) % 6];
        var token = (h32(key) % 2000) - 1000;
        var pos = {};
        nodesOrder.forEach(function (n, i) { var q = ringXY(i * 60 + 30, 30); pos[n] = q; });
        function nodes() {
          var a = [{ id: 'C', label: 'Client', x: 8, y: 50, shape: 'box' }];
          nodesOrder.forEach(function (n) { a.push({ id: n, label: n, x: pos[n].x + 12, y: pos[n].y }); });
          return a;
        }
        var ring = nodesOrder.map(function (n, i) { return [n, nodesOrder[(i + 1) % 6]]; });
        var tags = {}; nodesOrder.forEach(function (n, i) { tags[n] = 'range ' + (i + 1); });
        function G(hl, extra, ehl, tg) { return { type: 'graph', directed: true, height: 100, nodes: nodes(), edges: ring.concat(extra), hl: hl, ehl: ehl || {}, tags: tg || tags }; }
        var f = [];
        var h0 = {}; h0.C = 'cur'; h0[coord] = 'sel';
        var e0 = {}; e0['C-' + coord] = 'ok';
        f.push({ narr: 'The client (driver) sends <code>INSERT … user_id = \'' + H.esc(key) + '\'</code> to <b>' + coord + '</b>. Any node can act as <b>coordinator</b> — there is no master. (Token-aware drivers would pick a replica directly to save a hop.)', parts: [G(h0, [['C', coord, 'write']], e0)] });
        var h1 = {}; h1[coord] = 'sel'; h1[reps[0]] = 'cur';
        var t1 = copyObj(tags); t1[reps[0]] = 'token ' + token + ' here';
        f.push({ narr: 'Coordinator computes <code>token = Murmur3("' + H.esc(key) + '")</code> → (toy) <b>' + token + '</b>, which falls in the range owned by <b>' + reps[0] + '</b>.', parts: [G(h1, [['C', coord]], {}, t1), { type: 'vars', label: 'partitioner', vals: { key: key, token: token, 'primary range owner': reps[0] } }] });
        var h2 = {}; h2[coord] = 'sel'; reps.forEach(function (r) { h2[r] = 'ok'; });
        f.push({ narr: 'Replication factor 3: walk clockwise for 3 distinct nodes → replicas <b>' + reps.join(', ') + '</b> (rack-aware in real life via NetworkTopologyStrategy).', parts: [G(h2, [['C', coord]], {}), { type: 'array', label: 'replicas for this token', values: reps.slice(), hl: { 0: 'ok', 1: 'ok', 2: 'ok' } }] });
        var e3 = {}; var ex3 = [['C', coord]]; reps.forEach(function (r) { if (r !== coord) { ex3.push([coord, r, 'mutation']); e3[coord + '-' + r] = 'win'; } });
        f.push({ narr: 'The coordinator sends the mutation to <b>all 3</b> replicas in parallel (each appends to its commit log and memtable).', parts: [G(h2, ex3, e3)] });
        var h4 = copyObj(h2); h4[reps[2]] = 'bad';
        var e4 = copyObj(e3); reps.slice(0, 2).forEach(function (r) { if (r !== coord) e4[coord + '-' + r] = 'ok'; }); if (reps[2] !== coord) e4[coord + '-' + reps[2]] = 'bad';
        var t4 = copyObj(tags); t4[reps[2]] = 'DOWN'; t4[coord] = 'hint for ' + reps[2];
        f.push({ narr: reps[0] + ' and ' + reps[1] + ' ack. <b>' + reps[2] + ' is down</b>, so the coordinator stores a <b>hint</b> for it (replayed when it returns, within max_hint_window ≈ 3 h).', parts: [G(h4, ex3, e4, t4), { type: 'vars', label: 'consistency', vals: { level: 'QUORUM', needed: 2, acks: 2 }, hl: { acks: 'ok' } }] });
        var e5 = copyObj(e4); e5['C-' + coord] = 'ok';
        f.push({ narr: '2 acks ≥ QUORUM (2 of 3) → coordinator replies <b>success</b> to the client. A later <code>nodetool repair</code> (Merkle trees) or read repair fixes any leftover gaps.', parts: [G(h4, ex3, e5, t4), { type: 'text', html: 'Write latency ≈ the <b>2nd fastest</b> replica, not the slowest.' }] });
        return f;
      }
    }, {
      title: 'CDN PoP: consistent hashing on the URL',
      input: '/img/cat.jpg /img/dog.png /css/home.css /js/app.js /img/cat.jpg',
      inputLabel: 'requested URLs (repeat one to see a cache hit)',
      gen: function (input) {
        var urls = words(input);
        if (!urls.length || urls.length > 8) throw new Error('Enter 1-8 URLs separated by spaces');
        var caches = [{ name: 'cache1', pos: 40 }, { name: 'cache2', pos: 130 }, { name: 'cache3', pos: 220 }, { name: 'cache4', pos: 310 }];
        var nodes = [{ id: 'U', label: 'User', x: 8, y: 25, shape: 'box' }, { id: 'LB', label: 'PoP LB (L4)', x: 32, y: 25, shape: 'box' },
          { id: 'cache1', label: 'cache1', x: 62, y: 6, shape: 'box' }, { id: 'cache2', label: 'cache2', x: 62, y: 19, shape: 'box' },
          { id: 'cache3', label: 'cache3', x: 62, y: 32, shape: 'box' }, { id: 'cache4', label: 'cache4', x: 62, y: 45, shape: 'box' },
          { id: 'O', label: 'Origin', x: 90, y: 25, shape: 'box' }];
        var baseE = [['U', 'LB'], ['LB', 'cache1'], ['LB', 'cache2'], ['LB', 'cache3'], ['LB', 'cache4'], ['cache1', 'O'], ['cache2', 'O'], ['cache3', 'O'], ['cache4', 'O']];
        var stored = {}, frames = [], hits = 0;
        frames.push({ narr: 'A CDN point of presence (PoP) with 4 cache servers. The balancer hashes each <b>URL</b> onto a ring of caches (cache1@40°, cache2@130°, cache3@220°, cache4@310°), so each object lives on exactly one server and the PoP\'s combined RAM behaves like one giant cache.', parts: [
          { type: 'graph', directed: true, height: 52, nodes: nodes, edges: baseE },
          { type: 'map', label: 'what each cache holds', entries: caches.map(function (c) { return [c.name, '—']; }) }
        ] });
        urls.forEach(function (u) {
          var p = deg(u), c = ownerOf(caches, p).name, hit = !!(stored[c] && stored[c].indexOf(u) >= 0);
          if (hit) hits++; else (stored[c] = stored[c] || []).push(u);
          var hl = { U: 'cur', LB: 'cur' }; hl[c] = hit ? 'ok' : 'cur'; if (!hit) hl.O = 'bad';
          var eh = { 'U-LB': 'win' }; eh['LB-' + c] = 'ok'; if (!hit) eh[c + '-O'] = 'bad';
          var tags = {}; tags[c] = hit ? 'HIT' : 'MISS → fetch';
          var mh = {}; mh[c] = hit ? 'ok' : 'cur';
          frames.push({ narr: '<b>' + H.esc(u) + '</b> hashes to ' + p + '° → first cache clockwise is <b>' + c + '</b>. ' + (hit ? '<span class="c-g">Cache HIT</span> — served from RAM, origin untouched.' : '<span class="c-r">MISS</span> — ' + c + ' fetches from origin once and keeps it; every later request for this URL in this PoP lands on ' + c + ' again.'), parts: [
            { type: 'graph', directed: true, height: 52, nodes: nodes, edges: baseE, hl: hl, ehl: eh, tags: tags },
            { type: 'map', label: 'what each cache holds', entries: caches.map(function (cc) { return [cc.name, (stored[cc.name] || []).join(', ') || '—']; }), hl: mh }
          ] });
        });
        frames.push({ narr: 'If cache3 crashed, only URLs on cache3 would miss (they now map to cache4); all other objects stay cached. With random or round-robin routing, every server would have to cache every popular object, and hit rate would collapse as the PoP grows.', parts: [
          { type: 'vars', label: 'summary', vals: { requests: urls.length, hits: hits, 'origin fetches': urls.length - hits }, hl: { hits: 'ok' } },
          { type: 'table', columns: ['routing inside PoP', 'distinct objects cached', 'hit rate'], rows: [['round robin', '≈ RAM of ONE server', 'low'], ['consistent hash on URL', '≈ RAM of ALL servers', 'high']], hl: { 1: 'ok' } }
        ] });
        return frames;
      }
    }],
    examples: [
      { title: 'Sizing a Cassandra ring', html: `<p>30 TB of data, RF = 3 → 90 TB stored. Nodes with 4 TB disks kept ≤ 50% full (compaction headroom) → 2 TB each → <b>45 nodes</b>, spread over 3 racks/AZs of 15. Adding one node moves ≈ 1/46 of the data (~2 TB of replicas) — streamed from many nodes in parallel thanks to vnodes.</p>` },
      { title: 'Chat rooms on a hash ring (Discord-style)', html: `<p>All members of one guild/room must reach the same process so it can fan out messages in memory. Gateways hash <code>guild_id</code> on a ring of session servers. When a host is added, only ≈ 1/N of guilds migrate (their in-memory state is rebuilt on the new host); the rest keep running undisturbed.</p>` },
      { title: 'Redis Cluster: fixed slots instead of a ring', html: `<p><code>slot = CRC16("user:{42}:cart") % 16384</code> — only the part in braces (the <b>hash tag</b> "42") is hashed, so all of user 42's keys share a slot and multi-key operations work. Adding a node = moving some slots to it, one slot at a time; clients that hit the old node get <code>MOVED 3999 10.0.0.7:6379</code> and update their slot map.</p>` },
      { title: 'Sticky sessions without sticky state (L7 LB)', html: `<p>A WebSocket service keeps per-user state in memory. Envoy's <code>RING_HASH</code> policy hashes the <code>x-user-id</code> header, so reconnects land on the same pod. Scaling from 20 to 21 pods only re-homes ≈ 5% of users (who reconnect and reload state) instead of ≈ 95% with modulo.</p>` }
    ],
    deepDive: `<p><b>Dynamo's lessons (2007).</b> Random tokens caused slow bootstrap and messy Merkle-tree rebuilding, so Amazon moved to <b>fixed, equal-sized partitions</b> assigned to nodes — key → partition never changes; partition → node changes. This split is now the norm: Riak, Couchbase vBuckets, Redis slots, Elasticsearch shards, ScyllaDB tablets, CockroachDB ranges (range-based, split on size).</p>
      <p><b>Cassandra ops reality.</b> Bootstrapping a node streams its token ranges from current replicas while writes go to both old and pending owners. <code>nodetool cleanup</code> afterwards deletes data a node no longer owns. Removing a node uses <code>decommission</code> (graceful, streams its data away) or <code>removenode</code> (dead node, re-replicate from survivors). Repair compares Merkle trees per range — fewer, larger ranges make repair cheaper, one reason for the switch from 256 to 16 tokens.</p>
      <p><b>CDN specifics.</b> CDNs layer schemes: anycast/DNS picks a PoP; an L4 tier (Maglev-like ECMP + consistent hashing) spreads connections across machines; an L7 tier consistently hashes the cache key to a cache server; a parent/shield tier consistently hashes again across regional caches before going to origin. Hot objects are replicated to k servers or served from a small per-front-end "hot cache". Akamai's 1997–1999 work (Karger, Leighton, Lewin et al.) introduced consistent hashing precisely to make "which cache has this URL?" answerable by any client with no global directory.</p>
      <p><b>Hot keys remain your problem.</b> Consistent hashing balances <i>keys</i>, not <i>traffic</i>. A celebrity's profile or a viral video is one key on one server. Fixes: key salting/splitting (<code>key#0..key#9</code> and fan-in reads), replicate hot keys to more nodes, local caches, request coalescing, bounded-load hashing.</p>`,
    aiEra: `<p><b>What AI changes:</b> you can ask an assistant to recite how Cassandra or Dynamo work, and it will usually be close — but it blends eras (2007 Dynamo vs today's DynamoDB, 256 vs 16 Cassandra tokens) and products (Redis slots called "a ring"). Your edge is being precise about <b>which</b> system does <b>what</b>, and why.</p>
      <p><b>Use AI as a partner:</b> paste a cluster's <code>nodetool status</code> or ring dump and ask it to compute ownership skew and which ranges a new node would take; then verify the numbers yourself with the ring math from this module.</p>
      <p><b>Where AI goes wrong:</b> recommending consistent hashing for data that needs range scans, ignoring hot keys, or forgetting that membership agreement (gossip/etcd) is the real hard part.</p>
      <p><b>AI-era systems:</b> LLM serving stacks route requests by prompt-prefix hash so shared system prompts reuse GPU KV caches (prefix-cache-aware routers in projects like SGLang and llm-d); vector databases shard embeddings by hashed IDs across nodes; embedding/feature caches sit behind ketama-style clients. Same ideas, new workloads — and you still have to decide what to hash and how to handle hot prefixes.</p>`,
    problems: [{
      title: 'Design the Partitioning Layer of a Dynamo-Style KV Store',
      level: 'Hard', tags: ['key-value store', 'consistent hashing', 'replication', 'quorum'], companies: ['Amazon', 'Apple', 'Uber', 'Meta'],
      statement: `<p>Design how a key-value store with 200 nodes across 3 AZs decides where each key lives and how it stays available: 50 TB of data, 300k writes/s, 1M reads/s, p99 &lt; 10 ms, must stay writable if a node or an entire AZ fails, and must let you add 20 nodes without downtime.</p>`,
      constraints: `<p>Keys are opaque strings (no range scans needed). Eventual consistency with tunable reads is acceptable.</p>`,
      example: `<p>put("cart:42", …) → token = Murmur3("cart:42") → replicas = first 3 distinct nodes clockwise, one per AZ → ack after ${H.c('g', 'W = 2')}; get with ${H.c('b', 'R = 2')} → R + W = 4 &gt; N = 3.</p>`,
      brute: { why: `<p>Naive design: a central metadata server that maps every key to a node, or <code>hash(key) % 200</code>. The metadata server is a bottleneck and single point of failure at 1.3M ops/s; modulo moves ~91% of 50 TB when adding 20 nodes (200 → 220: 200/220 of keys move) — weeks of streaming while serving traffic.</p>` },
      mcq: { q: 'Adding 20 nodes to 200 with consistent hashing moves roughly what fraction of data?', options: ['≈ 9% (20/220)', '≈ 50%', '≈ 91%', 'none'], answer: 0, explain: 'New nodes take their fair share: 20/220 ≈ 9.1% of key ranges move, all to the new nodes.' },
      hints: [`<p>Partitioning: ring + vnodes (or fixed partitions). Think about how many tokens per node and why.</p>`, `<p>Replication: N = 3, one replica per AZ, preference list of distinct nodes; W/R quorums; what happens when a replica is down?</p>`, `<p>Membership and repair: gossip or a coordination service; hinted handoff; Merkle-tree anti-entropy; streaming new nodes with pending ranges.</p>`],
      solution: {
        approach: `<p><b>1. Partitioning.</b> Murmur3 64-bit token space; each node gets ~16–32 vnodes placed by a load-aware allocator (or the ring is split into, say, 4,096 fixed equal partitions assigned to nodes). Every node and smart client holds the token map (a few hundred KB) and routes directly — no central lookup on the hot path.</p>
          <p><b>2. Replication.</b> N = 3, rack/AZ-aware: walk clockwise, choose distinct nodes, one per AZ. Each node stores ≈ 3/200 of data ≈ 750 GB.</p>
          <p><b>3. Reads/writes.</b> Any node can coordinate; token-aware clients send directly to a replica. Default W = 2, R = 2 (R+W&gt;N); latency-sensitive reads may use R = 1 with read repair. Use LOCAL quorums if we later go multi-region.</p>
          <p><b>4. Failures.</b> Gossip-based failure detection (phi-accrual). Down replica → coordinator keeps hints (bounded window, e.g. 3 h) and replays them; sloppy quorum if "always writable" is required. AZ loss → each key still has 2 replicas → W=2/R=2 still satisfiable. Anti-entropy repair with Merkle trees per range runs continuously; tombstones kept longer than the repair interval.</p>
          <p><b>5. Scaling out by 20 nodes.</b> Add nodes one at a time (or in an AZ-balanced batch). Each new node claims tokens, enters "joining" state: its ranges become <i>pending</i>, writes go to old + pending replicas, data streams in parallel from many nodes (vnodes) with throttling. ≈ 1/(N+1) of data moves per node; then old owners run cleanup. Total ≈ 9% of data moved.</p>
          <p><b>6. Hot keys and conflicts.</b> Per-key rate monitoring; hot keys get extra read replicas or client caching. Conflicts: last-write-wins timestamps (simple) or vector clocks/CRDTs where merges matter (carts).</p>`,
        complexity: `<p>Routing O(log T) locally; write cost N replica writes; movement per added node ≈ 1/(nodes+1) of data; storage = N × data.</p>`,
        followUps: ['How do you prevent two nodes from claiming the same token during concurrent joins?', 'How would you add range-scan support without breaking even distribution?', 'What changes if you need strongly consistent (linearizable) writes?']
      }
    }]
  });

  /* =====================================================================
     PRACTICE (Easy → Medium → Hard)
     ===================================================================== */
  practice.push({
    title: 'Modulo Churn: 10 → 11 Shards', level: 'Easy', tags: ['modulo hashing', 'estimation'], companies: ['Amazon', 'Shopify'],
    statement: `<p>A user database is sharded with <code>shard = hash(user_id) % 10</code>, 2 TB per shard. You add an 11th shard. How much data must move? How would the number change with consistent hashing?</p>`,
    constraints: `<p>Uniform hash; equal shard sizes; 20 TB total.</p>`,
    example: `<p>h = 37: 37 % 10 = ${H.c('y', '7')}, 37 % 11 = ${H.c('r', '4')} → moves. h = 5: 5 % 10 = 5 % 11 = 5 → ${H.c('g', 'stays')}.</p>`,
    brute: { why: `<p>Naive plan: "copy everything to the new layout during a maintenance window". With modulo that is 10/11 ≈ 91% of 20 TB ≈ 18 TB — hours to days of downtime or a very risky live migration.</p>` },
    mcq: { q: 'With modulo, what fraction of keys moves when going from 10 to 11 shards?', options: ['10/11 ≈ 91%', '1/11 ≈ 9%', '50%', '1/10 = 10%'], answer: 0, explain: 'Only 1/(N+1) of keys keep their shard, so N/(N+1) = 10/11 move.' },
    hints: [`<p>Count, in one block of 10 × 11 = 110 hash values, how many give the same answer mod 10 and mod 11.</p>`, `<p>Only h = 0…9 in each block agree (both equal h). That is 10/110.</p>`, `<p>With consistent hashing the new shard takes only its fair share: 1/11 of the data, from the existing shards.</p>`],
    solution: {
      approach: `<p><b>Modulo:</b> a key stays only if h % 10 == h % 11, which holds for 10 of every 110 hash values → 1/11 stays, <b>10/11 ≈ 91% moves ≈ 18.2 TB</b>. Worse, it moves between <i>old</i> shards too, so every shard is both sending and receiving.</p>
        <p><b>Consistent hashing:</b> the new shard takes ≈ 1/11 of the key space ≈ <b>1.8 TB</b>, and keys only move <i>to</i> the new shard (monotonicity). With vnodes, that 1.8 TB comes from all 10 shards in parallel (~180 GB each), which can be streamed in about an hour at modest throttled rates, while serving traffic.</p>
        <p><b>Alternative:</b> pre-split into many logical shards (e.g. 1,024) mapped to physical servers via a table; adding a server moves ~1/11 of the logical shards — same minimal movement, simpler bookkeeping.</p>`,
      complexity: `<p>Data moved: modulo N/(N+1) · D; consistent hashing D/(N+1).</p>`,
      followUps: ['What if you doubled to 20 shards with modulo?', 'How do you keep serving reads during the move?']
    }
  });
  practice.push({
    title: 'Find the Owner on the Ring', level: 'Easy', tags: ['hash ring', 'lookup'], companies: ['Google', 'Meta'],
    statement: `<p>Ring 0–999. Tokens: P@120, Q@400, R@610, S@880. Find the owner of keys at positions 5, 120, 121, 700, 950 and explain the wraparound rule. Then implement the lookup.</p>`,
    constraints: `<p>Owner = first token ≥ key position; wrap to the smallest token if none.</p>`,
    example: `<p>key@700 → first token ≥ 700 is ${H.c('b', 'S@880')}. key@950 → none ≥ 950 → ${H.c('y', 'wrap')} → P@120.</p>`,
    brute: { why: `<p>Naive approach: scan all tokens and compute the clockwise distance from the key to each, picking the minimum. Correct but O(T) per lookup; with 100k tokens and 1M lookups/s that is 10<sup>11</sup> operations/s. Sort the tokens once and binary search.</p>`, code: { lang: 'java', code: `static String ownerLinear(long[] tokens, String[] owners, long key, long ringSize) {
    long best = Long.MAX_VALUE; String who = null;
    for (int i = 0; i < tokens.length; i++) {
        long dist = Math.floorMod(tokens[i] - key, ringSize);   // clockwise distance
        if (dist < best) { best = dist; who = owners[i]; }
    }
    return who;
}` } },
    mcq: { q: 'Key at exactly position 120, token P is at 120. Owner?', options: ['P', 'Q', 'S', 'Undefined'], answer: 0, explain: 'Ownership is the first token at or after the key (≥), so a key exactly on a token belongs to that token — use ceilingEntry, not higherEntry.' },
    hints: [`<p>Sort tokens: 120, 400, 610, 880. Arcs: P (880, 999] ∪ [0, 120], Q (120, 400], R (400, 610], S (610, 880].</p>`, `<p>Binary search for the first token ≥ key; if the index equals the array length, use index 0.</p>`, `<p>In Java, <code>TreeMap.ceilingEntry(k)</code> returns null past the end → fall back to <code>firstEntry()</code>.</p>`],
    solution: {
      approach: `<p>5 → P (120). 120 → P (equal counts). 121 → Q (400). 700 → S (880). 950 → no token ≥ 950 → wrap → P. Store tokens in a sorted array; binary search the insertion point of the key; index n wraps to 0.</p>`,
      code: { lang: 'java', code: `static String owner(long[] sortedTokens, String[] owners, long key) {
    int i = Arrays.binarySearch(sortedTokens, key);
    if (i < 0) i = -i - 1;                  // insertion point = first token > key
    if (i == sortedTokens.length) i = 0;    // wrap around the ring
    return owners[i];
}` },
      alt: [{ lang: 'python', code: `import bisect

def owner(sorted_tokens, owners, key):
    i = bisect.bisect_left(sorted_tokens, key)   # first token >= key
    return owners[i % len(sorted_tokens)]        # wrap around

print(owner([120, 400, 610, 880], ["P", "Q", "R", "S"], 950))   # P` }],
      complexity: `<p>O(log T) per lookup after an O(T log T) sort.</p>`,
      followUps: ['How would you update the array safely while other threads read it?']
    }
  });
  practice.push({
    title: 'A Node Leaves: Where Do Its Keys Go?', level: 'Easy', tags: ['hash ring', 'failure'], companies: ['Microsoft', 'Netflix'],
    statement: `<p>A cache ring has 5 nodes with one token each: A@10, B@90, C@170, D@250, E@330 (ring 0–359). Node C crashes. Which arc changes owner, who inherits it, and what % of keys move? Repeat for a ring where each node has 100 vnodes.</p>`,
    constraints: `<p>Uniform keys, ring 0–359.</p>`,
    example: `<p>C owned ${H.c('y', '(90, 170]')} → after the crash those keys walk past 170 to ${H.c('b', 'D@250')}.</p>`,
    brute: { why: `<p>Naive expectation: "every node takes a little of C's load". With one token per node that is false — the single successor D inherits everything and jumps from 22% to 44% of keys, which can overload it and trigger a cascade.</p>` },
    mcq: { q: 'With one token per node, who gets a failed node\'s keys?', options: ['Only its clockwise successor', 'All nodes equally', 'Its counter-clockwise predecessor', 'Nobody — the keys are lost'], answer: 0, explain: 'Keys in the failed node\'s arc keep walking clockwise to the next token, which belongs to the successor.' },
    hints: [`<p>Write each node's arc: it ends at its own token and starts after the previous one.</p>`, `<p>Only C's arc (80° of 360°) moves; all of it goes to D.</p>`, `<p>With vnodes, C's 100 small arcs have ~100 different successors spread over A, B, D, E.</p>`],
    solution: {
      approach: `<p><b>One token each:</b> C owned (90, 170] = 80° ≈ <b>22% of keys</b>. After the crash those keys walk to D@250. Only 22% of keys move (vs 80% with modulo going 5 → 4), but <b>D's load doubles</b> (from 80° to 160°) — a hot spot exactly when the cluster is weakened.</p>
        <p><b>100 vnodes each:</b> C still owned ≈ 20% of keys, spread over 100 small arcs. Each arc's successor is a random other node, so A, B, D, E each inherit ≈ 5% — load goes from 20% to ≈ 25% each, evenly. Same total movement, no hot spot. This is the main operational reason for vnodes.</p>`,
      complexity: `<p>Moved fraction = the failed node's share (≈ 1/N). Recomputing ownership: O(log T) per key; only keys in affected arcs need attention.</p>`,
      followUps: ['For a cache, what extra load does the database see during this event?']
    }
  });
  practice.push({
    title: 'Consistent Hashing vs Hot Keys', level: 'Easy', tags: ['hot keys', 'cache'], companies: ['Twitter/X', 'Instagram'],
    statement: `<p>Your 30-node cache uses consistent hashing with 200 vnodes per node, and key ranges are almost perfectly balanced. Yet one node runs at 95% CPU while others sit at 20%. The hot node serves the key <code>profile:celebrity_123</code> at 400k reads/s. Explain why consistent hashing did not prevent this and propose fixes.</p>`,
    constraints: `<p>Read-heavy key, value 2 KB, updated a few times per hour.</p>`,
    example: `<p>${H.c('g', 'Key distribution balanced')} ≠ ${H.c('r', 'traffic balanced')}: one key, one owner, 400k req/s.</p>`,
    brute: { why: `<p>Naive fix: "add more vnodes" or "add more nodes". The hot key still hashes to exactly one position, so it still lives on one node — adding capacity elsewhere changes nothing for this key.</p>` },
    mcq: { q: 'Which change actually spreads the load of a single hot key?', options: ['Replicate it to several nodes / split it into sub-keys and read from any copy', 'Increase vnodes from 200 to 1000', 'Switch from MD5 to Murmur3', 'Use rendezvous instead of a ring'], answer: 0, explain: 'Any key → one owner scheme sends a single key to one node; you must create multiple copies or cache it closer to clients.' },
    hints: [`<p>Consistent hashing balances the number of keys per node, not requests per key.</p>`, `<p>Ideas: copies of the key on k nodes (key#0..key#k−1), client-side local cache with short TTL, request coalescing.</p>`, `<p>Detect hot keys automatically (sampling, count-min sketch) and only apply the fix to them.</p>`],
    solution: {
      approach: `<p><b>Why:</b> hashing maps each key to one node. Balance is over <i>keys</i> (or key ranges), so a single key receiving 400k req/s concentrates all that load on its owner no matter how many vnodes exist.</p>
        <p><b>Fixes (combine):</b> (1) <b>Key splitting / replication</b>: store copies under <code>profile:celebrity_123#0..#9</code> (10 different ring positions → ~10 nodes); readers pick a random suffix; writers update all copies (rare writes, so cheap). (2) <b>Local in-process cache</b> on API servers with a 1–5 s TTL — absorbs most reads before they touch the cache tier. (3) <b>Hot-key detection</b>: sample requests or use a count-min sketch to find keys above a threshold and apply (1)/(2) only to them. (4) <b>Request coalescing</b> so concurrent misses trigger one backend fetch. (5) Bounded-load hashing helps with hot <i>ranges</i>, not a single key.</p>`,
      complexity: `<p>Splitting into k copies cuts per-node load by ~k at the cost of k× write amplification for that key.</p>`,
      followUps: ['How do you keep the 10 copies consistent after an update?']
    }
  });
  practice.push({
    title: 'From Which Nodes Does a Joining Node Pull Data?', level: 'Medium', tags: ['vnodes', 'bootstrap', 'replication'], companies: ['Datastax', 'Apple'],
    statement: `<p>A Cassandra-like cluster has 12 nodes, 16 vnodes each, RF = 3, 36 TB stored in total (12 TB unique). A 13th node joins. Estimate how much data it receives, from how many nodes, and how long streaming takes at 100 MB/s per source stream with up to 8 parallel sources. Contrast with 1 token per node.</p>`,
    constraints: `<p>Even balance after the join; network not the bottleneck beyond the per-stream limit.</p>`,
    example: `<p>After the join each node holds 36 TB / 13 ≈ ${H.c('b', '2.77 TB')} — that is what the new node must receive.</p>`,
    brute: { why: `<p>Naive design: one token per node. The new node takes ranges from only its immediate neighbours (≈ 3 nodes with RF 3), so ~2.77 TB comes from 3 streams → 2.77 TB / 300 MB/s ≈ 2.6 h, and those 3 nodes are overloaded while streaming; the resulting balance is also random.</p>` },
    mcq: { q: 'Why do vnodes speed up bootstrapping a new node?', options: ['Its many tokens are scattered, so it can stream from many existing nodes in parallel', 'Vnodes compress data', 'Vnodes avoid replication', 'Vnodes make the ring smaller'], answer: 0, explain: 'Each of the new node\'s tokens takes a slice from a different predecessor arc, so many sources share the work.' },
    hints: [`<p>Total stored / new node count = what each node should hold afterwards.</p>`, `<p>16 new tokens × RF 3 → up to 48 (range, replica) handoffs spread over most of the 12 nodes.</p>`, `<p>Time = data / (streams × per-stream rate). Compare 8 sources vs 3.</p>`],
    solution: {
      approach: `<p><b>Amount:</b> 36 TB / 13 ≈ <b>2.77 TB</b> lands on the new node (it becomes replica for ≈ 3/13 of the token space).</p>
        <p><b>Sources:</b> 16 new tokens each split an existing arc; for each, the new node becomes one of 3 replicas for the affected ranges, so data comes from the replicas currently holding those ranges — with 16 scattered tokens that touches almost all 12 nodes. Streaming 8 sources in parallel at 100 MB/s: 2.77 TB / 800 MB/s ≈ <b>58 min</b>.</p>
        <p><b>Single token:</b> only ≈ 3 nodes can provide the data → ≈ 2.6 h, with those 3 nodes hot, and the new node's share depends on where its single token lands (could be 2× or 0.3× fair).</p>
        <p><b>Ops:</b> writes go to old and pending replicas during streaming; after the join, run cleanup on old owners to delete ranges they no longer own; throttle streaming to protect p99 latency.</p>`,
      complexity: `<p>Moved data ≈ total stored / (N+1); time ≈ moved / (parallel streams × throughput).</p>`,
      followUps: ['What happens if the joining node crashes halfway?', 'How does Cassandra\'s token allocator choose the 16 tokens?']
    }
  });
  practice.push({
    title: 'Weighted Consistent Hashing for Mixed Hardware', level: 'Medium', tags: ['weights', 'vnodes', 'rendezvous'], companies: ['Cloudflare', 'Akamai'],
    statement: `<p>A cache tier has 6 servers with 64 GB RAM and 2 servers with 256 GB. Design the hashing so each server's RAM is equally utilised, using (a) a ring with vnodes and (b) rendezvous hashing. Show the expected share per server.</p>`,
    constraints: `<p>Total RAM = 6·64 + 2·256 = 896 GB.</p>`,
    example: `<p>A 256 GB server should own 256/896 ≈ ${H.c('b', '28.6%')} of keys; a 64 GB server ≈ ${H.c('b', '7.1%')}.</p>`,
    brute: { why: `<p>Naive design: equal weights. Each server gets 12.5%: the 64 GB servers need 112 GB-worth of hot data and evict constantly, while the 256 GB servers use under half their RAM. Effective cache = 8 × 64 GB = 512 GB, not 896 GB.</p>` },
    mcq: { q: 'For weighted rendezvous hashing, which score gives shares proportional to weight w?', options: ['w / −ln(u) with u = hash scaled into (0,1)', 'w × hash', 'hash ^ w', 'hash / w'], answer: 0, explain: 'The w / −ln(u) form makes the maximum fall on each server with probability w / Σw; naive multiplication does not.' },
    hints: [`<p>Weights proportional to RAM: 1 for 64 GB, 4 for 256 GB.</p>`, `<p>Ring: vnodes = base × weight, e.g. 100 and 400.</p>`, `<p>HRW: score = w / −ln(u). Verify both by simulation.</p>`],
    solution: {
      approach: `<p><b>Weights</b> ∝ RAM: 64 GB → 1, 256 GB → 4; Σw = 6 + 8 = 14. Shares: small = 1/14 ≈ 7.1%, big = 4/14 ≈ 28.6%.</p>
        <p><b>(a) Ring:</b> 100 vnodes per weight unit → 100 for small, 400 for big; 1,400 tokens total. Spread per small server ≈ 1/√100 = 10% relative; bump to 200/800 if tighter balance is needed.</p>
        <p><b>(b) Rendezvous:</b> score(s, k) = w<sub>s</sub> / −ln(u(s, k)); pick max. Exactly proportional in expectation with no tuning; lookup scores 8 servers — trivial.</p>
        <p><b>Both:</b> changing a weight moves only the keys between that server and others (e.g. raising a new server from weight 0.25 to 1 over 30 min = gradual warm-up). Verify with a 1M-key simulation and monitor per-server memory and hit rates.</p>`,
      complexity: `<p>Ring O(log Σv) lookup, HRW O(N); both move ≈ the weight delta's share of keys.</p>`,
      followUps: ['What if a server\'s CPU, not RAM, is the bottleneck?']
    }
  });
  practice.push({
    title: 'Sticky WebSocket Routing that Survives Autoscaling', level: 'Medium', tags: ['load balancing', 'ring hash', 'maglev'], companies: ['Slack', 'Discord', 'Zoom'],
    statement: `<p>A real-time collaboration service keeps each document's live state in memory on one pod. All editors of a document must connect to the same pod. Pods autoscale between 20 and 60. Design the routing at the load balancer.</p>`,
    constraints: `<p>Up to 2M concurrent connections; reconnect storms must be limited when scaling.</p>`,
    example: `<p>doc_id "d-981" → ring → ${H.c('b', 'pod-17')}. Scale 40 → 41 pods: only ≈ ${H.c('g', '2.4%')} of documents move.</p>`,
    brute: { why: `<p>Naive designs: round robin (editors of one document scatter across pods — no shared in-memory state) or <code>pods[hash(doc) % N]</code> (scaling 40 → 41 re-homes ~98% of documents, triggering a reconnect storm and state reloads for nearly everyone).</p>` },
    mcq: { q: 'Which hashing key should the L7 balancer use?', options: ['The document ID', 'The client IP', 'A random number per connection', 'The pod name'], answer: 0, explain: 'The grouping requirement is per document, so all connections for one document must hash the same value.' },
    hints: [`<p>Pass the document ID in the URL path or a header so the L7 LB can hash it.</p>`, `<p>Use the LB's consistent-hash policy (Envoy RING_HASH or MAGLEV) with the header as the hash key.</p>`, `<p>On scale events, moved documents must hand over state: drain, persist snapshot, reconnect.</p>`],
    solution: {
      approach: `<p><b>Routing:</b> clients connect to <code>/ws/doc/{doc_id}</code>; Envoy (or another L7 proxy) uses <code>RING_HASH</code> or <code>MAGLEV</code> with <code>hash_policy</code> on the doc ID header/path. All editors of a document land on one pod.</p>
        <p><b>Scaling:</b> adding one pod to 40 re-homes ≈ 1/41 ≈ 2.4% of documents. Those pods send a "please reconnect" message to affected clients after persisting a snapshot; the new owner loads it. Scale gradually (one or a few pods at a time) to keep reconnects smooth.</p>
        <p><b>Consistency of membership:</b> all proxies get pod lists from the same service discovery (Kubernetes EndpointSlices via xDS). During brief disagreement two pods might both host a document → guard with a per-document lease/lock in Redis/etcd so only the lease holder accepts edits; the other redirects.</p>
        <p><b>Hot documents:</b> bounded-load hashing (or a per-document fan-out tier) prevents one viral document from overloading its pod.</p>`,
      complexity: `<p>Lookup O(1) (Maglev) or O(log) (ring); per scale event ≈ 1/N of documents move.</p>`,
      followUps: ['How do you drain a pod for deployment without dropping edits?']
    }
  });
  practice.push({
    title: 'Membership Disagreement Between Clients', level: 'Medium', tags: ['membership', 'gossip', 'consistency'], companies: ['LinkedIn', 'Uber'],
    statement: `<p>300 app servers each keep their own copy of a cache ring built from a member list in etcd. During a deploy, half the app servers see 40 cache nodes and half see 41 for ~5 seconds. What can go wrong, and how do you make the system tolerate it?</p>`,
    constraints: `<p>Cache-aside pattern on top of a SQL database; stale reads tolerated for a few seconds only.</p>`,
    example: `<p>Key k → ${H.c('y', 'node-12')} on old ring, ${H.c('b', 'node-41')} on new ring. Writer invalidates on node-41; reader on old ring reads stale value from node-12.</p>`,
    brute: { why: `<p>Naive assumption: "all clients always see the same ring". Ignoring the transition window gives stale reads (invalidations sent to the wrong node), double misses, and — if a node is removed and later re-added — very old values resurfacing.</p>` },
    mcq: { q: 'What is the most robust protection against stale values from a key that temporarily had two owners?', options: ['Short TTLs plus versioned values / invalidating on both old and new owners during transitions', 'Bigger vnode count', 'Using MD5 instead of Murmur3', 'Disabling the cache during deploys'], answer: 0, explain: 'Bounded staleness via TTLs and version checks, plus dual invalidation during membership changes, handles the window when rings differ.' },
    hints: [`<p>Only keys in the moved ranges (≈ 1/41) are affected.</p>`, `<p>Think: TTLs, version numbers in cached values, invalidate on both owners while a change is in flight.</p>`, `<p>Ring versioning: include the ring version in requests, or use epochs so nodes can reject requests for keys they do not own.</p>`],
    solution: {
      approach: `<p><b>What breaks:</b> for the ≈ 2.4% of keys whose owner changes, readers on the old ring and writers on the new ring talk to different nodes: invalidations miss, stale values are served until TTL. A node that leaves and returns later may still hold ancient values for keys it owns again.</p>
        <p><b>Mitigations:</b> (1) Every cached entry has a <b>TTL</b> (bounded staleness). (2) <b>Versioned values</b>: store the row's version/updated_at; readers compare when it matters. (3) During a membership change (known from etcd), writers <b>invalidate on both</b> the old and new owner of a key for a grace period. (4) <b>Flush or bump a generation</b> on nodes that rejoin, so they start empty. (5) Make changes gradual (weights ramp) to shrink affected sets. (6) Optionally servers check a <b>ring epoch</b> and reject requests from clients on an older epoch, prompting them to refresh.</p>`,
      complexity: `<p>Affected keys per change ≈ 1/N; extra cost is one additional invalidation per write during the grace window.</p>`,
      followUps: ['How would a server-side redirect (like Redis MOVED) change this design?']
    }
  });
  practice.push({
    title: 'Pick the Partitioning Scheme', level: 'Medium', tags: ['trade-offs', 'jump hash', 'maglev', 'range partitioning'], companies: ['Google', 'Stripe'],
    statement: `<p>For each system, choose hash ring + vnodes, rendezvous, jump hash, Maglev, fixed slots, or range partitioning, and justify: (1) L4 load balancer at 10M packets/s over 500 backends; (2) time-series metrics store needing "last 1 hour for host X" scans; (3) storage service writing objects to numbered buckets 0..N−1 that only grows; (4) 12-node memcached tier used by a Python app; (5) Redis-like cluster where clients must do multi-key transactions on one user's keys.</p>`,
    constraints: `<p>One scheme per system with a one-line reason.</p>`,
    example: `<p>(1) needs ${H.c('b', 'O(1) per packet')} → table lookup, not O(N) scoring.</p>`,
    brute: { why: `<p>Naive answer: "consistent hashing for everything". It ignores lookup cost (packet rate), the need for ordering (scans), and co-location (multi-key transactions). Interviewers want the right tool per constraint.</p>` },
    mcq: { q: 'Which scheme fits "need range scans by time for one host"?', options: ['Range partitioning (by host, then time)', 'Rendezvous hashing on timestamp', 'Jump hash', 'Maglev'], answer: 0, explain: 'Hashing destroys key order; range partitioning keeps nearby keys together for scans.' },
    hints: [`<p>Map each requirement to a property: O(1) lookup, ordering, numbered buckets, simplicity, co-location.</p>`, `<p>Hash tags / fixed slots provide co-location of related keys.</p>`, `<p>Composite keys can combine hashing (spread) with ordering inside a partition.</p>`],
    solution: {
      approach: `<p><b>(1) Maglev</b> — O(1) table lookup per packet, near-perfect balance, minimal disruption; connection tracking covers the few flows that move.</p>
        <p><b>(2) Range partitioning</b> on (host, time) — or hash the host for spread and keep time ordered within the partition (Cassandra-style partition key = host + day bucket, clustering key = time). Pure hashing of timestamps would scatter scans.</p>
        <p><b>(3) Jump consistent hash</b> — zero memory, perfect balance, buckets numbered and only appended.</p>
        <p><b>(4) Ketama ring</b> (e.g. pymemcache's HashClient or a ketama library) or rendezvous — both fine at 12 nodes; use whatever the client library supports consistently across services.</p>
        <p><b>(5) Fixed slots with hash tags</b> (Redis Cluster): <code>{user42}:cart</code> and <code>{user42}:profile</code> share a slot → same node → MULTI/EXEC and Lua scripts work.</p>`,
      complexity: `<p>Maglev O(1); ring O(log T); HRW O(N); jump O(log N); range lookup O(log P) over partition boundaries.</p>`,
      followUps: ['How would you avoid hot partitions in (2) when one host is very chatty?']
    }
  });
  practice.push({
    title: 'Implement get_replicas with Distinct Nodes', level: 'Medium', tags: ['implementation', 'replication'], companies: ['Amazon', 'Databricks'], lang: 'python',
    statement: `<p>Given a ring of (token, physical_node) pairs sorted by token, write <code>get_replicas(key_hash, n)</code> returning the first n distinct physical nodes clockwise from the key, handling wraparound and the case where fewer than n nodes exist.</p>`,
    constraints: `<p>T ≤ 10<sup>6</sup> tokens; must not loop forever; O(log T + steps).</p>`,
    example: `<p>Ring [(10,A),(20,A),(30,B),(40,A),(50,C)], key 15, n = 2 → ${H.c('g', '[A, B]')} (skip A@40 if reached).</p>`,
    brute: { why: `<p>Naive approach: take the next n tokens clockwise. With vnodes several of those tokens belong to the same machine, so "3 replicas" may be 1 or 2 machines. Another naive bug: <code>while len(out) &lt; n</code> loops forever when the cluster has fewer than n distinct nodes.</p>`, code: { lang: 'python', code: `import bisect

def replicas_naive(tokens, nodes, key_hash, n):
    i = bisect.bisect_left(tokens, key_hash)
    # BUG: may return the same physical node twice
    return [nodes[(i + j) % len(tokens)] for j in range(n)]` } },
    mcq: { q: 'What bounds the loop so it always terminates?', options: ['At most one full lap: T steps', 'Stop after n steps', 'Stop when the token value decreases', 'It cannot be bounded'], answer: 0, explain: 'After visiting every token once you have seen every node; cap n at the number of distinct nodes too.' },
    hints: [`<p>Binary search for the start index (first token ≥ key_hash).</p>`, `<p>Walk with (start + step) % T, keep a set of chosen nodes.</p>`, `<p>Stop when you have n nodes or after T steps; cap n at the number of distinct nodes.</p>`],
    solution: {
      approach: `<p>Binary search the start, walk at most one lap, skip duplicates using a set, and stop early once n distinct nodes are collected.</p>`,
      code: { lang: 'python', run: true, code: `import bisect

def get_replicas(tokens, nodes, key_hash, n):
    """tokens: sorted token list; nodes[i]: physical node owning tokens[i]."""
    if not tokens:
        return []
    n = min(n, len(set(nodes)))
    start = bisect.bisect_left(tokens, key_hash)   # first token >= key (may be len -> wraps)
    out, seen = [], set()
    for step in range(len(tokens)):                # at most one full lap
        node = nodes[(start + step) % len(tokens)]
        if node not in seen:
            seen.add(node)
            out.append(node)
            if len(out) == n:
                break
    return out

tokens = [10, 20, 30, 40, 50]
nodes = ["A", "A", "B", "A", "C"]
print(get_replicas(tokens, nodes, 15, 2))   # ['A', 'B']
print(get_replicas(tokens, nodes, 45, 3))   # ['C', 'A', 'B']  (wraps around)
print(get_replicas(tokens, nodes, 5, 9))    # ['A', 'B', 'C']  (only 3 distinct nodes)
` },
      alt: [{ lang: 'java', code: `static List<String> getReplicas(long[] tokens, String[] nodes, long keyHash, int n) {
    List<String> out = new ArrayList<>();
    if (tokens.length == 0) return out;
    n = Math.min(n, new HashSet<>(Arrays.asList(nodes)).size());
    int start = Arrays.binarySearch(tokens, keyHash);
    if (start < 0) start = -start - 1;
    Set<String> seen = new HashSet<>();
    for (int step = 0; step < tokens.length && out.size() < n; step++) {
        String node = nodes[(start + step) % tokens.length];
        if (seen.add(node)) out.add(node);
    }
    return out;
}` }],
      complexity: `<p>O(log T) search + O(steps) walk; steps is small in practice (≈ n · v/(v−1)), worst case T.</p>`,
      followUps: ['Add rack awareness: prefer nodes in racks not yet used.']
    }
  });
  practice.push({
    title: 'Bounded-Load Consistent Hashing for a Video CDN', level: 'Hard', tags: ['bounded loads', 'CDN', 'hot spots'], companies: ['Netflix', 'Vimeo', 'YouTube'],
    statement: `<p>A video edge PoP has 50 cache servers using consistent hashing on the segment URL. A new episode release makes some servers hit 100% NIC utilisation while others idle, even though key counts are balanced. Design a fix that keeps high cache hit rate but caps every server's load at 125% of average. Explain the algorithm, its effect on hit rate, and how it behaves when servers join/leave.</p>`,
    constraints: `<p>Requests arrive at 100k segments/s (about 2k per server, roughly 48 Gbps per server at 3 MB each); each server has a 100 Gbps NIC; segments are 2–4 MB.</p>`,
    example: `<p>Average load 2k req/s per server → cap ${H.c('y', '2.5k')} (about 60 Gbps). Server 7 is at 2.5k → the next request for its key goes to the ${H.c('b', 'next server clockwise')} with spare capacity.</p>`,
    brute: { why: `<p>Naive fixes: (a) round robin — perfectly even load but every server must cache every hot segment, hit rate collapses and origin traffic explodes; (b) more vnodes — does nothing for popularity skew; (c) bigger servers everywhere — expensive and still capped by the single hottest key-range.</p>` },
    mcq: { q: 'With bounded loads (c = 1.25), what happens when a key\'s primary server is full?', options: ['The request goes to the next server along the ring (or next HRW choice) that has capacity', 'The request is dropped', 'The key is rehashed with a random salt', 'All servers are rebalanced'], answer: 0, explain: 'Bounded-load consistent hashing keeps the ring order but skips servers above c × average load.' },
    hints: [`<p>Capacity per server = ⌈c × current total load / N⌉.</p>`, `<p>Walk the ring from the key; assign to the first server under capacity. Popular keys spill over to a few deterministic neighbours.</p>`, `<p>Spill-over is deterministic, so the neighbour also caches the hot segment → hit rate stays high; measure with origin-fetch ratio.</p>`],
    solution: {
      approach: `<p><b>Algorithm (Mirrokni, Thorup, Zadimoghaddam):</b> keep the ring (or HRW order). Track current load per server (active requests or rate over a short window). Capacity = ⌈1.25 × total/N⌉. For a request, walk clockwise from hash(URL) and pick the first server with load &lt; capacity. In HAProxy this is <code>hash-type consistent</code> + <code>hash-balance-factor 125</code>.</p>
        <p><b>Why hit rate stays high:</b> overflow for a hot segment always goes to the <i>same</i> next servers in ring order, so a hot segment ends up cached on 2–3 servers instead of 50 — enough copies to carry the load, few enough to keep the PoP's combined cache large. Cold keys stay on their primary.</p>
        <p><b>Guarantees:</b> no server exceeds 125% of average; the expected number of keys moved on a join/leave remains bounded (a small constant factor over plain consistent hashing, depending on c).</p>
        <p><b>Extra layers:</b> per-server hot-object memory cache; pre-warm hot new episodes onto several servers before release (predictable spikes); origin shielding tier with its own consistent hashing; monitor NIC, hit ratio, and spill-over rate; adjust c (lower c = more even load, more spill-over, slightly lower hit rate).</p>
        <p><b>Load signal correctness:</b> the balancer instances must share or approximate load (each LB tracks its own share and assumes symmetry), otherwise spill decisions differ between LBs — acceptable, as each LB is itself bounded.</p>`,
      complexity: `<p>Lookup O(log T + k) where k = servers skipped (small for c ≥ 1.25). Movement per membership change O(1/ε²)·(1/N) keys for c = 1 + ε.</p>`,
      followUps: ['How would you choose c?', 'How does pre-warming interact with consistent hashing?']
    }
  });
  practice.push({
    title: 'Rebalance a Live 1 PB Cluster', level: 'Hard', tags: ['rebalancing', 'streaming', 'operations'], companies: ['Apple', 'Netflix', 'Uber'],
    statement: `<p>A ring-based store holds 1 PB (RF 3, 3 PB stored) on 600 nodes. You must add 150 nodes in one quarter without breaching p99 &lt; 15 ms and without losing a single write. Plan the expansion: order of adds, data movement, safety mechanisms, throttling, verification and rollback.</p>`,
    constraints: `<p>Each node can stream at most 200 MB/s without hurting latency; cross-AZ bandwidth costs money.</p>`,
    example: `<p>After expansion each node holds 3 PB / 750 = ${H.c('b', '4 TB')} (down from 5 TB). Total moved ≈ ${H.c('y', '150/750 × 3 PB = 600 TB')}.</p>`,
    brute: { why: `<p>Naive plan: add all 150 nodes at once and let them bootstrap. Hundreds of simultaneous streams saturate disks and network, p99 explodes, concurrent token claims can overlap, and if many nodes join at once the "pending range" bookkeeping becomes risky — a classic source of lost writes or under-replicated ranges.</p>` },
    mcq: { q: 'What ensures no write is lost while a range moves to a joining node?', options: ['Writes go to both current and pending replicas until streaming completes', 'Writes are paused during streaming', 'The new node replays the commit log of all nodes', 'Hinted handoff only'], answer: 0, explain: 'Dual-writing to pending owners closes the gap between the snapshot being streamed and new writes.' },
    hints: [`<p>Compute moved data and time: 600 TB at N parallel streams × 200 MB/s.</p>`, `<p>Add in AZ-balanced batches; one node per AZ at a time if the system cannot handle concurrent range movements safely.</p>`, `<p>Safety: pending ranges with dual writes, streaming throttles, repair after join, cleanup only after verification.</p>`],
    solution: {
      approach: `<p><b>Math:</b> ≈ 600 TB must move. With ~50 concurrent streams at 200 MB/s → 10 GB/s → ≈ 17 hours of pure streaming; realistic with throttling and one batch at a time: a few weeks — fits a quarter.</p>
        <p><b>Plan:</b> (1) <b>Capacity check</b> — confirm disk headroom on sources (cleanup runs after). (2) <b>Token allocation</b> — use a load-aware allocator so each new node takes an even share, AZ-balanced. (3) <b>Batches</b> — add one node per AZ (3 at a time), wait for "joined" + validation, repeat; never overlap range movements that touch the same ranges. (4) <b>Pending ranges</b> — while joining, coordinators write to both old and pending replicas; reads still use old replicas. (5) <b>Throttle</b> streaming and compaction; watch p99, disk util and GC; auto-pause on SLO burn. (6) <b>Verify</b> — after each batch run repair on moved ranges (Merkle trees) and sample-compare checksums. (7) <b>Cleanup</b> on old owners only after verification. (8) <b>Rollback</b> — a joining node can be aborted (ranges never left pending state); a joined node can be decommissioned to stream back.</p>
        <p><b>Cost:</b> prefer same-AZ streaming (rack-aware placement makes the new node in AZ-a take replicas from AZ-a). <b>Alternative architecture:</b> with fixed partitions/tablets, move individual partitions with a control plane — finer-grained, easier to pause, and what newer systems do.</p>`,
      complexity: `<p>Data moved = added/(old + added) × stored = 150/750 × 3 PB = 600 TB; time = moved / aggregate throttled throughput.</p>`,
      followUps: ['How do you detect an under-replicated range during the expansion?', 'How would tablets/fixed partitions change the plan?']
    }
  });
  practice.push({
    title: 'Design a Distributed Cache Client Library', level: 'Hard', tags: ['cache', 'client library', 'consistent hashing'], companies: ['Meta', 'Pinterest', 'Airbnb'],
    statement: `<p>Design the client library that 2,000 microservice instances (Java, Go, Python) use to talk to a 120-node memcached-style cluster. It must spread keys evenly, survive node failures without a database stampede, support adding nodes, and give identical routing in all three languages.</p>`,
    constraints: `<p>10M ops/s total; p99 &lt; 2 ms; membership from a discovery service; no proxy tier allowed.</p>`,
    example: `<p>Same key "u:42:feed" must route to ${H.c('b', 'node-087')} from Java, Go and Python clients — byte-identical hashing and token naming.</p>`,
    brute: { why: `<p>Naive design: each language uses its own built-in hash and <code>% N</code>. Different languages route the same key to different nodes (double the memory, inconsistent invalidation), Python's hash() differs per process, and every membership change reshuffles ~all keys → database stampede.</p>` },
    mcq: { q: 'What must be identical across language implementations for routing to agree?', options: ['Hash function, byte encoding of keys, token naming and ring construction', 'Only the server list', 'Only the hash function', 'The thread pool size'], answer: 0, explain: 'Any difference in hashing input bytes, token names (e.g. "node#i" vs "node-i") or tie-breaking produces different rings.' },
    hints: [`<p>Specify the ring precisely: hash = xxHash64/Murmur3 of UTF-8 bytes, tokens = node_id + "#" + i, v per weight, ties by node_id.</p>`, `<p>Failure handling: mark down after k timeouts; remove from ring or route to next node; avoid flapping.</p>`, `<p>Stampede protection: request coalescing, stale-while-revalidate, jittered TTLs; test vectors shared across languages.</p>`],
    solution: {
      approach: `<p><b>Routing spec (versioned):</b> ring of tokens <code>xxh64(utf8(node_id + "#" + i))</code> for i &lt; 160 × weight; key hash <code>xxh64(utf8(key))</code>; ceiling lookup with wrap; ties broken by node_id. Publish <b>golden test vectors</b> (1,000 keys → expected node) that all three libraries must pass in CI.</p>
        <p><b>Membership:</b> subscribe to discovery (etcd/Consul); build new ring off-thread and swap atomically (copy-on-write); include ring version in metrics. Gradual weight ramp for new nodes.</p>
        <p><b>Failures:</b> per-node circuit breaker (e.g. 5 consecutive timeouts → open for 10 s). Two policies: <i>ejection</i> (remove from local ring → keys move to successors, 1/N miss spike) or <i>failover-to-next without ejection</i> for short blips. Avoid flapping with hysteresis.</p>
        <p><b>Stampede protection:</b> request coalescing (single-flight) per key per process, stale-while-revalidate, jittered TTLs, and a token bucket on DB fallbacks. Hot keys: local L1 cache with tiny TTL.</p>
        <p><b>Performance:</b> connection pools per node, pipelining/multiget grouped by node (one round-trip per node for a batch), ring lookups O(log 19,200) ≈ 15 comparisons.</p>
        <p><b>Observability:</b> per-node hit rate, latency, ejections, ring version skew across instances.</p>`,
      complexity: `<p>Ring memory ≈ 19k tokens per process; lookup O(log T); node failure moves ≈ 1/120 of keys.</p>`,
      followUps: ['Would you add a proxy tier (like mcrouter/twemproxy) instead? Trade-offs?', 'How do you do a cross-region cache invalidation?']
    }
  });
  practice.push({
    title: 'Global Request Routing for an LLM Inference Fleet', level: 'Hard', tags: ['AI infra', 'prefix cache', 'consistent hashing', 'bounded loads'], companies: ['OpenAI', 'Anthropic', 'Google'],
    statement: `<p>An inference fleet has 400 GPU replicas across 4 regions. Requests that share a long system prompt or conversation prefix are much cheaper if they land on a replica whose KV cache already holds that prefix. Design routing that maximises prefix-cache hits, keeps GPUs evenly loaded, and survives replicas autoscaling every few minutes.</p>`,
    constraints: `<p>Mixed GPU types (2× throughput difference); a few system prompts are extremely popular; region failover required.</p>`,
    example: `<p>prefix hash of "You are a support bot for Acme…" → ${H.c('b', 'replica r-117')}; next turn of the same conversation → same replica → ${H.c('g', 'KV-cache hit')}, time-to-first-token drops sharply.</p>`,
    brute: { why: `<p>Naive designs: least-loaded routing (even load but near-zero prefix reuse — every replica recomputes the same prompts) or plain consistent hashing on the prefix (great reuse, but one viral system prompt overloads a single GPU and autoscaling with modulo would destroy cache locality).</p>` },
    mcq: { q: 'Which combination best balances cache affinity and load?', options: ['Consistent/rendezvous hashing on the prefix with bounded loads and weights per GPU type', 'Round robin', 'Modulo hashing on user ID', 'Random routing with retries'], answer: 0, explain: 'Hashing provides affinity; bounded loads cap hot prefixes; weights account for faster GPUs.' },
    hints: [`<p>What do you hash? A hash of the first K tokens (block-aligned) of the prompt, or the conversation ID for multi-turn.</p>`, `<p>Weighted HRW/ring for GPU types; bounded loads (c ≈ 1.2) for hot prefixes; top-k candidates for spill-over.</p>`, `<p>Two levels: global (region by latency/capacity) then regional hashing; autoscale moves only ≈ 1/N of prefixes.</p>`],
    solution: {
      approach: `<p><b>Level 1 — region:</b> GeoDNS/anycast to the nearest healthy region; capacity-aware spill to the next region when queues exceed a threshold.</p>
        <p><b>Level 2 — replica (per region router):</b> compute a routing key = hash of the first K block-aligned prompt tokens (system prompt + few-shot block), or the conversation ID for follow-up turns. Use <b>weighted rendezvous hashing</b> (weights ∝ measured tokens/s per GPU type) to get an ordered candidate list. Apply <b>bounded loads</b>: take the first candidate whose in-flight load &lt; 1.2 × weighted average. Hot prefixes thus spread to a few deterministic replicas, each of which caches it.</p>
        <p><b>Autoscaling:</b> adding/removing one of 100 regional replicas moves ≈ 1% of prefixes; new replicas ramp weight up. Draining replicas stop receiving new prefixes and finish in-flight requests.</p>
        <p><b>Feedback:</b> replicas can report which prefixes they currently hold; a smarter router may prefer a replica with a real cache hit over the hash choice (cache-aware routing as in SGLang-style routers or llm-d), falling back to hashing when unknown.</p>
        <p><b>Observability:</b> prefix hit ratio, time-to-first-token, GPU utilisation spread, spill-over rate; tune K and c with experiments.</p>`,
      complexity: `<p>Routing O(N) per request for HRW at N ≈ 100 per region (microseconds, negligible vs inference); movement ≈ 1/N per scaling step.</p>`,
      followUps: ['How do you handle a prefix that is hot in all regions at once?', 'What is the privacy risk of routing on prompt hashes, and how do you mitigate it?']
    }
  });

  /* =====================================================================
     QUIZ
     ===================================================================== */
  quiz.push(
    { q: 'You shard with <code>hash(key) % N</code> and go from 9 to 10 servers. Roughly what fraction of keys move?', options: ['90%', '10%', '50%', '0%'], answer: 0, explain: 'N/(N+1) = 9/10 of keys change server with modulo; only 1/(N+1) stay.' },
    { q: 'On a hash ring, a key is owned by…', options: ['The first server token clockwise at or after the key\'s position (wrapping around)', 'The closest server in either direction', 'The server with the smallest token', 'A random server'], answer: 0, explain: 'Walk clockwise to the first token ≥ the key\'s hash; past the largest token, wrap to the first.' },
    { q: 'A new server joins a ring (one token per server). Which keys move?', options: ['Only keys in the arc between its predecessor and itself, all from its successor', 'About half of all keys', 'Keys from every server', 'None until a restart'], answer: 0, explain: 'The new token splits one arc; only that slice changes owner, moving from the old owner (the successor) to the new node.' },
    { q: 'What is the main benefit of virtual nodes?', options: ['Even load distribution and spreading a failed node\'s load across many nodes', 'Fewer hash computations', 'Strong consistency', 'They remove the need for replication'], answer: 0, explain: 'Many small random arcs average out (spread ≈ 1/√v), and a failed node\'s arcs go to many different successors.' },
    { q: 'Spread of load with v vnodes per server shrinks roughly like…', options: ['1/√v', '1/v', '1/v²', 'log v'], answer: 0, explain: 'Each share is a sum of v random spacings; relative standard deviation ∝ 1/√v.' },
    { q: 'With vnodes and RF = 3, why must the replica walk skip some tokens?', options: ['Tokens of a physical node already chosen would put two replicas on one machine', 'Tokens near zero are reserved', 'Odd tokens are for reads only', 'To make lookups O(1)'], answer: 0, explain: 'Replicas must be on distinct machines (and ideally racks/AZs) to survive independent failures.' },
    { q: 'Rendezvous (HRW) hashing assigns a key to…', options: ['The server with the highest hash(server, key)', 'The server whose token follows the key', 'Server hash(key) % N', 'The least loaded server'], answer: 0, explain: 'Every server gets a pseudo-random score per key; the max wins. Removing a server affects only keys it was winning.' },
    { q: 'The main cost of rendezvous hashing versus a ring is…', options: ['O(N) work per lookup', 'More keys move on changes', 'Uneven load', 'It needs a central coordinator'], answer: 0, explain: 'HRW scores every server; rings use O(log T) binary search at the cost of storing tokens.' },
    { q: 'Which system does NOT use a hash ring for data placement?', options: ['Redis Cluster (16384 fixed hash slots)', 'Apache Cassandra', 'The 2007 Amazon Dynamo design', 'Ketama memcached clients'], answer: 0, explain: 'Redis Cluster maps CRC16(key) % 16384 to slots and moves slots between nodes; it is fixed-slot partitioning, not a ring.' },
    { q: 'In Dynamo, what is hinted handoff?', options: ['A healthy node temporarily stores a write meant for a down replica and forwards it later', 'Clients pass hints about key popularity', 'The ring hints at which node is leader', 'A compression scheme for tokens'], answer: 0, explain: 'Sloppy quorum: the next healthy node keeps the data with a hint naming the intended replica, keeping writes available.' },
    { q: 'Consistent hashing perfectly balances key ranges, but one node is still overloaded. Most likely cause?', options: ['A hot key (popularity skew)', 'Too few servers', 'Using MD5', 'The ring is not sorted'], answer: 0, explain: 'Hashing balances keys, not requests; one very popular key still lives on one node.' },
    { q: 'Which technique keeps every server under c × average load while preserving most cache affinity?', options: ['Consistent hashing with bounded loads', 'Round robin', 'Jump consistent hash', 'Doubling the vnode count'], answer: 0, explain: 'Bounded loads skips full servers along the ring order, so hot keys spill to a few deterministic neighbours.' },
    { q: 'Why should you not use Python\'s built-in <code>hash()</code> for routing keys to servers?', options: ['String hashing is randomized per process, so different processes disagree', 'It is too slow', 'It only returns even numbers', 'It cannot hash strings'], answer: 0, explain: 'PYTHONHASHSEED randomizes str hashes per process; use a stable hash like MD5, xxHash or Murmur3.' }
  );

  /* =====================================================================
     INTERVIEW Q&A
     ===================================================================== */
  interview.push(
    { q: 'What is consistent hashing and why do we need it?', level: 'B', a: `<p>It is a way to spread keys over servers so that when servers are added or removed, only about <b>1/N of keys move</b>. With <code>hash % N</code>, changing N moves N/(N+1) of keys — a cache avalanche or a massive data migration. Consistent hashing places servers and keys on the same hash ring; each key goes to the first server clockwise. A join only takes one arc from its successor; a leave hands its arc to its successor. Used by Dynamo, Cassandra, CDNs, memcached clients and L7 load balancers.</p>`, followUps: ['Derive the N/(N+1) figure.', 'Is modulo ever acceptable?'] },
    { q: 'Walk me through a lookup on a hash ring. What data structure do you use?', level: 'B', a: `<p>Hash all server tokens and keep them sorted (sorted array or <code>TreeMap</code>). For a key, compute its hash and find the smallest token ≥ hash (binary search / <code>ceilingEntry</code>); if none, wrap to the first token. That token's server is the owner. Lookup is O(log T) for T tokens. On membership change, rebuild the sorted structure (copy-on-write) and swap atomically so readers never see a half-built ring.</p>`, followUps: ['Why ceiling and not higher?', 'How do you make updates thread-safe?'] },
    { q: 'What problems do virtual nodes solve, and what do they cost?', level: 'I', a: `<p>With one token per server, arcs are random: the largest is ~ln N times the average, a failed server dumps all its load on one neighbour, and a new server pulls data from just one neighbour. Virtual nodes put each server on the ring v times, so load evens out (spread ≈ 1/√v), failures spread across all survivors, joins stream from many nodes, and weights become easy (more vnodes for bigger machines). Costs: bigger ring metadata (N·v), more and smaller ranges to repair/stream, and with replication more distinct replica sets, which raises the chance a multi-node failure hits some quorum.</p>`, followUps: ['How would you choose v?', 'Why did Cassandra reduce num_tokens from 256 to 16?'] },
    { q: 'How do you place replicas on a ring?', level: 'I', a: `<p>Walk clockwise from the key's position and take the first N <b>distinct physical nodes</b>, skipping vnodes of already-chosen machines — the <b>preference list</b>. In production make it topology-aware: prefer nodes in racks/AZs not yet used (Cassandra's NetworkTopologyStrategy), and set replica counts per data center. Each node then holds ≈ N/nodes of data, and a joining node takes over N ranges from N previous holders. Reads and writes use quorums (R + W &gt; N for overlap).</p>`, followUps: ['What happens if a rack has twice the nodes of the others?', 'Which nodes stream data when a node joins?'] },
    { q: 'Explain sloppy quorum and hinted handoff.', level: 'I', a: `<p>In Dynamo, if a replica in the preference list is unreachable during a write, the coordinator sends that replica's copy to the next healthy node past the list, tagged with a <b>hint</b> naming the intended owner. The write counts toward W, so the system stays writable. When the owner recovers, the hint is delivered and the temporary copy deleted. Downside: R + W &gt; N no longer guarantees reading the latest write, because the quorum may include stand-ins. Cassandra stores hints on the coordinator instead, and hints only count for consistency level ANY. Long outages are reconciled by Merkle-tree anti-entropy repair.</p>`, followUps: ['What if the hinting node also fails?', 'How do Merkle trees reduce repair traffic?'] },
    { q: 'Compare consistent hashing (ring) with rendezvous hashing.', level: 'I', a: `<p>Both give minimal disruption. <b>Ring</b>: O(log T) lookups, needs vnodes for balance, replicas by walking clockwise with de-duplication, memory N·v. <b>Rendezvous (HRW)</b>: owner = argmax hash(server, key); naturally balanced without vnodes, replicas = top-k scores (automatically distinct), exact weights via w/−ln(u), almost no memory — but O(N) per lookup. Choose HRW for tens to hundreds of nodes and simplicity; the ring (or Maglev) for thousands of nodes or very hot lookup paths.</p>`, followUps: ['How do you make HRW sub-linear?', 'How would you add weights to each?'] },
    { q: 'What are jump consistent hash and Maglev, and when would you use them?', level: 'A', a: `<p><b>Jump hash</b> (Google, 2014) maps a 64-bit key to a bucket in [0, N) with a few lines of arithmetic, no memory, O(log N) time and perfect balance; only ~1/(N+1) of keys move when N grows by one. But buckets are numbers, and you can only add/remove at the end — fine for numbered shards behind a mapping table, not for arbitrary node failures. <b>Maglev</b> (Google's L4 load balancer, 2016) fills a prime-sized lookup table (e.g. 65,537) using per-backend permutations; lookups are O(1) and balance is near-perfect, with slightly more than minimal churn on changes. It suits packet-rate load balancing (Envoy offers MAGLEV).</p>`, followUps: ['How does Maglev handle connection affinity for flows that move?', 'Why is the table size prime?'] },
    { q: 'Consistent hashing is balanced, but one node is melting. What do you do?', level: 'A', a: `<p>First check whether it is a <b>hot key</b> (popularity) or a <b>hot range</b>. Hashing balances keys, not traffic. For hot keys: detect via sampling or count-min sketch; replicate/split the key (<code>key#0..#k</code>) and read from a random copy; add a local L1 cache with a short TTL; coalesce concurrent misses. For hot ranges or uneven popularity: bounded-load consistent hashing (cap at c × average, spill to next node); move or split the range; adjust weights. Also confirm the node is not simply weaker hardware or doing compaction/GC.</p>`, followUps: ['How do you keep split copies consistent?', 'How do you choose the bound c?'] },
    { q: 'How does Cassandra use consistent hashing end to end?', level: 'I', a: `<p>The partitioner (Murmur3) hashes the partition key into a token in −2<sup>63</sup>…2<sup>63</sup>−1. Each node owns several token ranges via vnodes (<code>num_tokens</code>, 16 by default since 4.0 with a load-aware allocator). The keyspace's replication strategy (NetworkTopologyStrategy) walks the ring to choose replicas across racks and DCs. Any node can coordinate a request: it routes to replicas and waits for the consistency level (ONE, QUORUM, LOCAL_QUORUM, ALL). Gossip shares membership and token ownership; hints, read repair, and Merkle-tree repair keep replicas in sync; bootstrap/decommission stream token ranges.</p>`, followUps: ['What does nodetool cleanup do after a join?', 'What is a token-aware driver?'] },
    { q: 'Why do CDNs use consistent hashing inside a PoP?', level: 'I', a: `<p>A PoP has many cache servers. If requests were spread randomly, every server would need to cache every popular object, so the PoP's effective cache equals one server's RAM and hit rate suffers. Consistent hashing on the URL sends each object to one (or a few) servers, so the PoP's combined RAM acts as one big cache. When a server fails, only its objects miss. This was the original motivation for consistent hashing (Karger et al., 1997, which led to Akamai). Hot objects are spread over k servers or handled by bounded loads.</p>`, followUps: ['How would you handle a viral object?', 'Where else in a CDN would you hash again?'] },
    { q: 'How do clients agree on the ring, and what happens when they disagree?', level: 'A', a: `<p>The ring is a pure function of the member list (plus weights and the hashing spec). Members come from gossip (Dynamo/Cassandra), a coordination service (etcd/ZooKeeper), or service discovery. Propagation is not instant, so for a short time two clients can route the same key to different nodes. Tolerate it: replication and quorums (stores), TTLs and versioned values plus dual invalidation during transitions (caches), server-side ownership checks with redirects (like Redis <code>MOVED</code>), or epoch numbers that make servers reject stale-ring requests. Ramp membership changes gradually to shrink the affected key set.</p>`, followUps: ['What is a phi-accrual failure detector?', 'How do you stop a flapping node from churning the ring?'] },
    { q: 'Fixed partitions (e.g. 16384 slots) vs a ring with random tokens — which is better?', level: 'A', a: `<p>Fixed partitions separate key → partition (never changes) from partition → node (a small table). Benefits: easy balanced assignment, move whole partitions as units, simple per-partition Merkle trees and metrics, clear ownership; the Dynamo paper found it the best strategy, and Redis Cluster, Riak, Couchbase and ScyllaDB tablets use variants. Costs: you must choose the partition count up front (too few limits scale-out; too many adds overhead) unless partitions can split. Random-token rings need no global table and suit decentralized, peer-to-peer membership, but balance and repair are harder. Many large systems now prefer fixed or splittable partitions plus a control plane.</p>`, followUps: ['How would you pick the number of partitions?', 'How do tablets split and move?'] },
    { q: 'How would you test a consistent hashing implementation?', level: 'E', a: `<p>Property tests: (1) <b>monotonicity</b> — after adding node X, every key either keeps its owner or moves to X; after removing X, only X's keys move. (2) <b>balance</b> — with v vnodes, per-node share within the expected ~1/√v bound across many random seeds. (3) <b>determinism</b> — identical routing across processes and languages via golden test vectors. (4) <b>edge cases</b> — empty ring, single node, key exactly equal to a token, wrap past the largest token, hash collisions, n replicas &gt; distinct nodes. (5) <b>replica rules</b> — distinct machines and racks. Plus benchmarks for lookup latency and rebuild time at production scale.</p>`, followUps: ['What would a golden test vector file look like?', 'How do you test behaviour during membership changes?'] },
    { q: 'How is consistent hashing used in AI / LLM infrastructure today?', level: 'E', a: `<p>LLM serving benefits hugely from reusing the KV cache of shared prompt prefixes, so routers hash a prefix (or conversation ID) to choose a GPU replica; consistent or rendezvous hashing keeps most routes stable as replicas autoscale, weights account for different GPU types, and bounded loads stop a hugely popular system prompt from overloading one GPU. Prefix-cache-aware routers in open-source serving stacks combine hashing with live cache-hit feedback. Similar patterns shard vector indexes, embedding caches and feature stores. The same trade-off appears: affinity (cache hits) versus even load.</p>`, followUps: ['What do you hash for multi-turn chats vs batch jobs?', 'How do you measure whether affinity routing pays off?'] }
  );

  /* Vary where the correct option sits (deterministic rotation) so answers are not always "A". */
  function rotate(q, r) {
    if (!q || !q.options) return;
    r = r % q.options.length;
    if (!r) return;
    q.options = q.options.slice(r).concat(q.options.slice(0, r));
    q.answer = (q.answer - r + q.options.length) % q.options.length;
  }
  quiz.forEach(function (q, i) { rotate(q, i); });
  practice.forEach(function (p, i) { rotate(p.mcq, i + 1); });
  topics.forEach(function (t, i) { (t.problems || []).forEach(function (p) { rotate(p.mcq, i + 2); }); });

  registerModule({
    id: 'hld07',
    title: 'Consistent Hashing & Data Distribution',
    intro: `<p>Every system that outgrows one machine has to answer one question millions of times per second: <b>"which server owns this key?"</b> The obvious answer, <code>hash(key) % N</code>, works until the day N changes — then almost every key moves, caches go cold, and databases drown.</p>
      <p>This module shows you, with animated rings and real numbers, how <b>consistent hashing</b> fixes that: the <b>hash ring</b>, <b>virtual nodes</b> for even load, <b>replication</b> by walking the ring, the elegant <b>rendezvous hashing</b> alternative (plus jump hash, Maglev and bounded loads), and how <b>Dynamo, Cassandra, CDNs, memcached clients and load balancers</b> use these ideas in production. You will practise computing key movement, choosing vnode counts and placing replicas — the exact reasoning interviewers look for in "design a key-value store / cache / CDN" questions.</p>`,
    goals: [
      'Prove why <code>hash % N</code> moves N/(N+1) of keys and why consistent hashing moves only ≈ 1/(N+1)',
      'Look up a key\'s owner on a hash ring by hand and in code (Java TreeMap, Python bisect), including wraparound',
      'Compute exactly which keys move when a node joins or leaves, and from/to whom',
      'Choose a virtual node count and weights from a target load imbalance (spread ≈ 1/√v)',
      'Place N replicas on distinct machines and racks, and explain quorums, sloppy quorum and hinted handoff',
      'Compare ring, rendezvous, jump hash, Maglev, bounded loads and fixed slots, and pick one for a given system',
      'Explain how Dynamo, Cassandra, Redis Cluster, CDNs and L7 load balancers distribute data and traffic'
    ],
    prereqs: `HLD 5 (Databases at Scale: replication and sharding basics) and HLD 6 (Caching). Comfort with hash functions and binary search (DSA hashing module) helps for the code.`,
    hours: 9,
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
