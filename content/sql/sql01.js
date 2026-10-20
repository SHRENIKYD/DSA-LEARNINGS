(function () {
  var topics = [], practice = [], quiz = [], interview = [];

  /* ======================================================================
     SAMPLE DATABASES (SQLite dialect). Every runnable snippet below uses
     one of these through db: 'school' | 'shop' | 'company'.
     Foreign keys are switched ON so learners see real enforcement.
     ====================================================================== */
  var DB_SCHOOL = `PRAGMA foreign_keys = ON;

-- Parent table: one row per department
CREATE TABLE departments (
  dept_id   INTEGER PRIMARY KEY,
  name      TEXT NOT NULL UNIQUE,
  building  TEXT
);

-- Each teacher belongs to ONE department (1-N: department -> teachers)
CREATE TABLE teachers (
  teacher_id INTEGER PRIMARY KEY,
  name       TEXT NOT NULL,
  email      TEXT NOT NULL UNIQUE,
  dept_id    INTEGER REFERENCES departments(dept_id)
);

-- student_id = surrogate primary key, roll_no = natural candidate key
CREATE TABLE students (
  student_id INTEGER PRIMARY KEY,
  roll_no    TEXT NOT NULL UNIQUE,
  name       TEXT NOT NULL,
  email      TEXT UNIQUE,
  city       TEXT,
  dept_id    INTEGER REFERENCES departments(dept_id),
  joined_on  TEXT
);

-- 1-1: a student has at most one ID card, a card belongs to exactly one student
CREATE TABLE id_cards (
  card_no    TEXT PRIMARY KEY,
  student_id INTEGER NOT NULL UNIQUE REFERENCES students(student_id),
  issued_on  TEXT,
  valid_till TEXT
);

CREATE TABLE courses (
  course_id  TEXT PRIMARY KEY,
  title      TEXT NOT NULL,
  credits    INTEGER CHECK (credits BETWEEN 1 AND 6),
  dept_id    INTEGER REFERENCES departments(dept_id),
  teacher_id INTEGER REFERENCES teachers(teacher_id)
);

-- N-N: students <-> courses, through a junction table with a composite key
CREATE TABLE enrollments (
  student_id INTEGER NOT NULL REFERENCES students(student_id),
  course_id  TEXT    NOT NULL REFERENCES courses(course_id),
  semester   TEXT    NOT NULL,
  grade      TEXT,
  PRIMARY KEY (student_id, course_id)
);

INSERT INTO departments VALUES
  (1, 'Computer Science', 'Turing Block'),
  (2, 'Mathematics',      'Euler Hall'),
  (3, 'Physics',          'Curie Wing'),
  (4, 'History',          NULL);

INSERT INTO teachers VALUES
  (1, 'Dr. Rao',     'rao@uni.edu',     1),
  (2, 'Ms. Fernandes','fernandes@uni.edu',1),
  (3, 'Dr. Okafor',  'okafor@uni.edu',  2),
  (4, 'Dr. Lindqvist','lindqvist@uni.edu',3),
  (5, 'Mr. Haddad',  'haddad@uni.edu',  NULL);

INSERT INTO students VALUES
  (1, 'R2024-001', 'Asha Verma',   'asha@mail.com',  'Pune',      1, '2024-07-15'),
  (2, 'R2024-002', 'Ben Carter',   'ben@mail.com',   'Leeds',     2, '2024-07-15'),
  (3, 'R2024-003', 'Chen Wei',     NULL,             'Shanghai',  1, '2024-07-16'),
  (4, 'R2024-004', 'Diya Shah',    'diya@mail.com',  'Pune',      3, '2024-07-16'),
  (5, 'R2024-005', 'Elena Rossi',  'elena@mail.com', 'Milan',     1, '2024-07-18'),
  (6, 'R2024-006', 'Farid Khan',   'farid@mail.com', NULL,        2, '2024-07-20'),
  (7, 'R2024-007', 'Grace Lee',    NULL,             'Seoul',     NULL, '2024-08-01'),
  (8, 'R2024-008', 'Hugo Martin',  'hugo@mail.com',  'Lyon',      4, '2024-08-02');

INSERT INTO id_cards VALUES
  ('CARD-9001', 1, '2024-07-20', '2028-07-19'),
  ('CARD-9002', 2, '2024-07-20', '2028-07-19'),
  ('CARD-9003', 4, '2024-07-22', '2028-07-21'),
  ('CARD-9004', 5, '2024-07-25', '2028-07-24'),
  ('CARD-9005', 8, '2024-08-05', '2028-08-04');

INSERT INTO courses VALUES
  ('CS101',   'Intro to Programming', 4, 1, 1),
  ('CS102',   'Databases',            4, 1, 2),
  ('MA101',   'Calculus I',           3, 2, 3),
  ('MA201',   'Linear Algebra',       3, 2, 3),
  ('PH101',   'Mechanics',            4, 3, 4),
  ('HI101',   'World History',        2, 4, 5),
  ('CS301',   'Distributed Systems',  5, 1, NULL);

INSERT INTO enrollments VALUES
  (1, 'CS101', '2024-FALL', 'A'),
  (1, 'CS102', '2024-FALL', 'A'),
  (1, 'MA101', '2024-FALL', 'B'),
  (2, 'MA101', '2024-FALL', 'A'),
  (2, 'MA201', '2024-FALL', NULL),
  (3, 'CS101', '2024-FALL', 'B'),
  (3, 'CS102', '2024-FALL', 'C'),
  (4, 'PH101', '2024-FALL', 'A'),
  (4, 'MA101', '2024-FALL', 'B'),
  (5, 'CS101', '2024-FALL', 'A'),
  (5, 'CS102', '2024-FALL', NULL),
  (6, 'MA201', '2024-FALL', 'B'),
  (8, 'HI101', '2024-FALL', 'A'),
  (8, 'CS101', '2024-FALL', 'C');`;

  var DB_SHOP = `PRAGMA foreign_keys = ON;

CREATE TABLE customers (
  customer_id INTEGER PRIMARY KEY,
  email       TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  phone       TEXT UNIQUE,
  city        TEXT
);

-- 1-1: optional loyalty card, at most one per customer
CREATE TABLE loyalty_cards (
  card_id     INTEGER PRIMARY KEY,
  customer_id INTEGER NOT NULL UNIQUE REFERENCES customers(customer_id) ON DELETE CASCADE,
  tier        TEXT NOT NULL CHECK (tier IN ('silver','gold','platinum')),
  points      INTEGER NOT NULL DEFAULT 0 CHECK (points >= 0)
);

CREATE TABLE products (
  product_id INTEGER PRIMARY KEY,
  sku        TEXT NOT NULL UNIQUE,
  name       TEXT NOT NULL,
  category   TEXT NOT NULL,
  price      REAL NOT NULL CHECK (price >= 0),
  stock      INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0)
);

-- 1-N: one customer places many orders
CREATE TABLE orders (
  order_id    INTEGER PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(customer_id) ON DELETE RESTRICT,
  order_date  TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'placed'
              CHECK (status IN ('placed','shipped','delivered','cancelled'))
);

-- N-N: orders <-> products, with facts about the pair (qty, price paid)
CREATE TABLE order_items (
  order_id   INTEGER NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(product_id),
  qty        INTEGER NOT NULL CHECK (qty > 0),
  unit_price REAL    NOT NULL CHECK (unit_price >= 0),
  PRIMARY KEY (order_id, product_id)
);

-- A messy sign-up export with NO declared keys (used to discover candidate keys)
CREATE TABLE signups (
  email     TEXT,
  username  TEXT,
  phone     TEXT,
  full_name TEXT,
  city      TEXT
);

-- A flat "spreadsheet" export of orders: everything repeated on every line
CREATE TABLE orders_sheet (
  line_no        INTEGER,
  order_ref      TEXT,
  customer_email TEXT,
  customer_name  TEXT,
  customer_city  TEXT,
  product_name   TEXT,
  qty            INTEGER,
  price          REAL
);

INSERT INTO customers VALUES
  (1, 'asha@mail.com',  'Asha Verma',  '+91-90000-11111', 'Pune'),
  (2, 'ben@mail.com',   'Ben Carter',  '+44-7700-900111', 'Leeds'),
  (3, 'chen@mail.com',  'Chen Wei',    NULL,              'Shanghai'),
  (4, 'diya@mail.com',  'Diya Shah',   '+91-90000-22222', 'Pune'),
  (5, 'elena@mail.com', 'Elena Rossi', '+39-320-555-0101', 'Milan');

INSERT INTO loyalty_cards VALUES
  (501, 1, 'gold',     1200),
  (502, 2, 'silver',    300),
  (503, 5, 'platinum', 5400);

INSERT INTO products VALUES
  (10, 'KB-001',  'Mechanical Keyboard', 'electronics', 89.00, 25),
  (11, 'MS-002',  'Wireless Mouse',      'electronics', 25.50, 60),
  (12, 'BK-SQL',  'SQL for Humans',      'books',       32.00, 12),
  (13, 'BK-DS',   'Data Structures',     'books',       45.00,  0),
  (14, 'MUG-01',  'Coffee Mug',          'kitchen',      9.99, 100),
  (15, 'HP-003',  'Noise-Cancel Headphones','electronics',199.00, 8);

INSERT INTO orders VALUES
  (1001, 1, '2026-01-05', 'delivered'),
  (1002, 1, '2026-02-11', 'shipped'),
  (1003, 2, '2026-02-12', 'delivered'),
  (1004, 4, '2026-03-01', 'placed'),
  (1005, 5, '2026-03-03', 'cancelled'),
  (1006, 2, '2026-03-09', 'placed');

INSERT INTO order_items VALUES
  (1001, 10, 1, 89.00),
  (1001, 11, 2, 25.50),
  (1002, 12, 1, 32.00),
  (1003, 14, 4,  9.99),
  (1003, 12, 1, 30.00),
  (1004, 15, 1, 199.00),
  (1004, 11, 1, 25.50),
  (1005, 13, 2, 45.00),
  (1006, 10, 1, 85.00),
  (1006, 14, 2,  9.99);

INSERT INTO signups VALUES
  ('asha@mail.com',  'asha_v',   '+91-90000-11111', 'Asha Verma',  'Pune'),
  ('ben@mail.com',   'bencarter','+44-7700-900111', 'Ben Carter',  'Leeds'),
  ('chen@mail.com',  'chenw',    NULL,              'Chen Wei',    'Shanghai'),
  ('diya@mail.com',  'diya_s',   '+91-90000-22222', 'Diya Shah',   'Pune'),
  ('elena@mail.com', 'elena_r',  '+39-320-555-0101','Elena Rossi', 'Milan'),
  ('asha.v@work.io', 'asha_work',NULL,              'Asha Verma',  'Mumbai'),
  ('sam@mail.com',   'sam1',     '+1-555-0100',     'Sam Park',    'Pune'),
  ('sam.p@mail.com', 'sam2',     '+1-555-0101',     'Sam Park',    'Pune');

INSERT INTO orders_sheet VALUES
  (1, 'A-1', 'asha@mail.com', 'Asha Verma', 'Pune',  'Mechanical Keyboard', 1, 89.00),
  (2, 'A-1', 'asha@mail.com', 'Asha Verma', 'Pune',  'Wireless Mouse',      2, 25.50),
  (3, 'A-2', 'asha@mail.com', 'Asha V.',    'Mumbai','SQL for Humans',      1, 32.00),
  (4, 'B-1', 'ben@mail.com',  'Ben Carter', 'Leeds', 'Coffee Mug',          4,  9.99),
  (5, 'B-1', 'ben@mail.com',  'Ben Carter', 'Leeds', 'SQL for Humans',      1, 30.00),
  (6, 'D-1', 'diya@mail.com', 'Diya Shah',  'Pune',  'Noise-Cancel Headphones', 1, 199.00);`;

  var DB_COMPANY = `PRAGMA foreign_keys = ON;

CREATE TABLE departments (
  dept_id  INTEGER PRIMARY KEY,
  name     TEXT NOT NULL UNIQUE,
  location TEXT NOT NULL
);

-- manager_id points back into the SAME table (self-referencing 1-N)
CREATE TABLE employees (
  emp_id     INTEGER PRIMARY KEY,
  emp_code   TEXT NOT NULL UNIQUE,
  name       TEXT NOT NULL,
  email      TEXT NOT NULL UNIQUE,
  dept_id    INTEGER REFERENCES departments(dept_id) ON DELETE SET NULL,
  manager_id INTEGER REFERENCES employees(emp_id),
  salary     INTEGER NOT NULL CHECK (salary > 0),
  hired_on   TEXT NOT NULL
);

-- 1-1 (optional on both sides): a parking spot is assigned to at most one employee
CREATE TABLE parking_spots (
  spot_no TEXT PRIMARY KEY,
  level   INTEGER NOT NULL,
  emp_id  INTEGER UNIQUE REFERENCES employees(emp_id) ON DELETE SET NULL
);

CREATE TABLE projects (
  project_id INTEGER PRIMARY KEY,
  name       TEXT NOT NULL UNIQUE,
  dept_id    INTEGER NOT NULL REFERENCES departments(dept_id),
  budget     INTEGER CHECK (budget >= 0)
);

-- N-N: employees <-> projects, with a role and weekly hours per pair
CREATE TABLE assignments (
  emp_id     INTEGER NOT NULL REFERENCES employees(emp_id) ON DELETE CASCADE,
  project_id INTEGER NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  role       TEXT NOT NULL,
  hours_per_week INTEGER NOT NULL CHECK (hours_per_week BETWEEN 1 AND 40),
  PRIMARY KEY (emp_id, project_id)
);

INSERT INTO departments VALUES
  (10, 'Engineering', 'Bengaluru'),
  (20, 'Sales',       'London'),
  (30, 'Finance',     'New York'),
  (40, 'Research',    'Berlin');

INSERT INTO employees VALUES
  (1, 'E001', 'Meera Iyer',    'meera@corp.com',  10, NULL, 250000, '2018-04-02'),
  (2, 'E002', 'Tom Baker',     'tom@corp.com',    10, 1,    140000, '2020-06-15'),
  (3, 'E003', 'Sara Ali',      'sara@corp.com',   10, 1,    150000, '2019-11-01'),
  (4, 'E004', 'Leo Novak',     'leo@corp.com',    10, 2,     95000, '2023-01-09'),
  (5, 'E005', 'Priya Nair',    'priya@corp.com',  20, NULL, 180000, '2017-09-20'),
  (6, 'E006', 'James Wu',      'james@corp.com',  20, 5,     90000, '2022-03-14'),
  (7, 'E007', 'Ana Souza',     'ana@corp.com',    30, NULL, 160000, '2016-02-29'),
  (8, 'E008', 'Kofi Mensah',   'kofi@corp.com',   30, 7,     85000, '2024-05-06'),
  (9, 'E009', 'Yuki Tanaka',   'yuki@corp.com',   NULL, 1,  120000, '2025-08-18');

INSERT INTO parking_spots VALUES
  ('P1-01', 1, 1),
  ('P1-02', 1, 5),
  ('P1-03', 1, 7),
  ('P2-01', 2, 3),
  ('P2-02', 2, NULL);

INSERT INTO projects VALUES
  (100, 'Checkout Revamp', 10, 500000),
  (101, 'Search v2',       10, 750000),
  (102, 'EMEA Expansion',  20, 300000),
  (103, 'Audit 2026',      30, 120000),
  (104, 'Quantum Pricing', 40, NULL);

INSERT INTO assignments VALUES
  (1, 100, 'sponsor',   4),
  (2, 100, 'developer', 30),
  (3, 101, 'tech lead', 25),
  (4, 101, 'developer', 35),
  (4, 100, 'reviewer',  5),
  (5, 102, 'owner',     20),
  (6, 102, 'account exec', 32),
  (7, 103, 'owner',     10),
  (8, 103, 'analyst',   38),
  (9, 101, 'developer', 40);`;

  var DATABASES = { school: DB_SCHOOL, shop: DB_SHOP, company: DB_COMPANY };


  /* ======================================================================
     TOPIC 1 — What a database and a DBMS really are
     ====================================================================== */
  topics.push({
    title: 'What Is a Database? What Is a DBMS?',
    analogy: `<p>Think of a big <b>public library</b>. The books on the shelves are the <b>database</b> — the stored information itself. The <b>librarian plus the catalogue system</b> is the <b>DBMS</b> (Database Management System): you never walk into the stacks and rearrange shelves yourself; you ask the librarian <i>"find me every book by this author"</i>, and the librarian knows the shelf layout, stops two people from checking out the last copy at the same moment, writes every loan in a logbook so nothing is lost if the lights go out, and refuses to lend a book to someone without a library card.</p>
<p>A folder of spreadsheets is more like a <b>pile of books on your bedroom floor</b>: fine for one person, chaos for a whole town.</p>`,
    explain: `<p>A <b>database</b> is an organised collection of data that is stored so it can be found, changed and trusted later. A <b>DBMS</b> is the software that sits between your programs and that data and does all the hard, boring, dangerous work for you. Examples of DBMS products: <b>PostgreSQL</b>, <b>MySQL</b>, <b>SQLite</b> (the one running in your browser on this page), <b>SQL Server</b>, <b>Oracle</b>; non-relational ones like <b>MongoDB</b>, <b>Redis</b>, <b>Cassandra</b>.</p>
<p>People often say "database" when they mean the DBMS ("we use a Postgres database"). In interviews, show you know the difference: <i>data</i> = the database, <i>software that manages it</i> = the DBMS, <i>the whole thing including your app</i> = the database system.</p>
<h4>Why not just use files or spreadsheets?</h4>
${H.table(['Problem with plain files / sheets', 'What it looks like', 'What a DBMS gives you'], [
  ['<b>Redundancy</b> (same fact stored many times)', 'Asha\'s city typed on every order line', 'Store each fact once, link with keys'],
  ['<b>Inconsistency</b>', 'Line 1 says Pune, line 3 says Mumbai — which is true?', 'Constraints + one source of truth'],
  ['<b>Hard questions</b>', 'Write a new script for every report', 'One declarative language: <b>SQL</b>'],
  ['<b>Two people at once</b>', 'Both save; one overwrite is lost', 'Concurrency control (locks / MVCC)'],
  ['<b>Crashes</b>', 'Power cut mid-save = half-written file', 'Transactions + write-ahead log (atomic, durable)'],
  ['<b>Security</b>', 'Whole file readable or not', 'Per-table / per-column permissions (GRANT)'],
  ['<b>Bad data</b>', '"abc" in an age column', 'Data types, NOT NULL, CHECK, UNIQUE, FOREIGN KEY']
])}
<h4>The jobs a DBMS does (remember "SQIRCS")</h4>
<ul>
<li><b>S</b>torage — lays data out in fixed-size <i>pages</i> on disk, caches hot pages in memory (the <i>buffer pool</i>).</li>
<li><b>Q</b>uery processing — parses your SQL, picks the fastest plan (optimizer), runs it (executor).</li>
<li><b>I</b>ntegrity — enforces types and constraints so garbage cannot get in.</li>
<li><b>R</b>ecovery — a log lets it redo or undo work after a crash.</li>
<li><b>C</b>oncurrency — many users at once without stepping on each other.</li>
<li><b>S</b>ecurity — users, roles, permissions.</li>
</ul>
<h4>Three levels of a database (data independence)</h4>
${H.table(['Level', 'Who sees it', 'Example'], [
  ['<b>External</b> (views)', 'Each app / user', 'The billing app sees only <code>customer_id, total</code>'],
  ['<b>Conceptual / logical</b> (schema)', 'Designers, developers', 'Tables <code>customers</code>, <code>orders</code> and their columns, keys'],
  ['<b>Internal / physical</b>', 'The DBMS itself', 'B+tree files, 4 KB / 8 KB / 16 KB pages, indexes']
])}
<p>Because of these layers you can add an index (physical change) without changing any query, and add a column (logical change) without breaking apps that do not use it. That is called <b>physical</b> and <b>logical data independence</b>.</p>
<h4>Families of databases (quick map)</h4>
${H.table(['Family', 'Data looks like', 'Typical products', 'Great for'], [
  ['<b>Relational (SQL)</b>', 'Tables of rows and columns, linked by keys', 'PostgreSQL, MySQL, SQLite, SQL Server, Oracle', 'Most business data; correctness; ad-hoc questions'],
  ['Key-value', 'A giant dictionary', 'Redis, DynamoDB', 'Caches, sessions, very fast lookups by key'],
  ['Document', 'JSON documents', 'MongoDB, Firestore', 'Flexible, nested records'],
  ['Wide-column', 'Rows with huge numbers of columns, partitioned', 'Cassandra, ScyllaDB', 'Massive write-heavy workloads'],
  ['Graph', 'Nodes and edges', 'Neo4j', 'Relationships many hops deep'],
  ['Columnar analytics', 'Columns stored together', 'BigQuery, Snowflake, ClickHouse, DuckDB', 'Scanning billions of rows for reports']
])}
<p>This whole track focuses on the <b>relational</b> model because it is the default answer in interviews and in industry — every other family is usually explained as "relational minus something, plus something".</p>`,
    clues: [
      '"Why do we need a DBMS instead of storing data in files?" → list redundancy, inconsistency, concurrency, crash recovery, security, integrity',
      '"Two users update the same record at the same time" → the DBMS job called <b>concurrency control</b>',
      '"After a power failure, committed data must not be lost" → <b>durability</b> via write-ahead log',
      '"Change the storage without changing the application" → <b>data independence</b> (three-schema architecture)',
      '"Difference between database, DBMS and RDBMS" → data vs software vs software that follows the relational model',
      '"Should this be SQL or NoSQL?" → start with relational unless scale, shape or access pattern clearly says otherwise'
    ],
    code: [
      { lang: 'sql', db: 'shop', title: 'Ask the DBMS what it is storing (its own catalogue)', code: `-- Every DBMS keeps a "catalogue": tables that describe your tables.
-- In SQLite it is called sqlite_master (alias sqlite_schema).
SELECT type, name
FROM sqlite_master
WHERE type = 'table'
ORDER BY name;` },
      { lang: 'sql', db: 'shop', title: 'One declarative question replaces a whole script', code: `-- "How much has each customer spent on non-cancelled orders?"
-- You say WHAT you want. The DBMS decides HOW (which table first, loops, indexes).
SELECT c.name,
       ROUND(SUM(oi.qty * oi.unit_price), 2) AS total_spent
FROM customers   AS c
JOIN orders      AS o  ON o.customer_id = c.customer_id
JOIN order_items AS oi ON oi.order_id   = o.order_id
WHERE o.status <> 'cancelled'
GROUP BY c.name
ORDER BY total_spent DESC;` }
    ],
    codeTitle: ['The catalogue', 'Declarative SQL'],
    viz: {
      title: 'Journey of one SQL statement through a DBMS',
      input: "UPDATE products SET stock = stock - 1 WHERE product_id = 10",
      inputLabel: 'A SELECT / INSERT / UPDATE / DELETE statement',
      gen: function (input) {
        var sql = String(input || '').trim().replace(/;+\s*$/, '');
        if (!sql) throw new Error('Type one statement, e.g. SELECT * FROM products WHERE product_id = 10');
        if (sql.length > 200) throw new Error('Keep the statement under 200 characters');
        var verb = sql.split(/\s+/)[0].toUpperCase();
        if (['SELECT', 'INSERT', 'UPDATE', 'DELETE'].indexOf(verb) < 0) throw new Error('Start with SELECT, INSERT, UPDATE or DELETE');
        var tm = sql.match(/\b(?:FROM|INTO|UPDATE)\s+([A-Za-z_][A-Za-z0-9_]*)/i);
        var table = tm ? tm[1] : 'unknown_table';
        var write = verb !== 'SELECT';
        var keyLookup = /WHERE\s+\w*id\s*=\s*\d+/i.test(sql);
        var N = [
          { id: 'APP', label: 'Your App', x: 8, y: 40, shape: 'box' },
          { id: 'PAR', label: 'Parser', x: 30, y: 12, shape: 'box' },
          { id: 'OPT', label: 'Optimizer', x: 52, y: 12, shape: 'box' },
          { id: 'EXE', label: 'Executor', x: 74, y: 12, shape: 'box' },
          { id: 'TXN', label: 'Txn / Lock Mgr', x: 94, y: 40, shape: 'box' },
          { id: 'BUF', label: 'Buffer Pool (RAM)', x: 70, y: 68, shape: 'box' },
          { id: 'LOG', label: 'WAL (log file)', x: 40, y: 92, shape: 'box' },
          { id: 'DSK', label: 'Data pages (disk)', x: 88, y: 92, shape: 'box' }
        ];
        var E = [['APP', 'PAR', 'SQL text'], ['PAR', 'OPT', 'parse tree'], ['OPT', 'EXE', 'plan'], ['EXE', 'TXN', write ? 'lock' : 'snapshot'], ['EXE', 'BUF', 'get page'], ['BUF', 'DSK', 'read/flush'], ['BUF', 'LOG', 'log record'], ['EXE', 'APP', 'result']];
        var frames = [];
        function g(hl, ehl, tags) { return { type: 'graph', label: 'Inside the DBMS', directed: true, height: 100, nodes: N, edges: E, hl: hl, ehl: ehl || {}, tags: tags || {} }; }
        function st(i) {
          var rows = [['1', 'Parse & check names'], ['2', 'Optimize (choose plan)'], ['3', 'Execute'], ['4', write ? 'Lock row(s)' : 'Take a read snapshot'], ['5', 'Fetch pages via buffer pool'], ['6', write ? 'Write log, change page, COMMIT' : 'Build result rows'], ['7', 'Return to app']];
          var hl = {}; for (var k = 0; k < rows.length; k++) hl[k] = k < i ? 'done' : (k === i ? 'cur' : '');
          return { type: 'table', label: 'Stages', columns: ['#', 'stage'], rows: rows, hl: hl };
        }
        frames.push({ narr: 'Your app sends plain text: <code>' + H.esc(sql) + '</code>. It is a <b>' + verb + '</b>, so it is a <b>' + (write ? 'write (DML)' : 'read (DQL)') + '</b>. Your app never touches the data files itself — the DBMS does.', parts: [g({ APP: 'cur' }, { 'APP-PAR': 'cur' }), st(-1)] });
        frames.push({ narr: '<b>Parser</b>: splits the text into tokens, checks grammar, then looks up <code>' + H.esc(table) + '</code> in the <b>catalogue</b> (the DBMS\'s own table of tables). Misspell a column and you fail <i>here</i>, before any data is read.', parts: [g({ PAR: 'cur' }, { 'PAR-OPT': 'cur' }, { PAR: 'syntax ✔' }), st(0), { type: 'vars', label: 'What the parser found', vals: { statement: verb, table: table, kind: write ? 'DML (write)' : 'DQL (read)' } }] });
        frames.push({ narr: '<b>Optimizer</b>: there are many ways to get the same answer. ' + (keyLookup ? 'You filtered on a key column with <code>=</code>, so it chooses an <b>index lookup</b> — jump straight to one row, like using a book\'s index.' : 'No key equality filter, so it will likely do a <b>full table scan</b> — read every row, like flipping every page.') + ' This is why SQL is <b>declarative</b>: you said <i>what</i>, it picks <i>how</i>.', parts: [g({ OPT: 'cur' }, { 'OPT-EXE': 'cur' }, { OPT: keyLookup ? 'index seek' : 'full scan' }), st(1)] });
        frames.push({ narr: '<b>Executor</b> starts running the plan step by step, asking for rows.', parts: [g({ EXE: 'cur' }, { 'EXE-TXN': 'cur' }), st(2)] });
        frames.push({ narr: write ? '<b>Transaction / lock manager</b>: before changing rows, the DBMS locks them so a second user changing the same row has to wait. This is <b>concurrency control</b> — the reason two shoppers cannot both buy the last keyboard.' : '<b>Transaction manager</b>: a read gets a consistent <b>snapshot</b>, so other people\'s half-finished changes are invisible (no "dirty reads").', parts: [g({ TXN: 'cur', EXE: 'ok' }, { 'EXE-TXN': 'ok', 'EXE-BUF': 'cur' }, { TXN: write ? 'row locked' : 'snapshot' }), st(3)] });
        frames.push({ narr: '<b>Buffer pool</b>: data lives on disk in fixed-size <b>pages</b> (SQLite 4 KB, PostgreSQL 8 KB, MySQL InnoDB 16 KB). The page holding the row is copied into RAM (if it is not already cached). RAM is ~1000× faster than disk, so hot pages stay cached.', parts: [g({ BUF: 'cur', DSK: 'win' }, { 'EXE-BUF': 'ok', 'BUF-DSK': 'cur' }, { BUF: 'page cached' }), st(4)] });
        if (write) {
          frames.push({ narr: '<b>Write-ahead log (WAL)</b>: the change is first appended to the log (a cheap sequential write) and only <i>then</i> applied to the page in RAM, which becomes "dirty". If power fails now, the log is used to redo or undo — <b>atomicity &amp; durability</b>.', parts: [g({ LOG: 'cur', BUF: 'ok' }, { 'BUF-LOG': 'cur' }, { LOG: 'append', BUF: 'dirty page' }), st(5)] });
          frames.push({ narr: '<b>COMMIT</b>: the log is forced to disk (fsync). The moment that finishes, your change is permanent even if the server crashes. The dirty data page is written back later by a background checkpoint — lazily, in batches.', parts: [g({ LOG: 'ok', DSK: 'cur' }, { 'BUF-LOG': 'ok', 'BUF-DSK': 'cur' }, { LOG: 'fsync ✔' }), st(5)] });
        } else {
          frames.push({ narr: 'The executor reads rows from the cached page(s), applies the filter, and builds the <b>result set</b> — itself a little table.', parts: [g({ EXE: 'cur', BUF: 'ok' }, { 'EXE-BUF': 'ok' }), st(5), { type: 'table', label: 'Result set (shape only)', columns: ['col1', 'col2', '…'], rows: [['…', '…', '…']] }] });
        }
        frames.push({ narr: 'Result goes back to the app: ' + (write ? '"<b>1 row affected</b>"' : 'a <b>table of rows</b>') + '. Locks are released. Every one of these boxes is something you would have to build yourself if you used plain files — that is the value of a DBMS.', parts: [g({ APP: 'ok', EXE: 'ok', PAR: 'done', OPT: 'done', TXN: 'done', BUF: 'done', LOG: 'done', DSK: 'done' }, { 'EXE-APP': 'ok' }), st(6)] });
        return frames;
      }
    },
    examples: [
      {
        title: 'The spreadsheet problem, live',
        html: `<p>The shop once kept orders in a flat sheet (<code>orders_sheet</code>). Every line repeats the customer's name and city. Ask it a simple question: <i>"Where does asha@mail.com live?"</i> You get <b>two different answers</b> — an <b>update anomaly</b>: someone changed one line and forgot the others. ${H.table(['customer_email', 'customer_name', 'customer_city'], [['asha@mail.com', 'Asha Verma', H.c('g', 'Pune')], ['asha@mail.com', H.c('r', 'Asha V.'), H.c('r', 'Mumbai')]])} The relational design stores the customer <b>once</b> in <code>customers</code>, so there is only one possible answer.</p>`,
        code: { lang: 'sql', db: 'shop', code: `-- Flat sheet: the same customer appears with conflicting details
SELECT DISTINCT customer_email, customer_name, customer_city
FROM orders_sheet
WHERE customer_email = 'asha@mail.com';

-- Relational table: one fact, stored once
SELECT email, name, city
FROM customers
WHERE email = 'asha@mail.com';` }
      },
      {
        title: 'The last keyboard: why concurrency control matters',
        html: `<p>Stock of keyboard #10 is 1. Two shoppers click "Buy" at the same millisecond. With a plain file, both programs read <code>stock = 1</code>, both write <code>stock = 0</code>, and you sold 2 keyboards you only had 1 of (a <b>lost update</b>). A DBMS runs each purchase as a <b>transaction</b>; the second one waits for the first one's row lock, then sees <code>stock = 0</code>. The safe pattern is to make the check and the change one atomic statement: ${H.table(['time', 'Shopper A', 'Shopper B', 'stock'], [['t1', 'UPDATE … WHERE stock &gt;= 1 → 1 row', 'waits for lock', '1 → 0'], ['t2', 'COMMIT', 'UPDATE … WHERE stock &gt;= 1 → ' + H.c('r', '0 rows'), '0'], ['t3', '', 'App shows "sold out"', '0']])}</p>`,
        code: { lang: 'sql', db: 'shop', code: `-- Make "check stock" and "decrease stock" ONE atomic statement.
UPDATE products SET stock = 1 WHERE product_id = 10;      -- pretend only 1 is left

BEGIN;
UPDATE products SET stock = stock - 1
WHERE product_id = 10 AND stock >= 1;    -- shopper A: succeeds (1 row changed)
COMMIT;

BEGIN;
UPDATE products SET stock = stock - 1
WHERE product_id = 10 AND stock >= 1;    -- shopper B: 0 rows changed, nothing goes negative
COMMIT;

SELECT product_id, name, stock FROM products WHERE product_id = 10;` }
      },
      {
        title: 'Database vs DBMS vs RDBMS vs "database system" — the interview one-liner',
        html: `${H.table(['Term', 'Meaning', 'Example'], [['Database', 'The organised data itself', 'The shop\'s customers, orders and products'], ['DBMS', 'Software that stores, queries, protects that data', 'SQLite, MongoDB'], ['RDBMS', 'A DBMS that follows the relational model (tables + keys + SQL)', 'PostgreSQL, MySQL, SQLite'], ['Database system', 'Database + DBMS + the apps using them', 'The whole online shop backend']])}<p>Say it in one breath: <i>"The database is the data, the DBMS is the software that manages it, an RDBMS is a DBMS built on tables and relations."</i></p>`
      },
      {
        title: 'Embedded vs client-server DBMS',
        html: `<p><b>SQLite</b> is a library inside your app: the whole database is one file, no server process, no network. It powers every Android/iOS phone, browsers and this page. <b>PostgreSQL / MySQL</b> are <b>client-server</b>: a separate server process that many apps connect to over the network, with users, permissions and replication. Rule of thumb: one app + one machine → SQLite is often perfect; many app servers writing at once → client-server DBMS.</p>`
      }
    ],
    deepDive: `<h4>What really happens below SQL</h4>
<ul>
<li><b>Pages, not rows.</b> Disks and SSDs read in blocks, so a DBMS reads and writes whole pages (SQLite default 4 KB, PostgreSQL 8 KB, InnoDB 16 KB). A row lives inside a page; reading one row costs one page read. That single fact explains why indexes, row width and "SELECT only the columns you need" matter later (module 10).</li>
<li><b>Buffer pool.</b> An in-memory cache of pages with an eviction policy (LRU-like, clock, or LRU-K). Production servers give it most of the RAM (e.g. <code>innodb_buffer_pool_size</code> ≈ 50–75% of memory). Cache hit ratio above ~99% is normal for a healthy OLTP system.</li>
<li><b>Write-ahead logging.</b> Rule: the log record describing a change must reach disk <i>before</i> the changed data page does. COMMIT only waits for the sequential log write, not for random page writes — which is why databases can be both fast and durable. Recovery replays the log (the ARIES idea: analysis, redo, undo — module 13).</li>
<li><b>OLTP vs OLAP.</b> OLTP = many tiny transactions (place order, update stock) → row stores like PostgreSQL/MySQL. OLAP = few huge read queries over history (revenue per month for 5 years) → column stores like BigQuery, Snowflake, ClickHouse, DuckDB. Many companies run both and copy data from one to the other (ETL / CDC).</li>
<li><b>Codd's idea (1970).</b> E. F. Codd proposed the relational model so that programs would not depend on how data is physically stored — you query by <i>values</i>, never by pointers or file offsets. That idea is why a 30-year-old SQL query still runs on today's engines.</li>
<li><b>Edge case to know:</b> SQLite allows only <b>one writer at a time</b> per database file (readers continue in WAL mode). That is fine for phones and small sites but is the main reason it is not used behind a busy multi-server web app.</li>
</ul>`,
    aiEra: `<p><b>What AI changes:</b> assistants can now write a working <code>CREATE TABLE</code> or a five-way join in seconds, and "text-to-SQL" tools let non-engineers ask the database questions in English. Vector search (pgvector, etc.) has also put "AI data" — embeddings — inside ordinary relational databases.</p>
<p><b>Use AI as a partner:</b> <code>Here is my schema (paste CREATE TABLEs). List 5 ways this design could produce inconsistent data.</code> or <code>Explain what the DBMS does, step by step, when I run this UPDATE.</code> Ask it to compare SQLite vs PostgreSQL for <i>your</i> workload and give the reasons.</p>
<p><b>Where AI goes wrong:</b> it happily invents columns that do not exist in your catalogue, mixes dialects (MySQL backticks in PostgreSQL), and suggests "just store it in a JSON file" or a NoSQL store for data that clearly needs transactions. It cannot see your real data volumes or concurrency.</p>
<p><b>What you must still own:</b> knowing <i>why</i> a DBMS beats files (concurrency, crashes, integrity), choosing the right family for the job, and reading the schema yourself before trusting any generated query. Text-to-SQL is only as safe as the permissions and constraints <i>you</i> put on the database.</p>`,
    problems: [
      {
        title: 'Database Inventory: Every Table and Its Row Count',
        level: 'Easy', tags: ['catalogue', 'DQL', 'UNION ALL'], companies: ['Amazon', 'Shopify'],
        statement: `<p>You just joined the shop team. Produce an inventory of the database: one row per table with its name and how many rows it holds, biggest first. Tables: <code>customers, loyalty_cards, products, orders, order_items</code>.</p>`,
        constraints: `Use the <code>shop</code> database. Output columns: <code>table_name, row_count</code>, ordered by <code>row_count</code> descending, then name.`,
        example: `${H.table(['table_name', 'row_count'], [['order_items', '10'], ['orders', '6'], ['products', '6'], ['customers', '5'], ['loyalty_cards', '3']])}<p>${H.c('g', 'order_items')} is biggest because every order has one row per product bought — line tables are always the largest in a shop schema.</p>`,
        brute: {
          why: `<p>The manual way: run <code>SELECT *</code> on each table and count rows by eye. Five separate queries, error-prone, and impossible once a table has a million rows (you would download all of it just to count). It also gives five separate result sets, not one report.</p>`,
          code: { lang: 'sql', db: 'shop', code: `-- Manual: dump every table and count the lines yourself (slow, error-prone)
SELECT * FROM customers;
SELECT * FROM loyalty_cards;
SELECT * FROM products;
SELECT * FROM orders;
SELECT * FROM order_items;` }
        },
        mcq: { q: 'Which is the cheapest way to know how many rows a table has?', options: ['<code>SELECT COUNT(*) FROM t</code>', '<code>SELECT * FROM t</code> and count in the app', 'Open the database file in a text editor', 'Count the columns'], answer: 0, explain: 'COUNT(*) is computed inside the DBMS and returns one number; SELECT * ships every row across the wire just to count it.' },
        hints: [
          `<p>Hint 1: <code>SELECT COUNT(*) FROM customers</code> returns one row with one number. You need one such row per table.</p>`,
          `<p>Hint 2: stick several one-row queries together with <code>UNION ALL</code>, and add a text literal column like <code>'customers' AS table_name</code> so you know which count is which.</p>`,
          `<p>Hint 3: wrap the UNION in an outer query (or just put ORDER BY at the very end) to sort by <code>row_count DESC, table_name</code>. Recipe: one SELECT per table → UNION ALL → ORDER BY.</p>`
        ],
        tests: { engine: 'sqlite', cases: [
          { cols: ['table_name', 'row_count'], rows: [['order_items', 10], ['orders', 6], ['products', 6], ['customers', 5], ['loyalty_cards', 3]] },
          { setup: 'DELETE FROM order_items;', cols: ['table_name', 'row_count'], rows: [['orders', 6], ['products', 6], ['customers', 5], ['loyalty_cards', 3], ['order_items', 0]] },
          { setup: 'DELETE FROM order_items; DELETE FROM orders; DELETE FROM loyalty_cards;', cols: ['table_name', 'row_count'], rows: [['products', 6], ['customers', 5], ['loyalty_cards', 0], ['order_items', 0], ['orders', 0]] },
          { setup: 'DELETE FROM order_items; DELETE FROM orders; DELETE FROM loyalty_cards; DELETE FROM customers; DELETE FROM products;', cols: ['table_name', 'row_count'], rows: [['customers', 0], ['loyalty_cards', 0], ['order_items', 0], ['orders', 0], ['products', 0]] },
          { setup: 'INSERT INTO loyalty_cards VALUES (504, 3, \'silver\', 0), (505, 4, \'gold\', 10);', cols: ['table_name', 'row_count'], rows: [['order_items', 10], ['orders', 6], ['products', 6], ['customers', 5], ['loyalty_cards', 5]] },
          { setup: 'WITH RECURSIVE n(i) AS (SELECT 100 UNION ALL SELECT i + 1 FROM n WHERE i < 149) INSERT INTO customers (customer_id, email, name) SELECT i, \'c\' || i || \'@x.com\', \'C\' || i FROM n;', cols: ['table_name', 'row_count'], rows: [['customers', 55], ['order_items', 10], ['orders', 6], ['products', 6], ['loyalty_cards', 3]] }
        ] },
        solution: {
          approach: `<p>Ask the DBMS to count inside each table, label each count with a literal string, glue the five one-row results into one result with <code>UNION ALL</code> (ALL = keep duplicates, and it is cheaper than UNION because it skips de-duplication), then sort. Bonus: the catalogue query lists tables so you never forget one.</p>`,
          code: { lang: 'sql', db: 'shop', code: `-- Which tables exist? (the catalogue never lies)
SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name;

-- One report: table name + row count, biggest first
SELECT 'customers'     AS table_name, COUNT(*) AS row_count FROM customers
UNION ALL
SELECT 'loyalty_cards',               COUNT(*)              FROM loyalty_cards
UNION ALL
SELECT 'products',                    COUNT(*)              FROM products
UNION ALL
SELECT 'orders',                      COUNT(*)              FROM orders
UNION ALL
SELECT 'order_items',                 COUNT(*)              FROM order_items
ORDER BY row_count DESC, table_name;` },
          complexity: `<p>Each COUNT(*) scans its table (or a small index) once: O(total rows) inside the engine, but only 5 tiny rows travel back to you. Real systems also keep <i>approximate</i> counts in statistics tables (e.g. PostgreSQL <code>pg_class.reltuples</code>) for instant estimates.</p>`,
          followUps: ['How would you do this automatically for every table in the catalogue? (dynamic SQL or a script that reads sqlite_master)', 'Why might <code>COUNT(*)</code> on a 2-billion-row PostgreSQL table be slow, and what would you use instead?']
        }
      }
    ]
  });

  /* ======================================================================
     TOPIC 2 — The relational model: tables, rows, columns
     ====================================================================== */
  topics.push({
    title: 'The Relational Model: Tables, Rows and Columns',
    analogy: `<p>Picture a school's <b>attendance register</b>. The printed header across the top — <i>Roll No, Name, City</i> — is fixed for the whole book: that is the table's <b>schema</b> (its columns). Each line a teacher fills in is one <b>row</b> — one student. Every box in a column must hold the same kind of thing: you cannot write a phone number in the "Name" box. And the register has a <b>name on its cover</b> ("Class 10-B students") — that is the table name.</p>
<p>The rule of the register: <b>one line = one student</b>, <b>one box = one value</b>.</p>`,
    explain: `<p>The <b>relational model</b> (E. F. Codd, 1970) says: store all data as <b>tables</b>, and connect tables using <b>values</b> (keys), not hidden pointers. It has a formal maths vocabulary and an everyday vocabulary — interviewers use both, so learn the pairs:</p>
${H.table(['Everyday word', 'Formal word', 'Meaning', 'In the <code>students</code> table'], [
  ['Table', '<b>Relation</b>', 'A named set of rows with the same columns', '<code>students</code>'],
  ['Row / record', '<b>Tuple</b>', 'One thing (one student)', '(1, R2024-001, Asha Verma, …)'],
  ['Column / field', '<b>Attribute</b>', 'One property of every row', '<code>city</code>'],
  ['Allowed values / data type', '<b>Domain</b>', 'The set of values a column may hold', '<code>city</code>: any text'],
  ['Number of columns', '<b>Degree</b> (arity)', 'How wide the table is', '7'],
  ['Number of rows', '<b>Cardinality</b>', 'How tall the table is right now', '8'],
  ['Table design', '<b>Relation schema</b>', 'Name + columns + types + constraints', '<code>students(student_id, roll_no, name, …)</code>'],
  ['Current contents', '<b>Relation instance</b> (state)', 'The rows that exist right now', 'the 8 rows today']
])}
<h4>Picture it</h4>
${H.table(['student_id', 'roll_no', 'name', 'city', 'dept_id'], [
  [H.c('p', '1'), 'R2024-001', 'Asha Verma', H.c('b', 'Pune'), '1'],
  [H.c('p', '2'), 'R2024-002', 'Ben Carter', H.c('b', 'Leeds'), '2'],
  [H.c('p', '3'), 'R2024-003', 'Chen Wei', H.c('b', 'Shanghai'), '1']
])}
<p>A <b>row</b> runs left to right (one student). A ${H.c('b', 'column')} runs top to bottom (one property of everybody). A single box is a <b>cell</b> — one value.</p>
<h4>The rules of a relation (what makes a table "relational")</h4>
<ol>
<li><b>Atomic values</b> (First Normal Form): each cell holds exactly one value. Not <code>"CS101, MA101"</code> crammed in one cell — that needs another table.</li>
<li><b>Every column has a domain</b>: all values in a column are the same kind of thing.</li>
<li><b>No duplicate rows</b>: in pure theory a relation is a <i>set</i>, so two identical rows are impossible. (Real SQL tables are <i>bags</i> and <i>do</i> allow duplicates unless you add a key — one reason every table should have a primary key.)</li>
<li><b>Row order does not matter</b>: there is no "first row". If you need order, ask for it with <code>ORDER BY</code>.</li>
<li><b>Column order does not matter</b> in theory: you refer to columns by <b>name</b>, never by position.</li>
<li><b>Unique column names</b> inside one table.</li>
</ol>
<h4>NULL: the "unknown / not applicable" marker</h4>
<p><code>NULL</code> is not zero and not an empty string — it means <i>"no value here"</i>. Chen Wei has no email on file: that cell is <code>NULL</code>. Because NULL means "unknown", <code>NULL = NULL</code> is not true (it is <i>unknown</i>); you test with <code>IS NULL</code>. Module 2 goes deep into this three-valued logic.</p>
<h4>Schema vs instance</h4>
<p>The <b>schema</b> changes rarely (by DDL like <code>ALTER TABLE</code>); the <b>instance</b> changes all day (by INSERT/UPDATE/DELETE). The schema is the shape of the cookie cutter; the instance is today's batch of cookies.</p>`,
    clues: [
      '"tuple", "attribute", "relation", "degree", "cardinality" in the question → they want the formal relational vocabulary mapped to rows/columns',
      '"a cell contains a list / comma-separated values" → violates atomicity (1NF) → split into a separate table',
      '"why is row order not guaranteed?" → relations are sets; only <code>ORDER BY</code> guarantees order',
      '"difference between schema and instance" → design (rarely changes) vs current data (always changes)',
      '"duplicate rows appeared" → SQL tables are bags; missing primary key / UNIQUE constraint',
      '"what does NULL mean?" → unknown or not applicable, not 0 and not empty string'
    ],
    code: [
      { lang: 'sql', db: 'school', title: 'Look at a relation: rows, columns, NULLs', code: `-- Every row = one student (a tuple). Every column = one attribute.
-- Chen Wei and Grace Lee have NULL email: "no value recorded".
SELECT student_id, roll_no, name, email, city, dept_id
FROM students
ORDER BY student_id;     -- order is NOT guaranteed unless you ask for it` },
      { lang: 'sql', db: 'school', title: 'Degree and cardinality, asked of the DBMS', code: `-- Degree = number of columns (from the catalogue)
SELECT COUNT(*) AS degree FROM pragma_table_info('students');

-- Cardinality = number of rows (from the data)
SELECT COUNT(*) AS cardinality FROM students;

-- The schema itself: column name, declared type, NOT NULL?, part of PK?
SELECT cid, name, type, "notnull", pk FROM pragma_table_info('students');` }
    ],
    codeTitle: ['Rows, columns and NULL', 'Degree, cardinality, schema'],
    viz: {
      title: 'Build a relation row by row (and see what breaks the rules)',
      input: 'id,name,dept,city | 1,Asha,CS,Pune | 2,Ben,Math, | 3,Chen,CS | 1,Asha,CS,Pune | 4,Diya,Physics,Pune',
      inputLabel: 'Header | row | row … (comma-separated values, rows split by |)',
      gen: function (input) {
        var parts = String(input || '').split('|').map(function (s) { return s.trim(); }).filter(function (s) { return s.length; });
        if (parts.length < 2) throw new Error('Format: col1,col2 | v1,v2 | v1,v2');
        if (parts.length > 13) throw new Error('Use at most 12 rows');
        var cols = parts[0].split(',').map(function (s) { return s.trim(); });
        if (cols.length < 2 || cols.length > 6 || cols.some(function (c) { return !/^[A-Za-z_]\w*$/.test(c); })) throw new Error('Header needs 2–6 simple column names, e.g. id,name,city');
        var seen = {};
        cols.forEach(function (c) { if (seen[c]) throw new Error('Duplicate column name "' + c + '" — not allowed in a relation'); seen[c] = 1; });
        var rows = [], frames = [], keys = {};
        function tbl(hl, label) { return { type: 'table', label: label || 'students (instance)', columns: cols, rows: rows.map(function (r) { return r.slice(); }), hl: hl || {} }; }
        function meta(extra) { var v = { degree: cols.length, cardinality: rows.length }; for (var k in extra) v[k] = extra[k]; return { type: 'vars', label: 'Relation facts', vals: v, hl: extra && extra._hl ? extra._hl : {} }; }
        frames.push({ narr: 'First the <b>schema</b>: the table has <b>' + cols.length + '</b> columns (<b>degree = ' + cols.length + '</b>) — <code>' + cols.join(', ') + '</code>. No rows yet, so <b>cardinality = 0</b>. The schema is the empty register; rows come next.', parts: [tbl({}), meta({})] });
        for (var i = 1; i < parts.length; i++) {
          var vals = parts[i].split(',').map(function (s) { return s.trim(); });
          if (vals.length > cols.length) {
            frames.push({ narr: 'Row <code>' + H.esc(parts[i]) + '</code> has <b>' + vals.length + '</b> values but the table has only ' + cols.length + ' columns. <span class="c-r">Rejected</span> — every tuple must match the schema exactly.', parts: [tbl({}), meta({ last: 'too many values', _hl: { last: 'bad' } }), { type: 'text', label: 'Rejected row', html: '<span class="c-r">' + H.esc(parts[i]) + '</span>' }] });
            continue;
          }
          var missing = [];
          while (vals.length < cols.length) vals.push('');
          vals = vals.map(function (v, j) { if (v === '') { missing.push(cols[j]); return 'NULL'; } return v; });
          var key = vals.join('\u0001');
          if (keys[key]) {
            rows.push(vals);
            var h = {}; h[keys[key] - 1] = 'bad'; h[rows.length - 1] = 'bad';
            frames.push({ narr: 'Row <code>(' + H.esc(vals.join(', ')) + ')</code> is an <b>exact duplicate</b> of an earlier row. A pure relation is a <i>set</i>, so this is impossible in theory. A real SQL table <span class="c-r">accepts it</span> (tables are <i>bags</i>) unless you declare a <b>primary key / UNIQUE</b>. Now nobody can tell the two rows apart or update just one of them.', parts: [tbl(h), meta({ duplicates: 'YES', _hl: { duplicates: 'bad', cardinality: 'cur' } })] });
            continue;
          }
          rows.push(vals); keys[key] = rows.length;
          var hl = {}; hl[rows.length - 1] = missing.length ? 'cur' : 'ok';
          frames.push({ narr: 'Insert tuple <code>(' + H.esc(vals.join(', ')) + ')</code>. ' + (missing.length ? 'No value was given for <b>' + missing.join(', ') + '</b>, so the cell holds <code>NULL</code> = "unknown / not applicable" (not zero, not empty text).' : 'Every column got exactly one atomic value.') + ' Cardinality is now <b>' + rows.length + '</b>; degree stays <b>' + cols.length + '</b>.', parts: [tbl(hl), meta({ _hl: { cardinality: 'ok' } })] });
        }
        if (rows.length) {
          var sorted = rows.slice().sort(function (a, b) { return String(a[1]).localeCompare(String(b[1])); });
          frames.push({ narr: '<b>Row order carries no meaning.</b> Here are the same rows sorted by <code>' + cols[1] + '</code>. It is the <i>same relation</i>. Without <code>ORDER BY</code>, a DBMS may return rows in any order (and the order can change after an index is added or the table is vacuumed).', parts: [{ type: 'table', label: 'Same relation, different order', columns: cols, rows: sorted }, meta({})] });
          var colHl = cols[cols.length - 1];
          frames.push({ narr: 'A <b>column</b> (attribute) is one property of every row, read top to bottom. The values of <code>' + colHl + '</code> come from one <b>domain</b> (same kind of value). Read across a row and you get one <b>tuple</b> (one real-world thing).', parts: [{ type: 'array', label: 'column "' + colHl + '" (attribute)', values: rows.map(function (r) { return r[r.length - 1]; }), hl: rows.reduce(function (o, r, k) { o[k] = r[r.length - 1] === 'NULL' ? 'y' : 'b'; return o; }, {}) }, { type: 'array', label: 'row 0 (tuple)', values: rows[0], hl: { 0: 'p' } }, meta({})] });
        }
        return frames;
      }
    },
    examples: [
      {
        title: 'Spot the non-atomic cell',
        html: `<p>A beginner designs <code>students(name, courses)</code> and stores <code>'CS101,MA101'</code> in one cell. Now "who takes MA101?" needs string searching (<code>LIKE '%MA101%'</code>), which also matches <code>'MA1010'</code>, cannot be indexed well, and cannot have a foreign key. ${H.table(['name', 'courses'], [['Asha', H.c('r', 'CS101,MA101')], ['Ben', H.c('r', 'MA101')]])} Fix: one row per (student, course) pair — exactly what the <code>enrollments</code> table does.</p>`,
        code: { lang: 'sql', db: 'school', code: `-- Relational way: one value per cell, one row per (student, course)
SELECT s.name, e.course_id
FROM enrollments AS e
JOIN students    AS s ON s.student_id = e.student_id
WHERE e.course_id = 'MA101';` }
      },
      {
        title: 'Degree and cardinality of every school table',
        html: `<p>Degree comes from the <b>schema</b>; cardinality from the <b>instance</b>. ${H.table(['table', 'degree', 'cardinality'], [['departments', '3', '4'], ['students', '7', '8'], ['enrollments', '4', '14']])} Note: adding a row changes cardinality only; <code>ALTER TABLE … ADD COLUMN</code> changes degree only.</p>`,
        code: { lang: 'sql', db: 'school', code: `SELECT 'departments' AS tbl,
       (SELECT COUNT(*) FROM pragma_table_info('departments')) AS degree,
       (SELECT COUNT(*) FROM departments)                        AS cardinality
UNION ALL
SELECT 'students',
       (SELECT COUNT(*) FROM pragma_table_info('students')),
       (SELECT COUNT(*) FROM students)
UNION ALL
SELECT 'enrollments',
       (SELECT COUNT(*) FROM pragma_table_info('enrollments')),
       (SELECT COUNT(*) FROM enrollments);` }
      },
      {
        title: 'NULL is not "nothing equals nothing"',
        html: `<p>Who has no email? Writing <code>WHERE email = NULL</code> returns <b>zero rows</b>, because comparing anything with NULL gives <i>unknown</i>, and WHERE keeps only <i>true</i>. You must write <code>IS NULL</code>. ${H.table(['query', 'rows'], [['<code>email = NULL</code>', H.c('r', '0')], ['<code>email IS NULL</code>', H.c('g', '2 (Chen Wei, Grace Lee)')]])}</p>`,
        code: { lang: 'sql', db: 'school', code: `SELECT COUNT(*) AS wrong_way FROM students WHERE email = NULL;   -- 0: comparison is UNKNOWN
SELECT name AS no_email FROM students WHERE email IS NULL;      -- the right test` }
      },
      {
        title: 'Duplicate rows in a table with no key',
        html: `<p>The <code>signups</code> export has no declared key. Insert the same row twice and SQL happily stores both — then <code>DELETE … WHERE email = 'x'</code> removes both, and you cannot update "just one". That is why the relational rule "no duplicate tuples" is enforced in practice by a <b>primary key or UNIQUE constraint</b>.</p>`,
        code: { lang: 'sql', db: 'shop', code: `INSERT INTO signups VALUES ('zoe@mail.com','zoe','+1-555-0199','Zoe Ray','Austin');
INSERT INTO signups VALUES ('zoe@mail.com','zoe','+1-555-0199','Zoe Ray','Austin');  -- accepted!
SELECT * FROM signups WHERE email = 'zoe@mail.com';   -- 2 identical rows: a bag, not a set` }
      }
    ],
    deepDive: `<h4>Theory vs what SQL actually does</h4>
<ul>
<li><b>Sets vs bags.</b> Codd's relations are sets (no duplicates). SQL chose <i>bag</i> (multiset) semantics for speed — removing duplicates costs a sort or hash. That is why <code>SELECT DISTINCT</code> and <code>UNION</code> (which de-duplicate) are slower than <code>SELECT</code> and <code>UNION ALL</code>.</li>
<li><b>Column order leaks.</b> Theory says column order does not matter, yet <code>SELECT *</code> and <code>INSERT INTO t VALUES (…)</code> without a column list depend on it. Production rule: always name columns in INSERT, avoid <code>SELECT *</code> in application code — a later <code>ALTER TABLE</code> can silently shift positions.</li>
<li><b>Row order leaks too.</b> Small tables often come back in insertion order, so people assume it is guaranteed. Then the table grows, the planner chooses a different index or a parallel scan, and the order changes in production. Only <code>ORDER BY</code> is a contract.</li>
<li><b>Domains in SQLite.</b> SQLite uses <i>type affinity</i>: a column declared <code>INTEGER</code> will still store <code>'abc'</code> as text unless you use a <code>STRICT</code> table (SQLite 3.37+) or a CHECK. PostgreSQL and MySQL (strict mode) reject it. Know your engine.</li>
<li><b>NULL counts.</b> A relation with NULLs is no longer pure set theory; SQL adds three-valued logic (TRUE / FALSE / UNKNOWN). Codd later proposed two kinds of NULL ("missing but applicable" vs "not applicable") — SQL kept one, which is why "NULL means what, exactly?" is a classic design debate.</li>
<li><b>Relational algebra.</b> Under the hood every query is built from a handful of operators that take relations and return relations: selection σ (WHERE), projection π (SELECT columns), join ⋈, union ∪, difference −, rename ρ. Because the output is always a relation, queries compose like LEGO — a subquery is just another table.</li>
</ul>`,
    aiEra: `<p><b>What AI changes:</b> you can paste a CSV or JSON sample and ask an assistant to propose a relational schema; it will usually split repeated groups into tables and pick sensible column types. Many BI tools now let people "talk to a table" without knowing what a tuple is.</p>
<p><b>Use AI as a partner:</b> <code>Here are 20 sample rows. Which columns are not atomic, which look like they belong in another table, and what domain should each column have?</code> Then check its answer against the vocabulary in this topic.</p>
<p><b>Where AI goes wrong:</b> it often keeps comma-separated lists or JSON blobs in a column "for simplicity", relies on <code>SELECT *</code> and on insertion order, and treats NULL like an empty string. It may also produce INSERTs without column lists that break the moment the schema changes.</p>
<p><b>What you must still own:</b> the rules of a relation (atomic cells, one fact per row, no meaningful order, NULL semantics) — they are what let you spot a broken generated design in five seconds.</p>`,
    problems: [
      {
        title: 'Describe a Table Like a DBA',
        level: 'Easy', tags: ['schema', 'degree', 'cardinality', 'catalogue'], companies: ['Microsoft', 'Oracle'],
        statement: `<p>For the <code>courses</code> table in the school database, return one row with its <b>degree</b> (number of columns), its <b>cardinality</b> (number of rows) and a comma-separated list of its column names in their declared order.</p>`,
        constraints: `Use <code>db: school</code>. Output columns: <code>degree, cardinality, columns</code>. Do not hard-code numbers — ask the DBMS.`,
        example: `${H.table(['degree', 'cardinality', 'columns'], [['5', '7', 'course_id,title,credits,dept_id,teacher_id']])}<p>${H.c('b', 'degree 5')} comes from the schema (5 columns), ${H.c('g', 'cardinality 7')} from the data (7 courses).</p>`,
        brute: {
          why: `<p>Hard-coding the answer after eyeballing <code>SELECT *</code> works today and is wrong tomorrow: add a course or a column and the "report" silently lies. It also mixes up schema facts (degree) with data facts (cardinality) — two different sources.</p>`,
          code: { lang: 'sql', db: 'school', code: `-- Looked at SELECT * once, then typed the numbers in. Breaks as soon as data changes.
SELECT 5 AS degree, 7 AS cardinality, 'course_id,title,credits,dept_id,teacher_id' AS columns;` }
        },
        mcq: { q: 'You run <code>INSERT INTO courses …</code> once. What changes?', options: ['Only the cardinality', 'Only the degree', 'Both', 'Neither'], answer: 0, explain: 'INSERT adds a row (instance). Degree is a schema property and changes only with DDL such as ALTER TABLE ADD COLUMN.' },
        hints: [
          `<p>Hint 1: degree is about the <b>schema</b>, so ask the catalogue: <code>pragma_table_info('courses')</code> returns one row per column.</p>`,
          `<p>Hint 2: cardinality is about the <b>data</b>: <code>SELECT COUNT(*) FROM courses</code>. Use scalar subqueries to put both numbers in one row.</p>`,
          `<p>Hint 3: <code>group_concat(name, ',')</code> over the table_info rows ordered by <code>cid</code> gives the column list. Recipe: three scalar subqueries in one SELECT.</p>`
        ],
        tests: { engine: 'sqlite', cases: [
          { cols: ['degree', 'cardinality', 'columns'], rows: [[5, 7, 'course_id,title,credits,dept_id,teacher_id']] },
          { setup: 'ALTER TABLE courses ADD COLUMN room TEXT;', cols: ['degree', 'cardinality', 'columns'], rows: [[6, 7, 'course_id,title,credits,dept_id,teacher_id,room']] },
          { setup: 'DELETE FROM enrollments; DELETE FROM courses;', cols: ['degree', 'cardinality', 'columns'], rows: [[5, 0, 'course_id,title,credits,dept_id,teacher_id']] },
          { setup: 'DELETE FROM enrollments WHERE course_id = \'HI101\'; DELETE FROM courses WHERE course_id = \'HI101\';', cols: ['degree', 'cardinality', 'columns'], rows: [[5, 6, 'course_id,title,credits,dept_id,teacher_id']] },
          { setup: 'ALTER TABLE courses ADD COLUMN room TEXT; ALTER TABLE courses ADD COLUMN term TEXT; ALTER TABLE courses RENAME COLUMN title TO name;', cols: ['degree', 'cardinality', 'columns'], rows: [[7, 7, 'course_id,name,credits,dept_id,teacher_id,room,term']] },
          { setup: 'INSERT INTO courses (course_id, title, credits, dept_id) VALUES (\'ZZ1\', \'A\', 1, 1), (\'ZZ2\', \'B\', 2, 2), (\'ZZ3\', \'C\', 3, 3);', cols: ['degree', 'cardinality', 'columns'], rows: [[5, 10, 'course_id,title,credits,dept_id,teacher_id']] }
        ] },
        solution: {
          approach: `<p>Use three scalar subqueries — each returns exactly one value — side by side in one SELECT. Two of them read the catalogue (<code>pragma_table_info</code>), one reads the data. Ordering the column list by <code>cid</code> (column id) keeps the declared order.</p>`,
          code: { lang: 'sql', db: 'school', code: `SELECT
  (SELECT COUNT(*) FROM pragma_table_info('courses')) AS degree,       -- schema fact
  (SELECT COUNT(*) FROM courses)                       AS cardinality,  -- data fact
  (SELECT group_concat(name, ',')
     FROM (SELECT name FROM pragma_table_info('courses') ORDER BY cid)) AS columns;` },
          complexity: `<p>Catalogue lookups are O(number of columns); COUNT(*) is O(rows). Instant here. In PostgreSQL you would read <code>information_schema.columns</code>; in MySQL <code>DESCRIBE courses</code>.</p>`,
          followUps: ['Write the same report using <code>information_schema.columns</code> (standard SQL, PostgreSQL/MySQL).', 'Add a column with ALTER TABLE and re-run: which number changes?']
        }
      }
    ]
  });

  /* ======================================================================
     TOPIC 3 — Keys: super, candidate, primary, alternate, composite, surrogate
     ====================================================================== */
  topics.push({
    title: 'Keys: Super, Candidate, Primary, Alternate, Composite & Surrogate',
    analogy: `<p>How does a country tell two people named "Asha Verma" apart? Not by name — by a number nobody else has: a <b>passport number</b>, a <b>national ID</b>, a <b>phone number</b>. Each of those could identify you on its own; those are your <b>candidate keys</b>. The government picks <i>one</i> to file everything under — say the national ID — that is the <b>primary key</b>. The others (passport, phone) still identify you; they are <b>alternate keys</b>. "National ID + favourite colour" also identifies you, but the colour is useless extra baggage — that is a <b>super key</b> that is not minimal.</p>`,
    explain: `<p>A <b>key</b> is a column (or group of columns) whose values <b>identify exactly one row</b>. Keys are how the relational model finds rows without pointers, and how tables point at each other. Learn the family from biggest to smallest:</p>
${H.table(['Key type', 'Plain-English definition', 'Example in <code>students</code>'], [
  ['<b>Super key</b>', 'ANY set of columns whose values are never repeated across rows. May contain extra, unnecessary columns.', '{student_id}, {student_id, name}, {roll_no, city}, …'],
  ['<b>Candidate key</b>', 'A super key with <b>nothing extra</b>: remove any column and it stops being unique (minimal).', '{student_id}, {roll_no}'],
  ['<b>Primary key (PK)</b>', 'The ONE candidate key you choose as the official identity. Must be unique and <b>NOT NULL</b>. One per table.', '<code>student_id</code>'],
  ['<b>Alternate key</b>', 'Every candidate key you did <i>not</i> pick. Enforce it with <code>UNIQUE</code>.', '<code>roll_no</code> (UNIQUE NOT NULL)'],
  ['<b>Unique key</b>', 'A column with a UNIQUE constraint; in most engines it may hold NULLs (many of them).', '<code>email</code> (some students have none)'],
  ['<b>Composite key</b>', 'A key made of 2+ columns together.', '<code>enrollments(student_id, course_id)</code>'],
  ['<b>Natural key</b>', 'A real-world value that is already unique.', '<code>roll_no</code>, ISBN, country code "IN"'],
  ['<b>Surrogate key</b>', 'A made-up value with no meaning, generated by the DBMS.', '<code>student_id</code> = 1, 2, 3 …'],
  ['<b>Foreign key (FK)</b>', 'A column that stores another table\'s key to link the two (next topic).', '<code>students.dept_id</code> → <code>departments.dept_id</code>']
])}
<h4>The ladder in one picture</h4>
<p>${H.c('m', 'all column sets')} ⊃ ${H.c('b', 'super keys')} ⊃ ${H.c('g', 'candidate keys')} ⊃ ${H.c('p', 'the primary key')}. Every candidate key is a super key; not every super key is a candidate key; exactly one candidate key becomes the primary key.</p>
<h4>How to choose a good primary key (the 5 S rule)</h4>
<ol>
<li><b>Sure-unique</b> — guaranteed by a business rule, not by luck in today's data.</li>
<li><b>Set</b> (never NULL) — the PK is the row's identity; an unknown identity makes no sense. This is the <b>entity integrity</b> rule.</li>
<li><b>Stable</b> — never changes. Emails and phone numbers change, so they make poor PKs; every FK pointing at them would need updating.</li>
<li><b>Small</b> — the PK is copied into every FK and every index; an 8-byte integer beats a 60-character string.</li>
<li><b>Simple</b> — one column when possible; composite PKs are fine for junction tables.</li>
</ol>
<p>That is why most tables use a <b>surrogate</b> integer (<code>INTEGER PRIMARY KEY</code>, <code>BIGINT GENERATED ALWAYS AS IDENTITY</code>) or a UUID, and keep natural keys as <b>alternate keys</b> with <code>UNIQUE</code> — you get a stable identity <i>and</i> you still block duplicates of the real-world value.</p>
<h4>Declaring keys</h4>
${H.table(['You want', 'SQL'], [
  ['Single-column PK', '<code>student_id INTEGER PRIMARY KEY</code>'],
  ['Composite PK', '<code>PRIMARY KEY (student_id, course_id)</code> as a table constraint'],
  ['Alternate key', '<code>roll_no TEXT NOT NULL UNIQUE</code>'],
  ['Composite alternate key', '<code>UNIQUE (dept_id, name)</code>'],
  ['Foreign key', '<code>dept_id INTEGER REFERENCES departments(dept_id)</code>']
])}`,
    clues: [
      '"uniquely identifies a row" / "minimal set of attributes" → candidate key; "minimal" is the word that separates it from super key',
      '"can a primary key be NULL?" → no: entity integrity. "Can a UNIQUE column be NULL?" → yes in most engines (often multiple NULLs)',
      '"natural key vs surrogate key" → stability, size, privacy, merges; usual answer: surrogate PK + UNIQUE natural key',
      '"composite key" / "a student can enrol in a course only once" → PRIMARY KEY (student_id, course_id) or UNIQUE on the pair',
      '"How many primary keys can a table have?" → one PK (possibly multi-column), many UNIQUE constraints',
      '"auto-increment vs UUID" → distributed ID generation, index locality (UUIDv7 / ULID are time-ordered)'
    ],
    code: [
      { lang: 'sql', title: 'Every key type in one schema (self-contained)', code: `PRAGMA foreign_keys = ON;

CREATE TABLE countries (
  code TEXT PRIMARY KEY NOT NULL,          -- natural key: 'IN', 'GB' (short, stable)
  name TEXT NOT NULL UNIQUE                -- alternate key
);

CREATE TABLE citizens (
  citizen_id  INTEGER PRIMARY KEY,         -- surrogate PK (auto-assigned by SQLite)
  national_id TEXT NOT NULL UNIQUE,        -- candidate key kept as alternate key
  passport_no TEXT UNIQUE,                 -- unique key, NULL allowed (not everyone has one)
  full_name   TEXT NOT NULL,               -- NOT a key: names repeat
  country     TEXT NOT NULL REFERENCES countries(code),   -- foreign key
  UNIQUE (country, national_id)            -- composite unique key (redundant here, shown for syntax)
);

INSERT INTO countries VALUES ('IN', 'India'), ('GB', 'United Kingdom');
INSERT INTO citizens (national_id, passport_no, full_name, country) VALUES
  ('IN-1111', 'P123', 'Asha Verma', 'IN'),
  ('IN-2222', NULL,   'Asha Verma', 'IN'),     -- same name: fine, name is not a key
  ('GB-9999', NULL,   'Ben Carter', 'GB');     -- second NULL passport: fine for UNIQUE

SELECT * FROM citizens;   -- citizen_id was generated: 1, 2, 3` },
      { lang: 'sql', db: 'school', title: 'Proving keys with data (evidence, not proof)', code: `-- A column is a candidate-key "suspect" if COUNT(DISTINCT col) = COUNT(*) and it has no NULLs.
SELECT COUNT(*)                 AS total_rows,
       COUNT(DISTINCT student_id) AS distinct_ids,
       COUNT(DISTINCT roll_no)    AS distinct_rolls,
       COUNT(DISTINCT email)      AS distinct_emails,   -- COUNT(DISTINCT) skips NULLs
       SUM(email IS NULL)         AS null_emails,
       COUNT(DISTINCT city)       AS distinct_cities
FROM students;` }
    ],
    codeTitle: ['Declaring keys', 'Checking keys against data'],
    viz: {
      title: 'Find the candidate keys of a table (try every column combination)',
      input: 'roll,email,name,city | R1,asha@x.com,Asha,Pune | R2,ben@x.com,Ben,Leeds | R3,chen@x.com,Asha,Delhi | R4,,Diya,Pune',
      inputLabel: 'Header | row | row … (empty value = NULL; max 5 columns, 10 rows)',
      gen: function (input) {
        var parts = String(input || '').split('|').map(function (s) { return s.trim(); }).filter(function (s) { return s.length; });
        if (parts.length < 3) throw new Error('Format: col1,col2,col3 | v,v,v | v,v,v (at least 2 rows)');
        var cols = parts[0].split(',').map(function (s) { return s.trim(); });
        if (cols.length < 2 || cols.length > 5) throw new Error('Use 2 to 5 columns');
        if (parts.length > 11) throw new Error('Use at most 10 rows');
        var rows = parts.slice(1).map(function (p) {
          var v = p.split(',').map(function (s) { return s.trim(); });
          if (v.length > cols.length) throw new Error('Row "' + p + '" has more values than columns');
          while (v.length < cols.length) v.push('');
          return v.map(function (x) { return x === '' ? 'NULL' : x; });
        });
        var n = cols.length, subsets = [];
        for (var mask = 1; mask < (1 << n); mask++) subsets.push(mask);
        subsets.sort(function (a, b) { var ca = bc(a), cb = bc(b); return ca - cb || a - b; });
        function bc(x) { var c = 0; while (x) { c += x & 1; x >>= 1; } return c; }
        function names(m) { var r = []; for (var i = 0; i < n; i++) if (m & (1 << i)) r.push(cols[i]); return '{' + r.join(', ') + '}'; }
        var supers = [], cands = [], frames = [];
        frames.push({ narr: 'A <b>super key</b> is any set of columns whose combined values never repeat. A <b>candidate key</b> is a super key with nothing extra. With ' + n + ' columns there are 2<sup>' + n + '</sup> − 1 = <b>' + subsets.length + '</b> non-empty column sets to test, smallest first.', parts: [{ type: 'table', label: 'The data', columns: cols, rows: rows }, { type: 'set', label: 'Candidate keys found', items: [] }] });
        subsets.forEach(function (m) {
          var seen = {}, clash = null, hasNull = false;
          for (var r = 0; r < rows.length; r++) {
            var k = [];
            for (var i = 0; i < n; i++) if (m & (1 << i)) { k.push(rows[r][i]); if (rows[r][i] === 'NULL') hasNull = true; }
            var key = k.join('\u0001');
            if (seen[key] !== undefined && !clash) clash = [seen[key], r];
            if (seen[key] === undefined) seen[key] = r;
          }
          var cover = cands.filter(function (c) { return (c & m) === c; });
          var hl = {}, narr;
          if (clash) {
            hl[clash[0]] = 'bad'; hl[clash[1]] = 'bad';
            narr = names(m) + ': rows ' + clash[0] + ' and ' + clash[1] + ' have the <span class="c-r">same values</span> here, so this set cannot tell them apart → <b>not a super key</b>.';
          } else if (cover.length) {
            supers.push(m);
            narr = names(m) + ': unique → a <b>super key</b>, but it already contains candidate key ' + names(cover[0]) + '. The other columns are extra baggage → <span class="c-y">not minimal</span>, so not a candidate key.';
            for (var r2 = 0; r2 < rows.length; r2++) hl[r2] = 'win';
          } else {
            supers.push(m); cands.push(m);
            narr = names(m) + ': every row has a different value combination and no smaller set works → <span class="c-g"><b>candidate key</b></span>!' + (hasNull ? ' But it contains a <b>NULL</b>, so it can only be a <code>UNIQUE</code> key, never the PRIMARY KEY (entity integrity).' : '');
            for (var r3 = 0; r3 < rows.length; r3++) hl[r3] = 'ok';
          }
          var shown = rows.map(function (row) { return cols.map(function (c, i) { return (m & (1 << i)) ? row[i] : '·'; }); });
          frames.push({ narr: narr, parts: [{ type: 'table', label: 'Projection on ' + names(m) + ' (· = column ignored)', columns: cols, rows: shown, hl: hl }, { type: 'set', label: 'Candidate keys so far', items: cands.map(names), hl: (function () { var o = {}; if (cands[cands.length - 1] === m) o[names(m)] = 'ok'; return o; })() }, { type: 'vars', label: 'Counters', vals: { tested: subsets.indexOf(m) + 1, super_keys: supers.length, candidate_keys: cands.length } }] });
        });
        var nonNull = cands.filter(function (m) { return rows.every(function (row) { for (var i = 0; i < n; i++) if ((m & (1 << i)) && row[i] === 'NULL') return false; return true; }); });
        nonNull.sort(function (a, b) { return bc(a) - bc(b) || a - b; });
        var pk = nonNull.length ? nonNull[0] : null, hl2 = {};
        cands.forEach(function (c) { hl2[names(c)] = c === pk ? 'sel' : 'win'; });
        frames.push({ narr: pk !== null ? 'Pick the <b>primary key</b>: the smallest candidate with no NULLs and (by business rule) stable → ' + H.c('p', names(pk)) + '. Every other candidate key becomes an <b>alternate key</b> → declare it <code>UNIQUE</code>.' : 'Every candidate key here contains a NULL, so none can be the PK. Add a <b>surrogate key</b> (e.g. <code>id INTEGER PRIMARY KEY</code>) and keep the others as UNIQUE.', parts: [{ type: 'set', label: 'Candidate keys (purple = chosen PK, blue = alternate)', items: cands.map(names), hl: hl2 }, { type: 'vars', label: 'Summary', vals: { super_keys: supers.length, candidate_keys: cands.length, primary_key: pk !== null ? names(pk) : 'add surrogate id' } }] });
        frames.push({ narr: '<b>Warning:</b> data can only <i>disprove</i> a key, never prove it. A set like ' + (cands.filter(function (c) { return bc(c) > 1; }).map(names)[0] || '{name}') + ' may be unique in these few rows by coincidence — tomorrow a second person with the same values can sign up. Real keys come from <b>business rules</b> ("each roll number is issued once"); the data check is just a sanity test.', parts: [{ type: 'table', label: 'The data', columns: cols, rows: rows }, { type: 'text', label: 'Rule', html: 'Keys = business rules. Data = evidence. Constraints = enforcement.' }] });
        return frames;
      }
    },
    examples: [
      {
        title: 'Natural key vs surrogate key: the email that changed',
        html: `<p>Suppose <code>customers</code> used <code>email</code> as its primary key, and <code>orders</code> stored that email as the FK. Asha changes her email → you must update her row <b>and every order, review, invoice and log</b> that copied it (a "cascade storm"), maybe across services you do not control. With a surrogate <code>customer_id</code>, only one cell changes. ${H.table(['', 'Natural PK (email)', 'Surrogate PK (customer_id)'], [['Change email', H.c('r', 'update 1 + N child rows'), H.c('g', 'update 1 row')], ['FK size', '~25 bytes text', '8 bytes integer'], ['Leaks personal data in URLs/logs', H.c('r', 'yes'), H.c('g', 'no')], ['Still blocks duplicate emails?', 'yes', 'yes — keep <code>UNIQUE(email)</code>']])}</p>`,
        code: { lang: 'sql', db: 'shop', code: `-- Surrogate PK: changing the natural value touches ONE row; orders keep pointing at id 1.
UPDATE customers SET email = 'asha.verma@newmail.com' WHERE customer_id = 1;
SELECT c.customer_id, c.email, COUNT(o.order_id) AS orders_still_linked
FROM customers c LEFT JOIN orders o ON o.customer_id = c.customer_id
WHERE c.customer_id = 1
GROUP BY c.customer_id, c.email;` }
      },
      {
        title: 'Composite key: one enrolment per student per course',
        html: `<p><code>enrollments</code> has <code>PRIMARY KEY (student_id, course_id)</code>. Neither column alone is unique (Asha takes 3 courses; CS101 has 4 students), but the <b>pair</b> is. Trying to enrol Asha in CS101 again violates the key. Below we use <code>INSERT OR IGNORE</code> so the rejected row is skipped quietly instead of raising an error — the count stays the same.</p>`,
        code: { lang: 'sql', db: 'school', code: `SELECT COUNT(*) AS before FROM enrollments;
INSERT OR IGNORE INTO enrollments VALUES (1, 'CS101', '2025-SPRING', NULL);  -- duplicate pair: skipped
INSERT OR IGNORE INTO enrollments VALUES (1, 'PH101', '2025-SPRING', NULL);  -- new pair: accepted
SELECT COUNT(*) AS after FROM enrollments;           -- before + 1
SELECT * FROM enrollments WHERE student_id = 1;` }
      },
      {
        title: 'Counting super keys (classic theory question)',
        html: `<p>Relation R(A, B, C, D) has a single candidate key {A}. How many super keys? Any set that <i>contains</i> A is a super key; the other 3 columns can each be in or out: 2<sup>3</sup> = <b>8</b>. ${H.table(['Candidate keys', 'Super keys'], [['{A}', '2<sup>n−1</sup> = 8'], ['{A}, {B}', '|contains A| + |contains B| − |contains both| = 8 + 8 − 4 = <b>12</b>'], ['{A, B}', '2<sup>n−2</sup> = 4']])} Use inclusion–exclusion whenever there are several candidate keys.</p>`
      },
      {
        title: 'SQLite quirks every interviewer-on-SQLite asks about',
        html: `<ul><li><code>INTEGER PRIMARY KEY</code> (exactly that spelling) becomes an alias of the hidden 64-bit <code>rowid</code>; omit it on INSERT and SQLite assigns max+1.</li><li>Add <code>AUTOINCREMENT</code> only if ids must <b>never be reused</b> after deletes (it costs an extra table, <code>sqlite_sequence</code>).</li><li>Legacy bug kept for compatibility: a non-integer PRIMARY KEY column can hold <b>NULL</b> unless you also write <code>NOT NULL</code> (or use <code>STRICT</code>/<code>WITHOUT ROWID</code> tables). PostgreSQL and MySQL always forbid NULL in a PK.</li></ul>`,
        code: { lang: 'sql', code: `CREATE TABLE t (id INTEGER PRIMARY KEY, label TEXT);
INSERT INTO t (label) VALUES ('a'), ('b'), ('c');   -- ids 1, 2, 3 assigned
DELETE FROM t WHERE id = 3;
INSERT INTO t (label) VALUES ('d');                 -- gets id 3 again (max + 1) without AUTOINCREMENT

CREATE TABLE quirky (code TEXT PRIMARY KEY, label TEXT);
INSERT INTO quirky VALUES (NULL, 'x'), (NULL, 'y'); -- SQLite allows this (legacy quirk)!

SELECT 't' AS tbl, id AS key, label FROM t
UNION ALL
SELECT 'quirky', code, label FROM quirky;` }
      }
    ],
    deepDive: `<h4>Keys in production</h4>
<ul>
<li><b>Formal definition.</b> K is a super key of R if for any two distinct tuples t1, t2: t1[K] ≠ t2[K]. K is a candidate key if no proper subset of K is a super key. With n columns there can be up to C(n, ⌊n/2⌋) candidate keys — that is why finding all of them from functional dependencies is a real algorithm (module 8: attribute closure).</li>
<li><b>Keys create indexes.</b> Declaring PRIMARY KEY or UNIQUE makes the DBMS build an index (in SQLite you saw <code>sqlite_autoindex_*</code> in the catalogue) so it can check uniqueness in O(log N) instead of scanning. In InnoDB (MySQL) the PK <i>is</i> the table — rows are stored in a B+tree ordered by PK (clustered index), and every secondary index stores the PK value. That is why a long text PK makes every index fatter.</li>
<li><b>Auto-increment vs UUID.</b> Sequential integers are small and index-friendly (new rows append at the right edge of the B+tree) but need a central counter and leak business volume ("order 10052 — they have only ~10k orders"). Random UUIDv4 can be generated anywhere but scatter inserts across the index (page splits, cache misses). <b>UUIDv7</b> (RFC 9562, 2024) and ULID put a timestamp first, so they are globally unique <i>and</i> roughly ordered — the common 2026 default for distributed systems. Snowflake-style 64-bit ids are another option.</li>
<li><b>UNIQUE and NULL.</b> Standard SQL treats NULLs as distinct, so a UNIQUE column may contain many NULLs (PostgreSQL, SQLite, MySQL). SQL Server historically allowed only one NULL. PostgreSQL 15+ supports <code>UNIQUE NULLS NOT DISTINCT</code> when you want at most one.</li>
<li><b>Composite key order matters physically.</b> <code>PRIMARY KEY (student_id, course_id)</code> builds an index sorted by student first; "all courses of student 1" is fast, "all students of CS101" needs another index on <code>course_id</code> (left-prefix rule, module 10).</li>
<li><b>Keys are promises about the future.</b> Data mining can find columns that are unique <i>today</i>; only the business can promise they stay unique. Interviewers love the follow-up "is (name, birth_date) a key?" — answer: no, twins and coincidences exist.</li>
</ul>`,
    aiEra: `<p><b>What AI changes:</b> generators and ORMs add <code>id</code> primary keys automatically, and an assistant can scan a sample dataset and list "possible unique columns" instantly. Schema-review bots flag tables with no primary key.</p>
<p><b>Use AI as a partner:</b> <code>For this table, list candidate keys from the business rules I describe, then tell me which you would make the PK and why (stability, size, privacy).</code> Or ask for a data-check query: <code>Write SQL that proves or disproves (customer_id, order_date) is unique.</code></p>
<p><b>Where AI goes wrong:</b> it confuses "unique in this sample" with "a key", picks email or username as the PK, forgets <code>UNIQUE</code> on the natural key when it adds a surrogate (so duplicates of real people creep in), and sometimes declares two PRIMARY KEY clauses or a nullable PK.</p>
<p><b>What you must still own:</b> the business meaning of identity — what makes two rows "the same thing" — and the trade-off between natural, surrogate, auto-increment and UUIDv7 keys for your system.</p>`,
    problems: [
      {
        title: 'Which Columns of a Key-less Export Could Be Keys?',
        level: 'Medium', tags: ['candidate key', 'COUNT DISTINCT', 'NULL'], companies: ['Google', 'Stripe', 'Flipkart'],
        statement: `<p>The <code>signups</code> table (shop database) was imported from a CSV with no constraints. For each column, report how many distinct non-NULL values and how many NULLs it has, and decide which single columns are <b>candidate keys</b> by the data (distinct = total rows and zero NULLs). Also test the pair <code>(full_name, city)</code>.</p>`,
        constraints: `Use <code>db: shop</code>. One result row per column (or tested pair): <code>col, distinct_values, nulls, total_rows, verdict</code>.`,
        example: `${H.table(['col', 'distinct_values', 'nulls', 'total_rows', 'verdict'], [['email', '8', '0', '8', H.c('g', 'candidate key')], ['username', '8', '0', '8', H.c('g', 'candidate key')], ['phone', '6', '2', '8', H.c('y', 'unique but has NULLs')], ['full_name', '6', '0', '8', H.c('r', 'not unique')], ['city', '5', '0', '8', H.c('r', 'not unique')], ['(full_name, city)', '7', '0', '8', H.c('r', 'not unique')]])}<p>Two Sam Parks live in Pune, so even the pair repeats.</p>`,
        brute: {
          why: `<p>Looking at the first few rows (<code>LIMIT 5</code>) and guessing: in the first five rows every full_name and every city-name pair looks unique, so you would wrongly crown <code>full_name</code> a key. Samples cannot reveal duplicates that live further down the table.</p>`,
          code: { lang: 'sql', db: 'shop', code: `-- Eyeballing a sample: every name looks unique here... wrong conclusion
SELECT * FROM signups LIMIT 5;` }
        },
        mcq: { q: 'COUNT(DISTINCT phone) = 6, COUNT(*) = 8, and 2 phones are NULL. Can phone be the PRIMARY KEY?', options: ['No — a PK cannot contain NULL', 'Yes — the non-NULL values are unique', 'Yes, if we add AUTOINCREMENT', 'Only in SQLite'], answer: 0, explain: 'Entity integrity: a PK must identify every row, so NULL is not allowed. phone could still be a UNIQUE (nullable) alternate key.' },
        hints: [
          `<p>Hint 1: a column is unique across the table exactly when <code>COUNT(DISTINCT col) = COUNT(*)</code> — but COUNT(DISTINCT) ignores NULLs, so count NULLs separately with <code>SUM(col IS NULL)</code>.</p>`,
          `<p>Hint 2: build one small SELECT per column and glue them with <code>UNION ALL</code>. A <code>CASE</code> expression turns the numbers into a verdict.</p>`,
          `<p>Hint 3: for the pair, count distinct pairs with a subquery: <code>SELECT COUNT(*) FROM (SELECT DISTINCT full_name, city FROM signups)</code>. Recipe: stats CTE → per-column rows → CASE verdict.</p>`
        ],
        tests: { engine: 'sqlite', cmp: 'set', cases: [
          { cols: ['col', 'distinct_values', 'nulls', 'total_rows', 'verdict'], rows: [['email', 8, 0, 8, 'candidate key'], ['username', 8, 0, 8, 'candidate key'], ['phone', 6, 2, 8, 'unique but has NULLs'], ['full_name', 6, 0, 8, 'not unique'], ['city', 5, 0, 8, 'not unique'], ['(full_name, city)', 7, 0, 8, 'not unique']] },
          { setup: 'DELETE FROM signups;', cols: ['col', 'distinct_values', 'nulls', 'total_rows', 'verdict'], rows: [['email', 0, 0, 0, 'candidate key'], ['username', 0, 0, 0, 'candidate key'], ['phone', 0, 0, 0, 'candidate key'], ['full_name', 0, 0, 0, 'candidate key'], ['city', 0, 0, 0, 'candidate key'], ['(full_name, city)', 0, 0, 0, 'candidate key']] },
          { setup: 'DELETE FROM signups WHERE username <> \'sam1\';', cols: ['col', 'distinct_values', 'nulls', 'total_rows', 'verdict'], rows: [['email', 1, 0, 1, 'candidate key'], ['username', 1, 0, 1, 'candidate key'], ['phone', 1, 0, 1, 'candidate key'], ['full_name', 1, 0, 1, 'candidate key'], ['city', 1, 0, 1, 'candidate key'], ['(full_name, city)', 1, 0, 1, 'candidate key']] },
          { setup: 'UPDATE signups SET phone = NULL;', cols: ['col', 'distinct_values', 'nulls', 'total_rows', 'verdict'], rows: [['email', 8, 0, 8, 'candidate key'], ['username', 8, 0, 8, 'candidate key'], ['phone', 0, 8, 8, 'unique but has NULLs'], ['full_name', 6, 0, 8, 'not unique'], ['city', 5, 0, 8, 'not unique'], ['(full_name, city)', 7, 0, 8, 'not unique']] },
          { setup: 'UPDATE signups SET email = \'asha@mail.com\' WHERE username = \'sam2\';', cols: ['col', 'distinct_values', 'nulls', 'total_rows', 'verdict'], rows: [['email', 7, 0, 8, 'not unique'], ['username', 8, 0, 8, 'candidate key'], ['phone', 6, 2, 8, 'unique but has NULLs'], ['full_name', 6, 0, 8, 'not unique'], ['city', 5, 0, 8, 'not unique'], ['(full_name, city)', 7, 0, 8, 'not unique']] },
          { setup: 'UPDATE signups SET full_name = \'Sam Park 2\' WHERE username = \'sam2\';', cols: ['col', 'distinct_values', 'nulls', 'total_rows', 'verdict'], rows: [['email', 8, 0, 8, 'candidate key'], ['username', 8, 0, 8, 'candidate key'], ['phone', 6, 2, 8, 'unique but has NULLs'], ['full_name', 7, 0, 8, 'not unique'], ['city', 5, 0, 8, 'not unique'], ['(full_name, city)', 8, 0, 8, 'candidate key']] },
          { setup: 'UPDATE signups SET city = NULL WHERE username = \'sam2\';', cols: ['col', 'distinct_values', 'nulls', 'total_rows', 'verdict'], rows: [['email', 8, 0, 8, 'candidate key'], ['username', 8, 0, 8, 'candidate key'], ['phone', 6, 2, 8, 'unique but has NULLs'], ['full_name', 6, 0, 8, 'not unique'], ['city', 5, 1, 8, 'not unique'], ['(full_name, city)', 7, 1, 8, 'unique but has NULLs']] },
          { setup: 'UPDATE signups SET username = NULL WHERE username IN (\'sam1\', \'sam2\'); UPDATE signups SET email = NULL WHERE username = \'chenw\';', cols: ['col', 'distinct_values', 'nulls', 'total_rows', 'verdict'], rows: [['email', 7, 1, 8, 'unique but has NULLs'], ['username', 6, 2, 8, 'unique but has NULLs'], ['phone', 6, 2, 8, 'unique but has NULLs'], ['full_name', 6, 0, 8, 'not unique'], ['city', 5, 0, 8, 'not unique'], ['(full_name, city)', 7, 0, 8, 'not unique']] }
        ] },
        solution: {
          approach: `<p>Profile each column: total rows, distinct non-NULL values, NULL count. Verdict: distinct = total and nulls = 0 → candidate key; distinct + nulls = total with nulls &gt; 0 → unique but nullable (fit for UNIQUE, not PK); otherwise not unique. A CTE (<code>WITH</code>) holds the raw numbers so the verdict logic is written once.</p>`,
          code: { lang: 'sql', db: 'shop', code: `WITH stats AS (
  SELECT 'email' AS col, COUNT(DISTINCT email) AS d, COUNT(*) - COUNT(email) AS n, COUNT(*) AS total FROM signups
  UNION ALL
  SELECT 'username', COUNT(DISTINCT username), COUNT(*) - COUNT(username), COUNT(*) FROM signups
  UNION ALL
  SELECT 'phone', COUNT(DISTINCT phone), COUNT(*) - COUNT(phone), COUNT(*) FROM signups
  UNION ALL
  SELECT 'full_name', COUNT(DISTINCT full_name), COUNT(*) - COUNT(full_name), COUNT(*) FROM signups
  UNION ALL
  SELECT 'city', COUNT(DISTINCT city), COUNT(*) - COUNT(city), COUNT(*) FROM signups
  UNION ALL
  SELECT '(full_name, city)',
         (SELECT COUNT(*) FROM (SELECT DISTINCT full_name, city FROM signups
                                WHERE full_name IS NOT NULL AND city IS NOT NULL)),
         COUNT(*) - COUNT(CASE WHEN full_name IS NOT NULL AND city IS NOT NULL THEN 1 END), COUNT(*) FROM signups
)
SELECT col,
       d     AS distinct_values,
       n     AS nulls,
       total AS total_rows,
       CASE
         WHEN d = total AND n = 0 THEN 'candidate key'
         WHEN d + n = total        THEN 'unique but has NULLs'
         ELSE 'not unique'
       END AS verdict
FROM stats;` },
          complexity: `<p>Each COUNT(DISTINCT) is a sort or hash over N rows: O(N log N) or O(N) per column. For k columns that is k passes; a real profiler does it in one pass with hash sets or HyperLogLog sketches for approximate counts on billions of rows.</p>`,
          followUps: ['After choosing email as an alternate key, write the CREATE TABLE you would replace signups with.', 'Why is "candidate key by data" only evidence, not proof?', 'How would you detect near-duplicates such as "Asha Verma" vs "asha verma "?']
        }
      }
    ]
  });

  /* ======================================================================
     TOPIC 4 — Foreign keys & referential integrity
     ====================================================================== */
  topics.push({
    title: 'Foreign Keys & Referential Integrity',
    analogy: `<p>A <b>cinema ticket</b> says <i>"Screen 4, Seat F12"</i>. The ticket does not contain the seat; it <b>points</b> to a seat that must really exist. A ticket for "Screen 9" in a cinema with 6 screens is worthless — a <b>dangling reference</b>. And if the cinema demolishes Screen 4, it must decide what happens to the tickets: refuse to demolish while tickets are sold (<b>RESTRICT</b>), cancel all those tickets too (<b>CASCADE</b>), or keep the tickets but mark the seat "to be assigned" (<b>SET NULL</b>).</p>
<p>A <b>foreign key</b> is that ticket: a value in one table that must match a key in another table.</p>`,
    explain: `<p>A <b>foreign key (FK)</b> is a column (or columns) in a <b>child</b> table whose values must match the <b>primary key</b> (or a UNIQUE key) of a <b>parent</b> table. It is how the relational model links tables using plain values instead of pointers.</p>
${H.table(['Child (referencing) table', 'FK column', '→', 'Parent (referenced) table', 'Key column'], [
  ['<code>students</code>', '<code>dept_id</code>', '→', '<code>departments</code>', '<code>dept_id</code>'],
  ['<code>orders</code>', '<code>customer_id</code>', '→', '<code>customers</code>', '<code>customer_id</code>'],
  ['<code>employees</code>', '<code>manager_id</code>', '→', '<code>employees</code> (itself!)', '<code>emp_id</code>']
])}
<h4>The referential integrity rule</h4>
<p>Every non-NULL FK value must exist in the parent. (A NULL FK means "not linked yet / not applicable" and is allowed unless you add NOT NULL.) The DBMS guards this rule on four kinds of change:</p>
${H.table(['Change', 'Danger', 'What the DBMS does'], [
  ['INSERT a child row', 'points at a parent that does not exist', H.c('r', 'rejects it')],
  ['UPDATE a child FK', 'moves it to a non-existent parent', H.c('r', 'rejects it')],
  ['DELETE a parent row', 'children would be orphaned', 'applies the <b>ON DELETE</b> action'],
  ['UPDATE a parent key', 'children point at the old value', 'applies the <b>ON UPDATE</b> action']
])}
<h4>Referential actions (you choose per FK)</h4>
${H.table(['Action', 'When the parent row is deleted…', 'Good for'], [
  ['<b>NO ACTION</b> (default) / <b>RESTRICT</b>', 'block the delete if children exist', 'money, orders, anything you must not lose'],
  ['<b>CASCADE</b>', 'delete the children too', 'parts that cannot live alone: order_items of an order'],
  ['<b>SET NULL</b>', 'set the children\'s FK to NULL', 'optional links: employee\'s parking spot, department of an employee'],
  ['<b>SET DEFAULT</b>', 'set the FK to its DEFAULT value', 'rare: "unassigned" bucket row']
])}
<p>(NO ACTION and RESTRICT differ only in timing: RESTRICT checks immediately, NO ACTION may wait until the end of the statement or of a <i>deferred</i> transaction.)</p>
<h4>Declaring an FK</h4>
<ul>
<li>Column style: <code>customer_id INTEGER NOT NULL REFERENCES customers(customer_id) ON DELETE RESTRICT</code></li>
<li>Table style (needed for composite FKs): <code>FOREIGN KEY (order_id, product_id) REFERENCES order_items(order_id, product_id)</code></li>
</ul>
<p><b>SQLite warning:</b> foreign keys are <i>off</i> by default for backward compatibility. Every connection must run <code>PRAGMA foreign_keys = ON;</code> (the sample databases on this page do). PostgreSQL, MySQL/InnoDB and SQL Server always enforce declared FKs.</p>`,
    clues: [
      '"orphan records" / "dangling references" → missing or disabled foreign key; find them with NOT EXISTS / LEFT JOIN … IS NULL',
      '"when a customer is deleted, what happens to their orders?" → ON DELETE RESTRICT vs CASCADE vs SET NULL',
      '"employee has a manager who is also an employee" → self-referencing foreign key',
      '"FK can reference which columns?" → a PRIMARY KEY or UNIQUE column of the parent',
      '"bulk load is slow" / "load tables in any order" → disable or defer FK checks, then validate (foreign_key_check)',
      '"Can a foreign key be NULL?" → yes, unless declared NOT NULL; NULL means "no link"'
    ],
    code: [
      { lang: 'sql', db: 'shop', title: 'See every FK the shop declares (catalogue)', code: `-- One row per FK column: child table, child column, parent table, parent column, actions
SELECT 'orders' AS child, "from" AS child_col, "table" AS parent, "to" AS parent_col, on_delete
FROM pragma_foreign_key_list('orders')
UNION ALL
SELECT 'order_items', "from", "table", "to", on_delete FROM pragma_foreign_key_list('order_items')
UNION ALL
SELECT 'loyalty_cards', "from", "table", "to", on_delete FROM pragma_foreign_key_list('loyalty_cards');

PRAGMA foreign_keys;   -- 1 = enforcement is ON for this connection` },
      { lang: 'sql', db: 'shop', title: 'CASCADE in action', code: `-- order_items.order_id is declared ON DELETE CASCADE
SELECT COUNT(*) AS items_of_1005_before FROM order_items WHERE order_id = 1005;
DELETE FROM orders WHERE order_id = 1005;          -- delete the parent ...
SELECT COUNT(*) AS items_of_1005_after FROM order_items WHERE order_id = 1005;  -- ... children gone too` }
    ],
    codeTitle: ['FK catalogue', 'ON DELETE CASCADE'],
    viz: {
      title: 'Referential integrity guard: inserts, moves and deletes',
      input: 'CASCADE | insert 8 Kofi 30 | insert 9 Omar 99 | insert 10 Yuki null | move 2 20 | delete 30',
      inputLabel: 'MODE (RESTRICT / CASCADE / SET NULL) | insert id name dept | move id dept | delete dept',
      gen: function (input) {
        var parts = String(input || '').split('|').map(function (s) { return s.trim(); }).filter(Boolean);
        if (!parts.length) throw new Error('Start with a mode: RESTRICT, CASCADE or SET NULL');
        var mode = parts[0].toUpperCase().replace(/\s+/g, ' ');
        if (['RESTRICT', 'CASCADE', 'SET NULL'].indexOf(mode) < 0) throw new Error('First item must be RESTRICT, CASCADE or SET NULL');
        if (parts.length > 13) throw new Error('Use at most 12 operations');
        var depts = [[10, 'Engineering'], [20, 'Sales'], [30, 'Finance']];
        var emps = [[1, 'Meera', 10], [2, 'Tom', 10], [5, 'Priya', 20], [7, 'Ana', 30]];
        var frames = [];
        function dExists(d) { return depts.some(function (x) { return x[0] === d; }); }
        function graph(hlN, ehl) {
          var nodes = [], edges = [];
          depts.forEach(function (d, i) { nodes.push({ id: 'd' + d[0], label: d[0] + ' ' + d[1], x: 18, y: 10 + i * 16, shape: 'box' }); });
          emps.forEach(function (e, i) { nodes.push({ id: 'e' + e[0], label: e[0] + ' ' + e[1], x: 78, y: 6 + i * 10, shape: 'box' }); if (e[2] !== null) edges.push(['e' + e[0], 'd' + e[2], 'dept_id']); });
          return { type: 'graph', label: 'employees.dept_id → departments.dept_id', directed: true, height: Math.max(60, 12 + emps.length * 10), nodes: nodes, edges: edges, hl: hlN || {}, ehl: ehl || {} };
        }
        function tables(hd, he) {
          return [{ type: 'table', label: 'departments (parent)', columns: ['dept_id', 'name'], rows: depts.map(function (d) { return d.slice(); }), hl: hd || {} },
                  { type: 'table', label: 'employees (child) — ON DELETE ' + mode, columns: ['emp_id', 'name', 'dept_id'], rows: emps.map(function (e) { return [e[0], e[1], e[2] === null ? 'NULL' : e[2]]; }), hl: he || {} }];
        }
        frames.push({ narr: 'Parent <b>departments</b>, child <b>employees</b>. Every arrow is a foreign-key value pointing at a real parent row. The FK is declared <code>ON DELETE ' + mode + '</code>. Let us throw changes at it.', parts: [graph()].concat(tables()) });
        for (var i = 1; i < parts.length; i++) {
          var t = parts[i].split(/\s+/), op = (t[0] || '').toLowerCase();
          if (op === 'insert') {
            var id = parseInt(t[1], 10), nm = t[2] || 'X', dv = (t[3] || 'null').toLowerCase(), d = dv === 'null' ? null : parseInt(dv, 10);
            if (isNaN(id) || (d !== null && isNaN(d))) throw new Error('insert needs: insert <id> <name> <dept or null>');
            if (emps.some(function (e) { return e[0] === id; })) { frames.push({ narr: 'INSERT employee ' + id + ': <span class="c-r">rejected</span> — emp_id ' + id + ' already exists (primary key violation, not FK).', parts: [graph()].concat(tables()) }); continue; }
            if (d !== null && !dExists(d)) {
              var hn = {}; hn['e' + id] = 'bad';
              frames.push({ narr: 'INSERT (' + id + ', ' + H.esc(nm) + ', dept ' + d + '): department <b>' + d + '</b> does not exist in the parent table → <span class="c-r">FOREIGN KEY constraint failed</span>. The orphan never gets in. This is the main job of an FK.', parts: [graph(), { type: 'text', label: 'Rejected', html: '<span class="c-r">(' + id + ', ' + H.esc(nm) + ', ' + d + ') → no parent row with dept_id = ' + d + '</span>' }].concat(tables()) });
              continue;
            }
            emps.push([id, nm, d]);
            var hl1 = {}; hl1['e' + id] = 'ok'; var eh = {}; if (d !== null) eh['e' + id + '-d' + d] = 'ok';
            var he1 = {}; he1[emps.length - 1] = 'ok';
            frames.push({ narr: 'INSERT (' + id + ', ' + H.esc(nm) + ', ' + (d === null ? 'NULL' : d) + '): ' + (d === null ? 'a <b>NULL</b> FK means "not linked to any department yet" — allowed, because the column is not declared NOT NULL.' : 'parent ' + d + ' exists → <span class="c-g">accepted</span>.'), parts: [graph(hl1, eh)].concat(tables({}, he1)) });
          } else if (op === 'move') {
            var mid = parseInt(t[1], 10), md = (t[2] || '').toLowerCase() === 'null' ? null : parseInt(t[2], 10);
            var idx = -1; emps.forEach(function (e, k) { if (e[0] === mid) idx = k; });
            if (idx < 0) throw new Error('move: no employee with id ' + t[1]);
            if (md !== null && (isNaN(md) || !dExists(md))) { frames.push({ narr: 'UPDATE employee ' + mid + ' SET dept_id = ' + H.esc(t[2]) + ': no such department → <span class="c-r">rejected</span>. Updates of the child FK are checked just like inserts.', parts: [graph()].concat(tables()) }); continue; }
            emps[idx][2] = md;
            var hl2 = {}; hl2['e' + mid] = 'cur'; var eh2 = {}; if (md !== null) eh2['e' + mid + '-d' + md] = 'cur'; var he2 = {}; he2[idx] = 'cur';
            frames.push({ narr: 'UPDATE employee ' + mid + ' SET dept_id = ' + (md === null ? 'NULL' : md) + ': the new parent exists → <span class="c-g">allowed</span>. The arrow simply points somewhere else.', parts: [graph(hl2, eh2)].concat(tables({}, he2)) });
          } else if (op === 'delete') {
            var dd = parseInt(t[1], 10), di = -1;
            depts.forEach(function (x, k) { if (x[0] === dd) di = k; });
            if (di < 0) { frames.push({ narr: 'DELETE department ' + H.esc(t[1] || '?') + ': no such row, nothing happens (0 rows affected).', parts: [graph()].concat(tables()) }); continue; }
            var kids = []; emps.forEach(function (e, k) { if (e[2] === dd) kids.push(k); });
            var hd = {}; hd[di] = 'bad'; var hek = {}; kids.forEach(function (k) { hek[k] = 'cur'; });
            var hln = {}; hln['d' + dd] = 'bad'; kids.forEach(function (k) { hln['e' + emps[k][0]] = 'cur'; });
            if (!kids.length) { depts.splice(di, 1); frames.push({ narr: 'DELETE department ' + dd + ': no employee points at it, so there is nothing to protect — it is deleted under every mode.', parts: [graph()].concat(tables()) }); continue; }
            frames.push({ narr: 'DELETE department ' + dd + ': it has <b>' + kids.length + '</b> child row(s) pointing at it. Deleting it blindly would leave them as <b>orphans</b>. The FK action <b>' + mode + '</b> decides…', parts: [graph(hln)].concat(tables(hd, hek)) });
            if (mode === 'RESTRICT') {
              frames.push({ narr: '<b>RESTRICT</b>: <span class="c-r">delete refused</span> ("FOREIGN KEY constraint failed"). You must first move or delete the employees yourself. Safest choice for important data. (Try CASCADE or SET NULL as the mode to compare.)', parts: [graph(hln)].concat(tables(hd, hek)) });
            } else if (mode === 'CASCADE') {
              var gone = kids.map(function (k) { return emps[k][1]; });
              emps = emps.filter(function (e) { return e[2] !== dd; }); depts.splice(di, 1);
              frames.push({ narr: '<b>CASCADE</b>: the department <i>and</i> its ' + kids.length + ' employee row(s) (' + H.esc(gone.join(', ')) + ') are deleted in the same statement. Convenient for true "parts" (order lines), <span class="c-r">dangerous</span> for people or money — one DELETE can wipe thousands of rows. (Try RESTRICT or SET NULL.)', parts: [graph()].concat(tables()) });
            } else {
              kids.forEach(function (k) { emps[k][2] = null; }); depts.splice(di, 1);
              var hk = {}; kids.forEach(function (k) { hk[k] = 'cur'; });
              frames.push({ narr: '<b>SET NULL</b>: the department is deleted and its employees stay, with <code>dept_id = NULL</code> ("currently in no department"). Their arrows disappear. Works only if the FK column allows NULL. (Try RESTRICT or CASCADE.)', parts: [graph()].concat(tables({}, hk)) });
            }
          } else throw new Error('Unknown operation "' + t[0] + '": use insert / move / delete');
        }
        frames.push({ narr: 'Final state: every non-NULL <code>dept_id</code> still points at an existing department. That invariant — <b>no orphans, ever</b> — is <b>referential integrity</b>, and the DBMS enforced it for every single change.', parts: [graph()].concat(tables()) });
        return frames;
      }
    },
    examples: [
      {
        title: 'The error you get for an orphan (and how to check first)',
        html: `<p>Try in the playground: <code>INSERT INTO orders VALUES (2000, 99, '2026-04-01', 'placed');</code> → <span class="c-r">FOREIGN KEY constraint failed</span>, because customer 99 does not exist. Applications usually avoid the error by checking or by catching it. The runnable query shows the "check first" idea with <code>EXISTS</code> — but remember the FK is the real guard; app checks can race with other users.</p>`,
        code: { lang: 'sql', db: 'shop', code: `-- Does the parent exist? 1 = yes, 0 = no
SELECT EXISTS (SELECT 1 FROM customers WHERE customer_id = 99) AS customer_99_exists,
       EXISTS (SELECT 1 FROM customers WHERE customer_id = 2)  AS customer_2_exists;

-- Safe insert: only inserts if the parent exists (0 rows otherwise, no error)
INSERT INTO orders (order_id, customer_id, order_date)
SELECT 2000, 99, '2026-04-01'
WHERE EXISTS (SELECT 1 FROM customers WHERE customer_id = 99);

SELECT COUNT(*) AS order_2000_rows FROM orders WHERE order_id = 2000;   -- 0` }
      },
      {
        title: 'RESTRICT protects order history; which customers can be deleted?',
        html: `<p><code>orders.customer_id</code> is <code>ON DELETE RESTRICT</code>: <code>DELETE FROM customers WHERE customer_id = 1</code> fails because Asha has orders. Chen (id 3) has no orders, so he can be deleted — and his loyalty card (if any) would CASCADE. ${H.table(['customer', 'orders', 'deletable?'], [['Asha (1)', '2', H.c('r', 'no — RESTRICT')], ['Chen (3)', '0', H.c('g', 'yes')]])}</p>`,
        code: { lang: 'sql', db: 'shop', code: `-- Customers with no orders = safe to delete under RESTRICT
SELECT c.customer_id, c.name
FROM customers c
WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.customer_id);

DELETE FROM customers WHERE customer_id = 3;      -- succeeds (no children)
SELECT COUNT(*) AS customers_left FROM customers;  -- 4` }
      },
      {
        title: 'SET NULL and CASCADE on the same delete (company)',
        html: `<p>Sara (employee 3) leaves. <code>parking_spots.emp_id</code> is <b>SET NULL</b> → her spot P2-01 becomes free. <code>assignments.emp_id</code> is <b>CASCADE</b> → her project assignment disappears. One DELETE, two different, intentional behaviours. (Deleting Ana, id 7, would fail: she is Kofi's manager, and <code>manager_id</code> has the default NO ACTION.)</p>`,
        code: { lang: 'sql', db: 'company', code: `DELETE FROM employees WHERE emp_id = 3;

SELECT spot_no, emp_id FROM parking_spots WHERE spot_no = 'P2-01';   -- emp_id is now NULL
SELECT COUNT(*) AS saras_assignments FROM assignments WHERE emp_id = 3;  -- 0` }
      },
      {
        title: 'Self-referencing FK: who reports to whom',
        html: `<p><code>employees.manager_id REFERENCES employees(emp_id)</code>. The parent and the child are the same table. Top bosses have <code>manager_id = NULL</code>. Join the table to itself (with two aliases) to print each employee next to their manager.</p>`,
        code: { lang: 'sql', db: 'company', code: `SELECT e.name AS employee,
       COALESCE(m.name, '(no manager)') AS manager
FROM employees e
LEFT JOIN employees m ON m.emp_id = e.manager_id
ORDER BY manager, employee;` }
      }
    ],
    deepDive: `<h4>FKs in the real world</h4>
<ul>
<li><b>Index the FK column.</b> PostgreSQL and SQLite do <i>not</i> auto-index the child FK column (MySQL InnoDB does). Without it, every DELETE on the parent must scan the whole child table to look for children — a classic cause of "deleting one customer takes 40 seconds" and of lock pile-ups.</li>
<li><b>What an FK may reference.</b> Only a PRIMARY KEY or UNIQUE column set of the parent, with compatible types. Composite FKs must reference the full composite key, in order.</li>
<li><b>NULL in composite FKs.</b> With the default MATCH SIMPLE, if <i>any</i> column of a composite FK is NULL, the whole FK is not checked. MATCH FULL demands all-NULL or all-non-NULL.</li>
<li><b>Deferred constraints.</b> <code>DEFERRABLE INITIALLY DEFERRED</code> postpones the check until COMMIT, so you can insert two rows that reference each other (circular references) or reorder a bulk load. SQLite supports this too.</li>
<li><b>Bulk loads.</b> Loading millions of rows with FK checks on is slower; a common pattern is: disable / defer → load → validate (<code>PRAGMA foreign_key_check</code> in SQLite, <code>ALTER TABLE … VALIDATE CONSTRAINT</code> after <code>NOT VALID</code> in PostgreSQL) → enable.</li>
<li><b>Microservices and sharding.</b> FKs only work inside one database. When customers live in one service and orders in another (or tables are sharded across machines), referential integrity becomes an application concern: soft references by id, events, periodic orphan-reconciliation jobs. Many large companies (and tools like Vitess/PlanetScale historically) run without DB-level FKs for this reason — and pay for it with orphan clean-up jobs.</li>
<li><b>CASCADE blast radius.</b> Chains of CASCADE (customer → orders → order_items → shipments) can delete a huge amount of data from one statement and hold locks the whole time. Many teams prefer soft deletes (<code>deleted_at</code>) for business entities and reserve CASCADE for pure child "parts".</li>
</ul>`,
    aiEra: `<p><b>What AI changes:</b> assistants and ORMs (Prisma, Django, Rails, SQLAlchemy) generate FK declarations from model relationships automatically, and migration tools can propose missing FKs by spotting <code>*_id</code> columns.</p>
<p><b>Use AI as a partner:</b> <code>For each FK in this schema, recommend RESTRICT, CASCADE or SET NULL and justify it in one line.</code> or <code>Write an orphan-audit query for every *_id column in these tables.</code> These are fast, checkable outputs.</p>
<p><b>Where AI goes wrong:</b> it defaults to <code>ON DELETE CASCADE</code> everywhere (one click deletes a customer's entire purchase history), forgets that SQLite needs <code>PRAGMA foreign_keys = ON</code>, forgets to index FK columns, and sometimes references a non-unique column.</p>
<p><b>What you must still own:</b> the delete semantics of your business ("can an invoice ever disappear?"), and the decision of where integrity lives when data spans services.</p>`,
    problems: [
      {
        title: 'Audit a Bad Import: Find the Orphans',
        level: 'Medium', tags: ['foreign key', 'referential integrity', 'NOT EXISTS'], companies: ['Amazon', 'Atlassian', 'Infosys'],
        statement: `<p>An intern loaded extra enrolments with foreign keys switched <b>off</b>. Some rows point at students or courses that do not exist. Run the given import, then confirm with the DBMS's own checker, and finish by listing every orphan enrolment and saying which reference is broken.</p>`,
        constraints: `Use <code>db: school</code>. The import is: <code>PRAGMA foreign_keys = OFF; INSERT INTO enrollments VALUES (99,'CS101','2025-SPRING',NULL),(2,'XX999','2025-SPRING',NULL),(98,'ZZ000','2025-SPRING',NULL);</code>. Output <code>student_id, course_id, problem</code>, ordered by <code>student_id, course_id</code>; the orphan list must be the last result.`,
        example: `${H.table(['student_id', 'course_id', 'problem'], [['2', 'XX999', H.c('r', 'missing course')], ['98', 'ZZ000', H.c('r', 'missing student + course')], ['99', 'CS101', H.c('r', 'missing student')]])}<p>Valid rows (all 14 originals) do not appear — each points at a real student and a real course.</p>`,
        brute: {
          why: `<p>Comparing two counts tells you <i>that</i> something is wrong (17 enrolments, only 14 join cleanly) but not <i>which</i> rows or <i>why</i>. You would still have to eyeball 17 rows — impossible at 17 million.</p>`,
          code: { lang: 'sql', db: 'school', code: `PRAGMA foreign_keys = OFF;
INSERT INTO enrollments VALUES (99,'CS101','2025-SPRING',NULL),(2,'XX999','2025-SPRING',NULL),(98,'ZZ000','2025-SPRING',NULL);

-- Counts only: "3 rows are broken" ... but which ones?
SELECT (SELECT COUNT(*) FROM enrollments) AS all_rows,
       (SELECT COUNT(*) FROM enrollments e
          JOIN students s ON s.student_id = e.student_id
          JOIN courses  c ON c.course_id  = e.course_id) AS clean_rows;` }
        },
        mcq: { q: 'Which pattern returns child rows whose parent is missing?', options: ['<code>WHERE NOT EXISTS (SELECT 1 FROM parent p WHERE p.id = child.parent_id)</code>', '<code>INNER JOIN parent ON …</code>', '<code>WHERE parent_id IS NULL</code>', '<code>SELECT DISTINCT parent_id</code>'], answer: 0, explain: 'NOT EXISTS (an anti-join) keeps child rows with no matching parent. INNER JOIN does the opposite — it drops them.' },
        hints: [
          `<p>Hint 1: an orphan is a child row for which <b>no</b> parent row exists. SQL has a direct way to say "no row exists": <code>NOT EXISTS (subquery)</code>.</p>`,
          `<p>Hint 2: test the two references separately: student missing? course missing? Combine with <code>OR</code> in WHERE, and build the label with a <code>CASE</code>.</p>`,
          `<p>Hint 3: SQLite can do the audit for you: <code>SELECT * FROM pragma_foreign_key_check('enrollments')</code> lists every violating rowid and the parent table. Recipe: import → anti-join report → built-in check → (fix) → re-check returns nothing.</p>`
        ],
        tests: { engine: 'sqlite', cases: [
          { cols: ['student_id', 'course_id', 'problem'], rows: [[2, 'XX999', 'missing course'], [98, 'ZZ000', 'missing student + course'], [99, 'CS101', 'missing student']] },
          { setup: 'PRAGMA foreign_keys = OFF; DELETE FROM students WHERE student_id = 6;', cols: ['student_id', 'course_id', 'problem'], rows: [[2, 'XX999', 'missing course'], [6, 'MA201', 'missing student'], [98, 'ZZ000', 'missing student + course'], [99, 'CS101', 'missing student']] },
          { setup: 'PRAGMA foreign_keys = OFF; DELETE FROM courses WHERE course_id = \'PH101\';', cols: ['student_id', 'course_id', 'problem'], rows: [[2, 'XX999', 'missing course'], [4, 'PH101', 'missing course'], [98, 'ZZ000', 'missing student + course'], [99, 'CS101', 'missing student']] },
          { setup: 'PRAGMA foreign_keys = OFF; DELETE FROM students WHERE student_id = 8; DELETE FROM courses WHERE course_id = \'HI101\';', cols: ['student_id', 'course_id', 'problem'], rows: [[2, 'XX999', 'missing course'], [8, 'CS101', 'missing student'], [8, 'HI101', 'missing student + course'], [98, 'ZZ000', 'missing student + course'], [99, 'CS101', 'missing student']] },
          { setup: 'INSERT INTO students (student_id, roll_no, name, joined_on) VALUES (99, \'R2099-1\', \'Late\', \'2025-01-01\'); INSERT INTO courses (course_id, title, credits, dept_id) VALUES (\'XX999\', \'Extra\', 3, 1);', cols: ['student_id', 'course_id', 'problem'], rows: [[98, 'ZZ000', 'missing student + course']] },
          { setup: 'DELETE FROM enrollments;', cols: ['student_id', 'course_id', 'problem'], rows: [[2, 'XX999', 'missing course'], [98, 'ZZ000', 'missing student + course'], [99, 'CS101', 'missing student']] },
          { setup: 'PRAGMA foreign_keys = OFF; DELETE FROM students WHERE student_id = 2;', cols: ['student_id', 'course_id', 'problem'], rows: [[2, 'MA101', 'missing student'], [2, 'MA201', 'missing student'], [2, 'XX999', 'missing student + course'], [98, 'ZZ000', 'missing student + course'], [99, 'CS101', 'missing student']] }
        ] },
        solution: {
          approach: `<p>Use an <b>anti-join</b>: for each enrolment, ask "does a matching student exist? does a matching course exist?" with <code>EXISTS</code>. Keep rows where either answer is no, and label which one. Cross-check with <code>pragma_foreign_key_check</code>, which uses the declared FKs. The orphan list is the final query, so the clean-up (shown in a comment) is something you run after reading it.</p>`,
          code: { lang: 'sql', db: 'school', code: `PRAGMA foreign_keys = OFF;   -- simulate the bad import
INSERT INTO enrollments VALUES (99,'CS101','2025-SPRING',NULL),(2,'XX999','2025-SPRING',NULL),(98,'ZZ000','2025-SPRING',NULL);

-- 1) The DBMS's own checker (uses the declared FOREIGN KEYs)
SELECT "table", rowid, parent FROM pragma_foreign_key_check('enrollments');

-- 2) Our own audit: which reference is broken?
SELECT e.student_id, e.course_id,
       CASE
         WHEN NOT EXISTS (SELECT 1 FROM students s WHERE s.student_id = e.student_id)
          AND NOT EXISTS (SELECT 1 FROM courses  c WHERE c.course_id  = e.course_id) THEN 'missing student + course'
         WHEN NOT EXISTS (SELECT 1 FROM students s WHERE s.student_id = e.student_id) THEN 'missing student'
         ELSE 'missing course'
       END AS problem
FROM enrollments e
WHERE NOT EXISTS (SELECT 1 FROM students s WHERE s.student_id = e.student_id)
   OR NOT EXISTS (SELECT 1 FROM courses  c WHERE c.course_id  = e.course_id)
ORDER BY e.student_id, e.course_id;

-- 3) After reading the report, clean up atomically and turn enforcement back on:
--    BEGIN;
--    DELETE FROM enrollments
--    WHERE NOT EXISTS (SELECT 1 FROM students s WHERE s.student_id = enrollments.student_id)
--       OR NOT EXISTS (SELECT 1 FROM courses  c WHERE c.course_id  = enrollments.course_id);
--    COMMIT;
--    PRAGMA foreign_keys = ON;
--    SELECT COUNT(*) AS violations_left FROM pragma_foreign_key_check('enrollments');   -- 0` },
          complexity: `<p>With an index on the parent keys (they are PKs, so they have one) each EXISTS is an O(log P) lookup: O(C log P) for C child rows. Without parent indexes it would be O(C × P). Note the FK checker reports each broken <i>reference</i>, so row 98 appears twice there.</p>`,
          followUps: ['Instead of deleting, move orphans into an <code>enrollments_quarantine</code> table for review.', 'Why is <code>NOT IN</code> dangerous if the subquery column can contain NULL?', 'How would you run this audit across two microservices that own students and enrolments separately?']
        }
      }
    ]
  });

  /* ======================================================================
     TOPIC 5 — Relationships: 1-1, 1-N, N-N
     ====================================================================== */
  topics.push({
    title: 'Relationships: One-to-One, One-to-Many, Many-to-Many',
    analogy: `<p>Think about a family and a town:</p>
<ul>
<li><b>One-to-one</b>: a person and their <b>passport</b>. One person has at most one valid passport; one passport belongs to exactly one person.</li>
<li><b>One-to-many</b>: a <b>mother and her children</b>. A mother can have many children; each child has exactly one (biological) mother.</li>
<li><b>Many-to-many</b>: <b>students and clubs</b>. A student can join many clubs; a club has many students. To record it, the school keeps a <b>membership list</b> — a separate sheet with one line per (student, club) pair. That sheet is the <b>junction table</b>.</li>
</ul>`,
    explain: `<p>A <b>relationship</b> says how rows of one table are connected to rows of another. Its <b>cardinality</b> answers: <i>"For one row on this side, how many rows can there be on the other side?"</i> The answer decides <b>where the foreign key goes</b>.</p>
${H.table(['Type', 'Read it as', 'School example', 'How to build it in tables'], [
  ['<b>1 : 1</b>', 'one A ↔ at most one B', 'student ↔ ID card', 'FK in one table + <b>UNIQUE</b> on that FK (or share the same PK)'],
  ['<b>1 : N</b>', 'one A → many B; each B → one A', 'department → students', 'FK on the <b>many</b> side (<code>students.dept_id</code>)'],
  ['<b>N : M</b>', 'many A ↔ many B', 'students ↔ courses', 'a new <b>junction table</b> with two FKs; PK = the pair']
])}
<h4>The "ask both directions" trick</h4>
<p>Always ask the question twice:</p>
<ol>
<li>"Can one <b>department</b> have many <b>students</b>?" → yes. "Can one <b>student</b> have many <b>departments</b>?" → no (in our school). One <i>yes</i> + one <i>no</i> = <b>1 : N</b>.</li>
<li>"Can one student take many courses?" → yes. "Can one course have many students?" → yes. Two yeses = <b>N : M</b>.</li>
<li>"Can one student have many ID cards?" → no. "Can one card belong to many students?" → no. Two noes = <b>1 : 1</b>.</li>
</ol>
<h4>Why the FK goes on the "many" side</h4>
<p>Each student has exactly one department, so one cell <code>students.dept_id</code> holds it — atomic and simple. If you put it the other way (<code>departments.student_ids = '1,3,5'</code>) you break the atomic-cell rule, cannot index or FK-check it, and every new student rewrites the department row.</p>
<h4>Why N : M needs its own table</h4>
<p>Neither side can hold the link in a single cell — a student has many courses <i>and</i> a course has many students. So the relationship becomes a table of pairs:</p>
${H.table(['student_id (FK)', 'course_id (FK)', 'grade'], [['1', 'CS101', 'A'], ['1', 'MA101', 'B'], ['2', 'MA101', 'A']])}
<p>Its primary key is <code>(student_id, course_id)</code> — the same pair cannot be recorded twice. Facts that belong to the <b>pair</b> (grade, semester, quantity, role, hours) live here too; they belong to neither side alone.</p>
<h4>Participation: optional vs mandatory</h4>
<p>Cardinality says "how many at most"; <b>participation</b> says "at least zero or at least one". "Every order <i>must</i> have a customer" → FK is <code>NOT NULL</code> (mandatory). "A student <i>may</i> have an ID card" → the card table simply has no row for some students (optional). In ER diagrams this is the 0 or | next to the crow's foot: <code>|o—&lt;</code> means "zero or many".</p>`,
    clues: [
      '"each X can have many Y, but each Y belongs to one X" → 1 : N → FK on Y',
      '"many-to-many" / "a student can enrol in many courses and a course has many students" → junction (bridge / associative) table',
      '"store the date / quantity / role of the link" → attribute of the relationship → column on the junction table',
      '"at most one" on both sides → 1 : 1 → FK + UNIQUE, or shared primary key',
      '"comma-separated ids in a column" → hidden N : M → split into a junction table',
      '"employee manages employees", "course has prerequisite courses" → recursive (self) relationship'
    ],
    code: [
      { lang: 'sql', db: 'school', title: 'All three relationship types in one query session', code: `-- 1 : N  department -> students   (FK students.dept_id)
SELECT d.name AS department, COUNT(s.student_id) AS students
FROM departments d LEFT JOIN students s ON s.dept_id = d.dept_id
GROUP BY d.dept_id, d.name ORDER BY students DESC;

-- 1 : 1  student <-> ID card   (FK id_cards.student_id is UNIQUE)
SELECT s.name, c.card_no
FROM students s LEFT JOIN id_cards c ON c.student_id = s.student_id
ORDER BY s.student_id;

-- N : M  students <-> courses   (junction table enrollments)
SELECT s.name, group_concat(e.course_id, ', ') AS courses
FROM students s JOIN enrollments e ON e.student_id = s.student_id
GROUP BY s.student_id, s.name ORDER BY s.student_id;` }
    ],
    codeTitle: ['1:N, 1:1 and N:M side by side'],
    viz: {
      title: 'Draw the relationship, then turn it into tables',
      input: 'N-N',
      inputLabel: 'Relationship type: 1-1, 1-N or N-N',
      gen: function (input) {
        var kind = String(input || '').trim().toUpperCase().replace(/\s/g, '').replace(':', '-').replace('M', 'N');
        if (kind === 'N-N' || kind === 'NN') kind = 'N-N';
        if (['1-1', '1-N', 'N-N'].indexOf(kind) < 0) throw new Error('Type 1-1, 1-N or N-N');
        var L, R, links, lname, rname, frames = [];
        if (kind === '1-1') { lname = 'students'; rname = 'id_cards'; L = ['Asha', 'Ben', 'Chen', 'Diya']; R = ['CARD-9001', 'CARD-9002', 'CARD-9003']; links = [[0, 0], [1, 1], [3, 2]]; }
        else if (kind === '1-N') { lname = 'departments'; rname = 'students'; L = ['CS', 'Math', 'Physics']; R = ['Asha', 'Ben', 'Chen', 'Diya', 'Elena']; links = [[0, 0], [1, 1], [0, 2], [2, 3], [0, 4]]; }
        else { lname = 'students'; rname = 'courses'; L = ['Asha', 'Ben', 'Chen', 'Diya']; R = ['CS101', 'CS102', 'MA101', 'PH101']; links = [[0, 0], [0, 1], [0, 2], [1, 2], [2, 0], [2, 1], [3, 3], [3, 2]]; }
        function g(k, hl, ehl) {
          var nodes = [], edges = [];
          L.forEach(function (n, i) { nodes.push({ id: 'L' + i, label: n, x: 15, y: 8 + i * 13, shape: 'box' }); });
          R.forEach(function (n, i) { nodes.push({ id: 'R' + i, label: n, x: 82, y: 8 + i * 13, shape: 'box' }); });
          for (var j = 0; j < k; j++) edges.push(['L' + links[j][0], 'R' + links[j][1]]);
          return { type: 'graph', label: lname + ' (left)  ↔  ' + rname + ' (right)', directed: false, height: 8 + Math.max(L.length, R.length) * 13, nodes: nodes, edges: edges, hl: hl || {}, ehl: ehl || {} };
        }
        function deg(k) { var dl = L.map(function () { return 0; }), dr = R.map(function () { return 0; }); for (var j = 0; j < k; j++) { dl[links[j][0]]++; dr[links[j][1]]++; } return { l: dl, r: dr }; }
        frames.push({ narr: 'Two entity types: <b>' + lname + '</b> on the left, <b>' + rname + '</b> on the right. We will draw one line per real-world link and watch how many lines touch each box.', parts: [g(0)] });
        for (var k = 1; k <= links.length; k++) {
          var a = links[k - 1][0], b = links[k - 1][1], d = deg(k), hl = {}, ehl = {};
          hl['L' + a] = 'cur'; hl['R' + b] = 'cur'; ehl['L' + a + '-R' + b] = 'ok';
          var note = '';
          if (d.l[a] > 1) note += ' <b>' + L[a] + '</b> now has ' + d.l[a] + ' links → one ' + lname + ' row can be linked to <b>many</b> ' + rname + '.';
          if (d.r[b] > 1) note += ' <b>' + R[b] + '</b> now has ' + d.r[b] + ' links → one ' + rname + ' row can be linked to <b>many</b> ' + lname + '.';
          frames.push({ narr: 'Link <b>' + L[a] + '</b> — <b>' + R[b] + '</b>.' + (note || ' Each box still has at most one line.'), parts: [g(k, hl, ehl), { type: 'vars', label: 'max lines per box', vals: { left_max: Math.max.apply(null, d.l), right_max: Math.max.apply(null, d.r) } }] });
        }
        var D = deg(links.length), lm = Math.max.apply(null, D.l), rm = Math.max.apply(null, D.r);
        var lonely = L.filter(function (x, i) { return D.l[i] === 0; });
        frames.push({ narr: 'Verdict: a left box touches up to <b>' + lm + '</b> line(s), a right box up to <b>' + rm + '</b>. ' + (kind === '1-1' ? 'Both ≤ 1 → <b>one-to-one</b>.' : kind === '1-N' ? 'Left many, right one → <b>one-to-many</b>.' : 'Both sides many → <b>many-to-many</b>.') + (lonely.length ? ' Note ' + lonely.join(', ') + ' has no line at all → participation is <b>optional</b> on that side.' : ''), parts: [g(links.length), { type: 'vars', label: 'Cardinality', vals: { type: kind, left_max: lm, right_max: rm } }] });
        if (kind === '1-1') {
          frames.push({ narr: '<b>Build it</b>: put the FK in the dependent/optional table (<code>id_cards.student_id</code>) and add <b>UNIQUE</b> to it. Without UNIQUE it would silently become 1 : N (a student could get two cards).', parts: [
            { type: 'table', label: 'students', columns: ['student_id (PK)', 'name'], rows: L.map(function (n, i) { return [i + 1, n]; }) },
            { type: 'table', label: 'id_cards', columns: ['card_no (PK)', 'student_id (FK, UNIQUE)'], rows: links.map(function (p) { return [R[p[1]], p[0] + 1]; }), hl: { 0: 'ok', 1: 'ok', 2: 'ok' } }] });
          frames.push({ narr: 'Try to give Asha (id 1) a second card <code>CARD-9100</code>: the UNIQUE constraint on <code>student_id</code> <span class="c-r">rejects it</span>. That one keyword is the difference between 1 : 1 and 1 : N.', parts: [{ type: 'table', label: 'id_cards', columns: ['card_no (PK)', 'student_id (FK, UNIQUE)'], rows: links.map(function (p) { return [R[p[1]], p[0] + 1]; }).concat([['CARD-9100', 1]]), hl: { 0: 'bad', 3: 'bad' } }, { type: 'text', label: 'Error', html: '<span class="c-r">UNIQUE constraint failed: id_cards.student_id</span>' }] });
        } else if (kind === '1-N') {
          frames.push({ narr: '<span class="c-r">Wrong way</span>: store the students inside the department row. The cell becomes a list → not atomic, cannot be FK-checked or indexed, and every new student rewrites this row.', parts: [{ type: 'table', label: 'departments (bad design)', columns: ['dept_id', 'name', 'student_ids'], rows: [[1, 'CS', '1,3,5'], [2, 'Math', '2'], [3, 'Physics', '4']], hl: { 0: 'bad' } }] });
          frames.push({ narr: '<span class="c-g">Right way</span>: the FK goes on the <b>many</b> side. Each student row holds ONE <code>dept_id</code>. Five lines in the diagram = five FK cells.', parts: [
            { type: 'table', label: 'departments', columns: ['dept_id (PK)', 'name'], rows: L.map(function (n, i) { return [i + 1, n]; }) },
            { type: 'table', label: 'students', columns: ['student_id (PK)', 'name', 'dept_id (FK)'], rows: R.map(function (n, i) { var p = links.filter(function (x) { return x[1] === i; })[0]; return [i + 1, n, p ? p[0] + 1 : 'NULL']; }), hl: { 0: 'ok', 1: 'ok', 2: 'ok', 3: 'ok', 4: 'ok' } }] });
        } else {
          frames.push({ narr: '<span class="c-r">Try FK on one side</span>: <code>students.course_id</code> can hold only one course, so Asha would need 3 rows — repeating her name each time (redundancy). Putting it on courses has the mirror problem. Neither side can hold the link.', parts: [{ type: 'table', label: 'students (bad: repeated rows)', columns: ['student_id', 'name', 'course_id'], rows: [[1, 'Asha', 'CS101'], [1, 'Asha', 'CS102'], [1, 'Asha', 'MA101'], [2, 'Ben', 'MA101']], hl: { 0: 'bad', 1: 'bad', 2: 'bad' } }] });
          frames.push({ narr: '<span class="c-g">Junction table</span> <code>enrollments</code>: one row per line in the diagram (' + links.length + ' rows). Two FKs, and the <b>pair</b> is the primary key, so a student cannot be enrolled twice in the same course. Pair-level facts like <code>grade</code> live here.', parts: [
            { type: 'table', label: 'students', columns: ['student_id', 'name'], rows: L.map(function (n, i) { return [i + 1, n]; }) },
            { type: 'table', label: 'enrollments (junction)', columns: ['student_id (FK)', 'course_id (FK)', 'grade'], rows: links.map(function (p, i) { return [p[0] + 1, R[p[1]], ['A', 'A', 'B', 'A', 'B', 'C', 'A', 'B'][i % 8]]; }), hl: links.reduce(function (o, x, i) { o[i] = 'ok'; return o; }, {}) },
            { type: 'table', label: 'courses', columns: ['course_id', 'title'], rows: R.map(function (c) { return [c, { CS101: 'Intro to Programming', CS102: 'Databases', MA101: 'Calculus I', PH101: 'Mechanics' }[c]]; }) }] });
          frames.push({ narr: 'An N : M relationship is really <b>two 1 : N relationships</b> meeting in the middle: students 1 → N enrollments N ← 1 courses.', parts: [{ type: 'graph', directed: true, height: 40, nodes: [{ id: 'S', label: 'students', x: 12, y: 20, shape: 'box' }, { id: 'E', label: 'enrollments', x: 50, y: 20, shape: 'box' }, { id: 'C', label: 'courses', x: 88, y: 20, shape: 'box' }], edges: [['E', 'S', 'N : 1'], ['E', 'C', 'N : 1']], hl: { E: 'sel' } }] });
        }
        return frames;
      }
    },
    examples: [
      {
        title: '1 : N — department head-count (including empty departments)',
        html: `<p>Departments are the "one" side, students the "many". A LEFT JOIN from the one side keeps History even if nobody had joined it. Grace has <code>dept_id = NULL</code> (optional participation) so she is counted nowhere. ${H.table(['department', 'students'], [['Computer Science', '3'], ['Mathematics', '2'], ['Physics', '1'], ['History', '1']])}</p>`,
        code: { lang: 'sql', db: 'school', code: `SELECT d.name AS department, COUNT(s.student_id) AS students
FROM departments d
LEFT JOIN students s ON s.dept_id = d.dept_id
GROUP BY d.dept_id, d.name
ORDER BY students DESC, department;` }
      },
      {
        title: '1 : 1 — UNIQUE is what keeps it one-to-one',
        html: `<p><code>id_cards.student_id</code> is <code>NOT NULL UNIQUE REFERENCES students</code>. A second card for Asha is rejected. Below, <code>INSERT OR IGNORE</code> skips the bad row quietly, and a fresh card for Chen (who had none) is accepted. ${H.table(['attempt', 'result'], [['CARD-9100 for Asha (1)', H.c('r', 'skipped: UNIQUE')], ['CARD-9101 for Chen (3)', H.c('g', 'inserted')]])}</p>`,
        code: { lang: 'sql', db: 'school', code: `INSERT OR IGNORE INTO id_cards VALUES ('CARD-9100', 1, '2026-01-10', '2030-01-09');  -- Asha already has one
INSERT OR IGNORE INTO id_cards VALUES ('CARD-9101', 3, '2026-01-10', '2030-01-09');  -- Chen had none
SELECT s.name, c.card_no
FROM students s LEFT JOIN id_cards c ON c.student_id = s.student_id
WHERE s.student_id IN (1, 3);` }
      },
      {
        title: 'N : M with attributes — grade belongs to the pair',
        html: `<p>"What grade did Asha get?" has no single answer — she has a grade <i>per course</i>. So <code>grade</code> cannot live in <code>students</code> or in <code>courses</code>; it lives in <code>enrollments</code>. Same for <code>qty</code> and <code>unit_price</code> in the shop's <code>order_items</code> (orders N : M products), and <code>role</code>/<code>hours_per_week</code> in the company's <code>assignments</code>.</p>`,
        code: { lang: 'sql', db: 'school', code: `SELECT s.name, c.title, e.grade
FROM enrollments e
JOIN students s ON s.student_id = e.student_id
JOIN courses  c ON c.course_id  = e.course_id
WHERE s.name = 'Asha Verma'
ORDER BY c.course_id;` }
      },
      {
        title: 'Reading relationships from a schema (company)',
        html: `<p>Given only the DDL, find the relationships by looking at FKs and UNIQUE: ${H.table(['FK', 'UNIQUE on FK?', 'Relationship'], [['employees.dept_id → departments', 'no', 'departments 1 : N employees'], ['employees.manager_id → employees', 'no', 'employee 1 : N reports (recursive)'], ['parking_spots.emp_id → employees', H.c('g', 'yes'), 'employee 1 : 1 parking spot (optional)'], ['assignments (emp_id, project_id)', 'PK = pair', 'employees N : M projects']])}</p>`,
        code: { lang: 'sql', db: 'company', code: `-- Employees on more than one project (the "many" on the employee side)
SELECT e.name, COUNT(*) AS projects, SUM(a.hours_per_week) AS weekly_hours
FROM assignments a JOIN employees e ON e.emp_id = a.emp_id
GROUP BY e.emp_id, e.name
HAVING COUNT(*) > 1;` }
      }
    ],
    deepDive: `<h4>Edge cases and design trade-offs</h4>
<ul>
<li><b>Two ways to build 1 : 1.</b> (a) FK + UNIQUE in the dependent table (what we did). (b) <b>Shared primary key</b>: <code>id_cards.student_id</code> is both PK and FK. Option (b) is common for "extension" tables (user ↔ user_profile) and for splitting rarely-used or large columns into a separate table (vertical partitioning). Ask: why is it not just extra columns in the same table? Valid reasons: optional data (avoid many NULL columns), security (salary in a restricted table), size (big blobs), different write rates.</li>
<li><b>Mandatory 1 : 1 on both sides</b> ("every order has exactly one invoice and vice versa") cannot be fully enforced with plain FKs because you cannot insert either row first — it needs deferred constraints or a single table.</li>
<li><b>Junction table keys.</b> Composite PK <code>(a_id, b_id)</code> is the classic choice. Some ORMs prefer a surrogate <code>id</code> plus <code>UNIQUE(a_id, b_id)</code>; fine — but never forget the UNIQUE, or duplicates appear. If the same pair can legitimately repeat (a student retaking a course), the pair is no longer a key: add <code>semester</code> to the key.</li>
<li><b>Index both directions.</b> PK <code>(student_id, course_id)</code> makes "courses of a student" fast. "Students of a course" needs a second index on <code>(course_id, student_id)</code>.</li>
<li><b>Ternary relationships.</b> "Supplier supplies part to project" is one 3-way fact; splitting it into three binary junction tables loses information (you can no longer tell which supplier supplied which part to which project). Model it as one junction table with three FKs.</li>
<li><b>Recursive N : M.</b> Course prerequisites: <code>prerequisites(course_id, requires_course_id)</code> — both FKs point at <code>courses</code>. Graph-shaped data in SQL; walking it needs recursive CTEs (module 5).</li>
<li><b>In NoSQL</b> the same relationships are often <i>embedded</i> (a document holds an array of its children). That is the 1 : N "list in a cell" design on purpose — fast to read together, painful to query from the other direction. Knowing the relational version helps you judge when embedding is fine.</li>
</ul>`,
    aiEra: `<p><b>What AI changes:</b> describe a domain in plain English ("users follow other users, posts have many tags") and an assistant drafts the tables, FKs and junction tables in seconds. ER-diagram tools now render Mermaid/DBML generated straight from your schema.</p>
<p><b>Use AI as a partner:</b> <code>For each pair of entities below, state the cardinality in both directions, the participation, and where the FK goes. Point out any relationship that carries its own attributes.</code> Then verify using the "ask both directions" trick.</p>
<p><b>Where AI goes wrong:</b> it forgets UNIQUE on a 1 : 1 FK (silently 1 : N), stores many-to-many as JSON arrays or comma lists, forgets the composite PK/UNIQUE on junction tables (duplicate pairs), and splits genuine 3-way facts into separate binary tables.</p>
<p><b>What you must still own:</b> asking the business the right cardinality questions ("can an order ever have two shipping addresses?") — the model is only as right as those answers.</p>`,
    problems: [
      {
        title: 'Model Books and Authors (Many-to-Many)',
        level: 'Medium', tags: ['N:M', 'junction table', 'DDL', 'composite key'], companies: ['Amazon', 'Goodreads', 'Zoho'],
        statement: `<p>A book can have several authors and an author can write several books. Create <code>authors</code>, <code>books</code> and a junction table <code>book_authors</code> (with the author's position on the cover: 1 = first author). Insert the sample data and list every book with its authors in cover order, as one comma-separated string.</p>`,
        constraints: `Self-contained (empty DB). Use PRIMARY KEY, FOREIGN KEY, UNIQUE and CHECK where they make sense. Tables: <code>authors(author_id, name)</code>, <code>books(book_id, title)</code>, <code>book_authors(book_id, author_id, position)</code>. Output (the last result): <code>title, authors</code> ordered by title.`,
        example: `${H.table(['title', 'authors'], [['Database System Concepts', 'Silberschatz, Korth, Sudarshan'], ['Operating System Concepts', 'Silberschatz, Galvin, Gagne'], ['Readings in Databases', 'Stonebraker']])}<p>Silberschatz appears in two books (author → many books) and each book has several authors (book → many authors): ${H.c('p', 'many-to-many')}.</p>`,
        brute: {
          why: `<p>The "spreadsheet" design: <code>author1, author2, author3</code> columns. It caps authors at 3, wastes NULL columns, and "books by Silberschatz" needs an OR across every column — add a 4th author and every query must change. It is a <b>repeating group</b> hiding an N : M relationship.</p>`,
          code: { lang: 'sql', code: `CREATE TABLE books_flat (title TEXT PRIMARY KEY, author1 TEXT, author2 TEXT, author3 TEXT);
INSERT INTO books_flat VALUES
  ('Database System Concepts',  'Silberschatz', 'Korth',  'Sudarshan'),
  ('Operating System Concepts', 'Silberschatz', 'Galvin', 'Gagne'),
  ('Readings in Databases',     'Stonebraker',  NULL,     NULL);
-- Every query must check every author column ... and a 4th author does not fit at all
SELECT title FROM books_flat
WHERE author1 = 'Silberschatz' OR author2 = 'Silberschatz' OR author3 = 'Silberschatz';` }
        },
        mcq: { q: 'Where should the column <code>author_position</code> (1st, 2nd author) live?', options: ['In the junction table book_authors', 'In authors', 'In books', 'Nowhere — compute it'], answer: 0, explain: 'Position describes one author ON one book — a fact about the pair, so it belongs on the relationship (junction) table.' },
        hints: [
          `<p>Hint 1: ask both directions — many authors per book AND many books per author → N : M → you need a third table whose rows are (book, author) pairs.</p>`,
          `<p>Hint 2: <code>book_authors(book_id FK, author_id FK, position)</code> with <code>PRIMARY KEY (book_id, author_id)</code> and <code>UNIQUE (book_id, position)</code> so two authors cannot both be "first".</p>`,
          `<p>Hint 3: to print authors in cover order, join the three tables, ORDER BY position inside a subquery, then <code>group_concat(name, ', ')</code> per book. Recipe: DDL → INSERT → join → group.</p>`
        ],
        tests: { engine: 'sqlite', cases: [
          { cols: ['title', 'authors'], rows: [['Database System Concepts', 'Silberschatz, Korth, Sudarshan'], ['Operating System Concepts', 'Silberschatz, Galvin, Gagne'], ['Readings in Databases', 'Stonebraker']] },
          { after: 'INSERT INTO book_authors (book_id, author_id, position) VALUES (1, 1, 5)', error: 'UNIQUE|PRIMARY|duplicate' },
          { after: 'INSERT INTO book_authors (book_id, author_id, position) VALUES (3, 1, 1)', error: 'UNIQUE|duplicate' },
          { after: 'INSERT INTO book_authors (book_id, author_id, position) VALUES (3, 1, 0)', error: 'CHECK' },
          { after: 'INSERT INTO book_authors (book_id, author_id, position) VALUES (99, 1, 1)', error: 'FOREIGN KEY' },
          { after: 'INSERT INTO book_authors (book_id, author_id, position) VALUES (3, 99, 2)', error: 'FOREIGN KEY' },
          { after: 'INSERT INTO book_authors (book_id, author_id, position) VALUES (3, 1, 2); SELECT COUNT(*) FROM book_authors WHERE author_id = 1', rows: [[3]] },
          { after: 'SELECT a.name FROM authors a JOIN book_authors ba ON ba.author_id = a.author_id WHERE ba.book_id = 2 ORDER BY ba.position', rows: [['Silberschatz'], ['Galvin'], ['Gagne']] }
        ] },
        solution: {
          approach: `<p>Two entity tables with surrogate keys, one junction table with two FKs and a composite PK. Pair-level facts (position) live on the junction. CHECK keeps position positive, UNIQUE(book_id, position) forbids two "first authors". To aggregate in order, feed group_concat from an ordered subquery (SQLite keeps that order in practice; PostgreSQL would use <code>string_agg(name, ', ' ORDER BY position)</code>).</p>`,
          code: { lang: 'sql', code: `PRAGMA foreign_keys = ON;

CREATE TABLE authors (
  author_id INTEGER PRIMARY KEY,
  name      TEXT NOT NULL UNIQUE
);
CREATE TABLE books (
  book_id INTEGER PRIMARY KEY,
  title   TEXT NOT NULL UNIQUE
);
CREATE TABLE book_authors (                       -- the junction (N : M) table
  book_id   INTEGER NOT NULL REFERENCES books(book_id)     ON DELETE CASCADE,
  author_id INTEGER NOT NULL REFERENCES authors(author_id) ON DELETE RESTRICT,
  position  INTEGER NOT NULL CHECK (position >= 1),
  PRIMARY KEY (book_id, author_id),               -- same author not twice on a book
  UNIQUE (book_id, position)                      -- only one "first author"
);

INSERT INTO authors (author_id, name) VALUES
  (1, 'Silberschatz'), (2, 'Korth'), (3, 'Sudarshan'), (4, 'Galvin'), (5, 'Gagne'), (6, 'Stonebraker');
INSERT INTO books (book_id, title) VALUES
  (1, 'Database System Concepts'), (2, 'Operating System Concepts'), (3, 'Readings in Databases');
INSERT INTO book_authors (book_id, author_id, position) VALUES
  (1, 1, 1), (1, 2, 2), (1, 3, 3),
  (2, 1, 1), (2, 4, 2), (2, 5, 3),
  (3, 6, 1);

-- The other direction is just as easy: books by Silberschatz
SELECT b.title
FROM books b JOIN book_authors ba ON ba.book_id = b.book_id
WHERE ba.author_id = (SELECT author_id FROM authors WHERE name = 'Silberschatz');

SELECT title, group_concat(name, ', ') AS authors
FROM (
  SELECT b.title, a.name
  FROM books b
  JOIN book_authors ba ON ba.book_id  = b.book_id
  JOIN authors a       ON a.author_id = ba.author_id
  ORDER BY b.title, ba.position
)
GROUP BY title
ORDER BY title;` },
          complexity: `<p>Lookups by book use the PK index (book_id first); lookups by author would want an extra index on <code>book_authors(author_id)</code>. Storage grows with the number of (book, author) pairs — no NULL columns, no author limit.</p>`,
          followUps: ['Add an index so "all books of an author" does not scan book_authors.', 'Model translators and editors too — one table with a role column, or separate tables?', 'How would a document database store this, and what query becomes hard?']
        }
      }
    ]
  });

  /* ======================================================================
     TOPIC 6 — SQL language categories: DDL, DML, DQL, DCL, TCL
     ====================================================================== */
  topics.push({
    title: 'The Five Families of SQL: DDL, DML, DQL, DCL, TCL',
    analogy: `<p>Running a <b>restaurant</b>:</p>
<ul>
<li><b>DDL</b> (Data Definition) = the <b>builder</b>: builds the kitchen, adds a new shelf, knocks down a wall. Changes the <i>structure</i>.</li>
<li><b>DML</b> (Data Manipulation) = the <b>stock staff</b>: put food on shelves, change labels, throw out spoiled items. Changes the <i>contents</i>.</li>
<li><b>DQL</b> (Data Query) = the <b>waiter</b> who reads the shelves to answer "do we have mushrooms?" — looks, never changes.</li>
<li><b>DCL</b> (Data Control) = the <b>manager handing out keys</b>: who may enter the cold store.</li>
<li><b>TCL</b> (Transaction Control) = the <b>order ticket</b>: a whole order is served together or sent back together — never half a meal.</li>
</ul>`,
    explain: `<p>SQL (Structured Query Language, pronounced "S-Q-L" or "sequel") is one language, but its statements fall into five families. Interviewers ask this as a warm-up, and it matters in practice because each family behaves differently with transactions and permissions.</p>
${H.table(['Family', 'Stands for', 'Changes…', 'Statements', 'Tiny example'], [
  ['<b>DDL</b>', 'Data Definition Language', 'the <b>schema</b> (structure)', '<code>CREATE, ALTER, DROP, TRUNCATE, RENAME, COMMENT</code>', '<code>CREATE TABLE pets (id INTEGER PRIMARY KEY, name TEXT);</code>'],
  ['<b>DML</b>', 'Data Manipulation Language', 'the <b>data</b> (rows)', '<code>INSERT, UPDATE, DELETE, MERGE</code> / UPSERT', '<code>UPDATE pets SET name = \'Rex\' WHERE id = 1;</code>'],
  ['<b>DQL</b>', 'Data Query Language', 'nothing — it reads', '<code>SELECT</code> (with <code>WITH</code>)', '<code>SELECT name FROM pets;</code>'],
  ['<b>DCL</b>', 'Data Control Language', '<b>permissions</b>', '<code>GRANT, REVOKE</code>', '<code>GRANT SELECT ON pets TO analyst;</code>'],
  ['<b>TCL</b>', 'Transaction Control Language', '<b>grouping</b> of changes', '<code>BEGIN / START TRANSACTION, COMMIT, ROLLBACK, SAVEPOINT, RELEASE</code>', '<code>BEGIN; … COMMIT;</code>']
])}
<p><b>Note:</b> many textbooks fold SELECT into DML ("DML = read and write data") and list only four families. Both views are accepted; say "some sources merge DQL into DML" and you look well-read.</p>
<h4>A transaction in 20 seconds</h4>
<p>A <b>transaction</b> is a group of statements that succeed or fail <b>as one unit</b>. <code>BEGIN</code> starts it, <code>COMMIT</code> makes everything permanent, <code>ROLLBACK</code> undoes everything since BEGIN. <code>SAVEPOINT name</code> drops a bookmark you can roll back to without abandoning the whole transaction. If you do not type BEGIN, most DBMSs run in <b>autocommit</b> mode: every single statement is its own tiny transaction.</p>
<h4>The famous one: DELETE vs TRUNCATE vs DROP</h4>
${H.table(['', 'DELETE FROM t', 'TRUNCATE TABLE t', 'DROP TABLE t'], [
  ['Family', 'DML', 'DDL', 'DDL'],
  ['Removes', 'rows you pick (WHERE)', 'all rows', 'rows <b>and</b> the table definition'],
  ['WHERE allowed?', H.c('g', 'yes'), H.c('r', 'no'), H.c('r', 'no')],
  ['Speed on huge tables', 'slow (row by row, logged)', 'fast (deallocates pages)', 'fast'],
  ['Fires row triggers?', 'yes', 'no', 'no'],
  ['Resets auto-increment?', 'no', 'usually yes', 'table is gone'],
  ['Can roll back?', 'yes', 'PostgreSQL / SQL Server: yes; MySQL / Oracle: no (implicit commit)', 'same as TRUNCATE']
])}
<p>SQLite has no TRUNCATE keyword; <code>DELETE FROM t;</code> with no WHERE uses an internal "truncate optimisation".</p>`,
    clues: [
      '"difference between DELETE, TRUNCATE and DROP" → DML vs DDL, WHERE, logging, rollback, triggers, identity reset',
      '"which commands are DDL / DML / DCL / TCL?" → the five-family table; mention SELECT is sometimes counted as DML',
      '"either both updates happen or neither" → TCL: BEGIN … COMMIT / ROLLBACK (atomicity)',
      '"undo part of a transaction" → SAVEPOINT + ROLLBACK TO',
      '"give the analytics team read-only access" → DCL: GRANT SELECT (least privilege), REVOKE',
      '"is DDL transactional?" → PostgreSQL and SQLite yes; MySQL and Oracle commit implicitly'
    ],
    code: [
      { lang: 'sql', title: 'One script, all the families SQLite supports (self-contained)', code: `-- DDL: define structure
CREATE TABLE pets (
  pet_id INTEGER PRIMARY KEY,
  name   TEXT NOT NULL,
  kind   TEXT NOT NULL
);
ALTER TABLE pets ADD COLUMN age INTEGER;           -- DDL: change structure

-- TCL + DML: change data as one unit
BEGIN;
INSERT INTO pets (name, kind, age) VALUES ('Bruno', 'dog', 3), ('Mia', 'cat', 5), ('Kiwi', 'parrot', 1);
UPDATE pets SET age = age + 1 WHERE kind = 'cat';  -- DML
SAVEPOINT before_delete;                           -- TCL: bookmark
DELETE FROM pets WHERE kind = 'parrot';            -- DML
ROLLBACK TO before_delete;                         -- TCL: undo only the delete
COMMIT;                                            -- TCL: make it permanent

-- DQL: read
SELECT pet_id, name, kind, age FROM pets ORDER BY pet_id;

-- DDL: remove structure
DROP TABLE pets;` },
      { lang: 'sql', check: false, title: 'DCL in PostgreSQL (SQLite has no users, so this is PostgreSQL-only syntax)', code: `-- Create a role that can log in, give it read-only access to two tables
CREATE ROLE analyst LOGIN PASSWORD 'change-me';
GRANT USAGE ON SCHEMA public TO analyst;
GRANT SELECT ON customers, orders TO analyst;

-- Column-level: support staff may see names but not phone numbers
GRANT SELECT (customer_id, name, city) ON customers TO support;

-- Take a privilege back
REVOKE SELECT ON orders FROM analyst;

-- Roles as groups: grant the role, not individual privileges, to people
GRANT analyst TO priya;` }
    ],
    codeTitle: ['DDL + DML + TCL + DQL', 'DCL (PostgreSQL)'],
    viz: [
      {
        title: 'Classify a SQL script and track the transaction',
        input: 'CREATE TABLE pets (id INTEGER PRIMARY KEY, name TEXT); BEGIN; INSERT INTO pets VALUES (1, \'Bruno\'); SAVEPOINT s1; DELETE FROM pets; ROLLBACK TO s1; COMMIT; SELECT * FROM pets; GRANT SELECT ON pets TO analyst; DROP TABLE pets',
        inputLabel: 'SQL statements separated by ;',
        gen: function (input) {
          var stmts = String(input || '').split(';').map(function (s) { return s.trim(); }).filter(Boolean);
          if (!stmts.length) throw new Error('Type some SQL statements separated by ;');
          if (stmts.length > 16) throw new Error('Use at most 16 statements');
          var MAP = { CREATE: 'DDL', ALTER: 'DDL', DROP: 'DDL', TRUNCATE: 'DDL', RENAME: 'DDL', COMMENT: 'DDL', INSERT: 'DML', UPDATE: 'DML', DELETE: 'DML', MERGE: 'DML', REPLACE: 'DML', UPSERT: 'DML', SELECT: 'DQL', WITH: 'DQL', VALUES: 'DQL', GRANT: 'DCL', REVOKE: 'DCL', BEGIN: 'TCL', START: 'TCL', COMMIT: 'TCL', END: 'TCL', ROLLBACK: 'TCL', SAVEPOINT: 'TCL', RELEASE: 'TCL' };
          var WHAT = { DDL: 'changes the <b>structure</b> (schema)', DML: 'changes <b>rows</b> (data)', DQL: '<b>reads</b> data, changes nothing', DCL: 'changes <b>who may do what</b>', TCL: 'controls the <b>transaction</b>' };
          var nodes = [{ id: 'SQL', label: 'SQL', x: 50, y: 30, shape: 'box' }, { id: 'DDL', label: 'DDL structure', x: 12, y: 8, shape: 'box' }, { id: 'DML', label: 'DML rows', x: 88, y: 8, shape: 'box' }, { id: 'DQL', label: 'DQL read', x: 12, y: 54, shape: 'box' }, { id: 'DCL', label: 'DCL permissions', x: 88, y: 54, shape: 'box' }, { id: 'TCL', label: 'TCL transactions', x: 50, y: 70, shape: 'box' }];
          var edges = [['SQL', 'DDL'], ['SQL', 'DML'], ['SQL', 'DQL'], ['SQL', 'DCL'], ['SQL', 'TCL']];
          var rows = [], inTx = false, sps = [], frames = [];
          frames.push({ narr: 'Every SQL statement belongs to one of five families. We classify by the <b>first keyword</b> and keep track of the transaction state as we go. Outside BEGIN … COMMIT the DBMS is in <b>autocommit</b> mode.', parts: [{ type: 'graph', directed: true, height: 78, nodes: nodes, edges: edges, hl: { SQL: 'cur' } }, { type: 'vars', label: 'Transaction state', vals: { in_transaction: 'no (autocommit)', savepoints: 0 } }] });
          stmts.forEach(function (s, i) {
            var w = s.split(/\s+/), kw = w[0].toUpperCase(), fam = MAP[kw] || '?', extra = '';
            if (kw === 'BEGIN' || kw === 'START') { inTx = true; sps = []; extra = ' A transaction <b>starts</b>: following changes are provisional until COMMIT.'; }
            else if (kw === 'SAVEPOINT') { if (!inTx) { inTx = true; extra = ' (SQLite: a SAVEPOINT outside BEGIN starts a transaction.)'; } sps.push(w[1] || 'sp'); extra += ' Bookmark <b>' + H.esc(w[1] || 'sp') + '</b> pushed.'; }
            else if (kw === 'ROLLBACK' && /\bTO\b/i.test(s)) { var nm = w[w.length - 1]; var at = sps.lastIndexOf(nm); if (at >= 0) sps = sps.slice(0, at + 1); extra = ' Undo everything after bookmark <b>' + H.esc(nm) + '</b>; the transaction is <b>still open</b>.'; }
            else if (kw === 'ROLLBACK') { inTx = false; sps = []; extra = ' <span class="c-r">Everything since BEGIN is undone</span>; transaction closed.'; }
            else if (kw === 'COMMIT' || kw === 'END') { inTx = false; sps = []; extra = ' <span class="c-g">All changes since BEGIN become permanent</span> (durable).'; }
            else if (kw === 'RELEASE') { var rn = w[w.length - 1]; var at2 = sps.lastIndexOf(rn); if (at2 >= 0) sps = sps.slice(0, at2); extra = ' Bookmark forgotten; its changes stay in the open transaction.'; }
            else if (fam === 'DML' || fam === 'DDL') extra = inTx ? ' Inside a transaction: provisional until COMMIT.' : ' Autocommit: committed immediately.';
            if (fam === 'DCL') extra += ' (SQLite has no users, so it would reject this; PostgreSQL / MySQL accept it.)';
            if (kw === 'DROP' || kw === 'TRUNCATE') extra += ' <span class="c-y">Careful: in MySQL/Oracle DDL also commits any open transaction.</span>';
            rows.push([i + 1, H.esc(s.length > 46 ? s.slice(0, 44) + '…' : s), fam]);
            var hlN = { SQL: 'done' }, ehl = {}; if (fam !== '?') { hlN[fam] = 'cur'; ehl['SQL-' + fam] = 'cur'; }
            var hlR = {}; rows.forEach(function (r, k) { hlR[k] = k === rows.length - 1 ? (fam === '?' ? 'bad' : 'cur') : 'done'; });
            frames.push({ narr: '<code>' + H.esc(kw) + '</code> → <b>' + fam + '</b>' + (fam === '?' ? ' (unknown keyword)' : ': ' + WHAT[fam]) + '.' + extra, parts: [{ type: 'graph', directed: true, height: 78, nodes: nodes, edges: edges, hl: hlN, ehl: ehl }, { type: 'table', label: 'Classified so far', columns: ['#', 'statement', 'family'], rows: rows.map(function (r) { return r.slice(); }), hl: hlR }, { type: 'stack', label: 'Savepoints (top = newest)', items: sps.slice() }, { type: 'vars', label: 'Transaction state', vals: { in_transaction: inTx ? 'YES' : 'no (autocommit)', savepoints: sps.length }, hl: { in_transaction: inTx ? 'cur' : '' } }] });
          });
          var cnt = { DDL: 0, DML: 0, DQL: 0, DCL: 0, TCL: 0 }; rows.forEach(function (r) { if (cnt[r[2]] !== undefined) cnt[r[2]]++; });
          frames.push({ narr: 'Summary of the script by family.' + (inTx ? ' <span class="c-r">Warning: the script ends inside an open transaction</span> — if the connection closes now, the DBMS rolls it back.' : ''), parts: [{ type: 'bars', label: 'statements per family', values: [cnt.DDL, cnt.DML, cnt.DQL, cnt.DCL, cnt.TCL], idxLabels: ['DDL', 'DML', 'DQL', 'DCL', 'TCL'] }, { type: 'table', label: 'All statements', columns: ['#', 'statement', 'family'], rows: rows }] });
          return frames;
        }
      },
      {
        title: 'TCL: a bank transfer that is all-or-nothing',
        input: '300',
        inputLabel: 'Amount to move from A (balance 500) to B — add the word crash to simulate a power cut, e.g. "300 crash"',
        gen: function (input) {
          var txt = String(input || '').trim().toLowerCase(), m = txt.match(/^(\d{1,6})(\s+crash)?$/);
          if (!m) throw new Error('Type an amount like 300, or "300 crash"');
          var amt = parseInt(m[1], 10), crash = !!m[2], A = 500, B = 200, frames = [];
          function acc(a, b, hl, label) { return { type: 'table', label: label || 'accounts', columns: ['id', 'balance'], rows: [['A', a], ['B', b]], hl: hl || {} }; }
          function sum(a, b) { return { type: 'vars', label: 'Invariant: total money', vals: { total: a + b, expected: 700 }, hl: { total: a + b === 700 ? 'ok' : 'bad' } }; }
          frames.push({ narr: 'Two accounts, <code>CHECK (balance &gt;= 0)</code>. Move <b>' + amt + '</b> from A to B. Rule: money must never be created or destroyed — the total must stay 700.', parts: [acc(A, B), sum(A, B)] });
          frames.push({ narr: '<code>BEGIN;</code> — from here, changes are <b>provisional</b>: other sessions still see the old balances, and nothing is permanent until COMMIT.', parts: [acc(A, B, {}, 'accounts (inside transaction)'), sum(A, B), { type: 'code', label: 'Running', lang: 'sql', code: 'BEGIN;\nUPDATE accounts SET balance = balance - ' + amt + ' WHERE id = \'A\';\nUPDATE accounts SET balance = balance + ' + amt + ' WHERE id = \'B\';\nCOMMIT;', hl: { 1: 'cur' } }] });
          if (A - amt < 0) {
            frames.push({ narr: 'Step 1 would make A = ' + (A - amt) + '. The <b>CHECK constraint fails</b> → the statement errors.', parts: [acc(A - amt, B, { 0: 'bad' }, 'attempted change'), sum(A - amt, B), { type: 'code', label: 'Running', lang: 'sql', code: 'BEGIN;\nUPDATE accounts SET balance = balance - ' + amt + ' WHERE id = \'A\';\nUPDATE accounts SET balance = balance + ' + amt + ' WHERE id = \'B\';\nCOMMIT;', hl: { 2: 'bad' } }] });
            frames.push({ narr: 'The app sees the error and issues <code>ROLLBACK;</code> — every change since BEGIN is thrown away. Balances are exactly as before; the total is still 700.', parts: [acc(A, B, { 0: 'ok', 1: 'ok' }), sum(A, B)] });
            return frames;
          }
          A -= amt;
          frames.push({ narr: 'Step 1: A = ' + A + '. For one instant the money is "in flight": the total is only ' + (A + B) + '. That is fine <i>inside</i> a transaction because no one else can see it yet.', parts: [acc(A, B, { 0: 'cur' }, 'accounts (provisional)'), sum(A, B), { type: 'code', label: 'Running', lang: 'sql', code: 'BEGIN;\nUPDATE accounts SET balance = balance - ' + amt + ' WHERE id = \'A\';\nUPDATE accounts SET balance = balance + ' + amt + ' WHERE id = \'B\';\nCOMMIT;', hl: { 2: 'cur' } }] });
          if (crash) {
            frames.push({ narr: '<span class="c-r">⚡ Power cut</span> before step 2 and before COMMIT. Without transactions, A would have lost ' + amt + ' forever and B gained nothing.', parts: [acc(A, B, { 0: 'bad' }, 'state in memory at the crash'), sum(A, B)] });
            frames.push({ narr: 'On restart the DBMS reads its log, sees a transaction that <b>never committed</b>, and undoes it. A is back to 500. <b>Atomicity</b>: all or nothing — here, nothing.', parts: [acc(500, 200, { 0: 'ok', 1: 'ok' }, 'after crash recovery'), sum(500, 200)] });
            return frames;
          }
          B += amt;
          frames.push({ narr: 'Step 2: B = ' + B + '. Total is back to ' + (A + B) + '.', parts: [acc(A, B, { 1: 'cur' }, 'accounts (provisional)'), sum(A, B), { type: 'code', label: 'Running', lang: 'sql', code: 'BEGIN;\nUPDATE accounts SET balance = balance - ' + amt + ' WHERE id = \'A\';\nUPDATE accounts SET balance = balance + ' + amt + ' WHERE id = \'B\';\nCOMMIT;', hl: { 3: 'cur' } }] });
          frames.push({ narr: '<code>COMMIT;</code> — both changes become permanent and visible to everyone <b>at the same moment</b>. Even a crash one millisecond later cannot undo them (durability).', parts: [acc(A, B, { 0: 'ok', 1: 'ok' }), sum(A, B), { type: 'code', label: 'Done', lang: 'sql', code: 'BEGIN;\nUPDATE accounts SET balance = balance - ' + amt + ' WHERE id = \'A\';\nUPDATE accounts SET balance = balance + ' + amt + ' WHERE id = \'B\';\nCOMMIT;', hl: { 4: 'ok' } }] });
          return frames;
        }
      }
    ],
    examples: [
      {
        title: 'DDL: build, change and tear down structure',
        html: `<p>DDL statements talk about <b>tables, columns, indexes, views</b> — not rows. Watch the catalogue change after each one. ${H.table(['statement', 'effect on schema'], [['CREATE TABLE', 'new table appears in sqlite_master'], ['ALTER TABLE … ADD COLUMN', 'degree +1'], ['CREATE INDEX', 'new index object'], ['DROP TABLE', 'table (and its indexes) gone']])}</p>`,
        code: { lang: 'sql', code: `CREATE TABLE notes (note_id INTEGER PRIMARY KEY, body TEXT NOT NULL);
ALTER TABLE notes ADD COLUMN created_at TEXT DEFAULT CURRENT_TIMESTAMP;
CREATE INDEX idx_notes_created ON notes(created_at);
SELECT type, name FROM sqlite_master ORDER BY type, name;       -- table + index

DROP TABLE notes;                                                 -- index goes with it
SELECT COUNT(*) AS objects_left FROM sqlite_master;              -- 0` }
      },
      {
        title: 'DML: INSERT, UPDATE, DELETE and how many rows each touched',
        html: `<p><code>changes()</code> is SQLite's "rows affected by the last statement" (other engines report it to the client). Notice the UPDATE without a careful WHERE would hit every row — the most expensive mistake in SQL.</p>`,
        code: { lang: 'sql', db: 'shop', code: `INSERT INTO products (product_id, sku, name, category, price, stock)
VALUES (16, 'PEN-01', 'Gel Pen', 'stationery', 1.50, 300);
SELECT changes() AS inserted;

UPDATE products SET price = ROUND(price * 1.10, 2) WHERE category = 'books';   -- 10% price rise on books
SELECT changes() AS updated;

DELETE FROM products WHERE stock = 0 AND product_id NOT IN (SELECT product_id FROM order_items);
SELECT changes() AS deleted;        -- 0: the out-of-stock book is referenced by an order, so we keep it

SELECT product_id, name, price, stock FROM products ORDER BY product_id;` }
      },
      {
        title: 'TCL: ROLLBACK really undoes, SAVEPOINT undoes partly',
        html: `<p>Inside a transaction you can look at your own provisional changes, then throw them away. ${H.table(['step', 'Asha\'s loyalty points'], [['start', '1200'], ['after UPDATE (in txn)', '9999'], ['after ROLLBACK', H.c('g', '1200')]])}</p>`,
        code: { lang: 'sql', db: 'shop', code: `BEGIN;
UPDATE loyalty_cards SET points = 9999 WHERE customer_id = 1;
SELECT points AS inside_txn FROM loyalty_cards WHERE customer_id = 1;   -- 9999 (only we see it)
ROLLBACK;
SELECT points AS after_rollback FROM loyalty_cards WHERE customer_id = 1;  -- 1200 again

BEGIN;
UPDATE loyalty_cards SET points = points + 100 WHERE customer_id = 2;   -- keep this
SAVEPOINT risky;
UPDATE loyalty_cards SET points = 0;                                     -- oops: no WHERE!
ROLLBACK TO risky;                                                       -- undo only the oops
COMMIT;
SELECT customer_id, points FROM loyalty_cards ORDER BY customer_id;     -- 1200, 400, 5400` }
      },
      {
        title: 'DCL: least privilege in one picture',
        html: `<p>DCL decides who can run which other family. A typical production setup: ${H.table(['role', 'DQL', 'DML', 'DDL', 'DCL'], [['app_service', '✔', '✔ (own tables)', '✘', '✘'], ['analyst', '✔ (read replica)', '✘', '✘', '✘'], ['migration_bot', '✔', '✔', '✔', '✘'], ['dba', '✔', '✔', '✔', '✔']])} The app account cannot DROP tables, so an SQL-injection bug cannot destroy the schema. SQLite has no GRANT — it relies on OS file permissions.</p>`
      }
    ],
    deepDive: `<h4>Under the hood and across engines</h4>
<ul>
<li><b>Transactional DDL.</b> PostgreSQL and SQLite let you run <code>CREATE/ALTER/DROP</code> inside BEGIN … ROLLBACK and undo them — wonderful for migrations: either the whole migration applies or none of it. MySQL and Oracle issue an <b>implicit COMMIT</b> before and after most DDL, so a failed migration can leave you half-migrated. (MySQL 8 made individual DDL statements atomic, but still not groupable.)</li>
<li><b>DDL takes heavy locks.</b> <code>ALTER TABLE</code> often needs an exclusive lock on the table; on a busy table that blocks every reader and writer. Production teams use online schema-change tools (gh-ost, pt-online-schema-change), PostgreSQL's <code>CREATE INDEX CONCURRENTLY</code>, and the "expand → migrate → contract" pattern.</li>
<li><b>Autocommit cost.</b> Every autocommitted INSERT forces a log flush (fsync). Inserting 100,000 rows one by one in autocommit can take minutes; wrapping them in one BEGIN … COMMIT takes well under a second in SQLite. Batch your writes.</li>
<li><b>DELETE vs TRUNCATE internals.</b> DELETE writes a log record (and MVCC version) per row, fires triggers and leaves free space to be vacuumed. TRUNCATE swaps in a fresh empty storage file — O(1)-ish regardless of size — which is also why it cannot fire per-row triggers and needs stronger locks.</li>
<li><b>Where SELECT belongs.</b> The SQL standard groups statements differently (schema statements, data statements, transaction statements, control statements…). DQL as a separate family is a teaching convention, as is putting TRUNCATE in DDL (it behaves like DDL in most engines).</li>
<li><b>MERGE / UPSERT.</b> Insert-or-update in one atomic statement: SQL standard <code>MERGE</code> (SQL Server, Oracle, PostgreSQL 15+), <code>INSERT … ON CONFLICT DO UPDATE</code> (PostgreSQL, SQLite), <code>INSERT … ON DUPLICATE KEY UPDATE</code> (MySQL). Module 9 covers it.</li>
</ul>`,
    aiEra: `<p><b>What AI changes:</b> AI agents now run SQL directly against databases through tools and MCP servers — "agentic" text-to-SQL. That makes the five families a <b>safety boundary</b>, not just trivia: an agent that should only answer questions needs DQL only.</p>
<p><b>Use AI as a partner:</b> <code>Write the migration as one transaction, and tell me which statements are DDL and whether my engine (MySQL 8) will implicitly commit.</code> Ask it to review a script for UPDATE/DELETE without WHERE.</p>
<p><b>Where AI goes wrong:</b> it writes migrations that assume transactional DDL on MySQL, uses TRUNCATE where triggers or rollback were needed, forgets BEGIN/COMMIT around multi-step changes, and generates GRANT ALL for convenience.</p>
<p><b>What you must still own:</b> least privilege — give AI tools a <b>read-only role</b> (DCL), on a replica, with statement timeouts; review every generated DML/DDL before it runs; and wrap multi-statement changes in transactions.</p>`,
    problems: [
      {
        title: 'Atomic Money Transfer Without Going Negative',
        level: 'Medium', tags: ['TCL', 'transaction', 'CHECK', 'DML'], companies: ['PayPal', 'Razorpay', 'JPMorgan'],
        statement: `<p>Create an <code>accounts</code> table (A has 500, B has 200). Write SQL that moves an amount from A to B such that: (1) both balances change or neither does, (2) A can never go below zero, (3) the total money stays 700. Show a successful transfer of 300 and a refused transfer of 1000 — with no SQL errors.</p>`,
        constraints: `Self-contained (empty DB). Pure SQL, no application code. Table <code>accounts(id, balance)</code>. After both attempts the final result, <code>SELECT id, balance FROM accounts ORDER BY id</code>, must be A = 200, B = 500.`,
        example: `${H.table(['step', 'A', 'B', 'total'], [['start', '500', '200', '700'], ['transfer 300', H.c('g', '200'), H.c('g', '500'), '700'], ['transfer 1000', H.c('y', '200 (refused)'), '500', '700']])}<p>The second transfer would make A = −800, so nothing changes at all.</p>`,
        brute: {
          why: `<p>Two independent autocommitted UPDATEs with no guard: the first UPDATE commits on its own, so a crash between them loses money; and nothing stops A from going negative — the 1000 transfer creates a −800 balance and "prints" money for B.</p>`,
          code: { lang: 'sql', code: `CREATE TABLE accounts (id TEXT PRIMARY KEY, balance INTEGER NOT NULL);   -- no CHECK
INSERT INTO accounts VALUES ('A', 500), ('B', 200);
-- autocommit: each line is its own transaction; no balance check at all
UPDATE accounts SET balance = balance - 1000 WHERE id = 'A';
UPDATE accounts SET balance = balance + 1000 WHERE id = 'B';
SELECT * FROM accounts;   -- A = -500, B = 1200 : wrong` }
        },
        mcq: { q: 'Which single change gives "both or neither" for the two UPDATEs?', options: ['Wrap them in BEGIN … COMMIT', 'Run them in the opposite order', 'Add an index on id', 'Use SELECT before each UPDATE'], answer: 0, explain: 'A transaction makes the group atomic: if anything fails before COMMIT, ROLLBACK (or crash recovery) undoes all of it.' },
        hints: [
          `<p>Hint 1: atomicity comes from TCL — put the change between <code>BEGIN</code> and <code>COMMIT</code>. A <code>CHECK (balance &gt;= 0)</code> is a safety net that makes any overdraft an error.</p>`,
          `<p>Hint 2: to refuse <i>without</i> an error, do both rows in <b>one UPDATE</b>: <code>SET balance = balance + CASE id WHEN 'A' THEN -x WHEN 'B' THEN x END</code>, with a WHERE that only matches when A has enough money.</p>`,
          `<p>Hint 3: the WHERE can read A's balance with a scalar subquery: <code>AND (SELECT balance FROM accounts WHERE id = 'A') &gt;= x</code>. If false, 0 rows change. Verify with <code>SUM(balance)</code> = 700.</p>`
        ],
        tests: { engine: 'sqlite', cases: [
          { cols: ['id', 'balance'], rows: [['A', 200], ['B', 500]] },
          { after: 'SELECT SUM(balance) FROM accounts', rows: [[700]] },
          { after: 'UPDATE accounts SET balance = -1 WHERE id = \'A\'', error: 'CHECK' },
          { after: 'UPDATE accounts SET balance = balance + 1000 WHERE id = \'B\'; UPDATE accounts SET balance = balance - 1000 WHERE id = \'A\'', error: 'CHECK' },
          { after: 'INSERT INTO accounts VALUES (\'C\', -5)', error: 'CHECK' },
          { after: 'SELECT COUNT(*) FROM accounts', rows: [[2]] },
          { after: 'INSERT INTO accounts VALUES (\'A\', 1)', error: 'UNIQUE|PRIMARY|duplicate' },
          { after: 'SELECT balance FROM accounts WHERE id = \'B\'', rows: [[500]] }
        ] },
        solution: {
          approach: `<p>Belt and braces: a CHECK constraint makes negative balances impossible; a single UPDATE moves the money for both rows at once (a single statement is always atomic); its WHERE refuses the move when funds are insufficient (0 rows affected, no error); and BEGIN/COMMIT shows the TCL boundary you would use when the transfer has more steps (e.g. inserting a ledger row).</p>`,
          code: { lang: 'sql', code: `CREATE TABLE accounts (
  id      TEXT PRIMARY KEY,
  balance INTEGER NOT NULL CHECK (balance >= 0)       -- safety net
);
CREATE TABLE ledger (                                  -- audit trail of every successful move
  entry_id INTEGER PRIMARY KEY,
  from_acc TEXT NOT NULL, to_acc TEXT NOT NULL,
  amount   INTEGER NOT NULL CHECK (amount > 0)
);
INSERT INTO accounts VALUES ('A', 500), ('B', 200);

-- Transfer 300: succeeds
BEGIN;
UPDATE accounts
SET balance = balance + CASE id WHEN 'A' THEN -300 WHEN 'B' THEN 300 END
WHERE id IN ('A', 'B')
  AND (SELECT balance FROM accounts WHERE id = 'A') >= 300;
INSERT INTO ledger (from_acc, to_acc, amount) SELECT 'A', 'B', 300 WHERE changes() = 2;
COMMIT;

-- Transfer 1000: refused cleanly (0 rows changed, no ledger row)
BEGIN;
UPDATE accounts
SET balance = balance + CASE id WHEN 'A' THEN -1000 WHEN 'B' THEN 1000 END
WHERE id IN ('A', 'B')
  AND (SELECT balance FROM accounts WHERE id = 'A') >= 1000;
INSERT INTO ledger (from_acc, to_acc, amount) SELECT 'A', 'B', 1000 WHERE changes() = 2;
COMMIT;

SELECT * FROM ledger;                                   -- only the 300 transfer
SELECT SUM(balance) AS total_money FROM accounts;      -- 700
SELECT id, balance FROM accounts ORDER BY id;          -- A 200, B 500 (the final result)` },
          complexity: `<p>Two primary-key lookups and two row updates per transfer: O(log N). The transaction holds row (in SQLite: database) write locks only for microseconds. In PostgreSQL/MySQL under concurrency you would also lock A's row first (<code>SELECT … FOR UPDATE</code>) or rely on the single-statement guard, which re-checks the balance atomically.</p>`,
          followUps: ['Two transfers from A run at the same moment — what can go wrong, and how do row locks or SERIALIZABLE isolation help? (module 12)', 'Store money as integer cents, not REAL — why?', 'Make the transfer idempotent so a retried request does not move money twice.']
        }
      }
    ]
  });

  /* ======================================================================
     TOPIC 7 — Creating your first tables
     ====================================================================== */
  topics.push({
    title: 'Creating Your First Tables (CREATE, INSERT, verify)',
    analogy: `<p>Creating a table is like <b>designing a form</b> before anyone fills it in. You decide the boxes (columns), what may go in each box (data type: "date", "number"), which boxes are required (<b>NOT NULL</b>), what is pre-printed if left blank (<b>DEFAULT</b>), which answers must be unique across all forms ever filed (<b>UNIQUE</b>, <b>PRIMARY KEY</b>), sanity rules ("age must be 16 or more" — <b>CHECK</b>), and "this must match a real customer number" (<b>REFERENCES</b>). A well-designed form rejects nonsense at the counter, instead of you finding it in the filing cabinet a year later.</p>`,
    explain: `<h4>Anatomy of CREATE TABLE</h4>
<pre>CREATE TABLE IF NOT EXISTS students (      -- table name
  student_id INTEGER PRIMARY KEY,          -- column  type  constraint(s)
  roll_no    TEXT    NOT NULL UNIQUE,
  name       TEXT    NOT NULL,
  age        INTEGER CHECK (age &gt;= 16),
  dept       TEXT    DEFAULT 'CS',
  dept_id    INTEGER REFERENCES departments(dept_id),
  UNIQUE (name, dept)                      -- table-level constraint (many columns)
);</pre>
<p>Each column = <b>name + data type + optional constraints</b>. Table-level constraints (after the last column) are needed when a rule spans several columns, like a composite PRIMARY KEY or UNIQUE.</p>
<h4>Data types you will meet</h4>
${H.table(['Kind of data', 'Standard / PostgreSQL / MySQL', 'SQLite', 'Tip'], [
  ['Whole numbers', '<code>INT</code>, <code>BIGINT</code>, <code>SMALLINT</code>', '<code>INTEGER</code>', 'Use BIGINT for ids that might pass 2.1 billion'],
  ['Money / exact decimals', '<code>DECIMAL(10,2)</code> / <code>NUMERIC</code>', 'store <b>integer cents</b> (or TEXT)', 'Never <code>FLOAT</code> for money: 0.1 + 0.2 ≠ 0.3'],
  ['Approximate numbers', '<code>REAL</code>, <code>DOUBLE PRECISION</code>', '<code>REAL</code>', 'Measurements, scores'],
  ['Text', '<code>VARCHAR(n)</code>, <code>TEXT</code>, <code>CHAR(n)</code>', '<code>TEXT</code>', 'SQLite ignores the (n) length'],
  ['True / false', '<code>BOOLEAN</code>', '<code>INTEGER</code> 0 / 1', 'SQLite accepts TRUE/FALSE as 1/0'],
  ['Dates & times', '<code>DATE</code>, <code>TIMESTAMP [WITH TIME ZONE]</code>', 'TEXT <code>\'2026-10-14\'</code> (ISO-8601)', 'ISO text sorts correctly; store UTC'],
  ['Unique ids', '<code>UUID</code>', 'TEXT or BLOB', 'UUIDv7 = time-ordered'],
  ['Semi-structured', '<code>JSON</code> / <code>JSONB</code>', 'TEXT + json_* functions', 'Do not hide relationships in JSON']
])}
<h4>The five column constraints you need on day one</h4>
${H.table(['Constraint', 'Rule it enforces', 'Rejects…'], [
  ['<code>NOT NULL</code>', 'a value is required', 'a student with no name'],
  ['<code>UNIQUE</code>', 'no two rows share this value (NULLs allowed)', 'two students with roll R01'],
  ['<code>PRIMARY KEY</code>', 'UNIQUE + NOT NULL; the row\'s identity', 'duplicate or missing id'],
  ['<code>CHECK (expr)</code>', 'expression must not be FALSE', 'age 12, price −5'],
  ['<code>DEFAULT v</code>', 'value used when the column is omitted', '(fills, never rejects)'],
  ['<code>REFERENCES t(c)</code>', 'value must exist in the parent', 'dept 99 that does not exist']
])}
<p><b>Gotcha:</b> CHECK passes when the expression is <b>NULL</b> (unknown), so <code>CHECK (age &gt;= 16)</code> lets a NULL age in. Add NOT NULL if the value is required.</p>
<h4>The beginner's workflow</h4>
<ol>
<li><b>Design</b> on paper: entities → tables, attributes → columns, identity → PK, links → FKs.</li>
<li><b>Create parents first</b> (departments), then children (students) — a FK must point at an existing table. <b>Drop in reverse</b> (children first).</li>
<li><b>INSERT with an explicit column list</b>: <code>INSERT INTO t (a, b) VALUES (…)</code> — survives future schema changes and lets DEFAULTs work.</li>
<li><b>Verify</b>: <code>SELECT * FROM t</code>, and inspect the schema (<code>PRAGMA table_info(t)</code> in SQLite, <code>\d t</code> in psql, <code>DESCRIBE t</code> in MySQL).</li>
<li><b>Evolve</b> with <code>ALTER TABLE</code> (ADD COLUMN, RENAME COLUMN, RENAME TO, DROP COLUMN) — or, in a real project, with versioned <b>migration</b> files.</li>
</ol>`,
    clues: [
      '"design a table for …" / "write the DDL" → name, types, PK, NOT NULL, UNIQUE, CHECK, DEFAULT, FK — say each choice out loud',
      '"store prices / balances" → DECIMAL(p, s) or integer cents, never FLOAT',
      '"must not be empty" → NOT NULL; "must be one of" → CHECK (col IN (…)); "positive" → CHECK (col &gt; 0)',
      '"table with foreign keys fails to create / drop" → creation order parents → children; drop order children → parents',
      '"SQLite stored text in my INTEGER column" → type affinity; use STRICT tables or CHECK(typeof(col) = \'integer\')',
      '"copy a table" → CREATE TABLE … AS SELECT copies data but NOT keys or constraints'
    ],
    code: [
      { lang: 'sql', title: 'Your first database from scratch (self-contained)', code: `PRAGMA foreign_keys = ON;

-- 1) Parent first
CREATE TABLE IF NOT EXISTS departments (
  dept_id INTEGER PRIMARY KEY,
  name    TEXT NOT NULL UNIQUE
);

-- 2) Child second (it references departments)
CREATE TABLE IF NOT EXISTS students (
  student_id INTEGER PRIMARY KEY,                       -- surrogate key, auto-assigned
  roll_no    TEXT    NOT NULL UNIQUE,                   -- natural candidate key
  name       TEXT    NOT NULL,
  age        INTEGER NOT NULL CHECK (age BETWEEN 16 AND 100),
  email      TEXT    UNIQUE,                            -- optional, but no duplicates
  dept_id    INTEGER NOT NULL REFERENCES departments(dept_id),
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- 3) Insert with explicit column lists (DEFAULTs and auto ids fill the rest)
INSERT INTO departments (name) VALUES ('Computer Science'), ('Mathematics');
INSERT INTO students (roll_no, name, age, email, dept_id) VALUES
  ('R01', 'Asha', 19, 'asha@mail.com', 1),
  ('R02', 'Ben',  17, NULL,            2);

-- 4) Verify the data ...
SELECT student_id, roll_no, name, age, email, dept_id FROM students;
-- ... and the schema the DBMS actually stored
SELECT name, type, "notnull", dflt_value, pk FROM pragma_table_info('students');` },
      { lang: 'sql', title: 'Constraints quietly refusing bad rows (INSERT OR IGNORE)', code: `CREATE TABLE products (
  product_id INTEGER PRIMARY KEY,
  sku        TEXT NOT NULL UNIQUE,
  name       TEXT NOT NULL,
  price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
  status     TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'retired'))
);

INSERT INTO products (sku, name, price_cents) VALUES ('KB-1', 'Keyboard', 8900);   -- ok
-- OR IGNORE skips a row that breaks UNIQUE / NOT NULL / CHECK instead of raising an error
INSERT OR IGNORE INTO products (sku, name, price_cents) VALUES ('KB-1', 'Dup SKU', 100);     -- UNIQUE
INSERT OR IGNORE INTO products (sku, name, price_cents) VALUES ('MS-1', NULL, 2500);        -- NOT NULL
INSERT OR IGNORE INTO products (sku, name, price_cents) VALUES ('MS-2', 'Mouse', -1);       -- CHECK
INSERT OR IGNORE INTO products (sku, name, price_cents, status) VALUES ('MS-3', 'Mouse', 2500, 'sold'); -- CHECK
INSERT INTO products (sku, name, price_cents) VALUES ('MS-4', 'Mouse', 2550);              -- ok

SELECT * FROM products;   -- only KB-1 and MS-4 made it in` }
    ],
    codeTitle: ['First database, end to end', 'Constraints at work'],
    viz: {
      title: 'INSERT row by row: watch each constraint accept or reject',
      input: '1,R01,Asha,19,Math | 2,R02,Ben,17, | 2,R03,Cy,18,CS | 3,R01,Dee,20,CS | 4,R04,,18,CS | 5,R05,Eve,12,CS | ,R06,Fay,, Physics',
      inputLabel: 'Rows: id,roll,name,age,dept separated by | (leave a value empty to omit it)',
      gen: function (input) {
        var raw = String(input || '').split('|').map(function (s) { return s.trim(); }).filter(Boolean);
        if (!raw.length) throw new Error('Type rows like 1,R01,Asha,19,CS | 2,R02,Ben,17,');
        if (raw.length > 12) throw new Error('Use at most 12 rows');
        var code = 'CREATE TABLE students (\n  id    INTEGER PRIMARY KEY,\n  roll  TEXT NOT NULL UNIQUE,\n  name  TEXT NOT NULL,\n  age   INTEGER CHECK (age >= 16),\n  dept  TEXT DEFAULT \'CS\'\n);';
        var cols = ['id', 'roll', 'name', 'age', 'dept'], rows = [], frames = [], ok = 0, bad = 0;
        function view(hlRow, hlLine, label) { return [{ type: 'code', label: 'Schema', lang: 'sql', code: code, hl: hlLine || {} }, { type: 'table', label: label || 'students', columns: cols, rows: rows.map(function (r) { return r.slice(); }), hl: hlRow || {} }, { type: 'vars', label: 'Tally', vals: { accepted: ok, rejected: bad }, hl: {} }]; }
        frames.push({ narr: 'The table exists but is empty. Each INSERT is checked against <b>every</b> constraint on the form; one failure rejects the whole row.', parts: view({}, { 1: 'cur' }) });
        raw.forEach(function (r) {
          var v = r.split(',').map(function (s) { return s.trim(); });
          if (v.length > 5) throw new Error('Row "' + r + '" has more than 5 values');
          while (v.length < 5) v.push('');
          var id = v[0], roll = v[1], name = v[2], age = v[3], dept = v[4];
          if (id !== '' && !/^-?\d+$/.test(id)) throw new Error('id must be a whole number or empty');
          if (age !== '' && !/^-?\d+$/.test(age)) throw new Error('age must be a whole number or empty');
          var show = '(' + v.map(function (x) { return x === '' ? '—' : x; }).join(', ') + ')';
          var reason = null, line = 0;
          if (id !== '' && rows.some(function (x) { return String(x[0]) === String(+id); })) { reason = 'PRIMARY KEY: id ' + id + ' already exists'; line = 2; }
          else if (roll === '') { reason = 'NOT NULL: roll is required'; line = 3; }
          else if (rows.some(function (x) { return x[1] === roll; })) { reason = 'UNIQUE: roll ' + H.esc(roll) + ' is already taken'; line = 3; }
          else if (name === '') { reason = 'NOT NULL: name is required'; line = 4; }
          else if (age !== '' && +age < 16) { reason = 'CHECK (age &gt;= 16) is FALSE for age ' + age; line = 5; }
          if (reason) {
            bad++;
            var hl = {}; hl[line] = 'bad';
            frames.push({ narr: 'INSERT ' + H.esc(show) + ' → <span class="c-r">rejected</span>: ' + reason + '. The table is unchanged — a constraint is a guard at the door, not a clean-up job later.', parts: view({}, hl).concat([{ type: 'text', label: 'Error', html: '<span class="c-r">' + reason + '</span>' }]) });
            return;
          }
          var notes = [], hl2 = {};
          var newId = id;
          if (id === '') { newId = rows.reduce(function (m, x) { return Math.max(m, +x[0]); }, 0) + 1; notes.push('no id given → SQLite assigns <b>' + newId + '</b> (largest id + 1)'); hl2[2] = 'ok'; } else { newId = +id; }
          var ageV = age === '' ? 'NULL' : +age;
          if (age === '') { notes.push('age omitted → <b>NULL</b>, and <code>CHECK (NULL &gt;= 16)</code> is <i>unknown</i>, not false, so it <b>passes</b> (add NOT NULL if age is required)'); hl2[5] = 'cur'; }
          var deptV = dept === '' ? 'CS' : dept;
          if (dept === '') { notes.push('dept omitted → <b>DEFAULT \'CS\'</b>'); hl2[6] = 'ok'; }
          rows.push([newId, roll, name, ageV, deptV]); ok++;
          var hr = {}; hr[rows.length - 1] = 'ok';
          frames.push({ narr: 'INSERT ' + H.esc(show) + ' → <span class="c-g">accepted</span>.' + (notes.length ? ' ' + notes.join('; ') + '.' : ' Every constraint passed.'), parts: view(hr, hl2) });
        });
        frames.push({ narr: 'Done: <b>' + ok + '</b> accepted, <b>' + bad + '</b> rejected. Every row now in the table obeys every rule, and will forever — the DBMS checks again on every UPDATE too. That is why constraints beat "we validate in the app".', parts: view({}, {}) });
        return frames;
      }
    },
    examples: [
      {
        title: 'SQLite type affinity surprise, and STRICT tables',
        html: `<p>Classic SQLite treats declared types as <b>hints</b> ("type affinity"): <code>'42'</code> becomes the integer 42, but <code>'abc'</code> is stored as text in an INTEGER column. A <code>STRICT</code> table (SQLite 3.37+) refuses it. ${H.table(['value inserted into INTEGER column', 'normal table', 'STRICT table'], [['\'42\'', '42 (integer)', '42 (integer)'], ['\'abc\'', H.c('r', '\'abc\' (text!)'), H.c('g', 'error: cannot store TEXT')], ['1.0', '1 (integer)', '1 (integer)']])} PostgreSQL and MySQL (strict mode) behave like STRICT always.</p>`,
        code: { lang: 'sql', code: `CREATE TABLE loose (qty INTEGER, price REAL);
INSERT INTO loose VALUES ('42', '9.5'), ('abc', 'free');
SELECT qty, typeof(qty) AS qty_type, price, typeof(price) AS price_type FROM loose;

CREATE TABLE tight (qty INTEGER, price REAL) STRICT;
INSERT INTO tight VALUES ('42', '9.5');              -- converts losslessly: allowed
-- Uncomment to see the type error (OR IGNORE does NOT hide type errors, only constraint conflicts):
-- INSERT INTO tight VALUES ('abc', 'free');   -- cannot store TEXT value in INTEGER column tight.qty
SELECT qty, typeof(qty) AS qty_type FROM tight;` }
      },
      {
        title: 'Creation order and drop order with foreign keys',
        html: `<p>Children reference parents, so: <b>create</b> departments → courses → enrollments; <b>drop</b> enrollments → courses → departments. Dropping a parent that still has children fails with FKs on (in PostgreSQL you would need <code>DROP … CASCADE</code>, which also drops the FK constraints — dangerous). ${H.table(['order', 'create', 'drop'], [['1', 'departments', 'enrollments'], ['2', 'courses', 'courses'], ['3', 'enrollments', 'departments']])}</p>`,
        code: { lang: 'sql', code: `PRAGMA foreign_keys = ON;
CREATE TABLE departments (dept_id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE);
CREATE TABLE courses (course_id TEXT PRIMARY KEY, dept_id INTEGER NOT NULL REFERENCES departments(dept_id));
CREATE TABLE enrollments (student TEXT NOT NULL, course_id TEXT NOT NULL REFERENCES courses(course_id),
                          PRIMARY KEY (student, course_id));
INSERT INTO departments VALUES (1, 'CS');
INSERT INTO courses VALUES ('CS101', 1);
INSERT INTO enrollments VALUES ('asha', 'CS101');

-- Drop children first, then parents
DROP TABLE IF EXISTS enrollments;
DROP TABLE IF EXISTS courses;
DROP TABLE IF EXISTS departments;
SELECT COUNT(*) AS tables_left FROM sqlite_master WHERE type = 'table';` }
      },
      {
        title: 'Evolving a table with ALTER TABLE',
        html: `<p>Requirements change: add a phone column, rename a column, rename the table. SQLite supports <code>ADD COLUMN</code>, <code>RENAME COLUMN</code>, <code>RENAME TO</code> and (3.35+) <code>DROP COLUMN</code>; for anything else (change a type, add a CHECK to an existing column) you create a new table, copy, drop, rename — the "12-step" recipe. Note that a new NOT NULL column needs a DEFAULT, otherwise existing rows would violate it.</p>`,
        code: { lang: 'sql', db: 'school', code: `ALTER TABLE teachers ADD COLUMN phone TEXT;                               -- nullable: fine
ALTER TABLE teachers ADD COLUMN active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1));
ALTER TABLE teachers RENAME COLUMN name TO full_name;
ALTER TABLE teachers RENAME TO faculty;

SELECT teacher_id, full_name, phone, active FROM faculty ORDER BY teacher_id;
SELECT sql FROM sqlite_master WHERE name = 'faculty';   -- the stored DDL, updated` }
      },
      {
        title: 'CREATE TABLE AS SELECT copies data, not rules',
        html: `<p>Handy for a quick backup or a report table, but the copy has <b>no primary key, no UNIQUE, no CHECK, no FK, no DEFAULT</b> — just column names and loose types. Compare the stored DDL of the original and the copy below. For a real copy, write the CREATE TABLE with constraints yourself and then <code>INSERT INTO new SELECT … FROM old</code>.</p>`,
        code: { lang: 'sql', db: 'shop', code: `CREATE TABLE products_backup AS SELECT * FROM products;

SELECT name, sql FROM sqlite_master WHERE name IN ('products', 'products_backup');

-- The copy now accepts what the original refuses:
INSERT INTO products_backup VALUES (10, 'KB-001', NULL, 'electronics', -5, -1);
SELECT COUNT(*) AS rows_with_id_10 FROM products_backup WHERE product_id = 10;   -- 2: no PK!` }
      }
    ],
    deepDive: `<h4>From toy tables to production schemas</h4>
<ul>
<li><b>Constraints are cheap insurance.</b> NOT NULL and CHECK cost almost nothing per insert. UNIQUE/PK cost an index lookup. FK costs a lookup in the parent's index. The alternative — "validate in the application" — fails the moment a second app, a script, a data migration or an engineer with a SQL console writes to the table.</li>
<li><b>Migrations, not hand-typed DDL.</b> Real teams keep numbered migration files (Flyway, Liquibase, Alembic, Prisma Migrate, Rails/Django migrations) in git, applied in order, so every environment has the same schema. Never edit an old migration; add a new one.</li>
<li><b>Online changes.</b> Adding a column with a constant DEFAULT is instant in PostgreSQL 11+ and MySQL 8 (metadata-only). Adding NOT NULL to a big existing column, or a CHECK, requires scanning every row — PostgreSQL lets you add constraints <code>NOT VALID</code> and validate later without a long lock.</li>
<li><b>Identity columns.</b> Standard SQL: <code>id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY</code> (PostgreSQL 10+, Oracle 12c+). MySQL: <code>AUTO_INCREMENT</code>. SQL Server: <code>IDENTITY(1,1)</code>. SQLite: <code>INTEGER PRIMARY KEY</code> (rowid alias) with optional <code>AUTOINCREMENT</code>.</li>
<li><b>Naming conventions.</b> snake_case, no spaces or reserved words (<code>order</code>, <code>user</code>, <code>group</code> need quoting forever), consistent singular or plural, FK named after the parent key (<code>customer_id</code>), timestamps as <code>created_at</code>/<code>updated_at</code> in UTC.</li>
<li><b>WITHOUT ROWID and STRICT.</b> SQLite <code>WITHOUT ROWID</code> tables store rows clustered by the declared PK (like InnoDB) — good for composite-key tables. <code>STRICT</code> gives real type checking. Combine them: <code>CREATE TABLE … ) STRICT, WITHOUT ROWID;</code></li>
<li><b>Generated columns.</b> <code>total_cents INTEGER GENERATED ALWAYS AS (qty * unit_cents) STORED</code> keeps derived values consistent automatically (SQLite 3.31+, PostgreSQL 12+, MySQL 5.7+).</li>
</ul>`,
    aiEra: `<p><b>What AI changes:</b> "Write the CREATE TABLE statements for a library system" is now a one-line prompt, and ORMs generate DDL from model classes. The bottleneck has moved from typing DDL to <b>reviewing</b> it.</p>
<p><b>Use AI as a partner:</b> <code>Review this DDL: list every column that should be NOT NULL, every natural key missing UNIQUE, every money column using a float, and every FK without an index. Answer as a table.</code> Or ask it to convert your SQLite DDL to PostgreSQL and explain each type change.</p>
<p><b>Where AI goes wrong:</b> FLOAT/REAL for money, <code>VARCHAR(255)</code> everywhere by habit, missing NOT NULL (everything nullable), CHECKs that allow NULL by accident, wrong creation order for FKs, dialect mix-ups (<code>AUTO_INCREMENT</code> in SQLite, <code>SERIAL</code> in MySQL), and inserts without column lists.</p>
<p><b>What you must still own:</b> each constraint is a business rule — you decide which rules are true. Run the DDL, try to insert bad rows on purpose, and make sure the database refuses them.</p>`,
    problems: [
      {
        title: 'Your First Real Table: A Bookshop Catalogue',
        level: 'Easy', tags: ['CREATE TABLE', 'constraints', 'INSERT'], companies: ['TCS', 'Accenture', 'Amazon'],
        statement: `<p>Create a <code>books</code> table where: the id is auto-assigned; ISBN is required and unique; title is required; price is stored in <b>cents</b> and cannot be negative; stock defaults to 0 and cannot be negative; format must be 'paperback', 'hardcover' or 'ebook' (default 'paperback'). Insert three valid books (one without stock or format), then show the table.</p>`,
        constraints: `Self-contained (empty DB). Use explicit column lists in every INSERT. Columns: <code>book_id, isbn, title, price_cents, stock, format</code>; the last result shows exactly these columns ordered by <code>book_id</code>.`,
        example: `${H.table(['book_id', 'isbn', 'title', 'price_cents', 'stock', 'format'], [['1', '978-0262033848', 'Introduction to Algorithms', '9500', '4', 'hardcover'], ['2', '978-1449373320', 'Designing Data-Intensive Applications', '4499', H.c('g', '0'), H.c('g', 'paperback')], ['3', '978-0134757599', 'Refactoring', '4799', '2', 'ebook']])}<p>Book 2 omitted stock and format, so the ${H.c('g', 'DEFAULTs')} filled them in.</p>`,
        brute: {
          why: `<p>A table with no types and no constraints accepts anything: a NULL title, a duplicate ISBN, the text "free" as a price, a negative stock, a format of "scroll". Every report built on it must defend against garbage forever.</p>`,
          code: { lang: 'sql', code: `CREATE TABLE books (isbn, title, price, stock, format);     -- no types, no rules
INSERT INTO books VALUES ('978-0262033848', NULL, 'free', -3, 'scroll');
INSERT INTO books VALUES ('978-0262033848', 'Duplicate ISBN!', 10, 1, 'ebook');
SELECT * FROM books;   -- garbage got in` }
        },
        mcq: { q: 'Which declaration makes <code>format</code> default to paperback AND reject "scroll"?', options: ["<code>format TEXT NOT NULL DEFAULT 'paperback' CHECK (format IN ('paperback','hardcover','ebook'))</code>", "<code>format TEXT DEFAULT 'paperback'</code>", "<code>format TEXT UNIQUE</code>", "<code>format TEXT CHECK (format &lt;&gt; 'scroll')</code>"], answer: 0, explain: 'DEFAULT fills omitted values; CHECK … IN (…) whitelists the allowed values; NOT NULL stops an explicit NULL from slipping past the CHECK.' },
        hints: [
          `<p>Hint 1: go column by column and translate each English rule into a constraint: "required" → NOT NULL, "unique" → UNIQUE, "cannot be negative" → CHECK (x &gt;= 0), "defaults to" → DEFAULT.</p>`,
          `<p>Hint 2: <code>book_id INTEGER PRIMARY KEY</code> is auto-assigned in SQLite. Money as <code>price_cents INTEGER</code> avoids floating-point rounding.</p>`,
          `<p>Hint 3: remember CHECK lets NULL through — pair it with NOT NULL. Then INSERT with column lists, omitting stock/format for one book to prove the DEFAULTs work.</p>`
        ],
        tests: { engine: 'sqlite', cases: [
          { cols: ['book_id', 'isbn', 'title', 'price_cents', 'stock', 'format'], rows: [[1, '978-0262033848', 'Introduction to Algorithms', 9500, 4, 'hardcover'], [2, '978-1449373320', 'Designing Data-Intensive Applications', 4499, 0, 'paperback'], [3, '978-0134757599', 'Refactoring', 4799, 2, 'ebook']] },
          { after: 'INSERT INTO books (isbn, title, price_cents) VALUES (\'978-0262033848\', \'Dup\', 1)', error: 'UNIQUE|duplicate' },
          { after: 'INSERT INTO books (isbn, title, price_cents) VALUES (\'X-1\', \'Neg\', -1)', error: 'CHECK' },
          { after: 'INSERT INTO books (isbn, title, price_cents, stock) VALUES (\'X-2\', \'NegStock\', 1, -1)', error: 'CHECK' },
          { after: 'INSERT INTO books (isbn, title, price_cents, format) VALUES (\'X-3\', \'Scroll\', 1, \'scroll\')', error: 'CHECK' },
          { after: 'INSERT INTO books (title, price_cents) VALUES (\'NoIsbn\', 1)', error: 'NOT NULL' },
          { after: 'INSERT INTO books (isbn, price_cents) VALUES (\'X-4\', 1)', error: 'NOT NULL' },
          { after: 'INSERT INTO books (isbn, title, price_cents) VALUES (\'X-5\', \'Defaults\', 100); SELECT book_id, stock, format FROM books WHERE isbn = \'X-5\'', rows: [[4, 0, 'paperback']] },
          { after: 'INSERT INTO books (isbn, title, price_cents, format) VALUES (\'X-6\', \'Free\', 0, \'hardcover\'); SELECT price_cents, format FROM books WHERE isbn = \'X-6\'', rows: [[0, 'hardcover']] }
        ] },
        solution: {
          approach: `<p>Turn every sentence of the requirement into a constraint, so the database itself enforces the rules. Use integer cents for money, a whitelist CHECK for the format, NOT NULL alongside every CHECK whose column is required, and explicit column lists in INSERT so DEFAULTs and the auto id are used.</p>`,
          code: { lang: 'sql', code: `CREATE TABLE books (
  book_id     INTEGER PRIMARY KEY,                                   -- auto-assigned
  isbn        TEXT    NOT NULL UNIQUE,                               -- required + unique
  title       TEXT    NOT NULL,
  price_cents INTEGER NOT NULL CHECK (price_cents >= 0),             -- money in cents
  stock       INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  format      TEXT    NOT NULL DEFAULT 'paperback'
              CHECK (format IN ('paperback', 'hardcover', 'ebook'))
);

INSERT INTO books (isbn, title, price_cents, stock, format)
VALUES ('978-0262033848', 'Introduction to Algorithms', 9500, 4, 'hardcover');
INSERT INTO books (isbn, title, price_cents)                            -- stock, format: DEFAULTs
VALUES ('978-1449373320', 'Designing Data-Intensive Applications', 4499);
INSERT INTO books (isbn, title, price_cents, stock, format)
VALUES ('978-0134757599', 'Refactoring', 4799, 2, 'ebook');

-- Prove the rules hold: these are skipped instead of stored
INSERT OR IGNORE INTO books (isbn, title, price_cents) VALUES ('978-0262033848', 'Dup', 1);
INSERT OR IGNORE INTO books (isbn, title, price_cents, format) VALUES ('111', 'Scroll', 1, 'scroll');

SELECT book_id, isbn, title, price_cents, stock, format
FROM books ORDER BY book_id;` },
          complexity: `<p>Each INSERT costs O(log N) for the PK and the UNIQUE(isbn) index checks; CHECK and DEFAULT are O(1). Storage: one row per book plus one index on isbn.</p>`,
          followUps: ['Add an <code>authors</code> table and link books to authors (which relationship type?).', 'Make <code>isbn</code> case/format-insensitive (strip dashes) — CHECK, generated column, or app?', 'Convert this DDL to PostgreSQL types (NUMERIC, GENERATED AS IDENTITY).']
        }
      }
    ]
  });

  /* ======================================================================
     PRACTICE — Easy → Medium → Hard
     ====================================================================== */
  practice.push({
    title: 'Describe a Table: Columns, Types, Required, Keys',
    level: 'Easy', tags: ['schema', 'catalogue', 'keys'], companies: ['Microsoft', 'Oracle', 'Deloitte'],
    statement: `<p>Produce a readable "data dictionary" for the shop's <code>customers</code> table: for every column show its position, name, declared type, whether it is required, its default, and whether it is the PRIMARY KEY or has a UNIQUE constraint.</p>`,
    constraints: `<code>db: shop</code>. Output: <code>position, column_name, declared_type, required, default_value, key_role</code>, ordered by position. Read it from the catalogue — no hard-coding.`,
    example: `${H.table(['position', 'column_name', 'declared_type', 'required', 'default_value', 'key_role'], [['0', 'customer_id', 'INTEGER', 'required', '-', H.c('p', 'PRIMARY KEY')], ['1', 'email', 'TEXT', 'required', '-', H.c('b', 'UNIQUE')], ['2', 'name', 'TEXT', 'required', '-', ''], ['3', 'phone', 'TEXT', 'optional', '-', H.c('b', 'UNIQUE')], ['4', 'city', 'TEXT', 'optional', '-', '']])}<p>email is an <b>alternate key</b> (UNIQUE + NOT NULL); phone is unique but optional.</p>`,
    brute: {
      why: `<p>Reading the raw <code>CREATE TABLE</code> text and interpreting it by eye works for one table, but it is manual, easy to misread (a constraint written at table level is easy to miss), and impossible to automate across 300 tables.</p>`,
      code: { lang: 'sql', db: 'shop', code: `-- Manual: print the original DDL text and read it yourself
SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'customers';` }
    },
    mcq: { q: 'Where does a DBMS keep the definitions of your tables?', options: ['In its system catalogue (data dictionary)', 'In the first row of each table', 'Only in the application code', 'In the transaction log only'], answer: 0, explain: 'The catalogue (sqlite_master, information_schema, pg_catalog) is a set of tables describing tables, columns, indexes and constraints.' },
    hints: [
      `<p>Hint 1: <code>pragma_table_info('customers')</code> returns one row per column with <code>cid, name, type, notnull, dflt_value, pk</code>.</p>`,
      `<p>Hint 2: turn the 0/1 flags into words with <code>CASE</code>; <code>COALESCE(dflt_value, '-')</code> prints a dash for "no default". An INTEGER PRIMARY KEY is required even though its notnull flag is 0.</p>`,
      `<p>Hint 3: UNIQUE constraints live in indexes: <code>pragma_index_list('customers')</code> (origin 'u' = from a UNIQUE constraint) joined with <code>pragma_index_info(index_name)</code> gives the column names.</p>`
    ],
    tests: { engine: 'sqlite', cases: [
      { cols: ['position', 'column_name', 'declared_type', 'required', 'default_value', 'key_role'], rows: [[0, 'customer_id', 'INTEGER', 'required', '-', 'PRIMARY KEY'], [1, 'email', 'TEXT', 'required', '-', 'UNIQUE'], [2, 'name', 'TEXT', 'required', '-', ''], [3, 'phone', 'TEXT', 'optional', '-', 'UNIQUE'], [4, 'city', 'TEXT', 'optional', '-', '']] },
      { setup: 'ALTER TABLE customers ADD COLUMN country TEXT NOT NULL DEFAULT \'IN\';', cols: ['position', 'column_name', 'declared_type', 'required', 'default_value', 'key_role'], rows: [[0, 'customer_id', 'INTEGER', 'required', '-', 'PRIMARY KEY'], [1, 'email', 'TEXT', 'required', '-', 'UNIQUE'], [2, 'name', 'TEXT', 'required', '-', ''], [3, 'phone', 'TEXT', 'optional', '-', 'UNIQUE'], [4, 'city', 'TEXT', 'optional', '-', ''], [5, 'country', 'TEXT', 'required', '\'IN\'', '']] },
      { setup: 'ALTER TABLE customers ADD COLUMN age INTEGER DEFAULT 18;', cols: ['position', 'column_name', 'declared_type', 'required', 'default_value', 'key_role'], rows: [[0, 'customer_id', 'INTEGER', 'required', '-', 'PRIMARY KEY'], [1, 'email', 'TEXT', 'required', '-', 'UNIQUE'], [2, 'name', 'TEXT', 'required', '-', ''], [3, 'phone', 'TEXT', 'optional', '-', 'UNIQUE'], [4, 'city', 'TEXT', 'optional', '-', ''], [5, 'age', 'INTEGER', 'optional', '18', '']] },
      { setup: 'ALTER TABLE customers RENAME COLUMN city TO town;', cols: ['position', 'column_name', 'declared_type', 'required', 'default_value', 'key_role'], rows: [[0, 'customer_id', 'INTEGER', 'required', '-', 'PRIMARY KEY'], [1, 'email', 'TEXT', 'required', '-', 'UNIQUE'], [2, 'name', 'TEXT', 'required', '-', ''], [3, 'phone', 'TEXT', 'optional', '-', 'UNIQUE'], [4, 'town', 'TEXT', 'optional', '-', '']] },
      { setup: 'ALTER TABLE customers ADD COLUMN score REAL NOT NULL DEFAULT 0.5; ALTER TABLE customers ADD COLUMN note TEXT;', cols: ['position', 'column_name', 'declared_type', 'required', 'default_value', 'key_role'], rows: [[0, 'customer_id', 'INTEGER', 'required', '-', 'PRIMARY KEY'], [1, 'email', 'TEXT', 'required', '-', 'UNIQUE'], [2, 'name', 'TEXT', 'required', '-', ''], [3, 'phone', 'TEXT', 'optional', '-', 'UNIQUE'], [4, 'city', 'TEXT', 'optional', '-', ''], [5, 'score', 'REAL', 'required', '0.5', ''], [6, 'note', 'TEXT', 'optional', '-', '']] },
      { setup: 'ALTER TABLE customers DROP COLUMN city;', cols: ['position', 'column_name', 'declared_type', 'required', 'default_value', 'key_role'], rows: [[0, 'customer_id', 'INTEGER', 'required', '-', 'PRIMARY KEY'], [1, 'email', 'TEXT', 'required', '-', 'UNIQUE'], [2, 'name', 'TEXT', 'required', '-', ''], [3, 'phone', 'TEXT', 'optional', '-', 'UNIQUE']] },
      { setup: 'ALTER TABLE customers DROP COLUMN city; ALTER TABLE customers ADD COLUMN nick TEXT;', cols: ['position', 'column_name', 'declared_type', 'required', 'default_value', 'key_role'], rows: [[0, 'customer_id', 'INTEGER', 'required', '-', 'PRIMARY KEY'], [1, 'email', 'TEXT', 'required', '-', 'UNIQUE'], [2, 'name', 'TEXT', 'required', '-', ''], [3, 'phone', 'TEXT', 'optional', '-', 'UNIQUE'], [4, 'nick', 'TEXT', 'optional', '-', '']] }
    ] },
    solution: {
      approach: `<p>Query the catalogue like any other table. Columns come from <code>pragma_table_info</code>; the PRIMARY KEY flag is the <code>pk</code> column; UNIQUE columns are found through the automatically created unique indexes (<code>origin = 'u'</code>). Everything is derived, so the report stays correct after any ALTER TABLE.</p>`,
      code: { lang: 'sql', db: 'shop', code: `SELECT ti.cid  AS position,
       ti.name AS column_name,
       ti.type AS declared_type,
       CASE WHEN ti."notnull" = 1 OR ti.pk > 0 THEN 'required' ELSE 'optional' END AS required,
       COALESCE(ti.dflt_value, '-') AS default_value,
       CASE
         WHEN ti.pk > 0 THEN 'PRIMARY KEY'
         WHEN EXISTS (SELECT 1
                      FROM pragma_index_list('customers') AS il
                      JOIN pragma_index_info(il.name)     AS ii
                      WHERE il."unique" = 1 AND il.origin = 'u' AND ii.name = ti.name)
           THEN 'UNIQUE'
         ELSE ''
       END AS key_role
FROM pragma_table_info('customers') AS ti
ORDER BY ti.cid;` },
      complexity: `<p>O(columns × indexes) catalogue lookups — microseconds. The portable equivalent is <code>information_schema.columns</code> joined with <code>information_schema.table_constraints</code> / <code>key_column_usage</code> in PostgreSQL, MySQL and SQL Server.</p>`,
      followUps: ['Extend it to list foreign keys too (pragma_foreign_key_list).', 'Write the same report with information_schema for PostgreSQL.']
    }
  });

  practice.push({
    title: 'Students With No Email on File',
    level: 'Easy', tags: ['NULL', 'IS NULL', 'DQL'], companies: ['TCS', 'Wipro', 'Capgemini'],
    statement: `<p>The school wants to email everybody. List the <code>roll_no</code> and <code>name</code> of every student whose email is <b>missing</b>, so the office can collect it.</p>`,
    constraints: `<code>db: school</code>. Missing = NULL. Order by roll_no.`,
    example: `${H.table(['roll_no', 'name'], [['R2024-003', 'Chen Wei'], ['R2024-007', 'Grace Lee']])}<p>Both rows have <code>email = NULL</code>. ${H.c('r', 'WHERE email = NULL')} would return nothing.</p>`,
    brute: {
      why: `<p>Writing <code>email = NULL</code> (or <code>email = ''</code>) looks natural but returns <b>zero rows</b>: any comparison with NULL yields UNKNOWN, and WHERE keeps only TRUE. The bug is silent — no error, just an empty list, and two students never get the email.</p>`,
      code: { lang: 'sql', db: 'school', code: `SELECT roll_no, name FROM students WHERE email = NULL;   -- 0 rows: always UNKNOWN
SELECT roll_no, name FROM students WHERE email = '';     -- 0 rows: NULL is not empty text` }
    },
    mcq: { q: 'What does <code>NULL = NULL</code> evaluate to in SQL?', options: ['UNKNOWN (treated like false by WHERE)', 'TRUE', 'FALSE', 'An error'], answer: 0, explain: 'NULL means "unknown"; two unknowns are not known to be equal. Use IS NULL / IS NOT NULL (or IS DISTINCT FROM).' },
    hints: [
      `<p>Hint 1: NULL is a marker for "no value", not a value — so it cannot be compared with <code>=</code>.</p>`,
      `<p>Hint 2: SQL has a special predicate for it: <code>col IS NULL</code> (and <code>col IS NOT NULL</code>).</p>`,
      `<p>Hint 3: if the data might also contain empty strings, cover both: <code>WHERE email IS NULL OR trim(email) = ''</code>. Then ORDER BY roll_no.</p>`
    ],
    tests: { engine: 'both', pg: `CREATE TABLE departments (
  dept_id   INTEGER PRIMARY KEY,
  name      TEXT NOT NULL UNIQUE,
  building  TEXT
);
CREATE TABLE students (
  student_id INTEGER PRIMARY KEY,
  roll_no    TEXT NOT NULL UNIQUE,
  name       TEXT NOT NULL,
  email      TEXT UNIQUE,
  city       TEXT,
  dept_id    INTEGER REFERENCES departments(dept_id),
  joined_on  TEXT
);
INSERT INTO departments VALUES
  (1, 'Computer Science', 'Turing Block'),
  (2, 'Mathematics',      'Euler Hall'),
  (3, 'Physics',          'Curie Wing'),
  (4, 'History',          NULL);
INSERT INTO students VALUES
  (1, 'R2024-001', 'Asha Verma',   'asha@mail.com',  'Pune',      1, '2024-07-15'),
  (2, 'R2024-002', 'Ben Carter',   'ben@mail.com',   'Leeds',     2, '2024-07-15'),
  (3, 'R2024-003', 'Chen Wei',     NULL,             'Shanghai',  1, '2024-07-16'),
  (4, 'R2024-004', 'Diya Shah',    'diya@mail.com',  'Pune',      3, '2024-07-16'),
  (5, 'R2024-005', 'Elena Rossi',  'elena@mail.com', 'Milan',     1, '2024-07-18'),
  (6, 'R2024-006', 'Farid Khan',   'farid@mail.com', NULL,        2, '2024-07-20'),
  (7, 'R2024-007', 'Grace Lee',    NULL,             'Seoul',     NULL, '2024-08-01'),
  (8, 'R2024-008', 'Hugo Martin',  'hugo@mail.com',  'Lyon',      4, '2024-08-02');`, cases: [
      { cols: ['roll_no', 'name'], rows: [['R2024-003', 'Chen Wei'], ['R2024-007', 'Grace Lee']] },
      { setup: 'UPDATE students SET email = \'x\' || student_id || \'@mail.com\' WHERE email IS NULL;', rows: [] },
      { setup: 'UPDATE students SET email = NULL;', cols: ['roll_no', 'name'], rows: [['R2024-001', 'Asha Verma'], ['R2024-002', 'Ben Carter'], ['R2024-003', 'Chen Wei'], ['R2024-004', 'Diya Shah'], ['R2024-005', 'Elena Rossi'], ['R2024-006', 'Farid Khan'], ['R2024-007', 'Grace Lee'], ['R2024-008', 'Hugo Martin']] },
      { setup: 'UPDATE students SET email = \'\' WHERE student_id = 1; UPDATE students SET email = \'NULL\' WHERE student_id = 2;', cols: ['roll_no', 'name'], rows: [['R2024-003', 'Chen Wei'], ['R2024-007', 'Grace Lee']] },
      { setup: 'INSERT INTO students (student_id, roll_no, name, joined_on) VALUES (9, \'R2023-099\', \'Zed\', \'2023-01-01\');', cols: ['roll_no', 'name'], rows: [['R2023-099', 'Zed'], ['R2024-003', 'Chen Wei'], ['R2024-007', 'Grace Lee']] },
      { setup: 'INSERT INTO students (student_id, roll_no, name, joined_on) VALUES (10, \'R2024-010\', \'Chen Wei\', \'2024-09-01\');', cols: ['roll_no', 'name'], rows: [['R2024-003', 'Chen Wei'], ['R2024-007', 'Grace Lee'], ['R2024-010', 'Chen Wei']] }
    ] },
    solution: {
      approach: `<p>Use <code>IS NULL</code>, which returns TRUE or FALSE, never UNKNOWN. Defensive version also catches blank strings, which messy imports often contain.</p>`,
      code: { lang: 'sql', db: 'school', code: `SELECT roll_no, name
FROM students
WHERE email IS NULL
ORDER BY roll_no;` },
      complexity: `<p>One scan of students, O(N). With an index on email, <code>IS NULL</code> can use it in most engines (NULLs are stored in the index in SQLite/PostgreSQL).</p>`,
      followUps: ['Count students with and without email in one query.', 'Should email be NOT NULL? What does that force the admissions process to do?']
    }
  });

  practice.push({
    title: 'Courses Nobody Enrolled In',
    level: 'Easy', tags: ['foreign key', '1:N', 'NOT EXISTS'], companies: ['Amazon', 'Coursera', 'Byju\'s'],
    statement: `<p>Before the semester starts, find courses that have <b>zero</b> enrolments so they can be cancelled. Return <code>course_id</code> and <code>title</code>.</p>`,
    constraints: `<code>db: school</code>. A course with no row in <code>enrollments</code> counts.`,
    example: `${H.table(['course_id', 'title'], [['CS301', 'Distributed Systems']])}<p>Every other course appears at least once in <code>enrollments.course_id</code> (the FK side of courses 1 : N enrollments).</p>`,
    brute: {
      why: `<p>An INNER JOIN between courses and enrollments, grouped and counted, can never show a count of 0 — the inner join already threw away courses without enrolments. You get the busy courses, not the empty one.</p>`,
      code: { lang: 'sql', db: 'school', code: `-- Looks reasonable, but courses with 0 enrolments vanish in the INNER JOIN
SELECT c.course_id, c.title, COUNT(*) AS enrolled
FROM courses c JOIN enrollments e ON e.course_id = c.course_id
GROUP BY c.course_id, c.title
HAVING COUNT(*) = 0;      -- always empty` }
    },
    mcq: { q: 'In courses 1 : N enrollments, where is the foreign key?', options: ['enrollments.course_id', 'courses.enrollment_id', 'In both tables', 'There is none'], answer: 0, explain: 'The FK always sits on the "many" side, pointing at the parent key.' },
    hints: [
      `<p>Hint 1: you want parents with <b>no</b> children. "No row exists" in SQL is <code>NOT EXISTS (…)</code>.</p>`,
      `<p>Hint 2: correlate the subquery: <code>SELECT 1 FROM enrollments e WHERE e.course_id = c.course_id</code>.</p>`,
      `<p>Hint 3: alternative: <code>LEFT JOIN</code> enrollments and keep rows where the enrollments side <code>IS NULL</code>. Both are "anti-joins".</p>`
    ],
    tests: { engine: 'both', pg: `CREATE TABLE departments (
  dept_id   INTEGER PRIMARY KEY,
  name      TEXT NOT NULL UNIQUE,
  building  TEXT
);
CREATE TABLE teachers (
  teacher_id INTEGER PRIMARY KEY,
  name       TEXT NOT NULL,
  email      TEXT NOT NULL UNIQUE,
  dept_id    INTEGER REFERENCES departments(dept_id)
);
CREATE TABLE students (
  student_id INTEGER PRIMARY KEY,
  roll_no    TEXT NOT NULL UNIQUE,
  name       TEXT NOT NULL,
  email      TEXT UNIQUE,
  city       TEXT,
  dept_id    INTEGER REFERENCES departments(dept_id),
  joined_on  TEXT
);
CREATE TABLE id_cards (
  card_no    TEXT PRIMARY KEY,
  student_id INTEGER NOT NULL UNIQUE REFERENCES students(student_id),
  issued_on  TEXT,
  valid_till TEXT
);
CREATE TABLE courses (
  course_id  TEXT PRIMARY KEY,
  title      TEXT NOT NULL,
  credits    INTEGER CHECK (credits BETWEEN 1 AND 6),
  dept_id    INTEGER REFERENCES departments(dept_id),
  teacher_id INTEGER REFERENCES teachers(teacher_id)
);
CREATE TABLE enrollments (
  student_id INTEGER NOT NULL REFERENCES students(student_id),
  course_id  TEXT    NOT NULL REFERENCES courses(course_id),
  semester   TEXT    NOT NULL,
  grade      TEXT,
  PRIMARY KEY (student_id, course_id)
);
INSERT INTO departments VALUES
  (1, 'Computer Science', 'Turing Block'),
  (2, 'Mathematics',      'Euler Hall'),
  (3, 'Physics',          'Curie Wing'),
  (4, 'History',          NULL);
INSERT INTO teachers VALUES
  (1, 'Dr. Rao',     'rao@uni.edu',     1),
  (2, 'Ms. Fernandes','fernandes@uni.edu',1),
  (3, 'Dr. Okafor',  'okafor@uni.edu',  2),
  (4, 'Dr. Lindqvist','lindqvist@uni.edu',3),
  (5, 'Mr. Haddad',  'haddad@uni.edu',  NULL);
INSERT INTO students VALUES
  (1, 'R2024-001', 'Asha Verma',   'asha@mail.com',  'Pune',      1, '2024-07-15'),
  (2, 'R2024-002', 'Ben Carter',   'ben@mail.com',   'Leeds',     2, '2024-07-15'),
  (3, 'R2024-003', 'Chen Wei',     NULL,             'Shanghai',  1, '2024-07-16'),
  (4, 'R2024-004', 'Diya Shah',    'diya@mail.com',  'Pune',      3, '2024-07-16'),
  (5, 'R2024-005', 'Elena Rossi',  'elena@mail.com', 'Milan',     1, '2024-07-18'),
  (6, 'R2024-006', 'Farid Khan',   'farid@mail.com', NULL,        2, '2024-07-20'),
  (7, 'R2024-007', 'Grace Lee',    NULL,             'Seoul',     NULL, '2024-08-01'),
  (8, 'R2024-008', 'Hugo Martin',  'hugo@mail.com',  'Lyon',      4, '2024-08-02');
INSERT INTO id_cards VALUES
  ('CARD-9001', 1, '2024-07-20', '2028-07-19'),
  ('CARD-9002', 2, '2024-07-20', '2028-07-19'),
  ('CARD-9003', 4, '2024-07-22', '2028-07-21'),
  ('CARD-9004', 5, '2024-07-25', '2028-07-24'),
  ('CARD-9005', 8, '2024-08-05', '2028-08-04');
INSERT INTO courses VALUES
  ('CS101',   'Intro to Programming', 4, 1, 1),
  ('CS102',   'Databases',            4, 1, 2),
  ('MA101',   'Calculus I',           3, 2, 3),
  ('MA201',   'Linear Algebra',       3, 2, 3),
  ('PH101',   'Mechanics',            4, 3, 4),
  ('HI101',   'World History',        2, 4, 5),
  ('CS301',   'Distributed Systems',  5, 1, NULL);
INSERT INTO enrollments VALUES
  (1, 'CS101', '2024-FALL', 'A'),
  (1, 'CS102', '2024-FALL', 'A'),
  (1, 'MA101', '2024-FALL', 'B'),
  (2, 'MA101', '2024-FALL', 'A'),
  (2, 'MA201', '2024-FALL', NULL),
  (3, 'CS101', '2024-FALL', 'B'),
  (3, 'CS102', '2024-FALL', 'C'),
  (4, 'PH101', '2024-FALL', 'A'),
  (4, 'MA101', '2024-FALL', 'B'),
  (5, 'CS101', '2024-FALL', 'A'),
  (5, 'CS102', '2024-FALL', NULL),
  (6, 'MA201', '2024-FALL', 'B'),
  (8, 'HI101', '2024-FALL', 'A'),
  (8, 'CS101', '2024-FALL', 'C');`, cases: [
      { cols: ['course_id', 'title'], rows: [['CS301', 'Distributed Systems']] },
      { setup: 'INSERT INTO enrollments VALUES (1, \'CS301\', \'2025-SPRING\', NULL);', rows: [] },
      { setup: 'DELETE FROM enrollments;', cols: ['course_id', 'title'], rows: [['CS101', 'Intro to Programming'], ['CS102', 'Databases'], ['CS301', 'Distributed Systems'], ['HI101', 'World History'], ['MA101', 'Calculus I'], ['MA201', 'Linear Algebra'], ['PH101', 'Mechanics']] },
      { setup: 'INSERT INTO courses VALUES (\'ZZ900\', \'Zoology\', 3, 3, NULL), (\'AA100\', \'Art\', 2, 4, NULL);', cols: ['course_id', 'title'], rows: [['AA100', 'Art'], ['CS301', 'Distributed Systems'], ['ZZ900', 'Zoology']] },
      { setup: 'DELETE FROM enrollments WHERE course_id = \'HI101\';', cols: ['course_id', 'title'], rows: [['CS301', 'Distributed Systems'], ['HI101', 'World History']] },
      { setup: 'DELETE FROM enrollments WHERE course_id = \'MA201\' AND student_id = 6;', cols: ['course_id', 'title'], rows: [['CS301', 'Distributed Systems']] }
    ] },
    solution: {
      approach: `<p>Anti-join with NOT EXISTS: keep each course for which no enrolment points at it. The LEFT JOIN … IS NULL form is shown as an equivalent.</p>`,
      code: { lang: 'sql', db: 'school', code: `-- Anti-join with NOT EXISTS
SELECT c.course_id, c.title
FROM courses c
WHERE NOT EXISTS (SELECT 1 FROM enrollments e WHERE e.course_id = c.course_id)
ORDER BY c.course_id;

-- Same answer with LEFT JOIN ... IS NULL
SELECT c.course_id, c.title
FROM courses c
LEFT JOIN enrollments e ON e.course_id = c.course_id
WHERE e.course_id IS NULL
ORDER BY c.course_id;` },
      complexity: `<p>O(C log E) with an index on <code>enrollments.course_id</code> — note the PK (student_id, course_id) starts with student_id, so a separate index on course_id would help at scale.</p>`,
      followUps: ['Also list courses with fewer than 2 students.', 'Which index would you add for this query on a 50M-row enrollments table?']
    }
  });

  practice.push({
    title: 'Every Student With Their Department (Even Without One)',
    level: 'Easy', tags: ['foreign key', '1:N', 'LEFT JOIN'], companies: ['Infosys', 'Cognizant', 'Google'],
    statement: `<p>Print every student's name and the <b>name</b> of their department by following the foreign key <code>students.dept_id → departments.dept_id</code>. Students with no department must still appear, labelled <code>'(undeclared)'</code>.</p>`,
    constraints: `<code>db: school</code>. 8 rows expected. Order by department, then student name.`,
    example: `${H.table(['student', 'department'], [['Grace Lee', H.c('y', '(undeclared)')], ['Asha Verma', 'Computer Science'], ['Chen Wei', 'Computer Science'], ['…', '…']])}<p>Grace has <code>dept_id = NULL</code> — a NULL FK means "no parent", which is allowed.</p>`,
    brute: {
      why: `<p>An INNER JOIN silently drops Grace because her NULL dept_id matches no department. You print 7 students and nobody notices one is missing. Showing raw <code>dept_id</code> numbers instead of names is the other lazy version — correct but useless to a human.</p>`,
      code: { lang: 'sql', db: 'school', code: `-- Drops Grace Lee (NULL foreign key matches nothing)
SELECT s.name AS student, d.name AS department
FROM students s
JOIN departments d ON d.dept_id = s.dept_id
ORDER BY department, student;` }
    },
    mcq: { q: 'A child row has a NULL foreign key. With FKs enforced, this means…', options: ['It is allowed and means "no parent"', 'It violates referential integrity', 'The DBMS replaces it with 0', 'It points to the first parent row'], answer: 0, explain: 'Referential integrity only requires non-NULL FK values to match. Add NOT NULL to make the relationship mandatory.' },
    hints: [
      `<p>Hint 1: following a FK is a join on <code>child.fk = parent.pk</code>.</p>`,
      `<p>Hint 2: to keep children that have no parent, use <code>LEFT JOIN</code> from students to departments.</p>`,
      `<p>Hint 3: replace the missing name with a label using <code>COALESCE(d.name, '(undeclared)')</code>; sort by that label and the student name.</p>`
    ],
    tests: { engine: 'both', pg: `CREATE TABLE departments (
  dept_id   INTEGER PRIMARY KEY,
  name      TEXT NOT NULL UNIQUE,
  building  TEXT
);
CREATE TABLE teachers (
  teacher_id INTEGER PRIMARY KEY,
  name       TEXT NOT NULL,
  email      TEXT NOT NULL UNIQUE,
  dept_id    INTEGER REFERENCES departments(dept_id)
);
CREATE TABLE students (
  student_id INTEGER PRIMARY KEY,
  roll_no    TEXT NOT NULL UNIQUE,
  name       TEXT NOT NULL,
  email      TEXT UNIQUE,
  city       TEXT,
  dept_id    INTEGER REFERENCES departments(dept_id),
  joined_on  TEXT
);
CREATE TABLE id_cards (
  card_no    TEXT PRIMARY KEY,
  student_id INTEGER NOT NULL UNIQUE REFERENCES students(student_id),
  issued_on  TEXT,
  valid_till TEXT
);
CREATE TABLE courses (
  course_id  TEXT PRIMARY KEY,
  title      TEXT NOT NULL,
  credits    INTEGER CHECK (credits BETWEEN 1 AND 6),
  dept_id    INTEGER REFERENCES departments(dept_id),
  teacher_id INTEGER REFERENCES teachers(teacher_id)
);
CREATE TABLE enrollments (
  student_id INTEGER NOT NULL REFERENCES students(student_id),
  course_id  TEXT    NOT NULL REFERENCES courses(course_id),
  semester   TEXT    NOT NULL,
  grade      TEXT,
  PRIMARY KEY (student_id, course_id)
);
INSERT INTO departments VALUES
  (1, 'Computer Science', 'Turing Block'),
  (2, 'Mathematics',      'Euler Hall'),
  (3, 'Physics',          'Curie Wing'),
  (4, 'History',          NULL);
INSERT INTO teachers VALUES
  (1, 'Dr. Rao',     'rao@uni.edu',     1),
  (2, 'Ms. Fernandes','fernandes@uni.edu',1),
  (3, 'Dr. Okafor',  'okafor@uni.edu',  2),
  (4, 'Dr. Lindqvist','lindqvist@uni.edu',3),
  (5, 'Mr. Haddad',  'haddad@uni.edu',  NULL);
INSERT INTO students VALUES
  (1, 'R2024-001', 'Asha Verma',   'asha@mail.com',  'Pune',      1, '2024-07-15'),
  (2, 'R2024-002', 'Ben Carter',   'ben@mail.com',   'Leeds',     2, '2024-07-15'),
  (3, 'R2024-003', 'Chen Wei',     NULL,             'Shanghai',  1, '2024-07-16'),
  (4, 'R2024-004', 'Diya Shah',    'diya@mail.com',  'Pune',      3, '2024-07-16'),
  (5, 'R2024-005', 'Elena Rossi',  'elena@mail.com', 'Milan',     1, '2024-07-18'),
  (6, 'R2024-006', 'Farid Khan',   'farid@mail.com', NULL,        2, '2024-07-20'),
  (7, 'R2024-007', 'Grace Lee',    NULL,             'Seoul',     NULL, '2024-08-01'),
  (8, 'R2024-008', 'Hugo Martin',  'hugo@mail.com',  'Lyon',      4, '2024-08-02');
INSERT INTO id_cards VALUES
  ('CARD-9001', 1, '2024-07-20', '2028-07-19'),
  ('CARD-9002', 2, '2024-07-20', '2028-07-19'),
  ('CARD-9003', 4, '2024-07-22', '2028-07-21'),
  ('CARD-9004', 5, '2024-07-25', '2028-07-24'),
  ('CARD-9005', 8, '2024-08-05', '2028-08-04');
INSERT INTO courses VALUES
  ('CS101',   'Intro to Programming', 4, 1, 1),
  ('CS102',   'Databases',            4, 1, 2),
  ('MA101',   'Calculus I',           3, 2, 3),
  ('MA201',   'Linear Algebra',       3, 2, 3),
  ('PH101',   'Mechanics',            4, 3, 4),
  ('HI101',   'World History',        2, 4, 5),
  ('CS301',   'Distributed Systems',  5, 1, NULL);
INSERT INTO enrollments VALUES
  (1, 'CS101', '2024-FALL', 'A'),
  (1, 'CS102', '2024-FALL', 'A'),
  (1, 'MA101', '2024-FALL', 'B'),
  (2, 'MA101', '2024-FALL', 'A'),
  (2, 'MA201', '2024-FALL', NULL),
  (3, 'CS101', '2024-FALL', 'B'),
  (3, 'CS102', '2024-FALL', 'C'),
  (4, 'PH101', '2024-FALL', 'A'),
  (4, 'MA101', '2024-FALL', 'B'),
  (5, 'CS101', '2024-FALL', 'A'),
  (5, 'CS102', '2024-FALL', NULL),
  (6, 'MA201', '2024-FALL', 'B'),
  (8, 'HI101', '2024-FALL', 'A'),
  (8, 'CS101', '2024-FALL', 'C');`, cases: [
      { cols: ['student', 'department'], rows: [['Grace Lee', '(undeclared)'], ['Asha Verma', 'Computer Science'], ['Chen Wei', 'Computer Science'], ['Elena Rossi', 'Computer Science'], ['Hugo Martin', 'History'], ['Ben Carter', 'Mathematics'], ['Farid Khan', 'Mathematics'], ['Diya Shah', 'Physics']] },
      { setup: 'UPDATE students SET dept_id = NULL;', cols: ['student', 'department'], rows: [['Asha Verma', '(undeclared)'], ['Ben Carter', '(undeclared)'], ['Chen Wei', '(undeclared)'], ['Diya Shah', '(undeclared)'], ['Elena Rossi', '(undeclared)'], ['Farid Khan', '(undeclared)'], ['Grace Lee', '(undeclared)'], ['Hugo Martin', '(undeclared)']] },
      { setup: 'INSERT INTO students (student_id, roll_no, name, dept_id, joined_on) VALUES (9, \'R9\', \'Asha Verma\', 1, \'2024-09-01\');', cols: ['student', 'department'], rows: [['Grace Lee', '(undeclared)'], ['Asha Verma', 'Computer Science'], ['Asha Verma', 'Computer Science'], ['Chen Wei', 'Computer Science'], ['Elena Rossi', 'Computer Science'], ['Hugo Martin', 'History'], ['Ben Carter', 'Mathematics'], ['Farid Khan', 'Mathematics'], ['Diya Shah', 'Physics']] },
      { setup: 'INSERT INTO departments VALUES (6, \'algebra\', NULL), (5, \'Art\', \'Studio\'); INSERT INTO students (student_id, roll_no, name, dept_id, joined_on) VALUES (10, \'R10\', \'Aaron\', 6, \'2024-09-01\');', cols: ['student', 'department'], rows: [['Grace Lee', '(undeclared)'], ['Asha Verma', 'Computer Science'], ['Chen Wei', 'Computer Science'], ['Elena Rossi', 'Computer Science'], ['Hugo Martin', 'History'], ['Ben Carter', 'Mathematics'], ['Farid Khan', 'Mathematics'], ['Diya Shah', 'Physics'], ['Aaron', 'algebra']] },
      { setup: 'DELETE FROM id_cards; DELETE FROM enrollments; DELETE FROM students;', rows: [] },
      { setup: 'INSERT INTO students (student_id, roll_no, name, dept_id, joined_on) VALUES (11, \'R11\', \'Bo\', NULL, \'2024-09-01\'), (12, \'R12\', \'Al\', NULL, \'2024-09-01\');', cols: ['student', 'department'], rows: [['Al', '(undeclared)'], ['Bo', '(undeclared)'], ['Grace Lee', '(undeclared)'], ['Asha Verma', 'Computer Science'], ['Chen Wei', 'Computer Science'], ['Elena Rossi', 'Computer Science'], ['Hugo Martin', 'History'], ['Ben Carter', 'Mathematics'], ['Farid Khan', 'Mathematics'], ['Diya Shah', 'Physics']] }
    ] },
    solution: {
      approach: `<p>LEFT JOIN keeps every student; when no department matches, the department columns are NULL, which COALESCE turns into a readable label.</p>`,
      code: { lang: 'sql', db: 'school', code: `SELECT s.name AS student,
       COALESCE(d.name, '(undeclared)') AS department
FROM students s
LEFT JOIN departments d ON d.dept_id = s.dept_id
ORDER BY department, student;` },
      complexity: `<p>For each student one PK lookup in departments: O(S log D).</p>`,
      followUps: ['Make the relationship mandatory: what DDL change, and what must happen to Grace first?', 'Count students per department including empty departments.']
    }
  });

  practice.push({
    title: 'Enforce One Passport per Person (1 : 1)',
    level: 'Medium', tags: ['1:1', 'UNIQUE', 'foreign key', 'DDL'], companies: ['Government IT', 'Accenture', 'Visa'],
    statement: `<p>Create <code>persons</code> and <code>passports</code> so that a person has <b>at most one</b> passport and every passport belongs to exactly one existing person. Insert 3 persons and passports for two of them, attempt a second passport for the first person (it must be refused without an error), then list all persons with their passport number or <code>'none'</code>.</p>`,
    constraints: `Self-contained (empty DB). Use FKs (with enforcement on) and the right UNIQUE. Tables: <code>persons(person_id, name)</code>, <code>passports(passport_no, person_id, expires_on)</code>. The last result has columns <code>name, passport</code> ordered by person.`,
    example: `${H.table(['name', 'passport'], [['Asha', 'P1001'], ['Ben', 'P2001'], ['Chen', H.c('y', 'none')]])}<p>The attempted second passport P1002 for Asha is ${H.c('r', 'refused')} by UNIQUE(person_id).</p>`,
    brute: {
      why: `<p>An FK alone gives you <b>1 : N</b>, not 1 : 1: nothing stops a second passport row for the same person. Now "Asha's passport" has two answers and any report joining persons to passports double-counts her.</p>`,
      code: { lang: 'sql', code: `PRAGMA foreign_keys = ON;
CREATE TABLE persons (person_id INTEGER PRIMARY KEY, name TEXT NOT NULL);
CREATE TABLE passports (passport_no TEXT PRIMARY KEY,
                        person_id INTEGER NOT NULL REFERENCES persons(person_id));  -- no UNIQUE!
INSERT INTO persons VALUES (1, 'Asha');
INSERT INTO passports VALUES ('P1001', 1), ('P1002', 1);     -- both accepted: now it's 1 : N
SELECT p.name, COUNT(*) AS passports FROM persons p JOIN passports x ON x.person_id = p.person_id GROUP BY p.name;` }
    },
    mcq: { q: 'Which single keyword turns an FK-based 1 : N into 1 : 1?', options: ['UNIQUE on the foreign key column', 'NOT NULL on the foreign key', 'ON DELETE CASCADE', 'An index on the parent'], answer: 0, explain: 'UNIQUE on the FK means each parent can be referenced by at most one child row.' },
    hints: [
      `<p>Hint 1: ask both directions — one person → at most one passport; one passport → exactly one person. That is 1 : 1 with mandatory participation on the passport side.</p>`,
      `<p>Hint 2: put <code>person_id INTEGER NOT NULL UNIQUE REFERENCES persons(person_id)</code> in passports. (Alternative: make person_id the PK of passports — a "shared primary key".)</p>`,
      `<p>Hint 3: show the refusal with <code>INSERT OR IGNORE</code>, then LEFT JOIN persons → passports and <code>COALESCE(passport_no, 'none')</code>.</p>`
    ],
    tests: { engine: 'sqlite', cases: [
      { cols: ['name', 'passport'], rows: [['Asha', 'P1001'], ['Ben', 'P2001'], ['Chen', 'none']] },
      { after: 'INSERT INTO passports VALUES (\'P1002\', 1, \'2036-01-01\')', error: 'UNIQUE|duplicate' },
      { after: 'INSERT INTO passports VALUES (\'P9\', 99, \'2030-01-01\')', error: 'FOREIGN KEY' },
      { after: 'INSERT INTO passports VALUES (\'P3001\', 3, \'2030-01-01\'); SELECT passport_no FROM passports WHERE person_id = 3', rows: [['P3001']] },
      { after: 'INSERT INTO passports VALUES (\'P1001\', 3, \'2030-01-01\')', error: 'UNIQUE|PRIMARY|duplicate' },
      { after: 'INSERT INTO passports VALUES (\'P7\', NULL, \'2030-01-01\')', error: 'NOT NULL|UNIQUE' },
      { after: 'SELECT COUNT(*) FROM persons', rows: [[3]] },
      { after: 'SELECT COUNT(*) FROM passports', rows: [[2]] }
    ] },
    solution: {
      approach: `<p>FK for "belongs to an existing person", NOT NULL for "exactly one owner", UNIQUE for "at most one passport per person". The LEFT JOIN keeps people with no passport (optional participation on the person side).</p>`,
      code: { lang: 'sql', code: `PRAGMA foreign_keys = ON;

CREATE TABLE persons (
  person_id INTEGER PRIMARY KEY,
  name      TEXT NOT NULL
);
CREATE TABLE passports (
  passport_no TEXT PRIMARY KEY,
  person_id   INTEGER NOT NULL UNIQUE                      -- UNIQUE makes it 1 : 1
              REFERENCES persons(person_id) ON DELETE CASCADE,
  expires_on  TEXT NOT NULL
);

INSERT INTO persons (person_id, name) VALUES (1, 'Asha'), (2, 'Ben'), (3, 'Chen');
INSERT INTO passports VALUES ('P1001', 1, '2034-05-01'), ('P2001', 2, '2031-09-12');

INSERT OR IGNORE INTO passports VALUES ('P1002', 1, '2036-01-01');   -- refused: Asha already has one
SELECT changes() AS rows_inserted;                                   -- 0

SELECT p.name, COALESCE(x.passport_no, 'none') AS passport
FROM persons p
LEFT JOIN passports x ON x.person_id = p.person_id
ORDER BY p.person_id;` },
      complexity: `<p>The UNIQUE constraint creates an index on <code>passports.person_id</code>, so the duplicate check and the join lookup are both O(log N).</p>`,
      followUps: ['Real life: people renew passports — how do you keep history but still allow only one <i>valid</i> passport? (partial unique index on status = \'valid\')', 'Shared-PK design: write it and compare.']
    }
  });

  practice.push({
    title: 'Tag Products: Replace a Tag String With a Junction Table',
    level: 'Medium', tags: ['N:M', 'junction table', 'GROUP BY'], companies: ['Shopify', 'Etsy', 'Flipkart'],
    statement: `<p>Products need tags like <code>sale</code>, <code>gift</code>, <code>wholesale</code>. Model products ↔ tags as many-to-many in the shop database: create <code>tags</code> and <code>product_tags</code>, tag some products, then output (1) every product with its tags as a sorted comma list (untagged products show <code>'-'</code>), and (2) the products tagged exactly <code>sale</code>.</p>`,
    constraints: `<code>db: shop</code>. Tag data: Keyboard → sale, gift; Mouse → wholesale; SQL for Humans → gift, sale; Coffee Mug → gift. A tag name is unique; a product cannot have the same tag twice. Tables: <code>tags(tag_id, name)</code>, <code>product_tags(product_id, tag_id)</code>. Run (1) first and finish with (2), so the last result is the list of product <code>name</code>s tagged sale, ordered by name.`,
    example: `${H.table(['name', 'tags'], [['Mechanical Keyboard', 'gift, sale'], ['Wireless Mouse', 'wholesale'], ['SQL for Humans', 'gift, sale'], ['Data Structures', '-'], ['Coffee Mug', 'gift'], ['Noise-Cancel Headphones', '-']])}<p>"Tagged sale" returns Keyboard and SQL for Humans — ${H.c('r', 'not')} the Mouse, whose tag "wholesale" merely contains the letters "sale".</p>`,
    brute: {
      why: `<p>A text column <code>tags = 'gift,sale'</code> searched with <code>LIKE '%sale%'</code> also matches "wholesale" (false positive), cannot be FK-checked (typos like "sael" creep in), cannot be indexed for this search, and renaming a tag means rewriting every product row.</p>`,
      code: { lang: 'sql', db: 'shop', code: `ALTER TABLE products ADD COLUMN tags TEXT;
UPDATE products SET tags = 'sale,gift' WHERE product_id = 10;
UPDATE products SET tags = 'wholesale' WHERE product_id = 11;
UPDATE products SET tags = 'gift,sale' WHERE product_id = 12;
UPDATE products SET tags = 'gift'      WHERE product_id = 14;
SELECT name FROM products WHERE tags LIKE '%sale%';   -- wrongly includes Wireless Mouse` }
    },
    mcq: { q: 'Why does <code>product_tags</code> need PRIMARY KEY (product_id, tag_id)?', options: ['So the same tag cannot be attached to the same product twice', 'So each product can only have one tag', 'So each tag is used by one product', 'It is required for every junction table to compile'], answer: 0, explain: 'The pair is the identity of a link; without the key, duplicate links double-count in every report.' },
    hints: [
      `<p>Hint 1: one product → many tags, one tag → many products ⇒ N : M ⇒ <code>product_tags(product_id FK, tag_id FK)</code> with the pair as the PK.</p>`,
      `<p>Hint 2: insert tag links by looking up ids with subqueries (<code>(SELECT tag_id FROM tags WHERE name = 'sale')</code>) so you never hard-code ids.</p>`,
      `<p>Hint 3: products LEFT JOIN product_tags LEFT JOIN tags, then <code>group_concat</code> over an ordered subquery, and <code>COALESCE(…, '-')</code> for untagged products. Exact tag search is a simple equality on <code>tags.name</code>.</p>`
    ],
    tests: { engine: 'sqlite', cases: [
      { cols: ['name'], rows: [['Mechanical Keyboard'], ['SQL for Humans']] },
      { setup: 'UPDATE products SET name = \'Alpha Book\' WHERE product_id = 12;', cols: ['name'], rows: [['Alpha Book'], ['Mechanical Keyboard']] },
      { setup: 'UPDATE products SET name = \'ZZ Keyboard\' WHERE product_id = 10;', cols: ['name'], rows: [['SQL for Humans'], ['ZZ Keyboard']] },
      { setup: 'UPDATE products SET name = \'Wholesale Mouse (sale)\' WHERE product_id = 11;', cols: ['name'], rows: [['Mechanical Keyboard'], ['SQL for Humans']] },
      { after: 'SELECT p.name, t.name FROM product_tags pt JOIN products p ON p.product_id = pt.product_id JOIN tags t ON t.tag_id = pt.tag_id ORDER BY p.product_id, t.name', rows: [['Mechanical Keyboard', 'gift'], ['Mechanical Keyboard', 'sale'], ['Wireless Mouse', 'wholesale'], ['SQL for Humans', 'gift'], ['SQL for Humans', 'sale'], ['Coffee Mug', 'gift']] },
      { after: 'INSERT INTO product_tags SELECT 10, tag_id FROM tags WHERE name = \'sale\'', error: 'UNIQUE|PRIMARY|duplicate' },
      { after: 'INSERT INTO tags (name) VALUES (\'sale\')', error: 'UNIQUE|duplicate' },
      { after: 'INSERT INTO product_tags SELECT 999, MIN(tag_id) FROM tags', error: 'FOREIGN KEY' },
      { after: 'SELECT COUNT(*) FROM tags', rows: [[3]] }
    ] },
    solution: {
      approach: `<p>Classic junction table. Tag names live once in <code>tags</code> (UNIQUE), links in <code>product_tags</code> with two FKs and a composite PK. Exact matching uses equality on the tag name — no substring false positives. Aggregation back to a list is a presentation concern done at query time.</p>`,
      code: { lang: 'sql', db: 'shop', code: `CREATE TABLE tags (
  tag_id INTEGER PRIMARY KEY,
  name   TEXT NOT NULL UNIQUE
);
CREATE TABLE product_tags (
  product_id INTEGER NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
  tag_id     INTEGER NOT NULL REFERENCES tags(tag_id)         ON DELETE CASCADE,
  PRIMARY KEY (product_id, tag_id)
);

INSERT INTO tags (name) VALUES ('sale'), ('gift'), ('wholesale');
INSERT INTO product_tags (product_id, tag_id)
SELECT p.product_id, t.tag_id
FROM (SELECT 10 AS pid, 'sale' AS tag UNION ALL SELECT 10, 'gift'
      UNION ALL SELECT 11, 'wholesale'
      UNION ALL SELECT 12, 'gift' UNION ALL SELECT 12, 'sale'
      UNION ALL SELECT 14, 'gift') AS wanted
JOIN products p ON p.product_id = wanted.pid
JOIN tags     t ON t.name       = wanted.tag;

-- (1) every product with its tags
SELECT name, COALESCE(group_concat(tag, ', '), '-') AS tags
FROM (SELECT p.product_id, p.name, t.name AS tag
      FROM products p
      LEFT JOIN product_tags pt ON pt.product_id = p.product_id
      LEFT JOIN tags t          ON t.tag_id      = pt.tag_id
      ORDER BY p.product_id, t.name)
GROUP BY product_id, name
ORDER BY product_id;

-- (2) exact tag match: no "wholesale" false positive
SELECT p.name
FROM products p
JOIN product_tags pt ON pt.product_id = p.product_id
JOIN tags t          ON t.tag_id      = pt.tag_id
WHERE t.name = 'sale'
ORDER BY p.name;` },
      complexity: `<p>Finding products for a tag: O(log T) to find the tag + one index range scan on product_tags (add an index on <code>(tag_id, product_id)</code> since the PK starts with product_id). Storage: one small row per link.</p>`,
      followUps: ['Find products that have BOTH gift and sale (relational division with GROUP BY … HAVING COUNT(*) = 2).', 'Tag names must be case-insensitive unique — how? (<code>UNIQUE COLLATE NOCASE</code> or a lower() expression index)']
    }
  });

  practice.push({
    title: 'Direct Reports via a Self-Referencing Foreign Key',
    level: 'Medium', tags: ['self-reference', 'foreign key', 'GROUP BY'], companies: ['LinkedIn', 'Meta', 'Workday'],
    statement: `<p>In the company database, <code>employees.manager_id</code> references <code>employees.emp_id</code>. For every employee who manages at least one person, return their name, how many <b>direct</b> reports they have, and the reports' names (alphabetical, comma-separated).</p>`,
    constraints: `<code>db: company</code>. Order by number of reports (desc), then manager name.`,
    example: `${H.table(['manager', 'direct_reports', 'team'], [['Meera Iyer', '3', 'Sara Ali, Tom Baker, Yuki Tanaka'], ['Ana Souza', '1', 'Kofi Mensah'], ['Priya Nair', '1', 'James Wu'], ['Tom Baker', '1', 'Leo Novak']])}<p>Leo reports to Tom, who reports to Meera — but Leo is <b>not</b> Meera's <i>direct</i> report.</p>`,
    brute: {
      why: `<p>The "N+1 queries" approach: fetch every employee, then for each one run a separate <code>COUNT(*) … WHERE manager_id = ?</code>. With 10,000 employees that is 10,001 round trips; one grouped self-join does it in a single query inside the DBMS.</p>`,
      code: { lang: 'sql', db: 'company', code: `-- One query per employee (the app would loop over all ids): N+1 round trips
SELECT 'Meera Iyer' AS manager, COUNT(*) AS direct_reports FROM employees WHERE manager_id = 1;
SELECT 'Tom Baker',  COUNT(*) FROM employees WHERE manager_id = 2;
SELECT 'Sara Ali',   COUNT(*) FROM employees WHERE manager_id = 3;
SELECT 'Priya Nair', COUNT(*) FROM employees WHERE manager_id = 5;
SELECT 'Ana Souza',  COUNT(*) FROM employees WHERE manager_id = 7;` }
    },
    mcq: { q: 'In <code>employees(emp_id PK, manager_id FK → employees)</code>, what relationship is modelled?', options: ['A recursive 1 : N (one manager, many reports)', 'N : M between two tables', '1 : 1 between employee and manager', 'No relationship — it is just a number'], answer: 0, explain: 'Both ends are employees; each employee has at most one manager, a manager can have many reports.' },
    hints: [
      `<p>Hint 1: use the same table twice with two aliases: <code>m</code> (manager) and <code>e</code> (employee), joined on <code>e.manager_id = m.emp_id</code>.</p>`,
      `<p>Hint 2: group by the manager and <code>COUNT(*)</code> the matched employees; <code>group_concat</code> collects their names.</p>`,
      `<p>Hint 3: to get the names alphabetical, aggregate from an ordered subquery. Only managers with ≥ 1 report appear naturally with an INNER JOIN.</p>`
    ],
    tests: { engine: 'sqlite', cases: [
      { cols: ['manager', 'direct_reports', 'team'], rows: [['Meera Iyer', 3, 'Sara Ali, Tom Baker, Yuki Tanaka'], ['Ana Souza', 1, 'Kofi Mensah'], ['Priya Nair', 1, 'James Wu'], ['Tom Baker', 1, 'Leo Novak']] },
      { setup: 'UPDATE employees SET manager_id = NULL;', rows: [] },
      { setup: 'INSERT INTO employees VALUES (10, \'E010\', \'Aaron Lee\', \'aaron@corp.com\', 20, 5, 70000, \'2025-01-01\');', cols: ['manager', 'direct_reports', 'team'], rows: [['Meera Iyer', 3, 'Sara Ali, Tom Baker, Yuki Tanaka'], ['Priya Nair', 2, 'Aaron Lee, James Wu'], ['Ana Souza', 1, 'Kofi Mensah'], ['Tom Baker', 1, 'Leo Novak']] },
      { setup: 'UPDATE employees SET manager_id = 1 WHERE emp_id IN (5, 7);', cols: ['manager', 'direct_reports', 'team'], rows: [['Meera Iyer', 5, 'Ana Souza, Priya Nair, Sara Ali, Tom Baker, Yuki Tanaka'], ['Ana Souza', 1, 'Kofi Mensah'], ['Priya Nair', 1, 'James Wu'], ['Tom Baker', 1, 'Leo Novak']] },
      { setup: 'UPDATE employees SET manager_id = 5 WHERE emp_id = 9;', cols: ['manager', 'direct_reports', 'team'], rows: [['Meera Iyer', 2, 'Sara Ali, Tom Baker'], ['Priya Nair', 2, 'James Wu, Yuki Tanaka'], ['Ana Souza', 1, 'Kofi Mensah'], ['Tom Baker', 1, 'Leo Novak']] },
      { setup: 'INSERT INTO employees VALUES (10, \'E010\', \'Aaron Lee\', \'aaron@corp.com\', 20, 5, 70000, \'2025-01-01\');INSERT INTO employees VALUES (11, \'E011\', \'Zed Zee\', \'zed@corp.com\', 30, 7, 70000, \'2025-01-02\');', cols: ['manager', 'direct_reports', 'team'], rows: [['Meera Iyer', 3, 'Sara Ali, Tom Baker, Yuki Tanaka'], ['Ana Souza', 2, 'Kofi Mensah, Zed Zee'], ['Priya Nair', 2, 'Aaron Lee, James Wu'], ['Tom Baker', 1, 'Leo Novak']] }
    ] },
    solution: {
      approach: `<p>A self-join turns the self-referencing FK into manager/report pairs, then GROUP BY manager counts them. Everything happens in one round trip.</p>`,
      code: { lang: 'sql', db: 'company', code: `SELECT manager,
       COUNT(*)                    AS direct_reports,
       group_concat(report, ', ')  AS team
FROM (
  SELECT m.emp_id, m.name AS manager, e.name AS report
  FROM employees e
  JOIN employees m ON m.emp_id = e.manager_id     -- follow the self-referencing FK
  ORDER BY m.emp_id, e.name
)
GROUP BY emp_id, manager
ORDER BY direct_reports DESC, manager;` },
      complexity: `<p>One pass over employees with an index lookup per row: O(N log N). An index on <code>employees(manager_id)</code> makes "reports of manager X" a direct range scan.</p>`,
      followUps: ['Count ALL reports (direct and indirect) — needs a recursive CTE (module 5).', 'Prevent an employee from being their own manager with a CHECK.', 'What happens on DELETE of a manager with the default NO ACTION?']
    }
  });

  practice.push({
    title: 'GDPR Erasure: Delete a Customer in the Right Order',
    level: 'Medium', tags: ['referential actions', 'transaction', 'DML'], companies: ['Zalando', 'Booking.com', 'Stripe'],
    statement: `<p>Customer 5 (Elena) requests erasure. The shop schema has <code>orders.customer_id … ON DELETE RESTRICT</code>, <code>order_items.order_id … ON DELETE CASCADE</code> and <code>loyalty_cards.customer_id … ON DELETE CASCADE</code>. Delete Elena and everything that belongs to her, atomically, with foreign keys <b>on</b>, and prove nothing points at customer 5 afterwards.</p>`,
    constraints: `<code>db: shop</code>. No PRAGMA foreign_keys = OFF. Finish with a verification query returning zeros.`,
    example: `${H.table(['check', 'value'], [['customers with id 5', '0'], ['orders of customer 5', '0'], ['order_items of her order 1005', '0'], ['loyalty cards of customer 5', '0'], ['foreign key violations', '0']])}<p>Order 1005's items vanish by ${H.c('g', 'CASCADE')} when the order is deleted; the card vanishes by CASCADE when the customer is deleted; orders must be deleted ${H.c('y', 'explicitly first')} because of RESTRICT.</p>`,
    brute: {
      why: `<p>The tempting shortcut is to switch FK checks off and delete the customer row. It "works" — and leaves order 1005 and its items pointing at a customer who no longer exists. Every revenue report now joins to nothing; the orphan check below shows the damage.</p>`,
      code: { lang: 'sql', db: 'shop', code: `PRAGMA foreign_keys = OFF;                 -- the shortcut
DELETE FROM customers WHERE customer_id = 5;
SELECT "table", rowid, parent FROM pragma_foreign_key_check('orders');   -- orphan order left behind` }
    },
    mcq: { q: 'orders → customers is RESTRICT. What must happen before deleting the customer?', options: ['Delete (or reassign) the customer\'s orders first', 'Nothing — RESTRICT deletes them automatically', 'Turn foreign keys off', 'Delete order_items only'], answer: 0, explain: 'RESTRICT refuses to delete a parent that still has children; you remove the children yourself (and CASCADE handles their own children).' },
    hints: [
      `<p>Hint 1: draw the chain: customers ← orders ← order_items, and customers ← loyalty_cards. Note which arrows are CASCADE and which are RESTRICT.</p>`,
      `<p>Hint 2: RESTRICT means "children first": delete Elena's orders (their items go by CASCADE), then delete Elena (her loyalty card goes by CASCADE).</p>`,
      `<p>Hint 3: wrap both DELETEs in <code>BEGIN … COMMIT</code> so a failure halfway leaves nothing half-erased; verify with COUNTs and <code>pragma_foreign_key_check</code>.</p>`
    ],
    tests: { engine: 'sqlite', cases: [
      { cols: ['customers_left', 'orders_left', 'items_left', 'cards_left', 'fk_violations'], rows: [[0, 0, 0, 0, 0]] },
      { setup: 'INSERT INTO orders VALUES (1007, 5, \'2026-03-10\', \'placed\'); INSERT INTO order_items VALUES (1007, 11, 1, 25.5);', cols: ['customers_left', 'orders_left', 'items_left', 'cards_left', 'fk_violations'], rows: [[0, 0, 0, 0, 0]] },
      { setup: 'DELETE FROM loyalty_cards WHERE customer_id = 5;', cols: ['customers_left', 'orders_left', 'items_left', 'cards_left', 'fk_violations'], rows: [[0, 0, 0, 0, 0]] },
      { after: 'SELECT COUNT(*) FROM orders', rows: [[5]] },
      { after: 'SELECT COUNT(*) FROM customers', rows: [[4]] },
      { after: 'SELECT COUNT(*) FROM order_items', rows: [[9]] },
      { after: 'SELECT COUNT(*) FROM loyalty_cards', rows: [[2]] },
      { setup: 'INSERT INTO orders VALUES (1007, 5, \'2026-03-10\', \'placed\'); INSERT INTO order_items VALUES (1007, 11, 1, 25.5);', after: 'SELECT COUNT(*) FROM order_items', rows: [[9]] },
      { setup: 'INSERT INTO orders VALUES (1007, 5, \'2026-03-10\', \'placed\'); INSERT INTO order_items VALUES (1007, 11, 1, 25.5);', after: 'SELECT COUNT(*) FROM orders WHERE customer_id = 5', rows: [[0]] },
      { after: 'SELECT customer_id FROM customers ORDER BY customer_id', rows: [[1], [2], [3], [4]] }
    ] },
    solution: {
      approach: `<p>Respect the declared actions instead of fighting them: one transaction, children with RESTRICT deleted explicitly, CASCADE doing the rest. (Real systems often keep anonymised order rows for tax law — that would be an UPDATE that blanks personal data instead of a DELETE.)</p>`,
      code: { lang: 'sql', db: 'shop', code: `-- Before
SELECT (SELECT COUNT(*) FROM orders WHERE customer_id = 5)        AS orders_before,
       (SELECT COUNT(*) FROM order_items WHERE order_id = 1005)   AS items_before,
       (SELECT COUNT(*) FROM loyalty_cards WHERE customer_id = 5) AS cards_before;

BEGIN;
DELETE FROM orders    WHERE customer_id = 5;   -- RESTRICT side: children first; items CASCADE
DELETE FROM customers WHERE customer_id = 5;   -- loyalty card CASCADEs
COMMIT;

-- Proof
SELECT (SELECT COUNT(*) FROM customers WHERE customer_id = 5)     AS customers_left,
       (SELECT COUNT(*) FROM orders WHERE customer_id = 5)        AS orders_left,
       (SELECT COUNT(*) FROM order_items WHERE order_id = 1005)   AS items_left,
       (SELECT COUNT(*) FROM loyalty_cards WHERE customer_id = 5) AS cards_left,
       (SELECT COUNT(*) FROM pragma_foreign_key_check)            AS fk_violations;` },
      complexity: `<p>Each DELETE finds rows via indexes (PK, and ideally an index on <code>orders.customer_id</code>); CASCADE lookups need an index on each child FK column or they scan the child table.</p>`,
      followUps: ['Implement "anonymise instead of delete": keep orders, blank the personal fields.', 'Which FK columns in this schema need an index to make these deletes fast?']
    }
  });

  practice.push({
    title: 'Split a Comma-Separated Column Into a Junction Table',
    level: 'Hard', tags: ['1NF', 'N:M', 'migration', 'json_each'], companies: ['Atlassian', 'Uber', 'Salesforce'],
    statement: `<p>A legacy table <code>club_signups_raw(student_id, clubs)</code> stores clubs as text like <code>'chess, robotics ,drama'</code>. Migrate it to a proper design: <code>clubs(club_id, name UNIQUE)</code> and <code>memberships(student_id → students, club_id → clubs, PK pair)</code>. Then answer "who is in drama?" exactly, and show member counts per club.</p>`,
    constraints: `<code>db: school</code>. Raw data: (1,'chess,drama'), (2,'drama'), (3,'chess, robotics ,drama'), (4,'melodrama'), (5,''), (6,'chess,chess'). Trim spaces, ignore empty items, ignore duplicates.`,
    example: `${H.table(['club', 'members'], [['chess', '3'], ['drama', '3'], ['melodrama', '1'], ['robotics', '1']])}<p>Drama members: students 1, 2, 3 — ${H.c('r', 'not')} student 4 (melodrama). Student 6 typed chess twice but is counted once.</p>`,
    brute: {
      why: `<p>Querying the raw column with <code>LIKE '%drama%'</code> also returns the melodrama student, cannot be indexed, cannot enforce that clubs exist, and counting members per club needs string gymnastics. The data is not in First Normal Form.</p>`,
      code: { lang: 'sql', db: 'school', code: `CREATE TABLE club_signups_raw (student_id INTEGER, clubs TEXT);
INSERT INTO club_signups_raw VALUES (1,'chess,drama'), (2,'drama'), (3,'chess, robotics ,drama'),
                                    (4,'melodrama'), (5,''), (6,'chess,chess');
SELECT student_id FROM club_signups_raw WHERE clubs LIKE '%drama%';   -- includes student 4: wrong` }
    },
    mcq: { q: 'Storing "chess,drama" in one cell violates which rule?', options: ['Atomic values (First Normal Form)', 'Entity integrity', 'Referential integrity', 'Durability'], answer: 0, explain: 'Each cell must hold a single value; a list in a cell hides a separate (N : M) relationship.' },
    hints: [
      `<p>Hint 1: you need one row per (student, club) item. SQLite can split a string if you turn it into a JSON array: <code>'["' || replace(clubs, ',', '","') || '"]'</code>, then <code>json_each(…)</code> yields one row per element.</p>`,
      `<p>Hint 2: clean every item with <code>trim()</code> and drop empty ones. Insert <code>DISTINCT</code> names into clubs first (parents first!), then memberships via a join on the club name.</p>`,
      `<p>Hint 3: <code>INSERT OR IGNORE</code> (or DISTINCT) handles "chess,chess" because the PK (student_id, club_id) rejects the duplicate pair. Wrap the migration in a transaction. Recipe: split → clean → clubs → memberships → verify.</p>`
    ],
    tests: { engine: 'sqlite', cases: [
      { cols: ['club', 'members'], rows: [['chess', 3], ['drama', 3], ['melodrama', 1], ['robotics', 1]] },
      { after: 'SELECT s.student_id FROM memberships m JOIN clubs c ON c.club_id = m.club_id JOIN students s ON s.student_id = m.student_id WHERE c.name = \'drama\' ORDER BY 1', rows: [[1], [2], [3]] },
      { after: 'SELECT c.name FROM memberships m JOIN clubs c ON c.club_id = m.club_id WHERE m.student_id = 3 ORDER BY c.name', rows: [['chess'], ['drama'], ['robotics']] },
      { after: 'SELECT c.name FROM memberships m JOIN clubs c ON c.club_id = m.club_id WHERE m.student_id = 4 ORDER BY c.name', rows: [['melodrama']] },
      { after: 'SELECT c.name FROM memberships m JOIN clubs c ON c.club_id = m.club_id WHERE m.student_id = 5 ORDER BY c.name', rows: [] },
      { after: 'SELECT c.name FROM memberships m JOIN clubs c ON c.club_id = m.club_id WHERE m.student_id = 6 ORDER BY c.name', rows: [['chess']] },
      { after: 'SELECT COUNT(*) FROM memberships', rows: [[8]] },
      { after: 'SELECT COUNT(*) FROM clubs', rows: [[4]] },
      { after: 'INSERT INTO memberships VALUES (1, (SELECT club_id FROM clubs WHERE name = \'chess\'))', error: 'UNIQUE|PRIMARY|duplicate' },
      { after: 'INSERT INTO memberships VALUES (999, (SELECT MIN(club_id) FROM clubs))', error: 'FOREIGN KEY' },
      { after: 'INSERT INTO clubs (name) VALUES (\'chess\')', error: 'UNIQUE|duplicate' }
    ] },
    solution: {
      approach: `<p>Normalise in three moves inside one transaction: (1) split each text value into items with <code>json_each</code>, trimming and skipping blanks; (2) insert distinct club names into the parent table; (3) insert (student, club) pairs into the junction table, letting the composite PK absorb duplicates. Afterwards exact questions become plain equality joins. (The JSON trick assumes names contain no double quotes; a recursive CTE splitter, module 5, avoids that.)</p>`,
      code: { lang: 'sql', db: 'school', code: `CREATE TABLE club_signups_raw (student_id INTEGER, clubs TEXT);
INSERT INTO club_signups_raw VALUES (1,'chess,drama'), (2,'drama'), (3,'chess, robotics ,drama'),
                                    (4,'melodrama'), (5,''), (6,'chess,chess');

BEGIN;
CREATE TABLE clubs (
  club_id INTEGER PRIMARY KEY,
  name    TEXT NOT NULL UNIQUE
);
CREATE TABLE memberships (
  student_id INTEGER NOT NULL REFERENCES students(student_id),
  club_id    INTEGER NOT NULL REFERENCES clubs(club_id),
  PRIMARY KEY (student_id, club_id)
);

-- 1+2) split, clean, insert distinct parents
INSERT INTO clubs (name)
SELECT DISTINCT trim(j.value)
FROM club_signups_raw r,
     json_each('["' || replace(r.clubs, ',', '","') || '"]') AS j
WHERE trim(j.value) <> ''
ORDER BY 1;

-- 3) insert the pairs; duplicates ('chess,chess') are ignored by the composite PK
INSERT OR IGNORE INTO memberships (student_id, club_id)
SELECT r.student_id, c.club_id
FROM club_signups_raw r,
     json_each('["' || replace(r.clubs, ',', '","') || '"]') AS j
JOIN clubs c ON c.name = trim(j.value);
COMMIT;

-- Exact question, no false positives
SELECT m.student_id, s.name
FROM memberships m
JOIN clubs c    ON c.club_id = m.club_id
JOIN students s ON s.student_id = m.student_id
WHERE c.name = 'drama'
ORDER BY m.student_id;

-- Members per club
SELECT c.name AS club, COUNT(*) AS members
FROM clubs c JOIN memberships m ON m.club_id = c.club_id
GROUP BY c.club_id, c.name
ORDER BY c.name;` },
      complexity: `<p>Splitting is O(total characters); inserts are O(P log P) for P pairs because of the PK index. After migration, "members of club X" is an index lookup instead of a full-table LIKE scan.</p>`,
      followUps: ['Rewrite the splitter with a recursive CTE so club names may contain quotes.', 'Keep the old column readable during a zero-downtime migration (expand → migrate → contract).', 'Add a "joined_on" date to memberships — which table does it belong to and why?']
    }
  });

  practice.push({
    title: 'Discover the Composite Candidate Keys of a Timetable',
    level: 'Hard', tags: ['candidate key', 'composite key', 'GROUP BY HAVING'], companies: ['Google', 'Microsoft', 'Oracle'],
    statement: `<p>A timetable table <code>timetable(room, day, slot, course, teacher)</code> has no declared keys. Using the data, test these column sets for uniqueness: (room, day), (room, slot), (day, slot), (teacher, day), (room, day, slot), (teacher, day, slot), (course, day, slot). Report how many duplicate groups each has, decide which are <b>candidate keys</b> (unique AND minimal), then lock them in with constraints.</p>`,
    constraints: `Self-contained. The report is the last result, with columns <code>column_set, duplicate_groups, verdict</code> ('unique' or 'not unique'), one row per listed set. Data: (R1,Mon,1,CS101,Rao), (R2,Mon,1,MA101,Okafor), (R1,Mon,2,CS102,Fernandes), (LAB1,Mon,2,CS101,Rao), (LAB2,Mon,2,CS101,Lee), (R2,Tue,1,MA101,Okafor), (R1,Tue,1,PH101,Lindqvist), (R1,Tue,2,CS101,Rao).`,
    example: `${H.table(['column_set', 'duplicate_groups', 'verdict'], [['(room, day)', '2', 'not unique'], ['(room, day, slot)', '0', H.c('g', 'unique')], ['(teacher, day, slot)', '0', H.c('g', 'unique')], ['(course, day, slot)', '1', H.c('r', 'not unique: CS101 lab has two sections at Mon-2')]])}<p>Both 3-column sets are unique and all their 2-column subsets repeat ⇒ both are ${H.c('p', 'candidate keys')}.</p>`,
    brute: {
      why: `<p>Checking one combination by listing the whole table sorted by those columns and scanning for repeats by eye. Seven combinations means seven sorts read manually; with thousands of rows it is hopeless and easy to get wrong.</p>`,
      code: { lang: 'sql', code: `CREATE TABLE timetable (room TEXT, day TEXT, slot INTEGER, course TEXT, teacher TEXT);
INSERT INTO timetable VALUES ('R1','Mon',1,'CS101','Rao'), ('R2','Mon',1,'MA101','Okafor'),
  ('R1','Mon',2,'CS102','Fernandes'), ('LAB1','Mon',2,'CS101','Rao'), ('LAB2','Mon',2,'CS101','Lee'),
  ('R2','Tue',1,'MA101','Okafor'), ('R1','Tue',1,'PH101','Lindqvist'), ('R1','Tue',2,'CS101','Rao');
-- Eyeball method: sort and look for repeated neighbours, one combination at a time
SELECT room, day, slot FROM timetable ORDER BY room, day, slot;` }
    },
    mcq: { q: '(room, day, slot) is unique, and (room, day), (room, slot), (day, slot) all have duplicates. Then (room, day, slot) is…', options: ['A candidate key (unique and minimal)', 'A super key but not a candidate key', 'Not a key', 'The primary key automatically'], answer: 0, explain: 'Unique = super key; no proper subset is unique = minimal ⇒ candidate key. Choosing it as PK is a separate design decision.' },
    hints: [
      `<p>Hint 1: a column set has duplicates exactly when <code>GROUP BY those columns HAVING COUNT(*) &gt; 1</code> returns rows. Count those rows to get "duplicate groups".</p>`,
      `<p>Hint 2: put each test in its own scalar subquery and stack them with <code>UNION ALL</code> in a CTE, then use CASE for the verdict.</p>`,
      `<p>Hint 3: minimality — a unique 3-column set is a candidate key only if each of its 2-column subsets has duplicates. Then enforce with <code>CREATE UNIQUE INDEX</code> (or rebuild with PRIMARY KEY + UNIQUE). Remember: data only gives evidence; confirm with the scheduling rules ("a room hosts one class per slot", "a teacher teaches one class per slot").</p>`
    ],
    tests: { engine: 'sqlite', cmp: 'set', cases: [
      { cols: ['column_set', 'duplicate_groups', 'verdict'], rows: [['(room, day)', 2, 'not unique'], ['(room, slot)', 3, 'not unique'], ['(day, slot)', 3, 'not unique'], ['(teacher, day)', 1, 'not unique'], ['(room, day, slot)', 0, 'unique'], ['(teacher, day, slot)', 0, 'unique'], ['(course, day, slot)', 1, 'not unique']] },
      { after: 'INSERT INTO timetable VALUES (\'R1\', \'Mon\', 1, \'HI101\', \'Haddad\')', error: 'UNIQUE|duplicate' },
      { after: 'INSERT INTO timetable VALUES (\'R9\', \'Mon\', 1, \'HI101\', \'Rao\')', error: 'UNIQUE|duplicate' },
      { after: 'INSERT INTO timetable VALUES (\'R9\', \'Wed\', 1, \'CS101\', \'Rao\'); SELECT COUNT(*) FROM timetable', rows: [[9]] },
      { after: 'INSERT INTO timetable VALUES (\'LAB3\', \'Mon\', 2, \'CS101\', \'Kim\'); SELECT COUNT(*) FROM timetable', rows: [[9]] },
      { after: 'INSERT INTO timetable VALUES (\'R2\', \'Tue\', 2, \'MA101\', \'Okafor\'); SELECT COUNT(*) FROM timetable', rows: [[9]] },
      { after: 'INSERT INTO timetable VALUES (\'LAB1\', \'Mon\', 2, \'PH101\', \'Kim\')', error: 'UNIQUE|duplicate' },
      { after: 'SELECT COUNT(*) FROM timetable', rows: [[8]] }
    ] },
    solution: {
      approach: `<p>Profile uniqueness with GROUP BY … HAVING for each candidate column set, read off minimality from the subsets, and then turn the business rules into constraints so future rows cannot break them. Both (room, day, slot) and (teacher, day, slot) are candidate keys; pick one as the identity (or add a surrogate id) and declare the other UNIQUE.</p>`,
      code: { lang: 'sql', code: `CREATE TABLE timetable (room TEXT, day TEXT, slot INTEGER, course TEXT, teacher TEXT);
INSERT INTO timetable VALUES ('R1','Mon',1,'CS101','Rao'), ('R2','Mon',1,'MA101','Okafor'),
  ('R1','Mon',2,'CS102','Fernandes'), ('LAB1','Mon',2,'CS101','Rao'), ('LAB2','Mon',2,'CS101','Lee'),
  ('R2','Tue',1,'MA101','Okafor'), ('R1','Tue',1,'PH101','Lindqvist'), ('R1','Tue',2,'CS101','Rao');

-- Which rows break (course, day, slot)?
SELECT course, day, slot, group_concat(room || '/' || teacher, ', ') AS clashing_rows
FROM timetable GROUP BY course, day, slot HAVING COUNT(*) > 1;

-- Lock the business rules in: both candidate keys enforced from now on
CREATE UNIQUE INDEX uq_room_day_slot    ON timetable(room, day, slot);
CREATE UNIQUE INDEX uq_teacher_day_slot ON timetable(teacher, day, slot);
INSERT OR IGNORE INTO timetable VALUES ('R1','Mon',1,'HI101','Haddad');   -- room double-booked: refused
SELECT COUNT(*) AS rows_now FROM timetable;                                -- still 8

-- The report (final result): duplicate groups per column set
WITH tests(column_set, duplicate_groups) AS (
  SELECT '(room, day)',          (SELECT COUNT(*) FROM (SELECT 1 FROM timetable GROUP BY room, day HAVING COUNT(*) > 1))
  UNION ALL SELECT '(room, slot)', (SELECT COUNT(*) FROM (SELECT 1 FROM timetable GROUP BY room, slot HAVING COUNT(*) > 1))
  UNION ALL SELECT '(day, slot)',  (SELECT COUNT(*) FROM (SELECT 1 FROM timetable GROUP BY day, slot HAVING COUNT(*) > 1))
  UNION ALL SELECT '(teacher, day)', (SELECT COUNT(*) FROM (SELECT 1 FROM timetable GROUP BY teacher, day HAVING COUNT(*) > 1))
  UNION ALL SELECT '(room, day, slot)', (SELECT COUNT(*) FROM (SELECT 1 FROM timetable GROUP BY room, day, slot HAVING COUNT(*) > 1))
  UNION ALL SELECT '(teacher, day, slot)', (SELECT COUNT(*) FROM (SELECT 1 FROM timetable GROUP BY teacher, day, slot HAVING COUNT(*) > 1))
  UNION ALL SELECT '(course, day, slot)', (SELECT COUNT(*) FROM (SELECT 1 FROM timetable GROUP BY course, day, slot HAVING COUNT(*) > 1))
)
SELECT column_set, duplicate_groups,
       CASE WHEN duplicate_groups = 0 THEN 'unique' ELSE 'not unique' END AS verdict
FROM tests;` },
      complexity: `<p>Each test is a GROUP BY: O(N log N) by sorting or O(N) by hashing. k tests ⇒ k passes. The unique indexes then make every future insert check O(log N).</p>`,
      followUps: ['With n columns there are 2<sup>n</sup> − 1 sets: how would you prune the search? (test small sets first; skip supersets of known keys)', 'Should the PK be (room, day, slot) or a surrogate id? Argue both.']
    }
  });

  practice.push({
    title: 'Full Referential-Integrity Audit of a Schema',
    level: 'Hard', tags: ['foreign key', 'anti-join', 'catalogue', 'data quality'], companies: ['Amazon', 'Snowflake', 'Goldman Sachs'],
    statement: `<p>A weekend batch job ran against the company database with foreign keys <b>off</b> and inserted bad rows. Produce one report that lists, for <b>every</b> foreign key in the schema, each broken reference: child table, FK column, the bad value, and the parent table it should exist in. Also cross-check the total with SQLite's built-in checker; the report itself must be the last result.</p>`,
    constraints: `<code>db: company</code>. Setup (run first): <code>PRAGMA foreign_keys = OFF;</code> then insert employee (20,'E020','Ghost Worker','ghost@corp.com', dept 99, manager 55, 50000,'2026-01-01'), assignment (2, project 999,'developer',10), parking spot ('P3-01', 3, emp 77), project (105,'Orphan Project', dept 50, 1000).`,
    example: `${H.table(['child_table', 'fk_column', 'bad_value', 'parent_table'], [['assignments', 'project_id', '999', 'projects'], ['employees', 'dept_id', '99', 'departments'], ['employees', 'manager_id', '55', 'employees'], ['parking_spots', 'emp_id', '77', 'employees'], ['projects', 'dept_id', '50', 'departments']])}<p>5 broken references — the built-in checker also reports ${H.c('g', '5')}.</p>`,
    brute: {
      why: `<p>Checking only the FK you happen to remember (say employees.dept_id) finds 1 of 5 problems. Without walking the catalogue, every new FK added later is silently unaudited.</p>`,
      code: { lang: 'sql', db: 'company', code: `PRAGMA foreign_keys = OFF;
INSERT INTO employees VALUES (20,'E020','Ghost Worker','ghost@corp.com',99,55,50000,'2026-01-01');
INSERT INTO assignments VALUES (2, 999, 'developer', 10);
INSERT INTO parking_spots VALUES ('P3-01', 3, 77);
INSERT INTO projects VALUES (105, 'Orphan Project', 50, 1000);
-- Only the one FK we remembered:
SELECT emp_id, dept_id FROM employees WHERE dept_id NOT IN (SELECT dept_id FROM departments);` }
    },
    mcq: { q: 'Why must the anti-join for <code>manager_id</code> skip NULLs?', options: ['A NULL FK means "no manager" and is valid', 'NULLs crash NOT EXISTS', 'SQLite does not index NULLs', 'NULL equals 0'], answer: 0, explain: 'Referential integrity only applies to non-NULL FK values; top managers legitimately have manager_id = NULL.' },
    hints: [
      `<p>Hint 1: list all FKs from the catalogue first: <code>pragma_foreign_key_list(table)</code> for each table — 6 FK columns in this schema.</p>`,
      `<p>Hint 2: write one anti-join per FK (<code>WHERE fk IS NOT NULL AND NOT EXISTS (SELECT 1 FROM parent WHERE parent.key = child.fk)</code>), label each with literal table/column names, and UNION ALL them.</p>`,
      `<p>Hint 3: cross-check with <code>SELECT COUNT(*) FROM pragma_foreign_key_check</code> (no argument = whole database). Equal counts give confidence your manual report covers every FK.</p>`
    ],
    tests: { engine: 'sqlite', cmp: 'set', cases: [
      { cols: ['child_table', 'fk_column', 'bad_value', 'parent_table'], rows: [['employees', 'dept_id', 99, 'departments'], ['employees', 'manager_id', 55, 'employees'], ['parking_spots', 'emp_id', 77, 'employees'], ['projects', 'dept_id', 50, 'departments'], ['assignments', 'project_id', 999, 'projects']] },
      { setup: 'PRAGMA foreign_keys = OFF; DELETE FROM departments WHERE dept_id = 40;', cols: ['child_table', 'fk_column', 'bad_value', 'parent_table'], rows: [['employees', 'dept_id', 99, 'departments'], ['employees', 'manager_id', 55, 'employees'], ['parking_spots', 'emp_id', 77, 'employees'], ['projects', 'dept_id', 40, 'departments'], ['projects', 'dept_id', 50, 'departments'], ['assignments', 'project_id', 999, 'projects']] },
      { setup: 'PRAGMA foreign_keys = OFF; UPDATE employees SET manager_id = 999 WHERE emp_id = 4;', cols: ['child_table', 'fk_column', 'bad_value', 'parent_table'], rows: [['employees', 'dept_id', 99, 'departments'], ['employees', 'manager_id', 999, 'employees'], ['employees', 'manager_id', 55, 'employees'], ['parking_spots', 'emp_id', 77, 'employees'], ['projects', 'dept_id', 50, 'departments'], ['assignments', 'project_id', 999, 'projects']] },
      { setup: 'PRAGMA foreign_keys = OFF; INSERT INTO assignments VALUES (4, 999, \'qa\', 5);', cols: ['child_table', 'fk_column', 'bad_value', 'parent_table'], rows: [['employees', 'dept_id', 99, 'departments'], ['employees', 'manager_id', 55, 'employees'], ['parking_spots', 'emp_id', 77, 'employees'], ['projects', 'dept_id', 50, 'departments'], ['assignments', 'project_id', 999, 'projects'], ['assignments', 'project_id', 999, 'projects']] },
      { setup: 'PRAGMA foreign_keys = OFF; DELETE FROM departments WHERE dept_id = 10;', cols: ['child_table', 'fk_column', 'bad_value', 'parent_table'], rows: [['employees', 'dept_id', 10, 'departments'], ['employees', 'dept_id', 10, 'departments'], ['employees', 'dept_id', 10, 'departments'], ['employees', 'dept_id', 10, 'departments'], ['employees', 'dept_id', 99, 'departments'], ['employees', 'manager_id', 55, 'employees'], ['parking_spots', 'emp_id', 77, 'employees'], ['projects', 'dept_id', 10, 'departments'], ['projects', 'dept_id', 10, 'departments'], ['projects', 'dept_id', 50, 'departments'], ['assignments', 'project_id', 999, 'projects']] },
      { setup: 'PRAGMA foreign_keys = OFF; DELETE FROM employees WHERE emp_id = 1;', cols: ['child_table', 'fk_column', 'bad_value', 'parent_table'], rows: [['employees', 'dept_id', 99, 'departments'], ['employees', 'manager_id', 1, 'employees'], ['employees', 'manager_id', 1, 'employees'], ['employees', 'manager_id', 1, 'employees'], ['employees', 'manager_id', 55, 'employees'], ['parking_spots', 'emp_id', 1, 'employees'], ['parking_spots', 'emp_id', 77, 'employees'], ['projects', 'dept_id', 50, 'departments'], ['assignments', 'emp_id', 1, 'employees'], ['assignments', 'project_id', 999, 'projects']] },
      { setup: 'PRAGMA foreign_keys = OFF; DELETE FROM projects; DELETE FROM parking_spots;', cols: ['child_table', 'fk_column', 'bad_value', 'parent_table'], rows: [['employees', 'dept_id', 99, 'departments'], ['employees', 'manager_id', 55, 'employees'], ['parking_spots', 'emp_id', 77, 'employees'], ['projects', 'dept_id', 50, 'departments'], ['assignments', 'project_id', 100, 'projects'], ['assignments', 'project_id', 100, 'projects'], ['assignments', 'project_id', 999, 'projects'], ['assignments', 'project_id', 101, 'projects'], ['assignments', 'project_id', 100, 'projects'], ['assignments', 'project_id', 101, 'projects'], ['assignments', 'project_id', 102, 'projects'], ['assignments', 'project_id', 102, 'projects'], ['assignments', 'project_id', 103, 'projects'], ['assignments', 'project_id', 103, 'projects'], ['assignments', 'project_id', 101, 'projects']] }
    ] },
    solution: {
      approach: `<p>Step 1: enumerate the FKs from the catalogue so none is forgotten. Step 2: one anti-join per FK, all stacked into one report. Step 3: compare with the engine's own checker. In a real system you would generate step 2 from step 1 automatically (a script reading <code>information_schema.referential_constraints</code>) and run it nightly.</p>`,
      code: { lang: 'sql', db: 'company', code: `PRAGMA foreign_keys = OFF;
INSERT INTO employees VALUES (20,'E020','Ghost Worker','ghost@corp.com',99,55,50000,'2026-01-01');
INSERT INTO assignments VALUES (2, 999, 'developer', 10);
INSERT INTO parking_spots VALUES ('P3-01', 3, 77);
INSERT INTO projects VALUES (105, 'Orphan Project', 50, 1000);

-- 1) Every FK in the schema, from the catalogue
SELECT m.name AS child_table, f."from" AS fk_column, f."table" AS parent_table, f."to" AS parent_key
FROM sqlite_master m, pragma_foreign_key_list(m.name) f
WHERE m.type = 'table'
ORDER BY 1, 2;

-- 2) Cross-check the total with the engine (expect 5)
SELECT COUNT(*) AS builtin_violations FROM pragma_foreign_key_check;

-- 3) One anti-join per FK, stacked: the final report
SELECT 'employees' AS child_table, 'dept_id' AS fk_column, e.dept_id AS bad_value, 'departments' AS parent_table
FROM employees e WHERE e.dept_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM departments d WHERE d.dept_id = e.dept_id)
UNION ALL
SELECT 'employees', 'manager_id', e.manager_id, 'employees'
FROM employees e WHERE e.manager_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM employees m WHERE m.emp_id = e.manager_id)
UNION ALL
SELECT 'parking_spots', 'emp_id', p.emp_id, 'employees'
FROM parking_spots p WHERE p.emp_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM employees e WHERE e.emp_id = p.emp_id)
UNION ALL
SELECT 'projects', 'dept_id', pr.dept_id, 'departments'
FROM projects pr WHERE NOT EXISTS (SELECT 1 FROM departments d WHERE d.dept_id = pr.dept_id)
UNION ALL
SELECT 'assignments', 'emp_id', a.emp_id, 'employees'
FROM assignments a WHERE NOT EXISTS (SELECT 1 FROM employees e WHERE e.emp_id = a.emp_id)
UNION ALL
SELECT 'assignments', 'project_id', a.project_id, 'projects'
FROM assignments a WHERE NOT EXISTS (SELECT 1 FROM projects p WHERE p.project_id = a.project_id)
ORDER BY 1, 2;

` },
      complexity: `<p>Each anti-join is O(C log P) using the parent's PK index; total O(sum of child rows × log parent rows). Fine nightly even for large tables; for billions of rows, run it per partition or on a replica.</p>`,
      followUps: ['Generate the UNION ALL query automatically from step 1 (dynamic SQL / a script).', 'Decide per orphan type: delete, reassign to a placeholder parent, or create the missing parent?', 'How would this audit work if departments lived in a different service\'s database?']
    }
  });

  practice.push({
    title: 'Design the Core E-commerce Schema From a Story',
    level: 'Hard', tags: ['schema design', 'keys', 'relationships', 'DDL'], companies: ['Amazon', 'Shopify', 'Walmart Global Tech'],
    statement: `<p>Story: <i>"Customers register with a unique email. A customer can save several addresses. A customer places orders; each order ships to one of that customer's addresses. An order contains several products with a quantity and the price paid at that moment. Each order has at most one payment record. Products have a unique SKU and a non-negative price. Deleting an order must remove its lines; customers with orders must never be deleted."</i> Write the DDL with every key, relationship and referential action, insert a small sample, and output each order's total.</p>`,
    constraints: `Self-contained. Money in integer cents. Tables: <code>customers(customer_id, email, full_name)</code>, <code>addresses(address_id, customer_id, line1, city)</code>, <code>products(product_id, sku, name, price_cents)</code>, <code>orders(order_id, customer_id, ship_address_id, placed_at)</code>, <code>order_items(order_id, product_id, qty, unit_price_cents)</code>, <code>payments(payment_id, order_id, amount_cents, method)</code>. Output (the last result): <code>order_id, customer, items, total_cents</code> ordered by order_id.`,
    example: `${H.table(['order_id', 'customer', 'items', 'total_cents'], [['1', 'asha@mail.com', '2', '14000'], ['2', 'ben@mail.com', '1', '3200']])}<p>Order 1 = 1 × 8900 + 2 × 2550 = ${H.c('g', '14000')}. Relationships: customers 1:N addresses, customers 1:N orders, orders N:M products (order_items), orders 1:1 payments.</p>`,
    brute: {
      why: `<p>One wide <code>orders</code> table with customer email, address text, product names and a total typed in by the app: customer and product facts repeat on every row (update anomalies), totals drift from line items, nothing prevents shipping to another customer's address, and a payment can be recorded twice.</p>`,
      code: { lang: 'sql', code: `CREATE TABLE orders_flat (order_ref TEXT, customer_email TEXT, address TEXT,
                          products TEXT, total REAL, paid TEXT);
INSERT INTO orders_flat VALUES ('1', 'asha@mail.com', '12 MG Road, Pune', 'Keyboard x1; Mouse x2', 140.0, 'yes'),
                               ('1', 'asha@mail.com', 'MG Rd 12', 'Keyboard x1', 89.0, 'yes');   -- same order, two stories
SELECT order_ref, COUNT(*) AS versions, SUM(total) AS double_counted FROM orders_flat GROUP BY order_ref;` }
    },
    mcq: { q: 'How do you guarantee an order ships only to an address of the SAME customer?', options: ['Composite FK (customer_id, address_id) → addresses(customer_id, address_id) with UNIQUE on that pair', 'FK address_id → addresses(address_id) is enough', 'A CHECK constraint comparing two tables', 'It cannot be done in SQL'], answer: 0, explain: 'A plain FK only proves the address exists. Making addresses expose UNIQUE(customer_id, address_id) and referencing the pair ties the address to the order\'s customer.' },
    hints: [
      `<p>Hint 1: underline nouns (customer, address, order, product, order line, payment) → tables; verbs + "several / one / at most one" → relationships and FK placement.</p>`,
      `<p>Hint 2: orders N:M products ⇒ <code>order_items(order_id, product_id, qty, unit_price_cents)</code> with PK pair and ON DELETE CASCADE from orders. orders 1:1 payments ⇒ <code>payments.order_id UNIQUE</code>. customers → orders is RESTRICT.</p>`,
      `<p>Hint 3: the "same customer's address" rule needs a composite FK: <code>FOREIGN KEY (customer_id, ship_address_id) REFERENCES addresses(customer_id, address_id)</code>, which requires <code>UNIQUE (customer_id, address_id)</code> on addresses. Totals are derived: SUM(qty × unit_price_cents).</p>`
    ],
    tests: { engine: 'sqlite', cases: [
      { cols: ['order_id', 'customer', 'items', 'total_cents'], rows: [[1, 'asha@mail.com', 2, 14000], [2, 'ben@mail.com', 1, 3200]] },
      { after: 'INSERT INTO customers (email, full_name) VALUES (\'asha@mail.com\', \'Another Asha\')', error: 'UNIQUE|duplicate' },
      { after: 'INSERT INTO products (sku, name, price_cents) VALUES (\'X1\', \'Bad\', -1)', error: 'CHECK' },
      { after: 'INSERT INTO products (sku, name, price_cents) VALUES (\'KB-001\', \'Dup\', 1)', error: 'UNIQUE|duplicate' },
      { after: 'INSERT INTO orders (customer_id, ship_address_id) VALUES (1, 20)', error: 'FOREIGN KEY' },
      { after: 'INSERT INTO payments (order_id, amount_cents, method) VALUES (1, 100, \'card\')', error: 'UNIQUE|duplicate' },
      { after: 'DELETE FROM customers WHERE customer_id = 1', error: 'FOREIGN KEY' },
      { after: 'DELETE FROM orders WHERE order_id = 2; SELECT COUNT(*) FROM order_items', rows: [[2]] },
      { after: 'INSERT INTO addresses (customer_id, line1, city) VALUES (1, \'1 Third St\', \'Delhi\'); SELECT COUNT(*) FROM addresses WHERE customer_id = 1', rows: [[3]] },
      { after: 'INSERT INTO customers (customer_id, email, full_name) VALUES (3, \'c@mail.com\', \'C\'); DELETE FROM customers WHERE customer_id = 3; SELECT COUNT(*) FROM customers', rows: [[2]] }
    ] },
    solution: {
      approach: `<p>Translate each sentence into a structure: entities get surrogate PKs plus UNIQUE natural keys (email, SKU); "several" puts the FK on the many side; N:M becomes order_items carrying qty and the historical price; "at most one payment" is UNIQUE on payments.order_id; delete rules become ON DELETE CASCADE / RESTRICT; the address-ownership rule becomes a composite FK. Totals are computed, never stored by hand, so they cannot drift.</p>`,
      code: { lang: 'sql', code: `PRAGMA foreign_keys = ON;

CREATE TABLE customers (
  customer_id INTEGER PRIMARY KEY,
  email       TEXT NOT NULL UNIQUE,
  full_name   TEXT NOT NULL
);
CREATE TABLE addresses (                                   -- customers 1 : N addresses
  address_id  INTEGER PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(customer_id) ON DELETE CASCADE,
  line1       TEXT NOT NULL,
  city        TEXT NOT NULL,
  UNIQUE (customer_id, address_id)                         -- target for the composite FK below
);
CREATE TABLE products (
  product_id  INTEGER PRIMARY KEY,
  sku         TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  price_cents INTEGER NOT NULL CHECK (price_cents >= 0)
);
CREATE TABLE orders (                                      -- customers 1 : N orders
  order_id        INTEGER PRIMARY KEY,
  customer_id     INTEGER NOT NULL REFERENCES customers(customer_id) ON DELETE RESTRICT,
  ship_address_id INTEGER NOT NULL,
  placed_at       TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (customer_id, ship_address_id)               -- address must belong to THIS customer
    REFERENCES addresses(customer_id, address_id)
);
CREATE TABLE order_items (                                 -- orders N : M products
  order_id         INTEGER NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
  product_id       INTEGER NOT NULL REFERENCES products(product_id) ON DELETE RESTRICT,
  qty              INTEGER NOT NULL CHECK (qty > 0),
  unit_price_cents INTEGER NOT NULL CHECK (unit_price_cents >= 0),   -- price at purchase time
  PRIMARY KEY (order_id, product_id)
);
CREATE TABLE payments (                                    -- orders 1 : 1 payments
  payment_id   INTEGER PRIMARY KEY,
  order_id     INTEGER NOT NULL UNIQUE REFERENCES orders(order_id) ON DELETE CASCADE,
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  method       TEXT NOT NULL CHECK (method IN ('card', 'upi', 'wallet'))
);

INSERT INTO customers VALUES (1, 'asha@mail.com', 'Asha Verma'), (2, 'ben@mail.com', 'Ben Carter');
INSERT INTO addresses VALUES (10, 1, '12 MG Road', 'Pune'), (11, 1, '5 Office Park', 'Mumbai'), (20, 2, '9 Park Lane', 'Leeds');
INSERT INTO products VALUES (100, 'KB-001', 'Keyboard', 8900), (101, 'MS-002', 'Mouse', 2550), (102, 'BK-SQL', 'SQL for Humans', 3200);
INSERT INTO orders (order_id, customer_id, ship_address_id) VALUES (1, 1, 11), (2, 2, 20);
INSERT INTO order_items VALUES (1, 100, 1, 8900), (1, 101, 2, 2550), (2, 102, 1, 3200);
INSERT INTO payments (order_id, amount_cents, method) VALUES (1, 14000, 'upi');

-- Rules in action (refused quietly with OR IGNORE)
INSERT OR IGNORE INTO payments (order_id, amount_cents, method) VALUES (1, 14000, 'card');   -- 2nd payment: UNIQUE
SELECT COUNT(*) AS payments_for_order_1 FROM payments WHERE order_id = 1;                    -- 1

SELECT o.order_id, c.email AS customer, COUNT(*) AS items,
       SUM(oi.qty * oi.unit_price_cents) AS total_cents
FROM orders o
JOIN customers c    ON c.customer_id = o.customer_id
JOIN order_items oi ON oi.order_id   = o.order_id
GROUP BY o.order_id, c.email
ORDER BY o.order_id;` },
      complexity: `<p>Each insert checks O(1) CHECKs and O(log N) index lookups per key/FK. Order totals: one pass over the order's lines via the PK prefix (order_id). Add indexes on FK columns used for lookups (<code>orders(customer_id)</code>, <code>order_items(product_id)</code>).</p>`,
      followUps: ['Shipping to Ben\'s address on Asha\'s order fails with FK on — why exactly?', 'Add order status history (placed → shipped → delivered): new table or column?', 'Where would you denormalise for a high-traffic "my orders" page, and how do you keep it consistent?']
    }
  });

  practice.push({
    title: 'Tighten an Existing Table Safely (SQLite Rebuild Migration)',
    level: 'Hard', tags: ['DDL', 'ALTER TABLE', 'transaction', 'migration'], companies: ['Apple', 'Notion', 'Dropbox'],
    statement: `<p>The school's <code>students</code> table is too loose: <code>city</code> may be NULL and <code>email</code> has no format rule. A bad email <code>'farid-at-mail'</code> has crept in. Change the table so <code>city</code> is NOT NULL (default 'Unknown') and <code>email</code> must look like an email (or be NULL), <b>without losing any row or breaking the FKs</b> from <code>id_cards</code> and <code>enrollments</code>.</p>`,
    constraints: `<code>db: school</code>. First run <code>UPDATE students SET email = 'farid-at-mail' WHERE student_id = 6;</code>. SQLite cannot add a CHECK or NOT NULL to an existing column with ALTER TABLE. Change nothing else: other columns keep their rules. The last result lists <code>student_id, name, email, city</code> ordered by student_id.`,
    example: `${H.table(['student_id', 'name', 'email', 'city'], [['3', 'Chen Wei', 'NULL', 'Shanghai'], ['6', 'Farid Khan', H.c('y', 'NULL (bad value cleared)'), H.c('y', 'Unknown')], ['…', '…', '…', '…']])}<p>All 8 students and all 14 enrolments survive; <code>pragma_foreign_key_check</code> returns ${H.c('g', '0')} problems.</p>`,
    brute: {
      why: `<p>Dropping the table and re-creating it from scratch, then re-typing the data, loses every row (or every FK-linked child row with FKs on). Alternatively "just leave it" and validate in the app — the bad email proves that does not work.</p>`,
      code: { lang: 'sql', db: 'school', code: `UPDATE students SET email = 'farid-at-mail' WHERE student_id = 6;
-- "Validate in the app instead": the database still happily accepts garbage
UPDATE students SET email = 'still-not-an-email', city = NULL WHERE student_id = 7;
SELECT student_id, name, email, city FROM students WHERE student_id IN (6, 7);` }
    },
    mcq: { q: 'Why turn foreign keys OFF before dropping the old students table in this migration?', options: ['DROP TABLE with FKs on would act like DELETE of all rows and fail (or cascade) because children reference it', 'Because ALTER TABLE RENAME requires it', 'To make the copy faster only', 'FKs must always be off during transactions'], answer: 0, explain: 'SQLite performs an implicit DELETE on DROP TABLE when FKs are on. The documented rebuild recipe disables FKs, rebuilds inside a transaction, runs foreign_key_check, commits and re-enables.' },
    hints: [
      `<p>Hint 1: SQLite's documented recipe: FKs off → BEGIN → CREATE new table with the desired constraints → INSERT … SELECT from old (cleaning data on the way) → DROP old → RENAME new to old name → check FKs → COMMIT → FKs on.</p>`,
      `<p>Hint 2: clean while copying: <code>COALESCE(city, 'Unknown')</code>, and <code>CASE WHEN email LIKE '%_@_%._%' THEN email END</code> turns a bad email into NULL instead of failing the CHECK.</p>`,
      `<p>Hint 3: after the rename, child FKs that say <code>REFERENCES students</code> point at the new table automatically. Run <code>SELECT COUNT(*) FROM pragma_foreign_key_check</code> before COMMIT — it must be 0.</p>`
    ],
    tests: { engine: 'sqlite', cases: [
      { cols: ['student_id', 'name', 'email', 'city'], rows: [[1, 'Asha Verma', 'asha@mail.com', 'Pune'], [2, 'Ben Carter', 'ben@mail.com', 'Leeds'], [3, 'Chen Wei', null, 'Shanghai'], [4, 'Diya Shah', 'diya@mail.com', 'Pune'], [5, 'Elena Rossi', 'elena@mail.com', 'Milan'], [6, 'Farid Khan', null, 'Unknown'], [7, 'Grace Lee', null, 'Seoul'], [8, 'Hugo Martin', 'hugo@mail.com', 'Lyon']] },
      { setup: 'UPDATE students SET city = NULL WHERE student_id IN (1, 3, 8);', cols: ['student_id', 'name', 'email', 'city'], rows: [[1, 'Asha Verma', 'asha@mail.com', 'Unknown'], [2, 'Ben Carter', 'ben@mail.com', 'Leeds'], [3, 'Chen Wei', null, 'Unknown'], [4, 'Diya Shah', 'diya@mail.com', 'Pune'], [5, 'Elena Rossi', 'elena@mail.com', 'Milan'], [6, 'Farid Khan', null, 'Unknown'], [7, 'Grace Lee', null, 'Seoul'], [8, 'Hugo Martin', 'hugo@mail.com', 'Unknown']] },
      { setup: 'UPDATE students SET email = \'hugo-at-mail\' WHERE student_id = 8;', cols: ['student_id', 'name', 'email', 'city'], rows: [[1, 'Asha Verma', 'asha@mail.com', 'Pune'], [2, 'Ben Carter', 'ben@mail.com', 'Leeds'], [3, 'Chen Wei', null, 'Shanghai'], [4, 'Diya Shah', 'diya@mail.com', 'Pune'], [5, 'Elena Rossi', 'elena@mail.com', 'Milan'], [6, 'Farid Khan', null, 'Unknown'], [7, 'Grace Lee', null, 'Seoul'], [8, 'Hugo Martin', null, 'Lyon']] },
      { setup: 'UPDATE students SET joined_on = NULL WHERE student_id = 2;', cols: ['student_id', 'name', 'email', 'city'], rows: [[1, 'Asha Verma', 'asha@mail.com', 'Pune'], [2, 'Ben Carter', 'ben@mail.com', 'Leeds'], [3, 'Chen Wei', null, 'Shanghai'], [4, 'Diya Shah', 'diya@mail.com', 'Pune'], [5, 'Elena Rossi', 'elena@mail.com', 'Milan'], [6, 'Farid Khan', null, 'Unknown'], [7, 'Grace Lee', null, 'Seoul'], [8, 'Hugo Martin', 'hugo@mail.com', 'Lyon']] },
      { setup: 'UPDATE students SET city = \'\' WHERE student_id = 4;', cols: ['student_id', 'name', 'email', 'city'], rows: [[1, 'Asha Verma', 'asha@mail.com', 'Pune'], [2, 'Ben Carter', 'ben@mail.com', 'Leeds'], [3, 'Chen Wei', null, 'Shanghai'], [4, 'Diya Shah', 'diya@mail.com', ''], [5, 'Elena Rossi', 'elena@mail.com', 'Milan'], [6, 'Farid Khan', null, 'Unknown'], [7, 'Grace Lee', null, 'Seoul'], [8, 'Hugo Martin', 'hugo@mail.com', 'Lyon']] },
      { setup: 'INSERT INTO students (student_id, roll_no, name, email, city, joined_on) VALUES (9, \'R2024-009\', \'Ivy Chen\', \'ivy@mail.com\', NULL, \'2024-08-03\');', cols: ['student_id', 'name', 'email', 'city'], rows: [[1, 'Asha Verma', 'asha@mail.com', 'Pune'], [2, 'Ben Carter', 'ben@mail.com', 'Leeds'], [3, 'Chen Wei', null, 'Shanghai'], [4, 'Diya Shah', 'diya@mail.com', 'Pune'], [5, 'Elena Rossi', 'elena@mail.com', 'Milan'], [6, 'Farid Khan', null, 'Unknown'], [7, 'Grace Lee', null, 'Seoul'], [8, 'Hugo Martin', 'hugo@mail.com', 'Lyon'], [9, 'Ivy Chen', 'ivy@mail.com', 'Unknown']] },
      { after: 'INSERT INTO students (roll_no, name, email, joined_on) VALUES (\'R2026-001\', \'Test\', \'nope\', \'2026-01-01\')', error: 'CHECK' },
      { after: 'INSERT INTO students (roll_no, name, city, joined_on) VALUES (\'R2026-002\', \'Test\', NULL, \'2026-01-01\')', error: 'NOT NULL' },
      { after: 'INSERT INTO students (roll_no, name, joined_on) VALUES (\'R2026-003\', \'Test\', \'2026-01-01\'); SELECT city, email FROM students WHERE roll_no = \'R2026-003\'', rows: [['Unknown', null]] },
      { after: 'SELECT COUNT(*) FROM pragma_foreign_key_check', rows: [[0]] },
      { after: 'SELECT COUNT(*) FROM id_cards c JOIN students s ON s.student_id = c.student_id', rows: [[5]] },
      { after: 'SELECT COUNT(*) FROM enrollments e JOIN students s ON s.student_id = e.student_id', rows: [[14]] },
      { after: 'INSERT INTO students (roll_no, name, email, joined_on) VALUES (\'R2026-004\', \'Dup\', \'asha@mail.com\', \'2026-01-01\')', error: 'UNIQUE|duplicate' }
    ] },
    solution: {
      approach: `<p>Rebuild-and-swap inside one transaction: create <code>students_new</code> with the stricter rules, copy every row through a cleaning SELECT, drop the old table, rename the new one into place, verify referential integrity, commit, re-enable enforcement. In PostgreSQL the same goal is two ALTERs: <code>ALTER COLUMN city SET NOT NULL</code> and <code>ADD CONSTRAINT … CHECK (…) NOT VALID</code> + <code>VALIDATE CONSTRAINT</code>.</p>`,
      code: { lang: 'sql', db: 'school', code: `UPDATE students SET email = 'farid-at-mail' WHERE student_id = 6;   -- the bad row

PRAGMA foreign_keys = OFF;
BEGIN;
CREATE TABLE students_new (
  student_id INTEGER PRIMARY KEY,
  roll_no    TEXT NOT NULL UNIQUE,
  name       TEXT NOT NULL,
  email      TEXT UNIQUE CHECK (email IS NULL OR email LIKE '%_@_%._%'),
  city       TEXT NOT NULL DEFAULT 'Unknown',
  dept_id    INTEGER REFERENCES departments(dept_id),
  joined_on  TEXT
);
INSERT INTO students_new (student_id, roll_no, name, email, city, dept_id, joined_on)
SELECT student_id, roll_no, name,
       CASE WHEN email LIKE '%_@_%._%' THEN email END,     -- bad email -> NULL
       COALESCE(city, 'Unknown'),                            -- missing city -> default
       dept_id, joined_on
FROM students;
DROP TABLE students;
ALTER TABLE students_new RENAME TO students;
SELECT COUNT(*) AS fk_problems FROM pragma_foreign_key_check;   -- must be 0 before COMMIT
COMMIT;
PRAGMA foreign_keys = ON;

-- Verify data and rules
SELECT COUNT(*) AS enrollments_still_linked
FROM enrollments e JOIN students s ON s.student_id = e.student_id;   -- 14
INSERT OR IGNORE INTO students (roll_no, name, email, joined_on)
VALUES ('R2026-001', 'Test', 'nope', '2026-01-01');                -- refused by the new CHECK
SELECT COUNT(*) AS students_now FROM students;                      -- still 8

SELECT student_id, name, email, city FROM students ORDER BY student_id;   -- the final result` },
      complexity: `<p>O(N) to copy N rows plus rebuilding indexes O(N log N). The table is locked for the duration — on a big production table use an online migration (shadow table + backfill + swap) instead.</p>`,
      followUps: ['What would break if a VIEW or TRIGGER referenced students? (they must be recreated in the same transaction)', 'Write the PostgreSQL version with NOT VALID / VALIDATE CONSTRAINT and explain why it avoids a long lock.', 'Store the bad emails you nulled in an audit table before clearing them.']
    }
  });

  /* ======================================================================
     QUIZ
     ====================================================================== */
  quiz.push(
    { q: 'Which statement best describes a DBMS?', options: ['Software that stores, queries and protects data for many users', 'The data itself, stored on disk', 'A spreadsheet with formulas', 'A programming language for web pages'], answer: 0, explain: 'The database is the data; the DBMS (PostgreSQL, MySQL, SQLite…) is the software managing storage, queries, integrity, concurrency, recovery and security.' },
    { q: 'A table has 6 columns and 1,000 rows. What are its degree and cardinality?', options: ['Degree 6, cardinality 1,000', 'Degree 1,000, cardinality 6', 'Degree 6,000', 'Degree 1, cardinality 6'], answer: 0, explain: 'Degree = number of attributes (columns); cardinality = number of tuples (rows).' },
    { q: 'R(A, B, C) has candidate keys {A} and {B, C}. Which is a super key but NOT a candidate key?', options: ['{A, B}', '{A}', '{B, C}', '{C}'], answer: 0, explain: '{A, B} contains the key {A}, so it is unique, but B is unnecessary — not minimal. {C} alone is not unique.' },
    { q: 'Which property must a primary key have that a plain UNIQUE column need not?', options: ['NOT NULL', 'An index', 'Integer type', 'Auto-increment'], answer: 0, explain: 'Entity integrity: a PK identifies every row, so it can never be NULL. UNIQUE columns may hold NULLs in most engines.' },
    { q: 'Students and courses: a student takes many courses and a course has many students. How is it stored?', options: ['A junction table enrollments(student_id, course_id) with both FKs', 'A course_id column in students', 'A student_ids list column in courses', 'Two FKs pointing at each other'], answer: 0, explain: 'N : M needs its own table of pairs; neither side can hold the link in one atomic cell.' },
    { q: 'For departments 1 : N employees, where does the foreign key go?', options: ['employees.dept_id', 'departments.emp_id', 'In a junction table', 'In both tables'], answer: 0, explain: 'The FK always goes on the "many" side, so each child row stores exactly one parent key.' },
    { q: 'What turns a FK-based 1 : N relationship into 1 : 1?', options: ['A UNIQUE constraint on the foreign key column', 'ON DELETE CASCADE', 'Making the FK NOT NULL', 'Adding an index on the parent'], answer: 0, explain: 'UNIQUE on the FK means each parent can be referenced by at most one child.' },
    { q: 'An FK is declared <code>ON DELETE SET NULL</code>. You delete the parent row. What happens to its children?', options: ['They stay, with the FK column set to NULL', 'They are deleted too', 'The delete is refused', 'They point at the next parent'], answer: 0, explain: 'SET NULL keeps the children and unlinks them; CASCADE would delete them; RESTRICT/NO ACTION would refuse the delete.' },
    { q: 'Which of these is DDL?', options: ['<code>ALTER TABLE students ADD COLUMN phone TEXT</code>', '<code>UPDATE students SET city = \'Pune\'</code>', '<code>SELECT * FROM students</code>', '<code>GRANT SELECT ON students TO bob</code>'], answer: 0, explain: 'ALTER changes structure (DDL). UPDATE is DML, SELECT is DQL, GRANT is DCL.' },
    { q: 'Which statement can remove only some rows and be rolled back in every major DBMS?', options: ['<code>DELETE FROM t WHERE …</code>', '<code>TRUNCATE TABLE t</code>', '<code>DROP TABLE t</code>', '<code>ALTER TABLE t DROP COLUMN c</code>'], answer: 0, explain: 'DELETE is DML: it accepts WHERE and is transactional everywhere. TRUNCATE/DROP are DDL, remove everything, and are not rollback-able in MySQL/Oracle.' },
    { q: 'Inside a transaction you run UPDATE, then SAVEPOINT s, then DELETE, then ROLLBACK TO s, then COMMIT. What is saved?', options: ['Only the UPDATE', 'Both UPDATE and DELETE', 'Nothing', 'Only the DELETE'], answer: 0, explain: 'ROLLBACK TO s undoes work after the savepoint (the DELETE) but keeps the transaction open; COMMIT then saves the UPDATE.' },
    { q: '<code>age INTEGER CHECK (age &gt;= 16)</code>. You insert a row with age = NULL. Result?', options: ['Accepted: the CHECK is UNKNOWN, not FALSE', 'Rejected by the CHECK', 'Age becomes 16', 'Age becomes 0'], answer: 0, explain: 'CHECK rejects only FALSE. NULL ≥ 16 is UNKNOWN, so it passes. Add NOT NULL if the value is required.' },
    { q: 'In plain SQLite (not STRICT), you insert <code>\'abc\'</code> into an INTEGER column. What happens?', options: ['It is stored as TEXT \'abc\' (type affinity)', 'Error: type mismatch', 'It is stored as 0', 'It is stored as NULL'], answer: 0, explain: 'SQLite treats declared types as affinity hints; STRICT tables (or CHECK(typeof(col) = \'integer\')) enforce real types.' },
    { q: 'Why is <code>email</code> usually a poor choice for a primary key?', options: ['It can change, and every FK copy would have to change too', 'Emails cannot be unique', 'Text columns cannot be primary keys', 'It is too short'], answer: 0, explain: 'PKs should be stable and small. Use a surrogate id as PK and keep email as a UNIQUE alternate key.' },
    { q: 'You want to find rows in <code>orders</code> whose <code>customer_id</code> has no matching customer. Which pattern?', options: ['<code>WHERE NOT EXISTS (SELECT 1 FROM customers c WHERE c.customer_id = o.customer_id)</code>', '<code>INNER JOIN customers</code>', '<code>WHERE customer_id = NULL</code>', '<code>GROUP BY customer_id</code>'], answer: 0, explain: 'An anti-join (NOT EXISTS, or LEFT JOIN … IS NULL) keeps child rows with no parent — orphans.' }
  );

  /* ======================================================================
     INTERVIEW Q&A
     ====================================================================== */
  interview.push(
    { q: 'What is the difference between a database, a DBMS and an RDBMS?', level: 'B', a: `<p>The <b>database</b> is the organised data itself (customers, orders). A <b>DBMS</b> is the software that stores it and provides querying, integrity constraints, concurrency control, crash recovery and security — PostgreSQL, MySQL, SQLite, MongoDB. An <b>RDBMS</b> is a DBMS built on the relational model: data in tables (relations), linked by keys, queried with SQL. MongoDB is a DBMS but not an RDBMS; SQLite is an RDBMS. "Database system" usually means database + DBMS + the applications.</p>`, followUps: ['Name three things a DBMS does that a folder of CSV files cannot.', 'Is SQLite a "real" database? When would you not use it?'] },
    { q: 'Why use a DBMS instead of flat files or spreadsheets?', level: 'B', a: `<p>Files push all the hard problems onto every application: <b>redundancy and inconsistency</b> (the same customer typed on many lines with different cities), <b>hard ad-hoc queries</b> (a new script per question), <b>concurrency</b> (two writers overwrite each other — lost updates), <b>crash safety</b> (half-written files), <b>integrity</b> (no types or rules), and <b>security</b> (all or nothing). A DBMS solves these once: declarative SQL, constraints, transactions with a write-ahead log, locking/MVCC, and GRANT-based permissions — plus data independence, so storage can change without rewriting apps.</p>`, followUps: ['What is data independence (logical vs physical)?', 'Give an example of an update anomaly from a spreadsheet.'] },
    { q: 'Explain super key, candidate key, primary key and alternate key with one example.', level: 'B', a: `<p>Table <code>students(student_id, roll_no, email, name)</code>, where id, roll_no and email are each unique. A <b>super key</b> is any column set that is unique: {student_id}, {student_id, name}, {roll_no, email}… A <b>candidate key</b> is a minimal super key — remove any column and it stops being unique: {student_id}, {roll_no}, {email}. The <b>primary key</b> is the one candidate key chosen as the official identity (unique + NOT NULL + stable): student_id. The remaining candidates, roll_no and email, are <b>alternate keys</b> and should be declared UNIQUE.</p>`, followUps: ['How many super keys does R(A,B,C,D) have if {A} is its only candidate key? (8)', 'Can a table have no candidate key at all?'] },
    { q: 'Natural key or surrogate key — which would you choose for a users table, and why?', level: 'I', a: `<p>Usually a <b>surrogate</b> PK (BIGINT identity or a UUIDv7) plus a <b>UNIQUE</b> constraint on the natural key (email). Reasons: natural values change (email, phone), and a PK is copied into every FK, index and URL, so changes would cascade everywhere; surrogates are small, stable and leak no personal data. The UNIQUE constraint still stops duplicate real users. Natural keys are fine when they are truly stable, short and externally guaranteed — ISO country codes, currency codes, or a junction table's composite key.</p>`, followUps: ['Auto-increment vs UUIDv4 vs UUIDv7: impact on B+tree inserts?', 'What breaks if you forget the UNIQUE on email after adding a surrogate id?'] },
    { q: 'What is referential integrity and how do foreign keys enforce it?', level: 'B', a: `<p><b>Referential integrity</b> means every non-NULL foreign-key value matches an existing key in the parent table — no orphans, no dangling references. A declared FOREIGN KEY makes the DBMS check it on every relevant change: inserting or updating a child with a non-existent parent is rejected; deleting or re-keying a parent with children triggers the chosen action — NO ACTION/RESTRICT (refuse), CASCADE (delete/update children too), SET NULL or SET DEFAULT. A NULL FK is allowed unless the column is NOT NULL. In SQLite, enforcement must be switched on per connection with <code>PRAGMA foreign_keys = ON</code>.</p>`, followUps: ['Difference between RESTRICT and NO ACTION?', 'Why should the child FK column be indexed?'] },
    { q: 'When would you use ON DELETE CASCADE, and when is it dangerous?', level: 'I', a: `<p>Use CASCADE when the child has no meaning without its parent — <b>order_items</b> of an order, <b>memberships</b> of a deleted group, <b>passport</b> of an erased person. It is dangerous for business records: CASCADE from customers to orders would wipe purchase and tax history with one DELETE; long CASCADE chains can delete millions of rows inside one transaction, holding locks and bloating the log. For important entities prefer RESTRICT plus soft deletes (<code>deleted_at</code>) or explicit, reviewed clean-up jobs.</p>`, followUps: ['How do you implement a GDPR erasure when orders must be kept for 7 years?', 'What does SET NULL require of the FK column?'] },
    { q: 'How do you implement 1 : 1, 1 : N and N : M relationships in tables?', level: 'B', a: `<p><b>1 : N</b> — put the FK on the "many" side (<code>students.dept_id → departments</code>). <b>1 : 1</b> — FK in the dependent table plus <b>UNIQUE</b> on it (<code>id_cards.student_id UNIQUE</code>), or a shared primary key where the child's PK is also the FK. <b>N : M</b> — a junction table with two FKs and the pair as its primary key (<code>enrollments(student_id, course_id)</code>); attributes of the relationship (grade, qty, role) live there. Ask the cardinality question in both directions to decide.</p>`, followUps: ['Why not store a comma-separated list of course ids in students?', 'Model a 3-way relationship: supplier supplies part to project.'] },
    { q: 'Why is a many-to-many relationship really two one-to-many relationships?', level: 'I', a: `<p>Once you introduce the junction table, each side relates to it as one-to-many: one student → many enrolment rows; one course → many enrolment rows; each enrolment row points at exactly one student and one course. The junction is an entity in its own right ("an enrolment") with its own key and attributes (grade, semester). That view also explains indexing: you need an index for each direction (PK (student_id, course_id) plus an index on course_id), and it is how ER diagrams resolve M:N into two 1:N lines before generating tables.</p>`, followUps: ['When does the pair stop being a valid key? (retaking a course → add semester)', 'Junction table: composite PK or surrogate id + UNIQUE?'] },
    { q: 'Name the SQL command categories with examples. Where does SELECT belong?', level: 'B', a: `<p><b>DDL</b> (definition): CREATE, ALTER, DROP, TRUNCATE, RENAME. <b>DML</b> (manipulation): INSERT, UPDATE, DELETE, MERGE/UPSERT. <b>DQL</b> (query): SELECT. <b>DCL</b> (control): GRANT, REVOKE. <b>TCL</b> (transaction control): BEGIN/START TRANSACTION, COMMIT, ROLLBACK, SAVEPOINT, RELEASE. Many textbooks fold SELECT into DML (four categories) — both conventions are fine; the SQL standard itself groups statements differently. The categories matter practically: they map to permissions (an analyst gets DQL only) and to transactional behaviour (DDL auto-commits in MySQL/Oracle).</p>`, followUps: ['Is TRUNCATE DDL or DML, and why?', 'Which categories would you allow an AI agent to run?'] },
    { q: 'DELETE vs TRUNCATE vs DROP?', level: 'B', a: `<p><b>DELETE</b> (DML) removes selected rows (WHERE), row by row, logging each, firing triggers; it is transactional everywhere and keeps the table and identity counter. <b>TRUNCATE</b> (DDL) removes all rows by deallocating storage — very fast, no WHERE, no per-row triggers, usually resets identity; rollback-able in PostgreSQL and SQL Server but implicitly committed in MySQL and Oracle; may be blocked by FKs. <b>DROP</b> removes the table definition itself, with its data, indexes, constraints and triggers. SQLite has no TRUNCATE; <code>DELETE FROM t</code> without WHERE is optimised internally.</p>`, followUps: ['Why can TRUNCATE be refused when other tables reference this one?', 'Which one would you use to empty a staging table every night?'] },
    { q: 'What is a transaction, and what do COMMIT, ROLLBACK and SAVEPOINT do?', level: 'B', a: `<p>A transaction is a group of statements treated as one unit — all succeed or none do (atomicity), with its changes invisible to others until it ends (isolation) and permanent once committed (durability). <code>BEGIN</code> starts it; <code>COMMIT</code> makes all its changes permanent and visible; <code>ROLLBACK</code> discards everything since BEGIN; <code>SAVEPOINT name</code> marks a point you can return to with <code>ROLLBACK TO name</code> without abandoning the whole transaction. Without BEGIN, databases run in autocommit mode — each statement is its own transaction. Example: a bank transfer's debit and credit must be in one transaction.</p>`, followUps: ['Why is inserting 100k rows in autocommit slow?', 'What happens to an open transaction if the client disconnects?'] },
    { q: 'What does NULL mean in the relational model, and what are the pitfalls?', level: 'I', a: `<p>NULL marks a <b>missing or inapplicable</b> value — not zero, not an empty string. Comparisons with NULL yield UNKNOWN (three-valued logic), so <code>col = NULL</code> never matches; use <code>IS NULL</code>. Pitfalls: CHECK constraints pass on NULL; UNIQUE usually allows many NULLs; <code>NOT IN (subquery)</code> returns nothing if the subquery contains a NULL; aggregates like COUNT(col) and AVG skip NULLs; FKs with NULL are not checked. Primary keys can never be NULL (entity integrity). Design rule: make columns NOT NULL unless "unknown" is a genuine business state.</p>`, followUps: ['Why does NOT IN with a NULL in the list return no rows?', 'How do COUNT(*) and COUNT(col) differ?'] },
    { q: 'Walk me through designing tables for "users post photos, photos have many tags, users follow users".', level: 'I', a: `<p>Entities: <code>users(user_id PK, username UNIQUE NOT NULL, email UNIQUE NOT NULL, created_at)</code>, <code>photos(photo_id PK, user_id FK NOT NULL → users ON DELETE CASCADE, url, caption, created_at)</code> — users 1 : N photos. <code>tags(tag_id PK, name UNIQUE)</code> with junction <code>photo_tags(photo_id FK, tag_id FK, PK(photo_id, tag_id))</code> — photos N : M tags. Follows are a recursive N : M on users: <code>follows(follower_id FK → users, followee_id FK → users, created_at, PK(follower_id, followee_id), CHECK(follower_id &lt;&gt; followee_id))</code> plus an index on <code>(followee_id, follower_id)</code> for "who follows me". Then discuss feed queries and denormalised counters.</p>`, followUps: ['How do you get "number of followers" fast at 100M users?', 'Should deleting a user cascade to their follows and photos?'] },
    { q: 'How would you add a NOT NULL column or a new constraint to a huge production table?', level: 'A', a: `<p>Avoid long exclusive locks. Pattern: <b>expand → backfill → contract</b>. Add the column as NULLable (or with a constant DEFAULT — metadata-only in PostgreSQL 11+ / MySQL 8), deploy code writing it, backfill old rows in small batches, then add the constraint. In PostgreSQL add CHECK/FK as <code>NOT VALID</code> (instant) and run <code>VALIDATE CONSTRAINT</code> (scans without blocking writes); for NOT NULL, a validated <code>CHECK (col IS NOT NULL)</code> lets <code>SET NOT NULL</code> skip the scan. MySQL uses online DDL or gh-ost/pt-osc. SQLite needs the documented table-rebuild recipe inside a transaction. Always ship it as a versioned migration.</p>`, followUps: ['What is the 12-step SQLite ALTER recipe and why turn FKs off?', 'How do you roll back a failed migration in MySQL, where DDL auto-commits?'] },
    { q: 'Your microservices each own their database. How do you keep referential integrity between a users service and an orders service?', level: 'E', a: `<p>Cross-database FKs are impossible, so integrity becomes an application and process concern. Options: orders store <code>user_id</code> as a plain reference validated at write time via the users API (with the risk of races); users publish events (<code>UserDeleted</code>) and orders react — anonymise or mark orphaned (eventual consistency, often via the outbox pattern); soft-delete users rather than hard-delete; run periodic reconciliation jobs that find and repair orphans; and keep immutable snapshots of data needed historically (name/address on the order). Inside each service, still use real FKs — they are the cheapest integrity you can get.</p>`, followUps: ['What is the transactional outbox pattern?', 'When would you merge the two services\' data back into one database?'] }
  );

  registerModule({
    id: 'sql01',
    title: 'Databases & the Relational Model',
    lang: 'sql',
    intro: `<p>Every app you use — banking, food delivery, your phone's contacts — keeps its data in a <b>database</b>. This first SQL module builds the mental model everything else in the track stands on: what a database and a <b>DBMS</b> really do for you, how the <b>relational model</b> stores everything as tables of rows and columns, how <b>keys</b> give each row an identity, how <b>foreign keys</b> link tables safely, how to recognise and build <b>one-to-one, one-to-many and many-to-many</b> relationships, the five families of SQL statements (<b>DDL, DML, DQL, DCL, TCL</b>), and how to create your first tables with real constraints.</p>
<p>Three realistic sample databases — a <b>school</b>, an online <b>shop</b> and a <b>company</b> — run live in your browser (SQLite). Press ▶ Run on any query, edit it, break it on purpose and watch the DBMS refuse bad data. Visualizers animate a query travelling through a DBMS, candidate keys being discovered, foreign keys guarding deletes, relationships turning into tables, and constraints accepting or rejecting rows one by one.</p>`,
    goals: [
      'Explain what a DBMS does (storage, queries, integrity, recovery, concurrency, security) and why it beats files and spreadsheets',
      'Use the relational vocabulary correctly — relation, tuple, attribute, domain, degree, cardinality, schema vs instance, NULL',
      'Identify super, candidate, primary, alternate, composite, natural and surrogate keys — and choose a good primary key',
      'Declare foreign keys with the right ON DELETE action and audit a database for orphan rows',
      'Turn any 1 : 1, 1 : N or N : M requirement into the correct tables, FKs, UNIQUE constraints and junction tables',
      'Classify any SQL statement as DDL / DML / DQL / DCL / TCL and use transactions with COMMIT, ROLLBACK and SAVEPOINT',
      'Write CREATE TABLE statements with types, NOT NULL, UNIQUE, CHECK, DEFAULT and REFERENCES, then verify them with real inserts'
    ],
    prereqs: `<p>None — this is the first module of the SQL + DBMS track. Basic comfort with spreadsheets (rows and columns) helps. Later modules build directly on it: SQL 2 (SELECT, WHERE, NULLs), SQL 3 (aggregates), SQL 4 (JOINs) and SQL 7 (DDL, constraints and ER modelling).</p>`,
    hours: 9,
    databases: DATABASES,
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
