(function () {
  var topics = [], practice = [], quiz = [], interview = [];

  /* ---------------- sample databases (SQLite dialect) ---------------- */
  // bank: accounts + inventory + on-call doctors + job queue + room slots + event sign-ups.
  // Every concurrency story in this module uses one of these tables.
  var DB_BANK = `CREATE TABLE accounts (
  id      INTEGER PRIMARY KEY,
  owner   TEXT NOT NULL,
  balance INTEGER NOT NULL CHECK (balance >= 0),
  version INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE ledger (
  id      INTEGER PRIMARY KEY,
  from_id INTEGER REFERENCES accounts(id),
  to_id   INTEGER REFERENCES accounts(id),
  amount  INTEGER NOT NULL CHECK (amount > 0),
  note    TEXT
);
INSERT INTO accounts (id, owner, balance) VALUES (1, 'Asha', 500), (2, 'Ben', 300), (3, 'Chen', 1000);
CREATE TABLE products (
  sku     TEXT PRIMARY KEY,
  name    TEXT NOT NULL,
  stock   INTEGER NOT NULL CHECK (stock >= 0),
  version INTEGER NOT NULL DEFAULT 1
);
INSERT INTO products (sku, name, stock) VALUES ('TSHIRT', 'Launch T-shirt', 3), ('MUG', 'Coffee Mug', 10);
CREATE TABLE orders (id INTEGER PRIMARY KEY, sku TEXT REFERENCES products(sku), qty INTEGER NOT NULL CHECK (qty > 0), customer TEXT NOT NULL);
CREATE TABLE counters (name TEXT PRIMARY KEY, value INTEGER NOT NULL);
INSERT INTO counters VALUES ('page_views', 41), ('likes:post42', 7);
CREATE TABLE doctors (name TEXT PRIMARY KEY, shift_id INTEGER NOT NULL, on_call INTEGER NOT NULL CHECK (on_call IN (0, 1)));
INSERT INTO doctors VALUES ('Alice', 1234, 1), ('Bob', 1234, 1), ('Carol', 1235, 1);
CREATE TABLE jobs (id INTEGER PRIMARY KEY, payload TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'done')), worker TEXT);
INSERT INTO jobs (id, payload) VALUES (1, 'send-email:1'), (2, 'resize-img:7'), (3, 'send-email:2'), (4, 'charge-card:9'), (5, 'build-report:3');
CREATE TABLE room_slots (room TEXT NOT NULL, slot TEXT NOT NULL, booked_by TEXT NOT NULL, PRIMARY KEY (room, slot));
INSERT INTO room_slots VALUES ('Everest', '2026-10-20 10:00', 'Asha');
CREATE TABLE events (id INTEGER PRIMARY KEY, name TEXT NOT NULL, capacity INTEGER NOT NULL, seats_taken INTEGER NOT NULL DEFAULT 0 CHECK (seats_taken <= capacity));
INSERT INTO events (id, name, capacity, seats_taken) VALUES (1, 'SQL Workshop', 3, 2);
CREATE TABLE signups (event_id INTEGER NOT NULL REFERENCES events(id), person TEXT NOT NULL, PRIMARY KEY (event_id, person));
INSERT INTO signups VALUES (1, 'Asha'), (1, 'Ben');`;

  // mvcc: a hand-made copy of what PostgreSQL keeps in each row header (xmin / xmax) plus the commit log.
  var DB_MVCC = `CREATE TABLE txns (xid INTEGER PRIMARY KEY, status TEXT NOT NULL CHECK (status IN ('committed', 'aborted', 'in_progress')));
INSERT INTO txns VALUES (100, 'committed'), (105, 'committed'), (107, 'aborted'), (108, 'committed'), (110, 'in_progress');
-- Every physical row version ("tuple"). xmax = 0 means nobody has deleted / replaced it.
CREATE TABLE tuples (ctid TEXT PRIMARY KEY, id INTEGER NOT NULL, owner TEXT NOT NULL, balance INTEGER NOT NULL, xmin INTEGER NOT NULL, xmax INTEGER NOT NULL DEFAULT 0);
INSERT INTO tuples VALUES
  ('(0,1)', 1, 'Asha', 500, 100, 105),
  ('(0,2)', 2, 'Ben',  300, 100, 107),
  ('(0,3)', 1, 'Asha', 400, 105, 110),
  ('(0,4)', 3, 'Chen', 1000, 108, 0),
  ('(0,5)', 1, 'Asha', 350, 110, 0);
-- A snapshot = (xmin, xmax, list of xids still running when it was taken).
CREATE TABLE snapshots (name TEXT PRIMARY KEY, snap_xmin INTEGER NOT NULL, snap_xmax INTEGER NOT NULL);
CREATE TABLE snapshot_xip (name TEXT NOT NULL REFERENCES snapshots(name), xid INTEGER NOT NULL);
INSERT INTO snapshots VALUES ('old_report', 107, 108), ('now', 110, 111);
INSERT INTO snapshot_xip VALUES ('old_report', 107), ('now', 110);`;

  // locks: a tiny lock manager - who holds which lock, who is waiting for what.
  var DB_LOCKS = `CREATE TABLE locks_held (txn TEXT NOT NULL, resource TEXT NOT NULL, mode TEXT NOT NULL CHECK (mode IN ('S', 'X')));
CREATE TABLE lock_waits (txn TEXT NOT NULL, resource TEXT NOT NULL, mode TEXT NOT NULL CHECK (mode IN ('S', 'X')), waiting_since TEXT NOT NULL);
INSERT INTO locks_held VALUES
  ('T1', 'accounts:1', 'X'),
  ('T2', 'accounts:2', 'X'),
  ('T3', 'accounts:3', 'X'),
  ('T4', 'products:MUG', 'S'),
  ('T5', 'products:MUG', 'S');
INSERT INTO lock_waits VALUES
  ('T1', 'accounts:2', 'X', '10:00:01'),
  ('T2', 'accounts:3', 'X', '10:00:02'),
  ('T3', 'accounts:1', 'X', '10:00:03'),
  ('T6', 'accounts:1', 'S', '10:00:04'),
  ('T4', 'products:MUG', 'X', '10:00:05');`;

  /* ---------------- snippet helpers ---------------- */
  function bank(code, title) { return { lang: 'sql', db: 'bank', code: code, title: title || 'SQLite — ▶ Run it against the bank database' }; }
  function mv(code, title) { return { lang: 'sql', db: 'mvcc', code: code, title: title || 'SQLite simulation of MVCC — ▶ Run it' }; }
  function lk(code, title) { return { lang: 'sql', db: 'locks', code: code, title: title || 'SQLite lock-manager simulation — ▶ Run it' }; }
  function pg(code, title) { return { lang: 'sql', code: code, check: false, title: title || 'PostgreSQL (multi-session — run in two psql windows, not in the browser)' }; }
  function my(code, title) { return { lang: 'sql', code: code, check: false, title: title || 'MySQL / InnoDB (multi-session — run in two mysql windows)' }; }

  /* ---------------- visualizer helpers ---------------- */
  // Two transactions interleaving: each step = {t1, t2, data, note, cls, vars, vhl}.
  // Builds one frame per step; the table grows row by row so you watch the schedule unfold.
  function timeline(steps, opts) {
    opts = opts || {};
    var cols = opts.cols || ['#', 'T1', 'T2', 'Data (committed)'];
    var frames = [], rows = [];
    if (opts.intro) frames.push({ narr: opts.intro, parts: [{ type: 'table', label: opts.label || 'Interleaved schedule (time flows down)', columns: cols, rows: [] }, { type: 'vars', label: opts.varsLabel || 'Database state', vals: opts.start || {} }].concat(opts.introText ? [{ type: 'text', html: opts.introText }] : []) });
    steps.forEach(function (s, i) {
      var row = [String(i + 1), s.t1 || '', s.t2 || ''];
      if (cols.length > 3) row.push(s.data || '');
      if (cols.length > 4) row.push(s.extra || '');
      rows.push(row);
      var hl = {};
      rows.forEach(function (_, k) { hl[k] = 'done'; });
      hl[i] = s.cls || 'cur';
      var parts = [{ type: 'table', label: opts.label || 'Interleaved schedule (time flows down)', columns: cols, rows: rows.map(function (r) { return r.slice(); }), hl: hl }];
      if (s.vars) parts.push({ type: 'vars', label: opts.varsLabel || 'Database state', vals: s.vars, hl: s.vhl || {} });
      if (s.extraParts) parts = parts.concat(s.extraParts);
      frames.push({ narr: s.note, parts: parts });
    });
    return frames;
  }
  function pick(input, allowed, dflt) {
    var k = String(input === undefined ? dflt : input).trim().toLowerCase();
    if (!k) k = dflt;
    if (allowed.indexOf(k) < 0) throw new Error('Type one of: ' + allowed.join(', '));
    return k;
  }
  /* =====================================================================
     TOPIC 1 — Transactions & ACID
     ===================================================================== */
  topics.push({
    title: 'Transactions & ACID: All-or-Nothing Units of Work',
    analogy: `<p>Think of an <b>online money transfer</b> as a <b>sealed envelope</b>. Inside are two instructions: "take ₹200 from Asha" and "give ₹200 to Ben". The bank either opens the envelope and does <b>both</b>, or throws the whole envelope away and does <b>neither</b>. It never does half. If the power goes out after the first line, the bank tears up that half-done work when it restarts. That sealed envelope is a <b>transaction</b>.</p>
<p>A second picture: a <b>wedding vow</b>. Until both people say "I do" (COMMIT), nothing is official. Either can walk away (ROLLBACK) and it is as if the ceremony never started.</p>`,
    explain: `<p>A <b>transaction</b> is a group of SQL statements that the database treats as <b>one single unit</b>. You start it with <code>BEGIN</code> (or <code>START TRANSACTION</code>), run your statements, and finish with either <code>COMMIT</code> ("make it permanent") or <code>ROLLBACK</code> ("undo everything since BEGIN").</p>
<p>Good transactions promise four things, remembered as <b>ACID</b>:</p>
${H.table(['Letter', 'Plain meaning', 'Bank-transfer example', 'Who makes it happen'], [
  ['<b>A</b>tomicity', 'All or nothing', 'Debit and credit both happen, or neither', 'Undo log / rollback'],
  ['<b>C</b>onsistency', 'Rules are never broken at commit', 'No negative balance; total money stays the same', 'Constraints + <i>your</i> code'],
  ['<b>I</b>solation', 'Running together feels like running alone', 'A report never sees money "in flight"', 'Locks or MVCC (rest of this module)'],
  ['<b>D</b>urability', 'Once committed, it survives a crash', 'Power cut after "Transfer done" → money still moved', 'Write-ahead log + fsync']
])}
<p><b>Autocommit:</b> if you do not write <code>BEGIN</code>, almost every database wraps <i>each single statement</i> in its own tiny transaction. That is why one <code>UPDATE</code> is always atomic by itself — but two separate <code>UPDATE</code>s are <span class="c-r">not</span> atomic together.</p>
<p><b>Savepoints</b> are bookmarks <i>inside</i> a transaction: <code>SAVEPOINT s1</code> … <code>ROLLBACK TO s1</code> undoes only the work after the bookmark, and the outer transaction keeps going.</p>
<p>The rest of this module is mostly about the hardest letter, <b>I</b>: what happens when many transactions run at the same moment.</p>`,
    clues: [
      '"money must not be lost or created" / "transfer between accounts" → one transaction, and know what A, C, I, D each guarantee',
      '"what happens if the server crashes halfway?" → atomicity via undo + durability via write-ahead log',
      '"partial failure in a batch import" → SAVEPOINT / ROLLBACK TO, not a giant all-or-nothing',
      '"inserting 100k rows is very slow" → you are in autocommit; one fsync per row. Batch rows into one transaction',
      '"is the C in ACID the same as the C in CAP?" → no: ACID-C = invariants/constraints, CAP-C = linearizability',
      '"exactly once" / "never charge twice" → transaction + idempotency key with a UNIQUE constraint'
    ],
    code: [
      bank(`-- Move 200 from Asha (id 1) to Ben (id 2) as ONE unit of work.
BEGIN;                                              -- start the envelope
UPDATE accounts SET balance = balance - 200 WHERE id = 1;
UPDATE accounts SET balance = balance + 200 WHERE id = 2;
INSERT INTO ledger (from_id, to_id, amount, note) VALUES (1, 2, 200, 'rent share');
COMMIT;                                             -- seal it: all three changes become permanent together

-- Total money in the bank is unchanged (consistency invariant): 1800 before, 1800 after.
SELECT id, owner, balance FROM accounts ORDER BY id;
SELECT SUM(balance) AS total_money FROM accounts;`, 'BEGIN … COMMIT: an atomic transfer (▶ Run)'),
      bank(`-- ROLLBACK throws away everything since BEGIN.
BEGIN;
UPDATE accounts SET balance = 0 WHERE id = 3;        -- oops, wiped Chen's money
SELECT 'inside txn' AS phase, owner, balance FROM accounts WHERE id = 3;   -- we see our own change
ROLLBACK;                                            -- undo!
SELECT 'after rollback' AS phase, owner, balance FROM accounts WHERE id = 3; -- back to 1000`, 'ROLLBACK undoes the whole transaction (▶ Run)'),
      bank(`-- SAVEPOINT = a bookmark inside a transaction. Undo part of the work, keep the rest.
BEGIN;
INSERT INTO ledger (from_id, to_id, amount, note) VALUES (1, 2, 10, 'row 1 ok');
SAVEPOINT before_row2;
INSERT INTO ledger (from_id, to_id, amount, note) VALUES (2, 3, 99999, 'row 2 looks suspicious');
ROLLBACK TO before_row2;      -- undo only row 2
RELEASE before_row2;          -- forget the bookmark
INSERT INTO ledger (from_id, to_id, amount, note) VALUES (3, 1, 25, 'row 3 ok');
COMMIT;
SELECT id, from_id, to_id, amount, note FROM ledger ORDER BY id;   -- only the 'row 1 ok' and 'row 3 ok' entries`, 'SAVEPOINT / ROLLBACK TO for partial undo (▶ Run)'),
      pg(`-- PostgreSQL: same idea, plus explicit isolation level and error handling in the app.
BEGIN ISOLATION LEVEL READ COMMITTED;     -- the default level in Postgres
UPDATE accounts SET balance = balance - 200 WHERE id = 1 AND balance >= 200;
-- app checks: "UPDATE 1"? continue.  "UPDATE 0"? -> ROLLBACK and tell the user "insufficient funds".
UPDATE accounts SET balance = balance + 200 WHERE id = 2;
COMMIT;

-- MySQL spelling:
-- START TRANSACTION;  ...  COMMIT;   (autocommit=1 by default; SET autocommit = 0 changes that)`, 'PostgreSQL / MySQL syntax (not runnable here)')
    ],
    codeTitle: ['Atomic transfer', 'ROLLBACK', 'SAVEPOINT', 'Postgres / MySQL'],
    viz: {
      title: 'Bank transfer: COMMIT vs crash vs failed check',
      input: '200 crash',
      inputLabel: 'amount + ending (commit | crash | fail), e.g. "200 commit"',
      gen: function (input) {
        var parts = String(input || '200 crash').trim().split(/\s+/);
        var amt = parseInt(parts[0], 10), mode = (parts[1] || 'commit').toLowerCase();
        if (isNaN(amt) || amt <= 0 || amt > 100000) throw new Error('Start with a positive amount, e.g. "200 crash"');
        if (['commit', 'crash', 'fail'].indexOf(mode) < 0) throw new Error('Ending must be commit, crash or fail');
        var A = 500, B = 300, frames = [];
        if (mode === 'fail' && amt <= A) amt = A + 100;   // force the CHECK failure story
        function acc(a, b, hl) { return { type: 'table', label: 'accounts (in the buffer pool)', columns: ['id', 'owner', 'balance'], rows: [['1', 'Asha', String(a)], ['2', 'Ben', String(b)]], hl: hl || {} }; }
        function st(v, hl) { return { type: 'vars', label: 'Transaction T7', vals: v, hl: hl || {} }; }
        frames.push({ narr: 'Start. Asha has <b>500</b>, Ben has <b>300</b>. Total money = <b>800</b>. That total is our <b>invariant</b>: a correct transfer never changes it.', parts: [acc(A, B), { type: 'stack', label: 'Undo log (how to reverse)', items: [] }, { type: 'queue', label: 'Write-ahead log (WAL)', items: [], frontLabel: 'older', backLabel: 'newer' }, st({ state: 'none', total: A + B })] });
        frames.push({ narr: '<b>BEGIN</b>. The database gives the transaction an id (T7). Nothing has changed yet — the envelope is open but empty.', parts: [acc(A, B), { type: 'stack', label: 'Undo log', items: [] }, { type: 'queue', label: 'WAL', items: ['T7 BEGIN'], hl: { 0: 'cur' }, frontLabel: 'older', backLabel: 'newer' }, st({ state: 'active', total: A + B }, { state: 'cur' })] });
        if (mode === 'fail') {
          frames.push({ narr: '<b>UPDATE balance = balance − ' + amt + '</b> for Asha would make it <b>' + (A - amt) + '</b>. The <code>CHECK (balance &gt;= 0)</code> constraint fires: <span class="c-r">statement error</span>. This is <b>Consistency</b> doing its job — the rule is enforced by the database, not by hope.', parts: [acc(A, B, { 0: 'bad' }), { type: 'stack', label: 'Undo log', items: [] }, { type: 'queue', label: 'WAL', items: ['T7 BEGIN'], frontLabel: 'older', backLabel: 'newer' }, st({ state: 'error', total: A + B }, { state: 'bad' })] });
          frames.push({ narr: 'The app catches the error and runs <b>ROLLBACK</b>. (In PostgreSQL the transaction is now "aborted" and refuses every statement until you ROLLBACK.) Nothing changed.', parts: [acc(A, B), { type: 'stack', label: 'Undo log', items: [] }, { type: 'queue', label: 'WAL', items: ['T7 BEGIN', 'T7 ABORT'], hl: { 1: 'bad' }, frontLabel: 'older', backLabel: 'newer' }, st({ state: 'rolled back', total: A + B }, { state: 'bad' })] });
          frames.push({ narr: 'Final: still 500 / 300, total 800. The user sees "insufficient funds". <b>Atomicity + Consistency</b> together.', parts: [acc(A, B, { 0: 'ok', 1: 'ok' }), st({ state: 'done', total: A + B }, { total: 'ok' })] });
          return frames;
        }
        frames.push({ narr: '<b>UPDATE</b> Asha: 500 → <b>' + (A - amt) + '</b>. Before changing the page, the database writes an <b>undo record</b> ("Asha was 500") and a <b>WAL record</b> ("T7 set Asha = ' + (A - amt) + '"). Other sessions still see 500 — <b>Isolation</b>.', parts: [acc(A - amt, B, { 0: 'cur' }), { type: 'stack', label: 'Undo log', items: ['Asha was 500'], hl: { 0: 'cur' } }, { type: 'queue', label: 'WAL', items: ['T7 BEGIN', 'T7 Asha=' + (A - amt)], hl: { 1: 'cur' }, frontLabel: 'older', backLabel: 'newer' }, st({ state: 'active', total: A - amt + B }, { total: 'bad' })] });
        if (mode === 'crash') {
          frames.push({ narr: '<span class="c-r">⚡ Power cut!</span> Ben was never credited. Right now the total is <b>' + (A - amt + B) + '</b> — ' + amt + ' has vanished. This half-done state must never be visible after restart.', parts: [acc(A - amt, B, { 0: 'bad', 1: 'bad' }), { type: 'stack', label: 'Undo log', items: ['Asha was 500'] }, { type: 'queue', label: 'WAL (on disk)', items: ['T7 BEGIN', 'T7 Asha=' + (A - amt)], frontLabel: 'older', backLabel: 'newer' }, st({ state: 'CRASHED', total: A - amt + B }, { state: 'bad', total: 'bad' })] });
          frames.push({ narr: '<b>Recovery on restart:</b> the database reads the WAL. It finds T7 BEGIN but <b>no COMMIT record</b> → T7 is a "loser". It applies the undo record: Asha back to 500. <b>Atomicity</b> restored the all-or-nothing promise.', parts: [acc(A, B, { 0: 'ok' }), { type: 'stack', label: 'Undo log', items: ['Asha was 500'], hl: { 0: 'ok' } }, { type: 'queue', label: 'WAL', items: ['T7 BEGIN', 'T7 Asha=' + (A - amt), 'T7 ABORT (recovery)'], hl: { 2: 'bad' }, frontLabel: 'older', backLabel: 'newer' }, st({ state: 'rolled back', total: A + B }, { total: 'ok' })] });
          frames.push({ narr: 'Final: 500 / 300, total 800 — as if the transfer never started. The user retries. Lesson: <b>no COMMIT record on disk = it never happened</b>.', parts: [acc(A, B, { 0: 'ok', 1: 'ok' }), st({ state: 'never happened', total: A + B }, { total: 'ok' })] });
          return frames;
        }
        frames.push({ narr: '<b>UPDATE</b> Ben: 300 → <b>' + (B + amt) + '</b>. Another undo + WAL record. Inside T7 the total is back to 800; outside, nobody has seen any of it yet.', parts: [acc(A - amt, B + amt, { 1: 'cur' }), { type: 'stack', label: 'Undo log', items: ['Asha was 500', 'Ben was 300'], hl: { 1: 'cur' } }, { type: 'queue', label: 'WAL', items: ['T7 BEGIN', 'T7 Asha=' + (A - amt), 'T7 Ben=' + (B + amt)], hl: { 2: 'cur' }, frontLabel: 'older', backLabel: 'newer' }, st({ state: 'active', total: A + B }, { total: 'ok' })] });
        frames.push({ narr: '<b>COMMIT</b>: write a COMMIT record to the WAL and <b>fsync</b> it to disk. The moment fsync returns, the transfer is <b>durable</b>. The data pages themselves can be written to disk later (checkpoint) — the log is enough to redo them after a crash.', parts: [acc(A - amt, B + amt, { 0: 'ok', 1: 'ok' }), { type: 'stack', label: 'Undo log (kept for MVCC readers, purged later)', items: ['Asha was 500', 'Ben was 300'] }, { type: 'queue', label: 'WAL (fsynced)', items: ['T7 BEGIN', 'T7 Asha=' + (A - amt), 'T7 Ben=' + (B + amt), 'T7 COMMIT'], hl: { 3: 'ok' }, frontLabel: 'older', backLabel: 'newer' }, st({ state: 'committed', total: A + B }, { state: 'ok' })] });
        frames.push({ narr: 'Even if power fails <i>now</i>, recovery replays (redoes) the WAL and both balances come back. Everyone else now sees ' + (A - amt) + ' / ' + (B + amt) + ' at the same instant — never one without the other.', parts: [acc(A - amt, B + amt, { 0: 'sel', 1: 'sel' }), st({ state: 'durable', total: A + B }, { state: 'ok', total: 'ok' })] });
        return frames;
      }
    },
    examples: [
      { title: 'Two autocommit statements are NOT atomic together', html: `<p>Without <code>BEGIN</code>, <code>UPDATE … -200</code> commits on its own. If the app crashes before the second <code>UPDATE … +200</code>, the money is gone forever — the database did exactly what it was told. ${H.c('r', 'Rule: if two changes must happen together, they go in one transaction (or one statement).')}</p>`, code: bank(`-- Simulate "the app died between the two statements": only the first one ran.
UPDATE accounts SET balance = balance - 200 WHERE id = 1;   -- autocommitted immediately
-- (crash here; the credit to Ben never runs)
SELECT SUM(balance) AS total_money FROM accounts;            -- 1600, not 1800: 200 vanished`, 'The autocommit trap (▶ Run)') },
      { title: 'Batch import with savepoints', html: `<p>Importing 10,000 rows where a few are bad. One giant transaction means one bad row throws away 9,999 good ones. One transaction per row means 10,000 fsyncs (slow!). ${H.c('g', 'Middle path:')} one transaction, a <code>SAVEPOINT</code> before each row (or each chunk), <code>ROLLBACK TO</code> on a bad row, log it, continue. Postgres needs this pattern because after any error the whole transaction is aborted unless you rolled back to a savepoint.</p>` },
      { title: 'Why 100k INSERTs take minutes — and then 1 second', html: `<p>In autocommit, every INSERT is its own transaction, and every COMMIT waits for an <b>fsync</b> (≈ 0.1–10 ms on real disks). 100,000 × 2 ms = 200 s. Wrap them in <code>BEGIN … COMMIT</code> and there is <b>one</b> fsync: ~1 s. Same data, same safety, 100× faster. This is the #1 SQLite performance tip.</p>${H.table(['Style', 'fsyncs', 'Time (2 ms fsync)'], [['autocommit', '100,000', '≈ 200 s'], ['one transaction', '1', '≈ 1 s']])}` },
      { title: 'Consistency is partly YOUR job', html: `<p>The database can enforce <code>CHECK (balance &gt;= 0)</code>, foreign keys and UNIQUE. It cannot know that "total money must stay constant" or "a doctor shift needs ≥ 1 person on call" unless you encode it. ACID's <b>C</b> really means: <i>if each transaction alone keeps the rules, then A + I + D guarantee the rules stay kept even with crashes and concurrency</i>. Write-skew (topic 3) is exactly the case where weak isolation breaks a rule every single transaction respected on its own.</p>` }
    ],
    deepDive: `<p><b>How atomicity and durability are really built.</b> Almost every engine uses a <b>write-ahead log (WAL)</b>: before a changed page may be written to the data file, the log record describing the change must already be on disk ("write-ahead"). COMMIT = append a commit record + <code>fsync</code> the log. Data pages are flushed lazily (checkpoints). After a crash, recovery (the ARIES idea: <b>analysis → redo → undo</b>) replays the log forward to rebuild everything, then rolls back transactions that have no commit record. You will meet ARIES properly in the Storage Engines module.</p>
<p><b>Where the "undo" lives:</b> InnoDB keeps undo logs (also used for MVCC old versions). PostgreSQL has <i>no</i> undo log: an aborted transaction's new row versions simply stay in the table, marked invisible by the commit log (clog), and VACUUM cleans them later — which is why rollback in Postgres is instant. SQLite uses a rollback journal or, in WAL mode, appends new pages to a <code>-wal</code> file.</p>
<p><b>Knobs that trade durability for speed:</b> Postgres <code>synchronous_commit = off</code> (may lose the last ~few hundred ms of commits on crash, but never corrupts), MySQL <code>innodb_flush_log_at_trx_commit = 2</code>, SQLite <code>PRAGMA synchronous = NORMAL</code> in WAL mode. <b>Group commit</b> batches many transactions' fsyncs into one, which is why throughput scales with concurrency.</p>
<p><b>Edge cases interviewers love:</b> (1) DDL is transactional in PostgreSQL and SQLite (you can ROLLBACK a <code>CREATE TABLE</code>) but causes an implicit commit in MySQL and Oracle. (2) In PostgreSQL, after an error inside a transaction every further statement fails with "current transaction is aborted" until ROLLBACK. (3) A COMMIT whose network reply is lost leaves the client unsure whether it committed — which is why idempotency keys exist. (4) Sequences/auto-increment values are not rolled back: gaps in ids are normal.</p>`,
    aiEra: `<p><b>What AI changes:</b> assistants write transaction code instantly, and ORMs hide <code>BEGIN</code>/<code>COMMIT</code> behind decorators like <code>@Transactional</code> or <code>with session.begin()</code>. That makes it <i>easier</i> to get boundaries wrong without noticing: a generated service calls two repository methods that each open their own transaction, so "debit" and "credit" are atomic separately but not together.</p>
<p><b>Use AI as a partner:</b> ask <code>List every statement in this request handler and tell me which transaction each runs in</code>, or <code>Where could a crash between two writes leave inconsistent data?</code> It is good at spotting missing boundaries and external calls (HTTP, email) inside a transaction that hold locks for seconds.</p>
<p><b>Where AI goes wrong:</b> it happily retries a non-idempotent transaction after a timeout (double charge), puts a payment-gateway call between BEGIN and COMMIT, or claims "the ORM handles atomicity". It also mixes up ACID-consistency with CAP-consistency.</p>
<p><b>What you must still own:</b> drawing the transaction boundary around the business invariant, deciding what is safe to retry, and knowing which of A, C, I, D your database actually configures (fsync settings, replication acks).</p>`,
    problems: [{
      title: 'Guarded Transfer with an Audit Row',
      level: 'Easy', tags: ['transaction', 'atomicity', 'ledger'], companies: ['Stripe', 'PayPal', 'Razorpay'],
      statement: `<p>Move <b>200</b> from account 1 (Asha) to account 2 (Ben) and write one row to <code>ledger</code>. All three changes must happen together, and <b>only if</b> Asha has at least 200. If she does not, nothing at all may change. Use the <code>bank</code> database.</p>`,
      constraints: `<p>Pure SQL (SQLite). <code>balance</code> has <code>CHECK (balance &gt;= 0)</code>. Assume one session for now (concurrency comes later).</p>`,
      example: `<p>Before: Asha 500, Ben 300, ledger empty. After: ${H.c('g', 'Asha 300, Ben 500, ledger has (1 → 2, 200)')}. Total money stays 1800. If the amount were 900: ${H.c('r', 'nothing changes at all')}.</p>`,
      brute: { why: `<p>Two autocommit UPDATEs and an INSERT: each commits by itself, so a crash after the first leaves money destroyed, and nothing checks the balance first — the CHECK constraint would throw an error halfway through a multi-row script.</p>`, code: bank(`-- BAD: three separate mini-transactions (autocommit). Not atomic together.
UPDATE accounts SET balance = balance - 200 WHERE id = 1;
UPDATE accounts SET balance = balance + 200 WHERE id = 2;
INSERT INTO ledger (from_id, to_id, amount, note) VALUES (1, 2, 200, 'no guard, no txn');
SELECT * FROM accounts;`, 'Naive: no transaction') },
      mcq: { q: 'Which statement makes the debit + credit + ledger write all-or-nothing?', options: ['Wrapping them in BEGIN … COMMIT', 'Adding an index on accounts.id', 'Running them faster', 'Using SELECT … LIMIT 1'], answer: 0, explain: 'Only a transaction boundary gives atomicity across several statements.' },
      hints: [
        `<p>Hint 1: Everything that must succeed or fail together goes between one <code>BEGIN</code> and one <code>COMMIT</code>.</p>`,
        `<p>Hint 2: Decide "is there enough money?" <b>once</b>, at the start, and make every change conditional on that decision (a guard in the WHERE clause).</p>`,
        `<p>Hint 3: In an app you would check "rows affected" and ROLLBACK. In pure SQL, store the decision in a temp table and add <code>AND (SELECT ok FROM t_ok)</code> to each write.</p>`
      ],
      tests: { engine: 'sqlite', check: '(rows, cols, c) => {\n  if (c.plan || c.noplan) { const d = rows.map(r => r[r.length - 1]).join(\'\\n\'); return (!c.plan || new RegExp(c.plan).test(d)) && (!c.noplan || !new RegExp(c.noplan).test(d)); }\n  let a = rows, b = c.rows || [];\n  if (c.set) { const k = r => JSON.stringify(r); a = a.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); b = b.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); }\n  return a.length === b.length && a.every((r, i) => r.length === b[i].length && r.every((v, j) => v === b[i][j] || (typeof v === \'number\' && typeof b[i][j] === \'number\' && Math.abs(v - b[i][j]) < 1e-6)));\n}', cases: [
        { rows: [
            [1800]
          ] },
        { after: 'SELECT id, owner, balance FROM accounts ORDER BY id', rows: [
            [1, 'Asha', 300],
            [2, 'Ben', 500],
            [3, 'Chen', 1000]
          ] },
        { after: 'SELECT from_id, to_id, amount, note FROM ledger', rows: [
            [1, 2, 200, 'guarded transfer']
          ] },
        { setup: 'UPDATE accounts SET balance = 199 WHERE id = 1', after: 'SELECT id, owner, balance FROM accounts ORDER BY id', rows: [
            [1, 'Asha', 199],
            [2, 'Ben', 300],
            [3, 'Chen', 1000]
          ] },
        { setup: 'UPDATE accounts SET balance = 199 WHERE id = 1', after: 'SELECT count(*) FROM ledger', rows: [
            [0]
          ] },
        { setup: 'UPDATE accounts SET balance = 200 WHERE id = 1', after: 'SELECT id, owner, balance FROM accounts ORDER BY id', rows: [
            [1, 'Asha', 0],
            [2, 'Ben', 500],
            [3, 'Chen', 1000]
          ] },
        { setup: 'UPDATE accounts SET balance = 200 WHERE id = 1', rows: [
            [1500]
          ] },
        { setup: 'UPDATE accounts SET balance = 100 WHERE id = 1', rows: [
            [1400]
          ] },
        { setup: 'DELETE FROM accounts WHERE id = 1', after: 'SELECT id, owner, balance FROM accounts ORDER BY id', rows: [
            [2, 'Ben', 300],
            [3, 'Chen', 1000]
          ] },
        { setup: 'DELETE FROM accounts WHERE id = 1', after: 'SELECT count(*) FROM ledger', rows: [
            [0]
          ] },
        { setup: 'INSERT INTO ledger VALUES (7,3,1,5,\'old\')', after: 'SELECT id, from_id, to_id, amount, note FROM ledger ORDER BY id', rows: [
            [7, 3, 1, 5, 'old'],
            [8, 1, 2, 200, 'guarded transfer']
          ] },
        { after: 'SELECT count(*) FROM sqlite_temp_master', rows: [
            [0]
          ] },
        { after: 'BEGIN; COMMIT', rows: [] }
      ] },
      solution: {
        approach: `<p>Open one transaction. Compute the guard once (<code>balance &gt;= 200</code>) into a temp table. Every write checks the guard, so either all three writes apply or none do. In application code the equivalent is: <code>UPDATE … WHERE id = 1 AND balance &gt;= 200</code>, check that exactly 1 row changed, otherwise ROLLBACK.</p>`,
        code: bank(`BEGIN;
-- Decide once: does Asha have enough?
CREATE TEMP TABLE t_ok AS SELECT (balance >= 200) AS ok FROM accounts WHERE id = 1;

UPDATE accounts SET balance = balance - 200 WHERE id = 1 AND (SELECT ok FROM t_ok);
UPDATE accounts SET balance = balance + 200 WHERE id = 2 AND (SELECT ok FROM t_ok);
INSERT INTO ledger (from_id, to_id, amount, note)
SELECT 1, 2, 200, 'guarded transfer' WHERE (SELECT ok FROM t_ok);
DROP TABLE t_ok;
COMMIT;

SELECT id, owner, balance FROM accounts ORDER BY id;
SELECT from_id, to_id, amount, note FROM ledger;
SELECT SUM(balance) AS total_money FROM accounts;   -- still 1800`, 'Guarded atomic transfer (▶ Run)'),
        dry: { head: ['step', 'statement', 'Asha', 'Ben', 'ledger rows'], rows: [['1', 'BEGIN; guard ok = 1', '500', '300', '0'], ['2', 'debit', '300', '300', '0'], ['3', 'credit', '300', '500', '0'], ['4', 'ledger insert', '300', '500', '1'], ['5', 'COMMIT', '300', '500', '1 (all visible at once)']] },
        complexity: `<p>Three point writes by primary key: O(log N) each. One fsync at COMMIT.</p>`,
        followUps: ['Two sessions run this at the same time on a 300 balance — can both pass the guard? (Topic 3: lost update / check-then-act.)', 'How would you make the transfer idempotent if the client retries after a timeout?']
      }
    }]
  });
  /* =====================================================================
     TOPIC 2 — Read anomalies
     ===================================================================== */
  var ANOM = {
    dirty: {
      intro: '<b>Dirty read</b>: T1 reads a value that T2 wrote but has <i>not committed</i>. If T2 rolls back, T1 used data that never officially existed.',
      start: { 'Asha.balance': 500 },
      steps: [
        { t2: 'BEGIN', data: 'Asha = 500', note: 'T2 starts (it is an admin fixing a typo).', vars: { 'Asha (committed)': 500, 'T2 private': '-' } },
        { t2: "UPDATE Asha SET balance = 100", data: 'Asha = 500 (100 uncommitted)', note: 'T2 changes Asha to 100 but has <b>not committed</b>. Committed truth is still 500.', vars: { 'Asha (committed)': 500, 'T2 private': 100 }, vhl: { 'T2 private': 'cur' } },
        { t1: 'BEGIN; SELECT balance → 100', data: 'Asha = 500', note: 'T1 (loan approval) reads Asha. Under READ UNCOMMITTED it sees <span class="c-r">100</span> — a value that is not committed. That is the <b>dirty read</b>.', cls: 'bad', vars: { 'Asha (committed)': 500, 'T2 private': 100, 'T1 saw': 100 }, vhl: { 'T1 saw': 'bad' } },
        { t1: 'reject loan (balance too low)', data: 'Asha = 500', note: 'T1 makes a business decision on the dirty value: loan rejected.', cls: 'bad', vars: { 'Asha (committed)': 500, 'T1 saw': 100, 'T1 decision': 'reject' }, vhl: { 'T1 decision': 'bad' } },
        { t2: 'ROLLBACK', data: 'Asha = 500', note: 'T2 changes its mind and rolls back. The 100 <b>never existed</b> — but T1 already acted on it.', cls: 'bad', vars: { 'Asha (committed)': 500, 'T1 saw': 100 }, vhl: { 'Asha (committed)': 'ok', 'T1 saw': 'bad' } },
        { t1: 'COMMIT', data: 'Asha = 500', note: '<b>Fix:</b> READ COMMITTED or higher. T1 would have seen 500 (MVCC: the last committed version) or waited for T2 (locking). Every mainstream database prevents this by default.', cls: 'ok', vars: { 'Asha (committed)': 500, 'Prevented from': 'READ COMMITTED' }, vhl: { 'Prevented from': 'ok' } }
      ]
    },
    nonrepeatable: {
      intro: '<b>Non-repeatable (fuzzy) read</b>: T1 reads the same row twice and gets two different answers, because T2 committed a change in between.',
      start: { 'Asha.balance': 500 },
      steps: [
        { t1: 'BEGIN; SELECT balance → 500', data: 'Asha = 500', note: 'T1 (a statement generator) reads Asha: 500. It prints "Opening balance: 500".', vars: { 'Asha (committed)': 500, 'T1 read #1': 500 } },
        { t2: 'BEGIN; UPDATE Asha SET balance = 300', data: 'Asha = 500 (300 pending)', note: 'T2 (a withdrawal) changes Asha to 300.', vars: { 'Asha (committed)': 500, 'T1 read #1': 500, 'T2 private': 300 } },
        { t2: 'COMMIT', data: 'Asha = 300', note: 'T2 commits. The committed value is now 300. Perfectly legal.', vars: { 'Asha (committed)': 300, 'T1 read #1': 500 }, vhl: { 'Asha (committed)': 'cur' } },
        { t1: 'SELECT balance → 300', data: 'Asha = 300', note: 'Under READ COMMITTED each <b>statement</b> sees the latest committed data, so T1 now gets <span class="c-r">300</span>. Same row, same transaction, two answers: a <b>non-repeatable read</b>.', cls: 'bad', vars: { 'Asha (committed)': 300, 'T1 read #1': 500, 'T1 read #2': 300 }, vhl: { 'T1 read #1': 'bad', 'T1 read #2': 'bad' } },
        { t1: 'print "Closing balance: 300"; COMMIT', data: 'Asha = 300', note: 'The statement says opening 500, closing 300, but lists no withdrawal — confusing and wrong.', cls: 'bad', vars: { 'T1 report': 'open 500, close 300, 0 txns' }, vhl: { 'T1 report': 'bad' } },
        { t1: '(with REPEATABLE READ: read #2 → 500)', data: 'Asha = 300', note: '<b>Fix:</b> REPEATABLE READ / snapshot isolation. T1 keeps reading from the snapshot taken at its first query, so both reads return 500. (Lock-based databases instead make T2 wait for T1\'s shared lock.)', cls: 'ok', vars: { 'T1 read #1': 500, 'T1 read #2': 500, 'Prevented from': 'REPEATABLE READ' }, vhl: { 'T1 read #2': 'ok', 'Prevented from': 'ok' } }
      ]
    },
    phantom: {
      intro: '<b>Phantom read</b>: T1 runs the same <i>search</i> (a WHERE condition) twice and a <b>new row</b> appears (or one disappears), because T2 inserted/deleted a matching row.',
      start: { 'signups(event 1)': 2 },
      steps: [
        { t1: "BEGIN; SELECT COUNT(*) FROM signups WHERE event_id = 1 → 2", data: '2 signups', note: 'T1 (capacity report) counts signups for the SQL Workshop: 2.', vars: { 'rows matching': 'Asha, Ben', 'T1 count #1': 2 } },
        { t2: "BEGIN; INSERT INTO signups VALUES (1, 'Chen')", data: '2 signups (+1 pending)', note: 'T2 inserts a <b>brand-new row</b> that matches T1\'s WHERE condition. Row locks on existing rows cannot stop this — the row did not exist to be locked!', vars: { 'rows matching': 'Asha, Ben', 'T2 private': '+Chen' } },
        { t2: 'COMMIT', data: '3 signups', note: 'T2 commits.', vars: { 'rows matching': 'Asha, Ben, Chen', 'T1 count #1': 2 }, vhl: { 'rows matching': 'cur' } },
        { t1: "SELECT * FROM signups WHERE event_id = 1 → 3 rows", data: '3 signups', note: 'T1 lists the rows to print them: <span class="c-r">3 rows</span>, but it just said "2 signups". Chen is a <b>phantom</b>.', cls: 'bad', vars: { 'T1 count #1': 2, 'T1 list #2': 'Asha, Ben, Chen' }, vhl: { 'T1 list #2': 'bad' } },
        { t1: 'COMMIT', data: '3 signups', note: 'Phantoms are about <b>predicates</b> (sets of rows), not single rows. ANSI allows them under REPEATABLE READ; only SERIALIZABLE forbids them.', cls: 'bad', vars: { 'anomaly': 'phantom' }, vhl: { anomaly: 'bad' } },
        { t1: '(snapshot / predicate lock → 2 rows)', data: '3 signups', note: '<b>Fix:</b> SERIALIZABLE (predicate or next-key/gap locks block the INSERT), or any snapshot-based level for read-only queries — PostgreSQL REPEATABLE READ and MySQL REPEATABLE READ plain SELECTs both keep returning 2.', cls: 'ok', vars: { 'T1 list #2': 'Asha, Ben', 'Prevented from': 'SERIALIZABLE (and snapshots)' }, vhl: { 'T1 list #2': 'ok', 'Prevented from': 'ok' } }
      ]
    },
    readskew: {
      intro: '<b>Read skew</b>: T1 reads two <i>related</i> rows at different moments and sees a combination that never existed. Rule: Asha + Ben must always total 800.',
      start: { Asha: 500, Ben: 300 },
      steps: [
        { t1: 'BEGIN; SELECT balance FROM Asha → 500', data: 'Asha 500, Ben 300', note: 'T1 (audit: "sum of all balances") reads Asha = 500.', vars: { Asha: 500, Ben: 300, 'T1 sum so far': 500 } },
        { t2: 'BEGIN; Asha -= 100; Ben += 100', data: 'Asha 500, Ben 300 (pending)', note: 'T2 transfers 100 from Asha to Ben inside a proper transaction.', vars: { Asha: 500, Ben: 300, 'T2 private': 'Asha 400, Ben 400' } },
        { t2: 'COMMIT', data: 'Asha 400, Ben 400', note: 'T2 commits. Total is still 800 — T2 is perfectly correct on its own.', vars: { Asha: 400, Ben: 400, 'T1 sum so far': 500 }, vhl: { Asha: 'cur', Ben: 'cur' } },
        { t1: 'SELECT balance FROM Ben → 400', data: 'Asha 400, Ben 400', note: 'T1 reads Ben = 400 (latest committed). T1 has now seen Asha at time 1 and Ben at time 3.', cls: 'bad', vars: { Asha: 400, Ben: 400, 'T1 sum': 900 }, vhl: { 'T1 sum': 'bad' } },
        { t1: 'report total = 900; COMMIT', data: 'Asha 400, Ben 400', note: 'The audit reports <span class="c-r">900</span> — a world that never existed (500 + 400). The bank "created" 100 on paper. That is <b>read skew</b>, and it happens under READ COMMITTED.', cls: 'bad', vars: { 'T1 report': 900, 'true total': 800 }, vhl: { 'T1 report': 'bad', 'true total': 'ok' } },
        { t1: '(snapshot: Ben → 300, total 800)', data: 'Asha 400, Ben 400', note: '<b>Fix:</b> read everything from <b>one snapshot</b>: REPEATABLE READ / snapshot isolation, or compute the total in <b>one statement</b> (<code>SELECT SUM(balance)</code> — even READ COMMITTED gives a single statement a consistent snapshot).', cls: 'ok', vars: { 'T1 report': 800, 'Prevented from': 'REPEATABLE READ / snapshot' }, vhl: { 'T1 report': 'ok', 'Prevented from': 'ok' } }
      ]
    },
    dirtywrite: {
      intro: '<b>Dirty write</b>: T2 overwrites a value T1 wrote but has not committed. Then rollbacks become impossible to define. Rule: a car listing and its invoice must name the same buyer.',
      start: { 'listing.buyer': '-', 'invoice.buyer': '-' },
      steps: [
        { t1: "BEGIN; UPDATE listing SET buyer='Asha'", data: 'listing=Asha(unc.)', note: 'T1 (Asha buys the car) writes the listing.', vars: { 'listing.buyer': 'Asha?', 'invoice.buyer': '-' } },
        { t2: "BEGIN; UPDATE listing SET buyer='Ben'", data: 'listing=Ben(unc.)', note: 'Without write locks, T2 (Ben buys) <b>overwrites T1\'s uncommitted write</b>. That is a dirty write.', cls: 'bad', vars: { 'listing.buyer': 'Ben?', 'invoice.buyer': '-' }, vhl: { 'listing.buyer': 'bad' } },
        { t2: "UPDATE invoice SET buyer='Ben'; COMMIT", data: 'listing=Ben, invoice=Ben', note: 'T2 writes the invoice and commits.', vars: { 'listing.buyer': 'Ben', 'invoice.buyer': 'Ben' } },
        { t1: "UPDATE invoice SET buyer='Asha'; COMMIT", data: 'listing=Ben, invoice=Asha', note: 'T1 writes the invoice and commits. Result: listing says Ben, invoice says Asha — <span class="c-r">inconsistent</span>, and no serial order produces it.', cls: 'bad', vars: { 'listing.buyer': 'Ben', 'invoice.buyer': 'Asha' }, vhl: { 'listing.buyer': 'bad', 'invoice.buyer': 'bad' } },
        { t1: '(real DBs: T2 waits for T1)', data: 'consistent', note: '<b>Fix:</b> every real database, at <b>every</b> isolation level (even READ UNCOMMITTED), holds an exclusive lock on rows it writes until commit/rollback. T2\'s UPDATE simply waits. Dirty writes are called P0 in the 1995 "Critique of ANSI SQL Isolation Levels" paper.', cls: 'ok', vars: { 'Prevented from': 'every level' }, vhl: { 'Prevented from': 'ok' } }
      ]
    }
  };
  topics.push({
    title: 'Read Anomalies: Dirty, Non-Repeatable, Phantom & Read Skew',
    analogy: `<p>Imagine reading a <b>shared Google Doc</b> while a colleague is typing in it. You might copy a sentence they are about to delete (<b>dirty read</b>). You read paragraph 3 twice and it changed in between (<b>non-repeatable read</b>). You count the bullet points, and a new bullet appears while you count (<b>phantom</b>). You copy page 1 before their edit and page 2 after their edit, and the two pages contradict each other (<b>read skew</b>).</p>
<p>Isolation levels are just rules about <i>which of these surprises you agree to tolerate</i> in exchange for speed.</p>`,
    explain: `<p>When two transactions run at the same time, their statements <b>interleave</b>. An <b>anomaly</b> is a result that could <i>never</i> happen if they had run one after another. The read-side anomalies:</p>
${H.table(['Anomaly', 'One-line story', 'Smallest level that stops it'], [
  ['<b>Dirty write</b> (P0)', 'T2 overwrites T1\'s uncommitted write', 'every level (always prevented)'],
  ['<b>Dirty read</b> (P1)', 'T1 sees T2\'s uncommitted change', 'READ COMMITTED'],
  ['<b>Non-repeatable read</b> (P2)', 'Same row, read twice, different values', 'REPEATABLE READ'],
  ['<b>Phantom</b> (P3)', 'Same WHERE, run twice, new/missing rows', 'SERIALIZABLE (snapshots also hide it for reads)'],
  ['<b>Read skew</b> (A5A)', 'Two related rows read at different moments → impossible combo', 'REPEATABLE READ / snapshot']
])}
<p><b>How to identify which one it is</b> (the 4-question checklist):</p>
<ol><li>Did someone read data that was <b>not yet committed</b>? → dirty read.</li>
<li>Was <b>one row</b> read twice with different values? → non-repeatable read.</li>
<li>Was a <b>condition/range</b> evaluated twice with different <i>sets</i> of rows? → phantom.</li>
<li>Were <b>two different rows</b> read at different times, so an invariant across them looks broken? → read skew.</li></ol>
<p>The write-side anomalies (lost update, write skew) are serious enough to get their own topic next.</p>`,
    clues: [
      '"the report total does not match" / "sum is off while transfers run" → read skew; read from one snapshot or one statement',
      '"the value changed between my two SELECTs" → non-repeatable read; REPEATABLE READ',
      '"COUNT(*) said 2 but the list shows 3 rows" → phantom; predicate/gap locks or SERIALIZABLE',
      '"we acted on data that was later rolled back" → dirty read; never use READ UNCOMMITTED / NOLOCK for decisions',
      '"WITH (NOLOCK) everywhere" (SQL Server) → dirty reads, and even missing/duplicate rows during page splits',
      '"identify the anomaly in this schedule" → walk the 4-question checklist: uncommitted? same row? same predicate? two related rows?'
    ],
    code: [
      bank(`-- Replay of READ SKEW in one connection. Under READ COMMITTED every statement sees the latest
-- committed data, so running T1's statements and T2's transaction in this order is EXACTLY
-- what T1 experiences.
SELECT 'T1 step 1: read Asha' AS who, balance FROM accounts WHERE id = 1;     -- 500

-- T2: transfer 100 Asha -> Ben and commit
BEGIN;
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
UPDATE accounts SET balance = balance + 100 WHERE id = 2;
COMMIT;

SELECT 'T1 step 2: read Ben' AS who, balance FROM accounts WHERE id = 2;      -- 400
SELECT 'T1 thinks total =' AS who, 500 + 400 AS balance;                      -- 900 (wrong!)
SELECT 'one statement (consistent)' AS who, SUM(balance) AS balance FROM accounts WHERE id IN (1, 2);  -- 800`, 'Read skew, replayed step by step (▶ Run)'),
      pg(`-- Reproduce a NON-REPEATABLE READ in PostgreSQL with two psql windows.
-- Window A (T1)                               -- Window B (T2)
BEGIN;  -- READ COMMITTED (default)
SELECT balance FROM accounts WHERE id = 1;  -- 500
                                               BEGIN;
                                               UPDATE accounts SET balance = 300 WHERE id = 1;
                                               COMMIT;
SELECT balance FROM accounts WHERE id = 1;  -- 300  <-- changed inside one transaction
COMMIT;

-- Now repeat with:  BEGIN ISOLATION LEVEL REPEATABLE READ;
-- The second SELECT returns 500: T1 reads from the snapshot taken at its FIRST query.`, 'Two-window reproduction (PostgreSQL)'),
      pg(`-- SQL Server: the infamous NOLOCK hint = READ UNCOMMITTED for that table.
SELECT SUM(balance) FROM accounts WITH (NOLOCK);
-- Can return dirty values, and during page splits can even count a row twice or skip it.
-- Better: enable READ_COMMITTED_SNAPSHOT (readers use row versions, never block, never dirty):
ALTER DATABASE Bank SET READ_COMMITTED_SNAPSHOT ON;`, 'SQL Server NOLOCK (not runnable here)')
    ],
    codeTitle: ['Read skew replay', 'Non-repeatable read (Postgres)', 'NOLOCK warning'],
    viz: {
      title: 'Two transactions interleaving — pick an anomaly',
      input: 'readskew',
      inputLabel: 'dirty | nonrepeatable | phantom | readskew | dirtywrite',
      gen: function (input) {
        var k = pick(input, ['dirty', 'nonrepeatable', 'phantom', 'readskew', 'dirtywrite'], 'readskew');
        var a = ANOM[k];
        return timeline(a.steps, { intro: a.intro + ' Press Next to watch the schedule unfold, one step per row.', start: a.start });
      }
    },
    examples: [
      { title: 'Identify it: "the dashboard showed a negative stock for a second"', html: `<p>Schedule: T2 runs <code>UPDATE products SET stock = stock - 5</code> (not committed, stock briefly −2 before a CHECK fails and T2 rolls back). The dashboard query T1 printed −2. ${H.c('y', 'Uncommitted value seen →')} ${H.c('r', 'dirty read')}. Only possible under READ UNCOMMITTED (or <code>NOLOCK</code>). Postgres never shows it: its READ UNCOMMITTED is silently READ COMMITTED.</p>` },
      { title: 'Identify it: "pagination shows the same order twice"', html: `<p>Page 1: <code>SELECT … ORDER BY created_at DESC LIMIT 20</code>. Before page 2, a new order is inserted at the top, so every row shifts down one and the last row of page 1 reappears on page 2. Each page query is its own statement → ${H.c('r', 'phantom across statements')}. Fixes: keyset pagination (<code>WHERE created_at &lt; :last_seen</code>), or read all pages in one REPEATABLE READ transaction (rarely practical for web paging).</p>` },
      { title: 'Identify it: "backup is inconsistent"', html: `<p>A naive backup copies table <code>orders</code> at 10:00:00 and table <code>order_items</code> at 10:00:30. Orders created in between have items but no header row. Two related "rows" (tables) read at different times → ${H.c('r', 'read skew')}. That is why <code>pg_dump</code> runs in one REPEATABLE READ snapshot and <code>mysqldump --single-transaction</code> does the same.</p>` },
      { title: 'Phantom vs non-repeatable read — the precise difference', html: `${H.table(['', 'Non-repeatable read', 'Phantom'], [['What changes', 'value of an existing row', 'membership of the result set'], ['Caused by', 'UPDATE / DELETE', 'INSERT (or UPDATE/DELETE moving rows in/out of the predicate)'], ['Locking fix', 'row lock (S) held to commit', 'predicate / range / gap lock'], ['Snapshot fix', 'yes', 'yes (for reads)']])}<p>The key word is <b>predicate</b>: you cannot lock a row that does not exist yet, so phantoms need range locks or a snapshot.</p>` }
    ],
    deepDive: `<p><b>Where these names come from.</b> SQL-92 defined isolation levels by forbidding three "phenomena": P1 dirty read, P2 fuzzy (non-repeatable) read, P3 phantom. In 1995 Berenson, Bernstein, Gray et al. ("A Critique of ANSI SQL Isolation Levels") showed the definitions were ambiguous and incomplete: they added <b>P0 dirty write</b>, <b>P4 lost update</b>, <b>A5A read skew</b>, <b>A5B write skew</b>, and defined <b>snapshot isolation</b>, which forbids P0–P3 and A5A yet still allows A5B. That is why "REPEATABLE READ" means different things in different products.</p>
<p><b>Statement-level vs transaction-level consistency.</b> Under READ COMMITTED with MVCC (Postgres, Oracle, SQL Server RCSI, MySQL), <i>each statement</i> gets its own snapshot. So <code>SELECT SUM(balance) FROM accounts</code> is always internally consistent, but two separate SELECTs are not. Under REPEATABLE READ/snapshot, the snapshot is taken at the <b>first statement</b> of the transaction (not at BEGIN!) and reused for all reads. MySQL also offers <code>START TRANSACTION WITH CONSISTENT SNAPSHOT</code> to take it at BEGIN.</p>
<p><b>Lock-based databases</b> (SQL Server without RCSI, DB2) prevent dirty reads by making readers take short shared locks (released right after reading under READ COMMITTED). That means readers <i>block on</i> writers — the reason RCSI/snapshot options exist. Under lock-based REPEATABLE READ, shared locks are held until commit, which blocks updates of rows you read, but not inserts of new matching rows (phantoms) unless range locks are used (SERIALIZABLE).</p>
<p><b>Distributed/replicated twist:</b> reading from an async replica can show older data than you just wrote ("read-your-writes" violation) and can even go backwards in time between two replicas (non-monotonic reads) — these are the replicated cousins of the same anomalies, covered in the Distributed Databases module.</p>`,
    aiEra: `<p><b>What AI changes:</b> you can paste a two-session schedule into an assistant and ask "which anomaly is this and at which level does it disappear?" — and usually get a correct answer for the textbook cases. It is also great at generating a two-terminal reproduction script so you can <i>see</i> the anomaly on your own Postgres or MySQL in Docker.</p>
<p><b>Use AI as a partner:</b> <code>Generate a psql two-session script that demonstrates read skew under READ COMMITTED and show it disappearing under REPEATABLE READ</code>. Then actually run it — the experiment is what makes it stick.</p>
<p><b>Where AI goes wrong:</b> it quotes the ANSI table as if it were how Postgres or MySQL behave (Postgres REPEATABLE READ does not allow phantoms; MySQL's does not allow them for plain SELECTs but locking reads see new rows). It often forgets read skew entirely, and it may suggest <code>NOLOCK</code> as a "performance fix".</p>
<p><b>What you must still own:</b> the 4-question identification checklist, knowing your engine's actual behaviour (read its docs, not a generic table), and deciding which anomalies your business can tolerate (an analytics dashboard vs a payment ledger).</p>`,
    problems: [{
      title: 'The Audit That Found Free Money',
      level: 'Medium', tags: ['read skew', 'snapshot', 'isolation'], companies: ['Goldman Sachs', 'Coinbase', 'Revolut'],
      statement: `<p>A nightly audit runs <code>SELECT balance FROM accounts WHERE id = 1</code>, then (in a loop in the app) <code>SELECT balance FROM accounts WHERE id = 2</code>, etc., and adds them up in Python. Transfers run all night. Some nights the total is higher than the real total. <b>Name the anomaly</b> and <b>fix the audit</b> so the total is always correct without blocking transfers.</p>`,
      constraints: `<p>PostgreSQL in production (READ COMMITTED default); practise on SQLite. Transfers must not be blocked for minutes.</p>`,
      example: `<p>Asha 500, Ben 300. Audit reads Asha 500 → transfer of 100 commits → audit reads Ben 400 → total ${H.c('r', '900')} instead of ${H.c('g', '800')}.</p>`,
      brute: { why: `<p>Reading row by row in separate statements under READ COMMITTED gives every SELECT a <i>new</i> snapshot, so rows come from different moments: read skew. Locking the whole table (<code>LOCK TABLE accounts</code>) would fix it but blocks every transfer during the audit.</p>`, code: bank(`-- Row-by-row audit: each SELECT is a separate snapshot under READ COMMITTED.
SELECT balance FROM accounts WHERE id = 1;
SELECT balance FROM accounts WHERE id = 2;
SELECT balance FROM accounts WHERE id = 3;`, 'Naive per-row audit') },
      mcq: { q: 'Which change fixes the audit with the least blocking?', options: ['Compute SUM in one statement, or run all reads in one REPEATABLE READ transaction', 'LOCK TABLE accounts IN EXCLUSIVE MODE', 'Use READ UNCOMMITTED so it is faster', 'Add an index on balance'], answer: 0, explain: 'A single snapshot (one statement, or one snapshot transaction) is consistent and, with MVCC, readers never block writers.' },
      hints: [
        `<p>Hint 1: The bug is that the reads come from <b>different moments in time</b>. Ask: how do I make them all come from <i>one</i> moment?</p>`,
        `<p>Hint 2: Under MVCC, a single statement always reads one snapshot. A REPEATABLE READ transaction reuses one snapshot for all its statements.</p>`,
        `<p>Hint 3: Recipe: (a) push the math into SQL: <code>SELECT SUM(balance)</code>; or (b) <code>BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY</code> → all SELECTs → COMMIT. MVCC means transfers keep running.</p>`
      ],
      tests: { engine: 'sqlite', check: '(rows, cols, c) => {\n  if (c.plan || c.noplan) { const d = rows.map(r => r[r.length - 1]).join(\'\\n\'); return (!c.plan || new RegExp(c.plan).test(d)) && (!c.noplan || !new RegExp(c.noplan).test(d)); }\n  let a = rows, b = c.rows || [];\n  if (c.set) { const k = r => JSON.stringify(r); a = a.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); b = b.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); }\n  return a.length === b.length && a.every((r, i) => r.length === b[i].length && r.every((v, j) => v === b[i][j] || (typeof v === \'number\' && typeof b[i][j] === \'number\' && Math.abs(v - b[i][j]) < 1e-6)));\n}', cases: [
        { rows: [
            [3, 1800]
          ] },
        { setup: 'INSERT INTO accounts (id, owner, balance) VALUES (4, \'Dara\', 250)', rows: [
            [4, 2050]
          ] },
        { setup: 'DELETE FROM accounts', rows: [
            [0, null]
          ] },
        { setup: 'UPDATE accounts SET balance = 0', rows: [
            [3, 0]
          ] },
        { setup: 'UPDATE accounts SET balance = balance - 100 WHERE id = 1; UPDATE accounts SET balance = balance + 100 WHERE id = 2', rows: [
            [3, 1800]
          ] },
        { setup: 'UPDATE accounts SET balance = 1000000000', rows: [
            [3, 3000000000]
          ] },
        { setup: 'DELETE FROM accounts WHERE id = 2', rows: [
            [2, 1500]
          ] },
        { after: 'BEGIN; COMMIT', rows: [] }
      ] },
      solution: {
        approach: `<p>The anomaly is <b>read skew</b> (A5A). Fix it by reading from a single snapshot. Easiest: do the aggregation in one statement. If the audit needs many queries (per-branch totals, cross-checks with the ledger), run them all in one <code>REPEATABLE READ READ ONLY</code> transaction (Postgres can even use <code>SERIALIZABLE READ ONLY DEFERRABLE</code> for a guaranteed-safe snapshot). With MVCC this never blocks transfers.</p>`,
        code: bank(`-- Fix B (Postgres, many queries, one snapshot):
--   BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;
--   SELECT SUM(balance) FROM accounts;
--   SELECT SUM(amount) FROM ledger;
--   COMMIT;
-- SQLite gives a transaction one consistent read snapshot too:
BEGIN;
SELECT SUM(balance) AS total_money FROM accounts;
SELECT COUNT(*) AS ledger_rows FROM ledger;
COMMIT;

-- Fix A (the answer): one statement = one consistent snapshot, even under READ COMMITTED.
SELECT COUNT(*) AS accounts, SUM(balance) AS total_money FROM accounts;`, 'Consistent audit (▶ Run)'),
        alt: [pg(`BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;
SELECT id, balance FROM accounts ORDER BY id;   -- snapshot taken here
SELECT SUM(amount) FROM ledger;                  -- same snapshot
COMMIT;`, 'PostgreSQL snapshot audit')],
        dry: { head: ['time', 'audit (snapshot at t1)', 'transfer', 'audit sees'], rows: [['t1', 'SELECT Asha', '-', '500'], ['t2', '-', 'Asha 400, Ben 400, COMMIT', '-'], ['t3', 'SELECT Ben', '-', '300 (from snapshot t1)'], ['end', 'total', '-', '800 ✔']] },
        complexity: `<p>One sequential scan of accounts. MVCC: zero lock waits for writers; cost is that old row versions must be kept until the audit ends (vacuum/purge cannot remove them).</p>`,
        followUps: ['What happens to table bloat if the audit transaction runs for 6 hours?', 'Would reading from an async replica be safe for this audit?']
      }
    }]
  });
  /* =====================================================================
     TOPIC 3 — Write anomalies: lost update & write skew
     ===================================================================== */
  var LOST = {
    naive: [
      { t1: "BEGIN; SELECT value → 7", data: 'likes = 7', note: 'Asha taps ❤. Her request (T1) reads the like counter: 7.', vars: { 'likes (committed)': 7, 'T1 local': 7 } },
      { t2: "BEGIN; SELECT value → 7", data: 'likes = 7', note: 'Ben taps ❤ at the same moment. T2 also reads 7. Both apps now hold the number 7 in memory.', vars: { 'likes (committed)': 7, 'T1 local': 7, 'T2 local': 7 } },
      { t1: "UPDATE SET value = 8 (7+1 computed in app); COMMIT", data: 'likes = 8', note: 'T1 writes 7 + 1 = 8 and commits.', vars: { 'likes (committed)': 8, 'T2 local': 7 }, vhl: { 'likes (committed)': 'cur' } },
      { t2: "UPDATE SET value = 8 (7+1 computed in app); COMMIT", data: 'likes = 8', note: 'T2 writes <b>its</b> 7 + 1 = 8 and commits — blindly overwriting T1\'s write. Two likes happened, the counter went up by one.', cls: 'bad', vars: { 'likes (committed)': 8, 'expected': 9 }, vhl: { 'likes (committed)': 'bad' } },
      { t1: '—', t2: '—', data: 'likes = 8 ✗', note: '<span class="c-r"><b>Lost update</b></span>: the read-modify-write cycle happened in the application, so the database never knew T2\'s write depended on a stale read. This happens under READ COMMITTED in every database, and under MySQL REPEATABLE READ too.', cls: 'bad', vars: { anomaly: 'lost update (P4)' }, vhl: { anomaly: 'bad' } }
    ],
    atomic: [
      { t1: "BEGIN; UPDATE SET value = value + 1", data: 'likes = 7 (8 pending)', note: 'T1 does the math <b>inside the database</b>. The UPDATE takes an exclusive row lock and computes 7 + 1 = 8.', vars: { 'likes (committed)': 7, 'row lock': 'T1 (X)' }, vhl: { 'row lock': 'cur' } },
      { t2: "BEGIN; UPDATE SET value = value + 1 … waits", data: 'likes = 7', note: 'T2 tries the same UPDATE and must <b>wait</b> for T1\'s row lock. (Dirty writes are never allowed.)', cls: 'cur', vars: { 'likes (committed)': 7, 'row lock': 'T1 (X)', 'T2': 'waiting' }, vhl: { T2: 'cur' } },
      { t1: 'COMMIT', data: 'likes = 8', note: 'T1 commits and releases the lock.', vars: { 'likes (committed)': 8, 'row lock': 'T2 (X)' }, vhl: { 'likes (committed)': 'cur' } },
      { t2: "(re-reads latest row: 8) → 9; COMMIT", data: 'likes = 9', note: 'T2 wakes up. Under READ COMMITTED, Postgres <b>re-evaluates the row</b> using the newest committed version (8) and writes 9. MySQL does the same ("semi-consistent / current read").', cls: 'ok', vars: { 'likes (committed)': 9 }, vhl: { 'likes (committed)': 'ok' } },
      { t1: '—', t2: '—', data: 'likes = 9 ✔', note: '<b>Fix #1 — atomic update.</b> Whenever the new value can be computed in SQL (<code>value + 1</code>, <code>stock - qty</code>), do it in one statement. Simplest, fastest, no retries.', cls: 'ok', vars: { fix: 'SET value = value + 1' }, vhl: { fix: 'ok' } }
    ],
    forupdate: [
      { t1: "BEGIN; SELECT value … FOR UPDATE → 7", data: 'likes = 7', note: 'T1 reads with <code>FOR UPDATE</code>: "I am going to change this row, lock it now." Exclusive row lock taken by a <b>read</b>.', vars: { 'likes (committed)': 7, 'row lock': 'T1 (X)', 'T1 local': 7 }, vhl: { 'row lock': 'cur' } },
      { t2: "BEGIN; SELECT value … FOR UPDATE … waits", data: 'likes = 7', note: 'T2 asks for the same lock and waits. It has not read anything yet, so it cannot hold a stale value.', cls: 'cur', vars: { 'likes (committed)': 7, 'row lock': 'T1 (X)', 'T2': 'waiting' }, vhl: { T2: 'cur' } },
      { t1: "UPDATE SET value = 8; COMMIT", data: 'likes = 8', note: 'T1 writes 8 (its app logic can be arbitrarily complex) and commits, releasing the lock.', vars: { 'likes (committed)': 8, 'row lock': 'T2 (X)' } },
      { t2: "→ 8; UPDATE SET value = 9; COMMIT", data: 'likes = 9', note: 'T2\'s SELECT … FOR UPDATE now returns the <b>fresh</b> value 8. It writes 9.', cls: 'ok', vars: { 'likes (committed)': 9 }, vhl: { 'likes (committed)': 'ok' } },
      { t1: '—', t2: '—', data: 'likes = 9 ✔', note: '<b>Fix #2 — pessimistic locking.</b> Use when the new value needs app logic (e.g. call a pricing function). Cost: waiting, and possible deadlocks if you lock several rows in different orders.', cls: 'ok', vars: { fix: 'SELECT … FOR UPDATE' }, vhl: { fix: 'ok' } }
    ],
    optimistic: [
      { t1: "SELECT value, version → (7, v1)", data: 'likes = 7, v1', note: 'Optimistic locking: no locks while thinking. T1 reads the value <b>and a version number</b>.', vars: { 'likes': 7, version: 1, 'T1 has': '7 @ v1' } },
      { t2: "SELECT value, version → (7, v1)", data: 'likes = 7, v1', note: 'T2 reads the same (7, v1).', vars: { 'likes': 7, version: 1, 'T1 has': '7 @ v1', 'T2 has': '7 @ v1' } },
      { t1: "UPDATE SET value=8, version=2 WHERE version=1 → 1 row", data: 'likes = 8, v2', note: 'T1 writes <b>only if the version is still 1</b>. It is, so 1 row changes. Commit.', cls: 'ok', vars: { 'likes': 8, version: 2 }, vhl: { version: 'cur' } },
      { t2: "UPDATE SET value=8, version=2 WHERE version=1 → 0 rows", data: 'likes = 8, v2', note: 'T2 tries the same conditional write, but the version is now 2: <span class="c-r">0 rows affected</span>. The app detects the conflict instead of silently overwriting.', cls: 'bad', vars: { 'likes': 8, version: 2, 'T2 result': '0 rows → conflict' }, vhl: { 'T2 result': 'bad' } },
      { t2: "retry: read (8, v2) → UPDATE … WHERE version=2 → 1 row", data: 'likes = 9, v3', note: 'T2 re-reads and retries: 9, version 3. ✔', cls: 'ok', vars: { 'likes': 9, version: 3 }, vhl: { likes: 'ok' } },
      { t1: '—', t2: '—', data: 'likes = 9 ✔', note: '<b>Fix #3 — optimistic concurrency control (compare-and-set).</b> Great for low-contention edits that span user think-time (edit form open for 2 minutes). JPA <code>@Version</code>, Rails <code>lock_version</code>, HTTP <code>ETag</code> + <code>If-Match</code> all do this.', cls: 'ok', vars: { fix: 'WHERE version = :seen' }, vhl: { fix: 'ok' } }
    ],
    snapshot: [
      { t1: "BEGIN REPEATABLE READ; SELECT → 7", data: 'likes = 7', note: 'PostgreSQL REPEATABLE READ (= snapshot isolation). T1 reads 7 from its snapshot.', vars: { likes: 7, 'T1 local': 7 } },
      { t2: "BEGIN REPEATABLE READ; SELECT → 7", data: 'likes = 7', note: 'T2 reads 7 from its own snapshot.', vars: { likes: 7, 'T1 local': 7, 'T2 local': 7 } },
      { t1: "UPDATE SET value = 8; COMMIT", data: 'likes = 8', note: 'T1 writes 8 and commits.', vars: { likes: 8 }, vhl: { likes: 'cur' } },
      { t2: "UPDATE SET value = 8 → ERROR 40001", data: 'likes = 8', note: 'T2 tries to update a row that was changed by a transaction that committed <b>after T2\'s snapshot</b>. Postgres refuses: <code>could not serialize access due to concurrent update</code> ("first committer wins").', cls: 'bad', vars: { likes: 8, 'T2': 'serialization failure' }, vhl: { T2: 'bad' } },
      { t2: "ROLLBACK; retry whole txn → 9", data: 'likes = 9', note: 'The app catches SQLSTATE 40001 and <b>retries the whole transaction</b>: new snapshot, reads 8, writes 9.', cls: 'ok', vars: { likes: 9 }, vhl: { likes: 'ok' } },
      { t1: '—', t2: '—', data: 'likes = 9 ✔', note: '<b>Fix #4 — snapshot isolation detects lost updates automatically</b> in PostgreSQL, Oracle SERIALIZABLE and SQL Server SNAPSHOT. <span class="c-r">MySQL InnoDB REPEATABLE READ does NOT</span> — its UPDATE silently reads the latest row and the lost update happens.', cls: 'ok', vars: { fix: 'SI + retry on 40001' }, vhl: { fix: 'ok' } }
    ]
  };
  var SKEW = {
    snapshot: [
      { t1: "BEGIN; SELECT COUNT(*) WHERE on_call AND shift=1234 → 2", data: 'Alice ✓ Bob ✓', note: 'Rule: <b>at least one doctor on call</b> for shift 1234. Alice feels sick. Her transaction checks: 2 on call, so it is safe for her to leave.', vars: { Alice: 'on call', Bob: 'on call', 'T1 saw': 2 } },
      { t2: "BEGIN; SELECT COUNT(*) WHERE on_call AND shift=1234 → 2", data: 'Alice ✓ Bob ✓', note: 'Bob also feels sick, at the same moment. His check also sees 2 (snapshot). Safe for him too, he thinks.', vars: { Alice: 'on call', Bob: 'on call', 'T1 saw': 2, 'T2 saw': 2 } },
      { t1: "UPDATE doctors SET on_call=0 WHERE name='Alice'", data: 'Alice ✓→✗ (pending)', note: 'T1 updates <b>Alice\'s</b> row.', vars: { Alice: 'off (pending)', Bob: 'on call' }, vhl: { Alice: 'cur' } },
      { t2: "UPDATE doctors SET on_call=0 WHERE name='Bob'", data: 'Bob ✓→✗ (pending)', note: 'T2 updates <b>Bob\'s</b> row — a <i>different</i> row. No write-write conflict, so snapshot isolation sees nothing wrong.', vars: { Alice: 'off (pending)', Bob: 'off (pending)' }, vhl: { Bob: 'cur' } },
      { t1: 'COMMIT', t2: 'COMMIT', data: 'Alice ✗ Bob ✗', note: 'Both commit. <span class="c-r">Zero doctors on call.</span> Each transaction kept the rule on its own; together they broke it. That is <b>write skew</b> (A5B): two transactions read the same set, then write to <i>different</i> rows based on what they read.', cls: 'bad', vars: { Alice: 'off', Bob: 'off', 'on call': 0 }, vhl: { 'on call': 'bad' } },
      { t1: '—', t2: '—', data: 'rule broken', note: 'Happens under READ COMMITTED, PostgreSQL REPEATABLE READ, Oracle SERIALIZABLE (which is really snapshot isolation) and SQL Server SNAPSHOT. Only true SERIALIZABLE, explicit locks or a materialized conflict stop it.', cls: 'bad', vars: { anomaly: 'write skew' }, vhl: { anomaly: 'bad' } }
    ],
    forupdate: [
      { t1: "BEGIN; SELECT * … WHERE on_call AND shift=1234 FOR UPDATE → 2 rows", data: 'Alice ✓ Bob ✓', note: 'T1 reads the doctors <b>FOR UPDATE</b>: it locks <b>every row its decision depends on</b> (Alice and Bob), not just the row it will change.', vars: { Alice: 'locked by T1', Bob: 'locked by T1' }, vhl: { Alice: 'cur', Bob: 'cur' } },
      { t2: "BEGIN; SELECT * … FOR UPDATE … waits", data: 'Alice ✓ Bob ✓', note: 'T2 runs the same locking read and has to wait.', cls: 'cur', vars: { Alice: 'locked by T1', Bob: 'locked by T1', T2: 'waiting' }, vhl: { T2: 'cur' } },
      { t1: "UPDATE Alice off; COMMIT", data: 'Alice ✗ Bob ✓', note: 'T1 sets Alice off call and commits. Locks released.', vars: { Alice: 'off', Bob: 'on call' } },
      { t2: "→ 1 row (Bob); count = 1 → refuse; ROLLBACK", data: 'Alice ✗ Bob ✓', note: 'In READ COMMITTED, T2\'s locking read re-checks rows and now returns only Bob: count = 1, so Bob may <b>not</b> leave. (In Postgres REPEATABLE READ, T2 would get a 40001 error instead and retry.)', cls: 'ok', vars: { Alice: 'off', Bob: 'on call', 'on call': 1 }, vhl: { 'on call': 'ok' } },
      { t1: '—', t2: '—', data: 'rule kept ✔', note: '<b>Fix — lock what you read.</b> Works when the rows the check depends on <i>already exist</i>. It fails for "no row exists yet" checks (room double-booking): you cannot lock a row that is not there → phantom write skew → use a unique constraint on a materialized slot row, an exclusion constraint, or SERIALIZABLE.', cls: 'ok', vars: { fix: 'FOR UPDATE on the checked rows' }, vhl: { fix: 'ok' } }
    ],
    serializable: [
      { t1: "BEGIN SERIALIZABLE; COUNT → 2", data: 'Alice ✓ Bob ✓', note: 'PostgreSQL SERIALIZABLE (Serializable Snapshot Isolation). T1 reads; Postgres quietly records a <b>SIREAD</b> marker: "T1 read the on-call doctors of shift 1234".', vars: { Alice: 'on call', Bob: 'on call', 'SIREAD': 'T1' } },
      { t2: "BEGIN SERIALIZABLE; COUNT → 2", data: 'Alice ✓ Bob ✓', note: 'T2 reads the same rows. SIREAD now records T1 and T2.', vars: { Alice: 'on call', Bob: 'on call', 'SIREAD': 'T1, T2' } },
      { t1: "UPDATE Alice off", t2: "UPDATE Bob off", data: 'both pending', note: 'T1 writes a row T2 read (edge T2 —rw→ T1). T2 writes a row T1 read (edge T1 —rw→ T2). Two read-write dependencies forming a cycle = a <b>dangerous structure</b>.', cls: 'cur', vars: { 'rw-deps': 'T1→T2, T2→T1' }, vhl: { 'rw-deps': 'bad' } },
      { t1: 'COMMIT ✔', data: 'Alice ✗ Bob ✓', note: 'T1 commits first and wins.', cls: 'ok', vars: { Alice: 'off', Bob: 'on call' } },
      { t2: 'COMMIT → ERROR 40001', data: 'Alice ✗ Bob ✓', note: 'T2 fails: <code>could not serialize access due to read/write dependencies among transactions</code>. The database aborted it because no serial order explains both.', cls: 'bad', vars: { T2: 'aborted (40001)' }, vhl: { T2: 'bad' } },
      { t2: 'retry → COUNT = 1 → refuse', data: 'Alice ✗ Bob ✓', note: 'The app retries T2 from the top: now count = 1, Bob stays on call. <b>Fix — SERIALIZABLE + retry loop.</b> No need to know which rows to lock; the cost is occasional aborts (some false positives).', cls: 'ok', vars: { 'on call': 1, fix: 'SERIALIZABLE + retry' }, vhl: { 'on call': 'ok', fix: 'ok' } }
    ]
  };
  topics.push({
    title: 'Write Anomalies: Lost Update & Write Skew (and How to Fix Them)',
    analogy: `<p><b>Lost update</b> is two roommates editing the <b>same shopping list on paper</b>: both copy it, both add one item to their copy, both pin their copy back on the fridge. The second copy hides the first person's item.</p>
<p><b>Write skew</b> is two <b>night-shift doctors</b>, both feeling sick. Each looks at the roster, sees "2 doctors on call — someone else will cover", and signs out. Neither touched the other's name, yet nobody is on call. Each decision was fine alone; together they broke the hospital's rule.</p>`,
    explain: `<p>Both anomalies follow the same <b>read → decide → write</b> pattern, which is how most app code works (load an object, change it, save it).</p>
${H.table(['', 'Lost update (P4)', 'Write skew (A5B)'], [
  ['What is read', 'row X', 'a set of rows (a predicate)'],
  ['What is written', 'the <b>same</b> row X', '<b>different</b> rows (or new rows)'],
  ['Result', 'one write silently overwrites the other', 'an invariant across rows is broken'],
  ['Examples', 'like counter, stock, wallet balance, wiki page edit', 'doctors on call, room double-booking, unique username claim, overdraft across two accounts'],
  ['Stopped by snapshot isolation?', '<span class="c-g">yes</span> (Postgres/Oracle/SQL Server), <span class="c-r">no</span> in MySQL RR', '<span class="c-r">no</span>']
])}
<p><b>The fix toolbox</b> — pick from left to right, simplest first:</p>
${H.table(['Fix', 'How', 'Use when'], [
  ['1. Atomic statement', '<code>SET stock = stock - 1 WHERE stock &gt;= 1</code>', 'the new value is computable in SQL'],
  ['2. Constraint', 'UNIQUE / CHECK / exclusion constraint', 'the rule can be written declaratively'],
  ['3. Pessimistic lock', '<code>SELECT … FOR UPDATE</code> on every row the decision reads', 'high contention, short transactions'],
  ['4. Optimistic lock', '<code>UPDATE … WHERE version = :seen</code>, retry if 0 rows', 'low contention, user think-time'],
  ['5. Materialize the conflict', 'create a row to lock (e.g. one row per room-slot)', 'write skew on rows that do not exist yet'],
  ['6. SERIALIZABLE', 'let the DB detect it, retry on 40001', 'complex invariants, many code paths']
])}
<p>The question to ask of any code: <b>"Is my write based on something I read earlier, and could that have changed in between?"</b> If yes, you need one of the six fixes.</p>`,
    clues: [
      '"two users click at the same time" / "counter is lower than expected" → lost update; atomic UPDATE or locking',
      '"we sold more tickets than seats" / "stock went negative" → check-then-act race; conditional UPDATE … WHERE stock &gt;= qty',
      '"at least one must remain" / "no two bookings overlap" / "username must be unique" → write skew; constraint, FOR UPDATE, materialize conflict, or SERIALIZABLE',
      '"edit form open for minutes" / "ETag" / "@Version" → optimistic concurrency control',
      '"could not serialize access" / SQLSTATE 40001 → snapshot/serializable caught a conflict; retry the whole transaction',
      '"works in testing, fails under load" → classic signature of a race; reproduce with two sessions'
    ],
    code: [
      bank(`-- Fix #1: atomic increment. The read-modify-write happens INSIDE one statement.
UPDATE counters SET value = value + 1 WHERE name = 'likes:post42';
UPDATE counters SET value = value + 1 WHERE name = 'likes:post42';   -- second user
SELECT name, value FROM counters WHERE name = 'likes:post42';         -- 9, nothing lost`, 'Atomic UPDATE (▶ Run)'),
      bank(`-- Fix #4: optimistic locking with a version column (compare-and-set).
-- Both "users" read (balance 1000, version 1) earlier. User A saves first:
UPDATE accounts SET balance = 900, version = version + 1 WHERE id = 3 AND version = 1;
SELECT 'user A' AS who, changes() AS rows_updated;    -- 1 -> success

-- User B saves with the version they saw (1). It is stale now:
UPDATE accounts SET balance = 950, version = version + 1 WHERE id = 3 AND version = 1;
SELECT 'user B' AS who, changes() AS rows_updated;    -- 0 -> conflict! re-read and retry

SELECT id, balance, version FROM accounts WHERE id = 3; -- 900, version 2: A's write was NOT lost`, 'Optimistic locking with version (▶ Run)'),
      bank(`-- Fix #5: materialize the conflict. One row per (room, slot) + PRIMARY KEY.
-- Two people try to book Everest at 11:00. The constraint lets exactly one win.
INSERT OR IGNORE INTO room_slots (room, slot, booked_by) VALUES ('Everest', '2026-10-20 11:00', 'Ben');
SELECT 'Ben' AS who, changes() AS booked;     -- 1
INSERT OR IGNORE INTO room_slots (room, slot, booked_by) VALUES ('Everest', '2026-10-20 11:00', 'Chen');
SELECT 'Chen' AS who, changes() AS booked;    -- 0 -> slot taken, tell Chen
SELECT * FROM room_slots ORDER BY slot;`, 'Materialized conflict via PRIMARY KEY (▶ Run)'),
      pg(`-- Fix #3 for write skew: lock every row the decision depends on.
BEGIN;
SELECT name FROM doctors
WHERE shift_id = 1234 AND on_call = 1
FOR UPDATE;                                  -- locks Alice AND Bob
-- app: if count >= 2 then allow
UPDATE doctors SET on_call = 0 WHERE name = 'Alice';
COMMIT;

-- Fix #6: let the database detect it.
BEGIN ISOLATION LEVEL SERIALIZABLE;
SELECT COUNT(*) FROM doctors WHERE shift_id = 1234 AND on_call = 1;
UPDATE doctors SET on_call = 0 WHERE name = 'Alice';
COMMIT;   -- may fail with SQLSTATE 40001 -> retry the whole transaction`, 'Write-skew fixes (PostgreSQL)'),
      pg(`-- PostgreSQL exclusion constraint: "no two bookings of the same room overlap in time".
CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE TABLE bookings (
  room   text,
  during tstzrange,
  EXCLUDE USING gist (room WITH =, during WITH &&)
);
-- Concurrent overlapping INSERTs: one succeeds, the other waits then fails with 23P01.`, 'Exclusion constraint (PostgreSQL)')
    ],
    codeTitle: ['Atomic UPDATE', 'Optimistic locking', 'Materialize conflict', 'FOR UPDATE / SERIALIZABLE', 'Exclusion constraint'],
    viz: [{
      title: 'Lost update — the bug and four fixes',
      input: 'naive',
      inputLabel: 'naive | atomic | forupdate | optimistic | snapshot',
      gen: function (input) {
        var k = pick(input, ['naive', 'atomic', 'forupdate', 'optimistic', 'snapshot'], 'naive');
        return timeline(LOST[k], { intro: 'Two users like post 42 at the same moment. Counter starts at <b>7</b>; correct answer after two likes is <b>9</b>. Strategy: <b>' + k + '</b>.', start: { likes: 7 } });
      }
    }, {
      title: 'Write skew — doctors on call',
      input: 'snapshot',
      inputLabel: 'snapshot | forupdate | serializable',
      gen: function (input) {
        var k = pick(input, ['snapshot', 'forupdate', 'serializable'], 'snapshot');
        return timeline(SKEW[k], { intro: 'Invariant: shift 1234 must always have <b>≥ 1 doctor on call</b>. Alice and Bob are both on call and both want to leave. Strategy: <b>' + k + '</b>.', start: { Alice: 'on call', Bob: 'on call' } });
      }
    }],
    examples: [
      { title: 'Spot the pattern in ORM code', html: `<p><code>product = repo.find(id); product.stock -= qty; repo.save(product)</code> — this is a read-modify-write in the app. Two concurrent checkouts → ${H.c('r', 'lost update')} (stock decremented once for two sales). Fix: <code>UPDATE products SET stock = stock - :qty WHERE sku = :sku AND stock &gt;= :qty</code> and check rows-affected, or add <code>@Version</code>.</p>`, code: bank(`-- Inventory: sell 2 T-shirts only if 2 are left. Stock is 3.
UPDATE products SET stock = stock - 2 WHERE sku = 'TSHIRT' AND stock >= 2;
SELECT 'order A' AS who, changes() AS sold;       -- 1 (stock now 1)
UPDATE products SET stock = stock - 2 WHERE sku = 'TSHIRT' AND stock >= 2;
SELECT 'order B' AS who, changes() AS sold;       -- 0 -> "sold out", no oversell
SELECT sku, stock FROM products WHERE sku = 'TSHIRT';`, 'Conditional decrement (▶ Run)') },
      { title: 'Phantom write skew: double-booking a meeting room', html: `<p>T1: <code>SELECT … WHERE room='Everest' AND overlaps(11:00–12:00)</code> → none; INSERT booking. T2 does the same at the same time → none; INSERT. ${H.c('r', 'Two bookings overlap.')} <code>FOR UPDATE</code> locks <i>nothing</i> (zero rows matched). Fixes: exclusion constraint (Postgres), a <code>room_slots</code> table with a PRIMARY KEY per slot (materialize the conflict), MySQL next-key locks via <code>SELECT … FOR UPDATE</code> on an indexed range, or SERIALIZABLE.</p>` },
      { title: 'Claiming a unique username', html: `<p>"Check if <code>asha</code> is free, then insert" is write skew on a row that does not exist. The fix is free: a <code>UNIQUE</code> index. The second INSERT fails with a unique violation (Postgres 23505) and you show "name taken". Never rely on the SELECT-then-INSERT check alone.</p>` },
      { title: 'Which fix? quick decisions', html: `${H.table(['Situation', 'Best fix'], [['page view / like counter', 'atomic <code>value = value + 1</code> (or sharded counters if super hot)'], ['wallet debit with balance ≥ 0', 'conditional UPDATE + CHECK constraint'], ['wiki page edited in a browser form', 'optimistic version / ETag'], ['seat map with 10k fans in 1 second', 'conditional UPDATE per seat row, or a queue'], ['on-call roster, multi-row rule', 'FOR UPDATE on the checked rows, or SERIALIZABLE'], ['no overlapping bookings', 'exclusion constraint / slot table']])}` }
    ],
    deepDive: `<p><b>Why snapshot isolation catches lost updates but not write skew.</b> SI aborts a transaction only on a <b>write-write conflict</b>: two concurrent transactions writing the <i>same</i> row ("first-committer-wins" / Postgres "first-updater-wins"). Lost update is exactly that. Write skew writes <i>different</i> rows, so the write sets do not intersect and SI is blind to it. Serializable Snapshot Isolation (SSI, Cahill 2008; Postgres 9.1+) also tracks <b>read-write antidependencies</b> and aborts when two consecutive rw-edges form a "dangerous structure".</p>
<p><b>MySQL's surprise.</b> In InnoDB REPEATABLE READ, plain SELECTs use the snapshot, but UPDATE/DELETE and locking reads use the <b>latest committed</b> row ("current read"). So <code>SELECT stock</code> (snapshot: 3) followed by <code>UPDATE … SET stock = 2</code> (computed in app) silently overwrites a concurrent change — no error. Either use <code>SELECT … FOR UPDATE</code> or atomic expressions. Even worse, a transaction can update a row its snapshot cannot see, then suddenly see it.</p>
<p><b>Postgres READ COMMITTED re-check (EvalPlanQual):</b> when an UPDATE waits for a row lock and the row was changed, Postgres re-evaluates the WHERE clause on the new version. <code>WHERE stock &gt;= 2</code> is therefore safe under READ COMMITTED. But only the <i>locked row</i> is re-checked — subqueries in the WHERE are not re-run, so complex predicates can still misbehave.</p>
<p><b>Optimistic vs pessimistic in numbers:</b> optimistic is cheaper when conflicts are rare (say &lt; 5%): no lock waits, no deadlocks, one extra predicate. As contention rises, retries explode (each retry repeats all work), and pessimistic locking or a single-writer queue wins. Hot rows (flash sales, global counters) often need a redesign: sharded counters, pre-allocated inventory buckets, or an in-memory queue in front of the DB.</p>`,
    aiEra: `<p><b>What AI changes:</b> generated CRUD code is almost always <code>find → mutate → save</code>. It compiles, passes single-user tests, and has a lost-update race. Assistants rarely add <code>@Version</code> or <code>FOR UPDATE</code> unless asked.</p>
<p><b>Use AI as a partner:</b> ask <code>For each write in this service, is the new value derived from an earlier read? Which race can occur and which of: atomic SQL, constraint, FOR UPDATE, version column, SERIALIZABLE fixes it?</code>. Also ask it to write a concurrency test that fires 50 parallel requests and asserts the invariant (stock never negative, counter exact).</p>
<p><b>Where AI goes wrong:</b> it claims REPEATABLE READ prevents lost updates in MySQL; it suggests <code>FOR UPDATE</code> for double-booking where zero rows exist; it writes retry loops that retry only the failed statement instead of the whole transaction; it forgets that retries must be idempotent.</p>
<p><b>What you must still own:</b> naming the invariant ("stock ≥ 0", "≥ 1 on call"), choosing the cheapest correct fix for your contention level, and proving it with a parallel test rather than trusting the code review.</p>`,
    problems: [{
      title: 'Last Three T-shirts, a Thousand Buyers',
      level: 'Medium', tags: ['lost update', 'inventory', 'conditional update'], companies: ['Amazon', 'Flipkart', 'Shopify'],
      statement: `<p>The <code>products</code> row for <code>TSHIRT</code> has <code>stock = 3</code>. During a launch, many checkout requests run at once. The current code does <code>SELECT stock</code>, checks <code>stock &gt;= qty</code> in the app, then <code>UPDATE … SET stock = :newStock</code>. Customers report overselling. Rewrite the checkout so stock can never go negative or be oversold, and record an <code>orders</code> row only for successful purchases.</p>`,
      constraints: `<p>Must be safe under READ COMMITTED (Postgres default) and MySQL REPEATABLE READ. Must not hold locks during payment.</p>`,
      example: `<p>Requests: Asha qty 2, Ben qty 2. ${H.c('g', 'Asha succeeds (stock 3 → 1)')}, ${H.c('r', 'Ben gets "sold out"')}. Naive code could set stock to 1 twice and sell 4 shirts.</p>`,
      brute: { why: `<p>Check-then-act in the application: both requests read 3, both pass the check, both write 1. The database sees two blind writes — a lost update and an oversell.</p>`, code: bank(`-- Naive: app read 3, app decided "ok", app writes the computed value.
SELECT stock FROM products WHERE sku = 'TSHIRT';      -- 3 (both requests see this)
UPDATE products SET stock = 1 WHERE sku = 'TSHIRT';   -- request A writes 3-2
UPDATE products SET stock = 1 WHERE sku = 'TSHIRT';   -- request B also writes 3-2: 4 sold, stock says 1
SELECT stock FROM products WHERE sku = 'TSHIRT';`, 'Naive check-then-act') },
      mcq: { q: 'What makes the decrement safe without an explicit lock?', options: ['Put the check in the UPDATE: WHERE stock >= :qty, and test rows affected', 'Read stock twice to be sure', 'Use SELECT DISTINCT', 'Use READ UNCOMMITTED to see others sooner'], answer: 0, explain: 'The check and the write become one atomic statement; the row lock serializes concurrent decrements and the predicate is re-checked on the latest version.' },
      hints: [
        `<p>Hint 1: The race exists because the check (<code>stock &gt;= qty</code>) and the write are separate steps. Can they be one statement?</p>`,
        `<p>Hint 2: <code>UPDATE … SET stock = stock - :qty WHERE sku = :sku AND stock &gt;= :qty</code> — then "rows affected = 1" means success, 0 means sold out.</p>`,
        `<p>Hint 3: Put the decrement and the order INSERT in one transaction; insert the order only if the decrement changed a row. Keep the payment call outside (reserve → pay → confirm, or release on failure).</p>`
      ],
      tests: { engine: 'sqlite', check: '(rows, cols, c) => {\n  if (c.plan || c.noplan) { const d = rows.map(r => r[r.length - 1]).join(\'\\n\'); return (!c.plan || new RegExp(c.plan).test(d)) && (!c.noplan || !new RegExp(c.noplan).test(d)); }\n  let a = rows, b = c.rows || [];\n  if (c.set) { const k = r => JSON.stringify(r); a = a.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); b = b.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); }\n  return a.length === b.length && a.every((r, i) => r.length === b[i].length && r.every((v, j) => v === b[i][j] || (typeof v === \'number\' && typeof b[i][j] === \'number\' && Math.abs(v - b[i][j]) < 1e-6)));\n}', cases: [
        { rows: [
            ['Asha', 2]
          ] },
        { after: 'SELECT sku, stock, version FROM products WHERE sku = \'TSHIRT\'', rows: [
            ['TSHIRT', 1, 2]
          ] },
        { setup: 'UPDATE products SET stock = 4 WHERE sku = \'TSHIRT\'', after: 'SELECT customer, qty FROM orders ORDER BY id', rows: [
            ['Asha', 2],
            ['Ben', 2]
          ] },
        { setup: 'UPDATE products SET stock = 4 WHERE sku = \'TSHIRT\'', after: 'SELECT sku, stock, version FROM products WHERE sku = \'TSHIRT\'', rows: [
            ['TSHIRT', 0, 3]
          ] },
        { setup: 'UPDATE products SET stock = 1 WHERE sku = \'TSHIRT\'', after: 'SELECT count(*) FROM orders', rows: [
            [0]
          ] },
        { setup: 'UPDATE products SET stock = 1 WHERE sku = \'TSHIRT\'', after: 'SELECT stock, version FROM products WHERE sku = \'TSHIRT\'', rows: [
            [1, 1]
          ] },
        { setup: 'UPDATE products SET stock = 2 WHERE sku = \'TSHIRT\'', after: 'SELECT customer, qty FROM orders ORDER BY id', rows: [
            ['Asha', 2]
          ] },
        { setup: 'UPDATE products SET stock = 2 WHERE sku = \'TSHIRT\'', after: 'SELECT stock FROM products WHERE sku = \'TSHIRT\'', rows: [
            [0]
          ] },
        { setup: 'UPDATE products SET stock = 0 WHERE sku = \'TSHIRT\'', after: 'SELECT count(*) FROM orders', rows: [
            [0]
          ] },
        { setup: 'UPDATE products SET stock = 100 WHERE sku = \'TSHIRT\'', after: 'SELECT stock, version FROM products WHERE sku = \'TSHIRT\'', rows: [
            [96, 3]
          ] },
        { after: 'SELECT sku, stock, version FROM products WHERE sku = \'MUG\'', rows: [
            ['MUG', 10, 1]
          ] },
        { after: 'BEGIN; COMMIT', rows: [] }
      ] },
      solution: {
        approach: `<p>Turn check-then-act into one <b>conditional atomic UPDATE</b>. The row lock taken by the UPDATE serializes concurrent buyers; Postgres/MySQL re-evaluate <code>stock &gt;= qty</code> against the newest committed version after waiting, so the second buyer's UPDATE matches 0 rows. Insert the order only when the decrement succeeded, all in one transaction. The <code>CHECK (stock &gt;= 0)</code> is a safety net.</p>`,
        code: bank(`-- Request A: Asha buys 2
BEGIN;
UPDATE products SET stock = stock - 2, version = version + 1
WHERE sku = 'TSHIRT' AND stock >= 2;
INSERT INTO orders (sku, qty, customer) SELECT 'TSHIRT', 2, 'Asha' WHERE changes() = 1;
COMMIT;

-- Request B: Ben buys 2 (only 1 left)
BEGIN;
UPDATE products SET stock = stock - 2, version = version + 1
WHERE sku = 'TSHIRT' AND stock >= 2;
INSERT INTO orders (sku, qty, customer) SELECT 'TSHIRT', 2, 'Ben' WHERE changes() = 1;
COMMIT;

SELECT sku, stock FROM products WHERE sku = 'TSHIRT';   -- 1
SELECT customer, qty FROM orders;                         -- only Asha`, 'Conditional decrement + order (▶ Run)'),
        alt: [pg(`-- PostgreSQL with RETURNING: one round trip, and the app knows the new stock.
BEGIN;
WITH sold AS (
  UPDATE products SET stock = stock - $2
  WHERE sku = $1 AND stock >= $2
  RETURNING sku
)
INSERT INTO orders (sku, qty, customer)
SELECT sku, $2, $3 FROM sold;      -- inserts 0 rows if sold out
COMMIT;`, 'PostgreSQL data-modifying CTE')],
        dry: { head: ['time', 'A (qty 2)', 'B (qty 2)', 'stock'], rows: [['1', 'UPDATE … stock>=2 → locks row, 3→1', '-', '3 (1 pending)'], ['2', '-', 'UPDATE … waits for row lock', '3'], ['3', 'INSERT order; COMMIT', '-', '1'], ['4', '-', 're-check: 1 >= 2? no → 0 rows', '1'], ['5', '-', 'no order; "sold out"', '1 ✔']] },
        complexity: `<p>One indexed row update per request: O(log N). Throughput on one hot row is limited by lock hold time (~ commit latency), e.g. a few thousand/sec; beyond that split stock into buckets or queue the orders.</p>`,
        followUps: ['How do you release stock if the payment fails 30 s later?', 'How would you handle 100k requests/sec for one product?']
      }
    }]
  });
  /* =====================================================================
     TOPIC 4 — Isolation levels
     ===================================================================== */
  var LEVELS_ORDER = ['ru', 'rc', 'rr', 'si', 'ser'];
  var LEVEL_NAME = { ru: 'READ UNCOMMITTED', rc: 'READ COMMITTED', rr: 'REPEATABLE READ (ANSI / lock-based)', si: 'SNAPSHOT (Postgres RR, Oracle "SERIALIZABLE")', ser: 'SERIALIZABLE' };
  var ISO_ANOM = [
    { name: 'Dirty read', sched: [['T2: UPDATE x = 100 (uncommitted)', ''], ['T1: SELECT x', '?'], ['T2: ROLLBACK', '']],
      out: { ru: ['bad', 'T1 sees 100, a value that never existed.'], rc: ['ok', 'T1 sees the last committed value (MVCC) or waits (locking).'], rr: ['ok', 'Blocked: T1 needs a shared lock T2\'s exclusive lock denies.'], si: ['ok', 'T1 reads its snapshot: only committed data.'], ser: ['ok', 'Never visible.'] } },
    { name: 'Non-repeatable read', sched: [['T1: SELECT x → 500', ''], ['T2: UPDATE x = 300; COMMIT', ''], ['T1: SELECT x', '?']],
      out: { ru: ['bad', 'Second read returns 300.'], rc: ['bad', 'Each statement gets a fresh snapshot: 300.'], rr: ['ok', 'T1 holds a shared lock until commit, so T2 waits; T1 reads 500 again.'], si: ['ok', 'Same snapshot for the whole transaction: 500.'], ser: ['ok', '500.'] } },
    { name: 'Phantom', sched: [['T1: COUNT(*) WHERE event=1 → 2', ''], ['T2: INSERT signup (event 1); COMMIT', ''], ['T1: COUNT(*) WHERE event=1', '?']],
      out: { ru: ['bad', 'Count becomes 3.'], rc: ['bad', 'Count becomes 3.'], rr: ['bad', 'Row locks on existing rows do not stop an INSERT of a new row → 3. (MySQL/InnoDB adds next-key locks for locking reads.)'], si: ['ok', 'Snapshot still has 2 rows.'], ser: ['ok', 'Predicate/range locks (or SSI) prevent it.'] } },
    { name: 'Read skew', sched: [['T1: SELECT Asha → 500', ''], ['T2: move 100 Asha→Ben; COMMIT', ''], ['T1: SELECT Ben', '?']],
      out: { ru: ['bad', 'Ben = 400 → total 900.'], rc: ['bad', 'Ben = 400 → total 900.'], rr: ['ok', 'T1\'s shared lock on Asha makes T2 wait → T1 sees 300 for Ben (total 800).'], si: ['ok', 'Snapshot: Ben = 300, total 800.'], ser: ['ok', 'Consistent.'] } },
    { name: 'Lost update', sched: [['T1: read 7; T2: read 7', ''], ['T1: write 8; COMMIT', ''], ['T2: write 8', '?']],
      out: { ru: ['bad', 'Final 8: one increment lost.'], rc: ['bad', 'Final 8: one increment lost (unless you use atomic SQL / FOR UPDATE).'], rr: ['ok', 'Both hold S locks, both want X → deadlock; one is aborted and retried.'], si: ['ok', 'T2 gets "could not serialize access due to concurrent update" → retry → 9. (Not in MySQL RR!)'], ser: ['ok', 'Detected → retry → 9.'] } },
    { name: 'Write skew', sched: [['T1, T2: COUNT on-call → 2', ''], ['T1: Alice off; T2: Bob off', ''], ['both COMMIT', '?']],
      out: { ru: ['bad', '0 on call.'], rc: ['bad', '0 on call.'], rr: ['y', 'Doctors case: S locks → deadlock → one aborted (safe). Phantom-style (room booking): still possible.'], si: ['bad', 'Write sets differ → no conflict → 0 on call.'], ser: ['ok', 'SSI / 2PL detects it; one transaction gets 40001 and retries.'] } }
  ];
  topics.push({
    title: 'Isolation Levels: From READ UNCOMMITTED to SERIALIZABLE',
    analogy: `<p>Isolation levels are like <b>privacy settings in an exam hall</b>. <b>READ UNCOMMITTED</b>: you can glance at a neighbour's rough work, even the parts they will erase. <b>READ COMMITTED</b>: you only see answers they have handed in. <b>REPEATABLE READ / SNAPSHOT</b>: you get a photocopy of the notice board when you start and keep reading that copy. <b>SERIALIZABLE</b>: the invigilator guarantees the result is the same as if students had entered the room one at a time.</p>
<p>Stronger privacy = fewer surprises, but more waiting or more "please redo your exam" (aborts).</p>`,
    explain: `<p>An <b>isolation level</b> tells the database which anomalies it must prevent for your transaction. You set it per transaction (or per session):</p>
${H.table(['Level', 'Dirty read', 'Non-repeat.', 'Phantom', 'Read skew', 'Lost update', 'Write skew'], [
  ['READ UNCOMMITTED', H.c('r', 'yes'), H.c('r', 'yes'), H.c('r', 'yes'), H.c('r', 'yes'), H.c('r', 'yes'), H.c('r', 'yes')],
  ['READ COMMITTED', H.c('g', 'no'), H.c('r', 'yes'), H.c('r', 'yes'), H.c('r', 'yes'), H.c('r', 'yes'), H.c('r', 'yes')],
  ['REPEATABLE READ (ANSI, locking)', H.c('g', 'no'), H.c('g', 'no'), H.c('r', 'yes'), H.c('g', 'no'), H.c('g', 'no'), H.c('y', 'some')],
  ['SNAPSHOT (PG REPEATABLE READ)', H.c('g', 'no'), H.c('g', 'no'), H.c('g', 'no'), H.c('g', 'no'), H.c('g', 'no'), H.c('r', 'yes')],
  ['SERIALIZABLE', H.c('g', 'no'), H.c('g', 'no'), H.c('g', 'no'), H.c('g', 'no'), H.c('g', 'no'), H.c('g', 'no')]
])}
<p>"yes" = the anomaly <b>can</b> happen. Real products differ from the textbook — know your defaults:</p>
${H.table(['Database', 'Default level', 'Gotcha'], [
  ['PostgreSQL', 'READ COMMITTED', 'READ UNCOMMITTED = READ COMMITTED; REPEATABLE READ = snapshot isolation; SERIALIZABLE = SSI'],
  ['MySQL InnoDB', 'REPEATABLE READ', 'snapshot for plain SELECT, but UPDATE/locking reads see latest data → lost updates possible'],
  ['SQL Server', 'READ COMMITTED (locking)', 'READ_COMMITTED_SNAPSHOT option (on by default in Azure SQL DB); separate SNAPSHOT level'],
  ['Oracle', 'READ COMMITTED', '"SERIALIZABLE" is really snapshot isolation → write skew possible'],
  ['SQLite', 'SERIALIZABLE', 'one writer at a time for the whole database'],
  ['CockroachDB / Spanner', 'SERIALIZABLE', 'designed around serializability; retries are part of the client contract']
])}
<p><b>How to pick:</b> start from READ COMMITTED + correct statement-level patterns (atomic updates, constraints, FOR UPDATE). Use REPEATABLE READ / snapshot for multi-query consistent reads (reports, exports). Use SERIALIZABLE (with a retry loop) when invariants span rows and code paths are too many to reason about.</p>`,
    clues: [
      '"which isolation level would you choose for X?" → name the anomaly X must avoid, then the weakest level that stops it',
      '"report must be consistent across many queries" → REPEATABLE READ / snapshot, READ ONLY',
      '"money must never be double-spent, many code paths" → SERIALIZABLE + retry on 40001',
      '"default isolation level of Postgres/MySQL?" → READ COMMITTED / REPEATABLE READ — and their quirks',
      '"Oracle serializable" or "snapshot isolation" → still allows write skew',
      '"SQLITE_BUSY" / "database is locked" → SQLite is serializable via a single writer; use BEGIN IMMEDIATE and WAL'
    ],
    code: [
      pg(`-- PostgreSQL: per transaction
BEGIN ISOLATION LEVEL REPEATABLE READ;
-- or, as the first statement inside BEGIN:
SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
-- per session default:
SET SESSION CHARACTERISTICS AS TRANSACTION ISOLATION LEVEL REPEATABLE READ;
SHOW transaction_isolation;
-- Read-only serializable that never fails (waits for a safe snapshot):
BEGIN ISOLATION LEVEL SERIALIZABLE READ ONLY DEFERRABLE;`, 'PostgreSQL syntax'),
      my(`-- MySQL: applies to the NEXT transaction (or the session / globally)
SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
SET SESSION TRANSACTION ISOLATION LEVEL SERIALIZABLE;
SELECT @@transaction_isolation;
START TRANSACTION WITH CONSISTENT SNAPSHOT;   -- take the RR snapshot right now
-- SQL Server:
-- SET TRANSACTION ISOLATION LEVEL SNAPSHOT;   (needs ALLOW_SNAPSHOT_ISOLATION ON)`, 'MySQL / SQL Server syntax'),
      bank(`-- SQLite is SERIALIZABLE: only one writer at a time.
-- BEGIN IMMEDIATE grabs the write lock up front, so you fail fast with SQLITE_BUSY
-- instead of failing later when you try to upgrade a read lock to a write lock.
BEGIN IMMEDIATE;
UPDATE accounts SET balance = balance - 50 WHERE id = 3;
UPDATE accounts SET balance = balance + 50 WHERE id = 1;
COMMIT;
SELECT id, owner, balance FROM accounts ORDER BY id;`, 'SQLite BEGIN IMMEDIATE (▶ Run)'),
      bank(`-- A queryable cheat-sheet: which levels allow which anomaly (generic, snapshot-based SI row included).
CREATE TEMP TABLE iso (level TEXT, strength INT, dirty TEXT, nonrepeat TEXT, phantom TEXT, lost TEXT, wskew TEXT);
INSERT INTO iso VALUES
  ('READ UNCOMMITTED', 1, 'yes', 'yes', 'yes', 'yes', 'yes'),
  ('READ COMMITTED',   2, 'no',  'yes', 'yes', 'yes', 'yes'),
  ('REPEATABLE READ',  3, 'no',  'no',  'yes', 'no',  'some'),
  ('SNAPSHOT',         4, 'no',  'no',  'no',  'no',  'yes'),
  ('SERIALIZABLE',     5, 'no',  'no',  'no',  'no',  'no');
-- "Weakest level that prevents lost update AND non-repeatable read":
SELECT level FROM iso WHERE lost = 'no' AND nonrepeat = 'no' ORDER BY strength LIMIT 1;
-- "Levels where write skew is still possible":
SELECT level FROM iso WHERE wskew <> 'no' ORDER BY strength;`, 'Isolation cheat-sheet as a table (▶ Run)')
    ],
    codeTitle: ['PostgreSQL', 'MySQL / SQL Server', 'SQLite', 'Cheat-sheet query'],
    viz: {
      title: 'Same six schedules, one isolation level',
      input: 'rc',
      inputLabel: 'ru | rc | rr | si | ser',
      gen: function (input) {
        var lv = pick(input, LEVELS_ORDER, 'rc');
        var frames = [];
        var matrixRows = LEVELS_ORDER.map(function (k) {
          return [LEVEL_NAME[k]].concat(ISO_ANOM.map(function (a) { var o = a.out[k][0]; return o === 'ok' ? 'prevented' : o === 'bad' ? 'POSSIBLE' : 'partly'; }));
        });
        var hlM = {}; hlM[LEVELS_ORDER.indexOf(lv)] = 'sel';
        frames.push({ narr: 'You picked <b>' + LEVEL_NAME[lv] + '</b> (purple row). We will now run the six classic schedules under this level and see which anomalies slip through.', parts: [{ type: 'table', label: 'Anomaly matrix', columns: ['Level'].concat(ISO_ANOM.map(function (a) { return a.name; })), rows: matrixRows, hl: hlM }] });
        var bad = 0;
        ISO_ANOM.forEach(function (a, i) {
          var o = a.out[lv];
          if (o[0] === 'bad') bad++;
          var verdict = o[0] === 'ok' ? 'prevented' : o[0] === 'bad' ? 'ANOMALY HAPPENS' : 'depends';
          frames.push({ narr: '<b>' + (i + 1) + '. ' + a.name + '</b> under ' + LEVEL_NAME[lv] + ': ' + (o[0] === 'ok' ? '<span class="c-g">' : o[0] === 'bad' ? '<span class="c-r">' : '<span class="c-y">') + o[1] + '</span>', parts: [
            { type: 'table', label: a.name + ' — schedule', columns: ['step', 'action', 'outcome'], rows: a.sched.map(function (r, j) { return [String(j + 1), r[0], j === a.sched.length - 1 ? verdict : '']; }), hl: (function () { var h = {}; h[a.sched.length - 1] = o[0] === 'ok' ? 'ok' : o[0] === 'bad' ? 'bad' : 'cur'; return h; })() },
            { type: 'vars', label: 'Result', vals: { level: lv.toUpperCase(), anomaly: a.name, verdict: verdict }, hl: { verdict: o[0] === 'ok' ? 'ok' : o[0] === 'bad' ? 'bad' : 'cur' } }
          ] });
        });
        frames.push({ narr: 'Summary for <b>' + LEVEL_NAME[lv] + '</b>: <b>' + bad + '</b> of 6 anomalies can still happen. ' + (lv === 'ser' ? 'Everything is prevented — the price is waiting or retrying aborted transactions.' : lv === 'si' ? 'Only write skew remains — the famous gap between snapshot isolation and true serializability.' : 'Use atomic SQL, constraints and FOR UPDATE to close the remaining gaps, or raise the level.'), parts: [{ type: 'bars', label: 'Anomalies still possible per level', values: LEVELS_ORDER.map(function (k) { return ISO_ANOM.filter(function (a) { return a.out[k][0] === 'bad'; }).length; }), idxLabels: ['RU', 'RC', 'RR', 'SI', 'SER'], hl: (function () { var h = {}; h[LEVELS_ORDER.indexOf(lv)] = 'sel'; return h; })() }] });
        return frames;
      }
    },
    examples: [
      { title: 'Pick the level: monthly revenue export (20 queries)', html: `<p>Needs all 20 queries to agree with each other; must not block checkout. → ${H.c('g', 'REPEATABLE READ READ ONLY')} (snapshot). In Postgres <code>SERIALIZABLE READ ONLY DEFERRABLE</code> is even safer and never aborts. Run it on a replica if it is heavy.</p>` },
      { title: 'Pick the level: "user can have at most 3 active sessions"', html: `<p>Check COUNT, then INSERT → write skew with phantoms. READ COMMITTED + <code>FOR UPDATE</code> locks nothing when inserting new rows. Options: ${H.c('g', 'lock the parent user row')} (<code>SELECT … FROM users WHERE id = ? FOR UPDATE</code>) before counting — a classic "materialize via the parent" trick — or ${H.c('g', 'SERIALIZABLE + retry')}.</p>`, code: pg(`BEGIN;  -- READ COMMITTED is enough with this trick
SELECT id FROM users WHERE id = 42 FOR UPDATE;      -- serialize all session-creations for user 42
SELECT COUNT(*) FROM sessions WHERE user_id = 42 AND active;
-- app: if count < 3 then
INSERT INTO sessions (user_id, active) VALUES (42, true);
COMMIT;`, 'Lock the parent row (PostgreSQL)') },
      { title: 'Pick the level: a like counter', html: `<p>One atomic <code>UPDATE … SET n = n + 1</code> is correct at ${H.c('g', 'any level ≥ READ COMMITTED')}. Raising the level would only add aborts. Lesson: isolation level is not the only tool — the shape of your SQL matters more.</p>` },
      { title: 'Why not SERIALIZABLE everywhere?', html: `${H.table(['Cost', 'Lock-based SERIALIZABLE (2PL)', 'SSI (Postgres)'], [['Readers block writers?', 'yes', 'no'], ['Aborts', 'deadlocks', 'serialization failures (some false positives)'], ['Throughput hit', 'large under contention', 'small-moderate (tracking SIREAD locks)'], ['App must', 'retry deadlocks', 'retry 40001 on every transaction']])}<p>Many teams do run SERIALIZABLE by default (CockroachDB defaults to it, though recent versions also offer READ COMMITTED) and accept retries. The non-negotiable part is a <b>generic retry wrapper</b>.</p>` }
    ],
    deepDive: `<p><b>Serializable vs strict serializable vs linearizable.</b> <i>Serializable</i>: the result equals <i>some</i> serial order — not necessarily the real-time order. <i>Strict serializable</i> adds "if T1 committed before T2 started, T1 comes first" (Spanner's external consistency, CockroachDB is serializable with some real-time guarantees). <i>Linearizable</i> is the single-object, real-time version from distributed systems — not about multi-row transactions.</p>
<p><b>How each level is implemented.</b> Lock-based (SQL Server default, DB2): RC = short S locks; RR = S locks held to commit; SERIALIZABLE = + key-range locks. MVCC-based (Postgres, Oracle, MySQL, SQL Server RCSI/SNAPSHOT): RC = snapshot per statement; RR/SI = snapshot per transaction + write-write conflict checks; SERIALIZABLE = SSI (Postgres) or SI plus locking reads (MySQL SERIALIZABLE turns plain SELECT into <code>SELECT … FOR SHARE</code> when autocommit is off).</p>
<p><b>MySQL REPEATABLE READ in detail:</b> plain SELECTs read a snapshot (no phantoms there); <code>SELECT … FOR UPDATE</code>, UPDATE and DELETE read the latest committed rows and take <b>next-key locks</b> (record + gap before it) on the scanned index range, which blocks phantom inserts into that range. This hybrid means the same transaction can see different data with and without <code>FOR UPDATE</code>.</p>
<p><b>Choosing in system design:</b> (1) find the invariants; (2) for each, prefer a constraint or an atomic statement; (3) for multi-row invariants, either lock a "guard" row or use SERIALIZABLE; (4) every transaction at RR/SER needs a retry wrapper with backoff, and must be idempotent; (5) keep transactions short — long transactions make MVCC bloat and lock waits worse at every level.</p>`,
    aiEra: `<p><b>What AI changes:</b> asking "which isolation level for X?" now gets a confident one-word answer. The value you add is knowing that answer depends on the engine — Postgres RR, MySQL RR and ANSI RR are three different things.</p>
<p><b>Use AI as a partner:</b> <code>Here is my transaction and my database is MySQL 8 at REPEATABLE READ. List every anomaly that can still occur, with a two-session schedule for each.</code> Then verify one schedule by hand in two terminals. Ask it to generate a retry wrapper for SQLSTATE 40001/40P01 in your language, with exponential backoff and jitter.</p>
<p><b>Where AI goes wrong:</b> copies the ANSI matrix verbatim; says "Oracle SERIALIZABLE prevents write skew" (it does not); forgets that changing the level without a retry loop turns rare anomalies into user-facing errors; assumes ORMs set a level (they use the DB default unless told).</p>
<p><b>What you must still own:</b> the per-engine truth table, the decision of which anomalies are acceptable per use-case, and the operational side (monitoring serialization-failure and deadlock rates after you raise the level).</p>`,
    problems: [{
      title: 'Pick the Isolation Level for Four Features',
      level: 'Medium', tags: ['isolation level', 'design', 'postgres'], companies: ['Uber', 'Atlassian', 'Zerodha'],
      statement: `<p>Your PostgreSQL app has four features. For each, choose the <b>weakest</b> isolation level (plus any SQL pattern) that is correct, and write the transaction header:</p>
<ol><li>Increment a video's view counter.</li><li>Generate an end-of-day PDF statement from 12 queries that must agree.</li><li>"A team must always have at least one admin" — admins can demote themselves concurrently.</li><li>Show a product page (price + stock), slightly stale data is fine.</li></ol>`,
      constraints: `<p>PostgreSQL 16+. Minimise aborts and blocking. Assume a retry wrapper exists for 40001.</p>`,
      example: `<p>Feature 1 → ${H.c('g', 'READ COMMITTED + atomic UPDATE')}. Raising it to SERIALIZABLE would be correct but adds pointless aborts.</p>`,
      brute: { why: `<p>"Use the default for everything": features 2 and 3 break (read skew in the PDF, write skew leaving a team with no admin). "Use SERIALIZABLE for everything": correct but every hot counter update risks 40001 retries and extra tracking overhead.</p>`, code: pg(`-- Everything at the default READ COMMITTED, no locking:
BEGIN;
SELECT COUNT(*) FROM members WHERE team_id = 7 AND role = 'admin';   -- 2
UPDATE members SET role = 'member' WHERE team_id = 7 AND user_id = 1;  -- concurrent twin demotes user 2
COMMIT;                                                                 -- team 7 ends with 0 admins`, 'Default everywhere (broken for 3)') },
      mcq: { q: 'Feature 3 ("at least one admin") under PostgreSQL REPEATABLE READ is…', options: ['Still broken: write skew is allowed by snapshot isolation', 'Safe: RR prevents all anomalies', 'Safe because Postgres RR has no phantoms', 'Only broken in MySQL'], answer: 0, explain: 'Snapshot isolation only aborts write-write conflicts on the same row; the two demotions touch different rows.' },
      hints: [
        `<p>Hint 1: For each feature, name the anomaly first: counter → lost update; PDF → read skew; admins → write skew; product page → none that matters.</p>`,
        `<p>Hint 2: Lost update is solved by atomic SQL at any level. Read skew needs one snapshot. Write skew needs locks on what you read or SERIALIZABLE.</p>`,
        `<p>Hint 3: Write the four headers: RC + <code>n = n + 1</code>; <code>REPEATABLE READ READ ONLY</code>; <code>SERIALIZABLE</code> (or RC + <code>FOR UPDATE</code> on the admin rows); RC (or a replica / cache).</p>`
      ],
      tests: { skip: 'the answer is a set of parameterised ($1) PostgreSQL transaction headers over tables (videos, members, a ledger with account_id/day) that are not in the lab database, and the point is isolation behaviour between sessions' },
      solution: {
        approach: `<p>(1) READ COMMITTED + atomic increment. (2) REPEATABLE READ READ ONLY — one snapshot, never blocks writers, never fails with serialization errors because it writes nothing. (3) SERIALIZABLE with retry, or READ COMMITTED + <code>SELECT … FOR UPDATE</code> on all admin rows of the team (lock what you read). (4) READ COMMITTED (or read replica / cache) — a single statement is already consistent.</p>`,
        code: pg(`-- 1. View counter
UPDATE videos SET views = views + 1 WHERE id = $1;            -- autocommit, READ COMMITTED

-- 2. End-of-day statement: one snapshot for all 12 queries
BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;
SELECT balance FROM accounts WHERE id = $1;
SELECT * FROM ledger WHERE account_id = $1 AND day = current_date;
COMMIT;

-- 3a. "At least one admin" with SERIALIZABLE (wrap in retry-on-40001)
BEGIN ISOLATION LEVEL SERIALIZABLE;
SELECT COUNT(*) FROM members WHERE team_id = $1 AND role = 'admin';
UPDATE members SET role = 'member' WHERE team_id = $1 AND user_id = $2;
COMMIT;

-- 3b. Same with explicit locks at READ COMMITTED
BEGIN;
SELECT user_id FROM members WHERE team_id = $1 AND role = 'admin' FOR UPDATE;
-- app: proceed only if more than one admin row came back
UPDATE members SET role = 'member' WHERE team_id = $1 AND user_id = $2;
COMMIT;

-- 4. Product page
SELECT name, price, stock FROM products WHERE id = $1;          -- READ COMMITTED, maybe a replica`, 'Four transaction headers (PostgreSQL)'),
        dry: { head: ['feature', 'anomaly risk', 'choice'], rows: [['view counter', 'lost update', 'RC + atomic SQL'], ['EOD statement', 'read skew', 'RR READ ONLY'], ['≥ 1 admin', 'write skew', 'SERIALIZABLE or FOR UPDATE'], ['product page', 'none important', 'RC / replica']] },
        complexity: `<p>All are O(log N) index operations. Costs differ in contention: SERIALIZABLE adds SIREAD tracking and occasional retries; RR READ ONLY retains old versions while it runs.</p>`,
        followUps: ['What if feature 2 runs for 3 hours?', 'Would 3b still work if admins are added (INSERT) concurrently?']
      }
    }]
  });
  /* =====================================================================
     TOPIC 5 — Locking & Two-Phase Locking
     ===================================================================== */
  var TPL = {
    strict: [
      { who: 'T1', act: 'BEGIN; lock-X(A)', A: 'T1:X', B: '', d: [500, 300], n: 1, narr: 'T1 (transfer 100 A→B) asks for an <b>exclusive</b> lock on row A. Free → granted. <b>Growing phase</b> begins.' },
      { who: 'T1', act: 'A = A − 100', A: 'T1:X', B: '', d: [400, 300], n: 1, narr: 'T1 writes A = 400 (uncommitted).' },
      { who: 'T2', act: 'BEGIN; lock-S(A) → WAIT', A: 'T1:X | wait T2:S', B: '', d: [400, 300], n: 1, cls: 'cur', narr: 'T2 (audit: A + B) wants a <b>shared</b> lock on A. S is incompatible with X → T2 waits. This is why T2 can never see the uncommitted 400.' },
      { who: 'T1', act: 'lock-X(B)', A: 'T1:X | wait T2:S', B: 'T1:X', d: [400, 300], n: 2, narr: 'T1 locks B. Still growing: 2 locks held.' },
      { who: 'T1', act: 'B = B + 100', A: 'T1:X | wait T2:S', B: 'T1:X', d: [400, 400], n: 2, narr: 'T1 writes B = 400.' },
      { who: 'T1', act: 'COMMIT → release ALL', A: 'T2:S', B: '', d: [400, 400], n: 0, cls: 'ok', narr: '<b>Strict 2PL</b>: T1 releases every lock only at COMMIT (shrinking phase is one instant). T2 is granted S on A.' },
      { who: 'T2', act: 'read A = 400; lock-S(B); read B = 400', A: 'T2:S', B: 'T2:S', d: [400, 400], n: 0, narr: 'T2 reads A = 400 and B = 400.' },
      { who: 'T2', act: 'sum = 800 ✔; COMMIT', A: '', B: '', d: [400, 400], n: 0, cls: 'ok', narr: 'Sum = 800. The schedule is equivalent to "T1 then T2": <b>conflict-serializable</b>. Strict 2PL also means no one ever read T1\'s uncommitted data, so an abort of T1 could never cascade.' }
    ],
    basic: [
      { who: 'T1', act: 'BEGIN; lock-X(A); A = 400', A: 'T1:X', B: '', d: [400, 300], n: 1, narr: 'Basic 2PL. T1 locks A and writes 400. Growing.' },
      { who: 'T1', act: 'lock-X(B)', A: 'T1:X', B: 'T1:X', d: [400, 300], n: 2, narr: 'T1 locks B. This is its <b>lock point</b> — the moment it holds every lock it will ever need.' },
      { who: 'T1', act: 'unlock(A)', A: '', B: 'T1:X', d: [400, 300], n: 1, cls: 'cur', narr: '<b>Shrinking phase</b> starts: T1 releases A early. From now on T1 may NOT acquire any new lock (the 2PL rule).' },
      { who: 'T2', act: 'lock-S(A); read A = 400', A: 'T2:S', B: 'T1:X', d: [400, 300], n: 1, cls: 'cur', narr: 'T2 grabs A and reads <b>400 — which is not committed yet</b>.' },
      { who: 'T2', act: 'lock-S(B) → WAIT', A: 'T2:S', B: 'T1:X | wait T2:S', d: [400, 300], n: 1, narr: 'T2 waits for B. Still serializable so far…' },
      { who: 'T1', act: 'B = 400; ABORT!', A: 'T2:S', B: 'T1:X | wait T2:S', d: [500, 300], n: 1, cls: 'bad', narr: 'T1 hits an error and <b>aborts</b>: A goes back to 500. But T2 already read 400 → T2 must be aborted too: a <span class="c-r">cascading abort</span>. Basic 2PL guarantees serializability, not recoverability.' },
      { who: 'T2', act: 'ABORT (cascade)', A: '', B: '', d: [500, 300], n: 0, cls: 'bad', narr: 'T2 is aborted and must retry. That is why real databases use <b>strict 2PL</b>: hold write locks until commit.' },
      { who: '-', act: 'lesson', A: '', B: '', d: [500, 300], n: 0, cls: 'ok', narr: 'Variants: <b>basic 2PL</b> (serializable, cascading aborts possible) → <b>strict 2PL</b> (X locks to commit, no cascades) → <b>rigorous / SS2PL</b> (all locks to commit; what SQL Server SERIALIZABLE and MySQL SERIALIZABLE effectively do).' }
    ],
    broken: [
      { who: 'T1', act: 'lock-X(A); A = 400; unlock(A)', A: '', B: '', d: [400, 300], n: 0, narr: '<b>Not 2PL</b>: T1 releases A immediately after writing it, then will lock B later (acquire after release = rule broken).' },
      { who: 'T2', act: 'lock-S(A); read 400; unlock(A)', A: '', B: '', d: [400, 300], n: 0, cls: 'cur', narr: 'T2 reads A = 400.' },
      { who: 'T2', act: 'lock-S(B); read 300; unlock(B)', A: '', B: '', d: [400, 300], n: 0, cls: 'bad', narr: 'T2 reads B = 300 — the <b>old</b> value. T2 computes 700. A combination that never existed.' },
      { who: 'T1', act: 'lock-X(B); B = 400; unlock(B); COMMIT', A: '', B: '', d: [400, 400], n: 0, narr: 'T1 finishes the transfer. Final data is correct (800), but T2 already reported 700.' },
      { who: '-', act: 'T2 reported 700 ✗', A: '', B: '', d: [400, 400], n: 0, cls: 'bad', narr: 'T2 saw T1\'s effect on A but not on B — so T2 must be "after T1" for A and "before T1" for B: a cycle in the precedence graph → <span class="c-r">not serializable</span>. Locking each row correctly is not enough; the <b>two-phase rule</b> is what makes it serializable.' }
    ]
  };
  var LMODES = ['IS', 'IX', 'S', 'SIX', 'X'];
  var LCOMP = [[1, 1, 1, 1, 0], [1, 1, 0, 0, 0], [1, 0, 1, 0, 0], [1, 0, 0, 0, 0], [0, 0, 0, 0, 0]];
  topics.push({
    title: 'Locking: Shared/Exclusive, Granularity & Two-Phase Locking',
    analogy: `<p>A <b>library</b>: many people may read the same reference book at once (<b>shared lock</b>), but if a librarian is rewriting a page, nobody may read or write it until they finish (<b>exclusive lock</b>). Putting a "being repaired" sign on the <b>whole shelf</b> is a table lock; on one book is a row lock. A sign on the floor saying "someone is working on a shelf on this floor" is an <b>intention lock</b> — it lets the building manager know not to repaint the whole floor right now.</p>
<p><b>Two-phase locking</b> is a rule for each borrower: "collect all the books you need first; once you return even one, you may not borrow any more."</p>`,
    explain: `<p>A <b>lock</b> is a note in the database's lock table: "transaction T holds mode M on resource R". If another transaction asks for an incompatible mode, it <b>waits</b>.</p>
${H.table(['held ↓ / requested →', 'S (read)', 'X (write)'], [['S', H.c('g', 'OK — share'), H.c('r', 'wait')], ['X', H.c('r', 'wait'), H.c('r', 'wait')]])}
<p><b>Granularity:</b> locks can be on a row, a page, or a whole table. Fine-grained (row) locks = more concurrency, more memory. To lock a table safely while others hold row locks, databases use <b>intention locks</b> (IS, IX, SIX) on the table: "I hold or will take S/X locks on some rows inside". Too many row locks can trigger <b>lock escalation</b> to a table lock (SQL Server does this around 5,000 locks per statement).</p>
<p><b>Two-Phase Locking (2PL):</b> every transaction has a <b>growing phase</b> (only acquire locks) and a <b>shrinking phase</b> (only release). If all transactions follow it, every schedule is <b>conflict-serializable</b>. <b>Strict 2PL</b> keeps write locks until COMMIT, so nobody reads uncommitted data and aborts never cascade.</p>
<p><b>Explicit locks you will actually type:</b></p>
${H.table(['SQL', 'What it does'], [
  ['<code>SELECT … FOR UPDATE</code>', 'X-lock the rows you read (you plan to update them)'],
  ['<code>SELECT … FOR SHARE</code>', 'S-lock: others may read/share-lock, nobody may update or delete'],
  ['<code>… FOR UPDATE NOWAIT</code>', 'fail immediately instead of waiting'],
  ['<code>… FOR UPDATE SKIP LOCKED</code>', 'skip rows others locked — perfect for job queues'],
  ['<code>LOCK TABLE t IN … MODE</code>', 'table-level lock (rarely needed)'],
  ['<code>pg_advisory_xact_lock(key)</code> / <code>GET_LOCK()</code>', 'application-defined lock on any number/name']
])}`,
    clues: [
      '"multiple workers pull jobs from a table without double-processing" → SELECT … FOR UPDATE SKIP LOCKED',
      '"fail fast instead of hanging" → NOWAIT or lock_timeout',
      '"guarantees serializability" + "locks" → two-phase locking (growing/shrinking), strict 2PL holds X locks until commit',
      '"readers block writers" → lock-based isolation; the answer is MVCC / RCSI',
      '"ALTER TABLE froze the whole site" → DDL needs an ACCESS EXCLUSIVE lock and queues behind a long transaction; use lock_timeout',
      '"gap lock" / "next-key lock" / "insert blocked for no reason" → InnoDB range locking under REPEATABLE READ'
    ],
    code: [
      pg(`-- Job queue: many workers, each grabs a different job, nobody waits.
BEGIN;
SELECT id, payload
FROM jobs
WHERE status = 'queued'
ORDER BY id
LIMIT 1
FOR UPDATE SKIP LOCKED;          -- rows locked by other workers are simply skipped
UPDATE jobs SET status = 'running', worker = 'w1' WHERE id = $1;
COMMIT;

-- Fail fast instead of waiting:
SELECT * FROM accounts WHERE id = 1 FOR UPDATE NOWAIT;  -- ERROR 55P03 if locked
SET lock_timeout = '2s';                                  -- or wait at most 2 seconds`, 'FOR UPDATE / SKIP LOCKED / NOWAIT (PostgreSQL)'),
      bank(`-- SQLite has no row locks (one writer for the whole DB), but the same "claim a job"
-- idea works as a single atomic UPDATE: pick + mark in ONE statement.
UPDATE jobs SET status = 'running', worker = 'w1'
WHERE id = (SELECT id FROM jobs WHERE status = 'queued' ORDER BY id LIMIT 1);
UPDATE jobs SET status = 'running', worker = 'w2'
WHERE id = (SELECT id FROM jobs WHERE status = 'queued' ORDER BY id LIMIT 1);
SELECT id, payload, status, worker FROM jobs ORDER BY id;   -- job 1 -> w1, job 2 -> w2`, 'Atomic job claim (▶ Run)'),
      lk(`-- Which waiting requests conflict with which held locks? (S-S is the only compatible pair)
SELECT w.txn AS waiter, w.mode AS wants, h.txn AS blocker, h.mode AS holds, w.resource
FROM lock_waits w
JOIN locks_held h ON h.resource = w.resource AND h.txn <> w.txn
WHERE NOT (w.mode = 'S' AND h.mode = 'S')
ORDER BY w.waiting_since;`, 'Who is blocking whom? (▶ Run)'),
      pg(`-- PostgreSQL: see real blocking right now
SELECT pid, pg_blocking_pids(pid) AS blocked_by, wait_event_type, state, left(query, 60) AS query
FROM pg_stat_activity
WHERE cardinality(pg_blocking_pids(pid)) > 0;

-- Safe DDL on a busy table: give up quickly instead of queueing everyone behind you.
SET lock_timeout = '3s';
ALTER TABLE orders ADD COLUMN note text;   -- retry later if it times out

-- Advisory lock: "only one cron job may run the nightly billing"
SELECT pg_try_advisory_lock(42);           -- true = you got it`, 'Inspecting locks, DDL & advisory locks (PostgreSQL)'),
      my(`-- InnoDB REPEATABLE READ: next-key locks block inserts into a scanned range.
-- Session A
START TRANSACTION;
SELECT * FROM signups WHERE event_id = 1 FOR UPDATE;   -- locks matching index records + gaps
-- Session B
INSERT INTO signups VALUES (1, 'Chen');                 -- WAITS (gap lock) -> no phantom
-- Inspect: SELECT * FROM performance_schema.data_locks;`, 'Gap / next-key locks (MySQL)')
    ],
    codeTitle: ['SKIP LOCKED queue', 'SQLite job claim', 'Blocking query', 'Monitoring & DDL', 'InnoDB next-key'],
    viz: [{
      title: 'Two-phase locking: strict vs basic vs broken',
      input: 'strict',
      inputLabel: 'strict | basic | broken',
      gen: function (input) {
        var k = pick(input, ['strict', 'basic', 'broken'], 'strict');
        var steps = TPL[k], frames = [], hist = [], rows = [];
        frames.push({ narr: 'T1 transfers 100 from A to B. T2 audits A + B (should always be 800). Mode: <b>' + k + '</b>. Watch the lock table and how many locks T1 holds over time.', parts: [
          { type: 'table', label: 'Lock table', columns: ['resource', 'granted / waiting'], rows: [['row A', '-'], ['row B', '-']] },
          { type: 'vars', label: 'Data', vals: { A: 500, B: 300 } }] });
        steps.forEach(function (s, i) {
          hist.push(s.n);
          rows.push([String(i + 1), s.who, s.act]);
          var hl = {}; rows.forEach(function (_, j) { hl[j] = 'done'; }); hl[i] = s.cls || 'cur';
          frames.push({ narr: s.narr, parts: [
            { type: 'table', label: 'Schedule', columns: ['#', 'txn', 'action'], rows: rows.map(function (r) { return r.slice(); }), hl: hl },
            { type: 'table', label: 'Lock table', columns: ['resource', 'granted / waiting'], rows: [['row A', s.A || '-'], ['row B', s.B || '-']], hl: { 0: s.A.indexOf('wait') >= 0 ? 'cur' : '', 1: s.B.indexOf('wait') >= 0 ? 'cur' : '' } },
            { type: 'bars', label: 'Locks held by T1 over time (growing ↗ then shrinking ↘)', values: hist.slice(), idxLabels: hist.map(function (_, j) { return 's' + (j + 1); }), hl: (function () { var h = {}; h[hist.length - 1] = 'cur'; return h; })() },
            { type: 'vars', label: 'Data', vals: { A: s.d[0], B: s.d[1], 'A+B': s.d[0] + s.d[1] }, hl: { 'A+B': s.d[0] + s.d[1] === 800 ? 'ok' : 'bad' } }
          ] });
        });
        return frames;
      }
    }, {
      title: 'Lock compatibility with intention locks',
      input: 'S S, S X, IX IX, IX S, IS X, SIX IS',
      inputLabel: 'pairs "held requested", comma separated (modes: IS IX S SIX X)',
      gen: function (input) {
        var pairs = String(input || '').split(',').map(function (p) { return p.trim().toUpperCase().split(/\s+/); }).filter(function (p) { return p[0]; });
        if (!pairs.length || pairs.length > 12) throw new Error('Give 1–12 pairs like "IX S, S S"');
        pairs.forEach(function (p) { if (p.length !== 2 || LMODES.indexOf(p[0]) < 0 || LMODES.indexOf(p[1]) < 0) throw new Error('Each pair is two modes from IS IX S SIX X, e.g. "IX S"'); });
        var grid = LCOMP.map(function (r) { return r.map(function (v) { return v ? '✔' : '✖'; }); });
        var frames = [{ narr: 'The full compatibility matrix for <b>table-level</b> locks. Rows = mode already <b>held</b> by someone else; columns = mode being <b>requested</b>. ✔ = granted at once, ✖ = wait. Intention locks (IS/IX) are what row-level readers/writers put on the table.', parts: [{ type: 'grid', label: 'held ↓ / requested →', rowHead: LMODES, colHead: LMODES, rows: grid }] }];
        var MEAN = { IS: 'some rows inside will be read (row S locks)', IX: 'some rows inside will be written (row X locks)', S: 'read the whole table', SIX: 'read the whole table AND write some rows', X: 'write the whole table' };
        pairs.forEach(function (p) {
          var r = LMODES.indexOf(p[0]), c = LMODES.indexOf(p[1]), ok = LCOMP[r][c] === 1, hl = {};
          hl[r + ',' + c] = ok ? 'ok' : 'bad';
          frames.push({ narr: 'Held <b>' + p[0] + '</b> ("' + MEAN[p[0]] + '"), requested <b>' + p[1] + '</b> ("' + MEAN[p[1]] + '") → ' + (ok ? '<span class="c-g">compatible, granted immediately</span>.' : '<span class="c-r">conflict, the requester waits</span>.') + (p[0] === 'IX' && p[1] === 'IX' ? ' Two writers on <i>different rows</i> of the same table must not block each other — that is the whole point of IX.' : '') + (p[1] === 'X' && p[0] === 'IS' ? ' Someone is reading rows, so a whole-table write (e.g. ALTER TABLE / LOCK TABLE … EXCLUSIVE) must wait.' : ''), parts: [
            { type: 'grid', label: 'held ↓ / requested →', rowHead: LMODES, colHead: LMODES, rows: grid, hl: hl },
            { type: 'vars', label: 'Decision', vals: { held: p[0], requested: p[1], result: ok ? 'GRANT' : 'WAIT' }, hl: { result: ok ? 'ok' : 'bad' } }] });
        });
        frames.push({ narr: 'Rule of thumb: <b>X conflicts with everything</b>; S only shares with S and IS; IX only shares with IS and IX. A row write = IX on the table + X on the row.', parts: [{ type: 'grid', label: 'held ↓ / requested →', rowHead: LMODES, colHead: LMODES, rows: grid, hl: { '4,0': 'bad', '4,1': 'bad', '4,2': 'bad', '4,3': 'bad', '4,4': 'bad', '1,1': 'ok', '2,2': 'ok' } }] });
        return frames;
      }
    }],
    examples: [
      { title: 'The ALTER TABLE that took the site down', html: `<p>A reporting query has been running for 10 minutes on <code>orders</code> (holds ACCESS SHARE). A migration runs <code>ALTER TABLE orders ADD COLUMN …</code> which needs ACCESS EXCLUSIVE → it <b>waits</b>. Every new <code>SELECT</code> on orders now queues <b>behind the ALTER</b> (lock queues are FIFO-ish) → the whole app freezes. ${H.c('g', 'Fix:')} <code>SET lock_timeout = '3s'</code> on migrations and retry; kill or avoid long transactions; use online-DDL tools.</p>` },
      { title: 'Which lock does each statement take? (PostgreSQL)', html: `${H.table(['Statement', 'Table lock', 'Row lock'], [['SELECT', 'ACCESS SHARE', 'none (MVCC)'], ['SELECT … FOR UPDATE', 'ROW SHARE', 'FOR UPDATE'], ['UPDATE / DELETE', 'ROW EXCLUSIVE', 'FOR UPDATE (or FOR NO KEY UPDATE if no key column changes)'], ['INSERT', 'ROW EXCLUSIVE', 'new row only'], ['CREATE INDEX', 'SHARE (blocks writes)', '-'], ['CREATE INDEX CONCURRENTLY', 'SHARE UPDATE EXCLUSIVE', '-'], ['ALTER TABLE / DROP / TRUNCATE', 'ACCESS EXCLUSIVE (blocks everything)', '-']])}` },
      { title: 'Prove a schedule is serializable with a precedence graph', html: `<p>Schedule: r1(A) w2(A) r2(B) w1(B). Conflicts (same item, different txns, at least one write): r1(A) before w2(A) → edge T1→T2; r2(B) before w1(B) → edge T2→T1. ${H.c('r', 'Cycle T1→T2→T1 → not conflict-serializable.')} Under 2PL this schedule cannot happen: T2's w2(A) would wait for T1's lock on A.</p>` },
      { title: 'Job queue: three workers, SKIP LOCKED', html: `${H.table(['time', 'worker 1', 'worker 2', 'worker 3'], [['t1', 'locks job 1', 'job 1 locked → skip → locks job 2', 'skips 1, 2 → locks job 3'], ['t2', 'processes 1', 'processes 2', 'processes 3'], ['t3', 'COMMIT (done)', 'COMMIT', 'crash → lock released → job 3 back to queued']])}<p>No waiting, no double processing, and a crashed worker's job automatically becomes available again because its transaction rolled back. Caveat: long processing inside the transaction holds a connection; many teams instead mark <code>status='running', lease_until = now()+5min</code> and commit quickly.</p>` }
    ],
    deepDive: `<p><b>Why 2PL works (proof sketch).</b> Give each transaction its <b>lock point</b> (the moment it acquires its last lock). If T1 conflicts with T2 on item X and T1 went first, T1 must have released X before T2 got it, so T1's lock point is before T2's. Every precedence edge therefore points from an earlier lock point to a later one — no cycle is possible, so the schedule equals the serial order by lock point.</p>
<p><b>Phantoms and predicate locks.</b> 2PL on rows does not stop inserts of new matching rows. True serializable 2PL needs <b>predicate locks</b> (lock "all rows where event_id = 1", expensive to check) or the practical approximation <b>index-range / next-key locks</b>: lock the index entries you scanned plus the gaps between them (InnoDB, SQL Server key-range locks). Without a usable index the engine may lock the whole table range — a reason indexes matter for concurrency, not just speed.</p>
<p><b>Lock manager internals.</b> A hash table keyed by resource id → list of granted and waiting requests. Row locks in InnoDB are stored as bitmaps per page (cheap); PostgreSQL stores row locks <i>in the tuple header</i> (xmax + infomask bits) rather than in shared memory, so it can lock millions of rows without escalation; multi-transaction share locks use "MultiXact" ids. SQL Server escalates row/page locks to a table lock past thresholds to save memory.</p>
<p><b>Latches vs locks:</b> locks protect logical data for a whole transaction and participate in deadlock detection; <b>latches</b> (lightweight mutexes) protect in-memory structures like a B-tree page for microseconds and are never held across user statements.</p>`,
    aiEra: `<p><b>What AI changes:</b> assistants are very good at writing the <code>FOR UPDATE SKIP LOCKED</code> queue, migration scripts with <code>lock_timeout</code>, and queries over <code>pg_locks</code> / <code>performance_schema.data_locks</code> to debug blocking. Paste a lock-wait dump and ask "who blocks whom and why?" — it saves real time in incidents.</p>
<p><b>Use AI as a partner:</b> <code>Given this migration, list the lock level each statement takes in Postgres 16 and which concurrent queries it will block</code>. Ask it to propose a zero-downtime version (add column without default rewrite, <code>CREATE INDEX CONCURRENTLY</code>, <code>NOT VALID</code> constraints then <code>VALIDATE</code>).</p>
<p><b>Where AI goes wrong:</b> it adds <code>FOR UPDATE</code> to read-only queries "for safety" (creating contention and deadlocks), suggests table locks where row locks suffice, and forgets that lock behaviour differs across engines (SQLite has no row locks; MySQL gap locks surprise people).</p>
<p><b>What you must still own:</b> understanding which lock each statement really takes on your engine, keeping transactions short, and designing so the hottest rows are locked for the shortest time.</p>`,
    problems: [{
      title: 'A Job Queue Where Workers Never Collide',
      level: 'Medium', tags: ['locking', 'skip locked', 'queue'], companies: ['GitHub', 'Shopify', 'Heroku'],
      statement: `<p>Several worker processes poll the <code>jobs</code> table. Today each runs <code>SELECT id FROM jobs WHERE status='queued' LIMIT 1</code> then <code>UPDATE jobs SET status='running' WHERE id = :id</code>. Some jobs run twice. Make claiming a job safe so each job is taken by exactly one worker, without workers waiting on each other.</p>`,
      constraints: `<p>PostgreSQL 9.5+ or MySQL 8.0+ in production. Show the logic runnable in SQLite too (single writer).</p>`,
      example: `<p>Workers w1 and w2 poll at the same moment. Naive: ${H.c('r', 'both read job 1, both run it')}. Fixed: ${H.c('g', 'w1 gets job 1, w2 gets job 2')}.</p>`,
      brute: { why: `<p>The SELECT and the UPDATE are separate steps: both workers read job 1 before either marks it running (check-then-act). Adding plain <code>FOR UPDATE</code> stops the double-run but makes w2 <b>wait</b> for w1 and then find job 1 already taken — workers serialize behind each other.</p>`, code: bank(`-- Naive: read then mark. Two workers can both read id 1 before either updates.
SELECT id FROM jobs WHERE status = 'queued' ORDER BY id LIMIT 1;   -- w1: 1
SELECT id FROM jobs WHERE status = 'queued' ORDER BY id LIMIT 1;   -- w2: 1 (same!)
UPDATE jobs SET status = 'running', worker = 'w1' WHERE id = 1;
UPDATE jobs SET status = 'running', worker = 'w2' WHERE id = 1;    -- job 1 run twice`, 'Naive select-then-update') },
      mcq: { q: 'Why SKIP LOCKED instead of plain FOR UPDATE?', options: ['Other workers skip rows already locked and take the next job instead of waiting', 'It makes the lock exclusive', 'It avoids writing to the WAL', 'It turns off MVCC'], answer: 0, explain: 'FOR UPDATE alone is correct but makes workers queue behind each other; SKIP LOCKED gives each worker a different row immediately.' },
      hints: [
        `<p>Hint 1: Claiming must be atomic: "find a free job and mark it mine" must not be splittable by another worker.</p>`,
        `<p>Hint 2: Lock the row while reading it (<code>FOR UPDATE</code>), and tell the database to skip rows that other workers already locked.</p>`,
        `<p>Hint 3: Recipe: BEGIN → <code>SELECT … WHERE status='queued' ORDER BY id LIMIT 1 FOR UPDATE SKIP LOCKED</code> → UPDATE status → COMMIT. Or fold it into one <code>UPDATE … WHERE id = (SELECT … FOR UPDATE SKIP LOCKED) RETURNING *</code>.</p>`
      ],
      tests: { engine: 'postgres', db: 'bank', cmp: 'exact', cases: [
        { rows: [
            [1, 'send-email:1']
          ] },
        { setup: 'UPDATE jobs SET status = \'running\', worker = \'w0\' WHERE id = 1', rows: [
            [2, 'resize-img:7']
          ] },
        { setup: 'UPDATE jobs SET status = \'done\' WHERE id IN (1, 3)', rows: [
            [2, 'resize-img:7']
          ] },
        { setup: 'UPDATE jobs SET status = \'done\' WHERE id <= 3', rows: [
            [4, 'charge-card:9']
          ] },
        { setup: 'DELETE FROM jobs WHERE id = 1', rows: [
            [2, 'resize-img:7']
          ] },
        { setup: 'UPDATE jobs SET status = \'running\', worker = \'w0\'', rows: [] },
        { setup: 'DELETE FROM jobs', rows: [] },
        { setup: 'UPDATE jobs SET status = \'done\'', after: 'SELECT count(*) FROM jobs WHERE status = \'running\'', rows: [
            [0]
          ] },
        { after: 'SELECT id, status, worker FROM jobs ORDER BY id', rows: [
            [1, 'running', 'w1'],
            [2, 'queued', null],
            [3, 'queued', null],
            [4, 'queued', null],
            [5, 'queued', null]
          ] },
        { setup: 'INSERT INTO jobs (id, payload) VALUES (0, \'first\')', rows: [
            [0, 'first']
          ] }
      ] },
      solution: {
        approach: `<p>Use a <b>locking read that skips locked rows</b>. Each worker locks a different queued row, marks it running and commits quickly. If a worker crashes before commit, its lock vanishes and the job stays queued. In SQLite (single writer) a single <code>UPDATE … WHERE id = (SELECT …)</code> is already atomic.</p>`,
        code: pg(`-- One statement per claim (PostgreSQL); 'w1' stands for the calling worker's id
UPDATE jobs
SET status = 'running', worker = 'w1'
WHERE id = (
  SELECT id FROM jobs
  WHERE status = 'queued'
  ORDER BY id
  LIMIT 1
  FOR UPDATE SKIP LOCKED
)
RETURNING id, payload;     -- 0 rows = queue empty (or everything currently claimed)`, 'SKIP LOCKED claim (PostgreSQL)'),
        alt: [bank(`-- SQLite: one writer at a time, so a single UPDATE is an atomic claim.
UPDATE jobs SET status = 'running', worker = 'w1'
WHERE id = (SELECT id FROM jobs WHERE status = 'queued' ORDER BY id LIMIT 1);
UPDATE jobs SET status = 'running', worker = 'w2'
WHERE id = (SELECT id FROM jobs WHERE status = 'queued' ORDER BY id LIMIT 1);
SELECT id, status, worker FROM jobs ORDER BY id;`, 'SQLite equivalent (▶ Run)'), my(`START TRANSACTION;
SELECT id, payload FROM jobs WHERE status = 'queued' ORDER BY id LIMIT 1 FOR UPDATE SKIP LOCKED;
UPDATE jobs SET status = 'running', worker = 'w1' WHERE id = 1;
COMMIT;`, 'MySQL 8')],
        dry: { head: ['t', 'w1', 'w2', 'jobs locked'], rows: [['1', 'locks job 1', '-', '{1}'], ['2', '-', 'job 1 locked → skip → locks job 2', '{1, 2}'], ['3', 'status=running, COMMIT', '-', '{2}'], ['4', '-', 'status=running, COMMIT', '{}']] },
        complexity: `<p>With an index on <code>(status, id)</code> each claim is O(log N). Contention is near zero because workers never wait on each other's rows.</p>`,
        followUps: ['How do you recover jobs whose worker died after committing "running"? (lease / heartbeat column)', 'Why can a FOR UPDATE SKIP LOCKED queue return jobs out of strict order?']
      }
    }]
  });
  /* =====================================================================
     TOPIC 6 — MVCC
     ===================================================================== */
  var VIS_SQL = `-- PostgreSQL-style visibility rule, written as SQL over our hand-made tuple headers.
-- A txn's effects are visible to snapshot S if it COMMITTED, started before S.snap_xmax,
-- and was not still running (in S's xip list) when S was taken.
WITH s AS (SELECT * FROM snapshots WHERE name = 'old_report'),
committed_for_s AS (
  SELECT t.xid
  FROM txns t, s
  WHERE t.status = 'committed'
    AND t.xid < s.snap_xmax
    AND t.xid NOT IN (SELECT xid FROM snapshot_xip WHERE name = s.name)
)
SELECT ctid, id, owner, balance, xmin, xmax
FROM tuples
WHERE xmin IN (SELECT xid FROM committed_for_s)                     -- creator is visible
  AND (xmax = 0 OR xmax NOT IN (SELECT xid FROM committed_for_s))   -- deleter is not
ORDER BY id;`;
  topics.push({
    title: 'MVCC: Row Versions, Snapshots, xmin/xmax & VACUUM',
    analogy: `<p>MVCC is like <b>Google Docs version history</b> or a <b>Wikipedia page history</b>. Editing never erases the old text; it adds a new version stamped with who made it and when. A reader who opened the page at 10:00 keeps reading the 10:00 version even while someone saves at 10:05. Readers never wait for writers, writers never wait for readers. Every so often, a janitor deletes versions nobody can possibly still be reading (<b>VACUUM</b> / purge).</p>`,
    explain: `<p><b>Multi-Version Concurrency Control (MVCC)</b>: instead of overwriting a row, an UPDATE creates a <b>new version</b>. Each transaction reads from a <b>snapshot</b> — a frozen "which transactions had committed when I started" list — and sees, for every row, the newest version committed in that snapshot.</p>
<p>In PostgreSQL every physical row version (a <b>tuple</b>) carries two hidden columns:</p>
${H.table(['Header', 'Meaning', 'Example'], [['<code>xmin</code>', 'id of the transaction that <b>created</b> this version', '105 = "made by txn 105"'], ['<code>xmax</code>', 'id of the transaction that <b>deleted / replaced</b> it (0 = still live)', '110 = "txn 110 updated it"']])}
<p>An <code>UPDATE balance 500 → 400</code> by txn 105 does two things: set <code>xmax = 105</code> on the old tuple, and insert a new tuple with <code>xmin = 105</code>. A DELETE only sets xmax. A ROLLBACK changes nothing in the table — the commit log simply records 105 as aborted, which makes its tuples invisible.</p>
<p><b>Visibility rule</b> (simplified): a tuple is visible to snapshot S if <b>xmin is committed-in-S</b> and <b>xmax is 0 or not committed-in-S</b>. "Committed-in-S" = committed, older than S.xmax, and not in S's list of then-running transactions.</p>
${H.table(['ctid', 'balance', 'xmin', 'xmax', 'old snapshot (taken before 110)', 'new snapshot'], [['(0,1)', '500', '100', '105', 'dead', 'dead'], ['(0,3)', '400', '105', '110', H.c('g', 'visible'), H.c('g', 'visible (110 still running)')], ['(0,5)', '350', '110', '0', 'invisible', 'invisible until 110 commits']])}
<p><b>Big wins:</b> readers never block writers and vice versa; consistent snapshots are cheap. <b>Costs:</b> old versions pile up (bloat) until VACUUM/purge removes them, and long-running transactions prevent that cleanup. <b>Writers still block writers</b> on the same row.</p>`,
    clues: [
      '"readers don\'t block writers" / "consistent read without locks" → MVCC snapshots',
      '"table keeps growing although row count is flat" / "bloat" → dead tuples; VACUUM, long-running or idle-in-transaction sessions',
      '"xmin / xmax / ctid" → PostgreSQL tuple header; "undo log / read view / history list length" → InnoDB MVCC',
      '"snapshot too old" (ORA-01555) → undo needed by an old snapshot was overwritten',
      '"transaction ID wraparound" → 32-bit xids in PostgreSQL; autovacuum must freeze old tuples',
      '"serializable without locking readers" → SSI on top of MVCC (PostgreSQL SERIALIZABLE)'
    ],
    code: [
      mv(VIS_SQL, 'Which versions does the old snapshot see? (▶ Run, then change old_report → now)'),
      mv(`-- Dead tuples = versions no current or future snapshot can ever see. VACUUM may reclaim them.
-- (1) creator aborted, or (2) deleter committed before the oldest running snapshot started.
WITH horizon AS (SELECT MIN(snap_xmin) AS oldest FROM snapshots)
SELECT tp.ctid, tp.owner, tp.balance, tp.xmin, tp.xmax,
       CASE WHEN cr.status = 'aborted' THEN 'creator aborted'
            ELSE 'replaced by committed txn ' || tp.xmax END AS why_dead
FROM tuples tp
JOIN txns cr ON cr.xid = tp.xmin
LEFT JOIN txns dl ON dl.xid = tp.xmax
WHERE cr.status = 'aborted'
   OR (dl.status = 'committed' AND tp.xmax < (SELECT oldest FROM horizon));`, 'What VACUUM can remove (▶ Run)'),
      pg(`-- Real PostgreSQL: look at the hidden columns yourself.
CREATE TABLE acct (id int PRIMARY KEY, balance int);
INSERT INTO acct VALUES (1, 500);
SELECT ctid, xmin, xmax, * FROM acct;          -- (0,1) | 812 | 0 | 1 | 500
BEGIN;
SELECT pg_current_xact_id();                     -- e.g. 813
UPDATE acct SET balance = 400 WHERE id = 1;
SELECT ctid, xmin, xmax, * FROM acct;          -- (0,2) | 813 | 0 : new version
COMMIT;
SELECT pg_current_snapshot();                    -- xmin:xmax:xip_list, e.g. 814:814:
-- Dead tuples & vacuum stats:
SELECT relname, n_live_tup, n_dead_tup, last_autovacuum FROM pg_stat_user_tables;`, 'See xmin / xmax in PostgreSQL'),
      my(`-- InnoDB keeps ONE row in the table + a chain of older versions in the undo log.
-- How far behind is purge? (a large number = old versions piling up)
SELECT name, count FROM information_schema.innodb_metrics WHERE name = 'trx_rseg_history_len';
-- Long transactions that pin old versions:
SELECT trx_id, trx_started, trx_rows_locked, trx_query
FROM information_schema.innodb_trx ORDER BY trx_started LIMIT 5;`, 'InnoDB undo history (MySQL)')
    ],
    codeTitle: ['Visibility rule in SQL', 'Dead tuples', 'PostgreSQL hidden columns', 'InnoDB history'],
    viz: [{
      title: 'MVCC row versions with xmin / xmax',
      input: '400 !999 350',
      inputLabel: 'successive new balances (prefix ! = that transaction aborts)',
      gen: function (input) {
        var toks = String(input || '').trim().split(/[\s,]+/).filter(Boolean);
        if (!toks.length || toks.length > 6) throw new Error('Give 1–6 balances, e.g. "400 !999 350"');
        var ups = toks.map(function (t) { var ab = t.charAt(0) === '!'; var v = parseInt(ab ? t.slice(1) : t, 10); if (isNaN(v)) throw new Error('Balances must be numbers (optionally prefixed with !)'); return { v: v, abort: ab }; });
        var status = {}, tuples = [], frames = [], R = null;
        function cin(x, snap) { return status[x] === 'committed' && x < snap.xmax && snap.xip.indexOf(x) < 0; }
        function vis(t, snap) { return cin(t.xmin, snap) && !(t.xmax && cin(t.xmax, snap)); }
        function latestSnap(nextXid) { var xip = []; Object.keys(status).forEach(function (k) { if (status[k] === 'in progress') xip.push(+k); }); return { xmax: nextXid, xip: xip }; }
        function frame(narr, nextXid, extraHl, varsExtra) {
          var now = latestSnap(nextXid), hl = {};
          var rows = tuples.map(function (t, i) {
            var rv = R ? (vis(t, R) ? 'VISIBLE' : '-') : '(no reader)';
            var nv = vis(t, now) ? 'VISIBLE' : '-';
            if (t.gone) hl[i] = 'done';
            else if (R && vis(t, R)) hl[i] = 'sel';
            else if (vis(t, now)) hl[i] = 'ok';
            else if (status[t.xmin] === 'aborted' || (t.xmax && status[t.xmax] === 'committed')) hl[i] = 'done';
            return [t.ctid, String(t.bal), String(t.xmin), t.xmax ? String(t.xmax) : '0', t.gone ? 'vacuumed' : rv, t.gone ? 'vacuumed' : nv];
          });
          if (extraHl) Object.keys(extraHl).forEach(function (k) { hl[k] = extraHl[k]; });
          var st = {}; Object.keys(status).forEach(function (k) { st['txn ' + k] = status[k]; });
          var stHl = {}; Object.keys(status).forEach(function (k) { stHl['txn ' + k] = status[k] === 'committed' ? 'ok' : status[k] === 'aborted' ? 'bad' : 'cur'; });
          var parts = [{ type: 'table', label: 'Heap tuples for account 1 (purple = what reader R sees, green = what a brand-new query sees)', columns: ['ctid', 'balance', 'xmin', 'xmax', 'R (old snapshot)', 'new snapshot'], rows: rows, hl: hl },
            { type: 'vars', label: 'Commit log (clog)', vals: st, hl: stHl }];
          if (varsExtra) parts.push({ type: 'vars', label: 'Snapshots', vals: varsExtra });
          frames.push({ narr: narr, parts: parts });
        }
        status[100] = 'in progress';
        tuples.push({ ctid: '(0,1)', bal: 500, xmin: 100, xmax: 0 });
        frame('Txn <b>100</b> INSERTs Asha with balance 500. The new tuple gets <code>xmin = 100</code>, <code>xmax = 0</code>. Txn 100 has not committed, so nobody else sees it yet.', 101, { 0: 'cur' });
        status[100] = 'committed';
        frame('Txn 100 <b>COMMITs</b>. Only the commit log changes ("100 = committed"); the tuple is untouched. Now every new snapshot sees 500.', 101);
        R = { xmax: 101, xip: [] };
        frame('Reader <b>R</b> starts a REPEATABLE READ transaction and takes a snapshot: <code>{xmax: 101, running: []}</code> = "everything below 101 that committed is visible; nothing newer".', 101, null, { 'R.snapshot': 'xmax=101, xip=[]' });
        var xid = 101, page = 2;
        ups.forEach(function (u) {
          var live = -1;
          for (var i = tuples.length - 1; i >= 0; i--) { if (!tuples[i].xmax || status[tuples[i].xmax] === 'aborted') { if (status[tuples[i].xmin] === 'committed') { live = i; break; } } }
          status[xid] = 'in progress';
          var oldX = tuples[live].xmax;
          tuples[live].xmax = xid;
          tuples.push({ ctid: '(0,' + page + ')', bal: u.v, xmin: xid, xmax: 0 });
          var hl = {}; hl[live] = 'cur'; hl[tuples.length - 1] = 'cur';
          frame('Txn <b>' + xid + '</b> runs <code>UPDATE … SET balance = ' + u.v + '</code>. It does <b>not</b> overwrite: it stamps the old tuple <code>xmax = ' + xid + '</code>' + (oldX ? ' (replacing aborted ' + oldX + ')' : '') + ' and appends a new tuple ' + '(0,' + page + ') with <code>xmin = ' + xid + '</code>. Readers keep seeing the old version — no waiting.', xid + 1, hl, { 'R.snapshot': 'xmax=101, xip=[]' });
          status[xid] = u.abort ? 'aborted' : 'committed';
          frame(u.abort ? 'Txn ' + xid + ' <span class="c-r">ABORTS</span>. Postgres does no undo work: the clog says "aborted", so tuple (0,' + page + ') is invisible to everyone and the old tuple\'s xmax = ' + xid + ' is ignored. Rollback is instant; the garbage stays until VACUUM.' : 'Txn ' + xid + ' <b>COMMITs</b>. New queries now see <b>' + u.v + '</b> (green). Reader R still sees its old version (purple) because ' + xid + ' ≥ its snapshot xmax 101.', xid + 1, null, { 'R.snapshot': 'xmax=101, xip=[]' });
          xid++; page++;
        });
        frame('Reader R runs its SELECT again: still the purple version. That is <b>repeatable read for free</b> — no locks were taken by anybody to achieve it. The price: every version R might need must be kept.', xid);
        R = null;
        frame('R <b>COMMITs</b>. Now no snapshot can see the old versions any more.', xid);
        var removed = 0;
        tuples.forEach(function (t) { var dead = status[t.xmin] === 'aborted' || (t.xmax && status[t.xmax] === 'committed'); if (dead) { t.gone = true; removed++; } });
        frame('<b>VACUUM</b> (autovacuum) removes the ' + removed + ' dead tuple(s) — replaced by committed updates or created by aborted transactions — and records the space as reusable. A long-running R would have blocked this, causing <b>bloat</b>.', xid);
        return frames;
      }
    }, {
      title: 'SSI: detecting write skew with rw-dependencies',
      gen: function () {
        var nodes = [{ id: 'T1', label: 'T1 Alice', x: 25, y: 30 }, { id: 'T2', label: 'T2 Bob', x: 75, y: 30 }];
        function g(edges, ehl, hl, tags) { return { type: 'graph', label: 'Read-write dependency graph', directed: true, height: 60, nodes: nodes, edges: edges, ehl: ehl || {}, hl: hl || {}, tags: tags || {} }; }
        return [
          { narr: 'PostgreSQL SERIALIZABLE = <b>Serializable Snapshot Isolation</b>. It runs exactly like snapshot isolation, but also remembers <b>who read what</b> (SIREAD locks, which never block anyone).', parts: [g([], {}, {}, { T1: 'active', T2: 'active' }), { type: 'table', label: 'SIREAD locks', columns: ['txn', 'read'], rows: [] }] },
          { narr: 'T1 and T2 both read the on-call doctors for shift 1234 (count = 2). SIREAD locks recorded for both.', parts: [g([], {}, { T1: 'cur', T2: 'cur' }, { T1: 'read set', T2: 'read set' }), { type: 'table', label: 'SIREAD locks', columns: ['txn', 'read'], rows: [['T1', 'doctors shift 1234'], ['T2', 'doctors shift 1234']] }] },
          { narr: 'T1 updates Alice. T2 had <b>read</b> Alice\'s row and T1 <b>wrote</b> it, so T2 did not see T1\'s write: T2 must come <b>before</b> T1 in any serial order. Edge <b>T2 —rw→ T1</b>.', parts: [g([['T2', 'T1', 'rw: Alice']], { 'T2-T1': 'cur' }, { T1: 'cur' }), { type: 'table', label: 'SIREAD locks', columns: ['txn', 'read'], rows: [['T1', 'doctors shift 1234'], ['T2', 'doctors shift 1234']], hl: { 1: 'cur' } }] },
          { narr: 'T2 updates Bob, a row T1 read: <b>T1 —rw→ T2</b>, so T1 must come before T2. Both edges together form a <span class="c-r">cycle</span>: T1 before T2 before T1. No serial order exists.', parts: [g([['T2', 'T1', 'rw: Alice'], ['T1', 'T2', 'rw: Bob']], { 'T2-T1': 'bad', 'T1-T2': 'bad' }, { T1: 'bad', T2: 'bad' }), { type: 'table', label: 'SIREAD locks', columns: ['txn', 'read'], rows: [['T1', 'doctors shift 1234'], ['T2', 'doctors shift 1234']], hl: { 0: 'bad', 1: 'bad' } }] },
          { narr: 'SSI looks for a "dangerous structure": a transaction with both an incoming and an outgoing rw-edge (a <b>pivot</b>) among concurrent transactions. Found → when T1 commits first it wins, and T2 is aborted with <code>40001 could not serialize access due to read/write dependencies</code>.', parts: [g([['T2', 'T1', 'rw'], ['T1', 'T2', 'rw']], { 'T2-T1': 'done', 'T1-T2': 'bad' }, { T1: 'ok', T2: 'bad' }, { T1: 'COMMITTED', T2: 'ABORTED 40001' })] },
          { narr: 'The app retries T2: new snapshot, count = 1, Bob stays on call. Invariant safe. SSI may give <b>false positives</b> (it tracks at page/relation granularity when memory runs short), so <b>every</b> SERIALIZABLE transaction needs a retry loop.', parts: [g([], {}, { T1: 'done', T2: 'ok' }, { T1: 'done', T2: 'retried ✔' }), { type: 'vars', label: 'Result', vals: { 'on call': 1, invariant: 'kept' }, hl: { invariant: 'ok' } }] }
        ];
      }
    }],
    examples: [
      { title: 'Read the visibility table by hand', html: `<p>Using the <code>mvcc</code> database: snapshot <b>old_report</b> = {xmax 108, running [107]}. Tuple (0,2) Ben: xmin 100 (committed, visible), xmax 107 (in the running list → its delete is invisible; and 107 aborted anyway) → ${H.c('g', 'Ben visible')}. Tuple (0,4) Chen: xmin 108 ≥ xmax 108 → ${H.c('r', 'invisible')} (Chen was created after the snapshot). Tuple (0,3) Asha 400: xmin 105 visible, xmax 110 ≥ 108 → ${H.c('g', 'visible')}. Run the first code block to confirm.</p>` },
      { title: 'The idle-in-transaction bloat incident', html: `<p>A developer opens <code>BEGIN; SELECT …</code> in a SQL console and goes to lunch. Their snapshot pins the "xmin horizon": autovacuum cannot remove any tuple deleted after it. A hot <code>sessions</code> table updated 2,000×/s grows by millions of dead tuples per hour, indexes bloat, queries slow down. ${H.c('g', 'Fix:')} <code>idle_in_transaction_session_timeout = '5min'</code>, monitor <code>pg_stat_activity.backend_xmin</code> age, alert on long transactions. Replicas with <code>hot_standby_feedback = on</code> can pin the horizon too.</p>` },
      { title: 'Postgres vs InnoDB vs Oracle MVCC storage', html: `${H.table(['', 'PostgreSQL', 'InnoDB (MySQL)', 'Oracle', 'SQL Server'], [['New version goes', 'new tuple in the heap (append)', 'row updated in place', 'in place', 'in place'], ['Old version goes', 'stays in heap', 'undo log (roll pointer chain)', 'undo segments', 'version store in tempdb'], ['Cleanup', 'VACUUM', 'purge thread', 'undo retention', 'version-store cleanup'], ['Rollback cost', 'instant', 'apply undo', 'apply undo', 'apply undo'], ['Long-reader symptom', 'bloat', 'history list length grows', 'ORA-01555 snapshot too old', 'tempdb growth']])}` },
      { title: 'HOT updates: why updating an indexed column costs more', html: `<p>In Postgres every new tuple normally needs <b>new index entries</b> pointing to it (indexes point to ctids). If no indexed column changed and the page has free space, a <b>Heap-Only Tuple (HOT)</b> update chains the new version on the same page and skips index updates. Tip: leave room with <code>fillfactor = 90</code> on hot-update tables, and do not index columns that change constantly (like <code>last_seen_at</code>) unless you must.</p>` }
    ],
    deepDive: `<p><b>Snapshot structure.</b> A Postgres snapshot is <code>(xmin, xmax, xip[])</code>: every xid &lt; xmin is finished; every xid ≥ xmax had not started; xids in between are finished unless listed in xip. Visibility checks consult the commit log (clog / pg_xact) and cache the answer in tuple <i>hint bits</i> so later readers skip the lookup — which is why a plain SELECT right after a bulk load can cause writes.</p>
<p><b>Transaction id wraparound.</b> Postgres xids are 32-bit and compared modulo 2<sup>32</sup>: each xid sees ~2 billion in the past and ~2 billion in the future. Old tuples must be <b>frozen</b> (marked "older than everyone") by vacuum before the counter wraps; otherwise the database stops accepting writes to protect data. Monitor <code>age(datfrozenxid)</code>. (64-bit xids are a long-running community effort; check your version's release notes.)</p>
<p><b>InnoDB read views.</b> A read view records the ids of active transactions at creation; to read a row, InnoDB checks the row's <code>DB_TRX_ID</code>; if invisible, it follows <code>DB_ROLL_PTR</code> into the undo log, rebuilding older versions until one is visible. Secondary indexes are not versioned the same way, so InnoDB may need to visit the clustered index to check visibility.</p>
<p><b>Write conflicts under MVCC.</b> MVCC does not let two writers update the same row concurrently: the second waits on the first's row lock (xmax in Postgres). Then: READ COMMITTED re-reads the new version and proceeds; REPEATABLE READ/SERIALIZABLE abort with a serialization failure if the first committed. <b>SSI</b> adds SIREAD tracking (predicate locks on index pages/relations) and aborts on dangerous rw-structures; its overhead is typically modest, and read-only transactions can be declared <code>READ ONLY DEFERRABLE</code> to never abort.</p>`,
    aiEra: `<p><b>What AI changes:</b> you can paste <code>pg_stat_user_tables</code>, <code>pg_stat_activity</code> or InnoDB status output and get a fast diagnosis of bloat or a pinned xmin horizon. Assistants also explain the visibility rule well when you give them concrete xmin/xmax numbers.</p>
<p><b>Use AI as a partner:</b> <code>Here are tuple headers and a snapshot (xmin, xmax, xip). For each tuple say visible or not and why.</code> — then check its reasoning against the rule; this is a great drill. Ask it to draft autovacuum tuning for a table with 50M updates/day.</p>
<p><b>Where AI goes wrong:</b> it says "MVCC means no locks" (writers still lock rows), claims ROLLBACK in Postgres undoes tuples (it only flips the commit status), confuses InnoDB undo-chain reads with Postgres heap versions, and recommends <code>VACUUM FULL</code> in production (it takes an ACCESS EXCLUSIVE lock and rewrites the table).</p>
<p><b>What you must still own:</b> the visibility rule, the operational consequences (bloat, wraparound, purge lag), and the discipline of short transactions — no AI will notice that your web framework leaves sessions "idle in transaction".</p>`,
    problems: [{
      title: 'Which Version Does Each Snapshot See?',
      level: 'Hard', tags: ['mvcc', 'xmin', 'xmax', 'snapshot'], companies: ['PostgreSQL contributors', 'Snowflake', 'Microsoft'],
      statement: `<p>The <code>mvcc</code> database stores tuple headers (<code>xmin</code>, <code>xmax</code>), a commit log <code>txns</code>, and snapshots (<code>snap_xmax</code> + running list <code>snapshot_xip</code>). Write ONE query that, for <b>every snapshot</b>, lists the visible tuples (snapshot name, id, owner, balance).</p>`,
      constraints: `<p>A txn is committed-in-snapshot if status = committed AND xid &lt; snap_xmax AND xid not in that snapshot's xip list. Visible = creator committed-in-snapshot AND (xmax = 0 OR deleter not committed-in-snapshot).</p>`,
      example: `<p>Expected: ${H.c('b', 'old_report')} → Asha 400, Ben 300 (Chen invisible: created by 108 ≥ 108). ${H.c('b', 'now')} → Asha 400, Ben 300, Chen 1000 (Asha 350 invisible: txn 110 still running; Ben's deleter 107 aborted).</p>`,
      brute: { why: `<p>"Latest row wins" (<code>xmax = 0</code>) ignores snapshots entirely: it shows Asha 350 from an uncommitted transaction (a dirty read) and hides Ben because it ignores that 107 aborted.</p>`, code: mv(`-- Wrong: "live" tuples only. Shows uncommitted 350, hides Ben (whose deleter aborted).
SELECT id, owner, balance FROM tuples WHERE xmax = 0 ORDER BY id;`, 'Naive: xmax = 0') },
      mcq: { q: 'Tuple xmin = 105 (committed), xmax = 110 (in progress). A new snapshot sees it?', options: ['Yes — the deleting transaction has not committed', 'No — xmax is set so the row is deleted', 'Only if 110 later aborts', 'Only under READ UNCOMMITTED'], answer: 0, explain: 'A non-zero xmax only hides the tuple once that deleter is committed-in-snapshot.' },
      hints: [
        `<p>Hint 1: First build, per snapshot, the set of transactions whose effects it can see (a CTE of (name, xid) pairs).</p>`,
        `<p>Hint 2: Cross join snapshots × txns, keep committed rows with xid &lt; snap_xmax, and exclude (name, xid) pairs present in snapshot_xip with NOT EXISTS.</p>`,
        `<p>Hint 3: Join tuples on "xmin in the visible set for that snapshot" and anti-join on "xmax in the visible set for that snapshot". Order by snapshot, id.</p>`
      ],
      tests: { engine: 'sqlite', check: '(rows, cols, c) => {\n  if (c.plan || c.noplan) { const d = rows.map(r => r[r.length - 1]).join(\'\\n\'); return (!c.plan || new RegExp(c.plan).test(d)) && (!c.noplan || !new RegExp(c.noplan).test(d)); }\n  let a = rows, b = c.rows || [];\n  if (c.set) { const k = r => JSON.stringify(r); a = a.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); b = b.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); }\n  return a.length === b.length && a.every((r, i) => r.length === b[i].length && r.every((v, j) => v === b[i][j] || (typeof v === \'number\' && typeof b[i][j] === \'number\' && Math.abs(v - b[i][j]) < 1e-6)));\n}', cases: [
        { setup: '', rows: [
            ['now', 1, 'Asha', 400, '(0,3)'],
            ['now', 2, 'Ben', 300, '(0,2)'],
            ['now', 3, 'Chen', 1000, '(0,4)'],
            ['old_report', 1, 'Asha', 400, '(0,3)'],
            ['old_report', 2, 'Ben', 300, '(0,2)']
          ] },
        { setup: 'UPDATE txns SET status = \'committed\' WHERE xid = 107', rows: [
            ['now', 1, 'Asha', 400, '(0,3)'],
            ['now', 3, 'Chen', 1000, '(0,4)'],
            ['old_report', 1, 'Asha', 400, '(0,3)'],
            ['old_report', 2, 'Ben', 300, '(0,2)']
          ] },
        { setup: 'INSERT INTO snapshots VALUES (\'mid\', 100, 106)', rows: [
            ['mid', 1, 'Asha', 400, '(0,3)'],
            ['mid', 2, 'Ben', 300, '(0,2)'],
            ['now', 1, 'Asha', 400, '(0,3)'],
            ['now', 2, 'Ben', 300, '(0,2)'],
            ['now', 3, 'Chen', 1000, '(0,4)'],
            ['old_report', 1, 'Asha', 400, '(0,3)'],
            ['old_report', 2, 'Ben', 300, '(0,2)']
          ] },
        { setup: 'INSERT INTO snapshot_xip VALUES (\'now\', 108)', rows: [
            ['now', 1, 'Asha', 400, '(0,3)'],
            ['now', 2, 'Ben', 300, '(0,2)'],
            ['old_report', 1, 'Asha', 400, '(0,3)'],
            ['old_report', 2, 'Ben', 300, '(0,2)']
          ] },
        { setup: 'UPDATE txns SET status = \'aborted\' WHERE xid = 105', rows: [
            ['now', 1, 'Asha', 500, '(0,1)'],
            ['now', 2, 'Ben', 300, '(0,2)'],
            ['now', 3, 'Chen', 1000, '(0,4)'],
            ['old_report', 1, 'Asha', 500, '(0,1)'],
            ['old_report', 2, 'Ben', 300, '(0,2)']
          ] },
        { setup: 'DELETE FROM snapshot_xip WHERE name = \'old_report\'; UPDATE snapshots SET snap_xmax = 200 WHERE name = \'old_report\'', rows: [
            ['now', 1, 'Asha', 400, '(0,3)'],
            ['now', 2, 'Ben', 300, '(0,2)'],
            ['now', 3, 'Chen', 1000, '(0,4)'],
            ['old_report', 1, 'Asha', 400, '(0,3)'],
            ['old_report', 2, 'Ben', 300, '(0,2)'],
            ['old_report', 3, 'Chen', 1000, '(0,4)']
          ] },
        { setup: 'DELETE FROM snapshot_xip; DELETE FROM snapshots', rows: [] },
        { setup: 'DELETE FROM tuples', rows: [] },
        { setup: 'UPDATE txns SET status = \'committed\' WHERE xid = 110', rows: [
            ['now', 1, 'Asha', 400, '(0,3)'],
            ['now', 2, 'Ben', 300, '(0,2)'],
            ['now', 3, 'Chen', 1000, '(0,4)'],
            ['old_report', 1, 'Asha', 400, '(0,3)'],
            ['old_report', 2, 'Ben', 300, '(0,2)']
          ] }
      ] },
      solution: {
        approach: `<p>Materialize "visible transactions per snapshot" once, then apply the two-part rule with a semi-join on xmin and an anti-join on xmax, both correlated on the snapshot name.</p>`,
        code: mv(`WITH vis AS (                       -- (snapshot, xid) pairs whose effects the snapshot sees
  SELECT s.name, t.xid
  FROM snapshots s
  JOIN txns t ON t.status = 'committed' AND t.xid < s.snap_xmax
  WHERE NOT EXISTS (SELECT 1 FROM snapshot_xip x WHERE x.name = s.name AND x.xid = t.xid)
)
SELECT s.name AS snapshot, tp.id, tp.owner, tp.balance, tp.ctid
FROM snapshots s
JOIN tuples tp
  ON EXISTS (SELECT 1 FROM vis v WHERE v.name = s.name AND v.xid = tp.xmin)
 AND NOT EXISTS (SELECT 1 FROM vis v WHERE v.name = s.name AND v.xid = tp.xmax)
ORDER BY s.name, tp.id;`, 'Visibility for every snapshot (▶ Run)'),
        dry: { head: ['tuple', 'xmin → visible?', 'xmax → hides?', 'old_report', 'now'], rows: [['(0,1) Asha 500', '100 ✔', '105 committed ✔ hides', '-', '-'], ['(0,2) Ben 300', '100 ✔', '107 aborted ✗', 'visible', 'visible'], ['(0,3) Asha 400', '105 ✔', '110 running ✗', 'visible', 'visible'], ['(0,4) Chen', '108', '0', '- (108 ≥ 108)', 'visible'], ['(0,5) Asha 350', '110 running', '0', '-', '-']] },
        complexity: `<p>O(S × T) for the visible-set CTE plus O(S × tuples) probes. Real Postgres does this per tuple in C with hint bits and a binary search over xip.</p>`,
        followUps: ['Add "a transaction always sees its own writes" (current xid) to the rule.', 'Which tuples can VACUUM remove given both snapshots?']
      }
    }]
  });
  /* =====================================================================
     TOPIC 7 — Deadlocks
     ===================================================================== */
  var DL_SQL = `-- Build the wait-for graph (waiter -> holder) and find every cycle with a recursive CTE.
WITH RECURSIVE edges AS (
  SELECT DISTINCT w.txn AS waiter, h.txn AS holder
  FROM lock_waits w
  JOIN locks_held h ON h.resource = w.resource AND h.txn <> w.txn
  WHERE NOT (w.mode = 'S' AND h.mode = 'S')          -- only conflicting modes create a wait
),
walk(start, cur, path, depth) AS (
  SELECT waiter, holder, '/' || waiter || '/' || holder || '/', 1 FROM edges
  UNION ALL
  SELECT w.start, e.holder, w.path || e.holder || '/', w.depth + 1
  FROM walk w
  JOIN edges e ON e.waiter = w.cur
  WHERE w.cur <> w.start                               -- stop once we are back at the start
    AND w.depth < 20
    AND (e.holder = w.start OR instr(w.path, '/' || e.holder || '/') = 0)  -- no inner loops
)
SELECT path AS deadlock_cycle, depth AS length
FROM walk
WHERE cur = start
  AND start = (SELECT MIN(x) FROM (SELECT waiter AS x FROM edges)  -- report each cycle once,
               WHERE instr(path, '/' || x || '/') > 0);             -- from its smallest member`;
  var DLT = {
    deadlock: [
      { t1: 'BEGIN; UPDATE acct 1 (−100) → lock row 1', data: 'row1: T1', note: 'T1 = transfer 100 from account 1 to 2. It locks row 1 first.', vars: { 'row 1': 'T1', 'row 2': '-' } },
      { t2: 'BEGIN; UPDATE acct 2 (−50) → lock row 2', data: 'row1: T1, row2: T2', note: 'T2 = transfer 50 from account 2 to 1. It locks row 2 first — the <b>opposite order</b>.', vars: { 'row 1': 'T1', 'row 2': 'T2' } },
      { t1: 'UPDATE acct 2 (+100) → WAIT for T2', data: 'T1 → T2', note: 'T1 needs row 2, held by T2: T1 waits. Wait-for edge T1 → T2.', cls: 'cur', vars: { 'row 1': 'T1', 'row 2': 'T2', 'waits': 'T1→T2' }, vhl: { waits: 'cur' } },
      { t2: 'UPDATE acct 1 (+50) → WAIT for T1', data: 'T1 → T2 → T1', note: 'T2 needs row 1, held by T1: T2 waits. Edge T2 → T1. <span class="c-r">Cycle!</span> Neither can ever proceed: a <b>deadlock</b>.', cls: 'bad', vars: { 'row 1': 'T1', 'row 2': 'T2', 'waits': 'T1→T2→T1' }, vhl: { waits: 'bad' } },
      { t2: 'ERROR 40P01 deadlock detected → ROLLBACK', data: 'row1: T1', note: 'After <code>deadlock_timeout</code> (1 s default) Postgres runs its detector, finds the cycle and aborts one transaction (here T2). InnoDB detects immediately and kills the transaction that changed fewer rows.', cls: 'bad', vars: { 'row 1': 'T1', 'row 2': 'T1 (granted)', T2: 'aborted' }, vhl: { T2: 'bad' } },
      { t1: '…granted; COMMIT', t2: 'app retries T2 → succeeds', data: 'both done', note: 'T1 continues and commits. The app must <b>catch 40P01 and retry</b> T2. Deadlocks are not bugs in the database — they are a normal outcome of locking that applications must handle.', cls: 'ok', vars: { T1: 'committed', T2: 'retried ✔' }, vhl: { T1: 'ok', T2: 'ok' } }
    ],
    ordered: [
      { t1: 'BEGIN; lock rows {1,2} in id order: row 1', data: 'row1: T1', note: '<b>Prevention by ordering</b>: every transfer locks the <b>smaller account id first</b>, regardless of direction. T1 (1 → 2) locks row 1.', vars: { 'row 1': 'T1', 'row 2': '-' } },
      { t2: 'BEGIN; lock rows {1,2} in id order: row 1 → WAIT', data: 'T2 → T1', note: 'T2 (2 → 1) also starts with row 1 (smaller id), so it waits for T1 <b>before holding anything</b>.', cls: 'cur', vars: { 'row 1': 'T1', 'row 2': '-', waits: 'T2→T1' }, vhl: { waits: 'cur' } },
      { t1: 'lock row 2; debit 1; credit 2', data: 'row1, row2: T1', note: 'T1 takes row 2 freely — nobody holds it.', vars: { 'row 1': 'T1', 'row 2': 'T1', waits: 'T2→T1' } },
      { t1: 'COMMIT', data: 'row1: T2', note: 'T1 commits; T2 gets row 1.', cls: 'ok', vars: { 'row 1': 'T2', 'row 2': '-' } },
      { t2: 'lock row 2; debit 2; credit 1; COMMIT', data: 'done', note: 'T2 finishes. A wait, but never a cycle: with a global lock order, all wait-for edges point "up the order", and a cycle would need one pointing down.', cls: 'ok', vars: { T1: 'committed', T2: 'committed' }, vhl: { T1: 'ok', T2: 'ok' } },
      { t1: '—', t2: '—', data: 'no deadlock', note: 'In SQL: <code>SELECT … FROM accounts WHERE id IN (:a, :b) ORDER BY id FOR UPDATE</code> at the start of the transaction. Ordering is the #1 practical deadlock fix.', cls: 'ok', vars: { fix: 'lock in a global order' }, vhl: { fix: 'ok' } }
    ],
    waitdie: [
      { t1: 'ts=1 (older); lock row 1', data: 'row1: T1', note: '<b>Wait-die</b> (non-preemptive). Each transaction gets a start timestamp; smaller = older. T1 (ts 1) locks row 1.', vars: { T1: 'ts 1', T2: 'ts 2' } },
      { t2: 'ts=2 (younger); lock row 2', data: 'row1: T1, row2: T2', note: 'T2 (ts 2) locks row 2.', vars: { T1: 'ts 1, holds 1', T2: 'ts 2, holds 2' } },
      { t1: 'wants row 2 (held by younger T2) → WAIT', data: 'T1 → T2', note: 'Rule: an <b>older</b> requester may <b>wait</b> for a younger holder.', cls: 'cur', vars: { T1: 'waiting', T2: 'ts 2, holds 2' }, vhl: { T1: 'cur' } },
      { t2: 'wants row 1 (held by older T1) → DIES', data: 'T2 aborted', note: 'Rule: a <b>younger</b> requester that needs an older holder\'s lock <b>dies</b> (aborts itself). The cycle can never form, because edges only go old → young.', cls: 'bad', vars: { T1: 'waiting', T2: 'aborted' }, vhl: { T2: 'bad' } },
      { t1: 'gets row 2; COMMIT', t2: 'restarts with SAME ts=2', data: 'done', note: 'T2 restarts keeping its original timestamp, so it eventually becomes the oldest and cannot starve.', cls: 'ok', vars: { T1: 'committed', T2: 'restarted (ts 2)' }, vhl: { T1: 'ok' } }
    ],
    woundwait: [
      { t1: 'ts=1 (older); lock row 1', data: 'row1: T1', note: '<b>Wound-wait</b> (preemptive). T1 (ts 1) locks row 1.', vars: { T1: 'ts 1', T2: 'ts 2' } },
      { t2: 'ts=2 (younger); lock row 2', data: 'row1: T1, row2: T2', note: 'T2 (ts 2) locks row 2.', vars: { T1: 'ts 1, holds 1', T2: 'ts 2, holds 2' } },
      { t1: 'wants row 2 (held by younger T2) → WOUNDS T2', data: 'T2 aborted', note: 'Rule: an <b>older</b> requester <b>wounds</b> (aborts) the younger holder and takes the lock.', cls: 'bad', vars: { T1: 'holds 1, 2', T2: 'wounded → aborted' }, vhl: { T2: 'bad' } },
      { t1: 'COMMIT', t2: 'restarts (ts 2)', data: 'row1, row2 free', note: 'T1 commits. Had T2 instead asked for an older holder\'s lock, it would simply <b>wait</b> (young waits for old).', cls: 'ok', vars: { T1: 'committed', T2: 'restarting' }, vhl: { T1: 'ok' } },
      { t2: 'lock 2, lock 1, COMMIT', data: 'done', note: 'Wound-wait usually causes fewer restarts than wait-die. Google Spanner uses wound-wait for its read-write transactions.', cls: 'ok', vars: { T2: 'committed' }, vhl: { T2: 'ok' } }
    ]
  };
  topics.push({
    title: 'Deadlocks: Wait-For Graphs, Detection, Prevention & Retries',
    analogy: `<p>Two cars meet on a <b>narrow one-lane bridge</b> from opposite ends. Each has driven halfway; each waits for the other to reverse. Nobody moves — forever. Or: you hold the <b>ketchup</b> and want the <b>mustard</b>; your friend holds the mustard and wants the ketchup; both politely wait. A <b>deadlock</b> is a circle of waiting where everyone holds something another needs.</p>
<p>The database's solution is a referee who notices the circle and tells one person "you go back to the start" (abort one transaction).</p>`,
    explain: `<p>A deadlock needs four conditions at once (Coffman): <b>mutual exclusion</b> (locks are exclusive), <b>hold and wait</b> (you keep locks while waiting for more), <b>no preemption</b> (nobody can take your lock), and <b>circular wait</b>. Break any one and deadlocks cannot happen.</p>
<p><b>Wait-for graph:</b> one node per transaction, an arrow <b>T1 → T2</b> when T1 waits for a lock T2 holds. <b>Deadlock ⇔ the graph has a cycle.</b></p>
${H.table(['Strategy', 'How', 'Used by'], [
  ['Detection', 'periodically search the wait-for graph for cycles, abort a victim', 'PostgreSQL (after deadlock_timeout = 1 s), InnoDB (immediately), SQL Server (every 5 s, faster when frequent)'],
  ['Timeouts', 'give up after waiting N seconds', 'InnoDB <code>innodb_lock_wait_timeout</code> (50 s), Postgres <code>lock_timeout</code>'],
  ['Prevention: lock ordering', 'everyone locks resources in the same global order', 'your application code'],
  ['Prevention: wait-die / wound-wait', 'timestamps decide who waits and who aborts', 'distributed DBs (e.g. Spanner: wound-wait)'],
  ['Avoid holding', 'lock everything up front (conservative 2PL) or use one statement', 'batch jobs, atomic SQL']
])}
<p><b>Victim choice:</b> usually the transaction that is cheapest to roll back (InnoDB: fewest rows changed/locked; SQL Server: lowest <code>DEADLOCK_PRIORITY</code>, then cheapest). The victim gets an error — Postgres <code>40P01</code>, MySQL <code>1213 ER_LOCK_DEADLOCK</code>, SQL Server <code>1205</code> — and the application <b>must retry the whole transaction</b>.</p>
<p><b>Practical recipe:</b> (1) lock rows in a consistent order (sort ids); (2) keep transactions short; no network calls inside; (3) index foreign keys and WHERE columns so fewer rows/gaps get locked; (4) wrap transactions in a retry loop with backoff; (5) log and review deadlock reports.</p>`,
    clues: [
      '"two transfers in opposite directions hang / one fails with deadlock detected" → inconsistent lock order; sort by id',
      '"ERROR 40P01" / "1213 Deadlock found" / "error 1205" → victim chosen by the detector; retry the transaction',
      '"detect a cycle in who-waits-for-whom" → wait-for graph + DFS / recursive CTE',
      '"older transaction / timestamp / avoid deadlocks without detection" → wait-die or wound-wait',
      '"deadlock between INSERTs" in MySQL → gap / insert-intention locks under REPEATABLE READ; consider READ COMMITTED',
      '"lock wait timeout exceeded" → long-held lock, not necessarily a deadlock; find the blocker'
    ],
    code: [
      lk(DL_SQL, 'Deadlock detector: cycles in the wait-for graph (▶ Run)'),
      bank(`-- One statement that touches both rows: the engine locks them in its own scan order,
-- and there is no "hold one, wait for the other" gap between two statements.
UPDATE accounts
SET balance = balance + CASE id WHEN 1 THEN -100 WHEN 2 THEN 100 END
WHERE id IN (1, 2);
SELECT id, owner, balance FROM accounts WHERE id IN (1, 2);`, 'Transfer as one statement (▶ Run)'),
      pg(`-- Reproduce (two psql windows):
-- A: BEGIN; UPDATE accounts SET balance = balance - 100 WHERE id = 1;
-- B: BEGIN; UPDATE accounts SET balance = balance - 50  WHERE id = 2;
-- A: UPDATE accounts SET balance = balance + 100 WHERE id = 2;   -- waits
-- B: UPDATE accounts SET balance = balance + 50  WHERE id = 1;   -- ERROR: deadlock detected (40P01)

-- Fix: lock both rows in a global order first.
BEGIN;
SELECT id FROM accounts WHERE id IN ($from, $to) ORDER BY id FOR UPDATE;
UPDATE accounts SET balance = balance - $amt WHERE id = $from;
UPDATE accounts SET balance = balance + $amt WHERE id = $to;
COMMIT;`, 'Deadlock and the ordering fix (PostgreSQL)'),
      my(`-- MySQL: see the most recent deadlock with both transactions and their locks
SHOW ENGINE INNODB STATUS;          -- section "LATEST DETECTED DEADLOCK"
SET GLOBAL innodb_print_all_deadlocks = ON;   -- log every deadlock to the error log
-- PostgreSQL: log_lock_waits = on  (logs waits longer than deadlock_timeout)
-- SQL Server: system_health Extended Events session captures xml_deadlock_report`, 'Deadlock diagnostics (MySQL / others)'),
      { lang: 'python', code: `import random, time

class DeadlockError(Exception):
    """Stands in for SQLSTATE 40P01 / 40001 raised by the driver."""

attempts_log = []

def run_transaction(attempt):
    # Simulated work: first two attempts lose a deadlock, third succeeds.
    attempts_log.append(attempt)
    if attempt < 3:
        raise DeadlockError("deadlock detected")
    return "transfer committed"

def with_retry(fn, max_attempts=5, base=0.01):
    for attempt in range(1, max_attempts + 1):
        try:
            return fn(attempt)              # the WHOLE transaction: BEGIN ... COMMIT
        except DeadlockError as e:
            if attempt == max_attempts:
                raise
            sleep = base * (2 ** attempt) * random.uniform(0.5, 1.5)   # backoff + jitter
            print(f"attempt {attempt} failed ({e}); retrying in {sleep:.3f}s")
            time.sleep(sleep)

print(with_retry(run_transaction))
print("attempts:", attempts_log)`, run: true, title: 'Retry wrapper with exponential backoff (Python, ▶ Run)' }
    ],
    codeTitle: ['Cycle detection in SQL', 'Single-statement transfer', 'Ordering fix', 'Diagnostics', 'Retry wrapper'],
    viz: [{
      title: 'Lock wait-for graph simulator (finds the deadlock cycle)',
      input: 'T1: A B ; T2: B C ; T3: C A',
      inputLabel: 'transactions and the order they lock resources, separated by ;',
      gen: function (input) {
        var specs = String(input || '').split(';').map(function (s) { return s.trim(); }).filter(Boolean);
        if (specs.length < 2 || specs.length > 5) throw new Error('Give 2–5 transactions like "T1: A B ; T2: B A"');
        var txns = specs.map(function (s, i) {
          var m = s.split(':');
          if (m.length !== 2) throw new Error('Each transaction looks like "T1: A B"');
          var name = m[0].trim(), seq = m[1].trim().split(/\s+/).filter(Boolean);
          if (!name || !seq.length || seq.length > 6) throw new Error('Each transaction needs 1–6 resources');
          return { name: name.slice(0, 6), seq: seq.map(function (r) { return r.slice(0, 6); }), pos: 0, held: [], waitRes: null, waitHolder: null, state: 'active', idx: i };
        });
        var owner = {}, frames = [], n = txns.length;
        var nodes = txns.map(function (t, i) { var a = -Math.PI / 2 + 2 * Math.PI * i / n; return { id: t.name, label: t.name, x: Math.round(50 + 30 * Math.cos(a)), y: Math.round(30 + 22 * Math.sin(a)) }; });
        function byName(nm) { for (var i = 0; i < n; i++) if (txns[i].name === nm) return txns[i]; return null; }
        function edges() { var e = []; txns.forEach(function (t) { if (t.state === 'active' && t.waitRes && owner[t.waitRes] && owner[t.waitRes] !== t.name) e.push([t.name, owner[t.waitRes], t.waitRes]); }); return e; }
        function snap(narr, cycle, extraHl) {
          var e = edges(), ehl = {}, hl = {}, tags = {};
          txns.forEach(function (t) {
            hl[t.name] = t.state === 'committed' ? 'done' : t.state === 'aborted' ? 'bad' : t.waitRes ? 'cur' : 'ok';
            tags[t.name] = t.state === 'active' ? (t.held.length ? 'holds ' + t.held.join(',') : 'holds -') : t.state;
          });
          if (cycle) { cycle.forEach(function (nm, i) { ehl[nm + '-' + cycle[(i + 1) % cycle.length]] = 'bad'; hl[nm] = 'bad'; }); }
          if (extraHl) Object.keys(extraHl).forEach(function (k) { hl[k] = extraHl[k]; });
          var res = {}; txns.forEach(function (t) { t.seq.forEach(function (r) { res[r] = 1; }); });
          var rows = Object.keys(res).sort().map(function (r) {
            var w = txns.filter(function (t) { return t.state === 'active' && t.waitRes === r; }).map(function (t) { return t.name; });
            return [r, owner[r] || '-', w.join(', ') || '-'];
          });
          frames.push({ narr: narr, parts: [
            { type: 'graph', label: 'Wait-for graph (arrow = "waits for")', directed: true, height: 60, nodes: nodes, edges: e, ehl: ehl, hl: hl, tags: tags },
            { type: 'table', label: 'Lock table (exclusive locks)', columns: ['resource', 'held by', 'waiting'], rows: rows }
          ] });
        }
        function findCycle(start) {
          var path = [], cur = start, seen = {};
          while (cur && !seen[cur]) {
            seen[cur] = path.length; path.push(cur);
            var t = byName(cur);
            if (!t || t.state !== 'active' || !t.waitRes) return null;
            cur = owner[t.waitRes];
          }
          if (!cur) return null;
          return path.slice(seen[cur]);
        }
        snap('Each transaction will lock its resources in the listed order: ' + txns.map(function (t) { return '<b>' + t.name + '</b>: ' + t.seq.join(' → '); }).join('; ') + '. They take turns (round-robin), like threads on a server.');
        var guard = 0;
        while (txns.some(function (t) { return t.state === 'active'; }) && guard++ < 200 && frames.length < 60) {
          for (var i = 0; i < n && frames.length < 60; i++) {
            var t = txns[i];
            if (t.state !== 'active') continue;
            if (t.pos >= t.seq.length) {
              t.held.forEach(function (r) { delete owner[r]; });
              var rel = t.held.join(', ');
              t.held = []; t.state = 'committed'; t.waitRes = null;
              snap('<b>' + t.name + '</b> has everything it needs → <b>COMMIT</b>, releasing ' + (rel || 'nothing') + '. Anyone waiting on those can now proceed.');
              continue;
            }
            var r = t.seq[t.pos], h = owner[r];
            if (!h || h === t.name) {
              if (!h) { owner[r] = t.name; t.held.push(r); }
              var wasWaiting = !!t.waitRes;
              t.pos++; t.waitRes = null; t.waitHolder = null;
              snap('<b>' + t.name + '</b> ' + (wasWaiting ? 'was waiting; ' + r + ' is free now, so it is ' : 'asks for ' + r + ' — free, ') + '<span class="c-g">granted</span>. Holds: ' + t.held.join(', ') + '.');
            } else if (t.waitRes !== r || t.waitHolder !== h) {
              t.waitRes = r; t.waitHolder = h;
              var cyc = findCycle(t.name);
              snap('<b>' + t.name + '</b> asks for ' + r + ', held by <b>' + h + '</b> → it must <b>wait</b>. New edge ' + t.name + ' → ' + h + '.' + (cyc ? ' <span class="c-r">The edges now form a cycle: ' + cyc.concat([cyc[0]]).join(' → ') + '. DEADLOCK.</span>' : ' No cycle yet: ' + h + ' can still finish and release it.'), cyc);
              if (cyc) {
                var victim = cyc.map(byName).sort(function (a, b) { return b.idx - a.idx; })[0];
                victim.held.forEach(function (x) { delete owner[x]; });
                var freed = victim.held.join(', ');
                victim.held = []; victim.state = 'aborted'; victim.waitRes = null;
                snap('The deadlock detector picks a <b>victim</b>: ' + victim.name + ' (the youngest in the cycle). It is <span class="c-r">rolled back</span> (error 40P01 / 1213), releasing ' + (freed || 'nothing') + '. The app should retry it later. The cycle is broken.', null, (function () { var o = {}; o[victim.name] = 'bad'; return o; })());
              }
            }
          }
        }
        var ab = txns.filter(function (t) { return t.state === 'aborted'; }).map(function (t) { return t.name; });
        snap('Done. Committed: ' + txns.filter(function (t) { return t.state === 'committed'; }).map(function (t) { return t.name; }).join(', ') + '. ' + (ab.length ? 'Aborted (must retry): <b>' + ab.join(', ') + '</b>. Try reordering every transaction alphabetically (e.g. "T1: A B ; T2: A B") — the deadlock disappears.' : 'No deadlock happened — consistent lock order means every wait-for edge points the same way.'));
        return frames;
      }
    }, {
      title: 'Two transfers: deadlock, ordering, wait-die, wound-wait',
      input: 'deadlock',
      inputLabel: 'deadlock | ordered | waitdie | woundwait',
      gen: function (input) {
        var k = pick(input, ['deadlock', 'ordered', 'waitdie', 'woundwait'], 'deadlock');
        return timeline(DLT[k], { intro: 'T1 moves money 1 → 2, T2 moves money 2 → 1, at the same time. Strategy: <b>' + k + '</b>.', start: { 'row 1': '-', 'row 2': '-' }, varsLabel: 'Lock owners / status' });
      }
    }],
    examples: [
      { title: 'Read the cycle from a lock dump', html: `<p>The <code>locks</code> database: T1 holds accounts:1 and waits for accounts:2; T2 holds 2, waits for 3; T3 holds 3, waits for 1. Edges T1→T2→T3→T1: ${H.c('r', 'a 3-cycle')}. T6 waits (S) for accounts:1 too, but nobody waits for T6, so it is just ${H.c('y', 'blocked, not deadlocked')}. T4 waits for X on MUG while T5 also holds S on it → T4 waits for T5 (lock upgrade). Run the detector query to see exactly one cycle reported.</p>` },
      { title: 'The lock-upgrade deadlock', html: `<p>T1 and T2 both run <code>SELECT … FOR SHARE</code> (S lock) on the same row, then both try to <code>UPDATE</code> it (need X). Each waits for the other's S lock to go away → ${H.c('r', 'deadlock with a single row')}. Fix: take the strong lock up front (<code>FOR UPDATE</code>), or use one atomic UPDATE. SQL Server has a special <b>U (update) lock</b> mode for exactly this.</p>` },
      { title: 'Foreign keys and missing indexes', html: `<p>Deleting a parent row makes the database check child rows. If <code>order_items.order_id</code> has <b>no index</b>, the check scans and locks far more than needed (whole-table locks in some engines, many gap locks in InnoDB) and unrelated transactions start deadlocking. ${H.c('g', 'Index every foreign key column')} — it is a concurrency fix as much as a speed fix.</p>` },
      { title: 'Deadlock vs lock wait timeout vs livelock', html: `${H.table(['Symptom', 'What it is', 'Fix'], [['cycle, one aborted quickly', 'deadlock', 'lock ordering + retry'], ['one session waits 50 s then errors', 'lock wait timeout: a long transaction holds a lock', 'find blocker, shorten transactions'], ['transactions keep aborting and retrying forever', 'livelock / retry storm', 'backoff with jitter, cap retries, reduce contention']])}` }
    ],
    deepDive: `<p><b>Detection algorithms.</b> PostgreSQL does not check on every wait (expensive). A waiting backend sleeps <code>deadlock_timeout</code> (1 s) and only then runs the detector over the lock graph, including "soft" edges caused by lock-queue ordering; it may rearrange the wait queue instead of aborting when that resolves the cycle. InnoDB checks on every wait (depth-limited DFS; if the search is too deep it treats it as a deadlock). Under extreme concurrency the immediate check itself costs CPU, so InnoDB lets you disable it (<code>innodb_deadlock_detect = OFF</code>) and rely on <code>innodb_lock_wait_timeout</code>.</p>
<p><b>Why ordering prevents cycles.</b> Number all resources. If each transaction acquires in increasing order, a transaction waiting for resource r only holds resources &lt; r. Following a wait-for edge always goes to a holder of a <i>higher</i> resource; a cycle would need to return to a lower one — impossible. Real systems approximate this: sort ids before locking, always lock parent before child, always table A before table B.</p>
<p><b>Wait-die vs wound-wait.</b> Both use timestamps fixed at first start (so restarted transactions age and cannot starve). Wait-die: old waits for young, young dies → many restarts of young transactions that might retry repeatedly. Wound-wait: old preempts young, young waits for old → fewer restarts. Neither needs a global wait-for graph — important in <b>distributed databases</b> where building one across nodes is expensive.</p>
<p><b>InnoDB-specific deadlocks:</b> under REPEATABLE READ, two transactions inserting into the same gap can each hold a gap lock and wait for the other's insert-intention lock. Switching that workload to READ COMMITTED (gap locks mostly disabled) often removes them. Also, the order rows are locked follows the <b>index used</b> — two queries using different indexes on the same rows can lock in different orders.</p>`,
    aiEra: `<p><b>What AI changes:</b> a deadlock report from <code>SHOW ENGINE INNODB STATUS</code> or a Postgres log is dense; assistants are excellent at turning it into "T1 held X on index PRIMARY row 7 and wanted row 9; T2 the reverse; the code paths are probably <i>transfer()</i> and <i>refund()</i>". They also generate solid retry wrappers.</p>
<p><b>Use AI as a partner:</b> <code>Here is the deadlock report and the two code paths. Which lock order does each use, and what is the minimal change to make them consistent?</code> Ask for a load test that runs both paths in parallel 10,000 times to prove the fix.</p>
<p><b>Where AI goes wrong:</b> it suggests raising timeouts (hides the problem), adding <code>NOLOCK</code>, or retrying only the failed statement (the whole transaction was rolled back!). It may also recommend <code>SERIALIZABLE</code> as a deadlock fix — lock-based serializable usually creates <i>more</i> deadlocks.</p>
<p><b>What you must still own:</b> the global lock-ordering convention of your codebase, idempotent retries, and the habit of reading deadlock graphs yourself — in an incident at 3 a.m. you need to recognise the cycle in seconds.</p>`,
    problems: [{
      title: 'Write the Deadlock Detector',
      level: 'Hard', tags: ['deadlock', 'graph', 'recursive cte'], companies: ['Oracle', 'Google', 'Microsoft'],
      statement: `<p>The <code>locks</code> database has <code>locks_held(txn, resource, mode)</code> and <code>lock_waits(txn, resource, mode)</code>. A waiter is blocked by a holder of the same resource unless both modes are <code>S</code>. Write a SQL query that returns every <b>deadlock cycle</b> exactly once as a path string like <code>/T1/T2/T3/T1/</code>.</p>`,
      constraints: `<p>SQLite recursive CTE. Up to ~1000 transactions. Each cycle reported once (start from its smallest member).</p>`,
      example: `<p>Edges: T1→T2, T2→T3, T3→T1, T6→T1, T4→T5. Output: ${H.c('r', '/T1/T2/T3/T1/')} only. T6 and T4 are blocked but not in a cycle.</p>`,
      brute: { why: `<p>Listing direct "who blocks whom" pairs shows waits but not cycles; you would have to eyeball chains. A self-join for 2-cycles (<code>a→b AND b→a</code>) misses 3-cycles and longer.</p>`, code: lk(`-- Only finds 2-cycles (A waits B and B waits A). Misses T1 -> T2 -> T3 -> T1.
WITH edges AS (
  SELECT DISTINCT w.txn AS waiter, h.txn AS holder
  FROM lock_waits w JOIN locks_held h ON h.resource = w.resource AND h.txn <> w.txn
  WHERE NOT (w.mode = 'S' AND h.mode = 'S')
)
SELECT a.waiter, a.holder FROM edges a JOIN edges b ON a.waiter = b.holder AND a.holder = b.waiter;`, 'Naive 2-cycle self-join') },
      mcq: { q: 'In a wait-for graph, a deadlock corresponds to…', options: ['a directed cycle', 'a node with many incoming edges', 'a long path', 'a disconnected node'], answer: 0, explain: 'Every transaction on a cycle waits for the next one; none can proceed.' },
      hints: [
        `<p>Hint 1: Build the edges first (waiter → holder) from the two tables, ignoring S/S pairs.</p>`,
        `<p>Hint 2: A recursive CTE <code>walk(start, cur, path)</code> extends paths along edges; a cycle is found when <code>cur = start</code>.</p>`,
        `<p>Hint 3: Stop extending when back at start; forbid revisiting inner nodes with <code>instr(path, '/'||node||'/') = 0</code>; output each cycle once by requiring start = the smallest txn on the path.</p>`
      ],
      tests: { engine: 'sqlite', check: '(rows, cols, c) => {\n  if (c.plan || c.noplan) { const d = rows.map(r => r[r.length - 1]).join(\'\\n\'); return (!c.plan || new RegExp(c.plan).test(d)) && (!c.noplan || !new RegExp(c.noplan).test(d)); }\n  let a = rows, b = c.rows || [];\n  if (c.set) { const k = r => JSON.stringify(r); a = a.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); b = b.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); }\n  return a.length === b.length && a.every((r, i) => r.length === b[i].length && r.every((v, j) => v === b[i][j] || (typeof v === \'number\' && typeof b[i][j] === \'number\' && Math.abs(v - b[i][j]) < 1e-6)));\n}', cases: [
        { rows: [
            ['/T1/T2/T3/T1/', 3]
          ], set: true },
        { setup: 'DELETE FROM lock_waits', rows: [] },
        { setup: 'INSERT INTO locks_held VALUES (\'T7\',\'r7\',\'X\'),(\'T8\',\'r8\',\'X\');INSERT INTO lock_waits VALUES (\'T7\',\'r8\',\'X\',\'11:00:00\'),(\'T8\',\'r7\',\'X\',\'11:00:01\');', rows: [
            ['/T1/T2/T3/T1/', 3],
            ['/T7/T8/T7/', 2]
          ], set: true },
        { setup: 'INSERT INTO locks_held VALUES (\'T9\',\'r1\',\'X\'),(\'T10\',\'r2\',\'X\');INSERT INTO lock_waits VALUES (\'T9\',\'r2\',\'X\',\'11:00:00\'),(\'T10\',\'r1\',\'X\',\'11:00:01\');', rows: [
            ['/T1/T2/T3/T1/', 3],
            ['/T10/T9/T10/', 2]
          ], set: true },
        { setup: 'INSERT INTO lock_waits VALUES (\'T5\',\'products:MUG\',\'X\',\'11:00:00\');', rows: [
            ['/T1/T2/T3/T1/', 3],
            ['/T4/T5/T4/', 2]
          ], set: true },
        { setup: 'INSERT INTO locks_held VALUES (\'T9\',\'r9\',\'X\');INSERT INTO lock_waits VALUES (\'T9\',\'accounts:1\',\'X\',\'11:00:00\'),(\'T1\',\'r9\',\'X\',\'11:00:01\');', rows: [
            ['/T1/T2/T3/T1/', 3],
            ['/T1/T9/T1/', 2]
          ], set: true },
        { setup: 'INSERT INTO locks_held VALUES (\'T7\',\'r7\',\'S\'),(\'T8\',\'r8\',\'S\');INSERT INTO lock_waits VALUES (\'T7\',\'r8\',\'S\',\'11:00:00\'),(\'T8\',\'r7\',\'S\',\'11:00:01\');', rows: [
            ['/T1/T2/T3/T1/', 3]
          ], set: true },
        { setup: 'INSERT INTO locks_held VALUES (\'T7\',\'r7\',\'S\'),(\'T8\',\'r8\',\'X\');INSERT INTO lock_waits VALUES (\'T7\',\'r8\',\'S\',\'11:00:00\'),(\'T8\',\'r7\',\'X\',\'11:00:01\');', rows: [
            ['/T1/T2/T3/T1/', 3],
            ['/T7/T8/T7/', 2]
          ], set: true },
        { setup: 'INSERT INTO locks_held VALUES (\'T2\',\'r1\',\'X\');INSERT INTO lock_waits VALUES (\'T1\',\'r1\',\'S\',\'11:00:00\');', rows: [
            ['/T1/T2/T3/T1/', 3]
          ], set: true },
        { setup: 'DELETE FROM locks_held', rows: [] }
      ] },
      solution: {
        approach: `<p>Graph cycle detection in SQL: derive edges, walk paths with a recursive CTE carrying the visited path as a delimited string, detect return to the start, and de-duplicate rotations by keeping only the walk that starts at the cycle's smallest member.</p>`,
        code: lk(DL_SQL, 'Recursive-CTE deadlock detector (▶ Run)'),
        dry: { head: ['depth', 'start', 'cur', 'path'], rows: [['1', 'T1', 'T2', '/T1/T2/'], ['2', 'T1', 'T3', '/T1/T2/T3/'], ['3', 'T1', 'T1', '/T1/T2/T3/T1/ ← cycle'], ['1', 'T6', 'T1', '/T6/T1/ → walks T2, T3, then T1 already in path → stops']] },
        complexity: `<p>Paths are simple (no repeated inner nodes), so worst case is exponential in theory, but wait-for graphs have out-degree ≈ 1 (each txn waits for one lock), making it ~O(V × cycle length). Engines use DFS in C over the lock table.</p>`,
        followUps: ['Pick a victim per cycle: the transaction with the fewest locks held.', 'Why is out-degree usually 1 but can be more with shared locks?']
      }
    }]
  });
  /* =====================================================================
     PRACTICE — Easy
     ===================================================================== */
  practice.push({
    title: 'Name That Anomaly: the Loan That Was Wrongly Rejected',
    level: 'Easy', tags: ['dirty read', 'identify the anomaly'], companies: ['HDFC Bank', 'JPMorgan'],
    statement: `<p>Schedule: (1) T2: <code>UPDATE accounts SET balance = 100 WHERE id = 1</code> (not committed). (2) T1: <code>SELECT balance … id = 1</code> → 100, rejects a loan. (3) T2: <code>ROLLBACK</code>. Name the anomaly, the weakest isolation level that prevents it, and show what T1 should have read.</p>`,
    constraints: `<p>Bank database; Asha (id 1) has 500 committed.</p>`,
    example: `<p>T1 saw ${H.c('r', '100')} which never existed; the committed value was always ${H.c('g', '500')}.</p>`,
    brute: { why: `<p>Running reports with READ UNCOMMITTED / <code>NOLOCK</code> "for speed" lets T1 read T2's uncommitted change.</p>`, code: pg(`SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;   -- SQL Server / MySQL honour this (Postgres does not)
SELECT balance FROM accounts WHERE id = 1;            -- may return the uncommitted 100`, 'READ UNCOMMITTED') },
    mcq: { q: 'Reading another transaction\'s uncommitted change is called…', options: ['Dirty read', 'Phantom read', 'Write skew', 'Lost update'], answer: 0, explain: 'Dirty read (P1): seeing uncommitted data. Prevented by READ COMMITTED.' },
    hints: [`<p>Hint 1: Ask the first checklist question: did T1 read something that was <b>not committed</b> at that moment?</p>`, `<p>Hint 2: The weakest level that only shows committed data is READ COMMITTED.</p>`, `<p>Hint 3: Replay it: T2 begins, updates, rolls back; T1 reads after that (or from the last committed version) and sees 500.</p>`],
    tests: { engine: 'sqlite', check: '(rows, cols, c) => {\n  if (c.plan || c.noplan) { const d = rows.map(r => r[r.length - 1]).join(\'\\n\'); return (!c.plan || new RegExp(c.plan).test(d)) && (!c.noplan || !new RegExp(c.noplan).test(d)); }\n  let a = rows, b = c.rows || [];\n  if (c.set) { const k = r => JSON.stringify(r); a = a.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); b = b.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); }\n  return a.length === b.length && a.every((r, i) => r.length === b[i].length && r.every((v, j) => v === b[i][j] || (typeof v === \'number\' && typeof b[i][j] === \'number\' && Math.abs(v - b[i][j]) < 1e-6)));\n}', cases: [
      { rows: [
          [1, 'Asha', 500]
        ] },
      { setup: 'UPDATE accounts SET balance = 800 WHERE id = 1', rows: [
          [1, 'Asha', 800]
        ] },
      { setup: 'UPDATE accounts SET balance = 0 WHERE id = 1', rows: [
          [1, 'Asha', 0]
        ] },
      { setup: 'DELETE FROM accounts WHERE id = 1', after: 'SELECT count(*) FROM accounts WHERE id = 1', rows: [
          [0]
        ] },
      { after: 'SELECT id, balance, version FROM accounts ORDER BY id', rows: [
          [1, 500, 1],
          [2, 300, 1],
          [3, 1000, 1]
        ] },
      { after: 'SELECT count(*) FROM ledger', rows: [
          [0]
        ] },
      { setup: 'UPDATE accounts SET version = 9 WHERE id = 1', after: 'SELECT version FROM accounts WHERE id = 1', rows: [
          [9]
        ] },
      { after: 'BEGIN; COMMIT', rows: [] }
    ] },
    solution: {
      approach: `<p><b>Dirty read.</b> Prevented from READ COMMITTED upwards (the default in Postgres, Oracle, SQL Server; MySQL defaults to RR). Under MVCC T1 would read the last committed version (500) without waiting.</p>`,
      code: bank(`-- T2's work, then rollback: the committed value never changed.
BEGIN;
UPDATE accounts SET balance = 100 WHERE id = 1;
ROLLBACK;
-- What T1 reads under READ COMMITTED (only committed data):
SELECT id, owner, balance FROM accounts WHERE id = 1;    -- 500`, 'Replay (▶ Run)'),
      complexity: `<p>No extra cost at READ COMMITTED with MVCC; lock-based engines make T1 briefly wait for T2.</p>`,
      followUps: ['Why does Postgres treat READ UNCOMMITTED as READ COMMITTED?', 'What else can NOLOCK return besides dirty values?']
    }
  });
  practice.push({
    title: 'A Like Button That Never Loses a Like',
    level: 'Easy', tags: ['lost update', 'atomic update'], companies: ['Meta', 'Instagram', 'Reddit'],
    statement: `<p>The app reads <code>value</code> from <code>counters</code> for <code>'likes:post42'</code>, adds 1 in code, and writes it back. Under load, likes go missing. Fix it with SQL only.</p>`,
    constraints: `<p>Bank database, counter starts at 7. Thousands of concurrent likes.</p>`,
    example: `<p>Two likes at once: naive result ${H.c('r', '8')}; correct ${H.c('g', '9')}.</p>`,
    brute: { why: `<p>Read-modify-write in the app: both requests read 7 and both write 8 — a lost update.</p>`, code: bank(`SELECT value FROM counters WHERE name = 'likes:post42';         -- both read 7
UPDATE counters SET value = 8 WHERE name = 'likes:post42';      -- request A
UPDATE counters SET value = 8 WHERE name = 'likes:post42';      -- request B: A's like lost
SELECT value FROM counters WHERE name = 'likes:post42';`, 'Naive read-modify-write') },
    mcq: { q: 'Which statement is safe at READ COMMITTED?', options: ['UPDATE counters SET value = value + 1 WHERE name = ?', 'UPDATE counters SET value = :computed WHERE name = ?', 'SELECT value then INSERT', 'SELECT … FOR SHARE then UPDATE value = :computed'], answer: 0, explain: 'The increment is computed by the database on the latest row version while holding the row lock.' },
    hints: [`<p>Hint 1: The bug is that the "+1" happens outside the database using a stale number.</p>`, `<p>Hint 2: Let the UPDATE compute the new value from the current row: <code>value = value + 1</code>.</p>`, `<p>Hint 3: Two concurrent UPDATEs serialize on the row lock; the second re-reads the newest value after waiting.</p>`],
    tests: { engine: 'sqlite', check: '(rows, cols, c) => {\n  if (c.plan || c.noplan) { const d = rows.map(r => r[r.length - 1]).join(\'\\n\'); return (!c.plan || new RegExp(c.plan).test(d)) && (!c.noplan || !new RegExp(c.noplan).test(d)); }\n  let a = rows, b = c.rows || [];\n  if (c.set) { const k = r => JSON.stringify(r); a = a.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); b = b.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); }\n  return a.length === b.length && a.every((r, i) => r.length === b[i].length && r.every((v, j) => v === b[i][j] || (typeof v === \'number\' && typeof b[i][j] === \'number\' && Math.abs(v - b[i][j]) < 1e-6)));\n}', cases: [
      { rows: [
          ['likes:post42', 9]
        ] },
      { setup: 'UPDATE counters SET value = 0 WHERE name = \'likes:post42\'', rows: [
          ['likes:post42', 2]
        ] },
      { setup: 'UPDATE counters SET value = 2147483647 WHERE name = \'likes:post42\'', rows: [
          ['likes:post42', 2147483649]
        ] },
      { setup: 'UPDATE counters SET value = -5 WHERE name = \'likes:post42\'', rows: [
          ['likes:post42', -3]
        ] },
      { after: 'SELECT name, value FROM counters WHERE name = \'page_views\'', rows: [
          ['page_views', 41]
        ] },
      { setup: 'DELETE FROM counters WHERE name = \'likes:post42\'', rows: [] },
      { setup: 'INSERT INTO counters VALUES (\'likes:post43\', 100)', after: 'SELECT name, value FROM counters WHERE name = \'likes:post43\'', rows: [
          ['likes:post43', 100]
        ] },
      { after: 'SELECT count(*) FROM counters', rows: [
          [2]
        ] }
    ] },
    solution: {
      approach: `<p>Use an <b>atomic increment</b>. The row lock serializes concurrent likes and each UPDATE applies +1 to the newest committed version. For extremely hot counters, shard into N rows and SUM them, or buffer in Redis.</p>`,
      code: bank(`UPDATE counters SET value = value + 1 WHERE name = 'likes:post42';   -- request A
UPDATE counters SET value = value + 1 WHERE name = 'likes:post42';   -- request B
SELECT name, value FROM counters WHERE name = 'likes:post42';         -- 9`, 'Atomic increment (▶ Run)'),
      complexity: `<p>O(log N) per like; throughput on one row is bounded by lock hold time — shard the counter beyond a few thousand writes/sec.</p>`,
      followUps: ['Design a sharded counter with 16 rows.', 'How do you prevent the same user liking twice? (UNIQUE (user_id, post_id))']
    }
  });
  practice.push({
    title: 'Import Ledger Rows, Skip the Bad One',
    level: 'Easy', tags: ['savepoint', 'atomicity'], companies: ['Intuit', 'Xero'],
    statement: `<p>Import three ledger rows in <b>one</b> transaction: (1→2, 50), (2→3, 0), (3→1, 25). The middle row is invalid (amount must be &gt; 0). Keep the valid rows, drop the invalid one, and commit once.</p>`,
    constraints: `<p>SQLite bank database; <code>ledger.amount</code> has <code>CHECK (amount &gt; 0)</code>. The script must not error.</p>`,
    example: `<p>After the import: ${H.c('g', '2 ledger rows')} (50 and 25).</p>`,
    brute: { why: `<p>One big transaction aborts entirely on the bad row (lose the good rows); one transaction per row costs an fsync each and leaves a half-imported batch if the process dies.</p>`, code: bank(`-- One transaction per row (autocommit): slow at scale, and a crash leaves a partial import.
INSERT INTO ledger (from_id, to_id, amount, note) VALUES (1, 2, 50, 'row 1');
INSERT INTO ledger (from_id, to_id, amount, note) VALUES (3, 1, 25, 'row 3');
SELECT COUNT(*) FROM ledger;`, 'Autocommit per row') },
    mcq: { q: 'What does ROLLBACK TO SAVEPOINT s do?', options: ['Undoes work after s, keeps the transaction open', 'Ends the transaction', 'Undoes everything since BEGIN', 'Commits work before s'], answer: 0, explain: 'It rewinds to the bookmark; the outer transaction continues.' },
    hints: [`<p>Hint 1: Put a SAVEPOINT before each row so you can undo just that row.</p>`, `<p>Hint 2: To keep the demo error-free, guard the bad row: <code>INSERT … SELECT … WHERE amount &gt; 0</code>, or roll back to the savepoint when validation fails.</p>`, `<p>Hint 3: BEGIN → SAVEPOINT r1 → insert → RELEASE … → SAVEPOINT r2 → (invalid) ROLLBACK TO r2 → … → COMMIT.</p>`],
    tests: { engine: 'sqlite', check: '(rows, cols, c) => {\n  if (c.plan || c.noplan) { const d = rows.map(r => r[r.length - 1]).join(\'\\n\'); return (!c.plan || new RegExp(c.plan).test(d)) && (!c.noplan || !new RegExp(c.noplan).test(d)); }\n  let a = rows, b = c.rows || [];\n  if (c.set) { const k = r => JSON.stringify(r); a = a.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); b = b.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); }\n  return a.length === b.length && a.every((r, i) => r.length === b[i].length && r.every((v, j) => v === b[i][j] || (typeof v === \'number\' && typeof b[i][j] === \'number\' && Math.abs(v - b[i][j]) < 1e-6)));\n}', cases: [
      { rows: [
          [1, 1, 2, 50, 'row 1'],
          [2, 3, 1, 25, 'row 3']
        ] },
      { setup: 'INSERT INTO ledger VALUES (10,2,3,5,\'old\')', rows: [
          [10, 2, 3, 5, 'old'],
          [11, 1, 2, 50, 'row 1'],
          [12, 3, 1, 25, 'row 3']
        ] },
      { setup: 'INSERT INTO ledger VALUES (1,2,3,5,\'old\')', rows: [
          [1, 2, 3, 5, 'old'],
          [2, 1, 2, 50, 'row 1'],
          [3, 3, 1, 25, 'row 3']
        ] },
      { after: 'SELECT count(*), sum(amount) FROM ledger', rows: [
          [2, 75]
        ] },
      { after: 'SELECT count(*) FROM ledger WHERE amount <= 0', rows: [
          [0]
        ] },
      { setup: 'INSERT INTO ledger VALUES (500,2,3,5,\'old\')', after: 'SELECT max(id) FROM ledger', rows: [
          [502]
        ] },
      { after: 'INSERT INTO ledger (from_id, to_id, amount) VALUES (2, 3, 0)', error: 'CHECK' },
      { after: 'BEGIN; COMMIT', rows: [] }
    ] },
    solution: {
      approach: `<p>One transaction, one savepoint per row. When a row fails validation (in the app: when the INSERT raises), <code>ROLLBACK TO</code> its savepoint, log it, continue. A single COMMIT at the end — one fsync, all-or-nothing for the batch as a whole.</p>`,
      code: bank(`BEGIN;
SAVEPOINT r1;
INSERT INTO ledger (from_id, to_id, amount, note) VALUES (1, 2, 50, 'row 1');
RELEASE r1;
SAVEPOINT r2;
-- row 2 failed validation in the app (amount 0) -> undo just this row
ROLLBACK TO r2;
RELEASE r2;
SAVEPOINT r3;
INSERT INTO ledger (from_id, to_id, amount, note) VALUES (3, 1, 25, 'row 3');
RELEASE r3;
COMMIT;
SELECT id, from_id, to_id, amount, note FROM ledger ORDER BY id;`, 'Savepoint per row (▶ Run)'),
      complexity: `<p>One fsync for the whole batch; savepoints are cheap (Postgres: subtransactions — avoid thousands of them alive at once, they have overhead).</p>`,
      followUps: ['Why can too many subtransactions slow Postgres down?', 'How would you report the rejected rows back to the user?']
    }
  });
  practice.push({
    title: 'Load 1,000 Rows in One Transaction',
    level: 'Easy', tags: ['durability', 'fsync', 'batching'], companies: ['Atlassian', 'Datadog'],
    statement: `<p>A script inserts 1,000 ledger rows with autocommit and takes forever on a real disk. Rewrite it so all rows go in with <b>one</b> commit, generating the rows in SQL.</p>`,
    constraints: `<p>SQLite. Amounts 1..1000, every row from account 1 to account 2.</p>`,
    example: `<p>Result: ${H.c('g', '1000 rows, SUM(amount) = 500500')}, one fsync.</p>`,
    brute: { why: `<p>Each autocommitted INSERT waits for its own fsync (≈ms each) → 1,000 fsyncs. Same data, 100–1000× slower.</p>`, code: bank(`INSERT INTO ledger (from_id, to_id, amount, note) VALUES (1, 2, 1, 'auto');
INSERT INTO ledger (from_id, to_id, amount, note) VALUES (1, 2, 2, 'auto');
INSERT INTO ledger (from_id, to_id, amount, note) VALUES (1, 2, 3, 'auto');
SELECT COUNT(*) FROM ledger;   -- imagine 1000 of these, each its own transaction`, 'Autocommit per INSERT') },
    mcq: { q: 'Why is one transaction faster than 1,000 autocommits?', options: ['Only one COMMIT has to wait for fsync of the log', 'Transactions skip constraints', 'Indexes are disabled inside transactions', 'Rows are not written to disk'], answer: 0, explain: 'Durability costs one log flush per commit; batching amortises it.' },
    hints: [`<p>Hint 1: The cost is per COMMIT, not per row.</p>`, `<p>Hint 2: Wrap everything in BEGIN … COMMIT; generate rows with a recursive CTE <code>WITH RECURSIVE n(i) AS (…)</code>.</p>`, `<p>Hint 3: <code>INSERT INTO ledger (…) SELECT 1, 2, i, 'bulk' FROM n;</code> — one statement, one transaction.</p>`],
    tests: { engine: 'sqlite', check: '(rows, cols, c) => {\n  if (c.plan || c.noplan) { const d = rows.map(r => r[r.length - 1]).join(\'\\n\'); return (!c.plan || new RegExp(c.plan).test(d)) && (!c.noplan || !new RegExp(c.noplan).test(d)); }\n  let a = rows, b = c.rows || [];\n  if (c.set) { const k = r => JSON.stringify(r); a = a.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); b = b.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); }\n  return a.length === b.length && a.every((r, i) => r.length === b[i].length && r.every((v, j) => v === b[i][j] || (typeof v === \'number\' && typeof b[i][j] === \'number\' && Math.abs(v - b[i][j]) < 1e-6)));\n}', cases: [
      { rows: [
          [1000, 500500]
        ] },
      { setup: 'INSERT INTO ledger VALUES (5000,3,1,1,\'old\'),(5001,3,1,2,\'old\'),(5002,3,1,3,\'old\')', rows: [
          [1003, 500506]
        ] },
      { after: 'SELECT min(amount), max(amount), count(DISTINCT amount) FROM ledger', rows: [
          [1, 1000, 1000]
        ] },
      { after: 'SELECT count(*) FROM ledger WHERE from_id = 1 AND to_id = 2 AND note = \'bulk\'', rows: [
          [1000]
        ] },
      { after: 'SELECT count(*) FROM ledger WHERE amount % 2 = 0', rows: [
          [500]
        ] },
      { setup: 'INSERT INTO ledger VALUES (1,3,1,10,\'old\')', after: 'SELECT id FROM ledger ORDER BY id DESC LIMIT 1', rows: [
          [1001]
        ] },
      { after: 'BEGIN; COMMIT', rows: [] }
    ] },
    solution: {
      approach: `<p>Batch the inserts in one transaction (and here, one statement). For millions of rows, commit in chunks of 10k–100k to bound transaction size and lock/undo growth.</p>`,
      code: bank(`BEGIN;
WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM n WHERE i < 1000)
INSERT INTO ledger (from_id, to_id, amount, note)
SELECT 1, 2, i, 'bulk' FROM n;
COMMIT;
SELECT COUNT(*) AS rows_loaded, SUM(amount) AS total FROM ledger;`, 'One transaction (▶ Run)'),
      complexity: `<p>O(N log N) index work, one log flush. Postgres <code>COPY</code> / MySQL <code>LOAD DATA</code> are faster still.</p>`,
      followUps: ['Why not load 500M rows in a single transaction?', 'What does synchronous_commit = off change?']
    }
  });
  /* =====================================================================
     PRACTICE — Medium
     ===================================================================== */
  practice.push({
    title: 'Wiki Edits Without Overwriting Each Other',
    level: 'Medium', tags: ['optimistic locking', 'version column', 'lost update'], companies: ['Atlassian', 'Notion', 'Wikipedia'],
    statement: `<p>Two editors open the same page (version 1), edit for minutes, then save. Today the second save silently erases the first. Implement <b>optimistic concurrency control</b>: a save succeeds only if the page is still at the version the editor loaded; otherwise report a conflict.</p>`,
    constraints: `<p>No locks may be held while the user is typing. SQLite for practice; same SQL in Postgres/MySQL.</p>`,
    example: `<p>Asha saves first → ${H.c('g', 'version 2')}. Ben saves with version 1 → ${H.c('r', '0 rows: conflict')}, he is shown a merge screen.</p>`,
    brute: { why: `<p>Plain <code>UPDATE pages SET body = :b WHERE id = 1</code> is last-writer-wins. A pessimistic <code>FOR UPDATE</code> would hold a lock (and a DB connection) for the whole editing session — minutes — blocking everyone.</p>`, code: bank(`CREATE TABLE pages (id INTEGER PRIMARY KEY, body TEXT, version INTEGER NOT NULL);
INSERT INTO pages VALUES (1, 'Hello', 1);
UPDATE pages SET body = 'Hello from Asha' WHERE id = 1;
UPDATE pages SET body = 'Hello from Ben' WHERE id = 1;    -- Asha's edit gone
SELECT * FROM pages;`, 'Last writer wins') },
    mcq: { q: 'An optimistic UPDATE … WHERE version = 1 affects 0 rows. What happened?', options: ['Someone saved first; reload, merge and retry', 'The row was locked', 'The database crashed', 'The transaction is still running'], answer: 0, explain: 'Version moved on: a concurrent writer won. Re-read and retry or ask the user to merge.' },
    hints: [`<p>Hint 1: Store a <code>version</code> integer that increases on every successful save.</p>`, `<p>Hint 2: Save with <code>UPDATE … SET body = :new, version = version + 1 WHERE id = :id AND version = :loaded</code>.</p>`, `<p>Hint 3: Check rows affected (<code>changes()</code> in SQLite): 1 = saved, 0 = conflict.</p>`],
    tests: { engine: 'sqlite', check: '(rows, cols, c) => {\n  if (c.plan || c.noplan) { const d = rows.map(r => r[r.length - 1]).join(\'\\n\'); return (!c.plan || new RegExp(c.plan).test(d)) && (!c.noplan || !new RegExp(c.noplan).test(d)); }\n  let a = rows, b = c.rows || [];\n  if (c.set) { const k = r => JSON.stringify(r); a = a.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); b = b.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); }\n  return a.length === b.length && a.every((r, i) => r.length === b[i].length && r.every((v, j) => v === b[i][j] || (typeof v === \'number\' && typeof b[i][j] === \'number\' && Math.abs(v - b[i][j]) < 1e-6)));\n}', cases: [
      { rows: [
          [1, 'Hello from Asha', 2]
        ] },
      { after: 'UPDATE pages SET body = \'Hello from Ben\', version = version + 1 WHERE id = 1 AND version = 1; SELECT changes()', rows: [
          [0]
        ] },
      { after: 'UPDATE pages SET body = \'Hello from Ben\', version = version + 1 WHERE id = 1 AND version = 2; SELECT changes(), version FROM pages', rows: [
          [1, 3]
        ] },
      { after: 'UPDATE pages SET body = \'Hello from Ben\', version = version + 1 WHERE id = 1 AND version = 2; UPDATE pages SET body = \'Hello from Cy\', version = version + 1 WHERE id = 1 AND version = 2; SELECT body, version FROM pages', rows: [
          ['Hello from Ben', 3]
        ] },
      { after: 'UPDATE pages SET body = \'Hello from Ben\', version = version + 1 WHERE id = 1 AND version = 2; UPDATE pages SET body = \'Hello from Cy\', version = version + 1 WHERE id = 1 AND version = 3; SELECT body, version FROM pages', rows: [
          ['Hello from Cy', 4]
        ] },
      { after: 'UPDATE pages SET body = \'x\', version = version + 1 WHERE id = 9 AND version = 1; SELECT changes()', rows: [
          [0]
        ] },
      { after: 'SELECT count(*) FROM pages', rows: [
          [1]
        ] },
      { after: 'INSERT INTO pages VALUES (1, \'dup\', 1)', error: 'UNIQUE|PRIMARY' },
      { after: 'UPDATE pages SET body = \'bare\' WHERE id = 1; SELECT version FROM pages', rows: [
          [2]
        ] }
    ] },
    solution: {
      approach: `<p>Compare-and-set on a version column. Nothing is locked during think-time; conflicts are detected at save. Same idea as HTTP <code>ETag</code> + <code>If-Match</code> (412 Precondition Failed) and JPA <code>@Version</code>.</p>`,
      code: bank(`CREATE TABLE pages (id INTEGER PRIMARY KEY, body TEXT NOT NULL, version INTEGER NOT NULL);
INSERT INTO pages VALUES (1, 'Hello', 1);
-- Both editors loaded version 1.
UPDATE pages SET body = 'Hello from Asha', version = version + 1 WHERE id = 1 AND version = 1;
SELECT 'Asha' AS editor, changes() AS saved;      -- 1
UPDATE pages SET body = 'Hello from Ben', version = version + 1 WHERE id = 1 AND version = 1;
SELECT 'Ben' AS editor, changes() AS saved;       -- 0 -> conflict
SELECT * FROM pages;                               -- Asha's text, version 2`, 'Optimistic save (▶ Run)'),
      complexity: `<p>One indexed UPDATE per save; zero lock waits during editing. Under high contention, retries waste work.</p>`,
      followUps: ['Could you use updated_at instead of version? What can go wrong?', 'How would the REST API expose this?']
    }
  });
  practice.push({
    title: 'Workshop Has 3 Seats: Stop the 4th Signup',
    level: 'Medium', tags: ['phantom', 'write skew', 'materialize conflict'], companies: ['Eventbrite', 'BookMyShow', 'Meetup'],
    statement: `<p>Signup code does <code>SELECT COUNT(*) FROM signups WHERE event_id = 1</code>, and if &lt; capacity, inserts. Under load, events end up overbooked. Make signups safe so seats are never exceeded.</p>`,
    constraints: `<p>Bank DB: event 1 capacity 3, 2 seats taken (Asha, Ben). Chen and Dara sign up at once. Must work under READ COMMITTED.</p>`,
    example: `<p>${H.c('g', 'Chen gets the last seat')}; ${H.c('r', 'Dara is told it is full')}. Naive code lets both in (4/3).</p>`,
    brute: { why: `<p>COUNT then INSERT is phantom-style write skew: both see 2 &lt; 3 and insert new rows; there is no existing row to conflict on, so row locks and snapshot isolation do not help.</p>`, code: bank(`SELECT COUNT(*) FROM signups WHERE event_id = 1;            -- both see 2
INSERT INTO signups VALUES (1, 'Chen');
INSERT INTO signups VALUES (1, 'Dara');                      -- 4 people, 3 seats
SELECT COUNT(*) FROM signups WHERE event_id = 1;`, 'Count then insert') },
    mcq: { q: 'Why doesn\'t SELECT COUNT(*) … FOR UPDATE fix this in PostgreSQL?', options: ['FOR UPDATE locks existing rows, not rows that are about to be inserted', 'FOR UPDATE is not allowed with WHERE', 'It locks the whole database', 'It makes COUNT return 0'], answer: 0, explain: 'The conflict is about a new row (a phantom). FOR UPDATE can only lock rows that exist (and PostgreSQL rejects it outright combined with COUNT). Lock a row that already exists — the event row — or use SERIALIZABLE.' },
    hints: [`<p>Hint 1: Find an existing row both transactions must touch: the <b>event</b> row.</p>`, `<p>Hint 2: Keep a <code>seats_taken</code> counter on <code>events</code> with <code>CHECK (seats_taken &lt;= capacity)</code> and increment it conditionally.</p>`, `<p>Hint 3: In one transaction: <code>UPDATE events SET seats_taken = seats_taken + 1 WHERE id = 1 AND seats_taken &lt; capacity</code>; insert the signup only if 1 row changed.</p>`],
    tests: { engine: 'sqlite', check: '(rows, cols, c) => {\n  if (c.plan || c.noplan) { const d = rows.map(r => r[r.length - 1]).join(\'\\n\'); return (!c.plan || new RegExp(c.plan).test(d)) && (!c.noplan || !new RegExp(c.noplan).test(d)); }\n  let a = rows, b = c.rows || [];\n  if (c.set) { const k = r => JSON.stringify(r); a = a.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); b = b.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); }\n  return a.length === b.length && a.every((r, i) => r.length === b[i].length && r.every((v, j) => v === b[i][j] || (typeof v === \'number\' && typeof b[i][j] === \'number\' && Math.abs(v - b[i][j]) < 1e-6)));\n}', cases: [
      { rows: [
          ['Asha'],
          ['Ben'],
          ['Chen']
        ] },
      { after: 'SELECT name, capacity, seats_taken FROM events', rows: [
          ['SQL Workshop', 3, 3]
        ] },
      { setup: 'UPDATE events SET capacity = 2 WHERE id = 1', rows: [
          ['Asha'],
          ['Ben']
        ] },
      { setup: 'UPDATE events SET capacity = 2 WHERE id = 1', after: 'SELECT name, capacity, seats_taken FROM events', rows: [
          ['SQL Workshop', 2, 2]
        ] },
      { setup: 'UPDATE events SET capacity = 4 WHERE id = 1', rows: [
          ['Asha'],
          ['Ben'],
          ['Chen'],
          ['Dara']
        ] },
      { setup: 'UPDATE events SET capacity = 4 WHERE id = 1', after: 'SELECT name, capacity, seats_taken FROM events', rows: [
          ['SQL Workshop', 4, 4]
        ] },
      { setup: 'DELETE FROM signups; UPDATE events SET seats_taken = 0', rows: [
          ['Chen'],
          ['Dara']
        ] },
      { setup: 'DELETE FROM signups; UPDATE events SET seats_taken = 2, capacity = 2', after: 'SELECT count(*) FROM signups', rows: [
          [0]
        ] },
      { setup: 'INSERT INTO signups VALUES (1, \'Chen\')', error: 'UNIQUE|PRIMARY' },
      { setup: 'UPDATE events SET capacity = 3, seats_taken = 0; DELETE FROM signups WHERE person = \'Ben\'', rows: [
          ['Asha'],
          ['Chen'],
          ['Dara']
        ] }
    ] },
    solution: {
      approach: `<p><b>Materialize the conflict</b> on the parent row: the conditional UPDATE of <code>events</code> serializes all signups for that event (row lock) and re-checks capacity on the latest version. The signup INSERT happens only if the seat was granted. Alternatives: <code>SELECT … FROM events WHERE id = 1 FOR UPDATE</code> then count, or SERIALIZABLE + retry.</p>`,
      code: bank(`-- Chen
BEGIN;
UPDATE events SET seats_taken = seats_taken + 1 WHERE id = 1 AND seats_taken < capacity;
INSERT INTO signups (event_id, person) SELECT 1, 'Chen' WHERE changes() = 1;
COMMIT;
-- Dara
BEGIN;
UPDATE events SET seats_taken = seats_taken + 1 WHERE id = 1 AND seats_taken < capacity;
INSERT INTO signups (event_id, person) SELECT 1, 'Dara' WHERE changes() = 1;
COMMIT;
SELECT name, capacity, seats_taken FROM events;
SELECT person FROM signups WHERE event_id = 1 ORDER BY person;   -- Asha, Ben, Chen`, 'Parent-row counter (▶ Run)'),
      alt: [pg(`BEGIN;
SELECT capacity FROM events WHERE id = $1 FOR UPDATE;   -- serialize signups per event
SELECT COUNT(*) FROM signups WHERE event_id = $1;       -- now safe to count
-- app: if count < capacity
INSERT INTO signups (event_id, person) VALUES ($1, $2);
COMMIT;`, 'Lock the parent row (PostgreSQL)')],
      complexity: `<p>O(log N) per signup; all signups for one event serialize on one row — fine for thousands/sec, shard seats for mega-events.</p>`,
      followUps: ['How do cancellations decrement safely?', 'What if each event has 50,000 seats and 1M fans in a minute?']
    }
  });
  practice.push({
    title: 'Opposite-Direction Transfers Keep Deadlocking',
    level: 'Medium', tags: ['deadlock', 'lock ordering'], companies: ['Visa', 'Stripe', 'Paytm'],
    statement: `<p>Transfer code runs <code>UPDATE … WHERE id = :from</code> then <code>UPDATE … WHERE id = :to</code>. Transfers 1→2 and 2→1 at the same time produce <code>deadlock detected</code>. Fix it so they can never deadlock.</p>`,
    constraints: `<p>PostgreSQL READ COMMITTED in production; practise on SQLite.</p>`,
    example: `<p>T1 locks row 1 then wants row 2; T2 locks row 2 then wants row 1 → ${H.c('r', 'cycle')}. With ordering both start at row 1 → ${H.c('g', 'one waits, no cycle')}.</p>`,
    brute: { why: `<p>Lock order depends on transfer direction, so two opposite transfers hold one row each and wait for the other. Raising timeouts or retrying more just hides it.</p>`, code: pg(`BEGIN;
UPDATE accounts SET balance = balance - $amt WHERE id = $from;   -- order depends on direction
UPDATE accounts SET balance = balance + $amt WHERE id = $to;
COMMIT;`, 'Direction-dependent order') },
    mcq: { q: 'Which change guarantees no deadlock between any two transfers?', options: ['Lock both rows in ascending id order before updating', 'Use READ UNCOMMITTED', 'Add an index on balance', 'Increase deadlock_timeout'], answer: 0, explain: 'A global lock order makes wait-for cycles impossible.' },
    hints: [`<p>Hint 1: A deadlock needs a cycle; a cycle needs two transactions to lock the same rows in different orders.</p>`, `<p>Hint 2: Make the order independent of direction: always lock <code>min(from, to)</code> first.</p>`, `<p>Hint 3: <code>SELECT id FROM accounts WHERE id IN (:from, :to) ORDER BY id FOR UPDATE</code>, then both UPDATEs; or one UPDATE touching both rows with CASE.</p>`],
    tests: { skip: 'a deadlock needs two concurrent sessions locking rows in opposite orders, and the PostgreSQL transaction uses application placeholders ($from, $to, $amt); one script cannot show the cycle disappearing' },
    solution: {
      approach: `<p>Impose a <b>global lock order</b>: lock both rows sorted by id at the start of the transaction. Alternatively do the transfer as one statement (one lock acquisition sequence chosen by the engine). Keep a retry wrapper for 40P01 anyway — other code paths may still deadlock.</p>`,
      code: pg(`BEGIN;
SELECT id FROM accounts WHERE id IN ($from, $to) ORDER BY id FOR UPDATE;   -- always low id first
UPDATE accounts SET balance = balance - $amt WHERE id = $from AND balance >= $amt;   -- 0 rows = insufficient funds: the app must ROLLBACK here
UPDATE accounts SET balance = balance + $amt WHERE id = $to;
COMMIT;`, 'Ordered locking (PostgreSQL)'),
      alt: [bank(`-- Same transfer as ONE statement (atomic, single lock sequence).
UPDATE accounts SET balance = balance + CASE id WHEN 2 THEN -50 WHEN 1 THEN 50 END
WHERE id IN (1, 2);
SELECT id, balance FROM accounts WHERE id IN (1, 2);`, 'Single statement (▶ Run)')],
      complexity: `<p>Two row locks per transfer, acquired in O(log N) each; waits remain possible but cycles do not.</p>`,
      followUps: ['Does ORDER BY id FOR UPDATE guarantee lock order in every engine?', 'How do you order locks across different tables?']
    }
  });
  practice.push({
    title: 'MySQL Lost Update Under REPEATABLE READ',
    level: 'Medium', tags: ['mysql', 'innodb', 'lost update', 'for update'], companies: ['Booking.com', 'Shopify', 'GitHub'],
    statement: `<p>A MySQL service at REPEATABLE READ does: <code>SELECT stock FROM products WHERE sku='MUG'</code> (10), computes 10 − 3 in Java, then <code>UPDATE products SET stock = 7</code>. A teammate says "RR prevents lost updates". Show why that is wrong for InnoDB and fix it two ways.</p>`,
    constraints: `<p>MySQL 8 InnoDB, default isolation. Contention moderate.</p>`,
    example: `<p>Two orders of 3 at once: final stock ${H.c('r', '7')} instead of ${H.c('g', '4')}.</p>`,
    brute: { why: `<p>InnoDB plain SELECT reads the snapshot; UPDATE writes a value computed from that stale read. InnoDB has no "first-updater-wins" check, so the second UPDATE simply overwrites — no error.</p>`, code: my(`START TRANSACTION;                              -- REPEATABLE READ
SELECT stock FROM products WHERE sku = 'MUG';   -- 10 (snapshot)
-- other session commits stock = 7 here
UPDATE products SET stock = 7 WHERE sku = 'MUG';  -- computed 10 - 3 from the stale read
COMMIT;                                          -- final 7, one order lost`, 'Stale read, blind write') },
    mcq: { q: 'Which InnoDB read sees the latest committed row and locks it?', options: ['SELECT … FOR UPDATE', 'Plain SELECT in REPEATABLE READ', 'SELECT … LOCK IN SHARE MODE on a snapshot', 'SELECT SQL_NO_CACHE'], answer: 0, explain: 'Locking reads are "current reads": newest committed version plus an X lock.' },
    hints: [`<p>Hint 1: In InnoDB RR, plain reads use the snapshot, but writes and locking reads use the <b>current</b> row.</p>`, `<p>Hint 2: Fix A: compute in SQL — <code>SET stock = stock - 3 WHERE stock &gt;= 3</code>.</p>`, `<p>Hint 3: Fix B: <code>SELECT … FOR UPDATE</code> so the read is current and locked until commit.</p>`],
    tests: { engine: 'postgres', db: 'bank', cmp: 'exact', cases: [
      { after: 'SELECT sku, stock, version FROM products WHERE sku = \'MUG\'', rows: [
          ['MUG', 7, 1]
        ] },
      { setup: 'UPDATE products SET stock = 3 WHERE sku = \'MUG\'', after: 'SELECT sku, stock, version FROM products WHERE sku = \'MUG\'', rows: [
          ['MUG', 7, 1]
        ] },
      { setup: 'UPDATE products SET stock = 20 WHERE sku = \'MUG\'', after: 'SELECT sku, stock, version FROM products WHERE sku = \'MUG\'', rows: [
          ['MUG', 7, 1]
        ] },
      { after: 'SELECT sku, stock FROM products WHERE sku = \'TSHIRT\'', rows: [
          ['TSHIRT', 3]
        ] },
      { after: 'SELECT count(*) FROM products', rows: [
          [2]
        ] },
      { setup: 'UPDATE products SET version = 4 WHERE sku = \'MUG\'', after: 'SELECT version FROM products WHERE sku = \'MUG\'', rows: [
          [4]
        ] },
      { after: 'SELECT count(*) FROM orders', rows: [
          [0]
        ] }
    ] },
    solution: {
      approach: `<p>Snapshot reads + blind writes = lost update in InnoDB RR. Fix with an <b>atomic conditional UPDATE</b> (preferred) or a <b>locking read</b> (<code>FOR UPDATE</code>) before computing in the app. Optimistic version columns also work.</p>`,
      code: my(`-- Fix A: atomic
UPDATE products SET stock = stock - 3 WHERE sku = 'MUG' AND stock >= 3;   -- check ROW_COUNT() = 1

-- Fix B: pessimistic
START TRANSACTION;
SELECT stock FROM products WHERE sku = 'MUG' FOR UPDATE;   -- current read + X lock
UPDATE products SET stock = 7 WHERE sku = 'MUG';           -- value computed from the locked read
COMMIT;`, 'Two fixes (MySQL)'),
      alt: [bank(`UPDATE products SET stock = stock - 3 WHERE sku = 'MUG' AND stock >= 3;
UPDATE products SET stock = stock - 3 WHERE sku = 'MUG' AND stock >= 3;
SELECT sku, stock FROM products WHERE sku = 'MUG';    -- 4`, 'Atomic version (▶ Run in SQLite)')],
      complexity: `<p>O(log N); Fix B holds the row lock for the app's compute time — keep it tiny.</p>`,
      followUps: ['What does Postgres REPEATABLE READ do in the same schedule?', 'Why can an InnoDB RR transaction "see" a row after updating it that its snapshot did not contain?']
    }
  });
  practice.push({
    title: 'Never Charge the Card Twice',
    level: 'Medium', tags: ['idempotency', 'unique constraint', 'retries'], companies: ['Stripe', 'Adyen', 'Uber'],
    statement: `<p>The mobile app retries a payment request when the network times out. Sometimes the first attempt <i>did</i> commit, so the customer is charged twice. Each request carries an <code>Idempotency-Key</code>. Make the payment insert exactly-once using the database.</p>`,
    constraints: `<p>SQLite for practice; concurrent retries may arrive at the same moment on different servers.</p>`,
    example: `<p>Two requests with key <code>k-123</code>: ${H.c('g', 'one payment row')}; the second returns the stored result.</p>`,
    brute: { why: `<p>"SELECT by key, INSERT if missing" is check-then-act: two concurrent retries both see nothing and both insert → double charge (phantom write skew).</p>`, code: bank(`CREATE TABLE payments (id INTEGER PRIMARY KEY, idem_key TEXT, amount INTEGER);
-- both retries: SELECT ... WHERE idem_key = 'k-123' -> none, then:
INSERT INTO payments (idem_key, amount) VALUES ('k-123', 499);
INSERT INTO payments (idem_key, amount) VALUES ('k-123', 499);
SELECT COUNT(*) AS charges FROM payments;   -- 2`, 'Check-then-insert') },
    mcq: { q: 'What makes concurrent duplicates impossible?', options: ['A UNIQUE constraint on idem_key, with insert-or-ignore / ON CONFLICT', 'A SELECT before the INSERT', 'Retrying faster', 'READ COMMITTED'], answer: 0, explain: 'The unique index is checked atomically by the engine; the second insert conflicts.' },
    hints: [`<p>Hint 1: Let a constraint decide — two transactions cannot both insert the same unique key.</p>`, `<p>Hint 2: <code>INSERT OR IGNORE</code> (SQLite) / <code>ON CONFLICT DO NOTHING</code> (Postgres) / <code>INSERT IGNORE</code> (MySQL), then check rows affected.</p>`, `<p>Hint 3: 1 row = first attempt, perform the charge; 0 rows = duplicate, return the stored response.</p>`],
    tests: { engine: 'sqlite', check: '(rows, cols, c) => {\n  if (c.plan || c.noplan) { const d = rows.map(r => r[r.length - 1]).join(\'\\n\'); return (!c.plan || new RegExp(c.plan).test(d)) && (!c.noplan || !new RegExp(c.noplan).test(d)); }\n  let a = rows, b = c.rows || [];\n  if (c.set) { const k = r => JSON.stringify(r); a = a.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); b = b.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); }\n  return a.length === b.length && a.every((r, i) => r.length === b[i].length && r.every((v, j) => v === b[i][j] || (typeof v === \'number\' && typeof b[i][j] === \'number\' && Math.abs(v - b[i][j]) < 1e-6)));\n}', cases: [
      { rows: [
          ['k-123', 499, 'charged']
        ] },
      { after: 'INSERT OR IGNORE INTO payments (idem_key, amount, status) VALUES (\'k-124\', 10, \'charged\'); SELECT idem_key, amount FROM payments ORDER BY id', rows: [
          ['k-123', 499],
          ['k-124', 10]
        ] },
      { after: 'INSERT OR IGNORE INTO payments (idem_key, amount, status) VALUES (\'k-123\', 999, \'failed\'); SELECT amount, status FROM payments', rows: [
          [499, 'charged']
        ] },
      { after: 'SELECT count(*) FROM payments', rows: [
          [1]
        ] },
      { after: 'INSERT INTO payments (idem_key, amount, status) VALUES (\'k-123\', 499, \'charged\')', error: 'UNIQUE' },
      { after: 'INSERT INTO payments (idem_key, amount, status) VALUES (NULL, 499, \'charged\')', error: 'NOT NULL' },
      { after: 'INSERT OR IGNORE INTO payments (idem_key, amount, status) VALUES (\'K-123\', 5, \'x\'); SELECT count(*) FROM payments', rows: [
          [2]
        ] },
      { after: 'BEGIN; COMMIT', rows: [] }
    ] },
    solution: {
      approach: `<p>Store the idempotency key with a <b>UNIQUE</b> constraint in the same transaction as the business write. The first request wins; retries hit the conflict and read the stored result. Call the external payment provider with the same key too, so retries are idempotent end-to-end.</p>`,
      code: bank(`CREATE TABLE payments (id INTEGER PRIMARY KEY, idem_key TEXT NOT NULL UNIQUE, amount INTEGER NOT NULL, status TEXT NOT NULL);
INSERT OR IGNORE INTO payments (idem_key, amount, status) VALUES ('k-123', 499, 'charged');
SELECT 'attempt 1' AS req, changes() AS inserted;
INSERT OR IGNORE INTO payments (idem_key, amount, status) VALUES ('k-123', 499, 'charged');
SELECT 'retry' AS req, changes() AS inserted;          -- 0 -> return stored row
SELECT idem_key, amount, status FROM payments;`, 'Idempotency key (▶ Run)'),
      complexity: `<p>One unique-index probe/insert: O(log N). Keys can expire after e.g. 24 h.</p>`,
      followUps: ['What if the external charge succeeds but our COMMIT fails?', 'How long should keys be kept?']
    }
  });
  practice.push({
    title: 'Run a Migration Without Freezing the Site',
    level: 'Medium', tags: ['ddl locks', 'lock queue', 'lock_timeout'], companies: ['GitLab', 'Instacart', 'Robinhood'],
    statement: `<p>A deploy runs <code>ALTER TABLE orders ADD COLUMN note text</code>. While a 5-minute analytics query is running, the whole API stops responding until the query ends. Explain the lock chain and write a safe migration.</p>`,
    constraints: `<p>PostgreSQL 14+. The migration may be retried; the site must never block for more than a few seconds.</p>`,
    example: `<p>Analytics (ACCESS SHARE) → ALTER waits for ACCESS EXCLUSIVE → ${H.c('r', 'every new SELECT queues behind the ALTER')}.</p>`,
    brute: { why: `<p>Running DDL with no timeout lets the ALTER sit in the lock queue; Postgres grants locks roughly in queue order, so all later readers wait behind the pending ACCESS EXCLUSIVE request.</p>`, code: pg(`ALTER TABLE orders ADD COLUMN note text;   -- waits forever behind the long query, blocking everyone queued after it`, 'Unbounded DDL') },
    mcq: { q: 'Why do simple SELECTs block in this incident?', options: ['They queue behind the waiting ALTER\'s ACCESS EXCLUSIVE request', 'ALTER already rewrote the table', 'SELECT needs an exclusive lock', 'Autovacuum is running'], answer: 0, explain: 'A pending conflicting request ahead of them in the queue blocks new compatible requests too.' },
    hints: [`<p>Hint 1: Draw the queue: holder (analytics, ACCESS SHARE) → waiter (ALTER, ACCESS EXCLUSIVE) → new readers (ACCESS SHARE, conflict with the waiter).</p>`, `<p>Hint 2: Bound how long the ALTER may wait: <code>SET lock_timeout = '3s'</code>, and retry with backoff.</p>`, `<p>Hint 3: Also: kill/avoid long transactions before deploys, use <code>statement_timeout</code> for analytics, and prefer metadata-only DDL (adding a nullable column is instant, and since PG 11 so is adding one with a constant default).</p>`],
    tests: { engine: 'postgres', db: 'bank', cmp: 'exact', cases: [
      { after: 'SELECT column_name, data_type FROM information_schema.columns WHERE table_name = \'orders\' AND column_name = \'note\'', rows: [
          ['note', 'text']
        ] },
      { setup: 'INSERT INTO orders VALUES (1,\'MUG\',2,\'Asha\'),(2,\'TSHIRT\',1,\'Ben\')', after: 'SELECT count(*), count(note) FROM orders', rows: [
          [2, 0]
        ] },
      { setup: 'INSERT INTO orders VALUES (1,\'MUG\',2,\'Asha\')', after: 'SELECT id, sku, qty, customer, note FROM orders', rows: [
          [1, 'MUG', 2, 'Asha', null]
        ] },
      { setup: 'ALTER TABLE orders ADD COLUMN note text', after: 'SELECT count(*) FROM information_schema.columns WHERE table_name = \'orders\' AND column_name = \'note\'', rows: [
          [1]
        ] },
      { after: 'SELECT current_setting(\'lock_timeout\')', rows: [
          ['0']
        ] },
      { after: 'SELECT current_setting(\'statement_timeout\')', rows: [
          ['15s']
        ] },
      { after: 'SELECT count(*) FROM information_schema.columns WHERE table_name = \'orders\'', rows: [
          [5]
        ] }
    ] },
    solution: {
      approach: `<p>Make DDL <b>fail fast</b>: <code>lock_timeout</code> of a few seconds, then retry in a loop. Combine with operational hygiene: cap analytics with <code>statement_timeout</code> or move it to a replica, and use concurrent variants (<code>CREATE INDEX CONCURRENTLY</code>, <code>ADD CONSTRAINT … NOT VALID</code> + <code>VALIDATE</code>).</p>`,
      code: pg(`-- Migration step (retry this block up to N times with backoff if it hits lock_timeout)
SET lock_timeout = '3s';
SET statement_timeout = '15s';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS note text;   -- metadata-only, instant once the lock is granted; safe to retry
RESET lock_timeout;

-- Long-running analytics should not pin locks for minutes:
-- ALTER ROLE analytics SET statement_timeout = '60s';`, 'Fail-fast migration (PostgreSQL)'),
      complexity: `<p>Lock held for milliseconds; worst-case user impact bounded by lock_timeout (3 s) per attempt.</p>`,
      followUps: ['Which DDL rewrites the whole table and must be avoided on big tables?', 'How does MySQL online DDL / gh-ost avoid the problem?']
    }
  });
  /* =====================================================================
     PRACTICE — Hard
     ===================================================================== */
  practice.push({
    title: 'Doctors On Call: Defeat the Write Skew',
    level: 'Hard', tags: ['write skew', 'serializable', 'for update'], companies: ['Epic Systems', 'Cerner', 'Google'],
    statement: `<p>Rule: each shift must keep <b>at least one</b> doctor on call. The "go off call" endpoint checks <code>COUNT(*) WHERE shift_id = :s AND on_call = 1</code> ≥ 2, then sets the caller's <code>on_call = 0</code>. Alice and Bob (shift 1234) press the button at the same moment on PostgreSQL REPEATABLE READ and both succeed. Explain why, then give two correct fixes. Also explain why "put the COUNT inside the UPDATE's WHERE" is still unsafe in Postgres READ COMMITTED.</p>`,
    constraints: `<p>PostgreSQL 16 in production; SQLite to practise the logic. Retrying on 40001 is allowed.</p>`,
    example: `<p>Naive: ${H.c('r', '0 doctors on call')}. Fixed: ${H.c('g', 'one succeeds, the other is refused (count = 1)')}.</p>`,
    brute: { why: `<p>Snapshot isolation only aborts write-write conflicts on the <i>same</i> row. Alice's and Bob's transactions write different rows, so both commit. A single guarded statement also fails in Postgres RC: each statement reads its own snapshot (count 2) and updates a different row — nothing makes them wait for each other.</p>`, code: bank(`-- Replay of the interleaving: both checks happen before either update.
SELECT COUNT(*) AS alice_sees FROM doctors WHERE shift_id = 1234 AND on_call = 1;  -- 2
SELECT COUNT(*) AS bob_sees   FROM doctors WHERE shift_id = 1234 AND on_call = 1;  -- 2
UPDATE doctors SET on_call = 0 WHERE name = 'Alice';
UPDATE doctors SET on_call = 0 WHERE name = 'Bob';
SELECT COUNT(*) AS on_call_now FROM doctors WHERE shift_id = 1234 AND on_call = 1;  -- 0`, 'Interleaved check-then-write') },
    mcq: { q: 'Which is NOT a valid fix for this write skew in PostgreSQL?', options: ['Switch from READ COMMITTED to REPEATABLE READ', 'SELECT … FOR UPDATE on all on-call rows of the shift before counting', 'SERIALIZABLE with a retry loop', 'Lock a shifts row (materialize the conflict) before counting'], answer: 0, explain: 'Postgres REPEATABLE READ is snapshot isolation, which allows write skew.' },
    hints: [`<p>Hint 1: The two transactions read the same set but write different rows — what makes them conflict? Nothing yet. You must create a conflict.</p>`, `<p>Hint 2: Option A: lock every row the decision reads (<code>FOR UPDATE</code>), so the second transaction waits and then re-counts. Option B: SERIALIZABLE (SSI) detects the rw-cycle.</p>`, `<p>Hint 3: Option C: add a <code>shifts</code> row and <code>SELECT … FROM shifts WHERE id = :s FOR UPDATE</code> first — one lock per shift serializes all changes to it. Always wrap in a retry loop.</p>`],
    tests: { skip: 'write skew needs two concurrent sessions (the fixes are FOR UPDATE blocking and SERIALIZABLE aborts between sessions) and the PostgreSQL transactions use application placeholders ($1, $2)' },
    solution: {
      approach: `<p><b>Write skew</b>: an invariant over a <i>set</i> of rows with disjoint writes. Make the transactions conflict: (A) <code>FOR UPDATE</code> on the doctors rows being counted (READ COMMITTED: the waiter re-reads and counts 1; REPEATABLE READ: the waiter gets 40001 and retries); (B) SERIALIZABLE + retry; (C) lock a guard row per shift. In SQLite, the database-wide single writer already serializes the guarded UPDATE.</p>`,
      code: pg(`-- Fix A: lock what you read (READ COMMITTED)
BEGIN;
SELECT name FROM doctors WHERE shift_id = $1 AND on_call = 1 FOR UPDATE;   -- blocks the twin request
-- app: proceed only if 2+ rows came back
UPDATE doctors SET on_call = 0 WHERE name = $2 AND shift_id = $1;
COMMIT;

-- Fix B: SERIALIZABLE (wrap in retry-on-40001)
BEGIN ISOLATION LEVEL SERIALIZABLE;
SELECT COUNT(*) FROM doctors WHERE shift_id = $1 AND on_call = 1;
UPDATE doctors SET on_call = 0 WHERE name = $2 AND shift_id = $1;
COMMIT;`, 'Two fixes (PostgreSQL)'),
      alt: [bank(`-- SQLite (single writer => statements are serialized): guarded update, run twice.
UPDATE doctors SET on_call = 0
WHERE name = 'Alice' AND shift_id = 1234
  AND (SELECT COUNT(*) FROM doctors WHERE shift_id = 1234 AND on_call = 1) >= 2;
SELECT 'Alice' AS who, changes() AS went_off_call;     -- 1
UPDATE doctors SET on_call = 0
WHERE name = 'Bob' AND shift_id = 1234
  AND (SELECT COUNT(*) FROM doctors WHERE shift_id = 1234 AND on_call = 1) >= 2;
SELECT 'Bob' AS who, changes() AS went_off_call;       -- 0 -> must stay
SELECT name, on_call FROM doctors WHERE shift_id = 1234;`, 'Guarded update in SQLite (▶ Run)')],
      complexity: `<p>Fix A locks k rows (doctors in the shift); Fix B adds SIREAD tracking and occasional retries. Both O(k log N).</p>`,
      followUps: ['Would a CHECK constraint help? Why not?', 'How would you enforce this rule across two microservices with separate databases?']
    }
  });
  practice.push({
    title: 'No Double-Booked Meeting Rooms',
    level: 'Hard', tags: ['phantom', 'write skew', 'exclusion constraint', 'materialize conflict'], companies: ['Microsoft', 'Google', 'Calendly'],
    statement: `<p>Bookings are time ranges. The service checks "no overlapping booking exists for this room" and then inserts. Under load two people get the same room at overlapping times. Design a fix that works under READ COMMITTED. Show (a) a slot-table design runnable in SQLite and (b) a range design using a database constraint.</p>`,
    constraints: `<p>30-minute slots are acceptable for (a). Postgres for (b). Everest already has 10:00 booked by Asha.</p>`,
    example: `<p>Ben requests 09:30–10:30 → ${H.c('r', 'rejected (10:00 taken)')}; Chen requests 11:00–12:00 → ${H.c('g', 'booked (2 slots)')}.</p>`,
    brute: { why: `<p>"SELECT overlapping … then INSERT" is phantom write skew: the conflicting row does not exist yet, so neither row locks nor snapshot isolation stop two concurrent inserts. <code>FOR UPDATE</code> on an empty result locks nothing.</p>`, code: bank(`-- both requests: SELECT ... overlapping 11:00 -> none, then both insert
INSERT INTO room_slots VALUES ('Everest', '2026-10-20 11:00 (Ben)', 'Ben');
INSERT INTO room_slots VALUES ('Everest', '2026-10-20 11:00 (Chen)', 'Chen');
SELECT * FROM room_slots;     -- two bookings for 11:00 (keys differ because ranges are free text)`, 'Check-then-insert') },
    mcq: { q: 'Why does a PRIMARY KEY on (room, slot) fix concurrency here?', options: ['Two concurrent inserts of the same slot conflict on the unique index; one fails', 'It locks the whole table', 'It makes reads repeatable', 'It disables MVCC'], answer: 0, explain: 'Uniqueness is enforced atomically by the index, even for rows that did not exist before.' },
    hints: [`<p>Hint 1: Turn "no overlap" into "no two rows with the same key": split time into fixed slots and give each (room, slot) a unique key.</p>`, `<p>Hint 2: Book all slots of a request in one transaction; if any slot insert conflicts, roll back the whole booking.</p>`, `<p>Hint 3: For arbitrary ranges in Postgres: <code>EXCLUDE USING gist (room WITH =, during WITH &amp;&amp;)</code> — the database rejects overlapping ranges atomically (error 23P01).</p>`],
    tests: { engine: 'sqlite', check: '(rows, cols, c) => {\n  if (c.plan || c.noplan) { const d = rows.map(r => r[r.length - 1]).join(\'\\n\'); return (!c.plan || new RegExp(c.plan).test(d)) && (!c.noplan || !new RegExp(c.noplan).test(d)); }\n  let a = rows, b = c.rows || [];\n  if (c.set) { const k = r => JSON.stringify(r); a = a.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); b = b.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); }\n  return a.length === b.length && a.every((r, i) => r.length === b[i].length && r.every((v, j) => v === b[i][j] || (typeof v === \'number\' && typeof b[i][j] === \'number\' && Math.abs(v - b[i][j]) < 1e-6)));\n}', cases: [
      { setup: '', rows: [
          ['Everest', '2026-10-20 10:00', 'Asha'],
          ['Everest', '2026-10-20 11:00', 'Chen'],
          ['Everest', '2026-10-20 11:30', 'Chen']
        ] },
      { setup: 'DELETE FROM room_slots; ', rows: [
          ['Everest', '2026-10-20 09:30', 'Ben'],
          ['Everest', '2026-10-20 10:00', 'Ben'],
          ['Everest', '2026-10-20 11:00', 'Chen'],
          ['Everest', '2026-10-20 11:30', 'Chen']
        ] },
      { setup: 'INSERT INTO room_slots VALUES (\'Everest\',\'2026-10-20 09:30\',\'Dan\')', rows: [
          ['Everest', '2026-10-20 09:30', 'Dan'],
          ['Everest', '2026-10-20 10:00', 'Asha'],
          ['Everest', '2026-10-20 11:00', 'Chen'],
          ['Everest', '2026-10-20 11:30', 'Chen']
        ] },
      { setup: 'INSERT INTO room_slots VALUES (\'Everest\',\'2026-10-20 11:30\',\'Eve\')', rows: [
          ['Everest', '2026-10-20 10:00', 'Asha'],
          ['Everest', '2026-10-20 11:30', 'Eve']
        ] },
      { setup: 'INSERT INTO room_slots VALUES (\'K2\',\'2026-10-20 09:30\',\'Zed\')', rows: [
          ['K2', '2026-10-20 09:30', 'Zed'],
          ['Everest', '2026-10-20 10:00', 'Asha'],
          ['Everest', '2026-10-20 11:00', 'Chen'],
          ['Everest', '2026-10-20 11:30', 'Chen']
        ] },
      { setup: 'DELETE FROM room_slots; INSERT INTO room_slots VALUES (\'K2\',\'2026-10-20 10:00\',\'Zed\')', rows: [
          ['Everest', '2026-10-20 09:30', 'Ben'],
          ['K2', '2026-10-20 10:00', 'Zed'],
          ['Everest', '2026-10-20 10:00', 'Ben'],
          ['Everest', '2026-10-20 11:00', 'Chen'],
          ['Everest', '2026-10-20 11:30', 'Chen']
        ], set: true },
      { setup: 'INSERT INTO room_slots VALUES (\'Everest\',\'2026-10-20 11:00\',\'Fay\')', rows: [
          ['Everest', '2026-10-20 10:00', 'Asha'],
          ['Everest', '2026-10-20 11:00', 'Fay']
        ] },
      { setup: 'INSERT INTO room_slots VALUES (\'K2\',\'2026-10-20 11:00\',\'Fay\'),(\'K2\',\'2026-10-20 11:30\',\'Gus\')', rows: [
          ['Everest', '2026-10-20 10:00', 'Asha'],
          ['K2', '2026-10-20 11:00', 'Fay'],
          ['Everest', '2026-10-20 11:00', 'Chen'],
          ['K2', '2026-10-20 11:30', 'Gus'],
          ['Everest', '2026-10-20 11:30', 'Chen']
        ] },
      { after: 'SELECT count(*) FROM room_slots', rows: [
          [3]
        ] },
      { after: 'BEGIN; COMMIT', rows: [] }
    ] },
    solution: {
      approach: `<p><b>Materialize the conflict</b> as unique slot rows, or let a <b>constraint</b> enforce non-overlap. Both move the invariant into the storage engine, where concurrent inserts are checked atomically. In app code: try the insert, catch the unique/exclusion violation, show "room taken".</p>`,
      code: bank(`-- (a) Slot table: book all slots or none (one transaction, guard on any taken slot).
BEGIN;
INSERT INTO room_slots (room, slot, booked_by)
SELECT 'Everest', column1, 'Ben' FROM (VALUES ('2026-10-20 09:30'), ('2026-10-20 10:00'))
WHERE NOT EXISTS (SELECT 1 FROM room_slots
                  WHERE room = 'Everest' AND slot IN ('2026-10-20 09:30', '2026-10-20 10:00'));
SELECT 'Ben 09:30-10:30' AS request, changes() AS slots_booked;     -- 0: overlaps Asha
COMMIT;
BEGIN;
INSERT INTO room_slots (room, slot, booked_by)
SELECT 'Everest', column1, 'Chen' FROM (VALUES ('2026-10-20 11:00'), ('2026-10-20 11:30'))
WHERE NOT EXISTS (SELECT 1 FROM room_slots
                  WHERE room = 'Everest' AND slot IN ('2026-10-20 11:00', '2026-10-20 11:30'));
SELECT 'Chen 11:00-12:00' AS request, changes() AS slots_booked;    -- 2
COMMIT;
SELECT * FROM room_slots ORDER BY slot;
-- Under real concurrency the PRIMARY KEY (room, slot) is what makes the second insert fail.`, 'Slot booking (▶ Run)'),
      alt: [pg(`CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE TABLE bookings (
  id      bigserial PRIMARY KEY,
  room    text NOT NULL,
  during  tstzrange NOT NULL,
  booked_by text NOT NULL,
  EXCLUDE USING gist (room WITH =, during WITH &&)
);
INSERT INTO bookings (room, during, booked_by)
VALUES ('Everest', tstzrange('2026-10-20 09:30+00', '2026-10-20 10:30+00'), 'Ben');
-- concurrent overlapping insert -> waits, then ERROR 23P01 conflicting key value violates exclusion constraint`, 'Exclusion constraint (PostgreSQL)')],
      complexity: `<p>Slots: k unique-index inserts per booking. Exclusion constraint: one GiST probe O(log N) per insert.</p>`,
      followUps: ['How do you support recurring weekly meetings?', 'Which approach scales to minute-level granularity?']
    }
  });
  practice.push({
    title: 'Is This Schedule Conflict-Serializable?',
    level: 'Hard', tags: ['serializability', 'precedence graph', 'recursive cte'], companies: ['Oracle', 'CockroachDB', 'Academia'],
    statement: `<p>A schedule is stored as rows <code>(step, txn, op, item)</code> where op is R or W. Two operations <b>conflict</b> if they are from different transactions, touch the same item, and at least one is a W. Build the precedence graph (edge Ti → Tj when Ti's conflicting op comes first) and report whether the schedule is conflict-serializable (no cycle). Schedule: R1(A) R2(A) W1(A) W2(A) R1(B) W2(B).</p>`,
    constraints: `<p>SQLite; create the schedule table inside your query script. Any number of transactions.</p>`,
    example: `<p>Edges: T1→T2 (R1(A) before W2(A)), T2→T1 (R2(A) before W1(A)) → ${H.c('r', 'cycle → NOT serializable')} (this is the lost-update schedule).</p>`,
    brute: { why: `<p>Trying every serial order (n! permutations) and comparing results is exponential; and comparing final values can miss conflicts that happen to produce equal results.</p>`, code: bank(`CREATE TEMP TABLE sched (step INTEGER PRIMARY KEY, txn TEXT, op TEXT, item TEXT);
INSERT INTO sched VALUES (1,'T1','R','A'),(2,'T2','R','A'),(3,'T1','W','A'),(4,'T2','W','A'),(5,'T1','R','B'),(6,'T2','W','B');
-- Only looks at write-write pairs: misses the read-write edge T2 -> T1.
SELECT DISTINCT a.txn AS src, b.txn AS dst FROM sched a JOIN sched b
ON a.item = b.item AND a.step < b.step AND a.txn <> b.txn AND a.op = 'W' AND b.op = 'W';`, 'Write-write only (incomplete)') },
    mcq: { q: 'Which pair is NOT a conflict?', options: ['R1(A) and R2(A)', 'R1(A) and W2(A)', 'W1(A) and R2(A)', 'W1(A) and W2(A)'], answer: 0, explain: 'Two reads never conflict; swapping them changes nothing.' },
    hints: [`<p>Hint 1: Self-join the schedule: same item, different txn, earlier step first, at least one W → edge (earlier txn → later txn).</p>`, `<p>Hint 2: A schedule is conflict-serializable iff the precedence graph is acyclic.</p>`, `<p>Hint 3: Reuse the recursive-CTE cycle walk from the deadlock detector over these edges; if any walk returns to its start → not serializable.</p>`],
    tests: { engine: 'sqlite', check: '(rows, cols, c) => {\n  if (c.plan || c.noplan) { const d = rows.map(r => r[r.length - 1]).join(\'\\n\'); return (!c.plan || new RegExp(c.plan).test(d)) && (!c.noplan || !new RegExp(c.noplan).test(d)); }\n  let a = rows, b = c.rows || [];\n  if (c.set) { const k = r => JSON.stringify(r); a = a.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); b = b.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); }\n  return a.length === b.length && a.every((r, i) => r.length === b[i].length && r.every((v, j) => v === b[i][j] || (typeof v === \'number\' && typeof b[i][j] === \'number\' && Math.abs(v - b[i][j]) < 1e-6)));\n}', cases: [
      { rows: [
          ['T1->T2, T2->T1', 'NOT conflict-serializable (cycle)']
        ] },
      { after: 'DELETE FROM sched; INSERT INTO sched VALUES (1,\'T1\',\'R\',\'A\'),(2,\'T1\',\'W\',\'A\'),(3,\'T2\',\'R\',\'A\'),(4,\'T2\',\'W\',\'A\'); SELECT * FROM schedule_check', rows: [
          ['T1->T2', 'conflict-serializable']
        ] },
      { after: 'DELETE FROM sched; INSERT INTO sched VALUES (1,\'T1\',\'R\',\'A\'),(2,\'T2\',\'R\',\'A\'); SELECT * FROM schedule_check', rows: [
          [null, 'conflict-serializable']
        ] },
      { after: 'DELETE FROM sched; INSERT INTO sched VALUES (1,\'T1\',\'W\',\'A\'),(2,\'T2\',\'W\',\'B\'),(3,\'T3\',\'W\',\'C\'); SELECT * FROM schedule_check', rows: [
          [null, 'conflict-serializable']
        ] },
      { after: 'DELETE FROM sched; INSERT INTO sched VALUES (1,\'T1\',\'R\',\'A\'),(2,\'T2\',\'W\',\'A\'),(3,\'T2\',\'R\',\'B\'),(4,\'T3\',\'W\',\'B\'),(5,\'T3\',\'R\',\'C\'),(6,\'T1\',\'W\',\'C\'); SELECT * FROM schedule_check', rows: [
          ['T1->T2, T2->T3, T3->T1', 'NOT conflict-serializable (cycle)']
        ] },
      { after: 'DELETE FROM sched; INSERT INTO sched VALUES (1,\'T1\',\'W\',\'A\'),(2,\'T2\',\'R\',\'A\'),(3,\'T2\',\'W\',\'B\'),(4,\'T3\',\'R\',\'B\'); SELECT * FROM schedule_check', rows: [
          ['T1->T2, T2->T3', 'conflict-serializable']
        ] },
      { after: 'DELETE FROM sched; INSERT INTO sched VALUES (1,\'T1\',\'W\',\'A\'),(2,\'T2\',\'W\',\'A\'),(3,\'T1\',\'W\',\'B\'),(4,\'T2\',\'W\',\'B\'); SELECT * FROM schedule_check', rows: [
          ['T1->T2', 'conflict-serializable']
        ] },
      { after: 'DELETE FROM sched; INSERT INTO sched VALUES (1,\'T1\',\'R\',\'A\'),(2,\'T2\',\'W\',\'A\'),(3,\'T1\',\'R\',\'B\'),(4,\'T2\',\'W\',\'B\'),(5,\'T1\',\'W\',\'C\'); SELECT * FROM schedule_check', rows: [
          ['T1->T2', 'conflict-serializable']
        ] },
      { after: 'SELECT count(*) FROM sched', rows: [
          [6]
        ] }
    ] },
    solution: {
      approach: `<p>Build conflict edges with a self-join, then search for cycles with a recursive CTE. No cycle → serializable, and a topological order of the graph is an equivalent serial order.</p>`,
      code: bank(`CREATE TEMP TABLE sched (step INTEGER PRIMARY KEY, txn TEXT, op TEXT CHECK (op IN ('R','W')), item TEXT);
INSERT INTO sched VALUES (1,'T1','R','A'),(2,'T2','R','A'),(3,'T1','W','A'),(4,'T2','W','A'),(5,'T1','R','B'),(6,'T2','W','B');
CREATE TEMP VIEW schedule_check AS
WITH RECURSIVE edges AS (
  SELECT DISTINCT a.txn AS src, b.txn AS dst
  FROM sched a JOIN sched b
    ON a.item = b.item AND a.step < b.step AND a.txn <> b.txn
   AND (a.op = 'W' OR b.op = 'W')
),
walk(start, cur, path, depth) AS (
  SELECT src, dst, '/' || src || '/' || dst || '/', 1 FROM edges
  UNION ALL
  SELECT w.start, e.dst, w.path || e.dst || '/', w.depth + 1
  FROM walk w JOIN edges e ON e.src = w.cur
  WHERE w.cur <> w.start AND w.depth < 20
    AND (e.dst = w.start OR instr(w.path, '/' || e.dst || '/') = 0)
)
SELECT (SELECT group_concat(src || '->' || dst, ', ') FROM (SELECT src, dst FROM edges ORDER BY src, dst)) AS precedence_edges,
       CASE WHEN EXISTS (SELECT 1 FROM walk WHERE cur = start)
            THEN 'NOT conflict-serializable (cycle)' ELSE 'conflict-serializable' END AS verdict;

-- Edit sched and run this again to test another schedule
SELECT * FROM schedule_check;`, 'Precedence-graph test (▶ Run)'),
      complexity: `<p>Edges: O(n²) pairs per item in the self-join; cycle search ~O(V·E) for small graphs. Real schedulers never build this graph — 2PL/SSI guarantee acyclicity by construction.</p>`,
      followUps: ['Change W2(A) to happen after R1(B) only — is it serializable now?', 'What is view-serializability and why is testing it NP-complete?']
    }
  });
  practice.push({
    title: 'Why Won\'t VACUUM Shrink This Table?',
    level: 'Hard', tags: ['mvcc', 'vacuum', 'bloat', 'xmin horizon'], companies: ['Heroku', 'Supabase', 'Neon'],
    statement: `<p>Using the <code>mvcc</code> database (plus one extra tuple, Dara, deleted by committed txn 108), classify every tuple as <b>live</b>, <b>removable</b> (no snapshot can ever see it), or <b>pinned</b> (dead for new transactions but still visible to an open snapshot), and say which snapshot pins it.</p>`,
    constraints: `<p>Removable = creator aborted, or deleter committed with xid &lt; the oldest snapshot's snap_xmin (the "xmin horizon"). Pinned = deleter committed but some snapshot still sees the tuple.</p>`,
    example: `<p>(0,1) Asha 500 → ${H.c('g', 'removable')} (105 &lt; horizon 107). (0,6) Dara → ${H.c('y', 'pinned by old_report')} (108 is beyond its snapshot). Everything else → live.</p>`,
    brute: { why: `<p>Treating "xmax ≠ 0" as dead marks Ben (deleter 107 aborted) and Asha 400 (deleter 110 still running) as garbage — VACUUM doing that would destroy live data. Ignoring open snapshots would remove rows an old report still needs.</p>`, code: mv(`INSERT INTO tuples VALUES ('(0,6)', 4, 'Dara', 70, 100, 108);
SELECT ctid, owner, CASE WHEN xmax <> 0 THEN 'dead?' ELSE 'live' END AS naive FROM tuples ORDER BY ctid;`, 'Naive xmax check') },
    mcq: { q: 'What usually holds back the xmin horizon in production?', options: ['A long-running or idle-in-transaction session (or a replica with hot_standby_feedback)', 'Too many indexes', 'A large shared_buffers', 'Using UUID primary keys'], answer: 0, explain: 'Any open snapshot keeps every version it might need, so VACUUM cannot remove them.' },
    hints: [`<p>Hint 1: Compute, per snapshot, the set of xids it treats as committed (as in the visibility problem).</p>`, `<p>Hint 2: A tuple is visible to snapshot S if xmin ∈ vis(S) and xmax ∉ vis(S). Pinned = deleter committed AND visible to some S.</p>`, `<p>Hint 3: Removable = creator aborted, or (deleter committed AND visible to no snapshot). Use CASE with EXISTS subqueries and group_concat of the pinning snapshot names.</p>`],
    tests: { engine: 'sqlite', check: '(rows, cols, c) => {\n  if (c.plan || c.noplan) { const d = rows.map(r => r[r.length - 1]).join(\'\\n\'); return (!c.plan || new RegExp(c.plan).test(d)) && (!c.noplan || !new RegExp(c.noplan).test(d)); }\n  let a = rows, b = c.rows || [];\n  if (c.set) { const k = r => JSON.stringify(r); a = a.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); b = b.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); }\n  return a.length === b.length && a.every((r, i) => r.length === b[i].length && r.every((v, j) => v === b[i][j] || (typeof v === \'number\' && typeof b[i][j] === \'number\' && Math.abs(v - b[i][j]) < 1e-6)));\n}', cases: [
      { setup: '', rows: [
          ['(0,1)', 'Asha', 500, 100, 105, 'removable'],
          ['(0,2)', 'Ben', 300, 100, 107, 'live'],
          ['(0,3)', 'Asha', 400, 105, 110, 'live'],
          ['(0,4)', 'Chen', 1000, 108, 0, 'live'],
          ['(0,5)', 'Asha', 350, 110, 0, 'live'],
          ['(0,6)', 'Dara', 70, 100, 108, 'pinned by old_report']
        ] },
      { setup: 'UPDATE txns SET status = \'aborted\' WHERE xid = 100', rows: [
          ['(0,1)', 'Asha', 500, 100, 105, 'removable (creator aborted)'],
          ['(0,2)', 'Ben', 300, 100, 107, 'removable (creator aborted)'],
          ['(0,3)', 'Asha', 400, 105, 110, 'live'],
          ['(0,4)', 'Chen', 1000, 108, 0, 'live'],
          ['(0,5)', 'Asha', 350, 110, 0, 'live'],
          ['(0,6)', 'Dara', 70, 100, 108, 'removable (creator aborted)']
        ] },
      { setup: 'INSERT INTO snapshots VALUES (\'ancient\', 90, 101)', rows: [
          ['(0,1)', 'Asha', 500, 100, 105, 'pinned by ancient'],
          ['(0,2)', 'Ben', 300, 100, 107, 'live'],
          ['(0,3)', 'Asha', 400, 105, 110, 'live'],
          ['(0,4)', 'Chen', 1000, 108, 0, 'live'],
          ['(0,5)', 'Asha', 350, 110, 0, 'live'],
          ['(0,6)', 'Dara', 70, 100, 108, 'pinned by ancient,old_report']
        ] },
      { setup: 'UPDATE txns SET status = \'aborted\' WHERE xid = 108', rows: [
          ['(0,1)', 'Asha', 500, 100, 105, 'removable'],
          ['(0,2)', 'Ben', 300, 100, 107, 'live'],
          ['(0,3)', 'Asha', 400, 105, 110, 'live'],
          ['(0,4)', 'Chen', 1000, 108, 0, 'removable (creator aborted)'],
          ['(0,5)', 'Asha', 350, 110, 0, 'live'],
          ['(0,6)', 'Dara', 70, 100, 108, 'live']
        ] },
      { setup: 'UPDATE txns SET status = \'committed\' WHERE xid = 110', rows: [
          ['(0,1)', 'Asha', 500, 100, 105, 'removable'],
          ['(0,2)', 'Ben', 300, 100, 107, 'live'],
          ['(0,3)', 'Asha', 400, 105, 110, 'pinned by now,old_report'],
          ['(0,4)', 'Chen', 1000, 108, 0, 'live'],
          ['(0,5)', 'Asha', 350, 110, 0, 'live'],
          ['(0,6)', 'Dara', 70, 100, 108, 'pinned by old_report']
        ] },
      { setup: 'DELETE FROM snapshot_xip; DELETE FROM snapshots', rows: [
          ['(0,1)', 'Asha', 500, 100, 105, 'removable'],
          ['(0,2)', 'Ben', 300, 100, 107, 'live'],
          ['(0,3)', 'Asha', 400, 105, 110, 'live'],
          ['(0,4)', 'Chen', 1000, 108, 0, 'live'],
          ['(0,5)', 'Asha', 350, 110, 0, 'live'],
          ['(0,6)', 'Dara', 70, 100, 108, 'removable']
        ] },
      { setup: 'UPDATE txns SET status = \'committed\' WHERE xid = 107', rows: [
          ['(0,1)', 'Asha', 500, 100, 105, 'removable'],
          ['(0,2)', 'Ben', 300, 100, 107, 'pinned by old_report'],
          ['(0,3)', 'Asha', 400, 105, 110, 'live'],
          ['(0,4)', 'Chen', 1000, 108, 0, 'live'],
          ['(0,5)', 'Asha', 350, 110, 0, 'live'],
          ['(0,6)', 'Dara', 70, 100, 108, 'pinned by old_report']
        ] },
      { setup: 'UPDATE tuples SET xmax = 0 WHERE ctid IN (\'(0,1)\', \'(0,2)\')', rows: [
          ['(0,1)', 'Asha', 500, 100, 0, 'live'],
          ['(0,2)', 'Ben', 300, 100, 0, 'live'],
          ['(0,3)', 'Asha', 400, 105, 110, 'live'],
          ['(0,4)', 'Chen', 1000, 108, 0, 'live'],
          ['(0,5)', 'Asha', 350, 110, 0, 'live'],
          ['(0,6)', 'Dara', 70, 100, 108, 'pinned by old_report']
        ] }
    ] },
    solution: {
      approach: `<p>Reuse the visibility rule to see which snapshots still need each tuple. A dead tuple (committed deleter) is removable only when no snapshot can see it; otherwise it is pinned by the listed snapshots — the exact reason VACUUM reports "dead row versions cannot be removed yet".</p>`,
      code: mv(`INSERT INTO tuples VALUES ('(0,6)', 4, 'Dara', 70, 100, 108);
WITH vis AS (
  SELECT s.name, t.xid FROM snapshots s
  JOIN txns t ON t.status = 'committed' AND t.xid < s.snap_xmax
  WHERE NOT EXISTS (SELECT 1 FROM snapshot_xip x WHERE x.name = s.name AND x.xid = t.xid)
),
seen AS (                                   -- which snapshots can see which tuple
  SELECT tp.ctid, s.name
  FROM tuples tp JOIN snapshots s
    ON EXISTS (SELECT 1 FROM vis v WHERE v.name = s.name AND v.xid = tp.xmin)
   AND NOT EXISTS (SELECT 1 FROM vis v WHERE v.name = s.name AND v.xid = tp.xmax)
)
SELECT tp.ctid, tp.owner, tp.balance, tp.xmin, tp.xmax,
  CASE
    WHEN cr.status = 'aborted' THEN 'removable (creator aborted)'
    WHEN dl.status = 'committed' AND NOT EXISTS (SELECT 1 FROM seen WHERE seen.ctid = tp.ctid) THEN 'removable'
    WHEN dl.status = 'committed' THEN 'pinned by ' || (SELECT group_concat(name) FROM (SELECT name FROM seen WHERE seen.ctid = tp.ctid ORDER BY name))
    ELSE 'live'
  END AS vacuum_status
FROM tuples tp
JOIN txns cr ON cr.xid = tp.xmin
LEFT JOIN txns dl ON dl.xid = tp.xmax
ORDER BY tp.ctid;`, 'Classify tuples for VACUUM (▶ Run)'),
      complexity: `<p>O(tuples × snapshots) probes. Postgres instead computes one horizon (oldest xmin across all backends/replication slots) and compares each tuple's xmax against it.</p>`,
      followUps: ['Which query finds the session holding back the horizon? (pg_stat_activity.backend_xmin)', 'How do replication slots pin the horizon even with no open sessions?']
    }
  });
  /* =====================================================================
     QUIZ
     ===================================================================== */
  quiz.push(
    { q: 'A transfer runs two UPDATEs without BEGIN. The server crashes between them. What happens?', options: ['The first UPDATE stays committed; money is lost', 'Both are rolled back automatically', 'Both are applied on restart', 'The database refuses to restart'], answer: 0, explain: 'In autocommit each statement is its own transaction; only a single transaction around both gives atomicity.' },
    { q: 'Which ACID property is mainly provided by the write-ahead log + fsync at COMMIT?', options: ['Durability', 'Isolation', 'Consistency', 'Availability'], answer: 0, explain: 'Once the commit record is on disk, recovery can redo the transaction after a crash.' },
    { q: 'T1 counts rows WHERE event_id = 1 (2), T2 inserts a matching row and commits, T1 counts again (3). This is a…', options: ['Phantom read', 'Dirty read', 'Lost update', 'Dirty write'], answer: 0, explain: 'The set of rows matching a predicate changed — a phantom.' },
    { q: 'An audit reads account A, a transfer A→B commits, then the audit reads B. The total is too high. Anomaly?', options: ['Read skew', 'Write skew', 'Phantom', 'Dirty write'], answer: 0, explain: 'Two related rows read at different moments: read skew (A5A). Fixed by a single snapshot.' },
    { q: 'Default isolation level of PostgreSQL and of MySQL InnoDB, respectively?', options: ['READ COMMITTED; REPEATABLE READ', 'SERIALIZABLE; READ COMMITTED', 'REPEATABLE READ; REPEATABLE READ', 'READ UNCOMMITTED; READ COMMITTED'], answer: 0, explain: 'Postgres defaults to RC; InnoDB defaults to RR.' },
    { q: 'Which anomaly does snapshot isolation (e.g. Postgres REPEATABLE READ) still allow?', options: ['Write skew', 'Dirty read', 'Non-repeatable read', 'Lost update'], answer: 0, explain: 'SI only aborts write-write conflicts on the same row; write skew writes different rows.' },
    { q: 'Under strict two-phase locking, when are exclusive locks released?', options: ['At commit or abort', 'Right after each write', 'When the growing phase starts', 'Whenever another transaction asks'], answer: 0, explain: 'Holding X locks to the end prevents dirty reads and cascading aborts.' },
    { q: 'Held lock IX on a table; another transaction requests S on the same table. Result?', options: ['Waits — S conflicts with IX', 'Granted', 'Escalated to X', 'Deadlock immediately'], answer: 0, explain: 'IX means someone is writing rows inside; a whole-table read lock must wait.' },
    { q: 'In PostgreSQL, a tuple has xmin = 105 (committed) and xmax = 110 (still running). A new query…', options: ['sees the tuple', 'does not see the tuple', 'waits for 110 to finish before reading', 'gets a serialization error'], answer: 0, explain: 'The deleter has not committed, so the old version is still the visible one — readers never wait.' },
    { q: 'What usually causes table bloat in a PostgreSQL database with steady row counts?', options: ['Long-running or idle-in-transaction sessions preventing VACUUM from removing dead tuples', 'Too many CHECK constraints', 'Using SERIALIZABLE', 'Small shared_buffers'], answer: 0, explain: 'Old snapshots pin the xmin horizon, so dead versions pile up.' },
    { q: 'Wait-for graph edges: T1→T2, T2→T3, T3→T1, T4→T1. Which transactions are deadlocked?', options: ['T1, T2, T3', 'T1, T2, T3, T4', 'Only T4', 'None'], answer: 0, explain: 'Only the cycle members are deadlocked; T4 is merely blocked and will proceed once the cycle is broken.' },
    { q: 'In wait-die, a YOUNGER transaction requests a lock held by an OLDER one. It…', options: ['aborts (dies) and restarts with its original timestamp', 'waits', 'wounds the older transaction', 'is granted the lock'], answer: 0, explain: 'Wait-die: old may wait for young; young dies. Keeping the timestamp avoids starvation.' },
    { q: 'Best fix for "two checkouts both bought the last item"?', options: ['UPDATE … SET stock = stock - 1 WHERE id = ? AND stock >= 1 and check rows affected', 'Read stock with READ UNCOMMITTED', 'Add an index on stock', 'Run the SELECT twice'], answer: 0, explain: 'Check and write become one atomic statement guarded by the row lock.' },
    { q: 'Which statement about MySQL InnoDB REPEATABLE READ is TRUE?', options: ['Plain SELECTs read a snapshot, but UPDATEs read the latest committed row, so app-side read-modify-write can lose updates', 'It aborts the second writer like Postgres', 'It allows dirty reads', 'It is identical to SERIALIZABLE'], answer: 0, explain: 'InnoDB has no first-updater-wins check at RR; use atomic SQL, FOR UPDATE or a version column.' }
  );

  /* =====================================================================
     INTERVIEW
     ===================================================================== */
  interview.push(
    { q: 'Explain ACID with one concrete example.', level: 'B', a: `<p>Take a bank transfer of 200 from Asha to Ben. <b>Atomicity</b>: debit and credit both happen or neither (undo/rollback on failure). <b>Consistency</b>: rules like "balance ≥ 0" and "total money unchanged" hold at commit — enforced by constraints plus correct transaction logic. <b>Isolation</b>: a concurrent report never sees the money "in flight" (locks or MVCC snapshots). <b>Durability</b>: once COMMIT returns, a power cut cannot lose it (commit record fsynced in the write-ahead log). I would add that C is partly the application's responsibility, unlike the C in CAP.</p>`, followUps: ['How does the database undo a half-done transaction after a crash?', 'What does synchronous_commit = off trade away?'] },
    { q: 'List the isolation levels and the anomalies each prevents.', level: 'I', a: `<p>READ UNCOMMITTED allows dirty reads. READ COMMITTED prevents dirty reads but allows non-repeatable reads, phantoms, read skew and lost updates. REPEATABLE READ (ANSI) also prevents non-repeatable reads; phantoms may remain. Snapshot isolation (Postgres RR, Oracle "serializable") prevents dirty, non-repeatable, phantom reads, read skew and lost updates — but allows <b>write skew</b>. SERIALIZABLE prevents all of them. Dirty writes are prevented at every level. I always clarify product differences: InnoDB RR allows lost updates with app-side read-modify-write; Postgres RU behaves as RC.</p>`, followUps: ['Why is the ANSI definition considered ambiguous?', 'What is the default in your database of choice?'] },
    { q: 'What is the difference between a non-repeatable read and a phantom read?', level: 'I', a: `<p>A <b>non-repeatable read</b> is about one existing row: read it twice, its value changed because another transaction updated or deleted it and committed. A <b>phantom</b> is about a predicate: run the same WHERE twice, and the <i>set</i> of rows changed because another transaction inserted (or moved) rows into the range. Row locks fix the first; the second needs range/predicate/next-key locks or a snapshot, because you cannot lock a row that does not exist yet.</p>`, followUps: ['How does InnoDB prevent phantoms for locking reads?', 'Does Postgres REPEATABLE READ allow phantoms?'] },
    { q: 'What is a lost update and how do you prevent it?', level: 'I', a: `<p>Two transactions read the same value, each computes a new value in application code, and both write; the second write silently overwrites the first (e.g. two likes → +1). Fixes, simplest first: <b>atomic SQL</b> (<code>SET n = n + 1</code>, <code>stock = stock - q WHERE stock &gt;= q</code>); <b>pessimistic lock</b> (<code>SELECT … FOR UPDATE</code>); <b>optimistic lock</b> (version column, <code>WHERE version = :seen</code>, retry on 0 rows); or rely on <b>snapshot isolation</b> conflict detection (Postgres RR/SERIALIZABLE raise 40001; MySQL RR does not).</p>`, followUps: ['When is optimistic better than pessimistic locking?', 'How does an HTTP ETag relate to this?'] },
    { q: 'Explain write skew with an example and three ways to prevent it.', level: 'A', a: `<p>Two doctors on call; rule ≥ 1 must remain. Each transaction reads "2 on call", each sets <i>itself</i> off call (different rows), both commit → 0 on call. Snapshot isolation does not catch it because write sets do not overlap. Fixes: (1) <code>SELECT … FOR UPDATE</code> on every row the decision depends on, so the second waits and re-checks; (2) <b>materialize the conflict</b> — lock a guard row (the shift) or use a slot table with a unique key; (3) <b>SERIALIZABLE</b> (SSI or 2PL) with a retry loop. For no-overlap rules, a constraint (UNIQUE / exclusion) is the cleanest.</p>`, followUps: ['Why does FOR UPDATE fail for room bookings?', 'How does SSI detect it?'] },
    { q: 'How does MVCC work in PostgreSQL?', level: 'A', a: `<p>Each row version (tuple) has <code>xmin</code> (creating txn) and <code>xmax</code> (deleting/replacing txn). UPDATE writes a new tuple and sets xmax on the old one; DELETE sets xmax; ROLLBACK just marks the txn aborted in the commit log. A snapshot is (xmin, xmax, in-progress list); a tuple is visible if its creator is committed-in-snapshot and its deleter is not. Readers never block writers. Costs: dead tuples must be removed by VACUUM; long transactions pin the xmin horizon causing bloat; 32-bit xids require freezing to avoid wraparound. Updates touching indexed columns create new index entries unless HOT applies.</p>`, followUps: ['How does InnoDB differ (undo logs)?', 'What is a HOT update?'] },
    { q: 'What is two-phase locking and why does it guarantee serializability?', level: 'A', a: `<p>Each transaction first only acquires locks (growing phase) and then only releases them (shrinking phase). Order transactions by their <b>lock point</b> (when they acquired their last lock). Any conflict between Ti and Tj forces one to release before the other acquires, so the earlier one has the earlier lock point — every precedence edge goes forward in lock-point order, so the precedence graph is acyclic and the schedule is conflict-serializable. <b>Strict 2PL</b> holds write locks until commit to avoid cascading aborts; rigorous 2PL holds all locks. 2PL does not prevent deadlocks and needs predicate/range locks for phantoms.</p>`, followUps: ['What is a cascading abort?', 'How do next-key locks approximate predicate locks?'] },
    { q: 'How do databases detect and resolve deadlocks?', level: 'I', a: `<p>They maintain a <b>wait-for graph</b>: edge T1→T2 when T1 waits for a lock T2 holds. A cycle = deadlock. InnoDB checks on every wait; PostgreSQL checks after <code>deadlock_timeout</code> (1 s); SQL Server's monitor runs periodically. A <b>victim</b> is chosen (cheapest to roll back, e.g. fewest rows changed, or by DEADLOCK_PRIORITY) and receives an error (40P01 / 1213 / 1205); the app must retry the whole transaction. Prevention: consistent lock ordering, short transactions, indexes on FK columns, or timestamp schemes (wait-die, wound-wait) common in distributed DBs.</p>`, followUps: ['Why does Postgres wait 1 s before checking?', 'Compare wait-die and wound-wait.'] },
    { q: 'Design a job queue on a relational database that many workers can consume safely.', level: 'I', a: `<p>Table <code>jobs(id, status, payload, locked_by, lease_until)</code> with an index on <code>(status, id)</code>. A worker claims with <code>UPDATE jobs SET status='running', locked_by=$w, lease_until=now()+interval '5 min' WHERE id = (SELECT id FROM jobs WHERE status='queued' ORDER BY id LIMIT 1 FOR UPDATE SKIP LOCKED) RETURNING *</code> and commits immediately. SKIP LOCKED makes workers skip each other's rows instead of waiting. A reaper requeues jobs whose lease expired (worker died). Jobs must be idempotent because a worker can die after doing the work but before marking it done. At very high volume, move to a dedicated queue (Kafka, SQS).</p>`, followUps: ['Why commit the claim before doing the work?', 'How do you guarantee ordering per customer?'] },
    { q: 'When would you choose optimistic over pessimistic concurrency control?', level: 'I', a: `<p><b>Optimistic</b> (version column / compare-and-set) when conflicts are rare and transactions span user think-time or service calls: no locks held, no deadlocks, cheap. Cost: on conflict you redo the work, so under high contention retries explode. <b>Pessimistic</b> (<code>FOR UPDATE</code>) when conflicts are frequent and the critical section is short (inventory of a hot product, seat assignment): waiting is cheaper than repeated retries. Rule of thumb: conflict probability under ~5% and long edits → optimistic; hot rows and millisecond sections → pessimistic or atomic SQL.</p>`, followUps: ['How does JPA @Version work?', 'What about using updated_at timestamps as versions?'] },
    { q: 'What is Serializable Snapshot Isolation (SSI)?', level: 'E', a: `<p>SSI (Cahill et al. 2008, PostgreSQL SERIALIZABLE since 9.1) runs transactions under snapshot isolation but additionally tracks <b>read-write antidependencies</b> using non-blocking SIREAD locks. An rw-edge Ti→Tj means Ti read something Tj later overwrote. Every non-serializable SI execution contains a "dangerous structure": two consecutive rw-edges among concurrent transactions (a pivot with incoming and outgoing edge). When detected, one transaction is aborted with 40001. Readers still never block; the costs are memory for SIREAD locks (they may be coarsened to page/relation level, causing false positives) and retries. <code>READ ONLY DEFERRABLE</code> transactions wait for a safe snapshot and never abort.</p>`, followUps: ['Why can SSI produce false positives?', 'How is SSI different from strict 2PL in throughput?'] },
    { q: 'Your API returns "could not serialize access" errors after switching to SERIALIZABLE. What do you do?', level: 'A', a: `<p>That is SQLSTATE 40001 — expected behaviour, not a bug. (1) Add a generic retry wrapper that re-runs the <b>entire</b> transaction (new snapshot) with exponential backoff + jitter and a max attempt count. (2) Ensure the transaction is idempotent and has no external side effects inside (send emails after commit, use an outbox table). (3) Reduce conflicts: keep transactions short, add indexes so SSI tracks rows not whole pages/relations, mark read-only transactions <code>READ ONLY</code>. (4) Monitor the retry rate; hot spots may need redesign (counters, queues).</p>`, followUps: ['What is the transactional outbox pattern?', 'Why must you not retry just the failing statement?'] },
    { q: 'Explain lock granularity, intention locks and lock escalation.', level: 'A', a: `<p>Locks can cover a row, page or table. Fine granularity increases concurrency but costs memory and CPU. To let a table-level lock request check for row locks cheaply, transactions first place <b>intention locks</b> on the table: IS before row S locks, IX before row X locks, SIX for "read whole table, write some rows". A table S request conflicts with IX (someone writes rows inside); IX is compatible with IX, so writers of different rows do not block. <b>Lock escalation</b> (SQL Server, ~5,000 locks per statement) converts many row locks into one table lock to save memory — which can suddenly block everyone. PostgreSQL stores row locks in tuple headers and never escalates.</p>`, followUps: ['Why does IX not conflict with IX?', 'How would you avoid escalation in a big batch update?'] },
    { q: 'A long-running analytics query is making the OLTP database slow even though it only reads. Why, and how do you fix it?', level: 'E', a: `<p>Under MVCC the query's snapshot pins the <b>xmin horizon</b>: VACUUM (Postgres) or purge (InnoDB history list) cannot remove row versions it might need, so hot tables bloat, indexes grow, and InnoDB readers walk long undo chains. In lock-based engines it may also hold shared locks that block DDL, causing a lock queue pile-up. Fixes: run analytics on a replica (watch <code>hot_standby_feedback</code>, which pins the primary's horizon too) or a warehouse via CDC; set <code>statement_timeout</code>/<code>idle_in_transaction_session_timeout</code>; break the job into short transactions; monitor transaction age and n_dead_tup.</p>`, followUps: ['How does ORA-01555 relate to this?', 'What is the risk of disabling hot_standby_feedback?'] }
  );

  registerModule({
    id: 'sql12',
    title: 'Transactions, Isolation & Concurrency Control',
    intro: `<p>Databases serve thousands of users at the same instant. This module is about what keeps that from turning into chaos: <b>transactions</b> (all-or-nothing units of work), <b>ACID</b>, the <b>anomalies</b> that appear when transactions interleave (dirty read, non-repeatable read, phantom, read skew, lost update, write skew), the <b>isolation levels</b> that trade those anomalies for speed, and the two engines underneath — <b>locking (2PL)</b> and <b>MVCC</b> — plus <b>deadlocks</b> and how to survive them.</p>
<p>Every idea is shown as two transactions interleaving step by step, with live SQLite snippets (▶ Run) for the single-session parts and two-window PostgreSQL/MySQL scripts for the multi-session parts. Expect classic interview questions: "identify the anomaly", "pick the isolation level", "fix the lost update", "why did these two transfers deadlock", "how does Postgres MVCC decide what you see".</p>`,
    goals: [
      'Use BEGIN / COMMIT / ROLLBACK / SAVEPOINT correctly and explain what each ACID letter guarantees and which mechanism provides it',
      'Identify dirty reads, non-repeatable reads, phantoms, read skew, lost updates and write skew from a two-transaction schedule',
      'Choose the weakest correct isolation level per feature, knowing the real behaviour of PostgreSQL, MySQL InnoDB, SQL Server, Oracle and SQLite',
      'Fix races with atomic SQL, constraints, FOR UPDATE / SKIP LOCKED, optimistic version columns, materialized conflicts or SERIALIZABLE + retry',
      'Explain two-phase locking, lock modes and intention locks, and read PostgreSQL xmin/xmax visibility and VACUUM behaviour',
      'Detect deadlocks with a wait-for graph, prevent them with lock ordering, and write idempotent retry loops'
    ],
    prereqs: `<p>SQL 9 (DML, UPSERT) for INSERT/UPDATE patterns, SQL 10 (Index Internals) for why index ranges matter to locking, and SQL 5 (CTEs) for the recursive deadlock-detector queries. Basic idea of threads/concurrency from any programming language helps.</p>`,
    hours: 12,
    databases: { bank: DB_BANK, mvcc: DB_MVCC, locks: DB_LOCKS },
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
