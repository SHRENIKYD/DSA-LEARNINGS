(function () {
  var topics = [], practice = [], quiz = [], interview = [];

  /* ---------- shared visualizer helpers (pure, deterministic) ---------- */
  function box(id, label, x, y, w) { var n = { id: id, label: label, x: x, y: y, shape: 'box' }; if (w) n.w = w; return n; }
  function cp(o) { var r = {}; for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) r[k] = o[k]; return r; }
  function words(input) { return String(input == null ? '' : input).trim().split(/[\s,]+/).filter(function (s) { return s.length; }); }

  /* =====================================================================
     TOPIC 1 — CAP theorem and PACELC
     ===================================================================== */
  topics.push({
    title: 'CAP Theorem and PACELC: What Happens When the Network Splits',
    analogy: `<p>Imagine two friends running <b>one shared diary</b> from two cities. Every evening they phone each other to copy the day's entries. One day the <b>phone line dies</b>. A customer walks up to the friend in city B and asks "what is the latest entry?". Friend B has two honest choices: <b>refuse to answer</b> ("sorry, I cannot be sure I have the latest page") or <b>answer with what she has</b>, knowing it might be out of date. There is no third option — she cannot magically know what city A wrote. That is the CAP theorem in one phone call.</p>`,
    explain: `<p>When data lives on <b>several machines</b> (replicas), three properties are wanted:</p>
${H.table(['Letter', 'Name', 'Plain meaning'], [['C', 'Consistency', 'every read sees the latest successful write — the system behaves like <b>one single copy</b> (this is <i>linearizability</i>, not the C in ACID)'], ['A', 'Availability', 'every request sent to a <b>non-failed</b> node gets a real (non-error) answer, eventually'], ['P', 'Partition tolerance', 'the system keeps working even if the network <b>drops or delays messages</b> between nodes']])}
<p><b>The theorem (Brewer 2000, proved by Gilbert &amp; Lynch 2002):</b> while a network partition is happening, you cannot have both C and A. Since partitions <i>will</i> happen on real networks (cables cut, switches reboot, cloud zones lose links, long GC pauses look like partitions), "P" is not optional. So the real choice is:</p>
<ul>
<li>${H.c('b', 'CP')} — during a partition, the side that cannot reach a majority <b>refuses</b> reads/writes (errors or timeouts). Data stays correct. Examples: ZooKeeper, etcd, Consul, HBase, Google Spanner, MongoDB with majority read/write concern.</li>
<li>${H.c('g', 'AP')} — during a partition, every node keeps answering, even with <b>stale</b> data, and accepts writes that may <b>conflict</b>. Conflicts are fixed later (last-write-wins, vector clocks, CRDTs). Examples: Cassandra and DynamoDB with low consistency levels, Riak, CouchDB, DNS.</li>
</ul>
<p><b>"CA" is not a real choice</b> for a distributed system: a single-node Postgres is "CA" only because it has no network to partition.</p>
<p><b>PACELC (Daniel Abadi, 2010)</b> fixes CAP's blind spot: partitions are rare, but you pay a trade-off <b>every single day</b> even without one.</p>
${H.kv([['if Partition (P)', 'choose Availability (A) or Consistency (C)'], ['Else (E), normal operation', 'choose Latency (L) or Consistency (C)']], { label: 'PACELC reads as: if P then A or C, Else L or C' })}
<p>Why the "else" part? To be strongly consistent you must wait for other replicas to confirm each write (a round trip, maybe across regions). To be fast you answer from the nearest copy and replicate in the background. So systems get two-part labels:</p>
${H.table(['System (typical config)', 'PACELC', 'Why'], [['Cassandra, DynamoDB (default), Riak', 'PA/EL', 'stay up and fast; replicas sync later'], ['Spanner, CockroachDB, etcd, ZooKeeper, VoltDB', 'PC/EC', 'consistency always; pay latency + unavailability of minority side'], ['MongoDB (primary reads, majority writes)', 'PC/EC', 'minority side has no primary; reads go to primary'], ['PNUTS (Yahoo)', 'PC/EL', 'per-record master; fast local reads normally, stops writes during a partition'], ['Cosmos DB', 'tunable', '5 levels from Strong (PC/EC) to Eventual (PA/EL)']])}
<p>In an interview, <b>never</b> answer "we pick CA". Say: "On partition we prefer X because a stale/failed answer costs Y; normally we trade latency for consistency like Z."</p>`,
    clues: ['"what happens if the data centres lose connectivity?" → name your CAP choice per feature', '"the balance must never be wrong / no double booking" → CP (refuse rather than be wrong)', '"the shopping cart / likes / feed must always accept writes" → AP with conflict resolution', '"global users, sub-10 ms reads" → PACELC: you are choosing EL (latency) in normal operation', '"is Cassandra CP or AP?" → tunable per query; default QUORUM/ONE settings make it PA/EL', '"leader election, config, locks" → CP store (etcd/ZooKeeper), never AP'],
    viz: [{
      title: 'Network partition: CP refuses, AP answers stale',
      input: 'CP',
      inputLabel: 'Mode: CP or AP',
      gen: function (input) {
        var mode = String(input || 'CP').trim().toUpperCase();
        if (mode !== 'CP' && mode !== 'AP') throw new Error('Type CP or AP');
        var cp_ = mode === 'CP';
        function g(nodes, edges, hl, ehl, tags) {
          return { type: 'graph', label: mode + ' cluster (3 replicas)', height: 70, nodes: nodes, edges: edges, hl: hl || {}, ehl: ehl || {}, tags: tags || {} };
        }
        var N = [box('CA', 'Client A', 8, 12), box('N1', 'N1 (leader)', 35, 12), box('N2', 'N2', 35, 58), box('N3', 'N3', 78, 35), box('CB', 'Client B', 96, 62)];
        var full = [['N1', 'N2', 'sync'], ['N1', 'N3', 'sync'], ['N2', 'N3', 'sync']];
        var cut = [['N1', 'N2', 'ok'], ['N1', 'N3', 'CUT'], ['N2', 'N3', 'CUT']];
        function st(a, b, c) { return { type: 'table', label: 'Value of x on each replica', columns: ['N1', 'N2', 'N3'], rows: [[a, b, c]] }; }
        var f = [];
        f.push({ narr: 'Healthy cluster. All three replicas hold <b>x = 5</b> and can talk to each other. Here C and A are both easy.', parts: [g(N, full), st('5', '5', '5')] });
        f.push({ narr: 'Client A writes <b>x = 6</b> to N1. N1 copies it to N2 and N3 and then says OK. Everyone agrees.', parts: [g(N, full.concat([['CA', 'N1', 'x=6']]), { N1: 'ok', N2: 'ok', N3: 'ok' }, { 'CA-N1': 'ok', 'N1-N2': 'ok', 'N1-N3': 'ok' }), st('6', '6', '6')] });
        f.push({ narr: '<span class="c-r">Partition!</span> A switch fails. N3 can no longer reach N1 or N2. N1+N2 are the <b>majority side</b> (2 of 3); N3 is alone in the <b>minority side</b>. Neither side can tell if the other is dead or just unreachable.', parts: [g(N, cut, { N3: 'bad' }, { 'N1-N3': 'bad', 'N2-N3': 'bad' }, { N3: 'isolated' }), st('6', '6', '6')] });
        f.push({ narr: 'Client A writes <b>x = 7</b> to N1. N1 reaches N2 (majority of 3 = 2), so the write commits on the majority side. N3 never hears about it.', parts: [g(N, cut.concat([['CA', 'N1', 'x=7']]), { N1: 'ok', N2: 'ok', N3: 'bad' }, { 'CA-N1': 'ok', 'N1-N2': 'ok', 'N1-N3': 'bad', 'N2-N3': 'bad' }), st('7', '7', '6 (stale)')] });
        if (cp_) {
          f.push({ narr: 'Client B asks N3 for x. <b>CP choice:</b> N3 knows it cannot reach a majority, so it may be stale. It <span class="c-r">refuses</span> (error / timeout). Correct, but <b>not available</b> for Client B.', parts: [g(N, cut.concat([['CB', 'N3', 'read x?']]), { N3: 'bad', CB: 'cur' }, { 'CB-N3': 'bad', 'N1-N3': 'bad', 'N2-N3': 'bad' }, { N3: '503 unavailable' }), st('7', '7', '6')] });
          f.push({ narr: 'Client B tries to write <b>x = 9</b> at N3. <b>CP:</b> rejected again — a write needs a majority. No conflicting data is ever created.', parts: [g(N, cut.concat([['CB', 'N3', 'x=9?']]), { N3: 'bad' }, { 'CB-N3': 'bad' }, { N3: 'rejected' }), st('7', '7', '6')] });
          f.push({ narr: 'The network heals. N3 rejoins, sees it is behind, and copies the missing log entry from the leader. Everyone has <b>x = 7</b>. Nothing to reconcile, because the minority never accepted writes.', parts: [g(N, full, { N3: 'ok' }, { 'N1-N3': 'ok' }, { N3: 'caught up' }), st('7', '7', '7')] });
        } else {
          f.push({ narr: 'Client B asks N3 for x. <b>AP choice:</b> N3 answers immediately with <span class="c-y">x = 6</span>. Available, but <b>stale</b> — the real latest value is 7.', parts: [g(N, cut.concat([['CB', 'N3', 'read x']]), { N3: 'cur', CB: 'ok' }, { 'CB-N3': 'ok', 'N1-N3': 'bad', 'N2-N3': 'bad' }, { N3: 'returns 6' }), st('7', '7', '6')] });
          f.push({ narr: 'Client B writes <b>x = 9</b> at N3. <b>AP:</b> accepted! Now the two sides have <span class="c-r">conflicting</span> histories: 7 on the left, 9 on the right.', parts: [g(N, cut.concat([['CB', 'N3', 'x=9']]), { N3: 'cur' }, { 'CB-N3': 'ok' }, { N3: 'accepted' }), st('7', '7', '9')] });
          f.push({ narr: 'The network heals. Replicas exchange data and find two versions. Something must decide: <b>last-write-wins</b> (timestamps, may silently drop one), <b>vector clocks</b> (detect conflict, keep both as siblings for the app to merge), or a <b>CRDT</b> (auto-merge). Here LWW picks 9.', parts: [g(N, full, { N1: 'cur', N2: 'cur', N3: 'cur' }, { 'N1-N3': 'cur', 'N2-N3': 'cur' }, { N3: 'conflict!' }), st('9 (LWW)', '9 (LWW)', '9'), { type: 'text', html: 'The write <b>x = 7</b> was acknowledged to Client A and then lost. That is the price of AP + LWW.' }] });
        }
        f.push({ narr: 'Summary: during a partition you must pick. Run the visualizer again with <b>' + (cp_ ? 'AP' : 'CP') + '</b> to see the other side.', parts: [{ type: 'table', label: 'CP vs AP during a partition', columns: ['Question', 'CP', 'AP'], rows: [['Minority side reads', 'error / timeout', 'stale answer'], ['Minority side writes', 'rejected', 'accepted (may conflict)'], ['After healing', 'just catch up', 'reconcile conflicts'], ['Good for', 'money, locks, inventory', 'carts, feeds, likes, DNS']], hl: { 0: cp_ ? 'sel' : 'ok' } }] });
        return f;
      }
    }, {
      title: 'PACELC "Else" branch: latency vs consistency with no partition',
      input: '2 40 90',
      inputLabel: 'Round-trip ms to the other replicas (space separated, 1-6 values)',
      gen: function (input) {
        var r = words(input).map(Number);
        if (!r.length || r.length > 6 || r.some(function (v) { return isNaN(v) || v < 0 || v > 10000; })) throw new Error('Enter 1-6 round-trip times in ms, e.g. 2 40 90');
        var n = r.length + 1, sorted = r.slice().sort(function (a, b) { return a - b; });
        var maj = Math.floor(n / 2) + 1; // replicas needed including leader
        var quorumWait = maj - 1 > 0 ? sorted[maj - 2] : 0;
        var allWait = sorted[sorted.length - 1];
        var local = 1;
        var labels = r.map(function (v, i) { return 'R' + (i + 1); });
        var f = [];
        f.push({ narr: 'No partition today. One leader and ' + r.length + ' follower replica(s). Bars show how far away each follower is (round-trip ms). A local write to the leader\'s disk takes about <b>' + local + ' ms</b>.', parts: [{ type: 'bars', label: 'Round trip to each follower (ms)', values: r, idxLabels: labels }] });
        f.push({ narr: '<b>EL (pick latency):</b> acknowledge after the local write, replicate in the background. Client waits <b>' + local + ' ms</b>. Followers may be stale for up to ~' + allWait + ' ms (longer under load).', parts: [{ type: 'bars', label: 'Round trip (ms) — not waited for', values: r, idxLabels: labels, hl: {} }, { type: 'vars', label: 'EL write', vals: { client_wait_ms: local, stale_window_ms: allWait }, hl: { client_wait_ms: 'ok' } }] });
        var hl = {}; for (var i = 0; i < r.length; i++) if (r[i] <= quorumWait && maj > 1) hl[i] = 'ok';
        f.push({ narr: '<b>EC with a majority quorum:</b> wait until ' + maj + ' of ' + n + ' copies (leader + the ' + (maj - 1) + ' closest follower(s)) have the write. Client waits about <b>' + (local + quorumWait) + ' ms</b>. This is what Raft/Paxos systems (etcd, Spanner, CockroachDB) do.', parts: [{ type: 'bars', label: 'Round trip (ms) — green = waited for', values: r, idxLabels: labels, hl: hl }, { type: 'vars', label: 'EC (majority) write', vals: { majority: maj + '/' + n, client_wait_ms: local + quorumWait }, hl: { client_wait_ms: 'cur' } }] });
        var all = {}; for (var j = 0; j < r.length; j++) all[j] = 'bad';
        f.push({ narr: '<b>EC with all replicas (fully synchronous):</b> wait for the slowest follower — <b>' + (local + allWait) + ' ms</b> — and if any one follower is down, writes stop. Almost nobody does this across regions.', parts: [{ type: 'bars', label: 'Round trip (ms) — all waited for', values: r, idxLabels: labels, hl: all }, { type: 'vars', label: 'Fully sync write', vals: { client_wait_ms: local + allWait }, hl: { client_wait_ms: 'bad' } }] });
        f.push({ narr: 'The PACELC "else" trade-off in numbers. Even with a perfect network, consistency costs latency every request.', parts: [{ type: 'table', label: 'Write latency per choice', columns: ['Choice', 'Client waits', 'Stale reads possible?'], rows: [['EL (async)', local + ' ms', 'yes, from followers'], ['EC (majority)', (local + quorumWait) + ' ms', 'no, if reads also use leader/quorum'], ['EC (all)', (local + allWait) + ' ms', 'no, but any failure blocks writes']], hl: { 1: 'sel' } }] });
        return f;
      }
    }],
    examples: [
      { title: 'Bank balance during a partition → CP', html: `<p>A user in Mumbai sees ₹1,000. The link to the Singapore replica dies. If both sides accept a ₹800 withdrawal, the bank pays out ₹1,600 from ₹1,000. A wrong answer here costs real money, while a <b>"please try again in a minute"</b> error costs only patience. ${H.c('b', 'Choose CP')}: the minority side refuses writes. PACELC label: <b>PC/EC</b> — even normally, wait for a majority before confirming.</p>` },
      { title: 'Shopping cart → AP (the original Dynamo story)', html: `<p>Amazon found that every refused "add to cart" was lost revenue. Dynamo (2007) chose ${H.c('g', 'AP')}: any replica accepts the add. If two partitions produce carts {book} and {pen}, the merge keeps <b>both</b> (union). Worst case: a deleted item reappears — annoying but cheap. PACELC label: <b>PA/EL</b>.</p>` },
      { title: 'Same product, different features, different choices', html: `<p>A ticket-booking site:</p>${H.table(['Feature', 'Choice', 'Reason'], [['Seat reservation', 'CP', 'two people must not get seat 14C'], ['Event description page', 'AP + CDN cache', 'a 30 s old description is fine'], ['"People viewing now" counter', 'AP', 'approximate is fine'], ['Payment ledger', 'CP', 'money must balance']])}<p>Senior answer: <b>CAP is chosen per operation, not per company.</b></p>` },
      { title: 'Computing the PACELC latency cost', html: `<p>Replicas in Virginia (leader), Ohio (12 ms RTT), Oregon (65 ms), Frankfurt (90 ms). Majority of 4 = 3 copies → wait for the 2 closest followers → ~65 ms per write. Asynchronous (EL) → ~1 ms. That 64 ms gap, paid on every write, is the "ELC" half of PACELC — and it is why many teams accept eventual consistency for non-critical data.</p>` }
    ],
    deepDive: `<p><b>What CAP really says (and does not):</b> the proof uses a very strict C (linearizability) and a very strict A (every non-failed node must answer). Real systems live in between: a CP system is still available on the <i>majority</i> side; an AP system can still offer session guarantees. Martin Kleppmann's critique: CAP's A and C are so narrow that most systems are "neither CP nor AP" in the strict sense — e.g. a single-leader database with async replicas is not linearizable (reads from followers) and not CAP-available (the minority side with the leader dead cannot write). Use CAP as a <b>conversation starter</b>, then talk precisely about consistency models and latency.</p>
<p><b>Partitions are not just cut cables:</b> a 30-second stop-the-world GC pause, an overloaded NIC dropping packets, asymmetric routes (A can reach B but not the reverse), and cloud availability-zone isolation all look identical to a partition. Google reported Spanner's availability above five nines partly because its private network makes partitions very rare — Brewer called Spanner "effectively CA" while being technically CP.</p>
<p><b>Detecting which side you are on:</b> CP systems use a <b>majority quorum</b> (⌊N/2⌋+1). With N = 5, a 3–2 split leaves the 3-side working. A 2–2–1 split leaves <b>no</b> side with a majority → the whole system is unavailable for writes. That is why you deploy odd node counts across 3+ failure domains.</p>
<p><b>Tunable consistency:</b> Cassandra lets each query choose ONE, QUORUM, LOCAL_QUORUM, ALL; DynamoDB offers eventually consistent reads (half the cost) or strongly consistent reads (single region). Cosmos DB has five levels: Strong, Bounded Staleness, Session, Consistent Prefix, Eventual. So "is X CP or AP?" usually means "with which settings?".</p>
<p><b>Harvest and yield (Fox &amp; Brewer):</b> instead of all-or-nothing, return a partial answer (search results from 9 of 10 shards = 90% harvest) to keep yield (requests answered) high. Many real "AP" designs are actually graceful degradation.</p>`,
    aiEra: `<p><b>What AI changes:</b> assistants will happily label any database "CP" or "AP" from a blog post. They often miss that the answer depends on configuration (Cassandra QUORUM vs ONE, MongoDB read concern, DynamoDB strongly-consistent flag) and on which operation you mean. <b>Use AI as a partner:</b> ask <code>List every failure mode for my checkout flow if the us-east and eu-west regions partition for 10 minutes; for each say whether the user sees an error or stale data</code> — then check each line yourself. Ask it to generate Jepsen-style test scenarios ("partition the leader, write, heal, read") for your staging cluster.</p>
<p><b>AI systems have CAP problems too:</b> a vector database replicated across regions, an agent memory store, or a feature store serving an online model faces the same choice. Is a recommendation built on a 5-minute-old embedding acceptable? Usually yes (AP/EL). Is an AI agent's "already-paid this invoice" flag acceptable if stale? No — that needs CP, or the agent may pay twice. <b>What you must still own:</b> mapping each business operation to "error is worse" or "stale is worse", and defending it with numbers in the interview.</p>`,
    problems: [{
      title: 'Classify Systems by CAP and PACELC',
      level: 'Easy', tags: ['CAP', 'PACELC', 'trade-offs'], companies: ['Amazon', 'Google', 'Microsoft'],
      statement: `<p>For each system below, give its CAP choice during a partition and its full PACELC label in its <b>common default configuration</b>, with a one-line reason: (1) ZooKeeper, (2) Cassandra with consistency level ONE, (3) a DNS resolver hierarchy, (4) Google Spanner, (5) a single-leader Postgres with async read replicas serving reads from replicas.</p>`,
      constraints: `<p>Assume real networks: partitions happen. "CA" is not an allowed answer for a multi-node system.</p>`,
      example: `<p>Example answer format: <b>etcd</b> → ${H.c('b', 'PC/EC')}: Raft needs a majority to commit; reads are linearizable via the leader, so even without a partition every write waits for a quorum round trip.</p>`,
      brute: { why: `<p>The naive answer memorises "SQL = CA, NoSQL = AP". It breaks immediately: a replicated SQL database is not partition-free, MongoDB with majority concern is CP, and Cassandra's label changes with the consistency level. It also ignores the "else" half — latency in normal operation — which is what users feel every day.</p>` },
      mcq: { q: 'During a partition, a ZooKeeper follower cut off from the majority receives a write. What happens?', options: ['It rejects / cannot commit the write', 'It accepts and merges later', 'It becomes the leader', 'It forwards to DNS'], answer: 0, explain: 'ZooKeeper (ZAB) needs a quorum to commit; the minority side cannot make progress → CP.' },
      hints: [`<p>Ask two questions per system: "on a partition, does the minority side keep answering?" and "normally, does a write wait for other replicas?"</p>`, `<p>Consensus-based stores (ZooKeeper, etcd, Spanner) are PC/EC. Leaderless stores at low consistency levels are PA/EL. Caches like DNS serve stale data happily.</p>`, `<p>For the Postgres case: think about what a read from a lagging replica returns (stale → not C) and what happens if the leader is on the wrong side of the partition (writes stop).</p>`],
      solution: {
        approach: `<p><b>1. ZooKeeper → PC/EC.</b> Writes go through the leader and commit only when a majority acknowledges (ZAB). A minority partition cannot elect a leader, so it stops serving writes (and by default refuses sessions). Normally every write pays a quorum round trip — consistency over latency. (Its default reads are served locally by followers and can be slightly stale; <code>sync()</code> before a read makes it up to date.)</p>
<p><b>2. Cassandra, CL=ONE → PA/EL.</b> Any single replica can accept a write or answer a read, so both sides of a partition keep working; conflicts are resolved by last-write-wins timestamps. Normally, ONE returns after the fastest replica — low latency, possibly stale.</p>
<p><b>3. DNS → PA/EL.</b> Resolvers cache records for the TTL and keep answering even if the authoritative server is unreachable. Updates spread slowly (eventual consistency). Availability is the whole point.</p>
<p><b>4. Spanner → PC/EC.</b> Paxos groups need a majority; TrueTime commit-wait adds a few milliseconds so transactions are externally consistent. Minority replicas cannot serve strong reads.</p>
<p><b>5. Postgres + async replicas → PC/EL (ish).</b> During a partition, the side without the primary cannot write (C-leaning), but replica reads are stale even without a partition (latency chosen over consistency). Strictly speaking it is neither linearizable nor CAP-available — a good point to raise to show maturity.</p>`,
        complexity: `<p>Reasoning cost only. Real-world cost: PC/EC systems pay ≥ 1 quorum RTT per write (1–100 ms depending on geography); PA/EL systems pay in conflict-resolution logic and stale reads.</p>`,
        followUps: ['How would you change Cassandra settings to make it behave closer to PC/EC?', 'Which of these would you use to store a distributed lock and why?']
      }
    }]
  });

  /* =====================================================================
     TOPIC 2 — Consistency models
     ===================================================================== */
  topics.push({
    title: 'Consistency Models: Strong, Linearizable, Causal, Read-Your-Writes, Eventual',
    analogy: `<p>Think of a <b>class WhatsApp group</b>. <b>Linearizable</b> is like everyone looking at one whiteboard: the moment the teacher writes, everybody sees it. <b>Causal</b> is like WhatsApp itself: you might see messages late, but you will never see a <i>reply</i> before the <i>question</i> it answers. <b>Read-your-writes</b> means at least <i>you</i> always see your own message right after sending it. <b>Eventual</b> is like postcards: they all arrive one day, in any order, and only then does everyone agree.</p>`,
    explain: `<p>A <b>consistency model</b> is a promise from the database to you: "here is which values a read is <i>allowed</i> to return". Stronger promises are easier to program against but cost more latency and availability. From strongest to weakest:</p>
${H.table(['Model', 'Promise in plain English', 'Typical cost'], [['<b>Linearizable</b> (strong)', 'acts like ONE copy; once a write finishes, every later read (by anyone, anywhere) sees it or something newer', 'quorum / leader round trip on every op; unavailable on minority side'], ['<b>Sequential</b>', 'everyone sees all operations in the same order, but that order may lag real time', 'still needs coordination'], ['<b>Causal</b>', 'if A could have influenced B (I read A, then wrote B), everyone sees A before B; unrelated writes may be seen in different orders', 'track dependencies; can stay available during partitions'], ['<b>Read-your-writes</b> (session)', 'you always see your own earlier writes', 'sticky routing or version tokens'], ['<b>Monotonic reads</b> (session)', 'once you saw a value, you never see an older one later', 'stick to one replica / version check'], ['<b>Eventual</b>', 'if writes stop, all replicas converge to the same value "eventually"', 'cheapest; no ordering promises at all']])}
<p><b>Linearizable vs "strong":</b> people say "strong consistency" loosely. Linearizability is the precise one: each operation appears to take effect at a single instant between its start and end. <b>Serializable</b> is a different thing — it is about multi-key <i>transactions</i> appearing in some serial order, not about real time. <b>Strict serializability</b> = both (Spanner, FaunaDB, CockroachDB claim close to this).</p>
<p><b>The everyday anomalies</b> each model prevents:</p>
<ul>
<li>${H.c('r', 'Stale self-read')}: you update your profile picture, refresh, and see the old one → fixed by <b>read-your-writes</b>.</li>
<li>${H.c('r', 'Time travel')}: you see 10 comments, refresh, see 8 → fixed by <b>monotonic reads</b>.</li>
<li>${H.c('r', 'Reply before question')}: Bob sees "Congrats!" before Alice's "I got the job" → fixed by <b>causal</b>.</li>
<li>${H.c('r', 'Double sell')}: two buyers both see "1 left" and both buy → needs <b>linearizable</b> (or a transaction / compare-and-set).</li>
</ul>
<p>Session guarantees (read-your-writes, monotonic reads, monotonic writes, writes-follow-reads) were named in the Bayou paper (1994); together they give causal consistency for one client's session. Run the visualizer to see which anomaly appears under each model.</p>`,
    clues: ['"after I update my profile I must see the change" → read-your-writes (session consistency)', '"comments must never appear before the post they reply to" → causal consistency', '"two users must never both get the last item" → linearizable / compare-and-set', '"it is fine if followers see a new tweet a few seconds late" → eventual consistency', '"refreshing the page should never show older data" → monotonic reads', '"reads from replicas", "replication lag" → ask which session guarantees you need'],
    viz: {
      title: 'Same timeline, five consistency models',
      input: 'eventual',
      inputLabel: 'Model: eventual | ryw | monotonic | causal | linearizable',
      gen: function (input) {
        var m = String(input || 'eventual').trim().toLowerCase();
        var ok = ['eventual', 'ryw', 'monotonic', 'causal', 'linearizable'];
        if (ok.indexOf(m) < 0) throw new Error('Type one of: eventual, ryw, monotonic, causal, linearizable');
        var nodes = [box('L', 'Leader', 50, 10), box('F1', 'Follower F1', 18, 55), box('F2', 'Follower F2', 82, 55)];
        var rep = { L: { x: '0', y: '-' }, F1: { x: '0', y: '-' }, F2: { x: '0', y: '-' } };
        var log = [];
        function state() { return { type: 'table', label: 'Replica contents', columns: ['replica', 'x (post)', 'y (reply)'], rows: [['Leader', rep.L.x, rep.L.y], ['F1', rep.F1.x, rep.F1.y], ['F2', rep.F2.x, rep.F2.y]] }; }
        function logT(h) { return { type: 'table', label: 'Reads so far (' + m + ')', columns: ['time', 'who', 'served by', 'saw', 'verdict'], rows: log.map(function (r) { return r.slice(); }), hl: h || {} }; }
        function gr(hl, edges, ehl, tags) { return { type: 'graph', label: 'Leader + 2 async followers', height: 70, directed: true, nodes: nodes, edges: edges || [['L', 'F1', 'replicate'], ['L', 'F2', 'replicate']], hl: hl || {}, ehl: ehl || {}, tags: tags || {} }; }
        var f = [];
        f.push({ narr: 'Start: every replica has <b>x = 0</b> and no reply y. Replication from the leader to the followers is <b>asynchronous</b> and F2 is slow for x. Model chosen: <b>' + m + '</b>.', parts: [gr(), state()] });
        rep.L.x = '1';
        f.push({ narr: 't1: <b>Alice</b> writes <b>x = 1</b> ("I got the job!") to the leader. Followers do not have it yet.', parts: [gr({ L: 'ok' }, null, {}, { L: 'x=1' }), state()] });
        // t2 Alice reads
        var a2 = (m === 'eventual' || m === 'monotonic') ? ['t2', 'Alice', 'F1', 'x=0', '<span class="c-r">stale own write</span>'] : ['t2', 'Alice', m === 'linearizable' ? 'Leader' : 'Leader (F1 too old for her token)', 'x=1', '<span class="c-g">ok</span>'];
        log.push(a2);
        var why2 = m === 'eventual' ? 'Eventual: any replica will do, the load balancer picks F1, and F1 still says 0. Alice thinks her post vanished — allowed under eventual consistency.' : m === 'monotonic' ? 'Monotonic reads only protects against going <i>backwards</i>; it says nothing about your own writes, so F1 returning 0 is allowed.' : m === 'linearizable' ? 'Linearizable: reads go to the leader (holding a valid lease) or a quorum, so Alice sees 1.' : 'Alice\'s session carries a token "I wrote version 1". F1 is at version 0, so the router sends her to the leader. She sees her own post.';
        f.push({ narr: 't2: Alice refreshes. ' + why2, parts: [gr({ F1: a2[2] === 'F1' ? 'bad' : '', L: a2[2] !== 'F1' ? 'ok' : '' }), state(), logT({ 0: a2[3] === 'x=0' ? 'bad' : 'ok' })] });
        rep.F1.x = '1';
        f.push({ narr: 't3: F1 receives x = 1 through replication. F2 still has x = 0 (it is lagging).', parts: [gr({ F1: 'ok' }, null, { 'L-F1': 'ok' }), state(), logT()] });
        log.push(['t4', 'Bob', 'F1', 'x=1', '<span class="c-g">ok</span>']);
        f.push({ narr: 't4: <b>Bob</b> reads from F1 and sees x = 1. Bob\'s session now remembers "I have seen version 1".', parts: [gr({ F1: 'ok' }), state(), logT({ 1: 'ok' })] });
        var b5;
        if (m === 'eventual' || m === 'ryw') b5 = ['t5', 'Bob', 'F2', 'x=0', '<span class="c-r">went back in time</span>'];
        else b5 = ['t5', 'Bob', m === 'linearizable' ? 'Leader' : 'F1 (F2 is behind his token)', 'x=1', '<span class="c-g">ok</span>'];
        log.push(b5);
        f.push({ narr: 't5: Bob refreshes and the balancer picks F2. ' + (b5[3] === 'x=0' ? '<span class="c-r">He saw 1 a moment ago and now sees 0.</span> ' + (m === 'ryw' ? 'Read-your-writes does not help: Bob never wrote anything.' : 'Eventual consistency allows this.') : 'His session token says "seen version 1", so F2 (version 0) is skipped. Monotonic reads holds (causal and linearizable include it).'), parts: [gr({ F2: b5[2] === 'F2' ? 'bad' : '', F1: b5[2].indexOf('F1') === 0 ? 'ok' : '', L: b5[2] === 'Leader' ? 'ok' : '' }), state(), logT({ 2: b5[3] === 'x=0' ? 'bad' : 'ok' })] });
        rep.L.y = 'Congrats!';
        if (m === 'causal') { rep.F2.y = '(held: needs x=1)'; } else { rep.F2.y = 'Congrats!'; }
        f.push({ narr: 't6: <b>Carol</b> read x = 1 on F1 and replies y = "Congrats!" (written to the leader). The reply replicates to F2 on a fast path, <b>before</b> the old post x = 1 arrives there. ' + (m === 'causal' ? 'Causal: y carries the dependency "after x version 1". F2 <b>buffers</b> y until it has x = 1.' : 'F2 applies y immediately — it does not track dependencies.'), parts: [gr({ L: 'ok', F2: m === 'causal' ? 'cur' : 'bad' }, [['L', 'F1', 'replicate'], ['L', 'F2', 'y first']], { 'L-F2': 'cur' }), state(), logT()] });
        var d7;
        if (m === 'causal') d7 = ['t7', 'Dave', 'F2', 'x=0, y=none', '<span class="c-g">old but consistent</span>'];
        else if (m === 'linearizable') d7 = ['t7', 'Dave', 'Leader', 'x=1, y=Congrats!', '<span class="c-g">ok</span>'];
        else d7 = ['t7', 'Dave', 'F2', 'x=0, y=Congrats!', '<span class="c-r">reply before post!</span>'];
        log.push(d7);
        f.push({ narr: 't7: <b>Dave</b> (a brand-new session) reads the thread. ' + (d7[4].indexOf('reply') >= 0 ? '<span class="c-r">He sees "Congrats!" replying to a post that does not exist yet.</span> That is a <b>causality violation</b>; eventual, RYW and monotonic reads all allow it.' : m === 'causal' ? 'He sees an old state (no post, no reply), but it is a state that <i>could have existed</i>. Causal consistency never shows an effect without its cause.' : 'Linearizable: everything is read at the latest point in time.'), parts: [gr({ F2: d7[2] === 'F2' ? (m === 'causal' ? 'ok' : 'bad') : '', L: d7[2] === 'Leader' ? 'ok' : '' }), state(), logT({ 3: d7[4].indexOf('reply') >= 0 ? 'bad' : 'ok' })] });
        rep.F2.x = '1'; rep.F2.y = 'Congrats!';
        f.push({ narr: 't8: x = 1 finally reaches F2' + (m === 'causal' ? ', which releases the buffered reply' : '') + '. All replicas now agree — this convergence is the only thing <b>eventual consistency</b> promises.', parts: [gr({ L: 'ok', F1: 'ok', F2: 'ok' }, null, { 'L-F2': 'ok' }), state(), logT()] });
        var bad = log.filter(function (r) { return r[4].indexOf('c-r') >= 0; }).length;
        f.push({ narr: 'Result for <b>' + m + '</b>: ' + bad + ' anomaly(ies) seen. Try the other models to compare.', parts: [{ type: 'table', label: 'Which anomaly does each model allow?', columns: ['model', 'stale own write (t2)', 'back in time (t5)', 'reply before post (t7)'], rows: [['eventual', 'allowed', 'allowed', 'allowed'], ['ryw', 'prevented', 'allowed', 'allowed'], ['monotonic', 'allowed', 'prevented', 'allowed'], ['causal', 'prevented', 'prevented', 'prevented'], ['linearizable', 'prevented', 'prevented', 'prevented + always newest']], hl: (function () { var h = {}; h[ok.indexOf(m)] = 'sel'; return h; })() }] });
        return f;
      }
    },
    examples: [
      { title: 'Read-your-writes with a version token', html: `<p>On a profile update the server returns <code>version = 42</code>; the client stores it in a cookie. Each read sends <code>min_version=42</code>. The router picks any replica whose applied version ≥ 42, else falls back to the leader. Cheap, scales reads, and kills the "my change disappeared" bug. MongoDB's <i>causally consistent sessions</i> and Cosmos DB's <i>Session</i> level work this way.</p>` },
      { title: 'Is this history linearizable?', html: `${H.table(['Client', 'Operation', 'Real time'], [['A', 'write x=1', '0 – 10 ms'], ['B', 'read x → 1', '5 – 8 ms'], ['C', 'read x → 0', '12 – 15 ms']])}<p>B's read overlaps the write, so returning 1 is fine (the write may take effect at ms 6). But C starts <b>after</b> the write finished and also after B saw 1, yet C sees 0 → ${H.c('r', 'NOT linearizable')}. Under eventual or causal (if C has no dependency on B) it would be allowed.</p>` },
      { title: 'Eventual is often the right answer', html: `<p>A "like" counter on a post: if one viewer sees 1,204 likes and another 1,207 for a few seconds, nobody is hurt. Making it linearizable would put a global round trip on every like at 100k likes/s. Use eventual consistency (or a CRDT counter) and spend your consistency budget on payments.</p>` },
      { title: 'Choosing a model per feature (social app)', html: `${H.table(['Feature', 'Model'], [['Change password / privacy setting', 'linearizable (security!)'], ['Edit my own post and view it', 'read-your-writes'], ['Comment threads', 'causal'], ['Follower counts, view counts', 'eventual'], ['Username uniqueness', 'linearizable (compare-and-set)']])}` }
    ],
    deepDive: `<p><b>Formal-ish definitions.</b> <i>Linearizability</i> (Herlihy &amp; Wing 1990): there is a total order of all operations, consistent with real time (if op1 ends before op2 starts, op1 is ordered first), and each read returns the latest write in that order. It is <b>composable</b> (per-object linearizability implies the whole system is) and is what you need for locks, leader election and uniqueness checks. <i>Sequential consistency</i> (Lamport 1979) drops the real-time part: one total order that respects each process's program order. <i>Causal consistency</i> orders only operations related by Lamport's happens-before (same process order, read-from, transitivity); concurrent writes may appear in different orders on different replicas.</p>
<p><b>Causal is the strongest model that stays available during partitions</b> (Mahajan, Alvisi, Dahlin — "Consistency, Availability, Convergence", 2011). That is why systems like COPS, Eiger, and MongoDB causal sessions target it. Implementation: attach dependencies (vector clocks or explicit dependency lists) to each write; a replica delays applying a write until its dependencies are visible.</p>
<p><b>How linearizable reads are actually served:</b> (1) read through the Raft/Paxos log (slow), (2) <b>ReadIndex</b> — the leader confirms it is still leader with a heartbeat round, then serves locally, (3) <b>leader leases</b> — the leader serves locally while its time-bound lease is valid (depends on bounded clock drift), (4) Spanner uses TrueTime timestamps so snapshot reads at a safe time can be served from any up-to-date replica.</p>
<p><b>Bounded staleness</b> sits between eventual and strong: "reads are at most 5 seconds or 100 versions behind". It is easy to explain to product managers and easy to monitor (replication lag). <b>Consistent prefix</b> guarantees you never see writes out of order (you see some prefix of the history). Jepsen (jepsen.io) has tested dozens of databases and found many that claimed a model they did not provide — always read the fine print.</p>`,
    aiEra: `<p><b>What AI changes:</b> LLM coding assistants frequently generate "read after write" code that reads from a replica pool, introducing the stale-own-write bug invisibly — it passes every local test because local dev has one database. <b>Use AI as a partner:</b> paste your read/write paths and ask <code>For each endpoint, which consistency anomaly (stale own write, time travel, causality violation, lost update) can a user observe if replicas lag by 2 s?</code>. Ask it to write a deterministic test that injects replica lag.</p>
<p><b>AI products need these models:</b> a chat app's conversation history must be at least <b>causal</b> (the assistant's reply must never appear before the user's question), and an agent that writes a memory then immediately reads it back needs <b>read-your-writes</b> or it will "forget" what it just learned. RAG indexes are usually <b>eventual</b> (a new document becomes searchable after indexing lag) — the UI should say "indexing..." instead of pretending. <b>What you must still own:</b> naming the exact model per feature and explaining the cost in latency and availability.</p>`,
    problems: [{
      title: 'Fix the "My Comment Disappeared" Bug',
      level: 'Medium', tags: ['consistency models', 'read-your-writes', 'replication'], companies: ['Meta', 'LinkedIn', 'Reddit'],
      statement: `<p>A forum uses one primary database and 5 asynchronous read replicas behind a load balancer. Replication lag is usually 100 ms but spikes to 5 s. Users complain: (a) after posting a comment and being redirected, the comment is missing; (b) sometimes refreshing shows <b>fewer</b> comments than a second ago. Design a fix that keeps reads on replicas as much as possible.</p>`,
      constraints: `<p>50k reads/s, 2k writes/s. The primary can handle at most 10k reads/s. Users may be logged in on several devices.</p>`,
      example: `<p>Alice posts at t=0 (primary LSN 900). Redirect read at t=0.05 s hits replica R3 at LSN 870 → ${H.c('r', 'comment missing')}. With the fix, the read carries <code>min_lsn=900</code>; R3 is skipped; R1 (LSN 905) serves it → ${H.c('g', 'comment shown')}.</p>`,
      brute: { why: `<p><b>Naive fix 1:</b> send every read to the primary — 50k reads/s overwhelms a primary rated for 10k. <b>Naive fix 2:</b> make replication synchronous — every write waits for all 5 replicas, latency spikes, and one slow replica blocks all writes. <b>Naive fix 3:</b> "read from primary for 10 s after a write" in a server-side sticky cookie — works for one device but breaks across devices and wastes primary capacity.</p>` },
      mcq: { q: 'Bug (b) — seeing fewer comments after refreshing — is a violation of which guarantee?', options: ['Monotonic reads', 'Read-your-writes', 'Linearizability only', 'Durability'], answer: 0, explain: 'Seeing an older state after a newer one means reads went backwards in time: monotonic reads.' },
      hints: [`<p>Every write on the primary has a position in the replication log (Postgres LSN, MySQL GTID). Replicas know how far they have applied.</p>`, `<p>Give the client a token = the highest log position it has written <i>or</i> seen. Route reads only to replicas at or beyond that token.</p>`, `<p>Store the token per user (not per device) for cross-device read-your-writes; add a fallback to the primary with a timeout so a lagging fleet does not break reads.</p>`],
      solution: {
        approach: `<p><b>Design: session tokens based on replication position.</b></p>
<ol><li>On every write, the API returns the primary's commit position (e.g. Postgres <code>pg_current_wal_lsn()</code> after commit). The client stores <code>last_seen_lsn</code> (cookie or local storage); for cross-device, also store it in a small per-user key in Redis.</li>
<li>On every read, the client sends <code>min_lsn = max(cookie, user key)</code>. The data-access layer keeps a cached table of each replica's applied LSN (refreshed every 50–100 ms via <code>pg_last_wal_replay_lsn()</code>).</li>
<li>The router chooses a random replica with <code>applied_lsn ≥ min_lsn</code> → fixes (a) read-your-writes.</li>
<li>Each read response returns the replica's applied LSN; the client raises <code>last_seen_lsn</code> to it. Future reads require at least that → fixes (b) monotonic reads.</li>
<li>If no replica qualifies, wait up to ~200 ms for one to catch up (many drivers support "wait for LSN"), then fall back to the primary. Rate-limit primary fallbacks and alert on replication lag.</li></ol>
<p>Only users who just wrote (~2k/s) or who hit a lag spike touch the primary, so primary read load stays well under 10k/s. This is exactly the session-consistency approach used by Cosmos DB session tokens and MongoDB causally consistent sessions.</p>`,
        complexity: `<p>O(replicas) routing check per read (or O(1) with a sorted list). Extra state: one integer per session/user. Primary read load ≈ write rate + lag-spike fallbacks.</p>`,
        followUps: ['How do you add causal consistency so replies never appear before the parent comment for other users?', 'What changes if replicas are in another region with 80 ms lag?']
      }
    }]
  });

  /* =====================================================================
     TOPIC 3 — Quorums R + W > N
     ===================================================================== */
  topics.push({
    title: 'Quorums: Why R + W > N Gives You Fresh Reads',
    analogy: `<p>A teacher gives the same homework update to <b>5 class representatives</b>, but only has time to tell <b>3</b> of them. Later a student wants to know the latest homework, and asks <b>3</b> representatives. Since 3 + 3 = 6 is more than 5, at least <b>one</b> of the people asked must be one who heard the update. The student just believes whichever answer has the <b>newest date</b> on it. That overlap trick is the whole idea of quorums.</p>`,
    explain: `<p>In a <b>leaderless</b> (Dynamo-style) store such as Cassandra, Riak, ScyllaDB or DynamoDB internals, every key is stored on <b>N</b> replicas. A client (or a coordinator node) sends each write to all N but waits for only <b>W</b> acknowledgements; it sends each read to replicas and waits for <b>R</b> answers, then takes the value with the highest version.</p>
${H.kv([['N', 'replication factor — copies of each key (commonly 3)'], ['W', 'write quorum — acks needed before "write OK"'], ['R', 'read quorum — answers needed before returning']], { label: 'Three knobs' })}
<p><b>The rule:</b> if <code>R + W &gt; N</code>, every read set overlaps every write set in at least <code>R + W − N</code> replicas, so a read always touches at least one replica that has the latest acknowledged write. With N = 3, W = 2, R = 2 → overlap = 1. This is the classic "QUORUM/QUORUM" setting.</p>
${H.table(['N', 'W', 'R', 'R+W&gt;N?', 'Behaviour'], [['3', '2', '2', '<span class="c-g">yes</span>', 'balanced: tolerate 1 down node for reads and writes'], ['3', '3', '1', '<span class="c-g">yes</span>', 'fast reads, but any one node down blocks writes'], ['3', '1', '3', '<span class="c-g">yes</span>', 'fast writes, any one node down blocks reads'], ['3', '1', '1', '<span class="c-r">no</span>', 'fastest and most available; reads may be stale'], ['5', '3', '3', '<span class="c-g">yes</span>', 'tolerate 2 failures for both']])}
<p><b>Fault tolerance:</b> writes survive <code>N − W</code> unavailable replicas; reads survive <code>N − R</code>. Latency: you wait for the W-th (or R-th) fastest replica, not the slowest — a big win for tail latency.</p>
<p><b>Also needed:</b> <code>W &gt; N/2</code> prevents two conflicting writes from both reaching a quorum without overlapping each other (useful when versions come from a coordinator). And stale replicas are healed by <b>read repair</b> (the reader writes the newest value back to stale replicas it noticed), <b>hinted handoff</b> (a neighbour holds writes for a down node) and <b>anti-entropy</b> (background Merkle-tree comparison).</p>`,
    clues: ['"tunable consistency", "Cassandra / Dynamo style" → talk N, W, R', '"must tolerate one replica down and still read fresh data" → N=3, W=2, R=2', '"write-heavy, reads can be slightly stale" → small W and R (e.g. W=1, R=1)', '"read-heavy and need fresh reads" → W=N, R=1 (but writes block if a node is down)', '"multi-datacenter with local latency" → LOCAL_QUORUM per DC', '"what if a replica is down during a write?" → hinted handoff / sloppy quorum'],
    viz: [{
      title: 'Quorum overlap: write W, read R out of N',
      input: '5 3 3',
      inputLabel: 'N W R (e.g. 5 3 3 or 3 1 1)',
      gen: function (input) {
        var v = words(input).map(Number);
        if (v.length !== 3 || v.some(function (x) { return !Number.isInteger(x); })) throw new Error('Enter three integers: N W R, e.g. 5 3 3');
        var N = v[0], W = v[1], R = v[2];
        if (N < 1 || N > 9) throw new Error('N must be 1..9');
        if (W < 1 || W > N || R < 1 || R > N) throw new Error('W and R must be between 1 and N');
        var ver = []; for (var i = 0; i < N; i++) ver.push(1);
        function nodes() { var a = [box('C', 'Coordinator', 50, 8)]; for (var i = 0; i < N; i++) a.push(box('R' + i, 'R' + i + ' v' + ver[i], 6 + i * (88 / Math.max(1, N - 1)), 52)); return a; }
        function edges(set, lbl) { var e = []; set.forEach(function (i) { e.push(['C', 'R' + i, lbl]); }); return e; }
        function tbl(hl, extra) { var rows = []; for (var i = 0; i < N; i++) rows.push(['R' + i, 'v' + ver[i], extra ? extra(i) : '']); return { type: 'table', label: 'Replica versions', columns: ['replica', 'version', 'note'], rows: rows, hl: hl || {} }; }
        var f = [];
        f.push({ narr: 'Every replica holds <b>v1</b> of key k. Settings: N = ' + N + ', W = ' + W + ', R = ' + R + '. R + W = ' + (R + W) + (R + W > N ? ' &gt; ' : ' ≤ ') + N + '.', parts: [{ type: 'graph', label: 'Key k on N = ' + N + ' replicas', height: 64, directed: true, nodes: nodes(), edges: [] }, tbl()] });
        var wset = []; for (var a = 0; a < W; a++) wset.push(a);
        var all = []; for (var b = 0; b < N; b++) all.push(b);
        f.push({ narr: 'Client writes <b>v2</b>. The coordinator sends it to all ' + N + ' replicas but only waits for <b>' + W + '</b> acks.', parts: [{ type: 'graph', label: 'Write v2 sent to all', height: 64, directed: true, nodes: nodes(), edges: edges(all, 'v2'), hl: { C: 'cur' } }, tbl()] });
        wset.forEach(function (i) { ver[i] = 2; });
        var hlw = { C: 'ok' }, ehw = {}; wset.forEach(function (i) { hlw['R' + i] = 'ok'; ehw['C-R' + i] = 'ok'; });
        var hlt = {}; wset.forEach(function (i) { hlt[i] = 'ok'; });
        f.push({ narr: 'The first ' + W + ' replicas (R0..R' + (W - 1) + ') ack → the write is reported <b>successful</b>. The other ' + (N - W) + ' are slow, down or partitioned and still hold v1. A write could survive ' + (N - W) + ' failed replica(s).', parts: [{ type: 'graph', label: 'W = ' + W + ' acks received', height: 64, directed: true, nodes: nodes(), edges: edges(wset, 'ack'), hl: hlw, ehl: ehw }, tbl(hlt, function (i) { return i < W ? 'acked v2' : 'still v1'; })] });
        // worst case read: pick the last R replicas (least overlap)
        var rset = []; for (var c = N - R; c < N; c++) rset.push(c);
        var overlap = rset.filter(function (i) { return i < W; });
        var hlr = { C: 'cur' }, ehr = {};
        rset.forEach(function (i) { hlr['R' + i] = overlap.indexOf(i) >= 0 ? 'sel' : 'win'; ehr['C-R' + i] = overlap.indexOf(i) >= 0 ? 'ok' : 'cur'; });
        f.push({ narr: 'A read asks <b>' + R + '</b> replicas. Worst case (adversary picks the most stale ones): R' + (N - R) + '..R' + (N - 1) + '. Overlap with the write set = <b>' + overlap.length + '</b> replica(s)' + (overlap.length ? ' (purple).' : '.') + ' Formula: max(0, R + W − N) = ' + Math.max(0, R + W - N) + '.', parts: [{ type: 'graph', label: 'Read contacts R = ' + R, height: 64, directed: true, nodes: nodes(), edges: edges(rset, 'read'), hl: hlr, ehl: ehr }, tbl((function () { var h = {}; rset.forEach(function (i) { h[i] = overlap.indexOf(i) >= 0 ? 'sel' : 'win'; }); return h; })(), function (i) { return rset.indexOf(i) >= 0 ? (i < W ? 'read: v2' : 'read: v1') : ''; })] });
        var answers = rset.map(function (i) { return ver[i]; });
        var best = Math.max.apply(null, answers);
        if (best === 2) {
          f.push({ narr: 'Answers: [' + answers.map(function (x) { return 'v' + x; }).join(', ') + ']. The coordinator returns the <b>highest version, v2</b>. <span class="c-g">Fresh read guaranteed</span> because R + W &gt; N.', parts: [{ type: 'array', label: 'Versions returned', values: answers.map(function (x) { return 'v' + x; }), hl: (function () { var h = {}; answers.forEach(function (x, k) { h[k] = x === 2 ? 'ok' : 'bad'; }); return h; })() }, { type: 'vars', label: 'Read result', vals: { returned: 'v2', stale_replicas_seen: answers.filter(function (x) { return x === 1; }).length }, hl: { returned: 'ok' } }] });
          var stale = rset.filter(function (i) { return ver[i] === 1; });
          stale.forEach(function (i) { ver[i] = 2; });
          var h2 = {}; stale.forEach(function (i) { h2['R' + i] = 'ok'; });
          f.push({ narr: stale.length ? '<b>Read repair:</b> the coordinator noticed ' + stale.length + ' stale replica(s) in its read set and writes v2 back to them. The system heals as a side effect of reads.' : 'No stale replica in the read set, so nothing to repair. Background anti-entropy will fix the rest.', parts: [{ type: 'graph', label: 'Read repair', height: 64, directed: true, nodes: nodes(), edges: edges(stale, 'repair v2'), hl: h2 }, tbl()] });
        } else {
          f.push({ narr: 'Answers: [' + answers.map(function (x) { return 'v' + x; }).join(', ') + ']. <span class="c-r">Every replica asked is stale</span> — the read returns <b>v1</b> although v2 was acknowledged. That is what R + W ≤ N allows.', parts: [{ type: 'array', label: 'Versions returned', values: answers.map(function (x) { return 'v' + x; }), hl: (function () { var h = {}; answers.forEach(function (x, k) { h[k] = 'bad'; }); return h; })() }, { type: 'vars', label: 'Read result', vals: { returned: 'v1 (stale)', overlap: 0 }, hl: { returned: 'bad' } }] });
          f.push({ narr: 'Stale data is not forever: hinted handoff, read repair and anti-entropy will push v2 everywhere. This is <b>eventual</b> consistency — cheaper and more available, but not fresh.', parts: [tbl()] });
        }
        f.push({ narr: 'Scorecard for N = ' + N + ', W = ' + W + ', R = ' + R + '.', parts: [{ type: 'table', label: 'Trade-offs', columns: ['metric', 'value'], rows: [['R + W &gt; N (overlapping)', R + W > N ? 'yes' : 'no'], ['min overlap', String(Math.max(0, R + W - N))], ['W &gt; N/2 (writes overlap each other)', W * 2 > N ? 'yes' : 'no'], ['write survives failures', String(N - W)], ['read survives failures', String(N - R)], ['write waits for', W + '-th fastest replica'], ['read waits for', R + '-th fastest replica']], hl: { 0: R + W > N ? 'ok' : 'bad' } }] });
        return f;
      }
    }],
    examples: [
      { title: 'Pick quorums for N = 3, must survive 1 failure, fresh reads', html: `<p>Need N − W ≥ 1 → W ≤ 2, and N − R ≥ 1 → R ≤ 2, and R + W ≥ 4. Only <b>W = 2, R = 2</b> fits. That is Cassandra's QUORUM / QUORUM with RF = 3.</p>` },
      { title: 'Read-heavy catalog, N = 5', html: `<p>99% reads. Choose <b>R = 1, W = 5</b>? Reads hit one node (fast) but writes fail if any node is down. Better: <b>R = 2, W = 4</b> → overlap 1, writes survive 1 failure, reads survive 3, and reads only wait for the 2nd fastest replica.</p>${H.table(['W', 'R', 'overlap', 'write tolerates', 'read tolerates'], [['5', '1', '1', '0', '4'], ['4', '2', '1', '1', '3'], ['3', '3', '1', '2', '2']])}` },
      { title: 'Multi-region: LOCAL_QUORUM vs EACH_QUORUM', html: `<p>RF = 3 in each of 2 regions (N = 6). <code>LOCAL_QUORUM</code> waits for 2 of the 3 local replicas — fast (~2 ms) and fresh <i>within that region</i>, but a reader in the other region may be stale. <code>EACH_QUORUM</code> waits for 2 in every region — globally fresh but pays the cross-region RTT (~80 ms). Classic PACELC trade-off expressed as quorums.</p>` },
      { title: 'Sloppy quorum surprise', html: `<p>DynamoDB-style "sloppy quorum": if 2 of the 3 home replicas for key k are down, the write lands on 2 <b>other</b> nodes holding hints. W = 2 was "satisfied", but a read from the home replicas (R = 2) may not overlap at all → ${H.c('r', 'stale read despite R + W &gt; N')}. Sloppy quorums trade freshness for write availability.</p>` }
    ],
    deepDive: `<p><b>Quorums are not linearizability.</b> Even with R + W &gt; N, anomalies remain: (1) a write that fails (fewer than W acks) is not rolled back on the replicas that got it, so later reads may or may not see it; (2) concurrent reads during an in-flight write can see new then old (reader A hits the replica that already has v2, reader B a bit later reads a quorum without it) — fixed only by <b>synchronous read repair</b> before returning (ABD algorithm, Attiya-Bar-Noy-Dolev 1995); (3) <b>last-write-wins</b> with skewed clocks can discard a newer write; (4) sloppy quorums and hinted handoff break the overlap guarantee.</p>
<p><b>Probabilistically bounded staleness (PBS, Bailis et al. 2012):</b> even with R + W ≤ N, most reads are fresh because replication is fast. Measurements on LinkedIn/Yammer workloads showed N=3, R=W=1 returned the latest value in the vast majority of reads within a few milliseconds of the write. So "R = W = 1" is a reasonable choice when stale is acceptable — just be honest that it is eventual.</p>
<p><b>Latency maths:</b> waiting for the k-th fastest of N responses cuts tail latency. If each replica has p99 = 50 ms independently, waiting for 2 of 3 has a much lower p99 than waiting for all 3. <b>Speculative retry</b> (Cassandra) sends an extra read to another replica if one is slower than its p99.</p>
<p><b>Quorums beyond majority:</b> Flexible Paxos (Howard 2016) shows consensus only needs leader-election quorums to intersect replication quorums, not majorities everywhere — the same R + W &gt; N idea applied to consensus. Grid quorums and weighted votes (Gifford 1979, the original quorum paper) generalise further.</p>`,
    aiEra: `<p><b>What AI changes:</b> ask an assistant "make my Cassandra reads consistent" and it will often suggest <code>ALL</code> — correct but brittle (one node down = errors). <b>Use AI as a partner:</b> give it your RF, regions, failure budget and latency SLO, and ask it to enumerate every (W, R) pair with overlap, failure tolerance and expected latency — a perfect job for a quick table, which you then sanity-check with the formulas above. Ask it to write a chaos test: kill one replica, write at QUORUM, read at QUORUM, assert freshness.</p>
<p><b>Where AI goes wrong:</b> it repeats "R + W &gt; N means strong consistency" — you now know about failed writes, sloppy quorums and LWW clock skew. <b>AI systems use quorums too:</b> distributed vector stores (Milvus, Weaviate, Cassandra-based vector search) expose replication and consistency levels; evaluating an agent's stale-memory risk is the same N/W/R exercise. <b>What you must still own:</b> choosing numbers from requirements and explaining what can still go wrong.</p>`,
    problems: [{
      title: 'Choose N, W, R for Three Workloads',
      level: 'Medium', tags: ['quorum', 'Cassandra', 'trade-offs'], companies: ['Apple', 'Netflix', 'Uber'],
      statement: `<p>You run a Dynamo-style store with N = 5 replicas per key. Pick W and R for: (A) a <b>user session store</b> — 90% reads, a stale read logs the user out; must survive 2 node failures for reads and 1 for writes. (B) a <b>metrics ingestion</b> table — 99% writes, dashboards may lag; writes must survive 4 failures. (C) a <b>feature-flag config</b> — rare writes, millions of reads, reads must be fresh and survive 4 failures. Justify each with overlap and tolerance numbers.</p>`,
      constraints: `<p>1 ≤ W, R ≤ 5. Overlap = R + W − 5. Write tolerance = 5 − W. Read tolerance = 5 − R.</p>`,
      example: `<p>Session store: try W = 4, R = 2 → overlap ${H.c('g', '1')}, reads tolerate ${H.c('g', '3 ≥ 2')}, writes tolerate ${H.c('g', '1 ≥ 1')} ✔. W = 3, R = 3 also works (overlap 1, both tolerate 2), with slower reads.</p>`,
      brute: { why: `<p>The naive design uses one setting for everything — e.g. <b>ALL/ONE</b> or <b>QUORUM/QUORUM</b> globally. ALL writes fail the moment one of 5 nodes reboots; QUORUM reads on a 99%-read config table waste 3× the read capacity; and ONE/ONE on sessions causes random logouts. Each workload has different "what is worse: error or stale?" answers.</p>` },
      mcq: { q: 'Config must be fresh and reads must survive 4 of 5 nodes down. What must R and W be?', options: ['R = 1, W = 5', 'R = 3, W = 3', 'R = 1, W = 1', 'R = 5, W = 1'], answer: 0, explain: 'Read tolerance 4 ⇒ R = 1. Freshness ⇒ R + W > 5 ⇒ W = 5 (writes are rare, so blocking them during failures is acceptable).' },
      hints: [`<p>Turn each requirement into an inequality: tolerance gives an upper bound on W or R, freshness gives R + W ≥ N + 1.</p>`, `<p>For B, ask: is freshness even required? If not, the overlap rule does not apply and you can choose the smallest W.</p>`, `<p>Among valid choices, prefer the one that waits for fewer replicas on the <i>dominant</i> operation (reads or writes).</p>`],
      solution: {
        approach: `<p><b>(A) Session store:</b> need R ≤ 3 (survive 2), W ≤ 4 (survive 1), R + W ≥ 6. Options: (W=4, R=2) or (W=3, R=3). Reads dominate (90%), so choose <b>W = 4, R = 2</b>: each read waits only for the 2nd fastest replica, overlap = 1, writes still survive 1 failure.</p>
<p><b>(B) Metrics ingestion:</b> writes must survive 4 failures → <b>W = 1</b>. Dashboards may lag, so freshness is not required: <b>R = 1</b> (or R = 2 for slightly better freshness). R + W ≤ N is fine here — it is eventual consistency, healed by hinted handoff and anti-entropy. Use idempotent/commutative writes (counters as CRDTs or append-only points) so duplicates and reordering do not matter.</p>
<p><b>(C) Feature flags:</b> reads survive 4 failures → <b>R = 1</b>; fresh → W ≥ 5 → <b>W = 5</b>. A flag write fails if any replica is down — acceptable because writes are rare and can be retried by an operator; add a hinted retry queue. Even better in practice: serve flags from a CP config store (etcd) with client-side caching and push updates.</p>
<p>State the caveats: QUORUM-style freshness assumes no sloppy quorum and versions that are not broken by clock skew (prefer server-assigned versions or vector clocks over client wall-clock LWW).</p>`,
        complexity: `<p>Read latency ≈ R-th fastest replica response; write latency ≈ W-th fastest. Network messages per op = N (sent) with W or R awaited.</p>`,
        followUps: ['How would you implement "fresh within a region" for a 2-region deployment?', 'What does a failed write (only 2 of 4 required acks) leave behind, and how do readers deal with it?']
      }
    }]
  });

  /* =====================================================================
     TOPIC 4 — Vector clocks
     ===================================================================== */
  topics.push({
    title: 'Logical Time: Lamport Clocks and Vector Clocks',
    analogy: `<p>Three friends edit a shared trip plan offline, each keeping a <b>tally card</b> with one column per friend: "how many edits by Asha, by Ben, by Chen do I know about?". When they meet, they compare cards. If Ben's card is <b>at least as big in every column</b> as Asha's, Ben has seen everything Asha did — Ben's version is newer. If Asha is ahead in one column and Ben in another, they each changed something the other never saw: a <b>real conflict</b> that a human must merge. That tally card is a vector clock.</p>`,
    explain: `<p><b>Why not just use timestamps?</b> Server clocks drift (tens of ms, sometimes seconds; NTP jumps backwards). With last-write-wins on wall-clock time, a write that truly happened later can be thrown away because its server's clock was behind. We need <b>logical</b> time that captures "could A have influenced B?" — Lamport's <b>happens-before</b> relation (→): a → b if a came before b in the same process, or a is a send and b the matching receive, or by chaining.</p>
<p><b>Lamport clock</b> (one integer): increment on each event; on send attach it; on receive set <code>clock = max(local, received) + 1</code>. Guarantee: a → b ⇒ L(a) &lt; L(b). But the reverse is <b>not</b> true: L(a) &lt; L(b) does not tell you whether a caused b or they were concurrent.</p>
<p><b>Vector clock</b> (one counter per process, Fidge/Mattern 1988):</p>
<ol>
<li>Local event at process i: <code>V[i] += 1</code>.</li>
<li>Send: do a local event, attach a copy of V.</li>
<li>Receive message with vector M at process i: <code>V[k] = max(V[k], M[k])</code> for every k, then <code>V[i] += 1</code>.</li>
</ol>
${H.table(['Compare V and W', 'Meaning'], [['V[k] ≤ W[k] for all k, and V ≠ W', '<span class="c-g">V happened-before W</span> (W has seen V)'], ['W[k] ≤ V[k] for all k, and V ≠ W', '<span class="c-g">W happened-before V</span>'], ['V == W', 'same event / same version'], ['some k with V[k] &gt; W[k] AND some j with V[j] &lt; W[j]', '<span class="c-r">concurrent</span> — neither saw the other → conflict']])}
<p>Example with processes A, B, C: <code>[2,1,0]</code> vs <code>[2,2,0]</code> → first ≤ second everywhere → happened-before. <code>[2,0,0]</code> vs <code>[1,0,1]</code> → A is ahead in column A, C ahead in column C → ${H.c('r', 'concurrent')}.</p>
<p><b>In databases</b> (Dynamo, Riak) the "processes" are the replicas (or coordinators) that accept writes, and the vector is called a <b>version vector</b>. When a read finds two concurrent versions, the store returns both as <b>siblings</b>; the app merges them (e.g. union of shopping carts) and writes back with a vector that dominates both.</p>`,
    clues: ['"detect conflicting concurrent updates" → vector / version vectors', '"clocks on servers are not synchronised" → logical clocks instead of timestamps', '"offline editing, sync later" → version vectors + merge (or CRDTs)', '"did event A cause event B?" → happens-before; Lamport clock alone cannot answer "no"', '"last-write-wins loses data" → keep siblings detected by vector clocks', '"order messages consistently across nodes" → Lamport timestamps with node-id tie-break'],
    code: [{ lang: 'java', title: 'VectorClock with compare (Java)', code: `import java.util.*;

// A vector clock keyed by node id. Missing entries count as 0.
class VectorClock {
    enum Order { BEFORE, AFTER, EQUAL, CONCURRENT }

    private final Map<String, Integer> v = new TreeMap<>();

    // Local event (or a send): bump our own counter.
    void tick(String node) {
        v.merge(node, 1, Integer::sum);
    }

    // Receive: element-wise max with the incoming clock, then tick.
    void receive(String node, VectorClock msg) {
        for (Map.Entry<String, Integer> e : msg.v.entrySet()) {
            v.merge(e.getKey(), e.getValue(), Math::max);
        }
        tick(node);
    }

    VectorClock copy() {
        VectorClock c = new VectorClock();
        c.v.putAll(v);
        return c;
    }

    // Compare this clock with another one.
    Order compare(VectorClock o) {
        boolean less = false, greater = false;
        Set<String> keys = new TreeSet<>(v.keySet());
        keys.addAll(o.v.keySet());
        for (String k : keys) {
            int a = v.getOrDefault(k, 0), b = o.v.getOrDefault(k, 0);
            if (a < b) less = true;
            if (a > b) greater = true;
        }
        if (less && greater) return Order.CONCURRENT;   // each saw something the other did not
        if (less) return Order.BEFORE;                  // this happened-before o
        if (greater) return Order.AFTER;
        return Order.EQUAL;
    }

    @Override public String toString() { return v.toString(); }
}

class VectorClockDemo {
    public static void main(String[] args) {
        VectorClock a = new VectorClock(), b = new VectorClock(), c = new VectorClock();
        a.tick("A");                 // A writes x=1        A={A=1}
        VectorClock m = a.copy();    // A sends to B
        b.receive("B", m);           // B={A=1, B=1}
        b.tick("B");                 // B edits             B={A=1, B=2}
        c.tick("C");                 // C edits on its own  C={C=1}
        System.out.println("a vs b: " + a.compare(b));   // BEFORE
        System.out.println("b vs c: " + b.compare(c));   // CONCURRENT
        System.out.println("b vs a: " + b.compare(a));   // AFTER
    }
}` }, { lang: 'python', run: true, title: 'Vector clocks + sibling merge (runnable Python)', code: `def compare(v, w):
    """Return 'before', 'after', 'equal' or 'concurrent' for two dict clocks."""
    keys = set(v) | set(w)
    less = any(v.get(k, 0) < w.get(k, 0) for k in keys)
    greater = any(v.get(k, 0) > w.get(k, 0) for k in keys)
    if less and greater:
        return "concurrent"
    if less:
        return "before"
    if greater:
        return "after"
    return "equal"


def merge(v, w):
    """Element-wise max: a clock that has seen everything both have seen."""
    return {k: max(v.get(k, 0), w.get(k, 0)) for k in set(v) | set(w)}


# Dynamo-paper style shopping-cart history (replicas Sx, Sy, Sz)
d1 = {"Sx": 1}                    # write handled by Sx
d2 = {"Sx": 2}                    # overwrite handled by Sx
d3 = {"Sx": 2, "Sy": 1}           # client A updates via Sy
d4 = {"Sx": 2, "Sz": 1}           # client B updates via Sz (never saw d3)

print("d1 vs d2:", compare(d1, d2))   # before -> d2 can replace d1
print("d3 vs d4:", compare(d3, d4))   # concurrent -> keep both as siblings

cart3, cart4 = {"book"}, {"pen"}
merged_cart = cart3 | cart4           # application-level merge (union)
d5 = merge(d3, d4)
d5["Sx"] += 1                         # the merged write is coordinated by Sx
print("merged cart:", sorted(merged_cart), "clock:", dict(sorted(d5.items())))
print("d5 vs d3:", compare(d5, d3), "| d5 vs d4:", compare(d5, d4))
` }],
    codeTitle: ['Java', 'Python'],
    viz: {
      title: 'Vector clocks updating event by event',
      input: 'A, A>B, B, C, C>B, B>A, A, C',
      inputLabel: 'Events: X = local event, X>Y = X sends to Y (processes A-D)',
      gen: function (input) {
        var toks = String(input || '').split(',').map(function (s) { return s.trim().toUpperCase(); }).filter(function (s) { return s.length; });
        if (!toks.length) throw new Error('Enter events like: A, A>B, B, C>A');
        if (toks.length > 16) throw new Error('Use at most 16 events');
        var procs = [];
        toks.forEach(function (t) {
          if (!/^[A-D](>[A-D])?$/.test(t)) throw new Error('Bad event "' + t + '". Use A, B, C, D or A>B');
          t.split('>').forEach(function (p) { if (procs.indexOf(p) < 0) procs.push(p); });
          if (t.length === 3 && t[0] === t[2]) throw new Error('A process cannot send to itself: ' + t);
        });
        procs.sort();
        if (procs.length < 2) procs = procs[0] === 'A' ? ['A', 'B'] : ['A', procs[0]];
        var V = {}; procs.forEach(function (p) { V[p] = procs.map(function () { return 0; }); });
        var rows = [], evs = [];
        function vstr(a) { return '[' + a.join(',') + ']'; }
        function cur() { var o = {}; procs.forEach(function (p) { o[p] = vstr(V[p]); }); return o; }
        var f = [];
        f.push({ narr: 'Processes ' + procs.join(', ') + ' each start with an all-zero vector (one slot per process, order ' + procs.join(',') + ').', parts: [{ type: 'vars', label: 'Current clock of each process', vals: cur() }, { type: 'table', label: 'Event log', columns: ['#', 'process', 'event', 'vector after'], rows: [['-', '-', 'start', '-']] }] });
        toks.forEach(function (t, n) {
          var p = t[0], i = procs.indexOf(p);
          if (t.length === 1) {
            V[p][i]++;
            rows.push(['e' + (n + 1), p, 'local', vstr(V[p])]); evs.push({ id: 'e' + (n + 1) + '@' + p, v: V[p].slice() });
            var hv = {}; hv[p] = 'ok';
            f.push({ narr: '<b>' + p + '</b> does a local event: bump its own slot ' + p + ' → ' + vstr(V[p]) + '.', parts: [{ type: 'vars', label: 'Current clocks', vals: cur(), hl: hv }, { type: 'table', label: 'Event log', columns: ['#', 'process', 'event', 'vector after'], rows: rows.map(function (r) { return r.slice(); }), hl: (function () { var h = {}; h[rows.length - 1] = 'ok'; return h; })() }] });
          } else {
            var q = t[2], j = procs.indexOf(q);
            V[p][i]++;
            var msg = V[p].slice();
            rows.push(['e' + (n + 1) + 's', p, 'send to ' + q, vstr(msg)]); evs.push({ id: 'send ' + p + '>' + q, v: msg.slice() });
            var before = V[q].slice();
            for (var k = 0; k < procs.length; k++) V[q][k] = Math.max(V[q][k], msg[k]);
            V[q][j]++;
            rows.push(['e' + (n + 1) + 'r', q, 'recv from ' + p, vstr(V[q])]); evs.push({ id: 'recv ' + q + '<' + p, v: V[q].slice() });
            var hv2 = {}; hv2[p] = 'cur'; hv2[q] = 'ok';
            f.push({ narr: '<b>' + p + ' sends to ' + q + '</b>: ' + p + ' ticks its slot and attaches ' + vstr(msg) + '. ' + q + ' takes element-wise max(' + vstr(before) + ', ' + vstr(msg) + ') then ticks its own slot → <b>' + vstr(V[q]) + '</b>. Now ' + q + ' "knows" everything ' + p + ' had seen.', parts: [{ type: 'graph', label: 'Message', height: 30, directed: true, nodes: [box(p, p + ' ' + vstr(msg), 20, 15), box(q, q + ' ' + vstr(V[q]), 80, 15)], edges: [[p, q, vstr(msg)]], ehl: (function () { var e = {}; e[p + '-' + q] = 'ok'; return e; })() }, { type: 'vars', label: 'Current clocks', vals: cur(), hl: hv2 }, { type: 'table', label: 'Event log', columns: ['#', 'process', 'event', 'vector after'], rows: rows.map(function (r) { return r.slice(); }), hl: (function () { var h = {}; h[rows.length - 2] = 'win'; h[rows.length - 1] = 'ok'; return h; })() }] });
          }
        });
        function cmp(a, b) { var l = false, g = false; for (var k = 0; k < a.length; k++) { if (a[k] < b[k]) l = true; if (a[k] > b[k]) g = true; } return l && g ? 'concurrent' : l ? 'happened-before' : g ? 'happened-after' : 'equal'; }
        // compare final clocks of every pair of processes
        var cr = [], hl = {};
        for (var x = 0; x < procs.length; x++) for (var y = x + 1; y < procs.length; y++) {
          var r = cmp(V[procs[x]], V[procs[y]]);
          if (r === 'concurrent') hl[cr.length] = 'bad'; else hl[cr.length] = 'ok';
          cr.push([procs[x] + ' ' + vstr(V[procs[x]]), procs[y] + ' ' + vstr(V[procs[y]]), r]);
        }
        f.push({ narr: 'Compare the <b>latest state</b> of each pair of processes. Concurrent pairs (red) each saw something the other did not — if they wrote the same key, that is a <b>true conflict</b>.', parts: [{ type: 'table', label: 'Pairwise comparison of final clocks', columns: ['left', 'right', 'relation'], rows: cr, hl: hl }] });
        // concurrency across all recorded events: count
        var conc = 0, pairs = 0, sample = null;
        for (var a1 = 0; a1 < evs.length; a1++) for (var b1 = a1 + 1; b1 < evs.length; b1++) { pairs++; if (cmp(evs[a1].v, evs[b1].v) === 'concurrent') { conc++; if (!sample) sample = [evs[a1], evs[b1]]; } }
        f.push({ narr: 'Across all ' + evs.length + ' recorded events there are ' + pairs + ' pairs; <b>' + conc + '</b> are concurrent.' + (sample ? ' Example: ' + sample[0].id + ' ' + vstr(sample[0].v) + ' vs ' + sample[1].id + ' ' + vstr(sample[1].v) + ' — each is bigger in some slot.' : ' Every pair is causally ordered.'), parts: [{ type: 'bars', label: 'Ordered vs concurrent event pairs', values: [pairs - conc, conc], idxLabels: ['ordered', 'concurrent'], hl: { 1: 'bad' } }, { type: 'text', html: 'Rule: V &lt; W if every slot ≤ and at least one &lt;. If neither V ≤ W nor W ≤ V → concurrent.' }] });
        return f;
      }
    },
    examples: [
      { title: 'Lamport clock cannot detect concurrency', html: `<p>A does one local event (L=1). C does two local events (L=1, L=2). L(A's event) = 1 &lt; 2, yet the events are <b>unrelated</b>. Vector clocks: [1,0,0] vs [0,0,2] → ${H.c('r', 'concurrent')}. Lamport clocks are still useful for a <b>total order</b> (tie-break by node id) — e.g. in mutual exclusion or for ordering log entries.</p>` },
      { title: 'Dynamo shopping cart siblings', html: `${H.table(['Version', 'Vector', 'Cart', 'Relation'], [['D1', '[Sx:1]', '{book}', ''], ['D2', '[Sx:2]', '{book, lamp}', 'D1 → D2: replace'], ['D3', '[Sx:2, Sy:1]', '{book, lamp, pen}', 'D2 → D3'], ['D4', '[Sx:2, Sz:1]', '{book}', 'D2 → D4'], ['D3 vs D4', '', '', '<span class="c-r">concurrent → siblings</span>'], ['D5 (merge)', '[Sx:3, Sy:1, Sz:1]', '{book, lamp, pen}', 'dominates both']])}<p>Union merge never loses an add, but a removed item can come back. That is why Riak later moved to CRDTs (OR-Set) for carts.</p>` },
      { title: 'Comparing by hand', html: `<p>${H.table(['V', 'W', 'Check', 'Result'], [['[3,1,0]', '[3,2,0]', 'all ≤, one &lt;', 'V → W'], ['[1,4,2]', '[2,3,2]', 'slot 1: 1 &lt; 2, slot 2: 4 &gt; 3', 'concurrent'], ['[0,0,5]', '[0,0,5]', 'all equal', 'same'], ['[2,2,2]', '[1,2,2]', 'all ≥, one &gt;', 'W → V']])}</p>` },
      { title: 'Why wall-clock LWW loses data', html: `<p>Server P's clock is 300 ms fast. User writes x="draft" on P at real time 10:00:00.000 (stamped 10:00:00.300). 100 ms later the user writes x="final" on Q (stamped 10:00:00.100). LWW keeps <b>"draft"</b> — ${H.c('r', 'the newer write is silently lost')}. A vector clock would show draft → final (Q had seen draft) and keep "final".</p>` }
    ],
    deepDive: `<p><b>Correctness property:</b> vector clocks <i>characterise</i> causality exactly: a → b ⇔ V(a) &lt; V(b). Lamport clocks give only one direction. The price is size: O(number of processes) per message/version. With thousands of clients as "processes" the vector explodes, so databases key the vector by <b>server/replica</b> (version vectors) rather than client — but then two clients writing through the same server can produce false "happened-before" and lose updates. Riak's fix is <b>dotted version vectors</b> (Preguiça et al.), which tag each sibling with the exact (server, counter) "dot" that created it.</p>
<p><b>Pruning:</b> Dynamo truncated the vector when it exceeded ~10 entries (dropping the oldest by a wall-clock timestamp per entry), accepting rare false conflicts. <b>Interval tree clocks</b> handle dynamic numbers of participants by splitting and joining identity intervals.</p>
<p><b>Hybrid Logical Clocks (HLC, Kulkarni 2014):</b> 64-bit timestamps = physical time + logical counter. They stay close to wall clock (good for humans and snapshot reads) while preserving happens-before like a Lamport clock. Used by CockroachDB, YugabyteDB, MongoDB's cluster time. Spanner instead uses <b>TrueTime</b> intervals with bounded uncertainty (GPS + atomic clocks) and waits out the uncertainty on commit.</p>
<p><b>Vector clocks vs CRDTs:</b> vector clocks <i>detect</i> conflicts and hand them to the application; CRDTs (G-Counter, PN-Counter, OR-Set, LWW-Register, RGA for text) <i>avoid</i> them by making merges commutative, associative and idempotent — and internally they often use version vectors themselves. Collaborative editors (Figma-like, Automerge, Yjs) are built on this idea.</p>`,
    aiEra: `<p><b>What AI changes:</b> generating a vector-clock class takes seconds; the bugs AI typically leaves are subtle — forgetting to tick after the max on receive, comparing only the keys of one map (missing entries must count as 0), or treating "not before" as "after". Always ask it for property tests: <code>random histories; assert compare(a,b)=="before" iff a is an ancestor in the message DAG</code>.</p>
<p><b>Where it shows up in AI systems:</b> multi-agent systems where several agents edit a shared plan or memory concurrently need exactly this — detect that two agents' edits were concurrent and merge (or ask a model to merge semantically, then record a dominating vector). Offline-first AI note apps sync with CRDTs. <b>What you must still own:</b> knowing when a conflict is real (concurrent) versus an ordinary overwrite, choosing the merge policy, and explaining why timestamps alone lose data.</p>`,
    problems: [{
      title: 'Detect Concurrent Writes with Vector Clocks',
      level: 'Medium', tags: ['vector clocks', 'conflict detection', 'Dynamo'], companies: ['Amazon', 'Riak/Basho', 'Atlassian'],
      lang: 'python',
      statement: `<p>A key-value replica stores a list of <b>siblings</b> (value, vector clock). Implement <code>put(siblings, new_value, new_clock)</code>: drop every sibling the new write <b>dominates</b> (happened-before it), ignore the new write if an existing sibling dominates or equals it, otherwise keep it alongside the remaining concurrent siblings. Clocks are dicts like <code>{"A": 2, "B": 1}</code>.</p>`,
      constraints: `<p>Up to 50 siblings, up to 20 node ids per clock. Missing keys mean 0.</p>`,
      example: `<p>Siblings: [("pen", {A:2,B:1}), ("cup", {A:1,C:1})]. put("book", {A:2,B:1,C:1}) → it dominates both → result ${H.c('g', '[("book", {A:2,B:1,C:1})]')}. put("lamp", {A:3}) instead → dominates neither ({A:3} vs {A:2,B:1}: A bigger, B smaller) → ${H.c('r', '3 siblings')}.</p>`,
      brute: { why: `<p>Naive: keep only the write with the latest wall-clock timestamp (LWW). It is O(1) and simple but silently discards concurrent updates and even newer updates when clocks are skewed. Another naive approach — keep every version forever — never loses data but grows without bound and forces the app to merge versions that were already superseded.</p>`, code: { lang: 'python', code: `def put_lww(current, new_value, new_ts):
    # current = (value, ts) or None ; keeps only the latest timestamp
    if current is None or new_ts >= current[1]:
        return (new_value, new_ts)
    return current   # concurrent or newer-but-skewed writes are lost
` } },
      mcq: { q: 'Existing sibling {A:2,B:1}. New write {A:2,B:1}. What should put do?', options: ['Ignore it (equal clock = already stored version)', 'Add it as a new sibling', 'Replace all siblings', 'Throw a conflict error'], answer: 0, explain: 'An equal vector means the same version; storing it again would create a duplicate sibling.' },
      hints: [`<p>Write <code>compare(v, w)</code> first, returning before / after / equal / concurrent using the union of keys with default 0.</p>`, `<p>One pass over siblings: if any sibling is after-or-equal the new clock, the new write is obsolete — return siblings unchanged. Otherwise keep only siblings that are concurrent with the new clock.</p>`, `<p>Edge cases: empty sibling list (just store it), clocks with disjoint keys (concurrent), and a write that dominates some siblings but is concurrent with others (drop the dominated ones only).</p>`],
      solution: {
        approach: `<p>Compare the new clock with each sibling. Three outcomes: the sibling <b>happened-before</b> the new write → it is superseded, drop it; the sibling is <b>after or equal</b> → the new write is stale, return the list unchanged; <b>concurrent</b> → keep the sibling. Finally append the new write. This is how Riak/Dynamo resolve versions on the replica, leaving true conflicts for the application (or a CRDT) to merge on read.</p>`,
        code: { lang: 'python', run: true, code: `def compare(v, w):
    keys = set(v) | set(w)
    less = any(v.get(k, 0) < w.get(k, 0) for k in keys)
    greater = any(v.get(k, 0) > w.get(k, 0) for k in keys)
    if less and greater:
        return "concurrent"
    if less:
        return "before"
    if greater:
        return "after"
    return "equal"


def put(siblings, new_value, new_clock):
    kept = []
    for value, clock in siblings:
        rel = compare(clock, new_clock)
        if rel in ("after", "equal"):
            return siblings            # new write is obsolete
        if rel == "concurrent":
            kept.append((value, clock))
        # rel == "before": superseded, drop it
    kept.append((new_value, new_clock))
    return kept


s = [("pen", {"A": 2, "B": 1}), ("cup", {"A": 1, "C": 1})]
print(put(s, "book", {"A": 2, "B": 1, "C": 1}))   # one sibling: book
print(len(put(s, "lamp", {"A": 3})))               # 3 siblings: all concurrent
print(put(s, "old", {"A": 1}) == s)                # True: obsolete write ignored
` },
        alt: [{ lang: 'java', code: `import java.util.*;

class SiblingStore {
    record Version(String value, Map<String, Integer> clock) {}

    static String compare(Map<String, Integer> v, Map<String, Integer> w) {
        Set<String> keys = new HashSet<>(v.keySet());
        keys.addAll(w.keySet());
        boolean less = false, greater = false;
        for (String k : keys) {
            int a = v.getOrDefault(k, 0), b = w.getOrDefault(k, 0);
            if (a < b) less = true;
            if (a > b) greater = true;
        }
        if (less && greater) return "concurrent";
        if (less) return "before";
        if (greater) return "after";
        return "equal";
    }

    static List<Version> put(List<Version> siblings, Version nw) {
        List<Version> kept = new ArrayList<>();
        for (Version s : siblings) {
            String rel = compare(s.clock(), nw.clock());
            if (rel.equals("after") || rel.equals("equal")) return siblings; // stale write
            if (rel.equals("concurrent")) kept.add(s);                       // keep conflict
        }
        kept.add(nw);
        return kept;
    }
}` }],
        dry: { head: ['sibling', 'its clock', 'new {A:3}', 'action'], rows: [['pen', '{A:2,B:1}', 'A: 2&lt;3, B: 1&gt;0', '<span class="c-r">concurrent → keep</span>'], ['cup', '{A:1,C:1}', 'A: 1&lt;3, C: 1&gt;0', '<span class="c-r">concurrent → keep</span>'], ['lamp', '{A:3}', 'appended', '3 siblings']] },
        complexity: `<p>O(S · K) per put for S siblings and K node ids. Space O(S · K).</p>`,
        followUps: ['How does the client produce a clock that dominates all siblings after merging?', 'Why do Riak\'s dotted version vectors avoid sibling explosion?']
      }
    }]
  });

  /* =====================================================================
     TOPIC 5 — Gossip protocols
     ===================================================================== */
  topics.push({
    title: 'Gossip Protocols: Spreading News Like a Rumour',
    analogy: `<p>Office gossip is frighteningly efficient. One person tells two random colleagues at the coffee machine. Each of them tells two more on their next coffee break, and so on. Nobody is "in charge", nobody keeps a list of who knows, and if one person is off sick the news simply goes around them. In a few coffee breaks <b>the whole building knows</b>. Distributed systems copy exactly this trick to share membership lists, health and data.</p>`,
    explain: `<p>A <b>gossip</b> (or <b>epidemic</b>) protocol works in rounds. Every T seconds (say 1 s), each node picks <b>k random peers</b> (the <b>fanout</b>, often 1–3) and exchanges what it knows. Information spreads like an infection:</p>
${H.table(['Round', 'Infected (fanout 2, ideal)', 'Out of 1,000'], [['0', '1', '0.1%'], ['1', '3', '0.3%'], ['2', '9', '0.9%'], ['3', '27', '2.7%'], ['5', '~240', '24%'], ['7', '~1,000', '~100%']])}
<p>The number of rounds to reach everyone grows like <b>O(log N)</b>: 1,000 nodes take about 7–10 rounds, 1,000,000 nodes only about twice that. Each node sends only k messages per round, so load per node is <b>constant</b> no matter how big the cluster gets.</p>
<p><b>Three styles:</b></p>
<ul>
<li><b>Push</b>: infected nodes send the news to random peers. Fast at the start, slow at the end (most targets already know).</li>
<li><b>Pull</b>: every node asks a random peer "anything new?". Slow at the start, very fast at the end.</li>
<li><b>Push-pull</b>: both in one exchange — the fastest; about log₃ N + O(ln ln N) rounds.</li>
</ul>
<p><b>Two jobs gossip does in real systems:</b></p>
${H.kv([['Rumour mongering', 'spread a new fact (node X joined, schema changed); stop after it seems old'], ['Anti-entropy', 'periodically compare full state with a random peer (often via Merkle trees) and repair differences — guarantees eventual convergence']], { label: 'Gossip flavours' })}
<p><b>Where you meet it:</b> Cassandra and ScyllaDB (cluster membership, token ownership, load info every second), Consul and Serf (SWIM-based membership), Amazon S3/DynamoDB internals, Redis Cluster's cluster bus, Bitcoin/Ethereum block propagation, CRDT replication, HashiCorp Nomad. Advantages: no single point of failure, scales to thousands of nodes, tolerates message loss. Costs: only <b>probabilistic</b> and <b>eventual</b> delivery; redundant messages; slow tail when the last few nodes are unlucky.</p>`,
    clues: ['"thousands of nodes, no central coordinator" → gossip for membership/state', '"how does every Cassandra node know the ring?" → gossip every second', '"eventually all nodes learn about a failure" → gossip-based dissemination', '"constant per-node overhead as the cluster grows" → gossip (O(log N) rounds)', '"repair replicas that drifted apart" → anti-entropy with Merkle trees', '"peer-to-peer / blockchain broadcast" → gossip / epidemic broadcast'],
    viz: {
      title: 'Gossip infection spreading round by round',
      input: '16 2 7',
      inputLabel: 'nodes fanout seed (nodes 4-24, fanout 1-4)',
      gen: function (input) {
        var v = words(input).map(Number);
        if (v.length < 2 || v.some(function (x) { return !Number.isInteger(x); })) throw new Error('Enter: nodes fanout seed, e.g. 16 2 7');
        var N = v[0], K = v[1], seed = v.length > 2 ? v[2] : 1;
        if (N < 4 || N > 24) throw new Error('nodes must be 4..24');
        if (K < 1 || K > 4) throw new Error('fanout must be 1..4');
        var s = (Math.abs(seed) % 2147483646) + 1;
        function rnd() { s = (s * 48271) % 2147483647; return s / 2147483647; }
        var nodes = [];
        for (var i = 0; i < N; i++) {
          var ang = 2 * Math.PI * i / N - Math.PI / 2;
          nodes.push({ id: 'n' + i, label: String(i), x: Math.round(50 + 44 * Math.cos(ang)), y: Math.round(40 + 34 * Math.sin(ang)) });
        }
        var inf = [true]; for (var j = 1; j < N; j++) inf.push(false);
        var counts = [1], f = [], msgs = 0;
        function hlOf(newSet) { var h = {}; for (var q = 0; q < N; q++) { if (newSet && newSet.indexOf(q) >= 0) h['n' + q] = 'cur'; else if (inf[q]) h['n' + q] = 'ok'; } return h; }
        f.push({ narr: 'Round 0: only node <b>0</b> knows the news (e.g. "node 9 has left"). Every round, each informed node pushes to <b>' + K + '</b> random peer(s).', parts: [{ type: 'graph', label: N + ' nodes, push gossip, fanout ' + K, height: 80, nodes: nodes, edges: [], hl: hlOf() }, { type: 'bars', label: 'Informed nodes per round', values: counts.slice() }] });
        var round = 0;
        while (counts[counts.length - 1] < N && round < 30) {
          round++;
          var edges = [], ehl = {}, newly = [], dup = 0, senders = [];
          for (var a = 0; a < N; a++) if (inf[a]) senders.push(a);
          senders.forEach(function (a) {
            for (var t = 0; t < K; t++) {
              var b = Math.floor(rnd() * (N - 1)); if (b >= a) b++;
              msgs++;
              edges.push(['n' + a, 'n' + b]);
              if (!inf[b] && newly.indexOf(b) < 0) { newly.push(b); ehl['n' + a + '-n' + b] = 'ok'; }
              else { dup++; ehl['n' + a + '-n' + b] = 'done'; }
            }
          });
          newly.forEach(function (b) { inf[b] = true; });
          var c = 0; for (var z = 0; z < N; z++) if (inf[z]) c++;
          counts.push(c);
          f.push({ narr: 'Round ' + round + ': ' + senders.length + ' informed node(s) send ' + (senders.length * K) + ' message(s). <b>' + newly.length + '</b> new node(s) learn the news (amber); ' + dup + ' message(s) were wasted on nodes that already knew. Informed: <b>' + c + '/' + N + '</b>.', parts: [{ type: 'graph', label: 'Round ' + round, height: 80, directed: true, nodes: nodes, edges: edges.length > 60 ? edges.slice(0, 60) : edges, hl: hlOf(newly), ehl: ehl }, { type: 'bars', label: 'Informed nodes per round', values: counts.slice(), hl: (function () { var h = {}; h[counts.length - 1] = 'cur'; return h; })() }] });
        }
        var lg = Math.log(N) / Math.log(2);
        f.push({ narr: (counts[counts.length - 1] === N ? 'Everyone knows after <b>' + round + '</b> rounds' : 'Stopped after ' + round + ' rounds') + ' — compare log₂ ' + N + ' ≈ ' + lg.toFixed(1) + '. Total messages: ' + msgs + ' (vs ' + (N - 1) + ' for a perfect broadcast). Gossip pays some redundancy for having no coordinator and surviving lost messages. Change the seed to see a different random spread.', parts: [{ type: 'table', label: 'Summary', columns: ['metric', 'value'], rows: [['nodes', String(N)], ['fanout', String(K)], ['rounds to full spread', String(round)], ['log₂ N', lg.toFixed(1)], ['messages sent', String(msgs)], ['messages per node per round', String(K)]], hl: { 2: 'sel' } }, { type: 'bars', label: 'S-curve of infection', values: counts.slice() }] });
        return f;
      }
    },
    examples: [
      { title: 'Cassandra gossip in practice', html: `<p>Every second, each Cassandra node picks up to 3 peers (one live, maybe one unreachable, maybe a seed) and runs a 3-message <b>SYN → ACK → ACK2</b> exchange. It sends digests (endpoint, generation, max version) first; the peer replies with what is newer on its side and asks for what it is missing. Each node's state includes its status (NORMAL, LEAVING), tokens, schema version and load. Generation (boot time) + version numbers let newer info always win.</p>` },
      { title: 'How many rounds for 5,000 nodes?', html: `<p>Push only, fanout 1: roughly log₂ 5000 + ln 5000 ≈ 12.3 + 8.5 ≈ 21 rounds; with fanout 3 about log₄ 5000 ≈ 6–8 rounds. At 1 round per second, a membership change reaches everyone in under 10 seconds while each node sends only 3 small messages per second.</p>${H.table(['N', 'log₂ N', 'rounds (fanout 2, rough)'], [['100', '6.6', '~6'], ['5,000', '12.3', '~10'], ['1,000,000', '19.9', '~16']])}` },
      { title: 'Anti-entropy with Merkle trees', html: `<p>Two replicas each hold 10 million keys. Instead of sending all keys, each builds a Merkle tree (hash of hashes over key ranges). They compare roots: equal → done. Different → compare children and descend only into mismatched ranges. If only 20 keys differ, they exchange ~20 small ranges rather than 10 million rows. Cassandra's <code>nodetool repair</code> and Dynamo use exactly this.</p>` },
      { title: 'Why the last few nodes are slow', html: `<p>With push gossip, when 90% already know, a random push hits an unaware node only 10% of the time — so the "tail" takes many rounds. Pull flips this: each unaware node asks a random peer, who almost surely knows. Hence <b>push-pull</b> is preferred, and many systems also add a periodic full sync (anti-entropy) to guarantee that no node stays behind forever.</p>` }
    ],
    deepDive: `<p><b>The maths:</b> the classic epidemic model (Demers et al., "Epidemic Algorithms for Replicated Database Maintenance", Xerox PARC 1987) shows push rumour spreading needs about log₂ N + ln N rounds; Karp et al. (2000) proved push-pull spreads in log₃ N + O(ln ln N) rounds with O(N ln ln N) messages. The probability some node never hears the rumour drops exponentially with more rounds, but is never exactly zero — which is why rumour mongering is paired with anti-entropy.</p>
<p><b>Stopping rumours:</b> a node stops spreading after it contacts k peers that already knew (counter-based) or with probability 1/k each time (coin-based). Lower k means fewer messages but more nodes left unaware ("residue"); that residue is cleaned up by anti-entropy.</p>
<p><b>Peer selection matters:</b> uniform random selection needs a full membership list. Large systems use <b>partial views</b> (HyParView, Cyclon) — each node knows only a small random subset, which is itself maintained by gossip. Topology-aware gossip prefers peers in the same rack/DC for most rounds and occasionally crosses regions to save bandwidth. Plumtree builds a spanning tree from gossip for efficient broadcast and falls back to gossip on failures.</p>
<p><b>Security and correctness:</b> plain gossip trusts every peer — a malicious or buggy node can spread bad state everywhere quickly (a real Cassandra failure mode: a corrupted schema version gossiped across the cluster). Mitigations: versioned state where only the owner can bump its own entries, signatures (in blockchains), and validating state before adopting it. Gossip also cannot give <i>agreement</i> on a single decision — for that you need consensus (next module).</p>`,
    aiEra: `<p><b>What AI changes:</b> simulation is now nearly free. Ask an assistant to write a 50-line simulator for push vs pull vs push-pull with message loss, run it for N = 10…100,000, and plot rounds vs N — then check it against the O(log N) theory yourself. Use it to tune fanout and interval for your cluster before production.</p>
<p><b>Gossip in AI infrastructure:</b> large GPU training clusters and inference fleets use gossip-style membership (e.g. Consul/Serf, or custom SWIM) to know which workers are alive; decentralised / federated learning uses <b>gossip averaging</b> where each node averages model weights with random peers and the whole fleet converges to the global average without a parameter server. Multi-agent systems can gossip facts between agents instead of routing everything through one orchestrator. <b>What you must still own:</b> knowing gossip gives eventual, probabilistic spread — never use it alone where you need a single agreed answer.</p>`,
    problems: [{
      title: 'Design Cluster Membership for 5,000 Nodes',
      level: 'Hard', tags: ['gossip', 'membership', 'scalability'], companies: ['Netflix', 'HashiCorp', 'Uber'],
      statement: `<p>Every node in a 5,000-node cache fleet must know which other nodes are alive (to route keys on a consistent-hash ring). Nodes join and leave ~50 times per hour. A dead node must be noticed by everyone within <b>15 seconds</b>. Design the membership/dissemination system. Bandwidth per node must stay under 10 KB/s.</p>`,
      constraints: `<p>N = 5,000, no single coordinator allowed to be a bottleneck, messages may be lost (1%), one AZ may be partitioned.</p>`,
      example: `<p>Node 4711 crashes at t=0. With SWIM-style probing + piggybacked gossip (interval 1 s, fanout 3), it is suspected by its prober within ~2–3 s, confirmed dead after a ~5 s suspicion timeout, and the "dead" update reaches all 5,000 nodes in ~log₃ 5000 ≈ ${H.c('g', '8 rounds')} → total ≈ 15 s.</p>`,
      brute: { why: `<p><b>Naive 1: all-to-all heartbeats.</b> Each node pings all 4,999 others every second → 25 million messages/s cluster-wide and ~5,000 messages/s per node — bandwidth explodes as N². <b>Naive 2: central registry</b> (every node heartbeats a master that broadcasts the list) — the master is a single point of failure and a hot spot sending 5,000 × 5,000 entries on each change.</p>` },
      mcq: { q: 'Why does gossip-based dissemination scale to 5,000 nodes?', options: ['Each node sends a constant number of messages per round and news spreads in O(log N) rounds', 'It uses a leader to broadcast', 'It needs a majority quorum per message', 'It sends every update to every node directly'], answer: 0, explain: 'Constant per-node fanout plus logarithmic rounds is the whole point.' },
      hints: [`<p>Split the problem: (1) <b>detecting</b> a failure (who probes whom) and (2) <b>disseminating</b> the news (how everyone learns).</p>`, `<p>SWIM: each round, ping one random member; if no ack, ask k others to ping it indirectly; then mark suspect, later dead. Piggyback membership updates on these pings instead of separate broadcasts.</p>`, `<p>Budget: messages per node per second = 1 ping + k indirect probes occasionally + piggybacked updates of ~50 bytes each. Check that 15 s covers probe interval + suspicion timeout + log N rounds.</p>`],
      solution: {
        approach: `<p><b>Use SWIM + gossip dissemination (what Consul/Serf/memberlist do).</b></p>
<ol><li><b>Membership list</b> on every node: (node id, address, status ∈ {alive, suspect, dead}, incarnation number). Joining nodes contact any seed and pull the full list once (push-pull state sync); afterwards only deltas travel.</li>
<li><b>Failure detection:</b> every 1 s each node pings one random member (cycling through a shuffled list so each member is probed at least once per N rounds). No ack in 500 ms → send <code>ping-req</code> to k = 3 random members who ping the target for us (avoids blaming the target for <i>our</i> bad link). Still nothing → mark <b>suspect</b> and gossip it.</li>
<li><b>Suspicion:</b> a suspected node that is alive refutes by gossiping "alive" with a higher incarnation number. If not refuted within ~5 s (scaled with log N), it becomes <b>dead</b>.</li>
<li><b>Dissemination:</b> updates are piggybacked on ping/ack messages; each update is retransmitted λ·log N times (≈ 3·log₂ 5000 ≈ 37 sends) and then dropped. Spread ≈ O(log N) rounds ≈ 8–12 s worst case, so detection + spread fits the 15 s budget.</li>
<li><b>Anti-entropy:</b> every 30 s, a full push-pull state sync with one random peer heals anything lost.</li>
<li><b>Bandwidth:</b> ~2 packets/s of ~1.4 KB per node (ping + ack with piggybacked updates) ≈ 3 KB/s, well under 10 KB/s, independent of N.</li>
<li><b>Partitions:</b> an AZ split makes each side declare the other dead; when healed, push-pull sync and incarnation numbers restore "alive". Routing layers should use a short grace period before rebalancing the ring to avoid churn.</li></ol>`,
        complexity: `<p>Per node per second: O(1) messages. Detection time ≈ probe interval + suspicion timeout; dissemination O(log N) rounds. Total cluster load O(N).</p>`,
        followUps: ['How does Lifeguard (HashiCorp) reduce false positives from slow, overloaded nodes?', 'How would you make membership changes trigger consistent-hash rebalancing without thrashing?']
      }
    }]
  });

  /* =====================================================================
     TOPIC 6 — Failure detection
     ===================================================================== */
  topics.push({
    title: 'Failure Detection: Heartbeats, Timeouts, Phi Accrual and SWIM',
    analogy: `<p>Your friend texts "still alive 👍" every evening while trekking. One evening, no text. Is she hurt, or just out of signal behind a mountain, or did her phone die? You <b>cannot know</b>. You wait a bit longer — after one missed text you are <i>a little worried</i>, after three you <i>call the rescue team</i>. Wait too little and you send rescuers for nothing; wait too long and real help arrives late. Every failure detector is this same worried friend.</p>`,
    explain: `<p>In a distributed system, a slow node and a dead node <b>look identical</b> from the outside: you just stop hearing from it. Messages can be delayed, the node may be stuck in a garbage-collection pause, or its network cable may be cut. A <b>failure detector</b> turns silence into a decision: "I suspect node X is dead".</p>
<p><b>Heartbeats + timeout (the classic):</b> each node sends "I am alive" every <b>interval</b> (e.g. 1 s). The monitor records the last heartbeat time. If <code>now − last &gt; timeout</code> (e.g. 3 s), mark the node <b>suspected / dead</b>.</p>
${H.table(['Timeout choice', 'Good', 'Bad'], [['Short (e.g. 1.5× interval)', 'fast detection, quick failover', 'false positives on GC pauses / network blips → needless failovers, split-brain risk'], ['Long (e.g. 10× interval)', 'few false alarms', 'slow detection; users see errors for longer']])}
<p>Two properties describe any detector: <b>completeness</b> (every crashed node is eventually suspected) and <b>accuracy</b> (live nodes are not wrongly suspected). Over an asynchronous network you cannot have perfect accuracy — the theory (Chandra &amp; Toueg 1996) is about "eventually accurate" detectors.</p>
<p><b>Better detectors:</b></p>
<ul>
<li><b>Phi (φ) accrual detector</b> (Hayashibara 2004; used by Cassandra, Akka): instead of yes/no, output a <b>suspicion level</b> φ = −log₁₀(probability that a heartbeat is still this late if the node were alive), using the observed history of heartbeat gaps. φ = 1 means ~10% chance it is a false alarm, φ = 3 means 0.1%, φ = 8 (Cassandra's default threshold) means 10<sup>−8</sup>. It adapts automatically to jittery networks.</li>
<li><b>SWIM</b> (Das, Gupta, Motivala 2002; used by Consul, Serf, memberlist): each round, ping one random member; if no ack, ask k other members to ping it (<b>indirect probe</b>); if still silent, mark <b>suspect</b> and gossip it; the node can refute; otherwise it becomes dead. Per-node load is constant regardless of cluster size.</li>
<li><b>Leases</b>: the leader holds a time-limited lease; if it cannot renew before expiry, it must step down — so "detection" is built into the lease length.</li>
</ul>
<p><b>Detection time ≈ timeout + up to one interval</b> (the crash can happen just after a heartbeat). Run the timeline visualizer to see a GC pause cause a false positive and a real crash get detected.</p>`,
    clues: ['"how do you know a node is down?" → heartbeats + timeout, then phi accrual / SWIM', '"avoid failover on a long GC pause" → longer timeout, phi accrual, or fencing tokens', '"detect failures in a 10,000-node cluster cheaply" → SWIM / gossip-based detection', '"failover within 10 seconds" → derive interval and timeout from this budget', '"network is jittery across regions" → adaptive (phi accrual) instead of a fixed timeout', '"old leader comes back after a pause and keeps writing" → leases + fencing tokens'],
    viz: [{
      title: 'Heartbeat timeline: false positive, then a real crash',
      input: '2.5 4 3 10',
      inputLabel: 'timeout(s) pauseStart pauseLength crashAt (interval is 1 s, timeline 0-15 s)',
      gen: function (input) {
        var v = words(input).map(Number);
        if (v.length !== 4 || v.some(isNaN)) throw new Error('Enter 4 numbers: timeout pauseStart pauseLength crashAt, e.g. 2.5 4 3 10');
        var TO = v[0], ps = Math.round(v[1]), pl = Math.round(v[2]), crash = Math.round(v[3]);
        if (TO < 0.5 || TO > 10) throw new Error('timeout must be 0.5..10 seconds');
        if (pl < 0 || pl > 8 || ps < 1 || ps > 14 || crash < 1 || crash > 15) throw new Error('pauseStart 1..14, pauseLength 0..8, crashAt 1..15');
        var last = 0, rows = [], f = [], status = 'alive', events = [], susSince = -1;
        var g = function (hb, st) {
          var hl = {}; hl.M = 'cur'; hl.B = st === 'alive' ? 'ok' : st === 'suspect' ? 'bad' : 'bad';
          return { type: 'graph', label: 'Node B → Monitor', height: 30, directed: true, nodes: [box('B', 'Node B', 18, 15), box('M', 'Monitor', 82, 15)], edges: hb ? [['B', 'M', 'heartbeat']] : [['B', 'M', '...silence']], hl: hl, ehl: hb ? { 'B-M': 'ok' } : { 'B-M': 'bad' }, tags: { M: st } };
        };
        f.push({ narr: 'Node B sends a heartbeat every <b>1 s</b>. The monitor marks B dead if no heartbeat arrives for more than <b>' + TO + ' s</b>. Planned trouble: a GC pause of ' + pl + ' s starting at t=' + ps + ', and a real crash at t=' + crash + '.', parts: [g(true, 'alive'), { type: 'table', label: 'Timeline', columns: ['t (s)', 'heartbeat?', 'gap since last', 'φ (approx)', 'monitor says'], rows: [['0', 'yes', '0', '0.00', 'alive']] }] });
        rows.push(['0', 'yes', '0', '0.00', 'alive']);
        for (var t = 1; t <= 15; t++) {
          var crashed = t >= crash, paused = t >= ps && t < ps + pl;
          var hb = !crashed && !paused;
          if (hb) last = t;
          var gap = t - last;
          var phi = gap * 0.434; // exponential model with mean interval 1 s: phi = gap / (mean * ln 10)
          var prev = status;
          if (gap > TO) status = 'DEAD'; else status = 'alive';
          var note = '';
          if (prev === 'alive' && status === 'DEAD') { note = crashed ? 'real crash detected' : 'FALSE POSITIVE (B is only paused)'; events.push([String(t), note]); }
          if (prev === 'DEAD' && status === 'alive') { note = 'B is back — it was never dead'; events.push([String(t), note]); }
          rows.push([String(t), hb ? 'yes' : (crashed ? 'no (crashed)' : 'no (GC pause)'), String(gap), phi.toFixed(2), status + (note ? ' — ' + note : '')]);
          var hlr = {}; hlr[rows.length - 1] = status === 'DEAD' ? 'bad' : hb ? 'ok' : 'cur';
          var narr = 't=' + t + ': ' + (hb ? 'heartbeat arrives, gap resets to 0.' : (crashed ? 'B has crashed, no heartbeat.' : 'B is frozen in a GC pause, no heartbeat.')) + ' Gap = ' + gap + ' s' + (gap > TO ? ' &gt; ' : ' ≤ ') + TO + ' s → <b>' + status + '</b>.' + (note ? ' <span class="' + (note.indexOf('FALSE') >= 0 || note.indexOf('never') >= 0 ? 'c-r' : 'c-g') + '">' + note + '</span>' : '');
          f.push({ narr: narr, parts: [g(hb, status), { type: 'table', label: 'Timeline', columns: ['t (s)', 'heartbeat?', 'gap since last', 'φ (approx)', 'monitor says'], rows: rows.map(function (r) { return r.slice(); }), hl: hlr }] });
        }
        var detect = events.filter(function (e) { return e[1] === 'real crash detected'; });
        f.push({ narr: 'Summary. Detection time for the real crash = ' + (detect.length ? (Number(detect[0][0]) - crash) + ' s after it happened (≈ timeout rounded up to the next check)' : 'not reached in this window') + '. Try timeout 3.5 to remove the false positive — and watch detection get slower.', parts: [{ type: 'table', label: 'Decisions taken', columns: ['t', 'event'], rows: events.length ? events : [['-', 'no state changes']], hl: (function () { var h = {}; events.forEach(function (e, i) { h[i] = e[1].indexOf('real') >= 0 ? 'ok' : 'bad'; }); return h; })() }, { type: 'text', html: 'φ here assumes exponentially distributed gaps with mean 1 s: φ = gap ÷ (1 s × ln 10) ≈ 0.434 × gap. Real detectors learn the mean (and variance) from a sliding window of recent gaps.' }] });
        return f;
      }
    }, {
      title: 'SWIM: direct ping, indirect ping-req, suspect, dead',
      gen: function () {
        var N = [box('A', 'A (prober)', 15, 35), box('X', 'X (target)', 85, 35), box('C', 'C', 50, 8), box('D', 'D', 50, 62)];
        function gp(edges, hl, ehl, tags) { return { type: 'graph', label: 'SWIM probe round', height: 70, directed: true, nodes: N, edges: edges, hl: hl || {}, ehl: ehl || {}, tags: tags || {} }; }
        return [
          { narr: 'Each protocol period (say 1 s) node A picks one random member to probe — this time X. Every node does the same, so each member is probed about once per period: constant load per node.', parts: [gp([], { A: 'cur', X: 'win' }), { type: 'vars', label: 'A\'s view of X', vals: { status: 'alive', incarnation: 4 } }] },
          { narr: 'A sends <b>ping</b> to X and waits ~200–500 ms. No ack comes back. Maybe X is dead — or maybe only the A↔X link is bad.', parts: [gp([['A', 'X', 'ping']], { A: 'cur', X: 'bad' }, { 'A-X': 'bad' }, { X: 'no ack' })] },
          { narr: 'Instead of blaming X, A asks k = 2 random members (C, D) to <b>ping-req</b> X on its behalf. This filters out problems on A\'s own network path.', parts: [gp([['A', 'C', 'ping-req X'], ['A', 'D', 'ping-req X'], ['C', 'X', 'ping'], ['D', 'X', 'ping']], { C: 'cur', D: 'cur', X: 'bad' }, { 'A-C': 'cur', 'A-D': 'cur', 'C-X': 'bad', 'D-X': 'bad' })] },
          { narr: 'No indirect ack either. A marks X <b>suspect</b> and piggybacks "X suspect (inc 4)" on its next gossip messages. Not dead yet — suspicion gives X a chance to answer.', parts: [gp([['A', 'C', 'X suspect'], ['A', 'D', 'X suspect']], { X: 'cur', A: 'ok' }, { 'A-C': 'ok', 'A-D': 'ok' }, { X: 'suspect' }), { type: 'vars', label: 'Membership entry for X', vals: { status: 'suspect', incarnation: 4, timer: '5 s' }, hl: { status: 'bad' } }] },
          { narr: 'Case 1: X was only slow. When it hears it is suspected, it <b>refutes</b> by gossiping "X alive, incarnation 5". Higher incarnation beats the suspicion everywhere.', parts: [gp([['X', 'C', 'alive inc 5'], ['X', 'D', 'alive inc 5']], { X: 'ok' }, { 'X-C': 'ok', 'X-D': 'ok' }, { X: 'refuted' }), { type: 'vars', label: 'Membership entry for X', vals: { status: 'alive', incarnation: 5 }, hl: { incarnation: 'ok' } }] },
          { narr: 'Case 2: X really crashed. No refutation before the suspicion timeout → X is declared <b>dead</b> ("confirm") and that fact is gossiped to the whole cluster in O(log N) rounds.', parts: [gp([['A', 'C', 'X dead'], ['A', 'D', 'X dead']], { X: 'bad', A: 'ok', C: 'ok', D: 'ok' }, { 'A-C': 'ok', 'A-D': 'ok' }, { X: 'dead' }), { type: 'table', label: 'Why SWIM scales', columns: ['property', 'heartbeat all-to-all', 'SWIM'], rows: [['messages per node per period', 'N − 1', '~1 ping (+k on failure)'], ['first detection time', 'timeout', '~1 period (expected)'], ['false positives', 'one bad link blames the target', 'indirect probes + suspicion reduce them']], hl: { 0: 'sel' } }] }
        ];
      }
    }],
    examples: [
      { title: 'Deriving timeout from a failover SLO', html: `<p>Requirement: failover in ≤ 10 s. Budget: detection + election + client reconnect. If election takes ~1 s and clients reconnect in ~2 s, detection must be ≤ 7 s. With heartbeat interval 1 s, timeout 5 s → worst-case detection ≈ 6 s. Check against the longest normal GC pause (say p99.99 = 1.5 s) → 5 s gives a good safety margin.</p>` },
      { title: 'Raft election timeouts', html: `<p>Raft followers expect leader heartbeats (empty AppendEntries) every ~50–100 ms. Each follower has a <b>randomised</b> election timeout of 150–300 ms (etcd defaults: heartbeat 100 ms, election 1000 ms). Randomness stops all followers from starting an election at the same time and splitting the vote.</p>${H.kv([['heartbeat-interval', '100 ms'], ['election-timeout', '1000 ms (≥ 10× heartbeat recommended)']], { label: 'etcd defaults' })}` },
      { title: 'Phi accrual with numbers', html: `<p>Heartbeats normally arrive every 1 s (mean). With an exponential model, P(gap &gt; t) = e<sup>−t/1s</sup>. At a gap of 2.3 s: P ≈ 0.10 → φ = 1. At 6.9 s: P ≈ 0.001 → φ = 3. Cassandra convicts at φ = 8 (≈ 18 s with a 1 s mean). On a jittery link where the mean gap is 2 s, the same φ threshold automatically waits twice as long — no manual retuning.</p>` },
      { title: 'False positive → split brain, and the fix', html: `<p>Leader L freezes in a 20 s GC pause. Followers time out and elect L2. L wakes up, still believes it is leader, and writes to storage → ${H.c('r', 'two leaders')}. Fix: <b>fencing tokens</b> — each new leader gets a higher epoch number; storage rejects writes carrying an old epoch. Detection can never be perfect, so correctness must not depend on it.</p>` }
    ],
    deepDive: `<p><b>The impossibility behind it all:</b> FLP (Fischer, Lynch, Paterson 1985) proved deterministic consensus is impossible in a fully asynchronous system with even one crash, precisely because you cannot distinguish "crashed" from "slow". Chandra &amp; Toueg showed that adding an <i>unreliable</i> failure detector with eventual accuracy (◇S / ◇P classes) is enough to solve consensus. That is why practical systems (Raft, Paxos) are safe always but only <b>live</b> when timeouts eventually work.</p>
<p><b>Phi accrual details:</b> keep a sliding window (e.g. last 1,000) of inter-arrival times, estimate mean and variance, and compute φ(now) = −log₁₀(P(next heartbeat later than now − last)). Akka uses a normal distribution with a minimum standard deviation and an "acceptable heartbeat pause" margin; Cassandra uses an exponential approximation. The application, not the detector, picks the threshold — different consumers (routing vs. data repair) can use different thresholds on the same φ.</p>
<p><b>SWIM refinements:</b> round-robin probe order bounds worst-case detection time; incarnation numbers make refutation safe; <b>Lifeguard</b> (HashiCorp 2017) adds "local health awareness" — a node that is itself slow (missing acks it should get) lengthens its own timeouts — cutting false positives by more than 50x in their tests.</p>
<p><b>Gray failures:</b> the hardest real failures are partial — a node passes health checks but its disk is slow or it drops 30% of packets. Defences: health checks that exercise the real path (end-to-end probes), outlier detection on latency/error rates (Envoy's outlier ejection), and quorum-based observations ("3 different clients see this node failing"). <b>Asymmetric partitions</b> (A hears B but B cannot hear A) also defeat naive heartbeats; consensus-based leader checks (pre-vote, check-quorum in Raft) help.</p>`,
    aiEra: `<p><b>What AI changes:</b> AIOps tools now flag "anomalous" nodes from metrics, and assistants can suggest timeout values — but they cannot know your GC pause distribution or network jitter. Feed them real data: <code>Here are 24 h of heartbeat inter-arrival times (p50/p99/p99.99) and our failover SLO; propose interval, timeout and φ threshold, and estimate false positives per day</code>. Then verify with a replay of the data.</p>
<p><b>AI fleets have special failure modes:</b> GPU inference servers can be "alive" (answering health checks) while a model is hung or producing garbage; long-running agent tasks look silent for minutes. Health checks must test the real path (a tiny inference request with a deadline), and orchestrators of AI agents need heartbeats/leases on tasks so a crashed worker's job is reassigned — with idempotency so a slow-but-alive worker does not double-execute. <b>What you must still own:</b> the trade-off between fast detection and false positives, and designing for correctness when the detector is wrong.</p>`,
    problems: [{
      title: 'Tune a Failure Detector for a Database Failover',
      level: 'Hard', tags: ['failure detection', 'heartbeats', 'failover'], companies: ['Stripe', 'Google', 'Microsoft'],
      statement: `<p>A primary-replica database must fail over within <b>15 s</b> of a primary crash. Observed facts: heartbeat RTT p99 = 20 ms, but JVM GC pauses on the primary reach 4 s at p99.99 (a few times a day). Last month a too-aggressive detector caused 6 unnecessary failovers, each costing ~30 s of write unavailability and once a split brain. Design the detection and failover scheme.</p>`,
      constraints: `<p>3 nodes in 3 availability zones. Writes must never be accepted by two primaries at once.</p>`,
      example: `<p>Interval 1 s, timeout 3 s → a 4 s GC pause causes ${H.c('r', 'false failover')}. Interval 1 s, timeout 8 s → GC pause tolerated, real crash detected in ≤ 9 s, election + promotion ~3 s → ${H.c('g', '≈ 12 s ≤ 15 s')}.</p>`,
      brute: { why: `<p>Naive: one monitor process pings the primary with a fixed 2 s timeout and promotes a replica on its own. Problems: the monitor is a single point of failure, a monitor↔primary network blip (not a crash) triggers failover, GC pauses trigger failover, and the old primary may keep accepting writes when it wakes up → split brain and lost data.</p>` },
      mcq: { q: 'What guarantees the paused old primary cannot corrupt data after waking up?', options: ['Fencing with a monotonically increasing epoch checked by storage/replicas', 'A shorter timeout', 'Sending more heartbeats', 'Using UDP instead of TCP'], answer: 0, explain: 'Detection can be wrong; fencing makes stale leaders harmless regardless.' },
      hints: [`<p>Start from the budget: 15 s = detection + election + promotion/redirect. Then choose a timeout bigger than the worst normal pause.</p>`, `<p>Do not let one observer decide. Use a consensus group (the 3 nodes themselves via Raft, or etcd) so a majority must agree the primary is gone.</p>`, `<p>Give the primary a lease shorter than the detection timeout: it must stop accepting writes when its lease expires, and every new primary gets a higher epoch (fencing token).</p>`],
      solution: {
        approach: `<p><b>1. Detection:</b> heartbeat interval 1 s from the primary to both replicas (and to a coordination store like etcd). Use a phi-accrual or fixed timeout of <b>8 s</b> — double the worst observed GC pause — so normal pauses never trigger failover. Worst-case detection ≈ 9 s.</p>
<p><b>2. Agreement, not one observer:</b> failover requires a <b>majority</b> (2 of 3 nodes) to consider the primary dead — e.g. Raft-based replication (like CockroachDB/etcd) or Patroni + etcd for Postgres. A single bad link cannot trigger it; a primary isolated in a minority zone loses the majority.</p>
<p><b>3. Leases on the primary:</b> the primary may accept writes only while holding a lease renewed every 1 s with a 6 s duration (shorter than the 8 s detection timeout, with margin for clock drift). If it pauses or is partitioned, its lease expires <i>before</i> anyone else can be promoted, so it self-demotes on waking.</p>
<p><b>4. Fencing:</b> each promotion increments an <b>epoch</b> stored in the consensus store. Replicas and the storage layer reject replication streams/writes carrying a lower epoch, so even a buggy old primary cannot cause split brain.</p>
<p><b>5. Promotion:</b> pick the replica with the most up-to-date log (synchronous replication to at least one replica so no acknowledged write is lost); redirect clients via service discovery / VIP within ~2–3 s. Total ≈ 9 + 3 ≈ 12 s ≤ 15 s.</p>
<p><b>6. Ops:</b> tune GC (G1/ZGC) to shrink pauses, alert on φ near the threshold, and track false-failover count as an SLI.</p>`,
        complexity: `<p>Detection ≈ timeout + interval (≤ 9 s); messages: O(nodes) heartbeats per second; failover adds one consensus round + promotion time.</p>`,
        followUps: ['What breaks if node clocks drift by 2 s and you rely on leases?', 'How would phi accrual change the design if network jitter doubles at peak hours?']
      }
    }]
  });

  /* =====================================================================
     PRACTICE — Easy
     ===================================================================== */
  practice.push({
    title: 'CP or AP? Four Features of a Food-Delivery App',
    level: 'Easy', tags: ['CAP', 'trade-offs'], companies: ['DoorDash', 'Swiggy', 'Zomato'],
    statement: `<p>For each feature pick CP or AP behaviour during a network partition and give one reason: (1) restaurant menu display, (2) charging the customer's card, (3) live courier location on the map, (4) applying a single-use promo code.</p>`,
    constraints: `<p>Partitions between regions last up to a few minutes. One answer per feature.</p>`,
    example: `<p>Menu display → ${H.c('g', 'AP')}: showing a menu that is 2 minutes old is fine; showing an error loses the order.</p>`,
    brute: { why: `<p>The naive answer picks one choice for the entire app ("we are an AP company" or "always strongly consistent"). All-AP lets a promo code be used twice and may double-charge; all-CP shows error pages for menus and maps during every network blip, which kills conversion for no safety gain.</p>` },
    mcq: { q: 'Which feature most needs CP?', options: ['Single-use promo code redemption', 'Menu display', 'Courier map', 'Restaurant photos'], answer: 0, explain: 'Two partitions both accepting the same single-use code would violate the business rule; refusing is safer.' },
    hints: [`<p>For each feature ask: "what is worse for the business — an error, or a stale/duplicated result?"</p>`, `<p>Things involving money movement or uniqueness rules lean CP. Read-mostly display data leans AP.</p>`, `<p>Location data is overwritten every few seconds, so a stale point is quickly corrected.</p>`],
    solution: {
      approach: `<p><b>(1) Menu → AP.</b> Read-heavy, changes rarely, a stale price can be re-checked at checkout. Serve from replicas/CDN even when cut off from the primary.</p>
<p><b>(2) Card charge → CP</b> (plus idempotency keys). Two sides both charging would double-bill; better to show "payment pending, try again" during a partition. The payment provider call itself is made with an idempotency key so retries are safe.</p>
<p><b>(3) Courier location → AP.</b> Updates every 4 s; last-write-wins on timestamp from the courier device is fine; an old dot on a map is a minor annoyance.</p>
<p><b>(4) Promo code → CP.</b> A single-use code is a uniqueness constraint; it needs a linearizable compare-and-set ("used = false → true") on the code's home partition. If unreachable, checkout proceeds without the discount or waits.</p>`,
      complexity: `<p>Design-level reasoning; CP paths add one quorum/leader round trip (a few ms in-region) to checkout only.</p>`,
      followUps: ['How would you let users still order during the partition if promo validation is unavailable?']
    }
  });

  practice.push({
    title: 'Which Quorum Settings Guarantee Fresh Reads?',
    level: 'Easy', tags: ['quorum', 'R+W>N'], companies: ['Amazon', 'Apple'],
    statement: `<p>For N = 3 and N = 5, decide for each (W, R) pair whether reads are guaranteed to see the latest acknowledged write, and how many replica failures writes and reads each tolerate: (N=3: W=2,R=2; W=1,R=2; W=3,R=1) and (N=5: W=3,R=2; W=3,R=3; W=1,R=5).</p>`,
    constraints: `<p>Strict quorums (no sloppy quorum). Fresh ⇔ R + W &gt; N.</p>`,
    example: `<p>N=3, W=2, R=2: 4 &gt; 3 → ${H.c('g', 'fresh')}; writes tolerate 1, reads tolerate 1.</p>`,
    brute: { why: `<p>The naive approach tests freshness by running reads in a happy-path test cluster where replication is instant — every setting looks "fresh". It hides the worst case where the read set and write set do not overlap, which only appears under load or failures.</p>` },
    mcq: { q: 'N = 5, W = 3, R = 2. Fresh reads guaranteed?', options: ['No, 5 is not greater than 5', 'Yes', 'Only with read repair', 'Only if N is odd'], answer: 0, explain: 'R + W must exceed N strictly; 3 + 2 = 5 leaves room for zero overlap.' },
    hints: [`<p>Overlap = R + W − N. You need an overlap of at least 1 replica for fresh reads.</p>`, `<p>Write tolerance = N − W; read tolerance = N − R.</p>`, `<p>Build a table with columns: N, W, R, overlap, fresh?, write-tolerates, read-tolerates.</p>`],
    solution: {
      approach: `${H.table(['N', 'W', 'R', 'overlap', 'fresh?', 'writes tolerate', 'reads tolerate'], [['3', '2', '2', '1', 'yes', '1', '1'], ['3', '1', '2', '0', 'no', '2', '1'], ['3', '3', '1', '1', 'yes', '0', '2'], ['5', '3', '2', '0', 'no', '2', '3'], ['5', '3', '3', '1', 'yes', '2', '2'], ['5', '1', '5', '1', 'yes', '4', '0']])}<p>Rule of thumb: R + W &gt; N for freshness; the "cost" moves between read availability and write availability. W = N or R = N means zero tolerance on that side — one rebooting node blocks the operation. QUORUM/QUORUM (⌊N/2⌋+1 each) is the balanced default.</p>`,
      complexity: `<p>O(1) per setting. Latency waits for the W-th / R-th fastest replica.</p>`,
      followUps: ['Why is W > N/2 also useful even when R + W > N already holds?']
    }
  });

  practice.push({
    title: 'Compare Vector Clocks by Hand',
    level: 'Easy', tags: ['vector clocks', 'causality'], companies: ['Microsoft', 'Atlassian'],
    lang: 'python',
    statement: `<p>Processes order (A, B, C). Classify each pair as happened-before, happened-after, equal, or concurrent: (1) [1,2,0] vs [1,3,0], (2) [2,0,1] vs [1,1,1], (3) [0,4,2] vs [0,4,2], (4) [3,1,4] vs [2,1,4], (5) [1,0,0] vs [0,0,1]. Then write a <code>compare</code> function.</p>`,
    constraints: `<p>Vectors have equal length (missing slots are 0).</p>`,
    example: `<p>[1,2,0] vs [1,3,0]: every slot ≤ and slot B is smaller → ${H.c('g', 'happened-before')}.</p>`,
    brute: { why: `<p>Naive: compare the <b>sums</b> of the vectors (or a single Lamport number). Sums throw away <i>which</i> process did the work, so they cannot tell concurrency from order: [2,0,1] and [1,1,1] both sum to 3 yet are concurrent, [1,0,0] (sum 1) vs [0,0,1] (sum 1) look "equal" but are concurrent, and [2,0,0] vs [0,0,3] look ordered but are concurrent.</p>`, code: { lang: 'python', code: `def compare_by_sum(v, w):
    # WRONG: loses which process did what
    return "before" if sum(v) < sum(w) else "after" if sum(v) > sum(w) else "equal"
` } },
    mcq: { q: '[2,0,1] vs [1,1,1] is…', options: ['Concurrent', 'Happened-before', 'Happened-after', 'Equal'], answer: 0, explain: 'Slot A: 2 > 1, slot B: 0 < 1 → each is ahead somewhere → concurrent.' },
    hints: [`<p>Track two flags while scanning slots: "some slot smaller" and "some slot bigger".</p>`, `<p>Both flags → concurrent; only smaller → before; only bigger → after; neither → equal.</p>`, `<p>Answers: before, concurrent, equal, after, concurrent.</p>`],
    solution: {
      approach: `<p>Scan slot by slot. (1) [1,2,0] ≤ [1,3,0] → <b>before</b>. (2) A bigger, B smaller → <b>concurrent</b>. (3) identical → <b>equal</b>. (4) A: 3 &gt; 2, others equal → <b>after</b>. (5) A bigger in left, C bigger in right → <b>concurrent</b>. The function below does this in O(k).</p>`,
      code: { lang: 'python', run: true, code: `def compare(v, w):
    less = any(a < b for a, b in zip(v, w))
    greater = any(a > b for a, b in zip(v, w))
    if less and greater:
        return "concurrent"
    return "before" if less else "after" if greater else "equal"


pairs = [([1, 2, 0], [1, 3, 0]), ([2, 0, 1], [1, 1, 1]), ([0, 4, 2], [0, 4, 2]),
         ([3, 1, 4], [2, 1, 4]), ([1, 0, 0], [0, 0, 1])]
for v, w in pairs:
    print(v, w, compare(v, w))
` },
      complexity: `<p>O(k) time for k processes, O(1) extra space.</p>`,
      followUps: ['How would you compare clocks stored as sparse maps with different keys?']
    }
  });

  practice.push({
    title: 'Name the Consistency Anomaly',
    level: 'Easy', tags: ['consistency models', 'session guarantees'], companies: ['Meta', 'Twitter/X'],
    statement: `<p>Name the guarantee that is violated in each story: (1) You change your display name, reload, and see the old name. (2) A comment counter shows 12, you scroll, it shows 9. (3) Your friend sees your photo's comment "So cute!" but not the photo. (4) Two people both reserve the last hotel room. (5) Your two devices show different follower counts for 3 seconds, then agree.</p>`,
    constraints: `<p>Choose from: read-your-writes, monotonic reads, causal, linearizability, eventual consistency (as "allowed").</p>`,
    example: `<p>(1) → ${H.c('r', 'read-your-writes violated')}: your own write is not visible to you.</p>`,
    brute: { why: `<p>The naive habit is to call everything "eventual consistency" or "a caching bug". That does not tell you the fix: RYW needs session tokens or sticky routing, monotonic reads needs replica stickiness, causal needs dependency tracking, and the hotel room needs a linearizable compare-and-set or a transaction.</p>` },
    mcq: { q: 'Story (3), comment visible but photo missing, violates…', options: ['Causal consistency', 'Read-your-writes', 'Durability', 'Availability'], answer: 0, explain: 'The comment depends causally on the photo; showing the effect without its cause breaks causality.' },
    hints: [`<p>Is the victim the writer (RYW), the same reader over time (monotonic), or a third person seeing effects out of order (causal)?</p>`, `<p>Two parties both "winning" the same scarce item means operations were not applied against one up-to-date copy.</p>`, `<p>Temporary disagreement that heals by itself is not a violation of eventual consistency.</p>`],
    solution: {
      approach: `<p>(1) <b>Read-your-writes</b> violated — fix with version tokens or reading your own profile from the leader for a short window. (2) <b>Monotonic reads</b> violated — the second read hit a more stale replica; stick the session to a replica or enforce a minimum version. (3) <b>Causal consistency</b> violated — the comment replicated before the photo; attach dependencies and delay visibility. (4) <b>Linearizability</b> (or serializable transactions) missing — use a conditional write / single-leader CAS on the room inventory. (5) Nothing is violated — this is exactly what <b>eventual consistency</b> allows: temporary divergence followed by convergence.</p>`,
      complexity: `<p>Fix costs: (1)/(2) one integer token per session; (3) dependency metadata per write; (4) a leader/quorum round trip per reservation.</p>`,
      followUps: ['Which of these can be guaranteed during a network partition while staying available?']
    }
  });

  /* =====================================================================
     PRACTICE — Medium
     ===================================================================== */
  practice.push({
    title: 'Total Order of Chat Messages with Lamport Clocks',
    level: 'Medium', tags: ['Lamport clock', 'ordering'], companies: ['Slack', 'Discord'],
    lang: 'python',
    statement: `<p>Three chat servers (ids 1, 2, 3) each accept messages and replicate them to the others. Every server must display the channel in the <b>same order</b>, and a reply must appear after the message it replies to. Wall clocks are unreliable. Design the ordering and implement the Lamport-clock rules.</p>`,
    constraints: `<p>Up to 10k messages/s per channel; servers may be briefly partitioned; ordering of truly concurrent messages may be arbitrary but must be identical everywhere.</p>`,
    example: `<p>S1 sends m1 (L=1). S2 receives m1 (L=max(0,1)+1=2) and sends reply m2 (L=3). S3 concurrently sends m3 (L=1). Order by (L, server): ${H.c('g', '(1,1) m1, (1,3) m3, (3,2) m2')} — m2 is after m1 on every server.</p>`,
    brute: { why: `<p>Naive: sort by server wall-clock timestamp. A server with a clock 2 s behind places a reply before the question. Another naive approach — a single global sequencer — gives perfect order but adds a round trip to one place for every message and fails during partitions.</p>` },
    mcq: { q: 'Why add the server id to the Lamport timestamp?', options: ['To break ties so the order is total and identical everywhere', 'To make it a vector clock', 'To detect concurrency', 'To compress messages'], answer: 0, explain: 'Two concurrent events can share a Lamport value; (L, id) gives a deterministic total order.' },
    hints: [`<p>Lamport rules: tick before send; on receive, clock = max(local, msg) + 1.</p>`, `<p>Sort by the pair (lamport, server_id). Causally-related messages always sort correctly because a → b ⇒ L(a) &lt; L(b).</p>`, `<p>Messages may arrive late; insert them into the sorted position (or delay display briefly) to keep everyone's view identical.</p>`],
    solution: {
      approach: `<p>Each server keeps a Lamport counter. On a local post: <code>L += 1</code>, stamp message with (L, server_id). On receiving a replicated message with timestamp m: <code>L = max(L, m) + 1</code>. When a user replies, the server has already received the parent, so the reply's L exceeds the parent's. Every server sorts messages by (L, server_id) — a total order consistent with causality, identical everywhere once all messages arrive. Late arrivals are inserted into position; to avoid visible jumps, clients may hold a short (~200 ms) display buffer. Note this ordering cannot <i>detect</i> concurrency — if you need "these two were sent without seeing each other", use vector clocks.</p>`,
      code: { lang: 'python', run: true, code: `class Server:
    def __init__(self, sid):
        self.sid, self.clock, self.log = sid, 0, []

    def post(self, text):
        self.clock += 1
        msg = (self.clock, self.sid, text)
        self.log.append(msg)
        return msg

    def receive(self, msg):
        self.clock = max(self.clock, msg[0]) + 1
        self.log.append(msg)


s1, s2, s3 = Server(1), Server(2), Server(3)
m1 = s1.post("Who is up for lunch?")
s2.receive(m1)
m2 = s2.post("Me! (reply to m1)")
m3 = s3.post("Deploy finished")          # concurrent with m1 and m2
for s in (s1, s3):
    s.receive(m2)
for s in (s1, s2):
    s.receive(m3)
s3.receive(m1)
orders = [sorted(s.log) for s in (s1, s2, s3)]
print(all(o == orders[0] for o in orders))   # True: identical order everywhere
for msg in orders[0]:
    print(msg)
` },
      complexity: `<p>O(1) per message to stamp; O(log M) to insert into a sorted log of M messages. Metadata: one integer + server id.</p>`,
      followUps: ['How do you show "edited" messages consistently?', 'When would you switch to a per-channel leader that assigns sequence numbers?']
    }
  });

  practice.push({
    title: 'Two-Region Cassandra: LOCAL_QUORUM or EACH_QUORUM?',
    level: 'Medium', tags: ['quorum', 'multi-region', 'PACELC'], companies: ['Netflix', 'Apple'],
    statement: `<p>A user-profile table is replicated with RF = 3 in us-east and RF = 3 in eu-west (N = 6). Cross-region RTT is 80 ms; in-region 1 ms. Users usually read and write from their home region but sometimes travel. Choose consistency levels for writes and reads, and explain what a traveller may see.</p>`,
    constraints: `<p>Profile write p99 ≤ 20 ms, read p99 ≤ 10 ms. Region outage must not stop writes in the healthy region.</p>`,
    example: `<p>LOCAL_QUORUM write (2 of 3 local) ≈ ${H.c('g', '2 ms')}; EACH_QUORUM write ≈ ${H.c('r', '82 ms')} → violates the 20 ms SLO.</p>`,
    brute: { why: `<p>Naive: use QUORUM over all 6 replicas (4 acks). Every write and read must reach the other region (4 &gt; 3 local), so latency is ~80 ms and a full region outage leaves only 3 replicas → writes and reads fail everywhere. Using ONE everywhere instead is fast but lets even home-region reads be stale.</p>` },
    mcq: { q: 'With LOCAL_QUORUM writes and reads, which reads are guaranteed fresh?', options: ['Reads in the same region as the write', 'All reads in all regions', 'No reads', 'Only reads at ONE'], answer: 0, explain: 'Local W=2 and local R=2 overlap within the region (2+2 > 3), but not across regions.' },
    hints: [`<p>Apply R + W &gt; N to each region separately with LOCAL_QUORUM (N_local = 3).</p>`, `<p>Cross-region replication is asynchronous with LOCAL_* levels; typical lag ≈ RTT + queueing.</p>`, `<p>Travellers: route their reads to their home region for a short window after a write, or accept a few hundred ms of staleness.</p>`],
    solution: {
      approach: `<p><b>Choice: LOCAL_QUORUM for both writes and reads.</b> In-region: W = 2, R = 2 of 3 → overlap 1 → fresh reads within a region, ~1–3 ms latency, meets SLOs, and survives one local node failure plus a full outage of the other region (PA/EL across regions, "PC/EC-ish" within a region).</p>
<p><b>Traveller case:</b> a user who updates their profile in us-east then reads in eu-west within ~100–300 ms may see the old profile (cross-region async replication). Mitigations: (1) after a write, set a short-lived cookie "home=us-east, until t+5 s" and route that user's reads to us-east (read-your-writes across regions); (2) for the rare critical fields (email, password) use EACH_QUORUM or a CP store, paying 80 ms only on those writes.</p>
<p><b>Conflicts:</b> if the same profile is edited concurrently in both regions, Cassandra resolves per column by last-write-wins timestamp. Keep columns independent (name, bio, avatar) to reduce lost updates; use client-provided timestamps carefully or server-side HLC.</p>`,
      complexity: `<p>Write ≈ 2nd fastest local replica (~1–2 ms); read similar; cross-region lag ≈ 80 ms + queueing.</p>`,
      followUps: ['What happens to LOCAL_QUORUM reads if 2 of the 3 local replicas are down?', 'How would you detect and alert on cross-region replication lag?']
    }
  });

  practice.push({
    title: 'Causal Consistency for Comment Threads',
    level: 'Medium', tags: ['causal consistency', 'replication'], companies: ['Reddit', 'LinkedIn'],
    statement: `<p>A geo-replicated comment service (3 regions, asynchronous replication) shows replies appearing before their parent comments, and "deleted" comments reappearing after edits. Design a replication scheme that gives <b>causal consistency</b> without cross-region round trips on the write path.</p>`,
    constraints: `<p>Writes acknowledged locally (&lt; 10 ms). 50k comments/s globally. Regions may be partitioned for minutes.</p>`,
    example: `<p>Parent P (us) replicates to eu in 300 ms, reply R (written in us after P) replicates in 120 ms. Without dependencies eu shows ${H.c('r', 'R before P')}. With "R depends on P" metadata, eu buffers R until P is applied → ${H.c('g', 'P then R')}.</p>`,
    brute: { why: `<p>Naive fix: make writes synchronous to all regions (wait for every region before acking) — 100–200 ms writes and no writes during a partition. Another naive fix: sort by wall-clock timestamp on display — still breaks with clock skew and does nothing for edit/delete ordering.</p>` },
    mcq: { q: 'Why can causal consistency remain available during a partition?', options: ['Each region applies writes once their dependencies arrive; no cross-region agreement is needed to accept a write', 'It uses majority quorums', 'It waits for all regions', 'It drops writes during partitions'], answer: 0, explain: 'Causal only needs to delay visibility of a write until its causes are visible locally; accepting it needs no coordination.' },
    hints: [`<p>Each write carries the list (or vector) of writes it depends on: the parent comment, plus anything the author's session had read.</p>`, `<p>A replica applies a remote write only when all its dependencies are already applied locally; otherwise buffer it.</p>`, `<p>Edits/deletes of the same comment form a chain — version each comment and apply versions in order (or use a tombstone with a higher version).</p>`],
    solution: {
      approach: `<p><b>Design (COPS-style causal+):</b></p>
<ol><li>Every comment has an id and a per-comment version. Every write carries <b>dependencies</b>: the parent comment id@version, and the client session's "nearest dependencies" (the latest versions it read or wrote).</li>
<li>A write is accepted and acknowledged in the local region immediately (fast, available), assigned a local timestamp/HLC, and put on the replication stream.</li>
<li>A remote region's applier checks dependencies: if all are present locally, apply and make visible; otherwise <b>buffer</b> until they arrive. Visibility never shows an effect before its cause.</li>
<li>Edits and deletes are new versions of the same comment; a delete is a <b>tombstone</b> with a higher version, so an older edit arriving late cannot resurrect it (versions are compared, not arrival order).</li>
<li>Concurrent edits from two regions (neither saw the other) are detected via version vectors and resolved by a deterministic rule (e.g. highest HLC wins, or keep both and show "edited elsewhere").</li>
<li>Monitoring: buffer size and dependency wait time per region; garbage-collect dependency metadata once a write is known applied everywhere (stable).</li></ol>
<p>Result: writes stay local and fast, the system stays available during partitions, and readers never see a reply without its parent.</p>`,
      complexity: `<p>Per write: O(d) dependency metadata (d small with nearest-dependency tracking). Visibility delay = max replication delay of its dependencies.</p>`,
      followUps: ['How do you bound buffer growth if a dependency is lost?', 'How does this compare with routing each thread to a single home region?']
    }
  });

  practice.push({
    title: 'How Long Until the Cluster Knows? Gossip Estimation',
    level: 'Medium', tags: ['gossip', 'estimation'], companies: ['HashiCorp', 'DataStax'],
    statement: `<p>A 2,000-node cluster gossips every 1 s with fanout 3 (push-pull). (a) Roughly how many rounds and seconds until a schema change reaches every node? (b) Each gossip message is 2 KB — what is the per-node and total bandwidth? (c) How would you guarantee no node stays stale forever?</p>`,
    constraints: `<p>Use log-based estimates; message loss 1%.</p>`,
    example: `<p>log₄ 2000 ≈ 5.5 (each round an informed node reaches ~3 more, so the informed set grows ~4×) → about ${H.c('g', '6–8 rounds ≈ 6–8 s')} including the slow tail.</p>`,
    brute: { why: `<p>Naive: have the node that made the change send it directly to all 1,999 others. That is 1,999 sequential/parallel sends from one node (hot spot), it fails if that node crashes midway, and lost messages are never retried — some nodes may never learn the change.</p>` },
    mcq: { q: 'Doubling the cluster from 2,000 to 4,000 nodes adds roughly how many gossip rounds (fanout 3)?', options: ['About half a round to one round', 'Doubles the rounds', 'Adds 2,000 rounds', 'No change at all'], answer: 0, explain: 'Rounds grow with log₄ N; log₄ 2 = 0.5.' },
    hints: [`<p>Informed nodes grow about (1 + fanout)× per round early on; rounds ≈ log<sub>1+k</sub> N plus a small tail.</p>`, `<p>Bandwidth per node = fanout × message size × rounds/s (send) — plus the same received on average.</p>`, `<p>Pair rumour spreading with periodic anti-entropy (digest / Merkle comparison).</p>`],
    solution: {
      approach: `<p><b>(a)</b> Push-pull with fanout 3: informed set grows ~4× per round initially → log₄ 2000 ≈ 5.5 rounds, plus O(ln ln N) ≈ 2 for the tail → <b>~7–8 rounds ≈ 7–8 s</b>. 1% loss barely matters because many redundant paths exist.</p>
<p><b>(b)</b> Each node initiates 3 exchanges/s; a push-pull exchange is ~2 messages each way of 2 KB → roughly 3 × 2 × 2 KB ≈ 12 KB/s sent+received per node (half if digests are sent first and full state only when different). Cluster total ≈ 2000 × 12 KB/s ≈ 24 MB/s spread evenly — no hot spot. In practice send <b>digests</b> (versions) first and full data only for newer entries, cutting this a lot.</p>
<p><b>(c)</b> Make state <b>versioned</b> (generation + version per entry, so newer always wins and re-delivery is harmless), run periodic <b>anti-entropy</b> (full digest sync with a random peer every 10–30 s), and expose "max state version seen" per node as a metric to alert on laggards.</p>`,
      complexity: `<p>Rounds O(log N); per-node bandwidth O(k · message size) independent of N; total O(N · k).</p>`,
      followUps: ['How does Cassandra limit the size of gossip state per node?']
    }
  });

  practice.push({
    title: 'PACELC for a Gaming Platform: Wallet vs Leaderboard',
    level: 'Medium', tags: ['PACELC', 'CAP', 'design'], companies: ['Riot Games', 'Epic Games', 'Roblox'],
    statement: `<p>A global game has (1) a coin wallet used for in-game purchases, (2) a global leaderboard updated after every match, and (3) player chat presence ("online/offline"). Assign a PACELC label to each, pick a storage approach, and state what users experience during a region partition and during normal operation.</p>`,
    constraints: `<p>Players in 5 regions; 200k matches finish per minute; purchases 2k/s.</p>`,
    example: `<p>Wallet → ${H.c('b', 'PC/EC')}: during a partition the minority region shows "purchases temporarily unavailable"; normally each purchase pays a majority-commit round trip (~10–60 ms).</p>`,
    brute: { why: `<p>Naive: store all three in one globally consistent database (PC/EC). The leaderboard's 3,300 writes/s and presence updates would all pay cross-region consensus latency, and a partition would freeze presence and rankings for everyone — for data that does not need to be exact.</p>` },
    mcq: { q: 'Best label for online/offline presence?', options: ['PA/EL', 'PC/EC', 'PC/EL', 'CA'], answer: 0, explain: 'Presence is ephemeral and frequently refreshed; availability and low latency matter most.' },
    hints: [`<p>Money → never wrong. Rankings → can be a few seconds stale. Presence → constantly refreshed, can be very stale briefly.</p>`, `<p>For the wallet, consider a per-player home region with a consensus-replicated store, so purchases are usually in-region.</p>`, `<p>Leaderboards can be computed from an event stream with per-region aggregation and periodic global merge.</p>`],
    solution: {
      approach: `<p><b>Wallet → PC/EC.</b> Store in a consensus-replicated database (Spanner/CockroachDB or per-region Raft groups) with each player's wallet <i>homed</i> in their region so the quorum is in-region (~5 ms) normally; cross-region players pay more. Use idempotency keys per purchase and a double-entry ledger. During a partition, players cut off from their wallet's home quorum cannot spend — show a clear message.</p>
<p><b>Leaderboard → PA/EL.</b> Each match result is appended to a regional log (Kafka); a stream job maintains regional sorted sets (Redis ZSET) and merges into a global top-K every few seconds. During a partition each region keeps showing its last merged global board plus live local updates; after healing, merging is easy because scores per player are monotonic (max) or additive (CRDT-like).</p>
<p><b>Presence → PA/EL.</b> In-memory TTL keys refreshed by heartbeats every 30 s, gossiped/replicated asynchronously across regions. Stale "online" for up to a TTL is acceptable; never block on it.</p>`,
      complexity: `<p>Wallet: 1 consensus round per purchase. Leaderboard: O(log n) ZSET updates, merge every few seconds. Presence: O(1) TTL writes.</p>`,
      followUps: ['How would you prevent a player from spending the same coins in two regions if wallets were not homed?']
    }
  });

  /* =====================================================================
     PRACTICE — Hard
     ===================================================================== */
  practice.push({
    title: 'Design a Dynamo-Style Key-Value Store',
    level: 'Hard', tags: ['quorum', 'vector clocks', 'gossip', 'consistent hashing'], companies: ['Amazon', 'Apple', 'Discord'],
    statement: `<p>Design a highly available key-value store: <code>get(key)</code>, <code>put(key, value, context)</code>. Requirements: always writable (even during partitions), tunable consistency, 1M ops/s, 100 TB, nodes join/leave without downtime, no single point of failure. Explain partitioning, replication, versioning/conflicts, membership and failure handling.</p>`,
    constraints: `<p>Commodity nodes (2 TB each), 3 availability zones, p99 latency ≤ 10 ms for get/put within a region.</p>`,
    example: `<p>put("cart:42", {book}) on a coordinator with N=3, W=2: sent to the 3 preference-list nodes, OK after 2 acks. Concurrent put via another coordinator during a partition → read returns ${H.c('r', '2 siblings')} with their vector clocks; the client merges and writes back with a dominating clock.</p>`,
    brute: { why: `<p>Naive: a single primary database with async replicas, sharded by <code>hash(key) mod M</code>. The primary per shard blocks writes when it fails or is partitioned (not always-writable), mod-M resharding moves almost every key when M changes, and async replicas give stale reads with no way to detect conflicting writes.</p>` },
    mcq: { q: 'Which component lets this store accept writes when some home replicas are down?', options: ['Sloppy quorum with hinted handoff', 'Two-phase commit', 'A single leader per key', 'Linearizable reads'], answer: 0, explain: 'Writes go to the next healthy nodes on the ring with a hint and are handed back later.' },
    hints: [`<p>Partition with consistent hashing + virtual nodes; replicate each key on the next N distinct physical nodes (across AZs) — the preference list.</p>`, `<p>Leaderless replication with N/W/R quorums; version every value with a vector clock; return siblings on conflict.</p>`, `<p>Membership and failure detection by gossip; hinted handoff for temporary failures; Merkle-tree anti-entropy for permanent drift; read repair on reads.</p>`],
    solution: {
      approach: `<p><b>Partitioning:</b> consistent hashing ring with ~256 virtual nodes per physical node; adding a node moves ~1/N of data. 100 TB × 3 replicas / 2 TB ≈ 150 nodes + headroom → ~200 nodes.</p>
<p><b>Replication:</b> each key lives on N = 3 nodes (preference list = next 3 distinct physical nodes, AZ-aware). Any node can coordinate (clients use a partition-aware library to hit a replica directly and save a hop).</p>
<p><b>Consistency knobs:</b> default W = 2, R = 2 (R + W &gt; N, survives 1 failure); per-request override (W = 1 for logs, R = 1 for caches).</p>
<p><b>Versioning:</b> each value carries a version vector keyed by coordinator node (dotted version vectors to avoid false conflicts). <code>get</code> returns all concurrent siblings plus an opaque <b>context</b> (the merged clock); <code>put</code> must send the context back so the new version dominates what the client saw. Applications merge (cart union) or use built-in CRDTs (counters, sets). Optional LWW mode for simple use cases.</p>
<p><b>Availability under failure:</b> <b>sloppy quorum + hinted handoff</b> — if a preference-list node is unreachable, the write goes to the next healthy node with a hint and is handed back on recovery. <b>Read repair</b> fixes stale replicas seen during reads. <b>Anti-entropy</b>: per-vnode Merkle trees compared in the background to repair permanent divergence.</p>
<p><b>Membership &amp; failure detection:</b> gossip every second (SWIM/phi accrual) spreads ring membership and node status; explicit admin commands for permanent join/leave so transient failures do not trigger data movement.</p>
<p><b>Storage engine:</b> LSM-tree per node (memtable + commit log + SSTables) for fast writes; bloom filters for gets. <b>Trade-offs stated:</b> PA/EL; reads may return siblings; R + W &gt; N is weakened by sloppy quorums; no multi-key transactions.</p>`,
      complexity: `<p>Get/put: O(1) routing, N messages, wait for R/W fastest. Rebalancing moves O(data/nodes) per node change. Gossip O(1) per node per second.</p>`,
      followUps: ['How would you add a "strongly consistent" mode for some keys?', 'How do you delete keys safely with tombstones and gc_grace?']
    }
  });

  practice.push({
    title: 'Offline-First Shared Shopping List',
    level: 'Hard', tags: ['vector clocks', 'CRDT', 'AP', 'sync'], companies: ['Google', 'Apple', 'Instacart'],
    lang: 'python',
    statement: `<p>A family shares a shopping list on phones that are often offline. Anyone can add, remove or tick items offline; when phones reconnect, all copies must converge, no add may be silently lost, and an item removed on one phone while concurrently re-added on another should <b>stay</b> (add wins). Design the sync protocol and data structure.</p>`,
    constraints: `<p>Up to 10 devices per list, lists of ≤ 500 items, sync through a server that may itself be eventually consistent.</p>`,
    example: `<p>Phone A removes "milk" offline; phone B, never having seen the removal, adds "milk" again (new tag). After sync: ${H.c('g', 'milk present')} — B's add was concurrent with A's remove, and add-wins keeps it.</p>`,
    brute: { why: `<p>Naive: last-write-wins on the whole list (server keeps the newest upload). Two offline edits → one family member's changes vanish entirely. Slightly better naive: diff-and-merge by item name with timestamps — clock skew on phones reorders events, and a remove-then-re-add cannot be told apart from a stale remove.</p>` },
    mcq: { q: 'Which data structure gives add-wins semantics for concurrent add/remove?', options: ['OR-Set (observed-remove set) CRDT', 'LWW register for the whole list', 'Lamport clock', 'Quorum with R+W>N'], answer: 0, explain: 'An OR-Set removes only the add-tags the remover had observed, so a concurrent add (new tag) survives.' },
    hints: [`<p>Give every add a unique tag (device id + counter). The item is present if it has any tag not yet removed.</p>`, `<p>A remove records only the tags the device has observed for that item (tombstones). Merge = union of adds and union of removes.</p>`, `<p>Use a version vector per device to sync only missing operations (delta sync) and to know when tombstones can be garbage-collected.</p>`],
    solution: {
      approach: `<p><b>Data structure:</b> an <b>OR-Set CRDT</b>. Each add of item x creates a unique tag (device, counter). State = adds: set of (x, tag), removes: set of tags. x is present if some add-tag of x is not in removes. A remove of x adds all <i>currently observed</i> tags of x to removes. Merge = union of both sets — commutative, associative, idempotent, so every device converges regardless of sync order or duplicates.</p>
<p><b>Why add-wins:</b> B's re-add creates a new tag A never observed, so A's remove cannot cover it.</p>
<p><b>Ticks</b> ("bought") use a per-item LWW register with an HLC timestamp, or another OR-Set of ticked items.</p>
<p><b>Sync:</b> each device keeps a version vector {device: highest counter seen}. On reconnect it sends its vector to the server; the server returns operations the device has not seen, and the device uploads its own new ones (delta-state CRDT). The server stores the merged state and can itself be AP.</p>
<p><b>Garbage collection:</b> a tombstone can be dropped once every device's version vector shows it has seen the remove (causal stability). Devices inactive for 90 days are evicted from the family vector.</p>
<p><b>Order of items</b> (if needed) uses a sequence CRDT or fractional indexing. Libraries: Automerge, Yjs.</p>`,
      code: { lang: 'python', run: true, code: `class ORSet:
    def __init__(self, device):
        self.device, self.counter = device, 0
        self.adds, self.removes = set(), set()   # adds: (item, tag); removes: tags

    def add(self, item):
        self.counter += 1
        self.adds.add((item, (self.device, self.counter)))

    def remove(self, item):
        self.removes |= {tag for (x, tag) in self.adds if x == item}

    def merge(self, other):
        self.adds |= other.adds
        self.removes |= other.removes

    def items(self):
        return sorted({x for (x, tag) in self.adds if tag not in self.removes})


a, b = ORSet("A"), ORSet("B")
a.add("milk"); a.add("eggs")
b.merge(a)                   # both phones now have milk, eggs
a.remove("milk")             # A offline: removes the milk it has seen
b.remove("milk"); b.add("milk")   # B offline: removes then re-adds (new tag)
a.merge(b); b.merge(a)
print(a.items(), b.items())  # ['eggs', 'milk'] on both: add wins
` },
      complexity: `<p>Merge O(adds + removes); delta sync sends only unseen ops. Tombstone metadata bounded by GC via causal stability.</p>`,
      followUps: ['How would you support quantity ("3 × milk") with concurrent increments?', 'How do you garbage-collect if one device never comes back online?']
    }
  });

  practice.push({
    title: 'Global Flash Sale Inventory: Never Oversell, Stay Fast',
    level: 'Hard', tags: ['CAP', 'PACELC', 'linearizability', 'quorum'], companies: ['Amazon', 'Flipkart', 'Shopify'],
    statement: `<p>A flash sale sells exactly 10,000 units of a phone worldwide in 3 regions. Peak 200k purchase attempts/s. Requirements: never sell more than 10,000; most buyers should get an answer in &lt; 100 ms; a region partition must not cause overselling. Design the inventory system and state its CAP/PACELC choices.</p>`,
    constraints: `<p>Cross-region RTT 70–150 ms. Payment happens after reservation; unpaid reservations expire after 10 minutes.</p>`,
    example: `<p>Single global counter in us-east: an India buyer pays ${H.c('r', '~150 ms RTT')} per attempt and us-east handles 200k/s on one hot key. Split into regional allocations (4,000 / 3,500 / 2,500): each decrement is a ${H.c('g', 'local linearizable')} operation (~2 ms).</p>`,
    brute: { why: `<p>Naive 1: AP counters in each region with async sync — during a partition (or just replication lag) every region sells "the last unit" → oversell. Naive 2: one strongly consistent global counter row — correct but every attempt crosses regions and serialises on one hot key; it collapses at 200k/s and stops the entire sale if its region is cut off.</p>` },
    mcq: { q: 'Why do regional allocations avoid overselling during a partition?', options: ['Each region can only decrement its own pre-allocated stock, so the global sum can never go below zero', 'They use last-write-wins', 'They use eventual consistency', 'They disable payments'], answer: 0, explain: 'Partitioning the invariant into local budgets keeps each check local and linearizable.' },
    hints: [`<p>Split the global invariant (sold ≤ 10,000) into local invariants (sold_r ≤ allocation_r) — escrow / bounded counter idea.</p>`, `<p>Within a region, use a CP store (Raft-replicated) or Redis with atomic DECR on sharded sub-counters; queue requests to smooth the hot key.</p>`, `<p>Rebalance unused allocation between regions via a CP coordination step when a region runs low; during a partition a region can only sell what it already holds.</p>`],
    solution: {
      approach: `<p><b>Idea: escrow / bounded counters.</b> Split 10,000 units into regional allocations proportional to expected demand (e.g. 4,000 US, 3,500 EU, 2,500 APAC) stored in a <b>CP</b>, consensus-replicated store inside each region (PC/EC locally, a few ms). Each region further splits its allocation into ~50 sub-counters (shards) to avoid one hot key; a purchase decrements a random shard with a conditional write (<code>if stock &gt; 0 then stock -= 1</code>), trying another shard if empty.</p>
<p><b>Admission control:</b> put a queue/token gate in front (only as many tokens as remaining stock + small buffer) so 200k/s attempts mostly get a fast "sold out / waiting room" answer without touching storage.</p>
<p><b>Reservations:</b> a successful decrement creates a reservation with a 10-minute TTL; expired reservations increment stock back (idempotent by reservation id). Payment confirms the reservation.</p>
<p><b>Rebalancing:</b> when a region's remaining stock drops below a threshold, it requests more from regions with spare units through a small cross-region CP transaction (two regions agree to move k units). This is the only cross-region step, and it is off the hot path.</p>
<p><b>Partition behaviour:</b> a cut-off region keeps selling its <b>own</b> allocation (available locally) but cannot borrow — so it may report sold-out early while others still have stock. That is the explicit trade: <b>never oversell</b> (C for the global invariant) while staying mostly available and fast (EL for most requests). Final reconciliation after the sale returns unsold allocation to a global pool.</p>`,
      complexity: `<p>Purchase: one local conditional write (O(1), ~2–5 ms). Rebalance: occasional cross-region round trips. Throughput scales with number of shards × regions.</p>`,
      followUps: ['How would you make the allocation adaptive to real demand during the sale?', 'What if a region crashes holding 1,000 reserved-but-unsold units?']
    }
  });

  practice.push({
    title: 'Active-Active User Settings Across Regions: Detect and Resolve Conflicts',
    level: 'Hard', tags: ['vector clocks', 'HLC', 'multi-region', 'conflict resolution'], companies: ['Microsoft', 'Netflix', 'Spotify'],
    statement: `<p>User settings (theme, language, notification preferences, privacy level) are writable in any of 4 regions with asynchronous replication. Concurrent edits happen (user on laptop in one region, phone routed to another). Requirements: never lose a privacy downgrade-to-private silently, converge everywhere, no cross-region latency on writes. Design versioning and conflict resolution.</p>`,
    constraints: `<p>20k writes/s, settings document ≤ 4 KB, clocks may be skewed by up to 500 ms.</p>`,
    example: `<p>Laptop (us) sets privacy=private at 10:00:00.000; phone (eu) sets theme=dark at 10:00:00.200 having not seen the first edit. Whole-document LWW keeps the eu doc → ${H.c('r', 'privacy reverts to public!')}. Per-field versions → ${H.c('g', 'private + dark')}.</p>`,
    brute: { why: `<p>Naive: whole-document last-write-wins by wall clock. Concurrent edits to <i>different</i> fields clobber each other, clock skew of 500 ms reorders genuinely sequential edits, and a privacy change (security-sensitive) can be undone silently by an unrelated edit.</p>` },
    mcq: { q: 'Two regions edit the same field concurrently. What can vector clocks tell you that wall-clock timestamps cannot?', options: ['That the edits were concurrent (neither saw the other) rather than one overwriting the other', 'The exact real-world time of each edit', 'How to merge the values automatically', 'Which region is closer to the user'], answer: 0, explain: 'Vector clocks detect concurrency; deciding the merge is still policy.' },
    hints: [`<p>Version each <b>field</b> separately so edits to different fields never conflict.</p>`, `<p>Use a version vector (per region) on each field to tell "overwrite" from "concurrent"; use an HLC timestamp for a deterministic tie-break that is close to real time.</p>`, `<p>For security-sensitive fields, define a semantic merge rule (most restrictive wins) instead of time-based wins, and notify the user.</p>`],
    solution: {
      approach: `<p><b>1. Per-field versioning:</b> the settings document is a map field → (value, version vector over regions, HLC timestamp). An edit to <code>theme</code> only bumps theme's vector, so it cannot clobber <code>privacy</code>.</p>
<p><b>2. Replication &amp; merge:</b> each region applies incoming field versions: if the incoming vector dominates the local one → replace; if dominated → ignore; if <b>concurrent</b> → conflict. Merging is per field, so the merge function is commutative and all regions converge.</p>
<p><b>3. Conflict policies per field:</b> ordinary preferences (theme, language) → highest <b>HLC</b> wins (HLC stays within clock skew of physical time but respects causality, so a causally-later edit always wins even with 500 ms skew). Security fields (privacy, 2FA) → <b>most restrictive wins</b> (private beats public) and the user is notified; for sets like muted channels → OR-Set union.</p>
<p><b>4. Writes:</b> acknowledged locally (PA/EL) — no cross-region latency. A session token gives the user read-your-writes in the region they use; after a region switch, the client sends its last seen versions so the new region can wait briefly or proxy to the old one.</p>
<p><b>5. Metadata cost:</b> 4 regions × small counters per field — tiny. Track conflict rate as a metric; if a field conflicts often, consider homing it in one region (CP for that field).</p>`,
      complexity: `<p>Merge O(fields × regions). Write latency local (~ms). Convergence time = replication lag (~100–300 ms).</p>`,
      followUps: ['Why is HLC better than pure wall clock for the tie-break?', 'When would you move a field to a single-home (CP) model instead?']
    }
  });

  /* =====================================================================
     QUIZ
     ===================================================================== */
  quiz.push(
    { q: 'In CAP, what does "C" mean?', options: ['Linearizability: every read sees the latest completed write', 'ACID transaction consistency (constraints hold)', 'Data is compressed', 'Clients are cached'], answer: 0, explain: 'CAP consistency is linearizability, a single-copy illusion — different from the C in ACID, which is about invariants.' },
    { q: 'Why is "CA" not a realistic choice for a multi-node system?', options: ['Network partitions happen anyway, so you must decide what to do when they occur', 'CA is too expensive', 'CA requires SSDs', 'CA is only for NoSQL'], answer: 0, explain: 'P is a fact of life for networks; the choice is C or A during a partition.' },
    { q: 'Cassandra with consistency level ONE is best described by PACELC as…', options: ['PA/EL', 'PC/EC', 'PC/EL', 'PA/EC'], answer: 0, explain: 'Available during partitions and returns after the fastest replica in normal operation.' },
    { q: 'N = 3, W = 1, R = 3. Which statement is true?', options: ['Reads are fresh, but a single down replica blocks reads', 'Reads may be stale', 'Writes block if any replica is down', 'It tolerates 2 failures for reads'], answer: 0, explain: '1 + 3 > 3 so reads overlap the write; R = N means reads need every replica.' },
    { q: 'Vector clocks [3,1,2] and [2,2,2] are…', options: ['Concurrent', '[3,1,2] happened-before [2,2,2]', '[2,2,2] happened-before [3,1,2]', 'Equal'], answer: 0, explain: 'First is bigger in slot 0, second is bigger in slot 1 → neither dominates.' },
    { q: 'On receiving a message, a process using vector clocks should…', options: ['Take the element-wise max with the message clock, then increment its own slot', 'Replace its clock with the message clock', 'Increment every slot', 'Reset its clock to zero'], answer: 0, explain: 'Max merges knowledge; the increment records the receive event itself.' },
    { q: 'What can Lamport clocks NOT tell you?', options: ['Whether two events were concurrent', 'A total order of events', 'That a cause has a smaller timestamp than its effect', 'How to break ties between nodes'], answer: 0, explain: 'L(a) < L(b) is consistent with both "a caused b" and "a and b were concurrent".' },
    { q: 'You update your bio and immediately see the old one. Which guarantee failed?', options: ['Read-your-writes', 'Monotonic writes', 'Partition tolerance', 'Durability'], answer: 0, explain: 'Your own write was not visible to your subsequent read.' },
    { q: 'Which is the strongest consistency model that can remain available during a network partition?', options: ['Causal consistency', 'Linearizability', 'Sequential consistency', 'Strict serializability'], answer: 0, explain: 'Causal (and causal+) can be implemented with local writes and dependency tracking; stronger models need coordination.' },
    { q: 'Gossip with constant fanout reaches all N nodes in roughly…', options: ['O(log N) rounds', 'O(N) rounds', 'O(N²) rounds', 'Exactly 1 round'], answer: 0, explain: 'The informed set grows geometrically, so rounds grow logarithmically.' },
    { q: 'What is the purpose of SWIM\'s indirect ping (ping-req)?', options: ['Avoid declaring a node dead because of a problem only on the prober\'s network path', 'Elect a leader', 'Encrypt heartbeats', 'Replicate data'], answer: 0, explain: 'Other members probing the target separates "target is dead" from "my link to it is bad".' },
    { q: 'A phi accrual detector outputs φ = 3. What does it roughly mean?', options: ['About a 0.1% chance a live node would be this late — strong suspicion', 'The node missed exactly 3 heartbeats', 'The node is 3 seconds late', 'Three nodes agree it is dead'], answer: 0, explain: 'φ = −log₁₀(P(late)); φ = 3 → P ≈ 10⁻³.' },
    { q: 'Why do failover systems use fencing tokens even with good failure detectors?', options: ['Detectors can be wrong (e.g. GC pause), so a stale leader must be blocked from writing', 'Tokens make heartbeats faster', 'Tokens replace quorums', 'Tokens compress logs'], answer: 0, explain: 'Safety must not depend on perfect detection; a monotonically increasing epoch rejects the old leader.' }
  );

  /* =====================================================================
     INTERVIEW
     ===================================================================== */
  interview.push(
    { q: 'Explain the CAP theorem to a junior engineer, and what people get wrong about it.', level: 'I', a: `<p>When data is copied on several machines and the network between them breaks (a partition), a node that cannot reach the others must choose: refuse requests (stay <b>consistent</b>) or answer with what it has (stay <b>available</b>). Common mistakes: (1) treating it as "pick 2 of 3" — partitions are not optional, so it is really C vs A <i>during</i> a partition; (2) confusing CAP's C (linearizability) with ACID's C; (3) labelling whole databases instead of configurations and operations; (4) forgetting that outside partitions the real daily trade-off is latency vs consistency (PACELC).</p>`, followUps: ['Give an example where you would choose different CAP behaviour for two features of the same product.', 'Is a single Postgres node CA?'] },
    { q: 'What is PACELC and why is it more useful than CAP in interviews?', level: 'I', a: `<p>PACELC: if there is a <b>P</b>artition, choose <b>A</b> or <b>C</b>; <b>E</b>lse (normal operation) choose <b>L</b>atency or <b>C</b>onsistency. It captures the cost you pay every request — waiting for a quorum or cross-region replica — not just during rare partitions. Examples: Cassandra/DynamoDB defaults PA/EL, Spanner/etcd PC/EC, PNUTS PC/EL. In a design interview it lets you justify "async replication for the feed (EL), synchronous quorum for payments (EC)" with latency numbers.</p>`, followUps: ['What is the latency cost of EC for a 3-region deployment with 70 ms RTTs?', 'Can a system be PA/EC?'] },
    { q: 'Linearizability vs serializability — what is the difference?', level: 'A', a: `<p><b>Linearizability</b> is a recency guarantee on single objects/operations: each operation appears to happen atomically at one instant between its start and end, respecting real time. <b>Serializability</b> is an isolation guarantee on multi-object transactions: the outcome equals <i>some</i> serial order, which need not match real time (a read-only transaction could see an old snapshot). <b>Strict serializability</b> combines both (Spanner's external consistency). Locks/leader election need linearizability; bank transfers across rows need serializable transactions.</p>`, followUps: ['Is snapshot isolation serializable?', 'How does Spanner achieve external consistency?'] },
    { q: 'How do quorums work in a leaderless database, and why does R + W > N give fresh reads?', level: 'I', a: `<p>Each key is stored on N replicas. A write is sent to all N and succeeds after W acks; a read queries replicas and returns after R responses, picking the highest version. If R + W &gt; N, any set of R replicas and any set of W replicas share at least R + W − N ≥ 1 member (pigeonhole), so the read includes a replica with the latest acknowledged write. Write availability tolerates N − W failures, reads N − R. Read repair and anti-entropy fix replicas that missed writes.</p>`, followUps: ['Does R + W > N make the system linearizable?', 'What is a sloppy quorum?'] },
    { q: 'What anomalies are still possible with R + W > N?', level: 'A', a: `<p>(1) <b>Sloppy quorums</b> with hinted handoff: writes land on non-home nodes, so the overlap guarantee breaks. (2) <b>Failed writes</b> that reached fewer than W replicas are not rolled back; later reads may or may not see them. (3) <b>Concurrent read during write</b>: one reader sees the new value, a later reader the old one — not linearizable unless reads do synchronous read repair (ABD). (4) <b>LWW with clock skew</b> can drop the newer of two writes. (5) Node replacement restoring from a stale replica can reduce the number of fresh copies below W.</p>`, followUps: ['How does Cassandra\'s lightweight transaction (Paxos) avoid these?', 'What is PBS (probabilistically bounded staleness)?'] },
    { q: 'Walk me through how vector clocks detect conflicting writes in a system like Dynamo or Riak.', level: 'A', a: `<p>Each version of a value carries a vector of counters, one per node that coordinated a write. When a node coordinates a new write based on a context the client read, it sets the vector to the context's clock with its own counter incremented. On read or replication, two versions are compared: if every counter of A ≤ B, A is an ancestor and can be discarded; otherwise they are <b>concurrent siblings</b> and both are kept and returned. The client merges (e.g. cart union) and writes back with the merged context so the new version dominates both. Size grows with writers, so systems prune or use dotted version vectors.</p>`, followUps: ['Why key vectors by server rather than client?', 'What are dotted version vectors?'] },
    { q: 'Lamport clocks vs vector clocks vs hybrid logical clocks — when do you use each?', level: 'A', a: `<p><b>Lamport</b>: one integer; gives a total order consistent with causality (tie-break by node id). Use for ordering logs/messages, mutual exclusion. Cannot detect concurrency. <b>Vector clocks</b>: one counter per process; exactly capture happens-before and detect concurrency. Use for conflict detection in multi-writer replication; cost O(#processes). <b>HLC</b>: physical time + logical counter in 64 bits; close to wall clock (useful for snapshot reads, TTLs, human debugging) and preserves causality like Lamport. Used by CockroachDB, YugabyteDB, MongoDB. Spanner instead uses TrueTime with bounded uncertainty and commit-wait.</p>`, followUps: ['What happens to HLC if one node\'s clock jumps far ahead?', 'Why does Spanner need atomic clocks?'] },
    { q: 'Explain causal consistency and how you would implement it in a geo-replicated system.', level: 'A', a: `<p>Causal consistency: if operation A could have influenced B (same session order, or B's author read A), every replica makes A visible before B; unrelated (concurrent) writes may appear in different orders. Implementation: writes are accepted locally; each carries dependencies (vector clock or explicit "nearest dependencies"); a remote replica buffers a write until all its dependencies are applied locally, then makes it visible. Sessions track what they have read so their next write depends on it. It stays available during partitions and is the strongest model that does — the COPS/Eiger line of work, MongoDB causal sessions.</p>`, followUps: ['How do you garbage-collect dependency metadata?', 'What is "causal+" (convergent causal)?'] },
    { q: 'How do gossip protocols work and where are they used?', level: 'I', a: `<p>Each node periodically (e.g. every second) picks a few random peers and exchanges state — push, pull or push-pull. Information spreads like an epidemic, reaching all N nodes in O(log N) rounds, with constant work per node and no coordinator, and it tolerates message loss and node failures. Used for membership and failure information (Cassandra, Consul/Serf, Redis Cluster bus), anti-entropy replica repair with Merkle trees (Dynamo, Cassandra), and blockchain/P2P broadcast. Downsides: probabilistic and eventual delivery, redundant traffic, and bad state spreads quickly too.</p>`, followUps: ['Why is push-pull faster than push alone?', 'How do you stop a rumour from spreading forever?'] },
    { q: 'Design failure detection for a 1,000-node cluster. Why not all-to-all heartbeats?', level: 'A', a: `<p>All-to-all heartbeats cost N² messages (a million per interval) and N per node, and a single bad link makes a node look dead to some peers. Instead use <b>SWIM</b>: every period each node pings one random member; on timeout it asks k members to ping-req the target; if still silent mark it <b>suspect</b>, gossip that, give the node a chance to refute with a higher incarnation, then declare <b>dead</b>. Updates are piggybacked on pings and spread in O(log N). Add Lifeguard-style local health awareness to reduce false positives, and phi-accrual-like adaptive timeouts for jittery networks.</p>`, followUps: ['What is the expected time to first detection in SWIM?', 'How do you handle asymmetric partitions?'] },
    { q: 'What is a phi accrual failure detector and why is it better than a fixed timeout?', level: 'A', a: `<p>Instead of a binary "dead after T seconds", it keeps a sliding window of heartbeat inter-arrival times, models their distribution, and outputs φ = −log₁₀ P(a heartbeat would be this late if the node were alive). The application chooses a threshold (Cassandra default 8). It adapts automatically: on a jittery cross-region link with a larger mean/variance, the same φ threshold waits longer; on a stable LAN it detects quickly. Different consumers can use different thresholds on the same signal.</p>`, followUps: ['What distribution does Akka assume vs Cassandra?', 'How do you choose the threshold?'] },
    { q: 'A leader pauses for 30 s in GC, gets replaced, then wakes up and keeps writing. How do you prevent damage?', level: 'E', a: `<p>Accept that failure detection can be wrong and design for safety: (1) <b>leases</b> — the leader may act only while its lease is valid and must stop when it expires, with lease duration shorter than followers' election timeout (accounting for clock drift); (2) <b>fencing tokens/epochs</b> — every new leader gets a strictly higher term; storage, replicas and downstream services reject requests with an older term; (3) consensus (Raft/Paxos) commits require a majority acknowledging the current term, so the old leader cannot commit anything; (4) reduce pause risk (low-pause GC, memory limits) and alert on long pauses.</p>`, followUps: ['Why are leases alone unsafe without bounded clock drift?', 'How does Raft\'s check-quorum help?'] },
    { q: 'Pick consistency levels for a social network: posts, likes, follows, DMs, username registration.', level: 'E', a: `<p><b>Username registration</b>: linearizable compare-and-set (CP) — uniqueness. <b>Posts</b>: read-your-writes for the author, eventual for followers' feeds (fan-out async). <b>Likes</b>: eventual, CRDT counter (PA/EL) — approximate is fine. <b>Follows</b>: read-your-writes + monotonic reads (the user must see the follow immediately; others can lag). <b>DMs</b>: causal per conversation (replies after the messages they answer), ordered per conversation by a sequence from a conversation home shard; durable before ack. Explain costs: CP only on the rare uniqueness writes; everything else stays fast and available.</p>`, followUps: ['How do you show "username taken" quickly while keeping registration CP?', 'What would you do during a region partition for DMs?'] }
  );

  registerModule({
    id: 'hld10',
    title: 'Distributed Systems Theory',
    intro: `<p>Once your data lives on more than one machine, simple questions get hard: <i>which copy is the latest? what if the network splits? how do I know a server is dead and not just slow?</i> This module gives you the theory that every senior system-design answer leans on — explained with everyday analogies and animated step by step.</p>
<p>You will learn the <b>CAP theorem</b> and its more practical cousin <b>PACELC</b>, the ladder of <b>consistency models</b> (linearizable, causal, read-your-writes, monotonic reads, eventual), <b>quorums</b> and the famous <code>R + W &gt; N</code> rule, <b>Lamport and vector clocks</b> for ordering and conflict detection, <b>gossip protocols</b> for spreading information through thousands of nodes, and <b>failure detection</b> (heartbeats, phi accrual, SWIM). Every topic has a visualizer you can play with — split a cluster and watch CP refuse while AP serves stale data, change N/W/R and see the overlap, type your own event history and watch vector clocks tick.</p>`,
    goals: [
      'Classify any system or feature by CAP and PACELC and defend the choice with latency and failure numbers',
      'Name the exact consistency model a feature needs (linearizable, causal, read-your-writes, monotonic, eventual) and how to implement it',
      'Pick N, W and R for a workload and explain what anomalies remain even when R + W &gt; N',
      'Compute and compare vector clocks by hand to tell overwrites from concurrent (conflicting) writes',
      'Estimate gossip convergence time and design SWIM-style failure detection with sensible timeouts',
      'Explain why failure detectors can be wrong and how leases and fencing tokens keep systems safe anyway'
    ],
    prereqs: `<p>HLD 5 (Databases at Scale: replication and sharding), HLD 7 (Consistent Hashing) and HLD 6 (Caching). Comfort with basic probability and logarithms helps for the gossip and phi-accrual parts. This module prepares you for HLD 11 (Consensus, Coordination &amp; Distributed Transactions).</p>`,
    hours: 14,
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
