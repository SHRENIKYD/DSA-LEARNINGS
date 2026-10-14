(function () {
  var topics = [], practice = [], quiz = [], interview = [];
  var DATABASES = {
    company: `CREATE TABLE departments (id INTEGER PRIMARY KEY, name TEXT NOT NULL, location TEXT NOT NULL);
CREATE TABLE employees (id INTEGER PRIMARY KEY, name TEXT NOT NULL, dept_id INTEGER REFERENCES departments(id), manager_id INTEGER REFERENCES employees(id), salary INTEGER NOT NULL, hire_date TEXT NOT NULL, title TEXT NOT NULL);
CREATE TABLE projects (id INTEGER PRIMARY KEY, name TEXT NOT NULL, dept_id INTEGER REFERENCES departments(id), budget INTEGER NOT NULL);
CREATE TABLE assignments (emp_id INTEGER REFERENCES employees(id), project_id INTEGER REFERENCES projects(id), hours INTEGER NOT NULL, PRIMARY KEY (emp_id, project_id));
INSERT INTO departments VALUES (1,'Engineering','Bengaluru'),(2,'Sales','Mumbai'),(3,'HR','Delhi'),(4,'Marketing','Mumbai'),(5,'Legal','Delhi');
INSERT INTO employees VALUES
 (1,'Asha',NULL,NULL,250000,'2015-01-10','CEO'),
 (2,'Ravi',1,1,180000,'2016-03-01','VP Engineering'),
 (3,'Meera',2,1,150000,'2016-07-15','VP Sales'),
 (4,'Karan',1,2,102000,'2018-02-20','Engineering Manager'),
 (5,'Divya',1,2,125000,'2018-05-11','Engineering Manager'),
 (6,'Arjun',1,4,95000,'2019-09-01','Engineer'),
 (7,'Neha',1,4,105000,'2020-01-06','Engineer'),
 (8,'Vikram',1,5,88000,'2021-04-12','Engineer'),
 (9,'Priya',1,5,105000,'2022-08-30','Engineer'),
 (10,'Rohan',2,3,70000,'2019-11-18','Sales Executive'),
 (11,'Sneha',2,3,82000,'2020-06-25','Sales Lead'),
 (12,'Imran',2,11,85000,'2023-02-14','Sales Associate'),
 (13,'Lata',3,1,90000,'2017-10-02','HR Head'),
 (14,'Tom',3,13,55000,'2022-03-21','HR Associate'),
 (15,'Zoya',4,1,98000,'2019-05-05','Marketing Head'),
 (16,'Dev',4,15,64000,'2024-01-15','Marketing Associate');
INSERT INTO projects VALUES (1,'Search Revamp',1,500000),(2,'Mobile App',1,750000),(3,'Q4 Campaign',4,200000),(4,'CRM Rollout',2,300000),(5,'Payroll Audit',3,80000),(6,'Data Lake',1,900000);
INSERT INTO assignments VALUES (6,1,120),(7,1,80),(7,2,60),(8,2,150),(9,2,90),(9,1,20),(4,1,40),(5,2,30),(10,4,100),(11,4,70),(15,3,50),(16,3,110),(14,5,60);`,
    shop: `CREATE TABLE customers (id INTEGER PRIMARY KEY, name TEXT NOT NULL, city TEXT NOT NULL, signup_date TEXT NOT NULL);
CREATE TABLE products (id INTEGER PRIMARY KEY, name TEXT NOT NULL, category TEXT NOT NULL, price INTEGER NOT NULL, tags TEXT);
CREATE TABLE orders (id INTEGER PRIMARY KEY, customer_id INTEGER REFERENCES customers(id), order_date TEXT NOT NULL, status TEXT NOT NULL);
CREATE TABLE order_items (order_id INTEGER REFERENCES orders(id), product_id INTEGER REFERENCES products(id), qty INTEGER NOT NULL, unit_price INTEGER NOT NULL, PRIMARY KEY (order_id, product_id));
INSERT INTO customers VALUES (1,'Asha','Pune','2024-01-05'),(2,'Ben','Mumbai','2024-02-11'),(3,'Chen','Delhi','2024-03-20'),(4,'Dana','Pune','2024-04-02'),(5,'Eli','Chennai','2024-05-15'),(6,'Fatima','Mumbai','2024-06-01');
INSERT INTO products VALUES
 (1,'Laptop','Electronics',1200,'work,portable,premium'),
 (2,'Phone','Electronics',800,'portable,premium'),
 (3,'Headphones','Electronics',150,'audio,portable'),
 (4,'Desk','Furniture',300,'work,wood'),
 (5,'Chair','Furniture',180,'work,ergonomic'),
 (6,'Lamp','Furniture',40,'home'),
 (7,'Novel','Books',15,'fiction'),
 (8,'Cookbook','Books',30,'home,food'),
 (9,'Atlas','Books',60,NULL);
INSERT INTO orders VALUES
 (101,1,'2024-07-01','delivered'),(102,1,'2024-07-15','delivered'),(103,2,'2024-07-03','delivered'),
 (104,3,'2024-07-04','cancelled'),(105,3,'2024-08-10','delivered'),(106,4,'2024-08-12','shipped'),
 (107,2,'2024-08-20','delivered'),(108,1,'2024-09-02','shipped'),(109,NULL,'2024-07-06','delivered');
INSERT INTO order_items VALUES
 (101,1,1,1200),(101,3,2,150),(102,7,3,15),(103,2,1,800),(103,6,2,40),(104,4,1,300),
 (105,5,2,180),(105,8,1,30),(106,1,1,1150),(106,6,1,40),(107,3,1,150),(107,7,2,15),
 (108,2,1,780),(108,4,1,300),(109,8,2,30);`,
    network: `CREATE TABLE categories (id INTEGER PRIMARY KEY, name TEXT NOT NULL, parent_id INTEGER REFERENCES categories(id));
CREATE TABLE routes (src TEXT NOT NULL, dst TEXT NOT NULL, cost INTEGER NOT NULL, PRIMARY KEY (src, dst));
CREATE TABLE bom (parent TEXT NOT NULL, child TEXT NOT NULL, qty INTEGER NOT NULL, PRIMARY KEY (parent, child));
CREATE TABLE part_costs (part TEXT PRIMARY KEY, unit_cost REAL NOT NULL);
INSERT INTO categories VALUES (1,'All',NULL),(2,'Electronics',1),(3,'Furniture',1),(4,'Phones',2),(5,'Laptops',2),(6,'Audio',2),(7,'Headphones',6),(8,'Speakers',6),(9,'Office',3),(10,'Chairs',9);
INSERT INTO routes VALUES ('DEL','BOM',100),('DEL','BLR',250),('BOM','BLR',80),('BOM','GOA',60),('GOA','BLR',50),('BLR','MAA',40),('MAA','DEL',200),('GOA','MAA',120);
INSERT INTO bom VALUES ('Bike','Frame',1),('Bike','Wheel',2),('Bike','Seat',1),('Wheel','Rim',1),('Wheel','Tire',1),('Wheel','Spoke',32),('Frame','Tube',3),('Frame','Bolt',6),('Seat','Bolt',2);
INSERT INTO part_costs VALUES ('Rim',20),('Tire',15),('Spoke',0.5),('Tube',10),('Bolt',0.25);`
  };

  /* ---------- shared data for the visualizers (mirrors DATABASES.company / shop / network exactly) ---------- */
  // [id, name, dept_id, manager_id, salary, title]
  var EMP = [
    [1, 'Asha', null, null, 250000, 'CEO'], [2, 'Ravi', 1, 1, 180000, 'VP Engineering'], [3, 'Meera', 2, 1, 150000, 'VP Sales'],
    [4, 'Karan', 1, 2, 102000, 'Engineering Manager'], [5, 'Divya', 1, 2, 125000, 'Engineering Manager'], [6, 'Arjun', 1, 4, 95000, 'Engineer'],
    [7, 'Neha', 1, 4, 105000, 'Engineer'], [8, 'Vikram', 1, 5, 88000, 'Engineer'], [9, 'Priya', 1, 5, 105000, 'Engineer'],
    [10, 'Rohan', 2, 3, 70000, 'Sales Executive'], [11, 'Sneha', 2, 3, 82000, 'Sales Lead'], [12, 'Imran', 2, 11, 85000, 'Sales Associate'],
    [13, 'Lata', 3, 1, 90000, 'HR Head'], [14, 'Tom', 3, 13, 55000, 'HR Associate'], [15, 'Zoya', 4, 1, 98000, 'Marketing Head'],
    [16, 'Dev', 4, 15, 64000, 'Marketing Associate']
  ];
  var DEPTS = [[1, 'Engineering', 'Bengaluru'], [2, 'Sales', 'Mumbai'], [3, 'HR', 'Delhi'], [4, 'Marketing', 'Mumbai'], [5, 'Legal', 'Delhi']];
  // org chart layout for graph parts (x 0..100, y 0..56)
  var ORGPOS = { 1: [50, 6], 2: [20, 20], 3: [54, 20], 13: [76, 20], 15: [93, 20], 4: [10, 34], 5: [30, 34], 10: [46, 34], 11: [60, 34], 14: [76, 34], 16: [93, 34], 6: [5, 48], 7: [15, 48], 8: [25, 48], 9: [35, 48], 12: [60, 48] };
  function nm(v) { return v === null || v === undefined ? 'NULL' : v; }
  function money(v) { return v === null ? 'NULL' : (Math.round(v * 100) / 100).toLocaleString('en-US'); }
  function empById(id) { for (var i = 0; i < EMP.length; i++) if (EMP[i][0] === id) return EMP[i]; return null; }
  function empRows(cols) { return EMP.map(function (e) { return cols.map(function (c) { return nm(e[c]); }); }); }
  function orgGraph(hl, label, ehl) {
    var nodes = EMP.map(function (e) { return { id: e[0], label: e[1], x: ORGPOS[e[0]][0], y: ORGPOS[e[0]][1], shape: 'box', w: 9.5 }; });
    var edges = EMP.filter(function (e) { return e[3] !== null; }).map(function (e) { return [e[3], e[0]]; });
    return { type: 'graph', label: label || 'Org chart (manager → report)', directed: true, height: 56, nodes: nodes, edges: edges, hl: hl || {}, ehl: ehl || {} };
  }

  /* =====================================================================
     TOPIC 1 — Subquery shapes: scalar, row, table (derived tables)
     ===================================================================== */
  topics.push({
    title: 'Subqueries 101: Scalar, Row & Table Subqueries',
    analogy: `<p>A teacher wants to praise every student who scored <b>above the class average</b>. She cannot do it in one breath. First she asks an assistant: <i>"What is the average?"</i> The assistant writes <b>72</b> on a sticky note. Only then does the teacher walk down the register comparing each mark with 72.</p>
<p>That sticky note is a <b>subquery</b>: a small question answered first, whose answer is plugged into the big question. If the assistant hands back a single number, it is a <b>scalar</b> subquery. If she hands back a whole worksheet ("average per section"), it is a <b>table</b> subquery the teacher can read from like any other table.</p>`,
    explain: `<p>A <b>subquery</b> (also called an <i>inner query</i> or <i>nested query</i>) is simply a <code>SELECT</code> written inside parentheses inside another SQL statement. The outer statement uses whatever the inner one returns. The secret to reading any subquery is to ask one question: <b>what SHAPE does it return?</b></p>
${H.table(['Shape', 'Returns', 'Where you can use it', 'Example'], [
  ['<b class="c-b">Scalar</b>', '1 row × 1 column (one value)', 'Anywhere a single value fits: SELECT list, WHERE, HAVING, ORDER BY, SET of an UPDATE', '<code>salary &gt; (SELECT AVG(salary) FROM employees)</code>'],
  ['<b class="c-g">Column / list</b>', 'many rows × 1 column', 'After <code>IN</code> / <code>NOT IN</code>, inside <code>EXISTS</code>', '<code>dept_id IN (SELECT id FROM departments WHERE location = \'Mumbai\')</code>'],
  ['<b class="c-y">Row</b>', '1 row × many columns', 'Compared to a row value <code>(a, b)</code>', '<code>(dept_id, title) = (SELECT dept_id, title FROM ...)</code>'],
  ['<b class="c-p">Table</b>', 'many rows × many columns', 'In <code>FROM</code> / <code>JOIN</code> as a <b>derived table</b> (give it an alias)', '<code>FROM (SELECT dept_id, AVG(salary) AS avg_sal ...) AS s</code>']
])}
<p><b>How it runs (mental model):</b> an <b>uncorrelated</b> subquery does not mention the outer query at all, so it can run <b>once</b>, before the outer query, and its result is reused for every outer row. (The next topic covers <i>correlated</i> subqueries, which do mention the outer row.)</p>
<p><b>Golden rules beginners trip on:</b></p>
<ul>
<li>A scalar subquery that finds <b>no row</b> gives <code>NULL</code>, and any comparison with NULL is <i>unknown</i> → the row is filtered out silently.</li>
<li>A scalar subquery that finds <b>two or more rows</b> is an error in PostgreSQL, SQL Server, MySQL and Oracle ("more than one row returned"). <b>SQLite does not complain — it quietly uses the first row.</b> Always make a scalar subquery provably single-row (aggregate, <code>LIMIT 1</code>, or filter on a unique key).</li>
<li>You cannot write <code>WHERE salary &gt; AVG(salary)</code>: aggregates are not allowed in WHERE because WHERE runs before grouping. The subquery is the fix — it computes the aggregate in its own little world.</li>
<li>A derived table (subquery in FROM) needs an alias in MySQL and most databases: <code>(...) AS s</code>. SQLite and PostgreSQL 16+ tolerate a missing alias, but always write one.</li>
</ul>`,
    clues: [
      '"…more than the <b>average</b> / the <b>maximum</b> / the <b>total</b>…" compared row by row → scalar subquery in WHERE',
      '"…than the company-wide figure" (one number for everyone) → uncorrelated, runs once',
      '"for each department compute X, then filter/join on X" → derived table (subquery in FROM) or CTE',
      '"same department AND same title as Priya" → row subquery <code>(a, b) = (SELECT a, b …)</code>',
      '"show each row next to the overall total / percentage of total" → scalar subquery in the SELECT list',
      'You are tempted to write an aggregate inside WHERE → you need a subquery (or HAVING / a window function)'
    ],
    code: [
      { lang: 'sql', db: 'company', title: 'Scalar subquery in WHERE — runs once, result reused', code: `-- Who earns more than the company-wide average salary?
-- Inner query: ONE value (109000). Outer query: compares every row with it.
SELECT name, title, salary
FROM employees
WHERE salary > (SELECT AVG(salary) FROM employees)   -- scalar subquery
ORDER BY salary DESC;` },
      { lang: 'sql', db: 'company', title: 'Scalar subquery in SELECT — show each row next to a global figure', code: `-- Each employee, the company average, and how far above/below it they are
SELECT name,
       salary,
       (SELECT ROUND(AVG(salary)) FROM employees)                  AS company_avg,
       salary - (SELECT ROUND(AVG(salary)) FROM employees)         AS diff,
       ROUND(100.0 * salary / (SELECT SUM(salary) FROM employees), 1) AS pct_of_payroll
FROM employees
ORDER BY diff DESC;` },
      { lang: 'sql', db: 'company', title: 'Table subquery (derived table) in FROM', code: `-- Step 1 (inner): one row per department with headcount and average salary
-- Step 2 (outer): join to departments for the name, keep only well-paid departments
SELECT d.name, s.headcount, s.avg_salary
FROM (
        SELECT dept_id,
               COUNT(*)             AS headcount,
               ROUND(AVG(salary))   AS avg_salary
        FROM employees
        WHERE dept_id IS NOT NULL      -- the CEO has no department
        GROUP BY dept_id
     ) AS s                            -- derived tables need an alias
JOIN departments d ON d.id = s.dept_id
WHERE s.avg_salary > 80000
ORDER BY s.avg_salary DESC;` }
    ],
    codeTitle: ['Scalar subquery (WHERE)', 'Scalar subquery (SELECT list)', 'Derived table (FROM)'],
    viz: [{
      title: 'Scalar subquery: inner query runs once, outer query compares every row',
      input: 'AVG >',
      inputLabel: 'Aggregate and operator (AVG|MAX|MIN, then > >= < <= =)',
      gen: function (input) {
        var m = String(input || '').trim().toUpperCase().match(/^(AVG|MAX|MIN)\s*(>=|<=|>|<|=)$/);
        if (!m) throw new Error('Type something like "AVG >" or "MIN =" or "MAX <"');
        var agg = m[1], op = m[2];
        var sal = EMP.map(function (e) { return e[4]; });
        var val = agg === 'AVG' ? sal.reduce(function (a, b) { return a + b; }, 0) / sal.length : agg === 'MAX' ? Math.max.apply(null, sal) : Math.min.apply(null, sal);
        var cmp = function (x) { return op === '>' ? x > val : op === '>=' ? x >= val : op === '<' ? x < val : op === '<=' ? x <= val : x === val; };
        var sql = 'SELECT name, salary\nFROM employees\nWHERE salary ' + op + ' (\n  SELECT ' + agg + '(salary) FROM employees\n);';
        var rows = empRows([0, 1, 4]);
        var frames = [];
        frames.push({ narr: 'The query has two layers. The part in parentheses is the <b>inner query</b>. It never mentions the outer row, so it is <b>uncorrelated</b>: the engine can run it <b>once</b> up front.', parts: [
          { type: 'code', label: 'Query', lang: 'sql', code: sql, hl: { 4: 'cur' } },
          { type: 'table', label: 'employees (16 rows)', columns: ['id', 'name', 'salary'], rows: rows }
        ] });
        var allHl = {}; rows.forEach(function (r, i) { allHl[i] = 'win'; });
        frames.push({ narr: 'Step 1 — run the inner query: <code>' + agg + '(salary)</code> over all 16 rows. The result is a <b>1 × 1 table</b> — a single value, so it can sit anywhere a number can.', parts: [
          { type: 'code', label: 'Query', lang: 'sql', code: sql, hl: { 4: 'ok' } },
          { type: 'table', label: 'employees — all rows feed the aggregate', columns: ['id', 'name', 'salary'], rows: rows, hl: allHl },
          { type: 'table', label: 'Inner query result (scalar)', columns: [agg + '(salary)'], rows: [[money(val)]], hl: { 0: 'sel' } },
          { type: 'vars', label: 'Work done', vals: { inner_query_runs: 1 }, hl: { inner_query_runs: 'ok' } }
        ] });
        var hl = {}, kept = [];
        for (var i = 0; i < EMP.length; i++) {
          var ok = cmp(EMP[i][4]);
          hl[i] = 'cur';
          if (ok) kept.push([EMP[i][1], money(EMP[i][4])]);
          frames.push({ narr: 'Outer row ' + (i + 1) + ': <b>' + EMP[i][1] + '</b> earns ' + money(EMP[i][4]) + '. Is ' + money(EMP[i][4]) + ' ' + op + ' ' + money(val) + '? ' + (ok ? '<span class="c-g">TRUE → keep</span>' : '<span class="c-r">FALSE → drop</span>') + '. Notice the inner query is <b>not</b> re-run — the sticky note is reused.', parts: [
            { type: 'code', label: 'Query', lang: 'sql', code: sql, hl: { 3: 'cur' } },
            { type: 'table', label: 'employees (outer scan)', columns: ['id', 'name', 'salary'], rows: rows, hl: JSON.parse(JSON.stringify(hl)) },
            { type: 'vars', label: 'Comparison', vals: { salary: EMP[i][4], scalar: money(val), result: ok ? 'TRUE' : 'FALSE', inner_query_runs: 1 }, hl: { result: ok ? 'ok' : 'bad' } },
            { type: 'table', label: 'Result so far', columns: ['name', 'salary'], rows: kept.slice() }
          ] });
          hl[i] = ok ? 'ok' : 'done';
        }
        frames.push({ narr: 'Done: <b>' + kept.length + '</b> row(s) pass. Total work: the inner query ran once (16 reads) + the outer scan (16 reads). That is why uncorrelated subqueries are cheap.', parts: [
          { type: 'table', label: 'Final result', columns: ['name', 'salary'], rows: kept, hl: (function () { var h = {}; kept.forEach(function (r, k) { h[k] = 'sel'; }); return h; })() },
          { type: 'text', label: 'Remember', html: 'A scalar subquery that returns <b>0 rows</b> becomes NULL (every comparison is unknown → nothing passes). One that returns <b>2+ rows</b> is an error in PostgreSQL/MySQL — SQLite silently takes the first row.' }
        ] });
        return frames;
      }
    }, {
      title: 'Derived table: inner result becomes a temporary table for the outer query',
      input: '80000',
      inputLabel: 'Keep departments whose average salary is above…',
      gen: function (input) {
        var th = Number(String(input).trim());
        if (!isFinite(th)) throw new Error('Enter one number, e.g. 80000');
        var sql = 'SELECT d.name, s.headcount, s.avg_salary\nFROM (SELECT dept_id, COUNT(*) AS headcount,\n             ROUND(AVG(salary)) AS avg_salary\n      FROM employees WHERE dept_id IS NOT NULL\n      GROUP BY dept_id) AS s\nJOIN departments d ON d.id = s.dept_id\nWHERE s.avg_salary > ' + th + ';';
        var frames = [];
        var rows = empRows([1, 2, 4]);
        frames.push({ narr: 'A subquery in <b>FROM</b> is a <b>derived table</b>: SQL builds the inner result first and then treats it exactly like a normal table named <code>s</code>.', parts: [
          { type: 'code', label: 'Query', lang: 'sql', code: sql, hl: { 2: 'cur', 3: 'cur', 4: 'cur', 5: 'cur' } },
          { type: 'table', label: 'employees', columns: ['name', 'dept_id', 'salary'], rows: rows }
        ] });
        var h0 = {}; EMP.forEach(function (e, i) { if (e[2] === null) h0[i] = 'bad'; });
        frames.push({ narr: 'Inner WHERE: <code>dept_id IS NOT NULL</code> removes Asha (the CEO has no department). Without it we would get a group with dept_id = NULL.', parts: [
          { type: 'code', label: 'Query', lang: 'sql', code: sql, hl: { 4: 'cur' } },
          { type: 'table', label: 'employees', columns: ['name', 'dept_id', 'salary'], rows: rows, hl: h0 }
        ] });
        var groups = {};
        EMP.forEach(function (e) { if (e[2] !== null) { (groups[e[2]] = groups[e[2]] || []).push(e[4]); } });
        var s = Object.keys(groups).map(function (k) { var g = groups[k]; return [Number(k), g.length, Math.round(g.reduce(function (a, b) { return a + b; }, 0) / g.length)]; });
        frames.push({ narr: 'Inner GROUP BY dept_id collapses the rows into one row per department. This little table is <b>s</b> — it exists only while this query runs.', parts: [
          { type: 'code', label: 'Query', lang: 'sql', code: sql, hl: { 5: 'ok' } },
          { type: 'table', label: 'Derived table s (inner result)', columns: ['dept_id', 'headcount', 'avg_salary'], rows: s, hl: { 0: 'ok', 1: 'ok', 2: 'ok', 3: 'ok' } }
        ] });
        var joined = s.map(function (r) { var d = DEPTS[r[0] - 1]; return [d[1], r[1], r[2]]; });
        frames.push({ narr: 'Outer query: <code>JOIN departments</code> on <code>d.id = s.dept_id</code> fetches the department name. Legal (id 5) has no row in s, so the inner join drops it.', parts: [
          { type: 'code', label: 'Query', lang: 'sql', code: sql, hl: { 6: 'cur' } },
          { type: 'table', label: 'departments', columns: ['id', 'name'], rows: DEPTS.map(function (d) { return [d[0], d[1]]; }), hl: { 4: 'bad' } },
          { type: 'table', label: 's JOIN departments', columns: ['d.name', 'headcount', 'avg_salary'], rows: joined }
        ] });
        var fh = {}, out = [];
        joined.forEach(function (r, i) { var ok = r[2] > th; fh[i] = ok ? 'ok' : 'bad'; if (ok) out.push(r); });
        frames.push({ narr: 'Outer WHERE <code>s.avg_salary &gt; ' + th + '</code> filters the derived rows — something you could <b>not</b> do in the inner WHERE, because the average did not exist yet there.', parts: [
          { type: 'code', label: 'Query', lang: 'sql', code: sql, hl: { 7: 'cur' } },
          { type: 'table', label: 's JOIN departments', columns: ['d.name', 'headcount', 'avg_salary'], rows: joined, hl: fh }
        ] });
        frames.push({ narr: 'Final result: ' + out.length + ' department(s). Rule of thumb: <b>aggregate inside, filter outside</b>. (HAVING could also do this; derived tables shine when you need to JOIN the aggregated rows to something else.)', parts: [
          { type: 'table', label: 'Result', columns: ['name', 'headcount', 'avg_salary'], rows: out, hl: (function () { var h = {}; out.forEach(function (r, k) { h[k] = 'sel'; }); return h; })() }
        ] });
        return frames;
      }
    }],
    examples: [
      { title: 'Scalar subquery in WHERE: above the company average', html: `<p>The average of all 16 salaries is <b>109,000</b> (1,744,000 / 16). The inner query returns exactly that one value, and the outer query keeps Asha (250k), Ravi (180k), Meera (150k) and Divya (125k). Neha and Priya at 105k just miss, and Karan (102k) is further below.</p>${H.table(['name', 'salary', '&gt; 109,000 ?'], [['Asha', '250000', '<span class="c-g">yes</span>'], ['Divya', '125000', '<span class="c-g">yes</span>'], ['Neha', '105000', '<span class="c-r">no</span>'], ['Karan', '102000', '<span class="c-r">no</span>']])}`, code: { lang: 'sql', db: 'company', code: `SELECT name, salary
FROM employees
WHERE salary > (SELECT AVG(salary) FROM employees)
ORDER BY salary DESC;` } },
      { title: 'Row subquery: same department AND same title as Priya', html: `<p>A <b>row value</b> <code>(dept_id, title)</code> is compared with a one-row, two-column subquery. Both columns must match together. Priya is an Engineer in dept 1, so we get Arjun, Neha and Vikram. SQLite has supported row values since 3.15; PostgreSQL, MySQL and Oracle support them too (SQL Server does not — use two conditions or EXISTS there).</p>`, code: { lang: 'sql', db: 'company', code: `SELECT name, title
FROM employees
WHERE (dept_id, title) = (SELECT dept_id, title FROM employees WHERE name = 'Priya')
  AND name <> 'Priya';` } },
      { title: 'Subquery in HAVING: departments paid above the company average', html: `<p>HAVING filters <b>groups</b>. The scalar subquery gives the company average (109,000) and each group average is compared with it. Only Engineering (114,286) passes; Sales (96,750) does not. Note the NULL group (the CEO alone, 250,000) also passes — a reminder to filter <code>dept_id IS NOT NULL</code> when you mean "real departments".</p>`, code: { lang: 'sql', db: 'company', code: `SELECT dept_id, ROUND(AVG(salary)) AS dept_avg
FROM employees
WHERE dept_id IS NOT NULL
GROUP BY dept_id
HAVING AVG(salary) > (SELECT AVG(salary) FROM employees);` } },
      { title: 'Percentage of total with a scalar subquery', html: `<p>"What share of total revenue does each product category bring?" The denominator is one number for everyone → a scalar subquery. Electronics dominates because of laptops and phones. Cancelled orders are excluded in <i>both</i> numerator and denominator — a classic interview detail.</p>`, code: { lang: 'sql', db: 'shop', code: `SELECT p.category,
       SUM(oi.qty * oi.unit_price) AS revenue,
       ROUND(100.0 * SUM(oi.qty * oi.unit_price) /
             (SELECT SUM(oi2.qty * oi2.unit_price)
              FROM order_items oi2 JOIN orders o2 ON o2.id = oi2.order_id
              WHERE o2.status <> 'cancelled'), 1) AS pct_of_revenue
FROM order_items oi
JOIN orders o   ON o.id = oi.order_id
JOIN products p ON p.id = oi.product_id
WHERE o.status <> 'cancelled'
GROUP BY p.category
ORDER BY revenue DESC;` } },
      { title: 'The silent multi-row trap (SQLite vs PostgreSQL)', html: `<p>This scalar subquery returns <b>16 rows</b>. PostgreSQL raises <i>"more than one row returned by a subquery used as an expression"</i>. SQLite silently returns the first row it produced (here the lowest salary, Tom). Same SQL, different behaviour — so make single-row-ness explicit with an aggregate, a unique key or <code>LIMIT 1</code>.</p>`, code: { lang: 'sql', db: 'company', code: `-- Works in SQLite (returns 'Tom'), ERROR in PostgreSQL / MySQL / SQL Server
SELECT (SELECT name FROM employees ORDER BY salary) AS who;

-- Safe version: provably one row
SELECT (SELECT name FROM employees ORDER BY salary LIMIT 1) AS lowest_paid;` } }
    ],
    deepDive: `<p><b>Logical vs physical.</b> Logically an uncorrelated subquery is evaluated once and its result substituted. Physically, optimizers go further: PostgreSQL turns an uncorrelated scalar subquery into an <i>InitPlan</i> (run once, stored in a parameter <code>$0</code>); SQLite compiles it into a subroutine guarded by a "run once" flag (you will see <code>SCALAR SUBQUERY</code> in <code>EXPLAIN QUERY PLAN</code>); SQL Server may spool it.</p>
<p><b>Derived tables are usually inlined.</b> Most engines "flatten" a simple subquery in FROM into the outer query (SQLite's <i>query flattener</i>, PostgreSQL's <i>subquery pull-up</i>), so writing <code>SELECT * FROM (SELECT * FROM t WHERE a = 1) s WHERE b = 2</code> costs the same as one WHERE with both conditions, and indexes on <code>a</code> and <code>b</code> still work. Flattening is blocked by things like aggregates + joins in certain shapes, <code>LIMIT</code>, <code>DISTINCT</code> or window functions inside the subquery; then the inner result is <b>materialized</b> into a temp structure (SQLite: <code>MATERIALIZE</code> / <code>CO-ROUTINE</code> in the plan), which can lose index access.</p>
<p><b>NULL semantics.</b> An empty scalar subquery returns NULL, not 0. So <code>salary &gt; (SELECT MAX(salary) FROM employees WHERE dept_id = 99)</code> filters <i>everything</i> out. Wrap with <code>COALESCE(…, 0)</code> when "nothing" should mean zero.</p>
<p><b>Row values</b> compare lexicographically for <code>&lt;</code>/<code>&gt;</code>: <code>(a, b) &gt; (1, 5)</code> means <code>a &gt; 1 OR (a = 1 AND b &gt; 5)</code> — the foundation of fast <b>keyset pagination</b> (<code>WHERE (created_at, id) &gt; (?, ?) ORDER BY created_at, id LIMIT 20</code>).</p>
<p><b>Types.</b> <code>AVG</code> returns a float in SQLite even over integers; integer division (<code>SUM(x) / COUNT(*)</code>) truncates. Multiply by <code>100.0</code> before dividing for percentages.</p>`,
    aiEra: `<p><b>What AI changes:</b> an assistant writes "above average" style queries instantly and usually correctly. The value you add is <b>shape reasoning</b>: knowing whether the subquery returns one value, one row or many, and what happens with zero or two rows.</p>
<p><b>Use AI as a partner:</b> ask <code>For this query, list every subquery and the exact shape (rows × columns) it can return, including the empty case</code>. Ask it to <code>rewrite this derived table as a CTE and as a window function, then explain which one the planner is likely to flatten</code>. Paste <code>EXPLAIN QUERY PLAN</code> output and ask what <code>SCALAR SUBQUERY</code> or <code>MATERIALIZE</code> means.</p>
<p><b>Where AI goes wrong:</b> it writes scalar subqueries that are not provably single-row (fine in SQLite during testing, crashes in PostgreSQL in production); forgets the alias on derived tables for MySQL; forgets that an empty subquery yields NULL; and mixes dialect features (row values in SQL Server, <code>ANY/ALL</code> in SQLite).</p>
<p><b>What you must still own:</b> naming the shape, choosing between subquery, join and window, and checking the edge cases (NULLs, ties, empty groups) against real data before shipping.</p>`,
    problems: [{
      title: 'Products Priced Above the Store Average',
      level: 'Easy', tags: ['scalar subquery', 'aggregate'], companies: ['Amazon', 'Flipkart'],
      statement: `<p>Using the <code>shop</code> database, list the <b>name</b>, <b>category</b> and <b>price</b> of every product whose price is strictly greater than the <b>average price of all products</b>. Sort by price, highest first. The query must stay correct when prices change tomorrow.</p>`,
      constraints: `<p>Table <code>products(id, name, category, price, tags)</code>. Average of the current 9 prices = 2775 / 9 ≈ 308.33.</p>`,
      example: `<p>Average price ≈ <b>308.33</b>.</p>${H.table(['name', 'price', 'kept?'], [['Laptop', '1200', '<span class="c-g">yes</span>'], ['Phone', '800', '<span class="c-g">yes</span>'], ['Desk', '300', '<span class="c-r">no — just below</span>'], ['Chair', '180', '<span class="c-r">no</span>']])}<p>Only <b>Laptop</b> and <b>Phone</b> qualify.</p>`,
      brute: { why: `<p>The naive approach runs two queries by hand: first compute the average, then <b>paste the number</b> into a second query. It works today, but the moment a price changes the hard-coded 308.33 is stale and the report is silently wrong. (Writing <code>WHERE price &gt; AVG(price)</code> is not even legal — aggregates are not allowed in WHERE.)</p>`, code: { lang: 'sql', db: 'shop', code: `-- Step 1: run this, read the number by eye
SELECT AVG(price) FROM products;
-- Step 2: hard-code it (stale as soon as data changes!)
SELECT name, category, price FROM products WHERE price > 308.33 ORDER BY price DESC;` } },
      mcq: { q: 'Why can you NOT write <code>WHERE price &gt; AVG(price)</code>?', options: ['WHERE runs row by row before any grouping, so no aggregate exists yet', 'AVG only works on integers', 'Because price is a reserved word', 'It works but is slow'], answer: 0, explain: 'Logical order is FROM → WHERE → GROUP BY → HAVING → SELECT. Aggregates are computed after WHERE, so WHERE cannot reference them; a scalar subquery computes the aggregate separately.' },
      hints: [`<p>Hint 1: You need one number (the average) computed over the whole table, then a per-row comparison. That is a "one value for everyone" situation.</p>`, `<p>Hint 2: Put <code>(SELECT AVG(price) FROM products)</code> exactly where you would have typed 308.33. It is uncorrelated, so it runs once.</p>`, `<p>Hint 3: Use strict <code>&gt;</code>. If the table were empty, AVG returns NULL and nothing is returned — which is correct. Recipe: SELECT columns → FROM products → WHERE price &gt; (scalar subquery) → ORDER BY price DESC.</p>`],
      solution: {
        approach: `<p>Replace the hard-coded number with an uncorrelated <b>scalar subquery</b>. The engine computes the average once and compares every product against it, so the query is always up to date.</p>`,
        code: { lang: 'sql', db: 'shop', code: `SELECT name, category, price
FROM products
WHERE price > (SELECT AVG(price) FROM products)  -- one value, computed once
ORDER BY price DESC;` },
        dry: { head: ['step', 'what happens', 'value / rows'], rows: [['1', 'inner: AVG(price) over 9 products', '308.33'], ['2', 'outer: Laptop 1200 &gt; 308.33', '<span class="c-g">keep</span>'], ['3', 'outer: Phone 800 &gt; 308.33', '<span class="c-g">keep</span>'], ['4', 'outer: Desk 300 &gt; 308.33', '<span class="c-r">drop</span>'], ['5', 'ORDER BY price DESC', 'Laptop, Phone']] },
        complexity: `<p>One pass to compute the average + one pass to filter: O(N) reads, O(1) extra memory. With an index on <code>price</code> the outer filter can become a range scan.</p>`,
        followUps: ['Show products above the average of <b>their own category</b> (correlated — next topic).', 'Also display how much above average each product is.', 'What does the query return if the products table is empty?']
      }
    }]
  });

  /* =====================================================================
     TOPIC 2 — Correlated subqueries
     ===================================================================== */
  topics.push({
    title: 'Correlated Subqueries: The Inner Query That Re-runs for Every Row',
    analogy: `<p>A school inspector walks down the line of students. For each child she asks: <i>"Is your mark above the average of <b>your own</b> class?"</i> She cannot carry one sticky note for everybody, because each child belongs to a different class. So for every child she quickly flips to that child's class register and works out its average again.</p>
<p>That per-child lookup is a <b>correlated subquery</b>: the inner question <b>depends on the current outer row</b> (which class this child is in), so conceptually it is asked once per row.</p>`,
    explain: `<p>A subquery is <b>correlated</b> when it refers to a column of the <b>outer</b> query. Look for an outer alias inside the parentheses:</p>
<pre>SELECT e.name, e.salary
FROM employees e                                  -- outer row = e
WHERE e.salary &gt; (SELECT AVG(e2.salary)
                  FROM employees e2
                  WHERE e2.dept_id = <b>e.dept_id</b>)   -- uses the OUTER row</pre>
<p><b>Mental model:</b> for each outer row, plug its values into the inner query, run it, use the answer, move on — like a <code>for</code> loop with a function call inside. Uncorrelated = "compute once". Correlated = "compute per row (or per distinct value)".</p>
${H.table(['Outer row e', 'e.dept_id', 'Inner query becomes…', 'Answer', 'Keep?'], [
  ['Ravi 180000', '1', 'AVG(salary) WHERE dept_id = 1', '114,286', '<span class="c-g">yes</span>'],
  ['Karan 102000', '1', 'AVG(salary) WHERE dept_id = 1', '114,286', '<span class="c-r">no</span>'],
  ['Meera 150000', '2', 'AVG(salary) WHERE dept_id = 2', '96,750', '<span class="c-g">yes</span>'],
  ['Asha 250000', 'NULL', 'AVG(salary) WHERE dept_id = NULL', 'NULL (no rows)', '<span class="c-r">no — unknown</span>']
])}
<p><b>Where correlated subqueries show up in interviews:</b></p>
<ul>
<li><b>Compare with your own group:</b> "above <i>their department's</i> average", "the most expensive product <i>in each category</i>".</li>
<li><b>Compare with a related row:</b> "employees who earn more than <i>their manager</i>" (inner query looks up the manager by <code>e.manager_id</code>).</li>
<li><b>Per-row lookups in SELECT:</b> "each customer with their number of orders / last order date".</li>
<li><b>Rank without window functions:</b> "top 2 salaries per department" = rows with fewer than 2 distinct higher salaries in the same department.</li>
<li><b>Existence checks:</b> <code>EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.id)</code> — the most common correlated subquery of all (next topic).</li>
</ul>
<p><b>Scoping rule (a classic bug):</b> an unqualified column inside the subquery is looked up in the <b>inner</b> tables first, then outward. If you write <code>WHERE m.id = manager_id</code> inside <code>FROM employees m</code>, <code>manager_id</code> silently binds to <b>m.manager_id</b>, not the outer row's. Always qualify columns with aliases in correlated subqueries.</p>`,
    clues: [
      '"…than <b>their own</b> department / category / team average" → correlated subquery (or window function)',
      '"employees who earn more than <b>their manager</b>" → correlated lookup by <code>manager_id</code> (or a self join)',
      '"for each customer, show their latest order / number of orders" → correlated scalar subquery in SELECT',
      '"top N per group" and window functions are not allowed / not available → correlated COUNT of rows above me',
      '"customers who have (no) orders" → correlated EXISTS / NOT EXISTS',
      'Table has millions of rows and the query is slow → check the correlated column is indexed, or decorrelate into a JOIN'
    ],
    code: [
      { lang: 'sql', db: 'company', title: 'Above their own department average', code: `-- For each employee e, the inner query re-runs with e.dept_id plugged in
SELECT e.name, e.dept_id, e.salary
FROM employees e
WHERE e.salary > (
        SELECT AVG(e2.salary)
        FROM employees e2
        WHERE e2.dept_id = e.dept_id      -- correlation: depends on the outer row
      )
ORDER BY e.dept_id, e.salary DESC;` },
      { lang: 'sql', db: 'company', title: 'Highest-paid employee(s) in each department (keeps ties)', code: `SELECT d.name AS department, e.name, e.salary
FROM employees e
JOIN departments d ON d.id = e.dept_id
WHERE e.salary = (SELECT MAX(e2.salary)
                  FROM employees e2
                  WHERE e2.dept_id = e.dept_id)
ORDER BY d.name;` },
      { lang: 'sql', db: 'company', title: 'Top 2 distinct salaries per department without window functions', code: `-- Keep a row if fewer than 2 DISTINCT salaries in its department are higher than it
SELECT e.dept_id, e.name, e.salary
FROM employees e
WHERE e.dept_id IS NOT NULL
  AND (SELECT COUNT(DISTINCT x.salary)
       FROM employees x
       WHERE x.dept_id = e.dept_id
         AND x.salary  > e.salary) < 2
ORDER BY e.dept_id, e.salary DESC;` }
    ],
    codeTitle: ['Per-group comparison', 'Max per group', 'Top-N per group (classic)'],
    viz: {
      title: 'Correlated subquery: the inner query is re-evaluated for every outer row',
      input: 'AVG',
      inputLabel: 'Inner aggregate per department: AVG (above dept average) or MAX (top earner)',
      gen: function (input) {
        var agg = String(input || '').trim().toUpperCase();
        if (agg !== 'AVG' && agg !== 'MAX') throw new Error('Type AVG or MAX');
        var op = agg === 'AVG' ? '>' : '=';
        var sql = 'SELECT e.name, e.salary\nFROM employees e\nWHERE e.salary ' + op + ' (\n  SELECT ' + agg + '(e2.salary)\n  FROM employees e2\n  WHERE e2.dept_id = e.dept_id\n);';
        var outer = empRows([1, 2, 4]);
        var frames = [], hl = {}, kept = [], runs = 0, reads = 0, cache = [];
        frames.push({ narr: 'The inner query mentions <code>e.dept_id</code> — a column of the <b>outer</b> row. So it cannot be computed once; conceptually it re-runs for every one of the 16 employees.', parts: [
          { type: 'code', label: 'Query', lang: 'sql', code: sql, hl: { 6: 'cur' } },
          { type: 'table', label: 'employees e (outer)', columns: ['name', 'dept_id', 'salary'], rows: outer }
        ] });
        for (var i = 0; i < EMP.length; i++) {
          var e = EMP[i], d = e[2];
          var grp = EMP.filter(function (x) { return d !== null && x[2] === d; });
          runs++; reads += EMP.length;
          var val = null;
          if (grp.length) {
            var s = grp.map(function (x) { return x[4]; });
            val = agg === 'AVG' ? s.reduce(function (a, b) { return a + b; }, 0) / s.length : Math.max.apply(null, s);
          }
          var ok = val !== null && (op === '>' ? e[4] > val : e[4] === val);
          if (ok) kept.push([e[1], d, e[4]]);
          var key = 'dept ' + nm(d);
          var seen = cache.some(function (c) { return c[0] === key; });
          if (!seen) cache.push([key, money(val)]);
          hl[i] = 'cur';
          var ch = {}; ch[key] = seen ? 'win' : 'ok';
          var narr = 'Outer row <b>' + e[1] + '</b> (dept ' + nm(d) + '). Plug <code>e.dept_id = ' + nm(d) + '</code> into the inner query → it scans employees again and finds ' + grp.length + ' row(s) → ' + agg + ' = <b>' + money(val) + '</b>. ';
          if (val === null) narr += '<span class="c-r">No department means <code>e2.dept_id = NULL</code> matches nothing, the aggregate is NULL, and the comparison is UNKNOWN → dropped.</span>';
          else narr += 'Is ' + money(e[4]) + ' ' + op + ' ' + money(val) + '? ' + (ok ? '<span class="c-g">yes → keep</span>' : '<span class="c-r">no → drop</span>');
          if (seen) narr += ' <i>(Same dept as before — a smart engine could reuse the cached answer.)</i>';
          frames.push({ narr: narr, parts: [
            { type: 'code', label: 'Query', lang: 'sql', code: sql, hl: { 3: 'cur', 6: 'ok' } },
            { type: 'table', label: 'employees e (outer)', columns: ['name', 'dept_id', 'salary'], rows: outer, hl: JSON.parse(JSON.stringify(hl)) },
            { type: 'table', label: 'Inner run #' + runs + ': employees e2 WHERE e2.dept_id = ' + nm(d), columns: ['name', 'dept_id', 'salary'], rows: grp.map(function (x) { return [x[1], x[2], x[4]]; }) },
            { type: 'vars', label: 'This row', vals: { 'inner result': money(val), verdict: val === null ? 'UNKNOWN' : ok ? 'TRUE' : 'FALSE', inner_runs: runs, rows_read: reads }, hl: { verdict: ok ? 'ok' : 'bad' } },
            { type: 'map', label: 'Answers per dept (what a cache would hold)', entries: cache.slice(), hl: ch }
          ] });
          hl[i] = ok ? 'ok' : 'done';
        }
        frames.push({ narr: 'Result: <b>' + kept.length + '</b> rows. The naive plan ran the inner query <b>16 times</b> and read ' + reads + ' rows. A decorrelated plan (group by dept once, then join) reads about 16 + 16 = 32 rows. That gap is why big tables need an index on <code>dept_id</code> or a rewrite.', parts: [
          { type: 'table', label: 'Final result', columns: ['name', 'dept_id', 'salary'], rows: kept, hl: (function () { var h = {}; kept.forEach(function (r, k) { h[k] = 'sel'; }); return h; })() },
          { type: 'bars', label: 'Rows read', values: [reads, 32], texts: ['naive correlated', 'group once + join'], hl: { 0: 'bad', 1: 'ok' } }
        ] });
        return frames;
      }
    },
    examples: [
      { title: 'Per-row lookup in SELECT: orders per customer and last order date', html: `<p>Each customer row triggers two small lookups in <code>orders</code>. Customers with no orders get <b>0</b> from <code>COUNT(*)</code> but <b>NULL</b> from <code>MAX(order_date)</code> — COUNT over zero rows is 0, every other aggregate over zero rows is NULL.</p>${H.table(['name', 'orders', 'last_order'], [['Asha', '3', '2024-09-02'], ['Eli', '0', '<span class="c-m">NULL</span>'], ['Fatima', '0', '<span class="c-m">NULL</span>']])}`, code: { lang: 'sql', db: 'shop', code: `SELECT c.name,
       (SELECT COUNT(*)        FROM orders o WHERE o.customer_id = c.id) AS orders,
       (SELECT MAX(order_date) FROM orders o WHERE o.customer_id = c.id) AS last_order
FROM customers c
ORDER BY orders DESC, c.name;` } },
      { title: 'Products above their own category average', html: `<p>Electronics averages 716.7, Furniture 173.3, Books 35. So Laptop and Phone beat the Electronics average, Desk and Chair beat Furniture's, and Atlas (60) beats the Books average. Headphones (150) is cheap for Electronics, so it is dropped even though 150 is more than most books.</p>`, code: { lang: 'sql', db: 'shop', code: `SELECT p.name, p.category, p.price
FROM products p
WHERE p.price > (SELECT AVG(p2.price)
                 FROM products p2
                 WHERE p2.category = p.category)
ORDER BY p.category, p.price DESC;` } },
      { title: 'Correlated UPDATE: raise everyone paid below their department average', html: `<p>Correlated subqueries also work in UPDATE and DELETE. Here the inner query refers to the row being updated (<code>employees.dept_id</code>). Standard SQL evaluates every subquery against the table <b>as it was before the statement started</b>, so earlier updates in the same statement do not shift the average.</p>`, code: { lang: 'sql', db: 'company', code: `UPDATE employees
SET salary = CAST(salary * 1.10 AS INTEGER)
WHERE salary < (SELECT AVG(e2.salary)
                FROM employees e2
                WHERE e2.dept_id = employees.dept_id);

SELECT name, dept_id, salary FROM employees ORDER BY dept_id, salary;` } },
      { title: 'Count-based ranking: position of each engineer in their department', html: `<p>"Rank = 1 + number of people paid more than me in my department." Neha and Priya both earn 105,000 and share rank 4; the next person (Karan) gets rank 6 — that is exactly <code>RANK()</code> semantics. Using <code>COUNT(DISTINCT x.salary)</code> instead gives <code>DENSE_RANK()</code> semantics.</p>`, code: { lang: 'sql', db: 'company', code: `SELECT e.name, e.salary,
       1 + (SELECT COUNT(*)
            FROM employees x
            WHERE x.dept_id = e.dept_id
              AND x.salary  > e.salary) AS rank_in_dept
FROM employees e
WHERE e.dept_id = 1
ORDER BY rank_in_dept;` } }
    ],
    deepDive: `<p><b>Execution reality.</b> "Re-run per row" is the <i>logical</i> meaning, not necessarily the physical plan. Engines have three tricks:</p>
<ul>
<li><b>Decorrelation / unnesting:</b> rewrite <code>x &gt; (SELECT AVG(..) WHERE g = outer.g)</code> into "aggregate once by g, then join" (SQL Server, Oracle, PostgreSQL for <code>EXISTS/IN</code>, DuckDB for almost everything). <code>EXISTS</code>/<code>IN</code> become <b>semi-joins</b>, <code>NOT EXISTS</code> becomes an <b>anti-join</b>, which can use hash join.</li>
<li><b>Memoization:</b> cache the inner result per distinct correlation value (PostgreSQL 14+ <i>Memoize</i> node; SQL Server <i>lazy spool</i>). With 5 departments, 16 rows need only 5 real executions.</li>
<li><b>Index lookups:</b> if not rewritten, each execution should be an index seek, not a full scan. An index on <code>employees(dept_id, salary)</code> turns each inner run into O(log N + group size). SQLite plans correlated subqueries as nested loops and relies heavily on this — check <code>EXPLAIN QUERY PLAN</code> for <code>CORRELATED SCALAR SUBQUERY</code> followed by <code>SEARCH … USING INDEX</code> (good) versus <code>SCAN</code> (bad: O(N<sup>2</sup>)).</li>
</ul>
<p><b>Cost math.</b> N = 1,000,000 employees, no index, no rewrite → 10<sup>12</sup> row reads (hours). With an index on dept_id → roughly N × (log N + group size). Decorrelated → about 2N. A window function (<code>AVG(salary) OVER (PARTITION BY dept_id)</code>) → one sort/hash pass.</p>
<p><b>Semantics gotchas.</b> (1) A correlated scalar subquery that returns 2+ rows for some outer row errors in PostgreSQL only <i>when that row is reached</i> — tests on small data may pass. (2) NULL correlation keys never match (<code>NULL = NULL</code> is unknown); use <code>IS</code> (SQLite) or <code>IS NOT DISTINCT FROM</code> (standard) if NULL should match NULL. (3) Ties: <code>= MAX(...)</code> keeps all tied rows — usually what interviewers want for "highest paid", unlike <code>LIMIT 1</code>.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI writes correlated subqueries fluently and often prefers them because they read like English. That is fine for small tables — and a time bomb at scale if the correlated column is not indexed.</p>
<p><b>Use AI as a partner:</b> <code>Rewrite this correlated subquery as (a) a JOIN to a grouped derived table and (b) a window function, and tell me which needs which index</code>. <code>Generate test rows where two employees tie for the max and one employee has a NULL dept_id; predict the output of my query</code>. Ask it to read your <code>EXPLAIN QUERY PLAN</code> and flag any correlated subquery that does a full SCAN.</p>
<p><b>Where AI goes wrong:</b> unqualified columns inside the subquery that bind to the inner table (the <code>manager_id</code> scoping bug), assuming NULL keys match, using <code>LIMIT 1</code> and silently dropping ties, and claiming "correlated subqueries are always slow" (modern optimizers often unnest them).</p>
<p><b>What you must still own:</b> spotting the correlation, tracing it row by row on a tiny sample, and deciding — with the plan in front of you — whether the rewrite is worth it.</p>`,
    problems: [{
      title: 'Employees Who Earn More Than Their Manager',
      level: 'Medium', tags: ['correlated subquery', 'self reference', 'scoping'], companies: ['Amazon', 'Microsoft', 'Adobe'],
      statement: `<p>In the <code>company</code> database each employee has a <code>manager_id</code> pointing to another row of <code>employees</code>. Return the <b>name</b> and <b>salary</b> of every employee who earns <b>strictly more than their direct manager</b>, plus the manager's name and salary.</p>`,
      constraints: `<p>16 employees; the CEO has <code>manager_id = NULL</code> and must not appear. Salaries are integers.</p>`,
      example: `${H.table(['employee', 'salary', 'manager', 'manager salary'], [['<span class="c-g">Neha</span>', '105000', 'Karan', '102000'], ['<span class="c-g">Imran</span>', '85000', 'Sneha', '82000'], ['<span class="c-r">Arjun</span>', '95000', 'Karan', '102000']])}<p>Neha and Imran out-earn their managers; Arjun does not, and Asha has no manager at all (comparison with NULL is unknown → excluded).</p>`,
      brute: { why: `<p>This "almost right" query is a real bug seen in code reviews. Inside <code>FROM employees m</code>, the unqualified <code>manager_id</code> binds to <b>m.manager_id</b> (the inner table), not the outer employee's. So the inner query looks for a row whose id equals its <i>own</i> manager_id — impossible — returns NULL, and the query returns <b>zero rows</b> with no error.</p>`, code: { lang: 'sql', db: 'company', code: `-- BUG: manager_id resolves to m.manager_id, not e.manager_id
SELECT e.name, e.salary
FROM employees e
WHERE e.salary > (SELECT m.salary
                  FROM employees m
                  WHERE m.id = manager_id);   -- returns 0 rows, silently` } },
      mcq: { q: 'Inside a subquery, an unqualified column name is resolved…', options: ['In the innermost FROM first, then outward', 'In the outer query first', 'Randomly — it is an error', 'Only in the table named first in the outer FROM'], answer: 0, explain: 'SQL scoping searches the nearest (inner) scope first. If the inner table has a column with that name, it wins. Qualify columns with aliases to avoid accidental binding.' },
      hints: [`<p>Hint 1: For each employee you need ONE related row — the manager — found by <code>m.id = e.manager_id</code>. That is a per-row lookup.</p>`, `<p>Hint 2: Use a correlated scalar subquery <code>(SELECT m.salary FROM employees m WHERE m.id = e.manager_id)</code>; it is single-row because <code>id</code> is the primary key. A self join <code>employees e JOIN employees m ON m.id = e.manager_id</code> is the equivalent alternative.</p>`, `<p>Hint 3: Qualify every column. The CEO's manager_id is NULL → subquery returns NULL → comparison unknown → excluded automatically. Recipe: outer employees e → WHERE e.salary &gt; (manager's salary) → also select manager name/salary.</p>`],
      solution: {
        approach: `<p>For each employee, look up the manager's salary with a correlated scalar subquery keyed on the primary key (so it is guaranteed single-row), and keep rows where the employee earns more. The self-join version is shown as the alternative; both are correct and usually get the same plan.</p>`,
        code: { lang: 'sql', db: 'company', code: `SELECT e.name                                                  AS employee,
       e.salary,
       (SELECT m.name   FROM employees m WHERE m.id = e.manager_id) AS manager,
       (SELECT m.salary FROM employees m WHERE m.id = e.manager_id) AS manager_salary
FROM employees e
WHERE e.salary > (SELECT m.salary
                  FROM employees m
                  WHERE m.id = e.manager_id)   -- qualified: correlated on the OUTER row
ORDER BY e.name;` },
        alt: [{ lang: 'sql', db: 'company', title: 'Self-join version', code: `SELECT e.name AS employee, e.salary, m.name AS manager, m.salary AS manager_salary
FROM employees e
JOIN employees m ON m.id = e.manager_id     -- inner join drops the CEO (no manager)
WHERE e.salary > m.salary
ORDER BY e.name;` }],
        dry: { head: ['e', 'e.manager_id', 'manager salary (inner)', 'e.salary &gt; ?'], rows: [['Asha', 'NULL', 'NULL', '<span class="c-r">unknown</span>'], ['Neha', '4 (Karan)', '102000', '<span class="c-g">105000 &gt; 102000 ✔</span>'], ['Arjun', '4 (Karan)', '102000', '<span class="c-r">95000 ✘</span>'], ['Imran', '11 (Sneha)', '82000', '<span class="c-g">85000 &gt; 82000 ✔</span>']] },
        complexity: `<p>N outer rows × one primary-key lookup each = O(N log N) with the PK index (O(N) with a hash join for the self-join version).</p>`,
        followUps: ['Return employees who earn more than <b>any</b> manager above them in the chain (needs a recursive CTE).', 'Return managers whose average report salary exceeds their own salary.', 'Why does the scalar subquery here never return more than one row?']
      }
    }]
  });

  /* =====================================================================
     TOPIC 3 — IN vs EXISTS vs NOT IN vs NOT EXISTS (+ ANY / ALL)
     ===================================================================== */
  topics.push({
    title: 'IN vs EXISTS, NOT IN vs NOT EXISTS (and the NULL Trap)',
    analogy: `<p><b>IN</b> is like checking a guest list: the bouncer holds a printed list of names and looks for yours. <b>EXISTS</b> is like asking the receptionist <i>"Is there at least one booking under my name?"</i> — she stops searching the moment she finds one and just says yes or no.</p>
<p>Now imagine the printed list has one smudged, unreadable line (a <b>NULL</b>). Asking <i>"Is Eli <b>NOT</b> on the list?"</i> — the bouncer cannot be sure: the smudge might be Eli! So he says <i>"I don't know"</i>, and in SQL "don't know" means <b>you don't get in</b>. That is the famous <b>NOT IN + NULL trap</b>.</p>`,
    explain: `<p>Four ways to ask "does a matching row exist in another table?":</p>
${H.table(['Form', 'Meaning', 'Inner query', 'NULL-safe?'], [
  ['<code>x IN (SELECT col …)</code>', 'x equals at least one value in the list (a <b>semi-join</b>)', 'usually uncorrelated, one column', '<span class="c-g">Yes for finding matches</span> (NULLs in the list just never match)'],
  ['<code>EXISTS (SELECT 1 … WHERE inner.k = outer.k)</code>', 'the subquery returns at least one row', 'correlated, any columns (ignored)', '<span class="c-g">Yes</span> — only TRUE / FALSE, never UNKNOWN'],
  ['<code>x NOT IN (SELECT col …)</code>', 'x differs from <b>every</b> value in the list', 'one column', '<span class="c-r">NO</span> — one NULL in the list ⇒ result is never TRUE ⇒ <b>zero rows</b>'],
  ['<code>NOT EXISTS (…)</code>', 'no matching row exists (an <b>anti-join</b>)', 'correlated', '<span class="c-g">Yes</span> — the safe default for "never / without / no …"']
])}
<p><b>Why NOT IN breaks:</b> <code>5 NOT IN (1, 2, NULL)</code> expands to <code>5 &lt;&gt; 1 AND 5 &lt;&gt; 2 AND 5 &lt;&gt; NULL</code> = <code>TRUE AND TRUE AND UNKNOWN</code> = <b>UNKNOWN</b>. WHERE keeps only TRUE rows, so the row disappears. In our <code>shop</code> data, order 109 is a <b>guest checkout</b> with <code>customer_id = NULL</code>, so "customers who never ordered" written with NOT IN returns <b>nothing</b>, while NOT EXISTS correctly returns Eli and Fatima.</p>
${H.table(['Expression', 'Expands to', 'Result'], [['<code>1 IN (1, NULL)</code>', '1=1 OR 1=NULL', '<span class="c-g">TRUE</span>'], ['<code>5 IN (1, NULL)</code>', '5=1 OR 5=NULL', '<span class="c-y">UNKNOWN</span> (acts like FALSE)'], ['<code>5 NOT IN (1, 2, NULL)</code>', '5≠1 AND 5≠2 AND 5≠NULL', '<span class="c-r">UNKNOWN → row dropped</span>'], ['<code>NOT EXISTS (no rows)</code>', '—', '<span class="c-g">TRUE</span>']])}
<p><b>IN vs JOIN:</b> <code>IN</code>/<code>EXISTS</code> never duplicate outer rows (a customer with 3 orders appears once). A plain <code>JOIN</code> returns one row per match, so "customers who ordered" via JOIN needs <code>DISTINCT</code>.</p>
<p><b>ANY / ALL</b> (PostgreSQL, MySQL, SQL Server, Oracle — <i>not SQLite</i>): <code>x &gt; ALL (subquery)</code> = greater than every value = <code>x &gt; (SELECT MAX …)</code>; <code>x &gt; ANY (subquery)</code> = greater than at least one = <code>x &gt; (SELECT MIN …)</code>; <code>= ANY</code> is the same as <code>IN</code>; <code>&lt;&gt; ALL</code> is the same as <code>NOT IN</code> (same NULL trap!). Beware: <code>x &gt; ALL (empty set)</code> is TRUE, but <code>x &gt; (SELECT MAX … empty)</code> is NULL.</p>`,
    clues: [
      '"customers who <b>never</b> …", "products <b>not</b> ordered", "departments <b>without</b> employees" → anti-join → <b>NOT EXISTS</b>',
      '"customers who have <b>at least one</b> …", "has any …" → semi-join → EXISTS or IN (no duplicates, unlike JOIN)',
      'The column in the subquery is <b>nullable</b> (guest orders, optional manager, unassigned dept) → never use NOT IN on it',
      '"…bought <b>every</b> / <b>all</b> products in X" → relational division → double NOT EXISTS',
      '"greater than <b>all</b> / <b>any</b> of …" → ALL/ANY, or MAX/MIN rewrite in SQLite',
      'A query with NOT IN suddenly "returns nothing" after a data load → a NULL appeared in the subquery column'
    ],
    code: [
      { lang: 'sql', db: 'shop', title: 'The trap and the fix side by side', code: `-- Order 109 is a guest checkout: customer_id IS NULL
-- 1) NOT IN: returns ZERO rows, because the list contains NULL
SELECT 'NOT IN' AS method, name FROM customers
WHERE id NOT IN (SELECT customer_id FROM orders);

-- 2) NOT EXISTS: correct (Eli, Fatima). Never UNKNOWN.
SELECT 'NOT EXISTS' AS method, c.name FROM customers c
WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.id);

-- 3) NOT IN patched by filtering NULLs (works, but easy to forget)
SELECT 'NOT IN + IS NOT NULL' AS method, name FROM customers
WHERE id NOT IN (SELECT customer_id FROM orders WHERE customer_id IS NOT NULL);

-- 4) LEFT JOIN ... IS NULL anti-join (also correct)
SELECT 'LEFT JOIN' AS method, c.name
FROM customers c LEFT JOIN orders o ON o.customer_id = c.id
WHERE o.id IS NULL;` },
      { lang: 'sql', db: 'company', title: 'Semi-join with IN and EXISTS (no duplicates)', code: `-- Employees working in a Mumbai department (IN: uncorrelated list)
SELECT name FROM employees
WHERE dept_id IN (SELECT id FROM departments WHERE location = 'Mumbai');

-- Departments that run at least one project (EXISTS: correlated, stops at first match)
SELECT d.name FROM departments d
WHERE EXISTS (SELECT 1 FROM projects p WHERE p.dept_id = d.id);` },
      { lang: 'sql', check: false, title: 'ANY / ALL (PostgreSQL / MySQL — not SQLite)', code: `-- Products pricier than EVERY furniture item
SELECT name, price FROM products
WHERE price > ALL (SELECT price FROM products WHERE category = 'Furniture');

-- Products pricier than AT LEAST ONE book
SELECT name, price FROM products
WHERE price > ANY (SELECT price FROM products WHERE category = 'Books');

-- PostgreSQL array form
SELECT * FROM orders WHERE status = ANY (ARRAY['shipped', 'delivered']);` }
    ],
    codeTitle: ['NOT IN trap vs NOT EXISTS', 'IN and EXISTS', 'ANY / ALL (other dialects)'],
    viz: {
      title: 'NOT IN vs NOT EXISTS: three-valued logic, row by row',
      input: 'NOT IN',
      inputLabel: 'Mode: NOT IN, NOT EXISTS, IN or EXISTS (departments vs employees.dept_id)',
      gen: function (input) {
        var mode = String(input || '').trim().toUpperCase().replace(/\s+/g, ' ');
        if (['NOT IN', 'NOT EXISTS', 'IN', 'EXISTS'].indexOf(mode) < 0) throw new Error('Type NOT IN, NOT EXISTS, IN or EXISTS');
        var isIn = mode.indexOf('IN') >= 0 && mode.indexOf('EXISTS') < 0, neg = mode.indexOf('NOT') === 0;
        var sql = isIn ? 'SELECT d.name FROM departments d\nWHERE d.id ' + mode + ' (\n  SELECT e.dept_id FROM employees e\n);'
          : 'SELECT d.name FROM departments d\nWHERE ' + mode + ' (\n  SELECT 1 FROM employees e\n  WHERE e.dept_id = d.id\n);';
        var list = [];
        EMP.forEach(function (e) { var v = e[2] === null ? 'NULL' : e[2]; if (list.indexOf(v) < 0) list.push(v); });
        var frames = [];
        var dRows = DEPTS.map(function (d) { return [d[0], d[1]]; });
        frames.push({ narr: 'Question: which departments ' + (neg ? 'have <b>no</b>' : '<b>have</b>') + ' employees? Mode <b>' + mode + '</b>. ' + (isIn ? 'IN-style first builds the list of <code>employees.dept_id</code> values — and that column contains a <b>NULL</b> (the CEO).' : 'EXISTS-style runs a correlated probe per department and only asks "is there at least one row?".'), parts: [
          { type: 'code', label: 'Query', lang: 'sql', code: sql, hl: { 2: 'cur' } },
          { type: 'table', label: 'departments d', columns: ['id', 'name'], rows: dRows },
          { type: 'set', label: 'distinct employees.dept_id', items: list, hl: { 'NULL': 'bad' } }
        ] });
        var hl = {}, out = [];
        DEPTS.forEach(function (d, i) {
          var id = d[0], verdict, steps = [], narr;
          if (isIn) {
            var match = false, sawNull = false;
            list.forEach(function (v) {
              if (v === 'NULL') { sawNull = true; steps.push([id + (neg ? ' ≠ ' : ' = ') + 'NULL', 'UNKNOWN']); }
              else { var eq = v === id; if (eq) match = true; steps.push([id + (neg ? ' ≠ ' : ' = ') + v, neg ? (eq ? 'FALSE' : 'TRUE') : (eq ? 'TRUE' : 'FALSE')]); }
            });
            if (neg) verdict = match ? 'FALSE' : (sawNull ? 'UNKNOWN' : 'TRUE');
            else verdict = match ? 'TRUE' : (sawNull ? 'UNKNOWN' : 'FALSE');
            narr = 'Department <b>' + d[1] + '</b> (id ' + id + '): ' + (neg ? 'NOT IN joins every comparison with <b>AND</b>' : 'IN joins every comparison with <b>OR</b>') + '. Result: <b>' + verdict + '</b>. ';
            if (neg && verdict === 'UNKNOWN') narr += '<span class="c-r">No real match, but "≠ NULL" is UNKNOWN, and TRUE AND UNKNOWN = UNKNOWN → the row is dropped. This is the trap!</span>';
          } else {
            var scanned = 0, found = false;
            for (var k = 0; k < EMP.length; k++) { scanned++; var hit = EMP[k][2] === id; steps.push([EMP[k][1] + ': ' + nm(EMP[k][2]) + ' = ' + id, hit ? 'MATCH' : '-']); if (hit) { found = true; break; } }
            verdict = (neg ? !found : found) ? 'TRUE' : 'FALSE';
            narr = 'Department <b>' + d[1] + '</b>: probe employees WHERE dept_id = ' + id + '. ' + (found ? 'Found a match after ' + scanned + ' row(s) and <b>stopped early</b>.' : 'Scanned all ' + scanned + ' rows, no match.') + ' ' + mode + ' → <b>' + verdict + '</b> (EXISTS is never UNKNOWN).';
          }
          var keep = verdict === 'TRUE';
          if (keep) out.push([d[1]]);
          hl[i] = 'cur';
          var sh = {}; steps.forEach(function (s, j) { sh[j] = s[1] === 'UNKNOWN' ? 'bad' : (s[1] === 'TRUE' || s[1] === 'MATCH') ? 'ok' : ''; });
          frames.push({ narr: narr, parts: [
            { type: 'table', label: 'departments d', columns: ['id', 'name'], rows: dRows, hl: JSON.parse(JSON.stringify(hl)) },
            { type: 'table', label: isIn ? 'Comparisons for id ' + id : 'Probe for id ' + id, columns: ['check', 'value'], rows: steps.map(function (s) { return [s[0], s[1]]; }), hl: sh },
            { type: 'vars', label: 'Verdict', vals: { condition: verdict, kept: keep ? 'yes' : 'no' }, hl: { condition: keep ? 'ok' : 'bad' } }
          ] });
          hl[i] = keep ? 'ok' : 'done';
        });
        frames.push({ narr: mode + ' returned <b>' + out.length + '</b> row(s). ' + (mode === 'NOT IN' ? '<span class="c-r">Legal really has no employees, yet NOT IN returned nothing because of one NULL.</span> Fix: use NOT EXISTS, or add <code>WHERE e.dept_id IS NOT NULL</code> inside.' : mode === 'NOT EXISTS' ? 'Legal is correctly found — NOT EXISTS ignores the NULL because NULL never equals a department id.' : 'For positive checks IN and EXISTS agree: NULLs in the list simply never match.'), parts: [
          { type: 'table', label: 'Result (' + mode + ')', columns: ['name'], rows: out, hl: (function () { var h = {}; out.forEach(function (r, k) { h[k] = 'sel'; }); return h; })() },
          { type: 'table', label: 'All four modes on this data', columns: ['mode', 'result'], rows: [['IN', 'Engineering, Sales, HR, Marketing'], ['EXISTS', 'Engineering, Sales, HR, Marketing'], ['NOT IN', '(empty!)'], ['NOT EXISTS', 'Legal']], hl: { 2: 'bad', 3: 'ok' } }
        ] });
        return frames;
      }
    },
    examples: [
      { title: 'Departments with no employees: NOT IN returns nothing', html: `<p><code>employees.dept_id</code> contains NULL (the CEO). So <code>id NOT IN (SELECT dept_id FROM employees)</code> is UNKNOWN for Legal and FALSE for all others → <b>empty result</b>. NOT EXISTS returns <b>Legal</b>.</p>`, code: { lang: 'sql', db: 'company', code: `SELECT 'NOT IN' AS how, name FROM departments
WHERE id NOT IN (SELECT dept_id FROM employees)
UNION ALL
SELECT 'NOT EXISTS', d.name FROM departments d
WHERE NOT EXISTS (SELECT 1 FROM employees e WHERE e.dept_id = d.id);` } },
      { title: 'Semi-join without duplicates: customers who ordered', html: `<p>A JOIN returns Asha three times (she has three orders). <code>IN</code> or <code>EXISTS</code> return each customer once: Asha, Ben, Chen, Dana. Semi-joins answer "is there at least one?" — they do not multiply rows.</p>${H.table(['method', 'rows returned'], [['JOIN', '8 (duplicates)'], ['JOIN + DISTINCT', '4'], ['IN / EXISTS', '4']])}`, code: { lang: 'sql', db: 'shop', code: `SELECT COUNT(*) AS join_rows FROM customers c JOIN orders o ON o.customer_id = c.id;
SELECT name FROM customers WHERE id IN (SELECT customer_id FROM orders);
SELECT c.name FROM customers c WHERE EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.id);` } },
      { title: 'ALL rewritten for SQLite with MAX', html: `<p>SQLite has no <code>ANY</code>/<code>ALL</code>. "More expensive than every furniture item" = more than the furniture <b>maximum</b> (300) → Laptop and Phone. "More expensive than at least one book" would be <code>&gt; (SELECT MIN(...))</code>. Watch the empty-set difference: <code>&gt; ALL(empty)</code> is TRUE, but <code>&gt; MAX(empty)</code> is NULL.</p>`, code: { lang: 'sql', db: 'shop', code: `SELECT name, price FROM products
WHERE price > (SELECT MAX(price) FROM products WHERE category = 'Furniture');` } },
      { title: 'Three-valued logic in one SELECT', html: `<p>Run this to see SQLite print 1 for TRUE, 0 for FALSE and NULL for UNKNOWN. The middle column proves IN is fine for positive matches; the first and last show the UNKNOWN that kills NOT IN.</p>`, code: { lang: 'sql', code: `SELECT 5 NOT IN (1, 2, NULL) AS not_in_with_null,   -- NULL (unknown)
       1 IN (1, NULL)        AS in_found,           -- 1 (true)
       5 IN (1, NULL)        AS in_not_found,       -- NULL (unknown)
       5 NOT IN (1, 2)       AS not_in_no_null;     -- 1 (true)` } },
      { title: 'Relational division: customers who bought EVERY electronics product', html: `<p>"Every" = "there is <b>no</b> electronics product that this customer has <b>not</b> bought" → two nested NOT EXISTS. Only <b>Asha</b> bought Laptop, Phone and Headphones (in non-cancelled orders).</p>`, code: { lang: 'sql', db: 'shop', code: `SELECT c.name
FROM customers c
WHERE NOT EXISTS (                       -- no electronics product...
        SELECT 1 FROM products p
        WHERE p.category = 'Electronics'
          AND NOT EXISTS (               -- ...that this customer has NOT bought
                SELECT 1
                FROM orders o JOIN order_items oi ON oi.order_id = o.id
                WHERE o.customer_id = c.id
                  AND oi.product_id = p.id
                  AND o.status <> 'cancelled'));` } }
    ],
    deepDive: `<p><b>How engines execute them.</b> <code>IN (subquery)</code> and <code>EXISTS</code> are both planned as <b>semi-joins</b>; <code>NOT EXISTS</code> as an <b>anti-join</b> (hash anti-join, merge anti-join or nested loop with index probe). Because they are semantically equal for positive checks, PostgreSQL, SQL Server, Oracle and MySQL 8 generally produce the same plan for IN and EXISTS — the old folk rule "EXISTS is faster than IN" dates from MySQL 5.x and Oracle 8 era optimizers. SQLite turns <code>x IN (SELECT …)</code> into a temporary b-tree ("LIST SUBQUERY", built once) or uses an index on the inner column; EXISTS becomes a correlated probe that stops at the first match.</p>
<p><b>NOT IN is not an anti-join.</b> Because of NULL semantics the optimizer cannot treat NOT IN as a plain anti-join unless it can prove both sides are NOT NULL (via constraints or filters). PostgreSQL then falls back to a <i>hashed SubPlan</i> or, if the list does not fit in <code>work_mem</code>, a per-row scan — O(N×M) and very slow. Oracle has a special "null-aware anti join". Declaring columns <code>NOT NULL</code> is a performance feature, not just a data-quality one.</p>
<p><b>Inside EXISTS the SELECT list is ignored</b>: <code>SELECT 1</code>, <code>SELECT *</code> and <code>SELECT NULL</code> behave identically (it is a common myth that <code>SELECT *</code> reads all columns there).</p>
<p><b>Large literal lists.</b> <code>IN (1, 2, …, 50000)</code> from application code bloats parsing and plan caches; prefer a temp table / array parameter (<code>= ANY($1)</code> in PostgreSQL) and a join.</p>
<p><b>Division.</b> The double NOT EXISTS pattern is relational algebra's division operator. The counting alternative (<code>GROUP BY customer HAVING COUNT(DISTINCT product) = (SELECT COUNT(*) FROM products WHERE …)</code>) is often faster but must use DISTINCT and the same filters on both sides.</p>`,
    aiEra: `<p><b>What AI changes:</b> ask an assistant for "customers without orders" and it very often writes <code>NOT IN (SELECT customer_id FROM orders)</code>. It works on its toy data and fails on yours the day a nullable column gets its first NULL. Knowing this trap is one of the highest-value SQL instincts you can have.</p>
<p><b>Use AI as a partner:</b> <code>Audit this SQL for NOT IN over nullable columns and rewrite with NOT EXISTS</code>. <code>Build a truth table for x NOT IN (list) when list contains NULL / is empty / contains x</code>. <code>Rewrite this ALL/ANY query for SQLite and explain the empty-set difference</code>.</p>
<p><b>Where AI goes wrong:</b> repeating the outdated "EXISTS is always faster than IN" rule; using JOIN for "has at least one" and producing duplicates; emitting <code>ANY/ALL</code> for SQLite; forgetting to apply the same status filter (e.g. cancelled orders) inside the subquery.</p>
<p><b>What you must still own:</b> knowing which columns are nullable in your schema, reading the plan to confirm you got an anti-join, and explaining the three-valued logic out loud in an interview.</p>`,
    problems: [{
      title: 'Customers Who Never Placed an Order',
      level: 'Medium', tags: ['NOT EXISTS', 'anti-join', 'NULL'], companies: ['Amazon', 'Meta', 'Swiggy'],
      statement: `<p>Using the <code>shop</code> database, return the names of customers who have <b>never placed any order</b>. Note: the <code>orders</code> table contains guest checkouts where <code>customer_id</code> is NULL.</p>`,
      constraints: `<p><code>customers(id, name, city, signup_date)</code>, <code>orders(id, customer_id NULLABLE, order_date, status)</code>. Order 109 has <code>customer_id = NULL</code>.</p>`,
      example: `${H.table(['customer', 'orders', 'in answer?'], [['Asha', '101, 102, 108', 'no'], ['Dana', '106', 'no'], ['<span class="c-g">Eli</span>', '—', '<span class="c-g">yes</span>'], ['<span class="c-g">Fatima</span>', '—', '<span class="c-g">yes</span>']])}<p>Expected output: <b>Eli, Fatima</b>. The guest order (customer_id NULL) belongs to nobody.</p>`,
      brute: { why: `<p>The "obvious" <code>NOT IN</code> returns <b>zero rows</b>. The subquery list is (1, 1, 2, 3, 3, 4, 2, 1, <span class="c-r">NULL</span>), so for Eli: 5≠1 AND … AND 5≠NULL = UNKNOWN → filtered out. No error, just a silently wrong (empty) report.</p>`, code: { lang: 'sql', db: 'shop', code: `-- Looks right, returns NOTHING because of the guest order's NULL customer_id
SELECT name
FROM customers
WHERE id NOT IN (SELECT customer_id FROM orders);` } },
      mcq: { q: 'The subquery list is (1, 2, NULL). What is <code>7 NOT IN (1, 2, NULL)</code>?', options: ['UNKNOWN (NULL), so the row is filtered out', 'TRUE, because 7 is not 1 or 2', 'FALSE', 'An error'], answer: 0, explain: '7≠1 is TRUE, 7≠2 is TRUE, 7≠NULL is UNKNOWN; TRUE AND TRUE AND UNKNOWN = UNKNOWN. WHERE keeps only TRUE.' },
      hints: [`<p>Hint 1: "never" means "there does not exist an order for this customer" — an anti-join.</p>`, `<p>Hint 2: Use <code>NOT EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.id)</code>. A NULL customer_id never equals any c.id, so guest orders are ignored naturally.</p>`, `<p>Hint 3: Alternatives: <code>LEFT JOIN orders … WHERE o.id IS NULL</code> (test a NOT NULL column of the right table), or NOT IN with <code>WHERE customer_id IS NOT NULL</code> inside. Recipe: for each customer → probe orders → keep if no row.</p>`],
      solution: {
        approach: `<p>Write the anti-join with <b>NOT EXISTS</b>: it returns only TRUE/FALSE, never UNKNOWN, so NULLs in <code>orders.customer_id</code> cannot poison the result. With an index on <code>orders(customer_id)</code> each probe is a quick index seek; most engines plan it as a hash anti-join.</p>`,
        code: { lang: 'sql', db: 'shop', code: `SELECT c.name
FROM customers c
WHERE NOT EXISTS (
        SELECT 1
        FROM orders o
        WHERE o.customer_id = c.id     -- NULL customer_id never matches: safe
      )
ORDER BY c.name;` },
        alt: [{ lang: 'sql', db: 'shop', title: 'LEFT JOIN anti-join', code: `SELECT c.name
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.id
WHERE o.id IS NULL          -- o.id is the PK, so NULL here means "no match"
ORDER BY c.name;` }],
        dry: { head: ['customer', 'probe orders WHERE customer_id = id', 'NOT EXISTS'], rows: [['Asha (1)', 'found 101 → stop', '<span class="c-r">FALSE</span>'], ['Chen (3)', 'found 104 → stop', '<span class="c-r">FALSE</span>'], ['Eli (5)', 'no row (NULL ≠ 5)', '<span class="c-g">TRUE</span>'], ['Fatima (6)', 'no row', '<span class="c-g">TRUE</span>']] },
        complexity: `<p>Hash anti-join: O(C + O). Nested loop with index on <code>orders(customer_id)</code>: O(C log O). NOT IN without NULL-safety can degrade to O(C × O).</p>`,
        followUps: ['Customers who never had a <b>delivered</b> order (filter inside the subquery).', 'Customers whose every order was cancelled.', 'How would you make the database itself prevent this bug?']
      }
    }]
  });

  /* =====================================================================
     TOPIC 4 — CTEs (WITH): named steps, readability, reuse
     ===================================================================== */
  topics.push({
    title: 'CTEs (WITH): Writing Queries as Named Steps',
    analogy: `<p>Think of a recipe. A bad recipe says: <i>"Add the mixture of the whisked mixture of eggs and the sifted mixture of flour and sugar to…"</i> — impossible to follow. A good recipe says: <b>Step 1</b> make the batter. <b>Step 2</b> make the syrup. <b>Step 3</b> pour the syrup over the batter.</p>
<p>A <b>CTE</b> (Common Table Expression) lets you write SQL like a good recipe: give each intermediate result a <b>name</b> at the top with <code>WITH</code>, then use those names below as if they were tables. Same ingredients, same cake — far easier to read, test and change.</p>`,
    explain: `<p>Syntax:</p>
<pre>WITH step1 AS (SELECT …),            -- a named, temporary result
     step2 AS (SELECT … FROM step1)  -- later CTEs may use earlier ones
SELECT … FROM step2 JOIN …;           -- the main query</pre>
<p>A CTE lives only for <b>one statement</b>. It is not stored anywhere; it is a named subquery. What it buys you:</p>
<ul>
<li><b>Top-to-bottom reading order.</b> Nested derived tables read inside-out; CTEs read like steps 1, 2, 3.</li>
<li><b>Reuse.</b> Reference the same CTE twice (e.g. once to join, once to compute a total) without copy-pasting the subquery.</li>
<li><b>Debuggability.</b> Swap the final SELECT for <code>SELECT * FROM step1</code> to inspect any step.</li>
<li><b>Recursion.</b> <code>WITH RECURSIVE</code> lets a CTE refer to itself — the next two topics.</li>
</ul>
${H.table(['Same question', 'Nested derived tables', 'CTE'], [['"Departments with avg salary &gt; 85k, with name and payroll"', 'SELECT … FROM (SELECT … FROM (SELECT … GROUP BY …) WHERE …) JOIN …', 'WITH dept_stats AS (…), big AS (…) SELECT … FROM big JOIN departments'], ['Reads', 'inside → out', 'top → bottom'], ['Reuse a step twice', 'copy-paste', 'just name it twice'], ['Performance', 'usually identical (the optimizer sees the same tree)', 'usually identical — see deep dive for materialization']])}
<p><b>Rules to remember:</b></p>
<ul>
<li>Separate CTEs with commas; write <code>WITH</code> only once (and <code>RECURSIVE</code> once, if any CTE is recursive — SQLite and PostgreSQL require the keyword, SQL Server/Oracle omit it).</li>
<li>A CTE can only reference CTEs defined <b>before</b> it (or itself, if recursive).</li>
<li>You can name the columns: <code>WITH s(dept, n, avg_sal) AS (SELECT …)</code>.</li>
<li><code>WITH</code> also works in front of <code>INSERT</code>, <code>UPDATE</code>, <code>DELETE</code> (SQLite, PostgreSQL, SQL Server) — great for "compute, then modify".</li>
<li>An ORDER BY inside a CTE does not guarantee the final order — put ORDER BY on the outer query.</li>
</ul>`,
    clues: [
      'A query needs <b>2+ aggregation stages</b> ("total per order, then average per customer") → chain CTEs',
      'The same derived table appears <b>twice</b> (join it AND compute its total) → one CTE, referenced twice',
      '"Explain your query to the interviewer" / long whiteboard query → CTEs make each step nameable',
      '"Compute X, then filter / rank / join on X" with window functions → CTE then outer WHERE (you cannot filter a window result in the same SELECT)',
      '"Update rows based on a computed set" → <code>WITH … UPDATE / DELETE</code>',
      'The prompt mentions hierarchy / tree / series / "all levels" → <code>WITH RECURSIVE</code> (next topics)'
    ],
    code: [
      { lang: 'sql', db: 'company', title: 'Chained CTEs: aggregate → filter → join', code: `WITH dept_stats AS (                        -- Step 1: one row per department
        SELECT dept_id,
               COUNT(*)    AS headcount,
               AVG(salary) AS avg_salary,
               SUM(salary) AS payroll
        FROM employees
        WHERE dept_id IS NOT NULL
        GROUP BY dept_id
     ),
     well_paid AS (                         -- Step 2: uses step 1
        SELECT * FROM dept_stats WHERE avg_salary > 85000
     )
SELECT d.name, w.headcount, ROUND(w.avg_salary) AS avg_salary, w.payroll   -- Step 3
FROM well_paid w
JOIN departments d ON d.id = w.dept_id
ORDER BY w.payroll DESC;` },
      { lang: 'sql', db: 'company', title: 'One CTE referenced twice (share of total payroll)', code: `WITH dept_payroll AS (
        SELECT dept_id, SUM(salary) AS payroll
        FROM employees
        WHERE dept_id IS NOT NULL
        GROUP BY dept_id
     )
SELECT d.name,
       p.payroll,
       ROUND(100.0 * p.payroll / (SELECT SUM(payroll) FROM dept_payroll), 1) AS pct  -- 2nd use
FROM dept_payroll p                                                              -- 1st use
JOIN departments d ON d.id = p.dept_id
ORDER BY pct DESC;` },
      { lang: 'sql', db: 'shop', title: 'Two-level aggregation: order totals → customer spend', code: `WITH order_totals AS (                       -- level 1: one row per order
        SELECT o.id, o.customer_id, SUM(oi.qty * oi.unit_price) AS total
        FROM orders o
        JOIN order_items oi ON oi.order_id = o.id
        WHERE o.status <> 'cancelled' AND o.customer_id IS NOT NULL
        GROUP BY o.id, o.customer_id
     ),
     customer_spend AS (                     -- level 2: one row per customer
        SELECT customer_id, COUNT(*) AS orders, SUM(total) AS spend, AVG(total) AS avg_order
        FROM order_totals
        GROUP BY customer_id
     )
SELECT c.name, cs.orders, cs.spend, ROUND(cs.avg_order, 2) AS avg_order
FROM customer_spend cs
JOIN customers c ON c.id = cs.customer_id
ORDER BY cs.spend DESC;` }
    ],
    codeTitle: ['Chained CTEs', 'Reusing a CTE', 'Two-level aggregation'],
    viz: {
      title: 'CTE pipeline: each named step produces a table the next step reads',
      input: '85000',
      inputLabel: 'well_paid threshold (average salary above…)',
      gen: function (input) {
        var th = Number(String(input).trim());
        if (!isFinite(th)) throw new Error('Enter one number, e.g. 85000');
        var sql = 'WITH dept_stats AS (\n  SELECT dept_id, COUNT(*) AS headcount,\n         AVG(salary) AS avg_salary, SUM(salary) AS payroll\n  FROM employees WHERE dept_id IS NOT NULL\n  GROUP BY dept_id\n),\nwell_paid AS (\n  SELECT * FROM dept_stats WHERE avg_salary > ' + th + '\n)\nSELECT d.name, w.headcount, w.avg_salary, w.payroll\nFROM well_paid w JOIN departments d ON d.id = w.dept_id\nORDER BY w.payroll DESC;';
        function flow(stage) {
          var hl = {}, ehl = {};
          var order = ['employees', 'dept_stats', 'well_paid', 'final'];
          order.forEach(function (n, i) { hl[n] = i < stage ? 'done' : i === stage ? 'cur' : ''; });
          if (stage >= 1) ehl['employees-dept_stats'] = stage === 1 ? 'ok' : 'done';
          if (stage >= 2) ehl['dept_stats-well_paid'] = stage === 2 ? 'ok' : 'done';
          if (stage >= 3) { ehl['well_paid-final'] = 'ok'; ehl['departments-final'] = 'ok'; hl.departments = 'cur'; }
          if (stage === 4) { hl.final = 'sel'; }
          return { type: 'graph', label: 'Data flow between named steps', directed: true, height: 40, nodes: [
            { id: 'employees', label: 'employees', x: 10, y: 12, shape: 'box' }, { id: 'dept_stats', label: 'dept_stats', x: 36, y: 12, shape: 'box' },
            { id: 'well_paid', label: 'well_paid', x: 62, y: 12, shape: 'box' }, { id: 'departments', label: 'departments', x: 62, y: 32, shape: 'box' },
            { id: 'final', label: 'final SELECT', x: 89, y: 22, shape: 'box' }],
            edges: [['employees', 'dept_stats', 'GROUP BY'], ['dept_stats', 'well_paid', 'WHERE'], ['well_paid', 'final'], ['departments', 'final', 'JOIN']], hl: hl, ehl: ehl };
        }
        var frames = [];
        frames.push({ narr: 'A CTE query reads like a recipe: two named steps (<code>dept_stats</code>, <code>well_paid</code>) and then the main SELECT. Nothing is stored permanently — the names live only for this one statement.', parts: [
          { type: 'code', label: 'Query', lang: 'sql', code: sql, hl: { 1: 'cur', 7: 'cur', 10: 'cur' } }, flow(0),
          { type: 'table', label: 'employees (base table)', columns: ['name', 'dept_id', 'salary'], rows: empRows([1, 2, 4]) }
        ] });
        var g = {};
        EMP.forEach(function (e) { if (e[2] !== null) { (g[e[2]] = g[e[2]] || []).push(e[4]); } });
        var stats = Object.keys(g).map(function (k) { var s = g[k], sum = s.reduce(function (a, b) { return a + b; }, 0); return [Number(k), s.length, Math.round(sum / s.length), sum]; });
        frames.push({ narr: 'Step 1 — <code>dept_stats</code>: filter out the CEO (no dept), group by dept_id. Result: one row per department. From now on we can say <b>dept_stats</b> as if it were a real table.', parts: [
          { type: 'code', label: 'Query', lang: 'sql', code: sql, hl: { 1: 'ok', 2: 'ok', 3: 'ok', 4: 'ok', 5: 'ok' } }, flow(1),
          { type: 'table', label: 'dept_stats', columns: ['dept_id', 'headcount', 'avg_salary', 'payroll'], rows: stats, hl: { 0: 'ok', 1: 'ok', 2: 'ok', 3: 'ok' } },
          { type: 'set', label: 'Names in scope', items: ['dept_stats'], hl: { dept_stats: 'ok' } }
        ] });
        var wh = {}, wp = [];
        stats.forEach(function (r, i) { var ok = r[2] > th; wh[i] = ok ? 'ok' : 'bad'; if (ok) wp.push(r); });
        frames.push({ narr: 'Step 2 — <code>well_paid</code> reads <b>dept_stats</b> (an earlier CTE) and keeps departments with avg_salary &gt; ' + th + '. ' + wp.length + ' survive. A CTE may only refer to CTEs defined above it.', parts: [
          { type: 'code', label: 'Query', lang: 'sql', code: sql, hl: { 7: 'ok', 8: 'ok' } }, flow(2),
          { type: 'table', label: 'dept_stats → filter', columns: ['dept_id', 'headcount', 'avg_salary', 'payroll'], rows: stats, hl: wh },
          { type: 'table', label: 'well_paid', columns: ['dept_id', 'headcount', 'avg_salary', 'payroll'], rows: wp },
          { type: 'set', label: 'Names in scope', items: ['dept_stats', 'well_paid'], hl: { well_paid: 'ok' } }
        ] });
        var fin = wp.map(function (r) { return [DEPTS[r[0] - 1][1], r[1], r[2], r[3]]; }).sort(function (a, b) { return b[3] - a[3]; });
        frames.push({ narr: 'Step 3 — the main SELECT joins <b>well_paid</b> with the real <b>departments</b> table to get names.', parts: [
          { type: 'code', label: 'Query', lang: 'sql', code: sql, hl: { 10: 'cur', 11: 'cur' } }, flow(3),
          { type: 'table', label: 'departments', columns: ['id', 'name'], rows: DEPTS.map(function (d) { return [d[0], d[1]]; }) },
          { type: 'table', label: 'well_paid JOIN departments', columns: ['name', 'headcount', 'avg_salary', 'payroll'], rows: fin }
        ] });
        frames.push({ narr: 'Final result after ORDER BY payroll DESC. The optimizer usually <b>inlines</b> both CTEs into one plan, so this costs the same as the nested-subquery version — you paid nothing for readability.', parts: [
          flow(4),
          { type: 'table', label: 'Result', columns: ['name', 'headcount', 'avg_salary', 'payroll'], rows: fin, hl: (function () { var h = {}; fin.forEach(function (r, k) { h[k] = 'sel'; }); return h; })() },
          { type: 'code', label: 'Same query, nested style (reads inside-out)', lang: 'sql', code: 'SELECT d.name, w.headcount, w.avg_salary, w.payroll\nFROM (SELECT * FROM (\n        SELECT dept_id, COUNT(*) AS headcount, AVG(salary) AS avg_salary,\n               SUM(salary) AS payroll\n        FROM employees WHERE dept_id IS NOT NULL GROUP BY dept_id\n     ) s WHERE s.avg_salary > ' + th + ') w\nJOIN departments d ON d.id = w.dept_id\nORDER BY w.payroll DESC;', hl: {} }
        ] });
        return frames;
      }
    },
    examples: [
      { title: 'Chained CTEs on the company data', html: `<p>dept_stats gives Engineering 7 people / avg 114,286 / payroll 800,000; Sales 4 / 96,750 / 387,000; HR 72,500; Marketing 81,000. well_paid keeps the two above 85,000 → <b>Engineering</b> and <b>Sales</b>.</p>${H.table(['name', 'headcount', 'avg_salary', 'payroll'], [['Engineering', '7', '114286', '800000'], ['Sales', '4', '96750', '387000']])}`, code: { lang: 'sql', db: 'company', code: `WITH dept_stats AS (
        SELECT dept_id, COUNT(*) AS headcount, AVG(salary) AS avg_salary, SUM(salary) AS payroll
        FROM employees WHERE dept_id IS NOT NULL GROUP BY dept_id),
     well_paid AS (SELECT * FROM dept_stats WHERE avg_salary > 85000)
SELECT d.name, w.headcount, ROUND(w.avg_salary) AS avg_salary, w.payroll
FROM well_paid w JOIN departments d ON d.id = w.dept_id
ORDER BY w.payroll DESC;` } },
      { title: 'Monthly revenue report with a CTE', html: `<p>Turn dates into months in a CTE, then aggregate. Cancelled order 104 is excluded; the guest order 109 still counts as revenue. Result: July 2485, August 1760, September 1080.</p>`, code: { lang: 'sql', db: 'shop', code: `WITH sales AS (
        SELECT strftime('%Y-%m', o.order_date) AS month,
               oi.qty * oi.unit_price          AS amount
        FROM orders o JOIN order_items oi ON oi.order_id = o.id
        WHERE o.status <> 'cancelled')
SELECT month, SUM(amount) AS revenue, COUNT(*) AS line_items
FROM sales
GROUP BY month
ORDER BY month;` } },
      { title: 'LEFT JOIN a CTE to keep empty groups (project cost per hour)', html: `<p>Aggregate assignments per project in a CTE, then <b>LEFT JOIN</b> so that <b>Data Lake</b> (no one assigned yet) still appears with 0 hours. <code>NULLIF(h, 0)</code> avoids division by zero, giving NULL cost-per-hour instead of an error.</p>`, code: { lang: 'sql', db: 'company', code: `WITH proj_hours AS (
        SELECT project_id, SUM(hours) AS h, COUNT(*) AS people
        FROM assignments GROUP BY project_id)
SELECT p.name, p.budget,
       COALESCE(ph.h, 0)      AS hours,
       COALESCE(ph.people, 0) AS people,
       ROUND(p.budget * 1.0 / NULLIF(ph.h, 0), 1) AS budget_per_hour
FROM projects p
LEFT JOIN proj_hours ph ON ph.project_id = p.id
ORDER BY budget_per_hour DESC;` } },
      { title: 'WITH in front of DELETE: remove products nobody ordered', html: `<p>CTEs are not only for SELECT. Here the CTE names the set to delete, and the DELETE reads it. (In PostgreSQL you could even put the DELETE <i>inside</i> a CTE with <code>RETURNING</code> — a data-modifying CTE — but SQLite does not support that.)</p>`, code: { lang: 'sql', db: 'shop', code: `WITH never_ordered AS (
        SELECT p.id FROM products p
        WHERE NOT EXISTS (SELECT 1 FROM order_items oi WHERE oi.product_id = p.id))
DELETE FROM products WHERE id IN (SELECT id FROM never_ordered);

SELECT COUNT(*) AS products_left FROM products;   -- 8 (Atlas removed)` } },
      { title: 'Materialization hint (SQLite 3.35+, PostgreSQL 12+)', html: `<p>By default the engine decides whether to inline a CTE or compute it once into a temp table. <code>AS MATERIALIZED</code> forces "compute once"; <code>AS NOT MATERIALIZED</code> forces inlining. Useful when a CTE is referenced many times and is expensive, or when inlining would let an outer filter use an index.</p>`, code: { lang: 'sql', db: 'shop', code: `WITH cat_avg AS MATERIALIZED (
        SELECT category, AVG(price) AS avg_price FROM products GROUP BY category)
SELECT p.name, p.category, p.price, ROUND(c.avg_price, 1) AS category_avg
FROM products p JOIN cat_avg c ON c.category = p.category
WHERE p.price > c.avg_price
ORDER BY p.category, p.price DESC;` } }
    ],
    deepDive: `<p><b>Inline vs materialize.</b> A non-recursive CTE can be executed two ways: <b>inlined</b> (substituted like a view, so the optimizer can push filters into it and use indexes) or <b>materialized</b> (computed once into a temporary table, then scanned). History matters in interviews:</p>
<ul>
<li><b>PostgreSQL ≤ 11:</b> every CTE was an <i>optimization fence</i> — always materialized. Refactoring a subquery into a CTE could make a query 100× slower. <b>PostgreSQL 12+</b> inlines a CTE that is non-recursive, side-effect free and referenced once; you control it with <code>MATERIALIZED</code> / <code>NOT MATERIALIZED</code>.</li>
<li><b>SQLite:</b> inlines when possible (via the query flattener); materializes when referenced more than once or not flattenable. Supports the same hints since 3.35.</li>
<li><b>SQL Server:</b> never materializes a CTE — a CTE referenced 3 times is <i>executed</i> 3 times. Use a temp table if you need compute-once.</li>
<li><b>MySQL 8:</b> merges or materializes like derived tables; a materialized CTE referenced twice is computed once.</li>
</ul>
<p><b>Statistics.</b> A materialized CTE has no statistics or indexes, so the planner guesses its row count — a frequent cause of bad join orders in large pipelines. If a step is reused a lot and is big, a real temp table with an index (and <code>ANALYZE</code>) can beat a CTE.</p>
<p><b>Scope and naming.</b> A CTE name shadows a real table of the same name for that statement. CTEs can be nested inside subqueries (<code>FROM (WITH x AS (…) SELECT …)</code>) in SQLite and PostgreSQL. Views are "permanent CTEs": a CTE is the right tool when the logic belongs to a single query; a view when many queries share it.</p>
<p><b>Window + CTE pattern.</b> You cannot write <code>WHERE ROW_NUMBER() OVER (…) = 1</code>; compute the window in a CTE, filter outside. This "CTE → outer filter" pattern is the backbone of top-N-per-group answers (Module SQL 6).</p>`,
    aiEra: `<p><b>What AI changes:</b> AI-generated SQL is often a long chain of CTEs — great for readability, and easy for you to review step by step. Your job shifts to <b>reviewing the pipeline</b>: is every step correct, and is the chain efficient on your engine?</p>
<p><b>Use AI as a partner:</b> <code>Refactor this 4-level nested query into named CTEs with one-line comments per step</code>. <code>For each CTE, give me a SELECT * test query and the expected row count on the sample data</code>. <code>Will PostgreSQL 16 inline or materialize each CTE here? Which one should I force?</code></p>
<p><b>Where AI goes wrong:</b> producing 8 CTEs where 2 would do (each reference in SQL Server is re-executed); putting ORDER BY inside a CTE and assuming the final order follows; forgetting <code>RECURSIVE</code> in SQLite/PostgreSQL; applying a filter (e.g. cancelled orders) in one CTE but not in the sibling CTE used as denominator.</p>
<p><b>What you must still own:</b> naming steps well, keeping filters consistent across steps, and knowing your engine's inline/materialize behaviour when a query is slow.</p>`,
    problems: [{
      title: 'Big Spenders: Customers Above the Average Customer Spend',
      level: 'Medium', tags: ['CTE', 'two-level aggregation'], companies: ['Amazon', 'Shopify', 'Walmart'],
      statement: `<p>Using the <code>shop</code> database, compute each registered customer's <b>total spend</b> (sum of <code>qty × unit_price</code> over their non-cancelled orders). Return the customers whose total spend is <b>greater than the average total spend per customer</b> (average over customers who bought something), with their spend and the average.</p>`,
      constraints: `<p>Exclude <code>status = 'cancelled'</code> and guest orders (customer_id NULL). Average is per <b>customer</b>, not per order.</p>`,
      example: `${H.table(['customer', 'spend'], [['<span class="c-g">Asha</span>', '1500 + 45 + 1080 = 2625'], ['Dana', '1190'], ['Ben', '880 + 180 = 1060'], ['Chen', '390 (order 104 cancelled)']])}<p>Average per customer = (2625 + 1190 + 1060 + 390) / 4 = <b>1316.25</b>. Only <b>Asha</b> is above it.</p>`,
      brute: { why: `<p>The tempting one-liner compares each customer with <code>AVG(qty * unit_price)</code> — the average <b>line item</b>, not the average <b>customer</b>. That value is only 375, so <b>all four</b> customers (even Chen with 390) look like "big spenders". Mixing aggregation levels is the #1 bug in multi-step analytics.</p>`, code: { lang: 'sql', db: 'shop', code: `-- WRONG LEVEL: compares customer totals with the average LINE ITEM value
SELECT o.customer_id, SUM(oi.qty * oi.unit_price) AS spend
FROM orders o JOIN order_items oi ON oi.order_id = o.id
WHERE o.status <> 'cancelled' AND o.customer_id IS NOT NULL
GROUP BY o.customer_id
HAVING SUM(oi.qty * oi.unit_price) > (SELECT AVG(qty * unit_price) FROM order_items);` } },
      mcq: { q: 'The question asks for "average spend per customer". Which pipeline is right?', options: ['Sum per customer first, then AVG over those sums', 'AVG over all order_items rows', 'AVG over orders, ignoring customers', 'SUM of everything divided by number of products'], answer: 0, explain: 'Average of per-customer totals needs two aggregation levels: first GROUP BY customer to get each total, then average those totals. A CTE makes the two levels explicit.' },
      hints: [`<p>Hint 1: There are two aggregation levels: per customer (SUM), then across customers (AVG of those sums).</p>`, `<p>Hint 2: Write <code>WITH spend AS (SELECT customer_id, SUM(...) AS total ... GROUP BY customer_id)</code>, then compare <code>total &gt; (SELECT AVG(total) FROM spend)</code> — the CTE is referenced twice.</p>`, `<p>Hint 3: Apply the cancelled/guest filters inside the CTE so both the totals and the average use the same rows. Recipe: CTE spend → main query joins customers → WHERE total &gt; (SELECT AVG(total) FROM spend).</p>`],
      solution: {
        approach: `<p>Build one CTE with the per-customer totals (filters applied once), then reuse it twice: once as the row source and once inside a scalar subquery for the average. Each aggregation level is visible and testable.</p>`,
        code: { lang: 'sql', db: 'shop', code: `WITH spend AS (
        SELECT o.customer_id, SUM(oi.qty * oi.unit_price) AS total
        FROM orders o
        JOIN order_items oi ON oi.order_id = o.id
        WHERE o.status <> 'cancelled'
          AND o.customer_id IS NOT NULL
        GROUP BY o.customer_id
     )
SELECT c.name,
       s.total,
       (SELECT ROUND(AVG(total), 2) FROM spend) AS avg_customer_spend
FROM spend s
JOIN customers c ON c.id = s.customer_id
WHERE s.total > (SELECT AVG(total) FROM spend)
ORDER BY s.total DESC;` },
        dry: { head: ['step', 'rows', 'note'], rows: [['spend CTE', 'Asha 2625, Dana 1190, Ben 1060, Chen 390', 'cancelled 104 and guest 109 excluded'], ['AVG(total)', '1316.25', 'average over 4 customers'], ['filter', 'Asha 2625 &gt; 1316.25', '<span class="c-g">keep</span>'], ['filter', 'Dana 1190', '<span class="c-r">drop</span>']] },
        complexity: `<p>One pass over orders + items to build the CTE (O(N) with hash aggregation), then O(C) to filter. If the engine re-evaluates the CTE twice (SQL Server), cost doubles — still linear.</p>`,
        followUps: ['Return the top 2 customers per city by spend (needs window functions).', 'Include customers with zero spend in the average — how does the answer change?', 'Rewrite with a window function: <code>AVG(total) OVER ()</code>.']
      }
    }]
  });

  /* =====================================================================
     TOPIC 5 — Recursive CTEs I: how recursion works + number/date series
     ===================================================================== */
  topics.push({
    title: 'Recursive CTEs: How They Work + Number & Date Series',
    analogy: `<p>Think of a row of dominoes. You push the <b>first</b> one by hand (the <b>anchor</b>). After that you do nothing: each falling domino knocks over the next one (the <b>recursive step</b>). The chain stops when there is no next domino (the <b>stop condition</b>).</p>
<p>A recursive CTE works the same way: the anchor query produces the first rows, then the recursive query is applied to the rows just produced to make the next rows, again and again, until a round produces nothing new.</p>`,
    explain: `<p>Shape of every recursive CTE:</p>
<pre>WITH RECURSIVE n(x) AS (
    SELECT 1                 -- ① anchor: the starting row(s)
    UNION ALL
    SELECT x + 1 FROM n      -- ② recursive member: reads the rows made in the previous round
    WHERE x &lt; 10             -- ③ stop condition: eventually produces no rows
)
SELECT x FROM n;             -- ④ use it like a table</pre>
<p><b>How the engine evaluates it (the "working table" algorithm):</b></p>
${H.table(['Round', 'Working table (input)', 'Recursive member produces', 'Result so far'], [['anchor', '—', '<b>1</b>', '1'], ['1', '{1}', '<b>2</b>', '1, 2'], ['2', '{2}', '<b>3</b>', '1, 2, 3'], ['…', '…', '…', '…'], ['9', '{9}', '<b>10</b>', '1 … 10'], ['10', '{10}', '<span class="c-r">nothing (10 &lt; 10 is false)</span>', 'STOP']])}
<ol>
<li>Run the anchor. Its rows go into the <b>result</b> and into a <b>working table</b>.</li>
<li>Run the recursive member, where the CTE's name means "<b>only the working table</b>" — not the whole result.</li>
<li>New rows are appended to the result and become the next working table.</li>
<li>Repeat until a round produces zero rows.</li>
</ol>
<p><b>UNION ALL vs UNION:</b> <code>UNION ALL</code> keeps every row (fast, the usual choice). <code>UNION</code> throws away rows already in the result — a built-in stop for graphs that revisit the <i>same exact row</i>, but it costs a duplicate check per row and does not help when rows differ (e.g. a growing depth or path column).</p>
<p><b>Why generate series?</b> Reports need a row for <b>every</b> day / month / number, even when the data has gaps. SQLite (before the <code>generate_series</code> extension) and MySQL have no built-in series generator — a recursive CTE is the portable tool: build the calendar, then <code>LEFT JOIN</code> the facts onto it and <code>COALESCE</code> missing values to 0.</p>
<p><b>Safety:</b> forget the stop condition and the query runs forever (SQLite, PostgreSQL) or errors at a limit (SQL Server: 100 levels by default, MySQL: 1000). Always have a WHERE that must eventually fail, or a depth counter.</p>`,
    clues: [
      '"report must show <b>every day</b> / every month, including days with zero sales" → recursive date series + LEFT JOIN',
      '"generate numbers 1..N", "fill the gaps", "missing IDs" → recursive number series',
      'Each row is computed from the <b>previous</b> row (Fibonacci, compound interest, running balance by rule) → recursive CTE',
      '"split a comma-separated string into rows" in an engine without a split function → recursive string peeling',
      'No <code>generate_series</code> available (SQLite core, MySQL) → <code>WITH RECURSIVE</code>',
      '"how many levels deep" / unknown number of steps → recursion, not a fixed number of self-joins'
    ],
    code: [
      { lang: 'sql', db: 'shop', title: 'Numbers 1..10 and a step series', code: `WITH RECURSIVE n(x) AS (
    SELECT 1                    -- anchor
    UNION ALL
    SELECT x + 1 FROM n         -- recursive member reads the previous round
    WHERE x < 10                -- stop condition
)
SELECT x FROM n;

-- Every 3rd number from 1 to 20
WITH RECURSIVE s(x) AS (SELECT 1 UNION ALL SELECT x + 3 FROM s WHERE x + 3 <= 20)
SELECT group_concat(x, ', ') AS series FROM s;` },
      { lang: 'sql', db: 'shop', title: 'Calendar + LEFT JOIN: daily revenue with zero days', code: `WITH RECURSIVE days(d) AS (
        SELECT '2024-07-01'
        UNION ALL
        SELECT date(d, '+1 day') FROM days WHERE d < '2024-07-07'
     ),
     daily AS (
        SELECT o.order_date, SUM(oi.qty * oi.unit_price) AS revenue
        FROM orders o JOIN order_items oi ON oi.order_id = o.id
        WHERE o.status <> 'cancelled'
        GROUP BY o.order_date
     )
SELECT days.d AS day, COALESCE(daily.revenue, 0) AS revenue
FROM days
LEFT JOIN daily ON daily.order_date = days.d
ORDER BY day;` },
      { lang: 'sql', db: 'shop', title: 'Carrying state: Fibonacci and factorial', code: `-- Each row carries the two previous Fibonacci numbers
WITH RECURSIVE fib(n, a, b) AS (
    SELECT 1, 0, 1
    UNION ALL
    SELECT n + 1, b, a + b FROM fib WHERE n < 15
)
SELECT n, a AS fibonacci FROM fib;

WITH RECURSIVE f(n, fact) AS (
    SELECT 1, 1
    UNION ALL
    SELECT n + 1, fact * (n + 1) FROM f WHERE n < 10
)
SELECT n, fact FROM f;` }
    ],
    codeTitle: ['Number series', 'Date series (fill gaps)', 'State-carrying recursion'],
    viz: {
      title: 'Recursive CTE rounds: anchor → working table → new rows → stop',
      input: '1 20 3',
      inputLabel: '"start end step" for a number series, or "fib N" for N Fibonacci rows',
      gen: function (input) {
        var s = String(input || '').trim().toLowerCase(), m, fib = false, start, end, step, N;
        if ((m = s.match(/^fib\s+(\d+)$/))) { fib = true; N = Number(m[1]); if (N < 2 || N > 20) throw new Error('fib N: choose N between 2 and 20'); }
        else if ((m = s.match(/^(-?\d+)\s+(-?\d+)\s+(\d+)$/))) {
          start = Number(m[1]); end = Number(m[2]); step = Number(m[3]);
          if (step <= 0) throw new Error('step must be a positive integer');
          if (end < start) throw new Error('end must be ≥ start');
          if ((end - start) / step > 22) throw new Error('Too many rows: keep (end - start) / step ≤ 22');
        } else throw new Error('Type "start end step" like "1 20 3", or "fib 8"');
        var frames = [], result = [], cols, sql, round = 0, cur;
        if (fib) {
          cols = ['n', 'a', 'b'];
          sql = 'WITH RECURSIVE fib(n, a, b) AS (\n  SELECT 1, 0, 1\n  UNION ALL\n  SELECT n + 1, b, a + b FROM fib\n  WHERE n < ' + N + '\n)\nSELECT n, a FROM fib;';
          cur = [1, 0, 1];
        } else {
          cols = ['x'];
          sql = 'WITH RECURSIVE s(x) AS (\n  SELECT ' + start + '\n  UNION ALL\n  SELECT x + ' + step + ' FROM s\n  WHERE x + ' + step + ' <= ' + end + '\n)\nSELECT x FROM s;';
          cur = [start];
        }
        frames.push({ narr: 'Read the CTE top to bottom: line 2 is the <b>anchor</b>, line 4 the <b>recursive member</b> (it mentions its own name), line 5 the <b>stop condition</b>. Nothing has run yet.', parts: [
          { type: 'code', label: 'Query', lang: 'sql', code: sql, hl: { 2: 'cur', 4: 'cur', 5: 'cur' } },
          { type: 'table', label: 'Result (empty)', columns: cols, rows: [] }
        ] });
        result.push(cur.slice());
        frames.push({ narr: '<b>Anchor</b> runs once and produces <b>' + JSON.stringify(cur) + '</b>. The row goes into the result AND into the <b>working table</b> — the only rows the next round can see.', parts: [
          { type: 'code', label: 'Query', lang: 'sql', code: sql, hl: { 2: 'ok' } },
          { type: 'queue', label: 'Working table (input for next round)', items: [cur.join(', ')], hl: { 0: 'ok' }, frontLabel: 'next', backLabel: '' },
          { type: 'table', label: 'Result', columns: cols, rows: result.map(function (r) { return r.slice(); }), hl: { 0: 'ok' } },
          { type: 'vars', label: 'Progress', vals: { round: 'anchor', rows_in_result: 1 } }
        ] });
        while (true) {
          round++;
          var next, okCond, condText;
          if (fib) { next = [cur[0] + 1, cur[2], cur[1] + cur[2]]; okCond = cur[0] < N; condText = 'n &lt; ' + N + ' → ' + cur[0] + ' &lt; ' + N; }
          else { next = [cur[0] + step]; okCond = cur[0] + step <= end; condText = 'x + ' + step + ' ≤ ' + end + ' → ' + (cur[0] + step) + ' ≤ ' + end; }
          if (!okCond) {
            frames.push({ narr: 'Round ' + round + ': the working table holds <b>' + JSON.stringify(cur) + '</b>. The stop condition <code>' + condText + '</code> is <span class="c-r">FALSE</span>, so the recursive member produces <b>zero rows</b>. An empty round ends the recursion.', parts: [
              { type: 'code', label: 'Query', lang: 'sql', code: sql, hl: { 4: 'cur', 5: 'bad' } },
              { type: 'queue', label: 'Working table', items: [cur.join(', ')], hl: { 0: 'cur' } },
              { type: 'table', label: 'New rows this round', columns: cols, rows: [] },
              { type: 'vars', label: 'Progress', vals: { round: round, new_rows: 0, rows_in_result: result.length }, hl: { new_rows: 'bad' } }
            ] });
            break;
          }
          result.push(next.slice());
          var rh = {}; rh[result.length - 1] = 'ok';
          frames.push({ narr: 'Round ' + round + ': the recursive member reads the working table <b>' + JSON.stringify(cur) + '</b> (not the whole result!). Condition <code>' + condText + '</code> is <span class="c-g">TRUE</span>, so it emits <b>' + JSON.stringify(next) + '</b>' + (fib ? ' — the new <i>a</i> is the old <i>b</i>, the new <i>b</i> is <i>a + b</i>.' : '.') + ' That row becomes the next working table.', parts: [
            { type: 'code', label: 'Query', lang: 'sql', code: sql, hl: { 4: 'ok', 5: 'ok' } },
            { type: 'queue', label: 'Working table', items: [cur.join(', '), '→ ' + next.join(', ')], hl: { 0: 'done', 1: 'ok' } },
            { type: 'table', label: 'Result (grows by one row per round)', columns: cols, rows: result.map(function (r) { return r.slice(); }), hl: rh },
            { type: 'vars', label: 'Progress', vals: { round: round, new_rows: 1, rows_in_result: result.length }, hl: { new_rows: 'ok' } }
          ] });
          cur = next;
        }
        var fin = fib ? result.map(function (r) { return [r[0], r[1]]; }) : result.map(function (r) { return [r[0]]; });
        frames.push({ narr: 'Final SELECT reads the accumulated result: <b>' + fin.length + '</b> rows from 1 anchor row + ' + (fin.length - 1) + ' recursive rounds. Without the stop condition this would never end (SQLite/PostgreSQL) or hit a recursion limit (SQL Server 100, MySQL 1000).', parts: [
          { type: 'table', label: 'Query result', columns: fib ? ['n', 'fibonacci'] : ['x'], rows: fin, hl: (function () { var h = {}; fin.forEach(function (r, k) { h[k] = 'sel'; }); return h; })() },
          { type: 'bars', label: fib ? 'Fibonacci values' : 'Series values', values: fin.map(function (r) { return r[r.length - 1]; }) }
        ] });
        return frames;
      }
    },
    examples: [
      { title: 'Multiplication table with two counters', html: `<p>A recursive CTE can carry several columns. Here <code>(i, j)</code> walks a 3×3 grid: when <code>j</code> reaches 3 it resets to 1 and <code>i</code> advances. A CROSS JOIN of two series is the simpler alternative — shown second.</p>`, code: { lang: 'sql', code: `WITH RECURSIVE t(i, j) AS (
    SELECT 1, 1
    UNION ALL
    SELECT CASE WHEN j = 3 THEN i + 1 ELSE i END,
           CASE WHEN j = 3 THEN 1     ELSE j + 1 END
    FROM t
    WHERE NOT (i = 3 AND j = 3)
)
SELECT i, j, i * j AS product FROM t;

-- Same grid with two simple series and a CROSS JOIN
WITH RECURSIVE a(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM a WHERE i < 3)
SELECT x.i, y.i AS j, x.i * y.i AS product FROM a x CROSS JOIN a y ORDER BY x.i, y.i;` } },
      { title: 'Split a comma-separated tags column into rows', html: `<p>Each round peels one tag off the front of <code>rest</code>. Appending a trailing comma to the anchor makes every tag end with a comma, so one rule handles all of them. Then a normal GROUP BY counts tags: <b>portable</b> and <b>work</b> appear 3 times each. Atlas (tags NULL) is skipped in the anchor.</p>${H.table(['round', 'tag', 'rest'], [['anchor', 'NULL', 'work,portable,premium,'], ['1', 'work', 'portable,premium,'], ['2', 'portable', 'premium,'], ['3', 'premium', '<span class="c-m">\'\' → stop</span>']])}`, code: { lang: 'sql', db: 'shop', code: `WITH RECURSIVE split(id, tag, rest) AS (
    SELECT id, NULL, tags || ','               -- anchor: whole string + trailing comma
    FROM products WHERE tags IS NOT NULL
    UNION ALL
    SELECT id,
           substr(rest, 1, instr(rest, ',') - 1),   -- text before first comma
           substr(rest, instr(rest, ',') + 1)       -- everything after it
    FROM split
    WHERE rest <> ''                                -- stop when nothing is left
)
SELECT tag, COUNT(*) AS products
FROM split
WHERE tag IS NOT NULL
GROUP BY tag
ORDER BY products DESC, tag;` } },
      { title: 'Monthly calendar for sign-ups (months with zero still shown)', html: `<p><code>date(month, '+1 month')</code> steps a month at a time. A correlated COUNT then counts sign-ups per month — January to June 2024 have one each (Asha … Fatima), while July–September have 0 and <b>still appear</b>, because the calendar drives the query.</p>`, code: { lang: 'sql', db: 'shop', code: `WITH RECURSIVE months(m) AS (
    SELECT '2024-01-01'
    UNION ALL
    SELECT date(m, '+1 month') FROM months WHERE m < '2024-09-01'
)
SELECT strftime('%Y-%m', m) AS month,
       (SELECT COUNT(*) FROM customers c
        WHERE strftime('%Y-%m', c.signup_date) = strftime('%Y-%m', months.m)) AS signups
FROM months;` } },
      { title: 'LIMIT as a safety net, and UNION as a duplicate stop', html: `<p>In SQLite (and in practice PostgreSQL) an outer <code>LIMIT</code> stops an otherwise infinite recursion once enough rows exist. With <code>UNION</code> (not ALL), a row already in the result is discarded, so the cycle 1 → 2 → 3 → 1 stops by itself after 3 rows.</p>`, code: { lang: 'sql', code: `-- No stop condition, but LIMIT ends it after 5 rows
WITH RECURSIVE n(x) AS (SELECT 1 UNION ALL SELECT x + 1 FROM n)
SELECT x FROM n LIMIT 5;

-- UNION removes repeats: 1, 2, 3 then 1 again is discarded → stop
WITH RECURSIVE c(x) AS (SELECT 1 UNION SELECT x % 3 + 1 FROM c)
SELECT x FROM c;` } }
    ],
    deepDive: `<p><b>Semantics precisely.</b> The SQL standard defines recursive CTEs as a <i>fixpoint</i>: keep applying the recursive member until no new rows appear. Engines implement it with the working-table loop (semi-naive evaluation): each round only feeds the <b>new</b> rows from the last round into the recursive member, which is why the member sees the working table, not the full result. SQLite uses a <b>queue</b> and processes one row at a time; adding <code>ORDER BY</code> inside the recursive member turns the queue into a priority queue (SQLite extension), letting you choose depth-first vs breadth-first order.</p>
<p><b>Restrictions on the recursive member</b> (vary by engine): it must reference the CTE exactly once; no aggregates (<code>SUM</code>, <code>COUNT</code>) or window functions over the recursive reference; no <code>DISTINCT</code> / <code>GROUP BY</code> in it (PostgreSQL); the CTE cannot be on the inner side of a LEFT JOIN or inside NOT EXISTS. Do aggregation <b>after</b> the recursion in the outer query.</p>
<p><b>Types are fixed by the anchor.</b> In PostgreSQL and SQL Server the column types come from the anchor. Building a path string with <code>'a'</code> as anchor gives a short type and the recursive part errors or truncates ("types don't match between the anchor and the recursive part"). Cast in the anchor: <code>CAST(name AS VARCHAR(1000))</code> / <code>name::text</code>. SQLite is dynamically typed and does not care.</p>
<p><b>Limits.</b> SQL Server: <code>OPTION (MAXRECURSION n)</code>, default 100, 0 = unlimited. MySQL: <code>cte_max_recursion_depth</code> (1000) and <code>max_execution_time</code>. PostgreSQL and SQLite: no limit — protect yourself with a depth counter (<code>WHERE depth &lt; 50</code>).</p>
<p><b>Built-ins.</b> PostgreSQL has <code>generate_series(start, stop, step)</code> for numbers and timestamps; SQLite offers it as the <code>series</code> extension (a table-valued function compiled into the sqlite3 command-line shell and some builds, but not guaranteed in every app), DuckDB has <code>range</code>/<code>generate_series</code>. Prefer them when available — they are faster and clearer — but recursive CTEs are the portable fallback every interviewer accepts.</p>
<p><b>Performance.</b> A series of N rows costs O(N) rounds. For a million-row calendar, a recursive CTE is fine (milliseconds); a permanent <i>calendar / numbers table</i> is the production pattern for data warehouses (with holiday flags, fiscal weeks, etc.).</p>`,
    aiEra: `<p><b>What AI changes:</b> "generate every date between X and Y" is a one-line prompt today, and AI usually gets the anchor/step right. The bugs are at the edges: off-by-one end dates, time zones, and infinite loops.</p>
<p><b>Use AI as a partner:</b> <code>Write a recursive CTE for all Mondays in 2024 in SQLite, then tell me the first and last rows and the row count so I can verify</code>. <code>Port this recursive CTE from SQLite to SQL Server: fix types, MAXRECURSION and date functions</code>. Ask it to trace the first three rounds of the working table so you can check its mental model against yours.</p>
<p><b>Where AI goes wrong:</b> stop conditions that check the old value (<code>WHERE x &lt;= 10</code> producing 11), string types that truncate in PostgreSQL/SQL Server, using <code>generate_series</code> in an engine that lacks it, and suggesting <code>UNION</code> as cycle protection when rows carry a changing depth column (it never stops).</p>
<p><b>What you must still own:</b> proving termination, counting rows (end − start) / step + 1 before you run, and choosing a calendar table vs on-the-fly series in production.</p>`,
    problems: [{
      title: 'Daily Revenue Report With Zero-Sales Days',
      level: 'Medium', tags: ['recursive CTE', 'date series', 'LEFT JOIN'], companies: ['Amazon', 'Uber', 'Zomato'],
      statement: `<p>Finance wants revenue for <b>every day from 2024-07-01 to 2024-07-07</b> (inclusive), one row per day. Revenue = sum of <code>qty × unit_price</code> over non-cancelled orders placed that day (guest orders count). Days without sales must show <b>0</b>, not be missing.</p>`,
      constraints: `<p>SQLite dates are TEXT in <code>YYYY-MM-DD</code>; use <code>date(d, '+1 day')</code>. Output exactly 7 rows ordered by day.</p>`,
      example: `${H.table(['day', 'revenue', 'why'], [['2024-07-01', '1500', 'order 101'], ['2024-07-02', '<span class="c-y">0</span>', 'no orders'], ['2024-07-03', '880', 'order 103'], ['2024-07-04', '<span class="c-y">0</span>', 'order 104 cancelled'], ['2024-07-06', '60', 'guest order 109']])}`,
      brute: { why: `<p>Grouping the orders table directly only produces days that <b>have</b> data, so the report shows 3 rows instead of 7 — charts draw a straight line over the gaps and averages per day are inflated. You cannot GROUP BY your way to rows that do not exist.</p>`, code: { lang: 'sql', db: 'shop', code: `-- Only days WITH sales appear: 3 rows, not 7
SELECT o.order_date AS day, SUM(oi.qty * oi.unit_price) AS revenue
FROM orders o JOIN order_items oi ON oi.order_id = o.id
WHERE o.status <> 'cancelled'
  AND o.order_date BETWEEN '2024-07-01' AND '2024-07-07'
GROUP BY o.order_date
ORDER BY day;` } },
      mcq: { q: 'Which table should be on the LEFT side of the LEFT JOIN?', options: ['The generated calendar of days', 'The orders table', 'order_items', 'It does not matter'], answer: 0, explain: 'The calendar must drive the query so every day survives; facts are attached when they exist and COALESCE turns the missing ones into 0.' },
      hints: [`<p>Hint 1: The rows you need (every day) do not exist in any table — you must <b>generate</b> them first.</p>`, `<p>Hint 2: <code>WITH RECURSIVE days(d) AS (SELECT '2024-07-01' UNION ALL SELECT date(d, '+1 day') FROM days WHERE d &lt; '2024-07-07')</code>, then aggregate revenue per date in a second CTE.</p>`, `<p>Hint 3: <code>days LEFT JOIN daily ON daily.order_date = days.d</code>, then <code>COALESCE(revenue, 0)</code>. Put the cancelled filter inside the revenue CTE (filtering in the outer WHERE would turn the LEFT JOIN back into an inner join).</p>`],
      solution: {
        approach: `<p>Generate the calendar with a recursive CTE, aggregate the facts per day in a second CTE, and LEFT JOIN facts onto the calendar so every day appears. Missing days get NULL, which COALESCE turns into 0.</p>`,
        code: { lang: 'sql', db: 'shop', code: `WITH RECURSIVE days(d) AS (
        SELECT '2024-07-01'                                   -- anchor: first day
        UNION ALL
        SELECT date(d, '+1 day') FROM days                     -- next day
        WHERE d < '2024-07-07'                                 -- stop after the last day
     ),
     daily AS (                                                -- facts per day
        SELECT o.order_date, SUM(oi.qty * oi.unit_price) AS revenue
        FROM orders o
        JOIN order_items oi ON oi.order_id = o.id
        WHERE o.status <> 'cancelled'
        GROUP BY o.order_date
     )
SELECT days.d                    AS day,
       COALESCE(daily.revenue, 0) AS revenue
FROM days
LEFT JOIN daily ON daily.order_date = days.d
ORDER BY day;` },
        dry: { head: ['round', 'working table', 'new day', 'revenue after LEFT JOIN'], rows: [['anchor', '—', '2024-07-01', '1500'], ['1', '07-01', '2024-07-02', '0'], ['2', '07-02', '2024-07-03', '880'], ['6', '07-06', '2024-07-07', '0'], ['7', '07-07', '<span class="c-r">none — stop</span>', '7 rows total']] },
        complexity: `<p>O(D) rounds for D days + O(N) to aggregate orders + a hash join: O(D + N). For multi-year dashboards, keep a permanent calendar table.</p>`,
        followUps: ['Make the range dynamic: from the first to the last order date.', 'Add a 3-day moving average (window functions, next module).', 'Count orders per day per status, still showing zero days.']
      }
    }]
  });

  /* =====================================================================
     TOPIC 6 — Recursive CTEs II: hierarchies, paths, graphs
     ===================================================================== */
  topics.push({
    title: 'Recursive CTEs for Hierarchies: Org Charts, Trees, BOMs & Graphs',
    analogy: `<p>You want to invite <b>everyone under Ravi</b> to a team lunch. You ask Ravi: <i>"Who reports to you?"</i> — Karan and Divya. Then you ask Karan and Divya the same question — Arjun, Neha, Vikram, Priya. You ask those four — nobody. Done. You never needed to know in advance how deep the team went; you just kept asking <b>the people you found last time</b>.</p>
<p>That is exactly a recursive CTE over a table with a <code>manager_id</code> column: the anchor is Ravi, each round asks "who reports to the people found in the previous round?", and it stops when a round finds no one.</p>`,
    explain: `<p>Hierarchies are usually stored as an <b>adjacency list</b>: each row points to its parent (<code>employees.manager_id → employees.id</code>, <code>categories.parent_id → categories.id</code>). A self join walks <b>one</b> level; a recursive CTE walks <b>all</b> levels.</p>
<pre>WITH RECURSIVE org(id, name, depth, path) AS (
    SELECT id, name, 0, name                       -- anchor: the root(s)
    FROM employees WHERE manager_id IS NULL
    UNION ALL
    SELECT e.id, e.name, o.depth + 1,               -- children of last round's rows
           o.path || ' &gt; ' || e.name
    FROM employees e
    JOIN org o ON e.manager_id = o.id              -- the "walk one level" join
)
SELECT * FROM org ORDER BY path;</pre>
${H.table(['Direction', 'Anchor', 'Recursive join', 'Answers'], [
  ['<b>Top-down</b> (descendants)', 'the manager / root category', '<code>child.parent_id = cte.id</code>', 'whole team, subtree, all sub-categories'],
  ['<b>Bottom-up</b> (ancestors)', 'one employee / leaf category', '<code>parent.id = cte.parent_id</code>', 'chain of command, breadcrumb, "all my bosses"']
])}
<p><b>Columns you carry along</b> make the magic:</p>
<ul>
<li><code>depth</code> (level) — start at 0, add 1 each round. Lets you indent, count per level, or cap the depth.</li>
<li><code>path</code> — concatenate names/ids. Gives a readable breadcrumb, a sort key that prints the tree in order (<code>ORDER BY path</code>), and a <b>visited list</b> for cycle detection.</li>
<li><b>Accumulated values</b> — multiply quantities down a bill of materials, add costs along a route.</li>
</ul>
<p><b>Graphs and cycles.</b> Org charts are trees (no cycles). Flight routes, friendships and dependency graphs can loop (DEL → BOM → BLR → MAA → DEL…). Then you must stop revisiting: keep the path and add <code>WHERE instr(path, ',' || next || ',') = 0</code>, or cap hops with <code>depth &lt; k</code>. PostgreSQL 14+ also has a built-in <code>CYCLE</code> clause.</p>
<p><b>Ancestor–descendant pairs ("closure").</b> Anchor with every node paired with itself; each round extends each pair one level down. Grouping the result by ancestor answers "team size / total team salary for <i>every</i> manager" in one query.</p>`,
    clues: [
      'Table has a <b>self-referencing</b> column: <code>manager_id</code>, <code>parent_id</code>, <code>reports_to</code>, <code>replied_to</code> → hierarchy → recursive CTE',
      '"all direct <b>and indirect</b> reports", "at any level", "the entire subtree" → top-down recursion',
      '"chain of command", "breadcrumb", "all ancestors", "root of each node" → bottom-up recursion',
      '"how many levels deep", "depth of the tree", "people per level" → carry a depth column',
      '"total quantity of raw parts", "bill of materials", "explode" → multiply along the path',
      '"all routes / reachable cities / dependency order" on data that can loop → recursion + path-based cycle check or depth cap'
    ],
    code: [
      { lang: 'sql', db: 'company', title: 'Top-down: full org chart with depth, indentation and path', code: `WITH RECURSIVE org(id, name, title, depth, path) AS (
    SELECT id, name, title, 0, name                      -- anchor: the CEO
    FROM employees
    WHERE manager_id IS NULL
    UNION ALL
    SELECT e.id, e.name, e.title, o.depth + 1,           -- one level deeper
           o.path || ' > ' || e.name
    FROM employees e
    JOIN org o ON e.manager_id = o.id
)
SELECT depth,
       substr('            ', 1, depth * 2) || name AS org_chart,   -- indent 2 spaces per level
       title,
       path
FROM org
ORDER BY path;                                            -- path sorts parents before children` },
      { lang: 'sql', db: 'company', title: 'Bottom-up: chain of command for one employee', code: `WITH RECURSIVE chain(id, name, manager_id, steps) AS (
    SELECT id, name, manager_id, 0
    FROM employees WHERE name = 'Imran'                   -- anchor: the starting employee
    UNION ALL
    SELECT m.id, m.name, m.manager_id, c.steps + 1        -- walk UP to the manager
    FROM employees m
    JOIN chain c ON m.id = c.manager_id
)
SELECT steps, name FROM chain ORDER BY steps;            -- Imran, Sneha, Meera, Asha` },
      { lang: 'sql', db: 'company', title: 'Closure pairs: team size and team cost for every manager', code: `WITH RECURSIVE closure(ancestor, descendant) AS (
    SELECT id, id FROM employees                           -- everyone is in their own subtree
    UNION ALL
    SELECT c.ancestor, e.id                                -- extend each pair one level down
    FROM closure c
    JOIN employees e ON e.manager_id = c.descendant
)
SELECT m.name                    AS manager,
       COUNT(*) - 1              AS team_size,             -- minus the manager themself
       SUM(e.salary) - m.salary  AS team_salary_cost
FROM closure c
JOIN employees m ON m.id = c.ancestor
JOIN employees e ON e.id = c.descendant
GROUP BY m.id, m.name, m.salary
HAVING COUNT(*) > 1
ORDER BY team_salary_cost DESC;` }
    ],
    codeTitle: ['Top-down org chart', 'Bottom-up chain', 'Subtree totals (closure)'],
    viz: [{
      title: 'Org chart recursion: each round adds the next level of the tree',
      input: 'down Asha',
      inputLabel: '"down NAME" (everyone under NAME) or "up NAME" (chain of command)',
      gen: function (input) {
        var m = String(input || '').trim().match(/^(down|up)\s+(\w+)$/i);
        if (!m) throw new Error('Type "down Asha", "down Ravi" or "up Imran"');
        var dir = m[1].toLowerCase(), who = m[2].toLowerCase();
        var start = null;
        EMP.forEach(function (e) { if (e[1].toLowerCase() === who || String(e[0]) === who) start = e; });
        if (!start) throw new Error('Unknown employee. Try Asha, Ravi, Meera, Karan, Sneha, Imran, Tom…');
        var sql = dir === 'down'
          ? "WITH RECURSIVE team(id, name, depth, path) AS (\n  SELECT id, name, 0, name FROM employees\n  WHERE name = '" + start[1] + "'\n  UNION ALL\n  SELECT e.id, e.name, t.depth + 1, t.path || '>' || e.name\n  FROM employees e JOIN team t ON e.manager_id = t.id\n)\nSELECT * FROM team;"
          : "WITH RECURSIVE chain(id, name, manager_id, steps) AS (\n  SELECT id, name, manager_id, 0 FROM employees\n  WHERE name = '" + start[1] + "'\n  UNION ALL\n  SELECT m.id, m.name, m.manager_id, c.steps + 1\n  FROM employees m JOIN chain c ON m.id = c.manager_id\n)\nSELECT * FROM chain;";
        var cols = dir === 'down' ? ['id', 'name', 'depth', 'path'] : ['id', 'name', 'manager_id', 'steps'];
        var frames = [], result = [], gh = {}, eh = {};
        var work = dir === 'down' ? [[start[0], start[1], 0, start[1]]] : [[start[0], start[1], nm(start[3]), 0]];
        result = work.slice();
        frames.push({ narr: 'Every row of <b>employees</b> stores its boss in <code>manager_id</code> — an <b>adjacency list</b>. One self-join walks one level; we want ' + (dir === 'down' ? 'every level <b>below</b> ' : 'every level <b>above</b> ') + start[1] + ', however many there are.', parts: [
          { type: 'code', label: 'Query', lang: 'sql', code: sql, hl: {} },
          orgGraph({}, 'Org chart (arrows: manager → report)'),
          { type: 'table', label: 'employees (id, name, manager_id)', columns: ['id', 'name', 'manager_id'], rows: empRows([0, 1, 3]) }
        ] });
        gh[start[0]] = 'ok';
        frames.push({ narr: (dir === 'down' ? 'Top-down walk. ' : 'Bottom-up walk. ') + 'The <b>anchor</b> selects <b>' + start[1] + '</b>. It becomes round 0 of the result and the first <b>working table</b>.', parts: [
          { type: 'code', label: 'Query', lang: 'sql', code: sql, hl: { 2: 'ok', 3: 'ok' } },
          orgGraph(JSON.parse(JSON.stringify(gh)), 'Org chart — green = found this round'),
          { type: 'table', label: 'Working table (round 0)', columns: cols, rows: work.map(function (r) { return r.slice(); }), hl: { 0: 'ok' } },
          { type: 'table', label: 'Result', columns: cols, rows: result.map(function (r) { return r.slice(); }), hl: { 0: 'ok' } }
        ] });
        var round = 0;
        while (work.length && round < 6) {
          round++;
          var next = [];
          Object.keys(gh).forEach(function (k) { gh[k] = 'done'; });
          Object.keys(eh).forEach(function (k) { eh[k] = 'done'; });
          work.forEach(function (w) {
            if (dir === 'down') {
              EMP.forEach(function (e) { if (e[3] === w[0]) { next.push([e[0], e[1], w[2] + 1, w[3] + '>' + e[1]]); gh[e[0]] = 'ok'; eh[w[0] + '-' + e[0]] = 'ok'; } });
            } else {
              var mgr = w[2] === 'NULL' ? null : empById(w[2]);
              if (mgr) { next.push([mgr[0], mgr[1], nm(mgr[3]), w[3] + 1]); gh[mgr[0]] = 'ok'; eh[mgr[0] + '-' + w[0]] = 'ok'; }
            }
          });
          var wl = work.map(function (r) { return r[1]; }).join(', ');
          if (!next.length) {
            frames.push({ narr: 'Round ' + round + ': the working table is {' + wl + '}. ' + (dir === 'down' ? 'Nobody has <code>manager_id</code> equal to any of them' : start[1] === wl ? 'No manager above' : wl + ' has <code>manager_id = NULL</code>, so the join finds no row') + ' → the recursive member returns <b>0 rows</b> → recursion stops.', parts: [
              { type: 'code', label: 'Query', lang: 'sql', code: sql, hl: { 6: 'bad' } },
              orgGraph(JSON.parse(JSON.stringify(gh)), 'Org chart'),
              { type: 'table', label: 'New rows this round', columns: cols, rows: [] },
              { type: 'vars', label: 'Progress', vals: { round: round, new_rows: 0, total_rows: result.length }, hl: { new_rows: 'bad' } }
            ] });
            break;
          }
          var rh = {};
          next.forEach(function (r) { rh[result.length] = 'ok'; result.push(r); });
          frames.push({ narr: 'Round ' + round + ': join <code>' + (dir === 'down' ? 'e.manager_id = t.id' : 'm.id = c.manager_id') + '</code> against the working table {' + wl + '} only. Found <b>' + next.map(function (r) { return r[1]; }).join(', ') + '</b> ' + (dir === 'down' ? '(depth ' + next[0][2] + ')' : '(one step up)') + '. These rows become the next working table.', parts: [
            { type: 'code', label: 'Query', lang: 'sql', code: sql, hl: { 5: 'ok', 6: 'ok' } },
            orgGraph(JSON.parse(JSON.stringify(gh)), 'Org chart — green = found this round, faded = earlier rounds', JSON.parse(JSON.stringify(eh))),
            { type: 'table', label: 'Working table (round ' + round + ')', columns: cols, rows: next.map(function (r) { return r.slice(); }) },
            { type: 'table', label: 'Result (accumulated)', columns: cols, rows: result.map(function (r) { return r.slice(); }), hl: rh }
          ] });
          work = next;
        }
        var fh = {}; result.forEach(function (r, k) { fh[k] = 'sel'; });
        frames.push({ narr: 'Final result: <b>' + result.length + '</b> row(s) in ' + round + ' round(s). ' + (dir === 'down' ? 'Rounds = levels: the CTE did a <b>breadth-first</b> walk. <code>ORDER BY path</code> would print it as an indented tree instead.' : 'Read top to bottom, this is the chain of command from ' + start[1] + ' to the CEO.'), parts: [
          { type: 'table', label: 'Query result', columns: cols, rows: result, hl: fh },
          { type: 'text', label: 'Why recursion?', html: 'A fixed self-join chain (e JOIN m1 JOIN m2) only reaches as many levels as you wrote joins. The recursive CTE keeps going until a round is empty — it adapts to any depth.' }
        ] });
        return frames;
      }
    }, {
      title: 'Graph with a cycle: path list stops revisits (routes from a city)',
      input: 'DEL MAA',
      inputLabel: 'Start city and target city (DEL, BOM, GOA, BLR, MAA)',
      gen: function (input) {
        var R = [['DEL', 'BOM', 100], ['DEL', 'BLR', 250], ['BOM', 'BLR', 80], ['BOM', 'GOA', 60], ['GOA', 'BLR', 50], ['BLR', 'MAA', 40], ['MAA', 'DEL', 200], ['GOA', 'MAA', 120]];
        var POS = { DEL: [10, 10], BOM: [32, 34], GOA: [55, 50], BLR: [66, 14], MAA: [90, 36] };
        var m = String(input || '').trim().toUpperCase().split(/\s+/);
        if (m.length !== 2 || !POS[m[0]] || !POS[m[1]]) throw new Error('Type two cities, e.g. "DEL MAA" (choose from DEL BOM GOA BLR MAA)');
        var src = m[0], dst = m[1];
        function g(hl, ehl) { return { type: 'graph', label: 'routes (directed, cost on edge)', directed: true, height: 56, nodes: Object.keys(POS).map(function (c) { return { id: c, label: c, x: POS[c][0], y: POS[c][1] }; }), edges: R.map(function (r) { return [r[0], r[1], r[2]]; }), hl: hl, ehl: ehl }; }
        var sql = "WITH RECURSIVE trip(city, path, cost) AS (\n  SELECT '" + src + "', '," + src + ",', 0\n  UNION ALL\n  SELECT r.dst, t.path || r.dst || ',', t.cost + r.cost\n  FROM trip t JOIN routes r ON r.src = t.city\n  WHERE instr(t.path, ',' || r.dst || ',') = 0  -- not visited\n)\nSELECT * FROM trip WHERE city = '" + dst + "' ORDER BY cost;";
        var frames = [], work = [[src, ',' + src + ',', 0]], all = work.slice(), round = 0;
        var h0 = {}; h0[src] = 'cur'; h0[dst] = 'sel';
        frames.push({ narr: 'Routes can loop (MAA → DEL). Each row carries its <b>path</b> as a visited list like <code>,DEL,BOM,</code>. The recursive member refuses to step to a city already in the path, so every branch must end.', parts: [
          { type: 'code', label: 'Query', lang: 'sql', code: sql, hl: { 2: 'ok', 6: 'cur' } }, g(h0, {}),
          { type: 'table', label: 'Working table (anchor)', columns: ['city', 'path', 'cost'], rows: work.map(function (r) { return r.slice(); }), hl: { 0: 'ok' } }
        ] });
        while (work.length && round < 8) {
          round++;
          var next = [], tried = [], th = {}, ghl = {}, ehl = {};
          work.forEach(function (w) {
            R.forEach(function (r) {
              if (r[0] !== w[0]) return;
              var visited = w[1].indexOf(',' + r[1] + ',') >= 0;
              tried.push([w[0] + ' → ' + r[1], w[1], visited ? 'cycle: skip' : 'cost ' + (w[2] + r[2])]);
              th[tried.length - 1] = visited ? 'bad' : 'ok';
              ehl[r[0] + '-' + r[1]] = visited ? 'bad' : 'ok';
              if (!visited) { next.push([r[1], w[1] + r[1] + ',', w[2] + r[2]]); ghl[r[1]] = 'ok'; }
            });
            ghl[w[0]] = ghl[w[0]] || 'cur';
          });
          if (!tried.length && !next.length) {
            frames.push({ narr: 'Round ' + round + ': no outgoing routes from the working table → 0 new rows → stop.', parts: [g({}, {}), { type: 'table', label: 'New rows', columns: ['city', 'path', 'cost'], rows: [] }] });
            break;
          }
          next.forEach(function (r) { all.push(r); });
          frames.push({ narr: 'Round ' + round + ': expand every row of the working table along each outgoing route. ' + (tried.some(function (t) { return t[2] === 'cycle: skip'; }) ? '<span class="c-r">Red = would revisit a city already in the path → filtered by the instr() check.</span> ' : '') + (next.length ? next.length + ' new partial trip(s).' : '<b>No new rows → recursion ends.</b>'), parts: [
            { type: 'code', label: 'Query', lang: 'sql', code: sql, hl: { 4: 'ok', 5: 'ok', 6: next.length ? 'ok' : 'bad' } }, g(ghl, ehl),
            { type: 'table', label: 'Expansions tried this round', columns: ['step', 'path so far', 'outcome'], rows: tried, hl: th },
            { type: 'table', label: 'Working table for next round', columns: ['city', 'path', 'cost'], rows: next.map(function (r) { return r.slice(); }) }
          ] });
          if (!next.length) break;
          work = next;
        }
        var ans = all.filter(function (r) { return r[0] === dst && r[1] !== ',' + src + ','; }).sort(function (a, b) { return a[2] - b[2]; });
        var ah = {}; if (ans.length) ah[0] = 'sel';
        frames.push({ narr: ans.length ? 'All simple paths to <b>' + dst + '</b>, cheapest first. The best is <b>' + ans[0][1] + '</b> for <b>' + ans[0][2] + '</b>.' + (function () { var hop = function (r) { return r[1].split(',').length - 3; }; var fewest = Math.min.apply(null, ans.map(hop)); return hop(ans[0]) > fewest ? ' It uses <b>more hops</b> (' + hop(ans[0]) + ') than the shortest-hop route (' + fewest + '), which is why a fixed "max ' + fewest + ' hops" query would miss it.' : ''; })() : 'No route reaches ' + dst + ' from ' + src + '.', parts: [
          { type: 'table', label: 'SELECT … WHERE city = \'' + dst + '\' ORDER BY cost', columns: ['city', 'path', 'cost'], rows: ans, hl: ah },
          { type: 'text', label: 'Cost of enumerating paths', html: 'This lists <b>every</b> simple path — exponential on big dense graphs. Fine for small route maps and interviews; for real shortest paths use a graph engine or Dijkstra in application code.' }
        ] });
        return frames;
      }
    }],
    examples: [
      { title: 'Indented org chart (top-down, ordered by path)', html: `<p>The output looks like a folder tree. <code>ORDER BY path</code> places every manager right before their reports because "Asha &gt; Ravi" sorts before "Asha &gt; Ravi &gt; Divya".</p>${H.table(['depth', 'org_chart'], [['0', 'Asha'], ['1', '··Lata'], ['2', '····Tom'], ['1', '··Meera'], ['2', '····Sneha'], ['3', '······Imran']])}<p>(Siblings sort alphabetically by name; for "hire order" build the path from zero-padded ids instead.)</p>`, code: { lang: 'sql', db: 'company', code: `WITH RECURSIVE org(id, name, depth, path) AS (
    SELECT id, name, 0, name FROM employees WHERE manager_id IS NULL
    UNION ALL
    SELECT e.id, e.name, o.depth + 1, o.path || ' > ' || e.name
    FROM employees e JOIN org o ON e.manager_id = o.id)
SELECT depth, substr('            ', 1, depth * 2) || name AS org_chart
FROM org ORDER BY path;` } },
      { title: 'Headcount per level and tree depth', html: `<p>Aggregate <b>after</b> the recursion: 1 person at level 0, 4 at level 1, 6 at level 2 and 5 at level 3, so the tree is 3 levels deep below the CEO.</p>`, code: { lang: 'sql', db: 'company', code: `WITH RECURSIVE org(id, depth) AS (
    SELECT id, 0 FROM employees WHERE manager_id IS NULL
    UNION ALL
    SELECT e.id, o.depth + 1 FROM employees e JOIN org o ON e.manager_id = o.id)
SELECT depth, COUNT(*) AS people FROM org GROUP BY depth ORDER BY depth;` } },
      { title: 'All sub-categories of Electronics (category tree)', html: `<p>Same pattern on a different table: anchor = Electronics (id 2), recurse on <code>parent_id</code>. Result ids 2, 4, 5, 6, 7, 8 — useful for "show products in Electronics <b>and all its sub-categories</b>".</p>`, code: { lang: 'sql', db: 'network', code: `WITH RECURSIVE sub(id, name, depth) AS (
    SELECT id, name, 0 FROM categories WHERE name = 'Electronics'
    UNION ALL
    SELECT c.id, c.name, s.depth + 1
    FROM categories c JOIN sub s ON c.parent_id = s.id)
SELECT id, substr('        ', 1, depth * 2) || name AS category FROM sub;` } },
      { title: 'Bill of materials: multiply quantities down the tree', html: `<p>A bike needs 2 wheels; each wheel needs 32 spokes → <b>64 spokes</b>. Carry <code>qty</code> and multiply by the child quantity each level, then SUM per part (Bolt appears under both Frame and Seat: 6 + 2 = 8).</p>`, code: { lang: 'sql', db: 'network', code: `WITH RECURSIVE explode(part, qty, depth) AS (
    SELECT 'Bike', 1, 0
    UNION ALL
    SELECT b.child, x.qty * b.qty, x.depth + 1
    FROM bom b JOIN explode x ON b.parent = x.part)
SELECT part, SUM(qty) AS total_needed, MAX(depth) AS deepest_level
FROM explode
GROUP BY part
ORDER BY deepest_level, part;` } },
      { title: 'Cycle protection on a route graph', html: `<p>Without the <code>instr(path, …) = 0</code> check, DEL → BOM → BLR → MAA → DEL → … loops forever. With it, every branch ends and we get four simple routes to MAA; the cheapest is <b>DEL → BOM → BLR → MAA = 220</b> (3 hops), cheaper than the 2-hop DEL → BLR → MAA = 290.</p>`, code: { lang: 'sql', db: 'network', code: `WITH RECURSIVE trip(city, path, cost, hops) AS (
    SELECT 'DEL', ',DEL,', 0, 0
    UNION ALL
    SELECT r.dst, t.path || r.dst || ',', t.cost + r.cost, t.hops + 1
    FROM trip t JOIN routes r ON r.src = t.city
    WHERE instr(t.path, ',' || r.dst || ',') = 0)        -- never revisit a city
SELECT path, cost, hops FROM trip WHERE city = 'MAA' ORDER BY cost;` } }
    ],
    deepDive: `<p><b>BFS vs DFS order.</b> The working-table algorithm naturally produces rows level by level (breadth-first). To get depth-first output, sort by a path key (<code>ORDER BY path</code>), use PostgreSQL 14+'s <code>SEARCH DEPTH FIRST BY id SET ord</code>, or in SQLite put <code>ORDER BY depth DESC</code> inside the recursive member (SQLite processes its queue as a priority queue).</p>
<p><b>Cycle handling options.</b> (1) Path string + <code>instr</code>/<code>LIKE</code> check — portable but O(path length) per step and fooled by ids that are substrings of others unless you wrap them in delimiters (<code>,12,</code> vs <code>,2,</code>). (2) PostgreSQL arrays: <code>WHERE NOT r.dst = ANY(t.path)</code>. (3) PostgreSQL 14+/SQL standard <code>CYCLE id SET is_cycle USING path</code>. (4) Oracle <code>CONNECT BY NOCYCLE</code>. (5) A hard depth cap as a last line of defence. <code>UNION</code> (distinct) only helps if rows are identical, which they never are once you carry depth or path.</p>
<p><b>Indexing.</b> Top-down recursion joins <code>employees.manager_id = cte.id</code> every round — index <code>manager_id</code> (foreign keys are not auto-indexed in PostgreSQL or SQLite!). Bottom-up joins on the primary key, which is already indexed. Without the index each round is a full scan: O(depth × N).</p>
<p><b>Alternative tree encodings</b> (system-design follow-up): <i>adjacency list</i> (parent_id; cheap writes, recursive reads), <i>materialized path</i> (store '/1/2/5/'; subtree = <code>LIKE '/1/2/%'</code> with an index; moving a subtree rewrites paths), <i>nested sets</i> (lft/rgt numbers; superb reads, painful writes), <i>closure table</i> (all ancestor–descendant pairs stored; fast reads both ways, O(depth) extra rows per node), PostgreSQL <code>ltree</code>, SQL Server <code>hierarchyid</code>. Recursive CTEs made the plain adjacency list the default choice in most OLTP schemas.</p>
<p><b>Enumerating paths is exponential.</b> The route example lists every simple path — fine for 5 cities, hopeless for a road network. SQL can do level-limited BFS reachability cheaply (with <code>UNION</code> on just the node column), but weighted shortest paths belong in a graph database or application code.</p>`,
    aiEra: `<p><b>What AI changes:</b> recursive CTEs used to be the query only the "SQL person" could write. Now an assistant produces one in seconds. What it cannot see is your data: whether the hierarchy has cycles, orphan rows (manager_id pointing to a deleted employee), multiple roots, or millions of nodes.</p>
<p><b>Use AI as a partner:</b> <code>Given employees(id, manager_id), write a query that detects cycles and orphan manager_ids before I run the org-chart CTE</code>. <code>Trace the first three rounds of this recursive CTE on these 6 rows</code>. <code>Convert this adjacency-list query to use a closure table and compare read/write costs</code>.</p>
<p><b>Where AI goes wrong:</b> swapping the join direction (walking up when you wanted down), relying on <code>UNION</code> for cycle safety while also carrying a depth column, path checks without delimiters (<code>'1,12'</code> contains <code>'2'</code>), missing the <code>manager_id IS NULL</code> root condition, and forgetting that PostgreSQL needs <code>::text</code> casts for the path.</p>
<p><b>What you must still own:</b> drawing the tree on paper, choosing the anchor and direction, proving termination on cyclic data, and indexing the parent column.</p>`,
    problems: [{
      title: 'Everyone Under a Manager, at Every Level',
      level: 'Medium', tags: ['recursive CTE', 'hierarchy', 'org chart'], companies: ['Google', 'Microsoft', 'LinkedIn', 'Atlassian'],
      statement: `<p>HR wants the full reporting tree under <b>Asha</b> (the CEO): every direct and indirect report with their <b>level</b> (1 = reports directly to Asha) and the <b>path</b> from Asha down to them. The company may add levels at any time, so the query must work for any depth.</p>`,
      constraints: `<p><code>employees(id, name, manager_id …)</code>, <code>manager_id</code> NULL for the CEO. Current depth is 3 levels below the CEO (15 people), but do not assume it.</p>`,
      example: `${H.table(['name', 'level', 'path'], [['Ravi', '1', 'Asha > Ravi'], ['Karan', '2', 'Asha > Ravi > Karan'], ['<span class="c-g">Neha</span>', '<span class="c-g">3</span>', 'Asha > Ravi > Karan > Neha'], ['Imran', '3', 'Asha > Meera > Sneha > Imran']])}<p>15 rows in total: 4 at level 1, 6 at level 2, 5 at level 3.</p>`,
      brute: { why: `<p>Chaining self-joins hard-codes the depth. Two joins reach levels 1 and 2 only, so the five level-3 people (Arjun, Neha, Vikram, Priya, Imran) silently vanish. Adding a third join fixes today's data and breaks again when a fourth level is hired.</p>`, code: { lang: 'sql', db: 'company', code: `-- Fixed depth: only levels 1 and 2 → 10 rows instead of 15
SELECT e1.name, 1 AS level, 'Asha > ' || e1.name AS path
FROM employees ceo JOIN employees e1 ON e1.manager_id = ceo.id
WHERE ceo.name = 'Asha'
UNION ALL
SELECT e2.name, 2, 'Asha > ' || e1.name || ' > ' || e2.name
FROM employees ceo
JOIN employees e1 ON e1.manager_id = ceo.id
JOIN employees e2 ON e2.manager_id = e1.id
WHERE ceo.name = 'Asha';` } },
      mcq: { q: 'In the recursive member, which join condition walks DOWN from managers to their reports?', options: ['<code>e.manager_id = t.id</code> (employee row points to a row already found)', '<code>e.id = t.manager_id</code>', '<code>e.id = t.id</code>', '<code>e.manager_id = t.manager_id</code>'], answer: 0, explain: 'Rows already in the CTE are managers; their reports are employees whose manager_id equals one of those ids. The other direction (e.id = t.manager_id) walks up to the boss.' },
      hints: [`<p>Hint 1: Anchor on Asha with level 0 and path 'Asha'. Every round should find people whose manager was found in the previous round.</p>`, `<p>Hint 2: Recursive member: <code>SELECT e.id, e.name, t.level + 1, t.path || ' &gt; ' || e.name FROM employees e JOIN team t ON e.manager_id = t.id</code>.</p>`, `<p>Hint 3: Exclude Asha herself in the final SELECT (<code>WHERE level &gt; 0</code>), order by path for a tree-like listing. It stops automatically when a round finds no reports.</p>`],
      solution: {
        approach: `<p>Top-down recursive CTE: anchor = Asha, recursive member = employees whose manager is in the previous round, carrying level and path. It adapts to any depth and terminates because a tree has no cycles.</p>`,
        code: { lang: 'sql', db: 'company', code: `WITH RECURSIVE team(id, name, level, path) AS (
    SELECT id, name, 0, name                    -- anchor: the manager we start from
    FROM employees
    WHERE name = 'Asha'
    UNION ALL
    SELECT e.id, e.name, t.level + 1,           -- reports of last round's people
           t.path || ' > ' || e.name
    FROM employees e
    JOIN team t ON e.manager_id = t.id
)
SELECT name, level, path
FROM team
WHERE level > 0                                 -- everyone UNDER Asha, not Asha
ORDER BY path;` },
        dry: { head: ['round', 'working table', 'new rows (level)'], rows: [['anchor', '—', 'Asha (0)'], ['1', 'Asha', 'Ravi, Meera, Lata, Zoya (1)'], ['2', 'Ravi, Meera, Lata, Zoya', 'Karan, Divya, Rohan, Sneha, Tom, Dev (2)'], ['3', '6 managers', 'Arjun, Neha, Vikram, Priya, Imran (3)'], ['4', '5 people', '<span class="c-r">none → stop</span>']] },
        complexity: `<p>Each employee is produced once; each round is a join of the working table with employees. With an index on <code>manager_id</code>: O(N log N) total. Without it: O(depth × N).</p>`,
        followUps: ['Return only the leaves (people with no reports).', 'Return the size of each level-1 manager\'s whole team.', 'Protect the query against a corrupted row where someone is their own manager.']
      }
    }]
  });

  /* =====================================================================
     TOPIC 7 — Readability & performance: choosing and rewriting
     ===================================================================== */
  topics.push({
    title: 'Readability & Performance: Subquery vs JOIN vs CTE vs Window',
    analogy: `<p>Four routes lead to the same restaurant: the highway, the scenic road, the shortcut through the market and the metro. All arrive, but at rush hour the difference is huge. SQL is similar: a correlated subquery, a JOIN to a grouped table, a CTE and a window function can return <b>exactly the same rows</b>, yet one may read 32 rows and another 10<sup>12</sup>.</p>
<p>The <b>optimizer</b> is your sat-nav: it often reroutes you automatically. Your job is to write a route it understands, and to check its plan (<code>EXPLAIN</code>) when the trip feels slow.</p>`,
    explain: `<p>One question, four correct answers — "employees paid above their department average":</p>
${H.table(['Style', 'Shape', 'Reads like', 'Typical cost'], [
  ['Correlated subquery', '<code>WHERE salary &gt; (SELECT AVG … WHERE e2.dept_id = e.dept_id)</code>', 'English: "above <i>their</i> average"', 'N × (inner cost) unless the engine decorrelates, memoizes or uses an index'],
  ['JOIN to derived table', '<code>JOIN (SELECT dept_id, AVG(salary) … GROUP BY dept_id) d</code>', 'two steps in one block', '~2N: aggregate once, hash join'],
  ['CTE', '<code>WITH d AS (…) SELECT … JOIN d</code>', 'named steps, top to bottom', 'same as the JOIN (usually inlined)'],
  ['Window function', '<code>AVG(salary) OVER (PARTITION BY dept_id)</code> in a CTE, filter outside', 'one pass, no join', 'one sort/hash pass: often fastest']
])}
<p><b>A simple decision guide:</b></p>
<ul>
<li><b>"Does a related row exist?"</b> → <code>EXISTS</code> / <code>NOT EXISTS</code> (semi/anti-join). Not JOIN + DISTINCT, never NOT IN on nullable columns.</li>
<li><b>One global number</b> (overall average, max) → uncorrelated scalar subquery: runs once, cheap and clear.</li>
<li><b>Compare each row with its group</b> → window function if available; otherwise a JOIN to a grouped CTE. A correlated subquery is fine when the group column is indexed and the table is small/medium.</li>
<li><b>Several columns from the same related rows</b> (count AND sum AND max of orders per customer) → one grouped CTE + LEFT JOIN, not three correlated subqueries in SELECT (each one re-reads the orders).</li>
<li><b>Multi-step logic</b> → CTEs for readability; check the plan if the engine materializes them.</li>
<li><b>Unknown depth</b> → recursive CTE, with an index on the parent column.</li>
</ul>
<p><b>Read the plan.</b> In SQLite prefix the query with <code>EXPLAIN QUERY PLAN</code>. Look for:</p>
${H.table(['Plan line', 'Meaning', 'Good / bad'], [['<code>SCALAR SUBQUERY</code>', 'uncorrelated, runs once', '<span class="c-g">fine</span>'], ['<code>CORRELATED SCALAR SUBQUERY</code> → <code>SEARCH … USING INDEX</code>', 'per-row, but each run is an index seek', '<span class="c-g">usually fine</span>'], ['<code>CORRELATED SCALAR SUBQUERY</code> → <code>SCAN</code>', 'per-row FULL scan → O(N×M)', '<span class="c-r">add an index or rewrite</span>'], ['<code>LIST SUBQUERY</code>', 'IN-list built once into a temp b-tree', '<span class="c-g">fine</span>'], ['<code>CO-ROUTINE</code> / <code>MATERIALIZE</code>', 'subquery/CTE computed into a stream or temp table', 'fine, but no index on it']])}`,
    clues: [
      '"The query is correct but takes minutes on production data" → read EXPLAIN, look for correlated SCAN',
      '"Rewrite this without a correlated subquery" → JOIN to a grouped derived table / CTE, or a window function',
      'SELECT list contains 2+ subqueries hitting the <b>same table</b> → aggregate once in a CTE and LEFT JOIN',
      '"Which is faster, IN or EXISTS?" → "modern optimizers plan both as semi-joins; check the plan; NOT IN differs because of NULLs"',
      '"Make this readable for the team" → CTEs with named steps; keep filters consistent across steps',
      'Engine-specific hints: PostgreSQL ≤ 11 CTE fence, SQL Server re-executes CTEs, MySQL 5.x poor subquery optimization'
    ],
    code: [
      { lang: 'sql', db: 'company', title: 'Same answer, four ways', code: `-- 1) Correlated subquery
SELECT e.name FROM employees e
WHERE e.salary > (SELECT AVG(e2.salary) FROM employees e2 WHERE e2.dept_id = e.dept_id);

-- 2) JOIN to a grouped derived table (decorrelated by hand)
SELECT e.name FROM employees e
JOIN (SELECT dept_id, AVG(salary) AS avg_sal FROM employees GROUP BY dept_id) d
  ON d.dept_id = e.dept_id
WHERE e.salary > d.avg_sal;

-- 3) CTE (same plan as 2 in most engines)
WITH d AS (SELECT dept_id, AVG(salary) AS avg_sal FROM employees GROUP BY dept_id)
SELECT e.name FROM employees e JOIN d ON d.dept_id = e.dept_id
WHERE e.salary > d.avg_sal;

-- 4) Window function (one pass, no join) — filter in an outer query
SELECT name FROM (
    SELECT name, salary, AVG(salary) OVER (PARTITION BY dept_id) AS avg_sal
    FROM employees WHERE dept_id IS NOT NULL) t
WHERE salary > avg_sal;` },
      { lang: 'sql', db: 'company', title: 'Reading the plan before and after an index', code: `-- Before: the correlated subquery SCANs e2 for every outer row → O(N^2)
EXPLAIN QUERY PLAN
SELECT e.name FROM employees e
WHERE e.salary > (SELECT AVG(e2.salary) FROM employees e2 WHERE e2.dept_id = e.dept_id);

-- Add a composite index on (correlation column, aggregated column)
CREATE INDEX idx_emp_dept_salary ON employees(dept_id, salary);

-- After: SEARCH e2 USING COVERING INDEX idx_emp_dept_salary (dept_id=?)
EXPLAIN QUERY PLAN
SELECT e.name FROM employees e
WHERE e.salary > (SELECT AVG(e2.salary) FROM employees e2 WHERE e2.dept_id = e.dept_id);` },
      { lang: 'sql', db: 'shop', title: 'Index the column NOT EXISTS probes', code: `-- orders.customer_id is a foreign key, but SQLite/PostgreSQL do NOT index FKs automatically
EXPLAIN QUERY PLAN
SELECT c.name FROM customers c
WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.id);   -- SCAN o per customer

CREATE INDEX idx_orders_customer ON orders(customer_id);

EXPLAIN QUERY PLAN
SELECT c.name FROM customers c
WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.id);   -- SEARCH o USING COVERING INDEX` }
    ],
    codeTitle: ['Four equivalent rewrites', 'EXPLAIN QUERY PLAN + index', 'Indexing anti-join probes'],
    viz: {
      title: 'How much work? Correlated vs indexed vs decorrelated vs window',
      input: '100000 50',
      inputLabel: 'N employees and D departments (e.g. "100000 50")',
      gen: function (input) {
        var m = String(input || '').trim().split(/[\s,]+/).map(Number);
        if (m.length !== 2 || !m.every(function (x) { return isFinite(x) && x >= 1; })) throw new Error('Enter two positive numbers: N D, e.g. "100000 50"');
        var N = Math.min(Math.round(m[0]), 1e9), D = Math.max(1, Math.min(Math.round(m[1]), N));
        var lg = Math.max(1, Math.ceil(Math.log(N) / Math.LN2)), grp = Math.ceil(N / D);
        var S = [
          ['Correlated, no index', N + N * N, 'outer scan N, and for EACH row a full scan of N'],
          ['Correlated + index (dept_id, salary)', N + N * (lg + grp), 'each inner run = index seek (log N) + read its group (N/D)'],
          ['Correlated + memoize per dept', N + D * N, 'inner query runs once per DISTINCT dept (D full scans)'],
          ['Decorrelated: GROUP BY once + hash join', 2 * N, 'one pass to aggregate, one pass to join'],
          ['Window: AVG() OVER (PARTITION BY dept)', N, 'one pass (plus a sort/hash by dept)']
        ];
        function fmt(x) { if (x >= 1e12) return (x / 1e12).toFixed(1) + ' trillion'; if (x >= 1e9) return (x / 1e9).toFixed(1) + ' billion'; if (x >= 1e6) return (x / 1e6).toFixed(1) + ' million'; if (x >= 1e3) return (x / 1e3).toFixed(1) + 'k'; return String(x); }
        function plan(k) {
          var P = [
            { nodes: [['o', 'SCAN e (outer)', 20, 12], ['f', 'FILTER salary > ?', 52, 12], ['s', 'SUBQUERY: SCAN e2', 52, 32], ['r', 'result', 85, 12]], edges: [['o', 'f'], ['s', 'f', 'per row'], ['f', 'r']] },
            { nodes: [['o', 'SCAN e (outer)', 20, 12], ['f', 'FILTER salary > ?', 52, 12], ['s', 'SEARCH e2 USING INDEX', 52, 32], ['r', 'result', 85, 12]], edges: [['o', 'f'], ['s', 'f', 'per row'], ['f', 'r']] },
            { nodes: [['o', 'SCAN e (outer)', 20, 12], ['f', 'FILTER salary > ?', 52, 12], ['c', 'MEMOIZE by dept', 52, 32], ['s', 'SCAN e2', 20, 32], ['r', 'result', 85, 12]], edges: [['o', 'f'], ['s', 'c', 'miss'], ['c', 'f'], ['f', 'r']] },
            { nodes: [['a', 'SCAN employees', 14, 32], ['g', 'HASH GROUP BY dept', 40, 32], ['o', 'SCAN e', 40, 12], ['j', 'HASH JOIN + FILTER', 68, 22], ['r', 'result', 90, 22]], edges: [['a', 'g'], ['g', 'j', 'build'], ['o', 'j', 'probe'], ['j', 'r']] },
            { nodes: [['a', 'SCAN employees', 14, 22], ['w', 'SORT/HASH by dept + AVG OVER', 46, 22], ['f', 'FILTER', 74, 22], ['r', 'result', 92, 22]], edges: [['a', 'w'], ['w', 'f'], ['f', 'r']] }
          ][k];
          return { type: 'graph', label: 'Plan shape', directed: true, height: 42, nodes: P.nodes.map(function (n) { return { id: n[0], label: n[1], x: n[2], y: n[3], shape: 'box' }; }), edges: P.edges, hl: (function () { var h = {}; P.nodes.forEach(function (n) { h[n[0]] = n[0] === 's' && k === 0 ? 'bad' : n[0] === 'r' ? 'sel' : ''; }); return h; })() };
        }
        var frames = [];
        frames.push({ narr: 'Workload: <b>' + fmt(N) + '</b> employees in <b>' + D + '</b> departments (about ' + fmt(grp) + ' per department). Query: employees paid above their department average. We will count <b>rows read</b> for each strategy (log scale bars).', parts: [
          { type: 'code', label: 'Query (correlated form)', lang: 'sql', code: 'SELECT e.name FROM employees e\nWHERE e.salary > (SELECT AVG(e2.salary)\n                  FROM employees e2\n                  WHERE e2.dept_id = e.dept_id);', hl: { 4: 'cur' } },
          { type: 'vars', label: 'Inputs', vals: { N: N, D: D, 'rows per dept': grp, 'log2 N': lg } }
        ] });
        var vals = [], texts = [];
        S.forEach(function (st, k) {
          vals.push(Math.round(Math.log(st[1]) / Math.LN10 * 10) / 10); texts.push(fmt(st[1]));
          var hb = {}; hb[k] = k === 0 ? 'bad' : k >= 3 ? 'ok' : 'cur';
          frames.push({ narr: '<b>' + st[0] + '</b>: ' + st[2] + ' → about <b>' + fmt(st[1]) + '</b> row reads.' + (k === 0 ? ' <span class="c-r">This is the plan SQLite uses when there is no index on dept_id.</span>' : k === 1 ? ' SQLite shows this as <code>CORRELATED SCALAR SUBQUERY</code> → <code>SEARCH e2 USING COVERING INDEX</code>.' : k === 2 ? ' PostgreSQL 14+ can do this with a Memoize node; SQL Server with a lazy spool.' : k === 3 ? ' This is what SQL Server / Oracle / DuckDB often do <b>automatically</b> (decorrelation); in SQLite you write the JOIN or CTE yourself.' : ' Usually the fastest and the easiest to extend (rank, running totals) — Module SQL 6.'), parts: [
            plan(k),
            { type: 'bars', label: 'log10(rows read) — shorter is better', values: vals.slice(), texts: texts.slice(), idxLabels: S.slice(0, k + 1).map(function (s, i) { return 'S' + (i + 1); }), hl: hb }
          ] });
        });
        var rows = S.map(function (st, i) { return ['S' + (i + 1), st[0], fmt(st[1])]; });
        frames.push({ narr: 'Summary. For tiny tables every strategy is instant, so <b>pick the clearest</b>. At scale the naive correlated plan is ' + fmt(Math.round(S[0][1] / S[3][1])) + '× more work than the decorrelated one. Always confirm with <code>EXPLAIN</code> — optimizers may already have rewritten your query.', parts: [
          { type: 'table', label: 'Strategies compared', columns: ['#', 'strategy', 'rows read'], rows: rows, hl: { 0: 'bad', 3: 'ok', 4: 'sel' } }
        ] });
        return frames;
      }
    },
    examples: [
      { title: 'Three correlated subqueries vs one grouped CTE', html: `<p>Each scalar subquery in the SELECT list re-reads the orders for every customer — 3 lookups × C customers. The CTE aggregates orders <b>once</b> and a LEFT JOIN attaches the numbers (Eli and Fatima get 0 via COALESCE). Same output, one pass.</p>`, code: { lang: 'sql', db: 'shop', code: `WITH stats AS (
        SELECT o.customer_id,
               COUNT(DISTINCT o.id)          AS orders,
               SUM(oi.qty * oi.unit_price)   AS spend,
               MAX(o.order_date)             AS last_order
        FROM orders o JOIN order_items oi ON oi.order_id = o.id
        WHERE o.status <> 'cancelled'
        GROUP BY o.customer_id)
SELECT c.name,
       COALESCE(s.orders, 0) AS orders,
       COALESCE(s.spend, 0)  AS spend,
       s.last_order
FROM customers c
LEFT JOIN stats s ON s.customer_id = c.id
ORDER BY spend DESC;` } },
      { title: 'Uncorrelated subquery shows up as SCALAR SUBQUERY (runs once)', html: `<p>Compare the plans: the company-wide average is a <code>SCALAR SUBQUERY</code> (executed once), while the per-department version is a <code>CORRELATED SCALAR SUBQUERY</code>. That one word tells you whether the inner query is evaluated once or per row.</p>`, code: { lang: 'sql', db: 'company', code: `EXPLAIN QUERY PLAN
SELECT name FROM employees WHERE salary > (SELECT AVG(salary) FROM employees);

EXPLAIN QUERY PLAN
SELECT e.name FROM employees e
WHERE e.salary > (SELECT AVG(e2.salary) FROM employees e2 WHERE e2.dept_id = e.dept_id);` } },
      { title: 'IN builds a list once (LIST SUBQUERY)', html: `<p>For <code>dept_id IN (SELECT id FROM departments WHERE location = 'Mumbai')</code> SQLite builds the list of ids once into a temporary b-tree and probes it — no per-row re-execution, even without an index. IN with an uncorrelated subquery is not the slow pattern people fear.</p>`, code: { lang: 'sql', db: 'company', code: `EXPLAIN QUERY PLAN
SELECT name FROM employees
WHERE dept_id IN (SELECT id FROM departments WHERE location = 'Mumbai');` } },
      { title: 'Readability refactor: nested → CTE', html: `<p>The nested version below answers "departments whose payroll is above the average department payroll" inside-out. The CTE version names <code>payroll</code> once and uses it twice. Same plan, but a reviewer can check each step on its own.</p>`, code: { lang: 'sql', db: 'company', code: `-- Nested (hard to read, payroll logic duplicated)
SELECT dept_id, total FROM (
    SELECT dept_id, SUM(salary) AS total FROM employees WHERE dept_id IS NOT NULL GROUP BY dept_id) t
WHERE total > (SELECT AVG(total) FROM (
    SELECT SUM(salary) AS total FROM employees WHERE dept_id IS NOT NULL GROUP BY dept_id) x);

-- CTE (one definition, used twice)
WITH payroll AS (
    SELECT dept_id, SUM(salary) AS total FROM employees WHERE dept_id IS NOT NULL GROUP BY dept_id)
SELECT dept_id, total FROM payroll
WHERE total > (SELECT AVG(total) FROM payroll);` } }
    ],
    deepDive: `<p><b>Decorrelation in theory.</b> Any correlated subquery can be rewritten as a join with an <i>Apply</i>/<i>lateral</i> operator, and many can then be "unnested" into ordinary joins + group-bys (the classic papers: Kim 1982, Galindo-Legaria &amp; Joshi 2001, and Neumann &amp; Kemper 2015 "Unnesting Arbitrary Queries", which DuckDB and Umbra implement fully). Who does what today: SQL Server and Oracle unnest aggressively; PostgreSQL pulls up <code>IN</code>/<code>EXISTS</code> into semi/anti-joins and memoizes, but leaves correlated scalar subqueries as SubPlans; MySQL 8.0.24+ can transform scalar correlated subqueries into derived tables; SQLite mostly executes as written (nested loops) — so in SQLite the shape you write and the indexes you add matter most.</p>
<p><b>The COUNT bug.</b> Rewriting <code>WHERE x = (SELECT COUNT(*) … correlated)</code> as a JOIN to a grouped table loses groups with zero rows (COUNT should be 0, the inner join produces nothing). Correct unnesting needs a LEFT JOIN + COALESCE. Interviewers love this subtlety; so do bug trackers.</p>
<p><b>LATERAL.</b> PostgreSQL/MySQL 8 <code>JOIN LATERAL (SELECT … WHERE inner.k = outer.k ORDER BY … LIMIT 3)</code> (SQL Server: <code>CROSS APPLY</code>) is a correlated <i>table</i> subquery — perfect for "top 3 orders per customer" with an index on <code>(customer_id, amount DESC)</code>: C index seeks instead of sorting the whole table. SQLite has no LATERAL; use window functions.</p>
<p><b>CTEs and statistics.</b> Materialized CTEs and derived tables have no statistics, so the planner guesses their cardinality (PostgreSQL often guesses 200 rows for unknowns). A wrong guess leads to nested-loop joins over millions of rows. Remedies: let the CTE inline, break the pipeline into an indexed temp table + <code>ANALYZE</code>, or simplify predicates.</p>
<p><b>Index recipes.</b> Correlated aggregate by group → index <code>(group_col, agg_col)</code> so the inner query is covering. EXISTS/NOT EXISTS probe → index the probed foreign key. Top-down hierarchy → index <code>parent_id</code>. Use <code>EXPLAIN QUERY PLAN</code> (SQLite), <code>EXPLAIN (ANALYZE, BUFFERS)</code> (PostgreSQL), actual execution plans (SQL Server) to verify, and measure on realistic data volumes — 16 rows tell you nothing about 16 million.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI tools are good at mechanical rewrites (correlated → join → window) and at explaining plans line by line. That makes performance work faster — provided you verify equivalence and measure.</p>
<p><b>Use AI as a partner:</b> <code>Here is my query and its EXPLAIN (ANALYZE) output on PostgreSQL 16. Which node dominates, and give me two rewrites with the indexes each needs</code>. <code>Prove these two queries return the same rows, including NULL and zero-row groups; if not, give a counterexample dataset</code>. Then actually run both on the counterexample.</p>
<p><b>Where AI goes wrong:</b> "EXISTS is always faster than IN" folklore; unnesting COUNT subqueries with inner joins (the COUNT bug); recommending indexes that already exist or that the planner cannot use (function on the column, leading-column mismatch); claiming CTEs are always materialized (outdated since PostgreSQL 12); and judging speed on toy data.</p>
<p><b>What you must still own:</b> equivalence (same rows for every edge case), reading real plans, choosing indexes against the whole workload (every index slows writes), and the final call on readability vs speed for your team.</p>`,
    problems: [{
      title: 'Speed Up a Customer Report Built From Correlated Subqueries',
      level: 'Medium', tags: ['performance', 'decorrelation', 'CTE', 'LEFT JOIN'], companies: ['Amazon', 'Stripe', 'Razorpay'],
      statement: `<p>A dashboard query lists every customer with their number of non-cancelled orders and total spend. It uses two correlated subqueries per customer and is timing out on a table with millions of orders. Rewrite it so orders and items are read <b>once</b>, keeping customers with no orders (show 0) and the same ordering (spend DESC, then name).</p>`,
      constraints: `<p>Exclude cancelled orders. Customers without orders must appear with 0 orders and 0 spend. Output columns: <code>name, orders, spend</code>.</p>`,
      example: `${H.table(['name', 'orders', 'spend'], [['Asha', '3', '2625'], ['Dana', '1', '1190'], ['Ben', '2', '1060'], ['Chen', '1', '390'], ['<span class="c-y">Eli</span>', '<span class="c-y">0</span>', '<span class="c-y">0</span>'], ['<span class="c-y">Fatima</span>', '0', '0']])}<p>Chen has two orders but one is cancelled, so orders = 1.</p>`,
      brute: { why: `<p>Correct output, but every customer triggers two separate scans of <code>orders</code> (and a join to <code>order_items</code>). With C customers and O orders and no index that is O(C × O) — 10<sup>5</sup> customers × 10<sup>7</sup> orders = 10<sup>12</sup> row visits. Even with indexes it is 2C separate index probes plus joins.</p>`, code: { lang: 'sql', db: 'shop', code: `SELECT c.name,
       (SELECT COUNT(*) FROM orders o
        WHERE o.customer_id = c.id AND o.status <> 'cancelled') AS orders,
       (SELECT COALESCE(SUM(oi.qty * oi.unit_price), 0)
        FROM orders o JOIN order_items oi ON oi.order_id = o.id
        WHERE o.customer_id = c.id AND o.status <> 'cancelled') AS spend
FROM customers c
ORDER BY spend DESC, c.name;` } },
      mcq: { q: 'You replace the correlated subqueries with an INNER JOIN to a grouped CTE. What breaks?', options: ['Customers with no orders disappear (the "COUNT bug")', 'Spend doubles', 'Nothing — it is identical', 'ORDER BY stops working'], answer: 0, explain: 'COUNT over zero rows is 0, but an inner join to a grouped table has no row for those customers, so they vanish. Use LEFT JOIN and COALESCE to 0.' },
      hints: [`<p>Hint 1: Both subqueries read the same rows (non-cancelled orders of a customer). Aggregate them once, grouped by customer.</p>`, `<p>Hint 2: Count orders with <code>COUNT(DISTINCT o.id)</code> — after joining to order_items each order appears once per line item.</p>`, `<p>Hint 3: <code>customers LEFT JOIN stats</code> and <code>COALESCE(…, 0)</code> to keep customers with no orders. Recipe: CTE stats(customer_id, orders, spend) → LEFT JOIN → COALESCE → ORDER BY spend DESC, name.</p>`],
      solution: {
        approach: `<p>Decorrelate by hand: one grouped CTE reads orders + items once, then a LEFT JOIN attaches the numbers to every customer. <code>COUNT(DISTINCT o.id)</code> avoids counting line items as orders, and COALESCE restores the zero rows that the correlated COUNT used to produce.</p>`,
        code: { lang: 'sql', db: 'shop', code: `WITH stats AS (
        SELECT o.customer_id,
               COUNT(DISTINCT o.id)        AS orders,   -- DISTINCT: one order has many items
               SUM(oi.qty * oi.unit_price) AS spend
        FROM orders o
        JOIN order_items oi ON oi.order_id = o.id
        WHERE o.status <> 'cancelled'
        GROUP BY o.customer_id
     )
SELECT c.name,
       COALESCE(s.orders, 0) AS orders,
       COALESCE(s.spend, 0)  AS spend
FROM customers c
LEFT JOIN stats s ON s.customer_id = c.id     -- LEFT: keep customers with no orders
ORDER BY spend DESC, c.name;` },
        dry: { head: ['step', 'work', 'output'], rows: [['stats CTE', 'one pass over 14 non-cancelled line items', '4 customer rows'], ['LEFT JOIN', 'hash join 6 customers × 4 stats', '6 rows (Eli, Fatima → NULL)'], ['COALESCE', 'NULL → 0', 'Eli 0/0, Fatima 0/0'], ['ORDER BY', 'spend DESC, name', 'Asha, Dana, Ben, Chen, Eli, Fatima']] },
        complexity: `<p>O(O + I) to aggregate orders and items once plus O(C) for the hash join: linear, versus O(C × O) for the unindexed correlated version.</p>`,
        followUps: ['Add the last order date without another subquery.', 'Which index would make the original correlated version acceptable?', 'Write the same report with window functions.']
      }
    }]
  });

  registerModule({
    id: 'sql05',
    title: 'Subqueries, CTEs & Recursive CTEs',
    lang: 'sql',
    intro: `<p>Some questions cannot be answered in one breath: <i>"Who earns more than <b>their department's</b> average?"</i>, <i>"Which customers <b>never</b> ordered?"</i>, <i>"List <b>everyone</b> who reports to Ravi, at any depth."</i> To answer them, SQL lets you ask a small question first and feed its answer into a bigger one. That is what <b>subqueries</b> and <b>CTEs</b> are for, and <b>recursive CTEs</b> go one step further: they let a query feed on its own output, so you can walk an org chart, a category tree or a flight network level by level, or generate a series of numbers and dates out of thin air.</p>
<p>In this module you will learn every subquery shape (scalar, row, table), correlated subqueries that re-run for each outer row, the famous <code>IN</code> vs <code>EXISTS</code> vs <code>NOT IN</code> NULL trap, clean multi-step queries with <code>WITH</code>, and recursive CTEs for hierarchies and series. Everything runs live: press ▶ Run on any query to execute it against the sample <b>company</b> (employees with <code>manager_id</code>), <b>shop</b> and <b>network</b> databases in your browser. We finish with readability and performance: how the optimizer rewrites your subqueries, and when to pick a JOIN, a CTE or a window function instead.</p>`,
    goals: [
      'Name the shape of any subquery (scalar, row, column, table) and place it correctly in SELECT, FROM, WHERE or HAVING',
      'Write and trace correlated subqueries (per-row comparisons, top earner per group, "more than my manager")',
      'Choose between IN, EXISTS, NOT IN and NOT EXISTS, and explain the NOT IN + NULL trap in an interview',
      'Refactor nested queries into readable multi-step CTEs and know when a CTE is inlined or materialized',
      'Write recursive CTEs for number/date series, org charts (top-down and bottom-up), category paths, bill-of-materials and graph routes with cycle protection',
      'Reason about performance: decorrelation, semi/anti-joins, indexes for correlated lookups, and reading EXPLAIN QUERY PLAN'
    ],
    prereqs: `<b>SQL 2</b> (SELECT, WHERE, NULLs), <b>SQL 3</b> (GROUP BY, HAVING) and <b>SQL 4</b> (JOINs, self joins, anti/semi joins). Comfort with three-valued logic (TRUE / FALSE / UNKNOWN) helps a lot.`,
    hours: 11,
    databases: DATABASES,
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
