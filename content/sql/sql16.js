(function () {
  var topics = [], practice = [], quiz = [], interview = [];

  /* ---------------- lab database (SQLite dialect) ----------------
     SQLite cannot run PostgreSQL or MySQL internals, so the lab keeps small, hand-made copies of
     what each engine stores: PostgreSQL heap tuples + commit log, InnoDB rows + undo chain + read views,
     catalog sizes, EXPLAIN output, an index-gap lock model, replica positions and JSON order metadata. */
  var DB_LAB = `-- PostgreSQL heap: every physical row version (tuple) of the orders table
CREATE TABLE clog (xid INTEGER PRIMARY KEY, state TEXT NOT NULL CHECK (state IN ('committed', 'aborted', 'in_progress')));
INSERT INTO clog VALUES (100, 'committed'), (101, 'committed'), (102, 'aborted'), (103, 'committed'), (104, 'in_progress'), (105, 'committed');
CREATE TABLE pg_tuples (ctid TEXT PRIMARY KEY, id INTEGER NOT NULL, status TEXT NOT NULL, xmin INTEGER NOT NULL, xmax INTEGER NOT NULL DEFAULT 0);
INSERT INTO pg_tuples VALUES
  ('(0,1)', 1, 'new',       100, 101),
  ('(0,2)', 1, 'paid',      101, 103),
  ('(0,3)', 1, 'shipped',   103, 0),
  ('(0,4)', 2, 'new',       100, 102),
  ('(0,5)', 2, 'cancelled', 102, 0),
  ('(0,6)', 3, 'new',       101, 104),
  ('(0,7)', 3, 'paid',      104, 0),
  ('(0,8)', 4, 'new',       103, 105);
-- Oldest snapshot (backend_xmin) each open session still holds; NULL = idle, holds nothing
CREATE TABLE backends (pid INTEGER PRIMARY KEY, app TEXT NOT NULL, backend_xmin INTEGER);
INSERT INTO backends VALUES (4101, 'api', NULL), (4102, 'nightly_report', 102), (4103, 'api', 105);
-- pg_stat_user_tables-style counters; NULL settings mean the server default (scale 0.2, threshold 50)
CREATE TABLE table_stats (relname TEXT PRIMARY KEY, n_live_tup INTEGER NOT NULL, n_dead_tup INTEGER NOT NULL, scale_factor REAL, base_threshold INTEGER);
INSERT INTO table_stats VALUES
  ('orders',   1000000, 150000, NULL, NULL),
  ('sessions',   20000,   9000, NULL, NULL),
  ('events',  50000000, 600000, 0.01, 1000),
  ('users',        200,     80, NULL, NULL),
  ('carts',       5000,   1100, 0.2,  50);
-- PostgreSQL UPDATE log: could each update be HOT (heap-only tuple)?
CREATE TABLE indexed_cols (col TEXT PRIMARY KEY);
INSERT INTO indexed_cols VALUES ('id'), ('customer_id'), ('email');
CREATE TABLE update_log (upd_id INTEGER PRIMARY KEY, changed_cols TEXT NOT NULL, page_free_bytes INTEGER NOT NULL, new_tuple_bytes INTEGER NOT NULL);
INSERT INTO update_log VALUES
  (1, '["status"]', 400, 120),
  (2, '["status","total"]', 90, 120),
  (3, '["email"]', 800, 120),
  (4, '["total"]', 120, 120),
  (5, '["status","customer_id"]', 900, 120);

-- InnoDB: the clustered index holds only the NEWEST version; older ones live in the undo log
CREATE TABLE innodb_rows (id INTEGER PRIMARY KEY, status TEXT NOT NULL, trx_id INTEGER NOT NULL, roll_ptr INTEGER);
INSERT INTO innodb_rows VALUES (1, 'shipped', 30, 3), (2, 'cancelled', 40, 5), (3, 'new', 10, NULL);
CREATE TABLE undo_log (undo_no INTEGER PRIMARY KEY, row_id INTEGER NOT NULL, old_status TEXT NOT NULL, old_trx_id INTEGER NOT NULL, prev_ptr INTEGER);
INSERT INTO undo_log VALUES (3, 1, 'paid', 20, 2), (2, 1, 'new', 10, NULL), (5, 2, 'new', 10, NULL);
-- A read view: trx ids >= low_limit are invisible, and so are the ids listed as active when it was made
CREATE TABLE read_views (name TEXT PRIMARY KEY, low_limit INTEGER NOT NULL);
CREATE TABLE read_view_active (name TEXT NOT NULL, trx_id INTEGER NOT NULL);
INSERT INTO read_views VALUES ('report_A', 25), ('report_B', 41);
INSERT INTO read_view_active VALUES ('report_B', 30);

-- Catalog sizes for the clustered-vs-heap comparison
CREATE TABLE table_defs (table_name TEXT PRIMARY KEY, row_count INTEGER NOT NULL, pk_bytes INTEGER NOT NULL);
INSERT INTO table_defs VALUES ('orders', 1000000, 8), ('events', 2000000, 16), ('users', 50000, 8);
CREATE TABLE index_defs (table_name TEXT NOT NULL, index_name TEXT NOT NULL, key_bytes INTEGER NOT NULL, is_primary INTEGER NOT NULL, PRIMARY KEY (table_name, index_name));
INSERT INTO index_defs VALUES
  ('orders', 'orders_pkey', 8, 1), ('orders', 'idx_orders_customer', 8, 0), ('orders', 'idx_orders_email', 32, 0),
  ('events', 'events_pkey', 16, 1), ('events', 'idx_events_user', 8, 0),
  ('users', 'users_pkey', 8, 1), ('users', 'idx_users_email', 24, 0);

-- A real table to index (meta is JSON text; PostgreSQL would use jsonb, MySQL the JSON type)
CREATE TABLE orders (id INTEGER PRIMARY KEY, customer_id INTEGER NOT NULL, status TEXT NOT NULL, email TEXT NOT NULL, total INTEGER NOT NULL, created_at TEXT NOT NULL, meta TEXT);
INSERT INTO orders VALUES
  (1, 101, 'paid',      'asha@x.io', 4999, '2026-01-03', '{"channel":"web","tags":["gift","rush"]}'),
  (2, 102, 'pending',   'Ben@x.io',  1500, '2026-01-04', '{"channel":"app","tags":["rush"]}'),
  (3, 101, 'shipped',   'asha@x.io', 2500, '2026-01-05', '{"channel":"web","tags":["gift"],"coupon":"SAVE10"}'),
  (4, 103, 'pending',   'chen@x.io',  900, '2026-01-06', '{"channel":"web","tags":[]}'),
  (5, 104, 'cancelled', 'dara@x.io', 3000, '2026-01-07', '{"channel":"store"}'),
  (6, 102, 'paid',      'ben@x.io',  1200, '2026-01-08', '{"channel":"web","tags":["bulk","gift"]}'),
  (7, 105, 'pending',   'eli@x.io',   700, '2026-01-09', '{"channel":"app","tags":["gift"],"coupon":"NEW5"}'),
  (8, 103, 'paid',      'chen@x.io', 8800, '2026-01-10', '{"channel":"web","tags":["rush","bulk"],"coupon":"SAVE10"}');

-- EXPLAIN ANALYZE output from PostgreSQL, one row per plan node (actual rows and time are PER LOOP)
CREATE TABLE plan_nodes (plan TEXT NOT NULL, node_id INTEGER NOT NULL, parent_id INTEGER, node_type TEXT NOT NULL, relation TEXT, est_rows INTEGER NOT NULL, actual_rows INTEGER NOT NULL, loops INTEGER NOT NULL, time_ms REAL NOT NULL, PRIMARY KEY (plan, node_id));
INSERT INTO plan_nodes VALUES
  ('q1', 1, NULL, 'Nested Loop', NULL, 50, 48000, 1, 812.4),
  ('q1', 2, 1, 'Seq Scan', 'customers', 5, 4000, 1, 30.1),
  ('q1', 3, 1, 'Index Scan', 'orders', 10, 12, 4000, 0.17),
  ('q2', 1, NULL, 'Hash Join', NULL, 1000, 950, 1, 45.0),
  ('q2', 2, 1, 'Seq Scan', 'orders', 100000, 99000, 1, 20.0),
  ('q2', 3, 1, 'Hash', NULL, 200, 3000, 1, 5.0),
  ('q2', 4, 3, 'Bitmap Heap Scan', 'customers', 200, 3000, 1, 4.2);
-- Classic tabular MySQL EXPLAIN rows
CREATE TABLE mysql_explain (query TEXT NOT NULL, tbl TEXT NOT NULL, access_type TEXT NOT NULL, key_used TEXT, rows_est INTEGER NOT NULL, filtered REAL NOT NULL, extra TEXT);
INSERT INTO mysql_explain VALUES
  ('Q1', 'orders',    'ALL',    NULL,           980000, 10.0, 'Using where'),
  ('Q2', 'orders',    'ref',    'idx_customer', 12,     100.0, NULL),
  ('Q3', 'orders',    'range',  'idx_created',  5400,   100.0, 'Using index condition; Using filesort'),
  ('Q4', 'customers', 'eq_ref', 'PRIMARY',      1,      100.0, NULL),
  ('Q5', 'orders',    'index',  'idx_status',   980000, 100.0, 'Using index; Using temporary');

-- InnoDB next-key lock model: values in a secondary index, one locking range scan, and waiting inserts
CREATE TABLE idx_keys (k INTEGER PRIMARY KEY);
INSERT INTO idx_keys VALUES (10), (20), (30), (40);
CREATE TABLE scan (lo INTEGER NOT NULL, hi INTEGER NOT NULL);
INSERT INTO scan VALUES (15, 25);
CREATE TABLE insert_attempts (txn TEXT PRIMARY KEY, k INTEGER NOT NULL);
INSERT INTO insert_attempts VALUES ('T2', 12), ('T3', 25), ('T4', 35), ('T5', 5), ('T6', 28);

-- Replication: where the primary is, and how far each replica got (positions in bytes of WAL / binlog)
CREATE TABLE primary_state (name TEXT PRIMARY KEY, current_lsn INTEGER NOT NULL);
INSERT INTO primary_state VALUES ('pg-primary', 5000);
CREATE TABLE replicas (name TEXT PRIMARY KEY, mode TEXT NOT NULL CHECK (mode IN ('sync', 'async')), healthy INTEGER NOT NULL, received_lsn INTEGER NOT NULL, replayed_lsn INTEGER NOT NULL, zone TEXT NOT NULL);
INSERT INTO replicas VALUES
  ('pg-r1', 'sync',  1, 5000, 4990, 'az1'),
  ('pg-r2', 'async', 1, 4800, 4700, 'az2'),
  ('pg-r3', 'async', 0, 5000, 5000, 'az3'),
  ('pg-r4', 'async', 1, 4990, 4990, 'az2');
-- Commits acknowledged to clients, with the WAL position of their commit record
CREATE TABLE commits (xid INTEGER PRIMARY KEY, commit_lsn INTEGER NOT NULL);
INSERT INTO commits VALUES (900, 4650), (901, 4750), (902, 4900), (903, 4995), (904, 5000);

-- Choosing an engine: weighted requirements, each engine scored 1-5 by the team
CREATE TABLE requirements (need TEXT PRIMARY KEY, weight INTEGER NOT NULL, pg_score INTEGER NOT NULL, my_score INTEGER NOT NULL);
INSERT INTO requirements VALUES
  ('jsonb + GIN search',          3, 5, 3),
  ('geo queries (PostGIS)',       2, 5, 2),
  ('team already runs MySQL',     3, 2, 5),
  ('primary-key range scans',     1, 3, 5),
  ('transactional DDL migrations', 2, 5, 2);

-- InnoDB lock waits (performance_schema.data_lock_waits, simplified): each waiting trx waits on one blocker
CREATE TABLE lock_waits (waiting_trx TEXT PRIMARY KEY, blocking_trx TEXT NOT NULL);
INSERT INTO lock_waits VALUES ('T2', 'T1'), ('T3', 'T2'), ('T4', 'T2'), ('T6', 'T5');`;

  /* ---------------- snippet helpers ---------------- */
  function lab(code, title) { return { lang: 'sql', db: 'lab', code: code, title: title || 'SQLite model of the engine — ▶ Run it against the lab database' }; }
  function pg(code, title) { return { lang: 'sql', code: code, check: false, title: title || 'PostgreSQL 16/17 (not runnable in the SQLite playground)' }; }
  function my(code, title) { return { lang: 'sql', code: code, check: false, title: title || 'MySQL 8.x / InnoDB (not runnable in the SQLite playground)' }; }
  var PLANCHECK = '(rows, cols, c) => { if (c.plan || c.noplan) { const d = rows.map(r => String(r[r.length - 1])).join(" | "); return (c.plan || []).every(p => new RegExp(p).test(d)) && !(c.noplan || []).some(p => new RegExp(p).test(d)); } return JSON.stringify(rows) === JSON.stringify(c.rows); }';

  /* ---------------- visualizer helpers ---------------- */
  function pick(input, allowed, dflt) {
    var k = String(input === undefined ? dflt : input).trim().toLowerCase();
    if (!k) k = dflt;
    if (allowed.indexOf(k) < 0) throw new Error('Type one of: ' + allowed.join(', '));
    return k;
  }
  function tbl(label, columns, rows, hl) { return { type: 'table', label: label, columns: columns, rows: rows, hl: hl || {} }; }
  function vars(label, vals, hl) { return { type: 'vars', label: label, vals: vals, hl: hl || {} }; }
  function txt(h) { return { type: 'text', html: h }; }

  /* =====================================================================
     TOPIC 1 — MVCC: tuple versions + VACUUM vs undo log + purge
     ===================================================================== */
  topics.push({
    title: 'MVCC Two Ways: PostgreSQL Tuple Versions + VACUUM vs InnoDB Undo + Purge',
    analogy: `<p>Two libraries handle "a book was revised".</p>
<p><b>Library P (PostgreSQL)</b> puts the <b>new edition on the shelf next to the old one</b> and writes on the old one "replaced by edition 2, from Tuesday". Readers with an old library card still grab the old edition. A cleaner (<b>VACUUM</b>) walks the shelves at night and throws out editions nobody can be reading any more.</p>
<p><b>Library M (MySQL InnoDB)</b> <b>rewrites the book on the shelf</b> and puts a photocopy of the old pages into a <b>back-room archive</b> (the undo log), with a note on the book pointing at it. An old reader follows the note into the archive. A clerk (<b>purge</b>) shreds archive copies once no reader can need them.</p>
<p>Same promise — readers never block writers — but the garbage ends up in different places: on the shelf (table bloat) or in the back room (history list).</p>`,
    explain: `<p>You met MVCC in SQL 12. Here we look at <b>where each engine keeps the old versions</b>, because that decides most of their operational differences.</p>
${H.table(['', 'PostgreSQL 16/17', 'MySQL 8.x InnoDB'], [
  ['UPDATE writes…', 'a <b>new tuple</b> in the heap; the old tuple gets <code>xmax</code> set', 'the row <b>in place</b> in the clustered index; the old values go to the <b>undo log</b>'],
  ['Version metadata', '<code>xmin</code>, <code>xmax</code> (32-bit xids) in every tuple header', 'hidden <code>DB_TRX_ID</code> (6 bytes) and <code>DB_ROLL_PTR</code> (7 bytes) per row'],
  ['Old reader finds its version by…', 'skipping tuples that are invisible to its snapshot', 'walking the roll pointer chain back through undo records'],
  ['ROLLBACK cost', 'almost free: mark the xid aborted in the commit log', 'expensive: apply the undo records in reverse'],
  ['Garbage collector', '<b>VACUUM</b> / autovacuum removes dead tuples, frees space for reuse', '<b>purge</b> threads delete undo records and delete-marked rows'],
  ['Symptom when it falls behind', 'table and index <b>bloat</b>, <code>n_dead_tup</code> grows', 'long <b>history list length</b>, undo tablespace grows, reads slow down'],
  ['Held back by', 'the oldest snapshot (<code>backend_xmin</code>), replication slots, <code>hot_standby_feedback</code>', 'the oldest open read view (long transaction)']
])}
<p><b>A tuple is reclaimable in PostgreSQL</b> when either its creator aborted, or its deleter committed and no snapshot still needs it. Autovacuum starts on a table when <code>n_dead_tup &gt; autovacuum_vacuum_threshold (50) + autovacuum_vacuum_scale_factor (0.2) × reltuples</code>; these can be set per table.</p>
<p><b>HOT updates</b> (heap-only tuples): if an UPDATE changes no indexed column and the new version fits on the same page, PostgreSQL chains it from the old tuple and adds <b>no index entries</b>. Lowering <code>fillfactor</code> leaves room for this. InnoDB updates secondary indexes only when their columns change (delete-mark + insert), because secondary entries point at the primary key, not at a physical location.</p>`,
    deepDive: `<p><b>Freezing and wraparound.</b> PostgreSQL xids are 32 bits and compared modulo 2<sup>32</sup>, so a tuple older than about 2 billion transactions would suddenly look "in the future". VACUUM therefore <b>freezes</b> old tuples (marks them visible to everyone). Autovacuum forces an anti-wraparound vacuum when a table's <code>relfrozenxid</code> age passes <code>autovacuum_freeze_max_age</code> (200 million by default), and if that cannot finish the server eventually refuses new xids. The visibility map tracks all-visible and all-frozen pages so vacuum can skip them, and all-visible pages are also what make <b>index-only scans</b> work.</p>
<p><b>PostgreSQL 17</b> replaced vacuum's dead-tuple array with a radix-tree TidStore: far less memory, and the old 1 GB cap on <code>maintenance_work_mem</code> use is gone. <b>InnoDB</b> has its own long-transaction trap: purge cannot advance past the oldest read view, so <code>SHOW ENGINE INNODB STATUS</code> shows a growing "History list length", and every consistent read of a hot row walks a longer undo chain.</p>`,
    aiEra: `<p><b>What AI changes:</b> an assistant will happily suggest "just run VACUUM FULL" for bloat or "increase innodb_purge_threads" for history-list growth. Both may be wrong: VACUUM FULL rewrites the table under an ACCESS EXCLUSIVE lock (an outage on a busy table; pg_repack is the online option), and purge lag is usually caused by one forgotten transaction, not too few threads. Your value is asking "what is holding the horizon back?" — an idle-in-transaction session, a replication slot, a 6-hour report — and checking <code>pg_stat_activity.backend_xmin</code> or <code>information_schema.innodb_trx</code> before touching settings.</p>`,
    clues: [
      '"table keeps growing although row count is flat" (PostgreSQL) → dead tuples not vacuumed; look for long transactions or slots holding the xmin horizon',
      '"history list length is in the millions" (MySQL) → purge blocked by an old read view; find the oldest transaction in innodb_trx',
      '"ROLLBACK of a huge batch takes forever" → InnoDB applies undo row by row; PostgreSQL just marks the xid aborted',
      '"updates on a table with 12 indexes are slow" → PostgreSQL non-HOT updates insert into every index; check n_tup_hot_upd and fillfactor',
      '"autovacuum never runs on our billion-row table" → the 20% scale factor is huge; set a per-table scale factor or threshold',
      '"database refuses writes: wraparound" → freezing fell behind; manual VACUUM (FREEZE) of the oldest tables'
    ],
    code: [
      lab(`-- What the CURRENT snapshot sees: creator committed, and deleter not committed (or none).
SELECT t.ctid, t.id, t.status
FROM pg_tuples t
JOIN clog c ON c.xid = t.xmin AND c.state = 'committed'
LEFT JOIN clog d ON d.xid = t.xmax
WHERE t.xmax = 0 OR d.state <> 'committed'
ORDER BY t.id;`, 'Visible tuples right now (▶ Run)'),
      lab(`-- Dead tuples per logical row: this is the "bloat" VACUUM exists to clean.
SELECT t.id,
       COUNT(*) AS versions_on_heap,
       SUM(CASE WHEN c.state = 'aborted' OR d.state = 'committed' THEN 1 ELSE 0 END) AS dead
FROM pg_tuples t
JOIN clog c ON c.xid = t.xmin
LEFT JOIN clog d ON d.xid = t.xmax
GROUP BY t.id ORDER BY t.id;`, 'Versions per row (▶ Run)'),
      pg(`-- PostgreSQL: watch dead tuples and the horizon
SELECT relname, n_live_tup, n_dead_tup, last_autovacuum, n_tup_upd, n_tup_hot_upd
FROM pg_stat_user_tables ORDER BY n_dead_tup DESC LIMIT 10;

SELECT pid, state, xact_start, backend_xmin
FROM pg_stat_activity WHERE backend_xmin IS NOT NULL ORDER BY age(backend_xmin) DESC;

ALTER TABLE events SET (autovacuum_vacuum_scale_factor = 0.01, autovacuum_vacuum_threshold = 1000);
ALTER TABLE orders SET (fillfactor = 85);      -- leave room on each page for HOT updates
VACUUM (VERBOSE) orders;`, 'PostgreSQL monitoring'),
      my(`-- MySQL: watch purge lag and the oldest transaction
SHOW ENGINE INNODB STATUS\\G          -- see "History list length"
SELECT count FROM information_schema.innodb_metrics WHERE name = 'trx_rseg_history_len';
SELECT trx_id, trx_started, trx_mysql_thread_id, trx_rows_modified
FROM information_schema.innodb_trx ORDER BY trx_started LIMIT 5;`, 'MySQL monitoring')
    ],
    codeTitle: ['Visible now', 'Versions per row', 'PostgreSQL', 'MySQL'],
    viz: {
      title: 'One UPDATE, two engines: where does the old version go?',
      input: 'postgres',
      inputLabel: 'engine: postgres | mysql',
      gen: function (input) {
        var e = pick(input, ['postgres', 'mysql'], 'postgres'), f = [];
        if (e === 'postgres') {
          var cols = ['ctid', 'status', 'xmin', 'xmax'];
          f.push({ narr: 'PostgreSQL heap page for order 1. One tuple, created by xid 100, never deleted (<code>xmax = 0</code>).', parts: [tbl('heap page 0', cols, [['(0,1)', 'new', '100', '0']]), vars('index on id', { 'id=1': '→ (0,1)' })] });
          f.push({ narr: 'xid 101 runs <code>UPDATE … SET status = \'paid\'</code>. PostgreSQL does <b>not</b> overwrite: it writes a <b>new tuple</b> (0,2) and stamps the old one with <code>xmax = 101</code>.', parts: [tbl('heap page 0', cols, [['(0,1)', 'new', '100', '101'], ['(0,2)', 'paid', '101', '0']], { 0: 'bad', 1: 'cur' }), vars('index on id', { 'id=1': '→ (0,1) → HOT chain → (0,2)' }, { 'id=1': 'cur' })] });
          f.push({ narr: 'No indexed column changed and the page had room, so this is a <b>HOT update</b>: the index still points at (0,1) and follows the chain. A reader whose snapshot predates 101 still sees "new".', parts: [tbl('heap page 0', cols, [['(0,1)', 'new', '100', '101'], ['(0,2)', 'paid', '101', '0']], { 0: 'sel', 1: 'ok' }), vars('readers', { 'old snapshot': 'new', 'new snapshot': 'paid' })] });
          f.push({ narr: 'xid 101 commits. Once no snapshot older than 101 exists, (0,1) is <b>dead</b>. It still takes space on the page: this is bloat.', parts: [tbl('heap page 0', cols, [['(0,1)', 'new', '100', '101'], ['(0,2)', 'paid', '101', '0']], { 0: 'bad' }), vars('pg_stat_user_tables', { n_live_tup: 1, n_dead_tup: 1 }, { n_dead_tup: 'bad' })] });
          f.push({ narr: '<b>Autovacuum</b> (or HOT pruning during a later read) removes (0,1) and marks the space free for the next insert or update on this page. The file does not shrink.', parts: [tbl('heap page 0', cols, [['(0,1)', '(free)', '', ''], ['(0,2)', 'paid', '101', '0']], { 0: 'ok' }), vars('pg_stat_user_tables', { n_live_tup: 1, n_dead_tup: 0 }, { n_dead_tup: 'ok' })] });
        } else {
          var c2 = ['PK id', 'status', 'DB_TRX_ID', 'DB_ROLL_PTR'];
          f.push({ narr: 'InnoDB clustered index leaf for order 1: the row itself, with hidden columns <code>DB_TRX_ID = 10</code> and no roll pointer.', parts: [tbl('clustered index (PRIMARY)', c2, [['1', 'new', '10', '—']]), { type: 'stack', label: 'undo log', items: [] }] });
          f.push({ narr: 'trx 20 runs the UPDATE. InnoDB first copies the <b>old values</b> into an undo record, then <b>overwrites the row in place</b> and points <code>DB_ROLL_PTR</code> at the undo record.', parts: [tbl('clustered index (PRIMARY)', c2, [['1', 'paid', '20', '→ undo#2']], { 0: 'cur' }), { type: 'stack', label: 'undo log', items: ['#2: status=new, trx=10'], hl: { 0: 'cur' } }] });
          f.push({ narr: 'A reader whose read view cannot see trx 20 follows the roll pointer into undo and rebuilds "new". The table itself never holds two copies.', parts: [tbl('clustered index (PRIMARY)', c2, [['1', 'paid', '20', '→ undo#2']], { 0: 'sel' }), { type: 'stack', label: 'undo log', items: ['#2: status=new, trx=10'], hl: { 0: 'sel' } }, vars('readers', { 'old read view': 'new (from undo)', 'new read view': 'paid' })] });
          f.push({ narr: 'trx 30 updates again: another undo record, chained. Long-lived read views make these chains long — the <b>history list</b> grows.', parts: [tbl('clustered index (PRIMARY)', c2, [['1', 'shipped', '30', '→ undo#3']], { 0: 'cur' }), { type: 'stack', label: 'undo log', items: ['#2: status=new, trx=10', '#3: status=paid, trx=20 → #2'], hl: { 1: 'cur' } }, vars('history list length', { length: 2 }, { length: 'bad' })] });
          f.push({ narr: 'When the oldest read view is newer than trx 30, <b>purge</b> discards both undo records. ROLLBACK would have needed them; commit just leaves them for purge.', parts: [tbl('clustered index (PRIMARY)', c2, [['1', 'shipped', '30', '—']], { 0: 'ok' }), { type: 'stack', label: 'undo log', items: [] }, vars('history list length', { length: 0 }, { length: 'ok' })] });
        }
        return f;
      }
    },
    examples: [
      { title: 'The forgotten BEGIN in a psql window', html: `<p>A developer opened <code>BEGIN; SELECT …</code> in psql on Friday and went home. Its snapshot pins the xmin horizon, so autovacuum runs all weekend but removes <b>nothing</b> on busy tables: "found 2,000,000 dead row versions that cannot be removed yet". Fix: <code>idle_in_transaction_session_timeout</code> and an alert on <code>age(backend_xmin)</code>. In MySQL the identical mistake shows as a growing history list length.</p>`, code: lab(`-- Which tuples could vacuum remove if the oldest snapshot is xid 102 (the report's backend_xmin)?
-- A dead tuple is removable only if its deleter committed BEFORE every live snapshot started.
SELECT t.ctid, t.xmax,
       CASE WHEN t.xmax < (SELECT MIN(backend_xmin) FROM backends) THEN 'removable' ELSE 'kept for the report' END AS fate
FROM pg_tuples t JOIN clog d ON d.xid = t.xmax AND d.state = 'committed'
ORDER BY t.ctid;`, 'Horizon pins dead tuples (▶ Run)') },
      { title: 'Huge DELETE then ROLLBACK', html: `<p>Deleting 50 million rows and then rolling back: in PostgreSQL the DELETE only set <code>xmax</code>; the rollback is instant (the xid is marked aborted) and the tuples simply stay alive. In InnoDB every row was delete-marked with an undo record, and rollback must <b>undo all 50 million</b>, often taking longer than the delete itself — and crash recovery has to finish it too. Batch big deletes in both engines.</p>` },
      { title: 'Why the Uber 2016 post mentioned write amplification', html: `<p>Uber moved from PostgreSQL to MySQL partly because each non-HOT update in PostgreSQL inserts a new entry into <b>every</b> index of the table (the new tuple has a new ctid), while InnoDB secondary indexes point at the primary key and only change when their own columns change. Since then PostgreSQL has improved (HOT pruning, index deduplication in 13, bottom-up index deletion in 14), but the shape of the trade-off remains a classic interview point.</p>` }
    ],
    problems: [{
      title: 'What Can VACUUM Reclaim?',
      level: 'Easy', tags: ['mvcc', 'vacuum', 'postgresql'], companies: ['Instacart', 'Heroku', 'Supabase'],
      statement: `<p>The <code>pg_tuples</code> table is a copy of a PostgreSQL heap: each row is one physical tuple with <code>xmin</code> (creator) and <code>xmax</code> (deleter, 0 = none). <code>clog</code> gives each xid's state. Assuming <b>no old snapshots</b> are open, list every tuple VACUUM may remove, with the reason: <code>'aborted insert'</code> when its creator aborted, else <code>'committed delete/update'</code> when its deleter committed. Order by <code>ctid</code>.</p>`,
      constraints: `<p>Columns: <code>ctid, reason</code>. A tuple whose deleter aborted or is still running is <b>not</b> dead. Use the <code>lab</code> database.</p>`,
      example: `<p>(0,1) was replaced by committed xid 101 → ${H.c('g', "('(0,1)', 'committed delete/update')")}. (0,4) was deleted by xid 102, which aborted → still alive, not listed. (0,5) was created by 102 → ${H.c('g', "'aborted insert'")}.</p>`,
      brute: { why: `<p>Counting only <code>xmax &lt;&gt; 0</code> marks (0,4) and (0,6) as dead even though their deleters aborted or are still running, and misses (0,5), a tuple with <code>xmax = 0</code> whose creator aborted. Visibility always needs the commit log, never the raw header alone.</p>`, code: lab(`-- WRONG: treats every tuple with an xmax as dead
SELECT ctid FROM pg_tuples WHERE xmax <> 0 ORDER BY ctid;`, 'Naive: xmax set means dead') },
      mcq: { q: 'A tuple has xmax = 104 and xid 104 is still in progress. For VACUUM it is…', options: ['dead — xmax is set', 'live — the deleter has not committed', 'removable only by VACUUM FULL', 'frozen'], answer: 1, explain: 'Until the deleting transaction commits, the old version is still the visible one and must stay.' },
      hints: [
        `<p>Hint 1: Join each tuple to <code>clog</code> twice: once on <code>xmin</code> (who created it) and once on <code>xmax</code> (who deleted it). Use a LEFT JOIN for xmax, because 0 means "no deleter".</p>`,
        `<p>Hint 2: Two independent reasons make a tuple dead: creator state is 'aborted', or deleter state is 'committed'. Check the aborted creator first.</p>`,
        `<p>Hint 3: A <code>CASE</code> picks the reason; a <code>WHERE</code> with <code>OR</code> keeps only dead tuples; <code>ORDER BY ctid</code>.</p>`
      ],
      tests: { engine: 'sqlite', cmp: 'exact', cases: [
        { cols: ['ctid', 'reason'], rows: [['(0,1)', 'committed delete/update'], ['(0,2)', 'committed delete/update'], ['(0,5)', 'aborted insert'], ['(0,8)', 'committed delete/update']] },
        { setup: "UPDATE clog SET state = 'committed' WHERE xid = 104", rows: [['(0,1)', 'committed delete/update'], ['(0,2)', 'committed delete/update'], ['(0,5)', 'aborted insert'], ['(0,6)', 'committed delete/update'], ['(0,8)', 'committed delete/update']] },
        { setup: "UPDATE clog SET state = 'aborted' WHERE xid = 104", rows: [['(0,1)', 'committed delete/update'], ['(0,2)', 'committed delete/update'], ['(0,5)', 'aborted insert'], ['(0,7)', 'aborted insert'], ['(0,8)', 'committed delete/update']] },
        { setup: "UPDATE clog SET state = 'committed' WHERE xid = 102", rows: [['(0,1)', 'committed delete/update'], ['(0,2)', 'committed delete/update'], ['(0,4)', 'committed delete/update'], ['(0,8)', 'committed delete/update']] },
        { setup: "UPDATE clog SET state = 'aborted' WHERE xid = 101", rows: [['(0,2)', 'aborted insert'], ['(0,5)', 'aborted insert'], ['(0,6)', 'aborted insert'], ['(0,8)', 'committed delete/update']] },
        { setup: "INSERT INTO pg_tuples VALUES ('(0,9)', 5, 'new', 105, 0)", rows: [['(0,1)', 'committed delete/update'], ['(0,2)', 'committed delete/update'], ['(0,5)', 'aborted insert'], ['(0,8)', 'committed delete/update']] }
      ] },
      solution: {
        approach: `<p>Look up the creator and deleter states in the commit log. Aborted creator → garbage from a rolled-back insert/update. Committed deleter → an old version (or a deleted row) that no snapshot can need, since none are open. Everything else is live or still in doubt.</p>`,
        code: lab(`SELECT t.ctid,
       CASE WHEN c.state = 'aborted' THEN 'aborted insert'
            ELSE 'committed delete/update' END AS reason
FROM pg_tuples t
JOIN clog c ON c.xid = t.xmin
LEFT JOIN clog d ON d.xid = t.xmax
WHERE c.state = 'aborted' OR d.state = 'committed'
ORDER BY t.ctid;`, 'Dead tuples (▶ Run)'),
        complexity: `<p>One pass over the tuples with two primary-key lookups each: O(n log n) here. Real VACUUM scans only pages the visibility map does not mark all-visible, and checks xids against one precomputed horizon.</p>`,
        followUps: ['How would the answer change if a session with backend_xmin = 102 were open?', 'Why does InnoDB not need this step for rolled-back inserts?']
      }
    }]
  });

  /* =====================================================================
     TOPIC 2 — Clustered InnoDB primary keys vs PostgreSQL heap tables
     ===================================================================== */
  topics.push({
    title: 'Storage Layout: InnoDB Clustered Primary Keys vs PostgreSQL Heap Tables',
    analogy: `<p><b>InnoDB is a phone book</b>: the entries <i>are</i> sorted by name (the primary key). Finding "everyone from Sharma to Singh" is one continuous read. A second index — say by city — is a separate list that says "Pune: see <b>Sharma, Asha</b>", so you look the name up in the phone book afterwards.</p>
<p><b>PostgreSQL is a warehouse with numbered shelves</b>: boxes are placed wherever there is space (the heap). Every index, including the primary key, is a catalogue card saying "shelf 42, slot 7". Every index is equal; none decides where the boxes physically sit.</p>`,
    explain: `<p>In <b>InnoDB</b> the table <b>is</b> a B+tree ordered by the primary key (the <b>clustered index</b>); the leaf pages hold the full rows. Every <b>secondary index</b> leaf stores <code>(indexed columns, primary-key columns)</code>. A lookup through a secondary index is therefore <b>two B-tree descents</b>: secondary index → PK value → clustered index → row (unless the secondary index covers the query).</p>
<p>If you define no primary key, InnoDB uses the first <code>UNIQUE NOT NULL</code> index, else a hidden 6-byte <code>DB_ROW_ID</code> (MySQL 8.0.30+ can instead generate an invisible primary-key column <code>my_row_id</code> when <code>sql_generate_invisible_primary_key</code> is on).</p>
<p>In <b>PostgreSQL</b> the table is an unordered <b>heap</b> of 8 kB pages. Every index, primary key included, stores <code>(key, ctid)</code> where the ctid is a 6-byte (block, offset) address. A lookup is one index descent + one heap fetch. <code>CLUSTER</code> reorders the heap once but is not maintained.</p>
${H.table(['Consequence', 'InnoDB (clustered)', 'PostgreSQL (heap)'], [
  ['PK range scan (<code>WHERE id BETWEEN …</code>)', 'sequential leaf pages — excellent', 'rows may be scattered across the heap'],
  ['Wide primary key', 'copied into <b>every</b> secondary index', 'only in the PK index; others store 6-byte ctids'],
  ['Random PK (UUIDv4)', 'inserts land on random pages → page splits, poor buffer locality', 'heap appends anyway; only the PK index suffers'],
  ['Row moves (update)', 'secondary indexes unaffected (they hold the PK)', 'new ctid → new entries in every index unless HOT'],
  ['Index-only scan', 'secondary index covering the query, using the PK columns for free', 'needs the visibility map page to be all-visible']
])}
<p>Rule of thumb for InnoDB: use a <b>short, monotonically increasing</b> primary key (<code>BIGINT AUTO_INCREMENT</code> or a time-ordered UUIDv7 stored as <code>BINARY(16)</code>). In PostgreSQL the PK choice matters less for the table, but random UUIDs still scatter the PK index.</p>`,
    deepDive: `<p><b>Page details.</b> InnoDB pages default to 16 kB (<code>innodb_page_size</code>) and leave about 1/16 free on sequential inserts; random inserts split pages to roughly half full. PostgreSQL pages are 8 kB, rows wider than about 2 kB are compressed or moved out-of-line by <b>TOAST</b>, and InnoDB similarly stores long BLOB/TEXT values off-page (DYNAMIC row format).</p>
<p><b>Covering indexes differ.</b> In InnoDB every secondary index silently includes the PK columns, so <code>INDEX(customer_id)</code> covers <code>SELECT id FROM orders WHERE customer_id = ?</code>. PostgreSQL offers <code>INCLUDE (…)</code> columns (since 11) to make an index covering without making them part of the key, but an index-only scan still checks the visibility map and falls back to the heap for pages modified since the last vacuum — the "Heap Fetches" line in EXPLAIN ANALYZE.</p>`,
    aiEra: `<p><b>What AI changes:</b> generated schemas love <code>id UUID PRIMARY KEY DEFAULT gen_random_uuid()</code> because it is portable and safe for distributed IDs. Pasted into MySQL as <code>CHAR(36)</code>, that becomes a 36-byte random clustered key copied into every secondary index — slow inserts and huge indexes. Reviewers who know the storage layout catch this at schema-review time and ask for <code>BIGINT</code> or UUIDv7 as <code>BINARY(16)</code> (or <code>UUID_TO_BIN(uuid, 1)</code> for v1 UUIDs). Ask the model "which engine, and is this a clustered key?" — it will rarely raise it unprompted.</p>`,
    clues: [
      '"secondary index in MySQL is much bigger than expected" → it stores the full primary key in every entry; check PK width',
      '"inserts slowed down as the table grew, PK is a UUID" (InnoDB) → random clustered inserts cause page splits and cache misses',
      '"range query by PK is fast in MySQL but slow in Postgres" → clustered leaf order vs scattered heap; consider CLUSTER or a BRIN index on correlated data',
      '"table has no primary key" (MySQL) → hidden DB_ROW_ID or GIPK; replication and tooling suffer — always declare one',
      '"index-only scan still shows heap fetches" (PostgreSQL) → visibility map not up to date; vacuum more often',
      '"covering index" → InnoDB includes PK columns automatically; PostgreSQL uses INCLUDE columns'
    ],
    code: [
      lab(`-- Bytes per secondary-index entry, ignoring page overhead:
--   InnoDB:     indexed key + full primary key
--   PostgreSQL: indexed key + 6-byte ctid
SELECT i.table_name, i.index_name, i.key_bytes, t.pk_bytes,
       i.key_bytes + t.pk_bytes AS innodb_entry, i.key_bytes + 6 AS postgres_entry
FROM index_defs i JOIN table_defs t USING (table_name)
WHERE i.is_primary = 0
ORDER BY i.table_name, i.index_name;`, 'Entry sizes per engine (▶ Run)'),
      my(`-- MySQL: a lookup by a secondary index = two B-tree searches unless covered
CREATE TABLE orders (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,   -- short, increasing: appends at the right edge
  customer_id BIGINT UNSIGNED NOT NULL,
  email       VARCHAR(255) NOT NULL,
  KEY idx_customer (customer_id)              -- leaf entries are (customer_id, id)
) ENGINE=InnoDB;
EXPLAIN SELECT id FROM orders WHERE customer_id = 7;   -- Extra: Using index (covered by the hidden PK column)`, 'InnoDB clustered table'),
      pg(`-- PostgreSQL: every index points at a ctid in the heap
CREATE TABLE orders (id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, customer_id bigint NOT NULL, email text NOT NULL);
CREATE INDEX idx_customer ON orders (customer_id) INCLUDE (email);   -- covering without widening the key
SELECT ctid, id FROM orders LIMIT 3;          -- (0,1), (0,2) … physical addresses
CLUSTER orders USING orders_pkey;              -- one-time physical reorder (ACCESS EXCLUSIVE lock), not maintained`, 'PostgreSQL heap table')
    ],
    codeTitle: ['Entry sizes', 'InnoDB', 'PostgreSQL'],
    viz: {
      title: 'Find order by customer_id = 7',
      input: 'mysql',
      inputLabel: 'engine: mysql | postgres',
      gen: function (input) {
        var e = pick(input, ['mysql', 'postgres'], 'mysql'), f = [];
        if (e === 'mysql') {
          f.push({ narr: 'Query: <code>SELECT * FROM orders WHERE customer_id = 7</code>. InnoDB has a secondary index <code>idx_customer</code> whose leaves hold <b>(customer_id, id)</b>.', parts: [tbl('idx_customer leaf', ['customer_id', 'PK id'], [['5', '91'], ['7', '12'], ['7', '640'], ['9', '3']]), tbl('PRIMARY (clustered) leaves', ['id', 'row'], [['3', '…'], ['12', '…'], ['91', '…'], ['640', '…']])] });
          f.push({ narr: 'Step 1: descend <code>idx_customer</code> to the first entry with customer_id 7. It holds <b>PK 12</b>, not a disk address.', parts: [tbl('idx_customer leaf', ['customer_id', 'PK id'], [['5', '91'], ['7', '12'], ['7', '640'], ['9', '3']], { 1: 'cur' }), vars('lookups', { secondary: 1, clustered: 0 })] });
          f.push({ narr: 'Step 2: descend the <b>clustered index</b> by PK 12 to reach the full row. This second B-tree search per match is the "double lookup".', parts: [tbl('PRIMARY (clustered) leaves', ['id', 'row'], [['3', '…'], ['12', 'customer 7, paid, …'], ['91', '…'], ['640', '…']], { 1: 'ok' }), vars('lookups', { secondary: 1, clustered: 1 }, { clustered: 'cur' })] });
          f.push({ narr: 'Next entry: (7, 640) → another clustered descent. If the query only needed <code>id</code>, the secondary index alone would answer it (<b>Using index</b>).', parts: [tbl('idx_customer leaf', ['customer_id', 'PK id'], [['5', '91'], ['7', '12'], ['7', '640'], ['9', '3']], { 1: 'done', 2: 'cur' }), tbl('PRIMARY (clustered) leaves', ['id', 'row'], [['3', '…'], ['12', '…'], ['91', '…'], ['640', 'customer 7, new, …']], { 3: 'ok' }), vars('lookups', { secondary: 2, clustered: 2 })] });
          f.push({ narr: 'Benefit: when row 12 is updated and moves within the clustered tree, <code>idx_customer</code> does not change — it stores the PK, not a location. Cost: a 36-byte UUID PK would be stored in every secondary entry.', parts: [txt('<p>Secondary entry = key + <b>PK</b>. Short PK ⇒ small indexes.</p>')] });
        } else {
          f.push({ narr: 'PostgreSQL: the heap holds rows wherever there was space. <code>idx_customer</code> leaves hold <b>(customer_id, ctid)</b>.', parts: [tbl('idx_customer leaf', ['customer_id', 'ctid'], [['5', '(3,2)'], ['7', '(0,4)'], ['7', '(9,1)'], ['9', '(1,1)']]), tbl('heap pages', ['ctid', 'row'], [['(0,4)', '…'], ['(1,1)', '…'], ['(3,2)', '…'], ['(9,1)', '…']])] });
          f.push({ narr: 'Step 1: one index descent finds (7, <b>(0,4)</b>) — a direct physical address: block 0, slot 4.', parts: [tbl('idx_customer leaf', ['customer_id', 'ctid'], [['5', '(3,2)'], ['7', '(0,4)'], ['7', '(9,1)'], ['9', '(1,1)']], { 1: 'cur' }), vars('work', { index_descents: 1, heap_fetches: 0 })] });
          f.push({ narr: 'Step 2: fetch block 0 of the heap and read slot 4 — no second tree. Then check visibility (xmin/xmax) for our snapshot.', parts: [tbl('heap pages', ['ctid', 'row'], [['(0,4)', 'customer 7, paid'], ['(1,1)', '…'], ['(3,2)', '…'], ['(9,1)', '…']], { 0: 'ok' }), vars('work', { index_descents: 1, heap_fetches: 1 }, { heap_fetches: 'cur' })] });
          f.push({ narr: 'Second match is on block 9 — a different page. Rows with the same customer are scattered, so many matches mean many random page reads; the planner may switch to a <b>bitmap heap scan</b> to read pages in order.', parts: [tbl('heap pages', ['ctid', 'row'], [['(0,4)', '…'], ['(1,1)', '…'], ['(3,2)', '…'], ['(9,1)', 'customer 7, new']], { 3: 'ok' }), vars('work', { index_descents: 1, heap_fetches: 2 })] });
          f.push({ narr: 'Cost: if row (0,4) is updated without HOT, the new version gets a new ctid and <b>every</b> index needs a new entry. Benefit: index entries stay small (6-byte pointer).', parts: [txt('<p>Index entry = key + <b>ctid</b>. Updates may touch every index.</p>')] });
        }
        return f;
      }
    },
    examples: [
      { title: 'Choosing a primary key for a MySQL events table', html: `<p>200 million rows, 5 secondary indexes, inserts at 5k/s. With <code>CHAR(36)</code> UUIDv4: each secondary entry carries 36 extra bytes (≈ 36 GB across 5 indexes) and inserts hit random leaf pages. With <code>BIGINT AUTO_INCREMENT</code>: 8 bytes and right-edge appends. If IDs must be generated by clients, use UUIDv7 in <code>BINARY(16)</code>: time-ordered, 16 bytes.</p>`, code: lab(`SELECT t.table_name, i.index_name,
       t.row_count * (i.key_bytes + t.pk_bytes) AS innodb_leaf_bytes,
       t.row_count * (i.key_bytes + 6)          AS postgres_leaf_bytes
FROM index_defs i JOIN table_defs t USING (table_name)
WHERE i.is_primary = 0 AND t.table_name = 'events';`, 'events: UUID PK cost (▶ Run)') },
      { title: 'Time-range queries on an append-only table', html: `<p><code>WHERE created_at &gt;= now() - interval '1 day'</code> on a log table. In InnoDB with an auto-increment PK the newest rows are physically together, and a secondary index on <code>created_at</code> leads to clustered lookups in nearby pages. In PostgreSQL the heap is also roughly in insert order, so a tiny <b>BRIN</b> index on <code>created_at</code> works well — the next topic covers it.</p>` },
      { title: 'Tables without a primary key', html: `<p>MySQL row-based replication applies each row change on the replica by finding the row; with no PK or unique key that is a full table scan per row — replicas fall hours behind after one big UPDATE. PostgreSQL logical replication refuses UPDATE/DELETE on a published table without a <b>replica identity</b> (PK, a unique index, or <code>REPLICA IDENTITY FULL</code>). In both engines: always declare a primary key.</p>` }
    ],
    problems: [{
      title: 'Secondary Index Footprint: InnoDB vs PostgreSQL',
      level: 'Medium', tags: ['clustered index', 'storage', 'capacity'], companies: ['Shopify', 'GitHub', 'Flipkart'],
      statement: `<p>Using <code>table_defs</code> (row counts and primary-key width) and <code>index_defs</code>, estimate the leaf bytes of every <b>secondary</b> index (<code>is_primary = 0</code>) in both engines. InnoDB entry = key bytes + PK bytes; PostgreSQL entry = key bytes + 6 (ctid). Return <code>table_name, index_name, innodb_bytes, postgres_bytes</code> ordered by <code>table_name, index_name</code>.</p>`,
      constraints: `<p>Ignore page headers, fill factor and tuple headers. Integer arithmetic. <code>lab</code> database.</p>`,
      example: `<p><code>idx_events_user</code>: 2,000,000 × (8 + 16) = ${H.c('g', '48,000,000')} in InnoDB vs 2,000,000 × (8 + 6) = ${H.c('g', '28,000,000')} in PostgreSQL.</p>`,
      brute: { why: `<p>Multiplying rows by key bytes alone ignores the hidden pointer in each entry: it under-states InnoDB indexes badly when the primary key is wide, which is exactly the case the comparison is about.</p>`, code: lab(`SELECT i.index_name, t.row_count * i.key_bytes AS bytes
FROM index_defs i JOIN table_defs t USING (table_name) WHERE i.is_primary = 0;`, 'Naive: key bytes only') },
      mcq: { q: 'What does an InnoDB secondary-index leaf entry point to?', options: ['A (page, slot) address in the heap', 'The primary-key value of the row', 'The undo log record', 'Nothing — it stores the whole row'], answer: 1, explain: 'InnoDB secondary indexes store the PK; the row is then found by searching the clustered index.' },
      hints: [
        `<p>Hint 1: Join <code>index_defs</code> to <code>table_defs</code> on <code>table_name</code> to get row counts and PK width per index.</p>`,
        `<p>Hint 2: Filter out the primary-key indexes themselves with <code>is_primary = 0</code>.</p>`,
        `<p>Hint 3: Two expressions: <code>row_count * (key_bytes + pk_bytes)</code> and <code>row_count * (key_bytes + 6)</code>.</p>`
      ],
      tests: { engine: 'sqlite', cmp: 'exact', cases: [
        { cols: ['table_name', 'index_name', 'innodb_bytes', 'postgres_bytes'], rows: [['events', 'idx_events_user', 48000000, 28000000], ['orders', 'idx_orders_customer', 16000000, 14000000], ['orders', 'idx_orders_email', 40000000, 38000000], ['users', 'idx_users_email', 1600000, 1500000]] },
        { setup: "UPDATE table_defs SET pk_bytes = 36 WHERE table_name = 'events'", rows: [['events', 'idx_events_user', 88000000, 28000000], ['orders', 'idx_orders_customer', 16000000, 14000000], ['orders', 'idx_orders_email', 40000000, 38000000], ['users', 'idx_users_email', 1600000, 1500000]] },
        { setup: "INSERT INTO index_defs VALUES ('users', 'idx_users_name', 20, 0)", rows: [['events', 'idx_events_user', 48000000, 28000000], ['orders', 'idx_orders_customer', 16000000, 14000000], ['orders', 'idx_orders_email', 40000000, 38000000], ['users', 'idx_users_email', 1600000, 1500000], ['users', 'idx_users_name', 1400000, 1300000]] },
        { setup: "DELETE FROM index_defs WHERE table_name = 'orders' AND is_primary = 0", rows: [['events', 'idx_events_user', 48000000, 28000000], ['users', 'idx_users_email', 1600000, 1500000]] },
        { setup: "UPDATE table_defs SET row_count = 10 WHERE table_name = 'users'", rows: [['events', 'idx_events_user', 48000000, 28000000], ['orders', 'idx_orders_customer', 16000000, 14000000], ['orders', 'idx_orders_email', 40000000, 38000000], ['users', 'idx_users_email', 320, 300]] },
        { setup: "UPDATE index_defs SET is_primary = 1 WHERE index_name = 'idx_orders_email'", rows: [['events', 'idx_events_user', 48000000, 28000000], ['orders', 'idx_orders_customer', 16000000, 14000000], ['users', 'idx_users_email', 1600000, 1500000]] }
      ] },
      solution: {
        approach: `<p>Per secondary index, the per-entry pointer is what differs: the full PK in InnoDB, a fixed 6-byte ctid in PostgreSQL. Multiply by the row count of the owning table.</p>`,
        code: lab(`SELECT i.table_name, i.index_name,
       t.row_count * (i.key_bytes + t.pk_bytes) AS innodb_bytes,
       t.row_count * (i.key_bytes + 6)          AS postgres_bytes
FROM index_defs i
JOIN table_defs t ON t.table_name = i.table_name
WHERE i.is_primary = 0
ORDER BY i.table_name, i.index_name;`, 'Footprint per engine (▶ Run)'),
        complexity: `<p>O(I) over the index catalog. In real life read sizes from <code>pg_relation_size</code> or <code>information_schema.INNODB_TABLESTATS</code> / <code>mysql.innodb_index_stats</code> (<code>size</code> in pages).</p>`,
        followUps: ['How would UUIDv7 in BINARY(16) change the events numbers?', 'Why does PostgreSQL 13 B-tree deduplication shrink idx_orders_customer?']
      }
    }]
  });

  /* =====================================================================
     TOPIC 3 — Index types
     ===================================================================== */
  topics.push({
    title: 'Index Types: B-tree, Hash, GIN, GiST, BRIN, Partial and Expression Indexes',
    analogy: `<p>A library has more than one kind of catalogue. The <b>alphabetical card drawer</b> (B-tree) answers "exact title" and "titles from M to P". A <b>subject index at the back of every book</b> (GIN) answers "which books mention <i>dragons</i>?" — one word, many books. A <b>map with regions</b> (GiST) answers "what is near here / overlaps this area?". A <b>sign on each aisle</b> saying "books from 1990–1995" (BRIN) is tiny and good enough when books were shelved in date order. And a <b>"new arrivals only" list</b> (partial index) is small because it skips everything else.</p>`,
    explain: `<p>Both engines default to B-tree (InnoDB: B+tree). Beyond that, PostgreSQL has a much wider toolbox.</p>
${H.table(['Index', 'PostgreSQL 16/17', 'MySQL 8.x InnoDB', 'Use it for'], [
  ['B-tree', 'default; equality, ranges, ORDER BY, <code>INCLUDE</code> columns', 'default (clustered + secondary)', 'almost everything'],
  ['Hash', '<code>USING hash</code>, WAL-logged since 10; equality only', '<code>USING HASH</code> is accepted but silently becomes B-tree; InnoDB has an internal <i>adaptive</i> hash index', 'rarely worth it'],
  ['GIN', 'inverted index: <code>jsonb</code>, arrays, full-text <code>tsvector</code>, <code>pg_trgm</code> LIKE \'%x%\'', 'no; FULLTEXT indexes and multi-valued JSON indexes cover some cases', '"which rows contain this element/word?"'],
  ['GiST / SP-GiST', 'geometry (PostGIS), ranges, nearest-neighbour (<code>ORDER BY loc &lt;-&gt; point</code>), exclusion constraints', 'SPATIAL (R-tree) indexes for geometry only', 'overlap, containment, distance'],
  ['BRIN', 'min/max per block range; a few kB for a TB-sized table', 'no', 'huge append-only tables where the column follows physical order (timestamps)'],
  ['Partial', '<code>CREATE INDEX … WHERE status = \'pending\'</code>', '<b>not supported</b>', 'indexing a small hot subset; partial UNIQUE rules'],
  ['Expression', '<code>CREATE INDEX … (lower(email))</code>', 'functional key parts since 8.0.13: <code>INDEX ((lower(email)))</code>, stored as a hidden virtual generated column', 'queries that filter on a function of a column']
])}
<p><b>The planner only uses an expression or partial index when the query matches it</b>: <code>WHERE lower(email) = ?</code> for an index on <code>lower(email)</code>; and the query's WHERE must imply the index predicate (<code>status = 'pending'</code>). SQLite follows the same rules, so the lab can prove it with <code>EXPLAIN QUERY PLAN</code>.</p>
<p>MySQL extras worth naming: <b>invisible indexes</b> (test dropping one safely), <b>descending indexes</b> (8.0), <b>multi-valued indexes</b> on JSON arrays (8.0.17), and index <b>skip scan</b> (8.0.13). PostgreSQL 16/17 B-trees have no skip scan (it arrives in 18), so column order in a multicolumn index matters more there.</p>`,
    deepDive: `<p><b>GIN internals and costs.</b> A GIN index maps each key (a word, an array element, a jsonb path/value) to a posting list of ctids. Inserting one row with 30 tags inserts 30 keys, so writes are expensive; GIN batches them in a <b>pending list</b> (<code>fastupdate</code>, flushed by vacuum or when <code>gin_pending_list_limit</code> fills), which makes searches scan the pending list too. For <code>jsonb</code> choose <code>jsonb_ops</code> (default: supports <code>?</code>, <code>?|</code>, <code>?&amp;</code>, <code>@&gt;</code>, jsonpath) or the smaller, faster <code>jsonb_path_ops</code> (only <code>@&gt;</code> and jsonpath).</p>
<p><b>BRIN</b> stores one summary per <code>pages_per_range</code> (128 pages by default). It only helps when values correlate with physical order — check <code>pg_stats.correlation</code> near ±1. Updates that scatter old timestamps across the table quietly ruin it. <b>Exclusion constraints</b> with GiST (<code>EXCLUDE USING gist (room WITH =, during WITH &amp;&amp;)</code>, needing <code>btree_gist</code>) enforce "no overlapping bookings" — something MySQL can only emulate with triggers or locking.</p>`,
    aiEra: `<p><b>What AI changes:</b> ask an assistant to "speed up this query" and it will usually propose a plain B-tree on the filtered column. It rarely proposes the shape that matches the engine: a partial index for a 1% hot subset in PostgreSQL, a GIN index with <code>jsonb_path_ops</code> for containment queries, a BRIN for a 2 TB log table, or a functional key part in MySQL with the exact same expression the ORM generates. It also invents unsupported syntax — <code>CREATE INDEX … WHERE</code> on MySQL is a frequent hallucination. Verify every index with EXPLAIN on the target engine and version.</p>`,
    clues: [
      '"search inside a JSON/array column" (PostgreSQL) → GIN on jsonb (jsonb_path_ops for @&gt; only); MySQL → multi-valued index or generated column',
      '"LIKE \'%term%\' is slow" → PostgreSQL pg_trgm + GIN/GiST; MySQL FULLTEXT or an external search engine',
      '"2 TB append-only table, queries by time range" → BRIN in PostgreSQL; partitioning by range in both',
      '"only 2% of rows are pending and we query only those" → partial index (PostgreSQL / SQLite); MySQL has none — composite index starting with status',
      '"case-insensitive email lookup" → expression index on lower(email) or a functional key part; or citext / a _ci collation',
      '"no two bookings may overlap" → GiST exclusion constraint in PostgreSQL'
    ],
    code: [
      lab(`-- SQLite supports partial and expression indexes with the same matching rules as PostgreSQL.
CREATE INDEX idx_pending_email ON orders (lower(email)) WHERE status = 'pending';

EXPLAIN QUERY PLAN
SELECT id FROM orders WHERE lower(email) = 'ben@x.io' AND status = 'pending';   -- uses the index

EXPLAIN QUERY PLAN
SELECT id FROM orders WHERE lower(email) = 'ben@x.io';                           -- cannot: might need non-pending rows`, 'Partial + expression index (▶ Run)'),
      pg(`-- PostgreSQL toolbox
CREATE INDEX idx_orders_pending ON orders (created_at) WHERE status = 'pending';     -- partial
CREATE INDEX idx_users_lower_email ON users (lower(email));                           -- expression
CREATE INDEX idx_orders_meta ON orders USING gin (meta jsonb_path_ops);               -- jsonb containment
CREATE INDEX idx_logs_time ON logs USING brin (logged_at) WITH (pages_per_range = 64); -- tiny, for append-only
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_products_name_trgm ON products USING gin (name gin_trgm_ops);        -- LIKE '%phone%'
CREATE EXTENSION IF NOT EXISTS btree_gist;
ALTER TABLE bookings ADD CONSTRAINT no_overlap EXCLUDE USING gist (room_id WITH =, during WITH &&);
CREATE INDEX CONCURRENTLY idx_orders_customer ON orders (customer_id);                -- no write lock while building`, 'PostgreSQL index types'),
      my(`-- MySQL 8.x equivalents and limits
ALTER TABLE users ADD INDEX idx_lower_email ((lower(email)));          -- functional key part (8.0.13+), note double parentheses
ALTER TABLE orders ADD INDEX idx_tags ((CAST(meta->'$.tags' AS CHAR(20) ARRAY)));   -- multi-valued (8.0.17+)
SELECT id FROM orders WHERE 'gift' MEMBER OF (meta->'$.tags');         -- can use idx_tags
ALTER TABLE products ADD FULLTEXT INDEX ft_name (name);
SELECT id FROM products WHERE MATCH(name) AGAINST ('phone');
ALTER TABLE orders ALTER INDEX idx_status INVISIBLE;                   -- test the impact of dropping it
-- No partial indexes: emulate with a composite index that starts with the filter column:
ALTER TABLE orders ADD INDEX idx_status_created (status, created_at);`, 'MySQL index options')
    ],
    codeTitle: ['Partial + expression (SQLite)', 'PostgreSQL', 'MySQL'],
    viz: {
      title: 'Which index answers which question?',
      input: 'gin',
      inputLabel: 'index: btree | gin | brin | partial',
      gen: function (input) {
        var k = pick(input, ['btree', 'gin', 'brin', 'partial'], 'gin'), f = [];
        if (k === 'btree') {
          f.push({ narr: 'B-tree: sorted keys in leaf pages linked left to right. Question: <code>WHERE total BETWEEN 1000 AND 3000</code>.', parts: [{ type: 'array', label: 'leaf keys (sorted)', values: [700, 900, 1200, 1500, 2500, 3000, 4999, 8800] }] });
          f.push({ narr: 'Descend from the root to the first key ≥ 1000: <b>1200</b>. That costs O(log n) page reads.', parts: [{ type: 'array', label: 'leaf keys', values: [700, 900, 1200, 1500, 2500, 3000, 4999, 8800], hl: { 2: 'cur' } }] });
          f.push({ narr: 'Walk right along the leaves while the key ≤ 3000: 1500, 2500, 3000.', parts: [{ type: 'array', label: 'leaf keys', values: [700, 900, 1200, 1500, 2500, 3000, 4999, 8800], hl: { 2: 'ok', 3: 'ok', 4: 'ok', 5: 'ok' } }] });
          f.push({ narr: 'Stop at 4999. Four matches, read in order, so <code>ORDER BY total</code> is free too. B-trees serve =, &lt;, &gt;, BETWEEN, prefix LIKE and sorting in both engines.', parts: [{ type: 'array', label: 'leaf keys', values: [700, 900, 1200, 1500, 2500, 3000, 4999, 8800], hl: { 6: 'bad' } }, vars('result', { rows: 4, order: 'already sorted' })] });
        } else if (k === 'gin') {
          f.push({ narr: 'GIN on <code>meta-&gt;tags</code>: an <b>inverted</b> index. Each tag maps to the list of rows containing it.', parts: [{ type: 'map', label: 'GIN posting lists', entries: [['bulk', '6, 8'], ['gift', '1, 3, 6, 7'], ['rush', '1, 2, 8']] }] });
          f.push({ narr: 'Query: <code>WHERE meta @&gt; \'{"tags":["gift"]}\'</code>. Look up the key "gift" once.', parts: [{ type: 'map', label: 'GIN posting lists', entries: [['bulk', '6, 8'], ['gift', '1, 3, 6, 7'], ['rush', '1, 2, 8']], hl: { gift: 'cur' } }] });
          f.push({ narr: 'Two tags (<code>["gift","rush"]</code>): intersect the posting lists → rows 1. A B-tree on the whole JSON text could never do this.', parts: [{ type: 'map', label: 'GIN posting lists', entries: [['bulk', '6, 8'], ['gift', '1, 3, 6, 7'], ['rush', '1, 2, 8']], hl: { gift: 'sel', rush: 'sel' } }, vars('intersection', { rows: '1' }, { rows: 'ok' })] });
          f.push({ narr: 'The price: inserting a row with 3 tags writes 3 index keys. PostgreSQL buffers them in a pending list (fastupdate). MySQL\'s answer for this exact query is a <b>multi-valued index</b> with <code>MEMBER OF</code> / <code>JSON_CONTAINS</code>.', parts: [{ type: 'map', label: 'GIN posting lists', entries: [['bulk', '6, 8'], ['gift', '1, 3, 6, 7, 9'], ['rush', '1, 2, 8, 9'], ['vip', '9']], hl: { gift: 'cur', rush: 'cur', vip: 'cur' } }, vars('insert row 9', { 'index keys written': 3 }, { 'index keys written': 'bad' })] });
        } else if (k === 'brin') {
          f.push({ narr: 'BRIN on <code>logged_at</code> of an append-only log table: one tiny summary (min, max) per range of 128 pages.', parts: [tbl('BRIN summaries', ['pages', 'min', 'max'], [['0-127', 'Jan 01', 'Jan 08'], ['128-255', 'Jan 08', 'Jan 15'], ['256-383', 'Jan 15', 'Jan 22'], ['384-511', 'Jan 22', 'Jan 29']])] });
          f.push({ narr: 'Query <code>WHERE logged_at BETWEEN Jan 16 AND Jan 18</code>: only ranges whose [min, max] overlap can contain matches.', parts: [tbl('BRIN summaries', ['pages', 'min', 'max'], [['0-127', 'Jan 01', 'Jan 08'], ['128-255', 'Jan 08', 'Jan 15'], ['256-383', 'Jan 15', 'Jan 22'], ['384-511', 'Jan 22', 'Jan 29']], { 2: 'cur' })] });
          f.push({ narr: 'Read those 128 pages and recheck every row (lossy). The index itself is a few kilobytes even for a terabyte table, versus gigabytes for a B-tree.', parts: [vars('cost', { 'pages read': 128, 'index size': '≈ 24 kB' }, { 'index size': 'ok' })] });
          f.push({ narr: 'If someone back-fills old dates into new pages, summaries widen (Jan 01–Jan 29 everywhere) and BRIN must read everything. It only works when the value follows physical order.', parts: [tbl('BRIN summaries (after random back-fill)', ['pages', 'min', 'max'], [['0-127', 'Jan 01', 'Jan 29'], ['128-255', 'Jan 01', 'Jan 29'], ['256-383', 'Jan 01', 'Jan 29'], ['384-511', 'Jan 01', 'Jan 29']], { 0: 'bad', 1: 'bad', 2: 'bad', 3: 'bad' })] });
        } else {
          f.push({ narr: 'Partial index <code>ON orders (lower(email)) WHERE status = \'pending\'</code>: only pending rows are indexed.', parts: [tbl('orders', ['id', 'status', 'lower(email)'], [['1', 'paid', 'asha@x.io'], ['2', 'pending', 'ben@x.io'], ['4', 'pending', 'chen@x.io'], ['7', 'pending', 'eli@x.io']], { 1: 'sel', 2: 'sel', 3: 'sel' })] });
          f.push({ narr: 'The index has 3 entries instead of 8. Smaller to cache, cheaper to update — paid orders never touch it.', parts: [{ type: 'array', label: 'idx_pending_email', values: ['ben@x.io', 'chen@x.io', 'eli@x.io'] }] });
          f.push({ narr: 'Query with <code>status = \'pending\' AND lower(email) = \'ben@x.io\'</code>: the WHERE implies the index predicate and the expression matches → index search.', parts: [{ type: 'array', label: 'idx_pending_email', values: ['ben@x.io', 'chen@x.io', 'eli@x.io'], hl: { 0: 'ok' } }, vars('plan', { access: 'SEARCH USING INDEX idx_pending_email' }, { access: 'ok' })] });
          f.push({ narr: 'Query without the status filter: the index lacks paid rows, so it <b>cannot</b> be used. Same for <code>email = \'Ben@x.io\'</code> without lower(). MySQL has no partial indexes at all.', parts: [vars('plan', { access: 'SCAN orders' }, { access: 'bad' })] });
        }
        return f;
      }
    },
    examples: [
      { title: 'A partial UNIQUE rule', html: `<p>"A user may have many cancelled subscriptions but only one active one." PostgreSQL: <code>CREATE UNIQUE INDEX ON subscriptions (user_id) WHERE status = 'active'</code>. MySQL has no partial indexes; the usual trick is a generated column that is <code>user_id</code> when active and NULL otherwise, with a UNIQUE index on it (multiple NULLs are allowed).</p>`, code: lab(`CREATE UNIQUE INDEX one_pending_per_customer ON orders (customer_id) WHERE status = 'pending';
INSERT INTO orders VALUES (9, 101, 'pending', 'asha@x.io', 100, '2026-01-11', NULL);   -- ok: 101 had none pending
SELECT customer_id, COUNT(*) AS pending FROM orders WHERE status = 'pending' GROUP BY customer_id ORDER BY customer_id;`, 'Partial unique index (▶ Run)') },
      { title: 'Expression must match exactly', html: `<p>Index on <code>lower(email)</code>; the ORM generates <code>WHERE LOWER(TRIM(email)) = ?</code>. Different expression → no index. In MySQL, a functional index also has to match the generated expression, and comparisons against JSON-extracted values need a matching <code>CAST</code> and collation. Always copy the exact expression from the query log into the index.</p>` },
      { title: 'Hash index: when?', html: `<p>PostgreSQL hash indexes support only equality and cannot be UNIQUE or multicolumn, but for very long keys (URLs) they store a 4-byte hash instead of the key and may be smaller than a B-tree. In MySQL, <code>USING HASH</code> on InnoDB is accepted and ignored. Interview answer: "B-tree unless you have measured a reason".</p>` }
    ],
    problems: [{
      title: 'Index Only the Hot Subset',
      level: 'Medium', tags: ['partial index', 'expression index', 'explain'], companies: ['Stripe', 'Zomato', 'DoorDash'],
      statement: `<p>Support staff search <b>pending</b> orders by email, case-insensitively: <code>SELECT id FROM orders WHERE lower(email) = ? AND status = 'pending'</code>. Create an index named <code>idx_pending_email</code> that indexes <b>only pending rows</b> by <code>lower(email)</code>, then show the query plan for that query with <code>'ben@x.io'</code>.</p>`,
      constraints: `<p>SQLite (same partial/expression rules as PostgreSQL). The last statement must be the <code>EXPLAIN QUERY PLAN</code>, and the plan must use the new index.</p>`,
      example: `<p>Plan detail should read like ${H.c('g', 'SEARCH orders USING INDEX idx_pending_email (&lt;expr&gt;=?)')}.</p>`,
      brute: { why: `<p>A plain index on <code>email</code> indexes every row and does not match <code>lower(email)</code>, so the planner still scans the table. A full index on <code>lower(email)</code> works but is larger and is updated by every order, not only pending ones.</p>`, code: lab(`CREATE INDEX idx_email ON orders (email);
EXPLAIN QUERY PLAN SELECT id FROM orders WHERE lower(email) = 'ben@x.io' AND status = 'pending';`, 'Naive: plain index on email') },
      mcq: { q: 'Which query can use an index created ON orders (lower(email)) WHERE status = \'pending\'?', options: ["WHERE lower(email) = 'x'", "WHERE email = 'x' AND status = 'pending'", "WHERE lower(email) = 'x' AND status = 'pending'", "WHERE status = 'paid'"], answer: 2, explain: 'The expression must match and the query predicate must imply the index predicate.' },
      hints: [
        `<p>Hint 1: An expression index lists the expression inside the column list: <code>ON orders (lower(email))</code>.</p>`,
        `<p>Hint 2: A partial index adds a <code>WHERE</code> clause after the column list.</p>`,
        `<p>Hint 3: Finish with <code>EXPLAIN QUERY PLAN</code> followed by the exact query, including <code>status = 'pending'</code>.</p>`
      ],
      tests: { engine: 'sqlite', check: PLANCHECK, cases: [
        { plan: ['SEARCH orders USING INDEX idx_pending_email'], noplan: ['SCAN'] },
        { after: "SELECT name, \"partial\" FROM pragma_index_list('orders') WHERE name = 'idx_pending_email'", rows: [['idx_pending_email', 1]] },
        { after: "SELECT COUNT(*) FROM pragma_index_xinfo('idx_pending_email') WHERE cid = -2", rows: [[1]] },
        { after: "EXPLAIN QUERY PLAN SELECT id FROM orders WHERE lower(email) = 'ben@x.io'", noplan: ['idx_pending_email'] },
        { after: "SELECT id FROM orders WHERE lower(email) = 'ben@x.io' AND status = 'pending'", rows: [[2]] },
        { setup: "INSERT INTO orders VALUES (9, 106, 'pending', 'BEN@X.IO', 50, '2026-01-12', NULL)", after: "SELECT id FROM orders WHERE lower(email) = 'ben@x.io' AND status = 'pending' ORDER BY id", rows: [[2], [9]] }
      ] },
      solution: {
        approach: `<p>Combine both features: the expression <code>lower(email)</code> in the key and <code>WHERE status = 'pending'</code> as the predicate. The query repeats both, so the planner can prove the index is complete for it. In PostgreSQL the DDL is identical (add <code>CONCURRENTLY</code> in production); MySQL would need <code>INDEX idx (status, (lower(email)))</code> because it has no partial indexes.</p>`,
        code: lab(`CREATE INDEX idx_pending_email ON orders (lower(email)) WHERE status = 'pending';
EXPLAIN QUERY PLAN
SELECT id FROM orders WHERE lower(email) = 'ben@x.io' AND status = 'pending';`, 'Partial expression index (▶ Run)'),
        complexity: `<p>Lookup O(log p) where p = pending rows only; updates to non-pending rows never touch the index.</p>`,
        followUps: ['How would you write the MySQL equivalent?', 'What happens to the index when an order moves from pending to paid?']
      }
    }]
  });

  /* =====================================================================
     TOPIC 4 — Reading EXPLAIN / EXPLAIN ANALYZE in each engine
     ===================================================================== */
  topics.push({
    title: 'Reading EXPLAIN and EXPLAIN ANALYZE in PostgreSQL and MySQL',
    analogy: `<p>EXPLAIN is the <b>satnav route before you drive</b>: "about 12 minutes via the highway". EXPLAIN ANALYZE is the <b>trip log after you drove</b>: "took 47 minutes, highway was jammed". The interesting part is never either number alone — it is <b>where the plan and the reality disagree</b>. A satnav that expected 5 cars on a road that had 4,000 will pick the wrong route every time.</p>`,
    explain: `<p><b>PostgreSQL</b> prints a tree; read it inside-out (deepest indented node runs first). Each node shows <code>(cost=startup..total rows=estimate width=bytes)</code>. With <code>ANALYZE</code> it also shows <code>(actual time=first..last rows=N loops=L)</code>. <b>Actual rows and time are per loop</b>: an inner Index Scan with <code>rows=12 loops=4000</code> produced 48,000 rows in total.</p>
<p>Useful options: <code>EXPLAIN (ANALYZE, BUFFERS)</code> (shared hit = from cache, read = from disk), <code>SETTINGS</code>, <code>WAL</code>, <code>VERBOSE</code>; PostgreSQL 16 added <code>GENERIC_PLAN</code> for parameterised queries, 17 added <code>SERIALIZE</code> and <code>MEMORY</code>. Watch for <code>Rows Removed by Filter</code>, <code>Heap Fetches</code> on index-only scans, and <code>Sort Method: external merge Disk</code> (raise <code>work_mem</code>).</p>
<p><b>MySQL</b> classic <code>EXPLAIN</code> is a table, one row per table access:</p>
${H.table(['Column', 'What to read'], [
  ['<code>type</code>', 'access type, best → worst: system, const, eq_ref, ref, range, index (full index scan), <b>ALL</b> (full table scan)'],
  ['<code>key</code> / <code>key_len</code>', 'chosen index and how many bytes of it are used (tells you how many columns of a composite index)'],
  ['<code>rows</code> × <code>filtered</code>', 'estimated rows examined, and % surviving the WHERE'],
  ['<code>Extra</code>', '<i>Using index</i> (covering), <i>Using index condition</i> (ICP), <i>Using where</i>, <b>Using filesort</b>, <b>Using temporary</b>']
])}
<p>MySQL 8.0.16+ has <code>EXPLAIN FORMAT=TREE</code> (iterator tree, like PostgreSQL) and 8.0.18+ <code>EXPLAIN ANALYZE</code>, which runs the query and prints <code>(actual time=first..last rows=N loops=L)</code> per iterator — again per loop. <code>FORMAT=JSON</code> adds cost details. <b>Both engines' EXPLAIN ANALYZE really executes the statement</b>: wrap UPDATE/DELETE in <code>BEGIN … ROLLBACK</code>.</p>
<p>The habit that matters in both: find the node where <b>estimated rows and actual rows differ by 10× or more</b>. The wrong join order or join method above it is a symptom; the misestimate is the cause (stale statistics, correlated columns, functions in predicates).</p>`,
    deepDive: `<p><b>Fixing misestimates.</b> PostgreSQL: <code>ANALYZE</code> the table, raise per-column <code>ALTER TABLE … ALTER COLUMN … SET STATISTICS 1000</code>, and for correlated columns create <b>extended statistics</b>: <code>CREATE STATISTICS s (dependencies, ndistinct, mcv) ON city, zip FROM addresses</code>. MySQL: <code>ANALYZE TABLE</code> refreshes index statistics (InnoDB samples <code>innodb_stats_persistent_sample_pages</code> pages), and <b>histograms</b> (<code>ANALYZE TABLE t UPDATE HISTOGRAM ON col WITH 64 BUCKETS</code>, 8.0+) give the optimizer distributions for non-indexed columns.</p>
<p><b>Hints differ.</b> PostgreSQL has no built-in hints by design (extension <code>pg_hint_plan</code> exists); you steer with statistics, indexes, or session settings like <code>enable_nestloop = off</code> for diagnosis only. MySQL has optimizer hints (<code>/*+ JOIN_ORDER(a, b) INDEX(t idx) */</code>), <code>FORCE INDEX</code>, and <code>optimizer_switch</code>. MySQL 8.0.18 added hash joins (replacing block nested loop); PostgreSQL has had hash and merge joins for decades plus parallel query.</p>`,
    aiEra: `<p><b>What AI changes:</b> pasting an EXPLAIN ANALYZE into an assistant is now the common first step, and it is genuinely good at spotting a Seq Scan or a filesort. It is less reliable at the arithmetic that matters: forgetting that actual rows are <i>per loop</i>, blaming the slowest node instead of the misestimated one below it, or suggesting an index that already exists but is not chosen because of statistics. Tools like explain.depesz.com and the MySQL Workbench visual plan are deterministic; let the model explain, but check the numbers yourself — the drill in this topic is exactly that check.</p>`,
    clues: [
      '"query suddenly got slow after data grew" → compare estimated vs actual rows per node; look for the first 10× misestimate',
      '"Nested Loop with loops=4000" → multiply per-loop rows and time by loops before judging the node',
      '"type: ALL, rows: 980000" in MySQL → full table scan; check for a missing or unusable index (function on column, implicit cast)',
      '"Using temporary; Using filesort" → GROUP BY / ORDER BY not served by an index; consider a composite index in the right order',
      '"EXPLAIN ANALYZE on a DELETE deleted my rows" → it executes; wrap it in a transaction and roll back',
      '"Sort Method: external merge Disk" (PostgreSQL) → work_mem too small for this sort'
    ],
    code: [
      lab(`-- Misestimate finder over captured EXPLAIN ANALYZE nodes.
-- Ratio = larger / smaller of (estimated rows, actual rows per loop).
SELECT plan, node_id, node_type, relation, est_rows, actual_rows, loops,
       actual_rows * loops AS total_rows,
       ROUND(1.0 * MAX(est_rows, actual_rows, 1) / MAX(MIN(est_rows, actual_rows), 1), 1) AS ratio
FROM plan_nodes ORDER BY plan, node_id;`, 'Estimated vs actual (▶ Run)'),
      pg(`EXPLAIN (ANALYZE, BUFFERS)
SELECT c.name, o.total
FROM customers c JOIN orders o ON o.customer_id = c.id
WHERE c.city = 'Pune' AND c.signup_year = 2024;
--  Nested Loop  (cost=0.43..812.10 rows=50 width=20) (actual time=0.05..812.40 rows=48000 loops=1)
--    ->  Seq Scan on customers c  (cost=0.00..310.00 rows=5 width=12) (actual time=0.01..30.10 rows=4000 loops=1)
--          Filter: ((city = 'Pune') AND (signup_year = 2024))
--          Rows Removed by Filter: 96000
--    ->  Index Scan using idx_orders_customer on orders o  (cost=0.43..100.2 rows=10 width=12) (actual time=0.02..0.17 rows=12 loops=4000)
--  Buffers: shared hit=12000 read=4100
-- Estimated 5 customers, got 4000 → the planner picked a nested loop it would never pick for 4000.
CREATE STATISTICS customers_city_year (dependencies, mcv) ON city, signup_year FROM customers;
ANALYZE customers;`, 'PostgreSQL EXPLAIN ANALYZE'),
      my(`EXPLAIN SELECT * FROM orders WHERE DATE(created_at) = '2026-01-05' ORDER BY total;
-- id | select_type | table  | type | key  | rows   | filtered | Extra
--  1 | SIMPLE      | orders | ALL  | NULL | 980000 |   100.00 | Using where; Using filesort
-- Function on the column hides the index. Rewrite as a range:
EXPLAIN SELECT * FROM orders WHERE created_at >= '2026-01-05' AND created_at < '2026-01-06' ORDER BY total;
-- type: range, key: idx_created, Extra: Using index condition; Using filesort

EXPLAIN ANALYZE SELECT * FROM orders WHERE customer_id = 7;    -- 8.0.18+, runs the query
-- -> Index lookup on orders using idx_customer (customer_id=7)  (cost=4.2 rows=12) (actual time=0.03..0.05 rows=12 loops=1)
ANALYZE TABLE orders UPDATE HISTOGRAM ON status WITH 16 BUCKETS;`, 'MySQL EXPLAIN / EXPLAIN ANALYZE')
    ],
    codeTitle: ['Misestimates', 'PostgreSQL', 'MySQL'],
    viz: {
      title: 'Read a PostgreSQL plan inside-out',
      input: 'q1',
      inputLabel: 'plan: q1 | q2',
      gen: function (input) {
        var p = pick(input, ['q1', 'q2'], 'q1'), f = [];
        var cols = ['node', 'est rows', 'actual rows', 'loops', 'total rows'];
        if (p === 'q1') {
          var rows = [['Nested Loop', '50', '48000', '1', '48000'], ['  Seq Scan customers', '5', '4000', '1', '4000'], ['  Index Scan orders', '10', '12', '4000', '48000']];
          f.push({ narr: 'Plan q1, a join of customers and orders. Read from the deepest node outward: the Seq Scan on customers runs first and feeds the Nested Loop.', parts: [tbl('EXPLAIN ANALYZE q1', cols, rows)] });
          f.push({ narr: 'Seq Scan: planner expected <b>5</b> customers, got <b>4000</b> — an 800× misestimate (city and signup_year are correlated, so multiplying their selectivities underestimates).', parts: [tbl('EXPLAIN ANALYZE q1', cols, rows, { 1: 'bad' }), vars('ratio', { 'Seq Scan': '800×' }, { 'Seq Scan': 'bad' })] });
          f.push({ narr: 'Index Scan on orders: rows=12 looks tiny, but <b>loops=4000</b>. Per-loop numbers × loops = 48,000 rows and 4000 × 0.17 ms ≈ 680 ms. This is where the time went.', parts: [tbl('EXPLAIN ANALYZE q1', cols, rows, { 2: 'cur' }), vars('time', { 'per loop': '0.17 ms', 'total': '≈ 680 ms' }, { total: 'bad' })] });
          f.push({ narr: 'The Nested Loop was chosen because 5 outer rows × a cheap index probe looked ideal. With 4000 outer rows a hash join would win. The slow node is a <b>symptom</b>; the misestimate below it is the <b>cause</b>.', parts: [tbl('EXPLAIN ANALYZE q1', cols, rows, { 0: 'sel', 1: 'bad' })] });
          f.push({ narr: 'Fix the estimate, not the join: <code>CREATE STATISTICS … (dependencies, mcv) ON city, signup_year</code> + ANALYZE. The planner now expects ~4000 and chooses a Hash Join by itself.', parts: [tbl('after extended statistics', cols, [['Hash Join', '4100', '48000', '1', '48000'], ['  Seq Scan customers', '3900', '4000', '1', '4000'], ['  Seq Scan orders', '100000', '100000', '1', '100000']], { 0: 'ok', 1: 'ok' })] });
        } else {
          var r2 = [['Hash Join', '1000', '950', '1', '950'], ['  Seq Scan orders', '100000', '99000', '1', '99000'], ['  Hash', '200', '3000', '1', '3000'], ['    Bitmap Heap Scan customers', '200', '3000', '1', '3000']];
          f.push({ narr: 'Plan q2: Hash Join. The Hash node builds a hash table from customers; orders streams past it.', parts: [tbl('EXPLAIN ANALYZE q2', cols, r2)] });
          f.push({ narr: 'Bitmap Heap Scan on customers: estimated 200, got 3000 — 15×. Worth a look, but a hash join tolerates it well.', parts: [tbl('EXPLAIN ANALYZE q2', cols, r2, { 3: 'bad' })] });
          f.push({ narr: 'Seq Scan on orders: 100,000 estimated, 99,000 actual — accurate. A full scan is right when you need most of the table.', parts: [tbl('EXPLAIN ANALYZE q2', cols, r2, { 1: 'ok' })] });
          f.push({ narr: 'Danger to watch: if the Hash outgrew <code>work_mem</code>, the node shows <code>Batches: 4</code> and spills to disk. Here it fits. Verdict: this plan is healthy despite one 15× node.', parts: [tbl('EXPLAIN ANALYZE q2', cols, r2, { 0: 'ok' }), vars('Hash', { Buckets: 4096, Batches: 1, 'Memory Usage': '170kB' }, { Batches: 'ok' })] });
        }
        return f;
      }
    },
    examples: [
      { title: 'MySQL: key_len tells you how much of the index is used', html: `<p>Index <code>(status, created_at)</code>, query <code>WHERE status = 'paid' AND created_at &gt; ?</code>: <code>key_len</code> covers both columns and <code>type = range</code>. Change it to <code>WHERE created_at &gt; ?</code> only and MySQL may switch to <code>type = index</code> (full index scan) or use skip scan (8.0.13+, shown as "Using index for skip scan"). PostgreSQL 16/17 cannot skip-scan and would need an index starting with <code>created_at</code>.</p>` },
      { title: 'Per-loop arithmetic', html: `<p>An inner node shows <code>actual time=0.02..0.17 rows=12 loops=4000</code>. Total rows = 12 × 4000 = 48,000; total time ≈ 0.17 ms × 4000 = 680 ms. Interviewers love asking where the time went in such a plan, and "the inner index scan is fast" is the wrong answer.</p>`, code: lab(`SELECT node_type, relation, actual_rows * loops AS total_rows, ROUND(time_ms * loops, 1) AS total_ms
FROM plan_nodes WHERE plan = 'q1' ORDER BY node_id;`, 'Multiply by loops (▶ Run)') },
      { title: 'MySQL red flags in one query', html: `<p>Scan the classic EXPLAIN output for <code>type = ALL</code> on a big table, <code>Using temporary</code> (an internal temp table for GROUP BY/DISTINCT/UNION), and <code>Using filesort</code> (a sort that no index provides). None is always wrong — a filesort of 12 rows is free — so pair each flag with <code>rows</code>.</p>`, code: lab(`SELECT query, tbl, access_type, rows_est, extra
FROM mysql_explain
WHERE access_type = 'ALL' OR extra LIKE '%Using filesort%' OR extra LIKE '%Using temporary%'
ORDER BY query;`, 'Flag risky rows (▶ Run)') }
    ],
    problems: [{
      title: 'Find the Misestimated Plan Nodes',
      level: 'Medium', tags: ['explain analyze', 'cardinality', 'postgresql'], companies: ['Datadog', 'Atlassian', 'Swiggy'],
      statement: `<p><code>plan_nodes</code> holds PostgreSQL EXPLAIN ANALYZE nodes (actual rows are per loop). For each node compute <code>ratio = MAX(est_rows, actual_rows, 1) / MAX(MIN(est_rows, actual_rows), 1)</code> rounded to 1 decimal. Return nodes with <code>ratio &gt;= 10</code> as <code>plan, node_id, node_type, ratio</code>, ordered by <code>ratio</code> descending, then <code>plan</code>, then <code>node_id</code>.</p>`,
      constraints: `<p>Compare per-loop actual rows to the per-loop estimate (that is how PostgreSQL prints both). Use floating division. <code>lab</code> database.</p>`,
      example: `<p>q1's Nested Loop: 48000 / 50 = ${H.c('r', '960.0')}. q1's Index Scan: 12 / 10 = 1.2 → not listed even though loops = 4000.</p>`,
      brute: { why: `<p>Comparing <code>actual_rows * loops</code> to <code>est_rows</code> flags every healthy inner index scan of a nested loop (12 × 4000 vs 10 = 4800×) and hides the real culprit; and integer division truncates ratios like 15.0 vs 14.</p>`, code: lab(`SELECT plan, node_id, node_type, actual_rows * loops / est_rows AS ratio
FROM plan_nodes WHERE actual_rows * loops / est_rows >= 10 ORDER BY ratio DESC;`, 'Naive: multiplies by loops') },
      mcq: { q: 'An inner node shows rows=12 loops=4000 with an estimate of rows=10. Its estimate is…', options: ['off by 4800×', 'about right (1.2×)', 'meaningless because of loops', 'off by 400×'], answer: 1, explain: 'Both the estimate and actual rows are per loop, so 12 vs 10 is accurate.' },
      hints: [
        `<p>Hint 1: SQLite's scalar <code>MAX(a, b, c)</code> and <code>MIN(a, b)</code> take several arguments — they are not the aggregate versions.</p>`,
        `<p>Hint 2: Multiply by <code>1.0</code> before dividing so you get a real number, then <code>ROUND(x, 1)</code>.</p>`,
        `<p>Hint 3: Compute the ratio in a CTE or subquery, then filter <code>ratio &gt;= 10</code> and sort by ratio DESC, plan, node_id.</p>`
      ],
      tests: { engine: 'sqlite', cmp: 'exact', cases: [
        { cols: ['plan', 'node_id', 'node_type', 'ratio'], rows: [['q1', 1, 'Nested Loop', 960.0], ['q1', 2, 'Seq Scan', 800.0], ['q2', 3, 'Hash', 15.0], ['q2', 4, 'Bitmap Heap Scan', 15.0]] },
        { setup: "UPDATE plan_nodes SET est_rows = 3900 WHERE plan = 'q1' AND node_id = 2", rows: [['q1', 1, 'Nested Loop', 960.0], ['q2', 3, 'Hash', 15.0], ['q2', 4, 'Bitmap Heap Scan', 15.0]] },
        { setup: "UPDATE plan_nodes SET actual_rows = 0 WHERE plan = 'q2' AND node_id = 2", rows: [['q2', 2, 'Seq Scan', 100000.0], ['q1', 1, 'Nested Loop', 960.0], ['q1', 2, 'Seq Scan', 800.0], ['q2', 3, 'Hash', 15.0], ['q2', 4, 'Bitmap Heap Scan', 15.0]] },
        { setup: "UPDATE plan_nodes SET actual_rows = 20 WHERE plan = 'q2' AND node_id = 4", rows: [['q1', 1, 'Nested Loop', 960.0], ['q1', 2, 'Seq Scan', 800.0], ['q2', 3, 'Hash', 15.0], ['q2', 4, 'Bitmap Heap Scan', 10.0]] },
        { setup: "UPDATE plan_nodes SET actual_rows = 21 WHERE plan = 'q2' AND node_id = 4", rows: [['q1', 1, 'Nested Loop', 960.0], ['q1', 2, 'Seq Scan', 800.0], ['q2', 3, 'Hash', 15.0]] },
        { setup: "DELETE FROM plan_nodes WHERE plan = 'q1'", rows: [['q2', 3, 'Hash', 15.0], ['q2', 4, 'Bitmap Heap Scan', 15.0]] }
      ] },
      solution: {
        approach: `<p>Use per-loop numbers on both sides, take larger/smaller so under- and over-estimates both count, guard against zero with <code>MAX(…, 1)</code>, then filter and sort. In a real plan you would then look at the <b>deepest</b> flagged node first: errors propagate upward.</p>`,
        code: lab(`WITH r AS (
  SELECT plan, node_id, node_type,
         ROUND(1.0 * MAX(est_rows, actual_rows, 1) / MAX(MIN(est_rows, actual_rows), 1), 1) AS ratio
  FROM plan_nodes
)
SELECT plan, node_id, node_type, ratio
FROM r WHERE ratio >= 10
ORDER BY ratio DESC, plan, node_id;`, 'Misestimated nodes (▶ Run)'),
        complexity: `<p>O(n log n) for n plan nodes. The real work is reading the flagged node's predicate and fixing statistics.</p>`,
        followUps: ['Which flagged node in q1 would you fix first, and how?', 'How would you capture this automatically? (auto_explain in PostgreSQL, performance_schema in MySQL)']
      }
    }]
  });

  /* =====================================================================
     TOPIC 5 — Isolation defaults, locking reads and gap locks
     ===================================================================== */
  topics.push({
    title: 'Isolation Defaults, Locking Reads and InnoDB Gap Locks',
    analogy: `<p>Booking seats in a cinema. <b>PostgreSQL</b> hands every reader a <b>photo of the seat map</b> (snapshot); under SERIALIZABLE it also keeps notes on who looked at what and cancels one booking if two photos led to an impossible result. <b>InnoDB</b> at REPEATABLE READ gives readers a photo too — but anyone who wants to <i>change</i> seats puts <b>tape across the row and the gaps next to it</b>, so nobody can squeeze a new seat into that stretch until they are done. The tape on the <i>gaps</i> is what surprises people.</p>`,
    explain: `<p>SQL 12 covered the isolation theory. The engine-specific facts interviews probe are these:</p>
${H.table(['', 'PostgreSQL 16/17', 'MySQL 8.x InnoDB'], [
  ['Default level', '<b>READ COMMITTED</b>', '<b>REPEATABLE READ</b>'],
  ['READ UNCOMMITTED', 'behaves as READ COMMITTED', 'real dirty reads'],
  ['REPEATABLE READ', 'snapshot isolation; concurrent update of the same row → error 40001, retry', 'plain SELECT reads a snapshot; UPDATE/DELETE/locking reads see the <b>latest committed</b> row and lock it (no 40001)'],
  ['Phantoms at RR', 'not visible (snapshot)', 'not visible to plain reads; locking reads prevent inserts with <b>next-key / gap locks</b>'],
  ['SERIALIZABLE', '<b>SSI</b>: non-blocking SIREAD tracking, aborts with 40001', 'RR + every plain SELECT becomes <code>FOR SHARE</code> (when autocommit is off): lock-based'],
  ['Row locks stored', 'in the tuple header (xmax) + a lock table for waiters; never escalate', 'in the lock system per index record; never escalate'],
  ['Deadlock', 'checked after <code>deadlock_timeout</code> (1 s), error 40P01', 'checked immediately (<code>innodb_deadlock_detect</code>), error 1213; lock wait timeout 1205 after 50 s']
])}
<p><b>InnoDB locks index records, not rows.</b> A <i>record lock</i> covers one index entry; a <i>gap lock</i> covers the open interval before an entry; a <b>next-key lock</b> = record + the gap before it, i.e. the interval <code>(previous key, this key]</code>. A locking range scan at REPEATABLE READ (<code>SELECT … FOR UPDATE</code>, UPDATE, DELETE) puts next-key locks on every index record it scans, including the first record past the range, so no other transaction can insert into the scanned range. Inserts take an <i>insert intention</i> lock, which waits on a conflicting gap lock. Gap locks never conflict with each other.</p>
<p>Exceptions: an equality search on a <b>unique</b> index that finds its row locks only that record. At <b>READ COMMITTED</b> InnoDB disables gap locking for searches and scans (it still uses it for foreign-key and duplicate-key checks) and releases locks on non-matching rows early — fewer deadlocks, but phantoms become possible for locking reads. And without a usable index, a locking UPDATE scans the clustered index and locks <b>every</b> row and gap.</p>`,
    deepDive: `<p><b>Reading the locks.</b> MySQL 8: <code>performance_schema.data_locks</code> shows <code>LOCK_MODE</code> values such as <code>X</code> (next-key), <code>X,REC_NOT_GAP</code> (record only), <code>X,GAP</code> and <code>X,INSERT_INTENTION</code>; the supremum pseudo-record represents "the gap after the largest key". <code>data_lock_waits</code> shows who waits for whom, and <code>SHOW ENGINE INNODB STATUS</code> prints the LATEST DETECTED DEADLOCK. PostgreSQL: <code>pg_locks</code> joined with <code>pg_stat_activity</code>, or <code>pg_blocking_pids(pid)</code>.</p>
<p><b>Version nuance.</b> The exact set of gaps locked at the right end of a range has changed between releases (for example MySQL 8.0.18 stopped locking the record after the range in some unique-index scans), so in interviews say "next-key locks on the scanned range, up to and including the next record" and verify with <code>data_locks</code> on your version. The model in this topic uses that textbook rule.</p>`,
    aiEra: `<p><b>What AI changes:</b> generated retry logic is usually written for one engine: a loop catching SQLSTATE 40001 is right for PostgreSQL REPEATABLE READ/SERIALIZABLE but never fires on MySQL RR, where the same race silently succeeds with a lost update unless you use locking reads — and then you need to catch deadlock 1213 instead. Likewise "add FOR UPDATE" to an InnoDB range query without an index can lock the whole table through gap locks. When an assistant writes concurrency code, ask which engine and isolation level it assumed, and check the error codes it handles.</p>`,
    clues: [
      '"same code: Postgres raises serialization errors, MySQL silently loses updates" → different RR semantics; MySQL needs locking reads or atomic UPDATE',
      '"INSERT blocks although no one touched that row" (MySQL) → a gap or next-key lock from a range scan or a missing index',
      '"deadlocks went away after switching to READ COMMITTED" (MySQL) → gap locks are mostly disabled at RC',
      '"UPDATE … WHERE unindexed_col = ? locks the whole table" (InnoDB) → it scans and locks every clustered record and gap',
      '"Postgres app takes 1 second to report a deadlock" → deadlock_timeout default 1 s',
      '"read your snapshot vs latest" → MySQL RR: plain SELECT = snapshot, SELECT … FOR UPDATE = latest committed'
    ],
    code: [
      lab(`-- Next-key lock model: a locking scan of [lo, hi] locks (prev, k] for every scanned key k,
-- including the first key beyond hi (or the supremum pseudo-record if none).
WITH s AS (SELECT lo, hi FROM scan),
ks AS (SELECT k FROM idx_keys UNION ALL SELECT 1000000000),              -- 1e9 = supremum
scanned AS (
  SELECT k FROM ks, s WHERE k BETWEEN s.lo AND s.hi
  UNION SELECT MIN(k) FROM ks, s WHERE k > s.hi)
SELECT (SELECT MAX(p.k) FROM idx_keys p WHERE p.k < sc.k) AS gap_from_exclusive, sc.k AS to_inclusive
FROM scanned sc ORDER BY sc.k;`, 'Locked intervals for scan 15..25 (▶ Run)'),
      my(`-- Session A (REPEATABLE READ, the default)
START TRANSACTION;
SELECT * FROM t WHERE k BETWEEN 15 AND 25 FOR UPDATE;   -- index on k holds 10, 20, 30, 40

-- Session B
INSERT INTO t (k) VALUES (12);   -- blocks: 12 is inside the next-key lock (10,20]
INSERT INTO t (k) VALUES (35);   -- succeeds: (30,40] is not locked

-- Session C: inspect
SELECT index_name, lock_type, lock_mode, lock_data FROM performance_schema.data_locks;
--  idx_k | RECORD | X                       | 20, <pk>
--  idx_k | RECORD | X                       | 30, <pk>
--  idx_k | RECORD | X,GAP,INSERT_INTENTION  | 20, <pk>     (session B waiting)`, 'MySQL gap locks in action'),
      pg(`-- PostgreSQL: the same insert never blocks; SERIALIZABLE detects the conflict instead.
BEGIN ISOLATION LEVEL SERIALIZABLE;
SELECT * FROM t WHERE k BETWEEN 15 AND 25;     -- takes SIREAD (predicate) locks, blocks nobody
-- another session inserts k = 12 and commits; if our later writes depend on the read,
-- one of the two transactions fails with: ERROR 40001 could not serialize access ...
COMMIT;
SELECT pid, pg_blocking_pids(pid), wait_event_type, query FROM pg_stat_activity WHERE wait_event_type = 'Lock';`, 'PostgreSQL equivalent')
    ],
    codeTitle: ['Lock model', 'MySQL', 'PostgreSQL'],
    viz: {
      title: 'Next-key locks on the index 10, 20, 30, 40',
      input: '15 25',
      inputLabel: 'locking scan range "lo hi", e.g. "15 25"',
      gen: function (input) {
        var parts = String(input || '15 25').trim().split(/\s+/), lo = parseInt(parts[0], 10), hi = parseInt(parts[1], 10);
        if (isNaN(lo) || isNaN(hi) || lo > hi || lo < 0 || hi > 100) throw new Error('Type two numbers 0-100, low first, e.g. "15 25"');
        var keys = [10, 20, 30, 40], f = [], scanned = [], i;
        for (i = 0; i < keys.length; i++) if (keys[i] >= lo && keys[i] <= hi) scanned.push(keys[i]);
        var next = null;
        for (i = 0; i < keys.length; i++) if (keys[i] > hi) { next = keys[i]; break; }
        f.push({ narr: 'Secondary index on <code>k</code> holds 10, 20, 30, 40. Transaction A runs <code>SELECT … WHERE k BETWEEN ' + lo + ' AND ' + hi + ' FOR UPDATE</code> at REPEATABLE READ.', parts: [{ type: 'array', label: 'index on k', values: keys }] });
        var hl = {};
        keys.forEach(function (k, j) { if (scanned.indexOf(k) >= 0) hl[j] = 'cur'; });
        f.push({ narr: scanned.length ? 'Keys inside the range: <b>' + scanned.join(', ') + '</b>. Each gets a <b>next-key lock</b>: the record plus the gap before it.' : 'No key lies inside the range — but the scan still has to look at the next key to know the range is empty.', parts: [{ type: 'array', label: 'index on k', values: keys, hl: hl }] });
        var locks = scanned.slice();
        if (next !== null) locks.push(next);
        var ivals = locks.map(function (k) { var prev = null; keys.forEach(function (x) { if (x < k) prev = x; }); return '(' + (prev === null ? '−∞' : prev) + ', ' + k + ']'; });
        if (next === null) { var mx = keys[keys.length - 1]; ivals.push('(' + mx + ', +∞) supremum'); }
        var hl2 = {};
        keys.forEach(function (k, j) { if (locks.indexOf(k) >= 0) hl2[j] = 'bad'; });
        f.push({ narr: 'The scan stops at the first key past ' + hi + (next !== null ? ': <b>' + next + '</b>, which is locked as well' : ': none, so InnoDB locks the <b>supremum</b> (the gap after the largest key)') + '. Locked intervals: <b>' + ivals.join(', ') + '</b>.', parts: [{ type: 'array', label: 'index on k', values: keys, hl: hl2 }, { type: 'set', label: 'next-key locks held by A', items: ivals }] });
        var tries = [5, 12, 25, 28, 35, 45], outcome = {};
        tries.forEach(function (v) {
          var blocked = false;
          locks.forEach(function (k) { var prev = -Infinity; keys.forEach(function (x) { if (x < k) prev = x; }); if (v > prev && v <= k) blocked = true; });
          if (next === null && v > keys[keys.length - 1]) blocked = true;
          outcome['INSERT ' + v] = blocked ? 'waits' : 'proceeds';
        });
        var oh = {};
        Object.keys(outcome).forEach(function (k) { oh[k] = outcome[k] === 'waits' ? 'bad' : 'ok'; });
        f.push({ narr: 'Other transactions try to insert. An insert needs an <b>insert intention</b> lock on its gap; it waits if that gap is covered by A\'s locks.', parts: [vars('Transaction B inserts', outcome, oh)] });
        f.push({ narr: 'In PostgreSQL every one of those inserts proceeds immediately; phantom protection comes from the snapshot (and SSI at SERIALIZABLE). In InnoDB at READ COMMITTED, the gap part disappears and only the matching records stay locked.', parts: [vars('same scan elsewhere', { 'PostgreSQL (any level)': 'inserts never wait for readers', 'InnoDB READ COMMITTED': 'record locks only' })] });
        return f;
      }
    },
    examples: [
      { title: 'The classic gap-lock deadlock', html: `<p>Two requests do "insert the row if it does not exist": <code>SELECT … WHERE email = ? FOR UPDATE</code> (no row found → both get a <b>gap lock</b> on the same gap; gap locks do not conflict), then both <code>INSERT</code>. Each insert waits for the other's gap lock → deadlock 1213. Fixes: <code>INSERT … ON DUPLICATE KEY UPDATE</code> / <code>INSERT IGNORE</code> on a UNIQUE key, or READ COMMITTED. PostgreSQL's answer is <code>INSERT … ON CONFLICT</code>.</p>` },
      { title: 'Same race, different outcome', html: `<p>Two sessions at REPEATABLE READ read stock = 3, then each runs <code>UPDATE products SET stock = 2 WHERE sku = 'X'</code> (computed in the app). PostgreSQL: the second UPDATE waits, then fails with <code>40001 could not serialize access due to concurrent update</code>. MySQL: the second UPDATE waits, then <b>succeeds</b> — one sale is lost. Portable fix: <code>SET stock = stock - 1 WHERE stock &gt; 0</code>.</p>` },
      { title: 'Which inserts wait?', html: `<p>With the lab's index (10, 20, 30, 40) and a locking scan of 15..25, the locked intervals are (10, 20] and (20, 30]. Inserting 12, 25 or 28 waits; 5 and 35 proceed.</p>`, code: lab(`SELECT a.txn, a.k,
       CASE WHEN a.k > 10 AND a.k <= 30 THEN 'waits' ELSE 'proceeds' END AS outcome
FROM insert_attempts a ORDER BY a.txn;`, 'Hand-computed for 15..25 (▶ Run)') }
    ],
    problems: [{
      title: 'Which Inserts Wait on the Gap Locks?',
      level: 'Hard', tags: ['innodb', 'next-key lock', 'gap lock'], companies: ['Booking.com', 'Alibaba', 'Uber'],
      statement: `<p>Model InnoDB at REPEATABLE READ. <code>idx_keys</code> lists the keys of a non-unique secondary index, <code>scan</code> holds one locking range scan <code>[lo, hi]</code>. The scan takes a next-key lock <code>(previous key, k]</code> on every key <code>k</code> inside the range <b>and</b> on the first key greater than <code>hi</code>; if there is none it locks the supremum, i.e. <code>(largest key, +∞)</code>. A key with no previous key locks <code>(−∞, k]</code>. For each row of <code>insert_attempts</code> return <code>txn, k, outcome</code> where outcome is <code>'waits'</code> if <code>k</code> falls in a locked interval, else <code>'proceeds'</code>. Order by <code>txn</code>.</p>`,
      constraints: `<p>All keys are distinct integers between 0 and 1,000,000. No attempt inserts a value equal to an existing key. <code>lab</code> database.</p>`,
      example: `<p>Keys 10, 20, 30, 40, scan 15..25 → locks (10,20] and (20,30]. ${H.c('r', 'T2 12, T3 25, T6 28 wait')}; ${H.c('g', 'T4 35, T5 5 proceed')}.</p>`,
      brute: { why: `<p>Checking only <code>k BETWEEN lo AND hi</code> says T6 (28) proceeds, but 28 lies in the gap before 30, which the scan locked to protect the end of its range. It also misses the supremum case for scans past the largest key.</p>`, code: lab(`SELECT a.txn, a.k, CASE WHEN a.k BETWEEN s.lo AND s.hi THEN 'waits' ELSE 'proceeds' END AS outcome
FROM insert_attempts a, scan s ORDER BY a.txn;`, 'Naive: only the range itself') },
      mcq: { q: 'In InnoDB, which pair of locks can never conflict with each other?', options: ['Two gap locks on the same gap', 'Two exclusive record locks on the same record', 'A gap lock and an insert intention lock on that gap', 'A next-key lock and a record lock on the same record'], answer: 0, explain: 'Gap locks are purely inhibitive: many transactions can hold them on the same gap. They only block inserts.' },
      hints: [
        `<p>Hint 1: First build the set of locked keys: those in <code>[lo, hi]</code> plus <code>MIN(k)</code> above <code>hi</code>. Add a huge sentinel key to stand for the supremum so the "none above" case needs no special code.</p>`,
        `<p>Hint 2: For each locked key, its interval's lower bound is <code>MAX(k)</code> of real keys below it (NULL means −∞, so <code>COALESCE</code> it to a very small number).</p>`,
        `<p>Hint 3: An attempt waits if <code>EXISTS</code> an interval with <code>gap_lo &lt; a.k AND a.k &lt;= gap_hi</code>.</p>`
      ],
      tests: { engine: 'sqlite', cmp: 'exact', cases: [
        { cols: ['txn', 'k', 'outcome'], rows: [['T2', 12, 'waits'], ['T3', 25, 'waits'], ['T4', 35, 'proceeds'], ['T5', 5, 'proceeds'], ['T6', 28, 'waits']] },
        { setup: 'UPDATE scan SET lo = 35, hi = 50', rows: [['T2', 12, 'proceeds'], ['T3', 25, 'proceeds'], ['T4', 35, 'waits'], ['T5', 5, 'proceeds'], ['T6', 28, 'proceeds']] },
        { setup: 'UPDATE scan SET lo = 1, hi = 5', rows: [['T2', 12, 'proceeds'], ['T3', 25, 'proceeds'], ['T4', 35, 'proceeds'], ['T5', 5, 'waits'], ['T6', 28, 'proceeds']] },
        { setup: 'UPDATE scan SET lo = 10, hi = 10', rows: [['T2', 12, 'waits'], ['T3', 25, 'proceeds'], ['T4', 35, 'proceeds'], ['T5', 5, 'waits'], ['T6', 28, 'proceeds']] },
        { setup: 'INSERT INTO idx_keys VALUES (26)', rows: [['T2', 12, 'waits'], ['T3', 25, 'waits'], ['T4', 35, 'proceeds'], ['T5', 5, 'proceeds'], ['T6', 28, 'proceeds']] },
        { setup: 'DELETE FROM idx_keys WHERE k = 30', rows: [['T2', 12, 'waits'], ['T3', 25, 'waits'], ['T4', 35, 'waits'], ['T5', 5, 'proceeds'], ['T6', 28, 'waits']] },
        { setup: "UPDATE scan SET lo = 41, hi = 60; INSERT INTO insert_attempts VALUES ('T7', 999)", rows: [['T2', 12, 'proceeds'], ['T3', 25, 'proceeds'], ['T4', 35, 'proceeds'], ['T5', 5, 'proceeds'], ['T6', 28, 'proceeds'], ['T7', 999, 'waits']] }
      ] },
      solution: {
        approach: `<p>Turn the lock rule into data. (1) Locked keys = keys in range ∪ first key above <code>hi</code>, with a sentinel supremum. (2) Each locked key k gives the interval (largest real key below k, k]. (3) An insert waits if its value falls in any interval. This mirrors what <code>performance_schema.data_locks</code> would show: one <code>X</code> next-key lock per scanned record.</p>`,
        code: lab(`WITH s AS (SELECT lo, hi FROM scan),
ks AS (SELECT k FROM idx_keys UNION ALL SELECT 1000000000 AS k),   -- sentinel = supremum
locked AS (
  SELECT k FROM ks, s WHERE k BETWEEN s.lo AND s.hi
  UNION
  SELECT MIN(k) FROM ks, s WHERE k > s.hi
),
ivals AS (
  SELECT COALESCE((SELECT MAX(p.k) FROM idx_keys p WHERE p.k < l.k), -1000000000) AS gap_lo, l.k AS gap_hi
  FROM locked l
)
SELECT a.txn, a.k,
       CASE WHEN EXISTS (SELECT 1 FROM ivals v WHERE a.k > v.gap_lo AND a.k <= v.gap_hi)
            THEN 'waits' ELSE 'proceeds' END AS outcome
FROM insert_attempts a
ORDER BY a.txn;`, 'Next-key lock model (▶ Run)'),
        complexity: `<p>O(L × K) for L locked keys and K index keys with the correlated MAX; fine for a model. InnoDB itself finds the gap in O(log n) by descending the index to the insert position.</p>`,
        followUps: ['How does the answer change at READ COMMITTED?', 'What if the index on k were UNIQUE and the scan were an equality on an existing key?']
      }
    }]
  });

  /* =====================================================================
     TOPIC 6 — Replication and failover
     ===================================================================== */
  topics.push({
    title: 'Replication and Failover: WAL Streaming vs Binlog, Sync Modes and Promotion',
    analogy: `<p>A head chef (primary) and sous-chefs (replicas). In <b>PostgreSQL</b> the head chef sends a <b>photocopy of every page of the kitchen notebook</b> as it is written (physical WAL): the copies end up byte-identical. In <b>MySQL</b> the head chef sends a <b>list of finished dishes</b> ("table orders: row 7 changed from X to Y" — the row-based binlog), and each sous-chef cooks them again in their own kitchen. When the head chef faints, someone must be <b>promoted</b>: you pick the sous-chef who has seen the most orders, or you lose the ones only the head chef knew about.</p>`,
    explain: `${H.table(['', 'PostgreSQL 16/17', 'MySQL 8.x'], [
  ['Built-in stream', '<b>physical streaming replication</b> of WAL; replicas are byte-identical, read-only <b>hot standbys</b>', '<b>binary log</b> (default <code>binlog_format=ROW</code>) → replica relay log → applier threads'],
  ['Logical / partial', 'logical replication (publications/subscriptions); PG16 adds logical decoding on standbys, PG17 slot failover sync and <code>pg_createsubscriber</code>', 'binlog is logical already: filter by database/table, cross-version replication'],
  ['Position', 'LSN (byte position in WAL)', '<b>GTID</b> (<code>server_uuid:transaction_no</code>, sets like <code>uuid:1-1000</code>) or file+offset'],
  ['Synchronous option', '<code>synchronous_commit</code> = off / local / remote_write / on (remote flush) / remote_apply, with <code>synchronous_standby_names</code> = <code>FIRST n (…)</code> or <code>ANY n (…)</code> (quorum)', '<b>semi-sync</b> plugin: commit waits until ≥ N replicas have the event in their relay log (AFTER_SYNC = lossless, default)'],
  ['Consensus cluster', 'not built in — Patroni (+ etcd/Consul), pg_auto_failover, repmgr, or managed (RDS/Aurora, Cloud SQL)', '<b>Group Replication</b> (Paxos-based, single-primary by default) → <b>InnoDB Cluster</b> with MySQL Router and Shell; Orchestrator for classic async'],
  ['Replica apply', 'single startup process replays WAL (fast, physical)', 'multi-threaded applier (<code>replica_parallel_workers</code>, default 4 since 8.0.27) using write-set dependency tracking'],
  ['Retention', '<b>replication slots</b> keep WAL until consumed — a dead consumer fills the disk (cap with <code>max_slot_wal_keep_size</code>)', '<code>binlog_expire_logs_seconds</code> (default 30 days)']
])}
<p><b>Failover in one sentence each.</b> PostgreSQL: a manager (Patroni) notices the primary is gone, picks the healthy standby with the <b>highest received/replayed LSN</b>, runs <code>pg_promote()</code>, and repoints the others (<code>pg_rewind</code> repairs a diverged old primary). MySQL: Group Replication elects a new primary automatically among members that already certified every transaction; with classic async + GTIDs, a tool picks the most advanced replica and repoints the others with <code>CHANGE REPLICATION SOURCE TO … SOURCE_AUTO_POSITION = 1</code>.</p>
<p><b>Data loss on async failover</b> = every transaction the primary acknowledged whose commit position is beyond what the promoted replica <i>received</i>. Synchronous/semi-sync replication shrinks that to zero at the cost of commit latency.</p>`,
    deepDive: `<p><b>Replica reads and conflicts.</b> A PostgreSQL hot standby replays WAL that may remove rows a long query on the standby still needs; the query is then cancelled ("canceling statement due to conflict with recovery") unless <code>max_standby_streaming_delay</code> lets replay wait, or <code>hot_standby_feedback = on</code> tells the primary to keep those rows — which then bloats the primary. MySQL replicas have no such conflict (they re-execute row changes with their own MVCC), but a single huge transaction on the primary replays as one huge transaction on the replica, creating lag spikes.</p>
<p><b>Split brain</b> is the real failover risk in both: the old primary comes back and keeps accepting writes. Consensus (etcd for Patroni, Paxos inside Group Replication) plus fencing (STONITH, revoking the virtual IP, <code>super_read_only</code> on MySQL) prevents two primaries. Aurora and similar services sidestep much of this by replicating storage, not the log stream.</p>`,
    aiEra: `<p><b>What AI changes:</b> managed services and AI-generated Terraform make "add 2 read replicas" a one-line change, so the hard questions move to semantics: read-your-writes after a user saves a form (route that user to the primary, or wait for the replica's LSN/GTID — <code>WAIT_FOR_EXECUTED_GTID_SET</code> in MySQL, <code>pg_last_wal_replay_lsn()</code> comparisons in PostgreSQL), what RPO the business accepts, and who decides failover. An assistant can draft a Patroni config; you must still decide <code>synchronous_mode</code>, quorum size and what happens when the only sync standby dies.</p>`,
    clues: [
      '"zero data loss on failover" → PostgreSQL synchronous_commit=on with a sync standby (or ANY n quorum); MySQL semi-sync AFTER_SYNC or Group Replication',
      '"primary disk filled with WAL" → an inactive replication slot; set max_slot_wal_keep_size and monitor pg_replication_slots',
      '"replica query cancelled due to conflict with recovery" → hot standby conflict; tune max_standby_streaming_delay or hot_standby_feedback',
      '"which replica do we promote?" → healthy one with the highest received LSN / most complete GTID set',
      '"upgrade major version with minimal downtime" → logical replication (PostgreSQL) or a replica on the new version (MySQL), then switch over',
      '"user cannot see the comment they just posted" → replica lag; read-your-writes routing or wait for position'
    ],
    code: [
      lab(`-- Lag per replica in bytes, from the primary's point of view (pg_stat_replication style)
SELECT r.name, r.mode, r.healthy,
       p.current_lsn - r.received_lsn AS receive_lag_bytes,
       p.current_lsn - r.replayed_lsn AS replay_lag_bytes
FROM replicas r CROSS JOIN primary_state p
ORDER BY r.name;`, 'Replication lag (▶ Run)'),
      pg(`-- PostgreSQL primary
SELECT application_name, state, sync_state,
       pg_wal_lsn_diff(pg_current_wal_lsn(), replay_lsn) AS replay_lag_bytes, replay_lag
FROM pg_stat_replication;
ALTER SYSTEM SET synchronous_standby_names = 'ANY 1 (r1, r2)';   -- quorum: any one of them must flush
ALTER SYSTEM SET synchronous_commit = 'on';
SELECT pg_reload_conf();
SELECT slot_name, active, pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn)) AS retained
FROM pg_replication_slots;
-- On the chosen standby during failover:
SELECT pg_promote();`, 'PostgreSQL streaming replication'),
      my(`-- MySQL 8.x primary (source)
SET PERSIST gtid_mode = ON;                 -- (requires the ON_PERMISSIVE steps on a live server)
SET PERSIST enforce_gtid_consistency = ON;
INSTALL PLUGIN rpl_semi_sync_source SONAME 'semisync_source.so';
SET PERSIST rpl_semi_sync_source_enabled = 1, rpl_semi_sync_source_wait_point = 'AFTER_SYNC';
-- Replica
CHANGE REPLICATION SOURCE TO SOURCE_HOST = 'db1', SOURCE_AUTO_POSITION = 1;
START REPLICA;
SHOW REPLICA STATUS\\G       -- Seconds_Behind_Source, Retrieved_Gtid_Set, Executed_Gtid_Set
SELECT WAIT_FOR_EXECUTED_GTID_SET('3e11fa47-…:1-1042', 2);   -- read-your-writes on a replica`, 'MySQL binlog + GTID + semi-sync')
    ],
    codeTitle: ['Lag', 'PostgreSQL', 'MySQL'],
    viz: {
      title: 'Async vs synchronous commit, then the primary dies',
      input: 'async',
      inputLabel: 'mode: async | sync',
      gen: function (input) {
        var m = pick(input, ['async', 'sync'], 'async'), f = [];
        var cols = ['xid', 'commit LSN', 'on primary', 'on replica'];
        f.push({ narr: 'Primary commits transactions 902 and 903. Replica r1 has received WAL up to LSN 4900.', parts: [tbl('commits', cols, [['902', '4900', 'yes', 'yes'], ['903', '4995', 'yes', 'no']]), vars('positions', { primary: 4995, 'r1 received': 4900 })] });
        if (m === 'async') {
          f.push({ narr: '<b>Async</b>: the primary told the client "903 committed" as soon as its own WAL was flushed. It did not wait for r1.', parts: [tbl('commits', cols, [['902', '4900', 'yes', 'yes'], ['903', '4995', 'yes', 'in flight']], { 1: 'cur' }), vars('client', { '903': 'acknowledged' }, { '903': 'cur' })] });
          f.push({ narr: '<span class="c-r">Primary crashes</span> before the WAL for 903 reaches r1.', parts: [tbl('commits', cols, [['902', '4900', 'lost host', 'yes'], ['903', '4995', 'lost host', 'no']], { 1: 'bad' })] });
          f.push({ narr: 'Patroni promotes r1 (the most advanced healthy standby). 903 was acknowledged to the client but <b>does not exist</b> on the new primary: RPO &gt; 0.', parts: [vars('after failover', { 'new primary': 'r1', 'lost commits': '903' }, { 'lost commits': 'bad' })] });
          f.push({ narr: 'If the old primary returns with 903 in its WAL, it has diverged; <code>pg_rewind</code> (or a re-clone) discards 903 before it can rejoin as a standby.', parts: [txt('<p>Async = lowest latency, possible loss of the last few transactions.</p>')] });
        } else {
          f.push({ narr: '<b>Synchronous</b> (<code>synchronous_commit = on</code>, r1 listed as sync): COMMIT of 903 waits until r1 confirms it has <b>flushed</b> LSN 4995.', parts: [tbl('commits', cols, [['902', '4900', 'yes', 'yes'], ['903', '4995', 'yes', 'flushing…']], { 1: 'cur' }), vars('client', { '903': 'waiting' }, { '903': 'cur' })] });
          f.push({ narr: 'r1 acknowledges; only now is the client told "committed". Every commit paid one network round trip.', parts: [tbl('commits', cols, [['902', '4900', 'yes', 'yes'], ['903', '4995', 'yes', 'yes']], { 1: 'ok' }), vars('client', { '903': 'acknowledged' }, { '903': 'ok' })] });
          f.push({ narr: '<span class="c-r">Primary crashes.</span> r1 is promoted and has every acknowledged commit: RPO = 0. (MySQL semi-sync AFTER_SYNC gives the same guarantee for the relay log.)', parts: [vars('after failover', { 'new primary': 'r1', 'lost commits': 'none' }, { 'lost commits': 'ok' })] });
          f.push({ narr: 'The catch: if r1 is down, commits <b>hang</b>. Use a quorum like <code>ANY 1 (r1, r2)</code> so one slow standby does not stop writes.', parts: [txt('<p>Sync = zero loss, higher latency, availability depends on standbys.</p>')] });
        }
        return f;
      }
    },
    examples: [
      { title: 'Data at risk for each candidate', html: `<p>Before promoting, count acknowledged commits each candidate would lose: those with <code>commit_lsn</code> beyond its received position. The lab has commits at 4650…5000.</p>`, code: lab(`SELECT r.name, r.received_lsn,
       (SELECT COUNT(*) FROM commits c WHERE c.commit_lsn > r.received_lsn) AS commits_lost
FROM replicas r WHERE r.healthy = 1 ORDER BY commits_lost, r.name;`, 'Commits lost per candidate (▶ Run)') },
      { title: 'The forgotten replication slot', html: `<p>A data team created a logical slot for a CDC pipeline and then turned the pipeline off. The slot keeps every WAL segment since that moment; three days later the primary's disk is full and PostgreSQL stops. Fix: drop or re-attach the slot, set <code>max_slot_wal_keep_size</code>, alert on <code>pg_replication_slots</code> where <code>active = false</code>. MySQL's analogue is less dangerous: binlogs expire on a timer regardless of consumers.</p>` },
      { title: 'Major-version upgrade', html: `<p>PostgreSQL physical replicas must run the same major version, so zero-downtime upgrades use <b>logical replication</b> into a new-version cluster (or <code>pg_upgrade --link</code> with a short outage). MySQL allows a replica on a newer version (8.0 → 8.4) to follow an older source, so the usual path is: add a new-version replica, let it catch up, switch over.</p>` }
    ],
    problems: [{
      title: 'Pick the Promotion Candidate',
      level: 'Medium', tags: ['replication', 'failover', 'lsn'], companies: ['GitLab', 'Zalando', 'PhonePe'],
      statement: `<p>The primary in <code>primary_state</code> has died. From <code>replicas</code>, choose the replica to promote: only <code>healthy = 1</code>; highest <code>received_lsn</code>; ties broken by highest <code>replayed_lsn</code>, then by <code>name</code> ascending. Return one row <code>name, received_lsn, data_loss_bytes</code> where <code>data_loss_bytes = current_lsn - received_lsn</code>.</p>`,
      constraints: `<p>There is one row in <code>primary_state</code> and at least one healthy replica. <code>lab</code> database.</p>`,
      example: `<p>pg-r3 has the most WAL but is unhealthy. pg-r1 received 5000 → ${H.c('g', "('pg-r1', 5000, 0)")}.</p>`,
      brute: { why: `<p>Picking the replica with the lowest replay lag ignores health (pg-r3 is down) and the fact that received-but-not-yet-replayed WAL is not lost: a promoted standby finishes replaying everything it received before accepting writes.</p>`, code: lab(`SELECT name, replayed_lsn FROM replicas ORDER BY replayed_lsn DESC LIMIT 1;`, 'Naive: most replayed, health ignored') },
      mcq: { q: 'A standby has received WAL up to 5000 but replayed only to 4990. After promotion, transactions up to…', options: ['4990 survive; the rest are lost', '5000 survive — it replays received WAL before going read-write', 'nothing survives until pg_rewind runs', 'it depends on hot_standby_feedback'], answer: 1, explain: 'Promotion finishes replaying the WAL already on disk, so received (flushed) WAL is kept.' },
      hints: [
        `<p>Hint 1: Filter to healthy replicas and cross join the single primary row to get <code>current_lsn</code>.</p>`,
        `<p>Hint 2: <code>ORDER BY received_lsn DESC, replayed_lsn DESC, name</code> expresses the whole rule.</p>`,
        `<p>Hint 3: <code>LIMIT 1</code> keeps the winner; compute <code>current_lsn - received_lsn</code> in the SELECT list.</p>`
      ],
      tests: { engine: 'sqlite', cmp: 'exact', cases: [
        { cols: ['name', 'received_lsn', 'data_loss_bytes'], rows: [['pg-r1', 5000, 0]] },
        { setup: "UPDATE replicas SET healthy = 0 WHERE name = 'pg-r1'", rows: [['pg-r4', 4990, 10]] },
        { setup: "UPDATE replicas SET received_lsn = 5000, replayed_lsn = 5000 WHERE name = 'pg-r2'", rows: [['pg-r2', 5000, 0]] },
        { setup: "UPDATE replicas SET received_lsn = 4990 WHERE name = 'pg-r1'", rows: [['pg-r1', 4990, 10]] },
        { setup: "INSERT INTO replicas VALUES ('pg-r5', 'async', 1, 5000, 4995, 'az3')", rows: [['pg-r5', 5000, 0]] },
        { setup: 'UPDATE primary_state SET current_lsn = 5100', rows: [['pg-r1', 5000, 100]] }
      ] },
      solution: {
        approach: `<p>Health first, then data completeness (received), then replay progress (faster to become writable), then a deterministic tie-break. Patroni's leader race and Orchestrator's candidate selection follow the same idea, with extra rules such as <code>nofailover</code> tags and data-centre preferences.</p>`,
        code: lab(`SELECT r.name, r.received_lsn, p.current_lsn - r.received_lsn AS data_loss_bytes
FROM replicas r CROSS JOIN primary_state p
WHERE r.healthy = 1
ORDER BY r.received_lsn DESC, r.replayed_lsn DESC, r.name
LIMIT 1;`, 'Promotion candidate (▶ Run)'),
        complexity: `<p>O(R log R) for R replicas. In MySQL the comparison is between GTID sets (<code>GTID_SUBSET()</code>), not single numbers.</p>`,
        followUps: ['How would you express "prefer the same zone as the old primary" as an extra sort key?', 'Why must the old primary be fenced before promotion?']
      }
    }]
  });

  /* =====================================================================
     TOPIC 7 — JSON support and choosing between the engines
     ===================================================================== */
  topics.push({
    title: 'JSON Support and Choosing Between PostgreSQL and MySQL',
    analogy: `<p>PostgreSQL's <b>jsonb</b> is a <b>filing cabinet that sorts every letter into labelled folders</b> as it arrives: slower to file, very fast to find "every letter mentioning gift", and you can put an index card on any folder. MySQL's <b>JSON</b> type is a <b>well-bound notebook</b>: validated and quick to open at a page, and you add a tab (generated column or multi-valued index) for each question you ask often. Choosing the engine is like choosing a kitchen: both cook everything; the question is which gadgets your recipes need and which kitchen your cooks already know.</p>`,
    explain: `${H.table(['', 'PostgreSQL 16/17', 'MySQL 8.x'], [
  ['Types', '<code>json</code> (text, keeps whitespace, key order, duplicates) and <b><code>jsonb</code></b> (binary, keys deduplicated — last wins, not order-preserving)', '<code>JSON</code> (binary, validated on insert; duplicate keys: last wins, keys stored sorted)'],
  ['Read a field', '<code>meta-&gt;\'coupon\'</code> (jsonb), <code>meta-&gt;&gt;\'coupon\'</code> (text), <code>#&gt;</code> / <code>#&gt;&gt;</code> for paths', '<code>meta-&gt;\'$.coupon\'</code> (JSON), <code>meta-&gt;&gt;\'$.coupon\'</code> (unquoted text)'],
  ['Containment / existence', '<code>@&gt;</code>, <code>?</code>, <code>?|</code>, <code>?&amp;</code>, jsonpath <code>@?</code> <code>@@</code>', '<code>JSON_CONTAINS</code>, <code>JSON_CONTAINS_PATH</code>, <code>MEMBER OF</code>, <code>JSON_OVERLAPS</code>'],
  ['Indexing', '<b>GIN</b> on the whole document (<code>jsonb_ops</code> / <code>jsonb_path_ops</code>), or B-tree on an expression <code>((meta-&gt;&gt;\'coupon\'))</code>', 'no whole-document index: <b>generated column</b> + index, <b>functional index</b> with <code>CAST</code>, or <b>multi-valued index</b> for arrays (8.0.17)'],
  ['Arrays → rows', '<code>jsonb_array_elements</code>, <code>jsonb_to_recordset</code>, <code>JSON_TABLE</code> (PG17)', '<code>JSON_TABLE</code> (8.0.4+)'],
  ['Updates', 'whole-value rewrite (new tuple; TOAST for big docs) via <code>jsonb_set</code>, <code>||</code>, <code>-</code>', '<b>partial in-place update</b> with <code>JSON_SET/JSON_REPLACE/JSON_REMOVE</code>; binlog can log only the diff (<code>binlog_row_value_options=PARTIAL_JSON</code>)'],
  ['Standard SQL/JSON', 'PG16: <code>IS JSON</code>, <code>JSON_ARRAY()</code>, <code>JSON_OBJECT()</code>; PG17: <code>JSON_TABLE</code>, <code>JSON_EXISTS</code>, <code>JSON_QUERY</code>, <code>JSON_VALUE</code>', '<code>JSON_TABLE</code>, <code>JSON_VALUE</code> (8.0.21)']
])}
<p><b>Choosing.</b> Neither is "better"; the honest interview answer lists what tips the balance:</p>
${H.table(['Lean PostgreSQL when…', 'Lean MySQL when…'], [
  ['you need rich types and indexes: jsonb + GIN, arrays, ranges, exclusion constraints, partial indexes', 'the workload is simple, high-volume OLTP on primary-key access (clustered PK range scans)'],
  ['extensions matter: PostGIS, pgvector, TimescaleDB, pg_trgm, Citus', 'you want sharding with a mature ecosystem: Vitess (PlanetScale), ProxySQL'],
  ['you want <b>transactional DDL</b> (a failed migration rolls back completely)', 'operations team and tooling already run MySQL; replication topologies are well understood'],
  ['complex analytical SQL, strict typing, CHECK constraints everywhere', 'many connections are needed without a pooler (thread per connection vs process per connection — PostgreSQL usually needs PgBouncer)'],
  ['update-light, read/complex-query-heavy data', 'update-heavy rows on tables with many secondary indexes (no index churn on non-key updates)']
])}`,
    deepDive: `<p><b>Indexing a JSON field in MySQL correctly</b>: a functional index must match the query's expression and type exactly. <code>INDEX idx ((CAST(meta-&gt;&gt;'$.coupon' AS CHAR(16)) COLLATE utf8mb4_bin))</code> is used by <code>WHERE CAST(meta-&gt;&gt;'$.coupon' AS CHAR(16)) COLLATE utf8mb4_bin = 'SAVE10'</code>, because <code>-&gt;&gt;</code> returns a <code>utf8mb4_bin</code> string; a mismatch in collation silently disables it. Generated columns (<code>coupon VARCHAR(16) AS (meta-&gt;&gt;'$.coupon') VIRTUAL</code>, then an ordinary index) are the readable alternative.</p>
<p><b>DDL behaviour</b> also separates the engines. PostgreSQL DDL is transactional and many operations are instant (adding a nullable column or one with a constant default since 11) but take short <code>ACCESS EXCLUSIVE</code> locks that queue behind long queries — set <code>lock_timeout</code>. MySQL DDL causes an implicit commit; 8.0 made DDL <i>atomic</i> (crash-safe) but not transactional, and offers <code>ALGORITHM=INSTANT</code> (adding/dropping columns, 8.0.29+ anywhere in the table), <code>INPLACE</code> and <code>COPY</code>; big changes still use gh-ost or pt-online-schema-change.</p>`,
    aiEra: `<p><b>What AI changes:</b> JSON columns are the default output of LLM-backed features — tool-call arguments, extracted entities, model metadata — so "how do I query and index this JSON at scale?" is now a daily question. Assistants mix dialects freely: PostgreSQL's <code>-&gt;&gt;'key'</code> versus MySQL's <code>-&gt;&gt;'$.key'</code>, or <code>@&gt;</code> in a MySQL query. For vector search the comparison has shifted too: pgvector (HNSW, IVFFlat) is mature in PostgreSQL, while MySQL's VECTOR type arrived in 9.0 (Innovation releases) with indexing only in HeatWave. Engine choice for AI workloads often comes down to that.</p>`,
    clues: [
      '"query arbitrary keys in a JSON document" → PostgreSQL jsonb + GIN; MySQL needs a generated column or functional index per key',
      '"find rows whose tags array contains X" → PostgreSQL @&gt; with GIN; MySQL MEMBER OF / JSON_CONTAINS with a multi-valued index',
      '"key order / duplicate keys must be preserved" → PostgreSQL json (not jsonb)',
      '"failed migration left the schema half-changed" → MySQL DDL implicitly commits; PostgreSQL DDL is transactional',
      '"10,000 client connections" → PostgreSQL needs a pooler (PgBouncer); MySQL threads handle more, still pool in practice',
      '"geo, vector, time-series in the same database" → PostgreSQL extensions (PostGIS, pgvector, TimescaleDB)'
    ],
    code: [
      lab(`-- SQLite's JSON functions behave like MySQL's '$.path' style.
SELECT id,
       meta ->> '$.channel'          AS channel,
       meta ->> '$.coupon'           AS coupon,
       json_array_length(meta, '$.tags') AS n_tags
FROM orders ORDER BY id;`, 'Read JSON fields (▶ Run)'),
      lab(`-- Unnest an array: one row per (order, tag). PostgreSQL: jsonb_array_elements_text(meta->'tags').
SELECT o.id, t.value AS tag
FROM orders o, json_each(o.meta, '$.tags') t
ORDER BY o.id, t.value;`, 'Array to rows (▶ Run)'),
      pg(`-- PostgreSQL jsonb
SELECT id, meta->>'coupon' AS coupon FROM orders WHERE meta @> '{"tags": ["gift"]}';
CREATE INDEX idx_orders_meta ON orders USING gin (meta jsonb_path_ops);     -- serves @> and jsonpath
CREATE INDEX idx_orders_coupon ON orders ((meta->>'coupon'));                -- B-tree on one key
SELECT tag, count(*) FROM orders, jsonb_array_elements_text(meta->'tags') AS tag GROUP BY tag;
SELECT * FROM JSON_TABLE(                                                     -- PostgreSQL 17
  (SELECT meta FROM orders WHERE id = 1), '$.tags[*]' COLUMNS (tag text PATH '$')) AS jt;
UPDATE orders SET meta = jsonb_set(meta, '{coupon}', '"SAVE20"') WHERE id = 3;`, 'PostgreSQL jsonb'),
      my(`-- MySQL JSON
SELECT id, meta->>'$.coupon' AS coupon FROM orders WHERE JSON_CONTAINS(meta->'$.tags', '"gift"');
ALTER TABLE orders ADD COLUMN coupon VARCHAR(16) AS (meta->>'$.coupon') VIRTUAL, ADD INDEX idx_coupon (coupon);
ALTER TABLE orders ADD INDEX idx_tags ((CAST(meta->'$.tags' AS CHAR(16) ARRAY)));
SELECT id FROM orders WHERE 'gift' MEMBER OF (meta->'$.tags');                -- uses idx_tags
SELECT jt.tag, COUNT(*) FROM orders,
  JSON_TABLE(meta, '$.tags[*]' COLUMNS (tag VARCHAR(16) PATH '$')) AS jt GROUP BY jt.tag;
UPDATE orders SET meta = JSON_SET(meta, '$.coupon', 'SAVE20') WHERE id = 3;    -- can be a partial in-place update`, 'MySQL JSON')
    ],
    codeTitle: ['JSON fields', 'Unnest', 'PostgreSQL', 'MySQL'],
    viz: {
      title: 'Find orders tagged "gift": what each engine does',
      input: 'postgres',
      inputLabel: 'engine: postgres | mysql',
      gen: function (input) {
        var e = pick(input, ['postgres', 'mysql'], 'postgres'), f = [];
        var docs = [['1', '{"tags":["gift","rush"]}'], ['2', '{"tags":["rush"]}'], ['3', '{"tags":["gift"]}'], ['6', '{"tags":["bulk","gift"]}'], ['8', '{"tags":["rush","bulk"]}']];
        f.push({ narr: 'Orders with a JSON <code>meta</code> column. Goal: every order whose tags array contains "gift".', parts: [tbl('orders.meta', ['id', 'meta'], docs)] });
        if (e === 'postgres') {
          f.push({ narr: 'PostgreSQL: <code>WHERE meta @&gt; \'{"tags":["gift"]}\'</code>. With a GIN index (<code>jsonb_path_ops</code>), each path+value is hashed into the index once, at write time.', parts: [{ type: 'map', label: 'GIN (jsonb_path_ops) keys', entries: [['tags→bulk', '6, 8'], ['tags→gift', '1, 3, 6'], ['tags→rush', '1, 2, 8']] }] });
          f.push({ narr: 'The query looks up the single key <b>tags→gift</b> and gets candidate rows 1, 3, 6 — a Bitmap Index Scan.', parts: [{ type: 'map', label: 'GIN (jsonb_path_ops) keys', entries: [['tags→bulk', '6, 8'], ['tags→gift', '1, 3, 6'], ['tags→rush', '1, 2, 8']], hl: { 'tags→gift': 'ok' } }] });
          f.push({ narr: 'Bitmap Heap Scan fetches those rows and rechecks (hash collisions are possible). The same index also serves <code>@&gt; \'{"channel":"web"}\'</code> — no per-key DDL needed.', parts: [tbl('result', ['id', 'meta'], [docs[0], docs[2], docs[3]], { 0: 'ok', 1: 'ok', 2: 'ok' })] });
          f.push({ narr: 'Costs: GIN writes on every insert/update of meta, and any change rewrites the whole jsonb value as a new tuple version.', parts: [vars('trade-off', { reads: 'any containment query, one index', writes: 'heavier' })] });
        } else {
          f.push({ narr: 'MySQL: no index over the whole document. You declare a <b>multi-valued index</b> on exactly the array you query: <code>INDEX ((CAST(meta-&gt;\'$.tags\' AS CHAR(16) ARRAY)))</code>.', parts: [{ type: 'map', label: 'multi-valued index entries', entries: [['bulk', '6, 8'], ['gift', '1, 3, 6'], ['rush', '1, 2, 8']] }] });
          f.push({ narr: '<code>WHERE \'gift\' MEMBER OF (meta-&gt;\'$.tags\')</code> (or JSON_CONTAINS / JSON_OVERLAPS) matches the indexed expression → index range lookup on "gift".', parts: [{ type: 'map', label: 'multi-valued index entries', entries: [['bulk', '6, 8'], ['gift', '1, 3, 6'], ['rush', '1, 2, 8']], hl: { gift: 'ok' } }] });
          f.push({ narr: 'Rows 1, 3, 6 are fetched through the clustered index. A query on <code>$.channel</code> would need its own generated column or functional index.', parts: [tbl('result', ['id', 'meta'], [docs[0], docs[2], docs[3]], { 0: 'ok', 1: 'ok', 2: 'ok' })] });
          f.push({ narr: 'Strength on the write side: <code>JSON_SET</code> can update the value in place and log only the change, which suits large documents with small edits.', parts: [vars('trade-off', { reads: 'one index per question', writes: 'partial in-place updates' })] });
        }
        return f;
      }
    },
    examples: [
      { title: 'Revenue per coupon from JSON', html: `<p>A finance query reads a key that only some documents have. Missing keys return NULL in both engines (<code>-&gt;&gt;</code>), so filter them out explicitly.</p>`, code: lab(`SELECT meta ->> '$.coupon' AS coupon, COUNT(*) AS orders, SUM(total) AS revenue
FROM orders
WHERE meta ->> '$.coupon' IS NOT NULL
GROUP BY coupon ORDER BY revenue DESC;`, 'Coupon revenue (▶ Run)') },
      { title: 'jsonb normalises, json preserves', html: `<p>In PostgreSQL <code>SELECT '{"a":1,"a":2}'::jsonb</code> returns <code>{"a": 2}</code> and key order may change; <code>::json</code> returns the text unchanged. If you store signed webhook payloads whose bytes must verify later, keep them as <code>json</code> or <code>text</code>, and use <code>jsonb</code> for querying.</p>` },
      { title: 'A choice, argued in one minute', html: `<p>"A marketplace with product attributes in JSON, geo search for sellers, and a team new to both engines: <b>PostgreSQL</b> — jsonb + GIN and PostGIS solve two core features without extra systems. A high-write ledger at a company that runs 400 MySQL clusters with Vitess: <b>MySQL</b> — the operational knowledge and sharding path outweigh feature differences." Interviewers reward naming the deciding requirement and the trade-off you accept.</p>`, code: lab(`SELECT SUM(weight * pg_score) AS postgres, SUM(weight * my_score) AS mysql FROM requirements;`, 'Weighted score (▶ Run)') }
    ],
    problems: [{
      title: 'Tag Popularity for Web Orders',
      level: 'Medium', tags: ['json', 'json_each', 'unnest'], companies: ['Etsy', 'Meesho', 'Shopify'],
      statement: `<p>Marketing wants tag counts for orders placed on the <b>web</b> channel. <code>orders.meta</code> is JSON like <code>{"channel":"web","tags":["gift","rush"]}</code>; some orders have no <code>tags</code> key. Return <code>tag, n</code> (number of web orders with that tag) ordered by <code>n</code> descending, then <code>tag</code> ascending.</p>`,
      constraints: `<p>SQLite JSON functions (<code>-&gt;&gt;</code>, <code>json_each</code>). Tags are case-sensitive; an order does not repeat a tag. <code>lab</code> database.</p>`,
      example: `<p>Web orders 1, 3, 4, 6, 8 → ${H.c('g', 'gift 3, bulk 2, rush 2')}. Order 2 (app) with "rush" does not count.</p>`,
      brute: { why: `<p>Using <code>LIKE '%gift%'</code> on the raw text per known tag needs one query per tag, matches substrings such as "gifted", and cannot discover new tags. Unnesting the array is both correct and general.</p>`, code: lab(`SELECT 'gift' AS tag, COUNT(*) AS n FROM orders WHERE meta LIKE '%"channel":"web"%' AND meta LIKE '%gift%';`, 'Naive: LIKE per tag') },
      mcq: { q: 'In PostgreSQL, which function turns a jsonb array into one row per element (as text)?', options: ['jsonb_each', 'jsonb_array_elements_text', 'jsonb_object_keys', 'json_typeof'], answer: 1, explain: 'jsonb_array_elements_text unnests an array to text rows; jsonb_each unnests an object into key/value rows.' },
      hints: [
        `<p>Hint 1: <code>json_each(meta, '$.tags')</code> in the FROM clause produces one row per array element, with the element in <code>value</code>.</p>`,
        `<p>Hint 2: Filter with <code>meta -&gt;&gt; '$.channel' = 'web'</code>. Orders without a tags key simply produce no rows from json_each.</p>`,
        `<p>Hint 3: <code>GROUP BY</code> the tag value, <code>COUNT(*)</code>, then <code>ORDER BY n DESC, tag</code>.</p>`
      ],
      tests: { engine: 'sqlite', cmp: 'exact', cases: [
        { cols: ['tag', 'n'], rows: [['gift', 3], ['bulk', 2], ['rush', 2]] },
        { setup: "UPDATE orders SET meta = '{\"channel\":\"app\"}' WHERE id = 1", rows: [['bulk', 2], ['gift', 2], ['rush', 1]] },
        { setup: "INSERT INTO orders VALUES (9, 106, 'paid', 'fay@x.io', 100, '2026-01-12', '{\"channel\":\"web\",\"tags\":[\"vip\"]}')", rows: [['gift', 3], ['bulk', 2], ['rush', 2], ['vip', 1]] },
        { setup: 'DELETE FROM orders WHERE id = 8', rows: [['gift', 3], ['bulk', 1], ['rush', 1]] },
        { setup: "UPDATE orders SET meta = '{\"channel\":\"web\",\"tags\":[\"rush\"]}' WHERE id = 5", rows: [['gift', 3], ['rush', 3], ['bulk', 2]] },
        { setup: "UPDATE orders SET meta = '{\"channel\":\"web\",\"tags\":[\"Gift\"]}' WHERE id = 4", rows: [['gift', 3], ['bulk', 2], ['rush', 2], ['Gift', 1]] }
      ] },
      solution: {
        approach: `<p>Unnest, filter, aggregate. PostgreSQL: <code>FROM orders, jsonb_array_elements_text(meta-&gt;'tags') AS tag WHERE meta-&gt;&gt;'channel' = 'web'</code>; MySQL: <code>JSON_TABLE(meta, '$.tags[*]' COLUMNS (tag VARCHAR(32) PATH '$'))</code>. The shape is identical in all three.</p>`,
        code: lab(`SELECT t.value AS tag, COUNT(*) AS n
FROM orders o, json_each(o.meta, '$.tags') t
WHERE o.meta ->> '$.channel' = 'web'
GROUP BY t.value
ORDER BY n DESC, tag;`, 'Tag counts (▶ Run)'),
        complexity: `<p>O(total tags) to unnest plus a group-by. With a GIN index PostgreSQL can answer "orders with tag X" without scanning, but a full tag histogram always reads every document.</p>`,
        followUps: ['How would you make the per-tag lookup indexed in MySQL?', 'Would you normalise tags into their own table instead? When?']
      }
    }]
  });

  /* =====================================================================
     PRACTICE ARENA
     ===================================================================== */
  practice.push({
    title: 'Which Tables Are Due for Autovacuum?',
    level: 'Easy', tags: ['postgresql', 'autovacuum', 'monitoring'], companies: ['Heroku', 'Crunchy Data', 'Razorpay'],
    statement: `<p>PostgreSQL starts autovacuum on a table when <code>n_dead_tup &gt; base_threshold + scale_factor × n_live_tup</code> (server defaults: threshold 50, scale factor 0.2; a NULL in <code>table_stats</code> means "use the default"). Return <code>relname, n_dead_tup, trigger_at</code> for every table that is due, with <code>trigger_at</code> rounded to an integer, ordered by <code>relname</code>.</p>`,
    constraints: `<p>Strictly greater than the trigger. <code>lab</code> database.</p>`,
    example: `<p>sessions: 50 + 0.2 × 20,000 = 4,050 and it has 9,000 dead → ${H.c('g', 'due')}. orders: 200,050 needed, only 150,000 dead → ${H.c('r', 'not due')} — the classic "big table never vacuums" problem.</p>`,
    brute: { why: `<p>Ignoring per-table overrides (the NULL vs set values) gets <code>events</code> wrong: with the default 20% it would need 10 million dead tuples, but its override of 1% + 1000 makes it due now.</p>`, code: lab(`SELECT relname FROM table_stats WHERE n_dead_tup > 50 + 0.2 * n_live_tup ORDER BY relname;`, 'Naive: defaults only') },
    mcq: { q: 'A 1-billion-row table with default settings starts autovacuum after roughly how many dead tuples?', options: ['50', '1 million', '200 million', '1 billion'], answer: 2, explain: '50 + 0.2 × 1e9 ≈ 200 million — far too late, which is why large tables get per-table settings.' },
    hints: [
      `<p>Hint 1: <code>COALESCE(base_threshold, 50)</code> and <code>COALESCE(scale_factor, 0.2)</code> turn NULL into the default.</p>`,
      `<p>Hint 2: Build the trigger in a CTE so you can use it both in the SELECT list and the WHERE clause.</p>`,
      `<p>Hint 3: <code>CAST(ROUND(x) AS INTEGER)</code> gives a clean integer; keep the comparison strict (&gt;).</p>`
    ],
    tests: { engine: 'sqlite', cmp: 'exact', cases: [
      { cols: ['relname', 'n_dead_tup', 'trigger_at'], rows: [['carts', 1100, 1050], ['events', 600000, 501000], ['sessions', 9000, 4050]] },
      { setup: "UPDATE table_stats SET scale_factor = 0.1 WHERE relname = 'orders'", rows: [['carts', 1100, 1050], ['events', 600000, 501000], ['orders', 150000, 100050], ['sessions', 9000, 4050]] },
      { setup: "UPDATE table_stats SET n_dead_tup = 91 WHERE relname = 'users'", rows: [['carts', 1100, 1050], ['events', 600000, 501000], ['sessions', 9000, 4050], ['users', 91, 90]] },
      { setup: "UPDATE table_stats SET n_dead_tup = 90 WHERE relname = 'users'", rows: [['carts', 1100, 1050], ['events', 600000, 501000], ['sessions', 9000, 4050]] },
      { setup: "UPDATE table_stats SET scale_factor = NULL WHERE relname = 'events'", rows: [['carts', 1100, 1050], ['sessions', 9000, 4050]] },
      { setup: "DELETE FROM table_stats WHERE relname = 'sessions'", rows: [['carts', 1100, 1050], ['events', 600000, 501000]] }
    ] },
    solution: {
      approach: `<p>Resolve the effective settings per table, compute the trigger, keep the tables above it. In production the same arithmetic on <code>pg_stat_user_tables</code> joined with <code>pg_class.reloptions</code> tells you which tables autovacuum is about to visit.</p>`,
      code: lab(`WITH t AS (
  SELECT relname, n_dead_tup,
         COALESCE(base_threshold, 50) + COALESCE(scale_factor, 0.2) * n_live_tup AS trig
  FROM table_stats
)
SELECT relname, n_dead_tup, CAST(ROUND(trig) AS INTEGER) AS trigger_at
FROM t WHERE n_dead_tup > trig
ORDER BY relname;`, 'Autovacuum due (▶ Run)'),
      complexity: `<p>O(T log T) over the table list.</p>`,
      followUps: ['What separate threshold triggers vacuum for insert-only tables since PostgreSQL 13?', 'Why might autovacuum still not keep up even when triggered?']
    }
  });

  practice.push({
    title: 'MySQL EXPLAIN Red Flags',
    level: 'Easy', tags: ['mysql', 'explain', 'triage'], companies: ['Booking.com', 'Paytm', 'Wayfair'],
    statement: `<p><code>mysql_explain</code> holds classic EXPLAIN rows. List every row that shows a full table scan (<code>access_type = 'ALL'</code>), a filesort or a temporary table (in <code>extra</code>). Return <code>query, access_type, rows_est</code> ordered by <code>rows_est</code> descending, then <code>query</code>.</p>`,
    constraints: `<p><code>extra</code> may be NULL. Text matching is case-sensitive as MySQL prints it ("Using filesort", "Using temporary"). <code>lab</code> database.</p>`,
    example: `<p>Q1 (ALL, 980,000 rows), Q5 (Using temporary, 980,000) and Q3 (Using filesort, 5,400) → ${H.c('r', '3 rows')}. Q2's <code>ref</code> and Q4's <code>eq_ref</code> are healthy.</p>`,
    brute: { why: `<p>Filtering only on <code>access_type = 'ALL'</code> misses Q5, which reads the whole <i>index</i> (<code>type = index</code>) and builds a temporary table — just as expensive.</p>`, code: lab(`SELECT query, access_type, rows_est FROM mysql_explain WHERE access_type = 'ALL';`, 'Naive: only ALL') },
    mcq: { q: 'In MySQL EXPLAIN, which access type is the worst?', options: ['const', 'ref', 'range', 'ALL'], answer: 3, explain: 'ALL is a full table scan; const/eq_ref/ref/range use an index.' },
    hints: [
      `<p>Hint 1: Three conditions joined with <code>OR</code>.</p>`,
      `<p>Hint 2: <code>extra LIKE '%Using filesort%'</code> is false (NULL) when extra is NULL, which is what you want.</p>`,
      `<p>Hint 3: Sort with <code>ORDER BY rows_est DESC, query</code>.</p>`
    ],
    tests: { engine: 'sqlite', cmp: 'exact', cases: [
      { cols: ['query', 'access_type', 'rows_est'], rows: [['Q1', 'ALL', 980000], ['Q5', 'index', 980000], ['Q3', 'range', 5400]] },
      { setup: "UPDATE mysql_explain SET extra = 'Using filesort' WHERE query = 'Q2'", rows: [['Q1', 'ALL', 980000], ['Q5', 'index', 980000], ['Q3', 'range', 5400], ['Q2', 'ref', 12]] },
      { setup: "DELETE FROM mysql_explain WHERE query = 'Q1'", rows: [['Q5', 'index', 980000], ['Q3', 'range', 5400]] },
      { setup: "UPDATE mysql_explain SET access_type = 'ALL' WHERE query = 'Q4'", rows: [['Q1', 'ALL', 980000], ['Q5', 'index', 980000], ['Q3', 'range', 5400], ['Q4', 'ALL', 1]] },
      { setup: "UPDATE mysql_explain SET extra = 'Using index condition' WHERE query = 'Q3'", rows: [['Q1', 'ALL', 980000], ['Q5', 'index', 980000]] },
      { setup: "INSERT INTO mysql_explain VALUES ('Q6', 'orders', 'ref', 'idx_customer', 50, 100.0, 'Using temporary; Using filesort')", rows: [['Q1', 'ALL', 980000], ['Q5', 'index', 980000], ['Q3', 'range', 5400], ['Q6', 'ref', 50]] }
    ] },
    solution: {
      approach: `<p>Encode the three red flags as predicates. Then prioritise by estimated rows: a filesort of 50 rows is harmless, a temporary table over 980,000 rows is not. Next step for each: check whether an index in the right column order would remove the flag.</p>`,
      code: lab(`SELECT query, access_type, rows_est
FROM mysql_explain
WHERE access_type = 'ALL'
   OR extra LIKE '%Using filesort%'
   OR extra LIKE '%Using temporary%'
ORDER BY rows_est DESC, query;`, 'Red flags (▶ Run)'),
      complexity: `<p>O(n log n) over EXPLAIN rows.</p>`,
      followUps: ['Which index would remove the filesort in Q3 (range on created_at, ORDER BY total)?', 'How does EXPLAIN FORMAT=TREE show the same information?']
    }
  });

  practice.push({
    title: 'Replica Lag Dashboard',
    level: 'Easy', tags: ['replication', 'monitoring', 'lsn'], companies: ['GitLab', 'Freshworks', 'Cloudflare'],
    statement: `<p>For every <b>healthy</b> replica return <code>name, receive_lag, replay_lag, status</code>: lags are <code>current_lsn</code> of the primary minus <code>received_lsn</code> / <code>replayed_lsn</code>; <code>status</code> is <code>'lagging'</code> when <code>replay_lag &gt; 50</code>, else <code>'ok'</code>. Order by <code>name</code>.</p>`,
    constraints: `<p>One row in <code>primary_state</code>. <code>lab</code> database.</p>`,
    example: `<p>pg-r2: receive lag 200, replay lag 300 → ${H.c('r', 'lagging')}. pg-r1: 0 and 10 → ${H.c('g', 'ok')}.</p>`,
    brute: { why: `<p>Reporting only receive lag hides replicas that have the WAL but are slow to apply it (busy disk, replay blocked by a conflicting query); readers on that replica still see stale data.</p>`, code: lab(`SELECT r.name, p.current_lsn - r.received_lsn AS lag FROM replicas r, primary_state p ORDER BY r.name;`, 'Naive: receive lag only') },
    mcq: { q: 'In PostgreSQL, which view on the primary shows per-standby sent/flush/replay positions?', options: ['pg_stat_activity', 'pg_stat_replication', 'pg_locks', 'pg_stat_user_tables'], answer: 1, explain: 'pg_stat_replication has sent_lsn, write_lsn, flush_lsn, replay_lsn and lag times per WAL sender.' },
    hints: [
      `<p>Hint 1: Cross join the single <code>primary_state</code> row with <code>replicas</code>.</p>`,
      `<p>Hint 2: Keep only <code>healthy = 1</code>; unhealthy replicas are not serving reads anyway.</p>`,
      `<p>Hint 3: A <code>CASE WHEN … &gt; 50 THEN 'lagging' ELSE 'ok' END</code> produces the status.</p>`
    ],
    tests: { engine: 'sqlite', cmp: 'exact', cases: [
      { cols: ['name', 'receive_lag', 'replay_lag', 'status'], rows: [['pg-r1', 0, 10, 'ok'], ['pg-r2', 200, 300, 'lagging'], ['pg-r4', 10, 10, 'ok']] },
      { setup: 'UPDATE primary_state SET current_lsn = 5045', rows: [['pg-r1', 45, 55, 'lagging'], ['pg-r2', 245, 345, 'lagging'], ['pg-r4', 55, 55, 'lagging']] },
      { setup: 'UPDATE primary_state SET current_lsn = 5040', rows: [['pg-r1', 40, 50, 'ok'], ['pg-r2', 240, 340, 'lagging'], ['pg-r4', 50, 50, 'ok']] },
      { setup: "UPDATE replicas SET healthy = 1 WHERE name = 'pg-r3'", rows: [['pg-r1', 0, 10, 'ok'], ['pg-r2', 200, 300, 'lagging'], ['pg-r3', 0, 0, 'ok'], ['pg-r4', 10, 10, 'ok']] },
      { setup: "UPDATE replicas SET healthy = 0 WHERE name IN ('pg-r1', 'pg-r4')", rows: [['pg-r2', 200, 300, 'lagging']] },
      { setup: "UPDATE replicas SET replayed_lsn = 4800 WHERE name = 'pg-r2'", rows: [['pg-r1', 0, 10, 'ok'], ['pg-r2', 200, 200, 'lagging'], ['pg-r4', 10, 10, 'ok']] }
    ] },
    solution: {
      approach: `<p>Two subtractions and a threshold. In PostgreSQL use <code>pg_wal_lsn_diff(pg_current_wal_lsn(), replay_lsn)</code>; in MySQL compare GTID sets or read <code>Seconds_Behind_Source</code> (time-based and misleading when the replica is idle or the SQL thread is stopped).</p>`,
      code: lab(`SELECT r.name,
       p.current_lsn - r.received_lsn AS receive_lag,
       p.current_lsn - r.replayed_lsn AS replay_lag,
       CASE WHEN p.current_lsn - r.replayed_lsn > 50 THEN 'lagging' ELSE 'ok' END AS status
FROM replicas r CROSS JOIN primary_state p
WHERE r.healthy = 1
ORDER BY r.name;`, 'Lag dashboard (▶ Run)'),
      complexity: `<p>O(R log R) for R replicas, one pass plus a sort.</p>`,
      followUps: ['Why is Seconds_Behind_Source unreliable?', 'How would you alert on lag in time rather than bytes?']
    }
  });

  practice.push({
    title: 'Score the Engine Decision',
    level: 'Easy', tags: ['decision', 'trade-offs', 'aggregation'], companies: ['Thoughtworks', 'Postman', 'Notion'],
    statement: `<p>The team scored each requirement 1–5 for PostgreSQL and MySQL and gave it a weight (<code>requirements</code>). Return one row <code>postgres, mysql, choice</code> with the weighted sums and <code>choice</code> = <code>'PostgreSQL'</code>, <code>'MySQL'</code>, or <code>'either'</code> on a tie.</p>`,
    constraints: `<p>Weights and scores are non-negative integers; the table is not empty. <code>lab</code> database.</p>`,
    example: `<p>PostgreSQL 3×5 + 2×5 + 3×2 + 1×3 + 2×5 = ${H.c('g', '44')}; MySQL 3×3 + 2×2 + 3×5 + 1×5 + 2×2 = 37 → ${H.c('g', 'PostgreSQL')}.</p>`,
    brute: { why: `<p>Summing raw scores without weights treats "team already runs MySQL" the same as "nice-to-have PK range scans", which is how weighted decision matrices get gamed.</p>`, code: lab(`SELECT SUM(pg_score) AS postgres, SUM(my_score) AS mysql FROM requirements;`, 'Naive: unweighted') },
    mcq: { q: 'Which requirement most clearly favours PostgreSQL?', options: ['Transactional DDL for safe migrations', 'Clustered primary-key range scans', 'An existing Vitess deployment', 'Thread-per-connection handling of many clients'], answer: 0, explain: 'PostgreSQL DDL runs inside transactions; MySQL DDL causes an implicit commit.' },
    hints: [
      `<p>Hint 1: <code>SUM(weight * pg_score)</code> and <code>SUM(weight * my_score)</code>.</p>`,
      `<p>Hint 2: Compute the two sums in a subquery, then compare them in the outer query.</p>`,
      `<p>Hint 3: A three-way <code>CASE</code>: greater, less, else 'either'.</p>`
    ],
    tests: { engine: 'sqlite', cmp: 'exact', cases: [
      { cols: ['postgres', 'mysql', 'choice'], rows: [[44, 37, 'PostgreSQL']] },
      { setup: "UPDATE requirements SET weight = 6 WHERE need = 'team already runs MySQL'", rows: [[50, 52, 'MySQL']] },
      { setup: "DELETE FROM requirements WHERE need = 'geo queries (PostGIS)'", rows: [[34, 33, 'PostgreSQL']] },
      { setup: "INSERT INTO requirements VALUES ('ops cost', 7, 0, 1)", rows: [[44, 44, 'either']] },
      { setup: 'UPDATE requirements SET weight = 0', rows: [[0, 0, 'either']] },
      { setup: "UPDATE requirements SET my_score = 5", rows: [[44, 55, 'MySQL']] }
    ] },
    solution: {
      approach: `<p>Aggregate once, compare once. The real value of the exercise is the discussion around the weights: write down the deciding requirement and what you give up.</p>`,
      code: lab(`SELECT postgres, mysql,
       CASE WHEN postgres > mysql THEN 'PostgreSQL'
            WHEN mysql > postgres THEN 'MySQL'
            ELSE 'either' END AS choice
FROM (SELECT SUM(weight * pg_score) AS postgres, SUM(weight * my_score) AS mysql FROM requirements);`, 'Weighted decision (▶ Run)'),
      complexity: `<p>O(n) over the requirement rows, one aggregate pass.</p>`,
      followUps: ['Which single requirement flips the decision most easily?', 'What would you add for a multi-region product?']
    }
  });

  practice.push({
    title: 'Make the InnoDB-Style Lookup Covering',
    level: 'Medium', tags: ['covering index', 'clustered key', 'explain'], companies: ['Amazon', 'Flipkart', 'Pinterest'],
    statement: `<p>A hot endpoint runs <code>SELECT id, total FROM orders WHERE customer_id = ? ORDER BY total</code>. Like an InnoDB secondary index, every SQLite index entry already carries the row key (<code>id</code>, the rowid). Create an index named <code>idx_customer_total</code> so the query is answered <b>from the index alone, already sorted</b>, then show the plan for <code>customer_id = 101</code>.</p>`,
    constraints: `<p>The last statement must be the <code>EXPLAIN QUERY PLAN</code>. The plan must say COVERING INDEX and must not need a temporary B-tree for the ORDER BY. <code>lab</code> database.</p>`,
    example: `<p>Plan: ${H.c('g', 'SEARCH orders USING COVERING INDEX idx_customer_total (customer_id=?)')}.</p>`,
    brute: { why: `<p>An index on <code>customer_id</code> alone finds the rows but must visit the table for <code>total</code> (the InnoDB "double lookup") and sort them with a temporary B-tree.</p>`, code: lab(`CREATE INDEX idx_customer ON orders (customer_id);
EXPLAIN QUERY PLAN SELECT id, total FROM orders WHERE customer_id = 101 ORDER BY total;`, 'Naive: single-column index') },
    mcq: { q: 'In InnoDB, INDEX(customer_id, total) covers SELECT id, total … because…', options: ['InnoDB copies every column into each index', 'secondary index entries include the primary key columns', 'the optimizer reads the clustered index anyway', 'covering is automatic for small tables'], answer: 1, explain: 'Secondary entries are (indexed columns, PK), so id comes for free.' },
    hints: [
      `<p>Hint 1: Equality column first, then the ORDER BY column: <code>(customer_id, total)</code>.</p>`,
      `<p>Hint 2: <code>id</code> is the rowid, stored in every index entry automatically, like the InnoDB PK.</p>`,
      `<p>Hint 3: End with <code>EXPLAIN QUERY PLAN SELECT id, total FROM orders WHERE customer_id = 101 ORDER BY total;</code></p>`
    ],
    tests: { engine: 'sqlite', check: PLANCHECK, cases: [
      { plan: ['SEARCH orders USING COVERING INDEX idx_customer_total'], noplan: ['TEMP B-TREE', 'SCAN'] },
      { after: "SELECT name FROM pragma_index_info('idx_customer_total') ORDER BY seqno", rows: [['customer_id'], ['total']] },
      { after: 'SELECT id, total FROM orders WHERE customer_id = 101 ORDER BY total', rows: [[3, 2500], [1, 4999]] },
      { after: 'EXPLAIN QUERY PLAN SELECT id, total FROM orders WHERE customer_id = 103 ORDER BY total', plan: ['COVERING INDEX idx_customer_total'], noplan: ['TEMP B-TREE'] },
      { setup: "INSERT INTO orders VALUES (9, 101, 'paid', 'asha@x.io', 10, '2026-01-12', NULL)", after: 'SELECT id, total FROM orders WHERE customer_id = 101 ORDER BY total', rows: [[9, 10], [3, 2500], [1, 4999]] },
      { after: 'EXPLAIN QUERY PLAN SELECT id, status FROM orders WHERE customer_id = 101 ORDER BY total', noplan: ['COVERING'] }
    ] },
    solution: {
      approach: `<p>Composite index (equality column, sort column). The row key rides along in each entry, so <code>id</code> needs no table visit, and entries for one customer are already ordered by total. In MySQL the identical index gives <code>Extra: Using index</code> with no filesort; in PostgreSQL you would write <code>(customer_id, total) INCLUDE (id)</code> or add <code>id</code> as a key column, and the index-only scan still depends on the visibility map.</p>`,
      code: lab(`CREATE INDEX idx_customer_total ON orders (customer_id, total);
EXPLAIN QUERY PLAN
SELECT id, total FROM orders WHERE customer_id = 101 ORDER BY total;`, 'Covering index (▶ Run)'),
      complexity: `<p>O(log n + k) for k matching rows, with no table lookups and no sort.</p>`,
      followUps: ['Why does selecting status break the covering property?', 'What extra condition does PostgreSQL need for an index-only scan to skip the heap?']
    }
  });

  practice.push({
    title: 'Would This UPDATE Be HOT?',
    level: 'Medium', tags: ['postgresql', 'hot update', 'json_each'], companies: ['Supabase', 'Neon', 'Zerodha'],
    statement: `<p>For each row of <code>update_log</code> decide what PostgreSQL does. <code>changed_cols</code> is a JSON array of changed columns; <code>indexed_cols</code> lists columns covered by a B-tree index. Verdict: <code>'indexed column changed'</code> if any changed column is indexed; otherwise <code>'no room on page'</code> if <code>page_free_bytes &lt; new_tuple_bytes</code>; otherwise <code>'HOT'</code>. Return <code>upd_id, verdict</code> ordered by <code>upd_id</code>.</p>`,
    constraints: `<p>The indexed-column rule takes priority. Use <code>json_each</code> to read the array. <code>lab</code> database.</p>`,
    example: `<p>Update 1 changes only status, page has 400 free for a 120-byte tuple → ${H.c('g', 'HOT')}. Update 3 changes email (indexed) → ${H.c('r', 'indexed column changed')}.</p>`,
    brute: { why: `<p>Matching with <code>changed_cols LIKE '%email%'</code> breaks on column names that contain each other (<code>email</code> vs <code>email_verified</code>) and needs one LIKE per indexed column. Unnesting the array and joining is exact.</p>`, code: lab(`SELECT upd_id, CASE WHEN changed_cols LIKE '%email%' THEN 'indexed column changed' ELSE 'HOT' END AS verdict
FROM update_log ORDER BY upd_id;`, 'Naive: LIKE matching') },
    mcq: { q: 'Which change makes more UPDATEs eligible for HOT in PostgreSQL?', options: ['Lowering the table fillfactor to leave free space on pages', 'Adding an index on the updated column', 'Raising work_mem', 'Switching to SERIALIZABLE'], answer: 0, explain: 'HOT needs room on the same page; fillfactor reserves it. Indexing the updated column prevents HOT.' },
    hints: [
      `<p>Hint 1: <code>EXISTS (SELECT 1 FROM json_each(u.changed_cols) j JOIN indexed_cols i ON i.col = j.value)</code> detects an indexed change.</p>`,
      `<p>Hint 2: Put that test first in a <code>CASE</code>, then the free-space test.</p>`,
      `<p>Hint 3: Exactly equal free space and tuple size fits: use <code>&lt;</code> for "no room".</p>`
    ],
    tests: { engine: 'sqlite', cmp: 'exact', cases: [
      { cols: ['upd_id', 'verdict'], rows: [[1, 'HOT'], [2, 'no room on page'], [3, 'indexed column changed'], [4, 'HOT'], [5, 'indexed column changed']] },
      { setup: "INSERT INTO indexed_cols VALUES ('status')", rows: [[1, 'indexed column changed'], [2, 'indexed column changed'], [3, 'indexed column changed'], [4, 'HOT'], [5, 'indexed column changed']] },
      { setup: 'UPDATE update_log SET page_free_bytes = 119 WHERE upd_id = 4', rows: [[1, 'HOT'], [2, 'no room on page'], [3, 'indexed column changed'], [4, 'no room on page'], [5, 'indexed column changed']] },
      { setup: "DELETE FROM indexed_cols WHERE col = 'email'", rows: [[1, 'HOT'], [2, 'no room on page'], [3, 'HOT'], [4, 'HOT'], [5, 'indexed column changed']] },
      { setup: "UPDATE update_log SET changed_cols = '[]' WHERE upd_id = 5", rows: [[1, 'HOT'], [2, 'no room on page'], [3, 'indexed column changed'], [4, 'HOT'], [5, 'HOT']] },
      { setup: "INSERT INTO update_log VALUES (6, '[\"email_verified\",\"total\"]', 10, 120)", rows: [[1, 'HOT'], [2, 'no room on page'], [3, 'indexed column changed'], [4, 'HOT'], [5, 'indexed column changed'], [6, 'no room on page']] }
    ] },
    solution: {
      approach: `<p>Unnest the changed columns, test membership in the indexed set, then the page-space test. Real PostgreSQL adds details: since 16, columns indexed only by BRIN (summarising indexes) do not block HOT, and HOT pruning can free space on the page during the update. Track the outcome with <code>n_tup_hot_upd / n_tup_upd</code> in <code>pg_stat_user_tables</code>.</p>`,
      code: lab(`SELECT u.upd_id,
       CASE
         WHEN EXISTS (SELECT 1 FROM json_each(u.changed_cols) j JOIN indexed_cols i ON i.col = j.value)
           THEN 'indexed column changed'
         WHEN u.page_free_bytes < u.new_tuple_bytes THEN 'no room on page'
         ELSE 'HOT'
       END AS verdict
FROM update_log u
ORDER BY u.upd_id;`, 'HOT verdicts (▶ Run)'),
      complexity: `<p>O(U × C) for U updates with C changed columns each, plus index probes into indexed_cols.</p>`,
      followUps: ['Why does InnoDB not need a HOT mechanism?', 'What fillfactor would you pick for an update-heavy status table?']
    }
  });

  practice.push({
    title: 'Dead but Pinned: Who Is Blocking VACUUM?',
    level: 'Medium', tags: ['postgresql', 'xmin horizon', 'bloat'], companies: ['Instacart', 'Robinhood', 'CRED'],
    statement: `<p>VACUUM may remove a tuple whose creator aborted at any time, but a tuple whose deleter committed only if <code>xmax &lt; horizon</code>, where <code>horizon</code> = the smallest non-NULL <code>backend_xmin</code> in <code>backends</code> (if all are NULL, nothing is pinned). For every dead tuple return <code>ctid, fate</code> with fate <code>'removable'</code> or <code>'pinned'</code>, ordered by <code>ctid</code>. Live tuples are not listed.</p>`,
    constraints: `<p>Dead = creator aborted, or deleter (<code>xmax</code>) committed. <code>lab</code> database.</p>`,
    example: `<p>The nightly report holds backend_xmin 102. (0,1) was replaced by xid 101 &lt; 102 → ${H.c('g', 'removable')}; (0,2) by xid 103 → ${H.c('r', 'pinned')} until the report finishes.</p>`,
    brute: { why: `<p>Treating every committed-deleted tuple as removable is what VACUUM <i>would</i> do with no open snapshots. With the report open it would break the report's consistent view, so the engine keeps them — and the brute force cannot explain the bloat.</p>`, code: lab(`SELECT t.ctid, 'removable' AS fate FROM pg_tuples t JOIN clog d ON d.xid = t.xmax AND d.state = 'committed' ORDER BY t.ctid;`, 'Naive: no horizon') },
    mcq: { q: 'Which of these does NOT hold back the PostgreSQL xmin horizon?', options: ['An idle-in-transaction session', 'An inactive replication slot', 'A standby with hot_standby_feedback = on running a long query', 'A large shared_buffers setting'], answer: 3, explain: 'Memory settings do not pin old row versions; old snapshots and slots do.' },
    hints: [
      `<p>Hint 1: Compute the horizon once: <code>COALESCE(MIN(backend_xmin), 2147483647)</code> — MIN ignores NULLs.</p>`,
      `<p>Hint 2: Join creator and deleter states from <code>clog</code> as in the guided problem; keep tuples that are dead.</p>`,
      `<p>Hint 3: Aborted creator → removable. Otherwise removable if <code>xmax &lt; horizon</code>, else pinned.</p>`
    ],
    tests: { engine: 'sqlite', cmp: 'exact', cases: [
      { cols: ['ctid', 'fate'], rows: [['(0,1)', 'removable'], ['(0,2)', 'pinned'], ['(0,5)', 'removable'], ['(0,8)', 'pinned']] },
      { setup: 'UPDATE backends SET backend_xmin = NULL WHERE pid = 4102', rows: [['(0,1)', 'removable'], ['(0,2)', 'removable'], ['(0,5)', 'removable'], ['(0,8)', 'pinned']] },
      { setup: 'UPDATE backends SET backend_xmin = NULL', rows: [['(0,1)', 'removable'], ['(0,2)', 'removable'], ['(0,5)', 'removable'], ['(0,8)', 'removable']] },
      { setup: 'UPDATE backends SET backend_xmin = 100 WHERE pid = 4101', rows: [['(0,1)', 'pinned'], ['(0,2)', 'pinned'], ['(0,5)', 'removable'], ['(0,8)', 'pinned']] },
      { setup: "UPDATE clog SET state = 'committed' WHERE xid = 104", rows: [['(0,1)', 'removable'], ['(0,2)', 'pinned'], ['(0,5)', 'removable'], ['(0,6)', 'pinned'], ['(0,8)', 'pinned']] },
      { setup: "UPDATE clog SET state = 'aborted' WHERE xid = 104", rows: [['(0,1)', 'removable'], ['(0,2)', 'pinned'], ['(0,5)', 'removable'], ['(0,7)', 'removable'], ['(0,8)', 'pinned']] }
    ] },
    solution: {
      approach: `<p>One horizon for the whole cluster (per database, in reality), then a per-tuple comparison. In production, find the culprit with <code>SELECT pid, state, xact_start, backend_xmin FROM pg_stat_activity ORDER BY age(backend_xmin) DESC</code>, plus <code>pg_replication_slots</code> (<code>xmin</code>, <code>catalog_xmin</code>) and prepared transactions in <code>pg_prepared_xacts</code>.</p>`,
      code: lab(`WITH h AS (SELECT COALESCE(MIN(backend_xmin), 2147483647) AS horizon FROM backends)
SELECT t.ctid,
       CASE WHEN c.state = 'aborted' THEN 'removable'
            WHEN t.xmax < h.horizon THEN 'removable'
            ELSE 'pinned' END AS fate
FROM pg_tuples t
JOIN clog c ON c.xid = t.xmin
LEFT JOIN clog d ON d.xid = t.xmax
CROSS JOIN h
WHERE c.state = 'aborted' OR d.state = 'committed'
ORDER BY t.ctid;`, 'Removable vs pinned (▶ Run)'),
      complexity: `<p>O(n) tuples plus one aggregate over sessions.</p>`,
      followUps: ['Which setting kills sessions that sit idle inside a transaction?', 'What is the InnoDB counterpart of a pinned horizon, and where do you see it?']
    }
  });

  practice.push({
    title: 'Revenue and Coupon Use per Channel (JSON)',
    level: 'Medium', tags: ['json', 'group by', 'mysql json'], companies: ['Swiggy', 'Nykaa', 'Etsy'],
    statement: `<p>From <code>orders.meta</code> (JSON) report per <code>channel</code>: <code>orders</code> (count), <code>with_coupon</code> (orders whose meta has a <code>coupon</code> key) and <code>revenue</code> (sum of <code>total</code>). Skip orders whose meta has no channel (or is NULL). Return <code>channel, orders, with_coupon, revenue</code> ordered by <code>revenue</code> descending.</p>`,
    constraints: `<p>Revenues are distinct in all test data. SQLite <code>-&gt;&gt;</code> paths use the MySQL <code>'$.key'</code> form. <code>lab</code> database.</p>`,
    example: `<p>web: 5 orders, 2 with SAVE10, revenue ${H.c('g', '18,399')}; store: 1, 0, 3,000; app: 2, 1, 2,200.</p>`,
    brute: { why: `<p>Counting coupons with <code>meta LIKE '%coupon%'</code> also matches a tag or note that contains the word "coupon". Extracting the key and testing <code>IS NOT NULL</code> is exact (and indexable through a generated column in MySQL).</p>`, code: lab(`SELECT meta ->> '$.channel' AS channel, COUNT(*) AS orders, SUM(meta LIKE '%coupon%') AS with_coupon, SUM(total) AS revenue
FROM orders GROUP BY channel ORDER BY revenue DESC;`, 'Naive: LIKE on raw JSON') },
    mcq: { q: "In MySQL, meta->>'$.coupon' is shorthand for…", options: ["JSON_UNQUOTE(JSON_EXTRACT(meta, '$.coupon'))", "JSON_EXTRACT(meta, '$.coupon')", "JSON_VALUE(meta, '$.coupon' RETURNING JSON)", "JSON_CONTAINS(meta, '$.coupon')"], answer: 0, explain: '-> is JSON_EXTRACT (returns JSON); ->> also unquotes it to text.' },
    hints: [
      `<p>Hint 1: <code>meta -&gt;&gt; '$.channel'</code> extracts the channel; filter <code>IS NOT NULL</code>.</p>`,
      `<p>Hint 2: <code>SUM(CASE WHEN meta -&gt;&gt; '$.coupon' IS NOT NULL THEN 1 ELSE 0 END)</code> counts coupons.</p>`,
      `<p>Hint 3: Group by the extracted channel and sort by <code>revenue DESC</code>.</p>`
    ],
    tests: { engine: 'sqlite', cmp: 'exact', cases: [
      { cols: ['channel', 'orders', 'with_coupon', 'revenue'], rows: [['web', 5, 2, 18399], ['store', 1, 0, 3000], ['app', 2, 1, 2200]] },
      { setup: 'DELETE FROM orders WHERE id = 5', rows: [['web', 5, 2, 18399], ['app', 2, 1, 2200]] },
      { setup: "UPDATE orders SET meta = '{\"channel\":\"app\",\"coupon\":\"X1\"}' WHERE id = 2", rows: [['web', 5, 2, 18399], ['store', 1, 0, 3000], ['app', 2, 2, 2200]] },
      { setup: "INSERT INTO orders VALUES (9, 106, 'paid', 'fay@x.io', 999, '2026-01-12', NULL); INSERT INTO orders VALUES (10, 106, 'paid', 'fay@x.io', 5, '2026-01-12', '{\"tags\":[\"coupon\"]}')", rows: [['web', 5, 2, 18399], ['store', 1, 0, 3000], ['app', 2, 1, 2200]] },
      { setup: 'UPDATE orders SET total = 0 WHERE id IN (1, 8)', rows: [['web', 5, 2, 4600], ['store', 1, 0, 3000], ['app', 2, 1, 2200]] },
      { setup: "INSERT INTO orders VALUES (9, 106, 'paid', 'fay@x.io', 20000, '2026-01-12', '{\"channel\":\"store\",\"coupon\":\"VIP\"}')", rows: [['store', 2, 1, 23000], ['web', 5, 2, 18399], ['app', 2, 1, 2200]] }
    ] },
    solution: {
      approach: `<p>Extract once, aggregate. PostgreSQL: <code>meta-&gt;&gt;'channel'</code> and <code>meta ? 'coupon'</code>; MySQL: <code>meta-&gt;&gt;'$.channel'</code> and <code>JSON_CONTAINS_PATH(meta, 'one', '$.coupon')</code>. To make the GROUP BY indexable in MySQL, add a virtual generated column <code>channel</code> with an index.</p>`,
      code: lab(`SELECT meta ->> '$.channel' AS channel,
       COUNT(*) AS orders,
       SUM(CASE WHEN meta ->> '$.coupon' IS NOT NULL THEN 1 ELSE 0 END) AS with_coupon,
       SUM(total) AS revenue
FROM orders
WHERE meta ->> '$.channel' IS NOT NULL
GROUP BY meta ->> '$.channel'
ORDER BY revenue DESC;`, 'Channel report (▶ Run)'),
      complexity: `<p>O(n) JSON parses plus a hash/sort group-by. PostgreSQL jsonb avoids re-parsing text; MySQL JSON is stored in a binary format with key offsets, so both are cheaper than parsing text each time.</p>`,
      followUps: ['A coupon key with JSON null: what does ->> return in each engine?', 'Would you promote channel to a real column? When?']
    }
  });

  practice.push({
    title: 'Rebuild an Old Version from the InnoDB Undo Chain',
    level: 'Hard', tags: ['innodb', 'mvcc', 'recursive cte'], companies: ['Alibaba', 'Oracle', 'Uber'],
    statement: `<p><code>innodb_rows</code> holds the newest version of each row with <code>trx_id</code> and <code>roll_ptr</code> (an <code>undo_no</code> in <code>undo_log</code>, or NULL). Each undo record has the previous <code>old_status</code>, <code>old_trx_id</code> and <code>prev_ptr</code>. A version is visible to read view V if <code>trx_id &lt; V.low_limit</code> and <code>trx_id</code> is not listed for V in <code>read_view_active</code>. For every read view and row, return the <b>newest visible version</b>: <code>rv, id, status</code>, ordered by <code>rv, id</code>. Rows with no visible version are omitted.</p>`,
    constraints: `<p>Chains are acyclic and shorter than 100. <code>lab</code> database. Name the read-view column <code>rv</code>.</p>`,
    example: `<p>report_B (low_limit 41, active {30}): row 1's newest version (trx 30) is active → follow undo → ${H.c('g', 'paid')} (trx 20). Row 2's trx 40 &lt; 41 → ${H.c('g', 'cancelled')}.</p>`,
    brute: { why: `<p>Reading only the clustered index row gives every report the latest data — a non-repeatable read. Joining only one undo step back fails when the visible version is two or more updates old (report_D needs three hops).</p>`, code: lab(`SELECT v.name AS rv, r.id, r.status FROM read_views v CROSS JOIN innodb_rows r ORDER BY rv, r.id;`, 'Naive: latest version for everyone') },
    mcq: { q: 'Why can a very long-running InnoDB transaction make OTHER readers slower?', options: ['It holds table locks', 'Purge cannot remove undo it might need, so readers walk longer version chains', 'It disables the buffer pool', 'It forces SERIALIZABLE'], answer: 1, explain: 'Old read views keep undo alive; consistent reads of hot rows must traverse more history.' },
    hints: [
      `<p>Hint 1: A recursive CTE: the anchor pairs every read view with every current row (depth 0); the recursive step follows <code>roll_ptr</code>/<code>prev_ptr</code> into <code>undo_log</code> (depth + 1).</p>`,
      `<p>Hint 2: Filter the walked versions by the visibility rule for their read view (low_limit and the active list).</p>`,
      `<p>Hint 3: Among visible versions keep the one with the smallest depth for each (rv, id).</p>`
    ],
    tests: { engine: 'sqlite', cmp: 'exact', cases: [
      { cols: ['rv', 'id', 'status'], rows: [['report_A', 1, 'paid'], ['report_A', 2, 'new'], ['report_A', 3, 'new'], ['report_B', 1, 'paid'], ['report_B', 2, 'cancelled'], ['report_B', 3, 'new']] },
      { setup: "INSERT INTO read_views VALUES ('report_C', 50)", rows: [['report_A', 1, 'paid'], ['report_A', 2, 'new'], ['report_A', 3, 'new'], ['report_B', 1, 'paid'], ['report_B', 2, 'cancelled'], ['report_B', 3, 'new'], ['report_C', 1, 'shipped'], ['report_C', 2, 'cancelled'], ['report_C', 3, 'new']] },
      { setup: "INSERT INTO read_views VALUES ('report_D', 15)", rows: [['report_A', 1, 'paid'], ['report_A', 2, 'new'], ['report_A', 3, 'new'], ['report_B', 1, 'paid'], ['report_B', 2, 'cancelled'], ['report_B', 3, 'new'], ['report_D', 1, 'new'], ['report_D', 2, 'new'], ['report_D', 3, 'new']] },
      { setup: "INSERT INTO innodb_rows VALUES (4, 'new', 60, NULL)", rows: [['report_A', 1, 'paid'], ['report_A', 2, 'new'], ['report_A', 3, 'new'], ['report_B', 1, 'paid'], ['report_B', 2, 'cancelled'], ['report_B', 3, 'new']] },
      { setup: "INSERT INTO read_view_active VALUES ('report_A', 20)", rows: [['report_A', 1, 'new'], ['report_A', 2, 'new'], ['report_A', 3, 'new'], ['report_B', 1, 'paid'], ['report_B', 2, 'cancelled'], ['report_B', 3, 'new']] },
      { setup: "INSERT INTO read_views VALUES ('report_D', 15); DELETE FROM undo_log WHERE undo_no = 2", rows: [['report_A', 1, 'paid'], ['report_A', 2, 'new'], ['report_A', 3, 'new'], ['report_B', 1, 'paid'], ['report_B', 2, 'cancelled'], ['report_B', 3, 'new'], ['report_D', 2, 'new'], ['report_D', 3, 'new']] }
    ] },
    solution: {
      approach: `<p>Exactly what InnoDB's consistent read does in <code>row_vers_build_for_consistent_read</code>: start from the clustered record, and while its trx id is not visible to the read view, rebuild the previous version from the undo record. The last test shows why purge must never remove undo that an open read view may still need.</p>`,
      code: lab(`WITH RECURSIVE chain(rv, id, status, trx_id, nxt, depth) AS (
  SELECT v.name, r.id, r.status, r.trx_id, r.roll_ptr, 0
  FROM read_views v CROSS JOIN innodb_rows r
  UNION ALL
  SELECT c.rv, c.id, u.old_status, u.old_trx_id, u.prev_ptr, c.depth + 1
  FROM chain c JOIN undo_log u ON u.undo_no = c.nxt
  WHERE c.depth < 100
),
visible AS (
  SELECT c.* FROM chain c JOIN read_views v ON v.name = c.rv
  WHERE c.trx_id < v.low_limit
    AND NOT EXISTS (SELECT 1 FROM read_view_active a WHERE a.name = c.rv AND a.trx_id = c.trx_id)
)
SELECT rv, id, status
FROM visible x
WHERE depth = (SELECT MIN(depth) FROM visible y WHERE y.rv = x.rv AND y.id = x.id)
ORDER BY rv, id;`, 'Consistent read via undo (▶ Run)'),
      complexity: `<p>O(V × R × L) for V read views, R rows and chain length L. This is the hidden cost of long-lived read views in InnoDB; PostgreSQL pays instead by scanning dead tuples on the heap.</p>`,
      followUps: ['What does the real InnoDB read view store besides low_limit (up_limit, creator trx id)?', 'How does a secondary-index read decide it must consult the clustered index for visibility?']
    }
  });

  practice.push({
    title: 'Where Did the Time Go? Exclusive Time per Plan Node',
    level: 'Hard', tags: ['explain analyze', 'per-loop', 'self join'], companies: ['Datadog', 'Snowflake', 'Microsoft'],
    statement: `<p>In PostgreSQL EXPLAIN ANALYZE, <code>actual time</code> is the per-loop average and includes the node's children. For each node in <code>plan_nodes</code> compute <code>exclusive_ms = time_ms × loops − Σ(child.time_ms × child.loops)</code> over its direct children, rounded to 1 decimal. Return <code>plan, node_id, node_type, exclusive_ms</code> ordered by <code>exclusive_ms</code> descending, then <code>plan</code>, then <code>node_id</code>.</p>`,
    constraints: `<p>Children are rows whose <code>parent_id</code> equals the node's <code>node_id</code> in the same plan. Leaf nodes have no children. <code>lab</code> database.</p>`,
    example: `<p>q1: the Index Scan runs 0.17 ms × 4000 loops = ${H.c('r', '680.0 ms')}; the Nested Loop itself only 812.4 − (30.1 + 680.0) = 102.3 ms.</p>`,
    brute: { why: `<p>Ranking by the printed <code>actual time</code> blames the Nested Loop (812 ms, but that includes its children) and ranks the Index Scan last (0.17 ms per loop), the exact opposite of reality.</p>`, code: lab(`SELECT plan, node_id, node_type, time_ms FROM plan_nodes ORDER BY time_ms DESC;`, 'Naive: printed time') },
    mcq: { q: 'A node prints actual time=0.02..0.17 loops=4000. Its total time is about…', options: ['0.17 ms', '0.19 ms', '680 ms', '80 ms'], answer: 2, explain: 'Times are per-loop averages: 0.17 × 4000 ≈ 680 ms.' },
    hints: [
      `<p>Hint 1: Total time of a node = <code>time_ms * loops</code>.</p>`,
      `<p>Hint 2: Sum the children's totals with a correlated subquery or a LEFT JOIN + GROUP BY on (plan, parent_id); use <code>COALESCE(…, 0)</code> for leaves.</p>`,
      `<p>Hint 3: <code>ROUND(total - children, 1)</code>, then sort by it descending with the two tie-breakers.</p>`
    ],
    tests: { engine: 'sqlite', cmp: 'exact', cases: [
      { cols: ['plan', 'node_id', 'node_type', 'exclusive_ms'], rows: [['q1', 3, 'Index Scan', 680.0], ['q1', 1, 'Nested Loop', 102.3], ['q1', 2, 'Seq Scan', 30.1], ['q2', 1, 'Hash Join', 20.0], ['q2', 2, 'Seq Scan', 20.0], ['q2', 4, 'Bitmap Heap Scan', 4.2], ['q2', 3, 'Hash', 0.8]] },
      { setup: "UPDATE plan_nodes SET loops = 1 WHERE plan = 'q1' AND node_id = 3", rows: [['q1', 1, 'Nested Loop', 782.1], ['q1', 2, 'Seq Scan', 30.1], ['q2', 1, 'Hash Join', 20.0], ['q2', 2, 'Seq Scan', 20.0], ['q2', 4, 'Bitmap Heap Scan', 4.2], ['q2', 3, 'Hash', 0.8], ['q1', 3, 'Index Scan', 0.2]] },
      { setup: "DELETE FROM plan_nodes WHERE plan = 'q1'", rows: [['q2', 1, 'Hash Join', 20.0], ['q2', 2, 'Seq Scan', 20.0], ['q2', 4, 'Bitmap Heap Scan', 4.2], ['q2', 3, 'Hash', 0.8]] },
      { setup: "INSERT INTO plan_nodes VALUES ('q2', 5, 3, 'Seq Scan', 'regions', 10, 10, 1, 0.5)", rows: [['q1', 3, 'Index Scan', 680.0], ['q1', 1, 'Nested Loop', 102.3], ['q1', 2, 'Seq Scan', 30.1], ['q2', 1, 'Hash Join', 20.0], ['q2', 2, 'Seq Scan', 20.0], ['q2', 4, 'Bitmap Heap Scan', 4.2], ['q2', 5, 'Seq Scan', 0.5], ['q2', 3, 'Hash', 0.3]] },
      { setup: "UPDATE plan_nodes SET time_ms = 900.0 WHERE plan = 'q2' AND node_id = 1", rows: [['q2', 1, 'Hash Join', 875.0], ['q1', 3, 'Index Scan', 680.0], ['q1', 1, 'Nested Loop', 102.3], ['q1', 2, 'Seq Scan', 30.1], ['q2', 2, 'Seq Scan', 20.0], ['q2', 4, 'Bitmap Heap Scan', 4.2], ['q2', 3, 'Hash', 0.8]] },
      { setup: "UPDATE plan_nodes SET parent_id = NULL WHERE plan = 'q2' AND node_id = 2", rows: [['q1', 3, 'Index Scan', 680.0], ['q1', 1, 'Nested Loop', 102.3], ['q2', 1, 'Hash Join', 40.0], ['q1', 2, 'Seq Scan', 30.1], ['q2', 2, 'Seq Scan', 20.0], ['q2', 4, 'Bitmap Heap Scan', 4.2], ['q2', 3, 'Hash', 0.8]] }
    ] },
    solution: {
      approach: `<p>Convert every node to total time (× loops), subtract the children's totals, rank. This is what explain.depesz.com calls "exclusive" time. Caveats in real plans: parallel workers report per-worker averages, and nodes like Hash are executed once although their parent loops; InitPlans and CTE scans need care too. MySQL's EXPLAIN ANALYZE prints the same per-loop figures for its iterators.</p>`,
      code: lab(`SELECT p.plan, p.node_id, p.node_type,
       ROUND(p.time_ms * p.loops
             - COALESCE((SELECT SUM(c.time_ms * c.loops) FROM plan_nodes c
                         WHERE c.plan = p.plan AND c.parent_id = p.node_id), 0), 1) AS exclusive_ms
FROM plan_nodes p
ORDER BY exclusive_ms DESC, p.plan, p.node_id;`, 'Exclusive time (▶ Run)'),
      complexity: `<p>O(n²) with the correlated subquery, O(n log n) with a grouped join; plans have tens of nodes, so either is instant.</p>`,
      followUps: ['Why can exclusive time come out slightly negative in real plans?', 'How do BUFFERS numbers help explain a slow leaf node?']
    }
  });

  practice.push({
    title: 'Acknowledged Commits Lost per Failover Candidate',
    level: 'Hard', tags: ['replication', 'rpo', 'group_concat'], companies: ['Stripe', 'Coinbase', 'Zerodha'],
    statement: `<p>The primary crashed. For each <b>healthy</b> replica, list the acknowledged commits (<code>commits</code>) it would lose if promoted — those with <code>commit_lsn &gt; received_lsn</code>. Return <code>name, commits_lost, lost_xids</code> where <code>lost_xids</code> is the xids in ascending order joined with commas (NULL if none). Order by <code>commits_lost</code>, then <code>name</code>.</p>`,
    constraints: `<p>Received WAL is never lost on promotion (it is replayed first). <code>lab</code> database.</p>`,
    example: `<p>pg-r4 received up to 4990 → loses 903 (4995) and 904 (5000) → ${H.c('r', "('pg-r4', 2, '903,904')")}; pg-r1 → ${H.c('g', "('pg-r1', 0, NULL)")}.</p>`,
    brute: { why: `<p>Measuring loss by <code>replayed_lsn</code> overstates it (received WAL survives), and reporting a byte count instead of transactions hides which customer-visible operations vanish — the thing incident reports must list.</p>`, code: lab(`SELECT r.name, p.current_lsn - r.replayed_lsn AS bytes_behind FROM replicas r, primary_state p ORDER BY bytes_behind;`, 'Naive: replay bytes') },
    mcq: { q: 'MySQL semi-synchronous replication with rpl_semi_sync_source_wait_point = AFTER_SYNC guarantees that…', options: ['every replica has applied the transaction before commit returns', 'at least one replica has the transaction in its relay log before the client sees the commit', 'the binlog is disabled', 'failover is automatic'], answer: 1, explain: 'AFTER_SYNC waits for a replica acknowledgement after the binlog sync and before committing to the engine and replying — lossless failover to that replica.' },
    hints: [
      `<p>Hint 1: Start from healthy replicas; count commits with a correlated subquery on <code>commit_lsn &gt; received_lsn</code>.</p>`,
      `<p>Hint 2: <code>group_concat(xid, ',')</code> over an ordered subquery builds the list; it returns NULL when there are no rows.</p>`,
      `<p>Hint 3: Order the outer query by <code>commits_lost, name</code>.</p>`
    ],
    tests: { engine: 'sqlite', cmp: 'exact', cases: [
      { cols: ['name', 'commits_lost', 'lost_xids'], rows: [['pg-r1', 0, null], ['pg-r4', 2, '903,904'], ['pg-r2', 3, '902,903,904']] },
      { setup: "UPDATE replicas SET healthy = 0 WHERE name = 'pg-r1'", rows: [['pg-r4', 2, '903,904'], ['pg-r2', 3, '902,903,904']] },
      { setup: "UPDATE replicas SET received_lsn = 5000 WHERE name = 'pg-r2'", rows: [['pg-r1', 0, null], ['pg-r2', 0, null], ['pg-r4', 2, '903,904']] },
      { setup: 'INSERT INTO commits VALUES (905, 5001)', rows: [['pg-r1', 1, '905'], ['pg-r4', 3, '903,904,905'], ['pg-r2', 4, '902,903,904,905']] },
      { setup: 'DELETE FROM commits WHERE xid IN (903, 904)', rows: [['pg-r1', 0, null], ['pg-r4', 0, null], ['pg-r2', 1, '902']] },
      { setup: "UPDATE replicas SET healthy = 1 WHERE name = 'pg-r3'", rows: [['pg-r1', 0, null], ['pg-r3', 0, null], ['pg-r4', 2, '903,904'], ['pg-r2', 3, '902,903,904']] }
    ] },
    solution: {
      approach: `<p>Per candidate, the lost set is a range query on commit positions. Present it as transactions, because that is what the business reconciles after an async failover (and what synchronous replication would have prevented). With MySQL GTIDs the same answer is <code>GTID_SUBTRACT(primary_executed, replica_retrieved)</code>.</p>`,
      code: lab(`SELECT r.name,
       (SELECT COUNT(*) FROM commits c WHERE c.commit_lsn > r.received_lsn) AS commits_lost,
       (SELECT group_concat(xid, ',') FROM
          (SELECT c.xid FROM commits c WHERE c.commit_lsn > r.received_lsn ORDER BY c.xid)) AS lost_xids
FROM replicas r
WHERE r.healthy = 1
ORDER BY commits_lost, r.name;`, 'Lost commits per candidate (▶ Run)'),
      complexity: `<p>O(R × C) for R replicas and C recent commits; an index on <code>commit_lsn</code> makes each count a range scan.</p>`,
      followUps: ['How does synchronous_standby_names = ANY 1 (r1, r2) change which candidates can lose data?', 'Where would you get commit positions from in a real PostgreSQL incident?']
    }
  });

  practice.push({
    title: 'Root Blocker of Every Lock Wait',
    level: 'Hard', tags: ['locks', 'recursive cte', 'mysql performance_schema'], companies: ['Booking.com', 'GitHub', 'PhonePe'],
    statement: `<p><code>lock_waits</code> is a simplified <code>performance_schema.data_lock_waits</code>: each waiting transaction waits for exactly one blocking transaction, and there are no cycles (InnoDB breaks deadlocks immediately). For every waiting transaction return <code>waiting, root_blocker, depth</code>: the transaction at the head of its chain (one that is not waiting itself) and the number of hops to it. Order by <code>waiting</code>.</p>`,
    constraints: `<p>Chains are shorter than 100. <code>lab</code> database.</p>`,
    example: `<p>T3 waits for T2, which waits for T1 → ${H.c('r', "('T3', 'T1', 2)")}. Killing T1 unblocks T2, T3 and T4 at once.</p>`,
    brute: { why: `<p>Listing direct blockers only (<code>SELECT * FROM lock_waits</code>) suggests killing T2 to free T3 and T4 — but T2 is itself stuck behind T1, so the pile-up continues. The head of the chain is the session to investigate.</p>`, code: lab(`SELECT waiting_trx AS waiting, blocking_trx AS blocker FROM lock_waits ORDER BY waiting_trx;`, 'Naive: direct blocker only') },
    mcq: { q: 'In PostgreSQL, which function returns the PIDs blocking a given backend?', options: ['pg_cancel_backend', 'pg_blocking_pids', 'pg_stat_get_activity', 'pg_locks_for'], answer: 1, explain: 'pg_blocking_pids(pid) returns the array of PIDs holding or queued ahead for locks the backend waits on.' },
    hints: [
      `<p>Hint 1: Recursive CTE: anchor = every row of lock_waits with depth 1; step = join the current blocker to its own blocker in lock_waits.</p>`,
      `<p>Hint 2: Keep a depth guard (<code>depth &lt; 100</code>) in the recursive step.</p>`,
      `<p>Hint 3: The root rows are those whose blocker does not appear as a <code>waiting_trx</code>.</p>`
    ],
    tests: { engine: 'sqlite', cmp: 'exact', cases: [
      { cols: ['waiting', 'root_blocker', 'depth'], rows: [['T2', 'T1', 1], ['T3', 'T1', 2], ['T4', 'T1', 2], ['T6', 'T5', 1]] },
      { setup: "INSERT INTO lock_waits VALUES ('T7', 'T6')", rows: [['T2', 'T1', 1], ['T3', 'T1', 2], ['T4', 'T1', 2], ['T6', 'T5', 1], ['T7', 'T5', 2]] },
      { setup: "DELETE FROM lock_waits WHERE waiting_trx = 'T2'", rows: [['T3', 'T2', 1], ['T4', 'T2', 1], ['T6', 'T5', 1]] },
      { setup: "INSERT INTO lock_waits VALUES ('T1', 'T9')", rows: [['T1', 'T9', 1], ['T2', 'T9', 2], ['T3', 'T9', 3], ['T4', 'T9', 3], ['T6', 'T5', 1]] },
      { setup: "DELETE FROM lock_waits WHERE waiting_trx = 'T6'", rows: [['T2', 'T1', 1], ['T3', 'T1', 2], ['T4', 'T1', 2]] },
      { setup: "UPDATE lock_waits SET blocking_trx = 'T6' WHERE waiting_trx = 'T4'", rows: [['T2', 'T1', 1], ['T3', 'T1', 2], ['T4', 'T5', 2], ['T6', 'T5', 1]] }
    ] },
    solution: {
      approach: `<p>Walk each chain to its head. In MySQL, <code>sys.innodb_lock_waits</code> gives the direct pairs (with the blocking thread id to <code>KILL</code>); in PostgreSQL, build the same graph from <code>pg_blocking_pids()</code>. Real chains can branch (several holders of a shared lock), which turns this into a graph walk with DISTINCT roots.</p>`,
      code: lab(`WITH RECURSIVE walk(waiting, blocker, depth) AS (
  SELECT waiting_trx, blocking_trx, 1 FROM lock_waits
  UNION ALL
  SELECT w.waiting, l.blocking_trx, w.depth + 1
  FROM walk w JOIN lock_waits l ON l.waiting_trx = w.blocker
  WHERE w.depth < 100
)
SELECT waiting, blocker AS root_blocker, depth
FROM walk w
WHERE NOT EXISTS (SELECT 1 FROM lock_waits l WHERE l.waiting_trx = w.blocker)
ORDER BY waiting;`, 'Root blockers (▶ Run)'),
      complexity: `<p>O(W × D) for W waiters and chain depth D.</p>`,
      followUps: ['What does InnoDB do when the chain becomes a cycle?', 'Why is killing the root blocker sometimes the wrong move (think: a long migration)?']
    }
  });

  /* =====================================================================
     QUIZ
     ===================================================================== */
  quiz.push(
    { q: 'A PostgreSQL UPDATE changes one non-indexed column and the page has free space. What happens physically?', options: ['The row is overwritten in place', 'A new tuple is written on the same page and chained from the old one (HOT); no new index entries', 'The old version is copied to an undo log', 'Every index gets a new entry'], answer: 1, explain: 'PostgreSQL never updates in place; HOT avoids index maintenance when no indexed column changes and the page has room.' },
    { q: 'Where does InnoDB keep the previous version of an updated row?', options: ['As a second row in the clustered index', 'In the undo log, reached through the row\'s roll pointer', 'In the binary log only', 'In the doublewrite buffer'], answer: 1, explain: 'InnoDB updates the clustered record in place and stores the before-image in undo, linked by DB_ROLL_PTR.' },
    { q: 'Which operation is typically much cheaper in PostgreSQL than in InnoDB?', options: ['Primary-key range scans', 'Rolling back a huge transaction', 'Updating a non-indexed column on a table with many indexes', 'Point lookups by primary key'], answer: 1, explain: 'PostgreSQL only marks the xid aborted; InnoDB must apply every undo record.' },
    { q: 'An InnoDB secondary index on email for a table with a CHAR(36) UUID primary key stores per entry…', options: ['email + a 6-byte row pointer', 'email + the 36-byte primary key', 'only email', 'email + the transaction id'], answer: 1, explain: 'Secondary entries carry the full PK, so wide PKs inflate every secondary index.' },
    { q: 'Which PostgreSQL index type is a few kilobytes for a terabyte append-only table and stores min/max per block range?', options: ['GIN', 'GiST', 'BRIN', 'Hash'], answer: 2, explain: 'BRIN summarises ranges of pages; it works when values correlate with physical order.' },
    { q: 'What happens with CREATE INDEX idx ON t (c) USING HASH on a MySQL InnoDB table?', options: ['An on-disk hash index is built', 'It is silently created as a B-tree', 'The statement fails', 'It becomes the adaptive hash index'], answer: 1, explain: 'InnoDB accepts the HASH keyword and builds a B-tree; the adaptive hash index is internal and automatic.' },
    { q: 'Which feature does MySQL 8.x NOT support?', options: ['Functional (expression) indexes', 'Descending indexes', 'Partial indexes with a WHERE clause', 'Invisible indexes'], answer: 2, explain: 'MySQL has no partial indexes; PostgreSQL and SQLite do.' },
    { q: 'In PostgreSQL EXPLAIN ANALYZE, a node shows rows=12 loops=4000. How many rows did it produce in total?', options: ['12', '4000', '48,000', '3,333'], answer: 2, explain: 'Actual rows are per loop: 12 × 4000.' },
    { q: 'MySQL EXPLAIN shows type = index for a table. This means…', options: ['a unique index lookup returning one row', 'a full scan of an index', 'an index range scan', 'the index was ignored'], answer: 1, explain: '"index" reads the whole index (cheaper than ALL only when the index is narrower than the table).' },
    { q: 'Default isolation levels: PostgreSQL vs MySQL InnoDB?', options: ['REPEATABLE READ vs READ COMMITTED', 'READ COMMITTED vs REPEATABLE READ', 'SERIALIZABLE vs REPEATABLE READ', 'Both READ COMMITTED'], answer: 1, explain: 'PostgreSQL defaults to READ COMMITTED, InnoDB to REPEATABLE READ.' },
    { q: 'InnoDB at REPEATABLE READ, index on k has 10, 20, 30. Session A runs SELECT … WHERE k BETWEEN 12 AND 18 FOR UPDATE. Which insert by session B blocks?', options: ['k = 5', 'k = 15', 'k = 25', 'k = 35'], answer: 1, explain: 'The scan locks the next-key interval (10, 20]; 15 falls in it. 25 and 35 are in unlocked gaps.' },
    { q: 'Two transactions at REPEATABLE READ update the same row based on an earlier read. PostgreSQL raises 40001; what does MySQL InnoDB do?', options: ['Also raises a serialization error', 'The second update waits, then applies on top of the latest committed row', 'Deadlock error 1213 every time', 'It silently ignores the second update'], answer: 1, explain: 'InnoDB updates read the latest committed version; there is no first-updater-wins check, so app-side read-modify-write can lose updates.' },
    { q: 'What does a PostgreSQL replication slot guarantee, and what is its risk?', options: ['Zero lag; risk of split brain', 'WAL is kept until the consumer has it; an abandoned slot can fill the disk', 'Synchronous commit; risk of slow writes', 'Automatic failover; risk of data loss'], answer: 1, explain: 'Slots retain WAL (and can hold back the xmin horizon); cap them with max_slot_wal_keep_size.' },
    { q: 'Which MySQL feature identifies each transaction globally so replicas can be repointed automatically?', options: ['Binlog file and position', 'GTIDs', 'The relay log', 'Semi-sync'], answer: 1, explain: 'GTIDs (server_uuid:number) let SOURCE_AUTO_POSITION find what a replica is missing.' },
    { q: "PostgreSQL: SELECT '{\"a\":1,\"a\":2}'::jsonb returns…", options: ['an error: duplicate key', '{"a": 1}', '{"a": 2}', '{"a": 1, "a": 2}'], answer: 2, explain: 'jsonb keeps the last value for duplicate keys; json would keep the text unchanged.' }
  );

  /* =====================================================================
     INTERVIEW
     ===================================================================== */
  interview.push(
    { q: 'How do PostgreSQL and MySQL InnoDB implement MVCC differently, and what are the operational consequences?', level: 'A', a: `<p><b>PostgreSQL</b> stores versions in the table: an UPDATE writes a new heap tuple and stamps the old one's <code>xmax</code>; visibility is decided per tuple from <code>xmin/xmax</code> and the commit log. Old versions become dead tuples that <b>VACUUM</b> removes; rollback is nearly free. Consequences: bloat when vacuum falls behind or a long snapshot pins the horizon, non-HOT updates touching every index, and xid wraparound requiring freezing.</p><p><b>InnoDB</b> updates the clustered record in place, saving the before-image in the <b>undo log</b> linked by <code>DB_ROLL_PTR</code>; consistent reads rebuild old versions by walking that chain; <b>purge</b> removes undo once no read view needs it. Consequences: long transactions grow the history list and slow readers, large rollbacks are expensive, but tables don't bloat with dead versions and secondary indexes change only when their columns change.</p>`, followUps: ['What is HOT and how does fillfactor help?', 'How do you find what pins the horizon in each engine?'] },
    { q: 'Explain the clustered index in InnoDB and why primary-key choice matters more there than in PostgreSQL.', level: 'I', a: `<p>An InnoDB table <i>is</i> a B+tree ordered by the primary key; leaf pages hold full rows. Secondary indexes store <code>(columns, PK)</code>, so lookups go secondary → PK → clustered (double lookup) unless covered. Therefore the PK should be <b>short</b> (copied into every secondary index) and <b>monotonic</b> (inserts append at the right edge instead of splitting random pages). A random UUIDv4 in <code>CHAR(36)</code> is the worst case; use <code>BIGINT AUTO_INCREMENT</code> or UUIDv7 as <code>BINARY(16)</code>. In PostgreSQL the heap is unordered and every index points to a 6-byte ctid, so the PK only affects its own index (random UUIDs still scatter that index and hurt cache locality, but do not reorganise the table).</p>`, followUps: ['What does InnoDB use if no primary key is defined?', 'How does PostgreSQL get index-only scans without a clustered index?'] },
    { q: 'Walk me through the index types PostgreSQL offers that MySQL does not, with a use case each.', level: 'I', a: `<p><b>GIN</b>: inverted index for jsonb containment (<code>@&gt;</code>), arrays, full-text tsvector and trigram LIKE '%x%'. <b>GiST</b>: geometry with PostGIS, range types, nearest-neighbour ordering, and exclusion constraints ("no overlapping bookings"). <b>SP-GiST</b>: space-partitioned trees for points, IP ranges. <b>BRIN</b>: tiny min/max summaries for huge append-only tables queried by time. <b>Partial indexes</b>: index only <code>WHERE status = 'pending'</code>, or partial UNIQUE rules. Hash indexes exist in both names but are only real in PostgreSQL. MySQL counters: functional key parts (8.0.13), multi-valued JSON indexes (8.0.17), FULLTEXT, SPATIAL, invisible indexes and skip scan.</p>`, followUps: ['jsonb_ops vs jsonb_path_ops?', 'How would you emulate a partial unique index in MySQL?'] },
    { q: 'You are given a slow query on PostgreSQL. How do you read its EXPLAIN ANALYZE?', level: 'I', a: `<p>Run <code>EXPLAIN (ANALYZE, BUFFERS)</code> (inside a rolled-back transaction if it writes). Read inside-out. For every node compare estimated rows with actual rows (both per loop) and find the <b>deepest 10× misestimate</b> — that usually explains a bad join method or order above it. Multiply per-loop time by loops to find where time really went (exclusive time = node total minus children). Look at <code>Rows Removed by Filter</code> (missing or unusable index), <code>Heap Fetches</code> on index-only scans (vacuum/visibility map), <code>Buffers: read</code> vs <code>hit</code> (cold cache), and sorts or hashes spilling to disk (<code>work_mem</code>). Fix the cause: statistics (ANALYZE, higher statistics target, extended statistics for correlated columns), a matching index, or a query rewrite.</p>`, followUps: ['What does MySQL\'s EXPLAIN ANALYZE output look like?', 'How do you capture slow plans automatically (auto_explain)?'] },
    { q: 'What do type, key_len, rows, filtered and Extra mean in MySQL EXPLAIN?', level: 'B', a: `<p><b>type</b> is the access method, best to worst: system/const (at most one row), eq_ref (one row per join row via unique index), ref (non-unique index equality), range, index (full index scan), ALL (full table scan). <b>key</b> is the chosen index and <b>key_len</b> the bytes of it used, revealing how many leading columns of a composite index apply. <b>rows</b> is the estimated rows examined and <b>filtered</b> the estimated percentage left after the WHERE; rows × filtered ≈ rows passed to the next table. <b>Extra</b> flags: Using index (covering), Using index condition (pushdown), Using where, Using filesort (sort not provided by an index), Using temporary (internal temp table). For real numbers use <code>EXPLAIN ANALYZE</code> (8.0.18+).</p>`, followUps: ['How do you remove a filesort for WHERE a = ? ORDER BY b?', 'When is type = index better than ALL?'] },
    { q: 'Compare the default isolation levels and their real behaviour in PostgreSQL and MySQL.', level: 'A', a: `<p>PostgreSQL defaults to <b>READ COMMITTED</b>: each statement sees a fresh snapshot; an UPDATE that hits a row changed by a concurrent committed transaction re-evaluates the WHERE on the new version. Its REPEATABLE READ is true snapshot isolation and raises <b>40001</b> on concurrent updates of the same row; SERIALIZABLE is SSI (non-blocking, aborts dangerous structures). MySQL InnoDB defaults to <b>REPEATABLE READ</b>: plain SELECTs read a transaction-wide snapshot, but UPDATE/DELETE/locking reads operate on the <b>latest committed</b> row with next-key locks, so read-modify-write in the app can lose updates without any error. InnoDB SERIALIZABLE turns plain SELECTs into shared locking reads (when autocommit is off). Practical upshot: port code carefully — retry on 40001 in PostgreSQL, use atomic updates or <code>FOR UPDATE</code> and retry on deadlock 1213 in MySQL.</p>`, followUps: ['Why does InnoDB RR not show phantoms to plain SELECTs?', 'When would you switch MySQL to READ COMMITTED?'] },
    { q: 'What are gap locks and next-key locks, and why do they cause surprising deadlocks?', level: 'A', a: `<p>InnoDB locks <b>index records</b>. A record lock covers one entry; a <b>gap lock</b> covers the interval before an entry; a <b>next-key lock</b> is both, the half-open interval (previous key, key]. At REPEATABLE READ, locking range scans take next-key locks on every scanned record (including the first one past the range) so no phantom row can be inserted into the range. Gap locks don't conflict with each other — they only block <b>insert intention</b> locks. The classic deadlock: two sessions do <code>SELECT … WHERE email = ? FOR UPDATE</code> for a missing row; both get the same gap lock; both then INSERT and each waits for the other's gap lock → 1213. Fixes: <code>INSERT … ON DUPLICATE KEY UPDATE</code>, a unique constraint plus retry, READ COMMITTED (gap locking mostly disabled), and always indexing the columns in locking WHERE clauses (otherwise the whole table's records and gaps get locked). PostgreSQL has no gap locks; it relies on snapshots and SSI predicate tracking instead.</p>`, followUps: ['How do you inspect locks in MySQL 8?', 'What does an equality search on a unique index lock?'] },
    { q: 'Describe replication options in PostgreSQL and MySQL and how you would get zero data loss on failover.', level: 'A', a: `<p><b>PostgreSQL</b>: physical streaming replication ships WAL to byte-identical hot standbys; logical replication (publications/subscriptions) replicates selected tables across versions. Durability is tuned with <code>synchronous_commit</code> (off, local, remote_write, on, remote_apply) and <code>synchronous_standby_names</code> (<code>FIRST n</code> or quorum <code>ANY n</code>). Failover is external: Patroni + etcd, pg_auto_failover, or a managed service. <b>MySQL</b>: row-based binlog replicated to replicas, GTIDs for auto-positioning, async by default, <b>semi-sync AFTER_SYNC</b> for lossless acknowledgement, and <b>Group Replication / InnoDB Cluster</b> for Paxos-based consensus and automatic primary election. Zero loss = commit acknowledged only after at least one standby has durably received it (sync quorum or semi-sync/Group Replication), plus promoting a standby that has all acknowledged commits, plus fencing the old primary to prevent split brain. The cost is a network round trip per commit and writes stalling if too few standbys respond.</p>`, followUps: ['What is a replication slot and how can it take down a primary?', 'How do you provide read-your-writes on replicas?'] },
    { q: 'jsonb in PostgreSQL vs JSON in MySQL: storage, querying and indexing.', level: 'I', a: `<p>Both store a parsed binary form (PostgreSQL also has text <code>json</code> which preserves formatting and duplicate keys). PostgreSQL jsonb offers operators <code>-&gt;</code>, <code>-&gt;&gt;</code>, <code>#&gt;</code>, containment <code>@&gt;</code>, key existence <code>?</code>, jsonpath, and since 17 SQL/JSON <code>JSON_TABLE</code>; one <b>GIN</b> index can serve containment queries on any key. MySQL uses <code>-&gt;'$.path'</code>/<code>-&gt;&gt;</code>, <code>JSON_CONTAINS</code>, <code>MEMBER OF</code>, <code>JSON_TABLE</code>; it cannot index a whole document, so you index specific paths via <b>generated columns</b>, <b>functional indexes</b> (with exact CAST and collation) or <b>multi-valued indexes</b> for arrays. Updates: PostgreSQL rewrites the whole value (new tuple, TOAST for large docs); MySQL can do partial in-place updates with JSON_SET/REPLACE/REMOVE and log only the diff. Rule: frequently filtered keys deserve real columns in either engine.</p>`, followUps: ['When would you keep json instead of jsonb?', 'Why might a MySQL functional index on a JSON path not be used?'] },
    { q: 'A team asks you: PostgreSQL or MySQL for a new product? How do you decide?', level: 'I', a: `<p>I start from requirements, not taste. PostgreSQL if the product needs rich data types and indexing (jsonb + GIN, arrays, ranges, exclusion constraints, partial indexes), extensions (PostGIS, pgvector, TimescaleDB, Citus), transactional DDL for safe migrations, or complex SQL. MySQL if the workload is high-volume simple OLTP on primary keys, the organisation already operates MySQL (people, backups, tooling, on-call), or the scaling path is Vitess/PlanetScale sharding; it also handles many connections more cheaply (threads vs PostgreSQL processes that need PgBouncer). Both have mature managed offerings, window functions, CTEs, JSON and replication. I'd name the deciding requirement, the cost we accept, and validate with a prototype of the top 3 queries on realistic data.</p>`, followUps: ['How does connection handling differ and why does PgBouncer exist?', 'Which would you pick for a ledger with heavy updates and many indexes?'] },
    { q: 'Your PostgreSQL table keeps growing although its row count is stable. Diagnose and fix.', level: 'A', a: `<p>Symptom of <b>bloat</b>: dead tuples are produced faster than they are reclaimed. Check <code>pg_stat_user_tables</code> (<code>n_dead_tup</code>, <code>last_autovacuum</code>, <code>n_tup_hot_upd</code>). Common causes: (1) something pins the <b>xmin horizon</b> — an idle-in-transaction session, a long report, an abandoned replication slot, a prepared transaction, or <code>hot_standby_feedback</code> from a replica; find it via <code>pg_stat_activity.backend_xmin</code>, <code>pg_replication_slots</code>, <code>pg_prepared_xacts</code>; (2) autovacuum thresholds too high for a big table — set per-table <code>autovacuum_vacuum_scale_factor</code>; (3) autovacuum throttled — raise <code>autovacuum_vacuum_cost_limit</code> or workers. Space already lost is not returned by plain VACUUM; reclaim it online with <code>pg_repack</code> (or VACUUM FULL in a maintenance window). Prevent with <code>idle_in_transaction_session_timeout</code>, fillfactor for HOT, and alerting on dead-tuple ratio and xid age.</p>`, followUps: ['What is the InnoDB analogue and how do you detect it?', 'Why is VACUUM FULL dangerous on a busy table?'] },
    { q: 'How do schema migrations differ between PostgreSQL and MySQL?', level: 'A', a: `<p>PostgreSQL DDL is <b>transactional</b>: a migration of ten statements can be wrapped in BEGIN/COMMIT and rolls back fully on error (except a few commands like <code>CREATE INDEX CONCURRENTLY</code>, which cannot run in a transaction block). Many changes are metadata-only (adding a nullable column, or one with a constant default since 11), but they need a brief <code>ACCESS EXCLUSIVE</code> lock that queues behind long queries and blocks everything behind it — always set <code>lock_timeout</code> and retry. MySQL DDL causes an <b>implicit commit</b>; 8.0 made it atomic and crash-safe but not transactional, so a failed multi-step migration leaves partial state. MySQL offers <code>ALGORITHM=INSTANT</code> (add/drop column, 8.0.29+ at any position), <code>INPLACE</code> with <code>LOCK=NONE</code>, or <code>COPY</code>; large tables often use gh-ost or pt-online-schema-change, which copy via triggers or binlog. Index builds: <code>CREATE INDEX CONCURRENTLY</code> in PostgreSQL; online InnoDB index creation in MySQL.</p>`, followUps: ['Why can adding a column block all reads in PostgreSQL?', 'How does gh-ost avoid triggers?'] },
    { q: 'Why does PostgreSQL usually need a connection pooler while MySQL often does not?', level: 'I', a: `<p>PostgreSQL forks one <b>backend process per connection</b>; each costs several MB plus per-process caches, and thousands of mostly idle connections hurt snapshot computation and context switching. So production setups put <b>PgBouncer</b> (transaction pooling) or a built-in proxy (RDS Proxy, Supavisor) in front, which in turn limits session features (session-level prepared statements historically, advisory locks, SET). MySQL uses a <b>thread per connection</b> (or the thread pool in Enterprise/Percona/MariaDB), cheaper per connection, so thousands of connections are more tolerable — though pooling (ProxySQL, application pools) is still standard for serverless and microservice fan-out.</p>`, followUps: ['What breaks with PgBouncer transaction pooling?', 'How does max_connections interact with work_mem in PostgreSQL?'] }
  );

  registerModule({
    id: 'sql16',
    title: 'PostgreSQL vs MySQL: Engine Specifics',
    intro: `<p>You know SQL, indexes, plans and transactions in general. Interviews for backend and data roles then ask: "how does <i>PostgreSQL</i> do it, and how does <i>MySQL</i> do it, and why does it matter?" This module puts the two most common open-source engines side by side where they really differ: <b>MVCC</b> (heap tuple versions + VACUUM vs undo logs + purge), <b>storage layout</b> (InnoDB clustered primary keys vs PostgreSQL heaps), <b>index types</b> (B-tree, hash, GIN, GiST, BRIN, partial and expression indexes), reading <b>EXPLAIN / EXPLAIN ANALYZE</b> in each, <b>isolation defaults and gap locks</b>, <b>replication and failover</b>, <b>JSON</b>, and finally how to <b>choose</b>.</p>
<p>The browser runs SQLite, so every runnable snippet works on a small <b>model</b> of an engine internal (tuple headers, undo chains, plan nodes, lock intervals, replica positions) — you compute what the engine would do. Real PostgreSQL 16/17 and MySQL 8.x syntax is shown alongside, marked as not runnable here.</p>`,
    goals: [
      'Explain where each engine keeps old row versions, what VACUUM and purge do, and diagnose bloat or history-list growth from a pinned horizon',
      'Describe InnoDB clustered primary keys vs PostgreSQL heap tables and choose primary keys and covering indexes for each',
      'Pick the right index type (B-tree, hash, GIN, GiST, BRIN, partial, expression, multi-valued) for a query on each engine',
      'Read PostgreSQL EXPLAIN ANALYZE (per-loop numbers, misestimates, exclusive time) and MySQL EXPLAIN (type, key_len, Extra)',
      'Predict locking and anomaly behaviour under each engine\'s default isolation, including InnoDB next-key and gap locks',
      'Compare replication, synchronous options and failover, JSON support, and argue an engine choice from requirements'
    ],
    prereqs: `<p>SQL 10 (Index Internals) for B+trees and covering indexes, SQL 12 (Transactions, Isolation &amp; Concurrency) for isolation levels and MVCC basics. SQL 11 (Query Execution &amp; Optimization) and SQL 13 (Storage Engines Internals) help for the EXPLAIN and WAL parts.</p>`,
    hours: 10,
    databases: { lab: DB_LAB },
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
