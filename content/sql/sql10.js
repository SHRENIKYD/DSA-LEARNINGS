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
  registerModule({
    id: 'sql10', title: 'Index Internals', lang: 'sql',
    intro: `<p>tmp intro tmp intro tmp intro tmp intro tmp intro tmp intro tmp intro tmp intro tmp intro tmp intro tmp intro tmp intro tmp intro tmp intro</p>`,
    goals: ['aaaaaaaaaaaa', 'bbbbbbbbbbbbbb', 'cccccccccccccc'], prereqs: `<p>SQL modules 1-9 basics</p>`, hours: 10,
    databases: { shop: DB_SHOP, lab: DB_LAB },
    topics: topics, practice: practice, quiz: quiz, interview: interview
  });
})();
