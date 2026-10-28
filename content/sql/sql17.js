(function () {
  var topics = [], practice = [], quiz = [], interview = [];

  /* ---------------- sample databases (SQLite dialect) ----------------
     Every NoSQL store in this module is emulated in SQLite so the modelling ideas run in the
     browser: JSON documents (MongoDB), a keyspace with TTLs and sorted sets (Redis), clustered
     partitions (Cassandra) and one generic PK/SK table with a GSI (DynamoDB).
     Native Mongo shell / Redis / CQL / DynamoDB snippets are shown as non-runnable text. */

  // design: an access-pattern inventory for one product (topic 1)
  var DB_DESIGN = `
CREATE TABLE access_patterns (
  id        INTEGER PRIMARY KEY,
  pattern   TEXT NOT NULL,
  shape     TEXT NOT NULL CHECK (shape IN ('key', 'range', 'nested', 'adhoc', 'counter', 'graph')),
  reads_s   INTEGER NOT NULL,      -- peak reads per second
  writes_s  INTEGER NOT NULL,      -- peak writes per second
  needs_txn INTEGER NOT NULL,      -- 1 = must change several records atomically
  p99_ms    INTEGER NOT NULL       -- latency budget at p99
);
INSERT INTO access_patterns VALUES
  (1, 'get session by token',                 'key',     20000,  2000, 0,    1),
  (2, 'user timeline newest first',           'range',   50000, 30000, 0,   10),
  (3, 'product page with variant attributes', 'nested',   8000,    50, 0,   20),
  (4, 'checkout: reserve stock + charge',     'key',       300,   300, 1,   50),
  (5, 'finance ad-hoc report',                'adhoc',       2,     0, 0, 5000),
  (6, 'get order by id',                      'key',      3000,   500, 0,   10),
  (7, 'live like counter',                    'counter', 40000, 25000, 0,    1),
  (8, 'friends of friends',                   'graph',     500,    50, 0,  100);
`;

  // mongo: one table per collection, one JSON document per row (MongoDB stores BSON)
  var DB_MONGO = `
CREATE TABLE orders (_id TEXT PRIMARY KEY, body TEXT NOT NULL CHECK (json_valid(body)));
INSERT INTO orders VALUES
  ('o1', '{"customer":{"id":1,"name":"Asha","city":"Pune"},"status":"paid","placed":"2026-09-01","items":[{"sku":"PEN","qty":3,"price":40},{"sku":"BOOK","qty":1,"price":450}]}'),
  ('o2', '{"customer":{"id":2,"name":"Ravi","city":"Delhi"},"status":"shipped","placed":"2026-09-02","items":[{"sku":"MUG","qty":2,"price":199}]}'),
  ('o3', '{"customer":{"id":1,"name":"Asha","city":"Pune"},"status":"paid","placed":"2026-09-05","items":[{"sku":"PEN","qty":10,"price":40},{"sku":"MUG","qty":1,"price":199}]}'),
  ('o4', '{"customer":{"id":3,"name":"Mei","city":"Pune"},"status":"cancelled","placed":"2026-09-06","items":[{"sku":"BOOK","qty":2,"price":450}]}'),
  ('o5', '{"customer":{"id":2,"name":"Ravi","city":"Delhi"},"status":"paid","placed":"2026-09-07","items":[{"sku":"LAMP","qty":1,"price":1299},{"sku":"PEN","qty":1,"price":40}]}'),
  ('o6', '{"customer":{"id":4,"name":"Tom","city":"Mumbai"},"status":"paid","placed":"2026-09-09","items":[]}');
CREATE TABLE products (_id TEXT PRIMARY KEY, body TEXT NOT NULL CHECK (json_valid(body)));
INSERT INTO products VALUES
  ('PEN',   '{"name":"Gel Pen","price":40,"category":"stationery","attrs":{"ink":"gel","color":"blue"}}'),
  ('BOOK',  '{"name":"DDIA","price":450,"category":"books","attrs":{"author":"Kleppmann","pages":616}}'),
  ('MUG',   '{"name":"Coffee Mug","price":199,"category":"kitchen","attrs":{"volume_ml":350}}'),
  ('LAMP',  '{"name":"Desk Lamp","price":1299,"category":"home","attrs":{"watts":9,"dimmable":true}}'),
  ('CHAIR', '{"name":"Office Chair","price":5999,"category":"home","attrs":{"max_kg":120}}');
-- posts: p1 embeds all its comments; p2 and p3 use the SUBSET pattern
-- (comment_count + the 2 newest comments embedded, full list in the comments collection)
CREATE TABLE posts (_id TEXT PRIMARY KEY, body TEXT NOT NULL CHECK (json_valid(body)));
INSERT INTO posts VALUES
  ('p1', '{"author":{"id":1,"name":"Asha"},"title":"Embedding 101","tags":["mongodb","modeling"],"comments":[{"by":"Ravi","at":"2026-09-01T10:00","text":"Great"},{"by":"Mei","at":"2026-09-01T11:00","text":"Saved"},{"by":"Tom","at":"2026-09-02T09:00","text":"More please"}]}'),
  ('p2', '{"author":{"id":2,"name":"Ravi"},"title":"Redis tricks","tags":["redis"],"comment_count":1,"recent_comments":[{"by":"Asha","at":"2026-09-04T10:00","text":"nice"}]}'),
  ('p3', '{"author":{"id":1,"name":"Asha"},"title":"Viral post","tags":["mongodb","scale"],"comment_count":5,"recent_comments":[{"by":"Zara","at":"2026-09-03T12:00","text":"wow"},{"by":"Leo","at":"2026-09-03T11:00","text":"+1"}]}');
CREATE TABLE comments (_id TEXT PRIMARY KEY, body TEXT NOT NULL CHECK (json_valid(body)));
INSERT INTO comments VALUES
  ('c1', '{"post_id":"p3","by":"Nia","at":"2026-09-03T08:00","text":"first"}'),
  ('c2', '{"post_id":"p3","by":"Tom","at":"2026-09-03T09:00","text":"lol"}'),
  ('c3', '{"post_id":"p3","by":"Mei","at":"2026-09-03T10:00","text":"source?"}'),
  ('c4', '{"post_id":"p3","by":"Leo","at":"2026-09-03T11:00","text":"+1"}'),
  ('c5', '{"post_id":"p3","by":"Zara","at":"2026-09-03T12:00","text":"wow"}'),
  ('c6', '{"post_id":"p2","by":"Asha","at":"2026-09-04T10:00","text":"nice"}');
-- users: two schema versions live side by side (schema versioning pattern)
CREATE TABLE users (_id TEXT PRIMARY KEY, body TEXT NOT NULL CHECK (json_valid(body)));
INSERT INTO users VALUES
  ('u1', '{"schema_version":2,"name":{"first":"Asha","last":"Rao"},"email":"asha@mail.com"}'),
  ('u2', '{"name":"Ravi Kumar","email":"ravi@mail.com"}'),
  ('u3', '{"schema_version":2,"name":{"first":"Mei","last":"Lin"},"email":"mei@mail.com"}'),
  ('u4', '{"name":"Tom Hardy","email":"tom@mail.com"}');
`;

  // redis: a keyspace snapshot. "now" is t = 1000 seconds in every problem.
  var DB_REDIS = `
CREATE TABLE keyspace (
  k           TEXT PRIMARY KEY,
  type        TEXT NOT NULL,       -- string | hash | list | set | zset | stream
  bytes       INTEGER NOT NULL,    -- MEMORY USAGE estimate
  expire_at   INTEGER,             -- unix-style seconds; NULL = no TTL (persistent key)
  last_access INTEGER NOT NULL,    -- for LRU (Redis keeps a 24-bit clock per object)
  hits        INTEGER NOT NULL     -- for LFU (Redis keeps a logarithmic 8-bit counter)
);
INSERT INTO keyspace VALUES
  ('cache:feed:1',  'string', 5000, NULL,  980,  15),
  ('cache:user:1',  'string', 1200, 1500,  995, 120),
  ('cache:user:2',  'string', 1100, 1100,  400,   2),
  ('config:flags',  'hash',    150, NULL,  100,   1),
  ('lb:weekly',     'zset',   2400, NULL,  999, 300),
  ('queue:emails',  'list',    800, NULL,  996,  60),
  ('ratelimit:1',   'zset',    200, 1060,  998,  50),
  ('session:a1',    'hash',    300, 1200,  990,  40),
  ('session:b2',    'hash',    300,  950,  700,   3);
CREATE TABLE zsets (k TEXT NOT NULL, member TEXT NOT NULL, score REAL NOT NULL, PRIMARY KEY (k, member));
INSERT INTO zsets VALUES
  ('lb:weekly', 'asha', 980), ('lb:weekly', 'ravi', 1200), ('lb:weekly', 'mei', 1200),
  ('lb:weekly', 'tom', 450),  ('lb:weekly', 'zara', 1500), ('lb:weekly', 'leo', 980),
  ('lb:weekly', 'nia', 300),
  -- sliding-window rate limiter: member = request id, score = request time
  ('ratelimit:1', 'r1', 945), ('ratelimit:1', 'r2', 955), ('ratelimit:1', 'r3', 962),
  ('ratelimit:1', 'r4', 990), ('ratelimit:1', 'r5', 995), ('ratelimit:1', 'r6', 998);
CREATE TABLE hashes (k TEXT NOT NULL, field TEXT NOT NULL, v TEXT NOT NULL, PRIMARY KEY (k, field));
INSERT INTO hashes VALUES
  ('session:a1', 'user_id', '1'), ('session:a1', 'cart_items', '3'), ('session:a1', 'theme', 'dark'),
  ('session:b2', 'user_id', '2'), ('config:flags', 'new_checkout', 'on'), ('config:flags', 'dark_mode', 'off');
CREATE TABLE lists (k TEXT NOT NULL, pos INTEGER NOT NULL, v TEXT NOT NULL, PRIMARY KEY (k, pos));
INSERT INTO lists VALUES ('queue:emails', 0, 'welcome:1'), ('queue:emails', 1, 'reset:2'), ('queue:emails', 2, 'digest:3');
`;

  // cass: Cassandra-style tables. WITHOUT ROWID stores rows sorted by the primary key,
  // like rows inside a partition sorted by clustering columns.
  var DB_CASS = `
CREATE TABLE readings_by_sensor (
  sensor_id TEXT NOT NULL,         -- partition key part 1
  day       TEXT NOT NULL,         -- partition key part 2 (the time bucket)
  ts        TEXT NOT NULL,         -- clustering column
  value     REAL NOT NULL,
  PRIMARY KEY (sensor_id, day, ts)
) WITHOUT ROWID;
INSERT INTO readings_by_sensor VALUES
  ('s1', '2026-09-01', '08:00', 21.5), ('s1', '2026-09-01', '12:00', 24.0), ('s1', '2026-09-01', '18:00', 22.0),
  ('s1', '2026-09-02', '08:00', 20.5), ('s1', '2026-09-02', '12:00', 25.5),
  ('s2', '2026-09-01', '09:00', 30.1),
  ('s2', '2026-09-02', '09:00', 29.8), ('s2', '2026-09-02', '10:00', 31.2), ('s2', '2026-09-02', '11:00', 32.0), ('s2', '2026-09-02', '12:00', 33.5),
  ('s3', '2026-09-02', '07:00', 18.0);
CREATE TABLE cl_combos (
  id       INTEGER PRIMARY KEY,
  rf       INTEGER NOT NULL,       -- replication factor (single datacenter)
  write_cl TEXT NOT NULL,          -- consistency level used for writes
  read_cl  TEXT NOT NULL           -- consistency level used for reads
);
INSERT INTO cl_combos VALUES
  (1, 3, 'QUORUM', 'QUORUM'), (2, 3, 'ONE', 'ONE'), (3, 3, 'ALL', 'ONE'), (4, 3, 'ONE', 'QUORUM'),
  (5, 5, 'QUORUM', 'QUORUM'), (6, 5, 'TWO', 'THREE'), (7, 3, 'ONE', 'ALL'), (8, 1, 'ONE', 'ONE');
CREATE TABLE query_stats (
  query_id   TEXT PRIMARY KEY,
  table_name TEXT NOT NULL,
  live_rows  INTEGER NOT NULL,     -- live rows returned
  tombstones INTEGER NOT NULL      -- tombstones scanned to find them
);
INSERT INTO query_stats VALUES
  ('q1', 'inbox', 120, 40), ('q2', 'jobs_queue', 10, 25000), ('q3', 'readings', 5000, 0),
  ('q4', 'jobs_queue', 3, 150000), ('q5', 'sessions', 50, 1200);
-- last-write-wins cells on three replicas, and which replicas answered each read
CREATE TABLE replica_cells (node TEXT NOT NULL, k TEXT NOT NULL, v TEXT NOT NULL, write_ts INTEGER NOT NULL, PRIMARY KEY (node, k));
INSERT INTO replica_cells VALUES
  ('A', 'cart:9', 'qty=2', 300), ('B', 'cart:9', 'qty=1', 200), ('C', 'cart:9', 'qty=2', 300),
  ('A', 'theme:7', 'dark', 500), ('B', 'theme:7', 'light', 500), ('C', 'theme:7', 'light', 400);
CREATE TABLE read_responses (read_id INTEGER NOT NULL, node TEXT NOT NULL, k TEXT NOT NULL);
INSERT INTO read_responses VALUES
  (1, 'A', 'cart:9'), (1, 'B', 'cart:9'), (2, 'B', 'theme:7'), (2, 'C', 'theme:7'), (3, 'A', 'theme:7'), (3, 'B', 'theme:7');
`;

  // dynamo: one single-table design + per-second consumed capacity per partition key
  var DB_DYNAMO = `
CREATE TABLE app_table (
  pk     TEXT NOT NULL,            -- partition key
  sk     TEXT NOT NULL,            -- sort key
  gsi1pk TEXT,                     -- GSI1 partition key (sparse: NULL = not in the index)
  gsi1sk TEXT,                     -- GSI1 sort key
  type   TEXT NOT NULL,
  attrs  TEXT NOT NULL CHECK (json_valid(attrs)),
  PRIMARY KEY (pk, sk)
) WITHOUT ROWID;
INSERT INTO app_table VALUES
  ('CUST#1', 'PROFILE',             NULL, NULL, 'customer', '{"name":"Asha","city":"Pune"}'),
  ('CUST#1', 'ADDR#home',           NULL, NULL, 'address',  '{"city":"Pune","pin":"411001"}'),
  ('CUST#1', 'ORDER#2026-09-01#o1', 'STATUS#paid',      '2026-09-01#o1', 'order', '{"total":570}'),
  ('CUST#1', 'ORDER#2026-09-05#o3', 'STATUS#paid',      '2026-09-05#o3', 'order', '{"total":599}'),
  ('CUST#2', 'PROFILE',             NULL, NULL, 'customer', '{"name":"Ravi","city":"Delhi"}'),
  ('CUST#2', 'ORDER#2026-09-02#o2', 'STATUS#shipped',   '2026-09-02#o2', 'order', '{"total":398}'),
  ('CUST#2', 'ORDER#2026-09-07#o5', 'STATUS#paid',      '2026-09-07#o5', 'order', '{"total":1339}'),
  ('CUST#3', 'PROFILE',             NULL, NULL, 'customer', '{"name":"Mei","city":"Pune"}'),
  ('CUST#3', 'ORDER#2026-09-06#o4', 'STATUS#cancelled', '2026-09-06#o4', 'order', '{"total":900}'),
  ('ORDER#o1', 'ITEM#BOOK', NULL, NULL, 'line', '{"qty":1,"price":450}'),
  ('ORDER#o1', 'ITEM#PEN',  NULL, NULL, 'line', '{"qty":3,"price":40}'),
  ('ORDER#o3', 'ITEM#MUG',  NULL, NULL, 'line', '{"qty":1,"price":199}'),
  ('ORDER#o3', 'ITEM#PEN',  NULL, NULL, 'line', '{"qty":10,"price":40}');
CREATE TABLE traffic (pk TEXT NOT NULL, second INTEGER NOT NULL, rcu INTEGER NOT NULL, wcu INTEGER NOT NULL, PRIMARY KEY (pk, second));
INSERT INTO traffic VALUES
  ('VOTE#final', 1, 200, 1400), ('VOTE#final', 2, 200, 900), ('VOTE#final', 3, 200, 1600),
  ('VOTE#semi',  1, 3500, 300), ('VOTE#semi',  2, 2000, 250), ('VOTE#semi',  3, 100, 200),
  ('USER#1',     1, 20, 5),     ('USER#1',     2, 20, 5),     ('USER#1',     3, 20, 5);
-- write sharding: one hot logical counter spread over suffixed keys "<key>~<n>"
CREATE TABLE vote_shards (pk TEXT PRIMARY KEY, votes INTEGER NOT NULL);
INSERT INTO vote_shards VALUES
  ('VOTE#final~0', 410), ('VOTE#final~1', 395), ('VOTE#final~2', 420), ('VOTE#final~3', 380),
  ('VOTE#semi~0', 120), ('VOTE#semi~1', 130), ('LIKES#post9', 50);
`;



  /* =====================================================================
     TOPIC 1 — Access patterns first: choosing the store
     ===================================================================== */
  topics.push({
    title: 'Access Patterns First: Choosing Document, Key-Value, Wide-Column or DynamoDB',
    analogy: `<p>A relational database is a <b>library with a card catalogue</b>: books sit on shelves once, and the catalogue lets you ask any question later ("all books by Kleppmann after 2015"). A NoSQL store is a <b>restaurant kitchen's mise en place</b>: before service the cook pre-cuts and arranges exactly what tonight's menu needs, in the order it will be used. Service is lightning fast, but only for the dishes on the menu. Ordering something off-menu means chopping from scratch. The menu is your list of <b>access patterns</b>.</p>`,
    explain: `<p>In SQL you model <b>entities</b> first (normalise, then write any query you like). In NoSQL you model <b>queries</b> first: write down every access pattern with its key, sort order, rate and consistency need, then shape the data so each pattern is one cheap lookup. The sql14 module covered <i>what</i> the families are; this module is about <i>designing</i> with them.</p>
${H.table(['Store', 'Data model', 'Sweet spot', 'Watch out for'], [
  ['<b>MongoDB</b> (document)', 'JSON/BSON documents in collections, rich secondary indexes, aggregation pipeline', 'aggregates read together (an order with its lines), varied attributes (catalogues), flexible schema evolution', '16 MB document limit, unbounded arrays, multi-document transactions cost more'],
  ['<b>Redis</b> (in-memory key-value + data structures)', 'keys → strings, hashes, lists, sets, sorted sets, streams, HyperLogLog, geo', 'sub-millisecond: caches, sessions, rate limits, leaderboards, queues, counters', 'data must fit in RAM; persistence is a trade-off; one hot key = one CPU core'],
  ['<b>Cassandra</b> (wide-column)', 'tables with a partition key (placement) + clustering columns (sort order inside the partition)', 'huge write rates, time series, feeds, multi-datacenter active-active', 'no joins, no ad-hoc filters; one table per query; tombstones'],
  ['<b>DynamoDB</b> (managed key-value/document)', 'items addressed by partition key + optional sort key; GSIs; up to 400 KB items', 'serverless key lookups and range queries at any scale, single-table design', 'per-partition limits (3 000 RCU / 1 000 WCU), scans are expensive, GSIs are eventually consistent'],
  ['<b>PostgreSQL / MySQL</b>', 'normalised tables, joins, constraints', 'multi-row transactions, ad-hoc questions, reporting, unknown future queries', 'vertical scaling limits and sharding effort at extreme write rates']
])}
<p><b>The access-pattern worksheet</b> (do this in every design interview before naming a database):</p>
<ol>
<li>List each pattern as a sentence: "get the 20 newest messages in channel C".</li>
<li>For each: the <b>lookup key</b> (what the caller already knows), the <b>sort order</b>, <b>reads/s and writes/s</b> at peak, <b>latency budget</b>, <b>consistency</b> (must the reader see the latest write?), and whether it must change <b>several records atomically</b>.</li>
<li>Estimate <b>sizes</b>: item size, items per key, growth per day. This tells you about partition limits and document limits.</li>
<li>Map each pattern to a key design. Patterns that share a key share a table/collection; patterns with different keys need an index (GSI, secondary index) or a duplicated table.</li>
</ol>
<p>It is normal for one product to use several stores (polyglot persistence): orders in PostgreSQL, sessions and leaderboards in Redis, the activity feed in Cassandra or DynamoDB, the catalogue in MongoDB. Each choice must be justified by a pattern, not by fashion.</p>`,
    clues: [
      '"we know exactly how the data will be read" / "list the access patterns" → query-first NoSQL modelling',
      '"sub-millisecond", "session", "leaderboard", "rate limit" → Redis data structures',
      '"millions of writes per second", "time series", "multi-region active-active" → Cassandra / ScyllaDB',
      '"serverless", "pay per request", "single-digit ms at any scale" → DynamoDB',
      '"products with different attributes", "evolving schema", "read the whole aggregate" → MongoDB documents',
      '"ad-hoc reports", "unknown future queries", "transfer money between accounts" → stay relational'
    ],
    code: [
      { lang: 'sql', db: 'design', title: 'The access-pattern inventory (runnable)', code: `-- Every NoSQL design starts as a spreadsheet like this.
-- read_write_ratio tells you whether to optimise reads (denormalise, cache)
-- or writes (append-only, LSM stores like Cassandra).
SELECT id,
       pattern,
       shape,
       reads_s + writes_s                          AS total_ops_s,
       ROUND(1.0 * reads_s / MAX(writes_s, 1), 1)   AS read_write_ratio,
       CASE WHEN needs_txn = 1 THEN 'yes' ELSE 'no' END AS atomic_multi_record
FROM access_patterns
ORDER BY total_ops_s DESC;` },
      { lang: 'text', check: false, title: 'The same patterns, written as keys', code: `PATTERN                               KEY THE CALLER HAS        STORE / KEY DESIGN
get session by token                  token                     Redis   HASH session:{token}  (EX 1800)
user timeline newest first            user_id                   Cassandra PRIMARY KEY ((user_id, month), ts) DESC
product page with variant attributes  product_id                MongoDB  products { _id, attrs: {...}, variants: [...] }
checkout: reserve stock + charge      order_id, sku list        PostgreSQL transaction (or DynamoDB TransactWriteItems)
finance ad-hoc report                 anything                  warehouse / PostgreSQL replica
get order by id                       order_id                  DynamoDB PK = ORDER#{id}
live like counter                     post_id                   Redis INCR likes:{post_id} -> flushed to DB
friends of friends                    user_id                   graph DB or adjacency list + cache` }
    ],
    codeTitle: ['Access-pattern inventory', 'Patterns → key designs'],
    viz: {
      title: 'Route each access pattern to a store',
      input: 'session, timeline, catalog, checkout, report, leaderboard',
      inputLabel: 'comma-separated patterns from: session, timeline, catalog, checkout, report, leaderboard, order-by-id, sensor-ingest, rate-limit, social-graph',
      gen: function (input) {
        var RULES = {
          'session': ['key lookup + TTL, 1 ms budget', 'Redis', 'HASH session:{token} with EXPIRE; lost sessions are only an inconvenience'],
          'timeline': ['range by user, newest first, write-heavy', 'Cassandra', 'partition (user_id, month), clustering ts DESC'],
          'catalog': ['whole aggregate, varied attributes', 'MongoDB', 'one document per product with an attrs sub-document'],
          'checkout': ['several records must change atomically', 'PostgreSQL', 'one ACID transaction across stock, order, payment'],
          'report': ['ad-hoc filters and joins', 'PostgreSQL', 'unknown questions need a query planner and indexes on demand'],
          'leaderboard': ['ranked by score, top-N', 'Redis', 'ZSET: ZINCRBY + ZREVRANGE in O(log n)'],
          'order-by-id': ['single-key lookup at scale', 'DynamoDB', 'PK = ORDER#{id}, GetItem'],
          'sensor-ingest': ['append-only time series', 'Cassandra', 'partition (sensor_id, day), clustering ts'],
          'rate-limit': ['counter per window, 1 ms budget', 'Redis', 'INCR + EXPIRE or a ZSET sliding window'],
          'social-graph': ['multi-hop traversal', 'Graph DB', 'edges as first-class records (Neo4j) or adjacency lists']
        };
        var toks = String(input || '').split(',').map(function (s) { return s.trim().toLowerCase(); }).filter(Boolean);
        if (!toks.length || toks.length > 10) throw new Error('Give 1..10 patterns separated by commas, e.g. session, timeline, checkout');
        toks.forEach(function (t) { if (!RULES[t]) throw new Error('Unknown pattern "' + t + '". Use: ' + Object.keys(RULES).join(', ')); });
        var frames = [], rows = [], counts = {};
        var stores = ['Redis', 'MongoDB', 'Cassandra', 'DynamoDB', 'PostgreSQL', 'Graph DB'];
        frames.push({ narr: 'Start from the <b>menu</b>: ' + toks.length + ' access patterns. For each we ask: what key does the caller have, what order, how fast, and must several records change together?', parts: [
          { type: 'table', label: 'Pattern worksheet', columns: ['pattern', 'shape', 'store', 'key design'], rows: toks.map(function (t) { return [t, '?', '?', '?']; }) }
        ] });
        toks.forEach(function (t, i) {
          var r = RULES[t];
          rows.push([t, r[0], r[1], r[2]]);
          counts[r[1]] = (counts[r[1]] || 0) + 1;
          var hl = {}; hl[i] = 'cur';
          frames.push({ narr: 'Pattern <b>' + t + '</b>: shape = <i>' + r[0] + '</i> → <b>' + r[1] + '</b>. Why: ' + r[2] + '.', parts: [
            { type: 'table', label: 'Pattern worksheet', columns: ['pattern', 'shape', 'store', 'key design'], rows: rows.concat(toks.slice(i + 1).map(function (x) { return [x, '?', '?', '?']; })), hl: hl },
            { type: 'bars', label: 'Patterns per store', values: stores.map(function (s) { return counts[s] || 0; }), idxLabels: stores, hl: (function () { var h = {}; h[stores.indexOf(r[1])] = 'ok'; return h; })() }
          ] });
        });
        var used = stores.filter(function (s) { return counts[s]; });
        frames.push({ narr: 'Result: <b>' + used.length + '</b> store(s): ' + used.join(', ') + '. ' + (used.length > 2 ? 'Polyglot persistence is normal, but every extra store costs operations, backups and on-call knowledge, so merge patterns into one store when the latency and scale allow it.' : 'Few stores, simple operations. Good.'), parts: [
          { type: 'bars', label: 'Patterns per store', values: stores.map(function (s) { return counts[s] || 0; }), idxLabels: stores },
          { type: 'text', html: '<b>Rule:</b> name the pattern first, then the store. A store chosen without a pattern list is a guess.' }
        ] });
        return frames;
      }
    },
    examples: [
      { title: 'Read/write ratio decides the optimisation', html: `<p>Run the inventory query. The timeline (80 000 ops/s, ratio 1.7) and the like counter (65 000 ops/s, ratio 1.6) are write-heavy: they want append-friendly stores (Cassandra's LSM tree, Redis in RAM). The product page (ratio 160) is read-heavy: denormalise it into one document and cache it. Checkout is tiny in volume but needs atomicity, which matters more than speed.</p>`, code: { lang: 'sql', db: 'design', code: `SELECT pattern, reads_s, writes_s,
       CASE WHEN writes_s * 2 >= reads_s THEN 'write-heavy' ELSE 'read-heavy' END AS profile
FROM access_patterns
ORDER BY writes_s DESC;` } },
      { title: 'Sizing tells you if a key will break', html: `<p>Timeline: 30 000 writes/s, 300-byte entries, 50 M users. Per user per month that averages ~16 entries, fine. But a celebrity account can receive 1 000 entries/s, which is 2.6 billion bytes/month in one partition if you key by user alone, far over Cassandra's ~100 MB comfort zone. The size estimate is what forces a <b>bucket</b> (month, day or hour) into the key.</p>`, code: { lang: 'sql', code: `-- back-of-envelope sizing, runnable anywhere
SELECT 1000 * 86400 * 30 * 300 / 1e9           AS celebrity_gb_per_month_one_partition,
       1000 * 3600 * 300 / 1e6                  AS mb_per_hour_bucket;` } },
      { title: 'When the honest answer is "stay relational"', html: `<p>An interviewer asks for a "NoSQL design" of an expense app with 2 000 users, monthly reports by any category, and approvals that update an expense and a budget together. Every pattern points at PostgreSQL: tiny scale, ad-hoc queries, multi-row transactions. Saying so, with the reasons, scores higher than forcing DynamoDB. Revisit only if a single pattern (say, an audit log at 50 000 writes/s) outgrows it.</p>`, code: { lang: 'sql', db: 'design', code: `SELECT pattern FROM access_patterns
WHERE needs_txn = 1 OR shape = 'adhoc';   -- patterns that pull you toward SQL` } }
    ],
    deepDive: `<p><b>Why query-first?</b> Distributed stores give fast, predictable latency by guaranteeing that a request touches <b>one partition</b> (or one document). Joins and ad-hoc filters would require scatter-gather across nodes, so these stores either do not offer them (Cassandra, DynamoDB) or make them expensive at scale (MongoDB <code>$lookup</code> across shards). You pay with <b>duplication</b>: the same message may live in a by-channel table and a by-author table, so writes fan out and you must keep copies consistent (batches, transactions, CDC, idempotent retries).</p>
<p><b>Picking between the four.</b> MongoDB when the natural unit is a rich aggregate and you still want secondary indexes and ad-hoc-ish queries. DynamoDB when you want no servers to run, predictable single-digit-ms key access, and you can enumerate patterns up front. Cassandra/ScyllaDB when write throughput, multi-datacenter writes or cost at petabyte scale dominate and you can run the cluster (or buy Astra/Keyspaces). Redis in front of any of them for hot, small, short-lived data, or as the primary store only when losing a little data is acceptable or you run it with AOF + replicas and accept the memory cost.</p>
<p><b>Hidden requirements</b> that flip decisions: secondary access patterns discovered later (DynamoDB GSIs can be added online, Cassandra needs a new table and a backfill), analytics (export to a warehouse via CDC: DynamoDB Streams, MongoDB change streams, Cassandra CDC), compliance deletes (find every copy of a user's data), and cost model (DynamoDB on-demand vs provisioned, Redis RAM price per GB).</p>`,
    aiEra: `<p><b>What AI changes:</b> an assistant can turn a product spec into a draft access-pattern table in seconds and propose keys for each store. It is also good at spotting a missing pattern ("you list orders by customer, but how does support find an order by id?").</p>
<p><b>Use AI as a partner:</b> paste your worksheet and ask <code>"For each pattern, give the key design in DynamoDB and Cassandra, the expected item size and items per partition, and flag any pattern that needs a scan."</code> Then check the arithmetic yourself.</p>
<p><b>Where AI goes wrong:</b> it names a database before listing patterns, recommends MongoDB for everything because it is "flexible", ignores per-partition throughput limits, or forgets that some patterns need transactions. <b>What you must own:</b> the list of patterns, the numbers, and the judgement that a boring relational database is often the right answer.</p>`,
    problems: [{
      title: 'Apply the Store Rubric',
      level: 'Easy', tags: ['access patterns', 'CASE', 'store selection'], companies: ['Amazon', 'Uber', 'Flipkart'],
      statement: `<p>Your team agreed on a rubric for choosing a store per access pattern. Apply the <b>first matching rule</b> to every row of <code>access_patterns</code>:</p>
<ol><li><code>needs_txn = 1</code> or <code>shape = 'adhoc'</code> → <code>relational</code></li>
<li><code>p99_ms ≤ 1</code> → <code>redis</code></li>
<li><code>shape = 'graph'</code> → <code>graph</code></li>
<li><code>shape = 'nested'</code> → <code>mongodb</code></li>
<li><code>shape = 'range'</code> and <code>writes_s ≥ 10000</code> → <code>cassandra</code></li>
<li>otherwise → <code>dynamodb</code></li></ol>
<p>Return <code>id, store</code> ordered by id (db <code>design</code>).</p>`,
      constraints: `Rule order matters: a 1 ms pattern that needs a transaction is still relational.`,
      example: `<p>Pattern 4 (checkout) needs a transaction → ${H.c('g', 'relational')}. Pattern 2 (timeline) is a range with 30 000 writes/s → ${H.c('g', 'cassandra')}. Pattern 6 (order by id) matches nothing earlier → ${H.c('b', 'dynamodb')}.</p>`,
      brute: { why: `<p>Deciding by gut feeling ("we use MongoDB for everything") gives one answer for every row and hides the real requirement of each pattern. It is the most common weak answer in design interviews.</p>`, code: { lang: 'sql', db: 'design', code: `SELECT id, 'mongodb' AS store   -- one store for every pattern, no reasoning
FROM access_patterns
ORDER BY id;` } },
      mcq: { q: 'A pattern needs a 1 ms p99 and must update two records atomically. Under this rubric?', options: ['relational, because rule 1 is checked first', 'redis, because of the latency', 'dynamodb, the default', 'both redis and relational'], answer: 0, explain: 'CASE returns the first branch that matches, and correctness (atomicity) is deliberately ranked above speed.' },
      hints: [
        `<p>Hint 1: "first matching rule" is exactly how a SQL <code>CASE WHEN ... WHEN ... ELSE ... END</code> behaves.</p>`,
        `<p>Hint 2: Put the rules in the same order as the list; combine rule 1's two conditions with OR.</p>`,
        `<p>Hint 3: Use <code>&gt;=</code> for the 10 000 boundary and <code>&lt;=</code> for 1 ms; order the output by id.</p>`
      ],
      tests: { engine: 'sqlite', cmp: 'exact', cases: [
        { rows: [[1, 'redis'], [2, 'cassandra'], [3, 'mongodb'], [4, 'relational'], [5, 'relational'], [6, 'dynamodb'], [7, 'redis'], [8, 'graph']] },
        { setup: 'UPDATE access_patterns SET writes_s = 5000 WHERE id = 2', rows: [[1, 'redis'], [2, 'dynamodb'], [3, 'mongodb'], [4, 'relational'], [5, 'relational'], [6, 'dynamodb'], [7, 'redis'], [8, 'graph']] },
        { setup: 'UPDATE access_patterns SET needs_txn = 1 WHERE id = 1', rows: [[1, 'relational'], [2, 'cassandra'], [3, 'mongodb'], [4, 'relational'], [5, 'relational'], [6, 'dynamodb'], [7, 'redis'], [8, 'graph']] },
        { setup: 'DELETE FROM access_patterns', rows: [] },
        { setup: "DELETE FROM access_patterns WHERE id > 1; INSERT INTO access_patterns VALUES (9, 'quick filter', 'adhoc', 10, 0, 0, 1)", rows: [[1, 'redis'], [9, 'relational']] },
        { setup: 'UPDATE access_patterns SET p99_ms = 1 WHERE id = 3', rows: [[1, 'redis'], [2, 'cassandra'], [3, 'redis'], [4, 'relational'], [5, 'relational'], [6, 'dynamodb'], [7, 'redis'], [8, 'graph']] },
        { setup: "UPDATE access_patterns SET shape = 'range', writes_s = 10000 WHERE id = 6", rows: [[1, 'redis'], [2, 'cassandra'], [3, 'mongodb'], [4, 'relational'], [5, 'relational'], [6, 'cassandra'], [7, 'redis'], [8, 'graph']] }
      ] },
      solution: {
        approach: `<p>Translate the rubric into one <code>CASE</code> expression in the same order. CASE stops at the first true branch, which encodes the priority "correctness, then latency, then shape, then scale".</p>`,
        code: { lang: 'sql', db: 'design', code: `SELECT id,
       CASE
         WHEN needs_txn = 1 OR shape = 'adhoc'          THEN 'relational'
         WHEN p99_ms <= 1                               THEN 'redis'
         WHEN shape = 'graph'                           THEN 'graph'
         WHEN shape = 'nested'                          THEN 'mongodb'
         WHEN shape = 'range' AND writes_s >= 10000     THEN 'cassandra'
         ELSE 'dynamodb'
       END AS store
FROM access_patterns
ORDER BY id;` },
        complexity: `<p>One pass over the patterns: O(n). The real cost is the thinking that produced the rubric.</p>`,
        followUps: ['Which rule would you add for "must survive a region outage with writes in both regions"?', 'Where would full-text search fit in this rubric?']
      }
    }]
  });

  /* =====================================================================
     TOPIC 2 — MongoDB document design: embed vs reference
     ===================================================================== */
  topics.push({
    title: 'MongoDB Document Design: Embed vs Reference and the Schema Patterns',
    analogy: `<p>Packing for a trip: things you always use together go <b>in the same suitcase</b> (passport, tickets, charger). Things you rarely need, or that keep growing (souvenirs), go in a <b>separate box</b> with a label on the suitcase saying where it is. Embedding is the suitcase; referencing is the labelled box. Overpack the suitcase and the airline refuses it (MongoDB's 16 MB document limit).</p>`,
    explain: `<p>A MongoDB document is a JSON-like (BSON) object of up to <b>16 MB</b>. Writes to <b>one document are atomic</b>, even when they touch several nested fields. The core design rule: <b>data that is read together should be stored together</b>.</p>
${H.table(['Relationship', 'Default choice', 'Why'], [
  ['one-to-one (user → profile settings)', '<b>embed</b>', 'always read together, never shared'],
  ['one-to-few (order → its 1-50 lines, user → 3 addresses)', '<b>embed</b> an array', 'bounded, read with the parent, updated atomically'],
  ['one-to-many (post → thousands of comments)', '<b>reference</b> (child stores parent id) + maybe embed a <i>subset</i>', 'unbounded arrays grow documents, slow updates, can hit 16 MB'],
  ['one-to-squillions (host → billions of log lines)', '<b>reference from the child</b> only', 'the parent cannot hold even the ids'],
  ['many-to-many (students ↔ courses)', 'arrays of ids on one or both sides', 'pick the side that is queried; keep arrays bounded']
])}
<p><b>The named schema patterns</b> (MongoDB's own vocabulary, worth using in interviews):</p>
<ul>
<li><b>Extended reference</b>: copy the few fields you display (customer name, city) into the order, plus the customer id. Avoids a <code>$lookup</code> on every read; the copy is a <i>snapshot</i> or must be updated when the source changes.</li>
<li><b>Subset</b>: embed the newest N comments and a <code>comment_count</code>; keep the full list in a <code>comments</code> collection.</li>
<li><b>Computed</b>: store totals (order total, rating average) at write time instead of recomputing on every read.</li>
<li><b>Bucket</b>: group many small events into one document per time window (one document per sensor per hour with a <code>readings</code> array and min/max/count). Time-series collections (MongoDB 5.0+) do this for you internally.</li>
<li><b>Outlier</b>: most books have few reviews and embed them; a flag <code>has_overflow: true</code> sends the rare bestseller to an overflow collection.</li>
<li><b>Schema versioning</b>: a <code>schema_version</code> field lets old and new shapes coexist; code reads both and migrates lazily.</li>
<li><b>Polymorphic</b>: different product kinds in one collection, sharing common fields; <code>$jsonSchema</code> validation can still enforce the required ones.</li>
</ul>
<p>Flexible does not mean schemaless in production: use <b>schema validation</b> (<code>$jsonSchema</code> on the collection) for required fields and types.</p>`,
    clues: [
      '"read together" / "always displayed with" → embed',
      '"grows without bound" / "thousands of comments" → reference (child holds parent id), maybe subset pattern',
      '"document too large", "16 MB" → split: bucket, subset or outlier pattern',
      '"show customer name on every order without a join" → extended reference (accept staleness or update copies)',
      '"we changed the document shape last month" → schema versioning pattern + lazy migration',
      '"atomic update of the order and its lines" → embed so it is one document'
    ],
    code: [
      { lang: 'js', check: false, title: 'MongoDB shell: embed, subset and validation', code: `// Order embeds its lines and an extended reference to the customer
db.orders.insertOne({
  _id: "o1",
  customer: { id: 1, name: "Asha", city: "Pune" },   // snapshot copy (extended reference)
  status: "paid",
  placed: ISODate("2026-09-01"),
  items: [ { sku: "PEN", qty: 3, price: 40 }, { sku: "BOOK", qty: 1, price: 450 } ],
  total: 570                                         // computed pattern
});

// Subset pattern: push the new comment to the comments collection AND keep only the newest 2 embedded
db.comments.insertOne({ post_id: "p3", by: "Omar", at: ISODate(), text: "late but great" });
db.posts.updateOne(
  { _id: "p3" },
  { $inc: { comment_count: 1 },
    $push: { recent_comments: { $each: [ { by: "Omar", text: "late but great" } ],
                                $position: 0, $slice: 2 } } }
);

// Enforce required fields even in a "flexible" collection
db.runCommand({
  collMod: "orders",
  validator: { $jsonSchema: {
    bsonType: "object",
    required: ["customer", "status", "items"],
    properties: { status: { enum: ["pending", "paid", "shipped", "cancelled"] },
                  items:  { bsonType: "array", maxItems: 200 } } } },
  validationLevel: "strict"
});` },
      { lang: 'sql', db: 'mongo', title: 'Find documents at risk: array length per post (runnable)', code: `-- json_array_length plays the role of $size.
-- p1 embeds every comment (fine while small); p2/p3 use the subset pattern.
SELECT _id,
       json_extract(body, '$.title')                              AS title,
       json_array_length(body, '$.comments')                      AS embedded_all,
       json_array_length(body, '$.recent_comments')               AS embedded_subset,
       json_extract(body, '$.comment_count')                      AS total_comments,
       length(body)                                               AS doc_bytes
FROM posts
ORDER BY _id;` }
    ],
    codeTitle: ['Mongo shell', 'Array sizes in SQLite'],
    viz: {
      title: 'Embed or reference? Watch the document grow',
      input: '3, 40, 2000, 60000 | 400',
      inputLabel: 'children per parent (comma list, up to 8) | bytes per child',
      gen: function (input) {
        var parts = String(input || '').split('|');
        if (parts.length !== 2) throw new Error('Format: counts | bytes   e.g.  3, 40, 2000 | 400');
        var counts = parts[0].split(',').map(function (s) { return Number(s.trim()); });
        var size = Number(parts[1].trim());
        if (!counts.length || counts.length > 8 || counts.some(function (n) { return !(n >= 0) || n > 1e8 || Math.floor(n) !== n; })) throw new Error('Counts must be 1..8 whole numbers between 0 and 100000000');
        if (!(size > 0 && size <= 100000)) throw new Error('Bytes per child must be 1..100000');
        var LIMIT = 16 * 1024 * 1024, frames = [], mbs = [], labels = [];
        frames.push({ narr: 'A parent document (about 1 KB of its own fields) can <b>embed</b> its children in an array, or the children can live in their own collection and <b>reference</b> the parent. MongoDB refuses documents over <b>16 MB</b>; long before that, big documents waste RAM and I/O because every read and update moves the whole document.', parts: [
          { type: 'vars', label: 'Inputs', vals: { child_bytes: size, doc_limit: '16 MB', parent_fields: '1 KB' } }
        ] });
        counts.forEach(function (n) {
          var bytes = 1024 + n * size, mb = bytes / 1048576;
          mbs.push(Math.round(mb * 100) / 100); labels.push(String(n));
          var verdict, cls;
          if (bytes > LIMIT) { verdict = '<span class="c-r">Impossible to embed</span>: ' + mb.toFixed(1) + ' MB is over the 16 MB limit. Reference from the child (child stores parent_id, indexed).'; cls = 'bad'; }
          else if (n > 200 || bytes > 1048576) { verdict = '<span class="c-y">Embedding works but hurts</span>: ' + mb.toFixed(2) + ' MB per read. Use the <b>subset</b> pattern (embed newest N + a count) and reference the rest.'; cls = 'cur'; }
          else { verdict = '<span class="c-g">Embed</span>: ' + (bytes / 1024).toFixed(1) + ' KB, bounded, read together, atomic updates for free.'; cls = 'ok'; }
          var hl = {}; hl[mbs.length - 1] = cls;
          frames.push({ narr: n + ' children × ' + size + ' B → parent document ≈ <b>' + (bytes / 1024).toFixed(1) + ' KB</b>. ' + verdict, parts: [
            { type: 'bars', label: 'Embedded document size (MB); limit = 16', values: mbs.slice(), idxLabels: labels.slice(), hl: hl },
            { type: 'vars', label: 'This case', vals: { children: n, doc_kb: Math.round(bytes / 1024), percent_of_16mb: (100 * bytes / LIMIT).toFixed(2) + '%' } }
          ] });
        });
        frames.push({ narr: 'Summary: <b>bounded and read together → embed</b>; <b>unbounded → reference</b>, optionally with a small embedded subset for the first screen. Ask "what is the maximum?" for every array in an interview.', parts: [
          { type: 'table', label: 'Decision', columns: ['children', 'approx size', 'design'], rows: counts.map(function (n) { var b = 1024 + n * size; return [n, (b / 1024).toFixed(1) + ' KB', b > LIMIT ? 'reference' : (n > 200 || b > 1048576 ? 'subset + reference' : 'embed')]; }) }
        ] });
        return frames;
      }
    },
    examples: [
      { title: 'Extended reference: no join to show the customer', html: `<p>Each order copies <code>customer.name</code> and <code>customer.city</code>. The order list renders from one collection. If Asha renames herself, old orders keep the name she had then, which is often what invoices legally need. If you need the new name everywhere, update copies with <code>updateMany({"customer.id": 1}, {$set: {"customer.name": ...}})</code> asynchronously.</p>`, code: { lang: 'sql', db: 'mongo', code: `-- db.orders.find({}, {"customer.name": 1, status: 1})
SELECT _id, json_extract(body, '$.customer.name') AS customer, json_extract(body, '$.status') AS status
FROM orders ORDER BY _id;` } },
      { title: 'Subset pattern: the post page reads one document', html: `<p>Post p3 has 5 comments in the <code>comments</code> collection but embeds only the 2 newest plus a count. The first screen needs one read; "load more" queries <code>comments</code> by <code>post_id</code> with an index on <code>{post_id: 1, at: -1}</code>.</p>`, code: { lang: 'sql', db: 'mongo', code: `SELECT json_extract(body, '$.comment_count')            AS shown_count,
       json_extract(r.value, '$.by')                     AS recent_by
FROM posts, json_each(posts.body, '$.recent_comments') AS r
WHERE posts._id = 'p3';` } },
      { title: 'Polymorphic catalogue', html: `<p>Products share <code>name</code>, <code>price</code>, <code>category</code> but each has different <code>attrs</code> (ink colour, page count, wattage). In SQL this becomes an EAV table or many nullable columns; in a document it is natural. Index the shared fields, and add a wildcard index (<code>{"attrs.$**": 1}</code>) only if users filter on arbitrary attributes.</p>`, code: { lang: 'sql', db: 'mongo', code: `SELECT p._id, a.key AS attribute, a.value
FROM products AS p, json_each(p.body, '$.attrs') AS a
ORDER BY p._id, a.key;` } }
    ],
    deepDive: `<p><b>Atomicity and transactions.</b> A single-document write is atomic and isolated, which is the main reason to embed data that changes together. Multi-document ACID transactions exist (replica sets since 4.0, sharded clusters since 4.2), but they hold locks, have a default 60-second lifetime, and add latency; MongoDB's own guidance is to model so that most writes stay in one document.</p>
<p><b>Why big documents hurt before 16 MB.</b> WiredTiger caches whole documents; updating one field of a 2 MB document rewrites and replicates a large change, and arrays with thousands of elements make <code>$push</code>, index maintenance (multikey indexes create one index entry per array element) and the working set expensive. Rule of thumb: keep hot documents in the KB range and arrays bounded (validators can enforce <code>maxItems</code>).</p>
<p><b>Indexes on documents.</b> Compound indexes follow the <b>ESR rule</b> (Equality fields, then Sort, then Range). Multikey indexes index array elements; a compound index can contain at most one array field. Partial indexes (<code>partialFilterExpression</code>), TTL indexes (expire documents by a date field), and wildcard indexes (MongoDB 7 adds compound wildcard indexes) cover the remaining cases.</p>
<p><b>Sharding the design.</b> Pick a shard key that matches the main query and spreads writes: <code>{customer_id: 1, _id: 1}</code> or a hashed key. Monotonic keys (ObjectId, timestamps) send every insert to one chunk. Since 5.0 a collection can be <b>resharded</b> online, but it is a heavy operation, so choose carefully.</p>`,
    aiEra: `<p><b>What AI changes:</b> LLMs produce and consume JSON, so document stores are a natural fit for AI features (storing prompts, tool results, agent memory). MongoDB Atlas Vector Search keeps embeddings in the same document as the content, which is the subset/extended-reference idea applied to vectors.</p>
<p><b>Use AI as a partner:</b> give it a sample relational schema and the read patterns, and ask for a document design that names the pattern used for each relationship (embed, subset, extended reference, bucket) plus the maximum size of each array.</p>
<p><b>Where AI goes wrong:</b> it happily embeds unbounded arrays ("comments: [...]") and copies relational foreign keys everywhere, producing a normalised schema with <code>$lookup</code> on every read. It rarely mentions staleness of extended references. <b>What you must own:</b> the bounds of every array and the update path for every duplicated field.</p>`,
    problems: [{
      title: 'Refresh the Subset: Two Newest Comments per Post',
      level: 'Medium', tags: ['mongodb', 'subset pattern', 'top-n per group', 'json'], companies: ['Reddit', 'Medium', 'MongoDB'],
      statement: `<p>Posts use the <b>subset pattern</b>: the full comment list lives in the <code>comments</code> collection (<code>body.post_id</code>, <code>body.by</code>, <code>body.at</code>), and each post embeds its <b>2 newest</b> comments. A background job recomputes what should be embedded.</p>
<p>Return <code>post_id, author, at</code> for the 2 newest comments of every post (by <code>at</code>; on a tie the larger <code>_id</code> wins), ordered by <code>post_id</code>, then <code>at</code> descending, then <code>_id</code> descending. Database <code>mongo</code>.</p>`,
      constraints: `Comments per post are unbounded. <code>at</code> strings are ISO timestamps, so string order is time order.`,
      example: `<p>p3 has comments at 08:00, 09:00, 10:00, 11:00, 12:00 → keep ${H.c('g', 'Zara 12:00')} and ${H.c('g', 'Leo 11:00')}. p2 has one comment → ${H.c('g', 'Asha')}.</p>`,
      brute: { why: `<p>Embedding <b>every</b> comment and slicing in the application means each post read ships the whole array, and a viral post can approach the 16 MB limit. In SQL terms, the naive version below fetches everything and leaves the top-2 to the client.</p>`, code: { lang: 'sql', db: 'mongo', code: `SELECT json_extract(body, '$.post_id') AS post_id,
       json_extract(body, '$.by')      AS author,
       json_extract(body, '$.at')      AS at
FROM comments
ORDER BY post_id, at DESC;           -- every comment; the client throws most away` } },
      mcq: { q: 'Which MongoDB update keeps only the 2 newest comments embedded when a new one arrives?', options: ['$push with $each, $position: 0 and $slice: 2', '$addToSet', '$set the whole array from the client', '$pull the oldest comment'], answer: 0, explain: '$push with $position: 0 puts the new element first and $slice: 2 trims the array in the same atomic update.' },
      hints: [
        `<p>Hint 1: Pull the fields out of JSON first: <code>json_extract(body, '$.post_id')</code>, <code>'$.by'</code>, <code>'$.at'</code>.</p>`,
        `<p>Hint 2: "N newest per group" is <code>ROW_NUMBER() OVER (PARTITION BY post_id ORDER BY at DESC, _id DESC)</code>.</p>`,
        `<p>Hint 3: Keep rows with rank ≤ 2 and remember the tie-breaker in the final ORDER BY too.</p>`
      ],
      tests: { engine: 'sqlite', cmp: 'exact', cases: [
        { rows: [['p2', 'Asha', '2026-09-04T10:00'], ['p3', 'Zara', '2026-09-03T12:00'], ['p3', 'Leo', '2026-09-03T11:00']] },
        { setup: `INSERT INTO comments VALUES ('c7', '{"post_id":"p3","by":"Omar","at":"2026-09-03T13:00","text":"late"}')`, rows: [['p2', 'Asha', '2026-09-04T10:00'], ['p3', 'Omar', '2026-09-03T13:00'], ['p3', 'Zara', '2026-09-03T12:00']] },
        { setup: 'DELETE FROM comments', rows: [] },
        { setup: "DELETE FROM comments WHERE _id = 'c6'", rows: [['p3', 'Zara', '2026-09-03T12:00'], ['p3', 'Leo', '2026-09-03T11:00']] },
        { setup: `INSERT INTO comments VALUES ('c8', '{"post_id":"p2","by":"Ben","at":"2026-09-04T10:00","text":"same time"}')`, rows: [['p2', 'Ben', '2026-09-04T10:00'], ['p2', 'Asha', '2026-09-04T10:00'], ['p3', 'Zara', '2026-09-03T12:00'], ['p3', 'Leo', '2026-09-03T11:00']] },
        { setup: `INSERT INTO comments VALUES ('c9', '{"post_id":"p9","by":"Kai","at":"2026-09-10T00:00","text":"hi"}')`, rows: [['p2', 'Asha', '2026-09-04T10:00'], ['p3', 'Zara', '2026-09-03T12:00'], ['p3', 'Leo', '2026-09-03T11:00'], ['p9', 'Kai', '2026-09-10T00:00']] }
      ] },
      solution: {
        approach: `<p>Extract the fields, rank comments per post newest-first with a deterministic tie-breaker, keep ranks 1 and 2. In MongoDB the same job is <code>$sort</code> + <code>$group</code> with <code>$topN</code> (5.2+) or <code>$setWindowFields</code>, followed by <code>$merge</code> into posts.</p>`,
        code: { lang: 'sql', db: 'mongo', code: `WITH c AS (
  SELECT _id,
         json_extract(body, '$.post_id') AS post_id,
         json_extract(body, '$.by')      AS author,
         json_extract(body, '$.at')      AS at
  FROM comments
), ranked AS (
  SELECT c.*, ROW_NUMBER() OVER (PARTITION BY post_id ORDER BY at DESC, _id DESC) AS rn
  FROM c
)
SELECT post_id, author, at
FROM ranked
WHERE rn <= 2
ORDER BY post_id, at DESC, _id DESC;` },
        alt: [{ lang: 'js', check: false, title: 'MongoDB aggregation ($topN, 5.2+)', code: `db.comments.aggregate([
  { $group: {
      _id: "$post_id",
      recent: { $topN: { n: 2, sortBy: { at: -1, _id: -1 },
                         output: { by: "$by", at: "$at", text: "$text" } } },
      count: { $sum: 1 } } },
  { $project: { _id: 1, recent_comments: "$recent", comment_count: "$count" } },
  { $merge: { into: "posts", on: "_id", whenMatched: "merge", whenNotMatched: "discard" } }
]);` }],
        complexity: `<p>O(n log n) to sort comments per post (O(n) with an index on <code>{post_id: 1, at: -1}</code>). In production the subset is maintained incrementally on each new comment with <code>$push/$slice</code>; the batch job only repairs drift.</p>`,
        followUps: ['How do you keep comment_count correct if a comment is deleted?', 'When would you switch a post from embedding all comments to the subset pattern (outlier pattern)?']
      }
    }]
  });

  /* =====================================================================
     TOPIC 3 — MongoDB aggregation pipeline
     ===================================================================== */
  topics.push({
    title: 'The MongoDB Aggregation Pipeline: $match, $unwind, $group, $lookup',
    analogy: `<p>An <b>assembly line</b> in a factory: raw parts enter at one end, and each station does one job (throw away defective parts, unpack boxes, sort into bins, count the bins) before passing the result to the next station. The aggregation pipeline is that line for documents. Putting the "throw away" station first means every later station handles less.</p>`,
    explain: `<p><code>db.collection.aggregate([stage1, stage2, ...])</code> streams documents through stages; each stage's output is the next stage's input. The common stages map closely to SQL:</p>
${H.table(['Stage', 'What it does', 'SQL analogue'], [
  ['<code>$match</code>', 'filter documents (can use indexes when it is first)', '<code>WHERE</code> / <code>HAVING</code>'],
  ['<code>$project</code> / <code>$set</code> (<code>$addFields</code>)', 'reshape, compute fields', 'SELECT list expressions'],
  ['<code>$unwind</code>', 'one output document per array element', '<code>CROSS JOIN json_each(...)</code> / <code>LATERAL unnest</code>'],
  ['<code>$group</code>', 'group by <code>_id</code> expression with accumulators (<code>$sum</code>, <code>$avg</code>, <code>$push</code>, <code>$addToSet</code>, <code>$topN</code>)', '<code>GROUP BY</code> + aggregates'],
  ['<code>$sort</code>, <code>$limit</code>, <code>$skip</code>', 'order and page', '<code>ORDER BY</code>, <code>LIMIT</code>, <code>OFFSET</code>'],
  ['<code>$lookup</code>', 'left outer join to another collection (with optional sub-pipeline)', '<code>LEFT JOIN</code>'],
  ['<code>$facet</code>', 'several sub-pipelines over the same input', 'several queries over one CTE'],
  ['<code>$setWindowFields</code> (5.0+)', 'running totals, ranks, moving averages', 'window functions'],
  ['<code>$merge</code> / <code>$out</code>', 'write the result into a collection', '<code>INSERT ... SELECT</code> / materialized view']
])}
<p><b>Ordering rules that matter for speed:</b> put <code>$match</code> (and a <code>$sort</code> that an index can provide) <b>first</b> so the planner can use an index and later stages see fewer documents. <code>$unwind</code> multiplies documents (an order with 10 lines becomes 10 documents), so filter before it when you can. <code>$group</code> and <code>$sort</code> without an index are blocking stages that hold data in memory; each stage has a 100 MB memory limit, and since MongoDB 6.0 such stages spill to disk by default (<code>allowDiskUseByDefault</code>).</p>
<p><b>$unwind gotcha:</b> documents whose array is empty or missing disappear, like an inner join. Use <code>{ $unwind: { path: "$items", preserveNullAndEmptyArrays: true } }</code> to keep them, like a LEFT JOIN.</p>`,
    clues: [
      '"total per product across all orders" (array inside documents) → $unwind then $group',
      '"top N per group" → $sort + $group with $first/$topN, or $setWindowFields',
      '"join orders with products" → $lookup (and ask whether an extended reference would avoid it)',
      '"dashboard with several counts in one round trip" → $facet',
      '"pipeline is slow" → is $match first and indexed? is $unwind multiplying rows before a filter?',
      '"precompute a report nightly" → $merge into a summary collection (on-demand materialized view)'
    ],
    code: [
      { lang: 'js', check: false, title: 'Revenue per SKU for paid orders (Mongo shell)', code: `db.orders.aggregate([
  { $match: { status: "paid" } },                       // 1. filter first (uses an index on status)
  { $unwind: "$items" },                                // 2. one document per order line
  { $group: {                                           // 3. GROUP BY sku
      _id: "$items.sku",
      units:   { $sum: "$items.qty" },
      revenue: { $sum: { $multiply: ["$items.qty", "$items.price"] } } } },
  { $sort: { revenue: -1, _id: 1 } },                   // 4. ORDER BY
  { $lookup: {                                          // 5. LEFT JOIN products for the display name
      from: "products", localField: "_id", foreignField: "_id", as: "product" } },
  { $set: { name: { $first: "$product.name" } } },
  { $project: { product: 0 } }
]);` },
      { lang: 'sql', db: 'mongo', title: 'Same pipeline in SQLite (runnable)', code: `-- $unwind  = json_each over the items array
-- $group   = GROUP BY on the unwound element
-- $lookup  = LEFT JOIN products
SELECT json_extract(i.value, '$.sku')                                       AS sku,
       json_extract(p.body, '$.name')                                       AS name,
       SUM(json_extract(i.value, '$.qty'))                                  AS units,
       SUM(json_extract(i.value, '$.qty') * json_extract(i.value, '$.price')) AS revenue
FROM orders AS o
CROSS JOIN json_each(o.body, '$.items') AS i
LEFT JOIN products AS p ON p._id = json_extract(i.value, '$.sku')
WHERE json_extract(o.body, '$.status') = 'paid'
GROUP BY sku
ORDER BY revenue DESC, sku;` }
    ],
    codeTitle: ['Mongo pipeline', 'SQL translation'],
    viz: {
      title: 'Step through an aggregation pipeline',
      input: '$match status=paid; $unwind items; $group sku; $sort -revenue; $limit 3',
      inputLabel: 'stages separated by ";": $match field=value (status, city, sku) · $unwind items · $group sku|status|city · $sort [-]revenue|count|_id · $limit n',
      gen: function (input) {
        var ORDERS = [
          { _id: 'o1', city: 'Pune', status: 'paid', items: [['PEN', 3, 40], ['BOOK', 1, 450]] },
          { _id: 'o2', city: 'Delhi', status: 'shipped', items: [['MUG', 2, 199]] },
          { _id: 'o3', city: 'Pune', status: 'paid', items: [['PEN', 10, 40], ['MUG', 1, 199]] },
          { _id: 'o4', city: 'Pune', status: 'cancelled', items: [['BOOK', 2, 450]] },
          { _id: 'o5', city: 'Delhi', status: 'paid', items: [['LAMP', 1, 1299], ['PEN', 1, 40]] },
          { _id: 'o6', city: 'Mumbai', status: 'paid', items: [] }
        ];
        var stages = String(input || '').split(';').map(function (s) { return s.trim(); }).filter(Boolean);
        if (!stages.length || stages.length > 8) throw new Error('Give 1..8 stages separated by ";"');
        var docs = ORDERS.map(function (d) { return { _id: d._id, city: d.city, status: d.status, items: d.items.slice() }; });
        var unwound = false, grouped = false, frames = [], flow = [6];
        function rev(d) { if (grouped) return d.revenue; if (unwound) return d.qty * d.price; return d.items.reduce(function (s, it) { return s + it[1] * it[2]; }, 0); }
        function view(label, hl) {
          var cols, rows;
          if (grouped) { cols = ['_id', 'count', 'revenue']; rows = docs.map(function (d) { return [d._id, d.count, d.revenue]; }); }
          else if (unwound) { cols = ['_id', 'city', 'status', 'sku', 'qty', 'price']; rows = docs.map(function (d) { return [d._id, d.city, d.status, d.sku, d.qty, d.price]; }); }
          else { cols = ['_id', 'city', 'status', 'items']; rows = docs.map(function (d) { return [d._id, d.city, d.status, d.items.length ? d.items.map(function (it) { return it[0] + '×' + it[1]; }).join(', ') : '[]']; }); }
          return { type: 'table', label: label + ' (' + docs.length + ' docs)', columns: cols, rows: rows, hl: hl || {} };
        }
        frames.push({ narr: 'Input: the <b>orders</b> collection, 6 documents. Each embeds an <code>items</code> array (o6 has an empty one). The pipeline has ' + stages.length + ' stage(s).', parts: [view('orders')] });
        stages.forEach(function (st, si) {
          var m, before = docs.length, narr;
          if ((m = /^\$match\s+(\w+)\s*=\s*(\w+)$/i.exec(st))) {
            var f = m[1].toLowerCase(), v = m[2];
            if (['status', 'city', 'sku'].indexOf(f) < 0) throw new Error('$match supports status, city or sku');
            if (f === 'sku' && !unwound) throw new Error('$match sku needs $unwind items first (sku lives inside the array)');
            if (grouped) throw new Error('This demo only matches before $group');
            docs = docs.filter(function (d) { return String(d[f]) === v; });
            narr = '<b>' + st + '</b>: keep documents where ' + f + ' = "' + v + '". ' + before + ' → ' + docs.length + ' documents. ' + (si === 0 ? 'Being first, a real $match can use an index on ' + f + '.' : 'Not first: every earlier stage already processed the rows this one throws away.');
          } else if (/^\$unwind\s+\$?items$/i.test(st)) {
            if (unwound || grouped) throw new Error('$unwind items can run once, before $group');
            var out = [], lost = [];
            docs.forEach(function (d) { if (!d.items.length) lost.push(d._id); d.items.forEach(function (it) { out.push({ _id: d._id, city: d.city, status: d.status, sku: it[0], qty: it[1], price: it[2] }); }); });
            docs = out; unwound = true;
            narr = '<b>$unwind items</b>: one document per array element. ' + before + ' → ' + docs.length + ' documents.' + (lost.length ? ' <span class="c-r">' + lost.join(', ') + ' vanished</span> because its array is empty (use preserveNullAndEmptyArrays: true to keep it).' : '');
          } else if ((m = /^\$group\s+(\w+)$/i.exec(st))) {
            var key = m[1].toLowerCase();
            if (['sku', 'status', 'city'].indexOf(key) < 0) throw new Error('$group supports sku, status or city');
            if (key === 'sku' && !unwound) throw new Error('$group sku needs $unwind items first');
            if (grouped) throw new Error('Only one $group in this demo');
            var g = {}, order = [];
            docs.forEach(function (d) { var k = d[key]; if (!g[k]) { g[k] = { _id: k, count: 0, revenue: 0 }; order.push(k); } g[k].count++; g[k].revenue += rev(d); });
            docs = order.map(function (k) { return g[k]; }); grouped = true;
            narr = '<b>$group by ' + key + '</b>: ' + before + ' documents collapse into ' + docs.length + ' groups with <code>count: {$sum: 1}</code> and <code>revenue: {$sum: qty × price}</code>. $group is a blocking stage: it must see every input before emitting.';
          } else if ((m = /^\$sort\s+(-?)(revenue|count|_id)$/i.exec(st))) {
            var desc = m[1] === '-', fld = m[2].toLowerCase();
            if (fld !== '_id' && !grouped) throw new Error('Sort by revenue/count after $group (or sort by _id)');
            docs = docs.slice().sort(function (a, b) { var x = a[fld], y = b[fld]; if (x === y) return String(a._id) < String(b._id) ? -1 : 1; return (x < y ? -1 : 1) * (desc ? -1 : 1); });
            narr = '<b>' + st + '</b>: order by ' + fld + (desc ? ' descending' : ' ascending') + ' (ties by _id). With no index behind it, a sort is blocking and memory-limited (100 MB per stage, spilling to disk by default since 6.0).';
          } else if ((m = /^\$limit\s+(\d+)$/i.exec(st))) {
            var n = Number(m[1]); docs = docs.slice(0, n);
            narr = '<b>$limit ' + n + '</b>: keep the first ' + n + '. After a $sort, MongoDB fuses sort+limit into a top-k sort that only keeps ' + n + ' documents in memory.';
          } else throw new Error('Unknown stage "' + st + '". Use $match f=v, $unwind items, $group key, $sort [-]field, $limit n');
          var hl = {}; docs.forEach(function (d, i) { hl[i] = 'ok'; });
          frames.push({ narr: narr, parts: [view('after stage ' + (si + 1), hl), { type: 'bars', label: 'documents flowing out of each stage so far', values: flow.concat([docs.length]), idxLabels: ['in'].concat(stages.slice(0, si + 1).map(function (s) { return s.split(' ')[0]; })) }] });
          flow.push(docs.length);
        });
        frames.push({ narr: 'Final result: <b>' + docs.length + '</b> document(s). Compare the bar heights: the fewer documents that reach $unwind and $group, the cheaper the pipeline.', parts: [view('result')] });
        return frames;
      }
    },
    examples: [
      { title: '$unwind drops empty arrays', html: `<p>Order o6 is paid but has no items. After <code>$unwind: "$items"</code> it disappears, so a "paid orders per city" count computed after the unwind misses Mumbai entirely. The SQL equivalent is the difference between <code>CROSS JOIN json_each</code> and <code>LEFT JOIN json_each ... ON 1</code>.</p>`, code: { lang: 'sql', db: 'mongo', code: `-- inner unwind loses o6; the LEFT JOIN version keeps it with a NULL line
SELECT o._id, json_extract(i.value, '$.sku') AS sku
FROM orders AS o LEFT JOIN json_each(o.body, '$.items') AS i ON 1
WHERE json_extract(o.body, '$.status') = 'paid'
ORDER BY o._id;` } },
      { title: '$group with $push and $addToSet', html: `<p>"Which SKUs did each customer buy?" Group the unwound lines by customer and collect distinct SKUs. <code>$addToSet</code> ≈ <code>GROUP_CONCAT(DISTINCT ...)</code>. Asha bought PEN, BOOK and MUG across two orders.</p>`, code: { lang: 'sql', db: 'mongo', code: `SELECT json_extract(o.body, '$.customer.name')                AS customer,
       GROUP_CONCAT(DISTINCT json_extract(i.value, '$.sku'))    AS skus
FROM orders AS o, json_each(o.body, '$.items') AS i
GROUP BY customer
ORDER BY customer;` } },
      { title: '$lookup finds products nobody bought', html: `<p>Start from <code>products</code>, <code>$lookup</code> matching order lines, and keep products whose looked-up array is empty: an anti-join. CHAIR has never been ordered. On large collections this needs an index on the foreign field (<code>items.sku</code>, a multikey index), or it becomes a nested-loop scan.</p>`, code: { lang: 'sql', db: 'mongo', code: `SELECT p._id
FROM products AS p
WHERE NOT EXISTS (
  SELECT 1 FROM orders AS o, json_each(o.body, '$.items') AS i
  WHERE json_extract(i.value, '$.sku') = p._id
);` } }
    ],
    deepDive: `<p><b>Optimiser behaviour.</b> MongoDB reorders and coalesces stages: a <code>$match</code> after a <code>$project</code> that does not depend on computed fields is moved earlier; <code>$sort</code> + <code>$limit</code> become a top-k sort; adjacent <code>$match</code> stages merge. Since 5.x many pipelines run in the slot-based execution engine (SBE) and <code>$group</code>/<code>$lookup</code> can be pushed into it. Use <code>explain("executionStats")</code> to check that the first stage is an <code>IXSCAN</code>, not a <code>COLLSCAN</code>.</p>
<p><b>Sharded pipelines.</b> On a sharded cluster the pipeline is split: the shards run the part up to the first blocking stage (each shard does a partial <code>$group</code>), and a merging shard or mongos combines the partials. A <code>$match</code> on the shard key targets only the relevant shards. <code>$lookup</code> into a sharded collection is supported since 5.1 but is a scatter-gather per input document unless the join key is the shard key: another reason to prefer extended references for hot paths.</p>
<p><b>Materialising results.</b> <code>$merge</code> writes into a collection with upsert semantics (<code>whenMatched: "merge" | "replace" | "keepExisting"</code>), which makes incremental summaries possible: rerun the pipeline for yesterday's orders and merge into <code>daily_sales</code>. Atlas also offers online archive and SQL interfaces, but the pipeline is still the native analytics language.</p>
<p><b>When not to use it.</b> Heavy cross-collection analytics over billions of documents belong in a warehouse fed by change streams; the aggregation pipeline shares CPU and cache with your OLTP traffic.</p>`,
    aiEra: `<p><b>What AI changes:</b> translating SQL to aggregation pipelines (and back) is exactly the kind of mechanical rewrite assistants do well; Compass and Atlas ship natural-language-to-pipeline helpers. Vector search arrives as just another stage (<code>$vectorSearch</code> in Atlas), so retrieval for RAG and filtering by metadata live in one pipeline.</p>
<p><b>Use AI as a partner:</b> ask it to convert your SQL report to a pipeline <i>and</i> to point out which stage can use which index, then run <code>explain</code> yourself.</p>
<p><b>Where AI goes wrong:</b> it forgets that <code>$unwind</code> drops empty arrays, puts <code>$match</code> after <code>$group</code> when it could go before, uses <code>$lookup</code> on every request instead of reshaping the data, and invents operators. <b>What you must own:</b> stage order, index use and the row-multiplication effect of unwinds.</p>`,
    problems: [{
      title: 'Translate the Pipeline: Revenue per SKU',
      level: 'Medium', tags: ['mongodb', 'aggregation', '$unwind', '$group', 'json_each'], companies: ['MongoDB', 'Swiggy', 'Shopify'],
      statement: `<p>Translate this pipeline to SQL over the <code>orders</code> collection (db <code>mongo</code>, one JSON document per row in <code>body</code>):</p>
<pre>[{ $match: { status: "paid" } },
 { $unwind: "$items" },
 { $group: { _id: "$items.sku", units: { $sum: "$items.qty" },
             revenue: { $sum: { $multiply: ["$items.qty", "$items.price"] } } } },
 { $sort: { revenue: -1, _id: 1 } }]</pre>
<p>Return <code>sku, units, revenue</code>.</p>`,
      constraints: `Orders may have empty item arrays; status values are case-sensitive strings.`,
      example: `<p>Paid orders: o1, o3, o5, o6. PEN appears in o1 (3 × 40), o3 (10 × 40), o5 (1 × 40) → ${H.c('g', 'units 14, revenue 560')}. LAMP: ${H.c('g', '1299')} comes first. o6 contributes nothing.</p>`,
      brute: { why: `<p>Pull every order to the application and loop over items there. It works, but it ships every document (including unpaid ones) over the network and does the grouping in app memory, exactly what the pipeline avoids.</p>`, code: { lang: 'js', check: false, code: `// client-side aggregation: transfers the whole collection
const totals = {};
db.orders.find().forEach(o => {
  if (o.status !== "paid") return;
  o.items.forEach(it => {
    totals[it.sku] = totals[it.sku] || { units: 0, revenue: 0 };
    totals[it.sku].units += it.qty;
    totals[it.sku].revenue += it.qty * it.price;
  });
});` } },
      mcq: { q: 'Which SQL construct corresponds to $unwind on an array field?', options: ['A join to a table function that expands the array (json_each / unnest)', 'GROUP BY', 'UNION ALL', 'A correlated subquery in SELECT'], answer: 0, explain: '$unwind emits one row per element, exactly like CROSS JOIN json_each(body, \'$.items\') or LATERAL unnest(items).' },
      hints: [
        `<p>Hint 1: <code>FROM orders o, json_each(o.body, '$.items') i</code> gives one row per item; <code>i.value</code> is the item JSON.</p>`,
        `<p>Hint 2: Filter <code>json_extract(o.body, '$.status') = 'paid'</code> and GROUP BY the sku extracted from <code>i.value</code>.</p>`,
        `<p>Hint 3: Sum qty and qty × price; order by revenue DESC, then sku ASC to mirror <code>{revenue: -1, _id: 1}</code>.</p>`
      ],
      tests: { engine: 'sqlite', cmp: 'exact', cases: [
        { rows: [['LAMP', 1, 1299], ['PEN', 14, 560], ['BOOK', 1, 450], ['MUG', 1, 199]] },
        { setup: `UPDATE orders SET body = json_set(body, '$.status', 'paid') WHERE _id = 'o4'`, rows: [['BOOK', 3, 1350], ['LAMP', 1, 1299], ['PEN', 14, 560], ['MUG', 1, 199]] },
        { setup: "DELETE FROM orders WHERE _id IN ('o1', 'o3', 'o5')", rows: [] },
        { setup: `UPDATE orders SET body = json_set(body, '$.status', 'shipped')`, rows: [] },
        { setup: `INSERT INTO orders VALUES ('o7', '{"customer":{"id":9,"name":"Zed","city":"Goa"},"status":"paid","placed":"2026-09-10","items":[{"sku":"MUG","qty":3,"price":199}]}')`, rows: [['LAMP', 1, 1299], ['MUG', 4, 796], ['PEN', 14, 560], ['BOOK', 1, 450]] },
        { setup: `INSERT INTO orders VALUES ('o8', '{"customer":{"id":9,"name":"Zed","city":"Goa"},"status":"paid","placed":"2026-09-10","items":[{"sku":"CHAIR","qty":1,"price":450}]}')`, rows: [['LAMP', 1, 1299], ['PEN', 14, 560], ['BOOK', 1, 450], ['CHAIR', 1, 450], ['MUG', 1, 199]] },
        { setup: `UPDATE orders SET body = json_set(body, '$.status', 'PAID') WHERE _id = 'o5'`, rows: [['PEN', 13, 520], ['BOOK', 1, 450], ['MUG', 1, 199]] }
      ] },
      solution: {
        approach: `<p>Stage by stage: <code>$match</code> → WHERE on the extracted status; <code>$unwind</code> → join with <code>json_each</code>; <code>$group</code> → GROUP BY sku with SUMs; <code>$sort</code> → ORDER BY with the same tie-break. Filtering before unwinding keeps the multiplied row count small, the same advice as in MongoDB.</p>`,
        code: { lang: 'sql', db: 'mongo', code: `SELECT json_extract(i.value, '$.sku')                                         AS sku,
       SUM(json_extract(i.value, '$.qty'))                                    AS units,
       SUM(json_extract(i.value, '$.qty') * json_extract(i.value, '$.price'))  AS revenue
FROM orders AS o
CROSS JOIN json_each(o.body, '$.items') AS i      -- $unwind
WHERE json_extract(o.body, '$.status') = 'paid'   -- $match
GROUP BY sku                                      -- $group
ORDER BY revenue DESC, sku;                       -- $sort` },
        complexity: `<p>O(total items of paid orders) to unwind and group, plus O(g log g) to sort g SKUs. In MongoDB an index on <code>status</code> makes the first stage an index scan.</p>`,
        followUps: ['How would you keep o6 in a "paid orders per customer" count?', 'How would you precompute this nightly with $merge?']
      }
    }]
  });

  /* =====================================================================
     TOPIC 4 — Redis data structures
     ===================================================================== */
  topics.push({
    title: 'Redis Data Structures: Picking the Right Type for Each Job',
    analogy: `<p>A <b>workshop wall of specialised tools</b>: you could hammer a screw with a wrench, but the screwdriver is faster and safer. Redis is not "a cache of strings"; it is a wall of in-memory data structures, each with operations that run in O(1) or O(log n) right next to the data, so the server does the work instead of your app reading, modifying and writing back.</p>`,
    explain: `<p>Every Redis key holds one typed value. Choosing the type is the data model:</p>
${H.table(['Type', 'Key commands', 'Typical use', 'Cost'], [
  ['<b>String</b>', 'GET/SET (EX, NX), INCR, INCRBY', 'cache entries, counters, distributed lock (<code>SET k v NX PX 30000</code>)', 'O(1)'],
  ['<b>Hash</b>', 'HSET, HGET, HINCRBY, HGETALL', 'an object with fields: session, user profile, cart', 'O(1) per field; small hashes use compact listpack encoding'],
  ['<b>List</b>', 'LPUSH, RPOP, BLMOVE, LRANGE, LTRIM', 'simple queues, "last 100 items" (LPUSH + LTRIM)', 'O(1) at the ends, O(n) in the middle'],
  ['<b>Set</b>', 'SADD, SISMEMBER, SINTER, SCARD', 'tags, unique visitors (small scale), "who liked this"', 'O(1) membership'],
  ['<b>Sorted set</b> (ZSET)', 'ZADD, ZINCRBY, ZREVRANGE, ZRANK, ZRANGEBYSCORE, ZREMRANGEBYSCORE', 'leaderboards, priority queues, sliding-window rate limits, time-ordered indexes', 'O(log n) (skip list + hash)'],
  ['<b>Stream</b>', 'XADD, XREADGROUP, XACK, XAUTOCLAIM', 'durable event log with consumer groups', 'append O(1)'],
  ['<b>HyperLogLog</b>', 'PFADD, PFCOUNT, PFMERGE', 'approximate unique counts (0.81% std error) in 12 KB', 'O(1)'],
  ['<b>Bitmap / bitfield</b>', 'SETBIT, BITCOUNT, BITFIELD', 'daily active flags per user id, feature flags', '1 bit per id'],
  ['<b>Geo</b>', 'GEOADD, GEOSEARCH', 'nearby drivers/stores (stored inside a ZSET)', 'O(log n + m)']
])}
<p><b>Key naming</b> is your schema: <code>object-type:id:field</code> like <code>session:a1</code>, <code>lb:weekly</code>, <code>ratelimit:{user}:{minute}</code>. In Redis Cluster, keys map to 16 384 hash slots; a <b>hash tag</b> <code>{user:42}:cart</code> forces related keys into the same slot so multi-key commands and transactions work.</p>
<p><b>Atomicity:</b> each command is atomic (commands execute one at a time on the main thread). For read-modify-write across commands use <code>MULTI/EXEC</code> (with <code>WATCH</code> for optimistic locking), a Lua script (<code>EVAL</code>) or a Redis 7 <b>function</b> (<code>FUNCTION LOAD</code> / <code>FCALL</code>), which run without interleaving.</p>
<p><b>Sorted-set tie order:</b> members with equal scores are ordered lexicographically by member; <code>ZREVRANGE</code> returns them in reverse lexicographic order. If you need "earlier achiever wins", encode time into the score (e.g. <code>score = points × 10<sup>10</sup> + (MAX_TS − ts)</code>).</p>`,
    clues: [
      '"top 10 players", "rank of user X" → sorted set (ZINCRBY, ZREVRANGE, ZREVRANK)',
      '"N requests per minute per user" → INCR + EXPIRE (fixed window) or ZSET sliding window',
      '"store a user session object" → hash with a TTL on the key',
      '"count unique visitors per day, approximate is fine" → HyperLogLog',
      '"job queue with acknowledgements and retries" → Streams with consumer groups (not plain lists)',
      '"only one worker may run this job" → SET key token NX PX + check-and-delete in Lua'
    ],
    code: [
      { lang: 'text', check: false, title: 'redis-cli: one example per structure', code: `# String counter + TTL: fixed-window rate limit (100 req / minute)
INCR ratelimit:user:42:2026-09-01T10:05      # -> 1, 2, 3 ...
EXPIRE ratelimit:user:42:2026-09-01T10:05 60 NX

# Hash: session object, expires after 30 minutes of inactivity
HSET session:a1 user_id 1 cart_items 3 theme dark
EXPIRE session:a1 1800

# Sorted set: leaderboard
ZINCRBY lb:weekly 50 asha
ZREVRANGE lb:weekly 0 2 WITHSCORES           # top 3
ZREVRANK lb:weekly asha                      # 0-based rank

# Sliding window: drop old requests, count the rest, add this one
ZREMRANGEBYSCORE ratelimit:1 -inf 940
ZCARD ratelimit:1
ZADD ratelimit:1 1000 r7

# Stream with a consumer group
XADD orders * order_id o9 total 499
XGROUP CREATE orders billing $ MKSTREAM
XREADGROUP GROUP billing worker-1 COUNT 10 BLOCK 5000 STREAMS orders >
XACK orders billing 1693560000000-0

# HyperLogLog: unique visitors
PFADD uv:2026-09-01 user:1 user:2 user:1
PFCOUNT uv:2026-09-01                        # -> 2 (approximately)` },
      { lang: 'sql', db: 'redis', title: 'ZREVRANGE + ZREVRANK emulated (runnable)', code: `-- Redis orders equal scores by member; ZREVRANGE reverses that (member DESC).
SELECT ROW_NUMBER() OVER (ORDER BY score DESC, member DESC) - 1 AS zrevrank,
       member,
       score
FROM zsets
WHERE k = 'lb:weekly'
ORDER BY zrevrank;` }
    ],
    codeTitle: ['redis-cli', 'Leaderboard in SQL'],
    viz: {
      title: 'A sorted-set leaderboard, command by command',
      input: 'ZADD 50 asha; ZADD 70 ravi; ZINCRBY 30 asha; ZADD 80 mei; ZADD 80 tom; ZREVRANGE 0 2; ZREVRANK ravi; ZREM mei',
      inputLabel: 'commands on one key separated by ";": ZADD score member · ZINCRBY delta member · ZREM member · ZREVRANGE start stop · ZREVRANK member',
      gen: function (input) {
        var cmds = String(input || '').split(';').map(function (s) { return s.trim(); }).filter(Boolean);
        if (!cmds.length || cmds.length > 14) throw new Error('Give 1..14 commands separated by ";"');
        var z = {}, frames = [];
        function sorted() { return Object.keys(z).sort(function (a, b) { return z[b] - z[a] || (a < b ? 1 : -1); }); }
        function snap(hlMember, cls, range) {
          var s = sorted(), hl = {};
          s.forEach(function (m, i) { if (m === hlMember) hl[i] = cls; if (range && i >= range[0] && i <= range[1]) hl[i] = 'sel'; });
          return [{ type: 'bars', label: 'lb (ZREVRANGE order: score desc, ties member desc)', values: s.map(function (m) { return z[m]; }), idxLabels: s, hl: hl },
            { type: 'map', label: 'member → score (the hash half of the ZSET)', entries: Object.keys(z).sort().map(function (m) { return [m, z[m]]; }), hl: hlMember ? (function () { var h = {}; h[hlMember] = 1; return h; })() : {} }];
        }
        frames.push({ narr: 'A sorted set keeps <b>two structures</b>: a hash (member → score, O(1) lookups) and a skip list ordered by (score, member) for O(log n) rank and range queries. Start empty.', parts: snap() });
        cmds.forEach(function (c) {
          var p = c.split(/\s+/), op = p[0].toUpperCase(), narr, parts;
          if (op === 'ZADD' && p.length === 3 && isFinite(Number(p[1]))) {
            var had = p[2] in z; z[p[2]] = Number(p[1]);
            narr = '<b>' + c + '</b>: ' + (had ? 'member exists, score replaced' : 'new member added') + ' → returns ' + (had ? 0 : 1) + '. O(log n).'; parts = snap(p[2], 'ok');
          } else if (op === 'ZINCRBY' && p.length === 3 && isFinite(Number(p[1]))) {
            z[p[2]] = (z[p[2]] || 0) + Number(p[1]);
            narr = '<b>' + c + '</b>: atomic increment on the server, new score ' + z[p[2]] + '. No read-modify-write race between app servers.'; parts = snap(p[2], 'ok');
          } else if (op === 'ZREM' && p.length === 2) {
            var ex = p[1] in z; delete z[p[1]];
            narr = '<b>' + c + '</b>: ' + (ex ? 'removed' : 'not a member, nothing happens') + ' → returns ' + (ex ? 1 : 0) + '.'; parts = snap();
          } else if (op === 'ZREVRANGE' && p.length === 3 && /^-?\d+$/.test(p[1]) && /^-?\d+$/.test(p[2])) {
            var s = sorted(), n = s.length, a = Number(p[1]), b = Number(p[2]);
            if (a < 0) a += n; if (b < 0) b += n; a = Math.max(a, 0); b = Math.min(b, n - 1);
            var res = a <= b ? s.slice(a, b + 1) : [];
            narr = '<b>' + c + '</b> → [' + res.map(function (m) { return m + ' (' + z[m] + ')'; }).join(', ') + ']. Equal scores come back in <i>reverse</i> lexicographic member order.'; parts = snap(null, null, [a, b]);
          } else if (op === 'ZREVRANK' && p.length === 2) {
            var s2 = sorted(), r = s2.indexOf(p[1]);
            narr = '<b>' + c + '</b> → ' + (r < 0 ? '(nil): not a member' : r + ' (0-based; rank 1 for humans is ' + (r + 1) + ')') + '. O(log n) because the skip list stores span counts.'; parts = snap(r < 0 ? null : p[1], 'sel');
          } else throw new Error('Cannot parse "' + c + '". Use ZADD score member, ZINCRBY delta member, ZREM member, ZREVRANGE a b, ZREVRANK member');
          frames.push({ narr: narr, parts: parts });
        });
        frames.push({ narr: 'Done. A relational version needs <code>ORDER BY score DESC</code> over an index for every rank query; the ZSET answers top-N and rank in O(log n) from memory, which is why leaderboards are the textbook Redis use case.', parts: snap() });
        return frames;
      }
    },
    examples: [
      { title: 'Rank of one player', html: `<p><code>ZREVRANK lb:weekly asha</code> counts members ranked above her. asha and leo both have 980; reverse lexicographic order puts leo first, so asha's rank is 4 (0-based). In SQL it is a COUNT of members that beat her under the same ordering.</p>`, code: { lang: 'sql', db: 'redis', code: `SELECT COUNT(*) AS zrevrank_of_asha
FROM zsets AS o, zsets AS me
WHERE o.k = 'lb:weekly' AND me.k = 'lb:weekly' AND me.member = 'asha'
  AND (o.score > me.score OR (o.score = me.score AND o.member > me.member));` } },
      { title: 'A session is a hash, not a JSON string', html: `<p>Storing a session as one JSON string means every change (cart count +1) is GET, parse, modify, SET, and two requests can overwrite each other. A hash lets you <code>HINCRBY session:a1 cart_items 1</code> atomically and read single fields. Emulated: one row per field.</p>`, code: { lang: 'sql', db: 'redis', code: `-- HGETALL session:a1
SELECT field, v FROM hashes WHERE k = 'session:a1' ORDER BY field;` } },
      { title: 'Queue: list vs stream', html: `<p><code>LPUSH</code> + <code>BRPOP</code> is a fine fire-and-forget queue, but a worker that crashes after popping loses the job. <code>BLMOVE</code> into a processing list, or better <b>Streams</b> with consumer groups, keep a pending entries list so unacknowledged jobs can be claimed by another worker (<code>XAUTOCLAIM</code>).</p>`, code: { lang: 'sql', db: 'redis', code: `-- LRANGE queue:emails 0 -1
SELECT pos, v FROM lists WHERE k = 'queue:emails' ORDER BY pos;` } }
    ],
    deepDive: `<p><b>Encodings.</b> Small hashes, lists, sets and sorted sets use compact encodings (Redis 7 replaced ziplist with <b>listpack</b>; small integer sets use intset) and convert to hash tables / skip lists past thresholds such as <code>hash-max-listpack-entries 128</code> and <code>zset-max-listpack-entries 128</code>. That is why millions of small hashes are memory-efficient while millions of tiny string keys carry per-key overhead (roughly 50-70 bytes each).</p>
<p><b>Threading and big keys.</b> Commands run on one main thread per instance (I/O threads only parallelise socket reads/writes), so an O(n) command on a huge key (<code>HGETALL</code> on 1 M fields, <code>DEL</code> of a 10 M-member set, <code>KEYS *</code>) blocks everyone. Use <code>SCAN</code>/<code>HSCAN</code>, <code>UNLINK</code> (lazy free), and keep collections bounded. Find offenders with <code>redis-cli --bigkeys</code>, <code>--memkeys</code> and <code>MEMORY USAGE</code>.</p>
<p><b>Cluster.</b> Redis Cluster shards by <code>CRC16(key) mod 16384</code>; multi-key commands require all keys in one slot (hash tags), and a single hot key lives on one shard. Redis 7 added <b>sharded pub/sub</b> (<code>SPUBLISH</code>) so pub/sub scales with the cluster.</p>
<p><b>Ecosystem in 2026.</b> After the 2024 licence change, the Linux Foundation fork <b>Valkey</b> is widely offered by clouds (ElastiCache, Memorystore); Redis 8 returned to an open-source (AGPL) option and bundles JSON, search and vector features. The data-structure model in this topic is the same across them.</p>`,
    aiEra: `<p><b>What AI changes:</b> Redis is a common short-term memory and cache layer for LLM apps: semantic caches keyed by prompt embeddings, rate limits per API key and token budgets (INCRBY tokens with a TTL), and conversation state in hashes or streams. Vector sets / RediSearch vector indexes put similarity search next to the cache.</p>
<p><b>Use AI as a partner:</b> describe the feature and ask which Redis types and commands implement it in O(1)/O(log n), with key names and TTLs. Ask it to write the Lua or function for any read-modify-write.</p>
<p><b>Where AI goes wrong:</b> it stores JSON strings and does GET-modify-SET races, uses <code>KEYS *</code> in production code, forgets TTLs (memory grows until eviction), and assumes multi-key commands work across cluster slots. <b>What you must own:</b> key naming, bounded sizes and atomicity of every multi-step operation.</p>`,
    problems: [{
      title: 'Leaderboard Top 3 with Redis Tie Order',
      level: 'Easy', tags: ['redis', 'sorted set', 'ROW_NUMBER'], companies: ['Riot Games', 'Dream11', 'Zynga'],
      statement: `<p>The <code>zsets</code> table emulates Redis sorted sets (db <code>redis</code>). Return the result of <code>ZREVRANGE lb:weekly 0 2 WITHSCORES</code> as rows <code>rank, member, score</code>, where <code>rank</code> is the 0-based ZREVRANK.</p>
<p>Redis order: score descending; equal scores in <b>reverse lexicographic</b> member order. Ignore other keys.</p>`,
      constraints: `Members are unique within a key. The key may have fewer than 3 members.`,
      example: `<p>zara 1500 → ${H.c('g', 'rank 0')}. ravi and mei both have 1200; "ravi" &gt; "mei" lexicographically, so ${H.c('g', 'ravi = 1')}, ${H.c('g', 'mei = 2')}.</p>`,
      brute: { why: `<p>For every member, count how many members beat it (a correlated subquery): O(n²) for the whole board. Redis answers each rank in O(log n); in SQL a single window function sorts once.</p>`, code: { lang: 'sql', db: 'redis', code: `SELECT (SELECT COUNT(*) FROM zsets o
        WHERE o.k = z.k AND (o.score > z.score OR (o.score = z.score AND o.member > z.member))) AS rank,
       z.member, z.score
FROM zsets AS z
WHERE z.k = 'lb:weekly' AND rank < 3
ORDER BY rank;` } },
      mcq: { q: 'Players A and B both have 100 points. You want whoever reached 100 first to rank higher. What do you do in Redis?', options: ['Encode the time into the score so equal points still differ', 'Nothing: Redis breaks ties by insertion time', 'Use ZRANGE instead of ZREVRANGE', 'Store players in a list'], answer: 0, explain: 'Redis breaks ties by member name, not by time. A composite score (points × 10^10 + (MAX_TS − ts)) makes earlier achievers rank higher.' },
      hints: [
        `<p>Hint 1: Filter <code>k = 'lb:weekly'</code> before ranking so other keys do not interfere.</p>`,
        `<p>Hint 2: <code>ROW_NUMBER() OVER (ORDER BY score DESC, member DESC) - 1</code> is the ZREVRANK.</p>`,
        `<p>Hint 3: Rank in a CTE, then keep rank ≤ 2 and order by rank.</p>`
      ],
      tests: { engine: 'sqlite', cmp: 'exact', cases: [
        { rows: [[0, 'zara', 1500], [1, 'ravi', 1200], [2, 'mei', 1200]] },
        { setup: "UPDATE zsets SET score = score + 1000 WHERE k = 'lb:weekly' AND member = 'tom'", rows: [[0, 'zara', 1500], [1, 'tom', 1450], [2, 'ravi', 1200]] },
        { setup: "DELETE FROM zsets WHERE member = 'zara'", rows: [[0, 'ravi', 1200], [1, 'mei', 1200], [2, 'leo', 980]] },
        { setup: "DELETE FROM zsets WHERE k = 'lb:weekly' AND member <> 'nia'", rows: [[0, 'nia', 300]] },
        { setup: "DELETE FROM zsets WHERE k = 'lb:weekly'", rows: [] },
        { setup: "INSERT INTO zsets VALUES ('lb:monthly', 'bob', 99999)", rows: [[0, 'zara', 1500], [1, 'ravi', 1200], [2, 'mei', 1200]] },
        { setup: "UPDATE zsets SET score = 1500 WHERE k = 'lb:weekly' AND member = 'asha'", rows: [[0, 'zara', 1500], [1, 'asha', 1500], [2, 'ravi', 1200]] }
      ] },
      solution: {
        approach: `<p>Rank once with a window function that reproduces Redis ordering (score DESC, member DESC), subtract 1 for 0-based ranks, keep the first three.</p>`,
        code: { lang: 'sql', db: 'redis', code: `WITH ranked AS (
  SELECT ROW_NUMBER() OVER (ORDER BY score DESC, member DESC) - 1 AS rank,
         member,
         score
  FROM zsets
  WHERE k = 'lb:weekly'
)
SELECT rank, member, score
FROM ranked
WHERE rank <= 2
ORDER BY rank;` },
        alt: [{ lang: 'text', check: false, title: 'Native Redis', code: `ZREVRANGE lb:weekly 0 2 WITHSCORES
# 1) "zara"  2) "1500"  3) "ravi"  4) "1200"  5) "mei"  6) "1200"
ZREVRANK lb:weekly mei      # (integer) 2` }],
        complexity: `<p>SQL: O(n log n) sort of one key's members. Redis: O(log n + k) for k returned members, independent of how many other keys exist.</p>`,
        followUps: ['How do you show "my rank and the 2 players around me"?', 'How would you build daily, weekly and all-time boards without triple writes? (ZUNIONSTORE)']
      }
    }]
  });

  /* =====================================================================
     TOPIC 5 — Redis persistence, expiry and eviction
     ===================================================================== */
  topics.push({
    title: 'Redis Persistence, TTLs and Eviction Policies',
    analogy: `<p>A <b>whiteboard in a busy office</b>. It is fast to read and write, but wiping it loses everything, so someone either <b>photographs it every hour</b> (RDB snapshot) or <b>writes every change in a notebook</b> as it happens (AOF). When the board is full, the office needs a rule for what to erase: the note nobody looked at for longest (LRU), the note used least often (LFU), the note that was going to expire soonest (volatile-ttl), or simply "refuse new notes" (noeviction).</p>`,
    explain: `<p><b>Persistence options</b> (Redis keeps the dataset in RAM; persistence is only for restarts):</p>
${H.table(['Mode', 'How', 'Data at risk on crash', 'Trade-off'], [
  ['<b>RDB</b> snapshots', '<code>fork()</code> + copy-on-write, dump a compact binary file (e.g. <code>save 3600 1 300 100 60 10000</code>)', 'everything since the last snapshot (minutes)', 'fast restarts, small files; fork of a big instance can pause and double memory for heavily-written pages'],
  ['<b>AOF</b> append-only file', 'log every write command; <code>appendfsync always | everysec | no</code>', '<code>everysec</code> (default): up to ~1 s', 'bigger files; rewritten in the background; Redis 7 uses a multi-part AOF (base + incremental files)'],
  ['<b>RDB + AOF</b>', 'AOF with an RDB preamble', '~1 s', 'the usual production choice when Redis holds state you care about'],
  ['<b>None</b>', 'pure cache', 'everything', 'fine when the source of truth is elsewhere']
])}
<p>Replication (a replica per primary, failover by Sentinel or Cluster) protects against machine loss, but it is <b>asynchronous</b>: an acknowledged write can be lost in a failover. <code>WAIT numreplicas timeout</code> reduces, but does not remove, that window. Redis is not a ledger.</p>
<p><b>Expiry (TTL):</b> <code>EXPIRE</code>, <code>SET ... EX</code>, <code>PEXPIREAT</code>. <code>TTL k</code> returns seconds left, <b>-1</b> if the key has no expiry and <b>-2</b> if the key does not exist (expired keys no longer exist). Redis removes expired keys <b>lazily</b> (when accessed) and <b>actively</b> (a background cycle samples keys with TTLs and deletes expired ones), so memory is reclaimed even for keys nobody touches.</p>
<p><b>Eviction</b> starts when used memory reaches <code>maxmemory</code>:</p>
${H.table(['maxmemory-policy', 'Candidates', 'Evicts'], [
  ['<code>noeviction</code> (default)', '-', 'nothing: writes that need memory fail with an OOM error'],
  ['<code>allkeys-lru</code> / <code>allkeys-lfu</code>', 'every key', 'least recently / least frequently used'],
  ['<code>volatile-lru</code> / <code>volatile-lfu</code>', 'only keys with a TTL', 'least recently / frequently used among them'],
  ['<code>allkeys-random</code> / <code>volatile-random</code>', 'all / TTL keys', 'random'],
  ['<code>volatile-ttl</code>', 'only keys with a TTL', 'the key with the nearest expiry']
])}
<p>LRU and LFU are <b>approximated</b>: Redis samples <code>maxmemory-samples</code> keys (default 5) and evicts the best candidate from a small pool, instead of keeping an exact global list. LFU uses a logarithmic 8-bit counter per key that decays over time (<code>lfu-decay-time</code>). Pick <code>allkeys-lru/lfu</code> for a pure cache, <code>volatile-*</code> when the same instance also holds keys that must never be evicted (they simply have no TTL), and <code>noeviction</code> when Redis is a primary store and losing keys silently is worse than failing writes.</p>`,
    clues: [
      '"cache, can be rebuilt from the database" → allkeys-lru or allkeys-lfu, no or light persistence',
      '"Redis holds sessions and permanent config together" → volatile-lru: give sessions TTLs, config none',
      '"must not lose more than a second of data" → AOF with appendfsync everysec (plus replicas)',
      '"OOM command not allowed when used memory > maxmemory" → noeviction policy reached its limit',
      '"popular keys keep getting evicted after a batch job scans everything" → LFU resists scan pollution better than LRU',
      '"latency spikes every hour" → RDB fork on a large instance, or AOF fsync on a slow disk'
    ],
    code: [
      { lang: 'text', check: false, title: 'redis.conf: a cache vs a store', code: `# ---- Pure cache (rebuildable) ----
maxmemory 4gb
maxmemory-policy allkeys-lfu
maxmemory-samples 10          # better approximation, slightly more CPU
save ""                       # no RDB snapshots
appendonly no

# ---- Sessions + config on one instance ----
maxmemory 2gb
maxmemory-policy volatile-lru # only keys WITH a TTL may be evicted
appendonly yes
appendfsync everysec          # lose at most ~1 s on a crash
aof-use-rdb-preamble yes

# ---- Inspect at runtime ----
# INFO memory           -> used_memory, maxmemory, mem_fragmentation_ratio
# INFO stats            -> evicted_keys, expired_keys, keyspace_hits/misses
# OBJECT FREQ key       -> LFU counter (with an LFU policy)
# OBJECT IDLETIME key   -> seconds since last access (with an LRU policy)` },
      { lang: 'sql', db: 'redis', title: 'TTL semantics over the keyspace (runnable, now = 1000)', code: `SELECT k,
       type,
       CASE
         WHEN expire_at IS NULL   THEN -1        -- persistent key
         WHEN expire_at <= 1000   THEN -2        -- already expired = does not exist
         ELSE expire_at - 1000                   -- seconds to live
       END AS ttl,
       CASE WHEN expire_at IS NULL THEN 'no' ELSE 'yes' END AS volatile_candidate
FROM keyspace
ORDER BY k;` }
    ],
    codeTitle: ['redis.conf', 'TTL in SQL'],
    viz: {
      title: 'Fill Redis past maxmemory and watch the policy decide',
      input: '3 | allkeys-lru | SET a, SET b, GET a, SET c, SET d, GET a, GET b, SET e',
      inputLabel: 'maxmemory in keys (1-6) | allkeys-lru | allkeys-lfu | noeviction | ops: SET k, GET k (comma separated, ≤ 16)',
      gen: function (input) {
        var p = String(input || '').split('|').map(function (s) { return s.trim(); });
        if (p.length !== 3) throw new Error('Format: maxkeys | policy | ops   e.g.  3 | allkeys-lru | SET a, SET b, GET a');
        var max = Number(p[0]), pol = p[1].toLowerCase();
        if (!(max >= 1 && max <= 6) || Math.floor(max) !== max) throw new Error('maxmemory (in keys) must be 1..6');
        if (['allkeys-lru', 'allkeys-lfu', 'noeviction'].indexOf(pol) < 0) throw new Error('Policy must be allkeys-lru, allkeys-lfu or noeviction');
        var ops = p[2].split(',').map(function (s) { return s.trim(); }).filter(Boolean);
        if (!ops.length || ops.length > 16) throw new Error('Give 1..16 ops');
        var mem = {}, clock = 0, hits = 0, misses = 0, evicted = 0, ooms = 0, frames = [];
        function entries() { return Object.keys(mem).sort().map(function (k) { return [k, 'last=' + mem[k].last + ' freq=' + mem[k].freq]; }); }
        function victim() {
          var ks = Object.keys(mem);
          ks.sort(function (a, b) {
            if (pol === 'allkeys-lfu' && mem[a].freq !== mem[b].freq) return mem[a].freq - mem[b].freq;
            return mem[a].last - mem[b].last;
          });
          return ks[0];
        }
        frames.push({ narr: 'maxmemory = <b>' + max + '</b> keys, policy <b>' + pol + '</b>. Each key remembers when it was last used (LRU clock) and how often (LFU counter). Real Redis approximates by sampling 5 keys; this demo is exact.', parts: [
          { type: 'map', label: 'memory', entries: [] }, { type: 'vars', label: 'stats', vals: { used: 0, maxmemory: max } }
        ] });
        ops.forEach(function (o) {
          var m = /^(SET|GET)\s+(\w+)$/i.exec(o);
          if (!m) throw new Error('Each op must be "SET key" or "GET key" (got "' + o + '")');
          var op = m[1].toUpperCase(), k = m[2], narr, hl = {};
          clock++;
          if (op === 'GET') {
            if (mem[k]) { mem[k].last = clock; mem[k].freq++; hits++; hl[k] = 1; narr = '<b>GET ' + k + '</b>: hit. Its LRU clock moves to ' + clock + ' and its frequency rises to ' + mem[k].freq + '.'; }
            else { misses++; narr = '<b>GET ' + k + '</b>: <span class="c-r">miss</span> (never written or evicted). A cache-aside app would now load it from the database.'; }
          } else {
            if (mem[k]) { mem[k].last = clock; mem[k].freq++; hl[k] = 1; narr = '<b>SET ' + k + '</b>: overwrite, no new memory needed.'; }
            else if (Object.keys(mem).length < max) { mem[k] = { last: clock, freq: 1 }; hl[k] = 1; narr = '<b>SET ' + k + '</b>: stored (' + Object.keys(mem).length + '/' + max + ').'; }
            else if (pol === 'noeviction') { ooms++; narr = '<b>SET ' + k + '</b>: <span class="c-r">(error) OOM command not allowed when used memory &gt; maxmemory</span>. noeviction protects existing data and makes the application handle the failure.'; }
            else { var v = victim(); delete mem[v]; evicted++; mem[k] = { last: clock, freq: 1 }; hl[k] = 1; narr = '<b>SET ' + k + '</b>: memory full → evict <span class="c-r">' + v + '</span> (' + (pol === 'allkeys-lfu' ? 'lowest frequency, ties by oldest access' : 'least recently used') + '), then store ' + k + '.'; }
          }
          frames.push({ narr: narr, parts: [
            { type: 'map', label: 'memory (key → LRU clock, LFU count)', entries: entries(), hl: hl },
            { type: 'vars', label: 'stats', vals: { used: Object.keys(mem).length, maxmemory: max, hits: hits, misses: misses, evicted_keys: evicted, oom_errors: ooms } }
          ] });
        });
        frames.push({ narr: 'Hit ratio <b>' + (hits + misses ? Math.round(100 * hits / (hits + misses)) : 0) + '%</b>, ' + evicted + ' eviction(s), ' + ooms + ' OOM error(s). Try the same ops with allkeys-lfu: keys used often survive a one-off burst of new keys, which is why LFU suits caches hit by occasional scans.', parts: [
          { type: 'bars', label: 'outcomes', values: [hits, misses, evicted, ooms], idxLabels: ['hits', 'misses', 'evicted', 'OOM'] }
        ] });
        return frames;
      }
    },
    examples: [
      { title: 'Which keys can volatile-lru ever evict?', html: `<p>Only keys with a TTL that have not expired yet: session:a1, cache:user:1, cache:user:2 and ratelimit:1. config:flags, lb:weekly and queue:emails have no TTL and are safe. If no volatile key remains, a write that needs memory fails as if the policy were noeviction.</p>`, code: { lang: 'sql', db: 'redis', code: `SELECT k, bytes, last_access
FROM keyspace
WHERE expire_at IS NOT NULL AND expire_at > 1000
ORDER BY last_access;` } },
      { title: 'Memory by type', html: `<p>Before choosing <code>maxmemory</code>, measure: the cache strings dominate (7 300 bytes), the 5 000-byte feed cache is the biggest single key and the leaderboard the biggest non-cache structure. In production use <code>MEMORY USAGE key</code> on samples and <code>redis-cli --memkeys</code>.</p>`, code: { lang: 'sql', db: 'redis', code: `SELECT type, COUNT(*) AS keys, SUM(bytes) AS bytes
FROM keyspace GROUP BY type ORDER BY bytes DESC;` } },
      { title: 'How much data does each persistence mode risk?', html: `<p>A store doing 20 000 writes/s: with <code>appendfsync everysec</code> up to ~20 000 writes can be lost on power failure; with RDB every 5 minutes up to 6 million; with <code>always</code> none, but every write waits for fsync (throughput drops to what the disk can sync). Asynchronous replicas add their own lag window on failover.</p>`, code: { lang: 'sql', code: `SELECT 20000 * 1        AS aof_everysec_worst_case,
       20000 * 300      AS rdb_5min_worst_case,
       0                AS aof_always_worst_case;` } }
    ],
    deepDive: `<p><b>Fork costs.</b> RDB snapshots and AOF rewrites <code>fork()</code> the process. Forking a 50 GB instance copies page tables (tens to hundreds of ms of stall) and every page written afterwards is duplicated (copy-on-write), so a write-heavy instance can need far more than its dataset size in RAM. Disable transparent huge pages, leave memory headroom, and watch <code>latest_fork_usec</code>.</p>
<p><b>Expiry internals.</b> The active expiry cycle runs about 10 times per second, samples keys from the set of keys with TTLs, deletes the expired ones, and repeats while more than ~10% of the sample was expired (Redis 6+ made this adaptive with <code>active-expire-effort</code>). Replicas do not expire keys on their own; they wait for the primary's DEL, but they report logically expired keys as missing to readers.</p>
<p><b>Eviction internals.</b> Each object has a 24-bit field used as an LRU clock or, with LFU policies, as an 8-bit logarithmic counter plus a decay timestamp. Eviction fills a pool of 16 best candidates from random samples. Raising <code>maxmemory-samples</code> to 10 gets very close to true LRU at small CPU cost. Evictions are reported in <code>INFO stats evicted_keys</code>; a rising number with a falling hit ratio means the cache is too small.</p>
<p><b>Cache patterns around TTLs.</b> Add <b>jitter</b> to TTLs (e.g. 3 600 ± 300 s) so keys written together do not expire together and stampede the database; use a lock or "early recompute" (probabilistic refresh before expiry) for very hot keys; prefer deleting the cache entry after a DB write (cache-aside invalidation) over updating it, to avoid racing writers.</p>`,
    aiEra: `<p><b>What AI changes:</b> LLM calls are slow and expensive, so caching them (exact-match by prompt hash, or semantic by embedding similarity) is now a standard Redis job, and eviction policy directly affects your model bill. Token-budget rate limits per user are TTL'd counters.</p>
<p><b>Use AI as a partner:</b> feed it <code>INFO memory</code> and <code>INFO stats</code> output and ask it to explain the hit ratio, eviction rate and fragmentation, and to suggest maxmemory and policy changes with reasons.</p>
<p><b>Where AI goes wrong:</b> it claims Redis replication is synchronous, recommends <code>volatile-lru</code> for a cache whose keys have no TTL (so nothing can be evicted and writes fail), forgets that the default policy is noeviction, or suggests <code>appendfsync always</code> without mentioning the throughput cost. <b>What you must own:</b> what may be lost, what may be evicted, and how the app behaves when Redis says no.</p>`,
    problems: [{
      title: 'volatile-lru: Which Keys Go First?',
      level: 'Medium', tags: ['redis', 'eviction', 'running sum'], companies: ['Twitter', 'Booking.com', 'Razorpay'],
      statement: `<p>Redis runs with <code>maxmemory-policy volatile-lru</code> and needs to free <b>at least 1 500 bytes</b>. The time is <code>now = 1000</code>. Using <code>keyspace</code> (db <code>redis</code>), list the keys it would evict, in eviction order:</p>
<ul><li>Candidates: keys with a TTL (<code>expire_at</code> not NULL) that have not expired (<code>expire_at &gt; 1000</code>).</li>
<li>Order: oldest <code>last_access</code> first (ties by key name). Use exact LRU.</li>
<li>Stop as soon as the freed total reaches 1 500.</li></ul>
<p>Return <code>k, bytes, freed</code> where <code>freed</code> is the running total.</p>`,
      constraints: `If fewer bytes are available among candidates, return them all (Redis would then fail the write with OOM).`,
      example: `<p>Candidates by last access: ${H.c('r', 'cache:user:2 (400, 1100 B)')} → freed 1 100; ${H.c('r', 'session:a1 (990, 300 B)')} → 1 400, still short; ${H.c('r', 'cache:user:1 (995, 1200 B)')} → 2 600 ≥ 1 500, stop. config:flags is older but has no TTL, so it is ${H.c('g', 'never a candidate')}.</p>`,
      brute: { why: `<p>Sorting <b>all</b> keys by last access (allkeys thinking) would evict config:flags first, which volatile-lru promises never to touch. Forgetting the expiry filter also "evicts" session:b2, which is already logically gone.</p>`, code: { lang: 'sql', db: 'redis', code: `SELECT k, bytes
FROM keyspace
ORDER BY last_access      -- ignores the TTL rule and the stopping point
LIMIT 3;` } },
      mcq: { q: 'Under volatile-lru, every key without a TTL is permanent and no key has a TTL. A write needs memory. What happens?', options: ['The write fails with an OOM error', 'Redis evicts the least recently used key anyway', 'Redis expands maxmemory', 'Redis evicts a random key'], answer: 0, explain: 'volatile-* policies only consider keys with an expiry. With no candidates Redis behaves like noeviction and rejects the write.' },
      hints: [
        `<p>Hint 1: Filter candidates first: <code>expire_at IS NOT NULL AND expire_at &gt; 1000</code>.</p>`,
        `<p>Hint 2: A running total: <code>SUM(bytes) OVER (ORDER BY last_access, k ROWS UNBOUNDED PRECEDING)</code>.</p>`,
        `<p>Hint 3: Keep a row if the total <b>before</b> it was still short: <code>freed - bytes &lt; 1500</code>. That includes the key that crosses the line.</p>`
      ],
      tests: { engine: 'sqlite', cmp: 'exact', cases: [
        { rows: [['cache:user:2', 1100, 1100], ['session:a1', 300, 1400], ['cache:user:1', 1200, 2600]] },
        { setup: "UPDATE keyspace SET last_access = 100 WHERE k = 'ratelimit:1'", rows: [['ratelimit:1', 200, 200], ['cache:user:2', 1100, 1300], ['session:a1', 300, 1600]] },
        { setup: 'UPDATE keyspace SET expire_at = NULL', rows: [] },
        { setup: "UPDATE keyspace SET bytes = 2000 WHERE k = 'cache:user:2'", rows: [['cache:user:2', 2000, 2000]] },
        { setup: "UPDATE keyspace SET expire_at = 999 WHERE k = 'cache:user:2'", rows: [['session:a1', 300, 300], ['cache:user:1', 1200, 1500]] },
        { setup: 'DELETE FROM keyspace', rows: [] },
        { setup: "INSERT INTO keyspace VALUES ('tmp:x', 'string', 50, 2000, 10, 1)", rows: [['tmp:x', 50, 50], ['cache:user:2', 1100, 1150], ['session:a1', 300, 1450], ['cache:user:1', 1200, 2650]] }
      ] },
      solution: {
        approach: `<p>Filter to volatile, unexpired keys; order by last access; compute the running total of bytes; keep every key whose preceding total is below the target. That is exactly "evict until enough is free".</p>`,
        code: { lang: 'sql', db: 'redis', code: `WITH candidates AS (
  SELECT k, bytes, last_access
  FROM keyspace
  WHERE expire_at IS NOT NULL      -- volatile-*: only keys with a TTL
    AND expire_at > 1000           -- already-expired keys are simply gone
), ordered AS (
  SELECT k, bytes,
         SUM(bytes) OVER (ORDER BY last_access, k ROWS UNBOUNDED PRECEDING) AS freed
  FROM candidates
)
SELECT k, bytes, freed
FROM ordered
WHERE freed - bytes < 1500        -- still short before evicting this key
ORDER BY freed;` },
        complexity: `<p>O(n log n) to sort candidates. Real Redis avoids the sort entirely: it samples a few keys per eviction (O(1) per eviction), trading exactness for speed.</p>`,
        followUps: ['How would the answer change under volatile-ttl?', 'Why can approximate LRU evict a key that exact LRU would keep?']
      }
    }]
  });

  /* =====================================================================
     TOPIC 6 — Cassandra query-first design & tunable consistency
     ===================================================================== */
  topics.push({
    title: 'Cassandra: Query-First Tables, Partition & Clustering Keys, Tunable Consistency',
    analogy: `<p>A <b>filing cabinet per question</b>. The <b>drawer</b> is chosen by the partition key (which node, which file), and inside the drawer folders are kept <b>in sorted order</b> by the clustering columns. Answering "Sensor s2's readings on 2 September, newest first" means opening exactly one drawer and reading from the front. A question the cabinet was not organised for means opening every drawer in the building, so you build <b>another cabinet</b> for that question.</p>`,
    explain: `<p>A CQL primary key has two parts: <code>PRIMARY KEY ((partition_key_cols), clustering_cols)</code>.</p>
<ul>
<li>The <b>partition key</b> is hashed (Murmur3) to a token; the token decides which nodes (RF replicas) store the partition. Every efficient query supplies the <b>full partition key with equality</b>.</li>
<li><b>Clustering columns</b> sort rows <i>inside</i> a partition (<code>WITH CLUSTERING ORDER BY (ts DESC)</code>). Queries may use <code>=</code> on leading clustering columns and a range (<code>&lt;, &gt;, IN</code>) on the next one, and read in clustering order or its reverse.</li>
<li>No joins, no GROUP BY across partitions, no filtering on arbitrary columns (without <code>ALLOW FILTERING</code>, which scans).</li>
</ul>
<p><b>Query-first design steps:</b> (1) list the queries; (2) one table per query, named after it (<code>readings_by_sensor_day</code>, <code>messages_by_author</code>); (3) partition key = what the query gives with <code>=</code>; clustering = the sort order; (4) <b>bucket</b> the partition (day, month, hour) so it stays bounded; (5) duplicate data across tables and write them together (logged batch for atomicity across tables, not for speed).</p>
<p><b>Partition sizing:</b> rows per partition × row size. Common guidance: keep partitions under ~100 MB and ~100 000 rows. A sensor at 1 reading/s for a day is 86 400 rows: fine per day, too big per month.</p>
<p><b>Tunable consistency</b> per request: with replication factor <b>RF</b>, a write at consistency level W waits for W replicas to acknowledge; a read at R asks R replicas and returns the newest value. If <b>W + R &gt; RF</b>, every read set overlaps the latest write set, so reads see the latest acknowledged write.</p>
${H.table(['Level', 'Replicas needed (RF = 3)', 'Notes'], [
  ['ONE / TWO / THREE', '1 / 2 / 3', 'ONE is fastest, may read stale data'],
  ['QUORUM', '⌊RF/2⌋ + 1 = 2', 'across all datacenters'],
  ['LOCAL_QUORUM', 'quorum of the local DC', 'the default choice for multi-DC apps: strong within a DC, no cross-ocean wait'],
  ['EACH_QUORUM', 'quorum in every DC (writes)', 'expensive, rarely needed'],
  ['ALL', '3', 'any replica down → request fails'],
  ['SERIAL / LOCAL_SERIAL', 'Paxos quorum', 'lightweight transactions: <code>INSERT ... IF NOT EXISTS</code>, <code>UPDATE ... IF col = x</code>']
])}
<p>Conflicts are resolved by <b>last-write-wins per cell</b> using write timestamps; with equal timestamps the greater value wins (and a deletion wins over a write). <b>Deletes write tombstones</b>, which must be read past until compaction removes them after <code>gc_grace_seconds</code> (default 10 days): queue-like tables full of deletes become slow.</p>`,
    clues: [
      '"time series", "IoT", "write-heavy", "append-only" → partition (source, time bucket), cluster by time',
      '"query by a column that is not in the key" → a new table keyed by that column (or SAI in Cassandra 5 for modest selectivity)',
      '"ALLOW FILTERING" in a design → the table does not match the query',
      '"partition keeps growing", "large partition warning" → add a time bucket to the partition key',
      '"strongly consistent reads in each region" → LOCAL_QUORUM writes + LOCAL_QUORUM reads',
      '"only one user can claim this username" → lightweight transaction (IF NOT EXISTS, Paxos)'
    ],
    code: [
      { lang: 'text', check: false, title: 'CQL: one table per query', code: `CREATE KEYSPACE iot
  WITH replication = {'class': 'NetworkTopologyStrategy', 'dc_mumbai': 3, 'dc_frankfurt': 3};

-- Q1: readings of one sensor on one day, newest first
CREATE TABLE iot.readings_by_sensor_day (
    sensor_id text,
    day       date,
    ts        timestamp,
    value     double,
    PRIMARY KEY ((sensor_id, day), ts)
) WITH CLUSTERING ORDER BY (ts DESC)
  AND compaction = {'class': 'TimeWindowCompactionStrategy',
                    'compaction_window_unit': 'DAYS', 'compaction_window_size': 1}
  AND default_time_to_live = 7776000;           -- 90 days, expires whole SSTables cheaply

-- Q2: latest reading per sensor for the dashboard (upsert = overwrite one row)
CREATE TABLE iot.latest_by_sensor (
    sensor_id text PRIMARY KEY,
    ts        timestamp,
    value     double
);

-- write both tables in one logged batch (atomic across tables, not faster)
BEGIN BATCH
  INSERT INTO iot.readings_by_sensor_day (sensor_id, day, ts, value) VALUES ('s2', '2026-09-02', '2026-09-02 12:00:00+0000', 33.5);
  INSERT INTO iot.latest_by_sensor (sensor_id, ts, value) VALUES ('s2', '2026-09-02 12:00:00+0000', 33.5);
APPLY BATCH;

CONSISTENCY LOCAL_QUORUM;
SELECT ts, value FROM iot.readings_by_sensor_day
 WHERE sensor_id = 's2' AND day = '2026-09-02' AND ts >= '2026-09-02 10:00:00+0000'
 LIMIT 100;

-- lightweight transaction (Paxos, SERIAL consistency)
INSERT INTO iot.sensors_by_name (name, sensor_id) VALUES ('boiler-1', 's9') IF NOT EXISTS;` },
      { lang: 'sql', db: 'cass', title: 'Partitions and their sizes (runnable)', code: `-- (sensor_id, day) is the partition key; ts is the clustering column.
SELECT sensor_id, day,
       COUNT(*)              AS rows_in_partition,
       MIN(ts) AS first_ts,  MAX(ts) AS last_ts
FROM readings_by_sensor
GROUP BY sensor_id, day
ORDER BY sensor_id, day;` }
    ],
    codeTitle: ['CQL', 'Partition report'],
    viz: {
      title: 'Tunable consistency on a 6-node ring',
      input: '3 | QUORUM | ONE | 1',
      inputLabel: 'RF (1-5) | write CL | read CL (ONE, TWO, THREE, QUORUM, ALL) | replicas down (0..RF)',
      gen: function (input) {
        var p = String(input || '').split('|').map(function (s) { return s.trim().toUpperCase(); });
        if (p.length !== 4) throw new Error('Format: RF | writeCL | readCL | down   e.g.  3 | QUORUM | ONE | 1');
        var rf = Number(p[0]), down = Number(p[3]);
        if (!(rf >= 1 && rf <= 5) || Math.floor(rf) !== rf) throw new Error('RF must be 1..5');
        if (!(down >= 0 && down <= rf) || Math.floor(down) !== down) throw new Error('down must be 0..RF');
        function need(cl) { var m = { ONE: 1, TWO: 2, THREE: 3, QUORUM: Math.floor(rf / 2) + 1, ALL: rf }; if (!(cl in m)) throw new Error('CL must be ONE, TWO, THREE, QUORUM or ALL'); if (m[cl] > rf) throw new Error(cl + ' needs more replicas than RF'); return m[cl]; }
        var w = need(p[1]), r = need(p[2]), up = rf - down, frames = [];
        var nodes = [], ids = ['N1', 'N2', 'N3', 'N4', 'N5', 'N6'];
        ids.forEach(function (id, i) { var a = i * Math.PI / 3; nodes.push({ id: id, label: id, x: 50 + 30 * Math.cos(a), y: 30 + 22 * Math.sin(a) }); });
        nodes.push({ id: 'C', label: 'client', x: 6, y: 30, shape: 'box' });
        var reps = ids.slice(0, rf), dead = reps.slice(0, down), live = reps.slice(down);
        var ring = ids.map(function (id, i) { return [id, ids[(i + 1) % 6]]; });
        function g(hl, ehl, tags) { return { type: 'graph', directed: true, height: 60, nodes: nodes, edges: ring.concat(reps.map(function (x) { return ['C', x]; })), hl: hl, ehl: ehl || {}, tags: tags || {} }; }
        var base = {}; dead.forEach(function (d) { base[d] = 'bad'; });
        frames.push({ narr: 'Key <code>sensor s2 / 2026-09-02</code> hashes to a token owned by <b>' + reps.join(', ') + '</b> (RF = ' + rf + '). ' + (down ? '<span class="c-r">' + dead.join(', ') + ' down</span>.' : 'All replicas up.') + ' The client talks to a coordinator, which forwards to replicas.', parts: [g(base, {}, (function () { var t = {}; reps.forEach(function (x) { t[x] = 'replica'; }); dead.forEach(function (x) { t[x] = 'DOWN'; }); return t; })())] });
        var hl1 = Object.assign({}, base), eh1 = {}; live.forEach(function (x) { hl1[x] = 'cur'; eh1['C-' + x] = 'cur'; });
        frames.push({ narr: 'WRITE at <b>' + p[1] + '</b>: the coordinator sends the mutation to <i>all</i> ' + rf + ' replicas but only waits for <b>' + w + '</b> acknowledgement(s). ' + up + ' replica(s) can answer.', parts: [g(hl1, eh1), { type: 'vars', label: 'write', vals: { RF: rf, W_needed: w, replicas_up: up } }] });
        var wOk = up >= w, hl2 = Object.assign({}, base);
        live.forEach(function (x, i) { if (i < w) hl2[x] = 'ok'; });
        frames.push({ narr: wOk ? '<span class="c-g">Write succeeds</span>: ' + w + ' ack(s) arrived. Down replicas get the data later via hints (hinted handoff, kept up to 3 h by default) or repair.' : '<span class="c-r">Write fails</span> with UnavailableException: only ' + up + ' replica(s) alive but ' + w + ' required. Lower the CL or restore nodes.', parts: [g(hl2), { type: 'vars', label: 'write result', vals: { acks: Math.min(up, w), needed: w, ok: wOk ? 'yes' : 'no' }, hl: wOk ? {} : { ok: 'bad' } }] });
        var rOk = up >= r, hl3 = Object.assign({}, base);
        live.slice(-r).forEach(function (x) { hl3[x] = 'sel'; });
        frames.push({ narr: 'READ at <b>' + p[2] + '</b>: the coordinator asks ' + r + ' replica(s) (one for data, the rest for digests) and returns the newest cell by timestamp. ' + (rOk ? 'Enough replicas are up.' : '<span class="c-r">Not enough replicas up: the read fails.</span>'), parts: [g(hl3), { type: 'vars', label: 'read', vals: { R_needed: r, replicas_up: up, ok: rOk ? 'yes' : 'no' } }] });
        var strong = w + r > rf;
        frames.push({ narr: 'W + R = ' + w + ' + ' + r + ' = <b>' + (w + r) + '</b> ' + (strong ? '&gt;' : '≤') + ' RF = ' + rf + '. ' + (strong ? '<span class="c-g">Every read set overlaps every write set</span>, so a successful read sees the latest acknowledged write.' : '<span class="c-y">Read and write sets may not overlap</span>: a read can hit only replicas that missed the write and return stale data (eventual consistency).'), parts: [
          { type: 'bars', label: 'replicas', values: [w, r, rf], idxLabels: ['W', 'R', 'RF'], hl: strong ? { 0: 'ok', 1: 'ok' } : { 0: 'cur', 1: 'cur' } },
          { type: 'text', html: 'Common choices: <b>LOCAL_QUORUM / LOCAL_QUORUM</b> (strong per DC), <b>ONE / ONE</b> (fast, eventual), <b>ALL / ONE</b> (fast reads, fragile writes).' }
        ] });
        return frames;
      }
    },
    examples: [
      { title: 'Reading one partition in clustering order', html: `<p>"Sensor s2 on 2 September, newest first" names the whole partition key, so it touches one partition on one replica set and reads rows already sorted by <code>ts</code>. That is the shape every Cassandra query should have.</p>`, code: { lang: 'sql', db: 'cass', code: `SELECT ts, value
FROM readings_by_sensor
WHERE sensor_id = 's2' AND day = '2026-09-02'   -- full partition key with =
ORDER BY ts DESC                                -- clustering order (reversed)
LIMIT 3;` } },
      { title: 'The query Cassandra refuses', html: `<p>"All readings above 30 degrees" has no partition key. In CQL this needs <code>ALLOW FILTERING</code> and scans every partition on every node. The fix is not the flag: it is a table designed for the question (for example <code>alerts_by_day</code> written when a reading crosses a threshold) or an analytics job (Spark) over the data.</p>`, code: { lang: 'sql', db: 'cass', code: `-- what ALLOW FILTERING would do: look at every row everywhere
SELECT sensor_id, day, ts, value
FROM readings_by_sensor
WHERE value > 30
ORDER BY sensor_id, day, ts;` } },
      { title: 'Which consistency pairs are strong?', html: `<p>Compute replicas per level for each RF and test W + R &gt; RF. RF = 3 with QUORUM/QUORUM (2 + 2) and ALL/ONE (3 + 1) are strong; ONE/QUORUM (1 + 2 = 3) is not.</p>`, code: { lang: 'sql', db: 'cass', code: `SELECT id, rf, write_cl, read_cl
FROM cl_combos
WHERE write_cl = 'QUORUM' AND read_cl = 'QUORUM';` } }
    ],
    deepDive: `<p><b>Write path.</b> A write appends to the commit log and updates the memtable, then is acknowledged; memtables flush to immutable SSTables, and compaction merges them. Writes never read before writing, which is why INSERT and UPDATE are both upserts and why writes are cheap. Reads may consult several SSTables (bloom filters and partition indexes narrow it down), which is why compaction strategy matters: <b>STCS</b> for write-heavy, <b>LCS</b> for read-heavy with updates, <b>TWCS</b> for TTL'd time series, and in Cassandra 5 the <b>Unified Compaction Strategy</b> that can emulate them.</p>
<p><b>Anti-entropy.</b> Replicas converge through hinted handoff (coordinator stores writes for a down node), read repair (a mismatching digest during a read triggers a repair of that partition) and full/incremental <b>repair</b> (Merkle-tree comparison). Run repair within <code>gc_grace_seconds</code>, or deleted data can come back to life ("zombie" rows) when a replica that missed a tombstone streams the old value back.</p>
<p><b>Indexes and views.</b> Classic secondary indexes are local to each node (a query must ask every node) and suit low-cardinality, partition-restricted lookups. Materialized views remain experimental and are disabled by default in recent versions. Cassandra 5.0's <b>Storage-Attached Indexes (SAI)</b> make secondary lookups and vector search practical, but they still fan out to all nodes when the partition key is not given, so query-first tables remain the default for hot paths.</p>
<p><b>Cassandra 4 and 5 highlights.</b> 4.0: zero-copy streaming, audit and full query logging, virtual tables, much faster repairs. 5.0: SAI, trie-based memtables and SSTables (lower memory), UCS, vector type and ANN search, dynamic data masking, Java 17. ScyllaDB is a C++ reimplementation with shard-per-core architecture and the same data model.</p>`,
    aiEra: `<p><b>What AI changes:</b> Cassandra 5's vector type plus SAI lets teams store embeddings next to time-series or catalogue data; DataStax Astra markets it for RAG at scale. Assistants can generate CQL schemas from a list of queries quickly.</p>
<p><b>Use AI as a partner:</b> give it the queries and rates and ask for one table per query, the partition key, the clustering order, the bucket size with the arithmetic (rows/partition, bytes/partition), and the consistency levels. Then verify the arithmetic.</p>
<p><b>Where AI goes wrong:</b> relational designs with <code>ALLOW FILTERING</code>, unbounded partitions keyed only by user, queues built from deletes (tombstone storms), unlogged batches across partitions "for speed", and claims that QUORUM is linearizable without mentioning LWW clock skew. <b>What you must own:</b> partition sizing, the tombstone budget, and the W + R arithmetic.</p>`,
    problems: [{
      title: 'Strongly Consistent Consistency-Level Pairs',
      level: 'Easy', tags: ['cassandra', 'tunable consistency', 'quorum', 'CASE'], companies: ['Apple', 'Netflix', 'Discord'],
      statement: `<p>For each row of <code>cl_combos(id, rf, write_cl, read_cl)</code> (single datacenter, db <code>cass</code>) compute how many replicas each level needs and whether the pair gives strongly consistent reads (<code>W + R &gt; RF</code>).</p>
<p>Replicas: ONE = 1, TWO = 2, THREE = 3, QUORUM and LOCAL_QUORUM = ⌊RF / 2⌋ + 1, ALL = RF. Return <code>id, w, r, strong</code> (strong = 1 or 0) ordered by id.</p>`,
      constraints: `RF ≥ 1; all levels in the data are valid for their RF.`,
      example: `<p>RF 3, ONE/QUORUM → w = 1, r = 2, 1 + 2 = 3 is not &gt; 3 → ${H.c('r', 'strong = 0')}. RF 1, ONE/ONE → 1 + 1 = 2 &gt; 1 → ${H.c('g', 'strong = 1')} (only one copy exists).</p>`,
      brute: { why: `<p>Hard-coding "QUORUM/QUORUM is strong, everything else is not" is wrong for ALL/ONE, ONE/ALL and RF = 1, and it does not generalise to RF = 5 where TWO/THREE is still not enough.</p>`, code: { lang: 'sql', db: 'cass', code: `SELECT id, NULL AS w, NULL AS r,
       CASE WHEN write_cl = 'QUORUM' AND read_cl = 'QUORUM' THEN 1 ELSE 0 END AS strong
FROM cl_combos ORDER BY id;` } },
      mcq: { q: 'RF = 4. Is QUORUM writes + QUORUM reads strongly consistent?', options: ['Yes: quorum is 3, and 3 + 3 = 6 > 4', 'No: 2 + 2 = 4 is not > 4', 'Only with LOCAL_QUORUM', 'Only if no node is down'], answer: 0, explain: 'QUORUM = floor(4/2) + 1 = 3. Even RFs make quorum relatively expensive, which is why RF 3 or 5 is preferred.' },
      hints: [
        `<p>Hint 1: Map a level to a replica count with a CASE that can use <code>rf</code>; integer division <code>rf / 2 + 1</code> is the quorum.</p>`,
        `<p>Hint 2: Compute w and r in a CTE so you can reuse them in the strong test.</p>`,
        `<p>Hint 3: Treat LOCAL_QUORUM like QUORUM (single DC). <code>CASE WHEN w + r &gt; rf THEN 1 ELSE 0 END</code>.</p>`
      ],
      tests: { engine: 'sqlite', cmp: 'exact', cases: [
        { rows: [[1, 2, 2, 1], [2, 1, 1, 0], [3, 3, 1, 1], [4, 1, 2, 0], [5, 3, 3, 1], [6, 2, 3, 0], [7, 1, 3, 1], [8, 1, 1, 1]] },
        { setup: 'UPDATE cl_combos SET rf = 4 WHERE id = 1', rows: [[1, 3, 3, 1], [2, 1, 1, 0], [3, 3, 1, 1], [4, 1, 2, 0], [5, 3, 3, 1], [6, 2, 3, 0], [7, 1, 3, 1], [8, 1, 1, 1]] },
        { setup: 'UPDATE cl_combos SET rf = 6 WHERE id = 6', rows: [[1, 2, 2, 1], [2, 1, 1, 0], [3, 3, 1, 1], [4, 1, 2, 0], [5, 3, 3, 1], [6, 2, 3, 0], [7, 1, 3, 1], [8, 1, 1, 1]] },
        { setup: 'DELETE FROM cl_combos', rows: [] },
        { setup: "DELETE FROM cl_combos; INSERT INTO cl_combos VALUES (9, 3, 'TWO', 'TWO'), (10, 2, 'QUORUM', 'ONE')", rows: [[9, 2, 2, 1], [10, 2, 1, 1]] },
        { setup: "DELETE FROM cl_combos WHERE id > 2; INSERT INTO cl_combos VALUES (11, 3, 'LOCAL_QUORUM', 'LOCAL_QUORUM'), (12, 5, 'ALL', 'ONE')", rows: [[1, 2, 2, 1], [2, 1, 1, 0], [11, 2, 2, 1], [12, 5, 1, 1]] }
      ] },
      solution: {
        approach: `<p>A CASE maps each level to a replica count (quorum depends on RF), a CTE computes w and r once, and the outer SELECT tests the overlap condition.</p>`,
        code: { lang: 'sql', db: 'cass', code: `WITH n AS (
  SELECT id, rf,
         CASE write_cl WHEN 'ONE' THEN 1 WHEN 'TWO' THEN 2 WHEN 'THREE' THEN 3
                       WHEN 'QUORUM' THEN rf / 2 + 1 WHEN 'LOCAL_QUORUM' THEN rf / 2 + 1
                       WHEN 'ALL' THEN rf END AS w,
         CASE read_cl  WHEN 'ONE' THEN 1 WHEN 'TWO' THEN 2 WHEN 'THREE' THEN 3
                       WHEN 'QUORUM' THEN rf / 2 + 1 WHEN 'LOCAL_QUORUM' THEN rf / 2 + 1
                       WHEN 'ALL' THEN rf END AS r
  FROM cl_combos
)
SELECT id, w, r, CASE WHEN w + r > rf THEN 1 ELSE 0 END AS strong
FROM n
ORDER BY id;` },
        complexity: `<p>O(n). The real-world lesson: strong reads cost latency and availability. With RF 3, QUORUM/QUORUM tolerates one replica down for both reads and writes; ALL/ONE tolerates none for writes.</p>`,
        followUps: ['Does W + R > RF make Cassandra linearizable? (No: LWW timestamps, clock skew and failed writes that partially applied.)', 'Which levels would you use for a two-datacenter deployment?']
      }
    }]
  });

  /* =====================================================================
     TOPIC 7 — DynamoDB keys, GSIs and single-table design
     ===================================================================== */
  topics.push({
    title: 'DynamoDB: Partition & Sort Keys, GSIs and Single-Table Design',
    analogy: `<p>A <b>hotel's key cabinet</b>. The <b>partition key</b> is the room number: it tells staff which cabinet to open. Inside that room's slot, cards are <b>sorted</b> (the sort key) so "all bills for room 204 in September" is one contiguous run of cards. A <b>GSI</b> is a second cabinet, kept up to date by the front desk a moment later, that files the same cards by a different label, such as "all unpaid bills".</p>`,
    explain: `<p>A DynamoDB table stores <b>items</b> (up to 400 KB each) addressed by a primary key:</p>
<ul>
<li><b>Partition key (PK)</b> only: <code>GetItem</code> by exact key.</li>
<li><b>PK + sort key (SK)</b>: all items with one PK form an <b>item collection</b>, stored sorted by SK. <code>Query</code> takes <code>PK = :v</code> plus an optional SK condition: <code>=, &lt;, &lt;=, &gt;, &gt;=, BETWEEN, begins_with</code>, and reads forward or backward (<code>ScanIndexForward: false</code>).</li>
</ul>
<p>Everything else is a <code>Scan</code> (reads the whole table) or a <code>FilterExpression</code>, which is applied <b>after</b> items are read and still costs capacity for every item read. Each Query or Scan page returns at most 1 MB.</p>
${H.table(['Index', 'Key', 'Consistency', 'Notes'], [
  ['Base table', 'PK [+ SK]', 'eventual by default; strongly consistent reads available', '1 RCU = one 4 KB strongly consistent read/s (eventual = half); 1 WCU = one 1 KB write/s'],
  ['<b>GSI</b> (global secondary index)', 'any attributes as new PK [+ SK]', '<b>eventually consistent only</b>', 'add/remove any time; its own capacity; items lacking the key attribute are absent (<b>sparse index</b>); default quota 20 per table'],
  ['<b>LSI</b> (local secondary index)', 'same PK, different SK', 'strong reads possible', 'must be created with the table; max 5; caps each item collection at 10 GB']
])}
<p><b>Single-table design:</b> put several entity types in one table with generic key names (<code>PK</code>, <code>SK</code>, <code>GSI1PK</code>, <code>GSI1SK</code>) and typed prefixes, so that items needed together share a partition and are fetched by one Query:</p>
${H.table(['Access pattern', 'Key condition'], [
  ['customer profile + addresses + orders', '<code>PK = CUST#1</code>'],
  ['a customer\'s orders, newest first', '<code>PK = CUST#1 AND begins_with(SK, "ORDER#")</code>, descending'],
  ['September orders of a customer', '<code>PK = CUST#1 AND SK BETWEEN "ORDER#2026-09" AND "ORDER#2026-09~"</code>'],
  ['lines of one order', '<code>PK = ORDER#o1</code>'],
  ['all paid orders, newest first', 'GSI1: <code>GSI1PK = STATUS#paid</code>, descending on GSI1SK']
])}
<p>Design rules: list access patterns first; choose high-cardinality PKs so traffic spreads; encode hierarchy and time in the SK (<code>ORDER#2026-09-01#o1</code>) so <code>begins_with</code> and ranges work; use <b>sparse GSIs</b> for "only items in state X"; and model many-to-many with the <b>adjacency list</b> pattern (an edge item under each side, or an inverted GSI that swaps PK and SK). Multi-item atomic changes use <code>TransactWriteItems</code> (up to 100 actions); optimistic locking uses a <code>ConditionExpression</code> on a version attribute.</p>`,
    clues: [
      '"get X and its children in one request" → same PK, typed SK prefixes (item collection)',
      '"newest N", "between dates" → time-sortable SK + ScanIndexForward=false / BETWEEN',
      '"look up by another attribute" → GSI (eventually consistent) or an extra item keyed by it',
      '"only items needing attention" → sparse GSI (attribute present only on those items)',
      '"we keep using Scan with a filter" → missing key design or GSI',
      '"must update the order and the stock together" → TransactWriteItems or a condition expression'
    ],
    code: [
      { lang: 'json', title: 'Query: newest 2 orders of a customer (request JSON)', code: `{
  "TableName": "app_table",
  "KeyConditionExpression": "PK = :pk AND begins_with(SK, :prefix)",
  "ExpressionAttributeValues": {
    ":pk":     { "S": "CUST#1" },
    ":prefix": { "S": "ORDER#" }
  },
  "ScanIndexForward": false,
  "Limit": 2
}` },
      { lang: 'json', title: 'Transaction: place an order and decrement stock atomically', code: `{
  "TransactItems": [
    { "Put": {
        "TableName": "app_table",
        "Item": { "PK": { "S": "CUST#1" }, "SK": { "S": "ORDER#2026-09-10#o9" },
                  "GSI1PK": { "S": "STATUS#paid" }, "GSI1SK": { "S": "2026-09-10#o9" },
                  "total": { "N": "120" } },
        "ConditionExpression": "attribute_not_exists(SK)" } },
    { "Update": {
        "TableName": "app_table",
        "Key": { "PK": { "S": "PRODUCT#PEN" }, "SK": { "S": "STOCK" } },
        "UpdateExpression": "SET qty = qty - :n",
        "ConditionExpression": "qty >= :n",
        "ExpressionAttributeValues": { ":n": { "N": "3" } } } }
  ]
}` },
      { lang: 'sql', db: 'dynamo', title: 'The item collection for CUST#1 (runnable)', code: `-- WITHOUT ROWID keeps rows sorted by (pk, sk), like a DynamoDB partition.
-- Query PK = 'CUST#1' returns the profile, the address and the orders at once.
SELECT pk, sk, type, attrs
FROM app_table
WHERE pk = 'CUST#1'
ORDER BY sk;` }
    ],
    codeTitle: ['Query JSON', 'TransactWriteItems', 'Item collection in SQL'],
    viz: {
      title: 'How a DynamoDB Query finds items',
      input: 'CUST#1 | begins_with ORDER# | desc | 2',
      inputLabel: 'PK value | SK condition: begins_with X · between A B · > X · < X · = X · all | asc or desc | Limit (1-10)',
      gen: function (input) {
        var ITEMS = [
          ['CUST#1', 'ADDR#home'], ['CUST#1', 'ORDER#2026-09-01#o1'], ['CUST#1', 'ORDER#2026-09-05#o3'], ['CUST#1', 'PROFILE'],
          ['CUST#2', 'ORDER#2026-09-02#o2'], ['CUST#2', 'ORDER#2026-09-07#o5'], ['CUST#2', 'PROFILE'],
          ['CUST#3', 'ORDER#2026-09-06#o4'], ['CUST#3', 'PROFILE'],
          ['ORDER#o1', 'ITEM#BOOK'], ['ORDER#o1', 'ITEM#PEN'], ['ORDER#o3', 'ITEM#MUG'], ['ORDER#o3', 'ITEM#PEN']
        ];
        var p = String(input || '').split('|').map(function (s) { return s.trim(); });
        if (p.length !== 4) throw new Error('Format: PK | condition | asc|desc | limit   e.g.  CUST#1 | begins_with ORDER# | desc | 2');
        var pk = p[0], dir = p[2].toLowerCase(), lim = Number(p[3]);
        if (dir !== 'asc' && dir !== 'desc') throw new Error('Direction must be asc or desc');
        if (!(lim >= 1 && lim <= 10) || Math.floor(lim) !== lim) throw new Error('Limit must be 1..10');
        var c = p[1].split(/\s+/), test, desc;
        if (c[0] === 'all') { test = function () { return true; }; desc = 'no SK condition'; }
        else if (c[0] === 'begins_with' && c.length === 2) { test = function (s) { return s.indexOf(c[1]) === 0; }; desc = 'begins_with(SK, "' + c[1] + '")'; }
        else if (c[0] === 'between' && c.length === 3) { test = function (s) { return s >= c[1] && s <= c[2]; }; desc = 'SK BETWEEN "' + c[1] + '" AND "' + c[2] + '"'; }
        else if (['>', '<', '='].indexOf(c[0]) >= 0 && c.length === 2) { test = function (s) { return c[0] === '>' ? s > c[1] : c[0] === '<' ? s < c[1] : s === c[1]; }; desc = 'SK ' + c[0] + ' "' + c[1] + '"'; }
        else throw new Error('Condition must be: all | begins_with X | between A B | > X | < X | = X');
        var pks = []; ITEMS.forEach(function (it) { if (pks.indexOf(it[0]) < 0) pks.push(it[0]); });
        function part(k) { var h = 0; for (var i = 0; i < k.length; i++) h = (h * 31 + k.charCodeAt(i)) % 1000; return h % 3; }
        var frames = [], partNo = part(pk);
        frames.push({ narr: 'Query on <b>PK = ' + pk + '</b> with ' + desc + ', ' + (dir === 'desc' ? 'ScanIndexForward = false' : 'ascending') + ', Limit ' + lim + '. Step 1: hash the partition key to find the physical partition (no other partition is touched).', parts: [
          { type: 'bars', label: 'item collections per physical partition (hash of PK mod 3)', values: [0, 1, 2].map(function (n) { return pks.filter(function (k) { return part(k) === n; }).length; }), idxLabels: ['P0', 'P1', 'P2'], hl: (function () { var h = {}; h[partNo] = 'sel'; return h; })() },
          { type: 'vars', label: 'routing', vals: { pk: pk, partition: 'P' + partNo } }
        ] });
        var coll = ITEMS.filter(function (it) { return it[0] === pk; }).map(function (it) { return it[1]; }).sort();
        if (!coll.length) {
          frames.push({ narr: 'No item has PK ' + pk + '. The Query returns 0 items and costs the minimum read (0.5 RCU eventually consistent).', parts: [{ type: 'array', label: 'item collection', values: ['(empty)'] }] });
          frames.push({ narr: 'Compare: finding this with a <b>Scan</b> would read all ' + ITEMS.length + ' items in the table.', parts: [{ type: 'bars', label: 'items read', values: [0, ITEMS.length], idxLabels: ['Query', 'Scan'] }] });
          return frames;
        }
        frames.push({ narr: 'Step 2: inside the partition, the item collection for ' + pk + ' is stored <b>sorted by SK</b> (' + coll.length + ' items). Sort keys compare as UTF-8 bytes, so prefixes cluster together.', parts: [{ type: 'array', label: 'item collection (sorted SK)', values: coll }] });
        var order = coll.slice(); if (dir === 'desc') order.reverse();
        var got = [], hl = {};
        order.forEach(function (s, i) {
          var idx = coll.indexOf(s);
          if (got.length >= lim) return;
          var ok = test(s);
          if (ok) { got.push(s); hl[idx] = 'ok'; } else hl[idx] = 'done';
          var h2 = Object.assign({}, hl); h2[idx] = ok ? 'ok' : 'bad';
          frames.push({ narr: 'Read SK <b>' + s + '</b> → ' + (ok ? '<span class="c-g">matches</span> the key condition (' + got.length + '/' + lim + ')' : 'outside the range; the key condition is a <b>range seek</b>, so DynamoDB skips such items without charging for them') + '.', parts: [{ type: 'array', label: 'item collection (' + dir + ')', values: coll, hl: h2 }] });
        });
        frames.push({ narr: 'Result: <b>' + got.length + '</b> item(s): ' + (got.join(', ') || 'none') + '. A FilterExpression would instead read items first and drop them afterwards, paying RCU for every item read. And the same lookup via Scan would read all ' + ITEMS.length + ' items.', parts: [
          { type: 'table', label: 'Query result', columns: ['PK', 'SK'], rows: got.map(function (s) { return [pk, s]; }) },
          { type: 'bars', label: 'items read', values: [got.length, ITEMS.length], idxLabels: ['Query', 'Scan'], hl: { 0: 'ok', 1: 'bad' } }
        ] });
        return frames;
      }
    },
    examples: [
      { title: 'One request, three entity types', html: `<p><code>Query PK = CUST#1</code> returns the address, two orders and the profile in SK order. A relational schema would need a join across three tables; here the join was done at write time by choosing the same PK.</p>`, code: { lang: 'sql', db: 'dynamo', code: `SELECT sk, type FROM app_table WHERE pk = 'CUST#1' ORDER BY sk;` } },
      { title: 'Sparse GSI: cancelled orders only', html: `<p>GSI1 indexes only items that have <code>GSI1PK</code>. Profiles and lines have none, so the index is small. Querying <code>GSI1PK = STATUS#cancelled</code> is a cheap "work queue" of orders needing attention. Remove the attribute when handled and the item leaves the index.</p>`, code: { lang: 'sql', db: 'dynamo', code: `SELECT gsi1pk, gsi1sk, pk
FROM app_table
WHERE gsi1pk = 'STATUS#cancelled'
ORDER BY gsi1sk DESC;` } },
      { title: 'BETWEEN on a date-encoded sort key', html: `<p>Orders of CUST#2 placed in September: the SK starts with <code>ORDER#2026-09</code>. Using an upper bound with a high character (<code>~</code> sorts after digits and letters) captures the whole month without a FilterExpression.</p>`, code: { lang: 'sql', db: 'dynamo', code: `SELECT sk, json_extract(attrs, '$.total') AS total
FROM app_table
WHERE pk = 'CUST#2' AND sk BETWEEN 'ORDER#2026-09' AND 'ORDER#2026-09~'
ORDER BY sk;` } }
    ],
    deepDive: `<p><b>Capacity arithmetic.</b> A strongly consistent read of an item up to 4 KB costs 1 RCU; eventually consistent costs 0.5; transactional reads cost 2. Writes cost 1 WCU per 1 KB (rounded up), transactional writes 2. A Query is charged on the total size of items read (summed, then rounded up to 4 KB), so fetching 50 small items from one collection is far cheaper than 50 GetItems. Every GSI write is an extra write on the index, so each GSI multiplies write cost for the items it contains.</p>
<p><b>GSI semantics.</b> GSIs are updated asynchronously (usually within a second): reading an index right after a write can miss it. GSI keys need not be unique. If a GSI is under-provisioned, writes to the base table get throttled (back-pressure), a classic production surprise. Projection choices (<code>KEYS_ONLY</code>, <code>INCLUDE</code>, <code>ALL</code>) trade storage and write cost for avoiding a second fetch.</p>
<p><b>Single-table or not?</b> Single-table design minimises requests when patterns are known and stable, and it was the dominant advice for years. Since GSIs became cheaper to add and tools like AppSync/GraphQL resolve per type, many teams now use one table per entity unless patterns truly need items fetched together. Either way, the key design is driven by access patterns, and changes later require backfills (write a script that scans and rewrites items, or use DynamoDB Streams + Lambda).</p>
<p><b>Other building blocks.</b> <b>Streams</b> (24-hour change log) feed Lambda for CDC, aggregates and search sync; <b>TTL</b> deletes expired items for free, typically within a few days of expiry (filter expired items in queries); <b>PartiQL</b> gives SQL-like syntax but not joins or cheap ad-hoc queries; <b>global tables</b> replicate multi-region with last-writer-wins (and since 2024 an option for multi-region strong consistency).</p>`,
    aiEra: `<p><b>What AI changes:</b> single-table design is notoriously hard to get right by hand, and assistants are now good at drafting the key schema from a list of access patterns, including GSI overloading. AWS's own tooling (NoSQL Workbench, Amazon Q) can generate and visualise these models.</p>
<p><b>Use AI as a partner:</b> give it the access-pattern table and ask for PK/SK/GSI values per entity, the exact <code>KeyConditionExpression</code> for each pattern, and the RCU cost per request. Ask it to flag any pattern that needs a Scan or a FilterExpression.</p>
<p><b>Where AI goes wrong:</b> low-cardinality partition keys (<code>PK = STATUS#paid</code> on the base table for millions of orders), FilterExpressions presented as if they reduced cost, strongly consistent reads on GSIs (not supported), and forgetting the 400 KB item limit or the 1 MB page. <b>What you must own:</b> hot-key analysis, cost per pattern, and the migration plan when a new pattern arrives.</p>`,
    problems: [{
      title: 'Query an Item Collection: Newest Orders First',
      level: 'Easy', tags: ['dynamodb', 'begins_with', 'sort key'], companies: ['Amazon', 'Zomato', 'Capital One'],
      statement: `<p>Emulate this DynamoDB Query on <code>app_table</code> (db <code>dynamo</code>):</p>
<pre>KeyConditionExpression: PK = "CUST#1" AND begins_with(SK, "ORDER#")
ScanIndexForward: false, Limit: 2</pre>
<p>Return <code>sk, total</code> (total from <code>attrs</code>). <code>begins_with</code> is <b>case-sensitive</b> and matches the literal prefix, including the <code>#</code>.</p>`,
      constraints: `Do not use LIKE: in SQLite it is case-insensitive. Compare a substring or use a range on sk.`,
      example: `<p>CUST#1 holds ADDR#home, two ORDER# items and PROFILE. Descending SK → ${H.c('g', 'ORDER#2026-09-05#o3 (599)')}, then ${H.c('g', 'ORDER#2026-09-01#o1 (570)')}.</p>`,
      brute: { why: `<p>A Scan with a FilterExpression reads <b>every item in the table</b> and pays for all of them, then drops most. In SQL terms: filter the whole table on a pattern that cannot use the key.</p>`, code: { lang: 'sql', db: 'dynamo', code: `SELECT sk, json_extract(attrs, '$.total') AS total
FROM app_table
WHERE pk LIKE 'CUST#1%' AND sk LIKE 'order#%'   -- wrong: matches CUST#10, ignores case
ORDER BY sk DESC LIMIT 2;` } },
      mcq: { q: 'Why is a key condition cheaper than a FilterExpression for the same result?', options: ['The key condition seeks into the sorted collection; a filter is applied after items are read and paid for', 'Filters are not supported on Query', 'Key conditions use strong consistency', 'They cost the same'], answer: 0, explain: 'Capacity is charged on items read. Filters reduce the payload returned, not the items read.' },
      hints: [
        `<p>Hint 1: Equality on pk first: <code>WHERE pk = 'CUST#1'</code>.</p>`,
        `<p>Hint 2: begins_with: <code>substr(sk, 1, 6) = 'ORDER#'</code> (case-sensitive, exact prefix).</p>`,
        `<p>Hint 3: <code>ORDER BY sk DESC LIMIT 2</code> and extract <code>$.total</code> from attrs.</p>`
      ],
      tests: { engine: 'sqlite', cmp: 'exact', cases: [
        { rows: [['ORDER#2026-09-05#o3', 599], ['ORDER#2026-09-01#o1', 570]] },
        { setup: `INSERT INTO app_table VALUES ('CUST#1', 'ORDER#2026-09-10#o9', 'STATUS#paid', '2026-09-10#o9', 'order', '{"total":10}')`, rows: [['ORDER#2026-09-10#o9', 10], ['ORDER#2026-09-05#o3', 599]] },
        { setup: "DELETE FROM app_table WHERE pk = 'CUST#1' AND type = 'order'", rows: [] },
        { setup: `INSERT INTO app_table VALUES ('CUST#1', 'ORDERS_SUMMARY', NULL, NULL, 'summary', '{"total":1169}')`, rows: [['ORDER#2026-09-05#o3', 599], ['ORDER#2026-09-01#o1', 570]] },
        { setup: `INSERT INTO app_table VALUES ('CUST#10', 'ORDER#2026-12-01#o99', NULL, NULL, 'order', '{"total":5}')`, rows: [['ORDER#2026-09-05#o3', 599], ['ORDER#2026-09-01#o1', 570]] },
        { setup: "DELETE FROM app_table WHERE sk = 'ORDER#2026-09-05#o3'", rows: [['ORDER#2026-09-01#o1', 570]] },
        { setup: `INSERT INTO app_table VALUES ('CUST#1', 'order#2026-12-01#x', NULL, NULL, 'order', '{"total":1}')`, rows: [['ORDER#2026-09-05#o3', 599], ['ORDER#2026-09-01#o1', 570]] }
      ] },
      solution: {
        approach: `<p>Equality on the partition key, an exact-prefix test on the sort key, descending sort-key order, limit 2: the four parts of the Query request map one-to-one.</p>`,
        code: { lang: 'sql', db: 'dynamo', code: `SELECT sk,
       json_extract(attrs, '$.total') AS total
FROM app_table
WHERE pk = 'CUST#1'                    -- PK = :pk
  AND substr(sk, 1, 6) = 'ORDER#'      -- begins_with(SK, 'ORDER#'), case-sensitive
ORDER BY sk DESC                       -- ScanIndexForward = false
LIMIT 2;                               -- Limit` },
        alt: [{ lang: 'sql', db: 'dynamo', title: 'Range form (what DynamoDB does internally)', code: `SELECT sk, json_extract(attrs, '$.total') AS total
FROM app_table
WHERE pk = 'CUST#1' AND sk >= 'ORDER#' AND sk < 'ORDER$'   -- '$' is the byte after '#'
ORDER BY sk DESC
LIMIT 2;` }],
        complexity: `<p>DynamoDB: O(log n) seek plus the items returned, about 0.5 RCU for two small items with eventual consistency. Scan: every item in the table.</p>`,
        followUps: ['How would you paginate to the next 2 orders? (ExclusiveStartKey = LastEvaluatedKey)', 'How would you fetch the profile and the newest orders in one request?']
      }
    }]
  });

  /* =====================================================================
     TOPIC 8 — Hot partitions and access-pattern-driven fixes
     ===================================================================== */
  topics.push({
    title: 'Hot Partitions, Hot Keys and Access-Pattern-Driven Fixes',
    analogy: `<p>A supermarket with 20 checkout lanes where every customer queues at <b>lane 7</b> because it is closest to the door. The store's total capacity is huge, yet everyone waits. Fixes: open a sign that sends customers to lanes 7a, 7b, 7c (<b>write sharding</b>), hand out pre-packed baskets for the most popular item (<b>caching</b>), or move the door (<b>a better key</b>).</p>`,
    explain: `<p>Every store in this module spreads data by hashing a key. Throughput limits apply <b>per partition / node / shard</b>, so a skewed key distribution caps the whole system at the speed of one machine:</p>
${H.table(['Store', 'Unit that gets hot', 'Symptom'], [
  ['DynamoDB', 'a physical partition: up to <b>3 000 RCU</b> and <b>1 000 WCU</b> per second (and ~10 GB)', '<code>ProvisionedThroughputExceededException</code> / throttling while table-level capacity looks idle'],
  ['Cassandra', 'the RF replicas of one partition token', 'high latency on a few nodes, large partition warnings, GC pauses'],
  ['MongoDB', 'one chunk / shard (monotonic shard key)', 'all inserts land on the last chunk; the balancer cannot keep up'],
  ['Redis Cluster', 'the one shard holding a hot key (single-threaded commands)', 'one shard at 100% CPU, others idle']
])}
<p><b>Fixes, from cheapest to most invasive:</b></p>
<ol>
<li><b>Cache hot reads</b> (DAX for DynamoDB, Redis in front, or a local in-process cache for a few seconds). Read-heavy hot keys are usually solved here.</li>
<li><b>Write sharding</b>: spread one logical key over N physical keys (<code>VOTE#final~0</code> … <code>~7</code>, chosen randomly or by hash of the writer). Reads gather all N and combine: the cost moves from writes to reads.</li>
<li><b>Better keys</b>: high-cardinality partition keys (user id, not country), random or hashed prefixes instead of timestamps, time buckets for append-only data.</li>
<li><b>Aggregate before writing</b>: buffer increments in memory or a stream and write totals once per second.</li>
<li><b>Rely on the platform</b>, carefully: DynamoDB adaptive capacity instantly lends unused table capacity to busy partitions and can split a partition for heat, but it cannot exceed per-item limits: a <b>single item</b> still tops out at 1 000 WCU per second.</li>
</ol>
<p>Hot spots are an <b>access-pattern</b> problem: they come from the real distribution of requests (celebrities, flash sales, today's date), so model with skew in mind: "what is the hottest key's share of traffic?" is a standard interview follow-up.</p>`,
    clues: [
      '"throttled even though we provisioned plenty of capacity" → hot partition / hot key',
      '"live vote counts", "likes on a viral post" → write sharding of the counter + periodic aggregation',
      '"partition key is the date / status / country" → low cardinality, everything lands on few partitions',
      '"celebrity user", "flash sale product" → skew: cache reads, shard writes, special-case outliers',
      '"monotonically increasing shard key" → hashed shard key or random prefix',
      '"one Redis shard pegged at 100% CPU" → hot key: client-side caching, replicas for reads, split the key'
    ],
    code: [
      { lang: 'python', run: true, title: 'Write sharding a hot counter (runnable sketch)', code: `# Spread writes for one logical key over N shard keys, then gather on read.
import random
from collections import Counter

random.seed(7)
N_SHARDS = 4
store = Counter()          # stands in for DynamoDB items: key -> votes


def vote(logical_key):
    shard = random.randrange(N_SHARDS)               # random suffix spreads writes
    store[f"{logical_key}~{shard}"] += 1             # UpdateItem ADD votes :one


def total(logical_key):
    # one GetItem per shard (BatchGetItem in real life): reads cost N, writes are spread
    return sum(store[f"{logical_key}~{s}"] for s in range(N_SHARDS))


for _ in range(10000):
    vote("VOTE#final")

per_shard = [store[f"VOTE#final~{s}"] for s in range(N_SHARDS)]
print("writes per shard:", per_shard)
print("max shard share: {:.1%}".format(max(per_shard) / sum(per_shard)))
print("total votes:", total("VOTE#final"))
` },
      { lang: 'sql', db: 'dynamo', title: 'Find the hottest keys (runnable)', code: `-- Share of all write capacity consumed by each partition key.
SELECT pk,
       SUM(wcu)                                                  AS wcu_total,
       MAX(wcu)                                                  AS peak_wcu_per_s,
       ROUND(100.0 * SUM(wcu) / (SELECT SUM(wcu) FROM traffic), 1) AS pct_of_writes
FROM traffic
GROUP BY pk
ORDER BY wcu_total DESC;` }
    ],
    codeTitle: ['Write sharding', 'Hot-key report'],
    viz: {
      title: 'One hot key vs the per-partition limit',
      input: '4000 | 70 | 4',
      inputLabel: 'total WCU per second | % of writes on the hot key (0-100) | max write shards to try (1-8)',
      gen: function (input) {
        var p = String(input || '').split('|').map(function (s) { return Number(s.trim()); });
        if (p.length !== 3 || p.some(function (x) { return !isFinite(x); })) throw new Error('Format: total | hotPercent | shards   e.g.  4000 | 70 | 4');
        var total = p[0], hot = p[1], maxS = p[2];
        if (!(total > 0 && total <= 100000)) throw new Error('Total WCU must be 1..100000');
        if (!(hot >= 0 && hot <= 100)) throw new Error('Hot percent must be 0..100');
        if (!(maxS >= 1 && maxS <= 8) || Math.floor(maxS) !== maxS) throw new Error('Shards must be 1..8');
        var P = 8, LIMIT = 1000, frames = [];
        function load(shards) {
          var arr = []; for (var i = 0; i < P; i++) arr.push((total * (100 - hot) / 100) / P);
          for (var s = 0; s < shards; s++) arr[(3 + s * 3) % P] += (total * hot / 100) / shards;
          return arr.map(function (v) { return Math.round(v); });
        }
        function hl(arr) { var h = {}; arr.forEach(function (v, i) { if (v > LIMIT) h[i] = 'bad'; }); return h; }
        frames.push({ narr: 'A table spread over <b>' + P + '</b> physical partitions, each limited to <b>1 000 WCU/s</b>, so the table can absorb ' + (P * LIMIT) + ' WCU/s in total. Traffic: ' + total + ' WCU/s, of which <b>' + hot + '%</b> hits one key.', parts: [
          { type: 'vars', label: 'setup', vals: { partitions: P, limit_per_partition: LIMIT, table_capacity: P * LIMIT, demand: total, hot_key_share: hot + '%' } }
        ] });
        var even = []; for (var i = 0; i < P; i++) even.push(Math.round(total / P));
        frames.push({ narr: 'If keys were perfectly uniform each partition would take ' + Math.round(total / P) + ' WCU/s. ' + (total / P > LIMIT ? '<span class="c-r">Even that is over the limit: the table itself needs more capacity.</span>' : '<span class="c-g">Comfortably under the limit.</span>'), parts: [{ type: 'bars', label: 'WCU/s per partition (uniform)', values: even, hl: hl(even), idxLabels: even.map(function (v, i) { return 'P' + i; }) }] });
        for (var s = 1; s <= maxS; s++) {
          var arr = load(s), over = arr.filter(function (v) { return v > LIMIT; }).length, peak = Math.max.apply(null, arr);
          frames.push({ narr: (s === 1 ? 'Reality: the hot key lives on <b>one</b> partition. ' : 'Write sharding with <b>' + s + '</b> suffixes: the hot key\'s writes are split ' + s + ' ways. ') + 'Peak partition: <b>' + peak + '</b> WCU/s. ' + (over ? '<span class="c-r">' + over + ' partition(s) throttled</span> even though the table as a whole has ' + (P * LIMIT - total) + ' WCU/s spare.' : '<span class="c-g">No partition exceeds 1 000 WCU/s.</span>') + (s > 1 ? ' Cost: reading the total now needs ' + s + ' reads.' : ''), parts: [
            { type: 'bars', label: 'WCU/s per partition, ' + s + ' shard(s)', values: arr, hl: hl(arr), idxLabels: arr.map(function (v, i) { return 'P' + i; }) },
            { type: 'vars', label: 'result', vals: { shards: s, peak_partition: peak, throttled_partitions: over, reads_per_total: s }, hl: over ? { throttled_partitions: 'bad' } : { throttled_partitions: 'ok' } }
          ] });
        }
        var needed = Math.ceil((total * hot / 100) / Math.max(1, LIMIT - (total * (100 - hot) / 100) / P));
        frames.push({ narr: 'Rule of thumb: shards ≥ hot_writes ÷ headroom per partition ≈ <b>' + (isFinite(needed) && needed > 0 ? needed : 'n/a') + '</b> here. Add a margin (2×) for bursts, and remember a <b>single item</b> can never exceed 1 000 WCU/s whatever adaptive capacity does.', parts: [
          { type: 'text', html: '<b>Read side:</b> gather all N shards (BatchGetItem) and sum, or keep a periodically aggregated total item that readers use.' }
        ] });
        return frames;
      }
    },
    examples: [
      { title: 'Per-second throttling check', html: `<p>Throttling is per second, per partition. Averages hide it: VOTE#final averages 1 300 WCU/s over three seconds but peaks at 1 600, and VOTE#semi has a read burst of 3 500 RCU in one second. Monitor CloudWatch <code>ThrottledRequests</code> and enable CloudWatch Contributor Insights to see the most-accessed keys.</p>`, code: { lang: 'sql', db: 'dynamo', code: `SELECT pk, second, rcu, wcu
FROM traffic
WHERE wcu > 1000 OR rcu > 3000
ORDER BY pk, second;` } },
      { title: 'Low-cardinality key = guaranteed hot spot', html: `<p>Keying orders by status puts every new paid order into <code>STATUS#paid</code>. That is acceptable on a sparse GSI for a small, rarely-written state (cancelled), but for millions of writes per day it would be one hot partition. Count the distinct values of a candidate key before choosing it.</p>`, code: { lang: 'sql', db: 'dynamo', code: `SELECT gsi1pk, COUNT(*) AS items
FROM app_table
WHERE gsi1pk IS NOT NULL
GROUP BY gsi1pk
ORDER BY items DESC;` } },
      { title: 'Reading a sharded counter', html: `<p>The live vote total is the sum over all suffixes. Readers either gather the shards on every request (N reads) or read an aggregate item that a background job refreshes every second, which is how most "live count" features work.</p>`, code: { lang: 'sql', db: 'dynamo', code: `SELECT SUM(votes) AS final_votes, COUNT(*) AS shards_read
FROM vote_shards
WHERE pk >= 'VOTE#final~' AND pk < 'VOTE#final~~';` } }
    ],
    deepDive: `<p><b>DynamoDB adaptive capacity.</b> Since 2019 it is always on: a busy partition can borrow unused throughput from the table instantly, and DynamoDB isolates frequently accessed items and splits partitions for heat. This handles moderate skew, but the hard per-partition ceilings (3 000 RCU / 1 000 WCU) and the single-item ceiling remain. On-demand mode removes capacity planning but not partition limits; new on-demand tables start with capacity for about 4 000 writes/s and 12 000 reads/s and grow with traffic (doubling the previous peak instantly), so a launch-day spike can still throttle unless the table is pre-warmed (warm throughput settings, 2024).</p>
<p><b>Cassandra and MongoDB.</b> In Cassandra a hot partition hits the same RF replicas whatever you do with consistency levels; fixes are bucketing (add a hash bucket to the partition key: <code>((sensor_id, day, bucket), ts)</code>) and reading the buckets in parallel. MongoDB hot shards usually come from a monotonically increasing shard key; use a hashed shard key or a compound key that starts with a high-cardinality field, and pre-split chunks before bulk loads.</p>
<p><b>Redis hot keys.</b> Detect with <code>redis-cli --hotkeys</code> (needs an LFU policy) or <code>MONITOR</code> sampling. Fixes: Redis 6+ client-side caching (<code>CLIENT TRACKING</code>, the server invalidates local copies), read replicas for hot reads, or splitting one big key into N keys by hash of a sub-field.</p>
<p><b>Thinking in skew.</b> Real traffic follows power laws (Zipf): the top 1% of keys may take 50% of requests. When estimating, compute the hottest key's rate, not the average: "100 M users, 1 M writes/s" says nothing until you know a celebrity post can get 200 000 likes per second.</p>`,
    aiEra: `<p><b>What AI changes:</b> AIOps tools now read CloudWatch Contributor Insights, Cassandra <code>nodetool tablestats</code> or Redis hotkey output and point at the guilty key automatically; some suggest the shard count. LLM products also create new hot keys: one viral shared chat or one popular prompt template can dominate traffic.</p>
<p><b>Use AI as a partner:</b> paste per-key traffic and ask for the hottest key's share, the throttling seconds, the minimum shard count with a safety factor, and the read-cost impact.</p>
<p><b>Where AI goes wrong:</b> it recommends "increase provisioned capacity" (which does not raise per-partition limits), assumes adaptive capacity makes keys irrelevant, or shards a key without explaining how reads recombine. <b>What you must own:</b> the skew model of your workload and the trade-off between write spreading and read fan-in.</p>`,
    problems: [{
      title: 'Throttling Report per Partition Key',
      level: 'Easy', tags: ['dynamodb', 'hot partition', 'capacity'], companies: ['Amazon', 'Hotstar', 'Twitch'],
      statement: `<p><code>traffic(pk, second, rcu, wcu)</code> holds consumed capacity per partition key per second (db <code>dynamo</code>). Assume each key sits alone on a partition limited to <b>3 000 RCU</b> and <b>1 000 WCU</b> per second. Return every <code>(pk, second)</code> that exceeds a limit with a <code>reason</code>: <code>'BOTH'</code>, <code>'WCU'</code> or <code>'RCU'</code>. Order by pk, second.</p>`,
      constraints: `Exactly 1 000 WCU or 3 000 RCU is allowed (limits are inclusive).`,
      example: `<p>VOTE#final second 1: ${H.c('r', '1 400 WCU')} → WCU. VOTE#semi second 1: ${H.c('r', '3 500 RCU')} → RCU. VOTE#final second 2: 900 WCU → ${H.c('g', 'fine')}.</p>`,
      brute: { why: `<p>Averaging per key hides bursts: VOTE#final averages 1 300 WCU/s, but VOTE#semi averages 1 867 RCU/s and would look healthy although it throttled in second 1. Limits are enforced per second.</p>`, code: { lang: 'sql', db: 'dynamo', code: `SELECT pk, AVG(rcu) AS avg_rcu, AVG(wcu) AS avg_wcu
FROM traffic
GROUP BY pk
HAVING AVG(wcu) > 1000 OR AVG(rcu) > 3000;   -- misses one-second bursts` } },
      mcq: { q: 'A table has 40 000 WCU provisioned and one item receives 1 500 writes/s. What happens?', options: ['Writes to that item are throttled: one item cannot exceed 1 000 WCU/s', 'Adaptive capacity absorbs it fully', 'DynamoDB queues the writes', 'Nothing: table capacity is what counts'], answer: 0, explain: 'Adaptive capacity can isolate a hot item on its own partition, but a single partition, and so a single item, is still capped at 1 000 WCU/s.' },
      hints: [
        `<p>Hint 1: Keep rows where <code>wcu &gt; 1000 OR rcu &gt; 3000</code>, one row per second.</p>`,
        `<p>Hint 2: A CASE checks the BOTH condition first, then WCU, then RCU.</p>`,
        `<p>Hint 3: Strict <code>&gt;</code>: the limits themselves are allowed. Order by pk, second.</p>`
      ],
      tests: { engine: 'sqlite', cmp: 'exact', cases: [
        { rows: [['VOTE#final', 1, 'WCU'], ['VOTE#final', 3, 'WCU'], ['VOTE#semi', 1, 'RCU']] },
        { setup: "UPDATE traffic SET rcu = 3001 WHERE pk = 'VOTE#final' AND second = 1", rows: [['VOTE#final', 1, 'BOTH'], ['VOTE#final', 3, 'WCU'], ['VOTE#semi', 1, 'RCU']] },
        { setup: "UPDATE traffic SET wcu = 1000 WHERE pk = 'VOTE#final'", rows: [['VOTE#semi', 1, 'RCU']] },
        { setup: 'DELETE FROM traffic', rows: [] },
        { setup: "INSERT INTO traffic VALUES ('USER#1', 4, 3000, 1000)", rows: [['VOTE#final', 1, 'WCU'], ['VOTE#final', 3, 'WCU'], ['VOTE#semi', 1, 'RCU']] },
        { setup: 'UPDATE traffic SET rcu = rcu * 2', rows: [['VOTE#final', 1, 'WCU'], ['VOTE#final', 3, 'WCU'], ['VOTE#semi', 1, 'RCU'], ['VOTE#semi', 2, 'RCU']] }
      ] },
      solution: {
        approach: `<p>Filter seconds over either limit and label them with a CASE whose first branch is the combined condition. Evaluating per second matches how DynamoDB enforces partition throughput.</p>`,
        code: { lang: 'sql', db: 'dynamo', code: `SELECT pk,
       second,
       CASE
         WHEN wcu > 1000 AND rcu > 3000 THEN 'BOTH'
         WHEN wcu > 1000                THEN 'WCU'
         ELSE                                'RCU'
       END AS reason
FROM traffic
WHERE wcu > 1000 OR rcu > 3000
ORDER BY pk, second;` },
        complexity: `<p>O(n) over the per-second samples. In AWS the equivalent is CloudWatch <code>ThrottledRequests</code> + Contributor Insights for the top keys.</p>`,
        followUps: ['How many write shards would VOTE#final need with a 2× safety margin?', 'Would DAX help VOTE#semi? Why does it not help VOTE#final?']
      }
    }]
  });

  /* =====================================================================
     PRACTICE ARENA — Easy → Medium → Hard
     ===================================================================== */
  practice.push({
    title: 'Implement Redis TTL Semantics', level: 'Easy', tags: ['redis', 'ttl', 'CASE'], companies: ['Redis', 'Paytm', 'Stripe'],
    statement: `<p>For every key in <code>keyspace</code> (db <code>redis</code>) return <code>k, ttl</code> exactly as <code>TTL k</code> would at <code>now = 1000</code>: <b>-1</b> if the key has no expiry, <b>-2</b> if it has expired (<code>expire_at ≤ 1000</code>, so it no longer exists), otherwise the seconds left. Order by k.</p>`,
    constraints: `Up to 10<sup>6</sup> keys; expire_at is NULL or an integer.`,
    example: `<p>cache:user:1 expires at 1500 → ${H.c('g', '500')}. config:flags has no TTL → ${H.c('b', '-1')}. session:b2 expired at 950 → ${H.c('r', '-2')}.</p>`,
    brute: { why: `<p>Returning <code>expire_at - 1000</code> for everything gives NULL for persistent keys and negative garbage for expired ones. Clients rely on the special values -1 and -2.</p>`, code: { lang: 'sql', db: 'redis', code: `SELECT k, expire_at - 1000 AS ttl FROM keyspace ORDER BY k;` } },
    mcq: { q: 'TTL returns -2. What does that mean?', options: ['The key does not exist (never set, deleted or expired)', 'The key has no expiry', 'The key expires in 2 seconds', 'The TTL is being recalculated'], answer: 0, explain: 'Since Redis 2.8, -2 means the key does not exist and -1 means it exists without an expiry.' },
    hints: [`<p>Hint 1: Three cases → one CASE expression.</p>`, `<p>Hint 2: Check <code>expire_at IS NULL</code> first, then <code>expire_at &lt;= 1000</code>.</p>`, `<p>Hint 3: Otherwise <code>expire_at - 1000</code>; order by k.</p>`],
    tests: { engine: 'sqlite', cmp: 'exact', cases: [
      { rows: [['cache:feed:1', -1], ['cache:user:1', 500], ['cache:user:2', 100], ['config:flags', -1], ['lb:weekly', -1], ['queue:emails', -1], ['ratelimit:1', 60], ['session:a1', 200], ['session:b2', -2]] },
      { setup: "UPDATE keyspace SET expire_at = 1001 WHERE k = 'session:b2'", rows: [['cache:feed:1', -1], ['cache:user:1', 500], ['cache:user:2', 100], ['config:flags', -1], ['lb:weekly', -1], ['queue:emails', -1], ['ratelimit:1', 60], ['session:a1', 200], ['session:b2', 1]] },
      { setup: 'DELETE FROM keyspace', rows: [] },
      { setup: 'UPDATE keyspace SET expire_at = NULL', rows: [['cache:feed:1', -1], ['cache:user:1', -1], ['cache:user:2', -1], ['config:flags', -1], ['lb:weekly', -1], ['queue:emails', -1], ['ratelimit:1', -1], ['session:a1', -1], ['session:b2', -1]] },
      { setup: "UPDATE keyspace SET expire_at = 999 WHERE k = 'lb:weekly'", rows: [['cache:feed:1', -1], ['cache:user:1', 500], ['cache:user:2', 100], ['config:flags', -1], ['lb:weekly', -2], ['queue:emails', -1], ['ratelimit:1', 60], ['session:a1', 200], ['session:b2', -2]] },
      { setup: "INSERT INTO keyspace VALUES ('new:key', 'string', 10, 1300, 1000, 0)", rows: [['cache:feed:1', -1], ['cache:user:1', 500], ['cache:user:2', 100], ['config:flags', -1], ['lb:weekly', -1], ['new:key', 300], ['queue:emails', -1], ['ratelimit:1', 60], ['session:a1', 200], ['session:b2', -2]] }
    ] },
    solution: {
      approach: `<p>A three-branch CASE mirrors Redis: persistent, missing (expired), or remaining seconds.</p>`,
      code: { lang: 'sql', db: 'redis', code: `SELECT k,
       CASE
         WHEN expire_at IS NULL THEN -1
         WHEN expire_at <= 1000 THEN -2
         ELSE expire_at - 1000
       END AS ttl
FROM keyspace
ORDER BY k;` },
      complexity: `<p>O(n log n) for the ordering. Real <code>TTL</code> is O(1) per key.</p>`
    }
  });

  practice.push({
    title: 'Mongo find(): Paid Orders from Pune', level: 'Easy', tags: ['mongodb', 'find', 'json_extract'], companies: ['MongoDB', 'Meesho'],
    statement: `<p>Translate <code>db.orders.find({ status: "paid", "customer.city": "Pune" }, { "customer.name": 1 }).sort({ _id: 1 })</code> to SQL on db <code>mongo</code>. Return <code>_id, name</code>.</p>`,
    constraints: `Matching is case-sensitive; documents may lack <code>customer.city</code>.`,
    example: `<p>o1 and o3 are paid and from Pune → ${H.c('g', 'Asha, Asha')}. o4 is from Pune but ${H.c('r', 'cancelled')}; o6 is paid but from Mumbai.</p>`,
    brute: { why: `<p>Matching on the raw JSON text with LIKE ('%Pune%') also matches other fields (a product named "Pune Tea") and depends on key order and spacing. Extract the field.</p>`, code: { lang: 'sql', db: 'mongo', code: `SELECT _id, json_extract(body, '$.customer.name') AS name
FROM orders
WHERE body LIKE '%paid%' AND body LIKE '%Pune%'
ORDER BY _id;` } },
    mcq: { q: 'Which index best serves this query in MongoDB?', options: ['{ status: 1, "customer.city": 1 }', '{ _id: 1 }', '{ items: 1 }', 'A text index on body'], answer: 0, explain: 'Both equality fields in a compound index; the sort on _id is small here (or append _id to the index).' },
    hints: [`<p>Hint 1: Dot notation <code>"customer.city"</code> becomes the JSON path <code>'$.customer.city'</code>.</p>`, `<p>Hint 2: Two equality filters joined with AND; both must match exactly (case-sensitive).</p>`, `<p>Hint 3: Projection = the SELECT list; sort by _id.</p>`],
    tests: { engine: 'sqlite', cmp: 'exact', cases: [
      { rows: [['o1', 'Asha'], ['o3', 'Asha']] },
      { setup: "UPDATE orders SET body = json_set(body, '$.status', 'paid') WHERE _id = 'o4'", rows: [['o1', 'Asha'], ['o3', 'Asha'], ['o4', 'Mei']] },
      { setup: "UPDATE orders SET body = json_set(body, '$.customer.city', 'Pune') WHERE _id = 'o6'", rows: [['o1', 'Asha'], ['o3', 'Asha'], ['o6', 'Tom']] },
      { setup: 'DELETE FROM orders', rows: [] },
      { setup: "UPDATE orders SET body = json_set(body, '$.status', 'PAID') WHERE _id = 'o1'", rows: [['o3', 'Asha']] },
      { setup: "UPDATE orders SET body = json_remove(body, '$.customer.city') WHERE _id = 'o3'", rows: [['o1', 'Asha']] }
    ] },
    solution: {
      approach: `<p>Extract both filter fields with JSON paths and compare for equality; project the name.</p>`,
      code: { lang: 'sql', db: 'mongo', code: `SELECT _id,
       json_extract(body, '$.customer.name') AS name
FROM orders
WHERE json_extract(body, '$.status') = 'paid'
  AND json_extract(body, '$.customer.city') = 'Pune'
ORDER BY _id;` },
      complexity: `<p>Full scan here; MongoDB with a compound index on (status, customer.city) reads only matching entries.</p>`
    }
  });

  practice.push({
    title: 'Query a Sparse GSI: Paid Orders Newest First', level: 'Easy', tags: ['dynamodb', 'gsi', 'sparse index'], companies: ['Amazon', 'Nubank'],
    statement: `<p>GSI1 has partition key <code>gsi1pk</code> and sort key <code>gsi1sk</code>. Emulate <code>Query IndexName=GSI1, GSI1PK = "STATUS#paid", ScanIndexForward=false</code> on <code>app_table</code> (db <code>dynamo</code>). Return <code>pk, gsi1sk</code>.</p>`,
    constraints: `Items without gsi1pk are not in the index.`,
    example: `<p>Paid orders: o5 (09-07), o3 (09-05), o1 (09-01) → ${H.c('g', 'CUST#2 2026-09-07#o5')} first.</p>`,
    brute: { why: `<p>Scanning the base table and parsing order status out of attributes reads every item, including profiles and lines that can never match. The sparse GSI contains only orders.</p>`, code: { lang: 'sql', db: 'dynamo', code: `SELECT pk, gsi1sk FROM app_table
WHERE type = 'order' AND gsi1pk LIKE '%paid%'
ORDER BY gsi1sk DESC;` } },
    mcq: { q: 'You remove the GSI1PK attribute from an order item. What happens in GSI1?', options: ['The item disappears from the index', 'The item stays with a NULL key', 'The update is rejected', 'The index is rebuilt'], answer: 0, explain: 'GSIs are sparse: only items that have the index key attributes are projected into the index.' },
    hints: [`<p>Hint 1: Equality on the index partition key.</p>`, `<p>Hint 2: Order by the index sort key descending.</p>`, `<p>Hint 3: Items with NULL gsi1pk never match an equality test.</p>`],
    tests: { engine: 'sqlite', cmp: 'exact', cases: [
      { rows: [['CUST#2', '2026-09-07#o5'], ['CUST#1', '2026-09-05#o3'], ['CUST#1', '2026-09-01#o1']] },
      { setup: "UPDATE app_table SET gsi1pk = 'STATUS#paid' WHERE gsi1sk = '2026-09-06#o4'", rows: [['CUST#2', '2026-09-07#o5'], ['CUST#3', '2026-09-06#o4'], ['CUST#1', '2026-09-05#o3'], ['CUST#1', '2026-09-01#o1']] },
      { setup: 'DELETE FROM app_table', rows: [] },
      { setup: "UPDATE app_table SET gsi1pk = NULL, gsi1sk = NULL WHERE sk = 'ORDER#2026-09-07#o5'", rows: [['CUST#1', '2026-09-05#o3'], ['CUST#1', '2026-09-01#o1']] },
      { setup: `INSERT INTO app_table VALUES ('CUST#4', 'ORDER#2026-08-30#o0', 'STATUS#paid', '2026-08-30#o0', 'order', '{"total":5}')`, rows: [['CUST#2', '2026-09-07#o5'], ['CUST#1', '2026-09-05#o3'], ['CUST#1', '2026-09-01#o1'], ['CUST#4', '2026-08-30#o0']] },
      { setup: "UPDATE app_table SET gsi1pk = 'STATUS#shipped' WHERE gsi1pk = 'STATUS#paid'", rows: [] }
    ] },
    solution: {
      approach: `<p>Equality on the GSI partition key, descending on the GSI sort key. The date-first sort key makes "newest first" a reverse read.</p>`,
      code: { lang: 'sql', db: 'dynamo', code: `SELECT pk, gsi1sk
FROM app_table
WHERE gsi1pk = 'STATUS#paid'
ORDER BY gsi1sk DESC;` },
      complexity: `<p>DynamoDB: O(log n + k) on the index. Note GSI reads are eventually consistent, and a status with millions of writes would make <code>STATUS#paid</code> a hot index partition (shard it as <code>STATUS#paid#0..N</code>).</p>`
    }
  });

  practice.push({
    title: 'Tombstone Danger Report', level: 'Easy', tags: ['cassandra', 'tombstones', 'CASE'], companies: ['Netflix', 'Uber'],
    statement: `<p><code>query_stats(query_id, table_name, live_rows, tombstones)</code> (db <code>cass</code>) records tombstones scanned per query. Cassandra warns when a read scans more than <code>tombstone_warn_threshold = 1000</code> tombstones and aborts above <code>tombstone_failure_threshold = 100000</code>. Return <code>query_id, table_name, tombstones, verdict</code> ('FAIL' or 'WARN') for queries over a threshold, most tombstones first.</p>`,
    constraints: `Use strict "more than" for both thresholds.`,
    example: `<p>q4 scans ${H.c('r', '150 000')} → FAIL; q2 ${H.c('y', '25 000')} → WARN; q5 1 200 → WARN. q1 (40) is fine.</p>`,
    brute: { why: `<p>Sorting all queries by tombstones and eyeballing works for five rows, not for thousands of query fingerprints in a real cluster. Encode the thresholds.</p>`, code: { lang: 'sql', db: 'cass', code: `SELECT * FROM query_stats ORDER BY tombstones DESC;` } },
    mcq: { q: 'Which table design produces the most tombstones?', options: ['A job queue where workers DELETE each row after processing', 'An append-only sensor table with TTL and TWCS', 'A users table updated rarely', 'A counter table'], answer: 0, explain: 'Queue-like delete patterns make readers scan past piles of tombstones at the head of the partition until gc_grace_seconds passes and compaction drops them.' },
    hints: [`<p>Hint 1: Keep only rows over the warning threshold: <code>tombstones &gt; 1000</code>.</p>`, `<p>Hint 2: CASE: above 100 000 → FAIL, else WARN.</p>`, `<p>Hint 3: Sort the worst offenders first with ORDER BY tombstones DESC.</p>`],
    tests: { engine: 'sqlite', cmp: 'exact', cases: [
      { rows: [['q4', 'jobs_queue', 150000, 'FAIL'], ['q2', 'jobs_queue', 25000, 'WARN'], ['q5', 'sessions', 1200, 'WARN']] },
      { setup: "UPDATE query_stats SET tombstones = 100000 WHERE query_id = 'q4'", rows: [['q4', 'jobs_queue', 100000, 'WARN'], ['q2', 'jobs_queue', 25000, 'WARN'], ['q5', 'sessions', 1200, 'WARN']] },
      { setup: "UPDATE query_stats SET tombstones = 1000 WHERE query_id = 'q5'", rows: [['q4', 'jobs_queue', 150000, 'FAIL'], ['q2', 'jobs_queue', 25000, 'WARN']] },
      { setup: 'DELETE FROM query_stats', rows: [] },
      { setup: "INSERT INTO query_stats VALUES ('q6', 'inbox', 1, 200000)", rows: [['q6', 'inbox', 200000, 'FAIL'], ['q4', 'jobs_queue', 150000, 'FAIL'], ['q2', 'jobs_queue', 25000, 'WARN'], ['q5', 'sessions', 1200, 'WARN']] },
      { setup: 'UPDATE query_stats SET tombstones = 0', rows: [] }
    ] },
    solution: {
      approach: `<p>Filter above the warning threshold, label with a CASE, sort by severity.</p>`,
      code: { lang: 'sql', db: 'cass', code: `SELECT query_id, table_name, tombstones,
       CASE WHEN tombstones > 100000 THEN 'FAIL' ELSE 'WARN' END AS verdict
FROM query_stats
WHERE tombstones > 1000
ORDER BY tombstones DESC;` },
      complexity: `<p>O(n log n). Fix the offenders by redesign: time-bucketed partitions so old data is dropped whole, TTL + TWCS instead of deletes, or a real queue (Kafka, SQS, Redis Streams).</p>`
    }
  });

  practice.push({
    title: 'Partition Size Report with a Split Flag', level: 'Easy', tags: ['cassandra', 'partition sizing', 'group by'], companies: ['Discord', 'Apple'],
    statement: `<p>In <code>readings_by_sensor</code> (db <code>cass</code>) the partition key is <code>(sensor_id, day)</code>. For this demo the comfort limit is <b>3 rows per partition</b>. Return <code>sensor_id, day, row_count, verdict</code> ('SPLIT' when row_count &gt; 3, else 'OK') ordered by row_count desc, then sensor_id, day.</p>`,
    constraints: `In production the limit is ~100 MB or ~100 000 rows; the logic is the same.`,
    example: `<p>(s2, 2026-09-02) has ${H.c('r', '4 rows')} → SPLIT: use an hourly bucket for that sensor. (s1, 2026-09-01) has 3 → ${H.c('g', 'OK')}.</p>`,
    brute: { why: `<p>Counting per sensor only (ignoring the day) measures the wrong unit: the day bucket <i>is</i> part of the partition, so a sensor can have many small, healthy partitions.</p>`, code: { lang: 'sql', db: 'cass', code: `SELECT sensor_id, COUNT(*) AS row_count FROM readings_by_sensor GROUP BY sensor_id;` } },
    mcq: { q: 'A sensor writes 10 readings/s of 100 bytes. Which bucket keeps partitions under 100 MB?', options: ['day (≈ 86 MB)', 'month (≈ 2.6 GB)', 'year', 'no bucket'], answer: 0, explain: '10 × 86 400 × 100 B ≈ 86 MB per day. Month buckets are 30× larger.' },
    hints: [`<p>Hint 1: Group by the full partition key: sensor_id and day.</p>`, `<p>Hint 2: <code>CASE WHEN COUNT(*) &gt; 3 THEN 'SPLIT' ELSE 'OK' END</code>.</p>`, `<p>Hint 3: Order by the count descending, then the key columns.</p>`],
    tests: { engine: 'sqlite', cmp: 'exact', cases: [
      { rows: [['s2', '2026-09-02', 4, 'SPLIT'], ['s1', '2026-09-01', 3, 'OK'], ['s1', '2026-09-02', 2, 'OK'], ['s2', '2026-09-01', 1, 'OK'], ['s3', '2026-09-02', 1, 'OK']] },
      { setup: "DELETE FROM readings_by_sensor WHERE sensor_id = 's2' AND ts = '12:00'", rows: [['s1', '2026-09-01', 3, 'OK'], ['s2', '2026-09-02', 3, 'OK'], ['s1', '2026-09-02', 2, 'OK'], ['s2', '2026-09-01', 1, 'OK'], ['s3', '2026-09-02', 1, 'OK']] },
      { setup: 'DELETE FROM readings_by_sensor', rows: [] },
      { setup: "INSERT INTO readings_by_sensor VALUES ('s3', '2026-09-02', '08:00', 1), ('s3', '2026-09-02', '09:00', 1), ('s3', '2026-09-02', '10:00', 1)", rows: [['s2', '2026-09-02', 4, 'SPLIT'], ['s3', '2026-09-02', 4, 'SPLIT'], ['s1', '2026-09-01', 3, 'OK'], ['s1', '2026-09-02', 2, 'OK'], ['s2', '2026-09-01', 1, 'OK']] },
      { setup: "DELETE FROM readings_by_sensor WHERE sensor_id <> 's3'", rows: [['s3', '2026-09-02', 1, 'OK']] },
      { setup: "INSERT INTO readings_by_sensor VALUES ('s1', '2026-09-01', '20:00', 1)", rows: [['s1', '2026-09-01', 4, 'SPLIT'], ['s2', '2026-09-02', 4, 'SPLIT'], ['s1', '2026-09-02', 2, 'OK'], ['s2', '2026-09-01', 1, 'OK'], ['s3', '2026-09-02', 1, 'OK']] }
    ] },
    solution: {
      approach: `<p>Group by the composite partition key and flag the oversized ones. In Cassandra itself, use <code>nodetool tablehistograms</code> / <code>tablestats</code> (partition size percentiles) and the large-partition warnings in the logs.</p>`,
      code: { lang: 'sql', db: 'cass', code: `SELECT sensor_id, day,
       COUNT(*) AS row_count,
       CASE WHEN COUNT(*) > 3 THEN 'SPLIT' ELSE 'OK' END AS verdict
FROM readings_by_sensor
GROUP BY sensor_id, day
ORDER BY row_count DESC, sensor_id, day;` },
      complexity: `<p>O(n) to group, O(p log p) to sort p partitions.</p>`
    }
  });

  practice.push({
    title: 'Read Both Schema Versions', level: 'Medium', tags: ['mongodb', 'schema versioning', 'json'], companies: ['MongoDB', 'Atlassian', 'Postman'],
    statement: `<p>The <code>users</code> collection (db <code>mongo</code>) holds two shapes. Version 1 (no <code>schema_version</code> field) stores <code>name</code> as a string "First Last". Version 2 (<code>schema_version: 2</code>) stores <code>name: {first, last}</code>. Return <code>_id, full_name, email</code> for all users, ordered by _id, so the application can read both shapes during a lazy migration.</p>`,
    constraints: `A missing schema_version means version 1. Do not modify the data.`,
    example: `<p>u1 (v2) → ${H.c('g', 'Asha Rao')} built from first + last. u2 (v1) → ${H.c('g', 'Ravi Kumar')} as stored.</p>`,
    brute: { why: `<p>Reading <code>$.name</code> blindly returns a JSON object string like <code>{"first":"Asha","last":"Rao"}</code> for v2 users. Rewriting every document first (a big-bang migration) means downtime or a long, risky batch.</p>`, code: { lang: 'sql', db: 'mongo', code: `SELECT _id, json_extract(body, '$.name') AS full_name, json_extract(body, '$.email') AS email
FROM users ORDER BY _id;` } },
    mcq: { q: 'What does the schema versioning pattern let you avoid?', options: ['A stop-the-world migration of every document', 'Indexes', 'Schema validation', 'Replication'], answer: 0, explain: 'Code understands both versions; documents are upgraded when next written or by a background job.' },
    hints: [`<p>Hint 1: <code>COALESCE(json_extract(body, '$.schema_version'), 1)</code> gives the version.</p>`, `<p>Hint 2: For v2, concatenate <code>$.name.first || ' ' || $.name.last</code>.</p>`, `<p>Hint 3: For v1, <code>$.name</code> is already the string.</p>`],
    tests: { engine: 'sqlite', cmp: 'exact', cases: [
      { rows: [['u1', 'Asha Rao', 'asha@mail.com'], ['u2', 'Ravi Kumar', 'ravi@mail.com'], ['u3', 'Mei Lin', 'mei@mail.com'], ['u4', 'Tom Hardy', 'tom@mail.com']] },
      { setup: `INSERT INTO users VALUES ('u5', '{"schema_version":2,"name":{"first":"Zara","last":"Ali"},"email":"z@mail.com"}')`, rows: [['u1', 'Asha Rao', 'asha@mail.com'], ['u2', 'Ravi Kumar', 'ravi@mail.com'], ['u3', 'Mei Lin', 'mei@mail.com'], ['u4', 'Tom Hardy', 'tom@mail.com'], ['u5', 'Zara Ali', 'z@mail.com']] },
      { setup: "DELETE FROM users WHERE _id IN ('u1', 'u3')", rows: [['u2', 'Ravi Kumar', 'ravi@mail.com'], ['u4', 'Tom Hardy', 'tom@mail.com']] },
      { setup: 'DELETE FROM users', rows: [] },
      { setup: `INSERT INTO users VALUES ('u0', '{"schema_version":1,"name":"Old Timer","email":"o@mail.com"}')`, rows: [['u0', 'Old Timer', 'o@mail.com'], ['u1', 'Asha Rao', 'asha@mail.com'], ['u2', 'Ravi Kumar', 'ravi@mail.com'], ['u3', 'Mei Lin', 'mei@mail.com'], ['u4', 'Tom Hardy', 'tom@mail.com']] },
      { setup: `UPDATE users SET body = '{"schema_version":2,"name":{"first":"Ravi","last":"K"},"email":"ravi@mail.com"}' WHERE _id = 'u2'`, rows: [['u1', 'Asha Rao', 'asha@mail.com'], ['u2', 'Ravi K', 'ravi@mail.com'], ['u3', 'Mei Lin', 'mei@mail.com'], ['u4', 'Tom Hardy', 'tom@mail.com']] }
    ] },
    solution: {
      approach: `<p>Branch on the version with a default of 1 for documents written before versioning existed. The same logic lives in the application's read path; writes always produce v2, so v1 documents fade out.</p>`,
      code: { lang: 'sql', db: 'mongo', code: `SELECT _id,
       CASE
         WHEN COALESCE(json_extract(body, '$.schema_version'), 1) >= 2
           THEN json_extract(body, '$.name.first') || ' ' || json_extract(body, '$.name.last')
         ELSE json_extract(body, '$.name')
       END AS full_name,
       json_extract(body, '$.email') AS email
FROM users
ORDER BY _id;` },
      alt: [{ lang: 'js', check: false, title: 'Background upgrade in mongosh', code: `db.users.find({ schema_version: { $exists: false } }).forEach(u => {
  const [first, ...rest] = u.name.split(" ");
  db.users.updateOne(
    { _id: u._id, schema_version: { $exists: false } },     // guard against racing writers
    { $set: { name: { first: first, last: rest.join(" ") }, schema_version: 2 } }
  );
});` }],
      complexity: `<p>O(n). The upgrade job is idempotent thanks to the filter on the old version.</p>`
    }
  });

  practice.push({
    title: 'Customer Lifetime Value with $group and $sum', level: 'Medium', tags: ['mongodb', 'aggregation', 'computed pattern'], companies: ['Flipkart', 'Shopify', 'Walmart'],
    statement: `<p>For <b>paid</b> orders in db <code>mongo</code>, return per customer <code>customer_id, name, orders, spent</code> where spent = Σ qty × price over all lines. Paid orders with no lines count as an order with 0 spent. Order by spent desc, then customer_id.</p>`,
    constraints: `Use the embedded customer snapshot (extended reference); there is no customers collection.`,
    example: `<p>Ravi: o5 = 1 299 + 40 → ${H.c('g', '1 339')}. Asha: o1 570 + o3 599 → ${H.c('g', '1 169')} over 2 orders. Tom: o6 has no lines → ${H.c('b', '0')}, still 1 order.</p>`,
    brute: { why: `<p>Unwinding first and then counting rows per customer counts <b>lines</b>, not orders (Asha would show 4), and an inner unwind drops Tom entirely.</p>`, code: { lang: 'sql', db: 'mongo', code: `SELECT json_extract(o.body, '$.customer.id') AS customer_id, COUNT(*) AS orders,
       SUM(json_extract(i.value, '$.qty') * json_extract(i.value, '$.price')) AS spent
FROM orders o, json_each(o.body, '$.items') i
WHERE json_extract(o.body, '$.status') = 'paid'
GROUP BY customer_id;` } },
    mcq: { q: 'In MongoDB, what computes an order total without $unwind?', options: ['$sum over $map of the items array (or $reduce)', '$lookup', '$facet', '$bucket'], answer: 0, explain: '{ $sum: { $map: { input: "$items", in: { $multiply: ["$$this.qty", "$$this.price"] } } } } computes per document; then $group per customer.' },
    hints: [`<p>Hint 1: Compute each order's total first, as a scalar subquery over <code>json_each(body, '$.items')</code> with COALESCE(…, 0).</p>`, `<p>Hint 2: Then group the paid orders by customer id: COUNT(*) and SUM(total).</p>`, `<p>Hint 3: Take the name with MAX() inside the group; order by spent DESC, customer_id.</p>`],
    tests: { engine: 'sqlite', cmp: 'exact', cases: [
      { rows: [[2, 'Ravi', 1, 1339], [1, 'Asha', 2, 1169], [4, 'Tom', 1, 0]] },
      { setup: "UPDATE orders SET body = json_set(body, '$.status', 'paid') WHERE _id = 'o4'", rows: [[2, 'Ravi', 1, 1339], [1, 'Asha', 2, 1169], [3, 'Mei', 1, 900], [4, 'Tom', 1, 0]] },
      { setup: "DELETE FROM orders WHERE _id = 'o6'", rows: [[2, 'Ravi', 1, 1339], [1, 'Asha', 2, 1169]] },
      { setup: 'DELETE FROM orders', rows: [] },
      { setup: "UPDATE orders SET body = json_set(body, '$.status', 'paid') WHERE _id = 'o2'", rows: [[2, 'Ravi', 2, 1737], [1, 'Asha', 2, 1169], [4, 'Tom', 1, 0]] },
      { setup: `INSERT INTO orders VALUES ('o7', '{"customer":{"id":5,"name":"Zed","city":"Goa"},"status":"paid","placed":"2026-09-10","items":[{"sku":"PEN","qty":1,"price":1169}]}')`, rows: [[2, 'Ravi', 1, 1339], [1, 'Asha', 2, 1169], [5, 'Zed', 1, 1169], [4, 'Tom', 1, 0]] }
    ] },
    solution: {
      approach: `<p>Two levels, exactly like the pipeline <code>$match → $set total → $group by customer</code>: compute a per-order total (0 for empty arrays), then aggregate per customer. Storing <code>total</code> in the order at write time (computed pattern) would remove the inner step.</p>`,
      code: { lang: 'sql', db: 'mongo', code: `WITH paid AS (
  SELECT json_extract(body, '$.customer.id')   AS customer_id,
         json_extract(body, '$.customer.name') AS name,
         (SELECT COALESCE(SUM(json_extract(value, '$.qty') * json_extract(value, '$.price')), 0)
          FROM json_each(orders.body, '$.items'))  AS total
  FROM orders
  WHERE json_extract(body, '$.status') = 'paid'
)
SELECT customer_id, MAX(name) AS name, COUNT(*) AS orders, SUM(total) AS spent
FROM paid
GROUP BY customer_id
ORDER BY spent DESC, customer_id;` },
      alt: [{ lang: 'js', check: false, title: 'MongoDB pipeline', code: `db.orders.aggregate([
  { $match: { status: "paid" } },
  { $set: { total: { $sum: { $map: { input: "$items",
                                    in: { $multiply: ["$$this.qty", "$$this.price"] } } } } } },
  { $group: { _id: "$customer.id", name: { $max: "$customer.name" },
              orders: { $sum: 1 }, spent: { $sum: "$total" } } },
  { $sort: { spent: -1, _id: 1 } }
]);` }],
      complexity: `<p>O(orders + lines). In MongoDB, $sum of an empty $map is 0, so empty orders survive without preserveNullAndEmptyArrays.</p>`
    }
  });

  practice.push({
    title: 'Write-Sharded Counter Totals', level: 'Medium', tags: ['dynamodb', 'write sharding', 'string functions'], companies: ['Amazon', 'Hotstar', 'Twitter'],
    statement: `<p><code>vote_shards(pk, votes)</code> (db <code>dynamo</code>) stores counters. A hot logical key is split into shard keys <code>&lt;logical&gt;~&lt;n&gt;</code>; unsharded keys have no <code>~</code>. Return <code>logical_key, shards, total</code> ordered by total desc, then logical_key.</p>`,
    constraints: `<code>~</code> appears only as the shard separator. A logical key may have both an unsharded item and shard items during a migration: count them together.`,
    example: `<p>VOTE#final~0..3 → ${H.c('g', 'VOTE#final, 4 shards, 1 605')}. LIKES#post9 → ${H.c('b', '1 shard, 50')}.</p>`,
    brute: { why: `<p>Summing <code>WHERE pk = 'VOTE#final'</code> finds nothing, because no item has that exact key: the reader must know the sharding scheme and gather every suffix.</p>`, code: { lang: 'sql', db: 'dynamo', code: `SELECT pk AS logical_key, 1 AS shards, votes AS total
FROM vote_shards ORDER BY total DESC;   -- shows shards, not logical counters` } },
    mcq: { q: 'You shard a counter 8 ways. What is the cost?', options: ['Reading the total takes 8 reads (or a background aggregate)', 'Writes become 8× more expensive', 'Strong consistency is lost', 'Nothing'], answer: 0, explain: 'Each write still touches one item; the read side fans in over all shards.' },
    hints: [`<p>Hint 1: <code>instr(pk, '~')</code> finds the separator (0 when absent).</p>`, `<p>Hint 2: logical = <code>substr(pk, 1, instr(pk, '~') - 1)</code> when sharded, else pk.</p>`, `<p>Hint 3: GROUP BY the logical key: COUNT(*) and SUM(votes).</p>`],
    tests: { engine: 'sqlite', cmp: 'exact', cases: [
      { rows: [['VOTE#final', 4, 1605], ['VOTE#semi', 2, 250], ['LIKES#post9', 1, 50]] },
      { setup: "INSERT INTO vote_shards VALUES ('VOTE#semi~2', 500)", rows: [['VOTE#final', 4, 1605], ['VOTE#semi', 3, 750], ['LIKES#post9', 1, 50]] },
      { setup: 'DELETE FROM vote_shards', rows: [] },
      { setup: "INSERT INTO vote_shards VALUES ('LIKES#post9~0', 25)", rows: [['VOTE#final', 4, 1605], ['VOTE#semi', 2, 250], ['LIKES#post9', 2, 75]] },
      { setup: "INSERT INTO vote_shards VALUES ('ROOM#12', 10)", rows: [['VOTE#final', 4, 1605], ['VOTE#semi', 2, 250], ['LIKES#post9', 1, 50], ['ROOM#12', 1, 10]] },
      { setup: 'UPDATE vote_shards SET votes = 0', rows: [['LIKES#post9', 1, 0], ['VOTE#final', 4, 0], ['VOTE#semi', 2, 0]] }
    ] },
    solution: {
      approach: `<p>Strip the shard suffix to get the logical key, then aggregate. A delimiter that never appears in natural ids (<code>~</code>) makes the parsing unambiguous; a numeric suffix after <code>#</code> would clash with ids like ROOM#12.</p>`,
      code: { lang: 'sql', db: 'dynamo', code: `SELECT CASE WHEN instr(pk, '~') > 0
            THEN substr(pk, 1, instr(pk, '~') - 1)
            ELSE pk END        AS logical_key,
       COUNT(*)                AS shards,
       SUM(votes)              AS total
FROM vote_shards
GROUP BY logical_key
ORDER BY total DESC, logical_key;` },
      complexity: `<p>O(n). In DynamoDB the read is BatchGetItem over the N known shard keys: O(N) small reads.</p>`
    }
  });

  practice.push({
    title: 'Sliding-Window Rate Limiter on a Sorted Set', level: 'Medium', tags: ['redis', 'rate limiting', 'sorted set'], companies: ['Stripe', 'Cloudflare', 'GitHub'],
    statement: `<p>Each <code>ratelimit:*</code> key in <code>zsets</code> (db <code>redis</code>) stores one member per request with the request time as score. At <code>now = 1000</code> with a <b>60-second window</b> (scores &gt; 940 count) and a limit of <b>5</b> requests, return <code>k, in_window, allowed</code> where allowed = 1 if one more request fits. Order by k.</p>`,
    constraints: `Keys that only have old requests still appear with in_window = 0. Ignore keys not starting with <code>ratelimit:</code>.`,
    example: `<p>ratelimit:1 has requests at 945, 955, 962, 990, 995, 998 → ${H.c('r', '6 in window → allowed 0')}.</p>`,
    brute: { why: `<p>A fixed window (<code>INCR ratelimit:1:minute</code>) lets a client send 5 requests at 0:59 and 5 more at 1:00: 10 in two seconds. The sorted set counts the true last 60 seconds.</p>`, code: { lang: 'sql', db: 'redis', code: `-- fixed window by minute: (score / 60) buckets
SELECT k, CAST(score / 60 AS INTEGER) AS minute, COUNT(*) AS hits
FROM zsets WHERE k LIKE 'ratelimit:%' GROUP BY k, minute;` } },
    mcq: { q: 'Which Redis commands implement this check atomically?', options: ['ZREMRANGEBYSCORE + ZCARD + ZADD + EXPIRE inside MULTI/EXEC or a Lua script', 'GET + SET', 'LPUSH + LTRIM', 'PFADD + PFCOUNT'], answer: 0, explain: 'Trim old members, count, add the new one and refresh the TTL as one atomic unit, so concurrent requests cannot both see "4".' },
    hints: [`<p>Hint 1: Filter keys with <code>k LIKE 'ratelimit:%'</code> and group by k.</p>`, `<p>Hint 2: Count in-window members with <code>SUM(CASE WHEN score &gt; 940 THEN 1 ELSE 0 END)</code>, so old-only keys show 0.</p>`, `<p>Hint 3: allowed is 1 when <code>in_window &lt; 5</code> (one more request still fits), else 0.</p>`],
    tests: { engine: 'sqlite', cmp: 'exact', cases: [
      { rows: [['ratelimit:1', 6, 0]] },
      { setup: "DELETE FROM zsets WHERE k = 'ratelimit:1' AND score < 960", rows: [['ratelimit:1', 4, 1]] },
      { setup: "INSERT INTO zsets VALUES ('ratelimit:2', 'a', 100), ('ratelimit:2', 'b', 200)", rows: [['ratelimit:1', 6, 0], ['ratelimit:2', 0, 1]] },
      { setup: "DELETE FROM zsets WHERE k LIKE 'ratelimit:%'", rows: [] },
      { setup: "UPDATE zsets SET score = 940 WHERE k = 'ratelimit:1' AND member = 'r1'", rows: [['ratelimit:1', 5, 0]] },
      { setup: "INSERT INTO zsets VALUES ('lb:x', 'ratelimit', 999)", rows: [['ratelimit:1', 6, 0]] }
    ] },
    solution: {
      approach: `<p>Group the limiter keys, count members inside the window with conditional aggregation, compare to the limit. In Redis the same steps run per request inside a Lua script or function.</p>`,
      code: { lang: 'sql', db: 'redis', code: `SELECT k,
       SUM(CASE WHEN score > 1000 - 60 THEN 1 ELSE 0 END)           AS in_window,
       CASE WHEN SUM(CASE WHEN score > 1000 - 60 THEN 1 ELSE 0 END) < 5
            THEN 1 ELSE 0 END                                       AS allowed
FROM zsets
WHERE k LIKE 'ratelimit:%'
GROUP BY k
ORDER BY k;` },
      alt: [{ lang: 'text', check: false, title: 'Redis Lua script', code: `-- KEYS[1] = ratelimit:{user}   ARGV = now, window, limit, request_id
local now, window, limit = tonumber(ARGV[1]), tonumber(ARGV[2]), tonumber(ARGV[3])
redis.call('ZREMRANGEBYSCORE', KEYS[1], '-inf', now - window)
if redis.call('ZCARD', KEYS[1]) < limit then
  redis.call('ZADD', KEYS[1], now, ARGV[4])
  redis.call('EXPIRE', KEYS[1], window)
  return 1
end
return 0` }],
      complexity: `<p>Redis: O(log n + removed) per request, memory O(limit) per user. A sliding-window <i>counter</i> (two fixed buckets weighted) uses O(1) memory if exactness is not needed.</p>`
    }
  });

  practice.push({
    title: 'Latest Reading per Sensor', level: 'Medium', tags: ['cassandra', 'clustering order', 'top-1 per group'], companies: ['Tesla', 'Siemens', 'Ather'],
    statement: `<p>For every sensor in <code>readings_by_sensor</code> (db <code>cass</code>) return its most recent reading: <code>sensor_id, day, ts, value</code>, ordered by sensor_id. "Most recent" = greatest (day, ts).</p>`,
    constraints: `Each (sensor_id, day, ts) is unique. In Cassandra you would keep a separate <code>latest_by_sensor</code> table; here compute it.`,
    example: `<p>s2: newest partition is 2026-09-02 and its last clustering row is 12:00 → ${H.c('g', '33.5')}. s3 has only one reading.</p>`,
    brute: { why: `<p>Taking MAX(day) and MAX(ts) separately per sensor can combine a day with a time from another day (s1: 09-02 with 18:00, which does not exist). The pair must be ranked together.</p>`, code: { lang: 'sql', db: 'cass', code: `SELECT sensor_id, MAX(day) AS day, MAX(ts) AS ts
FROM readings_by_sensor GROUP BY sensor_id;   -- mixes rows` } },
    mcq: { q: 'In Cassandra, how do you serve "latest reading per sensor" for a dashboard of 10 000 sensors?', options: ['A latest_by_sensor table upserted on every write, read with one query per sensor or IN', 'SELECT ... GROUP BY sensor_id over the readings table', 'ALLOW FILTERING with ORDER BY', 'A secondary index on ts'], answer: 0, explain: 'Query-first: a tiny table with one row per sensor, overwritten on each reading (writes are upserts).' },
    hints: [`<p>Hint 1: Rank rows per sensor with <code>ROW_NUMBER() OVER (PARTITION BY sensor_id ORDER BY day DESC, ts DESC)</code>.</p>`, `<p>Hint 2: Keep only rank 1 per sensor in an outer query (window results cannot be filtered in WHERE directly).</p>`, `<p>Hint 3: Select the four columns and order the result by sensor_id.</p>`],
    tests: { engine: 'sqlite', cmp: 'exact', cases: [
      { rows: [['s1', '2026-09-02', '12:00', 25.5], ['s2', '2026-09-02', '12:00', 33.5], ['s3', '2026-09-02', '07:00', 18.0]] },
      { setup: "INSERT INTO readings_by_sensor VALUES ('s1', '2026-09-03', '00:30', 19.0)", rows: [['s1', '2026-09-03', '00:30', 19.0], ['s2', '2026-09-02', '12:00', 33.5], ['s3', '2026-09-02', '07:00', 18.0]] },
      { setup: "DELETE FROM readings_by_sensor WHERE day = '2026-09-02'", rows: [['s1', '2026-09-01', '18:00', 22.0], ['s2', '2026-09-01', '09:00', 30.1]] },
      { setup: 'DELETE FROM readings_by_sensor', rows: [] },
      { setup: "INSERT INTO readings_by_sensor VALUES ('s4', '2026-08-31', '23:59', 5.5)", rows: [['s1', '2026-09-02', '12:00', 25.5], ['s2', '2026-09-02', '12:00', 33.5], ['s3', '2026-09-02', '07:00', 18.0], ['s4', '2026-08-31', '23:59', 5.5]] },
      { setup: "DELETE FROM readings_by_sensor WHERE sensor_id = 's2' AND ts = '12:00'", rows: [['s1', '2026-09-02', '12:00', 25.5], ['s2', '2026-09-02', '11:00', 32.0], ['s3', '2026-09-02', '07:00', 18.0]] }
    ] },
    solution: {
      approach: `<p>Top-1 per group over the composite (day, ts) order, which is exactly the clustering order of the newest bucket. In Cassandra, read the current day's partition with <code>LIMIT 1</code> (reverse clustering order), falling back to the previous bucket if empty, or keep a <code>latest_by_sensor</code> table.</p>`,
      code: { lang: 'sql', db: 'cass', code: `WITH ranked AS (
  SELECT sensor_id, day, ts, value,
         ROW_NUMBER() OVER (PARTITION BY sensor_id ORDER BY day DESC, ts DESC) AS rn
  FROM readings_by_sensor
)
SELECT sensor_id, day, ts, value
FROM ranked
WHERE rn = 1
ORDER BY sensor_id;` },
      alt: [{ lang: 'text', check: false, title: 'CQL', code: `-- per sensor, newest bucket first
SELECT ts, value FROM iot.readings_by_sensor_day
 WHERE sensor_id = 's2' AND day = '2026-09-02' LIMIT 1;   -- clustering ORDER BY ts DESC
-- or simply
SELECT sensor_id, ts, value FROM iot.latest_by_sensor WHERE sensor_id IN ('s1', 's2', 's3');` }],
      complexity: `<p>SQL: O(n log n). Cassandra: one single-partition read per sensor, O(1) rows each.</p>`
    }
  });

  practice.push({
    title: 'Detect Drift Between a Stored Total and Its Lines', level: 'Hard', tags: ['dynamodb', 'denormalisation', 'consistency check'], companies: ['Amazon', 'Razorpay', 'Klarna'],
    statement: `<p>In <code>app_table</code> (db <code>dynamo</code>) order items (<code>type = 'order'</code>) live under the customer with SK <code>ORDER#&lt;date&gt;#&lt;order_id&gt;</code> and a denormalised <code>attrs.total</code>. Line items (<code>type = 'line'</code>) live under <code>PK = ORDER#&lt;order_id&gt;</code> with <code>qty</code> and <code>price</code>. For every order that has lines return <code>order_id, stored_total, line_total, status</code> ('OK' or 'DRIFT'), ordered by order_id.</p>`,
    constraints: `Dates are always YYYY-MM-DD, so the order id starts at character 18 of the SK. Orders without lines are skipped.`,
    example: `<p>o1: lines 450 + 3 × 40 = ${H.c('g', '570')} = stored 570 → OK. If someone edits a line without updating the order, the job reports ${H.c('r', 'DRIFT')}.</p>`,
    brute: { why: `<p>Trusting the stored total forever: denormalised copies drift when one write of a multi-item change fails or a bug updates only one side. Without a reconciliation job nobody notices until an invoice is wrong.</p>`, code: { lang: 'sql', db: 'dynamo', code: `SELECT substr(sk, 18) AS order_id, json_extract(attrs, '$.total') AS stored_total
FROM app_table WHERE type = 'order' ORDER BY order_id;   -- never checked` } },
    mcq: { q: 'How should the application prevent drift in DynamoDB in the first place?', options: ['Write the line and the order total in one TransactWriteItems call', 'Use a GSI', 'Use eventually consistent reads', 'Increase WCU'], answer: 0, explain: 'A transaction makes both writes succeed or fail together; the reconciliation job remains a safety net.' },
    hints: [`<p>Hint 1: Order id from the order item: <code>substr(sk, 18)</code>; from a line item: <code>substr(pk, 7)</code>.</p>`, `<p>Hint 2: Aggregate lines per order id with SUM(qty × price), then INNER JOIN to the orders.</p>`, `<p>Hint 3: CASE WHEN stored = line_total THEN 'OK' ELSE 'DRIFT' END; order by order_id.</p>`],
    tests: { engine: 'sqlite', cmp: 'exact', cases: [
      { rows: [['o1', 570, 570, 'OK'], ['o3', 599, 599, 'OK']] },
      { setup: "UPDATE app_table SET attrs = json_set(attrs, '$.qty', 2) WHERE pk = 'ORDER#o3' AND sk = 'ITEM#MUG'", rows: [['o1', 570, 570, 'OK'], ['o3', 599, 798, 'DRIFT']] },
      { setup: "DELETE FROM app_table WHERE type = 'line'", rows: [] },
      { setup: `INSERT INTO app_table VALUES ('ORDER#o5', 'ITEM#LAMP', NULL, NULL, 'line', '{"qty":1,"price":1299}')`, rows: [['o1', 570, 570, 'OK'], ['o3', 599, 599, 'OK'], ['o5', 1339, 1299, 'DRIFT']] },
      { setup: "UPDATE app_table SET attrs = json_set(attrs, '$.total', 0) WHERE type = 'order' AND sk = 'ORDER#2026-09-01#o1'", rows: [['o1', 0, 570, 'DRIFT'], ['o3', 599, 599, 'OK']] },
      { setup: "DELETE FROM app_table WHERE type = 'order'", rows: [] }
    ] },
    solution: {
      approach: `<p>Rebuild the join key from both item types, aggregate lines per order, inner-join, and compare. In production this runs as a Streams-triggered check or a periodic export to S3 + Athena, not a full table scan on the live table.</p>`,
      code: { lang: 'sql', db: 'dynamo', code: `WITH orders AS (
  SELECT substr(sk, 18)                 AS order_id,
         json_extract(attrs, '$.total') AS stored_total
  FROM app_table
  WHERE type = 'order'
), lines AS (
  SELECT substr(pk, 7) AS order_id,
         SUM(json_extract(attrs, '$.qty') * json_extract(attrs, '$.price')) AS line_total
  FROM app_table
  WHERE type = 'line'
  GROUP BY pk
)
SELECT o.order_id, o.stored_total, l.line_total,
       CASE WHEN o.stored_total = l.line_total THEN 'OK' ELSE 'DRIFT' END AS status
FROM orders AS o
JOIN lines  AS l ON l.order_id = o.order_id
ORDER BY o.order_id;` },
      complexity: `<p>O(n) over the items. In DynamoDB, process the export or the stream, not the live table, to avoid consuming production capacity.</p>`
    }
  });

  practice.push({
    title: 'Expire, Then Evict with allkeys-lfu', level: 'Hard', tags: ['redis', 'eviction', 'lfu', 'window functions'], companies: ['Redis', 'Snap', 'Swiggy'],
    statement: `<p>Redis (db <code>redis</code>) has <code>maxmemory = 8000</code> bytes and policy <code>allkeys-lfu</code>. At <code>now = 1000</code>: first, keys with <code>expire_at ≤ 1000</code> are removed (reason <code>'expired'</code>). Then, while the remaining keys' total bytes exceed 8 000, evict the key with the fewest <code>hits</code> (ties by key name), reason <code>'lfu'</code>. Return <code>k, reason</code>: expired keys first (by k), then evictions in eviction order.</p>`,
    constraints: `If memory is already within the limit after expiry, there are no 'lfu' rows. Use exact LFU.`,
    example: `<p>Total 11 450 B. ${H.c('y', 'session:b2')} expired → 11 150 B, need 3 150 more: evict ${H.c('r', 'config:flags')} (1 hit, 150 B), ${H.c('r', 'cache:user:2')} (2 hits, 1 100 B), ${H.c('r', 'cache:feed:1')} (15 hits, 5 000 B) → 4 900 B, done.</p>`,
    brute: { why: `<p>Ignoring expiry evicts live data while dead keys still occupy memory, and evicting a fixed number of keys ignores their sizes: one 5 000-byte key may free more than ten small ones.</p>`, code: { lang: 'sql', db: 'redis', code: `SELECT k, 'lfu' AS reason FROM keyspace ORDER BY hits LIMIT 3;` } },
    mcq: { q: 'Why does LFU suit a cache hit by a nightly full scan better than LRU?', options: ['The scan touches each key once, which barely raises LFU counters but makes every scanned key "recent" under LRU', 'LFU uses less memory', 'LRU cannot evict', 'LFU is exact in Redis'], answer: 0, explain: 'Scan pollution: LRU treats one-off accesses as fresh and evicts genuinely hot keys; LFU needs repeated accesses to rank a key high.' },
    hints: [`<p>Hint 1: Split keys into expired and live with the same predicate; compute need = MAX(0, live bytes − 8000).</p>`, `<p>Hint 2: Running sum of bytes over live keys ordered by (hits, k); keep rows with <code>cum - bytes &lt; need</code>.</p>`, `<p>Hint 3: UNION ALL the two lists with a group number and row number for ordering.</p>`],
    tests: { engine: 'sqlite', cmp: 'exact', cases: [
      { rows: [['session:b2', 'expired'], ['config:flags', 'lfu'], ['cache:user:2', 'lfu'], ['cache:feed:1', 'lfu']] },
      { setup: "UPDATE keyspace SET bytes = 100 WHERE k = 'cache:feed:1'", rows: [['session:b2', 'expired']] },
      { setup: 'DELETE FROM keyspace', rows: [] },
      { setup: "UPDATE keyspace SET expire_at = 2000 WHERE k = 'session:b2'", rows: [['config:flags', 'lfu'], ['cache:user:2', 'lfu'], ['session:b2', 'lfu'], ['cache:feed:1', 'lfu']] },
      { setup: "UPDATE keyspace SET hits = 1000 WHERE k = 'cache:feed:1'", rows: [['session:b2', 'expired'], ['config:flags', 'lfu'], ['cache:user:2', 'lfu'], ['session:a1', 'lfu'], ['ratelimit:1', 'lfu'], ['queue:emails', 'lfu'], ['cache:user:1', 'lfu']] },
      { setup: "UPDATE keyspace SET hits = 1 WHERE k = 'cache:user:2'", rows: [['session:b2', 'expired'], ['cache:user:2', 'lfu'], ['config:flags', 'lfu'], ['cache:feed:1', 'lfu']] }
    ] },
    solution: {
      approach: `<p>Expiry first (free memory, no policy involved), then compute how much must still be freed and take keys in LFU order until the running total covers it: the same "running sum crosses a threshold" trick as volatile-lru, with a different candidate set and order.</p>`,
      code: { lang: 'sql', db: 'redis', code: `WITH expired AS (
  SELECT k FROM keyspace WHERE expire_at IS NOT NULL AND expire_at <= 1000
), live AS (
  SELECT k, bytes, hits FROM keyspace
  WHERE NOT (expire_at IS NOT NULL AND expire_at <= 1000)
), need AS (
  SELECT MAX(0, COALESCE((SELECT SUM(bytes) FROM live), 0) - 8000) AS n
), ranked AS (
  SELECT k, bytes,
         SUM(bytes)   OVER (ORDER BY hits, k ROWS UNBOUNDED PRECEDING) AS cum,
         ROW_NUMBER() OVER (ORDER BY hits, k)                          AS rn
  FROM live
)
SELECT k, reason FROM (
  SELECT k, 'expired' AS reason, 0 AS grp, 0 AS rn FROM expired
  UNION ALL
  SELECT r.k, 'lfu', 1, r.rn FROM ranked AS r, need WHERE r.cum - r.bytes < need.n
)
ORDER BY grp, rn, k;` },
      complexity: `<p>O(n log n). Redis itself never sorts: it samples keys and keeps an eviction pool, making each eviction O(1) amortised.</p>`
    }
  });

  practice.push({
    title: 'Last-Write-Wins Read Resolution and Repair Count', level: 'Hard', tags: ['cassandra', 'last write wins', 'read repair'], companies: ['Apple', 'Instagram', 'Spotify'],
    statement: `<p><code>replica_cells(node, k, v, write_ts)</code> holds each replica's copy of a cell; <code>read_responses(read_id, node, k)</code> lists the replicas that answered each read (db <code>cass</code>). For each read, the coordinator returns the cell with the <b>highest write_ts</b>; on equal timestamps the <b>greater value</b> wins (Cassandra's tie rule). Return <code>read_id, k, winner, stale_replicas</code>, where stale_replicas counts responding replicas whose (v, write_ts) differs from the winner (they would get a read repair). Order by read_id.</p>`,
    constraints: `Each responding (node, k) has exactly one cell.`,
    example: `<p>Read 3: A has 'dark' @500, B has 'light' @500. Equal timestamps → greater value ${H.c('g', "'light'")} wins; A is ${H.c('r', 'stale (1)')}.</p>`,
    brute: { why: `<p>Returning whatever the first replica answered (like CL ONE) gives read 1 the old 'qty=1' when B answers first. Comparing only values (not timestamps) also misses replicas that hold the right value with an older timestamp.</p>`, code: { lang: 'sql', db: 'cass', code: `SELECT r.read_id, r.k, MIN(c.v) AS winner
FROM read_responses r JOIN replica_cells c ON c.node = r.node AND c.k = r.k
GROUP BY r.read_id;` } },
    mcq: { q: 'Two clients write the same cell at the same microsecond timestamp with values "a" and "b". What do all replicas converge to?', options: ['"b": with equal timestamps the greater value wins', 'Whichever arrived first', 'Both values (siblings)', 'The write fails'], answer: 0, explain: 'Cassandra is deterministic: timestamp first, then value comparison. Siblings are a Riak/Dynamo-paper idea, not Cassandra.' },
    hints: [`<p>Hint 1: Join responses to cells to get (read_id, node, v, write_ts).</p>`, `<p>Hint 2: Winner = ROW_NUMBER() per read ordered by write_ts DESC, v DESC, keep 1.</p>`, `<p>Hint 3: Count responses of the same read whose v or write_ts differ from the winner's.</p>`],
    tests: { engine: 'sqlite', cmp: 'exact', cases: [
      { rows: [[1, 'cart:9', 'qty=2', 1], [2, 'theme:7', 'light', 1], [3, 'theme:7', 'light', 1]] },
      { setup: "UPDATE replica_cells SET v = 'qty=2', write_ts = 300 WHERE node = 'B' AND k = 'cart:9'", rows: [[1, 'cart:9', 'qty=2', 0], [2, 'theme:7', 'light', 1], [3, 'theme:7', 'light', 1]] },
      { setup: 'DELETE FROM read_responses', rows: [] },
      { setup: "INSERT INTO read_responses VALUES (4, 'A', 'cart:9'), (4, 'B', 'cart:9'), (4, 'C', 'cart:9')", rows: [[1, 'cart:9', 'qty=2', 1], [2, 'theme:7', 'light', 1], [3, 'theme:7', 'light', 1], [4, 'cart:9', 'qty=2', 1]] },
      { setup: "UPDATE replica_cells SET v = 'blue', write_ts = 600 WHERE node = 'C' AND k = 'theme:7'", rows: [[1, 'cart:9', 'qty=2', 1], [2, 'theme:7', 'blue', 1], [3, 'theme:7', 'light', 1]] },
      { setup: "UPDATE replica_cells SET v = 'zzz' WHERE node = 'A' AND k = 'theme:7'", rows: [[1, 'cart:9', 'qty=2', 1], [2, 'theme:7', 'light', 1], [3, 'theme:7', 'zzz', 1]] }
    ] },
    solution: {
      approach: `<p>Resolve each read like a coordinator: pick the max by (timestamp, value), then compare every response to the winner to count repairs. This is why clock skew matters in Cassandra: a node with a fast clock can make an older logical write "win".</p>`,
      code: { lang: 'sql', db: 'cass', code: `WITH resp AS (
  SELECT r.read_id, r.k, r.node, c.v, c.write_ts
  FROM read_responses AS r
  JOIN replica_cells  AS c ON c.node = r.node AND c.k = r.k
), ranked AS (
  SELECT resp.*, ROW_NUMBER() OVER (PARTITION BY read_id ORDER BY write_ts DESC, v DESC) AS rn
  FROM resp
), win AS (
  SELECT read_id, k, v, write_ts FROM ranked WHERE rn = 1
)
SELECT w.read_id, w.k, w.v AS winner,
       (SELECT COUNT(*) FROM resp AS x
        WHERE x.read_id = w.read_id AND (x.v <> w.v OR x.write_ts <> w.write_ts)) AS stale_replicas
FROM win AS w
ORDER BY w.read_id;` },
      complexity: `<p>O(r log r) for r responses. A real coordinator compares digests first and only fetches full data from mismatching replicas.</p>`
    }
  });

  /* =====================================================================
     QUIZ
     ===================================================================== */
  quiz.push({ q: 'What is the first step of NoSQL data modelling for DynamoDB or Cassandra?', options: ['List the access patterns with their keys, sort orders and rates', 'Normalise the entities to third normal form', 'Choose the number of nodes', 'Create secondary indexes on every column'], answer: 0, explain: 'These stores serve only the queries their keys were designed for, so the query list comes first and the tables follow from it.' });
  quiz.push({ q: 'A blog post can receive an unbounded number of comments. Best MongoDB design?', options: ['Comments in their own collection with post_id (plus an embedded subset of the newest few)', 'Embed every comment in the post', 'One document per post per comment field', 'Store comments as a JSON string in the post'], answer: 0, explain: 'Unbounded arrays grow documents toward the 16 MB limit and make every read and update heavier. Reference from the child; embed a small subset for the first screen.' });
  quiz.push({ q: 'Which MongoDB write is atomic without a multi-document transaction?', options: ['An update that changes several fields and arrays inside one document', 'Inserting an order and decrementing stock in another collection', 'Two updateOne calls in a row', 'An updateMany across 100 documents'], answer: 0, explain: 'Single-document operations are atomic. updateMany is atomic per document, not as a whole.' });
  quiz.push({ q: 'Paid orders: one has items [], others have lines. A pipeline does $unwind: "$items" then counts orders per city. What goes wrong?', options: ['The order with an empty array disappears from the count', 'It double counts every order', 'The pipeline errors', 'Nothing'], answer: 0, explain: '$unwind emits nothing for empty or missing arrays unless preserveNullAndEmptyArrays: true, and it multiplies orders by their line count, so count orders before unwinding.' });
  quiz.push({ q: 'Where should $match go in an aggregation pipeline, when possible?', options: ['First, so it can use an index and reduce documents for later stages', 'Last, after $group', 'Right after $unwind', 'It does not matter'], answer: 0, explain: 'An early $match can be an index scan; later stages then process fewer documents. The optimiser moves some $match stages forward, but not past stages they depend on.' });
  quiz.push({ q: 'Members asha and leo both have score 980 in a sorted set. In which order does ZREVRANGE return them?', options: ['leo, then asha (reverse lexicographic)', 'asha, then leo', 'Insertion order', 'Random'], answer: 0, explain: 'Equal scores are ordered lexicographically by member; the REV variants reverse that, so "leo" comes before "asha".' });
  quiz.push({ q: 'Redis runs maxmemory-policy volatile-lru, but no key has a TTL. Memory is full and a SET arrives. Result?', options: ['The SET fails with an OOM error', 'The least recently used key is evicted', 'A random key is evicted', 'Redis grows past maxmemory'], answer: 0, explain: 'volatile-* policies consider only keys with an expiry. With no candidates Redis behaves like noeviction.' });
  quiz.push({ q: 'Which persistence setting loses at most about one second of writes if the Redis process crashes?', options: ['AOF with appendfsync everysec', 'RDB snapshot every 5 minutes', 'No persistence', 'appendfsync no'], answer: 0, explain: 'everysec fsyncs the AOF once per second (the default). always fsyncs every write at a large throughput cost; RDB loses everything since the last snapshot.' });
  quiz.push({ q: 'A Cassandra table has PRIMARY KEY ((sensor_id, day), ts). Which query is efficient?', options: ["WHERE sensor_id = 's1' AND day = '2026-09-01' AND ts > '10:00'", "WHERE sensor_id = 's1'", "WHERE ts > '10:00'", "WHERE value > 30"], answer: 0, explain: 'The full partition key must be given with equality; then a range on the clustering column is a slice of one sorted partition. The others need ALLOW FILTERING or are rejected.' });
  quiz.push({ q: 'RF = 3. Which write/read consistency pair guarantees reads see the latest acknowledged write?', options: ['QUORUM / QUORUM', 'ONE / ONE', 'ONE / QUORUM', 'TWO / ONE'], answer: 0, explain: 'QUORUM = 2, and 2 + 2 = 4 > 3. ONE/QUORUM and TWO/ONE give exactly 3, which is not > RF.' });
  quiz.push({ q: 'Why do queue-like Cassandra tables (insert, process, delete) get slower over time?', options: ['Deletes write tombstones that reads must scan past until compaction after gc_grace_seconds', 'Cassandra cannot delete rows', 'Inserts lock the partition', 'Compaction is disabled for deleted rows'], answer: 0, explain: 'Deletes are writes of markers. Reading the head of a queue partition scans thousands of tombstones, triggering warnings at 1 000 and failures at 100 000 by default.' });
  quiz.push({ q: 'A DynamoDB Query reads 100 items and a FilterExpression returns 5. What are you charged for?', options: ['All 100 items read', 'Only the 5 returned', 'Nothing for filtered items and half for the rest', 'One RCU flat'], answer: 0, explain: 'Filters run after the read. Use key conditions or a GSI to avoid reading items you do not need.' });
  quiz.push({ q: 'Which statement about DynamoDB GSIs is true?', options: ['GSI reads are eventually consistent only', 'GSIs must be created with the table', 'A GSI must use the same partition key as the table', 'GSIs support strongly consistent reads at double cost'], answer: 0, explain: 'GSIs are updated asynchronously and can be added any time; LSIs share the partition key, must be created with the table and allow strong reads.' });
  quiz.push({ q: 'One DynamoDB item receives 1 500 writes per second. The table has 40 000 WCU. What happens?', options: ['Writes to that item are throttled; one partition caps at 1 000 WCU/s', 'Adaptive capacity serves all of it', 'On-demand mode removes the limit', 'Nothing, table capacity is enough'], answer: 0, explain: 'Partition limits (1 000 WCU, 3 000 RCU per second) bound any single item. Write sharding or aggregation is needed.' });
  quiz.push({ q: 'What is the main cost of write sharding a hot counter into N keys?', options: ['Reads must gather N keys (or read a periodically aggregated item)', 'Each write costs N WCU', 'Writes lose atomicity per item', 'Items exceed 400 KB'], answer: 0, explain: 'Each increment still touches one shard item. The read fan-in grows with N.' });

  /* =====================================================================
     INTERVIEW
     ===================================================================== */
  interview.push({ level: 'I', q: 'How do you decide between MongoDB, Redis, Cassandra, DynamoDB and PostgreSQL for a new feature?',
    a: `<p>I start from the access patterns, not the product: for each, the key the caller has, sort order, peak reads/writes, latency budget, consistency and whether several records must change atomically, plus item sizes and growth. Then: multi-record transactions or ad-hoc reporting → PostgreSQL; sub-millisecond, small, possibly ephemeral data (sessions, rate limits, leaderboards) → Redis; very high write rates, time series or multi-DC active-active with known queries → Cassandra/ScyllaDB; key/range lookups at any scale with no servers to run → DynamoDB; rich aggregates with varied attributes that are read whole, while keeping secondary indexes → MongoDB. I prefer the fewest stores that meet the requirements, because each store adds operations, backups and failure modes, and I say explicitly when the honest answer is "stay relational".</p>`,
    followUps: ['Which hidden requirement most often flips this decision later?', 'How do you keep data consistent across two stores?'] });
  interview.push({ level: 'I', q: 'Explain embedding vs referencing in MongoDB with examples of when each is right.',
    a: `<p>Embed when data is read together, bounded and owned by the parent: an order's lines, a user's few addresses, settings. You get one read and atomic single-document updates. Reference when the child set is unbounded or large (comments on a viral post, log lines), shared by many parents, or updated independently at high rates; the child stores the parent id with an index. Between the two sit the named patterns: <b>subset</b> (embed the newest N comments plus a count), <b>extended reference</b> (copy the customer name into the order to avoid a $lookup, accepting staleness or updating copies), <b>outlier</b> (embed normally, overflow for the rare huge case). I always ask for the maximum size of every array, because the 16 MB limit and working-set cost bite long before production traffic peaks.</p>`,
    followUps: ['How do you update a denormalised customer name across millions of orders?', 'When would you use a multi-document transaction instead?'] });
  interview.push({ level: 'A', q: 'Walk through optimising a slow MongoDB aggregation pipeline.',
    a: `<p>First <code>explain("executionStats")</code>: is the first stage an IXSCAN or a COLLSCAN, how many documents enter each stage, and does a blocking $group or $sort spill to disk? Fixes in order: move <code>$match</code> (and a $sort that an index can provide) to the start, with a compound index following the ESR rule; filter before <code>$unwind</code> because unwinding multiplies documents; <code>$project</code> early to shrink documents; replace per-request <code>$lookup</code> with an extended reference or precomputed field; use $sort + $limit so it becomes a top-k sort; on sharded clusters, include the shard key in the first $match so only relevant shards run. If the report scans most of the collection anyway, precompute it with <code>$merge</code> incrementally or move it to a warehouse fed by change streams.</p>`,
    followUps: ['What is the ESR rule?', 'How does a sharded cluster split a pipeline between shards and mongos?'] });
  interview.push({ level: 'I', q: 'Design a real-time gaming leaderboard with Redis. What about ties, scale and persistence?',
    a: `<p>A sorted set per board (<code>lb:weekly</code>, <code>lb:daily:2026-09-01</code>): <code>ZINCRBY</code> on each score event, <code>ZREVRANGE 0 9 WITHSCORES</code> for the top 10, <code>ZREVRANK</code> plus a small range around it for "my position", all O(log n). Ties are broken lexicographically by member, so if earlier achievers must win I encode time into the score (points × 10<sup>10</sup> + (MAX_TS − ts)). Periodic boards get TTLs; all-time boards can be rebuilt with <code>ZUNIONSTORE</code>. For hundreds of millions of players, one sorted set on one shard becomes a hot key: shard by region or bucket and merge the top-N of each, or keep exact ranks only for the top and approximate percentiles for the rest. Scores are also written to a durable store (DynamoDB/PostgreSQL) so Redis can be rebuilt; I run AOF everysec with a replica.</p>`,
    followUps: ['How would you show a friends-only leaderboard?', 'How do you rebuild the board after losing Redis?'] });
  interview.push({ level: 'I', q: 'Explain Redis persistence and eviction choices for a cache versus a session store.',
    a: `<p>For a pure cache the database is the source of truth: <code>maxmemory</code> with <code>allkeys-lfu</code> (or allkeys-lru), little or no persistence, TTLs with jitter to avoid synchronized expiry, and cache-aside reads. For sessions, losing data logs users out, so I use AOF with <code>appendfsync everysec</code> (RDB preamble), a replica with automatic failover, and every session key gets a TTL. If the same instance holds permanent keys (config) I choose <code>volatile-lru</code> so only TTL keys can be evicted, or better, separate instances. I monitor evicted_keys, hit ratio and fork latency, and I remember replication is asynchronous: an acknowledged write can still be lost on failover, so Redis is not where money lives.</p>`,
    followUps: ['What does noeviction do and when is it the right default?', 'Why can an RDB snapshot double memory usage?'] });
  interview.push({ level: 'A', q: 'Design Cassandra tables for an IoT platform: 1 million sensors, one reading per second each.',
    a: `<p>Queries: readings of a sensor in a time range, latest reading per sensor, and daily aggregates. Table 1: <code>PRIMARY KEY ((sensor_id, day), ts)</code> with clustering DESC; one reading/s is 86 400 rows/day, about 4 MB at ~50 bytes, safely under the 100 MB guideline. Range queries spanning days read one partition per day in parallel. TTL (default_time_to_live) plus TimeWindowCompactionStrategy so old data expires by dropping whole SSTables without tombstone scans. Table 2: <code>latest_by_sensor</code> keyed by sensor_id, upserted on every write. Table 3: rollups (sensor_id, month) written by a stream job. Write rate is 1 M/s; at RF 3 that is 3 M replica writes/s, sized at maybe 30–60 nodes depending on hardware. Writes and reads at LOCAL_QUORUM per DC. No ALLOW FILTERING anywhere; alerts on thresholds are computed in the stream, not by scanning.</p>`,
    followUps: ['How would you handle a sensor that sends 1 000 readings per second?', 'Where would you run ad-hoc analytics on this data?'] });
  interview.push({ level: 'A', q: 'What does W + R > RF guarantee in Cassandra, and what does it not?',
    a: `<p>It guarantees that the replicas answering a read overlap with the replicas that acknowledged the latest successful write, so the coordinator sees the newest value by timestamp. With RF 3, QUORUM/QUORUM (2 + 2) or ALL/ONE qualify. It does not give linearizability: conflicts resolve by last-write-wins on client/coordinator timestamps, so clock skew can make an older write win; a failed write may have reached some replicas and later appear (no rollback); and concurrent read-modify-write races remain. For compare-and-set semantics use lightweight transactions (<code>IF NOT EXISTS</code>, Paxos, SERIAL/LOCAL_SERIAL), and in multi-DC setups LOCAL_QUORUM gives strong reads only within a datacenter.</p>`,
    followUps: ['What does Cassandra 5 / Accord change for transactions?', 'Why is RF 3 more common than RF 4?'] });
  interview.push({ level: 'A', q: 'Explain DynamoDB single-table design. When would you avoid it?',
    a: `<p>Several entity types share one table with generic keys (PK, SK, GSI1PK, GSI1SK) and typed prefixes, so items needed together share a partition: <code>PK = CUST#1</code> holds PROFILE, ADDR#..., ORDER#date#id, and one Query returns the customer page. Sort keys encode hierarchy and time for begins_with and BETWEEN; overloaded sparse GSIs serve secondary patterns (status queues, inverted many-to-many lookups). Benefits: fewest requests, predictable latency, transactions within one table. Costs: patterns must be known up front, the schema is hard to read, new patterns need backfills, and analytics need an export. I avoid it when patterns are still changing, when entities are never fetched together (separate tables are simpler and GSIs can be added online), or when the team relies on ad-hoc queries, where PostgreSQL is the better fit.</p>`,
    followUps: ['How do you model a many-to-many relationship (adjacency list)?', 'How would you add a new access pattern to a live table?'] });
  interview.push({ level: 'I', q: 'What are the differences between a GSI and an LSI in DynamoDB?',
    a: `<p>A GSI has its own partition key (and optional sort key), can be created or deleted at any time, has its own throughput, and is updated asynchronously, so reads are eventually consistent only; items without the key attributes are absent (sparse). An LSI keeps the table's partition key with a different sort key, must be defined at table creation (max 5), shares the table's throughput, supports strongly consistent reads, and imposes a 10 GB limit per item collection. GSIs are the default choice; LSIs only when you need strong reads on an alternate sort order within a partition and are sure collections stay small. Each index adds write cost for the items it contains, and an under-provisioned GSI can throttle base-table writes.</p>`,
    followUps: ['What projection would you choose and why?', 'What happens to a GSI write if the index is throttled?'] });
  interview.push({ level: 'A', q: 'A DynamoDB table throttles while CloudWatch shows only 20% of provisioned capacity used. Diagnose and fix.',
    a: `<p>That is the signature of a hot partition or hot item: capacity is enforced per partition (1 000 WCU, 3 000 RCU per second) and per item. I enable CloudWatch Contributor Insights to find the top keys and look at per-second peaks, not averages. Typical causes: a low-cardinality key (status, date, country), a viral item, or a GSI keyed by a hot value. Fixes: cache hot reads with DAX or Redis; write-shard hot counters (<code>key~0..N</code>) and aggregate on read or in a background job; redesign keys for higher cardinality; batch increments before writing; check GSIs, because their throttling back-pressures the table. Adaptive capacity helps with moderate skew but cannot lift the per-item ceiling, and switching to on-demand does not remove partition limits.</p>`,
    followUps: ['How many shards would a 4 000 writes/s counter need?', 'Why can a GSI throttle writes to the base table?'] });
  interview.push({ level: 'E', q: 'How do you keep denormalised copies consistent across tables or stores in a NoSQL design?',
    a: `<p>Choose per copy how stale it may be. Same store, must agree: write together atomically (MongoDB single document or transaction, DynamoDB TransactWriteItems, Cassandra logged batch for multi-table atomicity). Different stores or tolerable lag: change data capture (DynamoDB Streams, MongoDB change streams, Debezium) driving idempotent consumers that upsert the copies, with retries and dead-letter queues; avoid dual writes from the app without an outbox, because one side can fail. Make updates idempotent and versioned (conditional writes on a version or timestamp) so replays and reordering are harmless. Finally, run reconciliation jobs that compare sources and copies and repair drift, and expose the expected staleness in the product (for example "counts update within a minute").</p>`,
    followUps: ['What is the transactional outbox pattern?', 'How do you delete a user from every copy for GDPR?'] });
  interview.push({ level: 'A', q: 'How do AI tools change NoSQL data modelling work, and where must you stay in control?',
    a: `<p>Assistants turn a product spec into an access-pattern table and draft key designs for DynamoDB, Cassandra or MongoDB quickly; they translate SQL to aggregation pipelines, generate CQL and redis-cli scripts, and read capacity metrics to point at hot keys. NoSQL stores are also absorbing AI workloads: vector search in MongoDB Atlas, Cassandra 5 SAI and Redis, semantic caches and token-budget rate limits in Redis. What I keep control of: the list of patterns and their numbers (sizes, rates, skew), partition sizing and hot-key math, which copies may be stale and how they are repaired, and cost per request. Typical AI mistakes I check for: unbounded arrays, relational Cassandra schemas with ALLOW FILTERING, FilterExpressions sold as cheap, low-cardinality partition keys, and claims of strong consistency where there is none.</p>`,
    followUps: ['How would you evaluate an AI-generated single-table design?', 'Would you put embeddings in your operational NoSQL store or a dedicated vector database?'] });
  interview.push({ level: 'I', q: 'Design a per-user API rate limiter with Redis. Compare fixed window, sliding log and sliding counter.',
    a: `<p><b>Fixed window</b>: <code>INCR rl:{user}:{minute}</code> + <code>EXPIRE</code>; O(1) memory and time, but allows up to 2× the limit around window boundaries. <b>Sliding log</b>: a sorted set per user with timestamps as scores; per request <code>ZREMRANGEBYSCORE</code> old entries, <code>ZCARD</code>, then <code>ZADD</code> and <code>EXPIRE</code> inside a Lua script or function so it is atomic; exact, but memory grows with the limit. <b>Sliding counter</b>: keep the current and previous fixed-window counts and weight the previous by the overlap; O(1) memory, small approximation error, usually the production choice. In a cluster each user's keys share a slot via hash tags, the limiter fails open or closed by policy if Redis is unreachable, and the response returns remaining quota and retry-after headers.</p>`,
    followUps: ['How would you enforce a global limit across regions?', 'How is a token bucket implemented in Redis?'] });

  registerModule({
    id: 'sql17',
    title: 'NoSQL Data Modeling: MongoDB, Redis, Cassandra & DynamoDB',
    intro: `<p>SQL 14 mapped the NoSQL families and the theory around them (replication, sharding, CAP). This module is the hands-on sequel: how to actually <b>design data</b> for the four stores interviewers ask about most. In every one of them the rule is the same: <b>list the access patterns first, then shape the keys and documents so each pattern is one cheap lookup</b>.</p>
<p>You will design MongoDB documents (embed vs reference, subset, extended reference, schema versioning) and translate aggregation pipelines; pick Redis data structures and reason about persistence, TTLs and eviction policies; build Cassandra tables query-first with partition and clustering keys, size partitions and tune consistency; model DynamoDB with partition/sort keys, sparse GSIs and single-table design; and find and fix hot partitions.</p>
<p>Native Mongo shell, redis-cli, CQL and DynamoDB JSON are shown for reference. Every problem is solved and tested in SQL against SQLite emulations of the stores: JSON documents for MongoDB (<b>mongo</b>), a keyspace with TTLs and sorted sets for Redis (<b>redis</b>), clustered partitions for Cassandra (<b>cass</b>), a single PK/SK table with a GSI for DynamoDB (<b>dynamo</b>), and an access-pattern inventory (<b>design</b>).</p>`,
    goals: [
      'Turn a product description into an access-pattern table and justify a store (or a mix of stores) for each pattern',
      'Design MongoDB documents with embedding, referencing and the subset, extended-reference, computed, bucket and schema-versioning patterns, and translate aggregation pipelines to and from SQL',
      'Choose Redis data structures for leaderboards, sessions, queues and rate limits, and configure persistence, TTLs and eviction policies for caches versus stores',
      'Build Cassandra tables query-first, size and bucket partitions, avoid tombstone traps, and pick consistency levels using W + R > RF',
      'Model DynamoDB item collections, sort-key conditions, sparse GSIs and single-table designs, and estimate capacity cost per pattern',
      'Detect hot partitions and hot keys from traffic data and fix them with caching, write sharding, better keys or aggregation'
    ],
    prereqs: `SQL 14 (Distributed Databases &amp; NoSQL) for replication, sharding, quorums and the NoSQL families. Comfort with JSON functions, GROUP BY and window functions (SQL 3, SQL 6) helps with the SQL emulations. The HLD modules on caching and sharding pair well with this one.`,
    hours: 12,
    databases: { design: DB_DESIGN, mongo: DB_MONGO, redis: DB_REDIS, cass: DB_CASS, dynamo: DB_DYNAMO },
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
