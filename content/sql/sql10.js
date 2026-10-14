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
  registerModule({
    id: 'sql10', title: 'Index Internals', lang: 'sql',
    intro: `<p>tmp intro tmp intro tmp intro tmp intro tmp intro tmp intro tmp intro tmp intro tmp intro tmp intro tmp intro tmp intro tmp intro tmp intro</p>`,
    goals: ['aaaaaaaaaaaa', 'bbbbbbbbbbbbbb', 'cccccccccccccc'], prereqs: `<p>SQL modules 1-9 basics</p>`, hours: 10,
    databases: { shop: DB_SHOP, lab: DB_LAB },
    topics: topics, practice: practice, quiz: quiz, interview: interview
  });
})();
