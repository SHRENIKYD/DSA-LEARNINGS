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
          var op = m[1], v = Number(m[2]), data = HIST_DATA.slice(), N = data.length, frames = [];
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
            why.push('MCV part: does 5 satisfy "x ' + op + ' ' + v + '"? ' + (test(5) ? 'yes → +0.25' : 'no → +0'));
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
          frames.push({ narr: 'Step 3 — <b>estimate</b> <code>x ' + op + ' ' + v + '</code> using only the summary: MCV part + histogram part.', parts: [{ type: 'text', label: 'selectivity math', html: '<ul><li>' + why.join('</li><li>') + '</li></ul>' }, { type: 'vars', vals: { selectivity: sel.toFixed(3), 'estimated rows': est.toFixed(1) }, hl: { 'estimated rows': 'cur' } }] });
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
          var frames = [], delhi = 38, perCust = 10;
          var costA = delhi + delhi * perCust;      // city index entries + orders of those customers, checked for status
          var costB = P + P;                        // pending index entries + one PK lookup each
          var estB = 750 + 750;
          var qg = function (hl, ehl, tags) { return { type: 'graph', label: 'two candidate plans', directed: true, height: 50, nodes: [{ id: 'C', label: 'customers via city', x: 14, y: 12, shape: 'box' }, { id: 'O', label: 'orders via customer_id', x: 50, y: 12, shape: 'box' }, { id: 'O2', label: 'orders via status', x: 14, y: 38, shape: 'box' }, { id: 'C2', label: 'customers via PK', x: 50, y: 38, shape: 'box' }, { id: 'R', label: 'result', x: 86, y: 25, shape: 'box' }], edges: [['C', 'O', 'A'], ['O', 'R'], ['O2', 'C2', 'B'], ['C2', 'R']], hl: hl || {}, ehl: ehl || {}, tags: tags || {} }; };
          frames.push({ narr: 'Query: Delhi customers\' <b>pending</b> orders. Two sensible plans: <b>A</b> start from the 38 Delhi customers, then read their orders and keep pending ones; <b>B</b> start from pending orders, then look up each customer and keep Delhi ones.', parts: [qg(), { type: 'code', label: 'query', lang: 'sql', code: "SELECT c.name, o.id\nFROM customers c JOIN orders o ON o.customer_id = c.id\nWHERE c.city = 'Delhi' AND o.status = 'pending';" }] });
          frames.push({ narr: 'After <code>ANALYZE</code>, SQLite\'s <code>sqlite_stat1</code> says status has ~<b>750 rows per value</b> (3000 ÷ 4). It has no idea that "pending" is rare — it only stores averages.', parts: [{ type: 'table', label: 'sqlite_stat1 (excerpt)', columns: ['idx', 'stat', 'meaning'], rows: [['idx_orders_status_created', '3000 750 1', '~750 rows per status'], ['idx_orders_customer', '3000 10', '~10 orders per customer'], ['idx_customers_city', '320 40', '~40 customers per city']], hl: { 0: 'bad' } }] });
          frames.push({ narr: 'Planner\'s <b>estimate</b>: plan A ≈ 40 + 40×10 = ' + (40 + 400) + ' row touches; plan B ≈ 750 + 750 = ' + estB + '. It picks <b>A</b>.', parts: [qg({ C: 'ok', O: 'ok', O2: 'bad', C2: 'bad' }, { 'C-O': 'ok' }, { C: 'chosen' }), { type: 'bars', label: 'ESTIMATED work', values: [440, estB], idxLabels: ['plan A', 'plan B'], hl: { 0: 'ok' } }] });
          var winner = costA <= costB ? 'A' : 'B';
          frames.push({ narr: '<b>Reality</b> with ' + P + ' pending orders: plan A really costs ' + delhi + ' + ' + (delhi * perCust) + ' = ' + costA + '; plan B would cost ' + P + ' + ' + P + ' = ' + costB + '. ' + (winner === 'B' ? H.c('r', 'The planner chose the slower plan — ' + (costA / costB).toFixed(1) + '× more work — because the average (750) hid the skew.') : H.c('g', 'Here the average was close enough; plan A really is best.')), parts: [qg({ C: winner === 'A' ? 'ok' : 'bad', O2: winner === 'B' ? 'ok' : 'cur' }), { type: 'bars', label: 'ACTUAL work', values: [costA, costB], idxLabels: ['plan A (chosen)', 'plan B'], hl: winner === 'B' ? { 1: 'ok', 0: 'bad' } : { 0: 'ok' } }] });
          frames.push({ narr: 'Crossover: plan B wins whenever pending &lt; ' + Math.floor(costA / 2) + ' rows. At 3,000,000 orders with 0.1% pending, the gap becomes thousands of times. Fixes, from best to last resort: (1) stats that see skew — PostgreSQL MCV lists, SQLite <code>sqlite_stat4</code> builds, MySQL histograms; (2) a <b>partial index</b> <code>ON orders(…) WHERE status = \'pending\'</code> (its own stats say "60 rows"); (3) SQLite <code>likelihood(o.status = \'pending\', 0.02)</code>; (4) hints / plan forcing.', parts: [{ type: 'bars', label: 'actual work as pending count grows', values: [costA, 2 * 60, 2 * 209, 2 * 750], idxLabels: ['plan A (any)', 'B @60', 'B @209', 'B @750'], hl: { 1: 'ok', 3: 'bad' } }] });
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
        statement: `<p>After someone ran <code>ANALYZE</code>, the "Delhi pending orders" query starts from the 38 Delhi customers and reads ~380 of their orders to find the 20 pending ones, instead of starting from the 60 pending orders. Explain <b>why</b> the statistics misled the planner, and give a fix that makes the planner choose the "pending first" plan <b>while statistics stay enabled</b>.</p><pre>SELECT c.name, o.id, o.total_cents
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
        solution: {
          approach: `<p>SQLite's default statistics are <b>averages</b>, so every status looks like 750 rows. Creating a <b>partial index</b> that contains only pending orders gives the planner a second, precise statistic: after <code>ANALYZE</code>, <code>sqlite_stat1</code> has a row <code>idx_orders_pending | 60 1</code>. Knowing pending is rare, the planner now starts from pending orders and does 60 primary-key lookups into customers. Bonus: the partial index is tiny (60 entries) and is also the fastest way to drive "pending orders" queue screens. Query-level alternative: <code>likelihood(o.status = 'pending', 0.02)</code>. In PostgreSQL neither is needed — its MCV list already records that pending ≈ 2%.</p>`,
          code: { lang: 'sql', db: 'shop', code: `CREATE INDEX idx_orders_pending ON orders(customer_id) WHERE status = 'pending';
ANALYZE;
SELECT idx, stat FROM sqlite_stat1 WHERE tbl = 'orders' ORDER BY idx;   -- idx_orders_pending | 60 1

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
          complexity: `<p>Customers-first: 38 index entries + ~380 order rows read and filtered. Pending-first: 60 index entries + 60 PK lookups ≈ 120 row touches → ~3.5× less work here, and the gap grows with table size (0.1% pending of 3M orders → ~6,000 vs ~38,000+ touches per city).</p>`,
          followUps: ['How would PostgreSQL estimate <code>status = \'pending\'</code> on the same data?', 'What breaks if "pending" suddenly becomes 50% of rows during an outage, for each fix?']
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
