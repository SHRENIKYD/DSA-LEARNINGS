(function () {
  var topics = [], practice = [], quiz = [], interview = [];

  /* ---------- sample databases (SQLite dialect) ---------- */
  var DB = {
    hr: `CREATE TABLE employees (
  id        INTEGER PRIMARY KEY,
  name      TEXT    NOT NULL,
  dept      TEXT    NOT NULL,
  salary    INTEGER NOT NULL,
  hire_date TEXT    NOT NULL
);
INSERT INTO employees VALUES
 (1,'Asha','Engineering',120000,'2019-03-01'),
 (2,'Ben','Engineering',120000,'2020-07-15'),
 (3,'Chen','Engineering',110000,'2018-11-20'),
 (4,'Dev','Engineering',95000,'2021-01-10'),
 (5,'Eli','Engineering',95000,'2022-05-05'),
 (6,'Fay','Engineering',80000,'2023-02-01'),
 (7,'Gia','Sales',90000,'2017-06-12'),
 (8,'Hal','Sales',85000,'2019-09-30'),
 (9,'Ivy','Sales',85000,'2021-04-18'),
 (10,'Jay','Sales',70000,'2022-08-22'),
 (11,'Kim','HR',75000,'2016-01-04'),
 (12,'Leo','HR',60000,'2020-10-01'),
 (13,'Mia','HR',60000,'2023-06-19');
CREATE TABLE salary_history (
  emp_id         INTEGER NOT NULL REFERENCES employees(id),
  effective_date TEXT    NOT NULL,
  salary         INTEGER NOT NULL
);
INSERT INTO salary_history VALUES
 (1,'2019-03-01',90000),(1,'2020-04-01',100000),(1,'2022-04-01',120000),
 (2,'2020-07-15',105000),(2,'2023-04-01',120000),
 (7,'2017-06-12',70000),(7,'2019-04-01',80000),(7,'2021-04-01',90000),
 (11,'2016-01-04',60000),(11,'2020-04-01',75000);`,
    shop: `CREATE TABLE orders (
  id         INTEGER PRIMARY KEY,
  customer   TEXT    NOT NULL,
  order_date TEXT    NOT NULL,
  amount     INTEGER NOT NULL
);
INSERT INTO orders VALUES
 (1,'asha','2024-01-01',50),
 (2,'ben','2024-01-01',30),
 (3,'asha','2024-01-02',20),
 (4,'cara','2024-01-03',70),
 (5,'ben','2024-01-03',40),
 (6,'asha','2024-01-05',10),
 (7,'cara','2024-01-05',60),
 (8,'ben','2024-01-06',25),
 (9,'dan','2024-01-08',90),
 (10,'asha','2024-01-08',35);
CREATE TABLE daily_revenue (
  day     TEXT    NOT NULL,
  region  TEXT    NOT NULL,
  revenue INTEGER NOT NULL,
  PRIMARY KEY (day, region)
);
INSERT INTO daily_revenue VALUES
 ('2024-03-01','North',100),('2024-03-02','North',120),('2024-03-03','North',90),
 ('2024-03-05','North',150),('2024-03-06','North',130),('2024-03-07','North',130),
 ('2024-03-08','North',170),('2024-03-09','North',160),('2024-03-10','North',200),
 ('2024-03-01','South',80),('2024-03-02','South',95),('2024-03-03','South',95),
 ('2024-03-04','South',60),('2024-03-05','South',110),('2024-03-06','South',120),
 ('2024-03-07','South',100),('2024-03-08','South',140),('2024-03-09','South',150),
 ('2024-03-10','South',90);`,
    metrics: `CREATE TABLE scores (id INTEGER PRIMARY KEY, player TEXT NOT NULL, score REAL NOT NULL);
INSERT INTO scores VALUES
 (1,'ana',3.50),(2,'bo',3.65),(3,'cy',4.00),(4,'di',3.85),(5,'ed',4.00),(6,'flo',3.65);
CREATE TABLE weather (day TEXT PRIMARY KEY, temp INTEGER NOT NULL);
INSERT INTO weather VALUES
 ('2024-01-01',10),('2024-01-02',25),('2024-01-03',20),('2024-01-04',30),
 ('2024-01-06',35),('2024-01-07',33);
CREATE TABLE logs (id INTEGER PRIMARY KEY, num INTEGER NOT NULL);
INSERT INTO logs VALUES (1,1),(2,1),(3,1),(4,2),(5,1),(6,2),(7,2),(8,2),(9,3),(10,3);
CREATE TABLE bus_queue (person_id INTEGER PRIMARY KEY, person_name TEXT NOT NULL, weight INTEGER NOT NULL, turn INTEGER NOT NULL UNIQUE);
INSERT INTO bus_queue VALUES
 (5,'Arun',250,1),(4,'Bela',175,5),(3,'Chris',350,2),(6,'Dina',400,3),(1,'Eko',500,6),(2,'Femi',200,4);
CREATE TABLE stadium (id INTEGER PRIMARY KEY, visit_date TEXT NOT NULL, people INTEGER NOT NULL);
INSERT INTO stadium VALUES
 (1,'2024-01-01',10),(2,'2024-01-02',109),(3,'2024-01-03',150),(4,'2024-01-04',99),
 (5,'2024-01-05',145),(6,'2024-01-06',1455),(7,'2024-01-07',199),(8,'2024-01-09',188);
CREATE TABLE logins (user_id INTEGER NOT NULL, login_date TEXT NOT NULL);
INSERT INTO logins VALUES
 (1,'2024-01-01'),(1,'2024-01-02'),(1,'2024-01-03'),(1,'2024-01-05'),(1,'2024-01-06'),
 (2,'2024-01-01'),(2,'2024-01-03'),(2,'2024-01-04'),(2,'2024-01-05'),(2,'2024-01-06'),
 (3,'2024-01-02'),(3,'2024-01-02'),(3,'2024-01-03');
CREATE TABLE clicks (user_id INTEGER NOT NULL, ts TEXT NOT NULL);
INSERT INTO clicks VALUES
 (1,'2024-05-01 09:00'),(1,'2024-05-01 09:10'),(1,'2024-05-01 09:20'),
 (1,'2024-05-01 10:05'),(1,'2024-05-01 10:15'),(1,'2024-05-01 12:00'),
 (2,'2024-05-01 09:00'),(2,'2024-05-01 09:45'),(2,'2024-05-01 09:50');
CREATE TABLE user_profiles (id INTEGER PRIMARY KEY, email TEXT NOT NULL, plan TEXT NOT NULL, updated_at TEXT NOT NULL);
INSERT INTO user_profiles VALUES
 (1,'a@x.io','free','2024-02-01'),(2,'b@x.io','free','2024-02-03'),
 (3,'a@x.io','pro','2024-03-10'),(4,'c@x.io','team','2024-01-20'),
 (5,'b@x.io','pro','2024-02-03'),(6,'a@x.io','team','2024-02-15');
CREATE TABLE readings (id INTEGER PRIMARY KEY, ts TEXT NOT NULL, reading INTEGER);
INSERT INTO readings VALUES
 (1,'08:00',20),(2,'08:05',NULL),(3,'08:10',NULL),(4,'08:15',23),(5,'08:20',NULL),(6,'08:25',25),(7,'08:30',NULL);`
  };

  /* ---------- small helpers shared by the visualizers ---------- */
  // split "a, b, c" or multi-line input into trimmed non-empty items
  function items(s) { return String(s || '').split(/[,\n;]+/).map(function (x) { return x.trim(); }).filter(Boolean); }
  // parse a number or throw a friendly error
  function num(x, hint) { var v = Number(x); if (x === '' || x === undefined || isNaN(v)) throw new Error(hint); return v; }
  // pretty print: integers stay integers, others get 1 decimal
  function f1(v) { if (v === null || v === undefined) return 'NULL'; return Math.round(v) === v ? String(v) : (Math.round(v * 10) / 10).toFixed(1); }
  // deep-ish copy of a 2-D rows array so each frame owns its data
  function copyRows(rows) { return rows.map(function (r) { return r.slice(); }); }
  // parse "Dept Name Salary" items (salary may be 120 or 120000)
  function deptRows(input, max) {
    var out = items(input).map(function (it) {
      var p = it.split(/\s+/);
      if (p.length !== 3) throw new Error('Each item must be "Dept Name Salary", e.g. "Sales Gia 90", separated by commas');
      return { dept: p[0], name: p[1], salary: num(p[2], 'Salary must be a number, e.g. "Sales Gia 90"') };
    });
    if (out.length < 2) throw new Error('Give at least 2 rows like "Sales Gia 90, Sales Hal 85"');
    if (out.length > (max || 14)) throw new Error('Use at most ' + (max || 14) + ' rows so the table stays readable');
    return out;
  }
  // stable sort by dept ASC then salary DESC (what PARTITION BY dept ORDER BY salary DESC does)
  function byDeptSalary(rows) {
    return rows.map(function (r, i) { return { r: r, i: i }; }).sort(function (a, b) {
      if (a.r.dept !== b.r.dept) return a.r.dept < b.r.dept ? -1 : 1;
      if (a.r.salary !== b.r.salary) return b.r.salary - a.r.salary;
      return a.i - b.i;
    }).map(function (x) { return x.r; });
  }
  // list of [start, end] index ranges, one per partition, on rows already sorted by key()
  function partitions(rows, key) {
    var out = [], s = 0;
    for (var i = 1; i <= rows.length; i++) if (i === rows.length || key(rows[i]) !== key(rows[s])) { out.push([s, i - 1]); s = i; }
    return out;
  }
  // hl map giving every row in [lo, hi] the class cls
  function span(lo, hi, cls, base) { var h = base || {}; for (var i = lo; i <= hi; i++) h[i] = cls; return h; }


  /* =====================================================================
     TOPIC 1 — The OVER clause: PARTITION BY, ORDER BY, windows vs GROUP BY
     ===================================================================== */
  topics.push({
    title: 'The OVER Clause: PARTITION BY, ORDER BY & Windows vs GROUP BY',
    analogy: `<p>Think of a teacher handing back report cards. A <b>GROUP BY</b> report is the summary sheet pinned on the notice board: <i>"Class A average: 72"</i> — one line per class, the students have disappeared. A <b>window function</b> is the teacher writing the class average <b>on every student's own card</b>, right next to their mark. Every student keeps their own row, but each row can now "see" its classmates.</p>
<p>The <b>PARTITION BY</b> part says <i>"who are my classmates?"</i> (same department, same customer, same day). The <b>ORDER BY</b> part inside <code>OVER</code> says <i>"in what order do we line them up?"</i> — needed for ranks, running totals and "previous row" questions.</p>`,
    explain: `<p>A <b>window function</b> computes a value for each row using a <b>group of related rows</b> (the "window") — <b>without collapsing</b> those rows into one. That single sentence is the whole idea. Compare:</p>
${H.table(['', 'GROUP BY dept', 'SUM(salary) OVER (PARTITION BY dept)'], [
  ['Rows out', '1 per department (3 rows)', 'every input row (13 rows)'],
  ['Can show the employee name?', '<span class="c-r">No</span> — name is not grouped', '<span class="c-g">Yes</span> — the row is still there'],
  ['Typical question', '"total per department"', '"each employee AND their department total"']
])}
<p><b>The syntax has three knobs</b>, all optional:</p>
<pre>function(args) OVER (
    PARTITION BY dept          -- 1. split rows into independent groups
    ORDER BY salary DESC       -- 2. line the rows up inside each group
    ROWS BETWEEN 2 PRECEDING AND CURRENT ROW   -- 3. the frame (later topics)
)</pre>
<ul>
<li><b>PARTITION BY</b> — like GROUP BY, but rows stay separate. No PARTITION BY = the whole result is one big window.</li>
<li><b>ORDER BY</b> (inside OVER) — the order used <i>for the calculation</i>. It does <b>not</b> sort your final output; you still need an outer <code>ORDER BY</code> for that.</li>
<li><b>Frame</b> — which rows around the current row count (e.g. "the 3 latest"). Comes later.</li>
</ul>
<p><b>Empty <code>OVER ()</code></b> means "all rows of the result": <code>COUNT(*) OVER ()</code> puts the total row count on every row, perfect for percentages.</p>
${H.table(['name', 'dept', 'salary', 'dept_total', 'pct of dept'], [
  ['Asha', 'Engineering', '120000', '620000', '19.4'],
  ['Kim', 'HR', '75000', '195000', '<span class="c-g">38.5</span>'],
  ['Leo', 'HR', '60000', '195000', '30.8'],
  ['Gia', 'Sales', '90000', '330000', '27.3']
])}
<p><b>Where can a window function appear?</b> Only in <code>SELECT</code> and the final <code>ORDER BY</code>. It is computed <b>after</b> WHERE, GROUP BY and HAVING, so you <b>cannot</b> write <code>WHERE ROW_NUMBER() OVER (...) = 1</code> — SQLite answers <code>misuse of window function ROW_NUMBER()</code>. The fix is always the same: compute it in a CTE (WITH) or subquery, then filter outside.</p>
<p><b>Named windows:</b> if several functions share the same OVER spec, write it once: <code>... OVER w ... WINDOW w AS (PARTITION BY dept ORDER BY salary DESC)</code>. Less typing, fewer copy-paste bugs.</p>`,
    clues: [
      '"for each employee, also show their department\'s total / average" → aggregate OVER (PARTITION BY ...)',
      '"without collapsing rows" / "keep every row" / "along with the detail" → window, not GROUP BY',
      '"percentage of total" / "share of the department" → value / SUM(value) OVER (...)',
      '"compared to the average of their group" → AVG(...) OVER (PARTITION BY ...) in a CTE, then filter',
      '"rank", "previous", "running", "top N per", "latest per" → the ORDER BY knob inside OVER',
      'Interviewer says "can you do it in one pass without a self-join?" → window function'
    ],
    code: [
      { lang: 'sql', db: 'hr', title: 'Department totals on every row (runnable)', code: `-- Each employee keeps their row AND sees their department's numbers.
SELECT name,
       dept,
       salary,
       SUM(salary)            OVER (PARTITION BY dept) AS dept_total,  -- same value for the whole dept
       ROUND(AVG(salary)      OVER (PARTITION BY dept)) AS dept_avg,
       COUNT(*)               OVER ()                   AS headcount,  -- empty OVER = whole result
       ROUND(100.0 * salary / SUM(salary) OVER (PARTITION BY dept), 1) AS pct_of_dept
FROM employees
ORDER BY dept, salary DESC;   -- the OUTER order by decides how the output is shown` },
      { lang: 'sql', db: 'hr', title: 'Filter on a window value: compute in a CTE, filter outside', code: `-- Who earns more than their department average?
WITH t AS (
  SELECT name, dept, salary,
         AVG(salary) OVER (PARTITION BY dept) AS dept_avg
  FROM employees
)
SELECT name, dept, salary, ROUND(dept_avg) AS dept_avg
FROM t
WHERE salary > dept_avg          -- legal here: dept_avg is now an ordinary column
ORDER BY dept, salary DESC;` }
    ],
    codeTitle: ['PARTITION BY basics', 'Window + CTE filter pattern'],
    viz: [{
      title: 'PARTITION BY: rows grouped, values written on every row',
      input: 'Engineering Asha 120, Sales Gia 90, HR Kim 75, Engineering Ben 120, Sales Hal 85, HR Leo 60, Engineering Chen 110, Sales Ivy 85',
      inputLabel: 'Rows as "Dept Name Salary", comma separated (max 14)',
      gen: function (input) {
        var rows = deptRows(input, 14);
        var frames = [];
        frames.push({
          narr: '<b>FROM employees</b>: rows arrive in whatever order they are stored. Nothing is grouped yet. Our query: <code>SUM(salary) OVER (PARTITION BY dept)</code> and <code>AVG(salary) OVER (PARTITION BY dept)</code>.',
          parts: [{ type: 'table', label: 'employees (storage order)', columns: ['dept', 'name', 'salary'], rows: rows.map(function (r) { return [r.dept, r.name, r.salary]; }) }]
        });
        var s = byDeptSalary(rows);
        var ps = partitions(s, function (r) { return r.dept; });
        var cur = s.map(function (r) { return [r.dept, r.name, r.salary, '·', '·', '·']; });
        var cols = ['dept', 'name', 'salary', 'dept_total', 'dept_avg', '% of dept'];
        var hl0 = {};
        ps.forEach(function (p, k) { span(p[0], p[1], k % 2 ? 'sel' : 'win', hl0); });
        frames.push({
          narr: 'The engine <b>sorts by the partition key</b> (dept) so each department sits together. Each coloured block is one <b>partition</b> = one independent window. There are <b>' + ps.length + '</b> partitions. Rows are NOT merged.',
          parts: [{ type: 'table', label: 'sorted by dept → partitions', columns: cols, rows: copyRows(cur), hl: hl0 }]
        });
        ps.forEach(function (p) {
          var tot = 0, n = p[1] - p[0] + 1;
          for (var i = p[0]; i <= p[1]; i++) tot += s[i].salary;
          var hl = span(0, s.length - 1, 'done');
          span(p[0], p[1], 'win', hl);
          frames.push({
            narr: 'Window = partition <b>' + s[p[0]].dept + '</b> (' + n + ' rows, highlighted blue). The engine adds them up once: SUM = <b>' + tot + '</b>, AVG = ' + tot + ' / ' + n + ' = <b>' + f1(tot / n) + '</b>. Other departments are invisible to this window.',
            parts: [{ type: 'table', label: 'current window', columns: cols, rows: copyRows(cur), hl: hl }, { type: 'vars', label: 'window state', vals: { partition: s[p[0]].dept, rows: n, SUM: tot, AVG: f1(tot / n) }, hl: { SUM: 'ok' } }]
          });
          for (var j = p[0]; j <= p[1]; j++) { cur[j][3] = tot; cur[j][4] = f1(tot / n); cur[j][5] = f1(Math.round(1000 * s[j].salary / tot) / 10); }
          var hl2 = span(0, s.length - 1, 'done');
          span(p[0], p[1], 'ok', hl2);
          frames.push({
            narr: 'The result is written onto <b>every row</b> of ' + s[p[0]].dept + ' (green). That is the key difference from GROUP BY: ' + n + ' rows in, ' + n + ' rows out. The % column is salary / dept_total.',
            parts: [{ type: 'table', label: 'computed columns filling in', columns: cols, rows: copyRows(cur), hl: hl2 }]
          });
        });
        var grouped = ps.map(function (p) { var t = 0, n = p[1] - p[0] + 1; for (var i = p[0]; i <= p[1]; i++) t += s[i].salary; return [s[p[0]].dept, t, f1(t / n)]; });
        frames.push({
          narr: 'Side by side: <b>GROUP BY dept</b> gives ' + grouped.length + ' rows and loses the names. The <b>window</b> version keeps all ' + s.length + ' rows and adds the group numbers as extra columns.',
          parts: [
            { type: 'table', label: 'SELECT dept, SUM(salary), AVG(salary) ... GROUP BY dept', columns: ['dept', 'SUM', 'AVG'], rows: grouped, hl: span(0, grouped.length - 1, 'sel') },
            { type: 'table', label: 'window version (all rows kept)', columns: cols, rows: copyRows(cur), hl: span(0, s.length - 1, 'ok') }
          ]
        });
        var grand = 0; s.forEach(function (r) { grand += r.salary; });
        frames.push({
          narr: 'Bonus: <code>SUM(salary) OVER ()</code> — empty parentheses = <b>one window holding every row</b>. Each row gets the grand total ' + grand + '. Handy for "% of company payroll".',
          parts: [{ type: 'table', label: 'OVER () = whole result is one window', columns: ['dept', 'name', 'salary', 'SUM OVER ()', '% of all'], rows: s.map(function (r) { return [r.dept, r.name, r.salary, grand, f1(Math.round(1000 * r.salary / grand) / 10)]; }), hl: span(0, s.length - 1, 'win') }]
        });
        return frames;
      }
    }, {
      title: 'Logical order: where the window step happens',
      gen: function () {
        var E = [['Asha', 'Engineering', 120, '2019-03-01'], ['Ben', 'Engineering', 120, '2020-07-15'], ['Chen', 'Engineering', 110, '2018-11-20'], ['Dev', 'Engineering', 95, '2021-01-10'], ['Eli', 'Engineering', 95, '2022-05-05'], ['Fay', 'Engineering', 80, '2023-02-01'], ['Gia', 'Sales', 90, '2017-06-12'], ['Hal', 'Sales', 85, '2019-09-30'], ['Ivy', 'Sales', 85, '2021-04-18'], ['Jay', 'Sales', 70, '2022-08-22'], ['Kim', 'HR', 75, '2016-01-04'], ['Leo', 'HR', 60, '2020-10-01'], ['Mia', 'HR', 60, '2023-06-19']];
        var code = "SELECT dept, SUM(salary) AS total,\n       RANK() OVER (ORDER BY SUM(salary) DESC) AS rk\nFROM employees\nWHERE hire_date >= '2019-01-01'\nGROUP BY dept\nORDER BY rk;";
        var cols = ['name', 'dept', 'salary (k)', 'hire_date'];
        var frames = [];
        frames.push({ narr: 'Step 1 — <b>FROM</b>: read all 13 employees (salaries shown in thousands).', parts: [{ type: 'code', lang: 'sql', code: code, hl: { 3: 'cur' } }, { type: 'table', label: 'FROM employees', columns: cols, rows: E.map(function (r) { return r.slice(); }) }] });
        var hl = {}, kept = [];
        E.forEach(function (r, i) { if (r[3] >= '2019-01-01') kept.push(r); else hl[i] = 'bad'; });
        frames.push({ narr: 'Step 2 — <b>WHERE</b> removes people hired before 2019 (red). Window functions have <b>not</b> run yet — that is why you cannot use them in WHERE.', parts: [{ type: 'code', lang: 'sql', code: code, hl: { 4: 'cur' } }, { type: 'table', label: 'after WHERE', columns: cols, rows: E.map(function (r) { return r.slice(); }), hl: hl }] });
        var groups = {}, order = [];
        kept.forEach(function (r) { if (!groups[r[1]]) { groups[r[1]] = 0; order.push(r[1]); } groups[r[1]] += r[2]; });
        var g = order.map(function (d) { return [d, groups[d]]; });
        frames.push({ narr: 'Step 3 — <b>GROUP BY dept</b> collapses the ' + kept.length + ' surviving rows into ' + g.length + ' groups and computes SUM(salary).', parts: [{ type: 'code', lang: 'sql', code: code, hl: { 5: 'cur' } }, { type: 'table', label: 'after GROUP BY', columns: ['dept', 'SUM(salary)'], rows: g }] });
        var sorted = g.slice().sort(function (a, b) { return b[1] - a[1]; });
        var withRank = sorted.map(function (r, i) { return [r[0], r[1], i + 1]; });
        frames.push({ narr: 'Step 4 — <b>window functions</b> run on the <b>grouped</b> rows. <code>RANK() OVER (ORDER BY SUM(salary) DESC)</code> ranks the groups. A window can wrap an aggregate because GROUP BY already happened.', parts: [{ type: 'code', lang: 'sql', code: code, hl: { 2: 'cur' } }, { type: 'table', label: 'window step', columns: ['dept', 'total', 'rk'], rows: withRank, hl: { 0: 'ok', 1: 'ok', 2: 'ok' } }] });
        frames.push({ narr: 'Step 5 — <b>SELECT</b> picks the columns, then <b>ORDER BY rk</b> sorts the output (ORDER BY may use window results). Full order: FROM → WHERE → GROUP BY → HAVING → <b>WINDOW</b> → SELECT → DISTINCT → ORDER BY → LIMIT.', parts: [{ type: 'code', lang: 'sql', code: code, hl: { 1: 'ok', 6: 'cur' } }, { type: 'table', label: 'final result', columns: ['dept', 'total', 'rk'], rows: withRank, hl: { 0: 'sel' } }] });
        return frames;
      }
    }],
    examples: [
      { title: 'Share of department payroll', html: `<p>Question: "Show each employee's salary as a percentage of their department's payroll." Without windows you would GROUP BY in a subquery and JOIN it back. With a window it is one expression: <code>100.0 * salary / SUM(salary) OVER (PARTITION BY dept)</code>. Kim gets ${H.c('g', '38.5%')} of HR (75000 / 195000). Note <code>100.0</code> — multiplying by a decimal first avoids SQLite's integer division (75000 / 195000 = 0 in integers!).</p>`,
        code: { lang: 'sql', db: 'hr', code: `SELECT name, dept, salary,
       ROUND(100.0 * salary / SUM(salary) OVER (PARTITION BY dept), 1) AS pct_of_dept
FROM employees
ORDER BY dept, pct_of_dept DESC;` } },
      { title: 'Same numbers, different row counts', html: `<p>Run both queries. The GROUP BY one returns ${H.c('r', '3 rows')}; the window one returns ${H.c('g', '13 rows')} with identical totals repeated inside each department. When an interviewer says "list every employee with..." you need the window version.</p>`,
        code: { lang: 'sql', db: 'hr', code: `SELECT dept, SUM(salary) AS total FROM employees GROUP BY dept;

SELECT name, dept, SUM(salary) OVER (PARTITION BY dept) AS total
FROM employees
ORDER BY dept, name;` } },
      { title: 'Percent of grand total with a window over an aggregate', html: `<p>Windows run after GROUP BY, so you may nest an aggregate inside a window: <code>SUM(SUM(amount)) OVER ()</code> = "sum of all the group sums" = grand total. Result: cara ${H.c('g', '30.2%')}, asha 26.7%, ben 22.1%, dan 20.9%.</p>`,
        code: { lang: 'sql', db: 'shop', code: `SELECT customer,
       SUM(amount) AS total,
       ROUND(100.0 * SUM(amount) / SUM(SUM(amount)) OVER (), 1) AS pct_of_all
FROM orders
GROUP BY customer
ORDER BY total DESC;` } },
      { title: 'Named WINDOW clause — write the spec once', html: `<p>Three functions share one window. The <code>WINDOW w AS (...)</code> clause sits after HAVING and before ORDER BY. It is standard SQL and works in SQLite, PostgreSQL and MySQL 8.</p>`,
        code: { lang: 'sql', db: 'hr', code: `SELECT name, dept, salary,
       MIN(salary) OVER w AS dept_min,
       MAX(salary) OVER w AS dept_max,
       COUNT(*)    OVER w AS dept_size
FROM employees
WINDOW w AS (PARTITION BY dept)
ORDER BY dept, salary DESC;` } }
    ],
    deepDive: `<p><b>How the engine really runs it.</b> A window operator needs its input sorted by <code>(partition keys, order keys)</code>. The plan is typically: scan → filter (WHERE) → aggregate (GROUP BY) → <b>sort</b> → <b>window operator</b> streaming over the sorted rows → project → final sort. The window operator holds one partition (or just the current frame) at a time, so an unframed aggregate like <code>SUM() OVER (PARTITION BY dept)</code> is computed once per partition and stamped on each row. Cost ≈ one O(N log N) sort plus O(N) streaming — versus the correlated-subquery alternative that re-scans the table for every row (O(N²) without an index).</p>
<p><b>Indexes help:</b> an index on <code>(dept, salary)</code> can deliver rows already in partition order, letting PostgreSQL/MySQL skip the sort. Several windows with <b>different</b> specs force several sorts; windows with the <b>same</b> spec (use a named WINDOW) share one. In PostgreSQL look for <code>WindowAgg</code> in EXPLAIN; in SQLite the planner materialises a sorted subquery.</p>
<p><b>Rules that trip people up:</b> (1) window functions are illegal in WHERE, GROUP BY and HAVING; (2) <code>COUNT(DISTINCT x) OVER (...)</code> is rejected by SQLite and PostgreSQL ("DISTINCT is not supported for window functions") — use <code>DENSE_RANK</code> tricks or a pre-aggregated CTE; (3) NULLs in a PARTITION BY column form <b>one</b> partition together; (4) the ORDER BY inside OVER never guarantees output order. Some warehouses (Snowflake, BigQuery, DuckDB, Databricks) add <code>QUALIFY</code> to filter on window results directly — SQLite, PostgreSQL and MySQL do not, so the CTE pattern is the portable answer.</p>`,
    aiEra: `<p><b>What AI changes:</b> Copilots and text-to-SQL tools write <code>OVER (PARTITION BY ...)</code> fluently; the boilerplate is no longer the hard part. The hard part is still knowing <i>which</i> rows belong in the window and whether rows should collapse.</p>
<p><b>Use AI as a partner:</b> paste the schema and 5 sample rows, then ask <code>"Write the query AND show the expected output for these rows"</code>. Run it in the playground and compare. Ask it to <code>"generate test rows with ties, NULL departments and a one-person department"</code> to break your query.</p>
<p><b>Where AI goes wrong:</b> putting a window function inside WHERE; using <code>QUALIFY</code> on an engine that lacks it; integer division in percentages; forgetting the outer ORDER BY and assuming OVER's ORDER BY sorts the output.</p>
<p><b>What you must still own:</b> the GROUP BY vs window decision, the logical processing order, and being able to explain the plan (sort + stream) when the interviewer asks "why is this faster than a self-join?".</p>`
  });

  /* =====================================================================
     TOPIC 2 — ROW_NUMBER vs RANK vs DENSE_RANK
     ===================================================================== */
  topics.push({
    title: 'ROW_NUMBER vs RANK vs DENSE_RANK (Ties Decide Everything)',
    analogy: `<p>Picture a race where two runners cross the line at exactly the same time.</p>
<ul><li><b>ROW_NUMBER</b> is the <b>ticket queue</b> at a bakery: everyone gets a unique number 1, 2, 3, 4… even if two people arrived together — someone just gets the lower ticket.</li>
<li><b>RANK</b> is the <b>Olympic podium</b>: two golds, then the next runner gets <b>bronze</b> (rank 3). Silver is skipped — a gap.</li>
<li><b>DENSE_RANK</b> is <b>"how many different times are faster than mine, plus one"</b>: two golds, then silver. No gaps.</li></ul>`,
    explain: `<p>All three number the rows of each partition in the order given by <code>ORDER BY</code> inside OVER. They only differ when two rows <b>tie</b> on the ORDER BY value (SQL calls tied rows <b>peers</b>).</p>
${H.table(['name', 'salary', 'ROW_NUMBER', 'RANK', 'DENSE_RANK'], [
  ['Asha', '120000', '1', '<span class="c-y">1</span>', '<span class="c-y">1</span>'],
  ['Ben', '120000', '2', '<span class="c-y">1</span>', '<span class="c-y">1</span>'],
  ['Chen', '110000', '3', '<span class="c-r">3</span> (2 skipped)', '<span class="c-g">2</span>'],
  ['Dev', '95000', '4', '<span class="c-y">4</span>', '<span class="c-y">3</span>'],
  ['Eli', '95000', '5', '<span class="c-y">4</span>', '<span class="c-y">3</span>'],
  ['Fay', '80000', '6', '<span class="c-r">6</span> (5 skipped)', '<span class="c-g">4</span>']
])}
<p><b>Plain-English formulas</b> (for a row with value v, ordering high → low):</p>
<ul>
<li><b>ROW_NUMBER</b> = its position in the line. Always 1, 2, 3… with no repeats. Among ties the order is <b>not guaranteed</b> — add a tiebreaker column.</li>
<li><b>RANK</b> = 1 + (number of rows with a strictly better value). Ties share a rank; the next rank jumps ahead → <b>gaps</b>.</li>
<li><b>DENSE_RANK</b> = 1 + (number of <b>distinct</b> better values). Ties share; next value gets the next integer → <b>no gaps</b>.</li>
</ul>
<p><b>Which one does the question want?</b></p>
${H.table(['Wording', 'Use', 'Why'], [
  ['"exactly one row per group", "latest order", "dedupe"', 'ROW_NUMBER', 'must never return 2 rows for position 1'],
  ['"competition ranking", "position on a leaderboard with ties"', 'RANK', 'ties share, later places skip'],
  ['"Nth highest salary", "top 3 distinct salaries", "rank scores without gaps"', 'DENSE_RANK', 'counts distinct values'],
])}
<p>Add <code>PARTITION BY dept</code> and the numbering <b>restarts at 1</b> for each department — that is "rank within department", the #1 window-function interview question.</p>`,
    clues: [
      '"rank ... within each department / category / region" → RANK or DENSE_RANK with PARTITION BY',
      '"Nth highest", "second highest", "distinct salaries" → DENSE_RANK() = N',
      '"no gaps between ranks" / "consecutive integers" → DENSE_RANK; "Olympic / competition style" → RANK',
      '"exactly one row per ..." / "pick one if tied" / "latest record" → ROW_NUMBER with a tiebreaker',
      'Sample output shows 1, 1, 3 → RANK; shows 1, 1, 2 → DENSE_RANK; shows 1, 2, 3 on equal values → ROW_NUMBER',
      '"if there is no Nth value, return NULL" → wrap the DENSE_RANK lookup in a scalar subquery'
    ],
    code: { lang: 'sql', db: 'hr', title: 'All three side by side, within each department', code: `SELECT dept, name, salary,
       ROW_NUMBER() OVER w AS row_num,     -- 1,2,3,... unique (ties broken arbitrarily)
       RANK()       OVER w AS rnk,         -- ties share, then a gap
       DENSE_RANK() OVER w AS dense_rnk    -- ties share, no gap
FROM employees
WINDOW w AS (PARTITION BY dept ORDER BY salary DESC)
ORDER BY dept, salary DESC, name;` },
    viz: {
      title: 'Three ranking columns filling in on ties',
      input: '120 120 110 95 95 95 80',
      inputLabel: 'Salaries (any order, space separated, max 12) — they get sorted high → low',
      gen: function (input) {
        var v = String(input).trim().split(/[\s,]+/).filter(Boolean).map(function (x) { return num(x, 'Enter numbers separated by spaces, e.g. 120 120 110 95'); });
        if (v.length < 3) throw new Error('Give at least 3 numbers');
        if (v.length > 12) throw new Error('Use at most 12 numbers');
        v.sort(function (a, b) { return b - a; });
        var rows = v.map(function (x) { return [x, '·', '·', '·']; });
        var cols = ['salary', 'ROW_NUMBER', 'RANK', 'DENSE_RANK'];
        var frames = [{ narr: 'Rows are lined up by <code>ORDER BY salary DESC</code>. Three empty columns are waiting. Watch what happens whenever a salary <b>equals</b> the one above it (a tie = "peers").', parts: [{ type: 'table', label: 'ORDER BY salary DESC', columns: cols, rows: copyRows(rows) }, { type: 'vars', label: 'counters', vals: { position: 0, rank: '-', dense: 0 } }] }];
        var rank = 0, dense = 0;
        for (var i = 0; i < v.length; i++) {
          var tie = i > 0 && v[i] === v[i - 1];
          if (!tie) { rank = i + 1; dense++; }
          rows[i][1] = i + 1; rows[i][2] = rank; rows[i][3] = dense;
          var hl = span(0, i - 1, 'done');
          if (tie) { var s = i; while (s > 0 && v[s - 1] === v[i]) s--; span(s, i - 1, 'win', hl); }
          hl[i] = tie ? 'cur' : 'ok';
          var narr = 'Row ' + (i + 1) + ', salary <b>' + v[i] + '</b>: ';
          if (i === 0) narr += 'first row → all three start at <b>1</b>.';
          else if (tie) narr += '<span class="c-y">TIE</span> with the row above (blue peers). ROW_NUMBER still moves on to <b>' + (i + 1) + '</b>; RANK repeats <b>' + rank + '</b>; DENSE_RANK repeats <b>' + dense + '</b>.';
          else narr += 'new, lower value. ROW_NUMBER = position <b>' + (i + 1) + '</b>. RANK jumps to the position too (<b>' + rank + '</b>' + (rank - rows[i - 1][2] > 1 ? ', <span class="c-r">skipping ' + (rank - rows[i - 1][2] - 1) + ' number(s)</span>' : '') + '). DENSE_RANK only steps by one → <b>' + dense + '</b>.';
          frames.push({ narr: narr, parts: [{ type: 'table', label: 'computed columns', columns: cols, rows: copyRows(rows), hl: hl }, { type: 'vars', label: 'counters', vals: { position: i + 1, rank: rank, dense: dense, tie: tie ? 'yes' : 'no' }, hl: tie ? { tie: 'bad' } : { rank: 'ok', dense: 'ok' } }] });
        }
        var gaps = {};
        for (var k = 1; k < v.length; k++) if (rows[k][2] - rows[k - 1][2] > 1) gaps[k] = 'bad';
        frames.push({ narr: 'Done. Red rows are where <b>RANK left a gap</b> (because ties used up positions). DENSE_RANK ends at <b>' + dense + '</b> = number of distinct salaries. ROW_NUMBER ends at <b>' + v.length + '</b> = number of rows.', parts: [{ type: 'table', label: 'final', columns: cols, rows: copyRows(rows), hl: gaps }, { type: 'vars', label: 'summary', vals: { rows: v.length, distinct_values: dense, max_rank: rank }, hl: { distinct_values: 'sel' } }] });
        var target = Math.min(2, dense), pick = [];
        rows.forEach(function (r, i) { if (r[3] === target) pick.push(i); });
        var hl3 = {}; pick.forEach(function (i) { hl3[i] = 'sel'; });
        frames.push({ narr: '"Find the <b>' + target + (target === 2 ? 'nd' : 'st') + ' highest salary</b>" → filter <code>DENSE_RANK = ' + target + '</code> (purple). RANK = 2 might match <b>nothing</b> when there is a tie at the top, and ROW_NUMBER = 2 might return a duplicate of the top salary. That is why "Nth highest" means DENSE_RANK.', parts: [{ type: 'table', label: 'WHERE dense_rank = ' + target, columns: cols, rows: copyRows(rows), hl: hl3 }] });
        return frames;
      }
    },
    examples: [
      { title: 'Company-wide ranking with ties', html: `<p>No PARTITION BY → one window. Asha and Ben tie at 120000: ROW_NUMBER gives 1 and 2, RANK gives ${H.c('y', '1, 1, then 3')}, DENSE_RANK gives ${H.c('g', '1, 1, then 2')}. At the bottom, Leo and Mia tie: RANK 12, 12; DENSE_RANK 9, 9 (there are 9 distinct salaries).</p>`,
        code: { lang: 'sql', db: 'hr', code: `SELECT name, salary,
       ROW_NUMBER() OVER (ORDER BY salary DESC) AS rn,
       RANK()       OVER (ORDER BY salary DESC) AS rnk,
       DENSE_RANK() OVER (ORDER BY salary DESC) AS drnk
FROM employees
ORDER BY salary DESC, rn;` } },
      { title: 'ROW_NUMBER is non-deterministic on ties — add a tiebreaker', html: `<p>Asha and Ben both earn 120000. Who is row 1? The SQL standard says "implementation-dependent" — it can change after an index is added or data is reloaded. Make it deterministic: <code>ORDER BY salary DESC, hire_date</code> (seniority wins) or <code>, id</code>. Also notice ${H.c('r', 'RANK() OVER ()')} with no ORDER BY gives everyone rank 1: without ordering, every row is a peer of every other row.</p>`,
        code: { lang: 'sql', db: 'hr', code: `SELECT name, salary, hire_date,
       ROW_NUMBER() OVER (ORDER BY salary DESC, hire_date) AS rn_deterministic,
       RANK()       OVER ()                                 AS rank_no_order
FROM employees
WHERE dept = 'Engineering';` } },
      { title: 'Second highest salary, NULL if it does not exist', html: `<p>Classic: "Return the second highest <b>distinct</b> salary, or NULL." DENSE_RANK = 2 gives ${H.c('g', '110000')}. Wrapping it as a scalar subquery means "no row" turns into NULL (the twentieth highest is ${H.c('m', 'NULL')}). <code>DISTINCT</code> is needed because two people could share the second salary.</p>`,
        code: { lang: 'sql', db: 'hr', code: `WITH ranked AS (
  SELECT salary, DENSE_RANK() OVER (ORDER BY salary DESC) AS dr
  FROM employees
)
SELECT (SELECT DISTINCT salary FROM ranked WHERE dr = 2)  AS second_highest,
       (SELECT DISTINCT salary FROM ranked WHERE dr = 20) AS twentieth_highest;` } },
      { title: 'Ascending rank: "newest hire = 1" per department', html: `<p>Ranking direction is just the ORDER BY direction. Here the most recent hire in each department gets 1: Fay in Engineering, Mia in HR, Jay in Sales. Since hire dates are unique, all three functions agree — they only differ on ties.</p>`,
        code: { lang: 'sql', db: 'hr', code: `SELECT dept, name, hire_date,
       ROW_NUMBER() OVER (PARTITION BY dept ORDER BY hire_date DESC) AS newest_first
FROM employees
ORDER BY dept, newest_first;` } }
    ],
    deepDive: `<p><b>Exact definitions.</b> Within a partition sorted by the window ORDER BY: <code>ROW_NUMBER</code> = ordinal position; <code>RANK</code> = 1 + count of rows that sort strictly before the current row's peer group; <code>DENSE_RANK</code> = 1 + count of distinct peer groups before it. Ranking functions <b>ignore the frame clause</b> entirely — they depend only on partition and order. Without ORDER BY all rows are peers: RANK and DENSE_RANK return 1 everywhere.</p>
<p><b>Determinism.</b> Only ROW_NUMBER is sensitive to tie order. A query that uses <code>ROW_NUMBER() ... = 1</code> without a unique tiebreaker can return different rows on different runs, replicas or engine versions — a real production bug source (flaky dashboards, failing reconciliation). Always end the ORDER BY with a unique key.</p>
<p><b>NULLs.</b> NULLs are peers of each other. SQLite and MySQL sort NULLs first in ASC and last in DESC; PostgreSQL and Oracle do the opposite (NULLs are "largest"). Use <code>NULLS LAST</code> (SQLite ≥ 3.30, PostgreSQL, Oracle) to be explicit; MySQL needs <code>ORDER BY col IS NULL, col</code>.</p>
<p><b>Cost.</b> All three are O(1) per row after the sort: the operator just keeps a counter, the previous row's ORDER BY values and (for RANK) the current position. The correlated-subquery equivalents — <code>1 + (SELECT COUNT(DISTINCT s2) ... WHERE s2 &gt; s1)</code> — are O(N²) per partition without an index. An index only turns each row's scan into a range read of its partition, which is still more work than one sort. On 10<sup>6</sup> rows that can be the difference between seconds and hours.</p>`,
    aiEra: `<p><b>What AI changes:</b> Ask an assistant for "rank within department" and it will write a correct-looking query in a second. The thing it most often gets wrong is the <b>choice of function</b>: it defaults to ROW_NUMBER or RANK even when the wording ("Nth highest distinct") needs DENSE_RANK.</p>
<p><b>Use AI as a partner:</b> before trusting a ranking query, ask: <code>"Give me 6 rows with two ties at the top and one tie in the middle, and the exact expected output"</code>. Run it. If the ranks look like 1, 2, 3 on equal values, the wrong function was used.</p>
<p><b>Where AI goes wrong:</b> missing tiebreakers on ROW_NUMBER; forgetting DISTINCT when returning "the Nth salary"; returning an empty set instead of NULL; using LIMIT/OFFSET (which ignores ties) for "Nth highest".</p>
<p><b>What you must still own:</b> reading the sample output in a question and recognising 1-1-3 vs 1-1-2 instantly, and explaining determinism to a reviewer. That judgment is what interviewers test.</p>`,
    problems: [{
      title: 'Rank Salaries Within Each Department (No Gaps)',
      level: 'Easy', tags: ['window', 'dense_rank', 'partition by'], companies: ['Amazon', 'Meta', 'Deloitte'],
      statement: `<p>Table <code>employees(id, name, dept, salary, hire_date)</code>. For every employee, return <code>dept, name, salary, salary_rank</code> where <code>salary_rank</code> is 1 for the highest salary in their department, equal salaries share a rank, and the ranks have <b>no gaps</b> (1, 1, 2, 3…). Order by dept, then salary_rank, then name.</p>`,
      constraints: `Up to 10<sup>6</sup> employees, up to 10<sup>3</sup> departments. Salaries may tie.`,
      example: `${H.table(['dept', 'name', 'salary', 'salary_rank'], [['Engineering', 'Asha', '120000', '<span class="c-g">1</span>'], ['Engineering', 'Ben', '120000', '<span class="c-g">1</span>'], ['Engineering', 'Chen', '110000', '<span class="c-g">2</span>'], ['HR', 'Kim', '75000', '<span class="c-b">1</span> (restarts)'], ['HR', 'Leo', '60000', '2']])}<p>Asha and Ben tie → both 1. Chen is next → <b>2</b>, not 3, because the question says "no gaps". The rank restarts at 1 in HR because of PARTITION BY dept.</p>`,
      brute: {
        why: `<p>Old-school: for each employee, count how many <b>distinct</b> salaries in the same department are higher, plus one. That correlated subquery re-scans the department for every row: O(N × department size) — about N²/D comparisons. With 10<sup>6</sup> rows in 10 departments that is ~10<sup>11</sup> comparisons. It is correct, and worth knowing because some interviewers ask for a "no window function" version.</p>`,
        code: { lang: 'sql', db: 'hr', code: `-- Correlated subquery: re-counts the department for every single row (O(N^2) per partition)
SELECT e.dept, e.name, e.salary,
       1 + (SELECT COUNT(DISTINCT e2.salary)
            FROM employees e2
            WHERE e2.dept = e.dept
              AND e2.salary > e.salary) AS salary_rank
FROM employees e
ORDER BY e.dept, salary_rank, e.name;` }
      },
      mcq: { q: 'The expected output shows ranks 1, 1, 2 for salaries 120, 120, 110. Which function produces exactly this?', options: ['ROW_NUMBER()', 'RANK()', 'DENSE_RANK()', 'NTILE(3)'], answer: 2, explain: 'ROW_NUMBER gives 1, 2, 3 and RANK gives 1, 1, 3. Only DENSE_RANK gives the tied rows the same rank and moves on to the next whole number.' },
      hints: [
        `<p>"Within each department" means the numbering must <b>restart</b> per department → that is PARTITION BY dept.</p>`,
        `<p>"Equal salaries share a rank" rules out ROW_NUMBER. "No gaps" rules out RANK. Use DENSE_RANK with ORDER BY salary DESC.</p>`,
        `<p>Recipe: SELECT the columns, add <code>DENSE_RANK() OVER (PARTITION BY dept ORDER BY salary DESC)</code>, then an outer ORDER BY dept, salary_rank, name (the window's ORDER BY does not sort the output).</p>`
      ],
      tests: { cmp: 'exact', engine: 'both', cases: [
          { cols: ['dept', 'name', 'salary', 'salary_rank'], rows: [['Engineering', 'Asha', 120000, 1], ['Engineering', 'Ben', 120000, 1], ['Engineering', 'Chen', 110000, 2], ['Engineering', 'Dev', 95000, 3], ['Engineering', 'Eli', 95000, 3], ['Engineering', 'Fay', 80000, 4], ['HR', 'Kim', 75000, 1], ['HR', 'Leo', 60000, 2], ['HR', 'Mia', 60000, 2], ['Sales', 'Gia', 90000, 1], ['Sales', 'Hal', 85000, 2], ['Sales', 'Ivy', 85000, 2], ['Sales', 'Jay', 70000, 3]] },
          { setup: 'DELETE FROM salary_history; DELETE FROM employees; ', rows: [] },
          { setup: 'DELETE FROM salary_history; DELETE FROM employees; INSERT INTO employees VALUES (1, \'Solo\', \'Ops\', 50000, \'2020-01-01\');', cols: ['dept', 'name', 'salary', 'salary_rank'], rows: [['Ops', 'Solo', 50000, 1]] },
          { setup: 'DELETE FROM salary_history; DELETE FROM employees; INSERT INTO employees VALUES (1, \'A\', \'X\', 100, \'2020-01-01\'), (2, \'B\', \'X\', 100, \'2020-01-01\'), (3, \'C\', \'X\', 100, \'2020-01-01\');', cols: ['dept', 'name', 'salary', 'salary_rank'], rows: [['X', 'A', 100, 1], ['X', 'B', 100, 1], ['X', 'C', 100, 1]] },
          { setup: 'DELETE FROM salary_history; DELETE FROM employees; INSERT INTO employees VALUES (1, \'A\', \'X\', 300, \'d\'), (2, \'B\', \'X\', 200, \'d\'), (3, \'C\', \'X\', 100, \'d\'), (4, \'D\', \'Y\', 100, \'d\'), (5, \'E\', \'Y\', 100, \'d\'), (6, \'F\', \'Y\', 50, \'d\'), (7, \'G\', \'Z\', 1, \'d\');', cols: ['dept', 'name', 'salary', 'salary_rank'], rows: [['X', 'A', 300, 1], ['X', 'B', 200, 2], ['X', 'C', 100, 3], ['Y', 'D', 100, 1], ['Y', 'E', 100, 1], ['Y', 'F', 50, 2], ['Z', 'G', 1, 1]] },
          { setup: 'DELETE FROM salary_history; DELETE FROM employees; INSERT INTO employees VALUES (1, \'E001\', \'D\', 30, \'2020-01-01\'), (2, \'E002\', \'E\', 20, \'2020-01-01\'), (3, \'E003\', \'B\', 40, \'2020-01-01\'), (4, \'E004\', \'E\', 40, \'2020-01-01\'), (5, \'E005\', \'A\', 40, \'2020-01-01\'), (6, \'E006\', \'E\', 30, \'2020-01-01\'), (7, \'E007\', \'E\', 10, \'2020-01-01\'), (8, \'E008\', \'D\', 40, \'2020-01-01\'), (9, \'E009\', \'A\', 60, \'2020-01-01\'), (10, \'E010\', \'C\', 60, \'2020-01-01\'), (11, \'E011\', \'D\', 40, \'2020-01-01\'), (12, \'E012\', \'B\', 40, \'2020-01-01\'), (13, \'E013\', \'D\', 40, \'2020-01-01\'), (14, \'E014\', \'C\', 20, \'2020-01-01\'), (15, \'E015\', \'B\', 40, \'2020-01-01\'), (16, \'E016\', \'C\', 20, \'2020-01-01\'), (17, \'E017\', \'A\', 20, \'2020-01-01\'), (18, \'E018\', \'E\', 50, \'2020-01-01\'), (19, \'E019\', \'B\', 10, \'2020-01-01\'), (20, \'E020\', \'A\', 40, \'2020-01-01\'), (21, \'E021\', \'C\', 20, \'2020-01-01\'), (22, \'E022\', \'B\', 10, \'2020-01-01\'), (23, \'E023\', \'C\', 20, \'2020-01-01\'), (24, \'E024\', \'A\', 20, \'2020-01-01\'), (25, \'E025\', \'D\', 20, \'2020-01-01\'), (26, \'E026\', \'E\', 40, \'2020-01-01\'), (27, \'E027\', \'E\', 60, \'2020-01-01\'), (28, \'E028\', \'C\', 10, \'2020-01-01\'), (29, \'E029\', \'B\', 10, \'2020-01-01\'), (30, \'E030\', \'A\', 10, \'2020-01-01\'), (31, \'E031\', \'B\', 20, \'2020-01-01\'), (32, \'E032\', \'E\', 30, \'2020-01-01\'), (33, \'E033\', \'C\', 40, \'2020-01-01\'), (34, \'E034\', \'B\', 10, \'2020-01-01\'), (35, \'E035\', \'A\', 40, \'2020-01-01\'), (36, \'E036\', \'A\', 40, \'2020-01-01\'), (37, \'E037\', \'A\', 60, \'2020-01-01\'), (38, \'E038\', \'B\', 20, \'2020-01-01\'), (39, \'E039\', \'D\', 60, \'2020-01-01\'), (40, \'E040\', \'B\', 50, \'2020-01-01\'), (41, \'E041\', \'E\', 40, \'2020-01-01\'), (42, \'E042\', \'E\', 20, \'2020-01-01\'), (43, \'E043\', \'D\', 20, \'2020-01-01\'), (44, \'E044\', \'E\', 40, \'2020-01-01\'), (45, \'E045\', \'D\', 20, \'2020-01-01\'), (46, \'E046\', \'D\', 40, \'2020-01-01\'), (47, \'E047\', \'C\', 40, \'2020-01-01\'), (48, \'E048\', \'D\', 20, \'2020-01-01\'), (49, \'E049\', \'E\', 60, \'2020-01-01\'), (50, \'E050\', \'E\', 10, \'2020-01-01\'), (51, \'E051\', \'C\', 30, \'2020-01-01\'), (52, \'E052\', \'E\', 20, \'2020-01-01\'), (53, \'E053\', \'C\', 40, \'2020-01-01\'), (54, \'E054\', \'C\', 40, \'2020-01-01\'), (55, \'E055\', \'D\', 50, \'2020-01-01\'), (56, \'E056\', \'A\', 40, \'2020-01-01\'), (57, \'E057\', \'C\', 40, \'2020-01-01\'), (58, \'E058\', \'B\', 50, \'2020-01-01\'), (59, \'E059\', \'A\', 50, \'2020-01-01\'), (60, \'E060\', \'A\', 40, \'2020-01-01\');', cols: ['dept', 'name', 'salary', 'salary_rank'], rows: [['A', 'E009', 60, 1], ['A', 'E037', 60, 1], ['A', 'E059', 50, 2], ['A', 'E005', 40, 3], ['A', 'E020', 40, 3], ['A', 'E035', 40, 3], ['A', 'E036', 40, 3], ['A', 'E056', 40, 3], ['A', 'E060', 40, 3], ['A', 'E017', 20, 4], ['A', 'E024', 20, 4], ['A', 'E030', 10, 5], ['B', 'E040', 50, 1], ['B', 'E058', 50, 1], ['B', 'E003', 40, 2], ['B', 'E012', 40, 2], ['B', 'E015', 40, 2], ['B', 'E031', 20, 3], ['B', 'E038', 20, 3], ['B', 'E019', 10, 4], ['B', 'E022', 10, 4], ['B', 'E029', 10, 4], ['B', 'E034', 10, 4], ['C', 'E010', 60, 1], ['C', 'E033', 40, 2], ['C', 'E047', 40, 2], ['C', 'E053', 40, 2], ['C', 'E054', 40, 2], ['C', 'E057', 40, 2], ['C', 'E051', 30, 3], ['C', 'E014', 20, 4], ['C', 'E016', 20, 4], ['C', 'E021', 20, 4], ['C', 'E023', 20, 4], ['C', 'E028', 10, 5], ['D', 'E039', 60, 1], ['D', 'E055', 50, 2], ['D', 'E008', 40, 3], ['D', 'E011', 40, 3], ['D', 'E013', 40, 3], ['D', 'E046', 40, 3], ['D', 'E001', 30, 4], ['D', 'E025', 20, 5], ['D', 'E043', 20, 5], ['D', 'E045', 20, 5], ['D', 'E048', 20, 5], ['E', 'E027', 60, 1], ['E', 'E049', 60, 1], ['E', 'E018', 50, 2], ['E', 'E004', 40, 3], ['E', 'E026', 40, 3], ['E', 'E041', 40, 3], ['E', 'E044', 40, 3], ['E', 'E006', 30, 4], ['E', 'E032', 30, 4], ['E', 'E002', 20, 5], ['E', 'E042', 20, 5], ['E', 'E052', 20, 5], ['E', 'E007', 10, 6], ['E', 'E050', 10, 6]] },
          { setup: 'DELETE FROM salary_history; DELETE FROM employees; INSERT INTO employees VALUES (9, \'Zed\', \'Q\', 70, \'d\'), (3, \'Amy\', \'Q\', 70, \'d\'), (7, \'Bob\', \'P\', 90, \'d\'), (1, \'Cat\', \'P\', 80, \'d\'), (2, \'Dan\', \'P\', 90, \'d\');', cols: ['dept', 'name', 'salary', 'salary_rank'], rows: [['P', 'Bob', 90, 1], ['P', 'Dan', 90, 1], ['P', 'Cat', 80, 2], ['Q', 'Amy', 70, 1], ['Q', 'Zed', 70, 1]] }
        ] },
      solution: {
        approach: `<p>One window: partition by department so ranks restart, order by salary descending so the highest is 1, and use DENSE_RANK so ties share and no numbers are skipped. The engine sorts once by (dept, salary DESC) and streams through, incrementing a counter only when the salary changes.</p>`,
        code: { lang: 'sql', db: 'hr', code: `SELECT dept, name, salary,
       DENSE_RANK() OVER (PARTITION BY dept ORDER BY salary DESC) AS salary_rank
FROM employees
ORDER BY dept, salary_rank, name;` },
        dry: { head: ['row (sorted)', 'salary', 'same as previous?', 'salary_rank'], rows: [['Engineering / Asha', '120000', 'first in partition', '1'], ['Engineering / Ben', '120000', 'yes (tie)', '1'], ['Engineering / Chen', '110000', 'no', '2'], ['Engineering / Dev', '95000', 'no', '3'], ['HR / Kim', '75000', 'new partition', '1 (reset)']] },
        complexity: `<p>One sort O(N log N) (or O(N) if an index on (dept, salary) supplies the order) + O(N) streaming. Memory O(1) per row beyond the sort. The correlated subquery is O(N²/D).</p>`,
        followUps: ['Return only each department\'s second-highest distinct salary.', 'Make the ranking ascending (lowest paid = 1) and explain how NULL salaries would sort in SQLite vs PostgreSQL.', 'Rewrite it without window functions using a self-join + GROUP BY.']
      }
    }]
  });

  /* =====================================================================
     TOPIC 3 — Top-N per group (greatest-n-per-group)
     ===================================================================== */
  topics.push({
    title: 'Top-N per Group: The Rank-Then-Filter Pattern',
    analogy: `<p>A school wants the <b>top 2 students from every class</b> for a quiz team. The principal does not compare all 1,000 students against each other. Each class teacher <b>sorts their own class</b>, writes 1, 2, 3… on the papers, and sends up everything numbered 1 or 2. That is exactly the window pattern: <b>number inside each group, then keep the small numbers</b>.</p>`,
    explain: `<p>"Top N per group" (also called <b>greatest-n-per-group</b>) shows up as: <i>top 3 salaries per department</i>, <i>latest order per customer</i>, <i>best-selling product per category</i>, <i>most recent status per ticket</i>. The modern answer is always the same two-step recipe:</p>
<ol>
<li><b>Number</b> the rows inside each group with a ranking function in a CTE.</li>
<li><b>Filter</b> on that number in the outer query (window functions cannot go in WHERE).</li>
</ol>
<pre>WITH ranked AS (
  SELECT *, ROW_NUMBER() OVER (PARTITION BY dept ORDER BY salary DESC, hire_date) AS rn
  FROM employees
)
SELECT * FROM ranked WHERE rn &lt;= 2;</pre>
<p><b>The ranking function decides what "top N" means when there are ties</b> — this is the question you should ask the interviewer out loud:</p>
${H.table(['Filter', 'Meaning', 'Engineering result (120, 120, 110, 95, 95, 80), N = 2'], [
  ['ROW_NUMBER() &lt;= 2', 'exactly N rows per group, ties broken by tiebreaker', 'Asha, Ben'],
  ['RANK() &lt;= 2', 'N "places"; ties at the cut-off are all included', 'Asha, Ben (both rank 1; Chen is rank 3)'],
  ['DENSE_RANK() &lt;= 2', 'everyone holding one of the top N <b>distinct</b> values', 'Asha, Ben, <span class="c-g">Chen</span>']
])}
<p><b>N = 1 is the most common case</b>: "the latest row per key". <code>ROW_NUMBER() OVER (PARTITION BY customer ORDER BY order_date DESC, id DESC) = 1</code> picks exactly one latest order per customer — the backbone of deduplication, slowly-changing-dimension lookups and "current status" views.</p>
<p><b>Why not GROUP BY + MAX?</b> <code>SELECT dept, MAX(salary) ... GROUP BY dept</code> gives the top <i>value</i> but not the rest of the row (who earns it?). You would have to join back on (dept, salary) — which returns duplicates on ties and needs a second pass. The window version returns whole rows in one pass and generalises to any N.</p>`,
    clues: [
      '"top N ... per / for each / in every" (department, category, user) → rank in CTE, filter rn &lt;= N',
      '"latest / most recent / first / last record for each ..." → ROW_NUMBER() ... = 1 with DESC/ASC order',
      '"top three unique salaries" / "salaries that are among the top 3 distinct" → DENSE_RANK &lt;= 3',
      '"exactly N rows per group even with ties" → ROW_NUMBER + deterministic tiebreaker',
      '"remove duplicates, keep the newest" → ROW_NUMBER &gt; 1 identifies the rows to delete',
      'Brute force hint in the prompt: "for each row, count how many in the same group are bigger" → that count IS a rank'
    ],
    code: [
      { lang: 'sql', db: 'hr', title: 'Top 2 earners per department (exactly 2 rows each)', code: `WITH ranked AS (
  SELECT dept, name, salary,
         ROW_NUMBER() OVER (
           PARTITION BY dept
           ORDER BY salary DESC, hire_date   -- tiebreaker: more senior wins a tie
         ) AS rn
  FROM employees
)
SELECT dept, name, salary, rn
FROM ranked
WHERE rn <= 2            -- filter happens OUTSIDE, after the window is computed
ORDER BY dept, rn;` },
      { lang: 'sql', db: 'hr', title: 'Latest salary per employee (N = 1, greatest-n-per-group)', code: `WITH latest AS (
  SELECT emp_id, effective_date, salary,
         ROW_NUMBER() OVER (PARTITION BY emp_id ORDER BY effective_date DESC) AS rn
  FROM salary_history
)
SELECT e.name, l.effective_date, l.salary
FROM latest l
JOIN employees e ON e.id = l.emp_id
WHERE l.rn = 1
ORDER BY e.name;` }
    ],
    codeTitle: ['Top-N with ROW_NUMBER', 'Latest row per key'],
    viz: {
      title: 'Number inside each partition, then keep rn ≤ N',
      input: '2 | Engineering Asha 120, Engineering Ben 120, Engineering Chen 110, Engineering Dev 95, HR Kim 75, HR Leo 60, HR Mia 60, Sales Gia 90, Sales Hal 85, Sales Ivy 85, Sales Jay 70',
      inputLabel: 'N | rows as "Dept Name Salary" (comma separated, max 14)',
      gen: function (input) {
        var parts = String(input).split('|');
        if (parts.length !== 2) throw new Error('Format: "N | Dept Name Salary, Dept Name Salary, ..."');
        var N = num(parts[0].trim(), 'N must be a number, e.g. "2 | Sales Gia 90, ..."');
        if (N < 1 || N > 5 || Math.floor(N) !== N) throw new Error('N must be a whole number from 1 to 5');
        var s = byDeptSalary(deptRows(parts[1], 14));
        var ps = partitions(s, function (r) { return r.dept; });
        var cols = ['dept', 'name', 'salary', 'ROW_NUMBER', 'DENSE_RANK'];
        var rows = s.map(function (r) { return [r.dept, r.name, r.salary, '·', '·']; });
        var frames = [];
        var hl0 = {}; ps.forEach(function (p, k) { span(p[0], p[1], k % 2 ? 'sel' : 'win', hl0); });
        frames.push({ narr: 'Step 1: <code>PARTITION BY dept ORDER BY salary DESC</code> — the engine sorts so each department is a block (alternating colours), highest salary first. Goal: top <b>' + N + '</b> per department.', parts: [{ type: 'table', label: 'sorted into partitions', columns: cols, rows: copyRows(rows), hl: hl0 }] });
        ps.forEach(function (p) {
          var dense = 0;
          for (var i = p[0]; i <= p[1]; i++) {
            var rn = i - p[0] + 1, tie = i > p[0] && s[i].salary === s[i - 1].salary;
            if (!tie) dense++;
            rows[i][3] = rn; rows[i][4] = dense;
            var hl = span(0, s.length - 1, 'done'); span(p[0], p[1], 'win', hl); hl[i] = 'cur';
            var narr = rn === 1 ? '<b>New partition ' + s[i].dept + '</b> → counters <b>reset to 1</b>. ' : '';
            narr += s[i].name + ' (' + s[i].salary + '): ROW_NUMBER = ' + rn + ', DENSE_RANK = ' + dense + (tie ? ' <span class="c-y">(tie: DENSE_RANK repeats, ROW_NUMBER does not)</span>' : '') + '.';
            frames.push({ narr: narr, parts: [{ type: 'table', label: 'numbering partition ' + s[i].dept, columns: cols, rows: copyRows(rows), hl: hl }] });
          }
        });
        var hlA = {}, resA = [];
        rows.forEach(function (r, i) { if (r[3] <= N) { hlA[i] = 'ok'; resA.push([r[0], r[1], r[2], r[3]]); } else hlA[i] = 'bad'; });
        frames.push({ narr: 'Step 2a: outer query <code>WHERE rn &lt;= ' + N + '</code>. Green rows survive, red rows are dropped. Exactly <b>' + N + '</b> (or fewer) rows per department — ties are cut arbitrarily unless you add a tiebreaker.', parts: [{ type: 'table', label: 'filter ROW_NUMBER ≤ ' + N, columns: cols, rows: copyRows(rows), hl: hlA }] });
        var hlB = {}, resB = [];
        rows.forEach(function (r, i) { if (r[4] <= N) { hlB[i] = 'ok'; resB.push([r[0], r[1], r[2], r[4]]); } else hlB[i] = 'bad'; });
        frames.push({ narr: 'Step 2b: the alternative <code>WHERE dense_rank &lt;= ' + N + '</code> keeps everyone holding one of the top ' + N + ' <b>distinct</b> salaries — it can return MORE than ' + N + ' rows per department when there are ties.', parts: [{ type: 'table', label: 'filter DENSE_RANK ≤ ' + N, columns: cols, rows: copyRows(rows), hl: hlB }] });
        frames.push({ narr: 'Results compared: ROW_NUMBER returned <b>' + resA.length + '</b> rows, DENSE_RANK returned <b>' + resB.length + '</b>. Neither is "right" — the question\'s wording about ties decides. Say this out loud in an interview.', parts: [
          { type: 'table', label: 'top ' + N + ' via ROW_NUMBER', columns: ['dept', 'name', 'salary', 'rn'], rows: resA, hl: span(0, resA.length - 1, 'sel') },
          { type: 'table', label: 'top ' + N + ' distinct via DENSE_RANK', columns: ['dept', 'name', 'salary', 'dr'], rows: resB, hl: span(0, resB.length - 1, 'sel') }
        ] });
        return frames;
      }
    },
    examples: [
      { title: 'Top 2 orders per customer', html: `<p>Partition by customer, order by amount. Asha's two biggest are ${H.c('g', '50 and 35')}; dan has only one order, so he simply returns one row — <code>rn &lt;= 2</code> never invents rows. The <code>id</code> tiebreaker keeps the result stable if two orders have the same amount.</p>`,
        code: { lang: 'sql', db: 'shop', code: `WITH r AS (
  SELECT customer, id, order_date, amount,
         ROW_NUMBER() OVER (PARTITION BY customer ORDER BY amount DESC, id) AS rn
  FROM orders
)
SELECT customer, id, order_date, amount
FROM r
WHERE rn <= 2
ORDER BY customer, amount DESC;` } },
      { title: 'All top earners per department, ties included (RANK = 1)', html: `<p>"Who is the highest paid in each department?" Engineering has a tie, so the honest answer has ${H.c('y', 'two people')}: Asha and Ben. RANK = 1 (or DENSE_RANK = 1) keeps both; ROW_NUMBER = 1 would silently hide one.</p>`,
        code: { lang: 'sql', db: 'hr', code: `WITH r AS (
  SELECT dept, name, salary,
         RANK() OVER (PARTITION BY dept ORDER BY salary DESC) AS rk
  FROM employees
)
SELECT dept, name, salary
FROM r
WHERE rk = 1
ORDER BY dept, name;` } },
      { title: 'Old school: self-join + HAVING (no window functions)', html: `<p>Before window functions (MySQL 5.7 still lacks them), top-N was a self-join: join each employee to colleagues who earn <b>more</b>, count them, keep rows where that count is less than N. It works, but it builds up to N²/D joined pairs. Note the LEFT JOIN so the top earner (zero people above) survives. This version counts <i>people</i> above (RANK semantics).</p>`,
        code: { lang: 'sql', db: 'hr', code: `SELECT e.dept, e.name, e.salary, COUNT(h.id) AS people_above
FROM employees e
LEFT JOIN employees h
       ON h.dept = e.dept AND h.salary > e.salary
GROUP BY e.id, e.dept, e.name, e.salary
HAVING COUNT(h.id) < 2          -- fewer than 2 people above me = I am in the top 2 places
ORDER BY e.dept, e.salary DESC;` } },
      { title: 'Biggest order per day (N = 1 on a date partition)', html: `<p>Same recipe, different partition key. On 2024-01-01 asha's 50 beats ben's 30; on 2024-01-08 dan's ${H.c('g', '90')} wins. Swap the partition key and you answer "best product per category" or "top song per country".</p>`,
        code: { lang: 'sql', db: 'shop', code: `WITH r AS (
  SELECT order_date, customer, amount,
         ROW_NUMBER() OVER (PARTITION BY order_date ORDER BY amount DESC, id) AS rn
  FROM orders
)
SELECT order_date, customer, amount
FROM r
WHERE rn = 1
ORDER BY order_date;` } }
    ],
    deepDive: `<p><b>Performance in real engines.</b> The rank-then-filter plan sorts the <i>whole</i> table by (group, order) and numbers every row, then throws most away. For small N and many groups, two faster shapes exist: (1) PostgreSQL <code>LATERAL</code> join — for each department, <code>SELECT ... ORDER BY salary DESC LIMIT 2</code> using an index on (dept, salary DESC): O(groups × N × log N) instead of O(rows log rows); (2) PostgreSQL 15+ can push a <code>rn &lt;= N</code> filter into the WindowAgg ("run condition") and stop numbering a partition early. SQL Server and Oracle also optimise "top-N per partition" into a segment-top operator.</p>
<p><b>Correctness traps:</b> (1) ROW_NUMBER without a unique tiebreaker → nondeterministic picks; (2) <code>JOIN back on MAX(salary)</code> returns duplicates on ties; (3) filtering by rank <b>before</b> a join that multiplies rows (e.g. joining orders to items) ranks the wrong grain — rank at the grain the question asks about; (4) the brute-force self-join with <code>&gt;</code> gives RANK semantics while <code>COUNT(DISTINCT h.salary)</code> gives DENSE_RANK semantics — know which one you wrote.</p>
<p><b>SQLite-only shortcut:</b> <code>SELECT dept, name, MAX(salary) FROM employees GROUP BY dept</code> returns the name from the max row (a documented SQLite "bare column" feature), but it is non-standard, picks one row on ties and errors in PostgreSQL — mention it only to show you know why not to rely on it.</p>`,
    aiEra: `<p><b>What AI changes:</b> "Top N per group" is the most common window query AI tools generate, and they usually get the CTE + filter shape right. What they skip is the <b>tie conversation</b>: they choose ROW_NUMBER silently, which can drop a tied employee from a bonus list — a real business bug.</p>
<p><b>Use AI as a partner:</b> ask <code>"List the three tie semantics for top-N per group and which one my requirement implies: ..."</code>. Ask it to produce the LATERAL version too and compare EXPLAIN plans on a large synthetic table.</p>
<p><b>Where AI goes wrong:</b> missing tiebreaker; putting the filter in WHERE of the same SELECT; using LIMIT N globally instead of per group; MySQL 5.7 targets where window functions do not exist (needs the self-join or variables).</p>
<p><b>What you must still own:</b> clarifying tie rules with the stakeholder, choosing the right grain, and knowing when an index + LATERAL beats a full sort on a 100M-row table.</p>`,
    problems: [{
      title: 'Department Top Three Salaries',
      level: 'Hard', tags: ['window', 'dense_rank', 'top-n per group', 'join'], companies: ['Amazon', 'Meta', 'Microsoft', 'Bloomberg'],
      statement: `<p>Table <code>employees(id, name, dept, salary, hire_date)</code>. A <b>high earner</b> is an employee whose salary is among the <b>top three unique salaries</b> of their department. Return <code>dept, name, salary</code> of all high earners, ordered by dept, salary DESC, name.</p>`,
      constraints: `Up to 10<sup>6</sup> rows. A department may have fewer than three distinct salaries. Many people may share a salary.`,
      example: `${H.table(['dept', 'distinct salaries (desc)', 'high earners'], [['Engineering', '120000, 110000, 95000, <span class="c-r">80000</span>', 'Asha, Ben, Chen, Dev, Eli (<span class="c-r">not Fay</span>)'], ['HR', '75000, 60000', 'Kim, Leo, Mia (only 2 distinct → all qualify)'], ['Sales', '90000, 85000, 70000', 'Gia, Hal, Ivy, Jay']])}<p>"Top three <b>unique</b> salaries" means ties do not use up slots: Engineering returns <b>5</b> people. 12 rows total.</p>`,
      brute: {
        why: `<p>The classic pre-window answer: keep an employee if fewer than 3 distinct salaries in the same department are greater than theirs. The correlated subquery runs once per employee and scans the department each time → O(N²/D). With an index on (dept, salary) each probe is faster, but it is still a per-row nested query instead of one sort + stream.</p>`,
        code: { lang: 'sql', db: 'hr', code: `SELECT e.dept, e.name, e.salary
FROM employees e
WHERE (SELECT COUNT(DISTINCT e2.salary)
       FROM employees e2
       WHERE e2.dept = e.dept
         AND e2.salary > e.salary) < 3      -- fewer than 3 distinct salaries above me
ORDER BY e.dept, e.salary DESC, e.name;` }
      },
      mcq: { q: 'Engineering salaries are 120, 120, 110, 95, 95, 80. Which filter returns exactly Asha, Ben, Chen, Dev and Eli?', options: ['ROW_NUMBER() &lt;= 3', 'RANK() &lt;= 3', 'DENSE_RANK() &lt;= 3', 'NTILE(3) = 1'], answer: 2, explain: 'DENSE_RANK gives 1,1,2,3,3,4 so &lt;= 3 keeps five people. ROW_NUMBER keeps three rows; RANK gives 1,1,3,4,4,6 and keeps only Asha, Ben and Chen.' },
      hints: [
        `<p>"Top three <b>unique</b> salaries" — ties should not use up a slot. Which ranking function counts distinct values?</p>`,
        `<p>DENSE_RANK() OVER (PARTITION BY dept ORDER BY salary DESC) inside a CTE. Then filter in the outer query.</p>`,
        `<p>Recipe: CTE ranked = all columns + dr; SELECT dept, name, salary FROM ranked WHERE dr &lt;= 3 ORDER BY dept, salary DESC, name. Departments with fewer than 3 distinct salaries return everyone — no special case needed.</p>`
      ],
      tests: { cmp: 'exact', engine: 'both', cases: [
          { cols: ['dept', 'name', 'salary'], rows: [['Engineering', 'Asha', 120000], ['Engineering', 'Ben', 120000], ['Engineering', 'Chen', 110000], ['Engineering', 'Dev', 95000], ['Engineering', 'Eli', 95000], ['HR', 'Kim', 75000], ['HR', 'Leo', 60000], ['HR', 'Mia', 60000], ['Sales', 'Gia', 90000], ['Sales', 'Hal', 85000], ['Sales', 'Ivy', 85000], ['Sales', 'Jay', 70000]] },
          { setup: 'DELETE FROM salary_history; DELETE FROM employees; ', rows: [] },
          { setup: 'DELETE FROM salary_history; DELETE FROM employees; INSERT INTO employees VALUES (1, \'A\', \'X\', 10, \'d\');', cols: ['dept', 'name', 'salary'], rows: [['X', 'A', 10]] },
          { setup: 'DELETE FROM salary_history; DELETE FROM employees; INSERT INTO employees VALUES (1, \'A\', \'X\', 100, \'d\'), (2, \'B\', \'X\', 100, \'d\'), (3, \'C\', \'X\', 100, \'d\'), (4, \'D\', \'X\', 100, \'d\');', cols: ['dept', 'name', 'salary'], rows: [['X', 'A', 100], ['X', 'B', 100], ['X', 'C', 100], ['X', 'D', 100]] },
          { setup: 'DELETE FROM salary_history; DELETE FROM employees; INSERT INTO employees VALUES (1, \'A\', \'X\', 400, \'d\'), (2, \'B\', \'X\', 300, \'d\'), (3, \'C\', \'X\', 300, \'d\'), (4, \'D\', \'X\', 200, \'d\'), (5, \'E\', \'X\', 200, \'d\'), (6, \'F\', \'X\', 100, \'d\'), (7, \'G\', \'Y\', 5, \'d\'), (8, \'H\', \'Y\', 4, \'d\');', cols: ['dept', 'name', 'salary'], rows: [['X', 'A', 400], ['X', 'B', 300], ['X', 'C', 300], ['X', 'D', 200], ['X', 'E', 200], ['Y', 'G', 5], ['Y', 'H', 4]] },
          { setup: 'DELETE FROM salary_history; DELETE FROM employees; INSERT INTO employees VALUES (1, \'E001\', \'C\', 30, \'2020-01-01\'), (2, \'E002\', \'D\', 30, \'2020-01-01\'), (3, \'E003\', \'D\', 20, \'2020-01-01\'), (4, \'E004\', \'B\', 40, \'2020-01-01\'), (5, \'E005\', \'B\', 20, \'2020-01-01\'), (6, \'E006\', \'A\', 40, \'2020-01-01\'), (7, \'E007\', \'C\', 30, \'2020-01-01\'), (8, \'E008\', \'B\', 60, \'2020-01-01\'), (9, \'E009\', \'A\', 10, \'2020-01-01\'), (10, \'E010\', \'A\', 50, \'2020-01-01\'), (11, \'E011\', \'B\', 10, \'2020-01-01\'), (12, \'E012\', \'A\', 70, \'2020-01-01\'), (13, \'E013\', \'B\', 60, \'2020-01-01\'), (14, \'E014\', \'A\', 10, \'2020-01-01\'), (15, \'E015\', \'D\', 70, \'2020-01-01\'), (16, \'E016\', \'A\', 50, \'2020-01-01\'), (17, \'E017\', \'D\', 60, \'2020-01-01\'), (18, \'E018\', \'C\', 60, \'2020-01-01\'), (19, \'E019\', \'C\', 20, \'2020-01-01\'), (20, \'E020\', \'B\', 60, \'2020-01-01\'), (21, \'E021\', \'D\', 60, \'2020-01-01\'), (22, \'E022\', \'B\', 30, \'2020-01-01\'), (23, \'E023\', \'C\', 60, \'2020-01-01\'), (24, \'E024\', \'C\', 10, \'2020-01-01\'), (25, \'E025\', \'A\', 50, \'2020-01-01\'), (26, \'E026\', \'B\', 40, \'2020-01-01\'), (27, \'E027\', \'C\', 60, \'2020-01-01\'), (28, \'E028\', \'D\', 60, \'2020-01-01\'), (29, \'E029\', \'D\', 50, \'2020-01-01\'), (30, \'E030\', \'C\', 60, \'2020-01-01\'), (31, \'E031\', \'B\', 30, \'2020-01-01\'), (32, \'E032\', \'B\', 10, \'2020-01-01\'), (33, \'E033\', \'D\', 60, \'2020-01-01\'), (34, \'E034\', \'A\', 40, \'2020-01-01\'), (35, \'E035\', \'C\', 70, \'2020-01-01\'), (36, \'E036\', \'C\', 50, \'2020-01-01\'), (37, \'E037\', \'D\', 20, \'2020-01-01\'), (38, \'E038\', \'C\', 20, \'2020-01-01\'), (39, \'E039\', \'B\', 60, \'2020-01-01\'), (40, \'E040\', \'B\', 40, \'2020-01-01\'), (41, \'E041\', \'D\', 10, \'2020-01-01\'), (42, \'E042\', \'A\', 50, \'2020-01-01\'), (43, \'E043\', \'B\', 60, \'2020-01-01\'), (44, \'E044\', \'B\', 70, \'2020-01-01\'), (45, \'E045\', \'D\', 70, \'2020-01-01\'), (46, \'E046\', \'B\', 60, \'2020-01-01\'), (47, \'E047\', \'B\', 60, \'2020-01-01\'), (48, \'E048\', \'B\', 20, \'2020-01-01\'), (49, \'E049\', \'D\', 10, \'2020-01-01\'), (50, \'E050\', \'D\', 70, \'2020-01-01\'), (51, \'E051\', \'A\', 10, \'2020-01-01\'), (52, \'E052\', \'A\', 60, \'2020-01-01\'), (53, \'E053\', \'D\', 50, \'2020-01-01\'), (54, \'E054\', \'C\', 10, \'2020-01-01\'), (55, \'E055\', \'C\', 70, \'2020-01-01\'), (56, \'E056\', \'A\', 40, \'2020-01-01\'), (57, \'E057\', \'D\', 40, \'2020-01-01\'), (58, \'E058\', \'B\', 20, \'2020-01-01\'), (59, \'E059\', \'A\', 10, \'2020-01-01\'), (60, \'E060\', \'A\', 30, \'2020-01-01\'), (61, \'E061\', \'C\', 60, \'2020-01-01\'), (62, \'E062\', \'D\', 30, \'2020-01-01\'), (63, \'E063\', \'D\', 30, \'2020-01-01\'), (64, \'E064\', \'C\', 50, \'2020-01-01\'), (65, \'E065\', \'B\', 60, \'2020-01-01\'), (66, \'E066\', \'A\', 70, \'2020-01-01\'), (67, \'E067\', \'C\', 60, \'2020-01-01\'), (68, \'E068\', \'D\', 60, \'2020-01-01\'), (69, \'E069\', \'B\', 10, \'2020-01-01\'), (70, \'E070\', \'D\', 40, \'2020-01-01\');', cols: ['dept', 'name', 'salary'], rows: [['A', 'E012', 70], ['A', 'E066', 70], ['A', 'E052', 60], ['A', 'E010', 50], ['A', 'E016', 50], ['A', 'E025', 50], ['A', 'E042', 50], ['B', 'E044', 70], ['B', 'E008', 60], ['B', 'E013', 60], ['B', 'E020', 60], ['B', 'E039', 60], ['B', 'E043', 60], ['B', 'E046', 60], ['B', 'E047', 60], ['B', 'E065', 60], ['B', 'E004', 40], ['B', 'E026', 40], ['B', 'E040', 40], ['C', 'E035', 70], ['C', 'E055', 70], ['C', 'E018', 60], ['C', 'E023', 60], ['C', 'E027', 60], ['C', 'E030', 60], ['C', 'E061', 60], ['C', 'E067', 60], ['C', 'E036', 50], ['C', 'E064', 50], ['D', 'E015', 70], ['D', 'E045', 70], ['D', 'E050', 70], ['D', 'E017', 60], ['D', 'E021', 60], ['D', 'E028', 60], ['D', 'E033', 60], ['D', 'E068', 60], ['D', 'E029', 50], ['D', 'E053', 50]] }
        ] },
      solution: {
        approach: `<p>Rank within each department using DENSE_RANK (ties share a number, no gaps), so "rank ≤ 3" means "salary is one of the three highest distinct values". Compute it in a CTE because window results cannot be filtered in the same SELECT's WHERE. In a real schema with a separate <code>departments</code> table you would join to get the department name after filtering.</p>`,
        code: { lang: 'sql', db: 'hr', code: `WITH ranked AS (
  SELECT dept, name, salary,
         DENSE_RANK() OVER (PARTITION BY dept ORDER BY salary DESC) AS dr
  FROM employees
)
SELECT dept, name, salary
FROM ranked
WHERE dr <= 3
ORDER BY dept, salary DESC, name;` },
        dry: { head: ['dept', 'name', 'salary', 'dr', 'keep?'], rows: [['Engineering', 'Asha / Ben', '120000', '1', '<span class="c-g">yes</span>'], ['Engineering', 'Chen', '110000', '2', '<span class="c-g">yes</span>'], ['Engineering', 'Dev / Eli', '95000', '3', '<span class="c-g">yes</span>'], ['Engineering', 'Fay', '80000', '4', '<span class="c-r">no</span>'], ['HR', 'Kim', '75000', '1', '<span class="c-g">yes</span>']] },
        complexity: `<p>O(N log N) for the sort (O(N) with an index on (dept, salary DESC)), O(N) to rank and filter. The correlated version is O(N²/D) without an index.</p>`,
        followUps: ['Return exactly 3 people per department, preferring the longest-serving on ties.', 'Show each high earner\'s gap to the department\'s top salary.', 'How would you do this on MySQL 5.7, which has no window functions?']
      }
    }]
  });

  /* =====================================================================
     TOPIC 4 — LAG / LEAD: comparing a row with its neighbours
     ===================================================================== */
  topics.push({
    title: 'LAG & LEAD: Deltas, Growth and "Previous Row" Questions',
    analogy: `<p>Standing in a queue, you can turn around and see the person <b>behind</b> you, or look over the shoulder of the person <b>in front</b>. <b>LAG</b> = "what did the row before me have?" (look back). <b>LEAD</b> = "what does the row after me have?" (look ahead). Your fitness app does this every morning: <i>"You walked 1,200 more steps than yesterday"</i> is just <code>today - LAG(today)</code>.</p>`,
    explain: `<p><code>LAG(expr, offset, default)</code> returns <code>expr</code> from the row <b>offset</b> rows <b>before</b> the current row in the window's order. <code>LEAD</code> is the same but <b>after</b>. Offset defaults to 1, default value to NULL.</p>
${H.table(['day', 'revenue', 'LAG(revenue)', 'revenue − LAG', '% change', 'LEAD(revenue)'], [
  ['03-01', '100', '<span class="c-m">NULL</span> (no row before)', 'NULL', 'NULL', '120'],
  ['03-02', '120', '100', '<span class="c-g">+20</span>', '<span class="c-g">+20.0%</span>', '90'],
  ['03-03', '90', '120', '<span class="c-r">−30</span>', '<span class="c-r">−25.0%</span>', '150'],
  ['03-05', '150', '90', '<span class="c-g">+60</span>', '+66.7%', '130']
])}
<p><b>Recipe for "change since previous":</b></p>
<pre>value - LAG(value) OVER (PARTITION BY entity ORDER BY time)                 -- absolute delta
ROUND(100.0 * (value - LAG(value) OVER w) / LAG(value) OVER w, 1)          -- % growth</pre>
<ul>
<li><b>PARTITION BY</b> stops the first row of one region/customer from looking at the last row of the previous one. Forgetting it is the #1 LAG bug.</li>
<li><b>First row</b> of each partition has no previous row → NULL. Use the 3rd argument (<code>LAG(revenue, 1, 0)</code>) or <code>COALESCE</code> if the question wants 0.</li>
<li><b>Offset &gt; 1</b>: <code>LAG(revenue, 7)</code> = same weekday last week (if there is exactly one row per day).</li>
<li><b>Divide by zero</b>: if the previous value can be 0, wrap the divisor in <code>NULLIF(LAG(...), 0)</code>.</li>
</ul>
<p><b>Big gotcha: LAG means previous <i>row</i>, not previous <i>day</i>.</b> North has no row for 03-04, so on 03-05 LAG returns 03-03's value. If the question says "compared to <b>yesterday</b>", either check the date gap (<code>julianday(day) - julianday(LAG(day) OVER w) = 1</code>) or fill missing dates first with a calendar table / recursive CTE.</p>
<p><b>LEAD</b> is perfect for "time until next event", "next status", and "session end = next session start". LAG and LEAD ignore the frame clause — only partition and order matter.</p>`,
    clues: [
      '"compared to the previous day / month / order", "day-over-day", "month-over-month", "YoY" → LAG',
      '"time between consecutive events", "days since last purchase", "next appointment" → LAG or LEAD on a date',
      '"three consecutive rows with the same value" → compare LAG and LEAD (or LAG 1 and LAG 2)',
      '"when did the status change" / "detect a flip" → value &lt;&gt; LAG(value)',
      '"higher than yesterday" (temperature) → LAG plus a date-gap check (previous row may not be yesterday)',
      'Brute-force smell: "self-join on id = id - 1" or "date = date - 1 day" → LAG is the one-pass version'
    ],
    code: { lang: 'sql', db: 'shop', title: 'Day-over-day change per region (runnable)', code: `SELECT region, day, revenue,
       LAG(revenue) OVER w                         AS prev_revenue,
       revenue - LAG(revenue) OVER w               AS change,
       ROUND(100.0 * (revenue - LAG(revenue) OVER w)
             / NULLIF(LAG(revenue) OVER w, 0), 1)  AS pct_change,   -- NULLIF avoids divide-by-zero
       LEAD(revenue) OVER w                        AS next_revenue
FROM daily_revenue
WINDOW w AS (PARTITION BY region ORDER BY day)     -- PARTITION BY: never compare North with South
ORDER BY region, day;` },
    viz: {
      title: 'LAG looks back, LEAD looks ahead — the delta column fills in',
      input: '100 120 90 150 130 130 170',
      inputLabel: 'Daily values in time order (space separated, 3–12 numbers)',
      gen: function (input) {
        var v = String(input).trim().split(/[\s,]+/).filter(Boolean).map(function (x) { return num(x, 'Enter numbers separated by spaces, e.g. 100 120 90'); });
        if (v.length < 3) throw new Error('Give at least 3 numbers');
        if (v.length > 12) throw new Error('Use at most 12 numbers');
        var cols = ['day', 'value', 'LAG(value)', 'delta', '% change', 'LEAD(value)'];
        var rows = v.map(function (x, i) { return ['d' + (i + 1), x, '·', '·', '·', '·']; });
        var frames = [{ narr: 'Rows are ordered by day (<code>OVER (ORDER BY day)</code>). For each row we will peek at the <b>row before</b> (LAG, blue) and the <b>row after</b> (LEAD, purple).', parts: [{ type: 'table', label: 'ordered by day', columns: cols, rows: copyRows(rows) }, { type: 'bars', label: 'value per day', values: v.slice(), idxLabels: v.map(function (x, i) { return 'd' + (i + 1); }) }] }];
        for (var i = 0; i < v.length; i++) {
          var prev = i > 0 ? v[i - 1] : null, next = i < v.length - 1 ? v[i + 1] : null;
          rows[i][2] = prev === null ? 'NULL' : prev;
          rows[i][3] = prev === null ? 'NULL' : (v[i] - prev > 0 ? '+' : '') + (v[i] - prev);
          rows[i][4] = prev === null ? 'NULL' : (prev === 0 ? 'NULL (÷0)' : f1(Math.round(1000 * (v[i] - prev) / prev) / 10) + '%');
          rows[i][5] = next === null ? 'NULL' : next;
          var hl = {}; hl[i] = 'cur'; if (i > 0) hl[i - 1] = 'win'; if (i < v.length - 1) hl[i + 1] = 'sel';
          var bh = {}; bh[i] = 'cur'; if (i > 0) bh[i - 1] = 'win';
          var narr = '<b>d' + (i + 1) + '</b> (value ' + v[i] + '): ';
          if (prev === null) narr += 'first row — there is <b>no row before</b>, so LAG = <b>NULL</b> and the delta is NULL too. (Use <code>LAG(value, 1, 0)</code> if you want 0.) LEAD peeks ahead: ' + next + '.';
          else {
            narr += 'LAG = ' + prev + ' (blue). delta = ' + v[i] + ' − ' + prev + ' = <b>' + (v[i] - prev) + '</b>' + (v[i] > prev ? ' <span class="c-g">up</span>' : v[i] < prev ? ' <span class="c-r">down</span>' : ' (flat)') + '. ';
            narr += next === null ? 'Last row — LEAD = <b>NULL</b>.' : 'LEAD = ' + next + ' (purple).';
          }
          frames.push({ narr: narr, parts: [{ type: 'table', label: 'computed columns', columns: cols, rows: copyRows(rows), hl: hl }, { type: 'bars', label: 'value per day', values: v.slice(), hl: bh, idxLabels: v.map(function (x, k) { return 'd' + (k + 1); }) }] });
        }
        var best = -Infinity, bi = -1;
        for (var k = 1; k < v.length; k++) if (v[k] - v[k - 1] > best) { best = v[k] - v[k - 1]; bi = k; }
        var hlF = {}; hlF[bi] = 'sel';
        frames.push({ narr: 'All rows done in <b>one pass</b>. Biggest jump: <b>d' + (bi + 1) + '</b> (+' + best + '). A self-join version would need to match every row with its predecessor — extra work and easy to get wrong when days are missing.', parts: [{ type: 'table', label: 'final', columns: cols, rows: copyRows(rows), hl: hlF }] });
        return frames;
      }
    },
    examples: [
      { title: 'Days since the previous order (per customer)', html: `<p>Subtract dates with <code>julianday()</code> in SQLite (<code>order_date - LAG(order_date)</code> in PostgreSQL gives an integer of days directly). asha ordered on 01-01, 01-02, 01-05, 01-08 → gaps ${H.c('b', 'NULL, 1, 3, 3')}. LEAD gives the next order date; the last order of each customer gets NULL.</p>`,
        code: { lang: 'sql', db: 'shop', code: `SELECT customer, order_date, amount,
       LAG(order_date) OVER w AS prev_order,
       CAST(julianday(order_date) - julianday(LAG(order_date) OVER w) AS INTEGER) AS days_since_prev,
       LEAD(order_date) OVER w AS next_order
FROM orders
WINDOW w AS (PARTITION BY customer ORDER BY order_date, id)
ORDER BY customer, order_date;` } },
      { title: 'Salary raise percentage per employee', html: `<p>Each salary_history row compared to the same employee's previous row. Asha: 90000 → 100000 (${H.c('g', '+11.1%')}) → 120000 (${H.c('g', '+20.0%')}). The first row of each employee is NULL because PARTITION BY emp_id isolates employees.</p>`,
        code: { lang: 'sql', db: 'hr', code: `SELECT e.name, s.effective_date, s.salary,
       LAG(s.salary) OVER w AS prev_salary,
       ROUND(100.0 * (s.salary - LAG(s.salary) OVER w) / LAG(s.salary) OVER w, 1) AS raise_pct
FROM salary_history s
JOIN employees e ON e.id = s.emp_id
WINDOW w AS (PARTITION BY s.emp_id ORDER BY s.effective_date)
ORDER BY e.name, s.effective_date;` } },
      { title: 'Default value and larger offsets', html: `<p><code>LAG(revenue, 1, 0)</code> turns the first NULL into ${H.c('g', '0')}. <code>LAG(revenue, 2)</code> looks two rows back — on South 03-03 it returns 80 (03-01). With daily data, <code>LAG(x, 7)</code> is "same day last week", <code>LAG(x, 12)</code> on monthly data is "same month last year".</p>`,
        code: { lang: 'sql', db: 'shop', code: `SELECT region, day, revenue,
       LAG(revenue, 1, 0) OVER w AS prev_or_zero,
       LAG(revenue, 2)    OVER w AS two_rows_back
FROM daily_revenue
WHERE day <= '2024-03-04'
WINDOW w AS (PARTITION BY region ORDER BY day)
ORDER BY region, day;` } },
      { title: 'Previous row is not always "yesterday"', html: `<p>North skips 03-04. A naive LAG on 03-05 compares with 03-03. This query flags rows whose previous row is ${H.c('r', 'not exactly one day earlier')} so you can decide: treat as gap (NULL) or compare anyway.</p>`,
        code: { lang: 'sql', db: 'shop', code: `SELECT day, revenue,
       LAG(day) OVER w AS prev_day,
       CASE WHEN julianday(day) - julianday(LAG(day) OVER w) = 1
            THEN revenue - LAG(revenue) OVER w END AS change_vs_yesterday   -- NULL when a day is missing
FROM daily_revenue
WHERE region = 'North'
WINDOW w AS (ORDER BY day)
ORDER BY day;` } }
    ],
    deepDive: `<p><b>Semantics.</b> LAG/LEAD are "navigation" (offset) functions: they read another row of the <b>partition</b> by position, ignoring any frame clause. Offsets that fall outside the partition return the default (NULL unless given). The offset must be a non-negative integer. Some engines (Oracle, BigQuery, Snowflake, SQL Server 2022) support <code>IGNORE NULLS</code> — "previous non-null value", the classic way to <b>forward-fill</b> gaps; SQLite and PostgreSQL do not, so you emulate it with a running COUNT of non-nulls as a group id, then <code>MAX() OVER (PARTITION BY grp)</code>.</p>
<p><b>Execution.</b> After the partition sort, the operator keeps a small ring buffer of the last <i>offset</i> rows (LAG) or reads ahead <i>offset</i> rows (LEAD), so it is O(N) after sorting and O(offset) memory. The self-join alternative <code>JOIN t prev ON prev.id = t.id - 1</code> is only correct if ids are dense with no gaps — deletions break it silently. The correlated version <code>(SELECT x FROM t t2 WHERE t2.day &lt; t.day ORDER BY day DESC LIMIT 1)</code> is O(N log N) with an index and O(N²) without.</p>
<p><b>Edge cases interviewers probe:</b> ties in the ORDER BY (two rows on the same date → LAG between them is arbitrary; add a tiebreaker or aggregate per day first); division by zero (NULLIF); integer division (multiply by 100.0); and deltas across partitions when PARTITION BY is forgotten. In time-series pipelines, LAG-based change detection ("emit a row only when status changed") is how CDC-style compaction and SCD Type 2 tables are built.</p>`,
    aiEra: `<p><b>What AI changes:</b> "month-over-month growth" prompts produce LAG queries instantly. Review them for the three classic slips: no PARTITION BY, integer division, and previous-row-vs-previous-day.</p>
<p><b>Use AI as a partner:</b> <code>"Here is my LAG query. Construct a dataset where it gives a wrong answer for 'compared to yesterday'"</code> — a good assistant will remove a date. Ask it to rewrite using a recursive-CTE calendar to fill gaps, then compare outputs.</p>
<p><b>Where AI goes wrong:</b> suggesting <code>IGNORE NULLS</code> on SQLite/PostgreSQL where it does not exist; self-joining on <code>id - 1</code>; computing growth as <code>(prev - cur) / cur</code> (wrong base).</p>
<p><b>What you must still own:</b> defining the business meaning ("previous recorded day" vs "calendar yesterday"), and explaining why LAG is O(N) after one sort while the self-join is fragile and slower.</p>`,
    problems: [{
      title: 'Day-over-Day Revenue Change per Region',
      level: 'Medium', tags: ['window', 'lag', 'partition by', 'growth'], companies: ['Uber', 'DoorDash', 'Shopify'],
      statement: `<p>Table <code>daily_revenue(day, region, revenue)</code> has at most one row per (day, region); some days may be missing. For every row return <code>region, day, revenue, prev_revenue, change, pct_change</code> where the comparison is with the <b>previous recorded day of the same region</b>. <code>pct_change</code> is rounded to 1 decimal; the first day of each region has NULLs. Order by region, day.</p>`,
      constraints: `Up to 10<sup>6</sup> rows, up to 10<sup>3</sup> regions. Revenue ≥ 0 (could be 0 → avoid division by zero).`,
      example: `${H.table(['region', 'day', 'revenue', 'prev', 'change', 'pct'], [['North', '03-01', '100', 'NULL', 'NULL', 'NULL'], ['North', '03-02', '120', '100', '<span class="c-g">20</span>', '<span class="c-g">20.0</span>'], ['North', '03-03', '90', '120', '<span class="c-r">-30</span>', '<span class="c-r">-25.0</span>'], ['North', '03-05', '150', '90', '60', '66.7'], ['South', '03-01', '80', '<span class="c-b">NULL</span>', 'NULL', 'NULL']])}<p>03-05 compares with 03-03 because 03-04 is missing and the question says "previous recorded day". South's first row is NULL — it must <b>not</b> look at North's last row.</p>`,
      brute: {
        why: `<p>Old school: for every row, run a correlated subquery that finds the latest earlier day in the same region (ORDER BY day DESC LIMIT 1), and repeat it for every column that needs the previous value. That is one index probe per row per use (or a full region scan per row without an index → O(N²/R)). It also repeats the subquery three times unless you nest it.</p>`,
        code: { lang: 'sql', db: 'shop', code: `SELECT region, day, revenue, prev_revenue,
       revenue - prev_revenue AS change,
       ROUND(100.0 * (revenue - prev_revenue) / NULLIF(prev_revenue, 0), 1) AS pct_change
FROM (
  SELECT d.region, d.day, d.revenue,
         (SELECT d2.revenue
          FROM daily_revenue d2
          WHERE d2.region = d.region AND d2.day < d.day
          ORDER BY d2.day DESC
          LIMIT 1) AS prev_revenue          -- re-searched for every single row
  FROM daily_revenue d
) t
ORDER BY region, day;` }
      },
      mcq: { q: 'You forget PARTITION BY region in LAG(revenue) OVER (ORDER BY region, day). What breaks?', options: ['Nothing, ORDER BY region is enough', 'South\'s first row takes North\'s last revenue as its previous value', 'Every LAG becomes NULL', 'SQLite throws an error'], answer: 1, explain: 'Without PARTITION BY the whole table is one window. Ordering by region keeps regions together, but the row right after North 03-10 is South 03-01, so South 03-01 reads 200 as its "previous" value instead of NULL.' },
      hints: [
        `<p>"Previous recorded day of the same region" = previous <b>row</b> within a region ordered by day. That is exactly LAG with PARTITION BY region.</p>`,
        `<p>Use a named window <code>WINDOW w AS (PARTITION BY region ORDER BY day)</code> so the three LAG calls share one spec.</p>`,
        `<p>Edge cases: first row → NULL automatically; revenue 0 → <code>NULLIF(LAG(...), 0)</code>; integer division → use 100.0. Recipe: prev = LAG; change = revenue − prev; pct = ROUND(100.0 * change / NULLIF(prev, 0), 1).</p>`
      ],
      tests: { cmp: 'exact', engine: 'both', cases: [
          { cols: ['region', 'day', 'revenue', 'prev_revenue', 'change', 'pct_change'], rows: [['North', '2024-03-01', 100, null, null, null], ['North', '2024-03-02', 120, 100, 20, 20], ['North', '2024-03-03', 90, 120, -30, -25], ['North', '2024-03-05', 150, 90, 60, 66.7], ['North', '2024-03-06', 130, 150, -20, -13.3], ['North', '2024-03-07', 130, 130, 0, 0], ['North', '2024-03-08', 170, 130, 40, 30.8], ['North', '2024-03-09', 160, 170, -10, -5.9], ['North', '2024-03-10', 200, 160, 40, 25], ['South', '2024-03-01', 80, null, null, null], ['South', '2024-03-02', 95, 80, 15, 18.8], ['South', '2024-03-03', 95, 95, 0, 0], ['South', '2024-03-04', 60, 95, -35, -36.8], ['South', '2024-03-05', 110, 60, 50, 83.3], ['South', '2024-03-06', 120, 110, 10, 9.1], ['South', '2024-03-07', 100, 120, -20, -16.7], ['South', '2024-03-08', 140, 100, 40, 40], ['South', '2024-03-09', 150, 140, 10, 7.1], ['South', '2024-03-10', 90, 150, -60, -40]] },
          { setup: 'DELETE FROM daily_revenue; ', rows: [] },
          { setup: 'DELETE FROM daily_revenue; INSERT INTO daily_revenue VALUES (\'2024-05-01\', \'N\', 10);', cols: ['region', 'day', 'revenue', 'prev_revenue', 'change', 'pct_change'], rows: [['N', '2024-05-01', 10, null, null, null]] },
          { setup: 'DELETE FROM daily_revenue; INSERT INTO daily_revenue VALUES (\'2024-05-01\', \'N\', 0), (\'2024-05-02\', \'N\', 0), (\'2024-05-03\', \'N\', 50), (\'2024-05-04\', \'N\', 0), (\'2024-05-05\', \'N\', 20);', cols: ['region', 'day', 'revenue', 'prev_revenue', 'change', 'pct_change'], rows: [['N', '2024-05-01', 0, null, null, null], ['N', '2024-05-02', 0, 0, 0, null], ['N', '2024-05-03', 50, 0, 50, null], ['N', '2024-05-04', 0, 50, -50, -100], ['N', '2024-05-05', 20, 0, 20, null]] },
          { setup: 'DELETE FROM daily_revenue; INSERT INTO daily_revenue VALUES (\'2024-05-03\', \'B\', 30), (\'2024-05-01\', \'B\', 10), (\'2024-05-02\', \'A\', 7), (\'2024-05-02\', \'B\', 20), (\'2024-05-04\', \'A\', 7), (\'2024-04-30\', \'A\', 9);', cols: ['region', 'day', 'revenue', 'prev_revenue', 'change', 'pct_change'], rows: [['A', '2024-04-30', 9, null, null, null], ['A', '2024-05-02', 7, 9, -2, -22.2], ['A', '2024-05-04', 7, 7, 0, 0], ['B', '2024-05-01', 10, null, null, null], ['B', '2024-05-02', 20, 10, 10, 100], ['B', '2024-05-03', 30, 20, 10, 50]] },
          { setup: 'DELETE FROM daily_revenue; INSERT INTO daily_revenue VALUES (\'2023-12-31\', \'Z\', 3), (\'2024-01-01\', \'Z\', 1), (\'2024-02-29\', \'Z\', 8), (\'2024-03-01\', \'Z\', 9);', cols: ['region', 'day', 'revenue', 'prev_revenue', 'change', 'pct_change'], rows: [['Z', '2023-12-31', 3, null, null, null], ['Z', '2024-01-01', 1, 3, -2, -66.7], ['Z', '2024-02-29', 8, 1, 7, 700], ['Z', '2024-03-01', 9, 8, 1, 12.5]] },
          { setup: 'DELETE FROM daily_revenue; INSERT INTO daily_revenue VALUES (\'d1\', \'R\', 1), (\'d2\', \'R\', 3), (\'d3\', \'R\', 2);', cols: ['region', 'day', 'revenue', 'prev_revenue', 'change', 'pct_change'], rows: [['R', 'd1', 1, null, null, null], ['R', 'd2', 3, 1, 2, 200], ['R', 'd3', 2, 3, -1, -33.3]] }
        ] },
      solution: {
        approach: `<p>One window partitioned by region and ordered by day. LAG(revenue) fetches the previous row's revenue inside the same region. Change and percentage are simple arithmetic on it. NULLIF protects the division; the first row in each region naturally yields NULL.</p>`,
        code: { lang: 'sql', db: 'shop', code: `SELECT region, day, revenue,
       LAG(revenue) OVER w                    AS prev_revenue,
       revenue - LAG(revenue) OVER w          AS change,
       ROUND(100.0 * (revenue - LAG(revenue) OVER w)
             / NULLIF(LAG(revenue) OVER w, 0), 1) AS pct_change
FROM daily_revenue
WINDOW w AS (PARTITION BY region ORDER BY day)
ORDER BY region, day;` },
        dry: { head: ['region', 'day', 'revenue', 'LAG', 'pct_change'], rows: [['North', '03-03', '90', '120', '100·(90−120)/120 = −25.0'], ['North', '03-05', '150', '90', '66.7'], ['North', '03-10', '200', '160', '25.0'], ['South', '03-01', '80', 'NULL (new partition)', 'NULL'], ['South', '03-04', '60', '95', '−36.8']] },
        complexity: `<p>One sort by (region, day) — free if the primary key/index is (region, day) — then O(N) streaming with O(1) memory. The correlated subquery does an index probe per row (O(N log N)) or a scan per row (O(N²/R)).</p>`,
        followUps: ['Compare with the same weekday last week instead (LAG 7 — what if days are missing?).', 'Return only days where revenue dropped more than 20% vs the previous day.', 'Fill missing days with 0 revenue first using a recursive CTE calendar, then compute the change.']
      }
    }]
  });

  /* =====================================================================
     TOPIC 5 — Running totals and the ROWS vs RANGE default-frame trap
     ===================================================================== */
  topics.push({
    title: 'Running Totals & the ROWS vs RANGE Trap',
    analogy: `<p>Your bank statement has a <b>balance</b> column: every line shows "everything up to and including this transaction". Nobody re-adds the whole history for each line — the bank keeps a running counter and adds one transaction at a time. That is <code>SUM(amount) OVER (ORDER BY time)</code>.</p>
<p>The trap: if two transactions have the <b>same timestamp</b>, should the first one's balance already include the second? A <b>ROWS</b> frame says "no — count physical lines one by one". A <b>RANGE</b> frame says "yes — everything with the same time arrived together". SQL's default is RANGE.</p>`,
    explain: `<p>Once you put <code>ORDER BY</code> inside OVER, an aggregate like SUM stops meaning "whole partition" and starts meaning "from the start <b>up to the current row</b>" — a <b>running</b> (cumulative) aggregate.</p>
<pre>SUM(amount) OVER (PARTITION BY customer ORDER BY order_date)   -- running total per customer</pre>
<p><b>The frame.</b> Which rows feed the SUM for the current row is called the <b>window frame</b>. When you write ORDER BY but no frame, SQL silently uses:</p>
<pre>RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW</pre>
<p><b>RANGE</b> works on <b>values</b>: "CURRENT ROW" means "the current row <b>and all its peers</b>" (rows with the same ORDER BY value). <b>ROWS</b> works on <b>physical positions</b>: "CURRENT ROW" means exactly this one row.</p>
${H.table(['id', 'order_date', 'amount', 'default (RANGE)', 'ROWS ... CURRENT ROW'], [
  ['1', '2024-01-01', '50', '<span class="c-r">80</span>', '<span class="c-g">50</span>'],
  ['2', '2024-01-01', '30', '80', '80'],
  ['3', '2024-01-02', '20', '100', '100'],
  ['4', '2024-01-03', '70', '<span class="c-r">210</span>', '<span class="c-g">170</span>'],
  ['5', '2024-01-03', '40', '210', '210']
])}
<p>With RANGE, both 01-01 orders show 80 — the running total "jumps" a whole day at once. If the question expects a value that grows on <b>every row</b>, that is a bug. Two fixes:</p>
<ol>
<li>Make the order unique: <code>ORDER BY order_date, id</code> (no peers → RANGE and ROWS agree).</li>
<li>Say ROWS explicitly: <code>ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW</code> (short form <code>ROWS UNBOUNDED PRECEDING</code>).</li>
</ol>
<p>Best practice: do <b>both</b> — a deterministic order and an explicit frame. Sometimes RANGE is what you want: "total revenue as of the end of each day" should give same-day rows the same value.</p>
<p><b>Other running aggregates</b> work the same way: running COUNT (n-th order), running MAX ("best so far", all-time high), running AVG (average so far), running MIN. Add <code>PARTITION BY</code> to reset the counter per customer/account/month.</p>`,
    clues: [
      '"running total", "cumulative sum", "balance after each transaction", "year-to-date (YTD)" → SUM() OVER (ORDER BY ...)',
      '"resets every month / for each customer" → add PARTITION BY month / customer',
      '"cumulative percentage", "Pareto / 80-20", "how many items make up 80% of revenue" → running SUM / SUM() OVER ()',
      '"the first moment the total exceeds X" → running total in CTE, then MIN(time) WHERE running &gt;= X',
      'Duplicate timestamps in the data + "on every row" → beware the default RANGE frame; use ROWS + tiebreaker',
      '"best so far", "all-time high", "max drawdown" → MAX() OVER (ORDER BY ... ROWS UNBOUNDED PRECEDING)'
    ],
    code: [
      { lang: 'sql', db: 'shop', title: 'Default RANGE vs explicit ROWS on same-date orders', code: `SELECT id, order_date, amount,
       SUM(amount) OVER (ORDER BY order_date)                    AS range_default,  -- peers share a value
       SUM(amount) OVER (ORDER BY order_date
                         ROWS BETWEEN UNBOUNDED PRECEDING
                                  AND CURRENT ROW)               AS rows_frame,     -- grows every row
       SUM(amount) OVER (ORDER BY order_date, id)                AS unique_order    -- no peers: same as ROWS
FROM orders
ORDER BY order_date, id;` },
      { lang: 'sql', db: 'shop', title: 'Running total that resets per customer', code: `SELECT customer, order_date, amount,
       SUM(amount) OVER (PARTITION BY customer
                         ORDER BY order_date, id
                         ROWS UNBOUNDED PRECEDING) AS customer_running_total,
       ROW_NUMBER() OVER (PARTITION BY customer ORDER BY order_date, id) AS nth_order
FROM orders
ORDER BY customer, order_date, id;` }
    ],
    codeTitle: ['ROWS vs RANGE', 'Per-customer running total'],
    viz: {
      title: 'Frame grows row by row: ROWS vs RANGE on ties',
      input: '01-05 10, 01-05 20, 01-06 5, 01-07 15, 01-07 5, 01-08 30',
      inputLabel: 'Rows as "date amount", comma separated, in date order (max 12)',
      gen: function (input) {
        var r = items(input).map(function (it) {
          var p = it.split(/\s+/);
          if (p.length !== 2) throw new Error('Each item must be "date amount", e.g. "01-05 10"');
          return { d: p[0], a: num(p[1], 'Amount must be a number, e.g. "01-05 10"') };
        });
        if (r.length < 3) throw new Error('Give at least 3 rows');
        if (r.length > 12) throw new Error('Use at most 12 rows');
        r = r.map(function (x, i) { return { d: x.d, a: x.a, i: i }; }).sort(function (x, y) { return x.d < y.d ? -1 : x.d > y.d ? 1 : x.i - y.i; });
        var n = r.length, cols = ['date', 'amount', 'ROWS total', 'RANGE total'];
        var rows = r.map(function (x) { return [x.d, x.a, '·', '·']; });
        var frames = [{ narr: 'Rows sorted by date. Same-date rows are <b>peers</b>. We will compute <code>SUM(amount)</code> twice: with a <b>ROWS</b> frame (physical rows) and with the default <b>RANGE</b> frame (values, includes peers).', parts: [{ type: 'table', label: 'ORDER BY date', columns: cols, rows: copyRows(rows) }] }];
        var run = 0;
        for (var i = 0; i < n; i++) {
          run += r[i].a; rows[i][2] = run;
          var hl = span(0, i, 'win'); hl[i] = 'cur';
          frames.push({ narr: '<b>ROWS</b> frame for row ' + (i + 1) + ': from the first row up to <b>exactly this row</b> (blue + amber). Sum = <b>' + run + '</b>.' + (i > 0 && r[i].d === r[i - 1].d ? ' Same date as the row above, but ROWS does not care — it still adds one row at a time.' : ''), parts: [{ type: 'table', label: 'ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW', columns: cols, rows: copyRows(rows), hl: hl }, { type: 'array', label: 'amounts (frame = blue range)', values: r.map(function (x) { return x.a; }), range: [0, i], ptr: (function () { var p = {}; p[i] = 'cur'; return p; })() }] });
        }
        for (var j = 0; j < n; j++) {
          var last = j; while (last + 1 < n && r[last + 1].d === r[j].d) last++;
          var tot = 0; for (var k = 0; k <= last; k++) tot += r[k].a;
          rows[j][3] = tot;
          var hl2 = span(0, last, 'win'); hl2[j] = 'cur';
          var peers = last > j || (j > 0 && r[j - 1].d === r[j].d);
          frames.push({ narr: '<b>RANGE</b> frame for row ' + (j + 1) + ' (date ' + r[j].d + '): from the start up to the <b>last row with the same date</b> (row ' + (last + 1) + '). Sum = <b>' + tot + '</b>.' + (peers ? ' <span class="c-y">Peers present</span> — the frame reaches past the current row, so RANGE ' + (tot !== rows[j][2] ? '<span class="c-r">differs from ROWS (' + rows[j][2] + ')</span>' : 'happens to equal ROWS here (last peer)') + '.' : ' No peers → same as ROWS.'), parts: [{ type: 'table', label: 'RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW (default)', columns: cols, rows: copyRows(rows), hl: hl2 }, { type: 'array', label: 'amounts (frame = blue range)', values: r.map(function (x) { return x.a; }), range: [0, last], ptr: (function () { var p = {}; p[j] = 'cur'; return p; })() }] });
        }
        var hlD = {}, diff = 0;
        rows.forEach(function (row, q) { if (row[2] !== row[3]) { hlD[q] = 'bad'; diff++; } else hlD[q] = 'ok'; });
        frames.push({ narr: 'Final comparison: <b>' + diff + '</b> row(s) (red) disagree. They are the earlier rows of a same-date group. If each row must have its own running value, use ROWS (or add a unique tiebreaker like <code>id</code> to ORDER BY).', parts: [{ type: 'table', label: 'ROWS vs RANGE', columns: cols, rows: copyRows(rows), hl: hlD }, { type: 'bars', label: 'ROWS running total', values: rows.map(function (x) { return x[2]; }) }] });
        return frames;
      }
    },
    examples: [
      { title: 'Cumulative % of revenue (Pareto analysis)', html: `<p>"Which customers make up 80% of revenue?" Aggregate per customer first, then a running SUM ordered by total DESC divided by the grand total. cara + asha already cover ${H.c('g', '57.0%')}; adding ben reaches 79.1%. Notice the window runs <b>on the grouped rows</b>.</p>`,
        code: { lang: 'sql', db: 'shop', code: `SELECT customer, total,
       SUM(total) OVER (ORDER BY total DESC, customer ROWS UNBOUNDED PRECEDING) AS running,
       ROUND(100.0 * SUM(total) OVER (ORDER BY total DESC, customer ROWS UNBOUNDED PRECEDING)
             / SUM(total) OVER (), 1) AS cum_pct
FROM (SELECT customer, SUM(amount) AS total FROM orders GROUP BY customer)
ORDER BY total DESC;` } },
      { title: 'Running MAX, COUNT and AVG', html: `<p>Any aggregate can run. "Best order so far" stays at 50 until order 4 (${H.c('g', '70')}) and then 9 (${H.c('g', '90')}). Running COUNT is the order number, running AVG is the average order value so far — a classic product-analytics column.</p>`,
        code: { lang: 'sql', db: 'shop', code: `SELECT id, order_date, amount,
       MAX(amount)          OVER w AS best_so_far,
       COUNT(*)             OVER w AS orders_so_far,
       ROUND(AVG(amount)    OVER w, 1) AS avg_so_far
FROM orders
WINDOW w AS (ORDER BY order_date, id ROWS UNBOUNDED PRECEDING)
ORDER BY order_date, id;` } },
      { title: 'ORDER BY changes the meaning of SUM', html: `<p>Same function, same partition. Without ORDER BY the frame is the ${H.c('b', 'whole partition')} (asha's total 115 on every row). With ORDER BY it becomes ${H.c('g', 'running')}: 50, 70, 80, 115. Many people are surprised that adding ORDER BY changes the numbers — now you know why: it changes the default frame.</p>`,
        code: { lang: 'sql', db: 'shop', code: `SELECT customer, order_date, amount,
       SUM(amount) OVER (PARTITION BY customer)                       AS whole_partition,
       SUM(amount) OVER (PARTITION BY customer ORDER BY order_date)   AS running
FROM orders
WHERE customer IN ('asha', 'ben')
ORDER BY customer, order_date;` } },
      { title: 'Old school: running total with a correlated subquery', html: `<p>Every row re-adds all earlier rows: row 10 sums 10 rows, row 1,000,000 sums a million. Total work ≈ N²/2 → ${H.c('r', '5 × 10¹¹ additions')} for a million rows, versus ${H.c('g', 'N additions')} for the window version. The tiebreaker condition <code>(same date AND id &lt;=)</code> is what ROWS + id does for free.</p>`,
        code: { lang: 'sql', db: 'shop', code: `SELECT o.id, o.order_date, o.amount,
       (SELECT SUM(o2.amount)
        FROM orders o2
        WHERE o2.order_date < o.order_date
           OR (o2.order_date = o.order_date AND o2.id <= o.id)) AS running_total
FROM orders o
ORDER BY o.order_date, o.id;` } }
    ],
    deepDive: `<p><b>The default-frame rule, precisely.</b> (1) No ORDER BY in OVER → frame = entire partition. (2) ORDER BY but no frame → <code>RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW</code>, where CURRENT ROW extends to the last peer. This is the SQL standard and SQLite, PostgreSQL, MySQL 8, SQL Server and Oracle all follow it. SQL Server additionally implements RANGE with an on-disk spool, so <code>ROWS</code> can be dramatically faster there — another reason to write ROWS explicitly.</p>
<p><b>How engines compute running aggregates.</b> For a frame starting at UNBOUNDED PRECEDING the operator never removes rows from the frame, so it keeps one accumulator and adds each new row: O(1) per row. For sliding frames (next topic) SUM/COUNT/AVG use an "inverse transition" (subtract the row leaving the frame) while MIN/MAX need a different structure (SQLite and PostgreSQL may recompute or use a segment-tree-like approach). Either way, after the O(N log N) sort the pass is near-linear.</p>
<p><b>Numeric pitfalls.</b> SUM of INTEGER in SQLite overflows to an error beyond 2<sup>63</sup>; AVG returns REAL. Running totals of floating-point money drift — store cents as integers or DECIMAL in PostgreSQL. In PostgreSQL <code>SUM(int)</code> returns bigint and <code>SUM(bigint)</code> returns numeric, so overflow is rare there.</p>
<p><b>Ties are a data-quality smell.</b> If two events can share a timestamp, the "correct" running order is undefined until the business tells you a tiebreaker (event id, ingestion sequence). Surfacing this question in an interview earns points.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI writes <code>SUM(x) OVER (ORDER BY t)</code> instantly — and almost always leaves the frame implicit. On data with duplicate timestamps this produces the RANGE "jump", which is hard to spot in a dashboard because the final total is still correct.</p>
<p><b>Use AI as a partner:</b> ask <code>"Does this running total behave differently with ROWS vs RANGE on my data? Show a 5-row example with a duplicate timestamp."</code> Ask it to add an assertion query: <code>SELECT COUNT(*) FROM (...) WHERE running &lt;&gt; expected</code>.</p>
<p><b>Where AI goes wrong:</b> omitting PARTITION BY so totals bleed across accounts; ordering by a non-unique column; proposing a correlated subquery "for clarity" on large tables; in SQL Server, using RANGE and causing tempdb spills.</p>
<p><b>What you must still own:</b> knowing the default frame by heart, deciding ROWS vs RANGE from the business meaning, and adding a deterministic tiebreaker.</p>`,
    problems: [{
      title: 'Order-by-Order Cumulative Revenue (Same-Day Orders)',
      level: 'Medium', tags: ['window', 'running total', 'frames', 'rows vs range'], companies: ['Stripe', 'Amazon', 'Square'],
      statement: `<p>Table <code>orders(id, customer, order_date, amount)</code>. Finance wants a column <code>cumulative_revenue</code> that shows the total revenue of all orders processed <b>up to and including this order</b>, where orders are processed by <code>order_date</code> and, within the same date, by <code>id</code>. Every row must show its own value (it must change on every order with a positive amount). Return <code>id, order_date, amount, cumulative_revenue</code> ordered by order_date, id.</p>`,
      constraints: `Up to 10<sup>7</sup> orders; many orders share a date; ids are unique.`,
      example: `${H.table(['id', 'order_date', 'amount', 'wrong (default RANGE)', 'cumulative_revenue'], [['1', '2024-01-01', '50', '<span class="c-r">80</span>', '<span class="c-g">50</span>'], ['2', '2024-01-01', '30', '80', '80'], ['3', '2024-01-02', '20', '100', '100'], ['4', '2024-01-03', '70', '<span class="c-r">210</span>', '<span class="c-g">170</span>']])}<p>Order 1's cumulative value must not include order 2 yet, even though they share a date: order 2 is processed after it (higher id).</p>`,
      brute: {
        why: `<p>Brute force: a self-join pairing each order with every order processed before or at it, then GROUP BY and SUM. Row k joins with k rows → N(N+1)/2 joined pairs. For 10<sup>7</sup> orders that is 5 × 10<sup>13</sup> rows to build — it will never finish. The window version adds one number per row.</p>`,
        code: { lang: 'sql', db: 'shop', code: `SELECT o.id, o.order_date, o.amount,
       SUM(p.amount) AS cumulative_revenue
FROM orders o
JOIN orders p                                  -- p = every order processed up to o
  ON p.order_date < o.order_date
  OR (p.order_date = o.order_date AND p.id <= o.id)
GROUP BY o.id, o.order_date, o.amount
ORDER BY o.order_date, o.id;` }
      },
      mcq: { q: 'You write SUM(amount) OVER (ORDER BY order_date). Orders 1 and 2 share a date. What does order 1 show?', options: ['Only its own amount', 'Its amount plus order 2\'s amount (default RANGE includes peers)', 'NULL', 'An error: ambiguous order'], answer: 1, explain: 'With ORDER BY and no frame, the default is RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW, and CURRENT ROW includes all peers (same order_date). So order 1 already includes order 2.' },
      hints: [
        `<p>"Processed by date, then by id" — the ORDER BY inside OVER must contain <b>both</b> columns so there are no ties.</p>`,
        `<p>Even with a unique order, write the frame explicitly: <code>ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW</code>. It documents intent and is faster on some engines.</p>`,
        `<p>Recipe: SELECT id, order_date, amount, SUM(amount) OVER (ORDER BY order_date, id ROWS UNBOUNDED PRECEDING) ... ORDER BY order_date, id. No PARTITION BY — it is one company-wide total.</p>`
      ],
      tests: { cmp: 'exact', engine: 'both', cases: [
          { cols: ['id', 'order_date', 'amount', 'cumulative_revenue'], rows: [[1, '2024-01-01', 50, 50], [2, '2024-01-01', 30, 80], [3, '2024-01-02', 20, 100], [4, '2024-01-03', 70, 170], [5, '2024-01-03', 40, 210], [6, '2024-01-05', 10, 220], [7, '2024-01-05', 60, 280], [8, '2024-01-06', 25, 305], [9, '2024-01-08', 90, 395], [10, '2024-01-08', 35, 430]] },
          { setup: 'DELETE FROM orders; ', rows: [] },
          { setup: 'DELETE FROM orders; INSERT INTO orders VALUES (1, \'a\', \'2024-01-01\', 5);', cols: ['id', 'order_date', 'amount', 'cumulative_revenue'], rows: [[1, '2024-01-01', 5, 5]] },
          { setup: 'DELETE FROM orders; INSERT INTO orders VALUES (3, \'a\', \'2024-01-01\', 1), (1, \'b\', \'2024-01-01\', 2), (2, \'c\', \'2024-01-01\', 4), (4, \'a\', \'2024-01-01\', 8);', cols: ['id', 'order_date', 'amount', 'cumulative_revenue'], rows: [[1, '2024-01-01', 2, 2], [2, '2024-01-01', 4, 6], [3, '2024-01-01', 1, 7], [4, '2024-01-01', 8, 15]] },
          { setup: 'DELETE FROM orders; INSERT INTO orders VALUES (1, \'a\', \'2024-03-01\', 10), (2, \'b\', \'2024-02-01\', 20), (3, \'c\', \'2024-01-01\', 30), (4, \'a\', \'2024-02-01\', 0), (5, \'b\', \'2024-03-01\', 1);', cols: ['id', 'order_date', 'amount', 'cumulative_revenue'], rows: [[3, '2024-01-01', 30, 30], [2, '2024-02-01', 20, 50], [4, '2024-02-01', 0, 50], [1, '2024-03-01', 10, 60], [5, '2024-03-01', 1, 61]] },
          { setup: 'DELETE FROM orders; INSERT INTO orders VALUES (1, \'a\', \'2024-01-01\', 1000000000), (2, \'a\', \'2024-01-01\', 1000000000), (3, \'a\', \'2024-01-01\', 1000000000), (4, \'b\', \'2024-01-02\', 2000000000);', cols: ['id', 'order_date', 'amount', 'cumulative_revenue'], rows: [[1, '2024-01-01', 1000000000, 1000000000], [2, '2024-01-01', 1000000000, 2000000000], [3, '2024-01-01', 1000000000, 3000000000], [4, '2024-01-02', 2000000000, 5000000000]] },
          { setup: 'DELETE FROM orders; INSERT INTO orders VALUES (1, \'c\', \'2024-01-04\', 11), (2, \'c\', \'2024-01-05\', 41), (3, \'c\', \'2024-01-03\', 13), (4, \'c\', \'2024-01-03\', 35), (5, \'c\', \'2024-01-04\', 14), (6, \'c\', \'2024-01-04\', 48), (7, \'c\', \'2024-01-05\', 13), (8, \'c\', \'2024-01-03\', 11), (9, \'c\', \'2024-01-03\', 35), (10, \'c\', \'2024-01-04\', 30), (11, \'c\', \'2024-01-02\', 41), (12, \'c\', \'2024-01-01\', 46), (13, \'c\', \'2024-01-06\', 1), (14, \'c\', \'2024-01-06\', 45), (15, \'c\', \'2024-01-03\', 31), (16, \'c\', \'2024-01-03\', 34), (17, \'c\', \'2024-01-01\', 30), (18, \'c\', \'2024-01-02\', 20), (19, \'c\', \'2024-01-01\', 16), (20, \'c\', \'2024-01-04\', 21), (21, \'c\', \'2024-01-02\', 47), (22, \'c\', \'2024-01-05\', 14), (23, \'c\', \'2024-01-04\', 4), (24, \'c\', \'2024-01-05\', 5), (25, \'c\', \'2024-01-05\', 18), (26, \'c\', \'2024-01-06\', 5), (27, \'c\', \'2024-01-02\', 22), (28, \'c\', \'2024-01-01\', 15), (29, \'c\', \'2024-01-05\', 6), (30, \'c\', \'2024-01-06\', 21), (31, \'c\', \'2024-01-01\', 40), (32, \'c\', \'2024-01-03\', 10), (33, \'c\', \'2024-01-01\', 19), (34, \'c\', \'2024-01-05\', 42), (35, \'c\', \'2024-01-03\', 44), (36, \'c\', \'2024-01-05\', 32), (37, \'c\', \'2024-01-06\', 23), (38, \'c\', \'2024-01-03\', 38), (39, \'c\', \'2024-01-06\', 22), (40, \'c\', \'2024-01-06\', 14);', cols: ['id', 'order_date', 'amount', 'cumulative_revenue'], rows: [[12, '2024-01-01', 46, 46], [17, '2024-01-01', 30, 76], [19, '2024-01-01', 16, 92], [28, '2024-01-01', 15, 107], [31, '2024-01-01', 40, 147], [33, '2024-01-01', 19, 166], [11, '2024-01-02', 41, 207], [18, '2024-01-02', 20, 227], [21, '2024-01-02', 47, 274], [27, '2024-01-02', 22, 296], [3, '2024-01-03', 13, 309], [4, '2024-01-03', 35, 344], [8, '2024-01-03', 11, 355], [9, '2024-01-03', 35, 390], [15, '2024-01-03', 31, 421], [16, '2024-01-03', 34, 455], [32, '2024-01-03', 10, 465], [35, '2024-01-03', 44, 509], [38, '2024-01-03', 38, 547], [1, '2024-01-04', 11, 558], [5, '2024-01-04', 14, 572], [6, '2024-01-04', 48, 620], [10, '2024-01-04', 30, 650], [20, '2024-01-04', 21, 671], [23, '2024-01-04', 4, 675], [2, '2024-01-05', 41, 716], [7, '2024-01-05', 13, 729], [22, '2024-01-05', 14, 743], [24, '2024-01-05', 5, 748], [25, '2024-01-05', 18, 766], [29, '2024-01-05', 6, 772], [34, '2024-01-05', 42, 814], [36, '2024-01-05', 32, 846], [13, '2024-01-06', 1, 847], [14, '2024-01-06', 45, 892], [26, '2024-01-06', 5, 897], [30, '2024-01-06', 21, 918], [37, '2024-01-06', 23, 941], [39, '2024-01-06', 22, 963], [40, '2024-01-06', 14, 977]] }
        ] },
      solution: {
        approach: `<p>A running SUM over the whole table ordered by the processing order (order_date, id). The unique tiebreaker removes peers, and the explicit ROWS frame guarantees "up to this physical row" even if someone later removes the tiebreaker.</p>`,
        code: { lang: 'sql', db: 'shop', code: `SELECT id, order_date, amount,
       SUM(amount) OVER (
         ORDER BY order_date, id
         ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
       ) AS cumulative_revenue
FROM orders
ORDER BY order_date, id;` },
        dry: { head: ['id', 'order_date', 'amount', 'accumulator'], rows: [['1', '2024-01-01', '50', '0 + 50 = 50'], ['2', '2024-01-01', '30', '50 + 30 = 80'], ['3', '2024-01-02', '20', '100'], ['4', '2024-01-03', '70', '170'], ['10', '2024-01-08', '35', '430']] },
        complexity: `<p>O(N log N) sort (O(N) with an index on (order_date, id)) + O(N) single accumulator pass. The self-join is O(N²) rows.</p>`,
        followUps: ['Reset the cumulative revenue at the start of every month.', 'Find the first order at which cumulative revenue reached 300.', 'What changes if you actually want "revenue as of end of day" for each row?']
      }
    }]
  });

  /* =====================================================================
     TOPIC 6 — Moving averages and explicit frames (ROWS / RANGE / GROUPS)
     ===================================================================== */
  topics.push({
    title: 'Moving Averages & Frames: ROWS, RANGE, GROUPS, EXCLUDE',
    analogy: `<p>Look at the world through a <b>train window</b>: as the train moves, the same-size window shows a slightly different stretch of countryside — one new tree appears on the right, one old tree disappears on the left. A <b>moving average</b> is exactly that: a fixed-size window that slides one row at a time, and you average whatever is inside it. Your phone's "average daily steps this week" and a stock chart's "50-day moving average" both work this way.</p>`,
    explain: `<p>A <b>frame</b> says which rows around the current row feed the aggregate. Full syntax:</p>
<pre>{ ROWS | RANGE | GROUPS } BETWEEN &lt;start&gt; AND &lt;end&gt; [ EXCLUDE ... ]

start / end can be:
  UNBOUNDED PRECEDING   n PRECEDING   CURRENT ROW   n FOLLOWING   UNBOUNDED FOLLOWING</pre>
<p><b>3-row moving average</b> (current row + 2 before):</p>
<pre>AVG(revenue) OVER (PARTITION BY region ORDER BY day
                   ROWS BETWEEN 2 PRECEDING AND CURRENT ROW)</pre>
${H.table(['day', 'revenue', 'frame (ROWS 2 PRECEDING)', '3-row avg'], [
  ['03-01', '80', '[80]', '80.0 <span class="c-y">(warm-up: only 1 row)</span>'],
  ['03-02', '95', '[80, 95]', '87.5 <span class="c-y">(2 rows)</span>'],
  ['03-03', '95', '[80, 95, 95]', '90.0'],
  ['03-04', '60', '[95, 95, 60]', '83.3'],
  ['03-05', '110', '[95, 60, 110]', '88.3']
])}
<p><b>The three frame units</b> — what does "2 PRECEDING" count?</p>
<ul>
<li><b>ROWS</b>: physical rows. "2 PRECEDING" = the 2 rows above me. Simple, fast, but blind to gaps: if a day is missing, a "3-row" window silently covers 4 calendar days.</li>
<li><b>RANGE</b>: the ORDER BY <b>value</b>. "2 PRECEDING" = every row whose value is within 2 of mine (value − 2 ≤ v ≤ value). Calendar-correct when ordering by a day number like <code>julianday(day)</code>. Needs exactly one numeric (or date/interval in PostgreSQL) ORDER BY column.</li>
<li><b>GROUPS</b>: peer groups. "2 PRECEDING" = the 2 previous distinct ORDER BY values, with all their rows. Useful when several rows share a timestamp.</li>
</ul>
<p><b>Warm-up rows:</b> the first rows have smaller frames, so their "average" is over fewer rows. If the question says "only report when a full 7 days exist", add <code>COUNT(*) OVER (same frame) = 7</code> as a filter in an outer query.</p>
<p><b>EXCLUDE</b> (SQLite ≥ 3.28, PostgreSQL ≥ 11): <code>EXCLUDE CURRENT ROW</code>, <code>EXCLUDE GROUP</code> (me and my peers), <code>EXCLUDE TIES</code> (my peers but not me), <code>EXCLUDE NO OTHERS</code> (default). Example: "average salary of my <b>colleagues</b>, not counting me".</p>
<p><b>Centered windows</b> like <code>ROWS BETWEEN 1 PRECEDING AND 1 FOLLOWING</code> smooth noisy data for charts (each point averaged with its neighbours).</p>`,
    clues: [
      '"moving / rolling / trailing average", "last 7 days", "7-day rolling sum" → AVG/SUM OVER (... ROWS/RANGE BETWEEN 6 PRECEDING AND CURRENT ROW)',
      '"some days have no data" + "last 7 calendar days" → RANGE on a day number (julianday) or fill gaps first',
      '"only when a full window is available" → also compute COUNT(*) over the same frame and filter',
      '"smooth the series", "centered average" → ROWS BETWEEN k PRECEDING AND k FOLLOWING',
      '"compared to the average of everyone else" → EXCLUDE CURRENT ROW (or (SUM − x) / (COUNT − 1))',
      '"several events at the same timestamp" + window over timestamps → think GROUPS vs ROWS'
    ],
    code: [
      { lang: 'sql', db: 'shop', title: '3-day moving average: row-based vs calendar-based', code: `SELECT region, day, revenue,
       ROUND(AVG(revenue) OVER (PARTITION BY region ORDER BY day
                                ROWS BETWEEN 2 PRECEDING AND CURRENT ROW), 1)        AS ma3_rows,
       ROUND(AVG(revenue) OVER (PARTITION BY region ORDER BY julianday(day)
                                RANGE BETWEEN 2 PRECEDING AND CURRENT ROW), 1)       AS ma3_calendar,
       COUNT(*)           OVER (PARTITION BY region ORDER BY julianday(day)
                                RANGE BETWEEN 2 PRECEDING AND CURRENT ROW)           AS days_in_frame
FROM daily_revenue
ORDER BY region, day;` },
      { lang: 'sql', db: 'shop', title: 'ROWS vs RANGE vs GROUPS side by side (inline data)', code: `WITH t(d, v) AS (VALUES (1,100),(2,120),(3,90),(5,150),(5,20),(6,130))
SELECT d, v,
       SUM(v) OVER (ORDER BY d ROWS   BETWEEN 1 PRECEDING AND CURRENT ROW) AS rows_1,
       SUM(v) OVER (ORDER BY d RANGE  BETWEEN 1 PRECEDING AND CURRENT ROW) AS range_1,
       SUM(v) OVER (ORDER BY d GROUPS BETWEEN 1 PRECEDING AND CURRENT ROW) AS groups_1
FROM t
ORDER BY d;` }
    ],
    codeTitle: ['Moving averages', 'Three frame units'],
    viz: [{
      title: 'The frame slides: k-row moving average',
      input: '3 | 80 95 95 60 110 120 100 140',
      inputLabel: 'k | values in time order (k = window size 1–6, max 14 values)',
      gen: function (input) {
        var parts = String(input).split('|');
        if (parts.length !== 2) throw new Error('Format: "k | v1 v2 v3 ...", e.g. "3 | 80 95 95 60"');
        var k = num(parts[0].trim(), 'k must be a number');
        if (k < 1 || k > 6 || Math.floor(k) !== k) throw new Error('k must be a whole number from 1 to 6');
        var v = parts[1].trim().split(/[\s,]+/).filter(Boolean).map(function (x) { return num(x, 'Values must be numbers separated by spaces'); });
        if (v.length < 3) throw new Error('Give at least 3 values');
        if (v.length > 14) throw new Error('Use at most 14 values');
        var cols = ['row', 'value', 'frame rows', 'SUM', 'AVG'];
        var rows = v.map(function (x, i) { return ['r' + (i + 1), x, '·', '·', '·']; });
        var frames = [{ narr: 'Query: <code>AVG(value) OVER (ORDER BY t ROWS BETWEEN ' + (k - 1) + ' PRECEDING AND CURRENT ROW)</code> — a ' + k + '-row window. Watch the blue frame slide down one row at a time.', parts: [{ type: 'table', label: 'input', columns: cols, rows: copyRows(rows) }, { type: 'array', label: 'values', values: v.slice() }] }];
        var sum = 0;
        for (var i = 0; i < v.length; i++) {
          var lo = Math.max(0, i - k + 1), left = i - k >= 0 ? v[i - k] : null;
          sum += v[i]; if (left !== null) sum -= left;
          var cnt = i - lo + 1;
          rows[i][2] = cnt + (cnt < k ? ' (warm-up)' : ''); rows[i][3] = sum; rows[i][4] = f1(Math.round(10 * sum / cnt) / 10);
          var hl = span(lo, i, 'win'); hl[i] = 'cur'; if (left !== null) hl[i - k] = 'bad';
          var ptr = {}; ptr[i] = 'cur'; if (left !== null) ptr[i - k] = 'out';
          var narr = 'Row r' + (i + 1) + ': frame = rows r' + (lo + 1) + '..r' + (i + 1) + ' (blue). ';
          narr += left !== null ? 'Slide: <span class="c-g">+' + v[i] + '</span> enters, <span class="c-r">−' + left + '</span> leaves (red). Running sum updated in O(1) = <b>' + sum + '</b>. ' : 'Frame still growing (' + cnt + ' of ' + k + ' rows): sum = <b>' + sum + '</b>. ';
          narr += 'AVG = ' + sum + ' / ' + cnt + ' = <b>' + rows[i][4] + '</b>.';
          frames.push({ narr: narr, parts: [{ type: 'table', label: 'moving average filling in', columns: cols, rows: copyRows(rows), hl: hl }, { type: 'array', label: 'frame = blue range', values: v.slice(), range: [lo, i], ptr: ptr }, { type: 'vars', label: 'sliding state', vals: { entering: v[i], leaving: left === null ? '-' : left, frame_sum: sum, frame_count: cnt }, hl: { frame_sum: 'ok' } }] });
        }
        var hlW = {}; for (var w = 0; w < Math.min(k - 1, v.length); w++) hlW[w] = 'bad';
        frames.push({ narr: 'Done. The first <b>' + (k - 1) + '</b> row(s) (red) are <b>warm-up</b> rows averaged over fewer than ' + k + ' values. If the question wants only full windows, filter <code>COUNT(*) OVER (same frame) = ' + k + '</code> in an outer query.', parts: [{ type: 'table', label: 'final', columns: cols, rows: copyRows(rows), hl: hlW }, { type: 'bars', label: 'moving average', values: rows.map(function (r) { return Number(r[4]); }) }] });
        return frames;
      }
    }, {
      title: 'Same "1 PRECEDING", three meanings: ROWS vs RANGE vs GROUPS',
      input: '1:100, 2:120, 3:90, 5:150, 5:20, 6:130',
      inputLabel: 'Rows as "day:value" in day order (max 10); repeat a day to create peers',
      gen: function (input) {
        var r = items(input).map(function (it) {
          var p = it.split(':');
          if (p.length !== 2) throw new Error('Each item must be "day:value", e.g. "5:150"');
          return { d: num(p[0].trim(), 'Day must be a number'), v: num(p[1].trim(), 'Value must be a number') };
        });
        if (r.length < 3) throw new Error('Give at least 3 rows');
        if (r.length > 10) throw new Error('Use at most 10 rows');
        r = r.map(function (x, i) { return { d: x.d, v: x.v, i: i }; }).sort(function (a, b) { return a.d - b.d || a.i - b.i; });
        var n = r.length, cols = ['day', 'value', 'ROWS', 'RANGE', 'GROUPS'];
        var rows = r.map(function (x) { return [x.d, x.v, '·', '·', '·']; });
        var gid = [], g = -1;
        r.forEach(function (x, i) { if (i === 0 || x.d !== r[i - 1].d) g++; gid.push(g); });
        var frames = [{ narr: 'Three sums, all written as <code>BETWEEN 1 PRECEDING AND CURRENT ROW</code>, ordered by day. Only the <b>unit</b> differs: ROWS counts rows, RANGE measures day values, GROUPS counts distinct-day groups.', parts: [{ type: 'table', label: 'input (ORDER BY day)', columns: cols, rows: copyRows(rows) }] }];
        for (var i = 0; i < n; i++) {
          var rLo = Math.max(0, i - 1), rHi = i;
          var lastPeer = i; while (lastPeer + 1 < n && r[lastPeer + 1].d === r[i].d) lastPeer++;
          var qLo = 0; while (r[qLo].d < r[i].d - 1) qLo++;
          var gLo = 0; while (gid[gLo] < gid[i] - 1) gLo++;
          var sR = 0, sQ = 0, sG = 0, t;
          for (t = rLo; t <= rHi; t++) sR += r[t].v;
          for (t = qLo; t <= lastPeer; t++) sQ += r[t].v;
          for (t = gLo; t <= lastPeer; t++) sG += r[t].v;
          rows[i][2] = sR; rows[i][3] = sQ; rows[i][4] = sG;
          var hlOf = function (lo, hi) { var h = span(lo, hi, "win"); h[i] = "cur"; return h; };
          frames.push({ narr: 'Row ' + (i + 1) + ' (day ' + r[i].d + '): <b>ROWS</b> = this row + the physical row above → ' + sR + '. <b>RANGE</b> = rows with day in [' + (r[i].d - 1) + ', ' + r[i].d + '] incl. peers → ' + sQ + '. <b>GROUPS</b> = previous day-group + my whole group → ' + sG + '.' + (sR !== sQ || sQ !== sG ? ' <span class="c-y">They disagree here.</span>' : ''), parts: [
            { type: 'table', label: 'ROWS frame', columns: cols, rows: copyRows(rows), hl: hlOf(rLo, rHi) },
            { type: 'table', label: 'RANGE frame (value distance ≤ 1)', columns: cols, rows: copyRows(rows), hl: hlOf(qLo, lastPeer) },
            { type: 'table', label: 'GROUPS frame (1 previous peer group)', columns: cols, rows: copyRows(rows), hl: hlOf(gLo, lastPeer) }
          ] });
        }
        frames.push({ narr: 'Summary: ROWS ignores gaps and splits peers; RANGE respects the <b>distance in day values</b> (a missing day shrinks the frame); GROUPS treats each distinct day as one unit (a missing day does not matter). Pick the unit that matches the question\'s words.', parts: [{ type: 'table', label: 'all three results', columns: cols, rows: copyRows(rows), hl: span(0, n - 1, 'ok') }] });
        return frames;
      }
    }],
    examples: [
      { title: 'Row-based vs calendar-based 3-day average (missing day)', html: `<p>North has no 03-04. On <b>03-06</b>, the ROWS frame takes the last three <i>rows</i> (03-03, 03-05, 03-06 → ${H.c('r', '123.3')}), spanning 4 calendar days. The RANGE frame over <code>julianday(day)</code> takes days 03-04..03-06 → only two rows exist → ${H.c('g', '140.0')}. Which is "right" depends on the business meaning — say so.</p>`,
        code: { lang: 'sql', db: 'shop', code: `SELECT day, revenue,
       ROUND(AVG(revenue) OVER (ORDER BY day ROWS BETWEEN 2 PRECEDING AND CURRENT ROW), 1) AS ma3_rows,
       ROUND(AVG(revenue) OVER (ORDER BY julianday(day) RANGE BETWEEN 2 PRECEDING AND CURRENT ROW), 1) AS ma3_calendar
FROM daily_revenue
WHERE region = 'North'
ORDER BY day;` } },
      { title: 'Centered smoothing for a chart', html: `<p><code>ROWS BETWEEN 1 PRECEDING AND 1 FOLLOWING</code> averages each day with its neighbours. South 03-04 (a dip to 60) becomes ${H.c('g', '88.3')} — the line chart gets smoother. The first and last rows only have two values in their frame.</p>`,
        code: { lang: 'sql', db: 'shop', code: `SELECT day, revenue,
       ROUND(AVG(revenue) OVER (ORDER BY day ROWS BETWEEN 1 PRECEDING AND 1 FOLLOWING), 1) AS smoothed
FROM daily_revenue
WHERE region = 'South'
ORDER BY day;` } },
      { title: 'Average of my colleagues (EXCLUDE CURRENT ROW)', html: `<p>"Compare each employee with the average of the <b>other</b> people in their department." The whole-partition frame plus <code>EXCLUDE CURRENT ROW</code> removes yourself. Kim (HR) sees ${H.c('b', '60000')} — the average of Leo and Mia. Portable alternative: <code>(SUM(salary) OVER w − salary) / (COUNT(*) OVER w − 1)</code>.</p>`,
        code: { lang: 'sql', db: 'hr', code: `SELECT name, dept, salary,
       ROUND(AVG(salary) OVER (
         PARTITION BY dept
         ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
         EXCLUDE CURRENT ROW)) AS avg_of_others
FROM employees
ORDER BY dept, salary DESC;` } },
      { title: 'Old school: moving average with a self-join', html: `<p>Join each day to the days within the last 2 calendar days and GROUP BY. It is calendar-correct (like RANGE) but builds k joined rows per row and needs an index on (region, day) to avoid an O(N²) join. The window version slides with O(1) work per row.</p>`,
        code: { lang: 'sql', db: 'shop', code: `SELECT d.region, d.day, d.revenue,
       ROUND(AVG(p.revenue), 1) AS ma3_calendar,
       COUNT(*)                 AS days_in_frame
FROM daily_revenue d
JOIN daily_revenue p
  ON p.region = d.region
 AND julianday(p.day) BETWEEN julianday(d.day) - 2 AND julianday(d.day)
GROUP BY d.region, d.day, d.revenue
ORDER BY d.region, d.day;` } }
    ],
    deepDive: `<p><b>Frame rules.</b> The start bound cannot be after the end bound (<code>BETWEEN CURRENT ROW AND 1 PRECEDING</code> is an error). <code>ROWS 2 PRECEDING</code> is short for <code>ROWS BETWEEN 2 PRECEDING AND CURRENT ROW</code>. <b>RANGE with an offset</b> requires exactly one ORDER BY expression of a numeric type in SQLite (hence <code>julianday(day)</code>); PostgreSQL also accepts dates/timestamps with an interval offset: <code>RANGE BETWEEN INTERVAL '6 days' PRECEDING AND CURRENT ROW</code>. MySQL 8 supports ROWS and RANGE (with INTERVAL) but <b>not GROUPS</b>; SQL Server supports only ROWS and RANGE with UNBOUNDED/CURRENT ROW (no numeric RANGE offsets).</p>
<p><b>Ranking and navigation functions ignore frames</b> (ROW_NUMBER, RANK, LAG, LEAD, NTILE…). Frames affect aggregates and FIRST_VALUE / LAST_VALUE / NTH_VALUE only.</p>
<p><b>Algorithmic cost.</b> A sliding SUM/COUNT/AVG uses add-new/subtract-old ("inverse transition"): O(1) per row → O(N) total, exactly the sliding-window technique from DSA. Sliding MIN/MAX cannot subtract, so engines either rescan the frame (O(N·k)) or use smarter structures; PostgreSQL restarts the aggregate when the frame head moves for non-invertible aggregates, which can become O(N·k). Floating-point AVG via subtract-old can accumulate rounding error over millions of rows — some engines recompute periodically.</p>
<p><b>Calendar correctness in production.</b> Real time series have gaps (no sales on holidays) and duplicates (late-arriving events). Robust pipelines first build a <b>date spine</b> (recursive CTE or calendar table), LEFT JOIN facts onto it with COALESCE(…, 0), aggregate to one row per day, and only then apply a ROWS frame — making ROWS and RANGE equivalent and the intent obvious.</p>`,
    aiEra: `<p><b>What AI changes:</b> "7-day rolling average" is a one-line request to any assistant, and BI tools (Looker, dbt metrics, Power BI DAX) generate frames for you. The value you add is noticing when <b>row-based ≠ time-based</b>.</p>
<p><b>Use AI as a partner:</b> <code>"Rewrite this ROWS-based 7-day average to be calendar-correct in SQLite and in PostgreSQL, and give me a test dataset with a missing day where they differ."</code> Then run both in the playground.</p>
<p><b>Where AI goes wrong:</b> using <code>ROWS 7 PRECEDING</code> for 7 days (that is 8 rows!); forgetting warm-up rows; using RANGE with an INTERVAL in SQLite; using GROUPS in MySQL; averaging pre-aggregated averages (an average of daily averages is not the weekly average when daily counts differ).</p>
<p><b>What you must still own:</b> counting frame boundaries exactly (6 PRECEDING + current = 7), choosing the unit (rows, values, groups), and knowing the sliding-window cost model behind it.</p>`,
    problems: [{
      title: 'Calendar-Correct 3-Day Moving Average',
      level: 'Medium', tags: ['window', 'moving average', 'range frame', 'dates'], companies: ['Netflix', 'Airbnb', 'Instacart'],
      statement: `<p>Table <code>daily_revenue(day, region, revenue)</code>, one row per (day, region), but some days are <b>missing</b> (no row). For every row return <code>region, day, revenue, ma3, days_used</code> where <code>ma3</code> is the average revenue of that region over the <b>3 calendar days</b> ending on <code>day</code> (day−2, day−1, day) using only the rows that exist, rounded to 1 decimal, and <code>days_used</code> is how many rows went into it. Order by region, day.</p>`,
      constraints: `Up to 10<sup>6</sup> rows. Days are ISO strings 'YYYY-MM-DD'. Missing days must not be treated as 0 and must not pull in older days.`,
      example: `${H.table(['region', 'day', 'revenue', 'ma3', 'days_used'], [['North', '03-03', '90', '103.3', '3'], ['North', '03-05', '150', '<span class="c-g">120.0</span>', '<span class="c-y">2</span> (03-03, 03-05)'], ['North', '03-06', '130', '<span class="c-g">140.0</span>', '<span class="c-y">2</span> (03-05, 03-06)'], ['North', '03-07', '130', '136.7', '3']])}<p>On 03-06 the window is 03-04..03-06. 03-04 is missing, so only 150 and 130 count → 140.0. A ROWS frame would wrongly include 03-03 (→ 123.3).</p>`,
      brute: {
        why: `<p>Self-join each row with all rows of the same region whose day is within the previous 2 calendar days, then GROUP BY. Correct, but it materialises up to 3 joined rows per row and, without an index on (region, day), the join compares every pair in a region: O(N²/R). It also gets slower linearly as the window grows (30-day windows → 30 joined rows per row).</p>`,
        code: { lang: 'sql', db: 'shop', code: `SELECT d.region, d.day, d.revenue,
       ROUND(AVG(p.revenue), 1) AS ma3,
       COUNT(*)                 AS days_used
FROM daily_revenue d
JOIN daily_revenue p
  ON p.region = d.region
 AND julianday(p.day) BETWEEN julianday(d.day) - 2 AND julianday(d.day)
GROUP BY d.region, d.day, d.revenue
ORDER BY d.region, d.day;` }
      },
      mcq: { q: 'Why does ROWS BETWEEN 2 PRECEDING AND CURRENT ROW give the wrong answer here?', options: ['ROWS cannot be used with AVG', 'ROWS counts physical rows, so a missing day pulls in an older day', 'ROWS ignores PARTITION BY', 'ROWS includes peers'], answer: 1, explain: 'ROWS takes the previous 2 rows whatever their dates are. When 03-04 is missing, the frame for 03-06 reaches back to 03-03 — four calendar days.' },
      hints: [
        `<p>You need a frame measured in <b>days</b>, not rows. That is a RANGE frame over a numeric day value.</p>`,
        `<p>SQLite's RANGE offset needs a number: order by <code>julianday(day)</code> and use <code>RANGE BETWEEN 2 PRECEDING AND CURRENT ROW</code>. Keep PARTITION BY region.</p>`,
        `<p>Compute AVG and COUNT(*) over the same named window. Recipe: WINDOW w AS (PARTITION BY region ORDER BY julianday(day) RANGE BETWEEN 2 PRECEDING AND CURRENT ROW); SELECT ..., ROUND(AVG(revenue) OVER w, 1), COUNT(*) OVER w.</p>`
      ],
      tests: { cmp: 'exact', engine: 'sqlite', cases: [
          { cols: ['region', 'day', 'revenue', 'ma3', 'days_used'], rows: [['North', '2024-03-01', 100, 100, 1], ['North', '2024-03-02', 120, 110, 2], ['North', '2024-03-03', 90, 103.3, 3], ['North', '2024-03-05', 150, 120, 2], ['North', '2024-03-06', 130, 140, 2], ['North', '2024-03-07', 130, 136.7, 3], ['North', '2024-03-08', 170, 143.3, 3], ['North', '2024-03-09', 160, 153.3, 3], ['North', '2024-03-10', 200, 176.7, 3], ['South', '2024-03-01', 80, 80, 1], ['South', '2024-03-02', 95, 87.5, 2], ['South', '2024-03-03', 95, 90, 3], ['South', '2024-03-04', 60, 83.3, 3], ['South', '2024-03-05', 110, 88.3, 3], ['South', '2024-03-06', 120, 96.7, 3], ['South', '2024-03-07', 100, 110, 3], ['South', '2024-03-08', 140, 120, 3], ['South', '2024-03-09', 150, 130, 3], ['South', '2024-03-10', 90, 126.7, 3]] },
          { setup: 'DELETE FROM daily_revenue; ', rows: [] },
          { setup: 'DELETE FROM daily_revenue; INSERT INTO daily_revenue VALUES (\'2024-05-01\', \'N\', 9);', cols: ['region', 'day', 'revenue', 'ma3', 'days_used'], rows: [['N', '2024-05-01', 9, 9, 1]] },
          { setup: 'DELETE FROM daily_revenue; INSERT INTO daily_revenue VALUES (\'2024-02-27\', \'N\', 10), (\'2024-02-28\', \'N\', 20), (\'2024-02-29\', \'N\', 40), (\'2024-03-01\', \'N\', 80), (\'2024-03-04\', \'N\', 7);', cols: ['region', 'day', 'revenue', 'ma3', 'days_used'], rows: [['N', '2024-02-27', 10, 10, 1], ['N', '2024-02-28', 20, 15, 2], ['N', '2024-02-29', 40, 23.3, 3], ['N', '2024-03-01', 80, 46.7, 3], ['N', '2024-03-04', 7, 7, 1]] },
          { setup: 'DELETE FROM daily_revenue; INSERT INTO daily_revenue VALUES (\'2023-12-30\', \'N\', 1), (\'2023-12-31\', \'N\', 2), (\'2024-01-01\', \'N\', 4), (\'2024-01-02\', \'N\', 8), (\'2024-01-03\', \'S\', 100);', cols: ['region', 'day', 'revenue', 'ma3', 'days_used'], rows: [['N', '2023-12-30', 1, 1, 1], ['N', '2023-12-31', 2, 1.5, 2], ['N', '2024-01-01', 4, 2.3, 3], ['N', '2024-01-02', 8, 4.7, 3], ['S', '2024-01-03', 100, 100, 1]] },
          { setup: 'DELETE FROM daily_revenue; INSERT INTO daily_revenue VALUES (\'2024-05-01\', \'A\', 10), (\'2024-05-10\', \'A\', 20), (\'2024-05-11\', \'A\', 30), (\'2024-05-02\', \'B\', 0), (\'2024-05-03\', \'B\', 0), (\'2024-05-04\', \'B\', 3);', cols: ['region', 'day', 'revenue', 'ma3', 'days_used'], rows: [['A', '2024-05-01', 10, 10, 1], ['A', '2024-05-10', 20, 20, 1], ['A', '2024-05-11', 30, 25, 2], ['B', '2024-05-02', 0, 0, 1], ['B', '2024-05-03', 0, 0, 2], ['B', '2024-05-04', 3, 1, 3]] },
          { setup: 'DELETE FROM daily_revenue; INSERT INTO daily_revenue VALUES (\'2024-06-03\', \'Q\', 7), (\'2024-06-01\', \'Q\', 2), (\'2024-06-02\', \'Q\', 2);', cols: ['region', 'day', 'revenue', 'ma3', 'days_used'], rows: [['Q', '2024-06-01', 2, 2, 1], ['Q', '2024-06-02', 2, 2, 2], ['Q', '2024-06-03', 7, 3.7, 3]] }
        ] },
      solution: {
        approach: `<p>Order each region's rows by the day as a number (julianday) and use a RANGE frame of 2 PRECEDING: the frame contains exactly the rows whose day value is within 2 days before the current one, however many rows that is. COUNT over the same frame reports how many days actually had data.</p>`,
        code: { lang: 'sql', db: 'shop', code: `SELECT region, day, revenue,
       ROUND(AVG(revenue) OVER w, 1) AS ma3,
       COUNT(*)           OVER w     AS days_used
FROM daily_revenue
WINDOW w AS (
  PARTITION BY region
  ORDER BY julianday(day)
  RANGE BETWEEN 2 PRECEDING AND CURRENT ROW
)
ORDER BY region, day;` },
        alt: [{ lang: 'sql', check: false, title: 'PostgreSQL: RANGE with an INTERVAL on a DATE column', code: `SELECT region, day, revenue,
       ROUND(AVG(revenue) OVER w, 1) AS ma3,
       COUNT(*) OVER w AS days_used
FROM daily_revenue
WINDOW w AS (PARTITION BY region ORDER BY day::date
             RANGE BETWEEN INTERVAL '2 days' PRECEDING AND CURRENT ROW)
ORDER BY region, day;` }],
        dry: { head: ['region', 'day', 'frame (day values)', 'rows in frame', 'ma3'], rows: [['North', '03-03', '03-01..03-03', '100, 120, 90', '103.3'], ['North', '03-05', '03-03..03-05', '90, 150', '120.0'], ['North', '03-06', '03-04..03-06', '150, 130', '140.0'], ['South', '03-04', '03-02..03-04', '95, 95, 60', '83.3']] },
        complexity: `<p>One sort per partition key, then a sliding frame: O(N log N) + O(N). The self-join is O(N·k) with an index and O(N²/R) without.</p>`,
        followUps: ['Treat missing days as 0 revenue instead (build a date spine with a recursive CTE).', 'Only output rows where all 3 days had data.', 'Make it a 7-day window in PostgreSQL using an INTERVAL.']
      }
    }]
  });

  /* =====================================================================
     TOPIC 7 — FIRST_VALUE / LAST_VALUE / NTH_VALUE (and the default-frame trap)
     ===================================================================== */
  topics.push({
    title: 'FIRST_VALUE, LAST_VALUE & NTH_VALUE (the Frame Trap)',
    analogy: `<p>Imagine walking down a line of people sorted from tallest to shortest, carrying a notebook. At each person you write "tallest so far" (the person at the <b>front</b>) and "last person I can see". If you can only see the people you have <b>already walked past</b>, then "the last person I can see" is always <b>yourself</b> — not the shortest person at the end of the line. That is exactly why <code>LAST_VALUE</code> surprises everyone: by default its frame only reaches the current row.</p>`,
    explain: `<p>These are <b>value</b> functions: they return a column from a specific row of the <b>frame</b>.</p>
<ul>
<li><code>FIRST_VALUE(x)</code> — x from the first row of the frame.</li>
<li><code>LAST_VALUE(x)</code> — x from the last row of the frame.</li>
<li><code>NTH_VALUE(x, n)</code> — x from the n-th row of the frame (NULL if the frame has fewer than n rows).</li>
</ul>
<p>Unlike ROW_NUMBER or LAG, they <b>do</b> use the frame. And remember the default frame with ORDER BY: <code>RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW</code>. So:</p>
${H.table(['name', 'salary', 'FIRST_VALUE(name)', 'LAST_VALUE(name) default', 'LAST_VALUE(name) full frame'], [
  ['Asha', '120000', 'Asha', '<span class="c-r">Asha</span>', '<span class="c-g">Fay</span>'],
  ['Chen', '110000', 'Asha', '<span class="c-r">Chen</span>', '<span class="c-g">Fay</span>'],
  ['Dev', '95000', 'Asha', '<span class="c-r">Dev</span>', '<span class="c-g">Fay</span>'],
  ['Fay', '80000', 'Asha', 'Fay', '<span class="c-g">Fay</span>']
])}
<p><b>FIRST_VALUE works out of the box</b> (the frame always starts at the first row). <b>LAST_VALUE does not</b> — it just returns the current row (or its last peer). The fix is to widen the frame:</p>
<pre>LAST_VALUE(name) OVER (PARTITION BY dept ORDER BY salary DESC
                       ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING)</pre>
<p>A common, simpler alternative: <code>FIRST_VALUE(name) OVER (... ORDER BY salary ASC)</code> — reverse the order and take the first.</p>
<p><b>Typical uses:</b> "gap between each employee and the top earner" (<code>salary − FIRST_VALUE(salary)</code>), "first and latest status of each ticket", "starting vs current salary", "first product a customer bought", "value at the start of the month" for month-to-date growth.</p>
<p><b>Ties:</b> if the ORDER BY has ties, "first" among peers is arbitrary — add a tiebreaker (<code>ORDER BY salary DESC, id</code>).</p>`,
    clues: [
      '"compared with the top / best / first in the group" → x − FIRST_VALUE(x) OVER (PARTITION BY g ORDER BY ...)',
      '"first and last value per group on every row" → FIRST_VALUE + LAST_VALUE with a full frame',
      '"starting vs current", "opening vs closing price" → FIRST_VALUE / LAST_VALUE over a date order',
      '"the second best in each group, shown on every row" → NTH_VALUE(x, 2) with a full frame',
      'Output where LAST_VALUE just equals the current row → someone forgot UNBOUNDED FOLLOWING',
      '"first product each customer bought" → FIRST_VALUE or ROW_NUMBER = 1'
    ],
    code: { lang: 'sql', db: 'hr', title: 'FIRST_VALUE vs LAST_VALUE (default and full frame) vs NTH_VALUE', code: `SELECT dept, name, salary,
       FIRST_VALUE(name) OVER (PARTITION BY dept ORDER BY salary DESC, id)          AS top_earner,
       LAST_VALUE(name)  OVER (PARTITION BY dept ORDER BY salary DESC, id)          AS last_default_TRAP,
       LAST_VALUE(name)  OVER (PARTITION BY dept ORDER BY salary DESC, id
                               ROWS BETWEEN UNBOUNDED PRECEDING
                                        AND UNBOUNDED FOLLOWING)                    AS lowest_earner,
       NTH_VALUE(name, 2) OVER (PARTITION BY dept ORDER BY salary DESC, id
                               ROWS BETWEEN UNBOUNDED PRECEDING
                                        AND UNBOUNDED FOLLOWING)                    AS second_in_line
FROM employees
ORDER BY dept, salary DESC, id;` },
    viz: {
      title: 'Why LAST_VALUE returns the current row: the frame stops at CURRENT ROW',
      input: 'Asha 120, Ben 120, Chen 110, Dev 95, Eli 95, Fay 80',
      inputLabel: 'One partition as "Name Salary", comma separated (max 10) — sorted high → low',
      gen: function (input) {
        var r = items(input).map(function (it) {
          var p = it.split(/\s+/);
          if (p.length !== 2) throw new Error('Each item must be "Name Salary", e.g. "Asha 120"');
          return { n: p[0], s: num(p[1], 'Salary must be a number') };
        });
        if (r.length < 3) throw new Error('Give at least 3 rows');
        if (r.length > 10) throw new Error('Use at most 10 rows');
        r = r.map(function (x, i) { return { n: x.n, s: x.s, i: i }; }).sort(function (a, b) { return b.s - a.s || a.i - b.i; });
        var n = r.length, cols = ['name', 'salary', 'FIRST_VALUE', 'LAST_VALUE (default)', 'LAST_VALUE (full)'];
        var rows = r.map(function (x) { return [x.n, x.s, '·', '·', '·']; });
        var frames = [{ narr: 'One partition, <code>ORDER BY salary DESC</code>. We compute three columns. The first two use the <b>default frame</b> RANGE UNBOUNDED PRECEDING → CURRENT ROW (with peers); the last uses the <b>full frame</b> UNBOUNDED PRECEDING → UNBOUNDED FOLLOWING.', parts: [{ type: 'table', label: 'partition', columns: cols, rows: copyRows(rows) }] }];
        for (var i = 0; i < n; i++) {
          var last = i; while (last + 1 < n && r[last + 1].s === r[i].s) last++;
          rows[i][2] = r[0].n; rows[i][3] = r[last].n;
          var hl = span(0, last, 'win'); hl[i] = 'cur';
          frames.push({ narr: 'Row ' + r[i].n + ': default frame = rows 1..' + (last + 1) + ' (blue' + (last > i ? ', reaching to the last <b>peer</b> with the same salary' : '') + '). FIRST_VALUE = first row of frame = <b>' + r[0].n + '</b> ✔. LAST_VALUE = last row of frame = <b>' + r[last].n + '</b>' + (last === n - 1 ? '.' : ' <span class="c-r">— not the lowest earner!</span>'), parts: [{ type: 'table', label: 'default frame (RANGE ... CURRENT ROW)', columns: cols, rows: copyRows(rows), hl: hl }, { type: 'array', label: 'frame = blue range', values: r.map(function (x) { return x.n; }), range: [0, last], ptr: (function () { var p = {}; p[i] = 'cur'; return p; })() }] });
        }
        for (var j = 0; j < n; j++) rows[j][4] = r[n - 1].n;
        frames.push({ narr: 'Now widen the frame: <code>ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING</code>. Every row\'s frame is the <b>whole partition</b> (blue), so LAST_VALUE = <b>' + r[n - 1].n + '</b> on every row — the answer people actually wanted.', parts: [{ type: 'table', label: 'full frame', columns: cols, rows: copyRows(rows), hl: span(0, n - 1, 'win') }, { type: 'array', label: 'frame = whole partition', values: r.map(function (x) { return x.n; }), range: [0, n - 1] }] });
        var hlBad = {}; for (var k = 0; k < n; k++) hlBad[k] = rows[k][3] === rows[k][4] ? 'ok' : 'bad';
        frames.push({ narr: 'Compare columns 4 and 5: red rows are where the default-frame LAST_VALUE gave a misleading answer. Rule: <b>LAST_VALUE and NTH_VALUE almost always need an explicit frame.</b>', parts: [{ type: 'table', label: 'default vs full frame', columns: cols, rows: copyRows(rows), hl: hlBad }] });
        return frames;
      }
    },
    examples: [
      { title: 'Gap to the top earner in each department', html: `<p><code>salary − FIRST_VALUE(salary)</code> shows how far each person is from the top. Chen is ${H.c('r', '−10000')}, Fay ${H.c('r', '−40000')}. FIRST_VALUE is safe with the default frame because the frame always begins at the partition's first row. (MAX(salary) OVER (PARTITION BY dept) would give the same number here.)</p>`,
        code: { lang: 'sql', db: 'hr', code: `SELECT dept, name, salary,
       salary - FIRST_VALUE(salary) OVER (PARTITION BY dept ORDER BY salary DESC) AS gap_to_top
FROM employees
ORDER BY dept, salary DESC;` } },
      { title: 'Starting vs current salary and total growth', html: `<p>Per employee, ordered by effective date with a full frame: FIRST_VALUE = starting salary, LAST_VALUE = current salary. Asha grew ${H.c('g', '33.3%')} (90000 → 120000). Without the full frame, "current_salary" would just echo each historical row.</p>`,
        code: { lang: 'sql', db: 'hr', code: `SELECT e.name, s.effective_date, s.salary,
       FIRST_VALUE(s.salary) OVER w AS starting_salary,
       LAST_VALUE(s.salary)  OVER w AS current_salary,
       ROUND(100.0 * (LAST_VALUE(s.salary) OVER w - FIRST_VALUE(s.salary) OVER w)
             / FIRST_VALUE(s.salary) OVER w, 1) AS total_growth_pct
FROM salary_history s
JOIN employees e ON e.id = s.emp_id
WINDOW w AS (PARTITION BY s.emp_id ORDER BY s.effective_date
             ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING)
ORDER BY e.name, s.effective_date;` } },
      { title: 'First and last order per customer (one row each)', html: `<p>Value functions repeat the answer on every row, so add <code>DISTINCT</code> (or filter <code>ROW_NUMBER = 1</code>) to get one row per customer. dan has a single order, so first = last = ${H.c('b', '2024-01-08')}.</p>`,
        code: { lang: 'sql', db: 'shop', code: `SELECT DISTINCT customer,
       FIRST_VALUE(order_date) OVER w AS first_order,
       LAST_VALUE(order_date)  OVER w AS last_order,
       FIRST_VALUE(amount)     OVER w AS first_amount
FROM orders
WINDOW w AS (PARTITION BY customer ORDER BY order_date, id
             ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING)
ORDER BY customer;` } },
      { title: 'Old school: correlated subqueries for "first" and "last"', html: `<p>Without value functions you look up the first/last row per group with <code>ORDER BY ... LIMIT 1</code> subqueries — one probe per row per column. Fine for a handful of rows, ${H.c('r', 'slow and verbose')} at scale, and easy to get wrong on ties.</p>`,
        code: { lang: 'sql', db: 'hr', code: `SELECT e.dept, e.name, e.salary,
       (SELECT e2.name FROM employees e2 WHERE e2.dept = e.dept
        ORDER BY e2.salary DESC, e2.id LIMIT 1) AS top_earner,
       (SELECT e2.name FROM employees e2 WHERE e2.dept = e.dept
        ORDER BY e2.salary ASC, e2.id DESC LIMIT 1) AS lowest_earner
FROM employees e
ORDER BY e.dept, e.salary DESC;` } }
    ],
    deepDive: `<p><b>Why the default is what it is.</b> The SQL standard chose <code>RANGE UNBOUNDED PRECEDING</code> as the default frame because it makes running aggregates natural. Value functions inherit it, so LAST_VALUE returns "the last row seen so far", which with peers is the <b>last peer</b> — whose identity is implementation-dependent unless the ORDER BY is unique. NTH_VALUE(x, 3) with the default frame is NULL on the first two rows of every partition (the frame does not yet have 3 rows), another classic surprise.</p>
<p><b>Dialect notes.</b> Oracle, Snowflake, BigQuery and SQL Server 2022 support <code>IGNORE NULLS</code> on FIRST_VALUE/LAST_VALUE — "last non-null value so far" — the idiomatic forward-fill. NTH_VALUE has a <code>FROM LAST</code> option in Oracle/Snowflake. SQLite and PostgreSQL support neither; emulate forward-fill with a running COUNT(x) as a group id and <code>MAX(x) OVER (PARTITION BY grp)</code>. SQL Server before 2022 has FIRST_VALUE/LAST_VALUE but no NTH_VALUE.</p>
<p><b>Performance.</b> FIRST_VALUE with an unbounded-preceding frame is O(1) per row. LAST_VALUE over a full frame needs the whole partition buffered (memory ∝ partition size, possibly spilling to disk for huge partitions). If you only need "last per group", <code>ROW_NUMBER() ... DESC = 1</code> or a GROUP BY + MAX is often cheaper than a value function computed on every row followed by DISTINCT.</p>`,
    aiEra: `<p><b>What AI changes:</b> Assistants know the LAST_VALUE trap in theory but still emit <code>LAST_VALUE(x) OVER (PARTITION BY g ORDER BY t)</code> regularly, because that is what thousands of buggy StackOverflow questions contain.</p>
<p><b>Use AI as a partner:</b> paste the query and ask <code>"What frame does each window function use here, written out explicitly?"</code> — forcing the frame to be spelled out exposes the bug immediately. Ask for an equivalent using FIRST_VALUE with reversed order.</p>
<p><b>Where AI goes wrong:</b> default-frame LAST_VALUE; IGNORE NULLS on engines without it; using value functions + DISTINCT on huge tables when a ROW_NUMBER filter would be cheaper.</p>
<p><b>What you must still own:</b> mentally expanding every OVER clause to its full frame. If you can say "this frame is RANGE UNBOUNDED PRECEDING to CURRENT ROW including peers" out loud, you will never ship this bug.</p>`
  });

  /* =====================================================================
     TOPIC 8 — NTILE, PERCENT_RANK, CUME_DIST
     ===================================================================== */
  topics.push({
    title: 'NTILE, PERCENT_RANK & CUME_DIST: Buckets and Percentiles',
    analogy: `<p>A teacher splits 13 students into <b>4 study groups</b> by test score: best scores in group 1, and so on. 13 does not divide by 4, so the first group gets one extra student (4, 3, 3, 3). That is <b>NTILE(4)</b>. Separately, a report card might say "you scored better than 75% of the class" — that is a <b>percentile</b>, which <b>PERCENT_RANK</b> and <b>CUME_DIST</b> compute.</p>`,
    explain: `<p><b>NTILE(k)</b> splits each partition's ordered rows into <b>k buckets</b> as evenly as possible and returns the bucket number 1..k. With N rows: every bucket gets ⌊N/k⌋ rows, and the first <code>N mod k</code> buckets get one extra.</p>
${H.table(['N rows', 'k', 'bucket sizes'], [['13', '4', '<b>4</b>, 3, 3, 3'], ['10', '4', '<b>3, 3</b>, 2, 2'], ['3', '5', '1, 1, 1 (buckets 4 and 5 are empty)']])}
<p><b>Important:</b> NTILE counts <b>rows</b>, not values, so <b>tied rows can land in different buckets</b>. In our data Dev and Eli both earn 95000 but get quartiles ${H.c('r', '1 and 2')}. If fairness matters, bucket on a percentile instead.</p>
<p><b>PERCENT_RANK()</b> = (RANK − 1) / (N − 1): the fraction of <i>other</i> rows that sort strictly before me. Top row = 0, bottom = 1 (if no ties). <b>CUME_DIST()</b> = (number of rows sorting before or <b>equal</b> to me) / N: always &gt; 0, the last row = 1. Both give ties the <b>same</b> value.</p>
${H.table(['name', 'salary', 'RANK', 'NTILE(4)', 'PERCENT_RANK', 'CUME_DIST'], [
  ['Asha', '120000', '1', '1', '0.0', '2/13 = 0.154'],
  ['Ben', '120000', '1', '1', '0.0', '0.154'],
  ['Chen', '110000', '3', '1', '2/12 = 0.167', '3/13 = 0.231'],
  ['Dev', '95000', '4', '<span class="c-r">1</span>', '0.25', '0.385'],
  ['Eli', '95000', '4', '<span class="c-r">2</span>', '0.25', '0.385'],
  ['Mia', '60000', '12', '4', '0.917', '1.0']
])}
<p><b>When to use which:</b> NTILE for "split customers into quartiles/deciles", A/B bucket assignment, equal-sized batches. PERCENT_RANK / CUME_DIST for "top 10% of earners", "what percentile is this score" — they respect ties. For an actual <b>median</b> value, PostgreSQL has <code>PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY x)</code>; SQLite does not, so you use ROW_NUMBER + COUNT (see practice).</p>`,
    clues: [
      '"quartile", "decile", "split into k equal groups / buckets" → NTILE(k)',
      '"top 10%", "bottom 25 percent", "percentile of each score" → PERCENT_RANK or CUME_DIST',
      '"ties must be in the same bucket" → do NOT use NTILE; use CUME_DIST / a CASE on percent',
      '"median" in SQLite / MySQL → ROW_NUMBER + COUNT(*) OVER; in PostgreSQL → PERCENTILE_CONT',
      '"assign users to k experiment groups evenly" → NTILE(k) OVER (ORDER BY hash or random)',
      '"what fraction of employees earn at most X" → CUME_DIST'
    ],
    code: { lang: 'sql', db: 'hr', title: 'Quartiles and percentiles company-wide', code: `SELECT name, dept, salary,
       NTILE(4)       OVER w            AS quartile,        -- 1 = top 25% of ROWS
       RANK()         OVER w            AS rnk,
       ROUND(PERCENT_RANK() OVER w, 3)  AS pct_rank,        -- (rank-1)/(N-1)
       ROUND(CUME_DIST()    OVER w, 3)  AS cume_dist        -- rows <= me / N
FROM employees
WINDOW w AS (ORDER BY salary DESC)
ORDER BY salary DESC, id;` },
    viz: {
      title: 'NTILE fills buckets by row count; PERCENT_RANK and CUME_DIST respect ties',
      input: '4 | 120 120 110 95 95 90 85 85 80 75 70 60 60',
      inputLabel: 'k | values (sorted high → low automatically; max 16)',
      gen: function (input) {
        var parts = String(input).split('|');
        if (parts.length !== 2) throw new Error('Format: "k | v1 v2 v3 ...", e.g. "4 | 120 110 95"');
        var k = num(parts[0].trim(), 'k must be a number');
        if (k < 1 || k > 8 || Math.floor(k) !== k) throw new Error('k must be a whole number from 1 to 8');
        var v = parts[1].trim().split(/[\s,]+/).filter(Boolean).map(function (x) { return num(x, 'Values must be numbers'); });
        if (v.length < 3) throw new Error('Give at least 3 values');
        if (v.length > 16) throw new Error('Use at most 16 values');
        v.sort(function (a, b) { return b - a; });
        var n = v.length, base = Math.floor(n / k), extra = n % k, sizes = [];
        for (var b = 0; b < k; b++) sizes.push(base + (b < extra ? 1 : 0));
        var cols = ['value', 'NTILE(' + k + ')', 'RANK', 'PERCENT_RANK', 'CUME_DIST'];
        var rows = v.map(function (x) { return [x, '·', '·', '·', '·']; });
        var frames = [{ narr: 'N = ' + n + ' rows, k = ' + k + ' buckets. ⌊' + n + '/' + k + '⌋ = ' + base + ' rows each, and the first ' + extra + ' bucket(s) get one extra (' + n + ' mod ' + k + ' = ' + extra + '). Bucket sizes: <b>' + sizes.join(', ') + '</b>.', parts: [{ type: 'table', label: 'ORDER BY value DESC', columns: cols, rows: copyRows(rows) }, { type: 'bars', label: 'bucket sizes', values: sizes.slice(), idxLabels: sizes.map(function (s, q) { return 'b' + (q + 1); }) }] }];
        var pos = 0, bucketOf = [];
        for (var q = 0; q < k; q++) {
          if (!sizes[q]) continue;
          for (var t = pos; t < pos + sizes[q]; t++) { rows[t][1] = q + 1; bucketOf[t] = q + 1; }
          var hl = span(0, pos - 1, 'done'); span(pos, pos + sizes[q] - 1, 'win', hl);
          var split = '';
          if (pos > 0 && v[pos] === v[pos - 1]) { hl[pos - 1] = 'bad'; hl[pos] = 'bad'; split = ' <span class="c-r">Tie split!</span> Value ' + v[pos] + ' appears in bucket ' + q + ' and bucket ' + (q + 1) + ' — NTILE only counts rows.'; }
          frames.push({ narr: 'Bucket <b>' + (q + 1) + '</b> takes the next ' + sizes[q] + ' row(s) (blue).' + split, parts: [{ type: 'table', label: 'NTILE filling', columns: cols, rows: copyRows(rows), hl: hl }, { type: 'bars', label: 'bucket sizes', values: sizes.slice(), hl: (function () { var h = {}; h[q] = 'cur'; return h; })(), idxLabels: sizes.map(function (s, z) { return 'b' + (z + 1); }) }] });
          pos += sizes[q];
        }
        for (var i = 0; i < n; i++) {
          var rank = i; while (rank > 0 && v[rank - 1] === v[i]) rank--; rank += 1;
          var lastPeer = i; while (lastPeer + 1 < n && v[lastPeer + 1] === v[i]) lastPeer++;
          rows[i][2] = rank;
          rows[i][3] = n > 1 ? (Math.round(1000 * (rank - 1) / (n - 1)) / 1000).toString() : '0';
          rows[i][4] = (Math.round(1000 * (lastPeer + 1) / n) / 1000).toString();
        }
        frames.push({ narr: '<b>PERCENT_RANK</b> = (RANK − 1) / (N − 1) = share of other rows strictly ahead of me. <b>CUME_DIST</b> = (rows ahead of me + my peers + me) / N. Both are filled for every row; ties get identical values.', parts: [{ type: 'table', label: 'all columns', columns: cols, rows: copyRows(rows), hl: span(0, n - 1, 'ok') }] });
        var hlT = {}, cnt = 0;
        rows.forEach(function (r, z) { if (Number(r[4]) <= 0.25) { hlT[z] = 'sel'; cnt++; } });
        frames.push({ narr: '"Top 25% by value" using <code>CUME_DIST() &lt;= 0.25</code> keeps <b>' + cnt + '</b> row(s) (purple) — whole tie groups only. Compare with <code>NTILE(4) = 1</code>, which keeps exactly ' + sizes[0] + ' rows and may cut a tie in half.', parts: [{ type: 'table', label: 'CUME_DIST ≤ 0.25', columns: cols, rows: copyRows(rows), hl: hlT }] });
        return frames;
      }
    },
    examples: [
      { title: 'Salary quartiles per department', html: `<p>Add PARTITION BY to bucket within each department. HR has 3 people and NTILE(4) → buckets 1, 2, 3 — ${H.c('y', 'bucket 4 is empty')} because there are fewer rows than buckets.</p>`,
        code: { lang: 'sql', db: 'hr', code: `SELECT dept, name, salary,
       NTILE(4) OVER (PARTITION BY dept ORDER BY salary DESC, id) AS dept_quartile
FROM employees
ORDER BY dept, salary DESC, id;` } },
      { title: 'Top 25% of earners, ties respected', html: `<p><code>CUME_DIST() &lt;= 0.25</code> keeps Asha, Ben and Chen (cume 0.154, 0.154, 0.231). Dev's cume_dist is 0.385, so the tie group 95000 is ${H.c('g', 'kept together')} (excluded as a whole). <code>NTILE(4) = 1</code> instead returns 4 rows including Dev but not Eli — unfair to Eli.</p>`,
        code: { lang: 'sql', db: 'hr', code: `WITH p AS (
  SELECT name, salary,
         CUME_DIST() OVER (ORDER BY salary DESC) AS cd,
         NTILE(4)    OVER (ORDER BY salary DESC, id) AS q
  FROM employees
)
SELECT name, salary, ROUND(cd, 3) AS cume_dist, q AS ntile_quartile
FROM p
WHERE cd <= 0.25 OR q = 1
ORDER BY salary DESC, name;` } },
      { title: 'Even batches for parallel processing', html: `<p>Split 10 orders into ${H.c('b', '3 batches')} of sizes 4, 3, 3 to hand to 3 workers. Ordering by id makes the assignment repeatable; in production you might order by a hash of the key to spread hot customers.</p>`,
        code: { lang: 'sql', db: 'shop', code: `SELECT NTILE(3) OVER (ORDER BY id) AS batch,
       id, customer, amount
FROM orders
ORDER BY batch, id;` } },
      { title: 'Old school: percentile with a correlated COUNT', html: `<p>CUME_DIST by hand: count rows with salary ≥ mine (ordering DESC) and divide by the total. Two subqueries per row → O(N²) without an index. The window version gets it from one sort.</p>`,
        code: { lang: 'sql', db: 'hr', code: `SELECT e.name, e.salary,
       ROUND(1.0 * (SELECT COUNT(*) FROM employees e2 WHERE e2.salary >= e.salary)
             / (SELECT COUNT(*) FROM employees), 3) AS cume_dist_manual
FROM employees e
ORDER BY e.salary DESC, e.id;` } }
    ],
    deepDive: `<p><b>Exact definitions (SQL standard, followed by SQLite and PostgreSQL).</b> NTILE(k): rows numbered 1..N in order; the first N mod k buckets have ⌈N/k⌉ rows, the rest ⌊N/k⌋. PERCENT_RANK = (RANK − 1)/(N − 1), defined as 0 when N = 1. CUME_DIST = (number of rows preceding or peer with the current row)/N. All three ignore the frame clause. NTILE's argument must be a positive integer (SQLite errors on 0).</p>
<p><b>NTILE vs percentile buckets.</b> NTILE guarantees equal <i>counts</i>; percentile cut-offs guarantee equal <i>value semantics</i>. For skewed data (many zeros) NTILE puts identical zeros in several buckets — misleading in a "customer value tier" report. A CASE on CUME_DIST (<code>CASE WHEN cd &lt;= 0.25 THEN 1 ...</code>) keeps ties together but bucket sizes become unequal.</p>
<p><b>Medians and percentiles in practice.</b> PostgreSQL, Oracle, SQL Server and Snowflake have ordered-set aggregates <code>PERCENTILE_CONT</code> (interpolated) and <code>PERCENTILE_DISC</code> (an actual value). Warehouses add approximate versions (<code>APPROX_PERCENTILE</code>, t-digest / KLL sketches) because exact percentiles need a full sort per group — O(N log N) and not mergeable across shards, whereas sketches are mergeable and use O(1/ε) memory. In SQLite the portable median is: ROW_NUMBER and COUNT over the partition, keep rows where rn is in {(c+1)/2, (c+2)/2}, then AVG.</p>`,
    aiEra: `<p><b>What AI changes:</b> Ask for "customer deciles" and an assistant will produce NTILE(10) instantly. Your value is asking: are ties allowed to split? Should empty-handed customers (0 spend) be excluded first? Is an approximate percentile acceptable at warehouse scale?</p>
<p><b>Use AI as a partner:</b> <code>"Show NTILE(4) and a CUME_DIST-based quartile side by side on data with many ties, and explain the difference."</code> Ask it to translate a PostgreSQL PERCENTILE_CONT median into SQLite.</p>
<p><b>Where AI goes wrong:</b> using PERCENTILE_CONT in SQLite/MySQL; confusing PERCENT_RANK (starts at 0) with CUME_DIST (never 0); calling NTILE(100) a "percentile" on small tables.</p>
<p><b>What you must still own:</b> the formulas (so you can sanity-check numbers by hand) and the business rule for ties.</p>`
  });

  /* =====================================================================
     PRACTICE — Easy
     ===================================================================== */
  practice.push({
    title: 'Each Order\'s Share of Customer and Overall Spend',
    level: 'Easy', tags: ['window', 'sum over', 'percent of total'], companies: ['Shopify', 'Flipkart', 'Amazon'],
    statement: `<p>Table <code>orders(id, customer, order_date, amount)</code>. For every order return <code>id, customer, amount, pct_of_customer, pct_of_all</code>: the order's amount as a percentage of that customer's total spend and of all spend, each rounded to 1 decimal. Order by customer, id.</p>`,
    constraints: `Up to 10<sup>6</sup> orders. Amounts are positive integers (watch integer division).`,
    example: `${H.table(['id', 'customer', 'amount', 'pct_of_customer', 'pct_of_all'], [['1', 'asha', '50', '<span class="c-g">43.5</span> (50 / 115)', '11.6 (50 / 430)'], ['9', 'dan', '90', '<span class="c-g">100.0</span>', '20.9']])}<p>asha spent 115 in total, so her 50 order is 43.5% of her spend. All orders total 430. dan has one order → 100% of his spend.</p>`,
    brute: {
      why: `<p>Compute the customer total with a correlated subquery per row (and another for the grand total). Each row triggers a scan of that customer's orders → O(N × orders per customer), and the grand-total subquery may be re-evaluated per row in naive engines.</p>`,
      code: { lang: 'sql', db: 'shop', code: `SELECT o.id, o.customer, o.amount,
       ROUND(100.0 * o.amount / (SELECT SUM(o2.amount) FROM orders o2 WHERE o2.customer = o.customer), 1) AS pct_of_customer,
       ROUND(100.0 * o.amount / (SELECT SUM(amount) FROM orders), 1) AS pct_of_all
FROM orders o
ORDER BY o.customer, o.id;` }
    },
    mcq: { q: 'Which expression gives the grand total on every row?', options: ['SUM(amount) OVER (PARTITION BY customer)', 'SUM(amount) OVER ()', 'SUM(amount) OVER (ORDER BY id)', 'SUM(amount) GROUP BY ALL'], answer: 1, explain: 'Empty OVER () makes the whole result one window, so every row sees the grand total. With ORDER BY you would get a running total instead.' },
    hints: [
      `<p>You need two different totals on every row without collapsing rows — that is two window aggregates.</p>`,
      `<p>Customer total = SUM(amount) OVER (PARTITION BY customer). Grand total = SUM(amount) OVER (). No ORDER BY inside, or it becomes a running sum.</p>`,
      `<p>Multiply by 100.0 before dividing so SQLite does not do integer division, then ROUND(..., 1). Recipe: 100.0 * amount / SUM(amount) OVER (...).</p>`
    ],
    tests: { cmp: 'exact', engine: 'both', cases: [
        { cols: ['id', 'customer', 'amount', 'pct_of_customer', 'pct_of_all'], rows: [[1, 'asha', 50, 43.5, 11.6], [3, 'asha', 20, 17.4, 4.7], [6, 'asha', 10, 8.7, 2.3], [10, 'asha', 35, 30.4, 8.1], [2, 'ben', 30, 31.6, 7], [5, 'ben', 40, 42.1, 9.3], [8, 'ben', 25, 26.3, 5.8], [4, 'cara', 70, 53.8, 16.3], [7, 'cara', 60, 46.2, 14], [9, 'dan', 90, 100, 20.9]] },
        { setup: 'DELETE FROM orders; ', rows: [] },
        { setup: 'DELETE FROM orders; INSERT INTO orders VALUES (1, \'x\', \'2024-01-01\', 7);', cols: ['id', 'customer', 'amount', 'pct_of_customer', 'pct_of_all'], rows: [[1, 'x', 7, 100, 100]] },
        { setup: 'DELETE FROM orders; INSERT INTO orders VALUES (1, \'x\', \'d\', 1), (2, \'x\', \'d\', 1), (3, \'x\', \'d\', 1), (4, \'y\', \'d\', 1);', cols: ['id', 'customer', 'amount', 'pct_of_customer', 'pct_of_all'], rows: [[1, 'x', 1, 33.3, 25], [2, 'x', 1, 33.3, 25], [3, 'x', 1, 33.3, 25], [4, 'y', 1, 100, 25]] },
        { setup: 'DELETE FROM orders; INSERT INTO orders VALUES (5, \'b\', \'d\', 3), (2, \'a\', \'d\', 1), (9, \'a\', \'d\', 2), (1, \'c\', \'d\', 1000), (4, \'b\', \'d\', 6);', cols: ['id', 'customer', 'amount', 'pct_of_customer', 'pct_of_all'], rows: [[2, 'a', 1, 33.3, 0.1], [9, 'a', 2, 66.7, 0.2], [4, 'b', 6, 66.7, 0.6], [5, 'b', 3, 33.3, 0.3], [1, 'c', 1000, 100, 98.8]] },
        { setup: 'DELETE FROM orders; INSERT INTO orders VALUES (1, \'Ann\', \'d\', 10), (2, \'ann\', \'d\', 30), (3, \'Ann\', \'d\', 60);', cols: ['id', 'customer', 'amount', 'pct_of_customer', 'pct_of_all'], rows: [[1, 'Ann', 10, 14.3, 10], [3, 'Ann', 60, 85.7, 60], [2, 'ann', 30, 100, 30]] }
      ] },
    solution: {
      approach: `<p>Two unframed window sums: one partitioned by customer and one over the whole result. Each is computed once per partition by the engine and stamped on every row; the division is plain arithmetic.</p>`,
      code: { lang: 'sql', db: 'shop', code: `SELECT id, customer, amount,
       ROUND(100.0 * amount / SUM(amount) OVER (PARTITION BY customer), 1) AS pct_of_customer,
       ROUND(100.0 * amount / SUM(amount) OVER (), 1)                      AS pct_of_all
FROM orders
ORDER BY customer, id;` },
      complexity: `<p>One sort by customer + O(N) pass. The OVER () total is computed once.</p>`,
      followUps: ['Show only orders that are more than 40% of the customer\'s spend.', 'Do the same per customer per month.']
    }
  });

  practice.push({
    title: 'Rank Scores (Dense Ranking)',
    level: 'Easy', tags: ['window', 'dense_rank'], companies: ['Amazon', 'Adobe', 'Yahoo'],
    statement: `<p>Table <code>scores(id, player, score)</code>. Return every <code>score</code> with its <code>rank</code> from highest to lowest. Equal scores share a rank and the next rank is the next consecutive integer (no gaps). Order by score descending.</p>`,
    constraints: `Up to 10<sup>5</sup> rows; scores are decimals and may repeat.`,
    example: `${H.table(['score', 'rank'], [['4.00', '1'], ['4.00', '1'], ['3.85', '<span class="c-g">2</span>'], ['3.65', '3'], ['3.65', '3'], ['3.50', '4']])}<p>Two 4.00s share rank 1; 3.85 gets <b>2</b> (not 3) because there must be no gaps.</p>`,
    brute: {
      why: `<p>Rank = number of distinct scores greater than or equal to mine. A correlated COUNT(DISTINCT) per row scans the table each time: O(N²). Correct and a good answer for "without window functions".</p>`,
      code: { lang: 'sql', db: 'metrics', code: `SELECT s.score,
       (SELECT COUNT(DISTINCT s2.score) FROM scores s2 WHERE s2.score >= s.score) AS "rank"
FROM scores s
ORDER BY s.score DESC;` }
    },
    mcq: { q: 'Expected ranks are 1, 1, 2, 3, 3, 4. Which function?', options: ['ROW_NUMBER', 'RANK', 'DENSE_RANK', 'NTILE(4)'], answer: 2, explain: 'Ties share and no gaps → DENSE_RANK. RANK would give 1, 1, 3, 4, 4, 6.' },
    hints: [
      `<p>"No gaps after ties" is the signature of one specific ranking function.</p>`,
      `<p>DENSE_RANK() OVER (ORDER BY score DESC). No PARTITION BY — the whole table is one leaderboard.</p>`,
      `<p><code>rank</code> is a keyword-like name in some engines; quote it or alias as <code>"rank"</code>. Remember the outer ORDER BY score DESC.</p>`
    ],
    tests: { cmp: 'exact', engine: 'both', cases: [
        { cols: ['score', 'rank'], rows: [[4, 1], [4, 1], [3.85, 2], [3.65, 3], [3.65, 3], [3.5, 4]] },
        { setup: 'DELETE FROM scores; ', rows: [] },
        { setup: 'DELETE FROM scores; INSERT INTO scores VALUES (1, \'a\', 2.5);', cols: ['score', 'rank'], rows: [[2.5, 1]] },
        { setup: 'DELETE FROM scores; INSERT INTO scores VALUES (1, \'a\', 1), (2, \'b\', 1), (3, \'c\', 1);', cols: ['score', 'rank'], rows: [[1, 1], [1, 1], [1, 1]] },
        { setup: 'DELETE FROM scores; INSERT INTO scores VALUES (1, \'a\', -1.5), (2, \'b\', 0), (3, \'c\', -1.5), (4, \'d\', 2), (5, \'e\', 0.25);', cols: ['score', 'rank'], rows: [[2, 1], [0.25, 2], [0, 3], [-1.5, 4], [-1.5, 4]] },
        { setup: 'DELETE FROM scores; INSERT INTO scores VALUES (1, \'a\', 1), (2, \'b\', 2), (3, \'c\', 3), (4, \'d\', 4), (5, \'e\', 5);', cols: ['score', 'rank'], rows: [[5, 1], [4, 2], [3, 3], [2, 4], [1, 5]] },
        { setup: 'DELETE FROM scores; INSERT INTO scores VALUES (1, \'a\', 5), (2, \'b\', 4), (3, \'c\', 3), (4, \'d\', 2), (5, \'e\', 1), (6, \'f\', 5), (7, \'g\', 1);', cols: ['score', 'rank'], rows: [[5, 1], [5, 1], [4, 2], [3, 3], [2, 4], [1, 5], [1, 5]] }
      ] },
    solution: {
      approach: `<p>A single DENSE_RANK window ordered by score descending; the outer ORDER BY presents the leaderboard.</p>`,
      code: { lang: 'sql', db: 'metrics', code: `SELECT score,
       DENSE_RANK() OVER (ORDER BY score DESC) AS "rank"
FROM scores
ORDER BY score DESC;` },
      complexity: `<p>O(N log N) sort + O(N). The correlated version is O(N²).</p>`,
      followUps: ['Return player names too and break display ties alphabetically.', 'Return only players in the top 2 distinct scores.']
    }
  });

  practice.push({
    title: 'Rising Temperature (Previous Calendar Day)',
    level: 'Easy', tags: ['window', 'lag', 'dates'], companies: ['Microsoft', 'Apple', 'Adobe'],
    statement: `<p>Table <code>weather(day, temp)</code>, one row per day but some days are missing. Return <code>day, temp, prev_temp</code> for every day that was <b>warmer than the previous calendar day</b> (yesterday must exist in the table). Order by day.</p>`,
    constraints: `Up to 10<sup>5</sup> days. Days are ISO 'YYYY-MM-DD' strings.`,
    example: `${H.table(['day', 'temp', 'yesterday?', 'output?'], [['01-02', '25', '01-01: 10', '<span class="c-g">yes</span>'], ['01-04', '30', '01-03: 20', '<span class="c-g">yes</span>'], ['01-06', '35', '<span class="c-r">01-05 missing</span>', '<span class="c-r">no</span> (previous row is 01-04)']])}<p>01-06 is warmer than the previous <i>row</i> but that row is two days earlier, so it does not count.</p>`,
    brute: {
      why: `<p>Self-join each day with the row exactly one day earlier. It is actually correct for gaps (the join simply finds no partner) and with an index on day it is fine — but it needs date arithmetic in the join condition, which often prevents index use, making it O(N²).</p>`,
      code: { lang: 'sql', db: 'metrics', code: `SELECT w.day, w.temp, y.temp AS prev_temp
FROM weather w
JOIN weather y ON julianday(w.day) - julianday(y.day) = 1   -- y is exactly yesterday
WHERE w.temp > y.temp
ORDER BY w.day;` }
    },
    mcq: { q: 'A pure LAG(temp) solution returns 01-06 as well. Why is that wrong?', options: ['LAG skips NULLs', 'LAG returns the previous row, which is 01-04 because 01-05 is missing', 'LAG needs PARTITION BY', 'LAG sorts descending'], answer: 1, explain: 'LAG is positional. With a gap, the previous row is not yesterday, so you must also check the date difference.' },
    hints: [
      `<p>LAG(temp) gives the previous row's temperature; LAG(day) gives the previous row's date. You need both.</p>`,
      `<p>Compute them in a CTE ordered by day, then filter outside (window functions are not allowed in WHERE).</p>`,
      `<p>Keep rows where temp &gt; prev_temp AND julianday(day) − julianday(prev_day) = 1. The first row has NULLs and drops out automatically.</p>`
    ],
    tests: { cmp: 'exact', engine: 'sqlite', cases: [
        { cols: ['day', 'temp', 'prev_temp'], rows: [['2024-01-02', 25, 10], ['2024-01-04', 30, 20]] },
        { setup: 'DELETE FROM weather; ', rows: [] },
        { setup: 'DELETE FROM weather; INSERT INTO weather VALUES (\'2024-01-01\', 5);', rows: [] },
        { setup: 'DELETE FROM weather; INSERT INTO weather VALUES (\'2024-01-01\', 5), (\'2024-01-02\', 5), (\'2024-01-03\', 4), (\'2024-01-04\', 6);', cols: ['day', 'temp', 'prev_temp'], rows: [['2024-01-04', 6, 4]] },
        { setup: 'DELETE FROM weather; INSERT INTO weather VALUES (\'2024-02-28\', -5), (\'2024-02-29\', -3), (\'2024-03-01\', -4), (\'2024-03-02\', 0), (\'2024-03-04\', 9);', cols: ['day', 'temp', 'prev_temp'], rows: [['2024-02-29', -3, -5], ['2024-03-02', 0, -4]] },
        { setup: 'DELETE FROM weather; INSERT INTO weather VALUES (\'2023-12-31\', -10), (\'2024-01-01\', -9), (\'2024-01-03\', 50), (\'2024-01-04\', 51);', cols: ['day', 'temp', 'prev_temp'], rows: [['2024-01-01', -9, -10], ['2024-01-04', 51, 50]] },
        { setup: 'DELETE FROM weather; INSERT INTO weather VALUES (\'2024-01-05\', 9), (\'2024-01-04\', 3), (\'2024-01-03\', 1), (\'2024-01-06\', 20);', cols: ['day', 'temp', 'prev_temp'], rows: [['2024-01-04', 3, 1], ['2024-01-05', 9, 3], ['2024-01-06', 20, 9]] }
      ] },
    solution: {
      approach: `<p>One ordered window provides both the previous temperature and the previous date. The outer filter requires the previous row to be exactly one day earlier and colder.</p>`,
      code: { lang: 'sql', db: 'metrics', code: `WITH t AS (
  SELECT day, temp,
         LAG(day)  OVER (ORDER BY day) AS prev_day,
         LAG(temp) OVER (ORDER BY day) AS prev_temp
  FROM weather
)
SELECT day, temp, prev_temp
FROM t
WHERE temp > prev_temp
  AND julianday(day) - julianday(prev_day) = 1
ORDER BY day;` },
      complexity: `<p>O(N log N) sort (free if day is the primary key) + O(N).</p>`,
      followUps: ['Return days warmer than the average of the previous 3 calendar days.', 'Find the longest run of consecutive warming days.']
    }
  });

  practice.push({
    title: 'Each Customer\'s First Order',
    level: 'Easy', tags: ['window', 'row_number', 'greatest-n-per-group'], companies: ['Swiggy', 'Uber Eats', 'Etsy'],
    statement: `<p>Table <code>orders(id, customer, order_date, amount)</code>. Return one row per customer with their <b>first</b> order: <code>customer, first_order_id, order_date, amount</code>. If two orders share the first date, the lower id is first. Order by customer.</p>`,
    constraints: `Up to 10<sup>7</sup> orders; up to 10<sup>6</sup> customers.`,
    example: `${H.table(['customer', 'first_order_id', 'order_date', 'amount'], [['asha', '1', '2024-01-01', '50'], ['ben', '2', '2024-01-01', '30'], ['cara', '4', '2024-01-03', '70'], ['dan', '9', '2024-01-08', '90']])}<p>Exactly one row per customer — even if ties existed, the id tiebreaker picks one.</p>`,
    brute: {
      why: `<p>Anti-join: keep an order if no earlier order of the same customer exists. Each row probes the customer's other orders → O(N × orders per customer) without an index; the tie rule makes the condition verbose and error-prone.</p>`,
      code: { lang: 'sql', db: 'shop', code: `SELECT o.customer, o.id AS first_order_id, o.order_date, o.amount
FROM orders o
WHERE NOT EXISTS (
  SELECT 1 FROM orders e
  WHERE e.customer = o.customer
    AND (e.order_date < o.order_date OR (e.order_date = o.order_date AND e.id < o.id))
)
ORDER BY o.customer;` }
    },
    mcq: { q: 'Why ROW_NUMBER rather than RANK for "the first order"?', options: ['RANK is slower', 'RANK could return two rows for one customer if two orders tie on the first date', 'ROW_NUMBER sorts faster', 'RANK cannot take PARTITION BY'], answer: 1, explain: 'The question wants exactly one row per customer. RANK = 1 keeps all tied orders; ROW_NUMBER with a tiebreaker keeps exactly one.' },
    hints: [
      `<p>"One row per group, the earliest" = greatest-n-per-group with N = 1.</p>`,
      `<p>ROW_NUMBER() OVER (PARTITION BY customer ORDER BY order_date, id) in a CTE.</p>`,
      `<p>Filter rn = 1 outside. The id in the ORDER BY handles the tie rule exactly as stated.</p>`
    ],
    tests: { cmp: 'exact', engine: 'both', cases: [
        { cols: ['customer', 'first_order_id', 'order_date', 'amount'], rows: [['asha', 1, '2024-01-01', 50], ['ben', 2, '2024-01-01', 30], ['cara', 4, '2024-01-03', 70], ['dan', 9, '2024-01-08', 90]] },
        { setup: 'DELETE FROM orders; ', rows: [] },
        { setup: 'DELETE FROM orders; INSERT INTO orders VALUES (4, \'x\', \'2024-02-01\', 9);', cols: ['customer', 'first_order_id', 'order_date', 'amount'], rows: [['x', 4, '2024-02-01', 9]] },
        { setup: 'DELETE FROM orders; INSERT INTO orders VALUES (7, \'x\', \'2024-02-01\', 1), (3, \'x\', \'2024-02-01\', 2), (5, \'x\', \'2024-02-01\', 3), (2, \'y\', \'2024-02-01\', 4), (1, \'y\', \'2024-02-02\', 5);', cols: ['customer', 'first_order_id', 'order_date', 'amount'], rows: [['x', 3, '2024-02-01', 2], ['y', 2, '2024-02-01', 4]] },
        { setup: 'DELETE FROM orders; INSERT INTO orders VALUES (1, \'x\', \'2024-05-01\', 10), (2, \'x\', \'2024-03-01\', 20), (3, \'y\', \'2024-04-01\', 30), (4, \'y\', \'2024-04-01\', 40), (5, \'z\', \'2023-12-31\', 50), (6, \'z\', \'2024-01-01\', 60);', cols: ['customer', 'first_order_id', 'order_date', 'amount'], rows: [['x', 2, '2024-03-01', 20], ['y', 3, '2024-04-01', 30], ['z', 5, '2023-12-31', 50]] },
        { setup: 'DELETE FROM orders; INSERT INTO orders VALUES (1, \'a\', \'d\', 0), (2, \'a\', \'d\', 0);', cols: ['customer', 'first_order_id', 'order_date', 'amount'], rows: [['a', 1, 'd', 0]] },
        { setup: 'DELETE FROM orders; INSERT INTO orders VALUES (10, \'Ann\', \'2024-01-02\', 1), (11, \'ann\', \'2024-01-01\', 2), (12, \'Ann\', \'2024-01-01\', 3);', cols: ['customer', 'first_order_id', 'order_date', 'amount'], rows: [['Ann', 12, '2024-01-01', 3], ['ann', 11, '2024-01-01', 2]] }
      ] },
    solution: {
      approach: `<p>Number each customer's orders chronologically with a deterministic tiebreaker and keep number 1.</p>`,
      code: { lang: 'sql', db: 'shop', code: `WITH r AS (
  SELECT customer, id, order_date, amount,
         ROW_NUMBER() OVER (PARTITION BY customer ORDER BY order_date, id) AS rn
  FROM orders
)
SELECT customer, id AS first_order_id, order_date, amount
FROM r
WHERE rn = 1
ORDER BY customer;` },
      complexity: `<p>O(N log N) sort (or index scan on (customer, order_date, id)) + O(N).</p>`,
      followUps: ['Return each customer\'s first AND second order date in one row.', 'Compute how many days passed between first and second order.']
    }
  });

  /* =====================================================================
     PRACTICE — Medium
     ===================================================================== */
  practice.push({
    title: 'Second Highest Salary in Every Department',
    level: 'Medium', tags: ['window', 'dense_rank', 'nth highest'], companies: ['Amazon', 'Goldman Sachs', 'Infosys'],
    statement: `<p>Table <code>employees(id, name, dept, salary, hire_date)</code>. For each department return the employee(s) earning the <b>second highest distinct salary</b>: <code>dept, name, salary</code>. Departments with only one distinct salary return nothing. Order by dept, name.</p>`,
    constraints: `Up to 10<sup>6</sup> employees. Ties are common.`,
    example: `${H.table(['dept', 'name', 'salary'], [['Engineering', 'Chen', '110000'], ['HR', 'Leo', '60000'], ['HR', 'Mia', '60000'], ['Sales', 'Hal', '85000'], ['Sales', 'Ivy', '85000']])}<p>Engineering's top salary 120000 is shared by two people, so the second <i>distinct</i> salary is 110000 (Chen). With RANK, Chen would be rank 3 and nobody would be rank 2.</p>`,
    brute: {
      why: `<p>"Max salary below the department max" with nested correlated subqueries: for each employee compute the department max, then the max below it, then compare. Two nested scans per row → O(N²/D) and it does not generalise to the 3rd or Nth salary.</p>`,
      code: { lang: 'sql', db: 'hr', code: `SELECT e.dept, e.name, e.salary
FROM employees e
WHERE e.salary = (
  SELECT MAX(x.salary) FROM employees x
  WHERE x.dept = e.dept
    AND x.salary < (SELECT MAX(y.salary) FROM employees y WHERE y.dept = e.dept)
)
ORDER BY e.dept, e.name;` }
    },
    mcq: { q: 'Which filter is correct for "second highest distinct salary"?', options: ['ROW_NUMBER() = 2', 'RANK() = 2', 'DENSE_RANK() = 2', 'NTILE(2) = 2'], answer: 2, explain: 'DENSE_RANK counts distinct values, so = 2 is exactly the second distinct salary, and all employees sharing it are returned.' },
    hints: [
      `<p>"Second highest <b>distinct</b>" — ties at the top must not use up position 2.</p>`,
      `<p>DENSE_RANK() OVER (PARTITION BY dept ORDER BY salary DESC) in a CTE.</p>`,
      `<p>Filter dr = 2 outside. Departments with a single distinct salary have no dr = 2 rows and naturally disappear.</p>`
    ],
    tests: { cmp: 'exact', engine: 'both', cases: [
        { cols: ['dept', 'name', 'salary'], rows: [['Engineering', 'Chen', 110000], ['HR', 'Leo', 60000], ['HR', 'Mia', 60000], ['Sales', 'Hal', 85000], ['Sales', 'Ivy', 85000]] },
        { setup: 'DELETE FROM salary_history; DELETE FROM employees; ', rows: [] },
        { setup: 'DELETE FROM salary_history; DELETE FROM employees; INSERT INTO employees VALUES (1, \'A\', \'X\', 10, \'d\');', rows: [] },
        { setup: 'DELETE FROM salary_history; DELETE FROM employees; INSERT INTO employees VALUES (1, \'A\', \'X\', 10, \'d\'), (2, \'B\', \'X\', 10, \'d\');', rows: [] },
        { setup: 'DELETE FROM salary_history; DELETE FROM employees; INSERT INTO employees VALUES (1, \'A\', \'X\', 30, \'d\'), (2, \'B\', \'X\', 20, \'d\'), (3, \'C\', \'X\', 20, \'d\'), (4, \'D\', \'X\', 10, \'d\'), (5, \'E\', \'Y\', 9, \'d\'), (6, \'F\', \'Y\', 8, \'d\'), (7, \'G\', \'Z\', 5, \'d\'), (8, \'H\', \'Z\', 5, \'d\');', cols: ['dept', 'name', 'salary'], rows: [['X', 'B', 20], ['X', 'C', 20], ['Y', 'F', 8]] },
        { setup: 'DELETE FROM salary_history; DELETE FROM employees; INSERT INTO employees VALUES (1, \'E001\', \'D\', 40, \'2020-01-01\'), (2, \'E002\', \'C\', 20, \'2020-01-01\'), (3, \'E003\', \'D\', 50, \'2020-01-01\'), (4, \'E004\', \'A\', 50, \'2020-01-01\'), (5, \'E005\', \'D\', 30, \'2020-01-01\'), (6, \'E006\', \'D\', 40, \'2020-01-01\'), (7, \'E007\', \'B\', 30, \'2020-01-01\'), (8, \'E008\', \'B\', 40, \'2020-01-01\'), (9, \'E009\', \'E\', 20, \'2020-01-01\'), (10, \'E010\', \'C\', 50, \'2020-01-01\'), (11, \'E011\', \'C\', 30, \'2020-01-01\'), (12, \'E012\', \'B\', 50, \'2020-01-01\'), (13, \'E013\', \'B\', 20, \'2020-01-01\'), (14, \'E014\', \'B\', 20, \'2020-01-01\'), (15, \'E015\', \'B\', 50, \'2020-01-01\'), (16, \'E016\', \'A\', 30, \'2020-01-01\'), (17, \'E017\', \'C\', 30, \'2020-01-01\'), (18, \'E018\', \'B\', 20, \'2020-01-01\'), (19, \'E019\', \'C\', 20, \'2020-01-01\'), (20, \'E020\', \'E\', 40, \'2020-01-01\'), (21, \'E021\', \'C\', 40, \'2020-01-01\'), (22, \'E022\', \'D\', 30, \'2020-01-01\'), (23, \'E023\', \'E\', 50, \'2020-01-01\'), (24, \'E024\', \'A\', 50, \'2020-01-01\'), (25, \'E025\', \'D\', 30, \'2020-01-01\'), (26, \'E026\', \'E\', 20, \'2020-01-01\'), (27, \'E027\', \'A\', 30, \'2020-01-01\'), (28, \'E028\', \'D\', 20, \'2020-01-01\'), (29, \'E029\', \'B\', 20, \'2020-01-01\'), (30, \'E030\', \'A\', 50, \'2020-01-01\'), (31, \'E031\', \'A\', 30, \'2020-01-01\'), (32, \'E032\', \'B\', 20, \'2020-01-01\'), (33, \'E033\', \'B\', 40, \'2020-01-01\'), (34, \'E034\', \'D\', 40, \'2020-01-01\'), (35, \'E035\', \'E\', 40, \'2020-01-01\'), (36, \'E036\', \'D\', 10, \'2020-01-01\'), (37, \'E037\', \'D\', 10, \'2020-01-01\'), (38, \'E038\', \'A\', 20, \'2020-01-01\'), (39, \'E039\', \'B\', 20, \'2020-01-01\'), (40, \'E040\', \'A\', 40, \'2020-01-01\'), (41, \'E041\', \'A\', 10, \'2020-01-01\'), (42, \'E042\', \'B\', 30, \'2020-01-01\'), (43, \'E043\', \'C\', 40, \'2020-01-01\'), (44, \'E044\', \'B\', 20, \'2020-01-01\'), (45, \'E045\', \'E\', 30, \'2020-01-01\'), (46, \'E046\', \'B\', 30, \'2020-01-01\'), (47, \'E047\', \'C\', 50, \'2020-01-01\'), (48, \'E048\', \'A\', 40, \'2020-01-01\'), (49, \'E049\', \'D\', 20, \'2020-01-01\'), (50, \'E050\', \'A\', 50, \'2020-01-01\'), (51, \'E051\', \'C\', 20, \'2020-01-01\'), (52, \'E052\', \'D\', 20, \'2020-01-01\'), (53, \'E053\', \'C\', 30, \'2020-01-01\'), (54, \'E054\', \'E\', 20, \'2020-01-01\'), (55, \'E055\', \'E\', 20, \'2020-01-01\'), (56, \'E056\', \'C\', 20, \'2020-01-01\'), (57, \'E057\', \'C\', 20, \'2020-01-01\'), (58, \'E058\', \'D\', 50, \'2020-01-01\'), (59, \'E059\', \'D\', 40, \'2020-01-01\'), (60, \'E060\', \'D\', 10, \'2020-01-01\');', cols: ['dept', 'name', 'salary'], rows: [['A', 'E040', 40], ['A', 'E048', 40], ['B', 'E008', 40], ['B', 'E033', 40], ['C', 'E021', 40], ['C', 'E043', 40], ['D', 'E001', 40], ['D', 'E006', 40], ['D', 'E034', 40], ['D', 'E059', 40], ['E', 'E020', 40], ['E', 'E035', 40]] },
        { setup: 'DELETE FROM salary_history; DELETE FROM employees; INSERT INTO employees VALUES (1, \'Z\', \'X\', -5, \'d\'), (2, \'Y\', \'X\', 0, \'d\'), (3, \'W\', \'X\', 0, \'d\'), (4, \'V\', \'X\', 7, \'d\');', cols: ['dept', 'name', 'salary'], rows: [['X', 'W', 0], ['X', 'Y', 0]] }
      ] },
    solution: {
      approach: `<p>Dense-rank salaries inside each department, then keep rank 2. This generalises to any N by changing one number.</p>`,
      code: { lang: 'sql', db: 'hr', code: `WITH r AS (
  SELECT dept, name, salary,
         DENSE_RANK() OVER (PARTITION BY dept ORDER BY salary DESC) AS dr
  FROM employees
)
SELECT dept, name, salary
FROM r
WHERE dr = 2
ORDER BY dept, name;` },
      complexity: `<p>O(N log N) + O(N). The nested-subquery version is O(N²/D).</p>`,
      followUps: ['Return NULL for departments that have no second salary (LEFT JOIN from a departments list).', 'Generalise to the Nth highest with N as a parameter.']
    }
  });

  practice.push({
    title: 'Numbers Appearing Three Times in a Row',
    level: 'Medium', tags: ['window', 'lag', 'lead', 'consecutive'], companies: ['Meta', 'Amazon', 'Uber'],
    statement: `<p>Table <code>logs(id, num)</code>; ids are consecutive integers in insertion order. Find all distinct numbers that appear <b>at least three times consecutively</b>. Return <code>consecutive_num</code> ordered ascending.</p>`,
    constraints: `Up to 10<sup>6</sup> rows.`,
    example: `${H.arr([1, 1, 1, 2, 1, 2, 2, 2, 3, 3], { label: 'num by id', hl: { 0: 'g', 1: 'g', 2: 'g', 5: 'b', 6: 'b', 7: 'b' } })}<p>1 appears at ids 1–3 and 2 appears at ids 6–8 → output <b>1, 2</b>. 3 appears only twice in a row.</p>`,
    brute: {
      why: `<p>Triple self-join on id, id+1, id+2. It works only because ids are gap-free — one deleted row breaks it silently — and it builds joins over three copies of the table.</p>`,
      code: { lang: 'sql', db: 'metrics', code: `SELECT DISTINCT a.num AS consecutive_num
FROM logs a
JOIN logs b ON b.id = a.id + 1 AND b.num = a.num
JOIN logs c ON c.id = a.id + 2 AND c.num = a.num
ORDER BY a.num;` }
    },
    mcq: { q: 'Why is LAG/LEAD more robust than joining on id + 1?', options: ['It is shorter', 'It uses row order, so gaps in id values do not break it', 'It handles NULLs differently', 'It avoids DISTINCT'], answer: 1, explain: 'LAG/LEAD look at the previous/next row in ORDER BY id, regardless of whether id values are contiguous.' },
    hints: [
      `<p>A row is the middle of a run of three if its previous and next rows have the same number.</p>`,
      `<p>Compute LAG(num) and LEAD(num) OVER (ORDER BY id) in a CTE.</p>`,
      `<p>Keep rows where num = prev AND num = next; SELECT DISTINCT num. Longer runs produce several middle rows — DISTINCT collapses them.</p>`
    ],
    tests: { cmp: 'exact', engine: 'both', cases: [
        { cols: ['consecutive_num'], rows: [[1], [2]] },
        { setup: 'DELETE FROM logs; ', rows: [] },
        { setup: 'DELETE FROM logs; INSERT INTO logs VALUES (1, 7), (2, 7);', rows: [] },
        { setup: 'DELETE FROM logs; INSERT INTO logs VALUES (1, 4), (2, 4), (3, 4);', cols: ['consecutive_num'], rows: [[4]] },
        { setup: 'DELETE FROM logs; INSERT INTO logs VALUES (1, 1), (2, 1), (3, 1), (4, 1), (5, 1), (6, 2), (7, 2), (8, 1), (9, 1), (10, 1), (11, 3), (12, 3), (13, 3), (14, 3);', cols: ['consecutive_num'], rows: [[1], [3]] },
        { setup: 'DELETE FROM logs; INSERT INTO logs VALUES (1, 1), (2, 2), (3, 1), (4, 2), (5, 1), (6, 2), (7, 3), (8, 3);', rows: [] },
        { setup: 'DELETE FROM logs; INSERT INTO logs VALUES (1, -1), (2, -1), (3, -1), (4, 0), (5, 0), (6, 0), (7, 5), (8, 5), (9, 0), (10, 0), (11, 0), (12, 0);', cols: ['consecutive_num'], rows: [[-1], [0]] },
        { setup: 'DELETE FROM logs; INSERT INTO logs VALUES (1, 9), (2, 5), (3, 5), (4, 5);', cols: ['consecutive_num'], rows: [[5]] }
      ] },
    solution: {
      approach: `<p>Look one row back and one row ahead in id order. Any row whose neighbours both match is the centre of a run of at least three.</p>`,
      code: { lang: 'sql', db: 'metrics', code: `WITH t AS (
  SELECT num,
         LAG(num)  OVER (ORDER BY id) AS prev_num,
         LEAD(num) OVER (ORDER BY id) AS next_num
  FROM logs
)
SELECT DISTINCT num AS consecutive_num
FROM t
WHERE num = prev_num AND num = next_num
ORDER BY num;` },
      complexity: `<p>O(N) after an id-ordered scan (primary key order).</p>`,
      followUps: ['Find numbers appearing at least K times in a row (use gaps-and-islands).', 'Return the start id and length of each run.']
    }
  });

  practice.push({
    title: 'Last Person to Fit on the Bus',
    level: 'Medium', tags: ['window', 'running total'], companies: ['Amazon', 'Bloomberg'],
    statement: `<p>Table <code>bus_queue(person_id, person_name, weight, turn)</code>. People board in <code>turn</code> order; the bus holds at most <b>1000 kg</b>. Return the <code>person_name</code> of the last person who can board without exceeding the limit.</p>`,
    constraints: `Up to 10<sup>5</sup> people; turn values are unique; the first person always fits.`,
    example: `${H.table(['turn', 'name', 'weight', 'running total'], [['1', 'Arun', '250', '250'], ['2', 'Chris', '350', '600'], ['3', 'Dina', '400', '<span class="c-g">1000</span>'], ['4', 'Femi', '200', '<span class="c-r">1200</span>']])}<p>Dina brings the total to exactly 1000 — allowed. Femi would exceed it. Output: <b>Dina</b>.</p>`,
    brute: {
      why: `<p>For each person, sum the weights of everyone with turn ≤ theirs via a correlated subquery: 1 + 2 + … + N = O(N²) additions.</p>`,
      code: { lang: 'sql', db: 'metrics', code: `SELECT q.person_name
FROM bus_queue q
WHERE (SELECT SUM(q2.weight) FROM bus_queue q2 WHERE q2.turn <= q.turn) <= 1000
ORDER BY q.turn DESC
LIMIT 1;` }
    },
    mcq: { q: 'Which frame is right for the running weight?', options: ['ROWS UNBOUNDED PRECEDING ordered by turn', 'RANGE BETWEEN 1 PRECEDING AND CURRENT ROW', 'The whole partition', 'ROWS BETWEEN CURRENT ROW AND UNBOUNDED FOLLOWING'], answer: 0, explain: 'Everyone up to and including the current person boards, so the frame is from the first row to the current row in turn order.' },
    hints: [
      `<p>Boarding order + "total so far" = running total ordered by turn.</p>`,
      `<p>SUM(weight) OVER (ORDER BY turn ROWS UNBOUNDED PRECEDING) in a CTE.</p>`,
      `<p>Keep rows with total ≤ 1000, take the one with the highest turn (ORDER BY turn DESC LIMIT 1).</p>`
    ],
    tests: { cmp: 'exact', engine: 'both', cases: [
        { cols: ['person_name'], rows: [['Dina']] },
        { setup: 'DELETE FROM bus_queue; INSERT INTO bus_queue VALUES (1, \'Solo\', 1000, 1);', cols: ['person_name'], rows: [['Solo']] },
        { setup: 'DELETE FROM bus_queue; INSERT INTO bus_queue VALUES (1, \'A\', 1000, 1), (2, \'B\', 1, 2);', cols: ['person_name'], rows: [['A']] },
        { setup: 'DELETE FROM bus_queue; INSERT INTO bus_queue VALUES (1, \'A\', 400, 1), (2, \'B\', 300, 2), (3, \'C\', 300, 3), (4, \'D\', 1, 4);', cols: ['person_name'], rows: [['C']] },
        { setup: 'DELETE FROM bus_queue; INSERT INTO bus_queue VALUES (1, \'A\', 100, 3), (2, \'B\', 200, 1), (3, \'C\', 300, 2), (4, \'D\', 10, 4);', cols: ['person_name'], rows: [['D']] },
        { setup: 'DELETE FROM bus_queue; INSERT INTO bus_queue VALUES (1, \'A\', 500, 1), (2, \'B\', 600, 2), (3, \'C\', 1, 3), (4, \'D\', 1, 4);', cols: ['person_name'], rows: [['A']] },
        { setup: 'DELETE FROM bus_queue; INSERT INTO bus_queue VALUES (5, \'A\', 10, 1), (6, \'B\', 10, 2), (7, \'C\', 10, 3);', cols: ['person_name'], rows: [['C']] },
        { setup: 'DELETE FROM bus_queue; INSERT INTO bus_queue VALUES (1, \'P1\', 999, 1), (2, \'P2\', 2, 2), (3, \'P3\', 1, 3);', cols: ['person_name'], rows: [['P1']] }
      ] },
    solution: {
      approach: `<p>Running total of weight in boarding order; the answer is the latest turn whose running total is still within the limit.</p>`,
      code: { lang: 'sql', db: 'metrics', code: `WITH t AS (
  SELECT person_name, turn,
         SUM(weight) OVER (ORDER BY turn ROWS UNBOUNDED PRECEDING) AS total_weight
  FROM bus_queue
)
SELECT person_name
FROM t
WHERE total_weight <= 1000
ORDER BY turn DESC
LIMIT 1;` },
      complexity: `<p>O(N log N) sort by turn + O(N).</p>`,
      followUps: ['Several buses leave in sequence: assign each person a bus number.', 'What if the weight limit differs per bus?']
    }
  });

  practice.push({
    title: '7-Day Rolling Revenue (Full Windows Only)',
    level: 'Medium', tags: ['window', 'moving average', 'range frame'], companies: ['DoorDash', 'Zomato', 'Grubhub'],
    statement: `<p>Table <code>daily_revenue(day, region, revenue)</code>. First total revenue per day across all regions. Then for each day return <code>day, amount_7d, avg_7d</code>: the sum and average (2 decimals) of daily revenue over the 7 calendar days ending on that day. Only output days that have 6 earlier calendar days available (i.e. from the 7th day of data onwards). Order by day.</p>`,
    constraints: `Up to 10<sup>4</sup> days; at least one region has data every day in this dataset.`,
    example: `${H.table(['day', 'daily total', 'amount_7d', 'avg_7d'], [['03-01..03-06', '180, 215, 185, 60, 260, 250', '(not output: fewer than 7 days)', ''], ['03-07', '230', '<span class="c-g">1380</span>', '197.14'], ['03-08', '310', '1510', '215.71']])}<p>03-07's window is 03-01..03-07: 180+215+185+60+260+250+230 = 1380; 1380 / 7 = 197.14.</p>`,
    brute: {
      why: `<p>Self-join the daily totals to every day within the previous 6 days and GROUP BY: 7 joined rows per day, and the join on a computed date expression usually cannot use an index → O(D²) comparisons.</p>`,
      code: { lang: 'sql', db: 'shop', code: `WITH daily AS (
  SELECT day, SUM(revenue) AS revenue FROM daily_revenue GROUP BY day
)
SELECT d.day, SUM(p.revenue) AS amount_7d, ROUND(AVG(p.revenue), 2) AS avg_7d
FROM daily d
JOIN daily p ON julianday(p.day) BETWEEN julianday(d.day) - 6 AND julianday(d.day)
WHERE d.day >= (SELECT date(MIN(day), '+6 days') FROM daily)
GROUP BY d.day
ORDER BY d.day;` }
    },
    mcq: { q: 'How many PRECEDING rows/days make a 7-day window including today?', options: ['7', '6', '8', 'It depends on ROWS vs RANGE'], answer: 1, explain: '6 PRECEDING + CURRENT ROW = 7 days. "7 PRECEDING" would be 8 days — a very common off-by-one.' },
    hints: [
      `<p>Two levels: GROUP BY day first (one row per day), then the window over those daily rows.</p>`,
      `<p>Frame: ORDER BY julianday(day) RANGE BETWEEN 6 PRECEDING AND CURRENT ROW (calendar-correct even if a day were missing).</p>`,
      `<p>Filter days ≥ first day + 6 days in the outer query: <code>date(MIN(day), '+6 days')</code>.</p>`
    ],
    tests: { cmp: 'exact', engine: 'sqlite', cases: [
        { cols: ['day', 'amount_7d', 'avg_7d'], rows: [['2024-03-07', 1380, 197.14], ['2024-03-08', 1510, 215.71], ['2024-03-09', 1605, 229.29], ['2024-03-10', 1710, 244.29]] },
        { setup: 'DELETE FROM daily_revenue; ', rows: [] },
        { setup: 'DELETE FROM daily_revenue; INSERT INTO daily_revenue VALUES (\'2024-05-01\', \'N\', 51), (\'2024-05-02\', \'N\', 17), (\'2024-05-03\', \'N\', 15), (\'2024-05-04\', \'N\', 14), (\'2024-05-05\', \'N\', 28), (\'2024-05-06\', \'N\', 93);', rows: [] },
        { setup: 'DELETE FROM daily_revenue; INSERT INTO daily_revenue VALUES (\'2024-05-01\', \'N\', 2), (\'2024-05-02\', \'N\', 70), (\'2024-05-03\', \'N\', 31), (\'2024-05-04\', \'N\', 89), (\'2024-05-05\', \'N\', 50), (\'2024-05-06\', \'N\', 58), (\'2024-05-07\', \'N\', 99);', cols: ['day', 'amount_7d', 'avg_7d'], rows: [['2024-05-07', 399, 57]] },
        { setup: 'DELETE FROM daily_revenue; INSERT INTO daily_revenue VALUES (\'2024-02-24\', \'N\', 54), (\'2024-02-24\', \'S\', 21), (\'2024-02-25\', \'N\', 80), (\'2024-02-25\', \'S\', 82), (\'2024-02-26\', \'N\', 37), (\'2024-02-26\', \'S\', 25), (\'2024-02-27\', \'N\', 42), (\'2024-02-27\', \'S\', 69), (\'2024-02-28\', \'N\', 50), (\'2024-02-28\', \'S\', 27), (\'2024-02-29\', \'N\', 56), (\'2024-02-29\', \'S\', 96), (\'2024-03-01\', \'N\', 72), (\'2024-03-01\', \'S\', 24), (\'2024-03-02\', \'N\', 43), (\'2024-03-02\', \'S\', 20), (\'2024-03-03\', \'N\', 40), (\'2024-03-03\', \'S\', 69), (\'2024-03-04\', \'N\', 60), (\'2024-03-04\', \'S\', 59), (\'2024-03-05\', \'N\', 23), (\'2024-03-05\', \'S\', 81), (\'2024-03-06\', \'N\', 13), (\'2024-03-06\', \'S\', 91);', cols: ['day', 'amount_7d', 'avg_7d'], rows: [['2024-03-01', 735, 105], ['2024-03-02', 723, 103.29], ['2024-03-03', 670, 95.71], ['2024-03-04', 727, 103.86], ['2024-03-05', 720, 102.86], ['2024-03-06', 747, 106.71]] },
        { setup: 'DELETE FROM daily_revenue; INSERT INTO daily_revenue VALUES (\'2023-12-28\', \'A\', 5), (\'2023-12-28\', \'B\', 74), (\'2023-12-28\', \'C\', 51), (\'2023-12-29\', \'A\', 56), (\'2023-12-29\', \'B\', 25), (\'2023-12-29\', \'C\', 56), (\'2023-12-30\', \'A\', 66), (\'2023-12-30\', \'B\', 99), (\'2023-12-30\', \'C\', 1), (\'2023-12-31\', \'A\', 9), (\'2023-12-31\', \'B\', 72), (\'2023-12-31\', \'C\', 15), (\'2024-01-01\', \'A\', 61), (\'2024-01-01\', \'B\', 8), (\'2024-01-01\', \'C\', 74), (\'2024-01-02\', \'A\', 33), (\'2024-01-02\', \'B\', 69), (\'2024-01-02\', \'C\', 76), (\'2024-01-03\', \'A\', 7), (\'2024-01-03\', \'B\', 69), (\'2024-01-03\', \'C\', 74), (\'2024-01-04\', \'A\', 50), (\'2024-01-04\', \'B\', 82), (\'2024-01-04\', \'C\', 92), (\'2024-01-05\', \'A\', 9), (\'2024-01-05\', \'B\', 45), (\'2024-01-05\', \'C\', 75), (\'2024-01-06\', \'A\', 15), (\'2024-01-06\', \'B\', 16), (\'2024-01-06\', \'C\', 30);', cols: ['day', 'amount_7d', 'avg_7d'], rows: [['2024-01-03', 1000, 142.86], ['2024-01-04', 1094, 156.29], ['2024-01-05', 1086, 155.14], ['2024-01-06', 981, 140.14]] },
        { setup: 'DELETE FROM daily_revenue; INSERT INTO daily_revenue VALUES (\'2024-06-01\', \'N\', 0), (\'2024-06-02\', \'N\', 0), (\'2024-06-03\', \'N\', 0), (\'2024-06-04\', \'N\', 0), (\'2024-06-05\', \'N\', 0), (\'2024-06-06\', \'N\', 0), (\'2024-06-07\', \'N\', 0), (\'2024-06-08\', \'N\', 0);', cols: ['day', 'amount_7d', 'avg_7d'], rows: [['2024-06-07', 0, 0], ['2024-06-08', 0, 0]] },
        { setup: 'DELETE FROM daily_revenue; INSERT INTO daily_revenue VALUES (\'2024-01-09\', \'N\', 43), (\'2024-01-08\', \'N\', 43), (\'2024-01-07\', \'N\', 49), (\'2024-01-06\', \'N\', 13), (\'2024-01-05\', \'N\', 82), (\'2024-01-04\', \'N\', 32), (\'2024-01-03\', \'N\', 90), (\'2024-01-02\', \'N\', 26), (\'2024-01-01\', \'N\', 57);', cols: ['day', 'amount_7d', 'avg_7d'], rows: [['2024-01-07', 349, 49.86], ['2024-01-08', 335, 47.86], ['2024-01-09', 352, 50.29]] }
      ] },
    solution: {
      approach: `<p>Aggregate to daily totals in a CTE, compute the 7-day SUM/AVG with a calendar RANGE frame, then drop warm-up days.</p>`,
      code: { lang: 'sql', db: 'shop', code: `WITH daily AS (
  SELECT day, SUM(revenue) AS revenue
  FROM daily_revenue
  GROUP BY day
),
w AS (
  SELECT day,
         SUM(revenue)           OVER win AS amount_7d,
         ROUND(AVG(revenue) OVER win, 2) AS avg_7d
  FROM daily
  WINDOW win AS (ORDER BY julianday(day) RANGE BETWEEN 6 PRECEDING AND CURRENT ROW)
)
SELECT day, amount_7d, avg_7d
FROM w
WHERE day >= (SELECT date(MIN(day), '+6 days') FROM daily)
ORDER BY day;` },
      complexity: `<p>O(N) to aggregate + O(D log D) sort + O(D) sliding frame.</p>`,
      followUps: ['Divide by 7 even when a day is missing (treat it as zero).', 'Compute the same per region.']
    }
  });

  practice.push({
    title: 'Deduplicate Profiles, Keep the Latest',
    level: 'Medium', tags: ['window', 'row_number', 'dedupe'], companies: ['Salesforce', 'HubSpot', 'Atlassian'],
    statement: `<p>Table <code>user_profiles(id, email, plan, updated_at)</code> contains duplicate emails from repeated sign-ups. Keep only the most recently updated row per email (if two rows tie on updated_at, keep the higher id). Return the surviving rows <code>id, email, plan, updated_at</code> ordered by email — and show the DELETE that would clean the table.</p>`,
    constraints: `Up to 10<sup>8</sup> rows in production; this is a nightly cleanup job.`,
    example: `${H.table(['id', 'email', 'updated_at', 'keep?'], [['1', 'a@x.io', '2024-02-01', '<span class="c-r">no</span>'], ['6', 'a@x.io', '2024-02-15', '<span class="c-r">no</span>'], ['3', 'a@x.io', '2024-03-10', '<span class="c-g">yes</span>'], ['2', 'b@x.io', '2024-02-03', '<span class="c-r">no</span> (tie, lower id)'], ['5', 'b@x.io', '2024-02-03', '<span class="c-g">yes</span>']])}<p>Survivors: ids 3, 5 and 4 (c@x.io has only one row).</p>`,
    brute: {
      why: `<p>Keep a row if no "better" row with the same email exists (NOT EXISTS with a two-part comparison). Each row probes all rows with the same email — fine with an index, but the tie rule makes the predicate complicated and easy to get wrong.</p>`,
      code: { lang: 'sql', db: 'metrics', code: `SELECT p.id, p.email, p.plan, p.updated_at
FROM user_profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM user_profiles b
  WHERE b.email = p.email
    AND (b.updated_at > p.updated_at OR (b.updated_at = p.updated_at AND b.id > p.id))
)
ORDER BY p.email;` }
    },
    mcq: { q: 'Which rows should the DELETE remove?', options: ['rn = 1', 'rn &gt; 1', 'RANK() &gt; 1', 'All rows with duplicate emails'], answer: 1, explain: 'Number rows per email from newest to oldest; rn = 1 is the keeper, every rn &gt; 1 is a duplicate to delete. RANK could keep two rows on a tie.' },
    hints: [
      `<p>Dedupe = "keep exactly one row per key" = ROW_NUMBER with PARTITION BY key.</p>`,
      `<p>ORDER BY updated_at DESC, id DESC so the newest (and the higher id on ties) is row 1.</p>`,
      `<p>SELECT the rn = 1 rows; for cleanup, DELETE FROM user_profiles WHERE id IN (SELECT id FROM ranked WHERE rn &gt; 1).</p>`
    ],
    tests: { cmp: 'exact', engine: 'both', cases: [
        { cols: ['id', 'email', 'plan', 'updated_at'], rows: [[3, 'a@x.io', 'pro', '2024-03-10'], [5, 'b@x.io', 'pro', '2024-02-03'], [4, 'c@x.io', 'team', '2024-01-20']] },
        { setup: 'DELETE FROM user_profiles; ', rows: [] },
        { setup: 'DELETE FROM user_profiles; INSERT INTO user_profiles VALUES (1, \'a@x\', \'free\', \'2024-01-01\');', cols: ['id', 'email', 'plan', 'updated_at'], rows: [[1, 'a@x', 'free', '2024-01-01']] },
        { setup: 'DELETE FROM user_profiles; INSERT INTO user_profiles VALUES (1, \'a@x\', \'p\', \'2024-01-01\'), (2, \'a@x\', \'q\', \'2024-01-01\'), (3, \'a@x\', \'r\', \'2024-01-01\');', cols: ['id', 'email', 'plan', 'updated_at'], rows: [[3, 'a@x', 'r', '2024-01-01']] },
        { setup: 'DELETE FROM user_profiles; INSERT INTO user_profiles VALUES (5, \'a@x\', \'old\', \'2024-01-01\'), (1, \'a@x\', \'new\', \'2024-06-01\'), (9, \'b@x\', \'z\', \'2024-03-01\'), (8, \'b@x\', \'y\', \'2024-02-01\');', cols: ['id', 'email', 'plan', 'updated_at'], rows: [[1, 'a@x', 'new', '2024-06-01'], [9, 'b@x', 'z', '2024-03-01']] },
        { setup: 'DELETE FROM user_profiles; INSERT INTO user_profiles VALUES (1, \'c@x\', \'p\', \'2024-01-01\'), (2, \'b@x\', \'q\', \'2024-01-02\'), (3, \'a@x\', \'r\', \'2024-01-03\');', cols: ['id', 'email', 'plan', 'updated_at'], rows: [[3, 'a@x', 'r', '2024-01-03'], [2, 'b@x', 'q', '2024-01-02'], [1, 'c@x', 'p', '2024-01-01']] },
        { setup: 'DELETE FROM user_profiles; INSERT INTO user_profiles VALUES (1, \'a@x\', \'1\', \'2023-12-31\'), (2, \'a@x\', \'2\', \'2024-01-01\'), (3, \'A@x\', \'3\', \'2025-01-01\'), (4, \'a@x\', \'4\', \'2024-01-01\');', cols: ['id', 'email', 'plan', 'updated_at'], rows: [[3, 'A@x', '3', '2025-01-01'], [4, 'a@x', '4', '2024-01-01']] }
      ] },
    solution: {
      approach: `<p>Rank rows per email newest-first with ROW_NUMBER and a deterministic tiebreaker. rn = 1 is the survivor; rn &gt; 1 identifies the ids to delete. Run the DELETE inside a transaction and verify counts before committing.</p>`,
      code: { lang: 'sql', db: 'metrics', code: `WITH ranked AS (
  SELECT id, email, plan, updated_at,
         ROW_NUMBER() OVER (PARTITION BY email ORDER BY updated_at DESC, id DESC) AS rn
  FROM user_profiles
)
SELECT id, email, plan, updated_at
FROM ranked
WHERE rn = 1
ORDER BY email;` },
      alt: [{ lang: 'sql', db: 'metrics', title: 'The cleanup DELETE (then show what is left)', code: `DELETE FROM user_profiles
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY email ORDER BY updated_at DESC, id DESC) AS rn
    FROM user_profiles
  )
  WHERE rn > 1
);
SELECT * FROM user_profiles ORDER BY email;` }],
      complexity: `<p>O(N log N) sort by (email, updated_at) + O(N). On 10<sup>8</sup> rows, batch the DELETE or rebuild the table (CREATE TABLE AS SELECT rn = 1) to avoid a huge transaction.</p>`,
      followUps: ['Add a UNIQUE constraint afterwards and an UPSERT so duplicates cannot come back.', 'Merge fields instead of picking one row (e.g. keep the earliest created_at).']
    }
  });

  practice.push({
    title: 'Customers Making Up 80% of Revenue (Pareto)',
    level: 'Medium', tags: ['window', 'running total', 'percent of total'], companies: ['Amazon', 'Walmart', 'McKinsey'],
    statement: `<p>Table <code>orders(id, customer, order_date, amount)</code>. Rank customers by total spend (highest first, ties by name). Return the <b>smallest</b> set of top customers whose combined spend reaches at least 80% of all revenue: <code>customer, total, cum_pct</code> (cumulative % rounded to 1 decimal), ordered by total descending.</p>`,
    constraints: `Up to 10<sup>6</sup> customers.`,
    example: `${H.table(['customer', 'total', 'cum_pct', 'included?'], [['cara', '130', '30.2', 'yes'], ['asha', '115', '57.0', 'yes'], ['ben', '95', '79.1', 'yes — still below 80%'], ['dan', '90', '<span class="c-g">100.0</span>', '<span class="c-g">yes — crosses 80%</span>']])}<p>After ben we only have 79.1%, so dan is needed to reach 80%. A customer is included if the total <b>before</b> them is still below 80%.</p>`,
    brute: {
      why: `<p>For each customer, a correlated subquery sums the totals of all customers ranked above them (which itself needs the per-customer totals) → O(C²) over customers, and expressing "ranked above with tie by name" is messy.</p>`,
      code: { lang: 'sql', db: 'shop', code: `WITH c AS (SELECT customer, SUM(amount) AS total FROM orders GROUP BY customer)
SELECT c1.customer, c1.total,
       ROUND(100.0 * (SELECT SUM(c2.total) FROM c c2
                      WHERE c2.total > c1.total OR (c2.total = c1.total AND c2.customer <= c1.customer))
             / (SELECT SUM(total) FROM c), 1) AS cum_pct
FROM c c1
WHERE (SELECT SUM(c2.total) FROM c c2
       WHERE c2.total > c1.total OR (c2.total = c1.total AND c2.customer < c1.customer))
      < 0.8 * (SELECT SUM(total) FROM c)
   OR c1.total = (SELECT MAX(total) FROM c)
ORDER BY c1.total DESC;` }
    },
    mcq: { q: 'Why filter on "running − total &lt; 80%" instead of "running &lt;= 80%"?', options: ['It is faster', 'It includes the customer who crosses the 80% line', 'It excludes ties', 'It avoids NULLs'], answer: 1, explain: 'running − total is the cumulative spend before this customer. If that is still below 80%, this customer is needed — including the one who pushes the total over the line.' },
    hints: [
      `<p>Aggregate per customer first; the window then runs on the grouped rows.</p>`,
      `<p>Running SUM(total) OVER (ORDER BY total DESC, customer ROWS UNBOUNDED PRECEDING) and grand total SUM(total) OVER ().</p>`,
      `<p>Include a customer if running − total &lt; 0.8 × grand. cum_pct = 100.0 × running / grand.</p>`
    ],
    tests: { cmp: 'exact', engine: 'both', cases: [
        { cols: ['customer', 'total', 'cum_pct'], rows: [['cara', 130, 30.2], ['asha', 115, 57], ['ben', 95, 79.1], ['dan', 90, 100]] },
        { setup: 'DELETE FROM orders; ', rows: [] },
        { setup: 'DELETE FROM orders; INSERT INTO orders VALUES (1, \'a\', \'2024-01-01\', 5);', cols: ['customer', 'total', 'cum_pct'], rows: [['a', 5, 100]] },
        { setup: 'DELETE FROM orders; INSERT INTO orders VALUES (1, \'a\', \'2024-01-01\', 80), (2, \'b\', \'2024-01-01\', 20);', cols: ['customer', 'total', 'cum_pct'], rows: [['a', 80, 80]] },
        { setup: 'DELETE FROM orders; INSERT INTO orders VALUES (1, \'a\', \'2024-01-01\', 79), (2, \'b\', \'2024-01-01\', 21);', cols: ['customer', 'total', 'cum_pct'], rows: [['a', 79, 79], ['b', 21, 100]] },
        { setup: 'DELETE FROM orders; INSERT INTO orders VALUES (1, \'e\', \'2024-01-01\', 20), (2, \'d\', \'2024-01-01\', 20), (3, \'c\', \'2024-01-01\', 20), (4, \'b\', \'2024-01-01\', 20), (5, \'a\', \'2024-01-01\', 20);', cols: ['customer', 'total', 'cum_pct'], rows: [['a', 20, 20], ['b', 20, 40], ['c', 20, 60], ['d', 20, 80]] },
        { setup: 'DELETE FROM orders; INSERT INTO orders VALUES (1, \'x\', \'2024-01-01\', 10), (2, \'y\', \'2024-01-01\', 10), (3, \'x\', \'2024-01-01\', 30), (4, \'z\', \'2024-01-01\', 5), (5, \'y\', \'2024-01-01\', 40), (6, \'w\', \'2024-01-01\', 5);', cols: ['customer', 'total', 'cum_pct'], rows: [['y', 50, 50], ['x', 40, 90]] },
        { setup: 'DELETE FROM orders; INSERT INTO orders VALUES (1, \'a\', \'2024-01-01\', 28), (2, \'b\', \'2024-01-01\', 7);', cols: ['customer', 'total', 'cum_pct'], rows: [['a', 28, 80]] },
        { setup: 'DELETE FROM orders; INSERT INTO orders VALUES (1, \'c2\', \'2024-01-01\', 82), (2, \'c4\', \'2024-01-01\', 3), (3, \'c2\', \'2024-01-01\', 44), (4, \'c9\', \'2024-01-01\', 41), (5, \'c11\', \'2024-01-01\', 97), (6, \'c6\', \'2024-01-01\', 99), (7, \'c1\', \'2024-01-01\', 22), (8, \'c2\', \'2024-01-01\', 89), (9, \'c4\', \'2024-01-01\', 58), (10, \'c1\', \'2024-01-01\', 2), (11, \'c7\', \'2024-01-01\', 25), (12, \'c12\', \'2024-01-01\', 38), (13, \'c2\', \'2024-01-01\', 46), (14, \'c5\', \'2024-01-01\', 27), (15, \'c4\', \'2024-01-01\', 73), (16, \'c7\', \'2024-01-01\', 49), (17, \'c11\', \'2024-01-01\', 37), (18, \'c10\', \'2024-01-01\', 83), (19, \'c2\', \'2024-01-01\', 20), (20, \'c8\', \'2024-01-01\', 51), (21, \'c6\', \'2024-01-01\', 35), (22, \'c8\', \'2024-01-01\', 56), (23, \'c7\', \'2024-01-01\', 40), (24, \'c4\', \'2024-01-01\', 90), (25, \'c6\', \'2024-01-01\', 41), (26, \'c8\', \'2024-01-01\', 83), (27, \'c12\', \'2024-01-01\', 79), (28, \'c6\', \'2024-01-01\', 44), (29, \'c3\', \'2024-01-01\', 34), (30, \'c12\', \'2024-01-01\', 26), (31, \'c12\', \'2024-01-01\', 28), (32, \'c5\', \'2024-01-01\', 46), (33, \'c10\', \'2024-01-01\', 98), (34, \'c5\', \'2024-01-01\', 89), (35, \'c1\', \'2024-01-01\', 93), (36, \'c3\', \'2024-01-01\', 3), (37, \'c11\', \'2024-01-01\', 53), (38, \'c4\', \'2024-01-01\', 79), (39, \'c1\', \'2024-01-01\', 90), (40, \'c1\', \'2024-01-01\', 71), (41, \'c1\', \'2024-01-01\', 75), (42, \'c10\', \'2024-01-01\', 31), (43, \'c9\', \'2024-01-01\', 64), (44, \'c10\', \'2024-01-01\', 66), (45, \'c5\', \'2024-01-01\', 26), (46, \'c12\', \'2024-01-01\', 88), (47, \'c4\', \'2024-01-01\', 22), (48, \'c2\', \'2024-01-01\', 48), (49, \'c10\', \'2024-01-01\', 19), (50, \'c1\', \'2024-01-01\', 10);', cols: ['customer', 'total', 'cum_pct'], rows: [['c1', 363, 13.9], ['c2', 329, 26.5], ['c4', 325, 38.9], ['c10', 297, 50.3], ['c12', 259, 60.2], ['c6', 219, 68.6], ['c8', 190, 75.9], ['c5', 188, 83]] }
      ] },
    solution: {
      approach: `<p>Customer totals in a CTE, then a running sum ordered by spend and the grand total on every row. The "spend before me" test selects exactly the minimal prefix reaching 80%.</p>`,
      code: { lang: 'sql', db: 'shop', code: `WITH c AS (
  SELECT customer, SUM(amount) AS total
  FROM orders
  GROUP BY customer
),
r AS (
  SELECT customer, total,
         SUM(total) OVER (ORDER BY total DESC, customer ROWS UNBOUNDED PRECEDING) AS running,
         SUM(total) OVER () AS grand
  FROM c
)
SELECT customer, total, ROUND(100.0 * running / grand, 1) AS cum_pct
FROM r
WHERE running - total < 0.8 * grand
ORDER BY total DESC;` },
      complexity: `<p>O(N) aggregate + O(C log C) sort of customers + O(C).</p>`,
      followUps: ['Do it per product category.', 'Label every customer A/B/C (ABC analysis: 80% / 15% / 5%).']
    }
  });

  /* =====================================================================
     PRACTICE — Hard
     ===================================================================== */
  practice.push({
    title: 'Stadium Rush: 3+ Consecutive Busy Visits',
    level: 'Hard', tags: ['window', 'gaps and islands', 'row_number'], companies: ['Meta', 'Amazon', 'Twitter'],
    statement: `<p>Table <code>stadium(id, visit_date, people)</code>; <code>id</code> increases with visit_date. Return every row that belongs to a run of <b>three or more consecutive ids</b> where each visit had <code>people &gt;= 100</code>. Order by visit_date.</p>`,
    constraints: `Up to 10<sup>6</sup> rows. ids are consecutive integers (dates may skip — consecutiveness is by id).`,
    example: `${H.table(['id', 'people', 'busy?', 'id − ROW_NUMBER (among busy)'], [['2', '109', 'yes', '2 − 1 = 1'], ['3', '150', 'yes', '3 − 2 = 1'], ['4', '99', '<span class="c-r">no</span>', '—'], ['5', '145', 'yes', '<span class="c-g">5 − 3 = 2</span>'], ['6', '1455', 'yes', '<span class="c-g">2</span>'], ['7', '199', 'yes', '<span class="c-g">2</span>'], ['8', '188', 'yes', '<span class="c-g">2</span>']])}<p>Group 1 (ids 2–3) has only 2 rows; group 2 (ids 5–8) has 4 → output ids 5, 6, 7, 8.</p>`,
    brute: {
      why: `<p>Triple self-join covering the three positions a row can have inside a run (first, middle, last of a triple). It is a cross product of three copies filtered by six conditions, needs DISTINCT, and does not generalise to "K or more".</p>`,
      code: { lang: 'sql', db: 'metrics', code: `SELECT DISTINCT s1.*
FROM stadium s1, stadium s2, stadium s3
WHERE s1.people >= 100 AND s2.people >= 100 AND s3.people >= 100
  AND (   (s2.id = s1.id + 1 AND s3.id = s1.id + 2)   -- s1 first of a triple
       OR (s2.id = s1.id - 1 AND s3.id = s1.id + 1)   -- s1 in the middle
       OR (s2.id = s1.id - 2 AND s3.id = s1.id - 1))  -- s1 last
ORDER BY s1.id;` }
    },
    mcq: { q: 'In gaps-and-islands, why is id − ROW_NUMBER() constant inside a run?', options: ['ROW_NUMBER resets every run', 'Both increase by exactly 1 per row inside a run, so their difference does not change; a gap changes it', 'It is a coincidence of the sample data', 'Because ids are unique'], answer: 1, explain: 'Inside a consecutive run, id and the row number (over busy rows only) both step by 1. When a non-busy row is skipped, id jumps by 2+ but ROW_NUMBER only by 1, so the difference changes — a new island.' },
    hints: [
      `<p>Filter to busy rows first. Consecutive ids then form "islands" separated by gaps.</p>`,
      `<p>Island key: id − ROW_NUMBER() OVER (ORDER BY id), computed over busy rows only. Same key = same island.</p>`,
      `<p>COUNT(*) OVER (PARTITION BY key) gives each island's size; keep rows where it is ≥ 3. Order by visit_date.</p>`
    ],
    tests: { cmp: 'exact', engine: 'both', cases: [
        { cols: ['id', 'visit_date', 'people'], rows: [[5, '2024-01-05', 145], [6, '2024-01-06', 1455], [7, '2024-01-07', 199], [8, '2024-01-09', 188]] },
        { setup: 'DELETE FROM stadium; ', rows: [] },
        { setup: 'DELETE FROM stadium; INSERT INTO stadium VALUES (1, \'2024-03-01\', 100), (2, \'2024-03-02\', 100), (3, \'2024-03-03\', 100);', cols: ['id', 'visit_date', 'people'], rows: [[1, '2024-03-01', 100], [2, '2024-03-02', 100], [3, '2024-03-03', 100]] },
        { setup: 'DELETE FROM stadium; INSERT INTO stadium VALUES (1, \'2024-03-01\', 100), (2, \'2024-03-02\', 100), (3, \'2024-03-03\', 99), (4, \'2024-03-04\', 100), (5, \'2024-03-05\', 100);', rows: [] },
        { setup: 'DELETE FROM stadium; INSERT INTO stadium VALUES (1, \'2024-03-01\', 99), (2, \'2024-03-02\', 50), (3, \'2024-03-03\', 100), (4, \'2024-03-04\', 300), (5, \'2024-03-05\', 100), (6, \'2024-03-06\', 5), (7, \'2024-03-07\', 100), (8, \'2024-03-08\', 100), (9, \'2024-03-09\', 100), (10, \'2024-03-10\', 100), (11, \'2024-03-11\', 2);', cols: ['id', 'visit_date', 'people'], rows: [[3, '2024-03-03', 100], [4, '2024-03-04', 300], [5, '2024-03-05', 100], [7, '2024-03-07', 100], [8, '2024-03-08', 100], [9, '2024-03-09', 100], [10, '2024-03-10', 100]] },
        { setup: 'DELETE FROM stadium; INSERT INTO stadium VALUES (1, \'2024-03-01\', 500), (2, \'2024-03-02\', 500), (3, \'2024-03-03\', 500), (4, \'2024-03-04\', 500), (5, \'2024-03-05\', 500), (6, \'2024-03-06\', 500);', cols: ['id', 'visit_date', 'people'], rows: [[1, '2024-03-01', 500], [2, '2024-03-02', 500], [3, '2024-03-03', 500], [4, '2024-03-04', 500], [5, '2024-03-05', 500], [6, '2024-03-06', 500]] },
        { setup: 'DELETE FROM stadium; INSERT INTO stadium VALUES (1, \'2024-03-01\', 100), (2, \'2024-03-02\', 100), (3, \'2024-03-03\', 100), (5, \'2024-03-04\', 100), (6, \'2024-03-05\', 100);', cols: ['id', 'visit_date', 'people'], rows: [[1, '2024-03-01', 100], [2, '2024-03-02', 100], [3, '2024-03-03', 100]] },
        { setup: 'DELETE FROM stadium; INSERT INTO stadium VALUES (1, \'2024-03-01\', 100), (2, \'2024-03-02\', 100), (4, \'2024-03-03\', 100), (5, \'2024-03-04\', 100);', rows: [] },
        { setup: 'DELETE FROM stadium; INSERT INTO stadium VALUES (1, \'2024-03-01\', 1), (2, \'2024-03-02\', 2), (3, \'2024-03-03\', 3), (4, \'2024-03-04\', 4);', rows: [] }
      ] },
    solution: {
      approach: `<p>Classic gaps-and-islands. After filtering busy rows, subtracting a dense row number from the id produces a constant label per run. A second window counts rows per label, and runs of length ≥ 3 survive. Works for any K by changing one number.</p>`,
      code: { lang: 'sql', db: 'metrics', code: `WITH busy AS (
  SELECT id, visit_date, people,
         id - ROW_NUMBER() OVER (ORDER BY id) AS grp      -- island label
  FROM stadium
  WHERE people >= 100
),
sized AS (
  SELECT *, COUNT(*) OVER (PARTITION BY grp) AS run_len
  FROM busy
)
SELECT id, visit_date, people
FROM sized
WHERE run_len >= 3
ORDER BY visit_date;` },
      complexity: `<p>O(N log N) sort + two O(N) window passes. The triple self-join is O(N³) in the worst case without indexes.</p>`,
      followUps: ['Use visit_date consecutiveness instead of ids (julianday − ROW_NUMBER).', 'Return each run\'s start, end and length instead of the rows.']
    }
  });

  practice.push({
    title: 'Longest Login Streak per User',
    level: 'Hard', tags: ['window', 'gaps and islands', 'dates', 'dedupe'], companies: ['Duolingo', 'Snap', 'LinkedIn'],
    statement: `<p>Table <code>logins(user_id, login_date)</code> — a user may log in several times a day (duplicate rows). For each user return their longest streak of consecutive calendar days: <code>user_id, start_date, end_date, longest_streak</code>. If two streaks tie, return the earlier one. Order by user_id.</p>`,
    constraints: `Up to 10<sup>8</sup> login rows, 10<sup>6</sup> users.`,
    example: `${H.table(['user', 'distinct days', 'streaks', 'answer'], [['1', '01, 02, 03, 05, 06', '01–03 (3), 05–06 (2)', '<span class="c-g">01-01 → 01-03, 3</span>'], ['2', '01, 03, 04, 05, 06', '01 (1), 03–06 (4)', '<span class="c-g">01-03 → 01-06, 4</span>'], ['3', '02, <span class="c-r">02</span>, 03', 'duplicate removed → 02–03', '2']])}<p>Without de-duplication, user 3's duplicate 01-02 would break the date − row-number trick.</p>`,
    brute: {
      why: `<p>Without windows: for each login day, walk forward with a recursive CTE while the next day exists, or self-join each day to all later days and check "no missing day in between" with NOT EXISTS over a calendar. Each start day can scan up to the full streak → O(N × streak length) or worse, and the SQL is long. The brute force below starts a recursive walk from every login day and extends it one day at a time — many overlapping walks for the same streak.</p>`,
      code: { lang: 'sql', db: 'metrics', code: `WITH RECURSIVE d AS (
  SELECT DISTINCT user_id, login_date FROM logins
),
walk(user_id, start_date, cur_date, len) AS (
  SELECT user_id, login_date, login_date, 1 FROM d          -- every day starts a candidate streak
  UNION ALL
  SELECT w.user_id, w.start_date, d.login_date, w.len + 1
  FROM walk w
  JOIN d ON d.user_id = w.user_id AND d.login_date = date(w.cur_date, '+1 day')
),
best AS (
  SELECT user_id, start_date, cur_date AS end_date, len,
         ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY len DESC, start_date) AS rn
  FROM walk
)
SELECT user_id, start_date, end_date, len AS longest_streak
FROM best
WHERE rn = 1
ORDER BY user_id;` }
    },
    mcq: { q: 'Why must you SELECT DISTINCT dates before computing julianday(date) − ROW_NUMBER()?', options: ['To make it faster', 'A duplicate date bumps ROW_NUMBER without moving the date, splitting one streak into two labels', 'ROW_NUMBER rejects duplicates', 'julianday fails on duplicates'], answer: 1, explain: 'The trick relies on date and row number both increasing by 1 per row. A duplicate date increases only the row number, changing the difference mid-streak.' },
    hints: [
      `<p>Consecutive dates form islands; date − row number (in days) is constant within an island.</p>`,
      `<p>Steps: DISTINCT (user, date) → grp = julianday(date) − ROW_NUMBER() OVER (PARTITION BY user ORDER BY date) → GROUP BY user, grp for start, end, length.</p>`,
      `<p>Then pick the longest per user with ROW_NUMBER() OVER (PARTITION BY user ORDER BY len DESC, start_date) = 1.</p>`
    ],
    tests: { cmp: 'exact', engine: 'sqlite', cases: [
        { cols: ['user_id', 'start_date', 'end_date', 'longest_streak'], rows: [[1, '2024-01-01', '2024-01-03', 3], [2, '2024-01-03', '2024-01-06', 4], [3, '2024-01-02', '2024-01-03', 2]] },
        { setup: 'DELETE FROM logins; ', rows: [] },
        { setup: 'DELETE FROM logins; INSERT INTO logins VALUES (1, \'2024-05-05\');', cols: ['user_id', 'start_date', 'end_date', 'longest_streak'], rows: [[1, '2024-05-05', '2024-05-05', 1]] },
        { setup: 'DELETE FROM logins; INSERT INTO logins VALUES (1, \'2024-05-05\'), (1, \'2024-05-05\'), (1, \'2024-05-05\');', cols: ['user_id', 'start_date', 'end_date', 'longest_streak'], rows: [[1, '2024-05-05', '2024-05-05', 1]] },
        { setup: 'DELETE FROM logins; INSERT INTO logins VALUES (1, \'2024-02-27\'), (1, \'2024-02-28\'), (1, \'2024-02-29\'), (1, \'2024-03-01\'), (2, \'2023-12-30\'), (2, \'2023-12-31\'), (2, \'2024-01-01\'), (2, \'2024-01-04\'), (2, \'2024-01-05\'), (2, \'2024-01-06\');', cols: ['user_id', 'start_date', 'end_date', 'longest_streak'], rows: [[1, '2024-02-27', '2024-03-01', 4], [2, '2023-12-30', '2024-01-01', 3]] },
        { setup: 'DELETE FROM logins; INSERT INTO logins VALUES (1, \'2024-01-09\'), (1, \'2024-01-08\'), (1, \'2024-01-07\'), (1, \'2024-01-06\'), (1, \'2024-01-02\'), (1, \'2024-01-01\'), (3, \'2024-01-01\'), (3, \'2024-01-01\'), (3, \'2024-01-02\'), (3, \'2024-01-02\'), (3, \'2024-01-03\'), (3, \'2024-01-11\'), (3, \'2024-01-11\'), (3, \'2024-01-12\');', cols: ['user_id', 'start_date', 'end_date', 'longest_streak'], rows: [[1, '2024-01-06', '2024-01-09', 4], [3, '2024-01-01', '2024-01-03', 3]] },
        { setup: 'DELETE FROM logins; INSERT INTO logins VALUES (4, \'2024-03-01\'), (4, \'2024-03-02\'), (4, \'2024-03-03\'), (4, \'2024-03-11\'), (4, \'2024-03-12\'), (4, \'2024-03-13\'), (4, \'2024-03-21\');', cols: ['user_id', 'start_date', 'end_date', 'longest_streak'], rows: [[4, '2024-03-01', '2024-03-03', 3]] },
        { setup: 'DELETE FROM logins; INSERT INTO logins VALUES (1, \'2024-01-01\'), (1, \'2024-01-03\'), (1, \'2024-01-05\'), (1, \'2024-01-07\'), (2, \'2024-01-31\'), (2, \'2024-02-01\'), (2, \'2024-02-02\');', cols: ['user_id', 'start_date', 'end_date', 'longest_streak'], rows: [[1, '2024-01-01', '2024-01-01', 1], [2, '2024-01-31', '2024-02-02', 3]] }
      ] },
    solution: {
      approach: `<p>Gaps-and-islands on dates, done per user. De-duplicate first, label islands with julianday − ROW_NUMBER, aggregate each island, then top-1 per user with a tiebreak on the earlier start. Three window/aggregate passes, all linear after sorting.</p>`,
      code: { lang: 'sql', db: 'metrics', code: `WITH d AS (
  SELECT DISTINCT user_id, login_date FROM logins
),
g AS (
  SELECT user_id, login_date,
         julianday(login_date)
           - ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY login_date) AS grp
  FROM d
),
streaks AS (
  SELECT user_id, MIN(login_date) AS start_date, MAX(login_date) AS end_date, COUNT(*) AS len
  FROM g
  GROUP BY user_id, grp
),
best AS (
  SELECT *, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY len DESC, start_date) AS rn
  FROM streaks
)
SELECT user_id, start_date, end_date, len AS longest_streak
FROM best
WHERE rn = 1
ORDER BY user_id;` },
      complexity: `<p>O(N log N) to de-duplicate and sort per user, then O(N) passes. The recursive walk is O(Σ streak lengths²) in the worst case.</p>`,
      followUps: ['Return each user\'s current streak as of today.', 'Allow one missed day ("streak freeze") without breaking the streak.']
    }
  });

  practice.push({
    title: 'Sessionize Clickstream (30-Minute Inactivity)',
    level: 'Hard', tags: ['window', 'lag', 'running sum', 'sessionization'], companies: ['Google', 'Amplitude', 'Pinterest'],
    statement: `<p>Table <code>clicks(user_id, ts)</code> with timestamps 'YYYY-MM-DD HH:MM'. A new session starts at a user's first click or whenever more than <b>30 minutes</b> passed since that user's previous click. Return <code>user_id, session_id, session_start, session_end, clicks</code>, where session_id counts 1, 2, 3… per user. Order by user_id, session_id.</p>`,
    constraints: `Up to 10<sup>9</sup> clicks per day in production; must be a single pass per user.`,
    example: `${H.table(['user', 'ts', 'gap (min)', 'new session?', 'session_id'], [['1', '09:00', '—', '1', '1'], ['1', '09:10', '10', '0', '1'], ['1', '09:20', '10', '0', '1'], ['1', '10:05', '<span class="c-r">45</span>', '1', '<span class="c-g">2</span>'], ['1', '10:15', '10', '0', '2'], ['1', '12:00', '105', '1', '3']])}<p>Running SUM of the "new session" flag gives the session number.</p>`,
    brute: {
      why: `<p>For each click, count how many "session-starting" clicks of the same user happened at or before it, where a start is found by a correlated "previous click" subquery. That is a nested correlated subquery per row → O(N²) per user. Shown here for small data only.</p>`,
      code: { lang: 'sql', db: 'metrics', code: `WITH flagged AS (
  SELECT c.user_id, c.ts,
         CASE WHEN (SELECT MAX(p.ts) FROM clicks p WHERE p.user_id = c.user_id AND p.ts < c.ts) IS NULL
                OR strftime('%s', c.ts) - strftime('%s', (SELECT MAX(p.ts) FROM clicks p
                                                          WHERE p.user_id = c.user_id AND p.ts < c.ts)) > 1800
              THEN 1 ELSE 0 END AS is_start
  FROM clicks c
),
numbered AS (
  SELECT f.user_id, f.ts,
         (SELECT SUM(f2.is_start) FROM flagged f2 WHERE f2.user_id = f.user_id AND f2.ts <= f.ts) AS session_id
  FROM flagged f
)
SELECT user_id, session_id, MIN(ts) AS session_start, MAX(ts) AS session_end, COUNT(*) AS clicks
FROM numbered
GROUP BY user_id, session_id
ORDER BY user_id, session_id;` }
    },
    mcq: { q: 'What turns the 0/1 "new session" flags into session numbers?', options: ['ROW_NUMBER over the flags', 'A running SUM of the flags per user ordered by time', 'DENSE_RANK of the timestamps', 'NTILE(number of sessions)'], answer: 1, explain: 'Each 1 marks a session start; summing flags from the beginning up to each row counts how many sessions have started so far — that count is the session id.' },
    hints: [
      `<p>Step 1: LAG(ts) per user gives the previous click time; compute the gap in seconds with strftime('%s', ts) − strftime('%s', prev) and compare it with 1800 (julianday × 1440 gives floating-point noise, so a gap of exactly 30 minutes could count as longer).</p>`,
      `<p>Step 2: flag = 1 if prev is NULL or gap &gt; 30, else 0. Step 3: session_id = SUM(flag) OVER (PARTITION BY user ORDER BY ts ROWS UNBOUNDED PRECEDING).</p>`,
      `<p>Step 4: GROUP BY user_id, session_id for MIN(ts), MAX(ts), COUNT(*). Use separate CTEs because a window cannot be nested inside another window.</p>`
    ],
    tests: { cmp: 'exact', engine: 'sqlite', cases: [
        { cols: ['user_id', 'session_id', 'session_start', 'session_end', 'clicks'], rows: [[1, 1, '2024-05-01 09:00', '2024-05-01 09:20', 3], [1, 2, '2024-05-01 10:05', '2024-05-01 10:15', 2], [1, 3, '2024-05-01 12:00', '2024-05-01 12:00', 1], [2, 1, '2024-05-01 09:00', '2024-05-01 09:00', 1], [2, 2, '2024-05-01 09:45', '2024-05-01 09:50', 2]] },
        { setup: 'DELETE FROM clicks; ', rows: [] },
        { setup: 'DELETE FROM clicks; INSERT INTO clicks VALUES (1, \'2024-05-01 09:00\');', cols: ['user_id', 'session_id', 'session_start', 'session_end', 'clicks'], rows: [[1, 1, '2024-05-01 09:00', '2024-05-01 09:00', 1]] },
        { setup: 'DELETE FROM clicks; INSERT INTO clicks VALUES (1, \'2024-05-01 09:00\'), (1, \'2024-05-01 09:30\'), (1, \'2024-05-01 10:00\'), (1, \'2024-05-01 10:31\');', cols: ['user_id', 'session_id', 'session_start', 'session_end', 'clicks'], rows: [[1, 1, '2024-05-01 09:00', '2024-05-01 10:00', 3], [1, 2, '2024-05-01 10:31', '2024-05-01 10:31', 1]] },
        { setup: 'DELETE FROM clicks; INSERT INTO clicks VALUES (1, \'2024-05-01 23:50\'), (1, \'2024-05-02 00:10\'), (1, \'2024-05-02 00:41\'), (1, \'2024-05-02 08:00\');', cols: ['user_id', 'session_id', 'session_start', 'session_end', 'clicks'], rows: [[1, 1, '2024-05-01 23:50', '2024-05-02 00:10', 2], [1, 2, '2024-05-02 00:41', '2024-05-02 00:41', 1], [1, 3, '2024-05-02 08:00', '2024-05-02 08:00', 1]] },
        { setup: 'DELETE FROM clicks; INSERT INTO clicks VALUES (2, \'2024-05-01 10:00\'), (1, \'2024-05-01 10:05\'), (2, \'2024-05-01 10:20\'), (1, \'2024-05-01 09:00\'), (2, \'2024-05-01 11:00\');', cols: ['user_id', 'session_id', 'session_start', 'session_end', 'clicks'], rows: [[1, 1, '2024-05-01 09:00', '2024-05-01 09:00', 1], [1, 2, '2024-05-01 10:05', '2024-05-01 10:05', 1], [2, 1, '2024-05-01 10:00', '2024-05-01 10:20', 2], [2, 2, '2024-05-01 11:00', '2024-05-01 11:00', 1]] },
        { setup: 'DELETE FROM clicks; INSERT INTO clicks VALUES (1, \'2024-05-01 09:00\'), (1, \'2024-05-01 09:00\'), (1, \'2024-05-01 09:31\'), (1, \'2024-05-01 09:31\');', cols: ['user_id', 'session_id', 'session_start', 'session_end', 'clicks'], rows: [[1, 1, '2024-05-01 09:00', '2024-05-01 09:00', 2], [1, 2, '2024-05-01 09:31', '2024-05-01 09:31', 2]] },
        { setup: 'DELETE FROM clicks; INSERT INTO clicks VALUES (1, \'2024-02-28 23:59\'), (1, \'2024-03-01 00:01\'), (1, \'2024-12-31 23:50\'), (1, \'2025-01-01 00:20\');', cols: ['user_id', 'session_id', 'session_start', 'session_end', 'clicks'], rows: [[1, 1, '2024-02-28 23:59', '2024-02-28 23:59', 1], [1, 2, '2024-03-01 00:01', '2024-03-01 00:01', 1], [1, 3, '2024-12-31 23:50', '2025-01-01 00:20', 2]] }
      ] },
    solution: {
      approach: `<p>The "flag + running sum" pattern: LAG detects boundaries, a cumulative SUM of boundary flags numbers the groups, and a GROUP BY summarises each group. This is how product-analytics tools and dbt sessionization models work.</p>`,
      code: { lang: 'sql', db: 'metrics', code: `WITH t AS (
  SELECT user_id, ts,
         CASE WHEN LAG(ts) OVER w IS NULL
                OR strftime('%s', ts) - strftime('%s', LAG(ts) OVER w) > 1800
              THEN 1 ELSE 0 END AS new_session
  FROM clicks
  WINDOW w AS (PARTITION BY user_id ORDER BY ts)
),
s AS (
  SELECT user_id, ts,
         SUM(new_session) OVER (PARTITION BY user_id ORDER BY ts
                                ROWS UNBOUNDED PRECEDING) AS session_id
  FROM t
)
SELECT user_id, session_id,
       MIN(ts) AS session_start, MAX(ts) AS session_end, COUNT(*) AS clicks
FROM s
GROUP BY user_id, session_id
ORDER BY user_id, session_id;` },
      complexity: `<p>One sort by (user_id, ts) + two O(N) window passes + O(N) aggregation. The correlated version is O(N²) per user.</p>`,
      followUps: ['Compute average session length per user in minutes.', 'Also start a new session at midnight.', 'How would you do this incrementally in a streaming system (session windows in Flink/Kafka Streams)?']
    }
  });

  practice.push({
    title: 'Median Salary per Department (No PERCENTILE_CONT)',
    level: 'Hard', tags: ['window', 'row_number', 'count over', 'median'], companies: ['Google', 'Pinterest', 'Two Sigma'],
    statement: `<p>Table <code>employees(id, name, dept, salary, hire_date)</code>. Return <code>dept, median_salary</code> for every department using only standard window functions (SQLite has no PERCENTILE_CONT). For an even count, the median is the average of the two middle salaries. Order by dept.</p>`,
    constraints: `Up to 10<sup>7</sup> employees. Salaries can tie.`,
    example: `${H.table(['dept', 'sorted salaries', 'count', 'middle positions', 'median'], [['Engineering', '80, 95, <b>95, 110</b>, 120, 120', '6', '3 and 4', '<span class="c-g">(95000 + 110000) / 2 = 102500</span>'], ['HR', '60, <b>60</b>, 75', '3', '2', '60000'], ['Sales', '70, <b>85, 85</b>, 90', '4', '2 and 3', '85000']])}<p>For c rows, the middle positions are (c+1)/2 and (c+2)/2 using integer division — the same position twice when c is odd.</p>`,
    brute: {
      why: `<p>Without windows: for each employee count how many in the department sort before them (with an id tiebreaker) and compare to the department size — two correlated subqueries per row → O(N²/D). It works but is slow and the position arithmetic is fiddly.</p>`,
      code: { lang: 'sql', db: 'hr', code: `SELECT e.dept, AVG(e.salary) AS median_salary
FROM employees e
WHERE (SELECT COUNT(*) FROM employees x
       WHERE x.dept = e.dept
         AND (x.salary < e.salary OR (x.salary = e.salary AND x.id < e.id)))   -- 0-based position
      IN (((SELECT COUNT(*) FROM employees y WHERE y.dept = e.dept) - 1) / 2,
          (SELECT COUNT(*) FROM employees y WHERE y.dept = e.dept) / 2)
GROUP BY e.dept
ORDER BY e.dept;` }
    },
    mcq: { q: 'With c = 6 rows, which ROW_NUMBER positions hold the middle values?', options: ['3 only', '3 and 4', '4 only', '3, 4 and 5'], answer: 1, explain: '(c+1)/2 = 3 and (c+2)/2 = 4 with integer division. For c = 5 both formulas give 3.' },
    hints: [
      `<p>You need each row's position in sorted order and the size of its department on the same row.</p>`,
      `<p>ROW_NUMBER() OVER (PARTITION BY dept ORDER BY salary, id) and COUNT(*) OVER (PARTITION BY dept).</p>`,
      `<p>Keep rows where rn IN ((c + 1) / 2, (c + 2) / 2) and AVG(salary) per dept. Integer division handles odd and even counts at once.</p>`
    ],
    tests: { cmp: 'exact', engine: 'both', cases: [
        { cols: ['dept', 'median_salary'], rows: [['Engineering', 102500], ['HR', 60000], ['Sales', 85000]] },
        { setup: 'DELETE FROM salary_history; DELETE FROM employees; ', rows: [] },
        { setup: 'DELETE FROM salary_history; DELETE FROM employees; INSERT INTO employees VALUES (1, \'N1\', \'X\', 100, \'2020-01-01\');', cols: ['dept', 'median_salary'], rows: [['X', 100]] },
        { setup: 'DELETE FROM salary_history; DELETE FROM employees; INSERT INTO employees VALUES (1, \'N1\', \'X\', 100, \'2020-01-01\'), (2, \'N2\', \'X\', 101, \'2020-01-01\');', cols: ['dept', 'median_salary'], rows: [['X', 100.5]] },
        { setup: 'DELETE FROM salary_history; DELETE FROM employees; INSERT INTO employees VALUES (1, \'N1\', \'X\', 5, \'2020-01-01\'), (2, \'N2\', \'X\', 1, \'2020-01-01\'), (3, \'N3\', \'X\', 3, \'2020-01-01\'), (4, \'N4\', \'Y\', 9, \'2020-01-01\'), (5, \'N5\', \'Y\', 9, \'2020-01-01\'), (6, \'N6\', \'Y\', 9, \'2020-01-01\'), (7, \'N7\', \'Y\', 9, \'2020-01-01\');', cols: ['dept', 'median_salary'], rows: [['X', 3], ['Y', 9]] },
        { setup: 'DELETE FROM salary_history; DELETE FROM employees; INSERT INTO employees VALUES (1, \'N1\', \'X\', 10, \'2020-01-01\'), (2, \'N2\', \'X\', 10, \'2020-01-01\'), (3, \'N3\', \'X\', 10, \'2020-01-01\'), (4, \'N4\', \'X\', 20, \'2020-01-01\'), (5, \'N5\', \'X\', 20, \'2020-01-01\'), (6, \'N6\', \'X\', 30, \'2020-01-01\'), (7, \'N7\', \'Y\', 7, \'2020-01-01\'), (8, \'N8\', \'Y\', 1, \'2020-01-01\'), (9, \'N9\', \'Y\', 100, \'2020-01-01\'), (10, \'N10\', \'Y\', 3, \'2020-01-01\'), (11, \'N11\', \'Y\', 2, \'2020-01-01\');', cols: ['dept', 'median_salary'], rows: [['X', 15], ['Y', 3]] },
        { setup: 'DELETE FROM salary_history; DELETE FROM employees; INSERT INTO employees VALUES (1, \'N1\', \'X\', 1, \'2020-01-01\'), (2, \'N2\', \'X\', 2, \'2020-01-01\'), (3, \'N3\', \'Y\', 1, \'2020-01-01\'), (4, \'N4\', \'Y\', 4, \'2020-01-01\');', cols: ['dept', 'median_salary'], rows: [['X', 1.5], ['Y', 2.5]] },
        { setup: 'DELETE FROM salary_history; DELETE FROM employees; INSERT INTO employees VALUES (1, \'N1\', \'A\', 24000, \'2020-01-01\'), (2, \'N2\', \'A\', 6000, \'2020-01-01\'), (3, \'N3\', \'A\', 14000, \'2020-01-01\'), (4, \'N4\', \'A\', 27000, \'2020-01-01\'), (5, \'N5\', \'A\', 16000, \'2020-01-01\'), (6, \'N6\', \'A\', 8000, \'2020-01-01\'), (7, \'N7\', \'A\', 27000, \'2020-01-01\'), (8, \'N8\', \'A\', 10000, \'2020-01-01\'), (9, \'N9\', \'A\', 20000, \'2020-01-01\'), (10, \'N10\', \'A\', 10000, \'2020-01-01\'), (11, \'N11\', \'A\', 12000, \'2020-01-01\'), (12, \'N12\', \'A\', 4000, \'2020-01-01\'), (13, \'N13\', \'A\', 30000, \'2020-01-01\'), (14, \'N14\', \'A\', 2000, \'2020-01-01\'), (15, \'N15\', \'A\', 1000, \'2020-01-01\'), (16, \'N16\', \'A\', 6000, \'2020-01-01\'), (17, \'N17\', \'A\', 1000, \'2020-01-01\'), (18, \'N18\', \'A\', 23000, \'2020-01-01\'), (19, \'N19\', \'A\', 15000, \'2020-01-01\'), (20, \'N20\', \'A\', 10000, \'2020-01-01\'), (21, \'N21\', \'A\', 2000, \'2020-01-01\'), (22, \'N22\', \'A\', 14000, \'2020-01-01\'), (23, \'N23\', \'A\', 5000, \'2020-01-01\'), (24, \'N24\', \'A\', 26000, \'2020-01-01\'), (25, \'N25\', \'A\', 1000, \'2020-01-01\'), (26, \'N26\', \'A\', 18000, \'2020-01-01\'), (27, \'N27\', \'A\', 9000, \'2020-01-01\'), (28, \'N28\', \'A\', 16000, \'2020-01-01\'), (29, \'N29\', \'A\', 3000, \'2020-01-01\'), (30, \'N30\', \'A\', 14000, \'2020-01-01\'), (31, \'N31\', \'A\', 5000, \'2020-01-01\'), (32, \'N32\', \'A\', 22000, \'2020-01-01\'), (33, \'N33\', \'A\', 1000, \'2020-01-01\'), (34, \'N34\', \'A\', 23000, \'2020-01-01\'), (35, \'N35\', \'A\', 9000, \'2020-01-01\'), (36, \'N36\', \'A\', 20000, \'2020-01-01\'), (37, \'N37\', \'A\', 20000, \'2020-01-01\'), (38, \'N38\', \'A\', 20000, \'2020-01-01\'), (39, \'N39\', \'A\', 6000, \'2020-01-01\'), (40, \'N40\', \'B\', 7000, \'2020-01-01\'), (41, \'N41\', \'B\', 10000, \'2020-01-01\'), (42, \'N42\', \'B\', 2000, \'2020-01-01\'), (43, \'N43\', \'B\', 6000, \'2020-01-01\'), (44, \'N44\', \'B\', 18000, \'2020-01-01\'), (45, \'N45\', \'B\', 12000, \'2020-01-01\'), (46, \'N46\', \'B\', 5000, \'2020-01-01\'), (47, \'N47\', \'B\', 20000, \'2020-01-01\'), (48, \'N48\', \'B\', 30000, \'2020-01-01\'), (49, \'N49\', \'B\', 26000, \'2020-01-01\'), (50, \'N50\', \'B\', 5000, \'2020-01-01\'), (51, \'N51\', \'B\', 20000, \'2020-01-01\'), (52, \'N52\', \'B\', 24000, \'2020-01-01\'), (53, \'N53\', \'B\', 23000, \'2020-01-01\'), (54, \'N54\', \'B\', 1000, \'2020-01-01\'), (55, \'N55\', \'B\', 15000, \'2020-01-01\'), (56, \'N56\', \'B\', 9000, \'2020-01-01\'), (57, \'N57\', \'C\', 10000, \'2020-01-01\'), (58, \'N58\', \'C\', 11000, \'2020-01-01\'), (59, \'N59\', \'C\', 29000, \'2020-01-01\'), (60, \'N60\', \'C\', 1000, \'2020-01-01\'), (61, \'N61\', \'C\', 9000, \'2020-01-01\'), (62, \'N62\', \'C\', 18000, \'2020-01-01\'), (63, \'N63\', \'C\', 24000, \'2020-01-01\'), (64, \'N64\', \'C\', 19000, \'2020-01-01\'), (65, \'N65\', \'C\', 16000, \'2020-01-01\'), (66, \'N66\', \'C\', 28000, \'2020-01-01\'), (67, \'N67\', \'C\', 20000, \'2020-01-01\'), (68, \'N68\', \'C\', 24000, \'2020-01-01\'), (69, \'N69\', \'C\', 21000, \'2020-01-01\'), (70, \'N70\', \'C\', 12000, \'2020-01-01\'), (71, \'N71\', \'C\', 16000, \'2020-01-01\'), (72, \'N72\', \'C\', 23000, \'2020-01-01\'), (73, \'N73\', \'C\', 29000, \'2020-01-01\'), (74, \'N74\', \'C\', 14000, \'2020-01-01\'), (75, \'N75\', \'C\', 4000, \'2020-01-01\'), (76, \'N76\', \'C\', 30000, \'2020-01-01\'), (77, \'N77\', \'C\', 7000, \'2020-01-01\'), (78, \'N78\', \'C\', 8000, \'2020-01-01\'), (79, \'N79\', \'C\', 12000, \'2020-01-01\'), (80, \'N80\', \'C\', 16000, \'2020-01-01\'), (81, \'N81\', \'C\', 13000, \'2020-01-01\'), (82, \'N82\', \'C\', 5000, \'2020-01-01\'), (83, \'N83\', \'C\', 9000, \'2020-01-01\'), (84, \'N84\', \'C\', 10000, \'2020-01-01\'), (85, \'N85\', \'C\', 7000, \'2020-01-01\'), (86, \'N86\', \'C\', 14000, \'2020-01-01\'), (87, \'N87\', \'C\', 13000, \'2020-01-01\'), (88, \'N88\', \'C\', 25000, \'2020-01-01\'), (89, \'N89\', \'C\', 18000, \'2020-01-01\'), (90, \'N90\', \'C\', 13000, \'2020-01-01\'), (91, \'N91\', \'C\', 9000, \'2020-01-01\'), (92, \'N92\', \'C\', 24000, \'2020-01-01\'), (93, \'N93\', \'C\', 29000, \'2020-01-01\');', cols: ['dept', 'median_salary'], rows: [['A', 12000], ['B', 12000], ['C', 14000]] }
      ] },
    solution: {
      approach: `<p>Number salaries within each department and attach the department size. The one or two middle rows are selected with integer arithmetic and averaged. ROW_NUMBER (not RANK) is required so tied salaries still occupy distinct positions.</p>`,
      code: { lang: 'sql', db: 'hr', code: `WITH r AS (
  SELECT dept, salary,
         ROW_NUMBER() OVER (PARTITION BY dept ORDER BY salary, id) AS rn,
         COUNT(*)     OVER (PARTITION BY dept)                     AS c
  FROM employees
)
SELECT dept, AVG(salary) AS median_salary
FROM r
WHERE rn IN ((c + 1) / 2, (c + 2) / 2)
GROUP BY dept
ORDER BY dept;` },
      alt: [{ lang: 'sql', check: false, title: 'PostgreSQL / Oracle / Snowflake', code: `SELECT dept,
       PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY salary) AS median_salary
FROM employees
GROUP BY dept
ORDER BY dept;` }],
      complexity: `<p>O(N log N) sort + O(N). At warehouse scale, approximate medians (APPROX_PERCENTILE, t-digest) avoid a full sort.</p>`,
      followUps: ['Return employees whose salary is above their department median.', 'Compute the 90th percentile the same way.']
    }
  });

  practice.push({
    title: 'Forward-Fill Missing Sensor Readings',
    level: 'Hard', tags: ['window', 'count over', 'locf', 'ignore nulls emulation'], companies: ['Tesla', 'Siemens', 'Datadog'],
    statement: `<p>Table <code>readings(id, ts, reading)</code>; some readings are NULL because the sensor skipped a beat. Return <code>id, ts, reading, filled</code> where <code>filled</code> is the reading itself, or — if NULL — the most recent earlier non-NULL reading ("last observation carried forward"). SQLite has no <code>IGNORE NULLS</code>. Order by id.</p>`,
    constraints: `Up to 10<sup>8</sup> rows; the first row is not NULL.`,
    example: `${H.table(['id', 'reading', 'COUNT(reading) so far = grp', 'filled'], [['1', '20', '1', '20'], ['2', 'NULL', '<span class="c-b">1</span>', '<span class="c-g">20</span>'], ['3', 'NULL', '<span class="c-b">1</span>', '<span class="c-g">20</span>'], ['4', '23', '2', '23'], ['5', 'NULL', '<span class="c-b">2</span>', '<span class="c-g">23</span>']])}<p>COUNT(reading) ignores NULLs, so it only increases on real readings — every NULL shares the group of the reading before it.</p>`,
    brute: {
      why: `<p>For each row, a correlated subquery fetches the latest non-NULL reading at or before it (ORDER BY id DESC LIMIT 1). One index probe per row at best; without an index it rescans the table per row — O(N²).</p>`,
      code: { lang: 'sql', db: 'metrics', code: `SELECT r.id, r.ts, r.reading,
       (SELECT r2.reading FROM readings r2
        WHERE r2.id <= r.id AND r2.reading IS NOT NULL
        ORDER BY r2.id DESC LIMIT 1) AS filled
FROM readings r
ORDER BY r.id;` }
    },
    mcq: { q: 'Why does a running COUNT(reading) create the right groups?', options: ['COUNT counts NULLs as 0', 'COUNT(col) skips NULLs, so it only increments on real readings', 'COUNT resets after NULL', 'It does not; you need ROW_NUMBER'], answer: 1, explain: 'COUNT(column) counts non-NULL values only. The running count therefore stays flat across NULL rows, gluing them to the last real reading.' },
    hints: [
      `<p>Engines with IGNORE NULLS would use LAST_VALUE(reading IGNORE NULLS). Emulate it by building groups.</p>`,
      `<p>grp = COUNT(reading) OVER (ORDER BY id ROWS UNBOUNDED PRECEDING) — constant from a real reading until the next one.</p>`,
      `<p>Each group has exactly one non-NULL value, so filled = MAX(reading) OVER (PARTITION BY grp). Use two CTE levels.</p>`
    ],
    tests: { cmp: 'exact', engine: 'both', cases: [
        { cols: ['id', 'ts', 'reading', 'filled'], rows: [[1, '08:00', 20, 20], [2, '08:05', null, 20], [3, '08:10', null, 20], [4, '08:15', 23, 23], [5, '08:20', null, 23], [6, '08:25', 25, 25], [7, '08:30', null, 25]] },
        { setup: 'DELETE FROM readings; ', rows: [] },
        { setup: 'DELETE FROM readings; INSERT INTO readings VALUES (1, \'t1\', 5);', cols: ['id', 'ts', 'reading', 'filled'], rows: [[1, 't1', 5, 5]] },
        { setup: 'DELETE FROM readings; INSERT INTO readings VALUES (1, \'t1\', NULL), (2, \'t2\', NULL), (3, \'t3\', 3), (4, \'t4\', NULL);', cols: ['id', 'ts', 'reading', 'filled'], rows: [[1, 't1', null, null], [2, 't2', null, null], [3, 't3', 3, 3], [4, 't4', null, 3]] },
        { setup: 'DELETE FROM readings; INSERT INTO readings VALUES (1, \'t1\', NULL), (2, \'t2\', NULL), (3, \'t3\', NULL);', cols: ['id', 'ts', 'reading', 'filled'], rows: [[1, 't1', null, null], [2, 't2', null, null], [3, 't3', null, null]] },
        { setup: 'DELETE FROM readings; INSERT INTO readings VALUES (1, \'t1\', 10), (2, \'t2\', NULL), (3, \'t3\', 9), (4, \'t4\', NULL), (5, \'t5\', NULL), (6, \'t6\', 8), (7, \'t7\', NULL), (8, \'t8\', 1);', cols: ['id', 'ts', 'reading', 'filled'], rows: [[1, 't1', 10, 10], [2, 't2', null, 10], [3, 't3', 9, 9], [4, 't4', null, 9], [5, 't5', null, 9], [6, 't6', 8, 8], [7, 't7', null, 8], [8, 't8', 1, 1]] },
        { setup: 'DELETE FROM readings; INSERT INTO readings VALUES (1, \'t1\', 0), (2, \'t2\', NULL), (3, \'t3\', -5), (4, \'t4\', NULL), (5, \'t5\', -7), (6, \'t6\', -9), (7, \'t7\', NULL);', cols: ['id', 'ts', 'reading', 'filled'], rows: [[1, 't1', 0, 0], [2, 't2', null, 0], [3, 't3', -5, -5], [4, 't4', null, -5], [5, 't5', -7, -7], [6, 't6', -9, -9], [7, 't7', null, -9]] },
        { setup: 'DELETE FROM readings; INSERT INTO readings VALUES (1, \'t1\', 3), (2, \'t2\', 4), (3, \'t3\', 5), (4, \'t4\', 6);', cols: ['id', 'ts', 'reading', 'filled'], rows: [[1, 't1', 3, 3], [2, 't2', 4, 4], [3, 't3', 5, 5], [4, 't4', 6, 6]] },
        { setup: 'DELETE FROM readings; INSERT INTO readings VALUES (1, \'t1\', 50), (2, \'t2\', NULL), (3, \'t3\', NULL), (4, \'t4\', NULL), (5, \'t5\', 40), (6, \'t6\', NULL), (7, \'t7\', 60), (8, \'t8\', NULL);', cols: ['id', 'ts', 'reading', 'filled'], rows: [[1, 't1', 50, 50], [2, 't2', null, 50], [3, 't3', null, 50], [4, 't4', null, 50], [5, 't5', 40, 40], [6, 't6', null, 40], [7, 't7', 60, 60], [8, 't8', null, 60]] }
      ] },
    solution: {
      approach: `<p>Two windows: a running non-NULL count labels each "real reading + following NULLs" block; a partition MAX (or FIRST_VALUE) over that label broadcasts the real reading to the whole block.</p>`,
      code: { lang: 'sql', db: 'metrics', code: `WITH g AS (
  SELECT id, ts, reading,
         COUNT(reading) OVER (ORDER BY id ROWS UNBOUNDED PRECEDING) AS grp
  FROM readings
)
SELECT id, ts, reading,
       MAX(reading) OVER (PARTITION BY grp) AS filled
FROM g
ORDER BY id;` },
      alt: [{ lang: 'sql', check: false, title: 'Snowflake / BigQuery / Oracle / SQL Server 2022', code: `SELECT id, ts, reading,
       LAST_VALUE(reading IGNORE NULLS) OVER (ORDER BY id
         ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS filled
FROM readings
ORDER BY id;` }],
      complexity: `<p>Two O(N) passes after the sort by id. The correlated version is O(N log N) with an index and O(N²) without.</p>`,
      followUps: ['Forward-fill per sensor (add PARTITION BY sensor_id to both windows).', 'Fill with linear interpolation between neighbours instead.']
    }
  });

  /* =====================================================================
     QUIZ
     ===================================================================== */
  quiz.push(
    { q: 'What is the key difference between <code>SUM(salary) ... GROUP BY dept</code> and <code>SUM(salary) OVER (PARTITION BY dept)</code>?', options: ['They return different totals', 'GROUP BY returns one row per department; the window keeps every row and repeats the total on each', 'The window version is always slower', 'The window version ignores NULLs'], answer: 1, explain: 'Both compute the same department totals. GROUP BY collapses rows; a window function annotates each row without collapsing.' },
    { q: 'Why does <code>WHERE ROW_NUMBER() OVER (ORDER BY salary) = 1</code> fail?', options: ['ROW_NUMBER needs PARTITION BY', 'Window functions are evaluated after WHERE, so they cannot be used there', 'SQLite does not support ROW_NUMBER', 'It needs DESC'], answer: 1, explain: 'Logical order: FROM → WHERE → GROUP BY → HAVING → window → SELECT → ORDER BY. Compute the window in a CTE/subquery and filter outside.' },
    { q: 'Salaries 100, 100, 90. What does RANK() OVER (ORDER BY salary DESC) return?', options: ['1, 2, 3', '1, 1, 2', '1, 1, 3', '1, 1, 1'], answer: 2, explain: 'RANK gives ties the same rank and skips the following positions: 1, 1, 3. DENSE_RANK would give 1, 1, 2.' },
    { q: 'With <code>ORDER BY</code> but no frame clause, what frame do aggregate window functions use?', options: ['The whole partition', 'ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW', 'RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW (includes peers)', 'Only the current row'], answer: 2, explain: 'The SQL default is RANGE … CURRENT ROW, which includes all rows tied with the current row — the cause of running totals that "jump" on duplicate timestamps.' },
    { q: '<code>LAST_VALUE(name) OVER (PARTITION BY dept ORDER BY salary DESC, id)</code> returns what on each row?', options: ['The lowest earner of the department', 'The current row\'s name (the frame ends at the current row)', 'NULL', 'The top earner'], answer: 1, explain: 'The default frame stops at the current row, so the "last" row of the frame is the current row. Use ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING.' },
    { q: 'Which window gives a 7-day trailing sum including today on one-row-per-day data?', options: ['ROWS BETWEEN 7 PRECEDING AND CURRENT ROW', 'ROWS BETWEEN 6 PRECEDING AND CURRENT ROW', 'ROWS BETWEEN 6 PRECEDING AND 1 FOLLOWING', 'RANGE UNBOUNDED PRECEDING'], answer: 1, explain: '6 preceding rows + the current row = 7 rows. 7 PRECEDING is an 8-row window.' },
    { q: 'North has rows for 03-03 and 03-05 but not 03-04. What does <code>LAG(revenue) OVER (ORDER BY day)</code> return on 03-05?', options: ['NULL', '03-03\'s revenue', '0', 'An error'], answer: 1, explain: 'LAG is positional — it returns the previous row, which is 03-03. Check the date gap if you need "yesterday".' },
    { q: 'You need "top 3 per department, exactly 3 rows each, ties broken by seniority". Which is right?', options: ['DENSE_RANK() &lt;= 3', 'RANK() &lt;= 3', 'ROW_NUMBER() OVER (PARTITION BY dept ORDER BY salary DESC, hire_date) &lt;= 3', 'NTILE(3) = 1'], answer: 2, explain: 'Only ROW_NUMBER guarantees exactly N rows; the hire_date tiebreaker makes it deterministic and matches the stated rule.' },
    { q: 'NTILE(4) over 13 rows produces bucket sizes of…', options: ['4, 3, 3, 3', '3, 3, 3, 4', '3, 3, 3, 3 and one row unassigned', '4, 4, 4, 1'], answer: 0, explain: '⌊13/4⌋ = 3 per bucket; 13 mod 4 = 1 extra row goes to the first bucket.' },
    { q: 'For 4 rows with distinct values, CUME_DIST of the 2nd row (ordered) is…', options: ['0.25', '0.333', '0.5', '0.75'], answer: 2, explain: 'CUME_DIST = rows at or before the current row / N = 2 / 4 = 0.5. PERCENT_RANK would be (2 − 1)/(4 − 1) = 0.333.' },
    { q: 'In gaps-and-islands, which expression labels runs of consecutive dates per user?', options: ['ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY d)', 'julianday(d) − ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY d)', 'LAG(d) OVER (ORDER BY d)', 'DENSE_RANK() OVER (ORDER BY user_id)'], answer: 1, explain: 'Inside a run, date and row number both increase by 1, so their difference is constant; a gap changes it. Remove duplicate dates first.' },
    { q: '<code>RANGE BETWEEN 2 PRECEDING AND CURRENT ROW</code> ordered by <code>julianday(day)</code> on 03-06 with 03-04 missing includes…', options: ['03-03, 03-05, 03-06', '03-05 and 03-06 only', '03-04, 03-05, 03-06 with 03-04 as 0', 'Only 03-06'], answer: 1, explain: 'RANGE uses the value distance: days 03-04..03-06. 03-04 has no row, so only 03-05 and 03-06 are in the frame.' },
    { q: 'Which function ignores the frame clause?', options: ['SUM', 'LAST_VALUE', 'ROW_NUMBER', 'NTH_VALUE'], answer: 2, explain: 'Ranking (ROW_NUMBER, RANK, DENSE_RANK, NTILE, PERCENT_RANK, CUME_DIST) and navigation (LAG, LEAD) functions depend only on partition and order. Aggregates and FIRST/LAST/NTH_VALUE use the frame.' }
  );

  /* =====================================================================
     INTERVIEW Q&A
     ===================================================================== */
  interview.push(
    { q: 'What is a window function, and how is it different from GROUP BY?', level: 'B',
      a: `<p>A window function computes a value for each row using a set of related rows (its <b>window</b>) defined by <code>OVER (PARTITION BY … ORDER BY … frame)</code>. Unlike GROUP BY it does <b>not collapse</b> rows: 13 employees in → 13 rows out, each carrying e.g. its department total. GROUP BY returns one row per group and you lose the detail columns. Use windows when the question says "for each row, also show…", "rank within", "previous", "running" or "top N per".</p>`,
      followUps: ['Can you combine GROUP BY and a window function in the same query?', 'What does an empty OVER () mean?'] },
    { q: 'Explain ROW_NUMBER, RANK and DENSE_RANK with an example involving ties.', level: 'B',
      a: `<p>For salaries 120, 120, 110: <b>ROW_NUMBER</b> → 1, 2, 3 (always unique; tie order arbitrary unless you add a tiebreaker). <b>RANK</b> → 1, 1, 3 (ties share, then a gap — Olympic style). <b>DENSE_RANK</b> → 1, 1, 2 (ties share, no gap). I choose ROW_NUMBER for "exactly one row per group" (dedupe, latest record), RANK for competition leaderboards, and DENSE_RANK for "Nth highest distinct value".</p>`,
      followUps: ['Which one would you use for "second highest salary" and why?', 'How do you make ROW_NUMBER deterministic?'] },
    { q: 'Where in the logical query order are window functions evaluated, and what follows from that?', level: 'I',
      a: `<p>Order: FROM/JOIN → WHERE → GROUP BY → HAVING → <b>window functions</b> → SELECT → DISTINCT → ORDER BY → LIMIT. Consequences: (1) you cannot use a window function in WHERE, GROUP BY or HAVING — wrap it in a CTE and filter outside; (2) a window can wrap an aggregate, e.g. <code>SUM(SUM(x)) OVER ()</code> or <code>RANK() OVER (ORDER BY COUNT(*) DESC)</code>; (3) windows see only rows that survived WHERE; (4) the final ORDER BY may reference window results. Warehouses like Snowflake/BigQuery/DuckDB add QUALIFY for filtering on windows directly.</p>`,
      followUps: ['Rewrite a QUALIFY query for PostgreSQL.', 'Does LIMIT affect which rows a window sees?'] },
    { q: 'How do you get the top 3 earners per department?', level: 'I',
      a: `<p>Rank inside each department in a CTE, then filter: <code>WITH r AS (SELECT *, DENSE_RANK() OVER (PARTITION BY dept ORDER BY salary DESC) dr FROM employees) SELECT * FROM r WHERE dr &lt;= 3</code>. I first clarify ties: exactly 3 people → ROW_NUMBER with a tiebreaker; 3 places with ties included → RANK; top 3 distinct salaries → DENSE_RANK. Without window functions it is a correlated COUNT of higher salaries &lt; 3, which is O(N²) per department. For few groups on huge tables, a LATERAL join with an index on (dept, salary DESC) and LIMIT 3 can be faster.</p>`,
      followUps: ['How does PostgreSQL optimise rn &lt;= N filters?', 'How would you do it in MySQL 5.7?'] },
    { q: 'Write a running total and explain the ROWS vs RANGE difference.', level: 'I',
      a: `<p><code>SUM(amount) OVER (PARTITION BY account ORDER BY ts ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)</code>. If I omit the frame, the default is <b>RANGE</b> UNBOUNDED PRECEDING → CURRENT ROW, where "current row" includes all <b>peers</b> (same ts). Two transactions at the same timestamp would then show the same balance — the total "jumps". ROWS counts physical rows so every row gets its own value. Best practice: unique ORDER BY (add id) and explicit ROWS. On SQL Server ROWS is also faster because RANGE uses an on-disk spool.</p>`,
      followUps: ['When is RANGE actually the right choice?', 'How would you reset the running total every month?'] },
    { q: 'How would you compute month-over-month growth?', level: 'I',
      a: `<p>Aggregate to one row per month first, then use LAG: <code>WITH m AS (SELECT strftime('%Y-%m', d) mon, SUM(rev) rev FROM sales GROUP BY 1) SELECT mon, rev, ROUND(100.0*(rev - LAG(rev) OVER (ORDER BY mon)) / NULLIF(LAG(rev) OVER (ORDER BY mon), 0), 1) AS mom_pct FROM m</code>. Watch for: 100.0 to avoid integer division, NULLIF for zero months, PARTITION BY if per product, and missing months — LAG returns the previous <i>row</i>, so build a month spine (recursive CTE) if months can be empty.</p>`,
      followUps: ['Year-over-year for monthly data?', 'How do you handle a month with zero revenue?'] },
    { q: 'What is the LAST_VALUE trap?', level: 'I',
      a: `<p>With ORDER BY and no frame, the frame is RANGE UNBOUNDED PRECEDING → CURRENT ROW, so <code>LAST_VALUE(x)</code> returns the current row (or its last peer) — not the last row of the partition. Fix: <code>ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING</code>, or use <code>FIRST_VALUE</code> with the order reversed. NTH_VALUE has the same issue (it is NULL until the frame has n rows). FIRST_VALUE is safe because the frame always starts at the partition's first row.</p>`,
      followUps: ['What does NTH_VALUE(x, 3) return on the first row with the default frame?', 'How would you forward-fill NULLs without IGNORE NULLS?'] },
    { q: 'Explain ROWS, RANGE and GROUPS frames with an example where they differ.', level: 'A',
      a: `<p>Data (day, value): (1,100), (2,120), (3,90), (5,150), (5,20), (6,130). For <code>SUM(v) ... BETWEEN 1 PRECEDING AND CURRENT ROW</code> on the first day-5 row: <b>ROWS</b> = previous physical row + this row = 90 + 150 = 240; <b>RANGE</b> = rows with day in [4, 5] incl. peers = 150 + 20 = 170; <b>GROUPS</b> = previous peer group {3} + current group {5, 5} = 260. ROWS counts rows, RANGE measures distance in the ORDER BY value (needs a single numeric/date key), GROUPS counts distinct ORDER BY values. RANGE with offsets gives calendar-correct moving windows over gappy data. MySQL lacks GROUPS; SQL Server lacks numeric RANGE offsets.</p>`,
      followUps: ['What does EXCLUDE TIES do?', 'Why does RANGE with an offset need exactly one ORDER BY column?'] },
    { q: 'Solve "find users with 3+ consecutive login days" and explain the trick.', level: 'A',
      a: `<p>Gaps-and-islands: de-duplicate (user, date); compute <code>grp = julianday(date) − ROW_NUMBER() OVER (PARTITION BY user ORDER BY date)</code>. Within a run of consecutive dates both terms rise by 1, so grp is constant; any gap changes it. Then <code>GROUP BY user, grp HAVING COUNT(*) &gt;= 3</code>. De-duplication is essential: a repeated date bumps ROW_NUMBER without moving the date and splits the island. An alternative is LAG to flag "date ≠ previous + 1" and a running SUM of flags as the island id — the same pattern used for sessionization.</p>`,
      followUps: ['Return the longest streak per user.', 'How would you allow one missed day?'] },
    { q: 'How do you sessionize a clickstream with a 30-minute inactivity timeout in SQL?', level: 'A',
      a: `<p>Three steps: (1) <code>LAG(ts) OVER (PARTITION BY user ORDER BY ts)</code> to get the previous click; (2) flag = 1 if previous is NULL or the gap &gt; 30 min; (3) <code>SUM(flag) OVER (PARTITION BY user ORDER BY ts ROWS UNBOUNDED PRECEDING)</code> = session number. Then GROUP BY user, session for start, end, clicks, duration. It is one sort plus linear passes. In streaming systems this is a "session window" (Flink, Kafka Streams, Beam), which must also handle late events that can merge two sessions.</p>`,
      followUps: ['How would late-arriving events change your batch job?', 'How do you compute average session duration?'] },
    { q: 'How does a database execute window functions, and how do you make them fast?', level: 'A',
      a: `<p>The planner sorts input by (PARTITION BY keys, ORDER BY keys), then a window operator streams through each partition maintaining state: counters for ranking, a ring buffer for LAG/LEAD, an accumulator for running aggregates, and add/subtract ("inverse transition") for sliding SUM/AVG. Cost is O(N log N) for the sort + ~O(N). To speed up: an index on (partition, order) columns can remove the sort; reuse one window spec (named WINDOW) so several functions share one sort; filter rows early (WHERE before the window); avoid full-partition frames on giant partitions (memory/spill); in PostgreSQL look for WindowAgg and Sort in EXPLAIN, in SQL Server prefer ROWS over RANGE.</p>`,
      followUps: ['Why can sliding MAX be more expensive than sliding SUM?', 'What happens with two windows that have different PARTITION BY?'] },
    { q: 'Compute a median per group without PERCENTILE_CONT.', level: 'A',
      a: `<p>Use ROW_NUMBER and COUNT over the group: <code>rn = ROW_NUMBER() OVER (PARTITION BY g ORDER BY x, id)</code>, <code>c = COUNT(*) OVER (PARTITION BY g)</code>, keep <code>rn IN ((c+1)/2, (c+2)/2)</code> with integer division and AVG(x). Odd c selects one row, even c the two middle rows. ROW_NUMBER (not RANK) ensures tied values still occupy separate positions. On PostgreSQL/Snowflake use PERCENTILE_CONT(0.5) WITHIN GROUP; at warehouse scale use approximate sketches (t-digest/KLL) because exact percentiles need a full sort and are not mergeable.</p>`,
      followUps: ['Difference between PERCENTILE_CONT and PERCENTILE_DISC?', 'How would you compute a median over a 7-day sliding window?'] },
    { q: 'You inherit a dashboard query with ROW_NUMBER() = 1 that returns different results on each run. What is going on and how do you fix it?', level: 'E',
      a: `<p>The window ORDER BY is not unique, so rows tied on it are numbered in an implementation-dependent order that can change with parallelism, plan changes, replicas or data reloads. Fix: append a unique, business-meaningful tiebreaker (event id, ingestion sequence, primary key) and agree the rule with stakeholders. Add a data test (e.g. dbt) that asserts uniqueness of the ordering key per partition, and check other window functions sensitive to tie order (LAG/LEAD, FIRST_VALUE, NTILE, ROWS frames). RANK/DENSE_RANK are deterministic but may return multiple rows, which may be the honest answer.</p>`,
      followUps: ['Which window functions are deterministic even with ties?', 'How would you test this in CI?'] },
    { q: 'Window functions on a 5-billion-row event table in a distributed warehouse: what are the risks and how do you design for them?', level: 'E',
      a: `<p>A window requires all rows of a partition on one worker, sorted. Risks: <b>skew</b> (a single hot partition such as a bot user or NULL key overwhelms one node), <b>no partition</b> (<code>OVER ()</code> or global ORDER BY forces everything through one worker), huge full-frame buffers spilling to disk, and repeated sorts for different window specs. Mitigations: always partition by a high-cardinality key; pre-aggregate to the needed grain first (daily, per user); filter early and prune by date partitions; use incremental models so only new days are recomputed; prefer QUALIFY / rn filters that engines can push down; use approximate functions for percentiles; and isolate skewed keys. Validate with EXPLAIN/query profiles, checking spilled bytes and the slowest task.</p>`,
      followUps: ['How would you compute a global running total at this scale?', 'How do incremental models handle LAG across the incremental boundary?'] }
  );

  registerModule({
    id: 'sql06',
    title: 'Window Functions',
    lang: 'sql',
    intro: `<p>Window functions are the single most-asked "intermediate SQL" topic in data, backend and analytics interviews. They let every row <b>look at its neighbours</b> — its department, its previous day, the three rows before it — <b>without collapsing</b> rows the way GROUP BY does. Questions like <i>"rank employees within each department"</i>, <i>"running total of revenue"</i>, <i>"day-over-day change"</i>, <i>"top 3 per group"</i> and <i>"7-day moving average"</i> all become short, fast, one-pass queries.</p>
<p>In this module you will learn the <code>OVER (PARTITION BY ... ORDER BY ... frame)</code> clause from zero, see exactly how <code>ROW_NUMBER</code>, <code>RANK</code> and <code>DENSE_RANK</code> differ on ties, use <code>LAG</code>/<code>LEAD</code> for deltas, build running totals and moving averages, master frames (<code>ROWS</code> vs <code>RANGE</code> vs <code>GROUPS</code>), avoid the famous <code>LAST_VALUE</code> trap, bucket rows with <code>NTILE</code>, and solve the classic interview patterns: top-N per group, deduplication, gaps-and-islands and sessionization. Every query runs live (▶ Run) against three sample databases: <b>hr</b> (employees with salary ties), <b>shop</b> (orders and daily revenue with a missing day) and <b>metrics</b> (scores, logins, clicks, stadium visits).</p>
<p>For each pattern you will also see the old-school <b>self-join / correlated-subquery</b> version and why it is slower — interviewers love asking "how would you do this without window functions?".</p>`,
    goals: [
      'Explain in plain words how a window function differs from GROUP BY, and where it sits in the logical query order',
      'Pick ROW_NUMBER, RANK or DENSE_RANK correctly for any tie-handling requirement, and solve top-N-per-group in one CTE',
      'Write LAG/LEAD queries for day-over-day deltas, growth percentages and consecutive-row detection',
      'Build running totals and moving averages, and choose ROWS vs RANGE vs GROUPS frames (including calendar-correct windows with missing days)',
      'Avoid the LAST_VALUE default-frame trap and use FIRST_VALUE, NTH_VALUE, NTILE, PERCENT_RANK and CUME_DIST',
      'Solve hard interview patterns: gaps-and-islands, streaks, sessionization, median and dedupe-keep-latest'
    ],
    prereqs: `SQL 3 (Aggregates, GROUP BY, HAVING &amp; CASE) and SQL 5 (Subqueries, CTEs &amp; Recursive CTEs). Comfort with JOINs (SQL 4) helps for the brute-force comparisons. DSA 5 (Prefix Sums) and DSA 6 (Sliding Window) give useful intuition for running totals and moving frames.`,
    hours: 10,
    databases: DB,
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
