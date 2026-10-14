(function () {
  var topics = [], practice = [], quiz = [], interview = [];

  /* ---------------- sample database (SQLite dialect) ----------------
     shop: 320 customers, 60 products, 3,000 orders, 6,000 order_items.
     Data is generated with arithmetic (no random()) so every run and every plan is identical.
     No ANALYZE is run here on purpose: topic 5 shows what changes when you run it yourself. */
  var DB_SHOP = `
CREATE TABLE customers (
  id          INTEGER PRIMARY KEY,
  email       TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  city        TEXT NOT NULL,
  signup_date TEXT NOT NULL,
  referred_by INTEGER REFERENCES customers(id)
);
CREATE TABLE products (
  id          INTEGER PRIMARY KEY,
  name        TEXT NOT NULL,
  category    TEXT NOT NULL,
  price_cents INTEGER NOT NULL
);
CREATE TABLE orders (
  id          INTEGER PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(id),
  status      TEXT NOT NULL,
  created_at  TEXT NOT NULL,
  total_cents INTEGER NOT NULL
);
CREATE TABLE order_items (
  order_id   INTEGER NOT NULL REFERENCES orders(id),
  product_id INTEGER NOT NULL REFERENCES products(id),
  qty        INTEGER NOT NULL,
  PRIMARY KEY (order_id, product_id)
);
CREATE TABLE seq(n INTEGER PRIMARY KEY);
WITH RECURSIVE s(n) AS (SELECT 1 UNION ALL SELECT n + 1 FROM s WHERE n < 3000)
INSERT INTO seq SELECT n FROM s;
INSERT INTO customers
SELECT n, 'user' || n || '@mail.com', 'User ' || n,
       CASE n % 8 WHEN 0 THEN 'Pune' WHEN 1 THEN 'Delhi' WHEN 2 THEN 'Mumbai' WHEN 3 THEN 'Chennai'
                  WHEN 4 THEN 'Kolkata' WHEN 5 THEN 'Jaipur' WHEN 6 THEN 'Hyderabad' ELSE 'Bengaluru' END,
       date('2024-01-01', '+' || (n * 3 % 700) || ' days'),
       CASE WHEN n % 5 = 0 THEN NULL ELSE 1 + (n * 11 % 50) END
FROM seq WHERE n <= 320;
INSERT INTO products
SELECT n, 'Product ' || n,
       CASE n % 5 WHEN 0 THEN 'books' WHEN 1 THEN 'toys' WHEN 2 THEN 'kitchen' WHEN 3 THEN 'garden' ELSE 'tech' END,
       199 + (n * 137 % 5000)
FROM seq WHERE n <= 60;
INSERT INTO orders
SELECT n, 1 + (n * 7 % 300),
       CASE WHEN n % 50 = 0 THEN 'pending' WHEN n % 10 = 5 THEN 'cancelled' WHEN n % 3 = 0 THEN 'shipped' ELSE 'delivered' END,
       datetime('2025-01-01', '+' || (n * 37 % 640) || ' days', '+' || (n * 4099 % 86400) || ' seconds'),
       500 + (n * 7919 % 20000)
FROM seq;
INSERT INTO order_items
SELECT o.n, 1 + (o.n * 13 + k.k * 31) % 60, 1 + (o.n + k.k) % 4
FROM seq o JOIN (SELECT 1 AS k UNION ALL SELECT 2) k
WHERE o.n <= 3000;
DROP TABLE seq;
CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_orders_created  ON orders(created_at);
CREATE INDEX idx_orders_status_created ON orders(status, created_at);
CREATE INDEX idx_customers_city  ON customers(city);
CREATE INDEX idx_items_product   ON order_items(product_id);
`;

  /* ---------------- small helpers shared by the visualizers ---------------- */
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function nums(s, what) {
    var a = String(s || '').trim().split(/[\s,]+/).filter(function (x) { return x !== ''; }).map(Number);
    if (!a.length || a.some(function (x) { return isNaN(x) || Math.floor(x) !== x; })) throw new Error('Enter whole numbers for ' + what + ', e.g. 3 1 4 1 5');
    return a;
  }
  function twoLists(input) {
    var p = String(input || '').split('|');
    if (p.length !== 2) throw new Error('Format: outer keys | inner keys   e.g.  3 1 4 | 1 4 4 9');
    var R = nums(p[0], 'the outer table'), S = nums(p[1], 'the inner table');
    if (R.length > 8 || S.length > 8) throw new Error('Use at most 8 keys per side so the animation stays readable');
    return { R: R, S: S };
  }
  function rowsOf(keys, prefix) { return keys.map(function (k, i) { return [prefix + (i + 1), k]; }); }
  function pipeGraph(hl, ehl, tags) {
    return {
      type: 'graph', label: 'Query pipeline', directed: true, height: 46,
      nodes: [
        { id: 'SQL', label: 'SQL text', x: 6, y: 23, shape: 'box' },
        { id: 'P', label: 'Parser', x: 24, y: 23, shape: 'box' },
        { id: 'B', label: 'Binder', x: 40, y: 23, shape: 'box' },
        { id: 'RW', label: 'Rewriter', x: 56, y: 23, shape: 'box' },
        { id: 'OPT', label: 'Planner', x: 72, y: 23, shape: 'box' },
        { id: 'EX', label: 'Executor', x: 90, y: 23, shape: 'box' },
        { id: 'CAT', label: 'Catalog + stats', x: 56, y: 5, shape: 'box' },
        { id: 'ST', label: 'Storage', x: 90, y: 41, shape: 'box' }
      ],
      edges: [['SQL', 'P'], ['P', 'B', 'tree'], ['B', 'RW'], ['RW', 'OPT'], ['OPT', 'EX', 'plan'], ['CAT', 'B'], ['CAT', 'OPT'], ['EX', 'ST', 'pages']],
      hl: hl || {}, ehl: ehl || {}, tags: tags || {}
    };
  }

  /* =====================================================================
     TOPIC 1 — The query planner pipeline
     ===================================================================== */
  var CAT = {
    customers: { rows: 320, cols: { id: 320, email: 320, name: 320, city: 8, signup_date: 233, referred_by: 50 }, idx: { id: 'PRIMARY KEY', email: 'sqlite_autoindex_customers_1', city: 'idx_customers_city' } },
    orders: { rows: 3000, cols: { id: 3000, customer_id: 300, status: 4, created_at: 3000, total_cents: 2000 }, idx: { id: 'PRIMARY KEY', customer_id: 'idx_orders_customer', created_at: 'idx_orders_created', status: 'idx_orders_status_created' } },
    products: { rows: 60, cols: { id: 60, name: 60, category: 5, price_cents: 60 }, idx: { id: 'PRIMARY KEY' } },
    order_items: { rows: 6000, cols: { order_id: 3000, product_id: 60, qty: 4 }, idx: { order_id: 'sqlite_autoindex_order_items_1', product_id: 'idx_items_product' } }
  };
  function log2(n) { return Math.max(1, Math.round(Math.log(n) / Math.LN2)); }

  topics.push({
    title: 'The Query Planner: From SQL Text to a Running Plan',
    analogy: `<p>Think of a <b>GPS app</b>. You only say <i>where</i> you want to go ("airport, please") — you never say which roads to take. The app checks its <b>map</b> (which roads exist), looks at <b>live traffic</b> (how busy each road is), imagines many possible routes, estimates the time of each, and picks the fastest. Then you drive it.</p>
<p>SQL works the same way. You describe <b>what</b> rows you want. The database's <b>planner</b> is the GPS: it reads the <b>catalog</b> (the map of tables and indexes), the <b>statistics</b> (the traffic report), prices many possible "routes" (plans), and hands the cheapest one to the <b>executor</b> (the driver). When the traffic data is old, the GPS sends you into a jam — and when statistics are stale, the planner picks a slow plan.</p>`,
    explain: `<p><b>SQL is declarative.</b> You say <i>what</i> result you want; the database decides <i>how</i> to get it. The part that decides is called the <b>query optimizer</b> or <b>planner</b>. Every query goes through the same five stations:</p>
${H.table(['#', 'Stage', 'What it does (plain words)', 'Typical error / output'], [
  ['1', '<b>Parse</b>', 'Checks grammar and turns text into a tree (like diagramming a sentence).', H.c('r', 'syntax error near "SELEC"')],
  ['2', '<b>Bind / analyze</b>', 'Looks every name up in the catalog: does table <code>orders</code> exist? does column <code>status</code> exist? what type is it?', H.c('r', 'no such column: nme')],
  ['3', '<b>Rewrite</b>', 'Rewrites the tree into an equal but simpler one: expand views, flatten subqueries, push filters down, fold <code>40+2</code> into <code>42</code>, drop <code>1=1</code>.', 'a logically equal, simpler tree'],
  ['4', '<b>Plan / optimize</b>', 'Lists possible plans (which index, which join order, which join algorithm), estimates the cost of each using statistics, keeps the cheapest.', 'a <b>physical plan</b> tree — what EXPLAIN shows'],
  ['5', '<b>Execute</b>', 'Runs the plan. Each operator (scan, filter, join, sort) asks its child "give me the next row" until done.', 'result rows']
])}
<p><b>Logical vs physical.</b> After rewriting, the query is a <i>logical</i> plan: "join customers and orders, filter by city". The planner turns it into a <i>physical</i> plan: "seek <code>idx_customers_city</code> for Delhi, then for each customer seek <code>idx_orders_customer</code>". The same logical plan has many physical versions — that choice is where speed is won or lost.</p>
<p><b>Cost-based optimization (CBO).</b> Each physical plan gets a <b>cost</b>: an estimate of disk pages read plus CPU work. The estimate needs to know <i>how many rows</i> each step produces (the <b>cardinality</b>), which comes from <b>statistics</b> (topic 5). Old databases used fixed <i>rules</i> ("always use an index if one exists") — the rule-based optimizer. Modern engines (PostgreSQL, MySQL 8, SQL Server, Oracle, SQLite's "NGQP") are all cost-based.</p>
<p><b>Why the search is hard.</b> With <i>n</i> tables there are <i>n!</i> join orders before you even pick indexes and algorithms: ${H.table(['tables', 'join orders (n!)'], [['3', '6'], ['5', '120'], ['8', '40,320'], ['12', '479,001,600']])} So planners use <b>dynamic programming</b> (best plan for every subset of tables, built bottom-up) for small joins and <b>heuristics</b> for big ones (PostgreSQL switches to a genetic search, GEQO, at 12+ tables by default).</p>
<p><b>Interview one-liner:</b> "The query is parsed, names are bound against the catalog, it is rewritten into a simpler equivalent, the cost-based optimizer picks the cheapest physical plan using table statistics, and the executor pulls rows through that operator tree."</p>`,
    clues: [
      '"What happens when you run a SQL query?" → walk the five stages: parse, bind, rewrite, plan, execute',
      '"The query was fast yesterday and slow today, nothing was deployed" → plan flip caused by changed statistics or parameters',
      '"How does the database decide which index to use?" → cost-based optimizer + statistics + cardinality estimates',
      '"Does the order of tables in FROM matter?" → for inner joins, no: the planner reorders them (with limits for very large joins)',
      '"Planning takes longer than executing" / 15-table joins → join-order search explosion (n!), GEQO, join_collapse_limit',
      '"Prepared statement is slow after the 6th run" → PostgreSQL switched from a custom plan to a generic plan'
    ],
    code: [
      { lang: 'sql', db: 'shop', title: 'Ask SQLite for its chosen plan, then run the query (▶ Run)', code: `-- 1) What plan will SQLite use? (EXPLAIN QUERY PLAN does NOT run the query)
EXPLAIN QUERY PLAN
SELECT c.name, o.id, o.total_cents
FROM customers c
JOIN orders o ON o.customer_id = c.id
WHERE c.city = 'Delhi' AND o.status = 'pending';

-- 2) Now actually run it
SELECT c.name, o.id, o.total_cents
FROM customers c
JOIN orders o ON o.customer_id = c.id
WHERE c.city = 'Delhi' AND o.status = 'pending'
ORDER BY o.id
LIMIT 5;` },
      { lang: 'sql', db: 'shop', title: 'The rewriter at work: a subquery in FROM is flattened into one index seek', code: `-- Written as a derived table with two separate filters...
EXPLAIN QUERY PLAN
SELECT *
FROM (SELECT * FROM orders WHERE status = 'pending') AS t
WHERE t.created_at > '2026-01-01';
-- ...but the plan is ONE seek on idx_orders_status_created (status=? AND created_at>?)
-- because the rewriter merged the outer filter into the inner query (subquery flattening).

-- Constant folding + dead predicate removal: 1=1 disappears, 40+2 becomes 42
EXPLAIN QUERY PLAN
SELECT * FROM orders WHERE 1 = 1 AND customer_id = 40 + 2;` }
    ],
    codeTitle: ['Plan first, then run', 'Rewriter: flattening and constant folding'],
    viz: {
      title: 'Follow one query through parse → bind → rewrite → plan → execute',
      input: "SELECT c.name, o.total_cents FROM customers c JOIN orders o ON o.customer_id = c.id WHERE c.city = 'Delhi' AND o.status = 'pending'",
      inputLabel: 'A SELECT over 1–2 of: customers, orders, products, order_items',
      gen: function (input) {
        var sql = String(input || '').replace(/\s+/g, ' ').trim().replace(/;$/, '');
        if (!/^select\s/i.test(sql) || !/\sfrom\s/i.test(sql)) throw new Error('Type a query like: SELECT ... FROM orders o WHERE o.status = \'pending\'');
        if (sql.length > 300) throw new Error('Keep the query under 300 characters');
        var frames = [];
        var toks = sql.match(/'[^']*'|[A-Za-z_][A-Za-z0-9_]*|\d+|<=|>=|<>|!=|[=<>(),*.;+-]/g) || [];
        frames.push({ narr: 'You hand the database plain <b>text</b>. Nothing is known yet — not even whether the tables exist. The text now travels through five stations.', parts: [pipeGraph({ SQL: 'cur' }), { type: 'text', label: 'Your SQL', html: '<code>' + H.esc(sql) + '</code>' }] });
        frames.push({ narr: '<b>Parser, step 1 — tokenize.</b> The text is chopped into <b>tokens</b>: keywords, names, operators, literals. ' + toks.length + ' tokens here. A typo like <code>SELEC</code> dies right here with a syntax error.', parts: [pipeGraph({ P: 'cur' }, { 'SQL-P': 'ok' }), { type: 'array', label: 'tokens (first 20)', values: toks.slice(0, 20), hl: { 0: 'sel' } }] });
        // --- tables + aliases
        var fromPart = sql.split(/\swhere\s/i)[0].split(/\sfrom\s/i)[1] || '';
        fromPart = fromPart.split(/\s(group|order|limit)\s/i)[0];
        var tabs = [], re = /(?:^|,|\bjoin\b)\s*([A-Za-z_]\w*)(?:\s+(?:as\s+)?(?!join\b|on\b|where\b|inner\b|left\b|cross\b)([A-Za-z_]\w*))?/gi, m;
        while ((m = re.exec(fromPart))) tabs.push({ name: m[1].toLowerCase(), alias: (m[2] || m[1]).toLowerCase() });
        if (!tabs.length) throw new Error('Could not find a table after FROM');
        if (tabs.length > 2) throw new Error('This visualizer prices 1 or 2 tables. Try a two-table join.');
        var whereTxt = (sql.split(/\swhere\s/i)[1] || '').split(/\s(group|order|limit)\s/i)[0];
        var onTxt = (fromPart.match(/\son\s(.+)$/i) || [])[1] || '';
        var conj = [].concat(onTxt ? onTxt.split(/\sand\s/i) : [], whereTxt ? whereTxt.split(/\sand\s/i) : []).map(function (x) { return x.trim(); }).filter(Boolean);
        // parse tree graph
        var nodes = [{ id: 'S', label: 'SELECT', x: 50, y: 6, shape: 'box' }, { id: 'F', label: 'FROM', x: 22, y: 26, shape: 'box' }, { id: 'W', label: 'WHERE', x: 72, y: 26, shape: 'box' }], edges = [['S', 'F'], ['S', 'W']];
        tabs.forEach(function (t, i) { nodes.push({ id: 'T' + i, label: t.name + ' ' + t.alias, x: 10 + i * 24, y: 46, shape: 'box' }); edges.push(['F', 'T' + i]); });
        conj.slice(0, 3).forEach(function (c, i) { nodes.push({ id: 'C' + i, label: c.length > 22 ? c.slice(0, 21) + '…' : c, x: 58 + i * 16 - (conj.length > 2 ? 6 : 0), y: 46 + (i % 2) * 8, shape: 'box' }); edges.push(['W', 'C' + i]); });
        frames.push({ narr: '<b>Parser, step 2 — build the parse tree.</b> Grammar rules group tokens into a tree: a SELECT node with a FROM branch (the tables) and a WHERE branch (the conditions). A JOIN ... ON condition is just another condition.', parts: [{ type: 'graph', label: 'parse tree (simplified)', directed: true, height: 60, nodes: nodes, edges: edges, hl: { S: 'cur' } }] });
        // --- binder
        var ents = [], bad = null;
        tabs.forEach(function (t) {
          var c = CAT[t.name];
          if (!c) { bad = t.name; ents.push([t.alias, H.esc(t.name) + ' ✗ not in catalog']); } else ents.push([t.alias, t.name + ' (' + c.rows + ' rows, ' + Object.keys(c.idx).length + ' indexed cols)']);
        });
        var hlB = {}; tabs.forEach(function (t) { hlB[t.alias] = CAT[t.name] ? 'ok' : 'bad'; });
        frames.push({ narr: '<b>Binder.</b> Every name is looked up in the <b>catalog</b> (the database\'s dictionary of tables, columns, types, indexes). ' + (bad ? '<span class="c-r">Table <b>' + H.esc(bad) + '</b> is unknown → the query stops here with "no such table". The planner never runs.</span>' : 'All tables resolve, aliases are attached to real tables, and column types are known (so <code>\'42\'</code> vs <code>42</code> comparisons can be checked).'), parts: [pipeGraph({ B: bad ? 'bad' : 'cur', CAT: 'sel' }, { 'P-B': 'ok', 'CAT-B': 'ok' }), { type: 'map', label: 'alias → catalog object', entries: ents, hl: hlB }] });
        if (bad) {
          frames.push({ narr: 'Fix the table name (known tables: customers, orders, products, order_items) and press ▶ again.', parts: [{ type: 'text', html: 'Binding errors are cheap: they happen in microseconds, before any data is read.' }] });
          return frames;
        }
        // --- rewrite
        var notes = [];
        if (onTxt) notes.push('JOIN ... ON condition moved into the same predicate list as WHERE (inner join ⇒ they are equivalent).');
        if (/\b1\s*=\s*1\b/.test(sql)) notes.push('<code>1 = 1</code> is always true → removed.');
        if (/\d+\s*[+*-]\s*\d+/.test(sql)) notes.push('Constant arithmetic folded once (e.g. <code>40 + 2</code> → <code>42</code>).');
        if (/\bin\s*\(\s*select/i.test(sql)) notes.push('<code>IN (SELECT …)</code> considered as a semi-join.');
        if (!notes.length) notes.push('Nothing to simplify — the query was already in its simplest form.');
        frames.push({ narr: '<b>Rewriter.</b> The tree is turned into an equal-but-simpler tree. Real engines also expand views, flatten subqueries in FROM and push filters down to the tables they belong to.', parts: [pipeGraph({ RW: 'cur' }, { 'B-RW': 'ok' }), { type: 'set', label: 'predicate list after rewrite (ANDed)', items: conj.filter(function (c) { return !/^1\s*=\s*1$/.test(c); }) }, { type: 'text', label: 'rewrites applied', html: '<ul><li>' + notes.join('</li><li>') + '</li></ul>' }] });
        // --- planner: price access paths
        function localPreds(t) {
          return conj.map(function (c) {
            var mm = c.match(/^(?:([A-Za-z_]\w*)\.)?([A-Za-z_]\w*)\s*(=|<=|>=|<|>|like)\s*('[^']*'|\d+)$/i);
            if (!mm) return null;
            if (mm[1] && mm[1].toLowerCase() !== t.alias) return null;
            if (!mm[1] && tabs.length > 1) return null;
            return { col: mm[2].toLowerCase(), op: mm[3].toLowerCase(), val: mm[4] };
          }).filter(Boolean);
        }
        function sel(t, p) { var d = CAT[t.name].cols[p.col] || 10; return p.op === '=' ? 1 / d : p.op === 'like' ? (/^'%/.test(p.val) ? 0.25 : 0.1) : 0.33; }
        function access(t) {
          var c = CAT[t.name], ps = localPreds(t), out = c.rows, best = { how: 'SCAN ' + t.alias, cost: c.rows };
          ps.forEach(function (p) { out *= sel(t, p); });
          ps.forEach(function (p) {
            var ix = c.idx[p.col];
            if (!ix || (p.op === 'like' && /^'%/.test(p.val))) return;
            var matches = c.rows * sel(t, p), cost = log2(c.rows) + matches * (ix === 'PRIMARY KEY' ? 1 : 2);
            if (cost < best.cost) best = { how: 'SEARCH ' + t.alias + ' USING ' + (ix === 'PRIMARY KEY' ? 'PRIMARY KEY' : 'INDEX ' + ix) + ' (' + p.col + (p.op === '=' ? '=?' : p.op + '?') + ')', cost: cost };
          });
          return { how: best.how, cost: Math.max(1, Math.round(best.cost)), out: Math.max(1, Math.round(out)), scan: c.rows };
        }
        var cand = [];
        if (tabs.length === 1) {
          var a = access(tabs[0]);
          cand.push({ plan: 'SCAN ' + tabs[0].alias, cost: a.scan, rows: a.out });
          if (a.how.indexOf('SEARCH') === 0) cand.push({ plan: a.how, cost: a.cost, rows: a.out });
        } else {
          [[0, 1], [1, 0]].forEach(function (ord) {
            var A = tabs[ord[0]], B = tabs[ord[1]], aa = access(A);
            // join column of B
            var jc = null;
            conj.forEach(function (c) {
              var mm = c.match(/^([A-Za-z_]\w*)\.(\w+)\s*=\s*([A-Za-z_]\w*)\.(\w+)$/);
              if (!mm) return;
              if (mm[1].toLowerCase() === B.alias && mm[3].toLowerCase() === A.alias) jc = mm[2].toLowerCase();
              if (mm[3].toLowerCase() === B.alias && mm[1].toLowerCase() === A.alias) jc = mm[4].toLowerCase();
            });
            var cb = CAT[B.name], perProbe, fan;
            if (jc && cb.idx[jc]) { fan = cb.rows / (cb.cols[jc] || cb.rows); perProbe = log2(cb.rows) + fan * (cb.idx[jc] === 'PRIMARY KEY' ? 1 : 2); }
            else { fan = jc ? cb.rows / (cb.cols[jc] || cb.rows) : cb.rows; perProbe = cb.rows; }
            var bOnly = access(B), bSel = bOnly.out / cb.rows;
            cand.push({ plan: aa.how + ' → for each row: ' + (jc && cb.idx[jc] ? 'SEARCH ' + B.alias + ' (' + jc + '=?)' : 'SCAN ' + B.alias), cost: Math.round(aa.cost + aa.out * perProbe), rows: Math.max(1, Math.round(aa.out * fan * bSel)) });
          });
        }
        var bestI = 0; cand.forEach(function (c, i) { if (c.cost < cand[bestI].cost) bestI = i; });
        frames.push({ narr: '<b>Planner — enumerate and price.</b> For each table it asks "full scan or index seek?", and for joins "which table goes first (outer)?". Each candidate gets a <b>cost</b> from the row estimates in the statistics (here: a tiny model — rows touched, plus 2× for each index→table lookup).', parts: [pipeGraph({ OPT: 'cur', CAT: 'sel' }, { 'RW-OPT': 'ok', 'CAT-OPT': 'ok' }), { type: 'table', label: 'candidate physical plans', columns: ['#', 'plan', 'est. cost', 'est. rows out'], rows: cand.map(function (c, i) { return [i + 1, c.plan, c.cost, c.rows]; }) }] });
        var hlb = {}; hlb[bestI] = 'ok';
        frames.push({ narr: '<b>Planner — pick the cheapest.</b> Plan #' + (bestI + 1) + ' wins with estimated cost ' + cand[bestI].cost + '. Notice the planner never runs the losers; it trusts its <i>estimates</i>. If an estimate is wrong, it can confidently choose a bad plan — that is why statistics matter.', parts: [{ type: 'bars', label: 'estimated cost per candidate (lower is better)', values: cand.map(function (c) { return c.cost; }), idxLabels: cand.map(function (c, i) { return '#' + (i + 1); }), hl: hlb }, { type: 'table', label: 'chosen plan', columns: ['plan'], rows: [[cand[bestI].plan]], hl: { 0: 'sel' } }] });
        var ops = tabs.length === 2 ? ['Scan/Seek ' + tabs[0].alias, 'Nested loop join', 'Filter', 'Project (SELECT list)'] : ['Scan/Seek ' + tabs[0].alias, 'Filter', 'Project (SELECT list)'];
        frames.push({ narr: '<b>Executor — the iterator (Volcano) model.</b> The top operator calls <code>next()</code> on its child, which calls its child, down to the scan at the bottom. One row at a time flows upward. A <code>LIMIT 5</code> on top simply stops calling <code>next()</code> after 5 rows — which is why LIMIT can make a query finish early.', parts: [pipeGraph({ EX: 'cur', ST: 'sel' }, { 'OPT-EX': 'ok', 'EX-ST': 'ok' }), { type: 'stack', label: 'operator tree (bottom → top)', items: ops, hl: { 0: 'cur' } }] });
        frames.push({ narr: 'Rows flow up through the operators and stream to you. ' + H.c('g', 'Estimated ' + cand[bestI].rows + ' row(s).') + ' Try editing the query: remove the city filter, use <code>LIKE \'%x\'</code>, or swap the table order and watch the candidate costs change.', parts: [pipeGraph({ EX: 'ok', SQL: 'done', P: 'done', B: 'done', RW: 'done', OPT: 'done' }, { 'SQL-P': 'ok', 'P-B': 'ok', 'B-RW': 'ok', 'RW-OPT': 'ok', 'OPT-EX': 'ok' }), { type: 'vars', label: 'summary', vals: { tables: tabs.length, predicates: conj.length, candidates: cand.length, chosen: '#' + (bestI + 1), estCost: cand[bestI].cost } }] });
        return frames;
      }
    },
    examples: [
      { title: 'Which stage rejected my query?', html: `<p>Errors tell you how far the query got:</p>${H.table(['Query', 'Error', 'Stage'], [
        ['<code>SELEC name FROM customers</code>', 'near "SELEC": syntax error', 'Parse'],
        ['<code>SELECT nme FROM customers</code>', 'no such column: nme', 'Bind'],
        ['<code>SELECT name FROM customer</code>', 'no such table: customer', 'Bind'],
        ['<code>SELECT name FROM customers WHERE id = 1/0</code>', 'returns NULL in SQLite (error in PostgreSQL)', 'Execute']
      ])}<p>Parse and bind errors cost microseconds and touch no data. Execution errors can happen after millions of rows were read.</p>`, code: { lang: 'text', code: `sqlite> SELEC name FROM customers;
Parse error: near "SELEC": syntax error
sqlite> SELECT nme FROM customers;
Parse error: no such column: nme      -- SQLite labels it "parse error", but it is the name-binding step` } },
      { title: 'Table order in FROM does not matter (for inner joins)', html: `<p>Old-style comma join with <code>orders</code> first, and modern JOIN with <code>customers</code> first. The planner reorders both into the same plan: start from the 38 Delhi customers (index on city), then seek each one's orders.</p>${H.table(['written as', 'plan line 1', 'plan line 2'], [['FROM orders o, customers c WHERE …', 'SEARCH c USING INDEX idx_customers_city (city=?)', 'SEARCH o USING INDEX idx_orders_customer (customer_id=?)'], ['FROM customers c JOIN orders o ON …', 'same', 'same']])}<p>Exceptions: LEFT/RIGHT joins limit reordering; SQLite treats <code>CROSS JOIN</code> as "keep this order"; PostgreSQL stops reordering past <code>join_collapse_limit</code> (8) tables.</p>`, code: { lang: 'sql', db: 'shop', code: `EXPLAIN QUERY PLAN
SELECT c.name, o.total_cents FROM orders o, customers c
WHERE o.customer_id = c.id AND c.city = 'Delhi';

EXPLAIN QUERY PLAN
SELECT c.name, o.total_cents FROM customers c
JOIN orders o ON o.customer_id = c.id
WHERE c.city = 'Delhi';` } },
      { title: 'Views are "pasted in", not run separately', html: `<p>A (non-materialized) view is a saved query. The rewriter replaces the view name with its definition and then optimizes the whole thing together, so the filter <code>status = 'pending'</code> written <i>outside</i> the view can still use an index on <code>orders</code> <i>inside</i> it.</p><p>Plan: <code>SEARCH o USING INDEX idx_orders_status_created (status=?)</code> then <code>SEARCH c USING INTEGER PRIMARY KEY</code>. No temp table, no "run the view first".</p>`, code: { lang: 'sql', db: 'shop', code: `CREATE TEMP VIEW delhi_orders AS
SELECT o.*, c.name
FROM orders o JOIN customers c ON c.id = o.customer_id
WHERE c.city = 'Delhi';

EXPLAIN QUERY PLAN
SELECT * FROM delhi_orders WHERE status = 'pending';

SELECT id, name, status FROM delhi_orders WHERE status = 'pending' ORDER BY id LIMIT 5;` } },
      { title: 'Prepared statements and plan caching', html: `<p>Planning is not free (often 0.1–5 ms; much more for 10+ table joins). So drivers <b>prepare</b> a statement once and execute it many times with different parameters.</p><ul><li><b>PostgreSQL</b>: the first 5 executions get a <i>custom plan</i> (planned with the real value). After that, if a <i>generic plan</i> (planned for "any value") is not more expensive on average, it is reused. Great for uniform data; bad if one value is rare and another is huge. Control it with <code>plan_cache_mode = force_custom_plan</code>.</li><li><b>SQL Server</b>: caches the plan compiled for the <i>first</i> parameter value — "parameter sniffing". Fixes: <code>OPTION (RECOMPILE)</code>, <code>OPTIMIZE FOR</code>, Query Store plan forcing.</li><li><b>SQLite</b>: <code>sqlite3_prepare_v2</code> compiles to bytecode once; it re-prepares automatically when the schema or stats change.</li></ul>`, code: { lang: 'sql', check: false, code: `-- PostgreSQL
PREPARE by_status(text) AS
  SELECT * FROM orders WHERE status = $1;
EXECUTE by_status('pending');      -- custom plan (index seek, value is rare)
-- ... after 5 runs Postgres may switch to a generic plan for every value
SET plan_cache_mode = force_custom_plan;  -- always re-plan with the real value` } }
    ],
    deepDive: `<h4>How real planners search</h4>
<ul>
<li><b>System R / Selinger (1979)</b> — the blueprint still used today: dynamic programming over subsets of tables, building <b>left-deep</b> join trees (each join's right input is a base table), and keeping extra plans with "<b>interesting orders</b>" (a plan that is a bit more expensive but already sorted by the join or ORDER BY key may win later because it avoids a sort).</li>
<li><b>PostgreSQL</b>: DP over join orders up to <code>geqo_threshold</code> = 12 FROM items, genetic search above; <code>from_collapse_limit</code>/<code>join_collapse_limit</code> = 8 cap how many tables get reordered together. Cost units: <code>seq_page_cost = 1.0</code>, <code>random_page_cost = 4.0</code> (often lowered to ~1.1 on SSDs), <code>cpu_tuple_cost = 0.01</code>, <code>cpu_operator_cost = 0.0025</code>. Version 16+ can also reorder and add incremental sorts; 17 improved IN-list and correlated-subquery handling.</li>
<li><b>SQLite NGQP</b>: treats join ordering as a shortest-path problem over a graph of "which table next", keeping the N best partial paths (N = 1, 5 or 10+ depending on join size). It only implements nested-loop joins, but builds <b>automatic indexes</b> and <b>Bloom filters</b> on the fly to make them fast.</li>
<li><b>Cascades / Volcano optimizer</b> (SQL Server, CockroachDB, Apache Calcite): top-down search with a memo of equivalent expressions and transformation rules — good at bushy trees and pluggable rules.</li>
</ul>
<h4>Execution models</h4>
<ul>
<li><b>Iterator / Volcano</b> (PostgreSQL, MySQL): <code>next()</code> one row at a time — simple, pipelined, but lots of function-call overhead per row.</li>
<li><b>Bytecode VM</b> (SQLite's VDBE): the plan is compiled to opcodes like <code>OpenRead</code>, <code>SeekGE</code>, <code>IdxGT</code>, <code>Next</code>. Plain <code>EXPLAIN</code> (without QUERY PLAN) shows them.</li>
<li><b>Vectorized</b> (DuckDB, ClickHouse, Snowflake): pass batches of ~1–2K values per call, CPU-cache friendly, SIMD — 10–100× faster for analytics.</li>
<li><b>Compiled</b> (HyPer/Umbra, Spark codegen, PostgreSQL JIT for expressions): generate machine code per query.</li>
</ul>
<h4>Adaptive execution</h4><p>Because estimates can be wrong, newer engines adjust mid-flight: SQL Server <i>adaptive joins</i> (hash vs nested loop decided after the build side is read), Oracle adaptive plans, Spark AQE (re-plans between stages using real sizes). PostgreSQL does not re-plan mid-query; it relies on good statistics.</p>`,
    aiEra: `<p><b>What AI changes:</b> Copilots and text-to-SQL tools now write a large share of SQL. They are good at producing <i>correct</i> SQL, but they cannot see your table sizes, indexes or data skew, so they often produce planner-hostile SQL (functions on indexed columns, OFFSET pagination, correlated subqueries over big tables). The planner pipeline is how you explain <i>why</i> such a query is slow.</p>
<p><b>Use AI as a partner:</b> paste the schema + <code>EXPLAIN</code> output and ask "explain this plan node by node and list three hypotheses for why the estimate is wrong — don't rewrite yet". Ask it to generate equivalent rewrites, then let the <i>planner</i> judge them with EXPLAIN.</p>
<p><b>Where AI goes wrong:</b> it invents plan node names that your engine doesn't have (e.g. "hash join" in SQLite), assumes table order in FROM matters, or "optimizes" by adding hints that freeze a plan forever. Research optimizers that learn from feedback (Bao, Neo, Microsoft's work in SQL Server) exist, but production engines still rely on classic cost models.</p>
<p><b>What you must still own:</b> knowing the five stages, reading the chosen plan, and judging whether the row estimates match reality.</p>`,
    problems: [
      {
        title: 'Does rewriting the join change the plan?', level: 'Easy', tags: ['planner', 'EXPLAIN QUERY PLAN', 'join order'], companies: ['Amazon', 'Flipkart'],
        statement: `<p>A teammate claims that this old comma-style query is slow "because <code>orders</code> is listed first", and wants to rewrite it with an explicit <code>JOIN</code> and <code>customers</code> first:</p><pre>SELECT c.name, o.total_cents
FROM orders o, customers c
WHERE o.customer_id = c.id AND c.city = 'Delhi';</pre><p>Prove or disprove the claim using the database itself. Show the evidence.</p>`,
        constraints: `Use the <code>shop</code> database (SQLite). No timing on a laptop — use the planner's own output.`,
        example: `<p>Expected evidence: both <code>EXPLAIN QUERY PLAN</code> outputs are identical — ${H.c('g', 'SEARCH c USING INDEX idx_customers_city (city=?)')} then ${H.c('g', 'SEARCH o USING INDEX idx_orders_customer (customer_id=?)')}. So the claim is false; join order in FROM is a hint to humans, not to the planner.</p>`,
        brute: { why: `<p>The "brute force" is to rewrite by gut feeling and run each version once with a stopwatch. One run proves nothing: the second run hits a warm cache, laptops are noisy, and on 3,000 rows both finish in under a millisecond. You learn nothing about what the engine actually does.</p>`, code: { lang: 'sql', db: 'shop', code: `-- Gut-feeling rewrite, "timed" once. Tells you nothing about the plan.
SELECT c.name, o.total_cents
FROM customers c JOIN orders o ON o.customer_id = c.id
WHERE c.city = 'Delhi'
LIMIT 5;` } },
        mcq: { q: 'For an INNER join between two tables, who decides which table is read first?', options: ['The order you wrote them in FROM', 'The cost-based planner, using indexes and statistics', 'Always the smaller table, no matter what', 'The table with the primary key'], answer: 1, explain: 'The planner reorders inner joins freely and picks the order with the lowest estimated cost. The written order only matters for outer joins, CROSS JOIN in SQLite, or past join_collapse_limit in PostgreSQL.' },
        hints: [`<p>Hint 1: Don't measure time — ask the planner what it <i>intends</i> to do. Which command shows the plan without running the query?</p>`, `<p>Hint 2: Put <code>EXPLAIN QUERY PLAN</code> in front of both versions and compare line by line.</p>`, `<p>Hint 3: If both plans start from <code>customers</code> via <code>idx_customers_city</code>, the planner already reordered the comma join. Recipe: EQP(A), EQP(B), compare, conclude.</p>`],
        solution: {
          approach: `<p>Both queries are the same <i>logical</i> query (an inner join with a city filter), so after rewriting they produce the same tree and the planner prices the same candidates. It starts from the selective side (38 Delhi customers via the city index) and probes <code>orders</code> through <code>idx_orders_customer</code>. The output of both EXPLAINs is identical, which disproves the claim. If the query <i>is</i> slow in production, look at the plan and statistics, not at the text order.</p>`,
          code: { lang: 'sql', db: 'shop', code: `-- Version A: comma join, orders first
EXPLAIN QUERY PLAN
SELECT c.name, o.total_cents
FROM orders o, customers c
WHERE o.customer_id = c.id AND c.city = 'Delhi';

-- Version B: explicit JOIN, customers first
EXPLAIN QUERY PLAN
SELECT c.name, o.total_cents
FROM customers c
JOIN orders o ON o.customer_id = c.id
WHERE c.city = 'Delhi';
-- Both print:
--   SEARCH c USING INDEX idx_customers_city (city=?)
--   SEARCH o USING INDEX idx_orders_customer (customer_id=?)` },
          complexity: `<p>Plan: ~38 index entries for Delhi + 38 index seeks into orders (≈ 10 rows each) ≈ 380 row fetches, instead of 3,000 × 320 pair checks for a naive nested loop.</p>`,
          followUps: ['What happens if you write <code>FROM orders o CROSS JOIN customers c</code> in SQLite? (It forces orders first — check the plan.)', 'Would the answer change for a LEFT JOIN?']
        }
      }
    ]
  });

  registerModule({
    id: 'sql11',
    title: 'Query Execution & Optimization',
    lang: 'sql',
    intro: `<p>You can already write correct SQL. This module is about making it <b>fast</b> — and about being able to <b>prove why</b> it is fast or slow. You will follow a query through the database's own pipeline (parse → bind → rewrite → plan → execute), learn to read <code>EXPLAIN QUERY PLAN</code> (SQLite) and <code>EXPLAIN ANALYZE</code> (PostgreSQL) like a story, tell a full <b>scan</b> from an index <b>seek</b>, and watch the three join algorithms — <b>nested loop</b>, <b>hash join</b> and <b>merge join</b> — step through real rows.</p>
<p>Then we go after the usual culprits behind slow queries: <b>statistics</b> that lie (stale or skewed), <b>non-sargable predicates</b> that hide indexes behind functions, and query shapes the planner cannot optimize — which you will fix with <b>query rewriting</b> (keyset pagination, EXISTS instead of DISTINCT, joins instead of per-row subqueries, UNION ALL instead of OR, and more).</p>
<p>Every SQL box with a ▶ button runs live in your browser against the <code>shop</code> database (320 customers, 60 products, 3,000 orders, 6,000 order lines), so you can check every plan yourself. This is the module interviewers use to tell "knows SQL" from "can run SQL in production".</p>`,
    goals: [
      'Explain, stage by stage, what happens between sending SQL text and getting rows back (parse, bind, rewrite, cost-based planning, execution)',
      'Read SQLite <code>EXPLAIN QUERY PLAN</code> and PostgreSQL <code>EXPLAIN (ANALYZE, BUFFERS)</code> output, find the expensive node, and spot estimate-vs-actual mismatches',
      'Tell when a full scan beats an index seek, and design covering indexes that turn lookups into index-only scans',
      'Simulate nested-loop, hash and merge joins by hand, state their costs and memory needs, and pick the right one for a scenario',
      'Explain how statistics (row counts, distinct values, histograms, MCVs) drive estimates, and fix plans broken by stale or skewed stats',
      'Turn non-sargable predicates into sargable ones and rewrite slow query shapes (OFFSET paging, OR across columns, correlated subqueries, NOT IN with NULLs) into fast equivalents'
    ],
    prereqs: `SQL 4 (JOINs), SQL 5 (Subqueries &amp; CTEs), SQL 6 (Window Functions) and especially <b>SQL 10 (Index Internals)</b> — B+trees, composite indexes, the left-prefix rule and covering indexes are used everywhere here. DSA basics (Big-O, hashing, sorting, binary search) help for the join algorithms.`,
    hours: 12,
    databases: { shop: DB_SHOP },
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
