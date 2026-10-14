(function () {
  var topics = [], practice = [], quiz = [], interview = [];
  var DB_COMPANY = `
CREATE TABLE departments (
  id     INTEGER PRIMARY KEY,
  name   TEXT NOT NULL,
  budget INTEGER            -- NULL = budget not approved yet
);
INSERT INTO departments VALUES
  (1, 'Engineering', 500000),
  (2, 'Sales',       250000),
  (3, 'HR',          100000),
  (4, 'Marketing',   150000),
  (5, 'Legal',       NULL);
CREATE TABLE employees (
  id         INTEGER PRIMARY KEY,
  name       TEXT NOT NULL,
  dept       TEXT,            -- NULL = not assigned to a team yet
  salary     INTEGER,         -- NULL = offer not finalised
  bonus      INTEGER,         -- NULL = no bonus recorded
  city       TEXT,
  hire_date  TEXT,            -- ISO 'YYYY-MM-DD'
  manager_id INTEGER,
  email      TEXT
);
INSERT INTO employees VALUES
  (1,  'Asha',   'Engineering', 120000, 10000, 'Bengaluru', '2019-03-01', NULL, 'asha@co.com'),
  (2,  'Ben',    'Engineering',  95000, NULL,  'Pune',      '2021-07-15', 1,    'ben@co.com'),
  (3,  'Chen',   'Engineering', 105000, 8000,  'Bengaluru', '2020-01-10', 1,    'chen@co.com'),
  (4,  'Dana',   'Sales',        60000, 15000, 'Mumbai',    '2018-05-20', NULL, 'dana@co.com'),
  (5,  'Eli',    'Sales',        52000, NULL,  'Mumbai',    '2022-02-01', 4,    'eli@co.com'),
  (6,  'Fatima', 'Sales',        58000, 5000,  'Delhi',     '2021-11-11', 4,    'fatima@co.com'),
  (7,  'Gopal',  'HR',           45000, NULL,  'Delhi',     '2017-09-09', NULL, 'gopal@co.com'),
  (8,  'Hana',   'HR',           48000, 2000,  'Pune',      '2023-04-01', 7,    'hana@co.com'),
  (9,  'Ivan',   'Marketing',    70000, NULL,  'Mumbai',    '2020-06-30', NULL, NULL),
  (10, 'Jia',    NULL,           40000, NULL,  'Bengaluru', '2024-01-15', NULL, 'jia@co.com'),
  (11, 'Kofi',   'Engineering',  NULL,  NULL,  'Pune',      '2024-08-01', 1,    'kofi@co.com'),
  (12, 'Lena',   'Sales',        52000, 3000,  'Delhi',     '2023-09-18', 4,    'ben@co.com');
`;
  var DB_SHOP = `
CREATE TABLE customers (
  id          INTEGER PRIMARY KEY,
  name        TEXT NOT NULL,
  country     TEXT,
  phone       TEXT,           -- NULL = never gave a phone number
  email       TEXT,
  signup_date TEXT
);
INSERT INTO customers VALUES
  (1, 'Aarav',  'India',  '+91-98450', 'aarav@mail.com', '2024-01-05'),
  (2, 'Bella',  'USA',    NULL,        'bella@mail.com', '2024-01-20'),
  (3, 'Carlos', 'Brazil', '+55-11987', NULL,             '2024-02-11'),
  (4, 'Deepa',  'India',  NULL,        NULL,             '2024-02-14'),
  (5, 'Emma',   'UK',     '+44-77001', 'emma@mail.com',  '2024-03-01'),
  (6, 'Farid',  'India',  '+91-90031', 'farid@mail.com', '2024-03-09');
CREATE TABLE products (
  id       INTEGER PRIMARY KEY,
  name     TEXT NOT NULL,
  category TEXT NOT NULL,
  price    INTEGER NOT NULL
);
INSERT INTO products VALUES
  (1, 'Laptop',     'Electronics', 900),
  (2, 'Headphones', 'Electronics', 120),
  (3, 'Novel',      'Books',        15),
  (4, 'Cookbook',   'Books',        25),
  (5, 'Yoga Mat',   'Sports',       30),
  (6, 'Football',   'Sports',       20),
  (7, 'Desk Lamp',  'Home',         40);
CREATE TABLE orders (
  id          INTEGER PRIMARY KEY,
  customer_id INTEGER NOT NULL,
  order_date  TEXT NOT NULL,   -- ISO 'YYYY-MM-DD'
  status      TEXT NOT NULL,   -- delivered | cancelled | returned | pending
  amount      INTEGER,         -- NULL = amount not recorded yet (data glitch)
  coupon      TEXT             -- NULL = no coupon used
);
INSERT INTO orders VALUES
  (1,  1, '2024-01-10', 'delivered', 920,  'NEW10'),
  (2,  2, '2024-01-22', 'delivered', 135,  NULL),
  (3,  1, '2024-02-03', 'cancelled', 30,   NULL),
  (4,  3, '2024-02-15', 'delivered', 40,   'NEW10'),
  (5,  4, '2024-02-20', 'returned',  120,  NULL),
  (6,  2, '2024-02-28', 'delivered', 25,   NULL),
  (7,  5, '2024-03-05', 'delivered', 1020, 'BIG50'),
  (8,  1, '2024-03-12', 'delivered', 50,   NULL),
  (9,  3, '2024-03-18', 'pending',   15,   NULL),
  (10, 4, '2024-03-25', 'delivered', 900,  NULL),
  (11, 5, '2024-04-02', 'cancelled', 120,  NULL),
  (12, 2, '2024-04-08', 'delivered', 45,   'NEW10'),
  (13, 1, '2024-04-15', 'delivered', 55,   NULL),
  (14, 3, '2024-04-21', 'delivered', NULL, NULL);
CREATE TABLE order_items (
  order_id   INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  qty        INTEGER NOT NULL
);
INSERT INTO order_items VALUES
  (1, 1, 1), (1, 6, 1),
  (2, 2, 1), (2, 3, 1),
  (3, 5, 1),
  (4, 6, 2),
  (5, 2, 1),
  (6, 4, 1),
  (7, 1, 1), (7, 2, 1),
  (8, 4, 2),
  (9, 3, 1),
  (10, 1, 1),
  (11, 2, 1),
  (12, 3, 1), (12, 5, 1),
  (13, 3, 1), (13, 7, 1),
  (14, 6, 1);
`;
  var DB_SCHOOL = `
CREATE TABLE students (
  id    INTEGER PRIMARY KEY,
  name  TEXT NOT NULL,
  class TEXT NOT NULL
);
INSERT INTO students VALUES
  (1, 'Anya',  '10A'), (2, 'Bilal', '10A'), (3, 'Chloe', '10B'), (4, 'Dev', '10B'),
  (5, 'Esha',  '10A'), (6, 'Finn',  '10B'), (7, 'Gita',  '10A');
CREATE TABLE scores (
  student_id INTEGER NOT NULL,
  subject    TEXT NOT NULL,
  score      INTEGER          -- NULL = was absent for the exam
);
INSERT INTO scores VALUES
  (1, 'Math', 92), (1, 'Science', 85), (1, 'English', 78),
  (2, 'Math', 35), (2, 'Science', 48), (2, 'English', 66),
  (3, 'Math', 74), (3, 'Science', NULL), (3, 'English', 88),
  (4, 'Math', 58), (4, 'Science', 39), (4, 'English', NULL),
  (5, 'Math', 99), (5, 'Science', 91), (5, 'English', 95),
  (6, 'Math', 41), (6, 'English', 52),
  (7, 'Math', NULL), (7, 'Science', 67), (7, 'English', 71);
CREATE TABLE club_signups (
  student_id INTEGER NOT NULL,
  club       TEXT NOT NULL,
  signed_on  TEXT NOT NULL      -- a student may sign up twice by mistake
);
INSERT INTO club_signups VALUES
  (1, 'Chess',    '2024-06-01'), (2, 'Chess',    '2024-06-01'), (2, 'Chess',    '2024-06-03'),
  (3, 'Chess',    '2024-06-02'), (4, 'Chess',    '2024-06-05'),
  (1, 'Drama',    '2024-06-01'), (5, 'Drama',    '2024-06-02'), (5, 'Drama',    '2024-06-02'),
  (6, 'Robotics', '2024-06-04'), (7, 'Robotics', '2024-06-04'), (3, 'Robotics', '2024-06-06'),
  (4, 'Football', '2024-06-07');
`;
  var DB_APP = `
CREATE TABLE transactions (
  id         INTEGER PRIMARY KEY,
  country    TEXT,             -- NULL = country could not be detected
  state      TEXT NOT NULL,    -- approved | declined
  amount     INTEGER NOT NULL,
  trans_date TEXT NOT NULL
);
INSERT INTO transactions VALUES
  (121, 'US', 'approved', 1000, '2024-12-18'),
  (122, 'US', 'declined', 2000, '2024-12-19'),
  (123, 'US', 'approved', 2000, '2025-01-01'),
  (124, 'DE', 'approved', 2000, '2025-01-07'),
  (125, 'DE', 'declined',  500, '2025-01-09'),
  (126, NULL, 'approved',  300, '2025-01-15'),
  (127, 'IN', 'declined',  700, '2025-01-20'),
  (128, 'IN', 'declined',  400, '2025-01-21');
CREATE TABLE queries (
  query_name TEXT NOT NULL,
  result     TEXT NOT NULL,
  position   INTEGER NOT NULL,   -- 1..500, lower = shown higher
  rating     INTEGER NOT NULL    -- 1..5, below 3 = poor
);
INSERT INTO queries VALUES
  ('Dog', 'Golden Retriever', 1, 5), ('Dog', 'German Shepherd', 2, 5), ('Dog', 'Mule', 200, 1),
  ('Cat', 'Shirazi', 5, 2), ('Cat', 'Siamese', 3, 3), ('Cat', 'Sphynx', 7, 4),
  ('Bird', 'Parrot', 4, 1), ('Bird', 'Pigeon', 9, 2);
CREATE TABLE cooperation (
  actor_id    INTEGER NOT NULL,
  director_id INTEGER NOT NULL,
  timestamp   INTEGER PRIMARY KEY
);
INSERT INTO cooperation VALUES
  (1, 1, 0), (1, 1, 1), (1, 1, 2), (1, 2, 3), (1, 2, 4), (2, 1, 5), (2, 1, 6), (2, 1, 7), (3, 3, 8);
CREATE TABLE users (
  user_id INTEGER PRIMARY KEY,
  banned  TEXT NOT NULL,       -- 'Yes' | 'No'
  role    TEXT NOT NULL        -- client | driver
);
INSERT INTO users VALUES
  (1, 'No', 'client'), (2, 'Yes', 'client'), (3, 'No', 'client'), (4, 'No', 'client'),
  (10, 'No', 'driver'), (11, 'No', 'driver'), (12, 'No', 'driver'), (13, 'Yes', 'driver');
CREATE TABLE trips (
  id         INTEGER PRIMARY KEY,
  client_id  INTEGER NOT NULL,
  driver_id  INTEGER NOT NULL,
  status     TEXT NOT NULL,     -- completed | cancelled_by_driver | cancelled_by_client
  request_at TEXT NOT NULL
);
INSERT INTO trips VALUES
  (1,  1, 10, 'completed',           '2025-10-01'),
  (2,  2, 11, 'cancelled_by_driver', '2025-10-01'),
  (3,  3, 12, 'cancelled_by_client', '2025-10-01'),
  (4,  4, 13, 'cancelled_by_client', '2025-10-01'),
  (5,  1, 10, 'completed',           '2025-10-02'),
  (6,  2, 11, 'completed',           '2025-10-02'),
  (7,  3, 12, 'completed',           '2025-10-02'),
  (8,  2, 12, 'completed',           '2025-10-03'),
  (9,  3, 10, 'completed',           '2025-10-03'),
  (10, 4, 12, 'cancelled_by_driver', '2025-10-03');
CREATE TABLE activity (
  player_id    INTEGER NOT NULL,
  device_id    INTEGER NOT NULL,
  event_date   TEXT NOT NULL,
  games_played INTEGER NOT NULL
);
INSERT INTO activity VALUES
  (1, 2, '2025-03-01', 5), (1, 2, '2025-03-02', 6),
  (2, 3, '2025-06-25', 1),
  (3, 1, '2025-03-02', 0), (3, 4, '2025-07-03', 5),
  (4, 1, '2025-05-10', 3), (4, 1, '2025-05-11', 2), (4, 2, '2025-05-20', 4);
`;

  /* =====================================================================
     Shared visualizer helpers for this module.
     They imitate SQLite's real rules for aggregates:
       - COUNT(*) counts rows, COUNT(col) counts non-NULL values
       - SUM/AVG/MIN/MAX skip NULLs; SUM/AVG/MIN/MAX of "nothing" is NULL
       - GROUP BY puts all NULL keys into ONE group
       - groups come out sorted by key, NULL first (what SQLite usually does)
     ===================================================================== */
  var STAGES = ['FROM', 'WHERE', 'GROUP BY', 'HAVING', 'SELECT', 'ORDER BY'];
  function stagePart(i) {
    var hl = {};
    for (var k = 0; k < i; k++) hl[k] = 'done';
    hl[i] = 'cur';
    return { type: 'array', label: 'Logical processing order (where are we?)', values: STAGES, hl: hl, showIdx: false };
  }
  function cellOf(s) {
    s = String(s).trim();
    if (s === '' || /^null$/i.test(s)) return null;
    if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s);
    return s.slice(0, 24);
  }
  function parseRows(input, ncols, hint, maxRows) {
    maxRows = maxRows || 12;
    var lines = String(input === undefined || input === null ? '' : input).split(/[;\n]/)
      .map(function (l) { return l.trim(); }).filter(function (l) { return l.length > 0; });
    if (!lines.length) throw new Error(hint);
    if (lines.length > maxRows) throw new Error('Use at most ' + maxRows + ' rows. ' + hint);
    return lines.map(function (l) {
      var c = l.split(',');
      if (c.length !== ncols) throw new Error(hint);
      return c.map(cellOf);
    });
  }
  function parseList(input, hint, maxN) {
    maxN = maxN || 12;
    var items = String(input === undefined || input === null ? '' : input).split(/[,;\n]/)
      .map(function (x) { return x.trim(); }).filter(function (x) { return x.length > 0; });
    if (!items.length) throw new Error(hint);
    if (items.length > maxN) throw new Error('Use at most ' + maxN + ' values. ' + hint);
    return items.map(cellOf);
  }
  function show(v) {
    if (v === null || v === undefined) return 'NULL';
    if (typeof v === 'number') return String(Math.round(v * 100) / 100);
    return String(v);
  }
  function esc(s) { return H.esc(show(s)); }
  function sqlCmp(a, b) {               // SQLite sort order: NULL < numbers < text
    if (a === b) return 0;
    if (a === null) return -1;
    if (b === null) return 1;
    var na = typeof a === 'number', nb = typeof b === 'number';
    if (na && !nb) return -1;
    if (!na && nb) return 1;
    return a < b ? -1 : 1;
  }
  function aggregate(fn, vals) {
    var nn = vals.filter(function (v) { return v !== null; });
    if (fn === 'COUNT*') return vals.length;
    if (fn === 'COUNT') return nn.length;
    if (fn === 'COUNTD') {
      var seen = [];
      nn.forEach(function (v) { if (seen.indexOf(v) < 0) seen.push(v); });
      return seen.length;
    }
    if (!nn.length) return null;
    if (fn === 'SUM') return nn.reduce(function (a, b) { return a + Number(b); }, 0);
    if (fn === 'AVG') return nn.reduce(function (a, b) { return a + Number(b); }, 0) / nn.length;
    if (fn === 'MIN') return nn.slice().sort(sqlCmp)[0];
    if (fn === 'MAX') return nn.slice().sort(sqlCmp)[nn.length - 1];
    return null;
  }
  function pad4(frames) {
    while (frames.length < 4) {
      var last = frames[frames.length - 1];
      frames.push({ narr: 'Done. Tip: edit the input above (add rows, add NULLs) and press Load to watch it again.', parts: last.parts });
    }
    return frames;
  }

  /* ---------------------------------------------------------------------
     groupViz: animate  FROM → WHERE → GROUP BY → aggregates → HAVING → SELECT
     cfg = { title, input, inputLabel, hint, cols, keyCols:[idx], valCol,
             aggs:[{name, fn}], where:{text, test(row)}, having:{text, test(aggObj)},
             sql, lines:{from, where, group, having, select} }
     --------------------------------------------------------------------- */
  function groupViz(cfg) {
    return {
      title: cfg.title, input: cfg.input, inputLabel: cfg.inputLabel,
      gen: function (input) {
        var rows = parseRows(input, cfg.cols.length, cfg.hint, 12);
        var L = cfg.lines || {}, frames = [], valName = cfg.cols[cfg.valCol];
        function codePart(line, cls) { var hl = {}; if (line) hl[line] = cls || 'cur'; return { type: 'code', label: 'The query', lang: 'sql', code: cfg.sql, hl: hl }; }
        frames.push({
          narr: '<b>FROM</b>: the database reads the whole table first — ' + rows.length + ' rows. Nothing is grouped or filtered yet. Think of it as dumping every receipt onto the desk.',
          parts: [stagePart(0), { type: 'table', label: 'FROM table (raw rows)', columns: cfg.cols, rows: rows.map(function (r) { return r.slice(); }) }, codePart(L.from)]
        });
        if (cfg.where) {
          var hlW = {}, kept = [], dropped = 0;
          rows.forEach(function (r, i) {
            var ok = cfg.where.test(r);
            hlW[i] = ok ? 'ok' : 'bad';
            if (ok) kept.push(r); else dropped++;
          });
          frames.push({
            narr: '<b>WHERE ' + H.esc(cfg.where.text) + '</b> looks at <i>one row at a time</i>. Green rows survive, red rows are thrown away (' + dropped + ' dropped). A NULL value makes the test UNKNOWN, and UNKNOWN is treated like false, so NULL rows are dropped too. This happens <i>before</i> any grouping — WHERE cannot see totals.',
            parts: [stagePart(1), { type: 'table', label: 'Each row tested by WHERE', columns: cfg.cols, rows: rows.map(function (r) { return r.slice(); }), hl: hlW }, codePart(L.where)]
          });
          rows = kept;
          if (!rows.length) {
            frames.push({ narr: 'Every row was filtered out. With GROUP BY, zero input rows means <b>zero groups</b>, so the result is empty (no rows at all — not a row of zeros).', parts: [stagePart(2), { type: 'table', label: 'Result', columns: cfg.cols, rows: [] }] });
            return pad4(frames);
          }
        }
        var order = [], buckets = {};
        rows.forEach(function (r, i) {
          var keyVals = cfg.keyCols.map(function (k) { return r[k]; });
          var key = keyVals.map(show).join(' | ');
          var fresh = !buckets[key];
          if (fresh) { buckets[key] = { keyVals: keyVals, rows: [] }; order.push(key); }
          buckets[key].rows.push(r);
          var hl = {};
          for (var j = 0; j < i; j++) hl[j] = 'done';
          hl[i] = 'cur';
          var entries = order.map(function (k) { return [k, '[' + buckets[k].rows.map(function (x) { return show(x[cfg.valCol]); }).join(', ') + ']']; });
          var mh = {}; mh[key] = fresh ? 'ok' : 'cur';
          var who = cfg.keyCols.map(function (k) { return cfg.cols[k] + ' = <b>' + esc(r[k]) + '</b>'; }).join(', ');
          var note = keyVals.some(function (v) { return v === null; }) ? ' Note: GROUP BY treats every NULL as the <i>same</i> key, so all NULL rows share one bucket (even though NULL = NULL is not true in WHERE).' : '';
          frames.push({
            narr: '<b>GROUP BY</b>, row ' + (i + 1) + ': ' + who + ' → ' + (fresh ? 'no bucket for this key yet, so a <span class="c-g">new bucket</span> is created.' : 'drops into the <span class="c-y">existing bucket</span> (now ' + buckets[key].rows.length + ' rows).') + note,
            parts: [stagePart(2), { type: 'table', label: 'Rows being sorted into buckets', columns: cfg.cols, rows: rows.map(function (x) { return x.slice(); }), hl: hl },
              { type: 'map', label: 'Buckets: key → ' + valName + ' values', entries: entries, hl: mh }, codePart(L.group)]
          });
        });
        order.sort(function (a, b) {
          var A = buckets[a].keyVals, B = buckets[b].keyVals;
          for (var i = 0; i < A.length; i++) { var c = sqlCmp(A[i], B[i]); if (c) return c; }
          return 0;
        });
        var resCols = cfg.keyCols.map(function (k) { return cfg.cols[k]; }).concat(cfg.aggs.map(function (a) { return a.name; }));
        var results = [];
        order.forEach(function (key) {
          var b = buckets[key], vals = b.rows.map(function (r) { return r[cfg.valCol]; });
          var aggObj = {}, vv = {}, hlv = {};
          cfg.aggs.forEach(function (a) { aggObj[a.name] = aggregate(a.fn, vals); vv[a.name] = show(aggObj[a.name]); hlv[a.name] = 'ok'; });
          results.push({ key: key, keyVals: b.keyVals, agg: aggObj });
          var nulls = vals.filter(function (v) { return v === null; }).length;
          var hlRows = {};
          b.rows.forEach(function (_, i) { hlRows[i] = 'win'; });
          frames.push({
            narr: 'Collapse bucket <b>' + H.esc(key) + '</b> (' + b.rows.length + ' row' + (b.rows.length === 1 ? '' : 's') + ') into ONE output row. Each aggregate squeezes the bucket\'s ' + H.esc(valName) + ' values [' + vals.map(esc).join(', ') + '] into one number.' +
              (nulls ? ' <span class="c-r">' + nulls + ' NULL value' + (nulls > 1 ? 's are' : ' is') + ' skipped</span> by every aggregate except COUNT(*), so AVG divides by ' + (vals.length - nulls) + ', not ' + vals.length + '.' : ' No NULLs here, so COUNT(*) and COUNT(' + H.esc(valName) + ') agree.'),
            parts: [stagePart(2), { type: 'table', label: 'Bucket "' + H.esc(key) + '"', columns: cfg.cols, rows: b.rows.map(function (x) { return x.slice(); }), hl: hlRows },
              { type: 'vars', label: 'Aggregates for this bucket', vals: vv, hl: hlv }, codePart(L.select, 'ok')]
          });
        });
        function resRow(r) { return r.keyVals.map(function (v) { return v; }).concat(cfg.aggs.map(function (a) { return show(r.agg[a.name]); })); }
        if (cfg.having) {
          var hlH = {}, pass = [];
          results.forEach(function (r, i) { var ok = !!cfg.having.test(r.agg); hlH[i] = ok ? 'ok' : 'bad'; if (ok) pass.push(r); });
          frames.push({
            narr: '<b>HAVING ' + H.esc(cfg.having.text) + '</b> now filters <i>whole groups</i> using their aggregate values. Green groups stay, red groups are removed (' + (results.length - pass.length) + ' removed). HAVING runs after grouping, which is exactly why it can see COUNT/SUM/AVG and WHERE cannot.',
            parts: [stagePart(3), { type: 'table', label: 'One row per group, tested by HAVING', columns: resCols, rows: results.map(resRow), hl: hlH }, codePart(L.having)]
          });
          results = pass;
        }
        var hlF = {};
        results.forEach(function (_, i) { hlF[i] = 'sel'; });
        frames.push({
          narr: '<b>SELECT</b> outputs one row per surviving group: ' + results.length + ' row' + (results.length === 1 ? '' : 's') + ' (from ' + rows.length + ' input rows). Only the GROUP BY columns and aggregates are allowed here, because every other column could have many different values inside one bucket.',
          parts: [stagePart(4), { type: 'table', label: 'Final result', columns: resCols, rows: results.map(resRow), hl: hlF }, codePart(L.select, 'sel')]
        });
        return pad4(frames);
      }
    };
  }

  /* =====================================================================
     TOPIC 1 — The five aggregate functions
     ===================================================================== */
  topics.push({
    title: 'The Five Aggregates: COUNT, SUM, AVG, MIN, MAX',
    analogy: `<p>At closing time a shop cashier does not read every receipt aloud to the owner. She squeezes the whole pile into one tiny slip: <b>"14 orders, ₹3,475 total, average ₹267, smallest ₹15, biggest ₹1,020."</b> That slip is exactly what an <b>aggregate function</b> does: it takes <i>many rows</i> and squashes them into <i>one value</i>. COUNT counts the receipts, SUM adds them, AVG finds the typical one, MIN and MAX find the extremes.</p>
      <p>One more cashier habit matters: if a receipt is blank (the amount was never written), she simply <b>skips it</b> when adding and averaging. SQL does the same with <b>NULL</b>.</p>`,
    explain: `<p><b>🟢 The plain idea.</b> Normal functions like <code>UPPER(name)</code> or <code>ROUND(x)</code> work on <i>one row</i> and give one answer <i>per row</i>. <b>Aggregate functions</b> work on a <i>whole bunch of rows</i> and give <i>one answer for the bunch</i>. With no GROUP BY, the "bunch" is the entire table (after WHERE), so the query returns <b>exactly one row</b>.</p>
      ${H.table(['Function', 'What it does', 'NULLs?', 'On our <code>employees</code> table'], [
        ['<code>COUNT(*)</code>', 'counts rows', 'counts them too', '12'],
        ['<code>COUNT(salary)</code>', 'counts non-NULL values', '<span class="c-r">skips</span>', '11 (Kofi has no salary yet)'],
        ['<code>SUM(salary)</code>', 'adds values', '<span class="c-r">skips</span>', '745000'],
        ['<code>AVG(salary)</code>', 'SUM ÷ COUNT(salary)', '<span class="c-r">skips</span>', '745000 ÷ 11 = 67727.27'],
        ['<code>MIN(salary)</code>', 'smallest value', '<span class="c-r">skips</span>', '40000'],
        ['<code>MAX(salary)</code>', 'largest value', '<span class="c-r">skips</span>', '120000']
      ])}
      <p><b>🔵 Rules worth memorising.</b></p>
      <ul>
        <li><b>NULLs are ignored</b> by SUM, AVG, MIN, MAX and COUNT(col). They are not treated as 0 — they simply do not exist for the aggregate. That is why AVG(salary) divides by 11, not 12.</li>
        <li><b>Empty input:</b> COUNT returns <code>0</code>, but SUM/AVG/MIN/MAX return <code>NULL</code> ("there was nothing to add"). Wrap with <code>COALESCE(SUM(x), 0)</code> when a report needs a zero.</li>
        <li><b>MIN/MAX work on text and dates too.</b> Text compares alphabetically; ISO dates like <code>'2024-03-05'</code> sort correctly as text, so <code>MIN(hire_date)</code> is the earliest hire.</li>
        <li><b>AVG always gives a decimal</b> in SQLite (67727.27…). Use <code>ROUND(AVG(x), 2)</code> for display.</li>
        <li><b>Watch integer division:</b> in SQLite (and Postgres, SQL Server) <code>7 / 2 = 3</code>. Doing your own average as <code>SUM(x) / COUNT(x)</code> on integers silently chops decimals. Multiply by <code>1.0</code> first.</li>
        <li><b>You cannot nest aggregates</b> directly: <code>AVG(SUM(x))</code> is an error. You need a subquery or CTE (module 5) to aggregate twice.</li>
      </ul>
      <p>Aggregates can also be mixed with ordinary expressions: <code>MAX(salary) - MIN(salary)</code> is the salary spread, <code>SUM(qty * price)</code> multiplies per row and then adds.</p>`,
    clues: [
      '"How many…", "total…", "average…", "highest / lowest…" with <b>no "per" / "for each"</b> → a plain aggregate over the whole (filtered) table, one result row.',
      '"Ignore missing values" or a column that allows NULL → remember SUM/AVG/COUNT(col) already skip NULLs; ask whether NULL should count as 0.',
      '"Return 0 if there are no orders" → COUNT is fine, but SUM/AVG need <code>COALESCE(…, 0)</code>.',
      '"Earliest / latest date", "first / last alphabetically" → MIN/MAX also work on dates and text.',
      '"Average of a ratio" vs "ratio of totals" → <code>AVG(a/b)</code> ≠ <code>SUM(a)/SUM(b)</code>; read the wording carefully.',
      '"Percentage" with integer columns → multiply by <code>100.0</code> before dividing to dodge integer division.'
    ],
    code: [
      { lang: 'sql', db: 'company', title: 'All five aggregates on the employees table', code: `-- One row out, no matter how many rows go in (no GROUP BY = one big group)
SELECT COUNT(*)              AS employees,      -- every row: 12
       COUNT(salary)         AS with_salary,    -- non-NULL salaries only: 11
       SUM(salary)           AS payroll,        -- 745000 (Kofi's NULL is skipped)
       ROUND(AVG(salary), 2) AS avg_salary,     -- 745000 / 11, not / 12
       MIN(salary)           AS lowest,
       MAX(salary)           AS highest,
       MAX(salary) - MIN(salary) AS spread       -- expressions over aggregates are fine
FROM employees;` },
      { lang: 'sql', db: 'company', title: 'MIN/MAX on dates and text', code: `-- ISO dates sort correctly as text, so MIN/MAX give earliest/latest
SELECT MIN(hire_date) AS first_hire,   -- 2017-09-09 (Gopal)
       MAX(hire_date) AS latest_hire,  -- 2024-08-01 (Kofi)
       MIN(name)      AS first_name_az,
       MAX(name)      AS last_name_az
FROM employees;` },
      { lang: 'sql', db: 'shop', title: 'Aggregates + WHERE: delivered-order dashboard', code: `-- WHERE trims the rows first; the aggregates summarise what is left
SELECT COUNT(*)              AS delivered_orders,  -- 10
       COUNT(amount)         AS with_amount,       -- 9 (order 14 has NULL amount)
       SUM(amount)           AS revenue,           -- 3190
       ROUND(AVG(amount), 2) AS avg_order,         -- 3190 / 9 = 354.44
       MIN(amount)           AS smallest,
       MAX(amount)           AS biggest
FROM orders
WHERE status = 'delivered';` }
    ],
    codeTitle: ['Five aggregates', 'Dates & text', 'With WHERE'],
    viz: {
      title: 'One pass over the rows: how the five aggregates accumulate',
      input: '120, 95, NULL, 105, 60, NULL, 45',
      inputLabel: 'salary values (numbers or NULL, comma separated)',
      gen: function (input) {
        var vals = parseList(input, 'Enter numbers or NULL separated by commas, e.g. 120, NULL, 45', 12);
        vals.forEach(function (v) { if (v !== null && typeof v !== 'number') throw new Error('Only numbers or NULL are allowed here, e.g. 120, NULL, 45'); });
        var frames = [], cstar = 0, ccol = 0, sum = null, mn = null, mx = null;
        var code = 'SELECT COUNT(*), COUNT(salary),\n       SUM(salary), AVG(salary),\n       MIN(salary), MAX(salary)\nFROM employees;';
        function state(hl) {
          return { type: 'vars', label: 'Running accumulators (one pass, O(1) memory)', vals: { 'COUNT(*)': cstar, 'COUNT(salary)': ccol, 'SUM': show(sum), 'MIN': show(mn), 'MAX': show(mx) }, hl: hl || {} };
        }
        frames.push({ narr: 'The engine reads rows one by one and keeps a few running "accumulators". Before any row: counts are 0, while SUM/MIN/MAX are <b>NULL</b> ("nothing seen yet").',
          parts: [{ type: 'array', label: 'salary column', values: vals.map(show) }, state(), { type: 'code', label: 'Query', lang: 'sql', code: code, hl: { 6: 'cur' } }] });
        vals.forEach(function (v, i) {
          var hl = {}, ah = {}; ah[i] = v === null ? 'bad' : 'cur';
          var ptr = {}; ptr[i] = 'row ' + (i + 1);
          cstar++; hl['COUNT(*)'] = 'ok';
          var narr;
          if (v === null) {
            narr = 'Row ' + (i + 1) + ' has <b>NULL</b>. COUNT(*) still counts the row (it counts rows, not values) → ' + cstar + '. Every other aggregate <span class="c-r">skips</span> it: no change to COUNT(salary), SUM, MIN or MAX.';
          } else {
            ccol++; hl['COUNT(salary)'] = 'ok';
            sum = (sum === null ? 0 : sum) + v; hl.SUM = 'ok';
            var newMin = mn === null || v < mn, newMax = mx === null || v > mx;
            if (newMin) { mn = v; hl.MIN = 'ok'; }
            if (newMax) { mx = v; hl.MAX = 'ok'; }
            narr = 'Row ' + (i + 1) + ' has <b>' + v + '</b>. Both counts go up, SUM becomes ' + show(sum) + '.' + (newMin ? ' New smallest → MIN = ' + v + '.' : '') + (newMax ? ' New largest → MAX = ' + v + '.' : '') + (!newMin && !newMax ? ' MIN and MAX stay the same.' : '');
          }
          frames.push({ narr: narr, parts: [{ type: 'array', label: 'salary column', values: vals.map(show), hl: ah, ptr: ptr }, state(hl), { type: 'code', label: 'Query', lang: 'sql', code: code, hl: { 1: 'cur', 2: 'cur', 3: 'cur' } }] });
        });
        var avg = ccol ? sum / ccol : null, wrong = cstar ? (sum === null ? 0 : sum) / cstar : null;
        frames.push({
          narr: 'End of table. <b>AVG = SUM ÷ COUNT(salary) = ' + show(sum) + ' ÷ ' + ccol + ' = ' + show(avg) + '</b>.' + (cstar !== ccol ? ' <span class="c-r">If you wrongly treated NULL as 0</span> you would get ' + show(sum === null ? 0 : sum) + ' ÷ ' + cstar + ' = ' + show(wrong) + ' — a different (lower) answer. Decide which one the business wants!' : ' No NULLs, so both ways agree.') + (ccol === 0 ? ' All values were NULL, so SUM/AVG/MIN/MAX are NULL — "nothing to aggregate".' : ''),
          parts: [{ type: 'table', label: 'Result: exactly ONE row', columns: ['COUNT(*)', 'COUNT(salary)', 'SUM', 'AVG', 'MIN', 'MAX'], rows: [[cstar, ccol, show(sum), show(avg), show(mn), show(mx)]], hl: { 0: 'sel' } },
            { type: 'vars', label: 'Treat NULL as 0 instead? AVG(COALESCE(salary,0))', vals: { 'correct AVG': show(avg), 'NULL-as-0 AVG': show(wrong) }, hl: { 'correct AVG': 'ok', 'NULL-as-0 AVG': cstar !== ccol ? 'bad' : 'ok' } }]
        });
        return pad4(frames);
      }
    },
    examples: [
      {
        title: 'Empty table still returns ONE row',
        html: `<p>No order is in status <code>'refunded'</code>. Without GROUP BY, an aggregate query <b>always</b> returns one row: COUNT says <code>0</code> and SUM says <code>NULL</code> (not 0!). This surprises people who then show "NULL" on a dashboard.</p>${H.table(['cnt', 'total', 'safe_total'], [['0', '<span class="c-r">NULL</span>', '<span class="c-g">0</span>']])}`,
        code: { lang: 'sql', db: 'shop', code: `SELECT COUNT(*)                AS cnt,
       SUM(amount)             AS total,       -- NULL: nothing to add
       COALESCE(SUM(amount), 0) AS safe_total  -- 0: what humans expect
FROM orders
WHERE status = 'refunded';` }
      },
      {
        title: 'Integer division silently drops decimals',
        html: `<p>Delivered revenue is 3190 over 9 known amounts. <code>SUM(amount) / COUNT(amount)</code> divides two integers, so SQLite returns <b class="c-r">354</b>, while <code>AVG(amount)</code> or multiplying by <code>1.0</code> returns <b class="c-g">354.44</b>. Same trap exists in PostgreSQL and SQL Server; MySQL returns a decimal for <code>/</code>.</p>`,
        code: { lang: 'sql', db: 'shop', code: `SELECT SUM(amount) / COUNT(amount)                  AS int_division,  -- 354  (wrong)
       ROUND(1.0 * SUM(amount) / COUNT(amount), 2) AS fixed,         -- 354.44
       ROUND(AVG(amount), 2)                       AS built_in_avg   -- 354.44
FROM orders
WHERE status = 'delivered';` }
      },
      {
        title: 'Average of ratios vs ratio of totals',
        html: `<p>Two days: day 1 had 1 sale from 2 visits (50%), day 2 had 90 sales from 900 visits (10%). <code>AVG(sales/visits)</code> = (50% + 10%) ÷ 2 = <b>30%</b>. <code>SUM(sales)/SUM(visits)</code> = 91 ÷ 902 = <b>10.1%</b>. The second is the true overall conversion; the first gives a tiny day the same vote as a huge one. Interviewers love this.</p>`,
        code: { lang: 'sql', code: `WITH days(day, visits, sales) AS (VALUES ('d1', 2, 1), ('d2', 900, 90))
SELECT ROUND(AVG(100.0 * sales / visits), 1)          AS avg_of_ratios,   -- 30.0
       ROUND(100.0 * SUM(sales) / SUM(visits), 1)     AS ratio_of_totals  -- 10.1
FROM days;` }
      },
      {
        title: 'Aggregating an expression',
        html: `<p>Revenue is not stored per line, but <code>qty × price</code> is. Aggregates accept any expression: the multiplication happens <i>per row</i>, then SUM adds the products. Total units sold is a second aggregate in the same pass.</p>`,
        code: { lang: 'sql', db: 'shop', code: `SELECT SUM(oi.qty * p.price) AS gross_item_value,
       SUM(oi.qty)           AS units
FROM order_items oi
JOIN products p ON p.id = oi.product_id;   -- JOINs are covered in the next module` }
      }
    ],
    deepDive: `<p><b>🟣 How the engine really computes them.</b> Each aggregate is a tiny state machine: an <i>initial state</i>, a <i>step</i> function called per row, and a <i>final</i> function. COUNT keeps an integer; SUM keeps a running total; AVG keeps <code>(sum, count)</code> and divides at the end; MIN/MAX keep the best value so far. That is one pass, O(N) time and O(1) memory per group — which is why aggregates scale to billions of rows.</p>
      <p><b>Mergeable vs not.</b> Because <code>(sum, count)</code> pairs can be added together, distributed engines (Spark, BigQuery, ClickHouse, Snowflake) compute <i>partial aggregates</i> on each node and merge them. COUNT/SUM/MIN/MAX/AVG are all mergeable. <b>Median and exact COUNT(DISTINCT) are not</b> — they need all values (or a sketch like HyperLogLog for <code>APPROX_COUNT_DISTINCT</code>).</p>
      <p><b>Index shortcuts.</b> SQLite, PostgreSQL and MySQL can answer <code>SELECT MIN(col)</code> / <code>MAX(col)</code> by jumping to one end of a B-tree index in O(log N) instead of scanning. <code>COUNT(*)</code> is different: PostgreSQL must still visit rows (MVCC visibility), so big-table counts are slow; people use <code>pg_class.reltuples</code> estimates or counters.</p>
      <p><b>Types and overflow.</b> SQLite's SUM of integers raises "integer overflow" past 2<sup>63</sup>−1; <code>TOTAL()</code> is an SQLite-only variant that always returns a float and returns 0.0 instead of NULL on empty input. PostgreSQL widens <code>SUM(int)</code> to bigint and <code>SUM(bigint)</code> to numeric. Floating-point SUMs can differ in the last digit depending on row order — never compare money floats with <code>=</code>; store cents as integers or use DECIMAL.</p>
      <p><b>Standard edge cases.</b> <code>SELECT COUNT(*) FROM t WHERE false</code> → 0; <code>SELECT MAX(x) FROM empty</code> → one row with NULL; aggregates cannot appear in WHERE ("misuse of aggregate") because WHERE runs before aggregation.</p>`,
    aiEra: `<p><b>🤖 What AI changes.</b> Copilots write <code>SELECT COUNT(*), SUM(...)</code> instantly, and text-to-SQL tools turn "what was revenue last month?" into a query in seconds. The typing is no longer the skill. <b>The skill is checking the semantics:</b> did it use COUNT(*) where it should have used COUNT(DISTINCT customer_id)? Does AVG skip NULLs the way the business expects? Did it divide integers?</p>
      <p><b>Use AI as a partner:</b> ask it <i>"List three ways this aggregate could be wrong on real data (NULLs, duplicates from joins, integer division)"</i> or <i>"Generate a tiny test table where AVG(x) and SUM(x)/COUNT(*) disagree"</i>. Then run both on the sample DB here.</p>
      <p><b>Where AI goes wrong:</b> it often writes <code>SUM(a)/SUM(b)</code> on integer columns, forgets <code>COALESCE</code> for empty periods, and averages ratios when the question wanted a ratio of totals. In interviews and code review, <b>you</b> must spot these, explain why, and fix them.</p>`,
    problems: [{
      title: 'Delivered-Orders KPI Strip',
      level: 'Easy', tags: ['aggregate', 'NULL', 'WHERE'], companies: ['Amazon', 'Shopify', 'Flipkart'],
      statement: `<p>Using <code>orders</code> (sample DB <b>shop</b>), build a one-row KPI strip for <b>delivered</b> orders with columns: <code>orders</code> (number of delivered orders), <code>revenue</code> (sum of amount), <code>avg_order</code> (average amount rounded to 2 decimals, ignoring unknown amounts), <code>smallest</code>, <code>biggest</code>, and <code>missing_amounts</code> (delivered orders whose amount is NULL).</p>`,
      constraints: `<p>One SELECT, no GROUP BY, no subquery. <code>amount</code> may be NULL.</p>`,
      example: `${H.table(['orders', 'revenue', 'avg_order', 'smallest', 'biggest', 'missing_amounts'], [['<span class="c-g">10</span>', '3190', '<span class="c-g">354.44</span>', '25', '1020', '<span class="c-y">1</span>']])}<p>10 delivered rows; order 14 has a NULL amount, so revenue adds 9 values and AVG divides by <b>9</b> (3190 ÷ 9 = 354.44). <code>missing_amounts</code> = COUNT(*) − COUNT(amount) = 1.</p>`,
      brute: {
        why: `<p>A common first try divides by COUNT(*) to get the average and uses integer division. That divides 3190 by 10 (the NULL row counted) and chops decimals → <b class="c-r">319</b> instead of 354.44. It also forgets that WHERE must keep only delivered orders before aggregating, so it reports the whole table.</p>`,
        code: { lang: 'sql', db: 'shop', code: `-- Naive: wrong denominator (counts the NULL row), integer division, no status filter
SELECT COUNT(*)              AS orders,      -- 14, includes cancelled/returned/pending
       SUM(amount)           AS revenue,     -- 3475, includes non-delivered
       SUM(amount) / COUNT(*) AS avg_order    -- 248 (integer division, wrong denominator)
FROM orders;` }
      },
      mcq: { q: 'Delivered orders: 10 rows, one has NULL amount, SUM = 3190. What does AVG(amount) return?', options: ['319.0', '354.44…', 'NULL, because one value is NULL', '3190'], answer: 1, explain: 'AVG skips NULLs, so it divides by the 9 non-NULL values: 3190 / 9 ≈ 354.44.' },
      hints: [
        `<p>Hint 1: "for delivered orders" is a <b>row</b> filter → it belongs in WHERE, which runs before the aggregates see anything.</p>`,
        `<p>Hint 2: Every KPI is a plain aggregate: COUNT(*), SUM, AVG, MIN, MAX. AVG already ignores NULL — you do not need to compute it by hand.</p>`,
        `<p>Hint 3: Missing amounts = rows minus non-NULL values: <code>COUNT(*) - COUNT(amount)</code>. Recipe: WHERE status = 'delivered' → the six aggregates → ROUND the average.</p>`
      ],
      solution: {
        approach: `<p>Filter rows with WHERE, then let each aggregate do its job in one pass. Use the built-in AVG (correct denominator, decimal result) and the classic <code>COUNT(*) - COUNT(col)</code> trick to count NULLs.</p>`,
        code: { lang: 'sql', db: 'shop', code: `SELECT COUNT(*)                  AS orders,
       SUM(amount)               AS revenue,
       ROUND(AVG(amount), 2)     AS avg_order,       -- divides by COUNT(amount) = 9
       MIN(amount)               AS smallest,
       MAX(amount)               AS biggest,
       COUNT(*) - COUNT(amount)  AS missing_amounts  -- rows whose amount IS NULL
FROM orders
WHERE status = 'delivered';` },
        complexity: `<p>One sequential scan: O(N) time, O(1) extra memory. With an index on <code>status</code> the engine reads only delivered rows.</p>`,
        followUps: ['Show the same KPIs per month (needs GROUP BY — next topic).', 'Treat a NULL amount as 0 for the average: what changes and why might finance object?', 'Add the percentage of delivered orders that used a coupon.']
      }
    }]
  });

  /* =====================================================================
     TOPIC 2 — COUNT(*) vs COUNT(col) vs COUNT(DISTINCT col)
     ===================================================================== */
  topics.push({
    title: 'COUNT(*) vs COUNT(col) vs COUNT(DISTINCT col)',
    analogy: `<p>A teacher takes attendance three ways. <b>COUNT(*)</b> = "how many <i>chairs</i> have someone sitting on them" (every row). <b>COUNT(phone)</b> = "how many students <i>wrote down</i> a phone number" (blank forms are skipped). <b>COUNT(DISTINCT city)</b> = "how many <i>different</i> home cities are in the room" (three kids from Pune still count as one city).</p>`,
    explain: `<p><b>🟢 The plain idea.</b> COUNT has three flavours and interviewers test all three:</p>
      ${H.table(['Form', 'Counts', 'NULLs', 'Duplicates', '<code>customers</code> (6 rows)'], [
        ['<code>COUNT(*)</code>', 'rows', 'counted', 'counted', '6'],
        ['<code>COUNT(phone)</code>', 'non-NULL values', '<span class="c-r">skipped</span>', 'counted', '4 (Bella, Deepa have no phone)'],
        ['<code>COUNT(DISTINCT country)</code>', 'different non-NULL values', '<span class="c-r">skipped</span>', '<span class="c-r">collapsed</span>', '4 (India ×3 counts once)'],
        ['<code>COUNT(1)</code>', 'rows (1 is never NULL)', 'counted', 'counted', '6 — same as COUNT(*)']
      ])}
      <p><b>🔵 How to choose.</b></p>
      <ul>
        <li>"How many <b>orders</b>?" → <code>COUNT(*)</code> (each row is an order).</li>
        <li>"How many customers <b>gave a phone</b>?" → <code>COUNT(phone)</code>.</li>
        <li>"How many <b>unique customers</b> ordered?" → <code>COUNT(DISTINCT customer_id)</code> — 5 people placed 14 orders.</li>
        <li>"How many rows have NULL in x?" → <code>COUNT(*) - COUNT(x)</code> or <code>SUM(x IS NULL)</code>.</li>
      </ul>
      <p><b>Myth buster:</b> <code>COUNT(1)</code> is <i>not</i> faster than <code>COUNT(*)</code> in any modern engine (PostgreSQL, MySQL, SQL Server, SQLite, Oracle). <code>*</code> here does not mean "read all columns" — it means "count rows". Pick <code>COUNT(*)</code> because it reads clearly.</p>
      <p><b>DISTINCT inside other aggregates</b> also works: <code>SUM(DISTINCT x)</code>, <code>AVG(DISTINCT x)</code> — but they are rarely what you want (two different orders of ₹120 would be summed once!). SQLite allows DISTINCT on only <b>one</b> argument; to count distinct <i>pairs</i> use a subquery or concatenate carefully.</p>`,
    clues: [
      '"number of <b>unique / different / distinct</b> users, products, cities…" → <code>COUNT(DISTINCT col)</code>.',
      '"how many rows / orders / events" → <code>COUNT(*)</code>.',
      '"how many customers <b>have</b> an email / phone" → <code>COUNT(col)</code>, which skips NULLs.',
      '"a student may sign up twice by mistake", "the table may contain duplicates" → plain COUNT(*) over-counts; use COUNT(DISTINCT).',
      '"how many values are missing" → <code>COUNT(*) - COUNT(col)</code>.',
      'Data comes from a JOIN (one-to-many) → rows get duplicated; COUNT(*) inflates, COUNT(DISTINCT id) is safe.'
    ],
    code: [
      { lang: 'sql', db: 'shop', title: 'Three COUNTs on one table', code: `SELECT COUNT(*)                AS customers,          -- 6 rows
       COUNT(phone)            AS with_phone,         -- 4 (NULL phones skipped)
       COUNT(email)            AS with_email,         -- 4
       COUNT(DISTINCT country) AS countries,          -- 4 (India counted once)
       COUNT(*) - COUNT(phone) AS missing_phone       -- 2
FROM customers;` },
      { lang: 'sql', db: 'shop', title: 'Orders vs unique buyers', code: `SELECT COUNT(*)                    AS orders,          -- 14
       COUNT(DISTINCT customer_id)  AS buyers,          -- 5 (Farid never ordered)
       COUNT(coupon)                AS coupon_orders,   -- 4
       COUNT(DISTINCT coupon)       AS coupon_codes     -- 2 (NEW10, BIG50)
FROM orders;` }
    ],
    codeTitle: ['COUNT flavours', 'Rows vs unique values'],
    viz: {
      title: 'Three counters reading the same column',
      input: 'Pune, Mumbai, NULL, Pune, Delhi, NULL, Mumbai, Pune',
      inputLabel: 'city values (text or NULL, comma separated)',
      gen: function (input) {
        var vals = parseList(input, 'Enter values like: Pune, NULL, Delhi', 12);
        var frames = [], cs = 0, cc = 0, seen = [];
        var code = 'SELECT COUNT(*),\n       COUNT(city),\n       COUNT(DISTINCT city)\nFROM employees;';
        frames.push({ narr: 'Three counters start at 0. The <b>set</b> on the right remembers which cities we have already seen — that is how COUNT(DISTINCT) avoids double counting.',
          parts: [{ type: 'array', label: 'city column', values: vals.map(show) }, { type: 'vars', label: 'Counters', vals: { 'COUNT(*)': 0, 'COUNT(city)': 0, 'COUNT(DISTINCT city)': 0 } }, { type: 'set', label: 'distinct cities seen', items: [] }, { type: 'code', lang: 'sql', code: code, hl: {} }] });
        vals.forEach(function (v, i) {
          var hl = {}, ah = {}, sh = {}, lines = { 1: 'ok' }, msg;
          cs++; hl['COUNT(*)'] = 'ok';
          if (v === null) {
            ah[i] = 'bad'; lines[2] = 'bad'; lines[3] = 'bad';
            msg = 'Row ' + (i + 1) + ' is <b>NULL</b>. COUNT(*) counts the row anyway (' + cs + '). COUNT(city) and COUNT(DISTINCT city) <span class="c-r">ignore NULL</span> — an unknown city is not a city.';
          } else {
            cc++; hl['COUNT(city)'] = 'ok'; lines[2] = 'ok';
            var key = show(v);
            if (seen.indexOf(key) < 0) {
              seen.push(key); hl['COUNT(DISTINCT city)'] = 'ok'; sh[key] = 'ok'; ah[i] = 'ok'; lines[3] = 'ok';
              msg = 'Row ' + (i + 1) + ' = <b>' + H.esc(key) + '</b>, never seen before → all three counters go up. Added to the set.';
            } else {
              sh[key] = 'bad'; ah[i] = 'cur'; lines[3] = 'bad';
              msg = 'Row ' + (i + 1) + ' = <b>' + H.esc(key) + '</b>, <span class="c-y">already in the set</span> → COUNT(*) and COUNT(city) go up, but COUNT(DISTINCT city) does <b>not</b>.';
            }
          }
          var ptr = {}; ptr[i] = 'row';
          frames.push({ narr: msg, parts: [{ type: 'array', label: 'city column', values: vals.map(show), hl: ah, ptr: ptr },
            { type: 'vars', label: 'Counters', vals: { 'COUNT(*)': cs, 'COUNT(city)': cc, 'COUNT(DISTINCT city)': seen.length }, hl: hl },
            { type: 'set', label: 'distinct cities seen', items: seen.slice(), hl: sh }, { type: 'code', lang: 'sql', code: code, hl: lines }] });
        });
        frames.push({ narr: 'Final: <b>' + cs + '</b> rows, <b>' + cc + '</b> known cities, <b>' + seen.length + '</b> different cities. Missing values = COUNT(*) − COUNT(city) = ' + (cs - cc) + '. Three different questions, three different answers from the same column.',
          parts: [{ type: 'table', label: 'Result', columns: ['COUNT(*)', 'COUNT(city)', 'COUNT(DISTINCT city)', 'missing'], rows: [[cs, cc, seen.length, cs - cc]], hl: { 0: 'sel' } }, { type: 'set', label: 'distinct cities', items: seen.slice() }] });
        return pad4(frames);
      }
    },
    examples: [
      {
        title: 'Duplicate sign-ups inflate COUNT(*)',
        html: `<p>Bilal signed up for Chess twice and Esha for Drama twice. COUNT(*) reports <b class="c-r">5</b> Chess members; COUNT(DISTINCT student_id) reports the truth, <b class="c-g">4</b>.</p>${H.table(['club', 'signups', 'members'], [['Chess', '5', '4'], ['Drama', '3', '2'], ['Football', '1', '1'], ['Robotics', '3', '3']])}`,
        code: { lang: 'sql', db: 'school', code: `SELECT club,
       COUNT(*)                   AS signups,  -- counts duplicate rows
       COUNT(DISTINCT student_id) AS members   -- each student once
FROM club_signups
GROUP BY club;` }
      },
      {
        title: 'COUNT(DISTINCT) ignores NULL — even as a "value"',
        html: `<p>The <code>employees.dept</code> column has 4 named departments and one NULL (Jia). <code>COUNT(DISTINCT dept)</code> = <b>4</b>, but <code>SELECT DISTINCT dept</code> returns <b>5</b> rows because DISTINCT as a row filter keeps one NULL row. Same word, different rule.</p>`,
        code: { lang: 'sql', db: 'company', code: `SELECT COUNT(DISTINCT dept) AS distinct_depts,                       -- 4
       (SELECT COUNT(*) FROM (SELECT DISTINCT dept FROM employees)) AS distinct_rows  -- 5
FROM employees;` }
      },
      {
        title: 'Counting NULLs three ways',
        html: `<p>How many employees have no bonus? All three expressions below give <b>6</b>. <code>SUM(bonus IS NULL)</code> works in SQLite/MySQL because a true comparison is 1; the CASE version is portable everywhere.</p>`,
        code: { lang: 'sql', db: 'company', code: `SELECT COUNT(*) - COUNT(bonus)                      AS by_subtraction,
       SUM(CASE WHEN bonus IS NULL THEN 1 ELSE 0 END) AS by_case,       -- portable
       SUM(bonus IS NULL)                             AS by_boolean     -- SQLite/MySQL shortcut
FROM employees;` }
      },
      {
        title: 'Distinct over two columns',
        html: `<p>"How many different (dept, city) combinations exist?" SQLite's COUNT(DISTINCT …) takes one argument, so count the rows of a DISTINCT subquery. Answer: <b>8</b> (NULL dept + Bengaluru is one of them).</p>`,
        code: { lang: 'sql', db: 'company', code: `SELECT COUNT(*) AS dept_city_pairs
FROM (SELECT DISTINCT dept, city FROM employees);` }
      }
    ],
    deepDive: `<p><b>🟣 Cost of DISTINCT.</b> COUNT(*) and COUNT(col) are streaming (O(1) memory). COUNT(DISTINCT col) must remember every value seen — a hash set (O(distinct) memory) or a sort (O(N log N)). On a billion rows that is the expensive part of a dashboard. Engines optimise it with an index on the column (walk distinct keys) or with <b>HyperLogLog</b> sketches: BigQuery <code>APPROX_COUNT_DISTINCT</code>, Snowflake <code>APPROX_COUNT_DISTINCT</code>, PostgreSQL extensions, Redis <code>PFCOUNT</code> — about 1–2% error using a few KB of memory.</p>
      <p><b>Why COUNT(*) is not "read every column".</b> The planner rewrites COUNT(*) to "count rows"; it may pick the narrowest index to scan. COUNT(col) must check NULL-ness, so it can be <i>slower</i> if col is not in that index. COUNT(1) is folded to COUNT(*) by optimizers.</p>
      <p><b>Joins multiply rows.</b> Joining customers to orders gives one row per order; joining that to order_items gives one row per item. COUNT(*) now counts items, not customers. The fix is COUNT(DISTINCT c.id) or aggregating before joining. This "fan-out" bug is the #1 cause of inflated metrics in real analytics code.</p>
      <p><b>Standard SQL vs dialects.</b> PostgreSQL supports <code>COUNT(DISTINCT (a, b))</code> on row values; MySQL supports <code>COUNT(DISTINCT a, b)</code>; SQLite supports neither, so use a subquery. Text comparisons in DISTINCT follow the column collation — 'Pune' and 'pune' are different under the default BINARY collation; use <code>LOWER()</code> or <code>COLLATE NOCASE</code> to merge them.</p>`,
    aiEra: `<p><b>🤖 What AI changes.</b> Ask a model for "number of users" and it may hand back <code>COUNT(*)</code> over an events table — counting events, not people. LLM-generated analytics often confuse rows and entities, especially after joins. Your job is to name the <b>grain</b> of the table ("one row per order") before trusting any COUNT.</p>
      <p><b>Use AI well:</b> prompt it with the grain: <i>"orders has one row per order; customers one row per customer. Write a query for unique buyers per country."</i> Ask it to add a sanity-check query (COUNT(*) vs COUNT(DISTINCT id)) alongside. For huge tables, ask whether an approximate distinct count is acceptable and what error rate it implies.</p>
      <p><b>What you still own:</b> knowing that COUNT(col) skips NULLs, that DISTINCT is costly at scale, and that fan-out from joins silently inflates counts. These are classic interview follow-ups because they catch people who only copy-paste.</p>`,
    problems: [{
      title: 'Contactability Report',
      level: 'Easy', tags: ['COUNT', 'DISTINCT', 'NULL'], companies: ['Salesforce', 'HubSpot', 'Zoho'],
      statement: `<p>Marketing wants one row describing the <code>customers</code> table (DB <b>shop</b>): <code>total</code> customers, <code>with_phone</code>, <code>with_email</code>, <code>reachable</code> (has a phone <i>or</i> an email), <code>unreachable</code> (neither), and <code>countries</code> (number of different countries).</p>`,
      constraints: `<p>Single SELECT. phone and email can be NULL.</p>`,
      example: `${H.table(['total', 'with_phone', 'with_email', 'reachable', 'unreachable', 'countries'], [['6', '4', '4', '<span class="c-g">5</span>', '<span class="c-r">1</span>', '4']])}<p>Deepa has neither phone nor email → unreachable. Bella has only email, Carlos only phone → both reachable. India appears 3 times but is one country.</p>`,
      brute: {
        why: `<p>Adding <code>COUNT(phone) + COUNT(email)</code> to get "reachable" double-counts everybody who has <i>both</i> (Aarav, Emma, Farid) → <b class="c-r">8</b>, more than the 6 customers that exist! And <code>COUNT(country)</code> counts India three times.</p>`,
        code: { lang: 'sql', db: 'shop', code: `-- Naive: double counts people with both contacts, and counts countries with repeats
SELECT COUNT(*)                     AS total,
       COUNT(phone) + COUNT(email)  AS reachable,   -- 8 (impossible: only 6 customers)
       COUNT(country)               AS countries    -- 6, not 4
FROM customers;` }
      },
      mcq: { q: 'Which expression counts customers with at least one contact method?', options: ['COUNT(phone) + COUNT(email)', 'COUNT(COALESCE(phone, email))', 'COUNT(phone AND email)', 'COUNT(*) - COUNT(phone)'], answer: 1, explain: 'COALESCE returns the first non-NULL of phone/email, so it is NULL only when both are NULL. COUNT then skips exactly the unreachable customers.' },
      hints: [
        `<p>Hint 1: COUNT(col) already skips NULLs — so COUNT(phone) and COUNT(email) are one-liners.</p>`,
        `<p>Hint 2: "phone OR email" in one expression: <code>COALESCE(phone, email)</code> is NULL only when both are missing. Count that.</p>`,
        `<p>Hint 3: unreachable = total − reachable; countries needs DISTINCT. Recipe: COUNT(*), COUNT(phone), COUNT(email), COUNT(COALESCE(phone,email)), the difference, COUNT(DISTINCT country).</p>`
      ],
      solution: {
        approach: `<p>Turn "has phone or email" into a single nullable expression with COALESCE and let COUNT skip the NULLs. Use subtraction for the complement and DISTINCT for unique countries.</p>`,
        code: { lang: 'sql', db: 'shop', code: `SELECT COUNT(*)                                   AS total,
       COUNT(phone)                               AS with_phone,
       COUNT(email)                               AS with_email,
       COUNT(COALESCE(phone, email))              AS reachable,    -- NULL only if both NULL
       COUNT(*) - COUNT(COALESCE(phone, email))   AS unreachable,
       COUNT(DISTINCT country)                    AS countries
FROM customers;` },
        complexity: `<p>One scan, O(N). COUNT(DISTINCT) adds a hash set of size O(#countries).</p>`,
        followUps: ['Show the same numbers per country.', 'Count customers who have BOTH phone and email.', 'Treat empty strings \'\' as missing too (hint: NULLIF).']
      }
    }]
  });

  /* =====================================================================
     TOPIC 3 — GROUP BY: buckets and the rules
     ===================================================================== */
  topics.push({
    title: 'GROUP BY: Sorting Rows into Buckets (and the Rules)',
    analogy: `<p>Think of sorting laundry. You dump the basket on the floor (FROM), then toss each item into a bucket by colour: whites, darks, colours (GROUP BY colour). Finally you write <b>one sticky note per bucket</b>: "whites: 7 items, heaviest = towel" (aggregates). You cannot write "the sock's name" on the whites note — there are many socks in that bucket. That is the golden rule of GROUP BY.</p>`,
    explain: `<p><b>🟢 The plain idea.</b> <code>GROUP BY dept</code> splits the rows into buckets, one bucket per different <code>dept</code> value. Then every aggregate is computed <b>per bucket</b>, and each bucket becomes <b>exactly one output row</b>.</p>
      ${H.table(['dept', 'headcount', 'paid', 'payroll', 'avg_sal'], [
        ['<span class="c-m">NULL</span>', '1', '1', '40000', '40000.0'],
        ['Engineering', '4', '<span class="c-y">3</span>', '320000', '106666.7'],
        ['HR', '2', '2', '93000', '46500.0'],
        ['Marketing', '1', '1', '70000', '70000.0'],
        ['Sales', '4', '4', '222000', '55500.0']
      ])}
      <p>12 employees went in, 5 rows came out — one per department (Jia's NULL department is its own bucket; Kofi's NULL salary makes Engineering's <code>paid</code> 3, not 4).</p>
      <p><b>🔵 The rules.</b></p>
      <ol>
        <li><b>The golden rule:</b> every column in SELECT must be either <b>in the GROUP BY</b> or <b>inside an aggregate</b> (constants and expressions over those are fine). <code>SELECT dept, name, COUNT(*) … GROUP BY dept</code> is an error in PostgreSQL, SQL Server, Oracle and MySQL 5.7+ (ONLY_FULL_GROUP_BY). SQLite and old MySQL silently pick <i>some</i> row's name — a bug waiting to happen.</li>
        <li><b>NULLs group together.</b> Even though <code>NULL = NULL</code> is not true in WHERE, GROUP BY (like DISTINCT) puts all NULL keys into one bucket.</li>
        <li><b>Group by several columns</b> → one bucket per <i>combination</i>: <code>GROUP BY dept, city</code> gives (Engineering, Pune), (Engineering, Bengaluru)…</li>
        <li><b>Group by an expression:</b> <code>GROUP BY substr(order_date, 1, 7)</code> buckets by month; <code>GROUP BY CASE … END</code> buckets by a band you invent.</li>
        <li><b>Aliases and positions:</b> SQLite, MySQL and PostgreSQL accept <code>GROUP BY month</code> (a SELECT alias) and <code>GROUP BY 1</code> (first SELECT column). SQL Server and Oracle do not accept aliases. Positions are handy but fragile — reordering SELECT changes the meaning.</li>
        <li><b>No ORDER BY = no promised order.</b> SQLite often returns groups sorted because it sorts to group, but hash-based engines (PostgreSQL HashAggregate, Spark) do not. Always add ORDER BY.</li>
        <li><b>Empty input → zero rows.</b> Without GROUP BY, an aggregate query always returns one row; with GROUP BY and no matching rows, you get <i>no rows at all</i>.</li>
        <li><b>GROUP BY without aggregates</b> behaves like <code>SELECT DISTINCT</code>.</li>
      </ol>`,
    clues: [
      '"<b>per</b> / <b>for each</b> / <b>by</b> department, month, country…" → GROUP BY that thing.',
      '"for each combination of X and Y" → <code>GROUP BY x, y</code>.',
      '"monthly / yearly / weekly" with a date column → group by an expression such as <code>substr(date,1,7)</code> or <code>strftime(\'%Y\', date)</code>.',
      '"the employee <b>with</b> the highest salary in each department" → NOT plain GROUP BY (that only gives the number); needs a join-back or window function (module 6).',
      'Error "must appear in the GROUP BY clause or be used in an aggregate function" → you broke the golden rule.',
      '"sorted by total descending" → <code>ORDER BY</code> the aggregate or its alias after grouping.'
    ],
    code: [
      { lang: 'sql', db: 'company', title: 'Headcount and payroll per department', code: `SELECT dept,
       COUNT(*)              AS headcount,  -- rows in the bucket
       COUNT(salary)         AS paid,       -- non-NULL salaries in the bucket
       SUM(salary)           AS payroll,
       ROUND(AVG(salary), 1) AS avg_sal,
       MAX(salary)           AS top_salary
FROM employees
GROUP BY dept                -- NULL dept (Jia) becomes its own group
ORDER BY payroll DESC;       -- order is only guaranteed with ORDER BY` },
      { lang: 'sql', db: 'company', title: 'Two grouping columns', code: `-- One output row per (dept, city) combination that actually exists
SELECT dept, city, COUNT(*) AS people
FROM employees
GROUP BY dept, city
ORDER BY dept, city;` },
      { lang: 'sql', db: 'shop', title: 'Group by an expression (month)', code: `SELECT substr(order_date, 1, 7) AS month,   -- 'YYYY-MM'
       COUNT(*)                   AS orders,
       SUM(amount)                AS revenue
FROM orders
WHERE status = 'delivered'
GROUP BY month                               -- SQLite/MySQL/Postgres allow the alias
ORDER BY month;` }
    ],
    codeTitle: ['Per department', 'Per (dept, city)', 'Per month'],
    viz: [
      groupViz({
        title: 'GROUP BY dept: rows dropped into buckets, then collapsed',
        input: 'Engineering,120; Engineering,95; Sales,60; HR,45; Sales,52; NULL,40; Engineering,NULL; HR,48',
        inputLabel: 'rows as dept,salary_k separated by ;',
        hint: 'Enter rows like: Sales,60; HR,NULL; NULL,40 (two values per row)',
        cols: ['dept', 'salary_k'], keyCols: [0], valCol: 1,
        aggs: [{ name: 'COUNT(*)', fn: 'COUNT*' }, { name: 'COUNT(salary_k)', fn: 'COUNT' }, { name: 'SUM(salary_k)', fn: 'SUM' }, { name: 'AVG(salary_k)', fn: 'AVG' }, { name: 'MAX(salary_k)', fn: 'MAX' }],
        sql: 'SELECT dept,\n       COUNT(*), COUNT(salary_k),\n       SUM(salary_k), AVG(salary_k), MAX(salary_k)\nFROM employees\nGROUP BY dept;',
        lines: { from: 4, group: 5, select: 1 }
      }),
      groupViz({
        title: 'GROUP BY dept, city: one bucket per combination',
        input: 'Eng,Pune,95; Eng,Blr,120; Sales,Delhi,58; Eng,Pune,NULL; Sales,Delhi,52; Sales,Mumbai,60; Eng,Blr,105',
        inputLabel: 'rows as dept,city,salary_k separated by ;',
        hint: 'Enter rows like: Eng,Pune,95; Sales,Delhi,NULL (three values per row)',
        cols: ['dept', 'city', 'salary_k'], keyCols: [0, 1], valCol: 2,
        aggs: [{ name: 'COUNT(*)', fn: 'COUNT*' }, { name: 'SUM(salary_k)', fn: 'SUM' }, { name: 'AVG(salary_k)', fn: 'AVG' }],
        sql: 'SELECT dept, city,\n       COUNT(*), SUM(salary_k), AVG(salary_k)\nFROM employees\nGROUP BY dept, city;',
        lines: { from: 3, group: 4, select: 1 }
      })
    ],
    examples: [
      {
        title: 'The golden rule, and SQLite\'s dangerous leniency',
        html: `<p><code>SELECT dept, name, AVG(salary) … GROUP BY dept</code> asks for <i>one</i> name per department, but Sales has four people. PostgreSQL refuses: <i>column "employees.name" must appear in the GROUP BY clause or be used in an aggregate function</i>. SQLite runs it and returns an arbitrary name (here "Dana" for Sales, "Gopal" for HR) — looks plausible, means nothing.</p>${H.table(['dept', 'AVG(salary)', 'name (arbitrary!)'], [['HR', '46500.0', '<span class="c-r">Gopal</span>'], ['Sales', '55500.0', '<span class="c-r">Dana</span>']])}<p>SQLite has one documented special case: with a single <code>MIN()</code> or <code>MAX()</code>, bare columns come from the row holding that min/max. Handy, but non-portable — in interviews, use a window function or join-back instead.</p>`,
        code: { lang: 'sql', db: 'company', code: `-- Runs in SQLite, ERROR in PostgreSQL / SQL Server / MySQL (ONLY_FULL_GROUP_BY)
SELECT dept, name, AVG(salary)
FROM employees
GROUP BY dept;` }
      },
      {
        title: 'Bucketing by a CASE band',
        html: `<p>Invent your own groups: salary bands. The NULL salary (Kofi) falls through every WHEN, so CASE returns NULL and he lands in a NULL band — a reminder to handle NULL explicitly.</p>${H.table(['band', 'people'], [['mid', '6'], ['low', '3'], ['high', '2'], ['<span class="c-m">NULL</span>', '1']])}`,
        code: { lang: 'sql', db: 'company', code: `SELECT CASE WHEN salary >= 100000 THEN 'high'
            WHEN salary >= 50000  THEN 'mid'
            WHEN salary IS NOT NULL THEN 'low'
       END AS band,
       COUNT(*) AS people
FROM employees
GROUP BY band
ORDER BY people DESC;` }
      },
      {
        title: 'No rows in, no rows out',
        html: `<p>Filter to a department that does not exist. Without GROUP BY you get one row <code>(0)</code>; with GROUP BY you get <b>zero rows</b>. Reports that must show "Legal: 0" need a list of departments joined to the counts (next module) — grouping can never invent a group that has no rows.</p>`,
        code: { lang: 'sql', db: 'company', code: `SELECT COUNT(*) AS n FROM employees WHERE dept = 'Legal';                 -- one row: 0
SELECT dept, COUNT(*) AS n FROM employees WHERE dept = 'Legal' GROUP BY dept;  -- zero rows` }
      },
      {
        title: 'GROUP BY = DISTINCT when there are no aggregates',
        html: `<p>Both queries return the five distinct departments (including NULL). Most planners produce the same plan. Prefer DISTINCT for "unique values" and GROUP BY when you will add aggregates.</p>`,
        code: { lang: 'sql', db: 'company', code: `SELECT DISTINCT dept FROM employees;
SELECT dept FROM employees GROUP BY dept;` }
      }
    ],
    deepDive: `<p><b>🟣 How GROUP BY is executed.</b> Two classic algorithms: <b>Sort-aggregate</b> (sort rows by the key, then walk once, closing a group whenever the key changes — O(N log N), streaming output, great if an index already provides the order) and <b>Hash-aggregate</b> (a hash table from key → accumulators, one pass, O(N) time, O(#groups) memory; spills to disk if groups do not fit in <code>work_mem</code>). PostgreSQL's EXPLAIN shows <code>GroupAggregate</code> vs <code>HashAggregate</code>; SQLite uses a sorter or an index (<code>USE TEMP B-TREE FOR GROUP BY</code> in EXPLAIN QUERY PLAN means it had to sort).</p>
      <p><b>Index tricks.</b> An index on <code>(dept, salary)</code> lets <code>SELECT dept, MAX(salary) … GROUP BY dept</code> skip the sort and even read only one entry per group ("loose index scan" in MySQL). Group keys order matters: an index on <code>(dept, city)</code> helps <code>GROUP BY dept, city</code> and <code>GROUP BY dept</code>, not <code>GROUP BY city</code>.</p>
      <p><b>Functional dependency.</b> The SQL:1999 standard and PostgreSQL 9.1+ allow <code>SELECT d.id, d.name, COUNT(*) … GROUP BY d.id</code> because <code>name</code> is functionally dependent on the primary key — one id, one name. MySQL 5.7+ does the same detection. SQLite does not check at all.</p>
      <p><b>Beyond simple grouping.</b> <code>GROUPING SETS</code>, <code>ROLLUP</code> (subtotals + grand total) and <code>CUBE</code> (all combinations) exist in PostgreSQL, SQL Server, Oracle, BigQuery, Snowflake; MySQL has <code>WITH ROLLUP</code>. SQLite has none — emulate with <code>UNION ALL</code> of several GROUP BY queries. Grouping by floating-point keys or case-varying text can split groups unexpectedly; normalise (ROUND, LOWER, TRIM) first.</p>`,
    aiEra: `<p><b>🤖 What AI changes.</b> Text-to-SQL is very good at "X per Y" — it will produce correct GROUP BY skeletons almost every time. Where it slips: picking the wrong <b>grain</b> (grouping by <code>order_date</code> when you asked "per month"), adding a non-aggregated column that SQLite or old MySQL silently accept, and forgetting ORDER BY. Because SQLite does not complain, an AI-written query can run green and still be wrong.</p>
      <p><b>Use AI well:</b> paste the schema and say the grain explicitly ("one row per month and status"). Ask: <i>"Would this query fail under PostgreSQL's strict GROUP BY rule? Which columns are not functionally dependent on the key?"</i> Ask it to generate a tiny dataset with a NULL key and check where that row ends up.</p>
      <p><b>What you still own:</b> the golden rule, the NULL-bucket behaviour, the "empty input → zero rows" trap, and choosing indexes so a 100-million-row GROUP BY does not spill to disk.</p>`,
    problems: [{
      title: 'Monthly Status Ledger',
      level: 'Medium', tags: ['GROUP BY', 'expression', 'multi-column'], companies: ['Stripe', 'Razorpay', 'Amazon'],
      statement: `<p>Finance wants one row per <b>(month, status)</b> pair from <code>orders</code> (DB <b>shop</b>), with the number of orders and the total amount (show <code>0</code>, not NULL, if every amount in the bucket is unknown). Month is <code>'YYYY-MM'</code>. Sort by month, then status.</p>`,
      constraints: `<p><code>order_date</code> is ISO text 'YYYY-MM-DD'. <code>amount</code> may be NULL. Only combinations that exist need to appear.</p>`,
      example: `${H.table(['month', 'status', 'orders', 'amount'], [['2024-01', 'delivered', '2', '1055'], ['2024-02', 'cancelled', '1', '30'], ['2024-02', 'delivered', '2', '65'], ['2024-02', 'returned', '1', '120'], ['2024-03', 'delivered', '3', '1970'], ['2024-03', 'pending', '1', '15'], ['2024-04', 'cancelled', '1', '120'], ['<span class="c-y">2024-04</span>', '<span class="c-y">delivered</span>', '<span class="c-y">3</span>', '<span class="c-y">100</span>']])}<p>April delivered has 3 orders (12, 13, 14) but order 14's amount is NULL, so the total is 45 + 55 = 100.</p>`,
      brute: {
        why: `<p>Grouping by the raw <code>order_date</code> gives one bucket per <b>day</b>, not per month — 14 rows of 1 order each, and the finance team still has to add them up by hand. The grain is wrong. (It also returns NULL instead of 0 for an all-NULL bucket.)</p>`,
        code: { lang: 'sql', db: 'shop', code: `-- Wrong grain: one group per day, not per month
SELECT order_date, status, COUNT(*) AS orders, SUM(amount) AS amount
FROM orders
GROUP BY order_date, status
ORDER BY order_date;` }
      },
      mcq: { q: 'Which GROUP BY gives one row per month and status?', options: ['GROUP BY order_date, status', 'GROUP BY substr(order_date, 1, 7), status', 'GROUP BY status', 'GROUP BY month(order_date) — works in every database'], answer: 1, explain: 'substr(order_date,1,7) turns 2024-03-12 into 2024-03, so all March rows share one key; adding status splits each month by status. month() is MySQL-only and returns just the month number (mixing years!).' },
      hints: [
        `<p>Hint 1: The bucket key is a <b>combination</b>: (month, status). Both go into GROUP BY.</p>`,
        `<p>Hint 2: Month comes from an expression: <code>substr(order_date, 1, 7)</code> (or <code>strftime('%Y-%m', order_date)</code>). Keep the year — grouping by month number alone would merge Jan 2024 with Jan 2025.</p>`,
        `<p>Hint 3: SUM of only NULLs is NULL → wrap it: <code>COALESCE(SUM(amount), 0)</code>. Recipe: SELECT month expr, status, COUNT(*), COALESCE(SUM) → GROUP BY month, status → ORDER BY month, status.</p>`
      ],
      solution: {
        approach: `<p>Make the month with an expression, group by (month, status), count rows, sum amounts with a NULL-safe COALESCE, and order explicitly.</p>`,
        code: { lang: 'sql', db: 'shop', code: `SELECT substr(order_date, 1, 7)    AS month,
       status,
       COUNT(*)                     AS orders,
       COALESCE(SUM(amount), 0)     AS amount     -- 0 instead of NULL for all-NULL buckets
FROM orders
GROUP BY month, status
ORDER BY month, status;` },
        alt: [{ lang: 'sql', db: 'shop', title: 'Portable (no alias in GROUP BY, for SQL Server/Oracle)', code: `SELECT strftime('%Y-%m', order_date) AS month, status, COUNT(*) AS orders,
       COALESCE(SUM(amount), 0) AS amount
FROM orders
GROUP BY strftime('%Y-%m', order_date), status
ORDER BY 1, 2;` }],
        complexity: `<p>O(N) with hash aggregation (or O(N log N) with sort aggregation); memory O(#month-status pairs). An index on <code>order_date</code> cannot help much because we group by an expression of it — a generated <code>month</code> column with an index would.</p>`,
        followUps: ['Show every status for every month, even with 0 orders (needs a calendar × status list and a LEFT JOIN).', 'Add a grand-total row (ROLLUP in Postgres, UNION ALL in SQLite).', 'Make each month a column instead of a row (conditional aggregation, topic 6).']
      }
    }]
  });
  registerModule({ id: 'sql03', title: 'Aggregates, GROUP BY, HAVING & CASE', intro: '<p>stub</p>', goals: [], prereqs: 'x', hours: 8,
    databases: { company: DB_COMPANY, shop: DB_SHOP, school: DB_SCHOOL, app: DB_APP },
    topics: topics, practice: practice, quiz: quiz, interview: interview });
})();
