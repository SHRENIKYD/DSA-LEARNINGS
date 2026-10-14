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
<p><b>Cost.</b> All three are O(1) per row after the sort: the operator just keeps a counter, the previous row's ORDER BY values and (for RANK) the current position. The correlated-subquery equivalents — <code>1 + (SELECT COUNT(DISTINCT s2) ... WHERE s2 &gt; s1)</code> — are O(N²) per partition without an index and still O(N log N) per row lookups with one. On 10<sup>6</sup> rows that is the difference between seconds and hours.</p>`,
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
        var frames = [{ narr: 'N = ' + n + ' rows, k = ' + k + ' buckets. ⌊' + n + '/' + k + '⌋ = ' + base + ' rows each, and the first ' + extra + ' bucket(s) get one extra (' + n + ' mod ' + k + ' = ' + extra + '). Bucket sizes: <b>' + sizes.join(', ') + '</b>.', parts: [{ type: 'table', label: 'ORDER BY value DESC', columns: cols, rows: copyRows(rows) }, { type: 'bars', label: 'bucket sizes', values: sizes.slice(), idxLabels: sizes.map(function (s, q) { return 'b' + (q + 1); }) }] });
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
