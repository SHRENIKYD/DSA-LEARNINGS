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

  /* =====================================================================
     TOPIC 2 — Reading plans: EXPLAIN, EXPLAIN QUERY PLAN, EXPLAIN ANALYZE
     ===================================================================== */
  var EQP_DICT = [
    [/^SCAN (\S+) USING COVERING INDEX (\S+)/i, function (m) { return 'Walk the <b>whole index</b> ' + m[2] + ' but never touch table ' + m[1] + ' (every needed column is in the index). Cheaper than a table scan, still reads every entry.'; }, 'win'],
    [/^SCAN (\S+) USING INDEX (\S+)/i, function (m) { return 'Read <b>all of</b> ' + m[1] + ' in the order of index ' + m[2] + ' (usually to skip a sort), fetching each row from the table. Full read + random lookups — watch out on big tables.'; }, 'cur'],
    [/^SCAN (\S+)$/i, function (m) { return '<b>Full table scan</b> of ' + m[1] + ': every row is read and tested. Fine for small tables or when most rows are needed; a red flag on a big table, especially inside a loop.'; }, 'bad'],
    [/^SEARCH (\S+) USING INTEGER PRIMARY KEY \((.*)\)/i, function (m) { return '<b>Rowid lookup</b> on ' + m[1] + ' (' + H.esc(m[2]) + '): jump straight to the row in the table B-tree. The cheapest access there is.'; }, 'ok'],
    [/^SEARCH (\S+) USING COVERING INDEX (\S+) \((.*)\)/i, function (m) { return '<b>Index seek, index-only</b>: descend ' + m[2] + ' to the range ' + H.esc(m[3]) + ' and read only matching entries. Table ' + m[1] + ' is never touched.'; }, 'ok'],
    [/^SEARCH (\S+) USING AUTOMATIC (COVERING )?INDEX \((.*)\)/i, function (m) { return 'SQLite <b>built a temporary index</b> on ' + m[1] + ' (' + H.esc(m[3]) + ') just for this query, because no real index fits. It works, but it is a strong hint you are <b>missing an index</b>.'; }, 'cur'],
    [/^SEARCH (\S+) USING INDEX (\S+) \((.*)\)/i, function (m) { return '<b>Index seek</b>: descend ' + m[2] + ' straight to ' + H.esc(m[3]) + ', then fetch each matching row from table ' + m[1] + ' for the other columns.'; }, 'ok'],
    [/^BLOOM FILTER ON (\S+)/i, function (m) { return 'A <b>Bloom filter</b> on ' + m[1] + ': a tiny bit-array that answers "definitely not here" cheaply, so most useless lookups are skipped.'; }, 'win'],
    [/^USE TEMP B-TREE FOR (.*)$/i, function (m) { return 'An <b>extra sort step</b> for ' + m[1] + ': rows are put into a temporary B-tree. Costs O(n log n) and blocks streaming. An index in the right order can remove it.'; }, 'cur'],
    [/^CORRELATED (SCALAR|LIST) SUBQUERY/i, function () { return 'A <b>correlated subquery</b>: it is re-run <b>once per outer row</b>. Its children show how each run finds its rows — make sure that is a SEARCH, not a SCAN.'; }, 'cur'],
    [/^(SCALAR|LIST) SUBQUERY/i, function () { return 'A non-correlated subquery: run <b>once</b>, result reused (for IN it becomes a temporary lookup list).'; }, 'win'],
    [/^MATERIALIZE/i, function () { return 'The subquery/CTE is run once and its rows are <b>stored in a temp table</b>, then read like a table.'; }, 'win'],
    [/^CO-ROUTINE/i, function () { return 'The subquery runs as a <b>co-routine</b>: it produces rows lazily, one at a time, as the outer query asks for them (no temp table).'; }, 'win'],
    [/^MULTI-INDEX OR/i, function () { return 'An <b>OR</b> was split into separate index lookups (one per branch below); the row ids are merged and de-duplicated.'; }, 'ok'],
    [/^INDEX \d+/i, function () { return 'One branch of the multi-index OR.'; }, 'win'],
    [/^(COMPOUND QUERY|LEFT-MOST SUBQUERY|UNION ALL|UNION USING TEMP B-TREE)/i, function () { return 'Part of a UNION / compound query: each branch is planned separately.'; }, 'win']
  ];
  function explainLine(d) {
    for (var i = 0; i < EQP_DICT.length; i++) { var m = d.match(EQP_DICT[i][0]); if (m) return { txt: EQP_DICT[i][1](m), cls: EQP_DICT[i][2] }; }
    return { txt: 'Engine-specific step: ' + H.esc(d), cls: 'win' };
  }

  topics.push({
    title: 'Reading Plans: EXPLAIN, EXPLAIN QUERY PLAN & EXPLAIN ANALYZE',
    analogy: `<p>A query plan is the <b>recipe card</b> the kitchen actually follows. <code>EXPLAIN</code> shows the recipe <i>before</i> cooking: "chop onions, then fry, about 10 minutes". <code>EXPLAIN ANALYZE</code> cooks the dish with a stopwatch running and writes the <b>real</b> times next to each step: "chopping took 40 minutes because there were 50 onions, not 5". The gap between the guess and the real number is usually where your problem is.</p>`,
    explain: `<p>Every engine can print the plan it chose. Three flavours:</p>
${H.table(['Command', 'Runs the query?', 'Shows'], [
  ['<code>EXPLAIN QUERY PLAN</code> (SQLite)', 'No', 'One line per access step: SCAN / SEARCH / temp B-tree / subquery'],
  ['<code>EXPLAIN</code> (SQLite)', 'No', 'The low-level bytecode program (OpenRead, SeekGE, Next …)'],
  ['<code>EXPLAIN</code> (PostgreSQL/MySQL)', 'No', 'Plan tree with <b>estimated</b> cost and rows'],
  ['<code>EXPLAIN ANALYZE</code> (PostgreSQL/MySQL 8.0.18+)', H.c('r', '<b>Yes!</b>'), 'Estimates <b>and</b> actual rows, loops and time per node']
])}
<p><b>How to read a plan tree — inside out.</b> The deepest (most indented) nodes run first and feed their parents. Read bottom-up: "scan this, filter that, join with this, sort, return".</p>
<p><b>SQLite vocabulary you will see:</b></p>
${H.table(['Plan line', 'Meaning', 'Good or bad?'], [
  ['<code>SCAN orders</code>', 'read every row', H.c('r', 'bad on big tables')],
  ['<code>SEARCH orders USING INDEX idx_x (col=?)</code>', 'seek into the index, then fetch rows', H.c('g', 'good')],
  ['<code>… USING COVERING INDEX …</code>', 'answer from the index alone', H.c('g', 'best')],
  ['<code>… USING INTEGER PRIMARY KEY (rowid=?)</code>', 'direct row lookup', H.c('g', 'best')],
  ['<code>USE TEMP B-TREE FOR ORDER BY</code>', 'extra sort', H.c('y', 'maybe avoidable')],
  ['<code>AUTOMATIC INDEX</code>', 'temporary index built at run time', H.c('y', 'missing index')],
  ['<code>CORRELATED SCALAR SUBQUERY</code>', 're-run for every outer row', H.c('y', 'check the inner access')]
])}
<p><b>PostgreSQL node line, decoded:</b></p>
<pre>Index Scan using idx_orders_customer on orders o
   (cost=0.29..8.47 rows=10 width=36) (actual time=0.015..0.031 rows=10 loops=38)</pre>
<ul>
<li><code>cost=0.29..8.47</code> — <i>startup</i> cost (before the first row) .. <i>total</i> cost, in arbitrary units (1.0 ≈ one sequential page read).</li>
<li><code>rows=10</code> — <b>estimated</b> rows <i>per loop</i>. <code>width=36</code> — average row size in bytes.</li>
<li><code>actual … rows=10 loops=38</code> — <b>real</b> rows per loop, and this node ran 38 times (it is the inner side of a nested loop). Total rows = 10 × 38 = 380; total time ≈ 0.031 ms × 38.</li>
</ul>
<p><b>The 4-step plan-reading checklist:</b> (1) find the node with the biggest actual time; (2) compare estimated vs actual rows — a 10× or bigger gap means bad statistics or a non-sargable predicate; (3) look for <code>Seq Scan</code> with a large <code>Rows Removed by Filter</code>; (4) look for sorts or hashes that spilled to disk (<code>external merge</code>, <code>Batches: 8</code>).</p>`,
    clues: [
      '"How would you find out why this query is slow?" → EXPLAIN first, then EXPLAIN ANALYZE (with BUFFERS) on a safe copy',
      '"Estimated rows 1, actual rows 50,000" → misestimate: stale stats, correlated columns, or a function on a column',
      '"Seq Scan … Rows Removed by Filter: 2,999,990" → missing or unusable index for that predicate',
      '"Sort Method: external merge Disk: 120MB" / "Batches: 16" → work_mem too small, sort/hash spilled to disk',
      '"loops=50000" on an inner node → nested loop running the inner side too many times',
      'SQLite "USE TEMP B-TREE FOR ORDER BY" or "AUTOMATIC INDEX" → an index in the right order/columns is missing'
    ],
    code: [
      { lang: 'sql', db: 'shop', title: 'Three SQLite plans side by side (▶ Run)', code: `-- 1) A correlated subquery: re-run once per Delhi customer
EXPLAIN QUERY PLAN
SELECT c.name,
       (SELECT max(o.created_at) FROM orders o WHERE o.customer_id = c.id) AS last_order
FROM customers c
WHERE c.city = 'Delhi'
ORDER BY c.name;

-- 2) A join + GROUP BY + ORDER BY: two temp B-trees (two sorts)
EXPLAIN QUERY PLAN
SELECT c.city, count(*) AS orders_2026
FROM customers c JOIN orders o ON o.customer_id = c.id
WHERE o.created_at >= '2026-01-01'
GROUP BY c.city
ORDER BY orders_2026 DESC;

-- 3) OR across two different indexed columns: MULTI-INDEX OR
EXPLAIN QUERY PLAN
SELECT * FROM orders WHERE customer_id = 42 OR created_at >= '2026-09-01';` },
      { lang: 'text', title: 'PostgreSQL EXPLAIN (ANALYZE, BUFFERS) — annotated', code: `EXPLAIN (ANALYZE, BUFFERS)
SELECT c.name, o.id, o.total_cents
FROM customers c JOIN orders o ON o.customer_id = c.id
WHERE c.city = 'Delhi' AND o.status = 'pending';

Nested Loop  (cost=4.58..145.20 rows=9 width=24) (actual time=0.061..0.412 rows=20 loops=1)
  Buffers: shared hit=126
  ->  Bitmap Heap Scan on customers c  (cost=4.57..13.05 rows=40 width=16) (actual time=0.030..0.060 rows=38 loops=1)
        Recheck Cond: (city = 'Delhi'::text)
        Heap Blocks: exact=5
        ->  Bitmap Index Scan on idx_customers_city  (cost=0.00..4.56 rows=40 width=0) (actual time=0.020..0.020 rows=38 loops=1)
              Index Cond: (city = 'Delhi'::text)
  ->  Index Scan using idx_orders_customer on orders o  (cost=0.28..3.29 rows=1 width=16) (actual time=0.006..0.009 rows=1 loops=38)
        Index Cond: (customer_id = c.id)
        Filter: (status = 'pending'::text)
        Rows Removed by Filter: 10
Planning Time: 0.310 ms
Execution Time: 0.455 ms

-- Read inside-out: Bitmap Index Scan (38 ids) -> Bitmap Heap Scan (38 customers)
--   -> for each customer (loops=38) an Index Scan on orders, filter status
-- Estimates are close (40 vs 38, 9 vs 20) => statistics are healthy.` }
    ],
    codeTitle: ['SQLite EXPLAIN QUERY PLAN', 'PostgreSQL EXPLAIN ANALYZE (text)'],
    viz: [
      {
        title: 'Walk an EXPLAIN ANALYZE tree bottom-up and find the bottleneck',
        gen: function () {
          var nodes = [
            { id: 'L', label: 'Limit', x: 50, y: 6, shape: 'box' },
            { id: 'S', label: 'Sort (total_cents DESC)', x: 50, y: 20, shape: 'box' },
            { id: 'H', label: 'Hash Join', x: 50, y: 34, shape: 'box' },
            { id: 'SO', label: 'Seq Scan orders', x: 24, y: 50, shape: 'box' },
            { id: 'HB', label: 'Hash', x: 76, y: 50, shape: 'box' },
            { id: 'SC', label: 'Index Scan customers', x: 76, y: 64, shape: 'box' }
          ];
          var edges = [['SO', 'H'], ['HB', 'H'], ['SC', 'HB'], ['H', 'S'], ['S', 'L']];
          var rows = [
            ['Index Scan customers (city = Delhi)', 40, 38, '0.06'],
            ['Hash (build)', 40, 38, '0.08'],
            ['Seq Scan orders (created_at ≥ 2026-09-01 via date())', 15, 150, '41.2'],
            ['Hash Join', 2, 19, '41.6'],
            ['Sort', 2, 19, '41.7'],
            ['Limit 10', 2, 10, '41.7']
          ];
          var order = ['SC', 'HB', 'SO', 'H', 'S', 'L'];
          var say = [
            'Start at the <b>deepest leaf</b>: an index scan on <code>customers</code> for city = Delhi. Estimated 40, actual 38 — a healthy estimate.',
            'Those 38 customers are loaded into an in-memory <b>hash table</b> (the build side of a hash join). Tiny, fast.',
            'The other leaf: a <b>Seq Scan on orders</b>. The filter is <code>date(created_at) &gt;= \'2026-09-01\'</code> — a function on the column, so no index can be used and the planner can only <i>guess</i> the selectivity. It guessed <b>15</b> rows; reality is <b>150</b>. And it took 41 ms — almost all the query time.',
            '<b>Hash Join</b>: each order row probes the hash table by customer_id. Estimated 2 rows out, actual 19 — the error from the scan flows upward and multiplies.',
            '<b>Sort</b> by total_cents DESC — cheap here because only 19 rows reach it.',
            '<b>Limit</b> returns 10 rows. Verdict: the bottleneck is the Seq Scan (99% of time) and the root cause is the non-sargable <code>date(created_at)</code>. Fix: <code>created_at &gt;= \'2026-09-01\'</code> so the index on created_at can be used.'
          ];
          var frames = [{ narr: 'A plan is a <b>tree</b>. The root (top) returns rows to you; leaves (bottom) read tables. We read it <b>bottom-up</b>, because leaves run first and feed their parents.', parts: [{ type: 'graph', label: 'plan tree', directed: true, height: 70, nodes: nodes, edges: edges, hl: { L: 'sel' } }, { type: 'text', html: 'Query: last-week orders of Delhi customers, top 10 by value.' }] }];
          for (var k = 0; k < order.length; k++) {
            var hl = {}; for (var j = 0; j < k; j++) hl[order[j]] = 'done';
            var bad = k === 2; hl[order[k]] = bad ? 'bad' : 'cur';
            var thl = {}; thl[k] = bad ? 'bad' : 'cur';
            var shown = rows.slice(0, k + 1).map(function (r) { var ratio = (r[2] / r[1]); return [r[0], r[1], r[2], (ratio >= 1 ? ratio.toFixed(1) + '× under' : (1 / ratio).toFixed(1) + '× over'), r[3]]; });
            frames.push({ narr: say[k], parts: [{ type: 'graph', label: 'plan tree', directed: true, height: 70, nodes: nodes, edges: edges, hl: hl }, { type: 'table', label: 'node: estimated vs actual', columns: ['node', 'est rows', 'actual rows', 'estimate error', 'time ms (incl. children)'], rows: shown, hl: thl }] });
          }
          frames.push({ narr: 'Self-time per node (its own time minus children). One bar dwarfs the rest: that is where to spend your effort. Never optimize the Sort here — it costs 0.1 ms.', parts: [{ type: 'bars', label: 'self time (ms)', values: [0.06, 0.02, 41.2, 0.4, 0.1, 0.0], idxLabels: ['IdxScan', 'Hash', 'SeqScan', 'HashJoin', 'Sort', 'Limit'], hl: { 2: 'bad' } }] });
          return frames;
        }
      },
      {
        title: 'Decode SQLite EXPLAIN QUERY PLAN output line by line',
        input: '2 0 SEARCH c USING INDEX idx_customers_city (city=?); 6 0 CORRELATED SCALAR SUBQUERY 1; 11 6 SEARCH o USING INDEX idx_orders_customer (customer_id=?); 30 0 USE TEMP B-TREE FOR ORDER BY',
        inputLabel: 'EQP rows: "id parent detail" separated by ;',
        gen: function (input) {
          var lines = String(input || '').split(';').map(function (s) { return s.trim(); }).filter(Boolean);
          if (!lines.length) throw new Error('Paste rows like: 2 0 SCAN orders; 5 0 USE TEMP B-TREE FOR ORDER BY');
          if (lines.length > 10) throw new Error('At most 10 plan rows');
          var rows = lines.map(function (l) {
            var m = l.match(/^(\d+)\s+(\d+)\s+(?:\d+\s+)?(.+)$/);
            if (!m) throw new Error('Each row needs: id parent detail — e.g. "2 0 SCAN orders"');
            return { id: m[1], parent: m[2], detail: m[3] };
          });
          var depth = {}, nodes = [], edges = [], perDepth = {};
          rows.forEach(function (r) {
            depth[r.id] = r.parent === '0' || depth[r.parent] === undefined ? 0 : depth[r.parent] + 1;
            var d = depth[r.id]; perDepth[d] = (perDepth[d] || 0) + 1;
          });
          var seen = {};
          rows.forEach(function (r, i) {
            var d = depth[r.id]; seen[d] = (seen[d] || 0) + 1;
            var lab = r.detail.length > 30 ? r.detail.slice(0, 29) + '…' : r.detail;
            nodes.push({ id: 'n' + r.id, label: lab, x: Math.min(92, 8 + d * 14 + 46 * ((seen[d] - 1) / Math.max(1, perDepth[d]))), y: 6 + i * 11, shape: 'box', w: 40 });
            if (r.parent !== '0' && depth[r.parent] !== undefined) edges.push(['n' + r.parent, 'n' + r.id]);
          });
          var h = 12 + rows.length * 11;
          var frames = [{ narr: 'SQLite prints one row per step: <b>id</b>, <b>parent</b> (0 = top level) and a <b>detail</b> text. A row whose parent is another row is <i>nested inside</i> it (e.g. the plan of a subquery). Top-level rows run as <b>nested loops in the order shown</b>: the first line is the outer loop.', parts: [{ type: 'table', label: 'EXPLAIN QUERY PLAN output', columns: ['id', 'parent', 'detail'], rows: rows.map(function (r) { return [r.id, r.parent, r.detail]; }) }] }];
          var verdicts = [];
          rows.forEach(function (r, i) {
            var e = explainLine(r.detail), hl = {}, thl = {};
            rows.forEach(function (x, j) { if (j < i) hl['n' + x.id] = 'done'; });
            hl['n' + r.id] = e.cls === 'bad' ? 'bad' : e.cls === 'ok' ? 'ok' : 'cur'; thl[i] = e.cls === 'bad' ? 'bad' : 'cur';
            if (e.cls === 'bad' || /AUTOMATIC|TEMP B-TREE|CORRELATED/.test(r.detail)) verdicts.push(r.detail);
            frames.push({ narr: '<b>' + H.esc(r.detail) + '</b> — ' + e.txt, parts: [{ type: 'graph', label: 'plan as a tree', directed: true, height: h, nodes: nodes, edges: edges, hl: hl }, { type: 'table', label: 'rows', columns: ['id', 'parent', 'detail'], rows: rows.map(function (x) { return [x.id, x.parent, x.detail]; }), hl: thl }] });
          });
          frames.push({ narr: verdicts.length ? '<b>Things worth a second look:</b> ' + verdicts.map(H.esc).join(' · ') + '. Ask: is there an index that removes the scan or the sort? Is the correlated part a cheap SEARCH?' : H.c('g', 'Every step is an index seek or a cheap helper — this plan looks healthy.'), parts: [{ type: 'set', label: 'flags', items: verdicts.length ? verdicts : ['no red flags'] }] });
          return frames;
        }
      }
    ],
    examples: [
      { title: 'From "SCAN + TEMP B-TREE" to one covering seek', html: `<p>Query: top 10 orders above 195 rupees, highest first. Without an index on <code>total_cents</code> SQLite must <b>scan all 3,000 orders</b> and then <b>sort</b> the survivors (${H.c('r', 'SCAN orders')} + ${H.c('r', 'USE TEMP B-TREE FOR ORDER BY')}). With <code>idx_orders_total</code> the plan becomes a single ${H.c('g', 'SEARCH orders USING COVERING INDEX idx_orders_total (total_cents>?)')}: the index is already sorted (it walks it backwards for DESC), and it holds both <code>total_cents</code> and the rowid (= <code>id</code>), so the table is never read and the LIMIT stops after 10 entries.</p>`, code: { lang: 'sql', db: 'shop', code: `EXPLAIN QUERY PLAN
SELECT id, total_cents FROM orders
WHERE total_cents > 19500 ORDER BY total_cents DESC LIMIT 10;

CREATE INDEX idx_orders_total ON orders(total_cents);

EXPLAIN QUERY PLAN
SELECT id, total_cents FROM orders
WHERE total_cents > 19500 ORDER BY total_cents DESC LIMIT 10;

SELECT id, total_cents FROM orders
WHERE total_cents > 19500 ORDER BY total_cents DESC LIMIT 10;` } },
      { title: 'Estimated vs actual: the most important comparison', html: `<p>In PostgreSQL, compare <code>rows=</code> (estimate) with <code>actual … rows=</code> on every node:</p>${H.table(['node', 'est', 'actual', 'reading'], [['Index Scan customers', '40', '38', H.c('g', 'healthy')], ['Seq Scan orders, Filter date(created_at) …', '15', '150', H.c('r', '10× under-estimate')], ['Nested Loop', '1', '48,000', H.c('r', '48,000× — plan chosen for 1 row, got 48k')]])}<p>A planner that believes "1 row" happily picks a nested loop with a full inner scan. When the truth is 48,000 rows, that loop does 48,000 inner scans. Fix the estimate (ANALYZE, extended statistics, sargable predicate) and the planner usually fixes the plan itself.</p>` },
      { title: 'MySQL EXPLAIN in one table', html: `<p>MySQL's classic EXPLAIN is a table, one row per table access. The <code>type</code> column is the access method, from best to worst: ${H.chips(['system/const', 'eq_ref', 'ref', 'range', 'index', 'ALL'], { hl: { 0: 'g', 1: 'g', 2: 'g', 3: 'b', 4: 'y', 5: 'r' } })}</p><p><code>key</code> = index used, <code>rows</code> = estimated rows examined, <code>filtered</code> = % kept by the WHERE, <code>Extra</code>: "Using index" (covering ✔), "Using where", "Using filesort" (extra sort), "Using temporary" (temp table). <code>EXPLAIN FORMAT=TREE</code> and <code>EXPLAIN ANALYZE</code> (8.0.18+) show a PostgreSQL-like tree with actual times.</p>`, code: { lang: 'text', code: `mysql> EXPLAIN SELECT * FROM orders WHERE customer_id = 42 ORDER BY total_cents;
+----+-------------+--------+------+---------------------+---------------------+---------+-------+------+----------+----------------+
| id | select_type | table  | type | possible_keys       | key                 | key_len | ref   | rows | filtered | Extra          |
+----+-------------+--------+------+---------------------+---------------------+---------+-------+------+----------+----------------+
|  1 | SIMPLE      | orders | ref  | idx_orders_customer | idx_orders_customer | 4       | const |   10 |   100.00 | Using filesort |
+----+-------------+--------+------+---------------------+---------------------+---------+-------+------+----------+----------------+` } },
      { title: 'EXPLAIN ANALYZE really runs the statement', html: `<p><code>EXPLAIN ANALYZE DELETE FROM orders WHERE …</code> <b>deletes the rows</b>. Always wrap data-changing statements in a transaction and roll back. Also: on production, a slow query under EXPLAIN ANALYZE is still slow (and holds locks), so try it on a replica or a copy first. Add <code>BUFFERS</code> to see pages read from cache (<code>shared hit</code>) vs disk (<code>read</code>), and <code>SETTINGS</code> to show non-default planner settings.</p>`, code: { lang: 'sql', check: false, code: `-- PostgreSQL: safe way to profile a write
BEGIN;
EXPLAIN (ANALYZE, BUFFERS, SETTINGS)
UPDATE orders SET status = 'cancelled'
WHERE status = 'pending' AND created_at < now() - interval '30 days';
ROLLBACK;   -- the update is undone; you keep the timing information` } },
      { title: 'Peeking under the hood: SQLite bytecode', html: `<p>Plain <code>EXPLAIN</code> in SQLite prints the compiled program. For an index seek you will see <code>OpenRead</code> (open the index), <code>SeekGE</code> (jump to the first key ≥ 42), <code>IdxGT</code> (stop when the key passes 42), <code>IdxRowid</code> (take the rowid from the entry), <code>ResultRow</code>, and <code>Next</code> (loop). A full scan shows <code>Rewind</code> + <code>Next</code> over the table instead.</p>`, code: { lang: 'sql', db: 'shop', code: `EXPLAIN SELECT id FROM orders WHERE customer_id = 42;` } }
    ],
    deepDive: `<h4>How costs are computed (PostgreSQL)</h4>
<p>Seq Scan cost = <code>pages × seq_page_cost + rows × cpu_tuple_cost + rows × (#quals) × cpu_operator_cost</code>. For a 3,000-row table on 30 pages with one filter: 30 × 1.0 + 3000 × 0.01 + 3000 × 0.0025 = <b>67.5</b>. An index scan adds <code>random_page_cost</code> (4.0 by default) per heap page fetched, discounted by the index's <b>correlation</b> (how well the physical row order matches the index order). That is why the crossover between seek and scan depends so much on correlation and on <code>random_page_cost</code> (set it to ~1.1 on SSDs).</p>
<h4>Gotchas when reading plans</h4>
<ul>
<li><b>Per-loop numbers.</b> <code>actual time</code> and <code>rows</code> are averages per loop. Multiply by <code>loops</code> for the total. Parallel plans report per worker.</li>
<li><b>Cost is not milliseconds.</b> Compare costs only between plans of the <i>same</i> query on the <i>same</i> server.</li>
<li><b>EXPLAIN ANALYZE overhead.</b> Timing every row costs something (gettimeofday); use <code>TIMING OFF</code> for row counts only on very fast nodes.</li>
<li><b>Cold vs warm cache.</b> First run reads from disk (<code>Buffers: read=</code>), second from RAM (<code>hit=</code>). Benchmark both, and never conclude from one run.</li>
<li><b>Production capture.</b> <code>auto_explain</code> (log plans of queries slower than N ms), <code>pg_stat_statements</code> (top queries by total time), MySQL slow query log + <code>performance_schema</code>, SQL Server Query Store (plan history + forcing).</li>
<li><b>SQLite extras.</b> CLI <code>.eqp on</code> prints the plan before every query; <code>.scanstats on</code> (3.42+) and <code>sqlite3_stmt_scanstatus()</code> give actual loop and row counts per step.</li>
<li><b>Tools.</b> explain.depesz.com, explain.dalibo.com (PEV2) and pgMustard turn PostgreSQL plans into colored trees; MySQL Workbench Visual Explain; SSMS graphical plans with "actual vs estimated" warnings.</li>
</ul>`,
    aiEra: `<p><b>What AI changes:</b> Reading a 200-line plan used to take an expert. Now you can paste <code>EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)</code> into an assistant and get a decent summary in seconds. Several Postgres monitoring tools now ship built-in "explain this plan" AI features.</p>
<p><b>Use AI as a partner:</b> "Here is the plan and the table sizes. List the top 3 nodes by self-time, every node where actual/estimated rows differ by more than 10×, and for each suggest a cause. Do not suggest indexes yet." Then you decide what to test.</p>
<p><b>Where AI goes wrong:</b> it often confuses per-loop with total numbers, treats cost units as milliseconds, recommends an index on a column that is wrapped in a function (useless), or suggests a covering index with 12 columns that will slow down every write. It also can't know your cache was cold.</p>
<p><b>What you must still own:</b> the inside-out reading habit, the estimate-vs-actual check, and verifying every suggestion by re-running EXPLAIN ANALYZE yourself.</p>`,
    problems: [
      {
        title: 'Kill the scan and the sort', level: 'Medium', tags: ['EXPLAIN QUERY PLAN', 'covering index', 'ORDER BY'], companies: ['Swiggy', 'Uber', 'Stripe'],
        statement: `<p>The "Top 10 big orders" widget runs this query thousands of times a minute:</p><pre>SELECT id, total_cents FROM orders
WHERE total_cents &gt; 19500
ORDER BY total_cents DESC LIMIT 10;</pre><p>Read its plan, name the two expensive steps, and change the <b>schema</b> (not the query) so that the plan becomes a single index step with no temporary B-tree. Show the before/after plans.</p>`,
        constraints: `SQLite <code>shop</code> database; you may add exactly one index; the result must be unchanged.`,
        example: `<p>Before: ${H.c('r', 'SCAN orders')} + ${H.c('r', 'USE TEMP B-TREE FOR ORDER BY')}. After: ${H.c('g', 'SEARCH orders USING COVERING INDEX idx_orders_total (total_cents>?)')}. Same 10 rows, starting with order 2321 (20,499 cents).</p>`,
        brute: { why: `<p>The current query reads all 3,000 rows to test <code>total_cents &gt; 19500</code> (150 survive), then sorts the survivors in a temp B-tree, just to return 10. Work grows with table size, not with the 10 rows you need — at 30M orders this widget would melt the database.</p>`, code: { lang: 'sql', db: 'shop', code: `EXPLAIN QUERY PLAN
SELECT id, total_cents FROM orders
WHERE total_cents > 19500
ORDER BY total_cents DESC LIMIT 10;
-- SCAN orders
-- USE TEMP B-TREE FOR ORDER BY` } },
        mcq: { q: 'Which single index removes BOTH the scan and the sort?', options: ['An index on (id)', 'An index on (total_cents)', 'An index on (created_at, total_cents)', 'No index can remove a sort'], answer: 1, explain: 'An index on total_cents gives a range seek for > 19500 and is already ordered by total_cents, so it can be walked backwards for DESC. Because id is the rowid, the index also covers the SELECT list.' },
        hints: [`<p>Hint 1: Two problems: <i>finding</i> rows (the WHERE) and <i>ordering</i> them (the ORDER BY). Both mention the same column.</p>`, `<p>Hint 2: A B+tree index is a sorted list. A sorted list can answer a range <i>and</i> hand rows back in order — forwards or backwards.</p>`, `<p>Hint 3: In SQLite every index entry also stores the rowid; <code>id INTEGER PRIMARY KEY</code> <i>is</i> the rowid, so an index on <code>total_cents</code> alone already "covers" <code>SELECT id, total_cents</code>. Recipe: create the index, re-run EQP, compare, run the query.</p>`],
        solution: {
          approach: `<p>Create <code>idx_orders_total(total_cents)</code>. The planner now seeks to the right end of the index (the largest value), walks backwards while <code>total_cents &gt; 19500</code>, and stops after 10 entries because of LIMIT. No table access (covering: rowid = id is in every entry) and no sort (the index is already in order). Work drops from "read 3,000 rows + sort 150" to "~log₂(3000) + 10 entry reads".</p>`,
          code: { lang: 'sql', db: 'shop', code: `CREATE INDEX idx_orders_total ON orders(total_cents);

EXPLAIN QUERY PLAN
SELECT id, total_cents FROM orders
WHERE total_cents > 19500
ORDER BY total_cents DESC LIMIT 10;
-- SEARCH orders USING COVERING INDEX idx_orders_total (total_cents>?)

SELECT id, total_cents FROM orders
WHERE total_cents > 19500
ORDER BY total_cents DESC LIMIT 10;` },
          complexity: `<p>Before: O(N) scan + O(k log k) sort of the k survivors. After: O(log N + 10). Cost: one more index to maintain on every insert/update of total_cents.</p>`,
          followUps: ['What happens to the plan if you also SELECT <code>status</code>? (No longer covering — it must visit the table 10 times; still no sort.)', 'In PostgreSQL, what extra condition decides whether this becomes an Index Only Scan? (The visibility map / VACUUM.)']
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
