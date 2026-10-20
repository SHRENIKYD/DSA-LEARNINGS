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
      tests: { cmp: 'exact', engine: 'sqlite', cases: [
          { cols: ['id', 'email', 'name'], rows: [[1, 'asha@mail.com', 'Asha'], [2, 'ben@mail.com', 'Ben'], [5, 'chen@mail.com', 'Chen']] },
          { setup: 'DELETE FROM contacts; ', rows: [] },
          { setup: 'DELETE FROM contacts; INSERT INTO contacts VALUES (1, \'a@x.com\', \'A\'), (2, \'b@x.com\', \'B\'), (3, \'c@x.com\', \'C\');', cols: ['id', 'email', 'name'], rows: [[1, 'a@x.com', 'A'], [2, 'b@x.com', 'B'], [3, 'c@x.com', 'C']] },
          { setup: 'DELETE FROM contacts; INSERT INTO contacts VALUES (4, \'Z@x.com\', \'z4\'), (2, \'z@X.com\', \'z2\'), (9, \'Z@X.COM\', \'z9\'), (7, \'y@x.com\', \'y7\'), (3, \'Y@x.com\', \'y3\');', cols: ['id', 'email', 'name'], rows: [[2, 'z@X.com', 'z2'], [3, 'Y@x.com', 'y3']] },
          { setup: 'DELETE FROM contacts; INSERT INTO contacts VALUES (5, \'only@x.com\', \'o\');', cols: ['id', 'email', 'name'], rows: [[5, 'only@x.com', 'o']] },
          { setup: 'DELETE FROM contacts; INSERT INTO contacts VALUES (1, \'a@x.com\', \'A1\'), (2, \'a@x.com\', \'A2\'), (3, \'a@x.com\', \'A3\'), (4, \'A@x.com\', \'A4\');', cols: ['id', 'email', 'name'], rows: [[1, 'a@x.com', 'A1']] },
          { setup: 'DELETE FROM contacts; INSERT INTO contacts VALUES (1, \'a@x.com\', \'n0\'), (2, \'D@x.com\', \'n1\'), (3, \'B@x.com\', \'n2\'), (4, \'D@x.com\', \'n3\'), (5, \'a@x.com\', \'n4\'), (6, \'e@x.com\', \'n5\'), (7, \'D@x.com\', \'n6\'), (8, \'e@x.com\', \'n7\'), (9, \'e@x.com\', \'n8\'), (10, \'a@x.com\', \'n9\'), (11, \'e@x.com\', \'n10\'), (12, \'e@x.com\', \'n11\'), (13, \'a@x.com\', \'n12\'), (14, \'e@x.com\', \'n13\'), (15, \'a@x.com\', \'n14\'), (16, \'e@x.com\', \'n15\'), (17, \'B@x.com\', \'n16\'), (18, \'a@x.com\', \'n17\'), (19, \'c@x.com\', \'n18\'), (20, \'B@x.com\', \'n19\'), (21, \'e@x.com\', \'n20\'), (22, \'e@x.com\', \'n21\'), (23, \'D@x.com\', \'n22\'), (24, \'c@x.com\', \'n23\'), (25, \'a@x.com\', \'n24\'), (26, \'F@x.com\', \'n25\'), (27, \'c@x.com\', \'n26\'), (28, \'c@x.com\', \'n27\'), (29, \'B@x.com\', \'n28\'), (30, \'D@x.com\', \'n29\'), (31, \'D@x.com\', \'n30\'), (32, \'e@x.com\', \'n31\'), (33, \'F@x.com\', \'n32\'), (34, \'B@x.com\', \'n33\'), (35, \'e@x.com\', \'n34\'), (36, \'F@x.com\', \'n35\'), (37, \'D@x.com\', \'n36\'), (38, \'B@x.com\', \'n37\'), (39, \'e@x.com\', \'n38\'), (40, \'B@x.com\', \'n39\');', cols: ['id', 'email', 'name'], rows: [[1, 'a@x.com', 'n0'], [2, 'D@x.com', 'n1'], [3, 'B@x.com', 'n2'], [6, 'e@x.com', 'n5'], [19, 'c@x.com', 'n18'], [26, 'F@x.com', 'n25']] },
          { after: 'INSERT INTO contacts (email, name) VALUES (\'ASHA@mail.com\', \'Again\')', error: 'UNIQUE' },
          { after: 'INSERT INTO contacts (email, name) VALUES (\'Chen@Mail.com\', \'Again\')', error: 'UNIQUE' },
          { after: 'INSERT INTO contacts (email, name) VALUES (\'new@mail.com\', \'New\'); SELECT COUNT(*) FROM contacts', rows: [[4]] },
          { result: 0, rows: [[3, 'ASHA@mail.com', 'Asha K'], [4, 'ben@mail.com', 'Benjamin'], [6, 'ben@mail.com', 'Ben B']] }
        ] },
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
      tests: { cmp: 'exact', engine: 'sqlite', cases: [
          { setup: 'UPDATE products SET updated_at = \'2000-01-01 00:00:00\'; DELETE FROM price_feed; INSERT INTO price_feed VALUES (\'PH-001\', \'Pixel Phone\', \'phones\', 47900, 8), (\'CB-002\', \'USB-C Cable\', \'accessories\', 999, 180), (\'BK-003\', \'SQL Book\', \'books\', 2999, 15), (\'KB-006\', \'Mech Keyboard\', \'accessories\', 3499, 25);', after: 'SELECT sku, price_cents, stock, updated_at > \'2020-01-01\' FROM products ORDER BY sku', rows: [['BK-003', 2999, 15, 0], ['BK-005', 4599, 3, 0], ['CB-002', 999, 180, 1], ['HP-004', 7999, 0, 0], ['KB-006', 3499, 25, 1], ['PH-001', 47900, 8, 1]] },
          { setup: 'UPDATE products SET updated_at = \'2000-01-01 00:00:00\'; DELETE FROM price_feed; ', after: 'SELECT sku, price_cents, stock, updated_at > \'2020-01-01\' FROM products ORDER BY sku', rows: [['BK-003', 2999, 15, 0], ['BK-005', 4599, 3, 0], ['CB-002', 999, 200, 0], ['HP-004', 7999, 0, 0], ['PH-001', 49900, 10, 0]] },
          { setup: 'UPDATE products SET updated_at = \'2000-01-01 00:00:00\'; DELETE FROM price_feed; INSERT INTO price_feed VALUES (\'PH-001\', \'Pixel Phone\', \'phones\', 49900, 10), (\'CB-002\', \'USB-C Cable\', \'accessories\', 999, 200), (\'BK-003\', \'SQL Book\', \'books\', 2999, 15), (\'HP-004\', \'Headphones\', \'accessories\', 7999, 0), (\'BK-005\', \'DB Internals\', \'books\', 4599, 3);', after: 'SELECT sku, price_cents, stock, updated_at > \'2020-01-01\' FROM products ORDER BY sku', rows: [['BK-003', 2999, 15, 0], ['BK-005', 4599, 3, 0], ['CB-002', 999, 200, 0], ['HP-004', 7999, 0, 0], ['PH-001', 49900, 10, 0]] },
          { setup: 'UPDATE products SET updated_at = \'2000-01-01 00:00:00\'; DELETE FROM price_feed; INSERT INTO price_feed VALUES (\'BK-003\', \'n\', \'c\', 2999, 16), (\'PH-001\', \'n\', \'c\', 49900, 10);', after: 'SELECT sku, price_cents, stock, updated_at > \'2020-01-01\' FROM products ORDER BY sku', rows: [['BK-003', 2999, 16, 1], ['BK-005', 4599, 3, 0], ['CB-002', 999, 200, 0], ['HP-004', 7999, 0, 0], ['PH-001', 49900, 10, 0]] },
          { setup: 'UPDATE products SET updated_at = \'2000-01-01 00:00:00\'; DELETE FROM price_feed; INSERT INTO price_feed VALUES (\'BK-003\', \'n\', \'c\', 3000, 15), (\'HP-004\', \'Renamed\', \'other\', 7999, 0);', after: 'SELECT sku, price_cents, stock, updated_at > \'2020-01-01\' FROM products ORDER BY sku', rows: [['BK-003', 3000, 15, 1], ['BK-005', 4599, 3, 0], ['CB-002', 999, 200, 0], ['HP-004', 7999, 0, 0], ['PH-001', 49900, 10, 0]] },
          { setup: 'UPDATE products SET updated_at = \'2000-01-01 00:00:00\'; DELETE FROM price_feed; INSERT INTO price_feed VALUES (\'N-1\', \'n\', \'c\', 100, 1), (\'N-2\', \'n\', \'c\', 200, 2), (\'N-3\', \'n\', \'c\', 300, 3);', after: 'SELECT sku, price_cents, stock, updated_at > \'2020-01-01\' FROM products ORDER BY sku', rows: [['BK-003', 2999, 15, 0], ['BK-005', 4599, 3, 0], ['CB-002', 999, 200, 0], ['HP-004', 7999, 0, 0], ['N-1', 100, 1, 1], ['N-2', 200, 2, 1], ['N-3', 300, 3, 1], ['PH-001', 49900, 10, 0]] },
          { setup: 'UPDATE products SET updated_at = \'2000-01-01 00:00:00\'; DELETE FROM price_feed; INSERT INTO price_feed VALUES (\'PH-001\', \'Pixel Phone\', \'phones\', 49901, 10), (\'CB-002\', \'USB-C Cable\', \'accessories\', 1000, 200), (\'BK-003\', \'SQL Book\', \'books\', 3000, 15), (\'HP-004\', \'Headphones\', \'accessories\', 8000, 0), (\'BK-005\', \'DB Internals\', \'books\', 4600, 3), (\'KB-006\', \'n\', \'c\', 3499, 25);', after: 'SELECT sku, price_cents, stock, updated_at > \'2020-01-01\' FROM products ORDER BY sku', rows: [['BK-003', 3000, 15, 1], ['BK-005', 4600, 3, 1], ['CB-002', 1000, 200, 1], ['HP-004', 8000, 0, 1], ['KB-006', 3499, 25, 1], ['PH-001', 49901, 10, 1]] },
          { setup: 'UPDATE products SET updated_at = \'2000-01-01 00:00:00\'; DELETE FROM price_feed; INSERT INTO price_feed VALUES (\'S-000\', \'n\', \'c\', 100, 0), (\'S-001\', \'n\', \'c\', 101, 1), (\'S-002\', \'n\', \'c\', 102, 2), (\'S-003\', \'n\', \'c\', 103, 3), (\'S-004\', \'n\', \'c\', 104, 4), (\'S-005\', \'n\', \'c\', 105, 5), (\'S-006\', \'n\', \'c\', 106, 6), (\'S-007\', \'n\', \'c\', 107, 7), (\'S-008\', \'n\', \'c\', 108, 8), (\'S-009\', \'n\', \'c\', 109, 9), (\'S-010\', \'n\', \'c\', 110, 10), (\'S-011\', \'n\', \'c\', 111, 11), (\'S-012\', \'n\', \'c\', 112, 12), (\'S-013\', \'n\', \'c\', 113, 13), (\'S-014\', \'n\', \'c\', 114, 14), (\'S-015\', \'n\', \'c\', 115, 15), (\'S-016\', \'n\', \'c\', 116, 16), (\'S-017\', \'n\', \'c\', 117, 17), (\'S-018\', \'n\', \'c\', 118, 18), (\'S-019\', \'n\', \'c\', 119, 19), (\'S-020\', \'n\', \'c\', 120, 20), (\'S-021\', \'n\', \'c\', 121, 21), (\'S-022\', \'n\', \'c\', 122, 22), (\'S-023\', \'n\', \'c\', 123, 23), (\'S-024\', \'n\', \'c\', 124, 24), (\'S-025\', \'n\', \'c\', 125, 25), (\'S-026\', \'n\', \'c\', 126, 26), (\'S-027\', \'n\', \'c\', 127, 27), (\'S-028\', \'n\', \'c\', 128, 28), (\'S-029\', \'n\', \'c\', 129, 29), (\'S-030\', \'n\', \'c\', 130, 30), (\'S-031\', \'n\', \'c\', 131, 31), (\'S-032\', \'n\', \'c\', 132, 32), (\'S-033\', \'n\', \'c\', 133, 33), (\'S-034\', \'n\', \'c\', 134, 34), (\'S-035\', \'n\', \'c\', 135, 35), (\'S-036\', \'n\', \'c\', 136, 36), (\'S-037\', \'n\', \'c\', 137, 37), (\'S-038\', \'n\', \'c\', 138, 38), (\'S-039\', \'n\', \'c\', 139, 39), (\'S-040\', \'n\', \'c\', 140, 40), (\'S-041\', \'n\', \'c\', 141, 41), (\'S-042\', \'n\', \'c\', 142, 42), (\'S-043\', \'n\', \'c\', 143, 43), (\'S-044\', \'n\', \'c\', 144, 44), (\'S-045\', \'n\', \'c\', 145, 45), (\'S-046\', \'n\', \'c\', 146, 46), (\'S-047\', \'n\', \'c\', 147, 47), (\'S-048\', \'n\', \'c\', 148, 48), (\'S-049\', \'n\', \'c\', 149, 49), (\'S-050\', \'n\', \'c\', 150, 50), (\'S-051\', \'n\', \'c\', 151, 51), (\'S-052\', \'n\', \'c\', 152, 52), (\'S-053\', \'n\', \'c\', 153, 53), (\'S-054\', \'n\', \'c\', 154, 54), (\'S-055\', \'n\', \'c\', 155, 55), (\'S-056\', \'n\', \'c\', 156, 56), (\'S-057\', \'n\', \'c\', 157, 57), (\'S-058\', \'n\', \'c\', 158, 58), (\'S-059\', \'n\', \'c\', 159, 59);', after: 'SELECT sku, price_cents, stock, updated_at > \'2020-01-01\' FROM products ORDER BY sku', rows: [['BK-003', 2999, 15, 0], ['BK-005', 4599, 3, 0], ['CB-002', 999, 200, 0], ['HP-004', 7999, 0, 0], ['PH-001', 49900, 10, 0], ['S-000', 100, 0, 1], ['S-001', 101, 1, 1], ['S-002', 102, 2, 1], ['S-003', 103, 3, 1], ['S-004', 104, 4, 1], ['S-005', 105, 5, 1], ['S-006', 106, 6, 1], ['S-007', 107, 7, 1], ['S-008', 108, 8, 1], ['S-009', 109, 9, 1], ['S-010', 110, 10, 1], ['S-011', 111, 11, 1], ['S-012', 112, 12, 1], ['S-013', 113, 13, 1], ['S-014', 114, 14, 1], ['S-015', 115, 15, 1], ['S-016', 116, 16, 1], ['S-017', 117, 17, 1], ['S-018', 118, 18, 1], ['S-019', 119, 19, 1], ['S-020', 120, 20, 1], ['S-021', 121, 21, 1], ['S-022', 122, 22, 1], ['S-023', 123, 23, 1], ['S-024', 124, 24, 1], ['S-025', 125, 25, 1], ['S-026', 126, 26, 1], ['S-027', 127, 27, 1], ['S-028', 128, 28, 1], ['S-029', 129, 29, 1], ['S-030', 130, 30, 1], ['S-031', 131, 31, 1], ['S-032', 132, 32, 1], ['S-033', 133, 33, 1], ['S-034', 134, 34, 1], ['S-035', 135, 35, 1], ['S-036', 136, 36, 1], ['S-037', 137, 37, 1], ['S-038', 138, 38, 1], ['S-039', 139, 39, 1], ['S-040', 140, 40, 1], ['S-041', 141, 41, 1], ['S-042', 142, 42, 1], ['S-043', 143, 43, 1], ['S-044', 144, 44, 1], ['S-045', 145, 45, 1], ['S-046', 146, 46, 1], ['S-047', 147, 47, 1], ['S-048', 148, 48, 1], ['S-049', 149, 49, 1], ['S-050', 150, 50, 1], ['S-051', 151, 51, 1], ['S-052', 152, 52, 1], ['S-053', 153, 53, 1], ['S-054', 154, 54, 1], ['S-055', 155, 55, 1], ['S-056', 156, 56, 1], ['S-057', 157, 57, 1], ['S-058', 158, 58, 1], ['S-059', 159, 59, 1]] },
          { setup: 'UPDATE products SET updated_at = \'2000-01-01 00:00:00\'; ', after: 'UPDATE products SET updated_at = \'2000-01-01 00:00:00\'; INSERT INTO products (sku, name, category, price_cents, stock) SELECT sku, name, category, price_cents, stock FROM price_feed WHERE true ON CONFLICT (sku) DO UPDATE SET price_cents = excluded.price_cents, stock = excluded.stock, updated_at = CURRENT_TIMESTAMP WHERE products.price_cents IS NOT excluded.price_cents OR products.stock IS NOT excluded.stock; SELECT sku, updated_at > \'2020-01-01\' FROM products ORDER BY sku', rows: [['BK-003', 0], ['BK-005', 0], ['CB-002', 0], ['HP-004', 0], ['KB-006', 0], ['PH-001', 0]] },
          { setup: 'UPDATE products SET updated_at = \'2000-01-01 00:00:00\'; DELETE FROM price_feed; INSERT INTO price_feed VALUES (\'PH-001\', \'n\', \'c\', 47900, 8);', after: 'SELECT name, category FROM products WHERE sku = \'PH-001\'', rows: [['Pixel Phone', 'phones']] },
          { setup: 'UPDATE products SET updated_at = \'2000-01-01 00:00:00\'; DELETE FROM price_feed; INSERT INTO price_feed VALUES (\'NEW-1\', \'Brand New\', \'toys\', 5, 5);', after: 'SELECT name, category FROM products WHERE sku = \'NEW-1\'', rows: [['Brand New', 'toys']] }
        ] },
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
      tests: { cmp: 'exact', engine: 'sqlite', cases: [
          { cols: ['id', 'email', 'deleted'], rows: [[1, 'asha@x.com', 1], [2, 'asha@x.com', 0]] },
          { after: 'SELECT id, email FROM live_accounts', rows: [[2, 'asha@x.com']] },
          { after: 'INSERT INTO accounts (email) VALUES (\'asha@x.com\')', error: 'UNIQUE' },
          { after: 'UPDATE accounts SET deleted_at = NULL WHERE id = 1', error: 'UNIQUE' },
          { after: 'UPDATE accounts SET deleted_at = CURRENT_TIMESTAMP WHERE id = 2; UPDATE accounts SET deleted_at = NULL WHERE id = 1; SELECT id FROM live_accounts', rows: [[1]] },
          { after: 'UPDATE accounts SET deleted_at = CURRENT_TIMESTAMP WHERE id = 2; SELECT COUNT(*) FROM accounts WHERE email = \'asha@x.com\' AND deleted_at IS NOT NULL', rows: [[2]] },
          { after: 'INSERT INTO accounts (email) VALUES (\'ben@x.com\'); SELECT COUNT(*) FROM live_accounts', rows: [[2]] },
          { after: 'UPDATE accounts SET deleted_at = CURRENT_TIMESTAMP WHERE id = 2; INSERT INTO accounts (email) VALUES (\'asha@x.com\'); SELECT id FROM live_accounts', rows: [[3]] },
          { after: 'INSERT INTO accounts (email) VALUES (NULL)', error: 'NOT NULL' },
          { after: 'SELECT name FROM pragma_table_info(\'live_accounts\') ORDER BY cid', rows: [['id'], ['email'], ['created_at']] },
          { after: 'SELECT COUNT(*) FROM accounts', rows: [[2]] }
        ] },
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

  /* ======================= TOPIC 5: Views (abstraction + security) ======================= */
  var EMP_COLS = ['id', 'name', 'dept', 'title', 'salary', 'ssn', 'email'];
  var EMP_ROWS = [[1, 'Asha', 'Eng', 'Eng Manager', 250000, '111-11-1111', 'asha@corp.com'], [2, 'Ben', 'Eng', 'Engineer', 180000, '222-22-2222', 'ben@corp.com'], [3, 'Chen', 'Sales', 'Account Exec', 90000, '333-33-3333', 'chen@corp.com'], [4, 'Dara', 'HR', 'HR Partner', 110000, '444-44-4444', 'dara@corp.com'], [5, 'Eli', 'Eng', 'Engineer', 170000, '555-55-5555', 'eli@corp.com']];

  topics.push({
    title: 'Views: Saved Queries for Simplicity and Security',
    analogy: `<p>A view is a <b>shop window</b>. The storeroom (base table) has everything, including the safe with salaries and ID numbers. The window shows only what the passer-by is allowed to see — some items, some angles — and it always reflects what is in the store <i>right now</i>. Customers get the key to the window, never to the storeroom.</p>`,
    explain: `<p>A <b>view</b> is a named SELECT stored in the database. You query it like a table: <code>SELECT * FROM employee_directory</code>. It stores <b>no data</b> — every time you read it, the database runs (more precisely, <i>inlines</i>) its query against the base tables, so it is always up to date.</p>
<pre>CREATE VIEW employee_directory AS
SELECT id, name, dept, title, email,
       '***-**-' || substr(ssn, -4) AS ssn_masked   -- column masking
FROM employees;                                     -- salary is simply not selected</pre>
<p><b>Four jobs views do:</b></p>
${H.table(['Job', 'Example'], [
  ['<b>Security: hide columns</b>', 'directory without salary / SSN; masked card numbers'],
  ['<b>Security: hide rows</b>', '<code>WHERE dept = \'Eng\'</code> for the Eng manager; only live rows (soft deletes)'],
  ['<b>Simplify</b>', 'hide a 5-table join behind <code>order_summary</code>; analysts write 1-line queries'],
  ['<b>Stable interface</b>', 'rename / split tables underneath while old code keeps reading the view']
])}
<p><b>How security works (Postgres / MySQL / SQL Server):</b> <code>REVOKE</code> every privilege on the base table from the analyst role, then <code>GRANT SELECT ON employee_directory TO analyst</code>. The view runs with its <i>owner's</i> rights, so analysts can read through the window but cannot open the storeroom. (SQLite has no users or GRANT — in SQLite, views are about simplification; access control lives in the app.)</p>
<p><b>Can you write through a view?</b> Simple single-table views without GROUP BY / DISTINCT are <b>automatically updatable</b> in Postgres and MySQL. Add <code>WITH CHECK OPTION</code> so nobody can insert or update a row the view itself would not show. SQLite views are read-only — you make them writable with <code>INSTEAD OF</code> triggers (see the Triggers topic).</p>`,
    clues: ['"analysts must not see salaries / PII" → column-restricted view + GRANT on the view only', '"each manager sees only their team" → row-filtering view (or row-level security)', '"hide this 5-table join from report writers" → view as an abstraction layer', '"we are renaming a table but old code must keep working" → compatibility view', '"inserts through the view must stay inside the view" → <code>WITH CHECK OPTION</code>', '"the view is slow" → it is just a query: index the base tables or materialize it'],
    code: [shop(`-- 1) Column security: no salary, SSN masked to last 4 digits.
CREATE VIEW employee_directory AS
SELECT id, name, dept, title, email,
       '***-**-' || substr(ssn, -4) AS ssn_masked
FROM employees;

-- 2) Row security: the Eng manager's view of their own team.
CREATE VIEW eng_team AS
SELECT id, name, title, salary
FROM employees
WHERE dept = 'Eng';

-- 3) Aggregate-only view: pay stats without exposing any one person
--    (groups of 1 would reveal an individual's salary, so hide them).
CREATE VIEW dept_pay_stats AS
SELECT dept, COUNT(*) AS headcount, CAST(AVG(salary) AS INTEGER) AS avg_salary
FROM employees
GROUP BY dept
HAVING COUNT(*) >= 2;

SELECT * FROM employee_directory;
SELECT * FROM eng_team;
SELECT * FROM dept_pay_stats;`, 'Three security views (▶ Run)'),
      pg(`-- PostgreSQL: the access-control half that SQLite does not have.
CREATE ROLE analyst NOLOGIN;
REVOKE ALL ON employees FROM PUBLIC;                       -- nobody reads the base table directly

CREATE VIEW employee_directory WITH (security_barrier = true) AS
SELECT id, name, dept, title, email, '***-**-' || right(ssn, 4) AS ssn_masked
FROM employees;
GRANT SELECT ON employee_directory TO analyst;             -- the only door analysts get

-- Updatable view that refuses rows it cannot see:
CREATE VIEW eng_team AS
SELECT id, name, dept, title FROM employees WHERE dept = 'Eng'
WITH CHECK OPTION;
-- UPDATE eng_team SET dept = 'Sales' WHERE id = 2;  -> ERROR: new row violates check option

-- Alternative to many per-team views: row-level security on the table itself.
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
CREATE POLICY same_dept ON employees FOR SELECT
  USING (dept = current_setting('app.dept'));`, 'GRANT, security_barrier, WITH CHECK OPTION, RLS (PostgreSQL reference)'),
      shop(`-- A view is just a stored query: it always reflects the CURRENT base data.
CREATE VIEW order_summary AS
SELECT o.id AS order_id, c.name AS customer, p.name AS product,
       o.qty, o.qty * p.price_cents AS total_cents, o.status
FROM orders o
JOIN customers c ON c.id = o.customer_id
JOIN products  p ON p.id = o.product_id;

SELECT * FROM order_summary WHERE status = 'paid';
UPDATE products SET price_cents = 1099 WHERE id = 2;      -- change the base table...
SELECT order_id, product, total_cents FROM order_summary WHERE product = 'USB-C Cable';  -- ...view sees it instantly
-- Where is the view stored? Only its SQL text:
SELECT name, sql FROM sqlite_master WHERE type = 'view';`, 'Views are always fresh: only the query is stored (▶ Run)')],
    viz: {
      title: 'Reading through a security view: who asks, what the view hides',
      input: 'analyst',
      inputLabel: 'Role: analyst · eng_manager · hr',
      gen: function (input) {
        var role = strIn(input).trim().toLowerCase();
        var defs = {
          analyst: { view: 'employee_directory', cols: ['id', 'name', 'dept', 'title', 'email', 'ssn_masked'], where: null, sql: "CREATE VIEW employee_directory AS\nSELECT id, name, dept, title, email,\n  '***-**-' || substr(ssn, -4) AS ssn_masked\nFROM employees;" },
          eng_manager: { view: 'eng_team', cols: ['id', 'name', 'title', 'salary'], where: 'Eng', sql: "CREATE VIEW eng_team AS\nSELECT id, name, title, salary\nFROM employees\nWHERE dept = 'Eng';" },
          hr: { view: 'employees (base table)', cols: EMP_COLS, where: null, sql: '-- HR owns the data:\nGRANT SELECT ON employees TO hr;' }
        };
        var d = defs[role];
        if (!d) throw new Error('Role must be one of: analyst, eng_manager, hr');
        var g = function (hl, ehl, tags) {
          return { type: 'graph', directed: true, height: 46, label: 'Who can reach what',
            nodes: [{ id: 'U', label: role, x: 10, y: 23, shape: 'box' }, { id: 'V', label: d.view === 'employees (base table)' ? 'GRANT' : d.view, x: 45, y: 10, shape: 'box' }, { id: 'T', label: 'employees table', x: 84, y: 23, shape: 'box' }],
            edges: [['U', 'V', 'SELECT'], ['V', 'T', 'reads'], ['U', 'T', 'direct?']], hl: hl || {}, ehl: ehl || {}, tags: tags || {} };
        };
        var f = [];
        f.push({ narr: 'A <b>' + esc(role) + '</b> wants employee data. ' + (role === 'hr' ? 'HR is the data owner and is granted the base table itself.' : 'They hold <code>SELECT</code> only on the view <b>' + d.view + '</b>; every privilege on <code>employees</code> was revoked.'),
          parts: [g({ U: 'cur' }), sqlPart(d.sql)] });
        f.push({ narr: 'The query <code>SELECT * FROM ' + esc(d.view.split(' ')[0]) + '</code> is expanded: the database substitutes the view\'s SELECT and reads the base table with the <b>view owner\'s</b> rights.',
          parts: [g({ U: 'done', V: 'cur', T: 'cur' }, { 'U-V': 'ok', 'V-T': 'ok' }), tbl('employees (base table, all columns)', EMP_COLS, EMP_ROWS)] });
        var keep = [], drop = [];
        EMP_ROWS.forEach(function (r, i) { if (!d.where || r[2] === d.where) keep.push(i); else drop.push(i); });
        f.push({ narr: d.where ? 'Row filter: <code>WHERE dept = \'' + d.where + '\'</code>. Rows from other departments are dropped (red) — the manager cannot even learn they exist.' : 'No row filter in this view: every row passes (blue). Security here comes from the column list.',
          parts: [tbl('employees: row filter', EMP_COLS, EMP_ROWS, (function () { var h = many(keep, 'win'); drop.forEach(function (k) { h[k] = 'bad'; }); return h; })())] });
        var out = keep.map(function (k) {
          var r = EMP_ROWS[k];
          return d.cols.map(function (c) { return c === 'ssn_masked' ? '***-**-' + r[5].slice(-4) : r[EMP_COLS.indexOf(c)]; });
        });
        var hidden = EMP_COLS.filter(function (c) { return d.cols.indexOf(c) < 0 && !(c === 'ssn' && d.cols.indexOf('ssn_masked') >= 0); });
        var masked = d.cols.indexOf('ssn_masked') >= 0;
        f.push({ narr: 'Column projection: ' + (hidden.length ? 'the columns <b>' + hidden.join(', ') + '</b> are simply not selected, so they cannot leak. ' : 'HR sees every column. ') + (masked ? 'The SSN is replaced by a <b>masked expression</b> — only the last 4 digits survive.' : ''),
          parts: [tbl('result of ' + d.view.split(' ')[0] + ' (' + out.length + ' rows)', d.cols, out, many(out.map(function (_, i) { return i; }), 'ok'))] });
        if (role !== 'hr') {
          f.push({ narr: '<span class="c-r">Direct attempt:</span> <code>SELECT salary, ssn FROM employees</code> → <b>permission denied for table employees</b>. The only door is the view.',
            parts: [g({ U: 'cur', T: 'bad' }, { 'U-T': 'bad' }, { T: 'no GRANT' }), sqlPart('SELECT salary, ssn FROM employees;\n-- ERROR: permission denied for table employees', { 1: 'bad', 2: 'bad' })] });
          f.push({ narr: 'Bonus: an <b>aggregate view</b> can share insight without exposing individuals — departments with fewer than 2 people are hidden so nobody can infer a single salary.',
            parts: [tbl('dept_pay_stats (HAVING COUNT(*) >= 2)', ['dept', 'headcount', 'avg_salary'], [['Eng', 3, 200000]], { 0: 'sel' }), txt('Sales (1 person) and HR (1 person) are suppressed.')] });
        } else {
          f.push({ narr: 'HR has full access because it owns the data. Good practice still applies: <b>least privilege</b> — even HR tools often read a view without SSNs unless a task really needs them.', parts: [g({ U: 'ok', T: 'ok' }, { 'U-V': 'ok', 'V-T': 'ok' })] });
        }
        return f;
      }
    },
    examples: [
      { title: 'View as a compatibility layer during a rename', html: `<p>You rename <code>customers</code> to <code>clients</code>, but 40 old reports still say <code>FROM customers</code>. Create a view with the old name pointing at the new table; migrate the reports gradually, then drop the view.</p>`, code: shop(`ALTER TABLE customers RENAME TO clients;
CREATE VIEW customers_v AS SELECT id, email, name, city, tier FROM clients;   -- old shape, new home
SELECT * FROM customers_v WHERE tier = 'gold';`) },
      { title: 'SELECT * in a view is frozen at creation (Postgres/MySQL)', html: `<p>Postgres and MySQL expand <code>SELECT *</code> into an explicit column list when the view is created. A column added to the base table later does <b>not</b> appear in the view — and a sensitive column added later will not suddenly leak either. List columns explicitly so the intent is visible.</p>`, code: pg(`CREATE VIEW v AS SELECT * FROM employees;    -- stored as SELECT id, name, ... (expanded now)
ALTER TABLE employees ADD COLUMN bonus int;
SELECT bonus FROM v;                          -- ERROR: column "bonus" does not exist`) },
      { title: 'Writing through a SQLite view with INSTEAD OF', html: `<p>SQLite views are read-only. An <code>INSTEAD OF UPDATE</code> trigger tells SQLite what to do instead — and lets you enforce rules like "managers may change titles, never salaries, and only for their own team" (a hand-made WITH CHECK OPTION).</p>`, code: shop(`CREATE VIEW eng_team AS SELECT id, name, title, salary FROM employees WHERE dept = 'Eng';
CREATE TRIGGER eng_team_title INSTEAD OF UPDATE OF title ON eng_team
BEGIN
  UPDATE employees SET title = NEW.title WHERE id = OLD.id AND dept = 'Eng';
END;
UPDATE eng_team SET title = 'Senior Engineer' WHERE name = 'Ben';
SELECT * FROM eng_team;`) },
      { title: 'Views do not make queries faster', html: `<p>A view is inlined into your query, so <code>SELECT … FROM order_summary WHERE customer = 'Asha'</code> runs the same joins as writing them by hand; the planner can push the filter inside. Stacking views on views on views hides cost — read <code>EXPLAIN</code> on the final query. If the view is an expensive aggregate read thousands of times, materialize it (next topic).</p>`, code: shop(`CREATE VIEW order_summary AS
SELECT o.id, c.name AS customer, o.qty FROM orders o JOIN customers c ON c.id = o.customer_id;
EXPLAIN QUERY PLAN SELECT * FROM order_summary WHERE customer = 'Asha';`) }
    ],
    deepDive: `<p><b>Leaky views.</b> In Postgres, a user can pass a cheap custom function in their WHERE clause (<code>WHERE leak(ssn)</code>); if the planner evaluates it <i>before</i> the view's own filter, it can print rows the view should hide. <code>security_barrier = true</code> forces the view's conditions to run first (only <code>LEAKPROOF</code> functions are pushed down). Row-level security policies have the same protection built in.</p>
<p><b>Whose rights?</b> Classic views run with the <b>owner's</b> privileges (MySQL: <code>SQL SECURITY DEFINER</code>, default). Postgres 15 added <code>security_invoker = true</code> so the caller's privileges and RLS policies apply — safer when the owner is a superuser. Supabase-style setups rely on this.</p>
<p><b>Updatable view rules</b> (Postgres): exactly one table in FROM, no GROUP BY/HAVING/DISTINCT/LIMIT/window/set operations; computed columns are read-only. <code>WITH LOCAL CHECK OPTION</code> checks only this view's WHERE; <code>CASCADED</code> (default) also checks underlying views.</p>
<p><b>Dependency management.</b> You cannot drop or change the type of a column a view depends on without dropping the view (Postgres), so migrations must recreate dependent views — tools like <code>CREATE OR REPLACE VIEW</code> allow adding columns at the end only. Document view ownership; orphaned views are a common source of "why can't I drop this column".</p>
<p><b>Views vs RLS vs column privileges.</b> Postgres also supports column-level GRANTs (<code>GRANT SELECT (id, name) ON employees TO analyst</code>). Views win when you need masking, derived columns or a stable API; RLS wins when the same table must show different rows per user without N views.</p>`,
    aiEra: `<p><b>What AI changes:</b> text-to-SQL and AI analytics agents are now common. Pointing them at curated <b>views</b> (clean names, no PII, pre-joined) instead of raw tables is the single best guardrail: smaller schema to reason about, fewer wrong joins, nothing secret to leak. Ask an assistant: <code>Propose an analyst-safe view over these tables: no PII, masked identifiers, documented columns</code>.</p>
<p><b>Where AI goes wrong:</b> it suggests <code>SELECT *</code> views, believes a view alone is access control (it is not without GRANT/REVOKE), forgets small-group inference in aggregates, and may write <code>CREATE MATERIALIZED VIEW</code> for SQLite.</p>
<p><b>What you still own:</b> the access model (roles, grants, RLS), deciding which columns are sensitive, and testing as the restricted role — <code>SET ROLE analyst; SELECT salary FROM employees;</code> must fail.</p>`,
    problems: [{
      title: 'Build an Analyst-Safe Employee Directory', level: 'Easy', tags: ['view', 'security', 'masking'], companies: ['Google', 'Workday', 'Infosys'],
      statement: `<p>Analysts need an employee directory and pay statistics, but must never see an individual salary or a full SSN. Create (1) <code>employee_directory</code>: id, name, dept, title, email and the SSN masked to <code>***-**-NNNN</code>; (2) <code>dept_pay_stats</code>: dept, headcount, average salary — hiding any department with fewer than 2 employees.</p>`,
      constraints: `<p>Data must stay live (no copies). Use only views. (In Postgres you would also REVOKE on the table and GRANT on the views.)</p>`,
      example: `${H.table(['dept', 'headcount', 'avg_salary'], [['Eng', '3', '200000']])}<p>Sales and HR have one person each, so they are ${H.c('r', 'suppressed')}: an "average" of one person is that person's salary.</p>`,
      brute: { why: `<p>Naive fix: copy the safe columns into a separate <code>directory</code> table with <code>CREATE TABLE … AS SELECT</code>. It is <b>stale</b> the moment someone changes title, it duplicates PII to a second place to secure, and it needs a sync job. Even worse naive fix: give analysts the base table and "trust the dashboard to hide salary".</p>`, code: shop(`CREATE TABLE directory AS SELECT id, name, dept, title, email FROM employees;   -- a COPY
UPDATE employees SET title = 'Staff Engineer' WHERE id = 2;                      -- base changes...
SELECT title FROM directory WHERE id = 2;                                        -- ...copy still says Engineer`) },
      mcq: { q: 'Why add HAVING COUNT(*) >= 2 to the stats view?', options: ['A group of one reveals that person\'s exact salary', 'AVG fails on one row', 'It makes the view updatable', 'SQLite requires it'], answer: 0, explain: 'Aggregates over tiny groups leak individual values (inference attack). Suppressing small groups is a basic privacy rule.' },
      hints: [`<p>Hint 1: A view stores the query, not the data, so it is always up to date — no sync job.</p>`, `<p>Hint 2: Masking is just an expression in the SELECT list: <code>'***-**-' || substr(ssn, -4)</code>. Hiding salary = not selecting it.</p>`, `<p>Hint 3: For the stats view use GROUP BY dept with <code>HAVING COUNT(*) &gt;= 2</code>. Recipe: CREATE VIEW directory → CREATE VIEW stats → (Postgres) REVOKE ALL ON employees, GRANT SELECT ON both views.</p>`],
      tests: { cmp: 'exact', engine: 'sqlite', cases: [
          { cols: ['dept', 'headcount', 'avg_salary'], rows: [['Eng', 3, 200000]] },
          { setup: 'DELETE FROM employees; DELETE FROM employees; ', rows: [], after: 'SELECT dept, headcount, avg_salary FROM dept_pay_stats' },
          { setup: 'DELETE FROM employees; DELETE FROM employees; INSERT INTO employees VALUES (1, \'N1\', \'A\', \'T\', 100, \'000-00-1001\', \'e1@c.com\', NULL), (2, \'N2\', \'A\', \'T\', 200, \'000-00-1002\', \'e2@c.com\', NULL);', rows: [['A', 2, 150]], cols: ['dept', 'headcount', 'avg_salary'] },
          { setup: 'DELETE FROM employees; DELETE FROM employees; INSERT INTO employees VALUES (1, \'N1\', \'A\', \'T\', 100, \'000-00-1001\', \'e1@c.com\', NULL), (2, \'N2\', \'B\', \'T\', 200, \'000-00-1002\', \'e2@c.com\', NULL), (3, \'N3\', \'C\', \'T\', 300, \'000-00-1003\', \'e3@c.com\', NULL);', rows: [], after: 'SELECT dept, headcount, avg_salary FROM dept_pay_stats' },
          { setup: 'DELETE FROM employees; DELETE FROM employees; INSERT INTO employees VALUES (1, \'N1\', \'A\', \'T\', 100, \'000-00-1001\', \'e1@c.com\', NULL), (2, \'N2\', \'A\', \'T\', 100, \'000-00-1002\', \'e2@c.com\', NULL), (3, \'N3\', \'A\', \'T\', 400, \'000-00-1003\', \'e3@c.com\', NULL), (4, \'N4\', \'B\', \'T\', 50, \'000-00-1004\', \'e4@c.com\', NULL), (5, \'N5\', \'B\', \'T\', 51, \'000-00-1005\', \'e5@c.com\', NULL);', rows: [['A', 3, 200], ['B', 2, 50]], cols: ['dept', 'headcount', 'avg_salary'] },
          { after: 'SELECT id, name, dept, title, email, ssn_masked FROM employee_directory ORDER BY id', rows: [[1, 'Asha', 'Eng', 'Eng Manager', 'asha@corp.com', '***-**-1111'], [2, 'Ben', 'Eng', 'Staff Engineer', 'ben@corp.com', '***-**-2222'], [3, 'Chen', 'Sales', 'Account Exec', 'chen@corp.com', '***-**-3333'], [4, 'Dara', 'HR', 'HR Partner', 'dara@corp.com', '***-**-4444'], [5, 'Eli', 'Eng', 'Engineer', 'eli@corp.com', '***-**-5555']] },
          { after: 'SELECT name FROM pragma_table_info(\'employee_directory\') ORDER BY cid', rows: [['id'], ['name'], ['dept'], ['title'], ['email'], ['ssn_masked']] },
          { after: 'SELECT name FROM pragma_table_info(\'dept_pay_stats\') ORDER BY cid', rows: [['dept'], ['headcount'], ['avg_salary']] },
          { after: 'UPDATE employees SET dept = \'Eng\' WHERE id = 3; SELECT dept, headcount, avg_salary FROM dept_pay_stats', rows: [['Eng', 4, 172500]] },
          { after: 'UPDATE employees SET ssn = \'999-99-0007\' WHERE id = 1; SELECT ssn_masked FROM employee_directory WHERE id = 1', rows: [['***-**-0007']] },
          { after: 'INSERT INTO employees (name, dept, title, salary, ssn, email) VALUES (\'Fay\',\'HR\',\'HR Partner\',100000,\'666-66-6666\',\'fay@corp.com\'); SELECT dept, headcount, avg_salary FROM dept_pay_stats ORDER BY dept', rows: [['Eng', 3, 200000], ['HR', 2, 105000]] }
        ] },
      solution: {
        approach: `<p>Two views: a projection with a masking expression, and an aggregate with small-group suppression. Access control is completed by granting only the views.</p>`,
        code: shop(`CREATE VIEW employee_directory AS
SELECT id, name, dept, title, email,
       '***-**-' || substr(ssn, -4) AS ssn_masked
FROM employees;

CREATE VIEW dept_pay_stats AS
SELECT dept, COUNT(*) AS headcount, CAST(AVG(salary) AS INTEGER) AS avg_salary
FROM employees
GROUP BY dept
HAVING COUNT(*) >= 2;

UPDATE employees SET title = 'Staff Engineer' WHERE id = 2;   -- views reflect it instantly
SELECT * FROM employee_directory ORDER BY id;
SELECT * FROM dept_pay_stats;`),
        alt: [pg(`REVOKE ALL ON employees FROM PUBLIC;
CREATE ROLE analyst NOLOGIN;
GRANT SELECT ON employee_directory, dept_pay_stats TO analyst;
-- test it:
SET ROLE analyst;
SELECT salary FROM employees;   -- ERROR: permission denied`)],
        dry: { head: ['dept', 'rows', 'COUNT ≥ 2?', 'shown'], rows: [['Eng', '3', 'yes', H.c('g', 'avg 200000')], ['Sales', '1', 'no', H.c('r', 'hidden')], ['HR', '1', 'no', H.c('r', 'hidden')]] },
        complexity: `<p>No storage cost. Each read costs one scan (or index scan) of employees plus a small GROUP BY.</p>`,
        followUps: ['Let each manager see salaries of only their direct reports', 'Add a column that shows salary band (A/B/C) instead of exact salary', 'How would you test that no view leaks salary?']
      }
    }]
  });

  /* ======================= TOPIC 6: Materialized views ======================= */
  topics.push({
    title: 'Materialized Views & Summary Tables (and How to Fake Them in SQLite)',
    analogy: `<p>A normal view is <b>asking the cashier to count today's sales every time you ask</b> — always correct, but slow when you ask often. A materialized view is the <b>printed sales report pinned on the wall</b>: instant to read, but only as fresh as the last time someone reprinted it. "Refresh" = reprint.</p>`,
    explain: `<p>A <b>materialized view (MV)</b> runs its query once and <b>stores the result as real rows</b>. Reads are as fast as reading a small table (you can even index it). The price: the stored result goes <b>stale</b> when base tables change, until you refresh it.</p>
${H.table(['', 'View', 'Materialized view'], [
  ['Stores data?', 'no — only the query', H.c('y', 'yes — the result rows')],
  ['Freshness', H.c('g', 'always current'), H.c('r', 'stale until REFRESH')],
  ['Read cost', 'runs the query every time', H.c('g', 'cheap table read')],
  ['Write cost', 'none', 'refresh cost (full recompute or incremental)'],
  ['Indexable?', 'no (index base tables)', 'yes'],
  ['Best for', 'security, simplification', 'expensive aggregates read often: dashboards, leaderboards']
])}
<p><b>By engine:</b> Postgres has <code>CREATE MATERIALIZED VIEW</code> + <code>REFRESH MATERIALIZED VIEW [CONCURRENTLY]</code> (full recompute). Oracle supports fast (incremental) refresh. SQL Server "indexed views" are maintained automatically on every write. MySQL and <b>SQLite have no materialized views</b> — you build a <b>summary table</b> yourself and refresh it with a scheduled job or keep it current with triggers.</p>
<p><b>Two refresh strategies:</b></p>
<ul><li><b>Full refresh</b> — in one transaction: <code>DELETE FROM mv; INSERT INTO mv SELECT …;</code>. Simple, always correct, cost grows with data size.</li>
<li><b>Incremental</b> — triggers on the base table apply each change (+qty on insert, −qty on delete). Always fresh, but adds work to every write and is easy to get subtly wrong.</li></ul>`,
    clues: ['"the dashboard query takes 30 s and runs every minute" → materialize it', '"data may be up to 15 minutes old" → MV / summary table with scheduled refresh', '"must be exact in real time" → plain view, or incremental maintenance via triggers', '"refresh blocks readers" → <code>REFRESH … CONCURRENTLY</code> (needs a unique index)', '"MySQL / SQLite has no materialized views" → summary table + job or triggers', '"leaderboard / top sellers / daily totals" → classic summary-table candidates'],
    code: [pg(`-- PostgreSQL materialized view
CREATE MATERIALIZED VIEW product_sales AS
SELECT o.product_id, SUM(o.qty) AS units, SUM(o.qty * p.price_cents) AS revenue_cents
FROM orders o JOIN products p ON p.id = o.product_id
WHERE o.status <> 'cancelled'
GROUP BY o.product_id
WITH DATA;

CREATE UNIQUE INDEX ON product_sales (product_id);      -- required for CONCURRENTLY

REFRESH MATERIALIZED VIEW CONCURRENTLY product_sales;   -- readers keep reading the old copy
-- Schedule it (e.g. pg_cron):  SELECT cron.schedule('*/15 * * * *', 'REFRESH MATERIALIZED VIEW CONCURRENTLY product_sales');`, 'PostgreSQL MATERIALIZED VIEW (reference)'),
      shop(`-- SQLite: emulate a materialized view with a summary table + a refresh "job".
CREATE TABLE mv_product_sales (
  product_id    INTEGER PRIMARY KEY,
  units         INTEGER NOT NULL,
  revenue_cents INTEGER NOT NULL,
  refreshed_at  TEXT    NOT NULL
);

-- The refresh: one transaction, so readers never see a half-empty table.
BEGIN;
DELETE FROM mv_product_sales;
INSERT INTO mv_product_sales (product_id, units, revenue_cents, refreshed_at)
SELECT o.product_id, SUM(o.qty), SUM(o.qty * p.price_cents), CURRENT_TIMESTAMP
FROM orders o JOIN products p ON p.id = o.product_id
WHERE o.status <> 'cancelled'
GROUP BY o.product_id;
COMMIT;

INSERT INTO orders (customer_id, product_id, qty, status) VALUES (1, 2, 10, 'paid');  -- new sale
SELECT * FROM mv_product_sales ORDER BY revenue_cents DESC;   -- STALE: cable still shows 3 units`, 'Summary table + full refresh in SQLite (▶ Run)'),
      shop(`-- Incremental maintenance: triggers keep the summary exact on every write.
CREATE TABLE mv_units (product_id INTEGER PRIMARY KEY, units INTEGER NOT NULL);
INSERT INTO mv_units SELECT product_id, SUM(qty) FROM orders WHERE status <> 'cancelled' GROUP BY product_id;

CREATE TRIGGER mv_units_ins AFTER INSERT ON orders WHEN NEW.status <> 'cancelled'
BEGIN
  INSERT INTO mv_units (product_id, units) VALUES (NEW.product_id, NEW.qty)
  ON CONFLICT (product_id) DO UPDATE SET units = units + excluded.units;
END;
CREATE TRIGGER mv_units_cancel AFTER UPDATE OF status ON orders
WHEN NEW.status = 'cancelled' AND OLD.status <> 'cancelled'
BEGIN
  UPDATE mv_units SET units = units - OLD.qty WHERE product_id = OLD.product_id;
END;

INSERT INTO orders (customer_id, product_id, qty, status) VALUES (1, 2, 10, 'paid');   -- +10 cables
UPDATE orders SET status = 'cancelled' WHERE id = 3;                                   -- -3 cables
SELECT * FROM mv_units ORDER BY product_id;     -- cable = 10, always exact`, 'Incremental summary with triggers (▶ Run)')],
    viz: {
      title: 'View vs materialized view: freshness over time',
      input: '09-03:500, 09-04:1200, refresh, 09-04:300, 09-05:700, refresh',
      inputLabel: 'Events separated by commas: day:amount (new sale) or refresh',
      gen: function (input) {
        var evs = strIn(input).split(',').map(function (s) { return s.trim(); }).filter(function (s) { return s.length; });
        if (!evs.length) throw new Error('Type events like: 09-04:1200, refresh');
        if (evs.length > 10) throw new Error('Use at most 10 events');
        var base = [[1, '09-01', 400], [2, '09-02', 250], [3, '09-02', 150]], nextId = 4;
        function agg() { var m = {}, order = []; base.forEach(function (r) { if (!(r[1] in m)) { m[r[1]] = 0; order.push(r[1]); } m[r[1]] += r[2]; }); order.sort(); return order.map(function (d) { return [d, m[d]]; }); }
        var mv = agg(), f = [];
        function staleHl(view) {
          var h = {};
          view.forEach(function (r) { var k = -1; mv.forEach(function (x, i) { if (x[0] === r[0]) k = i; }); if (k >= 0 && mv[k][1] !== r[1]) h[k] = 'bad'; });
          return h;
        }
        function missing(view) { return view.filter(function (r) { return !mv.some(function (x) { return x[0] === r[0]; }); }).map(function (r) { return r[0]; }); }
        f.push({ narr: 'Start: the materialized view was just refreshed, so it matches the live view exactly.', parts: [tbl('sales (base table)', ['id', 'day', 'amount'], base), tbl('daily_sales VIEW (computed on read)', ['day', 'total'], agg()), tbl('daily_sales_mv (stored rows)', ['day', 'total'], mv)] });
        evs.forEach(function (e) {
          if (/^refresh$/i.test(e)) {
            var fresh = agg(), hl = {};
            fresh.forEach(function (r, i) { var old = null; mv.forEach(function (x) { if (x[0] === r[0]) old = x; }); if (!old) hl[i] = 'ok'; else if (old[1] !== r[1]) hl[i] = 'cur'; });
            mv = fresh;
            f.push({ narr: '<b>REFRESH</b>: the MV query re-runs and its stored rows are replaced inside one transaction. Changed totals are amber, new days green. It is fresh again — until the next write.', parts: [sqlPart('BEGIN;\nDELETE FROM daily_sales_mv;\nINSERT INTO daily_sales_mv SELECT day, SUM(amount) FROM sales GROUP BY day;\nCOMMIT;', { 2: 'cur', 3: 'cur' }), tbl('daily_sales VIEW', ['day', 'total'], fresh), tbl('daily_sales_mv (refreshed)', ['day', 'total'], mv, hl)] });
            return;
          }
          var m = e.match(/^(\d\d-\d\d):(\d+)$/);
          if (!m) throw new Error('Bad event "' + e + '". Use MM-DD:amount or refresh');
          base.push([nextId++, m[1], Number(m[2])]);
          var view = agg(), miss = missing(view);
          f.push({ narr: 'New sale on ' + m[1] + ' for ' + m[2] + ' (green). The <b>view</b> already shows it — it recomputes on every read. The <b>MV</b> does not: ' + (Object.keys(staleHl(view)).length || miss.length ? '<span class="c-r">stale</span> ' + (miss.length ? '(day ' + miss.join(', ') + ' missing entirely)' : '(wrong total in red)') + '.' : 'still matches by luck.'),
            parts: [tbl('sales (base table)', ['id', 'day', 'amount'], base, one(base.length - 1, 'ok')), tbl('daily_sales VIEW (always fresh)', ['day', 'total'], view), tbl('daily_sales_mv (stale until refresh)', ['day', 'total'], mv, staleHl(view))] });
        });
        f.push({ narr: 'Trade-off summary: the view costs a GROUP BY on every read but is never wrong; the MV costs a refresh now and then and may lag. Choose by how fresh the reader needs the data and how often it is read.', parts: [tbl('daily_sales VIEW', ['day', 'total'], agg()), tbl('daily_sales_mv', ['day', 'total'], mv, staleHl(agg()))] });
        return f;
      }
    },
    examples: [
      { title: 'Leaderboard refreshed every 5 minutes', html: `<p>A game shows the top 100 players out of 50M score rows. Computing <code>ORDER BY score DESC LIMIT 100</code> over a big aggregate on every page view is wasteful; a summary table refreshed every 5 minutes is read thousands of times per refresh. Users accept "updated 2 min ago".</p>`, code: lab(`CREATE TABLE scores (player TEXT, pts INTEGER);
INSERT INTO scores VALUES ('ana', 50), ('bo', 70), ('ana', 40), ('cy', 30), ('bo', 5);
CREATE TABLE leaderboard (rank INTEGER PRIMARY KEY, player TEXT NOT NULL, total INTEGER NOT NULL);
BEGIN;
DELETE FROM leaderboard;
INSERT INTO leaderboard (rank, player, total)
SELECT ROW_NUMBER() OVER (ORDER BY SUM(pts) DESC), player, SUM(pts) FROM scores GROUP BY player;
COMMIT;
SELECT * FROM leaderboard;`) },
      { title: 'Swap-in refresh to avoid long locks', html: `<p>For big summary tables, build the new copy under a temporary name, then swap names in a short transaction. Readers are never blocked by the long rebuild. (Postgres' <code>REFRESH … CONCURRENTLY</code> does a diff-and-apply instead.)</p>`, code: shop(`CREATE TABLE mv_city_customers AS SELECT city, COUNT(*) AS n FROM customers GROUP BY city;
-- Rebuild under a new name (slow part, nobody waits)...
CREATE TABLE mv_city_customers_new AS SELECT city, COUNT(*) AS n FROM customers GROUP BY city;
-- ...then swap (fast part).
BEGIN;
DROP TABLE mv_city_customers;
ALTER TABLE mv_city_customers_new RENAME TO mv_city_customers;
COMMIT;
SELECT * FROM mv_city_customers;`) },
      { title: 'Track staleness explicitly', html: `<p>Store <code>refreshed_at</code> in the summary (or a metadata table) and show it in the UI ("as of 10:15"). Alert if it is older than the SLA — a silently failing refresh job is worse than a slow query.</p>`, code: shop(`CREATE TABLE mv_meta (name TEXT PRIMARY KEY, refreshed_at TEXT NOT NULL);
INSERT INTO mv_meta VALUES ('mv_product_sales', '2026-10-14 10:15:00')
ON CONFLICT (name) DO UPDATE SET refreshed_at = excluded.refreshed_at;
SELECT name, refreshed_at,
       CAST((julianday('2026-10-14 10:40:00') - julianday(refreshed_at)) * 24 * 60 AS INTEGER) AS minutes_old
FROM mv_meta;`) }
    ],
    deepDive: `<p><b>Postgres REFRESH internals.</b> Plain <code>REFRESH MATERIALIZED VIEW</code> rebuilds into a new heap and swaps it, holding an <code>ACCESS EXCLUSIVE</code> lock — readers wait. <code>CONCURRENTLY</code> computes the new result, diffs it against the old using the required unique index and applies INSERT/UPDATE/DELETE, allowing reads throughout, but is slower and writes more WAL. Neither is incremental: both re-run the full query. Extensions (pg_ivm) and streaming systems (Materialize, RisingWave, Snowflake dynamic tables, BigQuery MVs) provide incremental view maintenance.</p>
<p><b>Incremental maintenance math.</b> SUM and COUNT are easy (add on insert, subtract on delete, both on update). AVG = keep SUM and COUNT. MIN/MAX are hard: deleting the current max requires a rescan of that group. DISTINCT counts need per-value reference counts. That is why most engines restrict which MVs can fast-refresh.</p>
<p><b>Consistency.</b> A full refresh in one transaction gives a consistent snapshot. Trigger-maintained summaries are transactionally exact but add lock contention: every order insert updates the same summary row — a hot spot under heavy concurrency (mitigate with sharded counters, or periodic batch roll-ups from an append-only log).</p>
<p><b>Indexed views (SQL Server)</b> are maintained synchronously by the engine with strict rules (SCHEMABINDING, COUNT_BIG(*), deterministic functions). <b>Query rewrite</b> (Oracle, BigQuery) can even route a query against base tables to a matching MV automatically.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI dashboards fire many similar aggregate queries; materialized summaries (or a semantic layer on top of them) keep latency and cost predictable. Ask: <code>Given this slow dashboard query and a 15-minute freshness SLA, design a summary table, its refresh SQL, and a staleness alert</code>.</p>
<p><b>Where AI goes wrong:</b> it writes <code>CREATE MATERIALIZED VIEW</code> for MySQL/SQLite, forgets the unique index needed for CONCURRENTLY, refreshes with DELETE + INSERT <i>outside</i> a transaction (readers see an empty table), or writes incremental triggers that ignore UPDATE and DELETE.</p>
<p><b>What you still own:</b> the freshness requirement, choosing full vs incremental refresh, monitoring the job, and proving the summary equals the source (a periodic reconciliation query comparing totals).</p>`
  });

  /* ======================= TOPIC 7: Stored procedures & functions ======================= */
  topics.push({
    title: 'Stored Procedures & Functions (and SQLite Alternatives)',
    analogy: `<p>Ordering at a restaurant. Without a procedure you walk into the kitchen five times: "start a ticket", "is there chicken?", "take one chicken", "add it to my plate", "close the ticket". With a procedure you hand the waiter one slip — <b>"Combo #3"</b> — and the kitchen runs the whole recipe internally. Fewer trips, same recipe for everyone, but the recipe now lives in the kitchen, where fewer people can read or change it.</p>`,
    explain: `<p>A <b>stored procedure</b> is a named program saved <i>inside</i> the database and run with one call: <code>CALL transfer(1, 2, 300);</code>. It can use variables, IF/LOOP, several SQL statements, and error handling. A <b>stored function</b> returns a value (or a table) and can be used inside queries: <code>SELECT net_price(price_cents) FROM products</code>.</p>
${H.table(['', 'Procedure', 'Function'], [
  ['Called with', '<code>CALL p(…)</code> / <code>EXEC p</code>', 'inside SQL: <code>SELECT f(x)</code>'],
  ['Returns', 'nothing / OUT parameters / result sets', 'a value or a table'],
  ['Transaction control', 'Postgres 11+, MySQL, SQL Server: can COMMIT inside', 'no (runs inside the caller\'s statement)'],
  ['Typical use', 'multi-step business operations, batch jobs', 'reusable calculations, computed filters']
])}
<p>Languages: <b>PL/pgSQL</b> (Postgres), <b>T-SQL</b> (SQL Server), <b>PL/SQL</b> (Oracle), MySQL's SQL/PSM. <b>SQLite has no stored procedures</b> — it is an embedded library inside your app, so "the app" and "the database" share one process anyway. In SQLite you use:</p>
<ul><li><b>One set-based statement</b> (CASE, CTEs, UPDATE … FROM) — it is atomic on its own.</li>
<li><b>A transaction in application code</b> — <code>BEGIN; …; COMMIT;</code> with logic in Python/Java/JS.</li>
<li><b>Triggers</b> as "procedures that run on an event" (e.g. insert a row into <code>transfers</code>, a trigger moves the money).</li>
<li><b>User-defined functions</b> registered from the host language (<code>sqlite3_create_function</code>, Python <code>con.create_function</code>).</li></ul>
<p><b>Pros:</b> fewer network round trips; logic runs next to the data; one consistent implementation for every client; can grant <code>EXECUTE</code> on a procedure without granting table access. <b>Cons:</b> harder to version, test, review and debug; vendor lock-in; scaling the database CPU is harder than scaling app servers; business logic split across two codebases.</p>`,
    clues: ['"minimize round trips for a multi-step operation" → stored procedure (or one set-based statement)', '"many apps in different languages must apply the same rule" → logic in the database (procedure, constraint, trigger)', '"let a service do X without giving it table access" → GRANT EXECUTE on a SECURITY DEFINER procedure', '"we use SQLite" → no procedures: transaction in app code, set-based SQL, triggers or UDFs', '"business logic must be unit-tested and deployed often" → keep it in the application', '"reuse a calculation inside SELECT / WHERE" → stored function (mark IMMUTABLE/DETERMINISTIC)'],
    code: [pg(`-- PostgreSQL stored procedure: an atomic money transfer with validation.
CREATE OR REPLACE PROCEDURE transfer(p_from int, p_to int, p_amount int)
LANGUAGE plpgsql AS $$
DECLARE
  v_balance int;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'amount must be positive';
  END IF;
  -- Lock the source row so two transfers cannot both spend the same money.
  SELECT balance INTO v_balance FROM accounts WHERE id = p_from FOR UPDATE;
  IF v_balance IS NULL THEN
    RAISE EXCEPTION 'account % not found', p_from;
  ELSIF v_balance < p_amount THEN
    RAISE EXCEPTION 'insufficient funds: % < %', v_balance, p_amount;
  END IF;
  UPDATE accounts SET balance = balance - p_amount WHERE id = p_from;
  UPDATE accounts SET balance = balance + p_amount WHERE id = p_to;
  INSERT INTO transfers (from_id, to_id, amount) VALUES (p_from, p_to, p_amount);
END $$;

CALL transfer(1, 2, 300);          -- one round trip; any exception rolls everything back

-- A stored FUNCTION, usable inside queries:
CREATE FUNCTION price_with_tax(cents int) RETURNS int
LANGUAGE sql IMMUTABLE AS $$ SELECT (cents * 118 + 50) / 100 $$;
SELECT name, price_with_tax(price_cents) FROM products;`, 'PostgreSQL procedure + function (reference)'),
      my(`-- MySQL: DELIMITER lets the client accept semicolons inside the body.
DELIMITER //
CREATE PROCEDURE transfer(IN p_from INT, IN p_to INT, IN p_amount INT)
BEGIN
  DECLARE v_balance INT;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;
  START TRANSACTION;
  SELECT balance INTO v_balance FROM accounts WHERE id = p_from FOR UPDATE;
  IF v_balance < p_amount THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'insufficient funds';
  END IF;
  UPDATE accounts SET balance = balance - p_amount WHERE id = p_from;
  UPDATE accounts SET balance = balance + p_amount WHERE id = p_to;
  COMMIT;
END //
DELIMITER ;
CALL transfer(1, 2, 300);`, 'MySQL procedure (reference)'),
      shop(`-- SQLite alternative 1: ONE set-based statement is already atomic.
-- Move 300 from account 1 to account 2 — both rows change, or neither does.
UPDATE accounts
SET balance = balance + CASE id WHEN 1 THEN -300 WHEN 2 THEN 300 END
WHERE id IN (1, 2)
  AND (SELECT balance FROM accounts WHERE id = 1) >= 300;    -- guard: enough money?
SELECT changes() AS rows_changed;                            -- 2 = done, 0 = refused

-- SQLite alternative 2: a "procedure" triggered by inserting a request row.
CREATE TABLE transfers (
  id INTEGER PRIMARY KEY, from_id INTEGER NOT NULL, to_id INTEGER NOT NULL,
  amount INTEGER NOT NULL CHECK (amount > 0), created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TRIGGER transfers_apply AFTER INSERT ON transfers
BEGIN
  SELECT RAISE(ABORT, 'insufficient funds')
  WHERE (SELECT balance FROM accounts WHERE id = NEW.from_id) < NEW.amount;
  UPDATE accounts SET balance = balance - NEW.amount WHERE id = NEW.from_id;
  UPDATE accounts SET balance = balance + NEW.amount WHERE id = NEW.to_id;
END;
INSERT INTO transfers (from_id, to_id, amount) VALUES (2, 3, 100);   -- Ben pays Chen 100
-- INSERT INTO transfers (from_id, to_id, amount) VALUES (3, 1, 999); -- uncomment: ABORT, nothing changes
SELECT * FROM accounts;
SELECT * FROM transfers;`, 'SQLite: set-based statement and trigger-as-procedure (▶ Run)'),
      { lang: 'python', run: true, title: 'SQLite alternative 3: logic in app code + a user-defined function (▶ Run)', code: `import sqlite3

con = sqlite3.connect(":memory:")
con.executescript("""
CREATE TABLE accounts (id INTEGER PRIMARY KEY, owner TEXT, balance INTEGER CHECK (balance >= 0));
INSERT INTO accounts VALUES (1, 'Asha', 1000), (2, 'Ben', 250);
""")

# A user-defined SQL function written in Python, callable from any query.
def with_tax(cents):
    return (cents * 118 + 50) // 100
con.create_function("with_tax", 1, with_tax, deterministic=True)

def transfer(con, src, dst, amount):
    """The 'stored procedure' lives in the app, wrapped in one transaction."""
    with con:  # BEGIN ... COMMIT, or ROLLBACK on any exception
        cur = con.execute(
            "UPDATE accounts SET balance = balance - ? WHERE id = ? AND balance >= ?",
            (amount, src, amount))
        if cur.rowcount != 1:
            raise ValueError("insufficient funds or unknown account")
        con.execute("UPDATE accounts SET balance = balance + ? WHERE id = ?", (amount, dst))

transfer(con, 1, 2, 300)
try:
    transfer(con, 2, 1, 10_000)
except ValueError as e:
    print("refused:", e)
print(con.execute("SELECT id, owner, balance, with_tax(balance) FROM accounts").fetchall())` }],
    viz: {
      title: 'Round trips: client-side transaction vs one CALL to a procedure',
      input: '1 2 300',
      inputLabel: 'from_account to_account amount (accounts 1=Asha 1000, 2=Ben 250, 3=Chen 0)',
      gen: function (input) {
        var a = strIn(input).trim().split(/[\s,]+/).map(Number);
        if (a.length !== 3 || a.some(isNaN)) throw new Error('Enter: from to amount, e.g. 1 2 300');
        var from = a[0], to = a[1], amt = a[2];
        var acc = [[1, 'Asha', 1000], [2, 'Ben', 250], [3, 'Chen', 0]];
        function ix(id) { for (var i = 0; i < acc.length; i++) if (acc[i][0] === id) return i; return -1; }
        var fi = ix(from), ti = ix(to);
        if (fi < 0 || ti < 0) throw new Error('Accounts are 1, 2 and 3');
        if (from === to) throw new Error('Pick two different accounts');
        if (amt <= 0 || amt > 100000) throw new Error('Amount must be between 1 and 100000');
        var ok = acc[fi][2] >= amt, cols = ['id', 'owner', 'balance'];
        function g(edgeLabel, hl, ehl, tags) {
          return { type: 'graph', directed: true, height: 40, label: 'App server ↔ database (each arrow = one network round trip, ~1 ms)',
            nodes: [{ id: 'A', label: 'App server', x: 14, y: 20, shape: 'box' }, { id: 'D', label: 'Database', x: 84, y: 20, shape: 'box' }],
            edges: [['A', 'D', edgeLabel]], hl: hl || {}, ehl: ehl || {}, tags: tags || {} };
        }
        var f = [], steps = ['BEGIN', 'SELECT balance … FOR UPDATE', 'UPDATE accounts (debit)', 'UPDATE accounts (credit)', 'COMMIT'];
        f.push({ narr: 'Goal: move <b>' + amt + '</b> from ' + acc[fi][1] + ' to ' + acc[ti][1] + ' atomically. First the classic way: the app sends each statement separately.', parts: [g('', { A: 'cur' }), tbl('accounts (before)', cols, acc, (function () { var h = one(fi, 'win'); h[ti] = 'win'; return h; })())] });
        var trips = 0;
        for (var s = 0; s < steps.length; s++) {
          if (!ok && s === 2) {
            trips++;
            f.push({ narr: 'Round trip ' + trips + ': the app sees balance ' + acc[fi][2] + ' &lt; ' + amt + ' and sends <b>ROLLBACK</b>. ' + trips + ' trips spent; the source row was locked the whole time.', parts: [g('ROLLBACK', { D: 'bad' }, { 'A-D': 'bad' }, { A: 'trip ' + trips }), tbl('accounts (unchanged)', cols, acc, one(fi, 'bad'))] });
            break;
          }
          trips++;
          f.push({ narr: 'Round trip ' + trips + ': <code>' + esc(steps[s]) + '</code>. ' + (s === 1 ? 'The source row is now <b>locked</b> until COMMIT — and the lock is held while packets travel back and forth.' : s === 4 ? 'Locks released. Total: <b>' + trips + '</b> round trips.' : 'The app waits for the reply before sending the next statement.'),
            parts: [g(steps[s], { A: 'cur', D: 'cur' }, { 'A-D': 'ok' }, { A: 'trip ' + trips, D: s >= 1 && s < 4 ? 'row locked' : '' }), tbl('accounts', cols, s >= 2 ? (function () { var c = cp(acc); c[fi][2] -= amt; if (s >= 3) c[ti][2] += amt; return c; })() : acc, s === 2 ? one(fi, 'cur') : s >= 3 ? (function () { var h = one(fi, 'cur'); h[ti] = 'cur'; return h; })() : one(fi, s === 1 ? 'win' : ''))] });
        }
        f.push({ narr: 'Now the procedure way: one message, <code>CALL transfer(' + from + ', ' + to + ', ' + amt + ')</code>. The whole recipe runs inside the database next to the data.', parts: [g('CALL transfer(' + from + ', ' + to + ', ' + amt + ')', { A: 'cur', D: 'cur' }, { 'A-D': 'ok' }, { A: '1 trip' }), sqlPart('CALL transfer(' + from + ', ' + to + ', ' + amt + ');', { 1: 'cur' })] });
        var code = 'SELECT balance INTO v FROM accounts\n  WHERE id = p_from FOR UPDATE;\nIF v < p_amount THEN RAISE EXCEPTION ...;\nUPDATE accounts SET balance = balance - p_amount WHERE id = p_from;\nUPDATE accounts SET balance = balance + p_amount WHERE id = p_to;';
        f.push({ narr: 'Inside the database the procedure locks the source row and checks the balance (' + acc[fi][2] + ' vs ' + amt + ').', parts: [sqlPart(code, { 1: 'cur', 2: 'cur', 3: ok ? 'ok' : 'bad' }, 'transfer() body'), tbl('accounts', cols, acc, one(fi, 'win'))] });
        if (ok) {
          var after = cp(acc); after[fi][2] -= amt; after[ti][2] += amt;
          f.push({ narr: '<span class="c-g">Success.</span> Debit and credit both applied (amber) in one transaction, after a single round trip. Lock time ≈ local work only.', parts: [sqlPart(code, { 4: 'ok', 5: 'ok' }, 'transfer() body'), tbl('accounts (after)', cols, after, (function () { var h = one(fi, 'cur'); h[ti] = 'cur'; return h; })()), { type: 'vars', label: 'Cost comparison', vals: { 'client-side trips': 5, 'procedure trips': 1 }, hl: { 'procedure trips': 'ok' } }] });
        } else {
          f.push({ narr: '<span class="c-r">Refused.</span> The procedure raises an exception, the transaction rolls back, and the caller gets an error. Balances are untouched.', parts: [tbl('accounts (unchanged)', cols, acc, one(fi, 'bad')), { type: 'vars', label: 'Cost comparison', vals: { 'client-side trips': trips, 'procedure trips': 1 }, hl: { 'procedure trips': 'ok' } }] });
        }
        f.push({ narr: 'In <b>SQLite</b> there is no CALL — but SQLite runs inside your app process, so "round trips" are function calls. Use one set-based UPDATE with a guard, or a transaction in app code.', parts: [sqlPart('UPDATE accounts\nSET balance = balance + CASE id WHEN ' + from + ' THEN -' + amt + ' WHEN ' + to + ' THEN ' + amt + ' END\nWHERE id IN (' + from + ', ' + to + ')\n  AND (SELECT balance FROM accounts WHERE id = ' + from + ') >= ' + amt + ';', { 4: 'cur' }, 'SQLite equivalent')] });
        return f;
      }
    },
    examples: [
      { title: 'Set-based beats a row-by-row procedure loop', html: `<p>A procedure that loops over 1M customers with a cursor and updates each row runs 1M statements. One <code>UPDATE … WHERE …</code> does the same in one pass and lets the engine optimize. Procedures are not an excuse for row-by-row ("RBAR") code.</p>`, code: shop(`-- Set-based: upgrade every customer with 2+ non-cancelled orders in ONE statement.
UPDATE customers SET tier = 'gold'
WHERE id IN (SELECT customer_id FROM orders WHERE status <> 'cancelled'
             GROUP BY customer_id HAVING COUNT(*) >= 2);
SELECT id, name, tier FROM customers;`) },
      { title: 'Table-valued function vs view (Postgres)', html: `<p>A view cannot take parameters; a <b>set-returning function</b> can. <code>orders_since(date)</code> behaves like a parameterized view. In SQLite, the equivalent is a CTE or a query with bound parameters from the app.</p>`, code: pg(`CREATE FUNCTION orders_since(p_day date)
RETURNS TABLE (id int, customer_id int, qty int)
LANGUAGE sql STABLE AS $$
  SELECT id, customer_id, qty FROM orders WHERE created_at >= p_day
$$;
SELECT * FROM orders_since('2026-09-02');`) },
      { title: 'SECURITY DEFINER: a narrow door', html: `<p>Grant a reporting service <code>EXECUTE</code> on one procedure that runs with the owner's rights, instead of SELECT/UPDATE on whole tables. Always pin <code>search_path</code> in SECURITY DEFINER functions, or a caller can hijack name resolution.</p>`, code: pg(`CREATE FUNCTION close_stale_orders() RETURNS int
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  WITH x AS (UPDATE orders SET status = 'cancelled'
             WHERE status = 'pending' AND created_at < now() - interval '30 days' RETURNING 1)
  SELECT count(*)::int FROM x
$$;
REVOKE ALL ON FUNCTION close_stale_orders() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION close_stale_orders() TO ops_bot;`) }
    ],
    deepDive: `<p><b>Where the time goes.</b> In a client/server database each statement costs a network round trip (0.2–2 ms in one data center, 50+ ms across regions) — and while a transaction is open its row locks are held for all of those trips. A 5-statement transfer across regions can hold a hot row lock for 250 ms, capping throughput at ~4 transfers/s on that row. A procedure (or a single statement, or Postgres pipelining) reduces that to one trip.</p>
<p><b>Plan caching.</b> Procedures and prepared statements cache plans; in Postgres, PL/pgSQL switches to a "generic plan" after 5 executions, which can be bad for skewed parameters (<code>plan_cache_mode</code>). SQL Server has "parameter sniffing" for the same reason.</p>
<p><b>Function volatility</b> (Postgres <code>IMMUTABLE / STABLE / VOLATILE</code>, MySQL <code>DETERMINISTIC</code>) tells the planner whether it may cache or inline calls and whether the function can be used in an index expression. Lying about it causes wrong results.</p>
<p><b>Engineering costs.</b> Put procedures in migrations (Flyway/Liquibase), test them (pgTAP, tSQLt), and keep them small. Many modern teams keep business logic in the app and use the database for constraints, set-based operations, and the occasional hot-path procedure. Banks, ERPs and Oracle shops often do the opposite — know both cultures. SQLite's embedded model makes app-side logic the natural choice: there is no network to save.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI translates procedures between dialects (T-SQL → PL/pgSQL during cloud migrations), explains 2,000-line legacy procedures, and generates pgTAP tests. Ask: <code>Explain this stored procedure step by step, list every table it writes, and every way it can fail</code>.</p>
<p><b>Where AI goes wrong:</b> it mixes dialects (<code>DECLARE @x</code> in Postgres), forgets <code>FOR UPDATE</code> and so introduces race conditions, writes cursor loops instead of set-based SQL, and invents <code>CREATE PROCEDURE</code> for SQLite.</p>
<p><b>What you still own:</b> deciding where logic lives, concurrency correctness (locks, isolation), security (SECURITY DEFINER, search_path), and code review — procedures that an agent writes still need tests and a migration file, not a manual paste into production.</p>`
  });

  /* ======================= TOPIC 8: Triggers ======================= */
  topics.push({
    title: 'Triggers: Audit Trails, Validation, Derived Data — and Their Dangers',
    analogy: `<p>A <b>motion-sensor light</b>. Nobody presses a switch: when something moves (an INSERT, UPDATE or DELETE), the light turns on by itself. Handy — but if you forget the sensors are there, you will be puzzled why lights keep turning on, and a sensor that triggers another sensor that triggers another can light up the whole street.</p>`,
    explain: `<p>A <b>trigger</b> is SQL that the database runs <b>automatically</b> when a table changes. You choose:</p>
${H.table(['Choice', 'Options', 'Meaning'], [
  ['Event', 'INSERT · UPDATE [OF cols] · DELETE', 'what change wakes it up'],
  ['Timing', 'BEFORE · AFTER · INSTEAD OF (views)', 'run before the row is written (can block it), after, or instead of the change'],
  ['Granularity', 'FOR EACH ROW · FOR EACH STATEMENT', 'once per changed row or once per statement (SQLite: rows only)'],
  ['Condition', '<code>WHEN (…)</code>', 'only fire if this is true'],
  ['Row images', '<code>OLD.col</code>, <code>NEW.col</code>', 'the row before / after the change (INSERT has only NEW, DELETE only OLD)']
])}
<pre>CREATE TRIGGER products_audit AFTER UPDATE ON products
WHEN OLD.price_cents IS NOT NEW.price_cents
BEGIN
  INSERT INTO audit_log (table_name, row_id, action, old_data, new_data)
  VALUES ('products', NEW.id, 'UPDATE',
          json_object('price_cents', OLD.price_cents),
          json_object('price_cents', NEW.price_cents));
END;</pre>
<p><b>Good uses:</b> <b>audit trails</b> (who changed what, old → new), <b>validation</b> that CHECK cannot express (cross-table rules: "qty must not exceed stock"), <b>derived data</b> (counters, <code>updated_at</code>, summary tables), <b>soft deletes</b> and writable views (INSTEAD OF).</p>
<p><b>Dangers:</b> invisible logic ("why did stock change?"), slower writes (every row pays), <b>trigger chains</b> (trigger A updates table B whose trigger updates C…), surprises during bulk loads and migrations, and logic split between app and database. In SQLite, raise errors with <code>SELECT RAISE(ABORT, 'message')</code> — the statement is undone.</p>
<p>The rule of thumb: triggers for <b>data integrity and audit</b> that must hold no matter which client writes; application code for <b>business workflows</b> (emails, payments, API calls — never call the outside world from a trigger).</p>`,
    clues: ['"keep an audit/history of every change, even from manual SQL" → AFTER UPDATE/DELETE trigger writing to an audit table', '"reject the change if a cross-table rule is violated" → BEFORE trigger with RAISE / exception', '"maintain updated_at / counters / denormalized totals automatically" → AFTER trigger', '"make this view writable" → INSTEAD OF trigger', '"a mysterious value keeps changing" → look for triggers (and trigger chains)', '"bulk load is slow" → triggers fire per row: disable, or use statement-level triggers'],
    code: [shop(`-- AUDIT TRAIL: every price/stock change and every delete on products is recorded.
CREATE TRIGGER products_audit_upd AFTER UPDATE ON products
WHEN OLD.price_cents IS NOT NEW.price_cents OR OLD.stock IS NOT NEW.stock
BEGIN
  INSERT INTO audit_log (table_name, row_id, action, old_data, new_data)
  VALUES ('products', NEW.id, 'UPDATE',
          json_object('price_cents', OLD.price_cents, 'stock', OLD.stock),
          json_object('price_cents', NEW.price_cents, 'stock', NEW.stock));
END;

CREATE TRIGGER products_audit_del AFTER DELETE ON products
BEGIN
  INSERT INTO audit_log (table_name, row_id, action, old_data, new_data)
  VALUES ('products', OLD.id, 'DELETE',
          json_object('sku', OLD.sku, 'name', OLD.name, 'price_cents', OLD.price_cents), NULL);
END;

UPDATE products SET price_cents = 899 WHERE id = 2;      -- audited
UPDATE products SET name = 'SQL Book 2e' WHERE id = 3;   -- NOT audited (WHEN is false)
UPDATE products SET stock = stock - 1 WHERE id = 3;      -- audited
DELETE FROM products WHERE id = 4;                       -- audited

SELECT id, row_id, action, old_data, new_data FROM audit_log ORDER BY id;`, 'Audit triggers with JSON old/new images (▶ Run)'),
      shop(`-- VALIDATION (BEFORE) + DERIVED DATA (AFTER): orders take stock automatically.
CREATE TRIGGER orders_check_stock BEFORE INSERT ON orders
BEGIN
  SELECT RAISE(ABORT, 'not enough stock')
  WHERE NEW.qty > (SELECT stock FROM products WHERE id = NEW.product_id);
END;

CREATE TRIGGER orders_take_stock AFTER INSERT ON orders
WHEN NEW.status <> 'cancelled'
BEGIN
  UPDATE products SET stock = stock - NEW.qty, updated_at = CURRENT_TIMESTAMP
  WHERE id = NEW.product_id;
END;

INSERT INTO orders (customer_id, product_id, qty) VALUES (2, 5, 2);   -- DB Internals: 3 -> 1
-- INSERT INTO orders (customer_id, product_id, qty) VALUES (2, 5, 5); -- uncomment: ABORT 'not enough stock'
SELECT id, name, stock, updated_at FROM products WHERE id = 5;
SELECT name, type, tbl_name FROM sqlite_master WHERE type = 'trigger';   -- list triggers`, 'Validation + automatic stock decrement (▶ Run)'),
      pg(`-- PostgreSQL: one generic audit function reused by many tables.
CREATE TABLE audit_log (
  id bigserial PRIMARY KEY, table_name text, action text,
  old_data jsonb, new_data jsonb, changed_by text DEFAULT current_user, changed_at timestamptz DEFAULT now()
);
CREATE FUNCTION audit_row() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO audit_log (table_name, action, old_data, new_data)
  VALUES (TG_TABLE_NAME, TG_OP,
          CASE WHEN TG_OP <> 'INSERT' THEN to_jsonb(OLD) END,
          CASE WHEN TG_OP <> 'DELETE' THEN to_jsonb(NEW) END);
  RETURN NULL;                       -- AFTER trigger: return value ignored
END $$;
CREATE TRIGGER products_audit AFTER INSERT OR UPDATE OR DELETE ON products
FOR EACH ROW EXECUTE FUNCTION audit_row();

-- BEFORE trigger that MODIFIES the row being written (Postgres can change NEW):
CREATE FUNCTION touch() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END $$;
CREATE TRIGGER products_touch BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION touch();`, 'PostgreSQL trigger functions (reference)'),
      my(`-- MySQL: body inline, BEFORE triggers may SET NEW.col; no INSTEAD OF triggers.
DELIMITER //
CREATE TRIGGER products_touch BEFORE UPDATE ON products
FOR EACH ROW
BEGIN
  SET NEW.updated_at = NOW();
  IF NEW.stock < 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'stock cannot be negative';
  END IF;
END //
DELIMITER ;`, 'MySQL trigger (reference)')],
    viz: {
      title: 'Trigger firing chain: one INSERT wakes up four triggers',
      input: '2:3, 5:4, 5:2',
      inputLabel: 'Orders to insert, comma separated: product_id:qty (products 1, 2, 3, 5)',
      gen: function (input) {
        var evs = strIn(input).split(',').map(function (s) { return s.trim(); }).filter(function (s) { return s.length; });
        if (!evs.length) throw new Error('Type orders like: 2:3, 5:4');
        if (evs.length > 5) throw new Error('Use at most 5 orders');
        var prod = [[1, 'Pixel Phone', 10], [2, 'USB-C Cable', 6], [3, 'SQL Book', 15], [5, 'DB Internals', 3]];
        var orders = [], audit = [], alerts = [], oid = 7, aid = 1, f = [];
        var pc = ['id', 'name', 'stock'], oc = ['id', 'product_id', 'qty'], ac = ['id', 'row_id', 'old → new stock'], lc = ['product_id', 'stock', 'message'];
        function g(hl, ehl, tags) {
          return { type: 'graph', directed: true, height: 72, label: 'Trigger chain',
            nodes: [{ id: 'I', label: 'INSERT order', x: 12, y: 10, shape: 'box' }, { id: 'B', label: 'BEFORE check', x: 46, y: 10, shape: 'box' }, { id: 'O', label: 'orders', x: 82, y: 10, shape: 'box' },
              { id: 'T', label: 'AFTER take_stock', x: 80, y: 36, shape: 'box' }, { id: 'P', label: 'UPDATE products', x: 44, y: 36, shape: 'box' }, { id: 'U', label: 'AFTER audit', x: 13, y: 36, shape: 'box' },
              { id: 'L', label: 'audit_log', x: 13, y: 62, shape: 'box' }, { id: 'W', label: 'WHEN stock < 5', x: 50, y: 62, shape: 'box' }, { id: 'A', label: 'alerts', x: 84, y: 62, shape: 'box' }],
            edges: [['I', 'B'], ['B', 'O', 'write'], ['O', 'T'], ['T', 'P'], ['P', 'U'], ['U', 'L'], ['P', 'W'], ['W', 'A']], hl: hl || {}, ehl: ehl || {}, tags: tags || {} };
        }
        function state(hp, ho, ha, hal) { return [tbl('products', pc, prod, hp || {}), tbl('orders (new rows)', oc, orders, ho || {}), tbl('audit_log', ac, audit, ha || {}), tbl('low_stock_alerts', lc, alerts, hal || {})]; }
        f.push({ narr: 'Four triggers are installed: <b>BEFORE INSERT</b> on orders (reject if qty &gt; stock), <b>AFTER INSERT</b> on orders (decrement stock), <b>AFTER UPDATE</b> on products (audit), and <b>AFTER UPDATE … WHEN stock &lt; 5</b> (low-stock alert). The app only ever runs a plain INSERT.', parts: [g()].concat(state()) });
        evs.forEach(function (e) {
          var m = e.match(/^(\d+)\s*:\s*(\d+)$/);
          if (!m) throw new Error('Bad order "' + e + '". Use product_id:qty, e.g. 2:3');
          var pid = Number(m[1]), qty = Number(m[2]), pi = -1;
          prod.forEach(function (r, i) { if (r[0] === pid) pi = i; });
          if (pi < 0) throw new Error('Unknown product ' + pid + '. Use 1, 2, 3 or 5');
          if (qty <= 0) throw new Error('qty must be positive');
          f.push({ narr: '<code>INSERT INTO orders (product_id, qty) VALUES (' + pid + ', ' + qty + ')</code>. Before the row is written, the <b>BEFORE</b> trigger compares qty ' + qty + ' with stock ' + prod[pi][2] + '.', parts: [g({ I: 'cur', B: 'cur' }, { 'I-B': 'ok' })].concat(state(one(pi, 'win'))) });
          if (qty > prod[pi][2]) {
            f.push({ narr: '<span class="c-r">RAISE(ABORT, \'not enough stock\')</span>. The INSERT is cancelled, so no AFTER trigger ever fires — the chain stops here and every table is unchanged.', parts: [g({ I: 'bad', B: 'bad' }, { 'I-B': 'bad', 'B-O': 'bad' }, { B: 'ABORT' })].concat(state(one(pi, 'bad'))) });
            return;
          }
          orders.push([oid++, pid, qty]);
          f.push({ narr: 'Check passed: the order row is written (green). Now the AFTER INSERT trigger <b>orders_take_stock</b> wakes up.', parts: [g({ B: 'ok', O: 'ok', T: 'cur' }, { 'B-O': 'ok', 'O-T': 'ok' })].concat(state({}, one(orders.length - 1, 'ok'))) });
          var old = prod[pi][2]; prod[pi][2] = old - qty;
          f.push({ narr: 'The trigger runs <code>UPDATE products SET stock = stock - ' + qty + '</code>: ' + old + ' → <b>' + prod[pi][2] + '</b> (amber). This UPDATE is itself an event, so the products triggers fire next — a <b>chain</b>.', parts: [g({ T: 'ok', P: 'cur' }, { 'T-P': 'ok' })].concat(state(one(pi, 'cur'), one(orders.length - 1, 'ok'))) });
          audit.push([aid++, pid, old + ' → ' + prod[pi][2]]);
          f.push({ narr: 'AFTER UPDATE trigger <b>products_audit</b> records old and new stock in audit_log (green). Nobody had to remember to write this in the app.', parts: [g({ P: 'ok', U: 'cur', L: 'ok' }, { 'P-U': 'ok', 'U-L': 'ok' })].concat(state(one(pi, 'cur'), {}, one(audit.length - 1, 'ok'))) });
          if (prod[pi][2] < 5) {
            alerts.push([pid, prod[pi][2], 'reorder ' + prod[pi][1]]);
            f.push({ narr: 'The <b>WHEN stock &lt; 5</b> condition is true (' + prod[pi][2] + '), so the low-stock trigger fires and inserts an alert. One INSERT caused 4 writes in 4 tables.', parts: [g({ W: 'ok', A: 'ok' }, { 'P-W': 'ok', 'W-A': 'ok' }, { W: 'true' })].concat(state(one(pi, 'cur'), {}, {}, one(alerts.length - 1, 'ok'))) });
          } else {
            f.push({ narr: 'The WHEN condition is false (stock ' + prod[pi][2] + ' ≥ 5), so the alert trigger is skipped. Chain finished.', parts: [g({ W: 'done' }, { 'P-W': 'bad' }, { W: 'false' })].concat(state()) });
          }
        });
        f.push({ narr: 'Final state. Every change is traceable in audit_log — but notice how much happened that the INSERT statement never mentioned. That hidden power is both the value and the danger of triggers.', parts: state() });
        return f;
      }
    },
    examples: [
      { title: 'Maintain updated_at automatically', html: `<p>SQLite cannot modify NEW in a BEFORE trigger (Postgres and MySQL can), so use an AFTER UPDATE trigger that updates the row. It does not loop forever because recursive triggers are off by default — and the <code>UPDATE OF</code> column list excludes <code>updated_at</code> anyway.</p>`, code: shop(`CREATE TRIGGER products_touch AFTER UPDATE OF price_cents, stock, name ON products
BEGIN
  UPDATE products SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;
UPDATE products SET price_cents = 3199 WHERE id = 3;
SELECT id, price_cents, updated_at FROM products WHERE id = 3;   -- updated_at refreshed`) },
      { title: 'INSTEAD OF trigger: insert into a join view', html: `<p>A view joining orders and customers cannot be inserted into directly. An INSTEAD OF INSERT trigger translates "insert an order for asha@mail.com" into a lookup + insert on the base table.</p>`, code: shop(`CREATE VIEW order_entry AS
SELECT o.id, c.email, o.product_id, o.qty FROM orders o JOIN customers c ON c.id = o.customer_id;
CREATE TRIGGER order_entry_ins INSTEAD OF INSERT ON order_entry
BEGIN
  INSERT INTO orders (customer_id, product_id, qty)
  VALUES ((SELECT id FROM customers WHERE email = NEW.email), NEW.product_id, NEW.qty);
END;
INSERT INTO order_entry (email, product_id, qty) VALUES ('dara@mail.com', 3, 2);
SELECT * FROM order_entry WHERE email = 'dara@mail.com';`) },
      { title: 'Runaway chains and recursion', html: `<p>With <code>PRAGMA recursive_triggers = ON</code>, a trigger that updates its own table fires itself again. SQLite stops at a depth limit (1000 by default via SQLITE_MAX_TRIGGER_DEPTH); Postgres has no limit except the stack. Guard with WHEN conditions so the chain ends. Here a counter trigger stops at 5.</p>`, code: lab(`PRAGMA recursive_triggers = ON;
CREATE TABLE t (id INTEGER PRIMARY KEY, n INTEGER);
CREATE TRIGGER bump AFTER UPDATE ON t WHEN NEW.n < 5
BEGIN
  UPDATE t SET n = n + 1 WHERE id = NEW.id;   -- fires bump again (recursion)
END;
INSERT INTO t VALUES (1, 0);
UPDATE t SET n = 1 WHERE id = 1;
SELECT * FROM t;   -- n = 5: the WHEN guard ended the chain`) },
      { title: 'Audit "who", not just "what"', html: `<p>SQLite has no database users, so the app must pass the actor: write it in a column the trigger copies (e.g. <code>last_modified_by</code>) or a one-row "session context" table. Postgres triggers can read <code>current_user</code> or <code>current_setting('app.user_id')</code> set per transaction.</p>`, code: shop(`CREATE TEMP TABLE session_ctx (k TEXT PRIMARY KEY, v TEXT);
INSERT INTO session_ctx VALUES ('user', 'ops:dara');
CREATE TEMP TRIGGER acct_audit AFTER UPDATE OF balance ON accounts
BEGIN
  INSERT INTO audit_log (table_name, row_id, action, old_data, new_data)
  VALUES ('accounts', NEW.id, 'UPDATE by ' || (SELECT v FROM session_ctx WHERE k = 'user'),
          OLD.balance, NEW.balance);
END;
UPDATE accounts SET balance = balance + 50 WHERE id = 3;
SELECT action, old_data, new_data FROM audit_log;`) }
    ],
    deepDive: `<p><b>Same transaction.</b> Triggers run inside the statement's transaction: if the trigger fails, the triggering statement fails; if the transaction rolls back, the trigger's writes vanish too. That is exactly why audit triggers are trustworthy — and why sending an email or HTTP call from a trigger is wrong (it cannot be rolled back). Use an <b>outbox table</b> written by the trigger and a separate worker that delivers messages.</p>
<p><b>Row vs statement level.</b> Updating 1M rows fires a row trigger 1M times. Postgres statement-level triggers with <b>transition tables</b> (<code>REFERENCING NEW TABLE AS new_rows</code>) process the whole set in one set-based INSERT — far faster for audit of bulk changes. SQLite only has row triggers; MySQL too.</p>
<p><b>Ordering.</b> Postgres fires same-event triggers in alphabetical name order; MySQL supports <code>FOLLOWS/PRECEDES</code>; SQLite's order is not something to rely on. Constraint checks happen around BEFORE triggers, and deferred FKs at commit.</p>
<p><b>Operational traps.</b> Logical replication / CDC tools may or may not replay trigger effects on replicas (Postgres replicas apply changes without firing ordinary triggers unless set to <code>ENABLE REPLICA/ALWAYS</code>). Bulk loads often disable triggers (<code>ALTER TABLE … DISABLE TRIGGER</code>, <code>session_replication_role = replica</code>) — and then forget to backfill audit data. ORMs that cache rows will not see values a trigger changed unless they re-read (<code>RETURNING</code> helps).</p>
<p><b>Alternatives:</b> CDC streams (Debezium reading the WAL/binlog) give an audit/event feed without trigger overhead; temporal tables keep history natively; application domain events keep workflows visible in code.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI is excellent at producing boilerplate triggers (audit for 30 tables), and at the opposite job — <code>List every trigger in this schema, what fires it, and draw the chain of side effects</code> — which is how you debug "mystery writes".</p>
<p><b>Where AI goes wrong:</b> it writes Postgres trigger functions for SQLite (no <code>RETURNS trigger</code> there), tries to assign <code>NEW.col</code> in SQLite, puts network calls or long logic in triggers, forgets the WHEN guard (audit rows for no-op updates), or creates recursive chains.</p>
<p><b>What you still own:</b> deciding what belongs in a trigger (integrity, audit) vs the app (workflows), documenting triggers next to the schema, measuring write overhead, and making sure agents that bulk-edit data cannot silently disable the audit trail.</p>`,
    problems: [{
      title: 'Audit Trail for Salary Changes', level: 'Medium', tags: ['trigger', 'audit', 'json'], companies: ['Oracle', 'SAP', 'Goldman Sachs'],
      statement: `<p>Compliance requires that every change to an employee's <b>salary</b> and every <b>deletion</b> of an employee is recorded in <code>audit_log</code> with the old and new values, regardless of which app, script or person ran the SQL. Updates that do not change salary must <b>not</b> create audit rows.</p>`,
      constraints: `<p>SQLite dialect. Use <code>audit_log(table_name, row_id, action, old_data, new_data, changed_at)</code>. Must work for multi-row UPDATEs.</p>`,
      example: `<p><code>UPDATE employees SET salary = salary * 1.1 WHERE dept = 'Eng'</code> → ${H.c('g', '3 audit rows')} (Asha, Ben, Eli). <code>UPDATE employees SET title = 'Staff' WHERE id = 2</code> → ${H.c('m', 'no audit row')}. <code>DELETE FROM employees WHERE id = 3</code> → ${H.c('g', '1 DELETE audit row')} with Chen's old data.</p>`,
      brute: { why: `<p>Naive approach: the application writes the audit row right after each UPDATE. It works only for code paths that remember to do it: a support engineer's manual SQL, a batch script, or a new microservice skip it; and if the app crashes between the two statements (or they are not in one transaction) you get changes without audit. Compliance needs a guarantee, not a convention.</p>`, code: shop(`-- App-side "audit": two separate statements that every caller must remember.
UPDATE employees SET salary = 190000 WHERE id = 2;
INSERT INTO audit_log (table_name, row_id, action, old_data, new_data)
VALUES ('employees', 2, 'UPDATE', '180000', '190000');      -- old value hard-coded by the app!
UPDATE employees SET salary = 95000 WHERE id = 3;           -- someone forgot -> no audit row
SELECT * FROM audit_log;`) },
      mcq: { q: 'Which trigger setup meets "only when salary changes"?', options: ['AFTER UPDATE OF salary … WHEN OLD.salary IS NOT NEW.salary', 'BEFORE INSERT ON employees', 'AFTER UPDATE ON employees with no WHEN', 'A view over employees'], answer: 0, explain: '<code>UPDATE OF salary</code> limits the event to statements that set salary; the WHEN filters out no-op assignments (same value). IS NOT is NULL-safe.' },
      hints: [`<p>Hint 1: Put the rule where every write passes — inside the database — with an AFTER trigger. It runs in the same transaction as the change.</p>`, `<p>Hint 2: Use <code>OLD.salary</code> and <code>NEW.salary</code>; store rows as JSON with <code>json_object(…)</code> so the audit format survives schema changes.</p>`, `<p>Hint 3: Two triggers: <code>AFTER UPDATE OF salary … WHEN OLD.salary IS NOT NEW.salary</code> and <code>AFTER DELETE</code>. Row-level triggers fire once per row, so a 3-row UPDATE writes 3 audit rows.</p>`],
      tests: { cmp: 'exact', engine: 'sqlite', cases: [
          { cols: ['row_id', 'action', 'old_data', 'new_data'], rows: [[1, 'UPDATE', '{"salary":250000}', '{"salary":275000}'], [2, 'UPDATE', '{"salary":180000}', '{"salary":198000}'], [5, 'UPDATE', '{"salary":170000}', '{"salary":187000}'], [3, 'DELETE', '{"name":"Chen","dept":"Sales","salary":90000}', null]] },
          { setup: 'DELETE FROM employees; DELETE FROM employees; INSERT INTO employees VALUES (1, \'N1\', \'Eng\', \'T\', 250000, \'000-00-1001\', \'e1@c.com\', NULL), (2, \'N2\', \'Eng\', \'T\', 180000, \'000-00-1002\', \'e2@c.com\', NULL), (3, \'N3\', \'Sales\', \'T\', 90000, \'000-00-1003\', \'e3@c.com\', NULL), (5, \'N5\', \'Eng\', \'T\', 0, \'000-00-1005\', \'e5@c.com\', NULL);', cols: ['row_id', 'action', 'old_data', 'new_data'], rows: [[1, 'UPDATE', '{"salary":250000}', '{"salary":275000}'], [2, 'UPDATE', '{"salary":180000}', '{"salary":198000}'], [3, 'DELETE', '{"name":"N3","dept":"Sales","salary":90000}', null]] },
          { setup: 'DELETE FROM employees; DELETE FROM employees; INSERT INTO employees VALUES (1, \'N1\', \'Ops\', \'T\', 100, \'000-00-1001\', \'e1@c.com\', NULL), (3, \'N3\', \'Ops\', \'T\', 100, \'000-00-1003\', \'e3@c.com\', NULL);', cols: ['row_id', 'action', 'old_data', 'new_data'], rows: [[3, 'DELETE', '{"name":"N3","dept":"Ops","salary":100}', null]] },
          { setup: 'DELETE FROM employees; DELETE FROM employees; INSERT INTO employees VALUES (1, \'N1\', \'Eng\', \'T\', 100, \'000-00-1001\', \'e1@c.com\', NULL), (2, \'N2\', \'Eng\', \'T\', 200, \'000-00-1002\', \'e2@c.com\', NULL);', cols: ['row_id', 'action', 'old_data', 'new_data'], rows: [[1, 'UPDATE', '{"salary":100}', '{"salary":110}'], [2, 'UPDATE', '{"salary":200}', '{"salary":220}']] },
          { setup: 'DELETE FROM employees; DELETE FROM employees; INSERT INTO employees VALUES (1, \'N1\', \'Eng\', \'T\', 1000, \'000-00-1001\', \'e1@c.com\', NULL), (2, \'N2\', \'Eng\', \'T\', 2000, \'000-00-1002\', \'e2@c.com\', NULL), (3, \'N3\', \'Eng\', \'T\', 3000, \'000-00-1003\', \'e3@c.com\', NULL), (4, \'N4\', \'Eng\', \'T\', 4000, \'000-00-1004\', \'e4@c.com\', NULL), (5, \'N5\', \'HR\', \'T\', 5000, \'000-00-1005\', \'e5@c.com\', NULL), (6, \'N6\', \'Eng\', \'T\', 6000, \'000-00-1006\', \'e6@c.com\', NULL), (7, \'N7\', \'Eng\', \'T\', 7000, \'000-00-1007\', \'e7@c.com\', NULL), (8, \'N8\', \'Eng\', \'T\', 8000, \'000-00-1008\', \'e8@c.com\', NULL), (9, \'N9\', \'Eng\', \'T\', 9000, \'000-00-1009\', \'e9@c.com\', NULL), (10, \'N10\', \'HR\', \'T\', 10000, \'000-00-1010\', \'e10@c.com\', NULL), (11, \'N11\', \'Eng\', \'T\', 11000, \'000-00-1011\', \'e11@c.com\', NULL), (12, \'N12\', \'Eng\', \'T\', 12000, \'000-00-1012\', \'e12@c.com\', NULL), (13, \'N13\', \'Eng\', \'T\', 13000, \'000-00-1013\', \'e13@c.com\', NULL), (14, \'N14\', \'Eng\', \'T\', 14000, \'000-00-1014\', \'e14@c.com\', NULL), (15, \'N15\', \'HR\', \'T\', 15000, \'000-00-1015\', \'e15@c.com\', NULL), (16, \'N16\', \'Eng\', \'T\', 16000, \'000-00-1016\', \'e16@c.com\', NULL), (17, \'N17\', \'Eng\', \'T\', 17000, \'000-00-1017\', \'e17@c.com\', NULL), (18, \'N18\', \'Eng\', \'T\', 18000, \'000-00-1018\', \'e18@c.com\', NULL), (19, \'N19\', \'Eng\', \'T\', 19000, \'000-00-1019\', \'e19@c.com\', NULL), (20, \'N20\', \'HR\', \'T\', 20000, \'000-00-1020\', \'e20@c.com\', NULL), (21, \'N21\', \'Eng\', \'T\', 21000, \'000-00-1021\', \'e21@c.com\', NULL), (22, \'N22\', \'Eng\', \'T\', 22000, \'000-00-1022\', \'e22@c.com\', NULL), (23, \'N23\', \'Eng\', \'T\', 23000, \'000-00-1023\', \'e23@c.com\', NULL), (24, \'N24\', \'Eng\', \'T\', 24000, \'000-00-1024\', \'e24@c.com\', NULL), (25, \'N25\', \'HR\', \'T\', 25000, \'000-00-1025\', \'e25@c.com\', NULL);', cols: ['row_id', 'action', 'old_data', 'new_data'], rows: [[1, 'UPDATE', '{"salary":1000}', '{"salary":1100}'], [2, 'UPDATE', '{"salary":2000}', '{"salary":2200}'], [3, 'UPDATE', '{"salary":3000}', '{"salary":3300}'], [4, 'UPDATE', '{"salary":4000}', '{"salary":4400}'], [6, 'UPDATE', '{"salary":6000}', '{"salary":6600}'], [7, 'UPDATE', '{"salary":7000}', '{"salary":7700}'], [8, 'UPDATE', '{"salary":8000}', '{"salary":8800}'], [9, 'UPDATE', '{"salary":9000}', '{"salary":9900}'], [11, 'UPDATE', '{"salary":11000}', '{"salary":12100}'], [12, 'UPDATE', '{"salary":12000}', '{"salary":13200}'], [13, 'UPDATE', '{"salary":13000}', '{"salary":14300}'], [14, 'UPDATE', '{"salary":14000}', '{"salary":15400}'], [16, 'UPDATE', '{"salary":16000}', '{"salary":17600}'], [17, 'UPDATE', '{"salary":17000}', '{"salary":18700}'], [18, 'UPDATE', '{"salary":18000}', '{"salary":19800}'], [19, 'UPDATE', '{"salary":19000}', '{"salary":20900}'], [21, 'UPDATE', '{"salary":21000}', '{"salary":23100}'], [22, 'UPDATE', '{"salary":22000}', '{"salary":24200}'], [23, 'UPDATE', '{"salary":23000}', '{"salary":25300}'], [24, 'UPDATE', '{"salary":24000}', '{"salary":26400}'], [3, 'DELETE', '{"name":"N3","dept":"Eng","salary":3300}', null]] },
          { setup: 'DELETE FROM employees; DELETE FROM employees; INSERT INTO employees VALUES (3, \'N3\', \'Eng\', \'T\', 1000, \'000-00-1003\', \'e3@c.com\', NULL), (1, \'N1\', \'Eng\', \'T\', 9, \'000-00-1001\', \'e1@c.com\', NULL), (2, \'N2\', \'Eng\', \'T\', 10, \'000-00-1002\', \'e2@c.com\', NULL);', cols: ['row_id', 'action', 'old_data', 'new_data'], rows: [[2, 'UPDATE', '{"salary":10}', '{"salary":11}'], [3, 'UPDATE', '{"salary":1000}', '{"salary":1100}'], [3, 'DELETE', '{"name":"N3","dept":"Eng","salary":1100}', null]] },
          { after: 'UPDATE employees SET salary = salary + 1; SELECT COUNT(*) FROM audit_log', rows: [[8]] },
          { after: 'UPDATE employees SET title = \'X\', name = \'Y\'; SELECT COUNT(*) FROM audit_log', rows: [[4]] },
          { after: 'DELETE FROM employees WHERE id = 4; SELECT old_data, new_data FROM audit_log WHERE action = \'DELETE\' AND row_id = 4', rows: [['{"name":"Dara","dept":"HR","salary":110000}', null]] },
          { after: 'DELETE FROM employees WHERE dept = \'Eng\'; SELECT COUNT(*) FROM audit_log WHERE action = \'DELETE\'', rows: [[4]] },
          { after: 'UPDATE employees SET salary = 1 WHERE id = 1; SELECT old_data, new_data FROM audit_log WHERE row_id = 1 ORDER BY id', rows: [['{"salary":250000}', '{"salary":275000}'], ['{"salary":275000}', '{"salary":1}']] }
        ] },
      solution: {
        approach: `<p>Two AFTER row triggers writing JSON images into <code>audit_log</code>. Because they live in the database and run in the same transaction, no client can bypass them and audit rows exist exactly when the change commits.</p>`,
        code: shop(`CREATE TRIGGER employees_salary_audit
AFTER UPDATE OF salary ON employees
WHEN OLD.salary IS NOT NEW.salary
BEGIN
  INSERT INTO audit_log (table_name, row_id, action, old_data, new_data)
  VALUES ('employees', NEW.id, 'UPDATE',
          json_object('salary', OLD.salary),
          json_object('salary', NEW.salary));
END;

CREATE TRIGGER employees_delete_audit
AFTER DELETE ON employees
BEGIN
  INSERT INTO audit_log (table_name, row_id, action, old_data, new_data)
  VALUES ('employees', OLD.id, 'DELETE',
          json_object('name', OLD.name, 'dept', OLD.dept, 'salary', OLD.salary), NULL);
END;

UPDATE employees SET salary = CAST(salary * 1.1 AS INTEGER) WHERE dept = 'Eng';  -- 3 audit rows
UPDATE employees SET title = 'Staff Engineer' WHERE id = 2;                      -- 0 audit rows
UPDATE employees SET salary = salary WHERE id = 4;                               -- 0 (no real change)
DELETE FROM employees WHERE id = 3;                                              -- 1 audit row
SELECT row_id, action, old_data, new_data FROM audit_log ORDER BY id;`),
        alt: [pg(`-- PostgreSQL: statement-level trigger with transition tables (fast for bulk updates)
CREATE FUNCTION audit_salary() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO audit_log (table_name, row_id, action, old_data, new_data)
  SELECT 'employees', n.id, 'UPDATE', jsonb_build_object('salary', o.salary), jsonb_build_object('salary', n.salary)
  FROM old_rows o JOIN new_rows n ON n.id = o.id
  WHERE o.salary IS DISTINCT FROM n.salary;
  RETURN NULL;
END $$;
CREATE TRIGGER employees_salary_audit AFTER UPDATE ON employees
REFERENCING OLD TABLE AS old_rows NEW TABLE AS new_rows
FOR EACH STATEMENT EXECUTE FUNCTION audit_salary();`)],
        dry: { head: ['statement', 'rows hit', 'trigger fired?', 'audit rows'], rows: [['raise Eng 10%', '3', 'salary trigger ×3', H.c('g', '+3')], ['set title on id 2', '1', 'no (UPDATE OF salary)', '0'], ['salary = salary on id 4', '1', 'event yes, WHEN false', '0'], ['delete id 3', '1', 'delete trigger', H.c('g', '+1')]] },
        complexity: `<p>One extra INSERT per changed row (O(1) each), inside the same transaction. For millions of rows per statement, prefer statement-level triggers or CDC.</p>`,
        followUps: ['Record who made the change (SQLite has no current_user)', 'Prevent anyone from UPDATE/DELETE on audit_log itself', 'Rebuild an employee\'s salary history at a point in time from the log']
      }
    }]
  });

  /* ======================= PRACTICE ARENA ======================= */
  // ---------- Easy ----------
  practice.push({
    title: 'Create a Product and Get Its New ID', level: 'Easy', tags: ['insert', 'returning'], companies: ['Shopify', 'Amazon'],
    statement: `<p>Add the product <b>MS-007 "Wireless Mouse"</b> (category accessories, ₹19.99 = 1999 cents, stock 40) and return its generated <code>id</code> and <code>updated_at</code> in the same statement.</p>`,
    constraints: `<p>Many app servers insert products concurrently. Do not rely on column order.</p>`,
    example: `<p>Output: one row ${H.c('g', 'id = 6, updated_at = (now)')} — 6 because ids 1–5 exist. The id comes back from the INSERT itself, so no other session can interfere.</p>`,
    brute: { why: `<p>INSERT, then <code>SELECT MAX(id)</code>. Between the two statements another server may insert its own product, and you read <i>its</i> id. It also costs a second round trip.</p>`, code: shop(`INSERT INTO products (sku, name, category, price_cents, stock)
VALUES ('MS-007', 'Wireless Mouse', 'accessories', 1999, 40);
SELECT MAX(id) AS maybe_my_id FROM products;   -- racy under concurrency`) },
    mcq: { q: 'Safest way to learn the generated id?', options: ['INSERT … RETURNING id', 'SELECT MAX(id) right after', 'SELECT COUNT(*)', 'Guess id = previous + 1'], answer: 0, explain: 'RETURNING reads the id of exactly the row this statement inserted.' },
    hints: [`<p>Hint 1: Leave <code>id</code> out of the column list — <code>INTEGER PRIMARY KEY</code> is filled automatically.</p>`, `<p>Hint 2: Append <code>RETURNING id, updated_at</code> to the INSERT (SQLite 3.35+, Postgres; JDBC getGeneratedKeys elsewhere).</p>`, `<p>Hint 3: Name every column you supply so the statement survives schema changes; let DEFAULT fill updated_at.</p>`],
    tests: { cmp: 'exact', engine: 'sqlite', cases: [
        { mode: 'ret', id: 6 },
        { mode: 'ret', id: 1, setup: 'DELETE FROM orders; DELETE FROM products;' },
        { mode: 'ret', id: 101, setup: 'INSERT INTO products (id, sku, name, category, price_cents) VALUES (100, \'X-100\', \'x\', \'c\', 5)' },
        { mode: 'ret', id: 11, setup: 'INSERT INTO products (id, sku, name, category, price_cents) VALUES (10, \'X-10\', \'x\', \'c\', 5)' },
        { after: 'SELECT sku, name, category, price_cents, stock FROM products WHERE sku = \'MS-007\'', rows: [['MS-007', 'Wireless Mouse', 'accessories', 1999, 40]] },
        { after: 'SELECT COUNT(*) FROM products', rows: [[6]] },
        { after: 'SELECT updated_at IS NOT NULL AND updated_at > \'2020-01-01\' FROM products WHERE sku = \'MS-007\'', rows: [[1]] },
        { setup: 'INSERT INTO products (sku, name, category, price_cents) VALUES (\'MS-007\', \'Old Mouse\', \'accessories\', 5)', error: 'UNIQUE' },
        { setup: 'DELETE FROM orders; DELETE FROM products WHERE id = 5;', after: 'SELECT id FROM products WHERE sku = \'MS-007\'', rows: [[5]] }
      ], check: '(rows, cols, c) => { if (c.mode === \'ret\') return rows.length === 1 && rows[0][0] === c.id && rows[0][1] === \'MS-007\' && /^\\d{4}-\\d\\d-\\d\\d \\d\\d:\\d\\d:\\d\\d$/.test(String(rows[0][2])); return JSON.stringify(rows) === JSON.stringify(c.rows); }' },
    solution: { approach: `<p>Single INSERT with an explicit column list and RETURNING.</p>`, code: shop(`INSERT INTO products (sku, name, category, price_cents, stock)
VALUES ('MS-007', 'Wireless Mouse', 'accessories', 1999, 40)
RETURNING id, sku, updated_at;`), complexity: `<p>O(log N) for the PK and the UNIQUE(sku) index inserts; one round trip.</p>`, followUps: ['How do you get ids for a 500-row multi-row INSERT?', 'What is the MySQL equivalent?'] }
  });

  practice.push({
    title: 'Cancel Stale Pending Orders', level: 'Easy', tags: ['update', 'where'], companies: ['Swiggy', 'DoorDash'],
    statement: `<p>Cancel every order that is still <code>pending</code> and was created before <b>2026-09-01</b>. Report which orders were cancelled.</p>`,
    constraints: `<p>Never touch paid, shipped or already-cancelled orders.</p>`,
    example: `${H.table(['id', 'status', 'created_at', 'action'], [['3', 'pending', '2026-09-02', 'keep (too new)'], ['6', 'pending', '2026-08-15', H.c('y', 'cancel')], ['1', 'paid', '2026-09-01', 'keep']])}`,
    brute: { why: `<p>Hard-coding ids found by eye (<code>WHERE id = 6</code>) is stale the moment data changes and needs one statement per order. Forgetting <code>status = 'pending'</code> would cancel old <i>shipped</i> orders too.</p>`, code: shop(`-- Fragile: ids picked by hand, one round trip each
UPDATE orders SET status = 'cancelled' WHERE id = 6;
SELECT id, status FROM orders ORDER BY id;`) },
    mcq: { q: 'Which WHERE is correct?', options: ["status = 'pending' AND created_at < '2026-09-01'", "created_at < '2026-09-01'", "status = 'pending' OR created_at < '2026-09-01'", 'no WHERE needed'], answer: 0, explain: 'Both conditions must hold; OR would cancel every pending order and every old order.' },
    hints: [`<p>Hint 1: Preview with <code>SELECT id FROM orders WHERE …</code> before updating.</p>`, `<p>Hint 2: Combine both conditions with AND; ISO date strings compare correctly as text.</p>`, `<p>Hint 3: Add <code>RETURNING id</code> to report the cancelled orders in the same statement.</p>`],
    tests: { cmp: 'set', engine: 'sqlite', cases: [
        { setup: 'DELETE FROM orders; INSERT INTO orders VALUES (1, 1, 1, 1, \'paid\', \'2026-09-01 10:00:00\'), (2, 1, 3, 2, \'shipped\', \'2026-09-02 11:00:00\'), (3, 2, 2, 3, \'pending\', \'2026-09-02 15:30:00\'), (4, 3, 5, 1, \'paid\', \'2026-09-03 09:10:00\'), (5, 4, 2, 1, \'cancelled\', \'2026-09-03 18:00:00\'), (6, 2, 3, 1, \'pending\', \'2026-08-15 08:00:00\');', cols: ['id', 'customer_id', 'created_at'], rows: [[6, 2, '2026-08-15 08:00:00']] },
        { setup: 'DELETE FROM orders; INSERT INTO orders VALUES (1, 1, 1, 1, \'paid\', \'2026-09-01 10:00:00\'), (2, 1, 3, 2, \'shipped\', \'2026-09-02 11:00:00\'), (3, 2, 2, 3, \'pending\', \'2026-09-02 15:30:00\'), (4, 3, 5, 1, \'paid\', \'2026-09-03 09:10:00\'), (5, 4, 2, 1, \'cancelled\', \'2026-09-03 18:00:00\'), (6, 2, 3, 1, \'pending\', \'2026-08-15 08:00:00\');', after: 'SELECT id, status FROM orders ORDER BY id', rows: [[1, 'paid'], [2, 'shipped'], [3, 'pending'], [4, 'paid'], [5, 'cancelled'], [6, 'cancelled']] },
        { setup: 'DELETE FROM orders; ', rows: [] },
        { setup: 'DELETE FROM orders; ', after: 'SELECT id, status FROM orders ORDER BY id', rows: [] },
        { setup: 'DELETE FROM orders; INSERT INTO orders VALUES (1, 1, 1, 1, \'paid\', \'2026-01-01\'), (2, 1, 1, 1, \'shipped\', \'2026-01-01\'), (3, 1, 1, 1, \'cancelled\', \'2026-01-01\');', rows: [] },
        { setup: 'DELETE FROM orders; INSERT INTO orders VALUES (1, 1, 1, 1, \'paid\', \'2026-01-01\'), (2, 1, 1, 1, \'shipped\', \'2026-01-01\'), (3, 1, 1, 1, \'cancelled\', \'2026-01-01\');', after: 'SELECT id, status FROM orders ORDER BY id', rows: [[1, 'paid'], [2, 'shipped'], [3, 'cancelled']] },
        { setup: 'DELETE FROM orders; INSERT INTO orders VALUES (1, 1, 1, 1, \'pending\', \'2026-08-31 23:59:59\'), (2, 1, 1, 1, \'pending\', \'2026-09-01\'), (3, 1, 1, 1, \'pending\', \'2026-09-01 00:00:00\'), (4, 1, 1, 1, \'pending\', \'2026-09-01 00:00:01\');', cols: ['id', 'customer_id', 'created_at'], rows: [[1, 1, '2026-08-31 23:59:59']] },
        { setup: 'DELETE FROM orders; INSERT INTO orders VALUES (1, 1, 1, 1, \'pending\', \'2026-08-31 23:59:59\'), (2, 1, 1, 1, \'pending\', \'2026-09-01\'), (3, 1, 1, 1, \'pending\', \'2026-09-01 00:00:00\'), (4, 1, 1, 1, \'pending\', \'2026-09-01 00:00:01\');', after: 'SELECT id, status FROM orders ORDER BY id', rows: [[1, 'cancelled'], [2, 'pending'], [3, 'pending'], [4, 'pending']] },
        { setup: 'DELETE FROM orders; INSERT INTO orders VALUES (1, 2, 1, 1, \'pending\', \'2020-01-01\'), (2, 3, 1, 1, \'pending\', \'2021-05-05\'), (3, 1, 1, 1, \'paid\', \'2020-01-01\'), (4, 1, 1, 1, \'pending\', \'2026-12-31\'), (5, 4, 1, 1, \'pending\', \'2026-08-01\');', cols: ['id', 'customer_id', 'created_at'], rows: [[1, 2, '2020-01-01'], [2, 3, '2021-05-05'], [5, 4, '2026-08-01']] },
        { setup: 'DELETE FROM orders; INSERT INTO orders VALUES (1, 2, 1, 1, \'pending\', \'2020-01-01\'), (2, 3, 1, 1, \'pending\', \'2021-05-05\'), (3, 1, 1, 1, \'paid\', \'2020-01-01\'), (4, 1, 1, 1, \'pending\', \'2026-12-31\'), (5, 4, 1, 1, \'pending\', \'2026-08-01\');', after: 'SELECT id, status FROM orders ORDER BY id', rows: [[1, 'cancelled'], [2, 'cancelled'], [3, 'paid'], [4, 'pending'], [5, 'cancelled']] }
      ] },
    solution: { approach: `<p>One set-based UPDATE with both filters and RETURNING.</p>`, code: shop(`UPDATE orders
SET status = 'cancelled'
WHERE status = 'pending' AND created_at < '2026-09-01'
RETURNING id, customer_id, created_at;`), complexity: `<p>One scan of orders (or index range scan on (status, created_at)).</p>`, followUps: ['Run it nightly in batches of 1,000', 'Also restore stock for the cancelled orders'] }
  });

  practice.push({
    title: 'Daily Page-View Counter', level: 'Easy', tags: ['upsert', 'counter'], companies: ['Google', 'Medium'],
    statement: `<p>Record one hit for page <b>about</b> on <b>2026-10-01</b> in <code>page_views(page, day, hits)</code> (PK = page + day). The first hit creates the row; later hits add 1.</p>`,
    constraints: `<p>Thousands of concurrent requests; no hit may be lost.</p>`,
    example: `<p>Run twice → ${H.c('g', "('about', '2026-10-01', 2)")}. Run once for <code>home</code> → 120 becomes ${H.c('y', '121')}.</p>`,
    brute: { why: `<p>UPDATE, and if 0 rows changed, INSERT. Two concurrent first hits both see 0 rows, both INSERT; one fails or is ignored → a hit is lost. Two statements, two round trips.</p>`, code: shop(`UPDATE page_views SET hits = hits + 1 WHERE page = 'about' AND day = '2026-10-01';
INSERT OR IGNORE INTO page_views (page, day, hits) VALUES ('about', '2026-10-01', 1);   -- race between these
SELECT * FROM page_views WHERE page = 'about';`) },
    mcq: { q: 'In <code>DO UPDATE SET hits = hits + excluded.hits</code>, what is <code>excluded.hits</code>?', options: ['The value from the row you tried to insert (1)', 'The existing value', 'A deleted row', 'Always NULL'], answer: 0, explain: '<code>excluded</code> is the proposed row; the bare column refers to the stored row.' },
    hints: [`<p>Hint 1: The PRIMARY KEY (page, day) is the natural conflict target.</p>`, `<p>Hint 2: <code>INSERT … VALUES (…, 1) ON CONFLICT (page, day) DO UPDATE SET hits = hits + excluded.hits</code>.</p>`, `<p>Hint 3: Atomic in one statement — the unique index decides insert vs update, so no lost hits.</p>`],
    tests: { cmp: 'exact', engine: 'sqlite', cases: [
        { cols: ['page', 'day', 'hits'], rows: [['about', '2026-10-01', 2], ['home', '2026-10-01', 120], ['pricing', '2026-10-01', 30], ['home', '2026-10-02', 95]] },
        { setup: 'DELETE FROM page_views; ', cols: ['page', 'day', 'hits'], rows: [['about', '2026-10-01', 2]] },
        { setup: 'DELETE FROM page_views; INSERT INTO page_views VALUES (\'about\', \'2026-10-01\', 5);', cols: ['page', 'day', 'hits'], rows: [['about', '2026-10-01', 7]] },
        { setup: 'DELETE FROM page_views; INSERT INTO page_views VALUES (\'about\', \'2026-10-02\', 9), (\'about\', \'2026-09-30\', 3), (\'home\', \'2026-10-01\', 1);', cols: ['page', 'day', 'hits'], rows: [['about', '2026-09-30', 3], ['about', '2026-10-01', 2], ['home', '2026-10-01', 1], ['about', '2026-10-02', 9]] },
        { setup: 'DELETE FROM page_views; INSERT INTO page_views (page, day) VALUES (\'about\', \'2026-10-01\')', cols: ['page', 'day', 'hits'], rows: [['about', '2026-10-01', 2]] },
        { setup: 'DELETE FROM page_views; INSERT INTO page_views VALUES (\'About\', \'2026-10-01\', 1), (\'about\', \'2026-10-01\', 0);', cols: ['page', 'day', 'hits'], rows: [['About', '2026-10-01', 1], ['about', '2026-10-01', 2]] },
        { after: 'SELECT SUM(hits), COUNT(*) FROM page_views', rows: [[247, 4]] },
        { after: 'SELECT hits FROM page_views WHERE page = \'about\'', rows: [[2]] }
      ] },
    solution: { approach: `<p>Single upsert keyed on (page, day).</p>`, code: shop(`INSERT INTO page_views (page, day, hits) VALUES ('about', '2026-10-01', 1)
ON CONFLICT (page, day) DO UPDATE SET hits = hits + excluded.hits;
INSERT INTO page_views (page, day, hits) VALUES ('about', '2026-10-01', 1)
ON CONFLICT (page, day) DO UPDATE SET hits = hits + excluded.hits;
SELECT * FROM page_views ORDER BY day, page;`), complexity: `<p>One index probe per hit. At very high rates one hot row becomes a lock hotspot — batch counts in memory or shard the counter.</p>`, followUps: ['Buffer hits in Redis and flush every minute with a bulk upsert', 'MySQL version?'] }
  });

  practice.push({
    title: 'View of Products Customers Can Buy', level: 'Easy', tags: ['view'], companies: ['Flipkart', 'Etsy'],
    statement: `<p>The storefront must list only products with stock &gt; 0, showing sku, name, category and price in rupees (price_cents / 100.0). Create <code>available_products</code> so it is always current.</p>`,
    constraints: `<p>No duplicate data; stock changes all day.</p>`,
    example: `<p>Headphones (stock 0) are hidden. After <code>UPDATE products SET stock = 0 WHERE id = 5</code>, DB Internals ${H.c('r', 'disappears')} too — instantly.</p>`,
    brute: { why: `<p>Copying in-stock rows into a separate table (<code>CREATE TABLE … AS SELECT</code>) is out of date after the first sale and needs a sync job.</p>`, code: shop(`CREATE TABLE available_copy AS SELECT sku, name FROM products WHERE stock > 0;
UPDATE products SET stock = 0 WHERE id = 5;
SELECT * FROM available_copy;   -- still lists DB Internals (stale)`) },
    mcq: { q: 'What does a view store?', options: ['Only its SELECT statement', 'A copy of the rows', 'An index', 'A trigger'], answer: 0, explain: 'Views are inlined at query time, so they always reflect the base table.' },
    hints: [`<p>Hint 1: A view = a saved SELECT that re-runs on each read.</p>`, `<p>Hint 2: Compute rupees with <code>price_cents / 100.0</code> (the .0 forces real division).</p>`, `<p>Hint 3: <code>CREATE VIEW available_products AS SELECT … FROM products WHERE stock &gt; 0;</code></p>`],
    tests: { cmp: 'set', engine: 'sqlite', cases: [
        { cols: ['sku', 'name', 'category', 'price_rupees'], rows: [['PH-001', 'Pixel Phone', 'phones', 499], ['CB-002', 'USB-C Cable', 'accessories', 9.99], ['BK-003', 'SQL Book', 'books', 29.99]] },
        { setup: 'UPDATE products SET stock = 0', rows: [] },
        { setup: 'UPDATE products SET stock = 1', cols: ['sku', 'name', 'category', 'price_rupees'], rows: [['PH-001', 'Pixel Phone', 'phones', 499], ['CB-002', 'USB-C Cable', 'accessories', 9.99], ['BK-003', 'SQL Book', 'books', 29.99], ['HP-004', 'Headphones', 'accessories', 79.99]] },
        { setup: 'UPDATE products SET price_cents = 1999 WHERE id = 1; UPDATE products SET price_cents = 50 WHERE id = 2', cols: ['sku', 'name', 'category', 'price_rupees'], rows: [['PH-001', 'Pixel Phone', 'phones', 19.99], ['CB-002', 'USB-C Cable', 'accessories', 0.5], ['BK-003', 'SQL Book', 'books', 29.99]] },
        { setup: 'UPDATE products SET stock = 1 WHERE id = 4; UPDATE products SET stock = 0 WHERE id = 2', cols: ['sku', 'name', 'category', 'price_rupees'], rows: [['PH-001', 'Pixel Phone', 'phones', 499], ['BK-003', 'SQL Book', 'books', 29.99], ['HP-004', 'Headphones', 'accessories', 79.99]] },
        { setup: 'UPDATE products SET stock = 100000 WHERE id = 5', cols: ['sku', 'name', 'category', 'price_rupees'], rows: [['PH-001', 'Pixel Phone', 'phones', 499], ['CB-002', 'USB-C Cable', 'accessories', 9.99], ['BK-003', 'SQL Book', 'books', 29.99]] },
        { after: 'UPDATE products SET stock = 7 WHERE id = 4; SELECT sku FROM available_products ORDER BY sku', rows: [['BK-003'], ['CB-002'], ['HP-004'], ['PH-001']] },
        { after: 'SELECT name FROM pragma_table_info(\'available_products\') ORDER BY cid', rows: [['sku'], ['name'], ['category'], ['price_rupees']] },
        { after: 'INSERT INTO products (sku, name, category, price_cents, stock) VALUES (\'N-1\',\'New\',\'c\',12345,1); SELECT price_rupees FROM available_products WHERE sku = \'N-1\'', rows: [[123.45]] }
      ] },
    solution: { approach: `<p>A filtering, projecting view.</p>`, code: shop(`CREATE VIEW available_products AS
SELECT sku, name, category, price_cents / 100.0 AS price_rupees
FROM products
WHERE stock > 0;
UPDATE products SET stock = 0 WHERE id = 5;
SELECT * FROM available_products;`), complexity: `<p>Costs one scan of products per read; add an index on stock if the table is large.</p>`, followUps: ['Hide soft-deleted products too', 'When would you materialize this?'] }
  });

  // ---------- Medium ----------
  practice.push({
    title: 'Restock From Deliveries (No Fan-Out)', level: 'Medium', tags: ['update from', 'aggregation'], companies: ['Walmart', 'Instacart'],
    statement: `<p>Apply all rows of <code>deliveries(sku, qty)</code> to <code>products.stock</code>. A SKU can appear several times. Also list deliveries whose SKU does not exist so someone can investigate.</p>`,
    constraints: `<p>Exact totals required. One UPDATE statement for the stock change.</p>`,
    example: `${H.table(['sku', 'deliveries', 'stock before', 'after'], [['CB-002', '50 + 30', '200', H.c('y', '280')], ['HP-004', '20', '0', H.c('y', '20')], ['ZZ-999', '5', '—', H.c('r', 'unknown sku')]])}`,
    brute: { why: `<p>Joining <code>deliveries</code> directly in UPDATE … FROM makes CB-002 match two source rows; the engine applies only one (arbitrary) → +50 or +30, never +80. A per-delivery loop in the app is correct but N statements.</p>`, code: shop(`UPDATE products SET stock = products.stock + d.qty
FROM deliveries d WHERE products.sku = d.sku;      -- fan-out: wrong total for CB-002
SELECT sku, stock FROM products ORDER BY id;`) },
    mcq: { q: 'How do you make each product match exactly one source row?', options: ['Aggregate deliveries by sku in a subquery first', 'Add DISTINCT to the UPDATE', 'Use LIMIT 1', 'Use INSERT OR REPLACE'], answer: 0, explain: 'GROUP BY sku collapses duplicates into one row per sku with SUM(qty).' },
    hints: [`<p>Hint 1: The problem is many source rows per target row.</p>`, `<p>Hint 2: <code>FROM (SELECT sku, SUM(qty) AS total FROM deliveries GROUP BY sku) d</code>.</p>`, `<p>Hint 3: Use an anti-join (<code>NOT EXISTS</code>) to list unknown SKUs; RETURNING shows updated rows.</p>`],
    tests: { cmp: 'set', engine: 'sqlite', cases: [
        { setup: 'DELETE FROM deliveries; INSERT INTO deliveries VALUES (1, \'CB-002\', 50), (2, \'CB-002\', 30), (3, \'HP-004\', 20), (4, \'ZZ-999\', 5);', cols: ['id', 'sku', 'unknown_sku_delivery'], rows: [[4, 'ZZ-999', 5]] },
        { setup: 'DELETE FROM deliveries; INSERT INTO deliveries VALUES (1, \'CB-002\', 50), (2, \'CB-002\', 30), (3, \'HP-004\', 20), (4, \'ZZ-999\', 5);', after: 'SELECT sku, stock FROM products ORDER BY id', rows: [['PH-001', 10], ['CB-002', 280], ['BK-003', 15], ['HP-004', 20], ['BK-005', 3]] },
        { setup: 'DELETE FROM deliveries; ', after: 'SELECT d.id, d.sku, d.qty FROM deliveries d WHERE d.sku NOT IN (SELECT sku FROM products)', rows: [] },
        { setup: 'DELETE FROM deliveries; ', after: 'SELECT sku, stock FROM products ORDER BY id', rows: [['PH-001', 10], ['CB-002', 200], ['BK-003', 15], ['HP-004', 0], ['BK-005', 3]] },
        { setup: 'DELETE FROM deliveries; INSERT INTO deliveries VALUES (1, \'PH-001\', 1), (2, \'PH-001\', 2), (3, \'PH-001\', 3), (4, \'PH-001\', 4), (5, \'PH-001\', 5), (6, \'PH-001\', 6), (7, \'PH-001\', 7), (8, \'PH-001\', 8), (9, \'PH-001\', 9), (10, \'PH-001\', 10);', after: 'SELECT d.id, d.sku, d.qty FROM deliveries d WHERE d.sku NOT IN (SELECT sku FROM products)', rows: [] },
        { setup: 'DELETE FROM deliveries; INSERT INTO deliveries VALUES (1, \'PH-001\', 1), (2, \'PH-001\', 2), (3, \'PH-001\', 3), (4, \'PH-001\', 4), (5, \'PH-001\', 5), (6, \'PH-001\', 6), (7, \'PH-001\', 7), (8, \'PH-001\', 8), (9, \'PH-001\', 9), (10, \'PH-001\', 10);', after: 'SELECT sku, stock FROM products ORDER BY id', rows: [['PH-001', 65], ['CB-002', 200], ['BK-003', 15], ['HP-004', 0], ['BK-005', 3]] },
        { setup: 'DELETE FROM deliveries; INSERT INTO deliveries VALUES (1, \'NOPE-1\', 10), (2, \'NOPE-1\', 20), (3, \'NOPE-2\', 1);', cols: ['id', 'sku', 'unknown_sku_delivery'], rows: [[1, 'NOPE-1', 10], [2, 'NOPE-1', 20], [3, 'NOPE-2', 1]] },
        { setup: 'DELETE FROM deliveries; INSERT INTO deliveries VALUES (1, \'NOPE-1\', 10), (2, \'NOPE-1\', 20), (3, \'NOPE-2\', 1);', after: 'SELECT sku, stock FROM products ORDER BY id', rows: [['PH-001', 10], ['CB-002', 200], ['BK-003', 15], ['HP-004', 0], ['BK-005', 3]] },
        { setup: 'DELETE FROM deliveries; INSERT INTO deliveries VALUES (1, \'cb-002\', 5), (2, \'CB-002\', 5);', cols: ['id', 'sku', 'unknown_sku_delivery'], rows: [[1, 'cb-002', 5]] },
        { setup: 'DELETE FROM deliveries; INSERT INTO deliveries VALUES (1, \'cb-002\', 5), (2, \'CB-002\', 5);', after: 'SELECT sku, stock FROM products ORDER BY id', rows: [['PH-001', 10], ['CB-002', 205], ['BK-003', 15], ['HP-004', 0], ['BK-005', 3]] },
        { setup: 'DELETE FROM deliveries; INSERT INTO deliveries VALUES (1, \'BK-005\', 1000000), (2, \'HP-004\', 1);', after: 'SELECT d.id, d.sku, d.qty FROM deliveries d WHERE d.sku NOT IN (SELECT sku FROM products)', rows: [] },
        { setup: 'DELETE FROM deliveries; INSERT INTO deliveries VALUES (1, \'BK-005\', 1000000), (2, \'HP-004\', 1);', after: 'SELECT sku, stock FROM products ORDER BY id', rows: [['PH-001', 10], ['CB-002', 200], ['BK-003', 15], ['HP-004', 1], ['BK-005', 1000003]] }
      ] },
    solution: { approach: `<p>Pre-aggregate, then UPDATE … FROM; report orphans with NOT EXISTS.</p>`, code: shop(`UPDATE products
SET stock = products.stock + d.total_qty, updated_at = CURRENT_TIMESTAMP
FROM (SELECT sku, SUM(qty) AS total_qty FROM deliveries GROUP BY sku) AS d
WHERE products.sku = d.sku
RETURNING sku, stock;

SELECT d.id, d.sku, d.qty AS unknown_sku_delivery
FROM deliveries d
WHERE NOT EXISTS (SELECT 1 FROM products p WHERE p.sku = d.sku);`), alt: [my(`UPDATE products p
JOIN (SELECT sku, SUM(qty) AS total_qty FROM deliveries GROUP BY sku) d ON d.sku = p.sku
SET p.stock = p.stock + d.total_qty;`)], complexity: `<p>One GROUP BY over deliveries + one index probe per SKU.</p>`, followUps: ['Mark deliveries as applied so re-running does not double-count', 'Do it in Postgres with UPDATE … FROM … RETURNING'] }
  });

  practice.push({
    title: 'Archive Then Delete Old Orders Atomically', level: 'Medium', tags: ['insert select', 'delete', 'transaction'], companies: ['Uber', 'Booking.com'],
    statement: `<p>Move every order created before <b>2026-09-04</b> whose status is <code>shipped</code> or <code>cancelled</code> into <code>orders_archive</code> (plus <code>archived_at</code>), and remove them from <code>orders</code>. Every deleted row must exist in the archive.</p>`,
    constraints: `<p>No row may be lost or duplicated even if statuses change while the job runs.</p>`,
    example: `<p>Orders ${H.c('y', '2 (shipped)')} and ${H.c('y', '5 (cancelled)')} move; paid and pending orders stay.</p>`,
    brute: { why: `<p>Two autocommit statements with predicates typed separately: the INSERT archives 2 rows, the DELETE uses a slightly different condition and removes 4 — two paid orders vanish without an archive copy. Even with identical predicates, a row whose status changes between the two statements is deleted unarchived (or archived but not deleted).</p>`, code: shop(`CREATE TABLE orders_archive (id INTEGER PRIMARY KEY, customer_id INTEGER, product_id INTEGER, qty INTEGER, status TEXT, created_at TEXT, archived_at TEXT);
INSERT INTO orders_archive SELECT *, CURRENT_TIMESTAMP FROM orders
WHERE created_at < '2026-09-04' AND status IN ('shipped', 'cancelled');
DELETE FROM orders WHERE created_at < '2026-09-04' AND status <> 'pending';   -- different predicate!
SELECT (SELECT COUNT(*) FROM orders_archive) AS archived, (SELECT COUNT(*) FROM orders) AS left_in_orders;`) },
    mcq: { q: 'What guarantees "archived exactly the rows deleted"?', options: ['Freeze the id list once, use it for both statements, inside one transaction', 'Run DELETE first', 'Use two different connections', 'INSERT OR REPLACE'], answer: 0, explain: 'A fixed id set + a transaction makes both statements operate on the same rows atomically.' },
    hints: [`<p>Hint 1: Decide the rows once — store their ids in a temp table.</p>`, `<p>Hint 2: INSERT … SELECT … WHERE id IN (temp) then DELETE … WHERE id IN (temp).</p>`, `<p>Hint 3: Wrap in BEGIN/COMMIT. Postgres can do it in one statement: <code>WITH moved AS (DELETE … RETURNING *) INSERT INTO archive SELECT … FROM moved</code>.</p>`],
    tests: { cmp: 'exact', engine: 'sqlite', cases: [
        { setup: 'DELETE FROM orders; INSERT INTO orders VALUES (1, 1, 1, 1, \'paid\', \'2026-09-01 10:00:00\'), (2, 1, 3, 2, \'shipped\', \'2026-09-02 11:00:00\'), (3, 2, 2, 3, \'pending\', \'2026-09-02 15:30:00\'), (4, 3, 5, 1, \'paid\', \'2026-09-03 09:10:00\'), (5, 4, 2, 1, \'cancelled\', \'2026-09-03 18:00:00\'), (6, 2, 3, 1, \'pending\', \'2026-08-15 08:00:00\');', cols: ['id', 'status'], rows: [[1, 'paid'], [3, 'pending'], [4, 'paid'], [6, 'pending']] },
        { setup: 'DELETE FROM orders; INSERT INTO orders VALUES (1, 1, 1, 1, \'paid\', \'2026-09-01 10:00:00\'), (2, 1, 3, 2, \'shipped\', \'2026-09-02 11:00:00\'), (3, 2, 2, 3, \'pending\', \'2026-09-02 15:30:00\'), (4, 3, 5, 1, \'paid\', \'2026-09-03 09:10:00\'), (5, 4, 2, 1, \'cancelled\', \'2026-09-03 18:00:00\'), (6, 2, 3, 1, \'pending\', \'2026-08-15 08:00:00\');', after: 'SELECT id, customer_id, product_id, qty, status, created_at FROM orders_archive ORDER BY id', rows: [[2, 1, 3, 2, 'shipped', '2026-09-02 11:00:00'], [5, 4, 2, 1, 'cancelled', '2026-09-03 18:00:00']] },
        { setup: 'DELETE FROM orders; ', after: 'SELECT id, status FROM orders ORDER BY id', rows: [] },
        { setup: 'DELETE FROM orders; ', after: 'SELECT id, customer_id, product_id, qty, status, created_at FROM orders_archive ORDER BY id', rows: [] },
        { setup: 'DELETE FROM orders; INSERT INTO orders VALUES (1, 1, 1, 1, \'shipped\', \'2026-09-03 23:59:59\'), (2, 1, 1, 1, \'shipped\', \'2026-09-04\'), (3, 1, 1, 1, \'cancelled\', \'2026-09-04 00:00:00\'), (4, 1, 1, 1, \'cancelled\', \'2026-09-03\');', cols: ['id', 'status'], rows: [[2, 'shipped'], [3, 'cancelled']] },
        { setup: 'DELETE FROM orders; INSERT INTO orders VALUES (1, 1, 1, 1, \'shipped\', \'2026-09-03 23:59:59\'), (2, 1, 1, 1, \'shipped\', \'2026-09-04\'), (3, 1, 1, 1, \'cancelled\', \'2026-09-04 00:00:00\'), (4, 1, 1, 1, \'cancelled\', \'2026-09-03\');', after: 'SELECT id, customer_id, product_id, qty, status, created_at FROM orders_archive ORDER BY id', rows: [[1, 1, 1, 1, 'shipped', '2026-09-03 23:59:59'], [4, 1, 1, 1, 'cancelled', '2026-09-03']] },
        { setup: 'DELETE FROM orders; INSERT INTO orders VALUES (1, 1, 1, 1, \'paid\', \'2026-01-01\'), (2, 1, 1, 1, \'pending\', \'2026-01-01\');', cols: ['id', 'status'], rows: [[1, 'paid'], [2, 'pending']] },
        { setup: 'DELETE FROM orders; INSERT INTO orders VALUES (1, 1, 1, 1, \'paid\', \'2026-01-01\'), (2, 1, 1, 1, \'pending\', \'2026-01-01\');', after: 'SELECT id, customer_id, product_id, qty, status, created_at FROM orders_archive ORDER BY id', rows: [] },
        { setup: 'DELETE FROM orders; INSERT INTO orders VALUES (1, 1, 1, 1, \'shipped\', \'2025-01-01\'), (2, 1, 1, 1, \'cancelled\', \'2025-01-01\'), (3, 1, 1, 1, \'shipped\', \'2025-06-01\');', after: 'SELECT id, status FROM orders ORDER BY id', rows: [] },
        { setup: 'DELETE FROM orders; INSERT INTO orders VALUES (1, 1, 1, 1, \'shipped\', \'2025-01-01\'), (2, 1, 1, 1, \'cancelled\', \'2025-01-01\'), (3, 1, 1, 1, \'shipped\', \'2025-06-01\');', after: 'SELECT id, customer_id, product_id, qty, status, created_at FROM orders_archive ORDER BY id', rows: [[1, 1, 1, 1, 'shipped', '2025-01-01'], [2, 1, 1, 1, 'cancelled', '2025-01-01'], [3, 1, 1, 1, 'shipped', '2025-06-01']] },
        { after: 'SELECT COUNT(*) FROM orders_archive WHERE archived_at IS NULL OR archived_at < \'2020-01-01\'', rows: [[0]] },
        { after: 'SELECT (SELECT COUNT(*) FROM orders) + (SELECT COUNT(*) FROM orders_archive)', rows: [[6]] }
      ] },
    solution: { approach: `<p>Snapshot the ids, copy, delete — all in one transaction.</p>`, code: shop(`CREATE TABLE orders_archive (id INTEGER PRIMARY KEY, customer_id INTEGER, product_id INTEGER, qty INTEGER, status TEXT, created_at TEXT, archived_at TEXT);
BEGIN;
CREATE TEMP TABLE to_move AS
  SELECT id FROM orders WHERE created_at < '2026-09-04' AND status IN ('shipped', 'cancelled');
INSERT INTO orders_archive
  SELECT o.*, CURRENT_TIMESTAMP FROM orders o WHERE o.id IN (SELECT id FROM to_move);
DELETE FROM orders WHERE id IN (SELECT id FROM to_move);
COMMIT;
SELECT id, status FROM orders_archive;
SELECT id, status FROM orders ORDER BY id;`), alt: [pg(`WITH moved AS (
  DELETE FROM orders
  WHERE created_at < '2026-09-04' AND status IN ('shipped', 'cancelled')
  RETURNING *
)
INSERT INTO orders_archive SELECT moved.*, now() FROM moved;`)], complexity: `<p>Linear in moved rows; batch by id ranges for millions of rows.</p>`, followUps: ['Run it in batches of 5,000 with a loop', 'How would partitioning make this instant?'] }
  });

  practice.push({
    title: 'Last-Write-Wins Sync With Versions', level: 'Medium', tags: ['upsert', 'conditional update', 'idempotency'], companies: ['Dropbox', 'Notion'],
    statement: `<p>Devices send inventory snapshots <code>(sku, qty, version)</code> that may arrive late or twice. Apply each snapshot only if its <code>version</code> is newer than the stored one; unknown SKUs are inserted.</p>`,
    constraints: `<p>Out-of-order and duplicate delivery; must be idempotent.</p>`,
    example: `<p>Stored A: qty 10 v3. Incoming A v5 qty 7 → ${H.c('y', 'applied')}; then A v4 qty 9 (late) → ${H.c('m', 'ignored')}; B v1 → ${H.c('g', 'inserted')}.</p>`,
    brute: { why: `<p><code>INSERT OR REPLACE</code> (or an unconditional DO UPDATE) applies whatever arrives last on the wire: the late v4 overwrites v5 and the device shows stale stock forever.</p>`, code: lab(`CREATE TABLE inventory (sku TEXT PRIMARY KEY, qty INTEGER NOT NULL, version INTEGER NOT NULL);
INSERT INTO inventory VALUES ('A', 10, 3);
INSERT OR REPLACE INTO inventory VALUES ('A', 7, 5);
INSERT OR REPLACE INTO inventory VALUES ('A', 9, 4);   -- late message wins: wrong
SELECT * FROM inventory;`) },
    mcq: { q: 'Where does the "only if newer" rule go?', options: ['A WHERE clause on DO UPDATE', 'In the VALUES list', 'In a CHECK constraint', 'In ON CONFLICT (version)'], answer: 0, explain: 'DO UPDATE … WHERE excluded.version &gt; inventory.version skips stale updates atomically.' },
    hints: [`<p>Hint 1: The decision depends on both the stored and the incoming version — exactly what DO UPDATE … WHERE sees.</p>`, `<p>Hint 2: <code>WHERE excluded.version &gt; inventory.version</code>.</p>`, `<p>Hint 3: Duplicates (same version) are skipped automatically → idempotent.</p>`],
    tests: { cmp: 'exact', engine: 'sqlite', cases: [
        { cols: ['sku', 'qty', 'version'], rows: [['A', 7, 5], ['B', 4, 1]] },
        { after: 'INSERT INTO inventory (sku, qty, version) VALUES (\'A\', 99, 5) ON CONFLICT (sku) DO UPDATE SET qty = excluded.qty, version = excluded.version WHERE excluded.version > inventory.version; SELECT qty, version FROM inventory WHERE sku = \'A\'', rows: [[7, 5]] },
        { after: 'INSERT INTO inventory (sku, qty, version) VALUES (\'A\', 99, 6) ON CONFLICT (sku) DO UPDATE SET qty = excluded.qty, version = excluded.version WHERE excluded.version > inventory.version; SELECT qty, version FROM inventory WHERE sku = \'A\'', rows: [[99, 6]] },
        { after: 'INSERT INTO inventory (sku, qty, version) VALUES (\'C\', 1, 1) ON CONFLICT (sku) DO UPDATE SET qty = excluded.qty, version = excluded.version WHERE excluded.version > inventory.version; SELECT COUNT(*) FROM inventory', rows: [[3]] },
        { after: 'INSERT INTO inventory VALUES (\'A\', 1, 1)', error: 'UNIQUE' },
        { after: 'INSERT INTO inventory VALUES (\'Z\', NULL, 1)', error: 'NOT NULL' },
        { after: 'INSERT INTO inventory VALUES (\'Z\', 1, NULL)', error: 'NOT NULL' },
        { after: 'SELECT COUNT(*) FROM inventory', rows: [[2]] }
      ] },
    solution: { approach: `<p>Upsert with a version guard on the update branch.</p>`, code: lab(`CREATE TABLE inventory (sku TEXT PRIMARY KEY, qty INTEGER NOT NULL, version INTEGER NOT NULL);
INSERT INTO inventory VALUES ('A', 10, 3);
INSERT INTO inventory (sku, qty, version) VALUES ('A', 7, 5), ('B', 4, 1)
ON CONFLICT (sku) DO UPDATE SET qty = excluded.qty, version = excluded.version
WHERE excluded.version > inventory.version;
INSERT INTO inventory (sku, qty, version) VALUES ('A', 9, 4)
ON CONFLICT (sku) DO UPDATE SET qty = excluded.qty, version = excluded.version
WHERE excluded.version > inventory.version;      -- ignored (older)
SELECT * FROM inventory ORDER BY sku;              -- A: 7 v5, B: 4 v1`), complexity: `<p>One index probe per snapshot.</p>`, followUps: ['Use a hybrid logical clock instead of an integer version', 'Report how many snapshots were ignored'] }
  });

  practice.push({
    title: 'Optimistic Locking: Detect Lost Updates', level: 'Medium', tags: ['update', 'concurrency', 'version'], companies: ['Atlassian', 'Microsoft'],
    statement: `<p>Two editors open document 1 (version 1) at the same time. Editor A saves first; Editor B saves second. B's save must be <b>rejected</b> (so B can merge), not silently overwrite A.</p>`,
    constraints: `<p>No long-held locks while users are editing.</p>`,
    example: `<p>A: <code>… WHERE id = 1 AND version = 1</code> → ${H.c('g', '1 row')} (version becomes 2). B: same condition → ${H.c('r', '0 rows')} → show "document changed, please reload".</p>`,
    brute: { why: `<p>Plain <code>UPDATE docs SET body = ? WHERE id = 1</code>: B overwrites A's text with no warning — the classic lost update. Locking the row with SELECT … FOR UPDATE while a human types holds a lock for minutes.</p>`, code: lab(`CREATE TABLE docs (id INTEGER PRIMARY KEY, body TEXT, version INTEGER NOT NULL);
INSERT INTO docs VALUES (1, 'draft', 1);
UPDATE docs SET body = 'A edits' WHERE id = 1;
UPDATE docs SET body = 'B edits' WHERE id = 1;   -- A's work silently lost
SELECT * FROM docs;`) },
    mcq: { q: 'How does B learn its save failed?', options: ['The UPDATE reports 0 affected rows', 'The database throws a deadlock', 'B reads MAX(version)', 'A trigger emails B'], answer: 0, explain: 'The version guard no longer matches, so 0 rows change; the app checks the affected-row count.' },
    hints: [`<p>Hint 1: Store a version number that every successful write increments.</p>`, `<p>Hint 2: Save with <code>WHERE id = ? AND version = :version_i_read</code> and <code>SET version = version + 1</code>.</p>`, `<p>Hint 3: Check <code>changes()</code> / rowcount: 1 = saved, 0 = conflict.</p>`],
    tests: { cmp: 'exact', engine: 'sqlite', cases: [
        { cols: ['id', 'body', 'version'], rows: [[1, 'A edits', 2]] },
        { after: 'UPDATE docs SET body = \'B edits\', version = version + 1 WHERE id = 1 AND version = 1; SELECT changes()', rows: [[0]] },
        { after: 'UPDATE docs SET body = \'B edits\', version = version + 1 WHERE id = 1 AND version = 1; SELECT body, version FROM docs WHERE id = 1', rows: [['A edits', 2]] },
        { after: 'UPDATE docs SET body = \'B merged\', version = version + 1 WHERE id = 1 AND version = 2; SELECT changes(), (SELECT version FROM docs WHERE id = 1)', rows: [[1, 3]] },
        { after: 'INSERT INTO docs VALUES (2, \'other\', 1); UPDATE docs SET body = \'edit\', version = version + 1 WHERE id = 2 AND version = 1; SELECT version FROM docs WHERE id = 2', rows: [[2]] },
        { after: 'INSERT INTO docs (id, body) VALUES (3, \'no version\')', error: 'NOT NULL' },
        { after: 'SELECT COUNT(*) FROM docs', rows: [[1]] }
      ] },
    solution: { approach: `<p>Compare-and-set via a version column in the WHERE clause.</p>`, code: lab(`CREATE TABLE docs (id INTEGER PRIMARY KEY, body TEXT, version INTEGER NOT NULL);
INSERT INTO docs VALUES (1, 'draft', 1);
-- Editor A (read version 1)
UPDATE docs SET body = 'A edits', version = version + 1 WHERE id = 1 AND version = 1;
SELECT changes() AS a_saved;            -- 1
-- Editor B (also read version 1)
UPDATE docs SET body = 'B edits', version = version + 1 WHERE id = 1 AND version = 1;
SELECT changes() AS b_saved;            -- 0 -> conflict, ask B to reload/merge
SELECT * FROM docs;`), complexity: `<p>O(1) per save; no locks held between read and write.</p>`, followUps: ['Use updated_at instead of version — what can go wrong?', 'How do ORMs (JPA @Version) implement this?'] }
  });

  practice.push({
    title: 'Writable Active-Users View', level: 'Medium', tags: ['view', 'instead of trigger', 'soft delete'], companies: ['Salesforce', 'Zoho'],
    statement: `<p>Legacy code runs plain INSERT, UPDATE and DELETE against <code>active_users</code>. Make the view writable: INSERT adds a live user, UPDATE changes name/email, DELETE becomes a <b>soft delete</b> on <code>users</code>.</p>`,
    constraints: `<p>SQLite (views are read-only without triggers).</p>`,
    example: `<p><code>DELETE FROM active_users WHERE id = 3</code> → users row 3 gets ${H.c('y', 'deleted_at')}; the view no longer shows Chen.</p>`,
    brute: { why: `<p>Rewriting every legacy query to target <code>users</code> with the right filters is a large, risky change. Writing to the view without triggers fails: "cannot modify active_users because it is a view".</p>`, code: shop(`CREATE VIEW active_users AS SELECT id, email, name FROM users WHERE deleted_at IS NULL;
-- DELETE FROM active_users WHERE id = 3;   -- error: cannot modify a view
UPDATE users SET deleted_at = CURRENT_TIMESTAMP WHERE id = 3;   -- every caller must remember this
SELECT * FROM active_users;`) },
    mcq: { q: 'Which trigger type makes a SQLite view writable?', options: ['INSTEAD OF', 'BEFORE', 'AFTER', 'FOR EACH STATEMENT'], answer: 0, explain: 'INSTEAD OF triggers on views replace the impossible write with your own statements.' },
    hints: [`<p>Hint 1: One INSTEAD OF trigger per event: INSERT, UPDATE, DELETE.</p>`, `<p>Hint 2: Inside, write to <code>users</code> using NEW.* (insert/update) and OLD.id (update/delete).</p>`, `<p>Hint 3: DELETE trigger body = <code>UPDATE users SET deleted_at = CURRENT_TIMESTAMP WHERE id = OLD.id</code>.</p>`],
    tests: { cmp: 'exact', engine: 'sqlite', cases: [
        { setup: '', cols: ['id', 'deleted'], rows: [[1, 0], [2, 1], [3, 1], [4, 0]] },
        { setup: '', after: 'SELECT id, email, name FROM active_users ORDER BY id', rows: [[1, 'asha@mail.com', 'Asha R'], [4, 'dev@mail.com', 'Dev']] },
        { setup: 'DELETE FROM users; DELETE FROM users; ', cols: ['id', 'deleted'], rows: [[1, 0]] },
        { setup: 'DELETE FROM users; DELETE FROM users; ', after: 'SELECT id, email, name FROM active_users ORDER BY id', rows: [[1, 'dev@mail.com', 'Asha R']] },
        { setup: 'DELETE FROM users; DELETE FROM users; INSERT INTO users VALUES (1, \'a@x\', \'A\', NULL), (2, \'b@x\', \'B\', \'2026-01-01 00:00:00\'), (3, \'c@x\', \'C\', \'2026-01-01 00:00:00\');', cols: ['id', 'deleted'], rows: [[1, 0], [2, 1], [3, 1], [4, 0]] },
        { setup: 'DELETE FROM users; DELETE FROM users; INSERT INTO users VALUES (1, \'a@x\', \'A\', NULL), (2, \'b@x\', \'B\', \'2026-01-01 00:00:00\'), (3, \'c@x\', \'C\', \'2026-01-01 00:00:00\');', after: 'SELECT id, email, name FROM active_users ORDER BY id', rows: [[1, 'a@x', 'Asha R'], [4, 'dev@mail.com', 'Dev']] },
        { setup: 'DELETE FROM users; DELETE FROM users; INSERT INTO users VALUES (3, \'c@x\', \'C\', NULL), (7, \'d@x\', \'D\', NULL);', cols: ['id', 'deleted'], rows: [[3, 1], [7, 0], [8, 0]] },
        { setup: 'DELETE FROM users; DELETE FROM users; INSERT INTO users VALUES (3, \'c@x\', \'C\', NULL), (7, \'d@x\', \'D\', NULL);', after: 'SELECT id, email, name FROM active_users ORDER BY id', rows: [[7, 'd@x', 'D'], [8, 'dev@mail.com', 'Dev']] },
        { setup: 'UPDATE users SET deleted_at = \'2026-01-01 00:00:00\' WHERE id = 3', after: 'SELECT deleted_at FROM users WHERE id = 3', rows: [['2026-01-01 00:00:00']] },
        { after: 'UPDATE active_users SET name = \'Ghost\' WHERE id = 2; SELECT name FROM users WHERE id = 2', rows: [['Ben']] },
        { after: 'INSERT INTO active_users (email, name) VALUES (\'asha@mail.com\', \'Dup\')', error: 'UNIQUE' },
        { after: 'INSERT INTO active_users (email, name) VALUES (\'ben@mail.com\', \'Ben2\'); SELECT COUNT(*) FROM active_users WHERE email = \'ben@mail.com\'', rows: [[1]] },
        { after: 'SELECT COUNT(*) FROM users', rows: [[4]] },
        { after: 'DELETE FROM active_users; SELECT (SELECT COUNT(*) FROM active_users), (SELECT COUNT(*) FROM users)', rows: [[0, 4]] },
        { after: 'UPDATE active_users SET name = name || \'!\'; SELECT name FROM active_users ORDER BY id', rows: [['Asha R!'], ['Dev!']] }
      ] },
    solution: { approach: `<p>Three INSTEAD OF triggers translating view writes into base-table writes.</p>`, code: shop(`CREATE VIEW active_users AS SELECT id, email, name FROM users WHERE deleted_at IS NULL;
CREATE TRIGGER au_ins INSTEAD OF INSERT ON active_users
BEGIN INSERT INTO users (email, name) VALUES (NEW.email, NEW.name); END;
CREATE TRIGGER au_upd INSTEAD OF UPDATE ON active_users
BEGIN UPDATE users SET email = NEW.email, name = NEW.name WHERE id = OLD.id AND deleted_at IS NULL; END;
CREATE TRIGGER au_del INSTEAD OF DELETE ON active_users
BEGIN UPDATE users SET deleted_at = CURRENT_TIMESTAMP WHERE id = OLD.id; END;

INSERT INTO active_users (email, name) VALUES ('dev@mail.com', 'Dev');
UPDATE active_users SET name = 'Asha R' WHERE id = 1;
DELETE FROM active_users WHERE id = 3;
SELECT * FROM active_users ORDER BY id;
SELECT id, deleted_at IS NOT NULL AS deleted FROM users ORDER BY id;`), complexity: `<p>Each view write = one base write plus trigger overhead.</p>`, followUps: ['Postgres would auto-update this simple view — what about DELETE semantics?', 'Add WITH CHECK OPTION behaviour'] }
  });

  practice.push({
    title: 'Refreshable Sales Summary With Reconciliation', level: 'Medium', tags: ['materialized view', 'summary table', 'transaction'], companies: ['Snowflake', 'Meesho'],
    statement: `<p>Build <code>mv_category_sales(category, units, revenue_cents, refreshed_at)</code> from non-cancelled orders. Write the refresh so readers never see a half-built table, and a reconciliation query that returns rows only if the summary disagrees with live data.</p>`,
    constraints: `<p>SQLite has no CREATE MATERIALIZED VIEW. Refresh runs every 10 minutes.</p>`,
    example: `<p>After refresh, reconciliation returns ${H.c('g', '0 rows')}. After a new order (before the next refresh) it returns the ${H.c('r', 'stale category')}.</p>`,
    brute: { why: `<p>Running the 3-table aggregate on every dashboard load works but repeats the expensive work thousands of times. Refreshing with DELETE then INSERT <i>without</i> a transaction exposes an empty table to readers between the two statements.</p>`, code: shop(`-- Every page load re-aggregates everything:
SELECT p.category, SUM(o.qty) AS units, SUM(o.qty * p.price_cents) AS revenue_cents
FROM orders o JOIN products p ON p.id = o.product_id
WHERE o.status <> 'cancelled'
GROUP BY p.category;`) },
    mcq: { q: 'Which query detects drift between summary and live data?', options: ['(live aggregate EXCEPT summary) UNION ALL (summary EXCEPT live aggregate)', 'SELECT COUNT(*) FROM summary', 'A LEFT JOIN on refreshed_at', 'PRAGMA integrity_check'], answer: 0, explain: 'A symmetric difference via EXCEPT returns any row present on only one side.' },
    hints: [`<p>Hint 1: Summary table + refresh = DELETE + INSERT … SELECT inside BEGIN/COMMIT.</p>`, `<p>Hint 2: Put the aggregate in a normal view (<code>v_category_sales</code>) so refresh and reconciliation share one definition.</p>`, `<p>Hint 3: Reconcile with a symmetric EXCEPT on (category, units, revenue_cents).</p>`],
    tests: { cmp: 'exact', engine: 'sqlite', cases: [
        { setup: '', cols: ['side', 'category', 'units', 'revenue_cents'], rows: [['live_only', 'phones', 2, 99800], ['summary_only', 'phones', 1, 49900]] },
        { setup: 'DELETE FROM orders WHERE id = 1', cols: ['side', 'category', 'units', 'revenue_cents'], rows: [['live_only', 'phones', 1, 49900]] },
        { setup: 'DELETE FROM orders', cols: ['side', 'category', 'units', 'revenue_cents'], rows: [['live_only', 'phones', 1, 49900]] },
        { setup: 'UPDATE products SET price_cents = 100 WHERE id = 1', cols: ['side', 'category', 'units', 'revenue_cents'], rows: [['live_only', 'phones', 2, 200], ['summary_only', 'phones', 1, 100]] },
        { setup: 'UPDATE orders SET status = \'paid\' WHERE id = 5', cols: ['side', 'category', 'units', 'revenue_cents'], rows: [['live_only', 'phones', 2, 99800], ['summary_only', 'phones', 1, 49900]] },
        { setup: 'UPDATE orders SET status = \'cancelled\' WHERE id IN (1, 2, 3, 4, 6)', cols: ['side', 'category', 'units', 'revenue_cents'], rows: [['live_only', 'phones', 1, 49900]] },
        { after: 'SELECT category, units, revenue_cents FROM mv_category_sales ORDER BY category', rows: [['accessories', 3, 2997], ['books', 4, 13596], ['phones', 1, 49900]] },
        { after: 'SELECT COUNT(*) FROM mv_category_sales', rows: [[3]] },
        { after: 'SELECT category, units, revenue_cents FROM v_category_sales ORDER BY category', rows: [['accessories', 3, 2997], ['books', 4, 13596], ['phones', 2, 99800]] },
        { after: 'UPDATE orders SET status = \'cancelled\' WHERE id = 2; SELECT category, units, revenue_cents FROM v_category_sales ORDER BY category', rows: [['accessories', 3, 2997], ['books', 2, 7598], ['phones', 2, 99800]] },
        { after: 'SELECT COUNT(*) FROM mv_category_sales WHERE refreshed_at IS NULL', rows: [[0]] }
      ] },
    solution: { approach: `<p>One view = the definition; a table = the materialization; a transactional refresh; a symmetric-difference check.</p>`, code: shop(`CREATE VIEW v_category_sales AS
SELECT p.category, SUM(o.qty) AS units, SUM(o.qty * p.price_cents) AS revenue_cents
FROM orders o JOIN products p ON p.id = o.product_id
WHERE o.status <> 'cancelled'
GROUP BY p.category;

CREATE TABLE mv_category_sales (category TEXT PRIMARY KEY, units INTEGER, revenue_cents INTEGER, refreshed_at TEXT);

BEGIN;                                   -- refresh job
DELETE FROM mv_category_sales;
INSERT INTO mv_category_sales SELECT category, units, revenue_cents, CURRENT_TIMESTAMP FROM v_category_sales;
COMMIT;

INSERT INTO orders (customer_id, product_id, qty, status) VALUES (3, 1, 1, 'paid');   -- new sale

-- Reconciliation: rows here = summary is stale
SELECT 'live_only' AS side, * FROM (SELECT category, units, revenue_cents FROM v_category_sales
                                     EXCEPT SELECT category, units, revenue_cents FROM mv_category_sales)
UNION ALL
SELECT 'summary_only', * FROM (SELECT category, units, revenue_cents FROM mv_category_sales
                                EXCEPT SELECT category, units, revenue_cents FROM v_category_sales);`), complexity: `<p>Refresh = one full aggregate; reads = tiny table scans.</p>`, followUps: ['Make it incremental with triggers', 'Postgres: REFRESH MATERIALIZED VIEW CONCURRENTLY requirements'] }
  });

  // ---------- Hard ----------
  practice.push({
    title: 'Keep Customer Stats in Sync With Triggers', level: 'Hard', tags: ['triggers', 'incremental', 'denormalization'], companies: ['Amazon', 'Stripe'],
    statement: `<p>Maintain <code>customer_stats(customer_id, orders_count, units)</code> counting only non-cancelled orders, kept exact under INSERT, DELETE and UPDATE of <code>orders</code> (including changes to qty, status and customer_id). Prove it with a reconciliation query.</p>`,
    constraints: `<p>Every write path must be handled; reconciliation must return 0 rows.</p>`,
    example: `<p>Insert an order for Chen (qty 2) → Chen ${H.c('y', '+1 order, +2 units')}. Cancel order 1 → Asha ${H.c('y', '−1 order, −1 unit')}. Move order 3 from Ben to Dara → Ben −1, Dara +1.</p>`,
    brute: { why: `<p>Recomputing the whole stats table after every write is O(N) per write. Handling only INSERT (the most common mistake) drifts as soon as an order is cancelled, edited, deleted or re-assigned.</p>`, code: shop(`CREATE TABLE customer_stats (customer_id INTEGER PRIMARY KEY, orders_count INTEGER, units INTEGER);
-- Full rebuild after EVERY write (correct but O(N) each time):
DELETE FROM customer_stats;
INSERT INTO customer_stats
SELECT customer_id, COUNT(*), SUM(qty) FROM orders WHERE status <> 'cancelled' GROUP BY customer_id;
SELECT * FROM customer_stats;`) },
    mcq: { q: 'An UPDATE can change customer_id, qty and status at once. Simplest correct trigger logic?', options: ['Subtract OLD\'s contribution (if it counted), then add NEW\'s (if it counts)', 'Add NEW.qty - OLD.qty only', 'Ignore UPDATEs', 'Recount the whole table'], answer: 0, explain: 'Remove-old-then-add-new handles every combination of changes uniformly.' },
    hints: [`<p>Hint 1: Think of each order as a "contribution" (1 order, qty units) to one customer, present only when status is not cancelled.</p>`, `<p>Hint 2: INSERT adds NEW's contribution, DELETE removes OLD's, UPDATE does both — guarded by the status condition.</p>`, `<p>Hint 3: Use an upsert to add (the customer may have no stats row yet). Reconcile with a symmetric EXCEPT against a fresh GROUP BY (treat 0-count rows carefully).</p>`],
    tests: { cmp: 'exact', engine: 'sqlite', cases: [
        { setup: '', after: 'SELECT customer_id, orders_count, units FROM customer_stats WHERE orders_count > 0 ORDER BY customer_id', rows: [[1, 1, 2], [2, 1, 1], [3, 1, 2], [4, 1, 3]] },
        { setup: 'DELETE FROM orders; ', after: 'SELECT customer_id, orders_count, units FROM customer_stats WHERE orders_count > 0 ORDER BY customer_id', rows: [] },
        { setup: 'DELETE FROM orders; INSERT INTO orders VALUES (1, 1, 1, 5, \'paid\', \'2026-09-01\'), (2, 1, 1, 5, \'cancelled\', \'2026-09-01\');', after: 'SELECT customer_id, orders_count, units FROM customer_stats WHERE orders_count > 0 ORDER BY customer_id', rows: [[4, 1, 2]] },
        { setup: 'DELETE FROM orders; INSERT INTO orders VALUES (1, 2, 1, 1, \'pending\', \'2026-09-01\'), (3, 2, 1, 7, \'pending\', \'2026-09-01\'), (4, 2, 1, 2, \'shipped\', \'2026-09-01\');', after: 'SELECT customer_id, orders_count, units FROM customer_stats WHERE orders_count > 0 ORDER BY customer_id', rows: [[3, 1, 2], [4, 1, 7]] },
        { setup: 'DELETE FROM orders; INSERT INTO orders VALUES (4, 4, 1, 3, \'paid\', \'2026-09-01\');', after: 'SELECT customer_id, orders_count, units FROM customer_stats WHERE orders_count > 0 ORDER BY customer_id', rows: [[3, 1, 2]] },
        { after: 'UPDATE orders SET qty = qty + 1; SELECT customer_id, orders_count, units FROM customer_stats WHERE orders_count > 0 EXCEPT SELECT customer_id, COUNT(*), SUM(qty) FROM orders WHERE status <> \'cancelled\' GROUP BY customer_id', rows: [] },
        { after: 'UPDATE orders SET qty = qty + 1; SELECT customer_id, COUNT(*), SUM(qty) FROM orders WHERE status <> \'cancelled\' GROUP BY customer_id EXCEPT SELECT customer_id, orders_count, units FROM customer_stats', rows: [] },
        { after: 'UPDATE orders SET status = \'pending\' WHERE status = \'cancelled\'; UPDATE orders SET customer_id = 2 WHERE customer_id = 3; SELECT customer_id, COUNT(*), SUM(qty) FROM orders WHERE status <> \'cancelled\' GROUP BY customer_id EXCEPT SELECT customer_id, orders_count, units FROM customer_stats', rows: [] },
        { after: 'DELETE FROM orders WHERE status = \'paid\'; INSERT INTO orders (customer_id, product_id, qty, status) VALUES (1, 1, 4, \'paid\'), (2, 2, 1, \'cancelled\'), (4, 1, 2, \'pending\'); SELECT customer_id, orders_count, units FROM customer_stats WHERE orders_count > 0 EXCEPT SELECT customer_id, COUNT(*), SUM(qty) FROM orders WHERE status <> \'cancelled\' GROUP BY customer_id', rows: [] },
        { after: 'DELETE FROM orders; SELECT COUNT(*) FROM customer_stats WHERE orders_count <> 0 OR units <> 0', rows: [[0]] },
        { after: 'UPDATE orders SET status = \'cancelled\'; SELECT COUNT(*) FROM customer_stats WHERE orders_count < 0 OR units < 0 OR orders_count > 0', rows: [[0]] }
      ] },
    solution: { approach: `<p>Seed the table, then three triggers implementing "remove old contribution / add new contribution", and a reconciliation query.</p>`, code: shop(`CREATE TABLE customer_stats (customer_id INTEGER PRIMARY KEY, orders_count INTEGER NOT NULL, units INTEGER NOT NULL);
INSERT INTO customer_stats
SELECT customer_id, COUNT(*), SUM(qty) FROM orders WHERE status <> 'cancelled' GROUP BY customer_id;

CREATE TRIGGER cs_ins AFTER INSERT ON orders WHEN NEW.status <> 'cancelled'
BEGIN
  INSERT INTO customer_stats VALUES (NEW.customer_id, 1, NEW.qty)
  ON CONFLICT (customer_id) DO UPDATE SET orders_count = orders_count + 1, units = units + excluded.units;
END;
CREATE TRIGGER cs_del AFTER DELETE ON orders WHEN OLD.status <> 'cancelled'
BEGIN
  UPDATE customer_stats SET orders_count = orders_count - 1, units = units - OLD.qty
  WHERE customer_id = OLD.customer_id;
END;
CREATE TRIGGER cs_upd AFTER UPDATE OF customer_id, qty, status ON orders
BEGIN
  UPDATE customer_stats SET orders_count = orders_count - 1, units = units - OLD.qty
  WHERE customer_id = OLD.customer_id AND OLD.status <> 'cancelled';
  INSERT INTO customer_stats (customer_id, orders_count, units)
  SELECT NEW.customer_id, 1, NEW.qty WHERE NEW.status <> 'cancelled'
  ON CONFLICT (customer_id) DO UPDATE SET orders_count = orders_count + 1, units = units + excluded.units;
END;

INSERT INTO orders (customer_id, product_id, qty, status) VALUES (3, 3, 2, 'paid');
UPDATE orders SET status = 'cancelled' WHERE id = 1;
UPDATE orders SET customer_id = 4 WHERE id = 3;
DELETE FROM orders WHERE id = 4;

-- Reconciliation (ignoring customers whose count dropped to 0): expect no rows.
SELECT customer_id, orders_count, units FROM customer_stats WHERE orders_count > 0
EXCEPT
SELECT customer_id, COUNT(*), SUM(qty) FROM orders WHERE status <> 'cancelled' GROUP BY customer_id;
SELECT * FROM customer_stats ORDER BY customer_id;`), complexity: `<p>O(1) extra work per changed order (1–2 index probes) instead of O(N) rebuilds.</p>`, followUps: ['Hot-row contention for a celebrity customer — how to shard the counter?', 'Delete stats rows that drop to zero'] }
  });

  practice.push({
    title: 'Point-in-Time Price From the Audit Log', level: 'Hard', tags: ['triggers', 'audit', 'json', 'window'], companies: ['Bloomberg', 'Razorpay'],
    statement: `<p>Audit every price change on <code>products</code> using the row's own <code>updated_at</code> as the change time. Then answer: <b>what was product 2's price on 2026-10-05?</b> and list its full price history with the change amount.</p>`,
    constraints: `<p>The answer must also work for dates before the first change (use the first audit row's old value) and when no change exists (current price). A date means 00:00 at the start of that day, so a change made later on the same day does not count yet.</p>`,
    example: `${H.table(['changed_at', 'old', 'new'], [['2026-10-02', '999', '899'], ['2026-10-07', '899', '1099']])}<p>On 2026-10-05 the price was ${H.c('g', '899')}; on 2026-10-01 it was 999 (old value of the first change).</p>`,
    brute: { why: `<p>Without an audit trail the only option is restoring old backups. Storing "price history" from the app is skipped by manual fixes. And querying the audit table naively (latest row before the date) returns nothing for dates before the first change.</p>`, code: shop(`-- Only the current value exists: history is gone.
UPDATE products SET price_cents = 899 WHERE id = 2;
UPDATE products SET price_cents = 1099 WHERE id = 2;
SELECT price_cents FROM products WHERE id = 2;   -- 1099; what was it on 10-05? unknown`) },
    mcq: { q: 'Price at time T = ?', options: ['new value of the last change at or before T; if none, old value of the first change; if no changes, current price', 'average of all values', 'the latest new value overall', 'old value of the last change'], answer: 0, explain: 'That three-step COALESCE covers after-changes, before-first-change and never-changed cases.' },
    hints: [`<p>Hint 1: AFTER UPDATE trigger with WHEN price changed; store old/new as JSON and changed_at = NEW.updated_at.</p>`, `<p>Hint 2: Extract with <code>json_extract(new_data, '$.price_cents')</code>; pick the latest row with changed_at ≤ T.</p>`, `<p>Hint 3: Wrap three scalar subqueries in COALESCE. For history, LAG/arithmetic on the JSON values ordered by changed_at.</p>`],
    tests: { cmp: 'exact', engine: 'sqlite', cases: [
        { cols: ['changed_at', 'old_price', 'new_price', 'delta'], rows: [['2026-10-02 09:00:00', 999, 899, -100], ['2026-10-07 09:00:00', 899, 1099, 200]] },
        { setup: 'UPDATE products SET price_cents = 500 WHERE id = 2', cols: ['changed_at', 'old_price', 'new_price', 'delta'], rows: [['2026-10-02 09:00:00', 500, 899, 399], ['2026-10-07 09:00:00', 899, 1099, 200]] },
        { setup: 'UPDATE products SET price_cents = 899 WHERE id = 2', cols: ['changed_at', 'old_price', 'new_price', 'delta'], rows: [['2026-10-07 09:00:00', 899, 1099, 200]] },
        { setup: 'UPDATE products SET price_cents = 1099 WHERE id = 2', cols: ['changed_at', 'old_price', 'new_price', 'delta'], rows: [['2026-10-02 09:00:00', 1099, 899, -200], ['2026-10-07 09:00:00', 899, 1099, 200]] },
        { setup: 'UPDATE products SET price_cents = 1 WHERE id = 2', cols: ['changed_at', 'old_price', 'new_price', 'delta'], rows: [['2026-10-02 09:00:00', 1, 899, 898], ['2026-10-07 09:00:00', 899, 1099, 200]] },
        { after: 'SELECT row_id FROM audit_log WHERE table_name = \'products\' ORDER BY id', rows: [[2], [2]] },
        { after: 'UPDATE products SET stock = stock + 1; SELECT COUNT(*) FROM audit_log', rows: [[2]] },
        { after: 'UPDATE products SET price_cents = price_cents; SELECT COUNT(*) FROM audit_log', rows: [[2]] },
        { after: 'UPDATE products SET price_cents = price_cents + 1, updated_at = \'2026-11-01 00:00:00\'; SELECT COUNT(*) FROM audit_log', rows: [[7]] },
        { after: 'UPDATE products SET price_cents = 555, updated_at = \'2026-11-01 00:00:00\' WHERE id = 1; SELECT changed_at, old_data, new_data FROM audit_log WHERE row_id = 1', rows: [['2026-11-01 00:00:00', '{"price_cents":49900}', '{"price_cents":555}']] },
        { result: 0, rows: [[899]] },
        { setup: 'UPDATE products SET price_cents = 899 WHERE id = 2', result: 0, rows: [[899]] },
        { setup: 'UPDATE products SET price_cents = 1099 WHERE id = 2', result: 0, rows: [[899]] }
      ] },
    solution: { approach: `<p>Audit trigger feeding a time-ordered log; point-in-time lookup via COALESCE of three subqueries; history via ordering.</p>`, code: shop(`CREATE TRIGGER products_price_audit AFTER UPDATE OF price_cents ON products
WHEN OLD.price_cents IS NOT NEW.price_cents
BEGIN
  INSERT INTO audit_log (table_name, row_id, action, old_data, new_data, changed_at)
  VALUES ('products', NEW.id, 'UPDATE',
          json_object('price_cents', OLD.price_cents),
          json_object('price_cents', NEW.price_cents), NEW.updated_at);
END;
UPDATE products SET price_cents = 899,  updated_at = '2026-10-02 09:00:00' WHERE id = 2;
UPDATE products SET price_cents = 1099, updated_at = '2026-10-07 09:00:00' WHERE id = 2;

-- Price of product 2 as of 2026-10-05
SELECT COALESCE(
  (SELECT json_extract(new_data, '$.price_cents') FROM audit_log
   WHERE table_name = 'products' AND row_id = 2 AND changed_at <= '2026-10-05'
   ORDER BY changed_at DESC, id DESC LIMIT 1),
  (SELECT json_extract(old_data, '$.price_cents') FROM audit_log
   WHERE table_name = 'products' AND row_id = 2 ORDER BY changed_at, id LIMIT 1),
  (SELECT price_cents FROM products WHERE id = 2)) AS price_on_2026_10_05;

-- Full history with the size of each change
SELECT changed_at,
       json_extract(old_data, '$.price_cents') AS old_price,
       json_extract(new_data, '$.price_cents') AS new_price,
       json_extract(new_data, '$.price_cents') - json_extract(old_data, '$.price_cents') AS delta
FROM audit_log WHERE table_name = 'products' AND row_id = 2
ORDER BY changed_at;`), complexity: `<p>Index audit_log(table_name, row_id, changed_at) → O(log N) point lookups.</p>`, followUps: ['Rebuild the whole products table as of a date', 'Compare with SQL:2011 system-versioned tables'] }
  });

  practice.push({
    title: 'Idempotent Money Transfer Without Stored Procedures', level: 'Hard', tags: ['transaction', 'trigger', 'idempotency', 'upsert'], companies: ['PayPal', 'PhonePe', 'Revolut'],
    statement: `<p>Implement transfers in SQLite (no procedures): a request <code>(request_id, from_id, to_id, amount)</code> must move money atomically, refuse overdrafts, and be <b>idempotent</b> — the client may retry the same request_id after a timeout, and money must move only once.</p>`,
    constraints: `<p>Balances can never go negative. Retries are common.</p>`,
    example: `<p>Request r1: Asha → Ben 300 ${H.c('g', 'applied')}; retry r1 ${H.c('m', 'no-op')}; r2: Chen → Asha 50 ${H.c('r', 'refused (balance 0)')}. Final: Asha 700, Ben 550, Chen 0.</p>`,
    brute: { why: `<p>Two autocommit UPDATEs from the app: a crash between them destroys money; a retry after a timeout runs the transfer twice; a concurrent transfer can overdraw because the balance was checked in app code.</p>`, code: shop(`UPDATE accounts SET balance = balance - 300 WHERE id = 1;
UPDATE accounts SET balance = balance + 300 WHERE id = 2;
-- client times out and retries...
UPDATE accounts SET balance = balance - 300 WHERE id = 1;
UPDATE accounts SET balance = balance + 300 WHERE id = 2;   -- moved twice!
SELECT * FROM accounts;`) },
    mcq: { q: 'What makes a retried request harmless?', options: ['A UNIQUE request_id with INSERT … ON CONFLICT DO NOTHING; work happens only when a row is really inserted', 'Retrying faster', 'Checking balance twice', 'INSERT OR REPLACE on transfers'], answer: 0, explain: 'The unique key turns the retry into a no-op; the AFTER INSERT trigger does not fire for DO NOTHING.' },
    hints: [`<p>Hint 1: Model the request as a row in <code>transfers</code> with <code>request_id UNIQUE</code>.</p>`, `<p>Hint 2: An AFTER INSERT trigger checks funds with RAISE(ABORT) and performs both UPDATEs — same transaction as the INSERT.</p>`, `<p>Hint 3: Insert with <code>ON CONFLICT (request_id) DO NOTHING</code>; a duplicate inserts nothing, so the trigger never fires. CHECK (balance &gt;= 0) is the last line of defence.</p>`],
    tests: { cmp: 'exact', engine: 'sqlite', cases: [
        { cols: ['id', 'request_id', 'from_id', 'to_id', 'amount'], rows: [[1, 'r1', 1, 2, 300]] },
        { after: 'SELECT id, balance FROM accounts ORDER BY id', rows: [[1, 700], [2, 550], [3, 0]] },
        { after: 'INSERT INTO transfers (request_id, from_id, to_id, amount) VALUES (\'r2\', 3, 1, 50)', error: 'insufficient funds' },
        { after: 'INSERT INTO transfers (request_id, from_id, to_id, amount) VALUES (\'r1\', 1, 2, 300) ON CONFLICT (request_id) DO NOTHING; SELECT id, balance FROM accounts ORDER BY id', rows: [[1, 700], [2, 550], [3, 0]] },
        { after: 'INSERT INTO transfers (request_id, from_id, to_id, amount) VALUES (\'r3\', 1, 3, 700); SELECT id, balance FROM accounts ORDER BY id', rows: [[1, 0], [2, 550], [3, 700]] },
        { after: 'INSERT INTO transfers (request_id, from_id, to_id, amount) VALUES (\'r3\', 1, 3, 701)', error: 'insufficient funds' },
        { after: 'INSERT INTO transfers (request_id, from_id, to_id, amount) VALUES (\'r3\', 1, 3, 0)', error: 'CHECK' },
        { after: 'INSERT INTO transfers (request_id, from_id, to_id, amount) VALUES (\'r3\', 1, 1, 5)', error: 'CHECK' },
        { after: 'INSERT INTO transfers (request_id, from_id, to_id, amount) VALUES (\'r3\', 1, 99, 5)', error: 'FOREIGN KEY' },
        { after: 'INSERT INTO transfers (request_id, from_id, to_id, amount) VALUES (\'r3\', 99, 1, 5)', error: 'FOREIGN KEY' },
        { after: 'INSERT INTO transfers (request_id, from_id, to_id, amount) VALUES (\'r4\', 2, 3, 100), (\'r5\', 3, 1, 100); SELECT id, balance FROM accounts ORDER BY id', rows: [[1, 800], [2, 450], [3, 0]] },
        { after: 'SELECT SUM(balance) FROM accounts', rows: [[1250]] },
        { setup: 'UPDATE accounts SET balance = 300 WHERE id = 1', after: 'SELECT id, balance FROM accounts ORDER BY id', rows: [[1, 0], [2, 550], [3, 0]] },
        { setup: 'UPDATE accounts SET balance = 299 WHERE id = 1', error: 'insufficient funds' },
        { setup: 'UPDATE accounts SET balance = 0 WHERE id = 1', error: 'insufficient funds' },
        { setup: 'UPDATE accounts SET balance = 1000000 WHERE id = 1', after: 'SELECT id, balance FROM accounts ORDER BY id', rows: [[1, 999700], [2, 550], [3, 0]] }
      ] },
    solution: { approach: `<p>Request table with a unique idempotency key + trigger-as-procedure. The INSERT, the guard and both balance updates commit or fail together.</p>`, code: shop(`CREATE TABLE transfers (
  id INTEGER PRIMARY KEY, request_id TEXT NOT NULL UNIQUE,
  from_id INTEGER NOT NULL REFERENCES accounts(id), to_id INTEGER NOT NULL REFERENCES accounts(id),
  amount INTEGER NOT NULL CHECK (amount > 0), CHECK (from_id <> to_id)
);
CREATE TRIGGER transfers_apply AFTER INSERT ON transfers
BEGIN
  SELECT RAISE(ABORT, 'insufficient funds')
  WHERE (SELECT balance FROM accounts WHERE id = NEW.from_id) < NEW.amount;
  UPDATE accounts SET balance = balance - NEW.amount WHERE id = NEW.from_id;
  UPDATE accounts SET balance = balance + NEW.amount WHERE id = NEW.to_id;
END;

INSERT INTO transfers (request_id, from_id, to_id, amount) VALUES ('r1', 1, 2, 300)
ON CONFLICT (request_id) DO NOTHING;
INSERT INTO transfers (request_id, from_id, to_id, amount) VALUES ('r1', 1, 2, 300)
ON CONFLICT (request_id) DO NOTHING;                    -- retry: no-op
-- INSERT INTO transfers (request_id, from_id, to_id, amount) VALUES ('r2', 3, 1, 50);  -- would ABORT
SELECT * FROM accounts;          -- Asha 700, Ben 550, Chen 0
SELECT * FROM transfers;`), alt: [pg(`CREATE PROCEDURE transfer(p_req text, p_from int, p_to int, p_amount int)
LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO transfers (request_id, from_id, to_id, amount)
  VALUES (p_req, p_from, p_to, p_amount) ON CONFLICT (request_id) DO NOTHING;
  IF NOT FOUND THEN RETURN; END IF;                         -- duplicate request
  UPDATE accounts SET balance = balance - p_amount WHERE id = p_from AND balance >= p_amount;
  IF NOT FOUND THEN RAISE EXCEPTION 'insufficient funds'; END IF;
  UPDATE accounts SET balance = balance + p_amount WHERE id = p_to;
END $$;`)], complexity: `<p>O(log N) per request: one unique-index probe plus two PK updates.</p>`, followUps: ['Use a double-entry ledger table instead of mutating balances', 'Avoid deadlocks when two transfers go in opposite directions (lock in id order)'] }
  });

  practice.push({
    title: 'Slowly Changing Dimension Type 2 Upsert', level: 'Hard', tags: ['scd2', 'update', 'insert select', 'partial index', 'warehouse'], companies: ['Databricks', 'Airbnb', 'Netflix'],
    statement: `<p>A warehouse keeps customer city history in <code>customer_dim(sk, customer_id, city, valid_from, valid_to, is_current)</code>. Given today's snapshot in <code>staging(customer_id, city)</code>: close the current row of customers whose city changed, insert a new current row for them, insert brand-new customers, and leave unchanged customers alone.</p>`,
    constraints: `<p>At most one current row per customer (enforce it). Atomic. Re-running the same snapshot changes nothing.</p>`,
    example: `${H.table(['customer', 'current city', 'staging', 'action'], [['1', 'Bengaluru', 'Bengaluru', 'none'], ['2', 'London', 'Paris', H.c('y', 'close London row') + ' + ' + H.c('g', 'insert Paris')], ['3', 'Shanghai', '(absent)', 'none'], ['4', '—', 'Austin', H.c('g', 'insert')]])}`,
    brute: { why: `<p>A plain upsert (<code>ON CONFLICT (customer_id) DO UPDATE SET city = …</code>) is SCD type 1: it overwrites London with Paris and history is lost — sales reports for last year now show Paris. Doing it row by row in a cursor loop is slow and not atomic.</p>`, code: lab(`CREATE TABLE customer_dim1 (customer_id INTEGER PRIMARY KEY, city TEXT);
INSERT INTO customer_dim1 VALUES (1, 'Bengaluru'), (2, 'London');
INSERT INTO customer_dim1 VALUES (2, 'Paris')
ON CONFLICT (customer_id) DO UPDATE SET city = excluded.city;   -- London is gone forever
SELECT * FROM customer_dim1;`) },
    mcq: { q: 'Why run the UPDATE (close) before the INSERT (open)?', options: ['So the INSERT can use "no current row exists" to find changed and new customers, and the partial unique index is never violated', 'INSERT is slower', 'SQLite requires it', 'It does not matter'], answer: 0, explain: 'After closing changed rows, every customer needing a new version has no current row — one NOT EXISTS covers changed and brand-new customers.' },
    hints: [`<p>Hint 1: Enforce one current row per customer with <code>CREATE UNIQUE INDEX … (customer_id) WHERE is_current = 1</code>.</p>`, `<p>Hint 2: Step 1 UPDATE: close current rows where staging has a different city (<code>IS NOT</code> for NULL safety).</p>`, `<p>Hint 3: Step 2 INSERT … SELECT from staging WHERE NOT EXISTS a current row for that customer. Wrap both in one transaction; a second run finds nothing to do.</p>`],
    tests: { cmp: 'exact', engine: 'sqlite', cases: [
        { cols: ['sk', 'customer_id', 'city', 'valid_from', 'valid_to', 'is_current'], rows: [[1, 1, 'Bengaluru', '2026-01-01', null, 1], [2, 2, 'London', '2026-01-01', '2026-10-14', 0], [4, 2, 'Paris', '2026-10-14', null, 1], [3, 3, 'Shanghai', '2026-01-01', null, 1], [5, 4, 'Austin', '2026-10-14', null, 1]] },
        { after: 'BEGIN; UPDATE customer_dim SET valid_to = \'2026-10-14\', is_current = 0 WHERE is_current = 1 AND EXISTS (SELECT 1 FROM staging s WHERE s.customer_id = customer_dim.customer_id AND s.city IS NOT customer_dim.city); INSERT INTO customer_dim (customer_id, city, valid_from) SELECT s.customer_id, s.city, \'2026-10-14\' FROM staging s WHERE NOT EXISTS (SELECT 1 FROM customer_dim d WHERE d.customer_id = s.customer_id AND d.is_current = 1); COMMIT; SELECT sk, customer_id, city, valid_from, valid_to, is_current FROM customer_dim ORDER BY customer_id, sk', rows: [[1, 1, 'Bengaluru', '2026-01-01', null, 1], [2, 2, 'London', '2026-01-01', '2026-10-14', 0], [4, 2, 'Paris', '2026-10-14', null, 1], [3, 3, 'Shanghai', '2026-01-01', null, 1], [5, 4, 'Austin', '2026-10-14', null, 1]] },
        { after: 'BEGIN; UPDATE customer_dim SET valid_to = \'2026-10-14\', is_current = 0 WHERE is_current = 1 AND EXISTS (SELECT 1 FROM staging s WHERE s.customer_id = customer_dim.customer_id AND s.city IS NOT customer_dim.city); INSERT INTO customer_dim (customer_id, city, valid_from) SELECT s.customer_id, s.city, \'2026-10-14\' FROM staging s WHERE NOT EXISTS (SELECT 1 FROM customer_dim d WHERE d.customer_id = s.customer_id AND d.is_current = 1); COMMIT; BEGIN; UPDATE customer_dim SET valid_to = \'2026-10-14\', is_current = 0 WHERE is_current = 1 AND EXISTS (SELECT 1 FROM staging s WHERE s.customer_id = customer_dim.customer_id AND s.city IS NOT customer_dim.city); INSERT INTO customer_dim (customer_id, city, valid_from) SELECT s.customer_id, s.city, \'2026-10-14\' FROM staging s WHERE NOT EXISTS (SELECT 1 FROM customer_dim d WHERE d.customer_id = s.customer_id AND d.is_current = 1); COMMIT; SELECT COUNT(*) FROM customer_dim', rows: [[5]] },
        { after: 'DELETE FROM staging; INSERT INTO staging VALUES (1,\'Mysore\'),(3,\'Shanghai\'),(4,\'Austin\'); BEGIN; UPDATE customer_dim SET valid_to = \'2026-10-14\', is_current = 0 WHERE is_current = 1 AND EXISTS (SELECT 1 FROM staging s WHERE s.customer_id = customer_dim.customer_id AND s.city IS NOT customer_dim.city); INSERT INTO customer_dim (customer_id, city, valid_from) SELECT s.customer_id, s.city, \'2026-10-14\' FROM staging s WHERE NOT EXISTS (SELECT 1 FROM customer_dim d WHERE d.customer_id = s.customer_id AND d.is_current = 1); COMMIT; SELECT sk, customer_id, city, valid_from, valid_to, is_current FROM customer_dim ORDER BY customer_id, sk', rows: [[1, 1, 'Bengaluru', '2026-01-01', '2026-10-14', 0], [6, 1, 'Mysore', '2026-10-14', null, 1], [2, 2, 'London', '2026-01-01', '2026-10-14', 0], [4, 2, 'Paris', '2026-10-14', null, 1], [3, 3, 'Shanghai', '2026-01-01', null, 1], [5, 4, 'Austin', '2026-10-14', null, 1]] },
        { after: 'DELETE FROM staging; BEGIN; UPDATE customer_dim SET valid_to = \'2026-10-14\', is_current = 0 WHERE is_current = 1 AND EXISTS (SELECT 1 FROM staging s WHERE s.customer_id = customer_dim.customer_id AND s.city IS NOT customer_dim.city); INSERT INTO customer_dim (customer_id, city, valid_from) SELECT s.customer_id, s.city, \'2026-10-14\' FROM staging s WHERE NOT EXISTS (SELECT 1 FROM customer_dim d WHERE d.customer_id = s.customer_id AND d.is_current = 1); COMMIT; SELECT COUNT(*) FROM customer_dim WHERE is_current = 1', rows: [[4]] },
        { after: 'SELECT COUNT(*) FROM customer_dim WHERE is_current = 1', rows: [[4]] },
        { after: 'SELECT customer_id, COUNT(*) FROM customer_dim WHERE is_current = 1 GROUP BY customer_id HAVING COUNT(*) > 1', rows: [] },
        { after: 'INSERT INTO customer_dim (customer_id, city, valid_from) VALUES (1, \'X\', \'2026-10-15\')', error: 'UNIQUE' },
        { after: 'INSERT INTO customer_dim (customer_id, city, valid_from, valid_to, is_current) VALUES (1, \'Old\', \'2025-01-01\', \'2025-12-31\', 0); SELECT COUNT(*) FROM customer_dim WHERE customer_id = 1', rows: [[2]] },
        { after: 'SELECT customer_id, city FROM customer_dim WHERE is_current = 1 ORDER BY customer_id', rows: [[1, 'Bengaluru'], [2, 'Paris'], [3, 'Shanghai'], [4, 'Austin']] }
      ] },
    solution: { approach: `<p>Close-then-open in one transaction, guarded by a partial unique index.</p>`, code: lab(`CREATE TABLE customer_dim (
  sk INTEGER PRIMARY KEY, customer_id INTEGER NOT NULL, city TEXT NOT NULL,
  valid_from TEXT NOT NULL, valid_to TEXT, is_current INTEGER NOT NULL DEFAULT 1
);
CREATE UNIQUE INDEX ux_dim_current ON customer_dim(customer_id) WHERE is_current = 1;
INSERT INTO customer_dim (customer_id, city, valid_from) VALUES
  (1, 'Bengaluru', '2026-01-01'), (2, 'London', '2026-01-01'), (3, 'Shanghai', '2026-01-01');
CREATE TABLE staging (customer_id INTEGER PRIMARY KEY, city TEXT NOT NULL);
INSERT INTO staging VALUES (1, 'Bengaluru'), (2, 'Paris'), (4, 'Austin');

BEGIN;
UPDATE customer_dim
SET valid_to = '2026-10-14', is_current = 0
WHERE is_current = 1
  AND EXISTS (SELECT 1 FROM staging s
              WHERE s.customer_id = customer_dim.customer_id AND s.city IS NOT customer_dim.city);
INSERT INTO customer_dim (customer_id, city, valid_from)
SELECT s.customer_id, s.city, '2026-10-14'
FROM staging s
WHERE NOT EXISTS (SELECT 1 FROM customer_dim d WHERE d.customer_id = s.customer_id AND d.is_current = 1);
COMMIT;

SELECT * FROM customer_dim ORDER BY customer_id, sk;`), alt: [pg(`-- Postgres 15+: MERGE handles the close; a second INSERT opens new versions
MERGE INTO customer_dim d
USING staging s ON d.customer_id = s.customer_id AND d.is_current
WHEN MATCHED AND d.city IS DISTINCT FROM s.city THEN
  UPDATE SET valid_to = current_date, is_current = false;
INSERT INTO customer_dim (customer_id, city, valid_from)
SELECT s.customer_id, s.city, current_date FROM staging s
WHERE NOT EXISTS (SELECT 1 FROM customer_dim d WHERE d.customer_id = s.customer_id AND d.is_current);`)], complexity: `<p>Two passes over staging with index probes on (customer_id, is_current): O(S log N).</p>`, followUps: ['Handle deletes (customer missing from snapshot) by closing the row', 'Track several attributes with a hash of the tracked columns'] }
  });

  /* ======================= QUIZ ======================= */
  quiz.push(
    { q: 'A multi-row INSERT of 500 rows has one row that violates a UNIQUE constraint. With a plain INSERT, how many rows are stored?', options: ['0', '499', '500', 'Depends on row order'], answer: 0, explain: 'Statement-level atomicity: a failing statement is undone completely.' },
    { q: 'In <code>UPDATE t SET a = b, b = a</code> (SQLite/Postgres), what happens?', options: ['a and b are swapped', 'both become b', 'both become a', 'syntax error'], answer: 0, explain: 'Every SET expression reads the old row values. (MySQL evaluates left to right and differs.)' },
    { q: 'What does <code>excluded.price</code> refer to in an upsert?', options: ['The price in the row you tried to insert', 'The price currently stored', 'The price of a deleted row', 'A default value'], answer: 0, explain: '<code>excluded</code> is the proposed row that hit the conflict.' },
    { q: 'Why is <code>INSERT OR REPLACE</code> dangerous as an "upsert"?', options: ['It deletes the old row and inserts a new one, resetting unspecified columns and possibly firing cascades', 'It is slower than SELECT', 'It cannot insert new rows', 'It only works on views'], answer: 0, explain: 'REPLACE = DELETE + INSERT: new rowid, lost columns, ON DELETE CASCADE children can vanish.' },
    { q: '<code>ON CONFLICT (name) DO NOTHING</code> fails with "does not match any PRIMARY KEY or UNIQUE constraint". Fix?', options: ['Add a UNIQUE index on name', 'Use DO UPDATE instead', 'Add WHERE true', 'Wrap in a transaction'], answer: 0, explain: 'The conflict target must correspond to a unique index; it is the referee for the upsert.' },
    { q: 'Users can delete accounts and later sign up again with the same email. Which constraint fits a soft-delete table?', options: ['CREATE UNIQUE INDEX … ON users(email) WHERE deleted_at IS NULL', 'UNIQUE(email)', 'UNIQUE(email, deleted_at)', 'CHECK (deleted_at IS NULL)'], answer: 0, explain: 'A partial unique index only covers live rows. UNIQUE(email, deleted_at) allows duplicate live rows because NULLs never collide.' },
    { q: 'What does a regular (non-materialized) view store?', options: ['Only the query definition', 'A copy of the result rows', 'An index on the base table', 'A snapshot from creation time'], answer: 0, explain: 'Views are inlined into queries at read time, so they are always current.' },
    { q: 'Which statement about materialized views is TRUE?', options: ['They store results and can be stale until refreshed', 'They are always perfectly fresh', 'SQLite supports CREATE MATERIALIZED VIEW', 'They cannot be indexed'], answer: 0, explain: 'MVs trade freshness for read speed; SQLite and MySQL need summary tables instead.' },
    { q: 'In SQLite, how do you make an INSERT into a view work?', options: ['Create an INSTEAD OF INSERT trigger on the view', 'Use WITH CHECK OPTION', 'Use INSERT OR REPLACE', 'It works automatically for simple views'], answer: 0, explain: 'SQLite views are read-only; INSTEAD OF triggers define what the write should do.' },
    { q: 'Inside an AFTER DELETE trigger, which row image is available?', options: ['OLD only', 'NEW only', 'Both OLD and NEW', 'Neither'], answer: 0, explain: 'INSERT has NEW, DELETE has OLD, UPDATE has both.' },
    { q: 'Why should a trigger never call an external HTTP API or send an email?', options: ['The transaction can roll back, but the external side effect cannot be undone', 'Triggers cannot contain strings', 'It is not allowed in SQL', 'It makes the trigger recursive'], answer: 0, explain: 'Write to an outbox table inside the transaction and let a worker deliver after commit.' },
    { q: 'Main benefit of a stored procedure for a 5-statement transfer in a client/server database?', options: ['One network round trip and shorter lock hold time', 'It disables constraints', 'It avoids transactions', 'It makes the database schema-less'], answer: 0, explain: 'All statements run next to the data; locks are held only for local work, not network latency.' },
    { q: '<code>DELETE FROM a WHERE id NOT IN (SELECT id FROM b)</code> deletes nothing although many ids are missing from b. Most likely cause?', options: ['b.id contains a NULL', 'a has an index', 'NOT IN is unsupported', 'a is empty'], answer: 0, explain: 'x NOT IN (…, NULL) is UNKNOWN, never TRUE. Use NOT EXISTS.' }
  );

  /* ======================= INTERVIEW Q&A ======================= */
  interview.push(
    { q: 'What is the difference between DELETE, TRUNCATE and DROP?', level: 'B', a: `<p><b>DELETE</b> is DML: removes the rows matched by WHERE (or all rows), one by one, fully logged, fires row triggers, can be rolled back, keeps the table. <b>TRUNCATE</b> (Postgres/MySQL/SQL Server) empties the whole table by deallocating its storage — much faster, minimal logging, usually no row triggers, resets identity in many engines; transactional in Postgres, implicit commit in MySQL. <b>DROP TABLE</b> is DDL: removes the table definition, data, indexes and triggers. SQLite has no TRUNCATE; a WHERE-less DELETE is optimized into a fast truncate.</p>`, followUps: ['Can TRUNCATE be used when foreign keys reference the table?', 'How would you delete 100M old rows without locking the table?'] },
    { q: 'What is an UPSERT and how do you write it in Postgres, MySQL and SQLite?', level: 'I', a: `<p>Insert a row, or update the existing one if a unique key already exists — atomically. Postgres and SQLite: <code>INSERT … ON CONFLICT (key) DO UPDATE SET col = excluded.col</code> (or <code>DO NOTHING</code>), optionally with a WHERE on the update. MySQL: <code>INSERT … ON DUPLICATE KEY UPDATE col = new.col</code> (row alias in 8.0.19+). Standard SQL / SQL Server / Oracle / Postgres 15+: <code>MERGE</code>. It needs a unique index as the referee and avoids the race of SELECT-then-INSERT.</p>`, followUps: ['Why is INSERT OR REPLACE not an upsert?', 'What happens if the source batch contains the same key twice in Postgres?'] },
    { q: 'Why is "SELECT to check, then INSERT if missing" wrong under concurrency?', level: 'I', a: `<p>Two transactions can both run the SELECT before either inserts; both see "missing" and both insert. Without a unique constraint you get duplicates; with one, the second fails with a unique violation the app must handle. Even SERIALIZABLE only turns it into a retryable error. The fix is to make the database decide atomically: a UNIQUE index plus <code>ON CONFLICT DO NOTHING/DO UPDATE</code>, or catching the unique violation and retrying.</p>`, followUps: ['Would SELECT … FOR UPDATE help when the row does not exist yet?', 'What is an idempotency key?'] },
    { q: 'Explain soft deletes. What problems do they introduce and how do you solve them?', level: 'I', a: `<p>A soft delete marks a row as deleted (<code>deleted_at</code> timestamp) instead of removing it — enabling undo, audit and keeping FK references valid. Problems: every query must filter (solve with a view, ORM default scope or row-level security); UNIQUE constraints still count deleted rows (use a partial unique index <code>WHERE deleted_at IS NULL</code>); cascades do not fire (cascade with triggers/app logic); tables grow (purge/archive jobs, partitions); privacy laws require real erasure (anonymize or hard delete after a retention window).</p>`, followUps: ['Soft delete vs archive table — when would you pick each?', 'How do you restore a row whose email has been re-used?'] },
    { q: 'What is a view and how can it be used for security?', level: 'B', a: `<p>A view is a stored SELECT that behaves like a virtual table and stores no data. For security you expose only the needed columns (omit salary, mask SSN with an expression) and rows (<code>WHERE dept = 'Eng'</code>), REVOKE privileges on the base table and GRANT SELECT on the view. Because the view runs with the owner's rights, users read through it without base-table access. In Postgres use <code>security_barrier</code> to prevent leaky functions from seeing filtered rows, or <code>security_invoker</code> to apply the caller's rights and RLS.</p>`, followUps: ['How can aggregates still leak individual data?', 'Views vs row-level security?'] },
    { q: 'View vs materialized view — when do you use each?', level: 'I', a: `<p>A view stores only the query, is always fresh, and costs the full query on every read — ideal for security and simplification. A materialized view stores the result, is fast to read and indexable, but is stale until refreshed (full recompute in Postgres; incremental in Oracle/SQL Server indexed views). Use MVs for expensive aggregates read far more often than the data changes and where some lag is acceptable (dashboards, leaderboards). Postgres <code>REFRESH … CONCURRENTLY</code> needs a unique index and avoids blocking readers. In MySQL/SQLite emulate with a summary table refreshed in a transaction or kept current by triggers.</p>`, followUps: ['How do you monitor staleness?', 'Which aggregates are hard to maintain incrementally?'] },
    { q: 'What is an updatable view and what does WITH CHECK OPTION do?', level: 'I', a: `<p>In Postgres/MySQL a simple view (one base table, no GROUP BY, DISTINCT, LIMIT, aggregates or set operations) can receive INSERT/UPDATE/DELETE, which are translated to the base table. <code>WITH CHECK OPTION</code> rejects writes that would produce rows the view cannot see — e.g. updating <code>dept</code> to 'Sales' through an Eng-only view. LOCAL checks only this view, CASCADED also underlying views. Complex views (joins) need INSTEAD OF triggers; in SQLite every writable view needs them.</p>`, followUps: ['Write an INSTEAD OF trigger that inserts into a join view', 'What happens to computed columns in an updatable view?'] },
    { q: 'Stored procedures: pros and cons. Would you put business logic in them?', level: 'A', a: `<p>Pros: one round trip for multi-statement work (shorter lock times), logic next to the data, one implementation shared by all clients/languages, fine-grained security (GRANT EXECUTE, SECURITY DEFINER), plan caching. Cons: harder versioning, testing, debugging and code review; vendor lock-in (PL/pgSQL vs T-SQL); the database CPU is the hardest tier to scale; logic split across two codebases. My default: integrity in the database (constraints, simple triggers), business workflows in the application, procedures for hot paths needing atomic multi-step work or for data-heavy batch jobs — always in migrations with tests.</p>`, followUps: ['Procedure vs function in Postgres?', 'What replaces procedures in SQLite?'] },
    { q: 'SQLite has no stored procedures. How do you implement multi-step atomic logic?', level: 'I', a: `<p>(1) Prefer one set-based statement — it is atomic by itself (CASE in SET, UPDATE … FROM, CTEs, upserts). (2) Wrap several statements in <code>BEGIN … COMMIT</code> in application code; since SQLite is embedded, there is no network round-trip cost. (3) Use triggers as event-driven procedures — e.g. insert a row into <code>transfers</code> and an AFTER INSERT trigger validates with <code>RAISE(ABORT)</code> and updates balances. (4) Register user-defined functions from the host language (<code>create_function</code>) for reusable calculations.</p>`, followUps: ['How do you raise an error from a SQLite trigger?', 'How do you get the affected-row count in SQLite?'] },
    { q: 'How would you implement an audit trail for a table?', level: 'I', a: `<p>An AFTER INSERT/UPDATE/DELETE row trigger writes to an audit table: table name, primary key, action, old and new images (JSON via <code>json_object</code> / <code>to_jsonb</code>), timestamp, and actor (Postgres <code>current_user</code> or <code>current_setting('app.user_id')</code>; in SQLite the app must supply it). Add a WHEN clause to skip no-op updates. Because the trigger runs in the same transaction, the audit cannot be bypassed by any client and exists iff the change commits. Protect the audit table (no UPDATE/DELETE grants). For very high volume consider statement-level triggers with transition tables or CDC from the WAL (Debezium).</p>`, followUps: ['How do you reconstruct a row as of a past timestamp?', 'What do bulk loads with disabled triggers do to your audit?'] },
    { q: 'What are the dangers of triggers?', level: 'A', a: `<p>Hidden logic (writes nobody sees in app code), per-row overhead on bulk operations, cascading chains and recursion that are hard to reason about, unclear firing order (Postgres alphabetical, MySQL FOLLOWS/PRECEDES, SQLite unspecified), surprises in migrations and replication (replicas may not fire them), ORM caches missing trigger-changed values, and side effects that cannot be rolled back if you call external systems. Mitigate: keep triggers small and limited to integrity/audit/derived data, document them with the schema, use WHEN guards, never do I/O (use an outbox table), and test them.</p>`, followUps: ['BEFORE vs AFTER triggers — what can each do?', 'Row-level vs statement-level triggers?'] },
    { q: 'An UPDATE … FROM with a join gives inconsistent results. Why?', level: 'A', a: `<p>If a target row matches several source rows (fan-out), most engines (Postgres, SQLite) update it only once using an arbitrary matching row — so the result depends on join order. For example, two delivery rows of 50 and 30 add either 50 or 30, never 80. Fix: aggregate the source to one row per key first (<code>GROUP BY sku</code>, <code>SUM(qty)</code>) or deduplicate with a window function. SQL Server raises no error either; MERGE in Postgres and SQL Server raises an error when a target row matches twice.</p>`, followUps: ['How would you detect fan-out before running the update?', 'Rewrite it as a correlated subquery'] },
    { q: 'How do you safely run a mass UPDATE or DELETE on a large production table?', level: 'E', a: `<p>Preview with a SELECT (count and sample), take a backup or confirm point-in-time recovery, run in batches by primary-key range (1k–10k rows per transaction) to bound lock time, WAL/binlog growth and replication lag, sleep between batches, monitor replica lag and locks, make each batch idempotent and resumable (record progress), use RETURNING or an archive table to keep what was changed, and prefer partition drops for time-based purges. In Postgres, plan for VACUUM after large updates/deletes; in MySQL, beware gap locks with non-indexed predicates.</p>`, followUps: ['Why can one giant DELETE make replicas fall behind?', 'How does partitioning turn a purge into a metadata operation?'] }
  );

  /* ======================= MODULE ======================= */
  registerModule({
  langExplain: `<p><b>About the code here.</b> The SQL runs in every language the same way. The few Python samples only drive SQLite from application code to show a pattern (for example a user-defined function or logic moved into the app); the same calls exist in Java (JDBC), JavaScript (<code>better-sqlite3</code>, <code>pg</code>) and C++ (the SQLite C API).</p>`,
    id: 'sql09',
    title: 'DML, UPSERT, Views, Procedures & Triggers',
    lang: 'sql',
    intro: `<p>So far you have mostly <i>read</i> data. This module is about <b>changing it safely</b> and about the database objects that wrap and react to those changes. You will master <code>INSERT</code>, <code>UPDATE</code> and <code>DELETE</code> patterns (multi-row inserts, <code>RETURNING</code>, <code>UPDATE … FROM</code>, dedupes, batch deletes), the <b>UPSERT</b> (<code>INSERT … ON CONFLICT DO UPDATE</code>) and why <code>INSERT OR REPLACE</code> is a trap, <b>soft deletes</b> with partial unique indexes, <b>views</b> as a security and abstraction layer, <b>materialized views</b> and summary tables, <b>stored procedures and functions</b>, and <b>triggers</b> for audit trails and validation — with honest pros and cons for each.</p>
<p>Every SQLite snippet runs live in your browser (▶ Run) against a fresh copy of a small online-store database, and every topic has a visualizer that shows the table <b>before and after</b> each statement (inserted rows green, updated amber, deleted red) or the chain of triggers firing. SQLite has no stored procedures or materialized views, so you will see the Postgres/MySQL syntax for reference and the SQLite alternatives you can actually run.</p>`,
    goals: [
      'Write INSERT, UPDATE and DELETE statements that are safe under concurrency: explicit column lists, RETURNING, relative updates with guards, set-based dedupes and batched deletes',
      'Use <code>INSERT … ON CONFLICT DO UPDATE / DO NOTHING</code> (and know MERGE / ON DUPLICATE KEY) for counters, syncs and idempotent writes — and explain why REPLACE loses data',
      'Design soft deletes correctly: <code>deleted_at</code>, a live-rows view, a partial unique index, restore and purge policies',
      'Build views that hide columns and rows for security, make views writable with INSTEAD OF triggers, and decide when to materialize',
      'Explain stored procedures/functions with their trade-offs, and implement the same logic in SQLite with set-based SQL, transactions, triggers or UDFs',
      'Write audit, validation and derived-data triggers, trace a trigger chain, and argue when NOT to use triggers'
    ],
    prereqs: `SQL 2–6 (SELECT, aggregates, JOINs, subqueries/CTEs, window functions) and SQL 7 (DDL & constraints: PRIMARY KEY, UNIQUE, CHECK, FOREIGN KEY). Basic idea of a transaction (BEGIN/COMMIT).`,
    hours: 12,
    databases: { shop: DB_SHOP, lab: DB_LAB },
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
