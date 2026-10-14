(function () {
  var topics = [], practice = [], quiz = [], interview = [];

  /* =====================================================================
     SAMPLE DATABASES (SQLite dialect). Every one deliberately contains
     unmatched rows on BOTH sides and NULL join keys, so every join type
     shows a visible difference when you press Run.
     ===================================================================== */
  var DB_SHOP = `-- A tiny online shop. Foreign keys are NOT enforced (SQLite default),
-- so we can have "orphan" rows exactly like messy real-world data.
CREATE TABLE customers (
  customer_id INTEGER PRIMARY KEY,
  name        TEXT NOT NULL,
  city        TEXT,                -- Eli has no city (NULL)
  referred_by INTEGER              -- another customer_id (self reference)
);
INSERT INTO customers VALUES
  (1,'Asha','Pune',NULL),
  (2,'Ben','Delhi',1),
  (3,'Chen','Pune',1),
  (4,'Dev','Mumbai',2),
  (5,'Eli',NULL,NULL),             -- never ordered
  (6,'Fay','Delhi',3);             -- never ordered

CREATE TABLE orders (
  order_id    INTEGER PRIMARY KEY,
  customer_id INTEGER,             -- NULL = guest checkout, 9 = deleted customer
  order_date  TEXT,
  status      TEXT,                -- paid / cancelled / pending
  amount      INTEGER
);
INSERT INTO orders VALUES
  (101,1,'2026-01-05','paid',250),
  (102,1,'2026-01-20','paid',80),
  (103,2,'2026-02-02','cancelled',120),
  (104,3,'2026-02-10','paid',40),
  (105,NULL,'2026-02-11','paid',99),   -- guest: no customer at all
  (106,9,'2026-03-01','paid',60),      -- orphan: customer 9 was deleted
  (107,3,'2026-03-03','pending',300),
  (108,4,'2026-03-15','paid',75);

CREATE TABLE products (
  product_id INTEGER PRIMARY KEY,
  name       TEXT NOT NULL,
  category   TEXT,                 -- Mystery Box has no category (NULL)
  price      INTEGER
);
INSERT INTO products VALUES
  (1,'Keyboard','Electronics',220),     -- list price raised after order 101
  (2,'Mouse','Electronics',25),
  (3,'Desk Lamp','Home',80),
  (4,'Pen Set','Stationery',20),
  (5,'Monitor','Electronics',300),
  (6,'Mystery Box',NULL,99),       -- never sold
  (7,'Plant Pot','Home',15);       -- never sold

CREATE TABLE order_items (
  order_id   INTEGER,
  product_id INTEGER,              -- 99 = product that no longer exists
  qty        INTEGER,
  unit_price INTEGER
);
INSERT INTO order_items VALUES
  (101,1,1,200),(101,2,2,25),
  (102,3,1,80),
  (103,3,1,80),(103,4,2,20),
  (104,4,2,20),
  (105,2,1,25),(105,99,1,74),
  (106,4,3,20),
  (107,5,1,300),
  (108,2,3,25);

CREATE TABLE payments (
  payment_id INTEGER PRIMARY KEY,
  order_id   INTEGER,              -- 110 = payment for an order we cannot find
  amount     INTEGER,
  paid_on    TEXT
);
INSERT INTO payments VALUES
  (1,101,150,'2026-01-05'),(2,101,100,'2026-01-12'),   -- order 101 paid in 2 parts
  (3,102,80,'2026-01-20'),
  (4,104,40,'2026-02-10'),
  (5,105,99,'2026-02-11'),
  (6,106,60,'2026-03-01'),
  (7,108,50,'2026-03-15'),(8,108,20,'2026-03-20'),     -- 108 is UNDER-paid (70 of 75)
  (9,110,30,'2026-03-22');                             -- orphan payment

CREATE TABLE sizes  (size TEXT);
INSERT INTO sizes  VALUES ('S'),('M'),('L');
CREATE TABLE colors (color TEXT);
INSERT INTO colors VALUES ('Red'),('Blue');`;

  var DB_COMPANY = `-- A small company: departments, employees (with a self-referencing
-- manager_id), projects, assignments and salary grades.
CREATE TABLE departments (
  dept_id   INTEGER PRIMARY KEY,
  dept_name TEXT NOT NULL,
  location  TEXT
);
INSERT INTO departments VALUES
  (10,'Engineering','Bengaluru'),
  (20,'Sales','Mumbai'),
  (30,'HR','Pune'),
  (40,'Legal','Delhi');            -- no employees yet

CREATE TABLE employees (
  emp_id     INTEGER PRIMARY KEY,
  name       TEXT NOT NULL,
  dept_id    INTEGER,              -- NULL = not assigned, 50 = department that does not exist
  manager_id INTEGER,              -- NULL = the CEO, 12 = manager who left the company
  salary     INTEGER,
  hire_date  TEXT
);
INSERT INTO employees VALUES
  (1,'Meera',10,NULL,250000,'2015-03-01'),   -- CEO
  (2,'Arjun',10,1,180000,'2017-06-15'),
  (3,'Priya',20,1,170000,'2016-01-10'),
  (4,'Kabir',10,2,190000,'2019-09-01'),      -- earns more than manager Arjun
  (5,'Sara',10,2,120000,'2021-02-01'),
  (6,'Rohan',20,3,90000,'2020-05-20'),
  (7,'Tara',20,3,175000,'2022-07-11'),       -- earns more than manager Priya
  (8,'Vikram',NULL,1,110000,'2023-01-09'),   -- no department
  (9,'Neha',30,12,95000,'2018-11-30'),       -- manager 12 left
  (10,'Ishaan',50,2,85000,'2024-04-01');     -- dept 50 does not exist

CREATE TABLE projects (
  project_id INTEGER PRIMARY KEY,
  name       TEXT NOT NULL,
  dept_id    INTEGER
);
INSERT INTO projects VALUES
  (1,'Search',10),(2,'Payments',10),(3,'CRM',20),
  (4,'Hiring Portal',30),(5,'Compliance',40);   -- Compliance has nobody

CREATE TABLE assignments (
  emp_id     INTEGER,
  project_id INTEGER,
  hours      INTEGER
);
INSERT INTO assignments VALUES
  (2,1,20),(4,1,30),(4,2,10),(5,2,40),
  (3,3,5),(6,3,25),(7,3,15),
  (9,4,20),
  (11,1,5);                         -- emp 11 does not exist (orphan)

CREATE TABLE salary_grades (
  grade   TEXT,
  min_sal INTEGER,
  max_sal INTEGER
);
INSERT INTO salary_grades VALUES
  ('A',0,99999),('B',100000,149999),('C',150000,199999),('D',200000,1000000);`;

  var DB_SCHOOL = `-- Students, courses and enrollments (a classic many-to-many).
CREATE TABLE students (
  student_id INTEGER PRIMARY KEY,
  name       TEXT NOT NULL,
  grad_year  INTEGER
);
INSERT INTO students VALUES
  (1,'Aanya',2026),(2,'Bilal',2026),(3,'Chitra',2027),
  (4,'Dhruv',2027),(5,'Esha',2028);           -- Esha has no enrollments

CREATE TABLE courses (
  course_id TEXT PRIMARY KEY,
  title     TEXT NOT NULL,
  dept      TEXT
);
INSERT INTO courses VALUES
  ('C1','Databases','CS'),('C2','Algorithms','CS'),
  ('C3','Statistics','Math'),('C4','Poetry','Arts');   -- nobody takes Poetry

CREATE TABLE enrollments (
  student_id INTEGER,              -- 6 = student record that was deleted
  course_id  TEXT,                 -- NULL = enrollment still being processed
  grade      TEXT                  -- NULL = not graded yet
);
INSERT INTO enrollments VALUES
  (1,'C1','A'),(1,'C2','B'),(1,'C3','A'),
  (2,'C1','C'),(2,'C2',NULL),
  (3,'C1','B'),(3,'C3','B'),
  (4,'C2','A'),
  (4,NULL,NULL),
  (6,'C1','B');`;

  var DB_WEATHER = `-- Daily temperature readings (one day is missing: 2026-01-04).
CREATE TABLE weather (
  id          INTEGER PRIMARY KEY,
  record_date TEXT,                -- ISO dates sort and compare correctly as text
  temperature INTEGER
);
INSERT INTO weather VALUES
  (1,'2026-01-01',10),(2,'2026-01-02',25),(3,'2026-01-03',20),
  (4,'2026-01-05',30),(5,'2026-01-06',30),(6,'2026-01-07',28),(7,'2026-01-08',35);`;

  /* =====================================================================
     VISUALIZER ENGINE — shared by every topic.
     A join is shown as a nested loop: for each LEFT row, scan the RIGHT
     rows and test the ON condition. Matches are green (ok), misses red
     (bad), NULL-filled outer rows purple (sel). The result table grows.
     ===================================================================== */
  function fr(narr, parts) { return { narr: narr, parts: parts }; }
  function show(v) { return v === null || v === undefined ? 'NULL' : v; }
  function tbl(label, columns, rows, hl) {
    return { type: 'table', label: label, columns: columns.slice(), rows: rows.map(function (r) { return r.map(show); }), hl: hl || {} };
  }
  function sqlp(code, hl, label) { return { type: 'code', label: label || 'The query', lang: 'sql', code: code, hl: hl || {} }; }
  function txt(html, label) { return { type: 'text', label: label, html: html }; }
  function vars(vals, hl, label) { return { type: 'vars', label: label || 'Counters', vals: vals, hl: hl || {} }; }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function sv(v) { return v === null || v === undefined ? '<span class="c-m">NULL</span>' : esc(v); }
  function eq(a, b) { return (a === null || b === null) ? null : (a === b); }   // SQL '=': NULL -> UNKNOWN
  function tv(x) { return x === true ? '<span class="c-g">TRUE</span>' : x === false ? '<span class="c-r">FALSE</span>' : '<span class="c-y">UNKNOWN</span>'; }
  var NAMES = ['Asha', 'Ben', 'Chen', 'Dev', 'Eli', 'Fay', 'Gus', 'Hana'];
  var AMOUNTS = [250, 80, 120, 40, 99, 60, 300, 75];

  // "1 2 NULL x" -> [1, 2, null, 'x'] ; numbers become numbers
  function toks(s) {
    return String(s === undefined ? '' : s).trim().split(/[\s,]+/).filter(function (t) { return t.length; }).map(function (t) {
      if (/^(null|-|_)$/i.test(t)) return null;
      return /^-?\d+$/.test(t) ? Number(t) : t;
    });
  }
  // "LEFT 1 2 3 | 1 1 9" -> {type:'LEFT', left:[1,2,3], right:[1,1,9]}
  function parseJoin(input, def, allowed, maxL, maxR) {
    var s = String(input === undefined ? '' : input).trim(), type = def;
    var m = s.match(/^([A-Za-z]+(?:\s+(?:EXISTS|IN))?)\s+/i);
    if (m && !/^null$/i.test(m[1])) {
      var w = m[1].toUpperCase().replace(/\s+/g, ' ');
      if (allowed.indexOf(w) < 0) throw new Error('Join type must be one of: ' + allowed.join(', '));
      type = w; s = s.slice(m[0].length);
    }
    var sides = s.split('|');
    if (sides.length !== 2) throw new Error('Format: ' + def + ' 1 2 3 4 | 1 1 3 NULL 9  (left keys | right keys)');
    var L = toks(sides[0]), R = toks(sides[1]);
    if (!L.length || !R.length) throw new Error('Both sides need at least one key');
    if (L.length > maxL || R.length > maxR) throw new Error('Keep it small: at most ' + maxL + ' left keys and ' + maxR + ' right keys');
    return { type: type, left: L, right: R };
  }
  function custRows(keys) { return keys.map(function (k, i) { return [k, NAMES[i % NAMES.length]]; }); }
  function orderRows(keys) { return keys.map(function (k, i) { return [101 + i, k, AMOUNTS[i % AMOUNTS.length]]; }); }

  /*
   * runJoin(o) -> { frames, result }
   * o.L / o.R      : { label, cols, rows }
   * o.type         : INNER | LEFT | RIGHT | FULL | CROSS | SEMI | ANTI | NOTIN
   * o.test(l, r)   : true / false / null(UNKNOWN)
   * o.say(l, r, t) : HTML describing one comparison
   * o.outCols, o.out(l, r) : result columns and row builder (l or r may be null)
   * o.sql, o.lines : code part + {scan, emit, keepL, keepR} 1-based line numbers to highlight
   * o.startFrames  : frames to prepend; o.compact: force one frame per left row
   */
  function runJoin(o) {
    var frames = [], res = [], rMatched = o.R.rows.map(function () { return false; });
    var L = o.L.rows, R = o.R.rows, lines = o.lines || {};
    var pairs = 0, compact = o.compact || L.length * R.length > 42;
    var T = o.type;
    function parts(lhl, rhl, newRows, cls, line) {
      var rh = {};
      (newRows || []).forEach(function (k) { rh[k] = cls || 'ok'; });
      var ps = [];
      if (o.sql) { var h = {}; if (line) h[line] = 'cur'; ps.push(sqlp(o.sql, h)); }
      ps.push(tbl(o.L.label, o.L.cols, L, lhl));
      ps.push(tbl(o.R.label, o.R.cols, R, rhl));
      ps.push(tbl('Result so far (' + res.length + ' row' + (res.length === 1 ? '' : 's') + ')', o.outCols, res, rh));
      ps.push(vars({ pairs_compared: pairs, result_rows: res.length }, {}, 'Counters'));
      return ps;
    }
    (o.startFrames || []).forEach(function (f) { frames.push(f); });
    frames.push(fr(o.intro || 'Start: the result is empty. We will take each row of <b>' + o.L.label + '</b> and compare it with every row of <b>' + o.R.label + '</b>.', parts({}, {}, [], null, lines.scan)));
    for (var i = 0; i < L.length; i++) {
      var lhl = {}; for (var d = 0; d < i; d++) lhl[d] = 'done'; lhl[i] = 'cur';
      var rhl = {}, matched = false, notinNull = false, stopped = false, said = [], before = res.length;
      for (var j = 0; j < R.length; j++) {
        pairs++;
        var t = T === 'CROSS' ? true : o.test(L[i], R[j]);
        rhl[j] = t === true ? 'ok' : 'bad';
        var newRows = [];
        if (t === true) {
          matched = true; rMatched[j] = true;
          if (T !== 'SEMI' && T !== 'ANTI' && T !== 'NOTIN') { res.push(o.out(L[i], R[j])); newRows.push(res.length - 1); }
        } else if (t === null && T === 'NOTIN') notinNull = true;
        var line = (t === true && newRows.length) ? lines.emit : lines.scan;
        var msg = o.say(L[i], R[j], t);
        if (T === 'SEMI' && t === true) { res.push(o.out(L[i], null)); newRows.push(res.length - 1); msg += ' → EXISTS is satisfied: output this ' + o.L.label + ' row <b>once</b> and <b>stop scanning</b> (no duplicates, no wasted work).'; stopped = true; line = lines.emit; }
        else if ((T === 'ANTI' || T === 'NOTIN') && t === true) { msg += ' → a partner exists, so this row is <b>disqualified</b>. Stop scanning.'; stopped = true; }
        else if (t === true) msg += ' → <span class="c-g">match</span>: glue the two rows together and append to the result.';
        else if (T === 'NOTIN' && t === null) msg += ' → for NOT IN this UNKNOWN poisons the whole test (it can never become TRUE).';
        if (!compact) frames.push(fr(msg, parts(Object.assign({}, lhl), Object.assign({}, rhl), newRows, 'ok', line)));
        else said.push(msg);
        if (stopped) break;
      }
      if (compact) {
        var lastNew = [];
        for (var q = before; q < res.length; q++) lastNew.push(q);
        frames.push(fr('Row ' + (i + 1) + ' of ' + o.L.label + ' scanned against all of ' + o.R.label + ': ' + said.length + ' comparison(s). ' + (matched ? 'Green rows matched.' : 'Nothing matched.'), parts(Object.assign({}, lhl), Object.assign({}, rhl), lastNew, 'ok', lines.scan)));
      }
      var lh2 = Object.assign({}, lhl);
      if ((T === 'LEFT' || T === 'FULL') && !matched) {
        res.push(o.out(L[i], null)); lh2[i] = 'bad';
        frames.push(fr('<b>' + o.L.label + '</b> row ' + sv(L[i][0]) + ' found <b>no partner</b>. An INNER JOIN would silently drop it, but a ' + T + ' JOIN must keep every left row — so it is kept and every ' + o.R.label + ' column is filled with <span class="c-p">NULL</span>.', parts(lh2, Object.assign({}, rhl), [res.length - 1], 'sel', lines.keepL || lines.emit)));
      } else if (T === 'ANTI' && !matched) {
        res.push(o.out(L[i], null)); lh2[i] = 'sel';
        frames.push(fr('No partner anywhere → NOT EXISTS is TRUE → keep ' + sv(L[i][0]) + '. This is the <b>anti-join</b>: rows with <i>no</i> match.', parts(lh2, Object.assign({}, rhl), [res.length - 1], 'sel', lines.emit)));
      } else if (T === 'NOTIN' && !matched) {
        if (notinNull) { lh2[i] = 'bad'; frames.push(fr('No equal value, but one comparison was UNKNOWN (a NULL in the list). <code>x NOT IN (…, NULL)</code> = UNKNOWN, and WHERE only keeps TRUE → ' + sv(L[i][0]) + ' is <span class="c-r">dropped</span>. This is the famous NOT IN + NULL trap.', parts(lh2, Object.assign({}, rhl), [], 'ok', lines.scan))); }
        else { res.push(o.out(L[i], null)); lh2[i] = 'sel'; frames.push(fr('Every comparison was FALSE → NOT IN is TRUE → keep ' + sv(L[i][0]) + '.', parts(lh2, Object.assign({}, rhl), [res.length - 1], 'sel', lines.emit))); }
      } else if ((T === 'INNER' || T === 'RIGHT') && !matched) {
        lh2[i] = 'bad';
        frames.push(fr('<b>' + o.L.label + '</b> row ' + sv(L[i][0]) + ' matched nothing. ' + (T === 'INNER' ? 'INNER JOIN keeps only matches, so it simply <span class="c-r">disappears</span> from the result.' : 'RIGHT JOIN only protects right rows, so this left row disappears.'), parts(lh2, Object.assign({}, rhl), [], 'ok', lines.scan)));
      }
    }
    if (T === 'RIGHT' || T === 'FULL') {
      var unmatched = [];
      rMatched.forEach(function (mm, j) { if (!mm) unmatched.push(j); });
      var allDone = {}; for (var d2 = 0; d2 < L.length; d2++) allDone[d2] = 'done';
      if (!unmatched.length) frames.push(fr('Second pass over <b>' + o.R.label + '</b>: every row was matched at least once, so nothing extra to add.', parts(allDone, {}, [], 'ok', lines.keepR)));
      unmatched.forEach(function (j) {
        var rh = {}; rMatched.forEach(function (mm, k) { rh[k] = mm ? 'done' : 'bad'; }); rh[j] = 'cur';
        res.push(o.out(null, R[j]));
        frames.push(fr('Second pass: <b>' + o.R.label + '</b> row ' + sv(R[j][0]) + ' was never matched by any left row. ' + T + ' JOIN keeps it and fills the <b>' + o.L.label + '</b> columns with <span class="c-p">NULL</span>.', parts(allDone, rh, [res.length - 1], 'sel', lines.keepR || lines.emit)));
      });
    }
    var fin = {}; res.forEach(function (r, k) { fin[k] = 'sel'; });
    var lAll = {}; L.forEach(function (r, k) { lAll[k] = 'done'; });
    frames.push(fr(o.outro ? o.outro(res) : 'Done. ' + L.length + ' × ' + R.length + ' = ' + (L.length * R.length) + ' possible pairs were examined (' + pairs + ' actually compared); the result has <b>' + res.length + '</b> row(s).', parts(lAll, {}, Object.keys(fin).map(Number), 'sel', null)));
    return { frames: frames, result: res };
  }
  // describe "a = b" with NULL awareness
  function sayEq(lname, lv, rname, rv, t) {
    return '<code>' + lname + '</code> ' + sv(lv) + ' = <code>' + rname + '</code> ' + sv(rv) + ' → ' + tv(t) + (t === null ? ' (NULL is "unknown", it never equals anything — not even another NULL)' : '');
  }

  /* Shared customers ⋈ orders visualizer used by topics 1–3 (join type editable). */
  function custOrderViz(def, title, intro) {
    return {
      title: title,
      input: def + ' 1 2 3 4 5 | 1 1 3 NULL 9 4',
      inputLabel: 'JOIN-TYPE customer ids | orders.customer_id values (type: INNER, LEFT, RIGHT or FULL; NULL allowed; ≤ 7 each)',
      gen: function (input) {
        var p = parseJoin(input, def, ['INNER', 'LEFT', 'RIGHT', 'FULL'], 7, 7);
        var kw = p.type === 'FULL' ? 'FULL OUTER JOIN' : p.type === 'INNER' ? 'INNER JOIN' : p.type + ' JOIN';
        var sql = 'SELECT c.customer_id, c.name, o.order_id, o.customer_id, o.amount\nFROM customers AS c\n' + kw + ' orders AS o\n  ON o.customer_id = c.customer_id;';
        return runJoin({
          type: p.type,
          L: { label: 'customers c', cols: ['customer_id', 'name'], rows: custRows(p.left) },
          R: { label: 'orders o', cols: ['order_id', 'customer_id', 'amount'], rows: orderRows(p.right) },
          test: function (l, r) { return eq(l[0], r[1]); },
          say: function (l, r, t) { return l[1] + ' vs order ' + r[0] + ': ' + sayEq('c.customer_id', l[0], 'o.customer_id', r[1], t); },
          outCols: ['c.customer_id', 'c.name', 'o.order_id', 'o.customer_id', 'o.amount'],
          out: function (l, r) { return [l ? l[0] : null, l ? l[1] : null, r ? r[0] : null, r ? r[1] : null, r ? r[2] : null]; },
          sql: sql, lines: { scan: 4, emit: 1, keepL: 3, keepR: 3 },
          intro: intro + ' Join type: <b>' + kw + '</b>. Edit the input to try another type or other keys (duplicates, NULLs, orphans).',
          outro: function (res) {
            var nullFilled = res.filter(function (r) { return r[0] === null || r[2] === null; }).length;
            return '<b>' + kw + '</b> finished: ' + res.length + ' row(s), of which ' + nullFilled + ' are NULL-filled. ' +
              (p.type === 'INNER' ? 'Only matching pairs survive — customers with no orders and orders with NULL/orphan keys vanished.' :
                p.type === 'LEFT' ? 'Every customer appears at least once; unmatched orders vanished.' :
                  p.type === 'RIGHT' ? 'Every order appears at least once; customers with no orders vanished.' :
                    'Every customer AND every order appears at least once: FULL = matches + left leftovers + right leftovers.');
          }
        }).frames;
      }
    };
  }

  /* ================= TOPIC 1: INNER JOIN ================= */
  topics.push({
    title: 'INNER JOIN: Gluing Matching Rows Together (ON, aliases, USING, NATURAL, non-equi joins)',
    analogy: `<p>Imagine a school dance where every student holds a <b>card with a number</b>. Boys stand on the left wall, girls on the right wall. The teacher says: <i>"Pair up with whoever has the same number."</i> Every matching pair walks to the dance floor. Anyone whose number matches nobody stays by the wall — <b>they are not on the dance floor at all</b>. And if one boy's number matches <b>two</b> girls' numbers, he dances twice (two pairs).</p>
<p>That is an <b>INNER JOIN</b>: the dance floor is the result, the number is the join key, and only <b>matching pairs</b> make it in.</p>`,
    explain: `<p>🟢 <b>The plain idea.</b> Real data is split across tables so nothing is stored twice: the <code>orders</code> table stores only a <code>customer_id</code>, not the customer's name. A <b>JOIN</b> puts the pieces back together <b>at query time</b>. An <b>INNER JOIN</b> returns one combined row for every pair of rows (one from each table) for which the <code>ON</code> condition is <b>TRUE</b>.</p>
${H.table(['customers', '', 'orders'], [['1 Asha', '↔', '101 (cust 1), 102 (cust 1)'], ['2 Ben', '↔', '103 (cust 2)'], ['5 Eli', '✗', '<span class="c-r">no orders → not in result</span>'], ['—', '✗', '<span class="c-r">105 (cust NULL), 106 (cust 9) → not in result</span>']])}
<p><b>The syntax, piece by piece:</b></p>
<pre>SELECT c.name, o.order_id, o.amount      -- 4. pick columns from either side
FROM customers AS c                       -- 1. left table, nickname "c"
INNER JOIN orders AS o                    -- 2. right table, nickname "o"
  ON o.customer_id = c.customer_id;       -- 3. the matching rule</pre>
<ul>
<li><b>Aliases</b> (<code>c</code>, <code>o</code>) are short nicknames. Once two tables are involved, <b>always prefix columns</b> (<code>c.name</code>) — otherwise a column that exists in both tables is <i>ambiguous</i> and the query errors out (or silently picks the wrong one after a schema change).</li>
<li><code>JOIN</code> on its own <b>means</b> <code>INNER JOIN</code>. The word INNER is optional.</li>
<li>The <b>ON</b> condition can be any true/false expression: equality (<code>=</code>, an <b>equi-join</b>, 95% of real joins), but also <code>BETWEEN</code>, <code>&lt;</code>, <code>LIKE</code> (a <b>non-equi join</b>).</li>
<li><b>NULL never matches.</b> <code>NULL = 1</code> and even <code>NULL = NULL</code> are UNKNOWN, not TRUE, so rows with a NULL key never pair up.</li>
</ul>
<p><b>How many rows come out?</b> Each left row produces one output row <b>per matching right row</b>:</p>
${H.table(['left row has … matches', 'output rows from it'], [['0', '<span class="c-r">0 (dropped)</span>'], ['1', '1'], ['k', '<span class="c-y">k (left values repeated k times)</span>']])}
<p>So the result can be anywhere from 0 rows to |L| × |R| rows. When you join a "many" table (orders) to the "one" side it points to (customers, by primary key), the result has <b>at most</b> as many rows as the many side — a very useful sanity check.</p>
<p><b>Shortcuts you will meet:</b> <code>JOIN orders USING (customer_id)</code> (when the column has the same name on both sides; the output has one merged column), <code>NATURAL JOIN</code> (joins on <i>every</i> same-named column — risky), and the old <b>comma join</b> <code>FROM customers c, orders o WHERE o.customer_id = c.customer_id</code> (same result as INNER JOIN, but easy to forget the condition).</p>`,
    clues: [
      '"show X <b>with</b> its Y" where every X must have a Y (order with customer name, employee with department name) → INNER JOIN on the foreign key',
      '"only rows that exist in both tables" / "matching records" → INNER JOIN',
      'a value lives in another table by <b>id</b> (orders.customer_id → customers.customer_id) → equi-join on PK = FK',
      '"falls within a range" (salary band, price tier, date validity window) → <b>non-equi join</b> with BETWEEN / &lt; in ON',
      'the expected answer "loses" some rows (customers with no orders not listed) → that is INNER JOIN behaviour; if they must stay, you need LEFT JOIN',
      '"ambiguous column name" error → prefix every column with a table alias'
    ],
    code: [
      { lang: 'sql', db: 'shop', title: 'Inner join: each order with its customer (▶ run it)', code: `
-- Orders 105 (guest, NULL customer) and 106 (deleted customer 9) have no partner -> gone.
-- Customers Eli and Fay placed no orders -> gone.
SELECT o.order_id,
       c.name      AS customer,
       c.city,
       o.amount
FROM orders AS o
INNER JOIN customers AS c
        ON c.customer_id = o.customer_id   -- PK = FK equi-join
ORDER BY o.order_id;` },
      { lang: 'sql', db: 'company', title: 'Non-equi join: salary band lookup', code: `
-- No equality at all: each employee matches the grade whose range contains the salary.
SELECT e.name, e.salary, g.grade
FROM employees AS e
JOIN salary_grades AS g
  ON e.salary BETWEEN g.min_sal AND g.max_sal
ORDER BY e.salary DESC;` }
    ],
    codeTitle: ['Inner join (shop DB)', 'Non-equi join (company DB)'],
    viz: custOrderViz('INNER', 'INNER JOIN, pair by pair: customers ⋈ orders', 'Think of the database running a nested loop: hold one customer, walk down the orders, test the ON condition for each pair.'),
    examples: [
      {
        title: 'Employees with their department name (and who silently disappears)',
        html: `<p>There are <b>10</b> employees but the inner join returns only <b>8</b>. Vikram has <code>dept_id = NULL</code> (NULL never matches) and Ishaan points to department <b>50</b>, which does not exist. Legal (40) has no employees, so it never appears either. <b>Always compare row counts</b> before and after a join: if they differ, you just learned something about your data.</p>
${H.table(['name', 'dept_id', 'in result?'], [['Meera', '10', '<span class="c-g">yes — Engineering</span>'], ['Vikram', 'NULL', '<span class="c-r">no — NULL key</span>'], ['Ishaan', '50', '<span class="c-r">no — orphan key</span>']])}`,
        code: { lang: 'sql', db: 'company', code: `
SELECT e.name, d.dept_name, d.location
FROM employees e
JOIN departments d ON d.dept_id = e.dept_id
ORDER BY d.dept_name, e.name;

-- Count check: 10 employees vs 8 joined rows -> 2 employees lost.
SELECT (SELECT COUNT(*) FROM employees) AS employees,
       (SELECT COUNT(*) FROM employees e JOIN departments d ON d.dept_id = e.dept_id) AS joined_rows;` }
      },
      {
        title: 'USING vs NATURAL JOIN — why NATURAL is a trap',
        html: `<p><code>USING (dept_id)</code> is a neat shortcut when the key has the same name on both sides. <code>NATURAL JOIN</code> goes further and joins on <b>every</b> column with the same name. <code>employees</code> and <code>projects</code> share <b>two</b> names: <code>dept_id</code> and <code>name</code>. So NATURAL JOIN silently demands <code>employees.name = projects.name</code> too → <span class="c-r">0 rows</span>. Worse, adding a column like <code>updated_at</code> to both tables later would silently change every NATURAL JOIN in your codebase. Most style guides ban it.</p>`,
        code: { lang: 'sql', db: 'company', code: `
-- Intended: which projects belong to each employee's department? (12 rows)
SELECT e.name AS employee, p.name AS project
FROM employees e
JOIN projects p USING (dept_id)
ORDER BY employee, project;

-- NATURAL JOIN also matches e.name = p.name -> returns nothing!
SELECT COUNT(*) AS natural_rows FROM employees NATURAL JOIN projects;` }
      },
      {
        title: 'Old comma join = INNER JOIN (until you forget the WHERE)',
        html: `<p>Before SQL-92 people wrote joins as a comma list plus a WHERE. For inner joins the result is identical, and modern optimizers produce the same plan. The danger: the join rule is mixed in with ordinary filters, and if it is forgotten you get a <b>Cartesian product</b>: 6 customers × 8 orders = <span class="c-r">48 rows</span> of nonsense. Explicit <code>JOIN … ON</code> keeps "how tables connect" separate from "which rows I want".</p>`,
        code: { lang: 'sql', db: 'shop', code: `
-- Equivalent to INNER JOIN ... ON
SELECT c.name, o.order_id
FROM customers c, orders o
WHERE o.customer_id = c.customer_id
ORDER BY o.order_id;

-- Oops, condition forgotten: every customer paired with every order.
SELECT COUNT(*) AS accidental_rows FROM customers c, orders o;` }
      },
      {
        title: 'Joining on two columns (composite key)',
        html: `<p>Sometimes one column is not enough to identify the partner. Here we match each order line to the <b>catalogue price</b> and flag lines sold at a different price. The ON clause holds the key (<code>product_id</code>); the price comparison goes in SELECT so mismatches stay visible. If you need a composite-key match (e.g. <code>(country, sku)</code>), just AND the equalities together in ON.</p>`,
        code: { lang: 'sql', db: 'shop', code: `
SELECT i.order_id, p.name, i.unit_price, p.price AS list_price,
       CASE WHEN i.unit_price = p.price THEN 'ok' ELSE 'DISCOUNTED' END AS price_check
FROM order_items i
JOIN products p
  ON p.product_id = i.product_id      -- add "AND p.country = i.country" for a composite key
ORDER BY i.order_id;` }
      }
    ],
    deepDive: `<p>🟣 <b>Logical vs physical.</b> Logically an inner join is "take the Cartesian product L × R, keep the pairs where ON is TRUE" (relational algebra: σ<sub>cond</sub>(L × R), written L ⋈<sub>cond</sub> R). No database actually builds the product. The optimizer picks a <b>physical join algorithm</b>:</p>
${H.table(['Algorithm', 'How', 'Cost', 'Good when'], [['Nested loop', 'for each outer row, scan / index-seek inner', 'O(|L|·|R|), or O(|L|·log|R|) with an index', 'small outer side, index on inner key, any ON (incl. non-equi)'], ['Hash join', 'build hash table on smaller side, probe with the other', '≈ O(|L| + |R|)', 'big unsorted inputs, equality only'], ['Merge join', 'both sides sorted on key, walk together', 'O(|L| + |R|) after sorting', 'inputs already sorted / indexed, equality or range']])}
<p>SQLite uses nested loops (with automatic temporary indexes when helpful); PostgreSQL, SQL Server and MySQL 8.0.18+ also have hash joins. You will study these in the Query Execution module — the key interview takeaway is that <b>an index on the foreign key</b> turns a nested loop from "scan everything for every row" into "jump straight to the matches".</p>
<p><b>Inner joins are commutative and associative</b>: <code>A JOIN B</code> = <code>B JOIN A</code> (up to column order) and the order of several inner joins does not change the result, which is why the optimizer is free to reorder them. That freedom <b>disappears</b> as soon as outer joins are mixed in.</p>
<p><b>Type traps.</b> Joining an INTEGER column to a TEXT column holding '1' works in SQLite thanks to type affinity, but in PostgreSQL it errors, and in MySQL it silently casts — possibly disabling index use. Keep join keys the same type. <b>Collation traps:</b> 'asha' = 'Asha' is false in most databases unless you use a case-insensitive collation. <b>NULL-safe equality</b> exists when you truly want NULL to match NULL: <code>IS NOT DISTINCT FROM</code> (standard, PostgreSQL, SQLite supports <code>IS</code>), <code>&lt;=&gt;</code> in MySQL.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> Copilots write join boilerplate instantly, and text-to-SQL tools can join tables they have never seen by guessing from column names. That guessing is exactly where they go wrong: they happily join <code>orders.id = customers.id</code> (wrong columns with similar names), pick NATURAL JOIN, or join on a non-unique column and multiply rows.</p>
<p><b>Use AI as a partner:</b> paste your schema (CREATE TABLE statements with keys) and ask <i>"Which columns are foreign keys and what is the cardinality of each relationship?"</i> before asking it to write the query. Ask it to <i>"add a row-count sanity check before and after each join"</i>.</p>
<p><b>Where AI goes wrong:</b> assuming every FK has a match (forgetting NULL keys and orphans), using INNER JOIN when the question says "all customers", and ambiguous unprefixed columns. <b>What you must still own:</b> knowing the grain (one row = one what?) of every table, predicting the row count of a join before running it, and spotting that 8 rows became 6 for a reason.</p>`,
    problems: [{
      title: 'Paid Orders with Customer Details', level: 'Easy', tags: ['inner join', 'filter'], companies: ['Amazon', 'Flipkart'],
      statement: `<p>Using the <b>shop</b> database, list every <b>paid</b> order together with the customer's <code>name</code> and <code>city</code>. Show <code>order_id, name, city, amount</code>, biggest amount first. Orders without a known customer should not appear.</p>`,
      constraints: `<p>Tables: <code>orders(order_id, customer_id, status, amount, …)</code>, <code>customers(customer_id, name, city, …)</code>. <code>customer_id</code> in orders may be NULL or point to a deleted customer.</p>`,
      example: `${H.table(['order_id', 'name', 'city', 'amount'], [['101', 'Asha', 'Pune', '250'], ['102', 'Asha', 'Pune', '80'], ['108', 'Dev', 'Mumbai', '75'], ['104', 'Chen', 'Pune', '40']])}<p>Paid orders 105 (guest) and 106 (deleted customer) are ${H.c('r', 'excluded')} because they have no matching customer — exactly what an inner join does.</p>`,
      brute: {
        why: `<p>The beginner version lists both tables after FROM and filters only on status — but never says <b>how</b> the tables connect. Every customer is paired with every paid order: 6 × 6 = <span class="c-r">36 rows</span>, with Ben "owning" Asha's order. Results look plausible at a glance, which is what makes this bug dangerous.</p>`,
        code: { lang: 'sql', db: 'shop', code: `
-- WRONG: no join condition -> Cartesian product filtered only by status
SELECT o.order_id, c.name, c.city, o.amount
FROM customers c, orders o
WHERE o.status = 'paid'
ORDER BY o.amount DESC;` }
      },
      mcq: { q: 'Which clause decides which customer belongs to which order?', options: ['<code>ON o.customer_id = c.customer_id</code>', '<code>WHERE o.status = \'paid\'</code>', '<code>ORDER BY amount DESC</code>', 'The order of the tables in FROM'], answer: 0, explain: 'The ON condition is the matching rule. WHERE only filters rows, ORDER BY sorts, and table order does not matter for inner joins.' },
      hints: [
        `<p>Hint 1: Each output row needs columns from <b>two</b> tables, and the link between them is <code>orders.customer_id → customers.customer_id</code>.</p>`,
        `<p>Hint 2: Use <code>INNER JOIN … ON</code> for the link, and a <b>WHERE</b> for the "paid" filter (a property of the order, not of the relationship).</p>`,
        `<p>Hint 3: NULL or orphan customer ids drop out automatically with an inner join. Recipe: FROM orders o → JOIN customers c ON c.customer_id = o.customer_id → WHERE o.status = 'paid' → ORDER BY o.amount DESC.</p>`
      ],
      solution: {
        approach: `<p>Inner join orders to customers on the foreign key, then filter on status. Because each order points to at most one customer (customer_id is the customers primary key), the join cannot multiply rows: result ≤ number of paid orders.</p>`,
        code: { lang: 'sql', db: 'shop', code: `
SELECT o.order_id, c.name, c.city, o.amount
FROM orders AS o
JOIN customers AS c
  ON c.customer_id = o.customer_id     -- how the tables connect
WHERE o.status = 'paid'                -- which rows we want
ORDER BY o.amount DESC;` },
        complexity: `<p>With an index (or primary key) on <code>customers.customer_id</code>: O(P log C) for P paid orders via index lookups; a hash join is O(P + C). The sort adds O(k log k) for k output rows.</p>`,
        followUps: ['Also show paid orders with no known customer, labelled "unknown" (hint: LEFT JOIN from orders + COALESCE).', 'Return total paid amount per city.']
      }
    }]
  });

  /* ================= TOPIC 2: LEFT / RIGHT OUTER JOIN ================= */
  topics.push({
    title: 'LEFT and RIGHT OUTER JOIN: Keep Every Row from One Side (NULL-filled when no match)',
    analogy: `<p>A teacher takes the <b>class register</b> (the left table) and reads out <b>every</b> name, then looks in the homework pile (the right table) for that student's homework. Found it? Read the mark. Not found? She still reads the name and writes <b>"—"</b> next to it. Nobody on the register is skipped. A homework sheet with <b>no name on the register</b> (a visitor's sheet) is never read out.</p>
<p>That is a <b>LEFT JOIN</b>: every left row survives; the "—" is <code>NULL</code>. A <b>RIGHT JOIN</b> is the same teacher reading the homework pile instead of the register.</p>`,
    explain: `<p>🟢 <b>The plain idea.</b> <code>A LEFT JOIN B ON …</code> returns:</p>
<ol><li>every matching pair (exactly what INNER JOIN returns), <b>plus</b></li>
<li>every row of <b>A</b> that matched <b>nothing</b>, with all of B's columns set to <span class="c-p">NULL</span>.</li></ol>
${H.table(['customer', 'order_id', 'amount', 'why'], [['Asha', '101', '250', 'match'], ['Asha', '102', '80', 'match (Asha appears twice)'], ['Eli', '<span class="c-p">NULL</span>', '<span class="c-p">NULL</span>', 'no orders → kept, NULL-filled'], ['Fay', '<span class="c-p">NULL</span>', '<span class="c-p">NULL</span>', 'no orders → kept, NULL-filled']])}
<p>So a LEFT JOIN never has <b>fewer</b> rows than its left table (it can have more, when a left row has several matches). <code>LEFT OUTER JOIN</code> and <code>LEFT JOIN</code> are the same thing — OUTER is optional.</p>
<p><b>RIGHT JOIN</b> is the mirror image: keep every row of the <b>right</b> table. <code>A RIGHT JOIN B</code> returns exactly the same rows as <code>B LEFT JOIN A</code>. Most teams write only LEFT JOINs (put the "keep everything" table first) because queries read top-to-bottom like a story: "start from customers, attach what you can find".</p>
<p><b>Three habits that make outer joins correct:</b></p>
<ul>
<li><b>Count the right thing.</b> After a LEFT JOIN, a customer with no orders still produces one row, so <code>COUNT(*)</code> says 1. Use <code>COUNT(o.order_id)</code> — COUNT(column) skips NULLs — to get 0.</li>
<li><b>Turn NULL into a friendly default</b> with <code>COALESCE(SUM(o.amount), 0)</code> or <code>COALESCE(d.dept_name, 'Unassigned')</code>.</li>
<li><b>Test "no match" on a column that can never be NULL in a real match</b> — the right table's primary key or the join column: <code>WHERE o.order_id IS NULL</code>. Testing a nullable column (like <code>o.status</code>) cannot tell "no order" from "order with unknown status".</li>
</ul>
<p>⚠️ A filter on the <b>right</b> table placed in <code>WHERE</code> (e.g. <code>WHERE o.status = 'paid'</code>) throws away the NULL-filled rows and quietly turns your LEFT JOIN back into an INNER JOIN. That trap has its own topic below (ON vs WHERE).</p>`,
    clues: [
      '"<b>all</b> customers / <b>every</b> department / <b>including</b> those with no orders" → LEFT JOIN from the "all" table',
      '"show 0 for customers who never ordered" → LEFT JOIN + <code>COUNT(o.id)</code> / <code>COALESCE(SUM(…), 0)</code>',
      '"list X and its Y, if any" / "optional relationship" (employee may have no department) → LEFT JOIN',
      '"which X have <b>no</b> Y" → LEFT JOIN … WHERE y.pk IS NULL (anti-join) — or NOT EXISTS',
      'the question names the table to preserve on the right ("all orders, with customer if known") → RIGHT JOIN, or swap tables and use LEFT JOIN',
      'report must have one row per entity even when facts are missing (dashboards, zero-filled charts) → outer join from the dimension/entity table'
    ],
    code: [
      { lang: 'sql', db: 'shop', title: 'LEFT JOIN: every customer, with orders if any', code: `
SELECT c.customer_id, c.name, o.order_id, o.amount
FROM customers AS c
LEFT JOIN orders AS o
       ON o.customer_id = c.customer_id
ORDER BY c.customer_id, o.order_id;
-- Eli (5) and Fay (6) appear once with NULL order columns.
-- Orders 105 and 106 (no customer) do NOT appear: only the LEFT side is protected.` },
      { lang: 'sql', db: 'shop', title: 'RIGHT JOIN = the same join written from the other side', code: `
-- Every ORDER is kept; customer columns are NULL for the guest and the orphan order.
SELECT o.order_id, o.customer_id, c.name
FROM customers AS c
RIGHT JOIN orders AS o
        ON o.customer_id = c.customer_id
ORDER BY o.order_id;

-- Identical rows, written as a LEFT JOIN (the style most teams prefer):
SELECT o.order_id, o.customer_id, c.name
FROM orders AS o
LEFT JOIN customers AS c
       ON c.customer_id = o.customer_id
ORDER BY o.order_id;` }
    ],
    codeTitle: ['LEFT JOIN (shop DB)', 'RIGHT JOIN and its LEFT JOIN twin'],
    viz: custOrderViz('LEFT', 'LEFT JOIN: unmatched customers survive with NULLs', 'LEFT JOIN runs the same pair-by-pair scan as INNER JOIN, plus one extra rule: a customer that finishes its scan with zero matches is still emitted, NULL-filled.'),
    examples: [
      {
        title: 'Order count per customer: COUNT(*) lies, COUNT(column) tells the truth',
        html: `<p>Eli has no orders, yet <code>COUNT(*)</code> reports <span class="c-r">1</span> for him — it counts the NULL-filled row. <code>COUNT(o.order_id)</code> skips NULLs and correctly reports <span class="c-g">0</span>. Same idea for sums: <code>SUM</code> of nothing is NULL, so wrap it in COALESCE.</p>
${H.table(['name', 'COUNT(*)', 'COUNT(o.order_id)', 'COALESCE(SUM(amount),0)'], [['Asha', '2', '2', '330'], ['Eli', '<span class="c-r">1</span>', '<span class="c-g">0</span>', '0'], ['Fay', '<span class="c-r">1</span>', '<span class="c-g">0</span>', '0']])}`,
        code: { lang: 'sql', db: 'shop', code: `
SELECT c.name,
       COUNT(*)                    AS wrong_count,   -- counts the NULL-filled row
       COUNT(o.order_id)           AS order_count,   -- ignores NULLs -> 0
       COALESCE(SUM(o.amount), 0)  AS total_spent
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.customer_id
GROUP BY c.customer_id, c.name
ORDER BY c.customer_id;` }
      },
      {
        title: 'Why is dept_name NULL? Two different reasons',
        html: `<p>After <code>employees LEFT JOIN departments</code>, Vikram and Ishaan both show <code>dept_name = NULL</code>, for different reasons: Vikram's <code>dept_id</code> is itself NULL (never assigned), Ishaan's is <b>50</b> — a department that does not exist (a broken reference). Look at the <b>left</b> key to tell them apart. This is a classic data-quality check.</p>`,
        code: { lang: 'sql', db: 'company', code: `
SELECT e.name, e.dept_id,
       COALESCE(d.dept_name, 'Unassigned') AS dept_name,
       CASE
         WHEN e.dept_id IS NULL   THEN 'no department set'
         WHEN d.dept_id IS NULL   THEN 'BROKEN: dept ' || e.dept_id || ' missing'
         ELSE 'ok'
       END AS check_result
FROM employees e
LEFT JOIN departments d ON d.dept_id = e.dept_id
ORDER BY e.emp_id;` }
      },
      {
        title: 'Every department with its headcount (zero included)',
        html: `<p>The question says <b>every</b> department, so departments is the preserved (left) table. Legal has no employees and must show 0. If you had started from employees, Legal could never appear — it is not referenced by any employee row.</p>`,
        code: { lang: 'sql', db: 'company', code: `
SELECT d.dept_name,
       COUNT(e.emp_id)              AS headcount,
       COALESCE(MAX(e.salary), 0)   AS top_salary
FROM departments d
LEFT JOIN employees e ON e.dept_id = d.dept_id
GROUP BY d.dept_id, d.dept_name
ORDER BY headcount DESC, d.dept_name;` }
      },
      {
        title: 'Products that never sold (LEFT JOIN … IS NULL preview)',
        html: `<p>Keep every product, attach order lines, then keep only rows where the attachment failed. Test the <b>join column</b> of the right table (<code>i.product_id</code>), which can only be NULL when there was no match. Mystery Box and Plant Pot are the answer. This pattern is the <b>anti-join</b>, covered in depth later.</p>`,
        code: { lang: 'sql', db: 'shop', code: `
SELECT p.product_id, p.name
FROM products p
LEFT JOIN order_items i ON i.product_id = p.product_id
WHERE i.product_id IS NULL
ORDER BY p.product_id;` }
      }
    ],
    deepDive: `<p>🟣 <b>Algebra.</b> L ⟕ R = (L ⋈ R) ∪ ((L − π<sub>L</sub>(L ⋈ R)) × {NULLs}). Unlike inner joins, outer joins are <b>not commutative</b> (<code>A LEFT JOIN B</code> ≠ <code>B LEFT JOIN A</code>) and are only associative under conditions, so optimizers have far less freedom to reorder them. Your FROM clause order now carries meaning.</p>
<p><b>Outer-join simplification.</b> If a later WHERE condition rejects NULLs coming from the right side (e.g. <code>WHERE o.amount &gt; 0</code>), every NULL-filled row is discarded anyway, so the optimizer legally rewrites the LEFT JOIN as an INNER JOIN — the query behaves as INNER, which is usually not what the author intended. EXPLAIN in PostgreSQL will literally show an inner join.</p>
<p><b>Join elimination.</b> If you LEFT JOIN to a table on its <b>unique</b> key and never use any of its columns, the join cannot add or remove rows, so PostgreSQL and SQL Server drop it entirely. That is why views with many "just in case" left joins can still be fast.</p>
<p><b>Execution.</b> A hash or nested-loop left join must remember, per preserved row, whether anything matched. For RIGHT/FULL joins the engine must track matches on the <b>inner</b> side (a "matched" bit per hash-table entry), which is why SQLite only gained RIGHT and FULL OUTER JOIN in version 3.39 (2022). Older SQLite and some engines still require rewriting RIGHT as LEFT. MySQL supports LEFT and RIGHT but <b>not</b> FULL OUTER JOIN.</p>
<p><b>NULL-filled vs real NULL.</b> If the right table has a nullable column, a NULL there is ambiguous. Robust code tests the right side's primary key (never NULL in a real row) or uses EXISTS. Also remember <code>NOT NULL</code> constraints do not protect you: an outer join can still emit NULL in a NOT NULL column.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> Ask an assistant for "customers and their order counts" and you will often get an INNER JOIN with COUNT(*) — customers with zero orders silently vanish, and the dashboard looks fine. The model optimizes for a query that runs, not one that answers "all customers".</p>
<p><b>Use AI as a partner:</b> state the preservation rule explicitly in the prompt: <i>"Every customer must appear even with zero orders; show 0 not NULL."</i> Then ask it to <i>"list the edge-case rows (no orders, NULL keys, orphans) and show what your query outputs for each"</i>. Use it to generate test data with unmatched rows on both sides — exactly like the sample DBs here.</p>
<p><b>Where AI goes wrong:</b> COUNT(*) after LEFT JOIN, a right-table filter in WHERE (undoing the LEFT JOIN), and mixing RIGHT and LEFT joins in one query so nobody can tell which table is preserved. <b>What you must still own:</b> naming the preserved table, checking that row count ≥ left table count, and reading every NULL in the output as "was this missing data or no match?"</p>`,
    problems: [{
      title: 'Customer Spending Summary (zeros included)', level: 'Easy', tags: ['left join', 'aggregation', 'coalesce'], companies: ['Amazon', 'Shopify', 'Swiggy'],
      statement: `<p>For <b>every</b> customer in the shop database return <code>name</code>, <code>orders</code> (number of orders of any status) and <code>total_amount</code>. Customers who never ordered must appear with <b>0</b> and <b>0</b> (not NULL). Sort by total_amount descending, then name.</p>`,
      constraints: `<p>6 customers, 8 orders; some orders have NULL or orphan customer_id. Output exactly one row per customer.</p>`,
      example: `${H.table(['name', 'orders', 'total_amount'], [['Chen', '2', '340'], ['Asha', '2', '330'], ['Ben', '1', '120'], ['Dev', '1', '75'], ['Eli', '<span class="c-g">0</span>', '<span class="c-g">0</span>'], ['Fay', '<span class="c-g">0</span>', '<span class="c-g">0</span>']])}<p>Eli and Fay have no orders, so the LEFT JOIN gives them one NULL-filled row; COUNT(o.order_id) turns it into 0 and COALESCE turns the NULL sum into 0.</p>`,
      brute: {
        why: `<p>Two classic bugs at once. Using <code>COUNT(*)</code> counts the NULL-filled row, so Eli and Fay show <span class="c-r">1 order</span>. And <code>SUM(o.amount)</code> over only NULLs is <span class="c-r">NULL</span>, not 0. (Using INNER JOIN instead would be a third bug: Eli and Fay disappear entirely.)</p>`,
        code: { lang: 'sql', db: 'shop', code: `
-- WRONG: COUNT(*) counts the NULL-filled row; SUM of nothing is NULL
SELECT c.name, COUNT(*) AS orders, SUM(o.amount) AS total_amount
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.customer_id
GROUP BY c.customer_id, c.name
ORDER BY total_amount DESC, c.name;` }
      },
      mcq: { q: 'After <code>customers LEFT JOIN orders</code>, Eli (no orders) contributes how many rows to his group?', options: ['0', '1 (NULL-filled)', '2', 'It depends on ORDER BY'], answer: 1, explain: 'A LEFT JOIN keeps every left row: an unmatched customer appears exactly once with NULLs in the order columns. That one row is why COUNT(*) gives 1.' },
      hints: [
        `<p>Hint 1: "Every customer" means customers is the <b>preserved</b> table: start FROM customers and LEFT JOIN orders.</p>`,
        `<p>Hint 2: Count a column from the <b>right</b> table that is never NULL in a real match (<code>o.order_id</code>); aggregate functions skip NULLs.</p>`,
        `<p>Hint 3: Wrap the SUM in <code>COALESCE(…, 0)</code>. Group by the customer's primary key (names might repeat). Recipe: FROM customers LEFT JOIN orders → GROUP BY id → COUNT(o.order_id), COALESCE(SUM(o.amount),0) → ORDER BY.</p>`
      ],
      solution: {
        approach: `<p>Preserve customers with a LEFT JOIN, aggregate per customer, count only real orders, and replace the NULL sum with 0. Grouping by <code>customer_id</code> (not just name) keeps two customers with the same name separate.</p>`,
        code: { lang: 'sql', db: 'shop', code: `
SELECT c.name,
       COUNT(o.order_id)          AS orders,        -- NULL-filled row counts as 0
       COALESCE(SUM(o.amount), 0) AS total_amount   -- SUM over no rows is NULL
FROM customers AS c
LEFT JOIN orders AS o
       ON o.customer_id = c.customer_id
GROUP BY c.customer_id, c.name
ORDER BY total_amount DESC, c.name;` },
        alt: [{ lang: 'sql', db: 'shop', title: 'Alternative: correlated subqueries (no join, no fan-out)', code: `
SELECT c.name,
       (SELECT COUNT(*) FROM orders o WHERE o.customer_id = c.customer_id)                AS orders,
       (SELECT COALESCE(SUM(amount), 0) FROM orders o WHERE o.customer_id = c.customer_id) AS total_amount
FROM customers c
ORDER BY total_amount DESC, c.name;` }],
        complexity: `<p>One pass over both tables with a hash join or an index on <code>orders.customer_id</code>: O(C + O) plus O(C log C) to sort. The subquery version is O(C · log O) with that index.</p>`,
        followUps: ['Count only paid orders but still list every customer (careful where the filter goes!).', 'Add the date of each customer\'s most recent order (NULL if none).']
      }
    }]
  });

  /* ================= TOPIC 3: FULL OUTER JOIN ================= */
  topics.push({
    title: 'FULL OUTER JOIN: Keep Everything from Both Sides (reconciliation, UNION ALL emulation)',
    analogy: `<p>Two friends plan a wedding. One holds the <b>invitation list</b>, the other holds the <b>RSVP replies</b>. To check everything, they lay both lists side by side: names on both lists go on one line; an invited guest who never replied gets a line with an <b>empty RSVP column</b>; a reply from someone who was <b>never invited</b> (a plus-one, a typo) gets a line with an <b>empty invitation column</b>. Nobody from either list is left out.</p>
<p>That side-by-side sheet is a <b>FULL OUTER JOIN</b> — the tool for "compare two lists and show every difference".</p>`,
    explain: `<p>🟢 <b>The plain idea.</b> <code>A FULL OUTER JOIN B ON …</code> = <b>matches</b> + <b>A rows with no match</b> (B columns NULL) + <b>B rows with no match</b> (A columns NULL). It is a LEFT JOIN and a RIGHT JOIN rolled into one, without duplicating the matches.</p>
${H.table(['customer', 'order', 'category'], [['Asha', '101', '<span class="c-g">matched</span>'], ['Eli', '<span class="c-p">NULL</span>', '<span class="c-y">only in customers</span>'], ['<span class="c-p">NULL</span>', '105 (guest)', '<span class="c-r">only in orders</span>'], ['<span class="c-p">NULL</span>', '106 (cust 9)', '<span class="c-r">only in orders</span>']])}
<p><b>When do you need it?</b> Whenever <b>neither</b> table is "the master list":</p>
<ul>
<li><b>Reconciliation</b>: invoices vs payments, bank statement vs ledger, warehouse count vs system stock.</li>
<li><b>Comparing two snapshots</b>: yesterday's table vs today's → added, removed, changed rows.</li>
<li><b>Migrations</b>: old system vs new system — prove every row arrived and nothing extra appeared.</li>
<li><b>Merging two time series</b> with gaps on different dates (sales by day + returns by day).</li>
</ul>
<p><b>Two helpers you will always use with it:</b></p>
<ul>
<li><code>COALESCE(a.key, b.key) AS key</code> — one clean key column, because on unmatched rows one side's key is NULL.</li>
<li>A <code>CASE</code> label: <code>WHEN a.key IS NULL THEN 'only in B' WHEN b.key IS NULL THEN 'only in A' ELSE 'both' END</code>.</li>
</ul>
<p><b>No FULL JOIN in your database?</b> (MySQL, old SQLite) Emulate it: <b>LEFT JOIN</b> (matches + left leftovers) <code>UNION ALL</code> the <b>right rows that have no match</b> (an anti-join). Do not just glue a LEFT and a RIGHT join with plain <code>UNION</code>: it removes duplicates, which also deletes legitimately identical rows, and it costs a sort.</p>`,
    clues: [
      '"reconcile", "compare two lists / two sources", "find mismatches on <b>both</b> sides" → FULL OUTER JOIN',
      '"rows that are in A but not B, <b>and</b> rows in B but not A" in one result → FULL JOIN + WHERE a.key IS NULL OR b.key IS NULL',
      '"what changed between yesterday and today (added / removed / modified)" → FULL JOIN on the business key + CASE',
      '"combine two daily series, fill missing days with 0" → FULL JOIN on date + COALESCE',
      '"MySQL" + "full outer join" → LEFT JOIN UNION ALL anti-join emulation',
      'neither table is the master list / both may have orphans → FULL, not LEFT'
    ],
    code: [
      { lang: 'sql', db: 'shop', title: 'FULL OUTER JOIN with a match-category label', code: `
SELECT COALESCE(c.customer_id, o.customer_id) AS customer_key,  -- one key column
       c.name, o.order_id, o.amount,
       CASE
         WHEN c.customer_id IS NULL THEN 'order without customer'
         WHEN o.order_id    IS NULL THEN 'customer without orders'
         ELSE 'matched'
       END AS category
FROM customers AS c
FULL OUTER JOIN orders AS o
  ON o.customer_id = c.customer_id
ORDER BY category, customer_key, o.order_id;` },
      { lang: 'sql', db: 'shop', title: 'Emulating FULL OUTER JOIN (MySQL-style) with LEFT JOIN + UNION ALL', code: `
-- Part 1: matches + customers with no orders
SELECT c.customer_id, c.name, o.order_id
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.customer_id
UNION ALL
-- Part 2: orders with no customer (anti-join) -> the rows LEFT JOIN could not see
SELECT NULL, NULL, o.order_id
FROM orders o
WHERE NOT EXISTS (SELECT 1 FROM customers c WHERE c.customer_id = o.customer_id)
ORDER BY 1, 3;` }
    ],
    codeTitle: ['FULL OUTER JOIN (SQLite 3.39+)', 'Portable emulation'],
    viz: custOrderViz('FULL', 'FULL OUTER JOIN: left leftovers, then right leftovers', 'FULL OUTER JOIN does the LEFT JOIN scan and remembers which orders were ever matched; a second pass emits the never-matched orders.'),
    examples: [
      {
        title: 'Billed vs paid reconciliation per order',
        html: `<p>Finance wants every order and every payment, side by side. Orders 103 and 107 have no payment, payment 9 points to order 110 that does not exist, and order 108 is <b>under-paid</b> (75 billed, 70 paid). Payments are <b>aggregated first</b> in a CTE (order 101 has two payments) so the join is one-to-one — joining raw payments would duplicate order rows.</p>
${H.table(['order', 'billed', 'paid', 'verdict'], [['101', '250', '250', '<span class="c-g">ok</span>'], ['103', '120', 'NULL', '<span class="c-y">unpaid</span>'], ['108', '75', '70', '<span class="c-r">mismatch</span>'], ['110', 'NULL', '30', '<span class="c-r">payment for unknown order</span>']])}`,
        code: { lang: 'sql', db: 'shop', code: `
WITH paid AS (
  SELECT order_id, SUM(amount) AS paid_amount
  FROM payments
  GROUP BY order_id                     -- one row per order -> no duplicates
)
SELECT COALESCE(o.order_id, p.order_id) AS order_id,
       o.amount       AS billed,
       p.paid_amount  AS paid,
       CASE
         WHEN o.order_id IS NULL        THEN 'payment for unknown order'
         WHEN p.order_id IS NULL        THEN 'unpaid'
         WHEN o.amount <> p.paid_amount THEN 'mismatch'
         ELSE 'ok'
       END AS verdict
FROM orders o
FULL OUTER JOIN paid p ON p.order_id = o.order_id
ORDER BY 1;` }
      },
      {
        title: 'Snapshot diff: what changed between yesterday and today?',
        html: `<p>Compare two versions of a stock table on the business key <code>sku</code>. FULL JOIN puts both versions on one row; the CASE classifies <span class="c-g">added</span>, <span class="c-r">removed</span>, <span class="c-y">changed</span> and unchanged. This is the core of change-data-capture checks and migration testing. Note <code>IS NOT</code> (NULL-safe "different") so a NULL quantity compares sensibly.</p>`,
        code: { lang: 'sql', db: 'shop', code: `
WITH yesterday(sku, qty) AS (VALUES ('A', 10), ('B', 5), ('C', 7), ('D', NULL)),
     today(sku, qty)     AS (VALUES ('A', 10), ('B', 3), ('D', 4), ('E', 9))
SELECT COALESCE(y.sku, t.sku) AS sku, y.qty AS old_qty, t.qty AS new_qty,
       CASE
         WHEN y.sku IS NULL     THEN 'added'
         WHEN t.sku IS NULL     THEN 'removed'
         WHEN y.qty IS NOT t.qty THEN 'changed'    -- NULL-safe inequality in SQLite
         ELSE 'same'
       END AS change
FROM yesterday y
FULL OUTER JOIN today t ON t.sku = y.sku
ORDER BY sku;` }
      },
      {
        title: 'Only the differences: FULL JOIN + "either side is NULL"',
        html: `<p>For an audit you usually want <b>only</b> the problem rows. Keep rows where one side is missing. In our employees/departments data that finds Vikram (no dept), Ishaan (dept 50 missing) and Legal (no staff) in one query.</p>`,
        code: { lang: 'sql', db: 'company', code: `
SELECT e.name AS employee, e.dept_id AS emp_dept_id, d.dept_name
FROM employees e
FULL OUTER JOIN departments d ON d.dept_id = e.dept_id
WHERE e.emp_id IS NULL      -- department with no employees
   OR d.dept_id IS NULL     -- employee whose department is NULL or missing
ORDER BY d.dept_name, e.name;` }
      },
      {
        title: 'Merging two daily series with gaps',
        html: `<p>Sales exist on days 1, 2, 4; refunds on days 2, 3. FULL JOIN on the date gives every day that appears in <b>either</b> series, and COALESCE turns the missing side into 0 so the net column is never NULL.</p>`,
        code: { lang: 'sql', db: 'shop', code: `
WITH sales(day, amt)   AS (VALUES ('2026-03-01', 100), ('2026-03-02', 50), ('2026-03-04', 70)),
     refunds(day, amt) AS (VALUES ('2026-03-02', 20), ('2026-03-03', 15))
SELECT COALESCE(s.day, r.day)              AS day,
       COALESCE(s.amt, 0)                  AS sales,
       COALESCE(r.amt, 0)                  AS refunds,
       COALESCE(s.amt, 0) - COALESCE(r.amt, 0) AS net
FROM sales s
FULL OUTER JOIN refunds r ON r.day = s.day
ORDER BY day;` }
      }
    ],
    deepDive: `<p>🟣 <b>Algebra.</b> A ⟗ B = (A ⋈ B) ∪ (unmatched A padded) ∪ (unmatched B padded). It is commutative (<code>A FULL JOIN B</code> = <code>B FULL JOIN A</code> up to column order) but filters on either side are dangerous: <code>WHERE a.x = 5</code> removes every right-only row (their <code>a.x</code> is NULL) and you are back to a LEFT JOIN; filter both sides and it degrades to INNER. Put side-specific filters in subqueries/CTEs <b>before</b> the full join.</p>
<p><b>Physical execution.</b> A FULL join must track which inner rows were ever matched. Hash join: a "matched" flag per hash entry, then a final scan of the hash table emits the unmatched ones. Merge join: walk both sorted inputs and emit whichever side is behind. PostgreSQL only supports FULL JOIN when the condition is merge- or hash-joinable (essentially equality) — a <code>FULL JOIN … ON a.x &lt; b.y</code> errors there. SQLite (since 3.39.0) implements RIGHT and FULL joins with an extra pass over the right table.</p>
<p><b>USING + FULL JOIN.</b> In standard SQL, <code>FULL JOIN … USING (k)</code> produces a single column <code>k</code> equal to <code>COALESCE(a.k, b.k)</code>. Writing the COALESCE explicitly is clearer and portable.</p>
<p><b>Duplicates.</b> If either side has several rows per key, a FULL JOIN multiplies them exactly like an inner join. Reconciliation queries therefore <b>aggregate each side to one row per key first</b> (as in the billed-vs-paid example). <b>Emulation detail:</b> the second branch of the UNION ALL emulation must be an anti-join (NOT EXISTS or LEFT JOIN … IS NULL), not a RIGHT JOIN, otherwise the matched rows appear twice.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> Reconciliation used to mean hours in spreadsheets with VLOOKUPs in both directions. Today an assistant can draft the FULL JOIN + CASE classification in seconds, and data-diff tools compare whole tables across databases automatically.</p>
<p><b>Use AI as a partner:</b> describe the two sources and the business key, and ask for <i>"a FULL OUTER JOIN reconciliation that labels only-in-A, only-in-B, value-mismatch, and pre-aggregates each side to one row per key"</i>. Ask it to emulate it for MySQL if that is your engine.</p>
<p><b>Where AI goes wrong:</b> it joins raw payment rows (double-counting orders paid in instalments), emulates FULL JOIN with <code>UNION</code> (silently de-duplicating) or with LEFT UNION RIGHT (duplicating matches with UNION ALL), and puts a WHERE on one side that cancels half the outer join. <b>What you must still own:</b> choosing the business key, deciding the grain of each side, and treating NULL-vs-value differences correctly (<code>IS DISTINCT FROM</code>).</p>`,
    problems: [{
      title: 'Customer ↔ Order Integrity Report', level: 'Medium', tags: ['full outer join', 'data quality', 'case'], companies: ['Stripe', 'Razorpay', 'Deloitte'],
      statement: `<p>The data team wants one report of <b>every</b> customer and <b>every</b> order. Return <code>customer_id</code> (from either side), <code>name</code>, <code>order_id</code> and <code>issue</code>, where issue is <code>'no orders'</code> for customers who never ordered, <code>'guest order'</code> for orders with NULL customer_id, <code>'orphan order'</code> for orders whose customer does not exist, and <code>'ok'</code> for matched rows. Show only rows whose issue is not 'ok'.</p>`,
      constraints: `<p>Use the shop DB. Do not hard-code ids. One query.</p>`,
      example: `${H.table(['customer_id', 'name', 'order_id', 'issue'], [['5', 'Eli', 'NULL', 'no orders'], ['6', 'Fay', 'NULL', 'no orders'], ['NULL', 'NULL', '105', 'guest order'], ['9', 'NULL', '106', 'orphan order']])}<p>Order 105 has customer_id NULL (a guest), order 106 points at customer 9 who no longer exists — ${H.c('r', 'both are invisible to a LEFT JOIN from customers')}.</p>`,
      brute: {
        why: `<p>Starting from customers with a LEFT JOIN only protects the <b>customer</b> side. The guest order and the orphan order have no customer to hang on to, so they never appear: the report "proves" there are no orphan orders when there are two. Half the problems are silently hidden.</p>`,
        code: { lang: 'sql', db: 'shop', code: `
-- INCOMPLETE: LEFT JOIN cannot see orders without a customer
SELECT c.customer_id, c.name, o.order_id,
       CASE WHEN o.order_id IS NULL THEN 'no orders' ELSE 'ok' END AS issue
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.customer_id
WHERE o.order_id IS NULL;` }
      },
      mcq: { q: 'An order has <code>customer_id = 9</code> but no customer 9 exists. In <code>customers c FULL JOIN orders o</code>, what is <code>c.customer_id</code> on its row?', options: ['9', 'NULL', 'The row is dropped', '0'], answer: 1, explain: 'The order is a right-side leftover, so every customers column — including c.customer_id — is NULL. That is why you need COALESCE(c.customer_id, o.customer_id) and must look at o.customer_id to tell guest (NULL) from orphan (9).' },
      hints: [
        `<p>Hint 1: Problems exist on <b>both</b> sides (customers without orders and orders without customers) → FULL OUTER JOIN.</p>`,
        `<p>Hint 2: On a right-only row, <code>c.customer_id</code> is NULL; distinguish guest vs orphan by checking whether <code>o.customer_id</code> itself is NULL.</p>`,
        `<p>Hint 3: Compute the label with CASE, then filter on it (wrap in a CTE, or repeat the condition). Recipe: FULL JOIN → CASE (c NULL &amp; o.cust NULL → guest; c NULL → orphan; o NULL → no orders; else ok) → keep issue ≠ 'ok'.</p>`
      ],
      solution: {
        approach: `<p>FULL OUTER JOIN keeps unmatched rows from both tables. A CASE on which side is NULL (and whether the order's own key is NULL) labels each row; a CTE lets us filter on the label cleanly.</p>`,
        code: { lang: 'sql', db: 'shop', code: `
WITH report AS (
  SELECT COALESCE(c.customer_id, o.customer_id) AS customer_id,
         c.name, o.order_id,
         CASE
           WHEN c.customer_id IS NULL AND o.customer_id IS NULL THEN 'guest order'
           WHEN c.customer_id IS NULL                           THEN 'orphan order'
           WHEN o.order_id IS NULL                              THEN 'no orders'
           ELSE 'ok'
         END AS issue
  FROM customers AS c
  FULL OUTER JOIN orders AS o
    ON o.customer_id = c.customer_id
)
SELECT customer_id, name, order_id, issue
FROM report
WHERE issue <> 'ok'
ORDER BY issue, customer_id, order_id;` },
        alt: [{ lang: 'sql', db: 'shop', title: 'Portable version without FULL JOIN (UNION ALL of two anti-joins)', code: `
SELECT c.customer_id, c.name, NULL AS order_id, 'no orders' AS issue
FROM customers c
WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.customer_id)
UNION ALL
SELECT o.customer_id, NULL, o.order_id,
       CASE WHEN o.customer_id IS NULL THEN 'guest order' ELSE 'orphan order' END
FROM orders o
WHERE NOT EXISTS (SELECT 1 FROM customers c WHERE c.customer_id = o.customer_id)
ORDER BY issue, customer_id, order_id;` }],
        complexity: `<p>Hash full join: O(C + O) time, O(min(C, O)) memory for the hash table plus matched flags. The anti-join version does two semi/anti probes, also O(C + O) with indexes on both keys.</p>`,
        followUps: ['Also flag customers whose referred_by points to a missing customer.', 'How would you run this daily and alert only on NEW problems?']
      }
    }]
  });

  /* ================= TOPIC 4: CROSS JOIN ================= */
  topics.push({
    title: 'CROSS JOIN: Every Row with Every Row (Cartesian product, scaffolds, accidental explosions)',
    analogy: `<p>A café board says: <b>"Pick any sandwich + any drink"</b>. With 3 sandwiches and 2 drinks there are 3 × 2 = <b>6 combos</b>, and nobody checks whether they "match" — every sandwich goes with every drink. Add 4 desserts and it is 24 combos. Combos multiply fast.</p>
<p>A <b>CROSS JOIN</b> builds that full combo board: every row of the first table paired with every row of the second, no matching rule at all.</p>`,
    explain: `<p>🟢 <b>The plain idea.</b> <code>A CROSS JOIN B</code> returns <b>|A| × |B|</b> rows — the <b>Cartesian product</b>. There is no ON clause, because nothing is being matched.</p>
${H.table(['', 'Red', 'Blue'], [['<b>S</b>', 'S-Red', 'S-Blue'], ['<b>M</b>', 'M-Red', 'M-Blue'], ['<b>L</b>', 'L-Red', 'L-Blue']])}
<p>Three ways to write it (same result): <code>FROM sizes CROSS JOIN colors</code> (clearest — says "yes, I mean it"), <code>FROM sizes, colors</code> (comma with no WHERE), and in SQLite/MySQL <code>FROM sizes JOIN colors</code> with no ON. Also, any join whose ON is always true (<code>ON 1 = 1</code>) behaves like a cross join.</p>
<p><b>Useful on purpose:</b></p>
<ul>
<li><b>Generating combinations</b>: product variants (size × color), test cases, schedule slots (day × time).</li>
<li><b>Scaffolds for zero-filled reports</b>: build every (store, day) or (student, course) pair with a CROSS JOIN, then LEFT JOIN the real facts onto it, so missing combinations show as 0 instead of disappearing.</li>
<li><b>Attaching a single row to every row</b>: <code>CROSS JOIN (SELECT SUM(amount) AS total FROM orders)</code> lets each row compute its percentage of the total.</li>
</ul>
<p><b>Dangerous by accident:</b> forgetting a join condition silently creates a cross join. 10,000 customers × 1,000,000 orders = <span class="c-r">10 billion rows</span> — the query never finishes, or a report quietly over-counts. A quick sanity check: if a result row count is roughly the <b>product</b> of two table sizes, you have a cross join somewhere.</p>`,
    clues: [
      '"every combination", "all pairs", "each X with each Y" (sizes × colors, players × players) → CROSS JOIN',
      '"show 0 for days / stores / products with no sales" → CROSS JOIN a scaffold, then LEFT JOIN facts',
      '"percentage of total" next to each row → CROSS JOIN a one-row totals subquery (or a window function)',
      'result has |A| × |B| rows, or the query "hangs" → accidental cross join (missing ON / WHERE)',
      '"generate a calendar / matrix / grid" → CROSS JOIN of small dimension lists',
      '"round-robin fixtures: every team plays every other team" → self cross join with a.id &lt; b.id'
    ],
    code: [
      { lang: 'sql', db: 'shop', title: 'All product variants: sizes × colors', code: `
SELECT s.size, c.color,
       'TEE-' || s.size || '-' || UPPER(SUBSTR(c.color, 1, 1)) AS sku
FROM sizes  AS s
CROSS JOIN colors AS c          -- 3 x 2 = 6 rows, no ON clause
ORDER BY c.color, s.size;` },
      { lang: 'sql', db: 'shop', title: 'Each order as a % of all revenue (one-row cross join)', code: `
SELECT o.order_id, o.amount,
       ROUND(100.0 * o.amount / t.total, 1) AS pct_of_total
FROM orders o
CROSS JOIN (SELECT SUM(amount) AS total FROM orders) AS t   -- exactly 1 row
ORDER BY pct_of_total DESC;` }
    ],
    codeTitle: ['Combinations', 'Attach a single-row total'],
    viz: {
      title: 'CROSS JOIN: every pair matches, the result multiplies',
      input: 'S M L | Red Blue',
      inputLabel: 'left values | right values (≤ 6 each)',
      gen: function (input) {
        var sides = String(input === undefined ? '' : input).split('|');
        if (sides.length !== 2) throw new Error('Format: S M L | Red Blue');
        var A = toks(sides[0]), B = toks(sides[1]);
        if (!A.length || !B.length) throw new Error('Both sides need at least one value');
        if (A.length > 6 || B.length > 6) throw new Error('At most 6 values per side');
        var r = runJoin({
          type: 'CROSS',
          L: { label: 'sizes s', cols: ['size'], rows: A.map(function (x) { return [x]; }) },
          R: { label: 'colors c', cols: ['color'], rows: B.map(function (x) { return [x]; }) },
          test: function () { return true; },
          say: function (l, rr) { return 'Pair <b>' + sv(l[0]) + '</b> with <b>' + sv(rr[0]) + '</b>: there is no ON condition, so the pair is automatically kept'; },
          outCols: ['s.size', 'c.color'],
          out: function (l, rr) { return [l[0], rr[0]]; },
          sql: 'SELECT s.size, c.color\nFROM sizes AS s\nCROSS JOIN colors AS c;   -- no ON at all', lines: { scan: 3, emit: 1 },
          intro: 'CROSS JOIN = nested loop with <b>no test</b>. Every left row will pair with every right row.',
          outro: function (res) { return 'Done: ' + A.length + ' × ' + B.length + ' = <b>' + res.length + '</b> rows. Every left value appears ' + B.length + ' times and every right value ' + A.length + ' times.'; }
        });
        var f = r.frames;
        var n1 = A.length * B.length;
        f.push(fr('Why accidental cross joins are scary: the row count is a <b>product</b>. Add one more table and it multiplies again.', [
          { type: 'bars', label: 'rows produced (bar height = log₁₀ of the count + 1)', values: [A.length, n1, n1 * 4, 1000 * 1000].map(function (x) { return Math.round((Math.log(x) / Math.LN10 + 1) * 10) / 10; }), texts: [String(A.length), String(n1), String(n1 * 4), '1,000,000'], idxLabels: ['|sizes|', 'sizes×colors', '×4 more rows', '1k × 1k'] },
          vars({ customers: 10000, orders: 1000000, forgot_ON_rows: '10,000,000,000' }, { forgot_ON_rows: 'bad' }, 'Forgot the ON clause on real tables?'),
          txt('Rule of thumb: if a result count ≈ |A| × |B|, look for a missing join condition.')
        ]));
        return f;
      }
    },
    examples: [
      {
        title: 'Zero-filled report: hours per (employee, project) for every Engineering pair',
        html: `<p>The manager wants a grid of <b>every</b> Engineering employee against <b>every</b> Engineering project, with 0 where nobody logged time. Assignments alone cannot produce the missing pairs — they do not exist as rows. CROSS JOIN builds the scaffold (4 employees × 2 projects = 8 cells), LEFT JOIN attaches real hours, COALESCE fills the gaps.</p>`,
        code: { lang: 'sql', db: 'company', code: `
SELECT e.name, p.name AS project, COALESCE(a.hours, 0) AS hours
FROM employees e
CROSS JOIN projects p                                  -- scaffold: every pair
LEFT JOIN assignments a
       ON a.emp_id = e.emp_id AND a.project_id = p.project_id
WHERE e.dept_id = 10 AND p.dept_id = 10
ORDER BY e.name, project;` }
      },
      {
        title: 'Round-robin fixtures: every team vs every other team once',
        html: `<p>A self cross join of 4 teams gives 16 pairs, including "A vs A" and both "A vs B" and "B vs A". Filtering <code>a.team &lt; b.team</code> keeps each unordered pair exactly once: 4·3/2 = <b>6</b> matches. The same trick finds all pairs of customers in the same city, all pairs of overlapping meetings, and so on.</p>`,
        code: { lang: 'sql', db: 'shop', code: `
WITH teams(team) AS (VALUES ('Ants'), ('Bees'), ('Cats'), ('Dogs'))
SELECT a.team AS home, b.team AS away
FROM teams a
CROSS JOIN teams b
WHERE a.team < b.team          -- removes self-pairs and mirror duplicates
ORDER BY home, away;` }
      },
      {
        title: 'Spotting an accidental cross join by its row count',
        html: `<p>Three tables but only one join condition: <code>order_items</code> is never connected, so every customer-order row is repeated for <b>all 11</b> order lines. The count check exposes it: 6 matched customer-order rows × 11 items = 66. The fixed query connects every table and returns the real 8 lines (order lines of the 6 orders that have a customer).</p>`,
        code: { lang: 'sql', db: 'shop', code: `
-- BUG: order_items joined with no condition (a hidden cross join)
SELECT COUNT(*) AS buggy_rows
FROM customers c
JOIN orders o ON o.customer_id = c.customer_id, order_items i;

-- FIX: every table gets its own ON condition
SELECT COUNT(*) AS correct_rows
FROM customers c
JOIN orders o      ON o.customer_id = c.customer_id
JOIN order_items i ON i.order_id    = o.order_id;` }
      },
      {
        title: 'A calendar of months × departments with hire counts',
        html: `<p>Generate the 12 months with a recursive CTE (you will master those in the next module), cross join departments, then LEFT JOIN employees by hire month. Months with no hires show 0 — perfect input for a chart where every bar must exist.</p>`,
        code: { lang: 'sql', db: 'company', code: `
WITH RECURSIVE months(m) AS (
  SELECT 1 UNION ALL SELECT m + 1 FROM months WHERE m < 12
)
SELECT d.dept_name, months.m AS hire_month, COUNT(e.emp_id) AS hires_ever
FROM departments d
CROSS JOIN months
LEFT JOIN employees e
       ON e.dept_id = d.dept_id
      AND CAST(STRFTIME('%m', e.hire_date) AS INTEGER) = months.m
WHERE d.dept_id IN (10, 20)
GROUP BY d.dept_name, months.m
ORDER BY d.dept_name, hire_month;` }
      }
    ],
    deepDive: `<p>🟣 <b>Algebra.</b> The Cartesian product A × B is the <b>foundation</b> of every join: L ⋈<sub>θ</sub> R ≡ σ<sub>θ</sub>(L × R). Engines never materialize the product for a real join, but for a true CROSS JOIN they must: output size is exactly |A|·|B|, so the cost is unavoidable — keep at least one side tiny.</p>
<p><b>SQLite quirk worth knowing:</b> SQLite's planner treats the keyword <code>CROSS JOIN</code> as a <b>hint</b>: it never reorders tables around it, so the left table is always the outer loop. Experts use this to pin a join order when the planner chooses badly. Other engines treat CROSS JOIN as an ordinary product and reorder freely.</p>
<p><b>Unnesting.</b> PostgreSQL's <code>CROSS JOIN LATERAL</code> (and SQL Server's <code>CROSS APPLY</code>) let the right side refer to the current left row — e.g. "for each customer, their top 2 orders". It is a correlated cross join, used for top-N-per-group and for expanding JSON arrays (<code>CROSS JOIN json_each(...)</code> in SQLite). It is not a plain Cartesian product any more.</p>
<p><b>Performance of scaffolds.</b> A date × store scaffold for 3 years × 2,000 stores is ~2.2 M rows — fine. A user × product scaffold for 10 M users × 100 k products is 10<sup>12</sup> — never build that; instead aggregate the facts and fill gaps in the application or BI tool. <b>Statistics trap:</b> optimizers estimate join sizes assuming independence; a missing condition can make an estimate explode and push the planner into a terrible plan even before execution.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> AI is great at producing scaffolds ("generate every date in 2026 and every store, zero-fill sales") — tedious SQL you used to copy from old projects. It also spots "this join has no condition" quickly when you paste a slow query.</p>
<p><b>Use AI as a partner:</b> ask <i>"estimate the row count of each intermediate step of this query given these table sizes"</i>. Any step whose estimate is a product of two big tables is a red flag. Ask it to rewrite comma-style FROM lists as explicit JOIN … ON so a missing condition becomes visible.</p>
<p><b>Where AI goes wrong:</b> generating a scaffold over huge dimensions (users × products), using CROSS JOIN where a window function (<code>SUM(amount) OVER ()</code>) is simpler, and mixing comma joins with explicit JOINs (precedence surprises in MySQL). <b>What you must still own:</b> the size math — always multiply table sizes in your head before running a query that pairs things.</p>`,
    problems: [{
      title: 'Enrollment Matrix (every student × every course)', level: 'Medium', tags: ['cross join', 'left join', 'scaffold'], companies: ['Coursera', 'Byju\'s', 'Google'],
      statement: `<p>Using the school DB, build a matrix with one row for <b>every</b> (student, course) pair — including students who took nothing and courses nobody took. Columns: <code>student, course, status</code> where status is the grade if graded, <code>'enrolled'</code> if enrolled but not graded, and <code>'-'</code> if not enrolled.</p>`,
      constraints: `<p>5 students × 4 courses = exactly 20 rows. Enrollments contain an orphan student (6) and a NULL course_id — neither must create extra rows.</p>`,
      example: `${H.table(['student', 'course', 'status'], [['Aanya', 'Databases', 'A'], ['Bilal', 'Algorithms', '<span class="c-y">enrolled</span>'], ['Esha', 'Databases', '<span class="c-m">-</span>'], ['Esha', 'Poetry', '<span class="c-m">-</span>']])}<p>Esha took nothing and Poetry has nobody, yet both appear in every pairing — that only works with a ${H.c('b', 'scaffold')} built by CROSS JOIN.</p>`,
      brute: {
        why: `<p>Starting from enrollments (or students LEFT JOIN enrollments) only produces pairs that already exist as enrollment rows, plus one NULL row for Esha. Missing pairs like (Bilal, Poetry) can never appear, because no row exists to carry them — you get 10 rows, not 20.</p>`,
        code: { lang: 'sql', db: 'school', code: `
-- WRONG: only existing enrollments (+ Esha as one NULL row), not the full matrix
SELECT s.name AS student, c.title AS course,
       COALESCE(e.grade, 'enrolled') AS status
FROM students s
LEFT JOIN enrollments e ON e.student_id = s.student_id
LEFT JOIN courses c     ON c.course_id  = e.course_id
ORDER BY student, course;` }
      },
      mcq: { q: 'Which step creates the row (Esha, Poetry) when neither has any enrollment?', options: ['students CROSS JOIN courses', 'LEFT JOIN enrollments', 'COALESCE', 'ORDER BY'], answer: 0, explain: 'Only the Cartesian product invents pairs that are not stored anywhere. The LEFT JOIN then decorates each pair with enrollment info if it exists.' },
      hints: [
        `<p>Hint 1: The rows you need (every pair) do not exist in any table — you have to <b>generate</b> them.</p>`,
        `<p>Hint 2: <code>students CROSS JOIN courses</code> gives the 20-pair scaffold; then LEFT JOIN enrollments on <b>both</b> student_id and course_id.</p>`,
        `<p>Hint 3: Status: CASE WHEN e.student_id IS NULL THEN '-' ELSE COALESCE(e.grade, 'enrolled') END. Test e.student_id (join column), not e.grade, to detect "not enrolled".</p>`
      ],
      solution: {
        approach: `<p>Scaffold + decorate: the cross join enumerates every (student, course) pair; a LEFT JOIN on the two-column key attaches the enrollment if one exists; CASE turns the three possible states into labels. Orphan enrollments never match a scaffold row, so they add nothing.</p>`,
        code: { lang: 'sql', db: 'school', code: `
SELECT s.name  AS student,
       c.title AS course,
       CASE
         WHEN e.student_id IS NULL THEN '-'                 -- no enrollment row
         ELSE COALESCE(e.grade, 'enrolled')                 -- enrolled, maybe ungraded
       END AS status
FROM students s
CROSS JOIN courses c                                      -- 5 x 4 = 20 pairs
LEFT JOIN enrollments e
       ON e.student_id = s.student_id
      AND e.course_id  = c.course_id                      -- match on the full pair
ORDER BY s.student_id, c.course_id;` },
        complexity: `<p>Scaffold is S × C rows (20 here); each probes enrollments by (student_id, course_id) — O(S·C·log E) with a composite index, O(S·C + E) with a hash join.</p>`,
        followUps: ['Pivot it: one row per student, one column per course (conditional aggregation).', 'Show only the empty cells — which (student, course) pairs are missing?']
      }
    }]
  });

  /* ================= TOPIC 5: SELF JOIN ================= */
  topics.push({
    title: 'Self Joins: A Table Joined to Itself (employee → manager, pairs, row-to-row comparisons)',
    analogy: `<p>Picture a <b>staff photo board</b> where each card says "my manager is #2". To write "Kabir reports to Arjun" you look at the board <b>twice</b>: first to read Kabir's card, then — on the very same board — to find card #2 and read the name. You are not using a second board; you are just using the same board in <b>two roles</b>: "the employee" and "the manager".</p>
<p>A <b>self join</b> is exactly that: one table, two aliases, each alias playing a different role.</p>`,
    explain: `<p>🟢 <b>The plain idea.</b> Some tables point at themselves: <code>employees.manager_id</code> holds another <code>emp_id</code>; <code>customers.referred_by</code> holds another <code>customer_id</code>. To turn that id into a name, join the table to <b>itself</b> under two different aliases:</p>
<pre>SELECT e.name AS employee, m.name AS manager
FROM employees AS e            -- role 1: the employee
LEFT JOIN employees AS m       -- role 2: the manager (same table!)
       ON m.emp_id = e.manager_id;</pre>
<p>Aliases are <b>mandatory</b> here — without them <code>name</code> would be hopelessly ambiguous. Pick role names (<code>e</code>/<code>m</code>, <code>emp</code>/<code>boss</code>, <code>today</code>/<code>yesterday</code>), not <code>a</code>/<code>b</code>, so the query reads like English.</p>
${H.table(['e.name', 'e.manager_id', 'm.name (INNER)', 'm.name (LEFT)'], [['Meera', 'NULL', '<span class="c-r">row dropped</span>', '<span class="c-p">NULL</span> (CEO)'], ['Arjun', '1', 'Meera', 'Meera'], ['Kabir', '2', 'Arjun', 'Arjun'], ['Neha', '12', '<span class="c-r">row dropped</span>', '<span class="c-p">NULL</span> (manager left)']])}
<p><b>INNER or LEFT?</b> The CEO has no manager (<code>manager_id</code> is NULL), so an INNER self join drops the CEO. If the question says "all employees", use LEFT.</p>
<p><b>Three families of self-join questions:</b></p>
<ol>
<li><b>Hierarchy lookups</b>: employee → manager, product → parent category, comment → reply-to. Two levels? Self-join twice (<code>e → m → mm</code>). Unknown depth? You need a <b>recursive CTE</b> (next module).</li>
<li><b>Compare a row with a related row</b>: "employees who earn more than their manager" (<code>e.salary &gt; m.salary</code>), "days warmer than the previous day" (join <code>today</code> to <code>yesterday</code> on <code>date − 1</code>).</li>
<li><b>Pairs within one table</b>: "customers in the same city", "duplicate emails". Use <code>a.id &lt; b.id</code> to skip self-pairs (Asha–Asha) and mirrored pairs (Asha–Chen and Chen–Asha).</li>
</ol>`,
    clues: [
      'a column points to the <b>same table</b> (manager_id, parent_id, referred_by, reply_to) → self join',
      '"employees who earn more than their managers" (LeetCode 181) → self join + compare columns',
      '"compared with the previous day / previous record" (LeetCode 197 Rising Temperature) → self join on date − 1 (or LAG)',
      '"pairs of …", "find duplicates", "same city / same department" → self join with <code>a.id &lt; b.id</code>',
      '"manager\'s manager", "skip-level" → two self joins; "all levels / full chain" → recursive CTE',
      '"include the CEO / top-level rows" → LEFT self join (their parent id is NULL)'
    ],
    code: [
      { lang: 'sql', db: 'company', title: 'Employee → manager → skip-level manager', code: `
SELECT e.name                     AS employee,
       COALESCE(m.name,  '-')     AS manager,
       COALESCE(mm.name, '-')     AS skip_level
FROM employees AS e
LEFT JOIN employees AS m  ON m.emp_id  = e.manager_id    -- 1 level up
LEFT JOIN employees AS mm ON mm.emp_id = m.manager_id    -- 2 levels up
ORDER BY e.emp_id;` },
      { lang: 'sql', db: 'company', title: 'Employees who earn more than their manager (LeetCode 181)', code: `
SELECT e.name AS employee, e.salary, m.name AS manager, m.salary AS manager_salary
FROM employees e
JOIN employees m ON m.emp_id = e.manager_id   -- INNER: no manager -> nothing to compare
WHERE e.salary > m.salary;` }
    ],
    codeTitle: ['Two-level hierarchy', 'Compare a row with its parent row'],
    viz: {
      title: 'Self join: employees e ⋈ employees m on m.emp_id = e.manager_id',
      input: 'LEFT 1 Meera -, 2 Arjun 1, 3 Priya 1, 4 Kabir 2, 5 Neha 9',
      inputLabel: 'INNER or LEFT, then employees "id name manager_id" separated by commas (- = no manager, ≤ 6)',
      gen: function (input) {
        var s = String(input === undefined ? '' : input).trim(), type = 'LEFT';
        var mt = s.match(/^(INNER|LEFT)\s+/i);
        if (mt) { type = mt[1].toUpperCase(); s = s.slice(mt[0].length); }
        var rows = s.split(',').map(function (x) { return toks(x); }).filter(function (r) { return r.length; });
        if (!rows.length || rows.some(function (r) { return r.length !== 3 || typeof r[0] !== 'number'; })) throw new Error('Each employee needs: id name manager_id (use - for none), e.g. 2 Arjun 1');
        if (rows.length > 6) throw new Error('At most 6 employees');
        return runJoin({
          type: type,
          L: { label: 'employees e (the employee)', cols: ['emp_id', 'name', 'manager_id'], rows: rows },
          R: { label: 'employees m (the manager)', cols: ['emp_id', 'name', 'manager_id'], rows: rows },
          test: function (l, r) { return eq(l[2], r[0]); },
          say: function (l, r, t) { return 'Is ' + sv(r[1]) + ' the manager of ' + sv(l[1]) + '? ' + sayEq('e.manager_id', l[2], 'm.emp_id', r[0], t); },
          outCols: ['employee', 'e.manager_id', 'manager'],
          out: function (l, r) { return [l ? l[1] : null, l ? l[2] : null, r ? r[1] : null]; },
          sql: 'SELECT e.name AS employee, e.manager_id, m.name AS manager\nFROM employees AS e\n' + type + ' JOIN employees AS m\n  ON m.emp_id = e.manager_id;',
          lines: { scan: 4, emit: 1, keepL: 3 },
          intro: 'The SAME table appears twice. On the left it plays "employee", on the right it plays "manager". Each employee scans the whole table looking for the row whose emp_id equals its manager_id. Join type: <b>' + type + '</b>.',
          outro: function (res) { return 'Done: ' + res.length + ' row(s). Because emp_id is unique, each employee matches <b>at most one</b> manager — a self join on a primary key never multiplies rows. ' + (type === 'INNER' ? 'INNER dropped employees whose manager_id is NULL or points nowhere (try LEFT).' : 'LEFT kept the top boss and anyone whose manager left, with manager = NULL.'); }
        }).frames;
      }
    },
    examples: [
      {
        title: 'Who referred whom, and how many people did each customer refer?',
        html: `<p><code>customers.referred_by</code> points back into customers. Join from the <b>referrer</b> side (r) to the people they referred (c) with a LEFT JOIN so customers who referred nobody still show 0. Asha referred Ben and Chen; Ben referred Dev; Chen referred Fay.</p>`,
        code: { lang: 'sql', db: 'shop', code: `
SELECT r.name                         AS referrer,
       COUNT(c.customer_id)           AS referrals,
       GROUP_CONCAT(c.name, ', ')     AS referred_people
FROM customers AS r                    -- role: the referrer
LEFT JOIN customers AS c               -- role: the referred customer
       ON c.referred_by = r.customer_id
GROUP BY r.customer_id, r.name
ORDER BY referrals DESC, r.name;` }
      },
      {
        title: 'Pairs of colleagues in the same department (each pair once)',
        html: `<p>Without a guard, a self join on <code>dept_id</code> pairs every employee with <b>themselves</b> and lists every pair <b>twice</b> (Arjun–Kabir and Kabir–Arjun). <code>a.emp_id &lt; b.emp_id</code> keeps exactly one copy of each unordered pair: a department of n people yields n(n−1)/2 pairs (Engineering: 4·3/2 = 6).</p>`,
        code: { lang: 'sql', db: 'company', code: `
SELECT a.dept_id, a.name AS colleague_1, b.name AS colleague_2
FROM employees a
JOIN employees b
  ON b.dept_id = a.dept_id          -- same department (NULL depts never pair)
 AND a.emp_id  < b.emp_id           -- no self-pairs, no mirror duplicates
ORDER BY a.dept_id, colleague_1, colleague_2;` }
      },
      {
        title: 'Managers who sit in a different department from their reports',
        html: `<p>Self joins can compare <b>any</b> columns of the two roles. Here we look for reporting lines that cross departments: Priya (Sales) reports to Meera (Engineering), Vikram (no dept) reports to Meera, and Ishaan (dept 50) reports to Arjun. <code>IS NOT</code> is SQLite's NULL-safe "is different", so a NULL department counts as different instead of UNKNOWN.</p>`,
        code: { lang: 'sql', db: 'company', code: `
SELECT e.name AS employee, e.dept_id AS emp_dept,
       m.name AS manager,  m.dept_id AS mgr_dept
FROM employees e
JOIN employees m ON m.emp_id = e.manager_id
WHERE e.dept_id IS NOT m.dept_id          -- NULL-safe "different" (standard: IS DISTINCT FROM)
ORDER BY e.emp_id;` }
      },
      {
        title: 'Direct-report counts (and managers with at least 2 reports)',
        html: `<p>Group the self join by the <b>manager</b> role. Meera has 3 direct reports (Arjun, Priya, Vikram), Arjun has 3 (Kabir, Sara, Ishaan), Priya has 2. Neha's manager 12 does not exist, so the INNER join simply ignores that line. This is LeetCode 570 "Managers with at Least 5 Direct Reports" with a smaller threshold.</p>`,
        code: { lang: 'sql', db: 'company', code: `
SELECT m.name AS manager, COUNT(*) AS direct_reports
FROM employees e
JOIN employees m ON m.emp_id = e.manager_id
GROUP BY m.emp_id, m.name
HAVING COUNT(*) >= 2
ORDER BY direct_reports DESC, manager;` }
      }
    ],
    deepDive: `<p>🟣 <b>It is just a join.</b> The engine does not care that both inputs are the same table: it plans two independent scans/seeks. Performance therefore depends on indexes for the role you probe: for "employee → manager", the probe is on <code>emp_id</code> (primary key, already indexed); for "manager → reports", the probe is on <code>manager_id</code> — add an index on it, or every lookup is a full scan.</p>
<p><b>Self joins vs window functions.</b> Comparing a row with "the previous row" via self join only works when the previous row can be computed exactly (date − 1 day). If days can be missing and you want "previous <i>available</i> row", use <code>LAG()</code> (Window Functions module). Running totals with a self join (<code>JOIN t2 ON t2.d &lt;= t1.d</code>) are <b>O(n²)</b>; a window function does it in O(n log n) — a classic interview upgrade.</p>
<p><b>Modelling hierarchies.</b> <code>manager_id</code> is the <b>adjacency list</b> model: cheap to update, one self join per level, recursion for full depth. Alternatives: <b>materialized path</b> ('/1/2/4/'), <b>nested sets</b> (left/right numbers, fast subtree reads, slow writes), <b>closure table</b> (every ancestor-descendant pair stored; subtree = one plain join). PostgreSQL's <code>ltree</code> and SQL Server's <code>hierarchyid</code> are built-in materialized paths.</p>
<p><b>Integrity.</b> A self-referencing FOREIGN KEY (<code>manager_id REFERENCES employees(emp_id)</code>) would have prevented Neha's dangling manager 12; cycles (A manages B manages A) are not prevented by FKs at all and make recursive queries loop — guard with a depth limit.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> "Employees who earn more than their managers" is a top-10 LeetCode SQL problem; every assistant has memorised it. Interviewers know that, so they twist it: include the CEO, handle a manager who left, count reports per level, or ask why your query drops a row.</p>
<p><b>Use AI as a partner:</b> ask it to generate tricky hierarchy data (missing manager, NULL manager, cycle, two people with the same name) and predict your query's output for each before running it. Ask <i>"rewrite this self join with LAG and tell me when the two differ"</i> — the difference (gaps in dates) is a great interview talking point.</p>
<p><b>Where AI goes wrong:</b> inverted ON conditions (<code>e.emp_id = m.manager_id</code> gives "who does this person manage", not "who manages them"), forgetting the <code>a.id &lt; b.id</code> guard, and assuming a fixed depth. <b>What you must still own:</b> naming the roles before writing SQL, and reading the ON clause aloud ("the manager is the row whose emp_id equals my manager_id").</p>`,
    problems: [{
      title: 'Employee Directory with Manager Names', level: 'Easy', tags: ['self join', 'left join', 'case'], companies: ['Microsoft', 'Oracle', 'Infosys'],
      statement: `<p>List <b>every</b> employee with their manager's name. If the employee has no manager show <code>'— (top)'</code>; if their manager_id points to someone who is not in the table show <code>'unknown (left company)'</code>. Columns: <code>employee, manager</code>, ordered by emp_id.</p>`,
      constraints: `<p>Company DB, 10 employees. Meera's manager_id is NULL; Neha's is 12 (no such employee).</p>`,
      example: `${H.table(['employee', 'manager'], [['Meera', '<span class="c-p">— (top)</span>'], ['Arjun', 'Meera'], ['Kabir', 'Arjun'], ['Neha', '<span class="c-r">unknown (left company)</span>']])}<p>Both special rows have ${H.c('p', 'm.name = NULL')} after the LEFT self join; looking at <code>e.manager_id</code> tells you which case it is.</p>`,
      brute: {
        why: `<p>An INNER self join only returns employees whose manager row exists. Meera (manager_id NULL) and Neha (manager 12 is gone) <span class="c-r">disappear</span> — 8 rows instead of 10, and the directory silently omits the CEO.</p>`,
        code: { lang: 'sql', db: 'company', code: `
-- WRONG: INNER self join drops the CEO and anyone with a dangling manager_id
SELECT e.name AS employee, m.name AS manager
FROM employees e
JOIN employees m ON m.emp_id = e.manager_id
ORDER BY e.emp_id;` }
      },
      mcq: { q: 'In <code>FROM employees e LEFT JOIN employees m ON …</code>, which ON clause attaches each employee\'s <b>manager</b>?', options: ['<code>m.emp_id = e.manager_id</code>', '<code>e.emp_id = m.manager_id</code>', '<code>e.emp_id = m.emp_id</code>', '<code>e.manager_id = m.manager_id</code>'], answer: 0, explain: 'The manager is the row whose emp_id equals my manager_id. Option 2 attaches the people I manage; option 3 matches every row to itself; option 4 pairs colleagues who share a manager.' },
      hints: [
        `<p>Hint 1: Same table, two roles: <code>e</code> = employee, <code>m</code> = manager. Read the ON aloud: "the manager's emp_id is my manager_id".</p>`,
        `<p>Hint 2: "Every employee" → LEFT self join, so the CEO and Neha survive with <code>m.name = NULL</code>.</p>`,
        `<p>Hint 3: Use CASE: e.manager_id IS NULL → '— (top)'; m.emp_id IS NULL → 'unknown (left company)'; else m.name.</p>`
      ],
      solution: {
        approach: `<p>LEFT self join on <code>m.emp_id = e.manager_id</code> keeps every employee. Two different reasons produce a NULL manager name, and the employee's own <code>manager_id</code> distinguishes them.</p>`,
        code: { lang: 'sql', db: 'company', code: `
SELECT e.name AS employee,
       CASE
         WHEN e.manager_id IS NULL THEN '— (top)'                 -- nobody above
         WHEN m.emp_id     IS NULL THEN 'unknown (left company)'  -- dangling id
         ELSE m.name
       END AS manager
FROM employees AS e
LEFT JOIN employees AS m
       ON m.emp_id = e.manager_id
ORDER BY e.emp_id;` },
        complexity: `<p>One primary-key lookup per employee: O(N log N) with the PK B-tree, O(N) with a hash join. emp_id is unique, so the output has exactly N rows.</p>`,
        followUps: ['Add the manager\'s department name (one more join — which type?).', 'Show the full chain up to the CEO for each employee (recursive CTE).']
      }
    }]
  });

  /* ================= TOPIC 6: ON vs WHERE ================= */
  function and3(a, b) { if (a === false || b === false) return false; if (a === true && b === true) return true; return null; }
  topics.push({
    title: 'Join Conditions vs Filters: ON vs WHERE (the LEFT JOIN that secretly became INNER)',
    analogy: `<p>A school packs a lunchbox for <b>every</b> child (that is the LEFT JOIN — every child is preserved). Two different instructions:</p>
<ul><li><b>"Only put an apple in the box"</b> (rule in <b>ON</b>): every child still gets a box; some boxes are just empty.</li>
<li><b>"Throw away every box that has no apple"</b> (rule in <b>WHERE</b>): children without an apple end up with <b>no box at all</b>.</li></ul>
<p>Same words ("apple"), totally different outcome. <b>ON decides what goes into each box; WHERE decides which boxes survive.</b></p>`,
    explain: `<p>🟢 <b>The plain idea.</b> SQL processes a query in a fixed logical order: <b>FROM + JOIN … ON</b> → <b>WHERE</b> → GROUP BY → HAVING → SELECT → ORDER BY. So:</p>
<ul><li><b>ON</b> runs <i>during</i> the join: it decides which pairs <b>match</b>. In an outer join, a preserved row that matches nothing is <b>still kept</b> (NULL-filled).</li>
<li><b>WHERE</b> runs <i>after</i> the join, on the finished rows: anything not TRUE is <b>removed</b> — including NULL-filled rows, because <code>NULL = 'paid'</code> is UNKNOWN.</li></ul>
<p>For an <b>INNER JOIN</b> it makes no difference where a filter goes — both versions return the same rows. For <b>OUTER joins</b> it changes the answer. The four cases for <code>customers c LEFT JOIN orders o</code>:</p>
${H.table(['filter on…', 'placed in ON', 'placed in WHERE'], [['<b>right</b> (optional) table<br><code>o.status = \'paid\'</code>', '<span class="c-g">only paid orders can match; every customer stays</span> (usually what you want)', '<span class="c-r">NULL-filled rows die → behaves like INNER JOIN</span>'], ['<b>left</b> (preserved) table<br><code>c.city = \'Pune\'</code>', '<span class="c-y">does NOT remove customers!</span> Non-Pune customers stay, just with no orders attached', '<span class="c-g">removes non-Pune customers</span> (usually what you want)']])}
<p><b>The rule of thumb:</b> conditions about the <b>optional</b> side go in <b>ON</b>; conditions about the <b>preserved</b> side go in <b>WHERE</b>. The one WHERE condition on the optional side that is safe and intended is <code>WHERE o.order_id IS NULL</code> — that is the anti-join, and it is <i>supposed</i> to keep only the NULL-filled rows.</p>
<p>⚠️ <b>The "OR IS NULL" patch is also wrong.</b> <code>WHERE o.status = 'paid' OR o.order_id IS NULL</code> looks like it keeps customers without paid orders, but Ben has one <i>cancelled</i> order: his joined row has status 'cancelled' (not paid, not NULL) → Ben vanishes. Only the ON version handles him correctly.</p>`,
    clues: [
      '"for <b>every</b> customer, count their <b>paid</b> orders / orders in 2026" → LEFT JOIN with the status/date filter <b>inside ON</b>',
      'LEFT JOIN result unexpectedly has the same row count as INNER JOIN → a right-table filter is sitting in WHERE',
      '"all departments, with employees hired after 2020" → hire_date condition in ON',
      '"only Pune customers, with all their orders" → city filter in WHERE (preserved side)',
      'interviewer asks "is <code>LEFT JOIN … WHERE b.x = 1</code> still a left join?" → no, it is effectively INNER',
      'query uses <code>WHERE … OR b.id IS NULL</code> to "fix" a left join → suspicious: rows with only non-qualifying matches are lost'
    ],
    code: [
      { lang: 'sql', db: 'shop', title: 'Same words, different places: compare the row counts', code: `
-- Filter in ON: every customer survives (Ben, Eli, Fay get NULL order columns)
SELECT 'filter in ON' AS version, COUNT(*) AS result_rows,
       COUNT(DISTINCT c.customer_id) AS customers_listed
FROM customers c
LEFT JOIN orders o
       ON o.customer_id = c.customer_id
      AND o.status = 'paid'
UNION ALL
-- Filter in WHERE: NULL-filled rows fail the test -> it became an INNER JOIN
SELECT 'filter in WHERE', COUNT(*), COUNT(DISTINCT c.customer_id)
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.customer_id
WHERE o.status = 'paid';` },
      { lang: 'sql', db: 'shop', title: 'Left-table condition in ON does NOT filter the left table', code: `
-- Surprise: all 6 customers are returned; only Pune customers get orders attached.
SELECT c.name, c.city, o.order_id
FROM customers c
LEFT JOIN orders o
       ON o.customer_id = c.customer_id
      AND c.city = 'Pune'             -- belongs in WHERE if you want only Pune customers
ORDER BY c.customer_id, o.order_id;` }
    ],
    codeTitle: ['ON vs WHERE row counts', 'Preserved-side filter in ON'],
    viz: {
      title: 'Same filter, two placements: ON keeps everyone, WHERE deletes NULL rows',
      input: '1 2 3 4 | 1:paid 1:cancelled 2:cancelled 3:paid NULL:paid',
      inputLabel: 'customer ids | orders as customer_id:status (NULL allowed; ≤ 5 each)',
      gen: function (input) {
        var sides = String(input === undefined ? '' : input).split('|');
        if (sides.length !== 2) throw new Error('Format: 1 2 3 4 | 1:paid 2:cancelled NULL:paid');
        var L = toks(sides[0]);
        var R = String(sides[1]).trim().split(/[\s,]+/).filter(function (t) { return t.length; }).map(function (t, i) {
          var pr = t.split(':');
          if (pr.length !== 2) throw new Error('Each order must look like customer_id:status, e.g. 1:paid');
          var k = toks(pr[0])[0], st = toks(pr[1])[0];
          return [101 + i, k === undefined ? null : k, st === undefined ? null : st];
        });
        if (!L.length || !R.length) throw new Error('Both sides need at least one value');
        if (L.length > 5 || R.length > 5) throw new Error('At most 5 customers and 5 orders');
        var LT = { label: 'customers c', cols: ['customer_id', 'name'], rows: custRows(L) };
        var RT = { label: 'orders o', cols: ['order_id', 'customer_id', 'status'], rows: R };
        var outCols = ['c.name', 'o.order_id', 'o.status'];
        var out = function (l, r) { return [l ? l[1] : null, r ? r[0] : null, r ? r[2] : null]; };
        // Phase A: filter inside ON
        var A = runJoin({
          type: 'LEFT', L: LT, R: RT, outCols: outCols, out: out, compact: L.length * R.length > 20,
          test: function (l, r) { return and3(eq(l[0], r[1]), eq(r[2], 'paid')); },
          say: function (l, r, t) { return l[1] + ' vs order ' + r[0] + ': ON (' + sv(l[0]) + ' = ' + sv(r[1]) + ') AND (' + sv(r[2]) + ' = \'paid\') → ' + tv(t); },
          sql: "SELECT c.name, o.order_id, o.status\nFROM customers c\nLEFT JOIN orders o\n  ON o.customer_id = c.customer_id\n AND o.status = 'paid';     -- filter INSIDE ON",
          lines: { scan: 4, emit: 1, keepL: 3 },
          intro: '<b>Version A — filter in ON.</b> The status test is part of the matching rule. A cancelled order simply cannot match, but the customer is still protected by LEFT JOIN.',
          outro: function (res) { return 'Version A done: <b>' + res.length + '</b> rows. Every customer is listed; customers with no <i>paid</i> order got NULLs.'; }
        });
        // Phase B: join on key only, then WHERE
        var B = runJoin({
          type: 'LEFT', L: LT, R: RT, outCols: outCols, out: out, compact: L.length * R.length > 20,
          test: function (l, r) { return eq(l[0], r[1]); },
          say: function (l, r, t) { return l[1] + ' vs order ' + r[0] + ': ON ' + sv(l[0]) + ' = ' + sv(r[1]) + ' → ' + tv(t) + ' (status is NOT checked yet)'; },
          sql: "SELECT c.name, o.order_id, o.status\nFROM customers c\nLEFT JOIN orders o\n  ON o.customer_id = c.customer_id\nWHERE o.status = 'paid';   -- filter AFTER the join",
          lines: { scan: 4, emit: 1, keepL: 3 },
          intro: '<b>Version B — filter in WHERE.</b> First the join runs with only the key in ON, so cancelled orders DO match.',
          outro: function (res) { return 'Join phase of version B done: ' + res.length + ' rows. Now WHERE runs on these finished rows…'; }
        });
        var frames = A.frames.concat(B.frames);
        var joined = B.result, kept = [], code = "SELECT c.name, o.order_id, o.status\nFROM customers c\nLEFT JOIN orders o\n  ON o.customer_id = c.customer_id\nWHERE o.status = 'paid';   -- filter AFTER the join";
        joined.forEach(function (row, i) {
          var t = eq(row[2], 'paid'), hl = {};
          for (var k = 0; k < i; k++) hl[k] = 'done'; hl[i] = t === true ? 'ok' : 'bad';
          if (t === true) kept.push(row);
          var why = row[1] === null ? 'This is a NULL-filled row (customer had no matching order): NULL = \'paid\' is UNKNOWN → <span class="c-r">removed</span>. The LEFT JOIN\'s protection is undone!' : t === true ? 'status is paid → TRUE → kept.' : 'status ' + sv(row[2]) + ' ≠ paid → FALSE → <span class="c-r">removed</span>.';
          var kh = {}; if (t === true) kh[kept.length - 1] = 'ok';
          frames.push(fr('WHERE checks row ' + (i + 1) + ' (' + sv(row[0]) + '): ' + why, [sqlp(code, { 5: 'cur' }), tbl('Joined rows (input to WHERE)', outCols, joined, hl), tbl('Rows surviving WHERE (' + kept.length + ')', outCols, kept, kh)]));
        });
        var lostNames = [];
        A.result.forEach(function (r) { if (lostNames.indexOf(r[0]) < 0 && !kept.some(function (k) { return k[0] === r[0]; })) lostNames.push(r[0]); });
        var ah = {}; A.result.forEach(function (r, i) { if (r[1] === null) ah[i] = 'sel'; });
        frames.push(fr('Side by side: version A (ON) has <b>' + A.result.length + '</b> rows and lists every customer; version B (WHERE) has <b>' + kept.length + '</b> rows — ' + (lostNames.length ? 'customers <span class="c-r">' + lostNames.map(esc).join(', ') + '</span> vanished, exactly as if we had written INNER JOIN.' : 'no customer was lost with this input — try a customer with only a cancelled order.'), [
          tbl('A: filter in ON', outCols, A.result, ah),
          tbl('B: filter in WHERE', outCols, kept, {}),
          txt('<b>Rule:</b> conditions on the optional (right) table → ON. Conditions on the preserved (left) table → WHERE.')
        ]));
        return frames;
      }
    },
    examples: [
      {
        title: 'The "OR IS NULL" patch still loses Ben',
        html: `<p>People who discover the WHERE bug often "fix" it with <code>OR o.order_id IS NULL</code>. That restores Eli and Fay (no orders at all) but not <b>Ben</b>, whose only order is cancelled: his joined row is <code>(Ben, 103, 'cancelled')</code>, which is neither paid nor NULL, so it is deleted and Ben is gone. Moving the filter into ON gives the right answer for all three kinds of customers.</p>
${H.table(['customer', 'filter in WHERE', 'WHERE … OR IS NULL', 'filter in ON'], [['Asha (2 paid)', '✔', '✔', '✔'], ['Ben (1 cancelled)', '<span class="c-r">✘</span>', '<span class="c-r">✘</span>', '<span class="c-g">✔ NULL</span>'], ['Eli (no orders)', '<span class="c-r">✘</span>', '✔', '<span class="c-g">✔ NULL</span>']])}`,
        code: { lang: 'sql', db: 'shop', code: `
-- Patched version: Ben is missing
SELECT c.name, o.order_id, o.status
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.customer_id
WHERE o.status = 'paid' OR o.order_id IS NULL
ORDER BY c.customer_id;

-- Correct version: filter on the optional side lives in ON
SELECT c.name, o.order_id, o.status
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.customer_id AND o.status = 'paid'
ORDER BY c.customer_id;` }
      },
      {
        title: 'Every department with employees hired since 2020',
        html: `<p>"Every department" → departments is preserved; "hired since 2020" is about the optional side → it goes in ON. HR (Neha hired 2018) and Legal (nobody) keep their row with 0. Putting the date in WHERE would drop both departments.</p>`,
        code: { lang: 'sql', db: 'company', code: `
SELECT d.dept_name,
       COUNT(e.emp_id)            AS recent_hires,
       GROUP_CONCAT(e.name, ', ') AS who
FROM departments d
LEFT JOIN employees e
       ON e.dept_id = d.dept_id
      AND e.hire_date >= '2020-01-01'     -- optional-side filter: ON
GROUP BY d.dept_id, d.dept_name
ORDER BY d.dept_id;` }
      },
      {
        title: 'For INNER JOIN, ON and WHERE are interchangeable',
        html: `<p>With an inner join there are no NULL-filled rows to protect, so moving a filter between ON and WHERE never changes the result, and the optimizer produces the same plan. Style advice: keep <b>relationship</b> conditions in ON and <b>row-selection</b> conditions in WHERE so readers can tell them apart — and so the query stays correct if someone later changes JOIN to LEFT JOIN.</p>`,
        code: { lang: 'sql', db: 'shop', code: `
SELECT COUNT(*) AS rows_filter_in_on
FROM customers c
JOIN orders o ON o.customer_id = c.customer_id AND o.status = 'paid';

SELECT COUNT(*) AS rows_filter_in_where
FROM customers c
JOIN orders o ON o.customer_id = c.customer_id
WHERE o.status = 'paid';` }
      },
      {
        title: 'Filtering the preserved side: WHERE, not ON',
        html: `<p>"Pune customers with their orders (even if none)": city is a property of the <b>preserved</b> table, so it belongs in WHERE. Asha and Chen are returned with their orders; nobody else. Compare with the second reference snippet above, where the same condition in ON returned all six customers.</p>`,
        code: { lang: 'sql', db: 'shop', code: `
SELECT c.name, c.city, o.order_id, o.amount
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.customer_id
WHERE c.city = 'Pune'                -- preserved-side filter: WHERE
ORDER BY c.name, o.order_id;` }
      }
    ],
    deepDive: `<p>🟣 <b>Formal view.</b> For L ⟕<sub>θ</sub> R, a predicate p on R placed in ON gives L ⟕<sub>θ ∧ p</sub> R. Placed in WHERE it gives σ<sub>p</sub>(L ⟕<sub>θ</sub> R). If p is <b>null-rejecting</b> (evaluates to FALSE/UNKNOWN whenever R's columns are NULL — true for almost every comparison), σ<sub>p</sub> deletes all padded rows, so σ<sub>p</sub>(L ⟕ R) = σ<sub>p</sub>(L ⋈ R). Optimizers detect null-rejecting predicates and <b>convert the outer join to an inner join</b> (PostgreSQL's <code>reduce_outer_joins</code>, MySQL's "outer join simplification"). EXPLAIN then shows an inner join — a great debugging clue.</p>
<p><b>Null-tolerant predicates</b> such as <code>o.status IS NULL</code>, <code>COALESCE(o.status, 'paid') = 'paid'</code> or <code>o.status IS NOT 'cancelled'</code> do not reject padded rows, so they keep the outer join alive — but they also keep rows you might not want. Decide per case.</p>
<p><b>Preserved-side predicates in ON</b> (<code>AND c.city = 'Pune'</code>) can never remove left rows; they only stop matches. Engines can still use them to skip probing (a left row that fails it is padded immediately without touching R).</p>
<p><b>Multi-join chains.</b> In <code>A LEFT JOIN B ON … LEFT JOIN C ON …</code>, a WHERE condition on C undoes <b>both</b> outer joins for rows without C. The fix is the same: push C's condition into C's ON, or pre-filter C in a subquery/CTE. <b>HAVING vs WHERE</b> is the same idea one level up: WHERE filters rows before grouping, HAVING filters groups after.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> This is the single most common bug in AI-generated reporting SQL: the model writes a LEFT JOIN (because the prompt said "all customers") and then adds the business filter in WHERE (because that is where filters usually go). The query runs, the numbers look plausible, and zero-rows silently vanish.</p>
<p><b>Use AI as a partner:</b> paste the query and ask <i>"Which WHERE predicates reference the optional side of an outer join? Would any of them reject NULL-padded rows?"</i> Assistants are good at this mechanical review when asked explicitly. Also ask for a test: <i>"give me a customer with only cancelled orders and tell me whether they appear"</i>.</p>
<p><b>Where AI goes wrong:</b> suggesting the <code>OR x IS NULL</code> patch, moving preserved-side filters into ON "for performance", and assuming ON vs WHERE never matters because it learnt that from inner-join examples. <b>What you must still own:</b> the logical processing order (FROM/ON → WHERE → GROUP BY → HAVING → SELECT → ORDER BY) and the habit of asking "which table is preserved?" for every filter you write.</p>`,
    problems: [{
      title: 'Paid Revenue for Every Customer', level: 'Medium', tags: ['left join', 'on vs where', 'aggregation'], companies: ['Amazon', 'Meta', 'Zomato'],
      statement: `<p>For <b>every</b> customer, report <code>name</code>, <code>paid_orders</code> (number of orders with status 'paid') and <code>paid_revenue</code> (sum of their amounts, 0 if none). Customers whose orders are all cancelled/pending, or who never ordered, must still appear with zeros. Order by paid_revenue descending, then name.</p>`,
      constraints: `<p>Shop DB. One row per customer (6 rows). No subqueries required.</p>`,
      example: `${H.table(['name', 'paid_orders', 'paid_revenue'], [['Asha', '2', '330'], ['Dev', '1', '75'], ['Chen', '1', '40'], ['Ben', '<span class="c-g">0</span>', '<span class="c-g">0</span>'], ['Eli', '0', '0'], ['Fay', '0', '0']])}<p>Chen's pending order 107 (300) does not count. Ben's only order is cancelled — he must still be listed with ${H.c('g', '0')}.</p>`,
      brute: {
        why: `<p>The status filter is in WHERE, after the LEFT JOIN. NULL-filled rows (Eli, Fay) and Ben's cancelled row all fail <code>status = 'paid'</code>, so <span class="c-r">three customers disappear</span> and the report has 3 rows instead of 6. The LEFT JOIN is effectively an INNER JOIN.</p>`,
        code: { lang: 'sql', db: 'shop', code: `
-- WRONG: WHERE on the optional side turns the LEFT JOIN into an INNER JOIN
SELECT c.name, COUNT(o.order_id) AS paid_orders, COALESCE(SUM(o.amount), 0) AS paid_revenue
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.customer_id
WHERE o.status = 'paid'
GROUP BY c.customer_id, c.name
ORDER BY paid_revenue DESC, c.name;` }
      },
      mcq: { q: 'Where should <code>o.status = \'paid\'</code> go so that customers without paid orders still appear?', options: ['In the ON clause of the LEFT JOIN', 'In WHERE', 'In HAVING', 'In ORDER BY'], answer: 0, explain: 'Inside ON it only limits which orders can match; the LEFT JOIN still protects every customer. WHERE and HAVING run after the join and would discard customers whose rows fail the test.' },
      hints: [
        `<p>Hint 1: Which table must keep all its rows? Customers. Which side does the "paid" condition describe? The optional orders side.</p>`,
        `<p>Hint 2: Put <code>AND o.status = 'paid'</code> inside the ON clause; then non-paid orders cannot match but the customer survives NULL-filled.</p>`,
        `<p>Hint 3: COUNT(o.order_id) and COALESCE(SUM(o.amount), 0) turn the NULL rows into zeros. Alternative: conditional aggregation SUM(CASE WHEN o.status='paid' THEN o.amount ELSE 0 END) with the plain key-only join.</p>`
      ],
      solution: {
        approach: `<p>Keep customers with LEFT JOIN, restrict matches to paid orders <b>inside ON</b>, then aggregate. An equally valid approach joins on the key only and uses conditional aggregation, which never removes rows.</p>`,
        code: { lang: 'sql', db: 'shop', code: `
SELECT c.name,
       COUNT(o.order_id)          AS paid_orders,
       COALESCE(SUM(o.amount), 0) AS paid_revenue
FROM customers AS c
LEFT JOIN orders AS o
       ON o.customer_id = c.customer_id
      AND o.status = 'paid'            -- filter on the optional side: ON
GROUP BY c.customer_id, c.name
ORDER BY paid_revenue DESC, c.name;` },
        alt: [{ lang: 'sql', db: 'shop', title: 'Alternative: conditional aggregation', code: `
SELECT c.name,
       COUNT(CASE WHEN o.status = 'paid' THEN 1 END)               AS paid_orders,
       COALESCE(SUM(CASE WHEN o.status = 'paid' THEN o.amount END), 0) AS paid_revenue
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.customer_id
GROUP BY c.customer_id, c.name
ORDER BY paid_revenue DESC, c.name;` }],
        complexity: `<p>O(C + O) with a hash join (or O(C log O) with an index on orders.customer_id), plus grouping and an O(C log C) sort.</p>`,
        followUps: ['Also show each customer\'s cancelled amount in a separate column (conditional aggregation shines here).', 'Only list customers from Pune, still with zeros — where does that filter go?']
      }
    }]
  });

  /* ================= TOPIC 7: SEMI-JOIN & ANTI-JOIN ================= */
  topics.push({
    title: 'Semi-Join and Anti-Join: EXISTS, NOT EXISTS, IN, NOT IN (and the NULL trap)',
    analogy: `<p>A club bouncer has two kinds of checks:</p>
<ul><li><b>Semi-join</b> — "Do you have <b>at least one</b> ticket?" He looks in your wallet, sees one ticket, and waves you in. He does not count the other five tickets, and you walk in <b>once</b>, not six times.</li>
<li><b>Anti-join</b> — "Are you <b>not</b> on the banned list?" He scans the list; if your name is absent, you are in.</li></ul>
<p>Neither check brings the ticket or the list <i>inside</i> with you — they only decide whether <b>you</b> get in. That is the difference from a normal join, which glues columns from both sides together.</p>`,
    explain: `<p>🟢 <b>The plain idea.</b> Many questions only ask <i>"which rows of A have (or don't have) a partner in B?"</i> — you do not need B's columns, and each A row should appear <b>at most once</b>.</p>
${H.table(['Want', 'Name', 'Best SQL', 'Also works'], [['A rows <b>with</b> ≥ 1 match', '<b>semi-join</b>', '<code>WHERE EXISTS (SELECT 1 FROM B WHERE B.k = A.k)</code>', '<code>WHERE A.k IN (SELECT k FROM B)</code>'], ['A rows with <b>no</b> match', '<b>anti-join</b>', '<code>WHERE NOT EXISTS (SELECT 1 FROM B WHERE B.k = A.k)</code>', '<code>LEFT JOIN B … WHERE B.pk IS NULL</code>']])}
<p><b>Why not just INNER JOIN?</b> Asha has two orders, so <code>customers JOIN orders</code> lists her <b>twice</b>. To answer "which customers have ordered?" you would need DISTINCT — extra work, and it would also merge two genuinely different customers who happen to share a name. EXISTS stops at the first match and returns each customer once.</p>
<p><b>The <code>SELECT 1</code> inside EXISTS</b> is a convention: EXISTS only checks "is there at least one row?", so the select list is ignored. <code>SELECT *</code> or <code>SELECT 1</code> behave the same.</p>
<p>⚠️ <b>The NOT IN + NULL trap</b> (asked in almost every SQL interview). <code>x NOT IN (1, 3, NULL)</code> means <code>x &lt;&gt; 1 AND x &lt;&gt; 3 AND x &lt;&gt; NULL</code>. The last part is always UNKNOWN, so the whole thing can never be TRUE → <b>NOT IN returns zero rows</b> as soon as the subquery contains a single NULL.</p>
${H.table(['x', 'x NOT IN (1, 3)', 'x NOT IN (1, 3, NULL)', 'NOT EXISTS version'], [['1', 'FALSE', 'FALSE', 'excluded'], ['5', '<span class="c-g">TRUE → kept</span>', '<span class="c-r">UNKNOWN → dropped!</span>', '<span class="c-g">kept</span>']])}
<p>Our <code>orders</code> table has a guest order with <code>customer_id = NULL</code>, so <code>WHERE customer_id NOT IN (SELECT customer_id FROM orders)</code> returns <b>nothing</b>, although Eli and Fay never ordered. <b>Use NOT EXISTS</b> (NULL-safe by construction), or add <code>WHERE customer_id IS NOT NULL</code> inside the subquery. <code>IN</code> (positive) is safe: a NULL in the list just never matches.</p>`,
    clues: [
      '"customers who <b>never</b> ordered", "products <b>never</b> sold", "users <b>without</b> a login" → anti-join (NOT EXISTS)',
      '"customers who have <b>at least one</b> / <b>ever</b> …" and each customer once → semi-join (EXISTS)',
      'subquery column is <b>nullable</b> and the query uses NOT IN → NULL trap, switch to NOT EXISTS',
      '"find rows in A that are missing from B" (sync / ETL validation) → anti-join on the business key',
      '"bought X but not Y" → EXISTS (X) AND NOT EXISTS (Y)',
      '"students who took <b>all</b> courses" (relational division) → double NOT EXISTS: no course exists that the student did not take'
    ],
    code: [
      { lang: 'sql', db: 'shop', title: 'Semi-join and anti-join with EXISTS / NOT EXISTS', code: `
-- Semi-join: customers with at least one order (each listed once)
SELECT c.customer_id, c.name
FROM customers c
WHERE EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.customer_id)
ORDER BY c.customer_id;

-- Anti-join: customers with no orders at all (LeetCode 183)
SELECT c.customer_id, c.name
FROM customers c
WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.customer_id)
ORDER BY c.customer_id;` },
      { lang: 'sql', db: 'shop', title: 'The NOT IN + NULL trap, live', code: `
-- orders.customer_id contains a NULL (guest order 105) ...
SELECT COUNT(*) AS not_in_rows             -- 0 rows!  every test is FALSE or UNKNOWN
FROM customers
WHERE customer_id NOT IN (SELECT customer_id FROM orders);

-- ... fixed by excluding NULLs (or simply using NOT EXISTS)
SELECT COUNT(*) AS fixed_rows               -- 2 rows: Eli and Fay
FROM customers
WHERE customer_id NOT IN (SELECT customer_id FROM orders WHERE customer_id IS NOT NULL);` }
    ],
    codeTitle: ['EXISTS / NOT EXISTS', 'NOT IN with a NULL'],
    viz: {
      title: 'Semi/anti-join: stop at the first match — and watch NOT IN choke on NULL',
      input: 'NOT EXISTS 1 2 3 4 5 | 1 1 3 NULL 9 2',
      inputLabel: 'EXISTS | NOT EXISTS | IN | NOT IN, then customer ids | orders.customer_id values (≤ 7 each)',
      gen: function (input) {
        var p = parseJoin(input, 'NOT EXISTS', ['EXISTS', 'NOT EXISTS', 'IN', 'NOT IN'], 7, 7);
        var type = p.type === 'NOT EXISTS' ? 'ANTI' : p.type === 'NOT IN' ? 'NOTIN' : 'SEMI';
        var sql = p.type === 'EXISTS' || p.type === 'NOT EXISTS'
          ? 'SELECT c.customer_id, c.name\nFROM customers c\nWHERE ' + p.type + ' (\n  SELECT 1 FROM orders o\n  WHERE o.customer_id = c.customer_id);'
          : 'SELECT c.customer_id, c.name\nFROM customers c\nWHERE c.customer_id ' + p.type + ' (\n  SELECT o.customer_id\n  FROM orders o);';
        return runJoin({
          type: type,
          L: { label: 'customers c', cols: ['customer_id', 'name'], rows: custRows(p.left) },
          R: { label: 'orders o', cols: ['order_id', 'customer_id', 'amount'], rows: orderRows(p.right) },
          test: function (l, r) { return eq(l[0], r[1]); },
          say: function (l, r, t) { return l[1] + ' vs order ' + r[0] + ': ' + sayEq('c.customer_id', l[0], 'o.customer_id', r[1], t); },
          outCols: ['c.customer_id', 'c.name'],
          out: function (l) { return [l[0], l[1]]; },
          sql: sql, lines: { scan: 5, emit: 1 },
          intro: '<b>' + p.type + '</b>: for each customer, look for a partner order. ' + (type === 'SEMI' ? 'The first match is enough — output the customer once and stop.' : type === 'ANTI' ? 'The first match disqualifies the customer; only customers with no partner are output.' : 'NOT IN compares against every value — and a NULL in the list makes the answer UNKNOWN.') + ' Orders\' columns never appear in the output.',
          outro: function (res) {
            var hasNull = p.right.some(function (x) { return x === null; });
            return '<b>' + p.type + '</b> returned ' + res.length + ' customer(s), each at most once — no duplicates even though some customers have several orders.' +
              (type === 'NOTIN' && hasNull ? ' <span class="c-r">The NULL in orders.customer_id made every non-matching customer UNKNOWN → NOT IN returned nothing useful.</span> Try NOT EXISTS with the same keys.' : '') +
              (type === 'ANTI' && hasNull ? ' The NULL order did not hurt NOT EXISTS: a NULL comparison is simply "no match".' : '');
          }
        }).frames;
      }
    },
    examples: [
      {
        title: 'INNER JOIN vs EXISTS: duplicates and DISTINCT',
        html: `<p>"Customers who have ordered": the join version returns Asha twice and Chen twice (6 rows) because the join multiplies by number of orders. DISTINCT fixes the output but first builds and then de-duplicates all the rows. EXISTS returns 4 customers directly and can stop scanning each customer's orders at the first hit.</p>`,
        code: { lang: 'sql', db: 'shop', code: `
SELECT c.name FROM customers c JOIN orders o ON o.customer_id = c.customer_id;   -- 6 rows, duplicates

SELECT DISTINCT c.name FROM customers c JOIN orders o ON o.customer_id = c.customer_id;  -- 4, after dedup

SELECT c.name FROM customers c
WHERE EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.customer_id);       -- 4, semi-join` }
      },
      {
        title: 'Three correct anti-joins that agree',
        html: `<p>Products never sold. All three return Mystery Box and Plant Pot. <b>NOT EXISTS</b> states the intent best; <b>LEFT JOIN … IS NULL</b> is common in older code and MySQL 5.x; <b>EXCEPT</b> works on the key column only (then you join back for names). Most modern optimizers compile NOT EXISTS and LEFT JOIN/IS NULL into the same anti-join plan.</p>`,
        code: { lang: 'sql', db: 'shop', code: `
SELECT p.name FROM products p
WHERE NOT EXISTS (SELECT 1 FROM order_items i WHERE i.product_id = p.product_id);

SELECT p.name FROM products p
LEFT JOIN order_items i ON i.product_id = p.product_id
WHERE i.product_id IS NULL;              -- test the join column, never NULL in a real match

SELECT p.name FROM products p
WHERE p.product_id IN (SELECT product_id FROM products
                       EXCEPT
                       SELECT product_id FROM order_items);` }
      },
      {
        title: 'Bought X but never Y (EXISTS + NOT EXISTS)',
        html: `<p>Customers who bought an <b>Electronics</b> product but never a <b>Stationery</b> product. Each EXISTS can contain its own joins and filters. Asha (keyboard, mouse) and Dev (mouse) qualify; Chen bought pens and a monitor, so the NOT EXISTS knocks him out; Ben bought only lamp + pens.</p>`,
        code: { lang: 'sql', db: 'shop', code: `
SELECT c.name
FROM customers c
WHERE EXISTS (
        SELECT 1
        FROM orders o
        JOIN order_items i ON i.order_id = o.order_id
        JOIN products p    ON p.product_id = i.product_id
        WHERE o.customer_id = c.customer_id AND p.category = 'Electronics')
  AND NOT EXISTS (
        SELECT 1
        FROM orders o
        JOIN order_items i ON i.order_id = o.order_id
        JOIN products p    ON p.product_id = i.product_id
        WHERE o.customer_id = c.customer_id AND p.category = 'Stationery')
ORDER BY c.name;` }
      },
      {
        title: 'Relational division: students who took ALL CS courses',
        html: `<p>"For all" has no SQL keyword, so we say it with a double negative: <i>a student qualifies if there is <b>no</b> CS course that the student has <b>not</b> taken</i>. Aanya and Bilal took both C1 and C2. (An equivalent trick: count the student's distinct CS courses and compare with the total number of CS courses.)</p>`,
        code: { lang: 'sql', db: 'school', code: `
SELECT s.name
FROM students s
WHERE NOT EXISTS (                       -- there is no CS course ...
  SELECT 1 FROM courses c
  WHERE c.dept = 'CS'
    AND NOT EXISTS (                     -- ... that this student has not taken
      SELECT 1 FROM enrollments e
      WHERE e.student_id = s.student_id AND e.course_id = c.course_id))
ORDER BY s.name;` }
      }
    ],
    deepDive: `<p>🟣 <b>Algebra.</b> Semi-join A ⋉ B = π<sub>A</sub>(A ⋈ B) without duplicates; anti-join A ▷ B = A − (A ⋉ B). Optimizers have dedicated operators: PostgreSQL shows <code>Hash Semi Join</code> / <code>Hash Anti Join</code>, SQL Server <code>Left Semi Join</code> / <code>Left Anti Semi Join</code>, MySQL 8.0.17+ converts NOT EXISTS / NOT IN into antijoins. A semi-join can stop probing at the first match per outer row, and a hash semi-join can even de-duplicate the build side — both impossible for a plain join.</p>
<p><b>IN vs EXISTS performance.</b> Decades ago "EXISTS is faster than IN" was common advice (old Oracle/MySQL executed IN subqueries badly). Modern planners rewrite both to the same semi-join, so pick by <b>clarity and NULL semantics</b>, then confirm with EXPLAIN. Correlated EXISTS needs an <b>index on the inner join column</b> (<code>orders.customer_id</code>) to be fast on nested-loop engines like SQLite.</p>
<p><b>Why NOT IN cannot be an anti-join.</b> Because of the NULL semantics, the planner may only convert NOT IN to an anti-join if it can <b>prove</b> neither side contains NULL (NOT NULL constraints). Otherwise PostgreSQL falls back to a "hashed SubPlan" that must also check for NULLs, which can be dramatically slower on large data — another reason to prefer NOT EXISTS.</p>
<p><b>LEFT JOIN … IS NULL pitfalls.</b> Test a column that is <b>non-nullable in real rows</b> (PK or the join column). Testing a nullable data column returns false positives. Also, if the right side has many matches per key, the join first multiplies rows and then discards them — the anti-join operator avoids that.</p>
<p><b>Relational division</b> has two classic implementations: double NOT EXISTS (above) and <code>GROUP BY student HAVING COUNT(DISTINCT course) = (SELECT COUNT(*) FROM required)</code>. The counting version must join only to the required set and count DISTINCT, or extra/duplicate enrollments inflate the count.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> For "customers who never ordered", assistants often produce <code>NOT IN (SELECT customer_id FROM orders)</code> — it reads naturally and works on clean demo data. On real data with a single NULL it returns nothing, and nobody notices an empty "no problems found" report.</p>
<p><b>Use AI as a partner:</b> make NULL part of the spec: <i>"orders.customer_id is nullable; write an anti-join that is NULL-safe and explain why"</i>. Ask it to produce the three equivalent forms (NOT EXISTS, LEFT JOIN IS NULL, EXCEPT) and EXPLAIN each on your engine — learning by comparing plans.</p>
<p><b>Where AI goes wrong:</b> NOT IN on nullable columns, JOIN + DISTINCT where EXISTS is meant (hides duplicates and merges homonyms), LEFT JOIN … WHERE nullable_column IS NULL, and COUNT-based division without DISTINCT. <b>What you must still own:</b> three-valued logic — TRUE, FALSE, UNKNOWN — and the reflex "is that column nullable?" every time you write NOT IN.</p>`,
    problems: [{
      title: 'Courses Nobody Takes (NULL-proof anti-join)', level: 'Medium', tags: ['anti-join', 'not exists', 'null trap'], companies: ['Google', 'Microsoft', 'Uber'],
      statement: `<p>Using the school DB, list the <code>course_id</code> and <code>title</code> of courses that have <b>no enrollments at all</b>. Note: <code>enrollments.course_id</code> contains a NULL (an enrollment still being processed).</p>`,
      constraints: `<p>4 courses, 10 enrollments (one with course_id NULL, one for a deleted student). Must be correct whatever NULLs appear in enrollments.</p>`,
      example: `${H.table(['course_id', 'title'], [['C4', 'Poetry']])}<p>Databases, Algorithms and Statistics all have at least one enrollment. The NULL course_id row must not ${H.c('r', 'wipe out')} the answer.</p>`,
      brute: {
        why: `<p><code>NOT IN</code> compares each course with <b>every</b> value from the subquery, including the NULL. <code>'C4' &lt;&gt; NULL</code> is UNKNOWN, so <code>'C4' NOT IN (…, NULL)</code> is UNKNOWN and WHERE drops it. Result: <span class="c-r">zero rows</span> — the report claims every course is popular.</p>`,
        code: { lang: 'sql', db: 'school', code: `
-- WRONG: one NULL in enrollments.course_id makes NOT IN return nothing
SELECT course_id, title
FROM courses
WHERE course_id NOT IN (SELECT course_id FROM enrollments);` }
      },
      mcq: { q: 'Why does <code>NOT EXISTS (SELECT 1 FROM enrollments e WHERE e.course_id = c.course_id)</code> handle the NULL row correctly?', options: ['For the NULL row the WHERE is UNKNOWN, so that row simply does not count as a match', 'EXISTS converts NULL to 0', 'SQLite ignores NULL rows in subqueries', 'It does not — it also returns nothing'], answer: 0, explain: 'Inside EXISTS, a row is "found" only if its WHERE is TRUE. NULL = \'C4\' is UNKNOWN → not found. So NULLs can only make a match disappear, never poison the whole result.' },
      hints: [
        `<p>Hint 1: "Courses with no enrollments" = keep a course when a matching enrollment does <b>not</b> exist → anti-join.</p>`,
        `<p>Hint 2: Write it as <code>WHERE NOT EXISTS (SELECT 1 FROM enrollments e WHERE e.course_id = c.course_id)</code> — a correlated subquery.</p>`,
        `<p>Hint 3: If you must use NOT IN, add <code>WHERE course_id IS NOT NULL</code> inside the subquery. LEFT JOIN enrollments … WHERE e.course_id IS NULL also works (test the join column).</p>`
      ],
      solution: {
        approach: `<p>NOT EXISTS is the NULL-safe anti-join: a course is kept when no enrollment row satisfies <code>e.course_id = c.course_id</code>. The NULL enrollment never satisfies that equality, so it is ignored rather than poisoning the result.</p>`,
        code: { lang: 'sql', db: 'school', code: `
SELECT c.course_id, c.title
FROM courses AS c
WHERE NOT EXISTS (
  SELECT 1
  FROM enrollments AS e
  WHERE e.course_id = c.course_id     -- NULL course_id never equals anything
)
ORDER BY c.course_id;` },
        alt: [{ lang: 'sql', db: 'school', title: 'LEFT JOIN … IS NULL form', code: `
SELECT c.course_id, c.title
FROM courses c
LEFT JOIN enrollments e ON e.course_id = c.course_id
WHERE e.course_id IS NULL             -- only padded rows remain
ORDER BY c.course_id;` }],
        complexity: `<p>Anti-join: O(C + E) with a hash anti-join, or O(C · log E) with an index on enrollments.course_id; each course stops probing at its first match.</p>`,
        followUps: ['Also list students with no enrollments in the same result (UNION ALL with a type column).', 'Why is IN (positive) safe with NULLs while NOT IN is not?']
      }
    }]
  });

  /* ================= TOPIC 8: JOINING MULTIPLE TABLES ================= */
  topics.push({
    title: 'Joining Many Tables: Join Paths, Bridge Tables, and the LEFT-then-INNER Trap',
    analogy: `<p>Think of <b>connecting flights</b>. To get from Pune to Lisbon you fly Pune → Mumbai → Frankfurt → Lisbon. Each leg must <b>start where the previous one landed</b> (a shared airport). If one leg is cancelled, the whole trip fails — unless you booked a "flexible" ticket for that leg.</p>
<p>A multi-table join is a trip across your schema: order line → order → customer, order line → product. Each JOIN is one leg that connects through a shared key. An INNER leg with no connection cancels the trip for that row; a LEFT leg is the flexible ticket.</p>`,
    explain: `<p>🟢 <b>The plain idea.</b> You can chain as many joins as you need. Each new <code>JOIN … ON</code> adds <b>one</b> table, and its ON may refer to <b>any</b> table already in the FROM clause. Logically the joins are evaluated left to right: <code>((A ⋈ B) ⋈ C) ⋈ D</code> — every join takes the <b>result so far</b> as its left input.</p>
<pre>customers ──&lt; orders ──&lt; order_items &gt;── products
   (1)          (N)  (1)      (N)      (N)     (1)</pre>
<pre>SELECT c.name, o.order_id, p.name AS product, i.qty
FROM order_items i
JOIN orders    o ON o.order_id    = i.order_id      -- leg 1
JOIN customers c ON c.customer_id = o.customer_id   -- leg 2 (uses o)
JOIN products  p ON p.product_id  = i.product_id;   -- leg 3 (uses i)</pre>
<p><b>Step-by-step recipe:</b></p>
<ol><li>Draw the tables you need as boxes and connect them along <b>foreign keys</b>. That path is your join path.</li>
<li>Decide the <b>grain</b> of the answer ("one row per order line"). Start FROM the table at that grain.</li>
<li>Add one JOIN per edge. Joining "up" a many-to-one edge (line → order → customer) never multiplies rows. Joining "down" a one-to-many edge (customer → orders) multiplies rows.</li>
<li>For each leg decide <b>INNER</b> (row must have a partner) or <b>LEFT</b> (partner optional).</li></ol>
<p><b>Many-to-many</b> relationships (students ↔ courses, employees ↔ projects) always go through a <b>bridge table</b> (<code>enrollments</code>, <code>assignments</code>): <code>students → enrollments → courses</code> is two joins.</p>
<p>⚠️ <b>The LEFT-then-INNER trap.</b> <code>customers LEFT JOIN orders … INNER JOIN order_items ON i.order_id = o.order_id</code>: Eli's padded row has <code>o.order_id = NULL</code>, which cannot match any order item, so the INNER join <b>drops Eli again</b> — the LEFT JOIN's work is undone. Once a branch is optional, every table hanging off it must also be LEFT-joined (or grouped in parentheses: <code>LEFT JOIN (orders o JOIN order_items i ON …) ON …</code>).</p>`,
    clues: [
      'output needs columns from 3+ tables (customer name + product name + quantity) → chain joins along the FK path',
      '"many-to-many", "students and courses", "employees and projects" → go through the bridge/junction table',
      '"one row per order line / per enrollment" → start FROM the table at that grain, join "up" to parents',
      'a LEFT-joined table is followed by an INNER JOIN that hangs off it → preserved rows are being lost',
      'the same lookup table is needed in two roles (employee\'s dept and project\'s dept) → join it twice with different aliases',
      '"how are these two tables related?" with no direct FK → find an intermediate table (join path)'
    ],
    code: [
      { lang: 'sql', db: 'shop', title: 'Four tables: order lines with customer and product', code: `
SELECT o.order_id,
       c.name                 AS customer,
       p.name                 AS product,
       i.qty,
       i.qty * i.unit_price   AS line_total
FROM order_items AS i                                  -- grain: one row per order line
JOIN orders      AS o ON o.order_id    = i.order_id     -- up to the order
JOIN customers   AS c ON c.customer_id = o.customer_id  -- up to the customer
JOIN products    AS p ON p.product_id  = i.product_id   -- up to the product
ORDER BY o.order_id, p.name;` },
      { lang: 'sql', db: 'company', title: 'Many-to-many through a bridge table', code: `
-- employees <-> projects is many-to-many; assignments is the bridge.
SELECT e.name AS employee, p.name AS project, a.hours
FROM employees   AS e
JOIN assignments AS a ON a.emp_id     = e.emp_id
JOIN projects    AS p ON p.project_id = a.project_id
ORDER BY p.name, e.name;` }
    ],
    codeTitle: ['Join path (shop DB)', 'Bridge table (company DB)'],
    viz: {
      title: 'Two joins in a row: customers → orders → order_items',
      input: 'LEFT INNER',
      inputLabel: 'join type for leg 1 and leg 2 (INNER or LEFT each), e.g. LEFT LEFT',
      gen: function (input) {
        var t = String(input === undefined ? '' : input).trim().toUpperCase().split(/\s+/);
        if (t.length !== 2 || t.some(function (x) { return x !== 'INNER' && x !== 'LEFT'; })) throw new Error('Type two join types, e.g. LEFT LEFT or LEFT INNER');
        var C = [[1, 'Asha'], [2, 'Ben'], [5, 'Eli']];
        var O = [[101, 1], [102, 1], [103, 2], [105, null]];
        var I = [[101, 'Keyboard'], [101, 'Mouse'], [103, 'Lamp'], [105, 'Mouse']];
        var sql = 'SELECT c.name, o.order_id, i.product\nFROM customers c\n' + t[0] + ' JOIN orders o\n  ON o.customer_id = c.customer_id\n' + t[1] + ' JOIN order_items i\n  ON i.order_id = o.order_id;';
        var s1 = runJoin({
          type: t[0],
          L: { label: 'customers c', cols: ['customer_id', 'name'], rows: C },
          R: { label: 'orders o', cols: ['order_id', 'customer_id'], rows: O },
          test: function (l, r) { return eq(l[0], r[1]); },
          say: function (l, r, tt) { return 'Leg 1 — ' + l[1] + ' vs order ' + r[0] + ': ' + sayEq('c.customer_id', l[0], 'o.customer_id', r[1], tt); },
          outCols: ['c.name', 'o.order_id'],
          out: function (l, r) { return [l ? l[1] : null, r ? r[0] : null]; },
          sql: sql, lines: { scan: 4, emit: 1, keepL: 3 },
          intro: '<b>Leg 1</b> (' + t[0] + ' JOIN orders). Its result becomes the <b>left input</b> of leg 2 — joins are evaluated as ((customers ⋈ orders) ⋈ order_items).',
          outro: function (res) { return 'Leg 1 produced <b>' + res.length + '</b> intermediate row(s). ' + (t[0] === 'LEFT' ? 'Eli is present with order_id = NULL.' : 'Eli is already gone (no orders).') + ' Now leg 2 starts from this intermediate table.'; }
        });
        var s2 = runJoin({
          type: t[1],
          L: { label: 'intermediate (c ⋈ o)', cols: ['c.name', 'o.order_id'], rows: s1.result },
          R: { label: 'order_items i', cols: ['order_id', 'product'], rows: I },
          test: function (l, r) { return eq(l[1], r[0]); },
          say: function (l, r, tt) { return 'Leg 2 — (' + sv(l[0]) + ', ' + sv(l[1]) + ') vs item ' + sv(r[1]) + ': ' + sayEq('o.order_id', l[1], 'i.order_id', r[0], tt); },
          outCols: ['c.name', 'o.order_id', 'i.product'],
          out: function (l, r) { return [l ? l[0] : null, l ? l[1] : null, r ? r[1] : null]; },
          sql: sql, lines: { scan: 6, emit: 1, keepL: 5 },
          intro: '<b>Leg 2</b> (' + t[1] + ' JOIN order_items). Watch rows whose o.order_id is NULL: NULL can never equal an item\'s order_id.',
          outro: function (res) {
            var eli = res.some(function (r) { return r[0] === 'Eli'; });
            var ben = res.some(function (r) { return r[0] === 'Ben'; });
            return 'Final result: <b>' + res.length + '</b> row(s). ' + (t[0] === 'LEFT' && t[1] === 'INNER' ? '<span class="c-r">Trap!</span> Eli survived leg 1 thanks to LEFT JOIN, but the INNER leg 2 needed a non-NULL order_id and dropped him (and Asha\'s order 102, which has no items). Try <b>LEFT LEFT</b>.' : t[1] === 'LEFT' ? 'Every row from leg 1 survived; rows without items carry NULL product. ' + (eli ? 'Eli is still here.' : '') : 'Only complete chains customer → order → item remain. ' + (ben ? 'Ben made it through both legs.' : ''));
          }
        });
        return s1.frames.concat(s2.frames);
      }
    },
    examples: [
      {
        title: 'The LEFT-then-INNER trap and two fixes',
        html: `<p>Goal: every customer with the products they bought (none for Eli and Fay). Version 1 drops Eli and Fay because the INNER join to order_items needs a real order_id. Fix A: LEFT JOIN every table on the optional branch. Fix B: put the INNER join inside parentheses so "order + its items" is joined first and then attached optionally. Fix B also hides orders that have no items, which is sometimes exactly what you want.</p>
${H.table(['query', 'Eli / Fay present?'], [['LEFT orders, INNER items', '<span class="c-r">no</span>'], ['LEFT orders, LEFT items', '<span class="c-g">yes</span>'], ['LEFT (orders INNER items)', '<span class="c-g">yes</span>']])}`,
        code: { lang: 'sql', db: 'shop', code: `
-- Trap: 4 customers listed
SELECT COUNT(DISTINCT c.customer_id) AS customers_listed
FROM customers c
LEFT JOIN orders o       ON o.customer_id = c.customer_id
INNER JOIN order_items i ON i.order_id    = o.order_id;

-- Fix A: LEFT all the way down the optional branch -> 6
SELECT COUNT(DISTINCT c.customer_id) AS customers_listed
FROM customers c
LEFT JOIN orders o      ON o.customer_id = c.customer_id
LEFT JOIN order_items i ON i.order_id    = o.order_id;

-- Fix B: nested join, attached optionally -> 6
SELECT COUNT(DISTINCT c.customer_id) AS customers_listed
FROM customers c
LEFT JOIN (orders o JOIN order_items i ON i.order_id = o.order_id)
       ON o.customer_id = c.customer_id;` }
      },
      {
        title: 'Same lookup table in two roles',
        html: `<p>For each assignment, show the employee's department <b>and</b> the project's department, and flag cross-department work. <code>departments</code> is joined twice under different aliases (<code>ed</code>, <code>pd</code>) — a "role-playing" join. Ishaan-style orphans would be NULL on <code>ed</code>, so ed uses LEFT JOIN.</p>`,
        code: { lang: 'sql', db: 'company', code: `
SELECT e.name AS employee, ed.dept_name AS emp_dept,
       p.name AS project,  pd.dept_name AS project_dept,
       CASE WHEN e.dept_id = p.dept_id THEN 'home' ELSE 'cross-team' END AS kind
FROM assignments a
JOIN employees   e  ON e.emp_id      = a.emp_id
JOIN projects    p  ON p.project_id  = a.project_id
LEFT JOIN departments ed ON ed.dept_id = e.dept_id     -- role 1: employee's department
LEFT JOIN departments pd ON pd.dept_id = p.dept_id     -- role 2: project's department
ORDER BY project, employee;` }
      },
      {
        title: 'Students, courses and grades through the bridge',
        html: `<p>The enrollments bridge links students to courses. Starting FROM students with LEFT JOINs keeps Esha (no enrollments). The orphan enrollment (student 6) and the NULL course row behave differently: student 6 never appears (no student row to start from), Dhruv's NULL-course enrollment appears with a NULL title.</p>`,
        code: { lang: 'sql', db: 'school', code: `
SELECT s.name, c.title, e.grade
FROM students s
LEFT JOIN enrollments e ON e.student_id = s.student_id
LEFT JOIN courses     c ON c.course_id  = e.course_id
ORDER BY s.student_id, c.title;` }
      },
      {
        title: 'Order of JOIN lines vs order of execution',
        html: `<p>For inner joins the optimizer may execute legs in any order — it picks the cheapest using statistics (e.g. start from the 3 Electronics products, then find their order lines). You write joins in the order that reads best. With outer joins the written order matters for <b>meaning</b>, so the optimizer only reorders where it can prove equivalence. Use <code>EXPLAIN QUERY PLAN</code> in SQLite to see the chosen order.</p>`,
        code: { lang: 'sql', db: 'shop', code: `
EXPLAIN QUERY PLAN
SELECT c.name, p.name
FROM customers c
JOIN orders o      ON o.customer_id = c.customer_id
JOIN order_items i ON i.order_id    = o.order_id
JOIN products p    ON p.product_id  = i.product_id
WHERE p.category = 'Electronics';` }
      }
    ],
    deepDive: `<p>🟣 <b>Join ordering is the optimizer's hardest job.</b> With n inner-joined tables there are n! left-deep orders (and far more bushy trees). PostgreSQL uses dynamic programming up to <code>geqo_threshold</code> (12 tables by default), then a genetic algorithm; SQLite uses a "N nearest neighbours" path search; most engines stop exhaustively searching around 8–12 tables. Bad <b>cardinality estimates</b> (correlated columns, skew) compound across joins, which is why 10-table queries sometimes get terrible plans. Remedies: up-to-date statistics, extended statistics, breaking the query into CTEs/temp tables, or hints.</p>
<p><b>Outer join reordering rules.</b> <code>(A ⟕ B) ⟕ C</code> = <code>A ⟕ (B ⟕ C)</code> only when C's ON condition references B alone and is null-rejecting on B. Inner and outer joins generally cannot swap. Engines encode these rules (e.g. PostgreSQL's "join order restrictions") — another reason outer-join-heavy queries are harder to optimize.</p>
<p><b>Parentheses and precedence.</b> <code>A LEFT JOIN (B JOIN C ON …) ON …</code> is standard SQL; the inner pair joins first. MySQL has a historical gotcha: the comma operator has <b>lower precedence</b> than JOIN, so <code>FROM a, b JOIN c ON c.x = a.x</code> fails ("unknown column a.x") because it parses as <code>a, (b JOIN c ON …)</code>. Avoid mixing commas with JOIN.</p>
<p><b>Fan-out across branches.</b> Joining a parent to <b>two</b> different child tables (order → items and order → payments) multiplies the rows of the two branches together — the subject of the next topic. Rule: at most one one-to-many branch per query level; aggregate other branches first. <b>Indexes:</b> each leg needs an index on the column being probed (usually the FK on the child), or each leg is a full scan per outer row in nested-loop engines.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> Text-to-SQL systems now generate 5–10-table joins from a business question, using your schema (and semantic layers like dbt metrics / LookML) to find join paths. When the path is ambiguous — two routes between the same tables — they pick one silently, and the numbers differ.</p>
<p><b>Use AI as a partner:</b> ask it to <i>"draw the join path as an ASCII graph and label every edge 1:N or N:1, and the grain of the final result"</i>. Have it list which joins are optional and why. Ask it to add a row-count check after each leg (a CTE per leg) when debugging.</p>
<p><b>Where AI goes wrong:</b> LEFT-then-INNER chains, joining through the wrong bridge, joining two one-to-many branches at once (double-counting), and using a lookup table once when it is needed in two roles. <b>What you must still own:</b> the ER diagram in your head, the grain of each table, and the habit of checking that the row count after each join is what you predicted.</p>`,
    problems: [{
      title: 'Complete Order-Line Report (keep every line)', level: 'Medium', tags: ['multi-table join', 'left join', 'coalesce'], companies: ['Flipkart', 'Walmart', 'Instacart'],
      statement: `<p>Produce one row per <b>order line</b> (all 11 rows of <code>order_items</code>) with <code>order_id, customer, product, category, line_total</code>. If the order has no known customer show <code>'guest/unknown'</code>; if the product no longer exists show <code>'unknown product'</code>; NULL category → <code>'uncategorised'</code>. Order by order_id, product.</p>`,
      constraints: `<p>Shop DB. order 105 has customer NULL and a line for product 99 (deleted); order 106 points to deleted customer 9. Output must have exactly 11 rows.</p>`,
      example: `${H.table(['order_id', 'customer', 'product', 'category', 'line_total'], [['101', 'Asha', 'Keyboard', 'Electronics', '200'], ['105', '<span class="c-y">guest/unknown</span>', 'Mouse', 'Electronics', '25'], ['105', 'guest/unknown', '<span class="c-y">unknown product</span>', 'uncategorised', '74'], ['106', 'guest/unknown', 'Pen Set', 'Stationery', '60']])}<p>Lines are the grain: start FROM order_items and LEFT JOIN "up" to every parent so ${H.c('g', 'no line is lost')}.</p>`,
      brute: {
        why: `<p>All-INNER joins require every leg to connect. Lines of order 105 (no customer) and 106 (deleted customer) are dropped, along with the deleted product line: <span class="c-r">8 rows instead of 11</span>, and revenue totals computed from this report would be understated by 159.</p>`,
        code: { lang: 'sql', db: 'shop', code: `
-- WRONG: inner joins silently drop lines with missing parents (8 rows)
SELECT o.order_id, c.name AS customer, p.name AS product, p.category,
       i.qty * i.unit_price AS line_total
FROM order_items i
JOIN orders o    ON o.order_id = i.order_id
JOIN customers c ON c.customer_id = o.customer_id
JOIN products p  ON p.product_id = i.product_id
ORDER BY o.order_id, product;` }
      },
      mcq: { q: 'The grain is "one row per order line". Which table should the query start FROM?', options: ['order_items', 'customers', 'products', 'orders'], answer: 0, explain: 'Start from the table whose rows are the grain, then join "up" many-to-one to parents. Starting from customers would lose guest lines and multiply in the wrong direction.' },
      hints: [
        `<p>Hint 1: Every join from order_items "up" to orders, customers, products is many-to-one — it can never add rows, only lose them (with INNER).</p>`,
        `<p>Hint 2: Make each parent optional with LEFT JOIN — including customers, which hangs off orders.</p>`,
        `<p>Hint 3: COALESCE(c.name, 'guest/unknown'), COALESCE(p.name, 'unknown product'), COALESCE(p.category, 'uncategorised'); line_total = qty × unit_price from the line itself.</p>`
      ],
      solution: {
        approach: `<p>Start at the grain (order_items) and LEFT JOIN each parent. Because every edge is many-to-one, the row count stays exactly 11 — a perfect self-check. COALESCE turns missing parents into readable labels.</p>`,
        code: { lang: 'sql', db: 'shop', code: `
SELECT i.order_id,
       COALESCE(c.name, 'guest/unknown')     AS customer,
       COALESCE(p.name, 'unknown product')   AS product,
       COALESCE(p.category, 'uncategorised') AS category,
       i.qty * i.unit_price                  AS line_total
FROM order_items AS i                                   -- grain: order line
LEFT JOIN orders    AS o ON o.order_id    = i.order_id
LEFT JOIN customers AS c ON c.customer_id = o.customer_id
LEFT JOIN products  AS p ON p.product_id  = i.product_id
ORDER BY i.order_id, product;` },
        complexity: `<p>Three primary-key lookups per line: O(L log N) with B-tree PKs, or O(L + O + C + P) with hash joins. Output size = L exactly.</p>`,
        followUps: ['Add the payment status of each order without duplicating lines (hint: aggregate payments per order first).', 'Total revenue per category including "uncategorised".']
      }
    }]
  });

  /* ================= TOPIC 9: DUPLICATE-ROW PITFALLS ================= */
  topics.push({
    title: 'Duplicate-Row Pitfalls: Fan-Out, Many-to-Many Explosion and Double-Counted Totals',
    analogy: `<p>At a party, <b>2 hosts</b> each shake hands with <b>3 guests</b>. How many handshakes? Not 2 + 3 = 5, but 2 × 3 = <b>6</b>. Now imagine counting "money brought by guests" by adding it up <b>once per handshake</b> — every guest's money is counted twice, once for each host. The money did not double; your counting method did.</p>
<p>That is what happens when one order has 2 items and 3 payments and you join both: each payment is repeated for every item, and your <code>SUM</code> counts it again and again.</p>`,
    explain: `<p>🟢 <b>The plain idea.</b> A join outputs one row <b>per matching pair</b>. When a row has k matches, its values appear k times. That is correct and expected — until you <b>aggregate</b> the repeated values.</p>
<p><b>The four ways duplicates sneak in:</b></p>
${H.table(['Pitfall', 'Example', 'Symptom'], [['<b>Fan-out</b> (1 → N)', 'customers JOIN orders, then SUM(c.credit_limit)', 'parent values summed once per child'], ['<b>Chasm trap</b> (two N branches)', 'orders → items <b>and</b> orders → payments', 'items × payments rows per order; both sums inflated'], ['<b>Non-unique join key</b>', 'joining to a price-history table on product_id only', 'every row matches several versions'], ['<b>Many-to-many</b>', 'students ↔ courses via enrollments, joined to grades', 'rows multiply on both sides']])}
<p>Order 101 has <b>2 items</b> (billed 250) and <b>2 payments</b> (paid 250). Joining all three tables gives 2 × 2 = <b>4 rows</b> for order 101:</p>
${H.table(['item', 'line_total', 'payment', 'amount'], [['Keyboard', '200', '#1', '150'], ['Keyboard', '200', '#2', '100'], ['Mouse', '50', '#1', '150'], ['Mouse', '50', '#2', '100']])}
<p>SUM(line_total) = <span class="c-r">500</span> (should be 250) and SUM(amount) = <span class="c-r">500</span> (should be 250).</p>
<p><b>The fixes, best first:</b></p>
<ol><li><b>Aggregate each branch before joining</b> — one CTE that reduces payments to one row per order, another for items, then join those 1:1. This is the standard, always-correct fix.</li>
<li><b>Use EXISTS instead of a join</b> when the other table is only used for filtering ("customers who bought electronics").</li>
<li><b>COUNT(DISTINCT key)</b> is fine for <b>counting</b> entities after a fan-out.</li>
<li>⚠️ <b>Never "fix" sums with SUM(DISTINCT …)</b> — it de-duplicates <i>values</i>, not rows: two genuine payments of 50 would collapse into one 50.</li>
<li>⚠️ <b>SELECT DISTINCT</b> on the whole row hides the symptom of a wrong join; fix the join instead.</li></ol>
<p><b>Sanity check before every aggregation:</b> "What is the grain of my joined rows?" If it is not the grain of the thing you are summing, the sum is wrong.</p>`,
    clues: [
      'a total "looks too big" (exactly 2× or 3× the true value) → fan-out or chasm trap',
      'a parent with <b>two</b> child tables in one query (items and payments, orders and tickets) → aggregate each child first',
      'the query uses <code>SELECT DISTINCT</code> or <code>SUM(DISTINCT …)</code> to "fix" numbers → suspicious join',
      '"count customers who …" after joining to orders → COUNT(DISTINCT c.customer_id) or EXISTS',
      'joining to a history / versioned table (prices, addresses, exchange rates) → need the full key incl. the validity date',
      '"verify the join key is unique" → <code>GROUP BY key HAVING COUNT(*) &gt; 1</code> before joining'
    ],
    code: [
      { lang: 'sql', db: 'shop', title: 'The chasm trap: billed and paid both doubled for order 101', code: `
SELECT o.order_id,
       COUNT(*)              AS joined_rows,      -- items x payments
       SUM(i.qty * i.unit_price) AS billed_wrong,
       SUM(p.amount)         AS paid_wrong
FROM orders o
JOIN order_items i ON i.order_id = o.order_id
JOIN payments    p ON p.order_id = o.order_id
GROUP BY o.order_id
ORDER BY o.order_id;` },
      { lang: 'sql', db: 'shop', title: 'The fix: aggregate each branch to one row per order, then join 1:1', code: `
WITH billed AS (
  SELECT order_id, SUM(qty * unit_price) AS billed
  FROM order_items GROUP BY order_id          -- grain: one row per order
), paid AS (
  SELECT order_id, SUM(amount) AS paid
  FROM payments GROUP BY order_id             -- grain: one row per order
)
SELECT o.order_id,
       COALESCE(b.billed, 0) AS billed,
       COALESCE(p.paid, 0)   AS paid
FROM orders o
LEFT JOIN billed b ON b.order_id = o.order_id  -- 1:1, no multiplication
LEFT JOIN paid   p ON p.order_id = o.order_id  -- 1:1, no multiplication
ORDER BY o.order_id;` }
    ],
    codeTitle: ['Bug: double counting', 'Fix: pre-aggregate'],
    viz: {
      title: 'Duplicate explosion: order_items ⋈ payments on order_id',
      input: '101 101 102 103 | 101 101 102 104',
      inputLabel: 'order_id of each item | order_id of each payment (≤ 7 each)',
      gen: function (input) {
        var p = parseJoin(input, 'INNER', ['INNER'], 7, 7);
        var prods = ['Keyboard', 'Mouse', 'Lamp', 'Pens', 'Monitor', 'Pot', 'Box'], prices = [200, 50, 80, 40, 300, 15, 99], pays = [150, 100, 80, 40, 60, 30, 25];
        var items = p.left.map(function (k, i) { return [k, prods[i % 7], prices[i % 7]]; });
        var payments = p.right.map(function (k, i) { return [i + 1, k, pays[i % 7]]; });
        var r = runJoin({
          type: 'INNER',
          L: { label: 'order_items i', cols: ['order_id', 'product', 'line_total'], rows: items },
          R: { label: 'payments p', cols: ['payment_id', 'order_id', 'amount'], rows: payments },
          test: function (l, rr) { return eq(l[0], rr[1]); },
          say: function (l, rr, t) { return 'Item ' + sv(l[1]) + ' vs payment #' + rr[0] + ': ' + sayEq('i.order_id', l[0], 'p.order_id', rr[1], t) + (t === true ? '. Note: payment #' + rr[0] + ' may already be in the result for another item of the same order' : ''); },
          outCols: ['order_id', 'product', 'line_total', 'payment_id', 'amount'],
          out: function (l, rr) { return [l[0], l[1], l[2], rr[0], rr[2]]; },
          sql: 'SELECT i.order_id, i.product, i.line_total,\n       p.payment_id, p.amount\nFROM order_items i\nJOIN payments p\n  ON p.order_id = i.order_id;',
          lines: { scan: 5, emit: 1 },
          intro: 'Two child tables of the same order joined to each other (the <b>chasm trap</b>). Every item will pair with <b>every</b> payment of its order.',
          outro: function (res) { return 'Joined rows: <b>' + res.length + '</b> from only ' + items.length + ' items and ' + payments.length + ' payments. Look at how often each payment_id repeats.'; }
        });
        var f = r.frames, res = r.result;
        var keys = [];
        items.forEach(function (it) { if (it[0] !== null && keys.indexOf(it[0]) < 0) keys.push(it[0]); });
        payments.forEach(function (pp) { if (pp[1] !== null && keys.indexOf(pp[1]) < 0) keys.push(pp[1]); });
        var stats = keys.map(function (k) {
          var ni = items.filter(function (x) { return x[0] === k; }), np = payments.filter(function (x) { return x[1] === k; });
          var jr = res.filter(function (x) { return x[0] === k; });
          var sumI = ni.reduce(function (a, x) { return a + x[2]; }, 0), sumP = np.reduce(function (a, x) { return a + x[2]; }, 0);
          var nsI = jr.reduce(function (a, x) { return a + x[2]; }, 0), nsP = jr.reduce(function (a, x) { return a + x[4]; }, 0);
          return [k, ni.length, np.length, jr.length, nsI, sumI, nsP, sumP];
        });
        var bad = {};
        stats.forEach(function (s, i) { if (s[4] !== s[5] || s[6] !== s[7]) bad[i] = 'bad'; else bad[i] = 'ok'; });
        f.push(fr('Rows per order = <b>items × payments</b>. An order with 2 items and 2 payments explodes into 4 rows; an order missing either side vanishes from an inner join entirely.', [
          { type: 'bars', label: 'joined rows per order_id', values: stats.map(function (s) { return s[3]; }), idxLabels: stats.map(function (s) { return String(s[0]); }), texts: stats.map(function (s) { return s[1] + '×' + s[2] + '=' + s[3]; }) },
          tbl('Joined result', ['order_id', 'product', 'line_total', 'payment_id', 'amount'], res, {})
        ]));
        f.push(fr('Now GROUP BY order_id and SUM on the joined rows. <span class="c-r">Red</span> orders get the wrong totals: each item total is multiplied by the number of payments and each payment by the number of items.', [
          sqlp('SELECT i.order_id,\n       SUM(i.line_total) AS billed,  -- inflated\n       SUM(p.amount)     AS paid     -- inflated\nFROM order_items i\nJOIN payments p ON p.order_id = i.order_id\nGROUP BY i.order_id;', { 2: 'bad', 3: 'bad' }),
          tbl('Naive totals vs truth', ['order_id', '#items', '#payments', 'joined rows', 'naive billed', 'true billed', 'naive paid', 'true paid'], stats, bad)
        ]));
        f.push(fr('The fix: <b>aggregate each branch first</b> (one row per order on each side), then join 1:1 — nothing can multiply. Use LEFT/FULL joins so orders with items but no payments (or vice versa) still show.', [
          sqlp('WITH b AS (SELECT order_id, SUM(line_total) AS billed\n           FROM order_items GROUP BY order_id),\n     p AS (SELECT order_id, SUM(amount) AS paid\n           FROM payments GROUP BY order_id)\nSELECT COALESCE(b.order_id, p.order_id) AS order_id,\n       b.billed, p.paid\nFROM b FULL OUTER JOIN p ON p.order_id = b.order_id;', { 1: 'ok', 3: 'ok', 7: 'ok' }),
          tbl('Correct totals', ['order_id', 'billed', 'paid'], stats.map(function (s) { return [s[0], s[1] ? s[5] : null, s[2] ? s[7] : null]; }), (function () { var h = {}; stats.forEach(function (s, i) { h[i] = 'ok'; }); return h; })())
        ]));
        return f;
      }
    },
    examples: [
      {
        title: 'SUM(DISTINCT) is not a fix',
        html: `<p>Someone notices the doubled total and writes <code>SUM(DISTINCT p.amount)</code>. It "works" on order 101 (150 and 100 are different) but breaks on any order paid in <b>equal</b> instalments: two payments of 50 collapse into one. Below, order 'X' has 2 items and two payments of 50: the true paid amount is 100, the naive sum is 200, SUM(DISTINCT) gives <span class="c-r">50</span>. Only pre-aggregation is right.</p>`,
        code: { lang: 'sql', db: 'shop', code: `
WITH items(order_id, line_total) AS (VALUES ('X', 60), ('X', 40)),
     pays(order_id, amount)      AS (VALUES ('X', 50), ('X', 50))
SELECT SUM(p.amount)          AS naive_paid,     -- 200 (each payment counted twice)
       SUM(DISTINCT p.amount) AS distinct_paid,  -- 50  (equal payments collapsed!)
       (SELECT SUM(amount) FROM pays) AS true_paid  -- 100
FROM items i
JOIN pays p ON p.order_id = i.order_id;` }
      },
      {
        title: 'Counting after a fan-out: COUNT(DISTINCT) or EXISTS',
        html: `<p>"How many customers bought something in Electronics?" Joining customers → orders → items → products produces one row per <b>electronics line</b> (Asha has two: keyboard and mouse). COUNT(*) says 4; the true answer is 3 (Asha, Chen, Dev). COUNT(DISTINCT customer_id) and an EXISTS semi-join both give 3 — EXISTS also avoids building the duplicate rows.</p>`,
        code: { lang: 'sql', db: 'shop', code: `
SELECT COUNT(*) AS rows_after_join, COUNT(DISTINCT c.customer_id) AS customers
FROM customers c
JOIN orders o      ON o.customer_id = c.customer_id
JOIN order_items i ON i.order_id    = o.order_id
JOIN products p    ON p.product_id  = i.product_id
WHERE p.category = 'Electronics';

SELECT COUNT(*) AS customers_via_exists
FROM customers c
WHERE EXISTS (SELECT 1
              FROM orders o
              JOIN order_items i ON i.order_id = o.order_id
              JOIN products p    ON p.product_id = i.product_id
              WHERE o.customer_id = c.customer_id AND p.category = 'Electronics');` }
      },
      {
        title: 'Detect a non-unique join key before it bites',
        html: `<p>Before joining to any lookup table, prove the key is unique. <code>assignments</code> has two rows for Kabir (two projects), so joining employees to assignments repeats Kabir's salary — summing salaries "per department" after that join counts him twice (and, being an inner join, also drops Meera, who has no assignments). The total is wrong in both directions. The HAVING query finds such duplicate keys instantly.</p>`,
        code: { lang: 'sql', db: 'company', code: `
-- Which emp_ids appear more than once in assignments? (fan-out risk)
SELECT emp_id, COUNT(*) AS rows_per_emp
FROM assignments
GROUP BY emp_id
HAVING COUNT(*) > 1;

-- Consequence: department salary totals no longer match the employees table
SELECT e.dept_id,
       SUM(e.salary) AS salary_after_join,
       (SELECT SUM(salary) FROM employees x WHERE x.dept_id = e.dept_id) AS true_salary
FROM employees e
JOIN assignments a ON a.emp_id = e.emp_id
GROUP BY e.dept_id
ORDER BY e.dept_id;` }
      },
      {
        title: 'Fan-out from the "one" side: repeating a parent value',
        html: `<p>Totals of a <b>parent</b> column after joining to children are inflated by the number of children. Here each order's <code>amount</code> is repeated per order line: SUM(o.amount) over the join gives 1,493 instead of the real 1,024 for all orders. Sum parent columns <b>before</b> joining (or from the parent table alone).</p>`,
        code: { lang: 'sql', db: 'shop', code: `
SELECT SUM(o.amount) AS amount_after_join          -- orders with 2 lines counted twice
FROM orders o
JOIN order_items i ON i.order_id = o.order_id;

SELECT SUM(amount) AS true_amount FROM orders;     -- one row per order` }
      }
    ],
    deepDive: `<p>🟣 <b>Grain algebra.</b> If table A has grain "one row per order" and B has grain "one row per (order, x)", A ⋈ B has the grain of B. Joining two tables that each have several rows per order gives grain "(order, x, y)" with |B<sub>k</sub>| · |C<sub>k</sub>| rows for key k. Any additive measure from B is multiplied by |C<sub>k</sub>|, and vice versa. In BI tools this is called the <b>chasm trap</b> (two 1:N from the same parent) and the <b>fan trap</b> (1:N:N chains where measures from the middle table get repeated).</p>
<p><b>Why DISTINCT is a smell.</b> <code>SELECT DISTINCT</code> requires a sort or hash over all output columns — extra cost on top of building the duplicates — and it is semantically fragile: legitimately identical rows (two identical order lines) are merged. <code>SUM(DISTINCT)</code> is wrong whenever two real values coincide. <code>COUNT(DISTINCT pk)</code> is the only DISTINCT aggregate that is reliably correct after a fan-out, because primary keys are unique by definition.</p>
<p><b>Correct patterns at scale.</b> (1) Pre-aggregate in CTEs or derived tables, then join at matching grain. (2) Semi-joins (EXISTS) for filters. (3) <b>LATERAL</b> subqueries / correlated scalar subqueries for per-row totals. (4) In dimensional models (star schema), facts are joined to <b>dimensions</b> on their unique surrogate key, so fact-to-dimension joins never fan out — and two fact tables are combined only after aggregating each to a shared grain ("drill-across").</p>
<p><b>Slowly changing dimensions.</b> Joining to a history table (SCD type 2) must include the validity range: <code>ON d.product_id = f.product_id AND f.sold_at &gt;= d.valid_from AND f.sold_at &lt; d.valid_to</code>. Forgetting the range multiplies every fact by the number of versions. <b>Testing:</b> data teams assert grain with tests like dbt's <code>unique</code> and <code>dbt_utils.unique_combination_of_columns</code> on every model, so a bad join fails CI instead of a board meeting.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> Ask an assistant for "total billed and total paid per customer" and the most likely first draft joins customers → orders → items → payments in one go and sums both — the chasm trap, with numbers that look plausible. Text-to-SQL benchmarks show multi-fact questions are where AI accuracy drops most.</p>
<p><b>Use AI as a partner:</b> ask it to <i>"state the grain of every table and of the result after each join"</i> and <i>"flag any aggregate computed at a finer grain than its source table"</i>. Ask it to write a reconciliation test: the per-order totals must add up to <code>SELECT SUM(amount) FROM payments</code>.</p>
<p><b>Where AI goes wrong:</b> proposing SELECT DISTINCT or SUM(DISTINCT) to "fix" inflated numbers, joining two fact tables directly, and joining to history tables without the date range. <b>What you must still own:</b> the grain mindset, the reflex to cross-check a total against the single source table, and the pre-aggregate-then-join pattern.</p>`,
    problems: [{
      title: 'Department Headcount and Project Count', level: 'Medium', tags: ['fan-out', 'count distinct', 'pre-aggregation'], companies: ['LinkedIn', 'Atlassian', 'TCS'],
      statement: `<p>For <b>every</b> department return <code>dept_name</code>, <code>employees</code> (number of employees in it) and <code>projects</code> (number of projects it owns). Departments with no employees or no projects must show 0. Order by dept_id.</p>`,
      constraints: `<p>Company DB: departments (4), employees (10), projects (5). Each count must be exact even though a department has several employees <b>and</b> several projects.</p>`,
      example: `${H.table(['dept_name', 'employees', 'projects'], [['Engineering', '4', '2'], ['Sales', '3', '1'], ['HR', '1', '1'], ['Legal', '0', '1']])}<p>Joining Engineering to its 4 employees and its 2 projects at once creates ${H.c('r', '4 × 2 = 8 rows')}, so a plain COUNT would report 8 and 8.</p>`,
      brute: {
        why: `<p>Two one-to-many branches from departments are joined in the same query, so each department produces employees × projects rows. COUNT(e.emp_id) and COUNT(p.project_id) both return <span class="c-r">8</span> for Engineering, <span class="c-r">3</span> and <span class="c-r">3</span> for Sales. Classic chasm trap.</p>`,
        code: { lang: 'sql', db: 'company', code: `
-- WRONG: employees x projects rows per department -> inflated counts
SELECT d.dept_name, COUNT(e.emp_id) AS employees, COUNT(p.project_id) AS projects
FROM departments d
LEFT JOIN employees e ON e.dept_id = d.dept_id
LEFT JOIN projects  p ON p.dept_id = d.dept_id
GROUP BY d.dept_id, d.dept_name
ORDER BY d.dept_id;` }
      },
      mcq: { q: 'Engineering has 4 employees and 2 projects. How many rows does Engineering contribute after both LEFT JOINs?', options: ['8', '6', '4', '2'], answer: 0, explain: 'Each employee row pairs with each project row of the same department: 4 × 2 = 8. That multiplication is why COUNT and SUM are inflated.' },
      hints: [
        `<p>Hint 1: departments → employees and departments → projects are two independent one-to-many branches. Joining both multiplies them.</p>`,
        `<p>Hint 2: Quick fix for <b>counts only</b>: COUNT(DISTINCT e.emp_id) and COUNT(DISTINCT p.project_id) — primary keys are unique, so DISTINCT removes exactly the duplicates.</p>`,
        `<p>Hint 3: Robust fix: aggregate each branch to one row per dept_id in a CTE, then LEFT JOIN both CTEs to departments and COALESCE to 0. This also works for SUMs.</p>`
      ],
      solution: {
        approach: `<p>Pre-aggregate each branch to the department grain, then join 1:1 so nothing multiplies. COALESCE gives 0 for departments missing from a branch (Legal has no employees).</p>`,
        code: { lang: 'sql', db: 'company', code: `
WITH emp AS (
  SELECT dept_id, COUNT(*) AS employees
  FROM employees GROUP BY dept_id            -- one row per department
), proj AS (
  SELECT dept_id, COUNT(*) AS projects
  FROM projects GROUP BY dept_id             -- one row per department
)
SELECT d.dept_name,
       COALESCE(emp.employees, 0) AS employees,
       COALESCE(proj.projects, 0) AS projects
FROM departments d
LEFT JOIN emp  ON emp.dept_id  = d.dept_id
LEFT JOIN proj ON proj.dept_id = d.dept_id
ORDER BY d.dept_id;` },
        alt: [{ lang: 'sql', db: 'company', title: 'Counts-only shortcut with COUNT(DISTINCT pk)', code: `
SELECT d.dept_name,
       COUNT(DISTINCT e.emp_id)     AS employees,
       COUNT(DISTINCT p.project_id) AS projects
FROM departments d
LEFT JOIN employees e ON e.dept_id = d.dept_id
LEFT JOIN projects  p ON p.dept_id = d.dept_id
GROUP BY d.dept_id, d.dept_name
ORDER BY d.dept_id;` }],
        complexity: `<p>Pre-aggregation: O(E + P + D) with hash aggregation — each table read once and no blow-up. The DISTINCT version first builds Σ e<sub>d</sub> · p<sub>d</sub> rows, which can explode for big departments.</p>`,
        followUps: ['Add total salary per department — why does the COUNT(DISTINCT) shortcut no longer work?', 'Add total assigned hours per department through projects → assignments.']
      }
    }]
  });

  registerModule({ id: 'sql04', title: 'JOINs', intro: '<p>temp intro temp intro temp intro temp intro temp intro temp intro temp intro temp intro temp intro temp intro temp intro temp intro</p>', goals: ['aaaaaaaaaaaa', 'bbbbbbbbbbbbb', 'cccccccccccc'], prereqs: 'SQL 3 aggregates etc', hours: 10,
    databases: { shop: DB_SHOP, company: DB_COMPANY, school: DB_SCHOOL, weather: DB_WEATHER },
    topics: topics, practice: practice, quiz: quiz, interview: interview });
})();
