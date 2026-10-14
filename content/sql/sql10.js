(function () {
  var topics = [], practice = [], quiz = [], interview = [];

  /* ---------------- sample databases (SQLite dialect) ----------------
     shop: 2,000 customers, 500 products, 20,000 orders, generated deterministically with recursive CTEs.
     It deliberately has NO secondary indexes - only the INTEGER PRIMARY KEYs (rowid B+trees).
     Every snippet starts from this fresh copy, so each one creates the indexes it needs. */
  var DB_SHOP = `
CREATE TABLE customers (
  id          INTEGER PRIMARY KEY,
  email       TEXT NOT NULL,
  first_name  TEXT NOT NULL,
  last_name   TEXT NOT NULL,
  country     TEXT NOT NULL,
  city        TEXT NOT NULL,
  is_vip      INTEGER NOT NULL DEFAULT 0,
  signup_date TEXT NOT NULL
);
CREATE TABLE products (
  id          INTEGER PRIMARY KEY,
  sku         TEXT NOT NULL,
  name        TEXT NOT NULL,
  category    TEXT NOT NULL,
  price_cents INTEGER NOT NULL
);
CREATE TABLE orders (
  id          INTEGER PRIMARY KEY,
  customer_id INTEGER NOT NULL,
  product_id  INTEGER NOT NULL,
  status      TEXT NOT NULL,
  total_cents INTEGER NOT NULL,
  created_at  TEXT NOT NULL
);
INSERT INTO customers
WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM n WHERE i < 2000)
SELECT i,
  'user' || i || '@mail.com',
  CASE i % 8 WHEN 0 THEN 'Asha' WHEN 1 THEN 'Ben' WHEN 2 THEN 'Chen' WHEN 3 THEN 'Dara' WHEN 4 THEN 'Eve' WHEN 5 THEN 'Farah' WHEN 6 THEN 'Gita' ELSE 'Hugo' END,
  CASE (i / 8) % 10 WHEN 0 THEN 'Lee' WHEN 1 THEN 'Patel' WHEN 2 THEN 'Khan' WHEN 3 THEN 'Smith' WHEN 4 THEN 'Garcia' WHEN 5 THEN 'Rao' WHEN 6 THEN 'Kim' WHEN 7 THEN 'Silva' WHEN 8 THEN 'Brown' ELSE 'Iyer' END,
  CASE i % 5 WHEN 0 THEN 'IN' WHEN 1 THEN 'US' WHEN 2 THEN 'UK' WHEN 3 THEN 'DE' ELSE 'BR' END,
  CASE i % 10 WHEN 0 THEN 'Pune' WHEN 1 THEN 'Austin' WHEN 2 THEN 'Leeds' WHEN 3 THEN 'Berlin' WHEN 4 THEN 'Recife' WHEN 5 THEN 'Delhi' WHEN 6 THEN 'Boston' WHEN 7 THEN 'London' WHEN 8 THEN 'Munich' ELSE 'Rio' END,
  CASE WHEN i % 50 = 0 THEN 1 ELSE 0 END,
  date('2025-01-01', '+' || (i % 600) || ' days')
FROM n;
INSERT INTO products
WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM n WHERE i < 500)
SELECT i, 'SKU-' || printf('%05d', i), 'Product ' || i,
  CASE i % 4 WHEN 0 THEN 'books' WHEN 1 THEN 'phones' WHEN 2 THEN 'games' ELSE 'home' END,
  199 + (i * 731) % 99800
FROM n;
INSERT INTO orders
WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM n WHERE i < 20000)
SELECT i,
  (i * 7919) % 2000 + 1,
  (i * 104729) % 500 + 1,
  CASE WHEN i % 100 = 0 THEN 'pending' WHEN i % 25 = 0 THEN 'cancelled' WHEN i % 10 = 0 THEN 'paid' WHEN i % 4 = 0 THEN 'shipped' ELSE 'delivered' END,
  100 + (i * 37) % 50000,
  datetime('2026-01-01', '+' || (i % 270) || ' days', '+' || ((i * 13) % 1440) || ' minutes')
FROM n;
`;

  // lab: an EMPTY database - snippets using it build their own tables.
  var DB_LAB = `PRAGMA foreign_keys = ON;`;

  /* ---------------- snippet helpers ---------------- */
  function shop(code, title) { return { lang: 'sql', db: 'shop', code: code, title: title || '▶ Run against the shop database (20,000 orders)' }; }
  function lab(code, title) { return { lang: 'sql', db: 'lab', code: code, title: title || 'Self-contained SQL (empty database, ▶ Run it)' }; }
  function pg(code, title) { return { lang: 'sql', code: code, check: false, title: title || 'PostgreSQL / MySQL syntax (not runnable in the SQLite playground)' }; }
  function py(code, title) { return { lang: 'python', code: code, run: true, title: title || 'Runnable Python simulation' }; }


  /* =====================================================================
     TOPIC 1 - Full table scan vs index seek
     ===================================================================== */
  topics.push({
    title: 'Why Indexes Exist: Full Table Scan vs Index Seek',
    analogy: `<p>Your biology textbook has 900 pages and you need the page about <b>photosynthesis</b>. Option 1: start at page 1 and read every page until you find it — that is a <b>full table scan</b>. Option 2: flip to the <b>index at the back</b>, find "photosynthesis → p. 412" in a few seconds (the index is sorted A→Z, so you jump straight to the P section), then open page 412 — that is an <b>index seek</b>. The index is a <i>separate, sorted, much smaller</i> copy of just the words you look things up by, plus a pointer to where the full content lives.</p>`,
    explain: `<p>A table on disk is just a pile of <b>pages</b> (small fixed-size blocks: 4 KB in SQLite by default, 8 KB in PostgreSQL, 16 KB in MySQL InnoDB). Each page holds a handful of rows. When you write <code>SELECT * FROM orders WHERE customer_id = 42</code> and there is <b>no index</b> on <code>customer_id</code>, the database has only one choice: read <b>every page</b>, look at <b>every row</b>, and keep the ones where customer_id is 42. That is a <b>full table scan</b> — the work grows with the size of the table, <b>O(N)</b>. 20,000 orders → 20,000 rows checked to return 10.</p>
<p>An <b>index</b> is a second data structure, kept <b>sorted by the column(s) you index</b>, where each entry is <code>(key value → location of the row)</code>. Because it is sorted (and organised as a B+tree, next topic), the database can jump to the right spot in about <b>log N</b> steps, read the few matching entries, and then fetch only those rows. That is an <b>index seek</b> (SQLite calls it <code>SEARCH</code>, Postgres <code>Index Scan</code>, MySQL <code>ref</code>/<code>range</code>).</p>
${H.table(['', 'Full table scan', 'Index seek'], [
  ['Work', 'read all N rows', '~log N steps + the matches'],
  ['20,000 orders, 10 match', '20,000 rows checked', '~3 page reads + 10 rows'],
  ['SQLite says', '<code>SCAN orders</code>', '<code>SEARCH orders USING INDEX …</code>'],
  ['Best when', 'you need most of the table', 'you need a small slice']
])}
<p>How do you <i>see</i> which one happened? Ask the database for its plan. In SQLite (our playground) you prefix the query with <code>EXPLAIN QUERY PLAN</code>. ${H.c('r', 'SCAN')} means "read everything"; ${H.c('g', 'SEARCH … USING INDEX')} means "jump straight to the right place". Postgres uses <code>EXPLAIN</code> / <code>EXPLAIN ANALYZE</code> and MySQL <code>EXPLAIN</code> — different words, same idea.</p>
<p>Indexes are not free: every index is extra storage, and every <code>INSERT</code>, <code>UPDATE</code> and <code>DELETE</code> must also update every index. So the skill is not "index everything" — it is <b>"create exactly the indexes your important queries need"</b>. That is what this whole module trains.</p>`,
    clues: [
      '"The query is slow and the table just grew to millions of rows" → probably a full table scan; check the plan',
      '"Find the user by email / the order by id / all orders of customer X" → equality lookup on a column → index candidate',
      '"Which index would you create?" → read the WHERE, JOIN, ORDER BY and GROUP BY columns of the query',
      'Plan shows <code>SCAN table</code> (SQLite), <code>Seq Scan</code> (Postgres) or <code>type: ALL</code> (MySQL) on a big table → missing or unusable index',
      '"Reads are slow but writes are fine" → indexes are the first lever; "writes are slow" → maybe too many indexes'
    ],
    code: [shop(`-- 1) No index on customer_id yet: the planner must read every row.
EXPLAIN QUERY PLAN
SELECT * FROM orders WHERE customer_id = 42;          -- SCAN orders

-- 2) Build a sorted "back-of-the-book" index on customer_id.
CREATE INDEX idx_orders_customer ON orders(customer_id);

-- 3) Same query, new plan: jump straight to customer 42.
EXPLAIN QUERY PLAN
SELECT * FROM orders WHERE customer_id = 42;          -- SEARCH orders USING INDEX idx_orders_customer (customer_id=?)

-- 4) The answer itself (10 rows out of 20,000).
SELECT id, customer_id, status, total_cents FROM orders WHERE customer_id = 42;`, 'SCAN → CREATE INDEX → SEARCH (▶ Run it)'),
    shop(`-- The primary key is ALREADY an index: INTEGER PRIMARY KEY is the rowid B+tree itself.
EXPLAIN QUERY PLAN SELECT * FROM orders WHERE id = 777;          -- SEARCH ... USING INTEGER PRIMARY KEY (rowid=?)
EXPLAIN QUERY PLAN SELECT * FROM orders WHERE id BETWEEN 10 AND 20; -- a range on the PK also seeks

-- List every index the table has (none except the implicit rowid one).
SELECT name FROM pragma_index_list('orders');`, 'Primary keys are indexed for free')],
    codeTitle: ['See a full scan turn into an index seek', 'Primary key lookups'],
    viz: [{
      title: 'Full scan vs index seek on a tiny 12-row table',
      input: '7',
      inputLabel: 'customer_id to find (1-9)',
      gen: function (input) {
        var want = parseInt(String(input).trim(), 10);
        if (isNaN(want) || want < 1 || want > 9) throw new Error('Enter one customer_id between 1 and 9, e.g. 7');
        var cust = [7, 3, 9, 7, 1, 4, 9, 7, 2, 5, 3, 8];
        var rows = cust.map(function (c, i) { return [i + 1, c, ['paid', 'shipped', 'delivered'][i % 3]]; });
        var cols = ['rowid', 'customer_id', 'status'];
        var frames = [], matches = 0, i;
        frames.push({ narr: 'The table <b>orders</b> has 12 rows stored in insert order — <b>not</b> sorted by customer_id. We want every order of customer <b>' + want + '</b>. With no index, the only option is to read every row.', parts: [
          { type: 'table', label: 'orders (heap / table pages)', columns: cols, rows: rows },
          { type: 'vars', label: 'counters', vals: { rows_read: 0, matches: 0 } }
        ] });
        for (i = 0; i < rows.length; i++) {
          var hit = cust[i] === want; if (hit) matches++;
          var hl = {}; hl[i] = hit ? 'ok' : 'cur';
          for (var k = 0; k < i; k++) if (cust[k] === want) hl[k] = 'sel'; else hl[k] = hl[k] || 'done';
          frames.push({ narr: 'SCAN row ' + (i + 1) + ': customer_id = ' + cust[i] + (hit ? ' → <span class="c-g">match, keep it</span>.' : ' → not ' + want + ', skip.') + ' Even after finding matches we must keep going — an unsorted table gives no reason to stop early.', parts: [
            { type: 'table', label: 'orders — full table scan', columns: cols, rows: rows, hl: hl },
            { type: 'vars', label: 'counters', vals: { rows_read: i + 1, matches: matches }, hl: { rows_read: 'cur' } }
          ] });
        }
        var scanCost = rows.length;
        var idx = rows.map(function (r) { return [r[1], r[0]]; }).sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; });
        var keys = idx.map(function (e) { return e[0]; });
        frames.push({ narr: 'Now build an <b>index</b>: the same customer_id values, <b>sorted</b>, each with the rowid where the full row lives. Like the index at the back of a book: "word → page number".', parts: [
          { type: 'table', label: 'idx_orders_customer (sorted entries)', columns: ['customer_id', '→ rowid'], rows: idx },
          { type: 'array', label: 'index keys in order', values: keys }
        ] });
        var lo = 0, hi = keys.length - 1, steps = 0;
        while (lo < hi) {
          var mid = Math.floor((lo + hi) / 2); steps++;
          var ptr = {}; ptr[mid] = 'probe';
          var goRight = keys[mid] < want;
          frames.push({ narr: 'Seek step ' + steps + ': look at the middle key <b>' + keys[mid] + '</b>. ' + (goRight ? keys[mid] + ' &lt; ' + want + ' → the answer must be to the <b>right</b>; throw away the left half.' : keys[mid] + ' ≥ ' + want + ' → the first ' + want + ' is here or to the <b>left</b>.') + ' Sorting is what lets us discard half the entries without reading them.', parts: [
            { type: 'array', label: 'index keys (window = still possible)', values: keys, range: [lo, hi], ptr: ptr },
            { type: 'vars', vals: { seek_steps: steps }, hl: { seek_steps: 'cur' } }
          ] });
          if (goRight) lo = mid + 1; else hi = mid;
        }
        var found = [], hlk = {}, j = lo;
        while (j < keys.length && keys[j] === want) { found.push(idx[j][1]); hlk[j] = 'ok'; j++; }
        if (j < keys.length) hlk[j] = 'bad';
        frames.push({ narr: found.length ? 'Landed on the first <b>' + want + '</b>. Matching entries sit <b>next to each other</b> because the index is sorted — read them left to right and stop at the first key that is not ' + want + ' (red).' : 'Landed where ' + want + ' would be, but the key there is different → customer ' + want + ' has <b>no orders</b>. We proved it in ' + steps + ' steps instead of 12 reads.', parts: [
          { type: 'array', label: 'index keys', values: keys, hl: hlk },
          { type: 'vars', vals: { seek_steps: steps, entries_read: found.length, rowids: found.join(', ') || '—' } }
        ] });
        var hlr = {};
        found.forEach(function (rid) { hlr[rid - 1] = 'sel'; });
        frames.push({ narr: 'Fetch only those rows by rowid: ' + (found.length ? found.join(', ') : 'none') + '. These are point lookups into the table, one per match.', parts: [
          { type: 'table', label: 'orders — only the matching rows are touched', columns: cols, rows: rows, hl: hlr }
        ] });
        var seekCost = steps + found.length + found.length;
        frames.push({ narr: 'Score: the scan touched <b>' + scanCost + '</b> rows; the index path touched <b>' + seekCost + '</b> things (' + steps + ' seek steps + ' + found.length + ' index entries + ' + found.length + ' row fetches). On 12 rows it barely matters — on 100 million rows the scan grows to 100 million while the seek stays tiny.', parts: [
          { type: 'bars', label: 'work done', values: [scanCost, seekCost], idxLabels: ['full scan', 'index seek'], hl: { 0: 'bad', 1: 'ok' } }
        ] });
        return frames;
      }
    }, {
      title: 'How the gap grows as the table grows (pages read)',
      input: '100 300',
      inputLabel: 'rows per page, keys per index page (fanout)',
      gen: function (input) {
        var a = String(input).trim().split(/[\s,]+/).map(Number);
        if (a.length !== 2 || a.some(function (x) { return isNaN(x) || x < 2 || x > 2000; })) throw new Error('Enter two numbers 2-2000: rows per page and fanout, e.g. 100 300');
        var rpp = a[0], fan = a[1], frames = [];
        var Ns = [1e3, 1e4, 1e5, 1e6, 1e7, 1e8, 1e9];
        var names = ['1 thousand', '10 thousand', '100 thousand', '1 million', '10 million', '100 million', '1 billion'];
        frames.push({ narr: 'Model: the table packs <b>' + rpp + '</b> rows per page, an index page holds <b>' + fan + '</b> keys. A scan reads every table page; a seek reads one page per index level plus one table page. Bars use a <b>log scale</b> so both fit; the real numbers are printed on top.', parts: [
          { type: 'vars', vals: { rows_per_page: rpp, fanout: fan } }
        ] });
        var scanV = [], seekV = [], txt = [], lbl = [];
        Ns.forEach(function (N, i) {
          var pages = Math.ceil(N / rpp), levels = 1, cap = fan;
          while (cap < N) { cap *= fan; levels++; }
          var seek = levels + 1;
          scanV.push(Math.log10(pages) + 1); seekV.push(Math.log10(seek) + 1);
          var vals = [], tx = [], lb = [], hl = {};
          for (var k = 0; k <= i; k++) { vals.push(scanV[k], seekV[k]); }
          for (k = 0; k <= i; k++) {
            var p2 = Math.ceil(Ns[k] / rpp), lv = 1, c2 = fan; while (c2 < Ns[k]) { c2 *= fan; lv++; }
            tx.push(String(p2), String(lv + 1)); lb.push(names[k].split(' ')[0] + (k > 2 ? (k > 5 ? 'B' : 'M') : 'K') + ' scan', 'seek');
          }
          hl[vals.length - 2] = 'bad'; hl[vals.length - 1] = 'ok';
          frames.push({ narr: '<b>' + names[i] + '</b> rows: a scan reads <b>' + pages.toLocaleString('en-US') + '</b> pages; the index is <b>' + levels + '</b> level(s) tall, so a seek reads <b>' + seek + '</b> pages. ' + (i >= 3 ? 'At ~0.1 ms per random SSD read the seek is under a millisecond; the scan is ' + (pages / 10000 >= 1 ? 'seconds to minutes' : 'noticeably slower') + '.' : 'Small tables: the difference is still small.'), parts: [
            { type: 'bars', label: 'pages read (log-scale height, real value on top)', values: vals, texts: tx, idxLabels: lb, hl: hl },
            { type: 'vars', vals: { rows: N.toLocaleString('en-US'), scan_pages: pages, index_levels: levels, seek_pages: seek }, hl: { seek_pages: 'ok', scan_pages: 'bad' } }
          ] });
        });
        frames.push({ narr: 'Takeaway: going from 1 thousand to 1 billion rows multiplied scan work by a <b>million</b>, but added only a couple of levels to the index. That is the power of <b>log<sub>fanout</sub> N</b> with a fanout in the hundreds.', parts: [
          { type: 'text', html: '<b>Scan</b> = O(N) pages. <b>Seek</b> = O(log<sub>F</sub> N) pages, with F ≈ 100–1000 in real databases.' }
        ] });
        return frames;
      }
    }],
    examples: [
      { title: 'Login by email on a 10-million-user table', html: `<p><code>SELECT id, password_hash FROM users WHERE email = ?</code> runs on every login. Without an index: 10M rows checked per login → hundreds of ms and heavy CPU/IO under load. With <code>CREATE UNIQUE INDEX ux_users_email ON users(email)</code>: 3–4 page reads, well under a millisecond (pages near the root are always cached in memory). Bonus: the UNIQUE index also <b>enforces</b> one account per email.</p>`, code: shop(`CREATE UNIQUE INDEX ux_customers_email ON customers(email);
EXPLAIN QUERY PLAN SELECT id FROM customers WHERE email = 'user1234@mail.com';
SELECT id, first_name, last_name FROM customers WHERE email = 'user1234@mail.com';`) },
      { title: 'A query that needs most of the table — the index does not help', html: `<p><code>SELECT SUM(total_cents) FROM orders WHERE status &lt;&gt; 'cancelled'</code> keeps <b>97%</b> of rows. Even with an index on status, the database still needs almost every row, and jumping row-by-row through an index is <i>slower</i> than reading the pages in order. Indexes win when the result is a <b>small slice</b> (we quantify this in the Selectivity topic).</p>`, code: shop(`SELECT status, COUNT(*) AS n, ROUND(100.0 * COUNT(*) / 20000, 1) AS pct
FROM orders GROUP BY status ORDER BY n DESC;
EXPLAIN QUERY PLAN SELECT SUM(total_cents) FROM orders WHERE status <> 'cancelled';`) },
      { title: 'Joins need an index on the join column', html: `<p><code>customers JOIN orders ON orders.customer_id = customers.id WHERE customers.city = 'Pune'</code>: for each of the 200 Pune customers the database must find their orders. Without an index on <code>orders.customer_id</code> it would re-scan orders (or build a temporary index — SQLite literally reports <code>AUTOMATIC COVERING INDEX</code> when it does this on the fly). With the index each lookup is a seek. Rule of thumb: <b>index your foreign-key columns</b>.</p>`, code: shop(`EXPLAIN QUERY PLAN
SELECT c.first_name, o.id FROM customers c JOIN orders o ON o.customer_id = c.id WHERE c.city = 'Pune';
CREATE INDEX idx_orders_customer ON orders(customer_id);
EXPLAIN QUERY PLAN
SELECT c.first_name, o.id FROM customers c JOIN orders o ON o.customer_id = c.id WHERE c.city = 'Pune';`) }
    ],
    deepDive: `<p><b>Why pages, not rows, are the unit of cost.</b> Storage reads whole pages. A page read from RAM (buffer pool / page cache hit) costs ~100 ns–1 µs; from NVMe SSD ~20–100 µs; from a spinning disk ~5–10 ms; from cloud block storage (EBS-style) ~0.2–1 ms. A full scan reads pages <b>sequentially</b> (prefetch-friendly, fast per page), while an index seek does a few <b>random</b> reads. That is why the planner compares <i>sequential pages × cheap</i> against <i>random pages × expensive</i> — and why a scan can win when many rows match.</p>
<p><b>The top of every index is always hot.</b> For a 3-level index, the root and most second-level pages are touched by every query, so they live in memory. A "4-page" seek is often 1 real I/O.</p>
<p><b>SQLite specifics.</b> An ordinary SQLite table <i>is</i> a B+tree keyed by the 64-bit <code>rowid</code>; <code>INTEGER PRIMARY KEY</code> is an alias for it, so PK lookups are seeks for free. <code>UNIQUE</code> and non-integer <code>PRIMARY KEY</code> constraints silently create <code>sqlite_autoindex_*</code> indexes. When a join has no usable index, SQLite may build a transient <b>automatic index</b> for that one query (plan line <code>AUTOMATIC COVERING INDEX</code>) — a loud hint that a permanent index is missing.</p>
<p><b>Production reality.</b> Most "the DB is slow" incidents are a handful of queries doing scans on tables that were small at launch. The fix loop is: find the slow query (Postgres <code>pg_stat_statements</code>, MySQL slow query log / Performance Schema), read its plan, add or adjust one index, re-check the plan, measure. Create indexes on big live tables with <code>CREATE INDEX CONCURRENTLY</code> (Postgres) or online DDL (<code>ALGORITHM=INPLACE, LOCK=NONE</code> in MySQL) so you do not block writes.</p>`,
    aiEra: `<p><b>What AI changes:</b> paste a slow query plus its <code>EXPLAIN</code> output into an assistant and it will usually spot the <code>Seq Scan</code> and propose an index in seconds; managed databases (Azure SQL automatic tuning, Postgres advisors like <code>pg_qualstats</code>+HypoPG-based tools, cloud "performance insights") now recommend indexes automatically from workload history.</p>
<p><b>Use AI as a partner:</b> "Here is my table definition, row counts and the 5 most frequent queries — propose the minimal set of indexes and explain which query each one serves." Then <b>verify</b> each suggestion with <code>EXPLAIN</code> yourself.</p>
<p><b>Where AI goes wrong:</b> it recommends an index per column ("index everything in the WHERE"), ignores write cost, forgets an existing composite index already covers the query, and cannot see your real data distribution, so it may suggest an index the planner will never use. <b>What you must still own:</b> reading plans, knowing your data sizes and skew, and deciding the read/write trade-off.</p>`,
    problems: [{
      title: 'Speed Up the "My Orders" Page',
      level: 'Easy', tags: ['index basics', 'explain query plan'], companies: ['Amazon', 'Flipkart', 'Shopify'],
      statement: `<p>The "My Orders" page runs <code>SELECT id, status, total_cents, created_at FROM orders WHERE customer_id = ?</code> thousands of times per minute. The <code>orders</code> table (shop database) has 20,000 rows today and will have 200 million next year. Which index would you create? Show the plan before and after.</p>`,
      constraints: `<p>One index only. Must work in SQLite. Customer ids are 1–2000; each customer has ~10 orders.</p>`,
      example: `<p>Before: plan ${H.c('r', 'SCAN orders')} — 20,000 rows read to return 10.<br>After: plan ${H.c('g', 'SEARCH orders USING INDEX idx_orders_customer (customer_id=?)')} — a few page reads + 10 row fetches.</p>`,
      brute: { why: `<p>Without an index the database scans all 20,000 rows (and 200 million next year) for every page view — work grows linearly with the whole table even though each customer only has ~10 orders. That is the wasted work: 99.95% of the rows read are thrown away.</p>`, code: shop(`-- Brute force: no index, the plan is a full table scan.
EXPLAIN QUERY PLAN
SELECT id, status, total_cents, created_at FROM orders WHERE customer_id = 42;
SELECT id, status, total_cents, created_at FROM orders WHERE customer_id = 42;`) },
      mcq: { q: 'Which column should the index start with?', options: ['<code>customer_id</code> — it is the column filtered with =', '<code>id</code> — it is the primary key', '<code>status</code> — it appears in the SELECT list', '<code>created_at</code> — dates are always indexed'], answer: 0, explain: 'Index the column(s) the WHERE clause filters on. id is already indexed (rowid) but the query does not filter by it.' },
      hints: [`<p>Hint 1: look at the WHERE clause. Which column narrows 20,000 rows down to ~10?</p>`, `<p>Hint 2: an index on that column turns <code>SCAN</code> into <code>SEARCH … USING INDEX</code>. Confirm with <code>EXPLAIN QUERY PLAN</code>.</p>`, `<p>Hint 3: recipe — <code>CREATE INDEX idx_orders_customer ON orders(customer_id);</code> then re-run the plan. (Later topics improve this into a composite/covering index.)</p>`],
      solution: {
        approach: `<p>The query filters by equality on <code>customer_id</code>, so an index on that column lets the planner seek directly to customer 42's entries (they are adjacent because the index is sorted), then fetch only those ~10 rows by rowid. Work becomes O(log N + matches) instead of O(N).</p>`,
        code: shop(`CREATE INDEX idx_orders_customer ON orders(customer_id);

EXPLAIN QUERY PLAN
SELECT id, status, total_cents, created_at FROM orders WHERE customer_id = 42;
-- SEARCH orders USING INDEX idx_orders_customer (customer_id=?)

SELECT id, status, total_cents, created_at FROM orders WHERE customer_id = 42;`),
        complexity: `<p>Scan: O(N) rows. Seek: O(log N) index pages + O(k) row fetches for k matches (k ≈ 10). Extra cost: one more B+tree to maintain on every insert into orders.</p>`,
        followUps: ['The page also says <code>ORDER BY created_at DESC</code> — how would you change the index? (Composite topic)', 'How would you build this index on a 200M-row live Postgres table without blocking writes?']
      }
    }]
  });

  /* =====================================================================
     TOPIC 2 - B+tree internals
     ===================================================================== */
  var BT_SEP = [51, 27, 75, 15, 39, 63, 87];
  var BT_LEAVES = [[3, 7, 10, 12], [15, 18, 21, 24], [27, 30, 33, 36], [39, 42, 45, 48], [51, 54, 57, 60], [63, 66, 69, 72], [75, 78, 81, 84], [87, 90, 93, 96]];
  function btArr() { return BT_SEP.concat(['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7', 'L8']); }
  // Descend from the root to the leaf that may contain key. Returns the list of node indexes visited.
  function btPath(key) {
    var path = [0], k = 0;
    while (k < 7) { k = key >= BT_SEP[k] ? 2 * k + 2 : 2 * k + 1; path.push(k); }
    return path;
  }

  topics.push({
    title: 'Inside a B+tree: Search Level by Level & Range Scans',
    analogy: `<p>Think of an old <b>phone book</b> or a big <b>dictionary</b>. You never read it page by page. The spine says "A–F | G–M | N–S | T–Z", you open the right section, the <b>guide words</b> printed at the top of each page ("Kale — Kettle") tell you whether to flip forward or back, and within a couple of jumps you land on the exact page. Then, if you want <i>every</i> name from "Kim" to "Kumar", you just keep <b>turning pages forward</b> — no need to go back to the spine. A B+tree is exactly that: signposts on top, the real sorted entries at the bottom, and the bottom pages chained together so you can keep reading in order.</p>`,
    explain: `<p>Almost every relational index (PostgreSQL, MySQL InnoDB, SQL Server, Oracle, SQLite) is a <b>B+tree</b>. Picture three kinds of pages:</p>
<ul>
<li><b>Root page</b> (top): a few separator keys and pointers to child pages. "Keys &lt; 51 go left, ≥ 51 go right."</li>
<li><b>Internal pages</b> (middle): more separators, more pointers. They hold <b>no row data</b> — only signposts — so hundreds of them fit in one page.</li>
<li><b>Leaf pages</b> (bottom): <b>every key, in sorted order</b>, each with a pointer to its row (or the row itself, for a clustered index). Each leaf also points to the <b>next leaf</b> (and usually the previous one) — a linked list across the whole bottom level.</li>
</ul>
<p><b>Point lookup</b> (<code>WHERE id = 42</code>): start at the root, compare 42 with the separators, follow one pointer per level, reach a leaf, find 42 inside it. One page read per level.</p>
<p><b>Range scan</b> (<code>WHERE id BETWEEN 20 AND 45</code>): descend once to the leaf holding 20, then walk <b>sideways</b> along the leaf chain, collecting keys until you pass 45. You never climb back up. This is also why an index gives you <b>ORDER BY for free</b> — the leaves are already sorted.</p>
<p><b>Why so shallow?</b> The number of children per page (the <b>fanout</b>) is huge. A 16 KB page with 8-byte keys + 6-byte pointers holds ~1,000 children. So:</p>
${H.table(['Levels', 'Leaf pages reachable', 'Rows (≈100 per leaf)'], [['1 (root is a leaf)', '1', '100'], ['2', '1,000', '100 thousand'], ['3', '1,000,000', '100 million'], ['4', '1,000,000,000', '100 billion']])}
<p>A <b>billion-row</b> table needs only <b>3–4 page reads</b> per lookup — and the top 2 levels are almost always cached in RAM. Compare a binary search tree: log<sub>2</sub>(10<sup>9</sup>) ≈ 30 levels → 30 random reads. That is why databases use wide, shallow trees.</p>
<p><b>Staying balanced.</b> When a leaf is full and a new key arrives, the leaf <b>splits</b> into two half-full leaves and a new separator is pushed up into the parent; if the parent is full it splits too; if the root splits, the tree grows one level taller — at the top, so <b>all leaves stay at the same depth</b>. Every lookup costs the same number of levels.</p>`,
    clues: [
      '"How does a database index work internally?" → B+tree: sorted leaves, linked leaf chain, high fanout, height 3–4',
      '"Why a B+tree and not a binary search tree / hash table?" → disk pages + fanout (shallow) and ordered range scans',
      '"Range queries / BETWEEN / ORDER BY ... LIMIT are fast with an index" → descend once, then walk the leaf chain',
      '"How many disk reads to find a row in a 1-billion-row table?" → ~log<sub>1000</sub>(10<sup>9</sup>) ≈ 3–4 page reads',
      '"Random UUID primary keys make inserts slow" → random leaf splits all over the tree (vs append-only at the right edge)'
    ],
    code: [shop(`-- Range on the primary key (the table's own B+tree): descend once, walk the leaves.
EXPLAIN QUERY PLAN SELECT * FROM orders WHERE id BETWEEN 100 AND 120;

-- Range on a secondary column: first a scan...
EXPLAIN QUERY PLAN SELECT id, created_at FROM orders
WHERE created_at >= '2026-03-01' AND created_at < '2026-03-02';

-- ...then build a B+tree on created_at and the same range becomes a SEARCH (created_at>? AND created_at<?).
CREATE INDEX idx_orders_created ON orders(created_at);
EXPLAIN QUERY PLAN SELECT id, created_at FROM orders
WHERE created_at >= '2026-03-01' AND created_at < '2026-03-02';

-- ORDER BY + LIMIT straight from the sorted leaves: no "USE TEMP B-TREE FOR ORDER BY" line.
EXPLAIN QUERY PLAN SELECT id, created_at FROM orders ORDER BY created_at DESC LIMIT 5;
SELECT id, created_at FROM orders ORDER BY created_at DESC LIMIT 5;`, 'Ranges and ORDER BY ride the leaf chain'),
    py(`# How tall does a B+tree get? (pure arithmetic, no database needed)
import math

def btree_height(rows, leaf_capacity, fanout):
    """Number of levels (leaf level included) needed to index 'rows' entries."""
    pages = math.ceil(rows / leaf_capacity)   # leaf pages
    levels = 1
    while pages > 1:                           # keep adding parent levels until one root page remains
        pages = math.ceil(pages / fanout)
        levels += 1
    return levels

for rows in [1_000, 1_000_000, 100_000_000, 10_000_000_000]:
    h = btree_height(rows, leaf_capacity=100, fanout=1000)
    bst = math.ceil(math.log2(rows))
    print(f"{rows:>15,} rows -> B+tree height {h}  (a binary tree would need ~{bst} levels)")`, 'B+tree height vs binary tree height (▶ Run)')],
    codeTitle: ['Range scans and free ORDER BY', 'Why fanout makes trees shallow'],
    viz: [{
      title: 'B+tree point lookup — one page per level',
      input: '42',
      inputLabel: 'key to search (1-99)',
      gen: function (input) {
        var key = parseInt(String(input).trim(), 10);
        if (isNaN(key) || key < 1 || key > 99) throw new Error('Enter one whole number between 1 and 99, e.g. 42');
        var arr = btArr(), path = btPath(key), frames = [];
        frames.push({ narr: 'A 4-level B+tree over 32 keys. Circles on top are <b>signpost pages</b> holding one separator each (real pages hold hundreds — we draw one so it fits). Rule at every signpost: key <b>&lt;</b> separator → go <b>left</b>, key <b>≥</b> separator → go <b>right</b>. Bottom row L1…L8 are <b>leaf pages</b> holding the real sorted keys. Looking for <b>' + key + '</b>.', parts: [
          { type: 'tree', label: 'B+tree (separators on top, leaf pages at the bottom)', arr: arr },
          { type: 'vars', vals: { search_key: key, pages_read: 0 } }
        ] });
        for (var s = 0; s < path.length - 1; s++) {
          var node = path[s], next = path[s + 1], hl = {}, ehl = {}, tags = {};
          for (var q = 0; q < s; q++) hl[path[q]] = 'done';
          hl[node] = 'cur'; ehl[next] = 'ok'; tags[node] = 'page ' + (s + 1);
          var right = key >= BT_SEP[node];
          frames.push({ narr: 'Level ' + (s + 1) + ': read page with separator <b>' + BT_SEP[node] + '</b>. ' + key + (right ? ' ≥ ' : ' &lt; ') + BT_SEP[node] + ' → go <b>' + (right ? 'right' : 'left') + '</b>. Everything on the other side is skipped without ever being read — that is half the tree ignored in one comparison (with real fanout ~1000, 99.9% ignored).', parts: [
            { type: 'tree', label: 'descending…', arr: arr, hl: hl, ehl: ehl, tags: tags },
            { type: 'vars', vals: { search_key: key, pages_read: s + 1, level: s + 1 }, hl: { pages_read: 'cur' } }
          ] });
        }
        var leafNode = path[path.length - 1], leaf = BT_LEAVES[leafNode - 7], pos = leaf.indexOf(key);
        var hl2 = {}, tags2 = {}; path.forEach(function (p) { hl2[p] = 'done'; }); hl2[leafNode] = pos >= 0 ? 'ok' : 'bad'; tags2[leafNode] = 'page ' + path.length;
        var ahl = {}; leaf.forEach(function (v, i) { ahl[i] = v === key ? 'ok' : (v < key ? 'done' : ''); });
        frames.push({ narr: 'Level ' + path.length + ': arrive at leaf <b>' + arr[leafNode] + '</b> and binary-search inside the page (it is in memory now, so this is cheap CPU work, not I/O). ' + (pos >= 0 ? '<span class="c-g">Found ' + key + '</span> with its row pointer.' : '<span class="c-r">' + key + ' is not here</span>, and since this is the only leaf where it could live, it does not exist in the table. Proven with ' + path.length + ' page reads.'), parts: [
          { type: 'tree', label: 'reached the leaf', arr: arr, hl: hl2, tags: tags2 },
          { type: 'array', label: 'keys inside leaf ' + arr[leafNode], values: leaf, hl: ahl },
          { type: 'vars', vals: { search_key: key, pages_read: path.length, found: pos >= 0 ? 'yes' : 'no' }, hl: { found: pos >= 0 ? 'ok' : 'bad' } }
        ] });
        if (pos >= 0) frames.push({ narr: 'The leaf entry is <b>(' + key + ' → row pointer)</b>. In a secondary index we follow the pointer to fetch the row (+1 page). In a clustered index (InnoDB primary key, SQLite rowid table) the row itself is stored right here in the leaf — no extra hop.', parts: [
          { type: 'table', label: 'leaf entry', columns: ['key', 'payload'], rows: [[key, 'rowid / PK → full row']], hl: { 0: 'sel' } },
          { type: 'bars', label: 'pages read: index seek vs scanning all 8 leaves', values: [path.length, 8], idxLabels: ['seek', 'scan leaves'], hl: { 0: 'ok', 1: 'bad' } }
        ] });
        frames.push({ narr: 'Every lookup costs exactly <b>height</b> page reads because the tree is perfectly balanced — all leaves sit at the same depth. Try a key that does not exist (e.g. 44) or one at the edge (3, 96).', parts: [
          { type: 'text', html: 'Cost of a point lookup = <b>tree height</b> = log<sub>fanout</sub>(N). Real databases: 3–4 pages for billions of rows.' }
        ] });
        return frames;
      }
    }, {
      title: 'Range scan: descend once, then walk the linked leaves',
      input: '20 45',
      inputLabel: 'range low high (1-99)',
      gen: function (input) {
        var a = String(input).trim().split(/[\s,]+/).map(Number);
        if (a.length !== 2 || a.some(isNaN) || a[0] > a[1] || a[0] < 1 || a[1] > 99) throw new Error('Enter two numbers low high with 1 ≤ low ≤ high ≤ 99, e.g. 20 45');
        var lo = a[0], hi = a[1], all = [], lab = [], start = [], frames = [];
        BT_LEAVES.forEach(function (lf, li) { start.push(all.length); lf.forEach(function (v) { all.push(v); lab.push('L' + (li + 1)); }); });
        var path = btPath(lo), arr = btArr();
        var hl = {}; path.forEach(function (p) { hl[p] = 'done'; }); hl[path[path.length - 1]] = 'cur';
        frames.push({ narr: 'Query: <code>WHERE key BETWEEN ' + lo + ' AND ' + hi + '</code>. Step 1 is an ordinary lookup for the <b>low end</b> (' + lo + '): ' + path.length + ' page reads take us down to leaf <b>' + arr[path[path.length - 1]] + '</b>.', parts: [
          { type: 'tree', label: 'descend to the first leaf', arr: arr, hl: hl },
          { type: 'array', label: 'leaf level = one sorted linked list (labels = leaf page)', values: all, idxLabels: lab }
        ] });
        var i = 0; while (i < all.length && all[i] < lo) i++;
        var pages = path.length, got = [], curLeaf = -1, collected = {};
        if (i >= all.length) {
          frames.push({ narr: 'Every key is below ' + lo + ' → the range is empty.', parts: [{ type: 'array', values: all, idxLabels: lab }] });
        }
        while (i < all.length) {
          var li = Math.floor(i / 4);
          if (li !== curLeaf) {
            if (curLeaf !== -1) {
              pages++;
              var r0 = [start[li], start[li] + 3];
              frames.push({ narr: 'End of leaf L' + (curLeaf + 1) + '. Follow its <b>next-leaf pointer</b> sideways to L' + (li + 1) + ' (+1 page read). No trip back to the root needed.', parts: [
                { type: 'array', label: 'leaf chain', values: all, idxLabels: lab, range: r0, hl: Object.assign({}, collected) },
                { type: 'vars', vals: { pages_read: pages, rows_found: got.length }, hl: { pages_read: 'cur' } }
              ] });
            }
            curLeaf = li;
          }
          var ptr = {}; ptr[i] = 'cur';
          var r = [start[li], start[li] + 3];
          if (all[i] > hi) {
            var hb = Object.assign({}, collected); hb[i] = 'bad';
            frames.push({ narr: 'Key <b>' + all[i] + '</b> &gt; ' + hi + ' → <span class="c-r">stop</span>. Because the leaves are sorted, nothing after this can match. Range done: <b>' + got.length + '</b> keys [' + got.join(', ') + '] for <b>' + pages + '</b> page reads.', parts: [
              { type: 'array', label: 'leaf chain', values: all, idxLabels: lab, range: r, hl: hb, ptr: ptr },
              { type: 'vars', vals: { pages_read: pages, rows_found: got.length }, hl: { rows_found: 'ok' } }
            ] });
            break;
          }
          got.push(all[i]); collected[i] = 'ok';
          frames.push({ narr: 'Read key <b>' + all[i] + '</b> (inside ' + lo + '…' + hi + ') → add to result. Moving right inside the same leaf page is free — it is already in memory.', parts: [
            { type: 'array', label: 'leaf chain', values: all, idxLabels: lab, range: r, hl: Object.assign({}, collected), ptr: ptr },
            { type: 'vars', vals: { pages_read: pages, rows_found: got.length } }
          ] });
          i++;
          if (i >= all.length) frames.push({ narr: 'Reached the last leaf — no next pointer. Range done: <b>' + got.length + '</b> keys for <b>' + pages + '</b> page reads.', parts: [{ type: 'array', values: all, idxLabels: lab, hl: Object.assign({}, collected) }] });
        }
        frames.push({ narr: 'Cost of a range scan = <b>height</b> (find the start) + <b>number of leaf pages the range spans</b>. That is why <code>BETWEEN</code>, <code>&gt;</code>, <code>&lt;</code>, prefix <code>LIKE \'abc%\'</code> and <code>ORDER BY … LIMIT</code> all love B+trees — and why a hash index (no order) cannot do any of them.', parts: [
          { type: 'bars', label: 'pages read', values: [pages, path.length - 1 + 8], idxLabels: ['range via index', 'scan every leaf'], hl: { 0: 'ok', 1: 'bad' } }
        ] });
        return frames;
      }
    }],
    examples: [
      { title: 'Height of a real index (InnoDB-style numbers)', html: `<p>16 KB pages. Internal entry = 8-byte BIGINT key + 6-byte child pointer ≈ 14 bytes → ~1,170 children per internal page. Leaf rows ≈ 1 KB each → ~16 rows per leaf (clustered index). Height 3 holds 1,170 × 1,170 × 16 ≈ <b>21.9 million rows</b>; height 4 holds ~<b>25.6 billion</b>. So a PK lookup on a 20M-row InnoDB table is 3 page reads, and the first two are almost certainly in the buffer pool.</p>` },
      { title: 'ORDER BY … LIMIT without sorting', html: `<p><code>SELECT … ORDER BY created_at DESC LIMIT 5</code>: without an index the database reads all 20,000 rows and sorts them (SQLite plan: <code>USE TEMP B-TREE FOR ORDER BY</code>). With an index on <code>created_at</code> it jumps to the <b>right end</b> of the leaf chain and walks backwards 5 entries — leaves are doubly linked, so DESC works too.</p>`, code: shop(`EXPLAIN QUERY PLAN SELECT id FROM orders ORDER BY created_at DESC LIMIT 5;   -- SCAN + TEMP B-TREE
CREATE INDEX idx_orders_created ON orders(created_at);
EXPLAIN QUERY PLAN SELECT id FROM orders ORDER BY created_at DESC LIMIT 5;   -- SCAN orders USING INDEX (reads 5 entries then stops)`) },
      { title: 'Prefix search is a range scan', html: `<p><code>WHERE last_name LIKE 'Ra%'</code> means "keys from 'Ra' up to (but not including) 'Rb'" — a range on the sorted leaves. SQLite only does this rewrite when the index collation matches LIKE's case-insensitive rule (index with <code>COLLATE NOCASE</code>) or when you use the case-sensitive <code>GLOB 'Ra*'</code>. A leading wildcard <code>'%ra'</code> has no starting point in the sort order → full scan.</p>`, code: shop(`CREATE INDEX idx_cust_last ON customers(last_name);
EXPLAIN QUERY PLAN SELECT id FROM customers WHERE last_name GLOB 'Ra*';   -- SEARCH (last_name>? AND last_name<?)
EXPLAIN QUERY PLAN SELECT id FROM customers WHERE last_name LIKE '%ao';   -- leading wildcard: no seek possible
SELECT DISTINCT last_name FROM customers WHERE last_name GLOB 'Ra*';`) }
    ],
    deepDive: `<p><b>B-tree vs B+tree.</b> In a classic B-tree, internal nodes also store records, so some lookups stop early but internal nodes hold fewer keys (lower fanout) and range scans must bounce up and down the tree. A B+tree keeps <b>all records in leaves</b> and links them, giving maximal fanout and cheap sequential range scans. Databases say "B-tree" loosely but implement B+tree variants (Postgres nbtree is a Lehman–Yao <b>B-link tree</b> with right-sibling links so readers don't block on concurrent splits).</p>
<p><b>Splits and fill factor.</b> A full leaf splits 50/50 — except the <b>rightmost</b> leaf on append-only keys (auto-increment, time-ordered), where engines do a 90/10 or "fast-path" split so pages stay full. Random keys (UUIDv4) insert all over the tree: every leaf ends up ~70% full on average, the working set is the whole index instead of the right edge, and buffer pool misses explode. Fixes: sequential surrogate keys or time-ordered IDs (<b>UUIDv7</b>, ULID, Snowflake). Postgres <code>fillfactor</code> (default 90 for B-tree leaves) leaves room for future inserts.</p>
<p><b>Deletes</b> usually just mark entries dead; pages merge rarely. Long-lived indexes accumulate <b>bloat</b> (half-empty pages) → <code>REINDEX</code> / <code>pg_repack</code> / <code>OPTIMIZE TABLE</code>. Postgres 13+ deduplicates repeated keys in leaves; 14+ does bottom-up deletion to fight version-churn bloat.</p>
<p><b>Page internals.</b> Keys inside a page are kept in a sorted slot array and binary-searched. Engines use <b>prefix/suffix truncation</b> (separators only need enough bytes to separate), so long string keys still give high fanout. Concurrency uses short-lived <b>latches</b> with latch crabbing (hold parent until child is safe) — different from transaction locks.</p>
<p><b>Complexities:</b> search O(log<sub>F</sub> N) pages, insert/delete O(log<sub>F</sub> N) amortised, range O(log<sub>F</sub> N + k/B) where k = matches and B = entries per leaf.</p>`,
    aiEra: `<p><b>What AI changes:</b> assistants explain B+tree mechanics well and can generate toy implementations instantly, so interviewers expect you to go beyond "it's a balanced tree" — to page sizes, fanout arithmetic, splits, and why UUIDv4 keys hurt.</p>
<p><b>Use AI as a partner:</b> "Simulate inserting keys 1..50 into a B+tree of order 4 and print the tree after each split" is a great way to build intuition; "estimate index height for my table: 300M rows, 24-byte keys, 8 KB pages" gives you a quick sanity check — redo the arithmetic yourself.</p>
<p><b>Where AI goes wrong:</b> it mixes up B-tree and B+tree (claims data lives in internal nodes of InnoDB), quotes binary-tree heights (log<sub>2</sub>) for disk indexes, and invents page sizes. <b>What you must still own:</b> the fanout → height reasoning, the leaf-chain range scan, and connecting those to real plans (<code>SEARCH … (x&gt;? AND x&lt;?)</code>, no TEMP B-TREE for ORDER BY).</p>`,
    problems: [{
      title: 'How Many Page Reads to Find One Row?',
      level: 'Medium', tags: ['b+tree', 'capacity estimation'], companies: ['Google', 'Microsoft', 'Oracle'],
      statement: `<p>A table has <b>50 million</b> rows. Its B+tree index has leaf pages holding <b>100</b> entries each and internal pages with a fanout of <b>500</b>. (a) How tall is the tree? (b) How many page reads does a point lookup need, and how many does a full scan of the leaf level need? Compute it <b>in SQL</b> with a recursive CTE.</p>`,
      constraints: `<p>Integer arithmetic only (ceil(a/b) = (a + b − 1) / b). No math extension functions.</p>`,
      example: `<p>Leaf pages = ⌈50,000,000 / 100⌉ = ${H.c('b', '500,000')}. Parents: ⌈500,000 / 500⌉ = 1,000 → ⌈1,000 / 500⌉ = 2 → 1 root. Levels: 500,000 · 1,000 · 2 · 1 → ${H.c('g', 'height 4')}. Lookup = 4 page reads vs ${H.c('r', '500,000')} for a full leaf scan.</p>`,
      brute: { why: `<p>The "brute force" access path is the full scan: read all 500,000 leaf pages (or all table pages). At ~0.1 ms per uncached SSD page that is ~50 seconds versus ~0.4 ms for 4 page reads. The waste: 499,996 pages read that cannot contain the key.</p>`, code: lab(`-- Brute force cost: every leaf page is read.
SELECT (50000000 + 100 - 1) / 100 AS pages_read_by_full_scan;`) },
      mcq: { q: 'If the fanout doubled from 500 to 1000, the height would…', options: ['stay 4 or drop by at most one level', 'halve to 2', 'double to 8', 'not change because only leaves matter'], answer: 0, explain: 'Height grows with log base fanout; doubling the base barely changes it: 500,000 → 500 → 1 gives height 3 with fanout 1000. Small change, because log is so flat.' },
      hints: [`<p>Hint 1: start from the bottom: how many leaf pages are needed for 50M entries at 100 per page?</p>`, `<p>Hint 2: each level above has ⌈pages_below / 500⌉ pages. Keep going until one page (the root) remains — a recursive CTE with <code>WHERE pages &gt; 1</code>.</p>`, `<p>Hint 3: height = number of rows the CTE produced. Lookup cost = height page reads (+1 for a non-covering secondary index to fetch the row).</p>`],
      solution: {
        approach: `<p>Build the tree bottom-up in a recursive CTE: level 1 = leaf pages; each next level = ceil(previous / fanout); stop when a level has 1 page (the root). The row count of the CTE is the height. A point lookup reads one page per level.</p>`,
        code: lab(`WITH RECURSIVE lvl(level, pages) AS (
  SELECT 1, (50000000 + 100 - 1) / 100          -- leaf pages (ceil)
  UNION ALL
  SELECT level + 1, (pages + 500 - 1) / 500       -- parents needed for the level below
  FROM lvl
  WHERE pages > 1                                 -- stop once a single root page exists
)
SELECT level, pages,
       CASE WHEN pages = 1 THEN 'root' WHEN level = 1 THEN 'leaves' ELSE 'internal' END AS kind
FROM lvl;

-- Height = number of levels = cost of a point lookup in page reads.
WITH RECURSIVE lvl(level, pages) AS (
  SELECT 1, (50000000 + 99) / 100 UNION ALL SELECT level + 1, (pages + 499) / 500 FROM lvl WHERE pages > 1)
SELECT MAX(level) AS height, MAX(level) AS lookup_page_reads, (SELECT pages FROM lvl WHERE level = 1) AS full_leaf_scan_pages
FROM lvl;`),
        complexity: `<p>Lookup: O(log<sub>500</sub> N) = 4 pages. Full scan: O(N / 100) = 500,000 pages. Root + level 2 (1 + 2 pages) are always cached, so a real lookup does ~1–2 physical reads.</p>`,
        followUps: ['How much RAM to cache all internal levels? (≈ 1,003 pages × page size)', 'How does a 16-byte UUID key instead of an 8-byte BIGINT change the fanout and height?']
      }
    }]
  });

  /* =====================================================================
     TOPIC 3 - Clustered vs non-clustered (secondary) indexes
     ===================================================================== */
  var CL_ROWS = [[101, 'Rao', 'Pune'], [102, 'Lee', 'Austin'], [103, 'Kim', 'Leeds'], [104, 'Lee', 'Berlin'], [105, 'Patel', 'Recife'], [106, 'Khan', 'Delhi'],
    [107, 'Lee', 'Boston'], [108, 'Kim', 'London'], [109, 'Rao', 'Munich'], [110, 'Lee', 'Rio'], [111, 'Silva', 'Pune'], [112, 'Patel', 'Austin']];

  topics.push({
    title: 'Clustered vs Non-Clustered (Secondary) Indexes',
    analogy: `<p>A <b>dictionary</b> is its own index: the words are printed in alphabetical order, so finding "mango" <i>is</i> finding its definition — that is a <b>clustered index</b> (the data itself is stored in key order). A <b>textbook</b> is printed in chapter order, and the index at the back says "photosynthesis → p. 412" — you look up the word, <i>then</i> flip to the page. That is a <b>non-clustered (secondary) index</b>. A book can only be <i>printed</i> in one order, so a table can have only <b>one</b> clustered index, but it can have many back-of-book indexes.</p>`,
    explain: `<p><b>Clustered index</b> = the table's rows are physically stored inside the leaves of a B+tree, sorted by the clustering key. Finding a row by that key finds the row itself — no extra hop. Range scans on that key read neighbouring rows from the same pages. Only <b>one</b> per table.</p>
<p><b>Non-clustered / secondary index</b> = a separate B+tree whose leaves hold <code>(indexed columns → a pointer to the row)</code>. A lookup is two steps: seek the secondary index, then follow the pointer to fetch the row (the <b>"key lookup"</b>, "bookmark lookup" or "table access by rowid"). Many per table.</p>
${H.table(['Engine', 'How the table is stored', 'What a secondary index leaf points to'], [
  ['MySQL InnoDB', 'Always clustered by the PRIMARY KEY (or the first UNIQUE NOT NULL key, or a hidden 6-byte row id)', 'the <b>primary key value</b> → second B+tree descent'],
  ['SQL Server', 'Clustered index if you create one (PK is clustered by default), otherwise a heap', 'clustering key (or RID for a heap)'],
  ['PostgreSQL', 'Always a <b>heap</b> (unordered); every index is secondary. <code>CLUSTER</code> reorders once, not maintained', 'TID = (page, slot) physical address'],
  ['SQLite rowid table', 'Clustered by the 64-bit rowid (<code>INTEGER PRIMARY KEY</code>)', 'the rowid'],
  ['SQLite <code>WITHOUT ROWID</code>', 'Clustered by the declared PRIMARY KEY', 'the primary key columns']
])}
<p><b>Consequences you must be able to explain:</b></p>
<ul>
<li>In InnoDB the PK is copied into <b>every</b> secondary index. A fat PK (e.g. a 36-char UUID string) makes every index fat. Prefer a compact key (BIGINT, or a 16-byte binary time-ordered UUIDv7).</li>
<li>Secondary-index lookups that match <b>many rows</b> pay one extra random fetch per row — this is why the planner abandons a secondary index when too many rows match.</li>
<li>Range queries on the <b>clustering key</b> are the cheapest queries you can write: rows with neighbouring keys live on the same pages. Choose the clustering key to match your hottest range query (e.g. <code>(customer_id, order_id)</code> clusters each customer's orders together).</li>
<li>Postgres pointers are physical: updating a row creates a new version at a new TID, so every index must get a new entry — unless the update is <b>HOT</b> (heap-only tuple: no indexed column changed and the page has room).</li>
</ul>`,
    clues: [
      '"Clustered vs non-clustered index — what\'s the difference?" → data stored in key order (one per table) vs separate structure with pointers (many)',
      '"Why should the InnoDB primary key be small / sequential?" → PK is the clustering key AND is copied into every secondary index',
      '"Key lookup / bookmark lookup / Heap Fetches is expensive in the plan" → secondary index needs a second hop per row; consider covering',
      '"UUID primary key made inserts slow" → random clustering key → page splits across the whole table',
      '"Range queries over one customer\'s data must be fast" → choose a clustering key that starts with customer_id'
    ],
    code: [shop(`-- A rowid table is clustered by rowid. A secondary index secretly stores the rowid too:
CREATE INDEX idx_cust_last ON customers(last_name);
SELECT seqno, cid, name, key FROM pragma_index_xinfo('idx_cust_last');
-- row with cid = -1 and name NULL is the hidden rowid "pointer" column

-- Lookup through the secondary index = seek index + fetch row by rowid:
EXPLAIN QUERY PLAN SELECT * FROM customers WHERE last_name = 'Lee';

-- Lookup by the clustering key needs no second hop:
EXPLAIN QUERY PLAN SELECT * FROM customers WHERE id = 1500;`, 'Secondary index leaves carry the row pointer'),
    lab(`-- WITHOUT ROWID: the table is clustered by its declared PRIMARY KEY (InnoDB-style).
CREATE TABLE order_items (
  order_id   INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  qty        INTEGER NOT NULL,
  PRIMARY KEY (order_id, product_id)
) WITHOUT ROWID;

INSERT INTO order_items
WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM n WHERE i < 5000)
SELECT (i + 2) / 3, (i * 37) % 400 + 1, 1 + i % 4 FROM n;

-- All items of one order are neighbours in the clustered B+tree: one seek, no lookup.
EXPLAIN QUERY PLAN SELECT * FROM order_items WHERE order_id = 77;

-- A secondary index on product_id stores (product_id, order_id) — the PK is its pointer.
CREATE INDEX idx_items_product ON order_items(product_id);
SELECT seqno, name, key FROM pragma_index_xinfo('idx_items_product');
EXPLAIN QUERY PLAN SELECT order_id FROM order_items WHERE product_id = 9;   -- covered: PK is inside the index
EXPLAIN QUERY PLAN SELECT * FROM order_items WHERE product_id = 9;          -- needs qty → second descent by PK`, 'WITHOUT ROWID = clustered by primary key'),
    pg(`-- SQL Server: choose the clustered index explicitly
CREATE CLUSTERED INDEX cx_orders_customer ON dbo.orders (customer_id, order_id);
CREATE NONCLUSTERED INDEX ix_orders_status ON dbo.orders (status) INCLUDE (total_cents);

-- PostgreSQL: heap table; CLUSTER physically reorders ONCE (takes an ACCESS EXCLUSIVE lock, not maintained)
CLUSTER orders USING idx_orders_customer;

-- MySQL InnoDB: the PRIMARY KEY *is* the clustered index
CREATE TABLE orders (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  customer_id BIGINT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL,
  PRIMARY KEY (id),
  KEY idx_customer (customer_id)        -- leaf entries: (customer_id, id)
) ENGINE = InnoDB;`, 'Other engines (not runnable here)')],
    codeTitle: ['Hidden pointer inside a secondary index', 'Clustered table with WITHOUT ROWID', 'SQL Server / Postgres / MySQL'],
    viz: [{
      title: 'Secondary index seek + key lookups vs a clustered range read',
      input: 'Lee',
      inputLabel: 'last_name to find (Rao, Lee, Kim, Patel, Khan, Silva)',
      gen: function (input) {
        var name = String(input).trim();
        name = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
        var names = ['Rao', 'Lee', 'Kim', 'Patel', 'Khan', 'Silva'];
        if (names.indexOf(name) < 0) throw new Error('Pick one of: ' + names.join(', '));
        var rows = CL_ROWS.map(function (r, i) { return ['P' + (Math.floor(i / 3) + 1), r[0], r[1], r[2]]; });
        var cols = ['page', 'id (PK)', 'last_name', 'city'];
        var sec = CL_ROWS.map(function (r) { return [r[1], r[0]]; }).sort(function (a, b) { return a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : a[1] - b[1]; });
        var frames = [];
        frames.push({ narr: 'The table is <b>clustered by id</b>: rows live in id order, 3 rows per page (P1…P4). A <b>secondary index</b> on last_name stores <b>(last_name, id)</b>, sorted by name. Query: <code>SELECT * FROM customers WHERE last_name = \'' + name + '\'</code>.', parts: [
          { type: 'table', label: 'secondary index idx_last (leaf entries)', columns: ['last_name', '→ id'], rows: sec },
          { type: 'table', label: 'clustered table (B+tree leaves ordered by id)', columns: cols, rows: rows }
        ] });
        var hs = {}, ids = [];
        sec.forEach(function (e, i) { if (e[0] === name) { hs[i] = 'ok'; ids.push(e[1]); } });
        var pages = 2;
        frames.push({ narr: 'Step 1 — seek the secondary index (≈2 page reads in this small tree). The ' + ids.length + ' "' + name + '" entries are adjacent because the index is sorted by name. They give us primary keys, <b>not rows</b>: ' + ids.join(', ') + '.', parts: [
          { type: 'table', label: 'secondary index idx_last', columns: ['last_name', '→ id'], rows: sec, hl: hs },
          { type: 'vars', vals: { pages_read: pages, pks_found: ids.join(', ') }, hl: { pks_found: 'ok' } }
        ] });
        var seen = {}, hr = {};
        ids.forEach(function (id, k) {
          var ri = id - 101, pg = rows[ri][0];
          pages += 2; seen[pg] = 1;
          Object.keys(hr).forEach(function (x) { hr[x] = 'done'; });
          hr[ri] = 'sel';
          frames.push({ narr: 'Step 2.' + (k + 1) + ' — <b>key lookup</b> for id ' + id + ': descend the clustered B+tree from the root again (≈2 pages) to land on page <b>' + pg + '</b>. ' + (k > 0 ? 'Notice the matches are scattered across different pages — each one is a separate random hop.' : 'This second descent is the price of a secondary index.'), parts: [
            { type: 'table', label: 'clustered table', columns: cols, rows: rows, hl: Object.assign({}, hr) },
            { type: 'vars', vals: { pages_read: pages, lookups_done: k + 1, distinct_pages_touched: Object.keys(seen).length }, hl: { pages_read: 'cur' } }
          ] });
          hr[ri] = 'sel';
        });
        var clustered = 2 + Math.ceil(ids.length / 3);
        var sorted = CL_ROWS.slice().sort(function (a, b) { return a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : a[0] - b[0]; });
        var rows2 = sorted.map(function (r, i) { return ['P' + (Math.floor(i / 3) + 1), r[0], r[1], r[2]]; });
        var h2 = {}; rows2.forEach(function (r, i) { if (r[2] === name) h2[i] = 'win'; });
        frames.push({ narr: 'What if the table were <b>clustered by last_name</b> instead? All "' + name + '" rows would sit next to each other: one descent (2 pages) then read ' + Math.ceil(ids.length / 3) + ' consecutive page(s). But you only get <b>one</b> physical order — clustering by name would make id lookups the secondary path.', parts: [
          { type: 'table', label: 'hypothetical table clustered by (last_name, id)', columns: cols, rows: rows2, hl: h2 }
        ] });
        frames.push({ narr: 'Score: secondary index + key lookups = <b>' + pages + '</b> page reads (2 + 2 per match). Clustered range read = <b>' + clustered + '</b>. With 10,000 matches the gap becomes ~20,000 random reads vs a few hundred sequential ones — exactly why planners switch to a full scan when a secondary index matches too many rows, and why <b>covering indexes</b> (skip step 2 entirely) exist.', parts: [
          { type: 'bars', label: 'page reads', values: [pages, clustered], idxLabels: ['secondary + lookups', 'clustered range'], hl: { 0: 'bad', 1: 'ok' } }
        ] });
        return frames;
      }
    }],
    examples: [
      { title: 'InnoDB: why the primary key choice leaks into every index', html: `<p>Table <code>users</code> with PK <code>uuid CHAR(36)</code> and 4 secondary indexes. Each secondary entry stores the 36-byte PK as its pointer → 4 × 36 bytes of extra payload per row, lower fanout, more RAM. Switching to <code>BIGINT</code> (8 bytes) or <code>BINARY(16)</code> UUIDv7 shrinks every index and, because v7 is time-ordered, inserts append at the right edge of the clustered tree instead of splitting random pages.</p>` },
      { title: 'Multi-tenant SaaS: cluster by tenant', html: `<p>Hot query: <code>SELECT * FROM invoices WHERE tenant_id = ? AND created_at &gt;= ? ORDER BY created_at</code>. With PK <code>(tenant_id, created_at, id)</code> (InnoDB or WITHOUT ROWID) one tenant's recent invoices are physically contiguous: a single seek plus a sequential leaf walk, no key lookups, already sorted. With PK <code>id</code> they would be scattered across the whole table.</p>`, code: lab(`CREATE TABLE invoices (
  tenant_id INTEGER NOT NULL, created_at TEXT NOT NULL, id INTEGER NOT NULL, amount INTEGER NOT NULL,
  PRIMARY KEY (tenant_id, created_at, id)
) WITHOUT ROWID;
INSERT INTO invoices WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM n WHERE i < 3000)
SELECT i % 30, date('2026-01-01', '+' || (i % 200) || ' days'), i, 100 + i % 900 FROM n;
EXPLAIN QUERY PLAN
SELECT * FROM invoices WHERE tenant_id = 7 AND created_at >= '2026-06-01' ORDER BY created_at;`) },
      { title: 'PostgreSQL: Heap Fetches and HOT updates', html: `<p>Postgres has no clustered index; every index points at heap TIDs. <code>EXPLAIN (ANALYZE, BUFFERS)</code> shows <code>Index Scan</code> (index + heap fetch per row) vs <code>Index Only Scan … Heap Fetches: 0</code>. An <code>UPDATE users SET last_seen = now()</code> on an unindexed column can be a <b>HOT</b> update (no index touched) if the page has free space — set <code>fillfactor = 90</code> on update-heavy tables to leave room. Index <code>last_seen</code> and every such update must write all indexes again.</p>` }
    ],
    deepDive: `<p><b>InnoDB details.</b> If you declare no PK, InnoDB uses the first <code>UNIQUE NOT NULL</code> index, else a hidden 6-byte <code>DB_ROW_ID</code> (global counter → contention). Secondary indexes always have the PK columns appended, so an index on <code>(status)</code> is really <code>(status, id)</code> — it can serve <code>WHERE status = ? ORDER BY id</code> and covers <code>SELECT id … WHERE status = ?</code>. Secondary entries are not MVCC-versioned per row, so a secondary lookup may need to check the clustered record for visibility.</p>
<p><b>SQL Server.</b> Without a clustered index the table is a heap and secondary indexes store an 8-byte RID; with one they store the clustering key (made unique with a hidden 4-byte "uniquifier" if needed). Plans show <code>Key Lookup</code> / <code>RID Lookup</code> operators — the classic tuning move is adding <code>INCLUDE</code> columns to remove them.</p>
<p><b>PostgreSQL.</b> Heap + TID pointers make secondary lookups cheap (one hop, no second tree descent) but every non-HOT update writes a new tuple and new entries in <b>every</b> index (the write amplification behind Uber's 2016 Postgres→MySQL post). <code>pg_stats.correlation</code> measures how well heap order matches an index order; high correlation makes index range scans nearly sequential. <code>CLUSTER</code> or <code>pg_repack</code> can restore it temporarily. Index-organized tables exist in Oracle (IOT).</p>
<p><b>SQLite.</b> Rowid tables store rows in a B+tree keyed by rowid (table B-tree with data in leaves); indexes are separate B-trees storing <code>(columns…, rowid)</code>. <code>WITHOUT ROWID</code> tables are clustered by PK and work best when rows are small (&lt; ~1/20 of a page) and the PK is the main access path.</p>
<p><b>Trade-off summary:</b> clustered = fastest PK point and range reads, ordered storage, but inserts must go in key order (random keys → splits) and updating the clustering key moves the row. Secondary = flexible, many per table, but each match costs an extra hop unless the index covers the query.</p>`,
    aiEra: `<p><b>What AI changes:</b> ORMs and AI code generators happily create tables with <code>UUID</code> string primary keys and no thought about clustering. Reviewing generated migrations for <b>PK type, PK order and secondary index pointer size</b> is now a core backend skill.</p>
<p><b>Use AI as a partner:</b> "Given this InnoDB schema and these 3 queries, which ones will do key lookups, and how would you change the PK or add covering columns?" — then confirm with <code>EXPLAIN FORMAT=TREE</code> / <code>EXPLAIN ANALYZE</code>.</p>
<p><b>Where AI goes wrong:</b> it claims Postgres has clustered indexes (it has a one-off <code>CLUSTER</code> command), says a table can have several clustered indexes, or forgets that InnoDB secondaries already contain the PK (and suggests adding <code>id</code> to an index needlessly). <b>What you must still own:</b> knowing your engine's storage model and choosing a clustering key from the real access pattern.</p>`,
    problems: [{
      title: 'Cluster the Order Items Table',
      level: 'Medium', tags: ['clustered index', 'without rowid', 'primary key design'], companies: ['Amazon', 'Walmart', 'Instacart'],
      statement: `<p><code>order_items(order_id, product_id, qty)</code> is read almost exclusively as "all items of order X" (cart page, invoice, shipping). Today it is a rowid table with a separate index on <code>(order_id, product_id)</code>. Redesign it so "all items of order X" is a single clustered range read with <b>no lookups</b>, and keep "which orders contain product Y" reasonably fast.</p>`,
      constraints: `<p>SQLite. 5,000 item rows, ~3 per order. (order_id, product_id) is unique.</p>`,
      example: `<p>Before: ${H.c('r', 'SEARCH order_items USING INDEX idx_items_order (order_id=?)')} — seek the index, then fetch each row by rowid.<br>After: ${H.c('g', 'SEARCH order_items USING PRIMARY KEY (order_id=?)')} — the rows are in the clustered leaves.</p>`,
      brute: { why: `<p>Without any index it is a full scan of all item rows for every cart view. With a rowid table + secondary index it is a seek plus one extra rowid lookup per item — a hop that exists only because the data is stored in rowid order rather than order_id order.</p>`, code: lab(`CREATE TABLE order_items (id INTEGER PRIMARY KEY, order_id INTEGER NOT NULL, product_id INTEGER NOT NULL, qty INTEGER NOT NULL);
INSERT INTO order_items (order_id, product_id, qty)
WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM n WHERE i < 5000)
SELECT (i + 2) / 3, (i * 37) % 400 + 1, 1 + i % 4 FROM n;
EXPLAIN QUERY PLAN SELECT * FROM order_items WHERE order_id = 77;     -- SCAN: brute force
CREATE INDEX idx_items_order ON order_items(order_id, product_id);
EXPLAIN QUERY PLAN SELECT * FROM order_items WHERE order_id = 77;     -- seek + rowid lookups`) },
      mcq: { q: 'Which primary key gives the best clustering for "all items of order X"?', options: ['<code>(order_id, product_id)</code>', '<code>(product_id, order_id)</code>', 'a random UUID', 'an auto-increment id'], answer: 0, explain: 'Leading with order_id puts every item of one order next to each other in the clustered B+tree; product_id makes it unique.' },
      hints: [`<p>Hint 1: the hottest query filters on order_id only — so the physical order should start with order_id.</p>`, `<p>Hint 2: SQLite clusters by the declared PRIMARY KEY when you add <code>WITHOUT ROWID</code>. The natural key <code>(order_id, product_id)</code> is unique, so no surrogate id is needed.</p>`, `<p>Hint 3: add a secondary index on product_id for the reverse question; its leaves automatically carry order_id (the PK), so "which orders contain product Y" is covered.</p>`],
      solution: {
        approach: `<p>Make the natural composite key the clustering key: <code>PRIMARY KEY (order_id, product_id) WITHOUT ROWID</code>. Items of one order become one contiguous leaf range — seek once, read 3 neighbours, done. A secondary index on product_id stores (product_id, order_id) and covers the reverse lookup without touching the table.</p>`,
        code: lab(`CREATE TABLE order_items (
  order_id   INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  qty        INTEGER NOT NULL CHECK (qty > 0),
  PRIMARY KEY (order_id, product_id)          -- clustering key: one order's items are neighbours
) WITHOUT ROWID;
INSERT INTO order_items
WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM n WHERE i < 5000)
SELECT (i + 2) / 3, (i * 37) % 400 + 1, 1 + i % 4 FROM n;

CREATE INDEX idx_items_product ON order_items(product_id);   -- leaf = (product_id, order_id)

EXPLAIN QUERY PLAN SELECT * FROM order_items WHERE order_id = 77;          -- SEARCH ... USING PRIMARY KEY
EXPLAIN QUERY PLAN SELECT order_id FROM order_items WHERE product_id = 9;  -- COVERING INDEX
SELECT * FROM order_items WHERE order_id = 77;`),
        complexity: `<p>Order lookup: O(log N) to the first item + O(k) adjacent entries, zero extra hops. Product lookup: O(log N + k) entirely inside the secondary index. Trade-off: inserts must place rows in (order_id, product_id) order — fine because new orders get increasing ids (append at the right edge).</p>`,
        followUps: ['What happens to this design if order ids are random UUIDv4?', 'Would you do the same in Postgres? (no clustered tables — use a composite index, maybe INCLUDE (qty) for index-only scans)']
      }
    }]
  });

  /* =====================================================================
     TOPIC 4 - Hash indexes vs B+trees
     ===================================================================== */
  topics.push({
    title: 'Hash Indexes vs B+tree Indexes',
    analogy: `<p>A <b>coat-check counter</b>: you hand over your coat and get ticket <b>#57</b>; when you come back the attendant walks straight to hook 57. Instant — that is a <b>hash index</b>: a formula turns the key into a slot number. But ask the attendant "bring me every coat from tickets 40 to 60 that arrived after 9pm" or "all coats whose owner's name starts with K" and the numbering is useless — the hooks are not arranged by name or time, so they must check every hook. A <b>B+tree</b> is a <b>sorted shelf</b>: slightly slower to find one item (a few signposts), but it can answer <i>ranges, prefixes and sorted order</i>.</p>`,
    explain: `<p>A <b>hash index</b> stores entries in <b>buckets</b>. To insert or find key <code>k</code>, compute <code>bucket = hash(k) mod number_of_buckets</code> and go straight there. Average cost <b>O(1)</b> for <b>equality</b> (<code>=</code>, and <code>IN (…)</code> as several equalities).</p>
<p>What it <b>cannot</b> do, because a good hash function deliberately <b>scatters</b> neighbouring keys:</p>
<ul>
<li>Range predicates: <code>&lt;</code>, <code>&gt;</code>, <code>BETWEEN</code> — 41 and 42 land in unrelated buckets.</li>
<li><code>ORDER BY</code>, <code>MIN</code>/<code>MAX</code> — there is no order to walk.</li>
<li>Prefix matches: <code>LIKE 'abc%'</code>.</li>
<li>Partial use of a multi-column key: a hash of <code>(a, b)</code> cannot be probed with only <code>a</code> — there is no left-prefix rule for hashes.</li>
</ul>
${H.table(['Need', 'Hash index', 'B+tree index'], [
  ['<code>WHERE token = ?</code>', '<span class="c-g">O(1), 1 bucket</span>', 'O(log N), 3–4 pages'],
  ['<code>WHERE created_at &gt; ?</code>', '<span class="c-r">unusable → full scan</span>', '<span class="c-g">seek + walk leaves</span>'],
  ['<code>ORDER BY x LIMIT 10</code>', '<span class="c-r">unusable</span>', '<span class="c-g">read 10 leaf entries</span>'],
  ['<code>LIKE \'ab%\'</code>', '<span class="c-r">unusable</span>', '<span class="c-g">range scan</span>'],
  ['UNIQUE constraint', 'Postgres: not supported', 'yes'],
  ['Where you meet it', 'Postgres <code>USING hash</code>, MySQL MEMORY tables, InnoDB adaptive hash index, hash joins, Redis/key-value stores', 'default everywhere']
])}
<p><b>Where hash indexes exist in practice:</b></p>
<ul>
<li><b>PostgreSQL</b> <code>CREATE INDEX … USING hash (col)</code> — crash-safe and replicated since PG 10. Single column, equality only, no UNIQUE. Can be smaller than a B-tree for <b>long keys</b> (it stores only a 4-byte hash code), e.g. long URLs.</li>
<li><b>MySQL</b>: the MEMORY engine supports <code>USING HASH</code>; InnoDB silently ignores <code>USING HASH</code> and builds a B-tree, but it has an automatic in-memory <b>Adaptive Hash Index</b> on top of hot B-tree pages.</li>
<li><b>SQLite</b>: B-trees only. The playground below therefore uses B-tree indexes and a Python simulation of a hash index.</li>
<li><b>Everywhere, implicitly</b>: the <b>hash join</b> operator builds a temporary in-memory hash table on the join key; key-value stores (Redis, DynamoDB partition keys, Bitcask) are hash-indexed at heart.</li>
</ul>
<p>Interview default: <b>"B+tree unless I only ever need exact-match lookups on a large key, and even then measure."</b></p>`,
    clues: [
      '"Only exact-match lookups, never ranges" (session tokens, API keys, short-URL codes) → hash index is a valid option',
      '"BETWEEN / ORDER BY / prefix LIKE / MIN-MAX" in the workload → must be a B+tree',
      '"Why don\'t databases use hash indexes by default?" → no ordering, no ranges, no left-prefix, resize cost, historically not crash-safe in PG',
      '"Design a key-value store / cache lookup" → hashing (O(1) equality), LSM or B-tree only if range scans are needed',
      '"Join two big tables on equality with no useful index" → planner builds a hash table (hash join)'
    ],
    code: [py(`# Toy comparison: hash index vs sorted (B+tree-like) index, counting "slots touched".
import bisect

keys = [15, 22, 8, 41, 29, 36, 3, 50, 17, 44, 26, 33]
BUCKETS = 7

# ---- hash index: bucket = key mod 7 ----
hash_index = {b: [] for b in range(BUCKETS)}
for k in keys:
    hash_index[k % BUCKETS].append(k)

def hash_equal(k):
    bucket = hash_index[k % BUCKETS]          # jump straight to one bucket
    return (k in bucket), 1                   # 1 bucket touched

def hash_range(lo, hi):
    found, touched = [], 0
    for b in range(BUCKETS):                  # no order -> must visit EVERY bucket
        touched += 1
        found += [k for k in hash_index[b] if lo <= k <= hi]
    return sorted(found), touched

# ---- sorted index (what the B+tree leaf level looks like) ----
sorted_keys = sorted(keys)

def tree_range(lo, hi):
    i = bisect.bisect_left(sorted_keys, lo)  # "descend" to the first key >= lo
    out = []
    while i < len(sorted_keys) and sorted_keys[i] <= hi:
        out.append(sorted_keys[i]); i += 1    # walk the leaves in order
    return out, len(out) + 1                  # entries read + the stop check

print("buckets:", hash_index)
print("hash  =29      ->", hash_equal(29))
print("hash  20..40   ->", hash_range(20, 40), "(every bucket visited)")
print("btree 20..40   ->", tree_range(20, 40), "(only the matching slice)")`, 'Hash vs sorted index (▶ Run)'),
    pg(`-- PostgreSQL: a hash index (equality only, single column, no UNIQUE)
CREATE INDEX idx_sessions_token_hash ON sessions USING hash (token);
EXPLAIN SELECT user_id FROM sessions WHERE token = 'f3a9...';      -- Index Scan using idx_sessions_token_hash
EXPLAIN SELECT user_id FROM sessions WHERE token > 'f';            -- cannot use it: Seq Scan

-- MySQL MEMORY engine supports HASH; InnoDB ignores USING HASH and builds a BTREE
CREATE TABLE lookup (code CHAR(8), val INT, INDEX USING HASH (code)) ENGINE = MEMORY;
SHOW ENGINE INNODB STATUS;   -- section "INSERT BUFFER AND ADAPTIVE HASH INDEX"`, 'Hash indexes in Postgres / MySQL (not runnable here)'),
    shop(`-- SQLite only has B-trees, and a B-tree handles equality AND ranges:
CREATE INDEX idx_products_sku ON products(sku);
EXPLAIN QUERY PLAN SELECT * FROM products WHERE sku = 'SKU-00042';                     -- equality seek
EXPLAIN QUERY PLAN SELECT * FROM products WHERE sku BETWEEN 'SKU-00100' AND 'SKU-00110'; -- range seek
EXPLAIN QUERY PLAN SELECT sku FROM products ORDER BY sku LIMIT 3;                       -- ordered walk
SELECT sku, name FROM products WHERE sku BETWEEN 'SKU-00100' AND 'SKU-00103';`, 'One B-tree serves =, ranges and ORDER BY')],
    codeTitle: ['Simulation', 'Postgres / MySQL syntax', 'SQLite B-tree does it all'],
    viz: [{
      title: 'Hash buckets: instant equality, useless for ranges',
      input: '15 22 8 41 29 36 3 50 17 44; 29; 20-40',
      inputLabel: 'keys ; key to find ; range lo-hi',
      gen: function (input) {
        var parts = String(input).split(';');
        if (parts.length !== 3) throw new Error('Format: keys ; find ; lo-hi  e.g. 15 22 8 41 29; 29; 20-40');
        var keys = parts[0].trim().split(/[\s,]+/).map(Number), find = Number(parts[1].trim()), rg = parts[2].trim().split('-').map(Number);
        if (!keys.length || keys.some(function (k) { return isNaN(k) || k < 0 || k > 999; }) || keys.length > 14) throw new Error('Use 1-14 keys between 0 and 999');
        if (isNaN(find) || rg.length !== 2 || rg.some(isNaN) || rg[0] > rg[1]) throw new Error('find must be a number and the range lo-hi with lo ≤ hi');
        var B = 7, buckets = [], i, frames = [];
        for (i = 0; i < B; i++) buckets.push([]);
        var show = function () { return buckets.map(function (b) { return b.length ? b.join(',') : '—'; }); };
        var bl = []; for (i = 0; i < B; i++) bl.push('bucket ' + i);
        frames.push({ narr: 'A hash index with <b>7 buckets</b>. Hash function (toy version): <code>bucket = key mod 7</code>. Real ones use a strong hash (e.g. Postgres hashes to 32 bits), so neighbouring keys land far apart on purpose.', parts: [
          { type: 'array', label: 'buckets', values: show(), idxLabels: bl }
        ] });
        keys.forEach(function (k) {
          var b = k % B; buckets[b].push(k);
          var hl = {}; hl[b] = 'cur';
          frames.push({ narr: 'Insert <b>' + k + '</b>: ' + k + ' mod 7 = <b>' + b + '</b> → append to bucket ' + b + '.' + (buckets[b].length > 1 ? ' Bucket already had keys — a <b>collision</b>; they share the bucket and are compared one by one.' : ''), parts: [
            { type: 'array', label: 'buckets', values: show(), idxLabels: bl, hl: hl }
          ] });
        });
        var fb = find % B, hit = buckets[fb].indexOf(find) >= 0, h1 = {}; h1[fb] = hit ? 'ok' : 'bad';
        frames.push({ narr: '<b>Equality</b> <code>WHERE key = ' + find + '</code>: hash it → bucket <b>' + fb + '</b>, look only there. ' + (hit ? '<span class="c-g">Found</span>' : '<span class="c-r">Not present</span>') + ' after touching <b>1</b> bucket, no matter how many keys exist. This is where hash indexes shine.', parts: [
          { type: 'array', label: 'buckets', values: show(), idxLabels: bl, hl: h1 },
          { type: 'vars', vals: { buckets_touched: 1, found: hit ? 'yes' : 'no' } }
        ] });
        var lo = rg[0], hi = rg[1], got = [], h2 = {};
        for (i = 0; i < B; i++) {
          var inB = buckets[i].filter(function (k) { return k >= lo && k <= hi; });
          got = got.concat(inB);
          h2[i] = inB.length ? 'ok' : 'bad';
          var h3 = Object.assign({}, h2); h3[i] = inB.length ? 'ok' : 'cur';
          frames.push({ narr: '<b>Range</b> <code>WHERE key BETWEEN ' + lo + ' AND ' + hi + '</code>: hashing tells us nothing about where in-range keys live, so check bucket ' + i + ' → ' + (inB.length ? 'keep ' + inB.join(', ') : 'nothing useful (wasted read)') + '.', parts: [
            { type: 'array', label: 'buckets (all must be visited)', values: show(), idxLabels: bl, hl: h3 },
            { type: 'vars', vals: { buckets_touched: i + 1, found_so_far: got.length } }
          ] });
        }
        var sorted = keys.slice().sort(function (a, b) { return a - b; }), hs = {}, first = -1;
        sorted.forEach(function (k, j) { if (k >= lo && k <= hi) { hs[j] = 'ok'; if (first < 0) first = j; } });
        var treeCost = 2 + Math.max(1, Object.keys(hs).length);
        frames.push({ narr: 'Same range on a <b>B+tree</b>: keys are kept sorted in the leaves, so descend to ' + lo + ' and walk right until a key exceeds ' + hi + '. Only the matching slice is read, and it comes out <b>already sorted</b>: [' + got.slice().sort(function (a, b) { return a - b; }).join(', ') + '].', parts: [
          { type: 'array', label: 'B+tree leaf level (sorted)', values: sorted, hl: hs, range: first >= 0 ? [first, first + Object.keys(hs).length - 1] : undefined }
        ] });
        frames.push({ narr: 'Scorecard. Hash: equality = 1 bucket, range = all ' + B + ' buckets (a full scan in disguise). B+tree: equality ≈ height (3–4 pages in real life), range ≈ height + matching leaves. That asymmetry is why B+tree is the default index type everywhere.', parts: [
          { type: 'bars', label: 'units of work', values: [1, B, 3, treeCost], idxLabels: ['hash =', 'hash range', 'B+tree =', 'B+tree range'], hl: { 0: 'ok', 1: 'bad', 2: 'cur', 3: 'ok' } }
        ] });
        return frames;
      }
    }],
    examples: [
      { title: 'Session tokens: equality only', html: `<p><code>SELECT user_id FROM sessions WHERE token = ?</code> — 64-char random tokens, never ranged, never sorted. A Postgres hash index stores 4-byte hash codes instead of 64-byte keys, so it can be noticeably smaller than a B-tree. But expiry cleanup (<code>WHERE expires_at &lt; now()</code>) is a range → that column needs a B-tree. One table, two index types, each for its job.</p>` },
      { title: 'Short-URL service', html: `<p>Lookup <code>WHERE code = 'aZ3k9Q'</code> is pure equality, and the code is the primary key. In a relational DB a B-tree PK is already O(log N) ≈ 3 pages with the top levels cached — fine. In a key-value store (DynamoDB, Redis) the code is a <b>hash partition key</b>: O(1) routing to a partition and a hash lookup inside it. Analytics like "codes created this week" then need a separate sorted index (e.g. a DynamoDB GSI with a sort key on created_at).</p>` },
      { title: 'Hash join: the hash table the planner builds for you', html: `<p>Joining two large tables on equality with no helpful index, Postgres/MySQL 8.0.18+/SQL Server build a temporary <b>hash table</b> on the smaller input's join key and probe it with each row of the bigger input: O(N + M) instead of O(N × M). It is a per-query hash index, thrown away afterwards. SQLite instead builds a temporary B-tree "automatic index" for nested-loop joins.</p>`, code: shop(`-- No index on orders.product_id: SQLite builds a temporary (automatic) index for the join.
EXPLAIN QUERY PLAN
SELECT p.category, COUNT(*) FROM products p JOIN orders o ON o.product_id = p.id
WHERE p.price_cents > 90000 GROUP BY p.category;`) }
    ],
    deepDive: `<p><b>Postgres hash index internals.</b> Buckets are pages; the index stores the 32-bit hash code (not the key) plus TID, and re-checks the heap tuple for the real value. It grows by <b>linear hashing</b> — splitting one bucket at a time instead of rehashing everything — with overflow pages for collisions. Before PG 10 hash indexes were not WAL-logged (unsafe after a crash, not replicated) — the origin of the folklore "never use hash indexes". Today they are safe but still: single column, no uniqueness, no index-only scans, no ordering.</p>
<p><b>Collisions and skew.</b> Many identical keys (low-cardinality column) all hash to one bucket → long overflow chains → O(N) worst case. A B-tree degrades gracefully (with dedup). Hash indexes also need periodic resizing; a B-tree grows one split at a time.</p>
<p><b>InnoDB Adaptive Hash Index (AHI).</b> InnoDB watches B-tree lookups; for hot pages with repeated equal-prefix searches it builds an in-memory hash from key prefix → leaf record, skipping the tree descent. Great for read-heavy point lookups, but its latch was a contention point under heavy writes, so many teams disable it (<code>innodb_adaptive_hash_index=OFF</code>; MySQL 8.4 turned it off by default).</p>
<p><b>Beyond B-tree and hash.</b> Postgres also offers GIN (inverted index for arrays/JSONB/full-text), GiST/SP-GiST (geometric, ranges, nearest-neighbour), BRIN (tiny min/max summaries per block range for huge append-only tables), and Bloom. Vector databases use HNSW / IVF indexes for approximate nearest-neighbour search (pgvector supports both). Picking the index <i>type</i> from the predicate type is an expert-level skill.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI features push databases toward new index types — <b>vector indexes</b> (HNSW, IVFFlat in pgvector) sit next to B-trees and hashes, and you will be asked which index serves which predicate: <code>=</code> → hash/B-tree, ranges → B-tree, <code>@&gt;</code> on JSONB → GIN, <code>ORDER BY embedding &lt;-&gt; $1 LIMIT 10</code> → HNSW.</p>
<p><b>Use AI as a partner:</b> list your predicates and ask the assistant to map each to an index type, then challenge it: "what breaks if I also need ORDER BY created_at?"</p>
<p><b>Where AI goes wrong:</b> it recommends <code>USING HASH</code> on InnoDB (silently ignored), suggests hash indexes for columns also used in ranges, or claims hash indexes support UNIQUE in Postgres. <b>What you must still own:</b> knowing that a hash destroys order, and that order is what ranges, sorting and prefix matching all depend on.</p>`,
    problems: [{
      title: 'Hash or B-tree for the Sessions Table?',
      level: 'Easy', tags: ['hash index', 'b-tree', 'index type choice'], companies: ['Stripe', 'Okta', 'Atlassian'],
      statement: `<p>A <code>sessions(token, user_id, expires_at)</code> table serves two queries: (1) every API request: <code>SELECT user_id FROM sessions WHERE token = ?</code>; (2) a cron job every minute: <code>DELETE FROM sessions WHERE expires_at &lt; ?</code>. Which index type fits each, and what can you build in SQLite (B-trees only)?</p>`,
      constraints: `<p>Tokens are 40-character random strings and unique. 3,000 sessions in the demo; millions in production.</p>`,
      example: `<p>Query 1 is ${H.c('g', 'equality only')} → hash or B-tree both work; UNIQUE requires B-tree in Postgres. Query 2 is a ${H.c('r', 'range')} → hash is useless, B-tree on expires_at needed.</p>`,
      brute: { why: `<p>No indexes: every API request scans all sessions to find one token, and the cleanup scans everything to find expired ones. Request latency grows with the number of logged-in users — exactly the wrong scaling.</p>`, code: lab(`CREATE TABLE sessions (token TEXT NOT NULL, user_id INTEGER NOT NULL, expires_at TEXT NOT NULL);
INSERT INTO sessions WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM n WHERE i < 3000)
SELECT hex(randomblob(20)), i % 900, datetime('2026-10-14', '+' || (i % 720) || ' minutes') FROM n;
EXPLAIN QUERY PLAN SELECT user_id FROM sessions WHERE token = 'ABC';
EXPLAIN QUERY PLAN DELETE FROM sessions WHERE expires_at < '2026-10-14 03:00:00';`) },
      mcq: { q: 'Why can\'t a hash index on expires_at speed up <code>expires_at &lt; ?</code>?', options: ['Hashing scatters neighbouring timestamps into unrelated buckets, so there is no "start here, walk right"', 'Hash indexes do not support timestamps', 'Hash indexes are only for primary keys', 'It can, if the table is small'], answer: 0, explain: 'A range needs ordered storage. Hash order is random by design.' },
      hints: [`<p>Hint 1: classify each predicate: equality or range?</p>`, `<p>Hint 2: equality on a unique token → a UNIQUE B-tree also enforces uniqueness (Postgres hash indexes cannot be UNIQUE). Range on expires_at → B-tree.</p>`, `<p>Hint 3: in SQLite: <code>CREATE UNIQUE INDEX … (token)</code> and <code>CREATE INDEX … (expires_at)</code>; check both plans become SEARCH.</p>`],
      solution: {
        approach: `<p>Query 1: equality on a unique key. In Postgres a hash index would work, but a <b>UNIQUE B-tree</b> is the better default because it also enforces uniqueness and the top levels are cached (3–4 pages ≈ 1 I/O). Query 2: a range on <code>expires_at</code> → B-tree is mandatory. In SQLite both are B-trees.</p>`,
        code: lab(`CREATE TABLE sessions (token TEXT NOT NULL, user_id INTEGER NOT NULL, expires_at TEXT NOT NULL);
INSERT INTO sessions WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM n WHERE i < 3000)
SELECT hex(randomblob(20)), i % 900, datetime('2026-10-14', '+' || (i % 720) || ' minutes') FROM n;

CREATE UNIQUE INDEX ux_sessions_token ON sessions(token);   -- equality + uniqueness
CREATE INDEX idx_sessions_expires ON sessions(expires_at);   -- range for the cleanup job

EXPLAIN QUERY PLAN SELECT user_id FROM sessions WHERE token = 'ABC';                -- SEARCH ... ux_sessions_token (token=?)
EXPLAIN QUERY PLAN DELETE FROM sessions WHERE expires_at < '2026-10-14 03:00:00';  -- SEARCH ... (expires_at<?)
DELETE FROM sessions WHERE expires_at < '2026-10-14 03:00:00';
SELECT COUNT(*) AS remaining FROM sessions;`),
        alt: [pg(`-- PostgreSQL variant: hash for the hot equality path (no uniqueness needed if tokens are random 160-bit values)
CREATE INDEX idx_sessions_token_hash ON sessions USING hash (token);
CREATE INDEX idx_sessions_expires ON sessions (expires_at);`, 'PostgreSQL alternative')],
        complexity: `<p>Token lookup: O(log N) B-tree (O(1) average with hash). Cleanup: O(log N + k) for k expired rows instead of O(N). Each insert now updates 2 indexes — acceptable for a lookup-heavy table.</p>`,
        followUps: ['Would you even store sessions in SQL? (Redis with TTL = hash + automatic expiry)', 'Why might a hash index be smaller than a B-tree for 64-byte tokens?']
      }
    }]
  });

  /* =====================================================================
     TOPIC 5 - Composite indexes and the left-prefix rule
     ===================================================================== */
  var CP_COLS = ['last_name', 'first_name', 'city'];
  function cpEntries() {
    var out = [], id = 1;
    ['Garcia', 'Kim', 'Lee', 'Patel'].forEach(function (ln) {
      ['Asha', 'Ben'].forEach(function (fn) {
        ['Pune', 'Rio'].forEach(function (c) { out.push([ln, fn, c, id]); id++; });
      });
    });
    // scramble the ids so they look like real rowids
    return out.map(function (r, i) { return [r[0], r[1], r[2], (i * 7) % 16 + 101]; });
  }

  topics.push({
    title: 'Composite Indexes & the Left-Prefix Rule',
    analogy: `<p>A paper <b>phone book</b> is sorted by <b>(last name, first name, city)</b>. Finding all the <b>Lees</b>? Easy — they are one block of pages. <b>Lee, Ben</b>? Even easier — a smaller block inside the Lee block. But finding everyone whose <b>first name is Ben</b>? The Bens are scattered across every last name — the phone book's order is useless, you must read the whole thing. And "Lee, anyone, living in Pune"? You can jump to the Lee block, but inside it the Pune people are scattered among the first names, so you read the entire Lee block and check each city. That is the whole <b>left-prefix rule</b> in one picture.</p>`,
    explain: `<p>A <b>composite (multi-column) index</b> on <code>(a, b, c)</code> stores entries sorted by <code>a</code>, then by <code>b</code> among equal <code>a</code>, then by <code>c</code> among equal <code>(a, b)</code> — exactly like sorting a spreadsheet by three columns. It is <b>one</b> B+tree, not three.</p>
<p><b>Left-prefix rule:</b> the index can be <b>seeked</b> using a leading run of its columns, left to right, with no gaps:</p>
${H.table(['WHERE clause', 'Seek uses', 'Why'], [
  ['<code>a = 1</code>', '<span class="c-g">a</span>', 'leftmost column → one contiguous block'],
  ['<code>a = 1 AND b = 2</code>', '<span class="c-g">a, b</span>', 'smaller block inside the a-block'],
  ['<code>a = 1 AND b = 2 AND c = 3</code>', '<span class="c-g">a, b, c</span>', 'full key'],
  ['<code>b = 2</code>', '<span class="c-r">nothing (scan)</span>', 'b-values are scattered across all a-values'],
  ['<code>a = 1 AND c = 3</code>', '<span class="c-y">a only</span>, then c filtered inside the block', 'gap at b breaks the prefix'],
  ['<code>a &gt; 1 AND b = 2</code>', '<span class="c-y">a (range)</span>, b only filtered', 'after a range, the next column is not sorted across the range'],
  ['<code>b = 2 AND a = 1</code>', '<span class="c-g">a, b</span>', 'order in the WHERE clause does not matter — the planner reorders']
])}
<p><b>Choosing the column order — the ESR guideline</b> (Equality, Sort, Range):</p>
<ol>
<li><b>Equality</b> columns first (<code>customer_id = ?</code>, <code>status = ?</code>). Among them, put first the ones that appear in the most queries, so one index serves many queries.</li>
<li>Then the <b>Sort</b> column (<code>ORDER BY created_at</code>) — after equalities are fixed, the entries are already in that order, so no sort step is needed.</li>
<li>Then <b>Range</b> columns (<code>created_at &gt; ?</code>, <code>price BETWEEN</code>) — a range ends the seekable prefix, so it goes last.</li>
</ol>
<p>"Put the most selective column first" is a common myth: for <b>equality</b> predicates the order between equality columns hardly changes the seek cost (the combined block is the same size). What matters is <b>which queries can use the prefix</b> and that ranges come last.</p>
<p>A composite index <code>(a, b)</code> also makes a single-column index on <code>(a)</code> <b>redundant</b> — drop it. But it does <i>not</i> replace an index on <code>(b)</code>.</p>`,
    clues: [
      '"Which column should go first in the composite index?" → equality columns used by the most queries, then ORDER BY column, then range column (ESR)',
      '"The index on (a, b) is not used for WHERE b = ?" → left-prefix rule; need an index starting with b (or a skip scan)',
      '"WHERE x = ? ORDER BY y LIMIT n is slow" → composite (x, y) removes the sort and stops after n rows',
      '"We have indexes on (a) and on (a, b)" → (a) is redundant',
      'Plan shows only the first column used, e.g. <code>(last_name=?)</code> even though more columns are filtered → gap or range broke the prefix'
    ],
    code: [shop(`CREATE INDEX idx_name ON customers(last_name, first_name, city);

EXPLAIN QUERY PLAN SELECT * FROM customers WHERE last_name = 'Lee';                          -- (last_name=?)
EXPLAIN QUERY PLAN SELECT * FROM customers WHERE last_name = 'Lee' AND first_name = 'Ben';   -- (last_name=? AND first_name=?)
EXPLAIN QUERY PLAN SELECT * FROM customers WHERE first_name = 'Ben' AND last_name = 'Lee';   -- same: WHERE order is irrelevant
EXPLAIN QUERY PLAN SELECT * FROM customers WHERE first_name = 'Ben';                         -- SCAN: no left prefix
EXPLAIN QUERY PLAN SELECT * FROM customers WHERE last_name = 'Lee' AND city = 'Pune';        -- only (last_name=?), city filtered
EXPLAIN QUERY PLAN SELECT * FROM customers WHERE last_name > 'K' AND first_name = 'Ben';     -- range on last_name ends the prefix

-- Row counts that explain the plans:
SELECT
  (SELECT COUNT(*) FROM customers WHERE last_name = 'Lee')                        AS lee_block,
  (SELECT COUNT(*) FROM customers WHERE last_name = 'Lee' AND first_name = 'Ben') AS lee_ben_block,
  (SELECT COUNT(*) FROM customers WHERE first_name = 'Ben')                       AS bens_scattered;`, 'Left-prefix rule, live'),
    shop(`-- ESR: Equality (customer_id, status) → Sort (created_at). No TEMP B-TREE for the ORDER BY,
-- and the scan stops after 5 entries because of LIMIT.
CREATE INDEX idx_orders_cust_status_created ON orders(customer_id, status, created_at);
EXPLAIN QUERY PLAN
SELECT id, total_cents, created_at FROM orders
WHERE customer_id = 42 AND status = 'delivered'
ORDER BY created_at DESC LIMIT 5;
SELECT id, total_cents, created_at FROM orders
WHERE customer_id = 42 AND status = 'delivered'
ORDER BY created_at DESC LIMIT 5;`, 'Equality → Sort → Range column order')],
    codeTitle: ['Which prefixes are usable?', 'ESR in practice'],
    viz: [{
      title: 'Left-prefix matching on index (last_name, first_name, city)',
      input: 'last_name=Lee, city=Pune',
      inputLabel: 'conditions, e.g. last_name=Lee, first_name=Ben  |  first_name=Ben  |  last_name>K, first_name=Asha',
      gen: function (input) {
        var conds = {}, txt = String(input).trim();
        if (!txt) throw new Error('Type at least one condition like last_name=Lee');
        txt.split(',').forEach(function (c) {
          var m = c.trim().match(/^(last_name|first_name|city)\s*(=|>|<)\s*([A-Za-z]+)$/i);
          if (!m) throw new Error('Use column=value / column>value / column<value with columns last_name, first_name, city');
          conds[m[1].toLowerCase()] = { op: m[2], v: m[3].charAt(0).toUpperCase() + m[3].slice(1).toLowerCase() };
        });
        var E = cpEntries(), cols = ['last_name', 'first_name', 'city', '→ rowid'], frames = [];
        var test = function (val, c) { return c.op === '=' ? val === c.v : c.op === '>' ? val > c.v : val < c.v; };
        frames.push({ narr: 'The index stores 16 entries sorted by <b>last_name</b>, then <b>first_name</b>, then <b>city</b> — like a phone book. Query: <code>WHERE ' + txt.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</code>.', parts: [
          { type: 'table', label: 'idx(last_name, first_name, city) — leaf entries in order', columns: cols, rows: E }
        ] });
        // work out the seekable prefix
        var seek = [], filter = [], stopped = false;
        CP_COLS.forEach(function (c) {
          if (!conds[c]) { stopped = true; return; }
          if (stopped) { filter.push(c); return; }
          seek.push(c);
          if (conds[c].op !== '=') stopped = true;
        });
        Object.keys(conds).forEach(function (c) { if (seek.indexOf(c) < 0 && filter.indexOf(c) < 0) filter.push(c); });
        var seekTxt = seek.map(function (c) { return c + conds[c].op + '?'; }).join(' AND ');
        frames.push({ narr: seek.length ? 'Walk the index columns left to right: ' + seek.map(function (c) { return '<b>' + c + '</b> (' + (conds[c].op === '=' ? 'equality ✔' : 'range — the prefix ends here') + ')'; }).join(', ') + (filter.length ? '. Columns <b>' + filter.join(', ') + '</b> come after a gap or a range, so they cannot narrow the seek — they will only be <b>checked</b> on each entry inside the block.' : '. Every condition is part of the seek.') : 'The first index column <b>last_name</b> has no condition, so there is <b>no left prefix</b>. The matching entries are scattered all over the index; a seek is impossible.', parts: [
          { type: 'vars', label: 'planner analysis', vals: { seek_columns: seek.join(', ') || 'none', filter_only: filter.join(', ') || 'none', sqlite_plan: seek.length ? 'SEARCH USING INDEX (' + seekTxt + ')' : 'SCAN (table or full index)' }, hl: { seek_columns: seek.length ? 'ok' : 'bad' } }
        ] });
        var block = [], hl = {}, i;
        if (seek.length) {
          for (i = 0; i < E.length; i++) {
            var inBlock = seek.every(function (c) { return test(E[i][CP_COLS.indexOf(c)], conds[c]); });
            if (inBlock) { block.push(i); hl[i] = 'win'; }
          }
          frames.push({ narr: 'Seek lands on one <b>contiguous block</b> of ' + block.length + ' entries (blue) — that is what sorting by the leading column(s) buys you. Everything outside the block is never read.', parts: [
            { type: 'table', label: 'block found by the seek', columns: cols, rows: E, hl: hl }
          ] });
        } else {
          for (i = 0; i < E.length; i++) block.push(i);
        }
        var examined = 0, matches = 0, hl2 = seek.length ? Object.assign({}, hl) : {};
        for (var b = 0; b < block.length; b++) {
          var r = E[block[b]], ok = Object.keys(conds).every(function (c) { return test(r[CP_COLS.indexOf(c)], conds[c]); });
          examined++; if (ok) matches++;
          hl2[block[b]] = ok ? 'ok' : 'bad';
          if (filter.length || !seek.length) {
            var view = Object.assign({}, hl2); view[block[b]] = ok ? 'ok' : 'cur';
            frames.push({ narr: (seek.length ? 'Inside the block' : 'Full index scan') + ', entry ' + (b + 1) + ': (' + r.slice(0, 3).join(', ') + ') → ' + (ok ? '<span class="c-g">matches every condition</span>' : 'fails a condition, skip') + '.' + (!seek.length && ok ? ' Matches are <b>scattered</b> — that is why no seek was possible.' : ''), parts: [
              { type: 'table', label: seek.length ? 'filtering inside the block' : 'reading every entry', columns: cols, rows: E, hl: view },
              { type: 'vars', vals: { examined: examined, matches: matches } }
            ] });
          }
        }
        if (!filter.length && seek.length) frames.push({ narr: 'No leftover conditions: every entry in the block is a match. <b>' + matches + '</b> matches, ' + examined + ' entries examined — zero waste.', parts: [
          { type: 'table', label: 'result', columns: cols, rows: E, hl: hl2 }
        ] });
        frames.push({ narr: 'Result: <b>' + matches + '</b> matching entries; <b>' + examined + '</b> of 16 examined. ' + (seek.length ? (filter.length ? 'To avoid examining the misses, reorder the index so the filtered column joins the prefix (e.g. put equality columns before the gap/range).' : 'Perfect prefix use.') : 'Fix: an index whose <b>first</b> column is the one you filter on (or, in some engines, a skip scan when the leading column has very few values).'), parts: [
          { type: 'bars', label: 'entries', values: [16, examined, matches], idxLabels: ['in index', 'examined', 'matched'], hl: { 1: examined > matches ? 'bad' : 'ok', 2: 'ok' } }
        ] });
        return frames;
      }
    }],
    examples: [
      { title: '"Latest 5 orders of a customer" — (customer_id, created_at)', html: `<p>With only <code>(customer_id)</code>: seek the customer's ~10 orders, fetch them all, sort, keep 5. With <code>(customer_id, created_at)</code>: the customer's entries are already in date order; read the last 5 backwards and stop. For a customer with 50,000 orders that is 5 entries read instead of 50,000 plus a sort.</p>`, code: shop(`CREATE INDEX idx_oc ON orders(customer_id);
EXPLAIN QUERY PLAN SELECT id FROM orders WHERE customer_id = 7 ORDER BY created_at DESC LIMIT 5;  -- + TEMP B-TREE (sort)
CREATE INDEX idx_occ ON orders(customer_id, created_at);
EXPLAIN QUERY PLAN SELECT id FROM orders WHERE customer_id = 7 ORDER BY created_at DESC LIMIT 5;  -- no sort step`) },
      { title: 'Equality before range, not the other way round', html: `<p>Query: <code>WHERE customer_id = 42 AND created_at &gt;= '2026-05-01'</code>. Index <code>(customer_id, created_at)</code> seeks <code>(customer_id=? AND created_at&gt;?)</code> — a tight block. Index <code>(created_at, customer_id)</code> can only seek <code>created_at&gt;?</code> (≈ half the table!) and then filter customer_id entry by entry. Same two columns, wildly different cost.</p>`, code: shop(`CREATE INDEX idx_bad ON orders(created_at, customer_id);
EXPLAIN QUERY PLAN SELECT id FROM orders INDEXED BY idx_bad WHERE customer_id = 42 AND created_at >= '2026-05-01';
CREATE INDEX idx_good ON orders(customer_id, created_at);
EXPLAIN QUERY PLAN SELECT id FROM orders WHERE customer_id = 42 AND created_at >= '2026-05-01';
SELECT COUNT(*) AS rows_after_may FROM orders WHERE created_at >= '2026-05-01';`) },
      { title: 'One composite vs two single-column indexes', html: `<p>Indexes on <code>(customer_id)</code> and <code>(status)</code> separately: for <code>WHERE customer_id = 42 AND status = 'paid'</code> SQLite and MySQL usually pick <b>one</b> of them and filter the other column row by row (MySQL can sometimes "index merge", Postgres can "BitmapAnd" both — both cost more than a single composite seek). A composite <code>(customer_id, status)</code> seeks both at once. Rule: <b>queries that filter on several columns together want one composite index.</b></p>`, code: shop(`CREATE INDEX idx_c ON orders(customer_id);
CREATE INDEX idx_s ON orders(status);
EXPLAIN QUERY PLAN SELECT * FROM orders WHERE customer_id = 42 AND status = 'paid';   -- uses ONE index
CREATE INDEX idx_cs ON orders(customer_id, status);
EXPLAIN QUERY PLAN SELECT * FROM orders WHERE customer_id = 42 AND status = 'paid';   -- both columns in the seek`) }
    ],
    deepDive: `<p><b>After a range, later columns are still useful — as filters.</b> With <code>(a, b)</code> and <code>a &gt; 5 AND b = 2</code>, the engine seeks on <code>a &gt; 5</code> and checks <code>b</code> on each index entry <i>before</i> fetching the row (MySQL calls this <b>Index Condition Pushdown</b>, "Using index condition"; Postgres shows it as an Index Cond/Filter on the index). Cheaper than fetching rows, but still reads the whole range.</p>
<p><b>Skip scan.</b> If the leading column has very few distinct values, an engine can seek once per distinct value: Oracle (long ago), MySQL 8.0.13+ ("Using index for skip scan"), SQLite (needs <code>ANALYZE</code> statistics showing ≥ 18 rows per leading value), and <b>PostgreSQL 18</b> (2025) for B-tree. It turns "no left prefix" into k small seeks — useful, but not a substitute for the right index.</p>
<p><b>IN lists behave like several equalities.</b> <code>a IN (1,2,3) AND b = 7</code> on <code>(a, b)</code> is three seeks on (a, b). But <code>a IN (…) ORDER BY b</code> loses the free ordering (the three blocks must be merged/sorted).</p>
<p><b>Sort direction.</b> <code>ORDER BY a ASC, b DESC</code> cannot be served by a plain <code>(a, b)</code> index scanned in one direction; create <code>(a ASC, b DESC)</code> (supported in Postgres, MySQL 8+, SQLite, SQL Server). Fully reversed order (<code>a DESC, b DESC</code>) is fine — scan backwards.</p>
<p><b>GROUP BY.</b> <code>GROUP BY a, b</code> can stream groups from an <code>(a, b)</code> index without hashing or sorting. Combine with covering (next topic) for "loose index scans".</p>
<p><b>Cost of width.</b> Each extra column makes entries bigger (lower fanout) and adds write cost when that column changes. Typical composite indexes have 2–4 columns; 6+ is usually a smell unless it is a deliberate covering index.</p>`,
    aiEra: `<p><b>What AI changes:</b> index advisors (and LLMs) are good at proposing composite indexes from a query log, but they optimise query by query. Your job is the <b>portfolio view</b>: one well-ordered composite index can serve five queries through its prefixes, while five AI-suggested indexes cost five times the writes.</p>
<p><b>Use AI as a partner:</b> "Here are 8 queries on <code>orders</code>. Propose at most 3 indexes; for each query, say which index and which prefix columns it uses, and whether a sort is avoided." Then verify every claim with <code>EXPLAIN QUERY PLAN</code>.</p>
<p><b>Where AI goes wrong:</b> it repeats the "most selective column first" myth, places range columns before equality columns, and forgets that <code>(a, b)</code> makes <code>(a)</code> redundant. <b>What you must still own:</b> the left-prefix rule, ESR ordering, and reading <code>(col=? AND col2&gt;?)</code> in a plan to see exactly how much of the index was used.</p>`,
    problems: [{
      title: 'Index for a Filtered, Sorted Order Feed',
      level: 'Medium', tags: ['composite index', 'ESR', 'order by'], companies: ['Uber', 'Swiggy', 'DoorDash'],
      statement: `<p>The order history screen runs:</p><p><code>SELECT id, total_cents, created_at FROM orders WHERE customer_id = ? AND status = 'delivered' ORDER BY created_at DESC LIMIT 5</code></p><p>Design a single index so the query seeks on both filters and needs <b>no sort step</b>. Explain why <code>(created_at, customer_id, status)</code> is wrong.</p>`,
      constraints: `<p>One index. Shop database. Prove it with EXPLAIN QUERY PLAN (no <code>USE TEMP B-TREE FOR ORDER BY</code> line).</p>`,
      example: `<p>Customer 42 → 5 rows, newest first: ${H.c('g', '14839 | 49143 | 2026-09-17 23:07')}, 4839 | 29143 | 2026-09-07 … Plan wanted: ${H.c('g', 'SEARCH orders USING INDEX … (customer_id=? AND status=?)')} and nothing else.</p>`,
      brute: { why: `<p>No index: scan all 20,000 orders, keep customer 42's delivered ones, sort them with a temporary B-tree, return 5. With the wrong order <code>(created_at, customer_id, status)</code> the planner can only walk the <i>entire</i> index in date order hoping to meet customer 42 — still a full (index) scan, because the leading column has no equality condition.</p>`, code: shop(`EXPLAIN QUERY PLAN
SELECT id, total_cents, created_at FROM orders
WHERE customer_id = 42 AND status = 'delivered' ORDER BY created_at DESC LIMIT 5;   -- SCAN + TEMP B-TREE
CREATE INDEX idx_wrong ON orders(created_at, customer_id, status);
EXPLAIN QUERY PLAN
SELECT id, total_cents, created_at FROM orders
WHERE customer_id = 42 AND status = 'delivered' ORDER BY created_at DESC LIMIT 5;   -- SCAN ... USING INDEX (whole index)`) },
      mcq: { q: 'Following ESR, which order is right?', options: ['(customer_id, status, created_at)', '(created_at, customer_id, status)', '(status, created_at, customer_id)', '(created_at, status)'], answer: 0, explain: 'Equality columns (customer_id, status) first, then the sort column created_at. Any order between the two equality columns works for this query; customer_id first also serves "all orders of a customer".' },
      hints: [`<p>Hint 1: which predicates are equalities, and which column is only used for sorting?</p>`, `<p>Hint 2: after fixing customer_id and status, the remaining entries in a <code>(customer_id, status, created_at)</code> index are already sorted by created_at.</p>`, `<p>Hint 3: DESC is fine — the leaf chain can be walked backwards. LIMIT 5 means only 5 entries are read.</p>`],
      solution: {
        approach: `<p>ESR: put the two equality columns first and the sort column last: <code>(customer_id, status, created_at)</code>. The seek finds the (42, 'delivered') block, whose entries are ordered by created_at; the engine walks it from the end and stops after 5. Putting customer_id first (instead of status) also lets the same index serve "all orders of customer X" through its prefix.</p>`,
        code: shop(`CREATE INDEX idx_orders_cust_status_created ON orders(customer_id, status, created_at);

EXPLAIN QUERY PLAN
SELECT id, total_cents, created_at FROM orders
WHERE customer_id = 42 AND status = 'delivered'
ORDER BY created_at DESC LIMIT 5;
-- SEARCH orders USING INDEX idx_orders_cust_status_created (customer_id=? AND status=?)   (no TEMP B-TREE)

SELECT id, total_cents, created_at FROM orders
WHERE customer_id = 42 AND status = 'delivered'
ORDER BY created_at DESC LIMIT 5;`),
        complexity: `<p>O(log N + 5) entries + 5 row fetches, independent of how many orders the customer has. Without the sort-column in the index: O(log N + k) + O(k log k) sort for k customer orders.</p>`,
        followUps: ['Make it covering so the 5 row fetches disappear (next topic).', 'What if the screen also allows <code>status IN (\'delivered\', \'shipped\')</code>? Does the free ordering survive?']
      }
    }]
  });

  /* =====================================================================
     TOPIC 6 - Covering indexes and index-only scans
     ===================================================================== */
  var CV_ROWS = [[312, 42, '2026-02-11', 4100, 'delivered'], [1940, 42, '2026-03-05', 990, 'delivered'], [4839, 42, '2026-09-07', 29143, 'delivered'],
    [8839, 42, '2026-07-19', 27143, 'delivered'], [10777, 42, '2026-05-02', 15200, 'cancelled'], [14839, 42, '2026-09-17', 49143, 'delivered']];

  topics.push({
    title: 'Covering Indexes & Index-Only Scans',
    analogy: `<p>Imagine a cookbook whose index line reads: <i>"Pancakes — p. 88"</i>. To know the cooking time you must flip to page 88. Now imagine a smarter index: <i>"Pancakes — 20 min — vegetarian — p. 88"</i>. If your question is "which recipes take under 30 minutes?", you never open a single recipe page — the <b>index already contains everything you asked for</b>. That is a <b>covering index</b>: the query is answered from the index alone, and the "flip to the page" step (the table lookup) disappears.</p>`,
    explain: `<p>From the clustered-index topic: a secondary index seek is normally <b>two steps</b> — find entries in the index, then fetch each row from the table to read the other columns. For a query matching k rows that is <b>k extra random reads</b>.</p>
<p>An index <b>covers</b> a query when <b>every column the query touches</b> — in <code>SELECT</code>, <code>WHERE</code>, <code>JOIN … ON</code>, <code>GROUP BY</code>, <code>ORDER BY</code> — is stored in the index. Then the engine never visits the table:</p>
${H.table(['Engine', 'How the plan says "covered"'], [
  ['SQLite', '<code>USING COVERING INDEX idx_name</code>'],
  ['PostgreSQL', '<code>Index Only Scan</code> (check <code>Heap Fetches: 0</code>)'],
  ['MySQL', '<code>Extra: Using index</code>'],
  ['SQL Server', 'no <code>Key Lookup</code> operator in the plan']
])}
<p>Two ways to add the extra columns:</p>
<ol>
<li><b>As key columns</b>: <code>CREATE INDEX … ON orders(customer_id, created_at, total_cents)</code>. Works everywhere (SQLite, MySQL). The extra column becomes part of the sort order.</li>
<li><b>As non-key payload</b>: <code>CREATE INDEX … ON orders(customer_id, created_at) INCLUDE (total_cents)</code> — PostgreSQL 11+ and SQL Server. INCLUDE columns sit only in the leaves: they don't affect ordering or uniqueness, and keep internal pages slim.</li>
</ol>
<p><b>Free riders:</b> the row pointer is always in the index. In SQLite that is the rowid (so <code>SELECT id … </code> is covered when id is the INTEGER PRIMARY KEY); in InnoDB it is the primary key, so every secondary index silently covers the PK columns.</p>
<p><b>Biggest enemy: <code>SELECT *</code>.</b> It needs every column, so no reasonable index covers it. Selecting only the columns you use is a performance feature, not just style.</p>
<p><b>Cost:</b> a wider index = more disk, more RAM, more write work, and an update to any covered column must update the index. Cover your <b>hottest</b> queries, not everything.</p>`,
    clues: [
      '"The plan uses the index but the query is still slow and returns many rows" → key lookups; make the index covering',
      '"Key Lookup" / "Heap Fetches" / missing "Using index" in the plan → not covered',
      '"Dashboard / count / sum query over a date range" → index on (range column, grouped column, summed column) answers it index-only',
      '"Why avoid SELECT *?" → it defeats covering indexes (and wastes I/O and network)',
      '"Add a column to an index without changing its order or uniqueness" → INCLUDE (Postgres, SQL Server)'
    ],
    code: [shop(`-- Step 1: index on customer_id only → must visit the table for created_at and total_cents.
CREATE INDEX idx_c ON orders(customer_id);
EXPLAIN QUERY PLAN
SELECT created_at, total_cents FROM orders WHERE customer_id = 42 ORDER BY created_at DESC;
-- SEARCH orders USING INDEX idx_c (customer_id=?)  +  USE TEMP B-TREE FOR ORDER BY

-- Step 2: add the sort column → sort disappears, lookups remain (total_cents is not in the index).
CREATE INDEX idx_cc ON orders(customer_id, created_at);
EXPLAIN QUERY PLAN
SELECT created_at, total_cents FROM orders WHERE customer_id = 42 ORDER BY created_at DESC;

-- Step 3: add the selected column → COVERING: the table is never touched.
CREATE INDEX idx_ccc ON orders(customer_id, created_at, total_cents);
EXPLAIN QUERY PLAN
SELECT created_at, total_cents FROM orders WHERE customer_id = 42 ORDER BY created_at DESC;

-- The rowid (id) rides along for free, so this is covered too:
EXPLAIN QUERY PLAN SELECT id, created_at FROM orders WHERE customer_id = 42;
-- ...but SELECT * never is:
EXPLAIN QUERY PLAN SELECT * FROM orders WHERE customer_id = 42;`, 'From lookups to COVERING INDEX'),
    pg(`-- PostgreSQL 11+ / SQL Server: INCLUDE adds payload columns to the leaves only
CREATE INDEX idx_orders_cust_created ON orders (customer_id, created_at DESC) INCLUDE (total_cents, status);

EXPLAIN (ANALYZE, BUFFERS)
SELECT created_at, total_cents FROM orders WHERE customer_id = 42 ORDER BY created_at DESC LIMIT 20;
--  Index Only Scan using idx_orders_cust_created on orders
--    Index Cond: (customer_id = 42)
--    Heap Fetches: 0          <-- needs a recently VACUUMed table (visibility map)

-- MySQL: look for "Using index" in Extra
EXPLAIN SELECT created_at, total_cents FROM orders WHERE customer_id = 42;`, 'INCLUDE columns (Postgres / SQL Server)')],
    codeTitle: ['Three steps to a covering index', 'INCLUDE and index-only scans elsewhere'],
    viz: [{
      title: 'Covered or not? Counting table lookups',
      input: 'customer_id, created_at | created_at, total_cents',
      inputLabel: 'index columns | SELECT columns   (columns: id, customer_id, created_at, total_cents, status)',
      gen: function (input) {
        var sp = String(input).split('|');
        if (sp.length !== 2) throw new Error('Format: index columns | select columns, e.g. customer_id, created_at | created_at, total_cents');
        var ALL = ['id', 'customer_id', 'created_at', 'total_cents', 'status'];
        var parse = function (s) { return s.split(',').map(function (x) { return x.trim().toLowerCase(); }).filter(Boolean); };
        var idxCols = parse(sp[0]), sel = parse(sp[1]);
        if (!idxCols.length || !sel.length || idxCols.concat(sel).some(function (c) { return ALL.indexOf(c) < 0; })) throw new Error('Use only: ' + ALL.join(', '));
        if (idxCols[0] !== 'customer_id') throw new Error('The query filters on customer_id = 42, so make customer_id the first index column');
        var frames = [], need = ['customer_id', 'created_at'];
        sel.forEach(function (c) { if (need.indexOf(c) < 0) need.push(c); });
        var stored = idxCols.slice(); if (stored.indexOf('id') < 0) stored.push('id');
        var missing = need.filter(function (c) { return stored.indexOf(c) < 0; });
        var hlNeed = {}; need.forEach(function (c) { hlNeed[c] = stored.indexOf(c) >= 0 ? 'ok' : 'bad'; });
        frames.push({ narr: 'Query: <code>SELECT ' + sel.join(', ') + ' FROM orders WHERE customer_id = 42 ORDER BY created_at DESC</code>. First list <b>every column the query touches</b> — SELECT list + WHERE + ORDER BY.', parts: [
          { type: 'set', label: 'columns the query needs', items: need }
        ] });
        frames.push({ narr: 'The index stores <b>' + idxCols.join(', ') + '</b> plus the row pointer (<b>id</b>, the rowid — free). ' + (missing.length ? 'Missing: <span class="c-r">' + missing.join(', ') + '</span> → for every match we must go to the table.' : '<span class="c-g">Everything needed is inside the index → covering!</span>'), parts: [
          { type: 'set', label: 'needed columns (green = in index, red = missing)', items: need, hl: hlNeed },
          { type: 'set', label: 'stored in index entries', items: stored }
        ] });
        var idxRows = CV_ROWS.map(function (r) { return stored.map(function (c) { return r[ALL.indexOf(c)]; }); });
        var hb = {}; idxRows.forEach(function (_, i) { hb[i] = 'win'; });
        frames.push({ narr: 'Seek the index for customer_id = 42: the 6 matching entries are one contiguous block (≈3 page reads to get there).', parts: [
          { type: 'table', label: 'index entries for customer 42', columns: stored, rows: idxRows, hl: hb },
          { type: 'vars', vals: { index_pages: 3, table_lookups: 0 } }
        ] });
        var lookups = 0;
        if (missing.length) {
          var heap = CV_ROWS.map(function (r) { return r.slice(); }), hh = {};
          CV_ROWS.forEach(function (r, i) {
            lookups++;
            Object.keys(hh).forEach(function (k) { hh[k] = 'done'; });
            hh[i] = 'sel';
            frames.push({ narr: 'Entry ' + (i + 1) + ' gives rowid <b>' + r[0] + '</b>, but we still need ' + missing.join(', ') + ' → <b>key lookup</b>: descend the table B+tree to row ' + r[0] + ' (≈2–3 more page reads, usually a random I/O).', parts: [
              { type: 'table', label: 'table orders (full rows)', columns: ALL, rows: heap, hl: Object.assign({}, hh) },
              { type: 'vars', vals: { index_pages: 3, table_lookups: lookups }, hl: { table_lookups: 'bad' } }
            ] });
          });
        } else {
          var ho = {}; idxRows.forEach(function (_, i) { ho[i] = 'ok'; });
          frames.push({ narr: 'Every requested column is right here in the leaf entries. The engine reads them in order and <b>never opens the table</b>. SQLite prints <code>USING COVERING INDEX</code>; Postgres says <code>Index Only Scan</code>; MySQL says <code>Using index</code>.', parts: [
            { type: 'table', label: 'answer straight from the index', columns: stored, rows: idxRows, hl: ho },
            { type: 'vars', vals: { index_pages: 3, table_lookups: 0 }, hl: { table_lookups: 'ok' } }
          ] });
        }
        var cost = 3 + lookups * 3;
        frames.push({ narr: (missing.length ? 'Not covered: ' + cost + ' page reads (3 for the index + 3 per lookup × ' + lookups + '). Add <b>' + missing.join(', ') + '</b> to the index (as key or INCLUDE columns) to drop to 3. Try input <code>customer_id, created_at, total_cents | created_at, total_cents</code>.' : 'Covered: 3 page reads total. With 10,000 matches the non-covered version would need ~30,000 extra reads; this one reads a few more leaf pages.') + ' Try <code>status</code> in the select list to see coverage break again.', parts: [
          { type: 'bars', label: 'page reads for 6 matches', values: [3 + 6 * 3, 3], idxLabels: ['not covered', 'covered'], hl: missing.length ? { 0: 'bad' } : { 1: 'ok' } },
          { type: 'text', html: missing.length ? 'SQLite: <code>SEARCH orders USING INDEX … (customer_id=?)</code>' : 'SQLite: <code>SEARCH orders USING COVERING INDEX … (customer_id=?)</code>' }
        ] });
        return frames;
      }
    }],
    examples: [
      { title: 'COUNT(*) reads the smallest index, not the table', html: `<p><code>SELECT COUNT(*) FROM orders</code> needs no column values at all — any index has one entry per row, so the engine counts entries in the <b>narrowest</b> index (fewest pages) instead of reading wide table rows. SQLite shows <code>SCAN orders USING COVERING INDEX …</code>; InnoDB likewise uses the smallest secondary index.</p>`, code: shop(`EXPLAIN QUERY PLAN SELECT COUNT(*) FROM orders;               -- SCAN orders (table)
CREATE INDEX idx_orders_status ON orders(status);
EXPLAIN QUERY PLAN SELECT COUNT(*) FROM orders;               -- SCAN orders USING COVERING INDEX idx_orders_status
EXPLAIN QUERY PLAN SELECT COUNT(*) FROM orders WHERE status = 'pending';
SELECT COUNT(*) FROM orders WHERE status = 'pending';`) },
      { title: 'Covering a join', html: `<p><code>SELECT c.city, SUM(o.total_cents) FROM customers c JOIN orders o ON o.customer_id = c.id GROUP BY c.city</code>. On the orders side the query touches only <code>customer_id</code> and <code>total_cents</code> → index <code>(customer_id, total_cents)</code> lets the join probe and the SUM read only the index. The customers side is fetched by rowid (PK).</p>`, code: shop(`CREATE INDEX idx_orders_cust_total ON orders(customer_id, total_cents);
EXPLAIN QUERY PLAN
SELECT c.city, SUM(o.total_cents) FROM customers c JOIN orders o ON o.customer_id = c.id GROUP BY c.city;`) },
      { title: 'Postgres index-only scans need VACUUM', html: `<p>Postgres indexes do not store row visibility (MVCC) info, so an index-only scan checks the <b>visibility map</b>: if a heap page is marked "all-visible", the index answer is trusted; otherwise it fetches the heap tuple anyway (<code>Heap Fetches: 9500</code>). On a heavily updated table that autovacuum can't keep up with, your "covering" index silently behaves like a normal one. Fix: tune autovacuum for that table, or accept it.</p>` }
    ],
    deepDive: `<p><b>Key column vs INCLUDE.</b> Key columns are in internal pages too (they guide the search and define order/uniqueness). INCLUDE columns live only in leaves, so internal pages keep high fanout and a UNIQUE index stays unique on the key only: <code>CREATE UNIQUE INDEX ON users(email) INCLUDE (name)</code>. In SQLite/MySQL (no INCLUDE) appending the column as a trailing key column achieves coverage with slightly larger internal entries.</p>
<p><b>The "rowid / PK for free" effect.</b> SQLite indexes end with the rowid; InnoDB secondaries end with the PK; Postgres stores TIDs (not the PK) — so in Postgres <code>SELECT id … WHERE email = ?</code> is covered only if <code>id</code> is in the index.</p>
<p><b>Why index-only can be dramatically faster.</b> Matching rows are scattered across table pages (random I/O, one page per row in the worst case), while matching index entries are packed into a few adjacent leaf pages (sequential). For 10,000 matches: ~10,000 random table reads vs ~50 leaf pages.</p>
<p><b>Costs and limits.</b> Wider leaves → fewer entries per page → bigger index, more cache pressure. Every UPDATE of a covered column must modify the index (in Postgres it also kills HOT updates). SQL Server caps key size (1700 bytes nonclustered), InnoDB 3072 bytes. Covering long TEXT/JSON columns is almost always a mistake.</p>
<p><b>Design recipe:</b> (1) Seek columns in ESR order, (2) then any remaining columns the hot query reads, (3) stop if the index would approach the width of the table — at that point you are building a second copy of the table (sometimes that is exactly what you want: a "narrow projection" for one critical query).</p>`,
    aiEra: `<p><b>What AI changes:</b> AI-generated code loves <code>SELECT *</code> and ORM default projections, which quietly prevent covering indexes. A quick review habit — "does this hot query select only what it needs?" — pays off more than ever.</p>
<p><b>Use AI as a partner:</b> give it the hot query and current indexes and ask: "Which columns force a table lookup? Propose the minimal INCLUDE/trailing columns to make it index-only, and estimate the size cost." Then confirm with <code>EXPLAIN</code> (look for COVERING / Index Only Scan / Using index).</p>
<p><b>Where AI goes wrong:</b> it suggests covering indexes for <code>SELECT *</code> queries (impossible without copying the table), forgets Postgres visibility-map caveats, and proposes INCLUDE on MySQL/SQLite where it does not exist. <b>What you must still own:</b> listing every column a query touches, and judging whether the extra width is worth it for that query's frequency.</p>`,
    problems: [{
      title: 'Make the Revenue Dashboard Index-Only',
      level: 'Medium', tags: ['covering index', 'group by', 'range'], companies: ['Shopify', 'Stripe', 'Zomato'],
      statement: `<p>A dashboard refreshes every 10 seconds with:</p><p><code>SELECT status, COUNT(*), SUM(total_cents) FROM orders WHERE created_at &gt;= '2026-09-01' GROUP BY status</code></p><p>Design one index so the query never touches the table (SQLite plan says <code>COVERING INDEX</code>).</p>`,
      constraints: `<p>Shop database. One index. ~2,000 of the 20,000 orders are in the date range.</p>`,
      example: `<p>Result: cancelled 59 · ${H.c('g', 'delivered 1399')} · paid 118 · pending 15 · shipped 407. Target plan: ${H.c('g', 'SEARCH orders USING COVERING INDEX … (created_at>?)')} + a small temp B-tree for GROUP BY.</p>`,
      brute: { why: `<p>No index: scan all 20,000 rows to keep the 2,000 in range. An index on <code>created_at</code> alone fixes the scan but then does ~2,000 random table lookups to read <code>status</code> and <code>total_cents</code> — every refresh, every 10 seconds.</p>`, code: shop(`EXPLAIN QUERY PLAN
SELECT status, COUNT(*), SUM(total_cents) FROM orders WHERE created_at >= '2026-09-01' GROUP BY status;   -- SCAN
CREATE INDEX idx_created ON orders(created_at);
EXPLAIN QUERY PLAN
SELECT status, COUNT(*), SUM(total_cents) FROM orders WHERE created_at >= '2026-09-01' GROUP BY status;   -- index + 2,000 lookups`) },
      mcq: { q: 'Which columns must the covering index contain?', options: ['created_at, status, total_cents', 'created_at only', 'status only', 'id, created_at'], answer: 0, explain: 'Every column the query touches: the range column (created_at) plus status (GROUP BY/SELECT) and total_cents (SUM). created_at must come first so the range can seek.' },
      hints: [`<p>Hint 1: list every column the query touches: WHERE, GROUP BY, SELECT, aggregates.</p>`, `<p>Hint 2: the range column must lead (it is the only seekable predicate); the other two ride along to make it covering.</p>`, `<p>Hint 3: <code>CREATE INDEX … ON orders(created_at, status, total_cents)</code> and look for COVERING in the plan. In Postgres: <code>(created_at) INCLUDE (status, total_cents)</code>.</p>`],
      solution: {
        approach: `<p>Seek on the range column, carry the rest: <code>(created_at, status, total_cents)</code>. The engine seeks to 2026-09-01, walks ~2,000 adjacent leaf entries, and aggregates directly from them — zero table lookups. The GROUP BY still needs a tiny temp B-tree (5 groups) because entries are ordered by created_at, not status, which is cheap.</p>`,
        code: shop(`CREATE INDEX idx_orders_dash ON orders(created_at, status, total_cents);

EXPLAIN QUERY PLAN
SELECT status, COUNT(*) AS n, SUM(total_cents) AS revenue_cents
FROM orders WHERE created_at >= '2026-09-01' GROUP BY status;
-- SEARCH orders USING COVERING INDEX idx_orders_dash (created_at>?)

SELECT status, COUNT(*) AS n, SUM(total_cents) AS revenue_cents
FROM orders WHERE created_at >= '2026-09-01' GROUP BY status ORDER BY n DESC;`),
        alt: [pg(`-- PostgreSQL
CREATE INDEX idx_orders_dash ON orders (created_at) INCLUDE (status, total_cents);`, 'PostgreSQL INCLUDE version')],
        complexity: `<p>O(log N + k/B) leaf pages for k rows in range (B entries per leaf) instead of O(N) (scan) or O(k) random lookups. Index size ≈ 3 small columns × 20,000 rows. Extra write cost on every order insert and every status change.</p>`,
        followUps: ['At 500M orders, would you still compute this live? (pre-aggregated rollup table / materialized view updated incrementally)', 'Would <code>(status, created_at, total_cents)</code> work? When would it be better? (one seek per status with skip-scan-like IN lists; avoids the GROUP BY sort)']
      }
    }]
  });

  /* =====================================================================
     TOPIC 7 - Selectivity, cardinality and statistics
     ===================================================================== */
  topics.push({
    title: 'Selectivity, Cardinality & When the Planner Ignores Your Index',
    analogy: `<p>You are in a library with a perfect card catalogue. Question 1: "find the book <i>Zen and the Art of Motorcycle Maintenance</i>" — use the catalogue, walk to one shelf, done. Question 2: "bring me <b>every</b> book written in English" — that is 90% of the library. Looking each one up in the catalogue and walking to its shelf one by one would be absurd; you would just <b>walk every aisle once</b> with a trolley. A database planner makes exactly this call: an index is a great way to find <b>a few</b> things and a terrible way to fetch <b>most</b> things.</p>`,
    explain: `<p>Two words you must use precisely:</p>
<ul>
<li><b>Cardinality</b> of a column = number of <b>distinct values</b>. <code>email</code>: 2,000 distinct (high). <code>country</code>: 5 (low). <code>is_vip</code>: 2 (very low).</li>
<li><b>Selectivity</b> of a predicate = <b>fraction of rows it matches</b>. <code>email = ?</code> → 1/2,000 = 0.05% (highly selective = good for an index). <code>status = 'delivered'</code> → 68% (not selective).</li>
</ul>
<p>Why it matters: a secondary index seek costs roughly <b>one random page read per matching row</b> (the key lookup), while a full scan costs <b>one sequential read per table page</b>, and each page holds many rows. So:</p>
${H.table(['Rows matched', 'Index path', 'Full scan', 'Winner'], [
  ['10 of 20,000 (0.05%)', '~3 + 10 random reads', '~1,000 sequential pages', '<span class="c-g">index</span>'],
  ['200 of 20,000 (1%)', '~200 random reads', '~1,000 sequential pages', '<span class="c-y">close — depends on storage &amp; caching</span>'],
  ['13,600 of 20,000 (68%)', '~13,600 random reads', '~1,000 sequential pages', '<span class="c-r">scan</span>']
])}
<p>The break-even point is typically somewhere around <b>1–10% of rows</b> (lower on spinning disks, higher on SSDs, much higher if the index is covering or the table is physically ordered by that column). Above it, a good planner <b>ignores your index on purpose</b> — that is correct behaviour, not a bug.</p>
<p><b>How does the planner know how many rows will match?</b> From <b>statistics</b> it collects with <code>ANALYZE</code>: row counts, distinct counts, most-common values, histograms (Postgres <code>pg_stats</code>, MySQL 8 histograms, SQL Server statistics objects). SQLite's <code>ANALYZE</code> stores <code>sqlite_stat1</code>: "rows in table, average rows per distinct key". Stale or missing statistics → bad estimates → bad plans.</p>
<p><b>Skew</b> is the classic trap. <code>status</code> has 5 values but they are not equal: <i>pending</i> is 1% and <i>delivered</i> 68%. The same index is perfect for <code>status = 'pending'</code> and useless for <code>status = 'delivered'</code>. Planners with histograms/MCV lists handle this; planners using only averages (SQLite by default) do not. The pro move for a hot, rare value: a <b>partial index</b> (<code>… WHERE status = 'pending'</code>) that contains only those rows.</p>`,
    clues: [
      '"I created an index but the planner still does a Seq Scan" → low selectivity, stale stats, or a non-sargable predicate',
      '"Should I index a boolean / gender / status column?" → only if you query the RARE value (partial index), or as a later column in a composite',
      '"Queue table: WHERE status = \'pending\' ORDER BY created_at" → partial index on the rare state',
      '"Query was fast yesterday, slow today, same SQL" → plan flip after stats changed or data skew + parameter sniffing',
      '"Estimate vs actual rows differ 100×" in EXPLAIN ANALYZE → statistics problem (ANALYZE, extended stats, histograms)'
    ],
    code: [shop(`-- Cardinality and selectivity of candidate columns
SELECT COUNT(*)                       AS total_rows,
       COUNT(DISTINCT email)          AS email_cardinality,
       COUNT(DISTINCT country)        AS country_cardinality,
       COUNT(DISTINCT is_vip)         AS vip_cardinality,
       ROUND(100.0 * SUM(is_vip) / COUNT(*), 1) AS pct_vip
FROM customers;

-- Skew: selectivity of each status value
SELECT status, COUNT(*) AS n, ROUND(100.0 * COUNT(*) / (SELECT COUNT(*) FROM orders), 2) AS selectivity_pct
FROM orders GROUP BY status ORDER BY n;

-- What SQLite's statistics say: "rows  avg-rows-per-key" (an AVERAGE hides the skew)
CREATE INDEX idx_vip ON customers(is_vip);
ANALYZE;
SELECT tbl, idx, stat FROM sqlite_stat1 WHERE idx = 'idx_vip';   -- '2000 1000' although is_vip=1 is only 40 rows`, 'Measure selectivity before you index'),
    shop(`-- Partial index: only the rare, hot rows are indexed.
CREATE INDEX idx_orders_pending ON orders(created_at) WHERE status = 'pending';

EXPLAIN QUERY PLAN
SELECT id, created_at FROM orders WHERE status = 'pending' ORDER BY created_at LIMIT 20;
-- SCAN orders USING COVERING INDEX idx_orders_pending   (200 entries instead of 20,000)

EXPLAIN QUERY PLAN
SELECT id FROM orders WHERE status = 'paid' ORDER BY created_at LIMIT 20;   -- not covered by the partial index

-- Forcing plans for experiments (SQLite): NOT INDEXED, INDEXED BY, or unary + on the column
EXPLAIN QUERY PLAN SELECT * FROM orders NOT INDEXED WHERE status = 'pending';
EXPLAIN QUERY PLAN SELECT * FROM orders WHERE +status = 'pending';`, 'Partial indexes for skewed data')],
    codeTitle: ['Cardinality, selectivity, statistics', 'Partial index + forcing plans'],
    viz: [{
      title: 'Index or scan? Cost per value of a skewed column',
      input: 'delivered:13600 shipped:4000 paid:1600 cancelled:600 pending:200',
      inputLabel: 'value:count pairs (table = their sum)',
      gen: function (input) {
        var pairs = String(input).trim().split(/\s+/).map(function (p) { var m = p.split(':'); return [m[0], Number(m[1])]; });
        if (!pairs.length || pairs.length > 8 || pairs.some(function (p) { return !p[0] || isNaN(p[1]) || p[1] < 0 || p[1] > 1e8; })) throw new Error('Use up to 8 value:count pairs, e.g. paid:1600 pending:200');
        var N = pairs.reduce(function (s, p) { return s + p[1]; }, 0);
        if (N < 1) throw new Error('Counts must add up to at least 1');
        var RPP = 20, RAND = 4, HEIGHT = 3, frames = [];
        var scan = Math.ceil(N / RPP);
        frames.push({ narr: 'Table has <b>' + N.toLocaleString('en-US') + '</b> rows, ' + RPP + ' rows per page → a full scan reads <b>' + scan + '</b> pages sequentially (cost 1 each). An index seek reads ' + HEIGHT + ' index pages + <b>one random page per matching row</b>, and a random read costs <b>' + RAND + '×</b> a sequential one (Postgres default <code>random_page_cost = 4</code>).', parts: [
          { type: 'bars', label: 'rows per value (the skew)', values: pairs.map(function (p) { return p[1]; }), idxLabels: pairs.map(function (p) { return p[0]; }) },
          { type: 'vars', vals: { rows: N, rows_per_page: RPP, scan_cost: scan, random_cost_factor: RAND } }
        ] });
        var sel = [], dec = {};
        pairs.forEach(function (p, i) {
          var m = p[1], idx = (HEIGHT + m) * RAND, useIdx = idx < scan, pct = 100 * m / N;
          sel.push(Math.round(pct * 100) / 100);
          dec[i] = useIdx ? 'ok' : 'bad';
          frames.push({ narr: '<code>WHERE col = \'' + p[0] + '\'</code> matches <b>' + m + '</b> rows → selectivity <b>' + pct.toFixed(2) + '%</b>. Index cost ≈ (' + HEIGHT + ' + ' + m + ') × ' + RAND + ' = <b>' + idx + '</b>; scan cost = <b>' + scan + '</b>. ' + (useIdx ? '<span class="c-g">Index wins</span> — few rows, few random reads.' : '<span class="c-r">Scan wins</span> — fetching ' + m + ' rows one random read at a time costs more than reading every page in order.'), parts: [
            { type: 'bars', label: 'estimated cost', values: [idx, scan], idxLabels: ['index seek', 'full scan'], hl: useIdx ? { 0: 'ok' } : { 1: 'ok', 0: 'bad' } },
            { type: 'vars', vals: { value: p[0], matches: m, selectivity_pct: pct.toFixed(2), decision: useIdx ? 'INDEX' : 'SCAN' }, hl: { decision: useIdx ? 'ok' : 'bad' } }
          ] });
        });
        var breakEven = Math.max(0, Math.floor(scan / RAND - HEIGHT));
        frames.push({ narr: 'Break-even: the index wins while matches &lt; scan_cost / ' + RAND + ' − ' + HEIGHT + ' ≈ <b>' + breakEven + '</b> rows (' + (100 * breakEven / N).toFixed(2) + '% of the table). Same column, same index — the right plan depends on the <b>value</b>. A planner that only knows the <b>average</b> rows per value (' + Math.round(N / pairs.length) + ' here) guesses the same plan for all of them.', parts: [
          { type: 'bars', label: 'selectivity % per value (green = index, red = scan)', values: sel, idxLabels: pairs.map(function (p) { return p[0]; }), hl: dec },
          { type: 'text', html: 'Real systems shift the break-even: SSD (<code>random_page_cost ≈ 1.1</code>) → higher; covering index → much higher (no random lookups); table physically ordered by the column (high correlation) → much higher.' }
        ] });
        frames.push({ narr: 'Takeaways: (1) index the <b>selective</b> predicates; (2) for skewed columns, a <b>partial index</b> on the rare hot value is tiny and perfect; (3) keep statistics fresh (<code>ANALYZE</code>) so the planner knows which values are rare.', parts: [
          { type: 'table', label: 'what to do', columns: ['situation', 'move'], rows: [['unique-ish column (email, order id)', 'plain B-tree index'], ['rare hot value (pending, is_vip=1)', 'partial index WHERE value'], ['common value (delivered)', 'no index; scan or pre-aggregate'], ['low-cardinality column used with others', 'later column in a composite index']] }
        ] });
        return frames;
      }
    }],
    examples: [
      { title: 'Boolean flag: index the rare side only', html: `<p><code>is_vip</code> is 1 for 2% of customers. A full index on is_vip stores 2,000 entries, 98% of which (<code>is_vip = 0</code>) are never useful. <code>CREATE INDEX … ON customers(signup_date) WHERE is_vip = 1</code> stores only the 40 VIPs, already sorted by signup date for the VIP dashboard. SQLite's stat1 for a full is_vip index says "1000 rows per value" — the average hides the 40 vs 1,960 skew.</p>`, code: shop(`SELECT is_vip, COUNT(*) FROM customers GROUP BY is_vip;
CREATE INDEX idx_vip_signup ON customers(signup_date) WHERE is_vip = 1;
EXPLAIN QUERY PLAN SELECT id, signup_date FROM customers WHERE is_vip = 1 ORDER BY signup_date DESC LIMIT 10;`) },
      { title: 'Low cardinality is fine as a LATER column', html: `<p><code>country</code> (5 values) alone is a poor index: each value matches 20%. But <code>WHERE country = 'IN' AND signup_date &gt;= '2026-01-01'</code> on <code>(country, signup_date)</code> is excellent: the equality on the low-cardinality column picks one fifth, the range then narrows to a slice of it. Cardinality of a <i>single</i> column is not the whole story; the selectivity of the <b>whole seek prefix</b> is.</p>`, code: shop(`CREATE INDEX idx_cust_country_signup ON customers(country, signup_date);
EXPLAIN QUERY PLAN SELECT id FROM customers WHERE country = 'IN' AND signup_date >= '2026-08-01';
SELECT COUNT(*) AS in_country, SUM(signup_date >= '2026-08-01') AS in_country_recent FROM customers WHERE country = 'IN';`) },
      { title: 'Parameter sniffing / generic plans with skew', html: `<p>A prepared statement <code>WHERE status = $1</code> is planned once. If the first call used <code>'pending'</code> (1%) the cached plan is an index seek — reused for <code>'delivered'</code> (68%), it does 13,600 random lookups. SQL Server calls this <b>parameter sniffing</b>; Postgres switches to a generic plan after 5 executions if it looks no worse (<code>plan_cache_mode</code> controls it). Fixes: partial index for the rare value, separate queries per value class, <code>OPTION (RECOMPILE)</code> / <code>plan_cache_mode = force_custom_plan</code> for that statement.</p>` }
    ],
    deepDive: `<p><b>Postgres cost model in one line:</b> total ≈ <code>seq_page_cost × pages + cpu_tuple_cost × rows</code> for a scan, vs <code>random_page_cost × (index pages + heap pages fetched) + cpu costs</code> for an index scan. Defaults: seq 1.0, random 4.0; on SSDs many set random to 1.1–1.5, which makes indexes win more often. Between the two sits the <b>Bitmap Heap Scan</b>: collect all matching TIDs from the index, sort them by page, then read each needed heap page <b>once, in physical order</b> — great for "medium" selectivity (≈1–20%) and for combining indexes (BitmapAnd/BitmapOr).</p>
<p><b>Correlation.</b> <code>pg_stats.correlation</code> near ±1 means index order ≈ physical order (e.g. created_at on an append-only table), so an index range scan touches pages sequentially and stays cheap even for large fractions. Near 0 means every match is a different random page.</p>
<p><b>Statistics machinery.</b> Postgres samples 300 × <code>default_statistics_target</code> (default 100) rows: null fraction, n_distinct, most-common values + frequencies, equi-depth histogram. Multi-column correlations (city ↔ zip) fool independence assumptions → <code>CREATE STATISTICS (dependencies, ndistinct, mcv)</code>. MySQL 8: <code>ANALYZE TABLE … UPDATE HISTOGRAM ON col</code>; InnoDB index stats from sampled pages (<code>innodb_stats_persistent_sample_pages</code>). SQLite: <code>sqlite_stat1</code> averages; <code>sqlite_stat4</code> samples only if compiled with STAT4; run <code>PRAGMA optimize</code> periodically.</p>
<p><b>Estimation errors compound.</b> A 10× misestimate at a filter becomes 100× after a join, flipping join algorithms. Reading <code>EXPLAIN ANALYZE</code> "rows=estimate vs actual" is the single most useful tuning habit. Partial and expression indexes also carry their own statistics in Postgres (expression stats), which fixes many estimates.</p>`,
    aiEra: `<p><b>What AI changes:</b> assistants can read an <code>EXPLAIN ANALYZE</code> dump and point at the node where estimated and actual rows diverge — a huge time saver on 200-line plans. Some managed databases now adjust statistics targets or create extended statistics automatically.</p>
<p><b>Use AI as a partner:</b> paste the plan + <code>pg_stats</code> rows for the filtered columns and ask "is this a selectivity problem, a statistics problem, or a missing-index problem?" Then test the hypothesis yourself (ANALYZE, partial index, rewrite).</p>
<p><b>Where AI goes wrong:</b> it insists "always index columns used in WHERE" — including 50/50 booleans — and suggests index hints to force a seek that is actually slower. It cannot see your value distribution unless you show it. <b>What you must still own:</b> computing selectivity from real data, recognising skew, and knowing that "the planner ignored my index" is often the planner being right.</p>`,
    problems: [{
      title: 'Index a Job Queue Without Bloating It',
      level: 'Hard', tags: ['partial index', 'selectivity', 'skew'], companies: ['Stripe', 'GitHub', 'Shopify'],
      statement: `<p>A background worker polls every second: <code>SELECT id, created_at FROM orders WHERE status = 'pending' ORDER BY created_at LIMIT 20</code>. Only 1% of orders are pending at any time; 68% are delivered and stay forever. A teammate proposes <code>CREATE INDEX ON orders(status, created_at)</code>. Propose something smaller that is at least as fast, and explain the selectivity reasoning.</p>`,
      constraints: `<p>SQLite shop database: 20,000 orders, 200 pending. The index must make the query covering and avoid any sort.</p>`,
      example: `<p>Teammate's index: ${H.c('y', '20,000 entries')}, works. Better: partial index ${H.c('g', '200 entries')}: <code>(created_at) WHERE status = 'pending'</code> → plan ${H.c('g', 'SCAN orders USING COVERING INDEX idx_orders_pending')} — "scan" of a 200-entry index that stops after 20.</p>`,
      brute: { why: `<p>No index: every poll scans 20,000 rows and sorts the 200 pending ones — 86,400 polls/day × full scans. The full composite index fixes speed but stores 19,800 entries (delivered/shipped/…) that the worker will never ask for, and pays index maintenance for every order insert and status change of those rows.</p>`, code: shop(`EXPLAIN QUERY PLAN
SELECT id, created_at FROM orders WHERE status = 'pending' ORDER BY created_at LIMIT 20;   -- SCAN + TEMP B-TREE
CREATE INDEX idx_orders_status_created ON orders(status, created_at);
EXPLAIN QUERY PLAN
SELECT id, created_at FROM orders WHERE status = 'pending' ORDER BY created_at LIMIT 20;   -- works, but indexes ALL 20,000 rows`) },
      mcq: { q: 'Why is a partial index a good fit here?', options: ['The query always asks for the same rare value, so only those 1% of rows need index entries', 'Partial indexes are faster for every query', 'SQLite cannot index status', 'Because pending rows have NULL created_at'], answer: 0, explain: 'The predicate is constant (status = \'pending\') and highly selective. A partial index stores just those rows: ~100× smaller, cheaper to maintain, always cached.' },
      hints: [`<p>Hint 1: the WHERE value never changes — the worker always wants <code>'pending'</code>. What fraction of rows is that?</p>`, `<p>Hint 2: a partial index has its own WHERE clause; the query's WHERE must imply it. Index the ORDER BY column so no sort is needed; id is the rowid, so it is covered for free.</p>`, `<p>Hint 3: <code>CREATE INDEX idx_orders_pending ON orders(created_at) WHERE status = 'pending';</code> — check the plan says COVERING and has no TEMP B-TREE. Rows leave the index automatically when their status changes.</p>`],
      solution: {
        approach: `<p>Selectivity of <code>status = 'pending'</code> is 1% and the value is fixed, so index <b>only those rows</b>, ordered by the sort column. The worker's query matches the partial index predicate, reads the first 20 entries in created_at order, and gets <code>id</code> from the rowid — covering, no sort, no table access. When an order moves to 'paid', its entry is deleted from the partial index, so the index stays at "current queue size", not "all history".</p>`,
        code: shop(`CREATE INDEX idx_orders_pending ON orders(created_at) WHERE status = 'pending';

EXPLAIN QUERY PLAN
SELECT id, created_at FROM orders WHERE status = 'pending' ORDER BY created_at LIMIT 20;
-- SCAN orders USING COVERING INDEX idx_orders_pending

SELECT id, created_at FROM orders WHERE status = 'pending' ORDER BY created_at LIMIT 20;

-- Size comparison: entries in the partial index vs a full index
SELECT SUM(status = 'pending') AS partial_index_entries, COUNT(*) AS full_index_entries FROM orders;`),
        alt: [pg(`-- PostgreSQL: same idea; workers usually also lock rows they take
CREATE INDEX CONCURRENTLY idx_orders_pending ON orders (created_at) WHERE status = 'pending';
SELECT id FROM orders WHERE status = 'pending' ORDER BY created_at LIMIT 20 FOR UPDATE SKIP LOCKED;`, 'PostgreSQL queue pattern')],
        complexity: `<p>Each poll: O(log P + 20) for P pending rows (P ≈ 200) instead of O(N) scan + O(P log P) sort. Index size O(P) instead of O(N). Write cost only for rows entering/leaving 'pending'.</p>`,
        followUps: ['What if workers sometimes query <code>status IN (\'pending\', \'retry\')</code>? (partial index WHERE status IN (…), and check the planner can prove implication)', 'Why does Postgres need <code>FOR UPDATE SKIP LOCKED</code> for multiple workers?']
      }
    }]
  });

  /* =====================================================================
     TOPIC 8 - When indexes hurt
     ===================================================================== */
  var REDUNDANT_SQL = `-- Find redundant indexes: same columns, or a left prefix of another index on the same table.
WITH idx AS (
  SELECT m.name AS tbl, il.name AS idx,
         (SELECT group_concat(name, ',')
          FROM (SELECT name FROM pragma_index_info(il.name) ORDER BY seqno)) AS cols
  FROM sqlite_master AS m, pragma_index_list(m.name) AS il
  WHERE m.type = 'table'
)
SELECT a.tbl, a.idx AS redundant_index, a.cols, b.idx AS made_redundant_by, b.cols AS by_cols
FROM idx AS a
JOIN idx AS b ON a.tbl = b.tbl AND a.idx <> b.idx
WHERE substr(b.cols, 1, length(a.cols) + 1) = a.cols || ','     -- a is a strict left prefix of b
   OR (b.cols = a.cols AND a.idx > b.idx)                        -- exact duplicate (report one of the pair)
ORDER BY a.tbl, a.idx;`;

  topics.push({
    title: 'When Indexes Hurt: Write Cost, Bloat & Non-Sargable Queries',
    analogy: `<p>Picture a textbook with <b>15 different indexes</b> at the back — by topic, by author, by year, by colour of the diagram… Reading is great. But every time the author adds or edits a single page, someone must update <b>all 15 indexes</b>, the book gets thicker, and most of those indexes are never opened. Worse, if a reader asks "which topics have names that <i>end</i> in -osis?", even the alphabetical topic index cannot help — it is sorted by the <i>start</i> of the word. Indexes are a <b>trade</b>: faster specific reads, paid for by every write and by space — and only for questions phrased the way the index is sorted.</p>`,
    explain: `<p><b>1. Every write pays for every index.</b> An <code>INSERT</code> into a table with 6 indexes performs 7 B+tree insertions (table + 6), each touching a leaf page (sometimes splitting it) and writing to the WAL. <code>DELETE</code> likewise. An <code>UPDATE</code> touches every index that contains a changed column (in Postgres, unless the update is HOT, <b>all</b> indexes get a new entry). Write-heavy tables (events, logs, queues) can lose most of their throughput to over-indexing.</p>
<p><b>2. Space and memory.</b> Indexes often add up to more bytes than the table itself. They compete for the same buffer pool / page cache; an index nobody uses still pushes useful pages out of RAM, and makes backups, replication and restores slower.</p>
<p><b>3. Non-sargable predicates make the index useless.</b> "Sargable" (Search-ARGument-able) means the predicate can be turned into a seek on the sorted key. These cannot:</p>
${H.table(['Non-sargable (scan)', 'Why', 'Sargable rewrite'], [
  ['<code>WHERE date(created_at) = \'2026-03-05\'</code>', 'function wraps the column; index is sorted by created_at, not by date(created_at)', '<code>created_at &gt;= \'2026-03-05\' AND created_at &lt; \'2026-03-06\'</code>'],
  ['<code>WHERE lower(email) = ?</code>', 'same: function on column', 'store normalised email, or an <b>expression index</b> on lower(email)'],
  ['<code>WHERE price * 1.18 &gt; 1000</code>', 'arithmetic on the column', '<code>price &gt; 1000 / 1.18</code>'],
  ['<code>WHERE name LIKE \'%son\'</code>', 'leading wildcard: no start point in sort order', 'full-text search (FTS5, GIN trigram), or reversed-string index'],
  ['<code>WHERE phone = 5551234</code> (phone is TEXT)', 'implicit cast on the column (MySQL/SQL Server)', 'compare with the right type: <code>\'5551234\'</code>'],
  ['<code>WHERE status &lt;&gt; \'delivered\'</code>', 'negation usually matches most rows', '<code>status IN (…the rare values…)</code>']
])}
<p><b>4. Low-selectivity indexes</b> (previous topic) cost writes but are never chosen. <b>5. Redundant indexes</b>: <code>(a)</code> when <code>(a, b)</code> exists, or exact duplicates created by different people/ORM migrations. <b>6. Bulk loads</b>: inserting 100M rows into a table with 8 indexes is far slower than loading first and building indexes after (each build is one efficient sorted pass).</p>
<p><b>The discipline:</b> every index must name the query it serves. Periodically find unused ones (Postgres <code>pg_stat_user_indexes.idx_scan = 0</code>, MySQL <code>sys.schema_unused_indexes</code>) and redundant ones, and drop them (MySQL 8 lets you make an index <b>INVISIBLE</b> first to test safely).</p>`,
    clues: [
      '"Inserts got slower after we added indexes" / "write-heavy table" → write amplification; count and justify every index',
      '"WHERE YEAR(created_at) = 2026" / "WHERE LOWER(email) = ?" → non-sargable; rewrite as a range or use an expression index',
      '"Search for names containing / ending with a string" → leading wildcard defeats B-trees; use full-text / trigram indexes',
      '"We have 14 indexes on this table" → look for unused, duplicate and left-prefix-redundant indexes',
      '"Bulk import of 50M rows is slow" → drop or defer secondary indexes, load, then create them'
    ],
    code: [shop(`CREATE INDEX idx_orders_created ON orders(created_at);
CREATE INDEX idx_cust_email ON customers(email);

-- Non-sargable: functions/arithmetic on the column → SCAN
EXPLAIN QUERY PLAN SELECT id FROM orders WHERE date(created_at) = '2026-03-05';
EXPLAIN QUERY PLAN SELECT id FROM orders WHERE substr(created_at, 1, 7) = '2026-03';
EXPLAIN QUERY PLAN SELECT id FROM customers WHERE lower(email) = 'user7@mail.com';
EXPLAIN QUERY PLAN SELECT id FROM customers WHERE email LIKE '%7@mail.com';

-- Sargable rewrites → SEARCH
EXPLAIN QUERY PLAN SELECT id FROM orders WHERE created_at >= '2026-03-05' AND created_at < '2026-03-06';
EXPLAIN QUERY PLAN SELECT id FROM orders WHERE created_at >= '2026-03-01' AND created_at < '2026-04-01';

-- Or index the expression itself (must match the query's expression exactly)
CREATE INDEX idx_cust_email_lower ON customers(lower(email));
EXPLAIN QUERY PLAN SELECT id FROM customers WHERE lower(email) = 'user7@mail.com';

-- Same answers, so the rewrite is safe:
SELECT (SELECT COUNT(*) FROM orders WHERE date(created_at) = '2026-03-05') AS with_function,
       (SELECT COUNT(*) FROM orders WHERE created_at >= '2026-03-05' AND created_at < '2026-03-06') AS with_range;`, 'Non-sargable vs sargable, live'),
    shop(`CREATE INDEX idx_c ON orders(customer_id);
CREATE INDEX idx_cc ON orders(customer_id, created_at);   -- makes idx_c redundant
CREATE INDEX idx_s ON orders(status);
CREATE INDEX idx_s_dup ON orders(status);                 -- exact duplicate
CREATE INDEX idx_total ON orders(total_cents);

` + REDUNDANT_SQL, 'Find redundant and duplicate indexes with SQL'),
    pg(`-- PostgreSQL: indexes never scanned since stats reset, biggest first
SELECT s.relname AS table_name, s.indexrelname AS index_name, s.idx_scan,
       pg_size_pretty(pg_relation_size(s.indexrelid)) AS size
FROM pg_stat_user_indexes s
JOIN pg_index i ON i.indexrelid = s.indexrelid
WHERE s.idx_scan = 0 AND NOT i.indisunique          -- keep indexes that enforce constraints
ORDER BY pg_relation_size(s.indexrelid) DESC;

-- MySQL 8: test a drop safely by hiding the index from the optimizer first
ALTER TABLE orders ALTER INDEX idx_total INVISIBLE;
SELECT * FROM sys.schema_unused_indexes;
SELECT * FROM sys.schema_redundant_indexes;`, 'Unused-index audits in Postgres / MySQL')],
    codeTitle: ['Sargable rewrites and expression indexes', 'Redundant index finder (SQLite)', 'Production audits'],
    viz: [{
      title: 'Write amplification: what each extra index costs an INSERT',
      input: '6 2000',
      inputLabel: 'number of secondary indexes (0-10), inserts per second',
      gen: function (input) {
        var a = String(input).trim().split(/[\s,]+/).map(Number);
        if (a.length !== 2 || a.some(isNaN) || a[0] < 0 || a[0] > 10 || a[1] < 1 || a[1] > 1e6) throw new Error('Enter: indexes (0-10) and inserts/sec (1-1000000), e.g. 6 2000');
        var K = Math.floor(a[0]), ips = a[1], frames = [], vals = [], lbl = [];
        var names = ['customer_id', 'status', 'created_at', 'email', 'total_cents', '(cust, created)', 'product_id', 'country', 'coupon', 'updated_at'];
        frames.push({ narr: 'One <code>INSERT</code> into <b>orders</b> with no secondary indexes: one B+tree insertion into the table itself (find the leaf, write the row, log it to the WAL). Call that <b>1 unit</b> of write work.', parts: [
          { type: 'bars', label: 'B+tree insertions per INSERT', values: [1], idxLabels: ['table'], hl: { 0: 'cur' } },
          { type: 'vars', vals: { indexes: 0, btree_writes_per_insert: 1, btree_writes_per_sec: ips } }
        ] });
        vals.push(1); lbl.push('table');
        for (var k = 1; k <= K; k++) {
          vals.push(1); lbl.push(names[k - 1]);
          var hl = {}; hl[k] = 'bad';
          frames.push({ narr: 'Add index #' + k + ' on <b>' + names[k - 1] + '</b>. Every insert now also descends this index, inserts an entry into a leaf (in a <i>different</i> place than the table row, often a random page), and logs it. ' + (k === 1 ? 'Reads by ' + names[0] + ' got much faster; writes got ~2× the tree work.' : 'Total: <b>' + (k + 1) + '</b> B+tree insertions per INSERT.'), parts: [
            { type: 'bars', label: 'B+tree insertions per INSERT', values: vals.slice(), idxLabels: lbl.slice(), hl: hl },
            { type: 'vars', vals: { indexes: k, btree_writes_per_insert: k + 1, btree_writes_per_sec: (k + 1) * ips }, hl: { btree_writes_per_sec: 'bad' } }
          ] });
        }
        var tot = [], tl = [];
        for (k = 0; k <= 10; k++) { tot.push(k + 1); tl.push(k + ' idx'); }
        var hk = {}; hk[K] = 'sel';
        frames.push({ narr: 'At <b>' + ips + '</b> inserts/sec with ' + K + ' indexes the engine performs <b>' + ((K + 1) * ips).toLocaleString('en-US') + '</b> B+tree insertions/sec, plus extra WAL, page splits and dirty pages to flush. Random-key indexes (email, UUID) hurt most: their inserts land on random leaves that are often not in memory.', parts: [
          { type: 'bars', label: 'write work per INSERT vs number of indexes', values: tot, idxLabels: tl, hl: hk }
        ] });
        frames.push({ narr: 'Space too: each index stores (key + row pointer) for <b>every</b> row. With ' + K + ' indexes the indexes alone can exceed the table size — and they all compete for the same RAM cache.', parts: [
          { type: 'bars', label: 'relative disk size (table = 10)', values: [10].concat(names.slice(0, K).map(function (n, i) { return [3, 3, 4, 6, 3, 6, 3, 3, 3, 4][i]; })), idxLabels: ['table'].concat(names.slice(0, K)), hl: { 0: 'cur' } }
        ] });
        frames.push({ narr: 'Rule: keep an index only if it serves an important query (check its usage stats). Merge overlapping ones into composites, drop redundant left-prefixes and duplicates, and for bulk loads create secondary indexes <b>after</b> the load.', parts: [
          { type: 'table', label: 'index review checklist', columns: ['question', 'if "no" →'], rows: [['Which query uses it? (usage stats > 0)', 'drop / make INVISIBLE first'], ['Is it a left prefix of another index?', 'drop it'], ['Is the leading column selective for its queries?', 'make partial or reorder'], ['Does the table take heavy writes?', 'fewer, wider composite indexes']] }
        ] });
        return frames;
      }
    }, {
      title: 'Sargable or not? Why a function on the column forces a scan',
      gen: function () {
        var idx = [['2026-03-04 22:10', 11], ['2026-03-05 01:30', 4], ['2026-03-05 09:15', 9], ['2026-03-05 17:40', 2], ['2026-03-05 23:59', 7], ['2026-03-06 00:20', 5], ['2026-03-06 08:05', 1], ['2026-03-07 12:00', 3]];
        var cols = ['created_at (index key, sorted)', '→ rowid'];
        var frames = [];
        frames.push({ narr: 'An index on <b>created_at</b>: entries sorted by the full timestamp. Goal: all orders placed on <b>2026-03-05</b>.', parts: [
          { type: 'table', label: 'idx_orders_created', columns: cols, rows: idx }
        ] });
        var dateOf = function (s) { return s.slice(0, 10); };
        var hl = {}, n = 0;
        idx.forEach(function (e, i) {
          var ok = dateOf(e[0]) === '2026-03-05'; if (ok) n++;
          hl[i] = ok ? 'ok' : 'bad';
          var view = Object.assign({}, hl); view[i] = ok ? 'ok' : 'cur';
          frames.push({ narr: '<code>WHERE date(created_at) = \'2026-03-05\'</code>: the index is sorted by created_at, not by date(created_at), so the planner cannot "jump" — it must compute date() on <b>every</b> entry (or every row). Entry ' + (i + 1) + ': date(' + e[0] + ') = ' + dateOf(e[0]) + ' → ' + (ok ? 'match' : 'no') + '.', parts: [
            { type: 'table', label: 'non-sargable: evaluate the function everywhere', columns: cols, rows: idx, hl: view },
            { type: 'vars', vals: { entries_examined: i + 1, matches: n }, hl: { entries_examined: 'bad' } }
          ] });
        });
        var hs = {};
        idx.forEach(function (e, i) { if (e[0] >= '2026-03-05' && e[0] < '2026-03-06') hs[i] = 'ok'; });
        hs[0] = 'done'; hs[5] = 'bad';
        frames.push({ narr: 'Rewrite as a <b>range on the raw column</b>: <code>created_at &gt;= \'2026-03-05\' AND created_at &lt; \'2026-03-06\'</code>. Now the planner seeks to the first entry ≥ 2026-03-05, walks right, and stops at the first entry ≥ 2026-03-06 (red). Same rows, ' + (n + 1) + ' entries examined instead of ' + idx.length + ' — and on a real table, a handful instead of millions.', parts: [
          { type: 'table', label: 'sargable: seek + short walk', columns: cols, rows: idx, hl: hs },
          { type: 'vars', vals: { entries_examined: n + 1, matches: n }, hl: { entries_examined: 'ok' } }
        ] });
        frames.push({ narr: 'General rule: <b>leave the indexed column bare</b> on one side of the comparison and move all computation to the constant side. If you truly need the function, index the expression (<code>CREATE INDEX … ON t(lower(email))</code>) — but then the query must use the identical expression.', parts: [
          { type: 'bars', label: 'entries examined', values: [idx.length, n + 1], idxLabels: ['date(col) = …', 'col range'], hl: { 0: 'bad', 1: 'ok' } }
        ] });
        return frames;
      }
    }],
    examples: [
      { title: 'Case-insensitive email login', html: `<p><code>WHERE lower(email) = lower(?)</code> scans. Options: (1) normalise on write (store emails lower-cased) and index the column — best; (2) expression index <code>ON users(lower(email))</code>; (3) Postgres <code>citext</code> type or a case-insensitive collation; (4) SQLite <code>COLLATE NOCASE</code> on the column/index. All make the predicate sargable again.</p>`, code: shop(`CREATE INDEX idx_email_nocase ON customers(email COLLATE NOCASE);
EXPLAIN QUERY PLAN SELECT id FROM customers WHERE email = 'USER7@MAIL.COM' COLLATE NOCASE;
SELECT id, email FROM customers WHERE email = 'USER7@MAIL.COM' COLLATE NOCASE;`) },
      { title: 'OR across different columns', html: `<p><code>WHERE customer_id = 42 OR status = 'pending'</code>: a single composite index cannot serve both branches. With separate indexes on each column SQLite does a <b>MULTI-INDEX OR</b> (Postgres: BitmapOr, MySQL: index_merge union); without them, a scan. Equivalent manual rewrite: <code>UNION</code> of two sargable queries. Index both columns only if this query matters.</p>`, code: shop(`EXPLAIN QUERY PLAN SELECT id FROM orders WHERE customer_id = 42 OR status = 'pending';   -- SCAN
CREATE INDEX idx_c ON orders(customer_id);
CREATE INDEX idx_s ON orders(status);
EXPLAIN QUERY PLAN SELECT id FROM orders WHERE customer_id = 42 OR status = 'pending';   -- MULTI-INDEX OR`) },
      { title: 'Bulk load: index after, not before', html: `<p>Loading 50M rows into a table with 5 secondary indexes means 250M random leaf insertions with page splits. Loading into a bare table and then running <code>CREATE INDEX</code> lets each index be built by <b>sorting</b> the keys once and writing packed leaves bottom-up — often 5–10× faster and producing smaller, unfragmented indexes. Postgres: <code>maintenance_work_mem</code> for the sort; MySQL: <code>ALTER TABLE … ADD INDEX</code> uses sorted index build too.</p>`, code: lab(`CREATE TABLE events (id INTEGER PRIMARY KEY, user_id INTEGER, kind TEXT, at TEXT);
-- 1) load with no secondary indexes
INSERT INTO events (user_id, kind, at)
WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM n WHERE i < 20000)
SELECT (i * 7) % 1000, CASE i % 3 WHEN 0 THEN 'view' WHEN 1 THEN 'click' ELSE 'buy' END,
       datetime('2026-10-01', '+' || i || ' seconds') FROM n;
-- 2) then build the indexes in one sorted pass each
CREATE INDEX idx_events_user_at ON events(user_id, at);
EXPLAIN QUERY PLAN SELECT kind, at FROM events WHERE user_id = 7 ORDER BY at DESC LIMIT 10;`) }
    ],
    deepDive: `<p><b>How much do indexes slow writes?</b> Rough rule from benchmarks: each additional secondary B-tree index costs on the order of 10–30% of single-row insert throughput when the index fits in memory, and much more when it does not (random leaf reads before each write). Sequential keys (timestamps, increasing ids) stay cheap because inserts hit the hot right-most leaf; random keys (UUIDv4, emails, hashes) are the expensive ones.</p>
<p><b>Postgres specifics.</b> MVCC writes a new tuple version for every UPDATE; if any indexed column changes, or the page lacks free space, every index gets a new entry (non-HOT). Adding an index on a frequently updated column (e.g. <code>last_seen_at</code>) can therefore multiply write I/O and bloat <i>all</i> indexes. <code>pg_stat_user_tables.n_tup_hot_upd</code> shows your HOT ratio. Build indexes with <code>CREATE INDEX CONCURRENTLY</code> (no write lock; can leave an INVALID index on failure — check and drop).</p>
<p><b>MySQL/InnoDB.</b> The <b>change buffer</b> defers secondary-index leaf updates for non-unique indexes whose pages are not in memory, merging them later — softening (not removing) the cost. Unique indexes cannot be buffered (must check uniqueness immediately). Online DDL: <code>ALGORITHM=INPLACE, LOCK=NONE</code>; large tables often use gh-ost / pt-online-schema-change.</p>
<p><b>LSM-tree engines</b> (RocksDB/MyRocks, Cassandra, ScyllaDB) turn random index writes into sequential appends, making writes cheap and pushing cost to reads and compaction — the reason write-heavy systems choose them (Storage Engines module).</p>
<p><b>Bloat and maintenance.</b> Deleted/updated entries leave half-empty pages; indexes on monotonically deleted ranges (queues, TTL tables) bloat badly. Monitor with <code>pgstattuple</code> / <code>pg_stat_all_indexes</code>, rebuild with <code>REINDEX CONCURRENTLY</code> (PG 12+), <code>OPTIMIZE TABLE</code>, or SQLite <code>REINDEX</code>/<code>VACUUM</code>.</p>
<p><b>Planner overhead.</b> Each extra index is one more access path to cost; with dozens of indexes and many-table joins, planning time grows, and the chance of a bad plan choice rises. Fewer, well-designed composites beat many single-column indexes.</p>`,
    aiEra: `<p><b>What AI changes:</b> it is now trivial to <i>add</i> indexes — an assistant or auto-tuner suggests one per slow query. The scarce skill is <b>subtraction</b>: proving which indexes are unused, redundant or harmful, and saying no to an index that would speed up a weekly report while slowing every checkout insert.</p>
<p><b>Use AI as a partner:</b> feed it <code>pg_stat_user_indexes</code> + index definitions + write rates and ask for a ranked "drop / merge / keep" list with justification; ask it to rewrite non-sargable predicates in a codebase (it is good at turning <code>DATE(col) = ?</code> into ranges). Review each change and verify plans.</p>
<p><b>Where AI goes wrong:</b> it drops indexes that back UNIQUE or foreign-key constraints, misses that stats reset recently (idx_scan = 0 after a restart means nothing), and produces "sargable" rewrites with off-by-one boundaries (<code>&lt;=</code> '2026-03-05 23:59:59' misses fractional seconds — use a half-open range). <b>What you must still own:</b> the read/write trade-off decision and correctness of every rewrite.</p>`,
    problems: [{
      title: 'Audit the Indexes of a Write-Heavy Orders Table',
      level: 'Hard', tags: ['redundant index', 'write amplification', 'index audit'], companies: ['Amazon', 'Uber', 'Booking.com'],
      statement: `<p>Over two years, five engineers added indexes to <code>orders</code>: <code>idx_c(customer_id)</code>, <code>idx_cc(customer_id, created_at)</code>, <code>idx_s(status)</code>, <code>idx_s_dup(status)</code>, <code>idx_total(total_cents)</code>. Inserts are now the bottleneck (5,000/s at peak). The hot read queries are: (1) <code>WHERE customer_id = ? ORDER BY created_at DESC LIMIT 20</code> and (2) <code>WHERE status = 'pending'</code>. Find what to drop — using SQL — and prove the hot queries keep their plans.</p>`,
      constraints: `<p>SQLite shop database. Do not slow down queries (1) and (2). Usage stats for idx_total show zero scans in 30 days.</p>`,
      example: `<p>Redundant: ${H.c('r', 'idx_c')} (left prefix of idx_cc), ${H.c('r', 'idx_s_dup')} (duplicate of idx_s). Unused: ${H.c('r', 'idx_total')}. Keep ${H.c('g', 'idx_cc')} and ${H.c('g', 'idx_s')} (or replace idx_s with a partial index on pending). Writes go from 6 to 3 B-tree insertions per INSERT.</p>`,
      brute: { why: `<p>Keeping everything: each insert does 6 B+tree insertions (table + 5), two of which are pure duplicates of work another index already does, and one serves no query at all. Dropping indexes blindly by guess is the opposite brute force — it risks slowing a hot query. Do it by evidence.</p>`, code: shop(`CREATE INDEX idx_c ON orders(customer_id);
CREATE INDEX idx_cc ON orders(customer_id, created_at);
CREATE INDEX idx_s ON orders(status);
CREATE INDEX idx_s_dup ON orders(status);
CREATE INDEX idx_total ON orders(total_cents);
-- 5 secondary indexes = 6 B-tree insertions for every new order:
SELECT COUNT(*) + 1 AS btree_insertions_per_insert FROM pragma_index_list('orders');`) },
      mcq: { q: 'Why is <code>idx_c(customer_id)</code> safe to drop when <code>idx_cc(customer_id, created_at)</code> exists?', options: ['Any seek on customer_id can use the left prefix of idx_cc', 'Because customer_id is a foreign key', 'Because idx_c is older', 'It is not safe; single-column indexes are always faster'], answer: 0, explain: 'Left-prefix rule: idx_cc is sorted by customer_id first, so it serves every query idx_c could. It is slightly wider, but the saved write cost dominates.' },
      hints: [`<p>Hint 1: list every index with its ordered columns (<code>pragma_index_list</code> + <code>pragma_index_info</code>).</p>`, `<p>Hint 2: an index whose column list is a left prefix of another index on the same table (or identical to it) is redundant. Unused indexes are found from usage statistics (given here).</p>`, `<p>Hint 3: drop, then re-run EXPLAIN QUERY PLAN for both hot queries to prove they still seek (and check no UNIQUE/constraint index is dropped).</p>`],
      solution: {
        approach: `<p>Evidence-based cleanup: (1) query the catalog for duplicate and left-prefix-redundant indexes → idx_c and idx_s_dup; (2) usage stats say idx_total is never used → drop; (3) re-check the two hot plans: query 1 uses idx_cc (seek + ordered walk, no sort), query 2 uses idx_s. Result: 3 B-tree insertions per INSERT instead of 6, same read plans. Optional upgrade: replace idx_s with a partial index <code>WHERE status = 'pending'</code> to shrink it ~100×.</p>`,
        code: shop(`CREATE INDEX idx_c ON orders(customer_id);
CREATE INDEX idx_cc ON orders(customer_id, created_at);
CREATE INDEX idx_s ON orders(status);
CREATE INDEX idx_s_dup ON orders(status);
CREATE INDEX idx_total ON orders(total_cents);

` + REDUNDANT_SQL + `

-- Drop the redundant + unused ones
DROP INDEX idx_c;
DROP INDEX idx_s_dup;
DROP INDEX idx_total;

-- Hot queries keep good plans
EXPLAIN QUERY PLAN SELECT id, created_at FROM orders WHERE customer_id = 42 ORDER BY created_at DESC LIMIT 20;
EXPLAIN QUERY PLAN SELECT id FROM orders WHERE status = 'pending';
SELECT COUNT(*) + 1 AS btree_insertions_per_insert FROM pragma_index_list('orders');`),
        complexity: `<p>Write work per INSERT: 6 → 3 B-tree insertions (~2× insert throughput headroom, less WAL, less RAM). Reads unchanged: query 1 O(log N + 20), query 2 O(log N + k). The audit query is O(#indexes²) over the catalog — trivial.</p>`,
        followUps: ['How would you drop an index on a live MySQL table with less risk? (make it INVISIBLE first, watch latency, then drop)', 'Why might you keep a "redundant" single-column index in InnoDB if it is much narrower than the composite?']
      }
    }]
  });
  registerModule({
    id: 'sql10', title: 'Index Internals', lang: 'sql',
    intro: `<p>tmp intro tmp intro tmp intro tmp intro tmp intro tmp intro tmp intro tmp intro tmp intro tmp intro tmp intro tmp intro tmp intro tmp intro</p>`,
    goals: ['aaaaaaaaaaaa', 'bbbbbbbbbbbbbb', 'cccccccccccccc'], prereqs: `<p>SQL modules 1-9 basics</p>`, hours: 10,
    databases: { shop: DB_SHOP, lab: DB_LAB },
    topics: topics, practice: practice, quiz: quiz, interview: interview
  });
})();
