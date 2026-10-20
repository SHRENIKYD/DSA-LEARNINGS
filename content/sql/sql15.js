(function () {
  var topics = [], practice = [], quiz = [], interview = [];

  /* ---------- sample databases (SQLite dialect) ----------
     hr   : employees (salaries with ties + manager_id tree), salary_changes
     app  : users (signup cohorts), logins (timestamps, streaks), events (sessions + funnel)
     shop : customers, orders, customers_raw (duplicates), quarterly_sales / sales_wide (pivot),
            tickets (id gaps), server_checks (status islands), stadium, signal_log, meetings,
            categories / products (tree)                                                    */
  var DB = {
    hr: `CREATE TABLE employees (
  id         INTEGER PRIMARY KEY,
  name       TEXT    NOT NULL,
  dept       TEXT    NOT NULL,
  salary     INTEGER NOT NULL,
  manager_id INTEGER REFERENCES employees(id),   -- NULL = top of the tree (CEO)
  hire_date  TEXT    NOT NULL                    -- ISO 'YYYY-MM-DD'
);
INSERT INTO employees VALUES
 (1,'Asha','Exec',300000,NULL,'2015-01-05'),
 (2,'Ben','Engineering',220000,1,'2016-03-01'),
 (3,'Cara','Finance',210000,1,'2016-06-15'),
 (4,'Dev','Engineering',150000,2,'2018-02-01'),
 (5,'Eli','Engineering',150000,2,'2019-07-10'),
 (6,'Fay','Engineering',120000,4,'2020-01-20'),
 (7,'Gus','Engineering',110000,4,'2021-05-03'),
 (8,'Hana','Engineering',110000,5,'2022-09-12'),
 (9,'Ivan','Engineering',95000,5,'2023-03-01'),
 (10,'Jia','Finance',130000,3,'2017-11-11'),
 (11,'Kofi','Finance',98000,10,'2020-08-08'),
 (12,'Lena','Finance',98000,10,'2022-01-17'),
 (13,'Mo','Sales',140000,1,'2017-04-04'),
 (14,'Nia','Sales',90000,13,'2019-10-10'),
 (15,'Omar','Sales',85000,13,'2021-12-01'),
 (16,'Pia','Sales',85000,14,'2023-06-06'),
 (17,'Raj','Sales',70000,14,'2024-02-19');
CREATE TABLE salary_changes (
  emp_id         INTEGER NOT NULL REFERENCES employees(id),
  effective_date TEXT    NOT NULL,
  salary         INTEGER NOT NULL
);
INSERT INTO salary_changes VALUES
 (4,'2018-02-01',110000),(4,'2020-04-01',130000),(4,'2022-04-01',150000),
 (6,'2020-01-20',90000),(6,'2021-04-01',90000),(6,'2023-04-01',120000),
 (11,'2020-08-08',80000),(11,'2022-04-01',98000),
 (14,'2019-10-10',70000),(14,'2021-04-01',80000),(14,'2023-04-01',90000);`,
    app: `CREATE TABLE users (
  user_id     INTEGER PRIMARY KEY,
  name        TEXT NOT NULL,
  signup_date TEXT NOT NULL,     -- 'YYYY-MM-DD'
  country     TEXT NOT NULL,
  channel     TEXT NOT NULL      -- how they found us
);
INSERT INTO users VALUES
 (1,'amy','2024-01-01','IN','ads'),(2,'bob','2024-01-03','US','organic'),
 (3,'cat','2024-01-02','IN','referral'),(4,'dan','2024-01-10','UK','ads'),
 (5,'eva','2024-01-28','US','organic'),(6,'fin','2024-02-02','IN','ads'),
 (7,'gia','2024-02-10','US','referral'),(8,'hal','2024-02-15','UK','ads'),
 (9,'ivy','2024-02-20','IN','organic'),(10,'jon','2024-03-01','US','ads'),
 (11,'kai','2024-03-08','IN','referral'),(12,'lia','2024-03-20','UK','organic');
CREATE TABLE logins (
  user_id  INTEGER NOT NULL REFERENCES users(user_id),
  login_ts TEXT    NOT NULL      -- 'YYYY-MM-DD HH:MM:SS'; a user can log in many times a day
);
INSERT INTO logins VALUES
 (1,'2024-01-01 08:10:00'),(1,'2024-01-02 09:00:00'),(1,'2024-01-02 21:30:00'),(1,'2024-01-03 07:45:00'),
 (1,'2024-01-05 10:00:00'),(1,'2024-01-06 10:05:00'),(1,'2024-01-08 08:00:00'),(1,'2024-01-09 08:30:00'),
 (1,'2024-01-10 09:10:00'),(1,'2024-01-11 22:00:00'),(1,'2024-02-03 09:00:00'),(1,'2024-02-04 09:00:00'),
 (1,'2024-03-10 18:00:00'),(1,'2024-04-02 12:00:00'),
 (2,'2024-01-03 12:00:00'),(2,'2024-01-05 12:00:00'),(2,'2024-01-07 12:00:00'),(2,'2024-02-14 19:00:00'),
 (3,'2024-01-02 06:00:00'),(3,'2024-01-03 06:00:00'),(3,'2024-01-04 06:00:00'),(3,'2024-01-05 06:00:00'),
 (3,'2024-01-06 06:00:00'),(3,'2024-01-07 06:00:00'),(3,'2024-01-08 06:00:00'),(3,'2024-02-01 06:00:00'),
 (3,'2024-02-02 06:00:00'),(3,'2024-03-05 06:00:00'),
 (4,'2024-01-10 15:00:00'),(4,'2024-01-11 15:00:00'),(4,'2024-01-12 15:00:00'),(4,'2024-01-20 15:00:00'),
 (4,'2024-01-21 15:00:00'),
 (5,'2024-01-28 20:00:00'),(5,'2024-01-30 20:00:00'),(5,'2024-01-31 23:59:00'),(5,'2024-02-01 00:01:00'),
 (5,'2024-02-02 20:00:00'),(5,'2024-04-20 20:00:00'),
 (6,'2024-02-02 11:00:00'),(6,'2024-02-03 11:00:00'),(6,'2024-02-04 11:00:00'),(6,'2024-03-01 11:00:00'),
 (7,'2024-02-10 09:00:00'),(7,'2024-03-15 09:00:00'),(7,'2024-03-16 09:00:00'),
 (8,'2024-02-15 17:00:00'),
 (9,'2024-02-20 08:00:00'),(9,'2024-02-21 08:00:00'),(9,'2024-04-01 08:00:00'),
 (10,'2024-03-01 13:00:00'),(10,'2024-03-02 13:00:00'),(10,'2024-04-05 13:00:00'),
 (11,'2024-03-08 10:00:00'),
 (12,'2024-03-20 21:00:00'),(12,'2024-03-21 21:00:00'),(12,'2024-03-22 21:00:00'),(12,'2024-03-23 21:00:00'),
 (12,'2024-04-10 21:00:00');
CREATE TABLE events (
  event_id   INTEGER PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(user_id),
  event_time TEXT    NOT NULL,   -- 'YYYY-MM-DD HH:MM:SS'
  event_name TEXT    NOT NULL    -- search | view_product | add_to_cart | checkout | purchase
);
INSERT INTO events VALUES
 (1,1,'2024-03-01 09:00:00','search'),(2,1,'2024-03-01 09:05:00','view_product'),
 (3,1,'2024-03-01 09:20:00','add_to_cart'),(4,1,'2024-03-01 10:10:00','view_product'),
 (5,1,'2024-03-01 10:15:00','checkout'),(6,1,'2024-03-01 11:00:00','purchase'),
 (7,2,'2024-03-01 09:00:00','view_product'),(8,2,'2024-03-01 09:29:00','view_product'),
 (9,2,'2024-03-01 09:58:00','add_to_cart'),(10,2,'2024-03-01 10:40:00','search'),
 (11,3,'2024-03-01 14:00:00','view_product'),(12,3,'2024-03-01 14:10:00','add_to_cart'),
 (13,3,'2024-03-01 14:12:00','checkout'),(14,3,'2024-03-01 14:15:00','purchase'),
 (15,4,'2024-03-01 08:00:00','add_to_cart'),(16,4,'2024-03-01 08:30:00','view_product'),
 (17,4,'2024-03-01 09:45:00','checkout'),
 (18,5,'2024-03-01 20:00:00','view_product'),(19,5,'2024-03-01 20:01:00','search'),
 (20,6,'2024-03-01 12:00:00','view_product'),(21,6,'2024-03-01 12:05:00','add_to_cart'),
 (22,6,'2024-03-01 12:20:00','checkout'),
 (23,7,'2024-03-01 23:50:00','view_product'),(24,7,'2024-03-02 00:10:00','add_to_cart'),
 (25,7,'2024-03-02 00:15:00','purchase'),
 (26,8,'2024-03-01 10:00:00','search');`,
    shop: `CREATE TABLE customers (customer_id INTEGER PRIMARY KEY, name TEXT NOT NULL, city TEXT NOT NULL);
INSERT INTO customers VALUES (1,'Asha','Pune'),(2,'Ben','Delhi'),(3,'Cara','Pune'),(4,'Dan','Mumbai'),(5,'Eve','Delhi'),(6,'Finn','Mumbai');
CREATE TABLE orders (
  order_id    INTEGER PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(customer_id),
  order_date  TEXT    NOT NULL,
  amount      INTEGER NOT NULL,
  status      TEXT    NOT NULL   -- delivered | cancelled | returned
);
INSERT INTO orders VALUES
 (1,1,'2024-01-03',120,'delivered'),(2,2,'2024-01-04',80,'delivered'),(3,1,'2024-01-10',300,'delivered'),
 (4,3,'2024-01-15',45,'cancelled'),(5,2,'2024-02-01',80,'delivered'),(6,4,'2024-02-03',500,'delivered'),
 (7,1,'2024-02-14',300,'returned'),(8,3,'2024-02-20',150,'delivered'),(9,5,'2024-03-01',60,'delivered'),
 (10,2,'2024-03-05',220,'delivered'),(11,4,'2024-03-09',75,'delivered'),(12,1,'2024-03-15',90,'delivered'),
 (13,3,'2024-03-18',150,'delivered'),(14,5,'2024-03-22',60,'delivered'),(15,2,'2024-04-02',35,'delivered'),
 (16,4,'2024-04-10',500,'delivered');
CREATE TABLE customers_raw (          -- messy sign-up table with duplicates
  id         INTEGER PRIMARY KEY,
  email      TEXT NOT NULL,
  full_name  TEXT NOT NULL,
  created_at TEXT NOT NULL
);
INSERT INTO customers_raw VALUES
 (1,'asha@mail.com','Asha Rao','2023-01-05'),(2,'BEN@mail.com','Ben Ode','2023-02-10'),
 (3,'Asha@Mail.com ','Asha R.','2023-06-01'),(4,'ben@mail.com','Benjamin Ode','2024-01-15'),
 (5,'cara@mail.com','Cara Lim','2023-03-03'),(6,'asha@mail.com','Asha Rao','2024-02-20'),
 (7,'dan@mail.com','Dan Wu','2023-04-04'),(8,'cara@mail.com','Cara Lim','2023-03-03');
CREATE TABLE quarterly_sales (region TEXT NOT NULL, quarter TEXT NOT NULL, revenue INTEGER NOT NULL);
INSERT INTO quarterly_sales VALUES
 ('North','Q1',100),('North','Q2',120),('North','Q3',90),('North','Q4',150),
 ('South','Q1',80),('South','Q2',95),('South','Q4',110),
 ('West','Q1',60),('West','Q1',15),('West','Q2',70),('West','Q3',65),('West','Q4',85);
CREATE TABLE sales_wide (region TEXT PRIMARY KEY, q1 INTEGER, q2 INTEGER, q3 INTEGER, q4 INTEGER);
INSERT INTO sales_wide VALUES ('North',100,120,90,150),('South',80,95,NULL,110),('East',40,NULL,NULL,55);
CREATE TABLE tickets (ticket_id INTEGER PRIMARY KEY);
INSERT INTO tickets VALUES (1),(2),(3),(6),(7),(10),(11),(12),(15),(16),(20);
CREATE TABLE server_checks (check_time TEXT PRIMARY KEY, status TEXT NOT NULL);   -- one health check every 5 minutes
INSERT INTO server_checks VALUES
 ('2024-05-01 10:00','up'),('2024-05-01 10:05','up'),('2024-05-01 10:10','down'),('2024-05-01 10:15','down'),
 ('2024-05-01 10:20','down'),('2024-05-01 10:25','up'),('2024-05-01 10:30','up'),('2024-05-01 10:35','down'),
 ('2024-05-01 10:40','up'),('2024-05-01 10:45','up'),('2024-05-01 10:50','up');
CREATE TABLE stadium (id INTEGER PRIMARY KEY, visit_date TEXT NOT NULL, people INTEGER NOT NULL);
INSERT INTO stadium VALUES
 (1,'2017-01-01',10),(2,'2017-01-02',109),(3,'2017-01-03',150),(4,'2017-01-04',99),
 (5,'2017-01-05',145),(6,'2017-01-06',1455),(7,'2017-01-07',199),(8,'2017-01-09',188);
CREATE TABLE signal_log (id INTEGER PRIMARY KEY, num INTEGER NOT NULL);
INSERT INTO signal_log VALUES (1,1),(2,1),(3,1),(4,2),(5,1),(6,2),(7,2),(8,2),(9,2),(10,3);
CREATE TABLE meetings (room TEXT NOT NULL, start_time TEXT NOT NULL, end_time TEXT NOT NULL);
INSERT INTO meetings VALUES
 ('A','09:00','10:00'),('A','09:30','10:30'),('A','10:30','11:00'),('A','13:00','14:00'),('A','13:15','13:45'),
 ('B','09:00','09:30'),('B','10:00','11:00'),('B','10:45','12:00');
CREATE TABLE categories (id INTEGER PRIMARY KEY, name TEXT NOT NULL, parent_id INTEGER REFERENCES categories(id));
INSERT INTO categories VALUES
 (1,'All',NULL),(2,'Electronics',1),(3,'Phones',2),(4,'Laptops',2),(5,'Android',3),(6,'iPhone',3),
 (7,'Home',1),(8,'Kitchen',7),(9,'Furniture',7),(10,'Chairs',9);
CREATE TABLE products (product_id INTEGER PRIMARY KEY, name TEXT NOT NULL, category_id INTEGER NOT NULL REFERENCES categories(id), price INTEGER NOT NULL);
INSERT INTO products VALUES
 (1,'Pixel 9',5,700),(2,'Galaxy S24',5,800),(3,'iPhone 16',6,900),(4,'ThinkPad X1',4,1500),
 (5,'Air Fryer',8,120),(6,'Kettle',8,40),(7,'Desk Chair',10,250),(8,'Bookshelf',9,180);
CREATE TABLE num_freq (num INTEGER PRIMARY KEY, frequency INTEGER NOT NULL);   -- compressed list: value + how many times it occurs
INSERT INTO num_freq VALUES (1,3),(2,4),(3,1),(5,2);`
  };

  /* ---------- small helpers shared by the visualizers ---------- */
  function items(s) { return String(s || '').split(/[,\n;]+/).map(function (x) { return x.trim(); }).filter(Boolean); }
  function nums(s, hint, max) {
    var a = String(s || '').trim().split(/[\s,]+/).filter(Boolean).map(Number);
    if (!a.length || a.some(isNaN)) throw new Error(hint);
    if (max && a.length > max) throw new Error('Use at most ' + max + ' values');
    return a;
  }
  function span(lo, hi, cls, base) { var h = base || {}; for (var i = lo; i <= hi; i++) h[i] = cls; return h; }
  function copyRows(rows) { return rows.map(function (r) { return r.slice(); }); }
  function hm(t, hint) {
    var m = /^(\d{1,2}):(\d{2})$/.exec(String(t).trim());
    if (!m || +m[1] > 23 || +m[2] > 59) throw new Error(hint || 'Times must look like 09:05');
    return (+m[1]) * 60 + (+m[2]);
  }
  function fmtHM(x) { var h = Math.floor(x / 60) % 24, m = x % 60; return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m; }
  function fmt(n) { return Math.round(n) === n ? String(n) : (Math.round(n * 100) / 100).toFixed(2).replace(/0+$/, '').replace(/\.$/, ''); }

  /* =====================================================================
     TOPIC 1 — Nth highest salary
     ===================================================================== */
  topics.push({
    title: 'Nth Highest Salary (and Why Ties Break Naive Answers)',
    analogy: `<p>Think of a <b>podium at a race</b> where two runners cross the line at exactly the same time. Is the next runner "3rd" or "2nd"? A sports commentator says <i>"they share 1st place, the next one is 3rd"</i> (that is <code>RANK</code>). A teacher handing out gold/silver/bronze <b>by score</b> says <i>"same score, same medal — the next score gets silver"</i> (that is <code>DENSE_RANK</code>). "Nth highest salary" is the teacher's question: the Nth different <b>amount</b>, not the Nth <b>person</b>.</p>`,
    explain: `<p><b>The question:</b> "Find the Nth highest salary. If there is no Nth highest salary, return NULL." It looks like a one-liner, which is exactly why interviewers love it — almost everybody writes a version that is wrong for <b>ties</b> or for <b>missing</b> values.</p>
<p>Our <code>hr.employees</code> table (salaries in rupees per year, shown in thousands below) has ties on purpose:</p>
${H.table(['sorted salary (k)', 'row position', 'distinct position'], [['300', '1', '1'], ['220', '2', '2'], ['210', '3', '3'], [H.c('y', '150'), '4', H.c('y', '4')], [H.c('y', '150'), '5', H.c('y', '4')], [H.c('g', '140'), H.c('r', '6'), H.c('g', '5')], ['130', '7', '6'], ['…', '…', '…']])}
<p>The <b>5th highest salary</b> is <b>140k</b> — the 5th <i>distinct</i> amount. But the 5th <i>row</i> after sorting is 150k (Eli, tied with Dev). So <code>ORDER BY salary DESC LIMIT 1 OFFSET 4</code> answers 150k — ${H.c('r', 'wrong')}.</p>
<p><b>Three correct recipes</b> (learn all three, interviewers ask "another way?"):</p>
<ol>
<li><b>DENSE_RANK</b> (modern, clearest): number distinct amounts 1, 2, 3… with ties sharing a number, then keep rank = N.</li>
<li><b>DISTINCT + LIMIT/OFFSET</b>: remove duplicates first, then skip N−1 values. Wrap it in a scalar subquery <code>SELECT (SELECT …) AS nth</code> so "no row" becomes <code>NULL</code> instead of an empty result.</li>
<li><b>Correlated COUNT</b> (classic, no window functions): a salary is the Nth highest if exactly N−1 distinct salaries are bigger than it.</li>
</ol>
<p><b>The NULL rule:</b> a query that finds nothing returns <i>zero rows</i>, but the problem wants <i>one row containing NULL</i>. A scalar subquery in the SELECT list does that conversion for free: if the inner query is empty, its value is NULL.</p>
<p><b>Special case N = 2:</b> <code>SELECT MAX(salary) FROM employees WHERE salary &lt; (SELECT MAX(salary) FROM employees)</code> — "the biggest salary that is smaller than the biggest". It already returns NULL when everyone earns the same, because MAX over zero rows is NULL.</p>`,
    clues: [
      '"Nth highest", "second highest", "third largest distinct value" → DENSE_RANK or DISTINCT + OFFSET',
      '"If there is no Nth highest, return null" → wrap in a scalar subquery so empty becomes NULL',
      '"salaries can repeat" / sample data with equal salaries → ROW_NUMBER and plain OFFSET are traps',
      '"without using LIMIT / window functions" → correlated COUNT(DISTINCT) subquery',
      '"Nth highest in each department" → DENSE_RANK with PARTITION BY dept (becomes top-N per group)',
      '"write it as a function getNthHighestSalary(N)" → parameter goes into OFFSET N-1 or rank = N'
    ],
    code: [{
      lang: 'sql', db: 'hr', title: 'Recipe 1: DENSE_RANK (best default) — N = 5',
      code: `-- N lives in a one-row CTE so it is easy to change (SQLite has no stored functions).
WITH params(n) AS (SELECT 5),
ranked AS (
  -- DENSE_RANK: equal salaries share a rank, and no rank number is skipped.
  SELECT DISTINCT salary,
         DENSE_RANK() OVER (ORDER BY salary DESC) AS rnk
  FROM employees
)
-- Scalar subquery: returns NULL (not "no rows") when rank N does not exist.
SELECT (SELECT r.salary FROM ranked r, params p WHERE r.rnk = p.n) AS nth_highest_salary;`
    }, {
      lang: 'sql', db: 'hr', title: 'Recipe 2: DISTINCT + LIMIT/OFFSET',
      code: `-- Remove duplicate amounts FIRST, then skip N-1 of them (here N = 5 → OFFSET 4).
SELECT (
  SELECT DISTINCT salary
  FROM employees
  ORDER BY salary DESC
  LIMIT 1 OFFSET 4
) AS nth_highest_salary;     -- 140000`
    }, {
      lang: 'sql', db: 'hr', title: 'Recipe 3: correlated COUNT (works on any SQL engine)',
      code: `-- A salary is the 5th highest when exactly 4 DISTINCT salaries are bigger than it.
SELECT (
  SELECT DISTINCT e1.salary
  FROM employees e1
  WHERE 4 = (SELECT COUNT(DISTINCT e2.salary)
             FROM employees e2
             WHERE e2.salary > e1.salary)
) AS nth_highest_salary;`
    }],
    codeTitle: ['DENSE_RANK', 'DISTINCT + OFFSET', 'Correlated COUNT'],
    viz: {
      title: 'Nth highest: rows vs distinct values',
      input: '300, 150, 220, 150, 110, 140, 110, 95 | 4',
      inputLabel: 'Salaries (k), then | and N',
      gen: function (input) {
        var bits = String(input).split('|');
        if (bits.length !== 2) throw new Error('Format: salaries separated by commas, then | N   e.g. 300, 150, 220 | 2');
        var s = nums(bits[0], 'Salaries must be numbers', 12);
        var n = Number(bits[1]);
        if (!(n >= 1 && n <= 15 && Math.floor(n) === n)) throw new Error('N must be a whole number from 1 to 15');
        var frames = [];
        frames.push({ narr: 'Here is the <code>salary</code> column in storage order. We want the <b>' + n + 'th highest distinct salary</b>, or NULL if it does not exist.', parts: [
          { type: 'table', label: 'employees (storage order)', columns: ['row', 'salary (k)'], rows: s.map(function (v, i) { return [i + 1, v]; }) },
          { type: 'vars', label: 'question', vals: { N: n } }
        ] });
        var sorted = s.slice().sort(function (a, b) { return b - a; });
        frames.push({ narr: '<code>ORDER BY salary DESC</code>: biggest first. Equal salaries now sit next to each other — those ties are what break naive answers.', parts: [
          { type: 'bars', label: 'sorted salaries', values: sorted.slice(), idxLabels: sorted.map(function (v, i) { return '#' + (i + 1); }) }
        ] });
        var naive = n <= sorted.length ? sorted[n - 1] : null;
        var hlN = {}; if (n <= sorted.length) hlN[n - 1] = 'bad';
        frames.push({ narr: 'Naive idea: <code>LIMIT 1 OFFSET ' + (n - 1) + '</code> grabs the ' + n + 'th <b>row</b>' + (naive === null ? ' — there is none, so it returns no rows at all (not even NULL).' : ' = <b>' + naive + '</b>. It counts people, not amounts, so ties ahead of it push the answer down.'), parts: [
          { type: 'bars', label: 'naive pick (row #' + n + ')', values: sorted.slice(), hl: hlN, idxLabels: sorted.map(function (v, i) { return '#' + (i + 1); }) },
          { type: 'code', lang: 'sql', code: 'SELECT salary FROM employees\nORDER BY salary DESC\nLIMIT 1 OFFSET ' + (n - 1) + ';', hl: { 3: 'bad' } }
        ] });
        // DENSE_RANK assignment row by row
        var rows = [], dr = 0, rk = 0, prev = null;
        for (var i = 0; i < sorted.length; i++) {
          if (sorted[i] !== prev) { dr++; rk = i + 1; }
          prev = sorted[i];
          rows.push([sorted[i], i + 1, rk, dr]);
          var hl = span(0, i - 1, 'done'); hl[i] = 'cur';
          frames.push({ narr: 'Row ' + (i + 1) + ': salary <b>' + sorted[i] + '</b>. ' + (i > 0 && sorted[i] === sorted[i - 1] ? H.c('y', 'Same as the row above') + ' → RANK and DENSE_RANK repeat (' + rk + ' / ' + dr + '). ROW_NUMBER still says ' + (i + 1) + '.' : 'New amount → DENSE_RANK goes up by exactly one to <b>' + dr + '</b>; RANK jumps to the row position ' + rk + '.'), parts: [
            { type: 'table', label: 'window functions over ORDER BY salary DESC', columns: ['salary', 'ROW_NUMBER', 'RANK', 'DENSE_RANK'], rows: copyRows(rows), hl: hl }
          ] });
        }
        var hits = {}, ans = null;
        rows.forEach(function (r, k) { if (r[3] === n) { hits[k] = 'sel'; ans = r[0]; } else hits[k] = 'done'; });
        frames.push({ narr: ans === null ? 'Filter <code>DENSE_RANK = ' + n + '</code>: there are only <b>' + dr + '</b> distinct salaries, so nothing matches. The scalar subquery turns "no rows" into <b>NULL</b> — exactly what the problem asks for.' : 'Filter <code>DENSE_RANK = ' + n + '</code> (purple). Every tied row has the same salary, so <code>DISTINCT</code> collapses them to one value: <b>' + ans + '</b>.', parts: [
          { type: 'table', label: 'WHERE rnk = ' + n, columns: ['salary', 'ROW_NUMBER', 'RANK', 'DENSE_RANK'], rows: copyRows(rows), hl: hits },
          { type: 'vars', label: 'answer', vals: { nth_highest: ans === null ? 'NULL' : ans, naive_offset: naive === null ? '(no row)' : naive }, hl: { nth_highest: 'ok', naive_offset: naive !== ans ? 'bad' : '' } }
        ] });
        var dist = sorted.filter(function (v, k) { return k === 0 || v !== sorted[k - 1]; });
        var hd = {}; if (n <= dist.length) hd[n - 1] = 'sel';
        frames.push({ narr: 'Same answer via <code>SELECT DISTINCT … LIMIT 1 OFFSET ' + (n - 1) + '</code>: remove duplicates first, <i>then</i> count. Distinct list has ' + dist.length + ' values. ' + (naive !== ans ? H.c('r', 'Naive OFFSET was wrong here because of ties.') : H.c('g', 'Here naive OFFSET happens to match — but only because no tie sits above position ' + n + '.')), parts: [
          { type: 'bars', label: 'DISTINCT salaries, DESC', values: dist, hl: hd, idxLabels: dist.map(function (v, k) { return 'rank ' + (k + 1); }) }
        ] });
        return frames;
      }
    },
    examples: [
      { title: 'Second highest salary — three ways, same answer', html: `<p>All three return <b>220000</b> (Ben). The MAX-below-MAX trick only works for N = 2; the other two generalise. The scalar subquery wrapper makes the result one row even if the table had a single employee.</p>`,
        code: { lang: 'sql', db: 'hr', code: `SELECT
  (SELECT MAX(salary) FROM employees
    WHERE salary < (SELECT MAX(salary) FROM employees))                       AS via_max,
  (SELECT DISTINCT salary FROM employees ORDER BY salary DESC LIMIT 1 OFFSET 1) AS via_offset,
  (SELECT salary FROM (SELECT DISTINCT salary,
                              DENSE_RANK() OVER (ORDER BY salary DESC) AS r
                       FROM employees) WHERE r = 2)                          AS via_dense_rank;` } },
      { title: 'See ROW_NUMBER vs RANK vs DENSE_RANK side by side', html: `<p>Dev and Eli both earn 150000: ROW_NUMBER gives 4 and 5, RANK gives 4 and 4 then <b>skips</b> to 6, DENSE_RANK gives 4 and 4 then continues at <b>5</b>. Only DENSE_RANK matches "the Nth distinct salary".</p>`,
        code: { lang: 'sql', db: 'hr', code: `SELECT name, salary,
       ROW_NUMBER() OVER (ORDER BY salary DESC) AS row_num,
       RANK()       OVER (ORDER BY salary DESC) AS rnk,
       DENSE_RANK() OVER (ORDER BY salary DESC) AS dense_rnk
FROM employees
ORDER BY salary DESC, name;` } },
      { title: 'N bigger than the number of distinct salaries → NULL', html: `<p>There are 13 distinct salaries. Asking for N = 20 must return a single row with <code>NULL</code>, not an empty grid. Without the outer <code>SELECT ( … )</code> you would get zero rows and fail the test case.</p>`,
        code: { lang: 'sql', db: 'hr', code: `WITH params(n) AS (SELECT 20)
SELECT (SELECT salary
        FROM (SELECT DISTINCT salary, DENSE_RANK() OVER (ORDER BY salary DESC) AS rnk
              FROM employees), params
        WHERE rnk = n) AS nth_highest_salary;   -- NULL` } },
      { title: 'Who earns the Nth highest salary? (return people, not just the amount)', html: `<p>Sometimes they want the <i>employees</i> at that level. Keep the names and filter on DENSE_RANK — ties naturally return several people. For N = 4 both Dev and Eli come back.</p>`,
        code: { lang: 'sql', db: 'hr', code: `WITH ranked AS (
  SELECT name, dept, salary,
         DENSE_RANK() OVER (ORDER BY salary DESC) AS rnk
  FROM employees
)
SELECT name, dept, salary FROM ranked WHERE rnk = 4 ORDER BY name;` } }
    ],
    deepDive: `<p><b>Why the correlated version is O(N²):</b> for each of the N rows of <code>e1</code>, the engine scans <code>e2</code> to count bigger salaries — 10<sup>5</sup> employees means 10<sup>10</sup> comparisons. With an index on <code>salary</code> each inner count becomes a range scan (O(log N + k)), still costly for low N. The window version sorts once (O(N log N)) or walks an index in order, and the <code>DISTINCT … LIMIT … OFFSET</code> version can stop early after N distinct values when an index on <code>salary</code> exists — it is often the fastest in practice.</p>
<p><b>OFFSET is not free:</b> <code>OFFSET 1000000</code> still reads and throws away a million rows. For "Nth" with small N that is fine; for deep pagination use keyset pagination (<code>WHERE salary &lt; :last_seen</code>).</p>
<p><b>NULL salaries:</b> in SQLite and PostgreSQL, NULLs sort <i>first</i> in DESC order in Postgres but <i>last</i> in SQLite (SQLite treats NULL as smallest). A NULL could become "rank 1" on Postgres. Defend with <code>WHERE salary IS NOT NULL</code> or <code>ORDER BY salary DESC NULLS LAST</code> (supported by SQLite ≥ 3.30 and Postgres).</p>
<p><b>Dialect notes:</b> MySQL functions cannot use an expression in <code>LIMIT</code>, so the LeetCode function version does <code>SET N = N - 1;</code> first. SQL Server uses <code>OFFSET n ROWS FETCH NEXT 1 ROWS ONLY</code> or <code>TOP</code>. Oracle 12c+ has <code>FETCH FIRST</code>. PostgreSQL also offers <code>nth_value()</code>, but its default frame stops at the current row — the same trap as <code>LAST_VALUE</code>.</p>
<p><b>Rank functions on huge tables:</b> the engine must sort all rows (or use an index in order). On a distributed warehouse, a global <code>ORDER BY</code> without <code>PARTITION BY</code> funnels everything to one worker — prefer <code>MAX</code>/<code>APPROX_TOP_K</code> or per-partition pre-aggregation when data is billions of rows.</p>`,
    aiEra: `<p><b>What AI changes:</b> any assistant will instantly produce "second highest salary". The trouble is the version it picks: models frequently emit <code>ORDER BY salary DESC LIMIT 1 OFFSET 1</code> without <code>DISTINCT</code>, or forget the NULL wrapper, because those versions dominate old blog posts.</p>
<p><b>Use AI as a partner:</b> ask it <code>Generate 6 tricky test tables for "Nth highest salary": ties at the top, all equal, single row, N larger than distinct count, NULL salaries</code>, then run every candidate query against them. Let AI translate your final query between dialects (MySQL function, SQL Server OFFSET/FETCH) — and check each translation still returns NULL on the empty case.</p>
<p><b>Where AI goes wrong:</b> confusing RANK with DENSE_RANK, using ROW_NUMBER "because it is unique", putting a window function inside WHERE (illegal), or claiming NULLs sort the same way everywhere.</p>
<p><b>What you must still own:</b> stating the tie rule out loud before coding ("distinct amounts, so DENSE_RANK"), knowing the empty-result vs NULL distinction, and explaining the performance difference between correlated counting and a single sort.</p>`,
    problems: [{
      title: 'Nth Highest Salary (return NULL if missing)', level: 'Medium', tags: ['dense_rank', 'limit-offset', 'null handling'], companies: ['Amazon', 'Bloomberg', 'Adobe'],
      statement: `<p>Table <code>employees(id, name, dept, salary, manager_id, hire_date)</code>. Write a query that returns the <b>Nth highest distinct salary</b> as a single column <code>nth_highest_salary</code>. If fewer than N distinct salaries exist, return one row containing <code>NULL</code>. Use N = 5 (keep N in one place so it is easy to change).</p>`,
      constraints: `1 ≤ N ≤ 500; up to 10<sup>5</sup> employees; salaries may repeat; result must be exactly one row.`,
      example: `<p>Distinct salaries (k) high → low: 300, 220, 210, ${H.c('y', '150 (Dev and Eli)')}, ${H.c('g', '140')}, 130, … → N = 5 gives ${H.c('g', '<b>140000</b>')}. With N = 20 → ${H.c('b', 'NULL')} (only 13 distinct values).</p>`,
      brute: { why: `<p>The tempting <code>ORDER BY salary DESC LIMIT 1 OFFSET N-1</code> counts <b>rows</b>, so the Dev/Eli tie pushes it to 150000 — ${H.c('r', 'wrong')}. It also returns <b>zero rows</b> (not NULL) when N is too large. The correlated COUNT fix is correct but scans the table once per row: O(n²).</p>`,
        code: { lang: 'sql', db: 'hr', code: `-- WRONG for ties (returns 150000) and returns no row when N is too big.
SELECT salary AS nth_highest_salary
FROM employees
ORDER BY salary DESC
LIMIT 1 OFFSET 4;` } },
      mcq: { q: 'Salaries are 500, 500, 400. What is the 2nd highest salary?', options: ['500', '400', 'NULL', '450'], answer: 1, explain: 'Distinct amounts are 500 and 400, so the 2nd highest distinct salary is 400. Row-based OFFSET would wrongly say 500.' },
      hints: [
        `<p>Hint 1: "Nth highest" means the Nth highest <b>distinct amount</b>. Which ranking function gives equal values the same number and never skips?</p>`,
        `<p>Hint 2: compute <code>DENSE_RANK() OVER (ORDER BY salary DESC)</code> in a CTE, then keep <code>rnk = N</code>. Or use <code>SELECT DISTINCT … LIMIT 1 OFFSET N-1</code>.</p>`,
        `<p>Hint 3: wrap the whole thing as <code>SELECT ( subquery ) AS nth_highest_salary</code> so an empty result becomes NULL. Put N in <code>WITH params(n) AS (SELECT 5)</code>.</p>`
      ],
      tests: { engine: 'sqlite', check: '(rows, cols, c) => {\n  if (c.plan || c.noplan) { const d = rows.map(r => r[r.length - 1]).join(\'\\n\'); return (!c.plan || new RegExp(c.plan).test(d)) && (!c.noplan || !new RegExp(c.noplan).test(d)); }\n  let a = rows, b = c.rows || [];\n  if (c.set) { const k = r => JSON.stringify(r); a = a.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); b = b.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); }\n  return a.length === b.length && a.every((r, i) => r.length === b[i].length && r.every((v, j) => v === b[i][j] || (typeof v === \'number\' && typeof b[i][j] === \'number\' && Math.abs(v - b[i][j]) < 1e-6)));\n}', cases: [
        { rows: [
            [140000]
          ] },
        { setup: '', after: 'UPDATE params SET n = 1; SELECT * FROM nth_salary', rows: [
            [300000]
          ] },
        { setup: '', after: 'UPDATE params SET n = 2; SELECT * FROM nth_salary', rows: [
            [220000]
          ] },
        { setup: '', after: 'UPDATE params SET n = 4; SELECT * FROM nth_salary', rows: [
            [150000]
          ] },
        { setup: '', after: 'UPDATE params SET n = 13; SELECT * FROM nth_salary', rows: [
            [70000]
          ] },
        { setup: '', after: 'UPDATE params SET n = 14; SELECT * FROM nth_salary', rows: [
            [null]
          ] },
        { setup: '', after: 'UPDATE params SET n = 20; SELECT * FROM nth_salary', rows: [
            [null]
          ] },
        { setup: 'DELETE FROM employees WHERE id NOT IN (1)', after: 'UPDATE params SET n = 1; SELECT * FROM nth_salary', rows: [
            [300000]
          ] },
        { setup: 'DELETE FROM employees WHERE id NOT IN (1)', after: 'UPDATE params SET n = 2; SELECT * FROM nth_salary', rows: [
            [null]
          ] },
        { setup: 'DELETE FROM employees', after: 'UPDATE params SET n = 1; SELECT * FROM nth_salary', rows: [
            [null]
          ] },
        { setup: 'UPDATE employees SET salary = 70000', after: 'UPDATE params SET n = 2; SELECT * FROM nth_salary', rows: [
            [null]
          ] },
        { setup: 'UPDATE employees SET salary = 70000', after: 'UPDATE params SET n = 1; SELECT * FROM nth_salary', rows: [
            [70000]
          ] },
        { setup: 'UPDATE employees SET salary = 220000 WHERE id = 1', after: 'UPDATE params SET n = 3; SELECT * FROM nth_salary', rows: [
            [150000]
          ] }
      ] },
      solution: {
        approach: `<p>Rank distinct salaries with DENSE_RANK, pick rank N, and let a scalar subquery convert "nothing found" into NULL. One sort, one pass.</p>`,
        code: { lang: 'sql', db: 'hr', code: `CREATE TEMP TABLE params AS SELECT 5 AS n;            -- change N here

CREATE TEMP VIEW nth_salary AS
WITH ranked AS (
  SELECT DISTINCT salary,
         DENSE_RANK() OVER (ORDER BY salary DESC) AS rnk
  FROM employees
)
SELECT (SELECT r.salary
        FROM ranked r JOIN params p ON r.rnk = p.n) AS nth_highest_salary;

SELECT * FROM nth_salary;` },
        alt: [{ lang: 'sql', db: 'hr', title: 'No window functions', code: `-- Exactly N-1 = 4 distinct salaries are greater than the answer.
SELECT (SELECT DISTINCT e1.salary
        FROM employees e1
        WHERE (SELECT COUNT(DISTINCT e2.salary)
               FROM employees e2
               WHERE e2.salary > e1.salary) = 4) AS nth_highest_salary;` }],
        dry: { head: ['salary', 'DENSE_RANK', 'kept?'], rows: [['300000', '1', 'no'], ['220000', '2', 'no'], ['210000', '3', 'no'], ['150000', '4', 'no (Dev + Eli collapse to one)'], ['140000', '5', H.c('g', 'yes → answer')]] },
        complexity: `<p>O(n log n) for the sort behind DENSE_RANK (or an ordered index walk); O(n) extra space. The correlated alternative is O(n²) without an index.</p>`,
        followUps: ['Return the Nth highest salary per department, with NULL for departments that have fewer than N levels.', 'Return the names of everyone earning the Nth highest salary.', 'What changes if the table can contain NULL salaries?']
      }
    }]
  });

  /* =====================================================================
     TOPIC 2 — Top-N per group
     ===================================================================== */
  topics.push({
    title: 'Top-N per Group (Greatest-N-per-Group)',
    analogy: `<p>A school announces the <b>top 3 students of every class</b>. The principal does not sort the whole school into one line — each class teacher sorts <i>their own</i> students, reads out the first three, and passes the list on. <code>PARTITION BY</code> is "each class separately", <code>ORDER BY</code> is "sort by marks", and the rank function is the teacher counting 1, 2, 3.</p>`,
    explain: `<p><b>The pattern:</b> "top N <i>something</i> per <i>group</i>" — top 3 salaries per department, latest order per customer, best-selling product per category, most recent status per device. The modern recipe is always the same three lines:</p>
<ol>
<li>In a CTE, add a rank column: <code>ROW_NUMBER() / RANK() / DENSE_RANK() OVER (PARTITION BY group ORDER BY measure DESC)</code>.</li>
<li>In the outer query, keep <code>WHERE rank_col &lt;= N</code>.</li>
<li>Decide the <b>tie rule</b> — that decides which function.</li>
</ol>
${H.table(['If the question says…', 'use', 'Engineering, N = 2 returns'], [['"exactly N rows per group" / "pick one"', '<code>ROW_NUMBER</code> + a tie-breaker', 'Ben, Dev (Eli dropped arbitrarily unless you add a tie-breaker)'], ['"top N, include ties, ranks may skip"', '<code>RANK</code>', 'Ben, Dev, Eli (rank 1, 2, 2)'], ['"top N <b>distinct</b> salary levels"', '<code>DENSE_RANK</code>', 'Ben, Dev, Eli — and with N = 3 also Fay']])}
<p><b>Why a CTE?</b> Window functions are computed after <code>WHERE</code>, so <code>WHERE ROW_NUMBER() OVER (…) &lt;= 3</code> is illegal. Compute first, filter outside. (Snowflake, BigQuery, DuckDB and Teradata have a shortcut: <code>QUALIFY rn &lt;= 3</code>. SQLite, MySQL and PostgreSQL do not.)</p>
<p><b>N = 1 is special</b> ("latest order per customer", "highest-paid per department"). Besides ROW_NUMBER = 1 you can join to a <code>GROUP BY … MAX()</code> subquery — that returns all tied winners — or use a <code>NOT EXISTS</code> "nobody beats me" anti-join.</p>
<p><b>Groups with fewer than N rows</b> simply return what they have (Exec has only Asha). <b>Groups with zero rows</b> disappear — if the question says "every customer, even with no orders", start from the customers table and <code>LEFT JOIN</code> the ranked rows with <code>rn = 1</code> in the ON clause.</p>`,
    clues: [
      '"top 3 per department", "best-selling product in each category", "highest X for each Y" → PARTITION BY Y ORDER BY X DESC',
      '"latest / most recent / first record per user" → ROW_NUMBER() = 1 ordered by timestamp DESC (N = 1 case)',
      '"include ties" or "employees who earn one of the top three salaries" → RANK or DENSE_RANK, not ROW_NUMBER',
      '"exactly one row per group, break ties by id" → ROW_NUMBER with a deterministic tie-breaker column',
      '"also list groups with no data" → LEFT JOIN from the group table with rn = 1 inside ON',
      '"without window functions" → correlated COUNT &lt; N, or JOIN to GROUP BY MAX for N = 1'
    ],
    code: [{
      lang: 'sql', db: 'hr', title: 'Top 3 distinct salary levels per department (ties included)',
      code: `WITH ranked AS (
  SELECT dept, name, salary,
         DENSE_RANK() OVER (PARTITION BY dept        -- restart numbering per department
                            ORDER BY salary DESC)    -- biggest salary gets 1
           AS salary_rank
  FROM employees
)
SELECT dept, name, salary, salary_rank
FROM ranked
WHERE salary_rank <= 3          -- filter AFTER ranking (cannot do this in the same SELECT)
ORDER BY dept, salary DESC, name;`
    }, {
      lang: 'sql', db: 'shop', title: 'Exactly one row per group: latest order per customer (customers with no orders kept)',
      code: `WITH ranked AS (
  SELECT customer_id, order_id, order_date, amount,
         ROW_NUMBER() OVER (PARTITION BY customer_id
                            ORDER BY order_date DESC, order_id DESC) AS rn   -- order_id breaks ties
  FROM orders
)
SELECT c.name, r.order_id, r.order_date, r.amount
FROM customers c
LEFT JOIN ranked r
       ON r.customer_id = c.customer_id
      AND r.rn = 1                 -- inside ON, so Finn (no orders) survives with NULLs
ORDER BY c.customer_id;`
    }],
    codeTitle: ['DENSE_RANK top-3', 'ROW_NUMBER = 1 + LEFT JOIN'],
    viz: {
      title: 'Partition, rank, filter — and how the three rank functions differ',
      input: 'Eng Ben 220, Eng Dev 150, Fin Cara 210, Eng Eli 150, Eng Fay 120, Fin Jia 130, Fin Kofi 98, Eng Gus 110, Fin Lena 98 | 2',
      inputLabel: '"Group Name Value" rows, then | N',
      gen: function (input) {
        var bits = String(input).split('|');
        if (bits.length !== 2) throw new Error('Format: "Group Name Value, …" then | N');
        var n = Number(bits[1]);
        if (!(n >= 1 && n <= 6 && Math.floor(n) === n)) throw new Error('N must be 1 to 6');
        var rows = items(bits[0]).map(function (it) {
          var p = it.split(/\s+/);
          if (p.length !== 3 || isNaN(Number(p[2]))) throw new Error('Each row needs Group Name Value, e.g. "Eng Ben 220"');
          return { g: p[0], name: p[1], v: Number(p[2]) };
        });
        if (rows.length > 14) throw new Error('Use at most 14 rows');
        var frames = [];
        frames.push({ narr: 'The raw rows arrive mixed up. Goal: <b>top ' + n + ' per group</b>. Watch how the choice of rank function changes the answer when values tie.', parts: [
          { type: 'table', label: 'input rows', columns: ['group', 'name', 'value'], rows: rows.map(function (r) { return [r.g, r.name, r.v]; }) }
        ] });
        var s = rows.slice().sort(function (a, b) { return a.g < b.g ? -1 : a.g > b.g ? 1 : b.v - a.v || (a.name < b.name ? -1 : 1); });
        var hl = {}, k = 0;
        for (var i = 0; i < s.length; i++) { if (i > 0 && s[i].g !== s[i - 1].g) k++; hl[i] = k % 2 ? 'sel' : 'win'; }
        frames.push({ narr: '<code>PARTITION BY group ORDER BY value DESC</code>: rows are bucketed by group (alternating colours) and sorted biggest-first <b>inside</b> each bucket. Numbering will restart at 1 in every bucket.', parts: [
          { type: 'table', label: 'partitioned + sorted', columns: ['group', 'name', 'value'], rows: s.map(function (r) { return [r.g, r.name, r.v]; }), hl: hl }
        ] });
        var out = [], rn = 0, rk = 0, dr = 0;
        for (i = 0; i < s.length; i++) {
          var newG = i === 0 || s[i].g !== s[i - 1].g;
          if (newG) { rn = 0; rk = 0; dr = 0; }
          rn++;
          if (newG || s[i].v !== s[i - 1].v) { rk = rn; dr++; }
          out.push([s[i].g, s[i].name, s[i].v, rn, rk, dr]);
          var h = span(0, i - 1, 'done'); h[i] = 'cur';
          frames.push({ narr: (newG ? '<b>New partition "' + s[i].g + '"</b> → all counters reset to 1. ' : '') + s[i].name + ' (' + s[i].v + '): ' + (!newG && s[i].v === s[i - 1].v ? H.c('y', 'tie with the row above') + ' → RANK and DENSE_RANK repeat, ROW_NUMBER keeps counting.' : 'ROW_NUMBER = ' + rn + ', RANK = ' + rk + ', DENSE_RANK = ' + dr + '.'), parts: [
            { type: 'table', label: 'rank columns being filled', columns: ['group', 'name', 'value', 'ROW_NUMBER', 'RANK', 'DENSE_RANK'], rows: copyRows(out), hl: h }
          ] });
        }
        ['ROW_NUMBER', 'RANK', 'DENSE_RANK'].forEach(function (fn, f) {
          var keep = {}, cnt = 0;
          out.forEach(function (r, j) { if (r[3 + f] <= n) { keep[j] = 'ok'; cnt++; } else keep[j] = 'done'; });
          frames.push({ narr: '<code>WHERE ' + fn.toLowerCase() + ' &lt;= ' + n + '</code> keeps <b>' + cnt + '</b> rows (green). ' + (f === 0 ? 'Exactly ' + n + ' per group — but on a tie, which twin survives depends on the tie-breaker you add.' : f === 1 ? 'Ties are all kept; after a tie RANK skips numbers, so fewer distinct levels may fit.' : 'Ties kept AND no gaps: you get the top ' + n + ' distinct value <i>levels</i>, possibly many people.'), parts: [
            { type: 'table', label: 'filter on ' + fn, columns: ['group', 'name', 'value', 'ROW_NUMBER', 'RANK', 'DENSE_RANK'], rows: copyRows(out), hl: keep }
          ] });
        });
        return frames;
      }
    },
    examples: [
      { title: 'Exactly 2 per department with a fair tie-breaker', html: `<p>Engineering has a 150k tie (Dev, Eli). With <code>ORDER BY salary DESC, hire_date</code> the more senior Dev wins row 2. Without a tie-breaker the database may return either one, and the answer can change between runs.</p>`,
        code: { lang: 'sql', db: 'hr', code: `WITH r AS (
  SELECT dept, name, salary, hire_date,
         ROW_NUMBER() OVER (PARTITION BY dept ORDER BY salary DESC, hire_date) AS rn
  FROM employees
)
SELECT dept, name, salary, hire_date FROM r WHERE rn <= 2 ORDER BY dept, rn;` } },
      { title: 'Top customer by delivered revenue in each city (ties kept with RANK)', html: `<p>Two levels: aggregate first (revenue per customer), then rank inside each city. This "GROUP BY then window" combo is extremely common. Result: Delhi → Ben (415), Mumbai → Dan (1075), Pune → Asha (510).</p>`,
        code: { lang: 'sql', db: 'shop', code: `WITH totals AS (
  SELECT c.city, c.name, SUM(o.amount) AS revenue
  FROM customers c JOIN orders o ON o.customer_id = c.customer_id
  WHERE o.status = 'delivered'
  GROUP BY c.customer_id, c.city, c.name
), ranked AS (
  SELECT *, RANK() OVER (PARTITION BY city ORDER BY revenue DESC) AS rk
  FROM totals
)
SELECT city, name, revenue FROM ranked WHERE rk = 1 ORDER BY city;` } },
      { title: 'N = 1 without window functions: join to the group maximum', html: `<p>The classic pre-2010 answer: compute <code>MAX(salary)</code> per department, then join back to find who earns it. Ties are all returned. It costs two passes but runs on every SQL engine.</p>`,
        code: { lang: 'sql', db: 'hr', code: `SELECT e.dept, e.name, e.salary
FROM employees e
JOIN (SELECT dept, MAX(salary) AS max_sal
      FROM employees GROUP BY dept) m
  ON m.dept = e.dept AND m.max_sal = e.salary
ORDER BY e.dept;` } },
      { title: 'N = 1 with NOT EXISTS: "nobody in my department earns more"', html: `<p>Anti-join formulation. It reads like the English definition and an index on <code>(dept, salary)</code> makes each probe cheap. Returns ties as well.</p>`,
        code: { lang: 'sql', db: 'hr', code: `SELECT e.dept, e.name, e.salary
FROM employees e
WHERE NOT EXISTS (SELECT 1 FROM employees x
                  WHERE x.dept = e.dept AND x.salary > e.salary)
ORDER BY e.dept;` } }
    ],
    deepDive: `<p><b>Cost model.</b> The window approach sorts by <code>(group, measure)</code> once: O(n log n), or O(n) if an index on <code>(dept, salary DESC)</code> already delivers rows in that order. The correlated "count how many beat me" version is O(n × group size) — fine for 50 employees, terrible for 50 million events. Postgres can do even better for small N with <code>LATERAL</code>: <code>FROM depts d CROSS JOIN LATERAL (SELECT … WHERE e.dept = d.dept ORDER BY salary DESC LIMIT 3)</code> — one tiny index range scan per group (SQL Server: <code>CROSS APPLY</code>). SQLite has no LATERAL.</p>
<p><b>SQLite's bare-column trick.</b> <code>SELECT dept, name, MAX(salary) FROM employees GROUP BY dept</code> works in SQLite: when the aggregate is exactly one <code>MAX</code> or <code>MIN</code>, bare columns come from the row holding that max. It is documented SQLite behaviour, but on ties it returns <b>one arbitrary row</b>, and MySQL (ONLY_FULL_GROUP_BY) / Postgres reject the query. Do not use it in interviews unless you name the caveat.</p>
<p><b>Determinism.</b> ROW_NUMBER over a non-unique ORDER BY is non-deterministic: two runs on different plans can pick different twins. Always end the ORDER BY with a unique key (id). This matters for reproducible reports and pagination.</p>
<p><b>Postgres DISTINCT ON:</b> <code>SELECT DISTINCT ON (customer_id) * FROM orders ORDER BY customer_id, order_date DESC</code> is a concise N = 1 shortcut. <b>Warehouses</b>: BigQuery's <code>ARRAY_AGG(x ORDER BY y DESC LIMIT 3)</code> or <code>QUALIFY</code> avoid materialising every row's rank; at scale, pre-filter (e.g. last 30 days) before ranking, because ranking forces a shuffle by partition key.</p>`,
    aiEra: `<p><b>What AI changes:</b> "top 3 per group" is a template every assistant knows — you will get a working CTE in seconds. The value you add is choosing the <b>tie rule</b> and the <b>tie-breaker</b>, which models usually pick silently (almost always ROW_NUMBER).</p>
<p><b>Use AI as a partner:</b> prompt <code>Write top-3 salaries per department. Show results for ROW_NUMBER, RANK and DENSE_RANK on data where two people tie for 2nd, and explain which matches "employees who earn one of the top three unique salaries"</code>. Ask it for the LATERAL / QUALIFY / DISTINCT ON variant for your production dialect, then check the plan with EXPLAIN.</p>
<p><b>Where AI goes wrong:</b> putting the window function in WHERE, ranking before filtering out cancelled rows (so a cancelled order "uses up" a slot), forgetting groups with zero rows, or using SQLite's bare-column GROUP BY in a Postgres answer.</p>
<p><b>What you must still own:</b> reading the requirement for ties, deciding whether filters run before or after ranking, and knowing the index that makes it fast.</p>`,
    problems: [{
      title: 'Department Top Three Salaries', level: 'Hard', tags: ['dense_rank', 'top-n per group', 'ties'], companies: ['Amazon', 'Meta', 'Microsoft'],
      statement: `<p>A company wants the <b>high earners</b> in each department: an employee is a high earner if their salary is among the <b>top three unique salaries</b> of their department. Return <code>dept, name, salary</code> ordered by dept, then salary descending, then name.</p>`,
      constraints: `Up to 10<sup>5</sup> employees, ~100 departments; salaries repeat; a department may have fewer than 3 distinct salaries.`,
      example: `<p>Engineering salaries (k): 220, ${H.c('y', '150, 150')}, 120, 110, 110, 95 → unique top three = 220, 150, 120 → ${H.c('g', 'Ben, Dev, Eli, Fay')} (4 people). Finance: 210, 130, ${H.c('y', '98, 98')} → Cara, Jia, Kofi, Lena. Exec has only Asha → just Asha.</p>`,
      brute: { why: `<p>Correlated subquery: for each employee count the distinct salaries in the same department that are higher, keep those with fewer than 3. Correct, but it rescans the department for every employee — O(n × d) where d is department size; on 10<sup>5</sup> rows in big departments that is billions of comparisons without a <code>(dept, salary)</code> index.</p>`,
        code: { lang: 'sql', db: 'hr', code: `SELECT e1.dept, e1.name, e1.salary
FROM employees e1
WHERE (SELECT COUNT(DISTINCT e2.salary)
       FROM employees e2
       WHERE e2.dept = e1.dept
         AND e2.salary > e1.salary) < 3      -- fewer than 3 unique salaries beat me
ORDER BY e1.dept, e1.salary DESC, e1.name;` } },
      mcq: { q: 'A department has salaries 100, 90, 90, 80, 70. Using RANK() &lt;= 3, who is returned?', options: ['100, 90, 90', '100, 90, 90, 80', '100, 90, 80', 'Only 100'], answer: 0, explain: 'RANK gives 1, 2, 2, 4, 5 — the 80 gets rank 4 because RANK skips after a tie. DENSE_RANK would give 1, 2, 2, 3 and also include 80, which is what "top three unique salaries" needs.' },
      hints: [
        `<p>Hint 1: "top three <b>unique</b> salaries" means tied people share a position and no position is skipped.</p>`,
        `<p>Hint 2: <code>DENSE_RANK() OVER (PARTITION BY dept ORDER BY salary DESC)</code> in a CTE.</p>`,
        `<p>Hint 3: filter <code>WHERE rnk &lt;= 3</code> outside the CTE; departments with fewer levels just return everyone. Remember the final ORDER BY.</p>`
      ],
      tests: { engine: 'sqlite', check: '(rows, cols, c) => {\n  if (c.plan || c.noplan) { const d = rows.map(r => r[r.length - 1]).join(\'\\n\'); return (!c.plan || new RegExp(c.plan).test(d)) && (!c.noplan || !new RegExp(c.noplan).test(d)); }\n  let a = rows, b = c.rows || [];\n  if (c.set) { const k = r => JSON.stringify(r); a = a.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); b = b.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); }\n  return a.length === b.length && a.every((r, i) => r.length === b[i].length && r.every((v, j) => v === b[i][j] || (typeof v === \'number\' && typeof b[i][j] === \'number\' && Math.abs(v - b[i][j]) < 1e-6)));\n}', cases: [
        { rows: [
            ['Engineering', 'Ben', 220000],
            ['Engineering', 'Dev', 150000],
            ['Engineering', 'Eli', 150000],
            ['Engineering', 'Fay', 120000],
            ['Exec', 'Asha', 300000],
            ['Finance', 'Cara', 210000],
            ['Finance', 'Jia', 130000],
            ['Finance', 'Kofi', 98000],
            ['Finance', 'Lena', 98000],
            ['Sales', 'Mo', 140000],
            ['Sales', 'Nia', 90000],
            ['Sales', 'Omar', 85000],
            ['Sales', 'Pia', 85000]
          ] },
        { setup: 'DELETE FROM employees WHERE id NOT IN (1)', rows: [
            ['Exec', 'Asha', 300000]
          ] },
        { setup: 'UPDATE employees SET salary = 100', rows: [
            ['Engineering', 'Ben', 100],
            ['Engineering', 'Dev', 100],
            ['Engineering', 'Eli', 100],
            ['Engineering', 'Fay', 100],
            ['Engineering', 'Gus', 100],
            ['Engineering', 'Hana', 100],
            ['Engineering', 'Ivan', 100],
            ['Exec', 'Asha', 100],
            ['Finance', 'Cara', 100],
            ['Finance', 'Jia', 100],
            ['Finance', 'Kofi', 100],
            ['Finance', 'Lena', 100],
            ['Sales', 'Mo', 100],
            ['Sales', 'Nia', 100],
            ['Sales', 'Omar', 100],
            ['Sales', 'Pia', 100],
            ['Sales', 'Raj', 100]
          ] },
        { setup: 'UPDATE employees SET dept = \'Finance\' WHERE id = 2; UPDATE employees SET dept = \'Finance\' WHERE id = 4', rows: [
            ['Engineering', 'Eli', 150000],
            ['Engineering', 'Fay', 120000],
            ['Engineering', 'Gus', 110000],
            ['Engineering', 'Hana', 110000],
            ['Exec', 'Asha', 300000],
            ['Finance', 'Ben', 220000],
            ['Finance', 'Cara', 210000],
            ['Finance', 'Dev', 150000],
            ['Sales', 'Mo', 140000],
            ['Sales', 'Nia', 90000],
            ['Sales', 'Omar', 85000],
            ['Sales', 'Pia', 85000]
          ] },
        { setup: 'UPDATE employees SET salary = 220000 WHERE id = 6; UPDATE employees SET salary = 300000 WHERE id = 7', rows: [
            ['Engineering', 'Gus', 300000],
            ['Engineering', 'Ben', 220000],
            ['Engineering', 'Fay', 220000],
            ['Engineering', 'Dev', 150000],
            ['Engineering', 'Eli', 150000],
            ['Exec', 'Asha', 300000],
            ['Finance', 'Cara', 210000],
            ['Finance', 'Jia', 130000],
            ['Finance', 'Kofi', 98000],
            ['Finance', 'Lena', 98000],
            ['Sales', 'Mo', 140000],
            ['Sales', 'Nia', 90000],
            ['Sales', 'Omar', 85000],
            ['Sales', 'Pia', 85000]
          ] },
        { setup: 'INSERT INTO employees VALUES (18,\'Zed\',\'Ops\',1,NULL,\'2024-01-01\'); INSERT INTO employees VALUES (19,\'Yan\',\'Ops\',2,NULL,\'2024-01-01\')', rows: [
            ['Engineering', 'Ben', 220000],
            ['Engineering', 'Dev', 150000],
            ['Engineering', 'Eli', 150000],
            ['Engineering', 'Fay', 120000],
            ['Exec', 'Asha', 300000],
            ['Finance', 'Cara', 210000],
            ['Finance', 'Jia', 130000],
            ['Finance', 'Kofi', 98000],
            ['Finance', 'Lena', 98000],
            ['Ops', 'Yan', 2],
            ['Ops', 'Zed', 1],
            ['Sales', 'Mo', 140000],
            ['Sales', 'Nia', 90000],
            ['Sales', 'Omar', 85000],
            ['Sales', 'Pia', 85000]
          ] },
        { setup: 'INSERT INTO employees VALUES (18,\'Zed\',\'Ops\',50,NULL,\'2024-01-01\'); INSERT INTO employees VALUES (19,\'Yan\',\'Ops\',50,NULL,\'2024-01-01\'); INSERT INTO employees VALUES (20,\'Xia\',\'Ops\',40,NULL,\'2024-01-01\'); INSERT INTO employees VALUES (21,\'Wu\',\'Ops\',30,NULL,\'2024-01-01\'); INSERT INTO employees VALUES (22,\'Vic\',\'Ops\',20,NULL,\'2024-01-01\')', rows: [
            ['Engineering', 'Ben', 220000],
            ['Engineering', 'Dev', 150000],
            ['Engineering', 'Eli', 150000],
            ['Engineering', 'Fay', 120000],
            ['Exec', 'Asha', 300000],
            ['Finance', 'Cara', 210000],
            ['Finance', 'Jia', 130000],
            ['Finance', 'Kofi', 98000],
            ['Finance', 'Lena', 98000],
            ['Ops', 'Yan', 50],
            ['Ops', 'Zed', 50],
            ['Ops', 'Xia', 40],
            ['Ops', 'Wu', 30],
            ['Sales', 'Mo', 140000],
            ['Sales', 'Nia', 90000],
            ['Sales', 'Omar', 85000],
            ['Sales', 'Pia', 85000]
          ] },
        { setup: 'DELETE FROM employees', after: 'SELECT count(*) FROM (SELECT 1 FROM employees)', rows: [
            [0]
          ] },
        { setup: 'DELETE FROM employees', rows: [] }
      ] },
      solution: {
        approach: `<p>Rank salary levels inside each department with DENSE_RANK, then keep levels 1–3. One sort by (dept, salary), one filter.</p>`,
        code: { lang: 'sql', db: 'hr', code: `WITH ranked AS (
  SELECT dept, name, salary,
         DENSE_RANK() OVER (PARTITION BY dept ORDER BY salary DESC) AS rnk
  FROM employees
)
SELECT dept, name, salary
FROM ranked
WHERE rnk <= 3
ORDER BY dept, salary DESC, name;` },
        dry: { head: ['dept', 'name', 'salary', 'rnk', 'kept'], rows: [['Engineering', 'Ben', '220000', '1', 'yes'], ['Engineering', 'Dev / Eli', '150000', '2', 'yes (both)'], ['Engineering', 'Fay', '120000', '3', 'yes'], ['Engineering', 'Gus / Hana', '110000', '4', H.c('r', 'no')], ['Exec', 'Asha', '300000', '1', 'yes']] },
        complexity: `<p>O(n log n) for the partitioned sort (O(n) with an index on <code>(dept, salary)</code>); O(n) memory for the window.</p>`,
        followUps: ['Return exactly 3 people per department, breaking ties by earliest hire date.', 'Also show each person’s gap to the department’s top salary.', 'How would you write this in Postgres with LATERAL, and when is that faster?']
      }
    }]
  });

  /* =====================================================================
     TOPIC 3 — Consecutive days / streaks
     ===================================================================== */
  topics.push({
    title: 'Consecutive Days & Streaks (the date − ROW_NUMBER trick)',
    analogy: `<p>Picture a <b>wall calendar</b> where you tick every day you went to the gym. Streaks are the runs of ticks with no blank day between them. Now imagine a second, "perfect" calendar that ticks 1, 2, 3, 4… with no gaps. If you <b>slide your real calendar back</b> by the perfect count, every day in the same streak lands on the <b>same starting square</b>. Days after a break land on a later square. That shared square is the streak's name tag.</p>`,
    explain: `<p><b>The questions:</b> "users who logged in 3 or more consecutive days", "longest login streak per user", "current streak as of today", "Duolingo-style daily streak". All of them reduce to one trick.</p>
<p><b>Step 0 — one row per user per day.</b> Logins are timestamps and people log in several times a day (Amy logged in twice on Jan 2). Use <code>SELECT DISTINCT user_id, date(login_ts)</code> first, or duplicate days will break the arithmetic.</p>
<p><b>Step 1 — number the days</b> per user in date order with <code>ROW_NUMBER()</code>.</p>
<p><b>Step 2 — subtract.</b> <code>day − row_number</code> (as a date: <code>date(day, '-' || rn || ' days')</code>, or as a number: <code>julianday(day) − rn</code>). Inside a streak, both the day and the row number go up by exactly 1, so their difference stays the <b>same</b>. After a gap the day jumps by more than 1 while rn only goes up by 1 — the difference changes. Amy in January:</p>
${H.table(['day', 'rn', 'day − rn  (group key)'], [['Jan 1', '1', H.c('b', 'Dec 31')], ['Jan 2', '2', H.c('b', 'Dec 31')], ['Jan 3', '3', H.c('b', 'Dec 31')], ['Jan 5', '4', H.c('p', 'Jan 1')], ['Jan 6', '5', H.c('p', 'Jan 1')], ['Jan 8', '6', H.c('g', 'Jan 2')], ['Jan 9', '7', H.c('g', 'Jan 2')], ['Jan 10', '8', H.c('g', 'Jan 2')], ['Jan 11', '9', H.c('g', 'Jan 2')]])}
<p><b>Step 3 — GROUP BY user, group key</b>: <code>MIN(day)</code> = streak start, <code>MAX(day)</code> = streak end, <code>COUNT(*)</code> = length. Amy's streaks: 3, 2, 4 days.</p>
<p><b>Step 4 — answer the question:</b> <code>HAVING COUNT(*) &gt;= 3</code> for "3+ consecutive days", <code>MAX(len)</code> per user for "longest", <code>WHERE end_day = today</code> for "current streak".</p>
<p><b>Alternative — LAG:</b> compare each day with the previous one (<code>LAG(day)</code>); a difference of exactly 1 continues the streak. For "at least K in a row" there is a neat shortcut: <code>LAG(day, K−1)</code> equals <code>day − (K−1)</code> exactly when the last K days were consecutive.</p>`,
    clues: [
      '"consecutive days", "N days in a row", "streak", "daily active for at least K days" → day − ROW_NUMBER group key',
      '"longest streak per user" → group key, COUNT per group, then MAX per user',
      '"logged in multiple times a day" / timestamps instead of dates → DISTINCT date(ts) first',
      '"current streak as of today" → streak whose end_day = today (or yesterday, if today is not over)',
      '"at least 3 consecutive" with fixed small K → LAG(day, K-1) = day − (K-1) also works',
      '"weeks in a row" / "months in a row" → same trick on week/month numbers instead of days'
    ],
    code: [{
      lang: 'sql', db: 'app', title: 'All streaks for every user (start, end, length)',
      code: `WITH days AS (                                   -- step 0: one row per user per calendar day
  SELECT DISTINCT user_id, date(login_ts) AS day
  FROM logins
),
keyed AS (                                       -- steps 1 + 2: day minus its position
  SELECT user_id, day,
         date(day, '-' || ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY day) || ' days') AS grp
  FROM days
)
SELECT user_id,                                  -- step 3: one row per streak
       MIN(day) AS streak_start,
       MAX(day) AS streak_end,
       COUNT(*) AS streak_days
FROM keyed
GROUP BY user_id, grp
ORDER BY user_id, streak_start;`
    }, {
      lang: 'sql', db: 'app', title: 'Longest streak per user',
      code: `WITH days AS (SELECT DISTINCT user_id, date(login_ts) AS day FROM logins),
keyed AS (
  SELECT user_id, day,
         julianday(day) - ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY day) AS grp  -- numeric key
  FROM days
),
streaks AS (SELECT user_id, COUNT(*) AS len FROM keyed GROUP BY user_id, grp)
SELECT u.name, MAX(s.len) AS longest_streak
FROM streaks s JOIN users u ON u.user_id = s.user_id
GROUP BY u.user_id, u.name
ORDER BY longest_streak DESC, u.name;`
    }],
    codeTitle: ['Every streak', 'Longest per user'],
    viz: {
      title: 'Streaks: day − row_number gives each run the same key',
      input: '1 2 2 3 5 6 8 9 10 11',
      inputLabel: 'Login days of one user (day numbers, duplicates allowed)',
      gen: function (input) {
        var raw = nums(input, 'Enter day numbers separated by spaces, e.g. 1 2 3 5 6', 16);
        if (raw.some(function (d) { return d < 1 || d > 365 || Math.floor(d) !== d; })) throw new Error('Days must be whole numbers 1..365');
        var frames = [];
        var sorted = raw.slice().sort(function (a, b) { return a - b; });
        frames.push({ narr: 'Raw login days for one user, sorted. The same day can appear twice (two logins that day).', parts: [
          { type: 'array', label: 'login days', values: sorted.slice() }
        ] });
        var hlDup = {}, days = [];
        sorted.forEach(function (d, i) { if (i > 0 && d === sorted[i - 1]) hlDup[i] = 'bad'; else days.push(d); });
        frames.push({ narr: 'Step 0 — <code>SELECT DISTINCT date(login_ts)</code>: duplicate days (red) are removed. ' + (Object.keys(hlDup).length ? 'If we kept them, the row number would advance while the day does not, splitting a real streak.' : 'No duplicates this time.'), parts: [
          { type: 'array', label: 'before DISTINCT', values: sorted.slice(), hl: hlDup },
          { type: 'array', label: 'after DISTINCT', values: days.slice() }
        ] });
        var rows = [];
        for (var i = 0; i < days.length; i++) {
          rows.push([days[i], i + 1, days[i] - (i + 1)]);
          var h = span(0, i - 1, 'done'); h[i] = 'cur';
          var same = i > 0 && rows[i][2] === rows[i - 1][2];
          frames.push({ narr: 'Day <b>' + days[i] + '</b> gets row number <b>' + (i + 1) + '</b> → key = ' + days[i] + ' − ' + (i + 1) + ' = <b>' + (days[i] - i - 1) + '</b>. ' + (i === 0 ? 'First day starts the first streak.' : same ? H.c('g', 'Same key as the previous day → same streak (both went up by 1).') : H.c('r', 'Key changed → there was a gap of ' + (days[i] - days[i - 1] - 1) + ' day(s), a new streak starts.')), parts: [
            { type: 'table', label: 'ROW_NUMBER and key', columns: ['day', 'rn', 'day − rn'], rows: copyRows(rows), hl: h }
          ] });
        }
        var groups = [], hlG = {};
        rows.forEach(function (r, k) {
          if (!groups.length || groups[groups.length - 1].key !== r[2]) groups.push({ key: r[2], s: r[0], e: r[0], n: 0 });
          var g = groups[groups.length - 1]; g.e = r[0]; g.n++;
          hlG[k] = ['win', 'sel', 'ok', 'cur'][(groups.length - 1) % 4];
        });
        frames.push({ narr: 'Colour = key. Every run of consecutive days shares one key. Now <code>GROUP BY key</code>.', parts: [
          { type: 'table', label: 'rows coloured by key', columns: ['day', 'rn', 'day − rn'], rows: copyRows(rows), hl: hlG }
        ] });
        var best = 0; groups.forEach(function (g, k) { if (g.n > groups[best].n) best = k; });
        var hb = {}; hb[best] = 'sel';
        frames.push({ narr: 'One row per streak: start = MIN(day), end = MAX(day), length = COUNT(*). There are <b>' + groups.length + '</b> streaks.', parts: [
          { type: 'table', label: 'GROUP BY key', columns: ['key', 'streak_start', 'streak_end', 'length'], rows: groups.map(function (g) { return [g.key, g.s, g.e, g.n]; }) }
        ] });
        var hk = {}; groups.forEach(function (g, k) { if (g.n >= 3) hk[k] = 'ok'; });
        frames.push({ narr: 'Answers: longest streak = <b>' + groups[best].n + '</b> days (purple, days ' + groups[best].s + '–' + groups[best].e + '). "3+ consecutive days?" → ' + (Object.keys(hk).length ? H.c('g', 'yes') : H.c('r', 'no')) + ' (HAVING COUNT(*) &gt;= 3).', parts: [
          { type: 'bars', label: 'streak lengths', values: groups.map(function (g) { return g.n; }), hl: hb, idxLabels: groups.map(function (g) { return g.s + '–' + g.e; }) },
          { type: 'vars', label: 'result', vals: { streaks: groups.length, longest: groups[best].n, has_3_in_a_row: Object.keys(hk).length ? 'yes' : 'no' }, hl: { longest: 'ok' } }
        ] });
        return frames;
      }
    },
    examples: [
      { title: 'Users with at least 3 consecutive login days', html: `<p>Same CTEs, then <code>HAVING COUNT(*) &gt;= 3</code> and <code>DISTINCT</code> users. Result: amy, cat, dan, eva, fin, lia. Eva's streak <b>Jan 30 → Feb 2</b> crosses a month boundary — date arithmetic handles it; comparing day-of-month numbers would not.</p>`,
        code: { lang: 'sql', db: 'app', code: `WITH days AS (SELECT DISTINCT user_id, date(login_ts) AS day FROM logins),
keyed AS (
  SELECT user_id, day,
         julianday(day) - ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY day) AS grp
  FROM days
)
SELECT DISTINCT u.name
FROM keyed k JOIN users u ON u.user_id = k.user_id
GROUP BY k.user_id, k.grp, u.name
HAVING COUNT(*) >= 3
ORDER BY u.name;` } },
      { title: 'Shortcut for a fixed K: LAG(day, K−1)', html: `<p>If the day two rows back is exactly 2 days earlier, the last 3 distinct days are consecutive. Great for "at least 3 in a row" — but it cannot tell you the streak <i>length</i>.</p>`,
        code: { lang: 'sql', db: 'app', code: `WITH days AS (SELECT DISTINCT user_id, date(login_ts) AS day FROM logins),
lagged AS (
  SELECT user_id, day,
         LAG(day, 2) OVER (PARTITION BY user_id ORDER BY day) AS two_back
  FROM days
)
SELECT DISTINCT user_id
FROM lagged
WHERE julianday(day) - julianday(two_back) = 2   -- 3 distinct days spanning exactly 2 days
ORDER BY user_id;` } },
      { title: 'Current streak as of a given date', html: `<p>A streak is "current" if it ends on the as-of date. As of 2024-03-23 only lia (user 12) has an active streak: 4 days (Mar 20–23). In production you usually also accept streaks ending <i>yesterday</i> (the user may still log in today).</p>`,
        code: { lang: 'sql', db: 'app', code: `WITH params(asof) AS (SELECT '2024-03-23'),
days AS (
  SELECT DISTINCT user_id, date(login_ts) AS day
  FROM logins, params
  WHERE date(login_ts) <= params.asof            -- ignore the future
),
keyed AS (
  SELECT user_id, day,
         julianday(day) - ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY day) AS grp
  FROM days
),
streaks AS (
  SELECT user_id, MAX(day) AS end_day, COUNT(*) AS len FROM keyed GROUP BY user_id, grp
)
SELECT s.user_id, s.len AS current_streak
FROM streaks s, params
WHERE s.end_day = params.asof;` } },
      { title: 'Why DISTINCT matters (see the bug)', html: `<p>Remove DISTINCT and Amy's double login on Jan 2 gives rn 2 and 3 to the same day: keys become Dec 31, Dec 31, ${H.c('r', 'Dec 30, Dec 30')}, ${H.c('r', 'Dec 31, Dec 31')}: her 3-day streak is split in two, and worse, Jan 5–6 now share a key with Jan 1–2, so GROUP BY would glue two different streaks together. Run this to see Amy's broken keys.</p>`,
        code: { lang: 'sql', db: 'app', code: `SELECT date(login_ts) AS day,
       ROW_NUMBER() OVER (ORDER BY login_ts) AS rn,
       date(date(login_ts), '-' || ROW_NUMBER() OVER (ORDER BY login_ts) || ' days') AS buggy_key
FROM logins
WHERE user_id = 1 AND login_ts < '2024-01-07';` } }
    ],
    deepDive: `<p><b>Why it is correct (one-line proof):</b> within a streak, consecutive rows satisfy day<sub>i+1</sub> = day<sub>i</sub> + 1 and rn<sub>i+1</sub> = rn<sub>i</sub> + 1, so day − rn is constant. Across a gap of g ≥ 1 missing days, day increases by g + 1 but rn by 1, so the key increases by g — strictly. Keys are therefore unique per streak and increasing, which also means you can ORDER BY the key to get streaks in time order.</p>
<p><b>Cost:</b> one sort per user (O(n log n)) plus a GROUP BY. The self-join alternative (<code>d2.day = d1.day + 1 AND d3.day = d1.day + 2</code>) hard-codes K, needs K−1 joins, and explodes for "longest streak". Recursive CTEs that walk day by day are O(n × streak length).</p>
<p><b>Dialect arithmetic:</b> PostgreSQL: <code>day - ROW_NUMBER() OVER (…) * INTERVAL '1 day'</code> or <code>day - rn::int</code> (date minus integer). SQL Server: <code>DATEADD(day, -rn, day)</code>. BigQuery: <code>DATE_SUB(day, INTERVAL rn DAY)</code>. SQLite: <code>date(day, '-' || rn || ' days')</code> or <code>julianday(day) - rn</code>.</p>
<p><b>Time zones:</b> "a day" is a local-calendar concept. A login at 23:59 in Mumbai is the next day in UTC. Convert to the user's time zone <b>before</b> <code>date()</code>, or streaks break at midnight UTC. Eva's 23:59 / 00:01 logins show how close the edge is.</p>
<p><b>Weekly/monthly streaks:</b> map each row to a sequential period number (e.g. <code>year*12 + month</code>, or days since epoch / 7) and apply the identical trick. <b>Grace days</b> ("one missed day allowed") break the simple trick — switch to the LAG + running-SUM island method from the next topic, with "gap &gt; 2 days starts a new streak".</p>`,
    aiEra: `<p><b>What AI changes:</b> the date − ROW_NUMBER trick is well known to models, so a correct first draft is likely. The bugs hide in the details: missing <code>DISTINCT</code> on days, date arithmetic in the wrong dialect, and time zones.</p>
<p><b>Use AI as a partner:</b> ask <code>Generate login data that breaks a streak query: duplicate logins per day, a streak crossing a month and a year boundary, a login at 23:59 and 00:01, a user with a single login</code>. Ask the model to explain, in two sentences, why day − row_number is constant inside a streak — if it cannot, do not trust its query.</p>
<p><b>Where AI goes wrong:</b> it often subtracts ROW_NUMBER from a <i>timestamp</i>, uses <code>DAY(date)</code> (day of month) which fails across months, or writes MySQL <code>DATE_SUB</code> in a Postgres answer.</p>
<p><b>What you must still own:</b> the proof of why the key works, the definition of "a day" (whose time zone?), and whether "current" includes yesterday. Those are product decisions, not code.</p>`,
    problems: [{
      title: 'Users Active 3+ Consecutive Days (with their best streak)', level: 'Medium', tags: ['gaps and islands', 'row_number', 'streaks'], companies: ['Meta', 'Duolingo', 'Spotify'],
      statement: `<p>Table <code>logins(user_id, login_ts)</code> stores every login (several per day possible). Return each user who logged in on <b>at least 3 consecutive calendar days</b> at some point, together with their <b>longest streak length</b> and the start date of that longest streak (earliest one if tied). Order by longest streak desc, then user_id.</p>`,
      constraints: `Up to 10<sup>7</sup> login rows; timestamps are UTC strings 'YYYY-MM-DD HH:MM:SS'; streaks may cross month/year boundaries.`,
      example: `<p>cat logs in Jan 2 → Jan 8 → ${H.c('g', 'longest 7, starting 2024-01-02')}. eva: Jan 28, ${H.c('b', 'Jan 30, 31, Feb 1, Feb 2')} → 4 starting 2024-01-30 (crosses a month). bob: Jan 3, 5, 7 → never 3 in a row → ${H.c('r', 'excluded')}.</p>`,
      brute: { why: `<p>A triple self-join finds day, day+1, day+2 — correct for "3 in a row" but it says nothing about the <i>longest</i> streak, needs one more join for every extra day of K, and multiplies rows (users with long streaks match many times, so you need DISTINCT). On 10<sup>7</sup> rows the joins are far more expensive than one sort.</p>`,
        code: { lang: 'sql', db: 'app', code: `WITH days AS (SELECT DISTINCT user_id, date(login_ts) AS day FROM logins)
SELECT DISTINCT d1.user_id
FROM days d1
JOIN days d2 ON d2.user_id = d1.user_id AND d2.day = date(d1.day, '+1 day')
JOIN days d3 ON d3.user_id = d1.user_id AND d3.day = date(d1.day, '+2 day')
ORDER BY d1.user_id;   -- only answers yes/no for K = 3` } },
      mcq: { q: 'Distinct login days 4, 5, 6, 9, 10. What are the keys (day − row_number)?', options: ['3, 3, 3, 5, 5', '4, 4, 4, 6, 6', '3, 3, 3, 6, 6', '1, 1, 1, 2, 2'], answer: 0, explain: 'rn = 1..5, so keys are 4−1, 5−2, 6−3, 9−4, 10−5 = 3, 3, 3, 5, 5: two streaks of lengths 3 and 2.' },
      hints: [
        `<p>Hint 1: inside a streak, both the date and its row number go up by one — so their difference is constant.</p>`,
        `<p>Hint 2: CTEs: distinct days → key = <code>julianday(day) − ROW_NUMBER()</code> → GROUP BY (user, key) for start/len.</p>`,
        `<p>Hint 3: to pick the longest streak <i>and</i> its start, rank the streaks per user with <code>ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY len DESC, start)</code> and keep rn = 1 where len ≥ 3.</p>`
      ],
      tests: { engine: 'sqlite', check: '(rows, cols, c) => {\n  if (c.plan || c.noplan) { const d = rows.map(r => r[r.length - 1]).join(\'\\n\'); return (!c.plan || new RegExp(c.plan).test(d)) && (!c.noplan || !new RegExp(c.noplan).test(d)); }\n  let a = rows, b = c.rows || [];\n  if (c.set) { const k = r => JSON.stringify(r); a = a.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); b = b.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); }\n  return a.length === b.length && a.every((r, i) => r.length === b[i].length && r.every((v, j) => v === b[i][j] || (typeof v === \'number\' && typeof b[i][j] === \'number\' && Math.abs(v - b[i][j]) < 1e-6)));\n}', cases: [
        { rows: [
            [3, 7, '2024-01-02'],
            [1, 4, '2024-01-08'],
            [5, 4, '2024-01-30'],
            [12, 4, '2024-03-20'],
            [4, 3, '2024-01-10'],
            [6, 3, '2024-02-02']
          ] },
        { setup: 'INSERT INTO logins VALUES (2,\'2023-12-30 10:00:00\'),(2,\'2023-12-31 10:00:00\'),(2,\'2024-01-01 10:00:00\')', rows: [
            [3, 7, '2024-01-02'],
            [1, 4, '2024-01-08'],
            [5, 4, '2024-01-30'],
            [12, 4, '2024-03-20'],
            [2, 3, '2023-12-30'],
            [4, 3, '2024-01-10'],
            [6, 3, '2024-02-02']
          ] },
        { setup: 'DELETE FROM logins', rows: [] },
        { setup: 'DELETE FROM logins WHERE user_id <> 3', rows: [
            [3, 7, '2024-01-02']
          ] },
        { setup: 'INSERT INTO logins VALUES (8,\'2024-03-01 10:00:00\'),(8,\'2024-03-01 11:00:00\'),(8,\'2024-03-02 10:00:00\')', rows: [
            [3, 7, '2024-01-02'],
            [1, 4, '2024-01-08'],
            [5, 4, '2024-01-30'],
            [12, 4, '2024-03-20'],
            [4, 3, '2024-01-10'],
            [6, 3, '2024-02-02']
          ] },
        { setup: 'INSERT INTO logins VALUES (8,\'2024-03-01 10:00:00\'),(8,\'2024-03-02 10:00:00\'),(8,\'2024-03-03 10:00:00\'),(9,\'2024-05-30 10:00:00\'),(9,\'2024-05-31 10:00:00\'),(9,\'2024-06-01 10:00:00\'),(9,\'2024-06-02 10:00:00\')', rows: [
            [3, 7, '2024-01-02'],
            [1, 4, '2024-01-08'],
            [5, 4, '2024-01-30'],
            [9, 4, '2024-05-30'],
            [12, 4, '2024-03-20'],
            [4, 3, '2024-01-10'],
            [6, 3, '2024-02-02'],
            [8, 3, '2024-03-01']
          ] },
        { setup: 'INSERT INTO logins VALUES (2,\'2024-01-04 12:00:00\'),(2,\'2024-01-06 12:00:00\')', rows: [
            [3, 7, '2024-01-02'],
            [2, 5, '2024-01-03'],
            [1, 4, '2024-01-08'],
            [5, 4, '2024-01-30'],
            [12, 4, '2024-03-20'],
            [4, 3, '2024-01-10'],
            [6, 3, '2024-02-02']
          ] },
        { setup: 'INSERT INTO logins VALUES (1,\'2024-02-02 09:00:00\')', rows: [
            [3, 7, '2024-01-02'],
            [1, 4, '2024-01-08'],
            [5, 4, '2024-01-30'],
            [12, 4, '2024-03-20'],
            [4, 3, '2024-01-10'],
            [6, 3, '2024-02-02']
          ] },
        { setup: 'INSERT INTO logins VALUES (11,\'2024-03-09 10:00:00\'),(11,\'2024-03-10 10:00:00\'),(12,\'2024-03-24 21:00:00\'),(12,\'2024-03-25 21:00:00\')', rows: [
            [3, 7, '2024-01-02'],
            [12, 6, '2024-03-20'],
            [1, 4, '2024-01-08'],
            [5, 4, '2024-01-30'],
            [4, 3, '2024-01-10'],
            [6, 3, '2024-02-02'],
            [11, 3, '2024-03-08']
          ] }
      ] },
      solution: {
        approach: `<p>Gaps-and-islands on dates: distinct days, key = day − rn, aggregate streaks, then a top-1-per-user over the streaks (topic 2 pattern) filtered to length ≥ 3.</p>`,
        code: { lang: 'sql', db: 'app', code: `WITH days AS (
  SELECT DISTINCT user_id, date(login_ts) AS day FROM logins
),
keyed AS (
  SELECT user_id, day,
         julianday(day) - ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY day) AS grp
  FROM days
),
streaks AS (
  SELECT user_id, MIN(day) AS start_day, COUNT(*) AS len
  FROM keyed
  GROUP BY user_id, grp
),
best AS (
  SELECT user_id, start_day, len,
         ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY len DESC, start_day) AS rn
  FROM streaks
)
SELECT user_id, len AS longest_streak, start_day
FROM best
WHERE rn = 1 AND len >= 3
ORDER BY longest_streak DESC, user_id;` },
        dry: { head: ['user', 'streaks found', 'best', 'kept'], rows: [['1 amy', '3, 2, 4, 2, 1, 1', '4 from 2024-01-08', 'yes'], ['2 bob', '1, 1, 1, 1', '1', H.c('r', 'no')], ['3 cat', '7, 2, 1', '7 from 2024-01-02', 'yes'], ['5 eva', '1, 4, 1', '4 from 2024-01-30', 'yes']] },
        complexity: `<p>O(n log n) for the per-user sort of distinct days, O(n) for grouping. One pass over the data regardless of K.</p>`,
        followUps: ['Allow one missed day ("grace day") inside a streak.', 'Compute the streak in each user’s local time zone.', 'Return, for each day, how many users are currently on a 7+ day streak.']
      }
    }]
  });

  /* =====================================================================
     TOPIC 4 — Gaps & islands
     ===================================================================== */
  topics.push({
    title: 'Gaps & Islands (ranges, missing values, status runs, merged intervals)',
    analogy: `<p>Look at a <b>row of seats in a cinema</b>: some taken, some free. The blocks of taken seats are <b>islands</b>; the empty stretches between them are <b>gaps</b>. Every gaps-and-islands question is just "describe the blocks" — where each block starts, where it ends, how long it is — or "describe the holes between them".</p>`,
    explain: `<p><b>What counts as an island?</b> A maximal run of rows that "belong together" when sorted: consecutive ids (1, 2, 3), consecutive dates (that was the streak topic), equal status values in a row (up, up, up), or time intervals that overlap. There are <b>two master techniques</b>; every variant uses one of them.</p>
<p><b>Technique A — the difference of row numbers</b> (when values step by exactly 1). <code>value − ROW_NUMBER() OVER (ORDER BY value)</code> is constant inside a run. Ticket ids 1, 2, 3, 6, 7, 10:</p>
${H.table(['ticket_id', 'rn', 'id − rn = island id'], [['1', '1', H.c('b', '0')], ['2', '2', H.c('b', '0')], ['3', '3', H.c('b', '0')], ['6', '4', H.c('p', '2')], ['7', '5', H.c('p', '2')], ['10', '6', H.c('g', '4')]])}
<p>Group by the island id → ranges 1–3, 6–7, 10.</p>
<p>For <b>runs of equal values</b> (status up/down), use the two-ROW_NUMBER version: <code>ROW_NUMBER() OVER (ORDER BY t) − ROW_NUMBER() OVER (PARTITION BY status ORDER BY t)</code>. Within a run both counters advance together, so the difference is constant; group by <code>(status, difference)</code>.</p>
<p><b>Technique B — flag and running sum</b> (works for everything, including fuzzy rules like "gap &gt; 30 min" or overlapping intervals):</p>
<ol>
<li><code>LAG()</code> to look at the previous row.</li>
<li>Flag = 1 when this row <b>starts a new island</b> (status changed, or gap too big, or no overlap), else 0.</li>
<li><code>SUM(flag) OVER (ORDER BY …)</code> — a running total — numbers the islands 1, 2, 3…</li>
<li><code>GROUP BY</code> that number.</li>
</ol>
<p><b>Gaps</b> are the mirror image: <code>LEAD(id)</code> gives the next value; if <code>next − id &gt; 1</code> the missing range is <code>id + 1 … next − 1</code>. To list every single missing number, generate the full series with a recursive CTE and anti-join.</p>
<p><b>Interval merging</b> ("merge overlapping meetings", "total busy time") is Technique B where "new island" means <i>this start is after the latest end seen so far</i>: <code>start &gt; MAX(end) OVER (… ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING)</code>.</p>`,
    clues: [
      '"continuous ranges", "consecutive ids", "find the start and end of each run" → value − ROW_NUMBER island id',
      '"missing ids", "gaps in the sequence", "which invoice numbers are missing" → LEAD(id) − id &gt; 1, or recursive series + anti-join',
      '"how long was each outage", "periods where status stayed the same" → change flag + running SUM (or two ROW_NUMBERs)',
      '"three or more consecutive rows with X ≥ 100" (stadium) → filter first, then id − rn, keep islands with COUNT ≥ 3',
      '"merge overlapping intervals", "total time the room was booked" → running MAX(end) + new-island flag',
      '"same number appears at least 3 times consecutively" → LAG/LEAD or two-ROW_NUMBER difference'
    ],
    code: [{
      lang: 'sql', db: 'shop', title: 'Islands of consecutive ticket ids + the gaps between them',
      code: `-- Islands: id minus its position is constant inside a run.
SELECT MIN(ticket_id) AS range_start,
       MAX(ticket_id) AS range_end,
       COUNT(*)       AS size
FROM (SELECT ticket_id,
             ticket_id - ROW_NUMBER() OVER (ORDER BY ticket_id) AS island
      FROM tickets)
GROUP BY island
ORDER BY range_start;

-- Gaps: look one row ahead; a jump bigger than 1 hides missing ids.
SELECT ticket_id + 1 AS gap_start,
       next_id   - 1 AS gap_end
FROM (SELECT ticket_id,
             LEAD(ticket_id) OVER (ORDER BY ticket_id) AS next_id
      FROM tickets)
WHERE next_id - ticket_id > 1;`
    }, {
      lang: 'sql', db: 'shop', title: 'Status runs (outages) with flag + running sum',
      code: `WITH flagged AS (
  SELECT check_time, status,
         CASE WHEN status = LAG(status) OVER (ORDER BY check_time)
              THEN 0 ELSE 1 END AS new_run          -- 1 = status changed (or first row)
  FROM server_checks
),
numbered AS (
  SELECT *, SUM(new_run) OVER (ORDER BY check_time) AS run_id   -- running total = island number
  FROM flagged
)
SELECT run_id, status,
       MIN(check_time) AS run_start,
       MAX(check_time) AS last_check,
       COUNT(*)        AS checks
FROM numbered
GROUP BY run_id, status
ORDER BY run_id;`
    }],
    codeTitle: ['Islands and gaps of ids', 'Status runs'],
    viz: [{
      title: 'Islands with the id − ROW_NUMBER trick, then the gaps via LEAD',
      input: '1 2 3 6 7 10 11 12 15 16 20',
      inputLabel: 'Distinct ids (space separated)',
      gen: function (input) {
        var a = nums(input, 'Enter whole numbers separated by spaces', 16);
        a = a.slice().sort(function (x, y) { return x - y; }).filter(function (v, i, s) { return i === 0 || v !== s[i - 1]; });
        if (a.length < 2) throw new Error('Enter at least 2 different ids');
        var frames = [];
        frames.push({ narr: 'Sorted distinct ids. Islands = runs of consecutive numbers; gaps = the numbers missing between them.', parts: [
          { type: 'array', label: 'ticket_id', values: a.slice(), showIdx: false } ] });
        var rows = [], cls = ['win', 'sel', 'ok', 'cur'], hl = {}, isl = -1;
        for (var i = 0; i < a.length; i++) {
          var key = a[i] - (i + 1);
          if (i === 0 || key !== rows[i - 1][2]) isl++;
          rows.push([a[i], i + 1, key]);
          hl[i] = cls[isl % 4];
          var h = span(0, i - 1, 'done'); h[i] = 'cur';
          frames.push({ narr: 'id <b>' + a[i] + '</b>, row number <b>' + (i + 1) + '</b> → island id = ' + a[i] + ' − ' + (i + 1) + ' = <b>' + key + '</b>' + (i === 0 ? '.' : key === rows[i - 1][2] ? ' — ' + H.c('g', 'same as above, still the same island.') : ' — ' + H.c('r', 'changed: ' + (a[i] - a[i - 1] - 1) + ' id(s) missing, new island.')), parts: [
            { type: 'table', label: 'id − ROW_NUMBER()', columns: ['ticket_id', 'rn', 'island id'], rows: copyRows(rows), hl: h } ] });
        }
        frames.push({ narr: 'Coloured by island id. <code>GROUP BY island</code> collapses each colour into one range.', parts: [
          { type: 'table', label: 'grouped by colour', columns: ['ticket_id', 'rn', 'island id'], rows: copyRows(rows), hl: hl } ] });
        var islands = [];
        rows.forEach(function (r) { var l = islands[islands.length - 1]; if (!l || l[3] !== r[2]) islands.push([r[0], r[0], 1, r[2]]); else { l[1] = r[0]; l[2]++; } });
        frames.push({ narr: '<b>' + islands.length + ' islands</b>: MIN(id) = start, MAX(id) = end, COUNT(*) = size.', parts: [
          { type: 'table', label: 'islands', columns: ['range_start', 'range_end', 'size', 'island id'], rows: islands.map(function (x) { return x.slice(); }), hl: span(0, islands.length - 1, 'ok') },
          { type: 'bars', label: 'island sizes', values: islands.map(function (x) { return x[2]; }), idxLabels: islands.map(function (x) { return x[0] + '–' + x[1]; }) } ] });
        var lrows = [], gaps = [], gh = {};
        for (i = 0; i < a.length; i++) {
          var nx = i + 1 < a.length ? a[i + 1] : 'NULL';
          var isGap = nx !== 'NULL' && nx - a[i] > 1;
          lrows.push([a[i], nx, nx === 'NULL' ? '—' : nx - a[i], isGap ? (a[i] + 1) + '–' + (nx - 1) : '']);
          if (isGap) { gh[i] = 'bad'; gaps.push([a[i] + 1, nx - 1, nx - a[i] - 1]); }
        }
        frames.push({ narr: 'Gaps: <code>LEAD(ticket_id)</code> peeks at the next id. Where <code>next − id &gt; 1</code> (red) the numbers in between are missing.', parts: [
          { type: 'table', label: 'LEAD to find gaps', columns: ['ticket_id', 'next_id', 'jump', 'missing range'], rows: lrows, hl: gh } ] });
        frames.push({ narr: gaps.length ? '<b>' + gaps.length + ' gap(s)</b> found. Islands and gaps alternate: island, gap, island, gap, … island.' : 'No gaps: the ids form one solid island.', parts: [
          { type: 'table', label: 'gaps', columns: ['gap_start', 'gap_end', 'missing count'], rows: gaps.length ? gaps : [['—', '—', 0]], hl: span(0, gaps.length - 1, 'bad') } ] });
        return frames;
      }
    }, {
      title: 'Status islands: change flag + running SUM',
      input: 'up up down down down up up down up up up',
      inputLabel: 'Status per 5-minute check (words)',
      gen: function (input) {
        var s = String(input).trim().split(/[\s,]+/).filter(Boolean);
        if (s.length < 2 || s.length > 16) throw new Error('Enter 2 to 16 status words, e.g. up up down');
        var t0 = 600, frames = [], rows = [];
        frames.push({ narr: 'One health check every 5 minutes. Goal: one row per <b>run</b> of the same status (e.g. each outage with its start and length).', parts: [
          { type: 'table', label: 'server_checks', columns: ['check_time', 'status'], rows: s.map(function (v, i) { return [fmtHM(t0 + 5 * i), v]; }) } ] });
        var sum = 0;
        for (var i = 0; i < s.length; i++) {
          var prev = i ? s[i - 1] : 'NULL', flag = (i === 0 || s[i] !== s[i - 1]) ? 1 : 0;
          sum += flag;
          rows.push([fmtHM(t0 + 5 * i), s[i], prev, flag, sum]);
          var h = span(0, i - 1, 'done'); h[i] = flag ? 'bad' : 'cur';
          frames.push({ narr: fmtHM(t0 + 5 * i) + ': status <b>' + s[i] + '</b>, previous (LAG) = ' + prev + '. ' + (flag ? H.c('r', 'Different → flag 1, a new run starts') : H.c('g', 'Same → flag 0, run continues')) + '. Running SUM(flag) = run_id <b>' + sum + '</b>.', parts: [
            { type: 'table', label: 'LAG, flag, running SUM', columns: ['check_time', 'status', 'LAG(status)', 'new_run', 'run_id'], rows: copyRows(rows), hl: h } ] });
        }
        var runs = [];
        rows.forEach(function (r) { var l = runs[runs.length - 1]; if (!l || l[0] !== r[4]) runs.push([r[4], r[1], r[0], r[0], 1]); else { l[3] = r[0]; l[4]++; } });
        var rh = {}; runs.forEach(function (r, k) { rh[k] = r[1] === 'down' ? 'bad' : 'ok'; });
        frames.push({ narr: '<code>GROUP BY run_id, status</code>: each run is one row. Down runs are outages (red); duration ≈ checks × 5 minutes.', parts: [
          { type: 'table', label: 'runs', columns: ['run_id', 'status', 'start', 'last check', 'checks'], rows: runs, hl: rh },
          { type: 'bars', label: 'run lengths (checks)', values: runs.map(function (r) { return r[4]; }), hl: rh, idxLabels: runs.map(function (r) { return r[1]; }) } ] });
        return frames;
      }
    }],
    examples: [
      { title: 'Stadium: 3+ consecutive ids with ≥ 100 people', html: `<p>LeetCode 601. Filter first (people ≥ 100), then apply id − rn on the survivors: ids 2, 3 form an island of 2 (too short); 5, 6, 7, 8 form an island of 4 → returned. Note id 8 is on 2017-01-09 — the rule is consecutive <b>ids</b>, not dates.</p>`,
        code: { lang: 'sql', db: 'shop', code: `WITH busy AS (
  SELECT id, visit_date, people,
         id - ROW_NUMBER() OVER (ORDER BY id) AS island
  FROM stadium
  WHERE people >= 100                 -- filter BEFORE numbering
)
SELECT id, visit_date, people
FROM busy
WHERE island IN (SELECT island FROM busy GROUP BY island HAVING COUNT(*) >= 3)
ORDER BY visit_date;` } },
      { title: 'Runs of equal values with two ROW_NUMBERs', html: `<p>No LAG needed: the overall row number minus the per-status row number is constant inside a run. Group by <b>both</b> status and the difference — the same difference value can appear for an "up" run and a "down" run.</p>`,
        code: { lang: 'sql', db: 'shop', code: `WITH g AS (
  SELECT check_time, status,
         ROW_NUMBER() OVER (ORDER BY check_time)
       - ROW_NUMBER() OVER (PARTITION BY status ORDER BY check_time) AS grp
  FROM server_checks
)
SELECT status, MIN(check_time) AS run_start, MAX(check_time) AS last_check, COUNT(*) AS checks
FROM g
GROUP BY status, grp
ORDER BY run_start;` } },
      { title: 'Merge overlapping meetings per room', html: `<p>Sort by start. A meeting starts a new merged block only if it begins after the latest end seen so far in that room (a running MAX over the <i>previous</i> rows). Room A: 09:00–10:00, 09:30–10:30, 10:30–11:00 chain into ${H.c('g', '09:00–11:00')}; 13:00–14:00 swallows 13:15–13:45.</p>`,
        code: { lang: 'sql', db: 'shop', code: `WITH m AS (
  SELECT room, start_time, end_time,
         MAX(end_time) OVER (PARTITION BY room ORDER BY start_time, end_time
                             ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING) AS max_end_before
  FROM meetings
),
f AS (
  SELECT *, CASE WHEN max_end_before IS NULL OR start_time > max_end_before
                 THEN 1 ELSE 0 END AS new_block       -- touching (10:30 = 10:30) merges
  FROM m
),
g AS (
  SELECT *, SUM(new_block) OVER (PARTITION BY room ORDER BY start_time, end_time) AS block
  FROM f
)
SELECT room, MIN(start_time) AS busy_from, MAX(end_time) AS busy_to
FROM g
GROUP BY room, block
ORDER BY room, busy_from;` } },
      { title: 'List every missing id with a recursive number series', html: `<p>When the question wants each missing value on its own row, generate 1..MAX with a recursive CTE and anti-join. Fine for thousands of ids; for millions prefer the LEAD ranges above.</p>`,
        code: { lang: 'sql', db: 'shop', code: `WITH RECURSIVE series(n) AS (
  SELECT 1
  UNION ALL
  SELECT n + 1 FROM series WHERE n < (SELECT MAX(ticket_id) FROM tickets)
)
SELECT n AS missing_id
FROM series
WHERE NOT EXISTS (SELECT 1 FROM tickets t WHERE t.ticket_id = series.n);` } }
    ],
    deepDive: `<p><b>Which technique when?</b> Difference-of-row-numbers needs a value that steps by exactly 1 inside a run (integers, dates) or a "same value" rule. Flag + running sum handles <i>any</i> rule you can express by comparing a row with its neighbour(s): time gaps, thresholds, overlaps, "price changed by &gt; 5%". It costs one extra window pass but is the universal tool.</p>
<p><b>Duplicates break technique A.</b> If an id appears twice, ROW_NUMBER advances without the value advancing and the island splits. Use <code>DENSE_RANK</code> instead of ROW_NUMBER (equal values get equal numbers), or DISTINCT first.</p>
<p><b>Running SUM default frame.</b> <code>SUM(x) OVER (ORDER BY t)</code> defaults to <code>RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW</code> — rows with the <i>same</i> t are peers and get the same sum. If t is not unique, add a tie-breaker or use <code>ROWS</code>, or two rows at the same timestamp may receive a confusing island number.</p>
<p><b>Interval merging subtlety.</b> Comparing with only the <i>previous</i> row's end (LAG) is wrong: a long meeting 09:00–12:00 followed by 09:30–10:00 and 11:00–11:30 — the third overlaps the first but not the second. The running MAX of all previous ends fixes it. Whether touching intervals (end = next start) merge is a business rule: use <code>&gt;</code> to merge them, <code>&gt;=</code> to keep them separate.</p>
<p><b>Scale:</b> each technique is one or two sorts — O(n log n). Indexes on the ordering column let the engine stream rows in order. On distributed engines, partition by entity (user, device, room) so islands are computed in parallel; a global ORDER BY over billions of rows funnels into a single worker.</p>`,
    aiEra: `<p><b>What AI changes:</b> describe the shape ("collapse consecutive rows with the same status into periods") and a model will usually reach for the right technique. It is far less reliable on the boundary rules: touching intervals, duplicate values, ties on the ORDER BY column, the first row's NULL from LAG.</p>
<p><b>Use AI as a partner:</b> ask it to <code>enumerate edge cases for merging intervals: nested, touching, identical, single-row, unsorted input</code>, and to build a tiny test table for each. Ask it to rewrite your LAG version as the two-ROW_NUMBER version — if both agree on all edge cases, you can trust the result.</p>
<p><b>Where AI goes wrong:</b> merging intervals with LAG(end) instead of a running MAX, forgetting PARTITION BY room, writing <code>WHERE LAG(...)</code> (illegal), or using <code>generate_series</code> (Postgres-only) in a SQLite answer.</p>
<p><b>What you must still own:</b> naming the island rule in one sentence before you code ("new island when status differs from the previous check"), and checking it on the first row, ties and duplicates.</p>`,
    problems: [{
      title: 'Start and End of Continuous Ranges', level: 'Medium', tags: ['gaps and islands', 'row_number'], companies: ['Microsoft', 'Uber', 'Oracle'],
      statement: `<p>Table <code>tickets(ticket_id)</code> holds distinct positive integers. Return the <b>start and end of every continuous range</b> of ids (a single isolated id is a range where start = end), ordered by start. Then, as a second query, report the <b>missing ranges</b> between the minimum and maximum id.</p>`,
      constraints: `Up to 10<sup>6</sup> ids; ids are distinct but not contiguous; single-element ranges allowed.`,
      example: `<p>ids 1, 2, 3, 6, 7, 10, 11, 12, 15, 16, 20 → ranges ${H.c('g', '1–3, 6–7, 10–12, 15–16, 20–20')}; missing ${H.c('r', '4–5, 8–9, 13–14, 17–19')}.</p>`,
      brute: { why: `<p>Find range starts as "ids whose id − 1 does not exist", and for each start find the end with a correlated subquery: the smallest id ≥ start whose id + 1 does not exist. Correct, but every start triggers a scan (or index probes) — O(n²) without an index, and three nested lookups per row even with one.</p>`,
        code: { lang: 'sql', db: 'shop', code: `SELECT s.ticket_id AS range_start,
       (SELECT MIN(e.ticket_id) FROM tickets e
        WHERE e.ticket_id >= s.ticket_id
          AND NOT EXISTS (SELECT 1 FROM tickets x WHERE x.ticket_id = e.ticket_id + 1)) AS range_end
FROM tickets s
WHERE NOT EXISTS (SELECT 1 FROM tickets p WHERE p.ticket_id = s.ticket_id - 1)
ORDER BY range_start;` } },
      mcq: { q: 'ids 4, 5, 9, 10, 11. What is id − ROW_NUMBER() for each?', options: ['3, 3, 6, 6, 6', '4, 4, 9, 9, 9', '0, 0, 1, 1, 1', '3, 3, 7, 7, 7'], answer: 0, explain: 'rn is 1..5: 4−1=3, 5−2=3, 9−3=6, 10−4=6, 11−5=6. Two islands: 4–5 and 9–11.' },
      hints: [
        `<p>Hint 1: in a run of consecutive integers, id and its row number climb together.</p>`,
        `<p>Hint 2: subquery computes <code>ticket_id − ROW_NUMBER() OVER (ORDER BY ticket_id)</code>; outer query GROUP BY that key with MIN/MAX.</p>`,
        `<p>Hint 3: for gaps use <code>LEAD(ticket_id)</code>; when the jump is more than 1, report <code>id + 1</code> to <code>next − 1</code>. The last row's LEAD is NULL and is filtered out naturally.</p>`
      ],
      tests: { engine: 'sqlite', check: '(rows, cols, c) => {\n  if (c.plan || c.noplan) { const d = rows.map(r => r[r.length - 1]).join(\'\\n\'); return (!c.plan || new RegExp(c.plan).test(d)) && (!c.noplan || !new RegExp(c.noplan).test(d)); }\n  let a = rows, b = c.rows || [];\n  if (c.set) { const k = r => JSON.stringify(r); a = a.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); b = b.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); }\n  return a.length === b.length && a.every((r, i) => r.length === b[i].length && r.every((v, j) => v === b[i][j] || (typeof v === \'number\' && typeof b[i][j] === \'number\' && Math.abs(v - b[i][j]) < 1e-6)));\n}', cases: [
        { setup: '', rows: [
            [1, 3],
            [6, 7],
            [10, 12],
            [15, 16],
            [20, 20]
          ], result: 0 },
        { setup: '', rows: [
            [4, 5],
            [8, 9],
            [13, 14],
            [17, 19]
          ] },
        { setup: 'DELETE FROM tickets; INSERT INTO tickets VALUES (5)', rows: [
            [5, 5]
          ], result: 0 },
        { setup: 'DELETE FROM tickets; INSERT INTO tickets VALUES (5)', rows: [
            [0]
          ], after: 'SELECT count(*) FROM (SELECT ticket_id + 1 AS missing_from, next_id - 1 AS missing_to FROM (SELECT ticket_id, LEAD(ticket_id) OVER (ORDER BY ticket_id) AS next_id FROM tickets) WHERE next_id - ticket_id > 1)' },
        { setup: 'DELETE FROM tickets; INSERT INTO tickets VALUES (1),(2),(3)', rows: [
            [1, 3]
          ], result: 0 },
        { setup: 'DELETE FROM tickets; INSERT INTO tickets VALUES (1),(2),(3)', rows: [
            [0]
          ], after: 'SELECT count(*) FROM (SELECT ticket_id + 1 AS missing_from, next_id - 1 AS missing_to FROM (SELECT ticket_id, LEAD(ticket_id) OVER (ORDER BY ticket_id) AS next_id FROM tickets) WHERE next_id - ticket_id > 1)' },
        { setup: 'DELETE FROM tickets; INSERT INTO tickets VALUES (1),(3),(5)', rows: [
            [1, 1],
            [3, 3],
            [5, 5]
          ], result: 0 },
        { setup: 'DELETE FROM tickets; INSERT INTO tickets VALUES (1),(3),(5)', rows: [
            [2, 2],
            [4, 4]
          ] },
        { setup: 'DELETE FROM tickets; INSERT INTO tickets VALUES (10),(11),(12),(13),(14),(15)', rows: [
            [10, 15]
          ], result: 0 },
        { setup: 'DELETE FROM tickets; INSERT INTO tickets VALUES (10),(11),(12),(13),(14),(15)', rows: [
            [0]
          ], after: 'SELECT count(*) FROM (SELECT ticket_id + 1 AS missing_from, next_id - 1 AS missing_to FROM (SELECT ticket_id, LEAD(ticket_id) OVER (ORDER BY ticket_id) AS next_id FROM tickets) WHERE next_id - ticket_id > 1)' },
        { setup: 'DELETE FROM tickets; INSERT INTO tickets VALUES (100),(1),(50),(2),(51),(3)', rows: [
            [1, 3],
            [50, 51],
            [100, 100]
          ], result: 0 },
        { setup: 'DELETE FROM tickets; INSERT INTO tickets VALUES (100),(1),(50),(2),(51),(3)', rows: [
            [4, 49],
            [52, 99]
          ] },
        { setup: 'DELETE FROM tickets; INSERT INTO tickets VALUES (1),(2),(4),(5),(7),(8),(9),(20)', rows: [
            [1, 2],
            [4, 5],
            [7, 9],
            [20, 20]
          ], result: 0 },
        { setup: 'DELETE FROM tickets; INSERT INTO tickets VALUES (1),(2),(4),(5),(7),(8),(9),(20)', rows: [
            [3, 3],
            [6, 6],
            [10, 19]
          ] }
      ] },
      solution: {
        approach: `<p>Technique A for islands (one sort, one GROUP BY) and a LEAD scan for gaps. Both are single passes over the sorted ids.</p>`,
        code: { lang: 'sql', db: 'shop', code: `-- Ranges
SELECT MIN(ticket_id) AS range_start, MAX(ticket_id) AS range_end
FROM (SELECT ticket_id, ticket_id - ROW_NUMBER() OVER (ORDER BY ticket_id) AS island
      FROM tickets)
GROUP BY island
ORDER BY range_start;

-- Missing ranges
SELECT ticket_id + 1 AS missing_from, next_id - 1 AS missing_to
FROM (SELECT ticket_id, LEAD(ticket_id) OVER (ORDER BY ticket_id) AS next_id FROM tickets)
WHERE next_id - ticket_id > 1
ORDER BY missing_from;` },
        dry: { head: ['ticket_id', 'rn', 'island', 'next_id'], rows: [['1', '1', '0', '2'], ['3', '3', '0', H.c('r', '6 → gap 4–5')], ['6', '4', '2', '7'], ['12', '8', '4', H.c('r', '15 → gap 13–14')], ['20', '11', '9', 'NULL']] },
        complexity: `<p>O(n log n) sort (O(n) if the primary key index already gives sorted order), O(n) memory for the window; the gap query is a single ordered scan.</p>`,
        followUps: ['Print ranges as text like "1-3, 6-7, 20" in one row (GROUP_CONCAT).', 'Ids may contain duplicates — what changes?', 'Find the largest gap and how many ids it is missing.']
      }
    }]
  });

  /* =====================================================================
     TOPIC 5 — Sessionization
     ===================================================================== */
  topics.push({
    title: 'Sessionization (inactivity timeout → session ids)',
    analogy: `<p>A <b>café loyalty card</b>: you sit, order coffee, then a sandwich 10 minutes later, then cake 20 minutes after that — one <b>visit</b>. If you leave and come back two hours later, the waiter starts a <b>new bill</b>. Nobody tells the café "I'm leaving"; the waiter just decides that a long enough silence means the visit is over. Web analytics works the same way: a session ends after N minutes of inactivity (classically 30).</p>`,
    explain: `<p><b>The question:</b> "Given a clickstream <code>events(user_id, event_time, …)</code>, assign a session id to every event, where a new session starts after more than 30 minutes of inactivity. Then report sessions per user, average session length, bounce rate…"</p>
<p>This is gaps-and-islands Technique B (flag + running sum) with a time rule. Four steps:</p>
<ol>
<li><b>Previous event</b> for the same user: <code>LAG(event_time) OVER (PARTITION BY user_id ORDER BY event_time)</code>.</li>
<li><b>Gap</b> in seconds: <code>strftime('%s', event_time) − strftime('%s', prev_time)</code> (integer seconds since 1970 in SQLite).</li>
<li><b>Flag</b> <code>new_session = 1</code> if there is no previous event or the gap is &gt; 1800 s; else 0.</li>
<li><b>Session number</b> = running <code>SUM(new_session) OVER (PARTITION BY user_id ORDER BY event_time)</code>.</li>
</ol>
<p>amy (user 1) on 2024-03-01:</p>
${H.table(['event_time', 'gap (min)', 'new_session', 'session_no'], [['09:00', '—', H.c('r', '1'), '1'], ['09:05', '5', '0', '1'], ['09:20', '15', '0', '1'], ['10:10', H.c('r', '50'), H.c('r', '1'), '2'], ['10:15', '5', '0', '2'], ['11:00', H.c('r', '45'), H.c('r', '1'), '3']])}
<p><b>Important nuance:</b> the timeout is about <b>silence between events</b>, not total length. bob's events at 09:00, 09:29, 09:58 are each 29 minutes apart, so they form <b>one 58-minute session</b>, even though the first and last are 58 minutes apart. If the business also wants a maximum session length (GA4 also splits at midnight / campaign change), that needs extra rules.</p>
<p>Once each event has <code>(user_id, session_no)</code>, everything else is a normal <code>GROUP BY</code>: start = MIN(time), end = MAX(time), duration = end − start, events per session, bounce = sessions with exactly one event.</p>`,
    clues: [
      '"session", "visit", "a new session starts after 30 minutes of inactivity" → LAG + gap flag + running SUM',
      '"clickstream", "page views with timestamps", "assign a session_id to each event" → sessionization',
      '"average session duration", "sessions per user", "bounce rate" → sessionize first, then GROUP BY session',
      '"time between consecutive events" → LAG(event_time) partitioned by user',
      '"trips / rides / bursts separated by idle time" → same pattern with a different threshold',
      '"exactly 30 minutes" in the statement → watch &gt; vs ≥ and use integer seconds, not floating-point days'
    ],
    code: {
      lang: 'sql', db: 'app', title: 'Assign session numbers with a 30-minute inactivity timeout',
      code: `WITH ordered AS (
  SELECT user_id, event_id, event_time, event_name,
         LAG(event_time) OVER (PARTITION BY user_id
                               ORDER BY event_time, event_id) AS prev_time   -- previous click of the same user
  FROM events
),
flagged AS (
  SELECT *,
         CASE WHEN prev_time IS NULL                                          -- user's first event ever
                OR strftime('%s', event_time) - strftime('%s', prev_time) > 30 * 60
              THEN 1 ELSE 0 END AS new_session                                -- silence > 30 min
  FROM ordered
)
SELECT user_id, event_time, event_name,
       (strftime('%s', event_time) - strftime('%s', prev_time)) / 60 AS gap_min,
       new_session,
       SUM(new_session) OVER (PARTITION BY user_id
                              ORDER BY event_time, event_id) AS session_no     -- running count of starts
FROM flagged
ORDER BY user_id, event_time;`
    },
    codeTitle: 'Sessionize the clickstream',
    viz: {
      title: 'Sessionization: gaps above the timeout start a new session',
      input: '09:00 09:05 09:20 10:10 10:15 11:00 | 30',
      inputLabel: 'Event times (HH:MM, one user), then | timeout minutes',
      gen: function (input) {
        var b = String(input).split('|');
        if (b.length !== 2) throw new Error('Format: 09:00 09:05 10:10 | 30');
        var to = Number(b[1]);
        if (!(to > 0 && to <= 600)) throw new Error('Timeout must be 1..600 minutes');
        var ts = b[0].trim().split(/[\s,]+/).filter(Boolean).map(function (x) { return hm(x, 'Times must look like 09:05'); });
        if (ts.length < 2 || ts.length > 14) throw new Error('Enter 2 to 14 times');
        ts.sort(function (x, y) { return x - y; });
        var frames = [], rows = [], gaps = [], sess = 0;
        frames.push({ narr: 'One user’s events sorted by time. Rule: a new session starts when the silence since the previous event is <b>more than ' + to + ' minutes</b>.', parts: [
          { type: 'table', label: 'events (ORDER BY event_time)', columns: ['event_time'], rows: ts.map(function (t) { return [fmtHM(t)]; }) },
          { type: 'vars', label: 'rule', vals: { timeout_min: to } } ] });
        for (var i = 0; i < ts.length; i++) {
          var gap = i ? ts[i] - ts[i - 1] : null;
          var flag = (i === 0 || gap > to) ? 1 : 0;
          sess += flag;
          rows.push([fmtHM(ts[i]), i ? fmtHM(ts[i - 1]) : 'NULL', gap === null ? '—' : gap, flag, sess]);
          gaps.push(gap === null ? 0 : gap);
          var h = span(0, i - 1, 'done'); h[i] = flag ? 'bad' : 'cur';
          var gh = {}; gh[i] = flag && i ? 'bad' : 'cur';
          frames.push({ narr: i === 0 ? 'First event: LAG is NULL, so it always opens session <b>1</b>.' : fmtHM(ts[i]) + ': previous event ' + fmtHM(ts[i - 1]) + ', gap = <b>' + gap + ' min</b>. ' + (flag ? H.c('r', gap + ' &gt; ' + to + ' → flag 1, session ' + sess + ' begins.') : H.c('g', gap + ' ≤ ' + to + ' → flag 0, still session ' + sess + '.')), parts: [
            { type: 'table', label: 'LAG → gap → flag → running SUM', columns: ['event_time', 'prev_time', 'gap_min', 'new_session', 'session_no'], rows: copyRows(rows), hl: h },
            { type: 'bars', label: 'gap before each event (min) — red = over timeout', values: gaps.slice(), hl: gh, idxLabels: rows.map(function (r) { return r[0]; }) } ] });
        }
        var all = {}; rows.forEach(function (r, k) { all[k] = ['win', 'sel', 'ok', 'cur'][(r[4] - 1) % 4]; });
        var allG = {}; gaps.forEach(function (g, k) { if (k && g > to) allG[k] = 'bad'; });
        frames.push({ narr: 'Every event now carries a session number (colours). Red bars are the silences that cut sessions apart.', parts: [
          { type: 'table', label: 'sessionized events', columns: ['event_time', 'prev_time', 'gap_min', 'new_session', 'session_no'], rows: copyRows(rows), hl: all },
          { type: 'bars', label: 'gaps vs timeout ' + to + ' min', values: gaps.slice(), hl: allG, idxLabels: rows.map(function (r) { return r[0]; }) } ] });
        var ss = [];
        for (i = 0; i < ts.length; i++) { var s = rows[i][4]; if (!ss[s - 1]) ss[s - 1] = { a: ts[i], z: ts[i], n: 0 }; ss[s - 1].z = ts[i]; ss[s - 1].n++; }
        var tot = 0; ss.forEach(function (x) { tot += x.z - x.a; });
        var bounces = ss.filter(function (x) { return x.n === 1; }).length;
        frames.push({ narr: '<code>GROUP BY session_no</code>: start = MIN, end = MAX, duration = end − start, events = COUNT(*). A one-event session is a <b>bounce</b> (duration 0).', parts: [
          { type: 'table', label: 'sessions', columns: ['session_no', 'start', 'end', 'duration_min', 'events'], rows: ss.map(function (x, k) { return [k + 1, fmtHM(x.a), fmtHM(x.z), x.z - x.a, x.n]; }), hl: (function () { var o = {}; ss.forEach(function (x, k) { if (x.n === 1) o[k] = 'bad'; }); return o; })() },
          { type: 'vars', label: 'metrics', vals: { sessions: ss.length, avg_duration_min: fmt(tot / ss.length), bounces: bounces, bounce_rate: fmt(100 * bounces / ss.length) + '%' }, hl: { sessions: 'ok' } } ] });
        return frames;
      }
    },
    examples: [
      { title: 'Session summary table (start, end, duration, events)', html: `<p>Wrap the sessionized events in one more CTE and group. Result: 12 sessions over 8 users; bob's first session lasts 58 minutes because no single silence exceeded 30 minutes; gia's session crosses midnight (23:50 → 00:15) without breaking.</p>`,
        code: { lang: 'sql', db: 'app', code: `WITH ordered AS (
  SELECT user_id, event_id, event_time,
         LAG(event_time) OVER (PARTITION BY user_id ORDER BY event_time, event_id) AS prev_time
  FROM events
),
flagged AS (
  SELECT *, CASE WHEN prev_time IS NULL
                   OR strftime('%s', event_time) - strftime('%s', prev_time) > 1800
                 THEN 1 ELSE 0 END AS new_session
  FROM ordered
),
sessions AS (
  SELECT *, SUM(new_session) OVER (PARTITION BY user_id ORDER BY event_time, event_id) AS session_no
  FROM flagged
)
SELECT user_id, session_no,
       MIN(event_time) AS session_start,
       MAX(event_time) AS session_end,
       (strftime('%s', MAX(event_time)) - strftime('%s', MIN(event_time))) / 60 AS duration_min,
       COUNT(*) AS events
FROM sessions
GROUP BY user_id, session_no
ORDER BY user_id, session_no;` } },
      { title: 'Headline metrics: sessions, average length, sessions per user, bounces', html: `<p>12 sessions, average 14.5 minutes, 1.5 sessions per user, 4 bounces (single-event sessions). Note <code>SUM(n = 1)</code>: in SQLite a comparison is 0 or 1, so summing it counts matches (portable form: <code>SUM(CASE WHEN n = 1 THEN 1 ELSE 0 END)</code>).</p>`,
        code: { lang: 'sql', db: 'app', code: `WITH ordered AS (
  SELECT user_id, event_id, event_time,
         LAG(event_time) OVER (PARTITION BY user_id ORDER BY event_time, event_id) AS prev_time
  FROM events
),
sessions AS (
  SELECT user_id, event_time,
         SUM(CASE WHEN prev_time IS NULL
                    OR strftime('%s', event_time) - strftime('%s', prev_time) > 1800
                  THEN 1 ELSE 0 END)
           OVER (PARTITION BY user_id ORDER BY event_time, event_id) AS session_no
  FROM ordered
),
per_session AS (
  SELECT user_id, session_no, COUNT(*) AS n,
         (strftime('%s', MAX(event_time)) - strftime('%s', MIN(event_time))) / 60.0 AS minutes
  FROM sessions GROUP BY user_id, session_no
)
SELECT COUNT(*)                                          AS total_sessions,
       ROUND(AVG(minutes), 1)                            AS avg_session_min,
       ROUND(1.0 * COUNT(*) / COUNT(DISTINCT user_id), 2) AS sessions_per_user,
       SUM(n = 1)                                        AS bounces
FROM per_session;` } },
      { title: 'Exactly-on-the-boundary gap (dan: 30 minutes)', html: `<p>dan's events at 08:00 and 08:30 are exactly 1800 seconds apart. With "&gt; 30 minutes" they stay in one session; with "≥ 30" they split. Integer seconds make this exact; <code>julianday</code> differences are floating point and can land on 29.999999 or 30.000001.</p>`,
        code: { lang: 'sql', db: 'app', code: `SELECT event_time,
       strftime('%s', event_time) - strftime('%s', LAG(event_time) OVER (ORDER BY event_time)) AS gap_seconds,
       (julianday(event_time) - julianday(LAG(event_time) OVER (ORDER BY event_time))) * 1440 AS gap_min_float
FROM events
WHERE user_id = 4;` } },
      { title: 'Global session key for joining elsewhere', html: `<p>Session numbers restart at 1 per user. To use sessions as a key in other tables, combine them: <code>user_id || '-' || session_no</code>, or number all sessions globally with <code>DENSE_RANK() OVER (ORDER BY user_id, session_no)</code>.</p>`,
        code: { lang: 'sql', db: 'app', code: `WITH ordered AS (
  SELECT user_id, event_id, event_time, event_name,
         LAG(event_time) OVER (PARTITION BY user_id ORDER BY event_time, event_id) AS prev_time
  FROM events
),
s AS (
  SELECT *, SUM(CASE WHEN prev_time IS NULL
                       OR strftime('%s', event_time) - strftime('%s', prev_time) > 1800
                     THEN 1 ELSE 0 END)
              OVER (PARTITION BY user_id ORDER BY event_time, event_id) AS session_no
  FROM ordered
)
SELECT user_id || '-' || session_no                       AS session_key,
       DENSE_RANK() OVER (ORDER BY user_id, session_no)  AS global_session_id,
       event_time, event_name
FROM s
ORDER BY global_session_id, event_time;` } }
    ],
    deepDive: `<p><b>Why not a self-join?</b> The pre-window approach decides "event e starts a session" with <code>NOT EXISTS (an earlier event of the same user within 30 min)</code>, then numbers sessions by counting starts up to each event — a correlated subquery inside a correlated subquery, O(n²) per user. On a 10<sup>9</sup>-row clickstream that never finishes; the window version is one sort by (user, time) plus two linear passes.</p>
<p><b>Ties in time:</b> two events in the same second make <code>ORDER BY event_time</code> ambiguous; the running SUM's default RANGE frame treats them as peers. Always add a unique tie-breaker (<code>event_id</code>) to every window's ORDER BY.</p>
<p><b>Duration definition:</b> "last event − first event" makes single-event sessions 0 seconds long, under-counting real time on page. Analytics tools add a heartbeat or assume time-on-last-page. Know which definition the question wants.</p>
<p><b>Production reality:</b> sessionization usually runs <b>incrementally</b>: today's events can extend a session that started yesterday at 23:50 (gia). Pipelines keep the last event time per user as state, or re-process a look-back window. Streaming engines provide <b>session windows</b> natively (Flink, Kafka Streams, Spark Structured Streaming <code>session_window</code>) with a gap duration and a watermark for late events. Warehouses (BigQuery, Snowflake) run the SQL above over partitioned tables clustered by user_id.</p>
<p><b>Dialect time math:</b> Postgres <code>EXTRACT(EPOCH FROM t - prev)</code> or <code>t - prev &gt; INTERVAL '30 minutes'</code>; MySQL <code>TIMESTAMPDIFF(SECOND, prev, t)</code>; BigQuery <code>TIMESTAMP_DIFF(t, prev, SECOND)</code>; SQLite <code>strftime('%s', t) - strftime('%s', prev)</code> (or <code>unixepoch()</code> on 3.38+).</p>`,
    aiEra: `<p><b>What AI changes:</b> sessionization is a textbook prompt — models will produce the LAG + SUM pattern. What they routinely miss: the tie-breaker, the "&gt;" vs "≥" boundary, time-zone and midnight rules, and late-arriving events in incremental pipelines.</p>
<p><b>Use AI as a partner:</b> paste your query and ask <code>Which events would change session if two events have identical timestamps? Construct a test.</code> Have it generate a synthetic clickstream with known session counts (e.g. "user 1 has exactly 3 sessions") and assert your query reproduces them. Ask it to port the logic to a Flink or Spark session window for the streaming version.</p>
<p><b>Where AI goes wrong:</b> computing gaps with <code>julianday</code> floats, forgetting <code>PARTITION BY user_id</code> (so users bleed into each other's sessions), or treating the timeout as a maximum session length.</p>
<p><b>What you must still own:</b> the definition of a session (timeout, midnight split, campaign split), the duration metric, and how late data is reprocessed — these choices change the KPIs your company reports.</p>`,
    problems: [{
      title: 'Sessions per User with a 30-Minute Timeout', level: 'Hard', tags: ['sessionization', 'lag', 'running sum'], companies: ['Google', 'Amplitude', 'Netflix'],
      statement: `<p>Table <code>events(event_id, user_id, event_time, event_name)</code>. A session is a maximal sequence of a user's events where consecutive events are at most 30 minutes apart. For every user who has events, return <code>user_id, sessions, longest_session_min, events_in_longest</code> (if two sessions are equally long, use the one with more events, then the earlier one). Order by user_id.</p>`,
      constraints: `Up to 10<sup>8</sup> events; timestamps 'YYYY-MM-DD HH:MM:SS'; sessions may cross midnight; identical timestamps possible (break ties by event_id).`,
      example: `<p>amy: sessions 09:00–09:20 (20 min, 3 events), 10:10–10:15, 11:00 → ${H.c('g', '3 sessions, longest 20 min, 3 events')}. bob: 09:00, 09:29, 09:58 chain (each gap 29) → ${H.c('b', 'longest 58 min')}; 10:40 is a second session.</p>`,
      brute: { why: `<p>Correlated version: an event starts a session if no earlier event of that user is within 30 minutes; its session number is the count of session-starts up to it. Two nested correlated subqueries → O(k²) per user with k events, plus repeated timestamp parsing. Correct on small data, hopeless at 10<sup>8</sup> rows.</p>`,
        code: { lang: 'sql', db: 'app', code: `SELECT e.user_id, e.event_time,
       (SELECT COUNT(*) FROM events s                     -- count session starts so far
        WHERE s.user_id = e.user_id AND s.event_time <= e.event_time
          AND NOT EXISTS (SELECT 1 FROM events p          -- s is a start: nothing within 30 min before it
                          WHERE p.user_id = s.user_id
                            AND p.event_time < s.event_time
                            AND strftime('%s', s.event_time) - strftime('%s', p.event_time) <= 1800)
       ) AS session_no
FROM events e
ORDER BY e.user_id, e.event_time;` } },
      mcq: { q: 'Events at 10:00, 10:25, 10:50, 11:15 with a 30-minute inactivity timeout. How many sessions?', options: ['1', '2', '3', '4'], answer: 0, explain: 'Every gap is 25 minutes, so no gap exceeds 30: one 75-minute session. The timeout limits silence, not total length.' },
      hints: [
        `<p>Hint 1: a session starts exactly where the gap to the previous event (same user) is more than 30 minutes — or there is no previous event.</p>`,
        `<p>Hint 2: <code>LAG</code> → 0/1 flag → running <code>SUM</code> gives session_no; then <code>GROUP BY user_id, session_no</code> for duration and event count.</p>`,
        `<p>Hint 3: rank sessions per user with <code>ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY minutes DESC, events DESC, start)</code>, keep rn = 1, and join the session count. Use integer seconds and add event_id as tie-breaker.</p>`
      ],
      tests: { engine: 'sqlite', check: '(rows, cols, c) => {\n  if (c.plan || c.noplan) { const d = rows.map(r => r[r.length - 1]).join(\'\\n\'); return (!c.plan || new RegExp(c.plan).test(d)) && (!c.noplan || !new RegExp(c.noplan).test(d)); }\n  let a = rows, b = c.rows || [];\n  if (c.set) { const k = r => JSON.stringify(r); a = a.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); b = b.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); }\n  return a.length === b.length && a.every((r, i) => r.length === b[i].length && r.every((v, j) => v === b[i][j] || (typeof v === \'number\' && typeof b[i][j] === \'number\' && Math.abs(v - b[i][j]) < 1e-6)));\n}', cases: [
        { rows: [
            [1, 3, 20, 3],
            [2, 2, 58, 3],
            [3, 1, 15, 4],
            [4, 2, 30, 2],
            [5, 1, 1, 2],
            [6, 1, 20, 3],
            [7, 1, 25, 3],
            [8, 1, 0, 1]
          ] },
        { setup: 'DELETE FROM events', rows: [] },
        { setup: 'DELETE FROM events WHERE user_id <> 2', rows: [
            [2, 2, 58, 3]
          ] },
        { setup: 'INSERT INTO events VALUES (100,8,\'2024-03-01 10:30:00\',\'view_product\'),(101,8,\'2024-03-01 10:30:01\',\'view_product\'),(102,8,\'2024-03-01 11:00:01\',\'search\')', rows: [
            [1, 3, 20, 3],
            [2, 2, 58, 3],
            [3, 1, 15, 4],
            [4, 2, 30, 2],
            [5, 1, 1, 2],
            [6, 1, 20, 3],
            [7, 1, 25, 3],
            [8, 1, 60, 4]
          ] },
        { setup: 'INSERT INTO events VALUES (100,9,\'2024-03-01 10:00:00\',\'search\'),(101,9,\'2024-03-01 10:00:00\',\'search\'),(102,9,\'2024-03-01 10:30:00\',\'search\')', rows: [
            [1, 3, 20, 3],
            [2, 2, 58, 3],
            [3, 1, 15, 4],
            [4, 2, 30, 2],
            [5, 1, 1, 2],
            [6, 1, 20, 3],
            [7, 1, 25, 3],
            [8, 1, 0, 1],
            [9, 1, 30, 3]
          ] },
        { setup: 'INSERT INTO events VALUES (100,9,\'2024-03-01 10:00:00\',\'search\'),(101,9,\'2024-03-01 10:30:00\',\'search\'),(102,9,\'2024-03-01 12:00:00\',\'search\'),(103,9,\'2024-03-01 12:00:30\',\'search\'),(104,9,\'2024-03-01 12:01:00\',\'search\')', rows: [
            [1, 3, 20, 3],
            [2, 2, 58, 3],
            [3, 1, 15, 4],
            [4, 2, 30, 2],
            [5, 1, 1, 2],
            [6, 1, 20, 3],
            [7, 1, 25, 3],
            [8, 1, 0, 1],
            [9, 2, 30, 2]
          ] },
        { setup: 'INSERT INTO events VALUES (100,9,\'2023-12-31 23:45:00\',\'search\'),(101,9,\'2024-01-01 00:10:00\',\'search\'),(102,9,\'2024-01-01 00:40:00\',\'search\'),(103,9,\'2024-01-01 00:40:01\',\'search\')', rows: [
            [1, 3, 20, 3],
            [2, 2, 58, 3],
            [3, 1, 15, 4],
            [4, 2, 30, 2],
            [5, 1, 1, 2],
            [6, 1, 20, 3],
            [7, 1, 25, 3],
            [8, 1, 0, 1],
            [9, 1, 55, 4]
          ] },
        { setup: 'INSERT INTO events VALUES (100,9,\'2024-03-01 10:00:00\',\'search\'),(101,9,\'2024-03-01 10:30:01\',\'search\')', rows: [
            [1, 3, 20, 3],
            [2, 2, 58, 3],
            [3, 1, 15, 4],
            [4, 2, 30, 2],
            [5, 1, 1, 2],
            [6, 1, 20, 3],
            [7, 1, 25, 3],
            [8, 1, 0, 1],
            [9, 2, 0, 1]
          ] },
        { setup: 'INSERT INTO events VALUES (100,9,\'2024-03-01 10:00:59\',\'search\'),(101,9,\'2024-03-01 10:01:30\',\'search\')', rows: [
            [1, 3, 20, 3],
            [2, 2, 58, 3],
            [3, 1, 15, 4],
            [4, 2, 30, 2],
            [5, 1, 1, 2],
            [6, 1, 20, 3],
            [7, 1, 25, 3],
            [8, 1, 0, 1],
            [9, 1, 0, 2]
          ] }
      ] },
      solution: {
        approach: `<p>Sessionize (LAG, flag, running SUM), aggregate to one row per session, then a top-1-per-user over sessions plus a COUNT of sessions per user via a window.</p>`,
        code: { lang: 'sql', db: 'app', code: `WITH ordered AS (
  SELECT user_id, event_id, event_time,
         LAG(event_time) OVER (PARTITION BY user_id ORDER BY event_time, event_id) AS prev_time
  FROM events
),
tagged AS (
  SELECT user_id, event_id, event_time,
         SUM(CASE WHEN prev_time IS NULL
                    OR strftime('%s', event_time) - strftime('%s', prev_time) > 1800
                  THEN 1 ELSE 0 END)
           OVER (PARTITION BY user_id ORDER BY event_time, event_id) AS session_no
  FROM ordered
),
per_session AS (
  SELECT user_id, session_no,
         MIN(event_time) AS started,
         (strftime('%s', MAX(event_time)) - strftime('%s', MIN(event_time))) / 60 AS minutes,
         COUNT(*) AS events
  FROM tagged
  GROUP BY user_id, session_no
),
ranked AS (
  SELECT *,
         COUNT(*) OVER (PARTITION BY user_id) AS sessions,
         ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY minutes DESC, events DESC, started) AS rn
  FROM per_session
)
SELECT user_id, sessions, minutes AS longest_session_min, events AS events_in_longest
FROM ranked
WHERE rn = 1
ORDER BY user_id;` },
        dry: { head: ['user', 'sessions (min / events)', 'answer'], rows: [['1 amy', '20/3, 5/2, 0/1', '3, 20, 3'], ['2 bob', '58/3, 0/1', '2, 58, 3'], ['4 dan', '30/2, 0/1', '2, 30, 2'], ['7 gia', '25/3 (crosses midnight)', '1, 25, 3']] },
        complexity: `<p>One sort by (user_id, event_time, event_id): O(n log n); the flag, running sum, grouping and ranking are linear passes. Memory O(n) for window buffers (engines spill to disk per partition).</p>`,
        followUps: ['Also end a session at local midnight.', 'Make it incremental: process only today’s events but continue yesterday’s open sessions.', 'Compute the bounce rate per acquisition channel (join users).']
      }
    }]
  });

  /* =====================================================================
     TOPIC 6 — Funnels & retention cohorts
     ===================================================================== */
  topics.push({
    title: 'Funnels & Retention Cohorts',
    analogy: `<p>A <b>funnel</b> is a shopping mall: 100 people walk in, 60 enter a shop, 30 try something on, 10 pay. Each doorway loses people, and the manager wants to know <i>which doorway leaks most</i>. A <b>retention cohort</b> is a school class photo taken every year: the "Class of January" had 5 kids at the start; how many still show up in February, March, April? You compare classes (cohorts) by how well each one sticks around.</p>`,
    explain: `<p><b>Funnel = count distinct users who reached each step.</b> Steps here: <code>view_product → add_to_cart → checkout → purchase</code>.</p>
<p><b>Version 1 — loose funnel</b> (did the user ever do the step?): one pass with conditional aggregation, <code>COUNT(DISTINCT CASE WHEN event_name = 'add_to_cart' THEN user_id END)</code>. Fast, but it counts a user who added to cart <i>before</i> viewing, or purchased without checkout. Our data: 7 → 6 → 4 → 3.</p>
<p><b>Version 2 — strict ordered funnel</b> (each step must happen <i>after</i> the previous one): chain CTEs, each taking the first time of step k that happens after the user's step k−1 time. Our data: ${H.c('g', '7 → 5 → 3 → 2')}. dan added to cart at 08:00 but only viewed at 08:30, so he is not counted at "cart"; gia purchased without checkout, so not at "purchase".</p>
${H.table(['step', 'loose', 'strict', 'strict % of top', 'strict % of previous'], [['view_product', '7', '7', '100%', '—'], ['add_to_cart', '6', '5', '71.4%', '71.4%'], ['checkout', '4', '3', '42.9%', H.c('r', '60.0%')], ['purchase', '3', '2', '28.6%', '66.7%']])}
<p>Conversion is reported two ways: <b>% of top</b> (overall conversion) and <b>% of previous</b> (step conversion — reveals the leakiest doorway; here cart → checkout).</p>
<p><b>Retention cohorts.</b> Group users by when they <b>started</b> (signup month = cohort). For each later period k (month 0, 1, 2…), count how many cohort members were active in period start + k, and divide by cohort size. Steps:</p>
<ol>
<li>Cohort per user: <code>signup month</code> as a sequential month number (<code>year*12 + month</code>) so differences work across years.</li>
<li>Activity per user per month: <code>DISTINCT user_id, month number</code> from logins.</li>
<li>Join, compute <code>month_no = activity_month − cohort_month</code>.</li>
<li>Pivot with conditional aggregation into M0, M1, M2… columns, divide by cohort size.</li>
</ol>
<p>Our Jan cohort (5 users): M0 5, M1 4 (80%), M2 2 (40%), M3 2 (40%). <b>Day-N retention</b> (D1, D7) is the same idea with days: "share of users active exactly 1 day after signup".</p>`,
    clues: [
      '"conversion rate from view to purchase", "drop-off at each step", "funnel" → distinct users per step (conditional aggregation or chained CTEs)',
      '"in that order", "after viewing", "within the same session / 24 hours" → strict ordered funnel with time conditions',
      '"cohort", "users who signed up in month X — how many came back in month X+1, X+2" → cohort month + period offset + pivot',
      '"Day 1 / Day 7 retention", "fraction of players who logged in again the day after first login" → join on signup_date + N days',
      '"retention by channel / country" → same query with an extra GROUP BY dimension',
      '"churned users" → cohort members with no activity after a cut-off (anti-join)'
    ],
    code: [{
      lang: 'sql', db: 'app', title: 'Strict ordered funnel with step and overall conversion',
      code: `WITH v AS (                        -- step 1: first product view per user
  SELECT user_id, MIN(event_time) AS t
  FROM events WHERE event_name = 'view_product' GROUP BY user_id
),
c AS (                             -- step 2: first add_to_cart AFTER that view
  SELECT e.user_id, MIN(e.event_time) AS t
  FROM events e JOIN v ON v.user_id = e.user_id AND e.event_time > v.t
  WHERE e.event_name = 'add_to_cart' GROUP BY e.user_id
),
k AS (                             -- step 3: first checkout AFTER that cart
  SELECT e.user_id, MIN(e.event_time) AS t
  FROM events e JOIN c ON c.user_id = e.user_id AND e.event_time > c.t
  WHERE e.event_name = 'checkout' GROUP BY e.user_id
),
p AS (                             -- step 4: first purchase AFTER that checkout
  SELECT e.user_id, MIN(e.event_time) AS t
  FROM events e JOIN k ON k.user_id = e.user_id AND e.event_time > k.t
  WHERE e.event_name = 'purchase' GROUP BY e.user_id
),
funnel AS (
  SELECT 1 AS step_no, 'view_product' AS step, COUNT(*) AS users FROM v
  UNION ALL SELECT 2, 'add_to_cart', COUNT(*) FROM c
  UNION ALL SELECT 3, 'checkout',    COUNT(*) FROM k
  UNION ALL SELECT 4, 'purchase',    COUNT(*) FROM p
)
SELECT step_no, step, users,
       ROUND(100.0 * users / FIRST_VALUE(users) OVER (ORDER BY step_no), 1) AS pct_of_top,
       ROUND(100.0 * users / LAG(users)         OVER (ORDER BY step_no), 1) AS pct_of_prev
FROM funnel
ORDER BY step_no;`
    }, {
      lang: 'sql', db: 'app', title: 'Monthly retention cohort matrix (counts and %)',
      code: `WITH cohort AS (                                   -- each user's signup month as a sequential number
  SELECT user_id,
         strftime('%Y-%m', signup_date) AS cohort_month,
         CAST(strftime('%Y', signup_date) AS INTEGER) * 12
       + CAST(strftime('%m', signup_date) AS INTEGER) AS cohort_idx
  FROM users
),
activity AS (                                      -- months in which each user was active
  SELECT DISTINCT user_id,
         CAST(strftime('%Y', login_ts) AS INTEGER) * 12
       + CAST(strftime('%m', login_ts) AS INTEGER) AS act_idx
  FROM logins
),
offsets AS (                                       -- month_no 0 = signup month
  SELECT c.cohort_month, c.user_id, a.act_idx - c.cohort_idx AS month_no
  FROM cohort c JOIN activity a ON a.user_id = c.user_id
  WHERE a.act_idx >= c.cohort_idx
),
sizes AS (SELECT cohort_month, COUNT(*) AS cohort_size FROM cohort GROUP BY cohort_month)
SELECT o.cohort_month, s.cohort_size,
       ROUND(100.0 * COUNT(DISTINCT CASE WHEN month_no = 0 THEN o.user_id END) / s.cohort_size) AS m0_pct,
       ROUND(100.0 * COUNT(DISTINCT CASE WHEN month_no = 1 THEN o.user_id END) / s.cohort_size) AS m1_pct,
       ROUND(100.0 * COUNT(DISTINCT CASE WHEN month_no = 2 THEN o.user_id END) / s.cohort_size) AS m2_pct,
       ROUND(100.0 * COUNT(DISTINCT CASE WHEN month_no = 3 THEN o.user_id END) / s.cohort_size) AS m3_pct
FROM offsets o JOIN sizes s ON s.cohort_month = o.cohort_month
GROUP BY o.cohort_month, s.cohort_size
ORDER BY o.cohort_month;
-- Caution: months after the end of the data (e.g. Feb cohort M3 = May) show 0 here.
-- The Hard practice problem "Monthly Retention Matrix" turns those into NULL (right-censoring).`
    }],
    codeTitle: ['Ordered funnel', 'Cohort retention matrix'],
    viz: [{
      title: 'Funnel: users surviving each step (loose vs strict order)',
      input: 'amy V C K P, bob V C, cat V C K P, dan C V K, eva V, fin V C K, gia V C P',
      inputLabel: 'Each user then their steps in time order (V view, C cart, K checkout, P purchase)',
      gen: function (input) {
        var steps = ['V', 'C', 'K', 'P'], names = { V: 'view', C: 'cart', K: 'checkout', P: 'purchase' };
        var users = items(input).map(function (it) {
          var p = it.split(/\s+/);
          if (p.length < 2) throw new Error('Each user needs a name and at least one step, e.g. "amy V C"');
          p.slice(1).forEach(function (s) { if (steps.indexOf(s) < 0) throw new Error('Steps must be V, C, K or P'); });
          return { name: p[0], seq: p.slice(1) };
        });
        if (users.length > 12) throw new Error('Use at most 12 users');
        var frames = [];
        frames.push({ narr: 'Each user’s events in time order. Loose funnel asks "did they ever do the step?"; strict funnel asks "did they do it <b>after</b> the previous step?".', parts: [
          { type: 'table', label: 'event sequences', columns: ['user', 'events in time order'], rows: users.map(function (u) { return [u.name, u.seq.map(function (s) { return names[s]; }).join(' → ')]; }) } ] });
        var loose = steps.map(function (s) { return users.filter(function (u) { return u.seq.indexOf(s) >= 0; }).length; });
        frames.push({ narr: 'Loose counts (conditional aggregation, one pass): ' + loose.join(' → ') + '. Simple, but out-of-order users still count.', parts: [
          { type: 'bars', label: 'loose funnel (distinct users per step)', values: loose, idxLabels: steps.map(function (s) { return names[s]; }) } ] });
        var reached = users.map(function () { return 0; }), pos = users.map(function () { return -1; });
        var grid = users.map(function (u) { return [u.name, '', '', '', '']; });
        var strict = [];
        steps.forEach(function (s, k) {
          var cnt = 0, hl = {};
          users.forEach(function (u, i) {
            if (reached[i] !== k) { if (k > 0 && reached[i] < k) grid[i][k + 1] = '—'; return; }
            var j = -1;
            for (var x = pos[i] + 1; x < u.seq.length; x++) if (u.seq[x] === s) { j = x; break; }
            if (j >= 0) { reached[i] = k + 1; pos[i] = j; cnt++; grid[i][k + 1] = '✓'; hl[i] = 'ok'; }
            else { grid[i][k + 1] = u.seq.indexOf(s) >= 0 ? '✗ (out of order)' : '✗'; hl[i] = 'bad'; }
          });
          strict.push(cnt);
          var bh = {}; bh[k] = 'cur';
          frames.push({ narr: 'Step ' + (k + 1) + ' — <b>' + names[s] + '</b>: a user counts only if they did it after their step-' + k + ' time. ' + cnt + ' user(s) survive' + (k ? ' (' + fmt(Math.round(1000 * cnt / strict[k - 1]) / 10) + '% of the previous step)' : '') + '. Red = dropped here.', parts: [
            { type: 'table', label: 'who passes each step', columns: ['user', 'view', 'cart', 'checkout', 'purchase'], rows: copyRows(grid), hl: hl },
            { type: 'bars', label: 'strict funnel so far', values: strict.slice(), hl: bh, idxLabels: steps.slice(0, k + 1).map(function (q) { return names[q]; }) } ] });
        });
        var worst = 1; for (var k2 = 1; k2 < 4; k2++) { if (strict[k2 - 1] && strict[k2] / strict[k2 - 1] < strict[worst] / (strict[worst - 1] || 1)) worst = k2; }
        var wh = {}; wh[worst] = 'bad';
        frames.push({ narr: 'Final strict funnel: ' + strict.join(' → ') + ' (loose was ' + loose.join(' → ') + '). Overall conversion ' + (strict[0] ? fmt(Math.round(1000 * strict[3] / strict[0]) / 10) : 0) + '%. Biggest leak (lowest step conversion, red): <b>' + names[steps[worst - 1]] + ' → ' + names[steps[worst]] + '</b>.', parts: [
          { type: 'bars', label: 'strict funnel', values: strict, hl: wh, idxLabels: steps.map(function (q) { return names[q]; }) },
          { type: 'bars', label: 'loose funnel (for comparison)', values: loose, idxLabels: steps.map(function (q) { return names[q]; }) } ] });
        return frames;
      }
    }, {
      title: 'Building a retention cohort matrix',
      gen: function () {
        var users = [['amy', 'Jan', [0, 1, 2, 3]], ['bob', 'Jan', [0, 1]], ['cat', 'Jan', [0, 1, 2]], ['dan', 'Jan', [0]], ['eva', 'Jan', [0, 1, 3]], ['fin', 'Feb', [0, 1]], ['gia', 'Feb', [0, 1]], ['hal', 'Feb', [0]], ['ivy', 'Feb', [0, 2]], ['jon', 'Mar', [0, 1]], ['kai', 'Mar', [0]], ['lia', 'Mar', [0, 1]]];
        var frames = [];
        frames.push({ narr: 'Step 1: every user gets a <b>cohort</b> = signup month, and a list of month offsets in which they were active (0 = signup month).', parts: [
          { type: 'table', label: 'user → cohort, active month offsets', columns: ['user', 'cohort', 'active month_no'], rows: users.map(function (u) { return [u[0], u[1], u[2].join(', ')]; }) } ] });
        var cohorts = ['Jan', 'Feb', 'Mar'], maxOff = { Jan: 3, Feb: 2, Mar: 1 };
        var mat = cohorts.map(function (c) { return [c, 0, '', '', '', '']; });
        cohorts.forEach(function (c, ci) {
          var mem = users.filter(function (u) { return u[1] === c; });
          mat[ci][1] = mem.length;
          for (var k = 0; k <= 3; k++) {
            if (k > maxOff[c]) { mat[ci][2 + k] = 'n/a'; continue; }
            var n = mem.filter(function (u) { return u[2].indexOf(k) >= 0; }).length;
            mat[ci][2 + k] = n + ' (' + Math.round(100 * n / mem.length) + '%)';
          }
          var h = {}; h[ci] = 'cur';
          frames.push({ narr: 'Cohort <b>' + c + '</b> has ' + mem.length + ' users. For each month_no we count members active then and divide by ' + mem.length + '. Months that have not happened yet are <b>n/a</b>, not 0 — reporting 0 would look like total churn.', parts: [
            { type: 'table', label: 'members of ' + c, columns: ['user', 'active month_no'], rows: mem.map(function (u) { return [u[0], u[2].join(', ')]; }) },
            { type: 'table', label: 'cohort matrix', columns: ['cohort', 'size', 'M0', 'M1', 'M2', 'M3'], rows: copyRows(mat), hl: h } ] });
        });
        var m1 = cohorts.map(function (c) { var mem = users.filter(function (u) { return u[1] === c; }); return Math.round(100 * mem.filter(function (u) { return u[2].indexOf(1) >= 0; }).length / mem.length); });
        frames.push({ narr: 'Read <b>down a column</b> to compare cohorts at the same age: M1 retention is ' + m1.join('%, ') + '%. Feb signups retained worst in their first month — that is the question a product team asks next.', parts: [
          { type: 'bars', label: 'M1 retention % by cohort', values: m1, hl: { 1: 'bad' }, idxLabels: cohorts },
          { type: 'table', label: 'final matrix', columns: ['cohort', 'size', 'M0', 'M1', 'M2', 'M3'], rows: copyRows(mat), hl: { 0: 'ok', 1: 'ok', 2: 'ok' } } ] });
        return frames;
      }
    }],
    examples: [
      { title: 'Loose funnel in one pass (conditional aggregation)', html: `<p>One scan of <code>events</code>; each CASE picks out one step. Result 7 / 6 / 4 / 3 — larger than the strict funnel because order is ignored. Good for dashboards when order is guaranteed by the product (you cannot check out with an empty cart).</p>`,
        code: { lang: 'sql', db: 'app', code: `SELECT COUNT(DISTINCT CASE WHEN event_name = 'view_product' THEN user_id END) AS viewed,
       COUNT(DISTINCT CASE WHEN event_name = 'add_to_cart'  THEN user_id END) AS carted,
       COUNT(DISTINCT CASE WHEN event_name = 'checkout'     THEN user_id END) AS checked_out,
       COUNT(DISTINCT CASE WHEN event_name = 'purchase'     THEN user_id END) AS purchased
FROM events;` } },
      { title: 'Day-1 retention ("Game Play Analysis IV")', html: `<p>Fraction of users who logged in on the day right after signup: amy, cat, dan, fin, ivy, jon, lia → 7 / 12 = ${H.c('g', '0.58')}. Joining on an exact date (not "any later login") is the key detail.</p>`,
        code: { lang: 'sql', db: 'app', code: `SELECT ROUND(1.0 * COUNT(DISTINCT l.user_id) / (SELECT COUNT(*) FROM users), 2) AS day1_retention
FROM users u
JOIN logins l
  ON l.user_id = u.user_id
 AND date(l.login_ts) = date(u.signup_date, '+1 day');` } },
      { title: 'Week-1 retention by acquisition channel', html: `<p>"Came back within days 1–7 after signup", split by channel. organic 4/4, ads 4/5, referral only 1/3 — a dimension added to the GROUP BY turns a metric into an insight. <code>EXISTS</code> returns 0/1 in SQLite, so SUM counts users.</p>`,
        code: { lang: 'sql', db: 'app', code: `SELECT u.channel,
       COUNT(*) AS users,
       SUM(CASE WHEN EXISTS (SELECT 1 FROM logins l
                             WHERE l.user_id = u.user_id
                               AND date(l.login_ts) BETWEEN date(u.signup_date, '+1 day')
                                                        AND date(u.signup_date, '+7 day'))
                THEN 1 ELSE 0 END) AS retained_w1,
       ROUND(100.0 * SUM(CASE WHEN EXISTS (SELECT 1 FROM logins l
                             WHERE l.user_id = u.user_id
                               AND date(l.login_ts) BETWEEN date(u.signup_date, '+1 day')
                                                        AND date(u.signup_date, '+7 day'))
                THEN 1 ELSE 0 END) / COUNT(*), 1) AS pct
FROM users u
GROUP BY u.channel
ORDER BY pct DESC;` } },
      { title: 'Funnel within a time limit (cart within 30 minutes of view)', html: `<p>Real funnels add a window: "added to cart within 30 minutes of viewing". Only the join condition changes. amy (15 min), bob (58 min after his <i>first</i> view → ${H.c('r', 'too slow')}), cat, fin pass; gia (20 min, across midnight) passes too. Notice bob viewed again at 09:29 — if "any view" counts, he passes. Which occurrence you anchor on is a definition you must agree on.</p>`,
        code: { lang: 'sql', db: 'app', code: `WITH v AS (
  SELECT user_id, MIN(event_time) AS t FROM events
  WHERE event_name = 'view_product' GROUP BY user_id
)
SELECT v.user_id, v.t AS viewed_at, MIN(e.event_time) AS carted_at
FROM v
JOIN events e
  ON e.user_id = v.user_id
 AND e.event_name = 'add_to_cart'
 AND e.event_time > v.t
 AND strftime('%s', e.event_time) - strftime('%s', v.t) <= 30 * 60
GROUP BY v.user_id, v.t
ORDER BY v.user_id;` } }
    ],
    deepDive: `<p><b>Definitions decide the numbers.</b> Before writing SQL, pin down: (1) unit — users, sessions or orders? (2) order — strict, or "did it ever"? (3) window — within a session, 24 h, 7 days? (4) which occurrence — first view, or any view followed by a cart? The chained-CTE version above uses the <i>first</i> qualifying time at each step, which maximises the chance of later steps succeeding (a later view can only shrink the remaining window).</p>
<p><b>Cost.</b> The loose funnel is one scan. The chained version is k self-joins on (user_id, event_name, event_time) — fine with an index on <code>(event_name, user_id, event_time)</code>. Warehouses offer native helpers: ClickHouse <code>windowFunnel()</code>, Snowflake <code>MATCH_RECOGNIZE</code> (ANSI row-pattern matching: <code>PATTERN (v c k p)</code>), Postgres via arrays or LATERAL.</p>
<p><b>Cohort pitfalls.</b> <i>Right-censoring</i>: the March cohort cannot have M2 activity yet, so show NULL / n/a, not 0. <i>Denominator</i>: always the full cohort size (from users), not users with any activity — joining activity first silently drops churned users from the denominator. <i>Calendar vs rolling periods</i>: "month 1" may mean the next calendar month or days 30–59 after signup; rolling windows are fairer to users who sign up late in a month. <i>Unbounded vs bounded</i> retention: active <i>in</i> month k, or <i>in or after</i> month k.</p>
<p><b>Scale.</b> Pre-aggregate activity to one row per user per day (a "daily active" table) before building cohorts — it is orders of magnitude smaller than raw events. Product-analytics tools (Amplitude, Mixpanel, PostHog) compute exactly these queries; knowing the SQL lets you audit their numbers.</p>`,
    aiEra: `<p><b>What AI changes:</b> analytics copilots (in Looker, Hex, Mode, warehouse UIs) now write funnel and cohort SQL from a sentence. The risk shifts from "can't write it" to "silently answers a slightly different question" — loose instead of strict, wrong denominator, censored months shown as 0.</p>
<p><b>Use AI as a partner:</b> ask it to list every definitional choice in your metric (<code>What assumptions does this funnel query make about order, time window and repeated events?</code>), then decide each one explicitly. Have it generate a tiny dataset with a hand-computed expected matrix and compare.</p>
<p><b>Where AI goes wrong:</b> dividing by active users instead of cohort size, computing month offsets with <code>strftime('%m')</code> differences (breaks across years), forgetting DISTINCT (users with many logins inflate counts), and mixing up "% of previous" with "% of top".</p>
<p><b>What you must still own:</b> the metric definition and its sign-off with stakeholders, sanity checks (M0 must be 100% if signup implies activity), and explaining why two dashboards disagree.</p>`,
    problems: [{
      title: 'Ordered Checkout Funnel with Conversion Rates', level: 'Hard', tags: ['funnel', 'cte', 'conversion'], companies: ['Amazon', 'Shopify', 'Instacart'],
      statement: `<p>Using <code>events(event_id, user_id, event_time, event_name)</code>, build a <b>strict</b> funnel: view_product → add_to_cart → checkout → purchase, where each step counts a user only if it happened <b>after</b> that user's previous step. Return <code>step_no, step, users, pct_of_top, pct_of_prev</code> (percent rounded to 1 decimal).</p>`,
      constraints: `10<sup>8</sup> events; users repeat steps; steps may appear out of order; a step can be skipped (purchase without checkout must not count).`,
      example: `<p>Result ${H.c('g', '7 → 5 → 3 → 2')}. dan: cart 08:00 before view 08:30 → ${H.c('r', 'stops at view')}. gia: view → cart → purchase with no checkout → ${H.c('r', 'stops at cart')}. Step conversion cart → checkout = 3/5 = 60% (the leakiest step).</p>`,
      brute: { why: `<p>The loose conditional-aggregation funnel ignores order, so it reports 7 → 6 → 4 → 3 — ${H.c('r', 'too optimistic')}. A brute "correct" version checks each user with correlated EXISTS chains for every step — repeated scans per user per step, O(users × events) without indexes.</p>`,
        code: { lang: 'sql', db: 'app', code: `-- Ignores order: dan counts as "carted" and gia as "purchased".
SELECT COUNT(DISTINCT CASE WHEN event_name = 'view_product' THEN user_id END) AS viewed,
       COUNT(DISTINCT CASE WHEN event_name = 'add_to_cart'  THEN user_id END) AS carted,
       COUNT(DISTINCT CASE WHEN event_name = 'checkout'     THEN user_id END) AS checked_out,
       COUNT(DISTINCT CASE WHEN event_name = 'purchase'     THEN user_id END) AS purchased
FROM events;` } },
      mcq: { q: 'Which denominator gives "step conversion" for checkout?', options: ['Users who reached add_to_cart', 'Users who viewed a product', 'All users in the users table', 'Users who purchased'], answer: 0, explain: 'Step conversion = users at this step / users at the previous step. Dividing by the top step gives overall conversion instead.' },
      hints: [
        `<p>Hint 1: each step needs the <b>time</b> the user completed the previous step, so keep <code>(user_id, t)</code> per step.</p>`,
        `<p>Hint 2: chain CTEs: <code>c</code> joins events to <code>v</code> with <code>e.event_time &gt; v.t</code> and takes MIN(event_time); repeat for k and p.</p>`,
        `<p>Hint 3: UNION ALL the four counts with a step number, then <code>FIRST_VALUE(users)</code> and <code>LAG(users)</code> over step_no for the two percentages; multiply by 100.0 to avoid integer division.</p>`
      ],
      tests: { engine: 'sqlite', check: '(rows, cols, c) => {\n  if (c.plan || c.noplan) { const d = rows.map(r => r[r.length - 1]).join(\'\\n\'); return (!c.plan || new RegExp(c.plan).test(d)) && (!c.noplan || !new RegExp(c.noplan).test(d)); }\n  let a = rows, b = c.rows || [];\n  if (c.set) { const k = r => JSON.stringify(r); a = a.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); b = b.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); }\n  return a.length === b.length && a.every((r, i) => r.length === b[i].length && r.every((v, j) => v === b[i][j] || (typeof v === \'number\' && typeof b[i][j] === \'number\' && Math.abs(v - b[i][j]) < 1e-6)));\n}', cases: [
        { rows: [
            [1, 'view_product', 7, 100, null],
            [2, 'add_to_cart', 5, 71.4, 71.4],
            [3, 'checkout', 3, 42.9, 60],
            [4, 'purchase', 2, 28.6, 66.7]
          ] },
        { setup: 'DELETE FROM events', rows: [
            [1, 'view_product', 0, null, null],
            [2, 'add_to_cart', 0, null, null],
            [3, 'checkout', 0, null, null],
            [4, 'purchase', 0, null, null]
          ] },
        { setup: 'INSERT INTO events VALUES (100,9,\'2024-03-01 09:00:00\',\'view_product\'),(101,9,\'2024-03-01 09:00:00\',\'add_to_cart\')', rows: [
            [1, 'view_product', 8, 100, null],
            [2, 'add_to_cart', 5, 62.5, 62.5],
            [3, 'checkout', 3, 37.5, 60],
            [4, 'purchase', 2, 25, 66.7]
          ] },
        { setup: 'INSERT INTO events VALUES (100,9,\'2024-03-01 09:00:00\',\'view_product\'),(101,9,\'2024-03-01 09:01:00\',\'add_to_cart\'),(102,9,\'2024-03-01 09:02:00\',\'checkout\'),(103,9,\'2024-03-01 09:03:00\',\'purchase\')', rows: [
            [1, 'view_product', 8, 100, null],
            [2, 'add_to_cart', 6, 75, 75],
            [3, 'checkout', 4, 50, 66.7],
            [4, 'purchase', 3, 37.5, 75]
          ] },
        { setup: 'INSERT INTO events VALUES (100,9,\'2024-03-01 09:00:00\',\'purchase\'),(101,9,\'2024-03-01 09:01:00\',\'checkout\'),(102,9,\'2024-03-01 09:02:00\',\'add_to_cart\'),(103,9,\'2024-03-01 09:03:00\',\'view_product\')', rows: [
            [1, 'view_product', 8, 100, null],
            [2, 'add_to_cart', 5, 62.5, 62.5],
            [3, 'checkout', 3, 37.5, 60],
            [4, 'purchase', 2, 25, 66.7]
          ] },
        { setup: 'INSERT INTO events VALUES (100,9,\'2024-03-01 09:00:00\',\'view_product\'),(101,9,\'2024-03-01 08:00:00\',\'add_to_cart\'),(102,9,\'2024-03-01 10:00:00\',\'add_to_cart\'),(103,9,\'2024-03-01 11:00:00\',\'checkout\')', rows: [
            [1, 'view_product', 8, 100, null],
            [2, 'add_to_cart', 6, 75, 75],
            [3, 'checkout', 4, 50, 66.7],
            [4, 'purchase', 2, 25, 50]
          ] },
        { setup: 'DELETE FROM events WHERE user_id <> 1', rows: [
            [1, 'view_product', 1, 100, null],
            [2, 'add_to_cart', 1, 100, 100],
            [3, 'checkout', 1, 100, 100],
            [4, 'purchase', 1, 100, 100]
          ] },
        { setup: 'DELETE FROM events WHERE user_id <> 3', rows: [
            [1, 'view_product', 1, 100, null],
            [2, 'add_to_cart', 1, 100, 100],
            [3, 'checkout', 1, 100, 100],
            [4, 'purchase', 1, 100, 100]
          ] },
        { setup: 'INSERT INTO events VALUES (100,9,\'2024-03-01 09:00:00\',\'search\'),(101,10,\'2024-03-01 09:00:00\',\'search\')', rows: [
            [1, 'view_product', 7, 100, null],
            [2, 'add_to_cart', 5, 71.4, 71.4],
            [3, 'checkout', 3, 42.9, 60],
            [4, 'purchase', 2, 28.6, 66.7]
          ] }
      ] },
      solution: {
        approach: `<p>Chain one CTE per step carrying the first qualifying timestamp, count each, and compute both conversion rates with window functions over the tiny 4-row result.</p>`,
        code: { lang: 'sql', db: 'app', code: `WITH v AS (SELECT user_id, MIN(event_time) AS t FROM events
           WHERE event_name = 'view_product' GROUP BY user_id),
c AS (SELECT e.user_id, MIN(e.event_time) AS t FROM events e
      JOIN v ON v.user_id = e.user_id AND e.event_time > v.t
      WHERE e.event_name = 'add_to_cart' GROUP BY e.user_id),
k AS (SELECT e.user_id, MIN(e.event_time) AS t FROM events e
      JOIN c ON c.user_id = e.user_id AND e.event_time > c.t
      WHERE e.event_name = 'checkout' GROUP BY e.user_id),
p AS (SELECT e.user_id, MIN(e.event_time) AS t FROM events e
      JOIN k ON k.user_id = e.user_id AND e.event_time > k.t
      WHERE e.event_name = 'purchase' GROUP BY e.user_id),
funnel AS (
  SELECT 1 AS step_no, 'view_product' AS step, COUNT(*) AS users FROM v
  UNION ALL SELECT 2, 'add_to_cart', COUNT(*) FROM c
  UNION ALL SELECT 3, 'checkout',    COUNT(*) FROM k
  UNION ALL SELECT 4, 'purchase',    COUNT(*) FROM p
)
SELECT step_no, step, users,
       ROUND(100.0 * users / FIRST_VALUE(users) OVER (ORDER BY step_no), 1) AS pct_of_top,
       ROUND(100.0 * users / LAG(users) OVER (ORDER BY step_no), 1)         AS pct_of_prev
FROM funnel
ORDER BY step_no;` },
        dry: { head: ['step', 'users', 'pct_of_top', 'pct_of_prev'], rows: [['view_product', '7', '100.0', 'NULL'], ['add_to_cart', '5', '71.4', '71.4'], ['checkout', '3', '42.9', '60.0'], ['purchase', '2', '28.6', '66.7']] },
        complexity: `<p>Each step is a join on (user_id) filtered by event_name: O(n log n) with sorting, near O(n) with an index on (event_name, user_id, event_time). The final 4-row window is free.</p>`,
        followUps: ['Require all steps within the same session (reuse topic 5).', 'Break the funnel down by country.', 'Show median time between view and purchase for converters.']
      }
    }]
  });

  /* =====================================================================
     TOPIC 7 — Median & percentiles
     ===================================================================== */
  topics.push({
    title: 'Median & Percentiles without a MEDIAN() Function',
    analogy: `<p>Line up everyone in a room <b>by height</b>. The <b>median</b> is the person standing in the exact middle of the line — half are shorter, half are taller. If an NBA player walks in, the <i>average</i> height jumps, but the middle person barely moves. With an even number of people there are two "middle" people, so you take the halfway point between them.</p>`,
    explain: `<p><b>Why interviewers ask it:</b> standard SQL aggregates give you AVG, MIN, MAX — but no MEDIAN in SQLite 3.45 or MySQL. You have to build it from ordering tools, which shows you understand window functions and integer arithmetic.</p>
<p><b>The recipe (works in any engine with window functions):</b></p>
<ol>
<li>Number the rows in value order: <code>ROW_NUMBER() OVER (ORDER BY salary)</code> → rn.</li>
<li>Count them: <code>COUNT(*) OVER ()</code> → cnt (same number on every row).</li>
<li>Keep the middle position(s): <code>rn IN ((cnt + 1) / 2, (cnt + 2) / 2)</code> with <b>integer division</b>.</li>
<li><code>AVG()</code> of what is left — one value (odd count) or two (even count).</li>
</ol>
${H.table(['cnt', '(cnt+1)/2', '(cnt+2)/2', 'rows kept'], [['5 (odd)', '3', '3', 'just row 3'], ['4 (even)', '2', '3', 'rows 2 and 3 → average them'], ['17 (our employees)', '9', '9', 'row 9 = 110000']])}
<p>The trick: for odd cnt both formulas give the same middle position; for even cnt they give the two middle ones. No CASE needed.</p>
<p><b>Per group</b> (median salary per department): add <code>PARTITION BY dept</code> to both window functions and <code>GROUP BY dept</code> at the end. Engineering → 120000, Finance → (98000 + 130000) / 2 = 114000, Sales → 85000.</p>
<p><b>Another way (SQLite/Postgres allow expressions in LIMIT):</b> <code>ORDER BY salary LIMIT 2 − cnt % 2 OFFSET (cnt − 1) / 2</code> then AVG — take 1 row if odd, 2 if even, starting at the middle.</p>
<p><b>Percentiles</b> generalise this. <i>Nearest-rank P90</i>: the value at row <code>⌈0.9 × cnt⌉</code> (17 rows → row 16 = 220000). <i>Continuous P90</i> (what PostgreSQL's <code>percentile_cont(0.9)</code> returns): position <code>0.9 × (cnt − 1) + 1 = 15.4</code> → interpolate 40% of the way from row 15 (210000) to row 16 (220000) = 214000. <code>NTILE(100)</code> gives rough buckets but is <i>not</i> an exact percentile.</p>`,
    clues: [
      '"median", "middle value", "50th percentile" → ROW_NUMBER + COUNT window, keep rn in ((cnt+1)/2, (cnt+2)/2)',
      '"median per department / per category" → PARTITION BY the group in both windows, then GROUP BY',
      '"robust to outliers", "typical order value" → the interviewer wants the median, not AVG',
      '"P90 / P95 / P99 latency" → nearest-rank (CEIL(p × cnt)) or interpolated percentile_cont',
      '"numbers given with their frequency" → running SUM of frequency finds the middle without expanding rows',
      '"without window functions" → correlated counts: value with at least half the rows ≤ it and at least half ≥ it'
    ],
    code: [{
      lang: 'sql', db: 'hr', title: 'Median salary (whole company, then per department)',
      code: `-- Whole company: 17 salaries → the 9th smallest.
WITH ordered AS (
  SELECT salary,
         ROW_NUMBER() OVER (ORDER BY salary) AS rn,     -- position in sorted order
         COUNT(*)     OVER ()                AS cnt     -- total rows, on every row
  FROM employees
)
SELECT AVG(salary) AS median_salary
FROM ordered
WHERE rn IN ((cnt + 1) / 2, (cnt + 2) / 2);            -- integer division picks 1 or 2 middles

-- Per department: same thing, partitioned.
WITH ordered AS (
  SELECT dept, salary,
         ROW_NUMBER() OVER (PARTITION BY dept ORDER BY salary, id) AS rn,
         COUNT(*)     OVER (PARTITION BY dept)                     AS cnt
  FROM employees
)
SELECT dept, AVG(salary) AS median_salary, MAX(cnt) AS employees
FROM ordered
WHERE rn IN ((cnt + 1) / 2, (cnt + 2) / 2)
GROUP BY dept
ORDER BY dept;`
    }, {
      lang: 'sql', db: 'hr', title: 'P90 salary: nearest-rank and interpolated (percentile_cont style)',
      code: `WITH r AS (
  SELECT salary,
         ROW_NUMBER() OVER (ORDER BY salary) AS rn,
         COUNT(*)     OVER ()                AS cnt
  FROM employees
),
p AS (                                             -- p = 0.9
  SELECT MAX(cnt) AS cnt,
         0.9 * (MAX(cnt) - 1) + 1 AS pos            -- 1-based fractional position (15.4)
  FROM r
)
SELECT
  -- nearest rank: row CEIL(0.9 * cnt); SQLite 3.45 has no CEIL, so add 1 when there is a fraction
  (SELECT salary FROM r, p
    WHERE rn = CAST(0.9 * p.cnt AS INTEGER) + (0.9 * p.cnt > CAST(0.9 * p.cnt AS INTEGER))) AS p90_nearest_rank,
  -- continuous: lower value + fraction * (upper − lower)
  (SELECT lo.salary + (p.pos - CAST(p.pos AS INTEGER)) * (hi.salary - lo.salary)
     FROM p
     JOIN r lo ON lo.rn = CAST(p.pos AS INTEGER)
     JOIN r hi ON hi.rn = MIN(CAST(p.pos AS INTEGER) + 1, p.cnt))                           AS p90_interpolated;`
    }],
    codeTitle: ['Median (all + per group)', 'Percentiles'],
    viz: {
      title: 'Median: sort, number, keep the middle one or two',
      input: '95, 300, 120, 110, 150, 220, 98, 85',
      inputLabel: 'Values (comma or space separated)',
      gen: function (input) {
        var a = nums(input, 'Enter numbers separated by commas', 15);
        var frames = [];
        frames.push({ narr: 'Raw values in storage order (' + a.length + ' of them). We want the middle value once they are sorted.', parts: [
          { type: 'bars', label: 'values (unsorted)', values: a.slice() } ] });
        var s = a.slice().sort(function (x, y) { return x - y; }), n = s.length;
        frames.push({ narr: '<code>ROW_NUMBER() OVER (ORDER BY value)</code> numbers them 1..' + n + ' in ascending order, and <code>COUNT(*) OVER ()</code> writes cnt = ' + n + ' on every row.', parts: [
          { type: 'table', label: 'ordered', columns: ['value', 'rn', 'cnt'], rows: s.map(function (v, i) { return [v, i + 1, n]; }) } ] });
        var lo = Math.floor((n + 1) / 2), hi = Math.floor((n + 2) / 2);
        frames.push({ narr: 'Middle positions with integer division: (cnt+1)/2 = (' + n + '+1)/2 = <b>' + lo + '</b>, (cnt+2)/2 = (' + n + '+2)/2 = <b>' + hi + '</b>. ' + (lo === hi ? 'cnt is <b>odd</b> → both are the same row.' : 'cnt is <b>even</b> → two middle rows.'), parts: [
          { type: 'vars', label: 'positions', vals: { cnt: n, 'cnt % 2': n % 2, '(cnt+1)/2': lo, '(cnt+2)/2': hi }, hl: { '(cnt+1)/2': 'ok', '(cnt+2)/2': 'ok' } } ] });
        var hl = {}; hl[lo - 1] = 'sel'; hl[hi - 1] = 'sel';
        var th = span(0, n - 1, 'done'); th[lo - 1] = 'sel'; th[hi - 1] = 'sel';
        frames.push({ narr: '<code>WHERE rn IN (' + lo + ', ' + hi + ')</code> keeps the purple row' + (lo === hi ? '' : 's') + ': ' + (lo === hi ? s[lo - 1] : s[lo - 1] + ' and ' + s[hi - 1]) + '.', parts: [
          { type: 'bars', label: 'sorted, middle highlighted', values: s.slice(), hl: hl, idxLabels: s.map(function (v, i) { return 'rn ' + (i + 1); }) },
          { type: 'table', label: 'filtered rows', columns: ['value', 'rn', 'cnt'], rows: s.map(function (v, i) { return [v, i + 1, n]; }), hl: th } ] });
        var med = (s[lo - 1] + s[hi - 1]) / 2;
        var mean = s.reduce(function (x, y) { return x + y; }, 0) / n;
        frames.push({ narr: '<code>AVG()</code> of the kept rows = <b>' + fmt(med) + '</b>. ' + (lo === hi ? 'With one row AVG just returns it.' : 'Halfway between the two middles.'), parts: [
          { type: 'vars', label: 'result', vals: { median: fmt(med) }, hl: { median: 'ok' } } ] });
        frames.push({ narr: 'Compare with the mean: AVG(all) = <b>' + fmt(mean) + '</b>. ' + (Math.abs(mean - med) > 0.1 * Math.abs(med || 1) ? H.c('y', 'Big difference — a few large values pull the mean up; the median ignores them.') : 'Close here, because the values are fairly symmetric.') + ' Median per group = the same query with PARTITION BY.', parts: [
          { type: 'bars', label: 'sorted values (median purple)', values: s.slice(), hl: hl },
          { type: 'vars', label: 'median vs mean', vals: { median: fmt(med), mean: fmt(mean) }, hl: { median: 'ok', mean: 'cur' } } ] });
        return frames;
      }
    },
    examples: [
      { title: 'Median via LIMIT/OFFSET arithmetic', html: `<p>Skip <code>(cnt − 1) / 2</code> rows, take <code>2 − cnt % 2</code> rows (1 if odd, 2 if even), average. SQLite and PostgreSQL accept subqueries in LIMIT/OFFSET; MySQL does not (it needs literal values or prepared statements).</p>`,
        code: { lang: 'sql', db: 'hr', code: `SELECT AVG(salary) AS median_salary
FROM (SELECT salary
      FROM employees
      ORDER BY salary
      LIMIT  2 - (SELECT COUNT(*) FROM employees) % 2
      OFFSET ((SELECT COUNT(*) FROM employees) - 1) / 2);` } },
      { title: 'Median order value: 105 vs mean 172.8', html: `<p>16 orders → average of the 8th and 9th smallest: (90 + 120) / 2 = ${H.c('g', '105')}. The two 500 orders and two 300 orders drag the mean up to 172.8 — this is why "typical basket size" is reported as a median.</p>`,
        code: { lang: 'sql', db: 'shop', code: `WITH r AS (
  SELECT amount,
         ROW_NUMBER() OVER (ORDER BY amount, order_id) AS rn,
         COUNT(*)     OVER ()                          AS cnt
  FROM orders
)
SELECT AVG(amount) AS median_amount,
       (SELECT ROUND(AVG(amount), 1) FROM orders) AS mean_amount
FROM r
WHERE rn IN ((cnt + 1) / 2, (cnt + 2) / 2);` } },
      { title: 'Median from a frequency table (no row expansion)', html: `<p>Table <code>num_freq</code> says 1 appears 3×, 2 appears 4×, 3 once, 5 twice (10 values). A running SUM of frequency gives each value's last position; a value covers positions <code>cum − freq + 1 … cum</code>. Keep values covering position 5 or 6 → only 2 → median ${H.c('g', '2')}. Works even when frequencies are in the billions.</p>`,
        code: { lang: 'sql', db: 'shop', code: `WITH c AS (
  SELECT num, frequency,
         SUM(frequency) OVER (ORDER BY num) AS cum,     -- last position of this value
         SUM(frequency) OVER ()             AS total
  FROM num_freq
)
SELECT AVG(num) AS median
FROM c
WHERE cum - frequency < (total + 2) / 2       -- first position ≤ upper middle
  AND cum            >= (total + 1) / 2;      -- last position  ≥ lower middle` } },
      { title: 'Without window functions: the "half above, half below" test', html: `<p>A value is a median if at least half the rows are ≤ it and at least half are ≥ it. The self-join makes it O(n²) — fine on 17 rows, slow on millions — and duplicates need <code>AVG(DISTINCT …)</code>. Good to know for "no window functions" follow-ups.</p>`,
        code: { lang: 'sql', db: 'hr', code: `SELECT AVG(DISTINCT salary) AS median_salary
FROM (SELECT e1.salary
      FROM employees e1, employees e2
      GROUP BY e1.id, e1.salary
      HAVING SUM(e2.salary >= e1.salary) >= COUNT(*) / 2.0
         AND SUM(e2.salary <= e1.salary) >= COUNT(*) / 2.0);` } }
    ],
    deepDive: `<p><b>Native functions elsewhere:</b> PostgreSQL / Oracle / SQL Server / Snowflake: <code>PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY salary)</code> (interpolated) and <code>PERCENTILE_DISC(0.5)</code> (an actual value). SQL Server also has the window form <code>PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY x) OVER (PARTITION BY g)</code>. Snowflake, DuckDB, ClickHouse and Oracle have <code>MEDIAN()</code>. BigQuery: <code>PERCENTILE_CONT(x, 0.5) OVER ()</code> or <code>APPROX_QUANTILES(x, 100)[OFFSET(50)]</code>. Newer SQLite releases can include <code>median()</code> and <code>percentile()</code> when built with the percentile extension; the 3.45 build here does not, hence the window recipe.</p>
<p><b>Tie-breakers matter less than you think:</b> equal values are interchangeable, so ROW_NUMBER's arbitrary order among ties cannot change the median. It does matter if you return <i>which row</i> is the median (add id).</p>
<p><b>NULLs:</b> <code>COUNT(*)</code> counts NULL rows but they sort first in SQLite, so the middle shifts. Filter <code>WHERE salary IS NOT NULL</code> (or use <code>COUNT(salary)</code> consistently) — PERCENTILE_CONT ignores NULLs, your hand-made version must too.</p>
<p><b>Integer division trap:</b> in SQLite and PostgreSQL <code>(cnt + 1) / 2</code> on integers is integer division — which the recipe relies on. In MySQL <code>/</code> is decimal division; use <code>DIV</code> or <code>FLOOR()</code>. AVG of two INTEGER middles is fine (AVG returns a float), but <code>(a + b) / 2</code> would truncate 114000.5 style values.</p>
<p><b>Big data:</b> exact medians need a full sort (O(n log n)) and cannot be merged from partial results, unlike SUM/COUNT. At warehouse scale use approximate sketches — t-digest, KLL, HyperLogLog's cousins — <code>APPROX_PERCENTILE</code> in Spark/Trino/Snowflake, typically within ~1% error with tiny memory. P99 latency dashboards are almost always approximate.</p>`,
    aiEra: `<p><b>What AI changes:</b> ask for "median in SQL" and you will get <code>PERCENTILE_CONT</code> — perfect for Postgres, an error in SQLite or MySQL. Tell the model your exact engine and version; it then usually writes the ROW_NUMBER recipe correctly.</p>
<p><b>Use AI as a partner:</b> ask it to <code>test this median query on: 1 row, 2 rows, all equal, even count with different middles, NULLs present</code> and to show expected outputs. Ask it to explain the difference between PERCENTILE_CONT and PERCENTILE_DISC on [1, 2, 3, 4] (2.5 vs 2) — a good check of its understanding.</p>
<p><b>Where AI goes wrong:</b> using <code>cnt / 2</code> only (off by one for odd counts), forgetting PARTITION BY on the COUNT window in the per-group version, MySQL decimal division, or presenting <code>NTILE(2)</code> boundaries as the median.</p>
<p><b>What you must still own:</b> knowing when the business wants median vs mean, exact vs approximate, and nearest-rank vs interpolated percentiles — SLAs ("P99 under 200 ms") depend on which definition is used.</p>`,
    problems: [{
      title: 'Median Salary per Department', level: 'Hard', tags: ['median', 'window functions', 'group by'], companies: ['Google', 'Pinterest', 'Airbnb'],
      statement: `<p>From <code>employees</code>, return each department's <b>median salary</b> and its employee count, ordered by dept. With an even count, the median is the average of the two middle salaries.</p>`,
      constraints: `Up to 10<sup>6</sup> employees in ~1000 departments; no MEDIAN/PERCENTILE functions available (SQLite 3.45); a department may have one employee.`,
      example: `<p>Finance salaries sorted: 98000, ${H.c('p', '98000, 130000')}, 210000 → even count 4 → (98000 + 130000) / 2 = ${H.c('g', '114000')}. Engineering (7): 95, 110, 110, ${H.c('p', '120')}, 150, 150, 220 (k) → ${H.c('g', '120000')}. Exec: only Asha → 300000.</p>`,
      brute: { why: `<p>For every employee, count colleagues in the same department with salary ≤ and ≥ theirs, keep those with at least half on each side, then average the distinct survivors. It is a self-join inside each department — O(d²) per department — and duplicate salaries need careful DISTINCT handling.</p>`,
        code: { lang: 'sql', db: 'hr', code: `SELECT dept, AVG(DISTINCT salary) AS median_salary
FROM (SELECT e1.dept, e1.salary
      FROM employees e1
      JOIN employees e2 ON e2.dept = e1.dept
      GROUP BY e1.id, e1.dept, e1.salary
      HAVING SUM(e2.salary >= e1.salary) >= COUNT(*) / 2.0
         AND SUM(e2.salary <= e1.salary) >= COUNT(*) / 2.0)
GROUP BY dept
ORDER BY dept;` } },
      mcq: { q: 'A department has 6 employees. Which row numbers does rn IN ((cnt+1)/2, (cnt+2)/2) keep (integer division)?', options: ['3 and 4', '3 only', '4 only', '2 and 3'], answer: 0, explain: '(6+1)/2 = 3 and (6+2)/2 = 4 — the two middle rows of six. For cnt = 7 both formulas give 4.' },
      hints: [
        `<p>Hint 1: the median is about <b>positions</b> in sorted order — you need each row's position and the group size.</p>`,
        `<p>Hint 2: <code>ROW_NUMBER() OVER (PARTITION BY dept ORDER BY salary)</code> and <code>COUNT(*) OVER (PARTITION BY dept)</code> in one CTE.</p>`,
        `<p>Hint 3: keep <code>rn IN ((cnt + 1) / 2, (cnt + 2) / 2)</code>, then <code>GROUP BY dept</code> with <code>AVG(salary)</code>; report <code>MAX(cnt)</code> as the count.</p>`
      ],
      tests: { engine: 'sqlite', check: '(rows, cols, c) => {\n  if (c.plan || c.noplan) { const d = rows.map(r => r[r.length - 1]).join(\'\\n\'); return (!c.plan || new RegExp(c.plan).test(d)) && (!c.noplan || !new RegExp(c.noplan).test(d)); }\n  let a = rows, b = c.rows || [];\n  if (c.set) { const k = r => JSON.stringify(r); a = a.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); b = b.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); }\n  return a.length === b.length && a.every((r, i) => r.length === b[i].length && r.every((v, j) => v === b[i][j] || (typeof v === \'number\' && typeof b[i][j] === \'number\' && Math.abs(v - b[i][j]) < 1e-6)));\n}', cases: [
        { rows: [
            ['Engineering', 120000, 7],
            ['Exec', 300000, 1],
            ['Finance', 114000, 4],
            ['Sales', 85000, 5]
          ] },
        { setup: 'DELETE FROM employees WHERE id NOT IN (1)', rows: [
            ['Exec', 300000, 1]
          ] },
        { setup: 'DELETE FROM employees WHERE id NOT IN (2,4)', rows: [
            ['Engineering', 185000, 2]
          ] },
        { setup: 'DELETE FROM employees WHERE id NOT IN (2,4,5)', rows: [
            ['Engineering', 150000, 3]
          ] },
        { setup: 'UPDATE employees SET salary = 1000', rows: [
            ['Engineering', 1000, 7],
            ['Exec', 1000, 1],
            ['Finance', 1000, 4],
            ['Sales', 1000, 5]
          ] },
        { setup: 'INSERT INTO employees VALUES (18,\'Zed\',\'Ops\',1,NULL,\'2024-01-01\'); INSERT INTO employees VALUES (19,\'Yan\',\'Ops\',2,NULL,\'2024-01-01\'); INSERT INTO employees VALUES (20,\'Xia\',\'Ops\',4,NULL,\'2024-01-01\'); INSERT INTO employees VALUES (21,\'Wu\',\'Ops\',1000001,NULL,\'2024-01-01\')', rows: [
            ['Engineering', 120000, 7],
            ['Exec', 300000, 1],
            ['Finance', 114000, 4],
            ['Ops', 3, 4],
            ['Sales', 85000, 5]
          ] },
        { setup: 'UPDATE employees SET dept = \'Finance\' WHERE id = 2', rows: [
            ['Engineering', 115000, 6],
            ['Exec', 300000, 1],
            ['Finance', 130000, 5],
            ['Sales', 85000, 5]
          ] },
        { setup: 'DELETE FROM employees', rows: [] }
      ] },
      solution: {
        approach: `<p>One partitioned sort numbers the salaries and counts each department; integer arithmetic selects the one or two middle rows; AVG combines them.</p>`,
        code: { lang: 'sql', db: 'hr', code: `WITH ordered AS (
  SELECT dept, salary,
         ROW_NUMBER() OVER (PARTITION BY dept ORDER BY salary, id) AS rn,
         COUNT(*)     OVER (PARTITION BY dept)                     AS cnt
  FROM employees
)
SELECT dept,
       AVG(salary) AS median_salary,
       MAX(cnt)    AS employees
FROM ordered
WHERE rn IN ((cnt + 1) / 2, (cnt + 2) / 2)
GROUP BY dept
ORDER BY dept;` },
        dry: { head: ['dept', 'cnt', 'middle rn', 'middle salaries', 'median'], rows: [['Engineering', '7', '4', '120000', '120000'], ['Exec', '1', '1', '300000', '300000'], ['Finance', '4', '2, 3', '98000, 130000', '114000'], ['Sales', '5', '3', '85000', '85000']] },
        complexity: `<p>O(n log n) for the partitioned sort; O(n) window memory. The brute force self-join is O(∑ d²).</p>`,
        followUps: ['Return the P25 and P75 salary per department (interquartile range).', 'Find departments whose median is above the company median.', 'How would you get an approximate median on 10 billion rows?']
      }
    }]
  });

  /* =====================================================================
     TOPIC 8 — Pivot & unpivot
     ===================================================================== */
  topics.push({
    title: 'Pivot & Unpivot (rows ↔ columns)',
    analogy: `<p>A <b>receipt roll</b> lists one purchase per line: "North, Q1, 100", "North, Q2, 120"… That is <b>long</b> format — great for machines and adding new lines. Your boss wants a <b>spreadsheet</b>: one row per region, one column per quarter. That is <b>wide</b> format — great for human eyes. <b>Pivot</b> rolls the receipt into the spreadsheet; <b>unpivot</b> cuts the spreadsheet back into receipt lines.</p>`,
    explain: `<p><b>Pivot (long → wide) = GROUP BY + one conditional aggregate per output column.</b> SQLite, MySQL and PostgreSQL have no <code>PIVOT</code> keyword, and even where it exists (SQL Server, Oracle, Snowflake, BigQuery, DuckDB) interviewers expect the portable version:</p>
<pre>SELECT region,
       SUM(CASE WHEN quarter = 'Q1' THEN revenue END) AS q1,
       SUM(CASE WHEN quarter = 'Q2' THEN revenue END) AS q2, …
FROM quarterly_sales
GROUP BY region;</pre>
<p>How to read it: GROUP BY makes <b>one output row per region</b>. Inside each group, the CASE turns every row into either its revenue (if it is a Q1 row) or NULL; SUM ignores NULLs, so the q1 column sums only Q1 rows. One CASE per column.</p>
${H.table(['long rows (West)', '→', 'wide row'], [['West | Q1 | 60', '', ''], ['West | Q1 | 15', '→ q1 = 60 + 15', H.c('g', 'West | 75 | 70 | 65 | 85')], ['West | Q2 | 70', '→ q2', ''], ['West | Q3 | 65', '→ q3', ''], ['West | Q4 | 85', '→ q4', '']])}
<p><b>Three decisions to say out loud:</b> (1) <b>which aggregate</b> — SUM when duplicates should add up (West's two Q1 rows), MAX/MIN when each cell holds a single value (e.g. pivoting a status); (2) <b>missing cells</b> — <code>SUM(CASE … END)</code> gives NULL (South has no Q3), <code>SUM(CASE … ELSE 0 END)</code> or <code>COALESCE(…, 0)</code> gives 0; (3) <b>columns are fixed</b> — SQL must know the column list when the query is written.</p>
<p><b>Unpivot (wide → long) = one SELECT per column glued with UNION ALL</b> (or a CROSS JOIN with a small list of column names + CASE). Each branch outputs <code>(region, 'Q1', q1)</code>; filter <code>IS NOT NULL</code> if empty cells should vanish. PostgreSQL also offers <code>CROSS JOIN LATERAL (VALUES ('Q1', q1), ('Q2', q2) …)</code>; SQL Server / Oracle / Snowflake have <code>UNPIVOT</code>.</p>
<p><b>Dynamic pivot</b> (columns not known in advance, e.g. one column per product): plain SQL cannot do it in one statement. You either generate the SQL text from the distinct values (string aggregation, then execute it from application code or a stored procedure), or return long format and pivot in the BI tool / pandas.</p>`,
    clues: [
      '"one column per month / quarter / status", "reformat the table", "show as a matrix" → pivot with SUM/MAX(CASE …) + GROUP BY',
      '"turn these columns into rows", "normalise the wide table", "melt" → unpivot with UNION ALL (or CROSS JOIN + CASE)',
      '"count of X by Y and Z in one row each" → conditional aggregation (COUNT/SUM of CASE), e.g. headcount per salary band',
      '"columns depend on the data" / "for every product" → dynamic pivot: generate SQL or pivot in the app',
      '"missing combinations should show 0" → ELSE 0 or COALESCE; "should show blank" → leave NULL',
      'LeetCode "Reformat Department Table" / "Rearrange Products Table" → pivot / unpivot respectively'
    ],
    code: [{
      lang: 'sql', db: 'shop', title: 'Pivot quarterly revenue (long → wide) with a total',
      code: `SELECT region,
       SUM(CASE WHEN quarter = 'Q1' THEN revenue END)          AS q1,   -- NULL if no Q1 rows
       SUM(CASE WHEN quarter = 'Q2' THEN revenue END)          AS q2,
       COALESCE(SUM(CASE WHEN quarter = 'Q3' THEN revenue END), 0) AS q3, -- show 0 instead of NULL
       SUM(CASE WHEN quarter = 'Q4' THEN revenue END)          AS q4,
       SUM(revenue)                                            AS total
FROM quarterly_sales
GROUP BY region                     -- one output row per region
ORDER BY total DESC;`
    }, {
      lang: 'sql', db: 'shop', title: 'Unpivot (wide → long) with UNION ALL',
      code: `SELECT region, 'Q1' AS quarter, q1 AS revenue FROM sales_wide WHERE q1 IS NOT NULL
UNION ALL
SELECT region, 'Q2', q2 FROM sales_wide WHERE q2 IS NOT NULL
UNION ALL
SELECT region, 'Q3', q3 FROM sales_wide WHERE q3 IS NOT NULL
UNION ALL
SELECT region, 'Q4', q4 FROM sales_wide WHERE q4 IS NOT NULL
ORDER BY region, quarter;           -- ORDER BY applies to the whole UNION`
    }],
    codeTitle: ['Pivot', 'Unpivot'],
    viz: [{
      title: 'Pivot: long rows fold into one wide row per group',
      input: 'North Q1 100, North Q2 120, North Q3 90, North Q4 150, South Q1 80, South Q2 95, South Q4 110, West Q1 60, West Q1 15, West Q2 70, West Q3 65, West Q4 85',
      inputLabel: '"Group Column Value" rows (max 16)',
      gen: function (input) {
        var rows = items(input).map(function (it) {
          var p = it.split(/\s+/);
          if (p.length !== 3 || isNaN(Number(p[2]))) throw new Error('Each row: Group Column Value, e.g. "North Q1 100"');
          return [p[0], p[1], Number(p[2])];
        });
        if (rows.length > 16) throw new Error('Use at most 16 rows');
        var groups = [], cols = [];
        rows.forEach(function (r) { if (groups.indexOf(r[0]) < 0) groups.push(r[0]); if (cols.indexOf(r[1]) < 0) cols.push(r[1]); });
        cols.sort();
        if (cols.length > 6) throw new Error('At most 6 distinct column values');
        var frames = [];
        var wide = groups.map(function (g) { return [g].concat(cols.map(function () { return '·'; })); });
        var wcols = ['group'].concat(cols.map(function (c) { return c.toLowerCase(); }));
        frames.push({ narr: '<b>Long</b> format: one row per (group, column, value). <code>GROUP BY</code> will make one output row per group (' + groups.join(', ') + '); each distinct value of the second field (' + cols.join(', ') + ') becomes a <b>column</b>.', parts: [
          { type: 'table', label: 'long (input)', columns: ['group', 'key', 'value'], rows: copyRows(rows) },
          { type: 'table', label: 'wide (output skeleton)', columns: wcols, rows: copyRows(wide) } ] });
        cols.forEach(function (c, ci) {
          var hl = {}, n = 0;
          rows.forEach(function (r, i) { if (r[1] === c) { hl[i] = 'win'; n++; } else hl[i] = 'done'; });
          groups.forEach(function (g, gi) {
            var sum = null, cnt = 0;
            rows.forEach(function (r) { if (r[0] === g && r[1] === c) { sum = (sum || 0) + r[2]; cnt++; } });
            wide[gi][ci + 1] = sum === null ? 'NULL' : (cnt > 1 ? sum + ' (' + cnt + ' rows)' : sum);
          });
          var wh = {}; groups.forEach(function (g, gi) { wh[gi] = wide[gi][ci + 1] === 'NULL' ? 'bad' : 'ok'; });
          frames.push({ narr: 'Column <b>' + c.toLowerCase() + '</b> = <code>SUM(CASE WHEN key = \'' + c + '\' THEN value END)</code>. Only the ' + n + ' blue rows contribute; for every other row the CASE yields NULL, which SUM ignores. ' + (wide.some(function (w) { return w[ci + 1] === 'NULL'; }) ? H.c('r', 'A group with no ' + c + ' rows gets NULL (add ELSE 0 / COALESCE for 0).') : '') + (wide.some(function (w) { return String(w[ci + 1]).indexOf('rows') > 0; }) ? ' ' + H.c('y', 'Several rows for the same cell are added together by SUM.') : ''), parts: [
            { type: 'table', label: 'long rows feeding ' + c, columns: ['group', 'key', 'value'], rows: copyRows(rows), hl: hl },
            { type: 'table', label: 'wide (filling column ' + c.toLowerCase() + ')', columns: wcols, rows: copyRows(wide), hl: wh } ] });
        });
        var withTot = wide.map(function (w, gi) { var t = 0; rows.forEach(function (r) { if (r[0] === groups[gi]) t += r[2]; }); return w.map(function (x) { return String(x).replace(/ \(\d+ rows\)/, ''); }).concat([t]); });
        frames.push({ narr: 'Add <code>SUM(value) AS total</code> (no CASE) for a row total. Done: ' + rows.length + ' long rows became ' + groups.length + ' wide rows × ' + (cols.length + 2) + ' columns.', parts: [
          { type: 'table', label: 'final pivot', columns: wcols.concat(['total']), rows: withTot, hl: span(0, groups.length - 1, 'sel') } ] });
        var sql = 'SELECT grp,\n' + cols.map(function (c) { return '       SUM(CASE WHEN key = \'' + c + '\' THEN value END) AS ' + c.toLowerCase() + ','; }).join('\n') + '\n       SUM(value) AS total\nFROM long_table\nGROUP BY grp;';
        var lh = {}; cols.forEach(function (c, i) { lh[i + 2] = 'ok'; });
        frames.push({ narr: 'The whole pivot is this one query: <b>one CASE line per output column</b> (green). Adding a new key value means adding a new line — that is why pivots with unknown columns need generated (dynamic) SQL.', parts: [
          { type: 'code', lang: 'sql', code: sql, hl: lh } ] });
        return frames;
      }
    }, {
      title: 'Unpivot: each column becomes its own UNION ALL branch',
      gen: function () {
        var wide = [['North', 100, 120, 90, 150], ['South', 80, 95, null, 110], ['East', 40, null, null, 55]];
        var qs = ['Q1', 'Q2', 'Q3', 'Q4'];
        var shown = wide.map(function (r) { return r.map(function (x) { return x === null ? 'NULL' : x; }); });
        var frames = [], long = [];
        frames.push({ narr: '<b>Wide</b> table <code>sales_wide</code>: one column per quarter, some cells NULL. Goal: one row per (region, quarter).', parts: [
          { type: 'table', label: 'sales_wide', columns: ['region', 'q1', 'q2', 'q3', 'q4'], rows: copyRows(shown) },
          { type: 'table', label: 'long (output)', columns: ['region', 'quarter', 'revenue'], rows: [] } ] });
        qs.forEach(function (q, qi) {
          var added = [], hl = {};
          wide.forEach(function (r, ri) { if (r[qi + 1] !== null) { added.push([r[0], q, r[qi + 1]]); hl[ri] = 'win'; } else hl[ri] = 'bad'; });
          var start = long.length;
          long = long.concat(added);
          var lh = span(0, start - 1, 'done'); span(start, long.length - 1, 'ok', lh);
          frames.push({ narr: 'Branch ' + (qi + 1) + ': <code>SELECT region, \'' + q + '\', ' + q.toLowerCase() + ' FROM sales_wide WHERE ' + q.toLowerCase() + ' IS NOT NULL</code>. It reads only column ' + q.toLowerCase() + ': ' + added.length + ' row(s) emitted (green); NULL cells (red) are skipped by the filter.', parts: [
            { type: 'table', label: 'sales_wide — reading ' + q.toLowerCase(), columns: ['region', 'q1', 'q2', 'q3', 'q4'], rows: copyRows(shown), hl: hl },
            { type: 'table', label: 'long rows so far (UNION ALL)', columns: ['region', 'quarter', 'revenue'], rows: copyRows(long), hl: lh } ] });
        });
        frames.push({ narr: '3 wide rows × 4 columns = 12 cells, minus 3 NULLs = <b>' + long.length + ' long rows</b>. Use <code>UNION ALL</code>, never plain <code>UNION</code>: UNION would also deduplicate and sort, which is slower and can wrongly merge two identical rows.', parts: [
          { type: 'table', label: 'final long table', columns: ['region', 'quarter', 'revenue'], rows: copyRows(long), hl: span(0, long.length - 1, 'sel') } ] });
        return frames;
      }
    }],
    examples: [
      { title: 'Headcount per salary band (conditional COUNT pivot)', html: `<p>Pivoting is not only for dates: here each column is a salary band. In SQLite a comparison is 0/1, so <code>SUM(condition)</code> counts matches; the portable spelling is <code>SUM(CASE WHEN … THEN 1 ELSE 0 END)</code> or <code>COUNT(*) FILTER (WHERE …)</code> (Postgres, SQLite ≥ 3.30).</p>`,
        code: { lang: 'sql', db: 'hr', code: `SELECT dept,
       COUNT(*)                                                       AS total,
       SUM(CASE WHEN salary >= 150000 THEN 1 ELSE 0 END)              AS band_150k_plus,
       SUM(CASE WHEN salary >= 100000 AND salary < 150000 THEN 1 ELSE 0 END) AS band_100k_150k,
       SUM(CASE WHEN salary < 100000 THEN 1 ELSE 0 END)               AS band_under_100k
FROM employees
GROUP BY dept
ORDER BY dept;` } },
      { title: 'Monthly revenue per city with zeros for empty months', html: `<p>LEFT JOIN from customers keeps Mumbai's Finn (no orders); <code>ELSE 0</code> shows empty months as 0. Status filter goes in the ON clause, otherwise the LEFT JOIN turns back into an inner join.</p>`,
        code: { lang: 'sql', db: 'shop', code: `SELECT c.city,
       SUM(CASE WHEN strftime('%m', o.order_date) = '01' THEN o.amount ELSE 0 END) AS jan,
       SUM(CASE WHEN strftime('%m', o.order_date) = '02' THEN o.amount ELSE 0 END) AS feb,
       SUM(CASE WHEN strftime('%m', o.order_date) = '03' THEN o.amount ELSE 0 END) AS mar,
       SUM(CASE WHEN strftime('%m', o.order_date) = '04' THEN o.amount ELSE 0 END) AS apr
FROM customers c
LEFT JOIN orders o
       ON o.customer_id = c.customer_id
      AND o.status = 'delivered'
GROUP BY c.city
ORDER BY c.city;` } },
      { title: 'Unpivot with a CROSS JOIN (one scan instead of four)', html: `<p>Multiply each wide row by a 4-row list of quarter names, then pick the matching column with CASE. Reads <code>sales_wide</code> once, which matters when the wide table is large; the UNION ALL version scans it once per column.</p>`,
        code: { lang: 'sql', db: 'shop', code: `WITH quarters(quarter) AS (VALUES ('Q1'), ('Q2'), ('Q3'), ('Q4'))
SELECT region, quarter, revenue
FROM (SELECT w.region, q.quarter,
             CASE q.quarter WHEN 'Q1' THEN w.q1
                            WHEN 'Q2' THEN w.q2
                            WHEN 'Q3' THEN w.q3
                            ELSE w.q4 END AS revenue
      FROM sales_wide w CROSS JOIN quarters q)
WHERE revenue IS NOT NULL
ORDER BY region, quarter;` } },
      { title: 'Dynamic pivot: let SQL write the SQL', html: `<p>When the column list depends on the data, build the statement text from the distinct values, then run the generated text from your application (SQLite has no EXEC). The same trick works with <code>STRING_AGG</code> in Postgres or SQL Server.</p>`,
        code: { lang: 'sql', db: 'shop', code: `SELECT 'SELECT region, '
       || GROUP_CONCAT('SUM(CASE WHEN quarter = ''' || quarter || ''' THEN revenue END) AS "'
                       || quarter || '"', ', ')
       || ' FROM quarterly_sales GROUP BY region;' AS generated_sql
FROM (SELECT DISTINCT quarter FROM quarterly_sales ORDER BY quarter);` } }
    ],
    deepDive: `<p><b>Cost:</b> a CASE pivot is a single scan + hash/sort aggregation, regardless of the number of columns — the CASEs are cheap CPU work per row. The anti-pattern is one subquery or self-join per column (<code>(SELECT revenue FROM t WHERE region = x.region AND quarter = 'Q1')</code>): k correlated lookups per row, and silently wrong (error or arbitrary value) when duplicates exist.</p>
<p><b>Native PIVOT syntax</b> (SQL Server, Oracle, Snowflake, BigQuery, DuckDB): <code>SELECT * FROM t PIVOT (SUM(revenue) FOR quarter IN ('Q1', 'Q2', 'Q3', 'Q4'))</code>. Gotcha: every column <i>not</i> mentioned becomes an implicit GROUP BY key, so an extra id column silently explodes the output — select only the needed columns in a subquery first. DuckDB and Snowflake support <code>PIVOT … IN (ANY)</code> / dynamic forms. PostgreSQL has <code>crosstab()</code> in the tablefunc extension.</p>
<p><b>Unpivot and NULLs:</b> native <code>UNPIVOT</code> drops NULLs by default (<code>INCLUDE NULLS</code> in some engines). The UNION ALL approach keeps them unless you filter. Type consistency matters too: all unpivoted columns must share a type (cast if mixing ints and decimals).</p>
<p><b>Design view:</b> store data <b>long</b> (normalised: adding Q5 or a new product needs no schema change) and pivot only for presentation. Wide tables are a reporting artefact; warehouses sometimes keep them for speed (pre-pivoted feature tables for ML). When a pivot needs hundreds of dynamic columns, return long data and let pandas (<code>pivot_table</code>), a BI tool or a spreadsheet do the reshaping.</p>
<p><b>JSON as an escape hatch:</b> <code>json_group_object(quarter, revenue)</code> (SQLite) or <code>jsonb_object_agg</code> (Postgres) produces one JSON object per group with any number of keys — a "dynamic pivot" in a single column.</p>`,
    aiEra: `<p><b>What AI changes:</b> pivot boilerplate (twelve near-identical CASE lines for twelve months) is exactly the kind of typing AI removes. You describe the columns; it writes them. It is also good at converting between native PIVOT syntax and portable CASE form.</p>
<p><b>Use AI as a partner:</b> <code>Generate the CASE pivot for months Jan–Dec over orders.order_date; missing months must be 0, not NULL; SQLite dialect</code>. Then ask it to produce the matching unpivot and confirm that pivot → unpivot round-trips to the original row count on your data.</p>
<p><b>Where AI goes wrong:</b> using <code>PIVOT</code>/<code>UNPIVOT</code> in SQLite/MySQL, choosing MAX when duplicates should be summed, forgetting ELSE 0, putting the status filter in WHERE after a LEFT JOIN, or using <code>UNION</code> instead of <code>UNION ALL</code>.</p>
<p><b>What you must still own:</b> the choice of aggregate, NULL-vs-0 semantics (they mean different things in a report), and whether to pivot in SQL at all versus in the presentation layer.</p>`,
    problems: [{
      title: 'Reformat Quarterly Sales into a Report', level: 'Medium', tags: ['pivot', 'conditional aggregation'], companies: ['Amazon', 'Walmart', 'Salesforce'],
      statement: `<p>Table <code>quarterly_sales(region, quarter, revenue)</code> may contain several rows for the same region and quarter (they should be added) and may be missing quarters. Produce one row per region with columns <code>q1, q2, q3, q4</code> (missing quarters as <b>0</b>), <code>total</code>, and <code>best_quarter</code> (the quarter with the highest revenue; earliest quarter on ties). Order by total descending.</p>`,
      constraints: `Quarters are exactly 'Q1'..'Q4'; up to 10<sup>6</sup> rows; revenue ≥ 0.`,
      example: `<p>West has two Q1 rows (60 + 15 = ${H.c('g', '75')}); South has no Q3 → ${H.c('b', '0')}. North: 100, 120, 90, 150 → total 460, best ${H.c('g', 'Q4')}.</p>`,
      brute: { why: `<p>One correlated scalar subquery per quarter cell reads the table 4 times per region row (plus once more for the total), and it fails with "more than one row" in strict engines or picks an arbitrary row when duplicates exist — exactly West's Q1. Grouping once is both faster and correct.</p>`,
        code: { lang: 'sql', db: 'shop', code: `-- Slow (k lookups per region) and fragile with duplicates (LIMIT 1 hides West's second Q1 row).
SELECT r.region,
       (SELECT revenue FROM quarterly_sales s WHERE s.region = r.region AND s.quarter = 'Q1' LIMIT 1) AS q1,
       (SELECT revenue FROM quarterly_sales s WHERE s.region = r.region AND s.quarter = 'Q2' LIMIT 1) AS q2,
       (SELECT revenue FROM quarterly_sales s WHERE s.region = r.region AND s.quarter = 'Q3' LIMIT 1) AS q3,
       (SELECT revenue FROM quarterly_sales s WHERE s.region = r.region AND s.quarter = 'Q4' LIMIT 1) AS q4
FROM (SELECT DISTINCT region FROM quarterly_sales) r;` } },
      mcq: { q: 'In SUM(CASE WHEN quarter = \'Q3\' THEN revenue END), what does a region with no Q3 rows get?', options: ['NULL', '0', 'An error', 'The region total'], answer: 0, explain: 'Every CASE yields NULL, and SUM over only NULLs is NULL. Add ELSE 0 (or wrap with COALESCE) to report 0.' },
      hints: [
        `<p>Hint 1: one output row per region means <code>GROUP BY region</code>; each quarter column is a filtered SUM.</p>`,
        `<p>Hint 2: <code>SUM(CASE WHEN quarter = 'Q1' THEN revenue ELSE 0 END)</code> sums duplicates and turns missing into 0.</p>`,
        `<p>Hint 3: compute the pivot in a CTE, then best_quarter with a CASE comparing the four columns (check Q1 ≥ all others first so ties pick the earliest), or unpivot + ROW_NUMBER.</p>`
      ],
      tests: { engine: 'sqlite', check: '(rows, cols, c) => {\n  if (c.plan || c.noplan) { const d = rows.map(r => r[r.length - 1]).join(\'\\n\'); return (!c.plan || new RegExp(c.plan).test(d)) && (!c.noplan || !new RegExp(c.noplan).test(d)); }\n  let a = rows, b = c.rows || [];\n  if (c.set) { const k = r => JSON.stringify(r); a = a.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); b = b.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); }\n  return a.length === b.length && a.every((r, i) => r.length === b[i].length && r.every((v, j) => v === b[i][j] || (typeof v === \'number\' && typeof b[i][j] === \'number\' && Math.abs(v - b[i][j]) < 1e-6)));\n}', cases: [
        { setup: '', rows: [
            ['North', 100, 120, 90, 150, 460, 'Q4'],
            ['West', 75, 70, 65, 85, 295, 'Q4'],
            ['South', 80, 95, 0, 110, 285, 'Q4']
          ] },
        { setup: 'DELETE FROM quarterly_sales', rows: [] },
        { setup: 'INSERT INTO quarterly_sales VALUES (\'East\',\'Q1\',500)', rows: [
            ['East', 500, 0, 0, 0, 500, 'Q1'],
            ['North', 100, 120, 90, 150, 460, 'Q4'],
            ['West', 75, 70, 65, 85, 295, 'Q4'],
            ['South', 80, 95, 0, 110, 285, 'Q4']
          ] },
        { setup: 'INSERT INTO quarterly_sales VALUES (\'East\',\'Q2\',7),(\'East\',\'Q2\',3),(\'East\',\'Q2\',0)', rows: [
            ['North', 100, 120, 90, 150, 460, 'Q4'],
            ['West', 75, 70, 65, 85, 295, 'Q4'],
            ['South', 80, 95, 0, 110, 285, 'Q4'],
            ['East', 0, 10, 0, 0, 10, 'Q2']
          ] },
        { setup: 'INSERT INTO quarterly_sales VALUES (\'East\',\'Q3\',50),(\'East\',\'Q1\',50)', rows: [
            ['North', 100, 120, 90, 150, 460, 'Q4'],
            ['West', 75, 70, 65, 85, 295, 'Q4'],
            ['South', 80, 95, 0, 110, 285, 'Q4'],
            ['East', 50, 0, 50, 0, 100, 'Q1']
          ] },
        { setup: 'INSERT INTO quarterly_sales VALUES (\'East\',\'Q4\',0)', rows: [
            ['North', 100, 120, 90, 150, 460, 'Q4'],
            ['West', 75, 70, 65, 85, 295, 'Q4'],
            ['South', 80, 95, 0, 110, 285, 'Q4'],
            ['East', 0, 0, 0, 0, 0, 'Q1']
          ] },
        { setup: 'DELETE FROM quarterly_sales WHERE region <> \'North\'', rows: [
            ['North', 100, 120, 90, 150, 460, 'Q4']
          ] },
        { setup: 'INSERT INTO quarterly_sales VALUES (\'East\',\'Q4\',1000000)', rows: [
            ['East', 0, 0, 0, 1000000, 1000000, 'Q4'],
            ['North', 100, 120, 90, 150, 460, 'Q4'],
            ['West', 75, 70, 65, 85, 295, 'Q4'],
            ['South', 80, 95, 0, 110, 285, 'Q4']
          ] },
        { setup: 'INSERT INTO quarterly_sales VALUES (\'Zed\',\'Q3\',460)', rows: [
            ['North', 100, 120, 90, 150, 460, 'Q4'],
            ['Zed', 0, 0, 460, 0, 460, 'Q3'],
            ['West', 75, 70, 65, 85, 295, 'Q4'],
            ['South', 80, 95, 0, 110, 285, 'Q4']
          ], set: true }
      ] },
      solution: {
        approach: `<p>Pivot with conditional SUMs (ELSE 0) in a CTE; in the outer query derive total and the best quarter using SQLite's multi-argument <code>MAX()</code> (GREATEST in other engines) and an ordered CASE for tie-breaking.</p>`,
        code: { lang: 'sql', db: 'shop', code: `WITH p AS (
  SELECT region,
         SUM(CASE WHEN quarter = 'Q1' THEN revenue ELSE 0 END) AS q1,
         SUM(CASE WHEN quarter = 'Q2' THEN revenue ELSE 0 END) AS q2,
         SUM(CASE WHEN quarter = 'Q3' THEN revenue ELSE 0 END) AS q3,
         SUM(CASE WHEN quarter = 'Q4' THEN revenue ELSE 0 END) AS q4
  FROM quarterly_sales
  GROUP BY region
)
SELECT region, q1, q2, q3, q4,
       q1 + q2 + q3 + q4 AS total,
       CASE MAX(q1, q2, q3, q4)          -- scalar MAX over columns (GREATEST elsewhere)
            WHEN q1 THEN 'Q1'            -- checked in order → earliest quarter wins ties
            WHEN q2 THEN 'Q2'
            WHEN q3 THEN 'Q3'
            ELSE 'Q4' END AS best_quarter
FROM p
ORDER BY total DESC;` },
        dry: { head: ['region', 'q1', 'q2', 'q3', 'q4', 'total', 'best'], rows: [['North', '100', '120', '90', '150', '460', 'Q4'], ['West', '75', '70', '65', '85', '295', 'Q4'], ['South', '80', '95', '0', '110', '285', 'Q4']] },
        complexity: `<p>One scan + one GROUP BY: O(n) with hashing (O(n log n) if sorted). Output is tiny.</p>`,
        followUps: ['Add a row of column totals at the bottom (UNION ALL or ROLLUP in other engines).', 'Show each quarter as a percentage of the region total.', 'Make the quarter list dynamic.']
      }
    }]
  });

  /* =====================================================================
     TOPIC 9 — Recursive hierarchies
     ===================================================================== */
  var ORG = [[1, 'Asha', null], [2, 'Ben', 1], [3, 'Cara', 1], [4, 'Dev', 2], [5, 'Eli', 2], [6, 'Fay', 4], [7, 'Gus', 4], [8, 'Hana', 5], [9, 'Ivan', 5], [10, 'Jia', 3], [11, 'Kofi', 10], [12, 'Lena', 10], [13, 'Mo', 1], [14, 'Nia', 13], [15, 'Omar', 13], [16, 'Pia', 14], [17, 'Raj', 14]];
  var ORGXY = { 1: [50, 6], 2: [23, 26], 3: [59, 26], 13: [87, 26], 4: [11, 46], 5: [35, 46], 10: [59, 46], 14: [81, 46], 15: [96, 46], 6: [5, 68], 7: [17, 68], 8: [29, 68], 9: [41, 68], 11: [53, 68], 12: [65, 68], 16: [76, 68], 17: [88, 68] };
  topics.push({
    title: 'Recursive Hierarchies (org charts, category trees, chains of command)',
    analogy: `<p>A <b>phone tree</b> at school: the principal calls the 3 heads of department; each of them calls their teachers; each teacher calls their class reps. Nobody needs the whole list up front — each round, the people <i>just called</i> call the people under them, until nobody is left to call. A recursive CTE runs exactly these rounds.</p>`,
    explain: `<p><b>The data:</b> a table that points at itself — <code>employees.manager_id → employees.id</code>, <code>categories.parent_id → categories.id</code>. Questions: "all reports (direct and indirect) of Ben", "the full org chart with levels", "the chain of command above Raj", "total salary of each manager's whole team", "breadcrumb path of a category". A JOIN goes down exactly one level; you do not know how many levels there are, so you need <b>recursion</b>.</p>
<p><b>Shape of a recursive CTE:</b></p>
<pre>WITH RECURSIVE org(id, name, depth, path) AS (
    SELECT …  FROM employees WHERE manager_id IS NULL      -- 1. anchor: the starting rows
  UNION ALL
    SELECT …  FROM employees e JOIN org o ON e.manager_id = o.id  -- 2. recursive step
)
SELECT * FROM org;</pre>
<p><b>How the engine runs it</b> (no magic — a loop):</p>
<ol>
<li>Run the anchor → put the rows in the result <b>and</b> in a "working table" (round 0: Asha).</li>
<li>Run the recursive part with <code>org</code> meaning <i>only the working table</i> (the rows found in the previous round) → round 1: Ben, Cara, Mo.</li>
<li>Append those to the result; they become the new working table. Repeat: round 2 (Dev, Eli, Jia, Nia, Omar), round 3 (8 people).</li>
<li>When a round returns <b>zero rows</b>, stop.</li>
</ol>
<p><b>Carry extra columns</b> as you go: <code>depth + 1</code> gives the level, <code>path || ' &gt; ' || name</code> gives the full chain ("Asha &gt; Mo &gt; Nia &gt; Raj"), and the starting id gives "which root does this row belong to" — the trick for per-manager rollups.</p>
<p><b>Direction:</b> to go <b>down</b> (reports), join <code>e.manager_id = o.id</code>; to go <b>up</b> (chain of command), start from the employee and join <code>e.id = o.manager_id</code>.</p>
<p><b>Safety:</b> real data can contain cycles (A manages B, B manages A, after a bad update). Recursion would never end. Guard with a depth limit (<code>WHERE o.depth &lt; 20</code>) or by refusing to revisit ids already in the path.</p>`,
    clues: [
      '"all direct and indirect reports", "everyone under manager X", "entire subtree" → recursive CTE going down',
      '"chain of command", "path to the root", "breadcrumbs" → recursive CTE going up (join on id = parent_id)',
      '"level / depth of each node", "print the org chart indented" → carry depth + path columns',
      '"total salary of each manager\'s whole team", "products in a category including subcategories" → recursive (ancestor, descendant) pairs + GROUP BY',
      '"unknown / variable number of levels", "self-referencing foreign key (parent_id)" → recursion, not a fixed number of self-joins',
      '"bill of materials", "graph reachability", "flights with connections" → recursive CTE with cycle protection'
    ],
    code: [{
      lang: 'sql', db: 'hr', title: 'Whole org chart with depth, path and indentation',
      code: `WITH RECURSIVE org(id, name, manager_id, depth, path) AS (
  -- anchor: the top of the tree (no manager)
  SELECT id, name, manager_id, 0, name
  FROM employees
  WHERE manager_id IS NULL
  UNION ALL
  -- recursive step: everyone whose manager was found in the previous round
  SELECT e.id, e.name, e.manager_id, o.depth + 1, o.path || ' > ' || e.name
  FROM employees e
  JOIN org o ON e.manager_id = o.id
  WHERE o.depth < 20                       -- safety net against cycles / runaway data
)
SELECT substr('                    ', 1, depth * 2) || name AS org_chart,   -- 2 spaces per level
       depth, path
FROM org
ORDER BY path;                             -- path order = depth-first, parents before children`
    }, {
      lang: 'sql', db: 'hr', title: 'Chain of command upward from Raj (id 17)',
      code: `WITH RECURSIVE up(id, name, manager_id, steps_up) AS (
  SELECT id, name, manager_id, 0 FROM employees WHERE id = 17      -- start at Raj
  UNION ALL
  SELECT e.id, e.name, e.manager_id, u.steps_up + 1
  FROM employees e
  JOIN up u ON e.id = u.manager_id                                  -- move to the manager
)
SELECT steps_up, name FROM up ORDER BY steps_up;   -- Raj, Nia, Mo, Asha`
    }],
    codeTitle: ['Org chart (down)', 'Chain of command (up)'],
    viz: {
      title: 'Recursive CTE round by round on the org chart',
      input: 'Asha',
      inputLabel: 'Start from (employee name)',
      gen: function (input) {
        var start = String(input || '').trim().toLowerCase();
        var root = ORG.filter(function (r) { return r[1].toLowerCase() === start; })[0];
        if (!root) throw new Error('Pick one of: ' + ORG.map(function (r) { return r[1]; }).join(', '));
        var nodes = ORG.map(function (r) { return { id: r[0], label: r[1], x: ORGXY[r[0]][0], y: ORGXY[r[0]][1] }; });
        var edges = ORG.filter(function (r) { return r[2] !== null; }).map(function (r) { return [r[2], r[0]]; });
        var frames = [], result = [], hl = {}, ehl = {}, tags = {};
        frames.push({ narr: 'The <code>employees</code> table points at itself: each row stores its <code>manager_id</code>. A plain JOIN can only go one level; we do not know how deep the tree under <b>' + root[1] + '</b> is, so we let a recursive CTE walk it round by round.', parts: [
          { type: 'graph', label: 'org chart', directed: true, height: 76, nodes: nodes, edges: edges, hl: (function () { var o = {}; o[root[0]] = 'sel'; return o; })() },
          { type: 'table', label: 'employees (id, name, manager_id)', columns: ['id', 'name', 'manager_id'], rows: ORG.map(function (r) { return [r[0], r[1], r[2] === null ? 'NULL' : r[2]]; }), hl: (function () { var o = {}; ORG.forEach(function (r, i) { if (r[0] === root[0]) o[i] = 'sel'; }); return o; })() } ] });
        var work = [[root[0], root[1], 0, root[1]]];
        hl[root[0]] = 'cur'; tags[root[0]] = 'depth 0';
        result.push(work[0].slice());
        frames.push({ narr: '<b>Anchor</b>: <code>SELECT … WHERE id = ' + root[0] + '</code> (' + root[1] + '). It goes into the result <i>and</i> the working table. depth = 0, path = "' + root[1] + '".', parts: [
          { type: 'graph', label: 'employees (arrows: manager → report)', directed: true, height: 76, nodes: nodes, edges: edges, hl: Object.assign({}, hl), tags: Object.assign({}, tags) },
          { type: 'table', label: 'working table (round 0)', columns: ['id', 'name', 'depth', 'path'], rows: copyRows(work), hl: span(0, work.length - 1, 'cur') },
          { type: 'code', lang: 'sql', code: 'WITH RECURSIVE org AS (\n  SELECT id, name, 0, name FROM employees WHERE id = ' + root[0] + '\n  UNION ALL\n  SELECT e.id, e.name, o.depth+1, o.path||\' > \'||e.name\n  FROM employees e JOIN org o ON e.manager_id = o.id\n)', hl: { 2: 'cur' } } ] });
        var round = 0;
        while (work.length && round < 6) {
          round++;
          var next = [];
          Object.keys(hl).forEach(function (k) { hl[k] = 'done'; });
          work.forEach(function (w) {
            ORG.forEach(function (r) {
              if (r[2] === w[0]) { next.push([r[0], r[1], w[2] + 1, w[3] + ' > ' + r[1]]); hl[r[0]] = 'ok'; ehl[w[0] + '-' + r[0]] = 'ok'; tags[r[0]] = 'depth ' + (w[2] + 1); }
            });
          });
          var e2 = {}; Object.keys(ehl).forEach(function (k) { e2[k] = ehl[k]; });
          if (!next.length) {
            frames.push({ narr: '<b>Round ' + round + '</b>: nobody reports to the ' + work.length + ' people in the working table → the recursive step returns <b>0 rows</b>. The engine stops. Total rows in the result: <b>' + result.length + '</b>.', parts: [
              { type: 'graph', label: 'everyone reached', directed: true, height: 76, nodes: nodes, edges: edges, hl: Object.assign({}, hl), ehl: e2, tags: Object.assign({}, tags) },
              { type: 'table', label: 'working table (round ' + round + ') — empty', columns: ['id', 'name', 'depth', 'path'], rows: [] },
              { type: 'table', label: 'final result', columns: ['id', 'name', 'depth', 'path'], rows: copyRows(result), hl: span(0, result.length - 1, 'sel') } ] });
            break;
          }
          var before = result.length;
          result = result.concat(next.map(function (r) { return r.slice(); }));
          frames.push({ narr: '<b>Round ' + round + '</b>: the recursive SELECT joins employees to the <i>working table only</i> (round ' + (round - 1) + '’s rows). It finds <b>' + next.length + '</b> new row(s) (green): ' + next.map(function (r) { return r[1]; }).join(', ') + '. depth = parent depth + 1, path = parent path + " &gt; " + name. These become the new working table.', parts: [
            { type: 'graph', label: 'reached so far', directed: true, height: 76, nodes: nodes, edges: edges, hl: Object.assign({}, hl), ehl: e2, tags: Object.assign({}, tags) },
            { type: 'table', label: 'working table (round ' + round + ')', columns: ['id', 'name', 'depth', 'path'], rows: copyRows(next), hl: span(0, next.length - 1, 'ok') },
            { type: 'table', label: 'result so far (UNION ALL)', columns: ['id', 'name', 'depth', 'path'], rows: copyRows(result), hl: span(before, result.length - 1, 'ok', span(0, before - 1, 'done')) } ] });
          for (var k in hl) if (hl[k] === 'ok') hl[k] = 'cur';
          work = next;
        }
        var chart = result.slice().sort(function (x, y) { return x[3] < y[3] ? -1 : x[3] > y[3] ? 1 : 0; });
        frames.push({ narr: 'Final answer ordered by <code>path</code> (depth-first): indentation = depth. ' + (result.length === 1 ? root[1] + ' has no reports, so the result is just the anchor row.' : 'The subtree of ' + root[1] + ' has <b>' + (result.length - 1) + '</b> people below them, reached in ' + (round - 1) + ' productive round(s).'), parts: [
          { type: 'table', label: 'ORDER BY path', columns: ['org_chart', 'depth', 'path'], rows: chart.map(function (r) { return [new Array(r[2] + 1).join('\u00a0\u00a0\u00a0') + r[1], r[2], r[3]]; }), hl: (function () { var o = {}; o[0] = 'sel'; return o; })() } ] });
        return frames;
      }
    },
    examples: [
      { title: 'All reports under Ben (direct and indirect)', html: `<p>Start the anchor at Ben instead of the root; exclude Ben himself with <code>depth &gt; 0</code>. Returns Dev, Eli (depth 1) and Fay, Gus, Hana, Ivan (depth 2).</p>`,
        code: { lang: 'sql', db: 'hr', code: `WITH RECURSIVE team(id, name, depth) AS (
  SELECT id, name, 0 FROM employees WHERE name = 'Ben'
  UNION ALL
  SELECT e.id, e.name, t.depth + 1
  FROM employees e JOIN team t ON e.manager_id = t.id
)
SELECT id, name, depth FROM team WHERE depth > 0 ORDER BY depth, name;` } },
      { title: 'Team size and total salary under every manager', html: `<p>The rollup trick: build <b>(ancestor, descendant)</b> pairs — every employee is paired with themselves, then extended downward. GROUP BY ancestor gives subtree size and cost. Ben's team (him + 6 reports) costs 955000; Asha's whole company 2261000.</p>`,
        code: { lang: 'sql', db: 'hr', code: `WITH RECURSIVE pairs(ancestor, descendant) AS (
  SELECT id, id FROM employees                       -- everyone is in their own subtree
  UNION ALL
  SELECT p.ancestor, e.id
  FROM pairs p JOIN employees e ON e.manager_id = p.descendant
)
SELECT a.name                AS manager,
       COUNT(*) - 1          AS total_reports,       -- minus the manager themself
       SUM(d.salary)         AS team_salary_incl_manager
FROM pairs
JOIN employees a ON a.id = pairs.ancestor
JOIN employees d ON d.id = pairs.descendant
GROUP BY a.id, a.name
HAVING COUNT(*) > 1                                  -- managers only
ORDER BY team_salary_incl_manager DESC;` } },
      { title: 'Products per category including all subcategories', html: `<p>Same pair trick on the <code>categories</code> tree. Electronics owns Phones, Laptops, Android, iPhone → 4 products worth 3900. LEFT JOIN keeps empty categories with 0.</p>`,
        code: { lang: 'sql', db: 'shop', code: `WITH RECURSIVE tree(root_id, id) AS (
  SELECT id, id FROM categories
  UNION ALL
  SELECT t.root_id, c.id FROM tree t JOIN categories c ON c.parent_id = t.id
)
SELECT c.name                      AS category,
       COUNT(p.product_id)         AS products,
       COALESCE(SUM(p.price), 0)   AS stock_value
FROM tree
JOIN categories c ON c.id = tree.root_id
LEFT JOIN products p ON p.category_id = tree.id
GROUP BY c.id, c.name
ORDER BY c.id;` } },
      { title: 'Breadcrumb trail for a category (walk upward, build the string)', html: `<p>Walk from "Chairs" up to the root, prepending each parent's name. The row that reaches the root (parent_id IS NULL) holds the full trail: ${H.c('g', 'All / Home / Furniture / Chairs')}.</p>`,
        code: { lang: 'sql', db: 'shop', code: `WITH RECURSIVE crumbs(id, parent_id, trail) AS (
  SELECT id, parent_id, name FROM categories WHERE name = 'Chairs'
  UNION ALL
  SELECT c.id, c.parent_id, c.name || ' / ' || cr.trail
  FROM categories c JOIN crumbs cr ON c.id = cr.parent_id
)
SELECT trail FROM crumbs WHERE parent_id IS NULL;` } }
    ],
    deepDive: `<p><b>Execution model:</b> SQL:1999 recursive CTEs are evaluated by <i>semi-naive iteration</i> — each round only joins the rows discovered in the previous round (the working table), not the whole result, so total work is proportional to the number of edges walked: O(V + E) with an index on <code>manager_id</code>; without it, every round scans the table: O(depth × n). Index the parent column.</p>
<p><b>UNION vs UNION ALL:</b> UNION ALL keeps duplicates and is the normal choice for trees. <code>UNION</code> removes rows already produced, which stops infinite loops on <i>graphs</i> with cycles — but only when the carried columns are identical (a growing depth/path column makes every row "new", so UNION alone will not save you). PostgreSQL 14+ adds <code>CYCLE id SET is_cycle USING path</code> and <code>SEARCH DEPTH FIRST BY</code>; SQL Server has <code>OPTION (MAXRECURSION n)</code> (default 100); MySQL 8 has <code>cte_max_recursion_depth</code> (default 1000). SQLite has no built-in limit — always add your own guard: <code>WHERE depth &lt; 50</code> or <code>WHERE instr(path, '/' || e.id || '/') = 0</code> with ids stored in the path.</p>
<p><b>Ordering the output:</b> rows come out in breadth-first rounds. For a depth-first, indented chart, ORDER BY a path built from zero-padded ids or sort keys (alphabetical names can mis-order siblings with shared prefixes). SQLite also supports <code>ORDER BY</code> inside the recursive CTE to switch to depth-first traversal.</p>
<p><b>Alternative tree models</b> (asked in design follow-ups): <i>adjacency list</i> (parent_id — simple writes, recursive reads), <i>materialised path</i> ('/1/2/4/' — subtree = LIKE '/1/2/%', cheap reads, expensive moves), <i>nested sets</i> (lft/rgt numbers — fast subtree reads, painful inserts), <i>closure table</i> (all ancestor/descendant pairs stored, like our <code>pairs</code> CTE — fast reads, O(depth) extra rows per node). Postgres has the <code>ltree</code> type; SQL Server <code>hierarchyid</code>; graph databases (Neo4j) make deep traversals native.</p>`,
    aiEra: `<p><b>What AI changes:</b> models write recursive CTEs well for the textbook org chart. They are much weaker at the production concerns: cycle protection, indexes on the parent column, recursion limits per engine, and the semantics of UNION vs UNION ALL with carried columns.</p>
<p><b>Use AI as a partner:</b> ask <code>Add cycle protection to this recursive CTE for SQLite and show a test row that would loop forever without it</code>. Ask it to explain the round-by-round working table for your query on 5 rows — if its explanation says the recursive part sees "all previous rows", it is wrong (only the last round).</p>
<p><b>Where AI goes wrong:</b> joining in the wrong direction (getting managers instead of reports), forgetting <code>RECURSIVE</code> (required in SQLite/Postgres/MySQL, not in SQL Server), relying on UNION to stop cycles while carrying a depth column, and ordering an org chart by name instead of path.</p>
<p><b>What you must still own:</b> choosing the tree model for your read/write pattern, knowing the termination argument, and putting the guard in before the query meets real, messy data.</p>`,
    problems: [{
      title: 'Org Chart Under a Manager with Levels', level: 'Hard', tags: ['recursive cte', 'hierarchy'], companies: ['LinkedIn', 'Microsoft', 'Workday'],
      statement: `<p>Given <code>employees(id, name, manager_id, salary, …)</code>, return every person in the <b>subtree</b> of the manager named <code>'Mo'</code> (including Mo) with columns <code>name, level</code> (Mo = 0), <code>path</code> (e.g. "Mo &gt; Nia &gt; Pia"), <code>direct_reports</code> (number of people reporting directly to that person). Order depth-first by path.</p>`,
      constraints: `Up to 10<sup>5</sup> employees; depth unknown (≤ 30); there may be bad data with cycles — the query must still terminate.`,
      example: `<p>${H.c('g', 'Mo')} (0, 2 direct) → Nia (1, 2 direct) → Pia (2, 0), Raj (2, 0); Omar (1, 0). Five rows.</p>`,
      brute: { why: `<p>Fixed self-joins (<code>e1 → e2 → e3 …</code>) only reach as many levels as you write joins, and silently miss deeper people when the org grows; UNIONing one query per level duplicates logic and still assumes a maximum depth.</p>`,
        code: { lang: 'sql', db: 'hr', code: `-- Only reaches 2 levels below Mo; a 3rd level would be silently missed.
SELECT m.name AS level0, l1.name AS level1, l2.name AS level2
FROM employees m
LEFT JOIN employees l1 ON l1.manager_id = m.id
LEFT JOIN employees l2 ON l2.manager_id = l1.id
WHERE m.name = 'Mo';` } },
      mcq: { q: 'In round 2 of a recursive CTE, what does the reference to the CTE inside the recursive SELECT contain?', options: ['Only the rows produced in round 1', 'All rows produced so far', 'Only the anchor rows', 'The whole base table'], answer: 0, explain: 'Each iteration joins against the working table — the rows produced by the previous iteration. That is why the recursion terminates once a round yields nothing.' },
      hints: [
        `<p>Hint 1: anchor = Mo with level 0 and path 'Mo'; the recursive part follows <code>e.manager_id = t.id</code>.</p>`,
        `<p>Hint 2: carry <code>level + 1</code> and <code>path || ' &gt; ' || e.name</code>; add <code>WHERE t.level &lt; 30</code> so a cycle cannot loop forever.</p>`,
        `<p>Hint 3: direct_reports is a correlated <code>COUNT(*)</code> on manager_id = id (or a LEFT JOIN to a GROUP BY manager_id). ORDER BY path.</p>`
      ],
      tests: { engine: 'sqlite', check: '(rows, cols, c) => {\n  if (c.plan || c.noplan) { const d = rows.map(r => r[r.length - 1]).join(\'\\n\'); return (!c.plan || new RegExp(c.plan).test(d)) && (!c.noplan || !new RegExp(c.noplan).test(d)); }\n  let a = rows, b = c.rows || [];\n  if (c.set) { const k = r => JSON.stringify(r); a = a.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); b = b.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); }\n  return a.length === b.length && a.every((r, i) => r.length === b[i].length && r.every((v, j) => v === b[i][j] || (typeof v === \'number\' && typeof b[i][j] === \'number\' && Math.abs(v - b[i][j]) < 1e-6)));\n}', cases: [
        { rows: [
            ['Mo', 0, 'Mo', 2],
            ['Nia', 1, 'Mo > Nia', 2],
            ['Pia', 2, 'Mo > Nia > Pia', 0],
            ['Raj', 2, 'Mo > Nia > Raj', 0],
            ['Omar', 1, 'Mo > Omar', 0]
          ] },
        { setup: 'INSERT INTO employees VALUES (18,\'Sam\',\'Sales\',1,16,\'2024-01-01\')', rows: [
            ['Mo', 0, 'Mo', 2],
            ['Nia', 1, 'Mo > Nia', 2],
            ['Pia', 2, 'Mo > Nia > Pia', 1],
            ['Sam', 3, 'Mo > Nia > Pia > Sam', 0],
            ['Raj', 2, 'Mo > Nia > Raj', 0],
            ['Omar', 1, 'Mo > Omar', 0]
          ] },
        { setup: 'INSERT INTO employees VALUES (18,\'Sam\',\'Sales\',1,16,\'2024-01-01\'); INSERT INTO employees VALUES (19,\'Tia\',\'Sales\',1,18,\'2024-01-01\'); INSERT INTO employees VALUES (20,\'Uma\',\'Sales\',1,19,\'2024-01-01\')', rows: [
            ['Mo', 0, 'Mo', 2],
            ['Nia', 1, 'Mo > Nia', 2],
            ['Pia', 2, 'Mo > Nia > Pia', 1],
            ['Sam', 3, 'Mo > Nia > Pia > Sam', 1],
            ['Tia', 4, 'Mo > Nia > Pia > Sam > Tia', 1],
            ['Uma', 5, 'Mo > Nia > Pia > Sam > Tia > Uma', 0],
            ['Raj', 2, 'Mo > Nia > Raj', 0],
            ['Omar', 1, 'Mo > Omar', 0]
          ] },
        { setup: 'DELETE FROM employees WHERE id IN (13)', rows: [] },
        { setup: 'UPDATE employees SET manager_id = 10 WHERE id = 3', rows: [
            ['Mo', 0, 'Mo', 2],
            ['Nia', 1, 'Mo > Nia', 2],
            ['Pia', 2, 'Mo > Nia > Pia', 0],
            ['Raj', 2, 'Mo > Nia > Raj', 0],
            ['Omar', 1, 'Mo > Omar', 0]
          ] },
        { setup: 'UPDATE employees SET manager_id = 13 WHERE id = 17', rows: [
            ['Mo', 0, 'Mo', 3],
            ['Nia', 1, 'Mo > Nia', 1],
            ['Pia', 2, 'Mo > Nia > Pia', 0],
            ['Omar', 1, 'Mo > Omar', 0],
            ['Raj', 1, 'Mo > Raj', 0]
          ] },
        { setup: 'UPDATE employees SET manager_id = 2 WHERE id = 14', rows: [
            ['Mo', 0, 'Mo', 1],
            ['Omar', 1, 'Mo > Omar', 0]
          ] },
        { setup: 'INSERT INTO employees VALUES (18,\'Aaron\',\'Sales\',1,13,\'2024-01-01\')', rows: [
            ['Mo', 0, 'Mo', 3],
            ['Aaron', 1, 'Mo > Aaron', 0],
            ['Nia', 1, 'Mo > Nia', 2],
            ['Pia', 2, 'Mo > Nia > Pia', 0],
            ['Raj', 2, 'Mo > Nia > Raj', 0],
            ['Omar', 1, 'Mo > Omar', 0]
          ] },
        { setup: 'INSERT INTO employees VALUES (18,\'Bob\',\'Sales\',1,13,\'2024-01-01\'); INSERT INTO employees VALUES (19,\'Bo\',\'Sales\',1,13,\'2024-01-01\')', rows: [
            ['Mo', 0, 'Mo', 4],
            ['Bo', 1, 'Mo > Bo', 0],
            ['Bob', 1, 'Mo > Bob', 0],
            ['Nia', 1, 'Mo > Nia', 2],
            ['Pia', 2, 'Mo > Nia > Pia', 0],
            ['Raj', 2, 'Mo > Nia > Raj', 0],
            ['Omar', 1, 'Mo > Omar', 0]
          ] },
        { setup: 'DELETE FROM employees WHERE id NOT IN (13)', rows: [
            ['Mo', 0, 'Mo', 0]
          ] }
      ] },
      solution: {
        approach: `<p>Recursive CTE from the chosen manager downward, carrying level and path, with a depth guard; then attach direct-report counts from a grouped subquery.</p>`,
        code: { lang: 'sql', db: 'hr', code: `WITH RECURSIVE sub(id, name, level, path) AS (
  SELECT id, name, 0, name FROM employees WHERE name = 'Mo'
  UNION ALL
  SELECT e.id, e.name, s.level + 1, s.path || ' > ' || e.name
  FROM employees e
  JOIN sub s ON e.manager_id = s.id
  WHERE s.level < 30                                  -- cycle / runaway guard
),
direct AS (
  SELECT manager_id, COUNT(*) AS n FROM employees GROUP BY manager_id
)
SELECT s.name, s.level, s.path, COALESCE(d.n, 0) AS direct_reports
FROM sub s
LEFT JOIN direct d ON d.manager_id = s.id
ORDER BY s.path;` },
        dry: { head: ['round', 'working table', 'rows added'], rows: [['0 (anchor)', 'Mo', '1'], ['1', 'Nia, Omar', '2'], ['2', 'Pia, Raj', '2'], ['3', '(empty)', 'stop']] },
        complexity: `<p>O(size of subtree) index probes with an index on <code>manager_id</code>; O(rounds × n) table scans without one. The direct-report aggregate is one O(n) pass.</p>`,
        followUps: ['Return the total salary of each subtree.', 'Detect and report employees involved in a reporting cycle.', 'Find the lowest common manager of two employees.']
      }
    }]
  });

  /* =====================================================================
     TOPIC 10 — Duplicate detection & removal
     ===================================================================== */
  topics.push({
    title: 'Finding & Removing Duplicates (keep one survivor per key)',
    analogy: `<p>Your phone's <b>contacts list</b> after syncing three devices: "Asha Rao", "asha rao ", "Asha R." — all the same person. Cleaning up is two decisions: <b>what makes two entries "the same"</b> (same email, ignoring capitals and spaces?) and <b>which copy to keep</b> (the newest? the most complete?). The SQL is easy once those two decisions are made.</p>`,
    explain: `<p><b>Step 1 — define the duplicate key.</b> Exact duplicates share every column. Business duplicates share a <i>key</i>: the same email, the same (customer, product, day). Real data needs <b>normalising</b> the key first: <code>LOWER(TRIM(email))</code>. In <code>customers_raw</code>, grouping by raw email finds 2 duplicate groups; grouping by the normalised email finds 3 (asha has three rows: <code>asha@mail.com</code>, <code>Asha@Mail.com </code>, <code>asha@mail.com</code>).</p>
<p><b>Step 2 — find them:</b> <code>GROUP BY key HAVING COUNT(*) &gt; 1</code> shows each duplicated key and how many copies.</p>
<p><b>Step 3 — choose the survivor</b> with <code>ROW_NUMBER() OVER (PARTITION BY key ORDER BY &lt;preference&gt;)</code>; rn = 1 is the keeper, rn &gt; 1 are the extras.</p>
${H.table(['id', 'normalised email', 'created_at', 'rn (newest first)', 'action'], [['6', 'asha@mail.com', '2024-02-20', '1', H.c('g', 'keep')], ['3', 'asha@mail.com', '2023-06-01', '2', H.c('r', 'delete')], ['1', 'asha@mail.com', '2023-01-05', '3', H.c('r', 'delete')], ['4', 'ben@mail.com', '2024-01-15', '1', H.c('g', 'keep')], ['2', 'ben@mail.com', '2023-02-10', '2', H.c('r', 'delete')], ['8', 'cara@mail.com', '2023-03-03', '1 (tie → higher id)', H.c('g', 'keep')], ['5', 'cara@mail.com', '2023-03-03', '2', H.c('r', 'delete')]])}
<p><b>Step 4 — act:</b></p>
<ul>
<li><b>Read-only dedupe</b> (reports): select rows with rn = 1.</li>
<li><b>Physical delete</b>: <code>DELETE FROM t WHERE id IN (SELECT id FROM (…ROW_NUMBER…) WHERE rn &gt; 1)</code>. Classic alternatives: keep the minimum id per key (<code>WHERE id NOT IN (SELECT MIN(id) … GROUP BY key)</code>) or a self-join "a twin with a smaller id exists" (<code>WHERE EXISTS (… k.id &lt; t.id)</code>).</li>
<li><b>No primary key?</b> SQLite's hidden <code>rowid</code> (Postgres <code>ctid</code>, Oracle <code>ROWID</code>) tells identical rows apart: <code>DELETE FROM t WHERE rowid NOT IN (SELECT MIN(rowid) FROM t GROUP BY all, columns)</code>.</li>
</ul>
<p><b>Step 5 — stop it happening again:</b> normalise on write and add a <code>UNIQUE</code> constraint/index; then inserts use <code>INSERT … ON CONFLICT DO NOTHING</code> (or DO UPDATE — an upsert).</p>
<p><b>Cousin problem — consecutive duplicates:</b> a history table that repeats the same value (salary unchanged at a "raise" date). Keep only <i>changes</i> with <code>LAG(value) … WHERE prev IS NULL OR value &lt;&gt; prev</code>.</p>`,
    clues: [
      '"find duplicate emails", "which values appear more than once" → GROUP BY key HAVING COUNT(*) &gt; 1',
      '"delete duplicates, keep the one with the smallest id" (LeetCode 196) → DELETE … NOT IN (SELECT MIN(id) … GROUP BY key) or EXISTS with a smaller id',
      '"keep the latest / most complete record per key" → ROW_NUMBER() OVER (PARTITION BY key ORDER BY updated_at DESC, id DESC), delete rn &gt; 1',
      '"case-insensitive", "extra spaces", "same customer different spellings" → normalise the key (LOWER/TRIM) before partitioning',
      '"table has no primary key, rows are fully identical" → rowid / ctid, or rebuild with SELECT DISTINCT',
      '"remove consecutive repeated values", "keep only rows where the value changed" → LAG comparison'
    ],
    code: [{
      lang: 'sql', db: 'shop', title: 'Inspect duplicates and pick a survivor (read-only)',
      code: `-- 1) Which normalised emails are duplicated, and which ids share them?
SELECT LOWER(TRIM(email)) AS email_key,
       COUNT(*)           AS copies,
       GROUP_CONCAT(id)   AS ids
FROM customers_raw
GROUP BY LOWER(TRIM(email))
HAVING COUNT(*) > 1;

-- 2) Rank copies: newest first, higher id breaks ties. rn = 1 survives.
SELECT id, email, full_name, created_at,
       ROW_NUMBER() OVER (PARTITION BY LOWER(TRIM(email))
                          ORDER BY created_at DESC, id DESC) AS rn
FROM customers_raw
ORDER BY LOWER(TRIM(email)), rn;`
    }, {
      lang: 'sql', db: 'shop', title: 'Delete the extras, normalise, and prevent new duplicates',
      code: `-- Delete every copy except the newest per normalised email.
DELETE FROM customers_raw
WHERE id IN (
  SELECT id FROM (
    SELECT id,
           ROW_NUMBER() OVER (PARTITION BY LOWER(TRIM(email))
                              ORDER BY created_at DESC, id DESC) AS rn
    FROM customers_raw
  )
  WHERE rn > 1
);

-- Store the clean form, then let the database enforce uniqueness from now on.
UPDATE customers_raw SET email = LOWER(TRIM(email));
CREATE UNIQUE INDEX ux_customers_raw_email ON customers_raw(email);

-- A late duplicate sign-up is now ignored instead of creating a 2nd row.
INSERT INTO customers_raw (email, full_name, created_at)
VALUES ('dan@mail.com', 'Dan W.', '2024-05-01')
ON CONFLICT(email) DO NOTHING;

SELECT * FROM customers_raw ORDER BY id;     -- 4 clean rows: ids 4, 6, 7, 8`
    }],
    codeTitle: ['Find + rank', 'Delete + prevent'],
    viz: {
      title: 'Dedupe: normalise → partition → ROW_NUMBER → delete rn > 1',
      input: '1 asha@mail.com 2023-01-05, 2 BEN@mail.com 2023-02-10, 3 Asha@Mail.com 2023-06-01, 4 ben@mail.com 2024-01-15, 5 cara@mail.com 2023-03-03, 6 asha@mail.com 2024-02-20, 7 dan@mail.com 2023-04-04, 8 cara@mail.com 2023-03-03',
      inputLabel: '"id email date" rows, comma separated (max 12)',
      gen: function (input) {
        var rows = items(input).map(function (it) {
          var p = it.split(/\s+/);
          if (p.length !== 3 || isNaN(Number(p[0])) || !/^\d{4}-\d{2}-\d{2}$/.test(p[2])) throw new Error('Each row: id email YYYY-MM-DD');
          return { id: Number(p[0]), email: p[1], d: p[2], key: p[1].trim().toLowerCase() };
        });
        if (rows.length > 12) throw new Error('Use at most 12 rows');
        var frames = [];
        frames.push({ narr: 'Raw sign-ups. Some are the same person with different capitalisation.', parts: [
          { type: 'table', label: 'customers_raw', columns: ['id', 'email', 'created_at'], rows: rows.map(function (r) { return [r.id, r.email, r.d]; }) } ] });
        var exact = {}, hlx = {};
        rows.forEach(function (r) { exact[r.email] = (exact[r.email] || 0) + 1; });
        rows.forEach(function (r, i) { if (exact[r.email] > 1) hlx[i] = 'cur'; });
        var nx = Object.keys(exact).filter(function (k) { return exact[k] > 1; }).length;
        frames.push({ narr: 'Naive check: <code>GROUP BY email HAVING COUNT(*) &gt; 1</code> on the raw text finds only <b>' + nx + '</b> duplicated value(s) (amber). Capital letters make "BEN@mail.com" and "ben@mail.com" look different.', parts: [
          { type: 'table', label: 'exact-match duplicates', columns: ['id', 'email', 'created_at'], rows: rows.map(function (r) { return [r.id, r.email, r.d]; }), hl: hlx } ] });
        var cnt = {}; rows.forEach(function (r) { cnt[r.key] = (cnt[r.key] || 0) + 1; });
        var hln = {}; rows.forEach(function (r, i) { if (cnt[r.key] > 1) hln[i] = 'cur'; });
        frames.push({ narr: 'Normalise the key with <code>LOWER(TRIM(email))</code>: now <b>' + Object.keys(cnt).filter(function (k) { return cnt[k] > 1; }).length + '</b> keys are duplicated. Always decide the key <i>before</i> deduplicating.', parts: [
          { type: 'table', label: 'with normalised key', columns: ['id', 'email', 'email_key', 'created_at'], rows: rows.map(function (r) { return [r.id, r.email, r.key, r.d]; }), hl: hln },
          { type: 'map', label: 'copies per key', entries: Object.keys(cnt).map(function (k) { return [k, cnt[k]]; }), hl: (function () { var o = {}; Object.keys(cnt).forEach(function (k) { if (cnt[k] > 1) o[k] = 'bad'; }); return o; })() } ] });
        var s = rows.slice().sort(function (a, b) { return a.key < b.key ? -1 : a.key > b.key ? 1 : (a.d < b.d ? 1 : a.d > b.d ? -1 : b.id - a.id); });
        var out = [], hp = {}, k = -1;
        s.forEach(function (r, i) { var nw = i === 0 || r.key !== s[i - 1].key; if (nw) k++; hp[i] = k % 2 ? 'sel' : 'win'; });
        frames.push({ narr: '<code>PARTITION BY email_key ORDER BY created_at DESC, id DESC</code>: each colour block is one person, newest copy first. The id tie-breaker decides between copies with the same date.', parts: [
          { type: 'table', label: 'partitioned', columns: ['email_key', 'id', 'created_at'], rows: s.map(function (r) { return [r.key, r.id, r.d]; }), hl: hp } ] });
        var rn = 0;
        s.forEach(function (r, i) {
          rn = (i === 0 || r.key !== s[i - 1].key) ? 1 : rn + 1;
          out.push([r.key, r.id, r.d, rn, rn === 1 ? 'keep' : 'delete']);
        });
        var hd = {}; out.forEach(function (r, i) { hd[i] = r[3] === 1 ? 'ok' : 'bad'; });
        frames.push({ narr: '<code>ROW_NUMBER()</code> restarts at 1 for every key. rn = 1 (green) survives; rn &gt; 1 (red) are the extra copies — <b>' + out.filter(function (r) { return r[3] > 1; }).length + '</b> rows to delete.', parts: [
          { type: 'table', label: 'ROW_NUMBER per key', columns: ['email_key', 'id', 'created_at', 'rn', 'action'], rows: copyRows(out), hl: hd } ] });
        var del = out.filter(function (r) { return r[3] > 1; }).map(function (r) { return r[1]; });
        frames.push({ narr: '<code>DELETE FROM customers_raw WHERE id IN (' + (del.join(', ') || '—') + ')</code>. The subquery decides <i>which</i> ids; the DELETE only needs their primary keys.', parts: [
          { type: 'set', label: 'ids to delete', items: del, hl: (function () { var o = {}; del.forEach(function (d) { o[d] = 'bad'; }); return o; })() },
          { type: 'code', lang: 'sql', code: 'DELETE FROM customers_raw\nWHERE id IN (\n  SELECT id FROM (SELECT id, ROW_NUMBER() OVER (\n      PARTITION BY LOWER(TRIM(email))\n      ORDER BY created_at DESC, id DESC) AS rn\n    FROM customers_raw)\n  WHERE rn > 1);', hl: { 7: 'bad' } } ] });
        var keep = rows.filter(function (r) { return del.indexOf(r.id) < 0; });
        frames.push({ narr: 'Result: <b>' + keep.length + '</b> clean rows, one per person. Next: normalise the stored email and add a UNIQUE index so duplicates cannot come back.', parts: [
          { type: 'table', label: 'customers_raw after DELETE', columns: ['id', 'email', 'created_at'], rows: keep.map(function (r) { return [r.id, r.email, r.d]; }), hl: span(0, keep.length - 1, 'ok') } ] });
        return frames;
      }
    },
    examples: [
      { title: 'LeetCode 196: delete duplicate emails, keep the smallest id', html: `<p>Exact (case-sensitive) email match, survivor = smallest id. Removes ids 6 and 8. Note the derived table: MySQL refuses <code>DELETE … WHERE id NOT IN (SELECT … FROM same_table)</code> unless the subquery is wrapped one level deeper; SQLite and Postgres accept it directly.</p>`,
        code: { lang: 'sql', db: 'shop', code: `DELETE FROM customers_raw
WHERE id NOT IN (SELECT keep_id
                 FROM (SELECT MIN(id) AS keep_id
                       FROM customers_raw
                       GROUP BY email));

SELECT id, email FROM customers_raw ORDER BY id;` } },
      { title: 'Self-join style: "a twin with a smaller id exists"', html: `<p>The pre-window classic: delete a row if another row with the same key and a smaller id exists. Correct and index-friendly (index on <code>(email, id)</code>), but it is a correlated check per row; without the index it is O(n²).</p>`,
        code: { lang: 'sql', db: 'shop', code: `DELETE FROM customers_raw
WHERE EXISTS (SELECT 1
              FROM customers_raw older
              WHERE older.email = customers_raw.email
                AND older.id    < customers_raw.id);

SELECT id, email FROM customers_raw ORDER BY id;` } },
      { title: 'Fully identical rows with no primary key → rowid', html: `<p>When every column is equal there is nothing to tell rows apart — except the physical row id. SQLite's <code>rowid</code> (Postgres <code>ctid</code>) is hidden but always there (unless the table is <code>WITHOUT ROWID</code>).</p>`,
        code: { lang: 'sql', code: `CREATE TABLE scans (sku TEXT, qty INTEGER);
INSERT INTO scans VALUES ('A1', 2), ('A1', 2), ('B7', 1), ('A1', 2);

DELETE FROM scans
WHERE rowid NOT IN (SELECT MIN(rowid) FROM scans GROUP BY sku, qty);

SELECT rowid, sku, qty FROM scans;   -- (1, A1, 2) and (3, B7, 1)` } },
      { title: 'Consecutive duplicates: keep only real salary changes', html: `<p>Fay's history repeats 90000 on 2021-04-01 (a "raise" of zero). LAG compares each row with the previous one for the same employee; rows equal to the previous value are noise. 11 rows → 10.</p>`,
        code: { lang: 'sql', db: 'hr', code: `SELECT emp_id, effective_date, salary
FROM (SELECT emp_id, effective_date, salary,
             LAG(salary) OVER (PARTITION BY emp_id ORDER BY effective_date) AS prev_salary
      FROM salary_changes)
WHERE prev_salary IS NULL OR salary <> prev_salary
ORDER BY emp_id, effective_date;` } }
    ],
    deepDive: `<p><b>Choosing the survivor is a business rule.</b> Newest (latest data), oldest (original sign-up date, preserves foreign keys), most complete (<code>ORDER BY (phone IS NULL), (address IS NULL), updated_at DESC</code>), or <b>merge</b> (coalesce the best field from each copy, then delete). Before deleting, <b>re-point foreign keys</b> (orders of the deleted customer ids) to the survivor — otherwise you orphan data or the FK blocks the delete.</p>
<p><b>Safety in production:</b> run the SELECT version first and count the rows; wrap DELETE in a transaction; on huge tables delete in batches (e.g. 10k ids per statement) to avoid long locks and replication lag; or build a clean copy (<code>CREATE TABLE new AS SELECT … WHERE rn = 1</code>), swap names, and drop the old table — often faster than deleting 40% of a table in place.</p>
<p><b>Performance:</b> the window approach is one sort by the key — O(n log n). <code>NOT IN (SELECT MIN(id) … GROUP BY key)</code> is one aggregation plus an anti-join — fine, but beware NOT IN with NULLs: if the subquery ever yields NULL, <code>NOT IN</code> returns no rows (here MIN(id) of a PK cannot be NULL). The EXISTS self-join needs an index on the key or it degrades to O(n²).</p>
<p><b>Fuzzy duplicates</b> ("Jon Smith" vs "John Smith", typos in addresses) are beyond equality: use blocking keys (same postcode), similarity functions (Postgres <code>pg_trgm</code> similarity, Levenshtein), phonetic codes (Soundex/Metaphone), or entity-resolution tools / ML. SQL handles the exact and normalised cases; record linkage is a separate discipline.</p>
<p><b>Prevention beats cure:</b> a UNIQUE constraint on the normalised key (store normalised, or use an expression index — SQLite and Postgres support <code>CREATE UNIQUE INDEX … ON t(lower(email))</code>), idempotent ingestion (<code>ON CONFLICT DO NOTHING / DO UPDATE</code>, MERGE), and dedupe keys in event pipelines (Kafka idempotent producers, exactly-once sinks).</p>`,
    aiEra: `<p><b>What AI changes:</b> "delete duplicates keep latest" is a one-prompt task. The danger is that DELETE is irreversible — a model's subtle mistake (wrong ORDER BY direction, missing tie-breaker, case-sensitive key) destroys the <i>wrong</i> rows.</p>
<p><b>Use AI as a partner:</b> always ask for the <b>SELECT preview first</b>: <code>Show me the rows this DELETE would remove, with the survivor next to each</code>. Ask it to list normalisation issues it sees in a sample of your data (trailing spaces, case, Unicode look-alikes, plus-addressing like asha+promo@mail.com) and decide which ones count as duplicates.</p>
<p><b>Where AI goes wrong:</b> deleting rn = 1 instead of rn &gt; 1, ORDER BY created_at ASC when "keep latest" was asked, forgetting foreign keys, using MySQL-illegal self-referencing DELETE subqueries, and <code>NOT IN</code> with a nullable column.</p>
<p><b>What you must still own:</b> the definition of "same", the survivor rule, the backup/transaction plan, and the constraint that prevents recurrence. These are data-governance decisions with real customer impact.</p>`,
    problems: [{
      title: 'Keep the Latest Record per Customer Email', level: 'Medium', tags: ['dedupe', 'row_number', 'delete'], companies: ['Stripe', 'Salesforce', 'Uber'],
      statement: `<p>Table <code>customers_raw(id, email, full_name, created_at)</code> contains duplicate sign-ups. Two rows are the same customer if their emails match after trimming spaces and ignoring case. <b>Delete</b> every row except the most recently created one per customer (if two copies share created_at, keep the higher id), then return the remaining rows ordered by id.</p>`,
      constraints: `Up to 10<sup>7</sup> rows; id is the primary key; emails may contain upper case and trailing spaces.`,
      example: `<p>asha has ids 1 (2023-01-05), 3 (2023-06-01), ${H.c('g', '6 (2024-02-20)')} → keep 6. cara has ids 5 and 8, both 2023-03-03 → keep ${H.c('g', '8')} (higher id). Result ids: ${H.c('g', '4, 6, 7, 8')}.</p>`,
      brute: { why: `<p>Grouping by the raw <code>email</code> treats "BEN@mail.com" and "ben@mail.com" as different people, and keeping <code>MAX(id)</code> assumes ids follow creation time (they do not have to — imports can insert old records late). Fast but ${H.c('r', 'wrong')}: it keeps both Ben rows and two of the three Asha rows.</p>`,
        code: { lang: 'sql', db: 'shop', code: `-- Case-sensitive key + "highest id = newest" assumption: wrong survivors.
DELETE FROM customers_raw
WHERE id NOT IN (SELECT MAX(id) FROM customers_raw GROUP BY email);

SELECT id, email, created_at FROM customers_raw ORDER BY id;` } },
      mcq: { q: 'You ranked copies with ROW_NUMBER() OVER (PARTITION BY key ORDER BY created_at DESC). Which rows do you delete to "keep the latest"?', options: ['rn &gt; 1', 'rn = 1', 'rn &lt; COUNT(*)', 'all rows with created_at below the average'], answer: 0, explain: 'DESC order puts the newest copy at rn = 1; every other copy (rn &gt; 1) is an extra and gets deleted.' },
      hints: [
        `<p>Hint 1: the duplicate key is <code>LOWER(TRIM(email))</code>, not email.</p>`,
        `<p>Hint 2: <code>ROW_NUMBER() OVER (PARTITION BY LOWER(TRIM(email)) ORDER BY created_at DESC, id DESC)</code> marks the survivor as rn = 1.</p>`,
        `<p>Hint 3: <code>DELETE … WHERE id IN (SELECT id FROM (ranked) WHERE rn &gt; 1)</code>; preview with a SELECT first; end with a SELECT of the table.</p>`
      ],
      tests: { engine: 'sqlite', check: '(rows, cols, c) => {\n  if (c.plan || c.noplan) { const d = rows.map(r => r[r.length - 1]).join(\'\\n\'); return (!c.plan || new RegExp(c.plan).test(d)) && (!c.noplan || !new RegExp(c.noplan).test(d)); }\n  let a = rows, b = c.rows || [];\n  if (c.set) { const k = r => JSON.stringify(r); a = a.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); b = b.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); }\n  return a.length === b.length && a.every((r, i) => r.length === b[i].length && r.every((v, j) => v === b[i][j] || (typeof v === \'number\' && typeof b[i][j] === \'number\' && Math.abs(v - b[i][j]) < 1e-6)));\n}', cases: [
        { setup: '', rows: [
            [4, 'ben@mail.com', 'Benjamin Ode', '2024-01-15'],
            [6, 'asha@mail.com', 'Asha Rao', '2024-02-20'],
            [7, 'dan@mail.com', 'Dan Wu', '2023-04-04'],
            [8, 'cara@mail.com', 'Cara Lim', '2023-03-03']
          ] },
        { setup: 'INSERT INTO customers_raw VALUES (9,\'asha@mail.com\',\'Asha New\',\'2024-03-01\')', rows: [
            [4, 'ben@mail.com', 'Benjamin Ode', '2024-01-15'],
            [7, 'dan@mail.com', 'Dan Wu', '2023-04-04'],
            [8, 'cara@mail.com', 'Cara Lim', '2023-03-03'],
            [9, 'asha@mail.com', 'Asha New', '2024-03-01']
          ] },
        { setup: 'INSERT INTO customers_raw VALUES (9,\'ASHA@MAIL.COM\',\'Asha New\',\'2020-01-01\')', rows: [
            [4, 'ben@mail.com', 'Benjamin Ode', '2024-01-15'],
            [6, 'asha@mail.com', 'Asha Rao', '2024-02-20'],
            [7, 'dan@mail.com', 'Dan Wu', '2023-04-04'],
            [8, 'cara@mail.com', 'Cara Lim', '2023-03-03']
          ] },
        { setup: 'INSERT INTO customers_raw VALUES (9,\'  eve@mail.com\',\'Eve\',\'2024-01-01\'),(10,\'eve@mail.com  \',\'Eve\',\'2024-01-01\'),(11,\'eve@mail.com\',\'Eve\',\'2024-01-01\')', rows: [
            [4, 'ben@mail.com', 'Benjamin Ode', '2024-01-15'],
            [6, 'asha@mail.com', 'Asha Rao', '2024-02-20'],
            [7, 'dan@mail.com', 'Dan Wu', '2023-04-04'],
            [8, 'cara@mail.com', 'Cara Lim', '2023-03-03'],
            [11, 'eve@mail.com', 'Eve', '2024-01-01']
          ] },
        { setup: 'DELETE FROM customers_raw', rows: [] },
        { setup: 'DELETE FROM customers_raw WHERE id > 1', rows: [
            [1, 'asha@mail.com', 'Asha Rao', '2023-01-05']
          ] },
        { setup: 'INSERT INTO customers_raw VALUES (9,\'zed@mail.com\',\'Zed\',\'2024-01-01\'),(10,\'zed.x@mail.com\',\'Zed X\',\'2024-01-02\')', rows: [
            [4, 'ben@mail.com', 'Benjamin Ode', '2024-01-15'],
            [6, 'asha@mail.com', 'Asha Rao', '2024-02-20'],
            [7, 'dan@mail.com', 'Dan Wu', '2023-04-04'],
            [8, 'cara@mail.com', 'Cara Lim', '2023-03-03'],
            [9, 'zed@mail.com', 'Zed', '2024-01-01'],
            [10, 'zed.x@mail.com', 'Zed X', '2024-01-02']
          ] },
        { setup: 'INSERT INTO customers_raw VALUES (20,\'cara@mail.com\',\'Cara Lim\',\'2023-03-03\')', rows: [
            [4, 'ben@mail.com', 'Benjamin Ode', '2024-01-15'],
            [6, 'asha@mail.com', 'Asha Rao', '2024-02-20'],
            [7, 'dan@mail.com', 'Dan Wu', '2023-04-04'],
            [20, 'cara@mail.com', 'Cara Lim', '2023-03-03']
          ] },
        { setup: 'INSERT INTO customers_raw VALUES (0,\'cara@mail.com\',\'Cara Lim\',\'2023-03-03\')', rows: [
            [4, 'ben@mail.com', 'Benjamin Ode', '2024-01-15'],
            [6, 'asha@mail.com', 'Asha Rao', '2024-02-20'],
            [7, 'dan@mail.com', 'Dan Wu', '2023-04-04'],
            [8, 'cara@mail.com', 'Cara Lim', '2023-03-03']
          ] }
      ] },
      solution: {
        approach: `<p>Rank copies inside each normalised-email partition (newest first, id as tie-breaker) and delete every id with rank above 1 — one sort, one DELETE by primary key.</p>`,
        code: { lang: 'sql', db: 'shop', code: `DELETE FROM customers_raw
WHERE id IN (
  SELECT id
  FROM (SELECT id,
               ROW_NUMBER() OVER (PARTITION BY LOWER(TRIM(email))
                                  ORDER BY created_at DESC, id DESC) AS rn
        FROM customers_raw)
  WHERE rn > 1
);

SELECT id, email, full_name, created_at FROM customers_raw ORDER BY id;` },
        dry: { head: ['key', 'copies (id: date)', 'rn = 1', 'deleted'], rows: [['asha@mail.com', '6: 2024-02-20, 3: 2023-06-01, 1: 2023-01-05', '6', '3, 1'], ['ben@mail.com', '4: 2024-01-15, 2: 2023-02-10', '4', '2'], ['cara@mail.com', '8, 5 (same date)', '8', '5'], ['dan@mail.com', '7', '7', '—']] },
        complexity: `<p>O(n log n) for the partitioned sort; the DELETE probes the primary key for each extra id. Memory O(n) for the window.</p>`,
        followUps: ['Before deleting, move all orders of the deleted ids to the survivor.', 'Keep the most complete record (fewest NULL fields) instead of the newest.', 'Add a constraint so this can never happen again.']
      }
    }]
  });

  /* =====================================================================
     PRACTICE — Easy and Medium
     ===================================================================== */
  practice.push({
    title: 'Second Highest Salary', level: 'Easy', tags: ['nth highest', 'null handling'], companies: ['Amazon', 'Adobe', 'Bloomberg'],
    statement: `<p>Return the second highest <b>distinct</b> salary from <code>employees</code> as <code>second_highest_salary</code>. If there is none (e.g. everyone earns the same), return a single row with NULL.</p>`,
    constraints: `1 ≤ rows ≤ 10<sup>5</sup>; salaries may repeat.`,
    example: `<p>Distinct salaries: ${H.c('m', '300000')}, ${H.c('g', '220000')}, 210000, … → answer ${H.c('g', '220000')}. A table with one employee → ${H.c('b', 'NULL')}.</p>`,
    brute: { why: `<p><code>ORDER BY salary DESC LIMIT 1 OFFSET 1</code> picks the second <b>row</b>: if two people share the top salary it returns the top salary again, and on a one-row table it returns <b>no row</b> instead of NULL.</p>`,
      code: { lang: 'sql', db: 'hr', code: `SELECT salary AS second_highest_salary
FROM employees
ORDER BY salary DESC
LIMIT 1 OFFSET 1;          -- breaks on ties at the top and on tiny tables` } },
    mcq: { q: 'Salaries: 100, 100. What should "second highest salary" return?', options: ['NULL', '100', 'No rows', '0'], answer: 0, explain: 'There is only one distinct salary, so no second highest exists: the expected output is one row with NULL.' },
    hints: [`<p>Hint 1: remove duplicate amounts before counting positions.</p>`, `<p>Hint 2: <code>SELECT DISTINCT salary … ORDER BY salary DESC LIMIT 1 OFFSET 1</code>.</p>`, `<p>Hint 3: wrap it as a scalar subquery <code>SELECT ( … ) AS second_highest_salary</code> so "nothing" becomes NULL.</p>`],
    tests: { engine: 'sqlite', check: '(rows, cols, c) => {\n  if (c.plan || c.noplan) { const d = rows.map(r => r[r.length - 1]).join(\'\\n\'); return (!c.plan || new RegExp(c.plan).test(d)) && (!c.noplan || !new RegExp(c.noplan).test(d)); }\n  let a = rows, b = c.rows || [];\n  if (c.set) { const k = r => JSON.stringify(r); a = a.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); b = b.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); }\n  return a.length === b.length && a.every((r, i) => r.length === b[i].length && r.every((v, j) => v === b[i][j] || (typeof v === \'number\' && typeof b[i][j] === \'number\' && Math.abs(v - b[i][j]) < 1e-6)));\n}', cases: [
      { rows: [
          [220000]
        ] },
      { setup: 'DELETE FROM employees WHERE id NOT IN (1)', rows: [
          [null]
        ] },
      { setup: 'UPDATE employees SET salary = 5', rows: [
          [null]
        ] },
      { setup: 'DELETE FROM employees WHERE id NOT IN (1,2)', rows: [
          [220000]
        ] },
      { setup: 'UPDATE employees SET salary = 300000 WHERE id = 2', rows: [
          [210000]
        ] },
      { setup: 'UPDATE employees SET salary = 300000 WHERE id = 2; UPDATE employees SET salary = 300000 WHERE id = 3', rows: [
          [150000]
        ] },
      { setup: 'DELETE FROM employees', rows: [
          [null]
        ] },
      { setup: 'UPDATE employees SET salary = -5 WHERE id = 1; DELETE FROM employees WHERE id NOT IN (1,2,3)', rows: [
          [210000]
        ] }
    ] },
    solution: {
      approach: `<p>Distinct + offset inside a scalar subquery: correct on ties and returns NULL when missing. MAX-below-MAX is an equally valid one-liner.</p>`,
      code: { lang: 'sql', db: 'hr', code: `SELECT (SELECT DISTINCT salary
        FROM employees
        ORDER BY salary DESC
        LIMIT 1 OFFSET 1) AS second_highest_salary;` },
      alt: [{ lang: 'sql', db: 'hr', title: 'MAX below MAX', code: `SELECT MAX(salary) AS second_highest_salary
FROM employees
WHERE salary < (SELECT MAX(salary) FROM employees);` }],
      complexity: `<p>O(n log n) sort, or O(log n) with an index on salary (the engine walks the index from the top).</p>`,
      followUps: ['Generalise to the Nth highest.', 'Return the names of everyone earning the second highest salary.']
    }
  });

  practice.push({
    title: 'Find Duplicate Emails', level: 'Easy', tags: ['duplicates', 'group by', 'having'], companies: ['Amazon', 'Uber'],
    statement: `<p>From <code>customers_raw(id, email, full_name, created_at)</code>, list every email value that appears <b>more than once</b> (exact match), with how many times it appears.</p>`,
    constraints: `Up to 10<sup>6</sup> rows; email is never NULL.`,
    example: `<p>${H.c('r', 'asha@mail.com')} appears for ids 1 and 6, ${H.c('r', 'cara@mail.com')} for ids 5 and 8 → 2 rows. "BEN@mail.com" and "ben@mail.com" differ in case, so exact matching does not flag them.</p>`,
    brute: { why: `<p>A self-join pairs every row with every other row sharing the email — k copies produce k·(k−1) pairs, so you need DISTINCT and do O(n²) work in the worst case (one very common email). GROUP BY counts each email once.</p>`,
      code: { lang: 'sql', db: 'shop', code: `SELECT DISTINCT a.email
FROM customers_raw a
JOIN customers_raw b ON b.email = a.email AND b.id <> a.id;` } },
    mcq: { q: 'Why HAVING and not WHERE for COUNT(*) &gt; 1?', options: ['WHERE runs before grouping, so the count does not exist yet', 'WHERE cannot compare numbers', 'HAVING is faster', 'They are interchangeable'], answer: 0, explain: 'WHERE filters individual rows before GROUP BY; HAVING filters groups after aggregates are computed.' },
    hints: [`<p>Hint 1: one row per email = GROUP BY email.</p>`, `<p>Hint 2: count the rows in each group with COUNT(*).</p>`, `<p>Hint 3: keep groups with <code>HAVING COUNT(*) &gt; 1</code>; add <code>GROUP_CONCAT(id)</code> to see which ids.</p>`],
    tests: { engine: 'sqlite', check: '(rows, cols, c) => {\n  if (c.plan || c.noplan) { const d = rows.map(r => r[r.length - 1]).join(\'\\n\'); return (!c.plan || new RegExp(c.plan).test(d)) && (!c.noplan || !new RegExp(c.noplan).test(d)); }\n  let a = rows, b = c.rows || [];\n  if (c.set) { const k = r => JSON.stringify(r); a = a.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); b = b.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); }\n  return a.length === b.length && a.every((r, i) => r.length === b[i].length && r.every((v, j) => v === b[i][j] || (typeof v === \'number\' && typeof b[i][j] === \'number\' && Math.abs(v - b[i][j]) < 1e-6)));\n}', cases: [
      { setup: '', rows: [
          ['asha@mail.com', 2, '1,6'],
          ['cara@mail.com', 2, '5,8']
        ] },
      { setup: 'INSERT INTO customers_raw VALUES (9,\'dan@mail.com\',\'Dan Again\',\'2024-05-01\')', rows: [
          ['asha@mail.com', 2, '1,6'],
          ['cara@mail.com', 2, '5,8'],
          ['dan@mail.com', 2, '7,9']
        ] },
      { setup: 'INSERT INTO customers_raw VALUES (9,\'dan@mail.com\',\'Dan Again\',\'2024-05-01\'),(10,\'dan@mail.com\',\'Dan 3\',\'2024-05-02\'),(11,\'dan@mail.com\',\'Dan 4\',\'2024-05-03\')', rows: [
          ['asha@mail.com', 2, '1,6'],
          ['cara@mail.com', 2, '5,8'],
          ['dan@mail.com', 4, '7,9,10,11']
        ] },
      { setup: 'DELETE FROM customers_raw', rows: [] },
      { setup: 'DELETE FROM customers_raw WHERE id IN (6, 8)', rows: [] },
      { setup: 'INSERT INTO customers_raw VALUES (9,\'ben@mail.com\',\'Ben\',\'2024-05-01\')', rows: [
          ['asha@mail.com', 2, '1,6'],
          ['ben@mail.com', 2, '4,9'],
          ['cara@mail.com', 2, '5,8']
        ] },
      { setup: 'INSERT INTO customers_raw VALUES (9,\'BEN@mail.com\',\'Ben\',\'2024-05-01\')', rows: [
          ['BEN@mail.com', 2, '2,9'],
          ['asha@mail.com', 2, '1,6'],
          ['cara@mail.com', 2, '5,8']
        ] },
      { setup: 'INSERT INTO customers_raw VALUES (9,\'a@x.com\',\'A\',\'2024-05-01\'),(10,\'b@x.com\',\'B\',\'2024-05-01\'),(11,\'b@x.com\',\'B\',\'2024-05-01\'),(12,\'a@x.com\',\'A\',\'2024-05-01\')', rows: [
          ['a@x.com', 2, '9,12'],
          ['asha@mail.com', 2, '1,6'],
          ['b@x.com', 2, '10,11'],
          ['cara@mail.com', 2, '5,8']
        ] }
    ] },
    solution: {
      approach: `<p>Group by the email, keep groups larger than one.</p>`,
      code: { lang: 'sql', db: 'shop', code: `SELECT email, COUNT(*) AS copies, GROUP_CONCAT(id) AS ids
FROM (SELECT * FROM customers_raw ORDER BY id)
GROUP BY email
HAVING COUNT(*) > 1
ORDER BY email;` },
      complexity: `<p>O(n) with hash aggregation (O(n log n) with sort aggregation).</p>`,
      followUps: ['Make it case- and space-insensitive.', 'Delete the duplicates keeping the smallest id.']
    }
  });

  practice.push({
    title: 'Department Highest Salary (ties included)', level: 'Easy', tags: ['top-n per group', 'rank'], companies: ['Amazon', 'Microsoft'],
    statement: `<p>Return <code>dept, name, salary</code> for the highest-paid employee(s) in every department. If several people tie for the top in a department, return all of them.</p>`,
    constraints: `Up to 10<sup>5</sup> employees.`,
    example: `<p>Engineering → ${H.c('g', 'Ben 220000')}, Exec → Asha, Finance → Cara, Sales → Mo.</p>`,
    brute: { why: `<p>A correlated MAX per row (<code>salary = (SELECT MAX(salary) … WHERE dept = e.dept)</code>) re-aggregates the department for every employee — O(n × d) without an index on (dept, salary).</p>`,
      code: { lang: 'sql', db: 'hr', code: `SELECT e.dept, e.name, e.salary
FROM employees e
WHERE e.salary = (SELECT MAX(x.salary) FROM employees x WHERE x.dept = e.dept)
ORDER BY e.dept;` } },
    mcq: { q: 'Which function keeps every tied top earner when you filter "= 1"?', options: ['RANK (or DENSE_RANK)', 'ROW_NUMBER', 'NTILE(1)', 'COUNT'], answer: 0, explain: 'RANK and DENSE_RANK give equal values the same rank, so every tied top earner has rank 1. ROW_NUMBER would pick only one.' },
    hints: [`<p>Hint 1: "per department" → PARTITION BY dept.</p>`, `<p>Hint 2: <code>RANK() OVER (PARTITION BY dept ORDER BY salary DESC)</code>.</p>`, `<p>Hint 3: filter rank = 1 in an outer query (not in WHERE of the same SELECT).</p>`],
    tests: { engine: 'sqlite', check: '(rows, cols, c) => {\n  if (c.plan || c.noplan) { const d = rows.map(r => r[r.length - 1]).join(\'\\n\'); return (!c.plan || new RegExp(c.plan).test(d)) && (!c.noplan || !new RegExp(c.noplan).test(d)); }\n  let a = rows, b = c.rows || [];\n  if (c.set) { const k = r => JSON.stringify(r); a = a.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); b = b.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); }\n  return a.length === b.length && a.every((r, i) => r.length === b[i].length && r.every((v, j) => v === b[i][j] || (typeof v === \'number\' && typeof b[i][j] === \'number\' && Math.abs(v - b[i][j]) < 1e-6)));\n}', cases: [
      { rows: [
          ['Engineering', 'Ben', 220000],
          ['Exec', 'Asha', 300000],
          ['Finance', 'Cara', 210000],
          ['Sales', 'Mo', 140000]
        ] },
      { setup: 'UPDATE employees SET salary = 220000 WHERE id = 4', rows: [
          ['Engineering', 'Ben', 220000],
          ['Engineering', 'Dev', 220000],
          ['Exec', 'Asha', 300000],
          ['Finance', 'Cara', 210000],
          ['Sales', 'Mo', 140000]
        ] },
      { setup: 'UPDATE employees SET salary = 1', rows: [
          ['Engineering', 'Ben', 1],
          ['Engineering', 'Dev', 1],
          ['Engineering', 'Eli', 1],
          ['Engineering', 'Fay', 1],
          ['Engineering', 'Gus', 1],
          ['Engineering', 'Hana', 1],
          ['Engineering', 'Ivan', 1],
          ['Exec', 'Asha', 1],
          ['Finance', 'Cara', 1],
          ['Finance', 'Jia', 1],
          ['Finance', 'Kofi', 1],
          ['Finance', 'Lena', 1],
          ['Sales', 'Mo', 1],
          ['Sales', 'Nia', 1],
          ['Sales', 'Omar', 1],
          ['Sales', 'Pia', 1],
          ['Sales', 'Raj', 1]
        ] },
      { setup: 'DELETE FROM employees WHERE id NOT IN (1)', rows: [
          ['Exec', 'Asha', 300000]
        ] },
      { setup: 'DELETE FROM employees', rows: [] },
      { setup: 'UPDATE employees SET dept = \'Sales\' WHERE id = 2', rows: [
          ['Engineering', 'Dev', 150000],
          ['Engineering', 'Eli', 150000],
          ['Exec', 'Asha', 300000],
          ['Finance', 'Cara', 210000],
          ['Sales', 'Ben', 220000]
        ] },
      { setup: 'INSERT INTO employees VALUES (18,\'Zed\',\'Engineering\',220000,2,\'2024-01-01\')', rows: [
          ['Engineering', 'Ben', 220000],
          ['Engineering', 'Zed', 220000],
          ['Exec', 'Asha', 300000],
          ['Finance', 'Cara', 210000],
          ['Sales', 'Mo', 140000]
        ] },
      { setup: 'UPDATE employees SET salary = 140000 WHERE id = 14; UPDATE employees SET salary = 140000 WHERE id = 15', rows: [
          ['Engineering', 'Ben', 220000],
          ['Exec', 'Asha', 300000],
          ['Finance', 'Cara', 210000],
          ['Sales', 'Mo', 140000],
          ['Sales', 'Nia', 140000],
          ['Sales', 'Omar', 140000]
        ] }
    ] },
    solution: {
      approach: `<p>Rank inside each department, keep rank 1. Ties survive automatically.</p>`,
      code: { lang: 'sql', db: 'hr', code: `WITH r AS (
  SELECT dept, name, salary,
         RANK() OVER (PARTITION BY dept ORDER BY salary DESC) AS rk
  FROM employees
)
SELECT dept, name, salary FROM r WHERE rk = 1 ORDER BY dept, name;` },
      complexity: `<p>O(n log n) partitioned sort.</p>`,
      followUps: ['Return only one per department (break ties by hire date).', 'Include the gap to the second highest salary.']
    }
  });

  practice.push({
    title: 'Most Recent Order per Customer', level: 'Easy', tags: ['top-n per group', 'row_number', 'left join'], companies: ['Shopify', 'Flipkart'],
    statement: `<p>For <b>every customer</b> (including those who never ordered), show their most recent order's date and amount. Ties on date → higher order_id wins. Customers without orders show NULLs.</p>`,
    constraints: `10<sup>5</sup> customers, 10<sup>7</sup> orders.`,
    example: `<p>Asha → 2024-03-15, 90; Dan → 2024-04-10, 500; ${H.c('b', 'Finn → NULL, NULL')} (no orders).</p>`,
    brute: { why: `<p>Joining to <code>MAX(order_date)</code> per customer returns <b>two</b> rows if two orders share the latest date, and an inner join drops Finn. A correlated subquery per customer works but probes orders once per customer.</p>`,
      code: { lang: 'sql', db: 'shop', code: `SELECT c.name, o.order_date, o.amount
FROM customers c
JOIN orders o ON o.customer_id = c.customer_id
WHERE o.order_date = (SELECT MAX(order_date) FROM orders x WHERE x.customer_id = c.customer_id);
-- drops Finn and can duplicate on equal dates` } },
    mcq: { q: 'Where must the condition rn = 1 go so customers without orders survive?', options: ['In the LEFT JOIN … ON clause', 'In the final WHERE clause', 'In GROUP BY', 'In ORDER BY'], answer: 0, explain: 'A WHERE on a column of the right-hand table removes the NULL-extended rows, turning the LEFT JOIN into an inner join.' },
    hints: [`<p>Hint 1: one row per customer → ROW_NUMBER partitioned by customer_id, newest first.</p>`, `<p>Hint 2: <code>ORDER BY order_date DESC, order_id DESC</code> makes the pick deterministic.</p>`, `<p>Hint 3: start FROM customers and LEFT JOIN the ranked orders ON id match AND rn = 1.</p>`],
    tests: { engine: 'sqlite', check: '(rows, cols, c) => {\n  if (c.plan || c.noplan) { const d = rows.map(r => r[r.length - 1]).join(\'\\n\'); return (!c.plan || new RegExp(c.plan).test(d)) && (!c.noplan || !new RegExp(c.noplan).test(d)); }\n  let a = rows, b = c.rows || [];\n  if (c.set) { const k = r => JSON.stringify(r); a = a.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); b = b.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); }\n  return a.length === b.length && a.every((r, i) => r.length === b[i].length && r.every((v, j) => v === b[i][j] || (typeof v === \'number\' && typeof b[i][j] === \'number\' && Math.abs(v - b[i][j]) < 1e-6)));\n}', cases: [
      { setup: '', rows: [
          ['Asha', '2024-03-15', 90],
          ['Ben', '2024-04-02', 35],
          ['Cara', '2024-03-18', 150],
          ['Dan', '2024-04-10', 500],
          ['Eve', '2024-03-22', 60],
          ['Finn', null, null]
        ] },
      { setup: 'DELETE FROM orders', rows: [
          ['Asha', null, null],
          ['Ben', null, null],
          ['Cara', null, null],
          ['Dan', null, null],
          ['Eve', null, null],
          ['Finn', null, null]
        ] },
      { setup: 'INSERT INTO orders VALUES (20,6,\'2024-05-01\',10,\'delivered\')', rows: [
          ['Asha', '2024-03-15', 90],
          ['Ben', '2024-04-02', 35],
          ['Cara', '2024-03-18', 150],
          ['Dan', '2024-04-10', 500],
          ['Eve', '2024-03-22', 60],
          ['Finn', '2024-05-01', 10]
        ] },
      { setup: 'INSERT INTO orders VALUES (20,1,\'2024-03-15\',77,\'delivered\')', rows: [
          ['Asha', '2024-03-15', 77],
          ['Ben', '2024-04-02', 35],
          ['Cara', '2024-03-18', 150],
          ['Dan', '2024-04-10', 500],
          ['Eve', '2024-03-22', 60],
          ['Finn', null, null]
        ] },
      { setup: 'INSERT INTO orders VALUES (20,1,\'2024-03-15\',77,\'cancelled\'),(19,1,\'2024-03-15\',66,\'delivered\')', rows: [
          ['Asha', '2024-03-15', 77],
          ['Ben', '2024-04-02', 35],
          ['Cara', '2024-03-18', 150],
          ['Dan', '2024-04-10', 500],
          ['Eve', '2024-03-22', 60],
          ['Finn', null, null]
        ] },
      { setup: 'DELETE FROM customers WHERE customer_id IN (1, 2)', rows: [
          ['Cara', '2024-03-18', 150],
          ['Dan', '2024-04-10', 500],
          ['Eve', '2024-03-22', 60],
          ['Finn', null, null]
        ] },
      { setup: 'DELETE FROM customers', rows: [] },
      { setup: 'INSERT INTO customers VALUES (7,\'Gus\',\'Pune\')', rows: [
          ['Asha', '2024-03-15', 90],
          ['Ben', '2024-04-02', 35],
          ['Cara', '2024-03-18', 150],
          ['Dan', '2024-04-10', 500],
          ['Eve', '2024-03-22', 60],
          ['Finn', null, null],
          ['Gus', null, null]
        ] }
    ] },
    solution: {
      approach: `<p>ROW_NUMBER per customer, newest first; LEFT JOIN from customers with rn = 1 in the ON clause.</p>`,
      code: { lang: 'sql', db: 'shop', code: `WITH ranked AS (
  SELECT customer_id, order_date, amount,
         ROW_NUMBER() OVER (PARTITION BY customer_id
                            ORDER BY order_date DESC, order_id DESC) AS rn
  FROM orders
)
SELECT c.name, r.order_date, r.amount
FROM customers c
LEFT JOIN ranked r ON r.customer_id = c.customer_id AND r.rn = 1
ORDER BY c.customer_id;` },
      complexity: `<p>O(n log n) over orders; with an index on (customer_id, order_date DESC) engines can stream it.</p>`,
      followUps: ['Show the last 2 orders per customer.', 'Only consider delivered orders.']
    }
  });

  practice.push({
    title: 'Consecutive Numbers (3 in a row)', level: 'Medium', tags: ['gaps and islands', 'lag', 'consecutive'], companies: ['Amazon', 'Meta'],
    statement: `<p>Table <code>signal_log(id, num)</code> where id is sequential. Find every <code>num</code> that appears at least <b>three times consecutively</b> (consecutive ids). Return distinct values as <code>consecutive_num</code>.</p>`,
    constraints: `ids are consecutive integers starting at 1; up to 10<sup>6</sup> rows.`,
    example: `<p>nums by id: ${H.c('g', '1 1 1')} 2 1 ${H.c('g', '2 2 2 2')} 3 → ${H.c('g', '1, 2')}.</p>`,
    brute: { why: `<p>Triple self-join on id, id+1, id+2: fine for exactly 3, but "at least K" needs K−1 joins, and it relies on ids having no gaps (a deleted row breaks it silently).</p>`,
      code: { lang: 'sql', db: 'shop', code: `SELECT DISTINCT a.num AS consecutive_num
FROM signal_log a
JOIN signal_log b ON b.id = a.id + 1 AND b.num = a.num
JOIN signal_log c ON c.id = a.id + 2 AND c.num = a.num;` } },
    mcq: { q: 'For runs of equal values, which difference is constant inside a run?', options: ['ROW_NUMBER() OVER (ORDER BY id) − ROW_NUMBER() OVER (PARTITION BY num ORDER BY id)', 'id − num', 'num − ROW_NUMBER() OVER (ORDER BY id)', 'LAG(id) − id'], answer: 0, explain: 'Inside a run both counters advance together; when the run is interrupted the overall counter jumps ahead of the per-value one.' },
    hints: [`<p>Hint 1: "three in a row" = the current row equals the previous two rows.</p>`, `<p>Hint 2: <code>LAG(num)</code> and <code>LAG(num, 2)</code> over ORDER BY id.</p>`, `<p>Hint 3: for "at least K" use the island key <code>id − ROW_NUMBER() OVER (PARTITION BY num ORDER BY id)</code> and <code>HAVING COUNT(*) &gt;= K</code>.</p>`],
    tests: { engine: 'sqlite', check: '(rows, cols, c) => {\n  if (c.plan || c.noplan) { const d = rows.map(r => r[r.length - 1]).join(\'\\n\'); return (!c.plan || new RegExp(c.plan).test(d)) && (!c.noplan || !new RegExp(c.noplan).test(d)); }\n  let a = rows, b = c.rows || [];\n  if (c.set) { const k = r => JSON.stringify(r); a = a.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); b = b.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); }\n  return a.length === b.length && a.every((r, i) => r.length === b[i].length && r.every((v, j) => v === b[i][j] || (typeof v === \'number\' && typeof b[i][j] === \'number\' && Math.abs(v - b[i][j]) < 1e-6)));\n}', cases: [
      { setup: '', rows: [
          [1],
          [2]
        ], set: true },
      { setup: 'DELETE FROM signal_log', rows: [], set: true },
      { setup: 'DELETE FROM signal_log WHERE id > 3', rows: [
          [1]
        ], set: true },
      { setup: 'DELETE FROM signal_log WHERE id IN (2)', rows: [
          [2]
        ], set: true },
      { setup: 'UPDATE signal_log SET num = 3 WHERE id IN (8, 9)', rows: [
          [1],
          [3]
        ], set: true },
      { setup: 'INSERT INTO signal_log VALUES (11,3),(12,3)', rows: [
          [1],
          [2],
          [3]
        ], set: true },
      { setup: 'INSERT INTO signal_log VALUES (11,1),(12,1),(13,1),(14,1)', rows: [
          [1],
          [2]
        ], set: true },
      { setup: 'INSERT INTO signal_log VALUES (11,3),(13,3),(14,3)', rows: [
          [1],
          [2]
        ], set: true },
      { setup: 'UPDATE signal_log SET num = 7', rows: [
          [7]
        ], set: true }
    ] },
    solution: {
      approach: `<p>Island per (num, key) where key = id − per-value row number; keep islands with at least 3 rows. Works for any K with no extra joins.</p>`,
      code: { lang: 'sql', db: 'shop', code: `SELECT DISTINCT num AS consecutive_num
FROM (SELECT num,
             id - ROW_NUMBER() OVER (PARTITION BY num ORDER BY id) AS island
      FROM signal_log)
GROUP BY num, island
HAVING COUNT(*) >= 3;` },
      alt: [{ lang: 'sql', db: 'shop', title: 'LAG version (K = 3)', code: `SELECT DISTINCT num AS consecutive_num
FROM (SELECT num,
             LAG(num, 1) OVER (ORDER BY id) AS p1,
             LAG(num, 2) OVER (ORDER BY id) AS p2
      FROM signal_log)
WHERE num = p1 AND num = p2;` }],
      dry: { head: ['id', 'num', 'rn per num', 'island'], rows: [['1', '1', '1', '0'], ['3', '1', '3', '0'], ['5', '1', '4', H.c('y', '1 (new island)')], ['6..9', '2', '2..5', '4 (4 rows)']] },
      complexity: `<p>O(n log n) for the partitioned sort; one GROUP BY.</p>`,
      followUps: ['Return the start and end id of each qualifying run.', 'What if ids have gaps (deleted rows)?']
    }
  });

  practice.push({
    title: 'Nth Highest Salary per Department (NULL if missing)', level: 'Medium', tags: ['dense_rank', 'left join', 'nth highest'], companies: ['Google', 'Bloomberg'],
    statement: `<p>For <b>every</b> department, return the 3rd highest distinct salary as <code>third_salary</code>; departments with fewer than 3 distinct salaries must still appear with NULL.</p>`,
    constraints: `Up to 10<sup>5</sup> employees, 1000 departments.`,
    example: `<p>Engineering distinct: 220, 150, ${H.c('g', '120')} k → 120000. Finance: 210, 130, ${H.c('g', '98')} → 98000. Sales: 140, 90, ${H.c('g', '85')} → 85000. ${H.c('b', 'Exec → NULL')} (only one salary).</p>`,
    brute: { why: `<p>Filtering <code>WHERE rnk = 3</code> directly drops Exec entirely — the "return NULL" requirement fails. A correlated subquery per department fixes that but recounts distinct salaries per candidate (O(d²) per department).</p>`,
      code: { lang: 'sql', db: 'hr', code: `WITH r AS (SELECT DISTINCT dept, salary,
                  DENSE_RANK() OVER (PARTITION BY dept ORDER BY salary DESC) AS rnk
           FROM employees)
SELECT dept, salary AS third_salary FROM r WHERE rnk = 3;   -- Exec is missing` } },
    mcq: { q: 'Why start from a list of departments and LEFT JOIN the ranked salaries?', options: ['So departments with no 3rd salary still produce a row (with NULL)', 'To make the query faster', 'Because DENSE_RANK needs it', 'To remove duplicates'], answer: 0, explain: 'The driving table decides which rows exist. LEFT JOIN keeps every department even when no ranked row matches rank 3.' },
    hints: [`<p>Hint 1: rank distinct salaries per department with DENSE_RANK.</p>`, `<p>Hint 2: build the department list with <code>SELECT DISTINCT dept</code>.</p>`, `<p>Hint 3: LEFT JOIN ranked rows <code>ON dept match AND rnk = 3</code> (condition in ON, not WHERE).</p>`],
    tests: { engine: 'sqlite', check: '(rows, cols, c) => {\n  if (c.plan || c.noplan) { const d = rows.map(r => r[r.length - 1]).join(\'\\n\'); return (!c.plan || new RegExp(c.plan).test(d)) && (!c.noplan || !new RegExp(c.noplan).test(d)); }\n  let a = rows, b = c.rows || [];\n  if (c.set) { const k = r => JSON.stringify(r); a = a.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); b = b.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); }\n  return a.length === b.length && a.every((r, i) => r.length === b[i].length && r.every((v, j) => v === b[i][j] || (typeof v === \'number\' && typeof b[i][j] === \'number\' && Math.abs(v - b[i][j]) < 1e-6)));\n}', cases: [
      { rows: [
          ['Engineering', 120000],
          ['Exec', null],
          ['Finance', 98000],
          ['Sales', 85000]
        ] },
      { setup: 'UPDATE employees SET salary = 10', rows: [
          ['Engineering', null],
          ['Exec', null],
          ['Finance', null],
          ['Sales', null]
        ] },
      { setup: 'DELETE FROM employees WHERE id NOT IN (1)', rows: [
          ['Exec', null]
        ] },
      { setup: 'INSERT INTO employees VALUES (18,\'Zed\',\'Exec\',200000,NULL,\'2024-01-01\'); INSERT INTO employees VALUES (19,\'Yan\',\'Exec\',100000,NULL,\'2024-01-01\')', rows: [
          ['Engineering', 120000],
          ['Exec', 100000],
          ['Finance', 98000],
          ['Sales', 85000]
        ] },
      { setup: 'INSERT INTO employees VALUES (18,\'Zed\',\'Exec\',200000,NULL,\'2024-01-01\'); INSERT INTO employees VALUES (19,\'Yan\',\'Exec\',200000,NULL,\'2024-01-01\'); INSERT INTO employees VALUES (20,\'Xia\',\'Exec\',200000,NULL,\'2024-01-01\')', rows: [
          ['Engineering', 120000],
          ['Exec', null],
          ['Finance', 98000],
          ['Sales', 85000]
        ] },
      { setup: 'UPDATE employees SET dept = \'Finance\' WHERE id = 2; UPDATE employees SET dept = \'Finance\' WHERE id = 4; UPDATE employees SET dept = \'Finance\' WHERE id = 6', rows: [
          ['Engineering', 95000],
          ['Exec', null],
          ['Finance', 150000],
          ['Sales', 85000]
        ] },
      { setup: 'DELETE FROM employees', rows: [] },
      { setup: 'DELETE FROM employees WHERE id NOT IN (2,4,5,6)', rows: [
          ['Engineering', 120000]
        ] }
    ] },
    solution: {
      approach: `<p>Distinct dense ranks per department, driven by the department list with a LEFT JOIN that carries the rank condition.</p>`,
      code: { lang: 'sql', db: 'hr', code: `WITH depts AS (SELECT DISTINCT dept FROM employees),
ranked AS (
  SELECT DISTINCT dept, salary,
         DENSE_RANK() OVER (PARTITION BY dept ORDER BY salary DESC) AS rnk
  FROM employees
)
SELECT d.dept, r.salary AS third_salary
FROM depts d
LEFT JOIN ranked r ON r.dept = d.dept AND r.rnk = 3
ORDER BY d.dept;` },
      complexity: `<p>O(n log n) partitioned sort; the LEFT JOIN is linear in the number of departments.</p>`,
      followUps: ['Make N a parameter.', 'Return the names of people at that level, comma-separated.']
    }
  });

  practice.push({
    title: 'Day-1 Retention (Game Play Analysis IV)', level: 'Medium', tags: ['retention', 'date arithmetic'], companies: ['Activision', 'Zynga', 'Meta'],
    statement: `<p>Report the fraction of users who logged in again on the <b>day right after</b> their first login, rounded to 2 decimals, as <code>fraction</code>. Use <code>logins(user_id, login_ts)</code>; a user's first login day is the earliest <code>date(login_ts)</code>.</p>`,
    constraints: `Up to 10<sup>7</sup> logins; multiple logins per day possible.`,
    example: `<p>amy: first Jan 1, logged in Jan 2 ${H.c('g', '✓')}. bob: first Jan 3, next Jan 5 ${H.c('r', '✗')}. 7 of 12 users qualify → ${H.c('g', '0.58')}.</p>`,
    brute: { why: `<p>A correlated subquery per login row ("is this the first login? is there one the next day?") scans the user's logins repeatedly. Also, comparing timestamps instead of dates (<code>login_ts = first_ts + 1 day</code>) silently fails because times differ.</p>`,
      code: { lang: 'sql', db: 'app', code: `SELECT ROUND(1.0 * COUNT(DISTINCT l.user_id) / (SELECT COUNT(DISTINCT user_id) FROM logins), 2) AS fraction
FROM logins l
WHERE EXISTS (SELECT 1 FROM logins n
              WHERE n.user_id = l.user_id
                AND date(n.login_ts) = date(l.login_ts, '+1 day'))
  AND date(l.login_ts) = (SELECT MIN(date(x.login_ts)) FROM logins x WHERE x.user_id = l.user_id);` } },
    mcq: { q: 'What should the denominator be?', options: ['Number of distinct users', 'Number of login rows', 'Number of distinct login days', 'Users who logged in twice'], answer: 0, explain: 'The fraction is per player: retained users / all users. Login rows over-count heavy users.' },
    hints: [`<p>Hint 1: compute each user's first day with <code>MIN(date(login_ts))</code> in a CTE.</p>`, `<p>Hint 2: LEFT JOIN logins on <code>date(login_ts) = date(first_day, '+1 day')</code>.</p>`, `<p>Hint 3: <code>COUNT(DISTINCT matched user) * 1.0 / COUNT(*)</code> over the first-day CTE; ROUND to 2.</p>`],
    tests: { engine: 'sqlite', check: '(rows, cols, c) => {\n  if (c.plan || c.noplan) { const d = rows.map(r => r[r.length - 1]).join(\'\\n\'); return (!c.plan || new RegExp(c.plan).test(d)) && (!c.noplan || !new RegExp(c.noplan).test(d)); }\n  let a = rows, b = c.rows || [];\n  if (c.set) { const k = r => JSON.stringify(r); a = a.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); b = b.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); }\n  return a.length === b.length && a.every((r, i) => r.length === b[i].length && r.every((v, j) => v === b[i][j] || (typeof v === \'number\' && typeof b[i][j] === \'number\' && Math.abs(v - b[i][j]) < 1e-6)));\n}', cases: [
      { rows: [
          [0.58]
        ] },
      { setup: 'DELETE FROM logins', rows: [
          [null]
        ] },
      { setup: 'DELETE FROM logins WHERE user_id <> 1', rows: [
          [1]
        ] },
      { setup: 'DELETE FROM logins WHERE user_id <> 2', rows: [
          [0]
        ] },
      { setup: 'INSERT INTO logins VALUES (13,\'2024-05-01 23:59:59\'),(13,\'2024-05-02 00:00:00\')', rows: [
          [0.62]
        ] },
      { setup: 'INSERT INTO logins VALUES (2,\'2024-01-04 08:00:00\')', rows: [
          [0.67]
        ] },
      { setup: 'INSERT INTO logins VALUES (8,\'2024-02-16 08:00:00\'),(11,\'2024-03-09 08:00:00\')', rows: [
          [0.75]
        ] },
      { setup: 'INSERT INTO logins VALUES (8,\'2024-02-14 08:00:00\')', rows: [
          [0.67]
        ] },
      { setup: 'INSERT INTO logins VALUES (8,\'2024-02-16 08:00:00\'),(11,\'2024-03-09 08:00:00\'),(9,\'2024-02-19 12:00:00\'),(7,\'2024-02-09 12:00:00\')', rows: [
          [0.83]
        ] }
    ] },
    solution: {
      approach: `<p>First-day CTE per user, LEFT JOIN to next-day logins, ratio of matched users to all users.</p>`,
      code: { lang: 'sql', db: 'app', code: `WITH first_day AS (
  SELECT user_id, MIN(date(login_ts)) AS d0
  FROM logins
  GROUP BY user_id
)
SELECT ROUND(1.0 * COUNT(DISTINCT l.user_id) / COUNT(DISTINCT f.user_id), 2) AS fraction
FROM first_day f
LEFT JOIN logins l
       ON l.user_id = f.user_id
      AND date(l.login_ts) = date(f.d0, '+1 day');` },
      complexity: `<p>One aggregation + one join: O(n log n); an index on (user_id, login_ts) makes the join a range probe.</p>`,
      followUps: ['Compute D7 retention (any login on days 1–7).', 'Split by signup channel.']
    }
  });

  practice.push({
    title: 'Best Quarter per Region from a Wide Table', level: 'Medium', tags: ['unpivot', 'top-n per group'], companies: ['Oracle', 'Snowflake'],
    statement: `<p>Table <code>sales_wide(region, q1, q2, q3, q4)</code> has NULLs for quarters with no data. Return each region's <b>best quarter</b> and its revenue (earliest quarter on ties), ignoring NULL cells.</p>`,
    constraints: `Up to 10<sup>5</sup> regions; 4 quarter columns.`,
    example: `<p>North (100, 120, 90, ${H.c('g', '150')}) → Q4 150; South (80, 95, NULL, ${H.c('g', '110')}) → Q4 110; East (40, NULL, NULL, ${H.c('g', '55')}) → Q4 55.</p>`,
    brute: { why: `<p>A nested CASE comparing every column with every other gets long and wrong with NULLs: in SQLite <code>MAX(q1, q2, q3, q4)</code> returns NULL if any argument is NULL, so South and East would get no answer. Unpivoting first turns it into the ordinary top-1-per-group problem.</p>`,
      code: { lang: 'sql', db: 'shop', code: `-- Multi-argument MAX is NULL as soon as one cell is NULL → South and East get NULL.
SELECT region, MAX(q1, q2, q3, q4) AS best_revenue
FROM sales_wide;` } },
    mcq: { q: 'Which operator should glue the unpivot branches together?', options: ['UNION ALL', 'UNION', 'INTERSECT', 'JOIN'], answer: 0, explain: 'UNION ALL keeps every branch row and skips the expensive dedupe; UNION could merge two genuinely different but identical-looking rows.' },
    hints: [`<p>Hint 1: reshape to long (region, quarter, revenue) with four SELECTs and UNION ALL.</p>`, `<p>Hint 2: drop the NULL revenue rows (empty quarters) before ranking.</p>`, `<p>Hint 3: <code>ROW_NUMBER() OVER (PARTITION BY region ORDER BY revenue DESC, quarter)</code> and keep rn = 1.</p>`],
    tests: { engine: 'sqlite', check: '(rows, cols, c) => {\n  if (c.plan || c.noplan) { const d = rows.map(r => r[r.length - 1]).join(\'\\n\'); return (!c.plan || new RegExp(c.plan).test(d)) && (!c.noplan || !new RegExp(c.noplan).test(d)); }\n  let a = rows, b = c.rows || [];\n  if (c.set) { const k = r => JSON.stringify(r); a = a.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); b = b.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); }\n  return a.length === b.length && a.every((r, i) => r.length === b[i].length && r.every((v, j) => v === b[i][j] || (typeof v === \'number\' && typeof b[i][j] === \'number\' && Math.abs(v - b[i][j]) < 1e-6)));\n}', cases: [
      { setup: '', rows: [
          ['East', 'Q4', 55],
          ['North', 'Q4', 150],
          ['South', 'Q4', 110]
        ] },
      { setup: 'INSERT INTO sales_wide VALUES (\'West\',50,50,50,50)', rows: [
          ['East', 'Q4', 55],
          ['North', 'Q4', 150],
          ['South', 'Q4', 110],
          ['West', 'Q1', 50]
        ] },
      { setup: 'INSERT INTO sales_wide VALUES (\'West\',NULL,NULL,NULL,NULL)', rows: [
          ['East', 'Q4', 55],
          ['North', 'Q4', 150],
          ['South', 'Q4', 110]
        ] },
      { setup: 'INSERT INTO sales_wide VALUES (\'West\',0,0,0,0)', rows: [
          ['East', 'Q4', 55],
          ['North', 'Q4', 150],
          ['South', 'Q4', 110],
          ['West', 'Q1', 0]
        ] },
      { setup: 'INSERT INTO sales_wide VALUES (\'West\',NULL,7,NULL,NULL)', rows: [
          ['East', 'Q4', 55],
          ['North', 'Q4', 150],
          ['South', 'Q4', 110],
          ['West', 'Q2', 7]
        ] },
      { setup: 'INSERT INTO sales_wide VALUES (\'West\',-5,-3,-9,-3)', rows: [
          ['East', 'Q4', 55],
          ['North', 'Q4', 150],
          ['South', 'Q4', 110],
          ['West', 'Q2', -3]
        ] },
      { setup: 'DELETE FROM sales_wide', rows: [] },
      { setup: 'INSERT INTO sales_wide VALUES (\'Zone\',1,NULL,NULL,NULL),(\'Apex\',NULL,NULL,2,2)', rows: [
          ['Apex', 'Q3', 2],
          ['East', 'Q4', 55],
          ['North', 'Q4', 150],
          ['South', 'Q4', 110],
          ['Zone', 'Q1', 1]
        ] }
    ] },
    solution: {
      approach: `<p>Unpivot with UNION ALL, filter NULLs, then top-1 per region with a deterministic tie-breaker.</p>`,
      code: { lang: 'sql', db: 'shop', code: `WITH long AS (
  SELECT region, 'Q1' AS quarter, q1 AS revenue FROM sales_wide
  UNION ALL SELECT region, 'Q2', q2 FROM sales_wide
  UNION ALL SELECT region, 'Q3', q3 FROM sales_wide
  UNION ALL SELECT region, 'Q4', q4 FROM sales_wide
),
ranked AS (
  SELECT region, quarter, revenue,
         ROW_NUMBER() OVER (PARTITION BY region ORDER BY revenue DESC, quarter) AS rn
  FROM long
  WHERE revenue IS NOT NULL
)
SELECT region, quarter AS best_quarter, revenue
FROM ranked WHERE rn = 1
ORDER BY region;` },
      complexity: `<p>4 scans of the wide table (or 1 with the CROSS JOIN unpivot) plus a sort of 4n rows.</p>`,
      followUps: ['Also show the worst quarter.', 'Compute quarter-over-quarter growth after unpivoting.']
    }
  });

  practice.push({
    title: 'Outage Report from Health Checks', level: 'Medium', tags: ['gaps and islands', 'status runs', 'lead'], companies: ['Datadog', 'Cloudflare', 'PagerDuty'],
    statement: `<p><code>server_checks(check_time, status)</code> has one check every 5 minutes. An outage is a maximal run of <code>'down'</code> checks; it <b>ends</b> at the time of the next check (the first 'up'). Return <code>outage_start, outage_end, minutes</code> for every outage.</p>`,
    constraints: `10<sup>6</sup> checks; the last check might be 'down' (outage still open → end NULL).`,
    example: `<p>up up ${H.c('r', 'down down down')} up up ${H.c('r', 'down')} up up up → 10:10–10:25 (${H.c('r', '15 min')}) and 10:35–10:40 (${H.c('r', '5 min')}).</p>`,
    brute: { why: `<p>For each 'down' check, finding "the first later 'up'" with a correlated MIN subquery, then grouping by that recovery time, works — but it runs one subquery per check (O(n²) without an index) and is hard to read.</p>`,
      code: { lang: 'sql', db: 'shop', code: `SELECT MIN(d.check_time) AS outage_start, rec AS outage_end
FROM (SELECT c.check_time,
             (SELECT MIN(u.check_time) FROM server_checks u
              WHERE u.status = 'up' AND u.check_time > c.check_time) AS rec
      FROM server_checks c WHERE c.status = 'down') d
GROUP BY rec
ORDER BY outage_start;` } },
    mcq: { q: 'In the flag + running SUM method, when is the flag 1?', options: ['When status differs from the previous check (or there is no previous check)', 'When status is down', 'Every 5 minutes', 'When the next check is up'], answer: 0, explain: 'The flag marks the start of a new run; the running SUM of flags then numbers the runs.' },
    hints: [`<p>Hint 1: number the runs with a change flag and a running SUM.</p>`, `<p>Hint 2: carry <code>LEAD(check_time)</code> on each row — for the last row of a run it is the first check of the next run.</p>`, `<p>Hint 3: group by run, keep status = 'down', end = MAX(next_check), minutes from integer seconds.</p>`],
    tests: { engine: 'sqlite', check: '(rows, cols, c) => {\n  if (c.plan || c.noplan) { const d = rows.map(r => r[r.length - 1]).join(\'\\n\'); return (!c.plan || new RegExp(c.plan).test(d)) && (!c.noplan || !new RegExp(c.noplan).test(d)); }\n  let a = rows, b = c.rows || [];\n  if (c.set) { const k = r => JSON.stringify(r); a = a.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); b = b.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); }\n  return a.length === b.length && a.every((r, i) => r.length === b[i].length && r.every((v, j) => v === b[i][j] || (typeof v === \'number\' && typeof b[i][j] === \'number\' && Math.abs(v - b[i][j]) < 1e-6)));\n}', cases: [
      { setup: '', rows: [
          ['2024-05-01 10:10', '2024-05-01 10:25', 15],
          ['2024-05-01 10:35', '2024-05-01 10:40', 5]
        ] },
      { setup: 'INSERT INTO server_checks VALUES (\'2024-05-01 10:55\',\'down\'),(\'2024-05-01 11:00\',\'down\')', rows: [
          ['2024-05-01 10:10', '2024-05-01 10:25', 15],
          ['2024-05-01 10:35', '2024-05-01 10:40', 5],
          ['2024-05-01 10:55', null, null]
        ] },
      { setup: 'DELETE FROM server_checks', rows: [] },
      { setup: 'UPDATE server_checks SET status = \'up\'', rows: [] },
      { setup: 'UPDATE server_checks SET status = \'down\'', rows: [
          ['2024-05-01 10:00', null, null]
        ] },
      { setup: 'INSERT INTO server_checks VALUES (\'2024-05-01 09:55\',\'down\')', rows: [
          ['2024-05-01 09:55', '2024-05-01 10:00', 5],
          ['2024-05-01 10:10', '2024-05-01 10:25', 15],
          ['2024-05-01 10:35', '2024-05-01 10:40', 5]
        ] },
      { setup: 'INSERT INTO server_checks VALUES (\'2024-05-01 11:00\',\'up\'),(\'2024-05-01 11:05\',\'down\'),(\'2024-05-01 11:10\',\'up\')', rows: [
          ['2024-05-01 10:10', '2024-05-01 10:25', 15],
          ['2024-05-01 10:35', '2024-05-01 10:40', 5],
          ['2024-05-01 11:05', '2024-05-01 11:10', 5]
        ] },
      { setup: 'DELETE FROM server_checks WHERE check_time > \'2024-05-01 10:10\'', rows: [
          ['2024-05-01 10:10', null, null]
        ] },
      { setup: 'INSERT INTO server_checks VALUES (\'2024-05-02 00:00\',\'down\'),(\'2024-05-02 00:05\',\'up\')', rows: [
          ['2024-05-01 10:10', '2024-05-01 10:25', 15],
          ['2024-05-01 10:35', '2024-05-01 10:40', 5],
          ['2024-05-02 00:00', '2024-05-02 00:05', 5]
        ] }
    ] },
    solution: {
      approach: `<p>Status islands with flag + running SUM; LEAD supplies the recovery time; aggregate down-runs only.</p>`,
      code: { lang: 'sql', db: 'shop', code: `WITH f AS (
  SELECT check_time, status,
         CASE WHEN status = LAG(status) OVER (ORDER BY check_time) THEN 0 ELSE 1 END AS new_run,
         LEAD(check_time) OVER (ORDER BY check_time) AS next_check
  FROM server_checks
),
g AS (
  SELECT *, SUM(new_run) OVER (ORDER BY check_time) AS run_id FROM f
)
SELECT MIN(check_time) AS outage_start,
       CASE WHEN COUNT(next_check) = COUNT(*) THEN MAX(next_check) END AS outage_end,   -- first check after the run (NULL if still down)
       CASE WHEN COUNT(next_check) = COUNT(*)
            THEN (strftime('%s', MAX(next_check)) - strftime('%s', MIN(check_time))) / 60 END AS minutes
FROM g
WHERE status = 'down'
GROUP BY run_id
ORDER BY outage_start;` },
      complexity: `<p>One sort by check_time and three window passes: O(n log n), O(n) memory.</p>`,
      followUps: ['Total downtime per day and an uptime percentage.', 'Ignore single-check blips (outages shorter than 2 checks).']
    }
  });

  practice.push({
    title: 'Median Delivered Order Amount per Customer', level: 'Medium', tags: ['median', 'per group'], companies: ['Instacart', 'DoorDash'],
    statement: `<p>For each customer with at least one <b>delivered</b> order, return <code>name, median_amount, orders</code> (count of delivered orders). Even counts average the two middle amounts.</p>`,
    constraints: `10<sup>7</sup> orders; no MEDIAN function (SQLite 3.45).`,
    example: `<p>Asha delivered 120, 300, 90 → sorted 90, ${H.c('g', '120')}, 300 → 120. Ben delivered 80, 80, 220, 35 → 35, ${H.c('g', '80, 80')}, 220 → 80. Cara's cancelled 45 is ignored → 150.</p>`,
    brute: { why: `<p>Using <code>AVG(amount)</code> answers a different question (Asha's mean is 170 because of the 300 order). The correlated "half below / half above" median is O(k²) per customer.</p>`,
      code: { lang: 'sql', db: 'shop', code: `SELECT c.name, AVG(o.amount) AS not_the_median
FROM orders o JOIN customers c ON c.customer_id = o.customer_id
WHERE o.status = 'delivered'
GROUP BY c.customer_id, c.name;` } },
    mcq: { q: 'Where must the delivered filter go?', options: ['In WHERE, before the window functions number the rows', 'After the median is computed', 'In HAVING', 'It does not matter'], answer: 0, explain: 'If cancelled rows are numbered too, they shift the middle positions. Filter first, then rank.' },
    hints: [`<p>Hint 1: filter to delivered orders first, before any numbering.</p>`, `<p>Hint 2: <code>ROW_NUMBER()</code> and <code>COUNT(*)</code> both <code>OVER (PARTITION BY customer_id …)</code>.</p>`, `<p>Hint 3: keep <code>rn IN ((cnt+1)/2, (cnt+2)/2)</code>, then AVG per customer.</p>`],
    tests: { engine: 'sqlite', check: '(rows, cols, c) => {\n  if (c.plan || c.noplan) { const d = rows.map(r => r[r.length - 1]).join(\'\\n\'); return (!c.plan || new RegExp(c.plan).test(d)) && (!c.noplan || !new RegExp(c.noplan).test(d)); }\n  let a = rows, b = c.rows || [];\n  if (c.set) { const k = r => JSON.stringify(r); a = a.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); b = b.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); }\n  return a.length === b.length && a.every((r, i) => r.length === b[i].length && r.every((v, j) => v === b[i][j] || (typeof v === \'number\' && typeof b[i][j] === \'number\' && Math.abs(v - b[i][j]) < 1e-6)));\n}', cases: [
      { setup: '', rows: [
          ['Asha', 120, 3],
          ['Ben', 80, 4],
          ['Cara', 150, 2],
          ['Dan', 500, 3],
          ['Eve', 60, 2]
        ] },
      { setup: 'DELETE FROM orders', rows: [] },
      { setup: 'INSERT INTO orders VALUES (20,6,\'2024-05-01\',10,\'delivered\')', rows: [
          ['Asha', 120, 3],
          ['Ben', 80, 4],
          ['Cara', 150, 2],
          ['Dan', 500, 3],
          ['Eve', 60, 2],
          ['Finn', 10, 1]
        ] },
      { setup: 'INSERT INTO orders VALUES (20,6,\'2024-05-01\',10,\'returned\')', rows: [
          ['Asha', 120, 3],
          ['Ben', 80, 4],
          ['Cara', 150, 2],
          ['Dan', 500, 3],
          ['Eve', 60, 2]
        ] },
      { setup: 'INSERT INTO orders VALUES (20,1,\'2024-05-01\',1000,\'delivered\')', rows: [
          ['Asha', 210, 4],
          ['Ben', 80, 4],
          ['Cara', 150, 2],
          ['Dan', 500, 3],
          ['Eve', 60, 2]
        ] },
      { setup: 'INSERT INTO orders VALUES (20,1,\'2024-05-01\',1,\'delivered\'),(21,1,\'2024-05-02\',2,\'delivered\')', rows: [
          ['Asha', 90, 5],
          ['Ben', 80, 4],
          ['Cara', 150, 2],
          ['Dan', 500, 3],
          ['Eve', 60, 2]
        ] },
      { setup: 'UPDATE orders SET status = \'delivered\'', rows: [
          ['Asha', 210, 4],
          ['Ben', 80, 4],
          ['Cara', 150, 3],
          ['Dan', 500, 3],
          ['Eve', 60, 2]
        ] },
      { setup: 'UPDATE orders SET status = \'cancelled\' WHERE customer_id = 4', rows: [
          ['Asha', 120, 3],
          ['Ben', 80, 4],
          ['Cara', 150, 2],
          ['Eve', 60, 2]
        ] }
    ] },
    solution: {
      approach: `<p>Per-customer median with the ROW_NUMBER + COUNT window recipe on the filtered rows.</p>`,
      code: { lang: 'sql', db: 'shop', code: `WITH r AS (
  SELECT c.name, o.customer_id, o.amount,
         ROW_NUMBER() OVER (PARTITION BY o.customer_id ORDER BY o.amount, o.order_id) AS rn,
         COUNT(*)     OVER (PARTITION BY o.customer_id)                           AS cnt
  FROM orders o JOIN customers c ON c.customer_id = o.customer_id
  WHERE o.status = 'delivered'
)
SELECT name, AVG(amount) AS median_amount, MAX(cnt) AS orders
FROM r
WHERE rn IN ((cnt + 1) / 2, (cnt + 2) / 2)
GROUP BY customer_id, name
ORDER BY name;` },
      complexity: `<p>O(n log n) partitioned sort over delivered orders.</p>`,
      followUps: ['Flag customers whose latest order is more than 2× their median.', 'Median per city instead of per customer.']
    }
  });

  practice.push({
    title: 'Suspected Double Charges (same amount within 30 days)', level: 'Medium', tags: ['duplicates', 'lag', 'time window'], companies: ['Stripe', 'PayPal', 'Razorpay'],
    statement: `<p>A "suspected double charge" is an order whose customer already had an order of the <b>same amount</b> in the previous <b>30 days</b>. Return <code>customer_id, order_id, amount, prev_date, order_date</code> for each suspicious order.</p>`,
    constraints: `10<sup>8</sup> orders; dates are 'YYYY-MM-DD'.`,
    example: `<p>Ben: 80 on 01-04 and ${H.c('r', '80 on 02-01')} (28 days) → flagged. Asha: 300 on 01-10 and 02-14 (35 days) → ${H.c('g', 'not flagged')}. Cara and Eve are flagged too.</p>`,
    brute: { why: `<p>A self-join on (customer, amount) with a date-difference condition compares every pair of equal-amount orders per customer — quadratic for customers with many identical orders (subscriptions!). LAG only looks at the immediately previous same-amount order.</p>`,
      code: { lang: 'sql', db: 'shop', code: `SELECT b.customer_id, b.order_id, b.amount, a.order_date AS prev_date, b.order_date
FROM orders a
JOIN orders b
  ON b.customer_id = a.customer_id AND b.amount = a.amount
 AND b.order_date > a.order_date
 AND julianday(b.order_date) - julianday(a.order_date) <= 30
ORDER BY b.customer_id;` } },
    mcq: { q: 'Why partition the LAG by both customer_id and amount?', options: ['So "previous" means the previous order of the same customer with the same amount', 'To make LAG faster', 'Because LAG requires two columns', 'To remove cancelled orders'], answer: 0, explain: 'Partitioning by (customer, amount) makes each partition a list of identical charges; LAG then gives the previous identical charge directly.' },
    hints: [`<p>Hint 1: "same customer and same amount" defines the group.</p>`, `<p>Hint 2: <code>LAG(order_date) OVER (PARTITION BY customer_id, amount ORDER BY order_date, order_id)</code>.</p>`, `<p>Hint 3: keep rows where <code>julianday(order_date) − julianday(prev_date) ≤ 30</code>.</p>`],
    tests: { engine: 'sqlite', check: '(rows, cols, c) => {\n  if (c.plan || c.noplan) { const d = rows.map(r => r[r.length - 1]).join(\'\\n\'); return (!c.plan || new RegExp(c.plan).test(d)) && (!c.noplan || !new RegExp(c.noplan).test(d)); }\n  let a = rows, b = c.rows || [];\n  if (c.set) { const k = r => JSON.stringify(r); a = a.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); b = b.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); }\n  return a.length === b.length && a.every((r, i) => r.length === b[i].length && r.every((v, j) => v === b[i][j] || (typeof v === \'number\' && typeof b[i][j] === \'number\' && Math.abs(v - b[i][j]) < 1e-6)));\n}', cases: [
      { setup: '', rows: [
          [2, 5, 80, '2024-01-04', '2024-02-01'],
          [3, 13, 150, '2024-02-20', '2024-03-18'],
          [5, 14, 60, '2024-03-01', '2024-03-22']
        ], set: true },
      { setup: 'INSERT INTO orders VALUES (20,6,\'2024-05-01\',10,\'delivered\'),(21,6,\'2024-05-31\',10,\'delivered\')', rows: [
          [2, 5, 80, '2024-01-04', '2024-02-01'],
          [3, 13, 150, '2024-02-20', '2024-03-18'],
          [5, 14, 60, '2024-03-01', '2024-03-22'],
          [6, 21, 10, '2024-05-01', '2024-05-31']
        ], set: true },
      { setup: 'INSERT INTO orders VALUES (20,6,\'2024-05-01\',10,\'delivered\'),(21,6,\'2024-06-01\',10,\'delivered\')', rows: [
          [2, 5, 80, '2024-01-04', '2024-02-01'],
          [3, 13, 150, '2024-02-20', '2024-03-18'],
          [5, 14, 60, '2024-03-01', '2024-03-22']
        ], set: true },
      { setup: 'INSERT INTO orders VALUES (20,6,\'2024-05-01\',10,\'delivered\'),(21,6,\'2024-05-01\',10,\'delivered\'),(22,6,\'2024-05-20\',10,\'delivered\')', rows: [
          [2, 5, 80, '2024-01-04', '2024-02-01'],
          [3, 13, 150, '2024-02-20', '2024-03-18'],
          [5, 14, 60, '2024-03-01', '2024-03-22'],
          [6, 21, 10, '2024-05-01', '2024-05-01'],
          [6, 22, 10, '2024-05-01', '2024-05-20']
        ], set: true },
      { setup: 'INSERT INTO orders VALUES (20,6,\'2024-05-01\',10,\'delivered\'),(21,6,\'2024-05-02\',11,\'delivered\')', rows: [
          [2, 5, 80, '2024-01-04', '2024-02-01'],
          [3, 13, 150, '2024-02-20', '2024-03-18'],
          [5, 14, 60, '2024-03-01', '2024-03-22']
        ], set: true },
      { setup: 'DELETE FROM orders', rows: [], set: true },
      { setup: 'INSERT INTO orders VALUES (20,1,\'2024-03-15\',90,\'delivered\')', rows: [
          [1, 20, 90, '2024-03-15', '2024-03-15'],
          [2, 5, 80, '2024-01-04', '2024-02-01'],
          [3, 13, 150, '2024-02-20', '2024-03-18'],
          [5, 14, 60, '2024-03-01', '2024-03-22']
        ], set: true },
      { setup: 'INSERT INTO orders VALUES (20,1,\'2024-12-30\',120,\'delivered\'),(21,1,\'2025-01-20\',120,\'delivered\')', rows: [
          [1, 21, 120, '2024-12-30', '2025-01-20'],
          [2, 5, 80, '2024-01-04', '2024-02-01'],
          [3, 13, 150, '2024-02-20', '2024-03-18'],
          [5, 14, 60, '2024-03-01', '2024-03-22']
        ], set: true }
    ] },
    solution: {
      approach: `<p>Partition by the duplicate key, LAG the date, keep rows whose gap is within the window: one sort, one pass.</p>`,
      code: { lang: 'sql', db: 'shop', code: `WITH x AS (
  SELECT customer_id, order_id, amount, order_date,
         LAG(order_date) OVER (PARTITION BY customer_id, amount
                               ORDER BY order_date, order_id) AS prev_date
  FROM orders
)
SELECT customer_id, order_id, amount, prev_date, order_date
FROM x
WHERE julianday(order_date) - julianday(prev_date) <= 30
ORDER BY customer_id, order_date;` },
      complexity: `<p>O(n log n) for the partitioned sort; linear scan afterwards.</p>`,
      followUps: ['Use a 10-minute window on timestamps instead of 30 days.', 'Exclude orders that were refunded.']
    }
  });

  /* =====================================================================
     PRACTICE — Hard
     ===================================================================== */
  practice.push({
    title: 'Human Traffic of Stadium', level: 'Hard', tags: ['gaps and islands', 'row_number'], companies: ['Amazon', 'Meta', 'Google'],
    statement: `<p>Table <code>stadium(id, visit_date, people)</code>; id increases with visit_date. Return all rows that belong to a run of <b>three or more consecutive ids</b> where every row has <code>people ≥ 100</code>, ordered by visit_date.</p>`,
    constraints: `Up to 10<sup>6</sup> rows; ids are consecutive integers, dates may skip days (consecutive is about ids).`,
    example: `<p>people by id: 10, 109, 150, 99, ${H.c('g', '145, 1455, 199, 188')} → ids 2–3 form a run of only 2 (${H.c('r', 'excluded')}); ids ${H.c('g', '5, 6, 7, 8')} qualify.</p>`,
    brute: { why: `<p>The classic triple self-join checks whether each row is the first, middle or last of some 3-row window — n³ candidate combinations before filtering, three OR-ed patterns that are easy to get wrong, and it cannot express "at least K" without more joins.</p>`,
      code: { lang: 'sql', db: 'shop', code: `SELECT DISTINCT a.*
FROM stadium a, stadium b, stadium c
WHERE a.people >= 100 AND b.people >= 100 AND c.people >= 100
  AND (   (b.id = a.id + 1 AND c.id = a.id + 2)    -- a is first
       OR (b.id = a.id - 1 AND c.id = a.id + 1)    -- a is middle
       OR (b.id = a.id - 1 AND c.id = a.id - 2))   -- a is last
ORDER BY a.visit_date;` } },
    mcq: { q: 'Why filter people ≥ 100 BEFORE computing id − ROW_NUMBER()?', options: ['So a low-traffic row breaks the run: survivors are re-numbered and gaps appear in the key', 'Because ROW_NUMBER ignores WHERE', 'It is only for speed', 'To avoid duplicates'], answer: 0, explain: 'After filtering, the 99-person row is missing, so ids 3 and 5 are no longer consecutive and get different island keys.' },
    hints: [`<p>Hint 1: keep only busy rows first; consecutive busy ids are an island.</p>`, `<p>Hint 2: island key = <code>id − ROW_NUMBER() OVER (ORDER BY id)</code> computed on the filtered rows.</p>`, `<p>Hint 3: keep islands with <code>COUNT(*) &gt;= 3</code> (a windowed <code>COUNT(*) OVER (PARTITION BY island)</code> avoids a second scan).</p>`],
    tests: { engine: 'sqlite', check: '(rows, cols, c) => {\n  if (c.plan || c.noplan) { const d = rows.map(r => r[r.length - 1]).join(\'\\n\'); return (!c.plan || new RegExp(c.plan).test(d)) && (!c.noplan || !new RegExp(c.noplan).test(d)); }\n  let a = rows, b = c.rows || [];\n  if (c.set) { const k = r => JSON.stringify(r); a = a.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); b = b.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); }\n  return a.length === b.length && a.every((r, i) => r.length === b[i].length && r.every((v, j) => v === b[i][j] || (typeof v === \'number\' && typeof b[i][j] === \'number\' && Math.abs(v - b[i][j]) < 1e-6)));\n}', cases: [
      { setup: '', rows: [
          [5, '2017-01-05', 145],
          [6, '2017-01-06', 1455],
          [7, '2017-01-07', 199],
          [8, '2017-01-09', 188]
        ] },
      { setup: 'DELETE FROM stadium', rows: [] },
      { setup: 'UPDATE stadium SET people = 100', rows: [
          [1, '2017-01-01', 100],
          [2, '2017-01-02', 100],
          [3, '2017-01-03', 100],
          [4, '2017-01-04', 100],
          [5, '2017-01-05', 100],
          [6, '2017-01-06', 100],
          [7, '2017-01-07', 100],
          [8, '2017-01-09', 100]
        ] },
      { setup: 'UPDATE stadium SET people = 99', rows: [] },
      { setup: 'UPDATE stadium SET people = 120 WHERE id = 4', rows: [
          [2, '2017-01-02', 109],
          [3, '2017-01-03', 150],
          [4, '2017-01-04', 120],
          [5, '2017-01-05', 145],
          [6, '2017-01-06', 1455],
          [7, '2017-01-07', 199],
          [8, '2017-01-09', 188]
        ] },
      { setup: 'INSERT INTO stadium VALUES (9,\'2017-01-10\',100),(10,\'2017-01-11\',100)', rows: [
          [5, '2017-01-05', 145],
          [6, '2017-01-06', 1455],
          [7, '2017-01-07', 199],
          [8, '2017-01-09', 188],
          [9, '2017-01-10', 100],
          [10, '2017-01-11', 100]
        ] },
      { setup: 'DELETE FROM stadium WHERE id = 6', rows: [] },
      { setup: 'DELETE FROM stadium WHERE id > 3', rows: [] }
    ] },
    solution: {
      approach: `<p>Filter, compute the island key, count island sizes with a window, return rows of islands with size ≥ 3.</p>`,
      code: { lang: 'sql', db: 'shop', code: `WITH busy AS (
  SELECT id, visit_date, people,
         id - ROW_NUMBER() OVER (ORDER BY id) AS island
  FROM stadium
  WHERE people >= 100
),
sized AS (
  SELECT *, COUNT(*) OVER (PARTITION BY island) AS run_len FROM busy
)
SELECT id, visit_date, people
FROM sized
WHERE run_len >= 3
ORDER BY visit_date;` },
      dry: { head: ['id', 'people', 'rn', 'island', 'run_len'], rows: [['2', '109', '1', '1', '2'], ['3', '150', '2', '1', '2'], ['5', '145', '3', '2', H.c('g', '4')], ['8', '188', '6', '2', H.c('g', '4')]] },
      complexity: `<p>O(n log n) (or O(n) using the id index order); two window passes.</p>`,
      followUps: ['Return each qualifying run as one row (start date, end date, total people).', 'Make it "3+ consecutive calendar days" instead of ids.']
    }
  });

  practice.push({
    title: 'Monthly Retention Matrix with Unobservable Months as NULL', level: 'Hard', tags: ['cohorts', 'retention', 'pivot'], companies: ['Amplitude', 'Spotify', 'Netflix'],
    statement: `<p>Build a cohort matrix: one row per signup month (<code>users.signup_date</code>) with <code>cohort_size</code> and retention percentages <code>m0..m3</code> (share of the cohort active — any login — in signup month + k). Months that lie <b>after the last month present in the data</b> must be NULL, not 0.</p>`,
    constraints: `10<sup>7</sup> users, 10<sup>9</sup> logins; cohorts can span year boundaries.`,
    example: `<p>Data ends in April 2024. Jan cohort (5): 100, 80, 40, 40. Feb (4): 100, 50, 25, ${H.c('b', 'NULL')} (May not observed yet). Mar (3): 100, 66.7, ${H.c('b', 'NULL, NULL')}.</p>`,
    brute: { why: `<p>One correlated subquery per (cohort, month) cell — and the common bug of showing 0 for future months, which reads as "everyone churned". Also, month offsets computed as <code>month(login) − month(signup)</code> break in January of the next year.</p>`,
      code: { lang: 'sql', db: 'app', code: `-- Shows 0 instead of NULL for months that have not happened yet.
SELECT strftime('%Y-%m', u.signup_date) AS cohort_month,
       COUNT(*) AS cohort_size,
       ROUND(100.0 * SUM(EXISTS (SELECT 1 FROM logins l WHERE l.user_id = u.user_id
              AND strftime('%Y-%m', l.login_ts) = strftime('%Y-%m', u.signup_date, 'start of month', '+1 month'))) / COUNT(*), 1) AS m1,
       ROUND(100.0 * SUM(EXISTS (SELECT 1 FROM logins l WHERE l.user_id = u.user_id
              AND strftime('%Y-%m', l.login_ts) = strftime('%Y-%m', u.signup_date, 'start of month', '+3 months'))) / COUNT(*), 1) AS m3
FROM users u
GROUP BY cohort_month;` } },
    mcq: { q: 'The March cohort shows M2 = 0% in a report generated in April. What is the problem?', options: ['M2 (May) has not happened yet; it should be NULL / blank', 'Nobody from March is retained', 'The denominator is wrong', 'Months should be days'], answer: 0, explain: 'This is right-censoring: you cannot observe the future. Showing 0 misleads readers into thinking the cohort churned completely.' },
    hints: [`<p>Hint 1: convert dates to a sequential month index <code>year*12 + month</code> so offsets work across years.</p>`, `<p>Hint 2: count active cohort members per (cohort, offset) in one aggregated CTE; get the last observed month index from the activity data.</p>`, `<p>Hint 3: for each output column k, <code>CASE WHEN cohort_idx + k &lt;= max_idx THEN ROUND(100.0 * COALESCE(active_k, 0) / size, 1) END</code> — no ELSE means NULL.</p>`],
    tests: { engine: 'sqlite', check: '(rows, cols, c) => {\n  if (c.plan || c.noplan) { const d = rows.map(r => r[r.length - 1]).join(\'\\n\'); return (!c.plan || new RegExp(c.plan).test(d)) && (!c.noplan || !new RegExp(c.noplan).test(d)); }\n  let a = rows, b = c.rows || [];\n  if (c.set) { const k = r => JSON.stringify(r); a = a.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); b = b.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); }\n  return a.length === b.length && a.every((r, i) => r.length === b[i].length && r.every((v, j) => v === b[i][j] || (typeof v === \'number\' && typeof b[i][j] === \'number\' && Math.abs(v - b[i][j]) < 1e-6)));\n}', cases: [
      { rows: [
          ['2024-01', 5, 100, 80, 40, 40],
          ['2024-02', 4, 100, 50, 25, null],
          ['2024-03', 3, 100, 66.7, null, null]
        ] },
      { setup: 'INSERT INTO logins VALUES (1,\'2024-06-01 10:00:00\')', rows: [
          ['2024-01', 5, 100, 80, 40, 40],
          ['2024-02', 4, 100, 50, 25, 0],
          ['2024-03', 3, 100, 66.7, 0, 0]
        ] },
      { setup: 'INSERT INTO users VALUES (13,\'mia\',\'2023-12-15\',\'IN\',\'ads\'); INSERT INTO logins VALUES (13,\'2023-12-20 10:00:00\'),(13,\'2024-01-20 10:00:00\')', rows: [
          ['2023-12', 1, 100, 100, 0, 0],
          ['2024-01', 5, 100, 80, 40, 40],
          ['2024-02', 4, 100, 50, 25, null],
          ['2024-03', 3, 100, 66.7, null, null]
        ] },
      { setup: 'INSERT INTO users VALUES (13,\'mia\',\'2023-12-15\',\'IN\',\'ads\')', rows: [
          ['2023-12', 1, 0, 0, 0, 0],
          ['2024-01', 5, 100, 80, 40, 40],
          ['2024-02', 4, 100, 50, 25, null],
          ['2024-03', 3, 100, 66.7, null, null]
        ] },
      { setup: 'DELETE FROM logins WHERE user_id <> 1', rows: [
          ['2024-01', 5, 20, 20, 20, 20],
          ['2024-02', 4, 0, 0, 0, null],
          ['2024-03', 3, 0, 0, null, null]
        ] },
      { setup: 'INSERT INTO logins VALUES (11,\'2024-03-09 10:00:00\'),(11,\'2024-04-09 10:00:00\'),(11,\'2024-05-09 10:00:00\')', rows: [
          ['2024-01', 5, 100, 80, 40, 40],
          ['2024-02', 4, 100, 50, 25, 0],
          ['2024-03', 3, 100, 100, 33.3, null]
        ] },
      { setup: 'DELETE FROM logins WHERE user_id = 12', rows: [
          ['2024-01', 5, 100, 80, 40, 40],
          ['2024-02', 4, 100, 50, 25, null],
          ['2024-03', 3, 66.7, 33.3, null, null]
        ] },
      { setup: 'INSERT INTO users VALUES (13,\'mia\',\'2024-04-30\',\'IN\',\'ads\'); INSERT INTO logins VALUES (13,\'2024-04-30 10:00:00\')', rows: [
          ['2024-01', 5, 100, 80, 40, 40],
          ['2024-02', 4, 100, 50, 25, null],
          ['2024-03', 3, 100, 66.7, null, null],
          ['2024-04', 1, 100, null, null, null]
        ] },
      { setup: 'INSERT INTO logins VALUES (2,\'2024-01-04 10:00:00\'),(2,\'2024-01-04 11:00:00\')', rows: [
          ['2024-01', 5, 100, 80, 40, 40],
          ['2024-02', 4, 100, 50, 25, null],
          ['2024-03', 3, 100, 66.7, null, null]
        ] }
    ] },
    solution: {
      approach: `<p>Sequential month indexes, one aggregation of active users per (cohort, offset), cohort sizes from the users table (correct denominator), and a censoring CASE per column.</p>`,
      code: { lang: 'sql', db: 'app', code: `WITH cohort AS (
  SELECT user_id, strftime('%Y-%m', signup_date) AS cohort_month,
         CAST(strftime('%Y', signup_date) AS INTEGER) * 12 + CAST(strftime('%m', signup_date) AS INTEGER) AS c_idx
  FROM users
),
activity AS (
  SELECT DISTINCT user_id,
         CAST(strftime('%Y', login_ts) AS INTEGER) * 12 + CAST(strftime('%m', login_ts) AS INTEGER) AS a_idx
  FROM logins
),
last_month AS (SELECT MAX(a_idx) AS max_idx FROM activity),
sizes AS (
  SELECT cohort_month, MIN(c_idx) AS c_idx, COUNT(*) AS cohort_size FROM cohort GROUP BY cohort_month
),
hits AS (
  SELECT c.cohort_month, a.a_idx - c.c_idx AS k, COUNT(DISTINCT c.user_id) AS active
  FROM cohort c JOIN activity a ON a.user_id = c.user_id AND a.a_idx >= c.c_idx
  GROUP BY c.cohort_month, k
),
wide AS (                                            -- pivot the offsets
  SELECT s.cohort_month, s.c_idx, s.cohort_size,
         COALESCE(MAX(CASE WHEN h.k = 0 THEN h.active END), 0) AS a0,
         COALESCE(MAX(CASE WHEN h.k = 1 THEN h.active END), 0) AS a1,
         COALESCE(MAX(CASE WHEN h.k = 2 THEN h.active END), 0) AS a2,
         COALESCE(MAX(CASE WHEN h.k = 3 THEN h.active END), 0) AS a3
  FROM sizes s LEFT JOIN hits h ON h.cohort_month = s.cohort_month
  GROUP BY s.cohort_month, s.c_idx, s.cohort_size
)
SELECT w.cohort_month, w.cohort_size,
       CASE WHEN w.c_idx + 0 <= l.max_idx THEN ROUND(100.0 * w.a0 / w.cohort_size, 1) END AS m0,
       CASE WHEN w.c_idx + 1 <= l.max_idx THEN ROUND(100.0 * w.a1 / w.cohort_size, 1) END AS m1,
       CASE WHEN w.c_idx + 2 <= l.max_idx THEN ROUND(100.0 * w.a2 / w.cohort_size, 1) END AS m2,
       CASE WHEN w.c_idx + 3 <= l.max_idx THEN ROUND(100.0 * w.a3 / w.cohort_size, 1) END AS m3
FROM wide w CROSS JOIN last_month l
ORDER BY w.cohort_month;` },
      dry: { head: ['cohort', 'size', 'active k=0..3', 'output'], rows: [['2024-01', '5', '5, 4, 2, 2', '100, 80, 40, 40'], ['2024-02', '4', '4, 2, 1, (May unseen)', '100, 50, 25, NULL'], ['2024-03', '3', '3, 2, (unseen), (unseen)', '100, 66.7, NULL, NULL']] },
      complexity: `<p>One DISTINCT over logins (dominant, O(n log n) or hashed), then tiny aggregates. In production, pre-aggregate monthly activity per user.</p>`,
      followUps: ['Use rolling 30-day periods instead of calendar months.', 'Add a "retained in or after month k" (unbounded) variant.', 'Split each cohort by acquisition channel.']
    }
  });

  practice.push({
    title: 'Merge Overlapping Meetings and Total Busy Time', level: 'Hard', tags: ['gaps and islands', 'interval merging', 'running max'], companies: ['Google', 'Microsoft', 'Calendly'],
    statement: `<p><code>meetings(room, start_time, end_time)</code> uses 'HH:MM' times on one day. Merge meetings that overlap or touch into busy blocks per room, then return <code>room, busy_blocks, busy_minutes, blocks</code> (blocks listed as "09:00-11:00, …").</p>`,
    constraints: `10<sup>6</sup> meetings; intervals can nest, overlap, or touch; input is unsorted.`,
    example: `<p>Room A: 09:00–10:00, 09:30–10:30, 10:30–11:00 → ${H.c('g', '09:00–11:00')}; 13:00–14:00 contains 13:15–13:45 → ${H.c('g', '13:00–14:00')}. Busy 180 min (the naive sum says ${H.c('r', '240')}).</p>`,
    brute: { why: `<p>Summing every meeting's duration double-counts overlaps (Room A: 240 instead of 180). Comparing only with the previous meeting (LAG end) fails for nested intervals — a long meeting can overlap something two rows later. You need the running maximum end.</p>`,
      code: { lang: 'sql', db: 'shop', code: `SELECT room,
       SUM((strftime('%s', '2024-01-01 ' || end_time)
          - strftime('%s', '2024-01-01 ' || start_time)) / 60) AS naive_busy_minutes   -- double counts
FROM meetings
GROUP BY room;` } },
    mcq: { q: 'Sorted meetings: 09:00–12:00, 09:30–10:00, 11:00–11:30. Using LAG(end_time) only, what goes wrong for the third meeting?', options: ['It compares with 10:00, sees no overlap and starts a new block, although 09:00–12:00 still covers it', 'Nothing, LAG is enough', 'It merges with the wrong room', 'It causes an infinite loop'], answer: 0, explain: 'The previous row ended at 10:00, but an earlier row runs until 12:00. A running MAX(end) over all previous rows catches this.' },
    hints: [`<p>Hint 1: sort by start; a meeting starts a new block only if it begins after every earlier meeting in the room has ended.</p>`, `<p>Hint 2: <code>MAX(end_time) OVER (PARTITION BY room ORDER BY start_time ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING)</code>.</p>`, `<p>Hint 3: flag new blocks, running SUM → block id, GROUP BY room, block for MIN/MAX, then sum durations per room with integer seconds.</p>`],
    tests: { engine: 'sqlite', check: '(rows, cols, c) => {\n  if (c.plan || c.noplan) { const d = rows.map(r => r[r.length - 1]).join(\'\\n\'); return (!c.plan || new RegExp(c.plan).test(d)) && (!c.noplan || !new RegExp(c.noplan).test(d)); }\n  let a = rows, b = c.rows || [];\n  if (c.set) { const k = r => JSON.stringify(r); a = a.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); b = b.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); }\n  return a.length === b.length && a.every((r, i) => r.length === b[i].length && r.every((v, j) => v === b[i][j] || (typeof v === \'number\' && typeof b[i][j] === \'number\' && Math.abs(v - b[i][j]) < 1e-6)));\n}', cases: [
      { setup: '', rows: [
          ['A', 2, 180, '09:00-11:00, 13:00-14:00'],
          ['B', 2, 150, '09:00-09:30, 10:00-12:00']
        ] },
      { setup: 'DELETE FROM meetings', rows: [] },
      { setup: 'INSERT INTO meetings VALUES (\'C\',\'08:00\',\'08:00\')', rows: [
          ['A', 2, 180, '09:00-11:00, 13:00-14:00'],
          ['B', 2, 150, '09:00-09:30, 10:00-12:00'],
          ['C', 1, 0, '08:00-08:00']
        ] },
      { setup: 'INSERT INTO meetings VALUES (\'C\',\'08:00\',\'09:00\'),(\'C\',\'09:00\',\'10:00\'),(\'C\',\'10:01\',\'11:00\')', rows: [
          ['A', 2, 180, '09:00-11:00, 13:00-14:00'],
          ['B', 2, 150, '09:00-09:30, 10:00-12:00'],
          ['C', 2, 179, '08:00-10:00, 10:01-11:00']
        ] },
      { setup: 'INSERT INTO meetings VALUES (\'C\',\'09:00\',\'17:00\'),(\'C\',\'10:00\',\'11:00\'),(\'C\',\'12:00\',\'13:00\')', rows: [
          ['A', 2, 180, '09:00-11:00, 13:00-14:00'],
          ['B', 2, 150, '09:00-09:30, 10:00-12:00'],
          ['C', 1, 480, '09:00-17:00']
        ] },
      { setup: 'INSERT INTO meetings VALUES (\'A\',\'07:00\',\'23:59\')', rows: [
          ['A', 1, 1019, '07:00-23:59'],
          ['B', 2, 150, '09:00-09:30, 10:00-12:00']
        ] },
      { setup: 'INSERT INTO meetings VALUES (\'C\',\'11:00\',\'12:00\'),(\'C\',\'08:00\',\'09:00\'),(\'C\',\'09:30\',\'10:00\')', rows: [
          ['A', 2, 180, '09:00-11:00, 13:00-14:00'],
          ['B', 2, 150, '09:00-09:30, 10:00-12:00'],
          ['C', 3, 150, '08:00-09:00, 09:30-10:00, 11:00-12:00']
        ] },
      { setup: 'DELETE FROM meetings WHERE room = \'A\'', rows: [
          ['B', 2, 150, '09:00-09:30, 10:00-12:00']
        ] },
      { setup: 'INSERT INTO meetings VALUES (\'A\',\'09:00\',\'10:00\')', rows: [
          ['A', 2, 180, '09:00-11:00, 13:00-14:00'],
          ['B', 2, 150, '09:00-09:30, 10:00-12:00']
        ] }
    ] },
    solution: {
      approach: `<p>Interval merging as gaps-and-islands: running max of previous ends, new-block flag, running sum, aggregate blocks, then aggregate rooms.</p>`,
      code: { lang: 'sql', db: 'shop', code: `WITH m AS (
  SELECT room, start_time, end_time,
         MAX(end_time) OVER (PARTITION BY room ORDER BY start_time, end_time
                             ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING) AS max_end_before
  FROM meetings
),
b AS (
  SELECT *, SUM(CASE WHEN max_end_before IS NULL OR start_time > max_end_before THEN 1 ELSE 0 END)
              OVER (PARTITION BY room ORDER BY start_time, end_time) AS block
  FROM m
),
merged AS (
  SELECT room, block, MIN(start_time) AS busy_from, MAX(end_time) AS busy_to
  FROM b GROUP BY room, block
)
SELECT room,
       COUNT(*) AS busy_blocks,
       SUM((strftime('%s', '2024-01-01 ' || busy_to) - strftime('%s', '2024-01-01 ' || busy_from)) / 60) AS busy_minutes,
       GROUP_CONCAT(busy_from || '-' || busy_to, ', ') AS blocks
FROM merged
GROUP BY room
ORDER BY room;` },
      dry: { head: ['room', 'meeting', 'max_end_before', 'new block?', 'block'], rows: [['A', '09:00–10:00', 'NULL', 'yes', '1'], ['A', '10:30–11:00', '10:30', 'no (touching)', '1'], ['A', '13:00–14:00', '11:00', 'yes', '2'], ['B', '10:00–11:00', '09:30', 'yes', '2']] },
      complexity: `<p>O(n log n) sort per room; linear window passes.</p>`,
      followUps: ['Find free slots of at least 30 minutes between 09:00 and 18:00.', 'Maximum number of meetings running at the same time (sweep line with +1/−1 events).']
    }
  });

  practice.push({
    title: 'Total Team Cost under Every Manager', level: 'Hard', tags: ['recursive cte', 'hierarchy', 'rollup'], companies: ['Workday', 'LinkedIn', 'Oracle'],
    statement: `<p>For every employee who manages at least one person, return <code>manager, total_reports</code> (direct + indirect) and <code>team_cost</code> (salaries of everyone below them, <b>excluding</b> the manager), ordered by team_cost descending.</p>`,
    constraints: `10<sup>5</sup> employees; tree depth up to 20; must terminate even if the data accidentally contains a cycle.`,
    example: `<p>${H.c('g', 'Asha')}: 16 reports, cost 1961000. Ben: 6 reports (Dev, Eli, Fay, Gus, Hana, Ivan) cost 735000. Nia: Pia + Raj = 155000.</p>`,
    brute: { why: `<p>A fixed number of self-joins only sees as many levels as you write: a 2-level join finds 8 reports for Asha instead of 16 and misses the 3rd level entirely. Adding one join per level is fragile and still assumes a maximum depth.</p>`,
      code: { lang: 'sql', db: 'hr', code: `-- Sees only 2 levels: Asha gets 8 reports instead of 16.
SELECT m.name AS manager,
       COUNT(DISTINCT r1.id) + COUNT(DISTINCT r2.id) AS reports_two_levels
FROM employees m
JOIN employees r1      ON r1.manager_id = m.id
LEFT JOIN employees r2 ON r2.manager_id = r1.id
GROUP BY m.id, m.name
ORDER BY reports_two_levels DESC;` } },
    mcq: { q: 'In the pairs CTE, why does the anchor pair every employee with themselves?', options: ['So every employee becomes a root whose subtree is then expanded downward', 'To count the CEO twice', 'Because recursive CTEs need two columns', 'To stop cycles'], answer: 0, explain: 'Starting with (id, id) for everyone lets one recursion compute the subtree of every node at once; GROUP BY ancestor then rolls up each subtree.' },
    hints: [`<p>Hint 1: you need every (ancestor, descendant) pair — a closure table built on the fly.</p>`, `<p>Hint 2: anchor <code>SELECT id, id, 0</code>; step joins employees whose manager_id = descendant, depth + 1, with <code>WHERE depth &lt; 20</code>.</p>`, `<p>Hint 3: drop depth-0 pairs (the manager themself), GROUP BY ancestor, COUNT and SUM the descendants' salaries.</p>`],
    tests: { engine: 'sqlite', check: '(rows, cols, c) => {\n  if (c.plan || c.noplan) { const d = rows.map(r => r[r.length - 1]).join(\'\\n\'); return (!c.plan || new RegExp(c.plan).test(d)) && (!c.noplan || !new RegExp(c.noplan).test(d)); }\n  let a = rows, b = c.rows || [];\n  if (c.set) { const k = r => JSON.stringify(r); a = a.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); b = b.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); }\n  return a.length === b.length && a.every((r, i) => r.length === b[i].length && r.every((v, j) => v === b[i][j] || (typeof v === \'number\' && typeof b[i][j] === \'number\' && Math.abs(v - b[i][j]) < 1e-6)));\n}', cases: [
      { rows: [
          ['Asha', 16, 1961000],
          ['Ben', 6, 735000],
          ['Mo', 4, 330000],
          ['Cara', 3, 326000],
          ['Dev', 2, 230000],
          ['Eli', 2, 205000],
          ['Jia', 2, 196000],
          ['Nia', 2, 155000]
        ], set: true },
      { setup: 'DELETE FROM employees WHERE id NOT IN (1)', rows: [], set: true },
      { setup: 'DELETE FROM employees WHERE id NOT IN (1,2)', rows: [
          ['Asha', 1, 220000]
        ], set: true },
      { setup: 'INSERT INTO employees VALUES (18,\'Zed\',\'Sales\',10,17,\'2024-01-01\'); INSERT INTO employees VALUES (19,\'Yan\',\'Sales\',20,18,\'2024-01-01\')', rows: [
          ['Asha', 18, 1961030],
          ['Ben', 6, 735000],
          ['Mo', 6, 330030],
          ['Cara', 3, 326000],
          ['Dev', 2, 230000],
          ['Eli', 2, 205000],
          ['Jia', 2, 196000],
          ['Nia', 4, 155030],
          ['Raj', 2, 30],
          ['Zed', 1, 20]
        ], set: true },
      { setup: 'UPDATE employees SET manager_id = NULL WHERE id = 1; UPDATE employees SET manager_id = NULL WHERE id = 13', rows: [
          ['Asha', 11, 1491000],
          ['Ben', 6, 735000],
          ['Mo', 4, 330000],
          ['Cara', 3, 326000],
          ['Dev', 2, 230000],
          ['Eli', 2, 205000],
          ['Jia', 2, 196000],
          ['Nia', 2, 155000]
        ], set: true },
      { setup: 'UPDATE employees SET salary = 1', rows: [
          ['Asha', 16, 16],
          ['Ben', 6, 6],
          ['Mo', 4, 4],
          ['Cara', 3, 3],
          ['Dev', 2, 2],
          ['Eli', 2, 2],
          ['Jia', 2, 2],
          ['Nia', 2, 2]
        ], set: true },
      { setup: 'DELETE FROM employees WHERE id IN (2)', rows: [
          ['Asha', 9, 1006000],
          ['Mo', 4, 330000],
          ['Cara', 3, 326000],
          ['Dev', 2, 230000],
          ['Eli', 2, 205000],
          ['Jia', 2, 196000],
          ['Nia', 2, 155000]
        ], set: true },
      { setup: 'DELETE FROM employees', rows: [], set: true }
    ] },
    solution: {
      approach: `<p>Recursive closure pairs with a depth guard, exclude self-pairs, aggregate per ancestor.</p>`,
      code: { lang: 'sql', db: 'hr', code: `WITH RECURSIVE pairs(ancestor, descendant, depth) AS (
  SELECT id, id, 0 FROM employees
  UNION ALL
  SELECT p.ancestor, e.id, p.depth + 1
  FROM pairs p
  JOIN employees e ON e.manager_id = p.descendant
  WHERE p.depth < 20                                  -- guard against cycles
)
SELECT a.name        AS manager,
       COUNT(*)      AS total_reports,
       SUM(d.salary) AS team_cost
FROM pairs p
JOIN employees a ON a.id = p.ancestor
JOIN employees d ON d.id = p.descendant
WHERE p.depth > 0                                     -- exclude the manager
GROUP BY a.id, a.name
ORDER BY team_cost DESC;` },
      dry: { head: ['ancestor', 'descendants (depth > 0)', 'reports', 'team_cost'], rows: [['Asha', 'everyone else', '16', '1961000'], ['Ben', 'Dev, Eli, Fay, Gus, Hana, Ivan', '6', '735000'], ['Nia', 'Pia, Raj', '2', '155000']] },
      complexity: `<p>Number of pairs = Σ depth(node) ≈ O(n × average depth); with an index on manager_id each step is an index probe.</p>`,
      followUps: ['Show the most expensive team at each level of the org.', 'Find managers whose team cost exceeds 3× their own salary.']
    }
  });

  practice.push({
    title: 'Session-Level Conversion: View Then Cart in the Same Session', level: 'Hard', tags: ['sessionization', 'funnel'], companies: ['Amazon', 'Booking.com', 'Etsy'],
    statement: `<p>Sessionize <code>events</code> with a 30-minute inactivity timeout. Among sessions that contain at least one <code>view_product</code>, what share also contain an <code>add_to_cart</code> <b>after</b> the session's first view? Return <code>sessions_with_view, sessions_converted, pct</code>.</p>`,
    constraints: `10<sup>9</sup> events; ties broken by event_id.`,
    example: `<p>8 sessions contain a view (amy has two). Converted: amy s1, bob s1 (cart 58 min after his first view but in the same session), cat, fin, gia (across midnight) → ${H.c('g', '5 / 8 = 62.5%')}. dan's cart came before his view → ${H.c('r', 'not converted')}.</p>`,
    brute: { why: `<p>"Any cart within 30 minutes after a view" measures something else: it counts <b>views</b>, not sessions (9 views), and it misses same-session carts more than 30 minutes after the first view — the time window is not a session. Correlated EXISTS per view also rescans the user's events.</p>`,
      code: { lang: 'sql', db: 'app', code: `WITH v AS (SELECT user_id, event_time FROM events WHERE event_name = 'view_product')
SELECT COUNT(*) AS views,
       SUM(CASE WHEN EXISTS (SELECT 1 FROM events c
                             WHERE c.user_id = v.user_id AND c.event_name = 'add_to_cart'
                               AND c.event_time > v.event_time
                               AND strftime('%s', c.event_time) - strftime('%s', v.event_time) <= 1800)
                THEN 1 ELSE 0 END) AS converted_views
FROM v;` } },
    mcq: { q: 'What is the unit of analysis in this problem?', options: ['Sessions', 'Users', 'Events', 'Days'], answer: 0, explain: 'Both numerator and denominator count sessions. Mixing units (users on top, sessions below) produces meaningless ratios.' },
    hints: [`<p>Hint 1: reuse the sessionization CTE (LAG → flag → running SUM) to tag each event with (user_id, session_no).</p>`, `<p>Hint 2: per session compute the first view time with <code>MIN(CASE WHEN event_name = 'view_product' THEN event_time END)</code>.</p>`, `<p>Hint 3: a session converts if a cart in the same (user, session) is later than that first view — compute it with a second conditional MIN and compare.</p>`],
    tests: { engine: 'sqlite', check: '(rows, cols, c) => {\n  if (c.plan || c.noplan) { const d = rows.map(r => r[r.length - 1]).join(\'\\n\'); return (!c.plan || new RegExp(c.plan).test(d)) && (!c.noplan || !new RegExp(c.noplan).test(d)); }\n  let a = rows, b = c.rows || [];\n  if (c.set) { const k = r => JSON.stringify(r); a = a.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); b = b.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); }\n  return a.length === b.length && a.every((r, i) => r.length === b[i].length && r.every((v, j) => v === b[i][j] || (typeof v === \'number\' && typeof b[i][j] === \'number\' && Math.abs(v - b[i][j]) < 1e-6)));\n}', cases: [
      { rows: [
          [8, 5, 62.5]
        ] },
      { setup: 'DELETE FROM events', rows: [
          [0, null, null]
        ] },
      { setup: 'DELETE FROM events WHERE user_id <> 2', rows: [
          [1, 1, 100]
        ] },
      { setup: 'INSERT INTO events VALUES (100,9,\'2024-03-01 09:00:00\',\'view_product\'),(101,9,\'2024-03-01 09:00:00\',\'add_to_cart\')', rows: [
          [9, 5, 55.6]
        ] },
      { setup: 'INSERT INTO events VALUES (100,9,\'2024-03-01 09:00:00\',\'view_product\'),(101,9,\'2024-03-01 09:10:00\',\'add_to_cart\'),(102,9,\'2024-03-01 15:00:00\',\'view_product\'),(103,9,\'2024-03-01 15:05:00\',\'add_to_cart\')', rows: [
          [10, 7, 70]
        ] },
      { setup: 'INSERT INTO events VALUES (100,9,\'2024-03-01 09:00:00\',\'view_product\'),(101,9,\'2024-03-01 09:31:00\',\'add_to_cart\')', rows: [
          [9, 5, 55.6]
        ] },
      { setup: 'INSERT INTO events VALUES (100,9,\'2024-03-01 09:00:00\',\'search\'),(101,9,\'2024-03-01 09:10:00\',\'add_to_cart\')', rows: [
          [8, 5, 62.5]
        ] },
      { setup: 'DELETE FROM events WHERE user_id <> 8', rows: [
          [0, null, null]
        ] },
      { setup: 'INSERT INTO events VALUES (100,9,\'2024-03-01 09:00:00\',\'view_product\'),(101,9,\'2024-03-01 09:30:00\',\'add_to_cart\'),(102,10,\'2024-03-01 09:00:00\',\'view_product\')', rows: [
          [10, 6, 60]
        ] }
    ] },
    solution: {
      approach: `<p>Sessionize, then aggregate each session to (first view, first cart after any view). Using conditional MIN for the first view and a correlated check keeps it readable; at scale use MIN of cart times greater than first view via a self-join on the session key.</p>`,
      code: { lang: 'sql', db: 'app', code: `WITH ordered AS (
  SELECT user_id, event_id, event_time, event_name,
         LAG(event_time) OVER (PARTITION BY user_id ORDER BY event_time, event_id) AS prev_time
  FROM events
),
s AS (
  SELECT *, SUM(CASE WHEN prev_time IS NULL
                       OR strftime('%s', event_time) - strftime('%s', prev_time) > 1800
                     THEN 1 ELSE 0 END)
              OVER (PARTITION BY user_id ORDER BY event_time, event_id) AS session_no
  FROM ordered
),
per_session AS (
  SELECT user_id, session_no,
         MIN(CASE WHEN event_name = 'view_product' THEN event_time END) AS first_view
  FROM s
  GROUP BY user_id, session_no
),
conv AS (
  SELECT p.user_id, p.session_no,
         CASE WHEN EXISTS (SELECT 1 FROM s x
                           WHERE x.user_id = p.user_id AND x.session_no = p.session_no
                             AND x.event_name = 'add_to_cart' AND x.event_time > p.first_view)
              THEN 1 ELSE 0 END AS converted
  FROM per_session p
  WHERE p.first_view IS NOT NULL
)
SELECT COUNT(*)                                  AS sessions_with_view,
       SUM(converted)                            AS sessions_converted,
       ROUND(100.0 * SUM(converted) / COUNT(*), 1) AS pct
FROM conv;` },
      complexity: `<p>Sessionization O(n log n); the per-session check touches only that session's events (with an index or a join on (user_id, session_no)).</p>`,
      followUps: ['Extend to the full 4-step funnel at session level.', 'Report conversion by hour of day of the session start.']
    }
  });

  practice.push({
    title: 'Median from a Frequency Table', level: 'Hard', tags: ['median', 'running sum'], companies: ['Pinterest', 'Google'],
    statement: `<p><code>num_freq(num, frequency)</code> describes a multiset: each <code>num</code> occurs <code>frequency</code> times. Return the median of the expanded list as <code>median</code>, without materialising the expanded rows.</p>`,
    constraints: `Up to 10<sup>5</sup> distinct nums; frequencies up to 10<sup>9</sup> (expanding is impossible).`,
    example: `<p>(1×3, 2×4, 3×1, 5×2) expands to 10 values: 1, 1, 1, 2, ${H.c('p', '2, 2')}, 2, 3, 5, 5. Positions 5 and 6 (purple) are both 2 → median ${H.c('g', '2')}.</p>`,
    brute: { why: `<p>Expanding the list with a recursive CTE and then applying the ROW_NUMBER median works on toy data, but generates Σ frequency rows — 10<sup>14</sup> rows for realistic frequencies. The running sum needs only one row per distinct value.</p>`,
      code: { lang: 'sql', db: 'shop', code: `WITH RECURSIVE expanded(num, k) AS (
  SELECT num, 1 FROM num_freq
  UNION ALL
  SELECT e.num, e.k + 1 FROM expanded e JOIN num_freq f ON f.num = e.num
  WHERE e.k < f.frequency
),
r AS (SELECT num, ROW_NUMBER() OVER (ORDER BY num) AS rn, COUNT(*) OVER () AS cnt FROM expanded)
SELECT AVG(num) AS median FROM r WHERE rn IN ((cnt + 1) / 2, (cnt + 2) / 2);` } },
    mcq: { q: 'A value with cumulative count cum and frequency f occupies which positions?', options: ['cum − f + 1 through cum', '1 through cum', 'cum through cum + f', 'f through cum'], answer: 0, explain: 'The running total up to and including this value is cum, so its f copies occupy the last f positions ending at cum.' },
    hints: [`<p>Hint 1: the median needs positions (total+1)/2 and (total+2)/2 in the sorted expanded list.</p>`, `<p>Hint 2: <code>SUM(frequency) OVER (ORDER BY num)</code> gives the last position of each value; <code>SUM(frequency) OVER ()</code> gives the total.</p>`, `<p>Hint 3: keep values whose range [cum − f + 1, cum] contains either middle position, then AVG them.</p>`],
    tests: { engine: 'sqlite', check: '(rows, cols, c) => {\n  if (c.plan || c.noplan) { const d = rows.map(r => r[r.length - 1]).join(\'\\n\'); return (!c.plan || new RegExp(c.plan).test(d)) && (!c.noplan || !new RegExp(c.noplan).test(d)); }\n  let a = rows, b = c.rows || [];\n  if (c.set) { const k = r => JSON.stringify(r); a = a.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); b = b.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); }\n  return a.length === b.length && a.every((r, i) => r.length === b[i].length && r.every((v, j) => v === b[i][j] || (typeof v === \'number\' && typeof b[i][j] === \'number\' && Math.abs(v - b[i][j]) < 1e-6)));\n}', cases: [
      { setup: '', rows: [
          [2]
        ] },
      { setup: 'DELETE FROM num_freq', rows: [
          [null]
        ] },
      { setup: 'DELETE FROM num_freq; INSERT INTO num_freq VALUES (7,1)', rows: [
          [7]
        ] },
      { setup: 'DELETE FROM num_freq; INSERT INTO num_freq VALUES (1,1),(2,1)', rows: [
          [1.5]
        ] },
      { setup: 'DELETE FROM num_freq; INSERT INTO num_freq VALUES (1,1),(2,1),(3,1)', rows: [
          [2]
        ] },
      { setup: 'DELETE FROM num_freq; INSERT INTO num_freq VALUES (1,1000000000),(100,1000000000)', rows: [
          [50.5]
        ] },
      { setup: 'DELETE FROM num_freq; INSERT INTO num_freq VALUES (-5,3),(0,3),(5,3)', rows: [
          [0]
        ] },
      { setup: 'DELETE FROM num_freq; INSERT INTO num_freq VALUES (1,5),(2,1),(3,1)', rows: [
          [1]
        ] },
      { setup: 'DELETE FROM num_freq; INSERT INTO num_freq VALUES (1,1),(2,1),(3,1),(4,1)', rows: [
          [2.5]
        ] },
      { setup: 'DELETE FROM num_freq; INSERT INTO num_freq VALUES (10,2),(20,2)', rows: [
          [15]
        ] }
    ] },
    solution: {
      approach: `<p>Running sum of frequencies maps each value to a position range; select the value(s) covering the middle positions; average.</p>`,
      code: { lang: 'sql', db: 'shop', code: `WITH c AS (
  SELECT num, frequency,
         SUM(frequency) OVER (ORDER BY num) AS cum,
         SUM(frequency) OVER ()             AS total
  FROM num_freq
)
SELECT AVG(num) AS median
FROM c
WHERE cum - frequency < (total + 2) / 2      -- range starts at or before the upper middle
  AND cum >= (total + 1) / 2;                -- range ends at or after the lower middle` },
      dry: { head: ['num', 'freq', 'positions', 'covers 5 or 6?'], rows: [['1', '3', '1–3', 'no'], ['2', '4', '4–7', H.c('g', 'yes')], ['3', '1', '8', 'no'], ['5', '2', '9–10', 'no']] },
      complexity: `<p>O(d log d) for d distinct values — independent of the total frequency.</p>`,
      followUps: ['Return the 90th percentile the same way.', 'What if frequencies can be 0?']
    }
  });

  /* =====================================================================
     QUIZ
     ===================================================================== */
  quiz.push({ q: 'Salaries: 90, 80, 80, 70. Which query returns the 3rd highest distinct salary (70)?', options: ['DENSE_RANK() = 3', 'ROW_NUMBER() = 3', 'RANK() = 3', 'ORDER BY salary DESC LIMIT 1 OFFSET 2'], answer: 0, explain: 'DENSE_RANK gives 1, 2, 2, 3 → 70. ROW_NUMBER = 3 and OFFSET 2 both land on the second 80; RANK gives 1, 2, 2, 4, so no row has rank 3.' });
  quiz.push({ q: 'Why does <code>WHERE ROW_NUMBER() OVER (PARTITION BY dept ORDER BY salary DESC) &lt;= 3</code> fail?', options: ['Window functions are evaluated after WHERE, so they cannot be used there', 'ROW_NUMBER needs GROUP BY', 'PARTITION BY is not allowed with ORDER BY', 'It works in every engine'], answer: 0, explain: 'Logical order is FROM → WHERE → GROUP BY → HAVING → window functions → SELECT → ORDER BY. Compute the rank in a CTE/subquery and filter outside (or use QUALIFY where supported).' });
  quiz.push({ q: 'Distinct login days for a user: Mar 3, Mar 4, Mar 6, Mar 7, Mar 8. How many streaks does day − ROW_NUMBER produce?', options: ['2 (lengths 2 and 3)', '1', '3', '5'], answer: 0, explain: 'Keys: Mar 3−1 = Mar 2, Mar 4−2 = Mar 2, Mar 6−3 = Mar 3, Mar 7−4 = Mar 3, Mar 8−5 = Mar 3 → two distinct keys.' });
  quiz.push({ q: 'Why must login timestamps be reduced to DISTINCT dates before the streak trick?', options: ['Two logins on one day advance ROW_NUMBER without advancing the date, corrupting the key', 'DISTINCT makes the query faster only', 'Dates cannot be subtracted otherwise', 'ROW_NUMBER does not work on timestamps'], answer: 0, explain: 'The trick relies on date and row number both increasing by exactly 1 per row. A duplicate day breaks that.' });
  quiz.push({ q: 'In sessionization, which expression numbers the sessions?', options: ['SUM(new_session_flag) OVER (PARTITION BY user_id ORDER BY event_time)', 'COUNT(*) OVER (PARTITION BY user_id)', 'LAG(event_time) OVER (ORDER BY event_time)', 'ROW_NUMBER() OVER (ORDER BY event_time)'], answer: 0, explain: 'Each 1-flag marks a session start; the running total of flags is 1 in the first session, 2 in the second, and so on.' });
  quiz.push({ q: 'Events at 08:00, 08:30, 09:00, 09:30 with "a new session after more than 30 minutes of inactivity". How many sessions?', options: ['1', '2', '4', '3'], answer: 0, explain: 'Every gap is exactly 30 minutes, which is not MORE than 30, so all four events form one session. With "≥ 30" there would be 4.' });
  quiz.push({ q: 'A funnel query counts a user at "purchase" even though they never reached "checkout". What kind of funnel is it?', options: ['A loose (unordered) funnel built with conditional aggregation', 'A strict ordered funnel', 'A cohort analysis', 'A sessionized funnel'], answer: 0, explain: 'COUNT(DISTINCT CASE WHEN event = step …) checks each step independently. Strict funnels require each step to follow the previous one.' });
  quiz.push({ q: 'For a monthly retention cohort, what is the correct denominator for M1 retention?', options: ['All users who signed up in the cohort month', 'Users active in month 1', 'Users active in month 0 with at least 2 logins', 'All users in the database'], answer: 0, explain: 'Retention = active cohort members / cohort size. Using only active users as the denominator hides churn.' });
  quiz.push({ q: 'cnt = 8 rows. Which rows does <code>rn IN ((cnt+1)/2, (cnt+2)/2)</code> keep with integer division?', options: ['4 and 5', '4 only', '5 only', '3 and 4'], answer: 0, explain: '(8+1)/2 = 4 and (8+2)/2 = 5: the two middle rows of eight, averaged for the median.' });
  quiz.push({ q: 'In a pivot, <code>SUM(CASE WHEN quarter = \'Q3\' THEN revenue END)</code> returns NULL for a region. Why?', options: ['That region has no Q3 rows, so every CASE yields NULL and SUM of only NULLs is NULL', 'SUM cannot add CASE results', 'The GROUP BY is missing', 'Q3 is a reserved word'], answer: 0, explain: 'Add ELSE 0 or COALESCE(…, 0) if the report should show 0.' });
  quiz.push({ q: 'Which is the portable way to unpivot four quarter columns into rows?', options: ['Four SELECTs combined with UNION ALL', 'GROUP BY with CASE', 'A recursive CTE', 'DISTINCT ON'], answer: 0, explain: 'Each SELECT emits one (key, value) pair per row; UNION ALL stacks them. CROSS JOIN with a list of names plus CASE is the single-scan alternative.' });
  quiz.push({ q: 'In a recursive CTE, when does the recursion stop?', options: ['When an iteration produces no new rows', 'After exactly 100 iterations in every engine', 'When the anchor returns NULL', 'When UNION ALL finds a duplicate'], answer: 0, explain: 'Each iteration joins against the previous iteration’s rows; an empty result ends the loop. Limits such as MAXRECURSION are engine-specific safety nets.' });
  quiz.push({ q: 'Your org table accidentally contains A → B → A. What protects a recursive CTE that carries a depth column?', options: ['A guard such as WHERE depth &lt; 50 or "id not already in path"', 'Switching UNION ALL to UNION', 'Adding ORDER BY', 'Nothing is needed'], answer: 0, explain: 'Because depth changes every iteration, rows are never identical, so UNION cannot dedupe them. An explicit depth or path check is required.' });
  quiz.push({ q: 'Keep the newest row per email: ROW_NUMBER() OVER (PARTITION BY LOWER(TRIM(email)) ORDER BY created_at DESC, id DESC). Which rows are deleted?', options: ['rn &gt; 1', 'rn = 1', 'rn = MAX(rn)', 'Rows where created_at is NULL'], answer: 0, explain: 'DESC ordering puts the newest copy at rn = 1 (the survivor); every other copy has rn &gt; 1.' });
  quiz.push({ q: 'Ids 1, 2, 3, 7, 8. What does <code>LEAD(id) − id &gt; 1</code> reveal?', options: ['A gap: ids 4–6 are missing', 'An island of length 3', 'A duplicate id', 'Nothing, the ids are consecutive'], answer: 0, explain: 'At id 3, LEAD is 7; the jump of 4 means 4, 5, 6 are missing (range id + 1 … next − 1).' });

  /* =====================================================================
     INTERVIEW Q&A
     ===================================================================== */
  interview.push({ level: 'B', q: 'What is the difference between ROW_NUMBER, RANK and DENSE_RANK, and which one solves "Nth highest salary"?',
    a: `<p>All three number rows in a window order. <b>ROW_NUMBER</b> gives unique 1, 2, 3, 4 even on ties (tie order arbitrary unless you add a tie-breaker). <b>RANK</b> gives ties the same number and then <i>skips</i> (1, 2, 2, 4). <b>DENSE_RANK</b> gives ties the same number and does <i>not</i> skip (1, 2, 2, 3). "Nth highest salary" means the Nth distinct amount, so DENSE_RANK = N (or DISTINCT + OFFSET). I wrap the lookup in a scalar subquery so a missing Nth value comes back as NULL rather than zero rows.</p>`,
    followUps: ['How would you do it without window functions?', 'How do NULL salaries change the answer?'] });
  interview.push({ level: 'I', q: 'Walk me through a top-3-per-group query and the decisions you make before writing it.',
    a: `<p>Decisions first: (1) the group (PARTITION BY dept), (2) the measure and direction (ORDER BY salary DESC), (3) the tie rule — exactly 3 rows (ROW_NUMBER + deterministic tie-breaker), ties included with gaps (RANK), or top 3 distinct levels (DENSE_RANK), (4) filters that must apply <i>before</i> ranking (e.g. only delivered orders), (5) whether empty groups must appear (drive from the group table with LEFT JOIN). Then: CTE with the rank column, outer <code>WHERE rnk &lt;= 3</code>. Performance: an index on (dept, salary DESC) lets the engine avoid a full sort; Postgres LATERAL with LIMIT 3 per group is even cheaper for few groups.</p>`,
    followUps: ['What is QUALIFY?', 'How does SQLite’s bare-column MAX trick behave on ties?'] });
  interview.push({ level: 'I', q: 'Explain the gaps-and-islands problem and the two main techniques to solve it.',
    a: `<p>Islands are maximal runs of rows that belong together in sorted order (consecutive ids/dates, equal status, overlapping intervals); gaps are what lies between them. <b>Technique A</b>: value − ROW_NUMBER (or ROW_NUMBER − ROW_NUMBER partitioned by value for equal-value runs) is constant inside a run, so it becomes a group key. <b>Technique B</b>: LAG to compare with the previous row, a 0/1 "new island" flag, and a running SUM of the flag to number islands — this handles any rule (time gaps, thresholds, overlaps with a running MAX of end times). Gaps come from LEAD(next) − current &gt; 1. Both are one or two sorts — O(n log n) — instead of the O(n²) self-joins of older solutions.</p>`,
    followUps: ['How do duplicates affect technique A?', 'How would you merge overlapping intervals?'] });
  interview.push({ level: 'I', q: 'How do you find users who logged in on 3 or more consecutive days, and how do you get their longest streak?',
    a: `<p>Reduce logins to one row per user per calendar day (DISTINCT date, in the user's time zone). Compute <code>day − ROW_NUMBER() OVER (PARTITION BY user ORDER BY day)</code>: inside a streak both advance by 1, so the result is constant and identifies the streak. GROUP BY (user, key) gives start, end and length; <code>HAVING COUNT(*) &gt;= 3</code> answers the first question, <code>MAX(length)</code> per user the second. For a fixed K, <code>LAG(day, K−1) = day − (K−1)</code> is a shortcut. I'd mention time zones, duplicate logins and month/year boundaries as the edge cases.</p>`,
    followUps: ['How do you compute the current streak as of today?', 'What if one missed day is allowed?'] });
  interview.push({ level: 'A', q: 'Design the SQL to sessionize a clickstream with a 30-minute inactivity timeout. What can go wrong in production?',
    a: `<p>Per user, order by (event_time, event_id); LAG gives the previous event time; flag 1 when there is no previous event or the gap in integer seconds exceeds 1800; a running SUM of the flag partitioned by user gives session_no; then GROUP BY (user, session_no) for start, end, duration, events, bounce. Production issues: <b>ties</b> on timestamps (need a unique tie-breaker), <b>floating-point</b> time differences at exactly 30 minutes, <b>time zones and midnight</b> rules, <b>late-arriving events</b> that merge or split sessions already reported, and <b>incremental processing</b> — today's batch must continue yesterday's open sessions, so you keep per-user state or reprocess a look-back window. Streaming engines provide session windows with watermarks for this.</p>`,
    followUps: ['How would you compute average session duration fairly for single-event sessions?', 'How do you make it idempotent when reprocessing?'] });
  interview.push({ level: 'A', q: 'How would you build a strict, ordered conversion funnel in SQL, and how does it differ from the simple version?',
    a: `<p>The simple (loose) version counts distinct users per step with conditional aggregation in one scan — it ignores order and counts out-of-order or skipped steps. The strict version chains CTEs: step 1 takes each user's first view time; step 2 joins events for add_to_cart with time &gt; step-1 time and takes MIN; and so on. Counting each CTE gives the funnel; FIRST_VALUE and LAG over step_no give overall and step conversion. I'd clarify unit (user vs session), ordering, time window (same session / 24h), and which occurrence anchors the funnel. Engines like Snowflake support MATCH_RECOGNIZE and ClickHouse has windowFunnel for this pattern.</p>`,
    followUps: ['How would you require all steps within one session?', 'How would you compute median time-to-convert?'] });
  interview.push({ level: 'A', q: 'Explain how you would compute a monthly retention cohort table and the common pitfalls.',
    a: `<p>Assign each user a cohort (signup month) as a sequential month index (year × 12 + month) so offsets work across years; reduce activity to DISTINCT (user, month index); join and compute offset = activity month − cohort month; count distinct users per (cohort, offset); divide by the <b>cohort size from the users table</b>; pivot offsets into columns with conditional aggregation. Pitfalls: wrong denominator (only active users), right-censoring (months not yet observed shown as 0 instead of NULL), forgetting DISTINCT (heavy users inflate counts), calendar vs rolling periods, and time zones at month boundaries. At scale I'd pre-aggregate a daily or monthly active-user table.</p>`,
    followUps: ['How is "unbounded" retention different?', 'How would you compare cohorts of different sizes fairly?'] });
  interview.push({ level: 'I', q: 'How do you compute a median in a database that has no MEDIAN function?',
    a: `<p>Number rows in value order with <code>ROW_NUMBER() OVER (ORDER BY x)</code> and get the count with <code>COUNT(*) OVER ()</code>; keep <code>rn IN ((cnt+1)/2, (cnt+2)/2)</code> using integer division — one row for odd counts, two for even — and AVG them. For a per-group median, add PARTITION BY to both windows and GROUP BY at the end. Alternatives: ORDER BY … LIMIT 2 − cnt%2 OFFSET (cnt−1)/2 where expressions are allowed in LIMIT, or the O(n²) "at least half ≤ and at least half ≥" self-join. Filter NULLs first; in MySQL use DIV for integer division. Engines with PERCENTILE_CONT(0.5) WITHIN GROUP interpolate, PERCENTILE_DISC returns an actual value.</p>`,
    followUps: ['How do you get P95 latency?', 'Why can’t medians be merged like sums in a distributed system?'] });
  interview.push({ level: 'E', q: 'Exact percentiles over billions of rows are too slow. What do you do?',
    a: `<p>Exact quantiles require a global sort or selection and cannot be combined from partial results the way SUM/COUNT can, so distributed engines must shuffle all values. In practice we use <b>approximate quantile sketches</b> — t-digest, KLL, Greenwald-Khanna, or the engine's <code>APPROX_PERCENTILE</code> / <code>APPROX_QUANTILES</code> — which are mergeable, use kilobytes of memory, and have bounded rank error (often ≤ 1%). For dashboards I'd store per-minute sketches and merge them at query time. If exactness is legally required (billing), compute on a narrower, pre-filtered dataset or use a two-pass histogram approach: first find the bucket containing the target rank, then sort only that bucket.</p>`,
    followUps: ['What error does t-digest have at the tails?', 'How would you alert on P99 latency with sketches?'] });
  interview.push({ level: 'B', q: 'How do you pivot rows into columns in SQL without a PIVOT keyword?',
    a: `<p>GROUP BY the row key and write one conditional aggregate per output column: <code>SUM(CASE WHEN quarter = 'Q1' THEN revenue END) AS q1</code>. GROUP BY creates one row per region; the CASE passes only the matching rows' values into each aggregate. Choose SUM when duplicates should add up and MAX/MIN when each cell has a single value; use ELSE 0 / COALESCE if missing cells should show 0 rather than NULL. Columns must be known when writing the query — for data-driven columns, generate the SQL from the distinct values or pivot in the application/BI tool. Unpivot is the reverse: one SELECT per column glued with UNION ALL, or CROSS JOIN with a list of column names plus CASE.</p>`,
    followUps: ['What is the gotcha with SQL Server’s PIVOT and extra columns?', 'When is a wide table a good storage design?'] });
  interview.push({ level: 'I', q: 'Explain how a recursive CTE executes, using an org chart as the example.',
    a: `<p>The anchor query runs once (e.g. the CEO, depth 0) and seeds both the result and a working table. The recursive member then runs repeatedly, joining employees to <i>only the working table</i> — the rows from the previous iteration — producing the next level (depth + 1, path extended). Those rows are appended to the result and become the new working table. When an iteration returns no rows, evaluation stops. Going down uses <code>e.manager_id = o.id</code>; going up uses <code>e.id = o.manager_id</code>. I always add a guard (depth limit or path check) because bad data with a cycle would loop forever, and an index on manager_id so each round is a set of index probes.</p>`,
    followUps: ['How would you compute total salary under each manager?', 'Compare adjacency list, nested sets and closure tables.'] });
  interview.push({ level: 'I', q: 'How do you delete duplicate rows but keep one copy, and how do you make it safe?',
    a: `<p>Define the duplicate key (normalised — LOWER(TRIM(email))) and the survivor rule (newest, oldest, most complete). Rank with <code>ROW_NUMBER() OVER (PARTITION BY key ORDER BY rule, id)</code> and delete ids with rn &gt; 1 via <code>DELETE … WHERE id IN (subquery)</code>. Alternatives: keep MIN(id) per key with NOT IN, or EXISTS a twin with a smaller id; with no primary key use rowid/ctid. Safety: run the SELECT preview, check counts, re-point foreign keys to survivors, wrap in a transaction, batch large deletes (or rebuild a clean table and swap), and finally add a UNIQUE constraint plus ON CONFLICT handling so duplicates cannot return.</p>`,
    followUps: ['Why is NOT IN dangerous with NULLs?', 'How would you handle fuzzy duplicates like "Jon" vs "John"?'] });
  interview.push({ level: 'A', q: 'A teammate solved "users with 3 consecutive login days" with a triple self-join. Critique it.',
    a: `<p>It is correct for K = 3 on clean data, but: it hard-codes K (K = 7 needs six joins), it cannot report streak length or the longest streak, it multiplies rows (users with long streaks match many times, so it needs DISTINCT), and on large tables each join is a big hash or index join — far more work than one sort. It also needs DISTINCT dates first or duplicate logins multiply matches further. The window approach — distinct days, day − ROW_NUMBER as the streak key, GROUP BY — answers every variant (any K, longest, current) in one pass and is easier to test.</p>`,
    followUps: ['When is a self-join still a reasonable choice?', 'How would the plan differ in a columnar warehouse?'] });
  interview.push({ level: 'E', q: 'These "hard SQL" patterns run fine on 10k rows but time out on 2 billion rows in the warehouse. How do you approach it?',
    a: `<p>First check the plan: window functions over a global ORDER BY (no PARTITION BY) force all rows through one worker — partition by an entity (user, device) so the work parallelises. Prune early: filter by date partitions and only needed columns before ranking/sessionizing. Pre-aggregate: daily-active tables for cohorts, per-user-day rows for streaks, sketches for percentiles. Avoid correlated subqueries and self-joins that the optimiser cannot decorrelate. Use clustering/sort keys on (user_id, event_time) so windowed sorts are cheap. Make pipelines incremental (process new partitions plus a look-back for sessions/streaks) and materialise intermediate results. Finally, use approximate functions where exactness is not required.</p>`,
    followUps: ['How would you incrementally maintain streaks daily?', 'What is data skew and how does it hurt PARTITION BY?'] });
  interview.push({ level: 'A', q: 'How do AI SQL assistants change how you should work on these problems?',
    a: `<p>They write the boilerplate (pivot CASE lines, recursive CTE skeletons, funnel CTE chains) quickly, and they know the standard patterns. But they silently choose definitions: ROW_NUMBER vs DENSE_RANK on ties, loose vs strict funnels, 0 vs NULL in cohorts, which duplicate survives, which time zone defines a day. My workflow: state the definitions explicitly in the prompt, ask the assistant to generate adversarial test data (ties, duplicates, boundary timestamps, empty groups), run both my query and its query on that data, preview any DELETE as a SELECT, and read the EXPLAIN plan. I own the definitions, the tests and the performance reasoning; the model accelerates typing and dialect translation.</p>`,
    followUps: ['What prompt would you use to generate edge-case data for a sessionization query?', 'How do you validate an AI-written query against production data safely?'] });

  registerModule({
    id: 'sql15',
    title: 'Hard SQL Interview Problem Bank',
    intro: `<p>This is the module where SQL interviews are won or lost. Data-heavy companies (Meta, Amazon, Google, Uber, Stripe, Spotify, every analytics team) keep asking the same <b>ten families</b> of "hard" questions: <b>Nth highest salary</b>, <b>top-N per group</b>, <b>consecutive days / streaks</b>, <b>gaps &amp; islands</b>, <b>sessionization</b>, <b>funnels &amp; retention cohorts</b>, <b>median &amp; percentiles</b>, <b>pivot / unpivot</b>, <b>recursive hierarchies</b> and <b>duplicate removal</b>. Once you recognise the family from the wording, the solution is a small, reusable template — usually a CTE plus a window function.</p>
<p>Every topic follows the same path: an everyday analogy, the plain-English idea, a step-by-step visualizer (watch <code>day − ROW_NUMBER</code> turn into streak ids, gaps become session breaks, long rows fold into a pivot), worked examples, the naive or correlated approach and <i>why</i> it is slower or wrong, then the expert layer (dialects, edge cases, scale) and how AI assistants change the work.</p>
<p>All queries run live (▶ Run) in SQLite against three realistic sample databases: <b>hr</b> (employees with salary ties and a 4-level manager tree), <b>app</b> (users with signup cohorts, timestamped logins with streaks, and a clickstream for sessions and funnels) and <b>shop</b> (orders, a messy customer table full of duplicates, wide and long sales tables, ticket ids with gaps, server health checks, meetings, a category tree and more).</p>`,
    goals: [
      'Recognise each of the ten hard-SQL problem families from the wording of a question and name the matching template in seconds',
      'Write Nth-highest and top-N-per-group queries that handle ties (ROW_NUMBER vs RANK vs DENSE_RANK) and return NULL or empty groups correctly',
      'Solve streak, gaps-and-islands and interval-merging problems with the row-number-difference trick and the LAG + running-SUM technique',
      'Sessionize a clickstream with an inactivity timeout and build strict funnels and right-censored retention cohort matrices',
      'Compute medians and percentiles without a MEDIAN function, pivot and unpivot data, and walk hierarchies with guarded recursive CTEs',
      'Find and safely remove duplicates with a clear survivor rule, and explain the cost of each naive/correlated alternative at scale'
    ],
    prereqs: `SQL 3 (Aggregates, GROUP BY, HAVING &amp; CASE), SQL 4 (JOINs, anti/semi joins), SQL 5 (Subqueries, CTEs &amp; Recursive CTEs) and especially SQL 6 (Window Functions). SQL 11 (Query Execution &amp; Optimization) helps with the performance discussions. DSA 5 (Prefix Sums) gives intuition for running sums.`,
    hours: 14,
    databases: DB,
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
