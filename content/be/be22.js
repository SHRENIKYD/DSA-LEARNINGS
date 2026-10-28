(function () {
var topics = [], practice = [], quiz = [], interview = [];

/* ---------- shared helpers for visualizers ---------- */
function bx(id, label, x, y) { return { id: id, label: label, x: x, y: y, shape: 'box' }; }
function toks(input, fallback, min, max) {
  var a = String(input === undefined || input === null ? fallback : input).trim().split(/[\s,]+/).filter(function (s) { return s.length; });
  if (a.length < min || a.length > max) throw new Error('Enter ' + min + ' to ' + max + ' items separated by spaces');
  return a.map(function (s) { return s.slice(0, 14); });
}
function nums(input, fallback, min, max) {
  var a = toks(input, fallback, min, max).map(Number);
  a.forEach(function (n) { if (!isFinite(n) || n < 0 || n > 999) throw new Error('Use whole numbers from 0 to 999'); });
  return a.map(Math.floor);
}
// Kafka's murmur2 (same as org.apache.kafka.common.utils.Utils.murmur2), for the partition visualizer.
function murmur2(str) {
  var b = [], i;
  for (i = 0; i < str.length; i++) { var c = str.charCodeAt(i); if (c < 128) b.push(c); else b.push(63); }
  var len = b.length, m = 0x5bd1e995, h = 0x9747b28c ^ len, n4 = len >> 2;
  for (i = 0; i < n4; i++) {
    var j = i * 4, k = (b[j] & 0xff) | ((b[j + 1] & 0xff) << 8) | ((b[j + 2] & 0xff) << 16) | ((b[j + 3] & 0xff) << 24);
    k = Math.imul(k, m); k ^= k >>> 24; k = Math.imul(k, m); h = Math.imul(h, m); h ^= k;
  }
  var t = len & ~3, r = len % 4;
  if (r === 3) h ^= (b[t + 2] & 0xff) << 16;
  if (r >= 2) h ^= (b[t + 1] & 0xff) << 8;
  if (r >= 1) { h ^= b[t] & 0xff; h = Math.imul(h, m); }
  h ^= h >>> 13; h = Math.imul(h, m); h ^= h >>> 15;
  return h;
}
function partitionFor(key, n) { return (murmur2(key) & 0x7fffffff) % n; }

/* =====================================================================
   TOPIC 1 — Topics, partitions, offsets, keys and ordering
   ===================================================================== */
topics.push({
  title: 'Kafka Anatomy: Topics, Partitions, Offsets, Keys and Ordering',
  analogy: `<p>Think of a big <b>bank with several numbered queues of paper ledgers</b>. Every new transaction is written on the next line of one ledger, and lines are never erased. Each line has a line number. The rule "all of customer Asha's transactions go into ledger 2" means Asha's history is always in order, while ledgers 0, 1 and 3 fill up in parallel for other customers.</p>
    <p>A Kafka <b>topic</b> is the set of ledgers, a <b>partition</b> is one ledger, an <b>offset</b> is the line number, and the <b>key</b> decides which ledger a record goes into.</p>`,
  explain: `<p><b>🟢 The plain idea.</b> be09 showed Kafka from the outside: a producer sends, a consumer reads. Here we open the box. A Kafka <b>topic</b> (say <code>orders</code>) is split into <b>partitions</b> — independent, append-only log files spread over brokers. Each record that lands in a partition gets the next <b>offset</b> (0, 1, 2, …). Offsets are per partition, so <code>orders-0</code> offset 7 and <code>orders-3</code> offset 7 are different records.</p>
    ${H.table(['Word', 'Plain meaning', 'Example'], [
      ['Record', 'key + value + headers + timestamp', 'key=<code>order-42</code>, value=<code>{"status":"PAID"}</code>'],
      ['Partition', 'one ordered append-only log; unit of parallelism and ordering', '<code>orders-2</code>'],
      ['Offset', 'position of a record inside one partition', '<code>orders-2 @ 1057</code>'],
      ['Leader / followers', 'one broker serves reads and writes for a partition; followers copy it', 'replication.factor=3'],
      ['ISR', 'in-sync replicas: followers that are caught up', 'min.insync.replicas=2'],
      ['KRaft controller', 'built-in Raft quorum storing cluster metadata (no ZooKeeper since Kafka 4.0)', '3 controller nodes']
    ])}
    <p><b>Where does a record go?</b> The producer decides, not the broker:</p>
    <ul>
      <li><b>Key present</b> → <code>partition = toPositive(murmur2(keyBytes)) % numPartitions</code>. Same key → same partition → <b>ordered</b> relative to each other.</li>
      <li><b>Key null</b> → the built-in partitioner fills a batch for one partition, then switches ("sticky"/uniform-sticky, Kafka 3.3+). Good for throughput, no ordering promise.</li>
      <li><b>Explicit partition</b> or a custom <code>Partitioner</code> → you choose.</li>
    </ul>
    <p><b>The ordering contract in one sentence:</b> Kafka orders records <b>within a partition only</b>. There is no global order across a topic. If "all events for an order must be processed in order", make <code>orderId</code> the key.</p>
    <p><b>Durability knobs:</b> with <code>acks=all</code> the leader answers only when every in-sync replica has the record; with <code>min.insync.replicas=2</code> and RF=3 you survive one broker loss without losing acknowledged writes, and writes are <i>rejected</i> (NotEnoughReplicas) rather than silently under-replicated if two brokers are gone.</p>`,
  clues: [
    '"events for the same order/user/account must be processed in order" → use that id as the Kafka key; ordering is per partition',
    '"we need to scale consumers to 50 instances" → you need at least 50 partitions; partitions cap consumer parallelism in a group',
    '"one customer generates 40% of traffic" → hot key / hot partition; consider key salting or a different key',
    '"we increased partitions and ordering broke" → key-to-partition mapping changed (hash mod N)',
    '"never lose an acknowledged write if a broker dies" → RF=3, acks=all, min.insync.replicas=2, unclean leader election off',
    '"ZooKeeper" in a 2026 question → Kafka 4.x runs only in KRaft mode'
  ],
  code: [
    { lang: 'js', run: true, title: 'Runnable model: key → partition with Kafka\'s murmur2 and what happens when partitions grow', code: `// Same murmur2 that Kafka's Java client uses for keyed records.
function murmur2(str) {
  const b = Buffer.from(str, 'utf8');
  const len = b.length, m = 0x5bd1e995;
  let h = 0x9747b28c ^ len;
  for (let i = 0; i < (len >> 2); i++) {
    const j = i * 4;
    let k = b[j] | (b[j + 1] << 8) | (b[j + 2] << 16) | (b[j + 3] << 24);
    k = Math.imul(k, m); k ^= k >>> 24; k = Math.imul(k, m);
    h = Math.imul(h, m); h ^= k;
  }
  const t = len & ~3, r = len % 4;
  if (r === 3) h ^= b[t + 2] << 16;
  if (r >= 2) h ^= b[t + 1] << 8;
  if (r >= 1) { h ^= b[t]; h = Math.imul(h, m); }
  h ^= h >>> 13; h = Math.imul(h, m); h ^= h >>> 15;
  return h;
}
const partitionFor = (key, n) => (murmur2(key) & 0x7fffffff) % n;

const keys = ['order-1', 'order-2', 'order-3', 'order-4', 'order-5', 'order-6', 'user-asha', 'user-ben'];
let moved = 0;
for (const k of keys) {
  const p6 = partitionFor(k, 6), p8 = partitionFor(k, 8);
  if (p6 !== p8) moved++;
  console.log(k.padEnd(10), '6 partitions ->', p6, '| 8 partitions ->', p8, p6 !== p8 ? '(MOVED)' : '');
}
console.log(moved + ' of ' + keys.length + ' keys changed partition after growing 6 -> 8.');
console.log('Records already written stay where they were, so per-key order is broken across the change.');` },
    { lang: 'java', check: false, title: 'Kafka Java client: keyed, durable producer (illustrative config)', code: `Properties p = new Properties();
p.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, System.getenv("KAFKA_BOOTSTRAP"));
p.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class.getName());
p.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, StringSerializer.class.getName());
p.put(ProducerConfig.ACKS_CONFIG, "all");                 // wait for all in-sync replicas
p.put(ProducerConfig.ENABLE_IDEMPOTENCE_CONFIG, "true");  // default since Kafka 3.0
p.put(ProducerConfig.LINGER_MS_CONFIG, "5");              // small wait to build batches
p.put(ProducerConfig.COMPRESSION_TYPE_CONFIG, "zstd");

try (KafkaProducer<String, String> producer = new KafkaProducer<>(p)) {
    String orderId = "order-42";
    // Key = orderId: every event of this order lands in the same partition, in send order.
    producer.send(new ProducerRecord<>("orders", orderId, "{\\"type\\":\\"OrderPaid\\"}"),
        (meta, ex) -> {
            if (ex != null) log.error("send failed", ex);
            else log.info("written to {}-{} @ {}", meta.topic(), meta.partition(), meta.offset());
        });
}` },
    { lang: 'bash', check: false, title: 'CLI: create a topic with durable settings (KRaft cluster)', code: `kafka-topics.sh --bootstrap-server "$KAFKA_BOOTSTRAP" --create --topic orders \\
  --partitions 12 --replication-factor 3 \\
  --config min.insync.replicas=2 --config retention.ms=604800000

kafka-topics.sh --bootstrap-server "$KAFKA_BOOTSTRAP" --describe --topic orders
# Topic: orders  Partition: 0  Leader: 2  Replicas: 2,3,1  Isr: 2,3,1 ...` }
  ],
  codeTitle: ['Key to partition model', 'Producer config', 'Topic CLI'],
  viz: {
    title: 'Keys flowing into partitions (real murmur2)',
    input: 'order-1 order-2 order-1 user-7 order-2 order-1 user-7',
    inputLabel: 'Record keys in send order (3-10 keys)',
    gen: function (input) {
      var keys = toks(input, 'order-1 order-2 order-1 user-7 order-2 order-1 user-7', 3, 10), N = 3, i, frames = [];
      var logs = [[], [], []];
      function parts(hlP, note) {
        var ps = [];
        for (var p = 0; p < N; p++) {
          var hl = {}; if (p === hlP && logs[p].length) hl[logs[p].length - 1] = 'ok';
          ps.push({ type: 'array', label: 'orders-' + p + ' (offsets)', values: logs[p].length ? logs[p].slice() : ['(empty)'], hl: hl, showIdx: true });
        }
        if (note) ps.push({ type: 'text', label: 'Rule', html: note });
        return ps;
      }
      frames.push({ narr: 'Topic <b>orders</b> has 3 partitions, each an empty append-only log. The producer will hash each key with murmur2 and take the result modulo 3.', parts: parts(-1, 'partition = (murmur2(key) &amp; 0x7fffffff) % 3') });
      for (i = 0; i < keys.length; i++) {
        var p = partitionFor(keys[i], N);
        logs[p].push(keys[i]);
        frames.push({ narr: 'Record with key <b>' + esc(keys[i]) + '</b> hashes to partition <b>' + p + '</b> and gets offset <b>' + (logs[p].length - 1) + '</b> there. Every earlier record with this key is in the same log, so their order is kept.', parts: parts(p) });
      }
      frames.push({ narr: 'Final picture: inside each partition records are strictly ordered by offset. Across partitions there is <b>no</b> order — a consumer of partition 0 may be ahead of or behind partition 2. That is why "order per key" is the promise, not "order per topic".', parts: parts(-1, 'Same key ⇒ same partition ⇒ ordered. Different keys ⇒ maybe different partitions ⇒ no order between them.') });
      return frames;
    }
  },
  examples: [
    { title: 'Choosing the key for a payments topic', html: `<p>Events: <code>PaymentAuthorized</code>, <code>PaymentCaptured</code>, <code>PaymentRefunded</code>. A refund must never be applied before its capture. Key by <code>paymentId</code> (or <code>orderId</code> if the consumer reasons per order). Keying by <code>merchantId</code> also keeps order, but one huge merchant would create a <span class="c-r">hot partition</span>.</p>` },
    { title: 'How many partitions?', html: `<p>Target 60 MB/s; one consumer instance processes ~5 MB/s; one partition comfortably handles ~10 MB/s of writes on your hardware. Consumers need ≥ 60/5 = <b>12</b> partitions; producers need ≥ 6. Pick <b>12–24</b> to leave growth room, because adding partitions later re-maps keys. Do not pick 1,000 "just in case": every partition costs file handles, replication traffic, and longer leader elections.</p>` },
    { title: 'Reading the describe output', html: `${H.table(['Partition', 'Leader', 'Replicas', 'Isr', 'Meaning'], [['0', '2', '2,3,1', '2,3,1', '<span class="c-g">healthy</span>'], ['1', '3', '3,1,2', '3,1', 'broker 2 lagging: under-replicated'], ['2', '1', '1,2,3', '1', '<span class="c-r">with min.insync=2, acks=all writes fail</span>']])}` },
    { title: 'Retry reordering', html: `<p>Before idempotence, a producer with <code>max.in.flight.requests.per.connection=5</code> could send batch A, batch B; A fails, B succeeds, A is retried → order B, A. With idempotence on (default since 3.0) the broker uses per-partition sequence numbers and keeps order with up to 5 in-flight requests.</p>` }
  ],
  deepDive: `<p><b>🟣 Under the hood.</b> A partition on disk is a directory of <b>segments</b> (<code>00000000000000001057.log</code> plus <code>.index</code> and <code>.timeindex</code>). Only the newest (active) segment is written; retention and compaction work on closed segments. Reads by offset use the sparse index then scan a few KB — that plus the OS page cache and zero-copy <code>sendfile</code> is why Kafka is fast on cheap disks.</p>
    <p><b>Replication:</b> followers fetch from the leader. The <b>high watermark</b> is the highest offset copied to all ISR members; consumers only see records below it, so they never read something that could vanish after a leader change. If <code>unclean.leader.election.enable=true</code> an out-of-sync replica may become leader and acknowledged data is lost — keep it false for business data.</p>
    <p><b>KRaft:</b> since Kafka 4.0 ZooKeeper mode is gone. Metadata (topics, partitions, ISR, configs) lives in an internal Raft log <code>__cluster_metadata</code> replicated across controller nodes; brokers replay it. Failover is faster and partition counts per cluster can go much higher than in the ZooKeeper era. Migration must happen on a 3.x bridge release before upgrading to 4.x.</p>
    <p><b>Hot partitions:</b> hash partitioning spreads <i>keys</i> evenly, not <i>traffic</i>. If one key is 40% of volume, one partition and one consumer carry 40%. Fixes: a finer key (<code>orderId</code> instead of <code>merchantId</code>), or salting (<code>merchantId#0..7</code>) when you can accept order only per salt bucket.</p>`,
  aiEra: `<p><b>🤖 AI era.</b> Assistants generate producer configs quickly but often copy outdated advice: <code>acks=1</code> "for speed", disabling idempotence, or mentioning ZooKeeper connection strings that no longer exist in Kafka 4.x. Review generated configs against current defaults. AI is genuinely useful for analysing key distribution: give it a sample of keys and the murmur2 rule (or run the model above) to find hot keys before go-live. Event streams are also how many AI features get fresh data (embedding pipelines, feature stores, agent event logs) — the same key and ordering rules apply: key by the entity whose updates must not be reordered, such as <code>documentId</code> for re-embedding.</p>`,
  problems: [
    {
      title: 'Pick Keys and Partition Count for a Ride Events Topic',
      level: 'Medium', tags: ['kafka', 'partitions', 'keys', 'ordering'], companies: ['Uber', 'Ola', 'Lyft'],
      statement: `<p>A ride-hailing app publishes <code>RideRequested</code>, <code>DriverAssigned</code>, <code>RideStarted</code>, <code>RideCompleted</code> and driver GPS pings (every 2 s per active driver, 200k active drivers at peak). Downstream, the billing service needs ride events in order; a live map needs each driver's latest pings in order. Choose topics, keys and partition counts.</p>`,
      constraints: `<p>Peak 100k GPS msgs/s (~200 bytes) · ride events 2k/s · one consumer instance handles ~8k msgs/s · partitions should not need to change for 2 years (3× growth).</p>`,
      example: `<p>Putting everything in one topic keyed by city: <span class="c-r">Mumbai is 30% of traffic → hot partition</span>, and billing must filter out GPS noise.</p>`,
      brute: { why: `<p>One topic <code>events</code>, key = null. Throughput looks great, but <code>RideCompleted</code> can be consumed before <code>RideStarted</code> because they land on different partitions; billing double-checks state and still bills wrong. Every consumer also has to read 100k/s of GPS it does not care about.</p>` },
      mcq: { q: 'Which key keeps each ride\'s lifecycle events in order without hot spots?', options: ['cityId', 'rideId', 'null (sticky partitioner)', 'eventType'], answer: 1, explain: 'rideId spreads evenly (millions of rides) and puts every event of one ride in one partition.' },
      hints: [
        `<p>Hint 1: two very different streams (rare business events vs. firehose pings) usually deserve two topics.</p>`,
        `<p>Hint 2: the key is "the entity whose events must not be reordered": a ride for billing, a driver for the map.</p>`,
        `<p>Hint 3: partitions ≥ peak msgs/s ÷ per-consumer msgs/s, times growth; round up to a number with many divisors.</p>`
      ],
      solution: {
        approach: `<p><b>Two topics.</b> (1) <code>ride-events</code> keyed by <code>rideId</code>: 2k/s × 3 growth = 6k/s, one consumer handles 8k/s, but take <b>12 partitions</b> for headroom and parallel billing workers; RF=3, <code>min.insync.replicas=2</code>, <code>acks=all</code>, retention 7 days (plus a sink to the warehouse). (2) <code>driver-locations</code> keyed by <code>driverId</code>: 100k × 3 = 300k/s ÷ 8k ≈ 38 consumers → <b>48 partitions</b> (divisible by 2, 3, 4, 6, 8, 12, 16, 24). Retention short (hours) or compacted, because only the latest location matters. Billing only subscribes to ride events. Never key by city (skew). Partitions are chosen up front because adding them later remaps keys.</p>`,
        complexity: `<p>Producer cost O(1) per record (hash + mod); consumer parallelism = number of partitions.</p>`,
        followUps: ['What if one driver id is very chatty because of a bug?', 'Would you compact driver-locations? What is the downside?']
      }
    }
  ]
});

function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

/* =====================================================================
   TOPIC 2 — Consumer groups and rebalancing
   ===================================================================== */
topics.push({
  title: 'Consumer Groups and Rebalancing (Eager, Cooperative, KIP-848)',
  analogy: `<p>A post office has 6 sorting bins and a team of clerks. The supervisor assigns bins: with 3 clerks, each gets 2 bins. If a 4th clerk arrives, bins are reshuffled. In the <b>old way</b> everyone drops their bins, stands still, and waits for a brand-new plan (stop-the-world). In the <b>new way</b> the supervisor only takes one bin from a busy clerk and hands it to the newcomer; everybody else keeps sorting.</p>
    <p>Bins are <b>partitions</b>, clerks are <b>consumers</b>, the team is a <b>consumer group</b>, and the supervisor is the <b>group coordinator</b> broker.</p>`,
  explain: `<p><b>🟢 The plain idea.</b> All consumers that share the same <code>group.id</code> split the topic's partitions between them: <b>each partition is owned by exactly one consumer in the group at a time</b>. Different groups are independent — billing and analytics each get every record.</p>
    ${H.table(['Consumers in group', 'Partitions (6)', 'Result'], [
      ['1', '6', 'one consumer reads all 6'],
      ['3', '6', '2 partitions each'],
      ['6', '6', '1 each — maximum parallelism'],
      ['8', '6', '<span class="c-r">2 consumers idle</span> — more consumers than partitions does not help']
    ])}
    <p><b>A rebalance</b> re-assigns partitions when membership or the subscription changes: a consumer starts, stops, crashes (no heartbeat within <code>session.timeout.ms</code>, default 45 s), or takes too long between <code>poll()</code> calls (<code>max.poll.interval.ms</code>, default 5 min), or partitions are added.</p>
    <p><b>Three generations of rebalance protocol:</b></p>
    <ul>
      <li><b>Eager</b> (classic, range/round-robin assignors): every member revokes <i>all</i> partitions, then a leader consumer computes a new plan. Everyone stops for the duration.</li>
      <li><b>Incremental cooperative</b> (<code>CooperativeStickyAssignor</code>, Kafka 2.4+): members keep partitions that do not move; only the moved partitions are revoked, in a second round. Much shorter pauses.</li>
      <li><b>Next-gen consumer protocol (KIP-848)</b>, GA in Kafka 4.0 with <code>group.protocol=consumer</code>: the <i>broker</i> computes assignments (server-side <code>uniform</code> or <code>range</code> assignors) and members reconcile incrementally through heartbeats. No global sync barrier; a slow member no longer stalls the whole group.</li>
    </ul>
    <p><b>Static membership</b> (<code>group.instance.id</code>, e.g. the pod name): a consumer that restarts within the session timeout gets its old partitions back <i>without</i> a rebalance — great for rolling deploys.</p>
    <p><b>Revocation hook:</b> before losing a partition a consumer should commit what it finished (<code>onPartitionsRevoked</code>), otherwise the new owner re-processes those records.</p>`,
  clues: [
    '"consumer lag grows during every deploy" → rebalance storms; use cooperative-sticky or KIP-848, static membership',
    '"consumer gets kicked out of the group while processing a big batch" → max.poll.interval.ms exceeded; lower max.poll.records or process async',
    '"we added 10 more consumers and nothing got faster" → consumers > partitions; idle members',
    '"duplicates appear after scaling up" → partitions moved before offsets were committed; commit in onPartitionsRevoked',
    '"two services both need every event" → two different consumer groups',
    '"Kafka 4.0 consumer rebalance" → KIP-848 broker-side assignment, group.protocol=consumer'
  ],
  code: [
    { lang: 'js', run: true, title: 'Runnable model: eager vs cooperative rebalance — how many partitions stop?', code: `// Assign partitions round-robin (eager) vs keep-what-you-have (sticky / cooperative).
function roundRobin(partitions, members) {
  const plan = {}; members.forEach(m => plan[m] = []);
  partitions.forEach((p, i) => plan[members[i % members.length]].push(p));
  return plan;
}
function sticky(prev, partitions, members) {
  const plan = {}; members.forEach(m => plan[m] = (prev[m] || []).slice());
  const owned = new Set(Object.values(plan).flat());
  const free = partitions.filter(p => !owned.has(p));
  const max = Math.ceil(partitions.length / members.length);
  const min = Math.floor(partitions.length / members.length);
  // members above the fair share give back their extra partitions (only those move)
  for (const m of members) while (plan[m].length > max) free.push(plan[m].pop());
  // members below the fair share take one from a member that has more than min
  for (const m of members) while (plan[m].length < min && free.length === 0) {
    const donor = members.find(x => plan[x].length > min);
    if (!donor) break;
    plan[m].push(plan[donor].pop());
  }
  for (const p of free) {
    const m = members.slice().sort((a, b) => plan[a].length - plan[b].length)[0];
    plan[m].push(p);
  }
  return plan;
}
function moved(before, after) {
  let n = 0;
  for (const m of Object.keys(after)) for (const p of after[m]) if (!(before[m] || []).includes(p)) n++;
  return n;
}
const parts = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const g1 = roundRobin(parts, ['A', 'B', 'C']);
console.log('3 members:', JSON.stringify(g1));

const eager = roundRobin(parts, ['A', 'B', 'C', 'D']);
console.log('eager, D joins:', JSON.stringify(eager));
console.log('  eager pauses ALL 12 partitions; ownership changed for', moved(g1, eager));

const coop = sticky(g1, parts, ['A', 'B', 'C', 'D']);
console.log('cooperative, D joins:', JSON.stringify(coop));
console.log('  cooperative pauses only', moved(g1, coop), 'partitions; the rest keep flowing');` },
    { lang: 'java', check: false, title: 'Kafka consumer with cooperative rebalancing, static membership and commit-on-revoke', code: `Properties c = new Properties();
c.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, System.getenv("KAFKA_BOOTSTRAP"));
c.put(ConsumerConfig.GROUP_ID_CONFIG, "billing");
c.put(ConsumerConfig.GROUP_INSTANCE_ID_CONFIG, System.getenv("HOSTNAME")); // static membership
// Kafka 4.x: opt into the KIP-848 protocol (broker-side assignment)
c.put(ConsumerConfig.GROUP_PROTOCOL_CONFIG, "consumer");
// With the classic protocol instead you would set:
// c.put(ConsumerConfig.PARTITION_ASSIGNMENT_STRATEGY_CONFIG, CooperativeStickyAssignor.class.getName());
c.put(ConsumerConfig.ENABLE_AUTO_COMMIT_CONFIG, "false");
c.put(ConsumerConfig.MAX_POLL_RECORDS_CONFIG, "200");

KafkaConsumer<String, String> consumer = new KafkaConsumer<>(c, new StringDeserializer(), new StringDeserializer());
Map<TopicPartition, OffsetAndMetadata> done = new ConcurrentHashMap<>();

consumer.subscribe(List.of("orders"), new ConsumerRebalanceListener() {
    public void onPartitionsRevoked(Collection<TopicPartition> parts) {
        consumer.commitSync(done);           // hand over cleanly: commit finished work
        parts.forEach(done::remove);
    }
    public void onPartitionsAssigned(Collection<TopicPartition> parts) { }
});` }
  ],
  codeTitle: ['Rebalance model', 'Consumer config'],
  viz: {
    title: 'Consumers join and leave a group of 6 partitions',
    input: '+A +B +C +D -B',
    inputLabel: 'Events: +X joins, -X leaves (3-8 events)',
    gen: function (input) {
      var ev = toks(input, '+A +B +C +D -B', 3, 8), members = [], plan = {}, P = 6, frames = [], i;
      function rows(hlm, movedSet) {
        var r = [];
        for (var p = 0; p < P; p++) {
          var owner = '—';
          for (var m in plan) if (plan[m].indexOf(p) >= 0) owner = m;
          r.push(['orders-' + p, owner, movedSet && movedSet[p] ? '<span class="c-y">moved (paused briefly)</span>' : '<span class="c-g">keeps flowing</span>']);
        }
        return { type: 'table', label: 'Assignment', columns: ['Partition', 'Owner', 'During this rebalance'], rows: r };
      }
      frames.push({ narr: 'Group <b>billing</b> subscribes to topic orders with 6 partitions. Nobody is in the group yet, so nothing is consumed.', parts: [rows()] });
      for (i = 0; i < ev.length; i++) {
        var e = ev[i], op = e.charAt(0), name = e.slice(1) || '?';
        if (op !== '+' && op !== '-') throw new Error('Each event starts with + or -, like +A or -B');
        var before = JSON.parse(JSON.stringify(plan));
        if (op === '+') { if (members.indexOf(name) < 0) { members.push(name); plan[name] = []; } }
        else { var ix = members.indexOf(name); if (ix >= 0) members.splice(ix, 1); delete plan[name]; }
        // cooperative-sticky style rebalance
        var free = [], p, m;
        for (p = 0; p < P; p++) { var own = false; for (m in plan) if (plan[m].indexOf(p) >= 0) own = true; if (!own) free.push(p); }
        if (members.length) {
          var target = Math.ceil(P / members.length);
          members.forEach(function (mm) { while (plan[mm].length > target) free.push(plan[mm].pop()); });
          var floorT = Math.floor(P / members.length);
          members.forEach(function (mm) { while (plan[mm].length < floorT && free.length === 0) { var donor = members.filter(function (x) { return plan[x].length > floorT; })[0]; if (!donor) break; plan[mm].push(plan[donor].pop()); } });
          free.sort(function (a, b) { return a - b; }).forEach(function (fp) {
            var best = members.slice().sort(function (a, b) { return plan[a].length - plan[b].length; })[0];
            plan[best].push(fp);
          });
        }
        var mv = {}, cnt = 0;
        for (m in plan) plan[m].forEach(function (pp) { if (!before[m] || before[m].indexOf(pp) < 0) { mv[pp] = true; cnt++; } });
        var idle = members.filter(function (x) { return plan[x].length === 0; });
        frames.push({ narr: (op === '+' ? '<b>' + esc(name) + ' joins.</b> ' : '<b>' + esc(name) + ' leaves</b> (or misses heartbeats for session.timeout.ms). ') + 'Cooperative rebalance: only <b>' + cnt + '</b> partition(s) change owner; the others never stop. ' + (idle.length ? '<span class="c-r">Idle: ' + idle.join(', ') + '</span> — more members than partitions.' : '') + ' An eager rebalance would have paused all 6.', parts: [rows(null, mv), { type: 'vars', label: 'Group', vals: { members: members.join(',') || '(none)', generation: i + 1 } }] });
      }
      frames.push({ narr: 'Takeaway: partition count caps parallelism, and every membership change costs a rebalance. Static membership avoids rebalances on quick restarts; KIP-848 moves the planning to the broker so slow members do not block others.', parts: [rows()] });
      return frames;
    }
  },
  examples: [
    { title: 'Why the consumer keeps getting kicked out', html: `<p>Each <code>poll()</code> returns up to 500 records; each takes 1 s to process (an HTTP call). 500 s &gt; <code>max.poll.interval.ms</code> 300 s → the consumer is considered dead, its partitions move, its commit fails with <code>CommitFailedException</code>, and another member re-processes the same records. Fix: <code>max.poll.records=50</code>, faster processing, or hand off to a bounded worker pool with pause/resume.</p>` },
    { title: 'Rolling deploy of 12 pods', html: `<p>Without static membership: each pod restart = leave + join = 2 rebalances → 24 rebalances per deploy. With <code>group.instance.id=$HOSTNAME</code> and a session timeout longer than restart time: <b>0</b> rebalances; the pod comes back to the same partitions.</p>` },
    { title: 'Fan-out with groups', html: `${H.table(['Group', 'Purpose', 'Reads'], [['billing', 'charge customers', 'every record once (split across members)'], ['search-indexer', 'update search', 'every record once'], ['audit', 'store to S3', 'every record once']])}<p>One write, three independent readers, each with its own offsets.</p>` }
  ],
  deepDive: `<p><b>🟣 Mechanics.</b> Each group has a <b>coordinator</b>: the leader of the <code>__consumer_offsets</code> partition chosen by <code>hash(group.id)</code>. In the classic protocol members send JoinGroup; the coordinator picks one member as group leader, which runs the client-side assignor and returns the plan in SyncGroup. A <b>generation id</b> increases each rebalance; commits from an old generation are rejected (fencing zombies).</p>
    <p><b>Cooperative</b> works in two rounds: round 1 everyone reports current ownership; the assignor removes only partitions that must move; owners revoke them; round 2 hands them over. <b>KIP-848</b> drops JoinGroup/SyncGroup: members send <code>ConsumerGroupHeartbeat</code>, the coordinator holds a target assignment and each member converges at its own pace, with epochs per member. Some client features (custom client-side assignors) work differently, so test before switching.</p>
    <p><b>Liveness</b> has two timers: heartbeats from a background thread (session timeout) detect crashed processes; <code>max.poll.interval.ms</code> detects a stuck processing loop. Long processing needs either smaller batches or <code>pause()</code> on the partitions while workers run, still calling <code>poll()</code> to stay alive.</p>
    <p><b>Share groups (KIP-932, "queues for Kafka")</b> let many consumers read the same partition with per-record acknowledgement — a queue-like model. They arrived as early access in 4.0 and have been maturing through the 4.x line; check your version's status before relying on them.</p>`,
  aiEra: `<p><b>🤖 AI era.</b> LLM-powered consumers (classify a ticket, summarise a document) are slow and variable: 2–30 s per record. That is the classic trap of exceeding <code>max.poll.interval.ms</code> and triggering rebalance loops. Pattern: small <code>max.poll.records</code>, an async worker pool with bounded concurrency matched to your model rate limit, <code>pause()</code>/<code>resume()</code> for back-pressure, and commits only up to the lowest fully-finished offset. AI assistants can read consumer-lag dashboards and rebalance logs and point to the timer that fired — but verify against the generation ids and timestamps yourself.</p>`,
  problems: [
    {
      title: 'Stop the Rebalance Storm During Deploys',
      level: 'Medium', tags: ['kafka', 'consumer-group', 'rebalance'], companies: ['LinkedIn', 'Confluent', 'Walmart'],
      statement: `<p>A group of 20 consumers reads a 40-partition topic. During every Kubernetes rolling deploy, lag spikes for 15 minutes and duplicates show up downstream. Logs show dozens of "Revoking all partitions" lines and some <code>CommitFailedException</code>s. Diagnose and fix.</p>`,
      constraints: `<p>Kafka 3.9 cluster being upgraded to 4.1 · pods restart in ~40 s · processing is ~50 ms/record · max.poll.records=500.</p>`,
      example: `<p>Pod 7 restarts → leave → eager rebalance (all 40 paused) → pod 7 back → join → another full rebalance. ×20 pods.</p>`,
      brute: { why: `<p>Raising <code>session.timeout.ms</code> to 10 minutes hides crashes for 10 minutes, and does not fix the eager stop-the-world or the commit failures.</p>` },
      mcq: { q: 'Which change alone removes rebalances for a pod that restarts quickly?', options: ['More partitions', 'Static membership with group.instance.id', 'acks=all', 'auto.offset.reset=latest'], answer: 1, explain: 'A static member that rejoins within the session timeout reclaims its partitions without a rebalance.' },
      hints: [
        `<p>Hint 1: "Revoking all partitions" means the eager protocol is in use.</p>`,
        `<p>Hint 2: 500 records × 50 ms = 25 s per poll loop — fine, but check for slow outliers; the commit failures come from generation changes mid-batch.</p>`,
        `<p>Hint 3: combine static membership, cooperative/KIP-848 rebalancing, and commit-on-revoke with an idempotent sink.</p>`
      ],
      solution: {
        approach: `<p>(1) Set <code>group.instance.id</code> to the stable pod name (StatefulSet) and <code>session.timeout.ms</code> ≈ 60–90 s so a 40 s restart does not trigger any rebalance. (2) Switch from eager to <code>CooperativeStickyAssignor</code> now (rolling switch requires listing both assignors for one deploy), then after the 4.x upgrade move to <code>group.protocol=consumer</code> (KIP-848). (3) Commit finished offsets in <code>onPartitionsRevoked</code>, and use manual commits after processing. (4) Lower <code>max.poll.records</code> to 100 so a poll loop is comfortably under <code>max.poll.interval.ms</code>. (5) Make the sink idempotent so the few remaining duplicates are harmless. Watch rebalance rate and lag per partition to confirm.</p>`,
        complexity: `<p>Rebalances per deploy drop from ~2×pods to ~0; moved partitions per real membership change drop from all to ~P/members.</p>`,
        followUps: ['What happens if a static member really dies?', 'How would you migrate from eager to cooperative safely?']
      }
    }
  ]
});

/* =====================================================================
   TOPIC 3 — Offsets, commits, retention and compaction
   ===================================================================== */
topics.push({
  title: 'Offsets, Commits, Retention and Log Compaction',
  analogy: `<p>Reading a long novel with a <b>bookmark</b>. The book (log) does not change when you read it; the bookmark (committed offset) just says "next time, start at page 120". If you move the bookmark <i>before</i> you read a chapter and fall asleep, you skip it. If you move it <i>after</i>, you may re-read a few pages after a nap — annoying but nothing is missed.</p>
    <p>Old library copies are thrown away after a while (<b>retention</b>), or the library keeps only the <b>latest edition</b> of each title (<b>compaction</b>).</p>`,
  explain: `<p><b>🟢 The plain idea.</b> Kafka does not delete a record when someone reads it. Each consumer group stores its position per partition in the internal topic <code>__consumer_offsets</code>. The committed value is the <b>offset of the next record to read</b> (last processed + 1).</p>
    ${H.table(['When you commit', 'If the consumer crashes in between', 'Guarantee'], [
      ['<b>before</b> processing', 'records after the commit point are skipped', '<span class="c-r">at-most-once</span> (may lose)'],
      ['<b>after</b> processing', 'records since the last commit are re-read', '<span class="c-g">at-least-once</span> (may duplicate)'],
      ['in the <b>same transaction</b> as the output (Kafka→Kafka EOS, or DB storing offsets)', 'neither', 'exactly-once <i>effect</i>']
    ])}
    <p><b>Auto-commit</b> (<code>enable.auto.commit=true</code>, every 5 s) commits during <code>poll()</code> the offsets returned by the <i>previous</i> poll. With simple synchronous processing in the poll loop that is at-least-once; with async hand-off to threads it can commit records you have not finished → loss. Most services use manual <code>commitSync</code>/<code>commitAsync</code> after processing.</p>
    <p><b>No committed offset yet?</b> <code>auto.offset.reset</code> decides: <code>latest</code> (default — only new records), <code>earliest</code> (from the start of what is retained), or <code>none</code> (error).</p>
    <p><b>Retention</b> (<code>cleanup.policy=delete</code>): whole closed segments are deleted when older than <code>retention.ms</code> (default 7 days) or when the partition exceeds <code>retention.bytes</code>. Consumers that fall further behind than retention lose data and jump to the reset policy.</p>
    <p><b>Compaction</b> (<code>cleanup.policy=compact</code>): Kafka eventually keeps at least the <b>latest record per key</b>. A record with a <code>null</code> value is a <b>tombstone</b> meaning "delete this key"; tombstones are kept for <code>delete.retention.ms</code> (default 1 day) so slow consumers can see them. Compacted topics are tables you can replay: user profiles, product prices, config, Kafka Streams changelogs. <code>compact,delete</code> combines both.</p>`,
  clues: [
    '"we lost messages after a crash" + auto-commit + async workers → offsets committed before processing',
    '"after restart we reprocess the last few seconds" → normal at-least-once; make the consumer idempotent',
    '"rebuild a cache/read model from Kafka on startup" → compacted topic keyed by entity id',
    '"GDPR delete user" in a compacted topic → produce a tombstone (null value) for the key',
    '"consumer was down for 10 days" with 7-day retention → OffsetOutOfRange; data gone, auto.offset.reset decides',
    '"replay last 3 days after a bug fix" → reset group offsets by timestamp (kafka-consumer-groups --reset-offsets --to-datetime)'
  ],
  code: [
    { lang: 'js', run: true, title: 'Runnable model: commit before vs after processing, with a crash', code: `// Partition log of 8 records. The consumer crashes while processing record 5.
const log = ['r0', 'r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'r7'];

function run(strategy) {
  let committed = 0;                 // next offset to read
  const processed = [];
  const batchSize = 3;
  let crashed = false;
  // first life of the consumer
  for (let start = committed; start < log.length && !crashed; start = committed) {
    const batch = log.slice(start, start + batchSize);
    if (strategy === 'before') committed = start + batch.length;   // commit first
    for (let i = 0; i < batch.length; i++) {
      if (start + i === 5) { crashed = true; break; }               // crash!
      processed.push(batch[i]);
    }
    if (!crashed && strategy === 'after') committed = start + batch.length;
  }
  // second life: restart from the committed offset
  for (let o = committed; o < log.length; o++) processed.push(log[o]);
  const lost = log.filter(r => !processed.includes(r));
  const dup = processed.filter((r, i) => processed.indexOf(r) !== i);
  console.log(strategy.padEnd(6), 'restart at', committed, '| lost:', JSON.stringify(lost), '| duplicates:', JSON.stringify(dup));
}
run('before');   // at-most-once
run('after');    // at-least-once` },
    { lang: 'java', title: 'Plain Java model: log compaction keeps the latest value per key and honours tombstones', code: `import java.util.*;

public class CompactionModel {
    record Rec(long offset, String key, String value) {}   // value == null is a tombstone

    // Keep the last record per key; drop tombstones older than the tombstone horizon.
    static List<Rec> compact(List<Rec> log, long tombstoneHorizonOffset) {
        Map<String, Rec> latest = new LinkedHashMap<>();
        for (Rec r : log) latest.put(r.key(), r);
        List<Rec> out = new ArrayList<>();
        for (Rec r : log) {
            Rec last = latest.get(r.key());
            if (last != r) continue;                                     // superseded
            if (r.value() == null && r.offset() < tombstoneHorizonOffset) continue; // old tombstone removed
            out.add(r);                                                  // offsets are kept, gaps are fine
        }
        return out;
    }

    public static void main(String[] args) {
        List<Rec> log = List.of(
            new Rec(0, "u1", "Asha"), new Rec(1, "u2", "Ben"), new Rec(2, "u1", "Asha K"),
            new Rec(3, "u3", "Chen"), new Rec(4, "u2", null), new Rec(5, "u3", "Chen L"));
        System.out.println(compact(log, 0));   // tombstone for u2 still visible
        System.out.println(compact(log, 10));  // later: tombstone itself is cleaned
    }
}` },
    { lang: 'bash', check: false, title: 'Inspect lag and replay a group from a timestamp', code: `kafka-consumer-groups.sh --bootstrap-server "$KAFKA_BOOTSTRAP" --describe --group billing
# TOPIC  PARTITION  CURRENT-OFFSET  LOG-END-OFFSET  LAG
# orders 0          10500           10520           20

# group must be inactive (consumers stopped) to reset
kafka-consumer-groups.sh --bootstrap-server "$KAFKA_BOOTSTRAP" --group billing --topic orders \\
  --reset-offsets --to-datetime 2026-10-25T00:00:00.000 --execute` }
  ],
  codeTitle: ['Commit timing model', 'Compaction model', 'Lag and replay'],
  viz: {
    title: 'Compaction of a keyed log (tombstone = key with value -)',
    input: 'u1=A u2=B u1=A2 u3=C u2=- u3=C2',
    inputLabel: 'key=value records in order; value - is a tombstone (3-10)',
    gen: function (input) {
      var recs = toks(input, 'u1=A u2=B u1=A2 u3=C u2=- u3=C2', 3, 10).map(function (t, i) {
        var kv = t.split('='); if (kv.length !== 2 || !kv[0] || !kv[1]) throw new Error('Use key=value, like u1=A (value - means delete)');
        return { o: i, k: kv[0], v: kv[1] };
      });
      function vals(list) { return list.map(function (r) { return r.k + '=' + (r.v === '-' ? '∅' : r.v); }); }
      var frames = [], latest = {}, i;
      frames.push({ narr: 'A compacted topic starts like any log: every update is appended with a new offset. Nothing has been cleaned yet.', parts: [{ type: 'array', label: 'Log (offset ▸ record)', values: vals(recs), showIdx: true }] });
      for (i = 0; i < recs.length; i++) {
        var hl = {}; hl[i] = 'cur';
        if (latest[recs[i].k] !== undefined) hl[latest[recs[i].k]] = 'bad';
        var prev = latest[recs[i].k];
        latest[recs[i].k] = i;
        frames.push({ narr: 'Cleaner scans offset ' + i + ': key <b>' + esc(recs[i].k) + '</b>' + (prev !== undefined ? ' — the older record at offset ' + prev + ' is now <span class="c-r">superseded</span>.' : ' is seen for the first time.') + (recs[i].v === '-' ? ' This record has a null value: a <b>tombstone</b> meaning "delete this key".' : ''), parts: [{ type: 'array', label: 'Log', values: vals(recs), hl: hl, showIdx: true }, { type: 'map', label: 'Latest offset per key', entries: Object.keys(latest).map(function (k) { return [k, latest[k]]; }) }] });
      }
      var kept = recs.filter(function (r) { return latest[r.k] === r.o; });
      frames.push({ narr: 'After compaction only the latest record per key survives. <b>Offsets keep their original numbers</b> (gaps are normal). The tombstone stays for <code>delete.retention.ms</code> so consumers learn about the delete.', parts: [{ type: 'array', label: 'Compacted', values: vals(kept), idxLabels: kept.map(function (r) { return String(r.o); }) }] });
      var final = kept.filter(function (r) { return r.v !== '-'; });
      frames.push({ narr: 'Later the tombstones themselves are removed. A new consumer reading from offset 0 now rebuilds the current table: exactly one row per live key.', parts: [{ type: 'array', label: 'After tombstone horizon', values: final.length ? vals(final) : ['(empty)'], idxLabels: final.length ? final.map(function (r) { return String(r.o); }) : undefined }, { type: 'kv', label: 'Rebuilt table', entries: final.map(function (r) { return [r.k, r.v]; }) }].map(function (p) { if (p.type === 'kv') { p.type = 'map'; } return p; }) });
      return frames;
    }
  },
  examples: [
    { title: 'Lag arithmetic', html: `<p>Log-end offset 10,520, committed 10,500 → lag 20 records. If producers write 2,000/s and the group handles 1,800/s, lag grows 200/s = 720k/hour. With 7-day retention you have time; with 1-hour retention you are losing data in ~hours. Alert on lag <i>trend</i> and time-lag, not just a number.</p>` },
    { title: 'Compacted topic as a cache warm-up', html: `<p>A pricing service keeps <code>product-prices</code> (compacted, key = productId). On startup it reads from offset 0 to the end into a HashMap: ~2M keys, a few seconds. No database query, and it stays fresh by continuing to consume.</p>` },
    { title: 'Commit per batch, not per record', html: `<p><code>commitSync</code> per record = one broker round-trip each (~2–5 ms) → throughput collapses. Commit once per <code>poll()</code> batch or every N ms; with an idempotent sink the few re-processed records after a crash do no harm.</p>` },
    { title: 'Compaction is not instant', html: `<p>The cleaner only works on closed segments and when the dirty ratio exceeds <code>min.cleanable.dirty.ratio</code> (0.5). Readers may still see several old values per key. Consumers must handle "multiple updates for the same key" anyway.</p>` }
  ],
  deepDive: `<p><b>🟣 Details that bite.</b> <code>__consumer_offsets</code> is itself a compacted topic keyed by (group, topic, partition). Committed offsets of an empty group expire after <code>offsets.retention.minutes</code> (default 7 days); a group that comes back after that starts from <code>auto.offset.reset</code>.</p>
    <p><b>Async processing and commits:</b> if records 10–19 run in parallel and 10, 11, 13 finish, you may only commit <b>12</b> (next after the contiguous finished prefix). Track per-partition "finished set" and commit the low watermark. Libraries like Confluent's Parallel Consumer do this with per-key ordering.</p>
    <p><b>Retention is per segment:</b> a segment is deleted only when its newest record is older than retention, so data can live up to retention + <code>segment.ms</code>. Tiered storage (KIP-405, production-ready in 3.9) moves closed segments to object storage, making long retention cheap without changing client behaviour.</p>
    <p><b>Compaction guarantees:</b> the latest value per key is always kept; order of surviving records is preserved; offsets never change; a consumer that stays within <code>delete.retention.ms</code> of the head sees every tombstone. A compacted topic is not a database: no secondary indexes, no point reads — you replay it into something that has them.</p>`,
  aiEra: `<p><b>🤖 AI era.</b> Compacted topics are a natural source for "current state" feeds into vector indexes and feature stores: key by document or entity id, and a tombstone becomes "delete this embedding". Replaying a compacted topic rebuilds the index after a model change. Assistants are good at writing the offset-tracking bookkeeping for parallel processing, but test the low-watermark logic with crash scenarios like the model above — subtle off-by-one commits are exactly the bugs AI-generated code tends to hide.</p>`,
  problems: [
    {
      title: 'Find Why Orders Were Lost After a Pod Crash',
      level: 'Medium', tags: ['kafka', 'offsets', 'auto-commit', 'delivery'], companies: ['Flipkart', 'Shopify', 'Zalando'],
      statement: `<p>An order-fulfilment consumer uses <code>enable.auto.commit=true</code>. Its poll loop submits each record to a thread pool and immediately polls again. After an OOM kill, 37 orders were never fulfilled. Explain the loss and design the fix.</p>`,
      constraints: `<p>~500 orders/s · processing 200 ms per order (calls the warehouse API) · must not lose orders · duplicates must be harmless.</p>`,
      example: `<p>Poll returns 0–99, submits to pool, polls again → auto-commit stores 100. Pod dies with 40–99 still in the pool → after restart reading starts at 100.</p>`,
      brute: { why: `<p>Turning auto-commit interval down to 100 ms changes nothing: the commit still covers records handed to threads but not finished.</p>` },
      mcq: { q: 'What offset is safe to commit when records 0–9 are done, 10 is still running, and 11–15 are done?', options: ['16', '11', '10', '15'], answer: 2, explain: 'Commit the next offset after the contiguous finished prefix: 0–9 done → commit 10.' },
      hints: [
        `<p>Hint 1: auto-commit commits what poll returned, not what your threads finished.</p>`,
        `<p>Hint 2: track per partition which offsets finished and commit the contiguous prefix.</p>`,
        `<p>Hint 3: add an idempotency key (orderId) at the warehouse call so the re-processing after a crash is safe.</p>`
      ],
      solution: {
        approach: `<p>Disable auto-commit. For each partition keep a sorted set of in-flight offsets; when a task completes, remove it and commit <code>min(inFlight)</code> (or last finished+1 if none in flight) via <code>commitAsync</code> on the poll thread every ~1 s, and <code>commitSync</code> in <code>onPartitionsRevoked</code> and on shutdown. Bound the pool and <code>pause()</code> partitions when it is full so memory cannot explode (the OOM). Keep per-key order if needed by routing a key to one worker. Make the warehouse call idempotent with <code>orderId</code> as the idempotency key, or record processed ids in an inbox table — after a crash, records since the last commit are re-run safely. Result: at-least-once with harmless duplicates, no loss.</p>`,
        complexity: `<p>O(log k) per completion with a TreeSet of k in-flight offsets; commits are batched.</p>`,
        followUps: ['How would per-key ordering interact with the worker pool?', 'What metric would have caught this?']
      }
    }
  ]
});

/* =====================================================================
   TOPIC 4 — Delivery semantics, idempotent and transactional producers
   ===================================================================== */
topics.push({
  title: 'Delivery Semantics: Idempotent and Transactional Producers (Exactly-Once)',
  analogy: `<p>You post a cheque to the bank and the receipt slip gets lost. Do you post another? If the bank stamps each cheque with your <b>cheque number</b> and refuses a second cheque with the same number, re-sending is safe — that is the <b>idempotent producer</b>.</p>
    <p>Now imagine moving money between two accounts <i>and</i> writing "done" in your notebook: either all three happen or none. That bundle is a <b>transaction</b>.</p>`,
  explain: `<p><b>🟢 The plain idea.</b> Networks fail <i>after</i> the broker wrote your record but <i>before</i> you got the "ok". The producer retries, so without help the record is written twice.</p>
    ${H.table(['Level', 'How', 'Risk'], [
      ['At-most-once', 'acks=0 or no retries, commit before processing', 'loss'],
      ['At-least-once', 'acks=all + retries; commit after processing', 'duplicates'],
      ['Exactly-once (Kafka → Kafka)', 'idempotent producer + transactions + read_committed consumers', 'only inside Kafka; side effects outside still need idempotency']
    ])}
    <p><b>Idempotent producer</b> (<code>enable.idempotence=true</code>, default since Kafka 3.0, requires <code>acks=all</code>): the broker gives each producer a <b>producer id (PID)</b> and epoch; every batch to a partition carries a <b>sequence number</b>. A retried batch with a sequence the broker already wrote is acknowledged but not appended again; a gap (sequence too high) is an error. This removes duplicates caused by retries and keeps order with up to 5 in-flight requests — per partition, per producer session.</p>
    <p><b>Transactions</b> (<code>transactional.id</code>): a producer can write to several partitions <b>and</b> commit consumer offsets atomically:</p>
    <ol>
      <li><code>initTransactions()</code> — registers the transactional.id, bumps the epoch, fences older instances with the same id ("zombies").</li>
      <li><code>beginTransaction()</code>, <code>send()</code> outputs…</li>
      <li><code>sendOffsetsToTransaction(offsets, consumer.groupMetadata())</code> — input offsets become part of the transaction.</li>
      <li><code>commitTransaction()</code> — the transaction coordinator writes commit markers into every partition touched.</li>
    </ol>
    <p>Consumers with <code>isolation.level=read_committed</code> only see records of committed transactions (they read up to the <b>last stable offset</b>); aborted records are filtered out. That is <b>read-process-write exactly-once</b>, what Kafka Streams enables with <code>processing.guarantee=exactly_once_v2</code>.</p>
    <p><b>The honest limit:</b> if your consumer calls an email API or writes to Postgres, Kafka transactions cannot cover that. You still need an idempotent consumer, the outbox, or storing offsets in the same DB transaction (Topic 7).</p>`,
  clues: [
    '"producer retries cause duplicate records" → enable.idempotence (default true since 3.0) with acks=all',
    '"consume, transform, produce with no duplicates and no loss" → transactions + sendOffsetsToTransaction + read_committed',
    '"two instances of the same processor after a network partition" → transactional.id fencing via producer epoch',
    '"exactly-once delivery to an external DB/API" → not from Kafka alone; idempotent sink or offsets stored with the data',
    '"consumer sees records from aborted transactions" → isolation.level defaults to read_uncommitted'
  ],
  code: [
    { lang: 'js', run: true, title: 'Runnable model: broker-side dedupe with producer id + sequence numbers', code: `// One partition on the broker remembers the last sequence per producer id.
class Partition {
  constructor() { this.log = []; this.lastSeq = new Map(); }
  append(pid, epoch, seq, value) {
    const st = this.lastSeq.get(pid) || { epoch, seq: -1 };
    if (epoch < st.epoch) return 'FENCED (old epoch: a zombie producer)';
    if (epoch > st.epoch) { st.epoch = epoch; st.seq = -1; }
    if (seq <= st.seq) return 'DUPLICATE ignored, ack sent again';
    if (seq !== st.seq + 1) return 'OUT_OF_ORDER_SEQUENCE error';
    this.log.push(value); st.seq = seq; this.lastSeq.set(pid, st);
    return 'appended at offset ' + (this.log.length - 1);
  }
}
const p = new Partition();
console.log(p.append(7, 0, 0, 'A'));
console.log(p.append(7, 0, 1, 'B'));   // broker writes B, but the ack is lost
console.log(p.append(7, 0, 1, 'B'));   // producer retries B
console.log(p.append(7, 0, 3, 'D'));   // a gap: seq 2 never arrived
console.log(p.append(7, 1, 0, 'C'));   // new epoch after initTransactions (restart)
console.log(p.append(7, 0, 2, 'X'));   // the old instance wakes up
console.log('log =', JSON.stringify(p.log));` },
    { lang: 'java', check: false, title: 'Kafka transactions: read-process-write exactly once', code: `producerProps.put(ProducerConfig.TRANSACTIONAL_ID_CONFIG, "fx-converter-" + instanceOrdinal);
KafkaProducer<String, String> producer = new KafkaProducer<>(producerProps);
producer.initTransactions();                       // fences any zombie with the same id

consumerProps.put(ConsumerConfig.ISOLATION_LEVEL_CONFIG, "read_committed");
consumerProps.put(ConsumerConfig.ENABLE_AUTO_COMMIT_CONFIG, "false");
consumer.subscribe(List.of("payments"));

while (running) {
    ConsumerRecords<String, String> recs = consumer.poll(Duration.ofMillis(200));
    if (recs.isEmpty()) continue;
    producer.beginTransaction();
    try {
        Map<TopicPartition, OffsetAndMetadata> offsets = new HashMap<>();
        for (ConsumerRecord<String, String> r : recs) {
            producer.send(new ProducerRecord<>("payments-usd", r.key(), convert(r.value())));
            offsets.put(new TopicPartition(r.topic(), r.partition()), new OffsetAndMetadata(r.offset() + 1));
        }
        producer.sendOffsetsToTransaction(offsets, consumer.groupMetadata());
        producer.commitTransaction();               // outputs + input offsets, atomically
    } catch (ProducerFencedException e) {
        producer.close(); throw e;                  // a newer instance owns this id
    } catch (KafkaException e) {
        producer.abortTransaction();                // outputs invisible to read_committed
        rewindToLastCommitted(consumer);            // re-read the batch
    }
}` }
  ],
  codeTitle: ['Sequence-number dedupe model', 'Transactional loop'],
  viz: {
    title: 'A transaction: outputs and offsets commit together',
    input: 'ok',
    inputLabel: 'Outcome: ok or abort',
    gen: function (input) {
      var mode = String(input === undefined ? 'ok' : input).trim().toLowerCase();
      if (mode !== 'ok' && mode !== 'abort') throw new Error('Type ok or abort');
      var nodes = [bx('in', 'payments (input)', 10, 10), bx('app', 'processor', 40, 30), bx('tc', 'txn coordinator', 75, 8), bx('out', 'payments-usd', 75, 32), bx('off', '__consumer_offsets', 75, 52), bx('rc', 'read_committed consumer', 40, 55)];
      var edges = [['in', 'app', 'poll'], ['app', 'tc'], ['app', 'out'], ['app', 'off'], ['out', 'rc']];
      function g(hl, ehl, tags) { return { type: 'graph', directed: true, height: 62, nodes: nodes, edges: edges, hl: hl || {}, ehl: ehl || {}, tags: tags || {} }; }
      var f = [];
      f.push({ narr: '<code>initTransactions()</code>: the processor registers its <b>transactional.id</b> with the coordinator, which bumps the <b>epoch</b>. Any older instance with the same id is now fenced.', parts: [g({ app: 'cur', tc: 'ok' }, { 'app-tc': 'ok' }, { tc: 'epoch 5' })] });
      f.push({ narr: 'It polls a batch of input records (offsets 100–149) and calls <code>beginTransaction()</code>.', parts: [g({ in: 'cur', app: 'cur' }, { 'in-app': 'win' })] });
      f.push({ narr: 'Converted records are <b>sent</b> to payments-usd. They are physically in the log already, but marked as part of an open transaction.', parts: [g({ out: 'win' }, { 'app-out': 'win' }, { out: 'pending' })] });
      f.push({ narr: '<code>sendOffsetsToTransaction</code>: "input offset 150" is written to __consumer_offsets <b>inside the same transaction</b>.', parts: [g({ off: 'win' }, { 'app-off': 'win' }, { out: 'pending', off: 'pending 150' })] });
      f.push({ narr: 'Meanwhile a read_committed consumer reading payments-usd stops at the <b>last stable offset</b>: it cannot see the pending records yet.', parts: [g({ rc: 'cur' }, { 'out-rc': 'bad' }, { rc: 'waits at LSO' })] });
      if (mode === 'ok') {
        f.push({ narr: '<code>commitTransaction()</code>: the coordinator writes COMMIT markers to payments-usd and __consumer_offsets. Outputs become visible and the input offset moves to 150 — atomically.', parts: [g({ tc: 'ok', out: 'ok', off: 'ok' }, { 'app-tc': 'ok' }, { out: 'committed', off: '150' })] });
        f.push({ narr: 'The read_committed consumer now reads the batch exactly once. If the processor had crashed before the commit, the transaction would be aborted on timeout and the batch re-read from offset 100.', parts: [g({ rc: 'ok' }, { 'out-rc': 'ok' })] });
      } else {
        f.push({ narr: '<code>abortTransaction()</code> (or the processor crashed): ABORT markers are written. The records stay in the log but are <b>filtered out</b> for read_committed readers; the offset stays at 100.', parts: [g({ tc: 'bad', out: 'bad', off: 'bad' }, { 'app-tc': 'bad' }, { out: 'aborted', off: 'still 100' })] });
        f.push({ narr: 'The processor re-reads 100–149 and tries again in a new transaction. Downstream never saw a half-written batch — no duplicates, no loss inside Kafka.', parts: [g({ app: 'cur', in: 'cur' }, { 'in-app': 'win' })] });
      }
      return f;
    }
  },
  examples: [
    { title: 'Which guarantee does this setup give?', html: `${H.table(['Setup', 'Guarantee'], [['acks=1, retries, auto-commit', 'at-least-once (and loss if leader dies before replicating)'], ['acks=all, idempotent, commit after DB write', 'at-least-once; DB must dedupe'], ['transactions + read_committed, output to Kafka', 'exactly-once within Kafka'], ['transactions, output = HTTP call', 'at-least-once for the HTTP call']])}` },
    { title: 'Zombie fencing', html: `<p>Instance A pauses for a 60 s GC. The group rebalances and instance B takes the partition with the same <code>transactional.id</code>. B's <code>initTransactions()</code> bumps the epoch; when A wakes and tries to commit, the broker returns <code>ProducerFenced</code>. A's half-done work is aborted.</p>` },
    { title: 'Cost of transactions', html: `<p>Each commit adds coordinator round-trips and markers. Commit every 100 ms–1 s of records, not per record. Downstream latency for read_committed readers ≈ the commit interval.</p>` }
  ],
  deepDive: `<p><b>🟣 Internals.</b> The transaction coordinator stores state in <code>__transaction_state</code>. A transaction's lifecycle: Ongoing → PrepareCommit → (markers written) → CompleteCommit. <code>transaction.timeout.ms</code> (default 60 s) aborts transactions of crashed producers. A consumer in read_committed mode reads to the <b>LSO</b>; a long-open transaction therefore blocks <i>all</i> read_committed readers of that partition — keep transactions short.</p>
    <p><b>KIP-890 (Kafka 4.0)</b> hardens transactions on the server side: the epoch is bumped on every transaction and the broker verifies a partition was added to the transaction before accepting writes, closing the "hanging transaction" class of bugs. <b>KIP-939</b> work on two-phase-commit participation aims to let Kafka join external transactions; check its status in your version before designing around it.</p>
    <p><b>Exactly-once is about effects, not deliveries.</b> Bytes may be sent twice on the wire; what is guaranteed is that the <i>result</i> is as if each input was processed once. The same idea outside Kafka: dedupe by a stable message id, or make the write a set/upsert, or store the input position atomically with the output.</p>
    <p><b>Idempotence scope:</b> per PID and partition. A producer restart without a transactional.id gets a new PID, so an app-level resend after restart can still duplicate. Put a business id in the record (headers or value) for consumers to dedupe.</p>`,
  aiEra: `<p><b>🤖 AI era.</b> "Exactly-once" is one of the most over-claimed phrases in generated design docs. When an assistant writes "Kafka guarantees exactly-once so the email is sent once", correct it: Kafka transactions cover Kafka writes and offsets only. For LLM tool calls triggered by events (send a reply, create a ticket), pass a deterministic idempotency key derived from the record (<code>topic-partition-offset</code> or the event id) to the downstream API so retries do not double-act.</p>`,
  problems: [
    {
      title: 'Make a Balance-Transfer Stream Exactly-Once',
      level: 'Hard', tags: ['kafka', 'transactions', 'idempotent-producer', 'eos'], companies: ['Wise', 'PhonePe', 'Coinbase'],
      statement: `<p>A service reads <code>transfer-requests</code>, computes debit and credit events and writes them to <code>ledger-events</code>. After a broker failover, auditors found duplicate debits in <code>ledger-events</code>, and after a consumer crash some requests were processed twice. Make the read-process-write loop exactly-once and say where the guarantee ends.</p>`,
      constraints: `<p>Kafka 3.x/4.x · 6 partitions · downstream readers include a Postgres sink and an email sender · instances run on Kubernetes and can be restarted at any time.</p>`,
      example: `<p>Producer sends debit(t42), the ack is lost, the client retries: without idempotence the broker appends it twice.</p>`,
      brute: { why: `<p>Dedupe later in every reader: works only if every reader is careful, and it does not stop the read-side duplicates caused by committing offsets separately from outputs.</p>` },
      mcq: { q: 'What do downstream Kafka consumers need so they never see aborted debit events?', options: ['acks=all', 'isolation.level=read_committed', 'enable.auto.commit=false', 'max.in.flight=1'], answer: 1, explain: 'read_committed hides records from aborted transactions; the default read_uncommitted shows them.' },
      hints: [
        `<p>Hint 1: two separate bugs: duplicate writes on producer retry, and output/offset commits that are not atomic.</p>`,
        `<p>Hint 2: one producer feature solves broker-side retry duplicates; a transactional API lets offsets ride in the same transaction as outputs.</p>`,
        `<p>Hint 3: think about what a stable transactional.id fences, and which readers live outside Kafka.</p>`
      ],
      solution: {
        approach: `<p><b>Producer:</b> <code>enable.idempotence=true</code> (default since Kafka 3.0) with <code>acks=all</code>: the broker drops retried batches by producer id + sequence number. <b>Atomic loop:</b> transactional producer with a stable <code>transactional.id</code> per instance/input assignment; per batch <code>beginTransaction</code> → send debit/credit → <code>sendOffsetsToTransaction(offsets, consumer.groupMetadata())</code> → <code>commitTransaction</code>; on error <code>abortTransaction</code>. A restarted instance with the same id bumps the epoch and fences the zombie. <b>Readers:</b> Kafka consumers use <code>read_committed</code>. <b>Where it ends:</b> the Postgres sink and the email sender are outside Kafka: the sink must upsert by event id (or store offsets in the same DB transaction), and the email sender needs an idempotency key. Exactly-once is Kafka-to-Kafka only.</p>`,
        complexity: `<p>One transaction per batch: a few extra round trips to the transaction coordinator; latency for read_committed readers grows up to the commit interval.</p>`,
        followUps: ['Why does commit interval trade latency for throughput here?', 'What happens to open transactions if the coordinator broker fails?']
      }
    }
  ]
});

/* =====================================================================
   TOPIC 5 — RabbitMQ routing: exchanges, bindings, queue types
   ===================================================================== */
function topicMatch(pattern, key) {
  var p = pattern.split('.'), k = key.split('.');
  function m(i, j) {
    if (i === p.length) return j === k.length;
    if (p[i] === '#') { for (var x = j; x <= k.length; x++) if (m(i + 1, x)) return true; return false; }
    if (j === k.length) return false;
    if (p[i] === '*' || p[i] === k[j]) return m(i + 1, j + 1);
    return false;
  }
  return m(0, 0);
}

topics.push({
  title: 'RabbitMQ Routing: Exchanges, Bindings, Queues (Quorum Queues and Streams)',
  analogy: `<p>A company <b>mail room</b>. Letters are never dropped straight into someone's desk tray; they go to a sorting desk (<b>exchange</b>). The desk has rules pinned on the wall (<b>bindings</b>): "anything labelled <i>invoice.*</i> goes to the accounts tray", "copy every circular to every tray". Trays (<b>queues</b>) hold letters until a clerk (<b>consumer</b>) takes one and signs for it (<b>ack</b>).</p>`,
  explain: `<p><b>🟢 The plain idea.</b> In RabbitMQ (AMQP 0-9-1) producers publish to an <b>exchange</b> with a <b>routing key</b>. The exchange copies the message into every <b>queue</b> whose <b>binding</b> matches. Consumers read from queues. The broker does the routing — that is the "smart broker, simple consumer" style, opposite to Kafka's "simple log, smart consumer".</p>
    ${H.table(['Exchange type', 'Routes to queues where…', 'Typical use'], [
      ['<b>direct</b>', 'binding key == routing key', 'task queues by type: <code>email</code>, <code>sms</code>'],
      ['<b>topic</b>', 'pattern matches dotted words; <code>*</code> = exactly one word, <code>#</code> = zero or more', '<code>order.*.created</code>, <code>order.#</code>'],
      ['<b>fanout</b>', 'every bound queue (key ignored)', 'broadcast: cache invalidation, notifications'],
      ['<b>headers</b>', 'header values match (x-match all/any)', 'routing on several attributes'],
      ['default <code>""</code>', 'queue whose <i>name</i> == routing key', 'simple "send to queue X"']
    ])}
    <p>If no binding matches, the message is <b>dropped</b> — unless the publisher sets <code>mandatory=true</code> (it comes back via basic.return) or the exchange has an <b>alternate exchange</b>.</p>
    <p><b>Queue types in RabbitMQ 3.13 / 4.x:</b></p>
    <ul>
      <li><b>Quorum queues</b> — replicated with Raft across (usually 3 or 5) nodes; the default choice for anything you cannot lose. Support poison-message handling via a <b>delivery limit</b> (default 20 in 4.0), at-least-once dead-lettering, priorities (4.0+).</li>
      <li><b>Classic queues</b> — single node, non-replicated. <span class="c-r">Classic mirrored queues were removed in 4.0</span>; use quorum queues for HA.</li>
      <li><b>Streams</b> — an append-only replicated log inside RabbitMQ (like a Kafka partition): non-destructive reads, consumers choose an offset (<code>first</code>, <code>last</code>, <code>next</code>, timestamp), retention by size/age, very large fan-out and replay. Super streams add partitioning.</li>
    </ul>
    <p>RabbitMQ 4.x also makes <b>AMQP 1.0</b> a first-class core protocol alongside 0-9-1, plus MQTT and STOMP plugins.</p>`,
  clues: [
    '"route messages by type/region to different workers" → topic or direct exchange with bindings',
    '"broadcast to every instance of a service" → fanout exchange, one (exclusive/auto-delete) queue per instance',
    '"messages silently disappear" → unroutable: no matching binding; use mandatory flag or alternate exchange',
    '"high availability queue" in RabbitMQ 4.x → quorum queue (mirrored classic queues no longer exist)',
    '"replay / many readers of the same messages in RabbitMQ" → streams',
    '"order.*.created vs order.#" → * is exactly one word, # is zero or more words'
  ],
  code: [
    { lang: 'js', run: true, title: 'Runnable model: a topic exchange with * and # matching', code: `// * = exactly one word, # = zero or more words (dot-separated)
function matches(pattern, key) {
  const p = pattern.split('.'), k = key.split('.');
  const m = (i, j) => {
    if (i === p.length) return j === k.length;
    if (p[i] === '#') { for (let x = j; x <= k.length; x++) if (m(i + 1, x)) return true; return false; }
    if (j === k.length) return false;
    return (p[i] === '*' || p[i] === k[j]) && m(i + 1, j + 1);
  };
  return m(0, 0);
}
const bindings = [
  ['billing-q', 'order.*.paid'],
  ['audit-q', '#'],
  ['eu-q', 'order.eu.#'],
  ['created-q', 'order.*.created'],
];
function publish(routingKey) {
  const queues = bindings.filter(([, pat]) => matches(pat, routingKey)).map(([q]) => q);
  console.log(routingKey.padEnd(22), '->', queues.length ? queues.join(', ') : 'UNROUTABLE (dropped unless mandatory/alternate-exchange)');
}
['order.eu.paid', 'order.us.created', 'order.eu.vip.created', 'user.signup', 'order'].forEach(publish);` },
    { lang: 'java', check: false, title: 'RabbitMQ Java client: declare a topic exchange and a quorum queue', code: `ConnectionFactory f = new ConnectionFactory();
f.setUri(System.getenv("AMQP_URL"));               // credentials from the environment
try (Connection conn = f.newConnection(); Channel ch = conn.createChannel()) {
    ch.exchangeDeclare("orders", BuiltinExchangeType.TOPIC, true);   // durable
    Map<String, Object> qArgs = Map.of(
        "x-queue-type", "quorum",
        "x-delivery-limit", 5,                         // poison message protection
        "x-dead-letter-exchange", "orders.dlx");
    ch.queueDeclare("billing", true, false, false, qArgs);
    ch.queueBind("billing", "orders", "order.*.paid");

    ch.confirmSelect();                                  // publisher confirms
    AMQP.BasicProperties props = new AMQP.BasicProperties.Builder()
        .contentType("application/json").deliveryMode(2) // persistent
        .messageId("evt-9f2c").build();
    ch.basicPublish("orders", "order.eu.paid", true, props, body);   // mandatory=true
    ch.waitForConfirmsOrDie(5_000);
}` },
    { lang: 'bash', check: false, title: 'Declare a stream and inspect queues', code: `rabbitmqadmin declare queue name=order-events queue_type=stream \\
  arguments='{"x-max-age":"7D","x-stream-max-segment-size-bytes":100000000}'
rabbitmqctl list_queues name type messages consumers` }
  ],
  codeTitle: ['Topic exchange model', 'Java client', 'CLI'],
  viz: {
    title: 'One publish through a topic exchange',
    input: 'order.eu.paid',
    inputLabel: 'Routing key (dot-separated words)',
    gen: function (input) {
      var key = String(input === undefined ? 'order.eu.paid' : input).trim();
      if (!/^[a-z0-9_]+(\.[a-z0-9_]+){0,5}$/i.test(key)) throw new Error('Use dot-separated words like order.eu.paid');
      var binds = [['billing', 'order.*.paid'], ['audit', '#'], ['eu', 'order.eu.#'], ['created', 'order.*.created']];
      var nodes = [bx('p', 'producer', 8, 30), bx('x', 'exchange: orders (topic)', 38, 30)], edges = [['p', 'x', key]], i;
      binds.forEach(function (b, ix) { nodes.push(bx(b[0], b[0] + ' queue', 82, 6 + ix * 16)); edges.push(['x', b[0], b[1]]); });
      function g(hl, ehl) { return { type: 'graph', directed: true, height: 62, nodes: nodes, edges: edges, hl: hl, ehl: ehl }; }
      var f = [], hl = { p: 'cur' }, ehl = { 'p-x': 'win' }, hits = [];
      f.push({ narr: 'The producer publishes with routing key <b>' + esc(key) + '</b> to the <b>orders</b> topic exchange. It does not know which queues exist.', parts: [g({ p: 'cur', x: 'cur' }, { 'p-x': 'win' })] });
      for (i = 0; i < binds.length; i++) {
        var ok = topicMatch(binds[i][1], key);
        if (ok) hits.push(binds[i][0]);
        hl = { x: 'cur' }; ehl = {}; hl[binds[i][0]] = ok ? 'ok' : 'bad'; ehl['x-' + binds[i][0]] = ok ? 'ok' : 'bad';
        f.push({ narr: 'Binding <code>' + binds[i][1] + '</code> → ' + (ok ? '<span class="c-g">matches</span>, a copy goes into <b>' + binds[i][0] + '</b>.' : '<span class="c-r">no match</span>' + (binds[i][1].indexOf('*') >= 0 ? ' (remember * is exactly one word)' : '') + '.'), parts: [g(hl, ehl)] });
      }
      var fh = {}, fe = {}; hits.forEach(function (q) { fh[q] = 'ok'; fe['x-' + q] = 'ok'; });
      f.push({ narr: hits.length ? 'Result: the message is copied into <b>' + hits.length + '</b> queue(s): ' + hits.join(', ') + '. Each queue is consumed independently.' : '<span class="c-r">No binding matched: the message is dropped</span> unless the producer used mandatory=true or the exchange has an alternate exchange.', parts: [g(fh, fe), { type: 'text', label: 'Rule', html: '* = exactly one word · # = zero or more words' }] });
      return f;
    }
  },
  examples: [
    { title: 'Broadcast cache invalidation', html: `<p>Each app instance declares an exclusive, auto-delete, server-named queue bound to fanout exchange <code>cache.invalidate</code>. Publish once → every running instance gets a copy; a stopped instance's queue disappears with it (it rebuilds its cache on start anyway).</p>` },
    { title: 'Work queue with competing consumers', html: `<p>Queue <code>thumbnails</code> (quorum), 8 workers consume from it. Each message goes to exactly <b>one</b> worker (round-robin, shaped by prefetch). Unlike Kafka, adding a 9th worker helps immediately — no partitions to repartition. The trade-off: no ordering guarantee across workers.</p>` },
    { title: 'Quorum queue vs stream', html: `${H.table(['', 'Quorum queue', 'Stream'], [['Read model', 'destructive (ack removes)', 'non-destructive, by offset'], ['Replay', 'no', 'yes'], ['Per-message ack/requeue', 'yes', 'no (offset tracking)'], ['DLX, delivery limit', 'yes', 'no'], ['Fan-out to 1000 readers', 'needs 1000 queues', 'one stream']])}` }
  ],
  deepDive: `<p><b>🟣 Internals and limits.</b> A quorum queue is a Raft group: a leader plus followers; a publish is confirmed after a majority has written it to disk. Losing a minority keeps it available; losing the majority stops it (it never silently loses confirmed messages). Quorum queues keep messages on disk, keep only a small index in memory, and are tuned for durability over raw speed. Very long queues hurt any broker — RabbitMQ is happiest when queues stay short.</p>
    <p><b>Ordering</b>: one queue preserves publish order for a single publisher on one channel, but requeues and multiple consumers interleave. For strict per-entity ordering use <b>Single Active Consumer</b> or a consistent-hash exchange that shards by key into several queues, each with one consumer.</p>
    <p><b>Streams</b> store data in segment files replicated by RabbitMQ's own protocol (Osiris), with a dedicated binary stream protocol for high throughput; AMQP clients can read them too with an <code>x-stream-offset</code> argument. Super streams partition a logical stream by routing key — conceptually like a Kafka topic with partitions.</p>
    <p><b>Khepri</b>, RabbitMQ's Raft-based metadata store, replaces Mnesia across the 4.x line, making cluster metadata (exchanges, bindings, users) behave more predictably under partitions.</p>`,
  aiEra: `<p><b>🤖 AI era.</b> Routing topologies are easy to describe in English and easy for an assistant to generate as definitions JSON or Terraform. The risk is semantics: generated bindings often confuse <code>*</code> and <code>#</code>, or declare classic mirrored queue policies (<code>ha-mode</code>) that RabbitMQ 4.x ignores. Keep a tiny test like the matcher above for your routing keys, and let AI draft the topology but have a test publish each key and assert which queues receive it.</p>`,
  problems: [
    {
      title: 'Route Order Events to the Right Teams',
      level: 'Medium', tags: ['rabbitmq', 'topic-exchange', 'quorum-queues', 'streams'], companies: ['Zomato', 'Shopify', 'Ocado'],
      statement: `<p>Routing keys look like <code>order.&lt;region&gt;.&lt;event&gt;</code>, e.g. <code>order.eu.created</code>, <code>order.us.refund.requested</code>. Billing wants every refund event in any region; the EU warehouse wants all EU order events; analytics wants to replay everything from last week. Design exchanges, bindings and queue types.</p>`,
      constraints: `<p>RabbitMQ 4.x · no message may be lost when one of 3 nodes dies · analytics may be offline for days.</p>`,
      example: `<p><code>order.us.refund.requested</code> must reach billing but not the EU warehouse.</p>`,
      brute: { why: `<p>A fanout exchange and filtering in every consumer: every team pays to receive and discard others' messages, and analytics still cannot replay.</p>` },
      mcq: { q: 'Which binding catches order.us.refund.requested for billing?', options: ['order.*.refund', 'order.#.refund', 'order.*.refund.#', '*.refund.*'], answer: 2, explain: '* matches exactly one word (the region) and # matches zero or more trailing words.' },
      hints: [
        `<p>Hint 1: the key has a variable number of words — which wildcard covers zero or more?</p>`,
        `<p>Hint 2: surviving a node loss means a replicated queue type; classic mirroring is gone in 4.x.</p>`,
        `<p>Hint 3: replay after days offline is a non-destructive read — which RabbitMQ structure keeps messages after reading?</p>`
      ],
      solution: {
        approach: `<p>One durable <b>topic exchange</b> <code>orders</code>. Billing: quorum queue <code>billing.refunds</code> bound with <code>order.*.refund.#</code>. EU warehouse: quorum queue <code>wh.eu</code> bound with <code>order.eu.#</code>. Analytics: a <b>stream</b> <code>orders.archive</code> bound with <code>#</code> and a retention policy (<code>x-max-age=7D</code>), read by offset so it can replay. Quorum queues and streams are Raft/replicated across 3 nodes, so losing one node keeps them available; publishers use confirms and <code>mandatory</code> (or an alternate exchange) to catch unroutable keys.</p>`,
        complexity: `<p>Routing cost grows with bindings, not consumers; the stream adds one disk copy of all order traffic for 7 days.</p>`,
        followUps: ['How would you shard billing by orderId while keeping per-order order?', 'When would a headers exchange be better?']
      }
    }
  ]
});

/* =====================================================================
   TOPIC 6 — RabbitMQ consuming: acks, prefetch, DLX, confirms
   ===================================================================== */
topics.push({
  title: 'RabbitMQ Consuming Right: Acks, Prefetch, Publisher Confirms, Dead-Letter Exchanges',
  analogy: `<p>A restaurant pass: the chef puts plates up, waiters carry them. If the chef lets one waiter grab 50 plates, they go cold while the others stand idle. A good chef lets each waiter hold <b>at most 3 plates</b> (<b>prefetch</b>). A waiter says "delivered" (<b>ack</b>) or "the customer refused it" (<b>reject</b>); refused plates go to a special shelf for the manager to inspect (<b>dead-letter exchange</b>).</p>`,
  explain: `<p><b>🟢 The plain idea.</b> RabbitMQ <b>pushes</b> messages to consumers. A delivered message stays "unacked" on the broker until the consumer answers:</p>
    ${H.table(['Consumer says', 'Broker does'], [
      ['<code>basic.ack</code>', 'deletes it (done)'],
      ['<code>basic.nack/reject requeue=true</code>', 'puts it back (often the head of the queue) — can loop forever on a poison message'],
      ['<code>basic.nack/reject requeue=false</code>', 'drops it, or <b>dead-letters</b> it if the queue has a DLX'],
      ['connection/channel dies', 'all its unacked messages are requeued and redelivered (<code>redelivered=true</code>)'],
      ['no answer for <code>consumer_timeout</code> (default 30 min)', 'closes the channel, messages requeued']
    ])}
    <p><b>autoAck=true</b> means "consider it delivered when sent" = at-most-once. Use manual acks after processing for at-least-once.</p>
    <p><b>Prefetch</b> (<code>basic.qos</code>): the max number of unacked messages per consumer. Too high (or unlimited) → one consumer hoards thousands, memory grows, others starve, and a crash redelivers a mountain. Too low (1) → a network round-trip per message. A good start: roughly (processing parallelism × 2), often 10–100.</p>
    <p><b>Publisher confirms</b> are the producer-side ack: after <code>confirmSelect()</code> the broker confirms each publish once it is safely stored (for quorum queues, on a majority). Without confirms, a publish to a broker that crashes a moment later may vanish. Combine with <code>mandatory=true</code> to detect unroutable messages.</p>
    <p><b>Dead-letter exchange (DLX)</b>: queue argument or policy <code>dead-letter-exchange</code>. A message is dead-lettered when it is rejected with requeue=false, its <b>TTL</b> expires, the queue overflows its <b>length limit</b> (reject or drop-head), or (quorum queues) it exceeds the <b>delivery limit</b>. RabbitMQ adds an <code>x-death</code> header with the reason, original queue, and count.</p>`,
  clues: [
    '"one worker is overloaded while others idle" → prefetch too high (or unlimited)',
    '"a bad message makes the consumer crash-loop" → poison message; delivery-limit on quorum queue + DLX',
    '"messages lost when the broker restarted" → no publisher confirms / non-durable queue / transient messages',
    '"delay retries by 30 s in RabbitMQ" → TTL + DLX retry queue (or delayed-message plugin)',
    '"PRECONDITION_FAILED delivery acknowledgement timed out" → consumer_timeout exceeded; ack sooner or raise it per queue'
  ],
  code: [
    { lang: 'js', run: true, title: 'Runnable model: prefetch decides who gets the work', code: `// 2 consumers: fast (1 tick per msg) and slow (5 ticks per msg). 20 messages.
function simulate(prefetch) {
  const queue = Array.from({ length: 20 }, (_, i) => i);
  const cons = [{ name: 'fast', cost: 1, buf: [], busy: 0, done: 0 }, { name: 'slow', cost: 5, buf: [], busy: 0, done: 0 }];
  let t = 0;
  while (queue.length || cons.some(c => c.buf.length)) {
    for (const c of cons) while (queue.length && c.buf.length < prefetch) c.buf.push(queue.shift()); // broker pushes
    for (const c of cons) {
      if (!c.buf.length) continue;
      c.busy++;
      if (c.busy === c.cost) { c.buf.shift(); c.done++; c.busy = 0; }   // ack after processing
    }
    t++;
  }
  console.log('prefetch', String(prefetch).padStart(2), '-> finished at tick', t, '| fast did', cons[0].done, '| slow did', cons[1].done);
}
[1, 2, 10, 20].forEach(simulate);
console.log('Huge prefetch makes the slow consumer hoard work, so the whole batch waits for it.');` },
    { lang: 'java', check: false, title: 'Manual ack, prefetch, and poison handling with the RabbitMQ Java client', code: `channel.basicQos(20);                                   // prefetch per consumer
DeliverCallback onMsg = (tag, delivery) -> {
    long dtag = delivery.getEnvelope().getDeliveryTag();
    try {
        handle(delivery.getBody());                      // must be idempotent
        channel.basicAck(dtag, false);
    } catch (TransientException e) {
        channel.basicNack(dtag, false, true);            // requeue; quorum queue counts deliveries
    } catch (Exception permanent) {
        channel.basicReject(dtag, false);                // no requeue -> dead-letter exchange
    }
};
channel.basicConsume("billing", false, onMsg, tag -> { });   // autoAck = false` },
    { lang: 'json', check: false, title: 'Policy: DLX + delivery limit for all billing.* quorum queues', code: `{
  "pattern": "^billing\\\\.",
  "apply-to": "quorum_queues",
  "definition": {
    "dead-letter-exchange": "billing.dlx",
    "delivery-limit": 5,
    "dead-letter-strategy": "at-least-once",
    "overflow": "reject-publish"
  }
}` }
  ],
  codeTitle: ['Prefetch model', 'Consumer', 'Policy'],
  viz: {
    title: 'A message\'s life: deliver, nack, delivery limit, dead-letter',
    input: 'fail fail ok',
    inputLabel: 'Outcome of each delivery: ok, fail (requeue) or bad (reject) — 1 to 8',
    gen: function (input) {
      var outs = toks(input, 'fail fail ok', 1, 8), limit = 3, count = 0, f = [], i;
      var nodes = [bx('q', 'billing (quorum)', 30, 15), bx('c', 'consumer', 75, 15), bx('dlx', 'billing.dlx', 30, 48), bx('dlq', 'billing.dlq', 75, 48)];
      var edges = [['q', 'c', 'deliver'], ['c', 'q', 'nack requeue'], ['q', 'dlx', 'dead-letter'], ['dlx', 'dlq']];
      function g(hl, ehl, tags) { return { type: 'graph', directed: true, height: 60, nodes: nodes, edges: edges, hl: hl, ehl: ehl, tags: tags || {} }; }
      f.push({ narr: 'Message <b>m1</b> waits in a quorum queue with <code>delivery-limit=' + limit + '</code> and a dead-letter exchange.', parts: [g({ q: 'cur' }, {}, { q: 'm1' })] });
      for (i = 0; i < outs.length; i++) {
        var o = outs[i].toLowerCase();
        if (['ok', 'fail', 'bad'].indexOf(o) < 0) throw new Error('Use ok, fail or bad');
        count++;
        f.push({ narr: 'Delivery #' + count + ' to the consumer' + (count > 1 ? ' with <code>redelivered=true</code>' : '') + '. It is now <b>unacked</b>: still owned by the broker until the consumer answers.', parts: [g({ c: 'cur' }, { 'q-c': 'win' }, { c: 'm1 (unacked)' })] });
        if (o === 'ok') { f.push({ narr: '<span class="c-g">basic.ack</span>: processed, the broker deletes m1. Done.', parts: [g({ c: 'ok' }, { 'q-c': 'ok' })] }); return f; }
        if (o === 'bad') { f.push({ narr: '<span class="c-r">basic.reject requeue=false</span>: a permanent error (bad JSON, unknown customer). m1 goes to the DLX with an <code>x-death</code> header (reason <i>rejected</i>) and lands in the DLQ for inspection.', parts: [g({ dlq: 'bad' }, { 'q-dlx': 'bad', 'dlx-dlq': 'bad' }, { dlq: 'm1' })] }); return f; }
        if (count >= limit) {
          f.push({ narr: 'Another failure, and the delivery count has reached the limit of ' + limit + '. The quorum queue stops requeueing and <b>dead-letters</b> m1 (reason <i>delivery_limit</i>) — no infinite poison loop.', parts: [g({ dlq: 'bad' }, { 'q-dlx': 'bad', 'dlx-dlq': 'bad' }, { dlq: 'm1' })] });
          return f;
        }
        f.push({ narr: '<span class="c-y">basic.nack requeue=true</span>: a transient error. m1 goes back to the queue; the quorum queue counts this delivery (' + count + ' of ' + limit + ').', parts: [g({ q: 'cur' }, { 'c-q': 'bad' }, { q: 'm1 (deliveries ' + count + ')' })] });
      }
      f.push({ narr: 'No more outcomes given: m1 is still in the queue waiting for its next delivery.', parts: [g({ q: 'cur' }, {}, { q: 'm1' })] });
      return f;
    }
  },
  examples: [
    { title: 'Retry with delay using TTL + DLX', html: `<p>Work queue <code>emails</code> dead-letters to exchange <code>emails.retry</code> → queue <code>emails.wait.30s</code> with <code>x-message-ttl=30000</code> and its own DLX pointing back to the work exchange. Reject → waits 30 s → back in <code>emails</code>. Count attempts via the <code>x-death</code> count; after N, publish to <code>emails.dlq</code>. Use several wait queues (5 s, 30 s, 5 min) for backoff, because a single queue expires only from its head.</p>` },
    { title: 'Choosing prefetch', html: `<p>Consumer runs 8 threads, each message takes ~40 ms, RTT ~2 ms. Prefetch 16–32 keeps every thread busy with a small buffer. Prefetch 5000 means a crash redelivers 5000 messages and the consumer's memory holds them all.</p>` },
    { title: 'Detecting lost publishes', html: `${H.table(['Without', 'With'], [['basicPublish returns → you assume success', 'confirm ack → stored on a quorum majority'], ['typo in routing key → silently dropped', 'mandatory=true → basic.return to the producer'], ['broker crash → in-flight lost', 'unconfirmed → resend (with a message id so consumers dedupe)']])}` }
  ],
  deepDive: `<p><b>🟣 Details.</b> Delivery tags are per channel; acking on a different channel is an error that closes the channel. <code>multiple=true</code> acks everything up to a tag — efficient but careful with concurrent processing. Prefetch can be per consumer (default in modern clients) or per channel (<code>global</code>).</p>
    <p><b>Delivery limit</b>: quorum queues track a delivery count in the message header; since 4.0 the default limit is 20, and a returned message (nack/channel close) increments it. Messages returned by a consumer that crashed also count — design for redelivery.</p>
    <p><b>Dead-lettering is at-most-once by default</b>: the move to the DLX is fire-and-forget internally. Quorum queues support <code>dead-letter-strategy: at-least-once</code> (needs <code>overflow: reject-publish</code>), which keeps the message until the target queue confirms it.</p>
    <p><b>Back-pressure</b>: when memory or disk alarms trigger, RabbitMQ blocks publishing connections (<code>connection.blocked</code>). Producers should handle that and confirms timing out, not keep buffering unbounded in memory.</p>
    <p><b>Lazy mode is gone</b>: classic queues v2 (default since 3.12) already keep messages mostly on disk, and the old <code>x-queue-mode=lazy</code> setting is ignored.</p>`,
  aiEra: `<p><b>🤖 AI era.</b> LLM-backed workers fit RabbitMQ work queues well: prefetch becomes your concurrency limit against the model provider's rate limit, nack-with-requeue handles 429s, and the DLQ catches prompts that consistently fail (content filter, oversized input). Make sure processing time stays far below <code>consumer_timeout</code>; long agent runs should ack the trigger message after durably recording the job, then track progress elsewhere.</p>`,
  problems: [
    {
      title: 'Tame a Poison Message Crash Loop',
      level: 'Medium', tags: ['rabbitmq', 'poison-message', 'dlx', 'prefetch'], companies: ['Atlassian', 'Booking.com', 'Zomato'],
      statement: `<p>An invoice queue (classic, no DLX) is consumed by 4 workers with <code>autoAck=false</code> and prefetch unlimited. A malformed message makes the parser throw; the worker catches everything and calls <code>basicNack(requeue=true)</code>. CPU is 100%, the queue never drains, and memory on one worker grows. Fix it.</p>`,
      constraints: `<p>RabbitMQ 4.1 · invoices must not be lost · transient DB errors happen a few times a day · ~200 msgs/s.</p>`,
      example: `<p>Bad message m7 → nack requeue → back at head → delivered again → throw → … thousands of times per second.</p>`,
      brute: { why: `<p>Just catching exceptions and acking hides bad invoices (data loss). Restarting the workers does nothing: the message is still at the head.</p>` },
      mcq: { q: 'Which RabbitMQ feature stops an endlessly requeued message without code changes?', options: ['Publisher confirms', 'Quorum queue delivery-limit with a DLX', 'Fanout exchange', 'Exclusive queue'], answer: 1, explain: 'After delivery-limit redeliveries the quorum queue dead-letters the message.' },
      hints: [
        `<p>Hint 1: separate permanent errors (parse failure) from transient ones (DB timeout).</p>`,
        `<p>Hint 2: classic queues have no delivery limit; quorum queues do.</p>`,
        `<p>Hint 3: bounded prefetch, reject(requeue=false) for permanent errors, delayed retry for transient, DLQ with alerting and a replay tool.</p>`
      ],
      solution: {
        approach: `<p>(1) Migrate <code>invoices</code> to a <b>quorum queue</b> with <code>delivery-limit=5</code> and a DLX → <code>invoices.dlq</code> (via policy, then move consumers; queue type cannot be changed in place, so create a new queue and shovel). (2) In the consumer classify errors: parse/validation errors → <code>basicReject(requeue=false)</code> straight to the DLQ; transient errors → reject into a TTL wait queue (e.g. 10 s, 60 s) that dead-letters back, so retries are delayed rather than hot-looping. (3) Set <code>basicQos(20)</code> so no worker hoards messages. (4) Alert on DLQ depth; build a small tool to inspect, fix and republish DLQ messages with their original message id. (5) Keep the handler idempotent by invoice id, since every retry is a redelivery.</p>`,
        complexity: `<p>Poison message costs at most delivery-limit attempts instead of unbounded CPU.</p>`,
        followUps: ['How do you replay DLQ messages safely?', 'What happens to ordering when a message is retried later?']
      }
    }
  ]
});

/* =====================================================================
   TOPIC 7 — Choosing between Kafka and RabbitMQ
   ===================================================================== */
topics.push({
  title: 'Kafka or RabbitMQ? Choosing by Workload, Not by Fashion',
  analogy: `<p>A <b>newspaper archive</b> versus a <b>courier company</b>. The archive prints every edition once and keeps it for years; anyone can come and read from any date, at their own pace. The courier takes each parcel, finds the right address using routing rules, and once it is signed for, the parcel is gone from the depot. Both "move information", but you would not use a courier to let 30 departments read the same history, nor an archive to deliver a parcel to exactly one person quickly.</p>`,
  explain: `<p><b>🟢 The plain idea.</b> Kafka is a <b>distributed log</b>: data is retained, many independent readers, replay, ordering per partition, huge sustained throughput. RabbitMQ is a <b>message broker</b>: flexible routing, per-message acks, work distribution, priorities, delays via TTL/DLX, low latency for individual tasks. Both are durable and clustered.</p>
    ${H.table(['Need', 'Leans to', 'Why'], [
      ['Event stream read by many services, plus replay after bug fixes', '<b>Kafka</b>', 'retention + independent consumer groups'],
      ['100k–millions msgs/s, analytics, CDC, stream processing', '<b>Kafka</b>', 'sequential IO, batching, Kafka Streams/Connect ecosystem'],
      ['Strict order per entity with parallelism', '<b>Kafka</b>', 'key → partition'],
      ['Task queue: each job done once by any worker, scale workers freely', '<b>RabbitMQ</b>', 'competing consumers, no partition cap'],
      ['Complex routing by type/region/tenant', '<b>RabbitMQ</b>', 'exchanges + bindings'],
      ['Per-message retry, delay, priority, TTL, DLQ', '<b>RabbitMQ</b>', 'built into queues'],
      ['Request/reply RPC over messaging', '<b>RabbitMQ</b>', 'reply-to + correlation id, direct reply-to'],
      ['RabbitMQ shop that needs replay/fan-out', 'RabbitMQ <b>streams</b>', 'log semantics without a new system'],
      ['Kafka shop that needs queue semantics', 'Kafka <b>share groups</b> (check maturity in your version)', 'per-record acks on shared partitions']
    ])}
    <p><b>Questions to ask in an interview:</b> How many readers? Do they need history? What ordering is needed and per what? Message rate and size? Per-message retry/delay needs? Who runs it (managed service availability: MSK, Confluent Cloud, Amazon MQ, CloudAMQP)? What does the team already operate?</p>
    <p><b>Common answer shape:</b> many companies run both: Kafka as the backbone of business events between services and to analytics, RabbitMQ (or SQS) for job queues inside a service. Pick one when one is enough — every broker is an operational cost.</p>`,
  clues: [
    '"multiple teams consume the same events and need to replay" → Kafka',
    '"background jobs with retries, priorities, delays" → RabbitMQ (or a managed queue)',
    '"route by tenant and region to different consumers" → RabbitMQ topic exchange',
    '"CDC from the database into a data lake" → Kafka + Kafka Connect (Debezium)',
    '"scale workers to 200 instantly for a burst" → queue with competing consumers; Kafka would need 200+ partitions',
    '"we only need simple async jobs on AWS" → consider SQS before running any broker'
  ],
  code: [
    { lang: 'js', run: true, title: 'Runnable model: a scoring helper that explains its choice', code: `// Score requirements; each rule adds weight to one side and records why.
function choose(req) {
  let kafka = 0, rabbit = 0; const why = [];
  const add = (side, w, reason) => { side === 'K' ? kafka += w : rabbit += w; why.push((side === 'K' ? 'Kafka' : 'RabbitMQ') + ' +' + w + ': ' + reason); };
  if (req.readers > 2) add('K', 3, req.readers + ' independent consumer groups read the same data');
  if (req.replay) add('K', 3, 'needs replay of history');
  if (req.msgsPerSec > 50000) add('K', 2, 'sustained high throughput');
  if (req.perKeyOrder) add('K', 2, 'ordered per entity with parallelism');
  if (req.routing) add('R', 3, 'content-based routing');
  if (req.perMessageRetryDelay) add('R', 3, 'per-message retry/delay/priority');
  if (req.workQueue) add('R', 2, 'competing workers, elastic scale');
  return { pick: kafka >= rabbit ? 'Kafka' : 'RabbitMQ', kafka, rabbit, why };
}
const cases = {
  'order events to 6 services + data lake': { readers: 6, replay: true, msgsPerSec: 20000, perKeyOrder: true },
  'PDF rendering jobs with retries': { readers: 1, workQueue: true, perMessageRetryDelay: true, msgsPerSec: 50 },
  'multi-tenant notification routing': { readers: 1, routing: true, perMessageRetryDelay: true, msgsPerSec: 3000 },
};
for (const [name, req] of Object.entries(cases)) {
  const r = choose(req);
  console.log(name, '=>', r.pick, '(K ' + r.kafka + ' / R ' + r.rabbit + ')');
  r.why.forEach(w => console.log('   ', w));
}` }
  ],
  codeTitle: 'Decision model',
  viz: {
    title: 'Same events, two brokers: what happens after the read',
    input: 'billing search audit',
    inputLabel: 'Consumers (2-4 names)',
    gen: function (input) {
      var cs = toks(input, 'billing search audit', 2, 4), f = [], i;
      var log = ['e0', 'e1', 'e2', 'e3', 'e4'];
      var off = {}; cs.forEach(function (c) { off[c] = 0; });
      f.push({ narr: '<b>Kafka:</b> five events in a partition. Each consumer group has its own offset; reading does not remove anything.', parts: [{ type: 'array', label: 'Kafka partition', values: log, showIdx: true }, { type: 'map', label: 'Offsets per group', entries: cs.map(function (c) { return [c, off[c]]; }) }] });
      for (i = 0; i < cs.length; i++) {
        off[cs[i]] = Math.min(5, 2 + i);
        var ptr = {}; ptr[Math.min(4, off[cs[i]])] = cs[i];
        f.push({ narr: 'Group <b>' + esc(cs[i]) + '</b> reads at its own pace up to offset ' + off[cs[i]] + '. The others are unaffected. Tomorrow a new group could start from offset 0 (replay).', parts: [{ type: 'array', label: 'Kafka partition', values: log, showIdx: true, ptr: ptr }, { type: 'map', label: 'Offsets per group', entries: cs.map(function (c) { return [c, off[c]]; }), hl: (function () { var h = {}; h[cs[i]] = 'ok'; return h; })() }] });
      }
      var q = log.slice();
      f.push({ narr: '<b>RabbitMQ:</b> to give each consumer every event you bind one queue per consumer to a fanout/topic exchange — the broker copies each message into ' + cs.length + ' queues.', parts: cs.map(function (c) { return { type: 'queue', label: c + ' queue', items: q.slice() }; }) });
      f.push({ narr: 'Each consumer acks what it processed and those copies are <b>deleted</b>. There is no "go back to e0" for a queue; a consumer added later only sees new messages (unless you use a RabbitMQ stream).', parts: cs.map(function (c, ix) { return { type: 'queue', label: c + ' queue', items: q.slice(Math.min(4, ix + 2)) }; }) });
      f.push({ narr: '<b>RabbitMQ work queue:</b> several workers on <i>one</i> queue compete — each message goes to one of them. Great for jobs; Kafka would cap you at one worker per partition.', parts: [{ type: 'queue', label: 'jobs (one queue, ' + cs.length + ' workers)', items: q.slice() }, { type: 'table', label: 'Who got what', columns: ['Message', 'Worker'], rows: q.map(function (m, ix) { return [m, cs[ix % cs.length]]; }) }] });
      return f;
    }
  },
  examples: [
    { title: 'Food delivery platform', html: `<p>Kafka topics <code>orders</code>, <code>payments</code>, <code>rider-locations</code> feed tracking, ETA models, fraud, and the warehouse. RabbitMQ inside the notification service routes SMS/push/email by country and provider, with delayed retries. Each tool where it is strongest.</p>` },
    { title: 'Small SaaS, 3 engineers', html: `<p>Background jobs + a few domain events at 50 msgs/s. One RabbitMQ (managed) or even Postgres-backed jobs is enough. Running Kafka well (partitions, retention, lag monitoring, schema registry) costs more than it returns here.</p>` },
    { title: 'Translating concepts', html: `${H.table(['Kafka', 'RabbitMQ'], [['topic', 'exchange (+ queues)'], ['partition', 'queue (or stream partition)'], ['consumer group', 'set of consumers on one queue'], ['offset commit', 'ack'], ['key', 'routing key (but routing ≠ ordering)'], ['compacted topic', '(no direct equivalent)'], ['retry topic / DLT', 'DLX + DLQ, delivery limit']])}` }
  ],
  deepDive: `<p><b>🟣 Trade-offs at the edges.</b> <b>Latency:</b> both reach low single-digit ms; Kafka's batching (<code>linger.ms</code>) trades a few ms for throughput. <b>Backlog:</b> Kafka is indifferent to a large backlog (it is just disk); RabbitMQ classic designs prefer short queues, though quorum queues and streams cope far better than old mirrored queues. <b>Ordering + parallelism:</b> Kafka gives both via keys; RabbitMQ needs consistent-hash sharding or single active consumer per shard. <b>Per-message semantics:</b> RabbitMQ can retry one message without blocking others; in Kafka a stuck record blocks its partition unless you move it to a retry topic.</p>
    <p><b>Ecosystem:</b> Kafka Connect (Debezium CDC, S3/Iceberg sinks), Kafka Streams/Flink, schema registries. RabbitMQ: shovel and federation for moving messages across sites, multi-protocol (AMQP 0-9-1, AMQP 1.0, MQTT for IoT, STOMP). <b>Wire-compatible alternatives</b> exist (Redpanda, WarpStream and others for Kafka API; cloud brokers for AMQP) — the client-side concepts in this module still apply.</p>`,
  aiEra: `<p><b>🤖 AI era.</b> Ask an assistant "Kafka or RabbitMQ?" and you get a generic table. Make it useful by feeding it your numbers (readers, rate, retention, ordering, retry needs, team skills) and asking it to argue <i>against</i> its own pick. Agent platforms add a new kind of workload: long, bursty, retry-heavy jobs (a queue) plus an audit trail of every agent step (a log). It is common to use both patterns.</p>`,
  problems: [
    {
      title: 'Choose the Broker for Three New Workloads',
      level: 'Medium', tags: ['kafka', 'rabbitmq', 'architecture', 'trade-offs'], companies: ['Flipkart', 'Atlassian', 'Booking.com'],
      statement: `<p>Pick Kafka, RabbitMQ or neither for: (a) clickstream at 200k events/s read by 6 teams with 7-day replay; (b) PDF report generation jobs, 20/s, each takes 30–90 s, need per-job retry and priority; (c) a 4-person startup sending 30 welcome emails per minute. Justify each.</p>`,
      constraints: `<p>One platform team of 3 · managed services allowed · budget matters.</p>`,
      example: `<p>Clickstream: many independent readers + replay → a log.</p>`,
      brute: { why: `<p>"Use Kafka for everything because it scales": long jobs block partitions, per-job retry needs retry topics, and the startup pays a large ops cost for 30 msgs/min.</p>` },
      mcq: { q: 'Which need points most strongly to RabbitMQ?', options: ['7-day replay', '200k events/s', 'Per-message retry and priority for long jobs', 'Many independent consumer groups'], answer: 2, explain: 'Per-message ack, requeue, priority queues and prefetch suit work queues; the others are log strengths.' },
      hints: [
        `<p>Hint 1: for each workload ask: many readers or one? replay needed? per-message retry?</p>`,
        `<p>Hint 2: long jobs in Kafka block everything behind them in the partition and risk max.poll.interval.ms.</p>`,
        `<p>Hint 3: the cheapest correct broker for tiny volume may be the database you already run.</p>`
      ],
      solution: {
        approach: `<p>(a) <b>Kafka</b> (managed): partitioned topic, keyed by session, 7-day retention, one consumer group per team — fan-out and replay are free. (b) <b>RabbitMQ</b> quorum queue with <code>prefetch=1</code> per worker, manual acks, a delivery limit + DLX for poison jobs and a separate high-priority queue (quorum queues in 4.x also support simple priorities). Work-queue semantics fit; no partition blocking. (c) <b>Neither</b>: a Postgres jobs table (<code>SELECT … FOR UPDATE SKIP LOCKED</code>) or the email provider's own queue; revisit when volume or consumers grow.</p>`,
        complexity: `<p>Ops cost dominates: one managed Kafka cluster, one small RabbitMQ, zero new infra for (c).</p>`,
        followUps: ['If (b) later needs an audit trail of every job, what do you add?', 'How would KIP-932 share groups (queues for Kafka) change answer (b)?']
      }
    }
  ]
});

/* =====================================================================
   TOPIC 8 — Reliability patterns: idempotent consumers, outbox/inbox, retries, DLQ
   ===================================================================== */
topics.push({
  title: 'Reliability Patterns: Idempotent Consumers, Outbox and Inbox, Retries with Backoff, Poison Messages and DLQs',
  analogy: `<p>A pharmacy fills prescriptions. Each slip has a <b>number</b>; the pharmacist writes it in a ledger before handing over medicine, so a slip presented twice is spotted (<b>inbox / idempotent consumer</b>). The doctor's office writes the slip into its own record book <i>and</i> the "to send" tray in one go, so a slip is never lost between them (<b>outbox</b>). If the stock is out, try again later, waiting longer each time (<b>backoff</b>). A slip nobody can read goes to the supervisor's box (<b>DLQ</b>) instead of blocking the counter.</p>`,
  explain: `<p><b>🟢 The plain idea.</b> be09 and be10 introduced idempotency and the outbox. Here is how they fit together with Kafka and RabbitMQ in production, end to end:</p>
    <ol>
      <li><b>Producer side — outbox:</b> in the same DB transaction as the business change, insert a row into <code>outbox(id, aggregate_id, type, payload)</code>. A relay (polling, or CDC with Debezium reading the WAL) publishes rows to Kafka (key = aggregate_id) or RabbitMQ (with confirms) and marks them sent. Crash between publish and mark → republished → <b>at-least-once</b>; the event id lets consumers dedupe.</li>
      <li><b>Consumer side — inbox:</b> in one DB transaction: <code>INSERT INTO inbox(message_id)</code> (unique), apply the effect, commit; then ack/commit the offset. A duplicate hits the unique key → skip and ack.</li>
      <li><b>Retries:</b> classify errors. <b>Transient</b> (timeouts, 503, deadlocks) → retry with exponential backoff + jitter, a capped number of times. <b>Permanent</b> (validation, unknown schema version, 4xx) → do not retry; send to the DLQ.</li>
      <li><b>Non-blocking retries in Kafka:</b> retrying in place blocks the partition. Publish the record to <code>orders.retry.1m</code>, <code>orders.retry.10m</code> topics consumed with a delay, then <code>orders.dlt</code>. The cost: ordering for that key is no longer guaranteed (later events may pass the retried one) — acceptable for independent events, not for state machines.</li>
      <li><b>DLQ handling:</b> include context (original topic/partition/offset or queue, error, attempt count, timestamps) in headers; alert on DLQ growth; provide a tool to inspect, fix, and replay.</li>
    </ol>
    ${H.table(['Failure', 'Pattern that handles it'], [
      ['DB committed, publish lost', 'outbox'],
      ['Published, then DB rolled back', 'outbox (no publish inside the transaction)'],
      ['Same message delivered twice', 'idempotent consumer / inbox'],
      ['Downstream briefly down', 'retry with backoff + jitter'],
      ['Message that can never succeed', 'poison detection → DLQ'],
      ['DLQ filling up silently', 'alerting + replay tooling']
    ])}`,
  clues: [
    '"update the DB and publish an event reliably" → transactional outbox (polling relay or CDC)',
    '"consumer must not double-charge on redelivery" → inbox table / idempotency key with unique constraint',
    '"retry without blocking other messages in the partition" → retry topics with delays, then DLT',
    '"thundering herd of retries after an outage" → exponential backoff with full jitter, retry budgets',
    '"one bad message stops the pipeline" → poison message; bounded attempts then DLQ',
    '"replay messages from the DLQ after a fix" → keep original metadata, idempotent consumers, controlled re-publish'
  ],
  code: [
    { lang: 'java', title: 'Plain Java model: outbox relay → at-least-once broker → idempotent consumer with retries, backoff and DLQ', code: `import java.util.*;

public class ReliablePipeline {
    record Msg(String id, String payload, int attempt) {}

    // ---- producer side: business table + outbox written "in one transaction" ----
    static final List<String> orders = new ArrayList<>();
    static final Deque<Msg> outbox = new ArrayDeque<>();
    static void placeOrder(String orderId) {
        synchronized (orders) {                     // stands in for one DB transaction
            orders.add(orderId);
            outbox.add(new Msg("evt-" + orderId, orderId, 0));
        }
    }

    // ---- broker: at-least-once (the relay may publish twice) ----
    static final Deque<Msg> queue = new ArrayDeque<>();
    static final List<Msg> dlq = new ArrayList<>();

    static void relay(boolean crashBeforeMarkSent) {
        Msg m = outbox.peek();
        if (m == null) return;
        queue.add(m);                               // publish (confirmed)
        if (crashBeforeMarkSent) return;            // crash: row stays, will be sent again
        outbox.poll();                              // mark sent
    }

    // ---- consumer side: inbox dedupe + classified retries ----
    static final Set<String> inbox = new HashSet<>();
    static final List<String> charged = new ArrayList<>();
    static int flakyFailuresLeft = 2;
    static final int MAX_ATTEMPTS = 4;

    static long backoffMs(int attempt, Random rnd) {
        long cap = 10_000, base = 200;
        long ceiling = Math.min(cap, base * (1L << attempt));
        return (long) (rnd.nextDouble() * ceiling);  // full jitter
    }

    static void consumeOne(Random rnd) {
        Msg m = queue.poll();
        if (m == null) return;
        if (inbox.contains(m.id())) {               // duplicate: skip, but still ack
            System.out.println("dup " + m.id() + " skipped");
            return;
        }
        try {
            if (m.payload().startsWith("bad")) throw new IllegalArgumentException("unparseable");
            if (m.payload().equals("o2") && flakyFailuresLeft-- > 0) throw new IllegalStateException("payment API 503");
            inbox.add(m.id());                      // same transaction as the effect
            charged.add(m.payload());
            System.out.println("charged " + m.payload() + " (attempt " + m.attempt() + ")");
        } catch (IllegalArgumentException permanent) {
            dlq.add(m);
            System.out.println("DLQ " + m.id() + ": " + permanent.getMessage());
        } catch (IllegalStateException transientErr) {
            int next = m.attempt() + 1;
            if (next >= MAX_ATTEMPTS) { dlq.add(m); System.out.println("DLQ " + m.id() + ": attempts exhausted"); return; }
            System.out.println("retry " + m.id() + " in ~" + backoffMs(next, rnd) + " ms");
            queue.add(new Msg(m.id(), m.payload(), next));   // retry topic / delayed queue
        }
    }

    public static void main(String[] args) {
        Random rnd = new Random(42);
        placeOrder("o1"); placeOrder("o2"); placeOrder("bad3");
        relay(true);  relay(false);                 // o1 published twice
        relay(false); relay(false);
        for (int i = 0; i < 10; i++) consumeOne(rnd);
        System.out.println("charged=" + charged + " dlq=" + dlq.size() + " outbox left=" + outbox.size());
    }
}` },
    { lang: 'sql', title: 'Outbox and inbox tables (SQLite-compatible)', code: `CREATE TABLE orders (id TEXT PRIMARY KEY, total_cents INTEGER NOT NULL);
CREATE TABLE outbox (
  id TEXT PRIMARY KEY, aggregate_id TEXT NOT NULL, type TEXT NOT NULL,
  payload TEXT NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP, sent_at TEXT);
CREATE TABLE inbox (message_id TEXT PRIMARY KEY, processed_at TEXT DEFAULT CURRENT_TIMESTAMP);

-- producer: one transaction
BEGIN;
INSERT INTO orders VALUES ('o1', 4999);
INSERT INTO outbox (id, aggregate_id, type, payload) VALUES ('evt-1', 'o1', 'OrderPlaced', '{"total":4999}');
COMMIT;

-- consumer: the second delivery of evt-1 inserts nothing
INSERT INTO inbox (message_id) VALUES ('evt-1') ON CONFLICT DO NOTHING;
INSERT INTO inbox (message_id) VALUES ('evt-1') ON CONFLICT DO NOTHING;
SELECT changes() AS rows_inserted_by_duplicate, (SELECT COUNT(*) FROM inbox) AS inbox_rows;` },
    { lang: 'java', check: false, title: 'Spring for Apache Kafka: non-blocking retry topics + DLT', code: `@RetryableTopic(
    attempts = "4",
    backoff = @Backoff(delay = 1000, multiplier = 5.0, maxDelay = 60000),
    exclude = { ValidationException.class },          // permanent -> straight to DLT
    dltTopicSuffix = ".dlt")
@KafkaListener(topics = "payments", groupId = "ledger")
public void onPayment(PaymentEvent e, @Header(KafkaHeaders.RECEIVED_KEY) String key) {
    ledger.applyOnce(e.eventId(), e);                 // inbox + effect in one DB transaction
}

@DltHandler
public void onDlt(PaymentEvent e, @Header(KafkaHeaders.EXCEPTION_MESSAGE) String error) {
    alerts.raise("payment event to DLT", e.eventId(), error);
}` }
  ],
  codeTitle: ['Pipeline model', 'Outbox/inbox SQL', 'Spring retry topics'],
  viz: {
    title: 'Outbox relay crash and the inbox that saves the day',
    input: 'crash',
    inputLabel: 'Relay behaviour: crash (dies after publish) or clean',
    gen: function (input) {
      var mode = String(input === undefined ? 'crash' : input).trim().toLowerCase();
      if (mode !== 'crash' && mode !== 'clean') throw new Error('Type crash or clean');
      var nodes = [bx('api', 'order API', 8, 10), bx('db', 'orders DB + outbox', 8, 45), bx('rel', 'relay', 42, 45), bx('brk', 'Kafka / RabbitMQ', 70, 45), bx('con', 'billing consumer', 70, 10), bx('ib', 'billing DB + inbox', 95, 28)];
      var edges = [['api', 'db', 'one txn'], ['db', 'rel', 'poll/CDC'], ['rel', 'brk', 'publish'], ['brk', 'con', 'deliver'], ['con', 'ib', 'one txn']];
      function g(hl, ehl, tags) { return { type: 'graph', directed: true, height: 60, nodes: nodes, edges: edges, hl: hl, ehl: ehl, tags: tags || {} }; }
      var f = [];
      f.push({ narr: 'The API inserts order o1 <b>and</b> outbox row evt-1 in one transaction. Either both exist or neither — no publish has happened yet.', parts: [g({ api: 'cur', db: 'ok' }, { 'api-db': 'ok' }, { db: 'evt-1 unsent' })] });
      f.push({ narr: 'The relay reads unsent rows and publishes evt-1 (key o1) and waits for the broker\'s confirmation.', parts: [g({ rel: 'cur', brk: 'ok' }, { 'db-rel': 'win', 'rel-brk': 'ok' }, { brk: 'evt-1' })] });
      if (mode === 'crash') {
        f.push({ narr: '<span class="c-r">The relay crashes before marking the row sent.</span> On restart it sees evt-1 still unsent and publishes it <b>again</b>. This is why the outbox is at-least-once.', parts: [g({ rel: 'bad', brk: 'cur' }, { 'rel-brk': 'bad' }, { db: 'evt-1 unsent', brk: 'evt-1 ×2' })] });
      } else {
        f.push({ narr: 'The relay marks evt-1 as sent. Even so, the broker may redeliver to consumers later (crash before ack/commit), so duplicates are still possible.', parts: [g({ db: 'ok' }, { 'rel-brk': 'ok' }, { db: 'evt-1 sent' })] });
      }
      f.push({ narr: 'Delivery 1: billing inserts evt-1 into its inbox (unique key), charges the customer, commits, then acks/commits the offset.', parts: [g({ con: 'cur', ib: 'ok' }, { 'brk-con': 'win', 'con-ib': 'ok' }, { ib: 'inbox: evt-1' })] });
      f.push({ narr: (mode === 'crash' ? 'Delivery 2 (the duplicate publish)' : 'A redelivery') + ': the inbox insert hits the unique key → <b>skip the effect</b>, still ack. The customer is charged exactly once.', parts: [g({ con: 'cur', ib: 'sel' }, { 'brk-con': 'win', 'con-ib': 'bad' }, { ib: 'duplicate ignored' })] });
      f.push({ narr: 'Recap: <b>outbox</b> prevents loss and phantom events on the producer side; <b>inbox</b> turns at-least-once delivery into an exactly-once <i>effect</i>. Neither needs distributed transactions.', parts: [g({ db: 'ok', ib: 'ok' }, { 'api-db': 'ok', 'con-ib': 'ok' })] });
      return f;
    }
  },
  examples: [
    { title: 'Backoff schedule with full jitter', html: `${H.table(['Attempt', 'Ceiling = min(cap, 200·2<sup>n</sup>) ms', 'Actual wait'], [['1', '400', 'random 0–400'], ['2', '800', 'random 0–800'], ['3', '1,600', 'random 0–1,600'], ['6', '10,000 (cap)', 'random 0–10,000']])}<p>Jitter spreads 10,000 consumers that failed at the same second so they do not all retry together.</p>` },
    { title: 'Natural idempotency first', html: `<p>Before adding an inbox, check if the effect is naturally idempotent: <code>UPDATE account SET status='CLOSED'</code> is safe to repeat; <code>balance = balance + 10</code> is not. Use upserts with versions: <code>... WHERE version &lt; :eventVersion</code> also blocks out-of-order older events.</p>` },
    { title: 'Polling relay vs CDC', html: `${H.table(['', 'Polling relay', 'CDC (Debezium)'], [['Setup', 'a scheduled query', 'Kafka Connect + WAL/binlog access'], ['Latency', 'poll interval', 'sub-second'], ['DB load', 'repeated queries', 'reads the log'], ['Ordering', 'ORDER BY id per aggregate', 'commit order']])}` },
    { title: 'When retries break ordering', html: `<p>Events for order o1: <code>Created</code>, <code>Paid</code>. <code>Created</code> fails transiently and goes to the 1-minute retry topic; <code>Paid</code> succeeds first — the consumer sees Paid for an order it does not know. For such flows, retry in place (block the partition with a bounded backoff) or park all later events of that key until the earlier one succeeds.</p>` }
  ],
  deepDive: `<p><b>🟣 Production details.</b> <b>Inbox retention:</b> keep message ids at least as long as redelivery is possible (Kafka retention or replay window, RabbitMQ DLQ replay window), then purge by date. <b>Where to dedupe:</b> in the same database and transaction as the effect; a separate Redis "seen" set with a TTL is cheaper but has a gap between "mark seen" and "effect committed".</p>
    <p><b>Kafka offsets in your DB:</b> instead of an inbox, store <code>(topic, partition, offset)</code> in the same transaction as the effect and seek to it on assignment. Exactly-once effect without per-message rows, but it ties the consumer to that one DB.</p>
    <p><b>Retry budgets:</b> cap retries as a fraction of traffic (e.g. ≤ 10%) so an outage does not multiply load. Combine with circuit breakers: when downstream is clearly down, <code>pause()</code> the consumer (Kafka) or stop consuming (RabbitMQ) instead of burning attempts into the DLQ.</p>
    <p><b>Poison detection:</b> RabbitMQ quorum queues count deliveries for you; in Kafka you count attempts yourself (header or retry-topic hop) because a crash-looping consumer re-reads from the committed offset forever. Deserialization errors deserve a dedicated handler (e.g. Spring's <code>ErrorHandlingDeserializer</code>) so a bad payload goes to the DLT instead of killing the consumer.</p>
    <p><b>Schema evolution</b> causes many "poison" messages: use a schema registry with compatibility rules (backward for consumers-first upgrades) and version fields in payloads.</p>`,
  aiEra: `<p><b>🤖 AI era.</b> DLQs are a great place for AI triage: an assistant can cluster DLQ messages by error, spot that "all of them are schema v3 from the mobile team", and draft the fix or a transformation for replay. Keep a human in the loop for replay of financial messages. When agents themselves consume events and call tools, give each tool call an idempotency key derived from the message id — retries from the broker must not make an agent send two refunds.</p>`,
  problems: [
    {
      title: 'Build a Retry Ladder for a Kafka Payments Consumer',
      level: 'Hard', tags: ['kafka', 'retry-topics', 'dlq', 'idempotency', 'ordering'], companies: ['Stripe', 'Razorpay', 'Adyen'],
      statement: `<p>A ledger consumer reads <code>payments</code> (key = paymentId). Calls to a fraud API fail ~1% of the time with 503 for up to 5 minutes. Today the consumer retries in place forever, so one bad partition stalls and lag explodes; once, a malformed event blocked a partition for 6 hours. Design retries, DLQ and idempotency, and state what happens to ordering.</p>`,
      constraints: `<p>Events per payment: Authorized → Captured → (Refunded). A refund must never be applied before its capture · no double posting · 3k events/s.</p>`,
      example: `<p>Captured(p9) fails with 503 → if it is moved to a retry topic, Refunded(p9) may be processed first → ledger negative.</p>`,
      brute: { why: `<p>Infinite in-place retry: correct order, but a single poison or long outage blocks every other payment in that partition. Sending everything to retry topics: no blocking, but reorders events of the same payment.</p>` },
      mcq: { q: 'Which failure must NOT go through retry topics?', options: ['503 from the fraud API', 'Malformed JSON', 'DB deadlock', 'Timeout'], answer: 1, explain: 'Malformed JSON is permanent: retrying cannot help, send it straight to the DLT.' },
      hints: [
        `<p>Hint 1: classify errors first: permanent → DLT immediately; transient → retry.</p>`,
        `<p>Hint 2: to keep per-payment order while retrying, remember which keys are "parked" and send their later events behind the failed one.</p>`,
        `<p>Hint 3: idempotency by eventId in the same DB transaction as the ledger posting; alert and replay tooling for the DLT.</p>`
      ],
      solution: {
        approach: `<p><b>Classify:</b> deserialization/validation errors → <code>payments.dlt</code> at once with headers (original partition/offset, error, timestamp). <b>Transient:</b> retry in place a few times with short backoff (e.g. 3 tries within 2 s) — keeps order for blips. If still failing, move the event to <code>payments.retry.1m</code> → <code>.retry.10m</code> → DLT, <b>and mark the paymentId as parked</b> in a small table; any later event for a parked key is also routed to the retry chain behind it, so a payment's events stay in order while other payments flow. When the parked event succeeds, unpark the key. <b>Idempotency:</b> each posting inserts <code>eventId</code> into an inbox in the same transaction (unique) and uses state checks (cannot refund before capture: reject to retry). <b>Protection:</b> a circuit breaker on the fraud API pauses the consumer during a full outage rather than flooding retry topics; retry budget alerts. <b>Ops:</b> DLT dashboard, replay tool that re-publishes to <code>payments</code> preserving key and eventId.</p>`,
        complexity: `<p>O(1) extra DB work per event (inbox insert + parked-key lookup); retry topics add at most the configured delays for the affected keys only.</p>`,
        followUps: ['How do you replay the DLT after a bug fix without double posting?', 'What if the parked-key table itself is unavailable?']
      }
    }
  ]
});

/* =====================================================================
   PRACTICE ARENA
   ===================================================================== */
function prob(o) {
  practice.push({
    title: o.title, level: o.level, tags: o.tags, companies: o.companies,
    statement: o.statement, constraints: o.constraints, example: o.example,
    brute: { why: o.brute },
    mcq: o.mcq, hints: o.hints,
    solution: { approach: o.approach, complexity: o.complexity, followUps: o.followUps }
  });
}

prob({
  title: 'How Many Consumers Will Actually Work?', level: 'Easy', tags: ['kafka', 'consumer-group', 'partitions'], companies: ['Amazon', 'Infosys'],
  statement: `<p>Topic <code>clicks</code> has 8 partitions. Group <code>analytics</code> runs 12 consumer instances; group <code>fraud</code> runs 4. How many partitions does each instance of each group read, and how many instances sit idle? What changes if you add 4 partitions?</p>`,
  constraints: `Classic or KIP-848 protocol · balanced assignor.`,
  example: `<p>analytics: 8 busy instances with 1 partition, <span class="c-r">4 idle</span>. fraud: 4 instances with 2 each.</p>`,
  brute: `<p>"More consumers = more speed" — adding instances beyond the partition count only adds idle members (and rebalance cost).</p>`,
  mcq: { q: 'Max useful consumers in one group for 8 partitions?', options: ['4', '8', '12', 'Unlimited'], answer: 1, explain: 'One partition is owned by one member of a group at a time.' },
  hints: [`<p>Hint 1: within a group each partition has exactly one owner.</p>`, `<p>Hint 2: groups are independent: each one gets all 8 partitions.</p>`, `<p>Hint 3: adding partitions re-maps keys — mention the ordering cost.</p>`],
  approach: `<p><b>analytics</b>: 8 partitions over 12 members → 8 members own 1 partition, 4 members are idle (useful only as hot standbys). <b>fraud</b>: 4 members → 2 partitions each. Both groups independently read every record. Growing to 12 partitions lets all 12 analytics members work (1 each) and gives fraud 3 each; but keyed records start landing in different partitions (hash mod 12 vs mod 8), so per-key ordering is broken across the change point — do it at a quiet time, or create a new topic and migrate consumers.</p>`,
  complexity: `<p>Parallelism per group = min(members, partitions).</p>`
});

prob({
  title: 'Pick the RabbitMQ Exchange Type', level: 'Easy', tags: ['rabbitmq', 'exchanges', 'routing'], companies: ['VMware', 'Zoho'],
  statement: `<p>Choose an exchange type and binding for each: (a) every app instance must clear its local cache on a "price changed" message; (b) send <code>sms</code>, <code>email</code> and <code>push</code> jobs to separate worker pools; (c) the EU audit service wants all order events from the EU, any sub-type (<code>order.eu.created</code>, <code>order.eu.vip.refunded</code>).</p>`,
  constraints: `RabbitMQ 4.x, AMQP 0-9-1.`,
  example: `<p>(c) binding <code>order.eu.*</code> would <span class="c-r">miss</span> <code>order.eu.vip.refunded</code> (two words after eu).</p>`,
  brute: `<p>One queue for everything and let consumers filter: every consumer receives and discards most messages, and a slow consumer delays all types.</p>`,
  mcq: { q: 'Which binding matches order.eu.vip.refunded?', options: ['order.eu.*', 'order.*.refunded', 'order.eu.#', 'order.#.eu'], answer: 2, explain: '# matches zero or more words, so order.eu.# matches any depth after eu.' },
  hints: [`<p>Hint 1: "every instance gets a copy" = broadcast.</p>`, `<p>Hint 2: an exact type name per pool = direct match.</p>`, `<p>Hint 3: * is one word, # is zero or more.</p>`],
  approach: `<p>(a) <b>fanout</b> exchange <code>cache.invalidate</code>; each instance declares its own exclusive, auto-delete, server-named queue bound to it, so all running instances get a copy. (b) <b>direct</b> exchange <code>notifications</code> with queues <code>sms</code>, <code>email</code>, <code>push</code> bound by those exact keys; each pool consumes its queue as competing consumers (quorum queues for durability). (c) <b>topic</b> exchange <code>orders</code> with binding <code>order.eu.#</code> to the audit queue — <code>#</code> covers any number of words after <code>eu</code>; <code>order.eu.*</code> would only match one more word.</p>`,
  complexity: `<p>Routing is O(bindings) per publish in principle; RabbitMQ uses tries for topic matching.</p>`
});

prob({
  title: 'Classify the Delivery Guarantee', level: 'Easy', tags: ['delivery-semantics', 'kafka', 'rabbitmq'], companies: ['Google', 'Swiggy'],
  statement: `<p>Name the guarantee for each: (1) RabbitMQ consumer with <code>autoAck=true</code>; (2) Kafka consumer committing offsets after writing to Postgres; (3) Kafka read-process-write with transactions and <code>read_committed</code> downstream; (4) RabbitMQ publisher without confirms; (5) Kafka consumer committing before processing.</p>`,
  constraints: `Assume crashes can happen at any point.`,
  example: `<p>(2) crash after DB write but before commit → the record is re-read → <span class="c-y">at-least-once</span>.</p>`,
  brute: `<p>Saying "Kafka is exactly-once" for all of them — EOS only covers Kafka-to-Kafka with transactions.</p>`,
  mcq: { q: 'Committing the offset before processing gives…', options: ['at-least-once', 'at-most-once', 'exactly-once', 'no guarantee at all'], answer: 1, explain: 'A crash after commit and before processing skips the record.' },
  hints: [`<p>Hint 1: ask "if it crashes right here, is the message lost or repeated?"</p>`, `<p>Hint 2: autoAck means the broker forgets the message on send.</p>`, `<p>Hint 3: exactly-once requires the effect and the progress marker to be committed atomically.</p>`],
  approach: `<p>(1) <b>At-most-once</b>: the broker deletes on send; a crash mid-processing loses the message. (2) <b>At-least-once</b>: a crash between the DB write and the offset commit re-processes; needs an idempotent write. (3) <b>Exactly-once within Kafka</b>: outputs and input offsets commit atomically and aborted data is invisible. (4) <b>At-most-once from the producer side</b>: a publish may be lost on a broker crash or be unroutable unnoticed; add confirms (+ mandatory). (5) <b>At-most-once</b>: the commit skips records whose processing never finished.</p>`,
  complexity: `<p>Not applicable — reasoning exercise.</p>`
});

prob({
  title: 'Size Retention for a Lagging Consumer', level: 'Easy', tags: ['kafka', 'retention', 'capacity'], companies: ['Confluent', 'Walmart'],
  statement: `<p>A topic receives 5 MB/s across 10 partitions, RF=3. A batch consumer runs once a day and may be down over a long weekend (up to 3 days). Choose <code>retention.ms</code> and estimate total disk usage on the cluster.</p>`,
  constraints: `Leave a safety margin · compression ratio already included in the 5 MB/s.`,
  example: `<p>5 MB/s × 86,400 s = 432 GB/day of unique data.</p>`,
  brute: `<p>Keeping the 7-day default without checking disk: 7 × 432 GB × 3 replicas ≈ 9 TB — might not fit; or using 1 day and losing data over a weekend.</p>`,
  mcq: { q: 'Disk for 4 days of retention at 432 GB/day with RF=3 is about…', options: ['1.7 TB', '5.2 TB', '13 TB', '432 GB'], answer: 1, explain: '4 × 432 GB = 1.73 TB, × 3 replicas ≈ 5.2 TB.' },
  hints: [`<p>Hint 1: retention must cover the longest expected outage plus margin.</p>`, `<p>Hint 2: multiply by the replication factor.</p>`, `<p>Hint 3: add one segment per partition of slack, or consider tiered storage.</p>`],
  approach: `<p>Need ≥ 3 days of outage + 1 day margin → <code>retention.ms</code> = 4 days (345,600,000). Unique data 432 GB/day × 4 = 1.73 TB; × RF 3 ≈ <b>5.2 TB</b>, plus segment slack (data lives up to retention + segment roll time) and ~20–30% free-space headroom → plan ~6.5–7 TB. Alert when consumer time-lag exceeds 2 days. If disk is tight, enable tiered storage so older segments go to object storage, or set <code>retention.bytes</code> per partition as a hard cap (knowing it may delete before 4 days).</p>`,
  complexity: `<p>Disk ≈ rate × retention × RF.</p>`
});

prob({
  title: 'Idempotent Consumer for Loyalty Points', level: 'Medium', tags: ['idempotency', 'inbox', 'at-least-once'], companies: ['Starbucks', 'Myntra', 'Target'],
  statement: `<p>A consumer reads <code>OrderCompleted</code> events (Kafka, key = customerId) and adds points with <code>UPDATE wallet SET points = points + :p</code>. Duplicates happen after rebalances. Make it safe and explain where the dedupe state lives and for how long.</p>`,
  constraints: `Postgres · 2k events/s · Kafka retention 7 days · replays of up to 3 days happen after incidents.`,
  example: `<p>Event e5 (+50) processed, consumer dies before commit → e5 again → +100 total <span class="c-r">wrong</span>.</p>`,
  brute: `<p>Redis <code>SETNX seen:e5</code> then update Postgres: if the app dies between the two, the event is marked seen but points never added (loss), or the reverse order duplicates.</p>`,
  mcq: { q: 'Where must the "processed" mark be written?', options: ['In Redis before the update', 'In the same DB transaction as the points update', 'In a log file', 'In the Kafka record header'], answer: 1, explain: 'Atomic with the effect: both happen or neither.' },
  hints: [`<p>Hint 1: the event id is the idempotency key.</p>`, `<p>Hint 2: unique constraint + same transaction.</p>`, `<p>Hint 3: keep ids at least as long as the longest replay window.</p>`],
  approach: `<p>Table <code>processed_events(event_id PRIMARY KEY, processed_at)</code>. Per event, one transaction: <code>INSERT ... ON CONFLICT DO NOTHING</code>; if 0 rows inserted, skip; else <code>UPDATE wallet ...</code>; commit; then commit the Kafka offset (batching commits is fine). Batch 100 events per transaction for throughput. Keep event ids for ≥ 7 days (retention) — longer than the 3-day replay window — and purge with a daily job by <code>processed_at</code>. Alternative: a <code>ledger(event_id unique, customer_id, delta)</code> table where the wallet is the sum — the ledger row is both the record and the dedupe.</p>`,
  complexity: `<p>One extra indexed insert per event; storage ≈ 2k/s × 7 days ≈ 1.2 B rows — partition the table by day so purge is a cheap DROP PARTITION.</p>`,
  followUps: ['What if events can arrive out of order?']
});

prob({
  title: 'Delayed Retries in RabbitMQ Without Plugins', level: 'Medium', tags: ['rabbitmq', 'ttl', 'dlx', 'backoff'], companies: ['Shopify', 'Atlassian'],
  statement: `<p>Design 3 retry stages (10 s, 1 min, 10 min) for a webhook-delivery queue, then a DLQ, using only core RabbitMQ features. Explain how a consumer knows which attempt it is on.</p>`,
  constraints: `Quorum queues · webhooks to customer endpoints often fail for minutes · must not lose deliveries.`,
  example: `<p>Attempt 1 fails → wait 10 s → attempt 2 fails → wait 1 min → … → DLQ after attempt 4.</p>`,
  brute: `<p>Per-message TTL on one shared wait queue: messages expire only from the head, so a 10-minute message blocks 10-second ones behind it.</p>`,
  mcq: { q: 'Why one wait queue per delay rather than per-message TTL in one queue?', options: ['TTL is not supported', 'Expired messages are only removed from the head, so mixed TTLs block each other', 'It uses less memory', 'DLX needs it'], answer: 1, explain: 'Queue-level TTL with uniform delays keeps expiry in order.' },
  hints: [`<p>Hint 1: a queue with x-message-ttl and a DLX acts as a timer.</p>`, `<p>Hint 2: route by attempt to the right wait queue.</p>`, `<p>Hint 3: carry the attempt count in a header (or read x-death counts).</p>`],
  approach: `<p>Exchanges: <code>webhooks</code> (work), <code>webhooks.retry</code> (direct), <code>webhooks.dlx</code>. Queues: <code>webhooks.work</code>; <code>webhooks.wait.10s</code>, <code>.1m</code>, <code>.10m</code>, each with <code>x-message-ttl</code> and <code>x-dead-letter-exchange=webhooks</code> (so expired messages return to the work queue); <code>webhooks.dlq</code>. On transient failure the consumer republishes (with publisher confirms) to <code>webhooks.retry</code> with routing key for the next stage and header <code>x-attempt=n+1</code>, then acks the original — or rejects into a stage queue and reads attempts from <code>x-death</code>. After attempt 4, publish to the DLQ with error details. Permanent failures (410 Gone, invalid URL) go straight to the DLQ. Quorum queue <code>delivery-limit</code> protects against crash loops. Consumers are idempotent by delivery id; customers get an idempotency header.</p>`,
  complexity: `<p>Each retry costs one republish; delays are exact per stage (± a little).</p>`
});

prob({
  title: 'Outbox Relay That Preserves Per-Order Ordering', level: 'Medium', tags: ['outbox', 'kafka', 'ordering', 'cdc'], companies: ['Zalando', 'Uber'],
  statement: `<p>Orders service writes outbox rows. Three relay instances poll the table and publish to Kafka. Consumers sometimes see <code>OrderShipped</code> before <code>OrderPaid</code>. Explain why and redesign the relay.</p>`,
  constraints: `Postgres · 1k events/s · relay must be HA.`,
  example: `<p>Relay A takes Paid(id 10), relay B takes Shipped(id 11) of the same order, B publishes first.</p>`,
  brute: `<p>Single relay instance: correct order, but no HA, and a stuck relay stops all events.</p>`,
  mcq: { q: 'What gives order per aggregate with several relay instances?', options: ['Random row assignment', 'Shard rows by aggregate_id so one relay owns each shard, publish with key = aggregate_id', 'Bigger batches', 'acks=0'], answer: 1, explain: 'One owner per aggregate keeps send order; the key keeps Kafka order.' },
  hints: [`<p>Hint 1: parallel relays race each other.</p>`, `<p>Hint 2: shard by aggregate, or use a lock per shard.</p>`, `<p>Hint 3: CDC reads the WAL in commit order — an alternative.</p>`],
  approach: `<p>Cause: two relays picked rows of the same aggregate concurrently. Fix: (1) Shard by <code>hash(aggregate_id) % N</code>; each relay holds a lease (advisory lock) on some shards; within a shard, publish in id order and wait for the ack before marking sent (idempotent producer keeps order with in-flight requests). (2) Key Kafka records by <code>aggregate_id</code> so they land in one partition. (3) Or use CDC (Debezium) which reads the WAL in commit order with a single task per database, publishing with key = aggregate_id — HA through Kafka Connect task rebalance. Either way the relay is at-least-once: consumers dedupe by event id.</p>`,
  complexity: `<p>Throughput scales with shards; ordering holds per aggregate.</p>`
});

prob({
  title: 'Consumer Lag Is Climbing — Triage It', level: 'Medium', tags: ['kafka', 'lag', 'operations'], companies: ['LinkedIn', 'Netflix'],
  statement: `<p>Lag on <code>events</code> (24 partitions, 12 consumers) grows steadily from 9:00. Lag is high on partitions 3 and 17 only. CPU of consumers is low. Walk through the diagnosis and fixes.</p>`,
  constraints: `Producers key by tenantId · a big tenant onboarded at 9:00.`,
  example: `<p>Partitions 3 and 17 carry 45% of the traffic.</p>`,
  brute: `<p>Adding 12 more consumers: only one consumer can own partition 3 anyway, so the hot partitions stay behind.</p>`,
  mcq: { q: 'Lag on only two partitions with low CPU most likely means…', options: ['Broker disk full', 'Hot keys / skewed partitions (or slow downstream calls for those keys)', 'Too many partitions', 'Auto-commit disabled'], answer: 1, explain: 'Skew concentrates load; the owner of a hot partition cannot be parallelised by adding members.' },
  hints: [`<p>Hint 1: uneven lag points to skew, even lag to too-slow consumers overall.</p>`, `<p>Hint 2: low CPU suggests waiting on I/O — parallelise within the partition.</p>`, `<p>Hint 3: change the key or process per-key in parallel inside the consumer.</p>`],
  approach: `<p>Check per-partition byte/record rates: the new tenant's key hashes to 3 and 17 (two big tenants or salted). Short-term: inside the consumers of hot partitions process records in parallel <b>per key</b> (keys other than the hot tenant run concurrently; the hot tenant's records stay ordered) — e.g. a key-ordered parallel consumer — and because CPU is low, raise downstream concurrency. Medium-term: key by a finer id (orderId) where ordering per tenant is not needed, or salt the big tenant (<code>tenant#0..7</code>) if order per sub-stream suffices. Verify downstream (DB/API) is not the bottleneck for that tenant. Add alerts on per-partition lag and skew.</p>`,
  complexity: `<p>Throughput of a partition is bounded by its single owner's processing rate unless processing is parallelised within it.</p>`
});

prob({
  title: 'Migrate Classic Mirrored Queues Before Upgrading to RabbitMQ 4', level: 'Hard', tags: ['rabbitmq', 'quorum-queues', 'migration'], companies: ['Broadcom', 'Booking.com', 'ING'],
  statement: `<p>A 3.12 cluster uses classic mirrored queues (<code>ha-mode: all</code> policies) for 40 queues, some with priorities and per-message TTL, and consumers with <code>autoAck=false</code>, unlimited prefetch, and requeue-on-error. You must reach RabbitMQ 4.1 with no message loss. Plan it.</p>`,
  constraints: `24/7 traffic · ~3k msgs/s total · can deploy apps several times.`,
  example: `<p>4.0 removed mirroring: a mirrored classic queue would become a non-replicated classic queue.</p>`,
  brute: `<p>Upgrade the brokers and hope: queues lose replication silently; a node failure loses messages.</p>`,
  mcq: { q: 'Can you convert an existing classic queue to a quorum queue in place?', options: ['Yes, with a policy', 'No, declare a new quorum queue and move consumers/messages', 'Yes, by restarting', 'Only on 4.x'], answer: 1, explain: 'Queue type is fixed at declaration; migrate via new queues (blue-green or shovel).' },
  hints: [`<p>Hint 1: upgrade path goes through 3.13 and feature flags.</p>`, `<p>Hint 2: create new quorum queues, switch bindings, drain the old queues.</p>`, `<p>Hint 3: fix consumer behaviour (prefetch, delivery-limit awareness) at the same time.</p>`],
  approach: `<p>(1) Upgrade 3.12 → 3.13 (enable all stable feature flags) — still supports mirroring. (2) For each queue, declare <code>name.v2</code> as a quorum queue (with <code>x-delivery-limit</code>, DLX; priorities are supported in quorum queues on 4.x, so plan those for after the upgrade or use separate queues per priority meanwhile; check per-message TTL support for your version). (3) Bind <code>.v2</code> to the same exchanges with the same keys — new messages go to both; switch consumers to <code>.v2</code>; unbind the old queue; drain it with an old consumer or a shovel into <code>.v2</code>; delete it. Consumers must be idempotent since a message may be duplicated during the dual binding window (dedupe by message id). (4) Fix consumers: set prefetch, reject(requeue=false) for permanent errors, publisher confirms. (5) Remove <code>ha-*</code> policies, then upgrade to 4.0 → 4.1, verifying no classic mirrored queues remain (the 4.0 upgrade checks). (6) Monitor Raft leader distribution and disk.</p>`,
  complexity: `<p>Migration per queue is O(backlog) messages moved; total time dominated by draining.</p>`
});

prob({
  title: 'Exactly-Once Currency Conversion Stream', level: 'Hard', tags: ['kafka', 'transactions', 'eos', 'zombie-fencing'], companies: ['Wise', 'Revolut', 'PayPal'],
  statement: `<p>A service reads <code>payments</code>, converts amounts using a rates table (compacted topic <code>fx-rates</code>, key = currency pair), and writes <code>payments-usd</code>. Downstream ledgers must see each conversion exactly once, even during rebalances and GC pauses. Design it; also describe what changes if the output were a Postgres table.</p>`,
  constraints: `Kafka 4.1 · 10k events/s · p99 end-to-end &lt; 1 s.`,
  example: `<p>Instance A pauses 40 s, B takes over, A wakes and commits → duplicate outputs (without fencing).</p>`,
  brute: `<p>At-least-once with commit-after-produce: duplicates on every crash or rebalance; downstream must dedupe anyway.</p>`,
  mcq: { q: 'What stops a paused old instance from committing a transaction?', options: ['Session timeout', 'Producer epoch fencing on the transactional.id / group generation', 'acks=all', 'Compaction'], answer: 1, explain: 'A newer epoch fences the old producer; commits from an old generation are rejected.' },
  hints: [`<p>Hint 1: input offsets and outputs must commit together.</p>`, `<p>Hint 2: downstream needs read_committed.</p>`, `<p>Hint 3: for a DB sink, store offsets in the DB transaction instead.</p>`],
  approach: `<p><b>Kafka sink:</b> transactional producer (<code>transactional.id</code> per instance), consumer with auto-commit off; per poll batch: begin, produce converted records (key = paymentId), <code>sendOffsetsToTransaction(offsets, consumer.groupMetadata())</code>, commit. Passing group metadata lets the broker fence commits from an old generation; transactional.id epochs fence zombie producers. Downstream consumers use <code>isolation.level=read_committed</code>. Rates: build a local table from the compacted <code>fx-rates</code> topic (or a Kafka Streams GlobalKTable) — record which rate version was used in the output for auditability. Commit every ~100 ms to meet p99 &lt; 1 s (read_committed latency ≈ commit interval). Or simply use Kafka Streams with <code>exactly_once_v2</code>. <b>Postgres sink:</b> Kafka transactions do not help; in one DB transaction insert the conversion and upsert <code>consumer_offsets(topic, partition, next_offset)</code>; on assignment, <code>seek</code> to the stored offsets. Same exactly-once effect.</p>`,
  complexity: `<p>Transaction overhead amortised per batch; latency ≈ commit interval.</p>`
});

prob({
  title: 'Design the Event Backbone for a Marketplace', level: 'Hard', tags: ['kafka', 'rabbitmq', 'architecture', 'outbox'], companies: ['Amazon', 'Etsy', 'Flipkart'],
  statement: `<p>A marketplace has Orders, Payments, Inventory, Shipping, Notifications, Search and a data lake. Design messaging: which broker(s), topics/queues, keys, delivery guarantees, how services publish reliably, how they consume safely, schema evolution, and failure handling.</p>`,
  constraints: `Peak 20k orders/min · 9 consuming teams · replay required for search and analytics · notifications need per-channel retries.`,
  example: `<p>OrderPlaced is read by Payments, Inventory, Search and the lake — 4 groups on one topic.</p>`,
  brute: `<p>Services call each other synchronously and also write to each other's databases: tight coupling, cascading failures, no replay.</p>`,
  mcq: { q: 'Best key for the orders topic?', options: ['sellerId', 'orderId', 'null', 'eventType'], answer: 1, explain: 'orderId gives per-order ordering with even spread; sellerId risks hot partitions.' },
  hints: [`<p>Hint 1: domain events between services with many readers = log.</p>`, `<p>Hint 2: per-message retry and routing for notifications = queue.</p>`, `<p>Hint 3: outbox on the producer side, inbox on the consumer side, schema registry, DLQs with owners.</p>`],
  approach: `<p><b>Kafka backbone</b> (RF=3, min ISR 2, acks=all): topics per aggregate — <code>orders</code> (key orderId, 24–48 partitions), <code>payments</code> (key paymentId or orderId), <code>inventory</code> (key sku), <code>shipments</code> (key orderId); 7–14 day retention plus a lake sink via Kafka Connect; compacted <code>product-catalog</code> for search rebuilds. Each service publishes via a <b>transactional outbox</b> (Debezium CDC), consumes with its own group, commits after processing, and uses an <b>inbox</b> for non-idempotent effects. <b>Schemas</b>: Avro/Protobuf with a registry, backward compatibility, event versioning. <b>Failures</b>: retry topics only for independent events, parked keys for state machines, per-team DLTs with alerts and replay tooling. <b>Notifications</b>: a consumer of order events publishes jobs into <b>RabbitMQ</b> (topic exchange by channel and region, quorum queues, delivery-limit, TTL+DLX backoff stages), because per-message retries and routing are its strength — or use Kafka only if the team prefers one broker and accepts retry-topic complexity. Monitor lag per group, DLQ depth, and outbox age.</p>`,
  complexity: `<p>20k orders/min ≈ 333/s base events, a few thousand/s with fan-out — far below a 3-broker cluster's capacity; partitions are sized for consumer parallelism, not for raw throughput.</p>`
});

prob({
  title: 'Recover From a Poison Message That Blocked a Partition for Hours', level: 'Hard', tags: ['kafka', 'poison-message', 'incident', 'dlt'], companies: ['Uber', 'Grab', 'DoorDash'],
  statement: `<p>A producer released a record with a new field type. The consumer's deserializer throws, the consumer crashes and restarts, re-reads from the committed offset, crashes again — for 4 hours. Lag on that partition is 2M records. Write the incident response and the permanent fixes.</p>`,
  constraints: `Business events must not be skipped silently · other partitions are fine.`,
  example: `<p>Partition 5, offset 881,204: deserialization exception, crash loop.</p>`,
  brute: `<p>Reset the group offset past the bad record with the CLI: the partition recovers, but the record is silently lost and nobody knows what it contained.</p>`,
  mcq: { q: 'Where should a record that cannot be deserialized go?', options: ['Retry forever', 'A dead-letter topic with original bytes and metadata', 'Be skipped silently', 'Back to the same topic'], answer: 1, explain: 'Keep the raw bytes and context for later repair; do not block the partition.' },
  hints: [`<p>Hint 1: first restore flow, but preserve the bad record.</p>`, `<p>Hint 2: catch deserialization errors separately from processing errors.</p>`, `<p>Hint 3: prevent recurrence with schema compatibility checks in CI and the registry.</p>`],
  approach: `<p><b>Now:</b> stop the group, copy the raw bytes at partition 5 offset 881,204 to a DLT (kafka-console-consumer with --partition/--offset, or a tool), then reset the group's offset for partition 5 to 881,205 and restart; consumers catch up (watch downstream load; maybe throttle). Roll back or fix the producer. <b>Permanent:</b> wrap the deserializer (e.g. ErrorHandlingDeserializer) so failures become a handled error object; send such records with headers (topic, partition, offset, exception, schema id) to a DLT and continue; count processing attempts and send to the DLT after N with backoff; alert on DLT rate and on crash-loop restarts. Enforce schema compatibility in the registry (BACKWARD) and in CI so incompatible producers cannot deploy. Write a replay tool that re-publishes fixed DLT records with original keys; consumers are idempotent by event id.</p>`,
  complexity: `<p>Recovery time ≈ backlog / consumer throughput; prevention cost is a registry check per deploy.</p>`
});

/* =====================================================================
   QUIZ
   ===================================================================== */
quiz.push(
  { q: 'Kafka guarantees record order…', options: ['across the whole topic', 'within one partition', 'within one broker', 'never'], answer: 1, explain: 'Order is per partition. Use a key so related records share a partition.' },
  { q: 'A keyed record\'s partition with the default partitioner is…', options: ['random', 'round-robin', 'murmur2(key) mod number of partitions', 'chosen by the broker'], answer: 2, explain: 'The producer hashes the key bytes with murmur2, makes it positive, and takes it modulo the partition count.' },
  { q: 'A group has 10 consumers reading a 6-partition topic. How many consumers are idle?', options: ['0', '4', '6', '10'], answer: 1, explain: 'Each partition has one owner per group: 6 work, 4 idle.' },
  { q: 'The committed offset for a partition means…', options: ['the last record processed', 'the next record to read', 'the log-end offset', 'the high watermark'], answer: 1, explain: 'By convention you commit last processed + 1.' },
  { q: 'Which Kafka 4.0 change matters for cluster metadata?', options: ['ZooKeeper became mandatory', 'ZooKeeper mode was removed; KRaft only', 'Partitions were removed', 'Consumer groups were removed'], answer: 1, explain: 'Kafka 4.0 runs only in KRaft mode; migrate on 3.x first.' },
  { q: 'In a compacted topic, a record with a null value is…', options: ['an error', 'a tombstone that deletes the key after compaction', 'kept forever', 'ignored by consumers'], answer: 1, explain: 'Tombstones mark keys for deletion and are themselves removed after delete.retention.ms.' },
  { q: 'What does the idempotent producer prevent?', options: ['Consumer duplicates after a rebalance', 'Duplicate writes caused by producer retries', 'All duplicates end to end', 'Data loss on disk failure'], answer: 1, explain: 'PID + per-partition sequence numbers let the broker drop retried batches it already wrote.' },
  { q: 'Consumers that should ignore records from aborted transactions set…', options: ['acks=all', 'isolation.level=read_committed', 'enable.auto.commit=false', 'auto.offset.reset=earliest'], answer: 1, explain: 'read_committed reads only up to the last stable offset and filters aborted data.' },
  { q: 'In RabbitMQ, which binding matches routing key order.eu.vip.created?', options: ['order.*.created', 'order.eu.*', 'order.#.created', '*.eu.created'], answer: 2, explain: '# matches zero or more words, so order.#.created matches eu.vip in the middle.' },
  { q: 'For a replicated, highly available queue on RabbitMQ 4.x you use…', options: ['classic mirrored queue', 'quorum queue', 'exclusive queue', 'auto-delete queue'], answer: 1, explain: 'Classic queue mirroring was removed in 4.0; quorum queues use Raft replication.' },
  { q: 'A RabbitMQ consumer with unlimited prefetch on a slow worker causes…', options: ['faster processing', 'that worker hoarding messages while others idle', 'message loss', 'publisher confirms to fail'], answer: 1, explain: 'The broker pushes as many unacked messages as allowed; set basic.qos.' },
  { q: 'Which is NOT a reason RabbitMQ dead-letters a message?', options: ['reject with requeue=false', 'message TTL expired', 'quorum delivery limit exceeded', 'the consumer acked it'], answer: 3, explain: 'An ack deletes the message; the other three dead-letter it when a DLX is configured.' },
  { q: 'The transactional outbox delivers events…', options: ['exactly once', 'at least once, so consumers must dedupe', 'at most once', 'only if the broker supports XA'], answer: 1, explain: 'The relay can crash after publishing and before marking the row sent.' },
  { q: 'Moving a failed Kafka record to a delayed retry topic has which side effect?', options: ['It blocks the partition', 'Later records with the same key may be processed before it', 'It deletes the record', 'It disables idempotence'], answer: 1, explain: 'Non-blocking retries trade per-key order for throughput.' }
);

/* =====================================================================
   INTERVIEW
   ===================================================================== */
interview.push(
  { q: 'How does Kafka guarantee ordering, and how would you keep all events of an order in sequence?', level: 'I', a: `<p>Kafka orders records only within a partition, by offset. The producer chooses the partition: with a key it uses <code>murmur2(key) mod partitions</code>, so the same key always maps to the same partition while the partition count is unchanged. Key every order event by <code>orderId</code>. Keep order through retries with the idempotent producer (default since 3.0, acks=all), which uses sequence numbers to avoid reordering with up to 5 in-flight requests. On the consumer side, process a partition's records in order (or in parallel across keys, never within a key). Adding partitions remaps keys and breaks ordering at the switch point.</p>`, followUps: ['What happens to ordering when a record is sent to a retry topic?', 'How do you handle a hot key?'] },
  { q: 'Explain consumer group rebalancing and how to reduce its impact.', level: 'A', a: `<p>A group's partitions are split among members; when membership or subscriptions change, a rebalance reassigns them. Eager rebalancing revokes all partitions from everyone (stop-the-world). Incremental cooperative rebalancing (CooperativeStickyAssignor) only moves the partitions that must move. Kafka 4.0's KIP-848 protocol (<code>group.protocol=consumer</code>) has the broker compute assignments and members reconcile incrementally via heartbeats, so a slow member no longer stalls the group. Static membership (<code>group.instance.id</code>) avoids rebalances on quick restarts. Also keep poll loops under <code>max.poll.interval.ms</code> and commit in <code>onPartitionsRevoked</code> to avoid duplicates.</p>`, followUps: ['What triggers a rebalance besides a crash?', 'What is a generation id for?'] },
  { q: 'At-most-once, at-least-once, exactly-once: how do you get each with Kafka?', level: 'I', a: `<p><b>At-most-once</b>: commit offsets before processing (or acks=0 on produce) — a crash skips work. <b>At-least-once</b>: acks=all with retries on the producer, commit after processing on the consumer — a crash re-processes. <b>Exactly-once</b> within Kafka: idempotent + transactional producer, <code>sendOffsetsToTransaction</code> so input offsets commit with outputs, and downstream <code>read_committed</code> (Kafka Streams <code>exactly_once_v2</code> packages this). For external systems, achieve an exactly-once <i>effect</i> by making the sink idempotent or storing offsets in the same DB transaction as the output.</p>`, followUps: ['Why can Kafka transactions not cover an email send?', 'What is zombie fencing?'] },
  { q: 'What is log compaction and when would you use it?', level: 'I', a: `<p>With <code>cleanup.policy=compact</code>, Kafka keeps at least the latest record for every key, removing older values in closed segments; offsets do not change. A null value is a tombstone that deletes the key after <code>delete.retention.ms</code>. Use it when the topic represents current state: user profiles, product prices, configuration, Kafka Streams changelogs, or CDC tables — a new consumer can rebuild the full current state by reading from the beginning. It is not instant (dirty ratio, closed segments), so consumers can still see several values per key; it can be combined with time-based deletion (<code>compact,delete</code>).</p>`, followUps: ['How do you delete a user for GDPR in a compacted topic?', 'Why is __consumer_offsets compacted?'] },
  { q: 'Walk me through RabbitMQ exchanges, queues and bindings.', level: 'B', a: `<p>Producers publish to an exchange with a routing key; bindings connect exchanges to queues with a pattern; consumers read from queues. Direct exchanges match the key exactly, topic exchanges match dotted patterns (<code>*</code> one word, <code>#</code> zero or more), fanout copies to every bound queue, headers match on header values, and the default exchange routes to the queue named by the key. Unroutable messages are dropped unless the publisher sets <code>mandatory</code> or an alternate exchange is configured. Queues are quorum (replicated, Raft), classic (single node), or streams (append-only log with offsets).</p>`, followUps: ['How do you broadcast to all instances of a service?', 'What changed for queues in RabbitMQ 4.0?'] },
  { q: 'How do acknowledgements and prefetch work in RabbitMQ, and how do you set prefetch?', level: 'I', a: `<p>RabbitMQ pushes messages; each stays unacked until the consumer sends ack (delete), nack/reject with requeue (return) or without (drop or dead-letter). If the channel closes, unacked messages are redelivered with <code>redelivered=true</code>. Prefetch (<code>basic.qos</code>) limits unacked messages per consumer. Too high: one consumer hoards work and memory, others starve, and a crash redelivers a lot. Too low: per-message round-trips limit throughput. Start around 2× the consumer's concurrency (often 10–100), then measure. Keep processing below <code>consumer_timeout</code> (default 30 min).</p>`, followUps: ['What does autoAck=true give you?', 'How does prefetch relate to fairness?'] },
  { q: 'How do you handle poison messages in Kafka versus RabbitMQ?', level: 'A', a: `<p>RabbitMQ quorum queues count deliveries and dead-letter a message after <code>delivery-limit</code> (default 20 in 4.0) to a DLX; consumers can reject permanent failures with requeue=false to go straight there. Kafka has no per-record delivery count: a consumer that crashes on a record re-reads it forever from the committed offset, blocking the partition. So you catch deserialization and processing errors, count attempts yourself, publish the record with context headers to a dead-letter topic, and commit past it. In both, alert on DLQ growth and provide inspection and replay tooling, with idempotent consumers so replays are safe.</p>`, followUps: ['How do you replay a DLQ safely?', 'Why does schema evolution cause poison messages?'] },
  { q: 'Design retries with backoff for a message consumer.', level: 'I', a: `<p>Classify errors: permanent (validation, 4xx, unknown schema) go to the DLQ immediately; transient (timeouts, 503, deadlocks) are retried. Use exponential backoff with jitter (wait = random(0, min(cap, base·2<sup>n</sup>))) and a max attempt count, then DLQ. In RabbitMQ implement delays with TTL wait queues that dead-letter back, one queue per delay. In Kafka, short in-place retries keep order; longer ones use retry topics (<code>.retry.1m</code>, <code>.retry.10m</code>, DLT) which unblock the partition but reorder events per key. Add a retry budget and circuit breaker so an outage does not multiply load.</p>`, followUps: ['Why jitter?', 'When is retrying in place better than a retry topic?'] },
  { q: 'What are the outbox and inbox patterns and what guarantees do they give together?', level: 'A', a: `<p>Outbox: in the same database transaction as the business change, insert the event into an outbox table; a relay (polling or CDC like Debezium) publishes it and marks it sent. This prevents losing events (DB committed, publish failed) and phantom events (published, DB rolled back). The relay can publish twice, so it is at-least-once. Inbox: the consumer inserts the message id into a table with a unique key in the same transaction as its effect; a duplicate violates the key and is skipped. Together you get an exactly-once effect across services without distributed transactions, as long as ids are kept for the redelivery window.</p>`, followUps: ['Polling relay vs CDC trade-offs?', 'How long do you keep inbox rows?'] },
  { q: 'When would you choose Kafka over RabbitMQ, and vice versa?', level: 'I', a: `<p>Kafka: event streams with many independent readers, replay, long retention, very high throughput, ordered processing per key with parallelism, stream processing and CDC ecosystems. RabbitMQ: task/work queues with competing consumers that scale freely, flexible routing via exchanges, per-message acks, retries, TTL, priorities, DLQs, request/reply, and multi-protocol (AMQP 1.0, MQTT). RabbitMQ streams add replay; Kafka share groups add queue semantics, so the line blurs — decide by readers, replay needs, ordering, per-message semantics, scale, and what the team can operate. Many companies run Kafka as the backbone and a queue for jobs.</p>`, followUps: ['What would you choose for 50 msgs/s of background jobs?', 'How does each scale consumers?'] },
  { q: 'Your Kafka consumer keeps getting kicked out of its group with CommitFailedException. Why?', level: 'I', a: `<p>The time between two <code>poll()</code> calls exceeded <code>max.poll.interval.ms</code> (default 5 minutes), so the consumer was considered stuck and its partitions were reassigned in a new generation; its later commit is rejected. Causes: large <code>max.poll.records</code> with slow per-record work (HTTP or LLM calls), long GC pauses, or blocking calls. Fixes: fewer records per poll, faster or parallel processing per key, hand work to a bounded pool and <code>pause()</code> partitions while still polling, or raise the interval with care. Make processing idempotent, because the reassigned records will be processed again by the new owner.</p>`, followUps: ['Difference between session.timeout.ms and max.poll.interval.ms?', 'How would static membership help here?'] },
  { q: 'How do you make a Kafka cluster not lose acknowledged writes?', level: 'A', a: `<p>Replication factor 3, <code>min.insync.replicas=2</code>, producers with <code>acks=all</code> (and idempotence), and <code>unclean.leader.election.enable=false</code> so an out-of-sync replica never becomes leader. Then an acknowledged write exists on at least two in-sync replicas; losing one broker loses nothing, and if two are gone writes fail with NotEnoughReplicas instead of silently weakening durability. Spread replicas across racks/zones (<code>broker.rack</code>). Kafka relies on replication rather than fsync per write, so correlated failures (whole zone) are what rack awareness protects against. Monitor under-replicated and under-min-ISR partitions.</p>`, followUps: ['What is the high watermark?', 'What trade-off does acks=1 make?'] },
  { q: 'How does RabbitMQ make sure a published message is not lost?', level: 'I', a: `<p>Declare durable exchanges and quorum queues, publish persistent messages, and enable <b>publisher confirms</b>: the broker confirms a message once it is safely stored (for quorum queues, on a Raft majority). Publish with <code>mandatory=true</code> (or an alternate exchange) to detect unroutable messages. If a confirm does not arrive or is negative, republish with the same message id so consumers can dedupe. On the consumer side use manual acks after processing. Handle <code>connection.blocked</code> when the broker raises memory or disk alarms instead of buffering without limit.</p>`, followUps: ['Are confirms synchronous?', 'Why are classic non-replicated queues risky?'] }
);

/* =====================================================================
   MODULE
   ===================================================================== */
registerModule({
  id: 'be22',
  title: 'Messaging Deep Dive: Kafka & RabbitMQ in Practice',
  intro: `<p>Caching & Asynchronous Processing (be09) showed <i>why</i> to use a queue; Microservices Patterns (be10) showed sagas and the outbox at the architecture level. This module goes inside the two brokers interviewers ask about most. In <b>Kafka</b> (3.x/4.x, KRaft) you will see how keys pick partitions, how consumer groups split work and rebalance (eager, cooperative, KIP-848), what an offset commit really means, how retention and compaction shape data, and how idempotent and transactional producers give exactly-once inside Kafka. In <b>RabbitMQ</b> (3.13/4.x) you will route with exchanges and bindings, choose quorum queues or streams, and consume correctly with acks, prefetch, publisher confirms and dead-letter exchanges.</p>
    <p>Then you will choose between the two by workload, and put it all together with the patterns that make messaging safe in production: idempotent consumers, outbox and inbox, retries with backoff and jitter, poison-message handling and DLQs. Every topic has a runnable model (partitioner, rebalance, commit timing, sequence-number dedupe, topic-exchange matcher, prefetch, an end-to-end reliable pipeline) so you can see the mechanism, not just the diagram.</p>`,
  goals: [
    'Choose Kafka keys and partition counts that give per-entity ordering without hot partitions, and explain durability settings (acks, ISR, KRaft)',
    'Explain consumer groups and rebalancing (eager, cooperative, KIP-848, static membership) and fix rebalance storms',
    'Reason precisely about offset commits, delivery semantics, retention and log compaction',
    'Describe how idempotent and transactional producers achieve exactly-once inside Kafka, and where that guarantee stops',
    'Design RabbitMQ topologies with exchanges, bindings, quorum queues and streams, and consume safely with acks, prefetch, confirms and DLX',
    'Pick Kafka, RabbitMQ or both for a workload and defend the choice',
    'Implement idempotent consumers, outbox/inbox, retries with backoff and jitter, and DLQ handling end to end'
  ],
  prereqs: `<p>Required: <b>be09 Caching &amp; Asynchronous Processing</b> (queues, acks, retries, idempotency basics) and <b>be10 Microservices Patterns</b> (outbox, sagas, sync vs async). Comfortable reading Java; runnable models are JS and plain Java. Kafka and RabbitMQ client code is illustrative (not compiled here).</p>`,
  langExplain: `<p>Broker client code and configs are shown in Java (Kafka and RabbitMQ Java clients, Spring) and marked as illustrative because they need a running broker. The mechanisms are modelled in runnable JavaScript and plain Java so you can execute them in the browser or any JDK; the ideas carry over unchanged to Python, Go or Node clients.</p>`,
  hours: 14,
  topics: topics,
  practice: practice,
  quiz: quiz,
  interview: interview
});
})();
