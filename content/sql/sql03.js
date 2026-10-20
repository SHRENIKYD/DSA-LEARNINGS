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
  (2, 3, '2025-06-25', 1), (2, 3, '2025-06-27', 2), (2, 3, '2025-06-28', 1),
  (3, 1, '2025-03-02', 0), (3, 4, '2025-07-03', 5),
  (4, 1, '2025-05-10', 3), (4, 1, '2025-05-11', 2), (4, 2, '2025-05-20', 4);
CREATE TABLE campaigns (
  id      INTEGER PRIMARY KEY,
  channel TEXT,                -- NULL = untracked source
  name    TEXT NOT NULL,
  clicks  INTEGER NOT NULL,
  signups INTEGER,             -- NULL = tracking pixel was broken
  spend   INTEGER NOT NULL
);
INSERT INTO campaigns VALUES
  (1, 'search', 'Brand keywords',   400, 40,   2000),
  (2, 'search', 'Generic keywords', 900, 27,   4500),
  (3, 'social', 'Reels promo',        0, 0,     500),
  (4, 'social', 'Influencer',       250, NULL, 3000),
  (5, 'email',  'Newsletter',       120, 18,      0),
  (6, NULL,     'Untracked QR',      60, 6,     300),
  (7, 'email',  'Win-back',           0, NULL,    0),
  (8, 'tv',     'Cricket ad',         0, NULL, 9000);
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
      tests: { engine: 'sqlite', cases: [
        { cols: ['orders', 'revenue', 'avg_order', 'smallest', 'biggest', 'missing_amounts'], rows: [[10, 3190, 354.44, 25, 1020, 1]] },
        { setup: 'UPDATE orders SET status = \'pending\' WHERE status = \'delivered\';', cols: ['orders', 'revenue', 'avg_order', 'smallest', 'biggest', 'missing_amounts'], rows: [[0, null, null, null, null, 0]] },
        { setup: 'UPDATE orders SET amount = NULL WHERE status = \'delivered\';', cols: ['orders', 'revenue', 'avg_order', 'smallest', 'biggest', 'missing_amounts'], rows: [[10, null, null, null, null, 10]] },
        { setup: 'DELETE FROM orders WHERE status = \'delivered\' AND id <> 1;', cols: ['orders', 'revenue', 'avg_order', 'smallest', 'biggest', 'missing_amounts'], rows: [[1, 920, 920, 920, 920, 0]] },
        { setup: 'INSERT INTO orders (id, customer_id, order_date, status, amount) VALUES (15, 1, \'2024-05-01\', \'delivered\', 0);INSERT INTO orders (id, customer_id, order_date, status, amount) VALUES (16, 2, \'2024-05-02\', \'delivered\', -10);', cols: ['orders', 'revenue', 'avg_order', 'smallest', 'biggest', 'missing_amounts'], rows: [[12, 3180, 289.09, -10, 1020, 1]] },
        { setup: 'UPDATE orders SET amount = 100 WHERE status = \'delivered\' AND amount IS NULL; UPDATE orders SET amount = 7 WHERE id = 2;', cols: ['orders', 'revenue', 'avg_order', 'smallest', 'biggest', 'missing_amounts'], rows: [[10, 3162, 316.2, 7, 1020, 0]] },
        { setup: 'DELETE FROM orders;', cols: ['orders', 'revenue', 'avg_order', 'smallest', 'biggest', 'missing_amounts'], rows: [[0, null, null, null, null, 0]] }
      ] },
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
      tests: { engine: 'sqlite', cases: [
        { cols: ['total', 'with_phone', 'with_email', 'reachable', 'unreachable', 'countries'], rows: [[6, 4, 4, 5, 1, 4]] },
        { setup: 'UPDATE customers SET phone = NULL, email = NULL;', cols: ['total', 'with_phone', 'with_email', 'reachable', 'unreachable', 'countries'], rows: [[6, 0, 0, 0, 6, 4]] },
        { setup: 'UPDATE customers SET phone = \'1\', email = \'x@y.z\';', cols: ['total', 'with_phone', 'with_email', 'reachable', 'unreachable', 'countries'], rows: [[6, 6, 6, 6, 0, 4]] },
        { setup: 'DELETE FROM customers;', cols: ['total', 'with_phone', 'with_email', 'reachable', 'unreachable', 'countries'], rows: [[0, 0, 0, 0, 0, 0]] },
        { setup: 'UPDATE customers SET country = NULL WHERE id IN (1, 4, 6);', cols: ['total', 'with_phone', 'with_email', 'reachable', 'unreachable', 'countries'], rows: [[6, 4, 4, 5, 1, 3]] },
        { setup: 'INSERT INTO customers (id, name, country) VALUES (7, \'G\', \'Chile\'), (8, \'H\', \'Chile\');', cols: ['total', 'with_phone', 'with_email', 'reachable', 'unreachable', 'countries'], rows: [[8, 4, 4, 5, 3, 5]] },
        { setup: 'UPDATE customers SET country = \'India\';', cols: ['total', 'with_phone', 'with_email', 'reachable', 'unreachable', 'countries'], rows: [[6, 4, 4, 5, 1, 1]] }
      ] },
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
      tests: { engine: 'sqlite', cases: [
        { cols: ['month', 'status', 'orders', 'amount'], rows: [['2024-01', 'delivered', 2, 1055], ['2024-02', 'cancelled', 1, 30], ['2024-02', 'delivered', 2, 65], ['2024-02', 'returned', 1, 120], ['2024-03', 'delivered', 3, 1970], ['2024-03', 'pending', 1, 15], ['2024-04', 'cancelled', 1, 120], ['2024-04', 'delivered', 3, 100]] },
        { setup: 'UPDATE orders SET amount = NULL WHERE status = \'cancelled\';', cols: ['month', 'status', 'orders', 'amount'], rows: [['2024-01', 'delivered', 2, 1055], ['2024-02', 'cancelled', 1, 0], ['2024-02', 'delivered', 2, 65], ['2024-02', 'returned', 1, 120], ['2024-03', 'delivered', 3, 1970], ['2024-03', 'pending', 1, 15], ['2024-04', 'cancelled', 1, 0], ['2024-04', 'delivered', 3, 100]] },
        { setup: 'DELETE FROM orders;', rows: [] },
        { setup: 'UPDATE orders SET order_date = \'2024-01-31\';', cols: ['month', 'status', 'orders', 'amount'], rows: [['2024-01', 'cancelled', 2, 150], ['2024-01', 'delivered', 10, 3190], ['2024-01', 'pending', 1, 15], ['2024-01', 'returned', 1, 120]] },
        { setup: 'INSERT INTO orders (id, customer_id, order_date, status, amount) VALUES (15, 1, \'2025-01-05\', \'delivered\', 10);INSERT INTO orders (id, customer_id, order_date, status, amount) VALUES (16, 2, \'2023-01-05\', \'pending\', 20);INSERT INTO orders (id, customer_id, order_date, status, amount) VALUES (17, 3, \'2024-02-29\', \'returned\', 5);', cols: ['month', 'status', 'orders', 'amount'], rows: [['2023-01', 'pending', 1, 20], ['2024-01', 'delivered', 2, 1055], ['2024-02', 'cancelled', 1, 30], ['2024-02', 'delivered', 2, 65], ['2024-02', 'returned', 2, 125], ['2024-03', 'delivered', 3, 1970], ['2024-03', 'pending', 1, 15], ['2024-04', 'cancelled', 1, 120], ['2024-04', 'delivered', 3, 100], ['2025-01', 'delivered', 1, 10]] },
        { setup: 'UPDATE orders SET status = \'delivered\' WHERE status <> \'delivered\';', cols: ['month', 'status', 'orders', 'amount'], rows: [['2024-01', 'delivered', 2, 1055], ['2024-02', 'delivered', 4, 215], ['2024-03', 'delivered', 4, 1985], ['2024-04', 'delivered', 4, 220]] }
      ] },
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

  /* =====================================================================
     TOPIC 4 — HAVING vs WHERE and the logical processing order
     ===================================================================== */
  topics.push({
    title: 'HAVING vs WHERE (and Why the Order of Clauses Matters)',
    analogy: `<p>A school picks teams for a quiz contest. <b>Step 1 (WHERE)</b>: the gatekeeper checks each <i>student</i> at the door — "only students with a library card may enter". <b>Step 2 (GROUP BY)</b>: students stand with their class. <b>Step 3 (HAVING)</b>: the judge looks at each <i>class as a whole</i> — "only classes with at least 3 students inside may compete". The gatekeeper can't judge class sizes (the classes haven't formed yet); the judge doesn't check individual cards. Different people, different moments.</p>`,
    explain: `<p><b>🟢 The plain idea.</b> <b>WHERE filters rows</b> before grouping. <b>HAVING filters groups</b> after grouping. So a condition on a plain column (<code>salary &gt;= 50000</code>) normally goes in WHERE, and a condition on an aggregate (<code>COUNT(*) &gt;= 2</code>) <i>must</i> go in HAVING.</p>
      <p><b>🔵 The logical processing order</b> — not the order you type, but the order the database <i>thinks</i>:</p>
      ${H.table(['#', 'Clause', 'What it sees', 'Consequence'], [
        ['1', '<code>FROM</code> / JOIN', 'all rows', 'tables combined'],
        ['2', '<code>WHERE</code>', 'one row at a time', '<span class="c-r">no aggregates allowed</span> (they do not exist yet)'],
        ['3', '<code>GROUP BY</code>', 'surviving rows', 'buckets formed'],
        ['4', '<code>HAVING</code>', 'one group at a time', 'aggregates allowed; filters whole groups'],
        ['5', '<code>SELECT</code>', 'one row per group', 'expressions and aliases are created here'],
        ['6', '<code>DISTINCT</code>', 'output rows', 'duplicates removed'],
        ['7', '<code>ORDER BY</code>', 'output rows', 'can use SELECT aliases'],
        ['8', '<code>LIMIT</code> / OFFSET', 'sorted rows', 'cut to size']
      ])}
      <p>Read that table and most "why does this error?" questions answer themselves:</p>
      <ul>
        <li><code>WHERE COUNT(*) &gt; 2</code> → error (SQLite: <i>misuse of aggregate: COUNT()</i>). Counting happens at step 3–4.</li>
        <li><code>HAVING COUNT(*) &gt;= 2</code> → fine; HAVING may even use aggregates that are <b>not</b> in SELECT (e.g. <code>HAVING MAX(salary) &gt;= 100000</code> while selecting <code>SUM(bonus)</code>).</li>
        <li>Using a SELECT alias in WHERE is invalid in standard SQL/PostgreSQL (alias is born at step 5). SQLite and MySQL bend this rule (MySQL in HAVING, SQLite in both) — do not rely on it in interviews.</li>
        <li>ORDER BY runs last, so <code>ORDER BY total DESC</code> using an alias works everywhere.</li>
      </ul>
      <p><b>Both together</b> is the most common pattern: "departments with at least 2 employees earning 50k+" = WHERE salary ≥ 50000 (rows) <b>then</b> HAVING COUNT(*) ≥ 2 (groups).</p>
      <p><b>Where should a non-aggregate condition go?</b> <code>HAVING dept &lt;&gt; 'HR'</code> works, but put it in WHERE: rows are thrown away before the expensive grouping work. Good optimizers move it for you; good engineers don't make them.</p>`,
    clues: [
      '"departments / customers / products <b>with more than N</b> …" → HAVING COUNT(*) &gt; N.',
      '"whose <b>total / average</b> is above X" → HAVING SUM(…) / AVG(…) &gt; X.',
      '"only consider orders that…" / "excluding cancelled" → a row filter → WHERE.',
      '"<b>at least</b> N <b>distinct</b>…" → HAVING COUNT(DISTINCT col) &gt;= N.',
      '"bought <b>all</b> products / visited <b>every</b> city" → relational division: HAVING COUNT(DISTINCT x) = (SELECT COUNT(*) …).',
      'Error "misuse of aggregate" or "aggregate functions are not allowed in WHERE" → move that condition to HAVING.'
    ],
    code: [
      { lang: 'sql', db: 'company', title: 'WHERE then HAVING', code: `-- Departments with at least 2 employees earning 50k or more
SELECT dept,
       COUNT(*)              AS well_paid,
       ROUND(AVG(salary), 0) AS avg_of_well_paid
FROM employees
WHERE salary >= 50000          -- 1) row filter: drops HR, Jia, Kofi (NULL salary)
GROUP BY dept                  -- 2) buckets of surviving rows
HAVING COUNT(*) >= 2           -- 3) group filter: drops Marketing (only 1)
ORDER BY well_paid DESC;` },
      { lang: 'sql', db: 'company', title: 'HAVING on an aggregate you do not select', code: `-- Bonus pool of departments that have at least one 100k+ earner
SELECT dept, SUM(bonus) AS bonus_pool
FROM employees
GROUP BY dept
HAVING MAX(salary) >= 100000;   -- MAX is not in SELECT, still allowed` },
      { lang: 'sql', db: 'school', title: 'HAVING with COUNT(DISTINCT)', code: `-- Clubs with at least 3 different students (duplicate sign-ups ignored)
SELECT club, COUNT(DISTINCT student_id) AS members
FROM club_signups
GROUP BY club
HAVING COUNT(DISTINCT student_id) >= 3;` }
    ],
    codeTitle: ['WHERE + HAVING', 'HAVING on hidden aggregate', 'HAVING COUNT(DISTINCT)'],
    viz: [
      groupViz({
        title: 'WHERE kills rows, HAVING kills groups',
        input: 'Engineering,120; Engineering,95; Sales,60; HR,45; Sales,52; Marketing,70; Engineering,NULL; HR,48; Sales,58',
        inputLabel: 'rows as dept,salary_k separated by ;',
        hint: 'Enter rows like: Sales,60; HR,NULL (two values per row)',
        cols: ['dept', 'salary_k'], keyCols: [0], valCol: 1,
        aggs: [{ name: 'COUNT(*)', fn: 'COUNT*' }, { name: 'AVG(salary_k)', fn: 'AVG' }],
        where: { text: 'salary_k >= 50', test: function (r) { return r[1] !== null && typeof r[1] === 'number' && r[1] >= 50; } },
        having: { text: 'COUNT(*) >= 2', test: function (a) { return a['COUNT(*)'] >= 2; } },
        sql: 'SELECT dept, COUNT(*), AVG(salary_k)\nFROM employees\nWHERE salary_k >= 50\nGROUP BY dept\nHAVING COUNT(*) >= 2;',
        lines: { select: 1, from: 2, where: 3, group: 4, having: 5 }
      }),
      groupViz({
        title: 'HAVING on an average (no WHERE)',
        input: 'Engineering,120; Engineering,95; Sales,60; HR,45; Sales,52; Marketing,70; HR,48; NULL,40',
        inputLabel: 'rows as dept,salary_k separated by ;',
        hint: 'Enter rows like: Sales,60; HR,NULL (two values per row)',
        cols: ['dept', 'salary_k'], keyCols: [0], valCol: 1,
        aggs: [{ name: 'COUNT(*)', fn: 'COUNT*' }, { name: 'AVG(salary_k)', fn: 'AVG' }],
        having: { text: 'AVG(salary_k) > 60', test: function (a) { return a['AVG(salary_k)'] !== null && a['AVG(salary_k)'] > 60; } },
        sql: 'SELECT dept, COUNT(*), AVG(salary_k)\nFROM employees\nGROUP BY dept\nHAVING AVG(salary_k) > 60;',
        lines: { select: 1, from: 2, group: 3, having: 4 }
      })
    ],
    examples: [
      {
        title: 'Same words, different answers: filter rows vs filter groups',
        html: `<p>"Customers with 2+ delivered orders and more than ₹100 spent." Put <code>amount &gt; 100</code> in WHERE and you keep only <i>big orders</i> — then nobody has 2 of them → <b class="c-r">empty result</b>. Put <code>SUM(amount) &gt; 100</code> in HAVING and you judge each customer's <i>total</i> → customers 1 and 2.</p>${H.table(['customer_id', 'orders', 'spend'], [['1', '3', '1025'], ['2', '3', '205']])}`,
        code: { lang: 'sql', db: 'shop', code: `SELECT customer_id, COUNT(*) AS orders, SUM(amount) AS spend
FROM orders
WHERE status = 'delivered'                 -- row condition
GROUP BY customer_id
HAVING COUNT(*) >= 2 AND SUM(amount) > 100; -- group conditions` }
      },
      {
        title: 'HAVING without GROUP BY',
        html: `<p>With no GROUP BY, the whole table is one group, so HAVING decides whether the single summary row appears at all. Below, 12 employees is not more than 100, so the result has <b>zero rows</b>. (Allowed in standard SQL; SQLite accepts it from 3.39.)</p>`,
        code: { lang: 'sql', db: 'company', code: `SELECT COUNT(*) AS staff
FROM employees
HAVING COUNT(*) > 100;   -- returns no rows` }
      },
      {
        title: 'Aggregate in WHERE is an error — and the fix',
        html: `<p><code>SELECT dept, COUNT(*) FROM employees WHERE COUNT(*) &gt; 2 GROUP BY dept</code> fails with <i>misuse of aggregate: COUNT()</i> in SQLite (PostgreSQL: <i>aggregate functions are not allowed in WHERE</i>). Move it to HAVING:</p>${H.table(['dept', 'n'], [['Engineering', '4'], ['Sales', '4']])}`,
        code: { lang: 'sql', db: 'company', code: `SELECT dept, COUNT(*) AS n
FROM employees
GROUP BY dept
HAVING COUNT(*) > 2;` }
      },
      {
        title: 'Above the company average (HAVING + scalar subquery)',
        html: `<p>The company-wide average salary is 67,727. Which departments beat it? Compare each group's AVG with a subquery that computes the global AVG once. Answer: Engineering (106,667) and Marketing (70,000).</p>`,
        code: { lang: 'sql', db: 'company', code: `SELECT dept, ROUND(AVG(salary)) AS dept_avg
FROM employees
GROUP BY dept
HAVING AVG(salary) > (SELECT AVG(salary) FROM employees);` }
      }
    ],
    deepDive: `<p><b>🟣 Logical vs physical order.</b> The 8-step order is a <i>meaning</i> model, not an execution plan. Optimizers freely push predicates down: a <code>HAVING dept = 'Sales'</code> (a condition only on a grouping column) is moved below the aggregation into a WHERE automatically in PostgreSQL, SQL Server and Oracle — but not every engine is that clever, and SQLite only does it in limited cases. Writing it in WHERE yourself is clearer and never slower.</p>
      <p><b>Why WHERE can't see aggregates, formally.</b> WHERE is evaluated per input row; an aggregate needs a <i>set</i> of rows. In relational algebra: σ (selection) → γ (grouping/aggregation) → σ again (HAVING) → π (projection, SELECT). HAVING is simply "a selection after γ".</p>
      <p><b>Relational division with HAVING.</b> "Students who joined every club", "customers who bought all categories": group by the person and require <code>COUNT(DISTINCT thing) = (SELECT COUNT(DISTINCT thing) FROM catalog)</code>. Always use DISTINCT — duplicates in the fact table would let someone "complete" the set with repeats. The NOT EXISTS/NOT EXISTS double negation is the other classic formulation (module 5).</p>
      <p><b>NULL in HAVING.</b> <code>HAVING AVG(x) &gt; 60</code> on a group whose x values are all NULL compares NULL &gt; 60 → UNKNOWN → group dropped, silently. <code>HAVING SUM(x) &lt; 10</code> also drops all-NULL groups — wrap with COALESCE if they should count as 0.</p>
      <p><b>Dialect notes.</b> PostgreSQL forbids output aliases in HAVING (<code>HAVING total &gt; 5</code> fails — repeat the expression). MySQL allows aliases in HAVING. SQLite allows aliases in WHERE and HAVING. SQL Server/Oracle allow neither. Snowflake, BigQuery and Databricks add <code>QUALIFY</code> — a HAVING for window functions.</p>`,
    aiEra: `<p><b>🤖 What AI changes.</b> LLMs almost never put an aggregate in WHERE any more — the error is too well known. The subtle mistake they still make is the <b>semantic</b> one: the request says "customers who spent more than 100" and the model writes <code>WHERE amount &gt; 100</code> (orders over 100) instead of <code>HAVING SUM(amount) &gt; 100</code> (customers over 100). Both run; only one answers the question.</p>
      <p><b>Use AI well:</b> ask it to restate the question as "keep rows where … then keep groups where …" before writing SQL. Ask for a tiny dataset where the WHERE version and the HAVING version give different results — if it cannot produce one, the two are equivalent and you can pick the faster one.</p>
      <p><b>What you still own:</b> reading business language precisely ("orders over" vs "customers whose orders total over"), knowing the logical order by heart so you can debug alias errors across dialects, and pushing filters into WHERE for performance on large tables.</p>`,
    problems: [{
      title: 'Repeat Big Spenders',
      level: 'Medium', tags: ['HAVING', 'WHERE', 'GROUP BY'], companies: ['Amazon', 'Meesho', 'Walmart'],
      statement: `<p>From <code>orders</code> (DB <b>shop</b>), list <code>customer_id</code>, <code>orders</code> and <code>spend</code> for customers who have <b>at least 2 delivered orders</b> and whose <b>delivered spend totals more than 100</b>. Sort by spend, highest first.</p>`,
      constraints: `<p>Only status 'delivered' counts. NULL amounts count as an order but add nothing to spend.</p>`,
      example: `${H.table(['customer_id', 'orders', 'spend'], [['<span class="c-g">1</span>', '3', '1025'], ['<span class="c-g">2</span>', '3', '205']])}<p>Customer 3 has 2 delivered orders but spend 40 (one amount is NULL) → fails the spend test. Customers 4 and 5 have only 1 delivered order each, despite big amounts.</p>`,
      brute: {
        why: `<p>Moving the spend test into WHERE (<code>amount &gt; 100</code>) filters <b>orders</b>, not customers. It keeps only the 920, 135, 1020 and 900 orders, nobody has two of those, and the result is <b class="c-r">empty</b>. The condition was about a <i>group total</i>, so it belongs in HAVING.</p>`,
        code: { lang: 'sql', db: 'shop', code: `-- Wrong: per-order filter instead of per-customer total (returns nothing)
SELECT customer_id, COUNT(*) AS orders, SUM(amount) AS spend
FROM orders
WHERE status = 'delivered' AND amount > 100
GROUP BY customer_id
HAVING COUNT(*) >= 2;` }
      },
      mcq: { q: 'Where does "status = \'delivered\'" belong, and where does "SUM(amount) > 100"?', options: ['Both in WHERE', 'Both in HAVING', 'status in WHERE, SUM in HAVING', 'status in HAVING, SUM in WHERE'], answer: 2, explain: 'status is a property of each row → WHERE (filter early). SUM(amount) is a property of a group → HAVING, after GROUP BY has built the groups.' },
      hints: [
        `<p>Hint 1: Separate the conditions: which ones talk about a single order, which ones talk about a customer's collection of orders?</p>`,
        `<p>Hint 2: Row condition (status) → WHERE. Group conditions (number of orders, total spend) → HAVING with COUNT(*) and SUM(amount).</p>`,
        `<p>Hint 3: Recipe: FROM orders → WHERE delivered → GROUP BY customer_id → HAVING COUNT(*) &gt;= 2 AND SUM(amount) &gt; 100 → ORDER BY spend DESC. Remember SUM skips NULL.</p>`
      ],
      tests: { engine: 'sqlite', cases: [
        { cols: ['customer_id', 'orders', 'spend'], rows: [[1, 3, 1025], [2, 3, 205]] },
        { setup: 'UPDATE orders SET amount = 60 WHERE id = 4; ', cols: ['customer_id', 'orders', 'spend'], rows: [[1, 3, 1025], [2, 3, 205]] },
        { setup: 'INSERT INTO orders (id, customer_id, order_date, status, amount) VALUES (15, 5, \'2024-05-01\', \'delivered\', 1);INSERT INTO orders (id, customer_id, order_date, status, amount) VALUES (16, 4, \'2024-05-01\', \'delivered\', 100);INSERT INTO orders (id, customer_id, order_date, status, amount) VALUES (17, 6, \'2024-05-02\', \'delivered\', 50);INSERT INTO orders (id, customer_id, order_date, status, amount) VALUES (18, 6, \'2024-05-03\', \'delivered\', 50);', cols: ['customer_id', 'orders', 'spend'], rows: [[1, 3, 1025], [5, 2, 1021], [4, 2, 1000], [2, 3, 205]] },
        { setup: 'INSERT INTO orders (id, customer_id, order_date, status, amount) VALUES (15, 5, \'2024-05-01\', \'delivered\', 101);INSERT INTO orders (id, customer_id, order_date, status, amount) VALUES (16, 4, \'2024-05-02\', \'delivered\', 200);', cols: ['customer_id', 'orders', 'spend'], rows: [[5, 2, 1121], [4, 2, 1100], [1, 3, 1025], [2, 3, 205]] },
        { setup: 'UPDATE orders SET status = \'cancelled\' WHERE customer_id = 2;', cols: ['customer_id', 'orders', 'spend'], rows: [[1, 3, 1025]] },
        { setup: 'UPDATE orders SET amount = NULL;', rows: [] },
        { setup: 'UPDATE orders SET amount = 10000 WHERE id = 14; UPDATE orders SET amount = 5000 WHERE id = 2;', cols: ['customer_id', 'orders', 'spend'], rows: [[3, 2, 10040], [2, 3, 5070], [1, 3, 1025]] }
      ] },
      solution: {
        approach: `<p>Filter rows to delivered orders first (cheap, shrinks the data), group by customer, then filter groups using both aggregates in HAVING.</p>`,
        code: { lang: 'sql', db: 'shop', code: `SELECT customer_id,
       COUNT(*)    AS orders,
       SUM(amount) AS spend
FROM orders
WHERE status = 'delivered'            -- row filter
GROUP BY customer_id
HAVING COUNT(*) >= 2                  -- group filters
   AND SUM(amount) > 100
ORDER BY spend DESC;` },
        complexity: `<p>O(N) scan + hash aggregation, memory O(#customers). An index on <code>(status, customer_id)</code> lets the engine read only delivered rows already ordered by customer.</p>`,
        followUps: ['Also show the customer\'s name (JOIN customers — next module).', 'Count only orders placed in 2024-Q1.', 'Which customers have more cancelled than delivered orders? (conditional aggregation in HAVING)']
      }
    }]
  });

  /* =====================================================================
     TOPIC 5 — CASE expressions
     ===================================================================== */
  // caseViz: walk every row through the WHEN branches, top to bottom, first match wins
  function caseViz(cfg) {
    return {
      title: cfg.title, input: cfg.input, inputLabel: cfg.inputLabel,
      gen: function (input) {
        var vals = parseList(input, 'Enter numbers or NULL separated by commas, e.g. 920, 135, NULL, 40', 10);
        vals.forEach(function (v) { if (v !== null && typeof v !== 'number') throw new Error('Only numbers or NULL, e.g. 920, 135, NULL, 40'); });
        var code = 'CASE\n' + cfg.branches.map(function (b) { return '  WHEN ' + b.text + ' THEN \'' + b.label + '\''; }).join('\n') + '\n  ELSE \'' + cfg.elseLabel + '\'\nEND AS ' + cfg.alias;
        var frames = [], out = [];
        frames.push({ narr: cfg.intro, parts: [{ type: 'array', label: cfg.col + ' values', values: vals.map(show) }, { type: 'code', label: 'The CASE expression', lang: 'sql', code: code, hl: {} }] });
        vals.forEach(function (v, i) {
          var hl = {}, checks = [], label = null;
          for (var b = 0; b < cfg.branches.length; b++) {
            var br = cfg.branches[b], res = br.test(v);
            checks.push(br.text.replace(/\s+/g, ' ') + ' → ' + (res === null ? 'UNKNOWN' : res ? 'TRUE' : 'false'));
            if (res === true) { hl[b + 2] = 'ok'; label = br.label; break; }
            hl[b + 2] = 'bad';
          }
          if (label === null) { label = cfg.elseLabel; hl[cfg.branches.length + 2] = 'ok'; }
          out.push([show(v), label]);
          var th = {}; for (var k = 0; k < i; k++) th[k] = 'done'; th[i] = 'sel';
          var ah = {}; ah[i] = 'cur';
          frames.push({
            narr: 'Row ' + (i + 1) + ': ' + H.esc(cfg.col) + ' = <b>' + esc(v) + '</b>. Checks top to bottom: ' + checks.map(function (c) { return H.esc(c); }).join('; ') + '. ' +
              (hl[cfg.branches.length + 2] === 'ok' ? 'No WHEN was TRUE, so <b>ELSE</b> gives <b>' + H.esc(label) + '</b>.' : 'First TRUE branch wins → <b>' + H.esc(label) + '</b>; the remaining WHENs are never looked at.') +
              (v === null ? ' (Any comparison with NULL is UNKNOWN, which is not TRUE.)' : ''),
            parts: [{ type: 'array', label: cfg.col + ' values', values: vals.map(show), hl: ah }, { type: 'code', label: 'The CASE expression', lang: 'sql', code: code, hl: hl },
              { type: 'table', label: 'Output so far', columns: [cfg.col, cfg.alias], rows: out.map(function (r) { return r.slice(); }), hl: th }]
          });
        });
        var counts = {}, order = [];
        out.forEach(function (r) { if (!(r[1] in counts)) { counts[r[1]] = 0; order.push(r[1]); } counts[r[1]]++; });
        var labelsAll = cfg.branches.map(function (b) { return b.label; }).concat([cfg.elseLabel]);
        var never = labelsAll.filter(function (l) { return !(l in counts); });
        frames.push({
          narr: cfg.outro + (never.length ? ' Labels that never appeared: <b>' + never.map(function (x) { return H.esc(x); }).join(', ') + '</b>' + (cfg.warnNever ? ' — <span class="c-r">a branch that can never win is a bug in the branch ORDER</span>.' : '.') : ''),
          parts: [{ type: 'table', label: 'GROUP BY ' + cfg.alias + ' → COUNT(*)', columns: [cfg.alias, 'COUNT(*)'], rows: order.map(function (l) { return [l, counts[l]]; }), hl: {} },
            { type: 'code', label: 'The CASE expression', lang: 'sql', code: code, hl: {} }]
        });
        return pad4(frames);
      }
    };
  }

  topics.push({
    title: 'CASE Expressions: if/else Inside a Query',
    analogy: `<p>A post-office sorter looks at each parcel and follows a laminated card: <i>"If it weighs over 5 kg → Heavy bin. Else if over 1 kg → Medium bin. Otherwise → Small bin."</i> She reads the card <b>top to bottom</b> and stops at the <b>first</b> line that fits. That card is a SQL <b>CASE</b> expression: it turns each row's value into a label, one row at a time.</p>`,
    explain: `<p><b>🟢 The plain idea.</b> CASE is SQL's if / else-if / else. It is an <b>expression</b> — it produces one value per row — so it can go anywhere a value can: SELECT, WHERE, ORDER BY, GROUP BY, inside aggregates, in UPDATE … SET.</p>
      <p><b>Two shapes:</b></p>
      ${H.table(['Shape', 'Looks like', 'Use when'], [
        ['<b>Searched</b> CASE', '<code>CASE WHEN amount &gt;= 500 THEN \'large\' WHEN amount &gt;= 100 THEN \'medium\' ELSE \'small\' END</code>', 'any conditions: ranges, IS NULL, AND/OR, several columns'],
        ['<b>Simple</b> CASE', '<code>CASE status WHEN \'delivered\' THEN \'done\' WHEN \'pending\' THEN \'in progress\' ELSE \'closed\' END</code>', 'one column compared for equality with a list of values']
      ])}
      <p><b>🔵 Rules that bite.</b></p>
      <ul>
        <li><b>First TRUE wins.</b> Branches are checked top to bottom and the rest are skipped. With ranges, write the <b>most specific / highest threshold first</b>. If you write <code>WHEN score &gt;= 40 THEN 'D'</code> before <code>WHEN score &gt;= 90 THEN 'A'</code>, a 99 becomes a D.</li>
        <li><b>No ELSE → NULL.</b> If nothing matches and there is no ELSE, CASE returns NULL. That is great inside COUNT/SUM (next topic) but surprising in reports.</li>
        <li><b>NULL never matches a comparison.</b> <code>WHEN score &gt;= 40</code> is UNKNOWN for NULL. And the simple form <code>CASE score WHEN NULL THEN …</code> <span class="c-r">never fires</span> (it tests <code>score = NULL</code>). Use the searched form <code>WHEN score IS NULL</code>, and put it first if it matters.</li>
        <li><b>Keep THEN types consistent.</b> PostgreSQL errors if one branch returns text and another a number. SQLite allows it (dynamic typing) but your app will get mixed types.</li>
        <li><b>Shortcuts:</b> <code>IIF(cond, a, b)</code> in SQLite 3.32+ and SQL Server, <code>IF(cond, a, b)</code> in MySQL. CASE works everywhere — prefer it in interviews.</li>
      </ul>
      ${H.table(['Where', 'Example', 'Purpose'], [
        ['SELECT', '<code>CASE WHEN amount &gt;= 500 THEN \'large\' … END AS size</code>', 'label / bucket rows'],
        ['ORDER BY', '<code>ORDER BY CASE status WHEN \'pending\' THEN 1 … END</code>', 'custom sort order'],
        ['GROUP BY', '<code>GROUP BY CASE … END</code>', 'histogram bands'],
        ['inside SUM/COUNT', '<code>SUM(CASE WHEN status = \'delivered\' THEN amount END)</code>', 'conditional aggregation (next topic)'],
        ['UPDATE', '<code>SET salary = CASE WHEN … END</code>', 'different change per row in one statement']
      ])}`,
    clues: [
      '"categorise / label / bucket / band each row as…" → searched CASE in SELECT.',
      '"show X if …, otherwise Y" → CASE WHEN … THEN X ELSE Y END.',
      '"sort pending first, then returned, then the rest" → CASE inside ORDER BY.',
      '"histogram / how many in each range" → GROUP BY a CASE band.',
      '"treat missing as …" with a label rather than a number → CASE WHEN col IS NULL THEN … (or COALESCE for simple defaults).',
      '"swap values / update in one statement" (e.g. LeetCode Swap Salary m ↔ f) → UPDATE … SET col = CASE … END.'
    ],
    code: [
      { lang: 'sql', db: 'shop', title: 'Searched CASE: size bands', code: `SELECT id, amount,
       CASE
         WHEN amount IS NULL THEN 'unknown'   -- handle NULL explicitly, first
         WHEN amount >= 500  THEN 'large'     -- highest threshold first
         WHEN amount >= 100  THEN 'medium'
         ELSE 'small'
       END AS size
FROM orders
ORDER BY id;` },
      { lang: 'sql', db: 'shop', title: 'Simple CASE + custom ORDER BY', code: `SELECT id, status,
       CASE status                       -- simple form: equality against one column
         WHEN 'delivered' THEN 'done'
         WHEN 'pending'   THEN 'in progress'
         ELSE 'closed'
       END AS stage
FROM orders
ORDER BY CASE status WHEN 'pending' THEN 1   -- needs attention first
                     WHEN 'returned' THEN 2
                     WHEN 'cancelled' THEN 3
                     ELSE 4 END,
         id;` }
    ],
    codeTitle: ['Searched CASE', 'Simple CASE & sort'],
    viz: [
      caseViz({
        title: 'Each row walks down the CASE ladder (first TRUE wins)',
        input: '920, 135, 30, NULL, 1020, 100, 45',
        inputLabel: 'order amounts (numbers or NULL)',
        col: 'amount', alias: 'size', elseLabel: 'small',
        branches: [
          { text: 'amount IS NULL', label: 'unknown', test: function (v) { return v === null; } },
          { text: 'amount >= 500', label: 'large', test: function (v) { return v === null ? null : v >= 500; } },
          { text: 'amount >= 100', label: 'medium', test: function (v) { return v === null ? null : v >= 100; } }
        ],
        intro: 'CASE is evaluated <b>separately for every row</b>. For each amount we test the WHENs from top to bottom and stop at the first TRUE one. Green line = the branch that fired, red lines = tested and failed.',
        outro: 'Every row got exactly one label. Grouping by the label turns CASE into a histogram — the classic "how many small / medium / large orders?" query.'
      }),
      caseViz({
        title: 'Bug hunt: thresholds in the wrong order',
        input: '920, 135, 30, 1020, 100, 600',
        inputLabel: 'order amounts (numbers or NULL)',
        col: 'amount', alias: 'size', elseLabel: 'small', warnNever: true,
        branches: [
          { text: 'amount >= 100', label: 'medium', test: function (v) { return v === null ? null : v >= 100; } },
          { text: 'amount >= 500', label: 'large', test: function (v) { return v === null ? null : v >= 500; } }
        ],
        intro: 'Same idea, but the <b>lower</b> threshold is written first. Watch what happens to the big orders — the query runs without any error, which is exactly why this bug survives code review.',
        outro: 'Every amount ≥ 500 also satisfies amount ≥ 100, so it is caught by the first branch and labelled medium.'
      })
    ],
    examples: [
      {
        title: 'Letter grades with an ABSENT case',
        html: `<p>Highest threshold first, and NULL handled explicitly (here it can sit late because every comparison above it is UNKNOWN for NULL, but putting it first is clearer).</p>${H.table(['name', 'score', 'grade'], [['Anya', '92', 'A'], ['Bilal', '35', 'F'], ['Chloe', '74', 'C'], ['Dev', '58', 'D'], ['Esha', '99', 'A'], ['Finn', '41', 'D'], ['Gita', '<span class="c-m">NULL</span>', '<span class="c-y">ABSENT</span>']])}`,
        code: { lang: 'sql', db: 'school', code: `SELECT s.name, sc.score,
       CASE WHEN sc.score IS NULL THEN 'ABSENT'
            WHEN sc.score >= 90   THEN 'A'
            WHEN sc.score >= 75   THEN 'B'
            WHEN sc.score >= 60   THEN 'C'
            WHEN sc.score >= 40   THEN 'D'
            ELSE 'F'
       END AS grade
FROM scores sc
JOIN students s ON s.id = sc.student_id
WHERE sc.subject = 'Math'
ORDER BY sc.student_id;` }
      },
      {
        title: 'The simple-CASE NULL trap',
        html: `<p><code>CASE score WHEN NULL THEN 'ABSENT' …</code> means <code>score = NULL</code>, which is never TRUE. Gita (NULL) is labelled <b class="c-r">present</b>. Fix: searched form <code>CASE WHEN score IS NULL THEN …</code>.</p>`,
        code: { lang: 'sql', db: 'school', code: `SELECT student_id, score,
       CASE score WHEN NULL THEN 'ABSENT' ELSE 'present' END AS buggy,
       CASE WHEN score IS NULL THEN 'ABSENT' ELSE 'present' END AS fixed
FROM scores
WHERE subject = 'Math';` }
      },
      {
        title: 'CASE in WHERE: a different rule per department',
        html: `<p>"Sales people earning over 55k, everyone else over 100k." CASE returns a boolean-ish value (1/0 in SQLite) per row. An <code>OR</code> of two ANDs is usually clearer and more index-friendly — but CASE shows that it is "just an expression". Result: Asha, Chen, Dana, Fatima.</p>`,
        code: { lang: 'sql', db: 'company', code: `SELECT name, dept, salary
FROM employees
WHERE CASE WHEN dept = 'Sales' THEN salary > 55000
           ELSE salary > 100000 END;
-- Equivalent and usually preferred:
-- WHERE (dept = 'Sales' AND salary > 55000) OR (dept <> 'Sales' AND salary > 100000)` }
      },
      {
        title: 'UPDATE with CASE: swap values in one statement',
        html: `<p>Classic LeetCode "Swap Salary": flip every 'm' to 'f' and vice versa with a single UPDATE — no temp table, no two passes (two separate UPDATEs would turn everything into one letter).</p>`,
        code: { lang: 'sql', code: `CREATE TABLE salary(id INTEGER PRIMARY KEY, name TEXT, sex TEXT);
INSERT INTO salary VALUES (1, 'A', 'm'), (2, 'B', 'f'), (3, 'C', 'm');
UPDATE salary
SET sex = CASE sex WHEN 'm' THEN 'f' ELSE 'm' END;
SELECT * FROM salary;   -- A f, B m, C f` }
      }
    ],
    deepDive: `<p><b>🟣 Evaluation and short-circuit.</b> The SQL standard says CASE evaluates WHEN conditions in order and stops at the first TRUE, so <code>CASE WHEN x = 0 THEN NULL ELSE 10 / x END</code> is the classic divide-by-zero guard. Caveat: optimizers may <i>constant-fold</i> or pre-compute aggregates before CASE runs. PostgreSQL documents that <code>CASE WHEN … THEN 1/0</code> can still fail if the division is on constants, and aggregates inside a branch are computed for all rows anyway. NULLIF is the more robust guard.</p>
      <p><b>Type resolution.</b> The result type is the "common type" of all THEN/ELSE branches. PostgreSQL resolves it at plan time and errors on text vs integer. SQL Server uses data-type precedence (int beats varchar) and fails at runtime on a non-numeric string. SQLite has no column types for expressions — each row can return a different storage class (<code>typeof()</code> reveals it).</p>
      <p><b>Sargability.</b> <code>WHERE CASE … END</code> or <code>GROUP BY CASE …</code> hides the column from index lookups — the engine must evaluate the expression per row. For hot paths, store the band as a generated/computed column (SQLite 3.31+, PostgreSQL 12+, MySQL 5.7+) and index it.</p>
      <p><b>CASE vs lookup table.</b> Hard-coded CASE ladders with many business rules (tax slabs, shipping zones) drift out of date. When the mapping changes often or is shared by several queries, put it in a small table (<code>band_min, band_max, label</code>) and JOIN — data changes don't need deploys. CASE is perfect for small, stable, query-local logic.</p>
      <p><b>Searched vs simple performance.</b> Identical in practice; the simple form is syntactic sugar for <code>WHEN col = value</code>. DECODE (Oracle) and <code>CHOOSE</code> (SQL Server) are dialect cousins.</p>`,
    aiEra: `<p><b>🤖 What AI changes.</b> CASE is boilerplate that AI writes flawlessly <i>syntactically</i>. The bugs it produces are logical: overlapping ranges in the wrong order, gaps (<code>&lt; 100</code> and <code>&gt; 100</code> — what about exactly 100?), missing NULL branches, and simple-CASE <code>WHEN NULL</code>. Because SQL never errors on those, they slip through.</p>
      <p><b>Use AI well:</b> ask it to <i>"enumerate the boundary values for these bands (99, 100, 499, 500, NULL, negative) and show which label each gets"</i>. That turns a CASE into a mini test suite. Also ask whether the mapping should live in a lookup table instead.</p>
      <p><b>What you still own:</b> choosing inclusive/exclusive boundaries that match the business definition, ordering branches correctly, deciding what NULL should mean, and keeping CASE out of index-critical WHERE clauses.</p>`,
    problems: [{
      title: 'Grade Report with Absentees',
      level: 'Easy', tags: ['CASE', 'NULL', 'GROUP BY'], companies: ['Byju\'s', 'Coursera', 'Unacademy'],
      statement: `<p>For the <b>Math</b> exam in <code>scores</code> (DB <b>school</b>), produce a grade distribution: one row per grade with how many students got it. Grades: A ≥ 90, B ≥ 75, C ≥ 60, D ≥ 40, F below 40, and <b>ABSENT</b> when the score is NULL. Order by grade label.</p>`,
      constraints: `<p>Boundaries are inclusive (exactly 90 is an A). Only grades that occur need to appear.</p>`,
      example: `${H.table(['grade', 'students'], [['A', '2'], ['ABSENT', '1'], ['C', '1'], ['D', '2'], ['F', '1']])}<p>Math scores: 92, 35, 74, 58, 99, 41, NULL. Two A's (92, 99), one C (74), two D's (58, 41), one F (35) and Gita's NULL → <span class="c-y">ABSENT</span>. No B this time.</p>`,
      brute: {
        why: `<p>Writing the thresholds lowest-first means every passing score hits <code>&gt;= 40</code> first → <b class="c-r">5 D's</b>, no A/B/C. And without an IS NULL branch the absentee falls to ELSE and is reported as an <b class="c-r">F</b> — unfair and wrong.</p>`,
        code: { lang: 'sql', db: 'school', code: `-- Wrong order + no NULL handling
SELECT CASE WHEN score >= 40 THEN 'D'
            WHEN score >= 60 THEN 'C'
            WHEN score >= 75 THEN 'B'
            WHEN score >= 90 THEN 'A'
            ELSE 'F' END AS grade,
       COUNT(*) AS students
FROM scores
WHERE subject = 'Math'
GROUP BY grade;` }
      },
      mcq: { q: 'A student scored exactly 90. With WHEN score > 90 THEN \'A\' WHEN score >= 75 THEN \'B\', what do they get?', options: ['A', 'B', 'NULL', 'An error'], answer: 1, explain: '90 > 90 is false, so the A branch fails; 90 >= 75 is true → B. Boundary operators (> vs >=) must match the business rule "90 and above is an A".' },
      hints: [
        `<p>Hint 1: Each row needs one label → a searched CASE. Then "how many per label" → GROUP BY that label.</p>`,
        `<p>Hint 2: First TRUE wins, so go from the highest threshold down (90, 75, 60, 40), and catch NULL with <code>WHEN score IS NULL</code> at the top.</p>`,
        `<p>Hint 3: Recipe: WHERE subject = 'Math' → SELECT CASE … END AS grade, COUNT(*) → GROUP BY grade → ORDER BY grade. COUNT(*) (not COUNT(score)) so the ABSENT row is counted.</p>`
      ],
      tests: { engine: 'sqlite', cases: [
        { cols: ['grade', 'students'], rows: [['A', 2], ['ABSENT', 1], ['C', 1], ['D', 2], ['F', 1]] },
        { setup: 'UPDATE scores SET score = 90 WHERE student_id = 1 AND subject = \'Math\'; UPDATE scores SET score = 40 WHERE student_id = 2 AND subject = \'Math\'; UPDATE scores SET score = 75 WHERE student_id = 3 AND subject = \'Math\'; UPDATE scores SET score = 60 WHERE student_id = 4 AND subject = \'Math\'; UPDATE scores SET score = 89 WHERE student_id = 5 AND subject = \'Math\'; UPDATE scores SET score = 39 WHERE student_id = 6 AND subject = \'Math\';', cols: ['grade', 'students'], rows: [['A', 1], ['ABSENT', 1], ['B', 2], ['C', 1], ['D', 1], ['F', 1]] },
        { setup: 'DELETE FROM scores WHERE subject = \'Math\';', rows: [] },
        { setup: 'UPDATE scores SET score = NULL WHERE subject = \'Math\';', cols: ['grade', 'students'], rows: [['ABSENT', 7]] },
        { setup: 'UPDATE scores SET score = 100 WHERE subject = \'Math\';', cols: ['grade', 'students'], rows: [['A', 7]] },
        { setup: 'UPDATE scores SET score = 0 WHERE subject = \'Math\' AND student_id < 4;', cols: ['grade', 'students'], rows: [['A', 1], ['ABSENT', 1], ['D', 2], ['F', 3]] },
        { setup: 'UPDATE scores SET score = 74 WHERE subject = \'Math\' AND student_id IN (1, 2, 3);', cols: ['grade', 'students'], rows: [['A', 1], ['ABSENT', 1], ['C', 3], ['D', 2]] }
      ] },
      solution: {
        approach: `<p>Map each score to a grade with an ordered searched CASE (NULL first, then thresholds descending), then group by the computed label and count rows. COUNT(*) matters: COUNT(score) would report 0 absentees.</p>`,
        code: { lang: 'sql', db: 'school', code: `SELECT CASE WHEN score IS NULL THEN 'ABSENT'
            WHEN score >= 90 THEN 'A'
            WHEN score >= 75 THEN 'B'
            WHEN score >= 60 THEN 'C'
            WHEN score >= 40 THEN 'D'
            ELSE 'F'
       END        AS grade,
       COUNT(*)   AS students       -- COUNT(*) so ABSENT rows are counted
FROM scores
WHERE subject = 'Math'
GROUP BY grade
ORDER BY grade;` },
        complexity: `<p>O(N) scan; the CASE costs a few comparisons per row; grouping memory O(#grades) = 6.</p>`,
        followUps: ['Show all six grades even when the count is 0 (UNION ALL of labels + LEFT JOIN, or conditional aggregation into columns).', 'Produce the distribution for every subject at once (GROUP BY subject, grade).', 'Store the grade bands in a table instead of a CASE ladder.']
      }
    }]
  });

  /* =====================================================================
     TOPIC 6 — Conditional aggregation & pivoting
     ===================================================================== */
  function pivotViz() {
    return {
      title: 'Pivot with SUM(CASE …): every row lands in one row-bucket AND one column',
      input: 'Aarav,Jan,920; Bella,Jan,135; Carlos,Feb,40; Bella,Feb,25; Aarav,Mar,50; Aarav,Apr,55; Bella,Apr,45; Carlos,Apr,NULL',
      inputLabel: 'rows as customer,month,amount separated by ;',
      gen: function (input) {
        var rows = parseRows(input, 3, 'Enter rows like: Aarav,Jan,920; Bella,Feb,NULL (customer,month,amount)', 12);
        rows.forEach(function (r) { if (r[2] !== null && typeof r[2] !== 'number') throw new Error('amount must be a number or NULL'); if (r[0] === null || r[1] === null) throw new Error('customer and month must not be NULL in this demo'); });
        var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        var months = [];
        rows.forEach(function (r) { var m = String(r[1]); if (months.indexOf(m) < 0) months.push(m); });
        if (months.length > 5) throw new Error('Use at most 5 different months so the pivot fits on screen');
        months.sort(function (a, b) { var ia = MON.indexOf(a), ib = MON.indexOf(b); if (ia < 0 || ib < 0) return a < b ? -1 : a > b ? 1 : 0; return ia - ib; });
        var custs = [];
        rows.forEach(function (r) { var c = String(r[0]); if (custs.indexOf(c) < 0) custs.push(c); });
        var code = 'SELECT customer,\n' + months.map(function (m) { return '  SUM(CASE WHEN month = \'' + m + '\' THEN amount ELSE 0 END) AS ' + m.toLowerCase() + ','; }).join('\n') + '\n  SUM(amount) AS total\nFROM sales\nGROUP BY customer;';
        var grid = {}, seenC = [];
        custs.forEach(function (c) { grid[c] = { cells: months.map(function () { return 0; }), total: null }; });
        function gridPart(hl) {
          return { type: 'grid', label: 'Pivot being filled (rows = GROUP BY customer, columns = CASE conditions)', colHead: months.concat(['total']), rowHead: seenC.slice(),
            rows: seenC.map(function (c) { return grid[c].cells.map(show).concat([show(grid[c].total)]); }), hl: hl || {} };
        }
        var frames = [];
        frames.push({ narr: 'Goal: turn <b>rows</b> (one per sale) into <b>columns</b> (one per month). Trick: GROUP BY customer makes one output row per customer, and each month column is a SUM over a CASE that lets through only that month\'s amounts (everything else becomes 0).',
          parts: [{ type: 'table', label: 'sales (long format)', columns: ['customer', 'month', 'amount'], rows: rows.map(function (r) { return r.slice(); }) }, { type: 'code', label: 'Query', lang: 'sql', code: code, hl: {} }] });
        rows.forEach(function (r, i) {
          var c = String(r[0]), m = String(r[1]), col = months.indexOf(m), fresh = seenC.indexOf(c) < 0;
          if (fresh) seenC.push(c);
          var contrib = {}, lineHl = {};
          months.forEach(function (mm, j) {
            var v = mm === m ? r[2] : 0;
            contrib[mm.toLowerCase()] = show(v);
            lineHl[j + 2] = mm === m ? (r[2] === null ? 'cur' : 'ok') : 'done';
            if (mm === m && r[2] !== null) grid[c].cells[j] += r[2];
          });
          if (r[2] !== null) { grid[c].total = (grid[c].total === null ? 0 : grid[c].total) + r[2]; lineHl[months.length + 2] = 'ok'; }
          var th = {}; for (var k = 0; k < i; k++) th[k] = 'done'; th[i] = 'cur';
          var gh = {}; gh[seenC.indexOf(c) + ',' + col] = r[2] === null ? 'bad' : 'ok';
          frames.push({
            narr: 'Row ' + (i + 1) + ': <b>' + H.esc(c) + '</b>, ' + H.esc(m) + ', amount ' + esc(r[2]) + '. ' + (fresh ? 'New customer → new output row. ' : '') +
              'Only the <b>' + H.esc(m) + '</b> CASE lets the amount through; every other month\'s CASE yields 0, so those SUMs don\'t change.' +
              (r[2] === null ? ' <span class="c-r">The amount is NULL</span>, so even the matching CASE yields NULL, which SUM ignores — the cell stays as it was.' : ''),
            parts: [{ type: 'table', label: 'sales', columns: ['customer', 'month', 'amount'], rows: rows.map(function (x) { return x.slice(); }), hl: th },
              { type: 'vars', label: 'What each CASE returns for this row', vals: contrib, hl: (function () { var h = {}; h[m.toLowerCase()] = r[2] === null ? 'bad' : 'ok'; return h; })() },
              gridPart(gh), { type: 'code', label: 'Query', lang: 'sql', code: code, hl: lineHl }]
          });
        });
        var all = {}; seenC.forEach(function (_, i) { months.forEach(function (_, j) { all[i + ',' + j] = 'sel'; }); });
        frames.push({ narr: 'Done: ' + rows.length + ' long rows became ' + seenC.length + ' wide rows with ' + months.length + ' month columns — in a <b>single pass</b> over the table. Zeros mean "no sales that month" because of <code>ELSE 0</code>; drop the ELSE and those cells would be NULL instead.',
          parts: [gridPart(all), { type: 'code', label: 'Query', lang: 'sql', code: code, hl: {} }] });
        return pad4(frames);
      }
    };
  }

  topics.push({
    title: 'Conditional Aggregation & Pivoting (SUM/COUNT + CASE)',
    analogy: `<p>A teacher has one stack of answer sheets and wants three tallies: how many passed, how many failed, how many were absent. She doesn't make three separate trips through the stack. She goes through it <b>once</b> with three tally columns on her notepad and, for each sheet, puts a mark in just the column that applies. <b>CASE inside an aggregate</b> is that notepad: one pass, many counters, each counter only "sees" the rows its condition lets through.</p>`,
    explain: `<p><b>🟢 The plain idea.</b> Put a CASE <i>inside</i> SUM, COUNT, AVG, MIN or MAX. For each row the CASE decides what the aggregate gets: the real value (condition true) or 0/NULL (condition false). You get many differently-filtered totals <b>in one query, one scan</b>.</p>
      ${H.table(['Goal', 'Pattern', 'Why it works'], [
        ['count rows matching X', '<code>SUM(CASE WHEN X THEN 1 ELSE 0 END)</code>', 'adds 1 per match'],
        ['same, other style', '<code>COUNT(CASE WHEN X THEN 1 END)</code>', 'no ELSE → NULL for non-matches, COUNT skips NULL'],
        ['total of matching rows', '<code>SUM(CASE WHEN X THEN amount ELSE 0 END)</code>', 'non-matches add 0'],
        ['share of rows matching X', '<code>AVG(CASE WHEN X THEN 1.0 ELSE 0 END)</code>', 'mean of 1s and 0s = fraction'],
        ['pick one value into a column', '<code>MAX(CASE WHEN subject = \'Math\' THEN score END)</code>', 'only one non-NULL per group; MAX picks it'],
        ['standard SQL shortcut', '<code>COUNT(*) FILTER (WHERE X)</code>', 'PostgreSQL 9.4+, SQLite 3.30+ (not MySQL/SQL Server)']
      ])}
      <p><b>🔵 Pivoting</b> means turning row values into columns. "One row per (customer, month)" → "one row per customer with a column per month". Recipe: <b>GROUP BY the row label</b>, then <b>one conditional aggregate per column</b>.</p>
      ${H.table(['customer_id', 'jan', 'feb', 'mar', 'apr', 'total'], [['1', '920', '0', '50', '55', '1025'], ['2', '135', '25', '0', '45', '205'], ['3', '0', '40', '0', '0', '40']])}
      <p><b>The traps.</b></p>
      <ul>
        <li><span class="c-r"><code>COUNT(CASE WHEN X THEN 1 ELSE 0 END)</code> counts everything</span> — 0 is not NULL! Use SUM with ELSE 0, or COUNT with no ELSE.</li>
        <li><code>SUM(CASE WHEN X THEN amount END)</code> returns <b>NULL</b> (not 0) for a group with no matches. Add <code>ELSE 0</code> or wrap in COALESCE.</li>
        <li>For a pivot of single facts (scores), <b>don't</b> use <code>ELSE 0</code> — a missing exam would look like a zero score. Leave it NULL and use MAX/MIN.</li>
        <li>Ratios: <code>SUM(…)/COUNT(*)</code> on integers is integer division in SQLite/PostgreSQL → multiply by <code>1.0</code> or use AVG of 1.0/0.</li>
        <li>The columns of a pivot are fixed when you write the query. A truly dynamic pivot (unknown months) needs dynamic SQL or a client-side reshape; PostgreSQL's <code>crosstab()</code>, SQL Server/Snowflake/BigQuery <code>PIVOT</code> are dialect helpers.</li>
      </ul>`,
    clues: [
      '"…and how many of them were approved / cancelled / late" in the <b>same row</b> → SUM(CASE …) or COUNT(*) FILTER.',
      '"one column per month / status / subject" → pivot = GROUP BY + one conditional aggregate per column.',
      '"percentage / rate / share of X" → <code>100.0 * SUM(CASE WHEN X THEN 1 ELSE 0 END) / COUNT(*)</code> or AVG of 1.0/0.',
      '"customers who did A in January <b>and</b> B in February" → conditional aggregates in HAVING.',
      'LeetCode "Reformat Department Table", "Monthly Transactions", "Queries Quality", "Trips and Users" → all conditional aggregation.',
      'Wanting to avoid several separate COUNT queries or a UNION of per-status queries → single-pass conditional aggregation.'
    ],
    code: [
      { lang: 'sql', db: 'shop', title: 'Many KPIs in one pass', code: `SELECT COUNT(*)                                                 AS orders,
       SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END)    AS delivered,
       COUNT(CASE WHEN status = 'cancelled' THEN 1 END)         AS cancelled,   -- no ELSE!
       SUM(CASE WHEN status = 'delivered' THEN amount ELSE 0 END) AS delivered_revenue,
       ROUND(100.0 * SUM(CASE WHEN coupon IS NOT NULL THEN 1 ELSE 0 END) / COUNT(*), 1)
                                                                AS coupon_pct,
       COUNT(*) FILTER (WHERE status = 'returned')              AS returned     -- SQLite 3.30+/Postgres
FROM orders;` },
      { lang: 'sql', db: 'shop', title: 'Pivot: revenue per customer per month', code: `SELECT customer_id,
       SUM(CASE WHEN order_date LIKE '2024-01%' THEN amount ELSE 0 END) AS jan,
       SUM(CASE WHEN order_date LIKE '2024-02%' THEN amount ELSE 0 END) AS feb,
       SUM(CASE WHEN order_date LIKE '2024-03%' THEN amount ELSE 0 END) AS mar,
       SUM(CASE WHEN order_date LIKE '2024-04%' THEN amount ELSE 0 END) AS apr,
       SUM(amount)                                                       AS total
FROM orders
WHERE status = 'delivered'
GROUP BY customer_id
ORDER BY customer_id;` },
      { lang: 'sql', db: 'school', title: 'Pivot single facts with MAX(CASE) — keep NULLs', code: `SELECT student_id,
       MAX(CASE WHEN subject = 'Math'    THEN score END) AS math,     -- NULL if absent/missing
       MAX(CASE WHEN subject = 'Science' THEN score END) AS science,
       MAX(CASE WHEN subject = 'English' THEN score END) AS english
FROM scores
GROUP BY student_id
ORDER BY student_id;` }
    ],
    codeTitle: ['One-pass KPIs', 'Pivot sums', 'Pivot facts'],
    viz: pivotViz(),
    examples: [
      {
        title: 'The COUNT(… ELSE 0) bug',
        html: `<p>Count cancelled orders. <code>COUNT(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END)</code> returns <b class="c-r">14</b> (every row produced a non-NULL 0 or 1). The two correct forms return <b class="c-g">2</b>.</p>`,
        code: { lang: 'sql', db: 'shop', code: `SELECT COUNT(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS wrong,     -- 14
       COUNT(CASE WHEN status = 'cancelled' THEN 1 END)        AS right_count, -- 2
       SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END)   AS right_sum    -- 2
FROM orders;` }
      },
      {
        title: 'Pass / fail / absent per class (with GROUP BY)',
        html: `<p>Conditional aggregates combine naturally with GROUP BY — each class gets its own three tallies. Note that <code>score &lt; 40</code> is UNKNOWN for NULL, so absentees are not counted as failures; they need their own IS NULL bucket.</p>${H.table(['class', 'exams', 'passed', 'failed', 'absent'], [['10A', '12', '10', '1', '1'], ['10B', '8', '5', '1', '2']])}`,
        code: { lang: 'sql', db: 'school', code: `SELECT st.class,
       COUNT(*)                                            AS exams,
       SUM(CASE WHEN sc.score >= 40 THEN 1 ELSE 0 END)     AS passed,
       SUM(CASE WHEN sc.score < 40  THEN 1 ELSE 0 END)     AS failed,
       SUM(CASE WHEN sc.score IS NULL THEN 1 ELSE 0 END)   AS absent
FROM scores sc
JOIN students st ON st.id = sc.student_id
GROUP BY st.class;` }
      },
      {
        title: 'Cross-tab: departments × cities',
        html: `<p>Headcount per department with one column per city — a two-dimensional summary in one query. Each row of employees adds 1 to exactly one city column of its department's row.</p>${H.table(['dept', 'total', 'pune', 'delhi', 'mumbai', 'blr'], [['<span class="c-m">NULL</span>', '1', '0', '0', '0', '1'], ['Engineering', '4', '2', '0', '0', '2'], ['HR', '2', '1', '1', '0', '0'], ['Marketing', '1', '0', '0', '1', '0'], ['Sales', '4', '0', '2', '2', '0']])}`,
        code: { lang: 'sql', db: 'company', code: `SELECT dept,
       COUNT(*)                                          AS total,
       SUM(CASE WHEN city = 'Pune'      THEN 1 ELSE 0 END) AS pune,
       SUM(CASE WHEN city = 'Delhi'     THEN 1 ELSE 0 END) AS delhi,
       SUM(CASE WHEN city = 'Mumbai'    THEN 1 ELSE 0 END) AS mumbai,
       SUM(CASE WHEN city = 'Bengaluru' THEN 1 ELSE 0 END) AS blr
FROM employees
GROUP BY dept;` }
      },
      {
        title: 'Unpivot: columns back to rows with UNION ALL',
        html: `<p>The reverse of a pivot. Given a wide table (one column per quarter), stack one SELECT per column. SQL Server/Snowflake/BigQuery have <code>UNPIVOT</code>; PostgreSQL can use <code>CROSS JOIN LATERAL (VALUES …)</code>; UNION ALL works everywhere.</p>`,
        code: { lang: 'sql', code: `WITH wide(product, q1, q2) AS (VALUES ('pen', 10, 12), ('ink', 7, NULL))
SELECT product, 'q1' AS quarter, q1 AS units FROM wide
UNION ALL
SELECT product, 'q2', q2 FROM wide WHERE q2 IS NOT NULL   -- drop missing cells
ORDER BY product, quarter;` }
      }
    ],
    deepDive: `<p><b>🟣 Why single-pass matters.</b> Five separate <code>SELECT COUNT(*) … WHERE status = …</code> queries scan the table five times (or hit an index five times). Conditional aggregation scans once and updates five accumulators per row. On a 1-billion-row fact table in BigQuery or Snowflake, where you pay per byte scanned, that is a 5× cost difference.</p>
      <p><b>FILTER vs CASE.</b> <code>agg(x) FILTER (WHERE cond)</code> is SQL:2003 standard, clearer, and lets the engine skip evaluating the argument for filtered rows. PostgreSQL and SQLite (3.30+) support it; MySQL, SQL Server and Oracle do not — CASE is the portable spelling. <code>COUNT(DISTINCT CASE WHEN cond THEN user_id END)</code> gives "distinct users who did X" in the same pass — a staple of funnel queries.</p>
      <p><b>Boolean arithmetic.</b> In SQLite and MySQL a comparison is 0/1, so <code>SUM(status = 'cancelled')</code> and <code>AVG(rating &lt; 3)</code> work. PostgreSQL has a real boolean type: use <code>SUM((cond)::int)</code>, <code>COUNT(*) FILTER</code>, or <code>bool_and/bool_or</code>. Be careful: <code>SUM(cond)</code> where cond is NULL adds nothing — that's usually what you want.</p>
      <p><b>Pivot correctness.</b> A pivot with <code>MAX(CASE …)</code> silently hides duplicates: if a student had two Math rows, MAX shows one. Add <code>COUNT(CASE WHEN subject='Math' THEN 1 END)</code> as a check, or enforce a UNIQUE(student_id, subject) constraint. Dynamic pivots (columns from data) cannot be expressed in static SQL; generate the SQL in code, or return long format and pivot in the BI tool/pandas (<code>pivot_table</code>).</p>
      <p><b>Ratios done right.</b> Rate = numerator ÷ denominator computed at the <i>same grain</i>. A "cancellation rate per day" must count cancellations and trips over the same filtered rows (e.g. excluding banned users in both) — conditional aggregation guarantees that because both come from the same scan.</p>`,
    aiEra: `<p><b>🤖 What AI changes.</b> Ask an assistant for "monthly revenue by customer as columns" and you'll get a correct SUM(CASE) pivot in seconds, or a <code>PIVOT</code> clause if it guesses a different dialect. The judgement left to you: the right dialect, <code>ELSE 0</code> vs NULL, integer division in rates, and whether the numerator and denominator use the same filter.</p>
      <p><b>Use AI well:</b> for wide pivots (12 months × 5 metrics) let AI generate the repetitive columns, then review one column carefully and diff the rest. Ask it to also produce the long-format query and a check that <code>SUM</code> of all pivot columns equals the total column.</p>
      <p><b>Where AI goes wrong:</b> the COUNT-with-ELSE-0 bug, using <code>FILTER</code> on MySQL, and "rate" computed as <code>AVG(rate_per_row)</code> instead of total ÷ total. These are exactly what interviewers probe in follow-ups, so own the reasoning.</p>`,
    problems: [{
      title: 'Report Card Pivot',
      level: 'Medium', tags: ['pivot', 'conditional aggregation', 'NULL'], companies: ['Google', 'Microsoft', 'Byju\'s'],
      statement: `<p>From <code>scores</code> (DB <b>school</b>, long format: one row per student per subject), produce one row per <code>student_id</code> with columns <code>math</code>, <code>science</code>, <code>english</code> (NULL if absent or no exam row), and <code>passed</code> = number of subjects with score ≥ 40. Order by student_id.</p>`,
      constraints: `<p>At most one row per (student, subject). A NULL score means absent. Some students have no row at all for a subject.</p>`,
      example: `${H.table(['student_id', 'math', 'science', 'english', 'passed'], [['1', '92', '85', '78', '3'], ['2', '35', '48', '66', '2'], ['3', '74', '<span class="c-y">NULL</span>', '88', '2'], ['4', '58', '39', '<span class="c-y">NULL</span>', '1'], ['5', '99', '91', '95', '3'], ['6', '41', '<span class="c-y">NULL</span>', '52', '2'], ['7', '<span class="c-y">NULL</span>', '67', '71', '2']])}<p>Student 3 was absent for Science (NULL score); student 6 has no Science row at all — both show NULL, not 0.</p>`,
      brute: {
        why: `<p>Using <code>SUM(CASE … ELSE 0 END)</code> for the subject columns turns "absent" and "no exam" into a <b class="c-r">0</b> score — students 3, 4, 6, 7 look like they scored zero. And <code>COUNT(CASE WHEN score &gt;= 40 THEN 1 ELSE 0 END)</code> counts every exam row, so <code>passed</code> is wrong too.</p>`,
        code: { lang: 'sql', db: 'school', code: `-- Wrong: ELSE 0 invents zero scores, COUNT(... ELSE 0) counts all rows
SELECT student_id,
       SUM(CASE WHEN subject = 'Math'    THEN score ELSE 0 END) AS math,
       SUM(CASE WHEN subject = 'Science' THEN score ELSE 0 END) AS science,
       SUM(CASE WHEN subject = 'English' THEN score ELSE 0 END) AS english,
       COUNT(CASE WHEN score >= 40 THEN 1 ELSE 0 END)           AS passed
FROM scores
GROUP BY student_id;` }
      },
      mcq: { q: 'Why use MAX(CASE WHEN subject = \'Math\' THEN score END) rather than SUM(CASE … ELSE 0 END) here?', options: ['MAX is faster', 'Without ELSE, non-matching rows give NULL, so a missing exam stays NULL instead of becoming 0', 'SUM cannot be used with CASE', 'MAX removes duplicates automatically, which is required'], answer: 1, explain: 'Each group has at most one Math row; MAX just picks it. If there is none (or it is NULL), every CASE result is NULL and MAX returns NULL — honest "no score". ELSE 0 would fabricate a zero.' },
      hints: [
        `<p>Hint 1: Rows → columns = pivot. One output row per student → GROUP BY student_id.</p>`,
        `<p>Hint 2: Each subject column is an aggregate over a CASE that only lets that subject's score through. Leave out ELSE so missing values stay NULL; MAX (or MIN) picks the single value.</p>`,
        `<p>Hint 3: passed = <code>COUNT(CASE WHEN score &gt;= 40 THEN 1 END)</code> (no ELSE) or <code>SUM(CASE … THEN 1 ELSE 0 END)</code>. NULL scores fail the comparison → not counted. ORDER BY student_id.</p>`
      ],
      tests: { engine: 'sqlite', cases: [
        { cols: ['student_id', 'math', 'science', 'english', 'passed'], rows: [[1, 92, 85, 78, 3], [2, 35, 48, 66, 2], [3, 74, null, 88, 2], [4, 58, 39, null, 1], [5, 99, 91, 95, 3], [6, 41, null, 52, 2], [7, null, 67, 71, 2]] },
        { setup: 'DELETE FROM scores WHERE student_id = 3;', cols: ['student_id', 'math', 'science', 'english', 'passed'], rows: [[1, 92, 85, 78, 3], [2, 35, 48, 66, 2], [4, 58, 39, null, 1], [5, 99, 91, 95, 3], [6, 41, null, 52, 2], [7, null, 67, 71, 2]] },
        { setup: 'DELETE FROM scores;', rows: [] },
        { setup: 'UPDATE scores SET score = NULL;', cols: ['student_id', 'math', 'science', 'english', 'passed'], rows: [[1, null, null, null, 0], [2, null, null, null, 0], [3, null, null, null, 0], [4, null, null, null, 0], [5, null, null, null, 0], [6, null, null, null, 0], [7, null, null, null, 0]] },
        { setup: 'UPDATE scores SET score = 40 WHERE student_id = 2 AND subject = \'Math\'; UPDATE scores SET score = 39 WHERE student_id = 2 AND subject = \'Science\';', cols: ['student_id', 'math', 'science', 'english', 'passed'], rows: [[1, 92, 85, 78, 3], [2, 40, 39, 66, 2], [3, 74, null, 88, 2], [4, 58, 39, null, 1], [5, 99, 91, 95, 3], [6, 41, null, 52, 2], [7, null, 67, 71, 2]] },
        { setup: 'INSERT INTO scores VALUES (8, \'English\', 77), (0, \'Science\', 12);', cols: ['student_id', 'math', 'science', 'english', 'passed'], rows: [[0, null, 12, null, 0], [1, 92, 85, 78, 3], [2, 35, 48, 66, 2], [3, 74, null, 88, 2], [4, 58, 39, null, 1], [5, 99, 91, 95, 3], [6, 41, null, 52, 2], [7, null, 67, 71, 2], [8, null, null, 77, 1]] }
      ] },
      solution: {
        approach: `<p>Group by student; for each subject, <code>MAX(CASE WHEN subject = … THEN score END)</code> extracts that subject's score or NULL. Count passes with a COUNT over a CASE that has no ELSE.</p>`,
        code: { lang: 'sql', db: 'school', code: `SELECT student_id,
       MAX(CASE WHEN subject = 'Math'    THEN score END) AS math,
       MAX(CASE WHEN subject = 'Science' THEN score END) AS science,
       MAX(CASE WHEN subject = 'English' THEN score END) AS english,
       COUNT(CASE WHEN score >= 40 THEN 1 END)           AS passed   -- NULL scores never count
FROM scores
GROUP BY student_id
ORDER BY student_id;` },
        alt: [{ lang: 'sql', db: 'school', title: 'Same with FILTER (PostgreSQL / SQLite 3.30+)', code: `SELECT student_id,
       MAX(score) FILTER (WHERE subject = 'Math')    AS math,
       MAX(score) FILTER (WHERE subject = 'Science') AS science,
       MAX(score) FILTER (WHERE subject = 'English') AS english,
       COUNT(*)   FILTER (WHERE score >= 40)         AS passed
FROM scores
GROUP BY student_id
ORDER BY student_id;` }],
        complexity: `<p>One scan, O(N); per group 4 accumulators. Adding a subject = adding one column expression (static pivot).</p>`,
        followUps: ['Add each student\'s name (JOIN students).', 'Add an average that ignores absences vs one that treats absence as 0.', 'Detect duplicate (student, subject) rows that MAX would hide.']
      }
    }]
  });

  /* =====================================================================
     TOPIC 7 — COALESCE and NULLIF
     ===================================================================== */
  topics.push({
    title: 'COALESCE & NULLIF: Taming NULLs in Reports and Ratios',
    analogy: `<p><b>COALESCE</b> is calling a friend: try their mobile; no answer → try their office; no answer → leave a message with their mum. You stop at the <b>first one that picks up</b>. <b>NULLIF</b> is the opposite: a bouncer who turns a specific guest into "nobody" — "if the value is 0, pretend it's NULL". Together they let you plug holes (COALESCE) and create safe holes on purpose (NULLIF), like turning a dangerous "divide by 0" into a harmless "divide by unknown".</p>`,
    explain: `<p><b>🟢 The plain idea.</b></p>
      ${H.table(['Function', 'Returns', 'Example', 'Result'], [
        ['<code>COALESCE(a, b, c, …)</code>', 'the first argument that is not NULL (NULL if all are)', '<code>COALESCE(NULL, \'bella@mail.com\', \'no contact\')</code>', '\'bella@mail.com\''],
        ['<code>NULLIF(a, b)</code>', 'NULL if a = b, otherwise a', '<code>NULLIF(0, 0)</code> / <code>NULLIF(250, 0)</code>', 'NULL / 250'],
        ['<code>IFNULL(a, b)</code>', '2-argument COALESCE (SQLite, MySQL)', '<code>IFNULL(bonus, 0)</code>', '0 when bonus is NULL'],
        ['<code>ISNULL(a,b)</code> / <code>NVL(a,b)</code>', 'SQL Server / Oracle spellings', '—', 'prefer COALESCE: standard and n-ary']
      ])}
      <p><b>🔵 The four jobs you'll use them for.</b></p>
      <ol>
        <li><b>Display defaults:</b> <code>COALESCE(dept, 'Unassigned')</code>, <code>COALESCE(phone, email, 'no contact')</code> (first available contact).</li>
        <li><b>Zero instead of NULL after aggregation:</b> <code>COALESCE(SUM(amount), 0)</code> — SUM over nothing (or over only NULLs) is NULL.</li>
        <li><b>Divide-by-zero guard:</b> <code>signups * 100.0 / NULLIF(clicks, 0)</code>. When clicks = 0 the divisor becomes NULL and the result is NULL instead of an error. PostgreSQL and SQL Server <span class="c-r">raise an error</span> on <code>x / 0</code>; SQLite and MySQL quietly return NULL — so the guard is about portability <i>and</i> clarity.</li>
        <li><b>Cleaning sentinel values:</b> <code>NULLIF(TRIM(phone), '')</code> turns blank strings into real NULLs so COUNT(phone) and COALESCE behave.</li>
      </ol>
      <p><b>Big warning — COALESCE inside an aggregate changes the meaning.</b> <code>AVG(bonus)</code> = 43000 ÷ 6 = 7166.67 (average of people who <i>have</i> a bonus). <code>AVG(COALESCE(bonus, 0))</code> = 43000 ÷ 12 = 3583.33 (average over everyone, missing = 0). Neither is "right" — they answer different questions. Ask which one the business means.</p>
      <p><b>Inside vs outside:</b> <code>COALESCE(SUM(x), 0)</code> fixes an empty result; <code>SUM(COALESCE(x, 0))</code> is the same as <code>SUM(x)</code> except when <i>all</i> values are NULL. For AVG and COUNT(col), inside vs outside give genuinely different numbers.</p>`,
    clues: [
      '"show 0 instead of NULL / blank" → <code>COALESCE(agg, 0)</code>.',
      '"if X is missing use Y, else Z" with several fallbacks → <code>COALESCE(x, y, z)</code>.',
      '"rate / ratio / per-unit cost" where the denominator can be 0 → <code>NULLIF(denominator, 0)</code>.',
      '"treat empty strings as missing" → <code>NULLIF(TRIM(col), \'\')</code>.',
      '"label unassigned / unknown group" → <code>GROUP BY COALESCE(col, \'Unknown\')</code>.',
      '"average including people with no bonus as 0" → <code>AVG(COALESCE(bonus, 0))</code>; "average bonus of those who got one" → <code>AVG(bonus)</code>.'
    ],
    code: [
      { lang: 'sql', db: 'company', title: 'Defaults and the AVG inside/outside difference', code: `SELECT COALESCE(dept, 'Unassigned')      AS team,
       COUNT(*)                          AS people,
       COALESCE(SUM(bonus), 0)           AS bonus_pool,          -- Marketing has only NULL bonuses → 0, not NULL
       ROUND(AVG(bonus), 0)              AS avg_bonus_receivers, -- NULLs skipped
       ROUND(AVG(COALESCE(bonus, 0)), 0) AS avg_bonus_everyone   -- NULL counted as 0
FROM employees
GROUP BY COALESCE(dept, 'Unassigned')
ORDER BY team;` },
      { lang: 'sql', db: 'app', title: 'NULLIF as a divide-by-zero guard', code: `SELECT name, clicks, signups,
       100.0 * signups / NULLIF(clicks, 0)                         AS conv_pct,      -- NULL when 0 clicks
       COALESCE(ROUND(100.0 * signups / NULLIF(clicks, 0), 1), 0)  AS conv_or_zero,  -- if a 0 is wanted
       ROUND(1.0 * spend / NULLIF(signups, 0), 2)                  AS cost_per_signup
FROM campaigns
ORDER BY id;` },
      { lang: 'sql', db: 'shop', title: 'First available contact', code: `SELECT name,
       COALESCE(phone, email, 'no contact') AS best_contact,   -- stops at first non-NULL
       CASE WHEN phone IS NOT NULL THEN 'phone'
            WHEN email IS NOT NULL THEN 'email'
            ELSE 'none' END                AS channel
FROM customers;` }
    ],
    codeTitle: ['Defaults & AVG', 'NULLIF guard', 'Fallback chain'],
    viz: [
      {
        title: 'COALESCE tries each argument left to right',
        input: 'Aarav,+91-98450,aarav@mail.com; Bella,NULL,bella@mail.com; Carlos,+55-11987,NULL; Deepa,NULL,NULL',
        inputLabel: 'rows as name,phone,email separated by ;',
        gen: function (input) {
          var rows = parseRows(input, 3, 'Enter rows like: Bella,NULL,bella@mail.com (name,phone,email)', 10);
          var frames = [], out = [];
          var code = 'SELECT name,\n       COALESCE(phone, email, \'no contact\') AS best_contact\nFROM customers;';
          frames.push({ narr: 'COALESCE looks at its arguments <b>in order</b> and returns the first one that is not NULL. The last argument is a constant, so the result can never be NULL — a safe default.',
            parts: [{ type: 'table', label: 'customers', columns: ['name', 'phone', 'email'], rows: rows.map(function (r) { return r.slice(); }) }, { type: 'code', lang: 'sql', code: code, hl: { 2: 'cur' } }] });
          rows.forEach(function (r, i) {
            var args = [r[1], r[2], 'no contact'], names = ['phone', 'email', "'no contact'"], hl = {}, pick = -1, steps = [];
            for (var k = 0; k < 3; k++) {
              if (args[k] === null) { hl[k] = 'bad'; steps.push(names[k] + ' is NULL → skip'); }
              else { hl[k] = 'ok'; pick = k; steps.push(names[k] + ' = ' + esc(args[k]) + ' → <b>take it</b>'); break; }
            }
            for (var j = pick + 1; j < 3; j++) hl[j] = 'done';
            out.push([r[0], show(args[pick])]);
            var th = {}; th[i] = 'cur';
            frames.push({
              narr: '<b>' + esc(r[0]) + '</b>: ' + steps.join('; ') + '.' + (pick < 2 && pick + 1 < 3 ? ' Later arguments are not even evaluated.' : '') + (pick === 2 ? ' Both real columns were NULL, so the default wins.' : ''),
              parts: [{ type: 'table', label: 'customers', columns: ['name', 'phone', 'email'], rows: rows.map(function (x) { return x.slice(); }), hl: th },
                { type: 'array', label: 'COALESCE arguments for this row', values: args.map(show), hl: hl, idxLabels: names },
                { type: 'table', label: 'Result so far', columns: ['name', 'best_contact'], rows: out.map(function (x) { return x.slice(); }), hl: (function () { var h = {}; h[out.length - 1] = 'sel'; return h; })() }]
            });
          });
          frames.push({ narr: 'Every row now has a contact. Compare: <code>COUNT(phone)</code> = ' + rows.filter(function (r) { return r[1] !== null; }).length + ', <code>COUNT(COALESCE(phone, email))</code> = ' + rows.filter(function (r) { return r[1] !== null || r[2] !== null; }).length + ' (reachable by phone <i>or</i> email).',
            parts: [{ type: 'table', label: 'Final result', columns: ['name', 'best_contact'], rows: out, hl: {} }] });
          return pad4(frames);
        }
      },
      {
        title: 'NULLIF turns a crash (÷0) into a NULL, COALESCE turns NULL into 0',
        input: 'Brand,400,40; Reels,0,0; Influencer,250,NULL; Newsletter,120,18; Cricket,0,NULL',
        inputLabel: 'rows as campaign,clicks,signups separated by ;',
        gen: function (input) {
          var rows = parseRows(input, 3, 'Enter rows like: Reels,0,0; Brand,400,NULL (campaign,clicks,signups)', 10);
          rows.forEach(function (r) { if (typeof r[1] !== 'number' || (r[2] !== null && typeof r[2] !== 'number')) throw new Error('clicks must be a number, signups a number or NULL'); });
          var frames = [], out = [];
          var code = 'SELECT campaign,\n  100.0 * signups / clicks                      AS naive,\n  100.0 * signups / NULLIF(clicks, 0)           AS guarded,\n  COALESCE(100.0 * signups / NULLIF(clicks, 0), 0) AS shown\nFROM campaigns;';
          frames.push({ narr: 'Conversion % = signups ÷ clicks × 100. Two dangers: <b>clicks = 0</b> (division by zero) and <b>signups = NULL</b> (unknown). Let\'s push each row through three versions of the formula.',
            parts: [{ type: 'table', label: 'campaigns', columns: ['campaign', 'clicks', 'signups'], rows: rows.map(function (r) { return r.slice(); }) }, { type: 'code', lang: 'sql', code: code, hl: {} }] });
          rows.forEach(function (r, i) {
            var clicks = r[1], s = r[2];
            var naive = clicks === 0 ? 'ERROR (Postgres) / NULL (SQLite)' : (s === null ? null : Math.round(10000 * s / clicks) / 100);
            var div = clicks === 0 ? null : clicks;
            var guarded = (div === null || s === null) ? null : Math.round(10000 * s / div) / 100;
            var shown = guarded === null ? 0 : guarded;
            out.push([r[0], show(naive), show(guarded), show(shown)]);
            var why;
            if (clicks === 0) why = 'clicks = 0. Naive: <span class="c-r">division by zero</span> — PostgreSQL / SQL Server abort the <i>whole query</i>; SQLite / MySQL silently return NULL. Guarded: NULLIF(0, 0) = NULL, and anything ÷ NULL = NULL — no crash. COALESCE then shows 0 for the dashboard.';
            else if (s === null) why = 'signups is NULL (tracking broke). NULL × 100 ÷ ' + clicks + ' = NULL in every version — NULL spreads through arithmetic. Only COALESCE turns it into 0. Ask: is "unknown" really 0? Often you should show NULL/"n/a" instead.';
            else why = 'Normal row: NULLIF(' + clicks + ', 0) = ' + clicks + ' (unchanged), so all three agree: ' + show(guarded) + '%.';
            var th = {}; th[i] = 'cur';
            frames.push({ narr: '<b>' + esc(r[0]) + '</b>: ' + why,
              parts: [{ type: 'table', label: 'campaigns', columns: ['campaign', 'clicks', 'signups'], rows: rows.map(function (x) { return x.slice(); }), hl: th },
                { type: 'vars', label: 'Step by step', vals: { 'NULLIF(clicks,0)': show(div), naive: show(naive), guarded: show(guarded), shown: show(shown) }, hl: { 'NULLIF(clicks,0)': clicks === 0 ? 'bad' : 'ok', naive: clicks === 0 ? 'bad' : '', guarded: guarded === null ? 'cur' : 'ok', shown: 'sel' } },
                { type: 'code', lang: 'sql', code: code, hl: { 2: clicks === 0 ? 'bad' : 'ok', 3: 'ok', 4: 'sel' } }]
            });
          });
          frames.push({ narr: 'Summary: <b>NULLIF</b> makes the dangerous denominator safe, <b>COALESCE</b> chooses what to display for "no answer". Use both deliberately — never COALESCE a real unknown into 0 without asking whether 0 is honest.',
            parts: [{ type: 'table', label: 'All three versions', columns: ['campaign', 'naive', 'guarded', 'shown'], rows: out, hl: {} }] });
          return pad4(frames);
        }
      }
    ],
    examples: [
      {
        title: 'Name the NULL group',
        html: `<p>GROUP BY puts Jia (no department) into a NULL group. Wrapping the key in COALESCE gives it a readable name — the grouping is identical, only the label changes.</p>${H.table(['team', 'people'], [['Engineering', '4'], ['HR', '2'], ['Marketing', '1'], ['Sales', '4'], ['<span class="c-y">Unassigned</span>', '1']])}`,
        code: { lang: 'sql', db: 'company', code: `SELECT COALESCE(dept, 'Unassigned') AS team, COUNT(*) AS people
FROM employees
GROUP BY team
ORDER BY team;` }
      },
      {
        title: 'AVG with and without COALESCE inside',
        html: `<p>Bonus: 6 people have one (total 43,000), 6 don't. <code>AVG(bonus)</code> = <b>7166.67</b> ("average bonus <i>of receivers</i>"). <code>AVG(COALESCE(bonus, 0))</code> = <b>3583.33</b> ("average bonus <i>per employee</i>"). A dashboard that silently switches between them causes arguments in meetings.</p>`,
        code: { lang: 'sql', db: 'company', code: `SELECT ROUND(AVG(bonus), 2)              AS avg_of_receivers,  -- 7166.67
       ROUND(AVG(COALESCE(bonus, 0)), 2) AS avg_per_employee,  -- 3583.33
       COUNT(bonus)                      AS receivers,         -- 6
       COUNT(*)                          AS employees          -- 12
FROM employees;` }
      },
      {
        title: 'NULLIF to clean blanks before counting',
        html: `<p>Forms often save <code>''</code> or <code>'  '</code> instead of NULL. COUNT(phone) counts those as present. <code>NULLIF(TRIM(phone), '')</code> converts blanks into NULL so COUNT and COALESCE work correctly.</p>`,
        code: { lang: 'sql', code: `WITH contacts(name, phone) AS (VALUES ('a', '98450'), ('b', ''), ('c', '   '), ('d', NULL))
SELECT COUNT(phone)                    AS naive_count,   -- 3 (blanks counted)
       COUNT(NULLIF(TRIM(phone), ''))  AS real_count     -- 1
FROM contacts;` }
      },
      {
        title: 'Safe "share of total"',
        html: `<p>Each status's share of all orders, guarded in case the table is empty: the denominator is a scalar subquery wrapped in NULLIF. With data, delivered = 10 of 14 = <b>71.4%</b>.</p>`,
        code: { lang: 'sql', db: 'shop', code: `SELECT status,
       COUNT(*) AS orders,
       ROUND(100.0 * COUNT(*) / NULLIF((SELECT COUNT(*) FROM orders), 0), 1) AS pct
FROM orders
GROUP BY status
ORDER BY orders DESC;` }
      }
    ],
    deepDive: `<p><b>🟣 Definitions.</b> In the SQL standard, <code>COALESCE(a, b)</code> is shorthand for <code>CASE WHEN a IS NOT NULL THEN a ELSE b END</code>, and <code>NULLIF(a, b)</code> for <code>CASE WHEN a = b THEN NULL ELSE a END</code>. That explains their behaviour: COALESCE short-circuits (later arguments, even subqueries, aren't evaluated once a non-NULL is found — in SQL Server, a subquery argument may be evaluated twice because of the CASE expansion), and NULLIF compares with <code>=</code>, so <code>NULLIF(NULL, NULL)</code> is NULL (the first argument) and type coercion follows normal comparison rules.</p>
      <p><b>Types.</b> COALESCE's result type is the common type of its arguments. PostgreSQL: <code>COALESCE(int_col, 'none')</code> fails (text vs integer) — cast first: <code>COALESCE(int_col::text, 'none')</code>. SQL Server's <code>ISNULL(a, b)</code> uses the type of <i>a</i> and can silently truncate b; COALESCE uses precedence. SQLite doesn't care (dynamic typing).</p>
      <p><b>Performance.</b> <code>WHERE COALESCE(dept, 'Unassigned') = 'Sales'</code> wraps the column, so a plain index on <code>dept</code> can't be used for a seek. Rewrite as <code>WHERE dept = 'Sales'</code> (or <code>dept IS NULL</code> for the unassigned case), or create an expression index on <code>COALESCE(dept, 'Unassigned')</code>. The same applies to <code>NULLIF</code> in predicates.</p>
      <p><b>Division by zero across engines.</b> PostgreSQL, SQL Server, Oracle: error, the entire query fails — one bad row kills a nightly report. MySQL: NULL (error in strict mode for INSERT/UPDATE). SQLite: NULL. BigQuery: error, but offers <code>SAFE_DIVIDE(a, b)</code>; Snowflake has <code>DIV0</code> / <code>DIV0NULL</code>. <code>NULLIF(b, 0)</code> is the portable idiom and states intent.</p>
      <p><b>Three-valued logic reminder.</b> NULL in arithmetic → NULL; NULL in comparisons → UNKNOWN; aggregates skip NULL; GROUP BY/DISTINCT treat NULLs as equal; ORDER BY puts NULLs first in SQLite/MySQL and last in PostgreSQL/Oracle (use <code>NULLS FIRST/LAST</code>, supported by SQLite 3.30+).</p>`,
    aiEra: `<p><b>🤖 What AI changes.</b> Assistants love to sprinkle <code>COALESCE(x, 0)</code> everywhere "to be safe". That is often wrong: it converts "unknown" into a confident zero, drags averages down, and hides data-quality bugs (like the broken tracking pixel in our campaigns table). Likewise they may skip NULLIF because SQLite didn't crash in testing — then the same query fails in production on PostgreSQL.</p>
      <p><b>Use AI well:</b> ask <i>"For each COALESCE in this query, what does a NULL mean in the source data, and is replacing it with this default honest?"</i> and <i>"Which divisions could have a zero denominator?"</i>. Have it generate edge-case rows (0 clicks, NULL signups) and run them here.</p>
      <p><b>What you still own:</b> the semantic choice between "unknown" and "zero", portability across engines (÷0 behaviour), and keeping COALESCE out of WHERE clauses on indexed columns. Interviewers use exactly these NULL questions to separate memorisers from people who have shipped reports.</p>`,
    problems: [{
      title: 'Channel Conversion Without Crashes',
      level: 'Medium', tags: ['COALESCE', 'NULLIF', 'ratio', 'GROUP BY'], companies: ['Google', 'Meta', 'Swiggy'],
      statement: `<p>Using <code>campaigns</code> (DB <b>app</b>), report per channel (show NULL channel as <code>'unknown'</code>): total <code>clicks</code>, total <code>signups</code> (NULL counts as 0), <code>conv_pct</code> = signups × 100 ÷ clicks rounded to 1 decimal (NULL when the channel had 0 clicks), and <code>cost_per_signup</code> = spend ÷ signups rounded to 2 decimals (NULL when there were 0 signups). Order by channel. The query must not fail on PostgreSQL either.</p>`,
      constraints: `<p>clicks ≥ 0 and never NULL; signups may be NULL; some channels have 0 clicks or 0 signups.</p>`,
      example: `${H.table(['channel', 'clicks', 'signups', 'conv_pct', 'cost_per_signup'], [['email', '120', '18', '15.0', '0.0'], ['search', '1300', '67', '5.2', '97.01'], ['social', '250', '0', '0.0', '<span class="c-y">NULL</span>'], ['tv', '0', '0', '<span class="c-y">NULL</span>', '<span class="c-y">NULL</span>'], ['<span class="c-b">unknown</span>', '60', '6', '10.0', '50.0']])}<p>tv had 0 clicks → conversion undefined (NULL), not a crash. social had 0 signups → cost per signup undefined. search: 67 × 100 ÷ 1300 = 5.15… → 5.2.</p>`,
      brute: {
        why: `<p>The naive query divides integers (search shows <b class="c-r">5</b> instead of 5.2, cost <b class="c-r">97</b> instead of 97.01), leaves the channel as NULL, and on PostgreSQL/SQL Server it <b class="c-r">crashes with "division by zero"</b> on the social row (3500 ÷ 0). SQLite hides the crash by returning NULL, so it "works on my machine".</p>`,
        code: { lang: 'sql', db: 'app', code: `-- Naive: integer division, NULL channel label, divide-by-zero on stricter engines
SELECT channel,
       SUM(clicks)                      AS clicks,
       SUM(signups)                     AS signups,
       100 * SUM(signups) / SUM(clicks) AS conv_pct,
       SUM(spend) / SUM(signups)        AS cost_per_signup
FROM campaigns
GROUP BY channel;` }
      },
      mcq: { q: 'Which expression is NULL (not an error) when total clicks is 0, on every major database?', options: ['100.0 * signups / clicks', '100.0 * signups / NULLIF(clicks, 0)', '100.0 * signups / COALESCE(clicks, 0)', 'IFNULL(100.0 * signups / clicks, 0)'], answer: 1, explain: 'NULLIF(0, 0) is NULL and x / NULL is NULL. COALESCE(clicks,0) still divides by 0, and wrapping the result in IFNULL is too late — PostgreSQL raises the error before IFNULL runs.' },
      hints: [
        `<p>Hint 1: Aggregate first, then divide totals (ratio of totals) — don't average per-campaign ratios.</p>`,
        `<p>Hint 2: Guard each denominator with <code>NULLIF(SUM(…), 0)</code>; force decimal math with <code>100.0</code> / <code>1.0 *</code>; replace NULL totals with <code>COALESCE(SUM(signups), 0)</code>.</p>`,
        `<p>Hint 3: Label the NULL group with <code>COALESCE(channel, 'unknown')</code> in both SELECT and GROUP BY. Recipe: GROUP BY label → SUM clicks, COALESCE(SUM signups,0) → ROUND(100.0*signups/NULLIF(clicks,0),1) → ROUND(1.0*spend/NULLIF(signups,0),2).</p>`
      ],
      tests: { engine: 'both', pg: `CREATE TABLE campaigns (
  id      INTEGER PRIMARY KEY,
  channel TEXT,                -- NULL = untracked source
  name    TEXT NOT NULL,
  clicks  INTEGER NOT NULL,
  signups INTEGER,             -- NULL = tracking pixel was broken
  spend   INTEGER NOT NULL
);
INSERT INTO campaigns VALUES
  (1, 'search', 'Brand keywords',   400, 40,   2000),
  (2, 'search', 'Generic keywords', 900, 27,   4500),
  (3, 'social', 'Reels promo',        0, 0,     500),
  (4, 'social', 'Influencer',       250, NULL, 3000),
  (5, 'email',  'Newsletter',       120, 18,      0),
  (6, NULL,     'Untracked QR',      60, 6,     300),
  (7, 'email',  'Win-back',           0, NULL,    0),
  (8, 'tv',     'Cricket ad',         0, NULL, 9000);`, cases: [
        { cols: ['channel', 'clicks', 'signups', 'conv_pct', 'cost_per_signup'], rows: [['email', 120, 18, 15, 0], ['search', 1300, 67, 5.2, 97.01], ['social', 250, 0, 0, null], ['tv', 0, 0, null, null], ['unknown', 60, 6, 10, 50]] },
        { setup: 'DELETE FROM campaigns;', rows: [] },
        { setup: 'INSERT INTO campaigns VALUES (9, \'search\', \'Extra\', 100, 10, 1000);', cols: ['channel', 'clicks', 'signups', 'conv_pct', 'cost_per_signup'], rows: [['email', 120, 18, 15, 0], ['search', 1400, 77, 5.5, 97.4], ['social', 250, 0, 0, null], ['tv', 0, 0, null, null], ['unknown', 60, 6, 10, 50]] },
        { setup: 'UPDATE campaigns SET signups = NULL WHERE channel = \'search\';', cols: ['channel', 'clicks', 'signups', 'conv_pct', 'cost_per_signup'], rows: [['email', 120, 18, 15, 0], ['search', 1300, 0, 0, null], ['social', 250, 0, 0, null], ['tv', 0, 0, null, null], ['unknown', 60, 6, 10, 50]] },
        { setup: 'UPDATE campaigns SET channel = NULL WHERE channel = \'tv\';', cols: ['channel', 'clicks', 'signups', 'conv_pct', 'cost_per_signup'], rows: [['email', 120, 18, 15, 0], ['search', 1300, 67, 5.2, 97.01], ['social', 250, 0, 0, null], ['unknown', 60, 6, 10, 1550]] },
        { setup: 'UPDATE campaigns SET clicks = 0;', cols: ['channel', 'clicks', 'signups', 'conv_pct', 'cost_per_signup'], rows: [['email', 0, 18, null, 0], ['search', 0, 67, null, 97.01], ['social', 0, 0, null, null], ['tv', 0, 0, null, null], ['unknown', 0, 6, null, 50]] },
        { setup: 'INSERT INTO campaigns VALUES (9, \'tv\', \'Second ad\', 30, 3, 100), (10, \'ads\', \'New\', 7, 1, 5);', cols: ['channel', 'clicks', 'signups', 'conv_pct', 'cost_per_signup'], rows: [['ads', 7, 1, 14.3, 5], ['email', 120, 18, 15, 0], ['search', 1300, 67, 5.2, 97.01], ['social', 250, 0, 0, null], ['tv', 30, 3, 10, 3033.33], ['unknown', 60, 6, 10, 50]] }
      ] },
      solution: {
        approach: `<p>Group by a COALESCE-d channel label, compute totals, and build each ratio from totals with decimal arithmetic and a NULLIF-guarded denominator. COALESCE only where a zero is the honest answer (signup totals), NULL where the ratio is undefined.</p>`,
        code: { lang: 'sql', db: 'app', code: `SELECT COALESCE(channel, 'unknown')                                  AS channel,
       SUM(clicks)                                                    AS clicks,
       COALESCE(SUM(signups), 0)                                      AS signups,
       ROUND(100.0 * COALESCE(SUM(signups), 0) / NULLIF(SUM(clicks), 0), 1) AS conv_pct,
       ROUND(1.0 * SUM(spend) / NULLIF(SUM(signups), 0), 2)           AS cost_per_signup
FROM campaigns
GROUP BY COALESCE(channel, 'unknown')
ORDER BY channel;` },
        complexity: `<p>One scan, O(N); a handful of accumulators per channel. All the NULL handling is per-group arithmetic, effectively free.</p>`,
        followUps: ['Exclude campaigns whose signups are NULL from the conversion (but still count their clicks?) — discuss which is more honest.', 'Show conversion per campaign AND the channel total in one result.', 'Rank channels by cost per signup, NULLs last (ORDER BY … NULLS LAST).']
      }
    }]
  });

  /* =====================================================================
     PRACTICE — Easy
     ===================================================================== */
  practice.push({
    title: 'Department Headcount & Payroll',
    level: 'Easy', tags: ['GROUP BY', 'COUNT', 'COALESCE'], companies: ['Workday', 'Infosys', 'TCS'],
    statement: `<p>From <code>employees</code> (DB <b>company</b>), return one row per department with <code>dept</code> (show NULL as <code>'Unassigned'</code>), <code>headcount</code>, <code>payroll</code> (sum of salaries, 0 if none) and <code>pending_offers</code> (employees whose salary is NULL). Order by headcount descending, then dept.</p>`,
    constraints: `<p>dept and salary may be NULL. 12 rows.</p>`,
    example: `${H.table(['dept', 'headcount', 'payroll', 'pending_offers'], [['Engineering', '4', '320000', '<span class="c-y">1</span>'], ['Sales', '4', '222000', '0'], ['HR', '2', '93000', '0'], ['Marketing', '1', '70000', '0'], ['<span class="c-b">Unassigned</span>', '1', '40000', '0']])}<p>Kofi (Engineering) has no salary yet: he counts in headcount but not in payroll, and shows up as a pending offer. Jia has no department → 'Unassigned'.</p>`,
    brute: {
      why: `<p>Using <code>COUNT(salary)</code> as headcount silently drops Kofi (Engineering shows <b class="c-r">3</b>), and the NULL department is shown as a blank NULL row that business users can't read. Without ORDER BY the order is whatever the engine produced.</p>`,
      code: { lang: 'sql', db: 'company', code: `SELECT dept, COUNT(salary) AS headcount, SUM(salary) AS payroll
FROM employees
GROUP BY dept;` }
    },
    mcq: { q: 'Which expression counts employees whose salary is NULL in each group?', options: ['COUNT(salary IS NULL)', 'COUNT(*) - COUNT(salary)', 'COUNT(NULL)', 'SUM(salary) - COUNT(*)'], answer: 1, explain: 'COUNT(*) counts all rows, COUNT(salary) only non-NULL ones; the difference is the NULLs. COUNT(salary IS NULL) counts every row because the comparison result 0/1 is never NULL.' },
    hints: [
      `<p>Hint 1: "per department" → GROUP BY dept. NULL departments already form one group; you only need to <i>label</i> it.</p>`,
      `<p>Hint 2: Headcount counts people → COUNT(*). Payroll → SUM(salary) wrapped in COALESCE(…, 0).</p>`,
      `<p>Hint 3: Pending = COUNT(*) − COUNT(salary). Label with COALESCE(dept, 'Unassigned') in SELECT and GROUP BY; ORDER BY headcount DESC, dept.</p>`
    ],
    tests: { engine: 'sqlite', cases: [
      { cols: ['dept', 'headcount', 'payroll', 'pending_offers'], rows: [['Engineering', 4, 320000, 1], ['Sales', 4, 222000, 0], ['HR', 2, 93000, 0], ['Marketing', 1, 70000, 0], ['Unassigned', 1, 40000, 0]] },
      { setup: 'UPDATE employees SET dept = NULL;', cols: ['dept', 'headcount', 'payroll', 'pending_offers'], rows: [['Unassigned', 12, 745000, 1]] },
      { setup: 'UPDATE employees SET salary = NULL WHERE dept = \'HR\';', cols: ['dept', 'headcount', 'payroll', 'pending_offers'], rows: [['Engineering', 4, 320000, 1], ['Sales', 4, 222000, 0], ['HR', 2, 0, 2], ['Marketing', 1, 70000, 0], ['Unassigned', 1, 40000, 0]] },
      { setup: 'DELETE FROM employees;', rows: [] },
      { setup: 'INSERT INTO employees (id, name, dept, salary, email) VALUES (13, \'Zed\', \'Legal\', 1, NULL);', cols: ['dept', 'headcount', 'payroll', 'pending_offers'], rows: [['Engineering', 4, 320000, 1], ['Sales', 4, 222000, 0], ['HR', 2, 93000, 0], ['Legal', 1, 1, 0], ['Marketing', 1, 70000, 0], ['Unassigned', 1, 40000, 0]] },
      { setup: 'INSERT INTO employees (id, name, dept, salary, email) VALUES (13, \'U1\', NULL, 5, NULL);INSERT INTO employees (id, name, dept, salary, email) VALUES (14, \'U2\', NULL, NULL, NULL);', cols: ['dept', 'headcount', 'payroll', 'pending_offers'], rows: [['Engineering', 4, 320000, 1], ['Sales', 4, 222000, 0], ['Unassigned', 3, 40005, 1], ['HR', 2, 93000, 0], ['Marketing', 1, 70000, 0]] },
      { setup: 'UPDATE employees SET dept = \'Unassigned\' WHERE id = 7;', cols: ['dept', 'headcount', 'payroll', 'pending_offers'], rows: [['Engineering', 4, 320000, 1], ['Sales', 4, 222000, 0], ['Unassigned', 2, 85000, 0], ['HR', 1, 48000, 0], ['Marketing', 1, 70000, 0]] }
    ] },
    solution: {
      approach: `<p>Group by the labelled department; COUNT(*) for people, COALESCE(SUM) for money, and the COUNT difference for NULL salaries.</p>`,
      code: { lang: 'sql', db: 'company', code: `SELECT COALESCE(dept, 'Unassigned')   AS dept,
       COUNT(*)                       AS headcount,
       COALESCE(SUM(salary), 0)       AS payroll,
       COUNT(*) - COUNT(salary)       AS pending_offers
FROM employees
GROUP BY COALESCE(dept, 'Unassigned')
ORDER BY headcount DESC, dept;` },
      complexity: `<p>O(N) scan with hash/sort aggregation; O(#departments) memory.</p>`,
      followUps: ['Include departments with zero employees (Legal) from the departments table — needs a LEFT JOIN.', 'Add each department\'s share of total payroll as a percentage.']
    }
  });

  practice.push({
    title: 'Duplicate Emails',
    level: 'Easy', tags: ['GROUP BY', 'HAVING', 'duplicates'], companies: ['Amazon', 'Uber', 'Adobe'],
    statement: `<p>Find every email address that belongs to more than one employee in <code>employees</code> (DB <b>company</b>). Return a single column <code>email</code>. (LeetCode 182 style.)</p>`,
    constraints: `<p>email may be NULL — a NULL is not a duplicate email.</p>`,
    example: `${H.table(['email'], [['<span class="c-r">ben@co.com</span>']])}<p>Ben and Lena share <code>ben@co.com</code> (a data-entry mistake). Ivan's NULL email forms a NULL group of size 1, so it is not reported.</p>`,
    brute: {
      why: `<p>Plain <code>SELECT DISTINCT email</code> or <code>GROUP BY email</code> without HAVING returns <b>every</b> email (12 rows), duplicates or not — grouping removes the repeats instead of finding them. The duplicate test is about the <i>size of the group</i>, which needs HAVING.</p>`,
      code: { lang: 'sql', db: 'company', code: `-- Returns all distinct emails, not the duplicated ones
SELECT email
FROM employees
GROUP BY email;` }
    },
    mcq: { q: 'Which clause expresses "appears more than once"?', options: ['WHERE COUNT(*) > 1', 'HAVING COUNT(*) > 1', 'ORDER BY COUNT(*) DESC LIMIT 1', 'SELECT DISTINCT'], answer: 1, explain: 'The count of rows per email exists only after GROUP BY, so it must be filtered with HAVING. WHERE with an aggregate is an error.' },
    hints: [
      `<p>Hint 1: Put all rows with the same email into one bucket.</p>`,
      `<p>Hint 2: A duplicate email is a bucket with 2 or more rows → HAVING COUNT(*) &gt; 1.</p>`,
      `<p>Hint 3: NULL emails would form a bucket too; add WHERE email IS NOT NULL to be explicit. Recipe: WHERE email IS NOT NULL → GROUP BY email → HAVING COUNT(*) &gt; 1.</p>`
    ],
    tests: { engine: 'sqlite', cmp: 'set', cases: [
      { cols: ['email'], rows: [['ben@co.com']] },
      { setup: 'UPDATE employees SET email = NULL;', rows: [] },
      { setup: 'UPDATE employees SET email = \'ben@co.com\' WHERE id IN (1, 3);', cols: ['email'], rows: [['ben@co.com']] },
      { setup: 'UPDATE employees SET email = \'a@co.com\' WHERE id IN (1, 2); UPDATE employees SET email = \'b@co.com\' WHERE id IN (3, 4);', cols: ['email'], rows: [['a@co.com'], ['b@co.com']] },
      { setup: 'UPDATE employees SET email = id || \'@co.com\';', rows: [] },
      { setup: 'UPDATE employees SET email = \'Ben@co.com\' WHERE id = 12;', rows: [] },
      { setup: 'UPDATE employees SET email = \'same@co.com\';', cols: ['email'], rows: [['same@co.com']] }
    ] },
    solution: {
      approach: `<p>Group by email and keep groups with more than one row. Filtering NULL first makes intent explicit (and protects against a table with several NULL emails being reported as a "duplicate NULL").</p>`,
      code: { lang: 'sql', db: 'company', code: `SELECT email
FROM employees
WHERE email IS NOT NULL
GROUP BY email
HAVING COUNT(*) > 1;` },
      complexity: `<p>O(N) with hashing (or O(N log N) sort). A UNIQUE index on email would have prevented the bug in the first place.</p>`,
      followUps: ['Treat Ben@co.com and ben@co.com as the same (GROUP BY LOWER(TRIM(email))).', 'Return the names sharing each duplicate (GROUP_CONCAT(name) in SQLite, STRING_AGG in Postgres).', 'Delete the duplicates keeping the lowest id (LeetCode 196).']
    }
  });

  practice.push({
    title: 'Clubs With At Least 3 Students',
    level: 'Easy', tags: ['COUNT DISTINCT', 'HAVING'], companies: ['Microsoft', 'Coursera'],
    statement: `<p>In <code>club_signups</code> (DB <b>school</b>) a student may accidentally sign up for the same club twice. Return <code>club</code> and <code>members</code> for clubs with <b>at least 3 different students</b>, most members first. (LeetCode 596 "Classes More Than 5 Students" style.)</p>`,
    constraints: `<p>(student_id, club) pairs may repeat.</p>`,
    example: `${H.table(['club', 'members'], [['Chess', '4'], ['Robotics', '3']])}<p>Chess has 5 sign-up rows but Bilal appears twice → 4 members. Drama has 3 rows but Esha twice → only 2 members → excluded.</p>`,
    brute: {
      why: `<p><code>HAVING COUNT(*) &gt;= 3</code> counts sign-up <i>rows</i>, so the duplicate Drama sign-up makes Drama look like a 3-member club and Chess reports <b class="c-r">5</b> members.</p>`,
      code: { lang: 'sql', db: 'school', code: `SELECT club, COUNT(*) AS members
FROM club_signups
GROUP BY club
HAVING COUNT(*) >= 3;   -- counts duplicate rows` }
    },
    mcq: { q: 'Bilal signed up for Chess twice. What do COUNT(*) and COUNT(DISTINCT student_id) give for Chess?', options: ['4 and 4', '5 and 4', '5 and 5', '4 and 5'], answer: 1, explain: 'COUNT(*) counts the 5 rows; COUNT(DISTINCT student_id) counts 4 different students.' },
    hints: [
      `<p>Hint 1: "different students" is the trigger word for DISTINCT.</p>`,
      `<p>Hint 2: The threshold is on a per-club count → HAVING COUNT(DISTINCT student_id) &gt;= 3.</p>`,
      `<p>Hint 3: Select the same expression as members and ORDER BY members DESC.</p>`
    ],
    tests: { engine: 'sqlite', cases: [
      { cols: ['club', 'members'], rows: [['Chess', 4], ['Robotics', 3]] },
      { setup: 'INSERT INTO club_signups VALUES (6, \'Drama\', \'2024-06-09\');', cols: ['club', 'members'], rows: [['Chess', 4], ['Drama', 3], ['Robotics', 3]] },
      { setup: 'INSERT INTO club_signups VALUES (5, \'Drama\', \'2024-06-09\');INSERT INTO club_signups VALUES (5, \'Drama\', \'2024-06-10\');INSERT INTO club_signups VALUES (5, \'Drama\', \'2024-06-11\');', cols: ['club', 'members'], rows: [['Chess', 4], ['Robotics', 3]] },
      { setup: 'DELETE FROM club_signups;', rows: [] },
      { setup: 'INSERT INTO club_signups VALUES (2, \'Football\', \'2024-06-09\');INSERT INTO club_signups VALUES (3, \'Football\', \'2024-06-09\');INSERT INTO club_signups VALUES (7, \'Football\', \'2024-06-09\');', cols: ['club', 'members'], rows: [['Chess', 4], ['Football', 4], ['Robotics', 3]] },
      { setup: 'DELETE FROM club_signups WHERE club = \'Chess\';', cols: ['club', 'members'], rows: [['Robotics', 3]] },
      { setup: 'INSERT INTO club_signups VALUES (1, \'Chess\', \'2024-06-20\');INSERT INTO club_signups VALUES (1, \'Chess\', \'2024-06-21\');INSERT INTO club_signups VALUES (5, \'Chess\', \'2024-06-21\');INSERT INTO club_signups VALUES (6, \'Chess\', \'2024-06-21\');', cols: ['club', 'members'], rows: [['Chess', 6], ['Robotics', 3]] }
    ] },
    solution: {
      approach: `<p>Group by club, count distinct students, keep groups reaching the threshold.</p>`,
      code: { lang: 'sql', db: 'school', code: `SELECT club, COUNT(DISTINCT student_id) AS members
FROM club_signups
GROUP BY club
HAVING COUNT(DISTINCT student_id) >= 3
ORDER BY members DESC, club;` },
      complexity: `<p>O(N) plus a per-group distinct set; a UNIQUE(student_id, club) constraint would make plain COUNT(*) correct.</p>`,
      followUps: ['Which students joined 2 or more clubs?', 'How many duplicate sign-up rows exist in total? (COUNT(*) − COUNT of distinct pairs)']
    }
  });

  practice.push({
    title: 'Order Status Summary With Share',
    level: 'Easy', tags: ['GROUP BY', 'percentage', 'COALESCE'], companies: ['Flipkart', 'Shopify'],
    statement: `<p>For <code>orders</code> (DB <b>shop</b>) show per <code>status</code>: number of <code>orders</code>, total <code>amount</code> (0 if none), and <code>pct</code> = that status's share of <b>all</b> orders, rounded to 1 decimal. Order by orders descending, then status.</p>`,
    constraints: `<p>amount may be NULL. Percentages must not be truncated by integer division.</p>`,
    example: `${H.table(['status', 'orders', 'amount', 'pct'], [['delivered', '10', '3190', '71.4'], ['cancelled', '2', '150', '14.3'], ['pending', '1', '15', '7.1'], ['returned', '1', '120', '7.1']])}<p>14 orders in total; delivered = 10/14 = 71.43% → 71.4.</p>`,
    brute: {
      why: `<p><code>100 * COUNT(*) / 14</code> uses integer division (71, 14, 7, 7 — they no longer add to 100) and hard-codes the total, which breaks the moment a new order arrives.</p>`,
      code: { lang: 'sql', db: 'shop', code: `SELECT status, COUNT(*) AS orders, 100 * COUNT(*) / 14 AS pct   -- integer math, magic number
FROM orders
GROUP BY status;` }
    },
    mcq: { q: 'Inside a GROUP BY status query, how do you get the total number of orders across ALL statuses?', options: ['COUNT(*) — it already counts everything', 'A scalar subquery (SELECT COUNT(*) FROM orders), or a window SUM(COUNT(*)) OVER ()', 'SUM(status)', 'COUNT(DISTINCT status)'], answer: 1, explain: 'Inside a group, COUNT(*) only sees that group\'s rows. The grand total needs a separate scalar subquery (or a window function over the grouped result, module 6).' },
    hints: [
      `<p>Hint 1: Per status → GROUP BY status; COUNT(*) and COALESCE(SUM(amount), 0).</p>`,
      `<p>Hint 2: The denominator is the whole table, not the group: <code>(SELECT COUNT(*) FROM orders)</code>.</p>`,
      `<p>Hint 3: Multiply by 100.0 before dividing; ROUND(…, 1); wrap the denominator in NULLIF(…, 0) for an empty table.</p>`
    ],
    tests: { engine: 'sqlite', cases: [
      { cols: ['status', 'orders', 'amount', 'pct'], rows: [['delivered', 10, 3190, 71.4], ['cancelled', 2, 150, 14.3], ['pending', 1, 15, 7.1], ['returned', 1, 120, 7.1]] },
      { setup: 'DELETE FROM orders;', rows: [] },
      { setup: 'UPDATE orders SET status = \'delivered\';', cols: ['status', 'orders', 'amount', 'pct'], rows: [['delivered', 14, 3475, 100]] },
      { setup: 'UPDATE orders SET amount = NULL WHERE status = \'pending\' OR status = \'returned\';', cols: ['status', 'orders', 'amount', 'pct'], rows: [['delivered', 10, 3190, 71.4], ['cancelled', 2, 150, 14.3], ['pending', 1, 0, 7.1], ['returned', 1, 0, 7.1]] },
      { setup: 'DELETE FROM orders WHERE status = \'delivered\' AND id > 2;', cols: ['status', 'orders', 'amount', 'pct'], rows: [['cancelled', 2, 150, 33.3], ['delivered', 2, 1055, 33.3], ['pending', 1, 15, 16.7], ['returned', 1, 120, 16.7]] },
      { setup: 'UPDATE orders SET status = \'pending\' WHERE id IN (1, 2, 3);', cols: ['status', 'orders', 'amount', 'pct'], rows: [['delivered', 8, 2135, 57.1], ['pending', 4, 1100, 28.6], ['cancelled', 1, 120, 7.1], ['returned', 1, 120, 7.1]] }
    ] },
    solution: {
      approach: `<p>Aggregate per status, divide by a scalar subquery for the grand total, using decimal arithmetic and a zero guard.</p>`,
      code: { lang: 'sql', db: 'shop', code: `SELECT status,
       COUNT(*)                   AS orders,
       COALESCE(SUM(amount), 0)   AS amount,
       ROUND(100.0 * COUNT(*) / NULLIF((SELECT COUNT(*) FROM orders), 0), 1) AS pct
FROM orders
GROUP BY status
ORDER BY orders DESC, status;` },
      alt: [{ lang: 'sql', db: 'shop', title: 'With a window function (module 6 preview)', code: `SELECT status, COUNT(*) AS orders,
       ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1) AS pct
FROM orders
GROUP BY status
ORDER BY orders DESC, status;` }],
      complexity: `<p>Two scans (the subquery runs once — it is not correlated). The window version needs only one.</p>`,
      followUps: ['Share of revenue instead of share of orders.', 'Make the percentages add up to exactly 100.0 after rounding (largest remainder method).']
    }
  });

  /* =====================================================================
     PRACTICE — Medium
     ===================================================================== */
  practice.push({
    title: 'Monthly Transactions I',
    level: 'Medium', tags: ['conditional aggregation', 'GROUP BY expression'], companies: ['Wayfair', 'Stripe', 'PayPal'],
    statement: `<p>For <code>transactions</code> (DB <b>app</b>) report, for each month (<code>'YYYY-MM'</code>) and country: <code>trans_count</code>, <code>approved_count</code>, <code>trans_total_amount</code>, <code>approved_total_amount</code>. (LeetCode 1193.)</p>`,
    constraints: `<p>state ∈ {approved, declined}. country may be NULL and must still be reported as its own group.</p>`,
    example: `${H.table(['month', 'country', 'trans_count', 'approved_count', 'trans_total_amount', 'approved_total_amount'], [['2024-12', 'US', '2', '1', '3000', '1000'], ['2025-01', '<span class="c-m">NULL</span>', '1', '1', '300', '300'], ['2025-01', 'DE', '2', '1', '2500', '2000'], ['2025-01', 'IN', '2', '<span class="c-y">0</span>', '1100', '<span class="c-y">0</span>'], ['2025-01', 'US', '1', '1', '2000', '2000']])}<p>India had only declined transactions → approved values must be <b>0</b>, not missing.</p>`,
    brute: {
      why: `<p>Filtering <code>WHERE state = 'approved'</code> makes the approved numbers easy but destroys the overall counts, and India (all declined) <b class="c-r">disappears</b> entirely. Two separate queries joined later is slow and error-prone.</p>`,
      code: { lang: 'sql', db: 'app', code: `SELECT substr(trans_date, 1, 7) AS month, country,
       COUNT(*) AS approved_count, SUM(amount) AS approved_total_amount
FROM transactions
WHERE state = 'approved'          -- loses declined rows and the IN group
GROUP BY month, country;` }
    },
    mcq: { q: 'How do you count approved transactions without losing the declined ones from trans_count?', options: ['WHERE state = \'approved\'', 'SUM(CASE WHEN state = \'approved\' THEN 1 ELSE 0 END)', 'COUNT(state = \'approved\')', 'HAVING state = \'approved\''], answer: 1, explain: 'The CASE inside SUM counts only approved rows while every row still reaches COUNT(*). COUNT(state = \'approved\') counts every non-NULL comparison result (0 or 1) — i.e. all rows.' },
    hints: [
      `<p>Hint 1: One row per (month, country) → GROUP BY an expression for month plus country.</p>`,
      `<p>Hint 2: All four numbers come from the same rows → conditional aggregation: SUM(CASE WHEN state = 'approved' THEN 1 ELSE 0 END) and SUM(CASE WHEN … THEN amount ELSE 0 END).</p>`,
      `<p>Hint 3: Use ELSE 0 so all-declined groups show 0. NULL country groups automatically. Month: substr(trans_date, 1, 7).</p>`
    ],
    tests: { engine: 'sqlite', cmp: 'set', cases: [
      { cols: ['month', 'country', 'trans_count', 'approved_count', 'trans_total_amount', 'approved_total_amount'], rows: [['2024-12', 'US', 2, 1, 3000, 1000], ['2025-01', null, 1, 1, 300, 300], ['2025-01', 'DE', 2, 1, 2500, 2000], ['2025-01', 'IN', 2, 0, 1100, 0], ['2025-01', 'US', 1, 1, 2000, 2000]] },
      { setup: 'DELETE FROM transactions;', rows: [] },
      { setup: 'INSERT INTO transactions VALUES (130, NULL, \'declined\', 50, \'2025-01-16\');INSERT INTO transactions VALUES (131, NULL, \'declined\', 60, \'2024-12-01\');', cols: ['month', 'country', 'trans_count', 'approved_count', 'trans_total_amount', 'approved_total_amount'], rows: [['2024-12', null, 1, 0, 60, 0], ['2024-12', 'US', 2, 1, 3000, 1000], ['2025-01', null, 2, 1, 350, 300], ['2025-01', 'DE', 2, 1, 2500, 2000], ['2025-01', 'IN', 2, 0, 1100, 0], ['2025-01', 'US', 1, 1, 2000, 2000]] },
      { setup: 'UPDATE transactions SET state = \'declined\';', cols: ['month', 'country', 'trans_count', 'approved_count', 'trans_total_amount', 'approved_total_amount'], rows: [['2024-12', 'US', 2, 0, 3000, 0], ['2025-01', null, 1, 0, 300, 0], ['2025-01', 'DE', 2, 0, 2500, 0], ['2025-01', 'IN', 2, 0, 1100, 0], ['2025-01', 'US', 1, 0, 2000, 0]] },
      { setup: 'UPDATE transactions SET state = \'approved\';', cols: ['month', 'country', 'trans_count', 'approved_count', 'trans_total_amount', 'approved_total_amount'], rows: [['2024-12', 'US', 2, 2, 3000, 3000], ['2025-01', null, 1, 1, 300, 300], ['2025-01', 'DE', 2, 2, 2500, 2500], ['2025-01', 'IN', 2, 2, 1100, 1100], ['2025-01', 'US', 1, 1, 2000, 2000]] },
      { setup: 'INSERT INTO transactions VALUES (130, \'FR\', \'approved\', 10, \'2025-02-01\');INSERT INTO transactions VALUES (131, \'FR\', \'approved\', 20, \'2025-02-28\');INSERT INTO transactions VALUES (132, \'FR\', \'declined\', 5, \'2025-03-01\');', cols: ['month', 'country', 'trans_count', 'approved_count', 'trans_total_amount', 'approved_total_amount'], rows: [['2024-12', 'US', 2, 1, 3000, 1000], ['2025-01', null, 1, 1, 300, 300], ['2025-01', 'DE', 2, 1, 2500, 2000], ['2025-01', 'IN', 2, 0, 1100, 0], ['2025-01', 'US', 1, 1, 2000, 2000], ['2025-02', 'FR', 2, 2, 30, 30], ['2025-03', 'FR', 1, 0, 5, 0]] }
    ] },
    solution: {
      approach: `<p>Single pass: group by month and country; plain COUNT/SUM for totals, CASE-filtered SUMs for approved figures.</p>`,
      code: { lang: 'sql', db: 'app', code: `SELECT substr(trans_date, 1, 7)                                  AS month,
       country,
       COUNT(*)                                                   AS trans_count,
       SUM(CASE WHEN state = 'approved' THEN 1 ELSE 0 END)        AS approved_count,
       SUM(amount)                                                AS trans_total_amount,
       SUM(CASE WHEN state = 'approved' THEN amount ELSE 0 END)   AS approved_total_amount
FROM transactions
GROUP BY month, country
ORDER BY month, country;` },
      complexity: `<p>O(N), one scan, four accumulators per group.</p>`,
      followUps: ['Add approval rate per group.', 'Monthly Transactions II (chargebacks from another table — UNION ALL then aggregate).']
    }
  });

  practice.push({
    title: 'Queries Quality and Percentage',
    level: 'Medium', tags: ['AVG', 'conditional aggregation', 'integer division'], companies: ['Facebook', 'Google'],
    statement: `<p>For each <code>query_name</code> in <code>queries</code> (DB <b>app</b>): <code>quality</code> = average of rating ÷ position, and <code>poor_query_percentage</code> = percentage of results with rating &lt; 3. Round both to 2 decimals. (LeetCode 1211.)</p>`,
    constraints: `<p>rating 1–5, position 1–500, both integers.</p>`,
    example: `${H.table(['query_name', 'quality', 'poor_query_percentage'], [['Bird', '0.24', '100.0'], ['Cat', '0.66', '33.33'], ['Dog', '2.5', '33.33']])}<p>Dog: (5/1 + 5/2 + 1/200) / 3 = 2.50; one of three ratings is below 3 → 33.33%.</p>`,
    brute: {
      why: `<p>In SQLite/PostgreSQL <code>rating / position</code> on integers is integer division: 5/2 = <b class="c-r">2</b>, 3/5 = <b class="c-r">0</b>. Quality comes out 2.33 for Dog and 0.0 for Bird, and <code>SUM(…)/COUNT(*)*100</code> divides integers first → 0 for Cat.</p>`,
      code: { lang: 'sql', db: 'app', code: `SELECT query_name,
       ROUND(AVG(rating / position), 2)                                    AS quality,   -- integer division
       ROUND(SUM(CASE WHEN rating < 3 THEN 1 ELSE 0 END) / COUNT(*) * 100, 2) AS poor_query_percentage
FROM queries
GROUP BY query_name;` }
    },
    mcq: { q: 'In SQLite, what is 3 / 5 * 100?', options: ['60', '60.0', '0', '0.6'], answer: 2, explain: 'Both operands are integers, so 3 / 5 = 0 (truncated), then 0 * 100 = 0. Write 100.0 * 3 / 5 = 60.0.' },
    hints: [
      `<p>Hint 1: "average of a per-row ratio" really is AVG(ratio) here — the question defines quality that way.</p>`,
      `<p>Hint 2: Force decimals: <code>AVG(1.0 * rating / position)</code>. For the percentage use <code>AVG(CASE WHEN rating &lt; 3 THEN 100.0 ELSE 0 END)</code> or 100.0 * SUM(...) / COUNT(*).</p>`,
      `<p>Hint 3: GROUP BY query_name, ROUND(…, 2) both.</p>`
    ],
    tests: { engine: 'sqlite', cases: [
      { cols: ['query_name', 'quality', 'poor_query_percentage'], rows: [['Bird', 0.24, 100], ['Cat', 0.66, 33.33], ['Dog', 2.5, 33.33]] },
      { setup: 'DELETE FROM queries;', rows: [] },
      { setup: 'INSERT INTO queries VALUES (\'Fish\', \'Goldfish\', 1, 3);', cols: ['query_name', 'quality', 'poor_query_percentage'], rows: [['Bird', 0.24, 100], ['Cat', 0.66, 33.33], ['Dog', 2.5, 33.33], ['Fish', 3, 0]] },
      { setup: 'INSERT INTO queries VALUES (\'Fish\', \'Koi\', 500, 1);INSERT INTO queries VALUES (\'Fish\', \'Trout\', 2, 2);INSERT INTO queries VALUES (\'Fish\', \'Salmon\', 3, 5);', cols: ['query_name', 'quality', 'poor_query_percentage'], rows: [['Bird', 0.24, 100], ['Cat', 0.66, 33.33], ['Dog', 2.5, 33.33], ['Fish', 0.89, 66.67]] },
      { setup: 'UPDATE queries SET rating = 5;', cols: ['query_name', 'quality', 'poor_query_percentage'], rows: [['Bird', 0.9, 0], ['Cat', 1.13, 0], ['Dog', 2.51, 0]] },
      { setup: 'UPDATE queries SET rating = 2 WHERE query_name = \'Dog\';', cols: ['query_name', 'quality', 'poor_query_percentage'], rows: [['Bird', 0.24, 100], ['Cat', 0.66, 33.33], ['Dog', 1, 100]] },
      { setup: 'UPDATE queries SET position = 1;', cols: ['query_name', 'quality', 'poor_query_percentage'], rows: [['Bird', 1.5, 100], ['Cat', 3, 33.33], ['Dog', 3.67, 33.33]] }
    ] },
    solution: {
      approach: `<p>Group by query name; AVG of a decimal ratio for quality; conditional AVG of 100/0 for the poor percentage.</p>`,
      code: { lang: 'sql', db: 'app', code: `SELECT query_name,
       ROUND(AVG(1.0 * rating / position), 2)                     AS quality,
       ROUND(AVG(CASE WHEN rating < 3 THEN 100.0 ELSE 0 END), 2)  AS poor_query_percentage
FROM queries
GROUP BY query_name
ORDER BY query_name;` },
      complexity: `<p>O(N), a single pass with two accumulators per query_name.</p>`,
      followUps: ['Why is "average of ratios" right here but wrong for conversion rate across days?', 'Exclude queries with fewer than 3 results (HAVING COUNT(*) >= 3).']
    }
  });

  practice.push({
    title: 'Actors and Directors Who Cooperated At Least 3 Times',
    level: 'Medium', tags: ['GROUP BY multiple columns', 'HAVING'], companies: ['Amazon', 'Netflix'],
    statement: `<p>Table <code>cooperation(actor_id, director_id, timestamp)</code> (DB <b>app</b>) has one row per film collaboration. Return <code>actor_id, director_id</code> pairs that worked together at least 3 times. (LeetCode 1050.)</p>`,
    constraints: `<p>timestamp is unique per row.</p>`,
    example: `${H.table(['actor_id', 'director_id'], [['1', '1'], ['2', '1']])}<p>(1,1) appears 3 times, (2,1) 3 times, (1,2) only twice, (3,3) once.</p>`,
    brute: {
      why: `<p>Grouping by <code>actor_id</code> alone counts all of actor 1's films (5) regardless of director, so actor 1 qualifies even if no single director reached 3. The question is about <b>pairs</b> — the group key must be both columns.</p>`,
      code: { lang: 'sql', db: 'app', code: `SELECT actor_id, COUNT(*) AS films
FROM cooperation
GROUP BY actor_id            -- wrong grain: per actor, not per pair
HAVING COUNT(*) >= 3;` }
    },
    mcq: { q: 'What does GROUP BY actor_id, director_id produce?', options: ['One group per actor', 'One group per director', 'One group per distinct (actor, director) combination', 'A cross join of actors and directors'], answer: 2, explain: 'Multiple grouping columns create one bucket per existing combination of values.' },
    hints: [
      `<p>Hint 1: The thing being counted is a <i>pair</i>.</p>`,
      `<p>Hint 2: Make the pair the bucket key: GROUP BY actor_id, director_id.</p>`,
      `<p>Hint 3: HAVING COUNT(*) &gt;= 3 keeps pairs with 3+ rows.</p>`
    ],
    tests: { engine: 'sqlite', cases: [
      { cols: ['actor_id', 'director_id'], rows: [[1, 1], [2, 1]] },
      { setup: 'INSERT INTO cooperation VALUES (1, 2, 9);', cols: ['actor_id', 'director_id'], rows: [[1, 1], [1, 2], [2, 1]] },
      { setup: 'DELETE FROM cooperation;', rows: [] },
      { setup: 'INSERT INTO cooperation VALUES (3, 3, 9), (3, 3, 10);', cols: ['actor_id', 'director_id'], rows: [[1, 1], [2, 1], [3, 3]] },
      { setup: 'INSERT INTO cooperation VALUES (2, 3, 9), (2, 3, 10), (2, 3, 11), (2, 3, 12), (3, 2, 13), (3, 2, 14), (3, 2, 15);', cols: ['actor_id', 'director_id'], rows: [[1, 1], [2, 1], [2, 3], [3, 2]] },
      { setup: 'DELETE FROM cooperation WHERE timestamp < 3;', cols: ['actor_id', 'director_id'], rows: [[2, 1]] },
      { setup: 'UPDATE cooperation SET director_id = 1;', cols: ['actor_id', 'director_id'], rows: [[1, 1], [2, 1]] }
    ] },
    solution: {
      approach: `<p>Two-column grouping plus a HAVING threshold.</p>`,
      code: { lang: 'sql', db: 'app', code: `SELECT actor_id, director_id
FROM cooperation
GROUP BY actor_id, director_id
HAVING COUNT(*) >= 3
ORDER BY actor_id, director_id;` },
      complexity: `<p>O(N); an index on (actor_id, director_id) lets the engine stream groups without a sort.</p>`,
      followUps: ['Return the pair with the most collaborations (ORDER BY COUNT(*) DESC LIMIT 1 — what about ties?).']
    }
  });

  practice.push({
    title: 'Second Highest Salary (NULL If None)',
    level: 'Medium', tags: ['MAX', 'subquery', 'NULL'], companies: ['Amazon', 'Apple', 'Accenture'],
    statement: `<p>Return the second highest <b>distinct</b> salary from <code>employees</code> (DB <b>company</b>) as a column <code>SecondHighestSalary</code>. If there is no second highest salary, return a single row containing NULL. (LeetCode 176.) The same pattern, restricted to <code>dept = 'Marketing'</code>, must return NULL; the company-wide query is the last result.</p>`,
    constraints: `<p>salary may be NULL; ties possible.</p>`,
    example: `${H.table(['SecondHighestSalary'], [['105000']])}<p>Highest is 120000 (Asha); next distinct is 105000 (Chen). For Marketing (only Ivan) → <span class="c-y">NULL</span>.</p>`,
    brute: {
      why: `<p><code>ORDER BY salary DESC LIMIT 1 OFFSET 1</code> works on this data but has two bugs: with a tie at the top (two people at 120000) it returns 120000 again, and when there is no second salary it returns <b class="c-r">zero rows</b> instead of one NULL row — failing the requirement.</p>`,
      code: { lang: 'sql', db: 'company', code: `SELECT salary AS SecondHighestSalary
FROM employees
WHERE dept = 'Marketing'
ORDER BY salary DESC
LIMIT 1 OFFSET 1;          -- zero rows, not NULL` }
    },
    mcq: { q: 'Why does SELECT MAX(salary) FROM employees WHERE salary < 120000 AND dept = \'Marketing\' return a NULL row rather than no rows?', options: ['Because MAX ignores WHERE', 'An aggregate without GROUP BY always returns exactly one row; MAX over nothing is NULL', 'Because Marketing has NULL salaries', 'It returns no rows'], answer: 1, explain: 'Without GROUP BY the whole (possibly empty) input is one group, so there is always one output row; MAX of an empty set is NULL.' },
    hints: [
      `<p>Hint 1: The second highest is "the highest among salaries that are below the highest".</p>`,
      `<p>Hint 2: <code>MAX(salary) WHERE salary &lt; (SELECT MAX(salary) …)</code> handles ties automatically.</p>`,
      `<p>Hint 3: A plain aggregate always returns one row, so "no second salary" naturally becomes NULL — no special casing.</p>`
    ],
    tests: { engine: 'sqlite', cases: [
      { cols: ['SecondHighestSalary'], rows: [[105000]] },
      { setup: 'UPDATE employees SET salary = 100;', cols: ['SecondHighestSalary'], rows: [[null]] },
      { setup: 'DELETE FROM employees WHERE id <> 1;', cols: ['SecondHighestSalary'], rows: [[null]] },
      { setup: 'DELETE FROM employees;', cols: ['SecondHighestSalary'], rows: [[null]] },
      { setup: 'UPDATE employees SET salary = NULL;', cols: ['SecondHighestSalary'], rows: [[null]] },
      { setup: 'UPDATE employees SET salary = 120000 WHERE id = 3;', cols: ['SecondHighestSalary'], rows: [[95000]] },
      { setup: 'UPDATE employees SET salary = -salary;', cols: ['SecondHighestSalary'], rows: [[-45000]] },
      { setup: 'UPDATE employees SET salary = NULL WHERE id <> 1 AND id <> 2;', cols: ['SecondHighestSalary'], rows: [[95000]] }
    ] },
    solution: {
      approach: `<p>Use the "aggregate over empty input returns NULL" rule: take MAX over all salaries strictly below the overall MAX.</p>`,
      code: { lang: 'sql', db: 'company', code: `-- Same pattern for one department (returns one NULL row for Marketing)
SELECT MAX(salary) AS SecondHighestSalary
FROM employees
WHERE dept = 'Marketing'
  AND salary < (SELECT MAX(salary) FROM employees WHERE dept = 'Marketing');

-- The whole company (the final result)
SELECT MAX(salary) AS SecondHighestSalary
FROM employees
WHERE salary < (SELECT MAX(salary) FROM employees);` },
      alt: [{ lang: 'sql', db: 'company', title: 'LIMIT/OFFSET fixed: DISTINCT + wrap in a scalar subquery', code: `SELECT (SELECT DISTINCT salary
        FROM employees
        WHERE salary IS NOT NULL
        ORDER BY salary DESC
        LIMIT 1 OFFSET 1) AS SecondHighestSalary;   -- scalar subquery → NULL when empty` }],
      complexity: `<p>Two scans (or two index probes with an index on salary: O(log N) each).</p>`,
      followUps: ['Nth highest salary (LeetCode 177) — DENSE_RANK or OFFSET N-1 with DISTINCT.', 'Second highest per department (window functions, module 6).']
    }
  });

  practice.push({
    title: 'Revenue Pivot: One Column Per Month',
    level: 'Medium', tags: ['pivot', 'conditional aggregation'], companies: ['Microsoft', 'Zomato', 'Deloitte'],
    statement: `<p>Using delivered orders in <code>orders</code> (DB <b>shop</b>), produce one row per <code>customer_id</code> with columns <code>jan, feb, mar, apr</code> (2024 revenue in each month, 0 if none) and <code>total</code>. Order by total descending. (LeetCode 1179 "Reformat Department Table" style.)</p>`,
    constraints: `<p>order_date is 'YYYY-MM-DD'. amount may be NULL (adds nothing).</p>`,
    example: `${H.table(['customer_id', 'jan', 'feb', 'mar', 'apr', 'total'], [['1', '920', '0', '50', '55', '1025'], ['5', '0', '0', '1020', '0', '1020'], ['4', '0', '0', '900', '0', '900'], ['2', '135', '25', '0', '45', '205'], ['3', '0', '40', '0', '0', '40']])}<p>Each order row adds its amount to exactly one month column of its customer's row.</p>`,
    brute: {
      why: `<p>Grouping by customer <i>and month</i> gives the right numbers but in the wrong shape: 9 long rows instead of 5 wide ones, so the "report" still has to be pivoted by hand in a spreadsheet. Running 4 separate per-month queries and gluing them is slower (4 scans) and fragile.</p>`,
      code: { lang: 'sql', db: 'shop', code: `SELECT customer_id, substr(order_date, 1, 7) AS month, SUM(amount) AS revenue
FROM orders
WHERE status = 'delivered'
GROUP BY customer_id, month;   -- long format, not the requested pivot` }
    },
    mcq: { q: 'In SUM(CASE WHEN order_date LIKE \'2024-02%\' THEN amount ELSE 0 END), what does a January row contribute?', options: ['NULL', '0', 'Its amount', 'It is skipped by WHERE'], answer: 1, explain: 'The CASE condition is false, so ELSE 0 is returned and the SUM is unchanged. That is how one pass fills every column.' },
    hints: [
      `<p>Hint 1: Wide output = one row per customer → GROUP BY customer_id only.</p>`,
      `<p>Hint 2: One conditional SUM per month column: <code>SUM(CASE WHEN order_date LIKE '2024-01%' THEN amount ELSE 0 END) AS jan</code>.</p>`,
      `<p>Hint 3: total = SUM(amount); WHERE status = 'delivered'; ORDER BY total DESC.</p>`
    ],
    tests: { engine: 'sqlite', cases: [
      { cols: ['customer_id', 'jan', 'feb', 'mar', 'apr', 'total'], rows: [[1, 920, 0, 50, 55, 1025], [5, 0, 0, 1020, 0, 1020], [4, 0, 0, 900, 0, 900], [2, 135, 25, 0, 45, 205], [3, 0, 40, 0, 0, 40]] },
      { setup: 'UPDATE orders SET status = \'cancelled\' WHERE customer_id = 1;', cols: ['customer_id', 'jan', 'feb', 'mar', 'apr', 'total'], rows: [[5, 0, 0, 1020, 0, 1020], [4, 0, 0, 900, 0, 900], [2, 135, 25, 0, 45, 205], [3, 0, 40, 0, 0, 40]] },
      { setup: 'DELETE FROM orders;', rows: [] },
      { setup: 'INSERT INTO orders (id, customer_id, order_date, status, amount) VALUES (15, 6, \'2024-01-01\', \'delivered\', 1);INSERT INTO orders (id, customer_id, order_date, status, amount) VALUES (16, 6, \'2024-04-30\', \'delivered\', 2);', cols: ['customer_id', 'jan', 'feb', 'mar', 'apr', 'total'], rows: [[1, 920, 0, 50, 55, 1025], [5, 0, 0, 1020, 0, 1020], [4, 0, 0, 900, 0, 900], [2, 135, 25, 0, 45, 205], [3, 0, 40, 0, 0, 40], [6, 1, 0, 0, 2, 3]] },
      { setup: 'INSERT INTO orders (id, customer_id, order_date, status, amount) VALUES (15, 3, \'2024-03-31\', \'delivered\', 5000);', cols: ['customer_id', 'jan', 'feb', 'mar', 'apr', 'total'], rows: [[3, 0, 40, 5000, 0, 5040], [1, 920, 0, 50, 55, 1025], [5, 0, 0, 1020, 0, 1020], [4, 0, 0, 900, 0, 900], [2, 135, 25, 0, 45, 205]] },
      { setup: 'UPDATE orders SET amount = NULL WHERE customer_id = 2;', cols: ['customer_id', 'jan', 'feb', 'mar', 'apr', 'total'], rows: [[1, 920, 0, 50, 55, 1025], [5, 0, 0, 1020, 0, 1020], [4, 0, 0, 900, 0, 900], [3, 0, 40, 0, 0, 40], [2, 0, 0, 0, 0, 0]] }
    ] },
    solution: {
      approach: `<p>Group by customer and build each month column with a CASE-filtered SUM; ELSE 0 makes empty months 0.</p>`,
      code: { lang: 'sql', db: 'shop', code: `SELECT customer_id,
       SUM(CASE WHEN order_date LIKE '2024-01%' THEN amount ELSE 0 END) AS jan,
       SUM(CASE WHEN order_date LIKE '2024-02%' THEN amount ELSE 0 END) AS feb,
       SUM(CASE WHEN order_date LIKE '2024-03%' THEN amount ELSE 0 END) AS mar,
       SUM(CASE WHEN order_date LIKE '2024-04%' THEN amount ELSE 0 END) AS apr,
       COALESCE(SUM(amount), 0)                                          AS total
FROM orders
WHERE status = 'delivered'
GROUP BY customer_id
ORDER BY total DESC;` },
      complexity: `<p>One scan, O(N); 5 accumulators per customer.</p>`,
      followUps: ['Add a final "all customers" row (UNION ALL a query without GROUP BY).', 'Generate the 12 month columns automatically (dynamic SQL in app code).']
    }
  });

  practice.push({
    title: 'Departments Paying Above the Company Average',
    level: 'Medium', tags: ['HAVING', 'scalar subquery', 'AVG'], companies: ['Goldman Sachs', 'Oracle'],
    statement: `<p>Return <code>dept</code> and <code>dept_avg</code> (rounded to whole numbers) for departments whose average salary is higher than the average salary of the whole company (DB <b>company</b>). Ignore employees without a department. Order by dept_avg descending.</p>`,
    constraints: `<p>salary may be NULL (ignored by AVG). Company average includes everyone with a salary, even unassigned employees.</p>`,
    example: `${H.table(['dept', 'dept_avg'], [['Engineering', '106667.0'], ['Marketing', '70000.0']])}<p>Company average = 745000 ÷ 11 = 67727.27. Sales (55500) and HR (46500) fall below it.</p>`,
    brute: {
      why: `<p>Comparing each <b>employee</b> with the average in WHERE (<code>WHERE salary &gt; 67727</code>) and then grouping answers a different question ("departments that have some above-average employee") and also hard-codes a number that goes stale.</p>`,
      code: { lang: 'sql', db: 'company', code: `SELECT dept, ROUND(AVG(salary)) AS dept_avg
FROM employees
WHERE salary > 67727          -- per-employee filter + magic number
GROUP BY dept;` }
    },
    mcq: { q: 'Where does the comparison "department average > company average" belong?', options: ['WHERE', 'HAVING', 'ORDER BY', 'GROUP BY'], answer: 1, explain: 'The department average exists only after grouping, so the comparison is a group filter → HAVING. The company average is a scalar subquery.' },
    hints: [
      `<p>Hint 1: Two averages at different grains: per department (GROUP BY) and whole company (no GROUP BY).</p>`,
      `<p>Hint 2: The company number is a scalar subquery <code>(SELECT AVG(salary) FROM employees)</code> usable inside HAVING.</p>`,
      `<p>Hint 3: WHERE dept IS NOT NULL → GROUP BY dept → HAVING AVG(salary) &gt; (subquery) → ORDER BY dept_avg DESC.</p>`
    ],
    tests: { engine: 'sqlite', cases: [
      { cols: ['dept', 'dept_avg'], rows: [['Engineering', 106667], ['Marketing', 70000]] },
      { setup: 'UPDATE employees SET salary = 1000000 WHERE id = 10;', rows: [] },
      { setup: 'UPDATE employees SET dept = NULL;', rows: [] },
      { setup: 'UPDATE employees SET salary = 50000;', rows: [] },
      { setup: 'UPDATE employees SET salary = NULL WHERE dept = \'Engineering\';', cols: ['dept', 'dept_avg'], rows: [['Marketing', 70000], ['Sales', 55500]] },
      { setup: 'UPDATE employees SET salary = 100000 WHERE id IN (7, 8);', cols: ['dept', 'dept_avg'], rows: [['Engineering', 106667], ['HR', 100000]] },
      { setup: 'UPDATE employees SET dept = \'Engineering\' WHERE id IN (4, 5, 6);', cols: ['dept', 'dept_avg'], rows: [['Engineering', 81667], ['Marketing', 70000]] }
    ] },
    solution: {
      approach: `<p>Aggregate per department and filter groups by comparing with a scalar subquery computed once.</p>`,
      code: { lang: 'sql', db: 'company', code: `SELECT dept, ROUND(AVG(salary)) AS dept_avg
FROM employees
WHERE dept IS NOT NULL
GROUP BY dept
HAVING AVG(salary) > (SELECT AVG(salary) FROM employees)
ORDER BY dept_avg DESC;` },
      complexity: `<p>Two scans: one for the uncorrelated subquery (evaluated once), one for grouping.</p>`,
      followUps: ['Compare each department with the average of the OTHER departments (correlated subquery).', 'List employees earning above their own department\'s average (module 5/6).']
    }
  });

  /* =====================================================================
     PRACTICE — Hard
     ===================================================================== */
  practice.push({
    title: 'Trips and Users: Daily Cancellation Rate',
    level: 'Hard', tags: ['conditional aggregation', 'ratio', 'filter both sides'], companies: ['Uber', 'Ola', 'Lyft'],
    statement: `<p>Tables <code>trips</code> and <code>users</code> (DB <b>app</b>). The cancellation rate of a day = (trips cancelled by client or driver) ÷ (all trips) counting only trips where <b>both the client and the driver are not banned</b>. Return <code>day</code> and <code>cancellation_rate</code> (2 decimals) for 2025-10-01 to 2025-10-03. (LeetCode 262.)</p>`,
    constraints: `<p>status ∈ {completed, cancelled_by_driver, cancelled_by_client}. banned ∈ {'Yes','No'}. Days with no unbanned trips may be omitted.</p>`,
    example: `${H.table(['day', 'cancellation_rate'], [['2025-10-01', '0.5'], ['2025-10-02', '0.0'], ['2025-10-03', '0.5']])}<p>Oct 1: trips 2 (banned client 2) and 4 (banned driver 13) are excluded from <b>both</b> numerator and denominator; of trips 1 and 3, one was cancelled → 1/2 = 0.50.</p>`,
    brute: {
      why: `<p>Ignoring the banned users gives Oct 1 = 3 cancellations ÷ 4 trips = <b class="c-r">0.75</b> and Oct 3 = <b class="c-r">0.33</b>. Another classic mistake is filtering banned users only in the numerator, which mixes two different populations into one ratio. Numerator and denominator must come from the <i>same</i> filtered rows — conditional aggregation guarantees that.</p>`,
      code: { lang: 'sql', db: 'app', code: `-- Wrong: banned users still counted
SELECT request_at AS day,
       ROUND(1.0 * SUM(CASE WHEN status <> 'completed' THEN 1 ELSE 0 END) / COUNT(*), 2) AS cancellation_rate
FROM trips
GROUP BY request_at;` }
    },
    mcq: { q: 'Which expression gives the fraction of cancelled trips in a group, as a decimal, in one pass?', options: ['COUNT(status <> \'completed\') / COUNT(*)', 'AVG(CASE WHEN status <> \'completed\' THEN 1.0 ELSE 0 END)', 'SUM(status) / COUNT(*)', 'COUNT(CASE WHEN status <> \'completed\' THEN 1 ELSE 0 END) / COUNT(*)'], answer: 1, explain: 'The average of 1.0/0 flags is the fraction of 1s, and it is already decimal. Options 1 and 4 count every row (0 is not NULL), giving 1.' },
    hints: [
      `<p>Hint 1: First decide the population: only trips whose client AND driver are unbanned. That is a row filter — do it before grouping (join to users twice, once per role).</p>`,
      `<p>Hint 2: Per day → GROUP BY request_at. The rate is cancelled ÷ total over the same rows: <code>AVG(CASE WHEN status &lt;&gt; 'completed' THEN 1.0 ELSE 0 END)</code>.</p>`,
      `<p>Hint 3: Restrict dates with BETWEEN, ROUND(…, 2), ORDER BY day. Recipe: trips ⨝ users c (client, unbanned) ⨝ users d (driver, unbanned) → WHERE date range → GROUP BY day → AVG of flag.</p>`
    ],
    tests: { engine: 'sqlite', cases: [
      { cols: ['day', 'cancellation_rate'], rows: [['2025-10-01', 0.5], ['2025-10-02', 0], ['2025-10-03', 0.5]] },
      { setup: 'INSERT INTO trips VALUES (11, 1, 10, \'cancelled_by_client\', \'2025-10-02\');', cols: ['day', 'cancellation_rate'], rows: [['2025-10-01', 0.5], ['2025-10-02', 0.33], ['2025-10-03', 0.5]] },
      { setup: 'INSERT INTO trips VALUES (11, 1, 10, \'cancelled_by_driver\', \'2025-10-02\');INSERT INTO trips VALUES (12, 3, 12, \'completed\', \'2025-10-02\');', cols: ['day', 'cancellation_rate'], rows: [['2025-10-01', 0.5], ['2025-10-02', 0.25], ['2025-10-03', 0.5]] },
      { setup: 'INSERT INTO trips VALUES (11, 1, 10, \'completed\', \'2025-10-04\');INSERT INTO trips VALUES (12, 1, 10, \'cancelled_by_client\', \'2025-09-30\');', cols: ['day', 'cancellation_rate'], rows: [['2025-10-01', 0.5], ['2025-10-02', 0], ['2025-10-03', 0.5]] },
      { setup: 'UPDATE users SET banned = \'No\';', cols: ['day', 'cancellation_rate'], rows: [['2025-10-01', 0.75], ['2025-10-02', 0], ['2025-10-03', 0.33]] },
      { setup: 'UPDATE users SET banned = \'Yes\' WHERE user_id = 3;', cols: ['day', 'cancellation_rate'], rows: [['2025-10-01', 0], ['2025-10-02', 0], ['2025-10-03', 1]] },
      { setup: 'UPDATE trips SET status = \'completed\';', cols: ['day', 'cancellation_rate'], rows: [['2025-10-01', 0], ['2025-10-02', 0], ['2025-10-03', 0]] },
      { setup: 'INSERT INTO trips VALUES (11, 1, 10, \'cancelled_by_client\', \'2025-10-03\');INSERT INTO trips VALUES (12, 3, 11, \'cancelled_by_driver\', \'2025-10-03\');', cols: ['day', 'cancellation_rate'], rows: [['2025-10-01', 0.5], ['2025-10-02', 0], ['2025-10-03', 0.75]] }
    ] },
    solution: {
      approach: `<p>Join users twice (as client and as driver) keeping only unbanned ones, so both parts of the ratio see the same rows. Then a conditional AVG per day produces the rate in one pass. (JOINs are covered in depth next module; here they are just a row filter.)</p>`,
      code: { lang: 'sql', db: 'app', code: `SELECT t.request_at AS day,
       ROUND(AVG(CASE WHEN t.status <> 'completed' THEN 1.0 ELSE 0 END), 2) AS cancellation_rate
FROM trips t
JOIN users c ON c.user_id = t.client_id AND c.banned = 'No'   -- unbanned client
JOIN users d ON d.user_id = t.driver_id AND d.banned = 'No'   -- unbanned driver
WHERE t.request_at BETWEEN '2025-10-01' AND '2025-10-03'
GROUP BY t.request_at
ORDER BY day;` },
      alt: [{ lang: 'sql', db: 'app', title: 'Without joins: IN subquery filter', code: `SELECT request_at AS day,
       ROUND(1.0 * SUM(CASE WHEN status LIKE 'cancelled%' THEN 1 ELSE 0 END) / COUNT(*), 2) AS cancellation_rate
FROM trips
WHERE client_id NOT IN (SELECT user_id FROM users WHERE banned = 'Yes')
  AND driver_id NOT IN (SELECT user_id FROM users WHERE banned = 'Yes')
  AND request_at BETWEEN '2025-10-01' AND '2025-10-03'
GROUP BY request_at
ORDER BY day;` }],
      complexity: `<p>O(T) for trips with hash lookups into users (O(U) build). One aggregation pass.</p>`,
      followUps: ['Also return days with zero eligible trips (calendar table + LEFT JOIN).', 'Separate rates for driver vs client cancellations in the same row.']
    }
  });

  practice.push({
    title: 'Salary Categories Including Empty Ones',
    level: 'Hard', tags: ['CASE', 'UNION ALL', 'zero rows'], companies: ['Amazon', 'Capital One'],
    statement: `<p>For the <b>Sales</b> department in <code>employees</code> (DB <b>company</b>) report how many employees fall into each category: <code>'Low Salary'</code> (&lt; 50000), <code>'Average Salary'</code> (50000–100000 inclusive), <code>'High Salary'</code> (&gt; 100000). <b>All three categories must appear</b>, even with a count of 0. (LeetCode 1907 style.)</p>`,
    constraints: `<p>Output exactly 3 rows: category, employees. NULL salaries belong to no category.</p>`,
    example: `${H.table(['category', 'employees'], [['Low Salary', '<span class="c-y">0</span>'], ['Average Salary', '4'], ['High Salary', '<span class="c-y">0</span>']])}<p>All four Sales salaries (60000, 52000, 58000, 52000) are average. Low and High must still be shown with 0.</p>`,
    brute: {
      why: `<p><code>GROUP BY</code> a CASE label can only produce groups that have at least one row, so the result is <b class="c-r">one row</b> ('Average Salary', 4). The empty categories vanish — GROUP BY never invents groups.</p>`,
      code: { lang: 'sql', db: 'company', code: `SELECT CASE WHEN salary < 50000 THEN 'Low Salary'
            WHEN salary <= 100000 THEN 'Average Salary'
            ELSE 'High Salary' END AS category,
       COUNT(*) AS employees
FROM employees
WHERE dept = 'Sales'
GROUP BY category;      -- missing the zero categories` }
    },
    mcq: { q: 'Why does SELECT \'Low Salary\', SUM(CASE WHEN salary &lt; 50000 THEN 1 ELSE 0 END) FROM employees WHERE dept = \'Sales\' always return a row?', options: ['Because of the CASE', 'An aggregate query without GROUP BY returns exactly one row, even if no row matches', 'Because SUM never returns NULL', 'It does not; it returns no rows when the count is 0'], answer: 1, explain: 'No GROUP BY → one summary row. That property lets each category be its own one-row query; UNION ALL stacks them.' },
    hints: [
      `<p>Hint 1: GROUP BY can't create a group with zero members. You need a construct that always yields a row per category.</p>`,
      `<p>Hint 2: An aggregate query without GROUP BY always yields exactly one row. Write one per category with a conditional SUM and stack them with UNION ALL.</p>`,
      `<p>Hint 3: SUM over an empty input is NULL — wrap in COALESCE(…, 0) in case the department has no rows at all. Alternative: a VALUES list of categories LEFT JOINed to the grouped counts.</p>`
    ],
    tests: { engine: 'sqlite', cmp: 'set', cases: [
      { cols: ['category', 'employees'], rows: [['Low Salary', 0], ['Average Salary', 4], ['High Salary', 0]] },
      { setup: 'INSERT INTO employees (id, name, dept, salary, email) VALUES (13, \'A\', \'Sales\', 49999, NULL);INSERT INTO employees (id, name, dept, salary, email) VALUES (14, \'B\', \'Sales\', 50000, NULL);INSERT INTO employees (id, name, dept, salary, email) VALUES (15, \'C\', \'Sales\', 100000, NULL);INSERT INTO employees (id, name, dept, salary, email) VALUES (16, \'D\', \'Sales\', 100001, NULL);INSERT INTO employees (id, name, dept, salary, email) VALUES (17, \'E\', \'Sales\', NULL, NULL);', cols: ['category', 'employees'], rows: [['Low Salary', 1], ['Average Salary', 6], ['High Salary', 1]] },
      { setup: 'DELETE FROM employees WHERE dept = \'Sales\';', cols: ['category', 'employees'], rows: [['Low Salary', 0], ['Average Salary', 0], ['High Salary', 0]] },
      { setup: 'UPDATE employees SET salary = 200000 WHERE dept = \'Sales\';', cols: ['category', 'employees'], rows: [['Low Salary', 0], ['Average Salary', 0], ['High Salary', 4]] },
      { setup: 'UPDATE employees SET salary = 10 WHERE dept = \'Sales\';', cols: ['category', 'employees'], rows: [['Low Salary', 4], ['Average Salary', 0], ['High Salary', 0]] },
      { setup: 'UPDATE employees SET salary = NULL WHERE dept = \'Sales\';', cols: ['category', 'employees'], rows: [['Low Salary', 0], ['Average Salary', 0], ['High Salary', 0]] },
      { setup: 'UPDATE employees SET dept = \'Sales\' WHERE dept = \'HR\'; UPDATE employees SET salary = 20 WHERE id = 8;', cols: ['category', 'employees'], rows: [['Low Salary', 2], ['Average Salary', 4], ['High Salary', 0]] }
    ] },
    solution: {
      approach: `<p>Three single-row aggregate queries (each counting its own category with SUM(CASE)) glued with UNION ALL. Each always returns one row, so every category appears with its count or 0.</p>`,
      code: { lang: 'sql', db: 'company', code: `SELECT 'Low Salary' AS category,
       COALESCE(SUM(CASE WHEN salary < 50000 THEN 1 ELSE 0 END), 0) AS employees
FROM employees WHERE dept = 'Sales'
UNION ALL
SELECT 'Average Salary',
       COALESCE(SUM(CASE WHEN salary BETWEEN 50000 AND 100000 THEN 1 ELSE 0 END), 0)
FROM employees WHERE dept = 'Sales'
UNION ALL
SELECT 'High Salary',
       COALESCE(SUM(CASE WHEN salary > 100000 THEN 1 ELSE 0 END), 0)
FROM employees WHERE dept = 'Sales';` },
      alt: [{ lang: 'sql', db: 'company', title: 'Category list + LEFT JOIN (one scan of employees)', code: `WITH cats(category, ord) AS (VALUES ('Low Salary', 1), ('Average Salary', 2), ('High Salary', 3)),
     counted AS (
       SELECT CASE WHEN salary < 50000 THEN 'Low Salary'
                   WHEN salary <= 100000 THEN 'Average Salary'
                   ELSE 'High Salary' END AS category,
              COUNT(*) AS n
       FROM employees
       WHERE dept = 'Sales' AND salary IS NOT NULL
       GROUP BY 1)
SELECT cats.category, COALESCE(counted.n, 0) AS employees
FROM cats LEFT JOIN counted ON counted.category = cats.category
ORDER BY cats.ord;` }],
      complexity: `<p>UNION ALL version: 3 scans (fine for small tables). LEFT JOIN version: 1 scan + a tiny join.</p>`,
      followUps: ['Run it for every department at once with all categories per department (cross join departments × categories).', 'Move the band boundaries into a table.']
    }
  });

  practice.push({
    title: 'Customers Who Bought From Every Category',
    level: 'Hard', tags: ['relational division', 'COUNT DISTINCT', 'HAVING'], companies: ['Amazon', 'Instacart'],
    statement: `<p>Return the <code>name</code> of customers (DB <b>shop</b>) who have ordered at least one product from <b>every</b> category in <code>products</code> (any order status), together with the number of distinct categories they bought from as <code>categories</code>. (LeetCode 1045 style.) Tables: customers, orders, order_items, products.</p>`,
    constraints: `<p>The set of categories can change — don't hard-code 4.</p>`,
    example: `${H.table(['name', 'categories'], [['<span class="c-g">Aarav</span>', '4']])}<p>Aarav bought Electronics (laptop), Sports (football, yoga mat), Books (cookbook, novel) and Home (desk lamp). Bella has Electronics, Books, Sports — no Home.</p>`,
    brute: {
      why: `<p><code>HAVING COUNT(*) &gt;= 4</code> counts <b>item rows</b>, not categories. Bella bought 5 items from 3 categories and wrongly qualifies; buying four novels would also "complete" the set. Hard-coding 4 also breaks when a category is added.</p>`,
      code: { lang: 'sql', db: 'shop', code: `SELECT c.name, COUNT(*) AS items
FROM customers c
JOIN orders o       ON o.customer_id = c.id
JOIN order_items oi ON oi.order_id = o.id
JOIN products p     ON p.id = oi.product_id
GROUP BY c.id, c.name
HAVING COUNT(*) >= 4;      -- counts items, not distinct categories` }
    },
    mcq: { q: 'What is the core test for "bought from every category"?', options: ['COUNT(*) = number of products', 'COUNT(DISTINCT category) per customer = COUNT(DISTINCT category) in products', 'MAX(category) = MIN(category)', 'SUM(qty) &gt;= 4'], answer: 1, explain: 'Relational division: a customer covers the set when the number of distinct categories they touched equals the size of the whole set.' },
    hints: [
      `<p>Hint 1: Get one row per (customer, purchased item) by joining orders → order_items → products.</p>`,
      `<p>Hint 2: Per customer, count <b>distinct</b> categories.</p>`,
      `<p>Hint 3: Compare in HAVING with a scalar subquery <code>(SELECT COUNT(DISTINCT category) FROM products)</code>.</p>`
    ],
    tests: { engine: 'sqlite', cmp: 'set', cases: [
      { cols: ['name', 'categories'], rows: [['Aarav', 4]] },
      { setup: 'INSERT INTO order_items VALUES (2, 7, 1);', cols: ['name', 'categories'], rows: [['Aarav', 4], ['Bella', 4]] },
      { setup: 'INSERT INTO products VALUES (8, \'Toy\', \'Toys\', 5);', rows: [] },
      { setup: 'DELETE FROM products WHERE category = \'Home\';', cols: ['name', 'categories'], rows: [['Aarav', 3], ['Bella', 3]] },
      { setup: 'DELETE FROM order_items;', rows: [] },
      { setup: 'UPDATE orders SET status = \'cancelled\'; INSERT INTO order_items VALUES (7, 7, 1), (7, 3, 1), (7, 5, 1);', cols: ['name', 'categories'], rows: [['Aarav', 4], ['Emma', 4]] },
      { setup: 'DELETE FROM products WHERE category <> \'Electronics\';', cols: ['name', 'categories'], rows: [['Aarav', 1], ['Bella', 1], ['Deepa', 1], ['Emma', 1]] },
      { setup: 'DELETE FROM orders WHERE customer_id = 1;', rows: [] }
    ] },
    solution: {
      approach: `<p>Relational division by counting: join to reach the category of each purchased item, group by customer, and require the distinct-category count to equal the total number of categories.</p>`,
      code: { lang: 'sql', db: 'shop', code: `SELECT c.name, COUNT(DISTINCT p.category) AS categories
FROM customers c
JOIN orders o       ON o.customer_id = c.id
JOIN order_items oi ON oi.order_id = o.id
JOIN products p     ON p.id = oi.product_id
GROUP BY c.id, c.name
HAVING COUNT(DISTINCT p.category) = (SELECT COUNT(DISTINCT category) FROM products);` },
      complexity: `<p>O(items) join + aggregation; distinct-category sets per customer are tiny.</p>`,
      followUps: ['Only count delivered orders.', 'Solve with double NOT EXISTS ("there is no category the customer did not buy").', 'Which category is each near-miss customer missing?']
    }
  });

  practice.push({
    title: 'Game Play Analysis: Next-Day Retention',
    level: 'Hard', tags: ['MIN', 'derived table', 'ratio'], companies: ['GSN Games', 'Zynga', 'Dream11'],
    statement: `<p>From <code>activity</code> (DB <b>app</b>), compute the fraction of players who logged in again on the day <b>right after their first login</b>, rounded to 2 decimals, as <code>fraction</code>. (LeetCode 550.)</p>`,
    constraints: `<p>(player_id, event_date) is unique. Dates are ISO text; use <code>date(d, '+1 day')</code> in SQLite.</p>`,
    example: `${H.table(['fraction'], [['0.5']])}<p>First logins: player 1 (03-01, back 03-02 ✔), player 2 (06-25, next login 06-27 ✘), player 3 (03-02 ✘), player 4 (05-10, back 05-11 ✔) → 2 of 4.</p>`,
    brute: {
      why: `<p>Checking for <i>any</i> two consecutive days counts player 2 (06-27 → 06-28) even though that is not the day after their <b>first</b> login → <b class="c-r">0.75</b>. The question anchors on the first-login date, which is a per-player MIN — an aggregate you need before the check.</p>`,
      code: { lang: 'sql', db: 'app', code: `-- Wrong: any consecutive pair, not "day after first login"
SELECT ROUND(1.0 * COUNT(DISTINCT a.player_id) /
             (SELECT COUNT(DISTINCT player_id) FROM activity), 2) AS fraction
FROM activity a
JOIN activity b ON b.player_id = a.player_id
               AND b.event_date = date(a.event_date, '+1 day');` }
    },
    mcq: { q: 'What gives each player\'s first login date?', options: ['SELECT player_id, event_date FROM activity ORDER BY event_date LIMIT 1', 'SELECT player_id, MIN(event_date) FROM activity GROUP BY player_id', 'SELECT DISTINCT player_id, event_date FROM activity', 'SELECT MIN(player_id), event_date FROM activity'], answer: 1, explain: 'MIN per group gives one first-login row per player. LIMIT 1 gives one row for the whole table.' },
    hints: [
      `<p>Hint 1: Step 1 is an aggregate: first_login = MIN(event_date) per player (a derived table).</p>`,
      `<p>Hint 2: Join that back to activity and flag rows where event_date = date(first_login, '+1 day').</p>`,
      `<p>Hint 3: fraction = flagged players ÷ all players: <code>1.0 * SUM(flag) / COUNT(DISTINCT player_id)</code>, ROUND to 2.</p>`
    ],
    tests: { engine: 'sqlite', cases: [
      { cols: ['fraction'], rows: [[0.5]] },
      { setup: 'INSERT INTO activity VALUES (5, 1, \'2025-03-31\', 1);INSERT INTO activity VALUES (5, 1, \'2025-04-01\', 1);', cols: ['fraction'], rows: [[0.6]] },
      { setup: 'INSERT INTO activity VALUES (5, 1, \'2024-02-28\', 1);INSERT INTO activity VALUES (5, 1, \'2024-02-29\', 1);', cols: ['fraction'], rows: [[0.6]] },
      { setup: 'DELETE FROM activity WHERE player_id IN (1, 4);', cols: ['fraction'], rows: [[0]] },
      { setup: 'INSERT INTO activity VALUES (5, 1, \'2025-01-01\', 1);INSERT INTO activity VALUES (5, 1, \'2025-01-03\', 1);INSERT INTO activity VALUES (5, 1, \'2025-01-02\', 1);', cols: ['fraction'], rows: [[0.6]] },
      { setup: 'INSERT INTO activity VALUES (5, 1, \'2025-01-01\', 1);INSERT INTO activity VALUES (5, 1, \'2025-01-03\', 1);INSERT INTO activity VALUES (5, 1, \'2025-01-04\', 1);', cols: ['fraction'], rows: [[0.4]] },
      { setup: 'DELETE FROM activity WHERE player_id IN (2, 3);', cols: ['fraction'], rows: [[1]] },
      { setup: 'INSERT INTO activity VALUES (5, 1, \'2025-12-31\', 1);INSERT INTO activity VALUES (5, 1, \'2026-01-01\', 1);INSERT INTO activity VALUES (6, 1, \'2025-12-31\', 1);', cols: ['fraction'], rows: [[0.5]] }
    ] },
    solution: {
      approach: `<p>Aggregate twice: first MIN per player to find the anchor date, then a conditional SUM over the joined rows divided by the number of players.</p>`,
      code: { lang: 'sql', db: 'app', code: `SELECT ROUND(1.0 * SUM(CASE WHEN a.event_date = date(f.first_login, '+1 day') THEN 1 ELSE 0 END)
             / COUNT(DISTINCT f.player_id), 2) AS fraction
FROM (SELECT player_id, MIN(event_date) AS first_login
      FROM activity
      GROUP BY player_id) AS f
JOIN activity a ON a.player_id = f.player_id;` },
      complexity: `<p>Two passes over activity (one for MIN, one for the join), O(N) with hashing; an index on (player_id, event_date) makes the MIN and the lookup cheap.</p>`,
      followUps: ['Day-7 retention per signup cohort month.', 'Rewrite with a CTE and with window functions (FIRST_VALUE / MIN OVER).']
    }
  });

  practice.push({
    title: 'Loyal in Both March and April',
    level: 'Hard', tags: ['conditional aggregation', 'HAVING', 'each period'], companies: ['Amazon', 'Myntra'],
    statement: `<p>Return the <code>name</code> of customers (DB <b>shop</b>) who spent <b>at least 50 in March 2024 AND at least 50 in April 2024</b> on delivered orders, with the March and April totals. (LeetCode 1511 "Customer Order Frequency" style.)</p>`,
    constraints: `<p>Each month must independently reach the threshold.</p>`,
    example: `${H.table(['name', 'march', 'april'], [['<span class="c-g">Aarav</span>', '50', '55']])}<p>Emma spent 1020 in March but nothing delivered in April; Deepa 900 in March only. Aarav is the only one above 50 in both.</p>`,
    brute: {
      why: `<p>Filtering to March–April and requiring <code>SUM(amount) &gt;= 50</code> checks the <b>combined</b> total, so Emma (1020 + 0) and Deepa (900 + 0) wrongly qualify. Each month needs its own total — two conditional SUMs in HAVING.</p>`,
      code: { lang: 'sql', db: 'shop', code: `SELECT customer_id, SUM(amount) AS spend
FROM orders
WHERE status = 'delivered'
  AND order_date BETWEEN '2024-03-01' AND '2024-04-30'
GROUP BY customer_id
HAVING SUM(amount) >= 50;    -- combined total: returns 1, 4, 5` }
    },
    mcq: { q: 'How do you require a per-month threshold for two months in one GROUP BY customer query?', options: ['Two WHERE conditions joined with AND', 'HAVING SUM(CASE WHEN march THEN amount ELSE 0 END) >= 50 AND SUM(CASE WHEN april THEN amount ELSE 0 END) >= 50', 'GROUP BY customer, month HAVING SUM(amount) >= 50', 'HAVING COUNT(DISTINCT month) = 2'], answer: 1, explain: 'Conditional SUMs compute each month\'s total inside the customer group; HAVING then checks both. Grouping by month (option 3) checks each month separately but cannot require both at once.' },
    hints: [
      `<p>Hint 1: You need two different totals per customer in the same row.</p>`,
      `<p>Hint 2: Conditional aggregation: <code>SUM(CASE WHEN order_date LIKE '2024-03%' THEN amount ELSE 0 END)</code> and the same for April.</p>`,
      `<p>Hint 3: Put both conditions in HAVING (joined with AND); join customers for names; WHERE status = 'delivered'.</p>`
    ],
    tests: { engine: 'sqlite', cmp: 'set', cases: [
      { cols: ['name', 'march', 'april'], rows: [['Aarav', 50, 55]] },
      { setup: 'INSERT INTO orders (id, customer_id, order_date, status, amount) VALUES (15, 4, \'2024-04-10\', \'delivered\', 50);INSERT INTO orders (id, customer_id, order_date, status, amount) VALUES (16, 5, \'2024-04-11\', \'delivered\', 49);', cols: ['name', 'march', 'april'], rows: [['Aarav', 50, 55], ['Deepa', 900, 50]] },
      { setup: 'INSERT INTO orders (id, customer_id, order_date, status, amount) VALUES (15, 2, \'2024-03-10\', \'delivered\', 25);INSERT INTO orders (id, customer_id, order_date, status, amount) VALUES (16, 2, \'2024-03-11\', \'delivered\', 25);', cols: ['name', 'march', 'april'], rows: [['Aarav', 50, 55]] },
      { setup: 'INSERT INTO orders (id, customer_id, order_date, status, amount) VALUES (15, 4, \'2024-04-10\', \'cancelled\', 500);', cols: ['name', 'march', 'april'], rows: [['Aarav', 50, 55]] },
      { setup: 'INSERT INTO orders (id, customer_id, order_date, status, amount) VALUES (15, 4, \'2023-04-10\', \'delivered\', 500);INSERT INTO orders (id, customer_id, order_date, status, amount) VALUES (16, 5, \'2025-04-10\', \'delivered\', 500);', cols: ['name', 'march', 'april'], rows: [['Aarav', 50, 55]] },
      { setup: 'INSERT INTO orders (id, customer_id, order_date, status, amount) VALUES (15, 3, \'2024-03-10\', \'delivered\', 60);INSERT INTO orders (id, customer_id, order_date, status, amount) VALUES (16, 3, \'2024-04-20\', \'delivered\', 60);', cols: ['name', 'march', 'april'], rows: [['Aarav', 50, 55], ['Carlos', 60, 60]] },
      { setup: 'UPDATE orders SET amount = NULL WHERE customer_id = 1;', rows: [] },
      { setup: 'UPDATE orders SET status = \'delivered\';', cols: ['name', 'march', 'april'], rows: [['Aarav', 50, 55], ['Emma', 1020, 120]] }
    ] },
    solution: {
      approach: `<p>Group per customer, compute each month's total with a CASE-filtered SUM, and require both in HAVING. The same pattern scales to "every month of the quarter".</p>`,
      code: { lang: 'sql', db: 'shop', code: `SELECT c.name,
       SUM(CASE WHEN o.order_date LIKE '2024-03%' THEN o.amount ELSE 0 END) AS march,
       SUM(CASE WHEN o.order_date LIKE '2024-04%' THEN o.amount ELSE 0 END) AS april
FROM customers c
JOIN orders o ON o.customer_id = c.id
WHERE o.status = 'delivered'
GROUP BY c.id, c.name
HAVING SUM(CASE WHEN o.order_date LIKE '2024-03%' THEN o.amount ELSE 0 END) >= 50
   AND SUM(CASE WHEN o.order_date LIKE '2024-04%' THEN o.amount ELSE 0 END) >= 50;` },
      complexity: `<p>One scan of orders (plus the join), O(N); two accumulators per customer.</p>`,
      followUps: ['Customers active in every month of Q1 (COUNT(DISTINCT month) = 3).', 'Customers whose April spend dropped more than 50% versus March.']
    }
  });

  /* =====================================================================
     QUIZ
     ===================================================================== */
  quiz.push(
    { q: 'A column has values 10, NULL, 20. What does AVG(col) return?', options: ['10', '15', 'NULL', '30'], answer: 1, explain: 'AVG skips NULL: (10 + 20) / 2 = 15. Treating NULL as 0 would give 10.' },
    { q: 'SELECT SUM(amount) FROM orders WHERE 1 = 0 returns…', options: ['No rows', 'One row with 0', 'One row with NULL', 'An error'], answer: 2, explain: 'Without GROUP BY there is always one result row; SUM over an empty set is NULL. COUNT would return 0.' },
    { q: 'customers has 6 rows; 2 have a NULL phone; 2 share the same phone. What is COUNT(DISTINCT phone)?', options: ['6', '4', '3', '2'], answer: 2, explain: 'COUNT(DISTINCT) ignores NULLs (4 non-NULL values remain) and counts the shared phone once → 3.' },
    { q: 'Which query is rejected by PostgreSQL but accepted by SQLite?', options: ['SELECT dept, COUNT(*) FROM e GROUP BY dept', 'SELECT dept, name, COUNT(*) FROM e GROUP BY dept', 'SELECT COUNT(*) FROM e', 'SELECT dept FROM e GROUP BY dept HAVING COUNT(*) > 1'], answer: 1, explain: 'name is neither grouped nor aggregated. PostgreSQL raises an error; SQLite returns an arbitrary name from each group.' },
    { q: 'In which clause can you NOT use COUNT(*)?', options: ['SELECT', 'HAVING', 'ORDER BY', 'WHERE'], answer: 3, explain: 'WHERE is evaluated per row before grouping, so aggregates don\'t exist yet ("misuse of aggregate").' },
    { q: 'GROUP BY dept on a table where 3 rows have dept NULL produces…', options: ['3 separate NULL groups', 'One NULL group with 3 rows', 'No group for them — NULL rows are dropped', 'An error'], answer: 1, explain: 'GROUP BY (like DISTINCT) treats NULLs as equal, so they form one group.' },
    { q: 'CASE WHEN x >= 10 THEN \'a\' WHEN x >= 20 THEN \'b\' ELSE \'c\' END for x = 25 returns…', options: ['a', 'b', 'c', 'NULL'], answer: 0, explain: 'The first TRUE branch wins: 25 >= 10 is TRUE, so \'a\'. The \'b\' branch can never fire — put higher thresholds first.' },
    { q: 'What does CASE score WHEN NULL THEN \'absent\' ELSE \'present\' END return when score is NULL?', options: ['absent', 'present', 'NULL', 'error'], answer: 1, explain: 'The simple form compares score = NULL, which is UNKNOWN, never TRUE. Use CASE WHEN score IS NULL.' },
    { q: 'COUNT(CASE WHEN status = \'cancelled\' THEN 1 ELSE 0 END) over 14 orders with 2 cancelled returns…', options: ['2', '12', '14', '0'], answer: 2, explain: '0 is not NULL, so COUNT counts every row. Use SUM(... ELSE 0) or COUNT(CASE ... THEN 1 END) without ELSE.' },
    { q: 'NULLIF(clicks, 0) when clicks = 0 returns…', options: ['0', 'NULL', '1', 'An error'], answer: 1, explain: 'NULLIF(a, b) returns NULL when a = b — perfect as a denominator guard: x / NULL = NULL instead of a division-by-zero error.' },
    { q: 'COALESCE(NULL, NULL, \'x\', \'y\') returns…', options: ['NULL', 'x', 'y', 'xy'], answer: 1, explain: 'COALESCE returns the first non-NULL argument, scanning left to right.' },
    { q: 'bonus is non-NULL for 6 of 12 employees totalling 43000. AVG(COALESCE(bonus, 0)) is…', options: ['7166.67', '3583.33', '43000', 'NULL'], answer: 1, explain: 'COALESCE turns the 6 NULLs into 0, so the average is over 12 rows: 43000 / 12 = 3583.33. AVG(bonus) would be 43000 / 6.' },
    { q: 'In SQLite, SELECT 7 / 2 returns…', options: ['3.5', '3', '4', 'NULL'], answer: 1, explain: 'Integer ÷ integer is integer division (truncated). Write 7.0 / 2 or 1.0 * 7 / 2 for 3.5.' },
    { q: 'Which is the correct logical processing order?', options: ['SELECT → FROM → WHERE → GROUP BY', 'FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY', 'FROM → GROUP BY → WHERE → SELECT → HAVING', 'WHERE → FROM → SELECT → GROUP BY'], answer: 1, explain: 'Rows are produced (FROM), filtered (WHERE), grouped, groups filtered (HAVING), projected (SELECT), then sorted.' }
  );

  /* =====================================================================
     INTERVIEW Q&A
     ===================================================================== */
  interview.push(
    { q: 'What is the difference between COUNT(*), COUNT(col) and COUNT(DISTINCT col)?', level: 'B',
      a: `<p><b>COUNT(*)</b> counts rows, including rows full of NULLs. <b>COUNT(col)</b> counts rows where col is not NULL. <b>COUNT(DISTINCT col)</b> counts different non-NULL values. On our customers table: 6 rows, 4 phones, 4 countries. Practical uses: COUNT(*) for "how many orders", COUNT(DISTINCT customer_id) for "how many buyers", COUNT(*) − COUNT(col) for "how many missing". COUNT(1) is identical to COUNT(*) in every modern engine.</p>`,
      followUps: ['How would you count distinct pairs of columns in SQLite?', 'Why can COUNT(DISTINCT) be expensive on billions of rows, and what is HyperLogLog?'] },
    { q: 'Explain WHERE vs HAVING with an example.', level: 'B',
      a: `<p>WHERE filters <b>rows</b> before grouping and cannot use aggregates; HAVING filters <b>groups</b> after GROUP BY and can. "Departments with at least 2 employees earning 50k+": <code>WHERE salary &gt;= 50000</code> removes low earners row by row, <code>GROUP BY dept</code> buckets the rest, <code>HAVING COUNT(*) &gt;= 2</code> removes small buckets. Non-aggregate conditions belong in WHERE even if HAVING would accept them, because filtering early shrinks the work.</p>`,
      followUps: ['Can you use HAVING without GROUP BY?', 'Can you reference a SELECT alias in HAVING? Does it depend on the database?'] },
    { q: 'What is the logical order of SQL clause evaluation, and why does it matter?', level: 'B',
      a: `<p>FROM/JOIN → WHERE → GROUP BY → HAVING → SELECT → DISTINCT → ORDER BY → LIMIT. It explains classic errors: aggregates are illegal in WHERE (they don't exist yet), SELECT aliases aren't visible in WHERE (they're created later), but ORDER BY can use aliases (it runs after SELECT). It is a model of meaning — the optimizer may physically reorder work (push filters down, use indexes) as long as the result is the same.</p>`,
      followUps: ['Where do window functions fit in this order?', 'Why does SQLite let you use an alias in WHERE while PostgreSQL does not?'] },
    { q: 'What is the GROUP BY "golden rule", and what happens in SQLite or old MySQL if you break it?', level: 'I',
      a: `<p>Every SELECT column must be in GROUP BY or inside an aggregate (or functionally dependent on the grouping key, e.g. grouping by a primary key). PostgreSQL, SQL Server, Oracle and MySQL 5.7+ (ONLY_FULL_GROUP_BY) reject violations. SQLite and old MySQL return a value from an arbitrary row of the group — it looks plausible and is silently wrong. SQLite's only documented exception: with a single MIN() or MAX(), bare columns come from the min/max row. To get "the employee with the top salary per department", use a window function or join back to the per-group MAX.</p>`,
      followUps: ['What is functional dependency and how does PostgreSQL use it?', 'Write "top earner per department" without window functions.'] },
    { q: 'How do aggregate functions handle NULLs, and how do you make SUM return 0 for empty groups?', level: 'B',
      a: `<p>SUM, AVG, MIN, MAX and COUNT(col) ignore NULLs; COUNT(*) counts rows. Over an empty set (or all-NULL values) COUNT returns 0 but SUM/AVG/MIN/MAX return NULL. So <code>COALESCE(SUM(amount), 0)</code> is the standard fix. Beware the difference between <code>AVG(x)</code> (ignore missing) and <code>AVG(COALESCE(x, 0))</code> (missing counts as 0) — they answer different business questions, so confirm which is meant.</p>`,
      followUps: ['Is SUM(COALESCE(x,0)) ever different from COALESCE(SUM(x),0)?', 'What does SQLite\'s TOTAL() do?'] },
    { q: 'What is conditional aggregation? Give two examples.', level: 'I',
      a: `<p>Putting a CASE (or FILTER clause) inside an aggregate so one pass computes several differently-filtered metrics. Examples: approval stats <code>SUM(CASE WHEN state = 'approved' THEN amount ELSE 0 END)</code> next to <code>SUM(amount)</code>; pivots <code>MAX(CASE WHEN subject = 'Math' THEN score END) AS math</code>. Benefits: one scan instead of many queries, and numerator/denominator of a ratio guaranteed to use the same rows. Standard alternative: <code>COUNT(*) FILTER (WHERE …)</code> in PostgreSQL and SQLite 3.30+.</p>`,
      followUps: ['Why is COUNT(CASE WHEN x THEN 1 ELSE 0 END) a bug?', 'How would you pivot when the set of columns is not known in advance?'] },
    { q: 'How do you pivot rows into columns in SQL?', level: 'I',
      a: `<p>GROUP BY the row label, then one conditional aggregate per output column: <code>SUM(CASE WHEN month = 'Jan' THEN amount ELSE 0 END) AS jan</code>, etc. Use <code>ELSE 0</code> for additive measures where "no data" means zero, and no ELSE with MAX/MIN for single facts (a missing exam should be NULL, not 0). Dialects add helpers (SQL Server/Snowflake/BigQuery <code>PIVOT</code>, PostgreSQL <code>crosstab</code>), but CASE works everywhere. Unpivot = UNION ALL of one SELECT per column, or <code>UNPIVOT</code>/<code>LATERAL VALUES</code>.</p>`,
      followUps: ['How would you detect duplicates that a MAX(CASE) pivot would hide?', 'When should pivoting be done in the BI tool instead of SQL?'] },
    { q: 'What are the pitfalls of CASE expressions?', level: 'I',
      a: `<p>(1) First TRUE wins — overlapping ranges must go from most to least specific, or later branches never fire. (2) No ELSE → NULL. (3) <code>CASE col WHEN NULL</code> never matches; use <code>WHEN col IS NULL</code>. (4) Boundary gaps/overlaps (&lt; 100 vs &gt; 100 leaves 100 out). (5) Mixed THEN types error in PostgreSQL. (6) CASE in WHERE or GROUP BY prevents index use — consider a generated column. (7) Large, changing mappings belong in a lookup table, not a hard-coded ladder.</p>`,
      followUps: ['Is CASE guaranteed to short-circuit?', 'How would you test a CASE ladder for boundary bugs?'] },
    { q: 'How do you avoid division-by-zero errors in SQL, and how do engines differ?', level: 'I',
      a: `<p>Wrap the denominator: <code>x / NULLIF(y, 0)</code>. NULLIF returns NULL when y = 0, and anything divided by NULL is NULL, so the row gets NULL instead of the whole query failing. PostgreSQL, SQL Server and Oracle raise an error on ÷0; MySQL and SQLite return NULL; BigQuery offers SAFE_DIVIDE, Snowflake DIV0NULL. Then decide deliberately whether to show NULL ("undefined") or COALESCE it to 0. Also force decimal arithmetic (<code>1.0 *</code> or CAST) to avoid integer division.</p>`,
      followUps: ['Why is a CASE WHEN y = 0 guard sometimes not enough?', 'What does integer division do to percentages?'] },
    { q: 'Find the second highest salary, returning NULL if it does not exist.', level: 'I',
      a: `<p><code>SELECT MAX(salary) AS second FROM employees WHERE salary &lt; (SELECT MAX(salary) FROM employees);</code> It handles ties automatically (strictly below the top) and returns one NULL row when nothing qualifies, because an aggregate without GROUP BY always yields one row. <code>ORDER BY salary DESC LIMIT 1 OFFSET 1</code> fails on ties (needs DISTINCT) and returns zero rows when empty unless wrapped in a scalar subquery. For the Nth highest, use DENSE_RANK.</p>`,
      followUps: ['Generalise to the Nth highest per department.', 'What index makes this fast?'] },
    { q: 'Average of ratios vs ratio of averages/totals — which is right for a conversion rate?', level: 'A',
      a: `<p>For an overall rate, use the <b>ratio of totals</b>: <code>SUM(signups) / SUM(visits)</code>. <code>AVG(signups / visits)</code> gives every day/campaign equal weight regardless of size, so a day with 2 visits and 1 signup (50%) counts as much as a day with 900 visits (10%) — giving 30% instead of the true ~10.1%. Averaging ratios is correct only when the metric is defined per item (e.g. LeetCode "query quality" = average of rating/position). This is Simpson's-paradox territory; always ask what the denominator population is.</p>`,
      followUps: ['How would you compute a weighted average in SQL?', 'Give a case where averaging ratios is the right definition.'] },
    { q: 'How is GROUP BY executed internally, and how can indexes help?', level: 'A',
      a: `<p>Two strategies: <b>hash aggregation</b> (hash table key → accumulators, O(N), memory proportional to groups, spills to disk when too big) and <b>sort/stream aggregation</b> (sort by key or read an index in key order, then close a group when the key changes). An index on the grouping columns lets the engine skip the sort; an index on (dept, salary) can answer MAX(salary) per dept by reading one entry per group (loose index scan). Aggregates like SUM/COUNT/AVG are mergeable, so distributed engines compute partial aggregates per node and combine them; exact median and COUNT(DISTINCT) are not, hence approximate sketches.</p>`,
      followUps: ['What does "USE TEMP B-TREE FOR GROUP BY" in SQLite\'s EXPLAIN QUERY PLAN mean?', 'Why can\'t a median be computed with partial aggregates?'] },
    { q: 'Why can JOINs inflate aggregates, and how do you prevent it?', level: 'A',
      a: `<p>A one-to-many join repeats the "one" side per matching row: customers ⨝ orders ⨝ order_items gives one row per item, so <code>SUM(o.amount)</code> adds each order's amount once per item and <code>COUNT(*)</code> counts items, not customers. Fixes: aggregate each child table to the parent grain <b>before</b> joining (subquery/CTE), use <code>COUNT(DISTINCT id)</code> for counts, and always state the grain of every table. This "fan-out" is the most common source of wrong dashboard numbers.</p>`,
      followUps: ['Does SUM(DISTINCT amount) fix it?', 'How would you write a test that detects fan-out?'] },
    { q: 'Using AI to write aggregate queries: what do you trust and what do you verify?', level: 'E',
      a: `<p>Trust the boilerplate: GROUP BY skeletons, repetitive pivot columns, syntax across dialects. Verify the semantics: the grain (rows vs entities), COUNT(*) vs COUNT(DISTINCT), NULL handling (AVG skip vs COALESCE to 0), ELSE 0 vs NULL, integer division, numerator/denominator on the same population, WHERE vs HAVING for "customers whose total…", dialect support (FILTER, aliases in HAVING, ÷0 behaviour), and fan-out after joins. My workflow: give the model the schema and grain, ask for edge-case test rows (NULLs, zeros, duplicates, empty groups), run both the AI query and a hand-written check, and compare totals.</p>`,
      followUps: ['What reconciliation query would you run to sanity-check a pivot?', 'How do you review an AI-generated query for portability to PostgreSQL?'] }
  );

  registerModule({
    id: 'sql03',
    title: 'Aggregates, GROUP BY, HAVING & CASE',
    intro: `<p>So far you have pulled individual rows out of a table. Real questions are rarely about one row: <i>"How much did we sell per month?"</i>, <i>"Which departments have more than 3 people?"</i>, <i>"What percentage of trips were cancelled each day?"</i>. This module teaches the tools that squash many rows into answers: the five <b>aggregate functions</b>, the three flavours of <b>COUNT</b>, <b>GROUP BY</b> buckets and their rules, <b>HAVING</b> vs WHERE, <b>CASE</b> expressions, <b>conditional aggregation</b> (pivots and rates in one pass) and the NULL-tamers <b>COALESCE</b> and <b>NULLIF</b>.</p>
      <p>Every query runs live (▶ Run) against four small, realistic databases — <b>company</b>, <b>shop</b>, <b>school</b> and <b>app</b> — that deliberately contain NULLs, duplicates, zero denominators and empty groups, because that is where interview questions (and production bugs) live. Visualizers show rows dropping into buckets, accumulators updating, HAVING removing groups and CASE ladders firing.</p>`,
    goals: [
      'Use COUNT, SUM, AVG, MIN and MAX correctly, predicting exactly how each treats NULLs and empty inputs.',
      'Choose between COUNT(*), COUNT(col) and COUNT(DISTINCT col) from the wording of a question.',
      'Write GROUP BY queries on columns and expressions that respect the golden rule and handle NULL groups.',
      'Place each condition correctly in WHERE or HAVING using the logical processing order.',
      'Write CASE expressions for labels, bands, custom sorts and updates without branch-order or NULL bugs.',
      'Solve classic interview problems with conditional aggregation: pivots, approval counts, cancellation rates, "every category".',
      'Use COALESCE and NULLIF to produce honest defaults and crash-free ratios across SQLite, PostgreSQL and MySQL.'
    ],
    prereqs: `<p>SQL module 2 (SELECT, WHERE, ORDER BY, LIMIT & NULLs) — especially three-valued logic. A few Hard problems use a simple JOIN, previewing module 4.</p>`,
    hours: 9,
    databases: { company: DB_COMPANY, shop: DB_SHOP, school: DB_SCHOOL, app: DB_APP },
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
