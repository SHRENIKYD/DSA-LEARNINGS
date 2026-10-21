(function () {
  var topics = [], practice = [], quiz = [], interview = [];

  /* ---------- small shared helpers for the visualizers ---------- */
  // FNV-1a 32-bit string hash: deterministic, fast, good enough to demo hash partitioning.
  function fnv(s) {
    s = String(s);
    var h = 2166136261;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    return h >>> 0;
  }
  function words(input, max, hint) {
    var w = String(input === undefined || input === null ? '' : input).trim().split(/[\s,]+/).filter(function (x) { return x.length; });
    if (!w.length) throw new Error(hint);
    if (w.length > max) throw new Error('Use at most ' + max + ' items. ' + hint);
    return w;
  }
  function kvArgs(input, defs) {
    // parses "a=1 b=2" into numbers, falling back to defs
    var out = {}; Object.keys(defs).forEach(function (k) { out[k] = defs[k]; });
    String(input || '').split(/[\s,]+/).forEach(function (tok) {
      var m = tok.match(/^(\w+)=(-?\d+(?:\.\d+)?)$/);
      if (m && Object.prototype.hasOwnProperty.call(defs, m[1])) out[m[1]] = Number(m[2]);
    });
    return out;
  }
  function zeros(n) { var a = []; for (var i = 0; i < n; i++) a.push(0); return a; }
  function shardLabels(n) { var a = []; for (var i = 0; i < n; i++) a.push('S' + i); return a; }

  /* =====================================================================
     TOPIC 1 — SQL vs NoSQL
     ===================================================================== */
  topics.push({
    title: 'SQL vs NoSQL: Choosing the Right Database',
    analogy: `<p>Think of a <b>government records office</b> versus a <b>coat check</b>. The records office (SQL) uses strict printed forms: every form has the same boxes, folders cross-reference each other ("see Property file #88"), and the clerk guarantees that a transfer of land is recorded in <i>both</i> folders or in <i>neither</i>. It can answer almost any question you walk in with, but it is one big office and it gets crowded.</p>
<p>The coat check (a key-value NoSQL store) only answers one question — "ticket 42, please" — but it answers it instantly, and when the queue grows you simply open ten more counters. Other NoSQL stores are like a <b>scrapbook per customer</b> (document DB), a <b>giant ledger sorted by name and date</b> (wide-column DB) or a <b>map of who knows whom</b> (graph DB).</p>`,
    explain: `<p><b>A database choice is really a choice about which questions you must answer fast and which promises you must keep.</b></p>
<p>${H.c('b', '<b>SQL (relational) databases</b>')} — PostgreSQL, MySQL, SQL Server, Oracle. Data lives in <b>tables</b> with a fixed <b>schema</b> (column names and types). Tables are linked with keys, and you combine them with <b>JOINs</b>. They give <b>ACID transactions</b>:</p>
<ul>
<li><b>A</b>tomic — all steps of a transaction happen, or none do (no half-done money transfer).</li>
<li><b>C</b>onsistent — rules (foreign keys, CHECK, UNIQUE) are never broken.</li>
<li><b>I</b>solated — two transactions running at once do not see each other's half-finished work.</li>
<li><b>D</b>urable — once it says "committed", a crash will not lose it.</li>
</ul>
<p>${H.c('p', '<b>NoSQL databases</b>')} — a family, not one thing:</p>
${H.table(['Family', 'Mental model', 'Examples', 'Great at'], [
      ['Key-value', 'Giant hash map', 'Redis, DynamoDB, Memcached', 'Get/put by key in ~1 ms, sessions, carts, counters'],
      ['Document', 'JSON blob per record', 'MongoDB, Couchbase, Firestore', 'Nested, evolving records read as a whole (profile, product)'],
      ['Wide-column', 'Sorted map of maps, partitioned', 'Cassandra, ScyllaDB, HBase, Bigtable', 'Huge write volume, time-ordered data per key (chat, IoT)'],
      ['Graph', 'Nodes + edges', 'Neo4j, Amazon Neptune', 'Many-hop relationship queries (friends of friends, fraud rings)']
    ])}
<p>Most NoSQL stores were built to <b>scale out</b> (add machines) from day one. The price: you must know your <b>access patterns</b> up front, every query should include the <b>partition key</b>, joins are mostly gone (you <b>denormalize</b>, i.e. copy data where it is read), and multi-record transactions are limited or slower.</p>
<p>There is also a third group, ${H.c('g', '<b>Distributed SQL / NewSQL</b>')} — Google Spanner, CockroachDB, YugabyteDB, TiDB — which keeps SQL and ACID but shards and replicates automatically (using consensus such as Raft). You pay with higher write latency (a quorum round trip per commit) and more operational/licence cost.</p>
<p><b>The interview rule of thumb:</b> start with a relational database (PostgreSQL is the safe default) unless a requirement clearly pushes you away — enormous write throughput with simple key lookups, a truly schema-less nested record, many-hop graph queries, or a need to be active in many regions at once. Then name the specific store and say <i>why</i>.</p>
${H.table(['Requirement you hear', 'Leans towards'], [
      ['Money, inventory, bookings — must never double-spend', H.c('b', 'SQL (ACID)')],
      ['Ad-hoc reporting, many different joins', H.c('b', 'SQL')],
      ['500K writes/s, read by one key, time ordered', H.c('p', 'Wide-column (Cassandra/ScyllaDB)')],
      ['Single-digit-ms lookups by ID at any scale, serverless', H.c('p', 'Key-value (DynamoDB)')],
      ['Each record is a nested blob whose shape keeps changing', H.c('p', 'Document (MongoDB) or Postgres JSONB')],
      ['Global SQL with strong consistency across regions', H.c('g', 'Spanner / CockroachDB')]
    ])}`,
    clues: [
      '"transfers", "payments", "inventory must not go negative", "exactly one seat" → you need <b>ACID transactions</b> → SQL or distributed SQL',
      '"admins run ad-hoc reports / analytics with joins" → relational (plus a warehouse later)',
      '"millions of writes per second", "append-only events", "time series per device" → wide-column / LSM-tree store',
      '"schema changes every sprint", "each item has different attributes" → document store or JSONB column',
      '"friends of friends", "shortest path between users", "fraud ring" → graph database',
      '"design for 100M+ users globally with low latency in every region" → think NoSQL or distributed SQL with multi-region replication'
    ],
    code: [
      { lang: 'sql', title: 'Why SQL: an atomic money transfer (runs in SQLite)', code: `-- Two accounts. A CHECK constraint is a rule the database enforces for us.
CREATE TABLE account (
  id      INTEGER PRIMARY KEY,
  owner   TEXT NOT NULL,
  balance INTEGER NOT NULL CHECK (balance >= 0)
);
INSERT INTO account VALUES (1, 'asha', 500), (2, 'ben', 100);

-- Transfer 200 from asha to ben. Both UPDATEs commit together or not at all.
BEGIN;
UPDATE account SET balance = balance - 200 WHERE id = 1;
UPDATE account SET balance = balance + 200 WHERE id = 2;
COMMIT;

-- A JOIN answers a question nobody planned for when the tables were designed.
CREATE TABLE payment (id INTEGER PRIMARY KEY, account_id INTEGER REFERENCES account(id), amount INTEGER);
INSERT INTO payment VALUES (1, 1, 200), (2, 2, 50), (3, 1, 30);
SELECT a.owner, a.balance, COUNT(p.id) AS payments, SUM(p.amount) AS paid
FROM account a LEFT JOIN payment p ON p.account_id = a.id
GROUP BY a.id ORDER BY a.owner;` },
      { lang: 'json', title: 'Why NoSQL: one document holds everything a product page needs', code: `{
  "_id": "sku-88412",
  "title": "Trail Running Shoe",
  "brand": "Peakline",
  "price": { "amount": 8999, "currency": "INR" },
  "variants": [
    { "size": 8, "color": "red",  "stock": 14 },
    { "size": 9, "color": "blue", "stock": 0 }
  ],
  "specs": { "drop_mm": 6, "waterproof": true },
  "rating": { "avg": 4.6, "count": 1289 }
}` }
    ],
    codeTitle: ['ACID transfer + ad-hoc JOIN', 'Document model (read the whole page in one fetch)'],
    viz: {
      title: 'Decision walk: which database for this product?',
      input: 'bank',
      inputLabel: 'Product: bank | chat | catalog | iot | social',
      gen: function (input) {
        var key = String(input || '').trim().toLowerCase();
        var P = {
          bank: { name: 'Bank ledger', a: ['YES', 'YES', 'no (~2K/s)', 'no', 'no'], pick: 'PostgreSQL (one primary + sync standby), later Spanner/CockroachDB if multi-region', why: 'Money needs ACID and constraints; the write rate fits one strong box.' },
          chat: { name: 'Chat messages', a: ['no (per-message only)', 'no', 'YES (~1M/s)', 'no', 'no'], pick: 'Cassandra / ScyllaDB (partition = conversation_id, clustering = message time)', why: 'Massive append-only writes, always read "latest N messages of one conversation".' },
          catalog: { name: 'Product catalog', a: ['no', 'some', 'no', 'YES', 'no'], pick: 'MongoDB (or Postgres JSONB) + a search engine for text search', why: 'Every category has different attributes; a page reads one whole product.' },
          iot: { name: 'IoT sensor readings', a: ['no', 'no', 'YES (~500K/s)', 'no', 'no'], pick: 'Time-series / wide-column store (TimescaleDB, Cassandra, InfluxDB)', why: 'Writes are huge and time-ordered; queries are "device X between t1 and t2".' },
          social: { name: 'Social graph', a: ['no', 'some', 'medium', 'no', 'YES'], pick: 'Graph DB (Neo4j) for multi-hop, or sharded MySQL edge lists (like Facebook TAO) at extreme scale', why: 'The core question is relationships many hops deep.' }
        };
        var p = P[key];
        if (!p) throw new Error('Type one of: bank, chat, catalog, iot, social');
        var qs = ['Need multi-row ACID transactions?', 'Need ad-hoc joins / reporting?', 'Write volume beyond one machine?', 'Schema varies per record?', 'Many-hop relationship queries?'];
        var hints = ['YES pulls you to SQL / distributed SQL.', 'YES pulls you to SQL (+ warehouse).', 'YES pulls you to scale-out NoSQL (or sharding).', 'YES pulls you to document stores / JSONB.', 'YES pulls you to a graph DB.'];
        var frames = [];
        var rows = qs.map(function (q) { return [q, '?']; });
        frames.push({ narr: 'Product: <b>' + p.name + '</b>. We ask five questions. Each answer pushes us toward a family of databases — we are not picking by fashion, we are picking by <b>requirements</b>.', parts: [{ type: 'table', label: 'Requirement checklist', columns: ['Question', 'Answer'], rows: rows.map(function (r) { return r.slice(); }) }] });
        for (var i = 0; i < qs.length; i++) {
          rows[i][1] = p.a[i];
          var hl = {}; hl[i] = /YES/.test(p.a[i]) ? 'sel' : 'cur';
          frames.push({ narr: 'Q' + (i + 1) + ': <b>' + qs[i] + '</b> → ' + p.a[i] + '. ' + hints[i], parts: [
            { type: 'table', label: 'Requirement checklist', columns: ['Question', 'Answer'], rows: rows.map(function (r) { return r.slice(); }), hl: hl },
            { type: 'vars', label: 'Running verdict', vals: { strongestSignal: /YES/.test(p.a[i]) ? qs[i] : '(none yet)' }, hl: { strongestSignal: /YES/.test(p.a[i]) ? 'ok' : '' } }
          ] });
        }
        frames.push({ narr: '<b>Pick:</b> ' + p.pick + '. <b>Why:</b> ' + p.why, parts: [
          { type: 'table', label: 'Requirement checklist', columns: ['Question', 'Answer'], rows: rows.map(function (r) { return r.slice(); }) },
          { type: 'text', label: 'Decision', html: '<b>' + p.pick + '</b><br>' + p.why + '<br><span class="c-m">Always say the trade-off you accept: e.g. NoSQL means designing tables around queries and losing easy joins.</span>' }
        ] });
        return frames;
      }
    },
    examples: [
      { title: 'Bank core ledger → PostgreSQL', html: `<p>Requirements: debit one account and credit another atomically, balances must never go below zero, auditors run ad-hoc SQL. Peak ≈ 2,000 transfers/s — one well-sized Postgres primary handles 10K+ simple writes/s. ${H.c('g', 'Pick PostgreSQL')} with a synchronous standby (no data loss on failover). NoSQL would push the "no double-spend" logic into application code, which is where bugs live.</p>` },
      { title: 'Chat messages → Cassandra / ScyllaDB', html: `<p>WhatsApp-scale chat: ~100 billion messages/day ≈ 1.2M writes/s. Reads are almost always "last 50 messages of conversation X". Table: <code>messages(conversation_id, message_ts, sender, body)</code> with <code>PRIMARY KEY ((conversation_id), message_ts)</code>. The partition key keeps a whole conversation on one node and the clustering column keeps it sorted — one disk seek per page. ${H.c('p', 'No joins needed')}, LSM-tree storage makes writes cheap.</p>` },
      { title: 'Product catalog → MongoDB or Postgres JSONB', html: `<p>Shoes have sizes, TVs have screen sizes, books have ISBNs. In pure SQL you would need a sparse table with 400 nullable columns or an entity-attribute-value mess. A document per product (see the JSON above) is read in one fetch. ${H.c('b', 'Twist:')} Postgres <code>JSONB</code> + GIN index gives you documents <i>and</i> SQL — many teams pick that to avoid running two databases.</p>` },
      { title: 'Shopping cart / sessions → Redis or DynamoDB', html: `<p>Access is always "get cart for user U" / "update cart for user U". Pure key-value. DynamoDB gives single-digit-ms reads at any scale with no servers to manage; Redis gives sub-ms but data must fit in RAM (and needs persistence settings like AOF if losing a cart matters).</p>` },
      { title: 'Polyglot persistence: Uber-style ride app', html: `<p>Trips and payments in a relational store (ACID), live driver locations in Redis (overwritten every 4 s), trip history and logs in a wide-column store, search in Elasticsearch, analytics in a warehouse. ${H.c('y', 'Interview tip:')} it is fine to use several databases — but justify each one, because every extra store costs on-call pain and data-sync work.</p>` }
    ],
    deepDive: `<p><b>Why does NoSQL scale out more easily?</b> Not magic — it gives things up. If every query names a partition key, the router can send it to exactly one machine, so adding machines adds capacity linearly. Joins and multi-row transactions across machines need coordination (network round trips, locks, 2PC), which is exactly what kills linear scaling. Relational databases <i>can</i> be sharded too (Vitess for MySQL, Citus for Postgres) — you then inherit the same rules.</p>
<p><b>ACID vs BASE.</b> Classic NoSQL marketing said BASE (Basically Available, Soft state, Eventually consistent). Reality in 2026 is blurrier: MongoDB has multi-document ACID transactions (since 4.0), DynamoDB has <code>TransactWriteItems</code> (up to 100 items), Cassandra has lightweight transactions (Paxos-based, slow) and newer Accord-based transactions. Ask "what does a transaction cost here?" rather than "does it support transactions?".</p>
<p><b>Storage engines matter.</b> B-tree engines (Postgres, InnoDB) update pages in place — great reads, random-write cost. LSM-tree engines (Cassandra, RocksDB, ScyllaDB) append to a memtable and flush sorted files, then compact — very cheap writes, reads may check several files (Bloom filters help), and compaction adds background I/O.</p>
<p><b>"Schemaless" is schema-on-read.</b> The schema still exists — inside every piece of code that reads the data. Old documents with old shapes live forever unless you migrate them, so you need versioned documents or lazy migration.</p>
<p><b>Postgres is very capable vertically.</b> A single modern box with 64+ cores, 512 GB RAM and NVMe can serve tens of thousands of writes/s and 100K+ simple reads/s. Many "we need NoSQL" designs are really "we need an index and a cache". Scale up first; shard when one box (plus replicas) truly cannot cope, or when the dataset no longer fits.</p>
<p><b>Distributed SQL trade-off.</b> Spanner uses TrueTime (GPS + atomic clocks) to order transactions globally; CockroachDB uses hybrid logical clocks. Each write is a Raft quorum commit — cross-region writes cost tens to hundreds of ms. Great for correctness at global scale, not free.</p>`,
    aiEra: `<p><b>What AI changes:</b> an assistant can draft a schema, a DynamoDB single-table design or a Cassandra table from a list of access patterns in seconds. It is also good at translating SQL to MongoDB aggregations and spotting missing indexes from an <code>EXPLAIN</code> plan.</p>
<p><b>Use AI as a partner:</b> "Here are my 8 access patterns with QPS — propose a Cassandra schema and tell me which pattern needs a second table." Then <i>you</i> check each query names the partition key. Ask it to list failure modes: "What breaks in this design at 10× traffic?"</p>
<p><b>New in the AI era:</b> apps now store <b>embeddings</b> for semantic search and RAG. Options: a dedicated vector DB (Pinecone, Weaviate, Milvus, Qdrant) or a vector index inside your existing DB (pgvector in Postgres, Atlas Vector Search in MongoDB, OpenSearch k-NN). The same decision logic applies: if vectors are small-to-medium and live next to relational data, pgvector avoids another system; at billions of vectors with heavy QPS, a specialized engine wins.</p>
<p><b>Where AI goes wrong:</b> it often says "use MongoDB for scalability" with no reason, invents features or limits of specific databases, and forgets that money needs transactions. <b>What you must still own:</b> listing requirements and access patterns, defending the trade-off out loud, and knowing the real limits of the store you pick.</p>`,
    problems: [{
      title: 'Pick the database(s) for a food-delivery app',
      level: 'Medium', tags: ['sql-vs-nosql', 'polyglot'], companies: ['Swiggy', 'DoorDash', 'Zomato', 'Uber'],
      statement: `<p>You are designing the storage for a food-delivery app: users, restaurants with menus, orders with payments, live rider GPS pings every 5 s, and order history. Choose a database for each kind of data and justify it.</p>`,
      constraints: `<p>20M monthly users, 1M orders/day (peak 200 orders/s), 300K active riders at peak, menus change a few times a day, payments must never be double-charged.</p>`,
      example: `<p>Rider pings: 300K riders ÷ 5 s = ${H.c('r', '60,000 writes/s')} of data that is <i>overwritten</i> and only the latest value matters → a SQL table with an UPDATE per ping is a poor fit. Orders: ${H.c('g', '200 writes/s')} but each must be atomic with payment → SQL is perfect.</p>`,
      brute: { why: `<p><b>Naive design:</b> "Put everything in one MongoDB cluster because it scales." Orders and payments then need multi-document transactions everywhere (slower, easy to forget), finance's ad-hoc reports become painful aggregations, and 60K GPS updates/s of throwaway data still hammer the same cluster that holds critical orders. Or the opposite: "everything in one Postgres" — GPS pings churn the WAL and replicas with data nobody keeps.</p>` },
      mcq: { q: 'Where should the 60K/s rider GPS updates go?', options: ['The orders table in Postgres', 'An in-memory store such as Redis (geo commands), keyed by rider', 'A data warehouse', 'A graph database'], answer: 1, explain: 'Only the latest location matters and it is overwritten every few seconds; Redis handles this in memory with GEOADD/GEOSEARCH for "riders near this restaurant".' },
      hints: [`<p>Split the data by <b>how it is used</b>: correctness-critical (orders, payments), read-heavy and flexible (menus), fast-changing throwaway (GPS), large append-only (history/events).</p>`, `<p>Estimate QPS for each kind; then match: ACID → SQL, overwrite-heavy ephemeral → in-memory KV, flexible nested → document/JSONB, huge append → wide-column or object storage + warehouse.</p>`, `<p>Recipe: Postgres for users/orders/payments; menus as JSONB (or a document store) + cache; Redis GEO for rider locations; Kafka for events → warehouse for analytics. Mention what happens if Redis dies (riders re-send within 5 s).</p>`],
      solution: {
        approach: `<p><b>1. Users, orders, payments → PostgreSQL</b> (one primary + synchronous standby + 2 async read replicas). Orders and payments change together inside one transaction; an idempotency key (unique column) prevents double charges. 200 writes/s peak is tiny for one box.</p>
<p><b>2. Restaurants & menus → Postgres JSONB</b> (menu document per restaurant) fronted by a CDN/Redis cache, because menus are read millions of times and change rarely. A separate document DB is acceptable but adds a system to run.</p>
<p><b>3. Rider live location → Redis</b> with <code>GEOADD riders lon lat riderId</code> and <code>GEOSEARCH</code> to find riders within 3 km. 60K writes/s fits easily on a small Redis cluster; data is ephemeral (riders re-send every 5 s), so losing a node costs at most a few seconds of freshness.</p>
<p><b>4. Order history / events → Kafka → data warehouse</b> (BigQuery/Snowflake) or a wide-column store if users browse years of history. Keep the OLTP database small and fast.</p>
<p><b>Trade-offs to say aloud:</b> four systems means more ops; we accept it because each one removes a scaling or correctness risk. Data flows one way (Postgres → CDC → Kafka → others) so there is one source of truth.</p>`,
        complexity: `<p>Postgres: ~200 writes/s, ~5K reads/s (mostly served by replicas and cache). Redis: 60K writes/s, O(log N + M) geo queries. Storage: 1M orders/day × ~2 KB ≈ 2 GB/day in OLTP, archived after 90 days.</p>`,
        followUps: ['How do you keep the menu cache fresh when a restaurant marks an item out of stock?', 'What if payments move to a third-party processor — what still needs ACID locally?', 'When would you move orders to a distributed SQL database?']
      }
    }]
  });

  /* =====================================================================
     TOPIC 2 — Replication: leader/follower, sync vs async
     ===================================================================== */
  topics.push({
    title: 'Replication: Leader/Follower, Sync vs Async, Lag & Failover',
    analogy: `<p>A head chef (the <b>leader</b>) writes every new recipe change in a notebook. Assistant chefs in other kitchens (<b>followers</b>) receive photocopies of each new page and copy it into their own notebooks.</p>
<p><b>Synchronous</b>: the head chef refuses to tell the owner "done" until an assistant phones back "I copied it" — safe, but slow if the assistant is far away. <b>Asynchronous</b>: the head chef says "done" immediately and mails the copies — fast, but if the head chef's kitchen burns down before the mail arrives, that recipe change is gone. The time a photocopy is "in the mail" is <b>replication lag</b>.</p>`,
    explain: `<p><b>Replication</b> = keeping a copy of the same data on several machines. Why bother?</p>
<ul>
<li><b>Durability</b> — a disk or whole machine can die without losing data.</li>
<li><b>Availability</b> — if the main machine dies, another takes over (<b>failover</b>).</li>
<li><b>Read scaling</b> — many copies can serve reads (next topic).</li>
<li><b>Latency</b> — a copy close to the user (another region) answers faster.</li>
</ul>
<p>${H.c('b', '<b>Leader/follower</b>')} (also called primary/replica, master/slave in old docs) is the most common setup: <b>all writes go to one leader</b>. The leader records each change in its log (Postgres WAL, MySQL binlog) and streams the log to followers, which replay it in the same order. Reads may go to any node.</p>
${H.table(['Mode', 'When does the client hear "OK"?', 'Latency', 'Data loss if leader dies?', 'If a follower is down'], [
      ['Asynchronous', 'As soon as the leader has it', H.c('g', 'Fast'), H.c('r', 'Possible (last few ms–s of writes)'), H.c('g', 'Writes continue')],
      ['Synchronous (all)', 'After every follower confirms', H.c('r', 'Slowest follower decides'), H.c('g', 'None'), H.c('r', 'Writes block')],
      ['Semi-synchronous / quorum', 'After at least 1 (or a majority) confirms', H.c('y', 'Medium'), H.c('g', 'None if a confirmed copy is promoted'), H.c('y', 'Continue while enough are up')]
    ])}
<p><b>Replication lag</b> is how far a follower is behind the leader — measured in bytes of log or in seconds. Normal lag is milliseconds; under heavy load, a long query on the follower, or a network hiccup it can grow to seconds or minutes. While lagging, the follower serves <b>stale data</b>.</p>
<p><b>Failover</b> = promoting a follower when the leader dies: detect failure (missed heartbeats, usually a timeout of 10–30 s), choose the most up-to-date follower, repoint clients, and make sure the old leader cannot come back still thinking it is leader (<b>split brain</b>) — usually with fencing or a consensus service like etcd/ZooKeeper (Patroni does this for Postgres).</p>
<p><b>Two numbers interviewers love:</b> <b>RPO</b> (Recovery Point Objective) — how much data you may lose: async ≈ seconds, sync = 0. <b>RTO</b> (Recovery Time Objective) — how long until service is back: automatic failover ≈ 10–60 s.</p>`,
    clues: [
      '"must not lose a single committed transaction" / "RPO = 0" → synchronous or semi-sync (quorum) replication',
      '"survive a machine / zone failure" → at least one follower in another availability zone',
      '"users in another continent see stale data" / "eventually consistent" → asynchronous cross-region replication',
      '"write latency must stay under 10 ms" + "replicas in another region" → cross-region sync is impossible (speed of light ≈ 60–150 ms RTT), use async',
      '"automatic failover", "split brain", "two leaders" → leader election with fencing (etcd/ZooKeeper, Raft)',
      '"writes in multiple regions at the same time" → multi-leader or leaderless replication with conflict resolution'
    ],
    code: { lang: 'text', title: 'PostgreSQL: turning on synchronous (quorum) replication', code: `# postgresql.conf on the primary
wal_level = replica                 # write enough WAL to replay on standbys
max_wal_senders = 10                # how many standbys may stream at once

# Quorum commit: COMMIT waits until ANY 1 of these 2 standbys has the WAL flushed.
synchronous_standby_names = 'ANY 1 (replica_az_b, replica_az_c)'

# Per-transaction durability knob:
#   on           -> wait for sync standby to flush WAL (RPO = 0)
#   remote_apply -> also wait until it is visible to reads on the standby
#   local        -> do not wait for standbys (async for this transaction)
synchronous_commit = on

# Check lag on the primary:
#   SELECT application_name, state, sync_state,
#          write_lag, flush_lag, replay_lag
#   FROM pg_stat_replication;` },
    viz: {
      title: 'Leader/follower replication with lag (async vs sync vs semi-sync)',
      input: 'async',
      inputLabel: 'Mode: async | sync | semisync',
      gen: function (input) {
        var mode = String(input || '').trim().toLowerCase();
        if (['async', 'sync', 'semisync'].indexOf(mode) < 0) throw new Error('Type async, sync or semisync');
        var nodes = [
          { id: 'C', label: 'Writer client', x: 8, y: 22, shape: 'box' },
          { id: 'L', label: 'Leader', x: 42, y: 22, shape: 'box' },
          { id: 'F1', label: 'Follower 1 (same region, 2 ms)', x: 82, y: 8, shape: 'box', w: 26 },
          { id: 'F2', label: 'Follower 2 (far region, 80 ms)', x: 82, y: 40, shape: 'box', w: 26 },
          { id: 'R', label: 'Reader client', x: 42, y: 54, shape: 'box' }
        ];
        var edges = [['C', 'L', 'write'], ['L', 'F1', 'WAL'], ['L', 'F2', 'WAL'], ['L', 'C', 'ack'], ['R', 'F2', 'read']];
        var st = { L: [100, 'x=1'], F1: [100, 'x=1'], F2: [100, 'x=1'] };
        function tbl(hlRow) {
          var rows = ['L', 'F1', 'F2'].map(function (n) {
            var lag = st.L[0] - st[n][0];
            return [n === 'L' ? 'Leader' : n === 'F1' ? 'Follower 1' : 'Follower 2', st[n][0], st[n][1], n === 'L' ? '—' : (lag === 0 ? '0 (caught up)' : lag + ' entries behind')];
          });
          var t = { type: 'table', label: 'Log position (LSN) and value of x on each node', columns: ['Node', 'LSN', 'Value', 'Lag'], rows: rows };
          if (hlRow !== undefined) { t.hl = {}; t.hl[hlRow] = 'cur'; }
          return t;
        }
        function g(hl, ehl, tags) { return { type: 'graph', directed: true, height: 62, nodes: nodes, edges: edges, hl: hl || {}, ehl: ehl || {}, tags: tags || {} }; }
        var frames = [];
        frames.push({ narr: 'Mode <b>' + mode + '</b>. Everyone starts in sync at LSN 100 with <b>x=1</b>. LSN = log sequence number, the position in the leader\'s write-ahead log.', parts: [g({}, {}, { L: 'LSN 100', F1: 'LSN 100', F2: 'LSN 100' }), tbl()] });
        frames.push({ narr: 'Writer sends <b>SET x=2</b>. All writes go to the <b>leader</b> — followers never accept writes from clients.', parts: [g({ C: 'cur', L: 'cur' }, { 'C-L': 'cur' }), tbl()] });
        st.L = [101, 'x=2'];
        frames.push({ narr: 'Leader appends the change to its WAL (LSN 101) and applies it. Now the question is: <b>when do we tell the client "OK"?</b>', parts: [g({ L: 'ok' }, {}, { L: 'LSN 101' }), tbl(0)] });
        if (mode === 'async') {
          frames.push({ narr: '<b>Async:</b> the leader acks the client <b>immediately</b> (≈1 ms) and ships the WAL in the background. Fast — but right now both followers are behind.', parts: [g({ C: 'ok' }, { 'L-C': 'ok', 'L-F1': 'cur', 'L-F2': 'cur' }, { F1: 'lag 1', F2: 'lag 1' }), tbl()] });
          st.F1 = [101, 'x=2'];
          frames.push({ narr: 'Follower 1 (2 ms away) applies LSN 101. Follower 2 is far away and also busy running a long report query — its replay is stuck.', parts: [g({ F1: 'ok', F2: 'bad' }, { 'L-F1': 'ok', 'L-F2': 'cur' }, { F1: 'LSN 101', F2: 'LSN 100' }), tbl(2)] });
          frames.push({ narr: 'A reader asks Follower 2 for x and gets <span class="c-r"><b>x=1 (stale!)</b></span> even though x=2 was acknowledged. This is <b>replication lag</b> made visible.', parts: [g({ R: 'bad', F2: 'bad' }, { 'R-F2': 'bad' }), tbl(2)] });
          st.L = [102, 'x=3'];
          frames.push({ narr: 'Writer sends <b>SET x=3</b>. Leader writes LSN 102 and acks at once…', parts: [g({ L: 'ok', C: 'ok' }, { 'C-L': 'cur', 'L-C': 'ok' }, { L: 'LSN 102' }), tbl(0)] });
          frames.push({ narr: '…and <span class="c-r"><b>crashes</b></span> before shipping LSN 102 to anyone. The client was told "OK" for x=3.', parts: [g({ L: 'bad' }, {}, { L: 'DOWN' }), tbl(0)] });
          st.L = [101, 'x=2'];
          frames.push({ narr: 'Failover promotes Follower 1 (most up to date: LSN 101). New value is x=2 — the acknowledged write <span class="c-r"><b>x=3 is lost</b></span>. RPO of async = whatever was in flight.', parts: [g({ F1: 'sel', L: 'done' }, {}, { F1: 'NEW LEADER', L: 'dead' }), { type: 'table', label: 'After failover', columns: ['Node', 'LSN', 'Value', 'Note'], rows: [['Old leader', 102, 'x=3', 'dead — its LSN 102 never left the box'], ['Follower 1 → leader', 101, 'x=2', 'promoted'], ['Follower 2', 100, 'x=1', 'will catch up from new leader']], hl: { 0: 'bad', 1: 'ok' } }] });
          frames.push({ narr: '<b>Summary (async):</b> lowest write latency, writes keep flowing even if followers die, but reads from followers can be stale and a crash can lose recent acknowledged writes.', parts: [{ type: 'bars', label: 'Write latency the client sees (ms)', values: [1, 3, 81], idxLabels: ['async', 'semi-sync (F1)', 'sync (all)'], hl: { 0: 'ok' } }] });
        } else if (mode === 'sync') {
          frames.push({ narr: '<b>Sync (all followers):</b> leader ships WAL to both followers and <b>waits</b> for both to confirm before acking.', parts: [g({ L: 'cur' }, { 'L-F1': 'cur', 'L-F2': 'cur' }, { L: 'waiting…' }), tbl()] });
          st.F1 = [101, 'x=2'];
          frames.push({ narr: 'Follower 1 confirms after ~2 ms. Still waiting for Follower 2, 80 ms away. The client is blocked the whole time.', parts: [g({ F1: 'ok', F2: 'cur' }, { 'L-F1': 'ok', 'L-F2': 'cur' }, { F1: 'LSN 101' }), tbl(2)] });
          st.F2 = [101, 'x=2'];
          frames.push({ narr: 'Follower 2 confirms after ~80 ms. Only now does the client get "OK". Write latency = the <b>slowest</b> follower.', parts: [g({ F2: 'ok', C: 'ok' }, { 'L-F2': 'ok', 'L-C': 'ok' }, { F2: 'LSN 101' }), tbl()] });
          frames.push({ narr: 'A reader on Follower 2 now sees <b>x=2</b> — no stale reads for committed data (with remote_apply).', parts: [g({ R: 'ok', F2: 'ok' }, { 'R-F2': 'ok' }), tbl(2)] });
          frames.push({ narr: 'But if Follower 2 goes <span class="c-r"><b>down</b></span>, every new write <b>blocks forever</b> waiting for its confirmation. Sync-to-all trades availability for zero data loss.', parts: [g({ F2: 'bad', C: 'bad' }, { 'L-F2': 'bad', 'C-L': 'cur' }, { F2: 'DOWN', C: 'blocked' }), tbl()] });
          frames.push({ narr: '<b>Summary (sync):</b> RPO = 0 and fresh followers, but latency = slowest replica and any replica outage stops writes. That is why "sync to all" is rare; quorum/semi-sync is the usual compromise.', parts: [{ type: 'bars', label: 'Write latency the client sees (ms)', values: [1, 3, 81], idxLabels: ['async', 'semi-sync (F1)', 'sync (all)'], hl: { 2: 'bad' } }] });
        } else {
          frames.push({ narr: '<b>Semi-sync / quorum (ANY 1):</b> leader ships to both and waits for <b>the first</b> confirmation only.', parts: [g({ L: 'cur' }, { 'L-F1': 'cur', 'L-F2': 'cur' }, { L: 'waiting for 1' }), tbl()] });
          st.F1 = [101, 'x=2'];
          frames.push({ narr: 'Follower 1 confirms after ~2 ms → quorum reached → client gets "OK" in ~3 ms. Follower 2 is still catching up (lag) — that is fine.', parts: [g({ F1: 'ok', C: 'ok', F2: 'cur' }, { 'L-F1': 'ok', 'L-C': 'ok', 'L-F2': 'cur' }, { F1: 'LSN 101', F2: 'LSN 100' }), tbl(2)] });
          frames.push({ narr: 'Reads on Follower 2 can still be <span class="c-y">stale</span> for a moment — semi-sync protects <b>durability</b>, not read freshness on every replica.', parts: [g({ R: 'cur', F2: 'cur' }, { 'R-F2': 'cur' }), tbl(2)] });
          frames.push({ narr: 'Leader <span class="c-r"><b>crashes</b></span>. Every acknowledged write is on at least one follower (F1).', parts: [g({ L: 'bad' }, {}, { L: 'DOWN' }), tbl(1)] });
          frames.push({ narr: 'Failover promotes <b>Follower 1</b> (it holds LSN 101). <span class="c-g"><b>No acknowledged write is lost</b></span>, and Follower 2 being slow never blocked anybody.', parts: [g({ F1: 'sel', L: 'done' }, {}, { F1: 'NEW LEADER', L: 'dead' }), tbl(1)] });
          frames.push({ narr: '<b>Summary (semi-sync):</b> near-async latency, zero loss as long as you promote a confirmed follower. If <i>both</i> followers die, you choose: block writes, or fall back to async (MySQL semi-sync does this after a timeout — silently weakening RPO!).', parts: [{ type: 'bars', label: 'Write latency the client sees (ms)', values: [1, 3, 81], idxLabels: ['async', 'semi-sync (F1)', 'sync (all)'], hl: { 1: 'ok' } }] });
        }
        return frames;
      }
    },
    examples: [
      { title: 'Async lag math', html: `<p>A leader takes 5,000 writes/s. A follower can replay only 4,000/s because a nightly report is hogging its disk. Every second it falls 1,000 writes behind; after a 10-minute report it is <b>600,000 writes</b> behind, which at the leader's 5,000 writes/s is <b>2 minutes</b> of data. When the report ends the follower replays at, say, 8,000/s while 5,000/s keep arriving, so it closes the gap at 3,000/s → 600,000 ÷ 3,000 = <b>200 s</b> more to catch up. Users reading from it see minutes-old data the whole time. ${H.c('y', 'Fix:')} run reports on a dedicated analytics replica that the app never reads from, and alert on <code>replay_lag</code> &gt; a few seconds.</p>` },
      { title: 'Why cross-region sync is slow', html: `<p>Mumbai ↔ Virginia round trip ≈ 180 ms. A synchronous commit needs at least one round trip, so every write takes ≥ 180 ms and one user doing 5 sequential writes waits nearly a second. ${H.c('g', 'Common pattern:')} sync (quorum) to a follower in <i>another zone of the same region</i> (≈1–2 ms) for RPO = 0, plus <i>async</i> followers in far regions for disaster recovery and local reads.</p>` },
      { title: 'Failover gone wrong: split brain', html: `<p>The leader's network to the monitor breaks, but it is still alive and serving some clients. The monitor promotes Follower 1. Now <b>two leaders</b> accept writes → conflicting data. ${H.c('g', 'Prevention:')} the old leader must lose its lease (stop accepting writes when it cannot renew a lock in etcd/ZooKeeper), and storage/proxies reject writes carrying an old <b>fencing token</b> (epoch number).</p>` },
      { title: 'Choosing RPO/RTO for three systems', html: `${H.table(['System', 'RPO', 'RTO', 'Replication'], [['Payments ledger', '0', '&lt; 30 s', 'Quorum sync in-region + async DR region'], ['Social feed posts', 'a few seconds OK', '&lt; 1 min', 'Async, auto failover'], ['Analytics events', 'minutes OK', 'hours OK', 'Async / batch copies to object storage']])}` }
    ],
    deepDive: `<p><b>What actually gets shipped?</b> (1) <i>Statement-based</i> (send the SQL text) — breaks with <code>NOW()</code>, <code>RAND()</code>, triggers; mostly obsolete. (2) <i>Physical/WAL shipping</i> (Postgres streaming) — byte-level page changes; followers must run the same major version; very efficient. (3) <i>Logical / row-based</i> (MySQL row binlog, Postgres logical replication, CDC with Debezium) — "row id 7 changed col a from 1 to 2"; works across versions and into other systems like Kafka.</p>
<p><b>Read-after-failover anomalies.</b> With async replication the promoted follower may lack the last writes; if the old leader later rejoins it must <i>discard</i> its un-replicated tail (pg_rewind) — dangerous if other systems (caches, Kafka) already saw those writes. GitHub's 2018 outage involved exactly this: a cross-coast failover left writes on both sides that had to be reconciled by hand.</p>
<p><b>Multi-leader replication</b> (each region has a leader; leaders replicate to each other async) lowers write latency for global users but creates <b>write conflicts</b> (two regions edit the same row). Resolution: last-write-wins (loses data), merge functions, or CRDTs. <b>Leaderless</b> (Dynamo-style: Cassandra, Riak, DynamoDB internally) writes to N replicas and needs W acks; reads ask R replicas; with R + W &gt; N a read overlaps the latest write. Read repair and anti-entropy (Merkle trees) fix stragglers.</p>
<p><b>Consensus-based replication</b> (Raft in etcd, CockroachDB, TiKV, Kafka KRaft; Paxos in Spanner) is "majority-synchronous" with built-in safe leader election: a write commits once a majority of replicas has it, so 3 replicas survive 1 failure, 5 survive 2, without split brain.</p>
<p><b>Monitoring:</b> track lag in both bytes and seconds, replica apply rate vs leader write rate, and long-running queries on followers (Postgres <code>hot_standby_feedback</code> and <code>max_standby_streaming_delay</code> decide whether follower queries delay replay or get cancelled).</p>`,
    aiEra: `<p><b>What AI changes:</b> assistants can read <code>pg_stat_replication</code> or <code>SHOW REPLICA STATUS</code> output and explain the lag, draft Patroni/Orchestrator configs, and write runbooks for failover drills. AIOps tools increasingly correlate "lag spike" alerts with the deploy or query that caused them.</p>
<p><b>Use AI as a partner:</b> paste your topology and ask "Walk me through what happens to acknowledged writes if AZ-a fails in the middle of a commit." Ask it to generate chaos-test scenarios (kill leader, partition network, slow disk on a replica) — then actually run them in staging.</p>
<p><b>New AI-era workloads:</b> vector indexes and feature stores also replicate. Many vector DBs build their ANN index asynchronously on replicas, so a freshly inserted embedding may not be searchable for seconds — the same "replication lag" story with a new name ("index freshness").</p>
<p><b>Where AI goes wrong:</b> it often claims "synchronous replication means no downtime" (it means no <i>data loss</i>; it can <i>increase</i> downtime) or mixes up MySQL and Postgres settings. <b>What you must still own:</b> choosing RPO/RTO with the business, understanding split brain and fencing, and verifying failover by drilling it.</p>`,
    problems: [{
      title: 'Choose replication for a payments ledger across 3 zones',
      level: 'Medium', tags: ['replication', 'rpo', 'failover'], companies: ['Stripe', 'PayPal', 'Razorpay', 'Adyen'],
      statement: `<p>A payments ledger runs on PostgreSQL in one cloud region with three availability zones (AZs). The business says: "We can be down for under a minute, but we must <b>never</b> lose a confirmed payment." A disaster-recovery copy must also exist in a second region 70 ms away. Design the replication.</p>`,
      constraints: `<p>Peak 3,000 commits/s. P99 commit latency budget 20 ms. Intra-region AZ round trip ≈ 1–2 ms. Must survive the loss of any one AZ.</p>`,
      example: `<p>If we used plain async and AZ-a (with the leader) died, the last ${H.c('r', '~50 ms of commits ≈ 150 payments')} could vanish. If we used sync to the DR region, every commit would cost ${H.c('r', '≥ 70 ms')} — over budget.</p>`,
      brute: { why: `<p><b>Naive design 1:</b> one leader with async replicas everywhere — fast, but violates "never lose a confirmed payment" (RPO &gt; 0). <b>Naive design 2:</b> synchronous replication to <i>all</i> replicas including the far region — RPO = 0 but every commit waits ≥ 70 ms and any replica outage freezes all payments.</p>` },
      mcq: { q: 'Which setting gives RPO = 0 within the region while tolerating one slow or dead replica?', options: ['Async to all replicas', 'Sync to all replicas', 'Quorum: wait for ANY 1 of 2 in-region standbys', 'No replication, nightly backups'], answer: 2, explain: 'Quorum commit needs only one of the two standbys; if one dies the other still confirms, and the confirmed one can be promoted without losing data.' },
      hints: [`<p>Separate two goals: <b>zero loss</b> (needs a synchronous copy) and <b>disaster recovery far away</b> (cannot be synchronous within 20 ms).</p>`, `<p>Put one leader and two standbys in three different AZs; use quorum commit "ANY 1" between the two standbys. Add an async standby in the DR region.</p>`, `<p>Do not forget automatic failover with fencing (Patroni + etcd), promoting only a <i>synchronous</i> standby, and what you do when both in-region standbys are down (block writes rather than silently going async).</p>`],
      solution: {
        approach: `<p><b>Topology:</b> Leader in AZ-a, standbys in AZ-b and AZ-c, <code>synchronous_standby_names = 'ANY 1 (az_b, az_c)'</code>, <code>synchronous_commit = on</code>. Each commit waits for the faster of two ~1–2 ms round trips → P99 ≈ 5–10 ms, inside budget.</p>
<p><b>Durability:</b> every acknowledged payment exists on the leader plus at least one other AZ. Losing any single AZ loses no committed data (RPO = 0).</p>
<p><b>Failover:</b> Patroni with a 3-node etcd cluster (one per AZ) holds the leader lease (TTL ≈ 10–30 s). If the leader stops renewing, Patroni promotes a standby that was <i>synchronous</i> and has the highest LSN. The old leader, unable to renew its lease, demotes itself (fencing) — no split brain. Clients reconnect through a stable endpoint (HAProxy/PgBouncer or DNS) → RTO ≈ 30 s.</p>
<p><b>DR region:</b> an async cascading standby 70 ms away with RPO of seconds, used only for regional disasters (declared by humans, with a documented acceptance of possible loss), plus continuous WAL archiving to object storage for point-in-time recovery.</p>
<p><b>Policy when both in-region standbys are down:</b> block commits (keep RPO = 0) and page on-call, rather than silently falling back to async. Payments idempotency keys let clients safely retry after a failover.</p>`,
        complexity: `<p>Commit latency ≈ local fsync + one intra-region RTT (≈ 3–10 ms). Storage ×4 (leader + 2 sync-capable + 1 DR). Survives 1 AZ loss with RPO 0, RTO ≈ 30 s.</p>`,
        followUps: ['What changes if the business requires RPO = 0 even for a full-region outage?', 'How do clients avoid double-charging when a commit result is unknown during failover?', 'Why should reporting queries not run on the synchronous standbys?']
      }
    }]
  });

  /* =====================================================================
     TOPIC 3 — Read replicas
     ===================================================================== */
  topics.push({
    title: 'Read Replicas: Scaling Reads and Living with Stale Data',
    analogy: `<p>A popular library has one <b>master catalogue</b> where librarians add new books. Readers queue for hours to look things up. So the library prints <b>copies of the catalogue</b> and puts them on tables around the building — anyone can read any copy, but new books are added only to the master and the copies are refreshed every few minutes.</p>
<p>Now lookups are fast and the queue is gone. The catch: if you just donated a book and immediately check a copy, it might not be listed yet. You need to know <i>when</i> to check the master instead.</p>`,
    explain: `<p>Most apps read far more than they write — a social feed or product page is often <b>10:1 to 100:1</b> reads to writes. A <b>read replica</b> is a follower (from the previous topic) that we deliberately send read queries to, so the leader only handles writes and the few reads that must be perfectly fresh.</p>
<p><b>How traffic is routed:</b></p>
<ul>
<li>App code chooses a connection: <code>writeDb</code> for INSERT/UPDATE/DELETE and fresh reads, <code>readDb</code> for everything else (Rails <code>connects_to</code>, Django database routers, Spring <code>AbstractRoutingDataSource</code>).</li>
<li>Or a proxy does it: ProxySQL, MaxScale, pgpool-II, Amazon RDS Proxy / Aurora reader endpoint load-balance across replicas.</li>
</ul>
<p>${H.c('r', '<b>What replicas do NOT scale: writes.</b>')} Every replica must replay <b>every</b> write the leader takes. Adding a 5th replica adds read capacity but zero write capacity — and the leader now ships its log 5 times. When writes are the bottleneck, you need <b>sharding</b> (later topics).</p>
<p><b>The big trade-off: stale reads.</b> Replicas are usually async, so they lag. Three classic anomalies:</p>
${H.table(['Anomaly', 'What the user sees', 'Fix'], [
      ['Read-your-writes violation', 'I edit my bio, refresh, and my old bio is back', 'Read own data from the leader for a short window, or wait until the replica has my write\'s LSN'],
      ['Monotonic reads violation', 'A comment appears, I refresh, it disappears (I hit a more-lagging replica)', 'Pin each user/session to one replica (hash user id → replica)'],
      ['Consistent prefix violation', 'I see an answer before the question it replies to', 'Keep causally related writes in the same partition / read with a single snapshot']
    ])}
<p><b>Capacity estimate:</b> replicas needed ≈ ⌈ read QPS ÷ (per-replica capacity × safe utilisation) ⌉ + 1 spare. Example: 40,000 reads/s, one replica does 10,000/s, keep it at 70% → 40,000 ÷ 7,000 = 5.7 → 6, plus 1 spare = <b>7 replicas</b>. Remember each replica also spends capacity replaying writes.</p>
<p><b>When replicas are not enough:</b> a cache (Redis/CDN) is often cheaper than more replicas for hot, repeated reads — replicas shine for long-tail reads that a cache would miss.</p>`,
    clues: [
      '"read-heavy" / "100:1 read-to-write ratio" → add read replicas (and a cache)',
      '"users see their own update disappear after refresh" → read-your-writes consistency problem from replica lag',
      '"analytics queries slow down the app" → dedicated reporting replica (or CDC to a warehouse)',
      '"the leader CPU is at 90% from SELECTs" → offload reads to replicas',
      '"writes are the bottleneck" → replicas will NOT help; think sharding or batching',
      '"must show the latest balance after a transfer" → read that one from the leader'
    ],
    code: { lang: 'python', run: true, title: 'Read-your-writes router using LSN tokens (runnable simulation)', code: `# Each node remembers how far it has replayed the leader's log (its LSN).
# After a user writes, we remember the LSN of their write in their session.
# Reads go to any replica that has replayed at least that far, else the leader.

class Node:
    def __init__(self, name, lsn=0):
        self.name, self.lsn, self.data = name, lsn, {}

leader = Node("leader")
replicas = [Node("replica-1"), Node("replica-2")]

def write(session, key, value):
    leader.lsn += 1
    leader.data[key] = (value, leader.lsn)
    session["min_lsn"] = leader.lsn          # remember "I wrote up to here"
    return leader.lsn

def replicate(replica, upto):
    """Pretend the replica replayed the log up to 'upto'."""
    for k, (v, lsn) in leader.data.items():
        if lsn <= upto:
            replica.data[k] = (v, lsn)
    replica.lsn = max(replica.lsn, upto)

def read(session, key):
    need = session.get("min_lsn", 0)
    # prefer the first replica that is fresh enough for THIS user
    for r in replicas:
        if r.lsn >= need:
            return r.name, r.data.get(key, (None, 0))[0]
    return leader.name, leader.data.get(key, (None, 0))[0]

alice, bob = {}, {}
write(alice, "bio:alice", "hello")           # LSN 1
replicate(replicas[0], 1); replicate(replicas[1], 1)
write(alice, "bio:alice", "I love Go")       # LSN 2, replicas still at LSN 1
print("alice reads:", read(alice, "bio:alice"))   # must come from leader
print("bob reads:  ", read(bob, "bio:alice"))     # bob has no token -> replica (stale is OK)
replicate(replicas[1], 2)
print("alice reads:", read(alice, "bio:alice"))   # replica-2 caught up -> served there
` },
    viz: [{
      title: 'Adding read replicas: load per node (writes are copied to every replica!)',
      input: 'reads=36000 writes=4000 replicas=4 cap=12000',
      inputLabel: 'reads=QPS writes=QPS replicas=N cap=per-node capacity',
      gen: function (input) {
        var a = kvArgs(input, { reads: 36000, writes: 4000, replicas: 4, cap: 12000 });
        if (a.replicas < 1 || a.replicas > 8) throw new Error('replicas must be 1..8');
        if (a.reads < 0 || a.writes < 0 || a.cap <= 0) throw new Error('Use positive numbers, e.g. reads=36000 writes=4000 replicas=4 cap=12000');
        // replaying a write costs about the same as doing it; we count it 1:1 to keep it simple
        var frames = [];
        frames.push({ narr: 'Workload: <b>' + a.reads + '</b> reads/s and <b>' + a.writes + '</b> writes/s. One node can handle about <b>' + a.cap + '</b> operations/s. Let us see how replicas change the picture.', parts: [{ type: 'vars', label: 'Inputs', vals: { reads: a.reads, writes: a.writes, capacityPerNode: a.cap } }] });
        for (var n = 0; n <= a.replicas; n++) {
          var labels = ['Leader'], vals = [], hl = {};
          var leaderLoad = n === 0 ? a.reads + a.writes : a.writes;
          vals.push(leaderLoad);
          for (var i = 0; i < n; i++) { labels.push('Replica ' + (i + 1)); vals.push(Math.round(a.reads / n) + a.writes); }
          var overloaded = false;
          vals.forEach(function (v, k) { if (v > a.cap) { hl[k] = 'bad'; overloaded = true; } else hl[k] = 'ok'; });
          var msg = n === 0 ? 'No replicas: the leader serves everything → ' + (a.reads + a.writes) + ' ops/s.'
            : n + ' replica(s): leader does only writes (' + a.writes + '/s); each replica gets ' + Math.round(a.reads / n) + ' reads/s <b>plus</b> replays all ' + a.writes + ' writes/s.';
          frames.push({ narr: msg + (overloaded ? ' <span class="c-r">Some node is above capacity.</span>' : ' <span class="c-g">Every node is under capacity.</span>'), parts: [
            { type: 'bars', label: 'Ops/s per node (capacity ' + a.cap + ')', values: vals, idxLabels: labels, hl: hl },
            { type: 'graph', directed: true, height: 40, nodes: [{ id: 'A', label: 'App', x: 10, y: 20, shape: 'box' }, { id: 'L', label: 'Leader', x: 45, y: 8, shape: 'box' }, { id: 'P', label: n ? n + ' replica(s)' : 'no replicas', x: 45, y: 32, shape: 'box' }], edges: n ? [['A', 'L', 'writes'], ['A', 'P', 'reads'], ['L', 'P', 'WAL']] : [['A', 'L', 'reads + writes']], hl: { L: overloaded && n === 0 ? 'bad' : 'ok' } }
          ] });
        }
        var limit = a.writes >= a.cap;
        frames.push({ narr: limit ? '<span class="c-r"><b>Writes alone exceed one node.</b></span> No number of replicas fixes this — every replica must replay every write. Time to <b>shard</b>.'
          : 'Takeaway: replicas split <b>reads</b>, but each one still pays for <b>all writes</b>. If writes grow to ~' + a.cap + '/s, replicas stop helping and you must <b>shard</b>.', parts: [
          { type: 'text', label: 'Rule', html: 'replicas ≈ ⌈ reads ÷ (cap − writes) ⌉ = ⌈ ' + a.reads + ' ÷ ' + Math.max(1, a.cap - a.writes) + ' ⌉ = <b>' + (a.cap > a.writes ? Math.ceil(a.reads / (a.cap - a.writes)) : '∞') + '</b> (add one spare for failures)' }
        ] });
        return frames;
      }
    }, {
      title: 'Read-your-writes: routing a read after a write',
      gen: function () {
        var nodes = [
          { id: 'U', label: 'Alice (browser)', x: 8, y: 25, shape: 'box' },
          { id: 'A', label: 'App + DB router', x: 36, y: 25, shape: 'box' },
          { id: 'L', label: 'Leader LSN 502', x: 72, y: 6, shape: 'box' },
          { id: 'R1', label: 'Replica 1 LSN 498', x: 72, y: 26, shape: 'box' },
          { id: 'R2', label: 'Replica 2 LSN 502', x: 72, y: 46, shape: 'box' }
        ];
        var edges = [['U', 'A'], ['A', 'L'], ['A', 'R1'], ['A', 'R2'], ['L', 'R1', 'WAL'], ['L', 'R2', 'WAL']];
        function g(hl, ehl, tags) { return { type: 'graph', directed: true, height: 56, nodes: nodes, edges: edges, hl: hl, ehl: ehl, tags: tags || {} }; }
        return [
          { narr: 'Alice updates her bio. The write goes to the <b>leader</b>, which commits it at <b>LSN 502</b>.', parts: [g({ U: 'cur', L: 'ok' }, { 'U-A': 'cur', 'A-L': 'ok' }), { type: 'vars', label: 'Alice\'s session', vals: { lastWriteLSN: 502 }, hl: { lastWriteLSN: 'ok' } }] },
          { narr: 'The router stores <b>lastWriteLSN = 502</b> in Alice\'s session (cookie or server-side). Replica 1 is lagging at 498; Replica 2 has caught up to 502.', parts: [g({ R1: 'bad', R2: 'ok' }, { 'L-R1': 'cur', 'L-R2': 'ok' }, { R1: 'lag 4', R2: 'fresh' }), { type: 'vars', label: 'Alice\'s session', vals: { lastWriteLSN: 502 } }] },
          { narr: 'Alice refreshes her profile. A naive round-robin router would pick Replica 1 → <span class="c-r">old bio shown</span>. That is the read-your-writes bug.', parts: [g({ R1: 'bad' }, { 'U-A': 'cur', 'A-R1': 'bad' }, { R1: 'stale!' }), { type: 'table', label: 'Naive routing', columns: ['Read', 'Replica', 'Replica LSN', 'Needs', 'Result'], rows: [['GET /profile/alice', 'Replica 1', 498, 502, '<span class="c-r">stale</span>']], hl: { 0: 'bad' } }] },
          { narr: 'Smart router: only use a replica whose replayed LSN ≥ 502. Replica 1 (498) is skipped; <b>Replica 2 (502)</b> qualifies.', parts: [g({ R2: 'ok', A: 'cur' }, { 'A-R2': 'ok' }, { R1: 'skip', R2: '502 ≥ 502' }), { type: 'table', label: 'LSN-aware routing', columns: ['Candidate', 'Replayed LSN', '≥ 502?'], rows: [['Replica 1', 498, '<span class="c-r">no</span>'], ['Replica 2', 502, '<span class="c-g">yes</span>']], hl: { 1: 'ok' } }] },
          { narr: 'If <b>no</b> replica were fresh enough, the router would send the read to the <b>leader</b> (or wait up to ~50 ms for a replica to catch up). Simpler variant: "for 2 seconds after a write, read this user\'s own data from the leader".', parts: [g({ L: 'sel' }, { 'A-L': 'sel' }, { L: 'fallback' }), { type: 'text', label: 'Policies', html: '1) LSN/GTID token (precise)  2) time window after write (simple)  3) always read own profile from leader (tiny traffic)' }] },
          { narr: 'Bob views Alice\'s profile. Bob never wrote it, so he has no token → any replica is fine; a second of staleness is invisible to him. <span class="c-g">Freshness is only enforced where a human would notice.</span>', parts: [g({ R1: 'ok' }, { 'A-R1': 'ok' }, { R1: 'OK for Bob' }), { type: 'vars', label: 'Bob\'s session', vals: { lastWriteLSN: 'none' } }] }
        ];
      }
    }],
    examples: [
      { title: 'Sizing replicas for a news site', html: `<p>Peak: 60,000 reads/s, 600 writes/s. A replica handles ~15,000 simple reads/s; target 65% utilisation → ~9,750 usable, minus ~600 for replaying writes ≈ 9,150. 60,000 ÷ 9,150 = 6.6 → <b>7 replicas + 1 spare = 8</b>. ${H.c('g', 'Better first move:')} put a CDN/Redis cache in front; if the cache hit rate is 90%, only 6,000 reads/s reach the DB → <b>1 replica + 1 spare</b>.</p>` },
      { title: 'Dedicated analytics replica', html: `<p>The finance team runs a 20-minute SQL report every hour. On a shared replica it hogs CPU and delays replay, making that replica lag for everyone. Put it on its own replica that <b>is not</b> in the app's read pool (or stream changes via CDC to a warehouse). App replicas stay fast and fresh.</p>` },
      { title: 'Monotonic reads via sticky replica', html: `<p>Comments on a post: user hits replica A (shows 10 comments), refreshes, hits replica B which lags (shows 8). Comments "disappear". Fix: choose replica = <code>hash(user_id) % replicaCount</code> so each user always reads from the same replica. If that replica fails, they move once — acceptable.</p>` },
      { title: 'Aurora / Cloud SQL style shared storage', html: `<p>Amazon Aurora replicas share the same distributed storage volume as the writer, so they do not replay a full copy of the data — lag is typically ${H.c('g', 'under ~20 ms')} and adding a replica does not double storage. Still: they are a different process with their own cache, so read-your-writes is still not guaranteed without routing care.</p>` }
    ],
    deepDive: `<p><b>How to measure freshness.</b> Postgres: <code>pg_last_wal_replay_lsn()</code> on the replica vs <code>pg_current_wal_lsn()</code> on the leader; MySQL: GTID sets (<code>WAIT_FOR_EXECUTED_GTID_SET(gtid, timeout)</code> blocks until the replica has a specific transaction — a built-in read-your-writes primitive). "Seconds behind" metrics can be misleading when the leader is idle (no new events = looks like zero lag) or when a single huge transaction is replaying.</p>
<p><b>Replica conflicts.</b> A long SELECT on a Postgres replica may need rows that the leader already VACUUMed. Either replay waits (lag grows, <code>max_standby_streaming_delay</code>) or the query gets cancelled; <code>hot_standby_feedback = on</code> avoids cancellations but causes table bloat on the leader. This is a real operational trade-off.</p>
<p><b>Connection pooling.</b> Each replica needs its own pool; PgBouncer in transaction mode prevents thousands of app instances from exhausting <code>max_connections</code>. Health checks must remove a replica whose lag exceeds a threshold — a stale replica is often worse than none.</p>
<p><b>Replicas as failover targets.</b> If your read replicas also serve as failover candidates, sizing must cover "one replica just became the leader and the rest absorb its read share".</p>
<p><b>Cache vs replica.</b> A cache gives microsecond reads for hot keys but needs invalidation; a replica gives full SQL on all data with seconds of staleness and no invalidation logic. Use both: cache for the hot head, replicas for the long tail and for heavy queries.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI coding assistants happily write <code>db.query()</code> everywhere without thinking about which connection it uses. Code review (human or AI) should flag "read immediately after write in the same request goes to replica". Some ORMs now support automatic read-your-writes (e.g. Rails' automatic role switching with a delay window), and AI can configure these for you.</p>
<p><b>Use AI as a partner:</b> feed it a week of slow-query logs and ask which queries are safe to move to replicas (no read-after-write dependency) and which must stay on the leader. Ask it to compute replica counts for a traffic forecast — then double-check the arithmetic yourself.</p>
<p><b>AI workloads:</b> RAG pipelines read embeddings and documents far more than they write — a textbook read-replica case. Agents that write then immediately read back (e.g. "save a memory, then retrieve it") hit read-your-writes bugs; route an agent's own reads to the leader or use session tokens.</p>
<p><b>Where AI goes wrong:</b> it may claim replicas scale writes, or forget replica lag entirely. <b>What you must still own:</b> deciding which reads need freshness, measuring real lag, and explaining why replicas do not fix a write bottleneck.</p>`,
    problems: [{
      title: '"My profile edit disappeared!" after adding read replicas',
      level: 'Easy', tags: ['read-replicas', 'consistency'], companies: ['LinkedIn', 'Meta', 'Shopify'],
      statement: `<p>Your team added 3 async read replicas to a social app and routed all SELECTs to them round-robin. Since then, users complain: "I changed my profile photo, the page reloaded, and the old photo was back. A few seconds later the new one appeared." Explain the cause and design a fix that keeps most reads on replicas.</p>`,
      constraints: `<p>Replica lag is usually 50–500 ms, sometimes up to 5 s. 95% of reads are users viewing <i>other</i> people's profiles. Writes are 2% of traffic.</p>`,
      example: `<p>t=0 ms: UPDATE photo on ${H.c('b', 'leader')}. t=80 ms: redirect → GET profile → round-robin picks ${H.c('r', 'replica 2 (lag 400 ms)')} → old photo. t=400 ms: replica 2 replays the update → new photo.</p>`,
      brute: { why: `<p><b>Naive fix 1:</b> send all reads to the leader — bug gone, but the leader is overloaded again and the replicas are wasted. <b>Naive fix 2:</b> make replication synchronous — every write becomes slower and a single slow replica blocks writes, just to fix a UI glitch for the 5% of reads that are self-reads.</p>` },
      mcq: { q: 'Which reads actually need to be fresh?', options: ['All reads', 'Reads by the same user of data they just changed', 'Only reads by admins', 'None — eventual consistency is always fine'], answer: 1, explain: 'Read-your-writes only needs the writer\'s own reads of their own data to be fresh; other users cannot notice a second of lag.' },
      hints: [`<p>The guarantee you need has a name: <b>read-your-writes</b>. It is per-user, not global.</p>`, `<p>Remember something about the user's last write (a timestamp or the leader's LSN/GTID) in their session, and use it when routing their next reads.</p>`, `<p>Recipe: after a write, store <code>lastWriteLSN</code>; on read, pick a replica with replayed LSN ≥ token, otherwise the leader. Simple alternative: for 5 s after a write, read that user's own data from the leader.</p>`],
      solution: {
        approach: `<p><b>Cause:</b> async replicas lag; a user's own read right after their write lands on a replica that has not replayed it — a <b>read-your-writes</b> violation.</p>
<p><b>Fix (precise):</b> after each write, the app reads the leader's commit position (Postgres <code>pg_current_wal_lsn()</code>, MySQL GTID) and stores it in the user's session as <code>lastWriteLSN</code>. The DB router keeps each replica's replayed LSN (polled every ~100 ms). For a read by that user, it chooses a replica with replayed LSN ≥ token; if none, it routes to the leader (or waits up to ~100 ms with <code>WAIT_FOR_EXECUTED_GTID_SET</code>).</p>
<p><b>Fix (simple):</b> for 5 seconds after any write, route that user's reads of <i>their own</i> profile to the leader (set a short cookie). Covers lag up to 5 s.</p>
<p><b>Also:</b> pin users to one replica by <code>hash(user_id)</code> so their reads are monotonic (no "appear, disappear, appear"); remove replicas whose lag exceeds 5 s from the pool. Result: ~95%+ of reads still go to replicas; only self-reads shortly after writes hit the leader.</p>`,
        complexity: `<p>Leader extra load ≈ (writes/s × self-reads per write) — tiny. Router state: one integer per replica + one per session. Added latency: none in the common case.</p>`,
        followUps: ['How would you make this work across devices (edit on phone, view on laptop)?', 'What if the leader fails over and LSNs restart from a new timeline?', 'How would a cache layer change this design?']
      }
    }]
  });

  /* =====================================================================
     TOPIC 4 — Partitioning: range, hash, list
     ===================================================================== */
  topics.push({
    title: 'Partitioning & Sharding: Range, Hash and List',
    analogy: `<p>A huge school has 40,000 student files — too many for one cabinet. You can split them into several cabinets in three ways:</p>
<ul><li><b>Range:</b> surnames A–F in cabinet 1, G–M in cabinet 2… Easy to find "everyone from Gupta to Iyer", but the "S" cabinet overflows because so many surnames start with S.</li>
<li><b>Hash:</b> roll a fair die based on the student ID to pick the cabinet. Every cabinet fills evenly, but "everyone from Gupta to Iyer" means opening all cabinets.</li>
<li><b>List:</b> one cabinet per campus — North, South, East. Natural when you always know the campus, and a law may even require that North's files stay in the North building.</li></ul>`,
    explain: `<p><b>Partitioning</b> splits one big table into smaller pieces called <b>partitions</b>. When the pieces live on <b>different machines</b>, we call it <b>sharding</b> and each piece-holder is a <b>shard</b>. Each row lives on exactly one shard (plus its replicas). The column used to decide the shard is the <b>partition key</b> / <b>shard key</b>.</p>
<p><b>Why shard?</b> Because a single leader has limits: write throughput, storage (e.g. &gt; 5–10 TB gets painful to back up and restore), and working set that fits in RAM. Sharding splits all three.</p>
${H.table(['Strategy', 'Rule', 'Good at', 'Bad at', 'Real systems'], [
      ['<b>Range</b>', 'Key ranges per shard: [A–F], [G–M], [2026-01, 2026-02)', H.c('g', 'Range scans, sorted order, time windows'), H.c('r', 'Hot spots when keys are sequential (timestamps, auto-increment)'), 'HBase, Bigtable, Spanner, CockroachDB, MongoDB ranged'],
      ['<b>Hash</b>', 'shard = hash(key) mod N (or hash ranges)', H.c('g', 'Even spread of data and load'), H.c('r', 'Range queries hit every shard; naive mod-N resharding moves most keys'), 'Cassandra, DynamoDB, Redis Cluster, MongoDB hashed'],
      ['<b>List</b>', 'Explicit value → shard map: IN→APAC, DE→EU', H.c('g', 'Data residency (GDPR), tenant isolation, ops by region'), H.c('r', 'Uneven sizes; a big value overloads its shard'), 'Postgres LIST partitions, geo-sharding, per-tenant DBs']
    ])}
<p><b>Directory-based</b> (lookup-table) sharding is a fourth option: a small service stores <code>key → shard</code> for every tenant or key range. Maximum flexibility (move one tenant at a time), at the cost of an extra lookup (cached) and one more critical component.</p>
<p><b>Choosing a shard key — the four questions:</b></p>
<ol>
<li><b>High cardinality?</b> Many distinct values (user_id: yes; country: no; boolean: never).</li>
<li><b>Even load?</b> No single value gets a big share of traffic (careful with celebrities, big tenants, "today").</li>
<li><b>Matches the main query?</b> The most frequent queries should name the key, so they hit one shard.</li>
<li><b>Keeps related data together?</b> Rows used in the same transaction or join share the key (e.g. an order and its items both keyed by <code>order_id</code> or <code>customer_id</code>).</li>
</ol>
<p><b>Compound keys</b> mix strategies: Cassandra's <code>PRIMARY KEY ((user_id), created_at)</code> hashes <code>user_id</code> to choose the node, then keeps that user's rows <b>sorted by time</b> inside the partition — hash for spread, range for scans.</p>
<p><b>Partitioning inside one database</b> (Postgres declarative partitioning, MySQL partitions) uses the same three strategies on one machine — mainly for pruning (scan fewer partitions) and cheap data retention (drop last year's partition instead of DELETE).</p>`,
    clues: [
      '"the table is 20 TB and growing 1 TB/month" or "writes exceed one machine" → shard',
      '"query by time range" / "last 7 days" → range partitioning on time (inside a shard), but beware the hot newest partition',
      '"evenly distribute", "avoid hot spots", "lookups by ID" → hash partitioning',
      '"EU data must stay in the EU" / "data residency" / "per-tenant isolation" → list (geo/tenant) partitioning or directory',
      '"every query includes user_id / tenant_id" → that column is your shard key',
      '"auto-increment IDs" / "timestamps" as the key with range sharding → the latest shard becomes hot'
    ],
    code: [
      { lang: 'python', run: true, title: 'Hash, range and list routers side by side (runnable)', code: `import zlib, bisect

SHARDS = 4

def hash_shard(key: str) -> int:
    # crc32 is stable across processes (Python's built-in hash() is randomized per run!)
    return zlib.crc32(key.encode()) % SHARDS

# Range: upper bounds (exclusive) of each shard, sorted.
RANGE_BOUNDS = ["g", "n", "t"]           # [..g) [g..n) [n..t) [t..]
def range_shard(key: str) -> int:
    return bisect.bisect_right(RANGE_BOUNDS, key[0].lower())

# List: explicit value -> shard map (region-based).
REGION = {"IN": 0, "SG": 0, "JP": 0, "DE": 1, "FR": 1, "UK": 1, "US": 2, "BR": 2, "CA": 2}
def list_shard(country: str) -> int:
    return REGION.get(country, 3)        # shard 3 = "rest of world"

users = [("alice", "IN"), ("bob", "US"), ("carol", "DE"), ("dave", "IN"),
         ("erin", "JP"), ("sam", "FR"), ("tom", "BR"), ("zoe", "KE")]
print(f"{'user':6} {'hash':>4} {'range':>5} {'list':>4}")
for name, country in users:
    print(f"{name:6} {hash_shard(name):>4} {range_shard(name):>5} {list_shard(country):>4}")
` },
      { lang: 'java', title: 'A tiny shard router in Java (hash with a stable CRC32)', code: `import java.util.zip.CRC32;
import java.nio.charset.StandardCharsets;

/** Routes a key to one of N shards and returns the JDBC URL to use. */
public class ShardRouter {
    private final List<String> shardUrls;   // index = shard id

    public ShardRouter(List<String> shardUrls) {
        if (shardUrls.isEmpty()) throw new IllegalArgumentException("need at least one shard");
        this.shardUrls = List.copyOf(shardUrls);
    }

    /** Stable hash: same key -> same shard on every machine and every restart. */
    static long stableHash(String key) {
        CRC32 crc = new CRC32();
        crc.update(key.getBytes(StandardCharsets.UTF_8));
        return crc.getValue();               // 0 .. 2^32-1, never negative
    }

    public int shardFor(String key) {
        return (int) (stableHash(key) % shardUrls.size());
    }

    public String urlFor(String key) {
        return shardUrls.get(shardFor(key));
    }

    public static void main(String[] args) {
        ShardRouter r = new ShardRouter(List.of(
            "jdbc:postgresql://shard0/app", "jdbc:postgresql://shard1/app",
            "jdbc:postgresql://shard2/app", "jdbc:postgresql://shard3/app"));
        for (String user : List.of("alice", "bob", "carol", "dave")) {
            System.out.println(user + " -> shard " + r.shardFor(user) + " (" + r.urlFor(user) + ")");
        }
    }
}` }
    ],
    codeTitle: ['Three routers (Python)', 'Hash shard router (Java)'],
    viz: [{
      title: 'Hash partitioning: routing writes to shards',
      input: 'alice bob carol dave erin frank grace heidi ivan judy ken lena',
      inputLabel: 'Keys (space separated, up to 16) — optionally end with shards=N',
      gen: function (input) {
        var raw = String(input || '');
        var nm = raw.match(/shards=(\d+)/);
        var N = nm ? Number(nm[1]) : 4;
        if (N < 2 || N > 8) throw new Error('shards must be between 2 and 8');
        var keys = words(raw.replace(/shards=\d+/, ''), 16, 'Enter keys like: alice bob carol');
        var counts = zeros(N), rows = [], frames = [];
        frames.push({ narr: 'We have <b>' + N + ' shards</b>. Rule: <code>shard = hash(key) mod ' + N + '</code>. A good hash scatters similar-looking keys randomly, so shards fill evenly.', parts: [{ type: 'bars', label: 'Rows per shard', values: counts.slice(), idxLabels: shardLabels(N) }] });
        keys.forEach(function (k, i) {
          var h = fnv(k), s = h % N;
          counts[s]++;
          rows.push([k, h, h + ' mod ' + N + ' = ' + s, 'S' + s]);
          var bhl = {}; bhl[s] = 'cur';
          var thl = {}; thl[Math.min(rows.length, 6) - 1] = 'ok';
          frames.push({ narr: 'Write <b>' + k + '</b>: hash = ' + h + ', mod ' + N + ' → <b>shard S' + s + '</b>. The router needs no lookup table, just math.', parts: [
            { type: 'table', label: 'Routing log', columns: ['key', 'hash (FNV-1a)', 'mod', 'shard'], rows: rows.slice(-6).map(function (r) { return r.slice(); }), hl: thl },
            { type: 'bars', label: 'Rows per shard', values: counts.slice(), idxLabels: shardLabels(N), hl: bhl }
          ] });
        });
        var mx = Math.max.apply(null, counts), mn = Math.min.apply(null, counts);
        var hl = {}; counts.forEach(function (c, i) { hl[i] = c === mx && mx - mn > 1 ? 'cur' : 'ok'; });
        frames.push({ narr: 'Done: max ' + mx + ', min ' + mn + ' rows per shard. With only ' + keys.length + ' keys there is some noise; with millions of keys a good hash gets within ~1% of perfectly even. Downside: a query like "names from c to h" must ask <b>every</b> shard.', parts: [{ type: 'bars', label: 'Final rows per shard', values: counts.slice(), idxLabels: shardLabels(N), hl: hl }] });
        return frames;
      }
    }, {
      title: 'Range vs hash on time-ordered keys (the hot newest shard)',
      input: '12',
      inputLabel: 'Number of new orders arriving now (4..24)',
      gen: function (input) {
        var n = parseInt(input, 10);
        if (!(n >= 4 && n <= 24)) throw new Error('Enter a number between 4 and 24');
        // order ids are increasing; range shards hold [0..1000) [1000..2000) [2000..3000) [3000..)
        var bounds = [1000, 2000, 3000], start = 3001, frames = [];
        var rc = [0, 0, 0, 0], hc = [0, 0, 0, 0];
        frames.push({ narr: 'Order IDs are <b>increasing</b> (3001, 3002, …). Range shards: S0=[0,1000) S1=[1000,2000) S2=[2000,3000) S3=[3000,∞). Let us route ' + n + ' brand-new orders both ways.', parts: [
          { type: 'bars', label: 'Range: new writes per shard', values: rc.slice(), idxLabels: ['S0 old', 'S1 old', 'S2 old', 'S3 newest'] },
          { type: 'bars', label: 'Hash: new writes per shard', values: hc.slice(), idxLabels: shardLabels(4) }] });
        for (var i = 0; i < n; i++) {
          var id = start + i, r = 0;
          while (r < bounds.length && id >= bounds[r]) r++;
          var h = fnv(String(id)) % 4;
          rc[r]++; hc[h]++;
          if (i < 4 || i === n - 1) {
            var rh = {}; rh[r] = rc[r] > Math.ceil((i + 1) / 2) ? 'bad' : 'cur';
            var hh = {}; hh[h] = 'ok';
            frames.push({ narr: 'Order <b>' + id + '</b> → range says <b>S' + r + '</b> (every new id is ≥ 3000), hash says <b>S' + h + '</b>.', parts: [
              { type: 'bars', label: 'Range: new writes per shard', values: rc.slice(), idxLabels: ['S0 old', 'S1 old', 'S2 old', 'S3 newest'], hl: rh },
              { type: 'bars', label: 'Hash: new writes per shard', values: hc.slice(), idxLabels: shardLabels(4), hl: hh }] });
          }
        }
        frames.push({ narr: '<span class="c-r"><b>Range: 100% of new writes hit S3</b></span> — one hot shard while three sit idle. <span class="c-g">Hash spreads them.</span> Fixes for range: hash-prefix the key, or a compound key (hash(customer) + time) so time stays sorted <i>within</i> each customer.', parts: [
          { type: 'bars', label: 'Range: new writes per shard', values: rc.slice(), idxLabels: ['S0 old', 'S1 old', 'S2 old', 'S3 newest'], hl: { 3: 'bad' } },
          { type: 'bars', label: 'Hash: new writes per shard', values: hc.slice(), idxLabels: shardLabels(4), hl: { 0: 'ok', 1: 'ok', 2: 'ok', 3: 'ok' } }] });
        return frames;
      }
    }, {
      title: 'List partitioning by region (data residency)',
      input: 'IN US DE IN BR FR JP US UK IN SG CA',
      inputLabel: 'Country codes of new users (IN US DE FR UK JP SG BR CA, others go to ROW)',
      gen: function (input) {
        var cs = words(input, 20, 'Enter country codes like: IN US DE').map(function (c) { return c.toUpperCase(); });
        var map = { IN: 'APAC', SG: 'APAC', JP: 'APAC', DE: 'EU', FR: 'EU', UK: 'EU', US: 'AMER', BR: 'AMER', CA: 'AMER' };
        var shards = ['APAC', 'EU', 'AMER', 'ROW'], counts = [0, 0, 0, 0], frames = [];
        frames.push({ narr: 'List partitioning: an explicit map from <b>country → shard</b>. EU users must be stored in an EU data centre (GDPR-style residency), so a hash would be <i>illegal</i> here, not just slow.', parts: [{ type: 'map', label: 'Partition map', entries: [['APAC', 'IN, SG, JP'], ['EU', 'DE, FR, UK'], ['AMER', 'US, BR, CA'], ['ROW', 'everything else']] }, { type: 'bars', label: 'Users per regional shard', values: counts.slice(), idxLabels: shards }] });
        cs.forEach(function (c) {
          var s = map[c] || 'ROW', i = shards.indexOf(s);
          counts[i]++;
          var hl = {}; hl[i] = 'ok'; var mh = {}; mh[s] = 'cur';
          frames.push({ narr: 'New user from <b>' + c + '</b> → list says <b>' + s + '</b> shard' + (s === 'ROW' ? ' (not listed → default partition)' : '') + '.', parts: [{ type: 'map', label: 'Partition map', entries: [['APAC', 'IN, SG, JP'], ['EU', 'DE, FR, UK'], ['AMER', 'US, BR, CA'], ['ROW', 'everything else']], hl: mh }, { type: 'bars', label: 'Users per regional shard', values: counts.slice(), idxLabels: shards, hl: hl }] });
        });
        var mx = Math.max.apply(null, counts), big = counts.indexOf(mx), hl2 = {}; hl2[big] = 'bad';
        frames.push({ narr: 'Result: shards are <b>uneven</b> — ' + shards[big] + ' has the most users. With list partitioning that is normal; a big region is then <b>sub-partitioned by hash</b> (e.g. APAC → APAC-0..APAC-7 by hash(user_id)).', parts: [{ type: 'bars', label: 'Users per regional shard', values: counts.slice(), idxLabels: shards, hl: hl2 }] });
        return frames;
      }
    }],
    examples: [
      { title: 'E-commerce orders: shard by customer_id', html: `<p>Top queries: "my orders" (by customer), "order details" (by order id), "place order" (customer + items + payment). Shard key = <code>customer_id</code> (hash). Embed the shard in the order id (e.g. Snowflake-style id containing the shard number, or a lookup) so "order by id" also goes to one shard. ${H.c('y', 'Cost:')} "all orders for product X" now hits every shard → serve it from a search index or warehouse instead.</p>` },
      { title: 'Logs and metrics: range by time inside, hash across', html: `<p>Querying "errors in the last hour" wants time ranges, but pure time-range shards make the newest shard hot. Use partition key <code>(service_id, hour_bucket)</code>: hash spreads services, and within a partition rows are sorted by timestamp. Old buckets are deleted by dropping whole partitions — no expensive DELETE.</p>` },
      { title: 'Multi-tenant SaaS: list/directory by tenant', html: `<p>10,000 small tenants share 8 hash-sharded databases, while the 5 enterprise tenants each get a <b>dedicated</b> shard (list/directory entries). A directory table <code>tenant_id → shard</code> lets you move a growing tenant without rehashing everyone. This is how Slack, Notion and Salesforce-style systems isolate big customers.</p>` },
      { title: 'Bad key: country for a global app', html: `<p>Shard key = <code>country</code>: only ~200 values (low cardinality), India and the US might hold 40% of users, and you can never split "IN" across two shards. ${H.c('r', 'Result: permanent hot shards.')} Use <code>user_id</code> (hash) as the key and, if residency matters, a list partition at the top level (region) with hash below it.</p>` },
      { title: 'Postgres declarative partitioning on one box', html: `<p><code>CREATE TABLE events (...) PARTITION BY RANGE (created_at);</code> plus one child table per month. A query with <code>WHERE created_at &gt;= '2026-10-01'</code> scans only October (partition pruning), and deleting 2024 data is <code>DROP TABLE events_2024_01</code> — instant. No sharding yet, but the same thinking.</p>` }
    ],
    deepDive: `<p><b>Hash ranges instead of mod N.</b> Production systems rarely do <code>hash % N</code> directly. Cassandra puts tokens on a ring (consistent hashing, module 7); DynamoDB, CockroachDB and MongoDB split the key space (or hash space) into many <b>ranges/chunks</b> and assign ranges to nodes, splitting a range when it grows too big or too hot. This makes adding nodes a matter of moving some ranges, not rehashing everything.</p>
<p><b>Secondary indexes on a sharded table.</b> <i>Local</i> (document-partitioned) indexes live on each shard and index only that shard's rows — writes are cheap, but a query by the indexed column must scatter to all shards. <i>Global</i> (term-partitioned) indexes are themselves partitioned by the indexed value — reads hit one index shard, but a single write may update index entries on other shards (usually asynchronously, e.g. DynamoDB GSIs are eventually consistent).</p>
<p><b>Generating IDs without a single counter.</b> Auto-increment per shard collides across shards. Options: UUIDv7 (time-ordered, 128-bit), Snowflake IDs (41-bit time + 10-bit machine + 12-bit sequence), or per-shard ranges. Time-ordered IDs are great for B-tree locality but are a <i>hot spot</i> if you range-shard on them.</p>
<p><b>Skew math.</b> With hashing, k keys over N shards: expected k/N each; standard deviation ≈ √(k/N). At 1M keys on 10 shards, ±316 on 100,000 — about 0.3%. Data skew is rarely the issue; <b>access skew</b> (one key with huge traffic) is — see the next topic.</p>
<p><b>Do not shard too early.</b> Sharding makes joins, transactions, unique constraints, schema changes, backups and ops harder. Exhaust vertical scaling, indexes, caching, read replicas and archiving first; when you do shard, choose many logical shards from day one (e.g. 1,024) mapped onto a few physical machines.</p>`,
    aiEra: `<p><b>What AI changes:</b> given query logs, an assistant can rank candidate shard keys by "fraction of queries that would hit one shard" and estimate skew from a sample of key frequencies. Managed databases (Aurora Limitless, Cosmos DB, DynamoDB, Spanner) already pick split points automatically, and the trend is toward auto-partitioning with AI-assisted hot-spot detection.</p>
<p><b>Use AI as a partner:</b> "Here are my top 15 queries with QPS and a sample of 10K keys. Compare user_id, tenant_id and (tenant_id, user_id) as shard keys: single-shard query %, max-shard load, cross-shard transactions." Then sanity-check its numbers with a quick script.</p>
<p><b>Vector data:</b> vector databases shard too — usually by hashing document IDs (every query fans out to all shards and merges top-k) or by tenant/namespace (each query hits one shard). The same trade-off as hash vs list.</p>
<p><b>Where AI goes wrong:</b> it suggests low-cardinality keys like status or country, forgets that range-sharding on timestamps creates a hot shard, and uses language hash functions that are not stable across processes (Python <code>hash()</code>, Java <code>String.hashCode</code> is stable but poorly distributed for some inputs). <b>What you must still own:</b> the shard-key decision, because changing it later means rewriting all your data.</p>`,
    problems: [{
      title: 'Choose the shard key for an e-commerce orders table',
      level: 'Medium', tags: ['shard-key', 'hash', 'range'], companies: ['Amazon', 'Flipkart', 'Shopify', 'Walmart'],
      statement: `<p>The <code>orders</code> table (with <code>order_items</code>) has outgrown one Postgres primary. Candidate shard keys: <code>order_id</code>, <code>customer_id</code>, <code>created_at</code>, <code>seller_id</code>. Pick one, choose range or hash, and explain how the main queries are served.</p>`,
      constraints: `<p>3 B orders, +10M/day, peak 8,000 orders/s on sale days. Queries: (1) customer's order history (40% of reads), (2) order details by id (45%), (3) seller dashboard "my orders today" (10%), (4) finance reports (5%, can be minutes stale).</p>`,
      example: `<p>Sharding by ${H.c('r', 'created_at (range)')}: on sale day every insert lands on "today's" shard → one shard at 8,000 writes/s, others idle. Sharding by ${H.c('g', 'hash(customer_id)')}: inserts spread evenly; query (1) hits one shard.</p>`,
      brute: { why: `<p><b>Naive design:</b> range-shard by <code>created_at</code> "because reports are by date". All new orders hit the newest shard (hot spot), and the most common query (customer history) must scan every shard. Or shard by <code>order_id</code> hash: inserts spread fine, but "my orders" becomes a scatter-gather across all shards on 40% of reads.</p>` },
      mcq: { q: 'Which key keeps an order, its items and the customer\'s other orders on the same shard?', options: ['hash(order_id)', 'hash(customer_id)', 'range(created_at)', 'seller_id'], answer: 1, explain: 'Keying orders and order_items by customer_id co-locates everything a customer touches, so history queries and the "place order" transaction stay on one shard.' },
      hints: [`<p>Rank the queries by volume and see which column appears in the biggest ones. Also check which key spreads <i>writes</i> on a sale day.</p>`, `<p>Hash the customer id. For query (2), make the order id carry the shard (embed shard bits) or keep a tiny <code>order_id → customer_id</code> lookup.</p>`, `<p>Queries that do not name the customer (seller dashboard, finance) should be served by secondary systems: a seller-keyed read model fed by CDC, and a data warehouse.</p>`],
      solution: {
        approach: `<p><b>Shard key: hash(customer_id)</b> over 1,024 logical shards mapped onto, say, 16 physical Postgres clusters (each with replicas). <code>order_items</code> uses the same key so an order and its items live together (single-shard transaction for "place order").</p>
<p><b>Query (1) history:</b> <code>WHERE customer_id = ? ORDER BY created_at DESC</code> → one shard, index on <code>(customer_id, created_at)</code>.</p>
<p><b>Query (2) by order id:</b> generate order ids that embed the logical shard number (e.g. 10 bits of a 64-bit Snowflake-style id) so the router decodes the shard from the id — one shard, no lookup.</p>
<p><b>Query (3) seller dashboard:</b> would be a fan-out to all shards. Instead, stream changes (CDC → Kafka) into a <i>seller-keyed</i> read store (another table sharded by seller_id, or Elasticsearch). Slightly stale (seconds) but single-shard.</p>
<p><b>Query (4) finance:</b> nightly/real-time CDC into a warehouse; never run analytical scans on OLTP shards.</p>
<p><b>Why not the others:</b> created_at → hot newest shard; seller_id → giant sellers become hot shards and customer history fans out; order_id → history fans out. Watch for hot customers (bots/resellers) and rate-limit them.</p>`,
        complexity: `<p>8,000 writes/s ÷ 16 clusters = 500/s each. 3 B orders × ~1 KB ≈ 3 TB total ≈ 190 GB per cluster — comfortable, with room for 4× growth before resharding.</p>`,
        followUps: ['How do you enforce a unique coupon redemption across customers on different shards?', 'A reseller places 1M orders/day — what happens and how do you protect the shard?', 'How would you pick 1,024 vs 4,096 logical shards?']
      }
    }]
  });

  /* =====================================================================
     TOPIC 5 — Hot keys / hot partitions
     ===================================================================== */
  topics.push({
    title: 'Sharding Challenge 1: Hot Keys and Hot Shards',
    analogy: `<p>A supermarket opens 8 checkout lanes and assigns customers by the last digit of their loyalty card — fair and even. Then a famous cricketer walks in to sign autographs at <b>lane 3</b>. Ten thousand fans queue at lane 3 while lanes 1–2 and 4–8 are empty. Adding more lanes does not help; the problem is that everyone wants the <b>same</b> lane.</p>
<p>Fixes look like real life too: hand out <b>printed autograph cards</b> at the door (cache), open <b>several "cricketer" lanes</b> and split fans between them (key salting), or give the cricketer a <b>private room</b> with its own staff (dedicated shard).</p>`,
    explain: `<p>Hashing spreads <b>keys</b> evenly, but it cannot spread <b>traffic for one key</b>: every request for <code>post:42</code> goes to the same shard. When one key (or a few) gets a huge share of traffic it is a <b>hot key</b>, and its shard becomes a <b>hot shard</b> — overloaded while others idle. Classic causes:</p>
<ul>
<li><b>Celebrities</b> — a post by an account with 300M followers; a viral tweet's like counter.</li>
<li><b>Big tenants</b> — one enterprise customer with 50% of all rows in a multi-tenant SaaS.</li>
<li><b>Time</b> — range-partitioning by date makes "today" hot (previous topic).</li>
<li><b>Flash events</b> — ticket sale for one concert, a limited-stock product, a breaking-news page.</li>
<li><b>Bad defaults</b> — null/empty shard keys, a test user, "guest" account used by all anonymous traffic.</li>
</ul>
<p><b>First ask: is the hot traffic reads or writes?</b> The fixes differ.</p>
${H.table(['Hot…', 'Fix', 'How it works', 'Cost'], [
      ['<b>Reads</b>', 'Cache (Redis + in-process)', 'Serve the hot key from memory; short TTL; request coalescing so a miss triggers one DB read', 'Staleness; invalidation'],
      ['<b>Reads</b>', 'More replicas of that shard', 'Spread reads of the hot shard across extra replicas', 'Replica lag; only helps reads'],
      ['<b>Writes</b>', 'Key salting / splitting', '<code>post:42#0..#15</code>: each write picks a random suffix → 16 different shards; reads sum/merge all 16', 'Reads fan out ×16; aggregation logic'],
      ['<b>Writes</b>', 'Buffer &amp; batch', 'Count likes in memory/Kafka for 1 s, then write <code>+1,734</code> once', 'Seconds of delay; lost buffer on crash unless logged'],
      ['<b>Both</b>', 'Isolate', 'Move the hot tenant/key to a dedicated, bigger shard (directory-based routing)', 'Ops work; needs a directory'],
      ['<b>Both</b>', 'Change the model', 'Fan-out-on-read for celebrities instead of fan-out-on-write (news feed)', 'Design complexity']
    ])}
<p><b>Detecting hot keys:</b> per-shard CPU/QPS dashboards show <i>which shard</i>; to find <i>which key</i>, sample requests and keep a top-K (Count-Min Sketch / Space-Saving algorithm) in the router or proxy. Redis has <code>redis-cli --hotkeys</code> (with LFU policy); DynamoDB has CloudWatch Contributor Insights.</p>
<p><b>Managed systems help, a bit:</b> DynamoDB adaptive capacity shifts throughput to hot partitions and splits them, but a single partition key is still capped (around 1,000 WCU / 3,000 RCU per partition). No database can make one key infinitely fast — you must split it.</p>`,
    clues: [
      '"celebrity", "viral post", "Justin Bieber problem", "a user with 100M followers" → hot key',
      '"like counter / view counter on one item at 1M updates per second" → write-hot key → salting or batched counters',
      '"one tenant is 40% of traffic" → isolate tenant on a dedicated shard (directory routing)',
      '"flash sale on one product", "Taylor Swift tickets" → hot item; queue + inventory split into buckets',
      '"one shard at 95% CPU, others at 20%" → skew; find the key with sampling / top-K',
      '"partition throughput exceeded" (DynamoDB) → hot partition key'
    ],
    code: { lang: 'python', run: true, title: 'Salted counter: spread one hot key over many shards (runnable)', code: `import random, zlib
from collections import Counter

SHARDS = 4
SALTS = 8                       # split the hot key into 8 sub-keys
random.seed(7)                  # deterministic demo

def shard_of(key: str) -> int:
    return zlib.crc32(key.encode()) % SHARDS

store = [Counter() for _ in range(SHARDS)]   # each shard: key -> count

def like_naive(post):
    k = f"likes:{post}"
    store[shard_of(k)][k] += 1

def like_salted(post):
    k = f"likes:{post}#{random.randrange(SALTS)}"   # random suffix spreads writes
    store[shard_of(k)][k] += 1

def count_salted(post):
    # reads must gather all sub-keys (a small, bounded fan-out)
    total = 0
    for s in range(SALTS):
        k = f"likes:{post}#{s}"
        total += store[shard_of(k)][k]
    return total

for _ in range(10_000):
    like_naive("celebrity")
print("naive  writes per shard:", [sum(c.values()) for c in store])

store = [Counter() for _ in range(SHARDS)]
for _ in range(10_000):
    like_salted("celebrity")
print("salted writes per shard:", [sum(c.values()) for c in store])
print("total likes read back  :", count_salted("celebrity"))
` },
    viz: {
      title: 'A celebrity key melts one shard — then cache, salting and isolation',
      input: 'shards=4 total=10000 hot=60 salt=8',
      inputLabel: 'shards=N total=writes/s hot=% for the celebrity key salt=sub-keys',
      gen: function (input) {
        var a = kvArgs(input, { shards: 4, total: 10000, hot: 60, salt: 8 });
        var N = Math.round(a.shards), S = Math.round(a.salt);
        if (N < 2 || N > 8) throw new Error('shards must be 2..8');
        if (a.hot < 0 || a.hot > 95) throw new Error('hot must be 0..95 (percent)');
        if (S < 1 || S > 32) throw new Error('salt must be 1..32');
        if (a.total <= 0 || a.total > 1e7) throw new Error('total must be 1..10000000');
        var cap = Math.round(a.total / N * 1.5);
        var normal = a.total * (100 - a.hot) / 100, hotLoad = a.total * a.hot / 100;
        var hotShard = fnv('likes:celeb') % N;
        function hlFor(vals) { var h = {}; vals.forEach(function (v, i) { h[i] = v > cap ? 'bad' : 'ok'; }); return h; }
        function r(v) { return Math.round(v); }
        var frames = [];
        var even = zeros(N).map(function () { return r(a.total / N); });
        frames.push({ narr: 'Normal day: ' + a.total + ' writes/s over ' + N + ' hash shards ≈ <b>' + r(a.total / N) + '</b> each. Each shard can take about <b>' + cap + '</b>/s (1.5× its fair share).', parts: [{ type: 'bars', label: 'Writes/s per shard (capacity ' + cap + ')', values: even, idxLabels: shardLabels(N), hl: hlFor(even) }] });
        var hotVals = zeros(N).map(function (z, i) { return r(normal / N + (i === hotShard ? hotLoad : 0)); });
        frames.push({ narr: 'A celebrity posts. <b>' + a.hot + '%</b> of all writes are now likes on <code>likes:celeb</code>. hash("likes:celeb") mod ' + N + ' = <b>S' + hotShard + '</b>, so <i>all</i> of them land there: <span class="c-r"><b>' + hotVals[hotShard] + '/s</b></span>.', parts: [
          { type: 'bars', label: 'Writes/s per shard (capacity ' + cap + ')', values: hotVals, idxLabels: shardLabels(N), hl: hlFor(hotVals) },
          { type: 'graph', directed: true, height: 40, nodes: [{ id: 'F', label: 'Fans', x: 8, y: 20, shape: 'box' }, { id: 'R', label: 'Router', x: 38, y: 20, shape: 'box' }, { id: 'H', label: 'S' + hotShard + ' (hot)', x: 75, y: 8, shape: 'box' }, { id: 'O', label: 'other shards', x: 75, y: 32, shape: 'box' }], edges: [['F', 'R', 'likes'], ['R', 'H', a.hot + '%'], ['R', 'O', (100 - a.hot) + '%']], hl: { H: 'bad', O: 'done' }, ehl: { 'R-H': 'bad' } }
        ] });
        frames.push({ narr: 'Adding more shards does <b>not</b> help: the hot key still maps to exactly one shard. Adding replicas to S' + hotShard + ' does not help <b>writes</b> either — every replica must apply every write.', parts: [{ type: 'text', label: 'Why scaling out fails here', html: 'hash spreads <b>keys</b>, not <b>traffic per key</b>. One key = one shard = one leader.' }, { type: 'bars', label: 'Writes/s per shard', values: hotVals, idxLabels: shardLabels(N), hl: hlFor(hotVals) }] });
        frames.push({ narr: 'If the hot traffic were <b>reads</b> (people viewing the post), a cache would absorb ~99% of them: one DB read per TTL instead of thousands per second. For <b>writes</b> (likes), we need to split the key.', parts: [{ type: 'graph', directed: true, height: 40, nodes: [{ id: 'F', label: 'Viewers', x: 8, y: 20, shape: 'box' }, { id: 'C', label: 'Redis / local cache', x: 40, y: 20, shape: 'box' }, { id: 'H', label: 'S' + hotShard, x: 78, y: 20, shape: 'box' }], edges: [['F', 'C', '99% hits'], ['C', 'H', '1 read / TTL']], hl: { C: 'ok', H: 'ok' }, ehl: { 'F-C': 'ok' } }] });
        // salting
        var salted = zeros(N).map(function () { return normal / N; });
        var subRows = [];
        for (var s = 0; s < S; s++) { var sh = fnv('likes:celeb#' + s) % N; salted[sh] += hotLoad / S; if (s < 8) subRows.push(['likes:celeb#' + s, 'S' + sh, r(hotLoad / S) + '/s']); }
        salted = salted.map(r);
        frames.push({ narr: '<b>Salting:</b> each like writes to <code>likes:celeb#k</code> where k is random in 0..' + (S - 1) + '. Now the hot key is ' + S + ' different keys hashing to different shards.', parts: [{ type: 'table', label: 'Sub-keys and where they land' + (S > 8 ? ' (first 8 shown)' : ''), columns: ['sub-key', 'shard', 'load'], rows: subRows }] });
        frames.push({ narr: 'After salting: the celebrity load is spread. ' + (salted.some(function (v) { return v > cap; }) ? '<span class="c-y">With few salts the hash can still be lumpy — use more salts (e.g. 4× the shard count).</span>' : '<span class="c-g">Every shard is under capacity.</span>'), parts: [{ type: 'bars', label: 'Writes/s per shard after salting', values: salted, idxLabels: shardLabels(N), hl: hlFor(salted) }] });
        frames.push({ narr: 'The price: reading the like count now means reading <b>' + S + '</b> sub-keys and summing them (a bounded fan-out). Usually fine: cache the sum for 1–5 s; nobody needs an exact live like count.', parts: [{ type: 'code', label: 'Read path', lang: 'python', code: 'total = 0\nfor k in range(' + S + '):\n    total += get(f"likes:celeb#{k}")\ncache.set("likes:celeb", total, ttl=2)', hl: { 2: 'cur', 4: 'ok' } }] });
        frames.push({ narr: '<b>Isolation</b> (for a hot <i>tenant</i>, not a single counter): move it to a dedicated, larger shard via a directory entry <code>tenant:celeb → shard-VIP</code>. Everyone else stops suffering.', parts: [{ type: 'map', label: 'Routing directory (overrides the hash)', entries: [['tenant:celeb', 'shard-VIP (32 cores)'], ['everything else', 'hash(key) mod ' + N]], hl: { 'tenant:celeb': 'sel' } }] });
        return frames;
      }
    },
    examples: [
      { title: 'Twitter-style like counter: buffer + batch', html: `<p>A viral tweet gets 50,000 likes/s. Instead of 50,000 row updates, likes go to Kafka (partitioned by tweet id, with salted sub-partitions for known-hot tweets). A stream job aggregates per second and writes <code>UPDATE counts SET likes = likes + 50,123</code> once. The "who liked" list is written to a separate, well-spread table keyed by <code>(tweet_id, user_id)</code>. Displayed counts are seconds behind — nobody notices.</p>` },
      { title: 'Celebrity news feed: change the model', html: `<p>Fan-out-on-write copies each post into every follower's feed. For a user with 100M followers that is 100M writes per post — a hot-key storm. Fix: <b>hybrid</b> — fan-out-on-write for normal users, fan-out-on-read for celebrities (followers' feeds pull celebrity posts at read time and merge, with heavy caching). This is the design Twitter/Instagram describe publicly.</p>` },
      { title: 'Flash sale inventory: split the stock', html: `<p>10,000 units of one phone, 200,000 buyers in a minute. One row <code>stock=10000</code> with row locks serializes everything. Split into 50 "buckets" of 200 units each (salted keys <code>stock:phone#0..49</code>); each buyer decrements a random non-empty bucket. Throughput ×50; when a bucket hits zero, try another. Put a queue/token gate in front so only ~10,000 buyers even reach checkout.</p>` },
      { title: 'Finding the hot key from metrics', html: `<p>Shard 7 is at 95% CPU, others 25%. Router logs show ${H.c('r', '38%')} of shard 7's requests are for <code>tenant_id = 9001</code>. A Space-Saving top-K counter in the router would have alerted earlier: "key 9001 is 12% of global traffic". Action: move tenant 9001 to its own shard; add a per-tenant rate limit.</p>` }
    ],
    deepDive: `<p><b>Salting math.</b> With k salts over N shards, the hot key's load per touched shard is roughly hot/k. Use k ≥ 2–4 × N so the hash spreads sub-keys well (k = N can easily leave two salts on the same shard). Make k <b>dynamic</b>: only known-hot keys get salts (keep a small "hot key registry"), so normal keys keep single-shard reads.</p>
<p><b>Read amplification.</b> Salting turns 1 read into k reads; combine with a short-TTL cache of the aggregate. For "list" data (e.g. comments on a viral post), salted sub-lists must be merged by timestamp — a k-way merge, like the cross-shard top-K in the next topic.</p>
<p><b>Request coalescing / single-flight.</b> When a hot cache entry expires, 10,000 concurrent requests miss at once and stampede the shard (thundering herd). Let one request refresh while others wait or serve the stale value (stale-while-revalidate), or refresh early with probabilistic expiry. In-process caches (a few seconds TTL) in every app server absorb the very hottest keys before they reach Redis.</p>
<p><b>Hot keys in caches too.</b> Redis Cluster shards by key slot, so a hot key overloads one Redis node. Same fixes: client-side local cache, replicate the key under several names (<code>celeb:v#0..#7</code>, read a random copy, write all copies), or use read replicas for that slot.</p>
<p><b>Write contention vs throughput.</b> Even under capacity, many transactions updating the same row serialize on its lock (or abort under optimistic concurrency). A shard at 30% CPU can still have terrible latency for one hot row. Counters should be commutative increments (or CRDT counters), not read-modify-write.</p>
<p><b>Adaptive splitting.</b> Range-partitioned systems (Bigtable, Spanner, CockroachDB, DynamoDB) split a range when it becomes hot <i>by load</i>, not only by size — but a single key cannot be split, which is why application-level salting still matters.</p>`,
    aiEra: `<p><b>What AI changes:</b> observability platforms now flag anomalies like "partition 12 traffic 8× baseline, dominated by key X" automatically, and an assistant can propose mitigations from the access pattern. LLM-based ops agents can even apply a pre-approved runbook (enable salting for key X, raise cache TTL) — with a human approving.</p>
<p><b>Use AI as a partner:</b> "Our like-count design: here is the schema and traffic. Simulate what happens when one post gets 200K likes/s and propose three mitigations with costs." Then validate with a load test — AI estimates are a starting point, not proof.</p>
<p><b>AI-era hot keys:</b> LLM apps create new ones — a shared system prompt or popular document cached as a prompt-cache key, a viral AI-generated image, or one enterprise tenant whose agents hammer the vector index. Per-tenant quotas and isolation are now standard in AI platforms for exactly this reason.</p>
<p><b>Where AI goes wrong:</b> it often suggests "add more shards" or "add read replicas" for a write-hot key — neither helps. <b>What you must still own:</b> separating read-hot from write-hot, choosing the trade-off (staleness, read fan-out, ops cost), and explaining why hashing cannot fix single-key skew.</p>`,
    problems: [{
      title: 'Handle a celebrity hot key on a like counter',
      level: 'Hard', tags: ['hot-key', 'salting', 'caching'], companies: ['Twitter/X', 'Instagram', 'TikTok', 'YouTube'],
      statement: `<p>Posts are stored in a hash-sharded database keyed by <code>post_id</code>, with columns <code>like_count</code> and <code>view_count</code>. When a global celebrity posts, the post gets 300,000 views/s and 40,000 likes/s for the first hour, and its shard falls over, taking down unrelated posts on the same shard. Redesign so the celebrity post works and other posts are unaffected.</p>`,
      constraints: `<p>Each shard handles ~10,000 writes/s and ~50,000 reads/s. Like counts may be up to 5 s stale. A user's own like must show immediately for them. We have 64 shards.</p>`,
      example: `<p>Today: all ${H.c('r', '40,000 likes/s + 300,000 views/s')} go to shard ${H.c('r', 'hash(post_id) mod 64 = 17')} → 4× its write capacity and 6× its read capacity. Other posts on shard 17 time out too.</p>`,
      brute: { why: `<p><b>Naive design:</b> "Add more shards" — the post still maps to one shard. "Add replicas" — helps views but not likes. "UPDATE posts SET like_count = like_count + 1" per like — 40,000 lock-contended updates/s on a single row; even a giant machine serializes on that row lock.</p>` },
      mcq: { q: 'What helps the 300K views/s of the same post most cheaply?', options: ['Salting the post_id', 'An in-memory cache (CDN/Redis/local) with a short TTL', 'Synchronous replication', 'Range partitioning'], answer: 1, explain: 'Views are reads of the same data: a short-TTL cache serves them from memory, sending maybe one read per second per cache node to the database.' },
      hints: [`<p>Split the problem: views are <b>read-hot</b>, likes are <b>write-hot</b>. They need different tools.</p>`, `<p>Reads: multi-layer cache (CDN/edge → app-local → Redis) with request coalescing. Writes: don't update one row per like — record the like event (well-spread key) and aggregate counts asynchronously, or salt the counter.</p>`, `<p>Read-your-own-like: the client shows it optimistically, and the "did I like it" check reads the <code>(post_id, user_id)</code> row, which is not hot. Add a hot-key detector to switch on salting automatically.</p>`],
      solution: {
        approach: `<p><b>1. Views (read-hot):</b> the post body and counts are served from cache layers — CDN/edge for anonymous viewers, a per-app-server local cache (TTL 1–2 s) and Redis. Request coalescing (single-flight) ensures one DB read per cache node per TTL. 300K views/s become a few hundred DB reads/s.</p>
<p><b>2. Likes (write-hot):</b> the like itself is stored as a row <code>likes(post_id, user_id)</code> keyed by hash(post_id, user_id) — evenly spread, idempotent (unique pair), and used for "did I like this". The count is <i>not</i> updated per like: like events go to Kafka; a stream processor aggregates per post per second and applies <code>like_count += n</code> once a second. For known-hot posts the counter is <b>salted</b> into 32 sub-counters <code>post:42#0..31</code>; the read path sums them and caches the sum for 2 s.</p>
<p><b>3. Detection:</b> the router keeps a top-K of keys by QPS; when a post exceeds a threshold (e.g. 2% of shard capacity) it is added to the hot registry, which turns on salting and longer cache TTLs. Celebrity accounts can be pre-registered.</p>
<p><b>4. Blast radius:</b> per-key rate limits and bulkheads on the shard so one key cannot use more than X% of its connections; optionally move hot posts' counter rows to a dedicated "hot" cluster.</p>
<p><b>User experience:</b> the client shows the user's own like instantly (optimistic UI); everyone else sees counts within ~2–5 s, which meets the requirement.</p>`,
        complexity: `<p>DB writes for likes: ~40,000/s spread across 64 shards via the (post,user) key ≈ 625/s per shard, plus 1 aggregated counter write per second per sub-counter. Reads: ~1 DB read per cache node per TTL. Extra storage: one row per like (needed anyway for "did I like").</p>`,
        followUps: ['How do you handle un-likes so counts never go negative?', 'What if the stream processor crashes — how do you avoid double-counting a batch?', 'How would you show an exact count for an audit?']
      }
    }]
  });

  /* =====================================================================
     TOPIC 6 — Resharding
     ===================================================================== */
  topics.push({
    title: 'Sharding Challenge 2: Resharding Without Downtime',
    analogy: `<p>You run a library with 3 rooms and you shelve books by "book number mod 3". The library grows and you add a 4th room. If you switch the rule to "mod 4", <b>three out of four books</b> are now in the wrong room — you must carry almost the whole library while readers are still borrowing.</p>
<p>A smarter library divides the books into <b>12 labelled boxes</b> from day one and only remembers "which room holds which box". To add a 4th room you carry just <b>3 boxes</b> over. Each book always stays in its box; only whole boxes move.</p>`,
    explain: `<p><b>Resharding</b> (rebalancing) means changing how data is spread across machines: adding shards when you grow, removing them when you shrink, or splitting one hot/huge shard. It is the hardest operational part of sharding, because data must move <b>while the system keeps serving reads and writes</b>.</p>
<p><b>Why <code>hash mod N</code> is a trap.</b> When N changes, a key keeps its shard only if <code>h mod N = h mod (N+1)</code>, which is true for roughly 1/(N+1) of keys. Going from 3 → 4 shards moves about <b>75%</b> of all data; 10 → 11 moves about <b>91%</b>.</p>
<p><b>Three better schemes:</b></p>
${H.table(['Scheme', 'Idea', 'Data moved when adding 1 node to N', 'Used by'], [
      ['<b>Fixed logical partitions</b>', 'Create many partitions up front (e.g. 1,024); key → partition never changes; a small map says partition → node', '≈ 1/(N+1) of data (whole partitions)', 'Vitess, Citus, Elasticsearch shards, Riak, Redis Cluster (16,384 slots), Kafka'],
      ['<b>Dynamic range splitting</b>', 'Start with a few key ranges; split a range when it grows too big/hot; move ranges between nodes', 'Only the moved ranges', 'Bigtable/HBase, Spanner, CockroachDB, MongoDB chunks, DynamoDB'],
      ['<b>Consistent hashing</b>', 'Keys and nodes on a hash ring; a key belongs to the next node clockwise (module 7)', '≈ 1/(N+1) of data', 'Cassandra, DynamoDB (original Dynamo), Memcached clients']
    ])}
<p><b>The online migration playbook</b> (how Vitess, Stripe, Notion, Figma and others describe it):</p>
<ol>
<li><b>Prepare:</b> create the new shard(s) with schema; decide which partitions/ranges move.</li>
<li><b>Backfill:</b> copy a consistent snapshot of the moving data to the new shard (throttled so production does not suffer).</li>
<li><b>Catch up:</b> stream every change made since the snapshot (CDC from the binlog/WAL) and apply it to the new shard until lag ≈ 0.</li>
<li><b>Verify:</b> compare row counts and checksums; optionally <b>shadow-read</b> (read both, compare, serve the old).</li>
<li><b>Cut over:</b> briefly block writes to the moving partitions (milliseconds to a few seconds), wait for the last changes to apply, flip the routing map (versioned), resume writes on the new shard.</li>
<li><b>Clean up:</b> keep the old copy read-only for a soak period so you can roll back; then delete it.</li>
</ol>
<p>Alternative to steps 3–5: <b>dual writes</b> (the app writes to old and new) — simpler to explain but tricky to make correct (one write can fail, ordering differs), so CDC-based copying is usually preferred.</p>`,
    clues: [
      '"we need to go from 4 shards to 16" / "add capacity without downtime" → online resharding playbook (backfill + CDC + cutover)',
      '"hash mod N" in a design → interviewer will ask "what happens when N changes?" → fixed partitions or consistent hashing',
      '"one shard is 3× bigger than the others" → split that shard / move partitions',
      '"zero downtime migration", "no data loss during migration" → snapshot + change stream + verification + fenced cutover',
      '"plan for 10× growth" → many logical shards from day one, mapped onto few physical nodes',
      '"rollback plan" → keep old shard intact until the new one has soaked'
    ],
    code: { lang: 'python', run: true, title: 'How much data moves? mod-N vs fixed logical partitions (runnable)', code: `import zlib

keys = [f"user:{i}" for i in range(100_000)]
h = {k: zlib.crc32(k.encode()) for k in keys}

def moved_mod_n(old_n, new_n):
    return sum(1 for k in keys if h[k] % old_n != h[k] % new_n) / len(keys)

# Fixed partitions: key -> partition never changes; only the partition -> node map does.
P = 1024
def assign(nodes, previous=None):
    """Give each node ~P/nodes partitions, moving as few as possible from 'previous'."""
    if previous is None:
        return {p: p % nodes for p in range(P)}
    owner = dict(previous)
    target = P // nodes
    load = {n: [p for p, o in owner.items() if o == n] for n in range(nodes)}
    for new_node in range(nodes):
        while len(load[new_node]) < target:
            donor = max(load, key=lambda n: len(load[n]))   # take from the fullest node
            p = load[donor].pop()
            owner[p] = new_node
            load[new_node].append(p)
    return owner

def moved_fixed(old_n, new_n):
    old = assign(old_n)
    new = assign(new_n, old)
    return sum(1 for k in keys if old[h[k] % P] != new[h[k] % P]) / len(keys)

for a, b in [(3, 4), (4, 5), (10, 11), (4, 16)]:
    print(f"{a:>2} -> {b:<2} shards   mod-N moves {moved_mod_n(a, b):6.1%}   "
          f"fixed partitions move {moved_fixed(a, b):6.1%}")
` },
    viz: [{
      title: 'Adding a shard: mod-N rehash vs moving whole partitions',
      input: 'keys=12 from=3 to=4 parts=12',
      inputLabel: 'keys=K from=N to=M parts=P (logical partitions)',
      gen: function (input) {
        var a = kvArgs(input, { keys: 12, from: 3, to: 4, parts: 12 });
        var K = Math.round(a.keys), F = Math.round(a.from), T = Math.round(a.to), P = Math.round(a.parts);
        if (K < 4 || K > 16) throw new Error('keys must be 4..16');
        if (F < 2 || F > 6 || T <= F || T > 8) throw new Error('need 2 ≤ from < to ≤ 8');
        if (P < T || P > 24) throw new Error('parts must be between "to" and 24');
        var keys = []; for (var i = 0; i < K; i++) keys.push('user' + (i + 1));
        var frames = [], rows = [], moved = 0;
        frames.push({ narr: 'Plan A — naive: <code>shard = hash(key) mod N</code>. We grow from <b>' + F + '</b> to <b>' + T + '</b> shards. Watch how many keys change shard.', parts: [{ type: 'table', label: 'mod-N rehash', columns: ['key', 'hash', 'old = h mod ' + F, 'new = h mod ' + T, 'moves?'], rows: [] }] });
        keys.forEach(function (k, idx) {
          var h = fnv(k) % 10000, o = h % F, n = h % T, mv = o !== n;
          if (mv) moved++;
          rows.push([k, h, 'S' + o, 'S' + n, mv ? '<span class="c-r">MOVE</span>' : '<span class="c-g">stays</span>']);
          if (idx % 3 === 2 || idx === K - 1) {
            var hl = {}; rows.forEach(function (r, j) { hl[j] = /MOVE/.test(r[4]) ? 'bad' : 'ok'; });
            frames.push({ narr: 'After ' + (idx + 1) + ' keys: <b>' + moved + '</b> must move. A key stays only if h mod ' + F + ' equals h mod ' + T + '.', parts: [{ type: 'table', label: 'mod-N rehash', columns: ['key', 'hash', 'old = h mod ' + F, 'new = h mod ' + T, 'moves?'], rows: rows.map(function (r) { return r.slice(); }), hl: hl }] });
          }
        });
        frames.push({ narr: '<span class="c-r"><b>' + moved + ' of ' + K + ' keys (' + Math.round(100 * moved / K) + '%) move</b></span> — theory says about ' + Math.round(100 * (1 - 1 / T)) + '%. On a 10 TB fleet that is ~' + Math.round(10 * moved / K) + ' TB copied while serving traffic.', parts: [{ type: 'bars', label: 'Keys moved vs stayed (mod-N)', values: [moved, K - moved], idxLabels: ['moved', 'stayed'], hl: { 0: 'bad', 1: 'ok' } }] });
        // Plan B: fixed partitions
        var owner = []; for (var p = 0; p < P; p++) owner.push(p % F);
        function nodeView() {
          var r = []; for (var n = 0; n < T; n++) { var ps = []; for (var q = 0; q < P; q++) if (owner[q] === n) ps.push('P' + q); r.push(['Node ' + n + (n >= F ? ' (new)' : ''), ps.join(' ') || '(empty)', ps.length]); }
          return r;
        }
        frames.push({ narr: 'Plan B — <b>' + P + ' fixed logical partitions</b>: <code>partition = hash(key) mod ' + P + '</code> <i>forever</i>. A small map assigns partitions to nodes. Start: ' + F + ' nodes.', parts: [{ type: 'table', label: 'Partition → node map', columns: ['node', 'partitions', 'count'], rows: nodeView() }] });
        var target = Math.floor(P / T), movedParts = [];
        for (var nn = F; nn < T; nn++) {
          while (owner.filter(function (o) { return o === nn; }).length < target) {
            var cnt = zeros(T); owner.forEach(function (o) { cnt[o]++; });
            var donor = cnt.indexOf(Math.max.apply(null, cnt));
            var pick = -1; for (var q2 = P - 1; q2 >= 0; q2--) if (owner[q2] === donor) { pick = q2; break; }
            owner[pick] = nn; movedParts.push(pick);
            var hl2 = {}; hl2[nn] = 'ok'; hl2[donor] = 'cur';
            frames.push({ narr: 'Move whole partition <b>P' + pick + '</b> from Node ' + donor + ' (fullest) to <b>Node ' + nn + '</b>. Keys inside P' + pick + ' keep their partition; only its location changes.', parts: [{ type: 'table', label: 'Partition → node map', columns: ['node', 'partitions', 'count'], rows: nodeView(), hl: hl2 }] });
          }
        }
        var movedKeys = keys.filter(function (k) { return movedParts.indexOf((fnv(k) % 10000) % P) >= 0; }).length;
        frames.push({ narr: '<span class="c-g"><b>Only ' + movedParts.length + ' of ' + P + ' partitions moved (' + Math.round(100 * movedParts.length / P) + '%)</b></span> — the minimum possible. Of our ' + K + ' sample keys, ' + movedKeys + ' moved (vs ' + moved + ' with mod-N). Pick P large (e.g. 1,024) so you can grow for years.', parts: [{ type: 'bars', label: 'Fraction of data moved (%)', values: [Math.round(100 * moved / K), Math.round(100 * movedParts.length / P)], idxLabels: ['mod-N rehash', 'fixed partitions'], hl: { 0: 'bad', 1: 'ok' } }] });
        return frames;
      }
    }, {
      title: 'Online resharding step by step (backfill → CDC → verify → cutover)',
      gen: function () {
        var nodes = [
          { id: 'A', label: 'App servers', x: 8, y: 28, shape: 'box' },
          { id: 'R', label: 'Router + shard map v1', x: 34, y: 28, shape: 'box', w: 22 },
          { id: 'O', label: 'Old shard (P8-P11)', x: 72, y: 8, shape: 'box', w: 22 },
          { id: 'N', label: 'New shard (empty)', x: 72, y: 50, shape: 'box', w: 22 },
          { id: 'J', label: 'Copy / CDC worker', x: 94, y: 29, shape: 'box', w: 16 }
        ];
        var edges = [['A', 'R'], ['R', 'O', 'reads+writes'], ['R', 'N'], ['O', 'J', 'snapshot / binlog'], ['J', 'N', 'apply']];
        function g(hl, ehl, tags, label) { var n = nodes.map(function (x) { var y = {}; for (var k in x) y[k] = x[k]; return y; }); if (label) label(n); return { type: 'graph', directed: true, height: 60, nodes: n, edges: edges, hl: hl, ehl: ehl, tags: tags || {} }; }
        function phase(i) { var rows = [['1', 'Prepare'], ['2', 'Backfill snapshot'], ['3', 'CDC catch-up'], ['4', 'Verify'], ['5', 'Cutover'], ['6', 'Soak &amp; clean up']]; var hl = {}; hl[i] = 'cur'; for (var j = 0; j < i; j++) hl[j] = 'done'; return { type: 'table', label: 'Phase', columns: ['#', 'step'], rows: rows, hl: hl }; }
        return [
          { narr: '<b>Goal:</b> move partitions P8–P11 from an overloaded shard to a new one, with no downtime. Today all traffic for them goes to the old shard.', parts: [g({ O: 'cur' }, { 'A-R': 'ok', 'R-O': 'ok' }), phase(0)] },
          { narr: '<b>Prepare:</b> create the new shard with the same schema and replicas. It receives no traffic yet.', parts: [g({ N: 'ok' }, { 'R-O': 'ok' }, { N: 'schema ready' }), phase(0)] },
          { narr: '<b>Backfill:</b> take a consistent snapshot of P8–P11 at binlog position <b>#5000</b> and bulk-copy it (throttled, e.g. 50 MB/s) to the new shard. Production writes continue on the old shard meanwhile.', parts: [g({ J: 'cur', N: 'cur' }, { 'O-J': 'cur', 'J-N': 'cur', 'R-O': 'ok' }, { O: 'binlog #5000…', N: 'copying' }), phase(1)] },
          { narr: '<b>CDC catch-up:</b> replay every change after #5000 from the binlog onto the new shard. Lag shrinks from minutes to milliseconds and stays there.', parts: [g({ J: 'ok', N: 'ok' }, { 'O-J': 'ok', 'J-N': 'ok', 'R-O': 'ok' }, { O: 'at #9120', N: 'at #9118 (lag 2)' }), phase(2)] },
          { narr: '<b>Verify:</b> compare row counts and per-chunk checksums; shadow-read a sample (read both, compare, return the old answer). Fix any diffs before going further.', parts: [g({ O: 'ok', N: 'ok' }, { 'R-O': 'ok', 'R-N': 'cur' }, { N: 'checksums match' }), { type: 'table', label: 'Verification', columns: ['chunk', 'old checksum', 'new checksum', 'ok?'], rows: [['P8', 'a91f', 'a91f', '✔'], ['P9', '0c2e', '0c2e', '✔'], ['P10', '77b0', '77b0', '✔'], ['P11', 'e4d1', 'e4d1', '✔']] }] },
          { narr: '<b>Cutover (the risky second):</b> block writes to P8–P11 at the router (ms to ~2 s), wait until CDC lag = 0, then publish <b>shard map v2</b> (P8–P11 → new shard). Bumping the map version fences stale routers: the old shard rejects writes for moved partitions.', parts: [g({ R: 'cur', O: 'done', N: 'sel' }, { 'A-R': 'cur' }, { R: 'map v2', O: 'writes fenced' }, function (n) { n[1].label = 'Router + shard map v2'; }), phase(4)] },
          { narr: 'Traffic for P8–P11 now flows to the new shard. Keep reverse replication (new → old) running during a <b>soak</b> so you can roll back instantly by flipping the map back.', parts: [g({ N: 'ok' }, { 'A-R': 'ok', 'R-N': 'ok' }, { N: 'live', O: 'standby copy' }, function (n) { n[1].label = 'Router + shard map v2'; n[3].label = 'New shard (P8-P11)'; }), phase(5)] },
          { narr: '<b>Clean up:</b> after days of healthy metrics, delete P8–P11 from the old shard (it now has headroom for its remaining partitions). Done — and no user saw downtime.', parts: [g({ O: 'ok', N: 'ok' }, { 'R-O': 'ok', 'R-N': 'ok' }, { O: 'P0-P7 only' }, function (n) { n[1].label = 'Router + shard map v2'; n[2].label = 'Old shard (P0-P7)'; n[3].label = 'New shard (P8-P11)'; }), phase(5)] }
        ];
      }
    }],
    examples: [
      { title: 'Mod-N move fraction, worked', html: `<p>Keys with hash 0..11, going from 3 to 4 shards. Key stays only if h mod 3 = h mod 4: h = 0, 1, 2 (and 12, 13, 14 …) — 3 out of every 12 → <b>25% stay, 75% move</b>. ${H.arr([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], { label: 'h', hl: { 0: 'g', 1: 'g', 2: 'g', 3: 'r', 4: 'r', 5: 'r', 6: 'r', 7: 'r', 8: 'r', 9: 'r', 10: 'r', 11: 'r' } })}</p>` },
      { title: 'Doubling with power-of-two shards', html: `<p>If you only ever double (4 → 8 → 16) with <code>h mod N</code>, each key either stays or moves to shard <code>old + N</code>, and exactly half the data moves — every old shard splits in two. That is predictable (each old shard streams half of itself to one new buddy) and is how many teams reshard MySQL fleets, but it still copies 50% of data and forces you to double capacity each time.</p>` },
      { title: 'Redis Cluster: 16,384 slots', html: `<p>Every key maps to <code>CRC16(key) mod 16384</code> — a fixed slot. Adding a node means migrating some slots (<code>CLUSTER SETSLOT … MIGRATING/IMPORTING</code>); during migration, a client asking the old node for a moved key gets <code>-ASK</code> or <code>-MOVED</code> and retries at the new node. Fixed partitions + client redirection = online resharding.</p>` },
      { title: 'Vitess resharding a MySQL keyspace', html: `<p>Vitess hashes a sharding column into a keyspace ID and assigns <i>ranges</i> of IDs to shards (e.g. <code>-80</code>, <code>80-</code>). A <code>Reshard</code> workflow creates target shards (<code>-40</code>, <code>40-80</code>), copies rows, streams binlogs (VReplication), lets you <code>SwitchTraffic</code> for reads then writes, and supports <code>ReverseTraffic</code> for rollback — the playbook above, productized.</p>` },
      { title: 'Choosing the number of logical partitions', html: `<p>Expect at most ~64 physical nodes in 5 years and want ~16 partitions per node for smooth balancing → 1,024 partitions. Too few (e.g. 16) and you cannot spread beyond 16 nodes; too many (1M) and per-partition overhead (files, connections, metadata) dominates. Elasticsearch shards are an example where too many small shards hurt.</p>` }
    ],
    deepDive: `<p><b>Routing during migration.</b> Clients cache the shard map, so during cutover some hold the old version. Standard defences: version the map; the storage node knows which partitions it owns at which version and rejects requests for partitions it no longer owns (returning "moved, refresh map"); clients retry with the new map. This is a fencing token for routing.</p>
<p><b>Consistency at cutover.</b> The write freeze must cover the gap between "last change applied to new shard" and "routers switched". Without it, a write accepted by the old shard after the final CDC position is lost. Systems minimise the freeze by switching reads first (harmless), then a short write freeze per partition, one partition at a time.</p>
<p><b>Backfill pitfalls.</b> Copying with a naive <code>SELECT *</code> on a live table can lock or thrash caches — copy in primary-key order in chunks, throttle by replica lag, and make the CDC apply idempotent (upserts), because the snapshot and the stream overlap. Large blob columns and secondary indexes slow the copy; build indexes after bulk loading when possible.</p>
<p><b>Automatic rebalancing is not always good.</b> A node that is merely slow can look dead; if the system rebalances automatically, it starts copying terabytes onto already-busy nodes and can cascade into an outage. Many teams keep rebalancing human-approved (Couchbase, Riak, Elasticsearch allow throttling and manual triggers).</p>
<p><b>Splits of range partitions</b> are cheap logically (a metadata change) but the two halves may still live on the same node until one moves. Splitting by load (QPS) rather than size handles hot ranges; merging cold ranges keeps metadata small.</p>
<p><b>Changing the shard key itself</b> (e.g. from user_id to tenant_id) is a full data migration: new cluster, backfill everything, dual-run, migrate readers — months of work. That is why the shard-key decision matters so much.</p>`,
    aiEra: `<p><b>What AI changes:</b> assistants are good at drafting the migration runbook, generating chunked copy scripts, checksum queries and rollback steps, and at reviewing a plan for missing pieces ("you never fence the old shard"). Managed platforms (PlanetScale, Aurora Limitless, Spanner, DynamoDB) increasingly do splitting/moving automatically, so the job shifts from doing the move to supervising it.</p>
<p><b>Use AI as a partner:</b> "Here is our resharding plan from 8 to 32 shards; list every way a write could be lost or duplicated, and how we would detect it." Use the answer as a checklist for a staging rehearsal with production-like traffic.</p>
<p><b>AI workloads:</b> re-indexing a vector database (new embedding model → every vector changes) is a resharding-like migration: build the new index in the background, dual-query/compare, cut over, keep the old one for rollback.</p>
<p><b>Where AI goes wrong:</b> it may produce a plan that "stops writes, copies, restarts" (that is downtime), skip verification, or assume dual writes are atomic. <b>What you must still own:</b> the cutover correctness argument, the rollback plan, and the go/no-go decision during the migration.</p>`,
    problems: [{
      title: 'Plan resharding from 4 to 16 shards with zero downtime',
      level: 'Hard', tags: ['resharding', 'migration', 'cdc'], companies: ['Stripe', 'Notion', 'Figma', 'Shopify'],
      statement: `<p>A product's Postgres data is sharded by <code>workspace_id</code> using <code>hash(workspace_id) mod 4</code> across 4 physical shards. Each shard is at 80% CPU and 3 TB. Plan the move to 16 shards without downtime and without losing any write, and so that the <i>next</i> growth step is easy.</p>`,
      constraints: `<p>Peak 20,000 writes/s total. Max acceptable write pause: 2 s per workspace. Copy bandwidth must not push production above 90% CPU. Must be able to roll back at any point.</p>`,
      example: `<p>With plain ${H.c('r', 'mod 4 → mod 16')}, a workspace with hash 5 moves from shard 1 to shard 5; hash 4 moves from shard 0 to shard 4 — ${H.c('r', '75% of all rows')} change shard, and every router must switch at the same instant.</p>`,
      brute: { why: `<p><b>Naive plan:</b> announce maintenance, stop the app, dump all 12 TB, re-split with <code>mod 16</code>, restore, restart. Hours of downtime, and if anything fails mid-way, rollback means restoring again. Another naive plan — "just change the router to mod 16" — instantly sends 75% of reads to shards that do not have the data.</p>` },
      mcq: { q: 'Which change makes future growth (16 → 64) cheap?', options: ['Keep mod N and reshard each time', 'Introduce fixed logical partitions (e.g. 4,096) with a partition → shard map', 'Switch to range by created_at', 'Use bigger machines only'], answer: 1, explain: 'Once key → partition is fixed forever, growth is just moving whole partitions and updating the map — about 1/(N+1) of data per added node.' },
      hints: [`<p>First introduce an indirection: key → logical partition (fixed, many) → physical shard (a map). Existing mod-4 placement can be expressed as such a map.</p>`, `<p>Move partitions in waves: backfill a snapshot, tail the WAL with logical replication/CDC, verify with checksums, then cut over a few partitions at a time with a short write fence.</p>`, `<p>Keep reverse replication for rollback; throttle the copy by CPU/replica lag; version the shard map so stale routers are rejected; clean up old copies only after a soak.</p>`],
      solution: {
        approach: `<p><b>Step 0 — indirection without moving data:</b> define 4,096 logical partitions, <code>p = hash(workspace_id) mod 4096</code>. Because 4,096 is a multiple of 4, <code>p mod 4</code> equals the current shard, so the initial map is simply "partition p → shard p mod 4". Deploy routers that use the versioned map (stored in etcd/a config service). Nothing moves yet.</p>
<p><b>Step 1 — provision</b> 12 new shards (each with replicas), same schema.</p>
<p><b>Step 2 — move in waves</b> (e.g. 64 partitions at a time). For each wave: snapshot the partitions' rows from the source (chunked, PK order, throttled to keep source CPU &lt; 90%), start logical replication/CDC from the snapshot LSN, apply idempotently on the target until lag &lt; 100 ms.</p>
<p><b>Step 3 — verify</b> row counts and chunk checksums; shadow-read 1% of reads.</p>
<p><b>Step 4 — cut over</b> each wave: routers pause writes for those partitions (&lt; 2 s), wait for lag = 0, publish map vN+1, resume. Sources reject writes for partitions they no longer own (fencing by map version). Start reverse replication target → source for rollback.</p>
<p><b>Step 5 — soak and clean</b>: after a few days, stop reverse replication and delete moved rows from sources. Final state: 16 shards × 256 partitions each, ~750 GB and ~25% CPU per shard.</p>
<p><b>Next growth (16 → 64):</b> just move 192 of each shard's 256 partitions — same tooling, no rehashing. Cross-cutting: monitor per-wave error rates, have a kill switch, rehearse on staging with production-sized data.</p>`,
        complexity: `<p>Data copied ≈ 75% of 12 TB = 9 TB; at 200 MB/s aggregate (throttled) ≈ 12.5 hours of copy spread over days of waves. Write pause per partition &lt; 2 s; no global downtime.</p>`,
        followUps: ['How do you handle a workspace that is larger than one whole shard?', 'What breaks if a router misses the map update?', 'How would you migrate foreign-key-related tables so they move together?']
      }
    }]
  });

  /* =====================================================================
     TOPIC 7 — Cross-shard queries, joins and transactions
     ===================================================================== */
  topics.push({
    title: 'Sharding Challenge 3: Cross-Shard Queries, Joins & Transactions',
    analogy: `<p>A company keeps employee files in 8 branch offices, by employee ID. "Show me employee 4711" — you phone one office. But "Who are the 10 highest-paid people in the company?" means phoning <b>all 8 offices</b>, asking each for <i>their</i> top 10, and merging the lists yourself. You can only answer when the <b>slowest office</b> calls back.</p>
<p>And "move Priya from the Delhi office to the Pune office" needs both offices to agree — if Delhi deletes her file but Pune never receives it, she vanishes. That is a cross-shard transaction.</p>`,
    explain: `<p>Sharding is fast when a query names the shard key — it touches <b>one</b> shard. Everything else is a <b>cross-shard</b> operation:</p>
${H.table(['Operation', 'Example (orders sharded by customer_id)', 'What happens'], [
      ['Query by another column', '"orders for product X"', 'Scatter to all shards, gather results'],
      ['Global sort / top-K / pagination', '"top 10 orders today by value"', 'Each shard returns its top K, router merges'],
      ['Aggregation', '"total revenue today"', 'Each shard computes a partial SUM, router adds'],
      ['Join across shard keys', 'orders ⋈ sellers', 'Fetch from many shards, join in the app'],
      ['Uniqueness', '"email must be unique"', 'No single shard can check it'],
      ['Transaction across shards', 'transfer from customer A to customer B', 'Needs 2PC or a saga']
    ])}
<p><b>Scatter-gather (fan-out)</b> is the default fallback: the router sends the query to every shard in parallel and merges. It works, but:</p>
<ul>
<li><b>Latency = the slowest shard.</b> If each shard is slow 1% of the time, a 100-shard fan-out is slow 63% of the time (1 − 0.99<sup>100</sup>). This is <b>tail-latency amplification</b>.</li>
<li><b>Load multiplies:</b> one user query becomes N shard queries, so fan-out queries do not scale as you add shards.</li>
<li><b>Deep pagination hurts:</b> page 50 of 20 results means each shard returns its top 1,000 for the router to merge.</li>
</ul>
<p><b>How to avoid cross-shard work (best first):</b></p>
<ol>
<li><b>Pick the shard key so the hot queries are single-shard</b>, and <b>co-locate</b> related tables on the same key (orders + order_items + payments all by customer_id; in multi-tenant apps, everything by tenant_id).</li>
<li><b>Denormalize</b>: copy the few fields you need (seller name on the order) so you do not need a join.</li>
<li><b>Global secondary index</b>: a separate table keyed by the other column (<code>product_id → [order ids]</code>), maintained asynchronously via CDC.</li>
<li><b>Replicate small reference tables</b> (countries, currencies, plans) to every shard so joins against them stay local.</li>
<li><b>Send analytics elsewhere</b>: stream to a warehouse/search engine built for scans.</li>
<li><b>Cross-shard transactions</b> only when unavoidable: <b>2PC</b> (atomic, but blocking if the coordinator dies), or a <b>saga</b> (a sequence of local transactions with compensating actions, eventually consistent). Distributed SQL databases (Spanner, CockroachDB) do 2PC over Raft groups for you — at a latency cost.</li>
</ol>`,
    clues: [
      '"search orders by product / by seller" when sharded by customer → global secondary index or search engine',
      '"leaderboard", "top K across all users", "trending" → scatter-gather with per-shard top-K, or a precomputed aggregate',
      '"usernames must be unique" in a sharded user table → uniqueness table keyed by username (or a reservation service)',
      '"transfer between two users" on different shards → 2PC or saga with idempotent steps',
      '"p99 latency got worse as we added shards" → fan-out tail-latency amplification',
      '"admin dashboard counts across all tenants" → don\'t fan out on OLTP; use a warehouse or pre-aggregated counters'
    ],
    code: { lang: 'python', run: true, title: 'Scatter-gather top-K with a k-way merge (runnable)', code: `import heapq
from concurrent.futures import ThreadPoolExecutor

# Each shard holds (score, player) rows for the players hashed to it.
shards = [
    [(90, "ana"), (40, "bo"), (10, "cy")],
    [(85, "dee"), (80, "eli"), (5, "fay")],
    [(99, "gus"), (20, "hal")],
    [(70, "ivy"), (60, "jon"), (50, "kai")],
]

def local_top_k(shard_id, k):
    """Runs ON the shard: ORDER BY score DESC LIMIT k (uses an index there)."""
    return heapq.nlargest(k, shards[shard_id])

def global_top_k(k):
    # 1) scatter: ask every shard in parallel for ITS top k
    with ThreadPoolExecutor(max_workers=len(shards)) as pool:
        partials = list(pool.map(lambda s: local_top_k(s, k), range(len(shards))))
    # 2) gather: each partial list is sorted descending -> k-way merge, stop after k
    merged = heapq.merge(*partials, reverse=True)
    return [next(merged) for _ in range(min(k, sum(map(len, partials))))]

print("partials from shards:", [local_top_k(s, 3) for s in range(len(shards))])
print("global top 3        :", global_top_k(3))

# Why each shard must return k (not k / shards): the top 3 might all live on one shard.
skewed = [[(100, "a"), (99, "b"), (98, "c")], [(1, "x")], [(2, "y")], [(3, "z")]]
shards = skewed
print("skewed global top 3 :", global_top_k(3))
` },
    viz: [{
      title: 'Cross-shard top-K: fan-out, local top-K, merge (latency = slowest shard)',
      input: '90 40 10 | 85 80 5 | 99 20 | 70 60 50 ; k=3',
      inputLabel: 'Scores per shard separated by | then ; k=K',
      gen: function (input) {
        var s = String(input || '');
        var km = s.match(/k\s*=\s*(\d+)/), k = km ? Number(km[1]) : 3;
        var body = s.replace(/;?\s*k\s*=\s*\d+/, '');
        var groups = body.split('|').map(function (g) { return g.trim().split(/[\s,]+/).filter(Boolean).map(Number); });
        if (groups.length < 2 || groups.length > 6) throw new Error('Give 2..6 shards separated by |, e.g. 90 40 | 85 80 ; k=3');
        if (groups.some(function (g) { return !g.length || g.length > 8 || g.some(isNaN); })) throw new Error('Each shard needs 1..8 numbers');
        if (!(k >= 1 && k <= 8)) throw new Error('k must be 1..8');
        var n = groups.length, frames = [];
        var lat = groups.map(function (g, i) { return 8 + (fnv('lat' + i + g.join(',')) % 20) + (i === n - 1 ? 60 : 0); });
        var nodes = [{ id: 'C', label: 'Client', x: 6, y: 30, shape: 'box' }, { id: 'R', label: 'Router (merge)', x: 32, y: 30, shape: 'box' }];
        var edges = [['C', 'R', 'top ' + k + '?']];
        for (var i = 0; i < n; i++) { nodes.push({ id: 'S' + i, label: 'Shard ' + i, x: 78, y: 6 + i * (48 / Math.max(1, n - 1)), shape: 'box' }); edges.push(['R', 'S' + i]); }
        function g(hl, ehl, tags) { return { type: 'graph', directed: true, height: 60, nodes: nodes, edges: edges, hl: hl, ehl: ehl, tags: tags || {} }; }
        frames.push({ narr: 'Query: "global top ' + k + ' scores". Scores are sharded by <b>player id</b>, not by score, so <b>any</b> shard may hold a winner. The router must ask them all.', parts: [g({ C: 'cur' }, { 'C-R': 'cur' }), { type: 'table', label: 'Data on each shard', columns: ['shard', 'scores'], rows: groups.map(function (gr, j) { return ['Shard ' + j, gr.join(', ')]; }) }] });
        var ehl = {}, hl = { R: 'cur' }; for (i = 0; i < n; i++) { ehl['R-S' + i] = 'cur'; hl['S' + i] = 'cur'; }
        frames.push({ narr: '<b>Scatter:</b> send <code>ORDER BY score DESC LIMIT ' + k + '</code> to all ' + n + ' shards in parallel. One user query just became <b>' + n + '</b> database queries.', parts: [g(hl, ehl)] });
        var partials = groups.map(function (gr) { return gr.slice().sort(function (a, b) { return b - a; }).slice(0, k); });
        var tags = {}; partials.forEach(function (p, j) { tags['S' + j] = '[' + p.join(',') + ']'; });
        frames.push({ narr: 'Each shard returns <b>its own top ' + k + '</b> (not top ' + k + '/' + n + ' — all ' + k + ' winners might sit on one shard).', parts: [g({ R: 'cur' }, ehl, tags), { type: 'table', label: 'Partial results', columns: ['shard', 'local top ' + k], rows: partials.map(function (p, j) { return ['Shard ' + j, p.join(', ')]; }) }] });
        var maxLat = Math.max.apply(null, lat), slow = lat.indexOf(maxLat), lhl = {}; lat.forEach(function (l, j) { lhl[j] = j === slow ? 'bad' : 'ok'; });
        var thl = {}; thl['S' + slow] = 'bad';
        frames.push({ narr: 'Responses arrive at different times. The router can only answer after the <b>slowest</b> shard: <span class="c-r">' + maxLat + ' ms</span> (shard ' + slow + ' was doing a compaction). More shards → more chances one is slow.', parts: [g(thl, {}, tags), { type: 'bars', label: 'Shard response time (ms)', values: lat, idxLabels: shardLabels(n), hl: lhl }] });
        // merge step by step
        var ptrs = zeros(n), out = [];
        for (var step = 0; step < k; step++) {
          var best = -1, bv = -Infinity;
          for (var j = 0; j < n; j++) if (ptrs[j] < partials[j].length && partials[j][ptrs[j]] > bv) { bv = partials[j][ptrs[j]]; best = j; }
          if (best < 0) break;
          out.push(bv); ptrs[best]++;
          var heads = partials.map(function (p, jj) { return ['Shard ' + jj, ptrs[jj] < p.length ? p[ptrs[jj]] : '(empty)']; });
          var hh = {}; hh[best] = 'ok';
          frames.push({ narr: '<b>Merge</b> (k-way, like merge sort): compare the head of each partial list, take the largest — <b>' + bv + '</b> from shard ' + best + '.', parts: [{ type: 'table', label: 'Next candidate from each shard', columns: ['shard', 'head'], rows: heads, hl: hh }, { type: 'array', label: 'Global top ' + k + ' so far', values: out.slice(), hl: (function () { var o = {}; o[out.length - 1] = 'ok'; return o; })() }] });
        }
        frames.push({ narr: 'Answer: <b>[' + out.join(', ') + ']</b> in ~' + maxLat + ' ms. Cheaper alternatives for a hot leaderboard: a single Redis sorted set updated on every score change, or a pre-computed top-K refreshed every few seconds.', parts: [{ type: 'array', label: 'Global top ' + k, values: out.slice(), hl: (function () { var o = {}; out.forEach(function (x, q) { o[q] = 'sel'; }); return o; })() }, { type: 'text', label: 'Cost', html: 'shard queries: ' + n + ' · rows shipped: ' + partials.reduce(function (a, p) { return a + p.length; }, 0) + ' · latency: slowest shard' }] });
        return frames;
      }
    }, {
      title: 'Query by a non-shard key: scatter-gather vs global secondary index',
      gen: function () {
        var nodes = [
          { id: 'A', label: 'App', x: 6, y: 28, shape: 'box' },
          { id: 'G', label: 'GSI: product → order ids', x: 36, y: 6, shape: 'box', w: 24 },
          { id: 'S0', label: 'Orders S0', x: 80, y: 6, shape: 'box' },
          { id: 'S1', label: 'Orders S1', x: 80, y: 22, shape: 'box' },
          { id: 'S2', label: 'Orders S2', x: 80, y: 38, shape: 'box' },
          { id: 'S3', label: 'Orders S3', x: 80, y: 54, shape: 'box' },
          { id: 'K', label: 'CDC stream', x: 36, y: 50, shape: 'box' }
        ];
        var edges = [['A', 'S0'], ['A', 'S1'], ['A', 'S2'], ['A', 'S3'], ['A', 'G', 'lookup'], ['S1', 'K'], ['K', 'G', 'update index']];
        function g(hl, ehl, tags) { return { type: 'graph', directed: true, height: 62, nodes: nodes, edges: edges, hl: hl, ehl: ehl, tags: tags || {} }; }
        return [
          { narr: 'Orders are sharded by <b>customer_id</b>. A seller asks: "all orders containing product <b>P42</b>". product_id is not the shard key.', parts: [g({ A: 'cur' }, {}), { type: 'table', label: 'Where P42 orders actually live', columns: ['order', 'customer', 'shard'], rows: [['o-18', 'c-7', 'S1'], ['o-93', 'c-12', 'S3']] }] },
          { narr: '<b>Option 1 — scatter-gather:</b> ask all 4 shards "WHERE product_id = P42". Two shards answer "nothing" — wasted work, and latency = slowest shard.', parts: [g({ S0: 'done', S1: 'ok', S2: 'done', S3: 'ok' }, { 'A-S0': 'bad', 'A-S1': 'ok', 'A-S2': 'bad', 'A-S3': 'ok' }, { S0: 'empty', S2: 'empty' }), { type: 'vars', label: 'Cost', vals: { shardQueries: 4, usefulShards: 2 }, hl: { shardQueries: 'bad' } }] },
          { narr: '<b>Option 2 — global secondary index (GSI):</b> a separate table <i>sharded by product_id</i>: P42 → [o-18@S1, o-93@S3]. One lookup tells us exactly where to go.', parts: [g({ G: 'sel' }, { 'A-G': 'sel' }, { G: 'P42 → S1, S3' }), { type: 'map', label: 'GSI row for P42', entries: [['o-18', 'S1'], ['o-93', 'S3']] }] },
          { narr: 'Then fetch only from S1 and S3 (or store the needed fields in the index itself so no second hop is needed — a <b>covering</b> index).', parts: [g({ S1: 'ok', S3: 'ok' }, { 'A-S1': 'ok', 'A-S3': 'ok' }), { type: 'vars', label: 'Cost', vals: { indexLookups: 1, shardQueries: 2 }, hl: { shardQueries: 'ok' } }] },
          { narr: 'How does the GSI stay up to date? A new order on S1 emits a change event (CDC); a consumer updates the GSI <b>asynchronously</b>. So the index can lag by ~100 ms–seconds (DynamoDB GSIs behave this way).', parts: [g({ S1: 'cur', K: 'cur', G: 'cur' }, { 'S1-K': 'cur', 'K-G': 'cur' }, { K: 'order o-120 added' })] },
          { narr: '<b>Trade-off:</b> GSI = extra storage + write amplification + eventual consistency, in exchange for single-shard reads. Updating it synchronously would need a cross-shard transaction on every write — usually not worth it.', parts: [{ type: 'table', label: 'Choose', columns: ['', 'Scatter-gather', 'Global index'], rows: [['read cost', 'N shards', '1 + few'], ['write cost', 'none extra', '+1 async write'], ['freshness', 'exact', 'lags slightly'], ['good when', 'rare query, few shards', 'frequent query, many shards']] }] }
        ];
      }
    }],
    examples: [
      { title: 'Tail-latency amplification, numbers', html: `<p>Each shard answers in 10 ms at p99 (so 1% of calls take ≥ 10 ms, say 200 ms when unlucky). Fan-out to 50 shards: probability that at least one is unlucky = 1 − 0.99<sup>50</sup> ≈ ${H.c('r', '39.5%')}. So the fan-out's <i>median</i> is close to a single shard's p99. Mitigations: hedged requests (send a backup request to a replica after the p95 time), timeouts with partial results, and fewer, larger fan-outs.</p>` },
      { title: 'Unique username across shards', html: `<p>Users are sharded by <code>user_id</code>, so two shards could each accept "priya". Fix: a separate <code>usernames</code> table sharded by <code>username</code> with a UNIQUE constraint. Signup: (1) insert into usernames (one shard; fails if taken), (2) create the user row. If step 2 fails, delete the reservation (compensate) or let a cleanup job release reservations without a user after 10 minutes.</p>` },
      { title: 'Saga for a cross-shard money transfer', html: `<p>A on shard 1 sends ₹500 to B on shard 3. ${H.table(['Step', 'Local transaction', 'Compensation if a later step fails'], [['1', 'Shard 1: debit A 500, write transfer T=PENDING', 'credit A 500, T=FAILED'], ['2', 'Shard 3: credit B 500 (idempotent on T)', '—'], ['3', 'Shard 1: T=COMPLETED', '—']])} Between steps the money is "in flight" — visible as PENDING, never lost. Each step is retried with the transfer id as an idempotency key. Use an outbox table so "debit + publish next step" is atomic.</p>` },
      { title: 'Co-location kills the join problem', html: `<p>Multi-tenant project tool: <code>projects</code>, <code>tasks</code>, <code>comments</code> all carry <code>tenant_id</code> and are sharded by it (Citus "distributed tables" with the same distribution column). A join of tasks and comments for one tenant runs entirely on one shard — normal SQL, normal transactions. Small global tables like <code>plans</code> are "reference tables" copied to every shard.</p>` },
      { title: 'Deep pagination across shards', html: `<p>"Page 100 of orders sorted by date, 20 per page" with OFFSET means each shard must return its first 2,000 rows so the router can find rows 1,981–2,000. Use <b>keyset (cursor) pagination</b> instead: "20 orders with date &lt; last_seen_date"; each shard returns at most 20, the router merges and returns a new cursor.</p>` }
    ],
    deepDive: `<p><b>Two-phase commit (2PC).</b> Phase 1: the coordinator asks every participant shard to <i>prepare</i> (write the changes durably, hold locks, vote yes/no). Phase 2: if all voted yes, it tells them to <i>commit</i>, else <i>abort</i>. It is atomic, but a participant that voted yes must wait — holding locks — if the coordinator crashes before phase 2 (the "in-doubt" problem). Postgres supports <code>PREPARE TRANSACTION</code>; MySQL has XA. Spanner and CockroachDB make the coordinator itself replicated via Paxos/Raft, removing the single point of failure but keeping the extra round trips.</p>
<p><b>Sagas</b> trade atomicity for availability: each step commits locally, and failures trigger compensating steps. You must design for intermediate states being visible (use explicit PENDING statuses), make every step idempotent, and accept that compensation is not always a perfect undo (an email already sent). Orchestrated sagas (a workflow engine like Temporal) are easier to reason about than choreographed ones (services reacting to each other's events).</p>
<p><b>Cross-shard consistency of reads.</b> A fan-out query hits each shard at a slightly different moment, so it is not a consistent snapshot of the whole dataset — a transfer in flight can be counted on neither side or both. Exact global snapshots need a database with globally ordered timestamps (Spanner's TrueTime, CockroachDB's HLC) or a pause/snapshot mechanism.</p>
<p><b>Aggregations push down.</b> For SUM/COUNT/MIN/MAX the router asks for partials and combines them. AVG must be computed as SUM/COUNT (averaging averages is wrong). COUNT DISTINCT needs either shipping all values or a sketch like HyperLogLog (mergeable, ~1% error). Percentiles need t-digest or similar mergeable sketches.</p>
<p><b>Query routers.</b> Vitess (VTGate), Citus, ShardingSphere, and MongoDB's mongos parse queries, route single-shard ones, and plan scatter-gather for the rest — including pushing LIMIT and partial aggregates down. They make cross-shard queries <i>possible</i>, not <i>cheap</i>.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI can classify a codebase's queries into "single-shard" vs "fan-out" given a shard key, flagging the ones that will hurt after sharding — a task that used to take a team weeks. It can also draft saga workflows with compensations and generate CDC consumers for global indexes.</p>
<p><b>Use AI as a partner:</b> "Here are 40 SQL queries and our proposed shard key tenant_id. For each: single-shard, fan-out, or needs a new index/denormalization? Estimate the fan-out QPS." Verify the classification by running the queries through your router's EXPLAIN.</p>
<p><b>AI-era fan-out:</b> RAG over a sharded vector store is scatter-gather top-K by similarity — every shard returns its nearest K, the router merges. The same tail-latency and "each shard must return K" lessons apply, plus re-ranking after the merge. Agentic systems that call many tools in parallel face the same slowest-dependency latency.</p>
<p><b>Where AI goes wrong:</b> it writes JOINs across tables that live on different shards as if they were local, suggests 2PC everywhere, or computes AVG by averaging per-shard averages. <b>What you must still own:</b> designing data placement so the important paths are single-shard, and choosing 2PC vs saga deliberately.</p>`,
    problems: [{
      title: 'Search orders by product when orders are sharded by user',
      level: 'Medium', tags: ['cross-shard', 'secondary-index', 'scatter-gather'], companies: ['Amazon', 'eBay', 'Etsy', 'Meesho'],
      statement: `<p>Orders are hash-sharded by <code>user_id</code> across 64 shards. A new feature lets sellers see "all orders of my product in the last 30 days", and support agents need "find the order with tracking number X". Design how these queries are served without overloading all shards.</p>`,
      constraints: `<p>2 B orders, 64 shards. Seller queries: 3,000/s at peak. Tracking-number lookups: 500/s. Results may be up to 10 s stale for sellers, but support lookups should find an order within 2 s of creation.</p>`,
      example: `<p>Naive scatter: 3,000 seller queries/s × 64 shards = ${H.c('r', '192,000 shard queries/s')}, most returning nothing. With a product-keyed index: 3,000 index reads/s + fetches only from shards that actually hold matching orders.</p>`,
      brute: { why: `<p><b>Naive design:</b> run <code>SELECT … WHERE product_id = ?</code> on all 64 shards for every request. Load multiplies by 64, latency equals the slowest shard, and adding shards makes it worse. Adding a local index on product_id on each shard makes each query cheaper but still hits every shard.</p>` },
      mcq: { q: 'What keeps "find order by tracking number" a single-shard read?', options: ['A local index on each shard', 'A global lookup table sharded by tracking_number → (order_id, shard)', 'Range partitioning by date', 'Synchronous replication'], answer: 1, explain: 'A global (term-partitioned) index is sharded by the tracking number itself, so one lookup finds where the order lives.' },
      hints: [`<p>Ask "what is this query keyed by?" — product_id and tracking_number. Each deserves data organised by <i>that</i> key.</p>`, `<p>Build two global secondary indexes (or read models) fed by CDC from the order shards: <code>(product_id, created_at) → order summary</code> and <code>tracking_number → (order_id, user_id)</code>.</p>`, `<p>Discuss freshness (async lag &lt; 2 s), backfill for existing orders, and hot products (a best-seller has millions of orders — partition the index by (product_id, day)).</p>`],
      solution: {
        approach: `<p><b>Seller view:</b> a read model <code>orders_by_product</code> sharded by <code>product_id</code> with clustering by <code>created_at DESC</code> (Cassandra-style, or a Postgres table sharded by product_id). Each row stores the fields the seller dashboard shows (order id, date, quantity, status) — a covering index, so no second hop. Maintained by a CDC pipeline (Debezium → Kafka → consumer) from the order shards; typical lag &lt; 1 s, within the 10 s budget. Hot products: partition key <code>(product_id, day)</code> so one best-seller spreads across 30 partitions for a 30-day query (a small bounded fan-out).</p>
<p><b>Tracking lookup:</b> a small key-value table <code>tracking_number → (order_id, user_id)</code> sharded by tracking number. Written by the same CDC consumer (lag &lt; 2 s); the service then reads the full order from the user's shard. For the "just created" edge case, the shipping service writes the tracking mapping directly when it generates the number.</p>
<p><b>Backfill:</b> scan each order shard in chunks to populate both indexes before enabling the feature; the CDC stream started earlier fills the gap (idempotent upserts).</p>
<p><b>Why not scatter-gather:</b> 192K shard queries/s for no benefit. Scatter-gather remains acceptable for rare admin queries, or move those to a warehouse/search index.</p>`,
        complexity: `<p>Seller query: 1 partition read per day bucket (≤ 30) on the index cluster. Tracking: 2 point reads. Extra writes: +2 index writes per order (async). Extra storage: index rows ≈ 100 B each × 2 B orders ≈ 200 GB per index.</p>`,
        followUps: ['How do you detect and repair index rows that drifted from the source of truth?', 'What if an order changes product (edit) — how does the index update?', 'When would Elasticsearch be a better read model than a key-value index?']
      }
    }]
  });

  /* =====================================================================
     PRACTICE — Easy
     ===================================================================== */
  practice.push({
    title: 'SQL or NoSQL for a library management system?',
    level: 'Easy', tags: ['sql-vs-nosql'], companies: ['TCS', 'Infosys', 'Accenture'],
    statement: `<p>A city library network (40 branches) needs a system for books, copies, members, loans, reservations and fines. Librarians run reports like "overdue loans by branch". Choose a database type and explain why.</p>`,
    constraints: `<p>2M books, 500K members, ~20K loans/day (≈ 1 write/s on average, 20/s peak). A copy can only be on loan to one member at a time.</p>`,
    example: `<p>"Lend copy C-881 to member M-12" must check ${H.c('b', 'the copy is available')}, create a loan, and mark the copy as on loan — ${H.c('g', 'all or nothing')}. Two librarians must not lend the same copy at the same moment.</p>`,
    brute: { why: `<p><b>Naive choice:</b> "MongoDB because NoSQL is modern and scalable." The data is highly relational (books ↔ copies ↔ loans ↔ members), the scale is tiny, and the "one loan per copy" rule needs transactions or careful conditional updates. You would rebuild joins and constraints in application code for no benefit.</p>` },
    mcq: { q: 'What is the strongest reason to choose SQL here?', options: ['It is cheaper per GB', 'Relational data with integrity rules and ad-hoc reports, at small scale', 'It has better full-text search', 'NoSQL cannot store books'], answer: 1, explain: 'Foreign keys, UNIQUE constraints (one active loan per copy), transactions and ad-hoc SQL reporting fit perfectly, and the load fits easily on one machine.' },
    hints: [`<p>Estimate the load first — is there any scale problem at all? (20 writes/s is nothing.)</p>`, `<p>List the integrity rules: a copy belongs to one book; a copy has at most one active loan; fines reference loans. Which database enforces these for you?</p>`, `<p>Recipe: PostgreSQL with tables book, copy, member, loan, reservation; a partial unique index on loan(copy_id) WHERE returned_at IS NULL; one replica for reports and failover.</p>`],
    solution: {
      approach: `<p><b>Choose a relational database (PostgreSQL).</b> The domain is a textbook relational model: <code>book(id, isbn, title)</code>, <code>copy(id, book_id, branch_id)</code>, <code>member(id, …)</code>, <code>loan(id, copy_id, member_id, due_at, returned_at)</code>, <code>reservation</code>, <code>fine</code>.</p>
<p><b>Integrity in the database:</b> foreign keys keep references valid; a partial unique index <code>UNIQUE (copy_id) WHERE returned_at IS NULL</code> guarantees one active loan per copy even if two librarians click at once — the second insert fails. Lending is one transaction: insert loan + update copy status.</p>
<p><b>Reports:</b> "overdue loans by branch" is a simple JOIN + GROUP BY; run heavy reports on a read replica. <b>Scale:</b> 20 writes/s and a few GB of data — one primary + one standby is plenty for decades. Add full-text search for titles with Postgres <code>tsvector</code> before reaching for Elasticsearch.</p>`,
      complexity: `<p>~20 writes/s peak, data &lt; 10 GB; single primary with a standby. Lend/return: O(log n) index operations.</p>`,
      followUps: ['How would you add "search books by any word in the title"?', 'What changes if 500 libraries nationwide share one system?']
    }
  });

  practice.push({
    title: 'How many read replicas do we need?',
    level: 'Easy', tags: ['read-replicas', 'estimation'], companies: ['Amazon', 'Microsoft', 'Uber'],
    statement: `<p>A recipe website's Postgres primary is at 85% CPU. Traffic: 24,000 reads/s and 800 writes/s at peak. Benchmarks show one database node of this size can handle about 9,000 queries/s at 70% CPU. How many read replicas do you add, and what else would you do first?</p>`,
    constraints: `<p>Replication lag of up to 2 s is acceptable for recipe pages. Each replica also replays all writes. Keep one spare for failures.</p>`,
    example: `<p>Usable read capacity per replica ≈ 9,000 − 800 (replaying writes) = ${H.c('b', '8,200 reads/s')}. 24,000 ÷ 8,200 = 2.9 → ${H.c('g', '3 replicas + 1 spare = 4')}.</p>`,
    brute: { why: `<p><b>Naive answer:</b> "Buy a bigger primary" (works once, then you hit the biggest machine and still have a single point of failure) or "add 10 replicas to be safe" (wastes money; every replica also replays writes and adds replication load on the primary). Neither starts from arithmetic.</p>` },
    mcq: { q: 'Why subtract the write rate from each replica\'s capacity?', options: ['Replicas reject writes', 'Every replica must replay every write the leader takes', 'Writes are slower on replicas', 'It is a safety margin only'], answer: 1, explain: 'Replication copies all writes to every replica, so each replica spends some capacity replaying them before serving reads.' },
    hints: [`<p>Per-replica read capacity = node capacity at target utilisation − write replay cost.</p>`, `<p>replicas = ⌈ reads ÷ per-replica read capacity ⌉ + spare.</p>`, `<p>Before adding replicas, check whether a cache would remove most reads: recipe pages are very cacheable (CDN or Redis), maybe 90%+ hit rate.</p>`],
    solution: {
      approach: `<p><b>Arithmetic:</b> each replica at 70% CPU ≈ 9,000 q/s, minus ~800/s replaying writes ≈ 8,200 reads/s. 24,000 ÷ 8,200 = 2.93 → <b>3 replicas</b>, plus <b>1 spare</b> so losing one replica (or promoting one during failover) does not overload the rest → <b>4 replicas</b>. The primary then handles only 800 writes/s plus a few fresh reads — CPU drops from 85% to ~10–15%.</p>
<p><b>Better first step:</b> recipe pages are read-mostly and identical for everyone. Put a CDN in front of rendered pages and Redis in front of hot queries; at a 90% hit rate only 2,400 reads/s reach the database → <b>1 replica + 1 spare</b>. Route reads with a proxy (PgBouncer + HAProxy, or the cloud reader endpoint); remove replicas whose lag exceeds 2 s; keep "my saved recipes" reads after a save on the primary (read-your-writes).</p>`,
      complexity: `<p>4 replicas × node cost without cache; ~2 with cache. Read latency unchanged; staleness ≤ 2 s.</p>`,
      followUps: ['Writes grow to 8,000/s — do replicas still help?', 'How would you load-balance across replicas of different sizes?']
    }
  });

  practice.push({
    title: 'Range or hash partitioning for an event log queried by time?',
    level: 'Easy', tags: ['partitioning', 'range', 'time-series'], companies: ['Datadog', 'Splunk', 'Cloudflare'],
    statement: `<p>An app stores audit events (<code>tenant_id, event_time, actor, action</code>). The main queries are "events for tenant T between t1 and t2" and "delete events older than 1 year". Choose a partitioning strategy for a single Postgres database first, then for a sharded future.</p>`,
    constraints: `<p>50M events/day, 1-year retention (~18 B rows). 5,000 tenants, the largest is 5% of events.</p>`,
    example: `<p>Monthly ${H.c('b', 'range partitions on event_time')}: deleting last year's January = ${H.c('g', 'DROP TABLE events_2025_01')} (instant) instead of ${H.c('r', 'DELETE … 1.5 B rows')} (hours, bloat, replication lag).</p>`,
    brute: { why: `<p><b>Naive design:</b> one giant unpartitioned table with an index on <code>event_time</code>. Retention deletes are huge, slow and generate massive WAL; indexes grow without bound; vacuum struggles. Or hash-partition by event id: inserts spread, but time-range queries and retention touch every partition.</p>` },
    mcq: { q: 'Which pattern serves both "tenant + time range" queries and spreads writes when sharded?', options: ['Hash by event_id only', 'Range by event_time only', 'Shard by hash(tenant_id), range-partition by event_time inside each shard', 'List by action type'], answer: 2, explain: 'Hashing tenants spreads load across shards; range by time inside a shard keeps scans and retention cheap.' },
    hints: [`<p>Single box: time-range partitions give pruning and cheap retention. Which partition gets all new writes? Is that a problem on one machine?</p>`, `<p>Sharded: pure time-range shards make the newest shard hot. Combine a hash on tenant (across shards) with time ranges (within a shard).</p>`, `<p>Watch out for the 5% tenant — is it hot enough to need its own shard or sub-partitioning?</p>`],
    solution: {
      approach: `<p><b>Now (one Postgres):</b> <code>PARTITION BY RANGE (event_time)</code> with monthly (or daily) partitions, index <code>(tenant_id, event_time)</code> on each. Tenant + time queries prune to the relevant months; retention is <code>DROP</code>/<code>DETACH</code> of old partitions. All inserts hit the current partition — fine on one machine (it is the same disk anyway), and it keeps the hot index pages in RAM.</p>
<p><b>Later (sharded):</b> shard by <code>hash(tenant_id)</code> into fixed logical partitions so each tenant's events are on one shard (single-shard queries) and writes spread across shards; keep monthly range partitions inside each shard for retention. Avoid range-sharding <i>across machines</i> by time — that would put 100% of writes on the newest shard. The 5% tenant is ~2.5M events/day — fine on one shard, but give it a directory override to a dedicated shard if it grows. Alternative: a time-series store (TimescaleDB hypertables, ClickHouse) that does exactly this automatically.</p>`,
      complexity: `<p>Query: prunes to ~1–2 partitions per month range. Retention: O(1) metadata operation per dropped partition. Writes: ~580/s average.</p>`,
      followUps: ['Daily vs monthly partitions — how do you choose?', 'How do you query across all tenants for a security investigation?']
    }
  });

  practice.push({
    title: 'Keep EU users\' data in the EU',
    level: 'Easy', tags: ['list-partitioning', 'data-residency'], companies: ['SAP', 'Spotify', 'Booking.com'],
    statement: `<p>A global note-taking app must store EU users' data only in EU data centres and Indian users' data in India, while other users can live in the US. Design the partitioning and routing.</p>`,
    constraints: `<p>30M users: 40% US/other, 35% EU, 25% India. Users rarely move country. Each region must survive a single data-centre failure.</p>`,
    example: `<p>User from ${H.c('b', 'FR')} → list partition ${H.c('g', 'EU')} (Frankfurt). User from ${H.c('b', 'IN')} → ${H.c('g', 'IN')} (Mumbai). User from ${H.c('b', 'KE')} → default ${H.c('g', 'US')}.</p>`,
    brute: { why: `<p><b>Naive design:</b> one global cluster hash-sharded by user_id. Hashing puts EU users' data on random shards in the US — a compliance violation. Alternatively, three totally separate apps per region, which duplicates code, deployments and makes cross-region features (sharing a note with a US user) very awkward.</p>` },
    mcq: { q: 'Which partitioning strategy expresses "country → region" directly?', options: ['Hash', 'Range', 'List', 'Round robin'], answer: 2, explain: 'List partitioning maps explicit values (country codes) to partitions; it is how data-residency rules are encoded.' },
    hints: [`<p>The top level must be a <b>list</b> partition: region chosen from the user's country of residence at signup.</p>`, `<p>Within each region, hash-shard by user_id for scale; each region has its own replicas across zones.</p>`, `<p>A global, minimal directory maps user_id/email → home region so login can route correctly; it must not contain personal content.</p>`],
    solution: {
      approach: `<p><b>Level 1 — list partition by region:</b> at signup the country determines the home region (EU, IN, US-default). A small <b>global directory</b> stores <code>user_id → region</code> (and a hashed email → region for login), containing no note content, replicated globally.</p>
<p><b>Level 2 — hash shards within each region:</b> each region runs its own sharded database (e.g. 8 shards by <code>hash(user_id)</code>), with a synchronous replica in another zone of the same region and backups stored in-region. Regions differ in size (EU 10.5M users, IN 7.5M, US 12M) — the per-region shard count handles that.</p>
<p><b>Routing:</b> the API gateway resolves the user's region from the token (region embedded in the user id or session) and forwards the request to that region's stack. <b>Cross-region features:</b> sharing a note with a US user means the US user's client reads it <i>from the EU</i> (no copy stored in the US). <b>Region change:</b> a controlled migration job copies the user's data and flips the directory entry.</p>`,
      complexity: `<p>One directory lookup (cached) per login; all other operations are single-region, single-shard. Storage triples only for the directory, not for content.</p>`,
      followUps: ['What about analytics across all regions?', 'How do you handle a user who travels and logs in from another continent?']
    }
  });

  /* =====================================================================
     PRACTICE — Medium
     ===================================================================== */
  practice.push({
    title: 'Pick a database and shard key for a chat app',
    level: 'Medium', tags: ['shard-key', 'wide-column', 'chat'], companies: ['Meta (WhatsApp)', 'Discord', 'Slack', 'Telegram'],
    statement: `<p>Design message storage for a chat app with 1:1 and group chats. Users scroll back through history page by page. Choose the database and the partition/shard key.</p>`,
    constraints: `<p>500M daily users, 60B messages/day (~700K writes/s average, 2M peak). Reads: "latest 50 messages of conversation C", then older pages. Groups up to 1,000 members. Messages kept forever.</p>`,
    example: `<p>Key ${H.c('g', '(conversation_id) + clustering message_id DESC')}: one partition read returns the latest 50 messages in order. Key ${H.c('r', 'user_id')}: a group message would have to be written to 1,000 users\' partitions, or read from many partitions.</p>`,
    brute: { why: `<p><b>Naive design:</b> one MySQL table <code>messages(id, conversation_id, …)</code> with an auto-increment id. 2M writes/s is far beyond one primary; sharding by message id scatters a conversation across all shards, so loading history becomes a fan-out on every scroll.</p>` },
    mcq: { q: 'What problem appears with partition key = conversation_id for a 10-year-old busy group?', options: ['Messages are unordered', 'The partition grows without bound (very large partition)', 'Writes need 2PC', 'Reads become scatter-gather'], answer: 1, explain: 'Wide-column stores want partitions bounded (e.g. under ~100 MB); add a time bucket: (conversation_id, bucket).' },
    hints: [`<p>Access pattern: always "conversation X, newest first". Write volume: huge, append-only. Which family of databases fits?</p>`, `<p>Wide-column (Cassandra/ScyllaDB): partition key = conversation, clustering key = time-sortable message id (Snowflake/ULID) descending.</p>`, `<p>Bound partition size with a bucket: (conversation_id, bucket) where bucket = time window sized so busy groups stay under ~100 MB per partition.</p>`],
    solution: {
      approach: `<p><b>Database:</b> a wide-column LSM store — Cassandra or ScyllaDB (Discord publicly moved from Cassandra to ScyllaDB for this workload). Append-only writes are cheap, it scales horizontally by adding nodes, and replication factor 3 with <code>LOCAL_QUORUM</code> gives durability per region.</p>
<p><b>Schema:</b> <code>messages(conversation_id, bucket, message_id, sender_id, body, …) PRIMARY KEY ((conversation_id, bucket), message_id) WITH CLUSTERING ORDER BY (message_id DESC)</code>. <code>message_id</code> is a Snowflake-style time-ordered 64-bit id. <code>bucket</code> = 10-day window (tuned so a very busy group's partition stays &lt; ~100 MB).</p>
<p><b>Reads:</b> latest page = one partition read with <code>LIMIT 50</code>; older pages use the last message_id as a cursor and step into earlier buckets when exhausted. <b>Writes:</b> one row per message (not per recipient) — groups do not multiply storage. Per-user "inbox" (list of conversations with last message) is a separate table keyed by user_id. <b>Hot keys:</b> a 1,000-member group spamming is still one partition, but 1,000 members × modest message rate is fine; huge broadcast channels get special handling (rate limits, read caching).</p>`,
      complexity: `<p>2M writes/s ÷ ~50K writes/s per node ≈ 40 nodes per replica set → ~120 nodes at RF=3 (plus headroom). Each read: 1 partition, O(log n) SSTable lookups with Bloom filters.</p>`,
      followUps: ['How do you implement "search my messages for a word"?', 'How do you delete a message for everyone?', 'Where do unread counts live?']
    }
  });

  practice.push({
    title: 'Multi-tenant SaaS: shard by tenant, but one tenant is huge',
    level: 'Medium', tags: ['shard-key', 'hot-tenant', 'directory'], companies: ['Salesforce', 'Atlassian', 'Zoho', 'HubSpot'],
    statement: `<p>A B2B CRM shards all tables by <code>tenant_id</code> (hash). 20,000 tenants are tiny, but one enterprise customer now generates 30% of all traffic and 25% of the data, making its shard the bottleneck for every other tenant on it. Redesign.</p>`,
    constraints: `<p>32 shards. Tenants expect strong consistency inside their own data and cross-table joins (accounts, contacts, deals). The big tenant has 400M rows and is still growing 50% per year.</p>`,
    example: `<p>Shard 11 holds the enterprise tenant + 600 small tenants: CPU ${H.c('r', '92%')}, others ${H.c('g', '30%')}. Small tenants on shard 11 see 5× slower pages — the "noisy neighbour" effect.</p>`,
    brute: { why: `<p><b>Naive design:</b> add more hash shards — the big tenant still maps to exactly one shard. Or re-shard everything by <code>record_id</code> — the big tenant spreads out, but every tenant's joins and transactions become cross-shard.</p>` },
    mcq: { q: 'What is the least disruptive first move?', options: ['Re-shard all tables by record id', 'Move the big tenant to a dedicated shard using a directory override', 'Switch to a graph database', 'Add read replicas to all shards'], answer: 1, explain: 'A directory (tenant → shard) lets you relocate one tenant with the online-migration playbook; small tenants immediately get their shard back.' },
    hints: [`<p>Keep tenant_id as the shard key for everyone (joins stay local). Change the <i>placement</i> of the one big tenant.</p>`, `<p>Directory-based routing: tenant → shard map with an override for the enterprise tenant; move it with backfill + CDC + cutover.</p>`, `<p>For future growth beyond one machine, the big tenant needs a second-level key (e.g. hash(account_id) within the tenant) — design it now, use it later.</p>`],
    solution: {
      approach: `<p><b>1. Directory routing:</b> introduce a <code>tenant_id → shard</code> directory (cached in every router; default entry = hash placement, overrides for special tenants). <b>2. Isolate:</b> provision a dedicated, larger cluster for the enterprise tenant and move it using the online playbook (snapshot, CDC catch-up, verify, short per-tenant write fence, flip the directory, soak). Shard 11's 600 small tenants recover immediately.</p>
<p><b>3. Plan for the tenant outgrowing one machine:</b> within this tenant, add a second-level shard key such as <code>hash(account_id)</code> — accounts, their contacts and deals are co-located, so most joins stay single-shard; tenant-wide reports go to the warehouse. <b>4. Guardrails for everyone:</b> per-tenant rate limits and query timeouts (bulkheads), per-tenant metrics to spot the next whale early, and a tiering policy ("enterprise tenants above X get dedicated shards") that is also a sales feature (isolation, custom backup schedules, data residency).</p>`,
      complexity: `<p>Moving ~25% of data once; afterwards shard 11 drops to ~30% CPU. Directory lookup is an in-memory map: O(1).</p>`,
      followUps: ['How do you run a cross-tenant admin report?', 'What if the enterprise tenant demands its own region?']
    }
  });

  practice.push({
    title: 'Global leaderboard on a sharded game database',
    level: 'Medium', tags: ['cross-shard', 'top-k', 'redis'], companies: ['Riot Games', 'Supercell', 'Activision', 'Zynga'],
    statement: `<p>Player profiles and scores are sharded by <code>player_id</code> across 32 shards. The game needs (a) the global top 100, (b) a player's own global rank, refreshed in near real time.</p>`,
    constraints: `<p>80M players, 50K score updates/s at peak, 20K leaderboard reads/s. Top 100 may be up to 5 s stale; "my rank" up to 30 s stale.</p>`,
    example: `<p>Fan-out per read: 20K reads/s × 32 shards = ${H.c('r', '640K shard queries/s')}. A Redis sorted set: ${H.c('g', 'ZREVRANGE lb 0 99')} is one O(log N + 100) call.</p>`,
    brute: { why: `<p><b>Naive design:</b> every leaderboard read does a scatter-gather (each shard returns its top 100, router merges). It is correct but multiplies load by 32 and its latency is the slowest shard. "My rank" is even worse: each shard must count players with a higher score — a COUNT over millions of rows on every shard.</p>` },
    mcq: { q: 'Why must each shard return its own top 100 (not top 100/32) during scatter-gather?', options: ['To reduce network', 'All 100 winners might live on the same shard', 'For sorting stability', 'It is not necessary'], answer: 1, explain: 'Data is sharded by player, not by score, so in the worst case every winner is on one shard.' },
    hints: [`<p>Leaderboards are a <i>derived view</i> sorted by score — a different key than the shard key. Build a separate structure keyed for that query.</p>`, `<p>Redis sorted set (skip list): ZADD on each score change, ZREVRANGE for top 100, ZREVRANK for a player's rank — both O(log N).</p>`, `<p>80M members is ~8–10 GB in one sorted set; shard by score range if needed, or keep exact top-N plus approximate rank via score histograms.</p>`],
    solution: {
      approach: `<p><b>Source of truth:</b> scores stay in the player shards. Each update emits a change event (CDC or an outbox → Kafka).</p>
<p><b>Leaderboard service:</b> consumers apply events to a <b>Redis sorted set</b> <code>ZADD lb score player_id</code>. Top 100: <code>ZREVRANGE lb 0 99 WITHSCORES</code>, cached for 1–2 s and served to all 20K reads/s from the cache (so Redis sees a few hundred reads/s). My rank: <code>ZREVRANK lb player_id</code> (O(log N)).</p>
<p><b>Scale:</b> 50K ZADDs/s is fine for one Redis primary (~100K+ ops/s); 80M entries ≈ 8–10 GB RAM. Replicate Redis for failover; rebuild from the database if lost. If it outgrows one node, partition the set by score bands (band 0 = top scores) so the top-100 query hits one band, and rank = sum of band sizes above + rank within band. Alternatively keep exact ranks only for the top 1M and show "top 12%" for everyone else using a score histogram.</p>
<p><b>Fallback:</b> scatter-gather remains for rare admin queries (e.g. per-region custom boards) with per-shard LIMIT and timeouts.</p>`,
      complexity: `<p>Updates O(log N) each; top-100 O(log N + 100); rank O(log N). Memory ≈ 100 B × 80M ≈ 8 GB.</p>`,
      followUps: ['Weekly leaderboards that reset — how?', 'How do you handle ties consistently?', 'Friends-only leaderboard?']
    }
  });

  practice.push({
    title: 'Unique usernames and emails in a sharded user table',
    level: 'Medium', tags: ['cross-shard', 'uniqueness'], companies: ['Google', 'Meta', 'Reddit'],
    statement: `<p>Users are sharded by <code>user_id</code>. Usernames and emails must be globally unique, and users can change their username. Design signup and rename so two people can never get the same name, even when they try at the same millisecond.</p>`,
    constraints: `<p>2B users, 3,000 signups/s at peak, 200 renames/s. Lookups by username (profile URLs) at 100K/s.</p>`,
    example: `<p>Alice (shard 3) and Bob (shard 9) both pick ${H.c('y', '"sunny"')} at the same time. Each shard's local UNIQUE index sees no conflict → ${H.c('r', 'two users named sunny')}.</p>`,
    brute: { why: `<p><b>Naive design:</b> "check if the name exists (scatter-gather), then insert". The check and the insert are not atomic across shards — two concurrent signups both pass the check. Plus every signup becomes a 64-shard fan-out.</p>` },
    mcq: { q: 'How do you enforce uniqueness of usernames across user shards?', options: ['Local unique index on each shard', 'A separate table sharded by username with a UNIQUE constraint used as a reservation', 'A daily dedupe job', 'Lowercase the names'], answer: 1, explain: 'Sharding the uniqueness table by the unique value itself puts all claims for one name on one shard, where a normal UNIQUE constraint decides.' },
    hints: [`<p>Uniqueness can only be checked where all candidates for the same value meet. Shard a table by the <i>username</i>.</p>`, `<p>Signup = reserve name (insert into usernames, fails if taken) → create user → confirm reservation. Failures are compensated (saga), not 2PC.</p>`, `<p>Rename = reserve new name, update user row, release old name after a grace period (so old links can redirect and the name is not immediately stolen).</p>`],
    solution: {
      approach: `<p><b>Uniqueness tables:</b> <code>usernames(name_normalized PK, user_id, status, created_at)</code> sharded by <code>hash(name_normalized)</code>; same for <code>emails</code>. A primary-key insert on one shard is an atomic "claim": the second concurrent claim fails.</p>
<p><b>Signup saga:</b> (1) insert username row with status=RESERVED, (2) insert email row, (3) create the user row on its user shard, (4) mark both reservations ACTIVE. If any step fails, delete the reservations created so far; a sweeper releases RESERVED rows older than 15 minutes (crashed flows). All steps idempotent via a signup request id.</p>
<p><b>Rename:</b> reserve the new name → update the user row → mark the old name RELEASING with a 30-day hold (old profile URLs redirect) → free it. <b>Lookups by username</b> (100K/s): the usernames table doubles as a global index <code>name → user_id</code>, cached heavily. Normalization (lowercase, Unicode NFKC, confusable characters) happens before hashing so "Sunny" and "sunny" collide as intended.</p>`,
      complexity: `<p>Signup: 3–4 single-shard writes. Lookup: 1 cached read + 1 user-shard read. Storage: ~50 B × 2B × 2 tables ≈ 200 GB.</p>`,
      followUps: ['Why not use 2PC for signup?', 'How do you stop attackers from reserving millions of names?']
    }
  });

  practice.push({
    title: 'Comments appear and disappear: monotonic reads with replicas',
    level: 'Medium', tags: ['read-replicas', 'consistency'], companies: ['Reddit', 'Quora', 'Stack Overflow'],
    statement: `<p>A discussion site reads comments from 6 async replicas behind a round-robin load balancer. Users report that a new comment shows up, vanishes on refresh, then shows up again. Some even see replies before the comment they reply to. Explain both bugs and fix them.</p>`,
    constraints: `<p>Lag differs per replica: 20 ms to 3 s. Comment threads can be large (thousands of comments). Reads 50K/s, writes 500/s.</p>`,
    example: `<p>Refresh 1 → replica A (lag 20 ms): ${H.c('g', '12 comments')}. Refresh 2 → replica D (lag 3 s): ${H.c('r', '11 comments')}. Time appears to go backwards for this user.</p>`,
    brute: { why: `<p><b>Naive fix:</b> send all comment reads to the leader — consistent, but 50K reads/s overload it. Or make replication synchronous — all writes slow down and one slow replica stalls the site, all to fix a perception problem.</p>` },
    mcq: { q: 'Which guarantee is broken when a comment appears and then disappears for the same user?', options: ['Read-your-writes', 'Monotonic reads', 'Linearizability of writes', 'Durability'], answer: 1, explain: 'Monotonic reads means once you have seen a state, you never later see an older one; hopping between replicas with different lag breaks it.' },
    hints: [`<p>Bug 1 is about one user hopping between replicas with different lag. How can one user always see a non-decreasing state?</p>`, `<p>Pin each user/session to one replica (hash user id), or track the highest LSN the user has seen and only use replicas at least that fresh.</p>`, `<p>Bug 2 (reply before parent) is consistent prefix. Fetch a thread from one replica in one snapshot query, and hide replies whose parent is not present yet.</p>`],
    solution: {
      approach: `<p><b>Bug 1 — monotonic reads:</b> consecutive reads land on replicas with different lag. Fix: <b>sticky routing</b> — choose replica = <code>hash(session_id) mod 6</code> (consistent hashing so removing a replica moves only its users). Stronger: store <code>maxSeenLSN</code> in the session; the router only uses replicas whose replayed LSN ≥ that value. Remove replicas lagging &gt; 2 s from the pool.</p>
<p><b>Bug 2 — consistent prefix:</b> the page assembled a thread from several queries hitting different replicas (or a reply was cached from a fresher read). Fix: read a whole thread in one query/transaction on one replica (a single snapshot always respects commit order), and on the client hide orphan replies until their parent arrives. If comments live on different shards, keep a thread on one shard (shard by post_id).</p>
<p><b>Read-your-writes too:</b> after a user posts, serve their next reads with the LSN token (or from the leader for a few seconds) so their own comment never disappears.</p>`,
      complexity: `<p>No extra DB load; router keeps per-replica LSN (polled) and one integer per session.</p>`,
      followUps: ['What happens to sticky users when their replica fails?', 'How does a CDN cache in front change these guarantees?']
    }
  });

  /* =====================================================================
     PRACTICE — Hard
     ===================================================================== */
  practice.push({
    title: 'Cross-shard money transfer between wallets',
    level: 'Hard', tags: ['cross-shard', 'saga', '2pc', 'idempotency'], companies: ['Paytm', 'PhonePe', 'Revolut', 'Stripe'],
    statement: `<p>A wallet app shards balances by <code>user_id</code> across 64 Postgres shards. Users send money to each other; sender and receiver are usually on different shards. Design transfers so money is never created or lost, even when servers crash mid-transfer or clients retry.</p>`,
    constraints: `<p>15,000 transfers/s peak. P99 under 300 ms for the sender's confirmation. Balances never negative. Auditors must be able to reconstruct every balance.</p>`,
    example: `<p>A (shard 4) sends ₹300 to B (shard 51). If the debit commits and the server crashes before the credit, ${H.c('r', '₹300 disappears')}. If the client retries a timed-out request blindly, ${H.c('r', 'A is debited twice')}.</p>`,
    brute: { why: `<p><b>Naive design:</b> two independent UPDATEs from the app (debit then credit) — a crash between them loses money; retries double-charge. <b>Over-engineered:</b> 2PC across shards for every transfer — atomic, but locks are held across network round trips, and a coordinator crash leaves both rows locked "in doubt", stalling those users.</p>` },
    mcq: { q: 'What makes it safe for clients to retry a transfer request?', options: ['Shorter timeouts', 'An idempotency key stored with a UNIQUE constraint and the transfer record', 'Synchronous replication', 'Bigger shards'], answer: 1, explain: 'The server stores the client-supplied key; a retry with the same key returns the original result instead of creating a second transfer.' },
    hints: [`<p>Model the transfer as a record with states (PENDING → DEBITED → COMPLETED / FAILED) and make every step a <b>local</b> transaction on one shard.</p>`, `<p>Use the transactional outbox: the sender-shard transaction debits A, inserts the transfer row and an outbox event atomically; a relay delivers the credit step to B's shard, which applies it idempotently (unique transfer_id).</p>`, `<p>Ledger thinking: store immutable entries (debit/credit lines) rather than only balances; a reconciliation job checks that for every transfer the debits equal the credits, and alerts on PENDING older than N minutes.</p>`],
    solution: {
      approach: `<p><b>API:</b> <code>POST /transfers</code> with an <code>Idempotency-Key</code>. The sender's shard has <code>transfers(id, idem_key UNIQUE, from, to, amount, state)</code>.</p>
<p><b>Step 1 (sender shard, one local transaction):</b> check idempotency key; <code>UPDATE balances SET bal = bal - 300 WHERE user=A AND bal &gt;= 300</code> (fails if insufficient); insert ledger entry (debit); insert transfer (state=DEBITED); insert outbox event "credit B 300 for transfer T". Commit → respond "processing/sent" to the sender (fast: one shard).</p>
<p><b>Step 2 (receiver shard):</b> an outbox relay (or CDC → Kafka) delivers the event; the consumer runs one local transaction: insert into <code>applied_transfers(transfer_id PK)</code> (dedupe), credit B, insert ledger entry (credit). Duplicate deliveries hit the PK and are ignored.</p>
<p><b>Step 3:</b> an acknowledgement event marks T COMPLETED on the sender shard. If the credit is permanently impossible (receiver account closed), a compensating credit back to A sets FAILED.</p>
<p><b>Safety:</b> money in flight is visible as DEBITED transfers — never lost. A reconciliation job sums ledger entries per transfer (debit = credit) and alerts on transfers stuck &gt; 5 minutes. <b>Why not 2PC:</b> at 15K/s, holding locks across shards and the in-doubt problem cost more than eventual completion within ~1 s. (If the product requires both balances updated atomically and visible together, use a distributed SQL database that runs 2PC over Raft.)</p>`,
      complexity: `<p>Sender latency: 1 local transaction (~5–20 ms) + network. Two local transactions per transfer, ~4 writes each; 15K transfers/s × 2 local transactions ÷ 64 shards ≈ 470 local transactions/s per shard.</p>`,
      followUps: ['How do you prevent a user from spending money that is still "in flight" to them?', 'How do you rebuild a balance from the ledger after corruption?', 'What changes for a transfer in two different currencies?']
    }
  });

  practice.push({
    title: 'Hot key: a flash sale on one product',
    level: 'Hard', tags: ['hot-key', 'inventory', 'queue'], companies: ['Amazon', 'Flipkart', 'Alibaba', 'Ticketmaster'],
    statement: `<p>A phone launch: 50,000 units, 3 million users hit "Buy" within 2 minutes. Inventory is a row in the product's shard. Design the purchase path so you never oversell, the product's shard does not melt, and other products keep working.</p>`,
    constraints: `<p>Peak 200K buy attempts/s for this one SKU. A single row update with locking manages ~2–5K/s. Payment takes 2–10 s and can fail; unpaid holds expire after 10 minutes.</p>`,
    example: `<p>Naive: ${H.c('r', '200K/s UPDATE stock = stock - 1 WHERE sku=X AND stock &gt; 0')} on one row → lock queue explodes, timeouts, the whole shard (and every product on it) slows down.</p>`,
    brute: { why: `<p><b>Naive design:</b> every click runs a transaction decrementing the single stock row. Correct (no oversell) but limited to a few thousand per second; the lock queue makes p99 latency explode and starves other products on the shard. "Cache the stock in Redis and decrement there" without care can oversell on failover or double-decrement on retries.</p>` },
    mcq: { q: 'Which technique raises the write throughput of one stock counter most directly?', options: ['Read replicas', 'Split stock into N buckets (salted sub-keys) and decrement a random non-empty bucket', 'Synchronous replication', 'A bigger cache TTL'], answer: 1, explain: 'Splitting the counter turns one hot row into N independent rows, multiplying the possible decrement throughput by about N.' },
    hints: [`<p>Most of the 3M users will not get a phone. Reject or queue them <b>before</b> they reach the database (admission control / virtual waiting room).</p>`, `<p>Split 50,000 units into e.g. 100 buckets of 500 (salted keys), possibly in Redis with atomic Lua scripts, so decrements run in parallel; the database records the resulting order holds.</p>`, `<p>Holds with expiry: a successful decrement creates a reservation (TTL 10 min); payment confirms it; expiry returns the unit to a bucket. Isolate the SKU on its own shard/Redis so other products are unaffected.</p>`],
    solution: {
      approach: `<p><b>1. Admission control:</b> a virtual waiting room (queue tokens at the edge/CDN) admits buyers at a controlled rate, e.g. 20K/s. Once stock is gone, the edge serves "sold out" from cache — the database never sees the rest.</p>
<p><b>2. Split inventory:</b> pre-load 50,000 units into 100 Redis keys <code>stock:X#0..99</code> (500 each) on a dedicated Redis cluster for this launch. A buy attempt runs an atomic Lua script on a random bucket: if &gt; 0, decrement and add a hold <code>hold:{order}</code> with TTL 10 min; if empty, try a few other buckets, then report sold out. 100 buckets × ~50K ops/s each is far more than needed.</p>
<p><b>3. Durable record:</b> each successful hold is written as an order row (status=HELD) in the orders database, sharded by user — spread evenly, not hot. Idempotency key per user+SKU prevents double holds.</p>
<p><b>4. Payment:</b> success → order PAID; failure or expiry → a job increments a bucket back and marks the order EXPIRED. <b>5. Correctness:</b> a reconciler checks Σ(bucket values) + HELD + PAID = 50,000; Redis uses AOF + replicas, and on failover the reconciler rebuilds buckets from the orders table (the source of truth) before reopening sales.</p>
<p><b>Isolation:</b> the SKU's traffic never touches the normal product shard, so other products are unaffected.</p>`,
      complexity: `<p>Admitted 20K/s → Redis O(1) ops spread over 100 keys; DB writes ≤ 50K order rows total over a few minutes (~400/s). Reconciliation O(buckets + orders).</p>`,
      followUps: ['How do you stop bots from taking all the stock?', 'How would you allow max 1 phone per user across retries and devices?', 'What if Redis fails mid-sale?']
    }
  });

  practice.push({
    title: 'Reshard a 40 TB MySQL fleet from 8 to 32 shards',
    level: 'Hard', tags: ['resharding', 'migration', 'vitess'], companies: ['Shopify', 'GitHub', 'Slack', 'Square'],
    statement: `<p>An app runs 8 MySQL shards (5 TB each) using <code>hash(shop_id) mod 8</code>. Shards are near their storage and IOPS limits. Plan a move to 32 shards with no downtime, plus the router and tooling changes so future moves are routine.</p>`,
    constraints: `<p>40 TB total, 120K QPS (25% writes). Max write pause per shop: 5 s. Must support rollback. Copy throughput cannot exceed 30% of shard IOPS.</p>`,
    example: `<p>Doubling twice (8 → 16 → 32) with mod-N: each step moves ${H.c('y', '50%')} of data. Going straight 8 → 32 with mod-N moves ${H.c('r', '75%')}. With logical partitions mapped to shards, 8 → 32 moves exactly the ${H.c('g', '75%')} that must move — but in small, independent, retryable units.</p>`,
    brute: { why: `<p><b>Naive plan:</b> maintenance window — stop writes, mysqldump 40 TB, reload into 32 shards, switch. At ~500 MB/s that is ~22 hours of downtime, and a mid-way failure means starting over. Or "dual write to old and new from the app": partial failures and ordering differences silently corrupt data, and backfilling history still has to happen.</p>` },
    mcq: { q: 'What lets a migration catch up with writes that happen during a long backfill?', options: ['Bigger disks', 'Change data capture from the binlog starting at the snapshot position', 'Read replicas', 'A longer maintenance window'], answer: 1, explain: 'Taking the snapshot at a known binlog position and replaying the binlog from there makes the target converge to the live source.' },
    hints: [`<p>Introduce logical shards (e.g. 4,096 keyspace ranges) so the unit of movement is small and independent; express today's mod-8 layout in that map.</p>`, `<p>Per unit: consistent snapshot copy (throttled), binlog replication from the snapshot GTID, checksum verification, short fenced cutover, reverse replication for rollback.</p>`, `<p>Consider adopting a proven tool (Vitess VReplication / MoveTables / Reshard, gh-ost-style throttling) rather than writing it from scratch; plan capacity so each new shard starts at ≤ 40% utilisation.</p>`],
    solution: {
      approach: `<p><b>Phase 0 — routing indirection:</b> deploy a query router (e.g. Vitess VTGate or an in-house proxy) that maps <code>keyspace_id = hash(shop_id)</code> to shards via a versioned map. Express the current mod-8 placement in it. No data moves; validate in production for a week.</p>
<p><b>Phase 1 — provision</b> 32 new shard clusters (primary + 2 replicas each). <b>Phase 2 — copy:</b> for each source shard, split its keyspace range into 4 target ranges. Take a consistent snapshot at GTID g, stream rows in PK order to targets (throttled by replica lag and IOPS ≤ 30%), then apply binlog events from g onward (idempotent row-based upserts). 40 TB at 400 MB/s aggregate ≈ 28 hours of copy, spread over a week of waves.</p>
<p><b>Phase 3 — verify:</b> row counts and chunk checksums (VDiff-style); shadow reads on 1% traffic. <b>Phase 4 — switch:</b> switch <i>reads</i> first (replica reads to targets), observe; then writes: fence writes on the source range (≤ 5 s), wait for zero lag, flip map version, resume on targets, start reverse replication for rollback. <b>Phase 5 — soak 1–2 weeks</b>, then stop reverse replication and decommission old shards.</p>
<p><b>Risk controls:</b> one source shard at a time; automated abort if error rate or latency SLOs regress; game-day rehearsal on a production-sized staging copy; big shops (hot tenants) moved individually with their own directory entries.</p>`,
      complexity: `<p>Data moved ≈ 30 TB; each target ends at ~1.25 TB and ~3,750 QPS. Write pause ≤ 5 s per range; zero global downtime.</p>`,
      followUps: ['How would you handle schema migrations during the resharding window?', 'What if a single shop exceeds one shard\'s capacity?', 'How do you verify correctness when rows change during the checksum?']
    }
  });

  practice.push({
    title: 'Global app: multi-region replication and failover',
    level: 'Hard', tags: ['replication', 'multi-region', 'consistency'], companies: ['Netflix', 'Airbnb', 'Google', 'Microsoft'],
    statement: `<p>A travel-booking app serves users in the US, EU and Asia. Reads must be fast everywhere (&lt; 50 ms), bookings must never be double-sold, and the app must survive the loss of an entire region. Design database placement and replication.</p>`,
    constraints: `<p>Read:write ≈ 50:1. 5,000 bookings/s globally. Inter-region RTT 70–200 ms. RPO for bookings = 0; RTO &lt; 5 minutes for a full-region loss.</p>`,
    example: `<p>Single leader in the US: an Asia user's read = ${H.c('r', '~180 ms')} round trip. Async follower in Asia: read = ${H.c('g', '~5 ms')} but may be stale. A booking that must be unique needs ${H.c('y', 'coordination')} somewhere.</p>`,
    brute: { why: `<p><b>Naive design 1:</b> one leader region with async followers elsewhere — fast local reads, but a region loss can lose acknowledged bookings (RPO &gt; 0) and all writes from far regions pay a long RTT. <b>Naive design 2:</b> multi-leader in all three regions with last-write-wins — fast writes, but two regions can sell the same hotel room, and LWW silently drops one booking.</p>` },
    mcq: { q: 'What guarantees no double-booking while allowing writes from any region?', options: ['Async multi-leader with last-write-wins', 'A consensus-replicated database (e.g. Spanner/CockroachDB) where the room\'s range has a quorum across regions', 'More read replicas', 'Client-side retries'], answer: 1, explain: 'Quorum (majority) replication across regions serializes conflicting writes and keeps RPO 0 when a region dies — at the cost of cross-region commit latency.' },
    hints: [`<p>Separate data by consistency need: browse/search data (stale is fine) vs booking/inventory (must be serialized) vs user profile (mostly read in the home region).</p>`, `<p>Inventory: consensus replication across 3 regions (or 5 replicas across 3 regions) so commits survive a region loss. Put the range leader near where most bookings for that property happen (leaseholder placement).</p>`, `<p>Reads: local follower reads / caches with bounded staleness; show "availability may change" and re-check at booking time. Plan the failover: automatic leader re-election within seconds for consensus groups.</p>`],
    solution: {
      approach: `<p><b>Catalog &amp; search (read-heavy, stale OK):</b> async replicas + caches + search index in every region. Reads served locally in &lt; 20 ms; staleness of seconds is fine because availability is re-checked at booking.</p>
<p><b>Inventory &amp; bookings (must not double-sell, RPO 0):</b> a distributed SQL database (CockroachDB/Spanner/YugabyteDB) with each data range replicated 5 ways across 3 regions (2+2+1). Commits need a majority, so any single region can fail without losing committed bookings, and leader election is automatic (Raft/Paxos) → RTO of seconds. Place each property's range leader ("leaseholder") in the region where the property is located, since most bookings for a Paris hotel come from or route to the EU; cross-region bookings pay one extra RTT (~100–200 ms), acceptable for a booking click.</p>
<p><b>User profiles:</b> home-region partitioning (list by region) with async DR copies; occasional cross-region reads go to the home region.</p>
<p><b>Booking flow:</b> local read shows availability (possibly stale) → booking transaction on the consensus DB with a conditional decrement / unique (room, night) constraint → idempotency key for retries → payment saga.</p>
<p><b>Failover drills:</b> regularly evacuate a region (game day). Traffic steering via global load balancer health checks; caches warm from neighbours.</p>`,
      complexity: `<p>Booking commit ≈ 1 cross-region quorum RTT (70–200 ms). Reads local (5–20 ms). Storage ×5 for inventory, ×2–3 for catalog. Survives one full region loss with RPO 0 for bookings.</p>`,
      followUps: ['Why 5 replicas across 3 regions rather than 3?', 'How would you serve "rooms near me" search consistently with bookings?', 'What does PACELC say about this design?']
    }
  });

  /* =====================================================================
     QUIZ
     ===================================================================== */
  quiz.push(
    { q: 'A ledger needs multi-row atomic updates and ad-hoc reporting at 3,000 writes/s. Best default?', options: ['Redis', 'PostgreSQL (relational, ACID)', 'Cassandra', 'A graph database'], answer: 1, explain: 'ACID transactions, constraints and SQL reporting fit, and 3,000 writes/s is comfortably within one strong primary.' },
    { q: 'With asynchronous replication, what can happen if the leader crashes right after acknowledging a write?', options: ['Nothing, async is always safe', 'The acknowledged write may be lost if no follower received it', 'All followers become leaders', 'Writes block forever'], answer: 1, explain: 'Async acks before followers have the data; a crash in that window loses acknowledged writes (RPO &gt; 0).' },
    { q: 'Synchronous replication to ALL followers mainly costs you…', options: ['Durability', 'Write latency (slowest follower) and availability (a down follower blocks writes)', 'Read throughput', 'Storage only'], answer: 1, explain: 'The client waits for every follower; one slow or failed follower slows or stalls all writes.' },
    { q: 'You add 5 read replicas. What happens to the maximum write throughput of the system?', options: ['It rises 5×', 'It stays about the same (or drops slightly)', 'It doubles', 'It becomes unlimited'], answer: 1, explain: 'All writes still go to one leader, and every replica must replay all writes; replicas only scale reads.' },
    { q: 'A user edits their profile and the old version reappears on refresh. Which guarantee is missing?', options: ['Read-your-writes', 'Atomicity', 'Partition tolerance', 'Durability'], answer: 0, explain: 'The read hit a lagging replica; read-your-writes requires the user\'s own reads to reflect their own writes.' },
    { q: 'Range-sharding orders by an auto-increment order_id causes…', options: ['Perfectly even writes', 'All new writes to hit the shard holding the highest range', 'Cross-shard transactions on every insert', 'Random data loss'], answer: 1, explain: 'Sequential keys always fall in the newest range, creating a hot shard while older shards idle.' },
    { q: 'Which strategy fits "EU users\' data must stay in the EU"?', options: ['Hash partitioning', 'List partitioning by region/country', 'Round-robin', 'Range by user id'], answer: 1, explain: 'List partitioning maps explicit values (country → region) to partitions/shards, encoding residency rules.' },
    { q: 'Going from 4 to 5 shards with <code>hash(key) mod N</code> moves roughly what fraction of keys?', options: ['20%', '50%', '80%', '100%'], answer: 2, explain: 'A key stays only if h mod 4 = h mod 5, which holds for about 1/5 of keys, so ~80% move.' },
    { q: 'A celebrity\'s like counter receives 50K writes/s on one key. What directly helps?', options: ['Adding read replicas', 'Adding more shards', 'Salting the key into many sub-counters (or batching increments)', 'Synchronous replication'], answer: 2, explain: 'Only splitting the key (or aggregating writes before they hit the DB) spreads the load; one key always maps to one shard.' },
    { q: 'In a scatter-gather top-10 query across 20 shards, each shard should return…', options: ['Its top 1', 'Its top 10', 'Its top 10/20', 'All of its rows'], answer: 1, explain: 'All 10 global winners may sit on one shard, so each shard must return its own top 10 for a correct merge.' },
    { q: 'How should a router compute a global AVG(price) across shards?', options: ['Average the per-shard averages', 'Ask each shard for SUM and COUNT, then divide the totals', 'Take the median shard\'s average', 'Use only the largest shard'], answer: 1, explain: 'Averaging averages is wrong when shards have different row counts; SUM/COUNT partials combine exactly.' },
    { q: 'Each of 100 shards has a 1% chance of a slow response. Probability a full fan-out hits at least one slow shard?', options: ['1%', '10%', '≈ 63%', '100%'], answer: 2, explain: '1 − 0.99<sup>100</sup> ≈ 0.63 — tail-latency amplification makes large fan-outs slow often.' },
    { q: 'What is the main purpose of creating 1,024 logical partitions on just 8 machines?', options: ['Faster single queries', 'So future rebalancing moves whole partitions instead of rehashing every key', 'To allow joins', 'To reduce storage'], answer: 1, explain: 'Key → partition never changes; adding machines only changes the small partition → machine map and moves ~1/(N+1) of the data.' }
  );

  /* =====================================================================
     INTERVIEW Q&A
     ===================================================================== */
  interview.push(
    { q: 'How do you decide between SQL and NoSQL in a design interview?', level: 'B', a: `<p>I start from requirements and access patterns, not fashion. If the data is relational, needs multi-row ACID transactions (money, inventory, bookings), or needs ad-hoc queries and reporting, I default to a relational DB such as PostgreSQL — it scales further vertically and with replicas than people assume. I move to NoSQL when a requirement demands it: very high write throughput with simple key-based access (wide-column like Cassandra), flexible nested records read as a whole (document), single-key lookups at any scale (DynamoDB/Redis), or many-hop relationship queries (graph). If I need SQL semantics at global scale, I mention distributed SQL (Spanner, CockroachDB). I always state the trade-off I accept, e.g. "with Cassandra I design one table per query and lose joins".</p>`, followUps: ['What is a case where both would work, and how would you break the tie?', 'What does "schemaless" really mean in practice?'] },
    { q: 'Explain synchronous vs asynchronous replication and when you would use each.', level: 'B', a: `<p>In both, writes go to a leader that ships its log to followers. <b>Async</b>: the leader acknowledges as soon as it has the write locally — lowest latency and writes keep flowing if followers are down, but followers lag and a leader crash can lose the last acknowledged writes (RPO &gt; 0). <b>Sync</b>: the leader waits for follower confirmation — no loss on failover (RPO = 0) but latency is bounded by the slowest confirming follower and a dead follower can block writes. In practice I use <b>quorum/semi-sync</b> within a region (wait for 1 of 2 standbys in other zones) for critical data, and async to far regions for disaster recovery and local reads.</p>`, followUps: ['What happens in MySQL semi-sync when no replica acknowledges in time?', 'How do RPO and RTO relate to these choices?'] },
    { q: 'What is replication lag, what causes it and how do you handle its effects?', level: 'I', a: `<p>Lag is how far a follower is behind the leader, in bytes of log or seconds. Causes: write bursts the follower cannot replay fast enough (often single-threaded apply), long-running queries on the follower blocking replay, network issues, under-provisioned replica disks, or huge transactions. Effects: stale reads, read-your-writes and monotonic-read violations, larger data loss on async failover. Handling: monitor lag in seconds and bytes with alerts; take lagging replicas out of the read pool; route a user's reads after their write to the leader or to a replica that has reached their write's LSN/GTID; pin sessions to a replica for monotonic reads; move heavy analytics to a dedicated replica or warehouse; parallel apply where supported.</p>`, followUps: ['Why can "seconds behind master" be misleading?', 'How would you implement LSN-based routing?'] },
    { q: 'Do read replicas help a write-heavy system? Why or why not?', level: 'B', a: `<p>No — not for writes. In leader/follower replication every write still goes to a single leader, and every replica must replay every write, so adding replicas adds read capacity but not write capacity, and actually adds some load on the leader for shipping logs. They also do nothing for storage size per node, since each replica holds all the data. For a write bottleneck the options are: batching or buffering writes, reducing write amplification (fewer indexes), a faster storage engine (LSM), vertical scaling, and ultimately sharding so different keys' writes go to different leaders.</p>`, followUps: ['Where else can writes be absorbed before the DB?', 'At what point would you decide to shard?'] },
    { q: 'Compare range, hash and list partitioning.', level: 'I', a: `<p><b>Range</b> assigns contiguous key ranges to partitions: excellent for range scans and ordered data (time windows), and ranges can be split dynamically, but sequential keys (timestamps, auto-increment) create a hot newest partition. <b>Hash</b> uses hash(key) to spread keys evenly: great load balance and point lookups, but range queries hit every partition and naive mod-N makes resharding expensive. <b>List</b> maps explicit values to partitions (country → region, tenant → shard): natural for data residency and tenant isolation, but sizes are uneven and one big value can't be split. Real systems combine them: list by region on top, hash by user within a region, and range by time inside each partition (Cassandra's partition key + clustering columns).</p>`, followUps: ['How does Cassandra combine hash and range in one primary key?', 'When is directory-based sharding better?'] },
    { q: 'What makes a good shard key? Walk through choosing one.', level: 'I', a: `<p>A good shard key has: (1) high cardinality, so data can be split finely; (2) even distribution of both data and traffic — no value that owns a large share; (3) presence in the most frequent queries, so they hit one shard; (4) co-location of data used together in transactions and joins. Process: list the top queries by QPS and the transactions; for each candidate key, compute the fraction of traffic that becomes single-shard and the maximum expected shard load (watch for big tenants, celebrities, "today"); check write distribution on peak days. Example: orders keyed by hash(customer_id) — history and checkout are single-shard; order-by-id is solved by embedding the shard in the id; seller views go to a CDC-fed read model.</p>`, followUps: ['Why is created_at a bad shard key?', 'What if two important queries want different keys?'] },
    { q: 'How do you detect and mitigate a hot key?', level: 'I', a: `<p>Detection: per-shard dashboards show the hot shard (CPU, QPS, latency); to find the key, sample requests at the router/proxy and keep a top-K (Space-Saving/Count-Min sketch), or use built-in tools (DynamoDB Contributor Insights, redis-cli --hotkeys). Mitigation depends on read vs write. Read-hot: multi-layer caching (CDN, in-process, Redis) with request coalescing and stale-while-revalidate; extra replicas for that shard. Write-hot: split the key into salted sub-keys (writes pick a random suffix, reads aggregate), buffer and batch increments through a stream, or use commutative counters. Tenant-hot: move the tenant to a dedicated shard via directory routing and add per-tenant rate limits. Sometimes change the model (fan-out-on-read for celebrities).</p>`, followUps: ['How many salts should you use?', 'What is the read cost of salting and how do you hide it?'] },
    { q: 'Why is hash(key) mod N a problem, and what do real systems do instead?', level: 'I', a: `<p>When N changes, a key keeps its shard only if h mod N = h mod N', so roughly N/(N+1) of all keys move when adding one shard (75% for 3 → 4). That means copying most of the dataset during a live migration, and every client must switch rules simultaneously. Alternatives: (1) a fixed, large number of logical partitions (Redis Cluster's 16,384 slots, Vitess keyspace ranges, Elasticsearch shards) with a partition → node map, so growth moves whole partitions (~1/(N+1) of data); (2) dynamic range splitting and moving (Bigtable, Spanner, CockroachDB, MongoDB chunks); (3) consistent hashing with virtual nodes (Cassandra, Dynamo). All three reduce movement to the minimum and allow moving one small unit at a time.</p>`, followUps: ['How many logical partitions would you choose and why?', 'How does consistent hashing achieve the same goal?'] },
    { q: 'Describe how you would reshard a live database with zero downtime.', level: 'A', a: `<p>(1) Add routing indirection (versioned partition → shard map) if it doesn't exist. (2) Provision target shards. (3) Backfill: take a consistent snapshot of the moving partitions at a known log position and bulk-copy in PK-ordered chunks, throttled by source load and replica lag. (4) Catch up: stream changes from that position (binlog/WAL CDC) with idempotent apply until lag is near zero. (5) Verify with row counts, chunk checksums and shadow reads. (6) Cut over per partition: switch reads first, then fence writes briefly, wait for lag = 0, publish the new map version; sources reject writes for moved partitions (fencing by version). (7) Keep reverse replication for rollback during a soak, then clean up. Rehearse in staging, move in waves, and automate abort on SLO regressions. Tools like Vitess, gh-ost-style throttling and Debezium implement most of this.</p>`, followUps: ['Why prefer CDC over application dual-writes?', 'What exactly can go wrong during the cutover window?'] },
    { q: 'How do you handle queries that don\'t include the shard key?', level: 'I', a: `<p>Options from cheapest at read time to cheapest at write time: (1) a <b>global secondary index</b> / read model sharded by the other key (e.g. product_id → order ids), maintained asynchronously via CDC — single-shard reads but eventual consistency and write amplification; (2) <b>denormalize</b> the needed fields into the place where they are read; (3) send it to a <b>search engine or warehouse</b> if the query is analytical or full-text; (4) <b>scatter-gather</b> to all shards in parallel with pushdown of filters, LIMIT and partial aggregates — acceptable for rare queries, but load multiplies by N and latency is the slowest shard. The best fix is upstream: choose the shard key so the hottest queries are single-shard, and co-locate related tables.</p>`, followUps: ['Local vs global secondary indexes — trade-offs?', 'How do you keep a CDC-fed index correct over time?'] },
    { q: 'How would you implement a transaction that spans two shards?', level: 'A', a: `<p>First try to avoid it by co-locating data (same shard key). If unavoidable: <b>2PC</b> — coordinator asks participants to prepare (durably lock and vote), then commits or aborts. It is atomic but blocking: if the coordinator dies after prepare, participants hold locks in doubt; making the coordinator replicated (as Spanner/CockroachDB do with Paxos/Raft) fixes availability at the cost of extra round trips. <b>Saga</b> — a sequence of local transactions, each publishing the next step via a transactional outbox, with compensating actions on failure; every step idempotent with a unique transfer id, intermediate states explicit (PENDING), and a reconciler for stuck flows. For money transfers at scale I'd usually choose a saga with a double-entry ledger; if the business needs both sides to change atomically and visibly together, a distributed SQL database.</p>`, followUps: ['What is the "in-doubt" problem in 2PC?', 'Why does a saga need the outbox pattern?'] },
    { q: 'What is tail-latency amplification and how does it affect sharded systems?', level: 'A', a: `<p>When a request fans out to N shards in parallel, its latency is the <i>maximum</i> of N latencies. If each shard is slow 1% of the time, a 100-shard fan-out is slow 1 − 0.99<sup>100</sup> ≈ 63% of the time, so the fan-out's median approaches a single shard's p99. Causes of per-shard slowness include GC pauses, compactions, noisy neighbours and network blips. Mitigations: avoid fan-out on hot paths (good shard key, secondary indexes), hedged requests (send a backup to a replica after the p95 time), tied requests, per-shard timeouts with partial results where acceptable, reducing variance (isolation, compaction throttling), and keeping fan-out width small (fewer, larger shards for that query).</p>`, followUps: ['How do hedged requests avoid doubling load?', 'When are partial results acceptable?'] },
    { q: 'You need RPO = 0 and survival of a full region outage. What are your options and costs?', level: 'E', a: `<p>RPO = 0 across regions means a commit must be durable in at least two regions before acknowledging, so every write pays at least one inter-region round trip (tens to 200 ms). Options: (1) leader in region A with synchronous (or quorum) replication to region B and automated, fenced failover — simplest, but if B is unreachable, writes block or you degrade RPO; (2) consensus replication (Raft/Paxos) across 3+ regions — e.g. 5 replicas over 3 regions with majority commits, automatic leader election, survives a region loss without blocking (Spanner, CockroachDB, YugabyteDB); place leaders near the users who write each range to cut latency. Costs: write latency, more replicas (storage ×3–5), cross-region bandwidth, and operational complexity. I'd apply this only to data that truly needs RPO 0 (payments, bookings) and keep everything else on cheaper async replication — PACELC: we trade latency for consistency even when there is no partition.</p>`, followUps: ['Why 3 regions rather than 2 for a consensus group?', 'How do you keep reads fast in this design?'] }
  );

  /* =====================================================================
     REGISTER
     ===================================================================== */
  registerModule({
  langExplain: `<p><b>About the code here.</b> System design is language-neutral, and interviews never require a particular language for it. The short samples are Python (and occasionally Java) only to make an idea concrete, such as an estimate, a hash ring or a rate limiter. Read them like pseudocode; the runnable ones are calculators you can change and re-run.</p>`,
    id: 'hld05',
    title: 'Databases at Scale: Choice, Replication & Sharding',
    intro: `<p>Almost every system design interview ends up at the database: <i>"Which database would you use? What happens when it gets too big? What if the server dies? What about the celebrity user?"</i> This module gives you a calm, step-by-step way to answer all of these.</p>
<p>We start with <b>choosing a database</b> (SQL vs the NoSQL families vs distributed SQL), then learn how to make copies of data with <b>replication</b> — synchronous vs asynchronous, lag, failover and <b>read replicas</b>. Then we split data across machines with <b>partitioning/sharding</b> (range, hash, list) and tackle the three classic headaches: <b>hot keys</b>, <b>resharding</b> without downtime, and <b>cross-shard queries and transactions</b>.</p>
<p>Every topic has an animated visualizer — watch followers lag behind a leader, writes being routed to shards (and one shard catching fire), keys moving during a reshard, and a query fanning out to every shard and merging the results.</p>`,
    goals: [
      'Pick a database (relational, key-value, document, wide-column, graph or distributed SQL) for a product and defend the choice with access patterns and trade-offs',
      'Explain leader/follower replication, sync vs async vs quorum commits, replication lag, failover and RPO/RTO — and size read replicas with arithmetic',
      'Fix stale-read bugs with read-your-writes and monotonic-read routing',
      'Choose a shard key and a range, hash or list partitioning scheme for a given workload, and spot hot-shard risks before they happen',
      'Handle a celebrity hot key with caching, salting, batching or isolation',
      'Plan an online resharding (logical partitions, backfill, CDC, verify, fenced cutover, rollback) and serve cross-shard queries with scatter-gather, global indexes and sagas'
    ],
    prereqs: `<p>HLD 2 (Scalability Basics — horizontal scaling, read replicas intro) and HLD 3 (Estimation &amp; the HLD Interview Framework). Basic SQL (SELECT, JOIN, transactions) helps — see the SQL track. Consistent hashing is covered in depth in HLD 7; distributed transactions and consensus in HLD 11.</p>`,
    hours: 12,
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
