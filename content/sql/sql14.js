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
), load AS (
  SELECT candidate, shard, COUNT(*) AS reqs
  FROM candidates GROUP BY candidate, shard ORDER BY candidate, shard
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
), load AS (
  SELECT candidate, shard, COUNT(*) AS reqs
  FROM candidates GROUP BY candidate, shard ORDER BY candidate, shard
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
<p>Also note the convergence: Postgres has <code>JSONB</code>, <code>pgvector</code> and recursive CTEs; MongoDB has multi-document ACID transactions and schema validation; DynamoDB has transactions; Cassandra 5 adds ACID transactions and vector search. Families describe the <b>primary data model and scaling design</b>, not a hard feature list.</p>`,
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
  registerModule({ id: 'sql14', title: 'Distributed Databases & NoSQL', intro: `<p>tmp</p>`, goals: [], prereqs: `tmp`, hours: 12,
    databases: { repl: DB_REPL, shard: DB_SHARD, nosql: DB_NOSQL, bank: DB_BANK },
    topics: topics, practice: practice, quiz: quiz, interview: interview });
})();
