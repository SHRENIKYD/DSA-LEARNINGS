(function () {
  var topics = [], practice = [], quiz = [], interview = [];

  /* ---------------- sample databases (SQLite dialect) ---------------- */
  // shop: one small online store. Every DML / UPSERT / view / trigger snippet in this module runs against a FRESH copy of it.
  var DB_SHOP = `PRAGMA foreign_keys = ON;
CREATE TABLE customers (
  id         INTEGER PRIMARY KEY,
  email      TEXT NOT NULL UNIQUE,
  name       TEXT NOT NULL,
  city       TEXT,
  tier       TEXT NOT NULL DEFAULT 'basic' CHECK (tier IN ('basic', 'gold')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE products (
  id          INTEGER PRIMARY KEY,
  sku         TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  category    TEXT NOT NULL,
  price_cents INTEGER NOT NULL CHECK (price_cents > 0),
  stock       INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  updated_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE orders (
  id          INTEGER PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(id),
  product_id  INTEGER NOT NULL REFERENCES products(id),
  qty         INTEGER NOT NULL CHECK (qty > 0),
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'shipped', 'cancelled')),
  created_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE employees (
  id         INTEGER PRIMARY KEY,
  name       TEXT NOT NULL,
  dept       TEXT NOT NULL,
  title      TEXT NOT NULL,
  salary     INTEGER NOT NULL,
  ssn        TEXT NOT NULL,
  email      TEXT NOT NULL UNIQUE,
  manager_id INTEGER REFERENCES employees(id)
);
CREATE TABLE page_views (
  page TEXT NOT NULL,
  day  TEXT NOT NULL,
  hits INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (page, day)
);
CREATE TABLE price_feed (
  sku TEXT PRIMARY KEY, name TEXT NOT NULL, category TEXT NOT NULL,
  price_cents INTEGER NOT NULL, stock INTEGER NOT NULL
);
CREATE TABLE deliveries (id INTEGER PRIMARY KEY, sku TEXT NOT NULL, qty INTEGER NOT NULL CHECK (qty > 0));
CREATE TABLE users (
  id         INTEGER PRIMARY KEY,
  email      TEXT NOT NULL,
  name       TEXT NOT NULL,
  deleted_at TEXT
);
CREATE UNIQUE INDEX ux_users_email_live ON users(email) WHERE deleted_at IS NULL;
CREATE TABLE accounts (id INTEGER PRIMARY KEY, owner TEXT NOT NULL, balance INTEGER NOT NULL CHECK (balance >= 0));
CREATE TABLE contacts (id INTEGER PRIMARY KEY, email TEXT NOT NULL, name TEXT NOT NULL);
CREATE TABLE audit_log (
  id         INTEGER PRIMARY KEY,
  table_name TEXT NOT NULL,
  row_id     INTEGER,
  action     TEXT NOT NULL,
  old_data   TEXT,
  new_data   TEXT,
  changed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO customers (id, email, name, city, tier, created_at) VALUES
  (1, 'asha@mail.com', 'Asha', 'Bengaluru', 'gold',  '2026-01-10 09:00:00'),
  (2, 'ben@mail.com',  'Ben',  'London',    'basic', '2026-02-03 18:30:00'),
  (3, 'chen@mail.com', 'Chen', 'Shanghai',  'basic', '2026-03-21 12:15:00'),
  (4, 'dara@mail.com', 'Dara', 'Austin',    'gold',  '2026-04-02 08:45:00');
INSERT INTO products (id, sku, name, category, price_cents, stock, updated_at) VALUES
  (1, 'PH-001', 'Pixel Phone',  'phones',      49900,  10, '2026-09-01 00:00:00'),
  (2, 'CB-002', 'USB-C Cable',  'accessories',   999, 200, '2026-09-01 00:00:00'),
  (3, 'BK-003', 'SQL Book',     'books',        2999,  15, '2026-09-01 00:00:00'),
  (4, 'HP-004', 'Headphones',   'accessories',  7999,   0, '2026-09-01 00:00:00'),
  (5, 'BK-005', 'DB Internals', 'books',        4599,   3, '2026-09-01 00:00:00');
INSERT INTO orders (id, customer_id, product_id, qty, status, created_at) VALUES
  (1, 1, 1, 1, 'paid',      '2026-09-01 10:00:00'),
  (2, 1, 3, 2, 'shipped',   '2026-09-02 11:00:00'),
  (3, 2, 2, 3, 'pending',   '2026-09-02 15:30:00'),
  (4, 3, 5, 1, 'paid',      '2026-09-03 09:10:00'),
  (5, 4, 2, 1, 'cancelled', '2026-09-03 18:00:00'),
  (6, 2, 3, 1, 'pending',   '2026-08-15 08:00:00');
INSERT INTO employees (id, name, dept, title, salary, ssn, email, manager_id) VALUES
  (1, 'Asha', 'Eng',   'Eng Manager',  250000, '111-11-1111', 'asha@corp.com', NULL),
  (2, 'Ben',  'Eng',   'Engineer',     180000, '222-22-2222', 'ben@corp.com',  1),
  (3, 'Chen', 'Sales', 'Account Exec',  90000, '333-33-3333', 'chen@corp.com', NULL),
  (4, 'Dara', 'HR',    'HR Partner',   110000, '444-44-4444', 'dara@corp.com', NULL),
  (5, 'Eli',  'Eng',   'Engineer',     170000, '555-55-5555', 'eli@corp.com',  1);
INSERT INTO page_views (page, day, hits) VALUES
  ('home', '2026-10-01', 120), ('pricing', '2026-10-01', 30), ('home', '2026-10-02', 95);
INSERT INTO price_feed (sku, name, category, price_cents, stock) VALUES
  ('PH-001', 'Pixel Phone',   'phones',      47900,   8),
  ('CB-002', 'USB-C Cable',   'accessories',   999, 180),
  ('BK-003', 'SQL Book',      'books',        2999,  15),
  ('KB-006', 'Mech Keyboard', 'accessories',  3499,  25);
INSERT INTO deliveries (id, sku, qty) VALUES (1, 'CB-002', 50), (2, 'CB-002', 30), (3, 'HP-004', 20), (4, 'ZZ-999', 5);
INSERT INTO users (id, email, name, deleted_at) VALUES
  (1, 'asha@mail.com', 'Asha', NULL),
  (2, 'ben@mail.com',  'Ben',  '2026-08-01 10:00:00'),
  (3, 'chen@mail.com', 'Chen', NULL);
INSERT INTO accounts (id, owner, balance) VALUES (1, 'Asha', 1000), (2, 'Ben', 250), (3, 'Chen', 0);
INSERT INTO contacts (id, email, name) VALUES
  (1, 'asha@mail.com', 'Asha'), (2, 'ben@mail.com', 'Ben'), (3, 'ASHA@mail.com', 'Asha K'),
  (4, 'ben@mail.com', 'Benjamin'), (5, 'chen@mail.com', 'Chen'), (6, 'ben@mail.com', 'Ben B');`;

  // lab: an EMPTY database (foreign keys on) for fully self-contained snippets.
  var DB_LAB = `PRAGMA foreign_keys = ON;`;

  /* ---------------- snippet helpers ---------------- */
  function shop(code, title) { return { lang: 'sql', db: 'shop', code: code, title: title || 'Runs on the shop database (▶ Run it)' }; }
  function lab(code, title) { return { lang: 'sql', db: 'lab', code: code, title: title || 'Self-contained SQL on an empty database (▶ Run it)' }; }
  function pg(code, title) { return { lang: 'sql', code: code, title: title || 'PostgreSQL (reference only, not runnable in the SQLite playground)', check: false }; }
  function my(code, title) { return { lang: 'sql', code: code, title: title || 'MySQL (reference only, not runnable in the SQLite playground)', check: false }; }

  /* ---------------- visualizer helpers ---------------- */
  function esc(s) { return String(s === undefined || s === null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function cp(rows) { return rows.map(function (r) { return r.slice(); }); }
  function one(k, cls) { var h = {}; h[k] = cls; return h; }
  function many(ks, cls) { var h = {}; ks.forEach(function (k) { h[k] = cls; }); return h; }
  function tbl(label, cols, rows, hl) { return { type: 'table', label: label, columns: cols.slice(), rows: cp(rows), hl: hl || {} }; }
  function sqlPart(code, hl, label) { return { type: 'code', label: label || 'Statement', lang: 'sql', code: code, hl: hl || {} }; }
  function txt(html, label) { return { type: 'text', label: label, html: html }; }
  function strIn(input) { return String(input === undefined || input === null ? '' : input); }
  function q(v) { return v === null ? 'NULL' : typeof v === 'number' ? String(v) : "'" + String(v).replace(/'/g, "''") + "'"; }

  /* A tiny DML simulator: INSERT / UPDATE / DELETE on one in-memory table, enforcing
     NOT NULL, UNIQUE and CHECK the way SQLite does (statement-level atomicity). */
  function dmlSim(spec, input) {
    var cols = spec.cols, rows = cp(spec.rows), frames = [];
    var cmds = strIn(input).split(/;|\n/).map(function (s) { return s.trim(); }).filter(function (s) { return s.length; });
    if (!cmds.length) throw new Error('Type statements separated by ";" — e.g. ' + spec.example);
    if (cmds.length > 8) throw new Error('Use at most 8 statements');
    function ci(name) {
      var k = -1;
      cols.forEach(function (c, i) { if (c.toLowerCase() === String(name).trim().toLowerCase()) k = i; });
      if (k < 0) throw new Error('Unknown column "' + name + '". Columns are: ' + cols.join(', '));
      return k;
    }
    function lit(s) {
      s = String(s).trim();
      if (/^null$/i.test(s)) return null;
      if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s);
      return s.replace(/^'(.*)'$/, '$1');
    }
    function parseCond(str) {
      return str.split(/\s+and\s+/i).map(function (p) {
        var m = p.trim().match(/^(\w+)\s+is\s+(not\s+)?null$/i);
        if (m) return { c: ci(m[1]), op: m[2] ? 'notnull' : 'isnull' };
        m = p.trim().match(/^(\w+)\s*(<=|>=|!=|<>|=|<|>)\s*(.+)$/);
        if (!m) throw new Error('Cannot read condition "' + p + '". Use: column op value (e.g. stock = 0)');
        return { c: ci(m[1]), op: m[2], v: lit(m[3]) };
      });
    }
    function test(row, conds) {
      return conds.every(function (k) {
        var a = row[k.c];
        if (k.op === 'isnull') return a === null;
        if (k.op === 'notnull') return a !== null;
        if (a === null || k.v === null) return false; // NULL compared with anything is UNKNOWN -> row not matched
        switch (k.op) {
          case '=': return a == k.v; case '!=': case '<>': return a != k.v;
          case '<': return a < k.v; case '>': return a > k.v; case '<=': return a <= k.v; default: return a >= k.v;
        }
      });
    }
    function evalExpr(row, e) {
      var m = String(e).trim().match(/^(\w+)\s*([+\-*])\s*(-?\d+(\.\d+)?)$/);
      if (m) {
        var a = row[ci(m[1])], b = Number(m[3]);
        if (a === null) return null;
        return m[2] === '+' ? a + b : m[2] === '-' ? a - b : Math.round(a * b);
      }
      var w = String(e).trim();
      for (var i = 0; i < cols.length; i++) if (cols[i].toLowerCase() === w.toLowerCase()) return row[i];
      return lit(w);
    }
    function violation(all, idx) {
      var r = all[idx], i, j;
      for (i = 0; i < (spec.notNull || []).length; i++) if (r[spec.notNull[i]] === null) return 'NOT NULL constraint failed: ' + spec.table + '.' + cols[spec.notNull[i]];
      for (i = 0; i < (spec.unique || []).length; i++) {
        var c = spec.unique[i];
        for (j = 0; j < all.length; j++) if (j !== idx && r[c] !== null && all[j][c] === r[c]) return 'UNIQUE constraint failed: ' + spec.table + '.' + cols[c] + ' (value ' + r[c] + ' already exists)';
      }
      for (i = 0; i < (spec.checks || []).length; i++) if (!spec.checks[i].fn(r)) return 'CHECK constraint failed: ' + spec.checks[i].text;
      return null;
    }
    frames.push({ narr: 'Starting state of <b>' + spec.table + '</b>. Each statement below runs on its own. Watch the row colours: ' +
      '<span class="c-g">green = inserted</span>, <span class="c-y">amber = updated</span>, <span class="c-r">red = deleted / rejected</span>.',
      parts: [tbl(spec.table + ' (before)', cols, rows), txt('Constraints: ' + esc(spec.rules), 'Rules the database enforces')] });
    cmds.forEach(function (cmd) {
      var m, sql, conds, matched, i;
      if ((m = cmd.match(/^insert\s+(.+)$/i))) {
        var vals = m[1].split(',').map(lit);
        if (vals.length !== cols.length) throw new Error('INSERT needs ' + cols.length + ' comma-separated values (' + cols.join(', ') + ')');
        sql = 'INSERT INTO ' + spec.table + ' (' + cols.join(', ') + ')\nVALUES (' + vals.map(q).join(', ') + ');';
        var trial = cp(rows); trial.push(vals);
        var v = violation(trial, trial.length - 1);
        if (v) {
          frames.push({ narr: '<span class="c-r">Rejected.</span> The new row breaks a rule: <b>' + esc(v) + '</b>. SQLite aborts the statement, so nothing is written.',
            parts: [sqlPart(sql, { 1: 'bad', 2: 'bad' }), tbl(spec.table + ' (attempted row in red)', cols, trial, one(trial.length - 1, 'bad'))] });
          frames.push({ narr: 'After the failed INSERT the table is <b>exactly</b> as before — a statement is all-or-nothing.', parts: [tbl(spec.table + ' (unchanged)', cols, rows)] });
        } else {
          rows = trial;
          frames.push({ narr: '<span class="c-g">Inserted.</span> All constraints passed, so the row is appended. ' + (vals.indexOf(null) >= 0 ? 'A NULL in a nullable column is fine — NULL just means "unknown".' : ''),
            parts: [sqlPart(sql, { 1: 'ok', 2: 'ok' }), tbl(spec.table + ' (after)', cols, rows, one(rows.length - 1, 'ok'))] });
        }
        return;
      }
      if ((m = cmd.match(/^update\s+(.+?)(?:\s+where\s+(.+))?$/i))) {
        var sets = m[1].split(',').map(function (s) {
          var mm = s.match(/^\s*(\w+)\s*=\s*(.+)$/);
          if (!mm) throw new Error('Cannot read "' + s + '". Use: UPDATE col = expr WHERE col op value');
          return { c: ci(mm[1]), e: mm[2].trim() };
        });
        conds = m[2] ? parseCond(m[2]) : [];
        sql = 'UPDATE ' + spec.table + '\nSET ' + sets.map(function (s) { return cols[s.c] + ' = ' + s.e; }).join(', ') + (m[2] ? '\nWHERE ' + m[2] : '') + ';';
        matched = [];
        rows.forEach(function (r, k) { if (test(r, conds)) matched.push(k); });
        frames.push({ narr: (m[2] ? 'Step 1 — the WHERE clause finds the target rows: <b>' + matched.length + '</b> match (blue). ' : '<span class="c-r">No WHERE clause!</span> Every one of the <b>' + rows.length + '</b> rows is a target. ') +
          (matched.length ? 'Each matched row will be rewritten.' : 'Zero matches is not an error — the statement simply changes 0 rows.'),
          parts: [sqlPart(sql, m[2] ? { 3: 'cur' } : { 1: 'bad' }), tbl(spec.table + ' (targets in blue)', cols, rows, many(matched, 'win'))] });
        var next = cp(rows);
        matched.forEach(function (k) { var old = rows[k]; sets.forEach(function (s) { next[k][s.c] = evalExpr(old, s.e); }); });
        var bad = null, badRow = -1;
        for (i = 0; i < matched.length && !bad; i++) { bad = violation(next, matched[i]); if (bad) badRow = matched[i]; }
        if (bad) {
          frames.push({ narr: '<span class="c-r">Aborted.</span> Row ' + (badRow + 1) + ' would become invalid — <b>' + esc(bad) + '</b>. The whole UPDATE is undone, including rows that were fine.',
            parts: [sqlPart(sql, { 2: 'bad' }), tbl(spec.table + ' (what it tried to write)', cols, next, one(badRow, 'bad'))] });
          frames.push({ narr: 'Table after the aborted UPDATE: unchanged. Statement-level atomicity protects you from half-applied updates.', parts: [tbl(spec.table + ' (unchanged)', cols, rows)] });
        } else {
          rows = next;
          frames.push({ narr: 'Step 2 — the SET clause is applied to every target (amber). Every right-hand side reads the <b>old</b> row values, then all constraints are re-checked: they pass. ' + matched.length + ' row(s) changed.',
            parts: [sqlPart(sql, { 2: 'ok' }), tbl(spec.table + ' (after)', cols, rows, many(matched, 'cur'))] });
        }
        return;
      }
      if ((m = cmd.match(/^delete(?:\s+where\s+(.+))?$/i))) {
        conds = m[1] ? parseCond(m[1]) : [];
        sql = 'DELETE FROM ' + spec.table + (m[1] ? '\nWHERE ' + m[1] : '') + ';';
        matched = [];
        rows.forEach(function (r, k) { if (test(r, conds)) matched.push(k); });
        frames.push({ narr: (m[1] ? 'The WHERE clause picks <b>' + matched.length + '</b> row(s) to delete (red).' : '<span class="c-r">DELETE with no WHERE removes every row!</span>') + ' Tip: run the same WHERE as a SELECT first.',
          parts: [sqlPart(sql, m[1] ? { 2: 'bad' } : { 1: 'bad' }), tbl(spec.table + ' (rows to delete in red)', cols, rows, many(matched, 'bad'))] });
        var gone = matched.map(function (k) { return rows[k]; });
        rows = rows.filter(function (r, k) { return matched.indexOf(k) < 0; });
        frames.push({ narr: matched.length + ' row(s) removed. The remaining rows are untouched.',
          parts: [tbl(spec.table + ' (after)', cols, rows), tbl('deleted rows (gone for good unless you archived them)', cols, gone, many(gone.map(function (_, k) { return k; }), 'bad'))] });
        return;
      }
      throw new Error('Unknown statement "' + cmd + '". Start each with INSERT, UPDATE or DELETE.');
    });
    frames.push({ narr: 'Final state after all statements. Compare it with the first frame — every change is explained by one of the statements above.', parts: [tbl(spec.table + ' (final)', cols, rows)] });
    return frames;
  }

  /* ======================= TOPIC 1: INSERT patterns ======================= */
  var CUST_COLS = ['id', 'email', 'name', 'city'];
  var CUST_ROWS = [[1, 'asha@mail.com', 'Asha', 'Bengaluru'], [2, 'ben@mail.com', 'Ben', 'London'], [3, 'chen@mail.com', 'Chen', 'Shanghai'], [4, 'dara@mail.com', 'Dara', 'Austin']];

  topics.push({
    title: 'INSERT Patterns: Single, Multi-Row, INSERT … SELECT, Defaults & RETURNING',
    analogy: `<p>Think of a table as a <b>guest register at a hotel desk</b>. Writing one guest per line is a plain <code>INSERT</code>. A tour group handing over a printed list is a <b>multi-row INSERT</b>. Copying names from another hotel's booking sheet is <b>INSERT … SELECT</b>. Leaving the "check-in time" box blank so the clerk stamps it is a <b>DEFAULT</b>. And asking the clerk "which room number did you give me?" before walking away is <b>RETURNING</b>.</p>`,
    explain: `<p><b>DML</b> (Data Manipulation Language) is the part of SQL that <i>changes</i> data: <code>INSERT</code> adds rows, <code>UPDATE</code> changes rows, <code>DELETE</code> removes rows. This topic is all about adding rows the right way.</p>
<p><b>The five shapes of INSERT you will use every week:</b></p>
${H.table(['Shape', 'Looks like', 'Use it when'], [
  ['Single row', '<code>INSERT INTO t (a, b) VALUES (1, 2);</code>', 'A user signs up, one order is placed'],
  ['Multi-row', '<code>VALUES (1, 2), (3, 4), (5, 6)</code>', 'Seeding, small batches — one round trip, one atomic unit'],
  ['INSERT … SELECT', '<code>INSERT INTO t (a, b) SELECT x, y FROM s WHERE …</code>', 'Copying / transforming rows that are already in the database'],
  ['Defaults', '<code>INSERT INTO t DEFAULT VALUES;</code> or simply leave columns out', 'Let the database fill ids, timestamps, status flags'],
  ['RETURNING', '<code>INSERT … RETURNING id, created_at;</code>', 'You need the generated id / defaults back without a second query']
])}
<p><b>Golden rule: always name the columns.</b> <code>INSERT INTO customers VALUES (…)</code> depends on the column <i>order</i>. The day someone adds a column, every such statement breaks or — worse — silently puts the city into the email column.</p>
<p><b>Constraints are the bouncers.</b> Every inserted row is checked against <code>NOT NULL</code>, <code>UNIQUE</code>, <code>PRIMARY KEY</code>, <code>CHECK</code> and <code>FOREIGN KEY</code>. If a single row fails, the <i>whole statement</i> is cancelled — even in a 1,000-row multi-row insert, zero rows land. That is called <b>statement-level atomicity</b>.</p>
${H.table(['Attempted row', 'Result', 'Why'], [
  ['(5, eve@mail.com, Eve)', H.c('g', 'inserted'), 'all rules pass'],
  ['(6, asha@mail.com, Asha 2)', H.c('r', 'rejected'), 'email must be UNIQUE'],
  ['(2, fay@mail.com, Fay)', H.c('r', 'rejected'), 'id 2 already exists (PRIMARY KEY)'],
  ['(8, NULL, Hal)', H.c('r', 'rejected'), 'email is NOT NULL']
])}
<p><b>Generated ids.</b> In SQLite an <code>INTEGER PRIMARY KEY</code> column is filled automatically if you leave it out. Postgres uses <code>GENERATED ALWAYS AS IDENTITY</code>, MySQL <code>AUTO_INCREMENT</code>. To learn the new id, use <code>RETURNING id</code> (SQLite ≥ 3.35, Postgres, MariaDB) — no race-prone "SELECT MAX(id)" afterwards.</p>`,
    clues: ['"return the id of the newly created row" → <code>INSERT … RETURNING id</code>', '"copy / archive / backfill rows from another table" → <code>INSERT … SELECT</code>', '"load 1 million rows fast" → multi-row VALUES inside one transaction (or COPY / LOAD DATA)', '"the column should be filled automatically" → DEFAULT / identity / generated column', '"what happens if one row in the batch is invalid?" → statement-level atomicity: none are inserted', '"insert only if it does not exist yet" → that is an UPSERT question (next topics)'],
    code: [shop(`-- 1) Single row: ALWAYS list the columns. id, tier and created_at come from defaults.
INSERT INTO customers (email, name, city)
VALUES ('eve@mail.com', 'Eve', 'Paris');

-- 2) Many rows in ONE statement: one round trip, and all-or-nothing.
INSERT INTO customers (email, name, city, tier) VALUES
  ('fay@mail.com', 'Fay', 'Rome', 'basic'),
  ('gus@mail.com', 'Gus', NULL,   'gold');   -- NULL city is allowed (column is nullable)

-- 3) RETURNING hands back generated values without a second query.
INSERT INTO products (sku, name, category, price_cents, stock)
VALUES ('KB-006', 'Mech Keyboard', 'accessories', 3499, 25)
RETURNING id, sku, stock, updated_at;

-- 4) Check the result.
SELECT id, email, name, city, tier FROM customers ORDER BY id;`, 'Single, multi-row and RETURNING (▶ Run)'),
      shop(`-- INSERT ... SELECT: copy rows that already live in the database.
CREATE TABLE gold_mailing_list (
  email    TEXT PRIMARY KEY,
  name     TEXT NOT NULL,
  added_on TEXT NOT NULL DEFAULT (date('now'))   -- expression default needs parentheses
);

INSERT INTO gold_mailing_list (email, name)
SELECT email, name
FROM customers
WHERE tier = 'gold';              -- any SELECT works: joins, GROUP BY, CTEs...

-- DEFAULT VALUES: a row made only of defaults (handy for counters / sequences).
CREATE TABLE tickets (id INTEGER PRIMARY KEY, status TEXT NOT NULL DEFAULT 'open');
INSERT INTO tickets DEFAULT VALUES;
INSERT INTO tickets DEFAULT VALUES;

SELECT * FROM gold_mailing_list;
SELECT * FROM tickets;`, 'INSERT … SELECT and DEFAULT VALUES (▶ Run)')],
    viz: [{
      title: 'Insert rows one statement at a time — watch the constraints act as bouncers',
      input: 'INSERT 5, eve@mail.com, Eve, Paris; INSERT 6, asha@mail.com, Asha Two, Delhi; INSERT 2, fay@mail.com, Fay, Rome; INSERT 7, gus@mail.com, Gus, NULL; INSERT 8, NULL, Hal, Oslo',
      inputLabel: 'Statements separated by ; (INSERT id, email, name, city — also UPDATE col = expr WHERE … / DELETE WHERE …)',
      gen: function (input) {
        return dmlSim({ table: 'customers', cols: CUST_COLS, rows: CUST_ROWS, unique: [0, 1], notNull: [0, 1, 2], checks: [],
          rules: 'id PRIMARY KEY (unique, not null), email NOT NULL UNIQUE, name NOT NULL, city nullable',
          example: 'INSERT 5, eve@mail.com, Eve, Paris' }, input);
      }
    }, {
      title: 'INSERT … SELECT … RETURNING: copying gold customers into a mailing list',
      gen: function () {
        var src = [[1, 'asha@mail.com', 'Asha', 'gold'], [2, 'ben@mail.com', 'Ben', 'basic'], [3, 'chen@mail.com', 'Chen', 'basic'], [4, 'dara@mail.com', 'Dara', 'gold']];
        var sc = ['id', 'email', 'name', 'tier'], tc = ['email', 'name', 'added_on'];
        var code = "INSERT INTO gold_mailing_list (email, name)\nSELECT email, name\nFROM customers\nWHERE tier = 'gold'\nRETURNING email, added_on;";
        var f = [];
        f.push({ narr: 'The target table starts empty. <code>added_on</code> is not in the column list, so its DEFAULT (today) will be used.', parts: [sqlPart(code), tbl('customers (source)', sc, src), tbl('gold_mailing_list (target)', tc, [])] });
        f.push({ narr: 'The inner SELECT runs first, exactly like any query: FROM customers, WHERE tier = \'gold\'. Rows 1 and 4 survive (blue).', parts: [sqlPart(code, { 2: 'cur', 3: 'cur', 4: 'cur' }), tbl('customers (source)', sc, src, { 0: 'win', 3: 'win' }), tbl('gold_mailing_list (target)', tc, [])] });
        var t = [];
        t.push(['asha@mail.com', 'Asha', '2026-10-14']);
        f.push({ narr: 'Each selected row becomes a new row in the target. Asha is inserted; the missing column gets its default.', parts: [sqlPart(code, { 1: 'ok' }), tbl('customers (source)', sc, src, { 0: 'ok', 3: 'win' }), tbl('gold_mailing_list (target)', tc, t, { 0: 'ok' })] });
        t.push(['dara@mail.com', 'Dara', '2026-10-14']);
        f.push({ narr: 'Dara is inserted too. If either row had broken a constraint (say the email was already in the list), <b>both</b> would be rolled back.', parts: [sqlPart(code, { 1: 'ok' }), tbl('customers (source)', sc, src, { 0: 'ok', 3: 'ok' }), tbl('gold_mailing_list (target)', tc, t, { 0: 'ok', 1: 'ok' })] });
        f.push({ narr: '<code>RETURNING</code> sends the inserted rows straight back to the caller — no second SELECT, no race with other writers.', parts: [sqlPart(code, { 5: 'ok' }), tbl('RETURNING result set', ['email', 'added_on'], [['asha@mail.com', '2026-10-14'], ['dara@mail.com', '2026-10-14']], { 0: 'sel', 1: 'sel' })] });
        return f;
      }
    }],
    examples: [
      { title: 'Why you must always list the columns', html: `<p>Imagine the team adds <code>phone</code> after <code>name</code>. The old statement <code>INSERT INTO customers VALUES (9, 'x@mail.com', 'X', 'Paris', 'basic', '2026-01-01')</code> now has 6 values for 7 columns and fails in production — or, if the counts happen to match, puts <code>'Paris'</code> in <code>phone</code>. Naming columns makes inserts survive schema changes.</p>`, code: shop(`-- Robust: survives new columns being added later.
INSERT INTO customers (email, name, city) VALUES ('ivy@mail.com', 'Ivy', 'Oslo');
SELECT id, email, name, city, tier FROM customers WHERE email = 'ivy@mail.com';`) },
      { title: 'One bad row cancels the whole batch', html: `<p>A three-row INSERT where the middle row repeats an existing email. SQLite stops at the UNIQUE violation and undoes the first row too. The snippet below uses <code>INSERT OR IGNORE</code> instead so the script can finish: it skips bad rows instead of aborting — useful, but it hides errors, so use it on purpose only.</p>`, code: shop(`-- Plain INSERT would fail on 'ben@mail.com' and insert NOTHING.
-- INSERT OR IGNORE skips just the conflicting row (SQLite conflict clause).
INSERT OR IGNORE INTO customers (email, name) VALUES
  ('jo@mail.com', 'Jo'),
  ('ben@mail.com', 'Ben Again'),   -- duplicate email -> silently skipped
  ('kai@mail.com', 'Kai');
SELECT id, email, name FROM customers ORDER BY id;   -- Jo and Kai are in, Ben unchanged`) },
      { title: 'Fast bulk load: one transaction, many rows', html: `<p>Inserting 100,000 rows one autocommit statement at a time forces the database to flush to disk 100,000 times. Wrapping them in <code>BEGIN … COMMIT</code> flushes once — often 100× faster. Multi-row VALUES also cuts network round trips. For truly huge loads use <code>COPY</code> (Postgres) or <code>LOAD DATA INFILE</code> (MySQL).</p>`, code: shop(`BEGIN;
-- A recursive CTE generates 1,000 fake page-view rows in one INSERT ... SELECT.
WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM n WHERE i < 1000)
INSERT INTO page_views (page, day, hits)
SELECT 'p' || i, '2026-10-03', i % 50 FROM n;
COMMIT;
SELECT COUNT(*) AS rows_now, SUM(hits) AS total_hits FROM page_views;`) },
      { title: 'CREATE TABLE AS SELECT copies data but not the rules', html: `<p><code>CREATE TABLE products_backup AS SELECT * FROM products;</code> is a quick snapshot, but the copy has <b>no primary key, no UNIQUE, no CHECK, no defaults</b>. For a real copy, create the table with full DDL first, then <code>INSERT … SELECT</code>.</p>`, code: shop(`CREATE TABLE products_backup AS SELECT * FROM products;
-- The backup's schema: no constraints survived.
SELECT sql FROM sqlite_master WHERE name = 'products_backup';`) }
    ],
    deepDive: `<p><b>Getting the generated key.</b> Options in order of preference: <code>RETURNING</code> (SQLite 3.35+, Postgres, MariaDB 10.5+; SQL Server uses <code>OUTPUT inserted.id</code>); driver APIs like JDBC <code>getGeneratedKeys()</code>; session functions <code>last_insert_rowid()</code> / <code>LAST_INSERT_ID()</code> / <code>currval()</code>, which are per-connection and therefore safe, but awkward for multi-row inserts. Never use <code>SELECT MAX(id)</code> — another session can insert in between.</p>
<p><b>Ids have gaps.</b> Sequences / AUTO_INCREMENT hand out numbers that are never given back when a transaction rolls back, so ids 1, 2, 5 are normal. Never use ids as "row counts" or invoice numbers that must be gap-free.</p>
<p><b>Throughput.</b> On disk, each autocommit INSERT waits for an fsync (a few ms). Batching in one transaction, multi-row VALUES (watch parameter limits: SQLite 32,766 host parameters, Postgres 65,535) and prepared statements are the big three. Bulk paths (<code>COPY</code>, <code>LOAD DATA</code>, SQLite <code>.import</code>) skip SQL parsing per row. Drop or defer secondary indexes for one-off giant loads, then rebuild.</p>
<p><b>Order of RETURNING rows</b> is not guaranteed to match the VALUES order in every engine — match on a natural key if you need to pair them up. Also remember INSERT fires <code>BEFORE/AFTER INSERT</code> triggers per row, and foreign keys are checked per row (or at commit if <code>DEFERRABLE INITIALLY DEFERRED</code>).</p>`,
    aiEra: `<p><b>What AI changes:</b> assistants and ORMs write INSERT statements instantly, including multi-row batches and seed data. Ask: <code>Generate 20 realistic INSERT rows for this schema, include 3 rows that should violate a constraint and label them</code> — perfect test data.</p>
<p><b>Where AI goes wrong:</b> it often omits the column list, builds SQL with string concatenation (SQL injection), uses <code>SELECT MAX(id)</code> to fetch the new key, or loops one INSERT per row without a transaction. It also guesses dialect — <code>RETURNING</code> does not exist in MySQL.</p>
<p><b>What you still own:</b> knowing that one bad row aborts the batch, choosing parameterized statements, picking the bulk-load path, and reading the constraint error to fix the data instead of disabling the constraint.</p>`
  });

  /* ======================= TOPIC 2: UPDATE & DELETE patterns ======================= */
  var PROD_COLS = ['id', 'sku', 'name', 'category', 'price', 'stock'];
  var PROD_ROWS = [[1, 'PH-001', 'Pixel Phone', 'phones', 49900, 10], [2, 'CB-002', 'USB-C Cable', 'accessories', 999, 200], [3, 'BK-003', 'SQL Book', 'books', 2999, 15], [4, 'HP-004', 'Headphones', 'accessories', 7999, 0], [5, 'BK-005', 'DB Internals', 'books', 4599, 3]];

  topics.push({
    title: 'UPDATE & DELETE Patterns: Safe Edits, Joins, Dedupes and Batches',
    analogy: `<p>An <code>UPDATE</code> is a <b>teacher correcting marks with a red pen</b>: first decide <i>whose</i> papers (WHERE), then write the new mark (SET). A <code>DELETE</code> is the <b>shredder</b>. A good teacher first pulls out the papers, double-checks the pile, and only then reaches for the pen or the shredder. Forgetting the WHERE is grabbing the <i>whole stack</i> by mistake.</p>`,
    explain: `<p><b>UPDATE</b> = <code>UPDATE table SET col = new_value WHERE which_rows;</code>. <b>DELETE</b> = <code>DELETE FROM table WHERE which_rows;</code>. The WHERE clause works exactly like in a SELECT. No WHERE = <b>every row</b>.</p>
<p><b>How an UPDATE really runs:</b></p>
<ol><li>Find the target rows with WHERE (uses indexes just like a SELECT).</li>
<li>For each target, compute every SET expression using the <b>old</b> values of that row — so <code>SET a = b, b = a</code> really swaps.</li>
<li>Re-check every constraint on the new row. Any failure → the <i>entire</i> statement is undone.</li></ol>
${H.table(['Pattern', 'SQL shape', 'Why'], [
  ['Preview first', '<code>SELECT … WHERE X;</code> then <code>UPDATE … WHERE X;</code>', 'see exactly which rows will change'],
  ['Relative update', '<code>SET stock = stock - 1</code>', 'atomic — no read-modify-write race'],
  ['Many different values', '<code>SET price = CASE id WHEN 1 THEN … WHEN 2 THEN … END</code>', 'one statement instead of N'],
  ['Update from another table', '<code>UPDATE t SET … FROM s WHERE t.k = s.k</code>', 'restock, sync, backfill'],
  ['Delete by relationship', '<code>DELETE … WHERE NOT EXISTS (…)</code>', 'orphans, never-ordered products'],
  ['Dedupe', '<code>DELETE … WHERE id NOT IN (SELECT MIN(id) … GROUP BY key)</code>', 'keep one copy per key'],
  ['Batch delete', '<code>DELETE … WHERE id IN (SELECT id … LIMIT 1000)</code>, repeat', 'avoid giant locks and log bloat']
])}
<p><b>The lost-update trap.</b> Reading stock into the app (<code>s = 10</code>), subtracting in code, and writing back <code>SET stock = 9</code> is broken when two buyers do it at the same time — both write 9. Write the arithmetic <i>in SQL</i> (<code>SET stock = stock - 1 WHERE id = 2 AND stock &gt;= 1</code>) and check how many rows changed.</p>
<p><b>DELETE vs TRUNCATE vs DROP:</b> DELETE removes chosen rows (logged row by row, fires triggers); <code>TRUNCATE</code> (Postgres/MySQL) empties the whole table fast, usually without row triggers; <code>DROP TABLE</code> removes the table itself. SQLite has no TRUNCATE — a WHERE-less DELETE is optimized into one.</p>`,
    clues: ['"increase all prices in category X by 10%" → UPDATE with WHERE + arithmetic in SET', '"update table A using values from table B" → <code>UPDATE … FROM</code> (aggregate B first!)', '"remove duplicate rows, keep the earliest" → DELETE with MIN(id)/ROW_NUMBER subquery', '"delete rows that have no matching child" → DELETE … WHERE NOT EXISTS', '"two users buy the last item at the same time" → relative update + guard in WHERE', '"purge 50 million old rows without downtime" → batched deletes / partition drop'],
    code: [shop(`-- Safe-update workflow: preview, change inside a transaction, inspect, commit.
SELECT id, name, price_cents FROM products WHERE category = 'books';   -- 1) preview

BEGIN;                                                                  -- 2) safety net
UPDATE products
SET price_cents = CAST(ROUND(price_cents * 1.10) AS INTEGER),          -- +10%, whole cents
    updated_at  = CURRENT_TIMESTAMP
WHERE category = 'books'
RETURNING id, name, price_cents;                                        -- 3) see what changed
COMMIT;                                                                 -- (or ROLLBACK if wrong)

-- Relative update with a guard: only sell if stock is available (no lost update).
UPDATE products SET stock = stock - 1 WHERE id = 2 AND stock >= 1;
SELECT changes() AS rows_changed;                                       -- 1 = sold, 0 = sold out

-- Different values per row in ONE statement.
UPDATE products
SET stock = CASE id WHEN 4 THEN 40 WHEN 5 THEN 30 ELSE stock END
WHERE id IN (4, 5);
SELECT id, name, price_cents, stock FROM products ORDER BY id;`, 'UPDATE patterns (▶ Run)'),
      shop(`-- UPDATE ... FROM (SQLite 3.33+, Postgres): restock from the deliveries table.
-- Aggregate FIRST so every product matches at most ONE source row.
UPDATE products
SET stock = products.stock + d.total_qty
FROM (SELECT sku, SUM(qty) AS total_qty FROM deliveries GROUP BY sku) AS d
WHERE products.sku = d.sku;

-- DELETE by relationship: products that were never ordered (anti-join).
DELETE FROM products
WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.product_id = products.id)
RETURNING id, name;

-- Batch delete: remove at most 2 old pending orders per run (repeat until 0 rows).
DELETE FROM orders
WHERE id IN (SELECT id FROM orders
             WHERE status = 'pending' AND created_at < '2026-09-01'
             ORDER BY id LIMIT 2);

SELECT sku, name, stock FROM products ORDER BY id;`, 'UPDATE … FROM, anti-join DELETE, batch DELETE (▶ Run)'),
      my(`-- MySQL spells "update from another table" as a multi-table UPDATE with JOIN:
UPDATE products p
JOIN (SELECT sku, SUM(qty) AS total_qty FROM deliveries GROUP BY sku) d ON d.sku = p.sku
SET p.stock = p.stock + d.total_qty;

-- MySQL safe mode refuses UPDATE/DELETE without a key in WHERE:
SET SQL_SAFE_UPDATES = 1;
-- Postgres equivalent of a join-delete:
-- DELETE FROM products p USING orders o WHERE o.product_id = p.id AND o.status = 'cancelled';`, 'MySQL / Postgres dialects (reference)')],
    viz: {
      title: 'UPDATE and DELETE step by step: WHERE finds targets, SET rewrites, constraints re-check',
      input: 'UPDATE price = price * 1.1 WHERE category = books; UPDATE stock = stock - 1 WHERE id = 2; UPDATE stock = stock - 5 WHERE id = 5; DELETE WHERE stock = 0; UPDATE category = misc',
      inputLabel: 'Statements separated by ; — UPDATE col = expr [WHERE col op value [AND …]] · DELETE [WHERE …] · INSERT v1, v2, …',
      gen: function (input) {
        return dmlSim({ table: 'products', cols: PROD_COLS, rows: PROD_ROWS, unique: [0, 1], notNull: [0, 1, 2, 3, 4, 5],
          checks: [{ text: 'price > 0', fn: function (r) { return r[4] === null || r[4] > 0; } }, { text: 'stock >= 0', fn: function (r) { return r[5] === null || r[5] >= 0; } }],
          rules: 'id PRIMARY KEY, sku UNIQUE, all columns NOT NULL, CHECK (price > 0), CHECK (stock >= 0)',
          example: 'UPDATE stock = stock - 1 WHERE id = 2' }, input);
      }
    },
    examples: [
      { title: 'Swap two columns in one UPDATE', html: `<p>Because every SET expression reads the <b>old</b> row, <code>SET a = b, b = a</code> swaps values in SQLite and Postgres. (MySQL is the odd one out: it evaluates left to right, so both end up equal to <code>b</code>.)</p>`, code: lab(`CREATE TABLE pair (id INTEGER PRIMARY KEY, a TEXT, b TEXT);
INSERT INTO pair VALUES (1, 'left', 'right');
UPDATE pair SET a = b, b = a;          -- both right-hand sides see the OLD values
SELECT * FROM pair;                    -- a = right, b = left`) },
      { title: 'The fan-out trap in UPDATE … FROM', html: `<p>CB-002 has <b>two</b> delivery rows (50 and 30). If you join <code>deliveries</code> directly, each product row matches two source rows and the engine picks <i>one arbitrarily</i> — stock goes up by 50 <i>or</i> 30, never 80. Aggregating in a subquery first gives exactly one match per product: +80.</p>`, code: shop(`-- WRONG (non-deterministic): stock += 50 or += 30, not 80
UPDATE products SET stock = products.stock + d.qty
FROM deliveries d WHERE products.sku = d.sku;
SELECT sku, stock FROM products WHERE sku = 'CB-002';   -- 250 or 230, never 280`) },
      { title: 'Correlated subquery UPDATE (works everywhere)', html: `<p>Before <code>UPDATE … FROM</code> existed, the portable way was a correlated subquery in SET plus an <code>EXISTS</code> guard in WHERE — without the guard, rows with no match would be set to NULL (and here violate NOT NULL).</p>`, code: shop(`UPDATE products
SET stock = stock + (SELECT SUM(d.qty) FROM deliveries d WHERE d.sku = products.sku)
WHERE EXISTS (SELECT 1 FROM deliveries d WHERE d.sku = products.sku);   -- guard!
SELECT sku, stock FROM products ORDER BY id;`) },
      { title: 'NOT IN with NULLs deletes nothing', html: `<p><code>DELETE FROM products WHERE id NOT IN (SELECT product_id FROM x)</code> deletes <b>zero rows</b> if the subquery returns a single NULL, because <code>id NOT IN (1, NULL)</code> is UNKNOWN. Prefer <code>NOT EXISTS</code> for anti-join deletes.</p>`, code: lab(`CREATE TABLE a (id INTEGER); CREATE TABLE b (id INTEGER);
INSERT INTO a VALUES (1), (2), (3); INSERT INTO b VALUES (1), (NULL);
DELETE FROM a WHERE id NOT IN (SELECT id FROM b);   -- deletes NOTHING
SELECT COUNT(*) AS still_there FROM a;              -- 3
DELETE FROM a WHERE NOT EXISTS (SELECT 1 FROM b WHERE b.id = a.id);
SELECT * FROM a;                                    -- only 1 remains`) }
    ],
    deepDive: `<p><b>What an UPDATE costs.</b> In MVCC engines (Postgres) an UPDATE writes a <i>new row version</i> and marks the old one dead — it is really "insert + delete". Every index on the table may need a new entry (unless Postgres can do a HOT update because no indexed column changed). Lots of updates → table and index bloat → VACUUM. InnoDB updates in place but writes the old version to the undo log. So "update everything every night" is not free.</p>
<p><b>Locks.</b> UPDATE/DELETE take row locks on every target row until commit; a WHERE without an index can lock-scan the whole table (MySQL with REPEATABLE READ also takes gap locks). Long-running mass updates block other writers and inflate the WAL / binlog / replication lag — hence batching (1k–10k rows per transaction, short sleeps between) and deleting by primary-key ranges.</p>
<p><b>Huge purges</b> are best done by design: time-partitioned tables let you <code>DROP</code>/<code>DETACH PARTITION</code> a whole month instantly instead of deleting 50M rows.</p>
<p><b>Affected-row counts</b> (<code>changes()</code>, JDBC <code>executeUpdate()</code>, <code>ROW_COUNT()</code>) are your concurrency signal: "0 rows updated" with a guard like <code>AND version = 7</code> or <code>AND stock &gt;= 1</code> means you lost the race — this is <b>optimistic locking</b>. MySQL by default reports rows <i>changed</i>, not rows <i>matched</i>, so an UPDATE that sets the same value reports 0.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI can draft the complicated UPDATE … FROM or dedupe DELETE in seconds and explain each clause. Ask it: <code>Rewrite this UPDATE as a SELECT that previews exactly the rows and new values it would produce</code> — a great safety habit.</p>
<p><b>Where AI goes wrong:</b> it happily generates UPDATE … FROM with a fan-out join, uses <code>NOT IN</code> over a nullable column, writes MySQL syntax for Postgres, or proposes read-modify-write in application code. Agents with database write access are a real 2026 risk: an agent that "cleans up test data" with a WHERE-less DELETE is a classic incident.</p>
<p><b>What you still own:</b> previewing, wrapping in a transaction, checking affected-row counts, giving agents read-only credentials or approval gates for DML, and having backups / point-in-time recovery before any mass change.</p>`,
    problems: [{
      title: 'Delete Duplicate Contacts, Keep the Oldest', level: 'Medium', tags: ['delete', 'dedupe', 'group by', 'window'], companies: ['Amazon', 'Meta', 'Uber'],
      statement: `<p>The <code>contacts(id, email, name)</code> table has duplicates: the same email (ignoring upper/lower case) appears several times. Delete the duplicates so that for every email only the row with the <b>smallest id</b> remains. Then make sure duplicates can never come back.</p>`,
      constraints: `<p>Up to 10<sup>6</sup> rows. Emails compare case-insensitively. Must be one set-based statement (no app loop).</p>`,
      example: `${H.table(['id', 'email', 'keep?'], [['1', 'asha@mail.com', H.c('g', 'keep')], ['2', 'ben@mail.com', H.c('g', 'keep')], ['3', 'ASHA@mail.com', H.c('r', 'delete (dup of 1)')], ['4', 'ben@mail.com', H.c('r', 'delete (dup of 2)')], ['5', 'chen@mail.com', H.c('g', 'keep')], ['6', 'ben@mail.com', H.c('r', 'delete (dup of 2)')]])}<p>Rows 1, 2, 5 remain because each is the smallest id in its lower(email) group.</p>`,
      brute: { why: `<p>The tempting query deletes every email that appears more than once — but that wipes out <b>all</b> copies, including the one you wanted to keep (Asha and Ben vanish completely). The other naive approach — reading all rows into the app and deleting one id at a time — is N round trips and races with new inserts.</p>`, code: shop(`-- WRONG: deletes ALL copies of duplicated emails, not just the extras.
DELETE FROM contacts
WHERE lower(email) IN (SELECT lower(email) FROM contacts
                       GROUP BY lower(email) HAVING COUNT(*) > 1);
SELECT * FROM contacts;   -- only Chen survives`) },
      mcq: { q: 'Which rows should the DELETE target?', options: ['Rows whose id is NOT the minimum id of their lower(email) group', 'Rows whose email appears more than once', 'Rows with the maximum id overall', 'Rows where name differs'], answer: 0, explain: 'Keep exactly one row per key (the MIN id) and delete everything else in the group.' },
      hints: [`<p>Hint 1: Think "which rows do I KEEP?" — one per <code>lower(email)</code>, the one with the smallest id.</p>`, `<p>Hint 2: <code>SELECT MIN(id) FROM contacts GROUP BY lower(email)</code> lists the keepers. Delete every id that is not in that list. Or number rows with <code>ROW_NUMBER() OVER (PARTITION BY lower(email) ORDER BY id)</code> and delete rn &gt; 1.</p>`, `<p>Hint 3: id is NOT NULL, so <code>NOT IN</code> is safe here. Finally add <code>CREATE UNIQUE INDEX … ON contacts(lower(email))</code> so the problem cannot recur. Preview with SELECT first, run inside a transaction.</p>`],
      solution: {
        approach: `<p>Compute the keeper per normalized email with <code>MIN(id)</code> and delete everything else in one statement. Add a unique expression index to stop new duplicates.</p>`,
        code: shop(`BEGIN;
DELETE FROM contacts
WHERE id NOT IN (SELECT MIN(id) FROM contacts GROUP BY lower(email))
RETURNING id, email, name;                         -- shows the 3 removed rows
-- Prevent it from happening again (expression index on lower(email)).
CREATE UNIQUE INDEX ux_contacts_email_ci ON contacts(lower(email));
COMMIT;
SELECT * FROM contacts ORDER BY id;                -- 1, 2, 5`),
        alt: [shop(`-- Window-function version: number the copies, delete all but the first.
DELETE FROM contacts
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY lower(email) ORDER BY id) AS rn
    FROM contacts
  ) WHERE rn > 1
);
SELECT * FROM contacts ORDER BY id;`)],
        dry: { head: ['id', 'lower(email)', 'MIN(id) of group', 'action'], rows: [['1', 'asha@mail.com', '1', H.c('g', 'keep')], ['3', 'asha@mail.com', '1', H.c('r', 'delete')], ['2', 'ben@mail.com', '2', H.c('g', 'keep')], ['4', 'ben@mail.com', '2', H.c('r', 'delete')], ['6', 'ben@mail.com', '2', H.c('r', 'delete')], ['5', 'chen@mail.com', '5', H.c('g', 'keep')]] },
        complexity: `<p>One GROUP BY (O(N log N) or O(N) hashed) plus one delete pass. With an index on <code>lower(email)</code> the grouping is a sorted index scan.</p>`,
        followUps: ['Keep the most recently updated row instead of the smallest id', 'Merge the deleted rows\' child records (orders) onto the keeper before deleting', 'Do it in batches of 10k on a 500M-row table']
      }
    }]
  });

  /* ======================= TOPIC 3: UPSERT ======================= */
  topics.push({
    title: 'UPSERT: INSERT … ON CONFLICT DO UPDATE / DO NOTHING (vs REPLACE and MERGE)',
    analogy: `<p>A <b>library card desk</b>: "If you are new, I make you a card. If you already have a card, I just update your phone number." That single decision — <i>insert if new, update if it exists</i> — is an <b>UPSERT</b> (update + insert). Doing it as two trips ("do you have a card?" … walk away … "ok, make one") lets someone else sneak in between and create a duplicate card.</p>`,
    explain: `<p><b>UPSERT</b> means: try to INSERT; if the row would collide with an existing row on a <b>unique key</b>, do something else instead of failing. SQLite and Postgres use the same syntax:</p>
<pre>INSERT INTO page_views (page, day, hits) VALUES ('home', '2026-10-01', 1)
ON CONFLICT (page, day)                        -- which UNIQUE key decides "already exists"
DO UPDATE SET hits = hits + excluded.hits;     -- excluded = the row you tried to insert</pre>
${H.table(['Piece', 'Meaning'], [
  ['<code>ON CONFLICT (cols)</code>', 'the <b>conflict target</b>: must match a PRIMARY KEY or UNIQUE index exactly'],
  ['<code>DO NOTHING</code>', 'skip silently — "insert if absent"'],
  ['<code>DO UPDATE SET …</code>', 'change the <b>existing</b> row instead'],
  ['<code>excluded.col</code>', 'the value from the row that was <i>proposed</i> (and rejected)'],
  ['plain <code>col</code> / <code>table.col</code>', 'the value currently stored in the existing row'],
  ['<code>DO UPDATE … WHERE cond</code>', 'only update when the condition holds (e.g. newer timestamp)']
])}
<p><b>Why not "SELECT first, then INSERT or UPDATE"?</b> Two sessions both SELECT, both see "not there", both INSERT → one crashes on the unique key (or, without a unique key, you get duplicates). UPSERT makes the decision <b>inside the database, atomically</b>, using the unique index itself as the referee.</p>
<p><b>Danger: <code>INSERT OR REPLACE</code> / MySQL <code>REPLACE INTO</code>.</b> They look like upserts but actually <b>DELETE the old row and INSERT a new one</b>. Columns you did not supply go back to their defaults (or NULL), the rowid changes, <code>ON DELETE CASCADE</code> children can be deleted, and delete triggers may fire. Prefer <code>ON CONFLICT DO UPDATE</code>.</p>
${H.table(['Engine', 'Syntax'], [
  ['SQLite 3.24+, Postgres 9.5+', '<code>INSERT … ON CONFLICT (k) DO UPDATE SET c = excluded.c</code>'],
  ['MySQL / MariaDB', '<code>INSERT … ON DUPLICATE KEY UPDATE c = new.c</code> (row alias, 8.0.19+)'],
  ['SQL standard, Postgres 15+, SQL Server, Oracle', '<code>MERGE INTO t USING s ON … WHEN MATCHED THEN UPDATE … WHEN NOT MATCHED THEN INSERT …</code>']
])}`,
    clues: ['"insert if not exists, otherwise update" → <code>ON CONFLICT DO UPDATE</code>', '"idempotent" / "the same event may arrive twice" → upsert or <code>DO NOTHING</code> on an idempotency key', '"increment a counter per (page, day)" → upsert with <code>hits = hits + excluded.hits</code>', '"sync a staging table / nightly feed into the main table" → <code>INSERT … SELECT … ON CONFLICT</code> (or MERGE)', '"only overwrite if the incoming record is newer" → <code>DO UPDATE … WHERE excluded.ts &gt; t.ts</code>', '"two requests at the same time create duplicates" → unique key + upsert, never check-then-insert'],
    code: [shop(`-- Counter upsert: first hit creates the row, later hits add to it.
INSERT INTO page_views (page, day, hits) VALUES ('home', '2026-10-01', 1)
ON CONFLICT (page, day) DO UPDATE SET hits = hits + excluded.hits;      -- exists: 120 -> 121

INSERT INTO page_views (page, day, hits) VALUES ('about', '2026-10-01', 1)
ON CONFLICT (page, day) DO UPDATE SET hits = hits + excluded.hits;      -- new row: about = 1

-- Insert-if-absent: DO NOTHING (RETURNING shows only rows really inserted).
INSERT INTO customers (email, name) VALUES ('asha@mail.com', 'Asha Dup')
ON CONFLICT (email) DO NOTHING
RETURNING id;                                                           -- returns no row

SELECT * FROM page_views ORDER BY day, page;`, 'Counter upsert and DO NOTHING (▶ Run)'),
      shop(`-- Bulk upsert from a staging table (the nightly supplier feed).
-- NOTE: when the source is a SELECT with FROM, SQLite needs "WHERE true" to parse ON CONFLICT.
INSERT INTO products (sku, name, category, price_cents, stock)
SELECT sku, name, category, price_cents, stock FROM price_feed WHERE true
ON CONFLICT (sku) DO UPDATE SET
  price_cents = excluded.price_cents,
  stock       = excluded.stock,
  updated_at  = CURRENT_TIMESTAMP
WHERE products.price_cents IS NOT excluded.price_cents      -- skip no-op updates:
   OR products.stock       IS NOT excluded.stock;           -- fewer writes, triggers, WAL

SELECT sku, name, price_cents, stock, updated_at FROM products ORDER BY id;`, 'Bulk upsert with a conditional DO UPDATE (▶ Run)'),
      lab(`-- Why INSERT OR REPLACE is NOT an upsert: it deletes and re-inserts.
CREATE TABLE settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT '2026-01-01',
  note       TEXT
);
INSERT INTO settings (key, value, note) VALUES ('theme', 'dark', 'chosen at signup');
SELECT rowid, * FROM settings;          -- rowid 1, note kept

INSERT OR REPLACE INTO settings (key, value) VALUES ('theme', 'light');
SELECT rowid, * FROM settings;          -- rowid 2, note = NULL  (data lost!)

INSERT INTO settings (key, value) VALUES ('theme', 'blue')
ON CONFLICT (key) DO UPDATE SET value = excluded.value;
SELECT rowid, * FROM settings;          -- same rowid, only value changed`, 'REPLACE vs ON CONFLICT DO UPDATE (▶ Run)'),
      pg(`-- PostgreSQL: identical ON CONFLICT syntax, plus MERGE (Postgres 15+).
MERGE INTO products AS p
USING price_feed AS f ON p.sku = f.sku
WHEN MATCHED AND (p.price_cents, p.stock) IS DISTINCT FROM (f.price_cents, f.stock) THEN
  UPDATE SET price_cents = f.price_cents, stock = f.stock, updated_at = now()
WHEN NOT MATCHED THEN
  INSERT (sku, name, category, price_cents, stock)
  VALUES (f.sku, f.name, f.category, f.price_cents, f.stock);
-- Postgres 17 adds: WHEN NOT MATCHED BY SOURCE THEN DELETE, and MERGE ... RETURNING.`, 'PostgreSQL MERGE (reference)'),
      my(`-- MySQL 8: ON DUPLICATE KEY UPDATE with a row alias (VALUES() is deprecated).
INSERT INTO page_views (page, day, hits) VALUES ('home', '2026-10-01', 1) AS new
ON DUPLICATE KEY UPDATE hits = page_views.hits + new.hits;
-- Caveat: it fires on ANY unique key of the table, not one you choose.`, 'MySQL ON DUPLICATE KEY UPDATE (reference)')],
    viz: {
      title: 'ON CONFLICT DO UPDATE vs INSERT OR REPLACE, event by event',
      input: 'home, about, home:3, pricing, about',
      inputLabel: 'Page-view events separated by commas (page or page:hits)',
      gen: function (input) {
        var evs = strIn(input).split(',').map(function (s) { return s.trim(); }).filter(function (s) { return s.length; });
        if (!evs.length) throw new Error('Type events like: home, about, home:3');
        if (evs.length > 8) throw new Error('Use at most 8 events');
        evs = evs.map(function (e) {
          var m = e.match(/^([a-z0-9_\-]+)(?::(\d+))?$/i);
          if (!m) throw new Error('Bad event "' + e + '". Use page or page:hits, e.g. home:3');
          return { page: m[1].toLowerCase(), n: m[2] ? Number(m[2]) : 1 };
        });
        var cols = ['rowid', 'page', 'hits', 'first_seen', 'last_seen'];
        var up = [[1, 'home', 120, '09:00', '09:00'], [2, 'pricing', 30, '09:00', '09:00']];
        var rep = cp(up), nextUp = 3, nextRep = 3, f = [];
        var code = "INSERT INTO page_views (page, hits, first_seen, last_seen)\nVALUES (:page, :n, :now, :now)\nON CONFLICT (page) DO UPDATE SET\n  hits = hits + excluded.hits,\n  last_seen = excluded.last_seen;";
        f.push({ narr: 'Two copies of the same table. Left gets a real UPSERT (<code>ON CONFLICT DO UPDATE</code>), right gets <code>INSERT OR REPLACE</code>. <code>page</code> is the unique key.', parts: [sqlPart(code), tbl('ON CONFLICT DO UPDATE', cols, up), tbl('INSERT OR REPLACE', cols, rep)] });
        evs.forEach(function (e, k) {
          var now = '09:' + (k + 1 < 10 ? '0' : '') + (k + 1) + '';
          var iu = -1, ir = -1;
          up.forEach(function (r, i) { if (r[1] === e.page) iu = i; });
          rep.forEach(function (r, i) { if (r[1] === e.page) ir = i; });
          var proposed = [['(new)', e.page, e.n, now, now]];
          f.push({ narr: 'Event ' + (k + 1) + ': proposed row for <b>' + esc(e.page) + '</b> (this is <code>excluded</code>). ' + (iu >= 0 ? 'A row with this key <b>already exists</b> (amber) → conflict.' : 'No row has this key → no conflict, it will simply be inserted.'),
            parts: [tbl('proposed row = excluded', cols, proposed, { 0: 'sel' }), tbl('ON CONFLICT DO UPDATE', cols, up, iu >= 0 ? one(iu, 'cur') : {}), tbl('INSERT OR REPLACE', cols, rep, ir >= 0 ? one(ir, 'cur') : {})] });
          var hu = {}, hr = {}, narr;
          if (iu >= 0) {
            up[iu][2] = up[iu][2] + e.n; up[iu][4] = now; hu = one(iu, 'cur');
            var gone = rep[ir].slice();
            rep.splice(ir, 1); rep.push([nextRep++, e.page, e.n, now, now]); hr = one(rep.length - 1, 'ok');
            narr = '<b>Left:</b> the existing row is updated in place — hits ' + (up[iu][2] - e.n) + ' + ' + e.n + ' = <b>' + up[iu][2] + '</b>, first_seen kept, same rowid. <b>Right:</b> REPLACE <span class="c-r">deleted</span> row (rowid ' + gone[0] + ', hits ' + gone[2] + ') and inserted a brand-new one: hits reset to ' + e.n + ', first_seen lost, new rowid.';
          } else {
            up.push([nextUp++, e.page, e.n, now, now]); hu = one(up.length - 1, 'ok');
            rep.push([nextRep++, e.page, e.n, now, now]); hr = one(rep.length - 1, 'ok');
            narr = 'No conflict: both statements behave like a plain INSERT (green).';
          }
          f.push({ narr: narr, parts: [sqlPart(code, iu >= 0 ? { 3: 'cur', 4: 'cur', 5: 'cur' } : { 1: 'ok', 2: 'ok' }), tbl('ON CONFLICT DO UPDATE', cols, up, hu), tbl('INSERT OR REPLACE', cols, rep, hr)] });
        });
        f.push({ narr: 'Final comparison. The left table has correct running totals and history. The right table silently lost counts, first_seen dates and stable ids — that is why <b>REPLACE is not an upsert</b>.', parts: [tbl('ON CONFLICT DO UPDATE (correct)', cols, up), tbl('INSERT OR REPLACE (data lost)', cols, rep, many(rep.map(function (_, i) { return i; }).filter(function (i) { return up.some(function (u) { return u[1] === rep[i][1] && (u[2] !== rep[i][2] || u[3] !== rep[i][3]); }); }), 'bad'))] });
        return f;
      }
    },
    examples: [
      { title: 'Last-write-wins only if newer (out-of-order events)', html: `<p>Mobile clients sync profile edits that can arrive late. Add a <code>WHERE</code> to the DO UPDATE so an older event never overwrites a newer one. Here the 10:05 edit arrives after the 10:09 edit and is ignored.</p>`, code: lab(`CREATE TABLE profiles (user_id INTEGER PRIMARY KEY, bio TEXT, updated_at TEXT NOT NULL);
INSERT INTO profiles VALUES (7, 'hello', '2026-10-01 10:00');
INSERT INTO profiles VALUES (7, 'v2 (10:09)', '2026-10-01 10:09')
  ON CONFLICT (user_id) DO UPDATE SET bio = excluded.bio, updated_at = excluded.updated_at
  WHERE excluded.updated_at > profiles.updated_at;      -- applied
INSERT INTO profiles VALUES (7, 'v1 (10:05, late)', '2026-10-01 10:05')
  ON CONFLICT (user_id) DO UPDATE SET bio = excluded.bio, updated_at = excluded.updated_at
  WHERE excluded.updated_at > profiles.updated_at;      -- ignored: older
SELECT * FROM profiles;                                 -- bio = v2 (10:09)`) },
      { title: 'Idempotent payment webhook with DO NOTHING', html: `<p>Payment providers retry webhooks, so the same event id can arrive 3 times. Store it with a UNIQUE event id and <code>DO NOTHING</code>; process the payment only if the INSERT actually inserted a row (affected rows = 1, or RETURNING returned a row).</p>`, code: lab(`CREATE TABLE webhook_events (event_id TEXT PRIMARY KEY, payload TEXT, received_at TEXT DEFAULT CURRENT_TIMESTAMP);
INSERT INTO webhook_events (event_id, payload) VALUES ('evt_123', '{"amount":500}')
  ON CONFLICT (event_id) DO NOTHING RETURNING event_id;   -- 1 row: process it
INSERT INTO webhook_events (event_id, payload) VALUES ('evt_123', '{"amount":500}')
  ON CONFLICT (event_id) DO NOTHING RETURNING event_id;   -- 0 rows: duplicate, skip
SELECT COUNT(*) AS stored FROM webhook_events;           -- 1`) },
      { title: 'Conflict target must match a unique index', html: `<p><code>ON CONFLICT (name)</code> fails with "ON CONFLICT clause does not match any PRIMARY KEY or UNIQUE constraint" if <code>name</code> is not unique. Upserts <b>need</b> the unique index — it is the referee. With a <i>partial</i> unique index, repeat its WHERE in the conflict target: <code>ON CONFLICT (email) WHERE deleted_at IS NULL</code>.</p>`, code: shop(`-- users has a PARTIAL unique index on email WHERE deleted_at IS NULL.
INSERT INTO users (email, name) VALUES ('chen@mail.com', 'Chen Li')
ON CONFLICT (email) WHERE deleted_at IS NULL
DO UPDATE SET name = excluded.name;
SELECT * FROM users ORDER BY id;     -- Chen renamed in place, no duplicate`) },
      { title: 'Two conflict targets in one statement (SQLite 3.35+)', html: `<p>A table can have several unique keys. SQLite lets you stack ON CONFLICT clauses; they are checked in order, and only the last may omit its target. Postgres allows only one target per statement.</p>`, code: lab(`CREATE TABLE devices (id INTEGER PRIMARY KEY, serial TEXT UNIQUE, mac TEXT UNIQUE, owner TEXT);
INSERT INTO devices VALUES (1, 'S-1', 'AA:01', 'asha');
INSERT INTO devices (serial, mac, owner) VALUES ('S-9', 'AA:01', 'ben')
  ON CONFLICT (serial) DO UPDATE SET owner = excluded.owner
  ON CONFLICT (mac)    DO UPDATE SET owner = excluded.owner, serial = excluded.serial;
SELECT * FROM devices;     -- row 1 now S-9 / ben (matched on mac)`) }
    ],
    deepDive: `<p><b>How the database does it atomically.</b> The engine tries the insert into the unique index. If the key already exists it takes a lock on the existing row (Postgres uses a "speculative insertion" token so two concurrent upserts of the same new key serialize instead of erroring) and then runs the DO UPDATE. Under READ COMMITTED, Postgres guarantees each upsert ends in either an insert or an update — no unique violation, no lost row. A row may not be affected twice by one statement: if your staging batch contains the same key twice, Postgres raises "ON CONFLICT DO UPDATE command cannot affect row a second time" — dedupe the source first (<code>DISTINCT ON</code> / <code>GROUP BY</code>).</p>
<p><b>Side effects.</b> Postgres consumes a sequence value even when the upsert ends up updating (so ids get gaps). Both an INSERT trigger (BEFORE) and UPDATE triggers may fire. A no-op <code>DO UPDATE SET x = excluded.x</code> still writes a new row version — guard it with <code>WHERE … IS DISTINCT FROM …</code>.</p>
<p><b>MERGE vs ON CONFLICT.</b> MERGE is standard and can also DELETE, but in Postgres and SQL Server it is <i>not</i> automatically safe against concurrent inserts of the same new key (SQL Server needs <code>WITH (HOLDLOCK)</code>; Postgres may raise a unique violation). For "single-row insert-or-update under concurrency", ON CONFLICT is the safer tool; MERGE shines for batch syncs from a staging table.</p>
<p><b>MySQL gotchas.</b> <code>ON DUPLICATE KEY UPDATE</code> triggers on <i>any</i> unique key; affected-rows is 1 for insert, 2 for update, 0 for no change. <code>REPLACE INTO</code> is delete + insert, like SQLite's.</p>`,
    aiEra: `<p><b>What AI changes:</b> ORMs and AI assistants now emit upserts for you (<code>Prisma upsert</code>, SQLAlchemy <code>on_conflict_do_update</code>). Ask: <code>Write the Postgres, MySQL and SQLite versions of this upsert and list the behavioural differences</code> — a fast way to learn dialect quirks.</p>
<p><b>Where AI goes wrong:</b> it reaches for <code>INSERT OR REPLACE</code> / <code>REPLACE INTO</code> (data loss), forgets that the conflict target needs a unique index, writes check-then-insert in app code, or produces batches with duplicate keys. Some ORM "upsert" helpers are actually SELECT + INSERT/UPDATE — racy under load.</p>
<p><b>What you still own:</b> choosing the natural/idempotency key, adding the unique index, deciding the merge rule (overwrite, add, keep newest) and verifying behaviour under concurrency. In agentic pipelines, idempotent upserts are how you make retried tool calls safe.</p>`,
    problems: [{
      title: 'Sync the Supplier Price Feed', level: 'Medium', tags: ['upsert', 'insert select', 'on conflict', 'etl'], companies: ['Flipkart', 'Shopify', 'Walmart'],
      statement: `<p>Every night a supplier file is loaded into <code>price_feed(sku, name, category, price_cents, stock)</code>. Sync it into <code>products</code>: new SKUs must be inserted; existing SKUs must get the new price and stock and a fresh <code>updated_at</code> — but <b>only if something actually changed</b>. Do it in one atomic statement that is safe to re-run.</p>`,
      constraints: `<p><code>products.sku</code> is UNIQUE. The feed may have 10<sup>5</sup>–10<sup>6</sup> rows. Rows not in the feed must be left alone.</p>`,
      example: `${H.table(['sku', 'in products?', 'feed vs current', 'action'], [['PH-001', 'yes', 'price 49900 → 47900, stock 10 → 8', H.c('y', 'update')], ['CB-002', 'yes', 'stock 200 → 180', H.c('y', 'update')], ['BK-003', 'yes', 'identical', H.c('m', 'skip (no write)')], ['KB-006', 'no', 'new', H.c('g', 'insert')]])}<p>Result: 2 updated, 1 inserted, 1 untouched; HP-004 and BK-005 (not in feed) unchanged.</p>`,
      brute: { why: `<p>The naive way is two passes: UPDATE the matching rows, then INSERT the ones that do not exist (or worse, loop in the app: SELECT each SKU, then INSERT or UPDATE). Between the check and the insert another job can insert the same SKU → unique violation or duplicate; it scans the feed twice; it rewrites unchanged rows (bumping updated_at and firing triggers for nothing); and if the second statement fails after the first committed, the sync is half-done.</p>`, code: shop(`-- Naive two-pass sync (racy, double scan, rewrites unchanged rows)
UPDATE products
SET price_cents = f.price_cents, stock = f.stock, updated_at = CURRENT_TIMESTAMP
FROM price_feed f WHERE products.sku = f.sku;              -- touches BK-003 needlessly
INSERT INTO products (sku, name, category, price_cents, stock)
SELECT f.sku, f.name, f.category, f.price_cents, f.stock
FROM price_feed f
WHERE NOT EXISTS (SELECT 1 FROM products p WHERE p.sku = f.sku);   -- race window here
SELECT sku, price_cents, stock, updated_at FROM products ORDER BY id;`) },
      mcq: { q: 'What makes the upsert decide "insert vs update"?', options: ['The UNIQUE index on products.sku (the conflict target)', 'A SELECT COUNT(*) run beforehand', 'The order of rows in price_feed', 'The primary key of price_feed'], answer: 0, explain: 'ON CONFLICT (sku) relies on the unique index on products.sku; the index check is atomic, so no race window exists.' },
      hints: [`<p>Hint 1: One statement can both insert and update: <code>INSERT … SELECT … ON CONFLICT (sku) DO UPDATE</code>.</p>`, `<p>Hint 2: Inside DO UPDATE, <code>excluded.price_cents</code> is the feed value and <code>products.price_cents</code> the current value. In SQLite, add <code>WHERE true</code> to the SELECT so the parser does not confuse ON CONFLICT with a join's ON.</p>`, `<p>Hint 3: Add <code>WHERE products.price_cents IS NOT excluded.price_cents OR products.stock IS NOT excluded.stock</code> to skip no-op updates (IS NOT is NULL-safe). Re-running the statement then changes 0 rows — idempotent.</p>`],
      solution: {
        approach: `<p>Single <code>INSERT … SELECT … ON CONFLICT (sku) DO UPDATE … WHERE changed</code>. The unique index arbitrates each row atomically; the WHERE on DO UPDATE avoids useless writes; the whole statement is one transaction.</p>`,
        code: shop(`INSERT INTO products (sku, name, category, price_cents, stock)
SELECT sku, name, category, price_cents, stock
FROM price_feed
WHERE true                                   -- required by SQLite's parser before ON CONFLICT
ON CONFLICT (sku) DO UPDATE SET
  price_cents = excluded.price_cents,
  stock       = excluded.stock,
  updated_at  = CURRENT_TIMESTAMP
WHERE products.price_cents IS NOT excluded.price_cents
   OR products.stock       IS NOT excluded.stock;

SELECT sku, price_cents, stock, updated_at FROM products ORDER BY id;`),
        alt: [pg(`-- PostgreSQL 15+: the same sync with MERGE
MERGE INTO products p
USING price_feed f ON p.sku = f.sku
WHEN MATCHED AND (p.price_cents, p.stock) IS DISTINCT FROM (f.price_cents, f.stock) THEN
  UPDATE SET price_cents = f.price_cents, stock = f.stock, updated_at = now()
WHEN NOT MATCHED THEN
  INSERT (sku, name, category, price_cents, stock)
  VALUES (f.sku, f.name, f.category, f.price_cents, f.stock);`)],
        dry: { head: ['feed sku', 'conflict on sku?', 'changed?', 'result'], rows: [['PH-001', 'yes', 'yes', H.c('y', 'updated')], ['CB-002', 'yes', 'yes (stock)', H.c('y', 'updated')], ['BK-003', 'yes', 'no', H.c('m', 'skipped')], ['KB-006', 'no', '—', H.c('g', 'inserted')]] },
        complexity: `<p>One pass over the feed; each row costs one unique-index probe O(log N). Writes only for changed/new rows.</p>`,
        followUps: ['Also delete products missing from the feed (MERGE … WHEN NOT MATCHED BY SOURCE in Postgres 17)', 'The feed contains the same SKU twice — what happens and how do you fix it?', 'Record every price change in a history table']
      }
    }]
  });

  /* ======================= TOPIC 4: Soft deletes & archiving ======================= */
  topics.push({
    title: 'Soft Deletes, Restores & Archiving',
    analogy: `<p>Your phone's <b>"Recently Deleted" photo album</b>. Deleting a photo does not destroy it — it gets a little "deleted on" date and hides from your main gallery. You can restore it for 30 days; after that a cleanup job deletes it for real. That is a <b>soft delete</b> (hide + timestamp) followed by a <b>hard purge</b>.</p>`,
    explain: `<p><b>Hard delete</b> = <code>DELETE FROM users WHERE id = 1</code>: the row is gone. <b>Soft delete</b> = <code>UPDATE users SET deleted_at = CURRENT_TIMESTAMP WHERE id = 1</code>: the row stays but is treated as deleted.</p>
<p><b>Why teams soft delete:</b> "undo" / restore button, audit and legal history, keeping foreign-key references valid (old orders still point to the customer), and protection against accidental deletes.</p>
<p><b>The three things you must add, or soft delete bites you:</b></p>
<ol><li><b>A view (or default scope) for live rows</b> — <code>CREATE VIEW active_users AS SELECT … WHERE deleted_at IS NULL</code> — so nobody forgets the filter.</li>
<li><b>A partial unique index</b> — <code>CREATE UNIQUE INDEX … ON users(email) WHERE deleted_at IS NULL</code>. A plain UNIQUE(email) would block a deleted user from ever signing up again.</li>
<li><b>A purge policy</b> — a job that hard-deletes (or anonymizes) rows soft-deleted more than N days ago. Privacy laws (GDPR "right to erasure") do not accept "we hid it".</li></ol>
${H.table(['', 'Hard delete', 'Soft delete (deleted_at)', 'Archive table'], [
  ['Undo possible?', H.c('r', 'no (backups only)'), H.c('g', 'yes, set NULL'), 'yes, move back'],
  ['Queries must filter?', 'no', H.c('r', 'yes — every query'), 'no'],
  ['Unique keys', 'simple', 'need partial index', 'simple'],
  ['Table size', 'small', 'grows forever without purge', 'main table stays small'],
  ['Privacy erasure', H.c('g', 'yes'), H.c('r', 'needs purge / anonymize'), 'needs purge']
])}
<p><b>Archive table</b> alternative: in one transaction, <code>INSERT INTO orders_archive SELECT … WHERE …</code> then <code>DELETE FROM orders WHERE …</code>. Hot table stays lean; history is still queryable.</p>`,
    clues: ['"users must be able to undo / restore" → soft delete with <code>deleted_at</code>', '"deleted users can sign up again with the same email" → partial unique index <code>WHERE deleted_at IS NULL</code>', '"keep history for audit but keep the main table fast" → archive table / partitioning', '"right to be forgotten / GDPR" → hard delete or anonymize, soft delete is not enough', '"queries keep showing deleted rows" → wrap the filter in a view or row-level policy'],
    code: [shop(`-- users has: deleted_at TEXT, and UNIQUE INDEX on email WHERE deleted_at IS NULL.
CREATE VIEW active_users AS
  SELECT id, email, name FROM users WHERE deleted_at IS NULL;

-- Soft delete Asha (guard: only if not already deleted).
UPDATE users SET deleted_at = CURRENT_TIMESTAMP
WHERE id = 1 AND deleted_at IS NULL;

-- Ben was soft-deleted earlier, so he can sign up again with the same email.
INSERT INTO users (email, name) VALUES ('ben@mail.com', 'Ben (returning)');

-- Restore Asha: just clear the timestamp.
UPDATE users SET deleted_at = NULL WHERE id = 1;

SELECT * FROM active_users ORDER BY id;     -- what the app sees
SELECT * FROM users ORDER BY id;            -- everything, including history`, 'Soft delete, re-signup, restore (▶ Run)'),
      shop(`-- Make DELETE automatically soft: apps delete from the VIEW, an INSTEAD OF trigger flags the row.
CREATE VIEW live_users AS
  SELECT id, email, name FROM users WHERE deleted_at IS NULL;

CREATE TRIGGER live_users_soft_delete
INSTEAD OF DELETE ON live_users
BEGIN
  UPDATE users SET deleted_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;

DELETE FROM live_users WHERE email = 'chen@mail.com';   -- looks like a normal delete
SELECT * FROM live_users;                               -- Chen is hidden
SELECT id, email, deleted_at IS NOT NULL AS is_deleted FROM users ORDER BY id;   -- but still stored`, 'Turn DELETE into a soft delete with an INSTEAD OF trigger (▶ Run)'),
      shop(`-- Archive pattern: move cancelled orders out of the hot table atomically.
CREATE TABLE orders_archive (
  id INTEGER PRIMARY KEY, customer_id INTEGER, product_id INTEGER, qty INTEGER,
  status TEXT, created_at TEXT, archived_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
BEGIN;
INSERT INTO orders_archive (id, customer_id, product_id, qty, status, created_at)
SELECT id, customer_id, product_id, qty, status, created_at FROM orders WHERE status = 'cancelled';
DELETE FROM orders WHERE status = 'cancelled';
COMMIT;

-- Purge job: hard-delete users soft-deleted more than 30 days ago.
DELETE FROM users
WHERE deleted_at IS NOT NULL AND deleted_at < datetime('now', '-30 days')
RETURNING id, email;

SELECT * FROM orders_archive;`, 'Archive move + purge job (▶ Run)')],
    viz: {
      title: 'Soft delete lifecycle: base table vs the active_users view',
      input: 'delete 1; signup asha@mail.com; restore 1; signup ben@mail.com; purge',
      inputLabel: 'Commands separated by ; — delete ID · restore ID · signup EMAIL · purge',
      gen: function (input) {
        var cmds = strIn(input).split(';').map(function (s) { return s.trim(); }).filter(function (s) { return s.length; });
        if (!cmds.length) throw new Error('Type commands like: delete 1; restore 1; signup x@mail.com; purge');
        if (cmds.length > 8) throw new Error('Use at most 8 commands');
        var cols = ['id', 'email', 'name', 'deleted_at'];
        var rows = [[1, 'asha@mail.com', 'Asha', null], [2, 'ben@mail.com', 'Ben', '2026-08-01'], [3, 'chen@mail.com', 'Chen', null]];
        var nextId = 4, day = 10, f = [];
        function view(hl) { var v = [], h = {}; rows.forEach(function (r, i) { if (r[3] === null) { if (hl && hl[i]) h[v.length] = hl[i]; v.push([r[0], r[1], r[2]]); } }); return tbl('active_users (VIEW: WHERE deleted_at IS NULL)', ['id', 'email', 'name'], v, h); }
        function idx(id) { for (var i = 0; i < rows.length; i++) if (rows[i][0] === id) return i; return -1; }
        function liveEmail(e, skip) { for (var i = 0; i < rows.length; i++) if (i !== skip && rows[i][3] === null && rows[i][1] === e) return i; return -1; }
        f.push({ narr: 'Start. Ben (id 2) was soft-deleted on 2026-08-01: he is still in the <b>base table</b> but hidden from the <b>view</b>. The partial unique index only covers rows with <code>deleted_at IS NULL</code>.', parts: [tbl('users (base table)', cols, rows, { 1: 'done' }), view()] });
        cmds.forEach(function (c) {
          var m, i, now = '2026-10-' + (day++);
          if ((m = c.match(/^delete\s+(\d+)$/i))) {
            i = idx(Number(m[1]));
            if (i < 0) throw new Error('No user with id ' + m[1]);
            if (rows[i][3] !== null) { f.push({ narr: 'User ' + m[1] + ' is already deleted; the guard <code>AND deleted_at IS NULL</code> matches 0 rows, so the original deletion date is kept.', parts: [sqlPart('UPDATE users SET deleted_at = CURRENT_TIMESTAMP\nWHERE id = ' + m[1] + ' AND deleted_at IS NULL;', { 2: 'cur' }), tbl('users (base table)', cols, rows), view()] }); return; }
            f.push({ narr: 'Soft delete user ' + m[1] + ': in the view the row is about to disappear (red).', parts: [sqlPart('UPDATE users SET deleted_at = CURRENT_TIMESTAMP\nWHERE id = ' + m[1] + ' AND deleted_at IS NULL;'), tbl('users (base table)', cols, rows, one(i, 'win')), view(one(i, 'bad'))] });
            rows[i][3] = now;
            f.push({ narr: 'Done: the base row is <b>updated</b> (amber — deleted_at filled in), not removed. The view no longer shows it. Nothing was lost.', parts: [sqlPart('UPDATE users SET deleted_at = CURRENT_TIMESTAMP\nWHERE id = ' + m[1] + ' AND deleted_at IS NULL;', { 1: 'cur' }), tbl('users (base table)', cols, rows, one(i, 'cur')), view()] });
          } else if ((m = c.match(/^restore\s+(\d+)$/i))) {
            i = idx(Number(m[1]));
            if (i < 0) throw new Error('No user with id ' + m[1]);
            var clash = liveEmail(rows[i][1], i);
            if (clash >= 0) {
              f.push({ narr: '<span class="c-r">Restore blocked.</span> A live row (id ' + rows[clash][0] + ') already uses <b>' + esc(rows[i][1]) + '</b>. Clearing deleted_at would put two live rows in the partial unique index → UNIQUE constraint failed. Product decision needed: merge accounts or keep the new one.', parts: [sqlPart('UPDATE users SET deleted_at = NULL WHERE id = ' + m[1] + ';', { 1: 'bad' }), tbl('users (base table)', cols, rows, (function () { var h = one(i, 'bad'); h[clash] = 'cur'; return h; })()), view()] });
            } else if (rows[i][3] === null) {
              f.push({ narr: 'User ' + m[1] + ' is not deleted — nothing to restore.', parts: [tbl('users (base table)', cols, rows), view()] });
            } else {
              rows[i][3] = null;
              f.push({ narr: 'Restore = set deleted_at back to NULL (amber). The row reappears in the view (green). This is the "undo" users love.', parts: [sqlPart('UPDATE users SET deleted_at = NULL WHERE id = ' + m[1] + ';', { 1: 'cur' }), tbl('users (base table)', cols, rows, one(i, 'cur')), view(one(i, 'ok'))] });
            }
          } else if ((m = c.match(/^signup\s+(\S+@\S+)$/i))) {
            var email = m[1].toLowerCase(), clash2 = liveEmail(email, -1);
            var sql = "INSERT INTO users (email, name)\nVALUES ('" + email + "', 'New');";
            if (clash2 >= 0) {
              var tr = cp(rows); tr.push([nextId, email, 'New', null]);
              f.push({ narr: '<span class="c-r">Rejected:</span> ' + esc(email) + ' belongs to a <b>live</b> user (id ' + rows[clash2][0] + '). The partial unique index does its job.', parts: [sqlPart(sql, { 1: 'bad' }), tbl('users (attempted row in red)', cols, tr, (function () { var h = one(tr.length - 1, 'bad'); h[clash2] = 'cur'; return h; })()), view()] });
            } else {
              var old = -1; rows.forEach(function (r, k) { if (r[1] === email) old = k; });
              rows.push([nextId++, email, 'New', null]);
              f.push({ narr: '<span class="c-g">Inserted.</span> ' + (old >= 0 ? 'An older row with this email exists but is soft-deleted (faded), and the partial index ignores it — so re-registration works. A plain UNIQUE(email) would have refused.' : 'Brand-new email, no conflict.'), parts: [sqlPart(sql, { 1: 'ok' }), tbl('users (base table)', cols, rows, (function () { var h = one(rows.length - 1, 'ok'); if (old >= 0) h[old] = 'done'; return h; })()), view(one(rows.length - 1, 'ok'))] });
            }
          } else if (/^purge$/i.test(c)) {
            var dead = []; rows.forEach(function (r, k) { if (r[3] !== null) dead.push(k); });
            f.push({ narr: 'Purge job: hard-delete rows that were soft-deleted long enough ago (red). After this they truly cannot be restored — that is the point for privacy.', parts: [sqlPart("DELETE FROM users\nWHERE deleted_at IS NOT NULL\n  AND deleted_at < datetime('now', '-30 days');", { 1: 'bad' }), tbl('users (base table)', cols, rows, many(dead, 'bad')), view()] });
            rows = rows.filter(function (r) { return r[3] === null; });
            f.push({ narr: dead.length + ' row(s) physically removed. The view is unchanged — it never showed them.', parts: [tbl('users (base table)', cols, rows), view()] });
          } else throw new Error('Unknown command "' + c + '". Use delete ID, restore ID, signup EMAIL or purge');
        });
        f.push({ narr: 'Final state. The app only ever reads the view, so it never needs to remember the <code>deleted_at IS NULL</code> filter.', parts: [tbl('users (base table)', cols, rows), view()] });
        return f;
      }
    },
    examples: [
      { title: 'The classic bug: forgetting the filter in one query', html: `<p>A "count users" dashboard reads the base table and reports 3 users when only 2 are live. Every query that touches a soft-deleted table must filter — so expose a view (or ORM default scope / Postgres row-level security) and point everything at it.</p>`, code: shop(`SELECT COUNT(*) AS wrong_count FROM users;                          -- 3 (includes Ben)
SELECT COUNT(*) AS right_count FROM users WHERE deleted_at IS NULL;  -- 2`) },
      { title: 'Why a plain UNIQUE breaks re-signup', html: `<p>With <code>email UNIQUE</code>, Ben's soft-deleted row still holds the email forever, so a returning Ben gets "email already taken". The partial unique index only enforces uniqueness among live rows.</p>`, code: lab(`CREATE TABLE u (id INTEGER PRIMARY KEY, email TEXT UNIQUE, deleted_at TEXT);
INSERT INTO u (email, deleted_at) VALUES ('ben@mail.com', '2026-08-01');
INSERT OR IGNORE INTO u (email) VALUES ('ben@mail.com');   -- silently refused
SELECT COUNT(*) AS rows_for_ben FROM u;                    -- 1: re-signup failed`) },
      { title: 'Cascading soft delete to children', html: `<p><code>ON DELETE CASCADE</code> only reacts to real DELETEs. If a customer is soft-deleted, their addresses stay "live" unless you also flag them — usually with an AFTER UPDATE trigger on the parent.</p>`, code: lab(`CREATE TABLE cust (id INTEGER PRIMARY KEY, deleted_at TEXT);
CREATE TABLE addr (id INTEGER PRIMARY KEY, cust_id INTEGER REFERENCES cust(id), deleted_at TEXT);
INSERT INTO cust VALUES (1, NULL); INSERT INTO addr VALUES (10, 1, NULL), (11, 1, NULL);
CREATE TRIGGER cust_soft_cascade AFTER UPDATE OF deleted_at ON cust
WHEN NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL
BEGIN
  UPDATE addr SET deleted_at = NEW.deleted_at WHERE cust_id = NEW.id AND deleted_at IS NULL;
END;
UPDATE cust SET deleted_at = '2026-10-14' WHERE id = 1;
SELECT * FROM addr;     -- both addresses flagged too`) }
    ],
    deepDive: `<p><b>Indexes.</b> Most queries filter <code>deleted_at IS NULL</code>, so make indexes partial too (<code>CREATE INDEX … ON orders(customer_id) WHERE deleted_at IS NULL</code>) — smaller and exactly matching the hot predicate. A boolean <code>is_deleted</code> flag works but loses the "when"; a timestamp gives both.</p>
<p><b>Foreign keys.</b> Soft-deleted parents still satisfy FKs, which is often the reason to soft delete (old invoices keep pointing to the customer). But you lose automatic cascades, so cascade in triggers or app logic, and decide whether children of a deleted parent should be visible.</p>
<p><b>Growth and performance.</b> Without a purge, a table with heavy churn can become 90% dead rows: scans, caches and backups pay for data nobody sees. Options: periodic purge, moving to an archive table, or time-partitioning (drop old partitions).</p>
<p><b>Compliance.</b> GDPR/CCPA erasure requests require deletion or irreversible anonymization (also from backups within the retention window). A common design: soft delete immediately (undo window), anonymize PII after 30 days (<code>email = 'deleted-' || id</code>), hard delete or keep only aggregates later.</p>
<p><b>Alternatives:</b> temporal / system-versioned tables (SQL:2011, MariaDB, SQL Server) keep every version automatically; event sourcing stores "UserDeleted" events instead of mutating rows; Postgres row-level security can enforce the live-rows filter for every query of a role.</p>`,
    aiEra: `<p><b>What AI changes:</b> ORMs and AI scaffolding add <code>deleted_at</code> + default scopes in one prompt (<code>paranoid: true</code> in Sequelize, <code>SoftDeletes</code> in Laravel). Ask an assistant: <code>List every query in this repo that reads the users table without filtering deleted_at</code> — great for audits.</p>
<p><b>Where AI goes wrong:</b> it adds a soft-delete column but keeps the plain UNIQUE constraint, forgets raw SQL / reporting queries that bypass the ORM scope, ignores children, and calls soft delete "GDPR compliant".</p>
<p><b>What you still own:</b> the data-lifecycle policy (restore window, anonymization, purge), the partial unique index, and the decision of soft delete vs archive vs hard delete for each table. Also: agents and support tools should soft delete by default, so mistakes are reversible.</p>`,
    problems: [{
      title: 'Soft Delete That Allows Re-Registration', level: 'Medium', tags: ['soft delete', 'partial index', 'view', 'ddl'], companies: ['Stripe', 'Atlassian', 'Zomato'],
      statement: `<p>Design an <code>accounts</code> table with soft deletes. Requirements: (1) deleting an account keeps the row and records when; (2) emails are unique among <b>live</b> accounts; (3) a deleted user can sign up again with the same email; (4) the app reads live accounts through a view; (5) restoring is a single UPDATE.</p>`,
      constraints: `<p>SQLite dialect. Must be enforced by the database, not just app code.</p>`,
      example: `<p>Create asha@x.com (id 1) → soft delete it → sign up asha@x.com again (id 2) ${H.c('g', 'allowed')} → sign up asha@x.com a third time ${H.c('r', 'rejected')} because id 2 is live. The view shows only id 2.</p>`,
      brute: { why: `<p>Naive design: <code>email TEXT UNIQUE</code> plus an <code>is_deleted</code> flag. The UNIQUE index still counts deleted rows, so the returning user is told "email taken" forever. The other naive option — hard deleting — loses history and makes restore impossible.</p>`, code: lab(`CREATE TABLE accounts (id INTEGER PRIMARY KEY, email TEXT NOT NULL UNIQUE, is_deleted INTEGER NOT NULL DEFAULT 0);
INSERT INTO accounts (email) VALUES ('asha@x.com');
UPDATE accounts SET is_deleted = 1 WHERE id = 1;
INSERT OR IGNORE INTO accounts (email) VALUES ('asha@x.com');   -- refused: UNIQUE still sees the deleted row
SELECT * FROM accounts;                                         -- still 1 row`) },
      mcq: { q: 'Which constraint satisfies "unique among live accounts only"?', options: ['CREATE UNIQUE INDEX … ON accounts(email) WHERE deleted_at IS NULL', 'UNIQUE(email, deleted_at)', 'UNIQUE(email)', 'CHECK (deleted_at IS NULL)'], answer: 0, explain: 'A partial unique index only includes live rows. UNIQUE(email, deleted_at) fails because NULLs are distinct in unique indexes, so two LIVE rows (both NULL) would be allowed.' },
      hints: [`<p>Hint 1: Use a nullable <code>deleted_at</code> timestamp instead of a boolean — NULL means live and you also learn <i>when</i>.</p>`, `<p>Hint 2: A <b>partial</b> unique index (<code>… WHERE deleted_at IS NULL</code>) ignores deleted rows. Beware <code>UNIQUE(email, deleted_at)</code>: NULLs never collide, so it would allow two live duplicates.</p>`, `<p>Hint 3: Recipe: CREATE TABLE → CREATE UNIQUE INDEX … WHERE deleted_at IS NULL → CREATE VIEW live_accounts → soft delete = UPDATE SET deleted_at = now WHERE id = ? AND deleted_at IS NULL → restore = UPDATE SET deleted_at = NULL (may fail if the email was re-taken).</p>`],
      solution: {
        approach: `<p>Nullable <code>deleted_at</code>, partial unique index on live rows, a view for the app, guarded UPDATEs for delete/restore.</p>`,
        code: lab(`CREATE TABLE accounts (
  id         INTEGER PRIMARY KEY,
  email      TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TEXT                                  -- NULL = live
);
CREATE UNIQUE INDEX ux_accounts_email_live ON accounts(email) WHERE deleted_at IS NULL;
CREATE VIEW live_accounts AS SELECT id, email, created_at FROM accounts WHERE deleted_at IS NULL;

INSERT INTO accounts (email) VALUES ('asha@x.com');                                -- id 1
UPDATE accounts SET deleted_at = CURRENT_TIMESTAMP WHERE id = 1 AND deleted_at IS NULL;
INSERT INTO accounts (email) VALUES ('asha@x.com');                                -- id 2: allowed
INSERT OR IGNORE INTO accounts (email) VALUES ('asha@x.com');                      -- refused: id 2 is live
SELECT * FROM live_accounts;                                                       -- only id 2
SELECT id, email, deleted_at IS NOT NULL AS deleted FROM accounts ORDER BY id;`),
        dry: { head: ['step', 'live rows in index', 'result'], rows: [['insert asha (id 1)', '{asha:1}', H.c('g', 'ok')], ['soft delete 1', '{}', H.c('y', 'updated')], ['insert asha (id 2)', '{asha:2}', H.c('g', 'ok')], ['insert asha again', '{asha:2}', H.c('r', 'conflict → ignored')]] },
        complexity: `<p>Each write is one index probe O(log N). The partial index is smaller than a full one because deleted rows are excluded.</p>`,
        followUps: ['Restore id 1 now — what happens and what should the product do?', 'Anonymize emails 30 days after deletion', 'Enforce the live filter with Postgres row-level security instead of a view']
      }
    }]
  });
  registerModule({ id: 'sql09', title: 'DML', intro: 'x', goals: [], prereqs: 'x', hours: 1, databases: { shop: DB_SHOP, lab: DB_LAB }, topics: topics, practice: practice, quiz: quiz, interview: interview });
})();
