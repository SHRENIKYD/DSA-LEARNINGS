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
      input: '3 | W 10, R, W 20, R, R, W 30, R, R, W 40',
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
        frames.push({ narr: 'Failover preview: if the leader crashed right now, promoting <b>F1</b> (sync) loses nothing' + (log.length - f2lsn ? ', but promoting <b>F2</b> would <span class="c-r">lose ' + (log.length - f2lsn) + ' committed write(s)</span>' : ', and F2 happens to be caught up too (with async replication that is luck, not a guarantee)') + '. That is why failover tools pick the most up-to-date replica.', parts: [
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
      tests: { engine: 'sqlite', check: '(rows, cols, c) => {\n  if (c.plan || c.noplan) { const d = rows.map(r => r[r.length - 1]).join(\'\\n\'); return (!c.plan || new RegExp(c.plan).test(d)) && (!c.noplan || !new RegExp(c.noplan).test(d)); }\n  let a = rows, b = c.rows || [];\n  if (c.set) { const k = r => JSON.stringify(r); a = a.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); b = b.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); }\n  return a.length === b.length && a.every((r, i) => r.length === b[i].length && r.every((v, j) => v === b[i][j] || (typeof v === \'number\' && typeof b[i][j] === \'number\' && Math.abs(v - b[i][j]) < 1e-6)));\n}', cases: [
        { setup: '', rows: [
            ['s-asha', 'db-f1', 12],
            ['s-guest', 'db-f2', 3],
            ['s-mei', 'db-f1', 12],
            ['s-new', 'db-f2', 3],
            ['s-ravi', 'db-f1', 12]
          ] },
        { setup: 'UPDATE sessions SET last_write_lsn = NULL WHERE session_id = \'s-asha\'', rows: [
            ['s-asha', 'db-f2', 3],
            ['s-guest', 'db-f2', 3],
            ['s-mei', 'db-f1', 12],
            ['s-new', 'db-f2', 3],
            ['s-ravi', 'db-f1', 12]
          ] },
        { setup: 'UPDATE replicas SET applied_lsn = 110 WHERE name = \'db-f2\'', rows: [
            ['s-asha', 'db-f2', 3],
            ['s-guest', 'db-f2', 3],
            ['s-mei', 'db-f2', 3],
            ['s-new', 'db-f2', 3],
            ['s-ravi', 'db-f2', 3]
          ] },
        { setup: 'UPDATE replicas SET applied_lsn = 109 WHERE name = \'db-f1\'', rows: [
            ['s-asha', 'db-leader', 2],
            ['s-guest', 'db-f2', 3],
            ['s-mei', 'db-f1', 12],
            ['s-new', 'db-f2', 3],
            ['s-ravi', 'db-f1', 12]
          ] },
        { setup: 'UPDATE replicas SET applied_lsn = 109 WHERE name = \'db-f1\'; UPDATE replicas SET applied_lsn = 109 WHERE name = \'db-f2\'; UPDATE replicas SET applied_lsn = 109 WHERE name = \'db-f3\'; UPDATE replicas SET applied_lsn = 109 WHERE name = \'db-f4\'', rows: [
            ['s-asha', 'db-leader', 2],
            ['s-guest', 'db-f2', 3],
            ['s-mei', 'db-f2', 3],
            ['s-new', 'db-f2', 3],
            ['s-ravi', 'db-f2', 3]
          ] },
        { setup: 'DELETE FROM replicas WHERE name = \'db-f1\'; DELETE FROM replicas WHERE name = \'db-f2\'; DELETE FROM replicas WHERE name = \'db-f3\'; DELETE FROM replicas WHERE name = \'db-f4\'', rows: [
            ['s-asha', 'db-leader', 2],
            ['s-guest', 'db-leader', 2],
            ['s-mei', 'db-leader', 2],
            ['s-new', 'db-leader', 2],
            ['s-ravi', 'db-leader', 2]
          ] },
        { setup: 'UPDATE sessions SET last_write_lsn = 104 WHERE session_id = \'s-mei\'', rows: [
            ['s-asha', 'db-f1', 12],
            ['s-guest', 'db-f2', 3],
            ['s-mei', 'db-f2', 3],
            ['s-new', 'db-f2', 3],
            ['s-ravi', 'db-f1', 12]
          ] },
        { setup: 'UPDATE sessions SET last_write_lsn = 101 WHERE session_id = \'s-ravi\'', rows: [
            ['s-asha', 'db-f1', 12],
            ['s-guest', 'db-f2', 3],
            ['s-mei', 'db-f1', 12],
            ['s-new', 'db-f2', 3],
            ['s-ravi', 'db-f2', 3]
          ] },
        { setup: 'INSERT INTO sessions VALUES (\'s-aaa\',1,0)', rows: [
            ['s-aaa', 'db-f2', 3],
            ['s-asha', 'db-f1', 12],
            ['s-guest', 'db-f2', 3],
            ['s-mei', 'db-f1', 12],
            ['s-new', 'db-f2', 3],
            ['s-ravi', 'db-f1', 12]
          ] },
        { setup: 'UPDATE replicas SET rtt_ms = 1 WHERE name = \'db-f4\'', rows: [
            ['s-asha', 'db-f1', 12],
            ['s-guest', 'db-f4', 1],
            ['s-mei', 'db-f1', 12],
            ['s-new', 'db-f2', 3],
            ['s-ravi', 'db-f1', 12]
          ] },
        { setup: 'DELETE FROM sessions', rows: [] }
      ] },
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
    deepDive: `<p><b>Why R + W &gt; N is not the whole story.</b> The overlap argument assumes the write set is a fixed group of N "home" replicas. Dynamo/Riak <b>sloppy quorums</b> let writes land on any W reachable nodes when home nodes are down (for availability), so a later quorum read on the home nodes can miss them until <b>hinted handoff</b> delivers. A write that reached only 1 of 2 required nodes reports failure but is <b>not rolled back</b>, so later reads may or may not see it. A read concurrent with a write can return the new value from one quorum and the old from the next. And with <b>LWW timestamps</b>, clock skew decides the winner. Getting true <b>linearizability</b> requires extra work: synchronous read repair before returning, and for compare-and-set you need consensus — Cassandra's lightweight transactions (<code>IF NOT EXISTS</code>) run Paxos, and the Accord protocol (CEP-15, first shipped in the Cassandra 6.0 alpha builds) aims to bring general ACID transactions.</p>
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
      tests: { engine: 'sqlite', check: '(rows, cols, c) => {\n  if (c.plan || c.noplan) { const d = rows.map(r => r[r.length - 1]).join(\'\\n\'); return (!c.plan || new RegExp(c.plan).test(d)) && (!c.noplan || !new RegExp(c.noplan).test(d)); }\n  let a = rows, b = c.rows || [];\n  if (c.set) { const k = r => JSON.stringify(r); a = a.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); b = b.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); }\n  return a.length === b.length && a.every((r, i) => r.length === b[i].length && r.every((v, j) => v === b[i][j] || (typeof v === \'number\' && typeof b[i][j] === \'number\' && Math.abs(v - b[i][j]) < 1e-6)));\n}', cases: [
        { setup: '', rows: [
            [1, 'cart:9', 'qty=2', 3, 'C,E'],
            [2, 'theme:7', 'dark', 5, 'B,C']
          ] },
        { setup: 'INSERT INTO read_resp VALUES (3,\'A\',\'cart:9\'),(3,\'B\',\'cart:9\'),(3,\'D\',\'cart:9\')', rows: [
            [1, 'cart:9', 'qty=2', 3, 'C,E'],
            [2, 'theme:7', 'dark', 5, 'B,C'],
            [3, 'cart:9', 'qty=2', 3, null]
          ] },
        { setup: 'INSERT INTO read_resp VALUES (3,\'A\',\'cart:9\'),(3,\'B\',\'cart:9\'),(3,\'C\',\'cart:9\'),(3,\'D\',\'cart:9\'),(3,\'E\',\'cart:9\')', rows: [
            [1, 'cart:9', 'qty=2', 3, 'C,E'],
            [2, 'theme:7', 'dark', 5, 'B,C'],
            [3, 'cart:9', 'qty=2', 3, 'C,E']
          ] },
        { setup: 'INSERT INTO read_resp VALUES (3,\'A\',\'theme:7\')', rows: [
            [1, 'cart:9', 'qty=2', 3, 'C,E'],
            [2, 'theme:7', 'dark', 5, 'B,C'],
            [3, 'theme:7', 'dark', 5, null]
          ] },
        { setup: 'DELETE FROM read_resp', rows: [] },
        { setup: 'UPDATE kv_replicas SET ver = 9, v = \'new\' WHERE node = \'E\' AND k = \'cart:9\'', rows: [
            [1, 'cart:9', 'new', 9, 'C,D'],
            [2, 'theme:7', 'dark', 5, 'B,C']
          ] },
        { setup: 'INSERT INTO read_resp VALUES (3,\'E\',\'cart:9\'),(3,\'C\',\'cart:9\')', rows: [
            [1, 'cart:9', 'qty=2', 3, 'C,E'],
            [2, 'theme:7', 'dark', 5, 'B,C'],
            [3, 'cart:9', 'qty=1', 2, 'E']
          ] },
        { setup: 'INSERT INTO read_resp VALUES (3,\'B\',\'theme:7\'),(3,\'C\',\'theme:7\')', rows: [
            [1, 'cart:9', 'qty=2', 3, 'C,E'],
            [2, 'theme:7', 'dark', 5, 'B,C'],
            [3, 'theme:7', 'light', 4, null]
          ] },
        { setup: 'INSERT INTO read_resp VALUES (3,\'A\',\'nokey\')', rows: [
            [1, 'cart:9', 'qty=2', 3, 'C,E'],
            [2, 'theme:7', 'dark', 5, 'B,C']
          ] }
      ] },
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

  /* =====================================================================
     TOPIC 3 — Sharding strategies
     ===================================================================== */
  function fnv32(s) {
    // FNV-1a 32-bit hash: tiny, deterministic, good enough for demos
    var h = 0x811c9dc5;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
    return h >>> 0;
  }
  function mixHash(k) { return (Math.imul(k, 2654435761) >>> 0) >>> 16; } // same formula as the SQL demos

  topics.push({
    title: 'Sharding Strategies: Range, Hash, Consistent Hashing, Directory & Hot Keys',
    analogy: `<p>A library grows too big for one room, so it splits books across rooms. <b>By first letter</b> (range): easy to browse "all books from M to P", but the "S" room is packed and new popular books all arrive in one room. <b>By a random-looking sticker number</b> (hash): every room gets the same amount, but "all books from M to P" now means visiting every room. And if one author gets <b>a million fan letters</b>, whichever room holds that author is swamped — that is a <b>hot key</b>.</p>`,
    explain: `<p><b>Sharding</b> (also called <b>partitioning</b>) splits one big dataset into pieces called <b>shards</b>, each living on a different machine. Replication copies the <i>same</i> data; sharding splits <i>different</i> data. Real systems do both: every shard is itself replicated. You shard when one machine can no longer hold the data or absorb the <b>write</b> rate (reads alone can usually be solved with replicas and caches).</p>
<p>The <b>shard key</b> (partition key) decides where each row lives. The main strategies:</p>
${H.table(['Strategy', 'How a key finds its shard', 'Great at', 'Watch out'], [
  ['<b>Range</b>', 'sorted key ranges: A-F → s1, G-M → s2', 'range scans ("orders from last week"), ordered iteration', 'hot spots: monotonically increasing keys (timestamps, auto-increment ids) all hit the LAST shard'],
  ['<b>Hash</b>', 'hash(key) mod #partitions', 'even spread of keys and load', 'range queries must ask every shard (scatter-gather)'],
  ['<b>Consistent hashing</b>', 'hash ring; key goes to next node clockwise; virtual nodes', 'adding/removing a node moves only ~1/N of keys', 'needs vnodes for evenness; still no range scans'],
  ['<b>Directory / lookup</b>', 'a lookup table says "tenant acme → shard 7"', 'total flexibility, move one big tenant alone', 'the directory is a critical, cached dependency'],
  ['<b>Geo / entity</b>', 'by region or tenant', 'data residency (EU data stays in EU), locality', 'uneven region/tenant sizes']
])}
<p><b>A good shard key:</b> (1) <b>high cardinality</b> (millions of distinct values, not "country"); (2) <b>even load</b> — balance <i>traffic</i>, not just row count; (3) appears in <b>most queries</b> so a request touches one shard; (4) keeps data that is updated together in the same shard (avoids cross-shard transactions); (5) is <b>not monotonic</b> unless you only range-scan it. Compound keys such as <code>(tenant_id, user_id)</code> often win: route by tenant, spread big tenants by user.</p>
<p><b>Hot keys</b> (a celebrity, a flash-sale product) defeat any strategy because one key lives on one shard. Fixes: <b>salting/splitting</b> the key into <code>user1#0..user1#7</code> (writes spread, reads gather 8 pieces), caching reads in front, or a dedicated shard for the whale.</p>
<p><b>Rebalancing:</b> never use plain <code>hash mod N</code> with N = number of servers — changing N moves almost every key. Use a <b>fixed number of partitions</b> much larger than servers (Redis Cluster: 16 384 hash slots; many systems: 1024+) and move whole partitions, <b>dynamic splitting</b> of ranges when they grow (HBase regions, CockroachDB ranges at ~512 MB, MongoDB chunks), or <b>consistent hashing</b> with virtual nodes (Cassandra/ScyllaDB token ranges).</p>
<p><b>Routing:</b> the client library knows the map (Redis Cluster), a proxy routes (Vitess vtgate, MongoDB mongos, Citus coordinator), or any node forwards (Cassandra via gossip). <b>Secondary indexes</b> come in two flavours: <b>local</b> (each shard indexes its own rows → index reads scatter to all shards) and <b>global</b> (the index itself is sharded by the indexed value → reads hit one shard, but writes update a remote index asynchronously, e.g. DynamoDB GSIs are eventually consistent).</p>`,
    clues: [
      '"data no longer fits on one machine" / "100K writes per second" → shard (replicas only scale reads)',
      '"queries by date range" → range partitioning (but beware the "today" hot shard)',
      '"evenly distribute users" → hash on a high-cardinality key',
      '"adding servers without moving everything" → consistent hashing or fixed partition count',
      '"celebrity / viral post / flash sale" → hot key: salt, split, cache',
      '"multi-tenant SaaS, a few huge customers" → (tenant_id, …) compound key or directory-based sharding',
      '"look up user by email when sharded by user_id" → global secondary index vs scatter-gather'
    ],
    code: [
      { lang: 'sql', db: 'shard', title: 'Same traffic, four shard keys: which one is balanced? (runnable)', code: `-- requests: 120 requests, half of them for user 1 (a celebrity with 9M followers).
-- We compute the load on each of 4 shards for four candidate shard keys.
WITH hashed AS (
  SELECT q.req_id, q.user_id, u.tenant, u.followers,
         -- multiplicative hash, take the high bits, then mod 4 shards
         (((q.user_id * 2654435761) % 4294967296) >> 16) % 4 AS h_user,
         (((q.req_id  * 2654435761) % 4294967296) >> 16) % 4 AS salt
  FROM requests AS q
  JOIN users    AS u USING (user_id)
), candidates AS (
  SELECT 'range(user_id)' AS candidate,
         (SELECT shard FROM range_map AS r WHERE h.user_id BETWEEN r.lo AND r.hi) AS shard
  FROM hashed AS h
  UNION ALL
  SELECT 'tenant (directory)',
         CASE tenant WHEN 'acme' THEN 0 WHEN 'globex' THEN 1 WHEN 'initech' THEN 2 ELSE 3 END
  FROM hashed
  UNION ALL
  SELECT 'hash(user_id)', h_user FROM hashed
  UNION ALL
  -- hot keys are split into 4 sub-keys (user1#0..#3) spread over neighbouring shards
  SELECT 'hash(user_id) + salted hot keys',
         CASE WHEN followers > 1000000 THEN (h_user + salt) % 4 ELSE h_user END
  FROM hashed
), load AS (                                    -- every candidate gets all 4 shards, empty ones count as 0
  SELECT c.candidate, s.shard, COUNT(x.shard) AS reqs
  FROM (SELECT DISTINCT candidate FROM candidates) AS c
  CROSS JOIN (SELECT 0 AS shard UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3) AS s
  LEFT JOIN candidates AS x ON x.candidate = c.candidate AND x.shard = s.shard
  GROUP BY c.candidate, s.shard ORDER BY c.candidate, s.shard
)
SELECT candidate,
       GROUP_CONCAT(reqs, ' / ')                     AS reqs_per_shard,
       MAX(reqs)                                     AS hottest,
       ROUND(MAX(reqs) * 1.0 / AVG(reqs), 2)         AS imbalance   -- 1.0 = perfect
FROM load
GROUP BY candidate
ORDER BY imbalance;` },
      { lang: 'python', run: true, title: 'Consistent hashing ring with virtual nodes (runnable)', code: `import bisect
import hashlib


def h(s):
    """Stable 32-bit hash (Python's built-in hash() is randomised per process)."""
    return int(hashlib.md5(s.encode()).hexdigest()[:8], 16)


class Ring:
    def __init__(self, nodes, vnodes=64):
        self.vnodes = vnodes
        self.points = []          # sorted hash positions on the ring
        self.owner = {}           # position -> physical node
        for n in nodes:
            self.add(n)

    def add(self, node):
        for i in range(self.vnodes):            # many points per node = smoother spread
            p = h(f"{node}#{i}")
            bisect.insort(self.points, p)
            self.owner[p] = node

    def lookup(self, key):
        p = h(key)
        i = bisect.bisect(self.points, p) % len(self.points)   # next point clockwise
        return self.owner[self.points[i]]


keys = [f"user:{i}" for i in range(10000)]
ring = Ring(["A", "B", "C", "D"])
before = {k: ring.lookup(k) for k in keys}
ring.add("E")
after = {k: ring.lookup(k) for k in keys}
moved = sum(before[k] != after[k] for k in keys)
print(f"consistent hashing: {moved} of {len(keys)} keys moved ({moved / len(keys):.0%}, ideal 20%)")

mod_moved = sum(h(k) % 4 != h(k) % 5 for k in keys)
print(f"hash mod N:         {mod_moved} of {len(keys)} keys moved ({mod_moved / len(keys):.0%})")

load = {}
for k in keys:
    load[after[k]] = load.get(after[k], 0) + 1
print("keys per node after adding E:", dict(sorted(load.items())))
` }
    ],
    codeTitle: ['Compare shard keys by load', 'Consistent hashing'],
    viz: [{
      title: 'Keys flowing onto shards: range vs hash, and the hot shard',
      input: 'hash 4 : 1 2 3 4 5 6 7 8 9 10 11 12 1 1 1 1 1 1 1 1',
      inputLabel: 'strategy (range | hash | mod) · number of shards (2-6) : keys (repeat a key = more traffic)',
      gen: function (input) {
        var m = /^\s*(range|hash|mod)\s+(\d+)\s*:\s*(.+)$/i.exec(String(input || ''));
        if (!m) throw new Error('Format: "hash 4 : 1 2 3 1 1"  (strategy range|hash|mod, shards, then integer keys)');
        var mode = m[1].toLowerCase(), N = parseInt(m[2], 10);
        if (N < 2 || N > 6) throw new Error('Use 2..6 shards');
        var keys = m[3].trim().split(/[\s,]+/).map(Number);
        if (!keys.length || keys.some(function (k) { return !isFinite(k) || k < 0 || Math.floor(k) !== k; })) throw new Error('Keys must be non-negative integers');
        if (keys.length > 30) throw new Error('Use at most 30 keys');
        var lo = Math.min.apply(null, keys), hi = Math.max.apply(null, keys), width = Math.max(1, Math.ceil((hi - lo + 1) / N));
        function shardOf(k) {
          if (mode === 'range') return Math.min(N - 1, Math.floor((k - lo) / width));
          if (mode === 'mod') return k % N;
          return mixHash(k) % N;
        }
        var how = mode === 'range' ? 'range: shard i owns keys [' + lo + ' + i·' + width + ', …)' : mode === 'mod' ? 'k mod ' + N : 'hash(k) = high bits of (k × 2654435761) mod ' + N;
        var load = [], rows = [], frames = [], i;
        for (i = 0; i < N; i++) load.push(0);
        var labels = []; for (i = 0; i < N; i++) labels.push('shard ' + i + (mode === 'range' ? ' [' + (lo + i * width) + '-' + (i === N - 1 ? hi : lo + (i + 1) * width - 1) + ']' : ''));
        frames.push({ narr: 'Strategy <b>' + mode + '</b> with <b>' + N + '</b> shards. Rule: ' + how + '. Each key below is one request; a repeated key means that key gets more traffic.', parts: [
          { type: 'array', label: 'incoming requests (keys)', values: keys.slice() },
          { type: 'bars', label: 'load per shard', values: load.slice(), idxLabels: labels }
        ] });
        for (i = 0; i < keys.length; i++) {
          var s = shardOf(keys[i]); load[s]++;
          rows.push([i + 1, keys[i], 'shard ' + s]);
          var total = i + 1, avg = total / N, hot = {};
          load.forEach(function (l, j) { if (total >= 4 && l > 1.5 * avg && l >= 3) hot[j] = 'bad'; });
          if (!hot[s]) hot[s] = 'cur';
          var hl = {}; hl[i] = 'cur';
          frames.push({ narr: 'Key <b>' + keys[i] + '</b> → <b>shard ' + s + '</b>. ' + (Object.keys(hot).some(function (j) { return hot[j] === 'bad'; }) ? '<span class="c-r">Hot shard:</span> a shard has more than 1.5× the average load (' + avg.toFixed(1) + ').' : 'Load is still reasonably balanced.'), parts: [
            { type: 'array', label: 'incoming requests (keys)', values: keys.slice(), hl: hl, ptr: (function () { var p = {}; p[i] = 'now'; return p; })() },
            { type: 'bars', label: 'load per shard', values: load.slice(), idxLabels: labels, hl: hot },
            { type: 'table', label: 'routing log (last 6)', columns: ['#', 'key', 'goes to'], rows: rows.slice(-6), hl: (function () { var o = {}; o[Math.min(rows.length, 6) - 1] = 'cur'; return o; })() }
          ] });
        }
        var mx = Math.max.apply(null, load), avgAll = keys.length / N, worst = load.indexOf(mx);
        var counts = {}; keys.forEach(function (k) { counts[k] = (counts[k] || 0) + 1; });
        var topKey = Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a]; })[0];
        var finalHl = {}; finalHl[worst] = mx > 1.5 * avgAll ? 'bad' : 'ok';
        frames.push({ narr: 'Result: hottest shard ' + worst + ' has ' + mx + ' of ' + keys.length + ' requests (imbalance ' + (mx / avgAll).toFixed(2) + '×, 1.00 = perfect). ' + (counts[topKey] > avgAll
          ? 'Key <b>' + topKey + '</b> alone sent ' + counts[topKey] + ' requests — a <span class="c-r">hot key</span>. No strategy can split one key; you must <b>salt</b> it (' + topKey + '#0 … ' + topKey + '#3) or cache it.'
          : (mode === 'range' ? 'Range keeps neighbours together (great for scans) but sequential new keys would all land on the last shard.' : 'Hashing spread the distinct keys evenly.')), parts: [
          { type: 'bars', label: 'final load per shard', values: load.slice(), idxLabels: labels, hl: finalHl },
          { type: 'map', label: 'requests per key (top 5)', entries: Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a]; }).slice(0, 5).map(function (k) { return [k, counts[k]]; }), hl: (function () { var o = {}; if (counts[topKey] > avgAll) o[topKey] = 'bad'; return o; })() }
        ] });
        if (counts[topKey] > avgAll) {
          var salted = []; for (i = 0; i < N; i++) salted.push(0);
          var seen = 0;
          keys.forEach(function (k) { var b = shardOf(k); if (String(k) === topKey) { b = (b + seen) % N; seen++; } salted[b]++; });
          frames.push({ narr: 'Fix: <b>salt the hot key</b>. Writes for key ' + topKey + ' go round-robin to sub-keys ' + topKey + '#0..#' + (N - 1) + ', which live on different shards. Reads of that key now gather ' + N + ' small pieces — a good trade for a celebrity. New imbalance: ' + (Math.max.apply(null, salted) / avgAll).toFixed(2) + '×.', parts: [
            { type: 'bars', label: 'load after salting key ' + topKey, values: salted, idxLabels: labels, hl: (function () { var o = {}; salted.forEach(function (v, j) { o[j] = 'ok'; }); return o; })() }
          ] });
        }
        return frames;
      }
    }, {
      title: 'Adding a server: hash mod N vs consistent hashing',
      input: 'keys=12 from=3 to=4',
      inputLabel: 'keys (4-16), servers before (2-5), servers after (from+1 … 6)',
      gen: function (input) {
        var s = String(input || '');
        function grab(n, d) { var mm = new RegExp(n + '\\s*=\\s*(\\d+)', 'i').exec(s); return mm ? parseInt(mm[1], 10) : d; }
        var K = grab('keys', 12), A = grab('from', 3), B = grab('to', 4);
        if (K < 4 || K > 16) throw new Error('keys must be 4..16');
        if (A < 2 || A > 5 || B <= A || B > 6) throw new Error('need 2 ≤ from < to ≤ 6');
        var keys = [], i, frames = [];
        for (i = 1; i <= K; i++) keys.push('k' + i);
        var kh = keys.map(function (k) { return fnv32(k); });
        // ring positions in degrees
        var srvNames = ['S0', 'S1', 'S2', 'S3', 'S4', 'S5'];
        var spos = [20, 140, 260, 80, 200, 320]; // ring positions of S0..S5 (fixed here so every new server splits an existing arc)
        var kpos = kh.map(function (x) { return x % 360; });
        function owner(deg, n) { // next server clockwise among first n servers
          var best = -1, bestD = 999;
          for (var j = 0; j < n; j++) { var d = (spos[j] - deg + 360) % 360; if (d < bestD) { bestD = d; best = j; } }
          return best;
        }
        var modA = kh.map(function (x) { return x % A; }), modB = kh.map(function (x) { return x % B; });
        var movedMod = 0; for (i = 0; i < K; i++) if (modA[i] !== modB[i]) movedMod++;
        frames.push({ narr: '<b>hash mod N</b> with N = ' + A + ': each key goes to server hash(key) mod ' + A + '. Simple and even.', parts: [
          { type: 'table', label: 'mod ' + A, columns: ['key', 'hash mod ' + A], rows: keys.map(function (k, j) { return [k, 'S' + modA[j]]; }) }
        ] });
        frames.push({ narr: 'Add ' + (B - A) + ' server(s) (N = ' + B + '). The formula changes for <i>every</i> key: <span class="c-r">' + movedMod + ' of ' + K + ' keys move</span> (expected about ' + Math.round(100 * (1 - 1 / B)) + '%). Moving that much data at once can melt the cluster.', parts: [
          { type: 'table', label: 'mod ' + A + ' → mod ' + B, columns: ['key', 'before', 'after', 'moved?'], rows: keys.map(function (k, j) { return [k, 'S' + modA[j], 'S' + modB[j], modA[j] !== modB[j] ? 'MOVED' : '']; }),
            hl: (function () { var o = {}; for (var j = 0; j < K; j++) if (modA[j] !== modB[j]) o[j] = 'bad'; return o; })() }
        ] });
        function ringGraph(n, movedSet) {
          var nodes = [], edges = [], hl = {}, tags = {};
          for (var j = 0; j < n; j++) {
            var a = (spos[j] - 90) * Math.PI / 180;
            nodes.push({ id: srvNames[j], label: srvNames[j], x: 50 + 40 * Math.cos(a), y: 34 + 28 * Math.sin(a), shape: 'box' });
            tags[srvNames[j]] = spos[j] + '°';
            if (j === n - 1 && n > A) hl[srvNames[j]] = 'sel';
          }
          for (var q = 0; q < K; q++) {
            var b = (kpos[q] - 90) * Math.PI / 180, o = owner(kpos[q], n);
            nodes.push({ id: keys[q], label: keys[q], x: 50 + 24 * Math.cos(b), y: 34 + 17 * Math.sin(b) });
            edges.push([keys[q], srvNames[o]]);
            if (movedSet && movedSet[q]) { hl[keys[q]] = 'bad'; }
          }
          return { type: 'graph', directed: true, height: 68, nodes: nodes, edges: edges, hl: hl, tags: tags };
        }
        var ownA = kpos.map(function (p) { return owner(p, A); }), ownB = kpos.map(function (p) { return owner(p, B); });
        var movedRing = {}, mr = 0;
        for (i = 0; i < K; i++) if (ownA[i] !== ownB[i]) { movedRing[i] = true; mr++; }
        frames.push({ narr: '<b>Consistent hashing:</b> servers and keys are placed on a ring of 0-359° (keys by hash; servers at fixed spots for clarity). Each key belongs to the <b>next server clockwise</b>. Arrows show the owner of each key.', parts: [
          ringGraph(A, null),
          { type: 'table', label: 'ring positions', columns: ['key', 'position', 'owner'], rows: keys.map(function (k, j) { return [k, kpos[j] + '°', srvNames[ownA[j]]]; }) }
        ] });
        frames.push({ narr: 'Add ' + srvNames.slice(A, B).join(', ') + '. Only keys that fall just before the new server(s) on the ring change owner: <span class="c-r">' + mr + ' of ' + K + '</span> move, and every moved key goes <i>to a new server</i> — old servers never swap keys among themselves.', parts: [
          ringGraph(B, movedRing),
          { type: 'table', label: 'owners after adding', columns: ['key', 'before', 'after', 'moved?'], rows: keys.map(function (k, j) { return [k, srvNames[ownA[j]], srvNames[ownB[j]], movedRing[j] ? 'moved' : '']; }),
            hl: (function () { var o = {}; for (var j = 0; j < K; j++) if (movedRing[j]) o[j] = 'bad'; return o; })() }
        ] });
        var loadB = []; for (i = 0; i < B; i++) loadB.push(0); ownB.forEach(function (o) { loadB[o]++; });
        frames.push({ narr: 'Comparison: mod-N moved <b>' + movedMod + '</b> keys, the ring moved <b>' + mr + '</b>. Downside visible on the right: with one point per server, ring arcs are uneven, so load is lumpy. Real systems give each server many <b>virtual nodes</b> (Cassandra used 256, now 16 with a smarter allocator) to even it out.', parts: [
          { type: 'bars', label: 'keys moved', values: [movedMod, mr], idxLabels: ['hash mod N', 'consistent hashing'], hl: { 0: 'bad', 1: 'ok' } },
          { type: 'bars', label: 'keys per server on the ring (1 vnode each)', values: loadB, idxLabels: srvNames.slice(0, B) }
        ] });
        return frames;
      }
    }],
    examples: [
      { title: 'Range map lookup', html: `<p>With range sharding, routing is a lookup: which range contains this key? The <code>range_map</code> table says users 1-6 live on node-a, 7-12 on node-b, and so on. Real systems cache this map in the router (mongos, vtgate) and refresh it when a range splits or moves.</p>`, code: { lang: 'sql', db: 'shard', code: `SELECT u.user_id, u.handle, r.shard, r.node
FROM users AS u
JOIN range_map AS r ON u.user_id BETWEEN r.lo AND r.hi
WHERE u.user_id IN (1, 7, 13, 24);` } },
      { title: 'Balanced rows, unbalanced traffic', html: `<p>Hashing user_id puts 6/5/6/7 users on the four shards — looks perfect. But count <i>requests</i> and shard 3 gets 74 of 120 because it owns the celebrity (user 1). Lesson: measure the load your shard key creates, not the row count.</p>`, code: { lang: 'sql', db: 'shard', code: `SELECT (((user_id * 2654435761) % 4294967296) >> 16) % 4 AS shard,
       COUNT(DISTINCT user_id) AS users,
       COUNT(*)                AS requests
FROM requests
GROUP BY shard
ORDER BY shard;` } },
      { title: 'Monotonic keys make the newest range hot', html: `<p>Range-sharding by signup date: shard boundaries are dates, and every new signup today has the <b>largest</b> date, so 100% of today's inserts land on the last shard while old shards sit idle. Same for auto-increment ids and timestamps. Fixes: hash the key, prefix with a bucket (<code>hash(user) % 16 || date</code>), or use UUIDv4 / bit-reversed sequences (Spanner's advice).</p>`, code: { lang: 'sql', db: 'shard', code: `-- 4 date-range shards of one week each: where do the latest 6 signups go?
SELECT signup_day,
       CASE WHEN signup_day < '2026-10-04' THEN 'shard 0'
            WHEN signup_day < '2026-10-07' THEN 'shard 1'
            WHEN signup_day < '2026-10-10' THEN 'shard 2'
            ELSE 'shard 3 (all new writes!)' END AS shard
FROM signups
ORDER BY signup_day DESC
LIMIT 6;` } },
      { title: 'Salting a hot key', html: `<p>Twitter-style timelines and like counters split a hot key into K sub-keys: <code>post:42#0 … post:42#7</code>. A write picks a random suffix; a read fetches all 8 and sums. In DynamoDB this is called <b>write sharding</b>. Here user 1's 60 requests are spread over 4 shards using a salt from the request id.</p>`, code: { lang: 'sql', db: 'shard', code: `-- user 1's requests, before and after splitting the key into user1#0..#3
SELECT 'user1#' || ((((req_id * 2654435761) % 4294967296) >> 16) % 4)         AS sub_key,
       ((((1 * 2654435761) % 4294967296) >> 16) % 4
         + (((req_id * 2654435761) % 4294967296) >> 16) % 4) % 4             AS shard,
       COUNT(*)                                                             AS requests
FROM requests
WHERE user_id = 1
GROUP BY sub_key, shard
ORDER BY shard;` } }
    ],
    deepDive: `<p><b>Partition count vs node count.</b> A cluster of 10 nodes with 1 000 partitions (100 each) can add an 11th node by stealing ~91 partitions — data moves in whole partitions, never key by key. Redis Cluster fixes 16 384 slots, Kafka fixes partitions per topic (choose generously: too few caps parallelism, too many costs memory and leader elections), Elasticsearch fixes primary shards at index creation. Systems with <b>dynamic splitting</b> (HBase, Bigtable, CockroachDB, TiDB, MongoDB) start with one range and split at a size threshold (CockroachDB ~512 MiB) or when a range is hot (load-based splitting), then the balancer moves replicas by size, QPS and CPU.</p>
<p><b>Consistent hashing details.</b> With one token per node, arc lengths vary wildly (standard deviation ~ mean). Virtual nodes fix balance and also make rebuilds parallel: a dead node's 256 small arcs are re-replicated from many peers, not one. Variants: <b>rendezvous (HRW) hashing</b> (score = hash(key, node), pick max — simple, no ring), <b>jump consistent hash</b> (Google, O(log N), no memory, but only for numbered buckets), <b>bounded-load consistent hashing</b> (Vimeo/HAProxy) caps any node at (1+ε)× average.</p>
<p><b>Cross-shard pain.</b> Joins across shards become application joins or scatter-gather; aggregates need two-phase "partial then merge" (each shard computes SUM and COUNT, the router combines — AVG cannot simply be averaged). Unique constraints on non-shard columns (email) need a global index table or a separate service. Multi-shard transactions need 2PC or sagas (topic 6). The classic advice: choose the shard key so the <b>top 3 queries and all transactions stay single-shard</b> — e.g. Vitess "keyspace IDs" and Citus "co-located distributed tables" put a tenant's rows from every table on the same shard so joins stay local.</p>
<p><b>Resharding live</b> (Vitess, Notion, Figma, Stripe have written about it): (1) create new shards, (2) copy a snapshot + stream changes (CDC/VReplication), (3) verify with checksums, (4) briefly stop writes or use a per-shard cutover, (5) switch routing, (6) keep the old shards for rollback. The hardest parts are long tails: in-flight transactions, caches keyed by old placement, and ID generators.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI workloads create new hot keys — one viral prompt template, one embedding namespace for a giant tenant, one agent hammering a single document. Vector databases shard embeddings too (by tenant/namespace or by random partition with scatter-gather top-k merge), so the same strategies apply. Managed services increasingly auto-split hot ranges (DynamoDB adaptive capacity, CockroachDB load-based splitting), and AI ops tools flag skew from metrics.</p>
<p><b>Use AI as a partner:</b> paste your top 10 queries with frequencies and ask <code>"Score candidate shard keys (tenant_id, user_id, (tenant_id, user_id), created_at) on: single-shard query %, cross-shard txn %, skew risk, resharding difficulty."</code> Then check its claims with a load query like the one in this topic.</p>
<p><b>Where AI goes wrong:</b> it recommends <code>hash(id) % num_servers</code>, picks low-cardinality keys like country, or forgets the hot-tenant problem. <b>What you must own:</b> reasoning from the access pattern to the key, and planning how you will reshard before you need to.</p>`,
    problems: [{
      title: 'Choose a Shard Key by Measured Load',
      level: 'Hard', tags: ['sharding', 'shard key', 'hot key'], companies: ['Stripe', 'Notion', 'Slack', 'Salesforce'],
      statement: `<p>You run a multi-tenant SaaS with 4 shards. Using the real request log (<code>requests</code> joined to <code>users</code>, db <code>shard</code>), compare these candidate shard keys and report each candidate's per-shard request counts, the hottest shard's load and an <b>imbalance</b> ratio (max ÷ average):</p>
<ol><li><code>range(user_id)</code> using <code>range_map</code>;</li><li><code>tenant</code> via a directory (acme→0, globex→1, initech→2, umbrella→3);</li><li><code>hash(user_id)</code> = <code>(((user_id × 2654435761) mod 2<sup>32</sup>) &gt;&gt; 16) mod 4</code>;</li><li>hash(user_id) but users with &gt; 1 M followers are <b>salted</b> across shards using a hash of req_id.</li></ol>
<p>Then recommend one, in words.</p>`,
      constraints: `Imbalance = 1.0 means perfectly even. Round to 2 decimals. Order by imbalance ascending.`,
      example: `<p>Expected shape: ${H.table(['candidate', 'hottest', 'imbalance'], [['hash + salted hot keys', '31', H.c('g', '1.03')], ['hash(user_id)', '74', '2.47'], ['range(user_id)', '75', '2.5'], ['tenant (directory)', '93', H.c('r', '3.1')]])}<p>Tenant sharding is worst because acme owns half the users <i>and</i> the celebrity.</p>`,
      brute: { why: `<p>Count <b>users</b> per shard with <code>user_id % 4</code>: you get a perfect 6/6/6/6 and declare victory. But users are not load — the celebrity alone generates half the traffic, and the brute check cannot see it.</p>`, code: { lang: 'sql', db: 'shard', code: `SELECT user_id % 4 AS shard, COUNT(*) AS users
FROM users
GROUP BY shard
ORDER BY shard;   -- 6/6/6/6 looks perfect... and is misleading` } },
      mcq: { q: 'Your hash-sharded cluster has one shard at 5× average CPU, caused by a single key. What helps most?', options: ['Add more shards', 'Switch from hash to range sharding', 'Split (salt) the hot key into sub-keys and/or cache its reads', 'Increase the replication factor of every shard'], answer: 2, explain: 'One key always maps to one shard no matter how many shards exist. Only splitting the key (or absorbing reads in a cache, or giving the whale its own beefy shard) removes the hotspot. More replicas help reads only if they are allowed to serve them.' },
      hints: [
        `<p>Hint 1: Build one CTE row per (request, candidate) with a computed <code>shard</code> column, using <code>UNION ALL</code> of four SELECTs — one per candidate.</p>`,
        `<p>Hint 2: Count per (candidate, shard), then per candidate take <code>MAX(reqs)</code> and <code>AVG(reqs)</code>. Use <code>GROUP_CONCAT</code> for the per-shard list.</p>`,
        `<p>Hint 3: For salting: <code>CASE WHEN followers &gt; 1000000 THEN (h_user + salt) % 4 ELSE h_user END</code>, where salt is a hash of req_id mod 4 — each sub-key lands on a different neighbouring shard.</p>`
      ],
      tests: { engine: 'sqlite', check: '(rows, cols, c) => {\n  if (c.plan || c.noplan) { const d = rows.map(r => r[r.length - 1]).join(\'\\n\'); return (!c.plan || new RegExp(c.plan).test(d)) && (!c.noplan || !new RegExp(c.noplan).test(d)); }\n  let a = rows, b = c.rows || [];\n  if (c.set) { const k = r => JSON.stringify(r); a = a.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); b = b.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); }\n  return a.length === b.length && a.every((r, i) => r.length === b[i].length && r.every((v, j) => v === b[i][j] || (typeof v === \'number\' && typeof b[i][j] === \'number\' && Math.abs(v - b[i][j]) < 1e-6)));\n}', cases: [
        { setup: '', rows: [
            ['hash(user_id) + salted hot keys', '31 / 29 / 31 / 29', 31, 1.03],
            ['hash(user_id)', '16 / 14 / 16 / 74', 74, 2.47],
            ['range(user_id)', '75 / 18 / 15 / 12', 75, 2.5],
            ['tenant (directory)', '93 / 15 / 8 / 4', 93, 3.1]
          ] },
        { setup: 'DELETE FROM requests WHERE user_id = 1', rows: [
            ['hash(user_id)', '16 / 14 / 16 / 14', 16, 1.07],
            ['hash(user_id) + salted hot keys', '16 / 14 / 16 / 14', 16, 1.07],
            ['range(user_id)', '15 / 18 / 15 / 12', 18, 1.2],
            ['tenant (directory)', '33 / 15 / 8 / 4', 33, 2.2]
          ], set: true },
        { setup: 'DELETE FROM requests WHERE req_id > 60', rows: [
            ['hash(user_id) + salted hot keys', '16 / 14 / 15 / 15', 16, 1.07],
            ['hash(user_id)', '8 / 7 / 8 / 37', 37, 2.47],
            ['range(user_id)', '40 / 8 / 6 / 6', 40, 2.67],
            ['tenant (directory)', '48 / 6 / 4 / 2', 48, 3.2]
          ] },
        { setup: 'UPDATE users SET followers = 5 WHERE user_id = 1', rows: [
            ['hash(user_id)', '16 / 14 / 16 / 74', 74, 2.47],
            ['hash(user_id) + salted hot keys', '16 / 14 / 16 / 74', 74, 2.47],
            ['range(user_id)', '75 / 18 / 15 / 12', 75, 2.5],
            ['tenant (directory)', '93 / 15 / 8 / 4', 93, 3.1]
          ], set: true },
        { setup: 'UPDATE users SET followers = 2000000 WHERE user_id = 2', rows: [
            ['hash(user_id) + salted hot keys', '31 / 32 / 28 / 29', 32, 1.07],
            ['hash(user_id)', '16 / 14 / 16 / 74', 74, 2.47],
            ['range(user_id)', '75 / 18 / 15 / 12', 75, 2.5],
            ['tenant (directory)', '93 / 15 / 8 / 4', 93, 3.1]
          ] },
        { setup: 'UPDATE requests SET user_id = 13', rows: [
            ['range(user_id)', '0 / 0 / 120 / 0', 120, 4],
            ['tenant (directory)', '0 / 120 / 0 / 0', 120, 4],
            ['hash(user_id)', '0 / 120 / 0 / 0', 120, 4],
            ['hash(user_id) + salted hot keys', '0 / 120 / 0 / 0', 120, 4]
          ], set: true },
        { setup: 'DELETE FROM requests WHERE user_id NOT IN (7, 8)', rows: [
            ['hash(user_id)', '3 / 0 / 0 / 3', 3, 2],
            ['hash(user_id) + salted hot keys', '3 / 0 / 0 / 3', 3, 2],
            ['range(user_id)', '0 / 6 / 0 / 0', 6, 4],
            ['tenant (directory)', '6 / 0 / 0 / 0', 6, 4]
          ], set: true },
        { setup: 'DELETE FROM requests WHERE user_id > 1', rows: [
            ['hash(user_id) + salted hot keys', '15 / 15 / 15 / 15', 15, 1],
            ['range(user_id)', '60 / 0 / 0 / 0', 60, 4],
            ['tenant (directory)', '60 / 0 / 0 / 0', 60, 4],
            ['hash(user_id)', '0 / 0 / 0 / 60', 60, 4]
          ], set: true },
        { setup: 'DELETE FROM requests', rows: [] },
        { setup: 'UPDATE range_map SET hi = 12 WHERE shard = 0; UPDATE range_map SET lo = 13, hi = 24 WHERE shard = 1', rows: [
            ['hash(user_id) + salted hot keys', '31 / 29 / 31 / 29', 31, 1.03],
            ['hash(user_id)', '16 / 14 / 16 / 74', 74, 2.47],
            ['range(user_id)', '93 / 27 / 0 / 0', 93, 3.1],
            ['tenant (directory)', '93 / 15 / 8 / 4', 93, 3.1]
          ], set: true }
      ] },
      solution: {
        approach: `<p><b>Measure, don't guess.</b> Compute load per shard under each candidate from real traffic. Results: salted hash ≈ 1.03×, plain hash 2.47× (celebrity), range 2.5× (celebrity is in the first range), tenant 3.1× (acme is huge). <b>Recommendation:</b> shard key <code>hash(user_id)</code> with hot-key salting for accounts above a follower threshold; keep a small directory override table so a whale tenant/user can be pinned to a dedicated shard. Co-locate a user's other tables on the same key so their transactions stay single-shard.</p>`,
        code: { lang: 'sql', db: 'shard', code: `WITH hashed AS (
  SELECT q.req_id, q.user_id, u.tenant, u.followers,
         (((q.user_id * 2654435761) % 4294967296) >> 16) % 4 AS h_user,
         (((q.req_id  * 2654435761) % 4294967296) >> 16) % 4 AS salt
  FROM requests AS q JOIN users AS u USING (user_id)
), candidates AS (
  SELECT 'range(user_id)' AS candidate,
         (SELECT shard FROM range_map AS r WHERE h.user_id BETWEEN r.lo AND r.hi) AS shard
  FROM hashed AS h
  UNION ALL
  SELECT 'tenant (directory)',
         CASE tenant WHEN 'acme' THEN 0 WHEN 'globex' THEN 1 WHEN 'initech' THEN 2 ELSE 3 END
  FROM hashed
  UNION ALL
  SELECT 'hash(user_id)', h_user FROM hashed
  UNION ALL
  SELECT 'hash(user_id) + salted hot keys',
         CASE WHEN followers > 1000000 THEN (h_user + salt) % 4 ELSE h_user END
  FROM hashed
), load AS (                                    -- every candidate gets all 4 shards, empty ones count as 0
  SELECT c.candidate, s.shard, COUNT(x.shard) AS reqs
  FROM (SELECT DISTINCT candidate FROM candidates) AS c
  CROSS JOIN (SELECT 0 AS shard UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3) AS s
  LEFT JOIN candidates AS x ON x.candidate = c.candidate AND x.shard = s.shard
  GROUP BY c.candidate, s.shard ORDER BY c.candidate, s.shard
)
SELECT candidate,
       GROUP_CONCAT(reqs, ' / ')             AS reqs_per_shard,
       MAX(reqs)                             AS hottest,
       ROUND(MAX(reqs) * 1.0 / AVG(reqs), 2) AS imbalance
FROM load
GROUP BY candidate
ORDER BY imbalance;` },
        complexity: `<p>O(requests × candidates). On a real system run it on a sampled day of query logs; the point is the methodology, not speed.</p>`,
        followUps: ['A shard with zero requests would be missing from <code>load</code> — how would you include it (hint: cross join a shard list)?', 'How do reads of a salted key work, and what do they cost?', 'Which candidate keeps "list all users in tenant X" single-shard?']
      }
    }]
  });

  /* =====================================================================
     TOPIC 4 — NoSQL families & data modelling
     ===================================================================== */
  topics.push({
    title: 'NoSQL Families: Key-Value, Document, Wide-Column, Graph (and Query-First Modelling)',
    analogy: `<p>Think of four kinds of storage furniture. A <b>coat check</b> (key-value): hand over a ticket, get exactly one coat back, super fast, but you cannot ask "show me all red coats". A <b>folder per customer</b> (document): everything about one order — items, address, coupon — sits in one folder you grab in one go. A <b>giant ledger with one section per shop, rows sorted by time</b> (wide-column): perfect for "last 50 sales of shop 12", hopeless for anything else. A <b>corkboard with photos and strings</b> (graph): the strings <i>are</i> the data, so "friends of friends of friends" is just following strings.</p>`,
    explain: `<p><b>NoSQL</b> ("not only SQL") is a family of databases that drop some relational features (joins, fixed schemas, multi-row ACID by default) to gain <b>horizontal scale, flexible schemas, or a data shape</b> that fits a specific problem. Most were built partitioned and replicated from day one, so the previous topics are how they work inside.</p>
${H.table(['Family', 'Data looks like', 'Examples', 'Best for', 'Weak at'], [
  ['<b>Key-value</b>', 'key → opaque blob', 'Redis, Memcached, DynamoDB (KV mode), etcd, RocksDB', 'sessions, caches, carts, rate limits, feature flags', 'queries on anything except the key'],
  ['<b>Document</b>', 'key → JSON/BSON tree', 'MongoDB, Couchbase, Firestore, Cosmos DB', 'aggregates read together: orders, profiles, catalogs with varying attributes', 'many-to-many joins, cross-document invariants'],
  ['<b>Wide-column</b>', 'partition key → sorted rows of columns', 'Cassandra, ScyllaDB, HBase, Bigtable', 'huge write volume, time-series, feeds, messages, IoT', 'ad-hoc queries, joins, aggregations'],
  ['<b>Graph</b>', 'nodes + edges with properties', 'Neo4j, Amazon Neptune, TigerGraph, Memgraph', 'multi-hop relationships: social, fraud rings, recommendations, knowledge graphs', 'bulk scans/aggregates, huge write throughput'],
  ['<b>Specialised</b>', 'time-series, search, vector', 'TimescaleDB, InfluxDB · Elasticsearch/OpenSearch · pgvector, Pinecone, Milvus', 'metrics, full-text search, similarity search for AI', 'being your system of record']
])}
<p><b>The big mindset shift: query-first modelling.</b> In SQL you normalise the data and then write any query you like. In most NoSQL stores you <b>list your queries first</b> and shape the data so each query is a single cheap lookup — even if that means <b>duplicating</b> data (denormalising).</p>
<ul>
<li><b>Document: embed or reference?</b> Embed things that are read together and bounded ("1-to-few": an order's line items, a user's 3 addresses). Reference things that are unbounded or shared ("1-to-many/many-to-many": a product's millions of reviews, the product itself inside orders — store a <i>snapshot</i> of name/price in the order, reference the product id). MongoDB documents max out at 16 MB.</li>
<li><b>Wide-column: one table per query.</b> The <b>partition key</b> decides which node stores the rows (must be in every query's WHERE with <code>=</code>); the <b>clustering key</b> sorts rows inside the partition (enables range + ORDER BY). Bound partition size by <b>bucketing</b> (add day or month to the partition key) — keep partitions well under ~100 MB.</li>
<li><b>Key-value / DynamoDB single-table design:</b> a generic <code>PK</code> + <code>SK</code> pair stores several entity types in one table (<code>PK=USER#7, SK=ORDER#2026-10-01</code>) so one Query fetches a user and their recent orders together.</li>
<li><b>Graph:</b> model the nouns as nodes and the verbs as edges. Traversals follow direct pointers ("index-free adjacency"), so 4-hop queries do not get slower as the total graph grows — unlike repeated SQL self-joins.</li>
</ul>
<p>Also note the convergence: Postgres has <code>JSONB</code>, <code>pgvector</code> and recursive CTEs; MongoDB has multi-document ACID transactions and schema validation; DynamoDB has transactions; Cassandra 5 adds vector search (and the Cassandra 6.0 alpha builds add ACID transactions via Accord). Families describe the <b>primary data model and scaling design</b>, not a hard feature list.</p>`,
    clues: [
      '"flexible / evolving attributes per product" → document store or JSONB column',
      '"billions of events, append-heavy, query by device and time range" → wide-column with time buckets',
      '"sub-millisecond lookups by id, TTL" → key-value (Redis / DynamoDB)',
      '"friends of friends", "shortest path", "fraud ring" → graph database',
      '"we know our access patterns up front and need massive scale" → query-first NoSQL modelling',
      '"ad-hoc analytics, many joins, strong invariants across entities" → stay relational'
    ],
    code: [
      { lang: 'sql', db: 'nosql', title: 'Document queries on JSON (runnable in SQLite)', code: `-- Each order is ONE document with its line items embedded.
-- Reading an order = one key lookup, no join. Querying inside arrays uses json_each.
SELECT d.id,
       json_extract(d.body, '$.customer.name')                     AS customer,
       json_extract(d.body, '$.status')                            AS status,
       json_array_length(d.body, '$.items')                        AS line_items,
       (SELECT SUM(json_extract(i.value, '$.qty') * json_extract(i.value, '$.price'))
        FROM json_each(d.body, '$.items') AS i)                    AS total
FROM docs AS d
WHERE d.collection = 'orders'
ORDER BY d.id;` },
      { lang: 'text', check: false, title: 'Cassandra (CQL): one table per query', code: `-- Query: "latest messages in a channel, newest first, page by page"
CREATE TABLE chat.messages_by_channel (
    channel_id  text,
    day         date,          -- bucket: bounds partition size (one partition per channel per day)
    ts          timeuuid,      -- clustering key: unique + time-ordered
    author_id   bigint,
    author_name text,          -- denormalised copy: no join needed to render
    body        text,
    PRIMARY KEY ((channel_id, day), ts)       -- (partition key), clustering key
) WITH CLUSTERING ORDER BY (ts DESC);

SELECT ts, author_name, body
FROM chat.messages_by_channel
WHERE channel_id = 'general' AND day = '2026-10-14'
LIMIT 50;                                       -- single-partition, already sorted

-- Query 2 "messages by a user" needs ANOTHER table keyed by author_id,
-- written at the same time (logged batch or app-level double write).` },
      { lang: 'js', check: false, title: 'MongoDB: embedded document + aggregation', code: `// Insert one order document with embedded items and a snapshot of product data
db.orders.insertOne({
  _id: "o3",
  customer: { id: 7, name: "Asha" },          // snapshot for display
  status: "pending",
  placed: ISODate("2026-10-05"),
  items: [
    { sku: "PEN-1", qty: 10, price: 40 },     // price at purchase time, not a live reference
    { sku: "MUG-2", qty: 1, price: 199 }
  ]
});
db.orders.createIndex({ "customer.id": 1, placed: -1 });   // supports "my recent orders"

// Units sold per SKU
db.orders.aggregate([
  { $unwind: "$items" },
  { $group: { _id: "$items.sku", units: { $sum: "$items.qty" } } },
  { $sort: { units: -1 } }
]);` }
    ],
    codeTitle: ['Document store (SQLite JSON)', 'Wide-column (CQL)', 'Document (MongoDB)'],
    viz: [{
      title: 'Tour of the NoSQL families (same "shop" data, four shapes)',
      gen: function () {
        var cols = ['family', 'unit of data', 'how you query', 'scales by', 'pick when'];
        var rows = [
          ['Key-value', 'key → blob', 'GET/SET by exact key', 'hash partitioning', 'cache, session, cart, counters'],
          ['Document', 'JSON document', 'by _id + secondary indexes, aggregation', 'shard key on a field', 'self-contained aggregates, flexible fields'],
          ['Wide-column', 'partition → sorted rows', 'partition key = ?, clustering range', 'consistent hashing ring', 'massive writes, time-ordered data'],
          ['Graph', 'nodes + edges', 'traversals (Cypher / Gremlin)', 'mostly scale-up + replicas', 'multi-hop relationships'],
          ['Relational (baseline)', 'normalised rows', 'any SQL, joins', 'replicas, then sharding/NewSQL', 'invariants, ad-hoc queries, transactions']
        ];
        function f(i, narr, extra) {
          var hl = {}; hl[i] = 'sel';
          return { narr: narr, parts: [{ type: 'table', label: 'NoSQL family comparison', columns: cols, rows: rows, hl: hl }].concat(extra) };
        }
        return [
          { narr: 'Five ways to store the same online-shop data. Step through to see what each family is good and bad at.', parts: [{ type: 'table', label: 'NoSQL family comparison', columns: cols, rows: rows }] },
          f(0, '<b>Key-value:</b> the database knows nothing about the value. <code>GET session:ab12</code> is O(1) and can be served from memory (Redis) at sub-millisecond latency. You cannot ask "which sessions contain PEN-1?" without scanning everything.', [
            { type: 'map', label: 'Redis keyspace', entries: [['session:ab12', '{"user":7,"cart":["PEN-1"]}'], ['ratelimit:7:10:05', '17 (TTL 60 s)'], ['feature:new_checkout', 'on']], hl: { 'session:ab12': 'ok' } }
          ]),
          f(1, '<b>Document:</b> one order = one JSON document containing its items. One read returns the whole aggregate; fields can differ between documents (one order has a coupon, others do not). Joins across documents are weak, so we embed snapshots.', [
            { type: 'text', label: 'orders/o3', html: '<code>{ "_id": "o3", "customer": {"id": 7, "name": "Asha"}, "status": "pending",<br>&nbsp;&nbsp;"items": [ {"sku": "PEN-1", "qty": 10, "price": 40}, {"sku": "MUG-2", "qty": 1, "price": 199} ],<br>&nbsp;&nbsp;"coupon": "DIWALI10" }</code>' }
          ]),
          f(2, '<b>Wide-column:</b> rows are grouped into <b>partitions</b> by the partition key (channel + day) and <b>sorted</b> inside by the clustering key (ts). "Latest 50 messages in #general today" reads one partition from one replica set, already in order.', [
            { type: 'table', label: 'partition (general, 2026-10-14)  — sorted by ts DESC', columns: ['ts', 'msg_id', 'author', 'body'], rows: [['09:15:42', 'm6', 'ravi', 'Yes!'], ['09:15:42', 'm4', 'asha', 'Lunch?'], ['08:59:00', 'm3', 'mei', 'Deploy went fine']], hl: { 0: 'ok', 1: 'ok', 2: 'ok' } },
            { type: 'table', label: 'partition (general, 2026-10-13)', columns: ['ts', 'msg_id', 'author', 'body'], rows: [['09:02:10', 'm2', 'ravi', 'Standup in 5'], ['09:00:01', 'm1', 'asha', 'Good morning!']], hl: { 0: 'done', 1: 'done' } }
          ]),
          f(3, '<b>Graph:</b> people are nodes, "follows" are edges. "Who should Asha follow?" = walk 2 hops and count paths. Each hop follows stored pointers instead of re-searching an index.', [
            { type: 'graph', directed: true, height: 50, nodes: [{ id: 1, label: 'Asha', x: 8, y: 25 }, { id: 2, label: 'Ravi', x: 35, y: 8 }, { id: 3, label: 'Mei', x: 35, y: 42 }, { id: 4, label: 'Tom', x: 65, y: 8 }, { id: 5, label: 'Zara', x: 65, y: 42 }, { id: 7, label: 'Nia', x: 92, y: 42 }],
              edges: [[1, 2], [1, 3], [2, 3], [2, 4], [3, 5], [3, 4], [4, 5], [5, 7]], hl: { 1: 'cur', 4: 'sel', 5: 'sel' }, ehl: { '2-4': 'ok', '3-4': 'ok', '3-5': 'ok' }, tags: { 4: '2 paths', 5: '1 path' } }
          ]),
          f(4, '<b>Relational</b> is still the default: any question, joins, constraints, ACID. NoSQL wins when one access pattern dominates at a scale or shape where SQL hurts. Many teams use both (polyglot persistence) connected by CDC.', [
            { type: 'text', html: 'Rule of thumb: <b>start relational</b> (Postgres) unless you can name the access pattern and scale that it cannot serve; then pick the family whose <i>native</i> shape matches that pattern.' }
          ])
        ];
      }
    }, {
      title: 'Query-first modelling: why one table per query in a wide-column store',
      input: 'general@2026-10-14 random@2026-10-14 general@2026-10-13 general@2026-10-14',
      inputLabel: 'messages as channel@day (2-10 items) — watch them land in partitions',
      gen: function (input) {
        var items = String(input || '').trim().split(/\s+/).filter(Boolean);
        if (items.length < 2 || items.length > 10) throw new Error('Give 2..10 messages like general@2026-10-14');
        var parts = {}, order = [], frames = [];
        items.forEach(function (it) { if (!/^[a-z0-9_-]+@\d{4}-\d{2}-\d{2}$/i.test(it)) throw new Error('Each message must look like channel@YYYY-MM-DD (got ' + it + ')'); });
        frames.push({ narr: 'Table <code>messages_by_channel</code>, PRIMARY KEY ((channel_id, day), ts). The pair (channel_id, day) is hashed to choose the <b>partition</b> (and therefore the replica nodes). Inside a partition rows are kept <b>sorted by ts</b>.', parts: [
          { type: 'array', label: 'incoming messages', values: items.slice() },
          { type: 'map', label: 'partitions (rows)', entries: [] }
        ] });
        items.forEach(function (it, i) {
          var key = it.replace('@', ' | ');
          if (!parts[key]) { parts[key] = 0; order.push(key); }
          parts[key]++;
          var node = 'node-' + String.fromCharCode(65 + (fnv32(key) % 3));
          var hl = {}; hl[i] = 'cur'; var mh = {}; mh[key + ' → ' + node] = parts[key] === 1 ? 'ok' : 'cur';
          frames.push({ narr: 'Message ' + (i + 1) + ' (' + it + '): hash(' + key + ') → <b>' + node + '</b>. ' + (parts[key] === 1 ? 'New partition created.' : 'Appended to an existing partition (kept sorted by ts).'), parts: [
            { type: 'array', label: 'incoming messages', values: items.slice(), hl: hl },
            { type: 'map', label: 'partitions (rows)', entries: order.map(function (k) { return [k + ' → ' + 'node-' + String.fromCharCode(65 + (fnv32(k) % 3)), parts[k] + ' row(s)']; }), hl: mh }
          ] });
        });
        frames.push({ narr: '<span class="c-g">Query 1</span> "latest messages in general on 2026-10-14" names the full partition key → reads exactly <b>one partition</b>, already sorted. This is the query the table was designed for.', parts: [
          { type: 'code', label: 'CQL', lang: 'sql', code: "SELECT * FROM messages_by_channel\nWHERE channel_id = 'general' AND day = '2026-10-14'\nLIMIT 50;", hl: { 2: 'ok' } },
          { type: 'map', label: 'partitions', entries: order.map(function (k) { return [k, parts[k] + ' row(s)']; }), hl: (function () { var o = {}; if (parts['general | 2026-10-14']) o['general | 2026-10-14'] = 'ok'; return o; })() }
        ] });
        frames.push({ narr: '<span class="c-r">Query 2</span> "all messages by ravi" does not include the partition key → the store would have to scan <b>every partition on every node</b>. Cassandra refuses unless you add <code>ALLOW FILTERING</code> (a red flag in reviews). Fix: a second table <code>messages_by_author</code> written alongside the first.', parts: [
          { type: 'code', label: 'CQL', lang: 'sql', code: "SELECT * FROM messages_by_channel\nWHERE author = 'ravi';            -- rejected\n\nCREATE TABLE messages_by_author (\n  author text, month text, ts timeuuid, channel_id text, body text,\n  PRIMARY KEY ((author, month), ts));", hl: { 2: 'bad', 4: 'ok' } },
          { type: 'map', label: 'partitions scanned for query 2', entries: order.map(function (k) { return [k, 'scan']; }), hl: (function () { var o = {}; order.forEach(function (k) { o[k] = 'bad'; }); return o; })() }
        ] });
        return frames;
      }
    }],
    examples: [
      { title: 'Document: query inside embedded arrays', html: `<p>"Which of Asha's orders contain a mug?" — filter on a nested field and look inside the <code>items</code> array. In MongoDB: <code>db.orders.find({"customer.id": 7, "items.sku": "MUG-2"})</code> with a multikey index on <code>items.sku</code>. Answer: <b>o3</b>.</p>`, code: { lang: 'sql', db: 'nosql', code: `SELECT id
FROM docs
WHERE collection = 'orders'
  AND json_extract(body, '$.customer.id') = 7
  AND EXISTS (SELECT 1 FROM json_each(body, '$.items')
              WHERE json_extract(value, '$.sku') = 'MUG-2');` } },
      { title: 'Wide-column: read one sorted partition', html: `<p>The SQLite table is declared <code>WITHOUT ROWID</code> with primary key (channel_id, day, ts, msg_id) — physically clustered exactly like a Cassandra partition + clustering key. The "latest 3 in #general today" query is a single range read. Note m4 and m6 share a timestamp; the msg_id tiebreaker (timeuuid in Cassandra) keeps both.</p>`, code: { lang: 'sql', db: 'nosql', code: `SELECT ts, msg_id, author, body
FROM messages_by_channel
WHERE channel_id = 'general' AND day = '2026-10-14'
ORDER BY ts DESC, msg_id DESC
LIMIT 3;` } },
      { title: 'Graph: friends-of-friends and shortest path', html: `<p>Recommend people Asha does not follow yet, ranked by mutual paths: <b>Tom (2, via Ravi and Mei)</b>, <b>Zara (1)</b>. In Cypher this is <code>MATCH (a:Person {name:'Asha'})-[:FOLLOWS]-&gt;()-[:FOLLOWS]-&gt;(r) WHERE NOT (a)-[:FOLLOWS]-&gt;(r) AND r &lt;&gt; a RETURN r.name, count(*)</code>. In SQL each extra hop is another self-join (or a recursive CTE), which is where graph databases shine.</p>`, code: { lang: 'sql', db: 'nosql', code: `SELECT p.name, COUNT(*) AS mutual_paths, GROUP_CONCAT(m.name) AS via
FROM follows AS f1
JOIN follows AS f2 ON f2.src = f1.dst
JOIN people  AS p  ON p.id = f2.dst
JOIN people  AS m  ON m.id = f1.dst
WHERE f1.src = 1
  AND f2.dst <> 1
  AND f2.dst NOT IN (SELECT dst FROM follows WHERE src = 1)
GROUP BY p.id
ORDER BY mutual_paths DESC, p.name;` } },
      { title: 'Key-value with TTL', html: `<p>Redis <code>SET session:ab12 '{...}' EX 3600</code> stores a value that disappears by itself. Our emulation keeps <code>expires_at</code>; a read must ignore expired keys (Redis does this lazily on access plus a background sampler). At "now" = 1760450000, only the live session and the feature flag survive.</p>`, code: { lang: 'sql', db: 'nosql', code: `SELECT k, v
FROM kv
WHERE expires_at IS NULL OR expires_at > 1760450000;   -- treat 1760450000 as "now"` } },
      { title: 'DynamoDB single-table design', html: `<p>One table, generic keys. Querying <code>PK = "USER#7"</code> returns the profile <i>and</i> recent orders (sorted by SK) in a single request. A GSI with <code>GSI1PK = "ORDER#o3"</code> serves "find order by id". Each item type is chosen to answer a known access pattern.</p>`, code: { lang: 'json', code: `[
  { "PK": "USER#7", "SK": "PROFILE",              "name": "Asha", "email": "asha@mail.com" },
  { "PK": "USER#7", "SK": "ORDER#2026-10-01#o1",  "status": "paid",    "total": 570, "GSI1PK": "ORDER#o1" },
  { "PK": "USER#7", "SK": "ORDER#2026-10-05#o3",  "status": "pending", "total": 599, "GSI1PK": "ORDER#o3" },
  { "PK": "PRODUCT#PEN-1", "SK": "META", "name": "Gel Pen", "price": 40 }
]` } }
    ],
    deepDive: `<p><b>Wide-column internals.</b> Cassandra/ScyllaDB write path: commit log append → memtable → flush to immutable <b>SSTables</b> (an LSM-tree, see the storage-engines module) → compaction. That is why writes are cheap and why deletes write <b>tombstones</b> (a queue modelled as insert-then-delete creates millions of tombstones and slow reads). Each partition lives on RF replicas chosen by the token ring; queries must name the partition key so the coordinator knows where to go. Large partitions (hundreds of MB) cause heap pressure, slow repairs and hotspots; materialized views and secondary indexes exist but have caveats (SAI in Cassandra 5 improves indexes considerably). Discord famously moved trillions of messages from Cassandra to ScyllaDB with exactly the <code>(channel_id, bucket)</code> partition design.</p>
<p><b>Document internals.</b> MongoDB stores BSON in WiredTiger (B-tree + compression); shards by a shard key (hashed or ranged) into chunks balanced by a balancer; a replica set per shard uses a Raft-like protocol; <code>writeConcern: majority</code> + <code>readConcern: majority/linearizable</code> tune durability and freshness; multi-document transactions exist (since 4.0/4.2) but cost more — model so that most writes touch one document (single-document writes are atomic). Anti-patterns: unbounded arrays (comments inside a post), massive documents, and shard keys on <code>_id</code> ObjectIds (monotonic → hot chunk).</p>
<p><b>Graph internals.</b> Native graph stores (Neo4j) keep fixed-size node and relationship records with pointers to adjacent records, so a hop is pointer chasing, O(degree) rather than an index lookup; sharding graphs is hard because good partitions cut few edges (an NP-hard problem), so many graph DBs scale reads with replicas rather than sharding writes. Supernodes (a celebrity with 50 M edges) need special handling, like hot keys.</p>
<p><b>Key-value internals.</b> Redis is single-threaded per shard for commands (I/O threads help networking), keeps data in RAM with optional AOF/RDB persistence, and clusters via 16 384 hash slots; DynamoDB partitions by hash of PK, each partition ~10 GB and bounded throughput, with adaptive capacity to absorb skew. etcd/ZooKeeper are KV stores built on consensus for small, critical metadata — not for bulk data.</p>`,
    aiEra: `<p><b>What AI changes:</b> the newest "NoSQL family" is the <b>vector store</b>: embeddings (arrays of ~768-3072 floats) indexed with approximate nearest neighbour structures like HNSW or IVF. The question "dedicated vector DB or pgvector / MongoDB Atlas Vector Search / Cassandra SAI vectors?" is now a routine interview topic; the usual answer is "keep vectors next to the source data until scale or recall/latency targets force a specialised engine". Document stores pair naturally with LLM output (JSON in, JSON out), and graph databases are used for <b>GraphRAG</b> — knowledge graphs that ground LLM answers in relationships.</p>
<p><b>Use AI as a partner:</b> give it your list of access patterns and ask it to draft a DynamoDB single-table or Cassandra schema <i>and</i> to list which query each table serves; then review the partition sizes and hot keys yourself.</p>
<p><b>Where AI goes wrong:</b> it designs Cassandra tables relationally (then needs <code>ALLOW FILTERING</code>), embeds unbounded arrays in documents, or picks a graph DB for what is really a simple one-hop lookup. <b>What you must own:</b> the access-pattern list, partition sizing math, and the decision of what to duplicate and how to keep copies in sync.</p>`,
    problems: [{
      title: 'Model a Chat App in a Wide-Column Store',
      level: 'Medium', tags: ['cassandra', 'data modelling', 'wide-column'], companies: ['Discord', 'Slack', 'Meta'],
      statement: `<p>Design Cassandra tables for a chat app with these access patterns:</p>
<ol><li>Show the latest 50 messages of a channel, then page backwards in time.</li><li>Show all messages a user wrote in the last month (moderation).</li><li>Unread count per user per channel.</li></ol>
<p>Each channel can receive up to <b>1 million messages per day</b> at peak; there are 50 million channels. Provide CQL DDL and the query for each pattern, and explain partition sizing.</p>`,
      constraints: `Every query must hit a single partition (no ALLOW FILTERING). Keep partitions under ~100 MB. Average message ≈ 200 bytes.`,
      example: `<p>Pattern 1 for channel ${H.c('b', 'general')} on 2026-10-14 → partition <code>(general, 2026-10-14)</code>, read ${H.c('g', '50 rows sorted by ts DESC')}. A busy channel: 1 M msgs × 200 B = ${H.c('y', '~200 MB/day')} → too big for a daily bucket, so busy channels need hourly buckets.</p>`,
      brute: { why: `<p>Model it relationally: one <code>messages</code> table keyed by message id, then filter by channel and sort. Cassandra cannot sort across partitions or filter on non-key columns, so every query scans the whole cluster with <code>ALLOW FILTERING</code> — fine with 100 rows, a disaster with billions.</p>`, code: { lang: 'text', check: false, code: `CREATE TABLE chat.messages (
    msg_id     uuid PRIMARY KEY,
    channel_id text,
    author_id  bigint,
    ts         timestamp,
    body       text
);
-- full-cluster scan + no global ORDER BY possible:
SELECT * FROM chat.messages WHERE channel_id = 'general' ALLOW FILTERING;` } },
      mcq: { q: 'A Cassandra query filters only on a clustering column, not the partition key. What happens?', options: ['It uses the clustering index and is fast', 'It is rejected unless ALLOW FILTERING is added, and then scans all partitions', 'Cassandra automatically creates a secondary index', 'It reads only the coordinator node'], answer: 1, explain: 'Without the partition key the coordinator does not know which nodes hold the data, so it must scan everything — Cassandra makes you opt in explicitly.' },
      hints: [
        `<p>Hint 1: Write one table per access pattern. Each table's partition key = exactly what the query provides with <code>=</code>.</p>`,
        `<p>Hint 2: Sizing: rows/partition × bytes/row. 1 M × 200 B = 200 MB/day, so busy channels need a smaller bucket (hour) — or an adaptive bucket stored in channel metadata.</p>`,
        `<p>Hint 3: Unread counts change constantly: use a <code>counter</code> table keyed by user, or store a per-user "last read message ts" per channel and compute unread on the fly from pattern 1's table.</p>`
      ],
      tests: { engine: 'sqlite', check: '(rows, cols, c) => {\n  if (c.plan || c.noplan) { const d = rows.map(r => r[r.length - 1]).join(\'\\n\'); return (!c.plan || new RegExp(c.plan).test(d)) && (!c.noplan || !new RegExp(c.noplan).test(d)); }\n  let a = rows, b = c.rows || [];\n  if (c.set) { const k = r => JSON.stringify(r); a = a.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); b = b.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); }\n  return a.length === b.length && a.every((r, i) => r.length === b[i].length && r.every((v, j) => v === b[i][j] || (typeof v === \'number\' && typeof b[i][j] === \'number\' && Math.abs(v - b[i][j]) < 1e-6)));\n}', db: 'nosql', cases: [
        { setup: '', rows: [
            ['general', '2026-10-14', 3],
            ['general', '2026-10-13', 2],
            ['random', '2026-10-14', 1]
          ], set: true },
        { setup: 'DELETE FROM messages_by_channel', rows: [] },
        { setup: 'INSERT INTO messages_by_channel VALUES (\'general\',\'2026-10-14\',\'09:16:00\',\'m7\',\'mei\',\'x\'),(\'general\',\'2026-10-14\',\'09:17:00\',\'m8\',\'mei\',\'y\')', rows: [
            ['general', '2026-10-14', 5],
            ['general', '2026-10-13', 2],
            ['random', '2026-10-14', 1]
          ], set: true },
        { setup: 'INSERT INTO messages_by_channel VALUES (\'dev\',\'2026-10-15\',\'00:00:00\',\'m9\',\'mei\',\'x\')', rows: [
            ['general', '2026-10-14', 3],
            ['general', '2026-10-13', 2],
            ['random', '2026-10-14', 1],
            ['dev', '2026-10-15', 1]
          ], set: true },
        { setup: 'DELETE FROM messages_by_channel WHERE channel_id = \'general\'', rows: [
            ['random', '2026-10-14', 1]
          ] },
        { setup: 'INSERT INTO messages_by_channel VALUES (\'random\',\'2026-10-14\',\'10:00:01\',\'m7\',\'a\',\'x\'),(\'random\',\'2026-10-14\',\'10:00:02\',\'m8\',\'a\',\'y\'),(\'random\',\'2026-10-14\',\'10:00:03\',\'m9\',\'a\',\'z\'),(\'random\',\'2026-10-14\',\'10:00:04\',\'m10\',\'a\',\'w\')', rows: [
            ['random', '2026-10-14', 5],
            ['general', '2026-10-14', 3],
            ['general', '2026-10-13', 2]
          ], set: true },
        { setup: 'DELETE FROM messages_by_channel WHERE msg_id IN (\'m1\', \'m2\')', rows: [
            ['general', '2026-10-14', 3],
            ['random', '2026-10-14', 1]
          ], set: true }
      ] },
      solution: {
        approach: `<p><b>Table 1</b> <code>messages_by_channel</code>: partition <code>(channel_id, bucket)</code>, clustering <code>ts timeuuid DESC</code>. Bucket = day for normal channels; for channels flagged "hot" in a <code>channels</code> table, bucket = hour (1 M/24 ≈ 42 K msgs ≈ 8 MB per partition). Paging backwards: read the current bucket with <code>ts &lt; last_seen</code>, move to the previous bucket when it runs out. <b>Table 2</b> <code>messages_by_author</code>: partition <code>(author_id, month)</code> — a human cannot write enough in a month to overflow it. Written together with table 1 (logged batch, or app double-write with idempotent retries). <b>Table 3</b> <code>read_state</code>: partition <code>user_id</code>, clustering <code>channel_id</code>, storing <code>last_read_ts</code>; unread = count of rows in table 1 newer than it (capped at "99+"), which avoids counter-table drift. All queries are single-partition with LOCAL_QUORUM.</p>`,
        code: { lang: 'text', check: false, code: `CREATE TABLE chat.channels (
    channel_id  text PRIMARY KEY,
    bucket_kind text            -- 'day' or 'hour' (hot channels)
);

CREATE TABLE chat.messages_by_channel (
    channel_id text,
    bucket     text,            -- '2026-10-14' or '2026-10-14T09'
    ts         timeuuid,
    msg_id     uuid,
    author_id  bigint,
    author_name text,           -- denormalised for rendering
    body       text,
    PRIMARY KEY ((channel_id, bucket), ts)
) WITH CLUSTERING ORDER BY (ts DESC);

CREATE TABLE chat.messages_by_author (
    author_id  bigint,
    month      text,            -- '2026-10'
    ts         timeuuid,
    channel_id text,
    body       text,
    PRIMARY KEY ((author_id, month), ts)
) WITH CLUSTERING ORDER BY (ts DESC);

CREATE TABLE chat.read_state (
    user_id      bigint,
    channel_id   text,
    last_read_ts timeuuid,
    PRIMARY KEY (user_id, channel_id)
);

-- 1. latest 50, then older pages
SELECT ts, author_name, body FROM chat.messages_by_channel
 WHERE channel_id = 'general' AND bucket = '2026-10-14' LIMIT 50;
SELECT ts, author_name, body FROM chat.messages_by_channel
 WHERE channel_id = 'general' AND bucket = '2026-10-14' AND ts < maxTimeuuid('2026-10-14 09:00:00+0000') LIMIT 50;
-- 2. moderation
SELECT ts, channel_id, body FROM chat.messages_by_author
 WHERE author_id = 42 AND month = '2026-10';
-- 3. unread
SELECT channel_id, last_read_ts FROM chat.read_state WHERE user_id = 42;` },
        alt: [{ lang: 'sql', db: 'nosql', title: 'Same partition + clustering idea, runnable in SQLite', code: `-- WITHOUT ROWID stores rows physically ordered by the primary key,
-- like a wide-column partition: (channel_id, day) then ts.
SELECT channel_id, day, COUNT(*) AS rows_in_partition
FROM messages_by_channel
GROUP BY channel_id, day
ORDER BY rows_in_partition DESC;   -- the partition-size report you would monitor` }],
        complexity: `<p>Each read: one partition, O(log n + page) on the replica. Storage: messages stored twice (by channel and by author) — the normal NoSQL trade of disk for single-partition reads. Partition size: hourly bucket on the hottest channel ≈ 8 MB.</p>`,
        followUps: ['How would you delete a message so it disappears from both tables?', 'How do you avoid tombstone pile-ups when users delete many messages?', 'Where would full-text search over messages live?']
      }
    }]
  });

  /* =====================================================================
     TOPIC 5 — CAP, PACELC & consistency models in practice
     ===================================================================== */
  topics.push({
    title: 'CAP and PACELC in Practice (plus the Consistency Models Ladder)',
    analogy: `<p>Two bank branches share one ledger by phone. A storm cuts the phone line (a <b>partition</b>). A customer at the small branch wants to withdraw. The branch can <b>refuse</b> ("sorry, systems down" — consistent but not available) or <b>pay out</b> and hope the other branch did not also pay the same money ("available" but possibly inconsistent). That is <b>CAP</b>. Even on sunny days, phoning the other branch before every answer makes customers wait — <b>PACELC</b> adds that everyday trade-off: <b>latency vs consistency</b>.</p>`,
    explain: `<p><b>CAP theorem</b> (Brewer, proved by Gilbert &amp; Lynch): in a system replicated over a network, when a <b>network partition</b> (P) happens — some nodes cannot talk to others — every operation must choose between:</p>
<ul><li><b>C — Consistency</b> (specifically <i>linearizability</i>): every read sees the latest completed write, as if there were one copy.</li>
<li><b>A — Availability</b>: every request to a non-failed node gets a non-error answer.</li></ul>
<p>Partitions are not optional in real networks, so "CA systems" do not exist once you have more than one machine. The real meaning: <b>during a partition, do you refuse some requests (CP) or answer with possibly stale/conflicting data (AP)?</b> Outside partitions you can have both.</p>
${H.table(['Behaviour in a partition', 'Examples (typical config)', 'User sees'], [
  ['<b>CP</b>: minority side refuses', 'etcd, ZooKeeper, Consul, Spanner, CockroachDB, MongoDB w/ majority, HBase', 'errors/timeouts on the cut-off side, never wrong data'],
  ['<b>AP</b>: every side keeps answering', 'Cassandra/Scylla at ONE, DynamoDB eventually-consistent reads, CouchDB, Riak, DNS', 'always an answer, maybe stale; conflicts merged later']
])}
<p><b>PACELC</b> (Daniel Abadi) completes the picture: <b>if P</b>artition → choose <b>A</b> or <b>C</b>; <b>E</b>lse (normal operation) → choose <b>L</b>atency or <b>C</b>onsistency. Waiting for remote replicas before answering costs round trips even when nothing is broken.</p>
${H.table(['System (default-ish)', 'PACELC', 'Why'], [
  ['Cassandra, ScyllaDB, Riak, Dynamo', 'PA / EL', 'answers from any replica, low latency; consistency tunable per query'],
  ['DynamoDB', 'PA / EL (EC with strongly consistent reads)', 'default reads are eventually consistent; strong reads cost 2× and go to the leader'],
  ['MongoDB', 'PA / EC (configurable)', 'reads from primary by default; with majority concerns it behaves CP'],
  ['Spanner, CockroachDB, etcd, ZooKeeper', 'PC / EC', 'consensus on every write; reads served by leaders/leaseholders'],
  ['Async-replicated Postgres/MySQL', 'PA-ish / EL for replica reads', 'replicas answer stale; leader failover may lose writes']
])}
<p><b>Consistency is a ladder, not a switch.</b> From strongest to weakest:</p>
${H.table(['Model', 'Plain meaning', 'Example promise'], [
  ['<b>Linearizable</b> (strong)', 'behaves like one copy; once a write finishes, everyone sees it', 'a username is either taken or not, for everyone'],
  ['<b>Sequential</b>', 'everyone sees the same order of operations, maybe lagging', 'all replicas apply the same log'],
  ['<b>Causal</b>', 'if B depends on A, everyone sees A before B; unrelated writes may differ', 'never see a reply before its question'],
  ['<b>Session guarantees</b>', 'read-your-writes, monotonic reads, writes-follow-reads for one user', 'my edits never vanish for me'],
  ['<b>Eventual</b>', 'if writes stop, replicas converge… eventually', 'like counts, view counts, DNS']
])}
<p>Strong consistency costs <b>latency</b> (coordination) and <b>availability</b> (during partitions). The skill is choosing <b>per feature</b>: payments and inventory decrements need linearizable operations; a "likes" counter is fine eventually; profile edits need read-your-writes.</p>`,
    clues: [
      '"must stay up even if a datacenter is cut off" → AP; ask what anomalies are acceptable',
      '"never sell the same seat twice" / "no double spend" → CP (consensus or single leader) for that operation',
      '"what happens during a network partition?" → explain CAP choice per operation, not per product',
      '"low latency globally AND strong consistency" → PACELC: you pay latency (Spanner) or relax consistency',
      '"likes / views / counters" → eventual consistency + CRDT counters',
      '"after I post, I must see my post" → session guarantee (read-your-writes), not full linearizability'
    ],
    code: [
      { lang: 'sql', title: 'PACELC cheat sheet as a queryable table (runnable)', code: `CREATE TABLE systems (
  name        TEXT PRIMARY KEY,
  on_partition TEXT CHECK (on_partition IN ('A', 'C')),   -- P → A or C
  else_choice  TEXT CHECK (else_choice  IN ('L', 'C')),   -- E → L or C
  note        TEXT
);
INSERT INTO systems VALUES
  ('Cassandra (CL=ONE)',        'A', 'L', 'tunable: QUORUM reads+writes give strong reads'),
  ('DynamoDB (default reads)',  'A', 'L', 'ConsistentRead=true → leader read, 2x cost'),
  ('MongoDB (majority)',        'C', 'C', 'primary reads, writeConcern majority'),
  ('Spanner',                   'C', 'C', 'Paxos + TrueTime commit wait'),
  ('CockroachDB',               'C', 'C', 'Raft per range, serializable'),
  ('etcd / ZooKeeper',          'C', 'C', 'consensus for metadata, leader election'),
  ('Postgres async replica reads', 'A', 'L', 'stale reads possible, lag-dependent');

-- Which systems keep answering on the cut-off side of a partition?
SELECT name, 'P' || on_partition || '/E' || else_choice AS pacelc, note
FROM systems
WHERE on_partition = 'A'
ORDER BY name;` },
      { lang: 'python', run: true, title: 'Partition simulator: CP majority rule vs AP accept-everything (runnable)', code: `# 3 replicas: n1, n2 in East, n3 in West. The link East <-> West is cut.
# CP rule: a write/read succeeds only if the contacted node can reach a MAJORITY (2 of 3).
# AP rule: any live node answers with whatever it has.

sides = {"n1": "east", "n2": "east", "n3": "west"}
store = {n: 1 for n in sides}          # x = 1 everywhere before the partition
accepted = []                          # (side, value) of every write that succeeded


def reachable(node):
    return [m for m in sides if sides[m] == sides[node]]   # partition: only same side


def write(mode, node, value):
    peers = reachable(node)
    if mode == "CP" and len(peers) < 2:
        return f"{node}: write x={value} REJECTED (no majority, {len(peers)}/3)"
    for p in peers:
        store[p] = value
    accepted.append((sides[node], value))
    return f"{node}: write x={value} OK on {peers}"


def read(mode, node):
    if mode == "CP" and len(reachable(node)) < 2:
        return f"{node}: read REJECTED (cannot prove it is up to date)"
    return f"{node}: read x={store[node]}"


for mode in ("CP", "AP"):
    for n in sides:
        store[n] = 1
    accepted.clear()
    print(f"--- {mode} ---")
    print(write(mode, "n3", 2))        # West client, minority side
    print(write(mode, "n1", 3))        # East client, majority side
    print(read(mode, "n3"))
    print(read(mode, "n1"))
    conflict = len({side for side, _ in accepted}) > 1
    print("replicas:", dict(store))
    print("conflict after healing:", conflict, "" if conflict else "(n3 is only behind; it just catches up)")
` }
    ],
    codeTitle: ['PACELC table', 'CP vs AP simulation'],
    viz: {
      title: 'A network partition: CP refuses, AP diverges',
      input: 'AP',
      inputLabel: 'CP or AP',
      gen: function (input) {
        var mode = String(input || '').trim().toUpperCase();
        if (mode !== 'CP' && mode !== 'AP') throw new Error('Type CP or AP');
        var nodes = [
          { id: 'C1', label: 'Client East', x: 8, y: 14, shape: 'box' }, { id: 'N1', label: 'n1 (East)', x: 36, y: 8, shape: 'box' }, { id: 'N2', label: 'n2 (East)', x: 36, y: 34, shape: 'box' },
          { id: 'N3', label: 'n3 (West)', x: 76, y: 20, shape: 'box' }, { id: 'C2', label: 'Client West', x: 94, y: 48, shape: 'box' }
        ];
        var edges = [['C1', 'N1'], ['N1', 'N2', 'repl'], ['N1', 'N3', 'repl'], ['N2', 'N3', 'repl'], ['C2', 'N3']];
        var cut = { 'N1-N3': 'bad', 'N2-N3': 'bad' };
        var x = { N1: 1, N2: 1, N3: 1 }, frames = [];
        function tg() { return { N1: 'x=' + x.N1, N2: 'x=' + x.N2, N3: 'x=' + x.N3 }; }
        function g(hl, eh) { return { type: 'graph', directed: false, height: 56, nodes: nodes, edges: edges, hl: hl || {}, ehl: eh || {}, tags: tg() }; }
        frames.push({ narr: 'Three replicas of x across two datacenters, all holding <b>x = 1</b>. Mode: <b>' + mode + '</b>. Writes normally replicate to everyone.', parts: [g({}, { 'N1-N2': 'ok', 'N1-N3': 'ok', 'N2-N3': 'ok' })] });
        frames.push({ narr: '<span class="c-r">Partition!</span> The East↔West link is cut. n1 and n2 (2 of 3 = a majority) can still talk. n3 is alone. Nothing has crashed — the nodes simply cannot hear each other.', parts: [g({ N3: 'cur' }, cut)] });
        if (mode === 'CP') {
          frames.push({ narr: 'West client writes <b>x = 2</b> to n3. n3 cannot reach a majority, so it <span class="c-r">rejects the write</span> (error or timeout). Unavailable for this client — but nothing inconsistent was accepted.', parts: [g({ N3: 'bad', C2: 'bad' }, Object.assign({ 'C2-N3': 'bad' }, cut)), { type: 'vars', label: 'West client', vals: { request: 'write x=2', result: 'ERROR: no quorum' }, hl: { result: 'bad' } }] });
          x.N1 = 3; x.N2 = 3;
          frames.push({ narr: 'East client writes <b>x = 3</b>. n1 reaches n2: majority (2/3) → <span class="c-g">committed</span>. The majority side keeps working normally.', parts: [g({ N1: 'ok', N2: 'ok' }, Object.assign({ 'C1-N1': 'ok', 'N1-N2': 'ok' }, cut))] });
          frames.push({ narr: 'West client reads x from n3. n3 holds x = 1 but cannot confirm it is current, so a linearizable read is <span class="c-r">refused</span> too. (Some systems allow an explicitly "stale OK" read here — that is choosing A for that one query.)', parts: [g({ N3: 'bad' }, Object.assign({ 'C2-N3': 'bad' }, cut)), { type: 'vars', label: 'West client', vals: { request: 'read x', result: 'ERROR (would be stale: 1 vs 3)' }, hl: { result: 'bad' } }] });
          x.N3 = 3;
          frames.push({ narr: 'Partition heals. n3 catches up from the log to <b>x = 3</b>. No conflicts to resolve, ever — the price was downtime for West during the partition.', parts: [g({ N3: 'ok' }, { 'N1-N3': 'ok', 'N2-N3': 'ok' })] });
        } else {
          x.N3 = 2;
          frames.push({ narr: 'West client writes <b>x = 2</b> to n3. AP: n3 <span class="c-g">accepts</span> it locally and promises to sync later. Available — but East does not know.', parts: [g({ N3: 'ok' }, Object.assign({ 'C2-N3': 'ok' }, cut))] });
          x.N1 = 3; x.N2 = 3;
          frames.push({ narr: 'East client writes <b>x = 3</b> to n1 → accepted on n1 and n2. Now the replicas <span class="c-r">disagree</span>: East says 3, West says 2.', parts: [g({ N1: 'ok', N2: 'ok', N3: 'bad' }, Object.assign({ 'C1-N1': 'ok', 'N1-N2': 'ok' }, cut))] });
          frames.push({ narr: 'West client reads x → gets <b>2</b>. An East client reading at the same moment gets <b>3</b>. Two users see different "truths": not linearizable.', parts: [g({ N3: 'bad', N1: 'cur' }, Object.assign({ 'C2-N3': 'cur', 'C1-N1': 'cur' }, cut)), { type: 'table', label: 'Concurrent reads', columns: ['client', 'node', 'x'], rows: [['East', 'n1', 3], ['West', 'n3', 2]], hl: { 1: 'bad' } }] });
          x.N3 = 3;
          frames.push({ narr: 'Partition heals. Replicas exchange data and find a <b>conflict</b> (2 vs 3). With last-write-wins (by timestamp) x = 3 survives and the West write is <span class="c-r">silently lost</span>; with version vectors both are kept as siblings for the app to merge; with a CRDT they merge automatically.', parts: [g({ N3: 'sel' }, { 'N1-N3': 'ok', 'N2-N3': 'ok' }), { type: 'table', label: 'Conflict resolution', columns: ['strategy', 'result'], rows: [['LWW', 'x = 3, West write lost'], ['siblings', 'x = {2, 3} → app decides'], ['CRDT (e.g. max-register / counter)', 'deterministic merge']], hl: { 0: 'bad', 1: 'sel', 2: 'ok' } }] });
        }
        frames.push({ narr: '<b>PACELC — the "Else" part.</b> No partition now. To give strong reads, every write must reach a majority, including across the ocean: ~80 ms. Accepting a local write and replicating asynchronously: ~2 ms. That everyday latency cost is why many systems choose <b>EL</b> by default.', parts: [
          { type: 'bars', label: 'write latency (ms)', values: [80, 2], idxLabels: ['EC: wait for remote majority', 'EL: local ack, async replicate'], hl: { 0: 'cur', 1: 'ok' } },
          { type: 'table', label: 'PACELC', columns: ['system', 'if Partition', 'Else'], rows: [['Cassandra / Dynamo', 'A', 'L'], ['Spanner / CockroachDB', 'C', 'C'], ['MongoDB (majority)', 'C', 'C'], ['DynamoDB default reads', 'A', 'L']], hl: mode === 'CP' ? { 1: 'sel' } : { 0: 'sel' } }
        ] });
        return frames;
      }
    },
    examples: [
      { title: 'Same database, CP or AP per query', html: `<p>Cassandra with replication factor 3 in one DC, partition splits nodes 2 | 1. A client on the 1-node side using <code>CONSISTENCY QUORUM</code> gets <span class="c-r">Unavailable</span> errors (CP behaviour); the same client using <code>CONSISTENCY ONE</code> succeeds with possibly stale data (AP behaviour). CAP describes <b>operations</b>, not product logos.</p>` },
      { title: 'DynamoDB read cost of consistency', html: `<p>An eventually consistent read of an item up to 4 KB costs <b>0.5</b> read capacity units; a strongly consistent read costs <b>1</b>, must go to the partition's leader, and is not offered on global secondary indexes. PACELC in a price list: consistency costs latency and money.</p>`, code: { lang: 'json', code: `{
  "TableName": "Carts",
  "Key": { "PK": { "S": "USER#9" }, "SK": { "S": "CART" } },
  "ConsistentRead": true
}` } },
      { title: 'Which consistency model does a feature need?', html: `${H.table(['Feature', 'Minimum model', 'Why'], [['username uniqueness', 'linearizable', 'two people must never both get "asha"'], ['bank transfer', 'serializable transaction', 'invariants across rows'], ['comment threads', 'causal', 'reply must not appear before the comment'], ['my profile edit', 'read-your-writes', 'only the author must see it immediately'], ['view counter', 'eventual', 'off by a few for a second is fine']])}<p>Strong where it matters, cheap everywhere else.</p>` },
      { title: 'Query the PACELC cheat sheet', html: `<p>Using the reference table, list systems that stay consistent during partitions <i>and</i> pay latency normally (PC/EC). This makes a handy revision tool before interviews.</p>`, code: { lang: 'sql', code: `CREATE TABLE s (name TEXT, p TEXT, e TEXT);
INSERT INTO s VALUES ('Cassandra','A','L'), ('Spanner','C','C'), ('CockroachDB','C','C'), ('DynamoDB','A','L'), ('etcd','C','C');
SELECT name FROM s WHERE p = 'C' AND e = 'C' ORDER BY name;` } }
    ],
    deepDive: `<p><b>Precise CAP.</b> Gilbert &amp; Lynch's proof is short: split nodes into G1 and G2 with all messages between them lost. Write v1 in G1; if the system is available, G1 must acknowledge. Read from G2; if available, G2 must answer, but it never heard of v1, so it returns the old value — not linearizable. Note how narrow the definitions are: "A" means <i>every</i> non-failed node answers, which even Spanner does not promise; "C" is linearizability, not the C of ACID (which means invariants/constraints hold). Kleppmann's critique: CAP is too coarse to classify real systems; talk about which consistency model and which failure scenarios instead.</p>
<p><b>Is Spanner CA?</b> Google described Spanner as "effectively CA": technically CP, but partitions are so rare on Google's private network (and handled by failing over the minority) that availability exceeds five nines. That is engineering, not a loophole.</p>
<p><b>Latency is the everyday cost.</b> Linearizable writes need at least one round trip to a majority; linearizable reads need either a leader lease (the leader knows nobody else can be leader until the lease expires — needs bounded clock drift) or a quorum round (Raft "ReadIndex"). Cross-region majority writes add 50-200 ms. Systems therefore offer escape hatches: follower reads at a slightly old timestamp (CockroachDB <code>AS OF SYSTEM TIME follower_read_timestamp()</code>, Spanner stale reads), bounded staleness (Cosmos DB), session tokens.</p>
<p><b>Cosmos DB's five levels</b> are a great real-world ladder: strong, bounded staleness, session (default), consistent prefix, eventual. Jepsen tests (Kyle Kingsbury) have repeatedly shown databases violating their own claimed level under partitions — read the reports for the systems you use, and remember that a "CP" configuration can lose acknowledged writes if fsync or election logic is buggy.</p>
<p><b>Harvest and yield</b> (Fox &amp; Brewer) is a practical alternative view: under failure, answer with partial data (lower harvest, e.g. search results from 9 of 10 shards) rather than failing the request (lower yield).</p>`,
    aiEra: `<p><b>What AI changes:</b> AI features mostly tolerate eventual consistency (a recommendation computed from data 30 s old is fine), which pushes more data paths toward AP/EL stores and CDC pipelines. But <b>agents that take actions</b> (book, pay, cancel) need CP-style guarantees: an agent retrying a "transfer" call during a partition must hit idempotency keys and linearizable checks, or it double-executes.</p>
<p><b>Use AI as a partner:</b> describe your features and ask <code>"For each feature, state the weakest consistency model that is still correct and the failure scenario that breaks a weaker one."</code> It is excellent at generating counter-example interleavings you can verify.</p>
<p><b>Where AI goes wrong:</b> "pick two of three", "MongoDB is CA", "Cassandra is always AP" and confusing CAP-consistency with ACID-consistency are common in generated answers. <b>What you must own:</b> precise definitions, per-operation reasoning, and the latency budget that PACELC implies for your geography.</p>`,
    problems: [{
      title: 'Pick a Consistency Level per Feature',
      level: 'Medium', tags: ['CAP', 'PACELC', 'consistency'], companies: ['Amazon', 'Booking.com', 'Flipkart'],
      statement: `<p>An e-commerce site runs on a multi-region store whose operations can be tuned per request (strong/leader, quorum, local quorum, eventual, session). For each feature choose the <b>weakest</b> level that is still correct, and say what goes wrong one level lower: (a) product page view counter, (b) stock decrement at checkout, (c) "my cart" after adding an item, (d) product reviews list, (e) coupon "one use per customer". Express the answer as a JSON config.</p>`,
      constraints: `3 regions. Cross-region round trip ≈ 80-150 ms; in-region ≈ 1-2 ms. Checkout must never oversell; browsing must stay up during a region partition.`,
      example: `<p>(a) view counter → ${H.c('g', 'eventual')} — a few lost or late increments are invisible. (b) stock decrement → ${H.c('r', 'strong (linearizable, conditional write)')} — with eventual, two regions could both sell the last unit.</p>`,
      brute: { why: `<p>Make everything <b>strong</b> with global quorum. Correct, but every page view pays ~100 ms of cross-region latency and browsing goes down whenever a region is partitioned — violating the "browsing must stay up" requirement.</p>`, code: { lang: 'json', code: `{
  "default": { "consistency": "STRONG_GLOBAL_QUORUM" },
  "note": "safe but slow; any region partition blocks reads and writes everywhere"
}` } },
      mcq: { q: 'Which feature MOST needs a linearizable (CP) operation?', options: ['Counting product page views', 'Showing reviews sorted by date', 'Redeeming a one-time coupon code', 'Showing the user their recently viewed items'], answer: 2, explain: 'One-time redemption is a uniqueness invariant: two concurrent redemptions in different regions must not both succeed, which requires a linearizable conditional write (or a single owner region).' },
      hints: [
        `<p>Hint 1: Ask for each feature: "what is the worst thing a stale or conflicting value causes?" Money/inventory/uniqueness → strong. Cosmetic → eventual.</p>`,
        `<p>Hint 2: Many user-facing features only need <b>session</b> guarantees (read-your-writes): only the author must see their change immediately.</p>`,
        `<p>Hint 3: For strong writes, prefer a <b>conditional</b> write (<code>stock &gt;= 1</code>, <code>IF NOT EXISTS</code>) executed at the record's home region/leader, so you pay cross-region latency only on checkout, not browsing.</p>`
      ],
      tests: { skip: 'the answer is a JSON configuration document of consistency choices (prose justifications per feature), not executable code' },
      solution: {
        approach: `<p>(a) <b>eventual</b> + CRDT/aggregated counters — staleness harmless. (b) <b>strong</b> conditional decrement at the item's home leader (or Paxos/LWT) — eventual oversells. (c) <b>session</b> (read-your-writes) — eventual would make the just-added item vanish on refresh. (d) <b>eventual / consistent prefix</b> — a new review appearing a second late is fine, but causal order of replies is nice-to-have. (e) <b>strong</b> with <code>INSERT ... IF NOT EXISTS</code> on (coupon, customer) — anything weaker allows double redemption in two regions. Result: only 2 of 5 features pay cross-region latency, and only at checkout time; browsing stays available (AP) during partitions.</p>`,
        code: { lang: 'json', code: `{
  "view_counter":       { "consistency": "EVENTUAL",       "write": "local async, CRDT G-Counter",            "if_weaker": "n/a (already weakest)" },
  "stock_decrement":    { "consistency": "STRONG",         "write": "conditional: stock >= qty at home leader", "if_weaker": "two regions sell the last unit (oversell)" },
  "my_cart":            { "consistency": "SESSION",        "read": "read-your-writes via session token",       "if_weaker": "item vanishes after refresh" },
  "reviews_list":       { "consistency": "CONSISTENT_PREFIX", "read": "local replica",                          "if_weaker": "reply shown before the review it answers" },
  "coupon_one_use":     { "consistency": "STRONG",         "write": "INSERT IF NOT EXISTS (coupon_id, customer_id)", "if_weaker": "same coupon redeemed twice concurrently" }
}` },
        complexity: `<p>Latency: strong ops ≈ 1 cross-region RTT (80-150 ms) on checkout only; everything else ≈ 1-2 ms local. Availability: browsing and carts survive a partition; checkout in the cut-off region fails safely.</p>`,
        followUps: ['How would you show "only 3 left!" without a strong read on every page view?', 'What changes if the business accepts rare oversells and compensates with apology coupons?', 'How do session tokens work across a user\'s phone and laptop?']
      }
    }]
  });

  /* =====================================================================
     TOPIC 6 — NewSQL: Spanner, CockroachDB, consensus & distributed transactions
     ===================================================================== */
  topics.push({
    title: 'NewSQL: Spanner, CockroachDB, Raft and Distributed Transactions',
    analogy: `<p>Imagine a bank with branches on every continent that still behaves like <b>one single ledger</b>. Each page of the ledger is kept by a small committee of 3 clerks in different cities who vote on every change (<b>consensus</b>). A transfer between pages owned by two committees uses a "both say ready, then both commit" handshake (<b>two-phase commit</b>). And every branch has an atomic clock; before announcing "done", a clerk waits a few milliseconds until no clock anywhere could still think it is earlier (<b>Spanner's commit wait</b>).</p>`,
    explain: `<p><b>NewSQL</b> = the SQL + ACID transactions of a relational database, with the horizontal scale and fault tolerance of NoSQL. Examples: <b>Google Spanner</b>, <b>CockroachDB</b>, <b>TiDB</b>, <b>YugabyteDB</b>, and newer serverless ones such as Aurora DSQL. They share a recipe:</p>
<ol>
<li><b>Range sharding with automatic splits.</b> The key space (table primary keys, index keys) is cut into ranges/tablets/regions (CockroachDB: ~512 MiB). Ranges split when big or hot and move between nodes automatically.</li>
<li><b>Each range is a consensus group.</b> Every range has 3 (or 5) replicas running <b>Raft</b> (CockroachDB, TiKV, YugabyteDB) or <b>Paxos</b> (Spanner). A write commits when a <b>majority</b> has it in their log: 2 of 3 or 3 of 5, so a group survives f failures with 2f + 1 replicas, with no data loss and automatic leader election.</li>
<li><b>Distributed transactions</b> across ranges use <b>two-phase commit (2PC)</b>: phase 1 "prepare" (write provisional intents, everyone votes yes), phase 2 "commit". Classic 2PC blocks if the coordinator dies; here every participant and the coordinator's transaction record are themselves Raft groups, so they do not disappear.</li>
<li><b>MVCC with timestamps</b> so reads do not block writes, and a clock scheme to order transactions globally.</li>
</ol>
${H.table(['', 'Spanner', 'CockroachDB'], [
  ['Replication', 'Paxos groups per split', 'Raft per range (default 3 replicas)'],
  ['Clock', '<b>TrueTime</b>: GPS + atomic clocks; <code>TT.now()</code> returns an interval [earliest, latest] with error ε (a few ms or less)', '<b>Hybrid Logical Clocks</b> (physical time + logical counter) on ordinary NTP clocks; max offset default 500 ms'],
  ['How it orders transactions', '<b>Commit wait</b>: pick commit ts = TT.now().latest, wait until TT.now().earliest &gt; ts (~2ε) → <b>external consistency</b> (strict serializability)', 'read <b>uncertainty interval</b>: a read that sees a value with a timestamp slightly in its future restarts at a higher timestamp; serializable isolation'],
  ['Default isolation', 'strict serializable (external consistency)', 'SERIALIZABLE (READ COMMITTED also available)'],
  ['Geo features', 'multi-region instances, leader placement', 'REGIONAL BY ROW / GLOBAL tables, follower reads']
])}
<p><b>Raft in one breath:</b> nodes are followers until they stop hearing heartbeats, then one becomes a candidate and asks for votes for a new <b>term</b>; whoever wins a majority is leader for that term. The leader appends client commands to its log, sends them to followers, and once a majority has stored an entry it is <b>committed</b> and applied. A node only votes for candidates whose log is at least as up to date, so committed entries are never lost.</p>
<p><b>The trade-offs</b> (be ready to say these out loud): every write costs a consensus round trip (a few ms in one region; 50-200 ms if replicas span continents); serializable isolation means <b>retry errors</b> under contention (SQLSTATE <code>40001</code>) that clients must handle; sequential keys (timestamps, SERIAL) create a hot last range, so use UUIDs or hash-sharded indexes; and cross-region transactions are slow, so you design <b>locality</b> (keep a user's rows in the user's region).</p>`,
    clues: [
      '"need SQL and transactions but data outgrows one Postgres" → NewSQL (CockroachDB, Spanner, TiDB, YugabyteDB) or Citus/Vitess',
      '"global users, strongly consistent, survive a region outage" → Spanner / CockroachDB multi-region',
      '"external consistency", "TrueTime", "commit wait" → Spanner',
      '"transfer money between accounts on different shards atomically" → 2PC over consensus groups (or sagas)',
      '"leader election", "majority", "term", "log replication" → Raft/Paxos',
      '"error 40001 / restart transaction" → serializable contention, add client retry loops'
    ],
    code: [
      { lang: 'sql', db: 'bank', title: 'Which consensus groups does a transfer touch? (runnable)', code: `-- Each account key lives in exactly one range; each range is a 3-replica Raft group.
-- A transaction touching keys in 2 ranges needs a distributed (2PC-style) commit.
SELECT a.acct,
       r.range_id,
       r.leaseholder        AS serves_reads_and_coordinates,
       r.replicas           AS raft_members,
       'majority = 2 of 3'  AS commit_rule
FROM accounts AS a
JOIN ranges   AS r
  ON a.acct >= r.start_key AND a.acct < r.end_key
WHERE a.acct IN ('acct/asha', 'acct/zoe')
ORDER BY r.range_id;` },
      { lang: 'python', run: true, title: 'Hybrid Logical Clock (HLC) — how CockroachDB orders events without atomic clocks (runnable)', code: `# HLC timestamp = (wall, logical). It never goes backwards, stays close to real time,
# and if event A could have caused B (A sent a message B received), then hlc(A) < hlc(B).

class HLC:
    def __init__(self, name, clock_offset_ms):
        self.name = name
        self.offset = clock_offset_ms      # this node's clock error vs true time
        self.wall, self.logical = 0, 0

    def physical(self, true_ms):
        return true_ms + self.offset

    def now(self, true_ms):
        """Local event or send."""
        pt = self.physical(true_ms)
        if pt > self.wall:
            self.wall, self.logical = pt, 0
        else:
            self.logical += 1                # clock did not advance: bump the counter
        return (self.wall, self.logical)

    def receive(self, true_ms, remote):
        """Merge a timestamp that arrived on a message."""
        pt = self.physical(true_ms)
        rw, rl = remote
        if pt > self.wall and pt > rw:
            self.wall, self.logical = pt, 0
        elif rw > self.wall:
            self.wall, self.logical = rw, rl + 1
        elif self.wall > rw:
            self.logical += 1
        else:                                # equal walls
            self.logical = max(self.logical, rl) + 1
        return (self.wall, self.logical)


fast = HLC("n1", +7)    # clock 7 ms ahead
slow = HLC("n2", -5)    # clock 5 ms behind

a = fast.now(100)               # write on n1 at true time 100
b = slow.receive(101, a)        # n2 reads it 1 ms later (its own clock says 96!)
c = slow.now(102)               # next event on n2
print("A on n1:", a)
print("B on n2 after receiving A:", b, "-> still after A:", b > a)
print("C on n2:", c, "-> ordered after B:", c > b)
` }
    ],
    codeTitle: ['Transaction participants', 'Hybrid logical clock'],
    viz: {
      title: 'One distributed transaction: Raft majorities, 2PC, and Spanner commit wait',
      input: 'eps=4',
      inputLabel: 'TrueTime clock uncertainty ε in ms (1-20)',
      gen: function (input) {
        var m = /eps\s*=\s*(\d+)/i.exec(String(input || ''));
        if (!m) throw new Error('Format: eps=4');
        var eps = parseInt(m[1], 10);
        if (eps < 1 || eps > 20) throw new Error('ε must be 1..20 ms');
        var nodes = [
          { id: 'C', label: 'Client', x: 6, y: 34, shape: 'box' },
          { id: 'G', label: 'SQL gateway', x: 26, y: 34, shape: 'box' },
          { id: 'A1', label: 'Range A leader (n1)', x: 58, y: 6, shape: 'box' }, { id: 'A2', label: 'A follower (n2)', x: 88, y: 2, shape: 'box' }, { id: 'A3', label: 'A follower (n3)', x: 88, y: 18, shape: 'box' },
          { id: 'B1', label: 'Range B leader (n5)', x: 58, y: 54, shape: 'box' }, { id: 'B2', label: 'B follower (n1)', x: 88, y: 48, shape: 'box' }, { id: 'B3', label: 'B follower (n2)', x: 88, y: 64, shape: 'box' }
        ];
        var edges = [['C', 'G', 'SQL'], ['G', 'A1'], ['G', 'B1'], ['A1', 'A2', 'raft'], ['A1', 'A3', 'raft'], ['B1', 'B2', 'raft'], ['B1', 'B3', 'raft']];
        function g(hl, eh, tags) { return { type: 'graph', directed: true, height: 70, nodes: nodes, edges: edges, hl: hl, ehl: eh, tags: tags || {} }; }
        var sql = 'BEGIN;\nUPDATE accounts SET balance = balance - 300 WHERE acct = \'acct/asha\';  -- range A\nUPDATE accounts SET balance = balance + 300 WHERE acct = \'acct/zoe\';   -- range B\nCOMMIT;';
        var T = 1000; // true time in ms when commit timestamp is chosen
        return [
          { narr: 'A transfer touches two keys that live in <b>different ranges</b>. Each range is a 3-replica Raft group with its own leader (leaseholder). The SQL gateway node acts as the transaction coordinator.', parts: [
            g({}, {}, { A1: 'acct/asha', B1: 'acct/zoe' }),
            { type: 'code', label: 'transaction', lang: 'sql', code: sql, hl: { 1: 'cur' } }
          ] },
          { narr: 'Step 1: write a <b>provisional intent</b> for acct/asha (−300) to range A\'s leader. The leader appends it to its Raft log and sends it to followers.', parts: [
            g({ G: 'cur', A1: 'cur' }, { 'G-A1': 'cur', 'A1-A2': 'cur', 'A1-A3': 'cur' }),
            { type: 'code', label: 'transaction', lang: 'sql', code: sql, hl: { 2: 'cur' } }
          ] },
          { narr: 'n2 acknowledges. Leader + n2 = <b>2 of 3 = majority</b> → the intent is durably replicated. n3 is slow, and that is fine: majority is enough and the group would survive losing any one node.', parts: [
            g({ A1: 'ok', A2: 'ok', A3: 'cur' }, { 'G-A1': 'ok', 'A1-A2': 'ok', 'A1-A3': 'cur' }, { A3: 'still sending' }),
            { type: 'vars', label: 'Range A Raft', vals: { term: 7, log_index: 4182, acks: '2 / 3', committed: 'yes' }, hl: { committed: 'ok' } }
          ] },
          { narr: 'Step 2: intent for acct/zoe (+300) goes to range B\'s leader on n5, which also reaches a majority (n5 + n1). Both intents exist but are invisible to other transactions until the commit decision.', parts: [
            g({ A1: 'ok', A2: 'ok', B1: 'ok', B2: 'ok' }, { 'G-B1': 'ok', 'B1-B2': 'ok', 'B1-B3': 'cur' }),
            { type: 'code', label: 'transaction', lang: 'sql', code: sql, hl: { 3: 'cur' } }
          ] },
          { narr: 'Step 3: <b>commit</b> = flip one <b>transaction record</b> (stored in range A, itself Raft-replicated) from PENDING to COMMITTED. That single replicated write is the atomic commit point of 2PC — if the gateway crashes now, anyone can read the record and finish or abort the transaction. (CockroachDB "parallel commits" even overlaps this with the intent writes.)', parts: [
            g({ A1: 'sel', G: 'cur' }, { 'G-A1': 'ok' }, { A1: 'txn record: COMMITTED' }),
            { type: 'table', label: '2PC over Raft', columns: ['phase', 'what', 'durable because'], rows: [['prepare', 'intents in A and B', 'each is in a Raft majority'], ['commit point', 'txn record = COMMITTED', 'Raft majority of range A'], ['cleanup', 'resolve intents async', 'can be redone by anyone']], hl: { 1: 'sel' } }
          ] },
          { narr: '<b>Spanner variant — commit wait.</b> TrueTime says now is somewhere in [' + (T - eps) + ', ' + (T + eps) + '] ms (ε = ' + eps + '). Spanner picks commit timestamp <b>s = ' + (T + eps) + '</b> (the latest possible "now").', parts: [
            { type: 'bars', label: 'TrueTime interval at commit (ms)', values: [T - eps, T, T + eps], idxLabels: ['earliest', 'true now (unknown)', 'latest → s'], hl: { 2: 'sel' } },
            { type: 'vars', label: 'TrueTime', vals: { epsilon_ms: eps, commit_ts_s: T + eps }, hl: { commit_ts_s: 'sel' } }
          ] },
          { narr: 'Spanner then <b>waits</b> until TT.now().earliest &gt; s, i.e. until true time is certainly past ' + (T + eps) + '. That takes about <b>2ε = ' + (2 * eps) + ' ms</b>. Only then does it release locks and tell the client "committed". Result: if transaction T2 starts after T1 finished (in real time), T2 gets a bigger timestamp — <b>external consistency</b>.', parts: [
            { type: 'bars', label: 'commit latency breakdown (ms)', values: [5, 2 * eps], idxLabels: ['Paxos majority write (in-region)', 'commit wait ≈ 2ε'], hl: { 1: 'cur' } },
            { type: 'text', html: 'Smaller ε = shorter waits. That is why Google invests in GPS receivers and atomic clocks in every datacenter. With NTP-level error (~100+ ms) commit wait would be unusable — so CockroachDB uses HLC + uncertainty restarts instead.' }
          ] },
          { narr: 'Step 4: intents are resolved into normal committed values in the background, and the client gets success. Any later read, on any replica that has caught up to the commit timestamp, sees both the debit and the credit — never just one.', parts: [
            g({ C: 'ok', A1: 'ok', A2: 'ok', A3: 'ok', B1: 'ok', B2: 'ok', B3: 'ok' }, { 'C-G': 'ok' }, { A1: 'asha = 4700', B1: 'zoe = 9400' }),
            { type: 'table', label: 'accounts after commit', columns: ['acct', 'balance'], rows: [['acct/asha', 4700], ['acct/zoe', 9400]], hl: { 0: 'ok', 1: 'ok' } }
          ] },
          { narr: 'Failure check: if range B\'s leader n5 dies mid-transaction, B\'s followers elect a new leader within seconds (higher Raft term) and still hold the intent (it was on a majority). Nothing is lost; the transaction may just take longer or be retried with a 40001 error.', parts: [
            g({ B1: 'bad', B2: 'sel' }, { 'B1-B2': 'bad', 'B1-B3': 'bad' }, { B1: 'crashed', B2: 'new leader (term 8)' })
          ] }
        ];
      }
    },
    examples: [
      { title: 'Find ranges that should split', html: `<p>CockroachDB splits a range above ~512 MiB (size-based) and also splits hot ranges by load (QPS/CPU). Range 2 is small but hot (7 400 QPS) → <b>load-based split</b>; range 3 is 640 MB → <b>size split</b>. After splitting, the rebalancer moves leaseholders so no single node owns all the hot ones.</p>`, code: { lang: 'sql', db: 'bank', code: `SELECT range_id, start_key, end_key, size_mb, qps,
       CASE WHEN size_mb > 512 THEN 'split (size)'
            WHEN qps > 5000    THEN 'split (load)'
            ELSE 'ok' END AS action
FROM ranges
ORDER BY range_id;` } },
      { title: 'Atomic transfer (single-node analogue)', html: `<p>On one machine, BEGIN/COMMIT gives atomicity. The guard <code>balance &gt;= 300</code> plus <code>changes() = 1</code> make the credit happen only if the debit did. NewSQL gives you this same SQL even when the two rows live in different ranges on different continents — the 2PC + Raft machinery is hidden behind COMMIT.</p>`, code: { lang: 'sql', db: 'bank', code: `BEGIN;
UPDATE accounts SET balance = balance - 300 WHERE acct = 'acct/asha' AND balance >= 300;
UPDATE accounts SET balance = balance + 300 WHERE acct = 'acct/zoe'  AND changes() = 1;
COMMIT;
SELECT acct, balance FROM accounts WHERE acct IN ('acct/asha', 'acct/zoe');` } },
      { title: 'Avoid the sequential-key hotspot', html: `<p>Inserting rows with an increasing primary key (timestamp, SERIAL) always writes to the last range → one hot leaseholder. CockroachDB offers <b>hash-sharded indexes</b> that prefix a hidden bucket column; Spanner recommends UUIDv4 or bit-reversed sequences. Multi-region tables can pin rows to the user's region.</p>`, code: { lang: 'text', check: false, code: `-- CockroachDB
CREATE TABLE events (
    ts      TIMESTAMPTZ NOT NULL DEFAULT now(),
    id      UUID NOT NULL DEFAULT gen_random_uuid(),
    payload JSONB,
    PRIMARY KEY (ts, id) USING HASH WITH (bucket_count = 16)   -- spreads inserts over 16 ranges
);

ALTER DATABASE bank SET PRIMARY REGION "ap-south1";
ALTER DATABASE bank ADD REGION "us-east1";
ALTER TABLE accounts SET LOCALITY REGIONAL BY ROW;   -- each row lives (leaseholder) in its crdb_region` } },
      { title: 'Client retry loop for serializable conflicts', html: `<p>Under SERIALIZABLE, conflicting transactions may get SQLSTATE <b>40001</b> ("restart transaction"). The client must retry the <i>whole</i> transaction with backoff — never just the failed statement. Keep transactions short and idempotent.</p>`, code: { lang: 'python', code: `import random
import time

import psycopg  # PostgreSQL wire protocol works with CockroachDB / YugabyteDB


def transfer(conn, src, dst, amount, max_retries=5):
    for attempt in range(max_retries):
        try:
            with conn.transaction():
                with conn.cursor() as cur:
                    cur.execute("UPDATE accounts SET balance = balance - %s "
                                "WHERE acct = %s AND balance >= %s", (amount, src, amount))
                    if cur.rowcount != 1:
                        raise ValueError("insufficient funds")
                    cur.execute("UPDATE accounts SET balance = balance + %s WHERE acct = %s",
                                (amount, dst))
            return True
        except psycopg.errors.SerializationFailure:      # SQLSTATE 40001
            time.sleep((2 ** attempt) * 0.01 + random.random() * 0.01)   # backoff + jitter
    raise RuntimeError("gave up after retries")` } }
    ],
    deepDive: `<p><b>Why 2PC over consensus is not "classic 2PC".</b> Classic 2PC has a blocking flaw: a participant that voted yes must hold locks until it hears the decision; if the coordinator dies forever, it is stuck. In Spanner and CockroachDB every participant is a Paxos/Raft group and the decision is a replicated record, so "the coordinator died" just means another node picks up the record. CockroachDB's <b>parallel commits</b> writes the transaction record as STAGING together with the intents; the transaction is implicitly committed once all of them are replicated, saving a round trip. TiDB follows Google's <b>Percolator</b> model: a timestamp oracle (PD) hands out start/commit timestamps, the first key is the primary lock, secondaries point to it.</p>
<p><b>Reads.</b> Leaseholders (CockroachDB) / Paxos leaders with leases (Spanner) serve consistent reads without a consensus round, because the lease guarantees no one else can accept writes. <b>Follower reads</b> serve slightly stale data (e.g. 4.8 s old) from the nearest replica without contacting the leader — perfect for dashboards. Spanner's read-only transactions pick a timestamp and read lock-free from any sufficiently up-to-date replica (using "safe time").</p>
<p><b>Clocks.</b> Spanner's commit wait makes timestamps match real-time order. CockroachDB cannot wait out 500 ms on every commit, so it accepts that reads may encounter values with timestamps inside the reader's <b>uncertainty window</b> (its timestamp + max offset) and restarts them; nodes whose clocks drift beyond the max offset shut themselves down to protect correctness. The guarantee is serializability plus "no stale reads" for single keys, slightly weaker than Spanner's strict serializability in pathological cases. YugabyteDB uses hybrid time similarly; AWS Aurora DSQL and Amazon Time Sync use precise clocks to shrink uncertainty.</p>
<p><b>Raft details worth knowing:</b> randomized election timeouts avoid split votes; a leader must commit an entry from its own term before trusting older entries ("leader completeness"); membership changes use joint consensus or one-at-a-time changes; snapshots truncate the log. Raft groups per range mean thousands of groups per node, so implementations coalesce heartbeats (CockroachDB "quiesced" ranges) to keep overhead low.</p>
<p><b>Alternatives to NewSQL:</b> sharded Postgres/MySQL with Citus or Vitess (keep single-shard transactions fast, cross-shard limited), or <b>sagas</b> (a chain of local transactions with compensating actions) when services own separate databases. Choose NewSQL when you need cross-shard ACID transactions and SQL at a scale or availability level one primary cannot provide.</p>`,
    aiEra: `<p><b>What AI changes:</b> agent backends increasingly need globally consistent state (agent memory, tool-call ledgers, billing for tokens) across regions — a natural fit for NewSQL. Spanner and CockroachDB ship vector search too, so an AI app can keep embeddings, relational data and transactions in one consistent store. AI assistants also help with the hardest NewSQL operational task: reading contention/hot-range dashboards and suggesting key redesigns (hash-sharding, splitting a counter row).</p>
<p><b>Use AI as a partner:</b> <code>"Here is my schema and my top transactions. Which ones cross ranges or regions? Estimate latency for a 3-region (us-east, eu-west, ap-south) CockroachDB cluster with REGIONAL BY ROW and suggest locality settings."</code></p>
<p><b>Where AI goes wrong:</b> it claims Spanner "beats CAP", forgets retry loops for 40001, suggests SERIAL primary keys, or thinks 2PC alone gives fault tolerance. <b>What you must own:</b> the Raft majority math, the 2PC commit point, why commit wait works, and a latency estimate from region RTTs.</p>`,
    problems: [{
      title: 'Atomic Cross-Range Money Transfer',
      level: 'Medium', tags: ['transactions', '2PC', 'NewSQL'], companies: ['Stripe', 'PayPal', 'Coinbase', 'Razorpay'],
      statement: `<p>Move 300 from <code>acct/asha</code> to <code>acct/zoe</code> (db <code>bank</code>). The accounts live in <b>different ranges</b> (different Raft groups). Write SQL that (1) lists the ranges/leaseholders the transaction touches, and (2) performs the transfer so that money is never created or destroyed: the credit happens <b>only if</b> the debit succeeded (sufficient funds), atomically. Then explain what the database does under the hood at COMMIT.</p>`,
      constraints: `Balances must never go negative (CHECK constraint). Any crash between the two updates must leave both accounts unchanged.`,
      example: `<p>Participants: ${H.c('b', 'range 1 (leaseholder n1)')} and ${H.c('b', 'range 4 (leaseholder n5)')} → a distributed commit. After the transfer: asha ${H.c('g', '5000 → 4700')}, zoe ${H.c('g', '9100 → 9400')}. Total money unchanged (19 350).</p>`,
      brute: { why: `<p>Two independent auto-committed statements. If the process crashes after the debit, Asha loses 300 and Zoe never receives it; if the debit fails (insufficient funds), the credit still runs and money is created from nothing.</p>`, code: { lang: 'sql', db: 'bank', code: `-- each statement commits on its own: NOT atomic
UPDATE accounts SET balance = balance - 300 WHERE acct = 'acct/asha';
-- (crash here = money destroyed)
UPDATE accounts SET balance = balance + 300 WHERE acct = 'acct/zoe';
SELECT SUM(balance) AS total_money FROM accounts;` } },
      mcq: { q: 'In CockroachDB/Spanner, what is the single atomic "commit point" of a multi-range transaction?', options: ['When the gateway sends COMMIT', 'When the last intent is written', 'When the replicated transaction record becomes COMMITTED (or all STAGING writes are replicated)', 'When every replica of every range has applied the change'], answer: 2, explain: 'The decision lives in one Raft-replicated record. Once it is durable, the transaction is committed even if the coordinator crashes; intents are cleaned up later.' },
      hints: [
        `<p>Hint 1: Participants = join accounts to ranges with <code>acct &gt;= start_key AND acct &lt; end_key</code>.</p>`,
        `<p>Hint 2: Wrap both updates in one <code>BEGIN ... COMMIT</code>. Guard the debit with <code>balance &gt;= 300</code>.</p>`,
        `<p>Hint 3: Make the credit conditional on the debit: in SQLite <code>changes() = 1</code>; in Postgres-compatible NewSQL use a CTE <code>WITH d AS (UPDATE ... RETURNING acct) UPDATE ... WHERE EXISTS (SELECT 1 FROM d)</code>, plus a client retry loop for 40001.</p>`
      ],
      tests: { engine: 'sqlite', check: '(rows, cols, c) => {\n  if (c.plan || c.noplan) { const d = rows.map(r => r[r.length - 1]).join(\'\\n\'); return (!c.plan || new RegExp(c.plan).test(d)) && (!c.noplan || !new RegExp(c.noplan).test(d)); }\n  let a = rows, b = c.rows || [];\n  if (c.set) { const k = r => JSON.stringify(r); a = a.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); b = b.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); }\n  return a.length === b.length && a.every((r, i) => r.length === b[i].length && r.every((v, j) => v === b[i][j] || (typeof v === \'number\' && typeof b[i][j] === \'number\' && Math.abs(v - b[i][j]) < 1e-6)));\n}', cases: [
        { setup: '', rows: [
            [19350]
          ] },
        { setup: '', after: 'SELECT acct, balance FROM accounts WHERE acct IN (\'acct/asha\', \'acct/zoe\') ORDER BY acct', rows: [
            ['acct/asha', 4700],
            ['acct/zoe', 9400]
          ] },
        { setup: '', result: 0, rows: [
            ['acct/asha', 1, 'n1', 'n1,n2,n3'],
            ['acct/zoe', 4, 'n5', 'n5,n1,n2']
          ], set: true },
        { setup: 'UPDATE accounts SET balance = 299 WHERE acct = \'acct/asha\'', after: 'SELECT acct, balance FROM accounts WHERE acct IN (\'acct/asha\', \'acct/zoe\') ORDER BY acct', rows: [
            ['acct/asha', 299],
            ['acct/zoe', 9100]
          ] },
        { setup: 'UPDATE accounts SET balance = 300 WHERE acct = \'acct/asha\'', after: 'SELECT acct, balance FROM accounts WHERE acct IN (\'acct/asha\', \'acct/zoe\') ORDER BY acct', rows: [
            ['acct/asha', 0],
            ['acct/zoe', 9400]
          ] },
        { setup: 'UPDATE accounts SET balance = 299 WHERE acct = \'acct/asha\'', rows: [
            [14649]
          ] },
        { setup: 'UPDATE accounts SET balance = 1000000 WHERE acct = \'acct/asha\'', after: 'SELECT acct, balance FROM accounts WHERE acct IN (\'acct/asha\', \'acct/zoe\') ORDER BY acct', rows: [
            ['acct/asha', 999700],
            ['acct/zoe', 9400]
          ] },
        { setup: 'UPDATE ranges SET end_key = \'acct/zz\' WHERE range_id = 3; UPDATE ranges SET start_key = \'acct/zz\' WHERE range_id = 4', result: 0, rows: [
            ['acct/asha', 1, 'n1', 'n1,n2,n3'],
            ['acct/zoe', 3, 'n4', 'n4,n5,n1']
          ], set: true },
        { setup: 'UPDATE ranges SET leaseholder = \'n3\' WHERE range_id = 1', result: 0, rows: [
            ['acct/asha', 1, 'n3', 'n1,n2,n3'],
            ['acct/zoe', 4, 'n5', 'n5,n1,n2']
          ], set: true },
        { setup: 'UPDATE accounts SET balance = 0 WHERE acct = \'acct/asha\'', rows: [
            [14350]
          ] }
      ] },
      solution: {
        approach: `<p>Find participants, then run one transaction whose credit depends on the debit. Under the hood (CockroachDB): the gateway assigns an HLC timestamp, writes an intent for asha into range 1 (Raft majority), an intent for zoe into range 4 (Raft majority), and a transaction record in range 1. Commit = record becomes COMMITTED (with parallel commits: STAGING + all intents replicated). Readers that hit an intent check the record. If any leaseholder dies, its Raft group elects a new leader that still holds the intent. Contention → 40001 → the client retries the whole transaction.</p>`,
        code: { lang: 'sql', db: 'bank', code: `-- 1) who participates in the distributed commit?
SELECT a.acct, r.range_id, r.leaseholder, r.replicas
FROM accounts AS a
JOIN ranges   AS r ON a.acct >= r.start_key AND a.acct < r.end_key
WHERE a.acct IN ('acct/asha', 'acct/zoe');

-- 2) atomic, guarded transfer
BEGIN;
UPDATE accounts
   SET balance = balance - 300
 WHERE acct = 'acct/asha' AND balance >= 300;      -- debit only with sufficient funds
UPDATE accounts
   SET balance = balance + 300
 WHERE acct = 'acct/zoe' AND changes() = 1;        -- credit only if the debit happened
COMMIT;

SELECT acct, balance FROM accounts WHERE acct IN ('acct/asha', 'acct/zoe');
SELECT SUM(balance) AS total_money FROM accounts;  -- still 19350 (invariant holds)` },
        alt: [{ lang: 'text', check: false, title: 'CockroachDB / Postgres-compatible version', code: `BEGIN;
WITH debit AS (
  UPDATE accounts SET balance = balance - 300
   WHERE acct = 'acct/asha' AND balance >= 300
  RETURNING acct
)
UPDATE accounts SET balance = balance + 300
 WHERE acct = 'acct/zoe' AND EXISTS (SELECT 1 FROM debit);
COMMIT;   -- client retries the whole block on SQLSTATE 40001` }],
        complexity: `<p>Latency ≈ one Raft round per participant (parallel) + the commit record write; in one region a few ms, across regions roughly the RTT to a majority of each range's replicas. With Spanner add commit wait ≈ 2ε.</p>`,
        followUps: ['How would you do the same across two microservices that own separate databases (saga + idempotency keys)?', 'Where should the leaseholders live if Asha is in Mumbai and Zoe in California?', 'Why must the retry loop wrap the whole transaction, not just the failed statement?']
      }
    }]
  });

  /* =====================================================================
     TOPIC 7 — Choosing a database
     ===================================================================== */
  var DB_SCENARIOS = {
    payments: { title: 'Payments ledger', steps: [
      ['Data shape', 'accounts, transfers, ledger entries with strict relationships', 'relational fits naturally', ['Redis', 'Neo4j']],
      ['Key queries', 'balance by account, statement by date, audits with joins', 'needs joins + ad-hoc SQL', ['Cassandra', 'DynamoDB']],
      ['Consistency', 'never lose or double-apply money; invariants across rows', 'ACID, serializable, RPO = 0', ['MongoDB', 'Elasticsearch', 'ClickHouse', 'pgvector']],
      ['Scale', '~5 000 TPS, a few TB, growing', 'one strong Postgres primary + replicas fits for years', []],
      ['Geography', 'single country today; multi-region later', 'start single-region; NewSQL when active-active is required', []],
      ['Team / ops', 'small team, managed cloud', 'managed Postgres (RDS/Cloud SQL/Aurora)', ['MySQL']]
    ], pick: ['PostgreSQL', 'CockroachDB'], why: '<b>PostgreSQL</b> (managed, sync standby for RPO 0) now; <b>CockroachDB/Spanner</b> when you need multi-region active-active with the same SQL. Analytics goes to a warehouse via CDC.' },
    chat: { title: 'Chat messages at Discord scale', steps: [
      ['Data shape', 'append-only messages per channel', 'time-ordered rows, no joins needed', ['Neo4j', 'pgvector']],
      ['Key queries', 'latest N messages in a channel; page backwards', 'single partition range scan', ['ClickHouse', 'Elasticsearch']],
      ['Consistency', 'per-channel order; a message showing up 100 ms late is fine', 'eventual / LOCAL_QUORUM is OK', ['CockroachDB']],
      ['Scale', 'millions of writes/s, petabytes', 'needs linear write scaling across hundreds of nodes', ['PostgreSQL', 'MySQL', 'MongoDB']],
      ['Geography', 'global users', 'multi-DC replication, local quorum', []],
      ['Team / ops', 'dedicated infra team', 'can run a wide-column cluster (or use a managed one)', ['DynamoDB']]
    ], pick: ['Cassandra', 'Redis'], why: '<b>Cassandra/ScyllaDB</b> with <code>((channel_id, bucket), ts)</code> for messages; <b>Redis</b> for presence/typing indicators; search via a separate Elasticsearch index fed by CDC.' },
    analytics: { title: 'Product analytics dashboard', steps: [
      ['Data shape', 'billions of events with ~50 columns', 'wide, append-only facts', ['Redis', 'Neo4j']],
      ['Key queries', 'GROUP BY day, country, plan over months of data', 'scans + aggregates over few columns → columnar', ['Cassandra', 'DynamoDB', 'MongoDB']],
      ['Consistency', 'minutes of delay is fine', 'batch / streaming ingestion OK', ['CockroachDB']],
      ['Scale', '10 TB+, queries over 1B rows in seconds', 'column store with compression + vectorised execution', ['PostgreSQL', 'MySQL', 'pgvector']],
      ['Geography', 'internal users', 'single region fine', []],
      ['Team / ops', 'analysts write SQL', 'needs SQL interface', ['Elasticsearch']]
    ], pick: ['ClickHouse'], why: '<b>ClickHouse</b> (or BigQuery/Snowflake/Redshift as managed warehouses). OLTP data arrives via CDC; never run these scans on the production OLTP primary.' },
    catalog: { title: 'E-commerce product catalog + search', steps: [
      ['Data shape', 'products with very different attributes (books vs phones)', 'flexible schema per item', ['Redis', 'Neo4j', 'ClickHouse']],
      ['Key queries', 'get by id, browse by category, full-text + faceted search', 'document reads + an inverted index for search', ['Cassandra']],
      ['Consistency', 'price/stock changes visible within seconds', 'read-your-writes for admins; eventual for shoppers', []],
      ['Scale', '10 M products, read-heavy', 'replicas + cache; no extreme write scale', ['CockroachDB', 'DynamoDB']],
      ['Geography', 'CDN + regional read replicas', 'caching matters more than the DB', []],
      ['Team / ops', 'web team knows Postgres', 'JSONB covers flexible attributes', ['MySQL', 'pgvector']]
    ], pick: ['PostgreSQL', 'MongoDB', 'Elasticsearch'], why: '<b>Postgres JSONB</b> or <b>MongoDB</b> as the source of truth for products, plus <b>Elasticsearch/OpenSearch</b> for search and facets, kept in sync via CDC. Add pgvector or the search engine\'s vector fields for semantic search.' },
    iot: { title: 'IoT sensor time-series', steps: [
      ['Data shape', 'device_id, timestamp, a few readings', 'time-series', ['Neo4j', 'Redis']],
      ['Key queries', 'last hour for a device; hourly averages per site', 'range by device + time; rollups', ['Elasticsearch', 'MongoDB']],
      ['Consistency', 'losing a reading is tolerable; duplicates must be idempotent', 'eventual OK', ['CockroachDB']],
      ['Scale', '500 K readings/s, keep raw 30 days, rollups 5 years', 'high ingest + TTL + downsampling', ['MySQL', 'DynamoDB']],
      ['Geography', 'devices worldwide, ingest via regional gateways', 'regional buffers (Kafka)', []],
      ['Team / ops', 'SQL-savvy team', 'Postgres extension is attractive', ['pgvector']]
    ], pick: ['PostgreSQL', 'Cassandra', 'ClickHouse'], why: '<b>TimescaleDB</b> (Postgres extension: hypertables, compression, continuous aggregates) if it fits one cluster; <b>Cassandra/Scylla</b> with <code>((device_id, day), ts)</code> + TTL at extreme ingest; <b>ClickHouse</b> for fleet-wide analytics.' },
    rag: { title: 'AI assistant over company docs (RAG)', steps: [
      ['Data shape', 'documents, chunks, embeddings (1 536 floats), permissions', 'relational metadata + vectors', ['Cassandra', 'Neo4j']],
      ['Key queries', 'top-k similar chunks filtered by tenant + permission', 'ANN index + metadata filter in one query', ['Redis', 'ClickHouse']],
      ['Consistency', 'deleted docs must disappear from answers quickly', 'transactional delete of doc + chunks + vectors', ['Elasticsearch', 'DynamoDB']],
      ['Scale', '5 M chunks today', 'HNSW index fits in one Postgres node', ['CockroachDB', 'MongoDB']],
      ['Geography', 'EU customers need EU data residency', 'per-region deployment', []],
      ['Team / ops', 'already run Postgres', 'one less system to operate', ['MySQL']]
    ], pick: ['pgvector', 'PostgreSQL'], why: '<b>Postgres + pgvector</b> (HNSW) keeps vectors, permissions and documents in one transactional store. Move to a dedicated vector DB (Pinecone, Milvus, Weaviate, Turbopuffer) only when hundreds of millions of vectors or strict latency/recall targets demand it.' }
  };
  var DB_CANDIDATES = ['PostgreSQL', 'MySQL', 'MongoDB', 'Cassandra', 'DynamoDB', 'Redis', 'Neo4j', 'ClickHouse', 'CockroachDB', 'Elasticsearch', 'pgvector'];

  topics.push({
    title: 'Choosing a Database: A Decision Framework with Real Scenarios',
    analogy: `<p>Choosing a database is like choosing a vehicle. A scooter (Redis) is perfect for quick trips across town but carries one bag. A delivery truck (Postgres) carries almost anything reliably. A freight train (Cassandra) moves unbelievable tonnage but only along its tracks. A plane (Spanner) crosses oceans fast but costs a lot and needs an airport. Nobody asks "what is the best vehicle?" — they ask "what am I carrying, how far, how often, and who drives?"</p>`,
    explain: `<p>Interviewers do not want a favourite database; they want a <b>reasoned choice</b>. Walk through these questions in order and say the answers out loud:</p>
<ol>
<li><b>Data shape & relationships.</b> Rows with many relationships (relational)? Self-contained aggregates (document)? Time-ordered appends (wide-column / time-series)? Highly connected (graph)? Vectors (vector index)?</li>
<li><b>Access patterns.</b> Top queries and their frequency. Point lookups by key? Range scans? Ad-hoc analytics? Full-text search? Multi-hop traversals? Known up front, or will product managers invent new ones weekly (→ SQL)?</li>
<li><b>Consistency & transactions.</b> Which invariants must never break (money, inventory, uniqueness)? Single-row atomicity enough, or multi-row/multi-entity transactions?</li>
<li><b>Scale numbers.</b> Data size now and in 3 years, reads/s, writes/s, read:write ratio, peak vs average. One Postgres node handles a lot (tens of thousands of simple TPS, multi-TB) — do the math before reaching for distributed systems.</li>
<li><b>Latency & geography.</b> p99 targets, users per region, data-residency laws, RPO/RTO for disasters.</li>
<li><b>Operations & cost.</b> Managed service available? Team expertise? Licensing? Backup/restore, observability, upgrade story. The best database is often the one your team can run at 3 a.m.</li>
</ol>
${H.table(['Workload', 'Usually a good first pick', 'Why'], [
  ['General OLTP, money, orders', 'PostgreSQL / MySQL (managed)', 'ACID, SQL, mature, huge ecosystem'],
  ['OLTP beyond one primary, global', 'CockroachDB, Spanner, YugabyteDB, TiDB; or Vitess/Citus sharding', 'SQL + scale-out + consensus'],
  ['Cache, sessions, leaderboards, rate limits', 'Redis / Valkey', 'in-memory, rich data structures, TTL'],
  ['Serverless KV at any scale, known access patterns', 'DynamoDB', 'predictable single-digit-ms, zero ops'],
  ['Massive append, time-ordered (messages, events)', 'Cassandra / ScyllaDB', 'linear write scaling, multi-DC'],
  ['Flexible documents, rapid iteration', 'MongoDB (or Postgres JSONB)', 'schema flexibility, rich queries on documents'],
  ['Analytics / OLAP', 'ClickHouse, BigQuery, Snowflake, Redshift, DuckDB', 'columnar, compression, vectorised scans'],
  ['Full-text search, logs', 'Elasticsearch / OpenSearch', 'inverted indexes, relevance, facets'],
  ['Deep relationships', 'Neo4j, Neptune', 'multi-hop traversals'],
  ['Embeddings / semantic search', 'pgvector → dedicated vector DB at large scale', 'ANN indexes (HNSW, IVF)']
])}
<p><b>Polyglot persistence</b> is normal: one <b>system of record</b> (usually relational) plus derived stores (cache, search index, warehouse, vector index) fed by <b>CDC</b> (Debezium/Kafka) or outbox events. Every extra store adds sync lag and operational cost, so add one only when a requirement justifies it. A good default in 2026: "Start with Postgres; prove you need something else."</p>`,
    clues: [
      '"which database would you use and why?" → walk the 6 questions; name trade-offs, not brands',
      '"strong consistency for payments" → relational/NewSQL; "likes and views" → eventual store or cache',
      '"we don\'t know future queries" → relational (SQL flexibility)',
      '"100K writes/s append-only, global" → wide-column (Cassandra/Scylla) or managed KV (DynamoDB)',
      '"dashboards over billions of rows" → columnar OLAP, fed by CDC — not the OLTP primary',
      '"search box with typos and facets" → search engine as a derived store',
      '"tiny team, needs to just work" → managed Postgres; avoid running clusters yourself'
    ],
    code: [
      { lang: 'sql', title: 'A capabilities matrix you can query (runnable)', code: `CREATE TABLE db_catalog (
  name          TEXT PRIMARY KEY,
  model         TEXT,      -- relational, document, wide-column, kv, graph, columnar, search
  acid_multirow INTEGER,   -- 1 = multi-row/multi-entity ACID transactions are first-class
  scale_out     INTEGER,   -- 1 = writes scale horizontally out of the box
  adhoc_sql     INTEGER,   -- 1 = arbitrary SQL with joins
  managed       INTEGER    -- 1 = widely available as a managed service
);
INSERT INTO db_catalog VALUES
  ('PostgreSQL',  'relational',  1, 0, 1, 1),
  ('CockroachDB', 'relational',  1, 1, 1, 1),
  ('Spanner',     'relational',  1, 1, 1, 1),
  ('MongoDB',     'document',    1, 1, 0, 1),
  ('Cassandra',   'wide-column', 0, 1, 0, 1),
  ('DynamoDB',    'kv',          1, 1, 0, 1),
  ('Redis',       'kv',          0, 1, 0, 1),
  ('Neo4j',       'graph',       1, 0, 0, 1),
  ('ClickHouse',  'columnar',    0, 1, 1, 1);

-- Requirement: multi-row ACID + horizontal write scaling + ad-hoc SQL
SELECT name, model
FROM db_catalog
WHERE acid_multirow = 1 AND scale_out = 1 AND adhoc_sql = 1
ORDER BY name;` },
      { lang: 'python', run: true, title: 'Weighted decision matrix (runnable sketch)', code: `# Score candidate databases against weighted requirements (0-5 per criterion).
# The numbers are a judgement call; the value is in making trade-offs explicit.

weights = {"acid": 5, "write_scale": 2, "adhoc_queries": 4, "ops_simplicity": 4, "latency": 3}

scores = {
    "PostgreSQL":  {"acid": 5, "write_scale": 2, "adhoc_queries": 5, "ops_simplicity": 5, "latency": 4},
    "CockroachDB": {"acid": 5, "write_scale": 5, "adhoc_queries": 4, "ops_simplicity": 3, "latency": 3},
    "Cassandra":   {"acid": 1, "write_scale": 5, "adhoc_queries": 1, "ops_simplicity": 2, "latency": 5},
    "MongoDB":     {"acid": 3, "write_scale": 4, "adhoc_queries": 3, "ops_simplicity": 4, "latency": 4},
}

def total(db):
    return sum(weights[c] * scores[db][c] for c in weights)

ranking = sorted(scores, key=total, reverse=True)
best = sum(weights.values()) * 5
for db in ranking:
    print(f"{db:12s} {total(db):3d} / {best}")

# Sensitivity check: what if write scaling becomes critical?
weights["write_scale"] = 5
print("after write_scale weight -> 5:", {db: total(db) for db in sorted(scores, key=total, reverse=True)})
# PostgreSQL and CockroachDB now tie at 87: the decision hinges on how sure you are about growth.
` }
    ],
    codeTitle: ['Filter by capability', 'Decision matrix'],
    viz: {
      title: 'Pick a database: walk the six questions for a scenario',
      input: 'chat',
      inputLabel: 'scenario: payments | chat | analytics | catalog | iot | rag',
      gen: function (input) {
        var key = String(input || '').trim().toLowerCase();
        var sc = DB_SCENARIOS[key];
        if (!sc) throw new Error('Choose one of: ' + Object.keys(DB_SCENARIOS).join(', '));
        var alive = DB_CANDIDATES.slice(), rows = [], frames = [];
        frames.push({ narr: 'Scenario: <b>' + sc.title + '</b>. We start with every candidate and remove the ones that clearly fail each requirement. (The candidates are families\' best-known representatives.)', parts: [
          { type: 'set', label: 'candidates still in the running', items: alive.slice() },
          { type: 'table', label: 'requirements so far', columns: ['question', 'answer for this product', 'implication'], rows: [] }
        ] });
        sc.steps.forEach(function (st, i) {
          rows.push([st[0], st[1], st[2]]);
          var removed = st[3].filter(function (x) { return alive.indexOf(x) >= 0; });
          var hl = {}; removed.forEach(function (x) { hl[x] = 'bad'; });
          frames.push({ narr: '<b>' + (i + 1) + '. ' + st[0] + ':</b> ' + st[1] + ' → ' + st[2] + '. ' + (removed.length ? '<span class="c-r">Ruled out: ' + removed.join(', ') + '.</span>' : 'Nobody ruled out by this one.'), parts: [
            { type: 'set', label: 'candidates', items: alive.slice(), hl: hl },
            { type: 'table', label: 'requirements so far', columns: ['question', 'answer for this product', 'implication'], rows: rows.slice(), hl: (function () { var o = {}; o[rows.length - 1] = 'cur'; return o; })() }
          ] });
          alive = alive.filter(function (x) { return removed.indexOf(x) < 0; });
        });
        var hl2 = {}; sc.pick.forEach(function (p) { hl2[p] = 'sel'; });
        frames.push({ narr: 'Survivors: ' + alive.join(', ') + '. <b>Recommendation:</b> ' + sc.why, parts: [
          { type: 'set', label: 'final candidates (purple = recommended)', items: alive.slice(), hl: hl2 },
          { type: 'table', label: 'requirements', columns: ['question', 'answer for this product', 'implication'], rows: rows.slice() }
        ] });
        frames.push({ narr: 'Say the trade-off out loud: what the pick gives up and what would make you change your mind (scale ×10, new query patterns, multi-region). That sentence is what interviewers score.', parts: [
          { type: 'text', html: '<b>Template:</b> "Given <i>[top queries]</i> at <i>[scale]</i> with <i>[consistency need]</i>, I pick <i>[DB]</i> because <i>[fit]</i>. We give up <i>[weakness]</i>, mitigated by <i>[derived store / pattern]</i>. I would revisit if <i>[trigger]</i>."' }
        ] });
        return frames;
      }
    },
    examples: [
      { title: 'URL shortener (100:1 reads, 1 B links)', html: `<p>Access pattern is a single key lookup (<code>code → url</code>), immutable after creation, read-heavy, global. A <b>key-value store</b> (DynamoDB, or Cassandra) plus a CDN/Redis cache in front. Postgres also works up to a few hundred million rows with a cache. Code generation needs uniqueness → use a counter range per app server or conditional put (<code>attribute_not_exists</code>).</p>` },
      { title: 'Game leaderboard', html: `<p>"Top 100 players" and "my rank" updated thousands of times per second: <b>Redis sorted sets</b> (<code>ZADD</code>, <code>ZREVRANGE</code>, <code>ZREVRANK</code> are O(log N)). Persist scores to a durable store (Postgres/DynamoDB) asynchronously; rebuild the sorted set from it after a cache loss. The same in SQL needs a window function over all players for every rank lookup.</p>`, code: { lang: 'sql', code: `CREATE TABLE scores (player TEXT PRIMARY KEY, score INTEGER);
INSERT INTO scores VALUES ('asha', 920), ('ben', 870), ('chen', 990), ('dara', 870);
-- what Redis ZREVRANK gives in O(log N), SQL computes with a window over everyone:
SELECT player, score, RANK() OVER (ORDER BY score DESC) AS rank FROM scores ORDER BY rank;` } },
      { title: 'Observability logs', html: `<p>Terabytes per day of semi-structured logs, queried by time range + filters + text, retained 14-30 days. Choices: <b>Elasticsearch/OpenSearch</b> (full-text, expensive at scale), <b>ClickHouse</b> (columnar, cheap aggregates, good text filtering), or object storage + Loki-style index-light designs. Retention via time-partitioned indices/tables dropped whole (never row deletes).</p>` },
      { title: 'Ride-hailing driver locations', html: `<p>Every driver pings location every 4 s; riders need "drivers within 2 km". Hot, ephemeral, geo-indexed: <b>Redis GEO</b> (<code>GEOADD</code>/<code>GEOSEARCH</code>) or an in-memory geo service sharded by city/geohash. History goes to Cassandra/S3 for analytics; trips and payments stay in Postgres/NewSQL. One product, four stores — each justified by a requirement.</p>`, code: { lang: 'text', check: false, code: `GEOADD drivers:blr 77.5946 12.9716 driver:42
GEOSEARCH drivers:blr FROMLONLAT 77.60 12.97 BYRADIUS 2 km ASC COUNT 10 WITHDIST` } }
    ],
    deepDive: `<p><b>Do the capacity math first.</b> Example: 50 M users, 20 writes/user/day = 1 B writes/day ≈ <b>11 600 writes/s average</b>, maybe 3-5× at peak (~50 K/s). Rows of 500 B → 0.5 TB/day raw, ~180 TB/year before replication. That rules out a single Postgres primary for the raw events and points to a wide-column store or a log + columnar warehouse. The same app's <i>account</i> table (50 M rows × 1 KB = 50 GB) is trivial for Postgres. Different tables of one product can — and often should — live in different stores.</p>
<p><b>Hidden costs of NoSQL.</b> Denormalised copies must be kept consistent (dual writes are a classic bug source; prefer the transactional outbox or CDC), access patterns must be known in advance (a new query may need a new table and a backfill), and data quality checks the schema used to enforce move into code. <b>Hidden costs of relational at scale.</b> Vertical limits, failover windows, schema migrations on huge tables (use online tools: gh-ost, pg_repack, CockroachDB online schema changes), and eventually sharding.</p>
<p><b>Benchmarks lie, workloads don't.</b> Vendor benchmarks use their best case. Run your own: replay a day of production queries (or a realistic generator) against candidates at 2-3× expected peak, and measure p99, not average. Check failure behaviour too: kill a node mid-test, partition the network (Jepsen-style tools), restore from backup and time it.</p>
<p><b>Real examples:</b> Uber built Schemaless on MySQL, later Docstore; Discord moved Cassandra → ScyllaDB; Figma and Notion sharded Postgres horizontally rather than switching databases; Shopify runs sharded MySQL "pods"; Meta's social graph is TAO (a graph-aware cache) over sharded MySQL. The pattern: start relational, add specialised stores for specific hot paths, shard when forced — and the database choice is reversible only at great cost, so document the reasoning (an ADR).</p>`,
    aiEra: `<p><b>What AI changes:</b> the 2026 default stack often includes a <b>vector index</b>, an <b>LLM-friendly JSON store</b> and an <b>event log</b> for agent memory and evaluation traces. The "do we need a vector DB?" question is the new "do we need NoSQL?" — and the answer is usually "start with pgvector or your existing store's vector feature, measure recall and latency, then decide". AI also changes how you evaluate: assistants can generate realistic synthetic workloads, write benchmark harnesses, and summarise Jepsen reports.</p>
<p><b>Use AI as a partner:</b> <code>"Here are my access patterns with QPS and data sizes. Produce a decision matrix for Postgres, DynamoDB and Cassandra with a capacity estimate for each, and list the 3 riskiest assumptions."</code> Then challenge every number.</p>
<p><b>Where AI goes wrong:</b> it recommends trendy databases without capacity math, ignores operational cost and team skills, and proposes five stores for an MVP. <b>What you must own:</b> the requirements, the arithmetic, the trade-off sentence, and the decision record your team will live with for years.</p>`,
    problems: [{
      title: 'Choose the Data Stores for a Ride-Hailing App',
      level: 'Hard', tags: ['database selection', 'polyglot persistence', 'system design'], companies: ['Uber', 'Lyft', 'Grab', 'Ola'],
      statement: `<p>Pick and justify data stores for: (1) live driver locations (5 M drivers, ping every 4 s) and "nearest drivers" search; (2) trips and fares (must never lose or double-charge); (3) full location history for disputes and ML (keep 2 years); (4) city-level dashboards (trips/hour, surge). Give the schema/key design for the system of record and explain how data flows between stores.</p>`,
      constraints: `p99 nearest-driver query &lt; 50 ms. Trip writes ~5 000/s peak. 99.99% availability for booking. Operate in 40 countries; some require in-country data storage.`,
      example: `<p>Location pings: 5 M / 4 s = ${H.c('y', '1.25 M writes/s')} — ephemeral, only the latest matters → ${H.c('g', 'in-memory geo index')}. Trips: ${H.c('y', '5 K writes/s')} with money → ${H.c('g', 'ACID relational, sharded by city/region')}.</p>`,
      brute: { why: `<p>"Put everything in one MongoDB cluster." Location pings at 1.25 M updates/s with a geo index thrash the primary of every shard; payments need multi-document invariants and careful write concerns; dashboards scanning billions of documents compete with live traffic; data residency forces per-country clusters anyway. One store optimised for nothing.</p>`, code: { lang: 'js', check: false, code: `// everything in one collection family, one cluster
db.drivers.updateOne({ _id: 42 }, { $set: { loc: { type: "Point", coordinates: [77.59, 12.97] } } });  // 1.25M/s
db.trips.insertOne({ rider: 7, driver: 42, fare: 230, status: "requested" });
db.trips.aggregate([{ $group: { _id: { city: "$city", hour: { $hour: "$ts" } }, n: { $sum: 1 } } }]);   // full scans on the OLTP cluster` } },
      mcq: { q: 'Driver location pings arrive 1.25 M times per second and only the latest position matters. Best primary store for "nearest drivers"?', options: ['A relational table with UPDATE per ping and a spatial index', 'An in-memory geo index (Redis GEO / custom geohash service) sharded by city', 'A columnar warehouse', 'A graph database'], answer: 1, explain: 'The data is ephemeral, write-hot and queried by proximity with tight latency: an in-memory geo structure sharded by region fits; durable history goes elsewhere asynchronously.' },
      hints: [
        `<p>Hint 1: Split by <b>data type and lifetime</b>: ephemeral hot state, money-critical records, append-only history, analytics. Each gets its own store.</p>`,
        `<p>Hint 2: Do the math: pings/s, bytes/day for history (1.25 M/s × 50 B ≈ 5.4 TB/day), trip TPS. The numbers pick the families.</p>`,
        `<p>Hint 3: Connect stores with Kafka/CDC; shard the system of record by <b>region/city</b> — it matches access (trips are local), data residency, and blast radius.</p>`
      ],
      tests: { engine: 'sqlite', check: '(rows, cols, c) => {\n  if (c.plan || c.noplan) { const d = rows.map(r => r[r.length - 1]).join(\'\\n\'); return (!c.plan || new RegExp(c.plan).test(d)) && (!c.noplan || !new RegExp(c.noplan).test(d)); }\n  let a = rows, b = c.rows || [];\n  if (c.set) { const k = r => JSON.stringify(r); a = a.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); b = b.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); }\n  return a.length === b.length && a.every((r, i) => r.length === b[i].length && r.every((v, j) => v === b[i][j] || (typeof v === \'number\' && typeof b[i][j] === \'number\' && Math.abs(v - b[i][j]) < 1e-6)));\n}', cases: [
        { rows: [
            ['t-1', 'completed', 23000]
          ] },
        { after: 'SELECT count(*) FROM trips', rows: [
            [1]
          ] },
        { after: 'SELECT trip_id, driver_id, fare_paise FROM trips WHERE idempotency_key = \'req-7-001\'', rows: [
            ['t-1', 42, 23000]
          ] },
        { after: 'INSERT INTO trips VALUES (\'t-3\', \'IN-BLR\', 7, NULL, \'requested\', NULL, \'req-7-001\', \'2026-10-14T09:01\')', error: 'UNIQUE' },
        { after: 'INSERT INTO trips VALUES (\'t-3\', \'IN-BLR\', 7, NULL, \'teleporting\', NULL, \'req-7-002\', \'2026-10-14T09:01\')', error: 'CHECK' },
        { after: 'INSERT INTO trips VALUES (\'t-3\', \'IN-BLR\', 7, 42, \'completed\', -1, \'req-7-002\', \'2026-10-14T09:01\')', error: 'CHECK' },
        { after: 'INSERT INTO trips VALUES (\'t-3\', \'IN-BLR\', 7, NULL, \'requested\', NULL, NULL, \'2026-10-14T09:01\')', error: 'NOT NULL' },
        { after: 'INSERT INTO trips VALUES (\'t-3\', \'IN-BLR\', 8, NULL, \'requested\', NULL, \'req-8-001\', \'2026-10-14T09:02\'); SELECT trip_id FROM trips WHERE region = \'IN-BLR\' AND rider_id = 7', rows: [
            ['t-1']
          ] },
        { rows: [], plan: 'SEARCH trips USING INDEX trips_by_rider \\(region=\\? AND rider_id=\\?\\)', after: 'EXPLAIN QUERY PLAN SELECT trip_id, status, fare_paise FROM trips WHERE region = \'IN-BLR\' AND rider_id = 7' }
      ] },
      solution: {
        approach: `<p><b>(1) Live locations:</b> Redis GEO (or an in-house geohash/H3 service) sharded by city; ping = <code>GEOADD</code>, search = <code>GEOSEARCH</code> radius; TTL so stale drivers vanish. Losing it is OK — drivers re-ping within 4 s. <b>(2) Trips & fares:</b> relational ACID store as system of record — Postgres/MySQL sharded by region (Vitess/Citus), or a NewSQL cluster (CockroachDB/Spanner) with REGIONAL BY ROW for residency; idempotency keys on payment calls; a state machine for trip status. <b>(3) History:</b> pings stream to Kafka → Cassandra/Scylla <code>((driver_id, day), ts)</code> with 2-year TTL, or Parquet on object storage (~5 TB/day). <b>(4) Dashboards:</b> CDC from trips + the ping stream → ClickHouse/BigQuery, pre-aggregated by city-hour. Trade-offs: 4 systems to operate (justified by 4 very different workloads), eventual consistency between them (seconds), and per-region deployments for residency.</p>`,
        code: { lang: 'sql', title: 'System of record: trips (runnable SQLite sketch; production = sharded Postgres/NewSQL by region)', code: `CREATE TABLE trips (
  trip_id        TEXT PRIMARY KEY,                    -- UUID: no sequential hotspot
  region         TEXT NOT NULL,                       -- shard / locality key (data residency)
  rider_id       INTEGER NOT NULL,
  driver_id      INTEGER,
  status         TEXT NOT NULL CHECK (status IN ('requested','accepted','ongoing','completed','cancelled')),
  fare_paise     INTEGER CHECK (fare_paise >= 0),
  idempotency_key TEXT NOT NULL UNIQUE,               -- retries never create a second trip/charge
  requested_at   TEXT NOT NULL
);
CREATE INDEX trips_by_rider ON trips (region, rider_id, requested_at);

INSERT INTO trips VALUES ('t-1', 'IN-BLR', 7, 42, 'completed', 23000, 'req-7-001', '2026-10-14T09:00');
-- a client retry with the same key is absorbed instead of double-booking:
INSERT INTO trips VALUES ('t-2', 'IN-BLR', 7, NULL, 'requested', NULL, 'req-7-001', '2026-10-14T09:00')
  ON CONFLICT (idempotency_key) DO NOTHING;
SELECT trip_id, status, fare_paise FROM trips WHERE region = 'IN-BLR' AND rider_id = 7;` },
        alt: [{ lang: 'text', check: false, title: 'Other stores (Redis GEO + CQL history)', code: `# live locations (Redis, one key per city)
GEOADD drivers:IN-BLR 77.5946 12.9716 driver:42
EXPIRE drivers:IN-BLR:driver:42:alive 15
GEOSEARCH drivers:IN-BLR FROMLONLAT 77.60 12.97 BYRADIUS 2 km ASC COUNT 20 WITHDIST

-- location history (Cassandra)
CREATE TABLE geo.pings_by_driver (
  driver_id bigint, day date, ts timestamp, lat double, lon double,
  PRIMARY KEY ((driver_id, day), ts)
) WITH default_time_to_live = 63072000;   -- 2 years` }],
        complexity: `<p>Nearest drivers: O(log N + k) in the geo index, sub-10 ms in memory. Trip writes: single-shard ACID transactions. History: ~5 TB/day ingest spread across a wide-column cluster. Analytics: seconds-to-minutes freshness via CDC.</p>`,
        followUps: ['How do you handle a city whose driver count overloads one Redis shard?', 'What happens to in-flight trips during a regional failover?', 'How would surge pricing read both live supply (Redis) and demand (trip requests) consistently enough?']
      }
    }]
  });

  /* =====================================================================
     PRACTICE — Easy
     ===================================================================== */
  practice.push({
    title: 'Replication Lag Report',
    level: 'Easy', tags: ['replication', 'monitoring'], companies: ['GitLab', 'Shopify', 'Atlassian'],
    statement: `<p>Using <code>wal</code> and <code>replicas</code> (db <code>repl</code>), produce a lag report for every replica: <code>name, role, lsn_behind, lag_ms, status</code>, where <code>lsn_behind</code> = newest LSN − applied LSN, <code>lag_ms</code> = newest commit time − commit time of the replica's last applied entry, and <code>status</code> = <code>'STALE'</code> if lag_ms &gt; 300 else <code>'ok'</code>. Order by lag_ms descending.</p>`,
    constraints: `Every applied_lsn exists in wal. One leader, any number of followers.`,
    example: `<p>db-f4 applied LSN 101 (committed at 1000 ms); newest is LSN 110 at 1640 ms → lsn_behind ${H.c('y', '9')}, lag_ms ${H.c('r', '640 → STALE')}. db-f2 applied 107 (1420 ms) → ${H.c('g', '220 → ok')}.</p>`,
    brute: { why: `<p>Hard-code the newest LSN (<code>110</code>) into the query. It works today and silently lies tomorrow, and it says nothing about <i>time</i>, which is what users feel. Lag in log entries and lag in milliseconds are different: 9 tiny entries may replay instantly while 1 huge transaction takes minutes.</p>`, code: { lang: 'sql', db: 'repl', code: `SELECT name, role, 110 - applied_lsn AS lsn_behind
FROM replicas
ORDER BY lsn_behind DESC;   -- 110 hard-coded: wrong as soon as a new write arrives` } },
    mcq: { q: 'Why can "entries behind" be misleading as a lag metric?', options: ['LSNs are random', 'One entry can be a huge transaction while many entries can be tiny; users care about time', 'Followers never apply entries in order', 'It is always zero for async replicas'], answer: 1, explain: 'Replay time depends on the size and cost of each entry. Time-based lag (replay_lag, heartbeat tables) reflects what users experience.' },
    hints: [
      `<p>Hint 1: Use scalar subqueries for the newest values: <code>(SELECT MAX(lsn) FROM wal)</code> and <code>(SELECT MAX(commit_ms) FROM wal)</code>.</p>`,
      `<p>Hint 2: Join (or correlated subquery) to <code>wal</code> on <code>lsn = r.applied_lsn</code> to get the commit time of the last applied entry.</p>`,
      `<p>Hint 3: Wrap it in a CTE and add <code>CASE WHEN lag_ms &gt; 300 THEN 'STALE' ELSE 'ok' END</code>; order by lag_ms DESC.</p>`
    ],
    tests: { engine: 'sqlite', check: '(rows, cols, c) => {\n  if (c.plan || c.noplan) { const d = rows.map(r => r[r.length - 1]).join(\'\\n\'); return (!c.plan || new RegExp(c.plan).test(d)) && (!c.noplan || !new RegExp(c.noplan).test(d)); }\n  let a = rows, b = c.rows || [];\n  if (c.set) { const k = r => JSON.stringify(r); a = a.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); b = b.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); }\n  return a.length === b.length && a.every((r, i) => r.length === b[i].length && r.every((v, j) => v === b[i][j] || (typeof v === \'number\' && typeof b[i][j] === \'number\' && Math.abs(v - b[i][j]) < 1e-6)));\n}', cases: [
      { setup: '', rows: [
          ['db-f4', 'async', 9, 640, 'STALE'],
          ['db-f3', 'async', 6, 460, 'STALE'],
          ['db-f2', 'async', 3, 220, 'ok'],
          ['db-f1', 'sync', 0, 0, 'ok'],
          ['db-leader', 'leader', 0, 0, 'ok']
        ] },
      { setup: 'INSERT INTO wal VALUES (111,1800,7,\'x\',\'y\')', rows: [
          ['db-f4', 'async', 10, 800, 'STALE'],
          ['db-f3', 'async', 7, 620, 'STALE'],
          ['db-f2', 'async', 4, 380, 'STALE'],
          ['db-f1', 'sync', 1, 160, 'ok'],
          ['db-leader', 'leader', 1, 160, 'ok']
        ] },
      { setup: 'INSERT INTO wal VALUES (111,1800,7,\'x\',\'y\'); UPDATE replicas SET applied_lsn = 108 WHERE name = \'db-f2\'', rows: [
          ['db-f4', 'async', 10, 800, 'STALE'],
          ['db-f3', 'async', 7, 620, 'STALE'],
          ['db-f2', 'async', 3, 300, 'ok'],
          ['db-f1', 'sync', 1, 160, 'ok'],
          ['db-leader', 'leader', 1, 160, 'ok']
        ] },
      { setup: 'INSERT INTO wal VALUES (111,1800,7,\'x\',\'y\'); UPDATE replicas SET applied_lsn = 107 WHERE name = \'db-f2\'', rows: [
          ['db-f4', 'async', 10, 800, 'STALE'],
          ['db-f3', 'async', 7, 620, 'STALE'],
          ['db-f2', 'async', 4, 380, 'STALE'],
          ['db-f1', 'sync', 1, 160, 'ok'],
          ['db-leader', 'leader', 1, 160, 'ok']
        ] },
      { setup: 'UPDATE replicas SET applied_lsn = 104 WHERE name = \'db-f1\'; UPDATE replicas SET applied_lsn = 104 WHERE name = \'db-f2\'', rows: [
          ['db-f4', 'async', 9, 640, 'STALE'],
          ['db-f1', 'sync', 6, 460, 'STALE'],
          ['db-f2', 'async', 6, 460, 'STALE'],
          ['db-f3', 'async', 6, 460, 'STALE'],
          ['db-leader', 'leader', 0, 0, 'ok']
        ] },
      { setup: 'DELETE FROM replicas WHERE role <> \'leader\'', rows: [
          ['db-leader', 'leader', 0, 0, 'ok']
        ] },
      { setup: 'UPDATE replicas SET applied_lsn = 999 WHERE name = \'db-f3\'', rows: [
          ['db-f4', 'async', 9, 640, 'STALE'],
          ['db-f2', 'async', 3, 220, 'ok'],
          ['db-f1', 'sync', 0, 0, 'ok'],
          ['db-leader', 'leader', 0, 0, 'ok']
        ] },
      { setup: 'DELETE FROM wal WHERE lsn = 110', rows: [
          ['db-f4', 'async', 8, 560, 'STALE'],
          ['db-f3', 'async', 5, 380, 'STALE'],
          ['db-f2', 'async', 2, 140, 'ok']
        ] },
      { setup: 'UPDATE replicas SET applied_lsn = 110', rows: [
          ['db-f1', 'sync', 0, 0, 'ok'],
          ['db-f2', 'async', 0, 0, 'ok'],
          ['db-f3', 'async', 0, 0, 'ok'],
          ['db-f4', 'async', 0, 0, 'ok'],
          ['db-leader', 'leader', 0, 0, 'ok']
        ] }
    ] },
    solution: {
      approach: `<p>Compute the leader's head position once, join each replica to the WAL row it last applied, and derive both lag measures. In Postgres the same report comes from <code>pg_stat_replication</code> (<code>replay_lag</code>, <code>pg_wal_lsn_diff(sent_lsn, replay_lsn)</code>); export it to your metrics system and alert on the time-based number.</p>`,
      code: { lang: 'sql', db: 'repl', code: `WITH head AS (
  SELECT MAX(lsn) AS max_lsn, MAX(commit_ms) AS max_ms FROM wal
), lag AS (
  SELECT r.name, r.role,
         h.max_lsn - r.applied_lsn AS lsn_behind,
         h.max_ms  - w.commit_ms   AS lag_ms
  FROM replicas AS r
  JOIN wal      AS w ON w.lsn = r.applied_lsn
  CROSS JOIN head AS h
)
SELECT name, role, lsn_behind, lag_ms,
       CASE WHEN lag_ms > 300 THEN 'STALE' ELSE 'ok' END AS status
FROM lag
ORDER BY lag_ms DESC, name;` },
      complexity: `<p>O(R) with an index on wal.lsn (it is the primary key). Run every few seconds.</p>`,
      followUps: ['How would you measure lag if the leader has had no writes for 10 minutes (the "idle lag" problem)?', 'Should a load balancer remove STALE replicas automatically? What could go wrong?']
    }
  });

  practice.push({
    title: 'Hash-Mod Shard Assignment and Its Rebalancing Trap',
    level: 'Easy', tags: ['sharding', 'hashing'], companies: ['Pinterest', 'Instagram', 'Zomato'],
    statement: `<p>With 4 shards and the rule <code>shard = user_id % 4</code>, report for each shard the number of users and the number of requests (db <code>shard</code>). Then report how many of the 24 users would <b>move</b> if you grew to 5 shards with <code>user_id % 5</code>.</p>`,
    constraints: `24 users, 120 requests. Output two result sets: per-shard counts, then the moved-user count.`,
    example: `<p>Per shard: 6 users each, but requests ${H.c('r', '73')} on shard 1 (it holds the celebrity, user 1) versus 15-16 elsewhere. Growing to 5 shards moves ${H.c('r', '17 of 24 users')} (about 70%; it tends to N/(N+1) = 80% for large key sets) — the classic reason not to use <code>mod N</code> with N = number of servers.</p>`,
    brute: { why: `<p>Count each shard with its own full scan — four separate queries glued together. Correct but scans the table 4 times, and adding a shard means editing the query.</p>`, code: { lang: 'sql', db: 'shard', code: `SELECT 0 AS shard, (SELECT COUNT(*) FROM users WHERE user_id % 4 = 0) AS users
UNION ALL SELECT 1, (SELECT COUNT(*) FROM users WHERE user_id % 4 = 1)
UNION ALL SELECT 2, (SELECT COUNT(*) FROM users WHERE user_id % 4 = 2)
UNION ALL SELECT 3, (SELECT COUNT(*) FROM users WHERE user_id % 4 = 3);` } },
    mcq: { q: 'Going from N to N+1 shards with key mod N moves roughly what fraction of keys?', options: ['1/(N+1)', 'N/(N+1)', '1/2', 'none'], answer: 1, explain: 'A key stays only if k mod N = k mod (N+1), which happens for about 1/(N+1) of keys; the rest (≈ N/(N+1)) move. Consistent hashing moves only ≈ 1/(N+1).' },
    hints: [
      `<p>Hint 1: One <code>GROUP BY user_id % 4</code> over users joined (LEFT JOIN) to requests gives both counts in one pass.</p>`,
      `<p>Hint 2: Count distinct users with <code>COUNT(DISTINCT u.user_id)</code> and requests with <code>COUNT(q.req_id)</code> (NULL-safe).</p>`,
      `<p>Hint 3: Moved users: <code>SUM(user_id % 4 &lt;&gt; user_id % 5)</code> — a comparison is 0/1 in SQLite.</p>`
    ],
    tests: { engine: 'sqlite', check: '(rows, cols, c) => {\n  if (c.plan || c.noplan) { const d = rows.map(r => r[r.length - 1]).join(\'\\n\'); return (!c.plan || new RegExp(c.plan).test(d)) && (!c.noplan || !new RegExp(c.noplan).test(d)); }\n  let a = rows, b = c.rows || [];\n  if (c.set) { const k = r => JSON.stringify(r); a = a.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); b = b.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); }\n  return a.length === b.length && a.every((r, i) => r.length === b[i].length && r.every((v, j) => v === b[i][j] || (typeof v === \'number\' && typeof b[i][j] === \'number\' && Math.abs(v - b[i][j]) < 1e-6)));\n}', cases: [
      { setup: '', rows: [
          [0, 6, 15],
          [1, 6, 73],
          [2, 6, 16],
          [3, 6, 16]
        ], result: 0 },
      { setup: '', rows: [
          [17, 24]
        ] },
      { setup: 'DELETE FROM requests', rows: [
          [0, 6, 0],
          [1, 6, 0],
          [2, 6, 0],
          [3, 6, 0]
        ], result: 0 },
      { setup: 'DELETE FROM requests', rows: [
          [17, 24]
        ] },
      { setup: 'DELETE FROM users WHERE user_id > 12; DELETE FROM requests WHERE user_id > 12', rows: [
          [0, 3, 9],
          [1, 3, 66],
          [2, 3, 9],
          [3, 3, 9]
        ], result: 0 },
      { setup: 'DELETE FROM users WHERE user_id > 12; DELETE FROM requests WHERE user_id > 12', rows: [
          [9, 12]
        ] },
      { setup: 'DELETE FROM requests WHERE user_id = 1', rows: [
          [0, 6, 15],
          [1, 6, 13],
          [2, 6, 16],
          [3, 6, 16]
        ], result: 0 },
      { setup: 'DELETE FROM requests WHERE user_id = 1', rows: [
          [17, 24]
        ] },
      { setup: 'INSERT INTO users VALUES (25,\'u25\',\'IN\',\'acme\',1)', rows: [
          [0, 6, 15],
          [1, 7, 73],
          [2, 6, 16],
          [3, 6, 16]
        ], result: 0 },
      { setup: 'INSERT INTO users VALUES (25,\'u25\',\'IN\',\'acme\',1)', rows: [
          [18, 25]
        ] },
      { setup: 'DELETE FROM users WHERE user_id IN (2, 3, 4)', rows: [
          [0, 5, 12],
          [1, 6, 73],
          [2, 5, 13],
          [3, 5, 13]
        ], result: 0 },
      { setup: 'DELETE FROM users WHERE user_id IN (2, 3, 4)', rows: [
          [16, 21]
        ] }
    ] },
    solution: {
      approach: `<p>Group once by the shard expression; use a LEFT JOIN so shards without requests still appear. The moved count shows why production systems use a fixed, large number of logical partitions (e.g. 1024 or Redis's 16 384 slots) mapped to servers through a table — growing the cluster moves whole partitions, and the key → partition function never changes.</p>`,
      code: { lang: 'sql', db: 'shard', code: `SELECT u.user_id % 4               AS shard,
       COUNT(DISTINCT u.user_id)     AS users,
       COUNT(q.req_id)               AS requests
FROM users AS u
LEFT JOIN requests AS q ON q.user_id = u.user_id
GROUP BY shard
ORDER BY shard;

SELECT SUM(user_id % 4 <> user_id % 5) AS users_that_move,
       COUNT(*)                         AS total_users
FROM users;` },
      complexity: `<p>O(U + Q) single pass with grouping.</p>`,
      followUps: ['Design the partition → node table that avoids mass moves.', 'Why is <code>user_id % 4</code> a bad hash for sequential ids that share a pattern (e.g. all even)?']
    }
  });

  practice.push({
    title: 'List Every Strong Quorum for N Replicas',
    level: 'Easy', tags: ['quorum', 'recursive CTE'], companies: ['Amazon', 'DataStax', 'Apple'],
    statement: `<p>For a replication factor <b>N = 3</b> (make it a parameter), list every pair (W, R) with 1 ≤ W, R ≤ N such that <b>R + W &gt; N</b>, plus how many node failures writes and reads can tolerate (N − W, N − R). Order by the smaller tolerance (descending), then W.</p>`,
    constraints: `N between 1 and 9. Use a recursive CTE to generate numbers; do not hard-code the pairs.`,
    example: `<p>N = 3 → (2, 2) tolerates ${H.c('g', '1 / 1')}; (3, 1) tolerates ${H.c('y', '0 writes / 2 reads')}; (1, 3) tolerates ${H.c('y', '2 / 0')}; (2,3), (3,2), (3,3) also qualify. (1, 1) and (1, 2) do not.</p>`,
    brute: { why: `<p>Type all 9 pairs by hand in a VALUES list. Works for N = 3, but N = 5 needs 25 rows and N = 7 needs 49 — error-prone and not reusable.</p>`, code: { lang: 'sql', code: `WITH pairs(w, r) AS (VALUES (1,1),(1,2),(1,3),(2,1),(2,2),(2,3),(3,1),(3,2),(3,3))
SELECT w, r FROM pairs WHERE w + r > 3;` } },
    mcq: { q: 'With N = 3, which setting lets the system keep accepting BOTH reads and writes with one node down, while still guaranteeing overlap?', options: ['W=3, R=1', 'W=1, R=3', 'W=2, R=2', 'W=1, R=1'], answer: 2, explain: 'W=2, R=2: overlap since 4 > 3, and each operation needs only 2 of 3 nodes, so one failure is tolerated for both.' },
    hints: [
      `<p>Hint 1: Put N in a one-row CTE <code>params(n)</code> so it can change in one place.</p>`,
      `<p>Hint 2: <code>WITH RECURSIVE k(x) AS (SELECT 1 UNION ALL SELECT x + 1 FROM k, params WHERE x &lt; n)</code> generates 1..N.</p>`,
      `<p>Hint 3: Cross join k with itself as w and r, filter <code>w.x + r.x &gt; n</code>, compute <code>n - w.x</code> and <code>n - r.x</code>, order with <code>MIN(n - w.x, n - r.x) DESC</code>.</p>`
    ],
    tests: { engine: 'sqlite', check: '(rows, cols, c) => {\n  if (c.plan || c.noplan) { const d = rows.map(r => r[r.length - 1]).join(\'\\n\'); return (!c.plan || new RegExp(c.plan).test(d)) && (!c.noplan || !new RegExp(c.noplan).test(d)); }\n  let a = rows, b = c.rows || [];\n  if (c.set) { const k = r => JSON.stringify(r); a = a.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); b = b.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); }\n  return a.length === b.length && a.every((r, i) => r.length === b[i].length && r.every((v, j) => v === b[i][j] || (typeof v === \'number\' && typeof b[i][j] === \'number\' && Math.abs(v - b[i][j]) < 1e-6)));\n}', cases: [
      { rows: [
          [2, 2, 1, 1],
          [1, 3, 2, 0],
          [2, 3, 1, 0],
          [3, 1, 0, 2],
          [3, 2, 0, 1],
          [3, 3, 0, 0]
        ] },
      { after: 'UPDATE params SET n = 1; SELECT * FROM strong_quorums', rows: [
          [1, 1, 0, 0]
        ] },
      { after: 'UPDATE params SET n = 2; SELECT * FROM strong_quorums', rows: [
          [1, 2, 1, 0],
          [2, 1, 0, 1],
          [2, 2, 0, 0]
        ] },
      { after: 'UPDATE params SET n = 4; SELECT * FROM strong_quorums', rows: [
          [2, 3, 2, 1],
          [3, 2, 1, 2],
          [3, 3, 1, 1],
          [1, 4, 3, 0],
          [2, 4, 2, 0],
          [3, 4, 1, 0],
          [4, 1, 0, 3],
          [4, 2, 0, 2],
          [4, 3, 0, 1],
          [4, 4, 0, 0]
        ] },
      { after: 'UPDATE params SET n = 5; SELECT * FROM strong_quorums', rows: [
          [3, 3, 2, 2],
          [2, 4, 3, 1],
          [3, 4, 2, 1],
          [4, 2, 1, 3],
          [4, 3, 1, 2],
          [4, 4, 1, 1],
          [1, 5, 4, 0],
          [2, 5, 3, 0],
          [3, 5, 2, 0],
          [4, 5, 1, 0],
          [5, 1, 0, 4],
          [5, 2, 0, 3],
          [5, 3, 0, 2],
          [5, 4, 0, 1],
          [5, 5, 0, 0]
        ] },
      { after: 'UPDATE params SET n = 7; SELECT * FROM strong_quorums', rows: [
          [4, 4, 3, 3],
          [3, 5, 4, 2],
          [4, 5, 3, 2],
          [5, 3, 2, 4],
          [5, 4, 2, 3],
          [5, 5, 2, 2],
          [2, 6, 5, 1],
          [3, 6, 4, 1],
          [4, 6, 3, 1],
          [5, 6, 2, 1],
          [6, 2, 1, 5],
          [6, 3, 1, 4],
          [6, 4, 1, 3],
          [6, 5, 1, 2],
          [6, 6, 1, 1],
          [1, 7, 6, 0],
          [2, 7, 5, 0],
          [3, 7, 4, 0],
          [4, 7, 3, 0],
          [5, 7, 2, 0],
          [6, 7, 1, 0],
          [7, 1, 0, 6],
          [7, 2, 0, 5],
          [7, 3, 0, 4],
          [7, 4, 0, 3],
          [7, 5, 0, 2],
          [7, 6, 0, 1],
          [7, 7, 0, 0]
        ] },
      { after: 'UPDATE params SET n = 9; SELECT * FROM strong_quorums', rows: [
          [5, 5, 4, 4],
          [4, 6, 5, 3],
          [5, 6, 4, 3],
          [6, 4, 3, 5],
          [6, 5, 3, 4],
          [6, 6, 3, 3],
          [3, 7, 6, 2],
          [4, 7, 5, 2],
          [5, 7, 4, 2],
          [6, 7, 3, 2],
          [7, 3, 2, 6],
          [7, 4, 2, 5],
          [7, 5, 2, 4],
          [7, 6, 2, 3],
          [7, 7, 2, 2],
          [2, 8, 7, 1],
          [3, 8, 6, 1],
          [4, 8, 5, 1],
          [5, 8, 4, 1],
          [6, 8, 3, 1],
          [7, 8, 2, 1],
          [8, 2, 1, 7],
          [8, 3, 1, 6],
          [8, 4, 1, 5],
          [8, 5, 1, 4],
          [8, 6, 1, 3],
          [8, 7, 1, 2],
          [8, 8, 1, 1],
          [1, 9, 8, 0],
          [2, 9, 7, 0],
          [3, 9, 6, 0],
          [4, 9, 5, 0],
          [5, 9, 4, 0],
          [6, 9, 3, 0],
          [7, 9, 2, 0],
          [8, 9, 1, 0],
          [9, 1, 0, 8],
          [9, 2, 0, 7],
          [9, 3, 0, 6],
          [9, 4, 0, 5],
          [9, 5, 0, 4],
          [9, 6, 0, 3],
          [9, 7, 0, 2],
          [9, 8, 0, 1],
          [9, 9, 0, 0]
        ] },
      { after: 'UPDATE params SET n = 3; SELECT * FROM strong_quorums', rows: [
          [2, 2, 1, 1],
          [1, 3, 2, 0],
          [2, 3, 1, 0],
          [3, 1, 0, 2],
          [3, 2, 0, 1],
          [3, 3, 0, 0]
        ] }
    ] },
    solution: {
      approach: `<p>Generate 1..N once, cross join for all pairs, keep the overlapping ones. The ordering surfaces the balanced choice (majority/majority) first, which is why QUORUM/QUORUM is the usual default; skewed choices (W = N) buy cheap reads at the cost of write availability.</p>`,
      code: { lang: 'sql', code: `CREATE TEMP TABLE params AS SELECT 3 AS n;   -- replication factor N: change it and read the view again

CREATE TEMP VIEW strong_quorums AS
WITH RECURSIVE k(x) AS (
  SELECT 1
  UNION ALL
  SELECT x + 1 FROM k, params WHERE x < params.n
)
SELECT w.x            AS W,
       r.x            AS R,
       p.n - w.x      AS write_failures_tolerated,
       p.n - r.x      AS read_failures_tolerated
FROM k AS w
CROSS JOIN k AS r
CROSS JOIN params AS p
WHERE w.x + r.x > p.n
ORDER BY MIN(p.n - w.x, p.n - r.x) DESC, W, R;

SELECT * FROM strong_quorums;` },
      complexity: `<p>O(N²) rows — at most 81 for N = 9.</p>`,
      followUps: ['Add a column for expected write latency if each extra ack waits for a slower replica.', 'How does LOCAL_QUORUM change the math in a 2-datacenter setup with 3 replicas each?']
    }
  });

  practice.push({
    title: 'Embed or Reference? Query an Order Document',
    level: 'Easy', tags: ['document store', 'JSON', 'modelling'], companies: ['MongoDB', 'Myntra', 'Etsy'],
    statement: `<p>Orders are stored as JSON documents with <b>embedded</b> line items and a <b>snapshot</b> of the customer name (db <code>nosql</code>, table <code>docs</code>, collection <code>'orders'</code>). For each customer id, return the customer name, number of orders, total units and total spend. Then explain why line items are embedded but products are referenced by SKU.</p>`,
    constraints: `Items array may have any length. Spend = Σ qty × price over all items of all the customer's orders.`,
    example: `<p>Asha (id 7) has o1 (3×40 + 1×450 = 570) and o3 (10×40 + 1×199 = 599) → ${H.c('g', '2 orders, 15 units, 1169')}. Ravi (id 3): ${H.c('g', '1 order, 2 units, 398')}.</p>`,
    brute: { why: `<p>Treat the JSON as plain text and use <code>LIKE '%"id":7%'</code>. It also matches <code>"id":70</code> or an id nested elsewhere, cannot sum quantities, and breaks when key order or spacing changes. Always use the database's JSON operators (or the document DB's query language).</p>`, code: { lang: 'sql', db: 'nosql', code: `SELECT COUNT(*) AS asha_orders
FROM docs
WHERE collection = 'orders' AND body LIKE '%"id":7%';   -- fragile string matching` } },
    mcq: { q: 'Which belongs EMBEDDED in an order document?', options: ['All reviews of each product', 'Line items with the price paid at purchase time', 'The full, live product catalogue entry', 'Every other order of the same customer'], answer: 1, explain: 'Line items are bounded, owned by the order, and read with it; the price must be a snapshot anyway. Reviews and other orders are unbounded; live product data is shared and changes independently.' },
    hints: [
      `<p>Hint 1: <code>json_each(body, '$.items')</code> turns the array into rows (one per item) you can join against the document.</p>`,
      `<p>Hint 2: Group by <code>json_extract(body, '$.customer.id')</code>; count orders with <code>COUNT(DISTINCT d.id)</code> because items multiply rows.</p>`,
      `<p>Hint 3: Units = <code>SUM(json_extract(i.value, '$.qty'))</code>, spend = <code>SUM(qty * price)</code>; take the name with <code>MAX(json_extract(body, '$.customer.name'))</code>.</p>`
    ],
    tests: { engine: 'sqlite', check: '(rows, cols, c) => {\n  if (c.plan || c.noplan) { const d = rows.map(r => r[r.length - 1]).join(\'\\n\'); return (!c.plan || new RegExp(c.plan).test(d)) && (!c.noplan || !new RegExp(c.noplan).test(d)); }\n  let a = rows, b = c.rows || [];\n  if (c.set) { const k = r => JSON.stringify(r); a = a.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); b = b.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); }\n  return a.length === b.length && a.every((r, i) => r.length === b[i].length && r.every((v, j) => v === b[i][j] || (typeof v === \'number\' && typeof b[i][j] === \'number\' && Math.abs(v - b[i][j]) < 1e-6)));\n}', cases: [
      { setup: '', rows: [
          [7, 'Asha', 2, 15, 1169],
          [3, 'Ravi', 1, 2, 398]
        ] },
      { setup: 'INSERT INTO docs VALUES (\'o4\', \'orders\', \'{"_id":"o4","customer":{"id":9,"name":"Zed"},"items":[{"sku":"A","qty":2,"price":5}]}\')', rows: [
          [7, 'Asha', 2, 15, 1169],
          [3, 'Ravi', 1, 2, 398],
          [9, 'Zed', 1, 2, 10]
        ] },
      { setup: 'INSERT INTO docs VALUES (\'o4\', \'orders\', \'{"_id":"o4","customer":{"id":3,"name":"Ravi"},"items":[{"sku":"A","qty":1,"price":1},{"sku":"B","qty":1,"price":1},{"sku":"C","qty":1,"price":1},{"sku":"D","qty":1,"price":1}]}\')', rows: [
          [7, 'Asha', 2, 15, 1169],
          [3, 'Ravi', 2, 6, 402]
        ] },
      { setup: 'INSERT INTO docs VALUES (\'o4\', \'orders\', \'{"_id":"o4","customer":{"id":9,"name":"Zed"},"items":[]}\')', rows: [
          [7, 'Asha', 2, 15, 1169],
          [3, 'Ravi', 1, 2, 398]
        ] },
      { setup: 'DELETE FROM docs WHERE collection = \'orders\'', rows: [] },
      { setup: 'INSERT INTO docs VALUES (\'x1\', \'invoices\', \'{"_id":"x1","customer":{"id":7,"name":"Asha"},"items":[{"sku":"A","qty":100,"price":100}]}\')', rows: [
          [7, 'Asha', 2, 15, 1169],
          [3, 'Ravi', 1, 2, 398]
        ] },
      { setup: 'DELETE FROM docs WHERE id = \'o3\'', rows: [
          [7, 'Asha', 1, 4, 570],
          [3, 'Ravi', 1, 2, 398]
        ] },
      { setup: 'INSERT INTO docs VALUES (\'o4\', \'orders\', \'{"_id":"o4","customer":{"id":7,"name":"Asha"},"items":[{"sku":"A","qty":1,"price":1}]}\'); INSERT INTO docs VALUES (\'o5\', \'orders\', \'{"_id":"o5","customer":{"id":3,"name":"Ravi"},"items":[{"sku":"A","qty":1,"price":100000}]}\')', rows: [
          [3, 'Ravi', 2, 3, 100398],
          [7, 'Asha', 3, 16, 1170]
        ] }
    ] },
    solution: {
      approach: `<p>Unnest the embedded array, then aggregate. <b>Embed</b> what is owned, bounded and read together (line items, shipping address snapshot); <b>reference</b> what is shared, large or changing independently (products by SKU, customers by id). Snapshots (name, price at purchase) are deliberate denormalisation: an order must show what was true when it was placed.</p>`,
      code: { lang: 'sql', db: 'nosql', code: `SELECT json_extract(d.body, '$.customer.id')                              AS customer_id,
       MAX(json_extract(d.body, '$.customer.name'))                       AS customer,
       COUNT(DISTINCT d.id)                                               AS orders,
       SUM(json_extract(i.value, '$.qty'))                                AS units,
       SUM(json_extract(i.value, '$.qty') * json_extract(i.value, '$.price')) AS spend
FROM docs AS d
JOIN json_each(d.body, '$.items') AS i
WHERE d.collection = 'orders'
GROUP BY customer_id
ORDER BY spend DESC;` },
      alt: [{ lang: 'js', check: false, title: 'MongoDB aggregation', code: `db.orders.aggregate([
  { $unwind: "$items" },
  { $group: {
      _id: "$customer.id",
      customer: { $first: "$customer.name" },
      orders: { $addToSet: "$_id" },
      units: { $sum: "$items.qty" },
      spend: { $sum: { $multiply: ["$items.qty", "$items.price"] } } } },
  { $project: { customer: 1, units: 1, spend: 1, orders: { $size: "$orders" } } },
  { $sort: { spend: -1 } }
]);` }],
      complexity: `<p>O(total line items). In MongoDB add an index on <code>customer.id</code> when filtering one customer.</p>`,
      followUps: ['A product is renamed: which documents change, and which must NOT?', 'An order could have 50 000 items (B2B). Embed or not?']
    }
  });

  /* =====================================================================
     PRACTICE — Medium
     ===================================================================== */
  practice.push({
    title: 'Detect Monotonic-Read Violations',
    level: 'Medium', tags: ['replication lag', 'window functions', 'consistency'], companies: ['LinkedIn', 'Twitter/X', 'Reddit'],
    statement: `<p><code>read_log(id, session_id, at_ms, replica, seen_lsn)</code> records which replica answered each read and how far it had applied (db <code>repl</code>). A <b>monotonic reads</b> violation happens when a session reads data <b>older</b> than something it already saw earlier — i.e. <code>seen_lsn</code> is lower than the <b>maximum</b> seen_lsn of any earlier read in the same session. List every violating read with the LSN the user had already seen.</p>`,
    constraints: `Reads per session ordered by at_ms. The first read of a session can never violate.`,
    example: `<p>s-mei saw 110, then 107 (${H.c('r', 'violation')}), then 108 — still ${H.c('r', 'a violation')} because 108 &lt; 110 even though it is newer than the previous read. Expected violators: reads ${H.c('r', '2, 6, 8, 9')}.</p>`,
    brute: { why: `<p>Compare each read only with the <b>previous</b> read using <code>LAG</code>. That misses read 9: 108 &gt; 107 looks like "time moved forward", yet the user had already seen 110 two reads earlier, so data still went backwards.</p>`, code: { lang: 'sql', db: 'repl', code: `SELECT id, session_id, seen_lsn,
       LAG(seen_lsn) OVER (PARTITION BY session_id ORDER BY at_ms) AS prev
FROM read_log
ORDER BY id;   -- flags only seen_lsn < prev: finds 2, 6, 8 but misses 9` } },
    mcq: { q: 'Which routing rule prevents monotonic-read violations without sending every read to the leader?', options: ['Round-robin across all replicas', 'Pin each session to one replica (e.g. hash(session) → replica), failing over carefully', 'Read from the replica with the lowest CPU', 'Use a bigger connection pool'], answer: 1, explain: 'A single replica only moves forward in the log, so a session pinned to it never sees time go backwards. On failover, choose a replica at least as advanced as the session\'s high-water mark.' },
    hints: [
      `<p>Hint 1: You need the running maximum of all <i>earlier</i> rows, not just the previous row.</p>`,
      `<p>Hint 2: <code>MAX(seen_lsn) OVER (PARTITION BY session_id ORDER BY at_ms ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING)</code> excludes the current row.</p>`,
      `<p>Hint 3: Compute it in a CTE, then filter <code>seen_lsn &lt; best_before</code> (NULL for first reads drops out automatically).</p>`
    ],
    tests: { engine: 'sqlite', check: '(rows, cols, c) => {\n  if (c.plan || c.noplan) { const d = rows.map(r => r[r.length - 1]).join(\'\\n\'); return (!c.plan || new RegExp(c.plan).test(d)) && (!c.noplan || !new RegExp(c.noplan).test(d)); }\n  let a = rows, b = c.rows || [];\n  if (c.set) { const k = r => JSON.stringify(r); a = a.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); b = b.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); }\n  return a.length === b.length && a.every((r, i) => r.length === b[i].length && r.every((v, j) => v === b[i][j] || (typeof v === \'number\' && typeof b[i][j] === \'number\' && Math.abs(v - b[i][j]) < 1e-6)));\n}', cases: [
      { setup: '', rows: [
          [2, 's-asha', 'db-f3', 104, 110],
          [6, 's-ravi', 'db-f4', 101, 107],
          [8, 's-mei', 'db-f2', 107, 110],
          [9, 's-mei', 'db-f2', 108, 110]
        ] },
      { setup: 'DELETE FROM read_log', rows: [] },
      { setup: 'INSERT INTO read_log VALUES (10,\'s-x\',3000,\'db-f1\',50),(11,\'s-x\',3001,\'db-f2\',50),(12,\'s-x\',3002,\'db-f3\',49)', rows: [
          [2, 's-asha', 'db-f3', 104, 110],
          [6, 's-ravi', 'db-f4', 101, 107],
          [8, 's-mei', 'db-f2', 107, 110],
          [9, 's-mei', 'db-f2', 108, 110],
          [12, 's-x', 'db-f3', 49, 50]
        ] },
      { setup: 'INSERT INTO read_log VALUES (10,\'s-x\',3000,\'db-f1\',50),(11,\'s-x\',3001,\'db-f2\',60),(12,\'s-x\',3002,\'db-f3\',55)', rows: [
          [2, 's-asha', 'db-f3', 104, 110],
          [6, 's-ravi', 'db-f4', 101, 107],
          [8, 's-mei', 'db-f2', 107, 110],
          [9, 's-mei', 'db-f2', 108, 110],
          [12, 's-x', 'db-f3', 55, 60]
        ] },
      { setup: 'UPDATE read_log SET seen_lsn = 100', rows: [] },
      { setup: 'INSERT INTO read_log VALUES (10,\'s-asha\',1000,\'db-f4\',90)', rows: [
          [2, 's-asha', 'db-f3', 104, 110],
          [6, 's-ravi', 'db-f4', 101, 107],
          [8, 's-mei', 'db-f2', 107, 110],
          [9, 's-mei', 'db-f2', 108, 110]
        ] },
      { setup: 'DELETE FROM read_log WHERE session_id <> \'s-mei\'', rows: [
          [8, 's-mei', 'db-f2', 107, 110],
          [9, 's-mei', 'db-f2', 108, 110]
        ] },
      { setup: 'INSERT INTO read_log VALUES (10,\'s-y\',5000,\'db-f1\',10)', rows: [
          [2, 's-asha', 'db-f3', 104, 110],
          [6, 's-ravi', 'db-f4', 101, 107],
          [8, 's-mei', 'db-f2', 107, 110],
          [9, 's-mei', 'db-f2', 108, 110]
        ] }
    ] },
    solution: {
      approach: `<p>A window frame ending one row before the current one gives the session's high-water mark. Violations are reads below it. In an app, store that high-water mark in the session (a cookie or token) and route reads only to replicas at or beyond it — the same LSN-token trick used for read-your-writes.</p>`,
      code: { lang: 'sql', db: 'repl', code: `WITH marked AS (
  SELECT id, session_id, at_ms, replica, seen_lsn,
         MAX(seen_lsn) OVER (
           PARTITION BY session_id
           ORDER BY at_ms
           ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING
         ) AS already_seen
  FROM read_log
)
SELECT id, session_id, replica, seen_lsn, already_seen
FROM marked
WHERE seen_lsn < already_seen
ORDER BY id;` },
      complexity: `<p>O(n log n) for the window sort; O(1) per read in an app that keeps the high-water mark in the session.</p>`,
      followUps: ['Also detect read-your-writes violations using sessions.last_write_lsn.', 'Which of these violations would sticky routing have prevented?']
    }
  });

  practice.push({
    title: 'Remove a Node: Mod-N vs Rendezvous Hashing',
    level: 'Medium', lang: 'python', tags: ['sharding', 'rendezvous hashing', 'consistent hashing'], companies: ['Akamai', 'Cloudflare', 'Netflix'],
    statement: `<p>Cache keys are spread across 5 nodes. Node <b>C</b> dies. Write a function that returns how many of 10 000 keys change owner under (a) <code>hash(key) mod N</code> (N goes 5 → 4) and (b) <b>rendezvous (highest-random-weight) hashing</b>: owner = the node with the highest <code>hash(key + node)</code>. Print both counts and verify that with rendezvous only C's keys move.</p>`,
    constraints: `Use a stable hash (hashlib), not Python's randomized <code>hash()</code>. 10 000 keys, nodes A-E.`,
    example: `<p>Mod-N: about ${H.c('r', '80%')} of keys move (anything whose mod-5 and mod-4 owners differ). Rendezvous: about ${H.c('g', '20%')} move — exactly the keys that lived on C, each to its second-highest scoring node.</p>`,
    brute: { why: `<p>Mod-N recomputes every key's owner with a new divisor, so most keys change owner even though only one node left. For a cache this means a cluster-wide miss storm hitting the database right when you lost capacity.</p>`, code: { lang: 'python', run: true, code: `import hashlib

def h(s):
    return int(hashlib.sha1(s.encode()).hexdigest()[:12], 16)

keys = [f"k{i}" for i in range(10000)]
before = {k: h(k) % 5 for k in keys}
after = {k: h(k) % 4 for k in keys}     # node list shrank, divisor changed
print("mod-N moved:", sum(before[k] != after[k] for k in keys))` } },
    mcq: { q: 'In rendezvous hashing, when node X is removed, where does a key previously owned by X go?', options: ['To a random node', 'To the node with the next-highest score for that key', 'Always to the first node in the list', 'It is dropped'], answer: 1, explain: 'Each key ranks all nodes by hash(key, node). Removing the winner promotes the runner-up; keys owned by other nodes keep their winner.' },
    hints: [
      `<p>Hint 1: Rendezvous owner = <code>max(nodes, key=lambda n: h(key + "|" + n))</code>. No ring, no sorting of tokens.</p>`,
      `<p>Hint 2: Compute owners with all 5 nodes, then with C removed, and count differences.</p>`,
      `<p>Hint 3: Check the invariant: every moved key's old owner must be C (<code>all(before[k] == "C" for k in moved)</code>).</p>`
    ],
    tests: { sig: 'int string[] string -> int[]', fn: 'run_compare', harness: { python: 'def run_compare(n, nodes, dead):\n    keys = [f"k{i}" for i in range(n)]\n    mod_moved, moved, only_dead, owned = compare(keys, nodes, dead)\n    return [mod_moved, moved, int(only_dead), owned]' }, cases: [
      [
        [
          10000,
          ['A', 'B', 'C', 'D', 'E'],
          'C'
        ],
        [7994, 1961, 1, 1961]
      ],
      [
        [
          100,
          ['A', 'B', 'C', 'D', 'E'],
          'A'
        ],
        [83, 19, 1, 19]
      ],
      [
        [
          1,
          ['A', 'B', 'C', 'D', 'E'],
          'E'
        ],
        [0, 0, 1, 0]
      ],
      [
        [
          5000,
          ['A', 'B', 'C'],
          'B'
        ],
        [3277, 1699, 1, 1699]
      ],
      [
        [
          2000,
          ['n1', 'n2', 'n3', 'n4', 'n5', 'n6', 'n7', 'n8'],
          'n4'
        ],
        [1739, 282, 1, 282]
      ],
      [
        [
          300,
          ['A', 'B'],
          'A'
        ],
        [140, 152, 1, 152]
      ],
      [
        [
          500,
          ['A', 'B', 'C', 'D', 'E'],
          'Z'
        ],
        [0, 0, 1, 0]
      ],
      [
        [
          0,
          ['A', 'B', 'C', 'D', 'E'],
          'C'
        ],
        [0, 0, 1, 0]
      ]
    ] },
    solution: {
      approach: `<p>Rendezvous hashing gives each (key, node) pair a pseudo-random score and picks the max. Removing a node only affects keys where it was the max, so movement is the theoretical minimum (≈ 1/N). It is O(N) per lookup (fine for tens of nodes) and needs no virtual nodes for balance; consistent hashing with a sorted ring is O(log N) and preferred for very large clusters.</p>`,
      code: { lang: 'python', run: true, code: `import hashlib


def h(s):
    return int(hashlib.sha1(s.encode()).hexdigest()[:12], 16)


def rendezvous_owner(key, nodes):
    # highest random weight: every node "bids" for the key; best bid wins
    return max(nodes, key=lambda n: h(f"{key}|{n}"))


def compare(keys, nodes, dead):
    """How many keys change owner when node 'dead' disappears: mod-N vs rendezvous."""
    alive = [n for n in nodes if n != dead]
    mod_moved = sum(nodes[h(k) % len(nodes)] != alive[h(k) % len(alive)] for k in keys)
    hrw_before = {k: rendezvous_owner(k, nodes) for k in keys}
    hrw_after = {k: rendezvous_owner(k, alive) for k in keys}
    moved = [k for k in keys if hrw_before[k] != hrw_after[k]]
    only_dead = all(hrw_before[k] == dead for k in moved)
    return mod_moved, len(moved), only_dead, sum(v == dead for v in hrw_before.values())


keys = [f"k{i}" for i in range(10000)]
nodes = ["A", "B", "C", "D", "E"]
mod_moved, hrw_moved, only_dead, dead_owned = compare(keys, nodes, "C")

print(f"mod-N moved:      {mod_moved}")
print(f"rendezvous moved: {hrw_moved}")
print("only C's keys moved:", only_dead)
print("keys C owned:", dead_owned)
` },
      complexity: `<p>Rendezvous lookup O(N) hashes per key; movement on change ≈ K/N keys. Mod-N lookup O(1) but movement ≈ K·(N−1)/N.</p>`,
      followUps: ['How would you add weights (a node with 2× capacity)?', 'Why do Redis Cluster and Kafka use a fixed partition count instead of either scheme?']
    }
  });

  practice.push({
    title: 'Range Shard Split Planner',
    level: 'Medium', tags: ['range sharding', 'window functions', 'hot spots'], companies: ['MongoDB', 'Cockroach Labs', 'Yugabyte'],
    statement: `<p>Requests are routed by <code>range_map</code> (db <code>shard</code>). Find the <b>hottest range shard</b> by request count, then propose a <b>split point</b>: the smallest user_id such that the left part [lo..split] carries at least half of that shard's requests. Report shard, split_after, left_load, right_load. Explain what the result says about hot keys.</p>`,
    constraints: `Split only at user_id boundaries (a single key cannot be split by range).`,
    example: `<p>Shard 0 (users 1-6) has ${H.c('r', '75')} requests. User 1 alone has 60 ≥ 37.5 → split after user 1: left ${H.c('r', '60')}, right ${H.c('g', '15')}. Even the best range split leaves one key with 80% of the load.</p>`,
    brute: { why: `<p>Split at the middle of the <b>key range</b> (users 1-3 | 4-6), as naive size-based splitting does. Left gets 66 requests, right gets 9 — the split barely helps because it ignores where the load actually is.</p>`, code: { lang: 'sql', db: 'shard', code: `SELECT CASE WHEN q.user_id <= 3 THEN 'left [1-3]' ELSE 'right [4-6]' END AS half,
       COUNT(*) AS reqs
FROM requests AS q
WHERE q.user_id BETWEEN 1 AND 6
GROUP BY half;` } },
    mcq: { q: 'A range shard is hot because of ONE key. After a load-based split, what is still true?', options: ['Load is perfectly balanced', 'The shard holding that key is still hot; you need key splitting (salting) or caching', 'Range sharding automatically salts keys', 'The hot key moves to every shard'], answer: 1, explain: 'Range splits happen between keys. A single key\'s load cannot be divided by range boundaries.' },
    hints: [
      `<p>Hint 1: First aggregate requests per (shard, user_id) using <code>JOIN range_map ON user_id BETWEEN lo AND hi</code>.</p>`,
      `<p>Hint 2: Pick the hottest shard with <code>ORDER BY SUM(reqs) DESC LIMIT 1</code>; within it compute a running total <code>SUM(reqs) OVER (ORDER BY user_id)</code> and the shard total <code>SUM(reqs) OVER ()</code>.</p>`,
      `<p>Hint 3: The split is the first row where <code>running * 2 &gt;= total</code>; right_load = total − running.</p>`
    ],
    tests: { engine: 'sqlite', check: '(rows, cols, c) => {\n  if (c.plan || c.noplan) { const d = rows.map(r => r[r.length - 1]).join(\'\\n\'); return (!c.plan || new RegExp(c.plan).test(d)) && (!c.noplan || !new RegExp(c.noplan).test(d)); }\n  let a = rows, b = c.rows || [];\n  if (c.set) { const k = r => JSON.stringify(r); a = a.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); b = b.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); }\n  return a.length === b.length && a.every((r, i) => r.length === b[i].length && r.every((v, j) => v === b[i][j] || (typeof v === \'number\' && typeof b[i][j] === \'number\' && Math.abs(v - b[i][j]) < 1e-6)));\n}', cases: [
      { setup: '', rows: [
          [0, 1, 60, 15]
        ] },
      { setup: 'DELETE FROM requests WHERE user_id = 1', rows: [
          [1, 9, 9, 9]
        ] },
      { setup: 'DELETE FROM requests WHERE user_id <= 6 AND user_id > 1', rows: [
          [0, 1, 60, 0]
        ] },
      { setup: 'UPDATE requests SET user_id = 20 WHERE req_id % 2 = 0', rows: [
          [3, 20, 64, 8]
        ] },
      { setup: 'DELETE FROM requests WHERE req_id > 10', rows: [
          [0, 1, 5, 5]
        ] },
      { setup: 'UPDATE range_map SET hi = 1 WHERE shard = 0; UPDATE range_map SET lo = 2 WHERE shard = 1; UPDATE range_map SET lo = 2, hi = 12 WHERE shard = 1', rows: [
          [0, 1, 60, 0]
        ] },
      { setup: 'DELETE FROM requests', rows: [] }
    ] },
    solution: {
      approach: `<p>Load-based splitting (CockroachDB, Bigtable, DynamoDB adaptive capacity) finds the key where cumulative load crosses half — the result here shows the limit: the hot key itself becomes a one-key range. Next steps: salt the key, cache its reads, or isolate it on the strongest node.</p>`,
      code: { lang: 'sql', db: 'shard', code: `WITH per_user AS (
  SELECT r.shard, q.user_id, COUNT(*) AS reqs
  FROM requests AS q
  JOIN range_map AS r ON q.user_id BETWEEN r.lo AND r.hi
  GROUP BY r.shard, q.user_id
), hottest AS (
  SELECT shard FROM per_user GROUP BY shard ORDER BY SUM(reqs) DESC LIMIT 1
), cum AS (
  SELECT p.shard, p.user_id, p.reqs,
         SUM(p.reqs) OVER (ORDER BY p.user_id) AS running,
         SUM(p.reqs) OVER ()                   AS total
  FROM per_user AS p
  WHERE p.shard = (SELECT shard FROM hottest)
)
SELECT shard, user_id AS split_after, running AS left_load, total - running AS right_load
FROM cum
WHERE running * 2 >= total
ORDER BY user_id
LIMIT 1;` },
      complexity: `<p>O(Q log Q) for grouping and window sorting.</p>`,
      followUps: ['Extend it to propose splits for every shard above 1.5× average load.', 'How would you also respect a size limit (MB) together with load?']
    }
  });

  practice.push({
    title: 'Degrees of Separation (Graph Traversal in SQL)',
    level: 'Medium', tags: ['graph', 'recursive CTE', 'BFS'], companies: ['LinkedIn', 'Meta', 'Neo4j'],
    statement: `<p>Using <code>people</code> and the directed <code>follows(src, dst)</code> edges (db <code>nosql</code>), compute the <b>minimum number of hops</b> from Asha (id 1) to every reachable person, like LinkedIn's "1st, 2nd, 3rd degree" badges. Exclude Asha herself. Then state when you would move this query to a graph database.</p>`,
    constraints: `The graph has cycles (Leo follows Asha). Cap depth at 6 hops.`,
    example: `<p>${H.table(['name', 'hops'], [['Mei', '1'], ['Ravi', '1'], ['Tom', '2'], ['Zara', '2'], ['Leo', '3'], ['Nia', '3']])}<p>Tom is 2 hops (Asha → Ravi → Tom or Asha → Mei → Tom). The cycle Leo → Asha must not loop forever.</p>`,
    brute: { why: `<p>Hand-write one self-join per depth and UNION them: depth 1, depth 2 (two joins), depth 3 (three joins)... Each level is a new query block, the depth is fixed in code, and the number of intermediate rows explodes on real social graphs (average 300 friends → 300<sup>3</sup> = 27 M paths at depth 3).</p>`, code: { lang: 'sql', db: 'nosql', code: `SELECT f1.dst AS id, 1 AS hops FROM follows f1 WHERE f1.src = 1
UNION ALL
SELECT f2.dst, 2 FROM follows f1 JOIN follows f2 ON f2.src = f1.dst WHERE f1.src = 1
UNION ALL
SELECT f3.dst, 3 FROM follows f1 JOIN follows f2 ON f2.src = f1.dst
                       JOIN follows f3 ON f3.src = f2.dst WHERE f1.src = 1;
-- duplicates and non-minimal hops still need cleaning; depth is hard-coded` } },
    mcq: { q: 'Why does the recursive CTE use UNION (not UNION ALL) and a depth cap?', options: ['UNION is faster', 'UNION drops duplicate (id, hops) rows and the cap stops infinite cycles', 'SQLite requires UNION in recursive CTEs', 'UNION sorts the output'], answer: 1, explain: 'In a cyclic graph the recursion would revisit nodes forever; deduplication plus a hop limit (or a visited-path check) guarantees termination.' },
    hints: [
      `<p>Hint 1: Seed the recursion with (1, 0), then step: join the frontier to <code>follows</code> on <code>f.src = w.id</code> producing <code>(f.dst, hops + 1)</code>.</p>`,
      `<p>Hint 2: Bound it with <code>WHERE w.hops &lt; 6</code> and use <code>UNION</code> to avoid repeating identical rows.</p>`,
      `<p>Hint 3: Outside the CTE take <code>MIN(hops)</code> per person and drop id 1.</p>`
    ],
    tests: { engine: 'sqlite', check: '(rows, cols, c) => {\n  if (c.plan || c.noplan) { const d = rows.map(r => r[r.length - 1]).join(\'\\n\'); return (!c.plan || new RegExp(c.plan).test(d)) && (!c.noplan || !new RegExp(c.noplan).test(d)); }\n  let a = rows, b = c.rows || [];\n  if (c.set) { const k = r => JSON.stringify(r); a = a.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); b = b.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); }\n  return a.length === b.length && a.every((r, i) => r.length === b[i].length && r.every((v, j) => v === b[i][j] || (typeof v === \'number\' && typeof b[i][j] === \'number\' && Math.abs(v - b[i][j]) < 1e-6)));\n}', cases: [
      { setup: '', rows: [
          ['Mei', 1],
          ['Ravi', 1],
          ['Tom', 2],
          ['Zara', 2],
          ['Leo', 3],
          ['Nia', 3]
        ] },
      { setup: 'DELETE FROM follows', rows: [] },
      { setup: 'DELETE FROM follows WHERE src = 1', rows: [] },
      { setup: 'INSERT INTO follows VALUES (7,1),(7,6)', rows: [
          ['Mei', 1],
          ['Ravi', 1],
          ['Tom', 2],
          ['Zara', 2],
          ['Leo', 3],
          ['Nia', 3]
        ] },
      { setup: 'INSERT INTO people VALUES (8,\'P8\'),(9,\'P9\'),(10,\'P10\'),(11,\'P11\'),(12,\'P12\'),(13,\'P13\'),(14,\'P14\'),(15,\'P15\'); INSERT INTO follows VALUES (1,8),(8,9),(9,10),(10,11),(11,12),(12,13),(13,14),(14,15)', rows: [
          ['Mei', 1],
          ['P8', 1],
          ['Ravi', 1],
          ['P9', 2],
          ['Tom', 2],
          ['Zara', 2],
          ['Leo', 3],
          ['Nia', 3],
          ['P10', 3],
          ['P11', 4],
          ['P12', 5],
          ['P13', 6]
        ] },
      { setup: 'INSERT INTO people VALUES (8,\'P8\'),(9,\'P9\'),(10,\'P10\'),(11,\'P11\'),(12,\'P12\'); INSERT INTO follows VALUES (1,8),(8,9),(9,10),(10,11),(11,12)', rows: [
          ['Mei', 1],
          ['P8', 1],
          ['Ravi', 1],
          ['P9', 2],
          ['Tom', 2],
          ['Zara', 2],
          ['Leo', 3],
          ['Nia', 3],
          ['P10', 3],
          ['P11', 4],
          ['P12', 5]
        ] },
      { setup: 'INSERT INTO follows VALUES (1,7)', rows: [
          ['Mei', 1],
          ['Nia', 1],
          ['Ravi', 1],
          ['Tom', 2],
          ['Zara', 2],
          ['Leo', 3]
        ] },
      { setup: 'INSERT INTO people VALUES (99,\'Loner\')', rows: [
          ['Mei', 1],
          ['Ravi', 1],
          ['Tom', 2],
          ['Zara', 2],
          ['Leo', 3],
          ['Nia', 3]
        ] },
      { setup: 'INSERT INTO follows VALUES (1,1),(2,1),(5,5)', rows: [
          ['Mei', 1],
          ['Ravi', 1],
          ['Tom', 2],
          ['Zara', 2],
          ['Leo', 3],
          ['Nia', 3]
        ] }
    ] },
    solution: {
      approach: `<p>Recursive CTE = BFS frontier expansion; MIN(hops) gives the shortest path length. It is fine for small graphs or shallow depths. Move to a graph DB (Neo4j/Neptune) when multi-hop traversals are the core workload over millions of edges, or you need path algorithms (shortest weighted path, PageRank, community detection) interactively. In Cypher: <code>MATCH p = shortestPath((a:Person {id:1})-[:FOLLOWS*..6]-&gt;(b)) RETURN b.name, length(p)</code>.</p>`,
      code: { lang: 'sql', db: 'nosql', code: `WITH RECURSIVE walk(id, hops) AS (
  SELECT 1, 0                                  -- start at Asha
  UNION
  SELECT f.dst, w.hops + 1
  FROM walk AS w
  JOIN follows AS f ON f.src = w.id
  WHERE w.hops < 6                             -- cycle / explosion guard
)
SELECT p.name, MIN(w.hops) AS hops
FROM walk AS w
JOIN people AS p ON p.id = w.id
WHERE w.id <> 1
GROUP BY p.id
ORDER BY hops, p.name;` },
      complexity: `<p>Up to O(depth × E) rows in the worst case. A native graph DB with a visited set does BFS in O(V + E) touched.</p>`,
      followUps: ['Return one actual shortest path, not only its length.', 'Make it bidirectional ("mutual connections").']
    }
  });

  practice.push({
    title: 'Global Secondary Index vs Scatter-Gather',
    level: 'Medium', lang: 'python', tags: ['sharding', 'secondary index'], companies: ['Amazon', 'Uber', 'Airbnb'],
    statement: `<p>Users are sharded by <code>user_id</code> across 8 shards. The login page needs "find user by <b>email</b>". Implement and compare: (a) <b>scatter-gather</b> — ask every shard; (b) a <b>global secondary index</b> — a separate store sharded by email that maps email → user_id, then one targeted shard read. Count shard calls per lookup and describe the write-path cost of (b).</p>`,
    constraints: `8 shards, 10 000 users. Each lookup must return the right user. Report average calls per lookup for each approach.`,
    example: `<p>Scatter-gather: ${H.c('r', '8 calls')} per login (and the slowest shard sets the latency). Global index: ${H.c('g', '2 calls')} (index shard + data shard). But every signup or email change must also update the index — on another shard, often asynchronously.</p>`,
    brute: { why: `<p>Scatter-gather sends every lookup to all shards. Fine at 4 shards and low QPS; at 100 shards each login costs 100 requests and the p99 latency equals the slowest of 100 servers (tail-at-scale problem).</p>`, code: { lang: 'python', run: true, code: `N = 8
shards = [dict() for _ in range(N)]
for uid in range(10000):
    shards[uid % N][uid] = {"id": uid, "email": f"user{uid}@mail.com"}

def find_by_email_scatter(email):
    calls, found = 0, None
    for s in shards:                      # ask everybody
        calls += 1
        for row in s.values():
            if row["email"] == email:
                found = row
    return found, calls

print(find_by_email_scatter("user4242@mail.com"))` } },
    mcq: { q: 'DynamoDB global secondary indexes are…', options: ['Strongly consistent with the base table', 'Updated asynchronously, so index reads are eventually consistent', 'Stored inside each base partition', 'Only usable for range queries'], answer: 1, explain: 'GSIs are separately partitioned by the index key and propagated asynchronously; strongly consistent reads are not supported on them.' },
    hints: [
      `<p>Hint 1: The index is just another key-value store: <code>email → user_id</code>, partitioned by a hash of the email.</p>`,
      `<p>Hint 2: Lookup = 1 call to <code>index[hash(email) % N]</code>, then 1 call to <code>shards[user_id % N]</code>.</p>`,
      `<p>Hint 3: Writes must update both; if the index update is async, a just-registered user may fail to log in for a moment — handle it (retry, or synchronous index write in a transaction).</p>`
    ],
    tests: { sig: 'string -> string[]', fn: 'gsi', harness: { python: 'def gsi(op):\n    kind, _, rest = op.partition(":")\n    if kind == "find":\n        a, ca = find_by_email_scatter(rest)\n        b, cb = find_by_email_indexed(rest)\n        return [a["id"] if a else -1, ca, b["id"] if b else -1, cb]\n    uid, _, email = rest.partition(":")\n    try:\n        create_user(int(uid), email)\n        res = ["created"]\n    except ValueError:\n        res = ["taken"]\n    if kind == "create":\n        return res\n    a, ca = find_by_email_scatter(email)\n    b, cb = find_by_email_indexed(email)\n    return [a["id"] if a else -1, ca, b["id"] if b else -1, cb]' }, cases: [
      [
        ['find:user7@mail.com'],
        ['7', '8', '7', '2']
      ],
      [
        ['find:user4242@mail.com'],
        ['4242', '8', '4242', '2']
      ],
      [
        ['find:user9999@mail.com'],
        ['9999', '8', '9999', '2']
      ],
      [
        ['find:user0@mail.com'],
        ['0', '8', '0', '2']
      ],
      [
        ['find:nobody@mail.com'],
        ['-1', '8', '-1', '1']
      ],
      [
        ['find:USER7@mail.com'],
        ['-1', '8', '-1', '1']
      ],
      [
        ['create:20000:user7@mail.com'],
        ['taken']
      ],
      [
        ['create:20001:fresh@mail.com'],
        ['created']
      ],
      [
        ['dup:20002:user7@mail.com'],
        ['7', '8', '7', '2']
      ],
      [
        ['dup:20003:user8@mail.com'],
        ['8', '8', '8', '2']
      ]
    ] },
    solution: {
      approach: `<p>A global (term-partitioned) index turns an N-way fan-out into 2 targeted calls. The cost moves to writes: two shards change per signup, so you either use a distributed transaction (NewSQL does this for you), or update the index asynchronously and accept a short window where the index is stale. Local (document-partitioned) indexes have the opposite trade-off: cheap writes, scatter-gather reads. Uniqueness of email also needs the global index (a conditional put on the index row).</p>`,
      code: { lang: 'python', run: true, code: `import hashlib

N = 8


def h(s):
    return int(hashlib.md5(s.encode()).hexdigest()[:8], 16)


shards = [dict() for _ in range(N)]          # data, partitioned by user_id
email_index = [dict() for _ in range(N)]     # global index, partitioned by email


def create_user(uid, email):
    idx = email_index[h(email) % N]
    if email in idx:                          # conditional put = uniqueness check (before any data is written)
        raise ValueError("email taken")
    idx[email] = uid                          # in real life: same txn, or async + repair
    shards[uid % N][uid] = {"id": uid, "email": email}


def find_by_email_indexed(email):
    calls = 1
    uid = email_index[h(email) % N].get(email)
    if uid is None:
        return None, calls
    calls += 1
    return shards[uid % N][uid], calls


def find_by_email_scatter(email):
    calls, found = 0, None
    for s in shards:
        calls += 1
        for row in s.values():
            if row["email"] == email:
                found = row
    return found, calls


for uid in range(10000):
    create_user(uid, f"user{uid}@mail.com")

tests = [f"user{u}@mail.com" for u in (7, 4242, 9999)]
for e in tests:
    a, ca = find_by_email_scatter(e)
    b, cb = find_by_email_indexed(e)
    assert a == b
    print(f"{e:20s} scatter={ca} calls  indexed={cb} calls")
` },
      complexity: `<p>Reads: scatter-gather O(N) calls, index O(1) calls. Writes: data-only O(1) vs data + index (2 shards).</p>`,
      followUps: ['What if the index write succeeds and the data write fails?', 'How would you backfill a new global index on a live table?']
    }
  });

  practice.push({
    title: 'IoT Time-Series Partition Design with Buckets',
    level: 'Medium', tags: ['wide-column', 'time-series', 'partition sizing'], companies: ['Tesla', 'Siemens', 'Samsung'],
    statement: `<p>Devices send one reading per second (≈ 40 bytes). Queries: "last hour for device X" and "one day for device X". Data is kept 2 years. Design the partition key, compute the partition size with and without a day bucket, and write the "last hour" query. Use the SQLite emulation (a <code>WITHOUT ROWID</code> table clustered by the primary key) to prove the access path.</p>`,
    constraints: `Keep partitions well under ~100 MB. Queries must hit a single partition.`,
    example: `<p>Unbucketed partition per device: 86 400 × 40 B × 730 days ≈ ${H.c('r', '2.5 GB')} — far too big. Bucket by day: ${H.c('g', '≈ 3.5 MB')} per partition, and "one day" is exactly one partition.</p>`,
    brute: { why: `<p>Partition by <code>device_id</code> alone. Every reading of a device for two years lands in one partition: gigabytes on one replica set, slow compaction and repair, and a heavy device becomes a hotspot. Reads of "last hour" still work but the partition grows forever.</p>`, code: { lang: 'sql', code: `-- projected partition size if the partition key is just device_id
SELECT 86400 * 40                         AS bytes_per_day,
       ROUND(86400 * 40 * 730 / 1e9, 2)   AS gb_per_partition_after_2_years;` } },
    mcq: { q: 'A device sometimes bursts to 100 readings/s. With day buckets, what is the safest adjustment?', options: ['Remove the bucket', 'Use smaller buckets (hour) for that device class, stored as metadata so readers know the bucket size', 'Increase the replication factor', 'Add a secondary index on ts'], answer: 1, explain: '100/s × 40 B × 86 400 ≈ 345 MB/day → hourly buckets give ~14 MB partitions. Readers compute bucket keys from the time range, so the bucket size must be known.' },
    hints: [
      `<p>Hint 1: Partition = (device_id, day); clustering = ts. "Last hour" names device + today's day, then a range on ts.</p>`,
      `<p>Hint 2: Size per partition = readings/day × bytes/reading. Compare 1 day vs 730 days.</p>`,
      `<p>Hint 3: A query spanning midnight touches 2 buckets — the client issues two single-partition queries and merges.</p>`
    ],
    tests: { engine: 'sqlite', check: '(rows, cols, c) => {\n  if (c.plan || c.noplan) { const d = rows.map(r => r[r.length - 1]).join(\'\\n\'); return (!c.plan || new RegExp(c.plan).test(d)) && (!c.noplan || !new RegExp(c.noplan).test(d)); }\n  let a = rows, b = c.rows || [];\n  if (c.set) { const k = r => JSON.stringify(r); a = a.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); b = b.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); }\n  return a.length === b.length && a.every((r, i) => r.length === b[i].length && r.every((v, j) => v === b[i][j] || (typeof v === \'number\' && typeof b[i][j] === \'number\' && Math.abs(v - b[i][j]) < 1e-6)));\n}', cases: [
      { result: 0, rows: [
          [258000, 23],
          [256200, 20],
          [254400, 24]
        ] },
      { rows: [
          ['dev-0', '2026-10-12', 48, 3.46],
          ['dev-0', '2026-10-13', 48, 3.46],
          ['dev-0', '2026-10-14', 48, 3.46],
          ['dev-1', '2026-10-12', 48, 3.46],
          ['dev-1', '2026-10-13', 48, 3.46],
          ['dev-1', '2026-10-14', 48, 3.46],
          ['dev-2', '2026-10-12', 48, 3.46],
          ['dev-2', '2026-10-13', 48, 3.46],
          ['dev-2', '2026-10-14', 48, 3.46]
        ] },
      { after: 'SELECT ts, temp_c FROM readings WHERE device_id = \'dev-0\' AND day = \'2026-10-12\' AND ts >= (SELECT MAX(ts) FROM readings WHERE device_id = \'dev-0\' AND day = \'2026-10-12\') - 3600 ORDER BY ts DESC', rows: [
          [84600, 21],
          [82800, 25],
          [81000, 22]
        ] },
      { after: 'SELECT ts, temp_c FROM readings WHERE device_id = \'dev-2\' AND day = \'2026-10-13\' AND ts >= (SELECT MAX(ts) FROM readings WHERE device_id = \'dev-2\' AND day = \'2026-10-13\') - 3600 ORDER BY ts DESC', rows: [
          [172200, 20],
          [170400, 24],
          [168600, 21]
        ] },
      { after: 'SELECT ts, temp_c FROM readings WHERE device_id = \'dev-9\' AND day = \'2026-10-13\' AND ts >= (SELECT MAX(ts) FROM readings WHERE device_id = \'dev-9\' AND day = \'2026-10-13\') - 3600 ORDER BY ts DESC', rows: [] },
      { after: 'INSERT INTO readings VALUES (\'dev-1\', \'2026-10-14\', 259000, 30.5); SELECT ts, temp_c FROM readings WHERE device_id = \'dev-1\' AND day = \'2026-10-14\' AND ts >= (SELECT MAX(ts) FROM readings WHERE device_id = \'dev-1\' AND day = \'2026-10-14\') - 3600 ORDER BY ts DESC', rows: [
          [259000, 30.5],
          [258000, 23],
          [256200, 20]
        ] },
      { after: 'INSERT INTO readings VALUES (\'dev-1\', \'2026-10-14\', 258000, 1.0)', error: 'UNIQUE|PRIMARY' },
      { rows: [], plan: 'SEARCH readings USING PRIMARY KEY \\(device_id=\\? AND day=\\? AND ts>\\?\\)', after: 'EXPLAIN QUERY PLAN SELECT ts, temp_c FROM readings WHERE device_id = \'dev-1\' AND day = \'2026-10-14\' AND ts >= 258000 - 3600 ORDER BY ts DESC' },
      { after: 'SELECT count(*) FROM readings', rows: [
          [432]
        ] }
    ] },
    solution: {
      approach: `<p>Partition key <code>(device_id, day)</code>, clustering key <code>ts DESC</code>, TTL 2 years (Cassandra: <code>default_time_to_live</code>; use TimeWindowCompactionStrategy so whole expired SSTables drop cheaply). Each partition ≈ 3.5 MB/day. Queries name the bucket(s) explicitly. The SQLite emulation shows rows clustered by (device, day, ts) so the last-hour query is a single range scan.</p>`,
      code: { lang: 'sql', code: `CREATE TABLE readings (
  device_id TEXT    NOT NULL,
  day       TEXT    NOT NULL,      -- bucket
  ts        INTEGER NOT NULL,      -- seconds since 2026-10-12 00:00 UTC
  temp_c    REAL    NOT NULL,
  PRIMARY KEY (device_id, day, ts)
) WITHOUT ROWID;                   -- physically clustered like a wide-column partition

-- 3 devices, one reading every 10 minutes for 3 days (demo-sized data)
INSERT INTO readings (device_id, day, ts, temp_c)
WITH RECURSIVE n(i) AS (SELECT 0 UNION ALL SELECT i + 1 FROM n WHERE i < 431)
SELECT 'dev-' || (i % 3), date('2026-10-12', '+' || (i / 144) || ' days'), i * 600, 20 + (i % 7)
FROM n;

-- "last hour for dev-1": one partition (dev-1, latest day), range on ts
SELECT ts, temp_c
FROM readings
WHERE device_id = 'dev-1' AND day = '2026-10-14'
  AND ts >= (SELECT MAX(ts) FROM readings WHERE device_id = 'dev-1' AND day = '2026-10-14') - 3600
ORDER BY ts DESC;

-- partition size report at production rates (1 reading/s, 40 B)
SELECT device_id, day, COUNT(*) AS demo_rows,
       ROUND(86400 * 40 / 1e6, 2) AS prod_mb_per_partition
FROM readings
GROUP BY device_id, day
ORDER BY device_id, day;` },
      alt: [{ lang: 'text', check: false, title: 'Cassandra version', code: `CREATE TABLE iot.readings (
  device_id text, day date, ts timestamp, temp_c float,
  PRIMARY KEY ((device_id, day), ts)
) WITH CLUSTERING ORDER BY (ts DESC)
  AND default_time_to_live = 63072000
  AND compaction = {'class': 'TimeWindowCompactionStrategy',
                    'compaction_window_unit': 'DAYS', 'compaction_window_size': 1};

SELECT ts, temp_c FROM iot.readings
WHERE device_id = 'dev-1' AND day = '2026-10-14' AND ts >= '2026-10-14 08:00:00+0000';` }],
      complexity: `<p>Last hour: one partition, O(log n + 3 600) rows. Storage ≈ 3.5 MB per device-day; 1 M devices ≈ 3.5 TB/day before replication.</p>`,
      followUps: ['How would you serve "average temperature per site per hour" for dashboards?', 'Why is TimeWindowCompactionStrategy a good fit with TTL?']
    }
  });

  /* =====================================================================
     PRACTICE — Hard
     ===================================================================== */
  practice.push({
    title: 'Detect Concurrent Siblings with Version Vectors',
    level: 'Hard', lang: 'python', tags: ['version vectors', 'multi-leader', 'conflicts'], companies: ['Apple', 'Riak/Basho', 'Figma'],
    statement: `<p>A leaderless store returns several versions of a shopping cart from different replicas, each tagged with a version vector. Write <code>resolve(versions)</code> that discards every version that <b>happened before</b> another one and returns the remaining <b>concurrent siblings</b> plus the merged vector a client must send with its next write. For carts, also produce the merged cart (union of items — "add wins").</p>`,
    constraints: `Up to 10 versions, up to 5 replicas in a vector. Vectors are dicts replica → counter (missing = 0).`,
    example: `<p>Versions: A {r1:2} = [milk], B {r1:2, r2:1} = [milk, eggs], C {r1:3} = [milk, bread]. A ≤ B, so ${H.c('m', 'A is obsolete')}. B and C are ${H.c('y', 'concurrent')}. Merge → ${H.c('g', '[bread, eggs, milk], vector {r1:3, r2:1}')}.</p>`,
    brute: { why: `<p>Last-write-wins by wall-clock timestamp: keep the version with the latest timestamp. C wins and the <b>eggs</b> Ben added on r2 silently disappear (Amazon's original Dynamo paper used exactly this cart example to motivate version vectors). Clock skew can even make an older version win.</p>`, code: { lang: 'python', run: true, code: `versions = [
    {"ts": 100, "items": {"milk"}},
    {"ts": 105, "items": {"milk", "eggs"}},
    {"ts": 107, "items": {"milk", "bread"}},
]
winner = max(versions, key=lambda v: v["ts"])   # LWW
print("LWW keeps:", sorted(winner["items"]), "-> eggs lost")` } },
    mcq: { q: 'Version vectors {r1:3, r2:0} and {r1:2, r2:1} are…', options: ['Equal', 'The first happened before the second', 'The second happened before the first', 'Concurrent'], answer: 3, explain: 'The first is bigger in r1, the second in r2. Neither dominates, so the writes were concurrent and both must be kept or merged.' },
    hints: [
      `<p>Hint 1: <code>dominated(a, b)</code> = every counter of a ≤ the counter in b, and a ≠ b. A version survives if no other version dominates it.</p>`,
      `<p>Hint 2: Deduplicate equal vectors first (same version seen from two replicas).</p>`,
      `<p>Hint 3: Merged vector = pointwise max over survivors; merged cart = union of survivors' items (deletes need tombstones or an OR-Set to work correctly).</p>`
    ],
    tests: { sig: 'string[] -> string[]', fn: 'run_vv', harness: { python: 'def run_vv(rows):\n    versions = []\n    for r in rows:\n        name, vv, items = r.split("|")\n        clock = {k: int(c) for k, c in (p.split("=") for p in vv.split(",") if p)}\n        versions.append({"name": name, "vv": clock, "items": set(i for i in items.split(",") if i)})\n    sib, merged, items = resolve(versions)\n    return [",".join(s["name"] for s in sib), ",".join(f"{k}={merged[k]}" for k in sorted(merged)), ",".join(sorted(items))]' }, cases: [
      [
        [
          ['A|r1=2|milk', 'B|r1=2,r2=1|milk,eggs', 'C|r1=3|milk,bread', 'C-copy|r1=3|milk,bread']
        ],
        ['B,C', 'r1=3,r2=1', 'bread,eggs,milk']
      ],
      [
        [
          ['A|r1=1|x']
        ],
        ['A', 'r1=1', 'x']
      ],
      [
        [
          []
        ],
        ['', '', '']
      ],
      [
        [
          ['A|r1=1|a', 'B|r1=1|b', 'C|r1=1|c']
        ],
        ['A', 'r1=1', 'a']
      ],
      [
        [
          ['A|r1=1|a', 'B|r1=2|b', 'C|r1=3|c']
        ],
        ['C', 'r1=3', 'c']
      ],
      [
        [
          ['A|r1=1|a', 'B|r2=1|b']
        ],
        ['A,B', 'r1=1,r2=1', 'a,b']
      ],
      [
        [
          ['A||a', 'B|r1=1|b']
        ],
        ['B', 'r1=1', 'b']
      ],
      [
        [
          ['A||a', 'B||b']
        ],
        ['A', '', 'a']
      ],
      [
        [
          ['A|r1=2,r2=1|a', 'B|r1=1,r2=2|b', 'C|r1=2,r2=2|c', 'D|r1=1|d']
        ],
        ['C', 'r1=2,r2=2', 'c']
      ],
      [
        [
          ['A|r1=1,r2=0|a', 'B|r1=1|b']
        ],
        ['', '', '']
      ],
      [
        [
          ['A|r1=3,r2=1,r3=1|a,z', 'B|r1=1,r2=3,r3=1|b', 'C|r1=1,r2=1,r3=3|c', 'D|r1=2,r2=2,r3=2|d']
        ],
        ['A,B,C,D', 'r1=3,r2=3,r3=3', 'a,b,c,d,z']
      ]
    ] },
    solution: {
      approach: `<p>Compute the "frontier" of the causal partial order: drop every version dominated by another. What remains are concurrent siblings. The client merges them (domain-specific: union for carts) and writes back with the pointwise-max vector, which dominates all siblings and therefore replaces them. Removals in a union merge can resurrect items, which is why production carts use OR-Set CRDTs (each add has a unique tag; removes delete observed tags).</p>`,
      code: { lang: 'python', run: true, code: `def leq(a, b):
    keys = set(a) | set(b)
    return all(a.get(k, 0) <= b.get(k, 0) for k in keys)


def resolve(versions):
    # 1. remove exact duplicates (same vector)
    uniq = []
    for v in versions:
        if not any(v["vv"] == u["vv"] for u in uniq):
            uniq.append(v)
    # 2. keep versions not dominated by any other
    survivors = [v for v in uniq
                 if not any(v is not w and leq(v["vv"], w["vv"]) and v["vv"] != w["vv"] for w in uniq)]
    # 3. merged vector and merged value
    merged_vv = {}
    for v in survivors:
        for k, c in v["vv"].items():
            merged_vv[k] = max(merged_vv.get(k, 0), c)
    merged_items = set().union(*(v["items"] for v in survivors))
    return survivors, merged_vv, merged_items


versions = [
    {"name": "A", "vv": {"r1": 2}, "items": {"milk"}},
    {"name": "B", "vv": {"r1": 2, "r2": 1}, "items": {"milk", "eggs"}},
    {"name": "C", "vv": {"r1": 3}, "items": {"milk", "bread"}},
    {"name": "C-copy", "vv": {"r1": 3}, "items": {"milk", "bread"}},
]
sib, vv, items = resolve(versions)
print("siblings:", [s["name"] for s in sib])
print("merged vector:", dict(sorted(vv.items())))
print("merged cart:", sorted(items))
` },
      complexity: `<p>O(V² × R) for V versions and R replicas in a vector — tiny in practice (a handful of siblings).</p>`,
      followUps: ['Why do vectors need pruning (and what can go wrong when you prune)?', 'Design the OR-Set so that "remove eggs" is not undone by a concurrent sibling.']
    }
  });

  practice.push({
    title: 'Salted Like Counter for a Viral Post',
    level: 'Hard', tags: ['hot key', 'write sharding', 'upsert'], companies: ['Instagram', 'TikTok', 'YouTube'],
    statement: `<p>A viral post receives 1 000 likes in a burst. Storing the count in one row means 1 000 writes contend on one row (and one partition). Implement <b>write sharding</b>: spread increments over 16 sub-rows <code>(post_id, slot)</code> chosen by hashing the like event id, and read the total by summing. Report total likes, the writes taken by the hottest row, and rows used — for both designs.</p>`,
    constraints: `Use UPSERT (INSERT ... ON CONFLICT DO UPDATE). Slot = high bits of (event_id × 2654435761) mod 16. Totals must match exactly.`,
    example: `<p>Single row: total ${H.c('g', '1000')}, hottest row takes ${H.c('r', '1000')} writes. 16 slots: total ${H.c('g', '1000')}, hottest row takes ${H.c('g', '66')} writes across ${H.c('b', '16')} rows — about 15× less contention per row.</p>`,
    brute: { why: `<p>One counter row per post. Every like is a read-modify-write (or atomic increment) on the same row: row locks / Raft log entries serialize them, and in a partitioned store the post's partition becomes a hotspot that adding nodes cannot fix.</p>`, code: { lang: 'sql', code: `CREATE TABLE like_events (event_id INTEGER PRIMARY KEY, post_id INTEGER NOT NULL);
INSERT INTO like_events (event_id, post_id)
WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM n WHERE i < 1000)
SELECT i, 42 FROM n;

CREATE TABLE post_likes (post_id INTEGER PRIMARY KEY, cnt INTEGER NOT NULL);
INSERT INTO post_likes (post_id, cnt)
SELECT post_id, 1 FROM like_events WHERE true          -- WHERE true: needed before ON CONFLICT
ON CONFLICT (post_id) DO UPDATE SET cnt = cnt + 1;     -- 1000 updates to ONE row

SELECT post_id, cnt AS total_likes, cnt AS writes_to_hottest_row, 1 AS rows_used FROM post_likes;` } },
    mcq: { q: 'What is the main cost of reading a write-sharded counter with 16 slots?', options: ['It cannot be read', 'A read must fetch and sum 16 rows (fan-in), and the sum may be briefly inconsistent across slots', 'It doubles storage for every post', 'It requires a distributed lock'], answer: 1, explain: 'Writes get cheaper, reads gather K rows. For display counters a slightly stale sum is fine; cache the total for a few seconds.' },
    hints: [
      `<p>Hint 1: Table <code>post_likes_sharded(post_id, slot, cnt, PRIMARY KEY (post_id, slot))</code>.</p>`,
      `<p>Hint 2: Insert one row per event with slot = hash(event_id) % 16 and <code>ON CONFLICT (post_id, slot) DO UPDATE SET cnt = cnt + 1</code>.</p>`,
      `<p>Hint 3: Read: <code>SUM(cnt)</code> for the total, <code>MAX(cnt)</code> for the hottest row, <code>COUNT(*)</code> for rows used. Only apply sharding to posts above a heat threshold.</p>`
    ],
    tests: { engine: 'sqlite', check: '(rows, cols, c) => {\n  if (c.plan || c.noplan) { const d = rows.map(r => r[r.length - 1]).join(\'\\n\'); return (!c.plan || new RegExp(c.plan).test(d)) && (!c.noplan || !new RegExp(c.noplan).test(d)); }\n  let a = rows, b = c.rows || [];\n  if (c.set) { const k = r => JSON.stringify(r); a = a.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); b = b.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); }\n  return a.length === b.length && a.every((r, i) => r.length === b[i].length && r.every((v, j) => v === b[i][j] || (typeof v === \'number\' && typeof b[i][j] === \'number\' && Math.abs(v - b[i][j]) < 1e-6)));\n}', cases: [
      { rows: [
          [42, 1000, 66, 16]
        ] },
      { after: 'SELECT count(*) FROM post_likes_sharded', rows: [
          [16]
        ] },
      { after: 'SELECT slot, cnt FROM post_likes_sharded ORDER BY slot', rows: [
          [0, 58],
          [1, 64],
          [2, 63],
          [3, 60],
          [4, 66],
          [5, 61],
          [6, 63],
          [7, 66],
          [8, 57],
          [9, 65],
          [10, 62],
          [11, 61],
          [12, 66],
          [13, 61],
          [14, 62],
          [15, 65]
        ] },
      { after: 'SELECT count(*), sum(cnt) FROM post_likes_sharded WHERE slot BETWEEN 0 AND 15', rows: [
          [16, 1000]
        ] },
      { after: 'INSERT INTO like_events VALUES (1001, 43), (1002, 43); INSERT INTO post_likes_sharded (post_id, slot, cnt) SELECT post_id, (((event_id * 2654435761) % 4294967296) >> 16) % 16, 1 FROM like_events WHERE post_id = 43 ON CONFLICT (post_id, slot) DO UPDATE SET cnt = cnt + 1; SELECT post_id, SUM(cnt) FROM post_likes_sharded GROUP BY post_id ORDER BY post_id', rows: [
          [42, 1000],
          [43, 2]
        ] },
      { after: 'SELECT count(*) FROM like_events WHERE post_id = 42', rows: [
          [1000]
        ] },
      { after: 'INSERT INTO post_likes_sharded VALUES (42, 0, 1)', error: 'UNIQUE|PRIMARY' },
      { after: 'SELECT slot FROM post_likes_sharded WHERE cnt = (SELECT MAX(cnt) FROM post_likes_sharded) ORDER BY slot LIMIT 1', rows: [
          [4]
        ] }
    ] },
    solution: {
      approach: `<p>Split one hot key into K sub-keys; writes pick a slot at random (or by hash of the event), reads sum all K. In DynamoDB/Cassandra the sub-keys land on different partitions, so throughput scales ~K×. Make K adaptive (start at 1, raise for hot posts) and cache the summed value. Alternatives: buffer increments in memory/Kafka and flush aggregated deltas every second, or use a CRDT G-Counter per region.</p>`,
      code: { lang: 'sql', code: `CREATE TABLE like_events (event_id INTEGER PRIMARY KEY, post_id INTEGER NOT NULL);
INSERT INTO like_events (event_id, post_id)
WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM n WHERE i < 1000)
SELECT i, 42 FROM n;

CREATE TABLE post_likes_sharded (
  post_id INTEGER NOT NULL,
  slot    INTEGER NOT NULL,          -- 0..15: the "salt"
  cnt     INTEGER NOT NULL,
  PRIMARY KEY (post_id, slot)
);

-- each like increments one of 16 sub-rows
INSERT INTO post_likes_sharded (post_id, slot, cnt)
SELECT post_id, (((event_id * 2654435761) % 4294967296) >> 16) % 16, 1
FROM like_events WHERE true
ON CONFLICT (post_id, slot) DO UPDATE SET cnt = cnt + 1;

-- read path: gather and sum
SELECT post_id,
       SUM(cnt)  AS total_likes,
       MAX(cnt)  AS writes_to_hottest_row,
       COUNT(*)  AS rows_used
FROM post_likes_sharded
GROUP BY post_id;` },
      complexity: `<p>Write: O(1) to one of K rows (contention ÷ K). Read: O(K). Storage: K rows per hot post.</p>`,
      followUps: ['How do you shrink K again when the post cools down?', 'How would you show an exact count to the post owner but an approximate one to everyone else?']
    }
  });

  practice.push({
    title: 'Two-Phase Commit Coordinator (and Why It Blocks)',
    level: 'Hard', lang: 'python', tags: ['2PC', 'distributed transactions', 'fault tolerance'], companies: ['Google', 'Stripe', 'Goldman Sachs'],
    statement: `<p>Simulate a cross-shard transfer with <b>two-phase commit</b>: a coordinator asks shards to PREPARE (lock + vote yes/no), then sends COMMIT if all voted yes, else ABORT. Show three runs: (1) all yes, (2) one shard votes no, (3) the coordinator crashes after collecting yes votes but before sending the decision. In (3) show that participants are <b>blocked</b> holding locks, and how a durable decision log (replicated, as in Spanner/CockroachDB) lets a recovering coordinator finish the job.</p>`,
    constraints: `Two participants (shard A holds the debit, shard B the credit). Money must never be created or destroyed in any run.`,
    example: `<p>Run 1: both prepare → ${H.c('g', 'COMMIT')}, totals unchanged. Run 2: B votes no (account frozen) → ${H.c('y', 'ABORT')}, A releases its lock. Run 3: crash after votes → A and B ${H.c('r', 'stuck in PREPARED holding locks')} until recovery reads the log.</p>`,
    brute: { why: `<p>Commit each shard independently ("debit A, then credit B"). If B fails after A committed, money disappears; compensating later is possible (a saga) but needs explicit design. Without any protocol the system is simply inconsistent.</p>`, code: { lang: 'python', run: true, code: `balances = {"A": 500, "B": 100}

def credit_b(amount):
    raise RuntimeError("shard B is down")

balances["A"] -= 200            # committed on shard A
try:
    credit_b(200)
except RuntimeError as e:
    print("credit failed:", e)
print("total money:", sum(balances.values()), "(was 600)")` } },
    mcq: { q: 'Why is classic 2PC called a "blocking" protocol?', options: ['It uses locks', 'A participant that voted yes cannot decide alone; if the coordinator is lost it must wait, holding locks', 'It needs 3 phases', 'It blocks reads on all shards'], answer: 1, explain: 'After voting yes the participant promised to commit if told so, so it may not abort unilaterally; only the coordinator (or its durable, replicated decision record) can resolve it.' },
    hints: [
      `<p>Hint 1: Model a participant with states INIT → PREPARED → COMMITTED/ABORTED and a <code>locked</code> flag set at prepare time.</p>`,
      `<p>Hint 2: The coordinator writes the decision to a durable log <b>before</b> sending it. That record is the commit point.</p>`,
      `<p>Hint 3: Recovery: a new coordinator reads the log; if a decision exists, resend it; if none exists, it is safe to abort (no one was told to commit).</p>`
    ],
    tests: { sig: 'int int int int int -> string[]', fn: 'run2pc', harness: { python: 'def run2pc(b_yes, crash, amount, a_bal, b_bal):\n    d, a, b = run("t", b_votes_yes=bool(b_yes), crash_after_votes=bool(crash), amount=amount, a_balance=a_bal, b_balance=b_bal)\n    return [d, a.balance, b.balance, a.state, b.state, int(a.locked), int(b.locked)]' }, cases: [
      [
        [1, 0, 200, 500, 100],
        ['COMMIT', '300', '300', 'COMMITTED', 'COMMITTED', '0', '0']
      ],
      [
        [0, 0, 200, 500, 100],
        ['ABORT', '500', '100', 'ABORTED', 'ABORTED', '0', '0']
      ],
      [
        [1, 1, 200, 500, 100],
        ['COMMIT', '300', '300', 'COMMITTED', 'COMMITTED', '0', '0']
      ],
      [
        [0, 1, 200, 500, 100],
        ['ABORT', '500', '100', 'ABORTED', 'ABORTED', '0', '0']
      ],
      [
        [1, 0, 500, 500, 100],
        ['COMMIT', '0', '600', 'COMMITTED', 'COMMITTED', '0', '0']
      ],
      [
        [1, 0, 501, 500, 100],
        ['ABORT', '500', '100', 'ABORTED', 'ABORTED', '0', '0']
      ],
      [
        [1, 1, 501, 500, 100],
        ['ABORT', '500', '100', 'ABORTED', 'ABORTED', '0', '0']
      ],
      [
        [1, 0, 0, 500, 100],
        ['COMMIT', '500', '100', 'COMMITTED', 'COMMITTED', '0', '0']
      ],
      [
        [0, 0, 0, 0, 0],
        ['ABORT', '0', '0', 'ABORTED', 'ABORTED', '0', '0']
      ],
      [
        [1, 1, 1, 0, 0],
        ['ABORT', '0', '0', 'ABORTED', 'ABORTED', '0', '0']
      ]
    ] },
    solution: {
      approach: `<p>Phase 1 collects votes (each yes = durable promise + locks held). The decision is logged durably, then broadcast. A crash before logging → recovery aborts; after logging → recovery re-sends the logged decision. Participants in PREPARED cannot act alone, which is the blocking problem; Spanner/CockroachDB make the coordinator state a consensus-replicated record so "crash" means "another replica takes over in seconds". Alternatives: 3PC (rarely used, assumes bounded delays) or sagas with compensations.</p>`,
      code: { lang: 'python', run: true, code: `class Participant:
    def __init__(self, name, balance, will_vote_yes=True):
        self.name, self.balance = name, balance
        self.state, self.locked, self.pending = "INIT", False, 0
        self.will_vote_yes = will_vote_yes

    def prepare(self, delta):
        if not self.will_vote_yes or self.balance + delta < 0:
            self.state = "ABORTED"
            return False
        self.state, self.locked, self.pending = "PREPARED", True, delta   # durable promise
        return True

    def finish(self, decision):
        if decision == "COMMIT" and self.state == "PREPARED":
            self.balance += self.pending
        self.state = "COMMITTED" if decision == "COMMIT" else "ABORTED"
        self.locked, self.pending = False, 0


def run(label, b_votes_yes=True, crash_after_votes=False, amount=200, a_balance=500, b_balance=100):
    a, b = Participant("A", a_balance), Participant("B", b_balance, b_votes_yes)
    decision_log = []                                   # replicated in Spanner/CockroachDB
    votes = [a.prepare(-amount), b.prepare(+amount)]
    decision = "COMMIT" if all(votes) else "ABORT"
    decision_log.append(decision)                       # the commit point
    if crash_after_votes:
        print(f"{label}: coordinator crashed -> A={a.state}/locked={a.locked}, B={b.state}/locked={b.locked}")
        recovered = decision_log[-1] if decision_log else "ABORT"   # new coordinator reads the log
        for p in (a, b):
            p.finish(recovered)
        print(f"{label}: recovery re-sent {recovered}")
    else:
        for p in (a, b):
            p.finish(decision)
    print(f"{label}: decision={decision_log[-1]} A={a.balance} B={b.balance} total={a.balance + b.balance}")
    return decision_log[-1], a, b


run("run1 all yes")
run("run2 B votes no", b_votes_yes=False)
run("run3 crash", crash_after_votes=True)
` },
      complexity: `<p>2 round trips (prepare, commit) + 1 durable log write on the critical path; locks held for the whole duration — which is why distributed transactions should be short and rare.</p>`,
      followUps: ['Rewrite the transfer as a saga with a compensating action. What anomaly does a saga allow that 2PC does not?', 'Where do CockroachDB\'s parallel commits save a round trip?']
    }
  });

  practice.push({
    title: 'Online Resharding: Backfill, Catch Up, Verify',
    level: 'Hard', tags: ['resharding', 'CDC', 'migration'], companies: ['Notion', 'Figma', 'Slack', 'PlanetScale'],
    statement: `<p>Users live on 2 shards (<code>user_id % 2</code>); you must move to 4 shards (<code>user_id % 4</code>) <b>without downtime</b>. While the snapshot copy runs, live traffic changes data: user 3's balance becomes 999, user 21 signs up, user 8 is deleted — all captured in a <code>changelog</code> (CDC). Write the SQL for: snapshot backfill, change-log replay, and a <b>verification</b> that compares row counts and a checksum between old and new before cut-over.</p>`,
    constraints: `Replay must be idempotent (safe to run twice) and applied in sequence order. Verification must detect any missed change.`,
    example: `<p>After snapshot only: old has 20 rows (u21 added, u8 removed), new has 20 rows but the ${H.c('r', 'checksums differ')} (stale u3, missing u21, extra u8). After replay: counts ${H.c('g', '20 = 20')} and checksums ${H.c('g', 'equal')} → safe to switch routing.</p>`,
    brute: { why: `<p>"Stop the world": block writes, copy, switch. Correct but means downtime proportional to data size (hours for TBs). The run below copies a snapshot while writes continue and never replays them — the verification query shows the new shards are wrong.</p>`, code: { lang: 'sql', code: `CREATE TABLE old_s0 (user_id INTEGER PRIMARY KEY, name TEXT NOT NULL, balance INTEGER NOT NULL);
CREATE TABLE old_s1 (user_id INTEGER PRIMARY KEY, name TEXT NOT NULL, balance INTEGER NOT NULL);
INSERT INTO old_s0 WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM n WHERE i < 20)
  SELECT i, 'u' || i, i * 10 FROM n WHERE i % 2 = 0;
INSERT INTO old_s1 WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM n WHERE i < 20)
  SELECT i, 'u' || i, i * 10 FROM n WHERE i % 2 = 1;
CREATE TABLE new_users (shard INTEGER NOT NULL, user_id INTEGER PRIMARY KEY, name TEXT NOT NULL, balance INTEGER NOT NULL);
INSERT INTO new_users SELECT user_id % 4, user_id, name, balance FROM (SELECT * FROM old_s0 UNION ALL SELECT * FROM old_s1);
-- live writes keep landing on the old shards during/after the copy:
UPDATE old_s1 SET balance = 999 WHERE user_id = 3;
INSERT INTO old_s1 VALUES (21, 'u21', 50);
DELETE FROM old_s0 WHERE user_id = 8;
WITH old AS (SELECT * FROM old_s0 UNION ALL SELECT * FROM old_s1)
SELECT (SELECT SUM(user_id * 1000003 + balance) FROM old)       AS old_checksum,
       (SELECT SUM(user_id * 1000003 + balance) FROM new_users) AS new_checksum;   -- differ!` } },
    mcq: { q: 'Why must the change-log capture start BEFORE the snapshot copy begins?', options: ['To save disk space', 'So that every change made during the copy is either in the snapshot or in the log (no gap)', 'Because snapshots are slower', 'It does not matter'], answer: 1, explain: 'If capture starts after the snapshot, writes in between are in neither. Starting earlier may duplicate some changes, which idempotent replay (UPSERT, delete-if-exists) tolerates.' },
    hints: [
      `<p>Hint 1: Backfill = <code>INSERT INTO new_users SELECT user_id % 4, ... FROM (old_s0 UNION ALL old_s1)</code>.</p>`,
      `<p>Hint 2: Replay upserts with <code>INSERT ... SELECT ... FROM changelog WHERE op = 'upsert' ORDER BY seq ON CONFLICT (user_id) DO UPDATE</code>, then <code>DELETE ... WHERE user_id IN (deletes)</code>. Both are idempotent.</p>`,
      `<p>Hint 3: Verify with count + an order-independent checksum such as <code>SUM(user_id * 1000003 + balance)</code> (production tools hash per chunk, e.g. Vitess VDiff).</p>`
    ],
    tests: { engine: 'sqlite', check: '(rows, cols, c) => {\n  if (c.plan || c.noplan) { const d = rows.map(r => r[r.length - 1]).join(\'\\n\'); return (!c.plan || new RegExp(c.plan).test(d)) && (!c.noplan || !new RegExp(c.noplan).test(d)); }\n  let a = rows, b = c.rows || [];\n  if (c.set) { const k = r => JSON.stringify(r); a = a.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); b = b.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); }\n  return a.length === b.length && a.every((r, i) => r.length === b[i].length && r.every((v, j) => v === b[i][j] || (typeof v === \'number\' && typeof b[i][j] === \'number\' && Math.abs(v - b[i][j]) < 1e-6)));\n}', cases: [
      { rows: [
          [0, 4],
          [1, 6],
          [2, 5],
          [3, 5]
        ] },
      { result: -2, rows: [
          [20, 20, 223003708, 223003708]
        ] },
      { after: 'INSERT INTO new_users (shard, user_id, name, balance) SELECT user_id % 4, user_id, name, balance FROM changelog WHERE op = \'upsert\' ORDER BY seq ON CONFLICT (user_id) DO UPDATE SET name = excluded.name, balance = excluded.balance; DELETE FROM new_users WHERE user_id IN (SELECT user_id FROM changelog WHERE op = \'delete\'); SELECT count(*), sum(user_id * 1000003 + balance) FROM new_users', rows: [
          [20, 223003708]
        ] },
      { after: 'SELECT shard, balance FROM new_users WHERE user_id = 3', rows: [
          [3, 999]
        ] },
      { after: 'SELECT count(*) FROM new_users WHERE user_id = 8', rows: [
          [0]
        ] },
      { after: 'SELECT shard, name, balance FROM new_users WHERE user_id = 21', rows: [
          [1, 'u21', 50]
        ] },
      { after: 'SELECT count(*) FROM changelog', rows: [
          [3]
        ] },
      { after: 'SELECT (SELECT count(*) FROM old_s0) + (SELECT count(*) FROM old_s1)', rows: [
          [20]
        ] },
      { after: 'DELETE FROM new_users WHERE user_id = 5; SELECT (SELECT count(*) FROM new_users) = (SELECT count(*) FROM old_s0) + (SELECT count(*) FROM old_s1)', rows: [
          [0]
        ] }
    ] },
    solution: {
      approach: `<p>The standard live-migration recipe (Vitess MoveTables/Reshard, gh-ost, Notion's and Figma's Postgres resharding): (1) start CDC capture; (2) snapshot-copy into the new layout; (3) replay the change stream until lag is ~0; (4) verify counts and checksums chunk by chunk; (5) briefly pause writes (seconds), drain remaining changes, switch routing; (6) keep reverse replication to the old shards for fast rollback. The SQL below performs steps 2-4.</p>`,
      code: { lang: 'sql', code: `-- old layout: 2 shards
CREATE TABLE old_s0 (user_id INTEGER PRIMARY KEY, name TEXT NOT NULL, balance INTEGER NOT NULL);
CREATE TABLE old_s1 (user_id INTEGER PRIMARY KEY, name TEXT NOT NULL, balance INTEGER NOT NULL);
INSERT INTO old_s0 WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM n WHERE i < 20)
  SELECT i, 'u' || i, i * 10 FROM n WHERE i % 2 = 0;
INSERT INTO old_s1 WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM n WHERE i < 20)
  SELECT i, 'u' || i, i * 10 FROM n WHERE i % 2 = 1;

-- new layout (one table here; the shard column says which of 4 shards a row belongs to)
CREATE TABLE new_users (shard INTEGER NOT NULL, user_id INTEGER PRIMARY KEY, name TEXT NOT NULL, balance INTEGER NOT NULL);
-- CDC stream, capture started BEFORE the snapshot
CREATE TABLE changelog (seq INTEGER PRIMARY KEY, user_id INTEGER NOT NULL, op TEXT NOT NULL, name TEXT, balance INTEGER);

-- step 2: snapshot backfill
INSERT INTO new_users (shard, user_id, name, balance)
SELECT user_id % 4, user_id, name, balance
FROM (SELECT * FROM old_s0 UNION ALL SELECT * FROM old_s1);

-- live traffic during the copy: applied to old shards AND captured
UPDATE old_s1 SET balance = 999 WHERE user_id = 3;  INSERT INTO changelog VALUES (1, 3,  'upsert', 'u3',  999);
INSERT INTO old_s1 VALUES (21, 'u21', 50);          INSERT INTO changelog VALUES (2, 21, 'upsert', 'u21', 50);
DELETE FROM old_s0 WHERE user_id = 8;               INSERT INTO changelog VALUES (3, 8,  'delete', NULL,  NULL);

-- step 3: idempotent replay in sequence order
INSERT INTO new_users (shard, user_id, name, balance)
SELECT user_id % 4, user_id, name, balance
FROM changelog WHERE op = 'upsert' ORDER BY seq
ON CONFLICT (user_id) DO UPDATE SET name = excluded.name, balance = excluded.balance;
DELETE FROM new_users WHERE user_id IN (SELECT user_id FROM changelog WHERE op = 'delete');

-- step 4: verify before cut-over
WITH old AS (SELECT * FROM old_s0 UNION ALL SELECT * FROM old_s1)
SELECT (SELECT COUNT(*) FROM old)                                AS old_rows,
       (SELECT COUNT(*) FROM new_users)                          AS new_rows,
       (SELECT SUM(user_id * 1000003 + balance) FROM old)        AS old_checksum,
       (SELECT SUM(user_id * 1000003 + balance) FROM new_users)  AS new_checksum;

SELECT shard, COUNT(*) AS rows_on_shard FROM new_users GROUP BY shard ORDER BY shard;` },
      complexity: `<p>Backfill O(rows), replay O(changes), verification O(rows) (chunked in production). Downtime: only the final cut-over pause.</p>`,
      followUps: ['How do you handle a row updated twice, with the second update arriving before the first in the stream?', 'What must happen to caches and ID generators at cut-over?']
    }
  });

  practice.push({
    title: 'Globally Unique Usernames Across Regions',
    level: 'Hard', tags: ['linearizability', 'uniqueness', 'multi-region'], companies: ['Discord', 'GitHub', 'Twitter/X'],
    statement: `<p>Two users in different regions try to claim the username <code>asha</code> at the same moment. Show (a) why per-region "check then insert" with asynchronous replication between regions lets <b>both</b> succeed, and (b) a correct design where exactly one claim wins. Express both in SQL (each region as a table) and explain how you would run (b) in production across regions.</p>`,
    constraints: `Usernames are case-insensitive. Exactly one winner. Losing client gets a clear "taken" answer.`,
    example: `<p>(a) US inserts asha, EU inserts asha (neither sees the other yet) → after replication ${H.c('r', '2 owners of "asha"')}. (b) one linearizable table with a UNIQUE key: first claim ${H.c('g', 'changes() = 1')}, second claim (even as "Asha") ${H.c('r', 'changes() = 0 → taken')}.</p>`,
    brute: { why: `<p>Each region checks its own replica and inserts. Under AP / multi-leader replication there is no single place that sees both claims before they commit, so uniqueness cannot be enforced — the conflict is discovered after replication, when both users already think they own the name.</p>`, code: { lang: 'sql', code: `CREATE TABLE users_us (username TEXT NOT NULL, region TEXT NOT NULL);
CREATE TABLE users_eu (username TEXT NOT NULL, region TEXT NOT NULL);
-- each region: "if not exists locally, insert"
INSERT INTO users_us SELECT 'asha', 'us' WHERE NOT EXISTS (SELECT 1 FROM users_us WHERE username = 'asha');
INSERT INTO users_eu SELECT 'asha', 'eu' WHERE NOT EXISTS (SELECT 1 FROM users_eu WHERE username = 'asha');
-- later, replication merges both regions:
SELECT username, COUNT(*) AS owners, GROUP_CONCAT(region) AS regions
FROM (SELECT * FROM users_us UNION ALL SELECT * FROM users_eu)
GROUP BY username HAVING COUNT(*) > 1;` } },
    mcq: { q: 'Which mechanism gives correct global uniqueness for usernames?', options: ['Last-write-wins replication', 'A unique constraint on a single linearizable (consensus-backed) store, or a conditional write (IF NOT EXISTS / Paxos LWT)', 'Checking a read replica before inserting', 'A cache with a TTL'], answer: 1, explain: 'Uniqueness is a linearizability requirement: all claims must be ordered through one consensus point. Replicas, caches and LWW cannot see concurrent claims in time.' },
    hints: [
      `<p>Hint 1: Uniqueness = "first claim wins, everyone agrees on who was first" → needs one ordering point (single leader or consensus).</p>`,
      `<p>Hint 2: In SQL that is a PRIMARY KEY / UNIQUE on a normalised username (<code>COLLATE NOCASE</code> or lower()) plus <code>INSERT ... ON CONFLICT DO NOTHING</code> and checking <code>changes()</code>.</p>`,
      `<p>Hint 3: Production: a CockroachDB/Spanner GLOBAL or REGIONAL table with a unique index, DynamoDB conditional put, or Cassandra <code>INSERT ... IF NOT EXISTS</code> (Paxos). Only the claim pays cross-region latency; profiles can stay regional.</p>`
    ],
    tests: { engine: 'sqlite', check: '(rows, cols, c) => {\n  if (c.plan || c.noplan) { const d = rows.map(r => r[r.length - 1]).join(\'\\n\'); return (!c.plan || new RegExp(c.plan).test(d)) && (!c.noplan || !new RegExp(c.noplan).test(d)); }\n  let a = rows, b = c.rows || [];\n  if (c.set) { const k = r => JSON.stringify(r); a = a.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); b = b.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); }\n  return a.length === b.length && a.every((r, i) => r.length === b[i].length && r.every((v, j) => v === b[i][j] || (typeof v === \'number\' && typeof b[i][j] === \'number\' && Math.abs(v - b[i][j]) < 1e-6)));\n}', cases: [
      { rows: [
          ['asha', 101, 'us']
        ] },
      { result: 0, rows: [
          [1]
        ] },
      { result: 1, rows: [
          [0]
        ] },
      { after: 'INSERT INTO usernames VALUES (\'ASHA\', 303, \'in\') ON CONFLICT (username) DO NOTHING; SELECT changes(), (SELECT count(*) FROM usernames)', rows: [
          [0, 1]
        ] },
      { after: 'INSERT INTO usernames VALUES (\'bob\', 404, \'eu\') ON CONFLICT (username) DO NOTHING; SELECT changes(), (SELECT count(*) FROM usernames)', rows: [
          [1, 2]
        ] },
      { after: 'INSERT INTO usernames VALUES (\'Asha\', 505, \'eu\')', error: 'UNIQUE' },
      { after: 'SELECT user_id, home_region FROM usernames WHERE username = \'AsHa\'', rows: [
          [101, 'us']
        ] },
      { after: 'INSERT INTO usernames VALUES (NULL, 606, \'eu\')', error: 'NOT NULL' },
      { after: 'INSERT INTO usernames VALUES (\'cara\', 707, \'eu\'), (\'CARA\', 808, \'us\') ON CONFLICT (username) DO NOTHING; SELECT user_id FROM usernames WHERE username = \'cara\'', rows: [
          [707]
        ] }
    ] },
    solution: {
      approach: `<p>Route every claim through one linearizable store keyed by the normalised username. The insert either creates the row (winner) or hits the unique key (loser) — decided by consensus, so both regions agree. Cost: one cross-region consensus round (~100 ms) only on signup/rename, which is rare. Keep user profiles in their home region; the username table maps name → user_id + home region. Avoid "reserve in cache then write" schemes unless the cache itself is the linearizable store.</p>`,
      code: { lang: 'sql', code: `CREATE TABLE usernames (
  username    TEXT NOT NULL PRIMARY KEY COLLATE NOCASE,   -- 'Asha' and 'asha' are the same name; SQLite allows NULL in a non-integer PRIMARY KEY unless NOT NULL
  user_id     INTEGER NOT NULL,
  home_region TEXT NOT NULL
);

-- US claim
INSERT INTO usernames VALUES ('asha', 101, 'us') ON CONFLICT (username) DO NOTHING;
SELECT changes() AS us_claim_won;          -- 1

-- EU claim arrives a moment later (ordered by consensus in production)
INSERT INTO usernames VALUES ('Asha', 202, 'eu') ON CONFLICT (username) DO NOTHING;
SELECT changes() AS eu_claim_won;          -- 0 -> tell the user "taken"

SELECT username, user_id, home_region FROM usernames;` },
      alt: [{ lang: 'text', check: false, title: 'Cassandra lightweight transaction / DynamoDB conditional put', code: `-- Cassandra (Paxos under the hood)
INSERT INTO accounts.usernames (username, user_id, home_region)
VALUES ('asha', 202, 'eu') IF NOT EXISTS;        -- returns [applied] = false for the loser

-- DynamoDB PutItem
-- ConditionExpression: attribute_not_exists(PK)   with PK = "USERNAME#asha"` }],
      complexity: `<p>One consensus round per claim (in-region ~ms, cross-region ~100 ms). Reads of "who owns asha" can use follower reads if slightly stale answers are acceptable.</p>`,
      followUps: ['How do you implement username changes atomically (release old, claim new)?', 'What if the linearizable store\'s region is partitioned away from EU users?']
    }
  });

  /* =====================================================================
     QUIZ
     ===================================================================== */
  quiz.push(
    { q: 'An app writes to the leader and immediately reads from an async follower. The user sometimes sees their old profile name. Which guarantee is violated?', options: ['Monotonic reads', 'Read-your-writes', 'Consistent prefix', 'Linearizable writes'], answer: 1, explain: 'The user does not see their own write — read-your-writes. Fix: read from the leader for a short window after writing, or require a replica at/after the write\'s LSN.' },
    { q: 'Why can statement-based replication make followers diverge?', options: ['It sends too many bytes', 'Re-executing statements with NOW(), RANDOM() or nondeterministic ordering yields different results on each follower', 'Followers cannot parse SQL', 'It only works with synchronous replication'], answer: 1, explain: 'Statement shipping replays SQL text; anything nondeterministic evaluates differently. Row-based/logical replication ships the resulting values instead.' },
    { q: 'N = 5, W = 2. Which R guarantees that every read overlaps the latest successful write?', options: ['R = 2', 'R = 3', 'R = 4', 'R = 1'], answer: 2, explain: 'Need R + W > N → R > 3 → R = 4 (or 5).' },
    { q: 'Which technique lets two replicas find which key ranges differ without sending all their data?', options: ['Hinted handoff', 'Merkle trees (anti-entropy)', 'Read repair', 'Vector clocks'], answer: 1, explain: 'Replicas compare hashes of a tree over key ranges and descend only into subtrees whose hashes differ.' },
    { q: 'You range-shard an events table by created_at. What problem appears?', options: ['Range scans become impossible', 'All new inserts hit the last shard (hot spot)', 'Hash collisions', 'Data cannot be replicated'], answer: 1, explain: 'Monotonically increasing keys always fall in the newest range. Prefix with a hash bucket, hash the key, or use hash-sharded indexes.' },
    { q: 'Adding one node to a 9-node cluster: roughly what fraction of keys move with well-balanced consistent hashing?', options: ['~90%', '~50%', '~10%', '0%'], answer: 2, explain: 'The new node takes about 1/(N+1) = 1/10 of the keyspace; mod-N would move about 9/10.' },
    { q: 'In Cassandra, which part of PRIMARY KEY ((a, b), c) decides which nodes store a row?', options: ['c', 'a only', 'the pair (a, b) — the partition key', 'all three columns'], answer: 2, explain: '(a, b) is the composite partition key, hashed to a token on the ring; c is the clustering key that sorts rows inside the partition.' },
    { q: 'Which workload is the best fit for a graph database?', options: ['Summing sales per day over 2 billion rows', 'Finding fraud rings: accounts linked through shared devices, cards and addresses 3-4 hops away', 'Storing session tokens with TTL', 'Append-only IoT readings'], answer: 1, explain: 'Multi-hop relationship traversal is the graph sweet spot. Aggregations go to columnar stores; sessions to KV; time-series to wide-column/TSDB.' },
    { q: 'Under PACELC, a system that answers from the nearest replica without waiting for others during normal operation is choosing…', options: ['EC', 'EL', 'PC', 'CA'], answer: 1, explain: '"Else Latency": with no partition, it trades consistency for lower latency.' },
    { q: 'What does Spanner\'s commit wait achieve?', options: ['It batches writes for throughput', 'It waits out clock uncertainty (~2ε) so commit timestamps respect real-time order (external consistency)', 'It waits for all replicas worldwide to apply the write', 'It retries aborted transactions'], answer: 1, explain: 'Spanner picks s = TT.now().latest and waits until TT.now().earliest > s, guaranteeing any transaction starting later gets a larger timestamp.' },
    { q: 'A 5-replica Raft group can lose how many replicas and still commit writes?', options: ['1', '2', '3', '4'], answer: 1, explain: 'Commits need a majority (3 of 5); with 2 failed, 3 remain. 2f + 1 replicas tolerate f failures.' },
    { q: 'Your team of 3 engineers builds a B2B invoicing product: ~200 writes/s, complex reports, strict correctness. Best default?', options: ['Cassandra cluster', 'Managed PostgreSQL', 'Redis with AOF', 'Neo4j'], answer: 1, explain: 'Load is tiny for one Postgres node; invoicing needs ACID and ad-hoc SQL reporting; a managed service minimises ops for a small team.' }
  );

  /* =====================================================================
     INTERVIEW Q&A
     ===================================================================== */
  interview.push(
    { q: 'What is the difference between replication and sharding? Do you need both?', level: 'B', a: `<p><b>Replication</b> keeps <i>copies of the same data</i> on several nodes — for availability, durability, read scaling and locality. <b>Sharding</b> splits <i>different parts of the data</i> across nodes — for capacity and write throughput beyond one machine. Large systems use both: each shard is replicated (e.g. 64 shards × 3 replicas). Replication alone cannot help when the data or the write rate exceeds one leader; sharding alone loses data when a shard's only node dies.</p>`, followUps: ['Which one fixes "too many reads"?', 'Which one fixes "too many writes"?'] },
    { q: 'Synchronous vs asynchronous replication: trade-offs?', level: 'B', a: `<p><b>Synchronous</b>: the leader waits for the follower to confirm before acknowledging — zero data loss on failover (RPO 0) and fresh follower reads, but higher write latency and a slow/dead follower blocks writes. <b>Asynchronous</b>: acknowledge immediately — fast and tolerant of far-away followers, but followers lag and a leader crash can lose acknowledged writes. Common compromise: <b>semi-sync / quorum commit</b> (wait for any 1 of N followers), e.g. Postgres <code>synchronous_standby_names = 'ANY 1 (...)'</code> or MySQL lossless semi-sync.</p>`, followUps: ['What is RPO vs RTO?', 'How does Aurora avoid this trade-off at the storage layer?'] },
    { q: 'Users complain that after posting a comment and refreshing, the comment is missing; a second refresh shows it. Diagnose and fix.', level: 'I', a: `<p>Reads are load-balanced to async replicas that have not yet applied the write: a <b>read-your-writes</b> violation (and flapping between replicas also breaks <b>monotonic reads</b>). Fixes: (1) after a write, route that user's reads to the leader for a short window (e.g. 5 s or until replica lag &lt; window); (2) return the write's LSN/GTID to the client (cookie/session) and only read from replicas whose applied position ≥ token, falling back to the leader; (3) pin sessions to one replica for monotonicity. Also monitor <code>replay_lag</code> and eject lagging replicas from the pool.</p>`, followUps: ['How does this work across devices?', 'What if the leader is in another region?'] },
    { q: 'Explain quorums in leaderless databases. Why might R + W > N still return stale data?', level: 'I', a: `<p>Each key has N replicas; a write succeeds after W acks; a read waits for R answers and returns the newest version. If R + W &gt; N, read and write sets overlap, so normally the read sees the latest successful write. Stale results still occur with: <b>sloppy quorums</b> (writes landed on stand-in nodes during failures), <b>partially failed writes</b> (reached fewer than W nodes, reported failure, but were not rolled back), <b>concurrent read and write</b> (different reads may see old/new), <b>LWW with clock skew</b> (the "newest" timestamp is not the latest write), and a replica restored from an old backup. Linearizability needs extra steps: synchronous read repair, or consensus (Cassandra LWT/Accord).</p>`, followUps: ['What are read repair and hinted handoff?', 'What do LOCAL_QUORUM and EACH_QUORUM mean?'] },
    { q: 'How would you choose a shard key? Give a concrete example.', level: 'I', a: `<p>Criteria: high cardinality, even <b>load</b> (not just even rows), present in most queries (so they hit one shard), keeps transactional data together, not monotonic (unless range scans need it). Example — multi-tenant SaaS: shard by <code>tenant_id</code> so every tenant query and transaction is single-shard, co-locate all tenant tables on that key (Citus/Vitess). Risk: whale tenants → use a compound key <code>(tenant_id, user_id)</code> or a directory that pins big tenants to dedicated shards. Validate by replaying a day of traffic and measuring per-shard load (max ÷ avg).</p>`, followUps: ['What breaks if you shard by created_at?', 'How do you query by a non-shard column like email?'] },
    { q: 'Explain consistent hashing and virtual nodes.', level: 'I', a: `<p>Hash both nodes and keys onto a ring (e.g. 0..2<sup>32</sup>−1); a key belongs to the first node clockwise. Adding a node only takes keys from its clockwise neighbour, so ≈ 1/N of keys move instead of almost all (as with <code>mod N</code>). With one point per node, arcs are uneven; <b>virtual nodes</b> give each physical node many points, smoothing load, allowing weights (bigger machines get more vnodes), and spreading re-replication work when a node dies. Alternatives: rendezvous hashing, jump hash, or a fixed number of partitions mapped to nodes (Redis 16 384 slots, Kafka partitions).</p>`, followUps: ['Why did Cassandra reduce the default number of vnodes?', 'How does bounded-load consistent hashing work?'] },
    { q: 'How do you handle a hot key (celebrity user, viral product)?', level: 'A', a: `<p>A single key maps to a single shard, so adding shards does not help. Options: <b>cache</b> reads (CDN, Redis, in-process) with request coalescing; <b>split/salt</b> writes into K sub-keys (<code>post42#0..#15</code>) and sum on read; <b>buffer and batch</b> increments (aggregate in memory/Kafka, flush every second); use <b>CRDT counters</b>; give the whale a <b>dedicated shard</b> via a directory; for feeds, switch from fan-out-on-write to fan-out-on-read for celebrities. Detect hot keys with per-key sampling/metrics (Redis <code>--hotkeys</code>, DynamoDB contributor insights).</p>`, followUps: ['What does reading a salted key cost?', 'How would you make K adaptive?'] },
    { q: 'Document vs relational: when would you choose MongoDB over Postgres, and when not?', level: 'I', a: `<p>Choose a document store when data is naturally <b>aggregate-shaped</b> (an order with its items, a profile with nested settings), read and written as a unit, with <b>varying attributes</b> and a need for built-in sharding. Choose relational when you have many-to-many relationships, ad-hoc queries and reporting, cross-entity invariants and multi-row transactions. Nuances: Postgres JSONB covers many "flexible schema" needs; MongoDB has multi-document transactions but they cost more. Anti-patterns: unbounded arrays in documents, deep joins via <code>$lookup</code> everywhere, shard keys on monotonic ObjectIds.</p>`, followUps: ['How do you model a product with millions of reviews?', 'How do you enforce schema in MongoDB?'] },
    { q: 'Walk me through modelling data for Cassandra.', level: 'A', a: `<p>Start from the <b>queries</b>, not entities. For each query, create a table whose <b>partition key</b> is exactly the equality filter and whose <b>clustering columns</b> give the sort/range. Denormalise and duplicate across tables (write to all on insert, via logged batch or idempotent app writes). Bound partition size with <b>buckets</b> (day/hour) and estimate rows × bytes. Avoid ALLOW FILTERING, unbounded partitions, queue-like delete patterns (tombstones), and secondary indexes on high-cardinality columns. Choose consistency per query (LOCAL_QUORUM typical), TTLs and compaction strategy (TWCS for time-series).</p>`, followUps: ['How do you delete data consistently from two denormalised tables?', 'What is a tombstone and why does gc_grace_seconds matter?'] },
    { q: 'Explain CAP correctly. Is "pick 2 of 3" right?', level: 'A', a: `<p>No. CAP says: when a <b>network partition</b> happens, an operation must either give up <b>linearizable consistency</b> (answer with possibly stale data) or give up <b>availability</b> (refuse/timeout on some nodes). Partitions are a fact of networks, so the choice is CP vs AP <i>during partitions</i>; without partitions you can have both. It is per operation, not per product: Cassandra at QUORUM behaves CP-like for minority clients, at ONE AP-like. CAP's C is linearizability, not ACID's C. <b>PACELC</b> adds the normal-case trade-off: latency vs consistency, which matters far more often.</p>`, followUps: ['Classify Spanner, DynamoDB and MongoDB under PACELC.', 'What is "harvest vs yield"?'] },
    { q: 'How does Spanner provide external consistency, and how does CockroachDB differ?', level: 'E', a: `<p>Spanner replicates each split with Paxos and uses <b>TrueTime</b>: <code>TT.now()</code> returns [earliest, latest] with bounded error ε from GPS/atomic clocks. A read-write transaction takes locks, picks commit timestamp s ≥ TT.now().latest, and <b>commit-waits</b> until TT.now().earliest &gt; s (~2ε) before making the commit visible, so timestamps follow real time: strict serializability. CockroachDB has no special clocks; it uses <b>hybrid logical clocks</b> with a maximum offset (default 500 ms). Reads that see values within their <b>uncertainty interval</b> may restart at a higher timestamp, and nodes with excessive skew stop. It provides serializability (plus no stale single-key reads) rather than Spanner's guarantee in every edge case, avoiding commit wait on every write.</p>`, followUps: ['What happens to Spanner latency if ε grows?', 'What are follower reads?'] },
    { q: 'How does a NewSQL database commit a transaction that touches rows on two different ranges?', level: 'E', a: `<p>Each range is a Raft (or Paxos) group. The gateway coordinates: it writes <b>provisional intents</b> to each range (each replicated to a majority) and a <b>transaction record</b> on one range. The commit point is that record flipping to COMMITTED (CockroachDB's parallel commits mark it STAGING alongside the intents so the commit is implicit once all are replicated, saving a round trip). Because every participant and the record are consensus-replicated, the classic 2PC blocking problem disappears: if the coordinator dies, any node can read the record and resolve intents. Conflicts under SERIALIZABLE cause restarts (SQLSTATE 40001) the client must retry.</p>`, followUps: ['Why keep multi-range transactions rare anyway?', 'Compare with Percolator (TiDB).'] },
    { q: 'You are asked: "Which database would you use for X?" How do you structure the answer?', level: 'A', a: `<p>Ask/state: (1) data shape and relationships, (2) top queries with QPS and latency targets, (3) consistency/transaction needs per feature, (4) scale numbers now and in 3 years with back-of-envelope math, (5) geography, residency and RPO/RTO, (6) team skills, managed options and cost. Then pick a <b>system of record</b> (often Postgres or a NewSQL store), add derived stores only where justified (cache, search, warehouse, vector index) fed by CDC/outbox, and close with the trade-off sentence: what you give up and what would make you revisit the choice.</p>`, followUps: ['When would you NOT add a cache?', 'How do you keep a search index in sync with the database?'] },
    { q: 'Explain the leader failover process and its dangers.', level: 'A', a: `<p>Steps: detect failure (missed heartbeats beyond a timeout), elect the most up-to-date replica (via a consensus store like etcd in Patroni, or Raft inside the DB), promote it, repoint clients (DNS/proxy/service discovery), and fence the old leader. Dangers: <b>lost writes</b> if async replicas were behind; <b>split brain</b> if the old leader keeps accepting writes (use leases, fencing tokens, STONITH); <b>bad timeouts</b> (too short → flapping failovers during load spikes, too long → long outages); <b>conflicting IDs</b> if the old leader's auto-increment values were reused (GitHub's 2012 incident involved exactly that with MySQL). Test failover regularly (game days, chaos engineering).</p>`, followUps: ['What is a fencing token?', 'How do Raft terms prevent two leaders from committing?'] }
  );

  /* =====================================================================
     MODULE
     ===================================================================== */
  registerModule({
    id: 'sql14',
    title: 'Distributed Databases & NoSQL',
    intro: `<p>One database server eventually runs out of room, speed, or luck. This module is about what happens next: copying data to many machines (<b>replication</b>), splitting it across machines (<b>sharding</b>), the <b>NoSQL families</b> built for specific data shapes (key-value, document, wide-column, graph), the honest trade-offs captured by <b>CAP and PACELC</b>, and the <b>NewSQL</b> systems (Spanner, CockroachDB) that bring SQL transactions to planet scale.</p>
<p>Every topic starts with an everyday analogy, then animations: watch a <b>stale read</b> happen on a lagging follower, see quorum read and write sets overlap (or miss), watch keys pile onto a <b>hot shard</b>, and follow a transaction through Raft majorities and Spanner's commit wait. You can run real SQL against small simulated clusters (a replication log, a sharded user base, JSON documents, a wide-column table, a follow graph, NewSQL ranges) and runnable Python sketches of routers, consistent hashing, version vectors, hybrid clocks and 2PC.</p>
<p>The goal is interview-grade judgement: <b>choose a database for a scenario, design a shard key, model data query-first, and reason about replication-lag anomalies</b> with precise vocabulary.</p>`,
    goals: [
      'Explain leader-follower, multi-leader and leaderless replication, and diagnose read-your-writes, monotonic-read and consistent-prefix anomalies caused by replication lag',
      'Do quorum math (R + W &gt; N), explain read repair, anti-entropy, hinted handoff, and resolve conflicts with LWW, version vectors or CRDTs',
      'Design a shard key from measured load, compare range, hash, consistent hashing and directory sharding, and fix hot keys with salting',
      'Model the same data in key-value, document, wide-column and graph stores, query-first, with partition sizing',
      'Explain CAP and PACELC precisely, pick a consistency level per feature, and describe how Spanner and CockroachDB use consensus, 2PC and clocks',
      'Choose a database (or a polyglot set) for a scenario with capacity math and a clear trade-off statement'
    ],
    prereqs: `SQL 12 (Transactions, Isolation &amp; Concurrency Control) and SQL 13 (Storage Engines Internals) — MVCC, WAL and LSM-trees are assumed. Window functions (SQL 6) and recursive CTEs (SQL 5) are used in the runnable queries. Basic networking (latency, round trips) helps.`,
    hours: 16,
    databases: { repl: DB_REPL, shard: DB_SHARD, nosql: DB_NOSQL, bank: DB_BANK },
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
