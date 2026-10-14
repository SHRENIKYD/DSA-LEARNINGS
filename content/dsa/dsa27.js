(function () {
  var topics = [], practice = [], quiz = [], interview = [];

  // =====================================================================
  // Shared helpers for the visualizers (pure, deterministic, fast)
  // =====================================================================
  function txt(input) { return String(input === undefined || input === null ? '' : input).trim(); }
  function splitBar(s, n, fmt) {
    var parts = txt(s).split('|');
    if (parts.length !== n) throw new Error('Expected ' + n + ' parts separated by "|". Format: ' + fmt);
    return parts.map(function (x) { return x.trim(); });
  }
  function toInt(x, what, lo, hi) {
    var v = Number(x);
    if (!Number.isInteger(v)) throw new Error(what + ' must be a whole number (got "' + x + '")');
    if (v < lo || v > hi) throw new Error(what + ' must be between ' + lo + ' and ' + hi);
    return v;
  }
  function one(k, v) { var o = {}; o[k] = v; return o; }
  // Small deterministic string hash (FNV-1a, 32-bit) used by several visualizers.
  function fnv(s) {
    var h = 2166136261;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    return h >>> 0;
  }
  // djb2 hash — a second, independent-looking hash for double hashing.
  function djb2(s) {
    var h = 5381;
    for (var i = 0; i < s.length; i++) { h = (Math.imul(h, 33) + s.charCodeAt(i)) >>> 0; }
    return h >>> 0;
  }
  // Seeded linear congruential generator so "random" skip-list levels are repeatable.
  function lcg(seed) {
    var s = seed >>> 0;
    return function () { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
  }
  // Parse "p1 p2 g1 p3" style cache traces: p = put key, g = get key.
  function parseOps(s, maxOps) {
    var toks = txt(s).split(/[\s,]+/).filter(Boolean);
    if (!toks.length) throw new Error('Type some operations like: p1 p2 g1 p3 (p = put, g = get, then a key 0-99)');
    if (toks.length > maxOps) throw new Error('Keep it to at most ' + maxOps + ' operations so the picture stays readable');
    return toks.map(function (t) {
      var m = /^([pPgG])(\d{1,2})$/.exec(t);
      if (!m) throw new Error('Could not read "' + t + '". Use p<key> for put and g<key> for get, e.g. p1 g1');
      return { op: m[1].toLowerCase(), key: Number(m[2]) };
    });
  }

  // =====================================================================
  // TOPIC 1 — LRU cache and its real-world variants
  // =====================================================================
  topics.push({
    title: 'LRU Cache: HashMap + Doubly Linked List, and Its Real-World Variants',
    analogy: `<p>Think of the <b>small shelf next to your desk</b> that holds only 3 books. Every time you read a book you put it back on the <b>left end</b>. When a 4th book arrives and the shelf is full, you remove the book on the <b>far right</b> — the one you have not touched for the longest time — and put it back in the big library downstairs.</p>
      <p>That is exactly an <b>LRU (Least Recently Used) cache</b>: a small, fast shelf in front of a big, slow store, which throws away the thing you used <i>longest ago</i>. The trick is doing "find the book" <i>and</i> "move it to the left end" <i>and</i> "remove the rightmost" all in <b>one step each</b>, no matter how big the shelf is.</p>`,
    explain: `<p><b>A cache</b> is a small, fast storage that keeps copies of things that are expensive to fetch (a database row, a web page, a computed answer). It has a fixed <b>capacity</b>, so when it is full and something new arrives, it must <b>evict</b> (throw out) something. The <b>eviction policy</b> decides <i>what</i>. LRU says: throw out the item whose last use is the oldest.</p>
      <p><b>The interview version (LeetCode 146):</b> build <code>get(key)</code> and <code>put(key, value)</code>, both in <b>O(1)</b>.</p>
      <ul>
        <li>We need <b>fast lookup by key</b> → a <b>HashMap</b> (key → node).</li>
        <li>We need <b>order by recency</b> with O(1) "move to front" and O(1) "remove from the back" → a <b>doubly linked list</b> (each node knows its <code>prev</code> and <code>next</code>, so it can unhook itself in one step).</li>
        <li>Glue them together: the map stores a <i>pointer</i> to the list node. Now we find a node in O(1) <i>and</i> unlink it in O(1).</li>
      </ul>
      <p><b>Tiny trace</b> (capacity 2): <code>put(1,A) put(2,B) get(1) put(3,C)</code></p>
      ${H.table(['step', 'list (most recent → least recent)', 'what happened'], [
        ['put(1,A)', '1', 'new node at the front'],
        ['put(2,B)', '2, 1', 'new node at the front'],
        ['get(1)', H.c('g', '1') + ', 2', 'hit → move 1 to the front'],
        ['put(3,C)', H.c('g', '3') + ', 1 &nbsp; ' + H.c('r', '(2 evicted)'), 'full → drop the back (2), insert 3 at the front']
      ])}
      <p><b>Two sentinel nodes</b> (a dummy <code>head</code> and dummy <code>tail</code>) mean the list is never "empty" in code, so you never write <code>if (head == null)</code> special cases. Real nodes always live <i>between</i> them: the node right after <code>head</code> is the most recent; the node right before <code>tail</code> is the eviction victim.</p>
      ${H.arr(['HEAD', '3:C', '1:A', 'TAIL'], { label: 'list', hl: { 0: 'm', 1: 'g', 2: 'y', 3: 'm' }, idx: false })}
      <p><b>Every operation is built from two helpers:</b> <code>remove(node)</code> (unhook it: 2 pointer changes) and <code>addFront(node)</code> (hook it after head: 4 pointer changes). <code>get</code> = lookup + remove + addFront. <code>put</code> = update-or-create + addFront + maybe evict <code>tail.prev</code>. Do not forget to also delete the evicted key from the map — that is the #1 bug.</p>
      <p><b>Variants you will be asked about:</b> LRU with <b>TTL</b> (items also expire after N seconds), LRU with a <b>byte budget</b> (evict until total size fits), <b>LRU-K / 2Q / Segmented LRU</b> (protect items used more than once from one-time scans), <b>CLOCK</b> (a cheap approximation used by operating systems), and <b>thread-safe</b> LRU.</p>`,
    clues: [
      '"Design a data structure that follows the constraints of a <b>Least Recently Used</b> cache" → HashMap + doubly linked list (or <code>LinkedHashMap</code> with <code>accessOrder = true</code>).',
      '"<code>get</code> and <code>put</code> must each run in <b>O(1) average time</b>" → you need both a hash lookup and an O(1) reorder — a single structure cannot do both.',
      '"When the cache reaches its <b>capacity</b>, it should <b>invalidate the least recently used</b> item" → evict <code>tail.prev</code>, and remove its key from the map too.',
      '"Recently viewed items / recent files / browser history of size K" → same LRU list, often without the eviction-on-get rule.',
      '"Items also <b>expire after T seconds</b>" or "cache with <b>TTL</b>" → LRU list + expiry timestamp per node (lazy check on get) and optionally a min-heap/timer wheel for active expiry.',
      '"A big one-time <b>scan</b> should not wipe out the hot items" → LRU is scan-vulnerable; mention 2Q, Segmented LRU, or LRU-K.',
      '"Many threads read and write the cache" → a lock around the whole thing, or a concurrent design like Caffeine (buffered reorders), not a naive HashMap + list.'
    ],
    code: [`
      // LRU cache: HashMap for O(1) lookup + doubly linked list for O(1) reordering.
      class LRUCache {
          // One node per cached entry. It stores the key too, so on eviction
          // we know which map entry to delete.
          private static class Node {
              int key, val;
              Node prev, next;
              Node(int k, int v) { key = k; val = v; }
          }

          private final int capacity;
          private final Map<Integer, Node> map = new HashMap<>();
          // Sentinels: head.next is the MOST recent, tail.prev is the LEAST recent.
          private final Node head = new Node(0, 0), tail = new Node(0, 0);

          LRUCache(int capacity) {
              this.capacity = capacity;
              head.next = tail;
              tail.prev = head;
          }

          public int get(int key) {
              Node n = map.get(key);
              if (n == null) return -1;      // miss
              remove(n);                     // unhook from current position
              addFront(n);                   // it is now the most recently used
              return n.val;
          }

          public void put(int key, int value) {
              Node n = map.get(key);
              if (n != null) {               // update existing key = also a "use"
                  n.val = value;
                  remove(n);
                  addFront(n);
                  return;
              }
              if (map.size() == capacity) {  // full: evict least recently used
                  Node lru = tail.prev;
                  remove(lru);
                  map.remove(lru.key);       // the classic forgotten line!
              }
              Node fresh = new Node(key, value);
              addFront(fresh);
              map.put(key, fresh);
          }

          // Unhook n from the list: its neighbours now point at each other.
          private void remove(Node n) {
              n.prev.next = n.next;
              n.next.prev = n.prev;
          }

          // Insert n right after head (the "most recent" end).
          private void addFront(Node n) {
              n.next = head.next;
              n.prev = head;
              head.next.prev = n;
              head.next = n;
          }
      }`, `
      // The 10-line production shortcut: LinkedHashMap already IS a hash map + doubly linked list.
      // accessOrder = true moves an entry to the end on every get/put;
      // removeEldestEntry is called after each put and evicts the head (least recent).
      class LinkedLRU<K, V> extends LinkedHashMap<K, V> {
          private final int capacity;

          LinkedLRU(int capacity) {
              super(16, 0.75f, true);        // true = order by ACCESS, not insertion
              this.capacity = capacity;
          }

          @Override
          protected boolean removeEldestEntry(Map.Entry<K, V> eldest) {
              return size() > capacity;      // evict once we go over capacity
          }

          public static void main(String[] args) {
              LinkedLRU<Integer, String> c = new LinkedLRU<>(2);
              c.put(1, "A");
              c.put(2, "B");
              c.get(1);                      // 1 becomes most recent
              c.put(3, "C");                 // evicts 2
              System.out.println(c.keySet()); // [1, 3]  (least recent first)
          }
      }`, { lang: 'python', run: true, title: 'Same idea in Python with OrderedDict (runnable)', code: `
from collections import OrderedDict

class LRUCache:
    """OrderedDict remembers order; move_to_end makes a key 'most recent'."""
    def __init__(self, capacity):
        self.cap = capacity
        self.data = OrderedDict()

    def get(self, key):
        if key not in self.data:
            return -1
        self.data.move_to_end(key)          # mark as most recently used
        return self.data[key]

    def put(self, key, value):
        if key in self.data:
            self.data.move_to_end(key)
        self.data[key] = value
        if len(self.data) > self.cap:
            evicted = self.data.popitem(last=False)   # oldest = least recently used
            print("  evict", evicted)

c = LRUCache(2)
c.put(1, "A"); c.put(2, "B")
print("get(1) ->", c.get(1))
c.put(3, "C")
print("get(2) ->", c.get(2), "(evicted)")
print("order (least -> most recent):", list(c.data.keys()))
` }],
    codeTitle: ['LRU from scratch (Java) — the answer interviewers expect', 'LinkedHashMap shortcut (mention it, then build from scratch)', 'Python OrderedDict version'],
    viz: {
      title: 'LRU cache: watch the list reorder and the tail get evicted',
      input: '3 | p1 p2 p3 g1 p4 g2 g3 p5 g1',
      inputLabel: 'capacity | ops (pK = put key K, gK = get key K)',
      gen: function (input) {
        var parts = splitBar(input, 2, '3 | p1 p2 g1 p3');
        var cap = toInt(parts[0], 'Capacity', 1, 6);
        var ops = parseOps(parts[1], 16);
        var order = [], val = {}, hits = 0, misses = 0, ev = 0, ver = 0, frames = [];
        var CODE = 'Node n = map.get(key);\nif (n == null) return -1;      // miss\nremove(n); addFront(n);       // hit: move to front\nif (map.size() == capacity) { // full\n  remove(tail.prev); map.remove(lruKey);\n}\naddFront(fresh); map.put(key, fresh);';
        function snap(narr, hlKey, cls, codeHl, extra) {
          var lst = order.map(function (k) { return k + ':' + val[k]; });
          var hl = {}, ptr = {};
          if (lst.length) { ptr[0] = 'MRU'; ptr[lst.length - 1] = lst.length > 1 ? 'LRU' : 'MRU/LRU'; }
          var i = order.indexOf(hlKey); if (i >= 0) hl[i] = cls;
          var ents = order.slice().sort(function (a, b) { return a - b; }).map(function (k) { return [String(k), 'node(' + k + ':' + val[k] + ')']; });
          var mhl = {}; if (hlKey !== null && order.indexOf(hlKey) >= 0) mhl[String(hlKey)] = cls;
          var ps = [
            { type: 'list', label: 'doubly linked list (head → tail)', values: lst.length ? lst : ['(empty)'], ptr: lst.length ? ptr : {}, hl: hl },
            { type: 'map', label: 'HashMap key → node', entries: ents.length ? ents : [['—', 'empty']], hl: mhl },
            { type: 'vars', label: 'stats', vals: { capacity: cap, size: order.length, hits: hits, misses: misses, evictions: ev }, hl: extra || {} },
            { type: 'code', label: 'which lines run', lang: 'java', code: CODE, hl: codeHl || {} }
          ];
          frames.push({ narr: narr, parts: ps });
        }
        snap('Empty cache with capacity <b>' + cap + '</b>. The left end of the list is the <b>most recently used</b> (MRU); the right end is the <b>least recently used</b> (LRU) — the next victim.', null, '', {});
        ops.forEach(function (o) {
          var k = o.key, at = order.indexOf(k);
          if (o.op === 'g') {
            if (at < 0) { misses++; snap('<b>get(' + k + ')</b>: key ' + k + ' is not in the map → <span class="c-r">miss</span>, return -1. Nothing moves.', null, '', { 1: 'cur', 2: 'bad' }, { misses: 'bad' }); }
            else {
              hits++; order.splice(at, 1); order.unshift(k);
              snap('<b>get(' + k + ')</b>: found in the map in O(1) → <span class="c-g">hit</span>, value ' + val[k] + '. Unhook its node and re-insert it at the front, because it was just used.', k, 'ok', { 1: 'cur', 3: 'ok' }, { hits: 'ok' });
            }
          } else {
            ver++;
            var v = String.fromCharCode(64 + ((k + ver) % 26 || 26));
            if (at >= 0) {
              order.splice(at, 1); order.unshift(k); val[k] = v;
              snap('<b>put(' + k + ', ' + v + ')</b>: key exists → overwrite the value and move it to the front (an update counts as a use).', k, 'ok', { 1: 'cur', 3: 'ok' });
            } else {
              if (order.length === cap) {
                var victim = order[order.length - 1];
                snap('<b>put(' + k + ', ' + v + ')</b>: new key but the cache is <b>full</b>. The victim is the node just before the tail: <b>' + victim + '</b> (used longest ago).', victim, 'bad', { 4: 'cur', 5: 'bad' });
                order.pop(); delete val[victim]; ev++;
                snap('Evicted <b>' + victim + '</b> from the list <i>and</i> from the map (forgetting the map is the classic bug).', null, '', { 5: 'bad' }, { evictions: 'bad' });
              }
              order.unshift(k); val[k] = v;
              snap('Insert new node <b>' + k + ':' + v + '</b> right after head and store it in the map.', k, 'ok', { 7: 'ok' }, { size: 'ok' });
            }
          }
        });
        var total = hits + misses;
        snap('Done. Hit rate on gets = <b>' + hits + '/' + (total || 0) + '</b>. Every step touched only a few pointers — O(1) no matter how large the capacity.', null, '', {}, { hits: 'ok' });
        return frames;
      }
    },
    examples: [
      {
        title: 'LeetCode 146 sample, step by step',
        html: `<p>Capacity 2: <code>put(1,1) put(2,2) get(1) put(3,3) get(2) put(4,4) get(1) get(3) get(4)</code>.</p>
          ${H.table(['op', 'list after (MRU → LRU)', 'returns'], [
            ['put(1,1)', '1', '—'], ['put(2,2)', '2, 1', '—'], ['get(1)', '1, 2', H.c('g', '1')],
            ['put(3,3)', '3, 1 ' + H.c('r', '(evict 2)'), '—'], ['get(2)', '3, 1', H.c('r', '-1')],
            ['put(4,4)', '4, 3 ' + H.c('r', '(evict 1)'), '—'], ['get(1)', '4, 3', H.c('r', '-1')],
            ['get(3)', '3, 4', H.c('g', '3')], ['get(4)', '4, 3', H.c('g', '4')]
          ])}
          <p>Notice <code>get(1)</code> at step 3 saved key 1 from eviction at step 4 — and key 2 lost out instead. Recency is everything.</p>`
      },
      {
        title: 'LRU with a time-to-live (TTL)',
        html: `<p>Session caches and DNS caches need entries to <b>expire</b> even if the cache is not full. Store <code>expiresAt</code> in each node. On <code>get</code>, if <code>now ≥ expiresAt</code>, delete the node and report a miss (<b>lazy expiry</b>). Lazy expiry alone can leave dead entries hogging space, so production caches also sweep: Redis samples random keys with a TTL about 10 times a second; Caffeine uses a <b>timer wheel</b> (buckets by expiry time) for O(1) amortised expiry.</p>
          ${H.table(['key', 'value', 'expiresAt', 'get at t=12'], [['a', '1', '10', H.c('r', 'expired → -1, removed')], ['b', '2', '15', H.c('g', 'hit → 2')]])}`,
        code: `
      class TtlLru {
          private final int cap;
          private final LinkedHashMap<String, long[]> m;   // value[0] = data, value[1] = expiresAt
          TtlLru(int cap) {
              this.cap = cap;
              this.m = new LinkedHashMap<>(16, 0.75f, true);
          }
          Long get(String k, long now) {
              long[] e = m.get(k);
              if (e == null) return null;
              if (now >= e[1]) { m.remove(k); return null; }   // lazy expiry
              return e[0];
          }
          void put(String k, long v, long ttl, long now) {
              m.put(k, new long[]{v, now + ttl});
              if (m.size() > cap) {
                  String eldest = m.keySet().iterator().next();  // least recently used
                  m.remove(eldest);
              }
          }
      }`
      },
      {
        title: 'Why LRU fails on a scan — and how Segmented LRU fixes it',
        html: `<p>Hot keys <code>A B C</code> are hit all day. A nightly report reads 1,000 cold keys once each. Plain LRU (capacity 3) pushes A, B, C out within 3 reads — tomorrow morning starts with 0% hit rate.</p>
          <p><b>Segmented LRU (SLRU)</b>: new keys enter a small <b>probation</b> segment; only a <i>second</i> hit promotes a key to the <b>protected</b> segment. One-time scan keys die in probation and never touch A, B, C. <b>2Q</b> and MySQL InnoDB's buffer pool (new pages inserted at the "midpoint", old sublist ≈ 3/8 of the pool) use the same idea.</p>
          ${H.arr(['A', 'B', 'C'], { label: 'protected', hl: { 0: 'g', 1: 'g', 2: 'g' }, idx: false })}${H.arr(['x998', 'x999'], { label: 'probation', hl: { 0: 'r', 1: 'r' }, idx: false })}`
      },
      {
        title: 'CLOCK: LRU without moving anything',
        html: `<p>Operating systems cannot afford to relink a list on <i>every memory access</i>. <b>CLOCK</b> puts pages in a circle with one <b>reference bit</b> each. On access: set bit = 1 (cheap, no pointers). To evict: a hand sweeps the circle; if bit = 1, clear it to 0 and move on ("second chance"); if bit = 0, evict that page.</p>
          ${H.table(['page', 'P0', 'P1', 'P2', 'P3'], [['ref bit', '1', '0', '1', '1'], ['hand at P0', 'clear → 0', H.c('r', 'evict!'), '', '']])}
          <p>It approximates LRU with O(1) work on hits. Linux's page cache uses an evolution of this idea (active/inactive lists, and the newer multi-generational LRU).</p>`
      }
    ],
    deepDive: `<p><b>Why a <i>doubly</i> linked list?</b> To unlink a node in O(1) you must change its predecessor's <code>next</code>. A singly linked list would need an O(N) walk to find the predecessor. The map gives us the node; <code>prev</code> gives us its neighbour.</p>
      <p><b>Why store the key inside the node?</b> When you evict <code>tail.prev</code> you hold a node, not a key — without <code>node.key</code> you cannot delete the map entry, and the map keeps growing (a memory leak that tests often miss).</p>
      <p><b>Memory reality.</b> In Java each entry costs a HashMap entry (~32–48 bytes), a list node (~32 bytes with two pointers and two ints), plus boxed <code>Integer</code> keys. Caching 10 million small values can spend more on <i>bookkeeping</i> than data. <code>LinkedHashMap</code> fuses both into one entry object, saving one allocation per item.</p>
      <p><b>Concurrency.</b> A <code>get</code> <i>writes</i> (it reorders the list), so a read-write lock does not help — every operation needs the exclusive lock, and the lock becomes the bottleneck. Real libraries cheat cleverly: <b>Caffeine</b> (Java) records reads in lock-free ring buffers and replays them in batches; it uses <b>W-TinyLFU</b> (a small LRU "window" + a frequency sketch admission filter + segmented LRU main area), which beats LRU on most real traces. <b>Redis</b> uses <i>approximated</i> LRU: it samples 5 keys (<code>maxmemory-samples</code>) and evicts the oldest among them — no list at all, just a 24-bit clock per key. Memcached uses per-slab-class LRU with a segmented hot/warm/cold design.</p>
      <p><b>Eviction family quick map:</b> LRU (recency) · LFU (frequency, next topic) · FIFO (insertion order; simple, surprisingly OK for some CDNs; S3-FIFO is a 2023 design showing FIFO queues can beat LRU) · CLOCK (cheap LRU) · ARC (adaptive mix of recency and frequency; IBM patented it, which is why ZFS uses it but many others avoid it) · Random (zero bookkeeping, fine when access is uniform).</p>
      <p><b>Edge cases interviewers poke:</b> capacity 0 or 1, <code>put</code> on an existing key when full (must <i>not</i> evict — it is an update), duplicate gets, and whether <code>put</code> of an existing key counts as a use (LeetCode: yes).</p>`,
    aiEra: `<p><b>What AI changes:</b> any assistant writes LRU 146 in seconds, so interviewers increasingly ask the <i>variants</i> — TTL, byte budgets, concurrency, scan resistance — and expect you to reason about hit rate, not just code. Your value is choosing the right policy for a workload and spotting the subtle bug (missing <code>map.remove</code>, evicting on an update).</p>
      <p><b>Caches are everywhere in AI systems:</b> LLM servers like vLLM keep the attention <b>KV cache</b> in fixed-size blocks and, with automatic prefix caching, evict unused blocks in LRU order; API prompt caching keeps a shared prefix warm for a few minutes (TTL). <b>Semantic caches</b> for chatbots key on an <i>embedding</i> of the question and still need LRU/TTL eviction underneath.</p>
      <p><b>Use AI as a partner:</b> <code>Generate 20 random get/put traces with capacity 1..3 and the expected outputs, then I'll diff them against my LRU</code>. <b>Where AI goes wrong:</b> uses a singly linked list and quietly makes eviction O(N), forgets sentinel wiring, or claims <code>LinkedHashMap</code> is thread-safe (it is not — wrap it or use Caffeine).</p>`,
    problems: [{
      title: 'LRU Cache', level: 'Medium', tags: ['design', 'hashmap', 'doubly linked list'], companies: ['Amazon', 'Google', 'Microsoft', 'Meta', 'Bloomberg'],
      statement: `<p>Design a class <code>LRUCache(int capacity)</code> with <code>int get(int key)</code> (return the value, or -1 if absent) and <code>void put(int key, int value)</code> (insert or update; if this pushes the size over capacity, evict the <b>least recently used</b> key). Both must run in <b>O(1)</b> average time. A <code>get</code> hit or any <code>put</code> counts as a "use".</p>`,
      constraints: `1 ≤ capacity ≤ 3000, 0 ≤ key ≤ 10<sup>4</sup>, 0 ≤ value ≤ 10<sup>5</sup>, at most 2·10<sup>5</sup> calls.`,
      example: `<p>Capacity 2: <code>put(1,1), put(2,2), get(1) → ${H.c('g', '1')}, put(3,3) ${H.c('r', '[evicts 2]')}, get(2) → ${H.c('r', '-1')}, put(4,4) ${H.c('r', '[evicts 1]')}, get(1) → -1, get(3) → 3, get(4) → 4</code>.</p><p>Why 2 is evicted and not 1: <code>get(1)</code> made 1 more recent than 2.</p>`,
      brute: {
        why: `<p>Keep an <code>ArrayList</code> of keys in recency order plus a <code>HashMap</code> for values. Lookups are O(1), but "move key to the front" needs <code>list.remove(key)</code> — an O(capacity) scan and shift. With 2·10<sup>5</sup> calls × 3000 capacity ≈ 6·10<sup>8</sup> operations — too slow, and it misses the O(1) requirement.</p>`,
        code: `
      class LRUBrute {
          private final int cap;
          private final Map<Integer, Integer> vals = new HashMap<>();
          private final List<Integer> order = new ArrayList<>();   // index 0 = most recent
          LRUBrute(int cap) { this.cap = cap; }
          int get(int key) {
              if (!vals.containsKey(key)) return -1;
              order.remove(Integer.valueOf(key));    // O(N) scan + shift: the wasted work
              order.add(0, key);                     // O(N) shift again
              return vals.get(key);
          }
          void put(int key, int value) {
              if (vals.containsKey(key)) order.remove(Integer.valueOf(key));
              else if (vals.size() == cap) vals.remove(order.remove(order.size() - 1));
              order.add(0, key);
              vals.put(key, value);
          }
      }`
      },
      mcq: { q: 'You have the map (key → node). Which list type lets you delete that node from the middle in O(1)?', options: ['Singly linked list', 'Doubly linked list', 'ArrayList', 'A min-heap ordered by time'], answer: 1, explain: 'Deleting needs the predecessor. A doubly linked node knows its <code>prev</code>, so unlinking is 2 pointer writes. A singly linked list must walk from the head to find the predecessor.' },
      hints: [
        `<p>Hint 1: You need two powers at once: "find key fast" (hash map) and "reorder by recency fast" (linked list). Neither alone is enough — combine them with the map pointing <i>at</i> list nodes.</p>`,
        `<p>Hint 2: Use a doubly linked list with dummy <code>head</code> and <code>tail</code>. Most recent lives right after head; the victim is <code>tail.prev</code>. Write <code>remove(node)</code> and <code>addFront(node)</code> first — every operation is built from them.</p>`,
        `<p>Hint 3: Recipe — get: miss → -1; hit → remove + addFront, return value. put: exists → update value, remove + addFront. New and full → evict <code>tail.prev</code> from list AND map, then create node, addFront, map.put. Store the key in the node so eviction can clean the map.</p>`
      ],
      solution: {
        approach: `<p>HashMap&lt;key, Node&gt; + doubly linked list with sentinels. The map finds the node in O(1); the <code>prev</code>/<code>next</code> pointers let us move or delete it in O(1). The list order <i>is</i> the recency order, so the eviction victim is always at a known place: <code>tail.prev</code>.</p>`,
        code: `
      class LRUCache {
          private static class Node {
              int key, val;
              Node prev, next;
              Node(int k, int v) { key = k; val = v; }
          }
          private final int cap;
          private final Map<Integer, Node> map = new HashMap<>();
          private final Node head = new Node(-1, -1), tail = new Node(-1, -1);

          public LRUCache(int capacity) {
              cap = capacity;
              head.next = tail;
              tail.prev = head;
          }

          public int get(int key) {
              Node n = map.get(key);
              if (n == null) return -1;
              unlink(n);
              pushFront(n);
              return n.val;
          }

          public void put(int key, int value) {
              Node n = map.get(key);
              if (n != null) {                 // update counts as a use
                  n.val = value;
                  unlink(n);
                  pushFront(n);
                  return;
              }
              if (map.size() == cap) {         // evict least recently used
                  Node victim = tail.prev;
                  unlink(victim);
                  map.remove(victim.key);
              }
              n = new Node(key, value);
              pushFront(n);
              map.put(key, n);
          }

          private void unlink(Node n) { n.prev.next = n.next; n.next.prev = n.prev; }

          private void pushFront(Node n) {
              n.next = head.next; n.prev = head;
              head.next.prev = n; head.next = n;
          }
      }`,
        alt: [{ lang: 'python', code: `
class Node:
    __slots__ = ("key", "val", "prev", "next")
    def __init__(self, k=0, v=0):
        self.key, self.val, self.prev, self.next = k, v, None, None

class LRUCache:
    def __init__(self, capacity: int):
        self.cap = capacity
        self.map = {}
        self.head, self.tail = Node(), Node()
        self.head.next, self.tail.prev = self.tail, self.head

    def _unlink(self, n):
        n.prev.next, n.next.prev = n.next, n.prev

    def _push_front(self, n):
        n.next, n.prev = self.head.next, self.head
        self.head.next.prev = n
        self.head.next = n

    def get(self, key: int) -> int:
        n = self.map.get(key)
        if n is None:
            return -1
        self._unlink(n); self._push_front(n)
        return n.val

    def put(self, key: int, value: int) -> None:
        n = self.map.get(key)
        if n:
            n.val = value
            self._unlink(n); self._push_front(n)
            return
        if len(self.map) == self.cap:
            victim = self.tail.prev
            self._unlink(victim)
            del self.map[victim.key]
        n = Node(key, value)
        self._push_front(n)
        self.map[key] = n
` }],
        dry: {
          head: ['call', 'list (MRU → LRU)', 'map keys', 'output / note'],
          rows: [
            ['put(1,1)', '1', '{1}', '—'],
            ['put(2,2)', '2, 1', '{1,2}', '—'],
            ['get(1)', '1, 2', '{1,2}', '<span class="c-g">1</span> (moved to front)'],
            ['put(3,3)', '3, 1', '{1,3}', '<span class="c-r">evict 2</span> = tail.prev'],
            ['get(2)', '3, 1', '{1,3}', '<span class="c-r">-1</span>'],
            ['put(4,4)', '4, 3', '{3,4}', '<span class="c-r">evict 1</span>'],
            ['get(3)', '3, 4', '{3,4}', '<span class="c-g">3</span>']
          ]
        },
        complexity: `<p><b>Time:</b> O(1) average for both <code>get</code> and <code>put</code> (one hash operation + a constant number of pointer writes). <b>Space:</b> O(capacity) for the nodes and map entries.</p>`,
        followUps: ['Make it thread-safe. What is the bottleneck of one global lock, and how does Caffeine avoid it?', 'Add a TTL per entry. Lazy or active expiry?', 'Evict by total byte size instead of entry count.', 'Make it scan-resistant (Segmented LRU / 2Q).']
      }
    }]
  });

  // =====================================================================
  // TOPIC 2 — LFU cache
  // =====================================================================
  topics.push({
    title: 'LFU Cache: Frequency Buckets + minFreq for O(1) Eviction',
    analogy: `<p>A small cafe has room for only 4 dishes on the menu. At the end of each week the owner removes the dish that was <b>ordered the fewest times</b> to make room for a new one. If two dishes tie (both ordered 3 times), she removes the one that was ordered <b>longest ago</b>.</p>
      <p>To decide instantly, she keeps <b>piles of cards</b>: pile "1 order", pile "2 orders", pile "3 orders"… Each time a dish is ordered, its card moves from its pile to the next pile up. The victim is always the <b>bottom card of the lowest non-empty pile</b>. That is an <b>LFU (Least Frequently Used) cache</b>.</p>`,
    explain: `<p><b>LFU</b> evicts the key with the <b>smallest use count</b>; ties go to the <b>least recently used</b> among them. It protects items that are popular over time — a one-off burst does not push out your steady favourites (LRU's weakness).</p>
      <p><b>Why it is harder than LRU:</b> "smallest count" sounds like a heap (O(log N)), but LeetCode 460 demands <b>O(1)</b>. The insight: counts only ever go <b>up by exactly 1</b>, and a brand-new key always has count 1. So we never need to <i>search</i> for the minimum — we can <b>track</b> it.</p>
      <p><b>Three structures:</b></p>
      ${H.table(['structure', 'what it stores', 'why'], [
        ['<code>keyMap</code>', 'key → (value, freq)', 'O(1) lookup'],
        ['<code>freqMap</code>', 'freq → list of keys, oldest first', 'O(1) "who has count f, and who is the oldest of them"'],
        ['<code>minFreq</code>', 'one integer', 'the lowest non-empty bucket = where the victim lives']
      ])}
      <p><b>The "touch" operation</b> (used by every <code>get</code> hit and every <code>put</code> on an existing key):</p>
      <ol>
        <li>Remove the key from bucket <code>f</code>.</li>
        <li>If bucket <code>f</code> is now empty <i>and</i> <code>f == minFreq</code>, then <code>minFreq++</code> (the key we just moved is now in bucket f+1, so f+1 is non-empty — the minimum moves up by exactly 1).</li>
        <li>Add the key to the <b>end</b> of bucket <code>f+1</code> (end = newest).</li>
      </ol>
      <p><b>Inserting a new key when full:</b> evict the <b>first</b> (oldest) key of bucket <code>minFreq</code>, then insert the new key into bucket 1 and set <code>minFreq = 1</code> (a new key always has the lowest possible count).</p>
      ${H.kv([['f=1', 'k5'], ['f=2', 'k3, k1'], ['f=4', 'k2']], { label: 'freqMap (oldest → newest)', hl: { 'f=1': 'r' } })}
      <p>Here <code>minFreq = 1</code>, so the victim is <b>k5</b>. If we then <code>get(5)</code>, bucket 1 empties and <code>minFreq</code> becomes 2; the next victim would be <b>k3</b> (oldest in bucket 2).</p>`,
    clues: [
      '"Evict the <b>least frequently used</b> key; on a tie, evict the <b>least recently used</b>" → LFU with freq buckets that are each in LRU order.',
      '"<code>get</code> and <code>put</code> must both run in <b>O(1)</b>" → a heap is O(log N); use <code>freq → list</code> buckets plus a <code>minFreq</code> pointer.',
      '"Popular items should survive bursts of one-off requests" → frequency-based policy (LFU / TinyLFU) beats pure recency.',
      '"Increment / decrement a count and query the <b>min or max</b> count key in O(1)" (All O’one) → the same bucket-list idea.',
      '"Return the most frequent element, ties broken by most recent" (Max Frequency Stack) → freq → stack buckets + <code>maxFreq</code>, the mirror image of LFU.',
      'Counts only change by <b>±1</b> → the min/max can be tracked, not searched.'
    ],
    code: [`
      // LFU cache in O(1): key -> node, freq -> doubly linked list of nodes (oldest at head side).
      class LFUCache {
          private static class Node {
              int key, val, freq = 1;
              Node prev, next;
              Node(int k, int v) { key = k; val = v; }
          }
          // A tiny doubly linked list with sentinels; addLast = newest, removeFirst = oldest.
          private static class DList {
              final Node head = new Node(0, 0), tail = new Node(0, 0);
              int size;
              DList() { head.next = tail; tail.prev = head; }
              void addLast(Node n) {
                  n.prev = tail.prev; n.next = tail;
                  tail.prev.next = n; tail.prev = n; size++;
              }
              void remove(Node n) { n.prev.next = n.next; n.next.prev = n.prev; size--; }
              Node removeFirst() { Node n = head.next; remove(n); return n; }
          }

          private final int capacity;
          private int minFreq = 0;
          private final Map<Integer, Node> keyMap = new HashMap<>();
          private final Map<Integer, DList> freqMap = new HashMap<>();

          LFUCache(int capacity) { this.capacity = capacity; }

          public int get(int key) {
              Node n = keyMap.get(key);
              if (n == null) return -1;
              touch(n);
              return n.val;
          }

          public void put(int key, int value) {
              if (capacity == 0) return;               // nothing can ever be stored
              Node n = keyMap.get(key);
              if (n != null) { n.val = value; touch(n); return; }
              if (keyMap.size() == capacity) {         // evict oldest key among the least used
                  Node victim = freqMap.get(minFreq).removeFirst();
                  keyMap.remove(victim.key);
              }
              n = new Node(key, value);                // brand-new key: freq 1
              keyMap.put(key, n);
              freqMap.computeIfAbsent(1, f -> new DList()).addLast(n);
              minFreq = 1;                             // nothing can be lower than 1
          }

          // Move n from bucket f to bucket f+1, keeping minFreq correct.
          private void touch(Node n) {
              DList bucket = freqMap.get(n.freq);
              bucket.remove(n);
              if (bucket.size == 0 && n.freq == minFreq) minFreq++;
              n.freq++;
              freqMap.computeIfAbsent(n.freq, f -> new DList()).addLast(n);
          }
      }`, { lang: 'python', run: true, title: 'Python with OrderedDict buckets (runnable)', code: `
from collections import defaultdict, OrderedDict

class LFUCache:
    def __init__(self, capacity):
        self.cap = capacity
        self.val = {}                       # key -> value
        self.freq = {}                      # key -> count
        self.buckets = defaultdict(OrderedDict)   # count -> keys in LRU order
        self.min_freq = 0

    def _touch(self, key):
        f = self.freq[key]
        del self.buckets[f][key]
        if not self.buckets[f] and f == self.min_freq:
            self.min_freq += 1
        self.freq[key] = f + 1
        self.buckets[f + 1][key] = None

    def get(self, key):
        if key not in self.val:
            return -1
        self._touch(key)
        return self.val[key]

    def put(self, key, value):
        if self.cap == 0:
            return
        if key in self.val:
            self.val[key] = value
            self._touch(key)
            return
        if len(self.val) == self.cap:
            victim, _ = self.buckets[self.min_freq].popitem(last=False)
            del self.val[victim], self.freq[victim]
            print("  evict", victim)
        self.val[key], self.freq[key] = value, 1
        self.buckets[1][key] = None
        self.min_freq = 1

c = LFUCache(2)
c.put(1, 1); c.put(2, 2)
print(c.get(1))       # 1  (key 1 now has freq 2)
c.put(3, 3)           # evicts 2 (freq 1)
print(c.get(2))       # -1
print(c.get(3))       # 3
c.put(4, 4)           # tie at freq 2 between 1 and 3 -> evict 1 (older)
print(c.get(1), c.get(3), c.get(4))
` }],
    codeTitle: ['LFU with per-frequency doubly linked lists (Java)', 'Python version (runnable)'],
    viz: {
      title: 'LFU cache: keys climb frequency buckets; the victim is the oldest in the lowest bucket',
      input: '2 | p1 p2 g1 p3 g2 g3 p4 g1 g3 g4',
      inputLabel: 'capacity | ops (pK = put key K, gK = get key K)',
      gen: function (input) {
        var parts = splitBar(input, 2, '2 | p1 p2 g1 p3');
        var cap = toInt(parts[0], 'Capacity', 1, 5);
        var ops = parseOps(parts[1], 16);
        var val = {}, freq = {}, buckets = {}, minF = 0, frames = [], tick = 0;
        function bucketEntries() {
          return Object.keys(buckets).map(Number).filter(function (f) { return buckets[f].length; }).sort(function (a, b) { return a - b; })
            .map(function (f) { return ['f=' + f, buckets[f].map(function (k) { return 'k' + k; }).join(' → ')]; });
        }
        function snap(narr, hlKey, cls, varHl) {
          var keys = Object.keys(val).map(Number).sort(function (a, b) { return a - b; });
          var rows = keys.map(function (k) { return [k, val[k], freq[k]]; });
          var thl = {}; keys.forEach(function (k, i) { if (k === hlKey) thl[i] = cls; });
          var be = bucketEntries(), bhl = {};
          if (minF && buckets[minF] && buckets[minF].length) bhl['f=' + minF] = 'win';
          if (hlKey !== null && freq[hlKey]) bhl['f=' + freq[hlKey]] = cls;
          frames.push({ narr: narr, parts: [
            { type: 'map', label: 'freqMap: count → keys (oldest → newest)', entries: be.length ? be : [['—', 'empty']], hl: bhl },
            { type: 'table', label: 'keyMap', columns: ['key', 'value', 'freq'], rows: rows.length ? rows : [['—', '—', '—']], hl: thl },
            { type: 'vars', label: 'state', vals: { capacity: cap, size: keys.length, minFreq: minF }, hl: varHl || {} }
          ] });
        }
        function touch(k) {
          var f = freq[k], b = buckets[f];
          b.splice(b.indexOf(k), 1);
          var bumped = false;
          if (!b.length && f === minF) { minF++; bumped = true; }
          freq[k] = f + 1;
          (buckets[f + 1] = buckets[f + 1] || []).push(k);
          return bumped;
        }
        snap('Empty LFU cache, capacity <b>' + cap + '</b>. Blue bucket = <code>minFreq</code>, where the next victim lives.', null, '', {});
        ops.forEach(function (o) {
          var k = o.key; tick++;
          if (o.op === 'g') {
            if (!(k in val)) { snap('<b>get(' + k + ')</b> → <span class="c-r">-1</span> (not cached). Counts do not change on a miss.', null, '', {}); return; }
            var from = freq[k], bumped = touch(k);
            snap('<b>get(' + k + ')</b> → ' + val[k] + '. Its count goes ' + from + ' → ' + freq[k] + ': move it to the <i>end</i> (newest) of bucket ' + freq[k] + '.' + (bumped ? ' Bucket ' + from + ' became empty and was minFreq → <b>minFreq = ' + minF + '</b>.' : ''), k, 'ok', bumped ? { minFreq: 'cur' } : {});
          } else {
            var v = k * 10 + (tick % 10);
            if (k in val) {
              val[k] = v; var from2 = freq[k], b2 = touch(k);
              snap('<b>put(' + k + ', ' + v + ')</b>: key exists → update the value and count it as a use (' + from2 + ' → ' + freq[k] + ').' + (b2 ? ' minFreq moves up to ' + minF + '.' : ''), k, 'ok', b2 ? { minFreq: 'cur' } : {});
              return;
            }
            if (Object.keys(val).length === cap) {
              var victim = buckets[minF][0];
              snap('<b>put(' + k + ', ' + v + ')</b>: cache full. Look at bucket <b>minFreq = ' + minF + '</b>; its oldest key <b>' + victim + '</b> is the victim' + (buckets[minF].length > 1 ? ' (tie broken by recency)' : '') + '.', victim, 'bad', { minFreq: 'cur' });
              buckets[minF].shift(); delete val[victim]; delete freq[victim];
            }
            val[k] = v; freq[k] = 1; (buckets[1] = buckets[1] || []).push(k); minF = 1;
            snap('Insert <b>' + k + '</b> with count 1 into bucket 1 and reset <b>minFreq = 1</b> — a new key is always the least used.', k, 'ok', { minFreq: 'ok' });
          }
        });
        snap('Done. Every step did a constant amount of work: one bucket removal, one append, and at most a +1 on minFreq.', null, '', {});
        return frames;
      }
    },
    examples: [
      {
        title: 'LeetCode 460 sample trace',
        html: `<p>Capacity 2: <code>put(1,1) put(2,2) get(1) put(3,3) get(2) get(3) put(4,4) get(1) get(3) get(4)</code></p>
          ${H.table(['op', 'counts after', 'minFreq', 'result'], [
            ['put(1,1)', '1:1', '1', '—'], ['put(2,2)', '1:1, 2:1', '1', '—'], ['get(1)', '1:2, 2:1', '1', H.c('g', '1')],
            ['put(3,3)', '1:2, 3:1', '1', H.c('r', 'evict 2') + ' (count 1)'], ['get(2)', 'same', '1', '-1'], ['get(3)', '1:2, 3:2', H.c('y', '2'), H.c('g', '3')],
            ['put(4,4)', '3:2, 4:1', '1', H.c('r', 'evict 1') + ' (tie at 2, 1 is older)'], ['get(1)', 'same', '1', '-1'],
            ['get(3)', '3:3, 4:1', '1', '3'], ['get(4)', '3:3, 4:2', '2', '4']
          ])}`
      },
      {
        title: 'The "cache pollution by old popularity" problem',
        html: `<p>A news site: yesterday's big story was read 1,000,000 times. Today nobody reads it, but pure LFU keeps it forever because its count is huge — new stories with 500 reads get evicted instead. Fixes: <b>aging</b> (periodically halve every count), <b>windowed counts</b> (only count the last hour), or <b>TinyLFU</b> (a Count-Min Sketch of recent frequencies that "resets" by halving all counters after every W samples).</p>
          ${H.table(['story', 'count before', 'after halving ×3'], [['yesterday', '1,000,000', '125,000'], ['today', '500', '62']])}
          <p>Halving keeps the <i>order</i> of truly hot items but lets stale stars fade.</p>`
      },
      {
        title: 'How Redis does LFU with 8 bits',
        html: `<p>Redis' <code>allkeys-lfu</code> policy does not keep exact counts. Each key has an <b>8-bit logarithmic counter</b> (max 255): on access, it increments with probability roughly <code>1 / ((counter − 5) × lfu_log_factor + 1)</code>, so reaching 255 takes about a million hits at the default factor 10. A 16-bit "last decay time" lets the counter <b>decay</b> by 1 per <code>lfu-decay-time</code> minutes of idleness. Eviction samples a few keys and drops the lowest counter — approximate, but nearly zero memory.</p>
          ${H.table(['idea', 'exact LFU (LC 460)', 'Redis LFU'], [['count size', '32-bit int', '8-bit probabilistic'], ['find min', 'minFreq bucket', 'random sample'], ['aging', 'none', 'decay per idle minute']])}`
      },
      {
        title: 'Simpler O(1) buckets with LinkedHashSet',
        html: `<p>In an interview, <code>Map&lt;Integer, LinkedHashSet&lt;Integer&gt;&gt;</code> is a great shortcut for the per-frequency list: <code>add</code> appends at the end, <code>remove(key)</code> is O(1), and <code>iterator().next()</code> returns the oldest key. Mention that it uses more memory than a hand-made list, then code it.</p>`,
        code: `
      class TinyLfuBuckets {
          Map<Integer, LinkedHashSet<Integer>> buckets = new HashMap<>();
          // Oldest key in the lowest bucket = the LFU victim (ties broken by recency).
          int victim(int minFreq) { return buckets.get(minFreq).iterator().next(); }
      }`
      }
    ],
    deepDive: `<p><b>Proof that <code>minFreq++</code> is enough.</b> In <code>touch</code>, the key moves from bucket f to f+1. If bucket f empties and f was the minimum, then no key has count &lt; f+1, and our key now sits in bucket f+1 → the new minimum is exactly f+1. Every other path is covered: a <code>get</code> miss changes nothing; a new insert sets <code>minFreq = 1</code>; an eviction is always immediately followed by an insert (which resets to 1), so we never need to "find the next minimum" after an eviction. That is why there is no loop anywhere.</p>
      <p><b>Capacity 0</b> is a real LeetCode test: without the guard, <code>freqMap.get(minFreq)</code> is <code>null</code> and you crash.</p>
      <p><b>Memory cost.</b> Each key has a map entry, a node, and lives in one bucket. Empty buckets can be removed from <code>freqMap</code> to stop the map from growing with high counts (optional; correctness does not need it).</p>
      <p><b>LFU vs LRU in production.</b> Pure LFU adapts slowly (new hot items start at count 1 and get evicted before they can prove themselves — "cache cold-start"). Modern caches mix both: <b>W-TinyLFU</b> (Caffeine) admits a new item into the main cache only if the Count-Min Sketch says it is used more often than the victim it would replace; <b>ARC</b> balances a recency list and a frequency list adaptively; <b>LRFU</b> blends them with a decay parameter. Benchmarks on database, search and web traces typically show W-TinyLFU ahead of LRU by several percentage points of hit rate — which can mean many fewer database calls.</p>
      <p><b>Related patterns using the same bucket trick:</b> <i>All O’one Data Structure</i> (inc/dec, get max/min key — buckets in a doubly linked list ordered by count), <i>Maximum Frequency Stack</i> (freq → stack, track <code>maxFreq</code>), and "top frequent words in a stream" with bounded memory.</p>`,
    aiEra: `<p><b>What AI changes:</b> an assistant will often produce an LFU with a <code>PriorityQueue</code> (O(log N)) or a <code>TreeMap</code> and call it "O(1)". Spotting that is now an interview skill: ask "what is the cost of <code>poll</code>?" and fix it with buckets + <code>minFreq</code>.</p>
      <p><b>Frequency-aware caching in AI systems:</b> LLM gateways cache embeddings and tool results; popular prompts (system prompts, RAG chunks of FAQ pages) are hit far more than one-off queries, so frequency-aware admission (TinyLFU) keeps them hot while a burst of unique user questions passes through. Feature stores for recommendation models use the same idea for hot user/item vectors.</p>
      <p><b>Use AI as a partner:</b> <code>Write a randomized test comparing my LFUCache to a slow reference that scans all keys for (min count, oldest time)</code> — a brute-force oracle catches tie-breaking bugs. <b>What you must still own:</b> the minFreq proof, the capacity-0 edge case, and explaining when LFU beats LRU (stable popularity) and when it loses (shifting popularity).</p>`,
    problems: [{
      title: 'LFU Cache', level: 'Hard', tags: ['design', 'hashmap', 'linked list'], companies: ['Amazon', 'Google', 'Microsoft', 'Snowflake'],
      statement: `<p>Design <code>LFUCache(int capacity)</code> with <code>get(key)</code> (value or -1) and <code>put(key, value)</code>. When inserting a new key into a full cache, evict the key with the <b>lowest use count</b>; if several keys tie, evict the <b>least recently used</b> of them. A key's count starts at 1 when inserted and increases on every <code>get</code> hit or <code>put</code> update. Both operations must be <b>O(1)</b> average.</p>`,
      constraints: `0 ≤ capacity ≤ 10<sup>4</sup>, 0 ≤ key ≤ 10<sup>5</sup>, 0 ≤ value ≤ 10<sup>9</sup>, at most 2·10<sup>5</sup> calls.`,
      example: `<p>Capacity 2: <code>put(1,1) put(2,2) get(1)→${H.c('g', '1')} put(3,3) ${H.c('r', '[evict 2: count 1]')} get(2)→-1 get(3)→3 put(4,4) ${H.c('r', '[evict 1: tie at count 2, 1 used earlier]')} get(1)→-1 get(3)→3 get(4)→4</code></p>`,
      brute: {
        why: `<p>Store <code>(value, count, lastUsedTime)</code> per key; on eviction <b>scan all keys</b> for the smallest (count, time). Each eviction is O(capacity) → up to 2·10<sup>5</sup> × 10<sup>4</sup> = 2·10<sup>9</sup> steps. A heap fixes the scan but needs O(log N) updates plus lazy deletion — still not O(1).</p>`,
        code: `
      class LFUBrute {
          private final int cap;
          private int time = 0;
          private final Map<Integer, int[]> m = new HashMap<>();  // key -> {value, count, lastUsed}
          LFUBrute(int cap) { this.cap = cap; }
          int get(int key) {
              int[] e = m.get(key);
              if (e == null) return -1;
              e[1]++; e[2] = ++time;
              return e[0];
          }
          void put(int key, int value) {
              if (cap == 0) return;
              int[] e = m.get(key);
              if (e != null) { e[0] = value; e[1]++; e[2] = ++time; return; }
              if (m.size() == cap) {                 // O(N) scan: the wasted work
                  int victim = -1; int[] best = null;
                  for (Map.Entry<Integer, int[]> x : m.entrySet()) {
                      int[] v = x.getValue();
                      if (best == null || v[1] < best[1] || (v[1] == best[1] && v[2] < best[2])) { best = v; victim = x.getKey(); }
                  }
                  m.remove(victim);
              }
              m.put(key, new int[]{value, 1, ++time});
          }
      }`
      },
      mcq: { q: 'After moving a key from count 3 to count 4, bucket 3 is empty and minFreq was 3. What is the new minFreq?', options: ['1', '4', 'We must scan all buckets to find it', '3 (unchanged)'], answer: 1, explain: 'No key has count below 3 (minFreq was 3), bucket 3 is now empty, and our key is in bucket 4 → the minimum is exactly 4. No scan needed.' },
      hints: [
        `<p>Hint 1: Counts only go up by exactly 1, and a new key always has count 1. So the minimum count can be <i>tracked</i> with one integer instead of searched with a heap.</p>`,
        `<p>Hint 2: Keep <code>key → node(value, freq)</code> and <code>freq → list of keys in recency order</code> (LinkedHashSet or a doubly linked list). The victim is the first key of bucket <code>minFreq</code>.</p>`,
        `<p>Hint 3: touch(key): remove from bucket f; if bucket f is empty and f == minFreq, minFreq++; add to end of bucket f+1. put new key when full: evict first of bucket minFreq (also from keyMap), insert with freq 1, minFreq = 1. Guard capacity 0.</p>`
      ],
      solution: {
        approach: `<p>Frequency buckets, each an LRU list, plus a <code>minFreq</code> pointer. <code>get</code>/<code>put</code>-update move a key up one bucket (append to the end = newest). A new key goes into bucket 1 and resets <code>minFreq</code> to 1. Eviction removes the head (oldest) of bucket <code>minFreq</code>. All steps are O(1).</p>`,
        code: `
      class LFUCache {
          private final int cap;
          private int minFreq = 0;
          private final Map<Integer, Integer> vals = new HashMap<>();
          private final Map<Integer, Integer> counts = new HashMap<>();
          private final Map<Integer, LinkedHashSet<Integer>> buckets = new HashMap<>();

          public LFUCache(int capacity) { cap = capacity; }

          public int get(int key) {
              if (!vals.containsKey(key)) return -1;
              touch(key);
              return vals.get(key);
          }

          public void put(int key, int value) {
              if (cap <= 0) return;
              if (vals.containsKey(key)) { vals.put(key, value); touch(key); return; }
              if (vals.size() == cap) {
                  LinkedHashSet<Integer> low = buckets.get(minFreq);
                  int victim = low.iterator().next();      // oldest among least used
                  low.remove(victim);
                  vals.remove(victim);
                  counts.remove(victim);
              }
              vals.put(key, value);
              counts.put(key, 1);
              buckets.computeIfAbsent(1, f -> new LinkedHashSet<>()).add(key);
              minFreq = 1;
          }

          private void touch(int key) {
              int f = counts.get(key);
              LinkedHashSet<Integer> b = buckets.get(f);
              b.remove(key);
              if (b.isEmpty() && f == minFreq) minFreq++;
              counts.put(key, f + 1);
              buckets.computeIfAbsent(f + 1, x -> new LinkedHashSet<>()).add(key);
          }
      }`,
        alt: [{ lang: 'python', code: `
from collections import defaultdict, OrderedDict

class LFUCache:
    def __init__(self, capacity: int):
        self.cap, self.min_freq = capacity, 0
        self.val, self.cnt = {}, {}
        self.buckets = defaultdict(OrderedDict)

    def _touch(self, key):
        f = self.cnt[key]
        del self.buckets[f][key]
        if not self.buckets[f] and f == self.min_freq:
            self.min_freq += 1
        self.cnt[key] = f + 1
        self.buckets[f + 1][key] = None

    def get(self, key: int) -> int:
        if key not in self.val:
            return -1
        self._touch(key)
        return self.val[key]

    def put(self, key: int, value: int) -> None:
        if self.cap <= 0:
            return
        if key in self.val:
            self.val[key] = value
            self._touch(key)
            return
        if len(self.val) == self.cap:
            victim, _ = self.buckets[self.min_freq].popitem(last=False)
            del self.val[victim], self.cnt[victim]
        self.val[key], self.cnt[key] = value, 1
        self.buckets[1][key] = None
        self.min_freq = 1
` }],
        dry: {
          head: ['call', 'buckets (count: keys, oldest first)', 'minFreq', 'result'],
          rows: [
            ['put(1,1)', '1:[1]', '1', '—'],
            ['put(2,2)', '1:[1,2]', '1', '—'],
            ['get(1)', '1:[2] 2:[1]', '1', '1'],
            ['put(3,3)', '1:[3] 2:[1]', '1', '<span class="c-r">evict 2</span>'],
            ['get(3)', '2:[1,3]', '<span class="c-y">2</span>', '3 (bucket 1 emptied)'],
            ['put(4,4)', '1:[4] 2:[3]', '1', '<span class="c-r">evict 1</span> (oldest in bucket 2)'],
            ['get(4)', '2:[3,4]', '2', '4']
          ]
        },
        complexity: `<p><b>Time:</b> O(1) average per call — a fixed number of hash-map and LinkedHashSet operations, and <code>minFreq</code> only ever moves by +1 or resets to 1. <b>Space:</b> O(capacity) keys plus at most O(capacity) non-empty buckets.</p>`,
        followUps: ['Add aging so stale popular keys fade (halve all counts periodically — how do you do that without O(N)?)', 'Implement All O’one Data Structure with the same idea.', 'Why does production prefer W-TinyLFU over exact LFU?']
      }
    }]
  });

  // =====================================================================
  // TOPIC 3 — Skip list
  // =====================================================================
  topics.push({
    title: 'Skip List: A Sorted Linked List with Express Lanes',
    analogy: `<p>A city has a <b>local train</b> that stops at every station, and an <b>express train</b> that stops only at every few big stations, and a <b>super-express</b> that stops at even fewer. To reach station 19, you ride the super-express as far as you can <i>without passing 19</i>, hop down to the express, ride it as far as you can, then take the local for the last stop or two.</p>
      <p>A <b>skip list</b> is exactly that: a sorted linked list (the local line) with extra "express lanes" on top. Which stations get express stops is decided by <b>coin flips</b>, and on average the trip takes about <b>log₂ N</b> rides — as fast as a balanced tree, with much simpler code.</p>`,
    explain: `<p><b>Problem:</b> a sorted linked list is easy to insert into <i>once you know where</i>, but finding the spot takes O(N) because you can only walk one step at a time. Binary search needs random access, which a list does not have.</p>
      <p><b>Fix:</b> stack more lists on top. Level 1 holds every key. Each key is <b>promoted</b> to level 2 with probability ½, to level 3 with probability ¼, and so on (keep flipping a coin while it says heads). So level 2 has about N/2 keys, level 3 about N/4… and there are about <b>log₂ N levels</b>.</p>
      ${H.table(['level', 'keys (example)', 'roughly'], [
        ['L3', '12, 25', 'N/4'],
        ['L2', '6, 12, 19, 25', 'N/2'],
        ['L1', '3, 6, 7, 9, 12, 17, 19, 21, 25, 26', 'N']
      ])}
      <p><b>Search for x</b> (the only algorithm you need — insert and delete reuse it):</p>
      <ol>
        <li>Start at the <b>head</b> on the <b>top</b> level.</li>
        <li>While the next node on this level has key <b>&lt; x</b>, move right.</li>
        <li>When the next key is ≥ x (or there is none), <b>drop down</b> one level.</li>
        <li>After level 1, the next node is either x (found) or not (absent).</li>
      </ol>
      <p><b>Insert x:</b> run the search, but at every level remember the last node you stood on before dropping (array <code>update[]</code>). Flip coins to choose x's height h, then splice x in after <code>update[0..h-1]</code> — just like inserting into h ordinary linked lists. <b>Delete x:</b> same search, then unlink x from every level where <code>update[i].next[i] == x</code>.</p>
      <p><b>Why it is O(log N) expected:</b> on each level you move right only about 1–2 times before dropping (each step right means the node was <i>not</i> promoted — like getting tails), and there are about log₂ N levels. Total ≈ 2 log₂ N comparisons. "Expected" means averaged over the coin flips — <b>no input order</b> can make it slow, only very bad luck.</p>`,
    clues: [
      '"Design a <b>Skiplist</b> without using any built-in libraries" (LeetCode 1206) → multi-level linked list with random heights.',
      '"Ordered map / sorted set with insert, delete, search, and <b>range or rank</b> queries" and balanced trees feel too complex → skip list (Redis sorted sets use one).',
      '"Highly <b>concurrent</b> sorted map" → skip lists are easier to make lock-free than red-black trees (Java <code>ConcurrentSkipListMap</code>).',
      '"Leaderboard: add score, get rank, top K, range by score" → skip list with <b>span</b> counts per pointer (Redis ZSET) or a balanced BST / Fenwick tree.',
      '"In-memory write buffer that must stay sorted for flushing to disk" → LSM-tree memtable (LevelDB/RocksDB use a skip list).',
      '"O(log N) <b>expected</b> / randomized data structure" → skip list or treap.'
    ],
    code: [`
      // Skip list (LeetCode 1206 style): search / add (duplicates allowed) / erase one copy.
      class Skiplist {
          private static final int MAX_LEVEL = 16;      // enough for ~2^16 = 65,536 keys at p = 1/2
          private static final double P = 0.5;          // chance of being promoted one more level

          private static class Node {
              final int val;
              final Node[] next;                        // next[i] = following node on level i
              Node(int val, int levels) { this.val = val; this.next = new Node[levels]; }
          }

          private final Node head = new Node(Integer.MIN_VALUE, MAX_LEVEL);
          private int level = 1;                        // number of levels currently in use
          private final Random rnd = new Random(42);    // fixed seed = repeatable tests

          private int randomLevel() {
              int lvl = 1;
              while (lvl < MAX_LEVEL && rnd.nextDouble() < P) lvl++;   // keep flipping heads
              return lvl;
          }

          // Walk down from the top; update[i] = last node on level i whose value < target.
          private Node[] findPredecessors(int target) {
              Node[] update = new Node[MAX_LEVEL];
              Node cur = head;
              for (int i = level - 1; i >= 0; i--) {
                  while (cur.next[i] != null && cur.next[i].val < target) cur = cur.next[i];  // ride right
                  update[i] = cur;                                                           // then drop down
              }
              return update;
          }

          public boolean search(int target) {
              Node cand = findPredecessors(target)[0].next[0];
              return cand != null && cand.val == target;
          }

          public void add(int num) {
              Node[] update = findPredecessors(num);
              int lvl = randomLevel();
              if (lvl > level) {                         // new top levels start from the head
                  for (int i = level; i < lvl; i++) update[i] = head;
                  level = lvl;
              }
              Node n = new Node(num, lvl);
              for (int i = 0; i < lvl; i++) {            // splice into each of its lanes
                  n.next[i] = update[i].next[i];
                  update[i].next[i] = n;
              }
          }

          public boolean erase(int num) {
              Node[] update = findPredecessors(num);
              Node target = update[0].next[0];
              if (target == null || target.val != num) return false;
              for (int i = 0; i < level; i++) {
                  if (update[i].next[i] != target) break;  // target is not this tall
                  update[i].next[i] = target.next[i];
              }
              while (level > 1 && head.next[level - 1] == null) level--;  // shrink empty top lanes
              return true;
          }
      }`, `
      // In real Java code you rarely hand-roll it: ConcurrentSkipListMap is a lock-free sorted map.
      class LeaderboardDemo {
          public static void main(String[] args) {
              ConcurrentSkipListMap<Integer, String> byScore = new ConcurrentSkipListMap<>(Comparator.reverseOrder());
              byScore.put(1500, "asha");
              byScore.put(1720, "ben");
              byScore.put(1610, "chen");
              System.out.println("top: " + byScore.firstEntry());                // 1720=ben
              System.out.println("first score <= 1650: " + byScore.ceilingKey(1650)); // reversed order -> 1610
              System.out.println("scores 1700..1550: " + byScore.subMap(1700, true, 1550, true)); // {1610=chen}
          }
      }`],
    codeTitle: ['Skip list from scratch (Java)', 'Using the JDK skip list (ConcurrentSkipListMap)'],
    viz: {
      title: 'Skip list search and insert: ride the express lanes, then drop down',
      input: '3 6 7 9 12 17 19 21 25 26 | 19 +15 15 8',
      inputLabel: 'sorted keys | ops (N = search N, +N = insert N)',
      gen: function (input) {
        var parts = splitBar(input, 2, '3 6 7 9 12 | 9 +10');
        var keys = parts[0].split(/[\s,]+/).filter(Boolean).map(function (x) { return toInt(x, 'Key', -99, 999); });
        if (keys.length < 3 || keys.length > 12) throw new Error('Use 3 to 12 keys so the grid fits');
        keys.sort(function (a, b) { return a - b; });
        keys = keys.filter(function (x, i) { return i === 0 || x !== keys[i - 1]; });
        var ops = parts[1].split(/[\s,]+/).filter(Boolean);
        if (!ops.length || ops.length > 5) throw new Error('Give 1 to 5 operations, e.g. 19 +15');
        var MAXL = 4, rnd = lcg(7), frames = [];
        function lvlFor() { var l = 1; while (l < MAXL && rnd() < 0.5) l++; return l; }
        var nodes = keys.map(function (k) { return { k: k, h: lvlFor() }; });
        function grid(hl, label, extraCol) {
          var top = 1; nodes.forEach(function (n) { if (n.h > top) top = n.h; });
          var rows = [], rowHead = [];
          for (var L = top; L >= 1; L--) {
            rowHead.push('L' + L);
            var r = ['H'];
            nodes.forEach(function (n) { r.push(n.h >= L ? n.k : '·'); });
            r.push('∅');
            rows.push(r);
          }
          var colHead = ['head'].concat(nodes.map(function (n, i) { return '#' + i; })).concat(['end']);
          return { type: 'grid', label: label || 'skip list (rows = lanes, top lane first)', rows: rows, rowHead: rowHead, colHead: colHead, hl: hl, top: top };
        }
        var g0 = grid({});
        frames.push({ narr: 'Coin flips gave each key a height. Level 1 has every key; higher lanes have fewer keys (about half each time). <b>' + g0.top + '</b> lanes in use.', parts: [g0, { type: 'vars', label: 'shape', vals: { keys: nodes.length, lanes: g0.top, 'log2(N)': Math.round(Math.log(nodes.length) / Math.LN2 * 10) / 10 } }] });
        ops.forEach(function (raw) {
          var ins = raw.charAt(0) === '+';
          var x = toInt(ins ? raw.slice(1) : raw, 'Operation value', -99, 999);
          var top = 1; nodes.forEach(function (n) { if (n.h > top) top = n.h; });
          var hl = {}, cur = -1, steps = 0, update = [];
          function rowOf(L) { return top - L; }
          function cell(L, idx) { return rowOf(L) + ',' + (idx + 1); }
          hl[rowOf(top) + ',0'] = 'cur';
          frames.push({ narr: (ins ? '<b>insert(' + x + ')</b>: first search for its place, remembering the last node on each lane.' : '<b>search(' + x + ')</b>: start at the head on the top lane L' + top + '.'), parts: [grid(Object.assign({}, hl))] });
          for (var L = top; L >= 1; L--) {
            while (true) {
              var nxt = -1;
              for (var j = cur + 1; j < nodes.length; j++) if (nodes[j].h >= L) { nxt = j; break; }
              steps++;
              var here = cur < 0 ? 'head' : String(nodes[cur].k);
              if (nxt >= 0 && nodes[nxt].k < x) {
                hl[cell(L, nxt)] = 'cur';
                if (cur >= 0) hl[cell(L, cur)] = 'done'; else hl[rowOf(L) + ',0'] = 'done';
                frames.push({ narr: 'Lane L' + L + ': next key ' + nodes[nxt].k + ' &lt; ' + x + ' → <b>ride right</b> from ' + here + ' to ' + nodes[nxt].k + '.', parts: [grid(Object.assign({}, hl)), { type: 'vars', vals: { lane: 'L' + L, at: nodes[nxt].k, comparisons: steps } }] });
                cur = nxt;
              } else {
                var why = nxt < 0 ? 'nothing further on this lane' : 'next key ' + nodes[nxt].k + ' ≥ ' + x;
                if (nxt >= 0) hl[cell(L, nxt)] = 'bad';
                update[L] = here;
                frames.push({ narr: 'Lane L' + L + ': ' + why + ' → <b>' + (L > 1 ? 'drop down' : 'stop') + '</b> at ' + here + '. (update[L' + L + '] = ' + here + ')', parts: [grid(Object.assign({}, hl)), { type: 'vars', vals: { lane: 'L' + L, at: here, comparisons: steps }, hl: { at: 'cur' } }] });
                if (nxt >= 0) delete hl[cell(L, nxt)];
                if (L > 1) { if (cur >= 0) hl[cell(L - 1, cur)] = 'cur'; else hl[rowOf(L - 1) + ',0'] = 'cur'; }
                break;
              }
            }
          }
          var cand = cur + 1 < nodes.length ? nodes[cur + 1] : null;
          var found = !!cand && cand.k === x;
          if (!ins) {
            var fhl = Object.assign({}, hl); if (found) fhl[cell(1, cur + 1)] = 'sel';
            frames.push({ narr: found ? '<span class="c-g">Found ' + x + '</span> after only <b>' + steps + '</b> comparisons (a plain list could need up to ' + nodes.length + ').' : '<span class="c-r">' + x + ' is not present</span>: the next key on L1 is ' + (cand ? cand.k : 'the end') + '. ' + steps + ' comparisons.', parts: [grid(fhl), { type: 'vars', vals: { target: x, found: found, comparisons: steps }, hl: { found: found ? 'ok' : 'bad' } }] });
          } else if (found) {
            frames.push({ narr: x + ' is already present; this demo keeps keys unique, so nothing changes (LeetCode 1206 would add a duplicate).', parts: [grid(hl)] });
          } else {
            var h = lvlFor();
            nodes.splice(cur + 1, 0, { k: x, h: h });
            var nt = 1; nodes.forEach(function (n) { if (n.h > nt) nt = n.h; });
            var nhl = {};
            for (var LL = 1; LL <= h; LL++) nhl[(nt - LL) + ',' + (cur + 2)] = 'ok';
            var up = []; for (var q = 1; q <= h; q++) up.push('L' + q + ': after ' + (update[q] || 'head'));
            frames.push({ narr: 'Coin flips give ' + x + ' height <b>' + h + '</b>. Splice it into lanes L1..L' + h + ' right after the remembered nodes (' + up.join(', ') + '). Each splice is 2 pointer writes.', parts: [grid(nhl), { type: 'vars', vals: { inserted: x, height: h, lanes: nt }, hl: { inserted: 'ok' } }] });
          }
        });
        return frames;
      }
    },
    examples: [
      {
        title: 'Hand-tracing a search for 19',
        html: `<p>Lanes: L3 = {12, 25}, L2 = {6, 12, 19, 25}, L1 = all keys.</p>
          ${H.table(['lane', 'move', 'reason'], [
            ['L3', 'head → 12', '12 &lt; 19'], ['L3', 'drop', 'next 25 ≥ 19'],
            ['L2', 'stay at 12, drop', 'next 19 is not &lt; 19'], ['L1', 'stop at 17', '12 → 17 (17 &lt; 19), next 19 ≥ 19'],
            ['result', H.c('g', 'next is 19 → found'), '5 comparisons instead of 7 walking L1']
          ])}
          <p>With 10 keys the win is small; with 1,000,000 keys it is ~40 comparisons instead of up to 1,000,000.</p>`
      },
      {
        title: 'Expected height and memory, with numbers',
        html: `<p>With p = ½: a node has height 1 with prob ½, height 2 with prob ¼, … Expected pointers per node = 1 + ½ + ¼ + … = <b>2</b>. So N = 1,000,000 keys use about 2,000,000 forward pointers, and the tallest node is about log₂(10<sup>6</sup>) ≈ <b>20</b> lanes.</p>
          <p>Redis uses p = ¼: only 1 + ¼ + 1/16 + … ≈ <b>1.33</b> pointers per node (less memory) at the cost of slightly more steps per lane, with a cap of 32 levels.</p>
          ${H.table(['p', 'pointers / node', 'levels for 10⁶ keys', 'steps per lane'], [['1/2', '2', '≈ 20', '≈ 2'], ['1/4', '1.33', '≈ 10', '≈ 4']])}`
      },
      {
        title: 'Rank queries: the Redis ZSET trick',
        html: `<p>Redis sorted sets (<code>ZADD</code>, <code>ZRANK</code>, <code>ZRANGEBYSCORE</code>) combine a <b>hash table</b> (member → score, O(1) <code>ZSCORE</code>) with a <b>skip list</b> ordered by (score, member). Every forward pointer also stores a <b>span</b>: how many level-1 nodes it jumps over. Summing spans along the search path gives the <b>rank</b> in O(log N), and following spans finds the k-th element.</p>
          ${H.table(['pointer', 'from → to', 'span'], [['L3', 'head → 12', '5'], ['L3', '12 → 25', '4'], ['L1', '12 → 17', '1']])}
          <p>Rank of 17 = 5 + 1 = 6 (1-based).</p>`
      },
      {
        title: 'Skip list vs balanced BST — the honest comparison',
        html: `${H.table(['aspect', 'skip list', 'red-black / AVL tree'], [
            ['search / insert / delete', 'O(log N) expected', 'O(log N) worst case'],
            ['code size', 'small (≈ 60 lines)', 'large (rotations, colour cases)'],
            ['concurrency', 'lock-free versions are practical', 'hard (rotations touch many nodes)'],
            ['cache friendliness', 'poor (pointer chasing)', 'poor too; B-trees win on disk'],
            ['range scan', 'walk level 1 — trivial', 'in-order traversal']
          ])}<p>Interview line: "I'd use a skip list when I need a concurrent sorted map or simpler code, and a B-tree when data lives on disk."</p>`
      }
    ],
    deepDive: `<p><b>Why the expected search cost is ~2 log₂ N (backwards analysis).</b> Trace the search path <i>backwards</i> from the bottom. At each node, the path came either from the left or from above. It came from above exactly when that node was promoted (probability p). So each step backwards climbs a level with probability p and moves left with 1−p — the expected number of left-moves before a climb is (1−p)/p = 1 for p = ½. Over about log₁/ₚ N levels that is ≈ (1/p)·log₁/ₚ N total steps → <b>2 log₂ N</b> for p = ½. The probability that some search takes more than c·log N steps falls off exponentially in c (it holds "with high probability").</p>
      <p><b>MAX_LEVEL.</b> Choose ≈ log₁/ₚ(max N). Too small → top lanes get crowded → slow. Too large → wasted head pointers only (cheap). The <code>level</code> variable tracks lanes actually in use so searches do not start from empty lanes.</p>
      <p><b>Adversaries.</b> Because heights come from the random generator, no insertion order can unbalance it — unlike a plain BST that degenerates on sorted input. But if an attacker can <i>predict</i> your RNG (fixed seed in production!) they could craft bad cases; real systems seed randomly.</p>
      <p><b>Concurrency.</b> Insertion only splices pointers bottom-up, so a reader that sees a partially inserted node still sees a valid sorted list on every lane. Java's <code>ConcurrentSkipListMap</code> (Doug Lea) uses CAS on <code>next</code> pointers and marker nodes for deletion — no locks. This is the main reason LSM databases (LevelDB, RocksDB memtables) and Redis-like systems pick skip lists.</p>
      <p><b>Deterministic cousins:</b> the <b>1-2-3 skip list</b> keeps gaps between 1 and 3 and gives worst-case O(log N) (it is basically a B-tree of order 4 in disguise).</p>`,
    aiEra: `<p><b>What AI changes:</b> an assistant can generate a skip list instantly, but its code often has subtle bugs: forgetting to set <code>update[i] = head</code> for new top lanes, not shrinking <code>level</code> after deletes, or erasing a duplicate from some lanes but not others. Review it with a property test against <code>TreeMap</code> (random adds/erases, compare contents after each step).</p>
      <p><b>Where you will meet skip lists in AI-era systems:</b> the memtable of RocksDB under vector and feature stores, Redis sorted sets for rate limits and leaderboards, and — conceptually — <b>HNSW</b> (Hierarchical Navigable Small World), the most popular approximate nearest-neighbour index in vector databases. HNSW is literally a "skip list for graphs": random layer assignment with exponentially fewer nodes per layer, greedy search on the top layer, then drop down. Knowing skip lists makes HNSW click in five minutes.</p>
      <p><b>Use AI as a partner:</b> <code>Explain why my skip list search visits ~2 log N nodes; then give me a seed where it is slow</code>. <b>What you must still own:</b> the expected-vs-worst-case distinction and when to choose it over a tree.</p>`,
    problems: [{
      title: 'Design Skiplist', level: 'Hard', tags: ['design', 'linked list', 'randomized'], companies: ['Google', 'Amazon', 'Twitter'],
      statement: `<p>Implement a skip list without built-in sorted structures: <code>search(target)</code> returns whether it exists, <code>add(num)</code> inserts (duplicates allowed), <code>erase(num)</code> removes <b>one</b> copy and returns whether anything was removed. Each operation should be O(log N) expected.</p>`,
      constraints: `0 ≤ num, target ≤ 2·10<sup>4</sup>; at most 5·10<sup>4</sup> calls in total.`,
      example: `<p><code>add(1) add(2) add(3) search(0)→${H.c('r', 'false')} add(4) search(1)→${H.c('g', 'true')} erase(0)→${H.c('r', 'false')} erase(1)→${H.c('g', 'true')} search(1)→false</code></p><p>After erasing the only 1, it is gone from every lane it lived on.</p>`,
      brute: {
        why: `<p>A single sorted linked list: search walks from the head (O(N)), insert walks to the spot (O(N)). With 5·10<sup>4</sup> calls on up to 5·10<sup>4</sup> elements that is about 2.5·10<sup>9</sup> steps in the worst case. The wasted work: we visit every node even though we only need to "jump" close to the target.</p>`,
        code: `
      class SortedListBrute {
          private static class N { int v; N next; N(int v) { this.v = v; } }
          private final N head = new N(Integer.MIN_VALUE);
          boolean search(int t) {
              N c = head.next;
              while (c != null && c.v < t) c = c.next;   // O(N) walk
              return c != null && c.v == t;
          }
          void add(int x) {
              N c = head;
              while (c.next != null && c.next.v < x) c = c.next;
              N n = new N(x); n.next = c.next; c.next = n;
          }
          boolean erase(int x) {
              N c = head;
              while (c.next != null && c.next.v < x) c = c.next;
              if (c.next == null || c.next.v != x) return false;
              c.next = c.next.next;
              return true;
          }
      }`
      },
      mcq: { q: 'During insert, what does update[i] hold?', options: ['The new node\'s height', 'The last node on lane i whose value is less than the new key', 'The first node on lane i greater than the key', 'A copy of lane i'], answer: 1, explain: 'It is where the search dropped down from lane i — the new node must be spliced right after it on that lane.' },
      hints: [
        `<p>Hint 1: Every operation starts with the same walk: from the top lane, move right while the next value is &lt; target, then drop down. Write it once and record the drop-down node of each lane.</p>`,
        `<p>Hint 2: Node = value + array <code>next[]</code> of size = its height. Head has MAX_LEVEL pointers. Height = 1 + number of consecutive coin-flip heads (cap at MAX_LEVEL).</p>`,
        `<p>Hint 3: add: walk → pick height h → if h &gt; current level, the extra update[] entries are head → splice on lanes 0..h-1. erase: walk → candidate = update[0].next[0]; if it matches, for each lane where update[i].next[i] == candidate, bypass it. Duplicates are fine: erase just removes the first copy found.</p>`
      ],
      solution: {
        approach: `<p>Multi-lane linked list with random heights. One helper walks from the top lane down and returns the predecessor on each lane. Search checks the level-0 successor; add splices a new node of random height after the predecessors; erase bypasses the level-0 successor on every lane where it appears.</p>`,
        code: `
      class Skiplist {
          private static final int MAX = 16;
          private static class Node {
              int val; Node[] next;
              Node(int v, int h) { val = v; next = new Node[h]; }
          }
          private final Node head = new Node(-1, MAX);
          private int level = 1;
          private final Random rnd = new Random();

          private Node[] preds(int t) {
              Node[] up = new Node[MAX];
              Node c = head;
              for (int i = level - 1; i >= 0; i--) {
                  while (c.next[i] != null && c.next[i].val < t) c = c.next[i];
                  up[i] = c;
              }
              return up;
          }

          public boolean search(int target) {
              Node n = preds(target)[0].next[0];
              return n != null && n.val == target;
          }

          public void add(int num) {
              Node[] up = preds(num);
              int h = 1;
              while (h < MAX && rnd.nextBoolean()) h++;
              for (int i = level; i < h; i++) up[i] = head;
              level = Math.max(level, h);
              Node n = new Node(num, h);
              for (int i = 0; i < h; i++) { n.next[i] = up[i].next[i]; up[i].next[i] = n; }
          }

          public boolean erase(int num) {
              Node[] up = preds(num);
              Node t = up[0].next[0];
              if (t == null || t.val != num) return false;
              for (int i = 0; i < level && up[i].next[i] == t; i++) up[i].next[i] = t.next[i];
              while (level > 1 && head.next[level - 1] == null) level--;
              return true;
          }
      }`,
        alt: [{ lang: 'python', code: `
import random

class Node:
    __slots__ = ("val", "nxt")
    def __init__(self, val, h):
        self.val, self.nxt = val, [None] * h

class Skiplist:
    MAX = 16
    def __init__(self):
        self.head = Node(-1, self.MAX)
        self.level = 1

    def _preds(self, t):
        up, c = [None] * self.MAX, self.head
        for i in range(self.level - 1, -1, -1):
            while c.nxt[i] and c.nxt[i].val < t:
                c = c.nxt[i]
            up[i] = c
        return up

    def search(self, target: int) -> bool:
        n = self._preds(target)[0].nxt[0]
        return n is not None and n.val == target

    def add(self, num: int) -> None:
        up = self._preds(num)
        h = 1
        while h < self.MAX and random.random() < 0.5:
            h += 1
        for i in range(self.level, h):
            up[i] = self.head
        self.level = max(self.level, h)
        n = Node(num, h)
        for i in range(h):
            n.nxt[i], up[i].nxt[i] = up[i].nxt[i], n

    def erase(self, num: int) -> bool:
        up = self._preds(num)
        t = up[0].nxt[0]
        if t is None or t.val != num:
            return False
        i = 0
        while i < self.level and up[i].nxt[i] is t:
            up[i].nxt[i] = t.nxt[i]
            i += 1
        while self.level > 1 and self.head.nxt[self.level - 1] is None:
            self.level -= 1
        return True
` }],
        dry: {
          head: ['call', 'walk / predecessors', 'height (coin flips)', 'result'],
          rows: [
            ['add(1)', 'up[0]=head', '1 (T)', 'L1: 1'],
            ['add(2)', 'up[0]=1', '2 (H,T)', 'L1: 1,2 · L2: 2'],
            ['add(3)', 'up[1]=2, up[0]=2', '1', 'L1: 1,2,3 · L2: 2'],
            ['search(0)', 'L2: head (2 ≥ 0) · L1: head (1 ≥ 0)', '—', '<span class="c-r">false</span>'],
            ['add(4)', 'up[1]=2, up[0]=3', '1', 'L1: 1,2,3,4'],
            ['erase(1)', 'up[0]=head, candidate 1', '—', '<span class="c-g">true</span>, bypass on L1'],
            ['search(1)', 'L1: next of head is 2', '—', '<span class="c-r">false</span>']
          ]
        },
        complexity: `<p><b>Time:</b> O(log N) expected per operation (≈ 2 log₂ N comparisons), O(N) in the astronomically unlikely worst case. <b>Space:</b> O(N) expected (≈ 2N pointers for p = ½).</p>`,
        followUps: ['Add getRank(x) and kth(k) using span counts.', 'Why does Redis use p = 1/4?', 'How would you make insert lock-free?']
      }
    }]
  });

  // =====================================================================
  // TOPIC 4 — Bloom filter
  // =====================================================================
  topics.push({
    title: 'Bloom Filter: "Definitely Not" or "Probably Yes" in a Few Bits',
    analogy: `<p>A nightclub bouncer cannot memorise 10,000 banned faces. Instead he has a wall of <b>100 light switches</b>. For every banned person, he looks at 3 features (height, hair, jacket colour), turns each into a switch number, and flips those 3 switches <b>on</b>. When someone arrives, he checks their 3 switches: if <b>any</b> is off, this person was <b>definitely never banned</b> → let them in. If <b>all</b> are on, they are <b>probably</b> banned → do the slow, careful ID check.</p>
      <p>He can be fooled into a slow check now and then (other people turned those switches on), but he <b>never</b> lets a banned person through. That is a <b>Bloom filter</b>: tiny memory, no false negatives, a small tunable rate of false positives.</p>`,
    explain: `<p>A <b>Bloom filter</b> answers "have I seen this item before?" using a <b>bit array of size m</b> (all 0 at first) and <b>k hash functions</b> (each turns an item into a position 0..m−1).</p>
      <ul>
        <li><b>add(x):</b> compute the k positions and set those bits to 1.</li>
        <li><b>mightContain(x):</b> compute the k positions. If <b>any</b> bit is 0 → x was <b>definitely not</b> added. If all are 1 → x was <b>probably</b> added (or other items happened to set those bits — a <b>false positive</b>).</li>
      </ul>
      <p><b>Tiny example</b> (m = 12, k = 2): add "cat" → bits 2, 7. add "dog" → bits 7, 10. Query "cow" → bits 2, 10: both are 1, but cow was never added → false positive! Query "owl" → bits 4, 7: bit 4 is 0 → definitely not.</p>
      ${H.bits(1156, 12, { label: 'bits after cat, dog', hl: { 2: 'g', 7: 'g', 10: 'g' }, dec: false })}
      <p><b>The three numbers you must know</b> (n = items added, m = bits, k = hash functions, p = false-positive rate):</p>
      ${H.table(['formula', 'plain meaning', 'worked numbers (n = 1,000,000, p = 1%)'], [
        ['p ≈ (1 − e<sup>−kn/m</sup>)<sup>k</sup>', 'chance all k bits are already 1', '—'],
        ['m = −n · ln p / (ln 2)<sup>2</sup>', 'bits needed for a target p', 'm ≈ 9.59 million bits ≈ <b>1.2 MB</b>'],
        ['k = (m / n) · ln 2', 'best number of hashes', 'k ≈ 9.6 × 0.693 ≈ <b>7</b>']
      ])}
      <p>Rule of thumb: about <b>10 bits per item for 1%</b>, and each extra ~4.8 bits per item cuts the error by 10× (≈ 14.4 bits → 0.1%). Compare that with a HashSet of 1,000,000 URLs at ~100 bytes each ≈ 100 MB — the Bloom filter is <b>~80× smaller</b>.</p>
      <p><b>What it cannot do:</b> list the items, count them exactly, or <b>delete</b> (clearing a bit might erase evidence of another item). For deletes use a <b>counting Bloom filter</b> (small counters instead of bits) or a <b>cuckoo filter</b>.</p>`,
    clues: [
      '"Check membership in a <b>huge set</b> with <b>very little memory</b>; occasional false positives are OK" → Bloom filter.',
      '"<b>Avoid expensive lookups</b> (disk, network, database) for keys that do not exist" → put a Bloom filter in front: "definitely not" skips the lookup.',
      '"Has this user already seen this article / URL / username?" at web scale → Bloom filter (or cuckoo filter if you must delete).',
      '"False negatives are <b>not</b> allowed, false positives are" → exactly the Bloom filter guarantee.',
      '"Estimate memory for 1 billion items at 1% error" → ~9.6 bits/item ≈ 1.2 GB; k ≈ 7.',
      '"Need deletes" → counting Bloom filter or cuckoo filter; "set grows without bound" → scalable Bloom filter (chain of filters with tighter p).'
    ],
    code: [`
      // A Bloom filter with double hashing: position_i = h1 + i * h2 (mod m)  [Kirsch & Mitzenmacher].
      class BloomFilter {
          private final BitSet bits;
          private final int m, k;

          // Size the filter from the expected item count n and target false-positive rate p.
          BloomFilter(int n, double p) {
              this.m = (int) Math.ceil(-n * Math.log(p) / (Math.log(2) * Math.log(2)));
              this.k = Math.max(1, (int) Math.round((double) m / n * Math.log(2)));
              this.bits = new BitSet(m);
          }

          private int h1(String s) { return s.hashCode(); }

          private int h2(String s) {                 // FNV-1a: a second, independent-ish hash
              int h = 0x811C9DC5;
              for (int i = 0; i < s.length(); i++) { h ^= s.charAt(i); h *= 16777619; }
              return h | 1;                          // odd step so positions differ for every i
          }

          private int index(String s, int i) {
              int combined = h1(s) + i * h2(s);
              return Math.floorMod(combined, m);     // floorMod: never negative
          }

          void add(String s) {
              for (int i = 0; i < k; i++) bits.set(index(s, i));
          }

          boolean mightContain(String s) {
              for (int i = 0; i < k; i++)
                  if (!bits.get(index(s, i))) return false;   // a single 0 bit = definitely absent
              return true;                                      // all 1 = probably present
          }

          public static void main(String[] args) {
              BloomFilter f = new BloomFilter(1000, 0.01);
              for (int i = 0; i < 1000; i++) f.add("user" + i);
              int fp = 0;
              for (int i = 1000; i < 11000; i++) if (f.mightContain("user" + i)) fp++;
              System.out.println("m=" + f.m + " bits, k=" + f.k + ", measured FP rate = " + fp / 10000.0);
              System.out.println("user42 -> " + f.mightContain("user42"));   // always true: no false negatives
          }
      }`, { lang: 'python', run: true, title: 'Measure the false-positive rate yourself (runnable Python)', code: `
import math, hashlib

class Bloom:
    def __init__(self, n, p):
        self.m = math.ceil(-n * math.log(p) / (math.log(2) ** 2))
        self.k = max(1, round(self.m / n * math.log(2)))
        self.bits = bytearray((self.m + 7) // 8)

    def _positions(self, item):
        d = hashlib.sha256(item.encode()).digest()
        h1 = int.from_bytes(d[:8], "big")
        h2 = int.from_bytes(d[8:16], "big") | 1
        return [(h1 + i * h2) % self.m for i in range(self.k)]

    def add(self, item):
        for pos in self._positions(item):
            self.bits[pos // 8] |= 1 << (pos % 8)

    def might_contain(self, item):
        return all(self.bits[p // 8] >> (p % 8) & 1 for p in self._positions(item))

for target in (0.1, 0.01, 0.001):
    b = Bloom(5000, target)
    for i in range(5000):
        b.add("url" + str(i))
    fp = sum(b.might_contain("other" + str(i)) for i in range(20000))
    print("target", target, "| m =", b.m, "bits (", round(b.m / 5000, 1), "per item ) k =", b.k,
          "| measured", round(fp / 20000, 4))
` }],
    codeTitle: ['Bloom filter with double hashing (Java)', 'Python experiment: target vs measured FP rate'],
    viz: {
      title: 'Bloom filter: set k bits per word, then test words against the bit array',
      input: '24 3 | cat dog fox emu | cat cow owl ant fox',
      inputLabel: 'm k | words to add | words to check',
      gen: function (input) {
        var parts = splitBar(input, 3, '24 3 | cat dog | cat cow');
        var mk = parts[0].split(/\s+/);
        if (mk.length !== 2) throw new Error('First part must be "m k", e.g. 24 3');
        var m = toInt(mk[0], 'm (bits)', 8, 32), k = toInt(mk[1], 'k (hashes)', 1, 6);
        var adds = parts[1].split(/[\s,]+/).filter(Boolean), checks = parts[2].split(/[\s,]+/).filter(Boolean);
        if (!adds.length || adds.length > 8) throw new Error('Add 1 to 8 words');
        if (!checks.length || checks.length > 8) throw new Error('Check 1 to 8 words');
        function pos(w) { var a = fnv(w), b = djb2(w) | 1, r = []; for (var i = 0; i < k; i++) r.push(((a + i * b) >>> 0) % m); return r; }
        var value = 0, frames = [], added = [];
        function ones() { var c = 0; for (var i = 0; i < m; i++) if ((value >>> i) & 1) c++; return c; }
        function est() { var n = added.length; return Math.round(Math.pow(1 - Math.exp(-k * n / m), k) * 1000) / 10; }
        frames.push({ narr: 'An empty filter: <b>' + m + '</b> bits, all 0, and <b>' + k + '</b> hash functions. Each word will light up ' + k + ' bits.', parts: [{ type: 'bits', label: 'bit array (position under each bit)', value: 0, width: m, showDec: false }, { type: 'vars', vals: { m: m, k: k, added: 0 } }] });
        adds.forEach(function (w) {
          var ps = pos(w), hl = {}, fresh = [];
          ps.forEach(function (p) { var was = (value >>> p) & 1; hl[p] = was ? 'cur' : 'ok'; if (!was) fresh.push(p); });
          ps.forEach(function (p) { value = (value | (1 << p)) >>> 0; });
          added.push(w);
          frames.push({ narr: '<b>add("' + w + '")</b>: hashes → positions <b>' + ps.join(', ') + '</b>. Set them to 1' + (fresh.length < ps.length ? ' (amber ones were already 1 — shared with another word)' : '') + '.', parts: [
            { type: 'bits', label: 'bit array', value: value, width: m, hl: hl, showDec: false },
            { type: 'set', label: 'items added (the filter does NOT store these)', items: added.slice(), hl: one(w, 'ok') },
            { type: 'vars', vals: { 'bits set': ones() + ' / ' + m, 'fill %': Math.round(ones() / m * 100), 'est. FP %': est() } }
          ] });
        });
        checks.forEach(function (w) {
          var ps = pos(w), hl = {}, zero = -1;
          ps.forEach(function (p) { var b = (value >>> p) & 1; hl[p] = b ? 'win' : 'bad'; if (!b && zero < 0) zero = p; });
          var really = added.indexOf(w) >= 0, verdict, cls;
          if (zero >= 0) { verdict = '<span class="c-g">DEFINITELY NOT</span> — bit ' + zero + ' is 0, and adding "' + w + '" would have set it.'; cls = 'ok'; }
          else if (really) { verdict = '<span class="c-b">PROBABLY YES</span> — all ' + k + ' bits are 1, and "' + w + '" really was added (true positive).'; cls = 'sel'; }
          else { verdict = '<span class="c-r">PROBABLY YES — but wrong!</span> Other words happened to set all ' + k + ' bits: a <b>false positive</b>.'; cls = 'bad'; }
          frames.push({ narr: '<b>mightContain("' + w + '")</b>: positions ' + ps.join(', ') + '. ' + verdict, parts: [
            { type: 'bits', label: 'bit array (blue = 1 at a checked spot, red = 0)', value: value, width: m, hl: hl, showDec: false },
            { type: 'set', label: 'ground truth (for teaching only)', items: added.slice(), hl: really ? one(w, 'sel') : {} },
            { type: 'vars', vals: { query: w, verdict: zero >= 0 ? 'no' : 'maybe', truth: really ? 'added' : 'never added' }, hl: { verdict: cls } }
          ] });
        });
        frames.push({ narr: 'Summary: ' + added.length + ' words in ' + m + ' bits. Formula estimate of the false-positive rate (1 − e<sup>−kn/m</sup>)<sup>k</sup> ≈ <b>' + est() + '%</b>. Bigger m or the right k lowers it; a "no" is always trustworthy.', parts: [{ type: 'bits', label: 'final bit array', value: value, width: m, showDec: false }, { type: 'vars', vals: { n: added.length, m: m, k: k, 'best k = (m/n)·ln2': Math.round(m / Math.max(1, added.length) * 0.693 * 10) / 10, 'est. FP %': est() } }] });
        return frames;
      }
    },
    examples: [
      {
        title: 'Sizing a filter for 100 million usernames',
        html: `<p>Signup page: "is this username taken?" We want p = 0.1% so only 1 in 1000 free names hits the database.</p>
          ${H.table(['step', 'calculation', 'result'], [
            ['bits per item', '−ln(0.001) / (ln 2)² = 6.91 / 0.48', '≈ 14.4'],
            ['total bits', '14.4 × 10<sup>8</sup>', '1.44 × 10<sup>9</sup> bits ≈ <b>180 MB</b>'],
            ['hash functions', '14.4 × 0.693', 'k ≈ <b>10</b>'],
            ['vs HashSet', '10<sup>8</sup> × ~60 B', '≈ 6 GB']
          ])}
          <p>Fits comfortably in RAM on one server; replicas can each hold a copy.</p>`
      },
      {
        title: 'LSM databases skip disk reads with Bloom filters',
        html: `<p>Cassandra, HBase, RocksDB and LevelDB store data in many immutable sorted files (SSTables). A read for key K might have to check 10 files. Each file carries a Bloom filter (RocksDB default ≈ 10 bits/key → ~1% FP). The read asks each filter first; only files that say "maybe" are opened. For a missing key, ~99% of disk reads are avoided.</p>
          ${H.table(['SSTable', 'filter says', 'disk read?'], [['L0-a', 'no', H.c('g', 'skipped')], ['L1-c', 'no', H.c('g', 'skipped')], ['L2-f', 'maybe', H.c('y', 'read → key found')]])}`
      },
      {
        title: 'Union and intersection with bitwise OR / AND',
        html: `<p>Two filters with the <b>same m, k and hash functions</b> can be merged: <code>union = A | B</code> (exactly the filter you would get by adding both sets). <code>A &amp; B</code> approximates intersection (it may have more false positives than building it directly). Great for merging per-shard filters in a distributed crawler.</p>
          ${H.bits(0b101100100010, 12, { label: 'A', dec: false })}${H.bits(0b001001100100, 12, { label: 'B', dec: false })}${H.bits(0b101101100110, 12, { label: 'A | B', dec: false, hl: { 2: 'g', 6: 'g' } })}`
      },
      {
        title: 'Counting Bloom filter for deletes',
        html: `<p>Replace each bit with a small counter (4 bits is the classic choice). add → increment k counters; delete → decrement them; query → all k counters &gt; 0? Cost: 4× the memory. Danger: deleting an item that was never added corrupts the filter, so only delete what you know you inserted.</p>
          ${H.arr([0, 1, 2, 0, 1, 0], { label: 'counters after add(a), add(b)', hl: { 2: 'y' } })}${H.arr([0, 0, 1, 0, 1, 0], { label: 'after delete(a)', hl: { 1: 'g', 2: 'g' } })}`
      }
    ],
    deepDive: `<p><b>Where the formula comes from.</b> After inserting n items with k hashes each, a specific bit is still 0 with probability (1 − 1/m)<sup>kn</sup> ≈ e<sup>−kn/m</sup>. A false positive needs all k probed bits to be 1: (1 − e<sup>−kn/m</sup>)<sup>k</sup>. Minimising over k gives k = (m/n) ln 2, at which point <b>exactly half the bits are 1</b> — a nice sanity check for a well-tuned filter in production (monitor the fill ratio!).</p>
      <p><b>Hash functions.</b> You do not need k independent hashes: <b>double hashing</b> g<sub>i</sub>(x) = h<sub>1</sub>(x) + i·h<sub>2</sub>(x) mod m gives the same asymptotic false-positive rate (Kirsch–Mitzenmacher, 2006). Use fast non-cryptographic hashes (MurmurHash3, xxHash); Guava's <code>BloomFilter</code> uses 128-bit Murmur split into two 64-bit halves. Do <i>not</i> use Java's <code>String.hashCode</code> alone in production — it is weak and attackers can craft collisions.</p>
      <p><b>Overfilling.</b> If you add far more than the planned n, p rises quickly (at 2n, a 1% filter becomes ~16%). Fixes: <b>scalable Bloom filters</b> (add a new, larger filter with a tighter p when the current one fills; query all), or rebuild.</p>
      <p><b>Cache behaviour.</b> k random bit probes = k cache misses. <b>Blocked Bloom filters</b> put all k bits for an item inside one 64-byte cache line (one miss) at a small accuracy cost; RocksDB's newer filters and many databases use this.</p>
      <p><b>Alternatives:</b> <b>cuckoo filter</b> (stores small fingerprints, supports delete, better than Bloom below ~3% FP), <b>quotient filter</b>, <b>xor / binary fuse filters</b> (static sets, ~1.23 × log₂(1/p) bits per item — smaller than Bloom's 1.44 ×). Cousins in the "probabilistic sketch" family: <b>Count-Min Sketch</b> (approximate counts, used in TinyLFU), <b>HyperLogLog</b> (approximate distinct count with ~1.6% error in 12 KB, Redis <code>PFCOUNT</code>).</p>
      <p><b>Privacy note:</b> Bloom filters leak information (anyone holding the filter can test guesses), which is why Bitcoin's BIP37 filtering was abandoned for wallet privacy.</p>`,
    aiEra: `<p><b>What AI changes:</b> generating Bloom filter code is trivial; <b>sizing</b> it and explaining the guarantee is what interviews test now. Expect "we have 2 billion items and 4 GB, what error rate do we get?" — practise the arithmetic by hand (4 GB = 3.2·10<sup>10</sup> bits → 16 bits/item → p ≈ 0.6185<sup>16</sup> ≈ 0.05%).</p>
      <p><b>In AI pipelines:</b> training-data <b>deduplication</b> (has this document/n-gram been seen?) at trillion-token scale uses Bloom filters and MinHash; web crawlers for LLM datasets keep "visited URL" filters; RAG ingestion skips already-embedded chunks with one. LLM output filters can check "is this exact string in the training set / a banned list" cheaply.</p>
      <p><b>Use AI as a partner:</b> <code>Given n = 5e8 and 1 GB, compute m, best k and FP rate, show steps</code> — then verify the numbers yourself. <b>Where AI goes wrong:</b> claims Bloom filters can have false negatives, suggests deleting by clearing bits, or uses k hashes that are the same hash with different seeds incorrectly combined (e.g. <code>hashCode() % m</code> k times).</p>`,
    problems: [{
      title: 'Implement a Bloom Filter', level: 'Medium', tags: ['design', 'hashing', 'bit manipulation', 'probabilistic'], companies: ['Google', 'Amazon', 'Databricks', 'Cloudflare'],
      statement: `<p>Implement <code>BloomFilter(int m, int k)</code> with <code>add(String s)</code> and <code>boolean mightContain(String s)</code>. Use the positions <code>(h1 + i·h2) mod m</code> for i = 0..k−1, where <code>h1 = s.hashCode()</code> and <code>h2</code> is the FNV-1a hash of s forced to be odd. <code>mightContain</code> must never return false for an added string. Also implement <code>double estimatedFpRate()</code> using the number of items added so far.</p>`,
      constraints: `1 ≤ m ≤ 10<sup>8</sup>, 1 ≤ k ≤ 16, up to 10<sup>6</sup> operations, strings up to 100 chars.`,
      example: `<p>m = 16, k = 2. Suppose add("cat") sets bits {3, 9}, add("dog") sets {9, 14}. Then mightContain("cat") → ${H.c('g', 'true')}; a word hashing to {3, 14} → ${H.c('r', 'true (false positive)')}; a word hashing to {5, 9} → ${H.c('g', 'false')} because bit 5 is 0.</p>`,
      brute: {
        why: `<p>Store every string in a <code>HashSet</code>: exact answers, but memory is ~40–100 bytes per string (object header, char array, table slot). For 10<sup>9</sup> strings that is ~60 GB vs ~1.2 GB for a 1% Bloom filter. The wasted resource here is <b>memory</b>, not time.</p>`,
        code: `
      class ExactSet {
          private final Set<String> seen = new HashSet<>();   // exact but memory-hungry
          void add(String s) { seen.add(s); }
          boolean mightContain(String s) { return seen.contains(s); }
      }`
      },
      mcq: { q: 'mightContain(x) finds one of x\'s k bits equal to 0. What can you conclude?', options: ['x was probably added', 'x was definitely never added', 'x was added and later deleted', 'Nothing — try again with more hashes'], answer: 1, explain: 'Adding x would have set all its k bits to 1, and bits are never cleared. One 0 bit proves x was never added — Bloom filters have no false negatives.' },
      hints: [
        `<p>Hint 1: The only state is a bit array of size m (use <code>java.util.BitSet</code> or a <code>long[]</code>) and a counter of items added — you never store the strings themselves.</p>`,
        `<p>Hint 2: Compute both hashes once per call, then loop i = 0..k−1 with <code>Math.floorMod(h1 + i * h2, m)</code> — floorMod avoids negative indices from overflow.</p>`,
        `<p>Hint 3: add: set all k bits, n++. mightContain: return false at the first 0 bit, else true. estimatedFpRate = (1 − e<sup>−k·n/m</sup>)<sup>k</sup>. Edge: the same string added twice increases n in this simple version (an overestimate, which is the safe direction).</p>`
      ],
      solution: {
        approach: `<p>Bit array + double hashing. Each string maps to k positions derived from two base hashes; add sets them, query checks them. Because bits only ever turn on, any 0 among the k positions is proof of absence. The estimate uses the classic formula with the running count n.</p>`,
        code: `
      class BloomFilter {
          private final BitSet bits;
          private final int m, k;
          private long n = 0;

          public BloomFilter(int m, int k) {
              this.m = m;
              this.k = k;
              this.bits = new BitSet(m);
          }

          private static int fnv1a(String s) {
              int h = 0x811C9DC5;
              for (int i = 0; i < s.length(); i++) { h ^= s.charAt(i); h *= 16777619; }
              return h;
          }

          public void add(String s) {
              int h1 = s.hashCode(), h2 = fnv1a(s) | 1;
              for (int i = 0; i < k; i++) bits.set(Math.floorMod(h1 + i * h2, m));
              n++;
          }

          public boolean mightContain(String s) {
              int h1 = s.hashCode(), h2 = fnv1a(s) | 1;
              for (int i = 0; i < k; i++)
                  if (!bits.get(Math.floorMod(h1 + i * h2, m))) return false;  // proof of absence
              return true;
          }

          public double estimatedFpRate() {
              return Math.pow(1 - Math.exp(-(double) k * n / m), k);
          }
      }`,
        alt: [{ lang: 'python', code: `
import math

class BloomFilter:
    def __init__(self, m: int, k: int):
        self.m, self.k, self.n = m, k, 0
        self.bits = bytearray((m + 7) // 8)

    @staticmethod
    def _fnv1a(s: str) -> int:
        h = 0x811C9DC5
        for ch in s:
            h ^= ord(ch)
            h = (h * 16777619) & 0xFFFFFFFF
        return h

    def _positions(self, s):
        h1, h2 = hash(s), self._fnv1a(s) | 1
        return [(h1 + i * h2) % self.m for i in range(self.k)]

    def add(self, s: str) -> None:
        for p in self._positions(s):
            self.bits[p >> 3] |= 1 << (p & 7)
        self.n += 1

    def might_contain(self, s: str) -> bool:
        return all(self.bits[p >> 3] >> (p & 7) & 1 for p in self._positions(s))

    def estimated_fp_rate(self) -> float:
        return (1 - math.exp(-self.k * self.n / self.m)) ** self.k
` }],
        dry: {
          head: ['call', 'positions (k = 2, m = 16)', 'bits set after', 'answer'],
          rows: [
            ['add("cat")', '3, 9', '{3, 9}', '—'],
            ['add("dog")', '9, 14', '{3, 9, 14}', '— (bit 9 shared)'],
            ['mightContain("cat")', '3, 9', 'unchanged', '<span class="c-g">true</span>'],
            ['mightContain("emu")', '5, 9', 'unchanged', '<span class="c-g">false</span> (bit 5 = 0)'],
            ['mightContain("yak")', '3, 14', 'unchanged', '<span class="c-r">true — false positive</span>'],
            ['estimatedFpRate()', 'n = 2', '—', '(1 − e<sup>−4/16</sup>)<sup>2</sup> ≈ 0.049']
          ]
        },
        complexity: `<p><b>Time:</b> O(k + |s|) per add/query (hashing the string plus k bit operations). <b>Space:</b> m bits — independent of how long the strings are.</p>`,
        followUps: ['Support deletes (counting Bloom filter — how many bits per counter?).', 'The filter is overfilling in production. What do you monitor and how do you grow it?', 'Merge filters from 100 crawler shards.']
      }
    }]
  });

  // =====================================================================
  // TOPIC 5 — Consistent hashing ring
  // =====================================================================
  topics.push({
    title: 'Consistent-Hash Ring: Add or Remove Servers Without Reshuffling Everything',
    analogy: `<p>Picture a <b>round table</b> with a few waiters standing at fixed spots around the edge. Each guest sits somewhere on the table's edge and is served by the <b>first waiter clockwise</b> from their seat. When a new waiter joins and stands between two others, only the guests in that one small arc switch to the new waiter — everyone else keeps their waiter. When a waiter leaves, only <i>their</i> guests walk a little further clockwise to the next waiter.</p>
      <p>Compare that with "guest number mod number-of-waiters": add one waiter and almost <b>every guest</b> gets a different waiter. That chaos — for a cache cluster it means nearly every cached item is suddenly in the wrong place — is what <b>consistent hashing</b> avoids.</p>`,
    explain: `<p><b>The problem.</b> You spread keys over N cache servers with <code>server = hash(key) % N</code>. It works until N changes. Going from 4 to 5 servers, a key stays put only if <code>h % 4 == h % 5</code>, which is true for about <b>1 in 5</b> keys — so <b>~80% of keys move</b>, the caches go cold, and the database behind them gets flattened (a "cache stampede").</p>
      ${H.table(['hash h', 'h % 4', 'h % 5', 'moved?'], [['17', '1', '2', H.c('r', 'yes')], ['20', '0', '0', H.c('g', 'no')], ['23', '3', '3', H.c('g', 'no')], ['26', '2', '1', H.c('r', 'yes')], ['29', '1', '4', H.c('r', 'yes')]])}
      <p><b>The ring.</b> Imagine the hash space 0 … 2<sup>32</sup>−1 bent into a circle. Hash every <b>server</b> onto the circle (e.g. <code>hash("cache-A")</code>). Hash every <b>key</b> onto the same circle. A key belongs to the <b>first server clockwise</b> from it (wrapping past the top back to 0).</p>
      <ul>
        <li><b>Add a server:</b> it takes over only the arc between itself and the previous server — about <b>1/N</b> of the keys. Everything else stays.</li>
        <li><b>Remove a server:</b> only its keys move, to the next server clockwise.</li>
      </ul>
      <p><b>Virtual nodes (vnodes).</b> With only 3 points on a circle, the arcs are very uneven — one server might own 60% of keys. Fix: put each server on the ring <b>many times</b> (<code>hash("A#0")</code>, <code>hash("A#1")</code>, …, often 100–200 points). Many small arcs average out, so each server owns close to 1/N. Bonus: a <b>bigger</b> machine can get <b>more</b> vnodes (weights), and when a server dies its load spreads over <i>many</i> survivors instead of dumping onto one neighbour.</p>
      <p><b>Implementation in one sentence:</b> a sorted map <code>TreeMap&lt;hash, server&gt;</code>; lookup = <code>ceilingEntry(hash(key))</code>, or <code>firstEntry()</code> if nothing is ≥ (wrap-around). O(log V) per lookup where V = total vnodes.</p>`,
    clues: [
      '"Distribute keys across servers so that <b>adding or removing a server moves as few keys as possible</b>" → consistent hashing.',
      '"Design a <b>distributed cache</b> / sharded key-value store / CDN routing" → hash ring with virtual nodes (Dynamo, Cassandra, Memcached clients).',
      '"Servers have <b>different capacities</b>" → weight by number of virtual nodes.',
      '"Store each key on <b>R replicas</b>" → walk clockwise from the key and take the first R <i>distinct</i> physical servers (a preference list).',
      '"hash(key) % N breaks when N changes" in the prompt or a follow-up → they are fishing for consistent hashing.',
      '"Find the first server with position ≥ h, wrapping around" → <code>TreeMap.ceilingEntry</code> + <code>firstEntry</code>, or binary search on a sorted array.'
    ],
    code: [`
      // Consistent hash ring with virtual nodes, backed by a TreeMap (a red-black tree).
      class HashRing {
          private final TreeMap<Long, String> ring = new TreeMap<>();
          private final int vnodes;

          HashRing(int vnodes) { this.vnodes = vnodes; }

          // 64-bit FNV-1a: fast, decent spread. Production systems use MurmurHash3 / xxHash.
          static long hash(String s) {
              long h = 0xcbf29ce484222325L;
              for (int i = 0; i < s.length(); i++) { h ^= s.charAt(i); h *= 0x100000001b3L; }
              return h & Long.MAX_VALUE;                // keep it non-negative for a clean ring
          }

          void addServer(String server) {
              for (int i = 0; i < vnodes; i++) ring.put(hash(server + "#" + i), server);
          }

          void removeServer(String server) {
              for (int i = 0; i < vnodes; i++) ring.remove(hash(server + "#" + i));
          }

          // First vnode clockwise from the key's position; wrap to the smallest if none.
          String serverFor(String key) {
              if (ring.isEmpty()) throw new IllegalStateException("no servers");
              Map.Entry<Long, String> e = ring.ceilingEntry(hash(key));
              return (e != null ? e : ring.firstEntry()).getValue();
          }

          // R distinct physical servers for replication (Dynamo-style preference list).
          List<String> replicasFor(String key, int r) {
              LinkedHashSet<String> picked = new LinkedHashSet<>();
              for (String s : ring.tailMap(hash(key), true).values()) { if (picked.size() == r) break; picked.add(s); }
              for (String s : ring.values()) { if (picked.size() == r) break; picked.add(s); }   // wrap around
              return new ArrayList<>(picked);
          }

          public static void main(String[] args) {
              HashRing hr = new HashRing(100);
              for (String s : List.of("A", "B", "C", "D")) hr.addServer(s);
              Map<String, String> before = new HashMap<>();
              for (int i = 0; i < 10000; i++) before.put("key" + i, hr.serverFor("key" + i));
              hr.addServer("E");
              int moved = 0;
              for (int i = 0; i < 10000; i++) if (!before.get("key" + i).equals(hr.serverFor("key" + i))) moved++;
              System.out.println("keys moved after adding E: " + moved + " of 10000 (ideal = 1/5 = 2000)");
              System.out.println("replicas of key7: " + hr.replicasFor("key7", 3));
          }
      }`, { lang: 'python', run: true, title: 'Mod-N vs ring: count how many keys move (runnable Python)', code: `
import bisect, hashlib

def h(s):
    return int.from_bytes(hashlib.md5(s.encode()).digest()[:8], "big")

class Ring:
    def __init__(self, servers, vnodes):
        self.points = sorted((h(s + "#" + str(i)), s) for s in servers for i in range(vnodes))
        self.keys = [p for p, _ in self.points]

    def owner(self, key):
        i = bisect.bisect_left(self.keys, h(key))
        return self.points[i % len(self.points)][1]       # % wraps past the top

keys = ["k" + str(i) for i in range(20000)]
modn_moved = sum(h(k) % 4 != h(k) % 5 for k in keys)
r4, r5 = Ring("ABCD", 150), Ring("ABCDE", 150)
ring_moved = sum(r4.owner(k) != r5.owner(k) for k in keys)
print("mod-N: moved", modn_moved, "of", len(keys))
print("ring : moved", ring_moved, "of", len(keys))
load = {}
for k in keys:
    load[r5.owner(k)] = load.get(r5.owner(k), 0) + 1
print("load per server with 150 vnodes:", dict(sorted(load.items())))
` }],
    codeTitle: ['Hash ring with virtual nodes and replicas (Java)', 'Experiment: keys moved, mod-N vs ring'],
    viz: {
      title: 'Hash ring: keys go clockwise to the next server; a change only moves one arc',
      input: 'A B C | 2 | user1 cart9 img42 song5 doc11 fox | +D',
      inputLabel: 'servers | vnodes per server | keys | change (+X add or -X remove)',
      gen: function (input) {
        var parts = splitBar(input, 4, 'A B C | 2 | user1 cart9 | +D');
        var servers = parts[0].split(/[\s,]+/).filter(Boolean);
        if (servers.length < 1 || servers.length > 5) throw new Error('Use 1 to 5 server names');
        var V = toInt(parts[1], 'vnodes per server', 1, 3);
        var keys = parts[2].split(/[\s,]+/).filter(Boolean);
        if (keys.length < 1 || keys.length > 8) throw new Error('Use 1 to 8 keys');
        var ch = parts[3];
        if (!/^[+-]\w{1,6}$/.test(ch)) throw new Error('Change must look like +D (add server D) or -B (remove server B)');
        var adding = ch.charAt(0) === '+', who = ch.slice(1);
        if (!adding && servers.indexOf(who) < 0) throw new Error('Cannot remove ' + who + ': not in the server list');
        if (adding && servers.indexOf(who) >= 0) throw new Error(who + ' is already a server');
        function ang(s) { return fnv('ring:' + s) % 360; }
        function xy(a, r) { var t = a * Math.PI / 180; return { x: Math.round((50 + r * Math.sin(t)) * 10) / 10, y: Math.round((50 - r * Math.cos(t)) * 10) / 10 }; }
        function vnodesOf(list) {
          var v = [];
          list.forEach(function (s) { for (var i = 0; i < V; i++) v.push({ id: s + '#' + i, server: s, a: ang(s + '#' + i) }); });
          v.sort(function (p, q) { return p.a - q.a; });
          return v;
        }
        function owner(vn, k) { var a = ang(k); for (var i = 0; i < vn.length; i++) if (vn[i].a >= a) return vn[i]; return vn[0]; }
        function draw(vn, shownKeys, own, hl, ehl, tags) {
          var nodes = [], edges = [];
          vn.forEach(function (v) { var p = xy(v.a, 42); nodes.push({ id: v.id, label: v.id, x: p.x, y: p.y, shape: 'box' }); });
          for (var i = 0; i < vn.length; i++) if (vn.length > 1) edges.push([vn[i].id, vn[(i + 1) % vn.length].id]);
          shownKeys.forEach(function (k) { var p = xy(ang(k), 22); nodes.push({ id: 'k:' + k, label: k, x: p.x, y: p.y }); if (own[k]) edges.push(['k:' + k, own[k].id, '']); });
          return { type: 'graph', label: 'hash ring (angle = hash mod 360°, clockwise from the top)', directed: true, height: 100, nodes: nodes, edges: edges, hl: hl || {}, ehl: ehl || {}, tags: tags || {} };
        }
        var frames = [], vn = vnodesOf(servers), own = {};
        var tags0 = {}; vn.forEach(function (v) { tags0[v.id] = v.a + '°'; });
        frames.push({ narr: 'Each server is hashed onto the ring <b>' + V + '</b> time(s) (virtual nodes). Positions are angles 0–359°, clockwise from the top.', parts: [draw(vn, [], {}, {}, {}, tags0), { type: 'table', label: 'ring positions (sorted)', columns: ['vnode', 'angle'], rows: vn.map(function (v) { return [v.id, v.a + '°']; }) }] });
        var shown = [];
        keys.forEach(function (k) {
          shown.push(k); own[k] = owner(vn, k);
          var hl = {}, ehl = {}, tags = {}; hl['k:' + k] = 'cur'; hl[own[k].id] = 'ok'; ehl['k:' + k + '-' + own[k].id] = 'ok'; tags['k:' + k] = ang(k) + '°';
          var wrap = ang(k) > own[k].a;
          frames.push({ narr: 'Key <b>' + k + '</b> hashes to <b>' + ang(k) + '°</b>. Walk clockwise to the first vnode: <b>' + own[k].id + '</b> at ' + own[k].a + '°' + (wrap ? ' (wrapped past 359° back to the start)' : '') + ' → stored on server <b>' + own[k].server + '</b>.', parts: [draw(vn, shown, own, hl, ehl, tags)] });
        });
        function loadRows(o, list) { return list.map(function (s) { return keys.filter(function (k) { return o[k].server === s; }).length; }); }
        frames.push({ narr: 'Load per server before the change. With few vnodes the split is uneven — that is why real systems use 100+ vnodes per server.', parts: [{ type: 'bars', label: 'keys per server', values: loadRows(own, servers), idxLabels: servers }, { type: 'table', label: 'assignment', columns: ['key', 'angle', 'server'], rows: keys.map(function (k) { return [k, ang(k) + '°', own[k].server]; }) }] });
        var after = adding ? servers.concat([who]) : servers.filter(function (s) { return s !== who; });
        if (!after.length) {
          frames.push({ narr: 'Removing the last server leaves an empty ring — every lookup would fail. Real systems refuse this.', parts: [{ type: 'text', html: '<b>No servers left.</b>' }] });
          return frames;
        }
        var vn2 = vnodesOf(after), own2 = {}, moved = [], hl2 = {}, ehl2 = {};
        keys.forEach(function (k) { own2[k] = owner(vn2, k); var mv = own2[k].server !== own[k].server; if (mv) moved.push(k); hl2['k:' + k] = mv ? 'bad' : 'done'; ehl2['k:' + k + '-' + own2[k].id] = mv ? 'bad' : ''; });
        vn2.forEach(function (v) { if (v.server === who) hl2[v.id] = 'sel'; });
        var modMoved = keys.filter(function (k) { var h = fnv('ring:' + k); return h % servers.length !== h % after.length; }).length;
        frames.push({ narr: (adding ? 'Add server <b>' + who + '</b>: its vnodes land on the ring and steal only the arcs just before them.' : 'Remove server <b>' + who + '</b>: only its keys slide clockwise to the next vnode.') + ' Red keys moved: <b>' + moved.length + '/' + keys.length + '</b>' + (moved.length ? ' (' + moved.join(', ') + ')' : '') + '.', parts: [draw(vn2, keys, own2, hl2, ehl2, {})] });
        frames.push({ narr: 'Compare with <code>hash % N</code> going from N=' + servers.length + ' to N=' + after.length + ': <b>' + modMoved + '/' + keys.length + '</b> keys would move. The ring moved <b>' + moved.length + '</b>. With a handful of keys the counts are noisy, but with millions of keys the ring moves about 1/N of them while mod-N moves almost all.', parts: [
          { type: 'table', label: 'before vs after', columns: ['key', 'before', 'after', 'moved?'], rows: keys.map(function (k) { return [k, own[k].server, own2[k].server, own[k].server !== own2[k].server ? 'yes' : 'no']; }), hl: (function () { var o = {}; keys.forEach(function (k, i) { if (own[k].server !== own2[k].server) o[i] = 'bad'; }); return o; })() },
          { type: 'bars', label: 'keys per server after', values: loadRows(own2, after), idxLabels: after },
          { type: 'vars', vals: { 'ring moved': moved.length, 'mod-N moved': modMoved, keys: keys.length }, hl: { 'ring moved': 'ok', 'mod-N moved': 'bad' } }
        ] });
        return frames;
      }
    },
    examples: [
      {
        title: 'How many keys move? Numbers for 1 million keys',
        html: `${H.table(['change', 'hash % N', 'ring (with vnodes)'], [
            ['4 → 5 servers', '≈ 800,000 move (80%)', '≈ 200,000 move (1/5) — only to the new server'],
            ['5 → 4 servers (one dies)', '≈ 800,000', '≈ 200,000 — only the dead server\'s keys'],
            ['10 → 11 servers', '≈ 909,000 (91%)', '≈ 91,000 (1/11)']
          ])}<p>The ring achieves the <b>minimum possible</b> movement: the new server must get its fair 1/N share from somewhere, and nothing else moves.</p>`
      },
      {
        title: 'Why vnodes fix uneven load',
        html: `<p>3 servers, 1 point each: arcs might be 200°, 100°, 60° → loads of 56%, 28%, 17%. With 100 vnodes each, the standard deviation of load drops to a few percent. A rough guide: load imbalance shrinks like 1/√(vnodes per server).</p>
          ${H.table(['vnodes / server', 'typical max load vs average'], [['1', '≈ 2× or worse'], ['10', '≈ 1.3×'], ['100', '≈ 1.1×'], ['1000', '≈ 1.03×']])}
          <p>Trade-off: more vnodes = bigger ring map (memory) and more metadata to gossip in a cluster. Cassandra's default moved from 256 tokens per node to 16 in version 4.0, paired with a smarter token allocation algorithm.</p>`
      },
      {
        title: 'Replication: the preference list',
        html: `<p>Dynamo/Cassandra with replication factor 3: from the key's position, walk clockwise and take the first <b>3 distinct physical servers</b> (skip vnodes of a server already chosen). With rack awareness, also skip servers in a rack already used.</p>
          ${H.arr(['A#1', 'A#0', 'C#1', 'B#0'], { label: 'clockwise from key', hl: { 0: 'g', 1: 'm', 2: 'g', 3: 'g' }, idx: false })}
          <p>Picked: A, C, B (A#0 skipped — A is already a replica).</p>`
      },
      {
        title: 'Other consistent hashing flavours',
        html: `${H.table(['scheme', 'idea', 'good for'], [
            ['Rendezvous (HRW)', 'for each server compute hash(key, server); pick the highest', 'small N, no ring state, easy top-R replicas; O(N) per lookup'],
            ['Jump consistent hash', '~5 lines of arithmetic, zero memory', 'numbered shards 0..N−1 that only grow/shrink at the end'],
            ['Maglev hashing', 'precomputed lookup table, O(1)', 'network load balancers (Google Maglev)'],
            ['Bounded-load CH', 'cap each server at (1+ε)× average; overflow goes clockwise', 'hot-spot protection (used by HAProxy, Vimeo)']
          ])}`
      }
    ],
    deepDive: `<p><b>Why exactly 1/N moves.</b> A key changes owner only if the new server's vnode lands between the key and its old owner. The new server's vnodes cover, in expectation, 1/(N+1) of the ring — so that fraction of keys moves, all of them <i>to the new server</i>. No key moves between two old servers. That property ("monotonicity") is the formal definition from Karger et al. (1997), the paper that introduced consistent hashing for web caching (it led to Akamai).</p>
      <p><b>Lookup cost.</b> TreeMap ceiling = O(log V), V = servers × vnodes (e.g. 100 × 200 = 20,000 → ~15 comparisons). For hot paths, store vnode positions in a sorted <code>long[]</code> and binary search — fewer cache misses than tree nodes.</p>
      <p><b>Hash quality matters.</b> Use a well-mixed 64-bit hash (Murmur3, xxHash). Java's <code>String.hashCode</code> clusters similar names ("server1", "server2") into nearby positions, defeating the whole point.</p>
      <p><b>Membership is the hard part in practice.</b> Every client must agree on the ring. Options: a coordination service (ZooKeeper/etcd) holds the server list; gossip (Cassandra, Dynamo) spreads it eventually; or a proxy layer (twemproxy, Envoy ring_hash load balancer) owns it. During disagreement, some keys are read from the "wrong" server → treat it as a cache miss, never as an error.</p>
      <p><b>Hot keys</b> are not fixed by any hash: one celebrity key still lands on one server. Fixes: replicate hot keys to several servers and pick randomly, add a local in-process cache, or use bounded-load consistent hashing.</p>
      <p><b>When not to use a ring:</b> if the shard count is fixed and you can afford to pre-split (e.g. 1024 logical shards mapped to physical servers by a table, like Redis Cluster's 16,384 hash slots), a slot table gives exact control over moves and is easier to rebalance deliberately.</p>`,
    aiEra: `<p><b>What AI changes:</b> "design a distributed cache" answers from AI all mention consistent hashing — so interviewers dig deeper: <i>how many keys move, why vnodes, how do clients agree on the ring, what about hot keys</i>. Be ready with numbers and failure modes, not just the diagram.</p>
      <p><b>AI-era systems use it constantly:</b> routing chat sessions to the same LLM server so its <b>prefix/KV cache</b> stays warm (prefix-aware or session-affinity load balancing, often a consistent hash on the conversation id), sharding <b>vector indexes</b> across nodes, and assigning embedding jobs to GPU workers that come and go (autoscaling = frequent ring changes, exactly what the ring is built for).</p>
      <p><b>Use AI as a partner:</b> <code>Simulate 1M keys on a ring with 5 servers and 10/100/1000 vnodes; report max/avg load</code> — then reason about why the numbers look like 1/√V. <b>Where AI goes wrong:</b> forgets the wrap-around (returns null for keys after the last vnode), uses <code>hashCode() % 360</code>-style tiny rings, or claims consistent hashing solves hot keys.</p>`,
    problems: [{
      title: 'Consistent Hash Ring with Virtual Nodes', level: 'Medium', tags: ['design', 'hashing', 'treemap', 'binary search'], companies: ['Amazon', 'Uber', 'Netflix', 'Discord'],
      statement: `<p>Implement <code>Ring(int v)</code> with <code>addServer(String s)</code>, <code>removeServer(String s)</code> and <code>String getServer(String key)</code>. Each server is placed at <code>v</code> positions <code>hash(s + "#" + i)</code>; a key belongs to the server owning the first position ≥ <code>hash(key)</code>, wrapping around to the smallest position. Use the provided 64-bit FNV-1a <code>hash</code> (non-negative). <code>getServer</code> on an empty ring returns <code>null</code>.</p>`,
      constraints: `1 ≤ v ≤ 500, at most 1000 servers, up to 10<sup>6</sup> lookups; server names are unique.`,
      example: `<p>Positions (simplified to 0–99): A#0=10, B#0=40, A#1=70, B#1=90. Key at 35 → ${H.c('g', 'B')} (40). Key at 95 → wraps to 10 → ${H.c('g', 'A')}. After <code>removeServer("B")</code>: key at 35 → next is 70 → ${H.c('y', 'A')} (only B's keys moved).</p>`,
      brute: {
        why: `<p>Keep all vnode positions in an unsorted list and scan for the smallest position ≥ h (or the global smallest). Each lookup is O(V) — with 1000 servers × 500 vnodes = 500,000 positions and 10<sup>6</sup> lookups that is 5·10<sup>11</sup> steps. Sorting once and binary searching (or a TreeMap) removes the waste.</p>`,
        code: `
      class RingBrute {
          private final List<long[]> pts = new ArrayList<>();   // {position, serverIndex}
          private final List<String> names = new ArrayList<>();
          private final int v;
          RingBrute(int v) { this.v = v; }
          static long hash(String s) {
              long h = 0xcbf29ce484222325L;
              for (int i = 0; i < s.length(); i++) { h ^= s.charAt(i); h *= 0x100000001b3L; }
              return h & Long.MAX_VALUE;
          }
          void addServer(String s) {
              names.add(s);
              for (int i = 0; i < v; i++) pts.add(new long[]{hash(s + "#" + i), names.size() - 1});
          }
          String getServer(String key) {
              if (pts.isEmpty()) return null;
              long h = hash(key);
              long[] best = null, smallest = null;
              for (long[] p : pts) {                     // O(V) scan per lookup
                  if (p[0] >= h && (best == null || p[0] < best[0])) best = p;
                  if (smallest == null || p[0] < smallest[0]) smallest = p;
              }
              return names.get((int) (best != null ? best : smallest)[1]);
          }
      }`
      },
      mcq: { q: 'hash(key) is larger than every vnode position on the ring. Who owns the key?', options: ['Nobody — return null', 'The server with the largest position', 'The server with the smallest position (wrap around)', 'A random server'], answer: 2, explain: 'The ring is a circle: walking clockwise past the largest position brings you back to position 0, so the first vnode you meet is the smallest one.' },
      hints: [
        `<p>Hint 1: You need "smallest position ≥ h" with inserts and deletes — that is exactly a sorted map's <code>ceiling</code> query. Java: <code>TreeMap&lt;Long, String&gt;</code>.</p>`,
        `<p>Hint 2: addServer puts v entries <code>hash(s + "#" + i) → s</code>; removeServer removes the same v keys (recompute the hashes — no need to store them).</p>`,
        `<p>Hint 3: getServer: empty → null; e = ceilingEntry(hash(key)); if e == null use firstEntry() (wrap). Edge: two vnodes could collide on the same position — with 64-bit hashes this is astronomically rare, but a robust version would skip or log a collision rather than silently overwrite.</p>`
      ],
      solution: {
        approach: `<p>A <code>TreeMap</code> from position to server. Adds/removes touch v entries (O(v log V)); a lookup is one ceiling query plus a wrap-around fallback (O(log V)).</p>`,
        code: `
      class Ring {
          private final TreeMap<Long, String> ring = new TreeMap<>();
          private final int v;

          public Ring(int v) { this.v = v; }

          static long hash(String s) {
              long h = 0xcbf29ce484222325L;
              for (int i = 0; i < s.length(); i++) { h ^= s.charAt(i); h *= 0x100000001b3L; }
              return h & Long.MAX_VALUE;
          }

          public void addServer(String s) {
              for (int i = 0; i < v; i++) ring.put(hash(s + "#" + i), s);
          }

          public void removeServer(String s) {
              for (int i = 0; i < v; i++) ring.remove(hash(s + "#" + i), s);   // remove only if still owned by s
          }

          public String getServer(String key) {
              if (ring.isEmpty()) return null;
              Map.Entry<Long, String> e = ring.ceilingEntry(hash(key));
              if (e == null) e = ring.firstEntry();                             // wrap around the circle
              return e.getValue();
          }
      }`,
        alt: [{ lang: 'python', code: `
import bisect

def fnv64(s: str) -> int:
    h = 0xcbf29ce484222325
    for ch in s:
        h ^= ord(ch)
        h = (h * 0x100000001b3) & 0xFFFFFFFFFFFFFFFF
    return h & 0x7FFFFFFFFFFFFFFF

class Ring:
    def __init__(self, v: int):
        self.v = v
        self.pos = []          # sorted vnode positions
        self.owner = {}        # position -> server

    def add_server(self, s: str) -> None:
        for i in range(self.v):
            p = fnv64(s + "#" + str(i))
            if p not in self.owner:
                bisect.insort(self.pos, p)
            self.owner[p] = s

    def remove_server(self, s: str) -> None:
        for i in range(self.v):
            p = fnv64(s + "#" + str(i))
            if self.owner.get(p) == s:
                del self.owner[p]
                self.pos.pop(bisect.bisect_left(self.pos, p))

    def get_server(self, key: str):
        if not self.pos:
            return None
        i = bisect.bisect_left(self.pos, fnv64(key))
        return self.owner[self.pos[i % len(self.pos)]]
` }],
        dry: {
          head: ['call', 'ring (pos → server, simplified 0–99)', 'lookup', 'result'],
          rows: [
            ['addServer(A)', '10→A, 70→A', '—', '—'],
            ['addServer(B)', '10→A, 40→B, 70→A, 90→B', '—', '—'],
            ['getServer(k@35)', 'same', 'ceiling(35) = 40', '<span class="c-g">B</span>'],
            ['getServer(k@95)', 'same', 'ceiling(95) = none → first = 10', '<span class="c-g">A</span> (wrap)'],
            ['removeServer(B)', '10→A, 70→A', '—', '—'],
            ['getServer(k@35)', 'same', 'ceiling(35) = 70', '<span class="c-y">A</span> (moved)']
          ]
        },
        complexity: `<p><b>Lookup:</b> O(log V + |key|). <b>Add/remove server:</b> O(v · log V). <b>Space:</b> O(V) where V = servers × v.</p>`,
        followUps: ['Return R distinct replicas for a key.', 'Support weighted servers.', 'Which keys must be copied when a server is added? (Range of the arc before each new vnode.)']
      }
    }]
  });

  // =====================================================================
  // TOPIC 6 — Time-based key-value store (versioned data)
  // =====================================================================
  topics.push({
    title: 'Time-Based Key-Value Store: Versions + Binary Search for "As Of" Reads',
    analogy: `<p>Your phone's <b>photo gallery</b> keeps every version of your profile picture with the date you set it. If a friend asks "what was your profile picture on 5 March?", you scroll to the <b>last picture set on or before 5 March</b>. You never delete the old ones; you just find the right one by date.</p>
      <p>A <b>time-based key-value store</b> does the same: each key keeps a <b>timeline</b> of values, and a read asks "what was the value <b>as of</b> time t?". Because the timeline is sorted by time, finding the answer is a <b>binary search</b>, not a scroll.</p>`,
    explain: `<p><b>The interview version (LeetCode 981):</b> <code>set(key, value, timestamp)</code> stores a version; <code>get(key, timestamp)</code> returns the value with the <b>largest timestamp ≤ the given timestamp</b>, or <code>""</code> if there is none. The problem promises that <code>set</code> timestamps for the system are <b>strictly increasing</b>.</p>
      <p><b>Design:</b> <code>HashMap&lt;String, List&lt;(timestamp, value)&gt;&gt;</code>.</p>
      <ul>
        <li><b>set</b>: append to the key's list. Because timestamps only increase, appending keeps the list <b>sorted for free</b> → O(1).</li>
        <li><b>get</b>: binary search the key's list for the <b>last entry with time ≤ t</b> (a "floor" / "upper bound minus one" search) → O(log V), V = versions of that key.</li>
      </ul>
      <p><b>Example</b> for key <code>"foo"</code>:</p>
      ${H.arr([1, 4, 9], { label: 'times', idx: true })}${H.arr(['bar', 'bar2', 'bar3'], { label: 'values', idx: true })}
      ${H.table(['get(foo, t)', 'last time ≤ t', 'answer'], [['t = 0', 'none', H.c('r', '""')], ['t = 4', '4', H.c('g', 'bar2')], ['t = 5', '4', H.c('g', 'bar2')], ['t = 100', '9', H.c('g', 'bar3')]])}
      <p><b>The binary search template</b> (memorise it — it is the same one used in "first bad version" and "floor of x"):</p>
      ${H.table(['step', 'rule'], [
        ['start', 'lo = 0, hi = n − 1, ans = −1'],
        ['mid ≤ t', 'it is a candidate → ans = mid, look <b>right</b> for a later one: lo = mid + 1'],
        ['mid &gt; t', 'too late → look <b>left</b>: hi = mid − 1'],
        ['end', 'ans = −1 → return ""; else return values[ans]']
      ])}
      <p><b>If timestamps can arrive out of order</b> (late events, clock skew), use a <code>TreeMap&lt;Long, String&gt;</code> per key and call <code>floorEntry(t)</code> — O(log V) for both set and get. Same idea, just a self-balancing tree instead of an append-only list.</p>`,
    clues: [
      '"Return the value at the <b>largest timestamp ≤ t</b>" / "value <b>as of</b> time t" → per-key sorted versions + floor binary search.',
      '"All timestamps of <code>set</code> are <b>strictly increasing</b>" → append-only list stays sorted; no tree needed.',
      '"Timestamps may arrive <b>out of order</b>" → <code>TreeMap.floorEntry</code> per key.',
      '"<b>Snapshot</b> the array and later read index i at snapshot s" (Snapshot Array) → per-index version lists with snap ids, same floor search.',
      '"Stock price updates may be <b>corrected</b>; report latest / max / min" → map time → price plus sorted multiset of prices (Stock Price Fluctuation).',
      '"Point-in-time queries, audit history, undo" → versioned storage (MVCC) rather than overwrite-in-place.'
    ],
    code: [`
      // LeetCode 981: append-only version lists + "floor" binary search.
      class TimeMap {
          // Parallel lists keep primitives unboxed for the timestamps (faster, less memory).
          private static class Versions {
              final List<Integer> times = new ArrayList<>();
              final List<String> values = new ArrayList<>();
          }
          private final Map<String, Versions> store = new HashMap<>();

          public void set(String key, String value, int timestamp) {
              Versions v = store.computeIfAbsent(key, k -> new Versions());
              v.times.add(timestamp);          // timestamps strictly increase -> list stays sorted
              v.values.add(value);
          }

          public String get(String key, int timestamp) {
              Versions v = store.get(key);
              if (v == null) return "";
              int lo = 0, hi = v.times.size() - 1, ans = -1;
              while (lo <= hi) {
                  int mid = lo + (hi - lo) / 2;            // overflow-safe midpoint
                  if (v.times.get(mid) <= timestamp) {     // candidate: maybe a later one fits too
                      ans = mid;
                      lo = mid + 1;
                  } else {
                      hi = mid - 1;                         // too new, go left
                  }
              }
              return ans == -1 ? "" : v.values.get(ans);
          }
      }`, `
      // Out-of-order timestamps: one TreeMap per key; floorEntry does the binary search for us.
      class TimeMapAnyOrder {
          private final Map<String, TreeMap<Long, String>> store = new HashMap<>();

          void set(String key, String value, long ts) {
              store.computeIfAbsent(key, k -> new TreeMap<>()).put(ts, value);   // O(log V)
          }

          String get(String key, long ts) {
              TreeMap<Long, String> t = store.get(key);
              if (t == null) return "";
              Map.Entry<Long, String> e = t.floorEntry(ts);                      // largest time <= ts
              return e == null ? "" : e.getValue();
          }
      }`, { lang: 'python', run: true, title: 'Python with bisect (runnable)', code: `
import bisect
from collections import defaultdict

class TimeMap:
    def __init__(self):
        self.times = defaultdict(list)
        self.vals = defaultdict(list)

    def set(self, key, value, timestamp):
        self.times[key].append(timestamp)
        self.vals[key].append(value)

    def get(self, key, timestamp):
        ts = self.times.get(key)
        if not ts:
            return ""
        i = bisect.bisect_right(ts, timestamp) - 1   # last index with time <= timestamp
        return self.vals[key][i] if i >= 0 else ""

tm = TimeMap()
tm.set("foo", "bar", 1)
tm.set("foo", "bar2", 4)
for t in (0, 1, 3, 4, 5, 100):
    print("get(foo,", t, ") ->", repr(tm.get("foo", t)))
` }],
    codeTitle: ['TimeMap with append + binary search (Java)', 'Out-of-order variant with TreeMap.floorEntry', 'Python bisect version'],
    viz: {
      title: 'Time-based get: binary search for the last version at or before t',
      input: '1:bar 4:bar2 9:bar3 12:bar4 20:bar5 | 5 0 12 25',
      inputLabel: 'versions time:value (increasing) | query times',
      gen: function (input) {
        var parts = splitBar(input, 2, '1:a 4:b 9:c | 5 0');
        var vers = parts[0].split(/[\s,]+/).filter(Boolean).map(function (p) {
          var m = /^(-?\d+):(\S+)$/.exec(p);
          if (!m) throw new Error('Write versions as time:value, e.g. 1:bar 4:bar2');
          return { t: toInt(m[1], 'Time', 0, 9999), v: m[2].slice(0, 8) };
        });
        if (vers.length < 1 || vers.length > 12) throw new Error('Use 1 to 12 versions');
        for (var i = 1; i < vers.length; i++) if (vers[i].t <= vers[i - 1].t) throw new Error('Version times must be strictly increasing (that is the LeetCode 981 promise)');
        var qs = parts[1].split(/[\s,]+/).filter(Boolean).map(function (x) { return toInt(x, 'Query time', 0, 99999); });
        if (!qs.length || qs.length > 5) throw new Error('Give 1 to 5 query times');
        var T = vers.map(function (x) { return x.t; }), Vs = vers.map(function (x) { return x.v; }), frames = [];
        frames.push({ narr: 'Key "foo" has <b>' + T.length + '</b> versions, appended in time order by <code>set</code> — so the times are already sorted. Each <code>get</code> is a binary search.', parts: [
          { type: 'array', label: 'times', values: T.slice() }, { type: 'array', label: 'values', values: Vs.slice() }
        ] });
        qs.forEach(function (q) {
          var lo = 0, hi = T.length - 1, ans = -1, step = 0;
          frames.push({ narr: '<b>get(foo, ' + q + ')</b>: we want the <b>last</b> time ≤ ' + q + '. Start with the whole range.', parts: [
            { type: 'array', label: 'times', values: T.slice(), range: [lo, hi], ptr: (function () { var p = {}; p[lo] = lo === hi ? ['lo', 'hi'] : 'lo'; if (lo !== hi) p[hi] = 'hi'; return p; })() },
            { type: 'vars', vals: { t: q, lo: lo, hi: hi, ans: ans } }
          ] });
          while (lo <= hi) {
            var mid = lo + Math.floor((hi - lo) / 2), ok = T[mid] <= q, hl = {}, ptr = {};
            step++;
            hl[mid] = ok ? 'ok' : 'bad';
            if (ans >= 0 && ans !== mid) hl[ans] = 'sel';
            ptr[mid] = 'mid';
            var narr = 'Step ' + step + ': mid = ' + mid + ', times[mid] = ' + T[mid] + (ok ? ' ≤ ' + q + ' → a <span class="c-g">candidate</span> (ans = ' + mid + '); a later one might also fit, so search right: lo = ' + (mid + 1) + '.' : ' &gt; ' + q + ' → <span class="c-r">too new</span>; search left: hi = ' + (mid - 1) + '.');
            frames.push({ narr: narr, parts: [
              { type: 'array', label: 'times', values: T.slice(), range: [lo, hi], hl: hl, ptr: ptr },
              { type: 'vars', vals: { t: q, lo: lo, hi: hi, mid: mid, ans: ok ? mid : ans }, hl: ok ? { ans: 'ok' } : { hi: 'cur' } }
            ] });
            if (ok) { ans = mid; lo = mid + 1; } else hi = mid - 1;
          }
          var fh = {}; if (ans >= 0) fh[ans] = 'sel';
          frames.push({ narr: 'lo &gt; hi, search over after ' + step + ' step(s). ' + (ans < 0 ? 'No version at or before ' + q + ' → return <b>""</b>.' : 'Answer index ' + ans + ' (time ' + T[ans] + ') → return <b>"' + Vs[ans] + '"</b>.'), parts: [
            { type: 'array', label: 'times', values: T.slice(), hl: fh },
            { type: 'array', label: 'values', values: Vs.slice(), hl: fh },
            { type: 'vars', vals: { t: q, result: ans < 0 ? '""' : Vs[ans], steps: step }, hl: { result: ans < 0 ? 'bad' : 'ok' } }
          ] });
        });
        return frames;
      }
    },
    examples: [
      {
        title: 'LeetCode 981 sample',
        html: `<p><code>set("foo","bar",1)</code>, <code>get("foo",1)</code> → "bar", <code>get("foo",3)</code> → "bar" (last version ≤ 3 is at 1), <code>set("foo","bar2",4)</code>, <code>get("foo",4)</code> → "bar2", <code>get("foo",5)</code> → "bar2".</p>
          ${H.table(['query', 'times list', 'floor', 'result'], [['get(foo,1)', '[1]', '1', 'bar'], ['get(foo,3)', '[1]', '1', 'bar'], ['get(foo,4)', '[1, 4]', '4', 'bar2'], ['get(foo,5)', '[1, 4]', '4', 'bar2']])}`
      },
      {
        title: 'Snapshot Array — same idea, indexes instead of keys',
        html: `<p>LeetCode 1146: <code>set(index, val)</code>, <code>snap()</code> returns a snap id, <code>get(index, snapId)</code> returns the value at that snapshot. Copying the whole array per snap is O(N) each time. Instead, keep for each index a list of (snapId, value) and binary search for the last snapId ≤ the requested one. Only changed indexes cost memory.</p>
          ${H.table(['index 0 history', 'snap 0', 'snap 1', 'snap 2'], [['(snapId, value)', '(0, 5)', '—', '(2, 6)']])}
          <p><code>get(0, 1)</code> → last snapId ≤ 1 is 0 → <b>5</b>.</p>`,
        code: `
      class SnapshotArray {
          private final List<int[]>[] hist;   // per index: list of {snapId, value}
          private int snapId = 0;
          @SuppressWarnings("unchecked")
          SnapshotArray(int length) {
              hist = new List[length];
              for (int i = 0; i < length; i++) { hist[i] = new ArrayList<>(); hist[i].add(new int[]{0, 0}); }
          }
          void set(int index, int val) {
              List<int[]> h = hist[index];
              int[] last = h.get(h.size() - 1);
              if (last[0] == snapId) last[1] = val;          // overwrite within the same snapshot
              else h.add(new int[]{snapId, val});
          }
          int snap() { return snapId++; }
          int get(int index, int sid) {
              List<int[]> h = hist[index];
              int lo = 0, hi = h.size() - 1, ans = 0;
              while (lo <= hi) {
                  int mid = (lo + hi) >>> 1;
                  if (h.get(mid)[0] <= sid) { ans = mid; lo = mid + 1; } else hi = mid - 1;
              }
              return h.get(ans)[1];
          }
      }`
      },
      {
        title: 'MVCC: how databases use this exact structure',
        html: `<p>PostgreSQL, MySQL InnoDB, CockroachDB and others keep <b>multiple versions</b> of each row. A transaction that started at time 100 reads, for each row, the newest version committed at or before 100 — a floor lookup on the version chain. Writers add new versions instead of blocking readers. Old versions no one can see any more are garbage-collected (PostgreSQL <code>VACUUM</code>, InnoDB purge).</p>
          ${H.table(['row 42 versions', 'committed at', 'visible to txn@100?'], [['v1', '50', 'older'], ['v2', '90', H.c('g', 'yes — newest ≤ 100')], ['v3', '120', H.c('r', 'no — too new')]])}`
      },
      {
        title: 'Retention: keeping the timeline from growing forever',
        html: `<p>Real stores cap history: Bigtable/HBase keep the last N versions per cell or versions newer than a TTL; Kafka compacted topics keep only the latest value per key. In our TimeMap, add <code>maxVersions</code>: when a list exceeds it, drop from the front (an <code>ArrayDeque</code> or a circular buffer keeps that O(1)). Binary search still works on the remaining sorted window.</p>`
      }
    ],
    deepDive: `<p><b>Off-by-one discipline.</b> "Largest ≤ t" = <code>upperBound(t) − 1</code>, where <code>upperBound</code> is the first index with time &gt; t. Python's <code>bisect_right(ts, t) − 1</code> and C++'s <code>prev(upper_bound(...))</code> express it directly. Java's <code>Collections.binarySearch</code> returns <code>−(insertionPoint) − 1</code> when absent — convert carefully, or just write the loop.</p>
      <p><b>Boxing cost.</b> <code>List&lt;Integer&gt;</code> stores pointers to Integer objects — every comparison is a pointer chase. For millions of versions, use a growable <code>int[]</code>/<code>long[]</code> per key (manual doubling) for ~4× less memory and much better cache behaviour.</p>
      <p><b>Concurrency.</b> Readers vastly outnumber writers in history stores. Since <code>set</code> only appends, you can publish a new immutable "length" after writing the element (a <code>volatile</code> size) so readers search only the safely published prefix without locks; or use <code>ConcurrentSkipListMap</code> per key when timestamps are unordered.</p>
      <p><b>Range queries.</b> "All values between t1 and t2" = two binary searches (lower bound of t1, upper bound of t2) then a slice — O(log V + output). TreeMap gives <code>subMap(t1, true, t2, true)</code>.</p>
      <p><b>Distributed reality.</b> Timestamps from different machines disagree (clock skew). Systems use hybrid logical clocks (CockroachDB), TrueTime with bounded uncertainty (Google Spanner waits out the uncertainty before committing), or version numbers from a single sequencer. In interviews, say: "I assume a monotonic timestamp source; in production I would use HLCs or a sequencer."</p>
      <p><b>Time-series databases</b> (Prometheus, InfluxDB, TimescaleDB) are the industrial version: per-series append-only chunks, compressed with delta-of-delta timestamps and XOR-encoded floats (Gorilla, Facebook 2015), searched by time.</p>`,
    aiEra: `<p><b>What AI changes:</b> assistants solve LC 981 instantly; the interview signal moves to <i>variants</i>: out-of-order writes, retention, range reads, concurrency, and binary-search boundary bugs (an AI's <code>while (lo &lt; hi)</code> with the wrong update loops forever on two elements — test with sizes 1 and 2).</p>
      <p><b>In AI systems:</b> <b>feature stores</b> for ML must do "point-in-time correct" joins — for a training example at time t, fetch each feature's value as of t (never a future value, or you leak labels). That is precisely a floor lookup per entity per feature. Agent memory and conversation stores keep versioned facts ("user's address as of last week"), and prompt/config registries keep versioned prompts so you can reproduce what the model saw.</p>
      <p><b>Use AI as a partner:</b> <code>Write a property test: random sets with increasing timestamps, random gets; compare against a linear scan</code>. <b>What you must still own:</b> the invariant behind the binary search and the "as of" semantics that prevent data leakage.</p>`,
    problems: [{
      title: 'Time Based Key-Value Store', level: 'Medium', tags: ['design', 'hashmap', 'binary search'], companies: ['Google', 'Amazon', 'Netflix', 'Lyft', 'Databricks'],
      statement: `<p>Design <code>TimeMap</code> with <code>set(String key, String value, int timestamp)</code> and <code>String get(String key, int timestamp)</code>. <code>get</code> returns the value set for <code>key</code> at the <b>largest timestamp_prev ≤ timestamp</b>; if none exists, return <code>""</code>. All timestamps passed to <code>set</code> are strictly increasing.</p>`,
      constraints: `1 ≤ key.length, value.length ≤ 100, 1 ≤ timestamp ≤ 10<sup>7</sup>, at most 2·10<sup>5</sup> calls in total.`,
      example: `<p><code>set(foo,bar,1)</code>; <code>get(foo,1)</code> → ${H.c('g', '"bar"')}; <code>get(foo,3)</code> → ${H.c('g', '"bar"')} (nothing newer ≤ 3); <code>set(foo,bar2,4)</code>; <code>get(foo,4)</code> → ${H.c('g', '"bar2"')}; <code>get(foo,0)</code> → ${H.c('r', '""')} (nothing that early).</p>`,
      brute: {
        why: `<p>Store all versions per key in a list and <b>scan</b> it from newest to oldest on every <code>get</code>. A key with 10<sup>5</sup> versions and 10<sup>5</sup> gets → 10<sup>10</sup> steps. The list is already sorted — scanning ignores that gift.</p>`,
        code: `
      class TimeMapBrute {
          private final Map<String, List<Object[]>> m = new HashMap<>();
          void set(String key, String value, int t) {
              m.computeIfAbsent(key, k -> new ArrayList<>()).add(new Object[]{t, value});
          }
          String get(String key, int t) {
              List<Object[]> l = m.getOrDefault(key, Collections.emptyList());
              for (int i = l.size() - 1; i >= 0; i--)            // O(V) linear scan
                  if ((int) l.get(i)[0] <= t) return (String) l.get(i)[1];
              return "";
          }
      }`
      },
      mcq: { q: 'Why can set() just append, with no sorting?', options: ['HashMap keeps lists sorted', 'Timestamps for set are strictly increasing, so each new one is the largest', 'Binary search works on unsorted lists', 'Java ArrayList sorts on add'], answer: 1, explain: 'The problem guarantees increasing set timestamps, so appending preserves sorted order — set is O(1) and get can binary search.' },
      hints: [
        `<p>Hint 1: Each key has its own timeline. Because set-timestamps only increase, each timeline is a sorted list built by appending.</p>`,
        `<p>Hint 2: <code>get</code> needs the <b>last</b> index whose time ≤ t: binary search that remembers the latest candidate (ans = mid, go right) and shrinks left when too new.</p>`,
        `<p>Hint 3: Recipe — map key → (times list, values list). set: append both. get: missing key → ""; lo=0, hi=n−1, ans=−1; loop; return ans == −1 ? "" : values[ans]. Test t smaller than the first time and larger than the last.</p>`
      ],
      solution: {
        approach: `<p>HashMap from key to two parallel append-only lists (times, values). Gets run a floor binary search on that key's times. Append keeps order because timestamps increase.</p>`,
        code: `
      class TimeMap {
          private final Map<String, List<Integer>> times = new HashMap<>();
          private final Map<String, List<String>> vals = new HashMap<>();

          public void set(String key, String value, int timestamp) {
              times.computeIfAbsent(key, k -> new ArrayList<>()).add(timestamp);
              vals.computeIfAbsent(key, k -> new ArrayList<>()).add(value);
          }

          public String get(String key, int timestamp) {
              List<Integer> t = times.get(key);
              if (t == null) return "";
              int lo = 0, hi = t.size() - 1, ans = -1;
              while (lo <= hi) {
                  int mid = (lo + hi) >>> 1;
                  if (t.get(mid) <= timestamp) { ans = mid; lo = mid + 1; }
                  else hi = mid - 1;
              }
              return ans < 0 ? "" : vals.get(key).get(ans);
          }
      }`,
        alt: [{ lang: 'python', code: `
import bisect
from collections import defaultdict

class TimeMap:
    def __init__(self):
        self.t = defaultdict(list)
        self.v = defaultdict(list)

    def set(self, key: str, value: str, timestamp: int) -> None:
        self.t[key].append(timestamp)
        self.v[key].append(value)

    def get(self, key: str, timestamp: int) -> str:
        i = bisect.bisect_right(self.t.get(key, []), timestamp) - 1
        return self.v[key][i] if i >= 0 else ""
` }],
        dry: {
          head: ['call', 'times[foo]', 'binary search', 'result'],
          rows: [
            ['set(foo,bar,1)', '[1]', '—', '—'],
            ['get(foo,1)', '[1]', 'mid 0: 1 ≤ 1 → ans 0', '<span class="c-g">bar</span>'],
            ['get(foo,3)', '[1]', 'mid 0: 1 ≤ 3 → ans 0', '<span class="c-g">bar</span>'],
            ['set(foo,bar2,4)', '[1, 4]', '—', '—'],
            ['get(foo,4)', '[1, 4]', 'mid 0 ok → lo 1; mid 1: 4 ≤ 4 → ans 1', '<span class="c-g">bar2</span>'],
            ['get(foo,0)', '[1, 4]', 'mid 0: 1 &gt; 0 → hi −1', '<span class="c-r">""</span>']
          ]
        },
        complexity: `<p><b>set:</b> O(1) amortised. <b>get:</b> O(log V) where V = versions of that key. <b>Space:</b> O(total sets).</p>`,
        followUps: ['Timestamps can arrive out of order — what changes?', 'Keep only the last 100 versions per key.', 'Add getRange(key, t1, t2).']
      }
    }]
  });

  // =====================================================================
  // TOPIC 7 — Designing iterators (peeking, flatten, zigzag, BST)
  // =====================================================================
  function parseNested(s) {
    var t = txt(s), v;
    try { v = JSON.parse(t); } catch (e) { throw new Error('Write a nested list in JSON style, e.g. [1,[4,[6]],[2,3]]'); }
    if (!Array.isArray(v)) throw new Error('The outer value must be a list in square brackets');
    var count = 0;
    (function chk(x, d) {
      if (d > 5) throw new Error('Keep nesting depth at 5 or less');
      x.forEach(function (y) {
        if (Array.isArray(y)) chk(y, d + 1);
        else if (Number.isInteger(y)) { count++; if (Math.abs(y) > 999) throw new Error('Use integers between -999 and 999'); }
        else throw new Error('Only integers and lists are allowed');
      });
    })(v, 1);
    if (count > 14) throw new Error('Use at most 14 integers so the walk-through stays short');
    return v;
  }
  topics.push({
    title: 'Designing Iterators: Peeking, Flatten (2D & Nested), Zigzag and BST',
    analogy: `<p>A <b>Pez sweets dispenser</b> hands you one sweet at a time. You do not see the whole packet; you just ask "is there another?" (<code>hasNext</code>) and "give me one" (<code>next</code>). A good dispenser does not unwrap the whole packet in advance — it fetches the next sweet only when you ask.</p>
      <p>Iterator design questions are about building such dispensers on top of awkward containers: a dispenser that lets you <b>peek</b> at the next sweet without taking it, one that serves sweets from <b>boxes inside boxes inside boxes</b> in order, or one that takes turns between <b>two dispensers</b>.</p>`,
    explain: `<p>An <b>iterator</b> is an object that walks a collection one element at a time with two calls: <code>hasNext()</code> ("is there more?") and <code>next()</code> ("give me the next one and move forward"). In Java it is the <code>Iterator&lt;T&gt;</code> interface; every <code>for-each</code> loop uses one.</p>
      <p><b>The golden rules of iterator design:</b></p>
      <ol>
        <li><b>Lazy, not eager.</b> Do the minimum work per call. Copying everything into a list in the constructor works on small inputs but costs O(N) memory up front and breaks on huge or infinite sources (streams, files, database cursors).</li>
        <li><b>hasNext() must be idempotent.</b> Calling it twice must not skip an element. If it has to "look ahead", it caches what it found.</li>
        <li><b>next() after the end</b> throws <code>NoSuchElementException</code> in Java.</li>
        <li>Aim for <b>amortised O(1)</b> per element: total work over the whole walk ≈ O(N), even if one call occasionally does more.</li>
      </ol>
      <p><b>The four classic designs:</b></p>
      ${H.table(['iterator', 'state you keep', 'trick'], [
        ['<b>Peeking</b> (LC 284)', 'the wrapped iterator + one cached "next" value', 'pre-fetch one element; peek() returns it, next() returns it and pre-fetches again'],
        ['<b>Flatten 2D vector</b> (LC 251)', 'row index + column index', 'before answering, skip empty rows'],
        ['<b>Flatten nested list</b> (LC 341)', 'a <b>stack</b> of iterators (one per nesting level)', 'hasNext digs down until the top of the stack is an integer, or the stack is empty'],
        ['<b>Zigzag / round-robin</b> (LC 281)', 'a <b>queue</b> of non-empty iterators', 'take from the front one, put it back at the end if it still has items'],
        ['<b>BST in-order</b> (LC 173)', 'a stack of "left spine" nodes', 'pop a node, then push the left spine of its right child']
      ])}
      <p><b>Nested example:</b> <code>[1, [4, [6]], [2, 3]]</code> → 1, 4, 6, 2, 3. The stack holds "where am I" in each open bracket — exactly what the recursion would keep on the call stack, but now we can pause between elements.</p>
      ${H.arr([1, 4, 6, 2, 3], { label: 'output order', idx: true })}`,
    clues: [
      '"Implement an <b>iterator</b> with <code>next()</code> and <code>hasNext()</code>" over a structure that is not a flat list → keep explicit state (indexes, a stack, or a queue).',
      '"<b>peek()</b> at the next element without advancing" → cache one look-ahead element.',
      '"Each element is either an integer or a <b>list whose elements may also be integers or other lists</b>" → stack of iterators (or a recursive generator).',
      '"Return elements <b>alternately</b> / round-robin from k lists" → queue of iterators.',
      '"<code>next()</code> and <code>hasNext()</code> in <b>average O(1)</b> time and O(h) memory" for a BST → controlled in-order traversal with a stack.',
      '"Input may be <b>very large / streamed</b>; do not copy it" → lazy iterator, not eager flattening.',
      '"Merge k sorted iterators" → min-heap of (current value, iterator) — the iterator form of merge k sorted lists.'
    ],
    code: [`
      // Peeking iterator (LeetCode 284): wrap any Iterator and cache one element ahead.
      class PeekingIterator<T> implements Iterator<T> {
          private final Iterator<T> it;
          private T nextVal;          // the element peek() would return
          private boolean has;        // is nextVal valid?

          PeekingIterator(Iterator<T> iterator) {
              it = iterator;
              advance();              // pre-fetch the first element
          }

          private void advance() {
              has = it.hasNext();
              nextVal = has ? it.next() : null;
          }

          public T peek() {
              if (!has) throw new NoSuchElementException();
              return nextVal;
          }

          @Override public boolean hasNext() { return has; }    // idempotent: just reads a flag

          @Override public T next() {
              if (!has) throw new NoSuchElementException();
              T ans = nextVal;
              advance();              // keep exactly one element cached
              return ans;
          }
      }`, `
      // Zigzag / round-robin over k iterators (LeetCode 281 generalised).
      class RoundRobin implements Iterator<Integer> {
          private final Deque<Iterator<Integer>> q = new ArrayDeque<>();

          RoundRobin(List<List<Integer>> lists) {
              for (List<Integer> l : lists) if (!l.isEmpty()) q.offer(l.iterator());   // skip empty lists up front
          }

          @Override public boolean hasNext() { return !q.isEmpty(); }

          @Override public Integer next() {
              if (q.isEmpty()) throw new NoSuchElementException();
              Iterator<Integer> it = q.poll();
              Integer v = it.next();
              if (it.hasNext()) q.offer(it);    // still has items: back of the line
              return v;
          }
      }`, { lang: 'python', run: true, title: 'Python generators make lazy iterators almost free (runnable)', code: `
def flatten(nested):
    """Lazily yield integers from arbitrarily nested lists."""
    for x in nested:
        if isinstance(x, list):
            yield from flatten(x)      # Python keeps the 'stack' for us
        else:
            yield x

def zigzag(*lists):
    iters = [iter(l) for l in lists]
    while iters:
        alive = []
        for it in iters:
            try:
                yield next(it)
                alive.append(it)
            except StopIteration:
                pass
        iters = alive

print(list(flatten([1, [4, [6]], [2, 3], []])))
print(list(zigzag([1, 2], [3, 4, 5, 6], [7])))
gen = flatten([[[[42]]], 7])
print(next(gen), "<- only computed the first element so far")
` }],
    codeTitle: ['Peeking iterator (Java)', 'Round-robin (zigzag) iterator over k lists', 'Python generators (runnable)'],
    viz: {
      title: 'Nested list iterator: a stack of (list, position) pairs digs down lazily',
      input: '[1,[4,[6]],[2,3],[]]',
      inputLabel: 'nested list (JSON)',
      gen: function (input) {
        var root = parseNested(input), frames = [], out = [];
        var stack = [{ list: root, i: 0 }];
        function show(x) { return JSON.stringify(x).slice(0, 22); }
        function stackItems() { return stack.map(function (f) { return show(f.list) + ' @' + f.i; }); }
        function snap(narr, hlTop, extra) {
          var sh = {}; if (stack.length && hlTop) sh[stack.length - 1] = hlTop;
          var ps = [{ type: 'stack', label: 'stack of (list @ next position) — top is the deepest open list', items: stack.length ? stackItems() : ['(empty)'], hl: stack.length ? sh : {} },
            { type: 'array', label: 'returned by next() so far', values: out.length ? out.slice() : ['—'], hl: out.length && extra === 'out' ? one(out.length - 1, 'ok') : {} }];
          frames.push({ narr: narr, parts: ps });
        }
        snap('Constructor: push the whole input with position 0. Nothing is flattened yet — that is the "lazy" part.', 'cur');
        var guard = 0;
        while (guard++ < 200) {
          // hasNext(): dig until the top points at an integer or the stack is empty
          if (!stack.length) break;
          var top = stack[stack.length - 1];
          if (top.i >= top.list.length) {
            var done = show(top.list);
            stack.pop();
            snap('<b>hasNext()</b>: top list ' + done + ' is used up → <span class="c-r">pop</span> it and look at the list below.', 'bad');
            continue;
          }
          var el = top.list[top.i];
          if (Array.isArray(el)) {
            top.i++;
            stack.push({ list: el, i: 0 });
            snap('<b>hasNext()</b>: next element is a list ' + show(el) + ' → move past it in the parent and <span class="c-b">push</span> it. Dig deeper.', 'cur');
            continue;
          }
          snap('<b>hasNext()</b>: top points at the integer <b>' + el + '</b> → return true (calling hasNext again would change nothing).', 'win');
          top.i++;
          out.push(el);
          snap('<b>next()</b> → returns <b>' + el + '</b> and advances the top position.', 'ok', 'out');
        }
        snap('<b>hasNext()</b>: the stack is empty → false. Total work = each list pushed and popped once + each integer returned once → O(N) overall, O(depth) memory.', null);
        return frames;
      }
    },
    examples: [
      {
        title: 'Peeking iterator trace',
        html: `<p>Underlying iterator over [1, 2, 3].</p>
          ${H.table(['call', 'cached nextVal before', 'returns', 'cached after'], [
            ['(constructor)', '—', '—', '1'], ['next()', '1', '1', '2'], ['peek()', '2', H.c('b', '2'), '2 (unchanged)'], ['next()', '2', '2', '3'], ['next()', '3', '3', 'none (has = false)'], ['hasNext()', 'none', H.c('r', 'false'), '—']
          ])}
          <p>Generic version follow-up: use <code>T</code> and a separate <code>boolean has</code> so a real <code>null</code> element is not confused with "no element".</p>`
      },
      {
        title: 'Flatten 2D vector with two indexes',
        html: `<p>Input <code>[[1, 2], [], [3], [], []]</code>. Keep <code>row</code>, <code>col</code>. A helper <code>skipEmpty()</code> moves to the next row while <code>col == rows[row].length</code>. Call it at the start of both <code>hasNext</code> and <code>next</code>.</p>`,
        code: `
      class Vector2D {
          private final int[][] v;
          private int row = 0, col = 0;
          Vector2D(int[][] vec) { v = vec; }
          private void skipEmpty() {
              while (row < v.length && col == v[row].length) { row++; col = 0; }   // hop over finished/empty rows
          }
          boolean hasNext() { skipEmpty(); return row < v.length; }
          int next() {
              skipEmpty();
              if (row >= v.length) throw new NoSuchElementException();
              return v[row][col++];
          }
      }`
      },
      {
        title: 'BST iterator: in-order, one node at a time',
        html: `<p>For the BST with root 7, left 3, right 15 (15 has children 9 and 20): push the left spine of the root (7, 3). <code>next()</code> pops 3; 3 has no right child. Pops 7; push left spine of 15 → (15, 9). Pops 9, then 15 (push spine of 20), then 20. Output 3, 7, 9, 15, 20.</p>
          ${H.table(['call', 'stack after (bottom → top)', 'returns'], [['init', '7, 3', '—'], ['next', '7', '3'], ['next', '15, 9', '7'], ['next', '15', '9'], ['next', '20', '15'], ['next', 'empty', '20']])}
          <p>Each node is pushed and popped once → O(1) amortised per <code>next</code>, O(height) memory.</p>`,
        code: `
      class BSTIterator {
          private final Deque<TreeNode> st = new ArrayDeque<>();
          BSTIterator(TreeNode root) { pushLeft(root); }
          private void pushLeft(TreeNode n) { while (n != null) { st.push(n); n = n.left; } }
          boolean hasNext() { return !st.isEmpty(); }
          int next() {
              TreeNode n = st.pop();
              pushLeft(n.right);            // the next smallest values live in the right subtree's left spine
              return n.val;
          }
      }`
      },
      {
        title: 'Merging k sorted iterators with a heap',
        html: `<p>Database query engines and log mergers combine many sorted streams. Keep a min-heap of (current value, source). <code>next()</code> pops the smallest, then pushes that source's next value if any. Cost: O(log k) per element, O(k) memory — and it works on streams that never fit in memory (external merge sort).</p>
          ${H.table(['heap', 'pop', 'push from same source'], [['(1,A) (2,B) (5,C)', '1 from A', '(4,A)'], ['(2,B) (4,A) (5,C)', '2 from B', '(3,B)']])}`
      }
    ],
    deepDive: `<p><b>Where should the work happen — hasNext or next?</b> For nested/2D iterators, put the "advance to a real element" logic in <code>hasNext</code> (or a private helper called by both). Then <code>next()</code> = <code>if (!hasNext()) throw; return current</code>. This makes repeated <code>hasNext</code> calls safe and avoids the bug where <code>next()</code> assumes the caller called <code>hasNext()</code> first (callers are allowed to call <code>next()</code> alone).</p>
      <p><b>Amortised analysis for the nested iterator.</b> One <code>hasNext</code> may pop or push many lists (e.g. <code>[[[[]]], 5]</code>), but every list is pushed once and popped once in the whole run. Total = O(number of lists + number of integers) → O(1) amortised per element. Memory = O(maximum depth), not O(total size).</p>
      <p><b>Stack of iterators vs stack of (list, index).</b> Iterators work on any <code>Iterable</code> (including lazy ones); indexes need random access. Pushing reversed lists onto a single stack of elements (a common LeetCode solution) is simpler but copies every list — O(N) extra work and not lazy for huge lists.</p>
      <p><b>Fail-fast iterators.</b> Java's collection iterators throw <code>ConcurrentModificationException</code> when the collection is structurally modified during iteration (they compare a <code>modCount</code> snapshot). Your custom iterator over mutable state should define what happens — snapshot semantics (copy-on-write, like <code>CopyOnWriteArrayList</code>), weakly consistent (like <code>ConcurrentHashMap</code>), or fail-fast.</p>
      <p><b>remove()</b>: the optional <code>Iterator.remove</code> deletes the last element returned. A peeking iterator cannot support it safely after <code>peek()</code>, because the wrapped iterator has already advanced past that element — a nice follow-up to mention.</p>
      <p><b>Real-world:</b> database cursors (Volcano / iterator model: each operator implements open/next/close and pulls rows from its child), Kafka consumers, paginated REST APIs ("cursor" tokens), Java Streams, Python generators, and the async iterators that stream LLM tokens.</p>`,
    aiEra: `<p><b>What AI changes:</b> iterators are short, so AI produces them instantly — and often <b>eagerly</b> (flatten everything in the constructor) or with a <code>hasNext</code> that mutates state twice. Interviewers now ask for the lazy version and amortised analysis, and may hand you AI-written code with exactly those bugs to review.</p>
      <p><b>Iterators run the AI world:</b> streaming LLM responses are async iterators of tokens (Server-Sent Events); data loaders for training are iterators over shards with prefetch (a peeking iterator with a buffer); RAG pipelines paginate vector-search results with cursors; agent frameworks stream tool events as generators. "Do not load everything into memory" is the same lazy principle at scale.</p>
      <p><b>Use AI as a partner:</b> <code>Generate nasty inputs for a nested iterator: deep empty lists, empty outer list, single integer deep inside</code>. <b>What you must still own:</b> the hasNext idempotency rule, the amortised O(1) argument, and choosing stack vs queue vs heap from the wording.</p>`,
    problems: [{
      title: 'Flatten Nested List Iterator', level: 'Medium', tags: ['design', 'stack', 'iterator', 'recursion'], companies: ['Meta', 'Google', 'Airbnb', 'LinkedIn', 'Netflix'],
      statement: `<p>You get a nested list of integers: each element is either an integer or a list whose elements may also be integers or lists. Implement <code>NestedIterator(List&lt;NestedInteger&gt; nestedList)</code> with <code>next()</code> and <code>hasNext()</code> that return the integers in order, flattened. Prefer a <b>lazy</b> design: O(depth) extra memory.</p>`,
      constraints: `1 ≤ nestedList.length ≤ 500, integers in [−10<sup>6</sup>, 10<sup>6</sup>], nesting depth ≤ 50.`,
      example: `<p>Input <code>[[1,1],2,[1,1]]</code> → ${H.c('g', '[1,1,2,1,1]')}. Input <code>[1,[4,[6]]]</code> → ${H.c('g', '[1,4,6]')}. Input <code>[[],[[]]]</code> → ${H.c('r', '[]')} — hasNext() must return false straight away, so it has to look through empty lists.</p>`,
      brute: {
        why: `<p>Recursively flatten everything into an <code>ArrayList</code> in the constructor, then iterate it. Correct and accepted on LeetCode, but it does <b>all</b> the work and uses O(N) memory before the first <code>next()</code> — wasteful if the caller only needs the first few values, impossible for huge or streaming inputs.</p>`,
        code: `
      interface NestedInteger {
          boolean isInteger();
          Integer getInteger();
          List<NestedInteger> getList();
      }
      class EagerNestedIterator implements Iterator<Integer> {
          private final List<Integer> flat = new ArrayList<>();
          private int pos = 0;
          EagerNestedIterator(List<NestedInteger> nested) { fill(nested); }   // O(N) work + memory up front
          private void fill(List<NestedInteger> l) {
              for (NestedInteger x : l) { if (x.isInteger()) flat.add(x.getInteger()); else fill(x.getList()); }
          }
          @Override public boolean hasNext() { return pos < flat.size(); }
          @Override public Integer next() { return flat.get(pos++); }
      }`
      },
      mcq: { q: 'Input is [[],[[]]]. What must hasNext() do on its first call?', options: ['Return true because the outer list is non-empty', 'Dig through the empty lists, popping them, and return false', 'Throw an exception', 'Return true and let next() handle it'], answer: 1, explain: 'There are no integers at all. hasNext must advance past empty lists until it finds an integer or runs out — otherwise the caller would call next() on nothing.' },
      hints: [
        `<p>Hint 1: Recursion would keep "where am I in each open list" on the call stack — but an iterator must pause between elements. Keep that information in your own stack.</p>`,
        `<p>Hint 2: Stack of <code>Iterator&lt;NestedInteger&gt;</code>. In hasNext: while the stack is non-empty, look at the top iterator; if exhausted pop; else take its next element — integer → cache it and return true; list → push its iterator.</p>`,
        `<p>Hint 3: Cache the found integer in a field (e.g. <code>Integer pending</code>) so a second hasNext() does not skip it. next(): if (!hasNext()) throw; return pending and clear it. Edge cases: empty lists anywhere, deep single values like [[[[5]]]].</p>`
      ],
      solution: {
        approach: `<p>Stack of iterators, one per currently open list, plus a cached "pending" integer. <code>hasNext</code> digs (push on list, pop on exhausted) until it finds an integer to cache or the stack empties. <code>next</code> hands out the cached integer. Each list is pushed and popped once → amortised O(1) per element, O(depth) memory.</p>`,
        code: `
      interface NestedInteger {
          boolean isInteger();
          Integer getInteger();
          List<NestedInteger> getList();
      }

      class NestedIterator implements Iterator<Integer> {
          private final Deque<Iterator<NestedInteger>> stack = new ArrayDeque<>();
          private Integer pending = null;      // integer found by hasNext, not yet returned

          public NestedIterator(List<NestedInteger> nestedList) {
              stack.push(nestedList.iterator());
          }

          @Override
          public boolean hasNext() {
              while (pending == null && !stack.isEmpty()) {
                  Iterator<NestedInteger> top = stack.peek();
                  if (!top.hasNext()) { stack.pop(); continue; }     // this list is finished
                  NestedInteger x = top.next();
                  if (x.isInteger()) pending = x.getInteger();         // found one: cache it
                  else stack.push(x.getList().iterator());             // dig into the sub-list
              }
              return pending != null;
          }

          @Override
          public Integer next() {
              if (!hasNext()) throw new NoSuchElementException();
              Integer ans = pending;
              pending = null;
              return ans;
          }
      }`,
        alt: [{ lang: 'python', code: `
class NestedIterator:
    """LeetCode-style: elements have isInteger(), getInteger(), getList()."""
    def __init__(self, nestedList):
        self.stack = [iter(nestedList)]
        self.pending = None

    def hasNext(self) -> bool:
        while self.pending is None and self.stack:
            x = next(self.stack[-1], None)
            if x is None:
                self.stack.pop()                 # finished this list
            elif x.isInteger():
                self.pending = x.getInteger()
            else:
                self.stack.append(iter(x.getList()))
        return self.pending is not None

    def next(self) -> int:
        if not self.hasNext():
            raise StopIteration
        ans, self.pending = self.pending, None
        return ans
` }],
        dry: {
          head: ['call', 'stack (top on the right)', 'pending', 'returns'],
          rows: [
            ['init', 'it([1,[4,[6]]])', 'null', '—'],
            ['hasNext', 'it(outer)', '1', 'true'],
            ['next', 'it(outer)', 'null', '<span class="c-g">1</span>'],
            ['hasNext', 'outer, it([4,[6]])', '4', 'true (pushed sub-list)'],
            ['next', 'outer, it([4,[6]])', 'null', '<span class="c-g">4</span>'],
            ['hasNext', 'outer, [4,[6]], it([6])', '6', 'true'],
            ['next', 'same', 'null', '<span class="c-g">6</span>'],
            ['hasNext', 'pops all three', 'null', '<span class="c-r">false</span>']
          ]
        },
        complexity: `<p><b>Time:</b> O(N + L) over the whole iteration (N integers, L lists) → amortised O(1) per call. <b>Space:</b> O(D), the maximum nesting depth.</p>`,
        followUps: ['Support remove() of the last returned element.', 'Iterate in reverse order.', 'Make it work on a nested structure streamed from disk.']
      }
    }]
  });

  // =====================================================================
  // TOPIC 8 — Hit counter and sliding-window counting (rate limiting)
  // =====================================================================
  topics.push({
    title: 'Hit Counter: Counting Events in a Sliding Time Window (and Rate Limiters)',
    analogy: `<p>A shop has a <b>clock face with 60 little trays</b>, one per second of the minute. Each customer who walks in drops a marble in the tray for the current second. When the second hand comes round to a tray again a minute later, you first <b>empty</b> the old marbles (they are from last minute) and then start counting again.</p>
      <p>"How many customers in the last minute?" = add up the 60 trays. The memory never grows, no matter how many customers come — that is the <b>circular-buffer hit counter</b>, and it is the heart of every <b>rate limiter</b>.</p>`,
    explain: `<p><b>The interview version (LeetCode 362):</b> <code>hit(timestamp)</code> records a hit (timestamps in seconds, non-decreasing; several hits may share a second); <code>getHits(timestamp)</code> returns the number of hits in the <b>past 300 seconds</b>, i.e. times in <code>(timestamp − 300, timestamp]</code>.</p>
      <p><b>Approach 1 — queue of timestamps.</b> <code>hit</code>: push t. <code>getHits</code>: pop from the front while <code>front ≤ t − 300</code>, return the size. Simple and exact, amortised O(1), but memory = number of hits in the window (a million hits per second → 300 million entries).</p>
      <p><b>Approach 2 — circular buffer of 300 buckets (the follow-up answer).</b> Two arrays of size 300: <code>times[i]</code> (which second bucket i currently represents) and <code>counts[i]</code>. Bucket for time t is <code>i = t % 300</code>.</p>
      <ul>
        <li><b>hit(t):</b> if <code>times[i] != t</code>, the bucket holds an old second → reset it: <code>times[i] = t, counts[i] = 1</code>. Else <code>counts[i]++</code>.</li>
        <li><b>getHits(t):</b> sum <code>counts[i]</code> for every bucket with <code>t − times[i] &lt; 300</code> (still inside the window).</li>
      </ul>
      <p>Memory is <b>O(300) forever</b>, and each call is O(300) = O(1) with respect to traffic.</p>
      <p><b>Tiny example with a 5-second window</b> (bucket = t % 5): hits at 1, 1, 2, 4, then <code>getHits(4)</code>:</p>
      ${H.arr([0, 1, 2, 0, 4], { label: 'times', idx: true, hl: { 1: 'b', 2: 'b', 4: 'b' } })}${H.arr([0, 2, 1, 0, 1], { label: 'counts', idx: true, hl: { 1: 'b', 2: 'b', 4: 'b' } })}
      <p>Valid buckets: those with 4 − times[i] &lt; 5 and a real hit → 2 + 1 + 1 = <b>4</b>. A hit at t = 6 lands in bucket 1, sees <code>times[1] = 1 ≠ 6</code> and <b>overwrites</b> it — the two old hits at second 1 are forgotten exactly when they leave the window.</p>
      <p><b>Same skeleton, many products:</b> rate limiters ("at most 100 requests per user per minute"), dashboards ("errors in the last 5 minutes"), moving averages, and abuse detection.</p>`,
    clues: [
      '"Count hits / events in the <b>past 5 minutes</b> (300 seconds)" → sliding window over time: queue of timestamps or 300 circular buckets.',
      '"What if the number of hits per second is <b>very large</b>?" → bucketed counts (O(window) memory) instead of one entry per hit.',
      '"Timestamps are <b>monotonically non-decreasing</b>" → you can evict from the front of a queue; buckets are never revisited out of order.',
      '"Allow at most N requests per user per T seconds" → rate limiter: fixed window, sliding log, sliding window counter, or token bucket.',
      '"Print each unique message at most once every 10 seconds" (Logger Rate Limiter) → map message → next allowed time.',
      '"Moving average of the last k values" → fixed-size circular queue with a running sum.',
      '"Must work across many servers" → central counter store (Redis INCR + EXPIRE, or sorted-set sliding log), accept approximate counts.'
    ],
    code: [`
      // LeetCode 362 follow-up: O(1) memory regardless of traffic, using 300 circular buckets.
      class HitCounter {
          private static final int WINDOW = 300;
          private final int[] times = new int[WINDOW];    // which second each bucket currently holds
          private final int[] counts = new int[WINDOW];   // how many hits in that second

          public void hit(int timestamp) {
              int i = timestamp % WINDOW;
              if (times[i] != timestamp) {                // bucket holds an expired second: recycle it
                  times[i] = timestamp;
                  counts[i] = 1;
              } else {
                  counts[i]++;                            // another hit in the same second
              }
          }

          public int getHits(int timestamp) {
              int total = 0;
              for (int i = 0; i < WINDOW; i++)
                  if (counts[i] > 0 && timestamp - times[i] < WINDOW) total += counts[i];   // still in window
              return total;
          }
      }`, `
      // Token bucket rate limiter: smooth limit with bursts up to 'capacity'.
      class TokenBucket {
          private final double capacity, refillPerSec;
          private double tokens;
          private long lastNanos;

          TokenBucket(double capacity, double refillPerSec) {
              this.capacity = capacity;
              this.refillPerSec = refillPerSec;
              this.tokens = capacity;                       // start full: allow an initial burst
              this.lastNanos = System.nanoTime();
          }

          synchronized boolean tryAcquire() {
              long now = System.nanoTime();
              tokens = Math.min(capacity, tokens + (now - lastNanos) / 1e9 * refillPerSec);  // lazy refill
              lastNanos = now;
              if (tokens >= 1) { tokens -= 1; return true; }
              return false;                                 // over the limit: reject (HTTP 429)
          }
      }`, { lang: 'python', run: true, title: 'Queue vs buckets on the same trace (runnable Python)', code: `
from collections import deque

class QueueCounter:
    def __init__(self, window):
        self.w, self.q = window, deque()
    def hit(self, t):
        self.q.append(t)
    def get_hits(self, t):
        while self.q and self.q[0] <= t - self.w:
            self.q.popleft()
        return len(self.q)

class BucketCounter:
    def __init__(self, window):
        self.w = window
        self.times = [0] * window
        self.counts = [0] * window
    def hit(self, t):
        i = t % self.w
        if self.times[i] != t:
            self.times[i], self.counts[i] = t, 1
        else:
            self.counts[i] += 1
    def get_hits(self, t):
        return sum(c for tm, c in zip(self.times, self.counts) if c and t - tm < self.w)

trace = [("h", 1), ("h", 1), ("h", 2), ("h", 300), ("g", 300), ("g", 301), ("h", 301), ("g", 600), ("g", 601)]
qc, bc = QueueCounter(300), BucketCounter(300)
for op, t in trace:
    if op == "h":
        qc.hit(t); bc.hit(t)
    else:
        print("getHits(" + str(t) + "): queue =", qc.get_hits(t), "| buckets =", bc.get_hits(t))
` }],
    codeTitle: ['Circular-bucket hit counter (Java)', 'Token bucket rate limiter (Java)', 'Queue vs buckets (runnable Python)'],
    viz: {
      title: 'Circular buckets: old seconds are recycled; getHits sums the buckets still inside the window',
      input: '5 | h1 h1 h2 h4 g4 h6 g6 h6 g9 h11 g11',
      inputLabel: 'window W | ops (hT = hit at time T, gT = getHits at time T; non-decreasing)',
      gen: function (input) {
        var parts = splitBar(input, 2, '5 | h1 h2 g4');
        var W = toInt(parts[0], 'Window', 2, 10);
        var toks = parts[1].split(/[\s,]+/).filter(Boolean);
        if (!toks.length || toks.length > 18) throw new Error('Use 1 to 18 operations');
        var ops = toks.map(function (t) {
          var m = /^([hHgG])(\d{1,3})$/.exec(t);
          if (!m) throw new Error('Could not read "' + t + '". Use h<time> or g<time>, e.g. h3 g5');
          return { op: m[1].toLowerCase(), t: Number(m[2]) };
        });
        for (var q = 1; q < ops.length; q++) if (ops[q].t < ops[q - 1].t) throw new Error('Times must be non-decreasing (that is the problem promise)');
        var times = [], counts = [], frames = [], log = [];
        for (var i = 0; i < W; i++) { times.push(0); counts.push(0); }
        function snap(narr, hl, vars, vh) {
          frames.push({ narr: narr, parts: [
            { type: 'array', label: 'times[i] (which second the bucket holds)', values: times.slice(), hl: hl },
            { type: 'array', label: 'counts[i]', values: counts.slice(), hl: hl },
            { type: 'queue', label: 'same hits as a plain queue (for comparison)', items: log.length ? log.slice() : ['(empty)'], frontLabel: 'oldest', backLabel: 'newest' },
            { type: 'vars', vals: vars || { W: W }, hl: vh || {} }
          ] });
        }
        snap('Window W = <b>' + W + '</b> seconds → just <b>' + W + '</b> buckets. Time t goes to bucket <code>t % ' + W + '</code>.', {}, { W: W, buckets: W });
        ops.forEach(function (o) {
          var t = o.t, b = t % W, hl = {};
          if (o.op === 'h') {
            log.push(t);
            if (times[b] !== t) {
              var old = counts[b] ? ' (it held ' + counts[b] + ' old hit(s) from second ' + times[b] + ' — they are outside the window now, so they are dropped)' : '';
              times[b] = t; counts[b] = 1; hl[b] = 'ok';
              snap('<b>hit(' + t + ')</b> → bucket ' + t + ' % ' + W + ' = <b>' + b + '</b>. It does not hold second ' + t + ', so <b>recycle</b> it: times = ' + t + ', count = 1' + old + '.', hl, { t: t, bucket: b, W: W }, { bucket: 'ok' });
            } else {
              counts[b]++; hl[b] = 'cur';
              snap('<b>hit(' + t + ')</b> → bucket <b>' + b + '</b> already holds second ' + t + ' → count becomes ' + counts[b] + '.', hl, { t: t, bucket: b, W: W }, { bucket: 'cur' });
            }
          } else {
            var total = 0;
            for (var k = 0; k < W; k++) {
              if (!counts[k]) continue;
              if (t - times[k] < W) { hl[k] = 'win'; total += counts[k]; } else hl[k] = 'done';
            }
            while (log.length && log[0] <= t - W) log.shift();
            snap('<b>getHits(' + t + ')</b>: keep buckets with ' + t + ' − times[i] &lt; ' + W + ' (blue), ignore stale ones (faded). Sum = <b>' + total + '</b>. The queue version pops times ≤ ' + (t - W) + ' and also has ' + log.length + '.', hl, { t: t, 'window': '(' + (t - W) + ', ' + t + ']', hits: total }, { hits: 'sel' });
          }
        });
        snap('Done. The buckets used ' + W + ' slots the whole time; the queue would grow with traffic (imagine 10,000 hits per second).', {}, { W: W, 'queue size': log.length });
        return frames;
      }
    },
    examples: [
      {
        title: 'LeetCode 362 sample',
        html: `<p><code>hit(1) hit(2) hit(3) getHits(4) hit(300) getHits(300) getHits(301)</code></p>
          ${H.table(['call', 'window', 'hits inside', 'answer'], [
            ['getHits(4)', '(−296, 4]', '1, 2, 3', '3'], ['getHits(300)', '(0, 300]', '1, 2, 3, 300', '4'], ['getHits(301)', '(1, 301]', '2, 3, 300', H.c('y', '3') + ' (hit at 1 expired)']
          ])}
          <p>Watch the boundary: at t = 301 the window is <i>(1, 301]</i>, so the hit at exactly 1 is out. Using <code>&lt;=</code> instead of <code>&lt;</code> in the bucket check is the classic off-by-one.</p>`
      },
      {
        title: 'Four rate-limiting algorithms compared',
        html: `${H.table(['algorithm', 'state per user', 'accuracy', 'notes'], [
            ['Fixed window', '1 counter + window id', 'allows 2× bursts at window edges', 'simplest: Redis INCR + EXPIRE'],
            ['Sliding log', 'every request timestamp', 'exact', 'memory grows with traffic (sorted set per user)'],
            ['Sliding window counter', '2 counters', 'very close', 'estimate = current + previous × overlap fraction'],
            ['Token bucket', 'tokens + last refill time', 'smooth, allows controlled bursts', 'used by AWS API Gateway, Stripe-style limiters']
          ])}
          <p><b>Sliding window counter worked example:</b> limit 100/min. Previous minute had 80 requests, current minute has 30 so far, we are 25% into the current minute. Estimate = 30 + 80 × 0.75 = <b>90</b> → allow.</p>`
      },
      {
        title: 'Logger rate limiter (print at most every 10 s)',
        html: `<p>Keep <code>Map&lt;String, Integer&gt; nextAllowed</code>. <code>shouldPrint(t, msg)</code>: if <code>t &lt; nextAllowed.getOrDefault(msg, 0)</code> return false; else set <code>nextAllowed = t + 10</code> and return true. Memory grows with distinct messages — evict old ones with an LRU or by sweeping entries whose time has passed.</p>`,
        code: `
      class Logger {
          private final Map<String, Integer> nextAllowed = new HashMap<>();
          boolean shouldPrintMessage(int timestamp, String message) {
              if (timestamp < nextAllowed.getOrDefault(message, 0)) return false;   // still muted
              nextAllowed.put(message, timestamp + 10);
              return true;
          }
      }`
      },
      {
        title: 'Distributed hit counting with Redis',
        html: `<p>Many web servers, one counter: key per user per second, e.g. <code>hits:u42:1700000123</code>, <code>INCR</code> it and set <code>EXPIRE 300</code>. To read the last 5 minutes, sum the 300 keys (pipeline them), or keep per-minute keys and accept minute granularity. For exact sliding logs use a sorted set: <code>ZADD</code> the timestamp, <code>ZREMRANGEBYSCORE</code> anything older than now − 300, <code>ZCARD</code> to count — wrap them in a Lua script or <code>MULTI</code> so they run atomically.</p>`
      }
    ],
    deepDive: `<p><b>Correctness of bucket recycling.</b> Bucket i can only hold seconds ≡ i (mod W). When a hit arrives at t and <code>times[i] = t' ≠ t</code>, then t' ≤ t − W (the previous second mapping to the same bucket is at least W earlier), so all hits in that bucket are outside the window for every future query — safe to overwrite. This relies on <b>non-decreasing</b> timestamps; out-of-order events need per-bucket checks or a different structure.</p>
      <p><b>Granularity vs memory.</b> 300 buckets of 1 s is exact for whole-second timestamps. For millisecond timestamps you either accept 1-second granularity (approximate at the window edge) or use more buckets. Monitoring systems (Prometheus counters + <code>rate()</code>, Hystrix/Resilience4j rolling windows) use exactly this bucketed ring.</p>
      <p><b>Concurrency.</b> Many threads hitting the same bucket: use <code>AtomicIntegerArray</code> / <code>LongAdder</code> per bucket, and handle the recycle race (two threads both see an old <code>times[i]</code> and both reset → one hit lost). Production fix: pack (second, count) into one <code>AtomicLong</code> and update it with compare-and-set, or accept tiny inaccuracy (dashboards usually can).</p>
      <p><b>Per-user limiting at scale.</b> 10 million users × 300 buckets is too much; use a <b>sliding window counter</b> (2 numbers per user) or a <b>token bucket</b> (2 numbers per user, refill computed lazily on access — no background timer). Put the state next to the gateway (in-memory with sticky routing) or in Redis; decide <b>fail-open vs fail-closed</b> if the limiter store is down.</p>
      <p><b>Heavy hitters.</b> "Which users made the most requests?" needs top-k, not just a count: Count-Min Sketch + min-heap, or the Space-Saving algorithm — bounded memory, approximate counts.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI writes the queue version instantly; the interview signal is the <b>follow-up</b> (huge traffic → buckets; many servers → Redis; per user → token bucket) and the boundary reasoning. Expect to be asked to review an AI-written limiter for the edge-burst flaw of fixed windows or a race in the bucket reset.</p>
      <p><b>AI products live on rate limits:</b> LLM APIs limit <b>requests per minute and tokens per minute</b> per key — a token bucket whose "cost" per request is the number of tokens, not 1. Your own app must <b>client-side</b> limit and back off (exponential backoff with jitter on HTTP 429), and agent loops need budgets ("at most 20 tool calls per task") — the same counter ideas applied to agents.</p>
      <p><b>Use AI as a partner:</b> <code>Simulate fixed-window vs sliding-window-counter vs token-bucket on a bursty trace and plot accepted requests</code>. <b>What you must still own:</b> the window boundary (open vs closed end), why recycling is safe, and which algorithm fits the product's fairness needs.</p>`,
    problems: [{
      title: 'Design Hit Counter', level: 'Medium', tags: ['design', 'queue', 'circular buffer'], companies: ['Dropbox', 'Google', 'Amazon', 'Microsoft'],
      statement: `<p>Design a hit counter: <code>hit(int timestamp)</code> records a hit; <code>getHits(int timestamp)</code> returns the number of hits in the past 5 minutes (300 seconds), i.e. with time in <code>(timestamp − 300, timestamp]</code>. Calls arrive in non-decreasing timestamp order; several hits may share a timestamp. <b>Follow-up:</b> what if there are a huge number of hits per second?</p>`,
      constraints: `1 ≤ timestamp ≤ 2·10<sup>9</sup>, at most 300 calls in the base version — design for millions in the follow-up.`,
      example: `<p><code>hit(1) hit(2) hit(3) getHits(4)→${H.c('g', '3')} hit(300) getHits(300)→${H.c('g', '4')} getHits(301)→${H.c('y', '3')}</code> — at 301 the window is (1, 301], so the hit at second 1 has expired.</p>`,
      brute: {
        why: `<p>Keep every hit timestamp in a list and, on <code>getHits</code>, count the ones with <code>t − x &lt; 300</code> by scanning the <b>whole</b> list. Old hits are never removed, so memory grows forever and each query is O(total hits ever) — re-checking hits that expired long ago is the wasted work.</p>`,
        code: `
      class HitCounterBrute {
          private final List<Integer> all = new ArrayList<>();
          void hit(int t) { all.add(t); }                // never cleaned up
          int getHits(int t) {
              int c = 0;
              for (int x : all) if (t - x < 300) c++;      // O(all hits ever)
              return c;
          }
      }`
      },
      mcq: { q: 'In the bucket version, hit(t) finds times[t % 300] != t. Why is it safe to overwrite that bucket?', options: ['Because counts are approximate anyway', 'Because the stored second is at least 300 seconds older than t, so its hits are out of every future window', 'Because buckets are cleared by a timer', 'It is not safe; we must add the counts'], answer: 1, explain: 'Seconds sharing a bucket differ by a multiple of 300; with non-decreasing time the stored one is ≤ t − 300, so it can never be inside (t′ − 300, t′] for any t′ ≥ t.' },
      hints: [
        `<p>Hint 1: Only hits from the last 300 seconds matter, and time never goes backwards — so old hits can be thrown away the moment they expire.</p>`,
        `<p>Hint 2: Simple: a queue of timestamps; pop from the front while front ≤ t − 300. Scalable: 300 buckets indexed by <code>t % 300</code> storing (second, count).</p>`,
        `<p>Hint 3: Bucket recipe — hit: i = t % 300; if times[i] != t then times[i] = t, counts[i] = 1 else counts[i]++. getHits: sum counts[i] where t − times[i] &lt; 300. Check the boundary with the sample: getHits(301) must exclude second 1.</p>`
      ],
      solution: {
        approach: `<p>Circular array of 300 buckets, each remembering which second it represents and how many hits it has. A hit recycles a stale bucket or increments a current one; a query sums buckets still inside the window. Memory and per-call time are O(300), independent of traffic.</p>`,
        code: `
      class HitCounter {
          private final int[] times = new int[300];
          private final int[] counts = new int[300];

          public void hit(int timestamp) {
              int i = timestamp % 300;
              if (times[i] != timestamp) { times[i] = timestamp; counts[i] = 1; }
              else counts[i]++;
          }

          public int getHits(int timestamp) {
              int total = 0;
              for (int i = 0; i < 300; i++)
                  if (timestamp - times[i] < 300) total += counts[i];
              return total;
          }
      }`,
        alt: [{ lang: 'python', code: `
from collections import deque

class HitCounter:
    """Queue version: exact, amortised O(1), memory = hits in the window."""
    def __init__(self):
        self.q = deque()

    def hit(self, timestamp: int) -> None:
        self.q.append(timestamp)

    def getHits(self, timestamp: int) -> int:
        while self.q and self.q[0] <= timestamp - 300:
            self.q.popleft()
        return len(self.q)
` }],
        dry: {
          head: ['call', 'bucket i = t % 300', 'bucket state (time, count)', 'answer'],
          rows: [
            ['hit(1)', '1', '(1, 1)', '—'],
            ['hit(2)', '2', '(2, 1)', '—'],
            ['hit(3)', '3', '(3, 1)', '—'],
            ['getHits(4)', 'all', 'buckets 1, 2, 3 valid', '<span class="c-g">3</span>'],
            ['hit(300)', '0', '(300, 1)', '—'],
            ['getHits(300)', 'all', '300 − 1 = 299 &lt; 300 ✓', '<span class="c-g">4</span>'],
            ['getHits(301)', 'all', '301 − 1 = 300 not &lt; 300 ✗', '<span class="c-y">3</span>']
          ]
        },
        complexity: `<p><b>Bucket version:</b> hit O(1), getHits O(300) = O(1) w.r.t. traffic, memory O(300). <b>Queue version:</b> amortised O(1) per call, memory O(hits in window).</p>`,
        followUps: ['Make it thread-safe without a global lock.', 'Per-user counts for 10M users.', 'Change the window to 1 hour with 1-second accuracy — memory?']
      }
    }]
  });

  // =====================================================================
  // TOPIC 9 — Autocomplete system (trie + top-k)
  // =====================================================================
  function parseSentences(s) {
    var items = s.split(',').map(function (x) { return x.trim(); }).filter(Boolean);
    if (items.length < 1 || items.length > 10) throw new Error('Give 1 to 10 sentences like: i love you:5, island:3');
    return items.map(function (it) {
      var m = /^([a-z ]{1,24}):(\d{1,3})$/.exec(it);
      if (!m) throw new Error('Could not read "' + it + '". Use lowercase words and spaces, then :count, e.g. island:3');
      return { s: m[1], c: Number(m[2]) };
    });
  }
  topics.push({
    title: 'Autocomplete System: Trie + Top-K Suggestions per Prefix',
    analogy: `<p>A <b>librarian</b> keeps a card index sorted letter by letter: a drawer for "i", inside it a folder for "is", inside that a folder for "isl"… Pinned to the front of every folder is a sticky note: "<b>the 3 most popular titles in this folder</b>". When you say the first letters of a title, she walks into the matching folder and simply reads you the sticky note — she does not open every card.</p>
      <p>That is an <b>autocomplete system</b>: a <b>trie</b> (the letter-by-letter folders) plus a <b>precomputed top-k list</b> at each node (the sticky notes) so every keystroke is answered instantly.</p>`,
    explain: `<p><b>A trie</b> (from re<b>trie</b>val, often said "try") is a tree where each edge is a character and each path from the root spells a prefix. All words sharing a prefix share the same path, so "find everything starting with <i>isl</i>" = walk 3 edges, then look below that node.</p>
      <p><b>The interview version (LeetCode 642):</b> constructor gets historical sentences with counts. Then the user types one character at a time with <code>input(c)</code>:</p>
      <ul>
        <li>For a normal character: return the <b>top 3</b> historical sentences that start with everything typed so far, ranked by <b>count (high first)</b>, ties by <b>ASCII order</b> (smaller first).</li>
        <li>For <code>'#'</code>: the sentence is finished — save it (count + 1, or new with count 1), reset the typed prefix, return an empty list.</li>
      </ul>
      <p><b>Two designs:</b></p>
      ${H.table(['design', 'per keystroke', 'per new sentence', 'memory'], [
        ['A. Trie + DFS on demand', 'walk 1 edge, then <b>visit the whole subtree</b> and pick top 3 → O(subtree)', 'O(L)', 'small'],
        ['B. Trie + <b>cached top-k at every node</b>', 'walk 1 edge, <b>read the sticky note</b> → O(k)', 'O(L · k log k) to update notes on the path', 'k entries per node']
      ])}
      <p>Real search boxes read far more than they write, so design <b>B</b> wins: reads must be fast (every keystroke, under ~100 ms end to end), and updates can be slow or even batched offline.</p>
      <p><b>Ranking example</b> with history <code>i love you (5), island (3), ironman (2), i love leetcode (2)</code>:</p>
      ${H.table(['typed', 'matches', 'top 3 returned'], [
        ['"i"', 'all four', 'i love you, island, <b>i love leetcode</b> (ties with ironman at 2, but " " (32) &lt; "r" (114) in ASCII)'],
        ['"i "', 'i love you, i love leetcode', 'i love you, i love leetcode'],
        ['"i a"', 'none', '[]'],
        ['"#"', 'saves "i a" with count 1', '[]']
      ])}
      <p><b>Keep a pointer to the current trie node</b> between keystrokes: typing one more character is one step down from where you were, not a new walk from the root. If the step does not exist, remember that you "fell off" the trie, so later characters return [] immediately until <code>#</code>.</p>`,
    clues: [
      '"Return the <b>top 3</b> historical sentences that have the same <b>prefix</b>" → trie + top-k (cached per node or DFS + heap).',
      '"Ranked by <b>hot degree</b> (frequency), ties broken by <b>ASCII</b> order" → comparator: count descending, then string ascending.',
      '"User types <b>one character at a time</b>" → keep the current trie node between calls; never restart from the root.',
      '"Special character <b>#</b> ends the sentence, which is then recorded" → increment count and update the top-k notes along its path.',
      '"Design typeahead / search suggestions for <b>billions of queries</b>" → offline aggregation, precomputed top-k per prefix, sharded tries, caching at the edge.',
      '"Find all words with a given prefix / count words with prefix" → trie with per-node counters.',
      '"Suggestions even with a <b>typo</b>" → edit-distance-bounded trie search or n-gram / fuzzy index (out of scope for LC, great to mention).'
    ],
    code: [`
      // Autocomplete with a trie whose nodes cache their top-3 sentences (design B).
      class AutocompleteSystem {
          private static class Node {
              final Map<Character, Node> kids = new HashMap<>();
              final List<String> top = new ArrayList<>();     // best <= 3 sentences below this node
          }

          private final Node root = new Node();
          private final Map<String, Integer> count = new HashMap<>();
          private final StringBuilder typed = new StringBuilder();
          private Node cur = root;                               // node for what has been typed so far
          private boolean fellOff = false;                       // typed prefix not in the trie

          AutocompleteSystem(String[] sentences, int[] times) {
              for (int i = 0; i < sentences.length; i++) add(sentences[i], times[i]);
          }

          // Higher count first; ties: smaller string (ASCII) first.
          private int better(String a, String b) {
              int ca = count.get(a), cb = count.get(b);
              return ca != cb ? Integer.compare(cb, ca) : a.compareTo(b);
          }

          private void add(String s, int times) {
              count.merge(s, times, Integer::sum);
              Node n = root;
              for (char ch : s.toCharArray()) {
                  n = n.kids.computeIfAbsent(ch, c -> new Node());
                  if (!n.top.contains(s)) n.top.add(s);           // s may enter this node's top list
                  n.top.sort(this::better);                       // at most 4 items: cheap
                  if (n.top.size() > 3) n.top.remove(3);          // keep only the best 3
              }
          }

          public List<String> input(char c) {
              if (c == '#') {                                     // sentence finished: record it, reset
                  add(typed.toString(), 1);
                  typed.setLength(0);
                  cur = root;
                  fellOff = false;
                  return new ArrayList<>();
              }
              typed.append(c);
              if (fellOff) return new ArrayList<>();
              cur = cur.kids.get(c);                              // one step down — not a walk from the root
              if (cur == null) { fellOff = true; return new ArrayList<>(); }
              return new ArrayList<>(cur.top);                    // O(k): read the sticky note
          }
      }`, { lang: 'python', run: true, title: 'Trie with cached top-3 (runnable Python)', code: `
class Node:
    __slots__ = ("kids", "top")
    def __init__(self):
        self.kids, self.top = {}, []

class Autocomplete:
    def __init__(self, sentences, times):
        self.root, self.count = Node(), {}
        self.typed, self.cur = "", self.root
        for s, t in zip(sentences, times):
            self._add(s, t)

    def _key(self, s):
        return (-self.count[s], s)          # high count first, then ASCII order

    def _add(self, s, t):
        self.count[s] = self.count.get(s, 0) + t
        n = self.root
        for ch in s:
            n = n.kids.setdefault(ch, Node())
            if s not in n.top:
                n.top.append(s)
            n.top.sort(key=self._key)
            del n.top[3:]

    def input(self, c):
        if c == "#":
            self._add(self.typed, 1)
            self.typed, self.cur = "", self.root
            return []
        self.typed += c
        if self.cur is not None:
            self.cur = self.cur.kids.get(c)
        return list(self.cur.top) if self.cur else []

ac = Autocomplete(["i love you", "island", "ironman", "i love leetcode"], [5, 3, 2, 2])
for ch in "i a#":
    print(repr(ch), "->", ac.input(ch))
for ch in "i a":
    print(repr(ch), "->", ac.input(ch))
` }],
    codeTitle: ['Autocomplete system, top-3 cached per node (Java)', 'Python version (runnable)'],
    viz: {
      title: 'Autocomplete: each keystroke moves one trie step and reads that node\'s top-3',
      input: 'i love you:5, island:3, ironman:2, i love leetcode:2 | i a#i a',
      inputLabel: 'sentences with counts | characters typed (# ends a sentence)',
      gen: function (input) {
        var raw = String(input === undefined ? '' : input);
        var bar = raw.indexOf('|');
        if (bar < 0) throw new Error('Format: sentence:count, sentence:count | typed characters');
        var hist = parseSentences(raw.slice(0, bar));
        var typedAll = raw.slice(bar + 1).replace(/^\s/, '');
        if (!typedAll.length || typedAll.length > 14) throw new Error('Type 1 to 14 characters after the |');
        if (!/^[a-z #]+$/.test(typedAll)) throw new Error('Typed characters: lowercase letters, spaces and #');
        var count = {}; hist.forEach(function (h) { count[h.s] = (count[h.s] || 0) + h.c; });
        function rank(list) { return list.slice().sort(function (a, b) { return count[b] - count[a] || (a < b ? -1 : a > b ? 1 : 0); }); }
        function tableFor(prefix) {
          var all = rank(Object.keys(count));
          var rows = all.map(function (s) { var m = s.indexOf(prefix) === 0; return [s, count[s], m ? 'yes' : 'no']; });
          return rows;
        }
        var frames = [], typed = '';
        var t0 = tableFor('');
        frames.push({ narr: 'History loaded into the trie. Every node on a sentence\'s path keeps a sticky note with its top-3 (by count, then ASCII). Nothing typed yet.', parts: [
          { type: 'table', label: 'all sentences ranked (count desc, then ASCII)', columns: ['sentence', 'count', 'matches prefix?'], rows: t0 },
          { type: 'vars', vals: { typed: '""', node: 'root' } }
        ] });
        for (var i = 0; i < typedAll.length; i++) {
          var c = typedAll.charAt(i);
          if (c === '#') {
            var newOne = !(typed in count);
            count[typed] = (count[typed] || 0) + 1;
            var rows2 = tableFor('\u0000'), hl2 = {};
            rank(Object.keys(count)).forEach(function (s, k) { if (s === typed) hl2[k] = 'ok'; });
            frames.push({ narr: '<b>#</b>: the user submitted "' + typed + '". ' + (newOne ? 'It is new → insert it with count 1' : 'It exists → count becomes ' + count[typed]) + ', and update the top-3 notes on every node along its path (only ' + typed.length + ' nodes). Reset to the root.', parts: [
              { type: 'table', label: 'history after recording', columns: ['sentence', 'count', 'matches prefix?'], rows: rows2.map(function (r) { return [r[0], r[1], '—']; }), hl: hl2 },
              { type: 'vars', vals: { typed: '""', node: 'root', returned: '[]' }, hl: { returned: 'cur' } }
            ] });
            typed = '';
            continue;
          }
          typed += c;
          var matches = rank(Object.keys(count).filter(function (s) { return s.indexOf(typed) === 0; }));
          var top = matches.slice(0, 3), rows = tableFor(typed), hl = {};
          rows.forEach(function (r, k) { if (top.indexOf(r[0]) >= 0) hl[k] = 'sel'; else if (r[2] === 'yes') hl[k] = 'win'; else hl[k] = 'done'; });
          var kids = {};
          Object.keys(count).forEach(function (s) { if (s.indexOf(typed) === 0 && s.length > typed.length) { var nx = s.charAt(typed.length) === ' ' ? '␣' : s.charAt(typed.length); kids[nx] = (kids[nx] || 0) + 1; } });
          var kidEntries = Object.keys(kids).sort().map(function (k) { return [k, kids[k] + ' sentence(s) below']; });
          frames.push({ narr: 'Typed <b>"' + typed.replace(/ /g, '␣') + '"</b> (one step down from the previous node). ' + (matches.length ? matches.length + ' sentence(s) live below this node; return the note: <b>[' + top.join(', ') + ']</b>.' : 'No such child → we <span class="c-r">fell off the trie</span>; return [] until #.'), parts: [
            { type: 'array', label: 'typed prefix (one trie edge per character)', values: typed.split('').map(function (x) { return x === ' ' ? '␣' : x; }), hl: one(typed.length - 1, matches.length ? 'cur' : 'bad') },
            { type: 'map', label: 'children of the current node (next characters)', entries: kidEntries.length ? kidEntries : [['—', matches.length ? 'leaf' : 'no node']] },
            { type: 'table', label: 'purple = returned top-3 · blue = matches but not top-3', columns: ['sentence', 'count', 'matches prefix?'], rows: rows, hl: hl },
            { type: 'vars', vals: { typed: '"' + typed + '"', returned: top.length ? top.join(' | ') : '[]' }, hl: { returned: top.length ? 'ok' : 'bad' } }
          ] });
        }
        return frames;
      }
    },
    examples: [
      {
        title: 'Tie-breaking by ASCII, worked carefully',
        html: `<p>"ironman" and "i love leetcode" both have count 2. Compare character by character: both start with 'i'; next characters are 'r' (114) and ' ' (32). Space is smaller, so <b>"i love leetcode"</b> ranks first. In Java <code>"i love leetcode".compareTo("ironman") &lt; 0</code>.</p>
          ${H.table(['rank', 'sentence', 'count'], [['1', 'i love you', '5'], ['2', 'island', '3'], ['3', H.c('g', 'i love leetcode'), '2'], ['4', H.c('m', 'ironman'), '2']])}`
      },
      {
        title: 'Why cached top-k stays correct when counts only grow',
        html: `<p>When sentence s gains +1, only nodes on <i>s's own path</i> can change their top-3: every other sentence's count is unchanged, so their relative order is unchanged. At each node on the path: if s is already in the list, re-sort; if not, add s, sort, and drop the 4th. A sentence that was outside the top-3 cannot sneak in without its own count increasing — which would trigger an update on its own path.</p>
          <p>Deleting or <i>decreasing</i> counts breaks this shortcut: a node may need a sentence from deeper in its subtree to refill the list. Then either store top-k with some slack (k + buffer) or recompute the node from its children's lists.</p>`
      },
      {
        title: 'Memory estimate for a production typeahead',
        html: `<p>Say 10 million distinct popular queries, average 20 characters. A naive trie node in Java (HashMap of children + list) costs ~100+ bytes → up to 200 million nodes ≈ 20 GB. Too much for one box. Fixes: <b>compress</b> single-child chains (radix tree), store children in sorted arrays, keep only queries above a popularity threshold, <b>shard</b> by first characters, or use a finite-state transducer (Lucene's suggesters).</p>
          ${H.table(['technique', 'saves'], [['radix / Patricia trie', 'nodes for long unique tails'], ['top-k IDs instead of strings', 'string copies at every node'], ['threshold (count ≥ 10)', 'the long tail of one-off queries'], ['FST (Lucene)', 'shares suffixes too — often 10× smaller']])}`
      },
      {
        title: 'The production pipeline (system design view)',
        html: `<p>Search logs → hourly/daily <b>aggregation job</b> (MapReduce/Spark: count queries, filter spam and offensive terms) → build tries with top-k per prefix → push to <b>suggestion servers</b> (sharded by prefix, replicated) → <b>cache</b> hot prefixes at the CDN/browser (short prefixes like "a", "th" are requested constantly). The client <b>debounces</b> keystrokes (e.g. waits ~50–100 ms) and cancels stale requests. Fresh trending queries can come from a small real-time layer merged with the batch results.</p>`
      }
    ],
    deepDive: `<p><b>Complexities (design B).</b> Let L = sentence length, k = 3. Constructor with N sentences: O(Σ L · k log k). <code>input(c)</code>: O(1) to step + O(k) to copy the list; with the "fell off" flag, characters after a missing edge are O(1). Recording on <code>#</code>: O(L · k log k). Memory: O(total characters + nodes × k references).</p>
      <p><b>Design A (DFS on demand)</b> is what many LeetCode solutions do: from the current node, collect every sentence below, then pick the top 3 with a size-3 heap. Typing "i" in a big history scans almost everything — fine for LeetCode sizes, unacceptable for production. Interviewers like hearing both and why you would pick B.</p>
      <p><b>Children representation.</b> <code>HashMap&lt;Character, Node&gt;</code> is flexible but heavy. For 27 symbols, a <code>Node[27]</code> array is fast but wastes memory on sparse nodes. Sorted small arrays or a <b>double-array trie</b> are common compact choices.</p>
      <p><b>Ranking beyond counts.</b> Real systems blend frequency with <b>recency</b> (exponential decay so yesterday's spike fades), <b>personalisation</b> (your own history), <b>location</b>, and safety filters. The trie then returns a candidate set (say top 50), and a lightweight ranker re-scores them.</p>
      <p><b>Fuzzy matching.</b> To suggest "island" for "isl<i>a</i>md": walk the trie while carrying a Levenshtein DP row per node and prune when the minimum in the row exceeds the allowed edits — the "trie + edit distance" technique; or use Levenshtein automata (Lucene).</p>
      <p><b>Related structures:</b> ternary search tree (less memory than a 26-way trie), suffix tree/array (search <i>anywhere</i> inside strings, not only prefixes), inverted index (word-level search).</p>`,
    aiEra: `<p><b>What AI changes:</b> classic prefix autocomplete is now often blended with <b>LLM / semantic suggestions</b> (predict the user's intent, not just the prefix) — but the trie layer is still there because it answers in microseconds, is deterministic, and is easy to filter for safety. An LLM call per keystroke is far too slow and expensive; a common pattern is trie for instant candidates + an ML ranker + occasional generative completions.</p>
      <p><b>Tries inside LLM tooling:</b> tokenizers (BPE/WordPiece) use trie-like longest-match lookups; <b>constrained decoding</b> (forcing an LLM to output valid JSON or one of N allowed labels) walks a trie of allowed token sequences and masks out tokens that leave it; code editors' AI completions still show the classic symbol autocomplete next to them.</p>
      <p><b>Use AI as a partner:</b> <code>Generate edge cases for LC 642: ties, sentence equal to a prefix of another, '#' with empty input, falling off the trie</code>. <b>Where AI goes wrong:</b> restarting the walk from the root each keystroke, forgetting to reset state on '#', or comparing by count only (wrong tie order).</p>`,
    problems: [{
      title: 'Design Search Autocomplete System', level: 'Hard', tags: ['design', 'trie', 'sorting', 'top-k'], companies: ['Amazon', 'Google', 'Microsoft', 'Uber', 'Lyft'],
      statement: `<p><code>AutocompleteSystem(String[] sentences, int[] times)</code> loads history. <code>List&lt;String&gt; input(char c)</code>: if c is <code>'#'</code>, store the sentence typed so far (count + 1), reset, and return []. Otherwise return the top 3 historical sentences that start with the typed prefix, ordered by count descending, then ASCII ascending (fewer than 3 if fewer match).</p>`,
      constraints: `n ≤ 100 sentences of length ≤ 100 (lowercase letters and spaces), times[i] ≤ 50, at most 5000 calls to input.`,
      example: `<p>History: i love you (5), island (3), ironman (2), i love leetcode (2). <code>input('i')</code> → ${H.c('g', '[i love you, island, i love leetcode]')}; <code>input(' ')</code> → [i love you, i love leetcode]; <code>input('a')</code> → ${H.c('r', '[]')}; <code>input('#')</code> → [] and "i a" is saved with count 1.</p>`,
      brute: {
        why: `<p>On every keystroke, scan <b>all</b> stored sentences, keep those starting with the prefix, sort them, take 3. Each call costs O(N · L + M log M). It repeats the same prefix filtering from scratch for every character, even though the new prefix only extends the old one by one letter.</p>`,
        code: `
      class AutocompleteBrute {
          private final Map<String, Integer> cnt = new HashMap<>();
          private final StringBuilder typed = new StringBuilder();
          AutocompleteBrute(String[] s, int[] t) { for (int i = 0; i < s.length; i++) cnt.merge(s[i], t[i], Integer::sum); }
          List<String> input(char c) {
              if (c == '#') { cnt.merge(typed.toString(), 1, Integer::sum); typed.setLength(0); return new ArrayList<>(); }
              typed.append(c);
              String p = typed.toString();
              List<String> m = new ArrayList<>();
              for (String s : cnt.keySet()) if (s.startsWith(p)) m.add(s);          // O(N * L) every keystroke
              m.sort((a, b) -> cnt.get(a).equals(cnt.get(b)) ? a.compareTo(b) : cnt.get(b) - cnt.get(a));
              return new ArrayList<>(m.subList(0, Math.min(3, m.size())));
          }
      }`
      },
      mcq: { q: 'Two sentences both have count 7: "apple pie" and "apple". Which ranks first?', options: ['"apple pie" — it is longer', '"apple" — a proper prefix is smaller in ASCII/lexicographic order', 'Either; ties are random', 'Neither; ties are excluded'], answer: 1, explain: 'Lexicographic comparison: "apple" runs out of characters first, and a proper prefix compares as smaller. So "apple" comes first.' },
      hints: [
        `<p>Hint 1: Each keystroke only extends the prefix by one character. Keep a pointer to the trie node for the current prefix and move one edge down per call.</p>`,
        `<p>Hint 2: Store at every trie node the best 3 sentences of its subtree. Then a keystroke answer is just "copy the node's list". Keep a global <code>Map&lt;String, Integer&gt;</code> of counts for the comparator.</p>`,
        `<p>Hint 3: Recording a sentence: count += 1, then walk its path; at each node add it if missing, sort by (−count, string), trim to 3. On '#': record, reset prefix + pointer. If a step has no child, set the pointer to null and return [] for the rest of this sentence.</p>`
      ],
      solution: {
        approach: `<p>Trie where each node caches its top-3 sentences. Inserts/updates refresh the caches along one path (counts only grow, so this stays correct). Queries step one node per character and return the cached list — O(k) per keystroke regardless of how many sentences exist.</p>`,
        code: `
      class AutocompleteSystem {
          private static class Node {
              Map<Character, Node> kids = new HashMap<>();
              List<String> top = new ArrayList<>();
          }
          private final Node root = new Node();
          private final Map<String, Integer> cnt = new HashMap<>();
          private final StringBuilder typed = new StringBuilder();
          private Node cur = root;

          public AutocompleteSystem(String[] sentences, int[] times) {
              for (int i = 0; i < sentences.length; i++) record(sentences[i], times[i]);
          }

          private void record(String s, int add) {
              cnt.merge(s, add, Integer::sum);
              Node n = root;
              for (char ch : s.toCharArray()) {
                  n = n.kids.computeIfAbsent(ch, k -> new Node());
                  if (!n.top.contains(s)) n.top.add(s);
                  n.top.sort((a, b) -> {
                      int ca = cnt.get(a), cb = cnt.get(b);
                      return ca != cb ? cb - ca : a.compareTo(b);
                  });
                  if (n.top.size() > 3) n.top.remove(3);
              }
          }

          public List<String> input(char c) {
              if (c == '#') {
                  record(typed.toString(), 1);
                  typed.setLength(0);
                  cur = root;
                  return new ArrayList<>();
              }
              typed.append(c);
              if (cur != null) cur = cur.kids.get(c);       // null = fell off the trie
              return cur == null ? new ArrayList<>() : new ArrayList<>(cur.top);
          }
      }`,
        alt: [{ lang: 'python', code: `
from typing import List

class Node:
    __slots__ = ("kids", "top")
    def __init__(self):
        self.kids, self.top = {}, []

class AutocompleteSystem:
    def __init__(self, sentences: List[str], times: List[int]):
        self.root, self.cnt = Node(), {}
        self.typed, self.cur = [], self.root
        for s, t in zip(sentences, times):
            self._record(s, t)

    def _record(self, s, add):
        self.cnt[s] = self.cnt.get(s, 0) + add
        n = self.root
        for ch in s:
            n = n.kids.setdefault(ch, Node())
            if s not in n.top:
                n.top.append(s)
            n.top.sort(key=lambda x: (-self.cnt[x], x))
            del n.top[3:]

    def input(self, c: str) -> List[str]:
        if c == "#":
            self._record("".join(self.typed), 1)
            self.typed, self.cur = [], self.root
            return []
        self.typed.append(c)
        if self.cur is not None:
            self.cur = self.cur.kids.get(c)
        return list(self.cur.top) if self.cur else []
` }],
        dry: {
          head: ['input', 'typed', 'node', 'returned'],
          rows: [
            ["'i'", 'i', 'root→i', '[i love you, island, i love leetcode]'],
            ["' '", 'i␣', 'i→␣', '[i love you, i love leetcode]'],
            ["'a'", 'i␣a', 'null (no child a)', '<span class="c-r">[]</span>'],
            ["'#'", '(reset)', 'root', '[] — "i a" saved with count 1'],
            ["'i'", 'i', 'root→i', '[i love you, island, i love leetcode] (i a has count 1)'],
            ["' '", 'i␣', 'i→␣', '[i love you, i love leetcode, i a]']
          ]
        },
        complexity: `<p><b>input(c):</b> O(k) = O(1) for k = 3. <b>Recording a sentence:</b> O(L · k log k). <b>Constructor:</b> O(Σ L). <b>Space:</b> O(total characters × k) for nodes and cached lists.</p>`,
        followUps: ['Support deleting a sentence (counts can decrease).', 'Rank with recency decay instead of raw counts.', 'Scale to 10 billion queries/day: what runs offline vs online?']
      }
    }]
  });

  // =====================================================================
  // TOPIC 10 — Trade-offs, complexity and the design-interview script
  // =====================================================================
  topics.push({
    title: 'Choosing the Design: Trade-offs, Complexity Cheat Sheet and Eviction Showdown',
    analogy: `<p>A carpenter's toolbox has a hammer, a screwdriver, a saw and a drill. None is "the best tool" — each is best for one job, and a good carpenter picks by looking at the <b>job</b> first: "Is it a nail or a screw? Wood or metal? One hole or a hundred?"</p>
      <p>Data-structure design interviews are the same. LRU, LFU, skip lists, Bloom filters, rings, version lists, iterators, bucket counters and tries are your tools. The score comes from asking the right questions about the job (operations, sizes, read/write mix, exact vs approximate, threads) and then explaining <b>why</b> you picked this tool and what it costs.</p>`,
    explain: `<p><b>The 6-step script</b> for any "design a data structure" question:</p>
      <ol>
        <li><b>Pin down the API and semantics.</b> Exact method signatures; what counts as a "use"; what to return when missing; tie-break rules; are timestamps increasing?</li>
        <li><b>Ask the numbers.</b> How many items, operations per second, read/write ratio, memory budget, key/value sizes.</li>
        <li><b>List each operation with its target cost</b> (e.g. get O(1), evict O(1), rank O(log N)).</li>
        <li><b>Pick one structure per need and glue them</b> (hash map for lookup + list for order; trie for prefixes + cached top-k; map + sorted versions…).</li>
        <li><b>Prove the costs and walk a small example</b> out loud — the dry run catches half the bugs.</li>
        <li><b>Discuss production trade-offs:</b> concurrency, memory overhead, approximate alternatives, failure modes, and how you would test it.</li>
      </ol>
      <p><b>Complexity cheat sheet for this module</b> (N = items):</p>
      ${H.table(['structure', 'main operations', 'cost', 'memory', 'exact?'], [
        ['LRU (map + DLL)', 'get / put / evict', 'O(1)', 'O(N), ~2 objects per entry', 'yes'],
        ['LFU (map + freq buckets)', 'get / put / evict', 'O(1)', 'O(N)', 'yes'],
        ['Skip list', 'search / insert / delete / range', 'O(log N) expected', '~2N pointers (p = ½)', 'yes'],
        ['Bloom filter', 'add / mightContain', 'O(k)', '~1.44 · log₂(1/p) bits per item', H.c('y', 'false positives')],
        ['Hash ring', 'lookup / add server', 'O(log V) / O(v log V)', 'O(V) vnodes', 'yes'],
        ['Time-based KV', 'set / get as-of', 'O(1) / O(log versions)', 'O(all versions)', 'yes'],
        ['Iterators', 'next / hasNext', 'O(1) amortised', 'O(depth) or O(k)', 'yes'],
        ['Hit counter (buckets)', 'hit / count', 'O(1) / O(W)', 'O(W) buckets', 'yes at bucket granularity'],
        ['Autocomplete trie + top-k', 'keystroke / record', 'O(k) / O(L · k log k)', 'O(chars · k)', 'yes']
      ])}
      <p><b>The big trade-off axes</b> you should be able to name in any answer:</p>
      ${H.table(['axis', 'one side', 'other side'], [
        ['time vs memory', 'cache top-k at every trie node', 'compute on demand with DFS'],
        ['exact vs approximate', 'HashSet, exact counts', 'Bloom filter, Count-Min Sketch, HyperLogLog'],
        ['worst-case vs expected / amortised', 'balanced tree, O(log N) always', 'skip list (expected), dynamic array (amortised)'],
        ['read-optimised vs write-optimised', 'precompute (autocomplete notes)', 'append-only logs (versions, LSM)'],
        ['simplicity vs hit rate', 'LRU / FIFO', 'W-TinyLFU / ARC'],
        ['single-thread vs concurrent', 'plain HashMap + list', 'striped locks, CAS, lock-free skip list']
      ])}`,
    clues: [
      '"<b>Design</b> a data structure that supports …" with several operations → list each operation with its target complexity, then glue one structure per need.',
      '"<b>What are the trade-offs?</b>" / "How would this behave in production?" → memory overhead, concurrency, exact vs approximate, worst-case vs expected.',
      '"Which <b>eviction policy</b> would you choose for this workload?" → recency (LRU) for temporal locality, frequency (LFU/TinyLFU) for stable popularity, FIFO/CLOCK for cheapness; Belady\'s OPT as the unreachable upper bound.',
      '"Memory is limited, approximate answers are fine" → probabilistic structures (Bloom, Count-Min, HyperLogLog).',
      '"Many threads" / "thousands of requests per second" → mention lock granularity, read/write locks, CAS, or concurrent library structures.',
      '"Can you do better than O(log N)?" → look for a monotonic property (counts change by 1, timestamps increase) that lets you <b>track</b> instead of <b>search</b>.'
    ],
    code: [`
      // Strategy pattern: one cache, pluggable eviction policies. Great for "compare LRU vs FIFO" follow-ups.
      interface EvictionPolicy<K> {
          void onInsert(K key);
          void onAccess(K key);
          K victim();                 // choose and forget the key to evict
          void onRemove(K key);
      }

      class LruPolicy<K> implements EvictionPolicy<K> {
          private final LinkedHashSet<K> order = new LinkedHashSet<>();    // first = least recent
          public void onInsert(K k) { order.add(k); }
          public void onAccess(K k) { order.remove(k); order.add(k); }      // move to the end = most recent
          public K victim() { K k = order.iterator().next(); order.remove(k); return k; }
          public void onRemove(K k) { order.remove(k); }
      }

      class FifoPolicy<K> implements EvictionPolicy<K> {
          private final LinkedHashSet<K> order = new LinkedHashSet<>();    // first = oldest insert
          public void onInsert(K k) { order.add(k); }
          public void onAccess(K k) { }                                     // FIFO ignores reads
          public K victim() { K k = order.iterator().next(); order.remove(k); return k; }
          public void onRemove(K k) { order.remove(k); }
      }

      class PolicyCache<K, V> {
          private final int capacity;
          private final Map<K, V> data = new HashMap<>();
          private final EvictionPolicy<K> policy;
          private int hits, misses;

          PolicyCache(int capacity, EvictionPolicy<K> policy) { this.capacity = capacity; this.policy = policy; }

          V get(K key) {
              V v = data.get(key);
              if (v == null) { misses++; return null; }
              hits++;
              policy.onAccess(key);
              return v;
          }

          void put(K key, V value) {
              if (data.containsKey(key)) { data.put(key, value); policy.onAccess(key); return; }
              if (data.size() == capacity) data.remove(policy.victim());
              data.put(key, value);
              policy.onInsert(key);
          }

          String stats() { return "hits=" + hits + " misses=" + misses; }

          public static void main(String[] args) {
              int[] trace = {1, 2, 3, 1, 4, 1, 2, 5, 1, 2, 3, 4, 5};
              for (String name : List.of("LRU", "FIFO")) {
                  PolicyCache<Integer, Integer> c = new PolicyCache<>(3, name.equals("LRU") ? new LruPolicy<>() : new FifoPolicy<>());
                  for (int k : trace) if (c.get(k) == null) c.put(k, k * 10);   // read-through on miss
                  System.out.println(name + ": " + c.stats());
              }
          }
      }`, { lang: 'python', run: true, title: 'Hit-rate showdown on a skewed (Zipf-like) workload (runnable Python)', code: `
import random
from collections import OrderedDict, defaultdict

random.seed(7)
# Zipf-like popularity: key i is requested with weight 1 / i, plus a one-time scan in the middle.
keys = list(range(1, 201))
weights = [1.0 / i for i in keys]
trace = random.choices(keys, weights, k=3000)
trace = trace[:1500] + list(range(1000, 1300)) + trace[1500:]

def run(policy, cap):
    cache, freq, hits, t = OrderedDict(), defaultdict(int), 0, 0
    nxt = {}
    if policy == "OPT":                     # precompute next use for Belady's optimal policy
        pos = {}
        nxt_list = [0] * len(trace)
        for i in range(len(trace) - 1, -1, -1):
            nxt_list[i] = pos.get(trace[i], float("inf"))
            pos[trace[i]] = i
    for i, k in enumerate(trace):
        freq[k] += 1
        if k in cache:
            hits += 1
            if policy == "LRU":
                cache.move_to_end(k)
            if policy == "OPT":
                cache[k] = nxt_list[i]
            continue
        if len(cache) == cap:
            if policy in ("LRU", "FIFO"):
                cache.popitem(last=False)
            elif policy == "LFU":
                victim = min(cache, key=lambda x: freq[x])
                del cache[victim]
            else:
                victim = max(cache, key=lambda x: cache[x])
                del cache[victim]
        cache[k] = nxt_list[i] if policy == "OPT" else True
    return hits / len(trace)

for p in ("FIFO", "LRU", "LFU", "OPT"):
    print(p.ljust(5), "hit rate with 20 slots:", round(run(p, 20) * 100, 1), "%")
` }],
    codeTitle: ['Pluggable eviction policies (Java, strategy pattern)', 'Policy showdown with Belady\'s OPT as the ceiling (runnable Python)'],
    viz: {
      title: 'Eviction showdown: FIFO vs LRU vs LFU vs Belady\'s optimal on the same trace',
      input: '3 | 1 2 3 1 4 1 2 5 1 2 3 4 5 1',
      inputLabel: 'capacity | access trace (keys 0-99)',
      gen: function (input) {
        var parts = splitBar(input, 2, '3 | 1 2 3 1 4');
        var cap = toInt(parts[0], 'Capacity', 1, 5);
        var tr = parts[1].split(/[\s,]+/).filter(Boolean).map(function (x) { return toInt(x, 'Key', 0, 99); });
        if (tr.length < 3 || tr.length > 18) throw new Error('Use 3 to 18 accesses');
        var names = ['FIFO', 'LRU', 'LFU', 'OPT'];
        var st = {}, frames = [];
        names.forEach(function (n) { st[n] = { items: [], hits: 0, freq: {}, last: {} }; });
        function nextUse(k, i) { for (var j = i + 1; j < tr.length; j++) if (tr[j] === k) return j; return Infinity; }
        frames.push({ narr: 'Four caches of capacity <b>' + cap + '</b> see the same accesses. FIFO evicts the oldest insert, LRU the least recently used, LFU the least frequently used (ties → least recent), and <b>OPT</b> (Belady) cheats by looking into the future: it evicts the key used farthest ahead. OPT is the best possible — a yardstick, not a real policy.', parts: [
          { type: 'array', label: 'access trace', values: tr.slice() },
          { type: 'bars', label: 'hits so far', values: [0, 0, 0, 0], idxLabels: names }
        ] });
        tr.forEach(function (k, i) {
          var notes = [];
          names.forEach(function (n) {
            var s = st[n], at = s.items.indexOf(k);
            s.freq[k] = (s.freq[k] || 0) + 1;
            if (at >= 0) {
              s.hits++; notes.push(n + ' hit');
              if (n === 'LRU') { s.items.splice(at, 1); s.items.push(k); }
              s.last[k] = i; s.res = 'hit';
              return;
            }
            var ev = null;
            if (s.items.length === cap) {
              var vi = 0;
              if (n === 'LFU') {
                s.items.forEach(function (x, j) { var a = s.freq[x], b = s.freq[s.items[vi]]; if (a < b || (a === b && s.last[x] < s.last[s.items[vi]])) vi = j; });
              } else if (n === 'OPT') {
                s.items.forEach(function (x, j) { if (nextUse(x, i) > nextUse(s.items[vi], i)) vi = j; });
              }
              ev = s.items.splice(vi, 1)[0];
            }
            s.items.push(k); s.last[k] = i; s.res = ev === null ? 'miss' : 'miss, evict ' + ev;
          });
          var ps = [{ type: 'array', label: 'access trace', values: tr.slice(), hl: one(i, 'cur'), ptr: one(i, 'now') }];
          names.forEach(function (n) {
            var s = st[n], hl = {};
            s.items.forEach(function (x) { if (x === k) hl[String(x)] = s.res === 'hit' ? 'ok' : 'cur'; });
            ps.push({ type: 'set', label: n + ' — ' + s.res + ' (hits ' + s.hits + ')', items: s.items.map(String), hl: hl });
          });
          var allHit = names.every(function (n) { return st[n].res === 'hit'; });
          var who = names.filter(function (n) { return st[n].res === 'hit'; });
          frames.push({ narr: 'Access <b>' + k + '</b> (step ' + (i + 1) + '): ' + (allHit ? 'everyone hits.' : who.length ? '<span class="c-g">hit</span> for ' + who.join(', ') + '; the others miss.' : 'everyone misses.') + (names.some(function (n) { return st[n].res.indexOf('evict') >= 0; }) ? ' Victims: ' + names.filter(function (n) { return st[n].res.indexOf('evict') >= 0; }).map(function (n) { return n + ' → ' + st[n].res.split('evict ')[1]; }).join(', ') + '.' : ''), parts: ps });
        });
        var hv = names.map(function (n) { return st[n].hits; });
        frames.push({ narr: 'Final hit counts. OPT sets the ceiling; the gap between OPT and your policy is what smarter policies (W-TinyLFU, ARC) try to close. On another trace the ranking of FIFO/LRU/LFU can flip — <b>measure on your real workload</b>.', parts: [
          { type: 'bars', label: 'hits out of ' + tr.length, values: hv, idxLabels: names, texts: hv.map(function (h) { return Math.round(h / tr.length * 100) + '%'; }) },
          { type: 'table', label: 'summary', columns: ['policy', 'hits', 'hit rate'], rows: names.map(function (n, j) { return [n, hv[j], Math.round(hv[j] / tr.length * 100) + '%']; }) }
        ] });
        return frames;
      }
    },
    examples: [
      {
        title: 'Requirement → structure, at a glance',
        html: `${H.table(['the interviewer says…', 'reach for'], [
            ['"evict what was used longest ago", O(1)', 'HashMap + doubly linked list (LRU)'],
            ['"evict the least used, ties by recency", O(1)', 'freq → LRU buckets + minFreq (LFU)'],
            ['"sorted, concurrent, with ranges / ranks"', 'skip list (or TreeMap if single-threaded)'],
            ['"have we seen it? little memory, false positives OK"', 'Bloom filter (cuckoo filter if deletes)'],
            ['"spread keys over servers that come and go"', 'consistent-hash ring with vnodes'],
            ['"value as of time t"', 'per-key sorted versions + floor binary search'],
            ['"next/hasNext over a nested / multiple source"', 'stack / queue / heap of iterators'],
            ['"count events in the last N seconds"', 'queue or circular buckets'],
            ['"top suggestions per prefix"', 'trie with cached top-k']
          ])}`
      },
      {
        title: 'Belady\'s OPT beats LRU — by hand',
        html: `<p>Capacity 2, trace <code>1 2 3 1 2</code>. LRU: 1 m, 2 m, 3 m (evict 1), 1 m (evict 2), 2 m (evict 3) → <b>0 hits</b>. OPT at access 3: next uses are 1 → step 4, 2 → step 5; evict the farther one (2). Then 1 hits. At access 2 it misses. → <b>1 hit</b>.</p>
          ${H.table(['access', 'LRU cache', 'OPT cache'], [['1', '[1]', '[1]'], ['2', '[1,2]', '[1,2]'], ['3', H.c('r', '[2,3]'), '[1,3] (evict 2: used later)'], ['1', H.c('r', '[3,1]'), H.c('g', 'hit [1,3]')], ['2', H.c('r', '[1,2]'), '[1,2]']])}
          <p>Cyclic patterns larger than the cache are LRU's worst case (0% hits); this is why databases use scan-resistant variants.</p>`
      },
      {
        title: 'Exact vs approximate: memory for 1 billion items',
        html: `${H.table(['question', 'exact', 'approximate', 'approx. memory'], [
            ['seen before?', 'HashSet ≈ 50+ GB', 'Bloom filter, 1% FP', '≈ 1.2 GB'],
            ['how many distinct?', 'HashSet ≈ 50+ GB', 'HyperLogLog, ~0.8% error', '≈ 12 KB'],
            ['how often is x seen?', 'HashMap ≈ 60+ GB', 'Count-Min Sketch, ε = 0.1%, δ = 1%', '≈ 2,700 × 5 four-byte counters ≈ 55 KB'],
            ['median latency?', 'store all values', 't-digest / KLL sketch', 'a few KB']
          ])}
          <p>Say this in interviews: "If the business can tolerate a small, bounded error, I can cut memory by orders of magnitude."</p>`
      },
      {
        title: 'Concurrency options, cheapest to most scalable',
        html: `${H.table(['option', 'how', 'when'], [
            ['one big lock', '<code>synchronized</code> on every method', 'low traffic; simplest correct answer'],
            ['read-write lock', 'many readers or one writer', 'only if reads truly do not mutate (LRU get mutates!)'],
            ['lock striping', 'N independent shards, each with its own lock', 'caches, counters — near-linear scaling'],
            ['CAS / atomics', '<code>AtomicLong</code>, <code>LongAdder</code>', 'counters, hit buckets'],
            ['lock-free structures', '<code>ConcurrentSkipListMap</code>, <code>ConcurrentHashMap</code>', 'sorted or hashed shared maps'],
            ['buffer + batch', 'record events in a ring buffer, apply under a lock in batches', 'Caffeine-style caches']
          ])}`
      }
    ],
    deepDive: `<p><b>Three kinds of "fast" — never mix them up.</b> <i>Worst-case</i> O(f) holds for every single operation (balanced BST). <i>Amortised</i> O(f) holds for the <b>average over any sequence</b> — individual operations can be slow (dynamic array resize, nested-iterator digging, hash map rehash) but the total is bounded. <i>Expected</i> O(f) averages over the algorithm's <b>random choices</b> (skip list heights, hashing with random seeds) — any input is fine, only bad luck hurts. Latency-sensitive systems care about the <b>tail</b> (p99): an amortised O(1) hash map that occasionally rehashes 10 million entries causes a latency spike, which is why some systems use incremental rehashing (Redis rehashes its dict step by step).</p>
      <p><b>Big-O hides constants that dominate real performance.</b> Pointer-heavy structures (linked lists, tries, skip lists, trees) cause cache misses (~100 ns each) while arrays stream from cache. Java adds object headers (12–16 bytes) and boxing. A "worse" O(log N) sorted array can beat an O(1) hash map for small N. Measure with a real benchmark harness (JMH in Java) on realistic data.</p>
      <p><b>Belady's OPT (1966)</b> — evict the item whose next use is farthest in the future — is provably optimal for a fixed cache size but needs the future, so it is used offline to judge real policies. Theory note: LRU is <i>k-competitive</i> (Sleator–Tarjan): at most k times worse than OPT with the same cache size k, and no deterministic online policy can do better in the worst case.</p>
      <p><b>Testing designs like these:</b> (1) a brute-force <b>reference model</b> (scan everything) and random operation sequences compared step by step (property-based testing); (2) edge cases: capacity 0/1, duplicates, empty inputs, boundaries of windows; (3) concurrency stress tests; (4) metrics in production: hit rate, eviction count, memory, p99 latency.</p>
      <p><b>Failure modes to volunteer:</b> cache stampede (many misses for the same hot key at once → request coalescing / "single flight"), thundering herd after a restart (warm-up), hot keys on one shard, unbounded growth (missing eviction), and stale data (TTL vs explicit invalidation — "there are only two hard things in computer science: cache invalidation and naming things").</p>`,
    aiEra: `<p><b>What AI changes:</b> implementation speed is no longer the bottleneck; judgement is. AI will happily produce an LRU, a Bloom filter or a trie — but it will not ask whether your workload is scan-heavy, whether 1% false positives are acceptable, or whether a single global lock will melt at 50k QPS. Interviews for senior roles increasingly look like: "here is an AI-generated design, critique it". The script above is your critique checklist.</p>
      <p><b>The same trade-offs appear in AI infrastructure:</b> KV-cache eviction in LLM serving (LRU of prefix blocks, with recomputation vs memory trade-offs), semantic caches (approximate match by embedding similarity — a tunable false-positive rate, like a Bloom filter), rate limits by tokens, consistent hashing for session affinity, vector indexes (HNSW is a skip-list-like graph; product quantisation trades accuracy for memory exactly like sketches do).</p>
      <p><b>Use AI as a partner:</b> ask it to <code>generate an adversarial access trace that makes LRU perform worse than FIFO</code>, or to <code>estimate memory per entry for this Java class on a 64-bit JVM with compressed oops</code> — then verify with a tool (JOL) yourself. <b>What you must still own:</b> asking the clarifying questions, naming the trade-off axes, and choosing.</p>`
  });

  // =====================================================================
  // PRACTICE — Easy
  // =====================================================================
  practice.push({
    title: 'Design HashMap', level: 'Easy', tags: ['design', 'hashing', 'chaining'], companies: ['Amazon', 'Microsoft', 'Apple'],
    statement: `<p>Design a hash map without built-in hash tables: <code>put(key, value)</code> inserts or updates, <code>get(key)</code> returns the value or -1, <code>remove(key)</code> deletes the mapping if present.</p>`,
    constraints: `0 ≤ key, value ≤ 10<sup>6</sup>; at most 10<sup>4</sup> calls.`,
    example: `<p><code>put(1,1) put(2,2) get(1)→${H.c('g', '1')} get(3)→${H.c('r', '-1')} put(2,1) get(2)→${H.c('g', '1')} remove(2) get(2)→${H.c('r', '-1')}</code>. Updating key 2 replaces its value rather than adding a second entry.</p>`,
    brute: {
      why: `<p>Keep one list of (key, value) pairs and scan it for every operation: O(N) per call — 10<sup>4</sup> × 10<sup>4</sup> = 10<sup>8</sup> in the worst case. Alternatively a direct array of size 10<sup>6</sup>+1 is O(1) but wastes ~4 MB for at most 10<sup>4</sup> keys and breaks if keys grow.</p>`,
      code: `
      class MyHashMapBrute {
          private final List<int[]> pairs = new ArrayList<>();
          void put(int k, int v) {
              for (int[] p : pairs) if (p[0] == k) { p[1] = v; return; }   // O(N) scan
              pairs.add(new int[]{k, v});
          }
          int get(int k) { for (int[] p : pairs) if (p[0] == k) return p[1]; return -1; }
          void remove(int k) { pairs.removeIf(p -> p[0] == k); }
      }`
    },
    mcq: { q: 'Two different keys land in the same bucket. With separate chaining, what happens?', options: ['The second key overwrites the first', 'Both live in that bucket\'s list; lookups compare keys', 'The map must resize immediately', 'The second key is rejected'], answer: 1, explain: 'Chaining stores colliding entries together in a small list; get walks the list comparing keys. Resizing keeps those lists short on average.' },
    hints: [
      `<p>Hint 1: An array of buckets where bucket = key % B. Each bucket holds the few entries that map there.</p>`,
      `<p>Hint 2: Use a prime-ish bucket count (e.g. 1009 or 2069) so patterned keys spread out; each bucket is a small linked list of nodes (key, value, next).</p>`,
      `<p>Hint 3: put: walk the bucket; update if key found, else prepend a node. get: walk and return or -1. remove: walk with a dummy/previous pointer and unlink. Optionally resize when size / B exceeds 0.75.</p>`
    ],
    solution: {
      approach: `<p>Separate chaining: fixed array of bucket heads; each bucket a singly linked list. With N ≤ 10<sup>4</sup> keys and ~2000 buckets, chains average ≈ 5 nodes, so every operation is effectively O(1).</p>`,
      code: `
      class MyHashMap {
          private static class Node {
              int key, val; Node next;
              Node(int k, int v, Node n) { key = k; val = v; next = n; }
          }
          private static final int B = 2069;                // prime bucket count
          private final Node[] buckets = new Node[B];

          private int idx(int key) { return key % B; }

          public void put(int key, int value) {
              int i = idx(key);
              for (Node n = buckets[i]; n != null; n = n.next)
                  if (n.key == key) { n.val = value; return; }  // update in place
              buckets[i] = new Node(key, value, buckets[i]);  // prepend new entry
          }

          public int get(int key) {
              for (Node n = buckets[idx(key)]; n != null; n = n.next)
                  if (n.key == key) return n.val;
              return -1;
          }

          public void remove(int key) {
              int i = idx(key);
              Node dummy = new Node(-1, -1, buckets[i]), prev = dummy;
              while (prev.next != null) {
                  if (prev.next.key == key) { prev.next = prev.next.next; break; }
                  prev = prev.next;
              }
              buckets[i] = dummy.next;
          }
      }`,
      complexity: `<p>Average O(1 + N/B) per operation; O(N) worst case if all keys collide. Space O(B + N).</p>`,
      followUps: ['Add resizing with a load factor.', 'Use open addressing (linear probing) — how does delete work (tombstones)?', 'How does Java 8 HashMap protect against long chains?']
    }
  });

  practice.push({
    title: 'Logger Rate Limiter', level: 'Easy', tags: ['design', 'hashmap', 'rate limiting'], companies: ['Google', 'Microsoft', 'Bloomberg'],
    statement: `<p>Design a logger that receives messages with timestamps (seconds, non-decreasing). Each <b>unique</b> message may be printed at most once every 10 seconds: if a message is printed at time t, the same message is suppressed until t + 10. Implement <code>boolean shouldPrintMessage(int timestamp, String message)</code>.</p>`,
    constraints: `0 ≤ timestamp ≤ 10<sup>9</sup>, message length ≤ 30, at most 10<sup>4</sup> calls.`,
    example: `<p><code>(1,"foo")→${H.c('g', 'true')} (2,"bar")→true (3,"foo")→${H.c('r', 'false')} (8,"bar")→false (10,"foo")→false (11,"foo")→${H.c('g', 'true')}</code> — foo printed at 1 is muted until 11.</p>`,
    brute: {
      why: `<p>Keep a list of every (time, message) ever printed and scan it backwards for the same message within 10 seconds. Each call is O(total printed) and the list never shrinks — wasteful, since only the <b>last</b> print time of each message matters.</p>`,
      code: `
      class LoggerBrute {
          private final List<Object[]> printed = new ArrayList<>();
          boolean shouldPrintMessage(int t, String m) {
              for (int i = printed.size() - 1; i >= 0; i--) {            // O(N) scan
                  Object[] p = printed.get(i);
                  if (p[1].equals(m) && t - (int) p[0] < 10) return false;
              }
              printed.add(new Object[]{t, m});
              return true;
          }
      }`
    },
    mcq: { q: 'What is the minimum state per message needed?', options: ['All timestamps it appeared at', 'The next time it is allowed to print', 'A count of prints', 'Nothing; use a global timer'], answer: 1, explain: 'One number per message — nextAllowed = lastPrinted + 10 — decides every future call.' },
    hints: [
      `<p>Hint 1: Only the most recent <i>printed</i> time of each message matters (suppressed attempts do not reset the timer).</p>`,
      `<p>Hint 2: <code>Map&lt;String, Integer&gt; nextAllowed</code>. Compare the timestamp with the stored value.</p>`,
      `<p>Hint 3: if t &lt; nextAllowed.getOrDefault(m, 0) → false; else store t + 10 and return true. Memory follow-up: periodically drop entries whose nextAllowed ≤ now, or keep a queue of the last 10 seconds.</p>`
    ],
    solution: {
      approach: `<p>Hash map from message to the earliest timestamp it may print again. One lookup and maybe one write per call.</p>`,
      code: `
      class Logger {
          private final Map<String, Integer> nextAllowed = new HashMap<>();

          public boolean shouldPrintMessage(int timestamp, String message) {
              Integer allowedAt = nextAllowed.get(message);
              if (allowedAt != null && timestamp < allowedAt) return false;   // still muted
              nextAllowed.put(message, timestamp + 10);
              return true;
          }
      }`,
      alt: [{ lang: 'python', code: `
class Logger:
    def __init__(self):
        self.next_allowed = {}

    def shouldPrintMessage(self, timestamp: int, message: str) -> bool:
        if timestamp < self.next_allowed.get(message, 0):
            return False
        self.next_allowed[message] = timestamp + 10
        return True
` }],
      complexity: `<p>O(|message|) per call for hashing; O(distinct messages) memory (bounded to the last 10 seconds' messages with cleanup).</p>`,
      followUps: ['Bound the memory to messages seen in the last 10 seconds.', 'Make it thread-safe for many producers.', 'Limit each message to at most 3 prints per minute.']
    }
  });

  practice.push({
    title: 'Number of Recent Calls', level: 'Easy', tags: ['design', 'queue', 'sliding window'], companies: ['Amazon', 'Yandex', 'Google'],
    statement: `<p>Implement <code>RecentCounter</code> with <code>int ping(int t)</code>: record a request at time t (milliseconds, strictly increasing) and return how many requests happened in the inclusive window <code>[t − 3000, t]</code>.</p>`,
    constraints: `1 ≤ t ≤ 10<sup>9</sup>, strictly increasing, at most 10<sup>4</sup> calls.`,
    example: `<p><code>ping(1)→1, ping(100)→2, ping(3001)→3, ping(3002)→${H.c('y', '3')}</code>. At 3002 the window is [2, 3002], so the ping at 1 has dropped out.</p>`,
    brute: {
      why: `<p>Store all pings and, on each call, count those with time ≥ t − 3000 by scanning the whole list. O(N) per call and memory that never shrinks, although expired pings can never count again.</p>`,
      code: `
      class RecentCounterBrute {
          private final List<Integer> all = new ArrayList<>();
          int ping(int t) {
              all.add(t);
              int c = 0;
              for (int x : all) if (x >= t - 3000) c++;   // rescans expired pings forever
              return c;
          }
      }`
    },
    mcq: { q: 'Times are strictly increasing. Which end of the queue do expired pings leave from?', options: ['The back', 'The front', 'Either', 'They never leave'], answer: 1, explain: 'The oldest pings are at the front, and they expire first. Pop from the front while front &lt; t − 3000.' },
    hints: [
      `<p>Hint 1: Because time only increases, once a ping is older than t − 3000 it is out of every future window too.</p>`,
      `<p>Hint 2: A FIFO queue: push t at the back, pop from the front while the front is too old.</p>`,
      `<p>Hint 3: Note the inclusive boundary: keep pings with time ≥ t − 3000, so pop while front &lt; t − 3000. Return the queue size.</p>`
    ],
    solution: {
      approach: `<p>Queue of timestamps in the window. Each ping is added once and removed once → amortised O(1).</p>`,
      code: `
      class RecentCounter {
          private final ArrayDeque<Integer> q = new ArrayDeque<>();

          public int ping(int t) {
              q.offerLast(t);
              while (q.peekFirst() < t - 3000) q.pollFirst();   // drop pings outside [t-3000, t]
              return q.size();
          }
      }`,
      complexity: `<p>Amortised O(1) per ping; memory O(pings within 3000 ms) — at most 3001 since times are strictly increasing integers.</p>`,
      followUps: ['Times can repeat (non-decreasing). Does anything change?', 'Use a fixed-size circular array instead of a deque.']
    }
  });

  practice.push({
    title: 'Moving Average from Data Stream', level: 'Easy', tags: ['design', 'queue', 'circular buffer'], companies: ['Google', 'Meta', 'Spotify'],
    statement: `<p>Given a stream of integers and a window size, implement <code>MovingAverage(int size)</code> and <code>double next(int val)</code>, which returns the average of the last <code>size</code> values (or of all values if fewer have arrived).</p>`,
    constraints: `1 ≤ size ≤ 1000, −10<sup>5</sup> ≤ val ≤ 10<sup>5</sup>, at most 10<sup>4</sup> calls.`,
    example: `<p>size = 3: <code>next(1)→1.0, next(10)→5.5, next(3)→4.667, next(5)→${H.c('g', '6.0')}</code> = (10 + 3 + 5) / 3 — the 1 has left the window.</p>`,
    brute: {
      why: `<p>Keep all values and re-sum the last <code>size</code> on every call: O(size) per call. The wasted work is re-adding numbers that did not change — only one value enters and one leaves per step.</p>`,
      code: `
      class MovingAverageBrute {
          private final int size;
          private final List<Integer> all = new ArrayList<>();
          MovingAverageBrute(int size) { this.size = size; }
          double next(int val) {
              all.add(val);
              int from = Math.max(0, all.size() - size);
              long s = 0;
              for (int i = from; i < all.size(); i++) s += all.get(i);   // O(size) re-sum
              return (double) s / (all.size() - from);
          }
      }`
    },
    mcq: { q: 'The window is full and a new value arrives. How do you update the running sum in O(1)?', options: ['Recompute it from scratch', 'sum += new − oldest', 'sum = new', 'sum *= size'], answer: 1, explain: 'Exactly one value enters and one leaves, so add the new one and subtract the evicted one.' },
    hints: [
      `<p>Hint 1: Maintain a running sum; each step changes it by (new value − evicted value).</p>`,
      `<p>Hint 2: A circular array of length size with a write index <code>i = count % size</code> remembers which value to evict.</p>`,
      `<p>Hint 3: Use a <code>long</code> sum to avoid overflow; divide by min(count, size) as a double.</p>`
    ],
    solution: {
      approach: `<p>Circular buffer + running sum: overwrite the oldest slot, adjust the sum, divide by the number of values in the window.</p>`,
      code: `
      class MovingAverage {
          private final int[] buf;
          private int count = 0;
          private long sum = 0;

          public MovingAverage(int size) { buf = new int[size]; }

          public double next(int val) {
              int i = count % buf.length;
              if (count >= buf.length) sum -= buf[i];   // evict the oldest value in this slot
              buf[i] = val;
              sum += val;
              count++;
              return (double) sum / Math.min(count, buf.length);
          }
      }`,
      complexity: `<p>O(1) per call, O(size) memory.</p>`,
      followUps: ['Exponential moving average needs no buffer — how?', 'Moving median of the window (two heaps with lazy deletion).']
    }
  });

  // =====================================================================
  // PRACTICE — Medium
  // =====================================================================
  practice.push({
    title: 'Peeking Iterator', level: 'Medium', tags: ['design', 'iterator'], companies: ['Google', 'Apple', 'Yahoo'],
    statement: `<p>Wrap an existing <code>Iterator&lt;Integer&gt;</code> in a <code>PeekingIterator</code> that supports <code>peek()</code> (return the next element without advancing) in addition to <code>next()</code> and <code>hasNext()</code>.</p>`,
    constraints: `1 ≤ elements ≤ 1000, values in [1, 1000]; all calls are valid; at most 1000 calls.`,
    example: `<p>Over [1, 2, 3]: <code>next()→1, peek()→${H.c('b', '2')}, next()→2, next()→3, hasNext()→${H.c('r', 'false')}</code>. peek did not consume the 2.</p>`,
    brute: {
      why: `<p>Copy every element into an <code>ArrayList</code> in the constructor and use an index. It works but reads the entire source up front (O(N) memory) — bad when the wrapped iterator streams from a file or network and you only need a few elements.</p>`,
      code: `
      class PeekingCopy {
          private final List<Integer> all = new ArrayList<>();
          private int i = 0;
          PeekingCopy(Iterator<Integer> it) { while (it.hasNext()) all.add(it.next()); }   // eager copy
          Integer peek() { return all.get(i); }
          Integer next() { return all.get(i++); }
          boolean hasNext() { return i < all.size(); }
      }`
    },
    mcq: { q: 'What is the smallest extra state that makes peek() possible?', options: ['A copy of all elements', 'One cached element plus a "has cached" flag', 'A stack', 'A counter of calls'], answer: 1, explain: 'Pre-fetch exactly one element ahead. peek returns it, next returns it and pre-fetches the following one.' },
    hints: [
      `<p>Hint 1: The underlying iterator cannot "un-read". So read one element early and keep it in a field.</p>`,
      `<p>Hint 2: Fields: <code>Integer cached</code> and <code>boolean has</code>. Fill them in the constructor and after each next().</p>`,
      `<p>Hint 3: peek → cached; next → save cached, refill from the wrapped iterator, return saved; hasNext → has. Use the flag instead of <code>cached != null</code> so generic versions can hold null elements.</p>`
    ],
    solution: {
      approach: `<p>One-element look-ahead buffer. All three methods are O(1) and the wrapped iterator is consumed lazily.</p>`,
      code: `
      class PeekingIterator implements Iterator<Integer> {
          private final Iterator<Integer> it;
          private Integer cached;
          private boolean has;

          public PeekingIterator(Iterator<Integer> iterator) {
              it = iterator;
              fill();
          }

          private void fill() {
              has = it.hasNext();
              cached = has ? it.next() : null;
          }

          public Integer peek() { return cached; }

          @Override public Integer next() {
              Integer ans = cached;
              fill();
              return ans;
          }

          @Override public boolean hasNext() { return has; }
      }`,
      complexity: `<p>O(1) per call, O(1) extra memory.</p>`,
      followUps: ['Make it generic over T.', 'Support peek(k) — look k elements ahead (a small queue buffer).', 'Why can this iterator not support remove() after peek()?']
    }
  });

  practice.push({
    title: 'Zigzag Iterator', level: 'Medium', tags: ['design', 'iterator', 'queue'], companies: ['Google', 'Meta'],
    statement: `<p>Given two lists, return their elements alternately: first of v1, first of v2, second of v1, second of v2, … When one runs out, continue with the other. Implement <code>ZigzagIterator(v1, v2)</code>, <code>next()</code>, <code>hasNext()</code>. <b>Follow-up:</b> k lists, round-robin.</p>`,
    constraints: `0 ≤ len(v1), len(v2) ≤ 1000, total ≥ 1.`,
    example: `<p>v1 = [1, 2], v2 = [3, 4, 5, 6] → ${H.c('g', '[1, 3, 2, 4, 5, 6]')}. After v1 is exhausted, the rest of v2 follows in order.</p>`,
    brute: {
      why: `<p>Build the full output list in the constructor by looping i = 0.. max length and appending v1[i], v2[i] when they exist. Correct, but O(N) memory up front and the code does not generalise neatly to k lists of very different lengths (you loop to the longest length checking every list each round).</p>`,
      code: `
      class ZigzagEager {
          private final List<Integer> out = new ArrayList<>();
          private int i = 0;
          ZigzagEager(List<Integer> a, List<Integer> b) {
              for (int j = 0; j < Math.max(a.size(), b.size()); j++) {
                  if (j < a.size()) out.add(a.get(j));
                  if (j < b.size()) out.add(b.get(j));
              }
          }
          int next() { return out.get(i++); }
          boolean hasNext() { return i < out.size(); }
      }`
    },
    mcq: { q: 'For k lists, which structure gives clean round-robin with skipping of finished lists?', options: ['A stack of iterators', 'A queue of non-empty iterators', 'A min-heap', 'A hash set'], answer: 1, explain: 'Pop the front iterator, take one element, push it back if it still has elements. Finished iterators simply are not re-queued.' },
    hints: [
      `<p>Hint 1: Think of the lists as people standing in a line, each taking one turn and going to the back of the line.</p>`,
      `<p>Hint 2: Queue of iterators; only enqueue non-empty ones at construction.</p>`,
      `<p>Hint 3: next(): it = poll(); v = it.next(); if (it.hasNext()) offer(it); return v. hasNext(): queue not empty.</p>`
    ],
    solution: {
      approach: `<p>Queue of active iterators, rotated one element at a time. Generalises to k lists unchanged.</p>`,
      code: `
      class ZigzagIterator {
          private final Deque<Iterator<Integer>> q = new ArrayDeque<>();

          public ZigzagIterator(List<Integer> v1, List<Integer> v2) {
              if (!v1.isEmpty()) q.offer(v1.iterator());
              if (!v2.isEmpty()) q.offer(v2.iterator());
          }

          public int next() {
              Iterator<Integer> it = q.poll();
              int v = it.next();
              if (it.hasNext()) q.offer(it);     // back of the line
              return v;
          }

          public boolean hasNext() { return !q.isEmpty(); }
      }`,
      complexity: `<p>O(1) per call; O(k) memory for k lists.</p>`,
      followUps: ['Weighted round-robin: list i gets w[i] turns.', 'Merge k sorted iterators instead (heap).']
    }
  });

  practice.push({
    title: 'Binary Search Tree Iterator', level: 'Medium', tags: ['design', 'iterator', 'stack', 'bst'], companies: ['Meta', 'Microsoft', 'Amazon', 'LinkedIn'],
    statement: `<p>Implement <code>BSTIterator(TreeNode root)</code> that iterates the BST in ascending (in-order) order: <code>next()</code> returns the next smallest number, <code>hasNext()</code> says whether one remains. Use O(h) memory where h is the tree height and amortised O(1) time per call.</p>`,
    constraints: `1 ≤ nodes ≤ 10<sup>5</sup>, 0 ≤ val ≤ 10<sup>6</sup>, at most 10<sup>5</sup> calls.`,
    example: `<p>Tree root 7, left 3, right 15 with children 9 and 20 → next() sequence ${H.c('g', '3, 7, 9, 15, 20')}, then hasNext() → false.</p>`,
    brute: {
      why: `<p>Do a full in-order traversal in the constructor into a list. Each call is O(1), but memory is O(N) instead of O(h) and the constructor does all the work even if the caller stops after one element.</p>`,
      code: `
      class BSTIteratorEager {
          private final List<Integer> vals = new ArrayList<>();
          private int i = 0;
          BSTIteratorEager(TreeNode root) { inorder(root); }
          private void inorder(TreeNode n) { if (n == null) return; inorder(n.left); vals.add(n.val); inorder(n.right); }
          int next() { return vals.get(i++); }
          boolean hasNext() { return i < vals.size(); }
      }`
    },
    mcq: { q: 'After popping node n from the stack, what do you push?', options: ['n.left and its right spine', 'The left spine of n.right', 'Both children', 'Nothing'], answer: 1, explain: 'Everything in n\'s left subtree was already returned. The next smallest values are in n.right, starting at its leftmost node — so push n.right and all its left descendants.' },
    hints: [
      `<p>Hint 1: Recursive in-order keeps "nodes waiting for me to come back" on the call stack. Keep that stack yourself.</p>`,
      `<p>Hint 2: Helper pushLeft(node): while node != null push it and go left. Call it on the root in the constructor.</p>`,
      `<p>Hint 3: next(): n = pop(); pushLeft(n.right); return n.val. hasNext(): stack not empty. Each node is pushed and popped once → amortised O(1).</p>`
    ],
    solution: {
      approach: `<p>Controlled in-order traversal with an explicit stack holding the current left spine.</p>`,
      code: `
      class BSTIterator {
          private final Deque<TreeNode> st = new ArrayDeque<>();

          public BSTIterator(TreeNode root) { pushLeft(root); }

          private void pushLeft(TreeNode n) {
              while (n != null) { st.push(n); n = n.left; }
          }

          public int next() {
              TreeNode n = st.pop();
              pushLeft(n.right);
              return n.val;
          }

          public boolean hasNext() { return !st.isEmpty(); }
      }`,
      complexity: `<p>Amortised O(1) per next (each node pushed/popped once), worst O(h) for one call; memory O(h).</p>`,
      followUps: ['Add prev() / hasPrev() (bidirectional iterator).', 'Iterate in descending order.', 'Morris traversal: O(1) memory — but it temporarily modifies the tree.']
    }
  });

  practice.push({
    title: 'Snapshot Array', level: 'Medium', tags: ['design', 'binary search', 'versioning'], companies: ['Google', 'Uber', 'Snap'],
    statement: `<p>Implement <code>SnapshotArray(int length)</code> (all zeros), <code>set(index, val)</code>, <code>snap()</code> (returns snap_id = number of previous snaps), and <code>get(index, snap_id)</code> (value at that index when that snapshot was taken).</p>`,
    constraints: `1 ≤ length ≤ 5·10<sup>4</sup>; at most 5·10<sup>4</sup> calls; 0 ≤ val ≤ 10<sup>9</sup>.`,
    example: `<p><code>SnapshotArray(3); set(0,5); snap()→0; set(0,6); get(0,0)→${H.c('g', '5')}</code>. The later set(0,6) happened in snapshot 1, so snapshot 0 still sees 5.</p>`,
    brute: {
      why: `<p>On every <code>snap()</code>, copy the whole array. 5·10<sup>4</sup> snaps × 5·10<sup>4</sup> length = 2.5·10<sup>9</sup> integers copied — about 10 GB. Most indexes never change between snaps, so copying them is pure waste.</p>`,
      code: `
      class SnapshotCopy {
          private final int[] cur;
          private final List<int[]> snaps = new ArrayList<>();
          SnapshotCopy(int n) { cur = new int[n]; }
          void set(int i, int v) { cur[i] = v; }
          int snap() { snaps.add(cur.clone()); return snaps.size() - 1; }   // O(length) per snap
          int get(int i, int s) { return snaps.get(s)[i]; }
      }`
    },
    mcq: { q: 'Index 0 has history [(0,5), (2,6)] as (snapId, value). What is get(0, 1)?', options: ['0', '5', '6', 'Undefined'], answer: 1, explain: 'Floor search: the last snapId ≤ 1 is 0, whose value is 5.' },
    hints: [
      `<p>Hint 1: Store changes, not copies. Each index keeps its own short history of (snapId, value).</p>`,
      `<p>Hint 2: set writes into the current snapId; if the last history entry already has this snapId, overwrite it instead of appending.</p>`,
      `<p>Hint 3: get(i, s) = binary search on index i's history for the last snapId ≤ s (seed every history with (0, 0) so the search always finds something).</p>`
    ],
    solution: {
      approach: `<p>Per-index version lists keyed by snap id, appended in increasing order; reads are floor binary searches. This is the time-based key-value store with array indexes as keys.</p>`,
      code: `
      class SnapshotArray {
          private final List<int[]>[] hist;
          private int snapId = 0;

          @SuppressWarnings("unchecked")
          public SnapshotArray(int length) {
              hist = new List[length];
              for (int i = 0; i < length; i++) {
                  hist[i] = new ArrayList<>();
                  hist[i].add(new int[]{0, 0});              // value 0 as of snapshot 0
              }
          }

          public void set(int index, int val) {
              List<int[]> h = hist[index];
              int[] last = h.get(h.size() - 1);
              if (last[0] == snapId) last[1] = val;         // same snapshot: overwrite
              else h.add(new int[]{snapId, val});
          }

          public int snap() { return snapId++; }

          public int get(int index, int sid) {
              List<int[]> h = hist[index];
              int lo = 0, hi = h.size() - 1;
              while (lo < hi) {                              // find last entry with snap <= sid
                  int mid = (lo + hi + 1) >>> 1;             // upper mid avoids infinite loop
                  if (h.get(mid)[0] <= sid) lo = mid; else hi = mid - 1;
              }
              return h.get(lo)[1];
          }
      }`,
      complexity: `<p>set O(1), snap O(1), get O(log changes at that index). Memory O(length + number of sets).</p>`,
      followUps: ['Use TreeMap&lt;Integer,Integer&gt; per index — trade-offs?', 'Lazily allocate histories only for touched indexes.']
    }
  });

  practice.push({
    title: 'Stock Price Fluctuation', level: 'Medium', tags: ['design', 'hashmap', 'treemap', 'heap'], companies: ['Google', 'Atlassian', 'Bloomberg'],
    statement: `<p>A stream of (timestamp, price) records arrives <b>out of order</b>, and a later record for the same timestamp <b>corrects</b> the earlier one. Implement <code>update(timestamp, price)</code>, <code>current()</code> (price at the latest timestamp), <code>maximum()</code> and <code>minimum()</code> (over the current, corrected prices).</p>`,
    constraints: `1 ≤ timestamp, price ≤ 10<sup>9</sup>; at most 10<sup>5</sup> calls; current/max/min only called after at least one update.`,
    example: `<p><code>update(1,10) update(2,5) current()→5 maximum()→10 update(1,3) maximum()→${H.c('g', '5')} update(4,2) minimum()→${H.c('g', '2')}</code>. The correction at time 1 removes 10 from consideration entirely.</p>`,
    brute: {
      why: `<p>Store time → price in a map and compute max/min by scanning all values each call: O(N) per query, 10<sup>10</sup> work in the worst case. The sorted order of prices is recomputed from scratch every time.</p>`,
      code: `
      class StockBrute {
          private final Map<Integer, Integer> byTime = new HashMap<>();
          private int latest = 0;
          void update(int t, int p) { byTime.put(t, p); latest = Math.max(latest, t); }
          int current() { return byTime.get(latest); }
          int maximum() { return Collections.max(byTime.values()); }   // O(N)
          int minimum() { return Collections.min(byTime.values()); }   // O(N)
      }`
    },
    mcq: { q: 'A correction replaces price 10 at time 1 with 3. What must happen to the multiset of prices?', options: ['Add 3 only', 'Remove one 10 and add 3', 'Remove all 10s', 'Nothing'], answer: 1, explain: 'Exactly one occurrence of the old price disappears (another timestamp might also have price 10), and the new price is added.' },
    hints: [
      `<p>Hint 1: Two views of the data: time → price (for corrections and current) and a sorted multiset of prices (for max/min).</p>`,
      `<p>Hint 2: Java has no multiset; use <code>TreeMap&lt;Integer, Integer&gt;</code> price → count. Track the latest timestamp separately.</p>`,
      `<p>Hint 3: update: if the time existed, decrement the old price's count (remove at 0); put the new price; increment its count. max = lastKey, min = firstKey. Alternative: two heaps with lazy deletion (check the top against the map).</p>`
    ],
    solution: {
      approach: `<p>HashMap for time → price, TreeMap as a counted multiset of prices, and a variable for the latest time. Corrections swap one price for another in the multiset.</p>`,
      code: `
      class StockPrice {
          private final Map<Integer, Integer> byTime = new HashMap<>();
          private final TreeMap<Integer, Integer> priceCount = new TreeMap<>();
          private int latest = 0;

          public void update(int timestamp, int price) {
              Integer old = byTime.put(timestamp, price);
              if (old != null) {                                   // correction: drop one copy of the old price
                  if (priceCount.merge(old, -1, Integer::sum) == 0) priceCount.remove(old);
              }
              priceCount.merge(price, 1, Integer::sum);
              latest = Math.max(latest, timestamp);
          }

          public int current() { return byTime.get(latest); }
          public int maximum() { return priceCount.lastKey(); }
          public int minimum() { return priceCount.firstKey(); }
      }`,
      complexity: `<p>update O(log N); current O(1); maximum/minimum O(log N) (TreeMap end access). Memory O(N).</p>`,
      followUps: ['Max price within a time range (segment tree or TreeMap of times + RMQ).', 'Heaps with lazy deletion — when do they beat the TreeMap?']
    }
  });

  practice.push({
    title: 'Design Add and Search Words Data Structure', level: 'Medium', tags: ['design', 'trie', 'dfs'], companies: ['Meta', 'Amazon', 'Apple'],
    statement: `<p>Implement <code>WordDictionary</code> with <code>addWord(word)</code> and <code>search(word)</code>, where the search pattern may contain dots <code>'.'</code> that match any single letter. Return true if any added word matches the whole pattern.</p>`,
    constraints: `1 ≤ word length ≤ 25, lowercase letters (and '.' in searches, at most 2 dots), at most 10<sup>4</sup> calls.`,
    example: `<p>Add "bad", "dad", "mad". <code>search("pad")→${H.c('r', 'false')}, search("bad")→${H.c('g', 'true')}, search(".ad")→true, search("b..")→true</code>.</p>`,
    brute: {
      why: `<p>Keep all words in a list and compare the pattern against every word of the same length, character by character. Each search is O(N · L). A trie shares common prefixes, so a pattern without dots follows a single path; dots branch only where needed.</p>`,
      code: `
      class WordDictBrute {
          private final List<String> words = new ArrayList<>();
          void addWord(String w) { words.add(w); }
          boolean search(String p) {
              outer:
              for (String w : words) {                     // O(N * L)
                  if (w.length() != p.length()) continue;
                  for (int i = 0; i < p.length(); i++)
                      if (p.charAt(i) != '.' && p.charAt(i) != w.charAt(i)) continue outer;
                  return true;
              }
              return false;
          }
      }`
    },
    mcq: { q: 'During trie search, the pattern has "." at the current position. What do you do?', options: ['Fail', 'Try every existing child recursively', 'Skip to the end of the word', 'Pick the first child only'], answer: 1, explain: 'A dot matches any letter, so the search branches into each child that exists and succeeds if any branch matches the rest.' },
    hints: [
      `<p>Hint 1: Trie with a <code>children[26]</code> array and an <code>end</code> flag per node.</p>`,
      `<p>Hint 2: search is a DFS(node, i): if i == length return node.end; letter → follow that child; dot → try all non-null children.</p>`,
      `<p>Hint 3: Stop early as soon as a branch returns true. Dots are limited, so the branching stays small; without dots it is a single O(L) walk.</p>`
    ],
    solution: {
      approach: `<p>Trie for words; search = DFS that follows exact letters and branches on dots.</p>`,
      code: `
      class WordDictionary {
          private static class Node { Node[] kids = new Node[26]; boolean end; }
          private final Node root = new Node();

          public void addWord(String word) {
              Node n = root;
              for (char c : word.toCharArray()) {
                  if (n.kids[c - 'a'] == null) n.kids[c - 'a'] = new Node();
                  n = n.kids[c - 'a'];
              }
              n.end = true;
          }

          public boolean search(String word) { return dfs(root, word, 0); }

          private boolean dfs(Node n, String w, int i) {
              if (i == w.length()) return n.end;
              char c = w.charAt(i);
              if (c == '.') {
                  for (Node k : n.kids) if (k != null && dfs(k, w, i + 1)) return true;   // branch on wildcard
                  return false;
              }
              Node k = n.kids[c - 'a'];
              return k != null && dfs(k, w, i + 1);
          }
      }`,
      complexity: `<p>addWord O(L). search O(L) without dots; with d dots up to O(26<sup>d</sup> · L) in the worst case. Memory O(total characters × 26 pointers).</p>`,
      followUps: ['Support "*" (any sequence of letters).', 'Return all matching words, sorted.']
    }
  });

  // =====================================================================
  // PRACTICE — Hard
  // =====================================================================
  practice.push({
    title: 'All O’one Data Structure', level: 'Hard', tags: ['design', 'hashmap', 'doubly linked list', 'buckets'], companies: ['Google', 'LinkedIn', 'Uber'],
    statement: `<p>Store string counts with <code>inc(key)</code> (add 1, inserting with count 1 if new), <code>dec(key)</code> (subtract 1, removing the key at 0; the key is guaranteed to exist), <code>getMaxKey()</code> and <code>getMinKey()</code> (any key with the max/min count, or "" if empty). <b>Every operation must be O(1) average.</b></p>`,
    constraints: `1 ≤ key length ≤ 10, lowercase letters; at most 5·10<sup>4</sup> calls.`,
    example: `<p><code>inc(hello) inc(hello) getMaxKey()→"hello" getMinKey()→"hello" inc(leet) getMaxKey()→${H.c('g', '"hello"')} getMinKey()→${H.c('g', '"leet"')}</code></p>${H.kv([['count 1', 'leet'], ['count 2', 'hello']], { label: 'bucket list (min → max)' })}`,
    brute: {
      why: `<p>HashMap of counts plus a scan for max/min: O(N) per query. A TreeMap from count → keys gives O(log N) — close, but the requirement is O(1). The waste: we re-discover the order of counts every time, although each operation changes one count by exactly 1.</p>`,
      code: `
      class AllOneBrute {
          private final Map<String, Integer> cnt = new HashMap<>();
          void inc(String k) { cnt.merge(k, 1, Integer::sum); }
          void dec(String k) { if (cnt.merge(k, -1, Integer::sum) == 0) cnt.remove(k); }
          String getMaxKey() {                       // O(N) scan
              String best = ""; int b = Integer.MIN_VALUE;
              for (Map.Entry<String, Integer> e : cnt.entrySet()) if (e.getValue() > b) { b = e.getValue(); best = e.getKey(); }
              return best;
          }
          String getMinKey() {
              String best = ""; int b = Integer.MAX_VALUE;
              for (Map.Entry<String, Integer> e : cnt.entrySet()) if (e.getValue() < b) { b = e.getValue(); best = e.getKey(); }
              return best;
          }
      }`
    },
    mcq: { q: 'inc(key) moves a key from the count-3 bucket. Where can its new bucket be?', options: ['Anywhere in the list', 'Only immediately after the count-3 bucket (existing count-4 bucket or a new one inserted there)', 'At the tail', 'At the head'], answer: 1, explain: 'Buckets are sorted by count and the new count is exactly 4, so the target is the next bucket if it has count 4, or a brand-new bucket spliced right after the current one.' },
    hints: [
      `<p>Hint 1: Same trick as LFU: counts change by ±1, so a key only ever moves to a <b>neighbouring</b> bucket. Keep buckets in a doubly linked list sorted by count.</p>`,
      `<p>Hint 2: Each bucket = (count, HashSet of keys). Map key → its bucket. Head side = smallest count, tail side = largest.</p>`,
      `<p>Hint 3: inc: target = next bucket if its count is c+1, else create one after the current (or after head for new keys). dec: target = previous bucket if count c−1, else create one before; if c == 1 just drop the key. Remove the key from the old bucket and unlink the bucket if it became empty. Max = tail.prev, min = head.next.</p>`
    ],
    solution: {
      approach: `<p>Doubly linked list of count buckets in increasing order + HashMap key → bucket. Every operation touches the key's bucket and at most one neighbour — O(1).</p>`,
      code: `
      class AllOne {
          private static class Bucket {
              int count;
              Set<String> keys = new HashSet<>();
              Bucket prev, next;
              Bucket(int c) { count = c; }
          }
          private final Bucket head = new Bucket(0), tail = new Bucket(0);
          private final Map<String, Bucket> where = new HashMap<>();

          public AllOne() { head.next = tail; tail.prev = head; }

          private Bucket insertAfter(Bucket b, int count) {
              Bucket n = new Bucket(count);
              n.prev = b; n.next = b.next;
              b.next.prev = n; b.next = n;
              return n;
          }

          private void removeKey(Bucket b, String key) {
              b.keys.remove(key);
              if (b.keys.isEmpty()) { b.prev.next = b.next; b.next.prev = b.prev; }   // unlink empty bucket
          }

          public void inc(String key) {
              Bucket cur = where.get(key);
              Bucket from = cur == null ? head : cur;
              int target = from.count + 1;
              Bucket nxt = from.next;
              if (nxt == tail || nxt.count != target) nxt = insertAfter(from, target);
              nxt.keys.add(key);
              where.put(key, nxt);
              if (cur != null) removeKey(cur, key);
          }

          public void dec(String key) {
              Bucket cur = where.get(key);
              if (cur == null) return;
              if (cur.count == 1) {
                  where.remove(key);
              } else {
                  Bucket prv = cur.prev;
                  if (prv == head || prv.count != cur.count - 1) prv = insertAfter(cur.prev, cur.count - 1);
                  prv.keys.add(key);
                  where.put(key, prv);
              }
              removeKey(cur, key);
          }

          public String getMaxKey() { return tail.prev == head ? "" : tail.prev.keys.iterator().next(); }
          public String getMinKey() { return head.next == tail ? "" : head.next.keys.iterator().next(); }
      }`,
      complexity: `<p>All four operations O(1) average (hash set/map operations + constant pointer work). Memory O(number of keys).</p>`,
      followUps: ['Return all keys with the max count.', 'Support inc(key, delta) with arbitrary delta — what breaks?']
    }
  });

  practice.push({
    title: 'Maximum Frequency Stack', level: 'Hard', tags: ['design', 'stack', 'hashmap', 'buckets'], companies: ['Amazon', 'Google', 'Apple'],
    statement: `<p>Implement <code>FreqStack</code> with <code>push(val)</code> and <code>pop()</code>, where <code>pop</code> removes and returns the <b>most frequent</b> element; if several tie, the one <b>closest to the top</b> (most recently pushed) is removed.</p>`,
    constraints: `0 ≤ val ≤ 10<sup>9</sup>, at most 2·10<sup>4</sup> calls, pop is only called on a non-empty stack.`,
    example: `<p>push 5, 7, 5, 7, 4, 5 → pops: ${H.c('g', '5')} (freq 3), ${H.c('g', '7')} (5 and 7 both freq 2, 7 is newer), ${H.c('g', '5')}, ${H.c('g', '4')} (all freq 1, 4 is newest).</p>`,
    brute: {
      why: `<p>Keep a list in push order and, on pop, scan for the max frequency and the latest element with it: O(N) per pop. A heap keyed by (freq, push time) works in O(log N); the bucket idea gets O(1).</p>`,
      code: `
      class FreqStackBrute {
          private final List<Integer> all = new ArrayList<>();
          private final Map<Integer, Integer> freq = new HashMap<>();
          void push(int v) { all.add(v); freq.merge(v, 1, Integer::sum); }
          int pop() {
              int best = -1;
              for (int i = all.size() - 1; i >= 0; i--)               // O(N) scan from the top
                  if (best == -1 || freq.get(all.get(i)) > freq.get(all.get(best))) best = i;
              int v = all.remove(best);
              freq.merge(v, -1, Integer::sum);
              return v;
          }
      }`
    },
    mcq: { q: 'After pushing 5 three times, which stacks hold a 5?', options: ['Only group[3]', 'group[1], group[2] and group[3]', 'Only group[1]', 'None — 5 is stored in freq only'], answer: 1, explain: 'Each push of 5 lands in the stack for its new frequency: 1, then 2, then 3. Popping from group[3] leaves the earlier copies so 5 is still correctly at frequency 2.' },
    hints: [
      `<p>Hint 1: Mirror image of LFU: frequencies go up by 1 on push and down by 1 on pop, so the maximum can be tracked.</p>`,
      `<p>Hint 2: <code>freq: val → count</code> and <code>group: count → stack of vals</code>. A value with count c appears once in each of group[1..c].</p>`,
      `<p>Hint 3: push: f = ++freq[v]; group[f].push(v); maxFreq = max(maxFreq, f). pop: v = group[maxFreq].pop(); freq[v]--; if group[maxFreq] is empty, maxFreq--. The stack order inside a group handles the recency tie-break.</p>`
    ],
    solution: {
      approach: `<p>Frequency-indexed stacks + maxFreq. The top of group[maxFreq] is always the answer: highest frequency, and among those, the most recently pushed.</p>`,
      code: `
      class FreqStack {
          private final Map<Integer, Integer> freq = new HashMap<>();
          private final Map<Integer, Deque<Integer>> group = new HashMap<>();
          private int maxFreq = 0;

          public void push(int val) {
              int f = freq.merge(val, 1, Integer::sum);
              group.computeIfAbsent(f, k -> new ArrayDeque<>()).push(val);
              maxFreq = Math.max(maxFreq, f);
          }

          public int pop() {
              Deque<Integer> top = group.get(maxFreq);
              int val = top.pop();
              freq.merge(val, -1, Integer::sum);
              if (top.isEmpty()) maxFreq--;          // the next level down is non-empty by construction
              return val;
          }
      }`,
      alt: [{ lang: 'python', code: `
from collections import defaultdict

class FreqStack:
    def __init__(self):
        self.freq = defaultdict(int)
        self.group = defaultdict(list)
        self.max_freq = 0

    def push(self, val: int) -> None:
        self.freq[val] += 1
        f = self.freq[val]
        self.group[f].append(val)
        self.max_freq = max(self.max_freq, f)

    def pop(self) -> int:
        val = self.group[self.max_freq].pop()
        self.freq[val] -= 1
        if not self.group[self.max_freq]:
            self.max_freq -= 1
        return val
` }],
      complexity: `<p>push and pop O(1) average. Memory O(N) — each push adds exactly one stack entry.</p>`,
      followUps: ['Why is group[maxFreq − 1] guaranteed non-empty after group[maxFreq] empties?', 'Add peek() and a remove(val) operation.']
    }
  });

  practice.push({
    title: 'Insert Delete GetRandom O(1) — Duplicates Allowed', level: 'Hard', tags: ['design', 'hashmap', 'array', 'randomized'], companies: ['Amazon', 'Meta', 'LinkedIn', 'Yelp'],
    statement: `<p>Implement <code>RandomizedCollection</code> (a multiset): <code>insert(val)</code> adds val and returns true if it was <b>not</b> present before; <code>remove(val)</code> removes one occurrence and returns whether it was present; <code>getRandom()</code> returns an element with probability proportional to its number of copies. All operations O(1) average.</p>`,
    constraints: `−2<sup>31</sup> ≤ val ≤ 2<sup>31</sup> − 1, at most 2·10<sup>5</sup> calls, getRandom only on a non-empty collection.`,
    example: `<p><code>insert(1)→true insert(1)→${H.c('y', 'false')} insert(2)→true getRandom()</code> → 1 with probability ${H.c('b', '2/3')}, 2 with 1/3. <code>remove(1)→true</code> leaves {1, 2}, each with probability 1/2.</p>`,
    brute: {
      why: `<p>An <code>ArrayList</code> alone gives O(1) insert and getRandom, but <code>remove(Integer.valueOf(val))</code> must search (O(N)) and shift (O(N)). A HashMap of counts gives O(1) insert/remove, but getRandom then needs an O(N) walk over weighted counts.</p>`,
      code: `
      class RandomBagBrute {
          private final List<Integer> list = new ArrayList<>();
          private final Random rnd = new Random();
          boolean insert(int v) { boolean fresh = !list.contains(v); list.add(v); return fresh; }   // O(N) contains
          boolean remove(int v) { return list.remove(Integer.valueOf(v)); }                        // O(N) search + shift
          int getRandom() { return list.get(rnd.nextInt(list.size())); }
      }`
    },
    mcq: { q: 'How do you delete from the middle of the array in O(1)?', options: ['Shift everything left', 'Overwrite the slot with the last element, then remove the last slot', 'Mark it deleted and never compact', 'Sort and binary search'], answer: 1, explain: 'Swap-with-last-and-pop keeps the array dense for uniform random picks — but you must update the index bookkeeping of the moved element.' },
    hints: [
      `<p>Hint 1: Array for O(1) random picks (pick a random index; duplicates appear multiple times, so probabilities are automatically proportional).</p>`,
      `<p>Hint 2: Map val → set of indexes where it sits in the array, so remove can find a position in O(1).</p>`,
      `<p>Hint 3: remove: i = any index of val; last = array's last value; array[i] = last; add i to last's set; remove lastIndex from last's set; remove i from val's set (careful order when val == last!); pop the array; delete val's empty set.</p>`
    ],
    solution: {
      approach: `<p>Dense array + HashMap&lt;value, HashSet&lt;index&gt;&gt;. Deletion fills the hole with the last element and fixes that element's index set. getRandom picks a uniform index.</p>`,
      code: `
      class RandomizedCollection {
          private final List<Integer> vals = new ArrayList<>();
          private final Map<Integer, Set<Integer>> idx = new HashMap<>();
          private final Random rnd = new Random();

          public boolean insert(int val) {
              Set<Integer> s = idx.computeIfAbsent(val, k -> new HashSet<>());
              s.add(vals.size());
              vals.add(val);
              return s.size() == 1;                      // first copy?
          }

          public boolean remove(int val) {
              Set<Integer> s = idx.get(val);
              if (s == null || s.isEmpty()) return false;
              int hole = s.iterator().next();
              s.remove(hole);
              int lastIdx = vals.size() - 1;
              int lastVal = vals.get(lastIdx);
              vals.set(hole, lastVal);                   // move the last element into the hole
              Set<Integer> ls = idx.get(lastVal);
              ls.add(hole);
              ls.remove(lastIdx);                        // works even when hole == lastIdx
              vals.remove(lastIdx);
              if (s.isEmpty()) idx.remove(val);
              return true;
          }

          public int getRandom() { return vals.get(rnd.nextInt(vals.size())); }
      }`,
      complexity: `<p>All operations O(1) average. Memory O(N).</p>`,
      followUps: ['Why does "add hole, then remove lastIdx" order matter when the removed value is the last element?', 'getRandom weighted by a separate weight per value (prefix sums + binary search, or alias method).']
    }
  });

  // =====================================================================
  // QUIZ
  // =====================================================================
  quiz.push(
    { q: 'In an O(1) LRU cache, why must each list node store its key?', options: ['To sort the list', 'So that when the tail node is evicted we can delete its entry from the HashMap', 'Java requires it', 'To compute the hash faster'], answer: 1, explain: 'Eviction finds a node (tail.prev), not a key. Without node.key the map entry stays behind — a memory leak and wrong get results.' },
    { q: 'LRU cache with capacity 2: put(1), put(2), get(1), put(3). Which key is evicted?', options: ['1', '2', '3', 'none'], answer: 1, explain: 'get(1) made 1 most recent, so 2 is the least recently used when 3 arrives.' },
    { q: 'In the O(1) LFU cache, when does minFreq change?', options: ['After every get', 'It is recomputed by scanning buckets after each eviction', 'It becomes 1 on every new insert, and +1 when a touch empties the minFreq bucket', 'Never'], answer: 2, explain: 'A new key always has count 1. A touch moves a key from f to f+1; if bucket f was the minimum and is now empty, the minimum is f+1. No scan needed.' },
    { q: 'Skip list with promotion probability p = ½ and N keys. Expected search cost?', options: ['O(1)', 'O(log N) expected', 'O(log N) worst case', 'O(√N)'], answer: 1, explain: 'About log₂ N levels with ~1–2 moves right per level → ~2 log₂ N comparisons on average over the coin flips. The worst case is O(N) with astronomically small probability.' },
    { q: 'A Bloom filter says "maybe present" for x. Which is true?', options: ['x was definitely added', 'x was definitely not added', 'x was added, or all of its bits were set by other items (false positive)', 'The filter is corrupted'], answer: 2, explain: 'All k bits being 1 is consistent with x having been added — or with a false positive. Only "definitely not" is certain.' },
    { q: 'Target false-positive rate 1% for 1 million items. Roughly how much memory does a Bloom filter need?', options: ['≈ 12 KB', '≈ 1.2 MB', '≈ 120 MB', '≈ 1.2 GB'], answer: 1, explain: 'About 9.6 bits per item × 10⁶ ≈ 9.6 million bits ≈ 1.2 MB, with k ≈ 7 hash functions.' },
    { q: 'You go from 4 to 5 cache servers. Roughly what fraction of keys move with hash % N vs a consistent-hash ring?', options: ['20% vs 80%', '80% vs 20%', '50% vs 50%', '100% vs 0%'], answer: 1, explain: 'With mod-N a key stays only if h % 4 == h % 5 (≈ 1 in 5). With the ring only the new server\'s share (≈ 1/5) moves.' },
    { q: 'Why add virtual nodes to a consistent-hash ring?', options: ['To make lookups O(1)', 'To even out load and spread a failed server\'s keys over many survivors', 'To support deletes', 'To avoid hashing'], answer: 1, explain: 'Many small arcs per server average out the arc lengths (balance), let you weight servers, and scatter the load of a dead server instead of dumping it on one neighbour.' },
    { q: 'TimeMap has versions at times [1, 4, 9] for key k. What does get(k, 8) return?', options: ['The value at 9', 'The value at 4', '""', 'The value at 1'], answer: 1, explain: 'Largest timestamp ≤ 8 is 4 — a floor binary search.' },
    { q: 'Which statement about a nested-list iterator\'s hasNext() is correct?', options: ['It may advance past an element; next() then corrects it', 'It must be idempotent: repeated calls must not skip elements', 'It is optional to implement', 'It must flatten the whole input'], answer: 1, explain: 'Callers may call hasNext() many times. It can do work (digging through empty lists), but must cache what it finds so nothing is skipped.' },
    { q: 'Circular-bucket hit counter, window 300. hit(t) finds times[t % 300] = t − 600. What should it do?', options: ['Add to the bucket count', 'Reset the bucket: times = t, count = 1', 'Throw an error', 'Ignore the hit'], answer: 1, explain: 'The bucket holds a second that left the window long ago; recycle it for the current second.' },
    { q: 'Autocomplete history: "ab" (count 3), "abc" (count 3), "abd" (count 5). Top-3 for prefix "ab"?', options: ['abd, ab, abc', 'abd, abc, ab', 'ab, abc, abd', 'abc, ab, abd'], answer: 0, explain: 'abd has the highest count. ab and abc tie at 3; "ab" is a proper prefix of "abc", so it is smaller lexicographically and comes first.' },
    { q: 'Which eviction policy is optimal but impossible to implement online?', options: ['LRU', 'LFU', 'Belady\'s OPT (evict the item used farthest in the future)', 'CLOCK'], answer: 2, explain: 'OPT needs knowledge of future requests. It is used offline as the upper bound for comparing real policies.' },
    { q: 'A workload repeatedly loops over 101 distinct keys with an LRU cache of capacity 100. Hit rate?', options: ['≈ 99%', '≈ 50%', '≈ 0%', '100%'], answer: 2, explain: 'Every access evicts exactly the key that will be needed next (the least recently used is always the next in the loop). LRU\'s worst case: cyclic access slightly larger than the cache.' },
    { q: 'Which structure can tell you the approximate number of distinct items in a stream using ~12 KB?', options: ['Bloom filter', 'Count-Min Sketch', 'HyperLogLog', 'Skip list'], answer: 2, explain: 'HyperLogLog estimates cardinality with ~0.8% standard error in 12 KB (Redis PFCOUNT). Bloom answers membership; Count-Min answers frequencies.' }
  );

  // =====================================================================
  // INTERVIEW Q&A
  // =====================================================================
  interview.push(
    {
      q: 'Walk me through designing an LRU cache with O(1) get and put.', level: 'I',
      a: `<p>I need two things at once: O(1) lookup by key and O(1) reordering by recency. A <b>HashMap</b> gives lookup; a <b>doubly linked list</b> gives O(1) move-to-front and remove-from-back because each node knows its predecessor. The map stores key → node. With dummy head/tail sentinels: <code>get</code> = lookup, unlink, insert after head. <code>put</code> = update-and-move if present; otherwise, if full, evict <code>tail.prev</code> from both list and map, then insert the new node at the front. I store the key in the node so eviction can clean the map. In Java I would mention <code>LinkedHashMap(accessOrder = true)</code> with <code>removeEldestEntry</code> as the production shortcut.</p>`,
      followUps: ['Why is a singly linked list not enough?', 'How do you make it thread-safe without a global lock?', 'How do you add per-entry TTL?']
    },
    {
      q: 'When would you choose LFU over LRU, and what are LFU\'s weaknesses?', level: 'A',
      a: `<p>LFU wins when popularity is <b>stable</b> and the workload has bursts of one-off items (scans, crawlers): frequently used items survive because a burst of new keys only has count 1. LRU wins when popularity <b>shifts</b> quickly (recency predicts the near future). LFU's weaknesses: stale popularity (yesterday's hit keeps a high count forever — needs aging/decay), cold start (new hot items get evicted before they accumulate counts), and more bookkeeping. Modern caches combine both: W-TinyLFU (Caffeine) uses a frequency sketch to <b>admit</b> items into an LRU-style main area, with periodic halving to age counts.</p>`,
      followUps: ['How does Redis implement LFU in 8 bits?', 'What is the O(1) LFU design?', 'Explain TinyLFU admission.']
    },
    {
      q: 'Explain how a skip list achieves O(log N) and why someone would choose it over a red-black tree.', level: 'A',
      a: `<p>A skip list is a sorted linked list with extra express lanes: each node is promoted to the next level with probability ½, so level i has ~N/2<sup>i</sup> nodes and there are ~log₂ N levels. Search starts at the top-left, moves right while the next key is smaller, and drops down otherwise; on each level you move right ~1–2 times, giving ~2 log₂ N expected comparisons regardless of input order. I would choose it for <b>simplicity</b> (no rotations) and especially for <b>concurrency</b>: inserts only splice pointers, so lock-free versions are practical (Java's ConcurrentSkipListMap). Redis sorted sets use one (with spans for rank queries), and LevelDB/RocksDB memtables use one. A red-black tree gives worst-case guarantees and slightly better constants single-threaded.</p>`,
      followUps: ['How do you compute rank in a skip list?', 'What is MAX_LEVEL and how do you pick it?', 'How does HNSW relate to skip lists?']
    },
    {
      q: 'Design a Bloom filter for 500 million URLs with a 0.1% false-positive rate. Size it and explain the guarantees.', level: 'A',
      a: `<p>Bits per item = −ln(0.001)/(ln 2)² ≈ 14.4, so m ≈ 14.4 × 5·10<sup>8</sup> = 7.2·10<sup>9</sup> bits ≈ <b>900 MB</b>; k = 14.4 × ln 2 ≈ <b>10</b> hash functions, generated by double hashing from one 128-bit Murmur hash. Guarantee: <b>no false negatives</b> — if the filter says "not present", it is certain; "maybe present" is wrong ~0.1% of the time, at which point we do the authoritative lookup. Operational points: monitor the fill ratio (≈ 50% at design load), plan for growth (scalable Bloom filter or rebuild), no deletes (counting or cuckoo filter if needed), and shard or replicate the bit array if 900 MB is too large for one process.</p>`,
      followUps: ['What happens if we insert 1 billion instead?', 'Why not use 30 hash functions to be safe?', 'Bloom vs cuckoo filter?']
    },
    {
      q: 'What is consistent hashing and how do virtual nodes help?', level: 'I',
      a: `<p>Servers and keys are hashed onto the same circular space; each key belongs to the first server clockwise. Adding a server only takes over the arc before it (~1/N of keys), and removing one only moves its own keys — compared with hash % N where adding one server moves ~(N)/(N+1) of all keys and causes a cache stampede. With few points per server, arcs are uneven, so each server gets many <b>virtual nodes</b> (e.g. 100–200 positions): load evens out, capacities can be weighted by vnode count, and a failed server's keys spread across many survivors. Lookup is a ceiling search in a sorted map (TreeMap) with wrap-around: O(log V).</p>`,
      followUps: ['How do you pick R replicas?', 'How do clients agree on ring membership?', 'Does consistent hashing solve hot keys?']
    },
    {
      q: 'Compare rendezvous hashing, jump consistent hash and ring hashing.', level: 'E',
      a: `<p><b>Ring hashing</b>: sorted vnode positions, O(log V) lookup, arbitrary server add/remove, memory O(V), balance depends on vnode count. <b>Rendezvous (HRW)</b>: for each server compute hash(key, server) and pick the max; perfect balance and trivial top-R replicas, no shared state, but O(N) per lookup — fine for tens of servers. <b>Jump consistent hash</b> (Google, 2014): a few lines of arithmetic, zero memory, near-perfect balance and minimal movement — but servers must be numbered 0..N−1 and only added/removed at the end, so it suits shard numbers behind a mapping table, not arbitrary node failures. Maglev hashing builds a lookup table for O(1) lookups in load balancers.</p>`,
      followUps: ['Which would you use for a 10-node memcached cluster?', 'How does bounded-load consistent hashing work?']
    },
    {
      q: 'Design a time-based key-value store. What changes if timestamps arrive out of order?', level: 'I',
      a: `<p>HashMap key → list of (timestamp, value). With increasing timestamps, <code>set</code> appends (O(1)) and the list stays sorted; <code>get(key, t)</code> binary searches for the last timestamp ≤ t (O(log V)) and returns "" if none. If timestamps can arrive <b>out of order</b>, switch each key's list to a <code>TreeMap&lt;Long, String&gt;</code> and use <code>floorEntry(t)</code>, making set O(log V). Production extras: retention (max versions or TTL per key), range reads (two binary searches), compact primitive arrays to avoid boxing, and in distributed settings a reliable timestamp source (hybrid logical clocks or a sequencer).</p>`,
      followUps: ['How is this related to MVCC in databases?', 'How would you implement Snapshot Array?', 'How do ML feature stores use point-in-time lookups?']
    },
    {
      q: 'Implement an iterator over a nested list lazily. What is the complexity?', level: 'I',
      a: `<p>Keep a stack of iterators, one per open list, plus a cached "pending" integer. <code>hasNext</code>: while nothing is pending and the stack is non-empty, look at the top iterator — if exhausted, pop; else take the next element: integer → cache it; list → push its iterator. Return whether something is pending. <code>next</code>: if !hasNext throw; return and clear pending. Every list is pushed and popped once and every integer returned once, so total work is O(N + L) — amortised O(1) per call — and memory is O(depth). It is lazy: nothing beyond the next integer is examined, so it works for huge or streamed inputs.</p>`,
      followUps: ['Why must hasNext be idempotent?', 'Can you support remove()?', 'What would a Python generator version look like?']
    },
    {
      q: 'Design a hit counter for the last 5 minutes. Then scale it to millions of hits per second and many servers.', level: 'A',
      a: `<p>Simple: a queue of timestamps; drop entries ≤ t − 300 on each query; size = answer. Memory grows with traffic. Scalable: 300 circular buckets of (second, count); hit increments or recycles bucket <code>t % 300</code>; query sums buckets with t − time &lt; 300 — O(300) memory forever. Concurrency: atomic per-bucket counters (LongAdder) with a CAS-based reset, or per-thread counters merged on read. Many servers: each server keeps local buckets and a collector sums them every few seconds, or use Redis keys per second with <code>INCR</code> + <code>EXPIRE</code> and sum on read. For per-user limits, use a sliding-window counter or token bucket (two numbers per user).</p>`,
      followUps: ['Fixed window vs sliding window counter vs token bucket?', 'How do you avoid the reset race?', 'What if timestamps are slightly out of order?']
    },
    {
      q: 'Design a search autocomplete system. Cover both the data structure and the production architecture.', level: 'E',
      a: `<p><b>Data structure:</b> a trie where each node caches its top-k completions (k ≈ 5–10), ranked by score. A keystroke moves one node down and returns the cached list — O(k). Updates refresh caches along one path (valid when scores only grow; otherwise rebuild). Compress with radix tries or FSTs; store IDs, not strings, in the caches. <b>Architecture:</b> query logs → batch aggregation (counts with recency decay, filtering spam/offensive terms) → build tries offline → ship to suggestion servers sharded by prefix and replicated → cache hot short prefixes at CDN/browser; clients debounce keystrokes and cancel stale requests; a small real-time layer merges trending queries. Personalisation and ML ranking re-score the trie's candidates.</p>`,
      followUps: ['How do you handle typos?', 'How big is the trie for 10M queries?', 'How fast must the end-to-end latency be?']
    },
    {
      q: 'What are the main ways to make a cache thread-safe, and what are their trade-offs?', level: 'A',
      a: `<p>(1) One global lock: simple and correct, but every get also mutates recency order, so it serialises all threads. (2) Read-write lock: useless for LRU since gets write. (3) <b>Lock striping/sharding</b>: N independent caches selected by key hash — near-linear scaling, but eviction is per shard (approximate global LRU). (4) <b>Buffered reordering</b> (Caffeine): reads are recorded in lock-free ring buffers and replayed in batches under a lock, so the hot path is a ConcurrentHashMap read. (5) <b>Sampled/approximate</b> eviction (Redis): no list at all, evict the oldest among a few random samples. Also handle the <b>stampede</b> when many threads miss the same key: compute once (per-key futures / single-flight) and let others wait.</p>`,
      followUps: ['What is a cache stampede and how do you prevent it?', 'Why is ConcurrentHashMap alone not an LRU?']
    },
    {
      q: 'Exact vs approximate data structures: when is approximation acceptable, and which ones would you reach for?', level: 'E',
      a: `<p>Approximation is acceptable when the answer drives a <b>decision that tolerates small, bounded error</b> or when a "maybe" is double-checked by an exact source: skipping disk reads (Bloom), counting unique visitors on a dashboard (HyperLogLog, ~1% error in 12 KB), finding heavy hitters or rate-limit offenders (Count-Min Sketch, Space-Saving), latency percentiles (t-digest, KLL). It is not acceptable for money, permissions or anything a user must be able to audit exactly. The pitch: "memory drops by 100–10,000×, error is bounded and tunable, and I can verify positives against the exact store." Also mention mergeability: most sketches combine across shards with OR/addition.</p>`,
      followUps: ['How does Count-Min Sketch overestimate but never underestimate?', 'Why does HyperLogLog use the number of leading zeros?']
    },
    {
      q: 'You are given an AI-generated "O(1) LFU cache" that uses a PriorityQueue. How do you review it?', level: 'E',
      a: `<p>First, complexity: <code>PriorityQueue.poll/offer</code> is O(log N) and <code>remove(Object)</code> is O(N), so updating a key's frequency inside the heap is O(N) — the claim is false. Second, correctness: Java's PriorityQueue does not re-heapify when a contained object's priority changes, so mutating a node's count in place silently breaks the heap. Third, tie-breaking: does it use a timestamp for "least recently used among equals"? Fourth, edge cases: capacity 0, update of an existing key when full (must not evict). I would replace it with freq → LinkedHashSet buckets + minFreq, and add a randomized test against a brute-force reference model.</p>`,
      followUps: ['Write the randomized differential test.', 'What other AI-typical bugs show up in cache code?']
    },
    {
      q: 'Explain amortised vs expected vs worst-case time with examples from this module.', level: 'A',
      a: `<p><b>Worst-case</b>: every single operation meets the bound — LRU get/put (O(1) given O(1) hashing), TreeMap operations O(log N). <b>Amortised</b>: the total over any sequence is bounded, individual calls can spike — the nested-list iterator (one hasNext may pop many empty lists), dynamic array growth, the hit-counter queue (pops are paid for by earlier pushes). <b>Expected</b>: averaged over the algorithm's random choices, valid for every input — skip list search O(log N) expected, hash map operations with a good random hash. In latency-sensitive systems, amortised spikes matter (resizing a huge hash map) — Redis uses incremental rehashing to spread the cost.</p>`,
      followUps: ['Prove the amortised O(1) of the BST iterator.', 'What is the probability that a skip list search takes 10× the expected time?']
    },
    {
      q: 'How would you test a custom data structure like an LFU cache or skip list before shipping it?', level: 'B',
      a: `<p>Start with small hand-written cases from the problem (the sample trace) and edge cases: empty, capacity 0 and 1, duplicates, updates of existing keys, boundaries of time windows. Then <b>differential / property-based testing</b>: generate thousands of random operation sequences, run them on my structure and on a slow but obviously-correct reference (scan everything, or a TreeMap), and compare every output. Add invariant checks in debug builds (list sizes match the map, minFreq bucket non-empty, skip-list lanes sorted). For concurrent versions, run stress tests with many threads and check linearizable results. In production, export metrics: hit rate, evictions, size, latency percentiles.</p>`,
      followUps: ['What invariants would you assert for the LRU list?', 'How do you make random tests reproducible?']
    }
  );

  registerModule({
    id: 'dsa27',
    title: 'Real-World Data Structure Design',
    intro: `<p>This is where data structures stop being textbook exercises and become the parts that real systems are built from. You will design the <b>LRU and LFU caches</b> behind databases and CDNs, the <b>skip list</b> inside Redis and RocksDB, the <b>Bloom filter</b> that saves billions of disk reads, the <b>consistent-hash ring</b> that lets cache clusters grow without collapsing, the <b>versioned key-value store</b> behind MVCC and ML feature stores, lazy <b>iterators</b>, the <b>hit counter</b> at the core of every rate limiter, and the <b>autocomplete</b> trie behind every search box.</p>
      <p>Each topic starts with an everyday analogy, builds the O(1) or O(log N) design step by step with a visualizer you can play with, then goes deep into production reality (concurrency, memory, approximate alternatives) and how AI changes the interview. The last topic teaches the <b>design-interview script</b> and the trade-off axes that interviewers actually grade.</p>`,
    goals: [
      'Build LRU and LFU caches with O(1) get/put from memory, explain every pointer move, and discuss TTL, scan resistance and thread safety',
      'Implement a skip list and explain its expected O(log N) cost, and when to choose it over a balanced tree',
      'Size a Bloom filter from n and a target false-positive rate (m, k, memory) and explain its no-false-negatives guarantee',
      'Design a consistent-hash ring with virtual nodes, quantify how many keys move, and compare it with rendezvous and jump hashing',
      'Design time-versioned stores, lazy iterators, sliding-window hit counters and a trie-based autocomplete with cached top-k',
      'Run a structured design interview: clarify the API, set target complexities, combine structures, and argue trade-offs (time vs memory, exact vs approximate, worst-case vs amortised vs expected)'
    ],
    prereqs: `<p>DSA 8 (Hashing), DSA 10 (Binary Search), DSA 12 (Linked Lists), DSA 13 (Stacks &amp; Queues), DSA 14 (Trees &amp; BSTs) and DSA 15 (Heaps &amp; Tries). Comfortable with Java collections (HashMap, TreeMap, ArrayDeque, LinkedHashMap) and Big-O including amortised analysis.</p>`,
    hours: 22,
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
