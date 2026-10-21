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
      { title: 'Table order in FROM does not matter (for inner joins)', html: `<p>Old-style comma join with <code>orders</code> first, and modern JOIN with <code>customers</code> first. The planner reorders both into the same plan: start from the 40 Delhi customers (index on city), then seek each one's orders.</p>${H.table(['written as', 'plan line 1', 'plan line 2'], [['FROM orders o, customers c WHERE …', 'SEARCH c USING INDEX idx_customers_city (city=?)', 'SEARCH o USING INDEX idx_orders_customer (customer_id=?)'], ['FROM customers c JOIN orders o ON …', 'same', 'same']])}<p>Exceptions: LEFT/RIGHT joins limit reordering; SQLite treats <code>CROSS JOIN</code> as "keep this order"; PostgreSQL stops reordering past <code>join_collapse_limit</code> (8) tables.</p>`, code: { lang: 'sql', db: 'shop', code: `EXPLAIN QUERY PLAN
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
        tests: { engine: 'sqlite', check: '(rows, cols, c) => {\n  if (c.plan || c.noplan) { const d = rows.map(r => r[r.length - 1]).join(\'\\n\'); return (!c.plan || new RegExp(c.plan).test(d)) && (!c.noplan || !new RegExp(c.noplan).test(d)); }\n  let a = rows, b = c.rows || [];\n  if (c.set) { const k = r => JSON.stringify(r); a = a.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); b = b.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); }\n  return a.length === b.length && a.every((r, i) => r.length === b[i].length && r.every((v, j) => v === b[i][j] || (typeof v === \'number\' && typeof b[i][j] === \'number\' && Math.abs(v - b[i][j]) < 1e-6)));\n}', cases: [
          { rows: [], plan: '^SEARCH c USING INDEX idx_customers_city \\(city=\\?\\)\\n[\\s\\S]*SEARCH o USING INDEX idx_orders_customer \\(customer_id=\\?\\)$', noplan: undefined },
          { rows: [], plan: '^SEARCH c USING INDEX idx_customers_city \\(city=\\?\\)\\n[\\s\\S]*SEARCH o USING INDEX idx_orders_customer \\(customer_id=\\?\\)$', noplan: null, after: 'EXPLAIN QUERY PLAN SELECT c.name, o.total_cents FROM orders o, customers c WHERE o.customer_id = c.id AND c.city = \'Delhi\'' },
          { after: 'SELECT (SELECT count(*) FROM (SELECT c.name, o.total_cents FROM orders o, customers c WHERE o.customer_id = c.id AND c.city = \'Delhi\')) = (SELECT count(*) FROM (SELECT c.name, o.total_cents FROM customers c JOIN orders o ON o.customer_id = c.id WHERE c.city = \'Delhi\')), (SELECT count(*) FROM (SELECT c.name, o.total_cents FROM orders o, customers c WHERE o.customer_id = c.id AND c.city = \'Delhi\'))', rows: [
              [1, 380]
            ] },
          { rows: [], plan: null, noplan: 'idx_orders_customer', setup: 'DROP INDEX idx_orders_customer' },
          { rows: [], plan: null, noplan: 'idx_orders_customer', setup: 'DROP INDEX idx_orders_customer', after: 'EXPLAIN QUERY PLAN SELECT c.name, o.total_cents FROM orders o, customers c WHERE o.customer_id = c.id AND c.city = \'Delhi\'' },
          { rows: [], plan: '^SCAN c\\n[\\s\\S]*SEARCH o USING INDEX idx_orders_customer', noplan: null, setup: 'DROP INDEX idx_customers_city', after: 'EXPLAIN QUERY PLAN SELECT c.name, o.total_cents FROM orders o, customers c WHERE o.customer_id = c.id AND c.city = \'Delhi\'' },
          { rows: [], plan: '^SCAN c\\n[\\s\\S]*SEARCH o USING INDEX idx_orders_customer', noplan: null, setup: 'DROP INDEX idx_customers_city' },
          { setup: 'DELETE FROM orders', after: 'SELECT count(*) FROM (SELECT c.name, o.total_cents FROM orders o, customers c WHERE o.customer_id = c.id AND c.city = \'Delhi\')', rows: [
              [0]
            ] }
        ] },
        solution: {
          approach: `<p>Both queries are the same <i>logical</i> query (an inner join with a city filter), so after rewriting they produce the same tree and the planner prices the same candidates. It starts from the selective side (40 Delhi customers via the city index) and probes <code>orders</code> through <code>idx_orders_customer</code>. The output of both EXPLAINs is identical, which disproves the claim. If the query <i>is</i> slow in production, look at the plan and statistics, not at the text order.</p>`,
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
          complexity: `<p>Plan: ~40 index entries for Delhi + 40 index seeks into orders (≈ 10 rows each) ≈ 380 row fetches, instead of 3,000 × 320 pair checks for a naive nested loop.</p>`,
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
          if (rows.length === 1) frames.push({ narr: 'Only one plan row: a single-table query. Its whole cost is that one access path — SCAN (every row) or SEARCH (a seek). Paste a join plan to see nesting.', parts: [{ type: 'table', label: 'rows', columns: ['id', 'parent', 'detail'], rows: rows.map(function (x) { return [x.id, x.parent, x.detail]; }) }] });
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
        tests: { engine: 'sqlite', check: '(rows, cols, c) => {\n  if (c.plan || c.noplan) { const d = rows.map(r => r[r.length - 1]).join(\'\\n\'); return (!c.plan || new RegExp(c.plan).test(d)) && (!c.noplan || !new RegExp(c.noplan).test(d)); }\n  let a = rows, b = c.rows || [];\n  if (c.set) { const k = r => JSON.stringify(r); a = a.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); b = b.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); }\n  return a.length === b.length && a.every((r, i) => r.length === b[i].length && r.every((v, j) => v === b[i][j] || (typeof v === \'number\' && typeof b[i][j] === \'number\' && Math.abs(v - b[i][j]) < 1e-6)));\n}', cases: [
          { rows: [
              [2321, 20499],
              [889, 20491],
              [1778, 20482],
              [346, 20474],
              [2667, 20473],
              [1235, 20465],
              [2124, 20456],
              [692, 20448],
              [1581, 20439],
              [149, 20431]
            ] },
          { rows: [], plan: 'SEARCH orders USING COVERING INDEX idx_orders_total \\(total_cents>\\?\\)', noplan: 'TEMP B-TREE|SCAN', after: 'EXPLAIN QUERY PLAN SELECT id, total_cents FROM orders WHERE total_cents > 19500 ORDER BY total_cents DESC LIMIT 10' },
          { setup: 'UPDATE orders SET total_cents = 19500 WHERE total_cents > 19500', after: 'SELECT count(*) FROM (SELECT id, total_cents FROM orders WHERE total_cents > 19500 ORDER BY total_cents DESC LIMIT 10)', rows: [
              [0]
            ] },
          { setup: 'DELETE FROM orders; INSERT INTO orders VALUES (1,1,\'x\',\'2025-01-01\',19501),(2,1,\'x\',\'2025-01-01\',19500),(3,1,\'x\',\'2025-01-01\',30000)', rows: [
              [3, 30000],
              [1, 19501]
            ] },
          { setup: 'DELETE FROM orders', after: 'SELECT count(*) FROM (SELECT id, total_cents FROM orders WHERE total_cents > 19500 ORDER BY total_cents DESC LIMIT 10)', rows: [
              [0]
            ] },
          { setup: 'DELETE FROM orders WHERE total_cents > 19500 AND id <> 2321', rows: [
              [2321, 20499]
            ] },
          { after: 'SELECT count(*) FROM sqlite_master WHERE type = \'index\' AND tbl_name = \'orders\'', rows: [
              [4]
            ] },
          { rows: [], plan: 'SEARCH orders USING COVERING INDEX idx_orders_total', noplan: 'TEMP B-TREE', setup: 'DELETE FROM orders WHERE id > 100', after: 'EXPLAIN QUERY PLAN SELECT id, total_cents FROM orders WHERE total_cents > 19500 ORDER BY total_cents DESC LIMIT 10' }
        ] },
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

  /* =====================================================================
     TOPIC 3 — Access paths: scans vs seeks
     ===================================================================== */
  var HEAP_CUST = [7, 3, 11, 7, 1, 9, 5, 7, 6, 2, 8, 4, 10, 6, 7, 3];   // customer_id stored in rowid 1..16, 4 rows per page

  topics.push({
    title: 'Access Paths: Full Scans vs Index Seeks vs Covering Scans',
    analogy: `<p>You need every mention of "photosynthesis" in a 600-page biology book. <b>Option 1 — scan:</b> read every page from start to end. Slow, but you just flip forward; no jumping around. <b>Option 2 — seek:</b> open the <b>index at the back</b>, find "photosynthesis → pages 41, 87, 312", and jump to each page. Super fast for 3 pages… but if the index said "pages 1–550", jumping back and forth 550 times would be <i>slower</i> than just reading the book. <b>Option 3 — covering:</b> if all you needed was <i>the page numbers</i>, the index itself is the answer — you never open the book.</p>`,
    explain: `<p>An <b>access path</b> is how the engine reads one table. There are only a handful, and every plan is built from them:</p>
${H.table(['Access path', 'How it works', 'Cost shape', 'Plan text'], [
  ['<b>Full table scan</b>', 'Read every page of the table, test each row', 'All pages, but <b>sequential</b> I/O (fast per page, prefetch)', 'SQLite <code>SCAN t</code> · PG <code>Seq Scan</code> · MySQL <code>type=ALL</code>'],
  ['<b>Index seek + lookup</b>', 'Descend the B+tree (3–4 levels) to the first match, walk the leaf entries, then fetch each row from the table', 'log N + one <b>random</b> table read per match', '<code>SEARCH t USING INDEX</code> · <code>Index Scan</code> · <code>ref/range</code>'],
  ['<b>Covering / index-only</b>', 'Every column the query needs is inside the index → never touch the table', 'log N + matching entries only', '<code>USING COVERING INDEX</code> · <code>Index Only Scan</code> · <code>Using index</code>'],
  ['<b>Full index scan</b>', 'Read the whole index in key order (to avoid a sort, or because it is smaller than the table)', 'All index pages', '<code>SCAN t USING INDEX</code> · <code>type=index</code>'],
  ['<b>Bitmap scan</b> (PG)', 'Collect matching row ids from one or more indexes, sort them by page, read each table page once', 'Between seek and scan; combines indexes with AND/OR', '<code>Bitmap Index Scan</code> → <code>Bitmap Heap Scan</code>'],
  ['<b>Row-id / PK lookup</b>', 'Jump straight to one row by its key', '≈ log N, the cheapest', '<code>USING INTEGER PRIMARY KEY</code> · <code>eq_ref/const</code>']
])}
<p><b>A seek is not always better than a scan.</b> A seek pays a <i>random</i> table read for every matching row. A scan pays a <i>sequential</i> read for every page. Disk (and even SSD/cache) is much happier with sequential reads, so once a query needs more than a small fraction of the table — often around <b>2–20% of rows</b>, depending on how the rows are physically ordered — a full scan wins. Good planners know this and will ignore your index on purpose.</p>
${H.table(['Query on 3,000 orders', 'rows matched', 'best path'], [
  ['<code>WHERE id = 42</code>', '1', H.c('g', 'PK lookup')],
  ['<code>WHERE customer_id = 42</code>', '10 (0.3%)', H.c('g', 'index seek')],
  ['<code>WHERE status = \'delivered\'</code>', '1,760 (59%)', H.c('y', 'scan (PostgreSQL would choose it)')],
  ['<code>SELECT count(*) WHERE status = \'delivered\'</code>', '1,760', H.c('g', 'covering index — no table access at all')]
])}
<p><b>Seek predicate vs filter.</b> In a composite index <code>(status, created_at)</code>, the engine can <i>seek</i> on <code>status = ?</code> and then on a range of <code>created_at</code> (left-prefix rule from SQL 10). A condition on a column that is <i>not</i> part of the seek is applied afterwards as a <b>filter</b> (PG shows <code>Index Cond</code> vs <code>Filter</code>). Rows read and then thrown away by a filter are wasted work — <code>Rows Removed by Filter</code> tells you how much.</p>`,
    clues: [
      '"The table has an index on that column, so why is it doing a full scan?" → low selectivity, tiny table, stale stats, or a function on the column',
      '"Query returns 40% of the table" → a full scan is probably the right plan; stop forcing the index',
      '"Index Only Scan … Heap Fetches: 120000" → visibility map not up to date, VACUUM the table',
      '"Rows Removed by Filter" is large on an Index Scan → index covers the wrong columns or wrong column order',
      '"Show the 20 most recent orders of a customer" → composite index (customer_id, created_at) for seek + order, add columns to cover it',
      '"Key lookup" / "bookmark lookup" heavy in SQL Server → add INCLUDE columns to make the index covering'
    ],
    code: [
      { lang: 'sql', db: 'shop', title: 'Every access path on the same table (▶ Run)', code: `-- PK lookup: the cheapest
EXPLAIN QUERY PLAN SELECT * FROM orders WHERE id = 42;
-- Index seek + table lookups (10 rows)
EXPLAIN QUERY PLAN SELECT * FROM orders WHERE customer_id = 42;
-- Covering index: count needs only the index
EXPLAIN QUERY PLAN SELECT count(*) FROM orders WHERE status = 'delivered';
-- Full scan: no usable index for total_cents
EXPLAIN QUERY PLAN SELECT * FROM orders WHERE total_cents > 15000;
-- Full index scan in order (to avoid sorting) + PK lookups into customers
EXPLAIN QUERY PLAN
SELECT o.id, c.name FROM orders o JOIN customers c ON c.id = o.customer_id
ORDER BY o.created_at DESC LIMIT 20;
-- Force a scan to compare (SQLite: NOT INDEXED)
EXPLAIN QUERY PLAN SELECT * FROM orders NOT INDEXED WHERE customer_id = 42;` }
    ],
    codeTitle: ['Access paths in SQLite'],
    viz: [
      {
        title: 'Find one customer\'s orders: full scan vs B+tree seek vs covering seek',
        input: '7',
        inputLabel: 'customer_id to find (1–12; 12 is not in the table)',
        gen: function (input) {
          var k = parseInt(String(input).trim(), 10);
          if (isNaN(k) || k < 1 || k > 12) throw new Error('Enter a customer_id between 1 and 12');
          var heap = HEAP_CUST.slice(), frames = [];
          var vals = heap.map(function (v, i) { return v; });
          var pageLbl = heap.map(function (v, i) { return 'p' + (Math.floor(i / 4) + 1) + ':r' + (i + 1); });
          frames.push({ narr: 'The <b>orders table</b> stores rows in insertion order — 16 rows on 4 pages (4 rows per page). Values shown are <code>customer_id</code>. We want <b>customer_id = ' + k + '</b>.', parts: [{ type: 'array', label: 'table pages (heap): customer_id per row', values: vals, idxLabels: pageLbl }] });
          // full scan
          var hits = 0, checked = 0;
          for (var i = 0; i < heap.length; i += 4) {
            var hl = {}, ptr = {};
            for (var j = 0; j < i; j++) hl[j] = heap[j] === k ? 'ok' : 'done';
            for (var q = i; q < i + 4; q++) { checked++; if (heap[q] === k) { hits++; hl[q] = 'ok'; } else hl[q] = 'cur'; }
            ptr[i] = 'page ' + (i / 4 + 1);
            frames.push({ narr: '<b>Full scan</b>, page ' + (i / 4 + 1) + ' of 4: read the page <i>sequentially</i> and test all 4 rows. Matches so far: ' + hits + '. A scan cannot stop early — a match could be on the last page.', parts: [{ type: 'array', label: 'SCAN orders', values: vals, hl: hl, ptr: ptr, idxLabels: pageLbl }, { type: 'vars', label: 'scan cost so far', vals: { pagesRead: i / 4 + 1, rowsTested: checked, matches: hits } }] });
          }
          // index
          var ent = heap.map(function (v, i) { return { k: v, r: i + 1 }; }).sort(function (a, b) { return a.k - b.k || a.r - b.r; });
          var leaves = [ent.slice(0, 4), ent.slice(4, 8), ent.slice(8, 12), ent.slice(12, 16)];
          var lab = function (L) { return L[0].k + '…' + L[L.length - 1].k; };
          var sep1 = leaves[2][0].k, sepL = leaves[1][0].k, sepR = leaves[3][0].k;
          var treeArr = ['<' + sep1 + ' | ≥' + sep1, '<' + sepL + ' | ≥' + sepL, '<' + sepR + ' | ≥' + sepR, lab(leaves[0]), lab(leaves[1]), lab(leaves[2]), lab(leaves[3])];
          var leafIdx = []; leaves.forEach(function (L, li) { if (L.some(function (e) { return e.k === k; })) leafIdx.push(li); });
          var first = leafIdx.length ? leafIdx[0] : (k < sep1 ? (k < sepL ? 0 : 1) : (k < sepR ? 2 : 3));
          var internal = first < 2 ? 1 : 2;
          var entVals = ent.map(function (e) { return e.k + '→r' + e.r; });
          frames.push({ narr: 'Now the <b>index</b> <code>idx_orders_customer</code>: the same values, but <b>sorted</b>, each with a pointer (rowid) back to the table row, stored in a B+tree. Root and inner pages hold separator keys that steer the search.', parts: [{ type: 'tree', label: 'B+tree (3 levels)', arr: treeArr, hl: { 0: 'cur' } }, { type: 'array', label: 'leaf entries (customer_id → rowid), sorted', values: entVals }] });
          var thl = {}; thl[0] = 'done'; thl[internal] = 'cur';
          frames.push({ narr: '<b>Seek, level 1→2:</b> ' + k + (k < sep1 ? ' &lt; ' : ' ≥ ') + sep1 + ' → go ' + (internal === 1 ? 'left' : 'right') + '. One page read per level — that is the <b>log N</b> part. Even 100 million rows need only ~4 levels.', parts: [{ type: 'tree', label: 'B+tree', arr: treeArr, hl: thl, ehl: (function () { var e = {}; e[internal] = 'ok'; return e; })() }] });
          var thl2 = {}; thl2[0] = 'done'; thl2[internal] = 'done'; thl2[3 + first] = 'cur';
          var ehl2 = {}; ehl2[internal] = 'ok'; ehl2[3 + first] = 'ok';
          frames.push({ narr: '<b>Seek, level 2→leaf:</b> land on the leaf page that holds the first entry ≥ ' + k + '.', parts: [{ type: 'tree', label: 'B+tree', arr: treeArr, hl: thl2, ehl: ehl2 }] });
          var match = [], ehl3 = {};
          ent.forEach(function (e, i) { if (e.k === k) { match.push(e.r); ehl3[i] = 'ok'; } });
          var lo = -1, hi = -1; ent.forEach(function (e, i) { if (e.k === k) { if (lo < 0) lo = i; hi = i; } });
          frames.push({ narr: match.length ? '<b>Range walk on the leaves:</b> entries for ' + k + ' sit <b>next to each other</b> (that is the magic of sorting): rowids ' + match.join(', ') + '. Stop at the first entry with a bigger key.' : 'No entry equals ' + k + ' — the seek proves "zero rows" after reading just 3 index pages. A scan would have needed all 4 table pages to prove the same.', parts: [{ type: 'array', label: 'leaf entries', values: entVals, hl: ehl3, range: lo >= 0 ? [lo, hi] : undefined }] });
          var pages = {}, steps = 0;
          match.forEach(function (r, idx) {
            pages[Math.ceil(r / 4)] = true; steps++;
            var hh = {}; match.slice(0, idx + 1).forEach(function (x) { hh[x - 1] = 'ok'; }); hh[r - 1] = 'cur';
            var pt = {}; pt[r - 1] = 'fetch';
            frames.push({ narr: '<b>Table lookup ' + (idx + 1) + '/' + match.length + ':</b> rowid ' + r + ' lives on page ' + Math.ceil(r / 4) + '. This is a <b>random</b> read — jumping around the table. Each match costs one jump.', parts: [{ type: 'array', label: 'table pages', values: vals, hl: hh, ptr: pt, idxLabels: pageLbl }, { type: 'vars', label: 'seek cost so far', vals: { indexPages: 3, tableJumps: steps, distinctTablePages: Object.keys(pages).length } }] });
          });
          var seekCost = 3 + match.length * 4, scanCost = 4, coverCost = 3;
          frames.push({ narr: 'Cost in "page units" (sequential page = 1, random jump = 4, like PostgreSQL defaults). <b>Scan</b> = 4 sequential pages = 4. <b>Seek</b> = 3 index pages + ' + match.length + ' random jumps × 4 = ' + seekCost + '. <b>Covering seek</b> (if the query only needs customer_id and id) = 3. ' + (seekCost > scanCost ? H.c('y', 'On a 4-page table the scan wins! Indexes pay off on big tables with selective predicates.') : H.c('g', 'The seek wins.')) + ' On a 1,000,000-page table the scan would cost 1,000,000 while the seek still costs ~' + (4 + match.length * 4) + '.', parts: [{ type: 'bars', label: 'estimated cost (lower is better)', values: [scanCost, seekCost, coverCost], idxLabels: ['full scan', 'seek + lookups', 'covering seek'], hl: (function () { var m = Math.min(scanCost, seekCost, coverCost), h = {};[scanCost, seekCost, coverCost].forEach(function (v, i) { if (v === m) h[i] = 'ok'; }); return h; })() }] });
          return frames;
        }
      },
      {
        title: 'Where does the index stop paying? (selectivity crossover)',
        input: '100000 1000',
        inputLabel: 'table rows, table pages',
        gen: function (input) {
          var p = String(input || '').trim().split(/[\s,]+/).map(Number);
          if (p.length !== 2 || p.some(function (x) { return !(x > 0); })) throw new Error('Enter two positive numbers: rows pages   e.g. 100000 1000');
          var N = Math.min(p[0], 1e9), P = Math.min(p[1], N), frames = [];
          var sels = [0.0001, 0.001, 0.005, 0.01, 0.05, 0.2, 0.5, 1];
          var scan = P * 1 + N * 0.0125;
          frames.push({ narr: 'Toy model with PostgreSQL default costs: sequential page = 1.0, random page = 4.0, per-row CPU ≈ 0.0125 (tuple + one filter). A full scan always costs the same: ' + P + ' pages + ' + N + ' rows × 0.0125 = <b>' + Math.round(scan) + '</b>, whatever the WHERE clause.', parts: [{ type: 'vars', label: 'table', vals: { rows: N, pages: P, rowsPerPage: Math.round(N / P), scanCost: Math.round(scan) } }] });
          sels.forEach(function (s) {
            var m = Math.max(1, Math.round(N * s));
            var randPages = Math.min(m, P);   // uncorrelated: each match likely a different page (capped at all pages)
            var descent = 4 * Math.max(1, Math.ceil(Math.log(N) / Math.log(300)));
            var seek = descent + Math.ceil(m / 300) + m * 0.005 + randPages * 4 + m * 0.0125;
            var bitmapPages = P * (1 - Math.pow(1 - 1 / P, m)), frac = bitmapPages / P;
            var bitmap = 10 + descent + Math.ceil(m / 300) + m * 0.005 + bitmapPages * (4 - 3 * Math.sqrt(frac)) + m * 0.0125;
            var cover = descent + Math.ceil(m / 300) + m * 0.005;
            var vals = [Math.round(scan), Math.round(seek), Math.round(bitmap), Math.round(cover)];
            var best = 0; vals.slice(0, 3).forEach(function (v, i) { if (v < vals[best]) best = i; });
            var hl = {}; hl[best] = 'ok';
            frames.push({ narr: '<b>' + (s * 100) + '%</b> of rows match (' + m + ' rows). Index seek ≈ ' + vals[1] + ' (one random page per match), bitmap scan ≈ ' + vals[2] + ' (each page read once, in order), full scan = ' + vals[0] + '. ' + ['Full scan', 'Index seek', 'Bitmap scan'][best] + ' wins among plans that must read the table. A covering index (' + vals[3] + ') beats them all because it never touches the table.', parts: [{ type: 'bars', label: 'cost at ' + (s * 100) + '% selectivity', values: vals, idxLabels: ['full scan', 'index seek', 'bitmap scan', 'covering'], hl: hl }] });
          });
          frames.push({ narr: 'Lesson: with rows spread randomly, a plain index seek stops paying at a <b>surprisingly small</b> fraction (here under 1%). A bitmap scan stretches the useful range because it reads each page once, in order; when nearly every page must be read anyway, the plain full scan wins. If the table is physically sorted by the indexed column (high <b>correlation</b>, e.g. an append-only created_at), matches share pages and the crossover moves much higher. Planners read this from statistics — you should, too.', parts: [{ type: 'text', html: 'Change the input (e.g. <code>1000000 50000</code>) and watch the crossover move.' }] });
          return frames;
        }
      }
    ],
    examples: [
      { title: 'Covering index for a "customer order history" page', html: `<p>The page runs <code>SELECT created_at, total_cents FROM orders WHERE customer_id = ? ORDER BY created_at DESC</code>. With only <code>idx_orders_customer</code> the plan is ${H.c('y', 'SEARCH … idx_orders_customer (customer_id=?)')} + ${H.c('r', 'USE TEMP B-TREE FOR ORDER BY')}: 10 random table reads plus a sort. A composite index <code>(customer_id, created_at, total_cents)</code> gives ${H.c('g', 'SEARCH orders USING COVERING INDEX idx_orders_cust_created (customer_id=?)')}: seek to the customer, entries are already ordered by created_at (walked backwards for DESC), and total_cents is right there. No table, no sort.</p>`, code: { lang: 'sql', db: 'shop', code: `EXPLAIN QUERY PLAN
SELECT created_at, total_cents FROM orders
WHERE customer_id = 42 ORDER BY created_at DESC;

CREATE INDEX idx_orders_cust_created ON orders(customer_id, created_at, total_cents);

EXPLAIN QUERY PLAN
SELECT created_at, total_cents FROM orders
WHERE customer_id = 42 ORDER BY created_at DESC;

SELECT created_at, total_cents FROM orders
WHERE customer_id = 42 ORDER BY created_at DESC LIMIT 3;` } },
      { title: 'SQLite skip-scan: using an index without its first column', html: `<p>Rule of thumb: an index on <code>(status, created_at)</code> can't seek on <code>created_at</code> alone (left-prefix rule). But when the leading column has <b>very few distinct values</b> (status has 4), the engine can do a <b>skip scan</b>: one small seek per status value — "pending + date, cancelled + date, …". SQLite does this only after <code>ANALYZE</code> tells it the leading column has ≥ 18 rows per value; the plan shows ${H.c('g', 'ANY(status) AND created_at&gt;?')}. MySQL 8.0.13+, Oracle and <b>PostgreSQL 18</b> (2025) also have skip scan.</p>`, code: { lang: 'sql', db: 'shop', code: `DROP INDEX idx_orders_created;   -- pretend we only have (status, created_at)
ANALYZE;                         -- skip-scan needs statistics
EXPLAIN QUERY PLAN
SELECT id FROM orders WHERE created_at >= '2026-09-01';
SELECT count(*) AS orders_since_sep FROM orders WHERE created_at >= '2026-09-01';` } },
      { title: 'Clustered (InnoDB) vs heap (PostgreSQL) vs rowid (SQLite) tables', html: `${H.table(['Engine', 'Where rows live', 'Secondary index stores', 'Seek via secondary index costs'], [
  ['MySQL InnoDB', 'In the primary-key B+tree itself (clustered)', 'the <b>primary key</b> value', 'secondary B+tree descent + <b>second</b> descent of the PK tree ("double lookup")'],
  ['PostgreSQL', 'Unordered heap pages', 'a physical TID (page, slot)', 'index descent + one heap page fetch (+ visibility check)'],
  ['SQLite rowid table', 'B-tree keyed by rowid', 'the <b>rowid</b>', 'index descent + rowid descent (like InnoDB)'],
  ['SQL Server', 'Clustered index or heap', 'clustering key or RID', '"Key Lookup" / "RID Lookup" per row']
])}<p>Consequences: in InnoDB a short PK keeps every secondary index small, and range scans on the PK are physically sequential. In PostgreSQL, <code>CLUSTER</code> sorts the heap once (not maintained), and the planner's <code>correlation</code> stat measures how sorted it still is.</p>` },
      { title: 'A planner that guesses: SQLite and "created_at &gt; 2025-01-01"', html: `<p><code>SELECT * FROM orders WHERE created_at &gt; '2025-01-01'</code> matches <b>all 3,000 rows</b>, yet SQLite picks ${H.c('y', 'SEARCH orders USING INDEX idx_orders_created (created_at&gt;?)')} — 3,000 index entries plus 3,000 table lookups, more work than a plain scan. Without histogram statistics (SQLite's optional <code>sqlite_stat4</code>), it assumes a range predicate is fairly selective. PostgreSQL would check its histogram, see ~100% selectivity, and choose a Seq Scan. Lesson: know <i>what</i> your engine knows.</p>`, code: { lang: 'sql', db: 'shop', code: `EXPLAIN QUERY PLAN SELECT * FROM orders WHERE created_at > '2025-01-01';
SELECT count(*) AS matched, (SELECT count(*) FROM orders) AS total
FROM orders WHERE created_at > '2025-01-01';` } }
    ],
    deepDive: `<h4>Why random I/O hurts, even on SSDs</h4>
<p>On spinning disks a random read costs ~5–10 ms vs ~0.1 ms per sequential page — a 50–100× gap, hence PostgreSQL's <code>random_page_cost = 4</code> (it assumes most random reads hit the cache). On NVMe SSDs the gap shrinks to ~2–4× for single reads, but sequential scans still win through <b>read-ahead</b>, larger I/O sizes, CPU cache locality and no B-tree descent per row. Most SSD-backed Postgres deployments set <code>random_page_cost ≈ 1.1–1.5</code> and <code>effective_cache_size</code> to ~50–75% of RAM so the planner prefers indexes more often.</p>
<h4>Index-only scans and MVCC</h4>
<p>In PostgreSQL an index entry doesn't know if its row version is visible to your transaction. An <b>Index Only Scan</b> checks the <b>visibility map</b>: if the page is marked all-visible (set by VACUUM), it skips the heap; otherwise it fetches the heap page anyway (<code>Heap Fetches: N</code>). Heavily-updated tables need frequent (auto)vacuum to keep index-only scans truly index-only. Use <code>INCLUDE (col)</code> to carry extra columns in the leaf without making them part of the key.</p>
<h4>Bitmap scans in detail</h4>
<p>A Bitmap Index Scan builds an in-memory bitmap of matching TIDs (exact, or "lossy" per page when <code>work_mem</code> is small, which forces a <code>Recheck Cond</code>). Bitmaps from several indexes can be combined with <code>BitmapAnd</code>/<code>BitmapOr</code> — that's how PostgreSQL answers <code>a = 1 OR b = 2</code> with two single-column indexes. The heap is then read in physical page order: each page once.</p>
<h4>Other access paths</h4>
<ul><li><b>Index skip scan</b> (Oracle, MySQL 8.0.13+, SQLite with stats, PostgreSQL 18): seek once per distinct leading value.</li>
<li><b>Loose index scan</b> (MySQL) for <code>GROUP BY a</code> / <code>DISTINCT a</code>: jump from one distinct value to the next. Emulate in PG with a recursive CTE.</li>
<li><b>Partition pruning</b>: skip whole partitions using the partition key (plan shows fewer partitions or "Subplans Removed").</li>
<li><b>Zone maps / min-max indexes</b> (BRIN in PG, column stores): skip blocks whose min/max range can't match — tiny index, great for append-only time data.</li>
<li><b>TABLESAMPLE</b> and <b>parallel seq scans</b> (Gather + workers) for big analytics.</li></ul>`,
    aiEra: `<p><b>What AI changes:</b> Index advisors are everywhere now — cloud consoles (Azure SQL automatic tuning, AWS Performance Insights, Google AlloyDB/Cloud SQL index advisor), <code>pg_qualstats</code> + <code>hypopg</code> hypothetical indexes, and LLM assistants that read slow-query logs and propose <code>CREATE INDEX</code> statements.</p>
<p><b>Use AI as a partner:</b> give it the query, the plan, the table sizes and the <b>write rate</b>, and ask "would a covering index help? Estimate rows read before/after." Then test with <code>hypopg</code> (PG) or on a copy before creating anything for real.</p>
<p><b>Where AI goes wrong:</b> it recommends an index for every slow query (index sprawl slows writes, eats RAM and bloats backups), forgets the left-prefix rule, proposes indexes on low-selectivity columns like <code>status</code> alone, and doesn't know that PostgreSQL will choose a seq scan for a 40%-selective predicate no matter what.</p>
<p><b>What you must still own:</b> estimating selectivity in your head, knowing when a scan is the <i>right</i> answer, and weighing read speed against write cost.</p>`,
    problems: [
      {
        title: 'Make the order-history page index-only', level: 'Medium', tags: ['covering index', 'composite index', 'ORDER BY'], companies: ['Amazon', 'Shopify', 'Meesho'],
        statement: `<p>The order-history page runs, for one customer at a time:</p><pre>SELECT created_at, total_cents
FROM orders
WHERE customer_id = ?
ORDER BY created_at DESC
LIMIT 20;</pre><p>Today's plan does an index seek, then a table lookup per row, then a sort. Design <b>one</b> index so the plan is a single covering seek with no temporary B-tree.</p>`,
        constraints: `SQLite <code>shop</code>; one new index; same results. Explain the column order you chose.`,
        example: `<p>For customer 42 the first row is ${H.c('g', '2026-09-04 08:07:17 | 8797')}. Target plan: ${H.c('g', 'SEARCH orders USING COVERING INDEX … (customer_id=?)')} and nothing else.</p>`,
        brute: { why: `<p>With only <code>idx_orders_customer(customer_id)</code> the engine seeks the customer's entries (cheap), then does one <b>random table read per order</b> to get <code>created_at</code> and <code>total_cents</code>, then <b>sorts</b> them. For a power user with 50,000 orders that is 50,000 random reads + a 50,000-row sort to show 20 rows.</p>`, code: { lang: 'sql', db: 'shop', code: `EXPLAIN QUERY PLAN
SELECT created_at, total_cents FROM orders
WHERE customer_id = 42
ORDER BY created_at DESC LIMIT 20;
-- SEARCH orders USING INDEX idx_orders_customer (customer_id=?)
-- USE TEMP B-TREE FOR ORDER BY` } },
        mcq: { q: 'Which column order makes the index serve the WHERE, the ORDER BY and the SELECT list?', options: ['(created_at, customer_id, total_cents)', '(customer_id, created_at, total_cents)', '(total_cents, created_at, customer_id)', '(customer_id, total_cents, created_at)'], answer: 1, explain: 'Equality column first (seek), then the ORDER BY column (entries for one customer are already sorted by it), then extra columns just to cover the SELECT list.' },
        hints: [`<p>Hint 1: Three jobs — find the customer, order by date, return two columns. One B+tree can do all three if the columns are in the right order.</p>`, `<p>Hint 2: Equality columns first, then the sort/range column, then "passenger" columns that are only read.</p>`, `<p>Hint 3: Recipe: <code>CREATE INDEX … ON orders(customer_id, created_at, total_cents)</code>, re-run EXPLAIN QUERY PLAN, confirm "COVERING" and no temp B-tree, run the query.</p>`],
        tests: { engine: 'sqlite', check: '(rows, cols, c) => {\n  if (c.plan || c.noplan) { const d = rows.map(r => r[r.length - 1]).join(\'\\n\'); return (!c.plan || new RegExp(c.plan).test(d)) && (!c.noplan || !new RegExp(c.noplan).test(d)); }\n  let a = rows, b = c.rows || [];\n  if (c.set) { const k = r => JSON.stringify(r); a = a.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); b = b.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); }\n  return a.length === b.length && a.every((r, i) => r.length === b[i].length && r.every((v, j) => v === b[i][j] || (typeof v === \'number\' && typeof b[i][j] === \'number\' && Math.abs(v - b[i][j]) < 1e-6)));\n}', cases: [
          { rows: [
              ['2026-09-04 08:07:17', 8797],
              ['2026-08-15 15:22:17', 1697],
              ['2026-07-26 22:37:17', 14597],
              ['2026-01-27 02:32:17', 13097],
              ['2026-01-07 09:47:17', 5997],
              ['2025-12-18 17:02:17', 18897],
              ['2025-07-11 13:42:17', 4497],
              ['2025-06-21 20:57:17', 17397],
              ['2025-06-01 04:12:17', 10297],
              ['2025-05-12 11:27:17', 3197]
            ] },
          { rows: [], plan: 'SEARCH orders USING COVERING INDEX idx_orders_cust_created \\(customer_id=\\?\\)', noplan: 'TEMP B-TREE|SCAN', after: 'EXPLAIN QUERY PLAN SELECT created_at, total_cents FROM orders WHERE customer_id = 42 ORDER BY created_at DESC LIMIT 20' },
          { setup: 'INSERT INTO orders VALUES (5001,42,\'paid\',\'2030-01-01 00:00:01\',10),(5002,42,\'paid\',\'2030-01-01 00:00:02\',20),(5003,42,\'paid\',\'2030-01-01 00:00:03\',30),(5004,42,\'paid\',\'2030-01-01 00:00:04\',40),(5005,42,\'paid\',\'2030-01-01 00:00:05\',50),(5006,42,\'paid\',\'2030-01-01 00:00:06\',60),(5007,42,\'paid\',\'2030-01-01 00:00:07\',70),(5008,42,\'paid\',\'2030-01-01 00:00:08\',80),(5009,42,\'paid\',\'2030-01-01 00:00:09\',90),(5010,42,\'paid\',\'2030-01-01 00:00:10\',100),(5011,42,\'paid\',\'2030-01-01 00:00:11\',110),(5012,42,\'paid\',\'2030-01-01 00:00:12\',120),(5013,42,\'paid\',\'2030-01-01 00:00:13\',130),(5014,42,\'paid\',\'2030-01-01 00:00:14\',140),(5015,42,\'paid\',\'2030-01-01 00:00:15\',150),(5016,42,\'paid\',\'2030-01-01 00:00:16\',160),(5017,42,\'paid\',\'2030-01-01 00:00:17\',170),(5018,42,\'paid\',\'2030-01-01 00:00:18\',180),(5019,42,\'paid\',\'2030-01-01 00:00:19\',190),(5020,42,\'paid\',\'2030-01-01 00:00:20\',200),(5021,42,\'paid\',\'2030-01-01 00:00:21\',210),(5022,42,\'paid\',\'2030-01-01 00:00:22\',220),(5023,42,\'paid\',\'2030-01-01 00:00:23\',230),(5024,42,\'paid\',\'2030-01-01 00:00:24\',240),(5025,42,\'paid\',\'2030-01-01 00:00:25\',250),(5026,42,\'paid\',\'2030-01-01 00:00:26\',260),(5027,42,\'paid\',\'2030-01-01 00:00:27\',270),(5028,42,\'paid\',\'2030-01-01 00:00:28\',280),(5029,42,\'paid\',\'2030-01-01 00:00:29\',290),(5030,42,\'paid\',\'2030-01-01 00:00:30\',300)', rows: [
              ['2030-01-01 00:00:30', 300],
              ['2030-01-01 00:00:29', 290],
              ['2030-01-01 00:00:28', 280],
              ['2030-01-01 00:00:27', 270],
              ['2030-01-01 00:00:26', 260],
              ['2030-01-01 00:00:25', 250],
              ['2030-01-01 00:00:24', 240],
              ['2030-01-01 00:00:23', 230],
              ['2030-01-01 00:00:22', 220],
              ['2030-01-01 00:00:21', 210],
              ['2030-01-01 00:00:20', 200],
              ['2030-01-01 00:00:19', 190],
              ['2030-01-01 00:00:18', 180],
              ['2030-01-01 00:00:17', 170],
              ['2030-01-01 00:00:16', 160],
              ['2030-01-01 00:00:15', 150],
              ['2030-01-01 00:00:14', 140],
              ['2030-01-01 00:00:13', 130],
              ['2030-01-01 00:00:12', 120],
              ['2030-01-01 00:00:11', 110]
            ] },
          { setup: 'DELETE FROM orders WHERE customer_id = 42', after: 'SELECT count(*) FROM (SELECT created_at, total_cents FROM orders WHERE customer_id = 42 ORDER BY created_at DESC LIMIT 20)', rows: [
              [0]
            ] },
          { setup: 'DELETE FROM orders WHERE customer_id = 42 AND id <> 263', rows: [
              ['2025-05-12 11:27:17', 3197]
            ] },
          { after: 'SELECT created_at, total_cents FROM orders WHERE customer_id = 43 ORDER BY created_at DESC LIMIT 20', rows: [
              ['2026-04-28 21:54:54', 17914],
              ['2026-04-08 05:09:54', 10814],
              ['2026-03-19 12:24:54', 3714],
              ['2025-10-10 09:04:54', 9314],
              ['2025-09-20 16:19:54', 2214],
              ['2025-08-31 23:34:54', 15114],
              ['2025-08-11 06:49:54', 8014],
              ['2025-03-04 03:29:54', 13614],
              ['2025-02-12 10:44:54', 6514],
              ['2025-01-23 17:59:54', 19414]
            ] },
          { after: 'SELECT created_at, total_cents FROM orders WHERE customer_id = 300 ORDER BY created_at DESC LIMIT 20', rows: [
              ['2026-09-02 06:52:23', 16983],
              ['2026-08-13 14:07:23', 9883],
              ['2026-07-24 21:22:23', 2783],
              ['2026-07-04 04:37:23', 15683],
              ['2026-01-25 01:17:23', 1283],
              ['2026-01-05 08:32:23', 14183],
              ['2025-12-16 15:47:23', 7083],
              ['2025-06-19 19:42:23', 5583],
              ['2025-05-30 02:57:23', 18483],
              ['2025-05-10 10:12:23', 11383]
            ] },
          { setup: 'INSERT INTO orders VALUES (5001,42,\'paid\',\'2030-01-01 00:00:01\',10),(5002,42,\'paid\',\'2030-01-01 00:00:02\',20),(5003,42,\'paid\',\'2030-01-01 00:00:03\',30),(5004,42,\'paid\',\'2030-01-01 00:00:04\',40),(5005,42,\'paid\',\'2030-01-01 00:00:05\',50),(5006,42,\'paid\',\'2030-01-01 00:00:06\',60),(5007,42,\'paid\',\'2030-01-01 00:00:07\',70),(5008,42,\'paid\',\'2030-01-01 00:00:08\',80),(5009,42,\'paid\',\'2030-01-01 00:00:09\',90),(5010,42,\'paid\',\'2030-01-01 00:00:10\',100),(5011,42,\'paid\',\'2030-01-01 00:00:11\',110),(5012,42,\'paid\',\'2030-01-01 00:00:12\',120),(5013,42,\'paid\',\'2030-01-01 00:00:13\',130),(5014,42,\'paid\',\'2030-01-01 00:00:14\',140),(5015,42,\'paid\',\'2030-01-01 00:00:15\',150),(5016,42,\'paid\',\'2030-01-01 00:00:16\',160),(5017,42,\'paid\',\'2030-01-01 00:00:17\',170),(5018,42,\'paid\',\'2030-01-01 00:00:18\',180),(5019,42,\'paid\',\'2030-01-01 00:00:19\',190),(5020,42,\'paid\',\'2030-01-01 00:00:20\',200),(5021,42,\'paid\',\'2030-01-01 00:00:21\',210),(5022,42,\'paid\',\'2030-01-01 00:00:22\',220),(5023,42,\'paid\',\'2030-01-01 00:00:23\',230),(5024,42,\'paid\',\'2030-01-01 00:00:24\',240),(5025,42,\'paid\',\'2030-01-01 00:00:25\',250),(5026,42,\'paid\',\'2030-01-01 00:00:26\',260),(5027,42,\'paid\',\'2030-01-01 00:00:27\',270),(5028,42,\'paid\',\'2030-01-01 00:00:28\',280),(5029,42,\'paid\',\'2030-01-01 00:00:29\',290),(5030,42,\'paid\',\'2030-01-01 00:00:30\',300)', after: 'SELECT created_at, total_cents FROM orders WHERE customer_id = 41 ORDER BY created_at DESC LIMIT 20', rows: [
              ['2026-06-05 12:44:40', 3980],
              ['2026-05-16 19:59:40', 16880],
              ['2026-04-26 03:14:40', 9780],
              ['2026-04-06 10:29:40', 2680],
              ['2025-10-28 07:09:40', 8280],
              ['2025-10-08 14:24:40', 1180],
              ['2025-09-18 21:39:40', 14080],
              ['2025-03-22 01:34:40', 12580],
              ['2025-03-02 08:49:40', 5480],
              ['2025-02-10 16:04:40', 18380]
            ] },
          { after: 'SELECT count(*) FROM sqlite_master WHERE type = \'index\' AND tbl_name = \'orders\'', rows: [
              [4]
            ] }
        ] },
        solution: {
          approach: `<p>Put the <b>equality</b> column first so the engine can seek straight to customer 42. Inside that customer's slice of the index, entries are sorted by the <b>second</b> column, <code>created_at</code> — so walking backwards gives DESC order for free and the LIMIT stops after 20. The <b>third</b> column, <code>total_cents</code>, is a passenger that makes the index <b>covering</b>. In PostgreSQL/SQL Server you would write <code>(customer_id, created_at) INCLUDE (total_cents)</code> to keep the key smaller.</p>`,
          code: { lang: 'sql', db: 'shop', code: `CREATE INDEX idx_orders_cust_created ON orders(customer_id, created_at, total_cents);

EXPLAIN QUERY PLAN
SELECT created_at, total_cents FROM orders
WHERE customer_id = 42
ORDER BY created_at DESC LIMIT 20;
-- SEARCH orders USING COVERING INDEX idx_orders_cust_created (customer_id=?)

SELECT created_at, total_cents FROM orders
WHERE customer_id = 42
ORDER BY created_at DESC LIMIT 20;` },
          complexity: `<p>O(log N + 20) index reads, zero table reads, zero sorting — independent of how many orders the customer has. Trade-off: a wider index (more disk, slower inserts); the old <code>idx_orders_customer</code> is now redundant (left prefix of the new one) and can be dropped.</p>`,
          followUps: ['Why is <code>idx_orders_customer</code> now redundant?', 'What changes if the page also shows <code>status</code>?']
        }
      }
    ]
  });

  /* =====================================================================
     TOPIC 4 — Join algorithms: nested loop, hash join, merge join
     ===================================================================== */
  function fmtN(x) { x = Math.round(x); if (x >= 1e9) return (x / 1e9).toFixed(1) + 'B'; if (x >= 1e6) return (x / 1e6).toFixed(1) + 'M'; if (x >= 1e3) return (x / 1e3).toFixed(1) + 'K'; return String(x); }

  topics.push({
    title: 'Join Algorithms: Nested Loop, Hash Join & Merge Join',
    analogy: `<p>You must match a class list of 40 students with a pile of 40 exam papers.</p>
<ul><li><b>Nested loop:</b> take student #1, flip through the whole pile looking for their paper; then student #2, flip through the whole pile again… 40 × 40 = 1,600 looks. But if the pile is <b>alphabetised with tabs</b> (an index), each student is one quick flip — that is an <i>index</i> nested loop.</li>
<li><b>Hash join:</b> first sort the papers into 26 trays by the first letter of the name (build). Then for each student, go straight to their tray and look only there (probe). Two passes, but you need table space for 26 trays (memory).</li>
<li><b>Merge join:</b> if the class list <i>and</i> the pile are both already in alphabetical order, put them side by side and walk down both with two fingers. One pass, almost no thinking — but only if both are sorted.</li></ul>`,
    explain: `<p>Once the planner decides which two inputs to join, it must pick <b>how</b>. Every engine uses some mix of three algorithms (call the inputs <b>outer R</b> with N rows and <b>inner S</b> with M rows):</p>
${H.table(['', 'Nested loop (NLJ)', 'Hash join', 'Merge join'], [
  ['Idea', 'For each R row, look through S', 'Build a hash table on the smaller input, probe it with the other', 'Both sorted by the key; walk two pointers'],
  ['Cost', 'N × M plain; <b>N × log M</b> with an index on S', '<b>N + M</b> (if build fits in memory)', '<b>N + M</b> if pre-sorted; + N log N + M log M to sort'],
  ['Join condition', H.c('g', 'any') + ' (=, &lt;, BETWEEN, LIKE, functions)', H.c('y', 'equality only'), 'equality (and some ranges)'],
  ['Memory', 'none', 'build side (work_mem / join_buffer_size)', 'sort memory if not pre-sorted'],
  ['First row arrives', H.c('g', 'immediately'), 'after the whole build side is read', 'after sorting (immediately if pre-sorted)'],
  ['Shines when', 'outer is <b>small</b> and inner has an <b>index</b> on the join key; LIMIT queries', '<b>big, unsorted</b> inputs, no useful index, analytics', 'inputs <b>already sorted</b> (index order, previous merge), huge inputs, FULL OUTER JOIN'],
  ['Plan text', 'PG <code>Nested Loop</code>, SQLite <code>SCAN a</code> + <code>SEARCH b</code>', 'PG <code>Hash Join</code> + <code>Hash</code>; MySQL 8.0.18+ <code>hash join</code>', 'PG <code>Merge Join</code> (+ <code>Sort</code>)']
])}
<p><b>Rules of thumb you can say in an interview:</b></p>
<ul>
<li>Small × indexed → <b>index nested loop</b> (OLTP: "this user's orders").</li>
<li>Big × big, equality, no order needed → <b>hash join</b> (reports, ETL, analytics). Put the <b>smaller</b> input on the build side.</li>
<li>Big × big, both already sorted on the key, or result must be sorted anyway → <b>merge join</b>.</li>
<li>Non-equality condition (<code>a.ts BETWEEN b.start AND b.end</code>) → only <b>nested loop</b> works (some engines have special range/interval joins).</li>
</ul>
<p><b>Which engines have what:</b> PostgreSQL, SQL Server and Oracle have all three. MySQL had only nested loops until 8.0.18 added hash join (8.0.20 replaced block nested loop with it). <b>SQLite only does nested loops</b> — but it builds an <b>automatic index</b> (and a <b>Bloom filter</b>) on the inner table at run time when no index exists, which gives hash-join-like behaviour.</p>`,
    clues: [
      '"Two tables with millions of rows joined on a key, no index" → hash join (build on the smaller side)',
      '"Fetch this one customer\'s orders with product names" → index nested loop; tiny outer, indexed inner',
      '"Join on a range: timestamp BETWEEN start AND end" → only nested loop supports non-equi joins',
      '"Hash Join … Batches: 32, Disk usage" → build side larger than work_mem, spilled to disk',
      '"Nested Loop … loops=2,000,000" with a Seq Scan inside → missing index or underestimated outer rows',
      '"Both inputs come from indexes ordered by the join key" / FULL OUTER JOIN → merge join'
    ],
    code: [
      { lang: 'sql', db: 'shop', title: 'SQLite: index nested loop, automatic index, and a plain nested loop (▶ Run)', code: `-- Index nested loop: 60 pending orders (outer) → seek order_items by order_id (inner)
EXPLAIN QUERY PLAN
SELECT o.id, i.product_id, i.qty
FROM orders o JOIN order_items i ON i.order_id = o.id
WHERE o.status = 'pending';

-- Equi-join with NO index on either column: SQLite builds an automatic index
-- (and a Bloom filter) on the smaller side at run time — its stand-in for a hash join
EXPLAIN QUERY PLAN
SELECT o.id, p.name
FROM orders o JOIN products p ON p.price_cents = o.total_cents;

-- Turn automatic indexes off: now it is a plain N x M nested loop (3,000 x 60 checks)
PRAGMA automatic_index = OFF;
EXPLAIN QUERY PLAN
SELECT o.id, p.name
FROM orders o JOIN products p ON p.price_cents = o.total_cents;` },
      { lang: 'text', title: 'PostgreSQL shows all three algorithms (EXPLAIN output, abbreviated)', code: `-- Small outer + index → Nested Loop
Nested Loop  (rows=10)
  ->  Index Scan using customers_pkey on customers c   (Index Cond: (id = 42))
  ->  Index Scan using idx_orders_customer on orders o (Index Cond: (customer_id = 42))

-- Two big inputs, equality, no useful order → Hash Join (build = smaller input)
Hash Join  (rows=3000000)
  Hash Cond: (i.order_id = o.id)
  ->  Seq Scan on order_items i                      -- probe side (bigger)
  ->  Hash  (Buckets: 2097152  Batches: 1  Memory Usage: 98304kB)
        ->  Seq Scan on orders o                     -- build side (smaller)

-- Both inputs already ordered by the key → Merge Join
Merge Join  (rows=3000000)
  Merge Cond: (o.id = i.order_id)
  ->  Index Scan using orders_pkey on orders o
  ->  Index Scan using order_items_pkey on order_items i

-- Force a choice only for experiments (never in production):
SET enable_hashjoin = off;  SET enable_mergejoin = off;  SET enable_nestloop = off;` }
    ],
    codeTitle: ['Joins in SQLite', 'Joins in PostgreSQL (text)'],
    viz: [
      {
        title: 'Nested loop join: every outer row scans the inner table',
        input: '3 1 4 1 | 1 4 4 9 3',
        inputLabel: 'outer R keys | inner S keys (≤ 8 each)',
        gen: function (input) {
          var L = twoLists(input), R = L.R, S = L.S, frames = [], out = [], cmp = 0;
          frames.push({ narr: '<b>Nested loop</b>: the outer loop walks R; for <i>each</i> R row the inner loop walks <b>all</b> of S comparing keys. Simple, works for any condition, needs no memory.', parts: [{ type: 'table', label: 'R (outer)', columns: ['row', 'key'], rows: rowsOf(R, 'r') }, { type: 'table', label: 'S (inner)', columns: ['row', 'key'], rows: rowsOf(S, 's') }, { type: 'code', label: 'algorithm', lang: 'python', code: 'for r in R:\n    for s in S:\n        if r.key == s.key:\n            emit(r, s)' }] });
          for (var i = 0; i < R.length; i++) {
            for (var j = 0; j < S.length; j++) {
              cmp++;
              var m = R[i] === S[j];
              if (m) out.push(['r' + (i + 1), 's' + (j + 1), R[i]]);
              var rh = {}; rh[i] = 'cur'; var sh = {}; sh[j] = m ? 'ok' : 'cur';
              var oh = {}; if (m) oh[out.length - 1] = 'ok';
              frames.push({ narr: 'r' + (i + 1) + ' (key ' + R[i] + ') vs s' + (j + 1) + ' (key ' + S[j] + '): ' + (m ? H.c('g', 'match → emit') : 'no match') + '. Comparisons so far: <b>' + cmp + '</b>.', parts: [{ type: 'table', label: 'R (outer)', columns: ['row', 'key'], rows: rowsOf(R, 'r'), hl: rh }, { type: 'table', label: 'S (inner) — scanned again for every R row', columns: ['row', 'key'], rows: rowsOf(S, 's'), hl: sh }, { type: 'table', label: 'output', columns: ['R row', 'S row', 'key'], rows: out.slice(), hl: oh }, { type: 'vars', vals: { comparisons: cmp, 'N×M': R.length * S.length }, hl: { comparisons: 'cur' } }] });
            }
          }
          if (frames.length < 3) frames.push({ narr: 'With a single pair there is nothing to repeat — but notice the shape: the inner side is re-read <b>once per outer row</b>. Add more keys to see the work multiply.', parts: [{ type: 'vars', vals: { outerRows: R.length, innerRows: S.length, comparisons: cmp } }] });
          var lg = Math.ceil(Math.log(Math.max(2, S.length)) / Math.LN2);
          frames.push({ narr: 'Done: <b>' + cmp + '</b> comparisons = N × M = ' + R.length + ' × ' + S.length + ' for ' + out.length + ' output rows. With an <b>index on S.key</b>, each outer row would instead do one seek (~log₂M = ' + lg + ' steps) plus its matches: ≈ ' + (R.length * lg + out.length) + ' steps. That is the <b>index nested loop</b> — the workhorse of OLTP. With 1M × 1M rows the plain version is 10<sup>12</sup> comparisons; the indexed one ~2×10<sup>7</sup>.', parts: [{ type: 'bars', label: 'work', values: [cmp, R.length * lg + out.length], idxLabels: ['plain NLJ', 'index NLJ'], hl: { 1: 'ok' } }, { type: 'table', label: 'output', columns: ['R row', 'S row', 'key'], rows: out }] });
          return frames;
        }
      },
      {
        title: 'Hash join: build a hash table on the smaller side, then probe',
        input: '3 1 4 1 5 9 2 6 | 1 4 4 9 3',
        inputLabel: 'R keys | S keys (≤ 8 each)',
        gen: function (input) {
          var L = twoLists(input), frames = [];
          var buildIsS = L.S.length <= L.R.length;
          var B = buildIsS ? L.S : L.R, P = buildIsS ? L.R : L.S, bn = buildIsS ? 's' : 'r', pn = buildIsS ? 'r' : 's';
          var NB = 4, buckets = [[], [], [], []], ops = 0;
          var ent = function () { return buckets.map(function (b, i) { return ['bucket ' + i, b.length ? b.map(function (e) { return e.k + '@' + e.row; }).join(', ') : '—']; }); };
          frames.push({ narr: '<b>Hash join</b>, phase 1 = <b>build</b>. Pick the <b>smaller</b> input (' + (buildIsS ? 'S' : 'R') + ', ' + B.length + ' rows) and load it into a hash table in memory. Bucket = key mod ' + NB + ' (a real engine uses a good hash function and thousands of buckets).', parts: [{ type: 'table', label: 'build side (' + (buildIsS ? 'S' : 'R') + ')', columns: ['row', 'key'], rows: rowsOf(B, bn) }, { type: 'map', label: 'hash table (empty)', entries: ent() }] });
          B.forEach(function (k, i) {
            var b = ((k % NB) + NB) % NB; buckets[b].push({ k: k, row: bn + (i + 1) }); ops++;
            var h = {}; h['bucket ' + b] = 'ok'; var th = {}; th[i] = 'cur';
            frames.push({ narr: 'Build: ' + bn + (i + 1) + ' has key ' + k + ' → hash(' + k + ') mod ' + NB + ' = <b>' + b + '</b> → put it in bucket ' + b + '. One cheap operation per build row.', parts: [{ type: 'table', label: 'build side', columns: ['row', 'key'], rows: rowsOf(B, bn), hl: th }, { type: 'map', label: 'hash table', entries: ent(), hl: h }, { type: 'vars', vals: { operations: ops } }] });
          });
          var out = [];
          frames.push({ narr: 'Phase 2 = <b>probe</b>. Stream the bigger input (' + P.length + ' rows) once. For each row, hash its key and look <b>only inside one bucket</b> — no full scan of the other side.', parts: [{ type: 'table', label: 'probe side (' + (buildIsS ? 'R' : 'S') + ')', columns: ['row', 'key'], rows: rowsOf(P, pn) }, { type: 'map', label: 'hash table (complete)', entries: ent() }] });
          P.forEach(function (k, i) {
            var b = ((k % NB) + NB) % NB, found = 0; ops++;
            buckets[b].forEach(function (e) { ops++; if (e.k === k) { found++; out.push([pn + (i + 1), e.row, k]); } });
            var h = {}; h['bucket ' + b] = found ? 'ok' : 'bad'; var th = {}; th[i] = 'cur';
            var oh = {}; for (var z = out.length - found; z < out.length; z++) oh[z] = 'ok';
            frames.push({ narr: 'Probe: ' + pn + (i + 1) + ' key ' + k + ' → bucket ' + b + ' holds ' + buckets[b].length + ' entr' + (buckets[b].length === 1 ? 'y' : 'ies') + '; compare keys inside it (different keys can share a bucket = collision). ' + (found ? H.c('g', found + ' match(es) emitted.') : H.c('r', 'No match.')), parts: [{ type: 'table', label: 'probe side', columns: ['row', 'key'], rows: rowsOf(P, pn), hl: th }, { type: 'map', label: 'hash table', entries: ent(), hl: h }, { type: 'table', label: 'output', columns: ['probe row', 'build row', 'key'], rows: out.slice(), hl: oh }, { type: 'vars', vals: { operations: ops } }] });
          });
          frames.push({ narr: 'Total ≈ <b>' + ops + '</b> operations ≈ N + M (+ bucket comparisons), versus ' + (L.R.length * L.S.length) + ' for a plain nested loop. Price: memory for the build side, and no output until the build finishes. If the build side doesn\'t fit in memory (PostgreSQL <code>work_mem</code>), both inputs are split into <b>batches</b> on disk by hash and joined batch by batch (grace hash join) — still linear, but 2–3× the I/O.', parts: [{ type: 'bars', label: 'work', values: [L.R.length * L.S.length, ops], idxLabels: ['nested loop', 'hash join'], hl: { 1: 'ok' } }, { type: 'table', label: 'output', columns: ['probe row', 'build row', 'key'], rows: out }] });
          return frames;
        }
      },
      {
        title: 'Merge join: sort both sides, then zip them together with two pointers',
        input: '3 1 4 1 5 | 1 4 4 9 3 1',
        inputLabel: 'R keys | S keys (≤ 8 each)',
        gen: function (input) {
          var L = twoLists(input), frames = [];
          var R = L.R.map(function (k, i) { return { k: k, row: 'r' + (i + 1) }; }).sort(function (a, b) { return a.k - b.k; });
          var S = L.S.map(function (k, i) { return { k: k, row: 's' + (i + 1) }; }).sort(function (a, b) { return a.k - b.k; });
          var rv = R.map(function (e) { return e.k; }), sv = S.map(function (e) { return e.k; });
          var rl = R.map(function (e) { return e.row; }), sl = S.map(function (e) { return e.row; });
          frames.push({ narr: '<b>Merge join</b>, phase 1: both inputs must be <b>sorted by the join key</b>. If they come from an index on the key (or from an earlier merge) this is free; otherwise it costs a sort: O(N log N + M log M).', parts: [{ type: 'array', label: 'R as given', values: L.R }, { type: 'array', label: 'S as given', values: L.S }] });
          frames.push({ narr: 'Sorted. Now put two fingers at the start of each list.', parts: [{ type: 'array', label: 'R sorted', values: rv, idxLabels: rl, ptr: { 0: 'i' } }, { type: 'array', label: 'S sorted', values: sv, idxLabels: sl, ptr: { 0: 'j' } }] });
          var i = 0, j = 0, out = [], steps = 0, guard = 0;
          function fr(narr, hr, hs) {
            var pr = {}, ps = {}; if (i < rv.length) pr[i] = 'i'; if (j < sv.length) ps[j] = 'j';
            frames.push({ narr: narr, parts: [{ type: 'array', label: 'R sorted', values: rv, idxLabels: rl, ptr: pr, hl: hr || {} }, { type: 'array', label: 'S sorted', values: sv, idxLabels: sl, ptr: ps, hl: hs || {} }, { type: 'table', label: 'output', columns: ['R row', 'S row', 'key'], rows: out.slice() }, { type: 'vars', vals: { steps: steps } }] });
          }
          while (i < rv.length && j < sv.length && guard++ < 60) {
            steps++;
            if (rv[i] < sv[j]) { var h1 = {}; h1[i] = 'bad'; fr('R[i] = ' + rv[i] + ' &lt; S[j] = ' + sv[j] + ' → nothing in S can match it any more (S only grows). <b>Advance i.</b>', h1, {}); i++; }
            else if (rv[i] > sv[j]) { var h2 = {}; h2[j] = 'bad'; fr('R[i] = ' + rv[i] + ' &gt; S[j] = ' + sv[j] + ' → <b>advance j.</b>', {}, h2); j++; }
            else {
              var key = rv[i], mark = j, hs = {}, hr = {}; hr[i] = 'ok';
              while (j < sv.length && sv[j] === key) { out.push([rl[i], sl[j], key]); hs[j] = 'ok'; j++; steps++; }
              fr('Keys equal (' + key + '): emit R row ' + rl[i] + ' with <b>every</b> S row in the run of ' + key + 's (' + (j - mark) + ' match' + (j - mark > 1 ? 'es' : '') + ').', hr, hs);
              i++;
              if (i < rv.length && rv[i] === key) { j = mark; var hm = {}; hm[mark] = 'sel'; fr('The next R row has the <b>same key</b> ' + key + ' → rewind j to the <b>mark</b> (start of the run) and replay it. This rewind is how merge join handles duplicates on both sides.', {}, hm); }
            }
          }
          fr('One side is exhausted → <b>done</b>. After sorting, the merge itself touched each row about once: <b>' + steps + '</b> steps for ' + out.length + ' output rows (vs ' + (rv.length * sv.length) + ' for a nested loop). Bonus: the output is <b>already sorted</b> by the key, which can satisfy an ORDER BY or feed the next merge join.', {}, {});
          return frames;
        }
      },
      {
        title: 'Cost comparison: which algorithm wins for these table sizes?',
        input: '5000 2000000 100000',
        inputLabel: 'outer rows N, inner rows M, rows that fit in join memory',
        gen: function (input) {
          var p = String(input || '').trim().split(/[\s,]+/).map(Number);
          if (p.length !== 3 || p.some(function (x) { return !(x >= 1); })) throw new Error('Enter three positive numbers: N M memoryRows   e.g. 5000 2000000 100000');
          var N = Math.min(p[0], 1e10), M = Math.min(p[1], 1e10), mem = p[2], frames = [];
          var lg = function (x) { return Math.max(1, Math.log(x) / Math.LN2); };
          var nl = N * M;
          var inl = N * (lg(M) + 4);
          var build = Math.min(N, M), batches = Math.max(1, Math.ceil(build / mem));
          var hj = (N + M) * (batches > 1 ? 3 : 1) + build;
          var mjSort = N * lg(N) + M * lg(M) + N + M, mjPre = N + M;
          var names = ['plain nested loop', 'index nested loop', 'hash join', 'merge join (needs sort)', 'merge join (pre-sorted)'];
          var costs = [nl, inl, hj, mjSort, mjPre];
          var show = function (k, narr) {
            var vals = costs.slice(0, k + 1).map(function (c) { return Math.round(Math.log(c) / Math.LN10 * 10) / 10; });
            var hl = {}; hl[k] = 'cur';
            frames.push({ narr: narr, parts: [{ type: 'bars', label: 'log₁₀(work) — each step up is 10× more work', values: vals, idxLabels: names.slice(0, k + 1), texts: costs.slice(0, k + 1).map(fmtN), hl: hl }, { type: 'vars', vals: { N: fmtN(N), M: fmtN(M), memoryRows: fmtN(mem) } }] });
          };
          show(0, '<b>Plain nested loop</b>: N × M = ' + fmtN(nl) + ' comparisons. Only acceptable when both sides are tiny.');
          show(1, '<b>Index nested loop</b>: for each of N outer rows, one B-tree seek into M (~log₂M ≈ ' + Math.round(lg(M)) + ' steps) plus a fetch ≈ ' + fmtN(inl) + '. Needs an index on the inner join key. Cost depends on <b>N</b> (outer size), barely on M.');
          show(2, '<b>Hash join</b>: read both inputs once + build ' + fmtN(build) + ' entries ≈ ' + fmtN(hj) + '. ' + (batches > 1 ? H.c('r', 'Build side (' + fmtN(build) + ') > memory (' + fmtN(mem) + ') → ' + batches + ' batches spilled to disk, ~3× the I/O.') : H.c('g', 'Build side fits in memory — single pass.')));
          show(3, '<b>Merge join on unsorted input</b>: sort both (N log N + M log M) then one merge pass ≈ ' + fmtN(mjSort) + '.');
          show(4, '<b>Merge join on pre-sorted input</b> (both read from indexes on the key): just N + M ≈ ' + fmtN(mjPre) + '.');
          var best = 0; costs.forEach(function (c, i) { if (i < 4 && c < costs[best]) best = i; });
          var vals = costs.map(function (c) { return Math.round(Math.log(c) / Math.LN10 * 10) / 10; }), hl = {}; hl[best] = 'ok'; hl[4] = 'sel';
          frames.push({ narr: 'Verdict for unsorted inputs: <b>' + names[best] + '</b>. ' + (best === 1 ? 'Small outer side + index on the inner key: classic OLTP shape.' : best === 2 ? 'Big inputs, equality, no index needed — classic reporting shape.' : best === 3 ? 'Sorting is cheaper than spilling a huge hash table here.' : '') + ' If both inputs were already sorted, the pre-sorted merge (purple) is hard to beat. Try <code>10 1000000 100000</code> (tiny outer) or <code>3000000 2000000 100000</code> (two huge sides, small memory).', parts: [{ type: 'bars', label: 'log₁₀(work)', values: vals, idxLabels: names, texts: costs.map(fmtN), hl: hl }] });
          return frames;
        }
      }
    ],
    examples: [
      { title: 'Picking the algorithm from the scenario', html: `${H.table(['Scenario', 'Best join', 'Why'], [
  ['Show customer 42\'s orders with product names', 'Index nested loop', '1 outer row; PK/FK indexes on the inner sides'],
  ['Daily revenue per category over 50M order lines', 'Hash join', 'big × small (products), equality, no order needed; build products (small)'],
  ['Join two 500M-row tables both clustered by <code>order_id</code>', 'Merge join', 'already sorted → one pass, tiny memory'],
  ['Match each event to the session whose [start, end) contains it', 'Nested loop (or a range-join trick)', 'non-equi condition; hash and merge need equality'],
  ['Same as row 2, but the planner thinks products has 1 row and it has 2M', 'Plan goes wrong', 'build on the "small" side spills; or NLJ picked with 2M inner scans → fix stats']
])}` },
      { title: 'A range join can only be a nested loop', html: `<p>Bucket each order into a price band. The join condition is <code>total_cents &gt;= lo AND total_cents &lt; hi</code> — no equality, so no hash or merge join. SQLite scans the 3 bands (outer) and, for each, scans orders (inner): 3 × 3,000 = 9,000 checks — fine because the outer side is tiny. If the band table were large, an index on <code>orders(total_cents)</code> would turn each inner scan into a range seek.</p>`, code: { lang: 'sql', db: 'shop', code: `WITH bands(band, lo, hi) AS (
  VALUES ('small', 0, 5000), ('medium', 5000, 15000), ('large', 15000, 1000000)
)
SELECT b.band, count(*) AS orders
FROM orders o
JOIN bands b ON o.total_cents >= b.lo AND o.total_cents < b.hi
GROUP BY b.band
ORDER BY orders DESC;` } },
      { title: 'Build side matters: hash the small table, stream the big one', html: `<p>Hash joining <code>order_items</code> (6,000) with <code>products</code> (60): building on products needs 60 hash entries; building on order_items needs 6,000. Planners pick the smaller estimated input as the build side. If the estimate is wrong (say, after a filter the planner thinks leaves 10 rows but really leaves 10 million), the "small" build side overflows <code>work_mem</code> and spills into many batches. In PostgreSQL look for <code>Batches: 64  Memory Usage: …  Disk Usage: …</code> under the <code>Hash</code> node. Fixes: better statistics, a higher <code>work_mem</code> for that session (<code>SET LOCAL work_mem = '256MB'</code>), or pre-aggregating before the join.</p>` },
      { title: 'Why nested loops dominate OLTP (and LIMIT)', html: `<p>Index nested loop is the only algorithm that produces the <b>first row immediately</b> and does work proportional to the <b>outer</b> side. For <code>… ORDER BY o.created_at DESC LIMIT 20</code> SQLite walks <code>idx_orders_created</code> backwards and does a PK lookup into customers for each order — after 20 rows it stops. A hash join would have to read <i>all</i> of one side first. That's why PostgreSQL's cost has a <i>startup</i> part: with LIMIT, low startup cost wins.</p>`, code: { lang: 'sql', db: 'shop', code: `EXPLAIN QUERY PLAN
SELECT o.id, o.created_at, c.name
FROM orders o JOIN customers c ON c.id = o.customer_id
ORDER BY o.created_at DESC
LIMIT 20;
SELECT o.id, o.created_at, c.name
FROM orders o JOIN customers c ON c.id = o.customer_id
ORDER BY o.created_at DESC
LIMIT 3;` } }
    ],
    deepDive: `<h4>Variants you should be able to name</h4>
<ul>
<li><b>Block nested loop</b>: read a chunk of outer rows into a buffer and scan the inner once per chunk — cuts inner scans by the chunk size (MySQL's old BNL with <code>join_buffer_size</code>; removed in 8.0.20 in favour of hash join).</li>
<li><b>Batched key access / MRR</b> (MySQL): collect outer keys, sort them, then probe the inner index in key order to turn random I/O into sequential-ish I/O.</li>
<li><b>Grace / hybrid hash join</b>: partition both inputs by hash into P buckets on disk so each build partition fits in memory; hybrid keeps the first partition in RAM. PostgreSQL 11+ also has a <b>parallel</b> hash join with a shared hash table.</li>
<li><b>Semi- and anti-joins</b>: <code>EXISTS</code> / <code>NOT EXISTS</code> become <i>Hash Semi Join</i>, <i>Hash Anti Join</i>, <i>Merge Anti Join</i>, <i>Nested Loop Semi Join</i> — they stop at the first match per outer row.</li>
<li><b>Bloom filters / runtime filters</b>: build a small bit-array from the build side and push it down to the probe-side scan to drop non-matching rows early (SQLite's <code>BLOOM FILTER</code>, Spark/Trino dynamic filtering, ClickHouse, SQL Server bitmap filters).</li>
<li><b>Memoize</b> (PostgreSQL 14+): caches inner results of a parameterized nested loop when the same outer key repeats.</li>
<li><b>Adaptive join</b> (SQL Server): starts as a hash build; if the build side turns out tiny, switches to a nested loop.</li>
<li><b>Distributed joins</b>: <i>broadcast</i> the small side to every node, or <i>shuffle/repartition</i> both sides by the join key (Spark, BigQuery, Snowflake, CockroachDB). Data skew on the key creates hot partitions — salting is the standard fix.</li>
</ul>
<h4>Merge join with duplicates</h4><p>When both sides have runs of the same key, the engine marks the start of the inner run and rewinds to it for every outer duplicate. Output for one key = (outer run length × inner run length), so many-to-many joins can still explode — that's a property of the data, not the algorithm.</p>
<h4>Join order × algorithm</h4><p>The planner chooses join order and algorithm together. A left-deep plan of hash joins can pipeline probes through several hash tables built from small dimension tables (the classic star-schema plan); nested loops make the outer row count the key driver, so a bad cardinality estimate on the first table poisons everything above it.</p>`,
    aiEra: `<p><b>What AI changes:</b> Assistants can explain "why did Postgres choose a hash join here?" quickly, and some cloud warehouses now pick join strategies adaptively at run time, so you write fewer hints. Distributed engines (Spark AQE, Databricks, BigQuery) automatically switch shuffle joins to broadcast joins when a side turns out small.</p>
<p><b>Use AI as a partner:</b> paste the plan and ask "which side is the build side, does it spill, and what are the estimated vs actual row counts of the outer side of each nested loop?" — these are the three questions that explain 90% of bad joins.</p>
<p><b>Where AI goes wrong:</b> it says SQLite or old MySQL "uses a hash join" (they don't), tells you to "disable nested loops" globally (dangerous), or blames the algorithm when the real cause is a misestimate feeding it.</p>
<p><b>What you must still own:</b> simulating each algorithm on paper (interviewers ask you to), knowing their cost formulas and memory needs, and reasoning about which side should be outer/build.</p>`,
    problems: [
      {
        title: 'The join that built its own index', level: 'Medium', tags: ['nested loop', 'automatic index', 'join algorithms'], companies: ['Microsoft', 'Oracle', 'Zomato'],
        statement: `<p>Marketing asks: "which orders have a total exactly equal to some product's list price?"</p><pre>SELECT o.id, p.name
FROM orders o JOIN products p ON p.price_cents = o.total_cents;</pre><p>(1) Explain what SQLite does with and without <code>PRAGMA automatic_index</code>. (2) Count the comparisons of the plain nested loop. (3) Make the fast plan permanent so it doesn't rebuild a temporary index on every run.</p>`,
        constraints: `SQLite <code>shop</code>: orders = 3,000 rows, products = 60 rows; neither join column is indexed.`,
        example: `<p>Automatic index on: ${H.c('y', 'SCAN o → BLOOM FILTER ON p → SEARCH p USING AUTOMATIC COVERING INDEX (price_cents=?)')}. Off: ${H.c('r', 'SCAN o → SCAN p')} = 3,000 × 60 = <b>180,000</b> comparisons. Result: 9 matching orders (e.g. order 725 ↔ Product 48).</p>`,
        brute: { why: `<p>With no index, the only join SQLite can run is a plain nested loop: for each of the 3,000 orders, scan all 60 products — 180,000 comparisons. At 3M orders × 60K products that is 1.8×10<sup>11</sup> — hours. In PostgreSQL the planner would pick a hash join instead; SQLite has no hash join, so it compensates with an automatic index.</p>`, code: { lang: 'sql', db: 'shop', code: `PRAGMA automatic_index = OFF;   -- show the raw nested loop
EXPLAIN QUERY PLAN
SELECT o.id, p.name
FROM orders o JOIN products p ON p.price_cents = o.total_cents;
-- SCAN o
-- SCAN p          <- 60 rows scanned for EACH of 3,000 orders
SELECT count(*) AS matches
FROM orders o JOIN products p ON p.price_cents = o.total_cents;` } },
        mcq: { q: 'In PostgreSQL, with no indexes and 3,000 × 60 rows joined on equality, which algorithm would the planner most likely choose?', options: ['Plain nested loop', 'Hash join with products as the build side', 'Hash join with orders as the build side', 'Merge join without sorting'], answer: 1, explain: 'Equality + no index + small table → hash join, building the hash table on the smaller input (60 products) and probing with the 3,000 orders.' },
        hints: [`<p>Hint 1: Read the plan with automatic indexes ON — SQLite is building a temporary index on the <i>smaller</i> table each time the query runs. That's a hint about what a permanent fix would be.</p>`, `<p>Hint 2: An index on <code>products(price_cents)</code> turns each outer row's inner scan into a seek: index nested loop.</p>`, `<p>Hint 3: Bonus — include <code>name</code> in the index so the lookup is covering. Recipe: show the bad plan, create the index, show the new plan, run the query.</p>`],
        tests: { engine: 'sqlite', check: '(rows, cols, c) => {\n  if (c.plan || c.noplan) { const d = rows.map(r => r[r.length - 1]).join(\'\\n\'); return (!c.plan || new RegExp(c.plan).test(d)) && (!c.noplan || !new RegExp(c.noplan).test(d)); }\n  let a = rows, b = c.rows || [];\n  if (c.set) { const k = r => JSON.stringify(r); a = a.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); b = b.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); }\n  return a.length === b.length && a.every((r, i) => r.length === b[i].length && r.every((v, j) => v === b[i][j] || (typeof v === \'number\' && typeof b[i][j] === \'number\' && Math.abs(v - b[i][j]) < 1e-6)));\n}', cases: [
          { rows: [
              [725, 1775, 'Product 48'],
              [874, 1706, 'Product 11'],
              [955, 3145, 'Product 58'],
              [1104, 3076, 'Product 21'],
              [1334, 4446, 'Product 31'],
              [2518, 542, 'Product 39'],
              [2748, 1912, 'Product 49'],
              [2897, 1843, 'Product 12'],
              [2978, 3282, 'Product 59']
            ] },
          { rows: [], plan: 'SEARCH p USING COVERING INDEX idx_products_price \\(price_cents=\\?\\)', noplan: 'AUTOMATIC', after: 'EXPLAIN QUERY PLAN SELECT o.id, p.name FROM orders o JOIN products p ON p.price_cents = o.total_cents' },
          { setup: 'DELETE FROM products', after: 'SELECT count(*) FROM (SELECT o.id, o.total_cents, p.name FROM orders o JOIN products p ON p.price_cents = o.total_cents ORDER BY o.id)', rows: [
              [0]
            ] },
          { setup: 'INSERT INTO products VALUES (61,\'Product 61\',\'tech\',1775)', rows: [
              [725, 1775, 'Product 48'],
              [725, 1775, 'Product 61'],
              [874, 1706, 'Product 11'],
              [955, 3145, 'Product 58'],
              [1104, 3076, 'Product 21'],
              [1334, 4446, 'Product 31'],
              [2518, 542, 'Product 39'],
              [2748, 1912, 'Product 49'],
              [2897, 1843, 'Product 12'],
              [2978, 3282, 'Product 59']
            ], set: true },
          { setup: 'UPDATE orders SET total_cents = 336 WHERE id = 1', rows: [
              [1, 336, 'Product 1'],
              [725, 1775, 'Product 48'],
              [874, 1706, 'Product 11'],
              [955, 3145, 'Product 58'],
              [1104, 3076, 'Product 21'],
              [1334, 4446, 'Product 31'],
              [2518, 542, 'Product 39'],
              [2748, 1912, 'Product 49'],
              [2897, 1843, 'Product 12'],
              [2978, 3282, 'Product 59']
            ] },
          { setup: 'UPDATE products SET price_cents = price_cents + 100000', after: 'SELECT count(*) FROM (SELECT o.id, o.total_cents, p.name FROM orders o JOIN products p ON p.price_cents = o.total_cents ORDER BY o.id)', rows: [
              [0]
            ] },
          { setup: 'DELETE FROM orders WHERE id <> 725', rows: [
              [725, 1775, 'Product 48']
            ] },
          { after: 'SELECT count(*) FROM orders o, products p WHERE p.price_cents = o.total_cents', rows: [
              [9]
            ] }
        ] },
        solution: {
          approach: `<p>The plain nested loop is N × M. SQLite's automatic index is a runtime fix: it builds a temporary B-tree on <code>p(price_cents)</code> (60 entries) — conceptually the same as a hash join's build phase — plus a Bloom filter that rejects most orders without even touching that index. A permanent index on <code>products(price_cents, name)</code> gives an <b>index nested loop</b> with a covering lookup and avoids rebuilding the temporary index on every execution. Work becomes ~3,000 × (log₂60 ≈ 6) ≈ 18,000 steps instead of 180,000.</p>`,
          code: { lang: 'sql', db: 'shop', code: `CREATE INDEX idx_products_price ON products(price_cents, name);

EXPLAIN QUERY PLAN
SELECT o.id, p.name
FROM orders o JOIN products p ON p.price_cents = o.total_cents;
-- SCAN o
-- SEARCH p USING COVERING INDEX idx_products_price (price_cents=?)

SELECT o.id, o.total_cents, p.name
FROM orders o JOIN products p ON p.price_cents = o.total_cents
ORDER BY o.id;` },
          complexity: `<p>Plain NLJ: O(N·M) = 180,000. Index NLJ: O(N log M) ≈ 18,000. Hash join (PostgreSQL): O(N + M) ≈ 3,060 + 60 hash inserts, but needs memory and reads all of one side before the first row.</p>`,
          followUps: ['Which side should be the outer table here, and why does SQLite agree?', 'If products had 5M rows and orders 50, would you still want this index?']
        }
      }
    ]
  });

  /* =====================================================================
     TOPIC 5 — Statistics & cardinality estimation
     ===================================================================== */
  var HIST_DATA = [5, 5, 5, 5, 5, 5, 8, 12, 15, 18, 22, 25, 31, 36, 40, 44, 52, 60, 66, 71, 80, 88, 95, 99];

  topics.push({
    title: 'Statistics & Cardinality Estimation: How the Planner Guesses Row Counts',
    analogy: `<p>A wedding caterer must decide how much food to cook <b>before</b> the guests arrive. They use <b>statistics</b>: "250 invitations sent, usually 80% come, about 1 in 10 is vegetarian". Good numbers → right amount of food. Stale numbers (the guest list doubled last week) or misleading averages ("10% vegetarian" — but this is a yoga retreat where 90% are) → disaster.</p>
<p>The planner is that caterer. Before running anything it must <b>guess how many rows</b> each step will produce — the <b>cardinality</b>. Every cost, every join order and every join algorithm choice is built on these guesses.</p>`,
    explain: `<p><b>Statistics</b> are a small summary of each table and column, collected by <code>ANALYZE</code> (PostgreSQL, SQLite), <code>ANALYZE TABLE</code> (MySQL) or <code>UPDATE STATISTICS</code> / auto-stats (SQL Server). They usually come from a <b>sample</b>, not a full read.</p>
${H.table(['Statistic', 'Plain meaning', 'Used to estimate'], [
  ['row count, page count', 'How big is the table?', 'scan cost, everything'],
  ['<b>n_distinct</b> (NDV)', 'How many different values in the column?', '<code>col = ?</code> ≈ rows / NDV; GROUP BY output size; join size'],
  ['<b>MCV list</b> (most common values + frequencies)', '"delivered" = 59%, "pending" = 2% …', 'equality on frequent values — handles <b>skew</b>'],
  ['<b>histogram</b> (equi-depth bucket bounds)', 'Sorted values split into buckets with equal row counts', 'ranges: <code>&lt;</code>, <code>&gt;</code>, BETWEEN'],
  ['null fraction', '% of NULLs', '<code>IS NULL</code>, outer joins'],
  ['<b>correlation</b>', 'Is the table physically sorted by this column?', 'cost of index range scans (random vs sequential)']
])}
<p><b>The selectivity formulas</b> (selectivity = fraction of rows that pass):</p>
<ul>
<li><code>col = v</code>: if v is in the MCV list → its frequency; else (1 − sum of MCV freqs) ÷ (NDV − #MCVs).</li>
<li><code>col &lt; v</code>: fraction of histogram buckets below v (with linear interpolation inside the bucket).</li>
<li><code>A AND B</code>: sel(A) × sel(B) — the <b>independence assumption</b>.</li>
<li><code>A OR B</code>: sel(A) + sel(B) − sel(A)·sel(B).</li>
<li>Join <code>R.k = S.k</code>: |R| × |S| ÷ max(NDV(R.k), NDV(S.k)).</li>
<li>Something it can't analyse (a function on a column, a complex expression): a <b>default guess</b> — PostgreSQL uses 0.5% for <code>=</code> and 33% for ranges.</li>
</ul>
<p><b>Worked example on <code>orders</code> (3,000 rows):</b> NDV(status) = 4, so without an MCV list <code>status = 'pending'</code> is estimated at 3000 / 4 = <b>750</b> rows. Reality: <b>60</b>. That 12× error is exactly what SQLite's default <code>sqlite_stat1</code> gives you (it stores only averages), and it changes the join order of a query in the next viz. PostgreSQL's MCV list would know pending = 2% → 60.</p>
<p><b>Errors multiply.</b> If step 1 is 10× off and the join above it is 10× off, the top of the plan is 100× off. That's why estimate-vs-actual at the <i>lowest</i> wrong node is where you start fixing.</p>`,
    clues: [
      '"Fast on staging, slow on prod" or "slow right after the nightly bulk load" → stale / missing statistics; run ANALYZE',
      '"Estimated rows=1, actual rows=200,000" → misestimate; check stats age, skew, correlated columns, functions on columns',
      '"WHERE city = \'Mumbai\' AND state = \'MH\'" much more rows than estimated → correlated columns break independence; extended statistics',
      '"Query for today\'s rows is slow, yesterday\'s is fine" → ascending key / out-of-histogram-range problem',
      '"Same query, fast for one customer, terrible for the big customer" → skew + parameter sniffing / generic plans',
      '"How does the optimizer know how many rows a filter returns?" → statistics: NDV, MCV, histograms, selectivity math'
    ],
    code: [
      { lang: 'sql', db: 'shop', title: 'Collect statistics in SQLite and read them (▶ Run)', code: `-- No statistics yet: sqlite_stat1 doesn't even exist. Collect them:
ANALYZE;

-- One row per index: "rows  avg-rows-per-value-of-col1  avg-rows-per-(col1,col2) ..."
SELECT tbl, idx, stat FROM sqlite_stat1 ORDER BY tbl, idx;
-- orders | idx_orders_customer       | 3000 10     -> 3000 rows, ~10 per customer_id
-- orders | idx_orders_status_created | 3000 750 1  -> ~750 rows per status (an AVERAGE!), ~1 per (status, created_at)
-- customers | idx_customers_city     | 320 40      -> ~40 customers per city

-- The truth the average hides:
SELECT status, count(*) AS actual_rows FROM orders GROUP BY status ORDER BY actual_rows;` },
      { lang: 'sql', check: false, title: 'PostgreSQL: inspect and improve statistics', code: `-- What the planner knows about a column
SELECT null_frac, n_distinct, most_common_vals, most_common_freqs, histogram_bounds, correlation
FROM pg_stats
WHERE tablename = 'orders' AND attname = 'status';

-- When were stats last gathered?
SELECT relname, last_analyze, last_autoanalyze, n_mod_since_analyze
FROM pg_stat_user_tables WHERE relname = 'orders';

ANALYZE orders;                                              -- refresh now (e.g. after a bulk load)
ALTER TABLE orders ALTER COLUMN customer_id SET STATISTICS 1000;  -- bigger sample, more MCVs/buckets (default 100)

-- Correlated columns: teach the planner that city determines state
CREATE STATISTICS addr_dep (dependencies, ndistinct, mcv) ON city, state FROM addresses;
ANALYZE addresses;` }
    ],
    codeTitle: ['SQLite: ANALYZE + sqlite_stat1', 'PostgreSQL: pg_stats, targets, extended stats'],
    viz: [
      {
        title: 'Estimate a predicate from an MCV list + equi-depth histogram',
        input: '< 37',
        inputLabel: 'predicate on x: "< 37", "> 80", "= 5", "= 44"',
        gen: function (input) {
          var m = String(input || '').trim().match(/^(<=|>=|<|>|=)\s*(-?\d+(\.\d+)?)$/);
          if (!m) throw new Error('Type an operator and a number, e.g.  < 37   or   = 5');
          var op = m[1], opH = H.esc(m[1]), v = Number(m[2]), data = HIST_DATA.slice(), N = data.length, frames = [];
          var test = function (x) { return op === '<' ? x < v : op === '<=' ? x <= v : op === '>' ? x > v : op === '>=' ? x >= v : x === v; };
          frames.push({ narr: 'Column <b>x</b> has ' + N + ' rows. ANALYZE reads them (or a sample) once and keeps a <b>tiny summary</b> — the planner never looks at the real rows when estimating.', parts: [{ type: 'array', label: 'x (sorted, all ' + N + ' rows)', values: data }] });
          var mcvHl = {}; data.forEach(function (x, i) { if (x === 5) mcvHl[i] = 'sel'; });
          frames.push({ narr: 'Step 1 — <b>MCV list</b>: values that are much more common than average are stored with their exact frequency. Here <b>5</b> appears 6/24 = <b>25%</b> of rows. (A plain "rows ÷ distinct values" average would say every value appears ~1.3 times — badly wrong for 5.)', parts: [{ type: 'array', label: 'x', values: data, hl: mcvHl }, { type: 'map', label: 'MCV list', entries: [['5', '0.25']] , hl: { '5': 'sel' } }] });
          var rest = data.filter(function (x) { return x !== 5; });
          var b = [rest.slice(0, 6), rest.slice(6, 12), rest.slice(12, 18)];
          var bounds = [b[0][0], b[1][0], b[2][0], b[2][5]];
          var bh = {}; rest.forEach(function (x, i) { bh[i] = ['win', 'ok', 'cur'][Math.floor(i / 6)]; });
          frames.push({ narr: 'Step 2 — <b>equi-depth histogram</b> on the remaining 18 rows (75% of the table): 3 buckets with the <b>same number of rows</b> (6) each. Only the bucket <b>bounds</b> are stored: ' + bounds.join(' | ') + '. Narrow buckets = dense values; wide buckets = sparse values.', parts: [{ type: 'array', label: 'non-MCV values, colored by bucket', values: rest, hl: bh }, { type: 'bars', label: 'rows per bucket (equal by design)', values: [6, 6, 6], idxLabels: [b[0][0] + '–' + b[0][5], b[1][0] + '–' + b[1][5], b[2][0] + '–' + b[2][5]] }] });
          var mcvPart = test(5) ? 0.25 : 0, histPart = 0, why = [];
          if (op === '=') {
            if (v === 5) { mcvPart = 0.25; why.push('5 is in the MCV list → use its stored frequency 0.25'); }
            else { histPart = 0.75 / 18; why.push(v + ' is not an MCV → (1 − 0.25) ÷ 18 distinct non-MCV values = ' + histPart.toFixed(4)); }
          } else {
            why.push('MCV part: does 5 satisfy "x ' + opH + ' ' + v + '"? ' + (test(5) ? 'yes → +0.25' : 'no → +0'));
            b.forEach(function (bk, i) {
              var lo = bk[0], hi = bk[5], f;
              var less = op === '<' || op === '<=';
              if (less) f = v <= lo ? 0 : v > hi ? 1 : (v - lo) / (hi - lo);
              else f = v >= hi ? 0 : v < lo ? 1 : (hi - v) / (hi - lo);
              f = Math.max(0, Math.min(1, f));
              histPart += 0.75 * f / 3;
              why.push('bucket ' + lo + '–' + hi + ': ' + (f === 0 ? 'none qualifies' : f === 1 ? 'fully qualifies' : 'partly — interpolate (' + (less ? v + ' − ' + lo : hi + ' − ' + v) + ') ÷ (' + hi + ' − ' + lo + ') = ' + f.toFixed(2)) + ' → +' + (0.75 * f / 3).toFixed(3));
            });
          }
          var sel = mcvPart + histPart, est = sel * N;
          frames.push({ narr: 'Step 3 — <b>estimate</b> <code>x ' + opH + ' ' + v + '</code> using only the summary: MCV part + histogram part.', parts: [{ type: 'text', label: 'selectivity math', html: '<ul><li>' + why.join('</li><li>') + '</li></ul>' }, { type: 'vars', vals: { selectivity: sel.toFixed(3), 'estimated rows': est.toFixed(1) }, hl: { 'estimated rows': 'cur' } }] });
          var act = data.filter(test).length, ah = {}; data.forEach(function (x, i) { if (test(x)) ah[i] = 'ok'; });
          var err = act === 0 && est < 1 ? 'both ≈ 0' : (Math.max(act, est) / Math.max(0.1, Math.min(act, est))).toFixed(2) + '×';
          frames.push({ narr: 'Step 4 — <b>reality check</b> (EXPLAIN ANALYZE does this): actually ' + act + ' row(s) match; estimate ' + est.toFixed(1) + ' (error ' + err + '). Histograms are usually within a small factor for single-column predicates. The big errors come from <b>stale</b> stats, <b>correlated</b> predicates (AND multiplies) and <b>functions</b> on columns (no stats at all).', parts: [{ type: 'array', label: 'rows that really match', values: data, hl: ah }, { type: 'bars', label: 'estimate vs actual', values: [Math.round(est * 10) / 10, act], idxLabels: ['estimated', 'actual'], hl: { 0: 'cur', 1: 'ok' } }] });
          frames.push({ narr: 'Try <code>= 44</code> (non-MCV, estimate ≈ 1), <code>= 5</code> (MCV, exact), <code>&gt; 99</code> (past the last bound → estimate ≈ 0: that is the <b>ascending-key problem</b> when new rows arrive after the last ANALYZE).', parts: [{ type: 'set', label: 'stats stored for column x', items: ['n_distinct = 19', 'MCV: {5: 0.25}', 'bounds: ' + bounds.join(', '), 'null_frac = 0'] }] });
          return frames;
        }
      },
      {
        title: 'Averages lie: how a skewed column flips the join order',
        input: '60',
        inputLabel: 'real number of pending orders (stats assume 750)',
        gen: function (input) {
          var P = parseInt(String(input).trim(), 10);
          if (isNaN(P) || P < 1 || P > 3000) throw new Error('Enter the real pending count, 1–3000');
          var frames = [], delhi = 40, perCust = 10;
          var costA = delhi + delhi * perCust;      // city index entries + orders of those customers, checked for status
          var costB = P + P;                        // pending index entries + one PK lookup each
          var estB = 750 + 750;
          var qg = function (hl, ehl, tags) { return { type: 'graph', label: 'two candidate plans', directed: true, height: 50, nodes: [{ id: 'C', label: 'customers via city', x: 14, y: 12, shape: 'box' }, { id: 'O', label: 'orders via customer_id', x: 50, y: 12, shape: 'box' }, { id: 'O2', label: 'orders via status', x: 14, y: 38, shape: 'box' }, { id: 'C2', label: 'customers via PK', x: 50, y: 38, shape: 'box' }, { id: 'R', label: 'result', x: 86, y: 25, shape: 'box' }], edges: [['C', 'O', 'A'], ['O', 'R'], ['O2', 'C2', 'B'], ['C2', 'R']], hl: hl || {}, ehl: ehl || {}, tags: tags || {} }; };
          frames.push({ narr: 'Query: Delhi customers\' <b>pending</b> orders. Two sensible plans: <b>A</b> start from the 40 Delhi customers, then read their orders and keep pending ones; <b>B</b> start from pending orders, then look up each customer and keep Delhi ones.', parts: [qg(), { type: 'code', label: 'query', lang: 'sql', code: "SELECT c.name, o.id\nFROM customers c JOIN orders o ON o.customer_id = c.id\nWHERE c.city = 'Delhi' AND o.status = 'pending';" }] });
          frames.push({ narr: 'After <code>ANALYZE</code>, SQLite\'s <code>sqlite_stat1</code> says status has ~<b>750 rows per value</b> (3000 ÷ 4). It has no idea that "pending" is rare — it only stores averages.', parts: [{ type: 'table', label: 'sqlite_stat1 (excerpt)', columns: ['idx', 'stat', 'meaning'], rows: [['idx_orders_status_created', '3000 750 1', '~750 rows per status'], ['idx_orders_customer', '3000 10', '~10 orders per customer'], ['idx_customers_city', '320 40', '~40 customers per city']], hl: { 0: 'bad' } }] });
          frames.push({ narr: 'Planner\'s <b>estimate</b>: plan A ≈ 40 + 40×10 = ' + (40 + 400) + ' row touches; plan B ≈ 750 + 750 = ' + estB + '. It picks <b>A</b>.', parts: [qg({ C: 'ok', O: 'ok', O2: 'bad', C2: 'bad' }, { 'C-O': 'ok' }, { C: 'chosen' }), { type: 'bars', label: 'ESTIMATED work', values: [440, estB], idxLabels: ['plan A', 'plan B'], hl: { 0: 'ok' } }] });
          var winner = costA <= costB ? 'A' : 'B';
          frames.push({ narr: '<b>Reality</b> with ' + P + ' pending orders: plan A really costs ' + delhi + ' + ' + (delhi * perCust) + ' = ' + costA + '; plan B would cost ' + P + ' + ' + P + ' = ' + costB + '. ' + (winner === 'B' ? H.c('r', 'The planner chose the slower plan — ' + (costA / costB).toFixed(1) + '× more work — because the average (750) hid the skew.') : H.c('g', 'Here the average was close enough; plan A really is best.')), parts: [qg({ C: winner === 'A' ? 'ok' : 'bad', O2: winner === 'B' ? 'ok' : 'cur' }), { type: 'bars', label: 'ACTUAL work', values: [costA, costB], idxLabels: ['plan A (chosen)', 'plan B'], hl: winner === 'B' ? { 1: 'ok', 0: 'bad' } : { 0: 'ok' } }] });
          frames.push({ narr: 'Crossover: plan B wins whenever pending &lt; ' + Math.floor(costA / 2) + ' rows. At 3,000,000 orders with 0.1% pending, the gap becomes thousands of times. Fixes, from best to last resort: (1) stats that see skew — PostgreSQL MCV lists, SQLite <code>sqlite_stat4</code> builds, MySQL histograms; (2) a <b>partial index</b> <code>ON orders(…) WHERE status = \'pending\'</code> (its own stats say "60 rows"); (3) SQLite <code>likelihood(o.status = \'pending\', 0.02)</code>; (4) hints / plan forcing.', parts: [{ type: 'bars', label: 'actual work as pending count grows', values: [costA, 2 * 60, 2 * 220, 2 * 750], idxLabels: ['plan A (any)', 'B @60', 'B @220', 'B @750'], hl: { 1: 'ok', 3: 'bad' } }] });
          return frames;
        }
      }
    ],
    examples: [
      { title: 'Watch statistics change the join order (SQLite)', html: `<p>Before <code>ANALYZE</code>, SQLite's built-in guesses make it start from <code>orders</code> via the status index (which happens to be the better plan here). After <code>ANALYZE</code> it believes "750 pending orders" and starts from customers instead. Hand-editing <code>sqlite_stat1</code> to say "60 rows per status" (then <code>ANALYZE sqlite_schema</code> to reload) flips it back — proof that the plan is driven by the numbers, not the SQL text.</p>`, code: { lang: 'sql', db: 'shop', code: `EXPLAIN QUERY PLAN
SELECT c.name, o.id FROM customers c JOIN orders o ON o.customer_id = c.id
WHERE c.city = 'Delhi' AND o.status = 'pending';          -- no stats: starts from orders

ANALYZE;
EXPLAIN QUERY PLAN
SELECT c.name, o.id FROM customers c JOIN orders o ON o.customer_id = c.id
WHERE c.city = 'Delhi' AND o.status = 'pending';          -- avg stats: starts from customers

UPDATE sqlite_stat1 SET stat = '3000 60 1' WHERE idx = 'idx_orders_status_created';
ANALYZE sqlite_schema;                                    -- reload the edited stats
EXPLAIN QUERY PLAN
SELECT c.name, o.id FROM customers c JOIN orders o ON o.customer_id = c.id
WHERE c.city = 'Delhi' AND o.status = 'pending';          -- "rare status": starts from orders again` } },
      { title: 'Correlated columns: the independence assumption breaks', html: `<p>Table <code>addresses</code> with 1,000,000 rows, 100 cities, 30 states. <code>WHERE city = 'Pune' AND state = 'MH'</code>:</p>${H.table(['', 'value'], [['sel(city = Pune)', '1/100 = 0.01'], ['sel(state = MH)', '1/30 ≈ 0.033'], ['estimate (independent)', '1,000,000 × 0.01 × 0.033 = <b>333</b>'], ['actual (Pune is always in MH)', H.c('r', '<b>10,000</b> — 30× more')]])}<p>The planner may now choose a nested loop expecting 333 outer rows and get 10,000. PostgreSQL fix: <code>CREATE STATISTICS … (dependencies) ON city, state</code>; Oracle: column groups; SQL Server: multi-column statistics.</p>` },
      { title: 'Functions on columns have no statistics', html: `<p><code>WHERE date(created_at) = '2026-09-01'</code>: the planner has stats for <code>created_at</code>, not for <code>date(created_at)</code>. PostgreSQL falls back to a fixed guess (0.5% for equality) — on 3,000 rows it estimates 15; on a table where 30% of rows share that day it is badly wrong. Fixes: write the predicate as a range on the raw column (topic 6), or create an <b>expression index</b> <code>ON orders ((created_at::date))</code> — PostgreSQL collects statistics for indexed expressions after ANALYZE (and PG 14+ allows <code>CREATE STATISTICS</code> on expressions without an index).</p>` },
      { title: 'The ascending-key problem', html: `<p>Stats were gathered at midnight; the histogram's top bound is <code>created_at = 2026-10-13 23:59</code>. At 11 am a dashboard asks for <code>created_at &gt;= '2026-10-14'</code>. According to the histogram, <b>zero</b> rows are that new, so the estimate is ~1 — and the planner picks a nested loop that runs 50,000 times. PostgreSQL mitigates this by probing the real index min/max for out-of-range values; SQL Server 2014+ uses a newer cardinality estimator model; elsewhere the fix is more frequent ANALYZE on hot, append-only tables (lower <code>autovacuum_analyze_scale_factor</code> for that table).</p>`, code: { lang: 'sql', check: false, code: `-- PostgreSQL: analyze this hot table after every ~1% change instead of 10%
ALTER TABLE orders SET (autovacuum_analyze_scale_factor = 0.01,
                        autovacuum_analyze_threshold = 1000);` } }
    ],
    deepDive: `<h4>How each engine stores and refreshes stats</h4>
<ul>
<li><b>PostgreSQL</b>: <code>ANALYZE</code> samples 300 × <code>default_statistics_target</code> (100) = 30,000 rows; keeps up to 100 MCVs and 100 histogram buckets per column in <code>pg_statistic</code> (view: <code>pg_stats</code>). Autovacuum's auto-analyze fires after 50 rows + 10% of the table change. Extended statistics (PG 10+): <i>ndistinct</i> and <i>dependencies</i> for column groups, <i>mcv</i> lists across columns (PG 12+), expressions (PG 14+). PG 18 keeps planner statistics across <code>pg_upgrade</code>.</li>
<li><b>MySQL InnoDB</b>: persistent index stats sampled from 20 random leaf pages per index (<code>innodb_stats_persistent_sample_pages</code>), auto-recalculated after ~10% of rows change. Column <b>histograms</b> (singleton or equi-height) only when you run <code>ANALYZE TABLE t UPDATE HISTOGRAM ON col WITH 64 BUCKETS</code> — not automatic. Equality on indexed columns may use <i>index dives</i> (actually probing the index) instead of stats, up to <code>eq_range_index_dive_limit</code>.</li>
<li><b>SQL Server</b>: per-statistics object a 200-step histogram + density vector; auto-create and auto-update (threshold ~√(1000·n) for big tables since 2016). Cardinality Estimator 120+ assumes partial correlation ("exponential backoff") instead of full independence.</li>
<li><b>SQLite</b>: <code>sqlite_stat1</code> stores only averages per index prefix; <code>sqlite_stat4</code> (compile-time option) stores sample rows for skew; <code>PRAGMA optimize</code> (recommended on connection close or periodically) runs ANALYZE only where it seems needed; <code>likelihood()</code>, <code>unlikely()</code>, <code>likely()</code> are per-query hints.</li>
</ul>
<h4>Why estimation is fundamentally hard</h4>
<p>Join estimation compounds errors: studies of real optimizers (e.g. the 2015 "How Good Are Query Optimizers, Really?" paper on the Join Order Benchmark) showed estimates off by 10<sup>3</sup>–10<sup>6</sup> for multi-join queries, almost always <b>under</b>-estimates, because independence and uniformity assumptions fail on real, correlated data. The practical defences: keep stats fresh, add extended stats where columns are correlated, prefer plans robust to misestimates (hash joins degrade more gracefully than nested loops), and use adaptive execution where available.</p>
<h4>Parameters and plan caching</h4><p>A prepared statement planned for <code>status = $1</code> must work for both "pending" (2%) and "delivered" (59%). SQL Server's parameter sniffing reuses the first value's plan; PostgreSQL's generic plan uses average selectivity. Fixes: recompile hints, <code>plan_cache_mode</code>, separate queries for known-skewed values, or Query Store / <code>pg_hint_plan</code> plan pinning.</p>`,
    aiEra: `<p><b>What AI changes:</b> Learned cardinality estimation is an active research area (MSCN, NeuroCard, DeepDB, and learned "steering" like Bao); cloud vendors add ML-based auto-tuning that watches estimate errors and creates statistics or indexes automatically (Azure SQL automatic tuning, Oracle Autonomous Database). Day-to-day, an assistant can scan an EXPLAIN ANALYZE and list every node whose estimate is off by more than 10×.</p>
<p><b>Use AI as a partner:</b> "Here are pg_stats rows for orders.status and orders.customer_id and this plan. Which estimates are wrong, and would an MCV list, a higher statistics target, or CREATE STATISTICS fix it?" Then run ANALYZE and compare.</p>
<p><b>Where AI goes wrong:</b> it confidently guesses data distributions it has never seen, suggests "just add an index" when the real fix is fresher statistics, or proposes hints that freeze a plan that is only right for today's data.</p>
<p><b>What you must still own:</b> the selectivity math (MCV / histogram / independence), the habit of checking estimate vs actual at the lowest wrong node, and knowing when stats were last gathered.</p>`,
    problems: [
      {
        title: 'ANALYZE made it slower — fix the skew', level: 'Hard', tags: ['statistics', 'skew', 'partial index', 'likelihood'], companies: ['Google', 'Atlassian', 'Razorpay'],
        statement: `<p>After someone ran <code>ANALYZE</code>, the "Delhi pending orders" query starts from the 40 Delhi customers and reads ~380 of their orders to find the 20 pending ones, instead of starting from the 60 pending orders. Explain <b>why</b> the statistics misled the planner, and give a fix that makes the planner choose the "pending first" plan <b>while statistics stay enabled</b>.</p><pre>SELECT c.name, o.id, o.total_cents
FROM customers c JOIN orders o ON o.customer_id = c.id
WHERE c.city = 'Delhi' AND o.status = 'pending';</pre>`,
        constraints: `SQLite <code>shop</code>; keep ANALYZE statistics; don't delete indexes; the result (20 rows) must not change.`,
        example: `<p>After ANALYZE: ${H.c('r', 'SEARCH c USING INDEX idx_customers_city (city=?)')} → ${H.c('r', 'SEARCH o USING INDEX idx_orders_customer (customer_id=?)')}. Target: ${H.c('g', 'SEARCH o USING INDEX idx_orders_status_created (status=?)')} → ${H.c('g', 'SEARCH c USING INTEGER PRIMARY KEY (rowid=?)')}.</p>`,
        brute: { why: `<p>The tempting "fix" is to delete the statistics (<code>DROP TABLE sqlite_stat1</code>) or force the plan with <code>INDEXED BY</code> / <code>CROSS JOIN</code>. Both freeze behaviour forever: when "pending" stops being rare (a payment outage queues 50% of orders), the forced plan becomes the slow one. The root cause — the stats only know the <i>average</i> rows per status (750), not that pending is 60 — remains.</p>`, code: { lang: 'sql', db: 'shop', code: `ANALYZE;
SELECT idx, stat FROM sqlite_stat1 WHERE idx = 'idx_orders_status_created';  -- 3000 750 1
EXPLAIN QUERY PLAN
SELECT c.name, o.id, o.total_cents
FROM customers c JOIN orders o ON o.customer_id = c.id
WHERE c.city = 'Delhi' AND o.status = 'pending';
-- starts from customers: the "750 pending" average made orders-first look expensive` } },
        mcq: { q: 'Why does sqlite_stat1 lead the planner astray for status = \'pending\'?', options: ['It stores only the average rows per distinct status (3000/4 = 750), hiding the skew', 'It is out of date', 'It does not cover the status column', 'SQLite ignores statistics for TEXT columns'], answer: 0, explain: 'stat1 keeps averages per index prefix. With 4 statuses it assumes 750 rows each, but pending has 60 and delivered 1,760. PostgreSQL would use an MCV list; SQLite needs stat4, a partial index, or a likelihood() hint.' },
        hints: [`<p>Hint 1: Compare <code>sqlite_stat1</code>'s 750 with <code>SELECT status, count(*) … GROUP BY status</code>. The stats aren't stale — they're <i>averages</i>.</p>`, `<p>Hint 2: Give the planner a structure whose own statistics describe only pending rows: a <b>partial index</b> <code>… WHERE status = 'pending'</code>. After ANALYZE its stat row says "60".</p>`, `<p>Hint 3: Query-level alternative: wrap the predicate in <code>likelihood(o.status = 'pending', 0.02)</code>. Recipe: ANALYZE → show bad plan → add partial index → ANALYZE → show good plan → run query.</p>`],
        tests: { engine: 'sqlite', check: '(rows, cols, c) => {\n  if (c.plan || c.noplan) { const d = rows.map(r => r[r.length - 1]).join(\'\\n\'); return (!c.plan || new RegExp(c.plan).test(d)) && (!c.noplan || !new RegExp(c.noplan).test(d)); }\n  let a = rows, b = c.rows || [];\n  if (c.set) { const k = r => JSON.stringify(r); a = a.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); b = b.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); }\n  return a.length === b.length && a.every((r, i) => r.length === b[i].length && r.every((v, j) => v === b[i][j] || (typeof v === \'number\' && typeof b[i][j] === \'number\' && Math.abs(v - b[i][j]) < 1e-6)));\n}', cases: [
          { rows: [
              ['User 201', 200, 4300],
              ['User 1', 300, 16200],
              ['User 201', 500, 20000],
              ['User 1', 600, 11900],
              ['User 201', 800, 15700],
              ['User 1', 900, 7600],
              ['User 201', 1100, 11400],
              ['User 1', 1200, 3300],
              ['User 201', 1400, 7100],
              ['User 1', 1500, 19000],
              ['User 201', 1700, 2800],
              ['User 1', 1800, 14700],
              ['User 201', 2000, 18500],
              ['User 1', 2100, 10400],
              ['User 201', 2300, 14200],
              ['User 1', 2400, 6100],
              ['User 201', 2600, 9900],
              ['User 1', 2700, 1800],
              ['User 201', 2900, 5600],
              ['User 1', 3000, 17500]
            ] },
          { after: 'SELECT idx, stat FROM sqlite_stat1 WHERE tbl = \'orders\' AND idx = \'idx_orders_pending\'', rows: [
              ['idx_orders_pending', '60 10']
            ] },
          { rows: [], plan: 'SEARCH o USING INDEX idx_orders_(status_created|pending)', noplan: 'SCAN', after: 'EXPLAIN QUERY PLAN SELECT c.name, o.id, o.total_cents FROM customers c JOIN orders o ON o.customer_id = c.id WHERE c.city = \'Delhi\' AND o.status = \'pending\'' },
          { setup: 'UPDATE orders SET status = \'shipped\' WHERE status = \'pending\'', after: 'SELECT count(*) FROM (SELECT c.name, o.id, o.total_cents FROM customers c JOIN orders o ON o.customer_id = c.id WHERE c.city = \'Delhi\' AND o.status = \'pending\')', rows: [
              [0]
            ] },
          { setup: 'UPDATE customers SET city = \'Delhi\' WHERE id = 51', rows: [
              ['User 51', 50, 16450],
              ['User 201', 200, 4300],
              ['User 1', 300, 16200],
              ['User 51', 350, 12150],
              ['User 201', 500, 20000],
              ['User 1', 600, 11900],
              ['User 51', 650, 7850],
              ['User 201', 800, 15700],
              ['User 1', 900, 7600],
              ['User 51', 950, 3550],
              ['User 201', 1100, 11400],
              ['User 1', 1200, 3300],
              ['User 51', 1250, 19250],
              ['User 201', 1400, 7100],
              ['User 1', 1500, 19000],
              ['User 51', 1550, 14950],
              ['User 201', 1700, 2800],
              ['User 1', 1800, 14700],
              ['User 51', 1850, 10650],
              ['User 201', 2000, 18500],
              ['User 1', 2100, 10400],
              ['User 51', 2150, 6350],
              ['User 201', 2300, 14200],
              ['User 1', 2400, 6100],
              ['User 51', 2450, 2050],
              ['User 201', 2600, 9900],
              ['User 1', 2700, 1800],
              ['User 51', 2750, 17750],
              ['User 201', 2900, 5600],
              ['User 1', 3000, 17500]
            ] },
          { setup: 'DELETE FROM customers WHERE city = \'Delhi\'', after: 'SELECT count(*) FROM (SELECT c.name, o.id, o.total_cents FROM customers c JOIN orders o ON o.customer_id = c.id WHERE c.city = \'Delhi\' AND o.status = \'pending\')', rows: [
              [0]
            ] },
          { setup: 'INSERT INTO orders VALUES (9001,9,\'pending\',\'2026-01-01 00:00:00\',1234)', rows: [
              ['User 201', 200, 4300],
              ['User 1', 300, 16200],
              ['User 201', 500, 20000],
              ['User 1', 600, 11900],
              ['User 201', 800, 15700],
              ['User 1', 900, 7600],
              ['User 201', 1100, 11400],
              ['User 1', 1200, 3300],
              ['User 201', 1400, 7100],
              ['User 1', 1500, 19000],
              ['User 201', 1700, 2800],
              ['User 1', 1800, 14700],
              ['User 201', 2000, 18500],
              ['User 1', 2100, 10400],
              ['User 201', 2300, 14200],
              ['User 1', 2400, 6100],
              ['User 201', 2600, 9900],
              ['User 1', 2700, 1800],
              ['User 201', 2900, 5600],
              ['User 1', 3000, 17500],
              ['User 9', 9001, 1234]
            ] },
          { after: 'SELECT count(*) FROM orders WHERE status = \'pending\'', rows: [
              [60]
            ] }
        ] },
        solution: {
          approach: `<p>SQLite's default statistics are <b>averages</b>, so every status looks like 750 rows. Creating a <b>partial index</b> that contains only pending orders gives the planner a second, precise statistic: after <code>ANALYZE</code>, <code>sqlite_stat1</code> has a row <code>idx_orders_pending | 60 10</code>. Knowing pending is rare, the planner now starts from pending orders and does 60 primary-key lookups into customers. Bonus: the partial index is tiny (60 entries) and is also the fastest way to drive "pending orders" queue screens. Query-level alternative: <code>likelihood(o.status = 'pending', 0.02)</code>. In PostgreSQL neither is needed — its MCV list already records that pending ≈ 2%.</p>`,
          code: { lang: 'sql', db: 'shop', code: `CREATE INDEX idx_orders_pending ON orders(customer_id) WHERE status = 'pending';
ANALYZE;
SELECT idx, stat FROM sqlite_stat1 WHERE tbl = 'orders' ORDER BY idx;   -- idx_orders_pending | 60 10

EXPLAIN QUERY PLAN
SELECT c.name, o.id, o.total_cents
FROM customers c JOIN orders o ON o.customer_id = c.id
WHERE c.city = 'Delhi' AND o.status = 'pending';
-- SEARCH o USING INDEX idx_orders_status_created (status=?)
-- SEARCH c USING INTEGER PRIMARY KEY (rowid=?)

-- Query-level alternative (no schema change):
EXPLAIN QUERY PLAN
SELECT c.name, o.id, o.total_cents
FROM customers c JOIN orders o ON o.customer_id = c.id
WHERE c.city = 'Delhi' AND likelihood(o.status = 'pending', 0.02);

SELECT c.name, o.id, o.total_cents
FROM customers c JOIN orders o ON o.customer_id = c.id
WHERE c.city = 'Delhi' AND o.status = 'pending'
ORDER BY o.id;` },
          complexity: `<p>Customers-first: 40 index entries + ~380 order rows read and filtered. Pending-first: 60 index entries + 60 PK lookups ≈ 120 row touches → ~3.5× less work here, and the gap grows with table size (0.1% pending of 3M orders → ~6,000 vs ~38,000+ touches per city).</p>`,
          followUps: ['How would PostgreSQL estimate <code>status = \'pending\'</code> on the same data?', 'What breaks if "pending" suddenly becomes 50% of rows during an outage, for each fix?']
        }
      }
    ]
  });

  /* =====================================================================
     TOPIC 6 — Sargable predicates
     ===================================================================== */
  var IDX_DATES = ['2025-01-14 09:10', '2025-02-02 18:45', '2025-02-27 07:30', '2025-03-01 00:05', '2025-03-05 10:00', '2025-03-05 22:40', '2025-03-19 13:15', '2025-03-31 23:59', '2025-04-01 00:00', '2025-04-12 16:20', '2025-05-09 11:11', '2025-06-30 20:00'];
  function sargRules(p) {
    var rules = [], q = String(p);
    var fn = q.match(/\b([a-z_]\w*)\s*\(\s*(?:'[^']*'\s*,\s*)?([a-z_]\w*(?:\.\w+)?)\s*(?:,[^)]*)?\)\s*(=|<=|>=|<>|!=|<|>|\blike\b|\bbetween\b|\bin\b)/i);
    rules.push({ name: 'No function wraps the column', bad: !!(fn && !/^(count|sum|avg|min|max)$/i.test(fn[1])), why: fn ? '<code>' + H.esc(fn[1]) + '(' + H.esc(fn[2]) + ')</code> must be computed for every row before comparing — the index stores <code>' + H.esc(fn[2]) + '</code>, not <code>' + H.esc(fn[1]) + '(…)</code>.' : '' });
    var ar = q.match(/\b([a-z_]\w*(?:\.\w+)?)\s*([-+*\/])\s*(\d+(?:\.\d+)?)\s*(=|<=|>=|<|>)\s*(\d+(?:\.\d+)?)/i);
    rules.push({ name: 'No arithmetic on the column', bad: !!ar, why: ar ? 'The column is inside <code>' + H.esc(ar[1] + ' ' + ar[2] + ' ' + ar[3]) + '</code>; move the arithmetic to the constant side.' : '' });
    var lk = /\blike\s*'%/i.test(q);
    rules.push({ name: 'No leading wildcard in LIKE', bad: lk, why: lk ? 'A pattern starting with <code>%</code> can match anywhere, so there is no "first key" to seek to in a sorted index.' : '' });
    var ng = /(<>|!=|\bnot\s+(in|like|between)\b)/i.test(q);
    rules.push({ name: 'Not a negation (&lt;&gt;, NOT IN, NOT LIKE)', bad: ng, why: ng ? 'Negations match "everything except", usually most rows — even if technically seekable as two ranges, a scan is normally cheaper.' : '' });
    var orx = /\bor\b/i.test(q);
    rules.push({ name: 'No OR across different columns', bad: orx, why: orx ? 'One B-tree is sorted by one column; an OR over two columns needs two index lookups merged (MULTI-INDEX OR / BitmapOr / UNION ALL) or a scan.' : '' });
    return { rules: rules, fn: fn, ar: ar };
  }
  function sargFix(p, r) {
    var q = String(p), m;
    if ((m = q.match(/strftime\(\s*'%Y-%m'\s*,\s*(\w+)\s*\)\s*=\s*'(\d{4})-(\d{2})'/i))) { var y = +m[2], mo = +m[3], ny = mo === 12 ? y + 1 : y, nm = mo === 12 ? 1 : mo + 1; return m[1] + " >= '" + m[2] + '-' + m[3] + "-01' AND " + m[1] + " < '" + ny + '-' + (nm < 10 ? '0' : '') + nm + "-01'"; }
    if ((m = q.match(/strftime\(\s*'%Y'\s*,\s*(\w+)\s*\)\s*=\s*'(\d{4})'/i))) return m[1] + " >= '" + m[2] + "-01-01' AND " + m[1] + " < '" + (+m[2] + 1) + "-01-01'";
    if ((m = q.match(/date\(\s*(\w+)\s*\)\s*=\s*'(\d{4}-\d{2}-\d{2})'/i))) return m[1] + " >= '" + m[2] + "' AND " + m[1] + " < date('" + m[2] + "', '+1 day')";
    if ((m = q.match(/julianday\(\s*'now'\s*\)\s*-\s*julianday\(\s*(\w+)\s*\)\s*(<|<=)\s*(\d+)/i))) return m[1] + " >= datetime('now', '-" + m[3] + " days')";
    if ((m = q.match(/(lower|upper)\(\s*(\w+)\s*\)\s*=\s*('[^']*')/i))) return 'keep the predicate and add an expression index: CREATE INDEX … ON t(' + m[1].toLowerCase() + '(' + m[2] + ')) — or store the value normalised';
    if (r.ar) { var c = Number(r.ar[5]), k = Number(r.ar[3]), o = r.ar[2], v = o === '+' ? c - k : o === '-' ? c + k : o === '*' ? c / k : c * k; return r.ar[1] + ' ' + r.ar[4] + ' ' + v + (o === '/' ? '   (careful: with INTEGER division, x/' + k + ' > ' + c + ' means x >= ' + (c + 1) * k + ')' : ''); }
    if (/\blike\s*'%/i.test(q)) return 'needs a different index type: reversed-string column, trigram index (pg_trgm GIN), or full-text search';
    if (/\bor\b/i.test(q)) return 'split into UNION ALL branches (each seekable), or rely on MULTI-INDEX OR / BitmapOr';
    if (/coalesce|ifnull/i.test(q)) return 'expand: (col = v OR col IS NULL) — or make the column NOT NULL with a default';
    return 'move every function/arithmetic to the constant side so the bare column is compared with a value';
  }

  topics.push({
    title: 'Sargable Predicates: Let the Index Do Its Job',
    analogy: `<p>A phone book is sorted by <b>last name</b>. "Find everyone named <i>Sharma</i>" — open the middle, jump, done. Now: "find everyone whose last name <b>reversed</b> is <i>amrahs</i>", or "whose last name has 6 letters", or "whose name <b>ends</b> in -rma". The book is still sorted by last name, but your question isn't <i>about</i> the last name any more — it's about something computed from it. You have to read every entry. That's a <b>non-sargable</b> predicate: the index exists, but the question is phrased so it can't be used.</p>`,
    explain: `<p><b>SARGable</b> = "<b>S</b>earch <b>ARG</b>ument-able": a WHERE condition the engine can turn into an index <b>seek range</b>. The shape that works everywhere is:</p>
<p style="text-align:center"><code>bare_column  operator  value-or-expression-without-that-column</code></p>
<p>with operator one of <code>= &lt; &gt; &lt;= &gt;= BETWEEN IN</code>, <code>IS NULL</code> (in most engines), or <code>LIKE 'prefix%'</code>. The moment you wrap the column in a function, do math on it, or start a LIKE with <code>%</code>, the index's sort order no longer helps.</p>
${H.table(['Non-sargable (scan)', 'Sargable rewrite (seek)', 'Note'], [
  ["<code>strftime('%Y-%m', created_at) = '2025-03'</code>", "<code>created_at &gt;= '2025-03-01' AND created_at &lt; '2025-04-01'</code>", 'half-open range: never miss 23:59:59.999'],
  ["<code>date(created_at) = '2026-09-01'</code>", "<code>created_at &gt;= '2026-09-01' AND created_at &lt; '2026-09-02'</code>", 'same idea for one day'],
  ["<code>julianday('now') - julianday(created_at) &lt; 30</code>", "<code>created_at &gt;= date('now', '-30 days')</code>", 'compute the boundary once'],
  ['<code>customer_id + 0 = 42</code>, <code>customer_id - 2 = 40</code>', '<code>customer_id = 42</code>', 'move math to the constant side'],
  ['<code>total_cents / 100 &gt; 150</code> (integer division!)', '<code>total_cents &gt;= 15100</code>', H.c('r', 'NOT ') + '<code>&gt; 15000</code> — check the semantics'],
  ["<code>lower(email) = 'a@x.com'</code>", 'expression index on <code>lower(email)</code>, or store emails lower-cased', 'or a case-insensitive collation'],
  ["<code>email LIKE '%@gmail.com'</code>", "reversed column + <code>LIKE 'moc.liamg@%'</code>, or trigram / full-text index", 'leading % kills B-tree seeks'],
  ["<code>COALESCE(status, 'new') = 'new'</code>", "<code>(status = 'new' OR status IS NULL)</code>", 'or make the column NOT NULL'],
  ["<code>phone = 9876543210</code> (phone is VARCHAR, MySQL)", "<code>phone = '9876543210'</code>", 'implicit cast of every row']
])}
<p><b>In SQLite on our <code>shop</code> data</b>: <code>strftime('%Y-%m', created_at) = '2025-03'</code> → ${H.c('r', 'SCAN orders')} (3,000 rows tested); the range rewrite → ${H.c('g', 'SEARCH orders USING INDEX idx_orders_created (created_at&gt;? AND created_at&lt;?)')} (145 rows touched). Same 145 rows returned.</p>
<p><b>Two traps:</b> (1) A rewrite must return <b>exactly</b> the same rows — integer division, time zones, NULLs and collations bite. Always compare counts. (2) <code>LIKE 'prefix%'</code> is sargable only when the index's collation matches the LIKE's case rules. SQLite's LIKE is case-insensitive by default, so on a normal (BINARY) index it scans; use <code>GLOB '2025-03*'</code>, <code>PRAGMA case_sensitive_like = ON</code>, or an index with <code>COLLATE NOCASE</code>. PostgreSQL needs a <code>text_pattern_ops</code> index (or C collation) for LIKE-prefix seeks.</p>`,
    clues: [
      '"There is an index on created_at but the monthly report still does a full scan" → function on the column (YEAR(), DATE(), strftime) — rewrite as a range',
      '"Search is case-insensitive" → lower()/upper() on the column; expression index or citext/NOCASE collation',
      '"Find emails ending with @gmail.com" / "contains" search → leading wildcard; reversed column, trigram, full-text',
      '"Works in dev (small table), times out in prod" + WHERE with functions → non-sargable predicate',
      'MySQL: VARCHAR column compared with a number / different charset or collation in a join → implicit conversion, index ignored',
      '"Last 30 days" written as now() - created_at &lt; interval → put the column alone on one side'
    ],
    code: [
      { lang: 'sql', db: 'shop', title: 'Non-sargable vs sargable, same answer (▶ Run)', code: `-- NON-sargable: function on the indexed column → SCAN orders
EXPLAIN QUERY PLAN
SELECT count(*) FROM orders WHERE strftime('%Y-%m', created_at) = '2025-03';

-- Sargable: bare column vs constant range → SEARCH ... idx_orders_created
EXPLAIN QUERY PLAN
SELECT count(*) FROM orders
WHERE created_at >= '2025-03-01' AND created_at < '2025-04-01';

-- Prove they return the same rows (always do this after a rewrite!)
SELECT
  (SELECT count(*) FROM orders WHERE strftime('%Y-%m', created_at) = '2025-03') AS old_count,
  (SELECT count(*) FROM orders WHERE created_at >= '2025-03-01' AND created_at < '2025-04-01') AS new_count;` },
      { lang: 'sql', db: 'shop', title: 'Expression index: when you cannot change the query', code: `EXPLAIN QUERY PLAN
SELECT * FROM customers WHERE lower(email) = 'user7@mail.com';   -- SCAN customers

CREATE INDEX idx_customers_email_lower ON customers(lower(email));

EXPLAIN QUERY PLAN
SELECT * FROM customers WHERE lower(email) = 'user7@mail.com';   -- SEARCH ... (<expr>=?)
SELECT id, email FROM customers WHERE lower(email) = 'user7@mail.com';` }
    ],
    codeTitle: ['Rewrite to a range', 'Index the expression instead'],
    viz: [
      {
        title: 'Same question, two phrasings: who touches fewer index entries?',
        input: "strftime('%Y-%m', created_at) = '2025-03'",
        inputLabel: "Predicate on created_at: strftime('%Y-%m', created_at) = '2025-03' | date(created_at) = '2025-03-05' | created_at >= '2025-03-01' AND created_at < '2025-04-01'",
        gen: function (input) {
          var q = String(input || '').trim(), frames = [], m, test, rangeLo = null, rangeHi = null, label;
          if ((m = q.match(/^strftime\(\s*'%Y-%m'\s*,\s*created_at\s*\)\s*=\s*'(\d{4}-\d{2})'$/i))) { var mv = m[1]; test = function (d) { return d.slice(0, 7) === mv; }; label = "strftime('%Y-%m', x)"; var yy = +mv.slice(0, 4), mm = +mv.slice(5, 7); rangeLo = mv + '-01'; rangeHi = (mm === 12 ? yy + 1 : yy) + '-' + ((mm === 12 ? 1 : mm + 1) < 10 ? '0' : '') + (mm === 12 ? 1 : mm + 1) + '-01'; }
          else if ((m = q.match(/^date\(\s*created_at\s*\)\s*=\s*'(\d{4}-\d{2}-\d{2})'$/i))) { var dv = m[1]; test = function (d) { return d.slice(0, 10) === dv; }; label = 'date(x)'; rangeLo = dv; var dt = new Date(dv + 'T00:00:00Z'); dt.setUTCDate(dt.getUTCDate() + 1); rangeHi = dt.toISOString().slice(0, 10); }
          else if ((m = q.match(/^created_at\s*(>=|>)\s*'([^']+)'\s+and\s+created_at\s*(<|<=)\s*'([^']+)'$/i))) { rangeLo = m[2]; rangeHi = m[4]; label = null; }
          else throw new Error("Use one of: strftime('%Y-%m', created_at) = '2025-03'  |  date(created_at) = '2025-03-05'  |  created_at >= '2025-03-01' AND created_at < '2025-04-01'");
          var idx = IDX_DATES.slice();
          frames.push({ narr: 'The index <code>idx_orders_created</code> is a <b>sorted</b> list of created_at values (12 shown). Sorted by the <b>raw</b> value — not by month, not by date(), not by anything computed.', parts: [{ type: 'array', label: 'idx_orders_created (sorted leaf entries)', values: idx }] });
          if (label) {
            var touched = 0, hits = [];
            for (var i = 0; i < idx.length; i++) {
              touched++;
              var ok = test(idx[i]); if (ok) hits.push(i);
              var hl = {}; for (var j = 0; j < i; j++) hl[j] = hits.indexOf(j) >= 0 ? 'ok' : 'done'; hl[i] = ok ? 'ok' : 'cur';
              if (i % 3 === 2 || ok || i === idx.length - 1) frames.push({ narr: '<b>Non-sargable:</b> the engine must compute <code>' + H.esc(label) + '</code> for <b>every</b> entry and compare: entry ' + (i + 1) + ' → ' + (ok ? H.c('g', 'match') : 'no') + '. It cannot jump, because it does not know where matching values start in the sorted order (well — <i>you</i> do; the engine does not reason about strftime).', parts: [{ type: 'array', label: 'evaluating ' + H.esc(label) + ' on each entry', values: idx, hl: hl, ptr: (function () { var p = {}; p[i] = 'f(x)?'; return p; })() }, { type: 'vars', vals: { entriesTouched: touched, matches: hits.length } }] });
            }
            frames.push({ narr: 'Result: ' + hits.length + ' matches after touching <b>all ' + idx.length + '</b> entries (in a real table: a full scan of every row). Now rewrite it as a <b>range on the bare column</b>: <code>created_at &gt;= \'' + rangeLo + '\' AND created_at &lt; \'' + rangeHi + '\'</code>.', parts: [{ type: 'text', label: 'rewrite', html: '<code>' + H.esc(q) + '</code><br>⟶ <code>created_at &gt;= \'' + rangeLo + '\' AND created_at &lt; \'' + rangeHi + '\'</code>' }] });
          }
          // sargable seek
          var lo = 0; while (lo < idx.length && idx[lo] < rangeLo) lo++;
          frames.push({ narr: '<b>Sargable:</b> binary-search / B-tree descent to the first entry ≥ <code>' + H.esc(rangeLo) + '</code>. Entries before it are <b>never touched</b>.', parts: [{ type: 'array', label: 'seek', values: idx, hl: (function () { var h = {}; for (var z = 0; z < lo; z++) h[z] = 'done'; if (lo < idx.length) h[lo] = 'cur'; return h; })(), ptr: (function () { var p = {}; if (lo < idx.length) p[lo] = 'start'; return p; })() }] });
          var hi = lo, t2 = 1, h2 = {};
          while (hi < idx.length && idx[hi] < rangeHi) { h2[hi] = 'ok'; hi++; t2++; }
          frames.push({ narr: 'Walk right while values are &lt; <code>' + H.esc(rangeHi) + '</code>, stop at the first one that isn\'t. Touched: ' + (hi - lo) + ' matching entries + 1 to detect the end (+ ~3 B-tree pages for the descent).', parts: [{ type: 'array', label: 'range scan', values: idx, hl: h2, range: hi > lo ? [lo, hi - 1] : undefined, ptr: (function () { var p = {}; if (lo < idx.length) p[lo] = 'start'; if (hi < idx.length) p[hi] = 'stop'; return p; })() }] });
          var full = idx.length, seek = (hi - lo) + 1 + 3;
          frames.push({ narr: 'With 12 entries the gap is small. At 30M orders and 1 month of data (~1.4%): non-sargable ≈ <b>30,000,000</b> evaluations; sargable ≈ <b>420,000</b> entries + 4 pages. Same rows, ~70× less work — and it gets better the narrower the range.', parts: [{ type: 'bars', label: 'entries touched here', values: label ? [full, seek] : [seek], idxLabels: label ? ['function on column', 'range on column'] : ['range on column'], hl: label ? { 0: 'bad', 1: 'ok' } : { 0: 'ok' } }] });
          return frames;
        }
      },
      {
        title: 'Sargability checker: paste a WHERE condition',
        input: "julianday('now') - julianday(created_at) < 30",
        inputLabel: 'A WHERE condition',
        gen: function (input) {
          var q = String(input || '').trim();
          if (q.length < 3) throw new Error('Type a WHERE condition, e.g.  date(created_at) = \'2026-09-01\'');
          if (q.length > 200) throw new Error('Keep it under 200 characters');
          var r = sargRules(q), frames = [], items = [];
          frames.push({ narr: 'Checking <code>' + H.esc(q) + '</code> against the five classic sargability rules. Each rule asks: "can the engine still find a <b>starting point</b> in a sorted index on the column?"', parts: [{ type: 'code', label: 'predicate', lang: 'sql', code: q }] });
          r.rules.forEach(function (rule, i) {
            items.push((rule.bad ? '✗ ' : '✓ ') + rule.name);
            var hl = {}; hl[(rule.bad ? '✗ ' : '✓ ') + rule.name] = rule.bad ? 'bad' : 'ok';
            frames.push({ narr: '<b>Rule ' + (i + 1) + ': ' + rule.name + '</b> — ' + (rule.bad ? H.c('r', 'violated. ') + rule.why : H.c('g', 'OK.')), parts: [{ type: 'set', label: 'checks so far', items: items.slice(), hl: hl }] });
          });
          var bad = r.rules.filter(function (x) { return x.bad; }).length;
          frames.push({ narr: bad ? H.c('r', '<b>Not sargable</b> (' + bad + ' rule' + (bad > 1 ? 's' : '') + ' violated).') + ' Suggested direction: <code>' + H.esc(sargFix(q, r)) + '</code>. Then confirm with EXPLAIN that the plan says SEARCH / Index Scan, and compare row counts old vs new.' : H.c('g', '<b>Looks sargable.</b>') + ' If there is an index whose <i>leading</i> column appears here, the engine can seek. Still check EXPLAIN — selectivity decides whether it <i>will</i>.', parts: [{ type: 'set', label: 'verdict', items: items, hl: (function () { var h = {}; items.forEach(function (x) { h[x] = x.charAt(0) === '✗' ? 'bad' : 'ok'; }); return h; })() }] });
          return frames;
        }
      }
    ],
    examples: [
      { title: 'One day of orders: date() vs a half-open range', html: `<p><code>date(created_at) = '2026-09-01'</code> → ${H.c('r', 'SCAN orders')}. The rewrite <code>created_at &gt;= '2026-09-01' AND created_at &lt; '2026-09-02'</code> → ${H.c('g', 'SEARCH … idx_orders_created (created_at&gt;? AND created_at&lt;?)')}. Both return 5 rows. Use a <b>half-open</b> range (<code>&gt;=</code> start, <code>&lt;</code> next day) rather than <code>BETWEEN '…00:00:00' AND '…23:59:59'</code>, which silently drops <code>23:59:59.5</code> and breaks when precision changes.</p>`, code: { lang: 'sql', db: 'shop', code: `EXPLAIN QUERY PLAN SELECT * FROM orders WHERE date(created_at) = '2026-09-01';
EXPLAIN QUERY PLAN SELECT * FROM orders WHERE created_at >= '2026-09-01' AND created_at < '2026-09-02';
SELECT id, created_at FROM orders
WHERE created_at >= '2026-09-01' AND created_at < '2026-09-02'
ORDER BY created_at;` } },
      { title: 'Compute the boundary, not the column ("last 30 days")', html: `<p><code>julianday('now') - julianday(created_at) &lt; 30</code> evaluates two functions per row → ${H.c('r', 'SCAN')}. Turning it around so the column stands alone, <code>created_at &gt;= date('2026-10-14', '-30 days')</code>, computes the boundary <b>once</b> → ${H.c('g', 'SEARCH (created_at&gt;?)')}. In application code, compute the timestamp in the app and pass it as a parameter. (Careful: the two forms can differ by a few hours at the boundary because one compares times and the other dates — decide which one the business means.)</p>`, code: { lang: 'sql', db: 'shop', code: `EXPLAIN QUERY PLAN
SELECT count(*) FROM orders WHERE julianday('2026-10-14') - julianday(created_at) < 30;
EXPLAIN QUERY PLAN
SELECT count(*) FROM orders WHERE created_at >= date('2026-10-14', '-30 days');
SELECT count(*) AS last_30_days FROM orders WHERE created_at >= date('2026-10-14', '-30 days');` } },
      { title: 'LIKE prefix: sargable only with matching case rules', html: `<p>SQLite's <code>LIKE</code> is case-insensitive, but <code>idx_orders_created</code> is case-sensitive (BINARY), so <code>created_at LIKE '2025-03%'</code> ${H.c('r', 'scans')}. <code>GLOB</code> is case-sensitive, so <code>created_at GLOB '2025-03*'</code> ${H.c('g', 'seeks')} the range <code>['2025-03', '2025-04')</code>. Same for <code>PRAGMA case_sensitive_like = ON</code>. PostgreSQL: use <code>text_pattern_ops</code> (or <code>COLLATE "C"</code>) on the index; MySQL: LIKE 'abc%' uses the index when collations match.</p>`, code: { lang: 'sql', db: 'shop', code: `EXPLAIN QUERY PLAN SELECT * FROM orders WHERE created_at LIKE '2025-03%';
EXPLAIN QUERY PLAN SELECT * FROM orders WHERE created_at GLOB '2025-03*';
SELECT count(*) AS march_orders FROM orders WHERE created_at GLOB '2025-03*';` } },
      { title: 'Suffix search: index the reversed string', html: `<p><code>email LIKE '%7@mail.com'</code> can never seek a normal index. Store <code>reverse(email)</code> (or compute it in an expression index where the engine has <code>reverse()</code>), and search the <b>prefix</b> <code>'moc.liam@7%'</code> instead. For "contains" searches use a trigram index (PostgreSQL <code>pg_trgm</code> + GIN supports <code>LIKE '%abc%'</code> and <code>ILIKE</code>) or full-text search (SQLite FTS5, PostgreSQL tsvector, Elasticsearch).</p>`, code: { lang: 'sql', check: false, code: `-- PostgreSQL
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_customers_email_trgm ON customers USING gin (email gin_trgm_ops);
EXPLAIN SELECT * FROM customers WHERE email LIKE '%7@mail.com';   -- Bitmap Index Scan on idx_customers_email_trgm

-- Or a suffix-friendly expression index + prefix search
CREATE INDEX idx_customers_email_rev ON customers (reverse(email) text_pattern_ops);
SELECT * FROM customers WHERE reverse(email) LIKE reverse('7@mail.com') || '%';` } }
    ],
    deepDive: `<h4>What the engine can and cannot "see through"</h4>
<ul>
<li><b>Constant folding</b> works on the <i>value</i> side: <code>customer_id = 40 + 2</code> and <code>created_at &gt;= date('2026-10-14', '-30 days')</code> are sargable, because the expression doesn't depend on the row.</li>
<li><b>Engines rarely invert functions</b> on the column side. Exceptions exist: SQL Server makes <code>CAST(datetime_col AS date) = @d</code> sargable via a special rewrite; PostgreSQL turns <code>LIKE 'abc%'</code> into a range under C/pattern collations; Oracle can use function-based indexes. Never rely on it across engines.</li>
<li><b>Type coercion</b>: when two sides have different types, the engine converts one. If it converts the <i>column</i> (MySQL VARCHAR vs number; SQL Server NVARCHAR parameter vs VARCHAR column; joining columns with different collations/charsets), every row is converted and the index is lost. SQLite's <i>type affinity</i> converts the constant <code>'42'</code> to an integer for an INTEGER column, so <code>customer_id = '42'</code> still seeks.</li>
<li><b>Expression / function-based indexes</b> make a specific expression sargable: PostgreSQL <code>CREATE INDEX ON t ((lower(email)))</code>, MySQL 8.0.13+ functional key parts <code>((lower(email)))</code> or an indexed generated column, SQLite <code>CREATE INDEX … ON t(lower(email))</code>, SQL Server computed column + index. The query must use the <b>identical</b> expression.</li>
<li><b>IN lists</b> are sargable (one seek per value, "IN-operator" in SQLite, <code>= ANY(array)</code> in PG). Huge IN lists (10k+ values) are better as a join against a temp table / VALUES / array parameter.</li>
<li><b>IS NULL</b> is sargable in PostgreSQL, MySQL, SQLite B-trees; in Oracle single-column B-tree indexes don't store all-NULL keys, so <code>IS NULL</code> can't use them (classic Oracle interview gotcha).</li>
<li><b>Partial indexes</b> can make a "non-sargable-looking" filter cheap: <code>CREATE INDEX … WHERE deleted_at IS NULL</code> serves every query that includes the same condition.</li>
</ul>
<h4>Composite indexes and sargability</h4><p>For an index on <code>(a, b, c)</code>: equality on a and b plus a range on c is a single seek. A range on <code>a</code> stops the seek at a — conditions on b and c become filters inside the range (MySQL calls it the "range stops key use" rule; PG shows them as Index Cond but still scans the whole a-range). Order composite columns as: equality columns → one range or ORDER BY column → covering passengers.</p>`,
    aiEra: `<p><b>What AI changes:</b> LLM-generated SQL is often <i>readable but non-sargable</i>: <code>WHERE YEAR(created_at) = 2025</code>, <code>DATE(ts) = CURRENT_DATE</code>, <code>LOWER(email) = LOWER(?)</code>, <code>CONCAT(first, ' ', last) LIKE '%…%'</code>. It looks clean, passes tests on tiny data, and dies on production tables. Linters (SQLFluff rules, sqlcheck, IDE inspections) and AI reviewers can flag these patterns automatically.</p>
<p><b>Use AI as a partner:</b> "Rewrite every predicate in this query so the column stands alone on one side, keep the semantics identical, and list any edge cases (NULLs, time zones, integer division) where the rewrite could change results." Then run both versions and compare counts.</p>
<p><b>Where AI goes wrong:</b> the classic <code>total/100 &gt; 150</code> → <code>total &gt; 15000</code> (wrong with integer division), <code>BETWEEN '2025-03-01' AND '2025-03-31'</code> (drops March 31 after midnight), or suggesting an expression index whose expression doesn't exactly match the query's.</p>
<p><b>What you must still own:</b> spotting the pattern on sight, proving the rewrite is equivalent, and confirming the new plan seeks.</p>`,
    problems: [
      {
        title: 'Monthly revenue without a full scan', level: 'Easy', tags: ['sargable', 'date range', 'rewrite'], companies: ['Amazon', 'Paytm', 'PhonePe'],
        statement: `<p>The finance dashboard computes March 2025 revenue with:</p><pre>SELECT sum(total_cents) FROM orders
WHERE strftime('%Y-%m', created_at) = '2025-03';</pre><p>There is an index on <code>created_at</code>, yet the plan is a full scan. Rewrite the query so it seeks the index, and prove the result is identical.</p>`,
        constraints: `SQLite <code>shop</code>; <code>created_at</code> is TEXT <code>'YYYY-MM-DD HH:MM:SS'</code>; no schema changes.`,
        example: `<p>Both versions return the same sum over ${H.c('g', '145 orders')}. Plan must change from ${H.c('r', 'SCAN orders')} to ${H.c('g', 'SEARCH orders USING INDEX idx_orders_created (created_at&gt;? AND created_at&lt;?)')}.</p>`,
        brute: { why: `<p><code>strftime()</code> is applied to the column, so SQLite must read all 3,000 rows, format each date, and compare strings. The index is sorted by raw <code>created_at</code>, not by <code>strftime('%Y-%m', …)</code>, so it can't be used. Work grows with the whole table, even though March is only 145 rows.</p>`, code: { lang: 'sql', db: 'shop', code: `EXPLAIN QUERY PLAN
SELECT sum(total_cents) FROM orders
WHERE strftime('%Y-%m', created_at) = '2025-03';
SELECT sum(total_cents) AS march_revenue FROM orders
WHERE strftime('%Y-%m', created_at) = '2025-03';` } },
        mcq: { q: 'Which rewrite is both sargable and exactly equivalent?', options: [`<code>created_at BETWEEN '2025-03-01' AND '2025-03-31'</code>`, `<code>created_at &gt;= '2025-03-01' AND created_at &lt; '2025-04-01'</code>`, `<code>created_at LIKE '2025-03%'</code> (SQLite default settings)`, `<code>substr(created_at, 1, 7) = '2025-03'</code>`], answer: 1, explain: "BETWEEN … '2025-03-31' misses everything after midnight on the 31st (the string '2025-03-31 10:00' > '2025-03-31'). LIKE is case-insensitive in SQLite so it can't seek a BINARY index; substr is still a function on the column. The half-open range is exact and seekable." },
        hints: [`<p>Hint 1: Ask "which raw <code>created_at</code> values have month 2025-03?" — they form one contiguous block in sorted order.</p>`, `<p>Hint 2: Describe that block as <code>&gt;= start AND &lt; start of next month</code> (half-open), so you never worry about the last second of the month.</p>`, `<p>Hint 3: Recipe: EXPLAIN old, EXPLAIN new, then SELECT both sums side by side to prove they match.</p>`],
        tests: { engine: 'sqlite', check: '(rows, cols, c) => {\n  if (c.plan || c.noplan) { const d = rows.map(r => r[r.length - 1]).join(\'\\n\'); return (!c.plan || new RegExp(c.plan).test(d)) && (!c.noplan || !new RegExp(c.noplan).test(d)); }\n  let a = rows, b = c.rows || [];\n  if (c.set) { const k = r => JSON.stringify(r); a = a.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); b = b.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); }\n  return a.length === b.length && a.every((r, i) => r.length === b[i].length && r.every((v, j) => v === b[i][j] || (typeof v === \'number\' && typeof b[i][j] === \'number\' && Math.abs(v - b[i][j]) < 1e-6)));\n}', cases: [
          { rows: [
              [1497155, 1497155]
            ] },
          { rows: [], plan: 'SEARCH orders USING INDEX idx_orders_created \\(created_at>\\? AND created_at<\\?\\)', noplan: 'SCAN', after: 'EXPLAIN QUERY PLAN SELECT sum(total_cents) FROM orders WHERE created_at >= \'2025-03-01\' AND created_at < \'2025-04-01\'' },
          { setup: 'INSERT INTO orders VALUES (9101,1,\'paid\',\'2025-02-28 23:59:59\',1),(9102,1,\'paid\',\'2025-03-01 00:00:00\',2),(9103,1,\'paid\',\'2025-03-31 23:59:59\',4),(9104,1,\'paid\',\'2025-04-01 00:00:00\',8)', rows: [
              [1497161, 1497161]
            ] },
          { setup: 'DELETE FROM orders WHERE created_at >= \'2025-03-01\' AND created_at < \'2025-04-01\'', rows: [
              [null, null]
            ] },
          { setup: 'DELETE FROM orders', rows: [
              [null, null]
            ] },
          { setup: 'DELETE FROM orders; INSERT INTO orders VALUES (9101,1,\'paid\',\'2025-02-28 23:59:59\',1),(9102,1,\'paid\',\'2025-03-01 00:00:00\',2),(9103,1,\'paid\',\'2025-03-31 23:59:59\',4),(9104,1,\'paid\',\'2025-04-01 00:00:00\',8)', rows: [
              [6, 6]
            ] },
          { setup: 'DROP INDEX idx_orders_created', after: 'EXPLAIN QUERY PLAN SELECT sum(total_cents) FROM orders WHERE created_at >= \'2025-03-01\' AND created_at < \'2025-04-01\'', rows: [], plan: 'SCAN orders' },
          { after: 'SELECT sum(total_cents) FROM orders WHERE created_at >= \'2025-03-01\' AND created_at < \'2025-04-01\'', rows: [
              [1497155]
            ] }
        ] },
        solution: {
          approach: `<p>Translate "month = 2025-03" into a range on the raw column: <code>created_at &gt;= '2025-03-01' AND created_at &lt; '2025-04-01'</code>. Because ISO-8601 strings sort chronologically, every March timestamp is inside that half-open range and nothing else is. The planner can now seek <code>idx_orders_created</code> to the first March entry and stop at the first April one — 145 entries instead of 3,000 rows.</p>`,
          code: { lang: 'sql', db: 'shop', code: `EXPLAIN QUERY PLAN
SELECT sum(total_cents) FROM orders
WHERE created_at >= '2025-03-01' AND created_at < '2025-04-01';
-- SEARCH orders USING INDEX idx_orders_created (created_at>? AND created_at<?)

SELECT
  (SELECT sum(total_cents) FROM orders
    WHERE strftime('%Y-%m', created_at) = '2025-03')                     AS old_sum,
  (SELECT sum(total_cents) FROM orders
    WHERE created_at >= '2025-03-01' AND created_at < '2025-04-01')      AS new_sum;` },
          complexity: `<p>Before: O(N) rows + N strftime calls. After: O(log N + k) with k = 145 matching rows (each still fetched from the table for total_cents — add total_cents to the index to make it covering).</p>`,
          followUps: ['Make it covering so the table is never read.', 'How would you write "this calendar month" for a parameterized dashboard?']
        }
      }
    ]
  });

  /* =====================================================================
     TOPIC 7 — Query rewriting
     ===================================================================== */
  var REWRITE_STEPS = [
    { name: 'original', work: 20244, sql: "SELECT DISTINCT c.*,\n  (SELECT count(*) FROM orders o2 WHERE o2.customer_id = c.id) AS n\nFROM customers c JOIN orders o ON o.customer_id = c.id\nWHERE strftime('%Y-%m', o.created_at) = '2026-09'\nORDER BY n DESC, c.id LIMIT 10;", plan: ['SCAN o', 'SEARCH c USING INTEGER PRIMARY KEY (rowid=?)', 'CORRELATED SCALAR SUBQUERY 1', 'SEARCH o2 USING COVERING INDEX idx_orders_customer (customer_id=?)', 'USE TEMP B-TREE FOR DISTINCT', 'USE TEMP B-TREE FOR ORDER BY'], say: 'The query a dashboard shipped with: "top 10 customers (by lifetime orders) who ordered in Sept 2026". Four problems: a <b>non-sargable</b> month filter (SCAN o), a join that <b>fans out</b> (one row per order, 141 rows) so it needs <b>DISTINCT</b>, a <b>correlated count</b> that runs once per <i>joined</i> row (141 times, not 109), and <code>SELECT c.*</code>.' },
    { name: '1. sargable range', work: 8646, sql: "SELECT DISTINCT c.*,\n  (SELECT count(*) FROM orders o2 WHERE o2.customer_id = c.id) AS n\nFROM customers c JOIN orders o ON o.customer_id = c.id\nWHERE o.created_at >= '2026-09-01' AND o.created_at < '2026-10-01'\nORDER BY n DESC, c.id LIMIT 10;", plan: ['SEARCH o USING INDEX idx_orders_created (created_at>? AND created_at<?)', 'SEARCH c USING INTEGER PRIMARY KEY (rowid=?)', 'CORRELATED SCALAR SUBQUERY 1', 'SEARCH o2 USING COVERING INDEX idx_orders_customer (customer_id=?)', 'USE TEMP B-TREE FOR DISTINCT', 'USE TEMP B-TREE FOR ORDER BY'], say: '<b>Rewrite 1 — make the filter sargable.</b> strftime(…) = \'2026-09\' becomes a half-open range. SCAN o (3,000 rows) becomes a SEARCH that touches only the 141 September orders. Same rows, 2.3× less work.' },
    { name: '2. join+DISTINCT → IN', work: 6573, sql: "SELECT c.*,\n  (SELECT count(*) FROM orders o2 WHERE o2.customer_id = c.id) AS n\nFROM customers c\nWHERE c.id IN (SELECT customer_id FROM orders\n               WHERE created_at >= '2026-09-01' AND created_at < '2026-10-01')\nORDER BY n DESC, c.id LIMIT 10;", plan: ['SEARCH c USING INTEGER PRIMARY KEY (rowid=?)', 'LIST SUBQUERY 2', 'SEARCH orders USING INDEX idx_orders_created (created_at>? AND created_at<?)', 'CORRELATED SCALAR SUBQUERY 1', 'SEARCH o2 USING COVERING INDEX idx_orders_customer (customer_id=?)', 'USE TEMP B-TREE FOR ORDER BY'], say: '<b>Rewrite 2 — semi-join instead of join + DISTINCT.</b> We only need to know <i>whether</i> a customer ordered in September, not how many times. <code>IN (subquery)</code> builds the list of 109 customer ids once; no fan-out, so the DISTINCT sort disappears and the correlated count runs 109 times instead of 141.' },
    { name: '2b. tried EXISTS', work: 21020, sql: "SELECT c.*,\n  (SELECT count(*) FROM orders o2 WHERE o2.customer_id = c.id) AS n\nFROM customers c\nWHERE EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.id\n              AND o.created_at >= '2026-09-01' AND o.created_at < '2026-10-01')\nORDER BY n DESC, c.id LIMIT 10;", plan: ['SCAN c', 'CORRELATED SCALAR SUBQUERY 2', 'SEARCH o USING INDEX idx_orders_customer (customer_id=?)', 'CORRELATED SCALAR SUBQUERY 1', 'SEARCH o2 USING COVERING INDEX idx_orders_customer (customer_id=?)', 'USE TEMP B-TREE FOR ORDER BY'], say: '<b>Detour — EXISTS is not automatically faster.</b> Logically equal to step 2, but SQLite runs EXISTS as a <i>correlated</i> subquery: it scans all 320 customers and, for each, reads their orders to test the date. <span class="c-r">21,020 instructions — worse than the original!</span> PostgreSQL would turn both IN and EXISTS into the same semi-join. Lesson: <b>measure every rewrite on your engine.</b>' },
    { name: '3. only needed columns', work: 6513, sql: "SELECT c.id, c.name, c.city,\n  (SELECT count(*) FROM orders o2 WHERE o2.customer_id = c.id) AS n\nFROM customers c\nWHERE c.id IN (SELECT customer_id FROM orders\n               WHERE created_at >= '2026-09-01' AND created_at < '2026-10-01')\nORDER BY n DESC, c.id LIMIT 10;", plan: ['SEARCH c USING INTEGER PRIMARY KEY (rowid=?)', 'LIST SUBQUERY 2', 'SEARCH orders USING INDEX idx_orders_created (created_at>? AND created_at<?)', 'CORRELATED SCALAR SUBQUERY 1', 'SEARCH o2 USING COVERING INDEX idx_orders_customer (customer_id=?)', 'USE TEMP B-TREE FOR ORDER BY'], say: '<b>Rewrite 3 — list the columns.</b> A small gain here (fewer bytes copied into the sort), but in real systems <code>SELECT *</code> blocks covering indexes, drags big TEXT/JSON columns through sorts and the network, and breaks when columns are added.' }
  ];

  topics.push({
    title: 'Query Rewriting: Same Answer, Far Less Work',
    analogy: `<p>Asking a librarian "bring me every book, and I'll throw away the ones not about cooking" versus "bring me the cooking shelf". Both give you cooking books; one makes the librarian carry the whole library. <b>Query rewriting</b> means rephrasing your request so it asks for exactly what you need, in a form the database can answer with its shortcuts (indexes, semi-joins, early stopping). The planner does some rephrasing itself — but it can't read your mind about duplicates, NULLs, or which rows you'll never look at.</p>`,
    explain: `<p>Planners already rewrite a lot automatically (flattening subqueries, pushing filters down, folding constants — topic 1). The rewrites below are the ones <b>you</b> usually have to do, because the planner either can't prove they are equivalent or doesn't know your intent.</p>
${H.table(['Slow shape', 'Rewrite', 'Why it is faster'], [
  ['<code>ORDER BY … LIMIT 20 OFFSET 100000</code>', '<b>Keyset</b>: <code>WHERE (created_at, id) &lt; (:last_ts, :last_id) ORDER BY created_at DESC, id DESC LIMIT 20</code>', 'OFFSET reads and discards 100,000 rows; keyset seeks straight to the page'],
  ['Correlated subquery in SELECT, run per row', 'Pre-aggregate once in a derived table / CTE and JOIN, or use a window function', 'One grouped pass instead of N little queries'],
  ['<code>SELECT DISTINCT …</code> to undo join fan-out', '<code>WHERE EXISTS (…)</code> / <code>IN (…)</code> (semi-join)', 'No duplicates created, no dedupe sort; stops at first match'],
  ['<code>NOT IN (SELECT col …)</code> where col can be NULL', '<code>NOT EXISTS (…)</code>', H.c('r', 'Correctness!') + ' One NULL makes NOT IN return no rows; NOT EXISTS is also a clean anti-join'],
  ['<code>WHERE a = 1 OR b = 2</code> (two different columns)', '<code>… WHERE a = 1 UNION ALL … WHERE b = 2 AND a &lt;&gt; 1</code> (mind NULLs)', 'Each branch can seek its own index'],
  ['<code>(SELECT count(*) …) &gt; 0</code>', '<code>EXISTS (…)</code>', 'Stops at the first row instead of counting all'],
  ['Filter on a grouping column in HAVING', 'Move it to WHERE', 'Rows removed before grouping, can use an index'],
  ['Aggregate after a big join', 'Aggregate first, then join the small result', 'Join 300 summary rows instead of 3,000,000 detail rows'],
  ['UNION where duplicates are impossible', 'UNION ALL', 'Skips a dedupe sort/hash'],
  ['N+1: app runs 1 query per item in a loop', 'One query with <code>IN (…)</code> / JOIN', '1 round-trip instead of N (network latency dominates)'],
  ['<code>SELECT *</code>', 'Only the columns you need', 'Enables covering indexes; less I/O, memory, network']
])}
<p><b>The golden rule of rewriting:</b> (1) prove the new query returns <b>exactly</b> the same rows (compare counts, or <code>EXCEPT</code> both ways); (2) prove it is <b>faster</b> with EXPLAIN / EXPLAIN ANALYZE on realistic data; (3) keep it readable. A rewrite that is faster on SQLite can be slower on PostgreSQL and vice versa — the viz below shows a "textbook" rewrite (EXISTS) making things <i>worse</i> in SQLite.</p>`,
    clues: [
      '"Pagination gets slower the deeper you go" / "page 5,000 times out" → OFFSET; switch to keyset (seek) pagination',
      '"Query returns duplicates, so I added DISTINCT" → join fan-out; use EXISTS / IN (semi-join) or pre-aggregate',
      '"NOT IN returns nothing even though some rows clearly qualify" → NULL in the subquery; use NOT EXISTS',
      '"Report has a subquery in the SELECT list and 1M rows" → correlated subquery per row; join to a pre-aggregated result or use a window function',
      '"The API makes 200 queries to render one page" → N+1 problem; batch with IN / JOIN, or ORM eager loading',
      '"WHERE email = ? OR phone = ? is slow even though both are indexed" → OR across columns; UNION ALL or bitmap/multi-index OR'
    ],
    code: [
      { lang: 'sql', db: 'shop', title: 'Keyset pagination vs OFFSET (▶ Run)', code: `-- Page 146 with OFFSET: walks and DISCARDS 2,900 index entries + rows first
EXPLAIN QUERY PLAN
SELECT id, created_at, total_cents FROM orders
ORDER BY created_at DESC, id DESC
LIMIT 20 OFFSET 2900;

-- Same page with keyset: remember the last row of the previous page
-- (created_at = '2025-01-22 15:09:07', id = 2353) and seek past it
EXPLAIN QUERY PLAN
SELECT id, created_at, total_cents FROM orders
WHERE (created_at, id) < ('2025-01-22 15:09:07', 2353)
ORDER BY created_at DESC, id DESC
LIMIT 20;

-- Prove both return the same rows (EXCEPT in both directions must be empty)
SELECT count(*) AS rows_only_in_one_version FROM (
  SELECT * FROM (SELECT id FROM orders ORDER BY created_at DESC, id DESC LIMIT 20 OFFSET 2900)
  EXCEPT
  SELECT * FROM (SELECT id FROM orders WHERE (created_at, id) < ('2025-01-22 15:09:07', 2353)
                 ORDER BY created_at DESC, id DESC LIMIT 20)
);` },
      { lang: 'sql', db: 'shop', title: 'NOT IN vs NOT EXISTS with a NULL in the subquery', code: `-- "Customers who never referred anybody". referred_by contains NULLs.
SELECT count(*) AS not_in_result
FROM customers c
WHERE c.id NOT IN (SELECT referred_by FROM customers);          -- 0 rows (!!)

SELECT count(*) AS not_exists_result
FROM customers c
WHERE NOT EXISTS (SELECT 1 FROM customers r WHERE r.referred_by = c.id);   -- 280 rows

-- Why: x NOT IN (1, 2, NULL)  =  x<>1 AND x<>2 AND x<>NULL  =  ... AND UNKNOWN  ->  never TRUE` }
    ],
    codeTitle: ['Keyset pagination', 'NOT IN trap'],
    viz: [
      {
        title: 'OFFSET vs keyset pagination: rows touched per page',
        input: '5 30',
        inputLabel: 'page size, total rows (small demo)',
        gen: function (input) {
          var p = String(input || '').trim().split(/[\s,]+/).map(Number);
          if (p.length !== 2 || p.some(function (x) { return !(x >= 1) || Math.floor(x) !== x; })) throw new Error('Enter two whole numbers: pageSize totalRows   e.g. 5 30');
          var size = p[0], total = p[1];
          if (total > 40 || size > total) throw new Error('Use at most 40 rows and a page size ≤ total rows');
          var vals = []; for (var i = 0; i < total; i++) vals.push(total - i);   // newest first: id descending
          var pages = Math.ceil(total / size), frames = [], offTot = 0, keyTot = 0;
          frames.push({ narr: 'An index on <code>created_at</code>, read newest-first. ' + total + ' rows, ' + size + ' per page = ' + pages + ' pages. Watch how much each method <b>touches</b> to produce each page.', parts: [{ type: 'array', label: 'index order (newest → oldest), showing id', values: vals }] });
          for (var pg = 1; pg <= pages; pg++) {
            var start = (pg - 1) * size, end = Math.min(total, start + size);
            var hlO = {}, hlK = {};
            for (var a = 0; a < start; a++) hlO[a] = 'bad';
            for (var b2 = start; b2 < end; b2++) { hlO[b2] = 'ok'; hlK[b2] = 'ok'; }
            var offRead = end, keyRead = end - start + (pg > 1 ? 1 : 0);
            offTot += offRead; keyTot += keyRead;
            if (pg <= 3 || pg === pages) {
              var ptrK = {}; if (pg > 1) ptrK[start] = 'seek';
              frames.push({ narr: '<b>Page ' + pg + '.</b> OFFSET ' + start + ': walk ' + start + ' rows just to <span class="c-r">throw them away</span>, then return ' + (end - start) + ' → touched ' + offRead + '. Keyset: <code>WHERE id &lt; ' + (pg > 1 ? vals[start - 1] : '∞') + '</code> (last id of the previous page) → <b>seek</b> straight to the page → touched ' + keyRead + '.', parts: [{ type: 'array', label: 'OFFSET ' + start + ' LIMIT ' + size, values: vals, hl: hlO }, { type: 'array', label: 'keyset: WHERE id < last_seen LIMIT ' + size, values: vals, hl: hlK, ptr: ptrK }, { type: 'vars', vals: { page: pg, offsetTouched: offRead, keysetTouched: keyRead } }] });
            }
          }
          frames.push({ narr: 'Reading <b>all</b> ' + pages + ' pages: OFFSET touches ' + offTot + ' rows (grows like pages² — quadratic), keyset touches ' + keyTot + ' (linear). Measured in SQLite on the 3,000-row <code>orders</code> table (VM instructions): OFFSET 0 → 171, OFFSET 100 → 471, OFFSET 1000 → 3,171, OFFSET 2900 → <b>8,871</b>; keyset for that last page → <b>246</b>.', parts: [{ type: 'bars', label: 'measured SQLite VM steps for one page of 20 rows', values: [171, 471, 3171, 8871, 246], idxLabels: ['OFFSET 0', 'OFFSET 100', 'OFFSET 1000', 'OFFSET 2900', 'keyset (any page)'], hl: { 3: 'bad', 4: 'ok' } }, { type: 'bars', label: 'rows touched to read every page (this demo)', values: [offTot, keyTot], idxLabels: ['OFFSET', 'keyset'], hl: { 0: 'bad', 1: 'ok' } }] });
          frames.push({ narr: 'Keyset trade-offs: you can\'t jump to "page 37" directly (use "next/previous" or infinite scroll), the sort key must be <b>unique</b> (add <code>id</code> as a tie-breaker), and you need an index matching the ORDER BY. In exchange: constant speed on every page, and no skipped/duplicated rows when new rows are inserted between page loads.', parts: [{ type: 'code', label: 'keyset recipe', lang: 'sql', code: "-- first page\nSELECT id, created_at FROM orders\nORDER BY created_at DESC, id DESC LIMIT 20;\n-- next page: pass the last row's (created_at, id)\nSELECT id, created_at FROM orders\nWHERE (created_at, id) < (:last_created_at, :last_id)\nORDER BY created_at DESC, id DESC LIMIT 20;" }] });
          return frames;
        }
      },
      {
        title: 'Rewrite a slow dashboard query step by step (measured in SQLite)',
        gen: function () {
          var frames = [], works = [];
          REWRITE_STEPS.forEach(function (st, i) {
            works.push(st.work);
            var hl = {}; hl[i] = st.work > REWRITE_STEPS[0].work ? 'bad' : i === 0 ? 'cur' : 'ok';
            var phl = {}; st.plan.forEach(function (l, j) { if (/^SCAN [a-z0-9]+$|TEMP B-TREE FOR DISTINCT|CORRELATED SCALAR SUBQUERY 2/i.test(l)) phl[j] = 'bad'; });
            frames.push({ narr: st.say + ' <b>Measured: ' + st.work.toLocaleString('en-US') + ' VM instructions.</b>', parts: [{ type: 'code', label: st.name, lang: 'sql', code: st.sql }, { type: 'table', label: 'EXPLAIN QUERY PLAN', columns: ['plan line'], rows: st.plan.map(function (l) { return [l]; }), hl: phl }, { type: 'bars', label: 'SQLite VM instructions (lower is better)', values: works.slice(), idxLabels: REWRITE_STEPS.slice(0, i + 1).map(function (s) { return s.name; }), hl: hl }] });
          });
          frames.push({ narr: 'Result: the same 10 customers (3, 5, 7, 9, 14, 16, 18, 20, 25, 27) with <b>3.1× less work</b> — and on a 30M-row table the sargable range and the semi-join turn minutes into milliseconds because they scale with the matching rows, not the table. Every step was checked two ways: same result rows, and a better plan.', parts: [{ type: 'bars', label: 'all steps', values: works, idxLabels: REWRITE_STEPS.map(function (s) { return s.name; }), hl: { 0: 'cur', 3: 'bad', 4: 'ok' } }] });
          return frames;
        }
      }
    ],
    examples: [
      { title: 'Correlated subquery per row → pre-aggregate once', html: `<p>"Each Delhi customer with their order count and last order date." The correlated version runs two little subqueries per customer (40 × 2). The rewrite aggregates <code>orders</code> once per customer in a derived table and joins it. In PostgreSQL with 1M customers this is the difference between 2M index probes and one hash aggregate + hash join. With a <b>LEFT</b> join, customers with no orders still appear (count 0 via COALESCE).</p>`, code: { lang: 'sql', db: 'shop', code: `-- Correlated: two subqueries per customer
SELECT c.id, c.name,
       (SELECT count(*)        FROM orders o WHERE o.customer_id = c.id) AS orders,
       (SELECT max(created_at) FROM orders o WHERE o.customer_id = c.id) AS last_order
FROM customers c WHERE c.city = 'Delhi'
ORDER BY c.id LIMIT 3;

-- Rewrite: aggregate once, join the summary
SELECT c.id, c.name, COALESCE(a.orders, 0) AS orders, a.last_order
FROM customers c
LEFT JOIN (SELECT customer_id, count(*) AS orders, max(created_at) AS last_order
           FROM orders GROUP BY customer_id) a ON a.customer_id = c.id
WHERE c.city = 'Delhi'
ORDER BY c.id LIMIT 3;` } },
      { title: 'OR across columns → UNION ALL', html: `<p><code>WHERE customer_id = 42 OR created_at &gt;= '2026-09-01'</code> needs two different indexes. SQLite handles it with a ${H.c('g', 'MULTI-INDEX OR')}; PostgreSQL with BitmapOr; MySQL with index_merge — but many engines/cases fall back to a full scan. The portable rewrite is <code>UNION ALL</code> of two seekable branches, where the second branch <b>excludes</b> rows the first already returned (<code>customer_id &lt;&gt; 42</code>, and think about NULLs: if the column is nullable, use <code>customer_id IS NOT 42</code> / <code>IS DISTINCT FROM</code>). Plain <code>UNION</code> also works but pays a dedupe sort.</p>`, code: { lang: 'sql', db: 'shop', code: `EXPLAIN QUERY PLAN
SELECT id FROM orders WHERE customer_id = 42
UNION ALL
SELECT id FROM orders WHERE created_at >= '2026-09-01' AND customer_id <> 42;

SELECT
  (SELECT count(*) FROM orders WHERE customer_id = 42 OR created_at >= '2026-09-01') AS with_or,
  (SELECT count(*) FROM (SELECT id FROM orders WHERE customer_id = 42
                         UNION ALL
                         SELECT id FROM orders WHERE created_at >= '2026-09-01' AND customer_id <> 42)) AS with_union_all;` } },
      { title: 'COUNT(*) &gt; 0 → EXISTS, HAVING → WHERE', html: `<p><code>(SELECT count(*) FROM orders WHERE customer_id = ?) &gt; 0</code> counts all 10 orders to answer a yes/no question; <code>EXISTS</code> stops at the first. Similarly <code>GROUP BY customer_id HAVING customer_id &lt; 10</code> asks to filter <i>groups</i> by a grouping column — move it to <code>WHERE customer_id &lt; 10</code> so rows are skipped before grouping (SQLite actually does this push-down itself — both show the same SEARCH — but many engines and more complex HAVING clauses don't).</p>`, code: { lang: 'sql', db: 'shop', code: `SELECT c.id, c.name
FROM customers c
WHERE c.city = 'Jaipur'
  AND EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.id AND o.status = 'cancelled')
ORDER BY c.id LIMIT 5;

EXPLAIN QUERY PLAN
SELECT customer_id, count(*) FROM orders WHERE customer_id < 10 GROUP BY customer_id;` } },
      { title: 'The N+1 query problem (ORMs)', html: `<p>Code like <code>for order in orders: order.customer.name</code> issues 1 query for the orders and then <b>N</b> more, one per customer. 100 orders = 101 round-trips; at 1 ms network latency each, that's 100 ms of pure waiting even though every query is "fast". Fix: one query with a JOIN, or a second query with <code>WHERE id IN (…)</code>; in ORMs use eager loading (<code>select_related</code>/<code>prefetch_related</code> in Django, <code>joinedload</code>/<code>selectinload</code> in SQLAlchemy, <code>include</code> in Prisma, <code>JOIN FETCH</code> / entity graphs in JPA). Detect it by counting queries per request in logs or APM traces.</p>`, code: { lang: 'sql', db: 'shop', code: `-- Instead of 1 + N queries, fetch the page and its customers in ONE query
SELECT o.id, o.total_cents, c.name
FROM orders o
JOIN customers c ON c.id = o.customer_id
WHERE o.status = 'pending'
ORDER BY o.id
LIMIT 10;` } },
      { title: 'CTEs: inlined or materialized?', html: `<p>In PostgreSQL ≤ 11 every <code>WITH</code> was an <b>optimization fence</b>: computed in full, then filtered — so <code>WITH x AS (SELECT * FROM orders) SELECT … FROM x WHERE id = 42</code> read the whole table. Since PostgreSQL 12, a non-recursive, side-effect-free CTE referenced <b>once</b> is inlined like a subquery; you can force either behaviour with <code>AS MATERIALIZED</code> / <code>AS NOT MATERIALIZED</code>. SQLite also inlines when it can (plan shows a co-routine or the base table directly) and materializes CTEs used more than once. Materializing on purpose is a valid trick when an expensive CTE is reused several times.</p>`, code: { lang: 'sql', check: false, code: `-- PostgreSQL 12+
WITH recent AS NOT MATERIALIZED (       -- let the planner push filters inside
  SELECT * FROM orders WHERE created_at >= now() - interval '30 days'
)
SELECT * FROM recent WHERE customer_id = 42;

WITH heavy AS MATERIALIZED (             -- compute once, reuse twice
  SELECT customer_id, sum(total_cents) AS spend FROM orders GROUP BY customer_id
)
SELECT * FROM heavy WHERE spend > (SELECT avg(spend) * 2 FROM heavy);` } }
    ],
    deepDive: `<h4>What the planner rewrites for you (and what it can't)</h4>
<ul>
<li><b>Done automatically</b> by most mature engines: subquery flattening (derived tables, views), predicate push-down into subqueries and through joins, constant folding, <code>IN (subquery)</code> / <code>EXISTS</code> → semi-join, <code>NOT EXISTS</code> → anti-join (PostgreSQL, SQL Server, Oracle, MySQL 8.0.17+), outer join → inner join when a WHERE rejects NULLs, join elimination (dropping a LEFT JOIN to a unique key whose columns aren't used — PG, SQL Server, Oracle), redundant DISTINCT removal on unique keys, OR → IN for one column.</li>
<li><b>Not done</b> (needs you): turning OFFSET into keyset (changes the API contract), <code>NOT IN</code> → <code>NOT EXISTS</code> when NULLs are possible (different semantics!), splitting OR across columns in engines without index merge, pre-aggregating before a join (some engines do "eager aggregation", most don't), removing <code>SELECT *</code>, fixing non-sargable predicates, batching N+1 queries in application code.</li>
</ul>
<h4>Proving equivalence</h4>
<p>For any rewrite on real data: <code>(A EXCEPT B)</code> and <code>(B EXCEPT A)</code> must both be empty — and remember EXCEPT removes duplicates, so also compare <code>count(*)</code>. Think through the special cases explicitly: NULLs (NOT IN, <code>&lt;&gt;</code>, outer joins), duplicates (join fan-out vs semi-join), ties in ORDER BY + LIMIT (non-deterministic results — always add a unique tie-breaker), time zones and half-open ranges, integer vs decimal division, collation and case.</p>
<h4>Window functions vs self-joins</h4>
<p>"Latest order per customer" written as a correlated <code>created_at = (SELECT max(...))</code> runs a subquery per row; <code>ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY created_at DESC)</code> does one sorted pass (or uses an index on <code>(customer_id, created_at)</code> to avoid the sort). For "top 1 per group" with few groups and an index, a <b>lateral join</b> (<code>CROSS JOIN LATERAL (… ORDER BY created_at DESC LIMIT 1)</code> in PG) or a loose index scan can be fastest of all.</p>
<h4>When to stop rewriting</h4><p>If the plan is already a few index seeks returning a handful of rows, further rewriting is noise. Big wins come from changing the <i>shape</i> of the work (scan → seek, per-row → set-based, quadratic → linear, N round-trips → 1); micro-tweaks rarely matter. And sometimes the right answer isn't a rewrite at all: an index, fresher statistics, a materialized view, a summary table, or caching.</p>`,
    aiEra: `<p><b>What AI changes:</b> Rewriting is where AI assistants shine — give them a slow query and they will propose CTEs, semi-joins, window functions and keyset pagination in seconds. Database tools now bundle "AI query optimization" that suggests rewrites and indexes from the plan.</p>
<p><b>Use AI as a partner:</b> ask for <i>several</i> candidate rewrites, then make the database the judge: run each through EXPLAIN (ANALYZE) and an EXCEPT-both-ways equivalence check. Ask the AI explicitly: "list every case (NULLs, duplicates, ties, time zones) where your rewrite could return different rows".</p>
<p><b>Where AI goes wrong:</b> NOT IN ↔ NOT EXISTS swaps that change results with NULLs; dropping DISTINCT when duplicates were real; "always use EXISTS" advice (the viz shows it can be slower on SQLite); keyset pagination on a non-unique sort key (skips rows); assuming every engine inlines CTEs.</p>
<p><b>What you must still own:</b> proving equivalence, measuring on realistic data, and choosing the simplest rewrite that changes the <i>shape</i> of the work.</p>`,
    problems: [
      {
        title: 'Infinite scroll that slows down page after page', level: 'Hard', tags: ['keyset pagination', 'OFFSET', 'row values', 'rewrite'], companies: ['Meta', 'Twitter/X', 'LinkedIn', 'Instagram'],
        statement: `<p>The "all orders" admin screen uses infinite scroll, newest first, 20 per page:</p><pre>SELECT id, created_at, total_cents FROM orders
ORDER BY created_at DESC, id DESC
LIMIT 20 OFFSET :page * 20;</pre><p>Deep pages get slower and, while new orders are arriving, users report <b>duplicate rows</b> between pages. Rewrite it so every page costs the same and new inserts can't shift the pages. Show page 146 both ways and prove they return the same rows.</p>`,
        constraints: `SQLite <code>shop</code>; index <code>idx_orders_created(created_at)</code> exists (its entries also carry the rowid = <code>id</code>); the API may return the last row's keys to the client.`,
        example: `<p>Page 145 ends with ${H.c('b', "(created_at = '2025-01-22 15:09:07', id = 2353)")}. Page 146 via keyset: <code>WHERE (created_at, id) &lt; ('2025-01-22 15:09:07', 2353)</code> → same 20 rows as <code>OFFSET 2900</code>. Measured: OFFSET 2900 ≈ ${H.c('r', '8,871')} VM steps, keyset ≈ ${H.c('g', '246')}.</p>`,
        brute: { why: `<p>OFFSET makes the engine produce and throw away <code>page × 20</code> rows before returning anything — cost grows linearly per page and quadratically for a full scroll. And because positions are counted at query time, an order inserted at the top shifts everything down by one: the first row of the next page is the last row you already saw (duplicate), or a row is skipped after a delete.</p>`, code: { lang: 'sql', db: 'shop', code: `EXPLAIN QUERY PLAN
SELECT id, created_at, total_cents FROM orders
ORDER BY created_at DESC, id DESC
LIMIT 20 OFFSET 2900;            -- SCAN orders USING INDEX idx_orders_created (walks 2,920 entries)

SELECT id, created_at, total_cents FROM orders
ORDER BY created_at DESC, id DESC
LIMIT 20 OFFSET 2900;` } },
        mcq: { q: 'Why must the keyset include <code>id</code> and not only <code>created_at</code>?', options: ['To make the sort key unique so no row is skipped or repeated when timestamps tie', 'Because SQLite cannot compare timestamps', 'To make the index covering', 'It doesn\'t matter'], answer: 0, explain: 'If two orders share a created_at and the page boundary falls between them, WHERE created_at < :last skips the second one (or <= repeats the first). Adding a unique tie-breaker (id) makes the order total and the cursor exact.' },
        hints: [`<p>Hint 1: Instead of "skip N rows", say "give me the rows that come <b>after the last one I saw</b>" in the sort order.</p>`, `<p>Hint 2: The sort is <code>(created_at DESC, id DESC)</code>, so "after" means <code>(created_at, id) &lt; (:last_created_at, :last_id)</code>. SQLite (3.15+), PostgreSQL and MySQL support row-value comparisons; otherwise expand to <code>created_at &lt; :t OR (created_at = :t AND id &lt; :i)</code>.</p>`, `<p>Hint 3: Check the plan seeks <code>idx_orders_created</code> (no OFFSET walk), then prove equality with EXCEPT both ways. Recipe: get the last row of page 145, write the keyset query, compare.</p>`],
        tests: { engine: 'sqlite', check: '(rows, cols, c) => {\n  if (c.plan || c.noplan) { const d = rows.map(r => r[r.length - 1]).join(\'\\n\'); return (!c.plan || new RegExp(c.plan).test(d)) && (!c.noplan || !new RegExp(c.noplan).test(d)); }\n  let a = rows, b = c.rows || [];\n  if (c.set) { const k = r => JSON.stringify(r); a = a.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); b = b.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); }\n  return a.length === b.length && a.every((r, i) => r.length === b[i].length && r.every((v, j) => v === b[i][j] || (typeof v === \'number\' && typeof b[i][j] === \'number\' && Math.abs(v - b[i][j]) < 1e-6)));\n}', cases: [
          { rows: [
              [0, 0]
            ] },
          { after: 'SELECT id, created_at, total_cents FROM orders WHERE (created_at, id) < (\'2025-01-22 15:09:07\', 2353) ORDER BY created_at DESC, id DESC LIMIT 20', rows: [
              [433, '2025-01-22 13:01:07', 9427],
              [1713, '2025-01-22 06:26:27', 5747],
              [2820, '2025-01-21 18:53:00', 12080],
              [900, '2025-01-21 16:45:00', 7600],
              [2180, '2025-01-21 10:10:20', 3920],
              [260, '2025-01-21 08:02:20', 19440],
              [1540, '2025-01-21 01:27:40', 15760],
              [1367, '2025-01-20 20:28:53', 5773],
              [2647, '2025-01-20 13:54:13', 2093],
              [727, '2025-01-20 11:46:13', 17613],
              [2007, '2025-01-20 05:11:33', 13933],
              [87, '2025-01-20 03:03:33', 9453],
              [1194, '2025-01-19 15:30:06', 15786],
              [2474, '2025-01-19 08:55:26', 12106],
              [554, '2025-01-19 06:47:26', 7626],
              [1834, '2025-01-19 00:12:46', 3946],
              [1661, '2025-01-18 19:13:59', 13959],
              [2941, '2025-01-18 12:39:19', 10279],
              [1021, '2025-01-18 10:31:19', 5799],
              [2301, '2025-01-18 03:56:39', 2119]
            ] },
          { rows: [], plan: 'SEARCH orders USING INDEX idx_orders_created \\(created_at<\\?\\)', noplan: null, after: 'EXPLAIN QUERY PLAN SELECT id, created_at, total_cents FROM orders WHERE (created_at, id) < (\'2025-01-22 15:09:07\', 2353) ORDER BY created_at DESC, id DESC LIMIT 20' },
          { setup: 'INSERT INTO orders VALUES (9201,1,\'paid\',\'2026-12-31 00:00:01\',100),(9202,1,\'paid\',\'2026-12-31 00:00:02\',200),(9203,1,\'paid\',\'2026-12-31 00:00:03\',300),(9204,1,\'paid\',\'2026-12-31 00:00:04\',400),(9205,1,\'paid\',\'2026-12-31 00:00:05\',500)', rows: [
              [5, 5]
            ] },
          { setup: 'INSERT INTO orders VALUES (9300,1,\'paid\',\'2025-01-22 15:09:07\',5)', rows: [
              [1, 1]
            ] },
          { setup: 'DELETE FROM orders', rows: [
              [0, 0]
            ] },
          { setup: 'INSERT INTO orders VALUES (9201,1,\'paid\',\'2026-12-31 00:00:01\',100),(9202,1,\'paid\',\'2026-12-31 00:00:02\',200),(9203,1,\'paid\',\'2026-12-31 00:00:03\',300),(9204,1,\'paid\',\'2026-12-31 00:00:04\',400),(9205,1,\'paid\',\'2026-12-31 00:00:05\',500)', after: 'SELECT id, created_at, total_cents FROM orders WHERE (created_at, id) < (\'2025-01-22 15:09:07\', 2353) ORDER BY created_at DESC, id DESC LIMIT 20', rows: [
              [433, '2025-01-22 13:01:07', 9427],
              [1713, '2025-01-22 06:26:27', 5747],
              [2820, '2025-01-21 18:53:00', 12080],
              [900, '2025-01-21 16:45:00', 7600],
              [2180, '2025-01-21 10:10:20', 3920],
              [260, '2025-01-21 08:02:20', 19440],
              [1540, '2025-01-21 01:27:40', 15760],
              [1367, '2025-01-20 20:28:53', 5773],
              [2647, '2025-01-20 13:54:13', 2093],
              [727, '2025-01-20 11:46:13', 17613],
              [2007, '2025-01-20 05:11:33', 13933],
              [87, '2025-01-20 03:03:33', 9453],
              [1194, '2025-01-19 15:30:06', 15786],
              [2474, '2025-01-19 08:55:26', 12106],
              [554, '2025-01-19 06:47:26', 7626],
              [1834, '2025-01-19 00:12:46', 3946],
              [1661, '2025-01-18 19:13:59', 13959],
              [2941, '2025-01-18 12:39:19', 10279],
              [1021, '2025-01-18 10:31:19', 5799],
              [2301, '2025-01-18 03:56:39', 2119]
            ] },
          { after: 'SELECT id, created_at FROM orders ORDER BY created_at DESC, id DESC LIMIT 1 OFFSET 2899', rows: [
              [2353, '2025-01-22 15:09:07']
            ] }
        ] },
        solution: {
          approach: `<p><b>Keyset (seek) pagination.</b> The client sends back the sort key of the last row it received; the next query asks for rows strictly "after" that key in the same total order and takes 20. Because <code>idx_orders_created</code> is sorted by <code>(created_at, rowid)</code>, the engine seeks straight to the boundary and reads exactly 20 entries — page 1 and page 10,000 cost the same. New orders at the top don't shift the cursor, so no duplicates or gaps. Trade-off: no "jump to page 37" (offer next/previous or date filters instead).</p>`,
          code: { lang: 'sql', db: 'shop', code: `-- 1) Last row of page 145 (in the app you'd just keep it from the previous response)
SELECT id, created_at FROM orders
ORDER BY created_at DESC, id DESC LIMIT 1 OFFSET 2899;      -- 2353 | 2025-01-22 15:09:07

-- 2) Page 146 with keyset
EXPLAIN QUERY PLAN
SELECT id, created_at, total_cents FROM orders
WHERE (created_at, id) < ('2025-01-22 15:09:07', 2353)
ORDER BY created_at DESC, id DESC
LIMIT 20;                                                    -- SEARCH orders USING INDEX idx_orders_created (created_at<?)

SELECT id, created_at, total_cents FROM orders
WHERE (created_at, id) < ('2025-01-22 15:09:07', 2353)
ORDER BY created_at DESC, id DESC
LIMIT 20;

-- 3) Equivalence proof: both differences are empty
SELECT
 (SELECT count(*) FROM (
    SELECT id FROM (SELECT id FROM orders ORDER BY created_at DESC, id DESC LIMIT 20 OFFSET 2900)
    EXCEPT
    SELECT id FROM (SELECT id FROM orders WHERE (created_at, id) < ('2025-01-22 15:09:07', 2353)
                    ORDER BY created_at DESC, id DESC LIMIT 20))) AS only_in_offset,
 (SELECT count(*) FROM (
    SELECT id FROM (SELECT id FROM orders WHERE (created_at, id) < ('2025-01-22 15:09:07', 2353)
                    ORDER BY created_at DESC, id DESC LIMIT 20)
    EXCEPT
    SELECT id FROM (SELECT id FROM orders ORDER BY created_at DESC, id DESC LIMIT 20 OFFSET 2900))) AS only_in_keyset;` },
          complexity: `<p>OFFSET page p: O(p·20) rows walked; all P pages: O(P²·20). Keyset: O(log N + 20) per page, O(N) for the whole scroll. Measured on page 146: ~8,871 vs ~246 SQLite VM instructions (36× less), and the gap grows with depth.</p>`,
          followUps: ['How do you implement a "previous page" button with keyset?', 'The ORDER BY is <code>total_cents DESC</code> (not unique, no index). What index and cursor do you need?', 'How would you expose the cursor in a REST/GraphQL API (opaque base64 cursor, Relay connections)?']
        }
      }
    ]
  });

  /* =====================================================================
     PRACTICE — Easy
     ===================================================================== */
  practice.push({
    title: 'Predict the access path, then check', level: 'Easy', tags: ['EXPLAIN QUERY PLAN', 'scan vs seek'], companies: ['Amazon', 'Infosys', 'TCS'],
    statement: `<p>Before running anything, predict whether each query will <b>SCAN</b> or <b>SEARCH</b> (and with which index), then verify with <code>EXPLAIN QUERY PLAN</code>:</p><ol><li><code>SELECT * FROM orders WHERE id = 42</code></li><li><code>SELECT * FROM orders WHERE customer_id = 42</code></li><li><code>SELECT * FROM orders WHERE total_cents &gt; 15000</code></li><li><code>SELECT count(*) FROM orders WHERE status = 'delivered'</code></li></ol>`,
    constraints: `SQLite <code>shop</code>. Indexes: PK on id, <code>idx_orders_customer</code>, <code>idx_orders_created</code>, <code>idx_orders_status_created(status, created_at)</code>.`,
    example: `<p>1 → ${H.c('g', 'SEARCH … INTEGER PRIMARY KEY')}; 2 → ${H.c('g', 'SEARCH … idx_orders_customer')}; 3 → ${H.c('r', 'SCAN orders')} (no index on total_cents); 4 → ${H.c('g', 'SEARCH … COVERING INDEX idx_orders_status_created (status=?)')} — count needs nothing but the index.</p>`,
    brute: { why: `<p>Guessing from wall-clock time: run each query and see which "feels slow". On 3,000 rows everything takes under a millisecond, so timing tells you nothing. Measured in SQLite VM steps they differ a lot (PK lookup ≈ 13, index seek ≈ 99, scan ≈ 14,000), but you only see that with the plan or a profiler.</p>`, code: { lang: 'sql', db: 'shop', code: `SELECT * FROM orders WHERE id = 42;
SELECT * FROM orders WHERE customer_id = 42;
SELECT count(*) FROM orders WHERE total_cents > 15000;
SELECT count(*) FROM orders WHERE status = 'delivered';` } },
    mcq: { q: 'Why can query 4 avoid reading the table entirely?', options: ['count(*) is cached', 'The index (status, created_at) contains every column the query needs', 'SQLite skips WHERE for count(*)', 'status is the primary key'], answer: 1, explain: 'The query only needs to test status and count entries — both possible from the index alone, so the plan says COVERING INDEX.' },
    hints: [`<p>Hint 1: For each WHERE column, ask: is there an index whose <b>first</b> column is this column?</p>`, `<p>Hint 2: The INTEGER PRIMARY KEY is the rowid — the table itself is a B-tree keyed by it, so <code>id = ?</code> is a direct lookup.</p>`, `<p>Hint 3: If the query needs only indexed columns (or count), expect "COVERING". Recipe: write the four predictions, then run four EXPLAIN QUERY PLAN statements.</p>`],
    tests: { engine: 'sqlite', check: '(rows, cols, c) => {\n  if (c.plan || c.noplan) { const d = rows.map(r => r[r.length - 1]).join(\'\\n\'); return (!c.plan || new RegExp(c.plan).test(d)) && (!c.noplan || !new RegExp(c.noplan).test(d)); }\n  let a = rows, b = c.rows || [];\n  if (c.set) { const k = r => JSON.stringify(r); a = a.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); b = b.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); }\n  return a.length === b.length && a.every((r, i) => r.length === b[i].length && r.every((v, j) => v === b[i][j] || (typeof v === \'number\' && typeof b[i][j] === \'number\' && Math.abs(v - b[i][j]) < 1e-6)));\n}', cases: [
      { rows: [], plan: 'SEARCH orders USING COVERING INDEX idx_orders_status_created \\(status=\\?\\)', noplan: undefined },
      { rows: [], plan: 'SEARCH orders USING INTEGER PRIMARY KEY \\(rowid=\\?\\)', noplan: null, after: 'EXPLAIN QUERY PLAN SELECT * FROM orders WHERE id = 42' },
      { rows: [], plan: 'SEARCH orders USING INDEX idx_orders_customer \\(customer_id=\\?\\)', noplan: null, after: 'EXPLAIN QUERY PLAN SELECT * FROM orders WHERE customer_id = 42' },
      { rows: [], plan: '^SCAN orders$', noplan: 'INDEX', after: 'EXPLAIN QUERY PLAN SELECT * FROM orders WHERE total_cents > 15000' },
      { rows: [], plan: 'SEARCH orders USING INDEX idx_t \\(total_cents>\\?\\)', noplan: null, setup: 'CREATE INDEX idx_t ON orders(total_cents)', after: 'EXPLAIN QUERY PLAN SELECT * FROM orders WHERE total_cents > 15000' },
      { rows: [], plan: null, noplan: 'status=\\?', setup: 'DROP INDEX idx_orders_status_created' },
      { after: 'SELECT count(*) FROM orders WHERE status = \'delivered\'', rows: [
          [1760]
        ] },
      { rows: [], plan: 'SEARCH orders USING INTEGER PRIMARY KEY \\(rowid>\\?\\)', noplan: null, after: 'EXPLAIN QUERY PLAN SELECT * FROM orders WHERE id > 2990' }
    ] },
    solution: {
      approach: `<p>Map each predicate to an index: <code>id</code> → rowid B-tree (cheapest), <code>customer_id</code> → <code>idx_orders_customer</code>, <code>total_cents</code> → nothing (scan), <code>status</code> → leading column of <code>idx_orders_status_created</code> and nothing else needed → covering seek.</p>`,
      code: { lang: 'sql', db: 'shop', code: `EXPLAIN QUERY PLAN SELECT * FROM orders WHERE id = 42;
EXPLAIN QUERY PLAN SELECT * FROM orders WHERE customer_id = 42;
EXPLAIN QUERY PLAN SELECT * FROM orders WHERE total_cents > 15000;
EXPLAIN QUERY PLAN SELECT count(*) FROM orders WHERE status = 'delivered';` },
      complexity: `<p>PK lookup O(log N); index seek O(log N + k) + k table lookups; scan O(N); covering seek O(log N + k) with no table access.</p>`,
      followUps: ['Which single index would turn query 3 into a seek, and would it be worth it for 826 of 3,000 rows (27%)?']
    }
  });

  practice.push({
    title: 'Un-hide the index: arithmetic on the column', level: 'Easy', tags: ['sargable', 'rewrite'], companies: ['Flipkart', 'Walmart'],
    statement: `<p>A legacy report filters with <code>WHERE customer_id + 0 = 42</code> (someone once used <code>+ 0</code> to "disable" an index during a debugging session and it was never removed). Another query uses <code>WHERE customer_id - 2 = 40</code>. Make both sargable and show the plan change.</p>`,
    constraints: `SQLite <code>shop</code>; results must stay identical (10 rows for customer 42).`,
    example: `<p>${H.c('r', 'SCAN orders')} (≈12,000 VM steps) → ${H.c('g', 'SEARCH orders USING INDEX idx_orders_customer (customer_id=?)')} (≈100 VM steps). Same 10 rows.</p>`,
    brute: { why: `<p>Any expression around the column (<code>+ 0</code>, <code>- 2</code>, <code>* 1</code>, <code>abs()</code>) means the engine must compute it for every row before comparing — the index is sorted by <code>customer_id</code>, not by <code>customer_id + 0</code>. All 3,000 rows are read to return 10.</p>`, code: { lang: 'sql', db: 'shop', code: `EXPLAIN QUERY PLAN SELECT * FROM orders WHERE customer_id + 0 = 42;
EXPLAIN QUERY PLAN SELECT * FROM orders WHERE customer_id - 2 = 40;
SELECT count(*) FROM orders WHERE customer_id - 2 = 40;` } },
    mcq: { q: 'Which predicate is sargable?', options: ['<code>customer_id - 2 = 40</code>', '<code>customer_id = 40 + 2</code>', '<code>abs(customer_id) = 42</code>', '<code>customer_id * 1 = 42</code>'], answer: 1, explain: 'Arithmetic on the constant side is folded once; the bare column is compared with a value, so the index can seek.' },
    hints: [`<p>Hint 1: Algebra: move everything that isn't the bare column to the other side of the comparison.</p>`, `<p>Hint 2: <code>customer_id - 2 = 40</code> ⇔ <code>customer_id = 42</code>. With integers this is exact.</p>`, `<p>Hint 3: Verify with EXPLAIN and a count comparison. (In SQLite the unary <code>+</code> trick, <code>WHERE +customer_id = 42</code>, is the documented way to <i>deliberately</i> disable an index — useful in experiments, never in production by accident.)</p>`],
    tests: { engine: 'sqlite', check: '(rows, cols, c) => {\n  if (c.plan || c.noplan) { const d = rows.map(r => r[r.length - 1]).join(\'\\n\'); return (!c.plan || new RegExp(c.plan).test(d)) && (!c.noplan || !new RegExp(c.noplan).test(d)); }\n  let a = rows, b = c.rows || [];\n  if (c.set) { const k = r => JSON.stringify(r); a = a.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); b = b.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); }\n  return a.length === b.length && a.every((r, i) => r.length === b[i].length && r.every((v, j) => v === b[i][j] || (typeof v === \'number\' && typeof b[i][j] === \'number\' && Math.abs(v - b[i][j]) < 1e-6)));\n}', cases: [
      { rows: [
          [10, 10]
        ] },
      { rows: [], plan: 'SEARCH orders USING INDEX idx_orders_customer \\(customer_id=\\?\\)', noplan: 'SCAN', after: 'EXPLAIN QUERY PLAN SELECT * FROM orders WHERE customer_id = 42' },
      { rows: [], plan: '^SCAN orders$', noplan: 'idx_orders_customer', after: 'EXPLAIN QUERY PLAN SELECT * FROM orders WHERE customer_id + 0 = 42' },
      { rows: [], plan: '^SCAN orders$', noplan: 'idx_orders_customer', after: 'EXPLAIN QUERY PLAN SELECT * FROM orders WHERE customer_id - 2 = 40' },
      { setup: 'INSERT INTO orders VALUES (9001,42,\'paid\',\'2026-01-01 00:00:00\',1)', rows: [
          [11, 11]
        ] },
      { setup: 'DELETE FROM orders WHERE customer_id = 42', rows: [
          [0, 0]
        ] },
      { setup: 'UPDATE orders SET customer_id = 42 WHERE id <= 5', rows: [
          [15, 15]
        ] },
      { after: 'SELECT count(*) FROM orders WHERE customer_id + 0 = 42', rows: [
          [10]
        ] }
    ] },
    solution: {
      approach: `<p>Rewrite both as <code>customer_id = 42</code>. The column now stands alone, so the planner seeks <code>idx_orders_customer</code> straight to the 10 entries. Integer addition/subtraction is exactly invertible, so the results are identical.</p>`,
      code: { lang: 'sql', db: 'shop', code: `EXPLAIN QUERY PLAN SELECT * FROM orders WHERE customer_id = 42;
SELECT
  (SELECT count(*) FROM orders WHERE customer_id - 2 = 40) AS old_count,
  (SELECT count(*) FROM orders WHERE customer_id = 42)     AS new_count;` },
      complexity: `<p>O(N) → O(log N + 10).</p>`,
      followUps: ['Why is <code>price * 1.18 &gt; 1000</code> → <code>price &gt; 1000 / 1.18</code> riskier than the integer case?']
    }
  });

  practice.push({
    title: 'Case-insensitive login lookup', level: 'Easy', tags: ['expression index', 'sargable'], companies: ['Google', 'Okta', 'Auth0'],
    statement: `<p>Login must match emails case-insensitively. The query is <code>SELECT id, email FROM customers WHERE lower(email) = lower(:input)</code>. There is a UNIQUE index on <code>email</code>, but the plan is a full scan. Fix it <b>without changing the query</b>.</p>`,
    constraints: `SQLite <code>shop</code>; input example <code>'USER7@Mail.com'</code>; exactly one row expected.`,
    example: `<p>Before: ${H.c('r', 'SCAN customers')}. After: ${H.c('g', 'SEARCH customers USING INDEX idx_customers_email_lower (&lt;expr&gt;=?)')} → row <code>7 | user7@mail.com</code>.</p>`,
    brute: { why: `<p><code>lower(email)</code> is computed for each of the 320 customers on every login. The UNIQUE index stores raw emails in case-sensitive order, so it can't help. At 50M users and 1,000 logins/second, that's 5×10<sup>10</sup> lower() calls per second — impossible.</p>`, code: { lang: 'sql', db: 'shop', code: `EXPLAIN QUERY PLAN
SELECT id, email FROM customers WHERE lower(email) = lower('USER7@Mail.com');
SELECT id, email FROM customers WHERE lower(email) = lower('USER7@Mail.com');` } },
    mcq: { q: 'For an expression index to be used, the query must…', options: ['use exactly the same expression as the index', 'use the raw column', 'add INDEXED BY', 'run ANALYZE first'], answer: 0, explain: 'The planner matches the expression textually/structurally: an index on lower(email) serves WHERE lower(email) = ?, not upper(email) or email COLLATE NOCASE.' },
    hints: [`<p>Hint 1: You can't change the query, so change what the index stores: index the <b>expression</b>, not the column.</p>`, `<p>Hint 2: <code>CREATE INDEX … ON customers(lower(email))</code> works in SQLite, PostgreSQL (<code>((lower(email)))</code>) and MySQL 8.0.13+ (functional key part).</p>`, `<p>Hint 3: Alternatives worth naming: store emails normalised at write time, a <code>COLLATE NOCASE</code> column/index (SQLite), <code>citext</code> (PostgreSQL), or a case-insensitive collation (MySQL default). Recipe: create index → EXPLAIN → run.</p>`],
    tests: { engine: 'sqlite', check: '(rows, cols, c) => {\n  if (c.plan || c.noplan) { const d = rows.map(r => r[r.length - 1]).join(\'\\n\'); return (!c.plan || new RegExp(c.plan).test(d)) && (!c.noplan || !new RegExp(c.noplan).test(d)); }\n  let a = rows, b = c.rows || [];\n  if (c.set) { const k = r => JSON.stringify(r); a = a.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); b = b.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); }\n  return a.length === b.length && a.every((r, i) => r.length === b[i].length && r.every((v, j) => v === b[i][j] || (typeof v === \'number\' && typeof b[i][j] === \'number\' && Math.abs(v - b[i][j]) < 1e-6)));\n}', cases: [
      { rows: [
          [7, 'user7@mail.com']
        ] },
      { rows: [], plan: 'SEARCH customers USING INDEX idx_customers_email_lower \\(<expr>=\\?\\)', noplan: 'SCAN', after: 'EXPLAIN QUERY PLAN SELECT id, email FROM customers WHERE lower(email) = lower(\'USER7@Mail.com\')' },
      { setup: 'UPDATE customers SET email = \'USER7@MAIL.COM\' WHERE id = 7', rows: [
          [7, 'USER7@MAIL.COM']
        ] },
      { setup: 'DELETE FROM customers WHERE id = 7', after: 'SELECT count(*) FROM (SELECT id, email FROM customers WHERE lower(email) = lower(\'USER7@Mail.com\'))', rows: [
          [0]
        ] },
      { after: 'SELECT id, email FROM customers WHERE lower(email) = lower(\'uSeR320@MAIL.com\')', rows: [
          [320, 'user320@mail.com']
        ] },
      { after: 'SELECT id, email FROM customers WHERE lower(email) = lower(\'nobody@mail.com\')', rows: [] },
      { setup: 'INSERT INTO customers VALUES (900,\'User7@Mail.com\',\'Dup\',\'Pune\',\'2024-01-01\',NULL)', error: 'UNIQUE' },
      { setup: 'UPDATE customers SET email = \'Ünï@Mail.com\' WHERE id = 8', after: 'SELECT id FROM customers WHERE lower(email) = lower(\'Ünï@Mail.com\')', rows: [
          [8]
        ] }
    ] },
    solution: {
      approach: `<p>Create an <b>expression index</b> on <code>lower(email)</code>. The right-hand side <code>lower('USER7@Mail.com')</code> is a constant, folded once; the left side matches the indexed expression exactly, so SQLite seeks the index. Consider making it <code>UNIQUE</code> too, so two accounts can't differ only by case.</p>`,
      code: { lang: 'sql', db: 'shop', code: `CREATE UNIQUE INDEX idx_customers_email_lower ON customers(lower(email));

EXPLAIN QUERY PLAN
SELECT id, email FROM customers WHERE lower(email) = lower('USER7@Mail.com');
SELECT id, email FROM customers WHERE lower(email) = lower('USER7@Mail.com');` },
      complexity: `<p>O(N) → O(log N). Cost: one more index to maintain on insert/update of email.</p>`,
      followUps: ['What does <code>lower()</code> do with non-ASCII letters like "İ" in SQLite vs PostgreSQL?']
    }
  });

  practice.push({
    title: 'Yes/no questions: COUNT vs EXISTS', level: 'Easy', tags: ['EXISTS', 'rewrite', 'early exit'], companies: ['Uber', 'Ola'],
    statement: `<p>The app checks "does customer 36 have any cancelled order?" with <code>SELECT count(*) &gt; 0 FROM orders WHERE customer_id = 36 AND status = 'cancelled'</code>. Rewrite it so the engine can stop at the first match, and compare the work.</p>`,
    constraints: `SQLite <code>shop</code>; answer is 1 (true).`,
    example: `<p>Both return ${H.c('g', '1')}. Measured: count version ≈ 79 VM steps (visits all 10 orders of the customer), EXISTS ≈ 25 (stops at the first cancelled one). For a customer with 100,000 orders the gap is 100,000 : 1.</p>`,
    brute: { why: `<p><code>count(*)</code> must visit <b>every</b> matching row to produce an exact number, even though the caller only needs "zero or not zero". Work grows with the number of matches.</p>`, code: { lang: 'sql', db: 'shop', code: `SELECT count(*) > 0 AS has_cancelled
FROM orders WHERE customer_id = 36 AND status = 'cancelled';` } },
    mcq: { q: 'Why can EXISTS be cheaper than count(*) &gt; 0?', options: ['EXISTS uses a different index', 'EXISTS can stop after the first qualifying row', 'count(*) ignores indexes', 'EXISTS skips the WHERE clause'], answer: 1, explain: 'EXISTS is a semi-join / short-circuit: the moment one row qualifies, the answer is known.' },
    hints: [`<p>Hint 1: The question is boolean. Which SQL construct answers "is there at least one?" directly?</p>`, `<p>Hint 2: <code>SELECT EXISTS (SELECT 1 FROM … WHERE …)</code> returns 1 or 0.</p>`, `<p>Hint 3: Bonus: an index on <code>(customer_id, status)</code> would make even the first match a direct seek. Recipe: rewrite → EXPLAIN → run.</p>`],
    tests: { engine: 'sqlite', check: '(rows, cols, c) => {\n  if (c.plan || c.noplan) { const d = rows.map(r => r[r.length - 1]).join(\'\\n\'); return (!c.plan || new RegExp(c.plan).test(d)) && (!c.noplan || !new RegExp(c.noplan).test(d)); }\n  let a = rows, b = c.rows || [];\n  if (c.set) { const k = r => JSON.stringify(r); a = a.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); b = b.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); }\n  return a.length === b.length && a.every((r, i) => r.length === b[i].length && r.every((v, j) => v === b[i][j] || (typeof v === \'number\' && typeof b[i][j] === \'number\' && Math.abs(v - b[i][j]) < 1e-6)));\n}', cases: [
      { rows: [
          [1]
        ] },
      { setup: 'DELETE FROM orders WHERE customer_id = 36 AND status = \'cancelled\'', rows: [
          [0]
        ] },
      { setup: 'DELETE FROM orders WHERE customer_id = 36', rows: [
          [0]
        ] },
      { setup: 'UPDATE orders SET status = \'cancelled\' WHERE customer_id = 36', rows: [
          [1]
        ] },
      { setup: 'UPDATE orders SET status = \'Cancelled\' WHERE customer_id = 36', rows: [
          [0]
        ] },
      { after: 'SELECT EXISTS (SELECT 1 FROM orders WHERE customer_id = 1 AND status = \'cancelled\')', rows: [
          [0]
        ] },
      { after: 'SELECT EXISTS (SELECT 1 FROM orders WHERE customer_id = 2 AND status = \'cancelled\')', rows: [
          [0]
        ] },
      { after: 'SELECT EXISTS (SELECT 1 FROM orders WHERE customer_id = 999 AND status = \'cancelled\')', rows: [
          [0]
        ] },
      { rows: [], plan: 'SEARCH orders USING (COVERING )?INDEX idx_orders_(customer|status_created)', noplan: null, after: 'EXPLAIN QUERY PLAN SELECT EXISTS (SELECT 1 FROM orders WHERE customer_id = 36 AND status = \'cancelled\')' }
    ] },
    solution: {
      approach: `<p>Use <code>EXISTS</code>. The subquery seeks <code>idx_orders_customer</code> for customer 36 and returns as soon as one row has <code>status = 'cancelled'</code>. Same answer, work bounded by "position of the first match" instead of "number of matches".</p>`,
      code: { lang: 'sql', db: 'shop', code: `EXPLAIN QUERY PLAN
SELECT EXISTS (SELECT 1 FROM orders WHERE customer_id = 36 AND status = 'cancelled');
SELECT EXISTS (SELECT 1 FROM orders WHERE customer_id = 36 AND status = 'cancelled') AS has_cancelled;` },
      complexity: `<p>count: O(log N + k) for k matches; EXISTS: O(log N + position of first match).</p>`,
      followUps: ['Rewrite "customers with more than 0 orders" as a semi-join for all customers.']
    }
  });

  /* =====================================================================
     PRACTICE — Medium
     ===================================================================== */
  practice.push({
    title: 'The integer-division trap', level: 'Medium', tags: ['sargable', 'equivalence', 'rewrite'], companies: ['Stripe', 'Razorpay'],
    statement: `<p>A finance query uses <code>WHERE total_cents / 100 &gt; 150</code> ("orders above ₹150"). A colleague "optimized" it to <code>WHERE total_cents &gt; 15000</code> and created an index on <code>total_cents</code>. The numbers in the report changed. Find the bug and write a rewrite that is both sargable and <b>exactly</b> equivalent.</p>`,
    constraints: `SQLite <code>shop</code>; <code>total_cents</code> is a non-negative INTEGER, so <code>/</code> is integer division.`,
    example: `<p>Original: ${H.c('b', '811')} rows. Colleague's version: ${H.c('r', '826')} rows (15 extra: totals 15001–15099, where total/100 = 150, not &gt; 150). Correct rewrite <code>total_cents &gt;= 15100</code>: ${H.c('g', '811')} rows, with a covering seek.</p>`,
    brute: { why: `<p>The original is correct but non-sargable: it computes <code>total_cents / 100</code> for all 3,000 rows (≈12,800 VM steps). The colleague's rewrite is fast but <b>wrong</b>: it treats integer division like real division.</p>`, code: { lang: 'sql', db: 'shop', code: `SELECT
  (SELECT count(*) FROM orders WHERE total_cents / 100 > 150) AS original,
  (SELECT count(*) FROM orders WHERE total_cents > 15000)     AS colleague;` } },
    mcq: { q: 'For non-negative integers, <code>x / 100 &gt; 150</code> (integer division) is equivalent to…', options: ['x &gt; 15000', 'x &gt;= 15000', 'x &gt;= 15100', 'x &gt; 15099.99'], answer: 2, explain: 'x / 100 > 150 ⇔ x / 100 ≥ 151 ⇔ x ≥ 15100 for non-negative integers (division truncates).' },
    hints: [`<p>Hint 1: Integer division truncates: 15,099 / 100 = 150, which is <b>not</b> &gt; 150.</p>`, `<p>Hint 2: <code>x / 100 &gt; 150</code> ⇔ <code>x / 100 ≥ 151</code> ⇔ smallest such x is 151 × 100.</p>`, `<p>Hint 3: Always prove a rewrite with counts (or EXCEPT both ways). Recipe: compute the correct bound, add index, EXPLAIN, compare counts.</p>`],
    tests: { engine: 'sqlite', check: '(rows, cols, c) => {\n  if (c.plan || c.noplan) { const d = rows.map(r => r[r.length - 1]).join(\'\\n\'); return (!c.plan || new RegExp(c.plan).test(d)) && (!c.noplan || !new RegExp(c.noplan).test(d)); }\n  let a = rows, b = c.rows || [];\n  if (c.set) { const k = r => JSON.stringify(r); a = a.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); b = b.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); }\n  return a.length === b.length && a.every((r, i) => r.length === b[i].length && r.every((v, j) => v === b[i][j] || (typeof v === \'number\' && typeof b[i][j] === \'number\' && Math.abs(v - b[i][j]) < 1e-6)));\n}', cases: [
      { rows: [
          [811, 811]
        ] },
      { rows: [], plan: 'SEARCH orders USING COVERING INDEX idx_orders_total \\(total_cents>\\?\\)', noplan: 'SCAN', after: 'EXPLAIN QUERY PLAN SELECT count(*) FROM orders WHERE total_cents >= 15100' },
      { setup: 'DELETE FROM orders; INSERT INTO orders VALUES (1,1,\'x\',\'2025-01-01\',15000),(2,1,\'x\',\'2025-01-01\',15099),(3,1,\'x\',\'2025-01-01\',15100),(4,1,\'x\',\'2025-01-01\',15199),(5,1,\'x\',\'2025-01-01\',15200)', rows: [
          [3, 3]
        ] },
      { setup: 'DELETE FROM orders; INSERT INTO orders VALUES (1,1,\'x\',\'2025-01-01\',15099)', rows: [
          [0, 0]
        ] },
      { setup: 'DELETE FROM orders; INSERT INTO orders VALUES (1,1,\'x\',\'2025-01-01\',15100)', rows: [
          [1, 1]
        ] },
      { setup: 'DELETE FROM orders; INSERT INTO orders VALUES (1,1,\'x\',\'2025-01-01\',0),(2,1,\'x\',\'2025-01-01\',1),(3,1,\'x\',\'2025-01-01\',99),(4,1,\'x\',\'2025-01-01\',100),(5,1,\'x\',\'2025-01-01\',149),(6,1,\'x\',\'2025-01-01\',150)', rows: [
          [0, 0]
        ] },
      { setup: 'DELETE FROM orders', rows: [
          [0, 0]
        ] },
      { after: 'SELECT count(*) FROM orders WHERE total_cents > 15000', rows: [
          [826]
        ] }
    ] },
    solution: {
      approach: `<p>Solve the inequality under integer semantics: <code>total_cents / 100 &gt; 150</code> ⇔ <code>total_cents ≥ 15100</code> (for non-negative values; negatives truncate toward zero and would need separate care). With an index on <code>total_cents</code> the count becomes a covering range seek (~1,600 VM steps vs ~12,800), and the result matches the original exactly.</p>`,
      code: { lang: 'sql', db: 'shop', code: `CREATE INDEX idx_orders_total ON orders(total_cents);

EXPLAIN QUERY PLAN SELECT count(*) FROM orders WHERE total_cents >= 15100;

SELECT
  (SELECT count(*) FROM orders WHERE total_cents / 100 > 150) AS original,
  (SELECT count(*) FROM orders WHERE total_cents >= 15100)    AS rewrite;` },
      complexity: `<p>O(N) with N divisions → O(log N + k) covering range. Correctness check: both counts = 811.</p>`,
      followUps: ['What changes for <code>total_cents / 100.0 &gt; 150</code> (real division)?', 'How do NULL totals affect each version?']
    }
  });

  practice.push({
    title: 'Last-30-days dashboard tile', level: 'Medium', tags: ['sargable', 'covering index', 'dates'], companies: ['Shopify', 'Swiggy'],
    statement: `<p>A tile shows "orders and revenue in the last 30 days" (today = 2026-10-14):</p><pre>SELECT count(*), sum(total_cents) FROM orders
WHERE julianday('2026-10-14') - julianday(created_at) &lt; 30;</pre><p>Make it sargable, then make it <b>index-only</b>.</p>`,
    constraints: `SQLite <code>shop</code>; same count (89) and sum (938,083) as the original; one new index allowed.`,
    example: `<p>Original: ${H.c('r', 'SCAN orders')}. Final: ${H.c('g', 'SEARCH orders USING COVERING INDEX idx_orders_created_total (created_at&gt;?)')} → ≈376 VM steps.</p>`,
    brute: { why: `<p>Two <code>julianday()</code> calls per row for all 3,000 rows, then a subtraction and comparison — the column is buried in arithmetic, so <code>idx_orders_created</code> is useless. Then each matching row's <code>total_cents</code> is read from the table.</p>`, code: { lang: 'sql', db: 'shop', code: `EXPLAIN QUERY PLAN
SELECT count(*), sum(total_cents) FROM orders
WHERE julianday('2026-10-14') - julianday(created_at) < 30;
SELECT count(*), sum(total_cents) FROM orders
WHERE julianday('2026-10-14') - julianday(created_at) < 30;` } },
    mcq: { q: 'Which index makes the sargable version index-only?', options: ['(total_cents, created_at)', '(created_at, total_cents)', '(created_at) alone', '(customer_id, created_at)'], answer: 1, explain: 'created_at first for the range seek; total_cents as a passenger so sum() never touches the table.' },
    hints: [`<p>Hint 1: Compute the boundary once: rows newer than <code>datetime('2026-10-14', '-30 days')</code>.</p>`, `<p>Hint 2: Check equivalence carefully: <code>julianday(today) - julianday(ts) &lt; 30</code> means ts &gt; today − 30 days (as a datetime). Compare counts to be sure your boundary matches on this data.</p>`, `<p>Hint 3: Then add <code>total_cents</code> to an index led by <code>created_at</code> so <code>sum()</code> reads only index entries. Recipe: rewrite → compare → index → EXPLAIN.</p>`],
    tests: { engine: 'sqlite', check: '(rows, cols, c) => {\n  if (c.plan || c.noplan) { const d = rows.map(r => r[r.length - 1]).join(\'\\n\'); return (!c.plan || new RegExp(c.plan).test(d)) && (!c.noplan || !new RegExp(c.noplan).test(d)); }\n  let a = rows, b = c.rows || [];\n  if (c.set) { const k = r => JSON.stringify(r); a = a.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); b = b.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); }\n  return a.length === b.length && a.every((r, i) => r.length === b[i].length && r.every((v, j) => v === b[i][j] || (typeof v === \'number\' && typeof b[i][j] === \'number\' && Math.abs(v - b[i][j]) < 1e-6)));\n}', cases: [
      { rows: [
          ['89 / 938083', '89 / 938083']
        ] },
      { rows: [], plan: 'SEARCH orders USING COVERING INDEX idx_orders_created_total \\(created_at>\\?\\)', noplan: 'SCAN', after: 'EXPLAIN QUERY PLAN SELECT count(*), sum(total_cents) FROM orders WHERE created_at > datetime(\'2026-10-14\', \'-30 days\')' },
      { setup: 'INSERT INTO orders VALUES (9400,1,\'paid\',\'2026-09-14 00:00:00\',1000)', rows: [
          ['89 / 938083', '89 / 938083']
        ] },
      { setup: 'INSERT INTO orders VALUES (9400,1,\'paid\',\'2026-09-14 00:00:01\',1000)', rows: [
          ['90 / 939083', '90 / 939083']
        ] },
      { setup: 'INSERT INTO orders VALUES (9400,1,\'paid\',\'2026-09-13 23:59:59\',1000)', rows: [
          ['89 / 938083', '89 / 938083']
        ] },
      { setup: 'INSERT INTO orders VALUES (9400,1,\'paid\',\'2026-12-01 00:00:00\',1000)', rows: [
          ['90 / 939083', '90 / 939083']
        ] },
      { setup: 'DELETE FROM orders', rows: [
          [null, null]
        ] },
      { setup: 'DELETE FROM orders; INSERT INTO orders VALUES (9400,1,\'paid\',\'2026-09-14 00:00:00\',1000),(9401,1,\'paid\',\'2026-09-20 10:00:00\',2500)', rows: [
          ['1 / 2500', '1 / 2500']
        ] }
    ] },
    solution: {
      approach: `<p>Turn the predicate around so the column stands alone: <code>created_at &gt; datetime('2026-10-14', '-30 days')</code>. This is exactly the original condition (a timestamp after 2026-09-14 00:00:00); with <code>&gt;=</code> and <code>date()</code> a row stamped exactly at that midnight would slip in. Then build <code>(created_at, total_cents)</code>: the seek finds the 89 recent entries and the sum is computed from the index alone.</p>`,
      code: { lang: 'sql', db: 'shop', code: `CREATE INDEX idx_orders_created_total ON orders(created_at, total_cents);

EXPLAIN QUERY PLAN
SELECT count(*), sum(total_cents) FROM orders
WHERE created_at > datetime('2026-10-14', '-30 days');

SELECT
  (SELECT count(*) || ' / ' || sum(total_cents) FROM orders
     WHERE julianday('2026-10-14') - julianday(created_at) < 30)  AS original,
  (SELECT count(*) || ' / ' || sum(total_cents) FROM orders
     WHERE created_at > datetime('2026-10-14', '-30 days'))        AS rewrite;` },
      complexity: `<p>O(N) with 2N function calls → O(log N + 89) index entries, zero table reads.</p>`,
      followUps: ['The existing <code>idx_orders_created</code> is now a left prefix of the new index — can you drop it?', 'How would you parameterize "today" from the application?']
    }
  });

  practice.push({
    title: 'Customers who never referred anyone', level: 'Medium', tags: ['NOT IN', 'NOT EXISTS', 'anti-join', 'NULL'], companies: ['Microsoft', 'Airbnb'],
    statement: `<p>Growth wants customers who have <b>never referred</b> another customer. The first attempt returns <b>zero rows</b>:</p><pre>SELECT id, name FROM customers
WHERE id NOT IN (SELECT referred_by FROM customers);</pre><p>Explain why, fix it, and say which join algorithm the fixed query maps to.</p>`,
    constraints: `SQLite <code>shop</code>; <code>referred_by</code> is nullable (every 5th customer has NULL).`,
    example: `<p>NOT IN → ${H.c('r', '0 rows')}. NOT EXISTS → ${H.c('g', '280 rows')} (ids 51–320, plus ids 1, 6, 11, …, 46 — nobody's referred_by points at them).</p>`,
    brute: { why: `<p><code>x NOT IN (list)</code> means <code>x &lt;&gt; v1 AND x &lt;&gt; v2 AND …</code>. If the list contains a NULL, one term is <code>x &lt;&gt; NULL</code> = UNKNOWN, so the whole AND can never be TRUE: <b>no rows</b>, silently. It's a correctness bug, not a speed bug — and engines also can't turn NULL-able NOT IN into a plain anti-join, so it's often slower too.</p>`, code: { lang: 'sql', db: 'shop', code: `SELECT count(*) AS rows_returned
FROM customers WHERE id NOT IN (SELECT referred_by FROM customers);
SELECT count(*) AS null_referrers FROM customers WHERE referred_by IS NULL;` } },
    mcq: { q: 'What does <code>5 NOT IN (1, 2, NULL)</code> evaluate to?', options: ['TRUE', 'FALSE', 'UNKNOWN (NULL)', 'An error'], answer: 2, explain: '5<>1 is TRUE, 5<>2 is TRUE, 5<>NULL is UNKNOWN; TRUE AND TRUE AND UNKNOWN = UNKNOWN, and WHERE keeps only TRUE.' },
    hints: [`<p>Hint 1: Count the NULLs in <code>referred_by</code>. Then expand NOT IN into a chain of <code>&lt;&gt;</code> ANDs and evaluate with one NULL.</p>`, `<p>Hint 2: <code>NOT EXISTS (SELECT 1 FROM customers r WHERE r.referred_by = c.id)</code> compares with <code>=</code>, and NULL rows simply never match — exactly the intended meaning.</p>`, `<p>Hint 3: Alternatives: <code>NOT IN (… WHERE referred_by IS NOT NULL)</code>, or <code>LEFT JOIN … WHERE r.id IS NULL</code>. Recipe: show 0 rows, rewrite, count, EXPLAIN.</p>`],
    tests: { engine: 'sqlite', check: '(rows, cols, c) => {\n  if (c.plan || c.noplan) { const d = rows.map(r => r[r.length - 1]).join(\'\\n\'); return (!c.plan || new RegExp(c.plan).test(d)) && (!c.noplan || !new RegExp(c.noplan).test(d)); }\n  let a = rows, b = c.rows || [];\n  if (c.set) { const k = r => JSON.stringify(r); a = a.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); b = b.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); }\n  return a.length === b.length && a.every((r, i) => r.length === b[i].length && r.every((v, j) => v === b[i][j] || (typeof v === \'number\' && typeof b[i][j] === \'number\' && Math.abs(v - b[i][j]) < 1e-6)));\n}', cases: [
      { rows: [
          [1, 'User 1'],
          [6, 'User 6'],
          [11, 'User 11'],
          [16, 'User 16'],
          [21, 'User 21'],
          [26, 'User 26'],
          [31, 'User 31'],
          [36, 'User 36'],
          [41, 'User 41'],
          [46, 'User 46'],
          [51, 'User 51'],
          [52, 'User 52'],
          [53, 'User 53'],
          [54, 'User 54'],
          [55, 'User 55'],
          [56, 'User 56'],
          [57, 'User 57'],
          [58, 'User 58'],
          [59, 'User 59'],
          [60, 'User 60'],
          [61, 'User 61'],
          [62, 'User 62'],
          [63, 'User 63'],
          [64, 'User 64'],
          [65, 'User 65'],
          [66, 'User 66'],
          [67, 'User 67'],
          [68, 'User 68'],
          [69, 'User 69'],
          [70, 'User 70'],
          [71, 'User 71'],
          [72, 'User 72'],
          [73, 'User 73'],
          [74, 'User 74'],
          [75, 'User 75'],
          [76, 'User 76'],
          [77, 'User 77'],
          [78, 'User 78'],
          [79, 'User 79'],
          [80, 'User 80'],
          [81, 'User 81'],
          [82, 'User 82'],
          [83, 'User 83'],
          [84, 'User 84'],
          [85, 'User 85'],
          [86, 'User 86'],
          [87, 'User 87'],
          [88, 'User 88'],
          [89, 'User 89'],
          [90, 'User 90'],
          [91, 'User 91'],
          [92, 'User 92'],
          [93, 'User 93'],
          [94, 'User 94'],
          [95, 'User 95'],
          [96, 'User 96'],
          [97, 'User 97'],
          [98, 'User 98'],
          [99, 'User 99'],
          [100, 'User 100'],
          [101, 'User 101'],
          [102, 'User 102'],
          [103, 'User 103'],
          [104, 'User 104'],
          [105, 'User 105'],
          [106, 'User 106'],
          [107, 'User 107'],
          [108, 'User 108'],
          [109, 'User 109'],
          [110, 'User 110'],
          [111, 'User 111'],
          [112, 'User 112'],
          [113, 'User 113'],
          [114, 'User 114'],
          [115, 'User 115'],
          [116, 'User 116'],
          [117, 'User 117'],
          [118, 'User 118'],
          [119, 'User 119'],
          [120, 'User 120'],
          [121, 'User 121'],
          [122, 'User 122'],
          [123, 'User 123'],
          [124, 'User 124'],
          [125, 'User 125'],
          [126, 'User 126'],
          [127, 'User 127'],
          [128, 'User 128'],
          [129, 'User 129'],
          [130, 'User 130'],
          [131, 'User 131'],
          [132, 'User 132'],
          [133, 'User 133'],
          [134, 'User 134'],
          [135, 'User 135'],
          [136, 'User 136'],
          [137, 'User 137'],
          [138, 'User 138'],
          [139, 'User 139'],
          [140, 'User 140'],
          [141, 'User 141'],
          [142, 'User 142'],
          [143, 'User 143'],
          [144, 'User 144'],
          [145, 'User 145'],
          [146, 'User 146'],
          [147, 'User 147'],
          [148, 'User 148'],
          [149, 'User 149'],
          [150, 'User 150'],
          [151, 'User 151'],
          [152, 'User 152'],
          [153, 'User 153'],
          [154, 'User 154'],
          [155, 'User 155'],
          [156, 'User 156'],
          [157, 'User 157'],
          [158, 'User 158'],
          [159, 'User 159'],
          [160, 'User 160'],
          [161, 'User 161'],
          [162, 'User 162'],
          [163, 'User 163'],
          [164, 'User 164'],
          [165, 'User 165'],
          [166, 'User 166'],
          [167, 'User 167'],
          [168, 'User 168'],
          [169, 'User 169'],
          [170, 'User 170'],
          [171, 'User 171'],
          [172, 'User 172'],
          [173, 'User 173'],
          [174, 'User 174'],
          [175, 'User 175'],
          [176, 'User 176'],
          [177, 'User 177'],
          [178, 'User 178'],
          [179, 'User 179'],
          [180, 'User 180'],
          [181, 'User 181'],
          [182, 'User 182'],
          [183, 'User 183'],
          [184, 'User 184'],
          [185, 'User 185'],
          [186, 'User 186'],
          [187, 'User 187'],
          [188, 'User 188'],
          [189, 'User 189'],
          [190, 'User 190'],
          [191, 'User 191'],
          [192, 'User 192'],
          [193, 'User 193'],
          [194, 'User 194'],
          [195, 'User 195'],
          [196, 'User 196'],
          [197, 'User 197'],
          [198, 'User 198'],
          [199, 'User 199'],
          [200, 'User 200'],
          [201, 'User 201'],
          [202, 'User 202'],
          [203, 'User 203'],
          [204, 'User 204'],
          [205, 'User 205'],
          [206, 'User 206'],
          [207, 'User 207'],
          [208, 'User 208'],
          [209, 'User 209'],
          [210, 'User 210'],
          [211, 'User 211'],
          [212, 'User 212'],
          [213, 'User 213'],
          [214, 'User 214'],
          [215, 'User 215'],
          [216, 'User 216'],
          [217, 'User 217'],
          [218, 'User 218'],
          [219, 'User 219'],
          [220, 'User 220'],
          [221, 'User 221'],
          [222, 'User 222'],
          [223, 'User 223'],
          [224, 'User 224'],
          [225, 'User 225'],
          [226, 'User 226'],
          [227, 'User 227'],
          [228, 'User 228'],
          [229, 'User 229'],
          [230, 'User 230'],
          [231, 'User 231'],
          [232, 'User 232'],
          [233, 'User 233'],
          [234, 'User 234'],
          [235, 'User 235'],
          [236, 'User 236'],
          [237, 'User 237'],
          [238, 'User 238'],
          [239, 'User 239'],
          [240, 'User 240'],
          [241, 'User 241'],
          [242, 'User 242'],
          [243, 'User 243'],
          [244, 'User 244'],
          [245, 'User 245'],
          [246, 'User 246'],
          [247, 'User 247'],
          [248, 'User 248'],
          [249, 'User 249'],
          [250, 'User 250'],
          [251, 'User 251'],
          [252, 'User 252'],
          [253, 'User 253'],
          [254, 'User 254'],
          [255, 'User 255'],
          [256, 'User 256'],
          [257, 'User 257'],
          [258, 'User 258'],
          [259, 'User 259'],
          [260, 'User 260'],
          [261, 'User 261'],
          [262, 'User 262'],
          [263, 'User 263'],
          [264, 'User 264'],
          [265, 'User 265'],
          [266, 'User 266'],
          [267, 'User 267'],
          [268, 'User 268'],
          [269, 'User 269'],
          [270, 'User 270'],
          [271, 'User 271'],
          [272, 'User 272'],
          [273, 'User 273'],
          [274, 'User 274'],
          [275, 'User 275'],
          [276, 'User 276'],
          [277, 'User 277'],
          [278, 'User 278'],
          [279, 'User 279'],
          [280, 'User 280'],
          [281, 'User 281'],
          [282, 'User 282'],
          [283, 'User 283'],
          [284, 'User 284'],
          [285, 'User 285'],
          [286, 'User 286'],
          [287, 'User 287'],
          [288, 'User 288'],
          [289, 'User 289'],
          [290, 'User 290'],
          [291, 'User 291'],
          [292, 'User 292'],
          [293, 'User 293'],
          [294, 'User 294'],
          [295, 'User 295'],
          [296, 'User 296'],
          [297, 'User 297'],
          [298, 'User 298'],
          [299, 'User 299'],
          [300, 'User 300'],
          [301, 'User 301'],
          [302, 'User 302'],
          [303, 'User 303'],
          [304, 'User 304'],
          [305, 'User 305'],
          [306, 'User 306'],
          [307, 'User 307'],
          [308, 'User 308'],
          [309, 'User 309'],
          [310, 'User 310'],
          [311, 'User 311'],
          [312, 'User 312'],
          [313, 'User 313'],
          [314, 'User 314'],
          [315, 'User 315'],
          [316, 'User 316'],
          [317, 'User 317'],
          [318, 'User 318'],
          [319, 'User 319'],
          [320, 'User 320']
        ] },
      { rows: [], plan: 'SEARCH r USING COVERING INDEX idx_customers_referred_by \\(referred_by=\\?\\)', noplan: 'SCAN r', after: 'EXPLAIN QUERY PLAN SELECT c.id, c.name FROM customers c WHERE NOT EXISTS (SELECT 1 FROM customers r WHERE r.referred_by = c.id)' },
      { setup: 'UPDATE customers SET referred_by = id WHERE id = 1', rows: [
          [6, 'User 6'],
          [11, 'User 11'],
          [16, 'User 16'],
          [21, 'User 21'],
          [26, 'User 26'],
          [31, 'User 31'],
          [36, 'User 36'],
          [41, 'User 41'],
          [46, 'User 46'],
          [51, 'User 51'],
          [52, 'User 52'],
          [53, 'User 53'],
          [54, 'User 54'],
          [55, 'User 55'],
          [56, 'User 56'],
          [57, 'User 57'],
          [58, 'User 58'],
          [59, 'User 59'],
          [60, 'User 60'],
          [61, 'User 61'],
          [62, 'User 62'],
          [63, 'User 63'],
          [64, 'User 64'],
          [65, 'User 65'],
          [66, 'User 66'],
          [67, 'User 67'],
          [68, 'User 68'],
          [69, 'User 69'],
          [70, 'User 70'],
          [71, 'User 71'],
          [72, 'User 72'],
          [73, 'User 73'],
          [74, 'User 74'],
          [75, 'User 75'],
          [76, 'User 76'],
          [77, 'User 77'],
          [78, 'User 78'],
          [79, 'User 79'],
          [80, 'User 80'],
          [81, 'User 81'],
          [82, 'User 82'],
          [83, 'User 83'],
          [84, 'User 84'],
          [85, 'User 85'],
          [86, 'User 86'],
          [87, 'User 87'],
          [88, 'User 88'],
          [89, 'User 89'],
          [90, 'User 90'],
          [91, 'User 91'],
          [92, 'User 92'],
          [93, 'User 93'],
          [94, 'User 94'],
          [95, 'User 95'],
          [96, 'User 96'],
          [97, 'User 97'],
          [98, 'User 98'],
          [99, 'User 99'],
          [100, 'User 100'],
          [101, 'User 101'],
          [102, 'User 102'],
          [103, 'User 103'],
          [104, 'User 104'],
          [105, 'User 105'],
          [106, 'User 106'],
          [107, 'User 107'],
          [108, 'User 108'],
          [109, 'User 109'],
          [110, 'User 110'],
          [111, 'User 111'],
          [112, 'User 112'],
          [113, 'User 113'],
          [114, 'User 114'],
          [115, 'User 115'],
          [116, 'User 116'],
          [117, 'User 117'],
          [118, 'User 118'],
          [119, 'User 119'],
          [120, 'User 120'],
          [121, 'User 121'],
          [122, 'User 122'],
          [123, 'User 123'],
          [124, 'User 124'],
          [125, 'User 125'],
          [126, 'User 126'],
          [127, 'User 127'],
          [128, 'User 128'],
          [129, 'User 129'],
          [130, 'User 130'],
          [131, 'User 131'],
          [132, 'User 132'],
          [133, 'User 133'],
          [134, 'User 134'],
          [135, 'User 135'],
          [136, 'User 136'],
          [137, 'User 137'],
          [138, 'User 138'],
          [139, 'User 139'],
          [140, 'User 140'],
          [141, 'User 141'],
          [142, 'User 142'],
          [143, 'User 143'],
          [144, 'User 144'],
          [145, 'User 145'],
          [146, 'User 146'],
          [147, 'User 147'],
          [148, 'User 148'],
          [149, 'User 149'],
          [150, 'User 150'],
          [151, 'User 151'],
          [152, 'User 152'],
          [153, 'User 153'],
          [154, 'User 154'],
          [155, 'User 155'],
          [156, 'User 156'],
          [157, 'User 157'],
          [158, 'User 158'],
          [159, 'User 159'],
          [160, 'User 160'],
          [161, 'User 161'],
          [162, 'User 162'],
          [163, 'User 163'],
          [164, 'User 164'],
          [165, 'User 165'],
          [166, 'User 166'],
          [167, 'User 167'],
          [168, 'User 168'],
          [169, 'User 169'],
          [170, 'User 170'],
          [171, 'User 171'],
          [172, 'User 172'],
          [173, 'User 173'],
          [174, 'User 174'],
          [175, 'User 175'],
          [176, 'User 176'],
          [177, 'User 177'],
          [178, 'User 178'],
          [179, 'User 179'],
          [180, 'User 180'],
          [181, 'User 181'],
          [182, 'User 182'],
          [183, 'User 183'],
          [184, 'User 184'],
          [185, 'User 185'],
          [186, 'User 186'],
          [187, 'User 187'],
          [188, 'User 188'],
          [189, 'User 189'],
          [190, 'User 190'],
          [191, 'User 191'],
          [192, 'User 192'],
          [193, 'User 193'],
          [194, 'User 194'],
          [195, 'User 195'],
          [196, 'User 196'],
          [197, 'User 197'],
          [198, 'User 198'],
          [199, 'User 199'],
          [200, 'User 200'],
          [201, 'User 201'],
          [202, 'User 202'],
          [203, 'User 203'],
          [204, 'User 204'],
          [205, 'User 205'],
          [206, 'User 206'],
          [207, 'User 207'],
          [208, 'User 208'],
          [209, 'User 209'],
          [210, 'User 210'],
          [211, 'User 211'],
          [212, 'User 212'],
          [213, 'User 213'],
          [214, 'User 214'],
          [215, 'User 215'],
          [216, 'User 216'],
          [217, 'User 217'],
          [218, 'User 218'],
          [219, 'User 219'],
          [220, 'User 220'],
          [221, 'User 221'],
          [222, 'User 222'],
          [223, 'User 223'],
          [224, 'User 224'],
          [225, 'User 225'],
          [226, 'User 226'],
          [227, 'User 227'],
          [228, 'User 228'],
          [229, 'User 229'],
          [230, 'User 230'],
          [231, 'User 231'],
          [232, 'User 232'],
          [233, 'User 233'],
          [234, 'User 234'],
          [235, 'User 235'],
          [236, 'User 236'],
          [237, 'User 237'],
          [238, 'User 238'],
          [239, 'User 239'],
          [240, 'User 240'],
          [241, 'User 241'],
          [242, 'User 242'],
          [243, 'User 243'],
          [244, 'User 244'],
          [245, 'User 245'],
          [246, 'User 246'],
          [247, 'User 247'],
          [248, 'User 248'],
          [249, 'User 249'],
          [250, 'User 250'],
          [251, 'User 251'],
          [252, 'User 252'],
          [253, 'User 253'],
          [254, 'User 254'],
          [255, 'User 255'],
          [256, 'User 256'],
          [257, 'User 257'],
          [258, 'User 258'],
          [259, 'User 259'],
          [260, 'User 260'],
          [261, 'User 261'],
          [262, 'User 262'],
          [263, 'User 263'],
          [264, 'User 264'],
          [265, 'User 265'],
          [266, 'User 266'],
          [267, 'User 267'],
          [268, 'User 268'],
          [269, 'User 269'],
          [270, 'User 270'],
          [271, 'User 271'],
          [272, 'User 272'],
          [273, 'User 273'],
          [274, 'User 274'],
          [275, 'User 275'],
          [276, 'User 276'],
          [277, 'User 277'],
          [278, 'User 278'],
          [279, 'User 279'],
          [280, 'User 280'],
          [281, 'User 281'],
          [282, 'User 282'],
          [283, 'User 283'],
          [284, 'User 284'],
          [285, 'User 285'],
          [286, 'User 286'],
          [287, 'User 287'],
          [288, 'User 288'],
          [289, 'User 289'],
          [290, 'User 290'],
          [291, 'User 291'],
          [292, 'User 292'],
          [293, 'User 293'],
          [294, 'User 294'],
          [295, 'User 295'],
          [296, 'User 296'],
          [297, 'User 297'],
          [298, 'User 298'],
          [299, 'User 299'],
          [300, 'User 300'],
          [301, 'User 301'],
          [302, 'User 302'],
          [303, 'User 303'],
          [304, 'User 304'],
          [305, 'User 305'],
          [306, 'User 306'],
          [307, 'User 307'],
          [308, 'User 308'],
          [309, 'User 309'],
          [310, 'User 310'],
          [311, 'User 311'],
          [312, 'User 312'],
          [313, 'User 313'],
          [314, 'User 314'],
          [315, 'User 315'],
          [316, 'User 316'],
          [317, 'User 317'],
          [318, 'User 318'],
          [319, 'User 319'],
          [320, 'User 320']
        ] },
      { setup: 'UPDATE customers SET referred_by = NULL', rows: [
          [1, 'User 1'],
          [2, 'User 2'],
          [3, 'User 3'],
          [4, 'User 4'],
          [5, 'User 5'],
          [6, 'User 6'],
          [7, 'User 7'],
          [8, 'User 8'],
          [9, 'User 9'],
          [10, 'User 10'],
          [11, 'User 11'],
          [12, 'User 12'],
          [13, 'User 13'],
          [14, 'User 14'],
          [15, 'User 15'],
          [16, 'User 16'],
          [17, 'User 17'],
          [18, 'User 18'],
          [19, 'User 19'],
          [20, 'User 20'],
          [21, 'User 21'],
          [22, 'User 22'],
          [23, 'User 23'],
          [24, 'User 24'],
          [25, 'User 25'],
          [26, 'User 26'],
          [27, 'User 27'],
          [28, 'User 28'],
          [29, 'User 29'],
          [30, 'User 30'],
          [31, 'User 31'],
          [32, 'User 32'],
          [33, 'User 33'],
          [34, 'User 34'],
          [35, 'User 35'],
          [36, 'User 36'],
          [37, 'User 37'],
          [38, 'User 38'],
          [39, 'User 39'],
          [40, 'User 40'],
          [41, 'User 41'],
          [42, 'User 42'],
          [43, 'User 43'],
          [44, 'User 44'],
          [45, 'User 45'],
          [46, 'User 46'],
          [47, 'User 47'],
          [48, 'User 48'],
          [49, 'User 49'],
          [50, 'User 50'],
          [51, 'User 51'],
          [52, 'User 52'],
          [53, 'User 53'],
          [54, 'User 54'],
          [55, 'User 55'],
          [56, 'User 56'],
          [57, 'User 57'],
          [58, 'User 58'],
          [59, 'User 59'],
          [60, 'User 60'],
          [61, 'User 61'],
          [62, 'User 62'],
          [63, 'User 63'],
          [64, 'User 64'],
          [65, 'User 65'],
          [66, 'User 66'],
          [67, 'User 67'],
          [68, 'User 68'],
          [69, 'User 69'],
          [70, 'User 70'],
          [71, 'User 71'],
          [72, 'User 72'],
          [73, 'User 73'],
          [74, 'User 74'],
          [75, 'User 75'],
          [76, 'User 76'],
          [77, 'User 77'],
          [78, 'User 78'],
          [79, 'User 79'],
          [80, 'User 80'],
          [81, 'User 81'],
          [82, 'User 82'],
          [83, 'User 83'],
          [84, 'User 84'],
          [85, 'User 85'],
          [86, 'User 86'],
          [87, 'User 87'],
          [88, 'User 88'],
          [89, 'User 89'],
          [90, 'User 90'],
          [91, 'User 91'],
          [92, 'User 92'],
          [93, 'User 93'],
          [94, 'User 94'],
          [95, 'User 95'],
          [96, 'User 96'],
          [97, 'User 97'],
          [98, 'User 98'],
          [99, 'User 99'],
          [100, 'User 100'],
          [101, 'User 101'],
          [102, 'User 102'],
          [103, 'User 103'],
          [104, 'User 104'],
          [105, 'User 105'],
          [106, 'User 106'],
          [107, 'User 107'],
          [108, 'User 108'],
          [109, 'User 109'],
          [110, 'User 110'],
          [111, 'User 111'],
          [112, 'User 112'],
          [113, 'User 113'],
          [114, 'User 114'],
          [115, 'User 115'],
          [116, 'User 116'],
          [117, 'User 117'],
          [118, 'User 118'],
          [119, 'User 119'],
          [120, 'User 120'],
          [121, 'User 121'],
          [122, 'User 122'],
          [123, 'User 123'],
          [124, 'User 124'],
          [125, 'User 125'],
          [126, 'User 126'],
          [127, 'User 127'],
          [128, 'User 128'],
          [129, 'User 129'],
          [130, 'User 130'],
          [131, 'User 131'],
          [132, 'User 132'],
          [133, 'User 133'],
          [134, 'User 134'],
          [135, 'User 135'],
          [136, 'User 136'],
          [137, 'User 137'],
          [138, 'User 138'],
          [139, 'User 139'],
          [140, 'User 140'],
          [141, 'User 141'],
          [142, 'User 142'],
          [143, 'User 143'],
          [144, 'User 144'],
          [145, 'User 145'],
          [146, 'User 146'],
          [147, 'User 147'],
          [148, 'User 148'],
          [149, 'User 149'],
          [150, 'User 150'],
          [151, 'User 151'],
          [152, 'User 152'],
          [153, 'User 153'],
          [154, 'User 154'],
          [155, 'User 155'],
          [156, 'User 156'],
          [157, 'User 157'],
          [158, 'User 158'],
          [159, 'User 159'],
          [160, 'User 160'],
          [161, 'User 161'],
          [162, 'User 162'],
          [163, 'User 163'],
          [164, 'User 164'],
          [165, 'User 165'],
          [166, 'User 166'],
          [167, 'User 167'],
          [168, 'User 168'],
          [169, 'User 169'],
          [170, 'User 170'],
          [171, 'User 171'],
          [172, 'User 172'],
          [173, 'User 173'],
          [174, 'User 174'],
          [175, 'User 175'],
          [176, 'User 176'],
          [177, 'User 177'],
          [178, 'User 178'],
          [179, 'User 179'],
          [180, 'User 180'],
          [181, 'User 181'],
          [182, 'User 182'],
          [183, 'User 183'],
          [184, 'User 184'],
          [185, 'User 185'],
          [186, 'User 186'],
          [187, 'User 187'],
          [188, 'User 188'],
          [189, 'User 189'],
          [190, 'User 190'],
          [191, 'User 191'],
          [192, 'User 192'],
          [193, 'User 193'],
          [194, 'User 194'],
          [195, 'User 195'],
          [196, 'User 196'],
          [197, 'User 197'],
          [198, 'User 198'],
          [199, 'User 199'],
          [200, 'User 200'],
          [201, 'User 201'],
          [202, 'User 202'],
          [203, 'User 203'],
          [204, 'User 204'],
          [205, 'User 205'],
          [206, 'User 206'],
          [207, 'User 207'],
          [208, 'User 208'],
          [209, 'User 209'],
          [210, 'User 210'],
          [211, 'User 211'],
          [212, 'User 212'],
          [213, 'User 213'],
          [214, 'User 214'],
          [215, 'User 215'],
          [216, 'User 216'],
          [217, 'User 217'],
          [218, 'User 218'],
          [219, 'User 219'],
          [220, 'User 220'],
          [221, 'User 221'],
          [222, 'User 222'],
          [223, 'User 223'],
          [224, 'User 224'],
          [225, 'User 225'],
          [226, 'User 226'],
          [227, 'User 227'],
          [228, 'User 228'],
          [229, 'User 229'],
          [230, 'User 230'],
          [231, 'User 231'],
          [232, 'User 232'],
          [233, 'User 233'],
          [234, 'User 234'],
          [235, 'User 235'],
          [236, 'User 236'],
          [237, 'User 237'],
          [238, 'User 238'],
          [239, 'User 239'],
          [240, 'User 240'],
          [241, 'User 241'],
          [242, 'User 242'],
          [243, 'User 243'],
          [244, 'User 244'],
          [245, 'User 245'],
          [246, 'User 246'],
          [247, 'User 247'],
          [248, 'User 248'],
          [249, 'User 249'],
          [250, 'User 250'],
          [251, 'User 251'],
          [252, 'User 252'],
          [253, 'User 253'],
          [254, 'User 254'],
          [255, 'User 255'],
          [256, 'User 256'],
          [257, 'User 257'],
          [258, 'User 258'],
          [259, 'User 259'],
          [260, 'User 260'],
          [261, 'User 261'],
          [262, 'User 262'],
          [263, 'User 263'],
          [264, 'User 264'],
          [265, 'User 265'],
          [266, 'User 266'],
          [267, 'User 267'],
          [268, 'User 268'],
          [269, 'User 269'],
          [270, 'User 270'],
          [271, 'User 271'],
          [272, 'User 272'],
          [273, 'User 273'],
          [274, 'User 274'],
          [275, 'User 275'],
          [276, 'User 276'],
          [277, 'User 277'],
          [278, 'User 278'],
          [279, 'User 279'],
          [280, 'User 280'],
          [281, 'User 281'],
          [282, 'User 282'],
          [283, 'User 283'],
          [284, 'User 284'],
          [285, 'User 285'],
          [286, 'User 286'],
          [287, 'User 287'],
          [288, 'User 288'],
          [289, 'User 289'],
          [290, 'User 290'],
          [291, 'User 291'],
          [292, 'User 292'],
          [293, 'User 293'],
          [294, 'User 294'],
          [295, 'User 295'],
          [296, 'User 296'],
          [297, 'User 297'],
          [298, 'User 298'],
          [299, 'User 299'],
          [300, 'User 300'],
          [301, 'User 301'],
          [302, 'User 302'],
          [303, 'User 303'],
          [304, 'User 304'],
          [305, 'User 305'],
          [306, 'User 306'],
          [307, 'User 307'],
          [308, 'User 308'],
          [309, 'User 309'],
          [310, 'User 310'],
          [311, 'User 311'],
          [312, 'User 312'],
          [313, 'User 313'],
          [314, 'User 314'],
          [315, 'User 315'],
          [316, 'User 316'],
          [317, 'User 317'],
          [318, 'User 318'],
          [319, 'User 319'],
          [320, 'User 320']
        ] },
      { setup: 'UPDATE customers SET referred_by = 7 WHERE id = 320', rows: [
          [1, 'User 1'],
          [6, 'User 6'],
          [11, 'User 11'],
          [16, 'User 16'],
          [21, 'User 21'],
          [26, 'User 26'],
          [31, 'User 31'],
          [36, 'User 36'],
          [41, 'User 41'],
          [46, 'User 46'],
          [51, 'User 51'],
          [52, 'User 52'],
          [53, 'User 53'],
          [54, 'User 54'],
          [55, 'User 55'],
          [56, 'User 56'],
          [57, 'User 57'],
          [58, 'User 58'],
          [59, 'User 59'],
          [60, 'User 60'],
          [61, 'User 61'],
          [62, 'User 62'],
          [63, 'User 63'],
          [64, 'User 64'],
          [65, 'User 65'],
          [66, 'User 66'],
          [67, 'User 67'],
          [68, 'User 68'],
          [69, 'User 69'],
          [70, 'User 70'],
          [71, 'User 71'],
          [72, 'User 72'],
          [73, 'User 73'],
          [74, 'User 74'],
          [75, 'User 75'],
          [76, 'User 76'],
          [77, 'User 77'],
          [78, 'User 78'],
          [79, 'User 79'],
          [80, 'User 80'],
          [81, 'User 81'],
          [82, 'User 82'],
          [83, 'User 83'],
          [84, 'User 84'],
          [85, 'User 85'],
          [86, 'User 86'],
          [87, 'User 87'],
          [88, 'User 88'],
          [89, 'User 89'],
          [90, 'User 90'],
          [91, 'User 91'],
          [92, 'User 92'],
          [93, 'User 93'],
          [94, 'User 94'],
          [95, 'User 95'],
          [96, 'User 96'],
          [97, 'User 97'],
          [98, 'User 98'],
          [99, 'User 99'],
          [100, 'User 100'],
          [101, 'User 101'],
          [102, 'User 102'],
          [103, 'User 103'],
          [104, 'User 104'],
          [105, 'User 105'],
          [106, 'User 106'],
          [107, 'User 107'],
          [108, 'User 108'],
          [109, 'User 109'],
          [110, 'User 110'],
          [111, 'User 111'],
          [112, 'User 112'],
          [113, 'User 113'],
          [114, 'User 114'],
          [115, 'User 115'],
          [116, 'User 116'],
          [117, 'User 117'],
          [118, 'User 118'],
          [119, 'User 119'],
          [120, 'User 120'],
          [121, 'User 121'],
          [122, 'User 122'],
          [123, 'User 123'],
          [124, 'User 124'],
          [125, 'User 125'],
          [126, 'User 126'],
          [127, 'User 127'],
          [128, 'User 128'],
          [129, 'User 129'],
          [130, 'User 130'],
          [131, 'User 131'],
          [132, 'User 132'],
          [133, 'User 133'],
          [134, 'User 134'],
          [135, 'User 135'],
          [136, 'User 136'],
          [137, 'User 137'],
          [138, 'User 138'],
          [139, 'User 139'],
          [140, 'User 140'],
          [141, 'User 141'],
          [142, 'User 142'],
          [143, 'User 143'],
          [144, 'User 144'],
          [145, 'User 145'],
          [146, 'User 146'],
          [147, 'User 147'],
          [148, 'User 148'],
          [149, 'User 149'],
          [150, 'User 150'],
          [151, 'User 151'],
          [152, 'User 152'],
          [153, 'User 153'],
          [154, 'User 154'],
          [155, 'User 155'],
          [156, 'User 156'],
          [157, 'User 157'],
          [158, 'User 158'],
          [159, 'User 159'],
          [160, 'User 160'],
          [161, 'User 161'],
          [162, 'User 162'],
          [163, 'User 163'],
          [164, 'User 164'],
          [165, 'User 165'],
          [166, 'User 166'],
          [167, 'User 167'],
          [168, 'User 168'],
          [169, 'User 169'],
          [170, 'User 170'],
          [171, 'User 171'],
          [172, 'User 172'],
          [173, 'User 173'],
          [174, 'User 174'],
          [175, 'User 175'],
          [176, 'User 176'],
          [177, 'User 177'],
          [178, 'User 178'],
          [179, 'User 179'],
          [180, 'User 180'],
          [181, 'User 181'],
          [182, 'User 182'],
          [183, 'User 183'],
          [184, 'User 184'],
          [185, 'User 185'],
          [186, 'User 186'],
          [187, 'User 187'],
          [188, 'User 188'],
          [189, 'User 189'],
          [190, 'User 190'],
          [191, 'User 191'],
          [192, 'User 192'],
          [193, 'User 193'],
          [194, 'User 194'],
          [195, 'User 195'],
          [196, 'User 196'],
          [197, 'User 197'],
          [198, 'User 198'],
          [199, 'User 199'],
          [200, 'User 200'],
          [201, 'User 201'],
          [202, 'User 202'],
          [203, 'User 203'],
          [204, 'User 204'],
          [205, 'User 205'],
          [206, 'User 206'],
          [207, 'User 207'],
          [208, 'User 208'],
          [209, 'User 209'],
          [210, 'User 210'],
          [211, 'User 211'],
          [212, 'User 212'],
          [213, 'User 213'],
          [214, 'User 214'],
          [215, 'User 215'],
          [216, 'User 216'],
          [217, 'User 217'],
          [218, 'User 218'],
          [219, 'User 219'],
          [220, 'User 220'],
          [221, 'User 221'],
          [222, 'User 222'],
          [223, 'User 223'],
          [224, 'User 224'],
          [225, 'User 225'],
          [226, 'User 226'],
          [227, 'User 227'],
          [228, 'User 228'],
          [229, 'User 229'],
          [230, 'User 230'],
          [231, 'User 231'],
          [232, 'User 232'],
          [233, 'User 233'],
          [234, 'User 234'],
          [235, 'User 235'],
          [236, 'User 236'],
          [237, 'User 237'],
          [238, 'User 238'],
          [239, 'User 239'],
          [240, 'User 240'],
          [241, 'User 241'],
          [242, 'User 242'],
          [243, 'User 243'],
          [244, 'User 244'],
          [245, 'User 245'],
          [246, 'User 246'],
          [247, 'User 247'],
          [248, 'User 248'],
          [249, 'User 249'],
          [250, 'User 250'],
          [251, 'User 251'],
          [252, 'User 252'],
          [253, 'User 253'],
          [254, 'User 254'],
          [255, 'User 255'],
          [256, 'User 256'],
          [257, 'User 257'],
          [258, 'User 258'],
          [259, 'User 259'],
          [260, 'User 260'],
          [261, 'User 261'],
          [262, 'User 262'],
          [263, 'User 263'],
          [264, 'User 264'],
          [265, 'User 265'],
          [266, 'User 266'],
          [267, 'User 267'],
          [268, 'User 268'],
          [269, 'User 269'],
          [270, 'User 270'],
          [271, 'User 271'],
          [272, 'User 272'],
          [273, 'User 273'],
          [274, 'User 274'],
          [275, 'User 275'],
          [276, 'User 276'],
          [277, 'User 277'],
          [278, 'User 278'],
          [279, 'User 279'],
          [280, 'User 280'],
          [281, 'User 281'],
          [282, 'User 282'],
          [283, 'User 283'],
          [284, 'User 284'],
          [285, 'User 285'],
          [286, 'User 286'],
          [287, 'User 287'],
          [288, 'User 288'],
          [289, 'User 289'],
          [290, 'User 290'],
          [291, 'User 291'],
          [292, 'User 292'],
          [293, 'User 293'],
          [294, 'User 294'],
          [295, 'User 295'],
          [296, 'User 296'],
          [297, 'User 297'],
          [298, 'User 298'],
          [299, 'User 299'],
          [300, 'User 300'],
          [301, 'User 301'],
          [302, 'User 302'],
          [303, 'User 303'],
          [304, 'User 304'],
          [305, 'User 305'],
          [306, 'User 306'],
          [307, 'User 307'],
          [308, 'User 308'],
          [309, 'User 309'],
          [310, 'User 310'],
          [311, 'User 311'],
          [312, 'User 312'],
          [313, 'User 313'],
          [314, 'User 314'],
          [315, 'User 315'],
          [316, 'User 316'],
          [317, 'User 317'],
          [318, 'User 318'],
          [319, 'User 319'],
          [320, 'User 320']
        ] },
      { setup: 'DELETE FROM customers', after: 'SELECT count(*) FROM (SELECT c.id FROM customers c WHERE NOT EXISTS (SELECT 1 FROM customers r WHERE r.referred_by = c.id))', rows: [
          [0]
        ] },
      { after: 'SELECT count(*) FROM customers WHERE id NOT IN (SELECT referred_by FROM customers)', rows: [
          [0]
        ] },
      { after: 'SELECT count(*) FROM customers WHERE id NOT IN (SELECT referred_by FROM customers WHERE referred_by IS NOT NULL)', rows: [
          [280]
        ] }
    ] },
    solution: {
      approach: `<p>Use <code>NOT EXISTS</code>. It asks "is there no row r with r.referred_by = c.id?", which ignores NULLs naturally and is what the business means. Planners treat it as an <b>anti-join</b> (PostgreSQL: Hash Anti Join / Merge Anti Join; SQLite: a correlated probe that stops at the first match — an index on <code>referred_by</code> would make each probe a seek).</p>`,
      code: { lang: 'sql', db: 'shop', code: `SELECT count(*) AS never_referred
FROM customers c
WHERE NOT EXISTS (SELECT 1 FROM customers r WHERE r.referred_by = c.id);

-- Make each anti-join probe a seek instead of a scan
CREATE INDEX idx_customers_referred_by ON customers(referred_by);
EXPLAIN QUERY PLAN
SELECT c.id, c.name
FROM customers c
WHERE NOT EXISTS (SELECT 1 FROM customers r WHERE r.referred_by = c.id);

-- The answer: 280 customers nobody referred
SELECT c.id, c.name
FROM customers c
WHERE NOT EXISTS (SELECT 1 FROM customers r WHERE r.referred_by = c.id)
ORDER BY c.id;` },
      complexity: `<p>Without index: O(N²) probes in SQLite (each probe scans); with index: O(N log N). PostgreSQL hash anti-join: O(N).</p>`,
      followUps: ['Rewrite it as a LEFT JOIN … IS NULL and compare plans.', 'Is <code>NOT IN</code> ever safe? (Yes, when the subquery column is NOT NULL.)']
    }
  });

  practice.push({
    title: 'OR across two indexed columns', level: 'Medium', tags: ['OR', 'UNION ALL', 'multi-index OR'], companies: ['Atlassian', 'Freshworks'],
    statement: `<p>Support search: "orders of customer 42 <b>or</b> any order since 2026-09-01". Read SQLite's plan for the OR version, then write the portable <code>UNION ALL</code> rewrite that seeks both indexes on any engine, without returning a row twice.</p><pre>SELECT id FROM orders
WHERE customer_id = 42 OR created_at &gt;= '2026-09-01';</pre>`,
    constraints: `SQLite <code>shop</code>; result: 159 rows; <code>customer_id</code> is NOT NULL.`,
    example: `<p>SQLite plan: ${H.c('g', 'MULTI-INDEX OR')} → INDEX 1 (customer_id=?) + INDEX 2 (created_at&gt;?). UNION ALL: two SEARCH branches; 159 = 159.</p>`,
    brute: { why: `<p>An OR over two different columns can't be one B-tree range: no single index is sorted by both. Engines without index-merge (or when the planner decides against it) fall back to a <b>full scan</b> testing both conditions on every row. On a 50M-row table, that's 50M rows for a few hundred results.</p>`, code: { lang: 'sql', db: 'shop', code: `EXPLAIN QUERY PLAN
SELECT id FROM orders WHERE customer_id = 42 OR created_at >= '2026-09-01';
SELECT count(*) FROM orders WHERE customer_id = 42 OR created_at >= '2026-09-01';` } },
    mcq: { q: 'Why does the second UNION ALL branch need <code>AND customer_id &lt;&gt; 42</code>?', options: ['To make it sargable', 'To avoid returning rows that match both conditions twice', 'Because UNION ALL requires it', 'To use the covering index'], answer: 1, explain: 'An order of customer 42 placed after 2026-09-01 satisfies both branches; excluding it from branch 2 keeps the result a set without paying for UNION\'s dedupe.' },
    hints: [`<p>Hint 1: Split the OR into two queries, each with one sargable predicate.</p>`, `<p>Hint 2: Rows matching both would appear twice; either use <code>UNION</code> (dedupe sort) or exclude branch 1's rows from branch 2.</p>`, `<p>Hint 3: If the excluded column were nullable, use <code>customer_id IS NOT 42</code> (SQLite) / <code>IS DISTINCT FROM 42</code> (PG). Recipe: EQP OR, write UNION ALL, EQP, compare counts.</p>`],
    tests: { engine: 'sqlite', check: '(rows, cols, c) => {\n  if (c.plan || c.noplan) { const d = rows.map(r => r[r.length - 1]).join(\'\\n\'); return (!c.plan || new RegExp(c.plan).test(d)) && (!c.noplan || !new RegExp(c.noplan).test(d)); }\n  let a = rows, b = c.rows || [];\n  if (c.set) { const k = r => JSON.stringify(r); a = a.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); b = b.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); }\n  return a.length === b.length && a.every((r, i) => r.length === b[i].length && r.every((v, j) => v === b[i][j] || (typeof v === \'number\' && typeof b[i][j] === \'number\' && Math.abs(v - b[i][j]) < 1e-6)));\n}', cases: [
      { rows: [
          [159, 159]
        ] },
      { rows: [], plan: 'COMPOUND QUERY[\\s\\S]*SEARCH orders USING (COVERING )?INDEX idx_orders_customer \\(customer_id=\\?\\)[\\s\\S]*SEARCH orders USING (COVERING )?INDEX idx_orders_created \\(created_at>\\?\\)', noplan: 'SCAN', after: 'EXPLAIN QUERY PLAN SELECT id FROM orders WHERE customer_id = 42 UNION ALL SELECT id FROM orders WHERE created_at >= \'2026-09-01\' AND customer_id <> 42' },
      { setup: 'INSERT INTO orders VALUES (9501,42,\'paid\',\'2026-10-01 00:00:00\',1)', rows: [
          [160, 160]
        ] },
      { setup: 'INSERT INTO orders VALUES (9502,7,\'paid\',\'2026-09-01 00:00:00\',1),(9503,7,\'paid\',\'2026-08-31 23:59:59\',1)', rows: [
          [160, 160]
        ] },
      { setup: 'UPDATE orders SET created_at = \'2026-09-05 00:00:00\' WHERE customer_id = 42 AND id = 263', rows: [
          [159, 159]
        ] },
      { setup: 'DELETE FROM orders', rows: [
          [0, 0]
        ] },
      { setup: 'DELETE FROM orders WHERE customer_id = 42', rows: [
          [149, 149]
        ] },
      { setup: 'DELETE FROM orders WHERE created_at >= \'2026-09-01\'', rows: [
          [9, 9]
        ] }
    ] },
    solution: {
      approach: `<p>Branch 1 seeks <code>idx_orders_customer</code>; branch 2 seeks <code>idx_orders_created</code> and drops rows already returned by branch 1. <code>UNION ALL</code> just concatenates — no sort, no hash. SQLite (MULTI-INDEX OR), PostgreSQL (BitmapOr) and MySQL (index_merge union) can do this internally, but the rewrite works everywhere and lets you tune each branch.</p>`,
      code: { lang: 'sql', db: 'shop', code: `EXPLAIN QUERY PLAN
SELECT id FROM orders WHERE customer_id = 42
UNION ALL
SELECT id FROM orders WHERE created_at >= '2026-09-01' AND customer_id <> 42;

SELECT
  (SELECT count(*) FROM orders WHERE customer_id = 42 OR created_at >= '2026-09-01') AS with_or,
  (SELECT count(*) FROM (
      SELECT id FROM orders WHERE customer_id = 42
      UNION ALL
      SELECT id FROM orders WHERE created_at >= '2026-09-01' AND customer_id <> 42)) AS with_union_all;` },
      complexity: `<p>Scan O(N) → two seeks O(log N + k₁) + O(log N + k₂).</p>`,
      followUps: ['When is plain UNION the better choice?', 'What does PostgreSQL\'s BitmapOr do differently from UNION ALL?']
    }
  });

  practice.push({
    title: 'Leaderboard with per-row subqueries (no index)', level: 'Medium', tags: ['correlated subquery', 'pre-aggregation', 'rewrite'], companies: ['Dream11', 'Zomato', 'Netflix'],
    statement: `<p>A leaderboard shows every customer's lifetime order count and spend. On a replica where <code>idx_orders_customer</code> was never created, it takes forever:</p><pre>SELECT c.id, c.name,
  (SELECT count(*)         FROM orders o WHERE o.customer_id = c.id) AS n,
  (SELECT sum(total_cents) FROM orders o WHERE o.customer_id = c.id) AS spend
FROM customers c ORDER BY spend DESC, c.id LIMIT 5;</pre><p>Rewrite it so <code>orders</code> is read <b>once</b>, and explain when the correlated form is actually fine.</p>`,
    constraints: `SQLite <code>shop</code> with <code>idx_orders_customer</code> dropped; top row: customer 246, 10 orders, 123,150.`,
    example: `<p>Measured (VM steps): correlated without index ≈ ${H.c('r', '4,176,000')}; pre-aggregated ≈ ${H.c('g', '59,000')} (70× less). With <code>idx_orders_customer</code> present, the correlated form drops to ≈ 22,000 — even cheaper in SQLite.</p>`,
    brute: { why: `<p>Each of 320 customers runs <b>two</b> subqueries, and without an index each one scans all 3,000 orders: 320 × 2 × 3,000 ≈ 1.9M row visits (plan: <code>CORRELATED SCALAR SUBQUERY</code> → <code>SCAN o</code>, twice). Classic N × M.</p>`, code: { lang: 'sql', db: 'shop', code: `DROP INDEX idx_orders_customer;
EXPLAIN QUERY PLAN
SELECT c.id, c.name,
  (SELECT count(*)         FROM orders o WHERE o.customer_id = c.id) AS n,
  (SELECT sum(total_cents) FROM orders o WHERE o.customer_id = c.id) AS spend
FROM customers c ORDER BY spend DESC, c.id LIMIT 5;` } },
    mcq: { q: 'When is a correlated subquery in the SELECT list perfectly fine?', options: ['Never', 'When the outer row count is small and the subquery is an index seek', 'Only in PostgreSQL', 'When it returns more than one row'], answer: 1, explain: 'It is a nested loop: cost ≈ outer rows × cost per probe. Few outer rows × cheap index seek is fast; many outer rows × scan is a disaster.' },
    hints: [`<p>Hint 1: Both subqueries aggregate the same table by the same key. Compute both aggregates in <b>one</b> GROUP BY.</p>`, `<p>Hint 2: Join the per-customer summary (300 rows) to customers. Use LEFT JOIN + COALESCE so the 20 customers with no orders still appear.</p>`, `<p>Hint 3: Measure both shapes; then try again with the index restored. Recipe: drop index → pre-aggregate → join → compare top 5.</p>`],
    tests: { engine: 'sqlite', check: '(rows, cols, c) => {\n  if (c.plan || c.noplan) { const d = rows.map(r => r[r.length - 1]).join(\'\\n\'); return (!c.plan || new RegExp(c.plan).test(d)) && (!c.noplan || !new RegExp(c.noplan).test(d)); }\n  let a = rows, b = c.rows || [];\n  if (c.set) { const k = r => JSON.stringify(r); a = a.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); b = b.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); }\n  return a.length === b.length && a.every((r, i) => r.length === b[i].length && r.every((v, j) => v === b[i][j] || (typeof v === \'number\' && typeof b[i][j] === \'number\' && Math.abs(v - b[i][j]) < 1e-6)));\n}', cases: [
      { rows: [
          [246, 'User 246', 10, 123150],
          [89, 'User 89', 10, 122460],
          [53, 'User 53', 10, 121340],
          [196, 'User 196', 10, 120650],
          [17, 'User 17', 10, 120220]
        ] },
      { setup: 'DELETE FROM orders', rows: [
          [1, 'User 1', 0, null],
          [2, 'User 2', 0, null],
          [3, 'User 3', 0, null],
          [4, 'User 4', 0, null],
          [5, 'User 5', 0, null]
        ] },
      { setup: 'DELETE FROM orders; INSERT INTO orders VALUES (1,3,\'x\',\'2025-01-01\',100),(2,2,\'x\',\'2025-01-01\',100),(3,1,\'x\',\'2025-01-01\',100)', rows: [
          [1, 'User 1', 1, 100],
          [2, 'User 2', 1, 100],
          [3, 'User 3', 1, 100],
          [4, 'User 4', 0, null],
          [5, 'User 5', 0, null]
        ] },
      { setup: 'INSERT INTO customers VALUES (321,\'u321@mail.com\',\'User 321\',\'Pune\',\'2025-01-01\',NULL); INSERT INTO orders VALUES (9601,321,\'x\',\'2025-01-01\',1000000)', rows: [
          [321, 'User 321', 1, 1000000],
          [246, 'User 246', 10, 123150],
          [89, 'User 89', 10, 122460],
          [53, 'User 53', 10, 121340],
          [196, 'User 196', 10, 120650]
        ] },
      { setup: 'DELETE FROM customers WHERE id > 2', rows: [
          [1, 'User 1', 10, 108500],
          [2, 'User 2', 10, 96670]
        ] },
      { rows: [], plan: null, noplan: 'idx_orders_customer', after: 'EXPLAIN QUERY PLAN SELECT c.id, c.name, COALESCE(a.n, 0) AS n, a.spend FROM customers c LEFT JOIN (SELECT customer_id, count(*) AS n, sum(total_cents) AS spend FROM orders GROUP BY customer_id) a ON a.customer_id = c.id ORDER BY a.spend DESC, c.id LIMIT 5' },
      { after: 'SELECT count(*) FROM sqlite_master WHERE name = \'idx_orders_customer\'', rows: [
          [0]
        ] },
      { after: 'SELECT count(*) FROM orders', rows: [
          [3000]
        ] }
    ] },
    solution: {
      approach: `<p>Aggregate once — <code>SELECT customer_id, count(*), sum(total_cents) FROM orders GROUP BY customer_id</code> — and LEFT JOIN that summary to customers. <code>orders</code> is scanned a single time; SQLite then probes the 300-row summary with an automatic index + Bloom filter (PostgreSQL would hash join). Rule of thumb: <b>set-based beats per-row when the outer side is large or the inner probe is a scan</b>; with a selective outer filter and an index, the correlated form can win (SQLite: 22K vs 44K steps with the index present).</p>`,
      code: { lang: 'sql', db: 'shop', code: `DROP INDEX idx_orders_customer;

EXPLAIN QUERY PLAN
SELECT c.id, c.name, COALESCE(a.n, 0) AS n, a.spend
FROM customers c
LEFT JOIN (SELECT customer_id, count(*) AS n, sum(total_cents) AS spend
           FROM orders GROUP BY customer_id) a ON a.customer_id = c.id
ORDER BY a.spend DESC, c.id LIMIT 5;

SELECT c.id, c.name, COALESCE(a.n, 0) AS n, a.spend
FROM customers c
LEFT JOIN (SELECT customer_id, count(*) AS n, sum(total_cents) AS spend
           FROM orders GROUP BY customer_id) a ON a.customer_id = c.id
ORDER BY a.spend DESC, c.id LIMIT 5;` },
      complexity: `<p>Correlated, no index: O(C × O) ≈ 1.9M row visits. Pre-aggregated: O(O log O) for the grouping + O(C) probes. With an index the correlated form is O(C × (log O + k)).</p>`,
      followUps: ['Write it with a window function instead.', 'Which form would you pick for "only the 40 Mumbai customers" and why?']
    }
  });

  practice.push({
    title: 'Aggregate before you join', level: 'Medium', tags: ['pre-aggregation', 'join', 'GROUP BY'], companies: ['Amazon', 'BigBasket'],
    statement: `<p>"Units sold per product category":</p><pre>SELECT p.category, sum(i.qty) AS units
FROM order_items i JOIN products p ON p.id = i.product_id
GROUP BY p.category ORDER BY p.category;</pre><p>The join looks up a product for each of the 6,000 order lines. Rewrite it so the join handles at most 60 rows, and verify identical results.</p>`,
    constraints: `SQLite <code>shop</code>: order_items 6,000 rows, 60 products, 5 categories.`,
    example: `<p>Both return 5 rows (books, garden, kitchen, tech, toys — 3,000 units each). Measured: ≈96,000 → ≈56,000 VM steps; on 50M order lines the join input shrinks from 50M rows to ≤ 60K product rows.</p>`,
    brute: { why: `<p>The join runs first: 6,000 primary-key lookups into products (<code>SCAN i</code> + <code>SEARCH p USING INTEGER PRIMARY KEY</code>), then a temp B-tree groups 6,000 joined rows into 5 categories. Most of that join work is repeated for the same 60 products.</p>`, code: { lang: 'sql', db: 'shop', code: `EXPLAIN QUERY PLAN
SELECT p.category, sum(i.qty) AS units
FROM order_items i JOIN products p ON p.id = i.product_id
GROUP BY p.category ORDER BY p.category;` } },
    mcq: { q: 'Why is "group order_items by product_id first" valid here?', options: ['sum() is decomposable: sum per product, then sum per category gives the same total', 'Because products is small', 'Because GROUP BY is always pushed down', 'It is only valid for count()'], answer: 0, explain: 'SUM/COUNT/MIN/MAX are decomposable aggregates, so partial sums can be combined. AVG must be split into SUM and COUNT; COUNT(DISTINCT) is not decomposable this way.' },
    hints: [`<p>Hint 1: Many order lines share a product. Collapse them to one row per product <i>before</i> the join.</p>`, `<p>Hint 2: Derived table: <code>SELECT product_id, sum(qty) AS units FROM order_items GROUP BY product_id</code> (can scan <code>idx_items_product</code> in order — no sort).</p>`, `<p>Hint 3: Join that (≤60 rows) to products and sum again by category. Check equality with EXCEPT. Recipe: pre-aggregate → join → re-aggregate → compare.</p>`],
    tests: { engine: 'sqlite', check: '(rows, cols, c) => {\n  if (c.plan || c.noplan) { const d = rows.map(r => r[r.length - 1]).join(\'\\n\'); return (!c.plan || new RegExp(c.plan).test(d)) && (!c.noplan || !new RegExp(c.noplan).test(d)); }\n  let a = rows, b = c.rows || [];\n  if (c.set) { const k = r => JSON.stringify(r); a = a.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); b = b.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); }\n  return a.length === b.length && a.every((r, i) => r.length === b[i].length && r.every((v, j) => v === b[i][j] || (typeof v === \'number\' && typeof b[i][j] === \'number\' && Math.abs(v - b[i][j]) < 1e-6)));\n}', cases: [
      { rows: [
          ['books', 3000],
          ['garden', 3000],
          ['kitchen', 3000],
          ['tech', 3000],
          ['toys', 3000]
        ] },
      { setup: 'INSERT INTO order_items VALUES (1, 999, 5)', rows: [
          ['books', 3000],
          ['garden', 3000],
          ['kitchen', 3000],
          ['tech', 3000],
          ['toys', 3000]
        ] },
      { setup: 'INSERT INTO products VALUES (61,\'P61\',\'zzz\',1); INSERT INTO order_items VALUES (1, 61, 7)', rows: [
          ['books', 3000],
          ['garden', 3000],
          ['kitchen', 3000],
          ['tech', 3000],
          ['toys', 3000],
          ['zzz', 7]
        ] },
      { setup: 'UPDATE order_items SET qty = 1', rows: [
          ['books', 1200],
          ['garden', 1200],
          ['kitchen', 1200],
          ['tech', 1200],
          ['toys', 1200]
        ] },
      { setup: 'DELETE FROM order_items', after: 'SELECT count(*) FROM (SELECT p.category, sum(a.units) FROM (SELECT product_id, sum(qty) AS units FROM order_items GROUP BY product_id) a JOIN products p ON p.id = a.product_id GROUP BY p.category)', rows: [
          [0]
        ] },
      { setup: 'INSERT INTO products VALUES (61,\'P61\',\'zzz\',1); INSERT INTO order_items VALUES (1, 61, 7)', after: 'SELECT count(*) FROM (SELECT p.category, sum(i.qty) FROM order_items i JOIN products p ON p.id = i.product_id GROUP BY p.category EXCEPT SELECT p.category, sum(a.units) FROM (SELECT product_id, sum(qty) AS units FROM order_items GROUP BY product_id) a JOIN products p ON p.id = a.product_id GROUP BY p.category)', rows: [
          [0]
        ] },
      { after: 'SELECT count(*) FROM (SELECT p.category, sum(i.qty) FROM order_items i JOIN products p ON p.id = i.product_id GROUP BY p.category EXCEPT SELECT p.category, sum(a.units) FROM (SELECT product_id, sum(qty) AS units FROM order_items GROUP BY product_id) a JOIN products p ON p.id = a.product_id GROUP BY p.category)', rows: [
          [0]
        ] },
      { setup: 'DELETE FROM order_items WHERE product_id % 5 <> 0', rows: [
          ['books', 3000]
        ] },
      { rows: [], plan: 'SCAN order_items|SCAN i', noplan: null, after: 'EXPLAIN QUERY PLAN SELECT p.category, sum(a.units) AS units FROM (SELECT product_id, sum(qty) AS units FROM order_items GROUP BY product_id) a JOIN products p ON p.id = a.product_id GROUP BY p.category ORDER BY p.category' }
    ] },
    solution: {
      approach: `<p><b>Eager (partial) aggregation:</b> sum quantities per product first (one ordered pass over <code>idx_items_product</code>, no sort), join the ≤ 60 summary rows to products, then roll up per category. Valid because SUM is decomposable. Some engines (SQL Server, Oracle, Spark) do this automatically in certain cases; most OLTP planners don't, so it's a manual rewrite worth knowing for star-schema reports.</p>`,
      code: { lang: 'sql', db: 'shop', code: `EXPLAIN QUERY PLAN
SELECT p.category, sum(a.units) AS units
FROM (SELECT product_id, sum(qty) AS units FROM order_items GROUP BY product_id) a
JOIN products p ON p.id = a.product_id
GROUP BY p.category ORDER BY p.category;

SELECT p.category, sum(a.units) AS units
FROM (SELECT product_id, sum(qty) AS units FROM order_items GROUP BY product_id) a
JOIN products p ON p.id = a.product_id
GROUP BY p.category ORDER BY p.category;

-- equivalence check: must print 0
SELECT count(*) AS differences FROM (
  SELECT p.category, sum(i.qty) FROM order_items i JOIN products p ON p.id = i.product_id GROUP BY p.category
  EXCEPT
  SELECT p.category, sum(a.units) FROM (SELECT product_id, sum(qty) AS units FROM order_items GROUP BY product_id) a
  JOIN products p ON p.id = a.product_id GROUP BY p.category);

-- The answer: the rewritten query
SELECT p.category, sum(a.units) AS units
FROM (SELECT product_id, sum(qty) AS units FROM order_items GROUP BY product_id) a
JOIN products p ON p.id = a.product_id
GROUP BY p.category ORDER BY p.category;` },
      complexity: `<p>Join input: 6,000 rows → 60 rows. Total: O(I) ordered scan + O(P) lookups instead of O(I) lookups + O(I log I) grouping.</p>`,
      followUps: ['How would you compute the <b>average</b> line quantity per category with this trick?', 'Why doesn\'t it work for COUNT(DISTINCT customer)?']
    }
  });

  /* =====================================================================
     PRACTICE — Hard
     ===================================================================== */
  practice.push({
    title: 'Cost it like a planner: seek or scan?', level: 'Hard', tags: ['cost model', 'cardinality', 'selectivity'], companies: ['Oracle', 'Snowflake', 'Databricks'],
    statement: `<p>Pretend you are PostgreSQL's planner. Using its default cost constants (sequential page 1.0, random page 4.0, cpu per row ≈ 0.0125 for a scan, ≈ 0.0175 per row fetched via an index) and statistics computed from the data, decide <b>scan vs index seek</b> for:</p><ol><li><code>WHERE customer_id = 42</code> (index on customer_id)</li><li><code>WHERE status = 'delivered'</code> (index on status)</li></ol><p><code>orders</code> occupies 32 pages. Do all the arithmetic in SQL.</p>`,
    constraints: `Estimate equality rows as rows/NDV (customer_id) and via an MCV frequency (status). For many matching rows on few pages, use the Mackert–Lohman approximation pages_fetched ≈ 2·T·N / (2·T + N). Index descent ≈ 3 random pages.`,
    example: `<p>Expected: est rows 10 and 1,760; seq scan cost ${H.c('b', '69.5')}; index cost for customer 42 ${H.c('g', '52.2')} (seek wins); index cost for delivered ${H.c('r', '289.8')} (scan wins — 59% of rows).</p>`,
    brute: { why: `<p>The brute force is to run both plans and time them — in production, on every query shape, with hints or <code>NOT INDEXED</code>. That's slow, noisy (cache state changes every run) and doesn't explain anything. A planner instead predicts both costs from a few numbers; you should be able to do the same on a whiteboard.</p>`, code: { lang: 'sql', db: 'shop', code: `-- "Just try both" (what the planner avoids doing):
EXPLAIN QUERY PLAN SELECT * FROM orders WHERE status = 'delivered';
EXPLAIN QUERY PLAN SELECT * FROM orders NOT INDEXED WHERE status = 'delivered';
SELECT count(*) FROM orders WHERE status = 'delivered';` } },
    mcq: { q: 'Why does the index lose for status = \'delivered\' even though it "uses an index"?', options: ['Indexes never work on TEXT', '1,760 matches spread over 32 pages cause ~62 random page fetches (×4) plus per-row CPU, more than reading 32 pages sequentially', 'The index is not unique', 'Because of MVCC'], answer: 1, explain: 'Random fetches cost 4× a sequential page; with 59% selectivity the index path touches the same pages repeatedly and in random order. A full scan reads each page once, sequentially.' },
    hints: [`<p>Hint 1: Cardinality first: rows(customer_id = 42) ≈ 3000 / 300; rows(status = delivered) = MCV frequency × 3000.</p>`, `<p>Hint 2: Seq scan = pages × 1.0 + rows × 0.0125. Index = 3 × 4.0 (descent) + pages_fetched × 4.0 + matches × 0.0175, where pages_fetched = matches for tiny k, or 2·T·N/(2·T+N) when N is large relative to T.</p>`, `<p>Hint 3: Use a CTE for the statistics, a second CTE for the estimates, and a final SELECT with <code>round()</code>. Then compare with what a real planner would choose (SQLite has no MCV stats, so it still picks the index for 'delivered').</p>`],
    tests: { engine: 'sqlite', check: '(rows, cols, c) => {\n  if (c.plan || c.noplan) { const d = rows.map(r => r[r.length - 1]).join(\'\\n\'); return (!c.plan || new RegExp(c.plan).test(d)) && (!c.noplan || !new RegExp(c.noplan).test(d)); }\n  let a = rows, b = c.rows || [];\n  if (c.set) { const k = r => JSON.stringify(r); a = a.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); b = b.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); }\n  return a.length === b.length && a.every((r, i) => r.length === b[i].length && r.every((v, j) => v === b[i][j] || (typeof v === \'number\' && typeof b[i][j] === \'number\' && Math.abs(v - b[i][j]) < 1e-6)));\n}', cases: [
      { rows: [
          [10, 1760, 69.5, 52.2, 289.8]
        ] },
      { setup: 'DELETE FROM orders; WITH RECURSIVE s(n) AS (SELECT 1 UNION ALL SELECT n + 1 FROM s WHERE n < 120) INSERT INTO orders SELECT n, 1 + (n % 10), CASE WHEN n <= 60 THEN \'delivered\' ELSE \'cancelled\' END, \'2025-01-01\', 100 FROM s', rows: [
          [12, 60, 33.5, 60.2, 136.9]
        ] },
      { setup: 'DELETE FROM orders; WITH RECURSIVE s(n) AS (SELECT 1 UNION ALL SELECT n + 1 FROM s WHERE n < 1000) INSERT INTO orders SELECT n, 1 + (n % 1000), CASE WHEN n <= 0 THEN \'delivered\' ELSE \'cancelled\' END, \'2025-01-01\', 100 FROM s', rows: [
          [1, 0, 44.5, 16, 12]
        ] },
      { setup: 'DELETE FROM orders; WITH RECURSIVE s(n) AS (SELECT 1 UNION ALL SELECT n + 1 FROM s WHERE n < 200) INSERT INTO orders SELECT n, 1 + (n % 5), CASE WHEN n <= 200 THEN \'delivered\' ELSE \'cancelled\' END, \'2025-01-01\', 100 FROM s', rows: [
          [40, 200, 34.5, 172.7, 209.4]
        ] },
      { setup: 'DELETE FROM orders; WITH RECURSIVE s(n) AS (SELECT 1 UNION ALL SELECT n + 1 FROM s WHERE n < 64) INSERT INTO orders SELECT n, 1 + (n % 64), CASE WHEN n <= 64 THEN \'delivered\' ELSE \'cancelled\' END, \'2025-01-01\', 100 FROM s', rows: [
          [1, 64, 32.8, 16, 141.1]
        ] },
      { setup: 'DELETE FROM orders; WITH RECURSIVE s(n) AS (SELECT 1 UNION ALL SELECT n + 1 FROM s WHERE n < 10) INSERT INTO orders SELECT n, 1 + (n % 2), CASE WHEN n <= 3 THEN \'delivered\' ELSE \'cancelled\' END, \'2025-01-01\', 100 FROM s', rows: [
          [5, 3, 32.1, 32.1, 23.5]
        ] },
      { setup: 'DELETE FROM orders; WITH RECURSIVE s(n) AS (SELECT 1 UNION ALL SELECT n + 1 FROM s WHERE n < 5000) INSERT INTO orders SELECT n, 1 + (n % 40), CASE WHEN n <= 1250 THEN \'delivered\' ELSE \'cancelled\' END, \'2025-01-01\', 100 FROM s', rows: [
          [125, 1250, 94.5, 514.2, 277.4]
        ] },
      { setup: 'DELETE FROM orders WHERE status <> \'delivered\'', rows: [
          [10, 1760, 54, 52.2, 289.8]
        ] }
    ] },
    solution: {
      approach: `<p>Compute statistics the way ANALYZE would (row count, NDV, MCV frequency), derive the estimated row counts, and plug them into the two cost formulas. For <code>customer_id = 42</code>: 10 rows → index ≈ 12 + 40 + 0.2 = 52.2 &lt; 69.5 → <b>seek</b>. For <code>status = 'delivered'</code>: 1,760 rows → ≈ 62 random page fetches → ≈ 289.8 &gt; 69.5 → <b>seq scan</b>. That's exactly why PostgreSQL ignores a low-selectivity index. SQLite, lacking MCV statistics, still seeks — a nice illustration that plans depend on what stats the engine has.</p>`,
      code: { lang: 'sql', db: 'shop', code: `WITH s AS (
  SELECT count(*) * 1.0                AS n,
         32.0                          AS pages,
         count(DISTINCT customer_id)   AS ndv_c,
         (SELECT count(*) FROM orders WHERE status = 'delivered') * 1.0 / count(*) AS mcv_delivered
  FROM orders
), est AS (
  SELECT n, pages, n / ndv_c AS rows_c, n * mcv_delivered AS rows_d FROM s
)
SELECT
  round(rows_c, 1)                                   AS est_rows_customer_42,
  round(rows_d, 1)                                   AS est_rows_delivered,
  round(pages * 1.0 + n * 0.0125, 1)                 AS seq_scan_cost,
  round(3 * 4.0 + rows_c * 4.0 + rows_c * 0.0175, 1) AS idx_cost_customer_42,
  round(3 * 4.0 + (2 * pages * rows_d / (2 * pages + rows_d)) * 4.0
        + rows_d * 0.0175, 1)                        AS idx_cost_delivered
FROM est;` },
      complexity: `<p>Planner work is O(1) per candidate — that's the point of estimating. The arithmetic: 69.5 (scan) vs 52.2 (seek) for 0.3% selectivity; 69.5 vs 289.8 for 59%.</p>`,
      followUps: ['Re-run the numbers with random_page_cost = 1.1 (SSD). Does the delivered decision change?', 'What if the table were physically sorted by status (correlation ≈ 1)?']
    }
  });

  practice.push({
    title: 'Latest order for every customer', level: 'Hard', tags: ['correlated subquery', 'composite index', 'window function', 'greatest-n-per-group'], companies: ['Amazon', 'Uber', 'Swiggy'],
    statement: `<p>Return each customer's most recent order (customer_id, order id, created_at). The current query:</p><pre>SELECT o.customer_id, o.id, o.created_at
FROM orders o
WHERE o.created_at = (SELECT max(o2.created_at) FROM orders o2
                      WHERE o2.customer_id = o.customer_id)
ORDER BY o.customer_id;</pre><p>Make it fast, keep it correct, and compare at least two formulations with the planner and with measurements.</p>`,
    constraints: `SQLite <code>shop</code>; 300 customers have orders; <code>created_at</code> is unique per customer here (discuss ties anyway). One new index allowed.`,
    example: `<p>First rows: ${H.c('g', '1 | 2400 | 2026-04-26 20:40:00')}, ${H.c('g', '2 | 2143 | 2026-07-26 16:02:37')}, ${H.c('g', '3 | 86 | 2026-09-15 01:55:14')}. Measured (VM steps, all 300 rows): original ≈ 232,000; with index <code>(customer_id, created_at)</code> ≈ 58,000; SQLite bare-column <code>max()</code> ≈ 37,000; window function ≈ 164,000.</p>`,
    brute: { why: `<p>For each of the 3,000 orders, the correlated subquery seeks that customer's ~10 orders in <code>idx_orders_customer</code> and reads each one from the table to find the max <code>created_at</code>: 3,000 × (seek + 10 table lookups). Same work repeated 10 times per customer, plus table lookups because the index doesn't contain <code>created_at</code>.</p>`, code: { lang: 'sql', db: 'shop', code: `EXPLAIN QUERY PLAN
SELECT o.customer_id, o.id, o.created_at
FROM orders o
WHERE o.created_at = (SELECT max(o2.created_at) FROM orders o2
                      WHERE o2.customer_id = o.customer_id)
ORDER BY o.customer_id;
-- SCAN o USING INDEX idx_orders_customer
-- CORRELATED SCALAR SUBQUERY 1
--   SEARCH o2 USING INDEX idx_orders_customer (customer_id=?)` } },
    mcq: { q: 'With an index on (customer_id, created_at), how does the engine find max(created_at) for one customer?', options: ['Scan all of that customer\'s entries', 'Seek to the customer and read the LAST entry of its range', 'Sort the customer\'s orders', 'It cannot use the index for max()'], answer: 1, explain: 'Inside one customer_id the entries are sorted by created_at, so the max is the last entry of the range — an O(log N) min/max optimization, and covering (no table access).' },
    hints: [`<p>Hint 1: The expensive part is "max created_at for one customer". Which index makes that a single seek with no table access?</p>`, `<p>Hint 2: <code>(customer_id, created_at)</code>: equality column first, then the column you take the max of. Now both the outer scan and the subquery become COVERING.</p>`, `<p>Hint 3: Compare alternatives: <code>ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY created_at DESC)</code> (portable; but SQLite sorts here), SQLite's bare-column <code>max()</code>, PostgreSQL's <code>DISTINCT ON</code>. Think about ties: "= max" returns all tied rows; ROW_NUMBER picks one (add id as tie-breaker).</p>`],
    tests: { engine: 'sqlite', check: '(rows, cols, c) => {\n  if (c.plan || c.noplan) { const d = rows.map(r => r[r.length - 1]).join(\'\\n\'); return (!c.plan || new RegExp(c.plan).test(d)) && (!c.noplan || !new RegExp(c.noplan).test(d)); }\n  let a = rows, b = c.rows || [];\n  if (c.set) { const k = r => JSON.stringify(r); a = a.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); b = b.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); }\n  return a.length === b.length && a.every((r, i) => r.length === b[i].length && r.every((v, j) => v === b[i][j] || (typeof v === \'number\' && typeof b[i][j] === \'number\' && Math.abs(v - b[i][j]) < 1e-6)));\n}', cases: [
      { rows: [
          [1, 2400, '2026-04-26 20:40:00'],
          [2, 2143, '2026-07-26 16:02:37'],
          [3, 86, '2026-09-15 01:55:14'],
          [4, 2229, '2026-07-08 17:57:51'],
          [5, 1072, '2026-09-17 20:35:28'],
          [6, 2315, '2026-06-20 19:53:05'],
          [7, 2058, '2026-09-19 15:15:42'],
          [8, 2401, '2026-06-02 21:48:19'],
          [9, 2144, '2026-09-01 17:10:56'],
          [10, 2487, '2026-05-15 23:43:33'],
          [11, 2230, '2026-08-14 19:06:10'],
          [12, 2573, '2026-04-27 01:38:47'],
          [13, 2316, '2026-07-27 21:01:24'],
          [14, 259, '2026-09-16 06:54:01'],
          [15, 2402, '2026-07-09 22:56:38'],
          [16, 1245, '2026-09-18 01:34:15'],
          [17, 2488, '2026-06-21 00:51:52'],
          [18, 2231, '2026-09-20 20:14:29'],
          [19, 2574, '2026-06-03 02:47:06'],
          [20, 2317, '2026-09-02 22:09:43'],
          [21, 2660, '2026-05-16 04:42:20'],
          [22, 2403, '2026-08-15 00:04:57'],
          [23, 2746, '2026-04-28 06:37:34'],
          [24, 2489, '2026-07-28 02:00:11'],
          [25, 432, '2026-09-17 11:52:48'],
          [26, 2575, '2026-07-10 03:55:25'],
          [27, 1418, '2026-09-19 06:33:02'],
          [28, 2661, '2026-06-22 05:50:39'],
          [29, 2404, '2026-09-21 01:13:16'],
          [30, 2747, '2026-06-04 07:45:53'],
          [31, 2490, '2026-09-03 03:08:30'],
          [32, 2833, '2026-05-17 09:41:07'],
          [33, 2576, '2026-08-16 05:03:44'],
          [34, 2919, '2026-04-29 11:36:21'],
          [35, 2662, '2026-07-29 06:58:58'],
          [36, 605, '2026-09-18 16:51:35'],
          [37, 2748, '2026-07-11 08:54:12'],
          [38, 1591, '2026-09-20 11:31:49'],
          [39, 2834, '2026-06-23 10:49:26'],
          [40, 2577, '2026-09-22 06:12:03'],
          [41, 2920, '2026-06-05 12:44:40'],
          [42, 2663, '2026-09-04 08:07:17'],
          [43, 2106, '2026-04-28 21:54:54'],
          [44, 2749, '2026-08-17 10:02:31'],
          [45, 2192, '2026-04-10 23:50:08'],
          [46, 2835, '2026-07-30 11:57:45'],
          [47, 778, '2026-09-19 21:50:22'],
          [48, 2921, '2026-07-12 13:52:59'],
          [49, 1764, '2026-09-21 16:30:36'],
          [50, 2107, '2026-06-04 23:03:13'],
          [51, 2750, '2026-09-23 11:10:50'],
          [52, 2193, '2026-05-17 00:58:27'],
          [53, 2836, '2026-09-05 13:06:04'],
          [54, 2279, '2026-04-29 02:53:41'],
          [55, 2922, '2026-08-18 15:01:18'],
          [56, 2365, '2026-04-11 04:48:55'],
          [57, 2108, '2026-07-11 00:11:32'],
          [58, 951, '2026-09-20 02:49:09'],
          [59, 2194, '2026-06-23 02:06:46'],
          [60, 1937, '2026-09-22 21:29:23'],
          [61, 2280, '2026-06-05 04:02:00'],
          [62, 2923, '2026-09-24 16:09:37'],
          [63, 2366, '2026-05-18 05:57:14'],
          [64, 2109, '2026-08-17 01:19:51'],
          [65, 2452, '2026-04-30 07:52:28'],
          [66, 2195, '2026-07-30 03:15:05'],
          [67, 138, '2026-09-19 13:07:42'],
          [68, 2281, '2026-07-12 05:10:19'],
          [69, 1124, '2026-09-21 07:47:56'],
          [70, 2367, '2026-06-24 07:05:33'],
          [71, 2110, '2026-09-23 02:28:10'],
          [72, 2453, '2026-06-06 09:00:47'],
          [73, 2196, '2026-09-05 04:23:24'],
          [74, 2539, '2026-05-19 10:56:01'],
          [75, 2282, '2026-08-18 06:18:38'],
          [76, 2625, '2026-05-01 12:51:15'],
          [77, 2368, '2026-07-31 08:13:52'],
          [78, 311, '2026-09-20 18:06:29'],
          [79, 2454, '2026-07-13 10:09:06'],
          [80, 1297, '2026-09-22 12:46:43'],
          [81, 2540, '2026-06-25 12:04:20'],
          [82, 2283, '2026-09-24 07:26:57'],
          [83, 2626, '2026-06-07 13:59:34'],
          [84, 2369, '2026-09-06 09:22:11'],
          [85, 2712, '2026-05-20 15:54:48'],
          [86, 2455, '2026-08-19 11:17:25'],
          [87, 2798, '2026-05-02 17:50:02'],
          [88, 2541, '2026-08-01 13:12:39'],
          [89, 484, '2026-09-21 23:05:16'],
          [90, 2627, '2026-07-14 15:07:53'],
          [91, 1470, '2026-09-23 17:45:30'],
          [92, 2713, '2026-06-26 17:03:07'],
          [93, 2456, '2026-09-25 12:25:44'],
          [94, 2799, '2026-06-08 18:58:21'],
          [95, 2542, '2026-09-07 14:20:58'],
          [96, 2885, '2026-05-21 20:53:35'],
          [97, 2628, '2026-08-20 16:16:12'],
          [98, 2971, '2026-05-03 22:48:49'],
          [99, 2714, '2026-08-02 18:11:26'],
          [100, 657, '2026-09-22 04:04:03'],
          [101, 2800, '2026-07-15 20:06:40'],
          [102, 1643, '2026-09-24 22:44:17'],
          [103, 2886, '2026-06-27 22:01:54'],
          [104, 2629, '2026-09-26 17:24:31'],
          [105, 2972, '2026-06-09 23:57:08'],
          [106, 2715, '2026-09-08 19:19:45'],
          [107, 2158, '2026-05-02 09:07:22'],
          [108, 2801, '2026-08-21 21:14:59'],
          [109, 2244, '2026-04-14 11:02:36'],
          [110, 2887, '2026-08-03 23:10:13'],
          [111, 830, '2026-09-23 09:02:50'],
          [112, 2973, '2026-07-16 01:05:27'],
          [113, 1816, '2026-09-25 03:43:04'],
          [114, 2159, '2026-06-08 10:15:41'],
          [115, 2802, '2026-09-27 22:23:18'],
          [116, 2245, '2026-05-21 12:10:55'],
          [117, 2888, '2026-09-09 00:18:32'],
          [118, 2331, '2026-05-03 14:06:09'],
          [119, 2974, '2026-08-22 02:13:46'],
          [120, 17, '2026-09-22 19:21:23'],
          [121, 2160, '2026-07-15 11:24:00'],
          [122, 1003, '2026-09-24 14:01:37'],
          [123, 2246, '2026-06-27 13:19:14'],
          [124, 1989, '2026-09-26 08:41:51'],
          [125, 2332, '2026-06-09 15:14:28'],
          [126, 2975, '2026-09-28 03:22:05'],
          [127, 2418, '2026-05-22 17:09:42'],
          [128, 2161, '2026-08-21 12:32:19'],
          [129, 2504, '2026-05-04 19:04:56'],
          [130, 2247, '2026-08-03 14:27:33'],
          [131, 190, '2026-09-23 00:20:10'],
          [132, 2333, '2026-07-16 16:22:47'],
          [133, 1176, '2026-09-25 19:00:24'],
          [134, 2419, '2026-06-28 18:18:01'],
          [135, 2162, '2026-09-27 13:40:38'],
          [136, 2505, '2026-06-10 20:13:15'],
          [137, 2248, '2026-09-09 15:35:52'],
          [138, 2591, '2026-05-23 22:08:29'],
          [139, 2334, '2026-08-22 17:31:06'],
          [140, 2677, '2026-05-05 00:03:43'],
          [141, 2420, '2026-08-04 19:26:20'],
          [142, 363, '2026-09-24 05:18:57'],
          [143, 2506, '2026-07-17 21:21:34'],
          [144, 1349, '2026-09-26 23:59:11'],
          [145, 2592, '2026-06-29 23:16:48'],
          [146, 2335, '2026-09-28 18:39:25'],
          [147, 2678, '2026-06-11 01:12:02'],
          [148, 2421, '2026-09-10 20:34:39'],
          [149, 2764, '2026-05-24 03:07:16'],
          [150, 2507, '2026-08-23 22:29:53'],
          [151, 2850, '2026-05-06 05:02:30'],
          [152, 2593, '2026-08-05 00:25:07'],
          [153, 536, '2026-09-25 10:17:44'],
          [154, 2679, '2026-07-18 02:20:21'],
          [155, 1522, '2026-09-27 04:57:58'],
          [156, 2765, '2026-06-30 04:15:35'],
          [157, 2508, '2026-09-29 23:38:12'],
          [158, 2851, '2026-06-12 06:10:49'],
          [159, 2594, '2026-09-11 01:33:26'],
          [160, 2937, '2026-05-25 08:06:03'],
          [161, 2680, '2026-08-24 03:28:40'],
          [162, 2123, '2026-04-17 17:16:17'],
          [163, 2766, '2026-08-06 05:23:54'],
          [164, 709, '2026-09-26 15:16:31'],
          [165, 2852, '2026-07-19 07:19:08'],
          [166, 1695, '2026-09-28 09:56:45'],
          [167, 2938, '2026-07-01 09:14:22'],
          [168, 2681, '2026-09-30 04:36:59'],
          [169, 2124, '2026-05-24 18:24:36'],
          [170, 2767, '2026-09-12 06:32:13'],
          [171, 2210, '2026-05-06 20:19:50'],
          [172, 2853, '2026-08-25 08:27:27'],
          [173, 2296, '2026-04-18 22:15:04'],
          [174, 2939, '2026-08-07 10:22:41'],
          [175, 882, '2026-09-27 20:15:18'],
          [176, 2125, '2026-06-30 19:32:55'],
          [177, 1868, '2026-09-29 14:55:32'],
          [178, 2211, '2026-06-12 21:28:09'],
          [179, 2854, '2026-10-01 09:35:46'],
          [180, 2297, '2026-05-25 23:23:23'],
          [181, 2940, '2026-09-13 11:31:00'],
          [182, 2383, '2026-05-07 01:18:37'],
          [183, 2126, '2026-08-06 20:41:14'],
          [184, 69, '2026-09-26 06:33:51'],
          [185, 2212, '2026-07-19 22:36:28'],
          [186, 1055, '2026-09-28 01:14:05'],
          [187, 2298, '2026-07-01 00:31:42'],
          [188, 2041, '2026-09-30 19:54:19'],
          [189, 2384, '2026-06-13 02:26:56'],
          [190, 2127, '2026-09-12 21:49:33'],
          [191, 2470, '2026-05-26 04:22:10'],
          [192, 2213, '2026-08-25 23:44:47'],
          [193, 2556, '2026-05-08 06:17:24'],
          [194, 2299, '2026-08-07 01:40:01'],
          [195, 242, '2026-09-27 11:32:38'],
          [196, 2385, '2026-07-20 03:35:15'],
          [197, 1228, '2026-09-29 06:12:52'],
          [198, 2471, '2026-07-02 05:30:29'],
          [199, 2214, '2026-10-01 00:53:06'],
          [200, 2557, '2026-06-14 07:25:43'],
          [201, 2300, '2026-09-13 02:48:20'],
          [202, 2643, '2026-05-27 09:20:57'],
          [203, 2386, '2026-08-26 04:43:34'],
          [204, 2729, '2026-05-09 11:16:11'],
          [205, 2472, '2026-08-08 06:38:48'],
          [206, 415, '2026-09-28 16:31:25'],
          [207, 2558, '2026-07-21 08:34:02'],
          [208, 1401, '2026-09-30 11:11:39'],
          [209, 2644, '2026-07-03 10:29:16'],
          [210, 2387, '2026-10-02 05:51:53'],
          [211, 2730, '2026-06-15 12:24:30'],
          [212, 2473, '2026-09-14 07:47:07'],
          [213, 2816, '2026-05-28 14:19:44'],
          [214, 2559, '2026-08-27 09:42:21'],
          [215, 2902, '2026-05-10 16:14:58'],
          [216, 2645, '2026-08-09 11:37:35'],
          [217, 588, '2026-09-29 21:30:12'],
          [218, 2731, '2026-07-22 13:32:49'],
          [219, 1574, '2026-10-01 16:10:26'],
          [220, 2817, '2026-07-04 15:28:03'],
          [221, 1660, '2026-09-13 18:05:40'],
          [222, 2903, '2026-06-16 17:23:17'],
          [223, 2646, '2026-09-15 12:45:54'],
          [224, 2989, '2026-05-29 19:18:31'],
          [225, 2732, '2026-08-28 14:41:08'],
          [226, 2175, '2026-04-21 04:28:45'],
          [227, 2818, '2026-08-10 16:36:22'],
          [228, 761, '2026-09-30 02:28:59'],
          [229, 2904, '2026-07-23 18:31:36'],
          [230, 1747, '2026-10-02 21:09:13'],
          [231, 2990, '2026-07-05 20:26:50'],
          [232, 1833, '2026-09-14 23:04:27'],
          [233, 2176, '2026-05-28 05:37:04'],
          [234, 2819, '2026-09-16 17:44:41'],
          [235, 2262, '2026-05-10 07:32:18'],
          [236, 2905, '2026-08-29 19:39:55'],
          [237, 2348, '2026-04-22 09:27:32'],
          [238, 2991, '2026-08-11 21:35:09'],
          [239, 934, '2026-10-01 07:27:46'],
          [240, 2177, '2026-07-04 06:45:23'],
          [241, 1020, '2026-09-13 09:23:00'],
          [242, 2263, '2026-06-16 08:40:37'],
          [243, 2006, '2026-09-15 04:03:14'],
          [244, 2349, '2026-05-29 10:35:51'],
          [245, 2992, '2026-09-17 22:43:28'],
          [246, 2435, '2026-05-11 12:31:05'],
          [247, 2178, '2026-08-10 07:53:42'],
          [248, 121, '2026-09-30 17:46:19'],
          [249, 2264, '2026-07-23 09:48:56'],
          [250, 1107, '2026-10-02 12:26:33'],
          [251, 2350, '2026-07-05 11:44:10'],
          [252, 1193, '2026-09-14 14:21:47'],
          [253, 2436, '2026-06-17 13:39:24'],
          [254, 2179, '2026-09-16 09:02:01'],
          [255, 2522, '2026-05-30 15:34:38'],
          [256, 2265, '2026-08-29 10:57:15'],
          [257, 2608, '2026-05-12 17:29:52'],
          [258, 2351, '2026-08-11 12:52:29'],
          [259, 294, '2026-10-01 22:45:06'],
          [260, 2437, '2026-07-24 14:47:43'],
          [261, 380, '2026-09-13 00:40:20'],
          [262, 2523, '2026-07-06 16:42:57'],
          [263, 1366, '2026-09-15 19:20:34'],
          [264, 2609, '2026-06-18 18:38:11'],
          [265, 2352, '2026-09-17 14:00:48'],
          [266, 2695, '2026-05-31 20:33:25'],
          [267, 2438, '2026-08-30 15:56:02'],
          [268, 2781, '2026-05-13 22:28:39'],
          [269, 2524, '2026-08-12 17:51:16'],
          [270, 467, '2026-10-02 03:43:53'],
          [271, 2610, '2026-07-25 19:46:30'],
          [272, 553, '2026-09-14 05:39:07'],
          [273, 2696, '2026-07-07 21:41:44'],
          [274, 1539, '2026-09-16 00:19:21'],
          [275, 2782, '2026-06-19 23:36:58'],
          [276, 2525, '2026-09-18 18:59:35'],
          [277, 2868, '2026-06-01 01:32:12'],
          [278, 2611, '2026-08-31 20:54:49'],
          [279, 2954, '2026-05-14 03:27:26'],
          [280, 2697, '2026-08-13 22:50:03'],
          [281, 2140, '2026-04-06 12:37:40'],
          [282, 2783, '2026-07-26 00:45:17'],
          [283, 726, '2026-09-15 10:37:54'],
          [284, 2869, '2026-07-08 02:40:31'],
          [285, 1712, '2026-09-17 05:18:08'],
          [286, 2955, '2026-06-20 04:35:45'],
          [287, 2698, '2026-09-19 23:58:22'],
          [288, 2141, '2026-05-13 13:45:59'],
          [289, 2784, '2026-09-01 01:53:36'],
          [290, 2227, '2026-04-25 15:41:13'],
          [291, 2870, '2026-08-14 03:48:50'],
          [292, 2313, '2026-04-07 17:36:27'],
          [293, 2956, '2026-07-27 05:44:04'],
          [294, 899, '2026-09-16 15:36:41'],
          [295, 2142, '2026-06-19 14:54:18'],
          [296, 1885, '2026-09-18 10:16:55'],
          [297, 2228, '2026-06-01 16:49:32'],
          [298, 2871, '2026-09-20 04:57:09'],
          [299, 2314, '2026-05-14 18:44:46'],
          [300, 2957, '2026-09-02 06:52:23']
        ] },
      { setup: 'INSERT INTO orders VALUES (9701,1,\'paid\',\'2030-01-01 00:00:00\',5)', rows: [
          [1, 9701, '2030-01-01 00:00:00'],
          [2, 2143, '2026-07-26 16:02:37'],
          [3, 86, '2026-09-15 01:55:14'],
          [4, 2229, '2026-07-08 17:57:51'],
          [5, 1072, '2026-09-17 20:35:28'],
          [6, 2315, '2026-06-20 19:53:05'],
          [7, 2058, '2026-09-19 15:15:42'],
          [8, 2401, '2026-06-02 21:48:19'],
          [9, 2144, '2026-09-01 17:10:56'],
          [10, 2487, '2026-05-15 23:43:33'],
          [11, 2230, '2026-08-14 19:06:10'],
          [12, 2573, '2026-04-27 01:38:47'],
          [13, 2316, '2026-07-27 21:01:24'],
          [14, 259, '2026-09-16 06:54:01'],
          [15, 2402, '2026-07-09 22:56:38'],
          [16, 1245, '2026-09-18 01:34:15'],
          [17, 2488, '2026-06-21 00:51:52'],
          [18, 2231, '2026-09-20 20:14:29'],
          [19, 2574, '2026-06-03 02:47:06'],
          [20, 2317, '2026-09-02 22:09:43'],
          [21, 2660, '2026-05-16 04:42:20'],
          [22, 2403, '2026-08-15 00:04:57'],
          [23, 2746, '2026-04-28 06:37:34'],
          [24, 2489, '2026-07-28 02:00:11'],
          [25, 432, '2026-09-17 11:52:48'],
          [26, 2575, '2026-07-10 03:55:25'],
          [27, 1418, '2026-09-19 06:33:02'],
          [28, 2661, '2026-06-22 05:50:39'],
          [29, 2404, '2026-09-21 01:13:16'],
          [30, 2747, '2026-06-04 07:45:53'],
          [31, 2490, '2026-09-03 03:08:30'],
          [32, 2833, '2026-05-17 09:41:07'],
          [33, 2576, '2026-08-16 05:03:44'],
          [34, 2919, '2026-04-29 11:36:21'],
          [35, 2662, '2026-07-29 06:58:58'],
          [36, 605, '2026-09-18 16:51:35'],
          [37, 2748, '2026-07-11 08:54:12'],
          [38, 1591, '2026-09-20 11:31:49'],
          [39, 2834, '2026-06-23 10:49:26'],
          [40, 2577, '2026-09-22 06:12:03'],
          [41, 2920, '2026-06-05 12:44:40'],
          [42, 2663, '2026-09-04 08:07:17'],
          [43, 2106, '2026-04-28 21:54:54'],
          [44, 2749, '2026-08-17 10:02:31'],
          [45, 2192, '2026-04-10 23:50:08'],
          [46, 2835, '2026-07-30 11:57:45'],
          [47, 778, '2026-09-19 21:50:22'],
          [48, 2921, '2026-07-12 13:52:59'],
          [49, 1764, '2026-09-21 16:30:36'],
          [50, 2107, '2026-06-04 23:03:13'],
          [51, 2750, '2026-09-23 11:10:50'],
          [52, 2193, '2026-05-17 00:58:27'],
          [53, 2836, '2026-09-05 13:06:04'],
          [54, 2279, '2026-04-29 02:53:41'],
          [55, 2922, '2026-08-18 15:01:18'],
          [56, 2365, '2026-04-11 04:48:55'],
          [57, 2108, '2026-07-11 00:11:32'],
          [58, 951, '2026-09-20 02:49:09'],
          [59, 2194, '2026-06-23 02:06:46'],
          [60, 1937, '2026-09-22 21:29:23'],
          [61, 2280, '2026-06-05 04:02:00'],
          [62, 2923, '2026-09-24 16:09:37'],
          [63, 2366, '2026-05-18 05:57:14'],
          [64, 2109, '2026-08-17 01:19:51'],
          [65, 2452, '2026-04-30 07:52:28'],
          [66, 2195, '2026-07-30 03:15:05'],
          [67, 138, '2026-09-19 13:07:42'],
          [68, 2281, '2026-07-12 05:10:19'],
          [69, 1124, '2026-09-21 07:47:56'],
          [70, 2367, '2026-06-24 07:05:33'],
          [71, 2110, '2026-09-23 02:28:10'],
          [72, 2453, '2026-06-06 09:00:47'],
          [73, 2196, '2026-09-05 04:23:24'],
          [74, 2539, '2026-05-19 10:56:01'],
          [75, 2282, '2026-08-18 06:18:38'],
          [76, 2625, '2026-05-01 12:51:15'],
          [77, 2368, '2026-07-31 08:13:52'],
          [78, 311, '2026-09-20 18:06:29'],
          [79, 2454, '2026-07-13 10:09:06'],
          [80, 1297, '2026-09-22 12:46:43'],
          [81, 2540, '2026-06-25 12:04:20'],
          [82, 2283, '2026-09-24 07:26:57'],
          [83, 2626, '2026-06-07 13:59:34'],
          [84, 2369, '2026-09-06 09:22:11'],
          [85, 2712, '2026-05-20 15:54:48'],
          [86, 2455, '2026-08-19 11:17:25'],
          [87, 2798, '2026-05-02 17:50:02'],
          [88, 2541, '2026-08-01 13:12:39'],
          [89, 484, '2026-09-21 23:05:16'],
          [90, 2627, '2026-07-14 15:07:53'],
          [91, 1470, '2026-09-23 17:45:30'],
          [92, 2713, '2026-06-26 17:03:07'],
          [93, 2456, '2026-09-25 12:25:44'],
          [94, 2799, '2026-06-08 18:58:21'],
          [95, 2542, '2026-09-07 14:20:58'],
          [96, 2885, '2026-05-21 20:53:35'],
          [97, 2628, '2026-08-20 16:16:12'],
          [98, 2971, '2026-05-03 22:48:49'],
          [99, 2714, '2026-08-02 18:11:26'],
          [100, 657, '2026-09-22 04:04:03'],
          [101, 2800, '2026-07-15 20:06:40'],
          [102, 1643, '2026-09-24 22:44:17'],
          [103, 2886, '2026-06-27 22:01:54'],
          [104, 2629, '2026-09-26 17:24:31'],
          [105, 2972, '2026-06-09 23:57:08'],
          [106, 2715, '2026-09-08 19:19:45'],
          [107, 2158, '2026-05-02 09:07:22'],
          [108, 2801, '2026-08-21 21:14:59'],
          [109, 2244, '2026-04-14 11:02:36'],
          [110, 2887, '2026-08-03 23:10:13'],
          [111, 830, '2026-09-23 09:02:50'],
          [112, 2973, '2026-07-16 01:05:27'],
          [113, 1816, '2026-09-25 03:43:04'],
          [114, 2159, '2026-06-08 10:15:41'],
          [115, 2802, '2026-09-27 22:23:18'],
          [116, 2245, '2026-05-21 12:10:55'],
          [117, 2888, '2026-09-09 00:18:32'],
          [118, 2331, '2026-05-03 14:06:09'],
          [119, 2974, '2026-08-22 02:13:46'],
          [120, 17, '2026-09-22 19:21:23'],
          [121, 2160, '2026-07-15 11:24:00'],
          [122, 1003, '2026-09-24 14:01:37'],
          [123, 2246, '2026-06-27 13:19:14'],
          [124, 1989, '2026-09-26 08:41:51'],
          [125, 2332, '2026-06-09 15:14:28'],
          [126, 2975, '2026-09-28 03:22:05'],
          [127, 2418, '2026-05-22 17:09:42'],
          [128, 2161, '2026-08-21 12:32:19'],
          [129, 2504, '2026-05-04 19:04:56'],
          [130, 2247, '2026-08-03 14:27:33'],
          [131, 190, '2026-09-23 00:20:10'],
          [132, 2333, '2026-07-16 16:22:47'],
          [133, 1176, '2026-09-25 19:00:24'],
          [134, 2419, '2026-06-28 18:18:01'],
          [135, 2162, '2026-09-27 13:40:38'],
          [136, 2505, '2026-06-10 20:13:15'],
          [137, 2248, '2026-09-09 15:35:52'],
          [138, 2591, '2026-05-23 22:08:29'],
          [139, 2334, '2026-08-22 17:31:06'],
          [140, 2677, '2026-05-05 00:03:43'],
          [141, 2420, '2026-08-04 19:26:20'],
          [142, 363, '2026-09-24 05:18:57'],
          [143, 2506, '2026-07-17 21:21:34'],
          [144, 1349, '2026-09-26 23:59:11'],
          [145, 2592, '2026-06-29 23:16:48'],
          [146, 2335, '2026-09-28 18:39:25'],
          [147, 2678, '2026-06-11 01:12:02'],
          [148, 2421, '2026-09-10 20:34:39'],
          [149, 2764, '2026-05-24 03:07:16'],
          [150, 2507, '2026-08-23 22:29:53'],
          [151, 2850, '2026-05-06 05:02:30'],
          [152, 2593, '2026-08-05 00:25:07'],
          [153, 536, '2026-09-25 10:17:44'],
          [154, 2679, '2026-07-18 02:20:21'],
          [155, 1522, '2026-09-27 04:57:58'],
          [156, 2765, '2026-06-30 04:15:35'],
          [157, 2508, '2026-09-29 23:38:12'],
          [158, 2851, '2026-06-12 06:10:49'],
          [159, 2594, '2026-09-11 01:33:26'],
          [160, 2937, '2026-05-25 08:06:03'],
          [161, 2680, '2026-08-24 03:28:40'],
          [162, 2123, '2026-04-17 17:16:17'],
          [163, 2766, '2026-08-06 05:23:54'],
          [164, 709, '2026-09-26 15:16:31'],
          [165, 2852, '2026-07-19 07:19:08'],
          [166, 1695, '2026-09-28 09:56:45'],
          [167, 2938, '2026-07-01 09:14:22'],
          [168, 2681, '2026-09-30 04:36:59'],
          [169, 2124, '2026-05-24 18:24:36'],
          [170, 2767, '2026-09-12 06:32:13'],
          [171, 2210, '2026-05-06 20:19:50'],
          [172, 2853, '2026-08-25 08:27:27'],
          [173, 2296, '2026-04-18 22:15:04'],
          [174, 2939, '2026-08-07 10:22:41'],
          [175, 882, '2026-09-27 20:15:18'],
          [176, 2125, '2026-06-30 19:32:55'],
          [177, 1868, '2026-09-29 14:55:32'],
          [178, 2211, '2026-06-12 21:28:09'],
          [179, 2854, '2026-10-01 09:35:46'],
          [180, 2297, '2026-05-25 23:23:23'],
          [181, 2940, '2026-09-13 11:31:00'],
          [182, 2383, '2026-05-07 01:18:37'],
          [183, 2126, '2026-08-06 20:41:14'],
          [184, 69, '2026-09-26 06:33:51'],
          [185, 2212, '2026-07-19 22:36:28'],
          [186, 1055, '2026-09-28 01:14:05'],
          [187, 2298, '2026-07-01 00:31:42'],
          [188, 2041, '2026-09-30 19:54:19'],
          [189, 2384, '2026-06-13 02:26:56'],
          [190, 2127, '2026-09-12 21:49:33'],
          [191, 2470, '2026-05-26 04:22:10'],
          [192, 2213, '2026-08-25 23:44:47'],
          [193, 2556, '2026-05-08 06:17:24'],
          [194, 2299, '2026-08-07 01:40:01'],
          [195, 242, '2026-09-27 11:32:38'],
          [196, 2385, '2026-07-20 03:35:15'],
          [197, 1228, '2026-09-29 06:12:52'],
          [198, 2471, '2026-07-02 05:30:29'],
          [199, 2214, '2026-10-01 00:53:06'],
          [200, 2557, '2026-06-14 07:25:43'],
          [201, 2300, '2026-09-13 02:48:20'],
          [202, 2643, '2026-05-27 09:20:57'],
          [203, 2386, '2026-08-26 04:43:34'],
          [204, 2729, '2026-05-09 11:16:11'],
          [205, 2472, '2026-08-08 06:38:48'],
          [206, 415, '2026-09-28 16:31:25'],
          [207, 2558, '2026-07-21 08:34:02'],
          [208, 1401, '2026-09-30 11:11:39'],
          [209, 2644, '2026-07-03 10:29:16'],
          [210, 2387, '2026-10-02 05:51:53'],
          [211, 2730, '2026-06-15 12:24:30'],
          [212, 2473, '2026-09-14 07:47:07'],
          [213, 2816, '2026-05-28 14:19:44'],
          [214, 2559, '2026-08-27 09:42:21'],
          [215, 2902, '2026-05-10 16:14:58'],
          [216, 2645, '2026-08-09 11:37:35'],
          [217, 588, '2026-09-29 21:30:12'],
          [218, 2731, '2026-07-22 13:32:49'],
          [219, 1574, '2026-10-01 16:10:26'],
          [220, 2817, '2026-07-04 15:28:03'],
          [221, 1660, '2026-09-13 18:05:40'],
          [222, 2903, '2026-06-16 17:23:17'],
          [223, 2646, '2026-09-15 12:45:54'],
          [224, 2989, '2026-05-29 19:18:31'],
          [225, 2732, '2026-08-28 14:41:08'],
          [226, 2175, '2026-04-21 04:28:45'],
          [227, 2818, '2026-08-10 16:36:22'],
          [228, 761, '2026-09-30 02:28:59'],
          [229, 2904, '2026-07-23 18:31:36'],
          [230, 1747, '2026-10-02 21:09:13'],
          [231, 2990, '2026-07-05 20:26:50'],
          [232, 1833, '2026-09-14 23:04:27'],
          [233, 2176, '2026-05-28 05:37:04'],
          [234, 2819, '2026-09-16 17:44:41'],
          [235, 2262, '2026-05-10 07:32:18'],
          [236, 2905, '2026-08-29 19:39:55'],
          [237, 2348, '2026-04-22 09:27:32'],
          [238, 2991, '2026-08-11 21:35:09'],
          [239, 934, '2026-10-01 07:27:46'],
          [240, 2177, '2026-07-04 06:45:23'],
          [241, 1020, '2026-09-13 09:23:00'],
          [242, 2263, '2026-06-16 08:40:37'],
          [243, 2006, '2026-09-15 04:03:14'],
          [244, 2349, '2026-05-29 10:35:51'],
          [245, 2992, '2026-09-17 22:43:28'],
          [246, 2435, '2026-05-11 12:31:05'],
          [247, 2178, '2026-08-10 07:53:42'],
          [248, 121, '2026-09-30 17:46:19'],
          [249, 2264, '2026-07-23 09:48:56'],
          [250, 1107, '2026-10-02 12:26:33'],
          [251, 2350, '2026-07-05 11:44:10'],
          [252, 1193, '2026-09-14 14:21:47'],
          [253, 2436, '2026-06-17 13:39:24'],
          [254, 2179, '2026-09-16 09:02:01'],
          [255, 2522, '2026-05-30 15:34:38'],
          [256, 2265, '2026-08-29 10:57:15'],
          [257, 2608, '2026-05-12 17:29:52'],
          [258, 2351, '2026-08-11 12:52:29'],
          [259, 294, '2026-10-01 22:45:06'],
          [260, 2437, '2026-07-24 14:47:43'],
          [261, 380, '2026-09-13 00:40:20'],
          [262, 2523, '2026-07-06 16:42:57'],
          [263, 1366, '2026-09-15 19:20:34'],
          [264, 2609, '2026-06-18 18:38:11'],
          [265, 2352, '2026-09-17 14:00:48'],
          [266, 2695, '2026-05-31 20:33:25'],
          [267, 2438, '2026-08-30 15:56:02'],
          [268, 2781, '2026-05-13 22:28:39'],
          [269, 2524, '2026-08-12 17:51:16'],
          [270, 467, '2026-10-02 03:43:53'],
          [271, 2610, '2026-07-25 19:46:30'],
          [272, 553, '2026-09-14 05:39:07'],
          [273, 2696, '2026-07-07 21:41:44'],
          [274, 1539, '2026-09-16 00:19:21'],
          [275, 2782, '2026-06-19 23:36:58'],
          [276, 2525, '2026-09-18 18:59:35'],
          [277, 2868, '2026-06-01 01:32:12'],
          [278, 2611, '2026-08-31 20:54:49'],
          [279, 2954, '2026-05-14 03:27:26'],
          [280, 2697, '2026-08-13 22:50:03'],
          [281, 2140, '2026-04-06 12:37:40'],
          [282, 2783, '2026-07-26 00:45:17'],
          [283, 726, '2026-09-15 10:37:54'],
          [284, 2869, '2026-07-08 02:40:31'],
          [285, 1712, '2026-09-17 05:18:08'],
          [286, 2955, '2026-06-20 04:35:45'],
          [287, 2698, '2026-09-19 23:58:22'],
          [288, 2141, '2026-05-13 13:45:59'],
          [289, 2784, '2026-09-01 01:53:36'],
          [290, 2227, '2026-04-25 15:41:13'],
          [291, 2870, '2026-08-14 03:48:50'],
          [292, 2313, '2026-04-07 17:36:27'],
          [293, 2956, '2026-07-27 05:44:04'],
          [294, 899, '2026-09-16 15:36:41'],
          [295, 2142, '2026-06-19 14:54:18'],
          [296, 1885, '2026-09-18 10:16:55'],
          [297, 2228, '2026-06-01 16:49:32'],
          [298, 2871, '2026-09-20 04:57:09'],
          [299, 2314, '2026-05-14 18:44:46'],
          [300, 2957, '2026-09-02 06:52:23']
        ] },
      { setup: 'INSERT INTO orders VALUES (9702,5,\'paid\',\'2031-01-01 00:00:00\',5),(9703,5,\'paid\',\'2031-01-01 00:00:00\',6)', rows: [
          [1, 2400, '2026-04-26 20:40:00'],
          [2, 2143, '2026-07-26 16:02:37'],
          [3, 86, '2026-09-15 01:55:14'],
          [4, 2229, '2026-07-08 17:57:51'],
          [5, 9702, '2031-01-01 00:00:00'],
          [5, 9703, '2031-01-01 00:00:00'],
          [6, 2315, '2026-06-20 19:53:05'],
          [7, 2058, '2026-09-19 15:15:42'],
          [8, 2401, '2026-06-02 21:48:19'],
          [9, 2144, '2026-09-01 17:10:56'],
          [10, 2487, '2026-05-15 23:43:33'],
          [11, 2230, '2026-08-14 19:06:10'],
          [12, 2573, '2026-04-27 01:38:47'],
          [13, 2316, '2026-07-27 21:01:24'],
          [14, 259, '2026-09-16 06:54:01'],
          [15, 2402, '2026-07-09 22:56:38'],
          [16, 1245, '2026-09-18 01:34:15'],
          [17, 2488, '2026-06-21 00:51:52'],
          [18, 2231, '2026-09-20 20:14:29'],
          [19, 2574, '2026-06-03 02:47:06'],
          [20, 2317, '2026-09-02 22:09:43'],
          [21, 2660, '2026-05-16 04:42:20'],
          [22, 2403, '2026-08-15 00:04:57'],
          [23, 2746, '2026-04-28 06:37:34'],
          [24, 2489, '2026-07-28 02:00:11'],
          [25, 432, '2026-09-17 11:52:48'],
          [26, 2575, '2026-07-10 03:55:25'],
          [27, 1418, '2026-09-19 06:33:02'],
          [28, 2661, '2026-06-22 05:50:39'],
          [29, 2404, '2026-09-21 01:13:16'],
          [30, 2747, '2026-06-04 07:45:53'],
          [31, 2490, '2026-09-03 03:08:30'],
          [32, 2833, '2026-05-17 09:41:07'],
          [33, 2576, '2026-08-16 05:03:44'],
          [34, 2919, '2026-04-29 11:36:21'],
          [35, 2662, '2026-07-29 06:58:58'],
          [36, 605, '2026-09-18 16:51:35'],
          [37, 2748, '2026-07-11 08:54:12'],
          [38, 1591, '2026-09-20 11:31:49'],
          [39, 2834, '2026-06-23 10:49:26'],
          [40, 2577, '2026-09-22 06:12:03'],
          [41, 2920, '2026-06-05 12:44:40'],
          [42, 2663, '2026-09-04 08:07:17'],
          [43, 2106, '2026-04-28 21:54:54'],
          [44, 2749, '2026-08-17 10:02:31'],
          [45, 2192, '2026-04-10 23:50:08'],
          [46, 2835, '2026-07-30 11:57:45'],
          [47, 778, '2026-09-19 21:50:22'],
          [48, 2921, '2026-07-12 13:52:59'],
          [49, 1764, '2026-09-21 16:30:36'],
          [50, 2107, '2026-06-04 23:03:13'],
          [51, 2750, '2026-09-23 11:10:50'],
          [52, 2193, '2026-05-17 00:58:27'],
          [53, 2836, '2026-09-05 13:06:04'],
          [54, 2279, '2026-04-29 02:53:41'],
          [55, 2922, '2026-08-18 15:01:18'],
          [56, 2365, '2026-04-11 04:48:55'],
          [57, 2108, '2026-07-11 00:11:32'],
          [58, 951, '2026-09-20 02:49:09'],
          [59, 2194, '2026-06-23 02:06:46'],
          [60, 1937, '2026-09-22 21:29:23'],
          [61, 2280, '2026-06-05 04:02:00'],
          [62, 2923, '2026-09-24 16:09:37'],
          [63, 2366, '2026-05-18 05:57:14'],
          [64, 2109, '2026-08-17 01:19:51'],
          [65, 2452, '2026-04-30 07:52:28'],
          [66, 2195, '2026-07-30 03:15:05'],
          [67, 138, '2026-09-19 13:07:42'],
          [68, 2281, '2026-07-12 05:10:19'],
          [69, 1124, '2026-09-21 07:47:56'],
          [70, 2367, '2026-06-24 07:05:33'],
          [71, 2110, '2026-09-23 02:28:10'],
          [72, 2453, '2026-06-06 09:00:47'],
          [73, 2196, '2026-09-05 04:23:24'],
          [74, 2539, '2026-05-19 10:56:01'],
          [75, 2282, '2026-08-18 06:18:38'],
          [76, 2625, '2026-05-01 12:51:15'],
          [77, 2368, '2026-07-31 08:13:52'],
          [78, 311, '2026-09-20 18:06:29'],
          [79, 2454, '2026-07-13 10:09:06'],
          [80, 1297, '2026-09-22 12:46:43'],
          [81, 2540, '2026-06-25 12:04:20'],
          [82, 2283, '2026-09-24 07:26:57'],
          [83, 2626, '2026-06-07 13:59:34'],
          [84, 2369, '2026-09-06 09:22:11'],
          [85, 2712, '2026-05-20 15:54:48'],
          [86, 2455, '2026-08-19 11:17:25'],
          [87, 2798, '2026-05-02 17:50:02'],
          [88, 2541, '2026-08-01 13:12:39'],
          [89, 484, '2026-09-21 23:05:16'],
          [90, 2627, '2026-07-14 15:07:53'],
          [91, 1470, '2026-09-23 17:45:30'],
          [92, 2713, '2026-06-26 17:03:07'],
          [93, 2456, '2026-09-25 12:25:44'],
          [94, 2799, '2026-06-08 18:58:21'],
          [95, 2542, '2026-09-07 14:20:58'],
          [96, 2885, '2026-05-21 20:53:35'],
          [97, 2628, '2026-08-20 16:16:12'],
          [98, 2971, '2026-05-03 22:48:49'],
          [99, 2714, '2026-08-02 18:11:26'],
          [100, 657, '2026-09-22 04:04:03'],
          [101, 2800, '2026-07-15 20:06:40'],
          [102, 1643, '2026-09-24 22:44:17'],
          [103, 2886, '2026-06-27 22:01:54'],
          [104, 2629, '2026-09-26 17:24:31'],
          [105, 2972, '2026-06-09 23:57:08'],
          [106, 2715, '2026-09-08 19:19:45'],
          [107, 2158, '2026-05-02 09:07:22'],
          [108, 2801, '2026-08-21 21:14:59'],
          [109, 2244, '2026-04-14 11:02:36'],
          [110, 2887, '2026-08-03 23:10:13'],
          [111, 830, '2026-09-23 09:02:50'],
          [112, 2973, '2026-07-16 01:05:27'],
          [113, 1816, '2026-09-25 03:43:04'],
          [114, 2159, '2026-06-08 10:15:41'],
          [115, 2802, '2026-09-27 22:23:18'],
          [116, 2245, '2026-05-21 12:10:55'],
          [117, 2888, '2026-09-09 00:18:32'],
          [118, 2331, '2026-05-03 14:06:09'],
          [119, 2974, '2026-08-22 02:13:46'],
          [120, 17, '2026-09-22 19:21:23'],
          [121, 2160, '2026-07-15 11:24:00'],
          [122, 1003, '2026-09-24 14:01:37'],
          [123, 2246, '2026-06-27 13:19:14'],
          [124, 1989, '2026-09-26 08:41:51'],
          [125, 2332, '2026-06-09 15:14:28'],
          [126, 2975, '2026-09-28 03:22:05'],
          [127, 2418, '2026-05-22 17:09:42'],
          [128, 2161, '2026-08-21 12:32:19'],
          [129, 2504, '2026-05-04 19:04:56'],
          [130, 2247, '2026-08-03 14:27:33'],
          [131, 190, '2026-09-23 00:20:10'],
          [132, 2333, '2026-07-16 16:22:47'],
          [133, 1176, '2026-09-25 19:00:24'],
          [134, 2419, '2026-06-28 18:18:01'],
          [135, 2162, '2026-09-27 13:40:38'],
          [136, 2505, '2026-06-10 20:13:15'],
          [137, 2248, '2026-09-09 15:35:52'],
          [138, 2591, '2026-05-23 22:08:29'],
          [139, 2334, '2026-08-22 17:31:06'],
          [140, 2677, '2026-05-05 00:03:43'],
          [141, 2420, '2026-08-04 19:26:20'],
          [142, 363, '2026-09-24 05:18:57'],
          [143, 2506, '2026-07-17 21:21:34'],
          [144, 1349, '2026-09-26 23:59:11'],
          [145, 2592, '2026-06-29 23:16:48'],
          [146, 2335, '2026-09-28 18:39:25'],
          [147, 2678, '2026-06-11 01:12:02'],
          [148, 2421, '2026-09-10 20:34:39'],
          [149, 2764, '2026-05-24 03:07:16'],
          [150, 2507, '2026-08-23 22:29:53'],
          [151, 2850, '2026-05-06 05:02:30'],
          [152, 2593, '2026-08-05 00:25:07'],
          [153, 536, '2026-09-25 10:17:44'],
          [154, 2679, '2026-07-18 02:20:21'],
          [155, 1522, '2026-09-27 04:57:58'],
          [156, 2765, '2026-06-30 04:15:35'],
          [157, 2508, '2026-09-29 23:38:12'],
          [158, 2851, '2026-06-12 06:10:49'],
          [159, 2594, '2026-09-11 01:33:26'],
          [160, 2937, '2026-05-25 08:06:03'],
          [161, 2680, '2026-08-24 03:28:40'],
          [162, 2123, '2026-04-17 17:16:17'],
          [163, 2766, '2026-08-06 05:23:54'],
          [164, 709, '2026-09-26 15:16:31'],
          [165, 2852, '2026-07-19 07:19:08'],
          [166, 1695, '2026-09-28 09:56:45'],
          [167, 2938, '2026-07-01 09:14:22'],
          [168, 2681, '2026-09-30 04:36:59'],
          [169, 2124, '2026-05-24 18:24:36'],
          [170, 2767, '2026-09-12 06:32:13'],
          [171, 2210, '2026-05-06 20:19:50'],
          [172, 2853, '2026-08-25 08:27:27'],
          [173, 2296, '2026-04-18 22:15:04'],
          [174, 2939, '2026-08-07 10:22:41'],
          [175, 882, '2026-09-27 20:15:18'],
          [176, 2125, '2026-06-30 19:32:55'],
          [177, 1868, '2026-09-29 14:55:32'],
          [178, 2211, '2026-06-12 21:28:09'],
          [179, 2854, '2026-10-01 09:35:46'],
          [180, 2297, '2026-05-25 23:23:23'],
          [181, 2940, '2026-09-13 11:31:00'],
          [182, 2383, '2026-05-07 01:18:37'],
          [183, 2126, '2026-08-06 20:41:14'],
          [184, 69, '2026-09-26 06:33:51'],
          [185, 2212, '2026-07-19 22:36:28'],
          [186, 1055, '2026-09-28 01:14:05'],
          [187, 2298, '2026-07-01 00:31:42'],
          [188, 2041, '2026-09-30 19:54:19'],
          [189, 2384, '2026-06-13 02:26:56'],
          [190, 2127, '2026-09-12 21:49:33'],
          [191, 2470, '2026-05-26 04:22:10'],
          [192, 2213, '2026-08-25 23:44:47'],
          [193, 2556, '2026-05-08 06:17:24'],
          [194, 2299, '2026-08-07 01:40:01'],
          [195, 242, '2026-09-27 11:32:38'],
          [196, 2385, '2026-07-20 03:35:15'],
          [197, 1228, '2026-09-29 06:12:52'],
          [198, 2471, '2026-07-02 05:30:29'],
          [199, 2214, '2026-10-01 00:53:06'],
          [200, 2557, '2026-06-14 07:25:43'],
          [201, 2300, '2026-09-13 02:48:20'],
          [202, 2643, '2026-05-27 09:20:57'],
          [203, 2386, '2026-08-26 04:43:34'],
          [204, 2729, '2026-05-09 11:16:11'],
          [205, 2472, '2026-08-08 06:38:48'],
          [206, 415, '2026-09-28 16:31:25'],
          [207, 2558, '2026-07-21 08:34:02'],
          [208, 1401, '2026-09-30 11:11:39'],
          [209, 2644, '2026-07-03 10:29:16'],
          [210, 2387, '2026-10-02 05:51:53'],
          [211, 2730, '2026-06-15 12:24:30'],
          [212, 2473, '2026-09-14 07:47:07'],
          [213, 2816, '2026-05-28 14:19:44'],
          [214, 2559, '2026-08-27 09:42:21'],
          [215, 2902, '2026-05-10 16:14:58'],
          [216, 2645, '2026-08-09 11:37:35'],
          [217, 588, '2026-09-29 21:30:12'],
          [218, 2731, '2026-07-22 13:32:49'],
          [219, 1574, '2026-10-01 16:10:26'],
          [220, 2817, '2026-07-04 15:28:03'],
          [221, 1660, '2026-09-13 18:05:40'],
          [222, 2903, '2026-06-16 17:23:17'],
          [223, 2646, '2026-09-15 12:45:54'],
          [224, 2989, '2026-05-29 19:18:31'],
          [225, 2732, '2026-08-28 14:41:08'],
          [226, 2175, '2026-04-21 04:28:45'],
          [227, 2818, '2026-08-10 16:36:22'],
          [228, 761, '2026-09-30 02:28:59'],
          [229, 2904, '2026-07-23 18:31:36'],
          [230, 1747, '2026-10-02 21:09:13'],
          [231, 2990, '2026-07-05 20:26:50'],
          [232, 1833, '2026-09-14 23:04:27'],
          [233, 2176, '2026-05-28 05:37:04'],
          [234, 2819, '2026-09-16 17:44:41'],
          [235, 2262, '2026-05-10 07:32:18'],
          [236, 2905, '2026-08-29 19:39:55'],
          [237, 2348, '2026-04-22 09:27:32'],
          [238, 2991, '2026-08-11 21:35:09'],
          [239, 934, '2026-10-01 07:27:46'],
          [240, 2177, '2026-07-04 06:45:23'],
          [241, 1020, '2026-09-13 09:23:00'],
          [242, 2263, '2026-06-16 08:40:37'],
          [243, 2006, '2026-09-15 04:03:14'],
          [244, 2349, '2026-05-29 10:35:51'],
          [245, 2992, '2026-09-17 22:43:28'],
          [246, 2435, '2026-05-11 12:31:05'],
          [247, 2178, '2026-08-10 07:53:42'],
          [248, 121, '2026-09-30 17:46:19'],
          [249, 2264, '2026-07-23 09:48:56'],
          [250, 1107, '2026-10-02 12:26:33'],
          [251, 2350, '2026-07-05 11:44:10'],
          [252, 1193, '2026-09-14 14:21:47'],
          [253, 2436, '2026-06-17 13:39:24'],
          [254, 2179, '2026-09-16 09:02:01'],
          [255, 2522, '2026-05-30 15:34:38'],
          [256, 2265, '2026-08-29 10:57:15'],
          [257, 2608, '2026-05-12 17:29:52'],
          [258, 2351, '2026-08-11 12:52:29'],
          [259, 294, '2026-10-01 22:45:06'],
          [260, 2437, '2026-07-24 14:47:43'],
          [261, 380, '2026-09-13 00:40:20'],
          [262, 2523, '2026-07-06 16:42:57'],
          [263, 1366, '2026-09-15 19:20:34'],
          [264, 2609, '2026-06-18 18:38:11'],
          [265, 2352, '2026-09-17 14:00:48'],
          [266, 2695, '2026-05-31 20:33:25'],
          [267, 2438, '2026-08-30 15:56:02'],
          [268, 2781, '2026-05-13 22:28:39'],
          [269, 2524, '2026-08-12 17:51:16'],
          [270, 467, '2026-10-02 03:43:53'],
          [271, 2610, '2026-07-25 19:46:30'],
          [272, 553, '2026-09-14 05:39:07'],
          [273, 2696, '2026-07-07 21:41:44'],
          [274, 1539, '2026-09-16 00:19:21'],
          [275, 2782, '2026-06-19 23:36:58'],
          [276, 2525, '2026-09-18 18:59:35'],
          [277, 2868, '2026-06-01 01:32:12'],
          [278, 2611, '2026-08-31 20:54:49'],
          [279, 2954, '2026-05-14 03:27:26'],
          [280, 2697, '2026-08-13 22:50:03'],
          [281, 2140, '2026-04-06 12:37:40'],
          [282, 2783, '2026-07-26 00:45:17'],
          [283, 726, '2026-09-15 10:37:54'],
          [284, 2869, '2026-07-08 02:40:31'],
          [285, 1712, '2026-09-17 05:18:08'],
          [286, 2955, '2026-06-20 04:35:45'],
          [287, 2698, '2026-09-19 23:58:22'],
          [288, 2141, '2026-05-13 13:45:59'],
          [289, 2784, '2026-09-01 01:53:36'],
          [290, 2227, '2026-04-25 15:41:13'],
          [291, 2870, '2026-08-14 03:48:50'],
          [292, 2313, '2026-04-07 17:36:27'],
          [293, 2956, '2026-07-27 05:44:04'],
          [294, 899, '2026-09-16 15:36:41'],
          [295, 2142, '2026-06-19 14:54:18'],
          [296, 1885, '2026-09-18 10:16:55'],
          [297, 2228, '2026-06-01 16:49:32'],
          [298, 2871, '2026-09-20 04:57:09'],
          [299, 2314, '2026-05-14 18:44:46'],
          [300, 2957, '2026-09-02 06:52:23']
        ], set: true },
      { setup: 'DELETE FROM orders WHERE customer_id <> 7', rows: [
          [7, 2058, '2026-09-19 15:15:42']
        ] },
      { setup: 'DELETE FROM orders', after: 'SELECT count(*) FROM (SELECT customer_id, id, created_at FROM (SELECT customer_id, id, created_at, ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY created_at DESC, id DESC) AS rn FROM orders) WHERE rn = 1 ORDER BY customer_id)', rows: [
          [0]
        ] },
      { after: 'SELECT customer_id, id, created_at FROM (SELECT customer_id, id, created_at, ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY created_at DESC, id DESC) AS rn FROM orders) WHERE rn = 1 ORDER BY customer_id', rows: [
          [1, 2400, '2026-04-26 20:40:00'],
          [2, 2143, '2026-07-26 16:02:37'],
          [3, 86, '2026-09-15 01:55:14'],
          [4, 2229, '2026-07-08 17:57:51'],
          [5, 1072, '2026-09-17 20:35:28'],
          [6, 2315, '2026-06-20 19:53:05'],
          [7, 2058, '2026-09-19 15:15:42'],
          [8, 2401, '2026-06-02 21:48:19'],
          [9, 2144, '2026-09-01 17:10:56'],
          [10, 2487, '2026-05-15 23:43:33'],
          [11, 2230, '2026-08-14 19:06:10'],
          [12, 2573, '2026-04-27 01:38:47'],
          [13, 2316, '2026-07-27 21:01:24'],
          [14, 259, '2026-09-16 06:54:01'],
          [15, 2402, '2026-07-09 22:56:38'],
          [16, 1245, '2026-09-18 01:34:15'],
          [17, 2488, '2026-06-21 00:51:52'],
          [18, 2231, '2026-09-20 20:14:29'],
          [19, 2574, '2026-06-03 02:47:06'],
          [20, 2317, '2026-09-02 22:09:43'],
          [21, 2660, '2026-05-16 04:42:20'],
          [22, 2403, '2026-08-15 00:04:57'],
          [23, 2746, '2026-04-28 06:37:34'],
          [24, 2489, '2026-07-28 02:00:11'],
          [25, 432, '2026-09-17 11:52:48'],
          [26, 2575, '2026-07-10 03:55:25'],
          [27, 1418, '2026-09-19 06:33:02'],
          [28, 2661, '2026-06-22 05:50:39'],
          [29, 2404, '2026-09-21 01:13:16'],
          [30, 2747, '2026-06-04 07:45:53'],
          [31, 2490, '2026-09-03 03:08:30'],
          [32, 2833, '2026-05-17 09:41:07'],
          [33, 2576, '2026-08-16 05:03:44'],
          [34, 2919, '2026-04-29 11:36:21'],
          [35, 2662, '2026-07-29 06:58:58'],
          [36, 605, '2026-09-18 16:51:35'],
          [37, 2748, '2026-07-11 08:54:12'],
          [38, 1591, '2026-09-20 11:31:49'],
          [39, 2834, '2026-06-23 10:49:26'],
          [40, 2577, '2026-09-22 06:12:03'],
          [41, 2920, '2026-06-05 12:44:40'],
          [42, 2663, '2026-09-04 08:07:17'],
          [43, 2106, '2026-04-28 21:54:54'],
          [44, 2749, '2026-08-17 10:02:31'],
          [45, 2192, '2026-04-10 23:50:08'],
          [46, 2835, '2026-07-30 11:57:45'],
          [47, 778, '2026-09-19 21:50:22'],
          [48, 2921, '2026-07-12 13:52:59'],
          [49, 1764, '2026-09-21 16:30:36'],
          [50, 2107, '2026-06-04 23:03:13'],
          [51, 2750, '2026-09-23 11:10:50'],
          [52, 2193, '2026-05-17 00:58:27'],
          [53, 2836, '2026-09-05 13:06:04'],
          [54, 2279, '2026-04-29 02:53:41'],
          [55, 2922, '2026-08-18 15:01:18'],
          [56, 2365, '2026-04-11 04:48:55'],
          [57, 2108, '2026-07-11 00:11:32'],
          [58, 951, '2026-09-20 02:49:09'],
          [59, 2194, '2026-06-23 02:06:46'],
          [60, 1937, '2026-09-22 21:29:23'],
          [61, 2280, '2026-06-05 04:02:00'],
          [62, 2923, '2026-09-24 16:09:37'],
          [63, 2366, '2026-05-18 05:57:14'],
          [64, 2109, '2026-08-17 01:19:51'],
          [65, 2452, '2026-04-30 07:52:28'],
          [66, 2195, '2026-07-30 03:15:05'],
          [67, 138, '2026-09-19 13:07:42'],
          [68, 2281, '2026-07-12 05:10:19'],
          [69, 1124, '2026-09-21 07:47:56'],
          [70, 2367, '2026-06-24 07:05:33'],
          [71, 2110, '2026-09-23 02:28:10'],
          [72, 2453, '2026-06-06 09:00:47'],
          [73, 2196, '2026-09-05 04:23:24'],
          [74, 2539, '2026-05-19 10:56:01'],
          [75, 2282, '2026-08-18 06:18:38'],
          [76, 2625, '2026-05-01 12:51:15'],
          [77, 2368, '2026-07-31 08:13:52'],
          [78, 311, '2026-09-20 18:06:29'],
          [79, 2454, '2026-07-13 10:09:06'],
          [80, 1297, '2026-09-22 12:46:43'],
          [81, 2540, '2026-06-25 12:04:20'],
          [82, 2283, '2026-09-24 07:26:57'],
          [83, 2626, '2026-06-07 13:59:34'],
          [84, 2369, '2026-09-06 09:22:11'],
          [85, 2712, '2026-05-20 15:54:48'],
          [86, 2455, '2026-08-19 11:17:25'],
          [87, 2798, '2026-05-02 17:50:02'],
          [88, 2541, '2026-08-01 13:12:39'],
          [89, 484, '2026-09-21 23:05:16'],
          [90, 2627, '2026-07-14 15:07:53'],
          [91, 1470, '2026-09-23 17:45:30'],
          [92, 2713, '2026-06-26 17:03:07'],
          [93, 2456, '2026-09-25 12:25:44'],
          [94, 2799, '2026-06-08 18:58:21'],
          [95, 2542, '2026-09-07 14:20:58'],
          [96, 2885, '2026-05-21 20:53:35'],
          [97, 2628, '2026-08-20 16:16:12'],
          [98, 2971, '2026-05-03 22:48:49'],
          [99, 2714, '2026-08-02 18:11:26'],
          [100, 657, '2026-09-22 04:04:03'],
          [101, 2800, '2026-07-15 20:06:40'],
          [102, 1643, '2026-09-24 22:44:17'],
          [103, 2886, '2026-06-27 22:01:54'],
          [104, 2629, '2026-09-26 17:24:31'],
          [105, 2972, '2026-06-09 23:57:08'],
          [106, 2715, '2026-09-08 19:19:45'],
          [107, 2158, '2026-05-02 09:07:22'],
          [108, 2801, '2026-08-21 21:14:59'],
          [109, 2244, '2026-04-14 11:02:36'],
          [110, 2887, '2026-08-03 23:10:13'],
          [111, 830, '2026-09-23 09:02:50'],
          [112, 2973, '2026-07-16 01:05:27'],
          [113, 1816, '2026-09-25 03:43:04'],
          [114, 2159, '2026-06-08 10:15:41'],
          [115, 2802, '2026-09-27 22:23:18'],
          [116, 2245, '2026-05-21 12:10:55'],
          [117, 2888, '2026-09-09 00:18:32'],
          [118, 2331, '2026-05-03 14:06:09'],
          [119, 2974, '2026-08-22 02:13:46'],
          [120, 17, '2026-09-22 19:21:23'],
          [121, 2160, '2026-07-15 11:24:00'],
          [122, 1003, '2026-09-24 14:01:37'],
          [123, 2246, '2026-06-27 13:19:14'],
          [124, 1989, '2026-09-26 08:41:51'],
          [125, 2332, '2026-06-09 15:14:28'],
          [126, 2975, '2026-09-28 03:22:05'],
          [127, 2418, '2026-05-22 17:09:42'],
          [128, 2161, '2026-08-21 12:32:19'],
          [129, 2504, '2026-05-04 19:04:56'],
          [130, 2247, '2026-08-03 14:27:33'],
          [131, 190, '2026-09-23 00:20:10'],
          [132, 2333, '2026-07-16 16:22:47'],
          [133, 1176, '2026-09-25 19:00:24'],
          [134, 2419, '2026-06-28 18:18:01'],
          [135, 2162, '2026-09-27 13:40:38'],
          [136, 2505, '2026-06-10 20:13:15'],
          [137, 2248, '2026-09-09 15:35:52'],
          [138, 2591, '2026-05-23 22:08:29'],
          [139, 2334, '2026-08-22 17:31:06'],
          [140, 2677, '2026-05-05 00:03:43'],
          [141, 2420, '2026-08-04 19:26:20'],
          [142, 363, '2026-09-24 05:18:57'],
          [143, 2506, '2026-07-17 21:21:34'],
          [144, 1349, '2026-09-26 23:59:11'],
          [145, 2592, '2026-06-29 23:16:48'],
          [146, 2335, '2026-09-28 18:39:25'],
          [147, 2678, '2026-06-11 01:12:02'],
          [148, 2421, '2026-09-10 20:34:39'],
          [149, 2764, '2026-05-24 03:07:16'],
          [150, 2507, '2026-08-23 22:29:53'],
          [151, 2850, '2026-05-06 05:02:30'],
          [152, 2593, '2026-08-05 00:25:07'],
          [153, 536, '2026-09-25 10:17:44'],
          [154, 2679, '2026-07-18 02:20:21'],
          [155, 1522, '2026-09-27 04:57:58'],
          [156, 2765, '2026-06-30 04:15:35'],
          [157, 2508, '2026-09-29 23:38:12'],
          [158, 2851, '2026-06-12 06:10:49'],
          [159, 2594, '2026-09-11 01:33:26'],
          [160, 2937, '2026-05-25 08:06:03'],
          [161, 2680, '2026-08-24 03:28:40'],
          [162, 2123, '2026-04-17 17:16:17'],
          [163, 2766, '2026-08-06 05:23:54'],
          [164, 709, '2026-09-26 15:16:31'],
          [165, 2852, '2026-07-19 07:19:08'],
          [166, 1695, '2026-09-28 09:56:45'],
          [167, 2938, '2026-07-01 09:14:22'],
          [168, 2681, '2026-09-30 04:36:59'],
          [169, 2124, '2026-05-24 18:24:36'],
          [170, 2767, '2026-09-12 06:32:13'],
          [171, 2210, '2026-05-06 20:19:50'],
          [172, 2853, '2026-08-25 08:27:27'],
          [173, 2296, '2026-04-18 22:15:04'],
          [174, 2939, '2026-08-07 10:22:41'],
          [175, 882, '2026-09-27 20:15:18'],
          [176, 2125, '2026-06-30 19:32:55'],
          [177, 1868, '2026-09-29 14:55:32'],
          [178, 2211, '2026-06-12 21:28:09'],
          [179, 2854, '2026-10-01 09:35:46'],
          [180, 2297, '2026-05-25 23:23:23'],
          [181, 2940, '2026-09-13 11:31:00'],
          [182, 2383, '2026-05-07 01:18:37'],
          [183, 2126, '2026-08-06 20:41:14'],
          [184, 69, '2026-09-26 06:33:51'],
          [185, 2212, '2026-07-19 22:36:28'],
          [186, 1055, '2026-09-28 01:14:05'],
          [187, 2298, '2026-07-01 00:31:42'],
          [188, 2041, '2026-09-30 19:54:19'],
          [189, 2384, '2026-06-13 02:26:56'],
          [190, 2127, '2026-09-12 21:49:33'],
          [191, 2470, '2026-05-26 04:22:10'],
          [192, 2213, '2026-08-25 23:44:47'],
          [193, 2556, '2026-05-08 06:17:24'],
          [194, 2299, '2026-08-07 01:40:01'],
          [195, 242, '2026-09-27 11:32:38'],
          [196, 2385, '2026-07-20 03:35:15'],
          [197, 1228, '2026-09-29 06:12:52'],
          [198, 2471, '2026-07-02 05:30:29'],
          [199, 2214, '2026-10-01 00:53:06'],
          [200, 2557, '2026-06-14 07:25:43'],
          [201, 2300, '2026-09-13 02:48:20'],
          [202, 2643, '2026-05-27 09:20:57'],
          [203, 2386, '2026-08-26 04:43:34'],
          [204, 2729, '2026-05-09 11:16:11'],
          [205, 2472, '2026-08-08 06:38:48'],
          [206, 415, '2026-09-28 16:31:25'],
          [207, 2558, '2026-07-21 08:34:02'],
          [208, 1401, '2026-09-30 11:11:39'],
          [209, 2644, '2026-07-03 10:29:16'],
          [210, 2387, '2026-10-02 05:51:53'],
          [211, 2730, '2026-06-15 12:24:30'],
          [212, 2473, '2026-09-14 07:47:07'],
          [213, 2816, '2026-05-28 14:19:44'],
          [214, 2559, '2026-08-27 09:42:21'],
          [215, 2902, '2026-05-10 16:14:58'],
          [216, 2645, '2026-08-09 11:37:35'],
          [217, 588, '2026-09-29 21:30:12'],
          [218, 2731, '2026-07-22 13:32:49'],
          [219, 1574, '2026-10-01 16:10:26'],
          [220, 2817, '2026-07-04 15:28:03'],
          [221, 1660, '2026-09-13 18:05:40'],
          [222, 2903, '2026-06-16 17:23:17'],
          [223, 2646, '2026-09-15 12:45:54'],
          [224, 2989, '2026-05-29 19:18:31'],
          [225, 2732, '2026-08-28 14:41:08'],
          [226, 2175, '2026-04-21 04:28:45'],
          [227, 2818, '2026-08-10 16:36:22'],
          [228, 761, '2026-09-30 02:28:59'],
          [229, 2904, '2026-07-23 18:31:36'],
          [230, 1747, '2026-10-02 21:09:13'],
          [231, 2990, '2026-07-05 20:26:50'],
          [232, 1833, '2026-09-14 23:04:27'],
          [233, 2176, '2026-05-28 05:37:04'],
          [234, 2819, '2026-09-16 17:44:41'],
          [235, 2262, '2026-05-10 07:32:18'],
          [236, 2905, '2026-08-29 19:39:55'],
          [237, 2348, '2026-04-22 09:27:32'],
          [238, 2991, '2026-08-11 21:35:09'],
          [239, 934, '2026-10-01 07:27:46'],
          [240, 2177, '2026-07-04 06:45:23'],
          [241, 1020, '2026-09-13 09:23:00'],
          [242, 2263, '2026-06-16 08:40:37'],
          [243, 2006, '2026-09-15 04:03:14'],
          [244, 2349, '2026-05-29 10:35:51'],
          [245, 2992, '2026-09-17 22:43:28'],
          [246, 2435, '2026-05-11 12:31:05'],
          [247, 2178, '2026-08-10 07:53:42'],
          [248, 121, '2026-09-30 17:46:19'],
          [249, 2264, '2026-07-23 09:48:56'],
          [250, 1107, '2026-10-02 12:26:33'],
          [251, 2350, '2026-07-05 11:44:10'],
          [252, 1193, '2026-09-14 14:21:47'],
          [253, 2436, '2026-06-17 13:39:24'],
          [254, 2179, '2026-09-16 09:02:01'],
          [255, 2522, '2026-05-30 15:34:38'],
          [256, 2265, '2026-08-29 10:57:15'],
          [257, 2608, '2026-05-12 17:29:52'],
          [258, 2351, '2026-08-11 12:52:29'],
          [259, 294, '2026-10-01 22:45:06'],
          [260, 2437, '2026-07-24 14:47:43'],
          [261, 380, '2026-09-13 00:40:20'],
          [262, 2523, '2026-07-06 16:42:57'],
          [263, 1366, '2026-09-15 19:20:34'],
          [264, 2609, '2026-06-18 18:38:11'],
          [265, 2352, '2026-09-17 14:00:48'],
          [266, 2695, '2026-05-31 20:33:25'],
          [267, 2438, '2026-08-30 15:56:02'],
          [268, 2781, '2026-05-13 22:28:39'],
          [269, 2524, '2026-08-12 17:51:16'],
          [270, 467, '2026-10-02 03:43:53'],
          [271, 2610, '2026-07-25 19:46:30'],
          [272, 553, '2026-09-14 05:39:07'],
          [273, 2696, '2026-07-07 21:41:44'],
          [274, 1539, '2026-09-16 00:19:21'],
          [275, 2782, '2026-06-19 23:36:58'],
          [276, 2525, '2026-09-18 18:59:35'],
          [277, 2868, '2026-06-01 01:32:12'],
          [278, 2611, '2026-08-31 20:54:49'],
          [279, 2954, '2026-05-14 03:27:26'],
          [280, 2697, '2026-08-13 22:50:03'],
          [281, 2140, '2026-04-06 12:37:40'],
          [282, 2783, '2026-07-26 00:45:17'],
          [283, 726, '2026-09-15 10:37:54'],
          [284, 2869, '2026-07-08 02:40:31'],
          [285, 1712, '2026-09-17 05:18:08'],
          [286, 2955, '2026-06-20 04:35:45'],
          [287, 2698, '2026-09-19 23:58:22'],
          [288, 2141, '2026-05-13 13:45:59'],
          [289, 2784, '2026-09-01 01:53:36'],
          [290, 2227, '2026-04-25 15:41:13'],
          [291, 2870, '2026-08-14 03:48:50'],
          [292, 2313, '2026-04-07 17:36:27'],
          [293, 2956, '2026-07-27 05:44:04'],
          [294, 899, '2026-09-16 15:36:41'],
          [295, 2142, '2026-06-19 14:54:18'],
          [296, 1885, '2026-09-18 10:16:55'],
          [297, 2228, '2026-06-01 16:49:32'],
          [298, 2871, '2026-09-20 04:57:09'],
          [299, 2314, '2026-05-14 18:44:46'],
          [300, 2957, '2026-09-02 06:52:23']
        ] },
      { setup: 'INSERT INTO orders VALUES (9702,5,\'paid\',\'2031-01-01 00:00:00\',5),(9703,5,\'paid\',\'2031-01-01 00:00:00\',6)', after: 'SELECT customer_id, id, created_at FROM (SELECT customer_id, id, created_at, ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY created_at DESC, id DESC) AS rn FROM orders) WHERE rn = 1 ORDER BY customer_id', rows: [
          [1, 2400, '2026-04-26 20:40:00'],
          [2, 2143, '2026-07-26 16:02:37'],
          [3, 86, '2026-09-15 01:55:14'],
          [4, 2229, '2026-07-08 17:57:51'],
          [5, 9703, '2031-01-01 00:00:00'],
          [6, 2315, '2026-06-20 19:53:05'],
          [7, 2058, '2026-09-19 15:15:42'],
          [8, 2401, '2026-06-02 21:48:19'],
          [9, 2144, '2026-09-01 17:10:56'],
          [10, 2487, '2026-05-15 23:43:33'],
          [11, 2230, '2026-08-14 19:06:10'],
          [12, 2573, '2026-04-27 01:38:47'],
          [13, 2316, '2026-07-27 21:01:24'],
          [14, 259, '2026-09-16 06:54:01'],
          [15, 2402, '2026-07-09 22:56:38'],
          [16, 1245, '2026-09-18 01:34:15'],
          [17, 2488, '2026-06-21 00:51:52'],
          [18, 2231, '2026-09-20 20:14:29'],
          [19, 2574, '2026-06-03 02:47:06'],
          [20, 2317, '2026-09-02 22:09:43'],
          [21, 2660, '2026-05-16 04:42:20'],
          [22, 2403, '2026-08-15 00:04:57'],
          [23, 2746, '2026-04-28 06:37:34'],
          [24, 2489, '2026-07-28 02:00:11'],
          [25, 432, '2026-09-17 11:52:48'],
          [26, 2575, '2026-07-10 03:55:25'],
          [27, 1418, '2026-09-19 06:33:02'],
          [28, 2661, '2026-06-22 05:50:39'],
          [29, 2404, '2026-09-21 01:13:16'],
          [30, 2747, '2026-06-04 07:45:53'],
          [31, 2490, '2026-09-03 03:08:30'],
          [32, 2833, '2026-05-17 09:41:07'],
          [33, 2576, '2026-08-16 05:03:44'],
          [34, 2919, '2026-04-29 11:36:21'],
          [35, 2662, '2026-07-29 06:58:58'],
          [36, 605, '2026-09-18 16:51:35'],
          [37, 2748, '2026-07-11 08:54:12'],
          [38, 1591, '2026-09-20 11:31:49'],
          [39, 2834, '2026-06-23 10:49:26'],
          [40, 2577, '2026-09-22 06:12:03'],
          [41, 2920, '2026-06-05 12:44:40'],
          [42, 2663, '2026-09-04 08:07:17'],
          [43, 2106, '2026-04-28 21:54:54'],
          [44, 2749, '2026-08-17 10:02:31'],
          [45, 2192, '2026-04-10 23:50:08'],
          [46, 2835, '2026-07-30 11:57:45'],
          [47, 778, '2026-09-19 21:50:22'],
          [48, 2921, '2026-07-12 13:52:59'],
          [49, 1764, '2026-09-21 16:30:36'],
          [50, 2107, '2026-06-04 23:03:13'],
          [51, 2750, '2026-09-23 11:10:50'],
          [52, 2193, '2026-05-17 00:58:27'],
          [53, 2836, '2026-09-05 13:06:04'],
          [54, 2279, '2026-04-29 02:53:41'],
          [55, 2922, '2026-08-18 15:01:18'],
          [56, 2365, '2026-04-11 04:48:55'],
          [57, 2108, '2026-07-11 00:11:32'],
          [58, 951, '2026-09-20 02:49:09'],
          [59, 2194, '2026-06-23 02:06:46'],
          [60, 1937, '2026-09-22 21:29:23'],
          [61, 2280, '2026-06-05 04:02:00'],
          [62, 2923, '2026-09-24 16:09:37'],
          [63, 2366, '2026-05-18 05:57:14'],
          [64, 2109, '2026-08-17 01:19:51'],
          [65, 2452, '2026-04-30 07:52:28'],
          [66, 2195, '2026-07-30 03:15:05'],
          [67, 138, '2026-09-19 13:07:42'],
          [68, 2281, '2026-07-12 05:10:19'],
          [69, 1124, '2026-09-21 07:47:56'],
          [70, 2367, '2026-06-24 07:05:33'],
          [71, 2110, '2026-09-23 02:28:10'],
          [72, 2453, '2026-06-06 09:00:47'],
          [73, 2196, '2026-09-05 04:23:24'],
          [74, 2539, '2026-05-19 10:56:01'],
          [75, 2282, '2026-08-18 06:18:38'],
          [76, 2625, '2026-05-01 12:51:15'],
          [77, 2368, '2026-07-31 08:13:52'],
          [78, 311, '2026-09-20 18:06:29'],
          [79, 2454, '2026-07-13 10:09:06'],
          [80, 1297, '2026-09-22 12:46:43'],
          [81, 2540, '2026-06-25 12:04:20'],
          [82, 2283, '2026-09-24 07:26:57'],
          [83, 2626, '2026-06-07 13:59:34'],
          [84, 2369, '2026-09-06 09:22:11'],
          [85, 2712, '2026-05-20 15:54:48'],
          [86, 2455, '2026-08-19 11:17:25'],
          [87, 2798, '2026-05-02 17:50:02'],
          [88, 2541, '2026-08-01 13:12:39'],
          [89, 484, '2026-09-21 23:05:16'],
          [90, 2627, '2026-07-14 15:07:53'],
          [91, 1470, '2026-09-23 17:45:30'],
          [92, 2713, '2026-06-26 17:03:07'],
          [93, 2456, '2026-09-25 12:25:44'],
          [94, 2799, '2026-06-08 18:58:21'],
          [95, 2542, '2026-09-07 14:20:58'],
          [96, 2885, '2026-05-21 20:53:35'],
          [97, 2628, '2026-08-20 16:16:12'],
          [98, 2971, '2026-05-03 22:48:49'],
          [99, 2714, '2026-08-02 18:11:26'],
          [100, 657, '2026-09-22 04:04:03'],
          [101, 2800, '2026-07-15 20:06:40'],
          [102, 1643, '2026-09-24 22:44:17'],
          [103, 2886, '2026-06-27 22:01:54'],
          [104, 2629, '2026-09-26 17:24:31'],
          [105, 2972, '2026-06-09 23:57:08'],
          [106, 2715, '2026-09-08 19:19:45'],
          [107, 2158, '2026-05-02 09:07:22'],
          [108, 2801, '2026-08-21 21:14:59'],
          [109, 2244, '2026-04-14 11:02:36'],
          [110, 2887, '2026-08-03 23:10:13'],
          [111, 830, '2026-09-23 09:02:50'],
          [112, 2973, '2026-07-16 01:05:27'],
          [113, 1816, '2026-09-25 03:43:04'],
          [114, 2159, '2026-06-08 10:15:41'],
          [115, 2802, '2026-09-27 22:23:18'],
          [116, 2245, '2026-05-21 12:10:55'],
          [117, 2888, '2026-09-09 00:18:32'],
          [118, 2331, '2026-05-03 14:06:09'],
          [119, 2974, '2026-08-22 02:13:46'],
          [120, 17, '2026-09-22 19:21:23'],
          [121, 2160, '2026-07-15 11:24:00'],
          [122, 1003, '2026-09-24 14:01:37'],
          [123, 2246, '2026-06-27 13:19:14'],
          [124, 1989, '2026-09-26 08:41:51'],
          [125, 2332, '2026-06-09 15:14:28'],
          [126, 2975, '2026-09-28 03:22:05'],
          [127, 2418, '2026-05-22 17:09:42'],
          [128, 2161, '2026-08-21 12:32:19'],
          [129, 2504, '2026-05-04 19:04:56'],
          [130, 2247, '2026-08-03 14:27:33'],
          [131, 190, '2026-09-23 00:20:10'],
          [132, 2333, '2026-07-16 16:22:47'],
          [133, 1176, '2026-09-25 19:00:24'],
          [134, 2419, '2026-06-28 18:18:01'],
          [135, 2162, '2026-09-27 13:40:38'],
          [136, 2505, '2026-06-10 20:13:15'],
          [137, 2248, '2026-09-09 15:35:52'],
          [138, 2591, '2026-05-23 22:08:29'],
          [139, 2334, '2026-08-22 17:31:06'],
          [140, 2677, '2026-05-05 00:03:43'],
          [141, 2420, '2026-08-04 19:26:20'],
          [142, 363, '2026-09-24 05:18:57'],
          [143, 2506, '2026-07-17 21:21:34'],
          [144, 1349, '2026-09-26 23:59:11'],
          [145, 2592, '2026-06-29 23:16:48'],
          [146, 2335, '2026-09-28 18:39:25'],
          [147, 2678, '2026-06-11 01:12:02'],
          [148, 2421, '2026-09-10 20:34:39'],
          [149, 2764, '2026-05-24 03:07:16'],
          [150, 2507, '2026-08-23 22:29:53'],
          [151, 2850, '2026-05-06 05:02:30'],
          [152, 2593, '2026-08-05 00:25:07'],
          [153, 536, '2026-09-25 10:17:44'],
          [154, 2679, '2026-07-18 02:20:21'],
          [155, 1522, '2026-09-27 04:57:58'],
          [156, 2765, '2026-06-30 04:15:35'],
          [157, 2508, '2026-09-29 23:38:12'],
          [158, 2851, '2026-06-12 06:10:49'],
          [159, 2594, '2026-09-11 01:33:26'],
          [160, 2937, '2026-05-25 08:06:03'],
          [161, 2680, '2026-08-24 03:28:40'],
          [162, 2123, '2026-04-17 17:16:17'],
          [163, 2766, '2026-08-06 05:23:54'],
          [164, 709, '2026-09-26 15:16:31'],
          [165, 2852, '2026-07-19 07:19:08'],
          [166, 1695, '2026-09-28 09:56:45'],
          [167, 2938, '2026-07-01 09:14:22'],
          [168, 2681, '2026-09-30 04:36:59'],
          [169, 2124, '2026-05-24 18:24:36'],
          [170, 2767, '2026-09-12 06:32:13'],
          [171, 2210, '2026-05-06 20:19:50'],
          [172, 2853, '2026-08-25 08:27:27'],
          [173, 2296, '2026-04-18 22:15:04'],
          [174, 2939, '2026-08-07 10:22:41'],
          [175, 882, '2026-09-27 20:15:18'],
          [176, 2125, '2026-06-30 19:32:55'],
          [177, 1868, '2026-09-29 14:55:32'],
          [178, 2211, '2026-06-12 21:28:09'],
          [179, 2854, '2026-10-01 09:35:46'],
          [180, 2297, '2026-05-25 23:23:23'],
          [181, 2940, '2026-09-13 11:31:00'],
          [182, 2383, '2026-05-07 01:18:37'],
          [183, 2126, '2026-08-06 20:41:14'],
          [184, 69, '2026-09-26 06:33:51'],
          [185, 2212, '2026-07-19 22:36:28'],
          [186, 1055, '2026-09-28 01:14:05'],
          [187, 2298, '2026-07-01 00:31:42'],
          [188, 2041, '2026-09-30 19:54:19'],
          [189, 2384, '2026-06-13 02:26:56'],
          [190, 2127, '2026-09-12 21:49:33'],
          [191, 2470, '2026-05-26 04:22:10'],
          [192, 2213, '2026-08-25 23:44:47'],
          [193, 2556, '2026-05-08 06:17:24'],
          [194, 2299, '2026-08-07 01:40:01'],
          [195, 242, '2026-09-27 11:32:38'],
          [196, 2385, '2026-07-20 03:35:15'],
          [197, 1228, '2026-09-29 06:12:52'],
          [198, 2471, '2026-07-02 05:30:29'],
          [199, 2214, '2026-10-01 00:53:06'],
          [200, 2557, '2026-06-14 07:25:43'],
          [201, 2300, '2026-09-13 02:48:20'],
          [202, 2643, '2026-05-27 09:20:57'],
          [203, 2386, '2026-08-26 04:43:34'],
          [204, 2729, '2026-05-09 11:16:11'],
          [205, 2472, '2026-08-08 06:38:48'],
          [206, 415, '2026-09-28 16:31:25'],
          [207, 2558, '2026-07-21 08:34:02'],
          [208, 1401, '2026-09-30 11:11:39'],
          [209, 2644, '2026-07-03 10:29:16'],
          [210, 2387, '2026-10-02 05:51:53'],
          [211, 2730, '2026-06-15 12:24:30'],
          [212, 2473, '2026-09-14 07:47:07'],
          [213, 2816, '2026-05-28 14:19:44'],
          [214, 2559, '2026-08-27 09:42:21'],
          [215, 2902, '2026-05-10 16:14:58'],
          [216, 2645, '2026-08-09 11:37:35'],
          [217, 588, '2026-09-29 21:30:12'],
          [218, 2731, '2026-07-22 13:32:49'],
          [219, 1574, '2026-10-01 16:10:26'],
          [220, 2817, '2026-07-04 15:28:03'],
          [221, 1660, '2026-09-13 18:05:40'],
          [222, 2903, '2026-06-16 17:23:17'],
          [223, 2646, '2026-09-15 12:45:54'],
          [224, 2989, '2026-05-29 19:18:31'],
          [225, 2732, '2026-08-28 14:41:08'],
          [226, 2175, '2026-04-21 04:28:45'],
          [227, 2818, '2026-08-10 16:36:22'],
          [228, 761, '2026-09-30 02:28:59'],
          [229, 2904, '2026-07-23 18:31:36'],
          [230, 1747, '2026-10-02 21:09:13'],
          [231, 2990, '2026-07-05 20:26:50'],
          [232, 1833, '2026-09-14 23:04:27'],
          [233, 2176, '2026-05-28 05:37:04'],
          [234, 2819, '2026-09-16 17:44:41'],
          [235, 2262, '2026-05-10 07:32:18'],
          [236, 2905, '2026-08-29 19:39:55'],
          [237, 2348, '2026-04-22 09:27:32'],
          [238, 2991, '2026-08-11 21:35:09'],
          [239, 934, '2026-10-01 07:27:46'],
          [240, 2177, '2026-07-04 06:45:23'],
          [241, 1020, '2026-09-13 09:23:00'],
          [242, 2263, '2026-06-16 08:40:37'],
          [243, 2006, '2026-09-15 04:03:14'],
          [244, 2349, '2026-05-29 10:35:51'],
          [245, 2992, '2026-09-17 22:43:28'],
          [246, 2435, '2026-05-11 12:31:05'],
          [247, 2178, '2026-08-10 07:53:42'],
          [248, 121, '2026-09-30 17:46:19'],
          [249, 2264, '2026-07-23 09:48:56'],
          [250, 1107, '2026-10-02 12:26:33'],
          [251, 2350, '2026-07-05 11:44:10'],
          [252, 1193, '2026-09-14 14:21:47'],
          [253, 2436, '2026-06-17 13:39:24'],
          [254, 2179, '2026-09-16 09:02:01'],
          [255, 2522, '2026-05-30 15:34:38'],
          [256, 2265, '2026-08-29 10:57:15'],
          [257, 2608, '2026-05-12 17:29:52'],
          [258, 2351, '2026-08-11 12:52:29'],
          [259, 294, '2026-10-01 22:45:06'],
          [260, 2437, '2026-07-24 14:47:43'],
          [261, 380, '2026-09-13 00:40:20'],
          [262, 2523, '2026-07-06 16:42:57'],
          [263, 1366, '2026-09-15 19:20:34'],
          [264, 2609, '2026-06-18 18:38:11'],
          [265, 2352, '2026-09-17 14:00:48'],
          [266, 2695, '2026-05-31 20:33:25'],
          [267, 2438, '2026-08-30 15:56:02'],
          [268, 2781, '2026-05-13 22:28:39'],
          [269, 2524, '2026-08-12 17:51:16'],
          [270, 467, '2026-10-02 03:43:53'],
          [271, 2610, '2026-07-25 19:46:30'],
          [272, 553, '2026-09-14 05:39:07'],
          [273, 2696, '2026-07-07 21:41:44'],
          [274, 1539, '2026-09-16 00:19:21'],
          [275, 2782, '2026-06-19 23:36:58'],
          [276, 2525, '2026-09-18 18:59:35'],
          [277, 2868, '2026-06-01 01:32:12'],
          [278, 2611, '2026-08-31 20:54:49'],
          [279, 2954, '2026-05-14 03:27:26'],
          [280, 2697, '2026-08-13 22:50:03'],
          [281, 2140, '2026-04-06 12:37:40'],
          [282, 2783, '2026-07-26 00:45:17'],
          [283, 726, '2026-09-15 10:37:54'],
          [284, 2869, '2026-07-08 02:40:31'],
          [285, 1712, '2026-09-17 05:18:08'],
          [286, 2955, '2026-06-20 04:35:45'],
          [287, 2698, '2026-09-19 23:58:22'],
          [288, 2141, '2026-05-13 13:45:59'],
          [289, 2784, '2026-09-01 01:53:36'],
          [290, 2227, '2026-04-25 15:41:13'],
          [291, 2870, '2026-08-14 03:48:50'],
          [292, 2313, '2026-04-07 17:36:27'],
          [293, 2956, '2026-07-27 05:44:04'],
          [294, 899, '2026-09-16 15:36:41'],
          [295, 2142, '2026-06-19 14:54:18'],
          [296, 1885, '2026-09-18 10:16:55'],
          [297, 2228, '2026-06-01 16:49:32'],
          [298, 2871, '2026-09-20 04:57:09'],
          [299, 2314, '2026-05-14 18:44:46'],
          [300, 2957, '2026-09-02 06:52:23']
        ] },
      { rows: [], plan: 'SEARCH o2? USING COVERING INDEX idx_orders_cust_created', noplan: 'TEMP B-TREE', after: 'EXPLAIN QUERY PLAN SELECT o.customer_id, o.id, o.created_at FROM orders o WHERE o.created_at = (SELECT max(o2.created_at) FROM orders o2 WHERE o2.customer_id = o.customer_id) ORDER BY o.customer_id' }
    ] },
    solution: {
      approach: `<p>Create <code>idx_orders_cust_created(customer_id, created_at)</code>. The subquery's max becomes "seek to customer, take the last entry" (covering), and the outer loop walks the same index (covering, already in customer order — no sort). That's 4× less work and the SQL stays portable. Engine-specific fastest forms: SQLite's <code>SELECT customer_id, id, max(created_at) … GROUP BY customer_id</code> (bare columns come from the max row — SQLite only), PostgreSQL's <code>SELECT DISTINCT ON (customer_id) … ORDER BY customer_id, created_at DESC</code>. The window-function version is the most readable and handles ties deterministically with <code>id</code>, but in SQLite it pays for a temp B-tree sort; in PostgreSQL with the same index it's typically competitive. Measure on your engine.</p>`,
      code: { lang: 'sql', db: 'shop', code: `CREATE INDEX idx_orders_cust_created ON orders(customer_id, created_at);

-- Portable: correlated max, now fully covered by the index
EXPLAIN QUERY PLAN
SELECT o.customer_id, o.id, o.created_at
FROM orders o
WHERE o.created_at = (SELECT max(o2.created_at) FROM orders o2
                      WHERE o2.customer_id = o.customer_id)
ORDER BY o.customer_id;

-- Window-function version (deterministic with a tie-breaker)
SELECT customer_id, id, created_at
FROM (SELECT customer_id, id, created_at,
             ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY created_at DESC, id DESC) AS rn
      FROM orders)
WHERE rn = 1
ORDER BY customer_id
LIMIT 3;

-- SQLite-only shortcut: bare columns are taken from the row holding max()
SELECT customer_id, id, max(created_at) AS created_at
FROM orders GROUP BY customer_id ORDER BY customer_id LIMIT 3;

-- The answer: all customers, portable form
SELECT o.customer_id, o.id, o.created_at
FROM orders o
WHERE o.created_at = (SELECT max(o2.created_at) FROM orders o2
                      WHERE o2.customer_id = o.customer_id)
ORDER BY o.customer_id;` },
      complexity: `<p>Original: O(O × (log O + k)) with table lookups. Indexed correlated: O(O × log O), index-only. Window: O(O log O) sort (or O(O) with a matching index in engines that use it). Bare max / DISTINCT ON with index: one ordered pass O(O).</p>`,
      followUps: ['Return the latest <b>3</b> orders per customer.', 'How would a LATERAL join (PostgreSQL) solve this when only 50 customers are requested?']
    }
  });

  practice.push({
    title: 'Who bought books in 2026? (kill the fan-out)', level: 'Hard', tags: ['semi-join', 'DISTINCT', 'sargable', 'multi-join'], companies: ['Flipkart', 'Amazon', 'Myntra'],
    statement: `<p>Marketing's query for "customers who bought at least one <i>books</i> product in 2026":</p><pre>SELECT DISTINCT c.id, c.name, c.city
FROM customers c
JOIN orders o      ON o.customer_id = c.id
JOIN order_items i ON i.order_id = o.id
JOIN products p    ON p.id = i.product_id
WHERE p.category = 'books' AND strftime('%Y', o.created_at) = '2026'
ORDER BY c.id;</pre><p>Read its plan, list every problem, and rewrite it. Prove the result is unchanged (120 customers).</p>`,
    constraints: `SQLite <code>shop</code>; no new indexes; same 120 rows.`,
    example: `<p>Original plan: ${H.c('r', 'SCAN i USING COVERING INDEX …')} → 3 PK lookups per line → ${H.c('r', 'USE TEMP B-TREE FOR DISTINCT')} → ORDER BY sort. ≈54,800 VM steps. Rewrite: ${H.c('g', 'LIST SUBQUERY')} chain driven by <code>idx_items_product</code> → ≈12,200 VM steps (4.5× less), same 120 rows.</p>`,
    brute: { why: `<p>Three problems: (1) the join <b>fans out</b> — one row per matching order line, many per customer — so DISTINCT has to sort them back down; (2) the year filter is <b>non-sargable</b> (<code>strftime</code> on <code>o.created_at</code>), so it can't drive the plan; (3) the planner therefore starts from all 6,000 order lines and does 3 lookups each before filtering.</p>`, code: { lang: 'sql', db: 'shop', code: `EXPLAIN QUERY PLAN
SELECT DISTINCT c.id, c.name, c.city
FROM customers c
JOIN orders o      ON o.customer_id = c.id
JOIN order_items i ON i.order_id = o.id
JOIN products p    ON p.id = i.product_id
WHERE p.category = 'books' AND strftime('%Y', o.created_at) = '2026'
ORDER BY c.id;` } },
    mcq: { q: 'What is the main reason the original needs DISTINCT?', options: ['customers has duplicate rows', 'The joins create one row per matching order line, so a customer appears many times', 'SQLite requires DISTINCT with ORDER BY', 'The year filter returns duplicates'], answer: 1, explain: 'Join fan-out: a customer with 4 qualifying lines appears 4 times. The question is "does at least one exist?", which is a semi-join — no duplicates are ever produced.' },
    hints: [`<p>Hint 1: The output only has customer columns; orders/items/products are only used to <b>test existence</b>. That's a semi-join: <code>c.id IN (…)</code> or <code>EXISTS (…)</code>.</p>`, `<p>Hint 2: Make the year filter a half-open range and express "books" as <code>product_id IN (SELECT id FROM products WHERE category = 'books')</code> so <code>idx_items_product</code> can drive it.</p>`, `<p>Hint 3: In SQLite, prefer <code>IN (subquery)</code> here: it's evaluated once into a list; EXISTS would run per customer. Prove equality with EXCEPT both ways. Recipe: semi-join + sargable range + IN chain → EXPLAIN → compare.</p>`],
    tests: { engine: 'sqlite', check: '(rows, cols, c) => {\n  if (c.plan || c.noplan) { const d = rows.map(r => r[r.length - 1]).join(\'\\n\'); return (!c.plan || new RegExp(c.plan).test(d)) && (!c.noplan || !new RegExp(c.noplan).test(d)); }\n  let a = rows, b = c.rows || [];\n  if (c.set) { const k = r => JSON.stringify(r); a = a.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); b = b.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); }\n  return a.length === b.length && a.every((r, i) => r.length === b[i].length && r.every((v, j) => v === b[i][j] || (typeof v === \'number\' && typeof b[i][j] === \'number\' && Math.abs(v - b[i][j]) < 1e-6)));\n}', cases: [
      { rows: [
          [3, 'User 3', 'Chennai'],
          [4, 'User 4', 'Kolkata'],
          [8, 'User 8', 'Pune'],
          [9, 'User 9', 'Delhi'],
          [13, 'User 13', 'Jaipur'],
          [14, 'User 14', 'Hyderabad'],
          [18, 'User 18', 'Mumbai'],
          [19, 'User 19', 'Chennai'],
          [23, 'User 23', 'Bengaluru'],
          [24, 'User 24', 'Pune'],
          [28, 'User 28', 'Kolkata'],
          [29, 'User 29', 'Jaipur'],
          [33, 'User 33', 'Delhi'],
          [34, 'User 34', 'Mumbai'],
          [38, 'User 38', 'Hyderabad'],
          [39, 'User 39', 'Bengaluru'],
          [43, 'User 43', 'Chennai'],
          [44, 'User 44', 'Kolkata'],
          [48, 'User 48', 'Pune'],
          [49, 'User 49', 'Delhi'],
          [53, 'User 53', 'Jaipur'],
          [54, 'User 54', 'Hyderabad'],
          [58, 'User 58', 'Mumbai'],
          [59, 'User 59', 'Chennai'],
          [63, 'User 63', 'Bengaluru'],
          [64, 'User 64', 'Pune'],
          [68, 'User 68', 'Kolkata'],
          [69, 'User 69', 'Jaipur'],
          [73, 'User 73', 'Delhi'],
          [74, 'User 74', 'Mumbai'],
          [78, 'User 78', 'Hyderabad'],
          [79, 'User 79', 'Bengaluru'],
          [83, 'User 83', 'Chennai'],
          [84, 'User 84', 'Kolkata'],
          [88, 'User 88', 'Pune'],
          [89, 'User 89', 'Delhi'],
          [93, 'User 93', 'Jaipur'],
          [94, 'User 94', 'Hyderabad'],
          [98, 'User 98', 'Mumbai'],
          [99, 'User 99', 'Chennai'],
          [103, 'User 103', 'Bengaluru'],
          [104, 'User 104', 'Pune'],
          [108, 'User 108', 'Kolkata'],
          [109, 'User 109', 'Jaipur'],
          [113, 'User 113', 'Delhi'],
          [114, 'User 114', 'Mumbai'],
          [118, 'User 118', 'Hyderabad'],
          [119, 'User 119', 'Bengaluru'],
          [123, 'User 123', 'Chennai'],
          [124, 'User 124', 'Kolkata'],
          [128, 'User 128', 'Pune'],
          [129, 'User 129', 'Delhi'],
          [133, 'User 133', 'Jaipur'],
          [134, 'User 134', 'Hyderabad'],
          [138, 'User 138', 'Mumbai'],
          [139, 'User 139', 'Chennai'],
          [143, 'User 143', 'Bengaluru'],
          [144, 'User 144', 'Pune'],
          [148, 'User 148', 'Kolkata'],
          [149, 'User 149', 'Jaipur'],
          [153, 'User 153', 'Delhi'],
          [154, 'User 154', 'Mumbai'],
          [158, 'User 158', 'Hyderabad'],
          [159, 'User 159', 'Bengaluru'],
          [163, 'User 163', 'Chennai'],
          [164, 'User 164', 'Kolkata'],
          [168, 'User 168', 'Pune'],
          [169, 'User 169', 'Delhi'],
          [173, 'User 173', 'Jaipur'],
          [174, 'User 174', 'Hyderabad'],
          [178, 'User 178', 'Mumbai'],
          [179, 'User 179', 'Chennai'],
          [183, 'User 183', 'Bengaluru'],
          [184, 'User 184', 'Pune'],
          [188, 'User 188', 'Kolkata'],
          [189, 'User 189', 'Jaipur'],
          [193, 'User 193', 'Delhi'],
          [194, 'User 194', 'Mumbai'],
          [198, 'User 198', 'Hyderabad'],
          [199, 'User 199', 'Bengaluru'],
          [203, 'User 203', 'Chennai'],
          [204, 'User 204', 'Kolkata'],
          [208, 'User 208', 'Pune'],
          [209, 'User 209', 'Delhi'],
          [213, 'User 213', 'Jaipur'],
          [214, 'User 214', 'Hyderabad'],
          [218, 'User 218', 'Mumbai'],
          [219, 'User 219', 'Chennai'],
          [223, 'User 223', 'Bengaluru'],
          [224, 'User 224', 'Pune'],
          [228, 'User 228', 'Kolkata'],
          [229, 'User 229', 'Jaipur'],
          [233, 'User 233', 'Delhi'],
          [234, 'User 234', 'Mumbai'],
          [238, 'User 238', 'Hyderabad'],
          [239, 'User 239', 'Bengaluru'],
          [243, 'User 243', 'Chennai'],
          [244, 'User 244', 'Kolkata'],
          [248, 'User 248', 'Pune'],
          [249, 'User 249', 'Delhi'],
          [253, 'User 253', 'Jaipur'],
          [254, 'User 254', 'Hyderabad'],
          [258, 'User 258', 'Mumbai'],
          [259, 'User 259', 'Chennai'],
          [263, 'User 263', 'Bengaluru'],
          [264, 'User 264', 'Pune'],
          [268, 'User 268', 'Kolkata'],
          [269, 'User 269', 'Jaipur'],
          [273, 'User 273', 'Delhi'],
          [274, 'User 274', 'Mumbai'],
          [278, 'User 278', 'Hyderabad'],
          [279, 'User 279', 'Bengaluru'],
          [283, 'User 283', 'Chennai'],
          [284, 'User 284', 'Kolkata'],
          [288, 'User 288', 'Pune'],
          [289, 'User 289', 'Delhi'],
          [293, 'User 293', 'Jaipur'],
          [294, 'User 294', 'Hyderabad'],
          [298, 'User 298', 'Mumbai'],
          [299, 'User 299', 'Chennai']
        ] },
      { after: 'WITH old AS (SELECT DISTINCT c.id FROM customers c JOIN orders o ON o.customer_id = c.id JOIN order_items i ON i.order_id = o.id JOIN products p ON p.id = i.product_id WHERE p.category = \'books\' AND strftime(\'%Y\', o.created_at) = \'2026\') SELECT count(*) FROM old', rows: [
          [120]
        ] },
      { setup: 'DELETE FROM orders; DELETE FROM order_items; INSERT INTO orders VALUES (1,1,\'paid\',\'2026-01-01 00:00:00\',100),(2,2,\'paid\',\'2025-12-31 23:59:59\',100),(3,3,\'paid\',\'2027-01-01 00:00:00\',100),(4,4,\'paid\',\'2026-12-31 23:59:59\',100),(5,5,\'paid\',\'2026-06-01 00:00:00\',100),(6,1,\'paid\',\'2026-07-01 00:00:00\',100); INSERT INTO order_items VALUES (1,5,1),(2,5,1),(3,5,1),(4,5,1),(5,6,1),(6,10,2)', rows: [
          [1, 'User 1', 'Delhi'],
          [4, 'User 4', 'Kolkata']
        ] },
      { setup: 'UPDATE products SET category = \'tech\' WHERE category = \'books\'', after: 'SELECT count(*) FROM (SELECT c.id FROM customers c WHERE c.id IN (SELECT o.customer_id FROM orders o JOIN order_items i ON i.order_id = o.id WHERE o.created_at >= \'2026-01-01\' AND o.created_at < \'2027-01-01\' AND i.product_id IN (SELECT id FROM products WHERE category = \'books\')))', rows: [
          [0]
        ] },
      { setup: 'UPDATE orders SET created_at = replace(created_at, \'2026-\', \'2025-\')', after: 'SELECT count(*) FROM (SELECT c.id FROM customers c WHERE c.id IN (SELECT o.customer_id FROM orders o WHERE o.created_at >= \'2026-01-01\' AND o.created_at < \'2027-01-01\'))', rows: [
          [0]
        ] },
      { setup: 'DELETE FROM customers WHERE id <= 160', rows: [
          [163, 'User 163', 'Chennai'],
          [164, 'User 164', 'Kolkata'],
          [168, 'User 168', 'Pune'],
          [169, 'User 169', 'Delhi'],
          [173, 'User 173', 'Jaipur'],
          [174, 'User 174', 'Hyderabad'],
          [178, 'User 178', 'Mumbai'],
          [179, 'User 179', 'Chennai'],
          [183, 'User 183', 'Bengaluru'],
          [184, 'User 184', 'Pune'],
          [188, 'User 188', 'Kolkata'],
          [189, 'User 189', 'Jaipur'],
          [193, 'User 193', 'Delhi'],
          [194, 'User 194', 'Mumbai'],
          [198, 'User 198', 'Hyderabad'],
          [199, 'User 199', 'Bengaluru'],
          [203, 'User 203', 'Chennai'],
          [204, 'User 204', 'Kolkata'],
          [208, 'User 208', 'Pune'],
          [209, 'User 209', 'Delhi'],
          [213, 'User 213', 'Jaipur'],
          [214, 'User 214', 'Hyderabad'],
          [218, 'User 218', 'Mumbai'],
          [219, 'User 219', 'Chennai'],
          [223, 'User 223', 'Bengaluru'],
          [224, 'User 224', 'Pune'],
          [228, 'User 228', 'Kolkata'],
          [229, 'User 229', 'Jaipur'],
          [233, 'User 233', 'Delhi'],
          [234, 'User 234', 'Mumbai'],
          [238, 'User 238', 'Hyderabad'],
          [239, 'User 239', 'Bengaluru'],
          [243, 'User 243', 'Chennai'],
          [244, 'User 244', 'Kolkata'],
          [248, 'User 248', 'Pune'],
          [249, 'User 249', 'Delhi'],
          [253, 'User 253', 'Jaipur'],
          [254, 'User 254', 'Hyderabad'],
          [258, 'User 258', 'Mumbai'],
          [259, 'User 259', 'Chennai'],
          [263, 'User 263', 'Bengaluru'],
          [264, 'User 264', 'Pune'],
          [268, 'User 268', 'Kolkata'],
          [269, 'User 269', 'Jaipur'],
          [273, 'User 273', 'Delhi'],
          [274, 'User 274', 'Mumbai'],
          [278, 'User 278', 'Hyderabad'],
          [279, 'User 279', 'Bengaluru'],
          [283, 'User 283', 'Chennai'],
          [284, 'User 284', 'Kolkata'],
          [288, 'User 288', 'Pune'],
          [289, 'User 289', 'Delhi'],
          [293, 'User 293', 'Jaipur'],
          [294, 'User 294', 'Hyderabad'],
          [298, 'User 298', 'Mumbai'],
          [299, 'User 299', 'Chennai']
        ] },
      { setup: 'UPDATE orders SET created_at = replace(created_at, \'2025-\', \'2026-\') WHERE created_at < \'2026\'', rows: [
          [3, 'User 3', 'Chennai'],
          [4, 'User 4', 'Kolkata'],
          [8, 'User 8', 'Pune'],
          [9, 'User 9', 'Delhi'],
          [13, 'User 13', 'Jaipur'],
          [14, 'User 14', 'Hyderabad'],
          [18, 'User 18', 'Mumbai'],
          [19, 'User 19', 'Chennai'],
          [23, 'User 23', 'Bengaluru'],
          [24, 'User 24', 'Pune'],
          [28, 'User 28', 'Kolkata'],
          [29, 'User 29', 'Jaipur'],
          [33, 'User 33', 'Delhi'],
          [34, 'User 34', 'Mumbai'],
          [38, 'User 38', 'Hyderabad'],
          [39, 'User 39', 'Bengaluru'],
          [43, 'User 43', 'Chennai'],
          [44, 'User 44', 'Kolkata'],
          [48, 'User 48', 'Pune'],
          [49, 'User 49', 'Delhi'],
          [53, 'User 53', 'Jaipur'],
          [54, 'User 54', 'Hyderabad'],
          [58, 'User 58', 'Mumbai'],
          [59, 'User 59', 'Chennai'],
          [63, 'User 63', 'Bengaluru'],
          [64, 'User 64', 'Pune'],
          [68, 'User 68', 'Kolkata'],
          [69, 'User 69', 'Jaipur'],
          [73, 'User 73', 'Delhi'],
          [74, 'User 74', 'Mumbai'],
          [78, 'User 78', 'Hyderabad'],
          [79, 'User 79', 'Bengaluru'],
          [83, 'User 83', 'Chennai'],
          [84, 'User 84', 'Kolkata'],
          [88, 'User 88', 'Pune'],
          [89, 'User 89', 'Delhi'],
          [93, 'User 93', 'Jaipur'],
          [94, 'User 94', 'Hyderabad'],
          [98, 'User 98', 'Mumbai'],
          [99, 'User 99', 'Chennai'],
          [103, 'User 103', 'Bengaluru'],
          [104, 'User 104', 'Pune'],
          [108, 'User 108', 'Kolkata'],
          [109, 'User 109', 'Jaipur'],
          [113, 'User 113', 'Delhi'],
          [114, 'User 114', 'Mumbai'],
          [118, 'User 118', 'Hyderabad'],
          [119, 'User 119', 'Bengaluru'],
          [123, 'User 123', 'Chennai'],
          [124, 'User 124', 'Kolkata'],
          [128, 'User 128', 'Pune'],
          [129, 'User 129', 'Delhi'],
          [133, 'User 133', 'Jaipur'],
          [134, 'User 134', 'Hyderabad'],
          [138, 'User 138', 'Mumbai'],
          [139, 'User 139', 'Chennai'],
          [143, 'User 143', 'Bengaluru'],
          [144, 'User 144', 'Pune'],
          [148, 'User 148', 'Kolkata'],
          [149, 'User 149', 'Jaipur'],
          [153, 'User 153', 'Delhi'],
          [154, 'User 154', 'Mumbai'],
          [158, 'User 158', 'Hyderabad'],
          [159, 'User 159', 'Bengaluru'],
          [163, 'User 163', 'Chennai'],
          [164, 'User 164', 'Kolkata'],
          [168, 'User 168', 'Pune'],
          [169, 'User 169', 'Delhi'],
          [173, 'User 173', 'Jaipur'],
          [174, 'User 174', 'Hyderabad'],
          [178, 'User 178', 'Mumbai'],
          [179, 'User 179', 'Chennai'],
          [183, 'User 183', 'Bengaluru'],
          [184, 'User 184', 'Pune'],
          [188, 'User 188', 'Kolkata'],
          [189, 'User 189', 'Jaipur'],
          [193, 'User 193', 'Delhi'],
          [194, 'User 194', 'Mumbai'],
          [198, 'User 198', 'Hyderabad'],
          [199, 'User 199', 'Bengaluru'],
          [203, 'User 203', 'Chennai'],
          [204, 'User 204', 'Kolkata'],
          [208, 'User 208', 'Pune'],
          [209, 'User 209', 'Delhi'],
          [213, 'User 213', 'Jaipur'],
          [214, 'User 214', 'Hyderabad'],
          [218, 'User 218', 'Mumbai'],
          [219, 'User 219', 'Chennai'],
          [223, 'User 223', 'Bengaluru'],
          [224, 'User 224', 'Pune'],
          [228, 'User 228', 'Kolkata'],
          [229, 'User 229', 'Jaipur'],
          [233, 'User 233', 'Delhi'],
          [234, 'User 234', 'Mumbai'],
          [238, 'User 238', 'Hyderabad'],
          [239, 'User 239', 'Bengaluru'],
          [243, 'User 243', 'Chennai'],
          [244, 'User 244', 'Kolkata'],
          [248, 'User 248', 'Pune'],
          [249, 'User 249', 'Delhi'],
          [253, 'User 253', 'Jaipur'],
          [254, 'User 254', 'Hyderabad'],
          [258, 'User 258', 'Mumbai'],
          [259, 'User 259', 'Chennai'],
          [263, 'User 263', 'Bengaluru'],
          [264, 'User 264', 'Pune'],
          [268, 'User 268', 'Kolkata'],
          [269, 'User 269', 'Jaipur'],
          [273, 'User 273', 'Delhi'],
          [274, 'User 274', 'Mumbai'],
          [278, 'User 278', 'Hyderabad'],
          [279, 'User 279', 'Bengaluru'],
          [283, 'User 283', 'Chennai'],
          [284, 'User 284', 'Kolkata'],
          [288, 'User 288', 'Pune'],
          [289, 'User 289', 'Delhi'],
          [293, 'User 293', 'Jaipur'],
          [294, 'User 294', 'Hyderabad'],
          [298, 'User 298', 'Mumbai'],
          [299, 'User 299', 'Chennai']
        ] },
      { rows: [], plan: 'SEARCH i USING (COVERING )?INDEX idx_items_product|SEARCH products|SEARCH p ', noplan: null, after: 'EXPLAIN QUERY PLAN SELECT c.id, c.name, c.city FROM customers c WHERE c.id IN (SELECT o.customer_id FROM orders o JOIN order_items i ON i.order_id = o.id WHERE o.created_at >= \'2026-01-01\' AND o.created_at < \'2027-01-01\' AND i.product_id IN (SELECT id FROM products WHERE category = \'books\')) ORDER BY c.id' }
    ] },
    solution: {
      approach: `<p>Rewrite as a <b>semi-join</b>: customers whose id is in the set of customer_ids that have a 2026 order containing a books product. Inside, start from the 12 books products, use <code>idx_items_product</code> to find their order lines, look up each order by PK and keep 2026 ones (half-open range). No fan-out reaches the outer query, so DISTINCT disappears; the outer side is 120 PK lookups. In PostgreSQL both IN and EXISTS become a Hash Semi Join; in SQLite the IN form is the one that gets evaluated once.</p>`,
      code: { lang: 'sql', db: 'shop', code: `EXPLAIN QUERY PLAN
SELECT c.id, c.name, c.city
FROM customers c
WHERE c.id IN (
  SELECT o.customer_id
  FROM orders o
  JOIN order_items i ON i.order_id = o.id
  WHERE o.created_at >= '2026-01-01' AND o.created_at < '2027-01-01'
    AND i.product_id IN (SELECT id FROM products WHERE category = 'books'))
ORDER BY c.id;

-- Same rows? Both differences must be 0.
WITH old AS (
  SELECT DISTINCT c.id FROM customers c
  JOIN orders o ON o.customer_id = c.id
  JOIN order_items i ON i.order_id = o.id
  JOIN products p ON p.id = i.product_id
  WHERE p.category = 'books' AND strftime('%Y', o.created_at) = '2026'),
new AS (
  SELECT c.id FROM customers c
  WHERE c.id IN (SELECT o.customer_id FROM orders o JOIN order_items i ON i.order_id = o.id
                 WHERE o.created_at >= '2026-01-01' AND o.created_at < '2027-01-01'
                   AND i.product_id IN (SELECT id FROM products WHERE category = 'books')))
SELECT (SELECT count(*) FROM old) AS old_rows, (SELECT count(*) FROM new) AS new_rows,
       (SELECT count(*) FROM (SELECT id FROM old EXCEPT SELECT id FROM new)) AS only_old,
       (SELECT count(*) FROM (SELECT id FROM new EXCEPT SELECT id FROM old)) AS only_new;

-- The answer: the 120 customers
SELECT c.id, c.name, c.city
FROM customers c
WHERE c.id IN (
  SELECT o.customer_id
  FROM orders o
  JOIN order_items i ON i.order_id = o.id
  WHERE o.created_at >= '2026-01-01' AND o.created_at < '2027-01-01'
    AND i.product_id IN (SELECT id FROM products WHERE category = 'books'))
ORDER BY c.id;` },
      complexity: `<p>Original: O(I) lines × 3 lookups + DISTINCT sort of the fan-out. Rewrite: O(B·k) lines of books products + their order lookups + O(C') customer lookups. Measured 54.8K → 12.2K VM steps.</p>`,
      followUps: ['Which index would make the inner part even cheaper?', 'How would you also return the number of books lines per customer without reintroducing DISTINCT?']
    }
  });

  practice.push({
    title: 'Inactive customers report (anti-join done right)', level: 'Hard', tags: ['anti-join', 'NOT EXISTS', 'sargable', 'covering index'], companies: ['Salesforce', 'HubSpot', 'CRED'],
    statement: `<p>CRM wants customers with <b>no order in the last 180 days</b> (today = 2026-10-14). The current query:</p><pre>SELECT c.id, c.name FROM customers c
WHERE c.id NOT IN (
  SELECT DISTINCT customer_id FROM orders
  WHERE julianday('2026-10-14') - julianday(created_at) &lt;= 180)
ORDER BY c.id;</pre><p>Rewrite it (correctness first, then speed), add the best index for the new shape, and show plans and measurements.</p>`,
    constraints: `SQLite <code>shop</code>; expected 25 rows (20 customers who never ordered + 5 inactive ones). <code>orders.customer_id</code> is NOT NULL.`,
    example: `<p>Measured VM steps: original ≈ ${H.c('r', '26,200')}; NOT EXISTS + sargable range ≈ ${H.c('y', '8,800')}; plus covering index <code>(customer_id, created_at)</code> ≈ ${H.c('g', '5,100')}. Final plan line: <code>SEARCH o USING COVERING INDEX idx_orders_cust_created (customer_id=? AND created_at&gt;?)</code>.</p>`,
    brute: { why: `<p>The subquery computes two <code>julianday()</code> calls for all 3,000 orders (non-sargable), adds a pointless <code>DISTINCT</code>, and builds the whole list before anything is returned. It happens to be correct here only because <code>customer_id</code> is NOT NULL — the same pattern on a nullable column would silently return nothing.</p>`, code: { lang: 'sql', db: 'shop', code: `EXPLAIN QUERY PLAN
SELECT c.id, c.name FROM customers c
WHERE c.id NOT IN (
  SELECT DISTINCT customer_id FROM orders
  WHERE julianday('2026-10-14') - julianday(created_at) <= 180)
ORDER BY c.id;
SELECT count(*) AS inactive FROM customers c
WHERE c.id NOT IN (
  SELECT DISTINCT customer_id FROM orders
  WHERE julianday('2026-10-14') - julianday(created_at) <= 180);` } },
    mcq: { q: 'For the NOT EXISTS version, which index lets each probe answer from the index alone?', options: ['(created_at)', '(customer_id)', '(customer_id, created_at)', '(created_at, customer_id)'], answer: 2, explain: 'Each probe is "customer_id = ? AND created_at > ?": equality first, then the range column; both live in the index, so the probe is a covering seek that stops at the first hit.' },
    hints: [`<p>Hint 1: Correctness: NOT IN breaks with NULLs; NOT EXISTS with a correlated <code>=</code> never does. Make it the default habit.</p>`, `<p>Hint 2: Speed: make the date test sargable — <code>o.created_at &gt;= date('2026-10-14', '-180 days')</code> — and drop DISTINCT (EXISTS stops at the first row anyway).</p>`, `<p>Hint 3: Each probe asks "any order for this customer after date X?": index <code>(customer_id, created_at)</code> answers that with one covering seek. Check: still 25 rows, and the plan line ends with <code>(customer_id=? AND created_at&gt;?)</code>.</p>`],
    tests: { engine: 'sqlite', check: '(rows, cols, c) => {\n  if (c.plan || c.noplan) { const d = rows.map(r => r[r.length - 1]).join(\'\\n\'); return (!c.plan || new RegExp(c.plan).test(d)) && (!c.noplan || !new RegExp(c.noplan).test(d)); }\n  let a = rows, b = c.rows || [];\n  if (c.set) { const k = r => JSON.stringify(r); a = a.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); b = b.slice().sort((x, y) => k(x) < k(y) ? -1 : 1); }\n  return a.length === b.length && a.every((r, i) => r.length === b[i].length && r.every((v, j) => v === b[i][j] || (typeof v === \'number\' && typeof b[i][j] === \'number\' && Math.abs(v - b[i][j]) < 1e-6)));\n}', cases: [
      { rows: [
          [45, 'User 45'],
          [56, 'User 56'],
          [109, 'User 109'],
          [281, 'User 281'],
          [292, 'User 292'],
          [301, 'User 301'],
          [302, 'User 302'],
          [303, 'User 303'],
          [304, 'User 304'],
          [305, 'User 305'],
          [306, 'User 306'],
          [307, 'User 307'],
          [308, 'User 308'],
          [309, 'User 309'],
          [310, 'User 310'],
          [311, 'User 311'],
          [312, 'User 312'],
          [313, 'User 313'],
          [314, 'User 314'],
          [315, 'User 315'],
          [316, 'User 316'],
          [317, 'User 317'],
          [318, 'User 318'],
          [319, 'User 319'],
          [320, 'User 320']
        ] },
      { rows: [], plan: 'SEARCH o USING COVERING INDEX idx_orders_cust_created \\(customer_id=\\? AND created_at>\\?\\)', noplan: 'SCAN o', after: 'EXPLAIN QUERY PLAN SELECT c.id, c.name FROM customers c WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.id AND o.created_at >= date(\'2026-10-14\', \'-180 days\')) ORDER BY c.id' },
      { setup: 'DELETE FROM orders; INSERT INTO orders VALUES (1,1,\'paid\',\'2026-04-16 23:59:59\',100),(2,2,\'paid\',\'2026-04-17 00:00:00\',100),(3,3,\'paid\',\'2027-01-01 00:00:00\',100),(4,4,\'paid\',\'2026-10-14 12:00:00\',100),(5,5,\'paid\',\'2020-01-01 00:00:00\',100),(6,5,\'paid\',\'2026-04-16 00:00:00\',100)', rows: [
          [1, 'User 1'],
          [5, 'User 5'],
          [6, 'User 6'],
          [7, 'User 7'],
          [8, 'User 8'],
          [9, 'User 9'],
          [10, 'User 10'],
          [11, 'User 11'],
          [12, 'User 12'],
          [13, 'User 13'],
          [14, 'User 14'],
          [15, 'User 15'],
          [16, 'User 16'],
          [17, 'User 17'],
          [18, 'User 18'],
          [19, 'User 19'],
          [20, 'User 20'],
          [21, 'User 21'],
          [22, 'User 22'],
          [23, 'User 23'],
          [24, 'User 24'],
          [25, 'User 25'],
          [26, 'User 26'],
          [27, 'User 27'],
          [28, 'User 28'],
          [29, 'User 29'],
          [30, 'User 30'],
          [31, 'User 31'],
          [32, 'User 32'],
          [33, 'User 33'],
          [34, 'User 34'],
          [35, 'User 35'],
          [36, 'User 36'],
          [37, 'User 37'],
          [38, 'User 38'],
          [39, 'User 39'],
          [40, 'User 40'],
          [41, 'User 41'],
          [42, 'User 42'],
          [43, 'User 43'],
          [44, 'User 44'],
          [45, 'User 45'],
          [46, 'User 46'],
          [47, 'User 47'],
          [48, 'User 48'],
          [49, 'User 49'],
          [50, 'User 50'],
          [51, 'User 51'],
          [52, 'User 52'],
          [53, 'User 53'],
          [54, 'User 54'],
          [55, 'User 55'],
          [56, 'User 56'],
          [57, 'User 57'],
          [58, 'User 58'],
          [59, 'User 59'],
          [60, 'User 60'],
          [61, 'User 61'],
          [62, 'User 62'],
          [63, 'User 63'],
          [64, 'User 64'],
          [65, 'User 65'],
          [66, 'User 66'],
          [67, 'User 67'],
          [68, 'User 68'],
          [69, 'User 69'],
          [70, 'User 70'],
          [71, 'User 71'],
          [72, 'User 72'],
          [73, 'User 73'],
          [74, 'User 74'],
          [75, 'User 75'],
          [76, 'User 76'],
          [77, 'User 77'],
          [78, 'User 78'],
          [79, 'User 79'],
          [80, 'User 80'],
          [81, 'User 81'],
          [82, 'User 82'],
          [83, 'User 83'],
          [84, 'User 84'],
          [85, 'User 85'],
          [86, 'User 86'],
          [87, 'User 87'],
          [88, 'User 88'],
          [89, 'User 89'],
          [90, 'User 90'],
          [91, 'User 91'],
          [92, 'User 92'],
          [93, 'User 93'],
          [94, 'User 94'],
          [95, 'User 95'],
          [96, 'User 96'],
          [97, 'User 97'],
          [98, 'User 98'],
          [99, 'User 99'],
          [100, 'User 100'],
          [101, 'User 101'],
          [102, 'User 102'],
          [103, 'User 103'],
          [104, 'User 104'],
          [105, 'User 105'],
          [106, 'User 106'],
          [107, 'User 107'],
          [108, 'User 108'],
          [109, 'User 109'],
          [110, 'User 110'],
          [111, 'User 111'],
          [112, 'User 112'],
          [113, 'User 113'],
          [114, 'User 114'],
          [115, 'User 115'],
          [116, 'User 116'],
          [117, 'User 117'],
          [118, 'User 118'],
          [119, 'User 119'],
          [120, 'User 120'],
          [121, 'User 121'],
          [122, 'User 122'],
          [123, 'User 123'],
          [124, 'User 124'],
          [125, 'User 125'],
          [126, 'User 126'],
          [127, 'User 127'],
          [128, 'User 128'],
          [129, 'User 129'],
          [130, 'User 130'],
          [131, 'User 131'],
          [132, 'User 132'],
          [133, 'User 133'],
          [134, 'User 134'],
          [135, 'User 135'],
          [136, 'User 136'],
          [137, 'User 137'],
          [138, 'User 138'],
          [139, 'User 139'],
          [140, 'User 140'],
          [141, 'User 141'],
          [142, 'User 142'],
          [143, 'User 143'],
          [144, 'User 144'],
          [145, 'User 145'],
          [146, 'User 146'],
          [147, 'User 147'],
          [148, 'User 148'],
          [149, 'User 149'],
          [150, 'User 150'],
          [151, 'User 151'],
          [152, 'User 152'],
          [153, 'User 153'],
          [154, 'User 154'],
          [155, 'User 155'],
          [156, 'User 156'],
          [157, 'User 157'],
          [158, 'User 158'],
          [159, 'User 159'],
          [160, 'User 160'],
          [161, 'User 161'],
          [162, 'User 162'],
          [163, 'User 163'],
          [164, 'User 164'],
          [165, 'User 165'],
          [166, 'User 166'],
          [167, 'User 167'],
          [168, 'User 168'],
          [169, 'User 169'],
          [170, 'User 170'],
          [171, 'User 171'],
          [172, 'User 172'],
          [173, 'User 173'],
          [174, 'User 174'],
          [175, 'User 175'],
          [176, 'User 176'],
          [177, 'User 177'],
          [178, 'User 178'],
          [179, 'User 179'],
          [180, 'User 180'],
          [181, 'User 181'],
          [182, 'User 182'],
          [183, 'User 183'],
          [184, 'User 184'],
          [185, 'User 185'],
          [186, 'User 186'],
          [187, 'User 187'],
          [188, 'User 188'],
          [189, 'User 189'],
          [190, 'User 190'],
          [191, 'User 191'],
          [192, 'User 192'],
          [193, 'User 193'],
          [194, 'User 194'],
          [195, 'User 195'],
          [196, 'User 196'],
          [197, 'User 197'],
          [198, 'User 198'],
          [199, 'User 199'],
          [200, 'User 200'],
          [201, 'User 201'],
          [202, 'User 202'],
          [203, 'User 203'],
          [204, 'User 204'],
          [205, 'User 205'],
          [206, 'User 206'],
          [207, 'User 207'],
          [208, 'User 208'],
          [209, 'User 209'],
          [210, 'User 210'],
          [211, 'User 211'],
          [212, 'User 212'],
          [213, 'User 213'],
          [214, 'User 214'],
          [215, 'User 215'],
          [216, 'User 216'],
          [217, 'User 217'],
          [218, 'User 218'],
          [219, 'User 219'],
          [220, 'User 220'],
          [221, 'User 221'],
          [222, 'User 222'],
          [223, 'User 223'],
          [224, 'User 224'],
          [225, 'User 225'],
          [226, 'User 226'],
          [227, 'User 227'],
          [228, 'User 228'],
          [229, 'User 229'],
          [230, 'User 230'],
          [231, 'User 231'],
          [232, 'User 232'],
          [233, 'User 233'],
          [234, 'User 234'],
          [235, 'User 235'],
          [236, 'User 236'],
          [237, 'User 237'],
          [238, 'User 238'],
          [239, 'User 239'],
          [240, 'User 240'],
          [241, 'User 241'],
          [242, 'User 242'],
          [243, 'User 243'],
          [244, 'User 244'],
          [245, 'User 245'],
          [246, 'User 246'],
          [247, 'User 247'],
          [248, 'User 248'],
          [249, 'User 249'],
          [250, 'User 250'],
          [251, 'User 251'],
          [252, 'User 252'],
          [253, 'User 253'],
          [254, 'User 254'],
          [255, 'User 255'],
          [256, 'User 256'],
          [257, 'User 257'],
          [258, 'User 258'],
          [259, 'User 259'],
          [260, 'User 260'],
          [261, 'User 261'],
          [262, 'User 262'],
          [263, 'User 263'],
          [264, 'User 264'],
          [265, 'User 265'],
          [266, 'User 266'],
          [267, 'User 267'],
          [268, 'User 268'],
          [269, 'User 269'],
          [270, 'User 270'],
          [271, 'User 271'],
          [272, 'User 272'],
          [273, 'User 273'],
          [274, 'User 274'],
          [275, 'User 275'],
          [276, 'User 276'],
          [277, 'User 277'],
          [278, 'User 278'],
          [279, 'User 279'],
          [280, 'User 280'],
          [281, 'User 281'],
          [282, 'User 282'],
          [283, 'User 283'],
          [284, 'User 284'],
          [285, 'User 285'],
          [286, 'User 286'],
          [287, 'User 287'],
          [288, 'User 288'],
          [289, 'User 289'],
          [290, 'User 290'],
          [291, 'User 291'],
          [292, 'User 292'],
          [293, 'User 293'],
          [294, 'User 294'],
          [295, 'User 295'],
          [296, 'User 296'],
          [297, 'User 297'],
          [298, 'User 298'],
          [299, 'User 299'],
          [300, 'User 300'],
          [301, 'User 301'],
          [302, 'User 302'],
          [303, 'User 303'],
          [304, 'User 304'],
          [305, 'User 305'],
          [306, 'User 306'],
          [307, 'User 307'],
          [308, 'User 308'],
          [309, 'User 309'],
          [310, 'User 310'],
          [311, 'User 311'],
          [312, 'User 312'],
          [313, 'User 313'],
          [314, 'User 314'],
          [315, 'User 315'],
          [316, 'User 316'],
          [317, 'User 317'],
          [318, 'User 318'],
          [319, 'User 319'],
          [320, 'User 320']
        ] },
      { setup: 'DELETE FROM orders', rows: [
          [1, 'User 1'],
          [2, 'User 2'],
          [3, 'User 3'],
          [4, 'User 4'],
          [5, 'User 5'],
          [6, 'User 6'],
          [7, 'User 7'],
          [8, 'User 8'],
          [9, 'User 9'],
          [10, 'User 10'],
          [11, 'User 11'],
          [12, 'User 12'],
          [13, 'User 13'],
          [14, 'User 14'],
          [15, 'User 15'],
          [16, 'User 16'],
          [17, 'User 17'],
          [18, 'User 18'],
          [19, 'User 19'],
          [20, 'User 20'],
          [21, 'User 21'],
          [22, 'User 22'],
          [23, 'User 23'],
          [24, 'User 24'],
          [25, 'User 25'],
          [26, 'User 26'],
          [27, 'User 27'],
          [28, 'User 28'],
          [29, 'User 29'],
          [30, 'User 30'],
          [31, 'User 31'],
          [32, 'User 32'],
          [33, 'User 33'],
          [34, 'User 34'],
          [35, 'User 35'],
          [36, 'User 36'],
          [37, 'User 37'],
          [38, 'User 38'],
          [39, 'User 39'],
          [40, 'User 40'],
          [41, 'User 41'],
          [42, 'User 42'],
          [43, 'User 43'],
          [44, 'User 44'],
          [45, 'User 45'],
          [46, 'User 46'],
          [47, 'User 47'],
          [48, 'User 48'],
          [49, 'User 49'],
          [50, 'User 50'],
          [51, 'User 51'],
          [52, 'User 52'],
          [53, 'User 53'],
          [54, 'User 54'],
          [55, 'User 55'],
          [56, 'User 56'],
          [57, 'User 57'],
          [58, 'User 58'],
          [59, 'User 59'],
          [60, 'User 60'],
          [61, 'User 61'],
          [62, 'User 62'],
          [63, 'User 63'],
          [64, 'User 64'],
          [65, 'User 65'],
          [66, 'User 66'],
          [67, 'User 67'],
          [68, 'User 68'],
          [69, 'User 69'],
          [70, 'User 70'],
          [71, 'User 71'],
          [72, 'User 72'],
          [73, 'User 73'],
          [74, 'User 74'],
          [75, 'User 75'],
          [76, 'User 76'],
          [77, 'User 77'],
          [78, 'User 78'],
          [79, 'User 79'],
          [80, 'User 80'],
          [81, 'User 81'],
          [82, 'User 82'],
          [83, 'User 83'],
          [84, 'User 84'],
          [85, 'User 85'],
          [86, 'User 86'],
          [87, 'User 87'],
          [88, 'User 88'],
          [89, 'User 89'],
          [90, 'User 90'],
          [91, 'User 91'],
          [92, 'User 92'],
          [93, 'User 93'],
          [94, 'User 94'],
          [95, 'User 95'],
          [96, 'User 96'],
          [97, 'User 97'],
          [98, 'User 98'],
          [99, 'User 99'],
          [100, 'User 100'],
          [101, 'User 101'],
          [102, 'User 102'],
          [103, 'User 103'],
          [104, 'User 104'],
          [105, 'User 105'],
          [106, 'User 106'],
          [107, 'User 107'],
          [108, 'User 108'],
          [109, 'User 109'],
          [110, 'User 110'],
          [111, 'User 111'],
          [112, 'User 112'],
          [113, 'User 113'],
          [114, 'User 114'],
          [115, 'User 115'],
          [116, 'User 116'],
          [117, 'User 117'],
          [118, 'User 118'],
          [119, 'User 119'],
          [120, 'User 120'],
          [121, 'User 121'],
          [122, 'User 122'],
          [123, 'User 123'],
          [124, 'User 124'],
          [125, 'User 125'],
          [126, 'User 126'],
          [127, 'User 127'],
          [128, 'User 128'],
          [129, 'User 129'],
          [130, 'User 130'],
          [131, 'User 131'],
          [132, 'User 132'],
          [133, 'User 133'],
          [134, 'User 134'],
          [135, 'User 135'],
          [136, 'User 136'],
          [137, 'User 137'],
          [138, 'User 138'],
          [139, 'User 139'],
          [140, 'User 140'],
          [141, 'User 141'],
          [142, 'User 142'],
          [143, 'User 143'],
          [144, 'User 144'],
          [145, 'User 145'],
          [146, 'User 146'],
          [147, 'User 147'],
          [148, 'User 148'],
          [149, 'User 149'],
          [150, 'User 150'],
          [151, 'User 151'],
          [152, 'User 152'],
          [153, 'User 153'],
          [154, 'User 154'],
          [155, 'User 155'],
          [156, 'User 156'],
          [157, 'User 157'],
          [158, 'User 158'],
          [159, 'User 159'],
          [160, 'User 160'],
          [161, 'User 161'],
          [162, 'User 162'],
          [163, 'User 163'],
          [164, 'User 164'],
          [165, 'User 165'],
          [166, 'User 166'],
          [167, 'User 167'],
          [168, 'User 168'],
          [169, 'User 169'],
          [170, 'User 170'],
          [171, 'User 171'],
          [172, 'User 172'],
          [173, 'User 173'],
          [174, 'User 174'],
          [175, 'User 175'],
          [176, 'User 176'],
          [177, 'User 177'],
          [178, 'User 178'],
          [179, 'User 179'],
          [180, 'User 180'],
          [181, 'User 181'],
          [182, 'User 182'],
          [183, 'User 183'],
          [184, 'User 184'],
          [185, 'User 185'],
          [186, 'User 186'],
          [187, 'User 187'],
          [188, 'User 188'],
          [189, 'User 189'],
          [190, 'User 190'],
          [191, 'User 191'],
          [192, 'User 192'],
          [193, 'User 193'],
          [194, 'User 194'],
          [195, 'User 195'],
          [196, 'User 196'],
          [197, 'User 197'],
          [198, 'User 198'],
          [199, 'User 199'],
          [200, 'User 200'],
          [201, 'User 201'],
          [202, 'User 202'],
          [203, 'User 203'],
          [204, 'User 204'],
          [205, 'User 205'],
          [206, 'User 206'],
          [207, 'User 207'],
          [208, 'User 208'],
          [209, 'User 209'],
          [210, 'User 210'],
          [211, 'User 211'],
          [212, 'User 212'],
          [213, 'User 213'],
          [214, 'User 214'],
          [215, 'User 215'],
          [216, 'User 216'],
          [217, 'User 217'],
          [218, 'User 218'],
          [219, 'User 219'],
          [220, 'User 220'],
          [221, 'User 221'],
          [222, 'User 222'],
          [223, 'User 223'],
          [224, 'User 224'],
          [225, 'User 225'],
          [226, 'User 226'],
          [227, 'User 227'],
          [228, 'User 228'],
          [229, 'User 229'],
          [230, 'User 230'],
          [231, 'User 231'],
          [232, 'User 232'],
          [233, 'User 233'],
          [234, 'User 234'],
          [235, 'User 235'],
          [236, 'User 236'],
          [237, 'User 237'],
          [238, 'User 238'],
          [239, 'User 239'],
          [240, 'User 240'],
          [241, 'User 241'],
          [242, 'User 242'],
          [243, 'User 243'],
          [244, 'User 244'],
          [245, 'User 245'],
          [246, 'User 246'],
          [247, 'User 247'],
          [248, 'User 248'],
          [249, 'User 249'],
          [250, 'User 250'],
          [251, 'User 251'],
          [252, 'User 252'],
          [253, 'User 253'],
          [254, 'User 254'],
          [255, 'User 255'],
          [256, 'User 256'],
          [257, 'User 257'],
          [258, 'User 258'],
          [259, 'User 259'],
          [260, 'User 260'],
          [261, 'User 261'],
          [262, 'User 262'],
          [263, 'User 263'],
          [264, 'User 264'],
          [265, 'User 265'],
          [266, 'User 266'],
          [267, 'User 267'],
          [268, 'User 268'],
          [269, 'User 269'],
          [270, 'User 270'],
          [271, 'User 271'],
          [272, 'User 272'],
          [273, 'User 273'],
          [274, 'User 274'],
          [275, 'User 275'],
          [276, 'User 276'],
          [277, 'User 277'],
          [278, 'User 278'],
          [279, 'User 279'],
          [280, 'User 280'],
          [281, 'User 281'],
          [282, 'User 282'],
          [283, 'User 283'],
          [284, 'User 284'],
          [285, 'User 285'],
          [286, 'User 286'],
          [287, 'User 287'],
          [288, 'User 288'],
          [289, 'User 289'],
          [290, 'User 290'],
          [291, 'User 291'],
          [292, 'User 292'],
          [293, 'User 293'],
          [294, 'User 294'],
          [295, 'User 295'],
          [296, 'User 296'],
          [297, 'User 297'],
          [298, 'User 298'],
          [299, 'User 299'],
          [300, 'User 300'],
          [301, 'User 301'],
          [302, 'User 302'],
          [303, 'User 303'],
          [304, 'User 304'],
          [305, 'User 305'],
          [306, 'User 306'],
          [307, 'User 307'],
          [308, 'User 308'],
          [309, 'User 309'],
          [310, 'User 310'],
          [311, 'User 311'],
          [312, 'User 312'],
          [313, 'User 313'],
          [314, 'User 314'],
          [315, 'User 315'],
          [316, 'User 316'],
          [317, 'User 317'],
          [318, 'User 318'],
          [319, 'User 319'],
          [320, 'User 320']
        ] },
      { setup: 'UPDATE orders SET created_at = \'2026-10-01 00:00:00\'', after: 'SELECT count(*) FROM (SELECT c.id, c.name FROM customers c WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.id AND o.created_at >= date(\'2026-10-14\', \'-180 days\')) ORDER BY c.id)', rows: [
          [20]
        ] },
      { setup: 'DELETE FROM customers WHERE id > 60; DELETE FROM orders WHERE customer_id > 60', rows: [
          [45, 'User 45'],
          [56, 'User 56']
        ] },
      { setup: 'INSERT INTO customers VALUES (900,\'new@mail.com\',\'New User\',\'Pune\',\'2026-10-01\',NULL)', rows: [
          [45, 'User 45'],
          [56, 'User 56'],
          [109, 'User 109'],
          [281, 'User 281'],
          [292, 'User 292'],
          [301, 'User 301'],
          [302, 'User 302'],
          [303, 'User 303'],
          [304, 'User 304'],
          [305, 'User 305'],
          [306, 'User 306'],
          [307, 'User 307'],
          [308, 'User 308'],
          [309, 'User 309'],
          [310, 'User 310'],
          [311, 'User 311'],
          [312, 'User 312'],
          [313, 'User 313'],
          [314, 'User 314'],
          [315, 'User 315'],
          [316, 'User 316'],
          [317, 'User 317'],
          [318, 'User 318'],
          [319, 'User 319'],
          [320, 'User 320'],
          [900, 'New User']
        ] },
      { after: 'SELECT count(*) FROM customers WHERE id NOT IN (SELECT customer_id FROM orders WHERE created_at >= \'2026-04-17\')', rows: [
          [25]
        ] }
    ] },
    solution: {
      approach: `<p>Use an <b>anti-join</b> with NOT EXISTS: for each customer, probe "is there an order with this customer_id and created_at in the window?". The date predicate is now a range on the bare column, so with <code>(customer_id, created_at)</code> each probe is a single covering seek that stops at the first hit (or proves absence after one descent). DISTINCT is gone. PostgreSQL would plan this as a Hash Anti Join or a Nested Loop Anti Join with an Index Only Scan, depending on sizes.</p>`,
      code: { lang: 'sql', db: 'shop', code: `CREATE INDEX idx_orders_cust_created ON orders(customer_id, created_at);

EXPLAIN QUERY PLAN
SELECT c.id, c.name FROM customers c
WHERE NOT EXISTS (
  SELECT 1 FROM orders o
  WHERE o.customer_id = c.id
    AND o.created_at >= date('2026-10-14', '-180 days'))
ORDER BY c.id;

SELECT c.id, c.name FROM customers c
WHERE NOT EXISTS (
  SELECT 1 FROM orders o
  WHERE o.customer_id = c.id
    AND o.created_at >= date('2026-10-14', '-180 days'))
ORDER BY c.id;` },
      complexity: `<p>Original: O(O) function evaluations + list build + O(C) membership tests. Final: O(C × log O) covering probes, each stopping at the first match. Measured 26.2K → 5.1K VM steps.</p>`,
      followUps: ['The boundary changed from "≤ 180 days of julian time" to "≥ a date": prove the counts match and say which one the business wants.', 'Write the LEFT JOIN … IS NULL version and compare its plan.']
    }
  });

  /* =====================================================================
     QUIZ
     ===================================================================== */
  quiz.push(
    { q: 'In which stage is <code>SELECT nme FROM customers</code> (typo in a column name) rejected?', options: ['Parser', 'Binder / analyzer (name resolution against the catalog)', 'Planner', 'Executor'], answer: 1, explain: 'The grammar is fine, so parsing succeeds. Looking the column up in the catalog fails during binding/analysis — before any plan is built or any data is read.' },
    { q: 'What does <code>EXPLAIN ANALYZE</code> do in PostgreSQL that plain <code>EXPLAIN</code> does not?', options: ['Shows the parse tree', 'Actually executes the statement and reports actual rows, loops and time per node', 'Collects new statistics', 'Rewrites the query for you'], answer: 1, explain: 'It runs the query (so an UPDATE really updates — wrap it in BEGIN … ROLLBACK) and prints actual numbers next to the estimates.' },
    { q: 'A PostgreSQL node shows <code>rows=1</code> (estimate) and <code>actual … rows=48000 loops=1</code>. What is the most likely consequence?', options: ['Nothing — estimates are cosmetic', 'Plans above it were chosen for 1 row (e.g. nested loop) and may be badly wrong for 48,000', 'The query returns wrong results', 'The index is corrupt'], answer: 1, explain: 'Cardinality errors propagate upward: a join strategy that is perfect for 1 outer row (nested loop with inner scans) can be disastrous for 48,000.' },
    { q: 'SQLite prints <code>SEARCH orders USING COVERING INDEX idx_orders_created (created_at&gt;?)</code>. What does "COVERING" mean?', options: ['The index covers the whole table', 'All columns the query needs are in the index, so the table is never read', 'The index is unique', 'The index was created automatically'], answer: 1, explain: 'Index-only access: values come from index entries (plus the rowid), with no lookup into the table B-tree.' },
    { q: 'An indexed predicate matches 40% of a large table with randomly ordered rows. What will a cost-based planner usually do?', options: ['Index seek — indexes are always faster', 'Full (sequential) scan — random lookups for 40% of rows cost more than reading every page once', 'Refuse to run', 'Build a hash index'], answer: 1, explain: 'Each index match costs a random page read; at high selectivity that exceeds a sequential pass over all pages. Typical crossovers are a few percent of rows for uncorrelated data.' },
    { q: 'Which join algorithm is the ONLY option for <code>ON e.ts &gt;= s.start_ts AND e.ts &lt; s.end_ts</code> in a classic engine?', options: ['Hash join', 'Merge join', 'Nested loop join', 'Any of them'], answer: 2, explain: 'Hash join needs equality; standard merge join needs an equality merge key. Only nested loop accepts arbitrary join conditions (an index on e.ts turns each probe into a range seek).' },
    { q: 'In a hash join, which input should be the build side?', options: ['The larger one, to probe less', 'The smaller one, so the hash table fits in memory', 'Always the left table in the SQL', 'It does not matter'], answer: 1, explain: 'Memory is the constraint: build on the smaller input (after filters). If the build side overflows work_mem, the join spills into batches on disk.' },
    { q: 'What is the main advantage of a merge join when both inputs come from indexes ordered by the join key?', options: ['No memory and one linear pass, with output already sorted by the key', 'It supports any join condition', 'It returns the first row before reading anything', 'It never handles duplicates'], answer: 0, explain: 'Pre-sorted inputs make the merge O(N + M) with tiny memory, and the sorted output can satisfy an ORDER BY or feed another merge join.' },
    { q: 'Without an MCV list, how would a planner estimate <code>status = \'pending\'</code> on 3,000 rows with 4 distinct statuses?', options: ['3,000 rows', '750 rows (rows ÷ distinct values)', '1 row', '0.5% of rows'], answer: 1, explain: 'Uniformity assumption: rows / NDV = 3000 / 4 = 750 — badly wrong if pending is really 60. MCV lists or histograms fix skew.' },
    { q: 'Which predicate is sargable on an index over <code>created_at</code>?', options: [`<code>date(created_at) = '2026-09-01'</code>`, `<code>created_at &gt;= '2026-09-01' AND created_at &lt; '2026-09-02'</code>`, `<code>strftime('%d', created_at) = '01'</code>`, `<code>created_at || '' = '2026-09-01'</code>`], answer: 1, explain: 'Only the bare-column range can be turned into a seek. All the others compute something from the column for every row.' },
    { q: '<code>WHERE id NOT IN (SELECT referred_by FROM customers)</code> returns 0 rows although many ids are never referenced. Why?', options: ['NOT IN is not supported in SQLite', 'referred_by contains NULL, so every NOT IN test evaluates to UNKNOWN', 'The subquery is correlated', 'An index is missing'], answer: 1, explain: 'x NOT IN (…, NULL) = … AND x &lt;&gt; NULL = UNKNOWN for every x. Use NOT EXISTS or filter NULLs out of the subquery.' },
    { q: 'Why is keyset pagination faster than <code>LIMIT 20 OFFSET 100000</code>?', options: ['It caches pages', 'OFFSET must produce and discard 100,000 rows; keyset seeks straight past the last seen key', 'Keyset uses a hash index', 'OFFSET disables indexes'], answer: 1, explain: 'OFFSET work grows with the page number; keyset (WHERE (ts, id) &lt; (:ts, :id) ORDER BY ts DESC, id DESC LIMIT 20) is O(log N + 20) on every page.' },
    { q: 'SQLite shows <code>SEARCH p USING AUTOMATIC COVERING INDEX (price_cents=?)</code>. What should you conclude?', options: ['Everything is optimal', 'SQLite built a temporary index at run time because no suitable index exists — consider creating a permanent one', 'The table is corrupted', 'Statistics are missing'], answer: 1, explain: 'Automatic indexes are SQLite\'s runtime fix for an unindexed join column (its stand-in for a hash join). If the query runs often, a real index avoids rebuilding it every time.' }
  );

  /* =====================================================================
     INTERVIEW
     ===================================================================== */
  interview.push(
    { q: 'Walk me through what happens when a SQL query is executed.', level: 'I', a: `<p><b>1. Parse:</b> the text is tokenized and checked against the grammar into a parse tree (syntax errors here). <b>2. Bind/analyze:</b> names are resolved against the catalog — tables, columns, types, permissions (unknown-column errors here). <b>3. Rewrite:</b> views are expanded, subqueries flattened, predicates pushed down, constants folded, IN/EXISTS turned into semi-joins. <b>4. Plan/optimize:</b> the cost-based optimizer enumerates access paths (scan, index seek, covering), join orders and join algorithms, estimates row counts from statistics, prices each plan in I/O + CPU units, and picks the cheapest. <b>5. Execute:</b> the plan runs as a tree of operators (Volcano iterators, bytecode in SQLite, vectorized batches in analytics engines), rows flow up to the client. Plans may be cached for prepared statements.</p>`, followUps: ['What is the difference between a logical and a physical plan?', 'Why can planning itself become expensive for 15-table joins?', 'What is a generic vs a custom plan in PostgreSQL?'] },
    { q: 'How do you approach a slow query in production?', level: 'I', a: `<p>(1) <b>Find it and quantify it</b>: pg_stat_statements / slow query log / Query Store — total time, calls, mean, rows. (2) <b>Get the real plan</b>: <code>EXPLAIN (ANALYZE, BUFFERS)</code> on a replica or with ROLLBACK for writes. (3) <b>Read it inside-out</b>: the node with the most self-time; estimate vs actual rows (≥10× off = statistics, correlation, functions, or parameters); Seq Scans with big "Rows Removed by Filter"; sorts/hashes spilling to disk; inner nodes with huge <code>loops</code>. (4) <b>Fix the cause, cheapest first</b>: refresh stats, make predicates sargable, rewrite the shape (semi-join, keyset, pre-aggregate), add/adjust an index (composite, covering, partial), tune work_mem for that query. (5) <b>Verify</b> with the same EXPLAIN ANALYZE and same data; check write overhead of new indexes; monitor after deploy.</p>`, followUps: ['What would you do if the slow query only happens for one customer?', 'How do you test an index without creating it? (hypopg)'] },
    { q: 'Explain nested loop, hash join and merge join. When does each win?', level: 'I', a: `<p><b>Nested loop</b>: for each outer row, find matching inner rows — plain O(N·M), or O(N·log M) with an index on the inner key. Wins for small outer inputs with an indexed inner side (OLTP lookups), LIMIT queries (first row immediately) and non-equality joins (the only algorithm that supports them). <b>Hash join</b>: build a hash table on the smaller input, stream the larger one and probe — O(N + M), equality only, needs memory (spills into batches beyond work_mem), no output until the build finishes. Wins for big unsorted inputs (reports, ETL). <b>Merge join</b>: both inputs sorted by the key, two pointers walk forward (rewinding on duplicate runs) — O(N + M) after sorting, tiny memory, sorted output. Wins when inputs are already sorted (index order) or huge and memory is tight, and for FULL OUTER joins.</p>`, followUps: ['What happens when the hash table doesn\'t fit in memory?', 'Which of these does SQLite implement?', 'Why does a bad row estimate hurt nested loops more than hash joins?'] },
    { q: 'What does "sargable" mean? Give examples of non-sargable predicates and how to fix them.', level: 'B', a: `<p>A predicate is <b>sargable</b> (Search-ARGument-able) when the engine can turn it into an index seek range: the bare indexed column compared with a value via <code>= &lt; &gt; BETWEEN IN</code>, <code>IS NULL</code>, or <code>LIKE 'prefix%'</code>. Non-sargable examples: <code>YEAR(created_at) = 2025</code> → <code>created_at &gt;= '2025-01-01' AND created_at &lt; '2026-01-01'</code>; <code>price * 1.18 &gt; 100</code> → move math to the constant (carefully); <code>lower(email) = ?</code> → expression index or normalized storage; <code>LIKE '%gmail.com'</code> → reversed column, trigram or full-text index; <code>COALESCE(x, 0) = 0</code> → <code>(x = 0 OR x IS NULL)</code>; VARCHAR column compared to a number → pass a string. Always verify the rewrite returns the same rows (integer division, NULLs, time zones) and that EXPLAIN now shows a seek.</p>`, followUps: ['Is <code>WHERE col IN (1, 2, 3)</code> sargable?', 'Why is LIKE \'abc%\' sometimes not sargable?'] },
    { q: 'Why would the optimizer ignore an index that exists on the filtered column?', level: 'I', a: `<p>Several legitimate and illegitimate reasons: (1) <b>low selectivity</b> — the predicate matches a large fraction of rows, so random lookups cost more than a sequential scan; (2) <b>tiny table</b> — a few pages are cheaper to scan; (3) the predicate is <b>non-sargable</b> (function, arithmetic, implicit cast, collation mismatch, leading wildcard); (4) the column is not the <b>leading</b> column of a composite index (left-prefix rule, unless skip scan applies); (5) <b>bad statistics</b> make it overestimate the rows; (6) <code>OR</code> across columns without index merge; (7) parameter type mismatch or generic plans; (8) the index is invalid/unusable (e.g. a failed CONCURRENTLY build in PG). Diagnose with EXPLAIN, compare estimate vs actual, and test with the scan disabled (<code>enable_seqscan = off</code>) only as an experiment.</p>`, followUps: ['How does physical correlation of the table change the decision?', 'What is an index skip scan?'] },
    { q: 'How does the planner estimate how many rows a WHERE clause returns?', level: 'A', a: `<p>From <b>statistics</b> gathered by ANALYZE (usually on a sample): row count and pages; per column the null fraction, number of distinct values (NDV), a <b>most-common-values</b> list with frequencies, an <b>equi-depth histogram</b> of the rest, and physical correlation. Equality uses the MCV frequency or (1 − ΣMCV)/(NDV − #MCV); ranges interpolate within histogram buckets; AND multiplies selectivities (independence assumption); OR uses s1 + s2 − s1·s2; equi-joins use |R|·|S| / max(NDV). Expressions without stats get default guesses (PostgreSQL: 0.5% for =, 33% for ranges). Errors come from stale stats, skew hidden by averages, correlated columns, out-of-range values for ever-growing keys, and parameters. Fixes: ANALYZE more often, bigger statistics targets, extended statistics (CREATE STATISTICS), expression indexes/stats.</p>`, followUps: ['What is the ascending-key problem?', 'How do extended statistics help with city + state predicates?'] },
    { q: 'What is a covering index and what are its trade-offs?', level: 'I', a: `<p>An index is <b>covering</b> for a query when it contains every column the query reads (WHERE, JOIN, ORDER BY, SELECT), so the engine answers from the index alone — SQLite "USING COVERING INDEX", PostgreSQL "Index Only Scan", MySQL "Using index". It removes one random table lookup per row and can also remove sorts if the key order matches ORDER BY. Design order: equality columns, then the range/ORDER BY column, then passenger columns (or <code>INCLUDE (…)</code> in PostgreSQL/SQL Server to keep them out of the key). Costs: bigger index (more RAM/disk), slower inserts/updates of those columns, more WAL; in PostgreSQL index-only scans still visit the heap for pages not marked all-visible, so VACUUM matters (watch "Heap Fetches").</p>`, followUps: ['Why does InnoDB make every secondary index "partially covering" for the primary key?', 'When would you NOT add a covering index?'] },
    { q: 'Your OFFSET-based pagination is slow on deep pages. What do you do?', level: 'I', a: `<p>OFFSET N forces the engine to produce and discard N rows, so cost grows linearly with page depth (quadratically to scroll everything), and inserts between requests shift pages (duplicates/skips). Switch to <b>keyset (seek) pagination</b>: order by a unique key (e.g. <code>created_at DESC, id DESC</code>), have the client send back the last row's keys, and query <code>WHERE (created_at, id) &lt; (:ts, :id) ORDER BY created_at DESC, id DESC LIMIT 20</code> with an index on <code>(created_at, id)</code>. Each page is O(log N + 20). Trade-offs: no random "jump to page 37" (use next/prev, or approximate jumps via date filters), the sort key must be unique, and filters must be part of the index design. Expose it as an opaque cursor in the API.</p>`, followUps: ['How do you implement "previous page"?', 'What if the sort column is nullable?'] },
    { q: 'IN vs EXISTS vs JOIN for "customers who placed an order" — which is fastest?', level: 'A', a: `<p>Semantically, IN (subquery) and EXISTS are <b>semi-joins</b> (each customer once); a plain JOIN fans out (one row per order) and needs DISTINCT, which is extra work and a common bug. Mature planners (PostgreSQL, SQL Server, Oracle, MySQL 8.0.16+) convert IN and EXISTS to the same semi-join plan (hash/merge/nested-loop semi join), so they usually perform identically. Differences appear in engines that don't decorrelate: SQLite evaluates <code>IN (subquery)</code> once into a list but runs EXISTS as a correlated subquery per outer row — in this module's measurements IN was ~3× faster than EXISTS. For negation the answer is different: NOT IN with a nullable column is <b>wrong</b>, so use NOT EXISTS (anti-join). Always confirm with EXPLAIN on your engine.</p>`, followUps: ['When is a JOIN + DISTINCT actually fine?', 'How does PostgreSQL plan NOT EXISTS?'] },
    { q: 'What causes a query plan to change suddenly in production ("plan flip"), and how do you protect against it?', level: 'A', a: `<p>Causes: <b>statistics changed</b> (auto-analyze after data growth, a new MCV appears, stats sampled differently), <b>data distribution</b> crossed a cost crossover, a <b>parameter</b> value led to a different cached plan (SQL Server parameter sniffing, PostgreSQL switching from custom to generic plans after 5 runs), <b>config</b> changes (work_mem, random_page_cost), an <b>index</b> added/dropped/invalid, or a <b>version upgrade</b> with a new optimizer. Protection: monitor plans (auto_explain, Query Store, pg_stat_statements with plan IDs), keep statistics healthy (and extended stats for correlated columns), use plan_cache_mode / OPTION(RECOMPILE) for skew-sensitive queries, pin known-good plans where the engine supports it (Query Store forcing, pg_hint_plan, Oracle SQL plan baselines) as a last resort, and load-test upgrades with production query samples.</p>`, followUps: ['What is parameter sniffing?', 'Why are plan hints considered technical debt?'] },
    { q: 'How would you design indexes for <code>WHERE tenant_id = ? AND status = ? AND created_at &gt;= ? ORDER BY created_at DESC LIMIT 50</code>?', level: 'A', a: `<p>Put <b>equality columns first</b>, then the <b>range/sort column</b>: <code>(tenant_id, status, created_at)</code>. The engine seeks to (tenant, status), walks backwards over created_at from the newest entry, stops after 50 — no sort, cost independent of how many rows the tenant has. Add <code>INCLUDE</code>/passenger columns for the SELECT list if you want an index-only scan and the row is narrow. If <code>status</code> often uses IN lists or is optional, consider <code>(tenant_id, created_at)</code> plus a filter, or a partial index per hot status (<code>WHERE status = 'open'</code>). Check selectivity: if one tenant owns 90% of rows, its queries might still prefer a different plan — test with that tenant. Finally weigh write cost: each additional index slows inserts and updates on these columns.</p>`, followUps: ['What if the query has <code>status IN (\'open\', \'pending\')</code>?', 'When would a partial index be better?'] },
    { q: 'How do AI tools change query optimization work, and where do you still need to be careful?', level: 'E', a: `<p>AI assistants and built-in "AI tuning" features can summarize huge plans, flag estimate-vs-actual gaps, suggest indexes from slow-query logs, and propose rewrites (semi-joins, keyset pagination, window functions) in seconds; cloud databases increasingly auto-create indexes and statistics. That speeds up the <i>search</i> for fixes. But the model can't see your data distribution, cache state, write rate or engine version: it confuses per-loop with total numbers, suggests indexes on columns wrapped in functions, proposes non-equivalent rewrites (NOT IN ↔ NOT EXISTS with NULLs, integer division), assumes features your engine lacks (hash joins in SQLite), or adds hints that freeze plans. The workflow that works: let AI generate hypotheses and candidates, then make the database the judge — EXPLAIN (ANALYZE, BUFFERS), equivalence checks with EXCEPT both ways, hypothetical indexes, and load tests.</p>`, followUps: ['How would you review an AI-suggested index before creating it?', 'What would you put in a prompt to get a useful plan analysis?'] },
    { q: 'What is the N+1 query problem and how do you detect and fix it?', level: 'B', a: `<p>N+1 happens when code loads a list with one query and then issues one more query per item (typically lazy-loaded ORM relations): 1 query for 100 orders + 100 queries for their customers. Each query is fast, but round-trip latency (often 0.5–2 ms each) and per-query overhead add up, and it scales with page size. <b>Detect</b>: count queries per request in logs, APM traces (repeated identical statements with different parameters), Django Debug Toolbar, Hibernate statistics, or pg_stat_statements showing very high call counts. <b>Fix</b>: one JOIN, or a second batched query with <code>WHERE id IN (…)</code>; in ORMs use eager loading (select_related/prefetch_related, joinedload/selectinload, JOIN FETCH, include) or a DataLoader in GraphQL. Make sure the batched query uses an index on the IN column.</p>`, followUps: ['JOIN vs separate IN query for eager loading — trade-offs?', 'How does GraphQL\'s DataLoader batch requests?'] }
  );

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
