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
  registerModule({
    id: 'sql10', title: 'Index Internals', lang: 'sql',
    intro: `<p>tmp intro tmp intro tmp intro tmp intro tmp intro tmp intro tmp intro tmp intro tmp intro tmp intro tmp intro tmp intro tmp intro tmp intro</p>`,
    goals: ['aaaaaaaaaaaa', 'bbbbbbbbbbbbbb', 'cccccccccccccc'], prereqs: `<p>SQL modules 1-9 basics</p>`, hours: 10,
    databases: { shop: DB_SHOP, lab: DB_LAB },
    topics: topics, practice: practice, quiz: quiz, interview: interview
  });
})();
