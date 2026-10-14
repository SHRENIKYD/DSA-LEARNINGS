(function () {
  var topics = [], practice = [], quiz = [], interview = [];

  /* ---------------- sample databases (SQLite dialect) ----------------
     Tiny SQLite "simulations" of distributed systems so you can run real queries
     in the browser: a replication log, a sharded user base, NoSQL shapes
     (documents, key-value, wide-column, graph) and NewSQL key ranges. */
  // repl: leader write-ahead log, replica positions, sessions, read log, leaderless KV copies
  var DB_REPL = `
CREATE TABLE wal (
  lsn       INTEGER PRIMARY KEY,   -- log sequence number = position in the leader's write-ahead log
  commit_ms INTEGER NOT NULL,      -- leader commit time (ms since start of the demo)
  user_id   INTEGER NOT NULL,      -- who made the change
  op        TEXT NOT NULL,
  detail    TEXT
);
INSERT INTO wal VALUES
  (101, 1000,  7, 'UPDATE profile', 'name = Asha K'),
  (102, 1040,  3, 'INSERT order',   'order 5001'),
  (103, 1100,  7, 'INSERT comment', 'Nice post!'),
  (104, 1180,  9, 'UPDATE cart',    'qty = 2'),
  (105, 1250,  3, 'UPDATE order',   'order 5001 paid'),
  (106, 1300,  7, 'UPDATE profile', 'avatar = cat.png'),
  (107, 1420, 12, 'INSERT user',    'signup'),
  (108, 1500,  9, 'DELETE cart',    'checkout'),
  (109, 1560,  3, 'INSERT review',  '5 stars'),
  (110, 1640,  7, 'INSERT comment', 'Thanks all');
CREATE TABLE replicas (
  name        TEXT PRIMARY KEY,
  role        TEXT NOT NULL CHECK (role IN ('leader', 'sync', 'async')),
  region      TEXT NOT NULL,
  applied_lsn INTEGER NOT NULL,    -- last WAL entry this node has applied
  rtt_ms      INTEGER NOT NULL     -- round trip from the app servers (us-east)
);
INSERT INTO replicas VALUES
  ('db-leader', 'leader', 'us-east',  110,   2),
  ('db-f1',     'sync',   'us-east-2', 110,  12),
  ('db-f2',     'async',  'us-east',  107,   3),
  ('db-f3',     'async',  'eu-west',  104,  80),
  ('db-f4',     'async',  'ap-south', 101, 190);
CREATE TABLE sessions (
  session_id     TEXT PRIMARY KEY,
  user_id        INTEGER,
  last_write_lsn INTEGER           -- LSN of this session's latest write (NULL = never wrote)
);
INSERT INTO sessions VALUES
  ('s-asha', 7, 110), ('s-ravi', 3, 109), ('s-mei', 9, 108), ('s-new', 12, 107), ('s-guest', NULL, NULL);
CREATE TABLE read_log (
  id         INTEGER PRIMARY KEY,
  session_id TEXT NOT NULL,
  at_ms      INTEGER NOT NULL,
  replica    TEXT NOT NULL,
  seen_lsn   INTEGER NOT NULL      -- how far that replica had applied when it answered
);
INSERT INTO read_log VALUES
  (1, 's-asha', 2000, 'db-f1', 110), (2, 's-asha', 2050, 'db-f3', 104), (3, 's-asha', 2100, 'db-f1', 110),
  (4, 's-ravi', 2010, 'db-f2', 107), (5, 's-ravi', 2060, 'db-f2', 107), (6, 's-ravi', 2120, 'db-f4', 101),
  (7, 's-mei',  2030, 'db-f1', 110), (8, 's-mei',  2090, 'db-f2', 107), (9, 's-mei', 2150, 'db-f2', 108);
CREATE TABLE kv_replicas (
  node TEXT NOT NULL,              -- leaderless cluster, N = 5 copies of every key
  k    TEXT NOT NULL,
  v    TEXT,
  ver  INTEGER NOT NULL,           -- version number (higher = newer)
  PRIMARY KEY (node, k)
);
INSERT INTO kv_replicas VALUES
  ('A', 'cart:9', 'qty=2', 3), ('B', 'cart:9', 'qty=2', 3), ('C', 'cart:9', 'qty=1', 2),
  ('D', 'cart:9', 'qty=2', 3), ('E', 'cart:9', 'empty', 1),
  ('A', 'theme:7', 'dark', 5), ('B', 'theme:7', 'light', 4), ('C', 'theme:7', 'light', 4),
  ('D', 'theme:7', 'dark', 5), ('E', 'theme:7', 'dark', 5);
CREATE TABLE read_resp (
  read_id INTEGER NOT NULL,        -- one quorum read = the R nodes that answered
  node    TEXT NOT NULL,
  k       TEXT NOT NULL
);
INSERT INTO read_resp VALUES
  (1, 'C', 'cart:9'), (1, 'D', 'cart:9'), (1, 'E', 'cart:9'),
  (2, 'B', 'theme:7'), (2, 'C', 'theme:7'), (2, 'E', 'theme:7');
`;
  // shard: 24 users (user 1 is a celebrity), 120 skewed requests, a range map, signup days
  var DB_SHARD = `
CREATE TABLE users (
  user_id   INTEGER PRIMARY KEY,   -- auto-increment style: new users get the biggest ids
  handle    TEXT NOT NULL,
  country   TEXT NOT NULL,
  tenant    TEXT NOT NULL,         -- which customer company the user belongs to (multi-tenant SaaS)
  followers INTEGER NOT NULL
);
INSERT INTO users (user_id, handle, country, tenant, followers)
WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM n WHERE i < 24)
SELECT i,
       CASE WHEN i = 1 THEN 'starcelebrity' ELSE 'user' || i END,
       CASE i % 4 WHEN 0 THEN 'IN' WHEN 1 THEN 'US' WHEN 2 THEN 'BR' ELSE 'DE' END,
       CASE WHEN i <= 12 THEN 'acme' WHEN i <= 18 THEN 'globex' WHEN i <= 22 THEN 'initech' ELSE 'umbrella' END,
       CASE WHEN i = 1 THEN 9000000 ELSE 50 + i * 7 END
FROM n;
CREATE TABLE requests (
  req_id  INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(user_id)   -- whose data the request touches
);
-- 120 requests: half of them hit the celebrity (user 1), the rest spread evenly over users 2..24
INSERT INTO requests (req_id, user_id)
WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM n WHERE i < 120)
SELECT i, CASE WHEN i % 2 = 0 THEN 1 ELSE 2 + (i / 2) % 23 END FROM n;
CREATE TABLE range_map (
  shard INTEGER PRIMARY KEY,
  lo    INTEGER NOT NULL,          -- inclusive
  hi    INTEGER NOT NULL,          -- inclusive
  node  TEXT NOT NULL
);
INSERT INTO range_map VALUES (0, 1, 6, 'node-a'), (1, 7, 12, 'node-b'), (2, 13, 18, 'node-c'), (3, 19, 24, 'node-d');
CREATE TABLE signups (
  user_id    INTEGER PRIMARY KEY,
  signup_day TEXT NOT NULL         -- for "range by date" demos
);
INSERT INTO signups (user_id, signup_day)
WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM n WHERE i < 24)
SELECT i, date('2026-10-01', '+' || ((i - 1) / 2) || ' days') FROM n;
`;
  // nosql: documents (JSON), key-value with TTL, a wide-column table, a follow graph
  var DB_NOSQL = `
-- Document store emulated in SQLite: one JSON document per row
CREATE TABLE docs (
  id         TEXT PRIMARY KEY,
  collection TEXT NOT NULL,
  body       TEXT NOT NULL CHECK (json_valid(body))
);
INSERT INTO docs VALUES
  ('o1', 'orders', '{"_id":"o1","customer":{"id":7,"name":"Asha"},"status":"paid","placed":"2026-10-01","items":[{"sku":"PEN-1","qty":3,"price":40},{"sku":"BOOK-9","qty":1,"price":450}]}'),
  ('o2', 'orders', '{"_id":"o2","customer":{"id":3,"name":"Ravi"},"status":"shipped","placed":"2026-10-02","items":[{"sku":"MUG-2","qty":2,"price":199}]}'),
  ('o3', 'orders', '{"_id":"o3","customer":{"id":7,"name":"Asha"},"status":"pending","placed":"2026-10-05","items":[{"sku":"PEN-1","qty":10,"price":40},{"sku":"MUG-2","qty":1,"price":199}],"coupon":"DIWALI10"}'),
  ('p1', 'products', '{"_id":"PEN-1","name":"Gel Pen","price":40,"attrs":{"color":"blue","ink":"gel"}}'),
  ('p2', 'products', '{"_id":"BOOK-9","name":"DDIA","price":450,"attrs":{"author":"Kleppmann","pages":616}}'),
  ('p3', 'products', '{"_id":"MUG-2","name":"Coffee Mug","price":199,"attrs":{"volume_ml":350,"dishwasher":true}}');
-- Key-value store emulated: opaque value + optional expiry (like Redis SET k v EX ttl)
CREATE TABLE kv (
  k          TEXT PRIMARY KEY,
  v          TEXT NOT NULL,
  expires_at INTEGER               -- unix seconds, NULL = never
);
INSERT INTO kv VALUES
  ('session:ab12', '{"user":7,"cart":["PEN-1"]}', 1760500000),
  ('session:cd34', '{"user":3,"cart":[]}', 1760400000),
  ('ratelimit:7:2026-10-14T10:05', '17', 1760436360),
  ('feature:new_checkout', 'on', NULL);
-- Wide-column store emulated: partition key (channel_id, day) + clustering key (ts, msg_id)
CREATE TABLE messages_by_channel (
  channel_id TEXT NOT NULL,
  day        TEXT NOT NULL,          -- bucket: keeps one partition from growing forever
  ts         TEXT NOT NULL,
  msg_id     TEXT NOT NULL,
  author     TEXT NOT NULL,
  body       TEXT NOT NULL,
  PRIMARY KEY (channel_id, day, ts, msg_id)
) WITHOUT ROWID;
INSERT INTO messages_by_channel VALUES
  ('general', '2026-10-13', '09:00:01', 'm1', 'asha', 'Good morning!'),
  ('general', '2026-10-13', '09:02:10', 'm2', 'ravi', 'Standup in 5'),
  ('general', '2026-10-14', '08:59:00', 'm3', 'mei',  'Deploy went fine'),
  ('general', '2026-10-14', '09:15:42', 'm4', 'asha', 'Lunch?'),
  ('random',  '2026-10-14', '10:00:00', 'm5', 'ravi', 'Cat picture'),
  ('general', '2026-10-14', '09:15:42', 'm6', 'ravi', 'Yes!');
-- Graph emulated: nodes + edges
CREATE TABLE people (id INTEGER PRIMARY KEY, name TEXT NOT NULL);
INSERT INTO people VALUES (1,'Asha'),(2,'Ravi'),(3,'Mei'),(4,'Tom'),(5,'Zara'),(6,'Leo'),(7,'Nia');
CREATE TABLE follows (
  src INTEGER NOT NULL REFERENCES people(id),
  dst INTEGER NOT NULL REFERENCES people(id),
  PRIMARY KEY (src, dst)
);
INSERT INTO follows VALUES (1,2),(1,3),(2,3),(2,4),(3,5),(4,5),(4,6),(5,7),(6,1),(3,4);
`;
  // bank: CockroachDB-style key ranges + accounts for the NewSQL topic
  var DB_BANK = `
-- NewSQL demo: CockroachDB-style key ranges, each replicated 3 ways with Raft
CREATE TABLE ranges (
  range_id    INTEGER PRIMARY KEY,
  start_key   TEXT NOT NULL,         -- inclusive
  end_key     TEXT NOT NULL,         -- exclusive ('~' = end of keyspace)
  leaseholder TEXT NOT NULL,         -- replica that serves reads/coordinates writes for this range
  replicas    TEXT NOT NULL,         -- the 3 Raft members
  size_mb     INTEGER NOT NULL,
  qps         INTEGER NOT NULL
);
INSERT INTO ranges VALUES
  (1, 'acct/a', 'acct/h', 'n1', 'n1,n2,n3', 310, 900),
  (2, 'acct/h', 'acct/p', 'n2', 'n2,n3,n4', 120, 7400),
  (3, 'acct/p', 'acct/z', 'n4', 'n4,n5,n1', 640, 1100),
  (4, 'acct/z', '~',      'n5', 'n5,n1,n2',  40,  60);
CREATE TABLE accounts (
  acct    TEXT PRIMARY KEY,
  owner   TEXT NOT NULL,
  region  TEXT NOT NULL,
  balance INTEGER NOT NULL CHECK (balance >= 0)
);
INSERT INTO accounts VALUES
  ('acct/asha', 'Asha', 'ap-south', 5000),
  ('acct/ben',  'Ben',  'us-east',  1200),
  ('acct/kim',  'Kim',  'ap-northeast', 800),
  ('acct/omar', 'Omar', 'eu-west',  3000),
  ('acct/ravi', 'Ravi', 'ap-south',  250),
  ('acct/zoe',  'Zoe',  'us-west',  9100);
`;


  /* =====================================================================
     TOPIC 1 — Leader-follower replication & replication lag
     ===================================================================== */
  topics.push({
    title: 'Leader-Follower Replication & Replication Lag',
    analogy: `<p>Think of a <b>head chef</b> who owns the master recipe book. Only the head chef may change a recipe. Every change is written on a slip and sent by courier to the <b>branch kitchens</b>, which copy it into their own books. Customers can eat at any branch (lots of capacity!), but a far-away branch whose courier is slow may still cook <i>yesterday's</i> recipe. That delay is <b>replication lag</b>, and the "old recipe" a customer tastes is a <b>stale read</b>.</p>`,
    explain: `<p><b>Replication</b> = keeping a copy of the same data on several machines. We do it for four reasons: <b>availability</b> (one machine dies, another answers), <b>durability</b> (a disk melts, the data survives elsewhere), <b>read scaling</b> (spread reads over many copies) and <b>latency</b> (put a copy near users in Mumbai and in Frankfurt).</p>
<p>The most common shape is <b>leader-follower</b> (also called primary-replica or master-slave). Exactly one node, the <b>leader</b>, accepts writes. It records every change in a <b>replication log</b> (in Postgres this is the WAL, in MySQL the binlog). <b>Followers</b> stream that log and replay it in the same order, so they end up with the same data. Reads can go to the leader or to any follower.</p>
${H.table(['Mode', 'When does the leader say "committed"?', 'Good', 'Bad'], [
  ['<b>Synchronous</b>', 'after the follower confirms it has the change', 'follower is never behind: no data loss on failover', 'one slow or dead follower blocks every write'],
  ['<b>Asynchronous</b>', 'immediately, follower catches up later', 'fast writes, followers can be far away', 'follower can lag; recent writes are lost if the leader dies'],
  ['<b>Semi-sync</b> (one sync + rest async)', 'after <i>one</i> follower confirms', 'at least two copies of every commit, still fast', 'needs a spare sync candidate; still lag on the async ones']
])}
<p><b>How the log is shipped</b> matters too:</p>
<ul>
<li><b>Statement-based</b>: send the SQL text (<code>UPDATE ... SET x = x + 1</code>). Small, but breaks on non-deterministic things like <code>NOW()</code>, <code>RANDOM()</code>, or auto-increment order.</li>
<li><b>Physical / WAL shipping</b>: send the exact bytes changed on disk pages (Postgres streaming replication). Exact, but both sides must run the same major version and storage format.</li>
<li><b>Logical / row-based</b>: send "row id 42: column name changed from A to B" (MySQL row-based binlog, Postgres logical decoding). Version-independent and readable by other systems, which is how <b>change data capture</b> (CDC, e.g. Debezium into Kafka) works.</li>
</ul>
<p><b>Replication lag</b> is the gap between "leader committed it" and "follower applied it". With async followers it is usually milliseconds, but under load, long transactions, or a slow network it can be seconds or minutes. Lag causes three classic user-visible <b>anomalies</b>:</p>
${H.table(['Anomaly', 'What the user sees', 'Fix'], [
  ['<b>Read-your-writes</b> violation', 'I changed my name, refreshed, and my old name came back', 'read your own recent data from the leader, or from a replica that has reached your write\'s LSN'],
  ['<b>Monotonic reads</b> violation', 'a comment appears, I refresh, it disappears (time went backwards)', 'stick each user to one replica (hash user id → replica), or remember the highest LSN seen'],
  ['<b>Consistent prefix</b> violation', 'I see the answer before the question', 'causally related writes must land in the same partition/order; track causal dependencies']
])}
<p><b>Failover</b>: when the leader dies, a follower is promoted. Steps: detect (heartbeat timeout), choose the most up-to-date follower (often via consensus in etcd/ZooKeeper, e.g. Patroni), reconfigure clients. Dangers: async writes the old leader had not shipped are <span class="c-r">lost</span>; if the old leader comes back still thinking it is leader you get <span class="c-r">split brain</span> (two leaders accepting writes), which is why systems use <b>fencing tokens</b> or "shoot the other node in the head".</p>`,
    clues: [
      '"read-heavy, 100:1 reads to writes" → add read replicas (leader-follower)',
      '"user updated profile but sees old value after refresh" → read-your-writes / replication lag',
      '"comments disappear and reappear" → monotonic reads; pin user to a replica',
      '"zero data loss (RPO = 0) on failover" → synchronous or semi-sync replication, or a consensus log',
      '"replicas in another continent" → async replication + lag-aware routing',
      '"stream every DB change to search/analytics" → logical replication / CDC (Debezium, binlog)'
    ],
    code: [
      { lang: 'sql', db: 'repl', title: 'How far behind is every replica? (runnable)', code: `-- LSN = log sequence number, the position in the leader's write-ahead log.
-- lsn_behind: how many log entries the replica still has to apply.
-- lag_ms: newest commit time minus the commit time of the last entry the replica applied
--         (a "replay lag" estimate, like Postgres replay_lag).
SELECT r.name,
       r.role,
       r.region,
       r.applied_lsn,
       (SELECT MAX(lsn) FROM wal) - r.applied_lsn                  AS lsn_behind,
       (SELECT MAX(commit_ms) FROM wal)
         - (SELECT commit_ms FROM wal WHERE lsn = r.applied_lsn)   AS lag_ms
FROM replicas AS r
ORDER BY lsn_behind, r.name;` },
      { lang: 'python', run: true, title: 'Lag-aware read router with LSN tokens (runnable sketch)', code: `# A tiny read router that guarantees read-your-writes.
# After every write the app remembers the leader's LSN for that session
# (Postgres: pg_current_wal_lsn(); MySQL: GTID). A replica may serve the
# session only once it has applied at least that LSN.

replicas = {
    "db-leader": {"applied": 110, "rtt": 2, "leader": True},
    "db-f1": {"applied": 110, "rtt": 12, "leader": False},
    "db-f2": {"applied": 107, "rtt": 3, "leader": False},
    "db-f3": {"applied": 104, "rtt": 80, "leader": False},
}

session_token = {}  # session id -> LSN of its last write


def on_write(session, leader_lsn):
    session_token[session] = leader_lsn


def pick_replica(session):
    need = session_token.get(session, 0)
    ok = [(not info["leader"], -info["rtt"], name)  # prefer followers, then lowest RTT
          for name, info in replicas.items() if info["applied"] >= need]
    # max(): followers (True) beat leader (False); higher -rtt = lower rtt
    return max(ok)[2]


on_write("asha", 110)       # Asha just changed her profile (LSN 110)
on_write("ravi", 106)
print("asha reads from", pick_replica("asha"))   # needs >= 110 -> db-f1
print("ravi reads from", pick_replica("ravi"))   # needs >= 106 -> db-f2 is fine
print("guest reads from", pick_replica("guest")) # never wrote -> nearest follower
` }
    ],
    codeTitle: ['Measuring lag', 'Read-your-writes router'],
    viz: {
      title: 'Leader → followers with lag: watch a stale read happen',
      input: '2 | W 10, R, W 20, R, R, W 30, R, R, R',
      inputLabel: 'async lag in ticks (0-5) | ops: "W value" = write, "R" = read (reads alternate F2, F1)',
      gen: function (input) {
        var txt = String(input || '').split('|');
        if (txt.length !== 2) throw new Error('Format: lag | ops   e.g.  2 | W 10, R, W 20, R');
        var lag = parseInt(txt[0], 10);
        if (isNaN(lag) || lag < 0 || lag > 5) throw new Error('Lag must be an integer 0..5');
        var ops = txt[1].split(',').map(function (s) { return s.trim(); }).filter(function (s) { return s.length; });
        if (!ops.length || ops.length > 14) throw new Error('Give 1..14 ops separated by commas');
        var parsed = ops.map(function (o) {
          var m = /^W\s+(-?\d+)$/i.exec(o);
          if (m) return { w: true, v: Number(m[1]) };
          if (/^R$/i.test(o)) return { w: false };
          throw new Error('Each op must be "W number" or "R" (got "' + o + '")');
        });
        var log = [], f1 = null, f2 = null, f2lsn = 0, leaderVal = null, stale = 0, reads = 0, rr = 0, frames = [];
        function nodes() {
          return [
            { id: 'C', label: 'App / Client', x: 8, y: 30, shape: 'box' },
            { id: 'L', label: 'Leader', x: 42, y: 30, shape: 'box' },
            { id: 'F1', label: 'F1 (sync)', x: 84, y: 10, shape: 'box' },
            { id: 'F2', label: 'F2 (async)', x: 84, y: 50, shape: 'box' }
          ];
        }
        var edges = [['C', 'L', 'writes'], ['L', 'F1', 'sync ack'], ['L', 'F2', 'async +' + lag + ' ticks'], ['C', 'F1', 'read'], ['C', 'F2', 'read']];
        function logTable(cur) {
          return { type: 'table', label: 'Leader replication log (WAL)', columns: ['LSN', 'value', 'committed at tick', 'F1 applied?', 'F2 applied?'],
            rows: log.map(function (e, i) { return [i + 1, e.v, e.t, 'yes', (i + 1) <= f2lsn ? 'yes' : 'not yet']; }), hl: cur };
        }
        function show(v) { return v === null ? '(empty)' : String(v); }
        frames.push({ narr: 'Setup: one <b>leader</b> takes all writes. <b>F1</b> is synchronous (the leader waits for its ack before saying "committed"). <b>F2</b> is asynchronous and applies each log entry <b>' + lag + '</b> tick(s) after commit. Reads are load-balanced across the followers.', parts: [
          { type: 'graph', directed: true, height: 60, nodes: nodes(), edges: edges, tags: { L: 'x = ' + show(leaderVal), F1: 'x = ' + show(f1), F2: 'x = ' + show(f2) } },
          { type: 'vars', label: 'State', vals: { tick: 0, async_lag: lag, leader_x: show(leaderVal), F1_x: show(f1), F2_x: show(f2) } }
        ] });
        for (var t = 1; t <= parsed.length; t++) {
          var op = parsed[t - 1];
          // async follower first catches up on everything older than `lag` ticks
          var caught = [];
          while (f2lsn < log.length && log[f2lsn].t + lag <= t) { f2 = log[f2lsn].v; f2lsn++; caught.push(f2lsn); }
          var hl = {}, ehl = {}, tags, narr, curRow = {};
          if (op.w) {
            log.push({ v: op.v, t: t });
            leaderVal = op.v; f1 = op.v;
            if (lag === 0) { f2 = op.v; f2lsn = log.length; }
            hl.L = 'ok'; hl.F1 = 'ok'; ehl['C-L'] = 'ok'; ehl['L-F1'] = 'ok';
            if (lag === 0) { hl.F2 = 'ok'; ehl['L-F2'] = 'ok'; } else ehl['L-F2'] = 'cur';
            curRow[log.length - 1] = 'ok';
            narr = 'Tick ' + t + ': <b>WRITE x = ' + op.v + '</b> goes to the leader as LSN ' + log.length + '. The leader waits for <b>F1</b> to ack (sync) and then tells the client "committed". ' + (lag === 0 ? 'Lag is 0, so F2 has it too.' : 'F2 will only get it at tick ' + (t + lag) + ' — the change is "in flight".');
          } else {
            reads++;
            var target = rr % 2 === 0 ? 'F2' : 'F1'; rr++;
            var got = target === 'F1' ? f1 : f2;
            var isStale = got !== leaderVal;
            if (isStale) stale++;
            hl[target] = isStale ? 'bad' : 'ok'; ehl['C-' + target] = isStale ? 'bad' : 'ok';
            narr = 'Tick ' + t + ': <b>READ x</b> is routed to <b>' + target + '</b>, which returns <b>' + show(got) + '</b>. ' + (isStale
              ? '<span class="c-r">STALE READ!</span> The leader already has x = ' + show(leaderVal) + ' but ' + target + ' has only applied LSN ' + f2lsn + ' of ' + log.length + '. A user who just wrote would think their change was lost (read-your-writes violation).'
              : '<span class="c-g">Fresh</span> — this replica has applied every committed write.');
          }
          if (caught.length && !op.w) narr += ' (Before this read, F2 caught up to LSN ' + caught[caught.length - 1] + '.)';
          else if (caught.length) narr += ' Meanwhile F2 caught up to LSN ' + caught[caught.length - 1] + '.';
          tags = { L: 'x = ' + show(leaderVal) + ' @LSN ' + log.length, F1: 'x = ' + show(f1), F2: 'x = ' + show(f2) + ' (' + (log.length - f2lsn) + ' behind)' };
          if (log.length - f2lsn > 0 && !hl.F2) hl.F2 = 'cur';
          frames.push({ narr: narr, parts: [
            { type: 'graph', directed: true, height: 60, nodes: nodes(), edges: edges, hl: hl, ehl: ehl, tags: tags },
            logTable(curRow),
            { type: 'vars', label: 'State', vals: { tick: t, leader_x: show(leaderVal), F1_x: show(f1), F2_x: show(f2), F2_entries_behind: log.length - f2lsn, stale_reads: stale + ' / ' + reads }, hl: isStale && !op.w ? { stale_reads: 'bad' } : {} }
          ] });
        }
        frames.push({ narr: 'Done: <b>' + stale + '</b> of <b>' + reads + '</b> reads were stale. Nothing was "broken" — this is what asynchronous replication means. Turn lag to 0 and every read becomes fresh, but then every write waits for every follower.', parts: [
          { type: 'bars', label: 'Reads: fresh vs stale', values: [reads - stale, stale], idxLabels: ['fresh', 'stale'], hl: stale ? { 1: 'bad' } : { 0: 'ok' } },
          { type: 'text', html: '<b>Three fixes for stale reads:</b><br>1. <b>Read-your-writes:</b> for N seconds after a user writes, send their reads to the leader.<br>2. <b>LSN token:</b> remember the LSN of the write; only use replicas with applied_lsn ≥ token.<br>3. <b>Monotonic reads:</b> pin each user to one replica (hash(user_id) → replica) so time never goes backwards.' }
        ] });
        frames.push({ narr: 'Failover preview: if the leader crashed right now, promoting <b>F1</b> (sync) loses nothing, but promoting <b>F2</b> would <span class="c-r">lose ' + (log.length - f2lsn) + ' committed write(s)</span>. That is why failover tools pick the most up-to-date replica.', parts: [
          { type: 'graph', directed: true, height: 60, nodes: nodes(), edges: edges, hl: { L: 'bad', F1: 'ok', F2: log.length - f2lsn ? 'bad' : 'ok' }, tags: { L: 'crashed', F1: 'safe to promote', F2: log.length - f2lsn ? 'would lose ' + (log.length - f2lsn) : 'also safe' } }
        ] });
        return frames;
      }
    },
    examples: [
      { title: 'Measure lag per replica', html: `<p>Run the reference query. Result: leader and F1 are at LSN 110 (0 behind). <b>db-f2</b> is 3 entries / ~220 ms behind, <b>db-f3</b> 6 entries / 460 ms, <b>db-f4</b> (Mumbai, 190 ms away) 9 entries / 640 ms. Rule of thumb: alert when lag exceeds what your product can tolerate (e.g. 1 s for a feed, 0 for a balance), and stop routing reads to replicas above the threshold.</p>`, code: { lang: 'sql', db: 'repl', code: `SELECT name, applied_lsn, (SELECT MAX(lsn) FROM wal) - applied_lsn AS lsn_behind
FROM replicas
WHERE (SELECT MAX(lsn) FROM wal) - applied_lsn > 2   -- replicas too stale to serve reads
ORDER BY lsn_behind DESC;` } },
      { title: 'Which of Asha\'s writes would a stale replica hide?', html: `<p>Asha (user 7) last wrote at LSN 110. If her read lands on <b>db-f3</b> (applied 104), she will not see her own writes at LSN 106 and 110 — a textbook <b>read-your-writes</b> violation. The query lists exactly what is missing.</p>`, code: { lang: 'sql', db: 'repl', code: `SELECT w.lsn, w.op, w.detail
FROM wal AS w
WHERE w.user_id = 7
  AND w.lsn > (SELECT applied_lsn FROM replicas WHERE name = 'db-f3')
ORDER BY w.lsn;` } },
      { title: 'Why statement-based replication breaks', html: `<p>Suppose the leader runs <code>INSERT INTO coupons VALUES (random(), datetime('now'))</code> and ships the <i>statement</i>. Each follower re-runs it and gets a <span class="c-r">different random number and a different timestamp</span>, so copies silently diverge. Row-based (logical) replication ships the <i>resulting values</i> instead, which is why MySQL defaults to <code>binlog_format=ROW</code>. The snippet shows two "replays" of the same statement giving different values.</p>`, code: { lang: 'sql', code: `CREATE TABLE replay (run TEXT, value INTEGER);
INSERT INTO replay VALUES ('leader',   abs(random()) % 1000);
INSERT INTO replay VALUES ('follower', abs(random()) % 1000);  -- same statement, re-executed
SELECT run, value FROM replay;  -- almost always two different numbers` } },
      { title: 'Failover data loss: promote the wrong follower', html: `<p>The leader crashes at LSN 110. If the failover script promotes <b>db-f2</b> (applied 107), the committed writes 108-110 are gone: Mei's checkout, Ravi's review and Asha's comment. Clients were already told "success". This is the <b>RPO</b> (recovery point objective) cost of async replication. Patroni, Orchestrator and RDS all prefer the replica with the highest applied position, and a sync/semi-sync follower guarantees one exists with zero loss.</p>`, code: { lang: 'sql', db: 'repl', code: `-- writes that vanish if db-f2 becomes the new leader
SELECT lsn, user_id, op, detail
FROM wal
WHERE lsn > (SELECT applied_lsn FROM replicas WHERE name = 'db-f2');` } }
    ],
    deepDive: `<p><b>Where lag comes from.</b> (1) Network round trips, especially cross-region (Mumbai ↔ Virginia is ~190 ms). (2) <b>Apply speed</b>: the leader writes with many threads, but classic followers replayed the log with one thread. MySQL now uses parallel (writeset-based) apply; Postgres replay is still mostly single-process, so a write-heavy leader can outrun it. (3) <b>Long transactions and big DDL</b>: a 10-minute <code>ALTER TABLE</code> or a huge batch <code>UPDATE</code> must replay fully before anything after it. (4) <b>Replica conflicts</b>: a long report on a Postgres hot standby may pause replay (<code>max_standby_streaming_delay</code>) so its snapshot is not cleaned up underneath it.</p>
<p><b>Measuring correctly.</b> Postgres exposes <code>write_lag</code>, <code>flush_lag</code> and <code>replay_lag</code> in <code>pg_stat_replication</code>, and LSN arithmetic via <code>pg_wal_lsn_diff()</code>. MySQL's <code>Seconds_Behind_Source</code> is famous for lying (it compares timestamps of the event being applied, so it reads 0 when the IO thread itself is behind); heartbeat tables (pt-heartbeat) write a timestamp on the leader every second and compare on the follower.</p>
<p><b>Durability knobs.</b> Postgres <code>synchronous_commit</code> (off / local / remote_write / on / remote_apply) and <code>synchronous_standby_names = 'ANY 1 (f1, f2)'</code> give quorum commit. MySQL semi-sync with <code>AFTER_SYNC</code> ("lossless") waits for a replica to receive the event before the commit becomes visible. <code>remote_apply</code> even gives read-your-writes on that standby.</p>
<p><b>Cloud reality.</b> Amazon Aurora does not ship a WAL to full copies; it sends redo records to a storage layer with 6 copies across 3 availability zones and treats a write as durable at 4/6 (a quorum, see the next topic), with replicas typically lagging by tens of milliseconds because they share the storage. Failover managers (Patroni + etcd, Orchestrator, cloud Multi-AZ) solve "who is leader" with a consensus store and <b>fencing</b>: the old leader's lease expires or it is cut off so split brain cannot accept writes. Lastly, logical replication streams (Postgres logical decoding, MySQL row binlog) are the backbone of <b>CDC</b> pipelines that keep caches, search indexes and warehouses in sync — they inherit the same lag, so downstream systems are eventually consistent too.</p>`,
    aiEra: `<p><b>What AI changes:</b> assistants can now read <code>pg_stat_replication</code> output, Grafana lag graphs and slow-query logs and say "lag spikes line up with the nightly batch UPDATE — split it into chunks of 5 000 rows". Ops copilots in managed clouds already suggest adding replicas or switching to semi-sync. Many AI apps also read from replicas: a RAG pipeline that indexes rows via CDC can answer questions with <b>stale</b> data, so lag becomes an AI-quality issue, not just a DB issue.</p>
<p><b>Use AI as a partner:</b> ask <code>"Given this replica topology and these SLAs (RPO 0 for payments, 2 s staleness OK for feed), propose sync/async settings and a read-routing rule; list failure cases."</code> Then verify each failure case yourself.</p>
<p><b>Where AI goes wrong:</b> it often claims "read replicas are strongly consistent" or forgets that async failover can lose committed writes; it may suggest <code>synchronous_commit = off</code> to "fix latency" on a payments DB. <b>What you must own:</b> knowing which anomaly a product can tolerate, and designing routing (LSN tokens, sticky replicas) so users never see time go backwards.</p>`,
    problems: [{
      title: 'Read-Your-Writes Router',
      level: 'Medium', tags: ['replication', 'read-your-writes', 'window functions'], companies: ['Meta', 'LinkedIn', 'Shopify'],
      statement: `<p>Your app keeps, for each session, the <b>LSN of its last write</b> (<code>sessions.last_write_lsn</code>, NULL if the session never wrote). For every session return the replica its next read should go to so that the user <b>always sees their own writes</b>, while keeping load off the leader:</p>
<ul><li>A replica is <b>eligible</b> if <code>applied_lsn ≥ last_write_lsn</code> (any replica if NULL).</li>
<li>Prefer followers over the leader; among those prefer the lowest <code>rtt_ms</code>.</li></ul>
<p>Return <code>session_id, read_from, rtt_ms</code> ordered by session_id. Tables: <code>replicas</code>, <code>sessions</code> (db <code>repl</code>).</p>`,
      constraints: `Up to thousands of sessions and ≤ 20 replicas. The leader is always eligible (it has every write), so every session gets an answer.`,
      example: `<p>s-new last wrote LSN 107. db-f2 has applied 107 and is 3 ms away → ${H.c('g', 'db-f2')}. s-asha wrote LSN 110: db-f2 (107) is ${H.c('r', 'not eligible')}; db-f1 (110, 12 ms) beats the leader because followers are preferred → ${H.c('g', 'db-f1')}. s-guest never wrote → nearest follower ${H.c('g', 'db-f2')}.</p>`,
      brute: { why: `<p>Send <b>every</b> read to the leader. Always correct (leader has everything) but it throws away the whole point of replicas: the leader now carries 100% of reads and becomes the bottleneck and single point of failure.</p>`, code: { lang: 'sql', db: 'repl', code: `SELECT session_id, 'db-leader' AS read_from,
       (SELECT rtt_ms FROM replicas WHERE role = 'leader') AS rtt_ms
FROM sessions
ORDER BY session_id;` } },
      mcq: { q: 'A session last wrote at LSN 108. Which replicas can serve it without a read-your-writes violation?', options: ['Only the leader', 'Any replica with applied_lsn ≥ 108', 'Any replica with lag under 1 second', 'Any synchronous replica only'], answer: 1, explain: 'The LSN token is exact: a replica that has applied 108 or later contains that write. Time-based thresholds are only an approximation.' },
      hints: [
        `<p>Hint 1: Eligibility is a <b>join condition</b>: <code>r.applied_lsn &gt;= COALESCE(s.last_write_lsn, 0)</code>. COALESCE turns "never wrote" into "needs nothing".</p>`,
        `<p>Hint 2: Picking the best eligible replica per session is a <b>top-1-per-group</b> problem → <code>ROW_NUMBER() OVER (PARTITION BY session_id ORDER BY ...)</code>.</p>`,
        `<p>Hint 3: Sort key = <code>(role = 'leader')</code> first (false = 0 sorts before true = 1, so followers win), then <code>rtt_ms</code>. Keep rows with rn = 1.</p>`
      ],
      solution: {
        approach: `<p>Join sessions to the replicas that have applied at least the session's write LSN, rank them per session (followers first, then nearest), keep rank 1. In production this logic lives in the app or a proxy (ProxySQL, pgcat, Vitess vtgate); the LSN comes from <code>pg_current_wal_lsn()</code> after the write and the replica position from <code>pg_last_wal_replay_lsn()</code>.</p>`,
        code: { lang: 'sql', db: 'repl', code: `WITH eligible AS (
  SELECT s.session_id,
         r.name   AS read_from,
         r.rtt_ms,
         ROW_NUMBER() OVER (
           PARTITION BY s.session_id
           ORDER BY (r.role = 'leader'),   -- 0 for followers, 1 for leader → followers first
                    r.rtt_ms               -- then the nearest one
         ) AS rn
  FROM sessions AS s
  JOIN replicas AS r
    ON r.applied_lsn >= COALESCE(s.last_write_lsn, 0)   -- has this session's latest write
)
SELECT session_id, read_from, rtt_ms
FROM eligible
WHERE rn = 1
ORDER BY session_id;` },
        complexity: `<p>O(S × R) join plus a sort per session — trivial for ≤ 20 replicas. In a real router it is an O(R) scan per request over an in-memory replica-position table refreshed every ~100 ms.</p>`,
        followUps: ['Add bounded staleness: guests may read from replicas at most 5 LSNs behind.', 'How do you carry the LSN token across devices (phone + laptop)?', 'What if the eligible follower dies mid-request?']
      }
    }]
  });

  /* =====================================================================
     TOPIC 2 — Multi-leader & leaderless replication, quorums
     ===================================================================== */
  topics.push({
    title: 'Multi-Leader & Leaderless Replication: Conflicts and Quorums (R + W > N)',
    analogy: `<p><b>Multi-leader</b> is a family shopping list on three phones that each work offline. Mum adds "milk", Dad deletes "milk" on his phone in a tunnel; when both reconnect, the phones must <b>merge</b> — and somebody's change may lose.</p>
<p><b>Leaderless with quorums</b> is like 5 referees keeping score. When a goal happens you only wait until <b>3</b> referees have written it down (W = 3). To learn the score you ask any <b>3</b> referees (R = 3) and trust the newest answer. Since 3 + 3 &gt; 5, at least one referee you ask <i>must</i> have seen the goal.</p>`,
    explain: `<p><b>Multi-leader (multi-master) replication</b>: several nodes accept writes, each forwards its changes to the others. Why? (1) <b>Multi-datacenter</b>: users in Europe write to the EU leader with low latency and the DC can survive a cross-ocean outage. (2) <b>Offline clients</b>: every phone/laptop with a local DB is a "leader" (calendar apps, notes, CouchDB/PouchDB sync). (3) <b>Collaborative editing</b> (Google Docs, Figma) is the extreme version.</p>
<p>The price is <b>write conflicts</b>: the same record changed in two places before they heard about each other. Ways to handle them:</p>
${H.table(['Strategy', 'How', 'Catch'], [
  ['<b>Avoid</b>', 'give every record a "home" leader (all writes for user 42 go to EU)', 'breaks when the home DC fails and you re-route'],
  ['<b>Last-write-wins (LWW)</b>', 'keep the value with the biggest timestamp', '<span class="c-r">silently drops</span> the other write; clock skew picks the "wrong" winner'],
  ['<b>Merge / CRDT</b>', 'data types that merge automatically (counters, sets, text CRDTs like Yjs/Automerge)', 'only for data with a sensible merge'],
  ['<b>Keep siblings</b>', 'store both versions, let the app or user resolve (Riak, CouchDB)', 'pushes complexity to the application']
])}
<p><b>Leaderless replication</b> (Amazon's Dynamo paper → Cassandra, ScyllaDB, Riak): no leader at all. The client (or a coordinator node) sends each write to all <b>N</b> replicas of the key and calls it successful after <b>W</b> acknowledge. A read asks replicas and waits for <b>R</b> answers, then returns the newest version (by version number or timestamp).</p>
<p><b>The quorum rule:</b> if <b>R + W &gt; N</b>, the set of nodes you read from and the set that took the latest write <b>must overlap</b> in at least one node, so the read sees the latest successful write. Common setting: N = 3, W = 2, R = 2. You can tune: W = N, R = 1 for read-heavy data (but one dead node blocks writes); W = 1, R = N for write-heavy logs.</p>
${H.table(['N, W, R', 'R + W &gt; N?', 'writes survive', 'reads survive'], [
  ['3, 2, 2', H.c('g', 'yes (4 &gt; 3)'), '1 node down', '1 node down'],
  ['3, 1, 1', H.c('r', 'no (2 ≤ 3)'), '2 down', '2 down — but reads may be stale'],
  ['5, 3, 3', H.c('g', 'yes (6 &gt; 5)'), '2 down', '2 down'],
  ['3, 3, 1', H.c('g', 'yes (4 &gt; 3)'), '0 down!', '2 down']
])}
<p>Replicas that missed a write are fixed by three mechanisms: <b>read repair</b> (the coordinator notices a stale answer during a read and writes the newer value back), <b>anti-entropy</b> (a background job compares replicas using <b>Merkle trees</b> — hash trees that let two nodes find which key ranges differ without sending all data), and <b>hinted handoff</b> (a neighbour keeps a "hint" for a down node and delivers it when the node returns).</p>
<p>In Cassandra you pick the quorum per query with a <b>consistency level</b>: <code>ONE</code>, <code>QUORUM</code> (majority of N), <code>LOCAL_QUORUM</code> (majority within this datacenter), <code>ALL</code>. QUORUM writes + QUORUM reads give R + W &gt; N.</p>`,
    clues: [
      '"tunable consistency" / "consistency level QUORUM" → leaderless quorum (Cassandra/Dynamo style)',
      '"N = 3, how many acks for strong reads?" → R + W > N, e.g. W = 2, R = 2',
      '"users write in two regions with low latency" → multi-leader, then ask how conflicts are resolved',
      '"works offline and syncs later" → multi-leader with merge/CRDT',
      '"last write wins lost my update" → LWW + clock skew; use version vectors or CRDTs',
      '"always writable even during node failures" → leaderless, sloppy quorum, hinted handoff'
    ],
    code: [
      { lang: 'sql', db: 'repl', title: 'Resolve a quorum read and find replicas to repair (runnable)', code: `-- read_resp lists which R = 3 nodes answered each read; kv_replicas holds each node's copy.
WITH answers AS (
  SELECT q.read_id, q.k, q.node, kv.v, kv.ver,
         MAX(kv.ver) OVER (PARTITION BY q.read_id) AS newest_ver
  FROM read_resp AS q
  JOIN kv_replicas AS kv ON kv.node = q.node AND kv.k = q.k
)
SELECT read_id, k, node, v, ver,
       CASE WHEN ver = newest_ver THEN 'winner/up to date'
            ELSE 'STALE -> read repair to ver ' || newest_ver END AS action
FROM answers
ORDER BY read_id, ver DESC, node;` },
      { lang: 'python', run: true, title: 'Version vectors: detect concurrent writes instead of guessing (runnable)', code: `# A version vector maps replica -> how many writes from that replica this value includes.
# v1 "happened before" v2 if every counter in v1 <= v2 (and they differ).
# If neither dominates, the writes were CONCURRENT -> a real conflict to merge.

def compare(a, b):
    keys = set(a) | set(b)
    a_le_b = all(a.get(k, 0) <= b.get(k, 0) for k in keys)
    b_le_a = all(b.get(k, 0) <= a.get(k, 0) for k in keys)
    if a_le_b and b_le_a:
        return "equal"
    if a_le_b:
        return "a happened before b (b wins, no conflict)"
    if b_le_a:
        return "b happened before a (a wins, no conflict)"
    return "CONCURRENT -> keep both siblings or merge"


us = {"us": 3, "eu": 1}        # edited in US after seeing 1 EU write
eu = {"us": 2, "eu": 2}        # edited in EU after seeing only 2 US writes
later = {"us": 3, "eu": 2}     # a merge that saw both

print(compare(us, eu))
print(compare(us, later))
print(compare(later, later))


def merge(a, b):
    """Pointwise max: the vector of a value that has seen both histories."""
    return {k: max(a.get(k, 0), b.get(k, 0)) for k in set(a) | set(b)}


print("merged vector:", dict(sorted(merge(us, eu).items())))
` }
    ],
    codeTitle: ['Quorum read resolution', 'Version vectors'],
    viz: [{
      title: 'Quorum write + quorum read: does R + W > N guarantee a fresh read?',
      input: 'N=5 W=3 R=3 down=1',
      inputLabel: 'N (2-7) replicas, W write acks, R read answers, down = nodes offline during the write',
      gen: function (input) {
        var s = String(input || '');
        function grab(name, def) { var m = new RegExp(name + '\\s*=\\s*(\\d+)', 'i').exec(s); return m ? parseInt(m[1], 10) : def; }
        var N = grab('N', 3), W = grab('W', 2), R = grab('R', 2), down = grab('down', 0);
        if (N < 2 || N > 7) throw new Error('N must be 2..7  e.g. N=5 W=3 R=3 down=1');
        if (W < 1 || W > N || R < 1 || R > N) throw new Error('W and R must be between 1 and N');
        if (down < 0 || down >= N) throw new Error('down must be 0..N-1');
        var ids = [], i, frames = [];
        for (i = 0; i < N; i++) ids.push('n' + (i + 1));
        var ver = {}; ids.forEach(function (id) { ver[id] = 1; });
        function nodes() {
          var arr = [{ id: 'C', label: 'Client', x: 6, y: 32, shape: 'box' }, { id: 'K', label: 'Coordinator', x: 34, y: 32, shape: 'box' }];
          ids.forEach(function (id, j) { arr.push({ id: id, label: id, x: 82, y: N === 1 ? 32 : 4 + j * (56 / (N - 1)), shape: 'box' }); });
          return arr;
        }
        var edges = [['C', 'K']].concat(ids.map(function (id) { return ['K', id]; }));
        function tags() { var t = {}; ids.forEach(function (id, j) { t[id] = (j >= N - down && phase === 'write') ? 'DOWN' : 'v' + ver[id]; }); return t; }
        var phase = 'setup';
        frames.push({ narr: 'Setup: every key is stored on <b>N = ' + N + '</b> replicas, all holding <b>v1</b>. A write must be acknowledged by <b>W = ' + W + '</b> nodes; a read waits for <b>R = ' + R + '</b> answers. R + W = ' + (R + W) + (R + W > N ? ' &gt; ' : ' ≤ ') + N + '.', parts: [
          { type: 'graph', directed: true, height: 64, nodes: nodes(), edges: edges, tags: tags() },
          { type: 'vars', label: 'Quorum settings', vals: { N: N, W: W, R: R, 'R+W': R + W, 'overlap guaranteed?': R + W > N ? 'yes' : 'NO' }, hl: { 'overlap guaranteed?': R + W > N ? 'ok' : 'bad' } }
        ] });
        phase = 'write';
        var live = ids.slice(0, N - down), acked = [];
        var downHl = {}; ids.slice(N - down).forEach(function (id) { downHl[id] = 'done'; });
        frames.push({ narr: 'Client writes <b>v2</b>. The coordinator sends it to all ' + N + ' replicas. ' + (down ? '<b>' + down + '</b> node(s) are offline and never answer.' : 'All nodes are up.') + ' Worst case for the read later: only the first W live nodes manage to store it in time.', parts: [
          { type: 'graph', directed: true, height: 64, nodes: nodes(), edges: edges, hl: Object.assign({ K: 'cur' }, downHl), ehl: { 'C-K': 'cur' }, tags: tags() }
        ] });
        if (live.length < W) {
          frames.push({ narr: '<span class="c-r">Write FAILS:</span> only ' + live.length + ' replicas are alive but W = ' + W + ' acks are needed. Higher W = stronger durability but <b>lower write availability</b> (writes survive at most N − W = ' + (N - W) + ' failures).', parts: [
            { type: 'graph', directed: true, height: 64, nodes: nodes(), edges: edges, hl: Object.assign({ K: 'bad' }, downHl), ehl: { 'C-K': 'bad' }, tags: tags() },
            { type: 'vars', label: 'Result', vals: { live: live.length, needed_W: W, write: 'rejected' }, hl: { write: 'bad' } }
          ] });
          frames.push({ narr: 'Try lowering W, or use a <b>sloppy quorum</b> (Dynamo/Riak): accept the write on stand-in nodes and hand it off later (hinted handoff). That keeps writes available but breaks the R + W &gt; N guarantee until handoff finishes.', parts: [
            { type: 'text', html: 'Writes tolerate <b>N − W</b> failures, reads tolerate <b>N − R</b> failures. With N = ' + N + ': W = ' + W + ' tolerates ' + (N - W) + ', R = ' + R + ' tolerates ' + (N - R) + '.' }
          ] });
          return frames;
        }
        for (i = 0; i < W; i++) {
          var id = live[i]; ver[id] = 2; acked.push(id);
          var hl = Object.assign({ K: 'cur' }, downHl), eh = {};
          acked.forEach(function (a) { hl[a] = 'ok'; eh['K-' + a] = 'ok'; });
          frames.push({ narr: 'Ack ' + (i + 1) + ' of ' + W + ' from <b>' + id + '</b> (now holds v2).' + (i + 1 === W ? ' <span class="c-g">W reached → the write is reported successful.</span> The other replicas still have v1 (they will catch up via read repair / anti-entropy).' : ''), parts: [
            { type: 'graph', directed: true, height: 64, nodes: nodes(), edges: edges, hl: hl, ehl: eh, tags: tags() },
            { type: 'set', label: 'Write set (have v2)', items: acked.slice(), hl: (function () { var o = {}; o[id] = 'ok'; return o; })() }
          ] });
        }
        phase = 'read';
        var readSet = ids.slice(N - R);   // worst case: the R nodes least likely to have the write
        var overlap = readSet.filter(function (x) { return acked.indexOf(x) >= 0; });
        var hl2 = {}, eh2 = {};
        readSet.forEach(function (x) { hl2[x] = overlap.indexOf(x) >= 0 ? 'sel' : 'win'; eh2['K-' + x] = 'cur'; });
        frames.push({ narr: 'Now a read. The down nodes are back (still on v1). Worst case, the coordinator hears from the <b>last R = ' + R + '</b> nodes: ' + readSet.join(', ') + '. Overlap with the write set: <b>' + (overlap.length ? overlap.join(', ') : 'none') + '</b>.', parts: [
          { type: 'graph', directed: true, height: 64, nodes: nodes(), edges: edges, hl: hl2, ehl: eh2, tags: tags() },
          { type: 'set', label: 'Write set', items: acked.slice() },
          { type: 'set', label: 'Read set', items: readSet.slice(), hl: (function () { var o = {}; overlap.forEach(function (x) { o[x] = 'sel'; }); return o; })() }
        ] });
        var best = 0; readSet.forEach(function (x) { if (ver[x] > best) best = ver[x]; });
        var fresh = best === 2;
        frames.push({ narr: fresh
          ? '<span class="c-g">Fresh read:</span> answers were ' + readSet.map(function (x) { return x + '=v' + ver[x]; }).join(', ') + '. The coordinator returns the highest version, <b>v2</b>. Because R + W &gt; N, at least one node in any read set must be in the write set (pigeonhole principle).'
          : '<span class="c-r">STALE read:</span> every answering node still has v1, so the client gets <b>v1</b> even though the v2 write "succeeded". R + W = ' + (R + W) + ' ≤ N = ' + N + ', so the read set and write set can miss each other.', parts: [
          { type: 'graph', directed: true, height: 64, nodes: nodes(), edges: edges, hl: Object.assign({}, hl2, { C: fresh ? 'ok' : 'bad' }), ehl: { 'C-K': fresh ? 'ok' : 'bad' }, tags: tags() },
          { type: 'table', label: 'Read answers', columns: ['node', 'version', 'in write set?'], rows: readSet.map(function (x) { return [x, 'v' + ver[x], acked.indexOf(x) >= 0 ? 'yes' : 'no']; }),
            hl: (function () { var o = {}; readSet.forEach(function (x, j) { o[j] = ver[x] === 2 ? 'ok' : (fresh ? 'cur' : 'bad'); }); return o; })() }
        ] });
        var repaired = fresh ? readSet.filter(function (x) { return ver[x] === 1; }) : [];
        repaired.forEach(function (x) { ver[x] = 2; });
        frames.push({ narr: fresh
          ? (repaired.length ? '<b>Read repair:</b> the coordinator noticed ' + repaired.join(', ') + ' answered v1 and writes v2 back to them. Nodes nobody read are fixed later by anti-entropy (Merkle-tree comparison).' : 'Every node in the read set already had v2 — nothing to repair.')
          : 'No repair possible: the coordinator never saw v2. Only background anti-entropy will spread it. Fix: raise R or W so that R + W &gt; N.', parts: [
          { type: 'graph', directed: true, height: 64, nodes: nodes(), edges: edges, hl: (function () { var o = {}; repaired.forEach(function (x) { o[x] = 'ok'; }); return o; })(), tags: tags() }
        ] });
        var rows = [[3, 2, 2], [3, 1, 1], [3, 3, 1], [5, 3, 3], [5, 1, 5], [N, W, R]];
        frames.push({ narr: 'Cheat sheet. Your setting is the last row. Writes tolerate <b>N − W</b> failed nodes, reads <b>N − R</b>. Even with R + W &gt; N, edge cases (sloppy quorums, a write that failed on some nodes but was not rolled back, clock-based LWW) mean quorums are <i>not</i> automatically linearizable.', parts: [
          { type: 'table', label: 'Quorum configurations', columns: ['N', 'W', 'R', 'R+W>N', 'write tolerates', 'read tolerates'],
            rows: rows.map(function (r) { return [r[0], r[1], r[2], r[1] + r[2] > r[0] ? 'yes' : 'no', (r[0] - r[1]) + ' down', (r[0] - r[2]) + ' down']; }),
            hl: (function () { var o = { 5: 'sel' }; rows.forEach(function (r, j) { if (j < 5 && r[1] + r[2] <= r[0]) o[j] = 'bad'; }); return o; })() }
        ] });
        return frames;
      }
    }, {
      title: 'Multi-leader conflict: last-write-wins vs version vectors',
      gen: function () {
        var nodes = [
          { id: 'A', label: 'Asha (US)', x: 8, y: 12, shape: 'box' }, { id: 'US', label: 'Leader US', x: 40, y: 12, shape: 'box' },
          { id: 'B', label: 'Ben (EU)', x: 8, y: 48, shape: 'box' }, { id: 'EU', label: 'Leader EU', x: 40, y: 48, shape: 'box' },
          { id: 'X', label: 'After sync', x: 84, y: 30, shape: 'box' }
        ];
        var edges = [['A', 'US', 'title=B'], ['B', 'EU', 'title=C'], ['US', 'EU', 'async'], ['EU', 'US', 'async'], ['US', 'X'], ['EU', 'X']];
        return [
          { narr: 'A wiki page has <b>title = "A"</b> in both datacenters. Each DC has its own leader so local writes are fast.', parts: [
            { type: 'graph', directed: true, height: 60, nodes: nodes, edges: edges, tags: { US: 'title=A', EU: 'title=A' } },
            { type: 'table', label: 'Versions', columns: ['DC', 'title', 'wall clock ts', 'version vector'], rows: [['US', 'A', '10:00:00.000', '{us:1, eu:0}'], ['EU', 'A', '10:00:00.000', '{us:1, eu:0}']] }
          ] },
          { narr: 'At the same moment Asha sets the title to <b>"B"</b> in the US and Ben sets it to <b>"C"</b> in Europe. Each leader accepts its local write immediately. The EU server clock runs <b>5 ms slow</b>.', parts: [
            { type: 'graph', directed: true, height: 60, nodes: nodes, edges: edges, hl: { US: 'cur', EU: 'cur' }, ehl: { 'A-US': 'ok', 'B-EU': 'ok' }, tags: { US: 'title=B', EU: 'title=C' } },
            { type: 'table', label: 'Versions', columns: ['DC', 'title', 'wall clock ts', 'version vector'], rows: [['US', 'B', '10:00:00.010', '{us:2, eu:0}'], ['EU', 'C', '10:00:00.008 (clock 5 ms slow, really .013)', '{us:1, eu:1}']], hl: { 0: 'cur', 1: 'cur' } }
          ] },
          { narr: 'Replication crosses the ocean. Each leader now holds <b>two different values</b> for one row → a <b>write conflict</b>. Something must pick or merge.', parts: [
            { type: 'graph', directed: true, height: 60, nodes: nodes, edges: edges, hl: { US: 'bad', EU: 'bad' }, ehl: { 'US-EU': 'cur', 'EU-US': 'cur' }, tags: { US: 'B vs C?', EU: 'C vs B?' } }
          ] },
          { narr: '<b>Last-write-wins</b> keeps the bigger timestamp: .010 &gt; .008 → <b>"B"</b> wins everywhere. But Ben actually wrote <i>later</i> (real time .013). His edit is <span class="c-r">silently thrown away</span> and nobody is told. Cassandra uses LWW per cell, so this is real.', parts: [
            { type: 'graph', directed: true, height: 60, nodes: nodes, edges: edges, hl: { X: 'bad', B: 'bad' }, ehl: { 'US-X': 'ok', 'EU-X': 'bad' }, tags: { X: 'title=B', B: 'edit lost' } },
            { type: 'table', label: 'LWW decision', columns: ['candidate', 'timestamp', 'result'], rows: [['B (US)', '.010', 'kept'], ['C (EU)', '.008', 'DROPPED']], hl: { 0: 'ok', 1: 'bad' } }
          ] },
          { narr: '<b>Version vectors</b> compare causality instead of clocks: {us:2, eu:0} vs {us:1, eu:1} — neither is ≥ the other in every slot, so the writes are <b>concurrent</b>. The DB keeps both as <b>siblings</b> and the app (or user) resolves: e.g. show "B / C — pick one".', parts: [
            { type: 'graph', directed: true, height: 60, nodes: nodes, edges: edges, hl: { X: 'sel' }, ehl: { 'US-X': 'ok', 'EU-X': 'ok' }, tags: { X: 'siblings: B | C' } },
            { type: 'table', label: 'Causality check', columns: ['vector', 'us', 'eu', 'verdict'], rows: [['US write', 2, 0, ''], ['EU write', 1, 1, ''], ['compare', 'US bigger', 'EU bigger', 'CONCURRENT → conflict']], hl: { 2: 'sel' } }
          ] },
          { narr: 'Best option when the data allows it: a <b>CRDT</b> (conflict-free replicated data type). A like-counter is a G-Counter (each DC counts its own likes, total = sum), a tag list is an OR-Set, text uses sequence CRDTs (Yjs, Automerge). Merges are automatic and never lose an update.', parts: [
            { type: 'table', label: 'Pick a resolution strategy', columns: ['data', 'strategy'], rows: [['page title, profile field', 'siblings / ask the user, or home-region routing'], ['like counter', 'G-Counter CRDT (sum per-DC counters)'], ['shopping cart', 'OR-Set CRDT (add wins)'], ['bank balance', 'do NOT multi-leader: single leader / consensus']], hl: { 3: 'bad' } }
          ] }
        ];
      }
    }],
    examples: [
      { title: 'Quorum math for N = 3', html: `<p>N = 3, W = 2, R = 2 → R + W = 4 &gt; 3. Write set {n1, n2}; whichever 2 nodes you read, at least one is n1 or n2 (only n3 is "outside", and you need 2). Tolerates 1 dead node for both reads and writes. Drop to W = 1, R = 1 and you get speed but reads can miss the write entirely.</p>` },
      { title: 'Resolve read 1 on cart:9', html: `<p>Nodes C, D, E answered: C = qty=1 (v2), D = qty=2 (v3), E = empty (v1). Highest version wins → <b>qty=2</b>. C and E are stale and get a read-repair write of v3. Run the topic's reference query to see both reads resolved.</p>`, code: { lang: 'sql', db: 'repl', code: `SELECT kv.v AS answer, kv.ver
FROM read_resp AS q JOIN kv_replicas AS kv ON kv.node = q.node AND kv.k = q.k
WHERE q.read_id = 1
ORDER BY kv.ver DESC
LIMIT 1;   -- newest version among the R answers` } },
      { title: 'All strong (W, R) pairs for N = 5', html: `<p>Generate every W and R from 1 to 5 and keep the pairs with R + W &gt; N. You will see the trade-off directly: (5, 1) is fast to read but a single dead node blocks writes; (3, 3) balances both (each tolerates 2 failures).</p>`, code: { lang: 'sql', code: `WITH RECURSIVE k(x) AS (SELECT 1 UNION ALL SELECT x + 1 FROM k WHERE x < 5)
SELECT w.x AS W, r.x AS R,
       5 - w.x AS write_failures_tolerated,
       5 - r.x AS read_failures_tolerated
FROM k AS w CROSS JOIN k AS r
WHERE w.x + r.x > 5
ORDER BY MIN(5 - w.x, 5 - r.x) DESC, W;` } },
      { title: 'Cassandra consistency levels in practice', html: `<p>With replication factor 3 per DC, <code>LOCAL_QUORUM</code> = 2 of the 3 local replicas. Writing and reading at LOCAL_QUORUM gives strong reads <i>within</i> a datacenter without paying a cross-ocean round trip; use <code>EACH_QUORUM</code> or <code>QUORUM</code> across DCs only when you truly need global freshness.</p>`, code: { lang: 'text', check: false, code: `-- cqlsh
CREATE KEYSPACE shop WITH replication =
  {'class': 'NetworkTopologyStrategy', 'us_east': 3, 'eu_west': 3};

CONSISTENCY LOCAL_QUORUM;          -- 2 of 3 replicas in this DC
INSERT INTO shop.carts (user_id, sku, qty) VALUES (9, 'PEN-1', 2);
SELECT qty FROM shop.carts WHERE user_id = 9 AND sku = 'PEN-1';` } }
    ],
    deepDive: `<p><b>Why R + W &gt; N is not the whole story.</b> The overlap argument assumes the write set is a fixed group of N "home" replicas. Dynamo/Riak <b>sloppy quorums</b> let writes land on any W reachable nodes when home nodes are down (for availability), so a later quorum read on the home nodes can miss them until <b>hinted handoff</b> delivers. A write that reached only 1 of 2 required nodes reports failure but is <b>not rolled back</b>, so later reads may or may not see it. A read concurrent with a write can return the new value from one quorum and the old from the next. And with <b>LWW timestamps</b>, clock skew decides the winner. Getting true <b>linearizability</b> requires extra work: synchronous read repair before returning, and for compare-and-set you need consensus — Cassandra's lightweight transactions (<code>IF NOT EXISTS</code>) run Paxos, and Cassandra 5's Accord protocol brings general ACID transactions.</p>
<p><b>Repair machinery.</b> Anti-entropy compares <b>Merkle trees</b>: each leaf hashes a key range, parents hash children; two replicas exchange root hashes, recurse only into differing subtrees, and stream just those ranges. Cassandra runs this as <code>nodetool repair</code> (or incremental repair); you must run it at least every <code>gc_grace_seconds</code> (default 10 days) or deleted data can come back from the dead because a replica missed the <b>tombstone</b>.</p>
<p><b>Multi-leader in the wild.</b> MySQL Group Replication multi-primary mode certifies conflicting writesets and aborts losers; Postgres has BDR/pgEdge/pgactive-style logical multi-master with conflict handlers; CouchDB keeps revision trees with deterministic winners plus conflict lists; DynamoDB Global Tables are multi-region multi-leader with LWW by default (and a newer multi-region strong consistency mode). Topologies matter: circular and star topologies can loop changes forever unless each change carries the IDs of nodes it has visited, and causally dependent writes can arrive out of order on all-to-all links — version vectors fix that.</p>
<p><b>Note:</b> the DynamoDB <i>service</i> is not leaderless — each partition has a Paxos-elected leader — even though it is named after the leaderless Dynamo paper. Interviewers like this nuance.</p>`,
    aiEra: `<p><b>What AI changes:</b> local-first and agentic apps are multi-leader by nature — an AI agent on a laptop editing a doc offline while a teammate edits online is exactly the conflict problem. CRDT libraries (Yjs, Automerge) now power AI co-editing, and LLMs are sometimes used to <i>propose</i> semantic merges of conflicting text siblings, with a human approving.</p>
<p><b>Use AI as a partner:</b> <code>"Simulate N=3, W=2, R=1 under one node failure and one concurrent write; list every possible read result."</code> Asking for enumerations of interleavings is where AI saves you time.</p>
<p><b>Where AI goes wrong:</b> it repeats "R + W &gt; N means strong consistency" without the sloppy-quorum and failed-write caveats, calls DynamoDB "leaderless", and suggests LWW for counters (which loses increments). <b>What you must own:</b> choosing which data may be merged automatically, which must be single-leader, and proving the overlap argument on a whiteboard.</p>`,
    problems: [{
      title: 'Quorum Read Resolution with Read Repair',
      level: 'Medium', tags: ['quorum', 'leaderless', 'window functions'], companies: ['Apple', 'Netflix', 'Uber'],
      statement: `<p>A leaderless store keeps N = 5 copies of each key in <code>kv_replicas(node, k, v, ver)</code>. Each quorum read records the R nodes that answered in <code>read_resp(read_id, node, k)</code>. For every read, return the value the client should get (highest <code>ver</code> among the answers) and the list of answering nodes that need <b>read repair</b> (their ver is lower). Output: <code>read_id, k, answer, ver, repair_nodes</code> (comma-separated, NULL if none).</p>`,
      constraints: `R answers per read (R ≤ N ≤ 7). Versions are integers; assume the highest version is unique per key (no concurrent siblings).`,
      example: `<p>Read 1 on cart:9 heard C (v2), D (v3), E (v1) → answer ${H.c('g', 'qty=2 (v3)')}, repair ${H.c('r', 'C,E')}. Read 2 on theme:7 heard B (v4), C (v4), E (v5) → answer ${H.c('g', 'dark (v5)')}, repair ${H.c('r', 'B,C')}.</p>`,
      brute: { why: `<p>Return the <b>first</b> answer that arrives (like R = 1). Fast, but read 1 could return C's stale "qty=1" even though a quorum holds v3, and nothing gets repaired, so stale replicas stay stale.</p>`, code: { lang: 'sql', db: 'repl', code: `SELECT q.read_id, q.k, kv.v AS answer, kv.ver
FROM read_resp AS q
JOIN kv_replicas AS kv ON kv.node = q.node AND kv.k = q.k
GROUP BY q.read_id          -- SQLite picks an arbitrary row per group: "first answer wins"
ORDER BY q.read_id;` } },
      mcq: { q: 'N = 5, W = 3. What is the smallest R that guarantees each read overlaps the latest successful write?', options: ['1', '2', '3', '5'], answer: 2, explain: 'Need R + W > N → R + 3 > 5 → R ≥ 3.' },
      hints: [
        `<p>Hint 1: Join each answer to its stored copy, then you need "max version per read" next to every row → <code>MAX(ver) OVER (PARTITION BY read_id)</code>.</p>`,
        `<p>Hint 2: The answer row is the one with <code>ver = newest</code>; the repair list is <code>GROUP_CONCAT(node)</code> over rows with <code>ver &lt; newest</code>.</p>`,
        `<p>Hint 3: Aggregate per read with conditional expressions: <code>MAX(CASE WHEN ver = newest THEN v END)</code> for the answer, and <code>GROUP_CONCAT(CASE WHEN ver &lt; newest THEN node END)</code> (NULLs are skipped) for repairs.</p>`
      ],
      solution: {
        approach: `<p>Window max gives every answer the newest version of its read; one GROUP BY then picks the winning value and collects the lagging nodes. In Cassandra, the coordinator does exactly this in memory (using cell timestamps instead of integer versions) and, for reads at QUORUM, performs blocking read repair on the mismatched replicas before replying.</p>`,
        code: { lang: 'sql', db: 'repl', code: `WITH answers AS (
  SELECT q.read_id, q.k, q.node, kv.v, kv.ver,
         MAX(kv.ver) OVER (PARTITION BY q.read_id) AS newest
  FROM read_resp AS q
  JOIN kv_replicas AS kv ON kv.node = q.node AND kv.k = q.k
)
SELECT read_id,
       k,
       MAX(CASE WHEN ver = newest THEN v END)             AS answer,
       MAX(newest)                                        AS ver,
       GROUP_CONCAT(CASE WHEN ver < newest THEN node END) AS repair_nodes
FROM answers
GROUP BY read_id, k
ORDER BY read_id;` },
        complexity: `<p>O(total answers) with a sort per read; per real read it is O(R) work in the coordinator.</p>`,
        followUps: ['What if two answers have the same version but different values (concurrent siblings)?', 'Should read repair be synchronous or asynchronous? Trade-offs?', 'How do tombstones (deletes) interact with read repair?']
      }
    }]
  });
  registerModule({ id: 'sql14', title: 'Distributed Databases & NoSQL', intro: `<p>tmp</p>`, goals: [], prereqs: `tmp`, hours: 12,
    databases: { repl: DB_REPL, shard: DB_SHARD, nosql: DB_NOSQL, bank: DB_BANK },
    topics: topics, practice: practice, quiz: quiz, interview: interview });
})();
