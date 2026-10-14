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
 (5,'b@x.io','pro','2024-02-03'),(6,'a@x.io','team','2024-02-15');`
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
