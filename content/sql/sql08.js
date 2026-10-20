(function () {
  var topics = [], practice = [], quiz = [], interview = [];

  /* =====================================================================
     Sample databases (SQLite dialect) used by the ▶ Run buttons
     ===================================================================== */
  // messy: one wide "spreadsheet" table that stores customers, products and orders together.
  var DB_MESSY = `CREATE TABLE orders_flat (
  order_id       INTEGER NOT NULL,
  order_date     TEXT    NOT NULL,
  customer_email TEXT    NOT NULL,
  customer_name  TEXT    NOT NULL,
  customer_city  TEXT    NOT NULL,
  product_sku    TEXT    NOT NULL,
  product_name   TEXT    NOT NULL,
  unit_price     INTEGER NOT NULL,
  qty            INTEGER NOT NULL,
  PRIMARY KEY (order_id, product_sku)
);
INSERT INTO orders_flat VALUES
  (101, '2026-03-01', 'asha@mail.com', 'Asha', 'Pune',   'P-LAMP',  'Desk Lamp',  1200, 1),
  (101, '2026-03-01', 'asha@mail.com', 'Asha', 'Pune',   'P-MUG',   'Coffee Mug',  300, 2),
  (102, '2026-03-02', 'ben@mail.com',  'Ben',  'Delhi',  'P-MUG',   'Coffee Mug',  300, 4),
  (103, '2026-03-05', 'asha@mail.com', 'Asha', 'Pune',   'P-PEN',   'Gel Pen',      50, 10),
  (104, '2026-03-07', 'chen@mail.com', 'Chen', 'Mumbai', 'P-CHAIR', 'Ergo Chair', 9000, 1),
  (105, '2026-03-09', 'ben@mail.com',  'Ben',  'Delhi',  'P-LAMP',  'Desk Lamp',  1200, 2);
CREATE TABLE emp_flat (
  emp_id     INTEGER PRIMARY KEY,
  emp_name   TEXT NOT NULL,
  dept_id    TEXT NOT NULL,
  dept_name  TEXT NOT NULL,
  dept_floor INTEGER NOT NULL
);
INSERT INTO emp_flat VALUES
  (1, 'Asha', 'D1', 'Sales', 3),
  (2, 'Ben',  'D1', 'Sales', 3),
  (3, 'Chen', 'D2', 'Engineering', 5),
  (4, 'Dara', 'D2', 'Engineering', 5),
  (5, 'Eli',  'D3', 'Legal', 7);`;

  // star: a tiny data-warehouse star schema (one fact table + three dimensions).
  var DB_STAR = `CREATE TABLE dim_date (
  date_key   INTEGER PRIMARY KEY,   -- smart key yyyymmdd
  full_date  TEXT NOT NULL,
  month_name TEXT NOT NULL,
  quarter    TEXT NOT NULL,
  year       INTEGER NOT NULL,
  is_weekend INTEGER NOT NULL CHECK (is_weekend IN (0, 1))
);
CREATE TABLE dim_product (
  product_key INTEGER PRIMARY KEY,  -- surrogate key
  sku         TEXT NOT NULL,
  name        TEXT NOT NULL,
  category    TEXT NOT NULL,        -- denormalized on purpose (no category table)
  brand       TEXT NOT NULL
);
CREATE TABLE dim_store (
  store_key INTEGER PRIMARY KEY,
  name      TEXT NOT NULL,
  city      TEXT NOT NULL,
  region    TEXT NOT NULL           -- city -> region kept in the same row on purpose
);
CREATE TABLE fact_sales (
  date_key    INTEGER NOT NULL REFERENCES dim_date(date_key),
  product_key INTEGER NOT NULL REFERENCES dim_product(product_key),
  store_key   INTEGER NOT NULL REFERENCES dim_store(store_key),
  qty         INTEGER NOT NULL,
  revenue     INTEGER NOT NULL      -- measure, in rupees
);
INSERT INTO dim_date VALUES
  (20260105, '2026-01-05', 'Jan', 'Q1', 2026, 0),
  (20260110, '2026-01-10', 'Jan', 'Q1', 2026, 1),
  (20260214, '2026-02-14', 'Feb', 'Q1', 2026, 1),
  (20260403, '2026-04-03', 'Apr', 'Q2', 2026, 0);
INSERT INTO dim_product VALUES
  (1, 'P-LAMP',  'Desk Lamp',  'Home',       'Lumo'),
  (2, 'P-MUG',   'Coffee Mug', 'Kitchen',    'Brewly'),
  (3, 'P-CHAIR', 'Ergo Chair', 'Furniture',  'Sitwell'),
  (4, 'P-PEN',   'Gel Pen',    'Stationery', 'Inkit');
INSERT INTO dim_store VALUES
  (1, 'MG Road',   'Bengaluru', 'South'),
  (2, 'Koregaon',  'Pune',      'West'),
  (3, 'Connaught', 'Delhi',     'North');
INSERT INTO fact_sales VALUES
  (20260105, 1, 1, 2, 2400), (20260105, 2, 2, 5, 1500), (20260110, 3, 1, 1, 9000),
  (20260110, 2, 3, 3,  900), (20260214, 1, 2, 1, 1200), (20260214, 4, 3, 40, 2000),
  (20260214, 3, 3, 2, 18000), (20260403, 2, 1, 6, 1800), (20260403, 1, 3, 3, 3600),
  (20260403, 4, 2, 25, 1250);`;

  /* =====================================================================
     A tiny functional-dependency engine shared by the visualizers.
     Input styles accepted:
       letters  : "AB->C; C->D"            (every capital letter = one attribute)
       words    : "order_id, sku -> qty"   (names separated by spaces/commas)
     ===================================================================== */
  function uniq(a) { var o = []; a.forEach(function (x) { if (o.indexOf(x) < 0) o.push(x); }); return o; }
  function has(a, x) { return a.indexOf(x) >= 0; }
  function subset(a, b) { return a.every(function (x) { return b.indexOf(x) >= 0; }); }
  function minus(a, b) { return a.filter(function (x) { return b.indexOf(x) < 0; }); }
  function inter(a, b) { return a.filter(function (x) { return b.indexOf(x) >= 0; }); }
  function sameSet(a, b) { return a.length === b.length && subset(a, b); }
  function rnd(x) { return Math.round(x * 10) / 10; }
  function fmt(a, L) { return a.length ? (L ? a.join('') : (a.length > 1 ? '{' + a.join(', ') + '}' : a[0])) : '∅'; }
  function fdStr(f, L) { return fmt(f.l, L) + ' → ' + fmt(f.r, L); }
  function isLetters(txt) { return !/[a-z0-9_]/.test(txt.replace(/->|→/g, '')); }
  function toks(side, L) {
    if (L) return uniq(side.replace(/[^A-Z]/g, '').split('').filter(Boolean));
    var t = side.split(/[\s,]+/).filter(Boolean);
    t.forEach(function (w) { if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(w)) throw new Error('Bad attribute name "' + w + '" — use letters, digits and _'); });
    return uniq(t);
  }
  function parseFDList(txt, L) {
    var fds = [];
    txt.split(/[;\n]+/).forEach(function (part) {
      part = part.trim();
      if (!part) return;
      var m = part.split(/->|→/);
      if (m.length !== 2) throw new Error('Each FD needs exactly one arrow, e.g. A B -> C (problem near "' + part + '")');
      var l = toks(m[0], L), r = toks(m[1], L);
      if (!l.length || !r.length) throw new Error('Both sides of "' + part + '" need at least one attribute');
      fds.push({ l: l, r: r });
    });
    if (!fds.length) throw new Error('Give at least one FD like A->B');
    if (fds.length > 12) throw new Error('Use at most 12 FDs');
    return fds;
  }
  // fdsFirst=true  : "FDs | start-set"   (closure calculator)
  // fdsFirst=false : "attributes | FDs"  (keys, BCNF, 3NF)
  function parseSpec(input, fdsFirst) {
    var txt = String(input === undefined ? '' : input).trim();
    var bits = txt.split('|');
    if (bits.length !== 2) throw new Error(fdsFirst ? 'Format: FDs | start attributes — e.g.  A->B; B->C | A' : 'Format: attributes | FDs — e.g.  A B C D | A->B; B->C');
    var L = isLetters(txt);
    var fdTxt = fdsFirst ? bits[0] : bits[1], setTxt = fdsFirst ? bits[1] : bits[0];
    var fds = parseFDList(fdTxt, L), set = toks(setTxt, L);
    if (!set.length) throw new Error('The attribute list after/before "|" is empty');
    var attrs = fdsFirst ? [] : set.slice();
    fds.forEach(function (f) {
      f.l.concat(f.r).forEach(function (a) {
        if (!has(attrs, a)) {
          if (fdsFirst) attrs.push(a);
          else throw new Error('An FD uses "' + a + '" which is not in the attribute list');
        }
      });
    });
    if (fdsFirst) set.forEach(function (a) { if (!has(attrs, a)) attrs.push(a); });
    if (fdsFirst && L) attrs.sort();
    if (attrs.length > 9) throw new Error('Use at most 9 attributes so the animation stays readable');
    var ord = function (a) { return a.slice().sort(function (x, y) { return attrs.indexOf(x) - attrs.indexOf(y); }); };
    fds.forEach(function (f) { f.l = ord(f.l); f.r = ord(f.r); });
    return { L: L, attrs: attrs, fds: fds, set: ord(set), ord: ord };
  }
  // Attribute closure X+ : keep firing FDs whose left side is already inside the set.
  function closure(X, fds, ord) {
    var res = X.slice(), steps = [], changed = true;
    while (changed) {
      changed = false;
      fds.forEach(function (f, i) {
        if (subset(f.l, res)) {
          var add = minus(f.r, res);
          if (add.length) { res = res.concat(add); changed = true; steps.push({ i: i, add: add, res: ord ? ord(res) : res.slice() }); }
        }
      });
    }
    return { res: ord ? ord(res) : res, steps: steps };
  }
  function maskToSet(attrs, m) { return attrs.filter(function (_, i) { return m & (1 << i); }); }
  function popcount(m) { var c = 0; while (m) { c += m & 1; m >>= 1; } return c; }
  // Every candidate key of relation R (attrs) under fds (brute force over subsets — fine for <= 9 attributes).
  function keysOf(R, fds) {
    var n = R.length, supers = [], keys = [];
    for (var m = 1; m < (1 << n); m++) if (subset(R, closure(maskToSet(R, m), fds).res)) supers.push(m);
    supers.forEach(function (m) { if (!supers.some(function (s) { return s !== m && (s & m) === s; })) keys.push(m); });
    keys.sort(function (a, b) { return popcount(a) - popcount(b) || a - b; });
    return keys.map(function (m) { return maskToSet(R, m); });
  }
  // Graph part: attributes as boxes on an ellipse; a composite left side gets a small "junction" box.
  function fdGraph(attrs, fds, L, o) {
    o = o || {};
    var HT = 64, n = attrs.length, nodes = [], edges = [], hl = {}, ehl = {}, tags = {}, pos = {}, groups = {}, gi = 0;
    attrs.forEach(function (a, i) {
      var ang = -Math.PI / 2 + 2 * Math.PI * i / n;
      var x = 50 + 40 * Math.cos(ang), y = HT / 2 + (HT / 2 - 7) * Math.sin(ang);
      pos[a] = [x, y];
      nodes.push({ id: 'a_' + a, label: a, x: rnd(x), y: rnd(y), shape: 'box' });
      if (o.attrHl && o.attrHl[a]) hl['a_' + a] = o.attrHl[a];
      if (o.attrTags && o.attrTags[a]) tags['a_' + a] = o.attrTags[a];
    });
    fds.forEach(function (f, i) {
      var cls = o.fdHl ? o.fdHl[i] : undefined, rhs = minus(f.r, f.l), src;
      if (f.l.length === 1) src = 'a_' + f.l[0];
      else {
        var key = f.l.join('+');
        if (!groups[key]) {
          var cx = 0, cy = 0;
          f.l.forEach(function (a) { cx += pos[a][0]; cy += pos[a][1]; });
          cx = cx / f.l.length; cy = cy / f.l.length;
          gi++;
          groups[key] = 'j' + gi;
          var lab = L ? f.l.join('') : (key.length <= 14 ? key : 'key#' + gi);
          nodes.push({ id: 'j' + gi, label: lab, x: rnd(cx * 0.45 + 50 * 0.55), y: rnd(cy * 0.45 + (HT / 2) * 0.55), shape: 'box' });
          f.l.forEach(function (a) { edges.push(['a_' + a, 'j' + gi]); });
        }
        src = groups[key];
        if (cls) { hl[src] = cls; f.l.forEach(function (a) { ehl['a_' + a + '-' + src] = cls; }); }
      }
      rhs.forEach(function (r) { edges.push([src, 'a_' + r]); if (cls) ehl[src + '-a_' + r] = cls; });
    });
    return { type: 'graph', label: o.label || 'Functional dependencies (arrow = "determines")', directed: true, height: HT, nodes: nodes, edges: edges, hl: hl, ehl: ehl, tags: tags };
  }
  function fdTable(fds, L, hlMap, label) {
    return { type: 'table', label: label || 'FD list', columns: ['#', 'left side (determinant)', '→', 'right side'], rows: fds.map(function (f, i) { return ['fd' + (i + 1), fmt(f.l, L), '→', fmt(f.r, L)]; }), hl: hlMap || {} };
  }
  // Smallest left side X inside R whose closure (restricted to R) adds something but does not cover R → BCNF violation.
  function bcnfViolation(R, fds) {
    var n = R.length, best = null;
    for (var m = 1; m < (1 << n) - 1; m++) {
      var X = maskToSet(R, m), c = inter(closure(X, fds).res, R);
      if (c.length > X.length && c.length < n && (!best || X.length < best.X.length)) best = { X: X, Y: minus(c, X), c: c };
    }
    return best;
  }
  // Minimal (canonical) cover with a human-readable log.
  function minimalCover(fds, L) {
    var F = [], log = [];
    fds.forEach(function (f) { f.r.forEach(function (r) { if (!has(f.l, r) && !F.some(function (g) { return sameSet(g.l, f.l) && g.r[0] === r; })) F.push({ l: f.l.slice(), r: [r] }); }); });
    log.push({ what: 'Split every right side into single attributes (and drop trivial ones).', F: F.map(function (f) { return { l: f.l.slice(), r: f.r.slice() }; }) });
    F.forEach(function (f) {
      f.l.slice().forEach(function (a) {
        if (f.l.length < 2) return;
        var l2 = minus(f.l, [a]);
        if (has(closure(l2, F).res, f.r[0])) { log.push({ what: 'In ' + fdStr(f, L) + ' the attribute ' + a + ' is extraneous: ' + fmt(l2, L) + '+ already contains ' + f.r[0] + '.', F: null }); f.l = l2; }
      });
    });
    for (var i = F.length - 1; i >= 0; i--) {
      var dupe = F.some(function (g, j) { return j < i && sameSet(g.l, F[i].l) && g.r[0] === F[i].r[0]; });
      var rest = F.filter(function (_, j) { return j !== i; });
      if (dupe || has(closure(F[i].l, rest).res, F[i].r[0])) { log.push({ what: 'Drop ' + fdStr(F[i], L) + ': the other FDs already imply it.', F: null }); F.splice(i, 1); }
    }
    return { F: F, log: log };
  }

  /* =====================================================================
     TOPIC 1 — Anomalies: why one big table breaks
     ===================================================================== */
  topics.push({
    title: 'Anomalies: Why One Big Table Breaks',
    analogy: `<p>Picture a school notebook where, on <b>every</b> line about a student's homework, someone also writes the class teacher's phone number. 200 lines, 200 copies of the same number. Now the teacher gets a new phone. You must fix all 200 lines — miss one and the notebook has <b>two different "truths"</b>. You also can't write down a new teacher's number until some student hands in homework, and if the last student's line is erased, the teacher's number disappears with it. That notebook is an <b>un-normalized table</b>, and those three headaches are the three <b>anomalies</b>.</p>`,
    explain: `<p><b>🟢 The plain idea.</b> A table should store facts about <b>one kind of thing</b>. When a single table mixes facts about customers, products and orders, the same fact (Asha lives in Pune, a Desk Lamp costs ₹1200) gets copied into many rows. Copies are called <b>redundancy</b>, and redundancy causes three classic bugs called <b>anomalies</b>:</p>
<ul>
<li><b>Update anomaly</b> — a fact lives in many rows, so changing it means changing all of them. Miss one and the data <span class="c-r">contradicts itself</span>.</li>
<li><b>Insert anomaly</b> — you <span class="c-r">cannot record a fact</span> until some unrelated fact exists. You can't add a new product to the catalogue until somebody orders it, because every row needs an order id.</li>
<li><b>Delete anomaly</b> — deleting one fact <span class="c-r">accidentally deletes another</span>. Cancel Chen's only order and you also lose the only record that the Ergo Chair costs ₹9000.</li>
</ul>
<p>Here is the "spreadsheet" table we will keep fixing throughout this module:</p>
${H.table(['order_id', 'customer', 'city', 'sku', 'product', 'price', 'qty'], [
  ['101', H.c('y', 'Asha'), H.c('y', 'Pune'), 'P-LAMP', H.c('b', 'Desk Lamp'), H.c('b', '1200'), '1'],
  ['101', H.c('y', 'Asha'), H.c('y', 'Pune'), 'P-MUG', 'Coffee Mug', '300', '2'],
  ['102', 'Ben', 'Delhi', 'P-MUG', 'Coffee Mug', '300', '4'],
  ['103', H.c('y', 'Asha'), H.c('y', 'Pune'), 'P-PEN', 'Gel Pen', '50', '10'],
  ['104', 'Chen', 'Mumbai', 'P-CHAIR', 'Ergo Chair', '9000', '1'],
  ['105', 'Ben', 'Delhi', 'P-LAMP', H.c('b', 'Desk Lamp'), H.c('b', '1200'), '2']])}
<p>Amber cells: "Asha lives in Pune" is stored <b>3 times</b>. Blue cells: "Desk Lamp costs 1200" is stored <b>twice</b>. Every copy is a place where a future bug can hide.</p>
<p><b>🔵 How it really works.</b> The cure is <b>normalization</b>: split the table so that <b>each fact is stored exactly once</b> and tables are linked by keys. The split for our table is:</p>
${H.table(['table', 'stores facts about', 'key'], [['customers', 'who the customer is, where they live', 'email'], ['products', 'what a product is, what it costs', 'sku'], ['orders', 'who placed which order, when', 'order_id'], ['order_items', 'how many of which product in which order', '(order_id, sku)']])}
<p>After the split, Asha moving to Mumbai is a <b>one-row</b> update, a new product is a <b>one-row</b> insert, and deleting an order cannot touch the catalogue. The rest of the module gives you the exact rules (functional dependencies and normal forms) that tell you <b>where</b> to cut — so you are not guessing.</p>
<p><b>Important nuance:</b> not every repeated value is redundancy. The value <code>101</code> repeating in two order-item rows is a <b>foreign-key reference</b>, not a copied fact — it is how tables link. Redundancy means the same <b>fact</b> (a dependency like "email → city") is written down more than once.</p>`,
    clues: [
      '"The same value is repeated in many rows" or a CSV/spreadsheet imported straight into one table',
      '"We updated the customer address, but old screens still show the old one" → update anomaly',
      '"We can\'t add a new course / product / department until someone enrolls / orders / joins" → insert anomaly',
      '"Deleting the last order also lost the product price" → delete anomaly',
      '"Why do we normalize?" / "What problems does redundancy cause?" — answer with the three anomalies plus a concrete row example',
      'Data-quality bug reports like "two different cities for the same customer" — a missing table split, not a code bug'
    ],
    code: [{ lang: 'sql', db: 'messy', title: 'Update anomaly: the database starts disagreeing with itself', code: `-- Asha moves to Mumbai, but the app only updates the row it happened to be looking at
UPDATE orders_flat
SET    customer_city = 'Mumbai'
WHERE  order_id = 103;            -- her other two rows (order 101) still say Pune

-- Detector: any customer with more than one "version of the truth"?
SELECT customer_email,
       COUNT(DISTINCT customer_city)  AS versions_of_truth,
       GROUP_CONCAT(DISTINCT customer_city) AS cities_on_file
FROM   orders_flat
GROUP  BY customer_email
HAVING COUNT(DISTINCT customer_city) > 1;` },
    { lang: 'sql', db: 'messy', title: 'Insert + delete anomalies', code: `-- INSERT anomaly: a brand-new product nobody has ordered yet.
-- order_id / customer are NOT NULL (they are part of the key), so the row is rejected.
INSERT OR IGNORE INTO orders_flat
  (order_id, order_date, customer_email, customer_name, customer_city, product_sku, product_name, unit_price, qty)
VALUES (NULL, '2026-03-10', NULL, NULL, NULL, 'P-BOOK', 'Notebook', 150, 0);

SELECT COUNT(*) AS notebook_rows_saved          -- 0: the catalogue cannot hold it
FROM   orders_flat WHERE product_sku = 'P-BOOK';

-- DELETE anomaly: Chen cancels order 104 (his only order).
DELETE FROM orders_flat WHERE order_id = 104;

-- The Ergo Chair's price and Chen's city are gone too:
SELECT 'Ergo Chair price still known?' AS question,
       CASE WHEN EXISTS (SELECT 1 FROM orders_flat WHERE product_sku = 'P-CHAIR')
            THEN 'yes' ELSE 'NO - lost with the order' END AS answer
UNION ALL
SELECT 'Chen still a known customer?',
       CASE WHEN EXISTS (SELECT 1 FROM orders_flat WHERE customer_email = 'chen@mail.com')
            THEN 'yes' ELSE 'NO - lost with the order' END;` },
    { lang: 'sql', title: 'The fix: one fact, one place (self-contained)', code: `PRAGMA foreign_keys = ON;
CREATE TABLE customers (
  email TEXT PRIMARY KEY,
  name  TEXT NOT NULL,
  city  TEXT NOT NULL
);
CREATE TABLE products (
  sku        TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  unit_price INTEGER NOT NULL CHECK (unit_price > 0)
);
CREATE TABLE orders (
  order_id       INTEGER PRIMARY KEY,
  order_date     TEXT NOT NULL,
  customer_email TEXT NOT NULL REFERENCES customers(email)
);
CREATE TABLE order_items (
  order_id    INTEGER NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
  product_sku TEXT    NOT NULL REFERENCES products(sku),
  qty         INTEGER NOT NULL CHECK (qty > 0),
  PRIMARY KEY (order_id, product_sku)
);
INSERT INTO customers VALUES ('asha@mail.com','Asha','Pune'), ('ben@mail.com','Ben','Delhi'), ('chen@mail.com','Chen','Mumbai');
INSERT INTO products  VALUES ('P-LAMP','Desk Lamp',1200), ('P-MUG','Coffee Mug',300), ('P-PEN','Gel Pen',50), ('P-CHAIR','Ergo Chair',9000);
INSERT INTO orders    VALUES (101,'2026-03-01','asha@mail.com'), (102,'2026-03-02','ben@mail.com'),
                             (103,'2026-03-05','asha@mail.com'), (104,'2026-03-07','chen@mail.com');
INSERT INTO order_items VALUES (101,'P-LAMP',1), (101,'P-MUG',2), (102,'P-MUG',4), (103,'P-PEN',10), (104,'P-CHAIR',1);

UPDATE customers SET city = 'Mumbai' WHERE email = 'asha@mail.com';   -- update: ONE row
INSERT INTO products VALUES ('P-BOOK', 'Notebook', 150);               -- insert: no order needed
DELETE FROM orders WHERE order_id = 104;                               -- delete: catalogue untouched

SELECT (SELECT city FROM customers WHERE email = 'asha@mail.com') AS asha_city,
       (SELECT COUNT(*) FROM products)                             AS products_known,
       (SELECT unit_price FROM products WHERE sku = 'P-CHAIR')     AS chair_price_still_known;` }],
    codeTitle: ['Watch the update anomaly happen', 'Insert & delete anomalies', 'Normalized schema — all three anomalies gone'],
    viz: {
      title: 'One big table misbehaves — then gets split',
      gen: function () {
        var cols = ['order_id', 'customer', 'city', 'sku', 'product', 'price', 'qty'];
        var base = [
          [101, 'Asha', 'Pune', 'P-LAMP', 'Desk Lamp', 1200, 1],
          [101, 'Asha', 'Pune', 'P-MUG', 'Coffee Mug', 300, 2],
          [102, 'Ben', 'Delhi', 'P-MUG', 'Coffee Mug', 300, 4],
          [103, 'Asha', 'Pune', 'P-PEN', 'Gel Pen', 50, 10],
          [104, 'Chen', 'Mumbai', 'P-CHAIR', 'Ergo Chair', 9000, 1],
          [105, 'Ben', 'Delhi', 'P-LAMP', 'Desk Lamp', 1200, 2]
        ];
        var copy = function () { return base.map(function (r) { return r.slice(); }); };
        var T = function (rows, hl, label) { return { type: 'table', label: label || 'orders_flat (one big table)', columns: cols, rows: rows, hl: hl || {} }; };
        var f = [];
        f.push({ narr: 'This is the "spreadsheet" design: one row per product line in an order. It looks convenient — every question can be answered from one table. Let us see what it costs.', parts: [T(copy())] });
        f.push({ narr: 'Spot the copies. "Asha lives in Pune" is written in <b>3 rows</b> (amber). "Desk Lamp costs 1200" is written in <b>2 rows</b>. Each copy is a future bug.', parts: [T(copy(), { 0: 'cur', 1: 'cur', 3: 'cur', 5: 'win' })] });
        var up = copy(); up[3][2] = 'Mumbai';
        f.push({ narr: '<b>Update anomaly.</b> Asha moves to Mumbai. The app updates only the row for order 103 (green). Rows for order 101 still say Pune (red). The database now holds <b>two truths</b> about one person.', parts: [T(up, { 0: 'bad', 1: 'bad', 3: 'ok' })] });
        f.push({ narr: 'A detector query (GROUP BY customer HAVING COUNT(DISTINCT city) &gt; 1) finds the contradiction. Which city do we ship to? Nobody knows.', parts: [{ type: 'table', label: 'SELECT customer, COUNT(DISTINCT city) …', columns: ['customer', 'versions_of_truth', 'cities_on_file'], rows: [['Asha', 2, 'Pune, Mumbai']], hl: { 0: 'bad' } }] });
        var ins = copy(); ins.push([null, null, null, 'P-BOOK', 'Notebook', 150, null]);
        f.push({ narr: '<b>Insert anomaly.</b> We want to list a new product, Notebook ₹150, before anyone buys it. But order_id is part of the key and cannot be NULL. The row is <b>rejected</b> — the catalogue cannot hold a product with no order.', parts: [T(ins, { 6: 'bad' })] });
        f.push({ narr: '<b>Delete anomaly.</b> Chen cancels order 104 — his only order and the only Ergo Chair row. Deleting this one row (red) will erase three different facts.', parts: [T(copy(), { 4: 'bad' })] });
        var del = copy(); del.splice(4, 1);
        f.push({ narr: 'After the delete: we no longer know the Ergo Chair exists, what it costs, or that Chen is a customer living in Mumbai. One business event (a cancellation) destroyed unrelated facts.', parts: [T(del), { type: 'text', label: 'Lost facts', html: '<span class="c-r">Ergo Chair costs 9000</span> · <span class="c-r">Chen lives in Mumbai</span> · <span class="c-r">Chen is a customer</span>' }] });
        f.push({ narr: 'Root cause: the table mixes facts that depend on <b>different things</b>. City depends on the customer, price on the product, qty on (order, product). Arrows show "knowing the left tells you the right".', parts: [fdGraph(['order_id', 'customer', 'city', 'sku', 'product', 'price', 'qty'], [{ l: ['order_id'], r: ['customer'] }, { l: ['customer'], r: ['city'] }, { l: ['sku'], r: ['product', 'price'] }, { l: ['order_id', 'sku'], r: ['qty'] }], false, { fdHl: { 1: 'bad', 2: 'bad' } })] });
        f.push({ narr: 'Split along those arrows. Each table is about <b>one</b> thing and stores each fact <b>once</b>. order_items keeps only the keys plus qty.', parts: [
          { type: 'table', label: 'customers', columns: ['customer', 'city'], rows: [['Asha', 'Pune'], ['Ben', 'Delhi'], ['Chen', 'Mumbai']], hl: { 0: 'ok', 1: 'ok', 2: 'ok' } },
          { type: 'table', label: 'products', columns: ['sku', 'product', 'price'], rows: [['P-LAMP', 'Desk Lamp', 1200], ['P-MUG', 'Coffee Mug', 300], ['P-PEN', 'Gel Pen', 50], ['P-CHAIR', 'Ergo Chair', 9000]], hl: { 0: 'ok', 1: 'ok', 2: 'ok', 3: 'ok' } },
          { type: 'table', label: 'orders', columns: ['order_id', 'customer'], rows: [[101, 'Asha'], [102, 'Ben'], [103, 'Asha'], [104, 'Chen'], [105, 'Ben']] },
          { type: 'table', label: 'order_items', columns: ['order_id', 'sku', 'qty'], rows: [[101, 'P-LAMP', 1], [101, 'P-MUG', 2], [102, 'P-MUG', 4], [103, 'P-PEN', 10], [104, 'P-CHAIR', 1], [105, 'P-LAMP', 2]] }] });
        f.push({ narr: 'Replay the update: Asha moves → change <b>one</b> row in customers. Every order sees the new city through the join. No contradiction is possible.', parts: [{ type: 'table', label: 'customers', columns: ['customer', 'city'], rows: [['Asha', 'Mumbai'], ['Ben', 'Delhi'], ['Chen', 'Mumbai']], hl: { 0: 'ok' } }] });
        f.push({ narr: 'Replay the insert: Notebook goes straight into products. No order needed. Replay the delete: removing order 104 deletes from orders/order_items only — the chair and Chen survive.', parts: [
          { type: 'table', label: 'products', columns: ['sku', 'product', 'price'], rows: [['P-LAMP', 'Desk Lamp', 1200], ['P-MUG', 'Coffee Mug', 300], ['P-PEN', 'Gel Pen', 50], ['P-CHAIR', 'Ergo Chair', 9000], ['P-BOOK', 'Notebook', 150]], hl: { 3: 'sel', 4: 'ok' } },
          { type: 'table', label: 'orders (104 deleted)', columns: ['order_id', 'customer'], rows: [[101, 'Asha'], [102, 'Ben'], [103, 'Asha'], [105, 'Ben']] }] });
        f.push({ narr: 'Summary: <b>redundancy → anomalies</b>; <b>one fact in one place → no anomalies</b>. The rest of the module turns "split along the arrows" into precise rules: 1NF, 2NF, 3NF and BCNF.', parts: [{ type: 'table', label: 'Anomaly scorecard', columns: ['anomaly', 'one big table', 'normalized'], rows: [['update', 'many rows, can contradict', '1 row'], ['insert', 'blocked by missing key parts', 'free'], ['delete', 'loses unrelated facts', 'isolated']], hl: { 0: 'sel', 1: 'sel', 2: 'sel' } }] });
        return f;
      }
    },
    examples: [
      { title: 'HR sheet: the department phone number (update anomaly)', html: `<p>Table <code>staff(emp_id, name, dept, dept_phone)</code>. 40 people in Sales all carry Sales' phone number. Sales gets a new phone; a script updates rows <code>WHERE dept='Sales' AND emp_id &lt; 100</code> by mistake. Now 12 rows have the old number. Fix: <code>departments(dept PK, phone)</code>, and <code>staff</code> keeps only <code>dept</code> as a foreign key.</p>`, code: { lang: 'sql', code: `CREATE TABLE departments (dept TEXT PRIMARY KEY, phone TEXT NOT NULL);
CREATE TABLE staff (emp_id INTEGER PRIMARY KEY, name TEXT NOT NULL,
                    dept TEXT NOT NULL REFERENCES departments(dept));
INSERT INTO departments VALUES ('Sales', '080-111'), ('Legal', '080-222');
INSERT INTO staff VALUES (1, 'Asha', 'Sales'), (2, 'Ben', 'Sales'), (3, 'Chen', 'Legal');
UPDATE departments SET phone = '080-999' WHERE dept = 'Sales';   -- one row, everyone sees it
SELECT s.name, d.phone FROM staff s JOIN departments d USING (dept) ORDER BY s.emp_id;` } },
      { title: 'College: a new course with no students yet (insert anomaly)', html: `<p><code>enrollments(student_id, course_id, course_title, credits)</code> with key (student_id, course_id). The college announces "Graph Databases, 3 credits" but nobody has enrolled. To insert it you would need a fake <code>student_id</code> — a "dummy row" that pollutes every COUNT. The fix is a <code>courses</code> table that can hold a course with zero enrollments.</p>` },
      { title: 'Shop: deleting the last order of a product (delete anomaly)', html: `<p>With the flat table, <code>DELETE FROM orders_flat WHERE order_id = 104</code> silently erases the Ergo Chair from the catalogue. Teams then "fix" it by soft-deleting orders (<code>is_deleted = 1</code>) everywhere — a workaround for a schema bug. With a separate <code>products</code> table the delete is harmless.</p>` },
      { title: 'Not redundancy: repeated foreign keys and snapshots', html: `<p><code>order_items.order_id = 101</code> appearing twice is fine — it is a <b>reference</b>, not a copied fact. Likewise <code>order_items.unit_price_at_sale</code> is <b>not</b> redundant with <code>products.unit_price</code>: it records "what the customer actually paid on that day", a different fact that must <b>not</b> change when the catalogue price changes. Ask "if the source changes, should this copy change too?" — if no, it is a separate fact.</p>` }
    ],
    deepDive: `<h4>🟣 Why constraints alone can't save a redundant table</h4>
<p>To keep the flat table consistent you need the rule "all rows with the same email have the same city". That is a <b>functional dependency</b>, and SQL has no declarative constraint for it on a single table: <code>UNIQUE</code> and <code>CHECK</code> look at one row (or one key). The SQL standard's <code>CREATE ASSERTION</code> could express it, but no mainstream engine (PostgreSQL, MySQL, SQL Server, Oracle, SQLite) implements assertions. Your options are triggers (slow, easy to get wrong under concurrency) or — the real answer — a schema where the rule is a <b>primary key</b>: in <code>customers(email PK, city)</code> "one city per email" is enforced for free by the PK index.</p>
<h4>Concurrency makes it worse</h4>
<p>Even a careful "UPDATE all rows for this customer" can race with an INSERT of a new order row that copied the <b>old</b> city a millisecond earlier (read-then-insert in another transaction). Under READ COMMITTED both commit and you are inconsistent again. Normalization removes the race entirely because there is only one row to update.</p>
<h4>Cost of redundancy in numbers</h4>
<p>10 M order lines × a 60-byte address copy = ~600 MB of duplicate text, bigger indexes, fewer rows per page, a colder buffer cache. An address change touches every line → write amplification, WAL volume and replication lag. Normalized: one 60-byte update.</p>
<h4>Where redundancy is deliberate</h4>
<p>Later in this module you will <b>re-introduce</b> copies on purpose (denormalization, star schemas, caches). The difference is control: a deliberate copy has a single <b>source of truth</b>, a documented refresh mechanism (trigger, materialized view, CDC stream) and tolerance for being briefly stale. Accidental redundancy has none of these.</p>`,
    aiEra: `<p><b>What AI changes:</b> a huge amount of data now enters databases straight from CSV exports, scraped pages and LLM "extract to JSON" pipelines — and the default shape of that data is <b>one flat table</b>. AI coding assistants will happily generate <code>CREATE TABLE</code> from a CSV header, preserving every redundant column. Anomalies arrive faster than ever.</p>
<p><b>Use AI as a partner:</b> paste a sample of rows and ask <code>List every functional dependency you can infer, then list one update, insert and delete anomaly this table has</code>. Then verify each claimed dependency with a real query (<code>GROUP BY x HAVING COUNT(DISTINCT y) &gt; 1</code>) — data can disprove an FD but only business rules can prove it.</p>
<p><b>Where AI goes wrong:</b> it confuses "repeated value" with "redundant fact" (it may tell you to split out <code>order_id</code> or the price-at-sale snapshot), and it rarely asks the business question ("can a customer have two cities?"). <b>What you must still own:</b> knowing which rules are real business rules, and explaining the anomaly with one concrete row in an interview.</p>`,
    problems: [{
      title: 'Find the Anomalies in an Event Sign-up Sheet',
      level: 'Easy', tags: ['anomalies', 'decomposition'], companies: ['Eventbrite', 'Amazon', 'Zoho'],
      statement: `<p>An events team keeps one table <code>registrations(attendee_email, attendee_name, event_code, event_title, event_date, venue, venue_capacity)</code> with key (attendee_email, event_code). Business rules: an attendee has one name; an event has one title, date and venue; a venue has one capacity. Name one <b>update</b>, one <b>insert</b> and one <b>delete</b> anomaly with a concrete row, then write a normalized schema in SQL.</p>`,
      constraints: `<p>SQLite DDL. Every business rule must be enforced by a primary key, foreign key or NOT NULL — no triggers.</p>`,
      example: `<p>Rows: (asha@x, Asha, E1, SQL Meetup, 2026-05-01, Hall A, 80), (ben@x, Ben, E1, SQL Meetup, 2026-05-01, Hall A, 80).<br>${H.c('r', 'Update')}: Hall A's capacity becomes 100 → must change every E1 row (and every other event in Hall A).<br>${H.c('r', 'Insert')}: a new event E2 with no attendees can't be stored (attendee_email is part of the key).<br>${H.c('r', 'Delete')}: if Asha and Ben cancel, E1's title, date and venue are lost.</p>`,
      brute: {
        why: `<p>Keeping one table "because it is simpler" means every query is a single SELECT — but each event's details are copied once per attendee and each venue's capacity once per attendee per event. 2,000 attendees = 2,000 copies to keep in sync, and you still can't list an event before the first sign-up.</p>`,
        code: `CREATE TABLE registrations (
  attendee_email TEXT NOT NULL,
  attendee_name  TEXT NOT NULL,
  event_code     TEXT NOT NULL,
  event_title    TEXT NOT NULL,
  event_date     TEXT NOT NULL,
  venue          TEXT NOT NULL,
  venue_capacity INTEGER NOT NULL,
  PRIMARY KEY (attendee_email, event_code)
);
INSERT INTO registrations VALUES
  ('asha@x', 'Asha', 'E1', 'SQL Meetup', '2026-05-01', 'Hall A', 80),
  ('ben@x',  'Ben',  'E1', 'SQL Meetup', '2026-05-01', 'Hall A', 80);
-- Update anomaly: a careless update fixes only one copy of Hall A's capacity
UPDATE registrations SET venue_capacity = 100 WHERE attendee_email = 'asha@x';
SELECT venue, GROUP_CONCAT(DISTINCT venue_capacity) AS capacities_on_file
FROM registrations GROUP BY venue;   -- Hall A | 100,80  (contradiction)`
      },
      mcq: { q: 'Which business rule causes the venue capacity to be repeated?', options: ['venue → venue_capacity, while the key is (attendee_email, event_code)', 'attendee_email → attendee_name', 'The table has no primary key', 'SQLite stores integers inefficiently'], answer: 0, explain: 'Capacity depends on the venue, which depends on the event — neither is the table key, so the fact is copied per registration.' },
      hints: [`<p>Hint 1: For each non-key column ask "what does this really describe?" — a person, an event, a venue, or the registration itself?</p>`, `<p>Hint 2: You get one table per "thing": attendees, venues, events, and a junction table registrations that keeps only the two keys.</p>`, `<p>Hint 3: events.venue is a foreign key to venues; registrations has a composite primary key and two foreign keys. Then rejoin to prove nothing was lost.</p>`],
      tests: { cmp: 'exact', engine: 'sqlite', cases: [
          { cols: ['event_code', 'title', 'capacity', 'signups'], rows: [['E1', 'SQL Meetup', 100, 0], ['E2', 'Graph DB Night', 100, 0]] },
          { after: 'INSERT INTO registrations VALUES (\'asha@x\',\'E1\'),(\'ben@x\',\'E2\'); UPDATE venues SET capacity = 120 WHERE venue = \'Hall A\'; SELECT attendee_name, event_code, capacity FROM registrations_wide ORDER BY attendee_email', rows: [['Asha', 'E1', 120], ['Ben', 'E2', 120]] },
          { after: 'INSERT INTO events VALUES (\'E3\',\'Rust Day\',\'2026-07-01\',\'Hall A\'); SELECT COUNT(*) FROM events', rows: [[3]] },
          { after: 'INSERT INTO registrations VALUES (\'asha@x\',\'E1\'),(\'ben@x\',\'E1\'); DELETE FROM registrations; SELECT COUNT(*) FROM events', rows: [[2]] },
          { after: 'INSERT INTO registrations VALUES (\'asha@x\',\'E1\'),(\'ben@x\',\'E1\'); DELETE FROM events WHERE event_code = \'E1\'; SELECT COUNT(*) FROM registrations', rows: [[0]] },
          { after: 'INSERT INTO attendees VALUES (\'asha@x\', \'Asha Again\')', error: 'UNIQUE' },
          { after: 'INSERT INTO events VALUES (\'E1\',\'Dup\',\'2026-01-01\',\'Hall A\')', error: 'UNIQUE' },
          { after: 'INSERT INTO events VALUES (\'E9\',\'Ghost venue\',\'2026-01-01\',\'Hall Z\')', error: 'FOREIGN KEY' },
          { after: 'INSERT INTO registrations VALUES (\'ghost@x\',\'E1\')', error: 'FOREIGN KEY' },
          { after: 'INSERT INTO registrations VALUES (\'asha@x\',\'E9\')', error: 'FOREIGN KEY' },
          { after: 'INSERT INTO registrations VALUES (\'asha@x\',\'E1\'),(\'asha@x\',\'E1\')', error: 'UNIQUE' },
          { after: 'INSERT INTO venues VALUES (\'Hall B\', 0)', error: 'CHECK' },
          { after: 'INSERT INTO venues VALUES (\'Hall A\', 50)', error: 'UNIQUE' },
          { after: 'INSERT INTO venues (venue) VALUES (\'Hall C\')', error: 'NOT NULL' },
          { after: 'DELETE FROM venues WHERE venue = \'Hall A\'', error: 'FOREIGN KEY' },
          { after: 'SELECT name FROM attendees ORDER BY email', rows: [['Asha'], ['Ben']] }
        ] },
      solution: {
        approach: `<p>Group columns by what they describe. <b>Attendee</b> facts: name (key email). <b>Venue</b> facts: capacity (key venue). <b>Event</b> facts: title, date, venue (key event_code). The <b>registration</b> itself has no extra facts — it is just the pair (attendee, event). Each group becomes a table; each rule becomes a primary key, so the database enforces it. A view gives the old "one big table" back for reports.</p>`,
        code: `PRAGMA foreign_keys = ON;
CREATE TABLE attendees (email TEXT PRIMARY KEY, name TEXT NOT NULL);
CREATE TABLE venues    (venue TEXT PRIMARY KEY, capacity INTEGER NOT NULL CHECK (capacity > 0));
CREATE TABLE events (
  event_code TEXT PRIMARY KEY,
  title      TEXT NOT NULL,
  event_date TEXT NOT NULL,
  venue      TEXT NOT NULL REFERENCES venues(venue)
);
CREATE TABLE registrations (
  attendee_email TEXT NOT NULL REFERENCES attendees(email),
  event_code     TEXT NOT NULL REFERENCES events(event_code) ON DELETE CASCADE,
  PRIMARY KEY (attendee_email, event_code)
);
INSERT INTO attendees VALUES ('asha@x', 'Asha'), ('ben@x', 'Ben');
INSERT INTO venues    VALUES ('Hall A', 80);
INSERT INTO events    VALUES ('E1', 'SQL Meetup', '2026-05-01', 'Hall A'),
                             ('E2', 'Graph DB Night', '2026-06-12', 'Hall A');  -- no attendees yet: allowed
INSERT INTO registrations VALUES ('asha@x', 'E1'), ('ben@x', 'E1');

UPDATE venues SET capacity = 100 WHERE venue = 'Hall A';     -- one row
DELETE FROM registrations WHERE event_code = 'E1';           -- E1 itself survives

-- A view recreates the old wide shape for reports (no stored copies)
CREATE VIEW registrations_wide AS
SELECT r.attendee_email, a.name AS attendee_name, e.event_code, e.title, e.event_date, v.venue, v.capacity
FROM registrations r
JOIN attendees a ON a.email = r.attendee_email
JOIN events e    ON e.event_code = r.event_code
JOIN venues v    ON v.venue = e.venue;

SELECT e.event_code, e.title, v.capacity,
       (SELECT COUNT(*) FROM registrations r WHERE r.event_code = e.event_code) AS signups
FROM events e JOIN venues v USING (venue) ORDER BY e.event_code;`,
        complexity: `<p>Each fact is stored once: an attendee rename, venue change or capacity change is an O(1)-row update via the PK index. Reads that need everything pay 3 indexed joins — cheap at this size; consider a materialized summary only if a dashboard proves it is a bottleneck.</p>`,
        followUps: ['How would you store the price a person paid if ticket prices change over time?', 'Add a rule "an attendee can register for at most one event per date" — which constraint?']
      }
    }]
  });

  /* =====================================================================
     TOPIC 2 — Functional dependencies, closure and candidate keys
     ===================================================================== */
  topics.push({
    title: 'Functional Dependencies, Attribute Closure & Candidate Keys',
    analogy: `<p>Your phone's contact list: if I tell you a <b>phone number</b>, you can tell me exactly <b>one name</b>. Knowing the number <b>determines</b> the name. The reverse is not true — "Rahul" may map to five numbers. A <b>functional dependency</b> is exactly this "if you know the left side, there is only one possible right side" rule. Normalization is just: write down these lookup rules, then build one table per rule.</p>`,
    explain: `<p><b>🟢 The plain idea.</b> A <b>functional dependency (FD)</b> <code>X → Y</code> ("X determines Y") means: any two rows that agree on X <b>must</b> agree on Y. Examples from our shop:</p>
${H.table(['FD', 'read it as', 'true?'], [
  ['email → city', 'one email has one city', H.c('g', 'yes (business rule)')],
  ['sku → product_name, unit_price', 'a product code fixes name and price', H.c('g', 'yes')],
  ['(order_id, sku) → qty', 'one quantity per product per order', H.c('g', 'yes')],
  ['city → email', 'a city has one customer', H.c('r', 'no — many customers per city')]])}
<p>Words you need:</p>
<ul>
<li><b>Determinant</b> = the left side X.</li>
<li><b>Trivial FD</b> = Y is already inside X, e.g. <code>(email, city) → city</code>. Always true, never interesting.</li>
<li><b>Superkey</b> = a set of columns that determines <b>every</b> column of the table.</li>
<li><b>Candidate key</b> = a <b>minimal</b> superkey (remove any column and it stops being a superkey). A table can have several.</li>
<li><b>Primary key</b> = the one candidate key you picked; the others become <code>UNIQUE</code> constraints.</li>
<li><b>Prime attribute</b> = a column that belongs to <b>some</b> candidate key. Non-prime = all the others. (2NF and 3NF rules talk about non-prime columns.)</li>
</ul>
<p><b>🔵 How it really works — attribute closure.</b> The closure <b>X⁺</b> is "everything you can figure out once you know X". Algorithm: start with X; repeatedly look for an FD whose whole left side is already in your set, and add its right side; stop when nothing changes.</p>
<p>Worked example. R(A, B, C, D, E) with FDs <code>A → B</code>, <code>B → C</code>, <code>CD → E</code>, <code>E → A</code>. Compute <b>{C, D}⁺</b>:</p>
${H.table(['step', 'FD fired', 'set so far'], [['start', '—', '{C, D}'], ['1', 'CD → E', '{C, D, ' + H.c('g', 'E') + '}'], ['2', 'E → A', '{A, C, D, E}'], ['3', 'A → B', '{A, B, C, D, E}'], ['4', 'nothing new', H.c('p', 'ABCDE = all columns → CD is a superkey')]])}
<p>Because neither C nor D alone gives everything (C⁺ = {C}, D⁺ = {D}), <b>CD is a candidate key</b>. Closure answers every FD question: "does X → Y hold?" ⟺ "is Y ⊆ X⁺?"; "is X a superkey?" ⟺ "is X⁺ = all columns?".</p>
<p><b>Finding all candidate keys by hand</b> — the shortcut:</p>
<ol>
<li>Columns that <b>never appear on any right side</b> must be in <b>every</b> key (nothing can derive them).</li>
<li>Columns that appear <b>only on right sides</b> are in <b>no</b> key (something else always derives them).</li>
<li>Start from the "must" set; if its closure is everything, it is the only key. Otherwise add the "both sides" columns one at a time, then two at a time…, skipping supersets of keys you already found.</li>
</ol>
<p><b>Armstrong's axioms</b> are the three rules from which every implied FD follows: <b>reflexivity</b> (if Y ⊆ X then X → Y), <b>augmentation</b> (X → Y ⇒ XZ → YZ), <b>transitivity</b> (X → Y and Y → Z ⇒ X → Z). Handy derived rules: <b>union</b> (X → Y, X → Z ⇒ X → YZ), <b>decomposition</b> (X → YZ ⇒ X → Y), <b>pseudo-transitivity</b> (X → Y, WY → Z ⇒ WX → Z). Closure is just a fast way of applying them.</p>`,
    clues: [
      '"Find all candidate keys of R(A,B,C,D,E) given F = {…}" — closure + the never-on-right-side shortcut',
      '"Does X → Y follow from F?" / "Is this FD implied?" → compute X⁺ and check Y ⊆ X⁺',
      '"Which attributes are prime?" — find every candidate key first',
      '"Minimal / canonical cover" — single-attribute right sides, no extraneous left attributes, no redundant FDs',
      'Data-validation phrasing: "check whether email really determines city in this table" → GROUP BY email HAVING COUNT(DISTINCT city) &gt; 1',
      '"Two columns are each unique on their own" → two candidate keys (PK + UNIQUE)'
    ],
    code: [{ lang: 'sql', db: 'messy', title: 'Test FDs against real data (data can only DISPROVE an FD)', code: `-- Does customer_email -> customer_city hold in the data?  Rows returned = violations.
SELECT 'customer_email -> customer_city' AS fd, customer_email AS lhs_value,
       COUNT(DISTINCT customer_city) AS distinct_rhs
FROM orders_flat GROUP BY customer_email HAVING COUNT(DISTINCT customer_city) > 1
UNION ALL
-- Does product_sku -> unit_price hold?
SELECT 'product_sku -> unit_price', product_sku, COUNT(DISTINCT unit_price)
FROM orders_flat GROUP BY product_sku HAVING COUNT(DISTINCT unit_price) > 1
UNION ALL
-- Does customer_city -> customer_email hold?  (It should NOT be a rule; let's see.)
SELECT 'customer_city -> customer_email', customer_city, COUNT(DISTINCT customer_email)
FROM orders_flat GROUP BY customer_city HAVING COUNT(DISTINCT customer_email) > 1;
-- Empty result = "no counter-example in today's data", NOT proof that the rule is real.` },
    { lang: 'sql', title: 'Closure + candidate keys computed in pure SQL (bitmask trick)', code: `-- Attributes as bits: A=1, B=2, C=4, D=8.  FDs: AB->C, C->D, D->A (one bit per right side)
CREATE TABLE attr (name TEXT PRIMARY KEY, bit INTEGER NOT NULL UNIQUE);
INSERT INTO attr VALUES ('A', 1), ('B', 2), ('C', 4), ('D', 8);
CREATE TABLE fd (lhs INTEGER NOT NULL, rhs INTEGER NOT NULL);
INSERT INTO fd VALUES (1 | 2, 4), (4, 8), (8, 1);

WITH RECURSIVE
  subsets(m) AS (SELECT 1 UNION ALL SELECT m + 1 FROM subsets WHERE m < 15),
  -- closure: each round adds the right side of every FD whose left side is already inside
  clo(start, mask, step) AS (
    SELECT m, m, 0 FROM subsets
    UNION ALL
    SELECT start,
           mask | COALESCE((SELECT SUM(DISTINCT f.rhs) FROM fd f
                            WHERE (f.lhs & clo.mask) = f.lhs AND (f.rhs & clo.mask) = 0), 0),
           step + 1
    FROM clo WHERE step < 4                  -- at most |attributes| rounds are ever needed
  ),
  final(start, plus) AS (SELECT start, MAX(mask) FROM clo GROUP BY start),
  superkeys AS (SELECT start FROM final WHERE plus = 15)
SELECT (SELECT GROUP_CONCAT(name, '') FROM (SELECT name FROM attr WHERE bit & s.start ORDER BY bit)) AS candidate_key
FROM superkeys s
WHERE NOT EXISTS (SELECT 1 FROM superkeys t           -- minimal: no smaller superkey inside it
                  WHERE t.start <> s.start AND (t.start & s.start) = t.start)
ORDER BY s.start;                                     -- AB, BC, BD` }],
    codeTitle: ['Check FDs against data', 'Closure & keys in SQL'],
    viz: [{
      title: 'Attribute closure calculator (X⁺)',
      input: 'A->B; B->C; CD->E; E->A | CD',
      inputLabel: 'FDs ; separated | start set  (letters: AB->C, or words: order_id, sku -> qty)',
      gen: function (input) {
        var S = parseSpec(input, true), L = S.L, frames = [], cur = S.set.slice();
        var aHl = function () { var h = {}; S.attrs.forEach(function (a) { h[a] = has(cur, a) ? 'ok' : ''; }); return h; };
        frames.push({ narr: 'Start: X = <b>' + fmt(S.set, L) + '</b>. We know these columns. Green boxes = "known so far". Arrows are the FDs.', parts: [fdGraph(S.attrs, S.fds, L, { attrHl: aHl() }), fdTable(S.fds, L), { type: 'set', label: 'X⁺ so far', items: cur.slice() }] });
        var pass = 0, changed = true;
        while (changed && pass < 12) {
          changed = false; pass++;
          for (var i = 0; i < S.fds.length; i++) {
            var f = S.fds[i];
            var fire = subset(f.l, cur), add = minus(f.r, cur);
            if (fire && add.length) {
              cur = S.ord(cur.concat(add)); changed = true;
              var h = aHl(); add.forEach(function (a) { h[a] = 'cur'; });
              var fh = {}; fh[i] = 'ok'; var th = {}; th[i] = 'ok';
              var sh = {}; add.forEach(function (a) { sh[a] = 'ok'; });
              frames.push({ narr: 'Pass ' + pass + ': left side of <b>' + fdStr(f, L) + '</b> is fully known, so we learn <b>' + fmt(add, L) + '</b>.', parts: [fdGraph(S.attrs, S.fds, L, { attrHl: h, fdHl: fh }), fdTable(S.fds, L, th), { type: 'set', label: 'X⁺ so far', items: cur.slice(), hl: sh }] });
            } else if (!fire && frames.length < 40) {
              var miss = minus(f.l, cur), fh2 = {}; fh2[i] = 'bad'; var th2 = {}; th2[i] = 'bad';
              frames.push({ narr: 'Pass ' + pass + ': <b>' + fdStr(f, L) + '</b> cannot fire yet — we do not know <b>' + fmt(miss, L) + '</b>.', parts: [fdGraph(S.attrs, S.fds, L, { attrHl: aHl(), fdHl: fh2 }), fdTable(S.fds, L, th2), { type: 'set', label: 'X⁺ so far', items: cur.slice() }] });
            }
          }
        }
        var all = subset(S.attrs, cur);
        frames.push({ narr: 'A full pass added nothing → stop. <b>' + fmt(S.set, L) + '⁺ = ' + fmt(cur, L) + '</b>. ' + (all ? '<span class="c-p">It contains every attribute, so ' + fmt(S.set, L) + ' is a superkey.</span>' : 'Missing ' + fmt(minus(S.attrs, cur), L) + ' → ' + fmt(S.set, L) + ' is <b>not</b> a superkey.'), parts: [fdGraph(S.attrs, S.fds, L, { attrHl: (function () { var h = aHl(); if (all) S.attrs.forEach(function (a) { h[a] = 'sel'; }); return h; })() }), { type: 'set', label: 'final X⁺', items: cur.slice(), hl: (function () { var h = {}; cur.forEach(function (a) { h[a] = all ? 'sel' : 'ok'; }); return h; })() }] });
        var useRows = S.attrs.map(function (a) { return [fmt(S.set, L) + ' → ' + a, has(cur, a) ? 'implied ✔' : 'NOT implied']; }), useHl = {};
        S.attrs.forEach(function (a, i) { useHl[i] = has(cur, a) ? 'ok' : 'bad'; });
        frames.push({ narr: 'Using the result: an FD ' + fmt(S.set, L) + ' → Y follows from the given FDs exactly when Y ⊆ X⁺. So one closure answers every "is this FD implied?" question for this left side — no axiom juggling needed.', parts: [{ type: 'table', label: 'which FDs with this left side are implied?', columns: ['FD', 'verdict'], rows: useRows, hl: useHl }] });
        return frames;
      }
    }, {
      title: 'Candidate-key finder',
      input: 'A B C D | AB->C; C->D; D->A',
      inputLabel: 'attributes | FDs',
      gen: function (input) {
        var S = parseSpec(input, false), L = S.L, frames = [], R = S.attrs;
        var rhsAll = [], lhsAll = [];
        S.fds.forEach(function (f) { lhsAll = uniq(lhsAll.concat(f.l)); rhsAll = uniq(rhsAll.concat(minus(f.r, f.l))); });
        var must = R.filter(function (a) { return !has(rhsAll, a); });
        var never = R.filter(function (a) { return has(rhsAll, a) && !has(lhsAll, a); });
        var both = R.filter(function (a) { return has(rhsAll, a) && has(lhsAll, a); });
        var tag = {}, ah = {};
        must.forEach(function (a) { tag[a] = 'in every key'; ah[a] = 'sel'; });
        never.forEach(function (a) { tag[a] = 'in no key'; ah[a] = 'done'; });
        both.forEach(function (a) { tag[a] = 'maybe'; ah[a] = 'cur'; });
        frames.push({ narr: 'Relation R(' + fmt(R, L) + ') with these FDs. Goal: every <b>minimal</b> set of columns whose closure is all of R.', parts: [fdGraph(R, S.fds, L), fdTable(S.fds, L)] });
        frames.push({ narr: 'Shortcut: columns never on a right side (purple) can not be derived, so they are in <b>every</b> key. Columns only on right sides (faded) are in <b>no</b> key. Amber = maybe.', parts: [fdGraph(R, S.fds, L, { attrHl: ah, attrTags: tag }), { type: 'table', label: 'Classification', columns: ['group', 'columns'], rows: [['never on right → must', fmt(must, L)], ['only on right → never', fmt(never, L)], ['both sides → maybe', fmt(both, L)]], hl: { 0: 'sel', 1: 'done', 2: 'cur' } }] });
        var keys = [], tested = 0, rows = [], rowHl = {};
        var nb = both.length;
        var masks = [];
        for (var m = 0; m < (1 << nb); m++) masks.push(m);
        masks.sort(function (a, b) { return popcount(a) - popcount(b) || a - b; });
        for (var k = 0; k < masks.length; k++) {
          var X = S.ord(must.concat(maskToSet(both, masks[k])));
          if (!X.length) continue;
          var contains = keys.filter(function (kk) { return subset(kk, X); });
          if (contains.length) continue;
          var c = closure(X, S.fds, S.ord).res, sk = subset(R, c);
          tested++;
          rows.push([fmt(X, L), fmt(c, L), sk ? 'YES → candidate key' : 'no']);
          rowHl = {}; rowHl[rows.length - 1] = sk ? 'ok' : 'bad';
          if (sk) keys.push(X);
          if (frames.length < 30) {
            var hh = {}; R.forEach(function (a) { hh[a] = has(X, a) ? 'cur' : (has(c, a) ? 'ok' : ''); });
            frames.push({ narr: 'Try <b>' + fmt(X, L) + '</b>: closure = ' + fmt(c, L) + '. ' + (sk ? '<span class="c-g">Covers everything and contains no smaller key → candidate key!</span>' : '<span class="c-r">Misses ' + fmt(minus(R, c), L) + '.</span>') + ' (Supersets of keys already found are skipped — they are superkeys, not minimal.)', parts: [fdGraph(R, S.fds, L, { attrHl: hh }), { type: 'table', label: 'Sets tested (smallest first)', columns: ['X', 'X⁺', 'superkey?'], rows: rows.slice(), hl: rowHl }] });
          }
          if (tested > 60) break;
        }
        var prime = uniq([].concat.apply([], keys));
        frames.push({ narr: 'Done. Candidate keys: <b>' + keys.map(function (x) { return fmt(x, L); }).join(', ') + '</b>. Prime attributes (in some key): <b>' + fmt(S.ord(prime), L) + '</b>. Non-prime: <b>' + fmt(minus(R, prime), L) + '</b>.', parts: [fdGraph(R, S.fds, L, { attrHl: (function () { var h = {}; R.forEach(function (a) { h[a] = has(prime, a) ? 'sel' : 'done'; }); return h; })() }), { type: 'set', label: 'candidate keys', items: keys.map(function (x) { return fmt(x, L); }), hl: {} }] });
        if (frames.length < 4) frames.push({ narr: 'Only one key exists here — the "must" columns alone already determine everything.', parts: [{ type: 'set', label: 'candidate keys', items: keys.map(function (x) { return fmt(x, L); }) }] });
        return frames;
      }
    }],
    examples: [
      { title: 'Is AB → E implied?', html: `<p>F = {A → C, C → D, BD → E}. Compute AB⁺: start {A, B}; A → C gives C; C → D gives D; BD → E gives E. AB⁺ = {A, B, C, D, E} ∋ E, so <b>yes</b>, AB → E is implied (via transitivity + augmentation). You never need to guess axiom chains — closure does it mechanically.</p>` },
      { title: 'Two candidate keys in a users table', html: `<p><code>users(user_id, email, name)</code> with user_id → email, name and email → user_id. Both {user_id} and {email} are candidate keys; both are prime. Pick user_id as the primary key (short, stable) and enforce the other with <code>UNIQUE</code>.</p>`, code: { lang: 'sql', code: `CREATE TABLE users (
  user_id INTEGER PRIMARY KEY,     -- chosen candidate key
  email   TEXT NOT NULL UNIQUE,    -- the other candidate key, still enforced
  name    TEXT NOT NULL
);
INSERT INTO users VALUES (1, 'asha@mail.com', 'Asha'), (2, 'ben@mail.com', 'Ben');
INSERT OR IGNORE INTO users VALUES (3, 'asha@mail.com', 'Fake Asha');  -- rejected by UNIQUE
SELECT COUNT(*) AS users_kept FROM users;   -- 2` } },
      { title: 'Keys of the "classic exam" relation', html: `<p>R(A, B, C, D, E), F = {A → B, BC → E, ED → A}. Never on a right side: C, D → they are in every key. CD⁺ = {C, D} (stuck). Add one "both-sides" column: ACD⁺ = ACD → B → BCE… = all ✔; BCD⁺ = BCD → E → A ✔; CDE⁺ = CDE → A → B ✔. Keys: <b>ACD, BCD, CDE</b>. Every column is prime! Remember this one — it is 3NF but not BCNF (topic 6).</p>` },
      { title: 'A data check catches a fake FD', html: `<p>A product manager says "city determines the delivery hub". Run <code>SELECT city, COUNT(DISTINCT hub) FROM deliveries GROUP BY city HAVING COUNT(DISTINCT hub) &gt; 1</code>. Bengaluru returns 3 hubs — the rule is false (big cities have several hubs), so you must <b>not</b> put hub in a <code>cities</code> table. Counter-examples kill FDs; an empty result only means "not disproved yet".</p>` }
    ],
    deepDive: `<h4>🟣 Why closure is correct (and fast)</h4>
<p>Every attribute added to X⁺ is justified by reflexivity + transitivity + augmentation, so closure is <b>sound</b>. It is also <b>complete</b> (Armstrong 1974): if X → A is implied by F, A ends up in X⁺. The naive loop is O(|F|² · |R|); the Beeri–Bernstein algorithm uses a counter per FD ("how many left-side attributes are still unknown") and runs in time <b>linear</b> in the size of F.</p>
<h4>Finding all keys is hard in general</h4>
<p>A relation can have exponentially many candidate keys, and deciding "is there a key of size ≤ k?" is NP-complete (Lucchesi &amp; Osborn, 1978). Deciding whether an attribute is <b>prime</b> is also NP-complete — which is why "is this schema in 3NF?" is NP-hard to check in general, while "is it in BCNF?" is polynomial for a given FD set on the whole relation. In interviews the relations are small; the must/never/maybe shortcut plus closure is all you need.</p>
<h4>Minimal cover</h4>
<p>A <b>minimal (canonical) cover</b> of F: (1) single attribute on every right side; (2) no extraneous left-side attribute (AB → C where A⁺ already contains C ⇒ drop B); (3) no redundant FD (one implied by the others). It is not unique, but every minimal cover is equivalent to F. 3NF synthesis (topic 5) starts from it.</p>
<h4>FDs come from meaning, not from data</h4>
<p>An FD is a statement about <b>every legal future state</b> of the table. Data mining tools (TANE, FUN, HyFD, profiling features in data catalogs) discover FDs that hold in today's data; many are accidental ("country → currency" until you add the Euro-zone…). Treat discovered FDs as <b>candidates for a business conversation</b>, never as schema truth. Also note NULLs: SQL's FD semantics with NULLs are murky (is NULL = NULL?), which is why key columns should be NOT NULL.</p>`,
    aiEra: `<p><b>What AI changes:</b> LLMs are good at <b>proposing</b> FDs from column names ("zip_code → city") and decent at running the closure algorithm on small textbook problems. Data-profiling copilots can also scan billions of rows to propose approximate FDs. This removes busywork.</p>
<p><b>Use AI as a partner:</b> <code>Here are my columns and 20 sample rows. Propose FDs, and for each one tell me a real-world situation that would break it.</code> The second half is the valuable part — it turns the model into a devil's advocate for your business rules. Then verify the surviving rules with <code>GROUP BY … HAVING COUNT(DISTINCT …) &gt; 1</code> on full data.</p>
<p><b>Where AI goes wrong:</b> it skips closure steps, forgets attributes that never appear on a right side, reports superkeys as candidate keys (not minimal), and confidently states FDs that are only coincidences in the sample. <b>What you must still own:</b> running closure by hand in an interview in under two minutes, and arguing whether an FD is a real rule ("can one person have two emails?").</p>`,
    problems: [{
      title: 'Find Every Candidate Key',
      level: 'Medium', tags: ['functional dependencies', 'closure', 'candidate keys'], companies: ['Oracle', 'TCS', 'Microsoft'],
      statement: `<p>Relation R(A, B, C, D) with F = {AB → C, C → D, D → A}. List <b>all</b> candidate keys and the prime attributes. Then produce the answer with a runnable SQL script (attributes encoded as bits) so the result can be checked automatically.</p>`,
      constraints: `<p>|R| = 4, so there are 15 non-empty subsets. A candidate key must be a superkey and minimal.</p>`,
      example: `<p>AB⁺ = {A, B} → C (AB → C) → D (C → D) = ${H.c('g', 'ABCD')} ⇒ AB is a superkey. A⁺ = {A}, B⁺ = {B} ⇒ AB is minimal ⇒ ${H.c('p', 'AB is a candidate key')}.</p>`,
      brute: {
        why: `<p>Brute force: compute the closure of all 2<sup>n</sup> − 1 subsets and keep the minimal superkeys. For n = 4 that is just 15 closures — fine on paper for tiny relations, but for n = 10 it is 1023 closures and humans make mistakes. The SQL below does exactly this brute force.</p>`,
        code: `-- Brute force: closure of every subset; print each one with a superkey flag
CREATE TABLE attr (name TEXT PRIMARY KEY, bit INTEGER NOT NULL);
INSERT INTO attr VALUES ('A', 1), ('B', 2), ('C', 4), ('D', 8);
CREATE TABLE fd (lhs INTEGER NOT NULL, rhs INTEGER NOT NULL);
INSERT INTO fd VALUES (3, 4), (4, 8), (8, 1);      -- AB->C, C->D, D->A
WITH RECURSIVE
  subsets(m) AS (SELECT 1 UNION ALL SELECT m + 1 FROM subsets WHERE m < 15),
  clo(start, mask, step) AS (
    SELECT m, m, 0 FROM subsets
    UNION ALL
    SELECT start, mask | COALESCE((SELECT SUM(DISTINCT rhs) FROM fd
                                   WHERE (lhs & clo.mask) = lhs AND (rhs & clo.mask) = 0), 0), step + 1
    FROM clo WHERE step < 4)
SELECT (SELECT GROUP_CONCAT(name, '') FROM (SELECT name FROM attr WHERE bit & start ORDER BY bit)) AS x,
       MAX(mask) = 15 AS is_superkey
FROM clo GROUP BY start ORDER BY start;`
      },
      mcq: { q: 'Which attribute must be in every candidate key?', options: ['B — it never appears on a right side', 'A — it appears in the first FD', 'D — it determines A', 'None; keys can be anything'], answer: 0, explain: 'No FD produces B, so the only way to "know" B is to start with it.' },
      hints: [`<p>Hint 1: Look for attributes that never appear on any right-hand side. Nothing can derive them, so every key must include them.</p>`, `<p>Hint 2: B alone: B⁺ = {B}, not a key. Now try B plus one other attribute: AB, BC, BD — compute each closure.</p>`, `<p>Hint 3: Any 3-attribute set containing B contains one of the 2-attribute keys, so it is not minimal. Recipe: must-set → closure → add one maybe-attribute at a time → skip supersets.</p>`],
      tests: { cmp: 'set', engine: 'sqlite', cases: [
          { cols: ['kind', 'attrs'], rows: [['candidate key', 'AB'], ['candidate key', 'BC'], ['candidate key', 'BD'], ['prime attribute', 'A'], ['prime attribute', 'B'], ['prime attribute', 'C'], ['prime attribute', 'D']] },
          { after: 'SELECT name, bit FROM attr ORDER BY bit', rows: [['A', 1], ['B', 2], ['C', 4], ['D', 8]] },
          { after: 'SELECT lhs, rhs FROM fd ORDER BY lhs, rhs', rows: [[3, 4], [4, 8], [8, 1]] },
          { after: 'SELECT COUNT(*) FROM fd', rows: [[3]] },
          { after: 'SELECT COUNT(*) FROM attr WHERE bit & (bit - 1) = 0', rows: [[4]] },
          { after: 'SELECT MAX(bit) * 2 - 1 FROM attr', rows: [[15]] }
        ] },
      solution: {
        approach: `<p><b>Must-set:</b> B (never on a right side). B⁺ = {B} → not enough. <b>Add one:</b> AB⁺ = ABCD ✔; BC⁺ = BC → D → A = ABCD ✔; BD⁺ = BD → A → AB → C = ABCD ✔. All three are minimal because A⁺, C⁺ = CDA, D⁺ = DA and B⁺ lack B or something else. Every larger set containing B contains one of them. <b>Keys: AB, BC, BD. Prime attributes: A, B, C, D</b> (all of them). Consequence: every FD has a prime right side, so R is in 3NF, but C → D and D → A have non-superkey left sides, so R is <b>not</b> in BCNF.</p>`,
        code: `CREATE TABLE attr (name TEXT PRIMARY KEY, bit INTEGER NOT NULL UNIQUE);
INSERT INTO attr VALUES ('A', 1), ('B', 2), ('C', 4), ('D', 8);
CREATE TABLE fd (lhs INTEGER NOT NULL, rhs INTEGER NOT NULL);
INSERT INTO fd VALUES (1 | 2, 4), (4, 8), (8, 1);    -- AB->C, C->D, D->A
WITH RECURSIVE
  subsets(m) AS (SELECT 1 UNION ALL SELECT m + 1 FROM subsets WHERE m < 15),
  clo(start, mask, step) AS (
    SELECT m, m, 0 FROM subsets
    UNION ALL
    SELECT start, mask | COALESCE((SELECT SUM(DISTINCT rhs) FROM fd
                                   WHERE (lhs & clo.mask) = lhs AND (rhs & clo.mask) = 0), 0), step + 1
    FROM clo WHERE step < 4),
  superkeys AS (SELECT start FROM clo GROUP BY start HAVING MAX(mask) = 15),
  keys AS (SELECT start FROM superkeys s
           WHERE NOT EXISTS (SELECT 1 FROM superkeys t WHERE t.start <> s.start AND (t.start & s.start) = t.start))
SELECT 'candidate key' AS kind,
       (SELECT GROUP_CONCAT(name, '') FROM (SELECT name FROM attr WHERE bit & k.start ORDER BY bit)) AS attrs
FROM keys k
UNION ALL
SELECT 'prime attribute', a.name FROM attr a
WHERE EXISTS (SELECT 1 FROM keys k WHERE k.start & a.bit);`,
        complexity: `<p>Closure of one set: O(|F| · |R|) rounds-times-FDs; all subsets: O(2<sup>|R|</sup> · |F| · |R|). The must/never/maybe shortcut prunes to subsets of the "maybe" columns only — here 2<sup>3</sup> instead of 2<sup>4</sup>.</p>`,
        followUps: ['Is R in 3NF? In BCNF? Justify with the keys you found.', 'Add FD A → B. How do the keys change?']
      }
    }]
  });

  /* =====================================================================
     TOPIC 3 — 0NF → 1NF: atomic values, no repeating groups
     ===================================================================== */
  topics.push({
    title: 'From 0NF to 1NF: Atomic Values & No Repeating Groups',
    analogy: `<p>A shopping receipt where one line says <b>"milk, eggs, bread — ₹210"</b>. You can't tell what the eggs cost, you can't count how many people bought eggs this month, and you can't sort by item. A proper receipt has <b>one item per line</b>. First Normal Form is exactly that: <b>one value per cell, one fact per row</b>.</p>`,
    explain: `<p><b>🟢 The plain idea.</b> A table is in <b>0NF</b> (also called <b>UNF</b>, unnormalized form) when a cell holds a <b>list</b> or a row carries a <b>repeating group</b> of columns. It is in <b>1NF</b> when:</p>
<ol>
<li>Every cell holds <b>one atomic value</b> — no comma-separated lists, no "phone1, phone2, phone3" style column families, no nested tables.</li>
<li>Every row is <b>unique</b> — the table has a key.</li>
<li>Column order and row order carry no meaning.</li>
</ol>
<p>Two common 0NF shapes:</p>
${H.table(['shape', 'example', 'pain'], [
  ['list in a cell', 'courses = "SQL, Java"', H.c('r', 'LIKE \'%SQL%\' also matches "NoSQL"; no FK; no index; can\'t count')],
  ['repeating group', 'course1, course2, course3', H.c('r', 'a 4th course needs ALTER TABLE; NULL-filled columns; queries must OR across 3 columns')]])}
<p><b>🔵 How it really works.</b> Fix: move the multi-valued attribute into its <b>own child table</b> with one row per value, and a foreign key back to the parent:</p>
${H.table(['students', '', 'student_courses'], [['student_id (PK), name', '←', 'student_id (FK), course — PK(student_id, course)']])}
<p>A tempting shortcut is to "explode" the list into rows inside the <b>same</b> table: (1, Asha, SQL), (1, Asha, Java). That is technically 1NF (key = student_id + course), but now <b>name</b> repeats per course — you have traded a 1NF problem for a 2NF problem. Splitting into a child table solves both at once.</p>
<p><b>"Atomic" means atomic for how you use it.</b> A date <code>2026-03-01</code> is atomic if you always treat it as a date. A <code>full_name</code> is atomic unless the business needs to sort by surname. An address string is fine if you only print it, but not if you need "all customers in pincode 411001" — then pincode deserves its own column. Ask: <i>will anyone query, filter, join or constrain a part of this value?</i> If yes, the part should be its own column or row.</p>
<p><b>Migrating real data</b> is a classic interview task: given a column with comma-separated values, write SQL that splits it into rows. In SQLite you use a recursive CTE (or <code>json_each</code> if the column holds a JSON array); in PostgreSQL <code>unnest(string_to_array(col, ','))</code>; in SQL Server <code>STRING_SPLIT</code>; in MySQL 8 <code>JSON_TABLE</code> or a numbers table.</p>`,
    clues: [
      'A column named <code>tags</code>, <code>skills</code>, <code>phones</code>, <code>roles</code> holding "a, b, c" — classic 0NF',
      'Columns <code>phone1, phone2, phone3</code> or <code>item1_qty, item2_qty</code> — a repeating group',
      '"How do I find all users with skill X?" answered with <code>LIKE \'%X%\'</code> — a smell that the data is not in 1NF',
      '"Split a comma-separated column into rows" — recursive CTE / string_to_array / STRING_SPLIT / json_each',
      '"Can I store a JSON array in a column?" — fine for read-only blobs, not for anything you filter, join or constrain',
      '"Is this table in 1NF?" — check atomic cells AND that a key exists'
    ],
    code: [{ lang: 'sql', title: 'Migrate a comma-separated column to a 1NF child table', code: `PRAGMA foreign_keys = ON;
-- 0NF: courses is a list stuffed into one cell
CREATE TABLE students_0nf (student_id INTEGER PRIMARY KEY, name TEXT NOT NULL, courses TEXT);
INSERT INTO students_0nf VALUES (1, 'Asha', 'SQL, Java'), (2, 'Ben', 'Python'),
                                (3, 'Chen', 'SQL,Go, Rust'), (4, 'Dara', '');

-- 1NF target: parent + child (one row per course)
CREATE TABLE students (student_id INTEGER PRIMARY KEY, name TEXT NOT NULL);
CREATE TABLE student_courses (
  student_id INTEGER NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
  course     TEXT    NOT NULL,
  PRIMARY KEY (student_id, course)          -- no duplicate course per student
);
INSERT INTO students SELECT student_id, name FROM students_0nf;

-- Split "a, b, c" with a recursive CTE: peel one item off the front each round
INSERT INTO student_courses (student_id, course)
WITH RECURSIVE split(student_id, item, rest) AS (
  SELECT student_id, '', COALESCE(courses, '') || ',' FROM students_0nf
  UNION ALL
  SELECT student_id,
         TRIM(SUBSTR(rest, 1, INSTR(rest, ',') - 1)),   -- text before the first comma
         SUBSTR(rest, INSTR(rest, ',') + 1)              -- everything after it
  FROM split WHERE rest <> ''
)
SELECT student_id, item FROM split WHERE item <> '';

-- Questions that were painful are now plain SQL
SELECT course, COUNT(*) AS students FROM student_courses GROUP BY course ORDER BY students DESC, course;` },
    { lang: 'sql', title: 'Repeating group (phone1..phone3) → child table, and the json_each variant', code: `CREATE TABLE contacts_0nf (id INTEGER PRIMARY KEY, name TEXT, phone1 TEXT, phone2 TEXT, phone3 TEXT, emails_json TEXT);
INSERT INTO contacts_0nf VALUES
  (1, 'Asha', '98450', '98451', NULL,  '["asha@mail.com","asha@work.com"]'),
  (2, 'Ben',  '99000', NULL,    NULL,  '["ben@mail.com"]');

CREATE TABLE contact_phones (contact_id INTEGER NOT NULL, phone TEXT NOT NULL, PRIMARY KEY (contact_id, phone));
-- Unpivot the repeating group with UNION ALL
INSERT INTO contact_phones
SELECT id, phone1 FROM contacts_0nf WHERE phone1 IS NOT NULL
UNION ALL SELECT id, phone2 FROM contacts_0nf WHERE phone2 IS NOT NULL
UNION ALL SELECT id, phone3 FROM contacts_0nf WHERE phone3 IS NOT NULL;

CREATE TABLE contact_emails (contact_id INTEGER NOT NULL, email TEXT NOT NULL UNIQUE, PRIMARY KEY (contact_id, email));
-- JSON array → rows with the json_each table-valued function
INSERT INTO contact_emails
SELECT c.id, j.value FROM contacts_0nf c, json_each(c.emails_json) AS j;

SELECT c.name, p.phone, NULL AS email FROM contacts_0nf c JOIN contact_phones p ON p.contact_id = c.id
UNION ALL
SELECT c.name, NULL, e.email FROM contacts_0nf c JOIN contact_emails e ON e.contact_id = c.id
ORDER BY 1, 2, 3;` }],
    codeTitle: ['Comma list → child table', 'Repeating group & JSON → child tables'],
    viz: {
      title: '0NF list cells exploding into 1NF tables',
      input: 'Asha: SQL, Java | Ben: Python | Chen: SQL, Go, Rust | Dara:',
      inputLabel: 'Students  (name: course, course | name: …)',
      gen: function (input) {
        var groups = String(input || '').split('|').map(function (s) { return s.trim(); }).filter(Boolean);
        if (!groups.length) throw new Error('Format: Name: c1, c2 | Name2: c3');
        if (groups.length > 7) throw new Error('Use at most 7 students');
        var studs = groups.map(function (g, i) {
          var p = g.split(':');
          if (p.length !== 2 || !p[0].trim()) throw new Error('Each student needs "Name: course, course" (problem near "' + g + '")');
          var cs = p[1].split(',').map(function (c) { return c.trim(); }).filter(Boolean);
          if (cs.length > 6) throw new Error('At most 6 courses per student');
          return { id: i + 1, name: p[0].trim(), cs: cs };
        });
        var maxC = Math.max(1, Math.max.apply(null, studs.map(function (s) { return s.cs.length; })));
        var frames = [];
        var zero = studs.map(function (s) { return [s.id, s.name, s.cs.join(', ')]; });
        var badAll = {}; studs.forEach(function (s, i) { if (s.cs.length > 1) badAll[i] = 'bad'; });
        frames.push({ narr: '<b>0NF:</b> the <code>courses</code> cell holds a <b>list</b>. Red rows hold more than one value in one cell — you cannot index, count, join or put a foreign key on "SQL, Java".', parts: [{ type: 'table', label: 'students_0nf', columns: ['student_id', 'name', 'courses'], rows: zero, hl: badAll }] });
        var cols = ['student_id', 'name']; for (var c = 1; c <= Math.max(3, maxC); c++) cols.push('course' + c);
        var wide = studs.map(function (s) { var r = [s.id, s.name]; for (var c = 0; c < Math.max(3, maxC); c++) r.push(s.cs[c] !== undefined ? s.cs[c] : null); return r; });
        frames.push({ narr: 'The other 0NF shape: a <b>repeating group</b> course1…course' + Math.max(3, maxC) + '. NULLs everywhere, a hard limit on courses, and "who takes SQL?" needs <code>course1=\'SQL\' OR course2=\'SQL\' OR …</code>. Also 0NF.', parts: [{ type: 'table', label: 'students_wide (repeating group)', columns: cols, rows: wide, hl: badAll }] });
        var flat = [], fh = {};
        studs.forEach(function (s, i) {
          var before = flat.length;
          s.cs.forEach(function (cname) { flat.push([s.id, s.name, cname]); });
          fh = {}; for (var k = before; k < flat.length; k++) fh[k] = 'ok';
          var zh = {}; zh[i] = 'cur';
          frames.push({ narr: s.cs.length ? 'Explode <b>' + s.name + '</b>: ' + s.cs.length + ' value(s) → ' + s.cs.length + ' row(s), one course per row.' : '<b>' + s.name + '</b> has no courses → no rows in the flat version (we would lose ' + s.name + ' entirely — keep that in mind!).', parts: [{ type: 'table', label: 'students_0nf', columns: ['student_id', 'name', 'courses'], rows: zero, hl: zh }, { type: 'table', label: 'exploded rows (1NF, key = student_id + course)', columns: ['student_id', 'name', 'course'], rows: flat.map(function (r) { return r.slice(); }), hl: fh }] });
        });
        var rep = {}; flat.forEach(function (r, i) { var n = flat.filter(function (x) { return x[0] === r[0]; }).length; if (n > 1) rep[i] = 'bad'; });
        frames.push({ narr: 'This flat table <b>is</b> 1NF (atomic cells, key = (student_id, course)). But look: <b>name repeats</b> for every course (red) — that is a partial dependency (student_id → name), the 2NF problem. And a student with zero courses vanished.', parts: [{ type: 'table', label: 'flat 1NF table', columns: ['student_id', 'name', 'course'], rows: flat, hl: rep }, fdGraph(['student_id', 'name', 'course'], [{ l: ['student_id'], r: ['name'] }], false, { fdHl: { 0: 'bad' } })] });
        var sc = flat.map(function (r) { return [r[0], r[2]]; }), sch = {}; sc.forEach(function (_, i) { sch[i] = 'ok'; });
        frames.push({ narr: 'Better 1NF design: <b>parent + child</b>. <code>students</code> keeps one row per student (Dara survives). <code>student_courses</code> has one row per (student, course) with a foreign key back.', parts: [{ type: 'table', label: 'students', columns: ['student_id (PK)', 'name'], rows: studs.map(function (s) { return [s.id, s.name]; }) }, { type: 'table', label: 'student_courses  PK(student_id, course)', columns: ['student_id (FK)', 'course'], rows: sc, hl: sch }] });
        var counts = {}; flat.forEach(function (r) { counts[r[2]] = (counts[r[2]] || 0) + 1; });
        var cr = Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a] || (a < b ? -1 : 1); }).map(function (k) { return [k, counts[k]]; });
        frames.push({ narr: 'Payoff: "students per course" is now a plain <code>GROUP BY course</code> — exact matches, indexable, and a course can even get a foreign key to a <code>courses</code> table.', parts: [{ type: 'code', label: 'query', lang: 'sql', code: 'SELECT course, COUNT(*) AS students\nFROM student_courses\nGROUP BY course\nORDER BY students DESC;', hl: { 3: 'cur' } }, { type: 'table', label: 'result', columns: ['course', 'students'], rows: cr, hl: { 0: 'sel' } }] });
        return frames;
      }
    },
    examples: [
      { title: 'Three phone columns → contact_phones', html: `<p><code>customers(id, name, phone1, phone2, phone3)</code>. A customer with 4 numbers forces an ALTER TABLE; "find the customer with phone 98450" needs 3 OR conditions and 3 indexes. Fix: <code>customer_phones(customer_id, phone, kind)</code> with PK (customer_id, phone) — unlimited numbers, one index, and you can add <code>kind IN ('mobile','work')</code> as a CHECK.</p>` },
      { title: 'The LIKE trap on list columns', html: `<p><code>WHERE skills LIKE '%SQL%'</code> on <code>skills = 'NoSQL, Go'</code> returns a match — wrong. Fixing it with <code>',' || skills || ',' LIKE '%,SQL,%'</code> breaks on spaces after commas. A 1NF child table turns it into <code>WHERE skill = 'SQL'</code>: exact, indexable, and constrainable.</p>`, code: { lang: 'sql', code: `CREATE TABLE devs (id INTEGER PRIMARY KEY, name TEXT, skills TEXT);
INSERT INTO devs VALUES (1, 'Asha', 'SQL, Java'), (2, 'Ben', 'NoSQL, Go');
SELECT name AS wrongly_matched FROM devs WHERE skills LIKE '%SQL%';   -- Asha AND Ben (Ben is a false hit)

CREATE TABLE dev_skills (dev_id INTEGER NOT NULL, skill TEXT NOT NULL, PRIMARY KEY (dev_id, skill));
INSERT INTO dev_skills VALUES (1, 'SQL'), (1, 'Java'), (2, 'NoSQL'), (2, 'Go');
SELECT d.name AS correctly_matched FROM devs d JOIN dev_skills s ON s.dev_id = d.id WHERE s.skill = 'SQL';` } },
      { title: 'Is a JSON / array column a 1NF violation?', html: `<p>Strict theory says yes (a non-atomic value). Practice says: it depends on use. PostgreSQL <code>text[]</code> or <code>jsonb</code> with a GIN index is fine for <b>tags you only display or filter by containment</b>. It is <b>wrong</b> for anything that needs referential integrity (a tag must exist in a tags table), uniqueness across rows, or per-element updates by many writers. Rule of thumb: if an element has its own attributes or relationships, it deserves a row.</p>` },
      { title: 'Atomic for whom? Names and addresses', html: `<p><code>full_name = 'Asha Rao'</code> is atomic for a greeting e-mail but not for "sort by surname" — store <code>given_name</code> and <code>family_name</code> if that is a requirement (and remember many cultures do not fit two fields). <code>address = '12 MG Road, Pune 411001'</code> is fine for a label printer but not for delivery-zone pricing by pincode. 1NF is decided by the <b>queries</b>, not by the string.</p>` }
    ],
    deepDive: `<h4>🟣 Codd's original 1NF and the "relation-valued attribute" debate</h4>
<p>Codd (1970) defined normalization as eliminating <b>non-simple domains</b> — attributes whose values are themselves relations. Later, C. J. Date argued that "atomic" has no absolute meaning (a string is a list of characters; a date has parts) and that a domain may even be relation-valued as long as operators treat it as a value. The practical consensus in 2026: 1NF means <b>no repeating groups and every value is treated as a single value by the operations you run on it</b>. If you ever need to look inside, normalize.</p>
<h4>Row uniqueness is part of 1NF</h4>
<p>A table with duplicate rows is a <b>bag</b>, not a relation. SQL allows bags (a table with no key), which breaks set reasoning: deleting "one of two identical rows" is impossible without ctid/rowid hacks, and COUNT results become meaningless. Always declare a key — even on staging and junction tables.</p>
<h4>Performance reality</h4>
<p>Child tables cost a join, but the join is on an indexed FK and returns few rows per parent. Arrays and JSON columns win when you always read the whole list with the parent and never query by element; they lose badly on "find parents having element X" without specialized indexes, and on concurrent updates (two sessions appending to the same array rewrite the same row → lock contention or lost updates in read-modify-write code).</p>
<h4>Document databases</h4>
<p>MongoDB embeds arrays by design — the 1NF "violation" is intentional, optimized for "read the whole aggregate at once". It is a denormalization decision (topic 8), and the same trade-offs apply: great for bounded lists owned by one parent, bad for unbounded lists or many-to-many relationships.</p>`,
    aiEra: `<p><b>What AI changes:</b> LLM extraction pipelines love to output lists — <code>"skills": ["SQL", "Go"]</code> — and code assistants often map them straight to a TEXT or JSON column. You will be cleaning up 0NF data produced by AI agents more often than by humans.</p>
<p><b>Use AI as a partner:</b> ask it to write the splitting migration for your dialect (<code>string_to_array</code>, <code>STRING_SPLIT</code>, <code>json_each</code>), then test it on edge cases it tends to forget: empty string, trailing comma, extra spaces, duplicates inside one cell, and NULL. Also ask it to <b>normalize vocabularies</b> ("Postgres", "PostgreSQL", "postgres") before loading the child table — LLMs are genuinely good at that fuzzy clean-up.</p>
<p><b>Where AI goes wrong:</b> it "explodes" lists into the same table (creating 2NF redundancy), forgets that rows with an empty list disappear, and suggests <code>LIKE '%x%'</code> searches. <b>What you must still own:</b> deciding when a JSON array is acceptable and when the element needs its own table with constraints.</p>`,
    problems: [{
      title: 'Pizza Orders with a Toppings List',
      level: 'Easy', tags: ['1NF', 'multi-valued attribute', 'migration'], companies: ['Domino\'s', 'Swiggy', 'Zomato'],
      statement: `<p>A pizza shop stores <code>orders(order_id, customer, toppings)</code> where toppings is text like <code>'cheese, pepperoni'</code>. The owner asks "how many orders had <b>pepper</b>?" and the query <code>LIKE '%pepper%'</code> returns too many. Explain why the table is not in 1NF, then write SQL that creates a 1NF design, migrates the data and answers the question correctly.</p>`,
      constraints: `<p>SQLite. Toppings are separated by commas with optional spaces. An order can have zero toppings. The same topping must not appear twice in one order.</p>`,
      example: `<p>Orders: 1 → "cheese, pepper", 2 → "pepperoni", 3 → "pepper, onion, pepperoni".<br>LIKE '%pepper%' returns ${H.c('r', '3 orders')} (order 2 has only pepperoni). Correct answer: ${H.c('g', '2 orders')} (1 and 3).</p>`,
      brute: {
        why: `<p>Keeping the list column means every question becomes string matching. <code>LIKE '%pepper%'</code> matches <b>pepperoni</b>; adding commas around it breaks on spaces; no index can help a leading wildcard, so it scans every row; and nothing stops a typo like "peper".</p>`,
        code: `CREATE TABLE orders (order_id INTEGER PRIMARY KEY, customer TEXT NOT NULL, toppings TEXT);
INSERT INTO orders VALUES (1, 'Asha', 'cheese, pepper'), (2, 'Ben', 'pepperoni'), (3, 'Chen', 'pepper, onion, pepperoni');
SELECT COUNT(*) AS orders_with_pepper_WRONG
FROM orders WHERE toppings LIKE '%pepper%';      -- 3: order 2 is a false positive`
      },
      mcq: { q: 'Why is <code>toppings = \'cheese, pepper\'</code> a 1NF violation?', options: ['One cell holds several values (a list)', 'The table has no primary key', 'Text columns are not allowed in 1NF', 'Because pepper is a substring of pepperoni'], answer: 0, explain: '1NF requires one atomic value per cell; the substring problem is a symptom, not the definition.' },
      hints: [`<p>Hint 1: Each topping in an order is its own fact: "order 3 has onion". Facts belong in rows, not inside a string.</p>`, `<p>Hint 2: Create order_toppings(order_id, topping) with a composite primary key; optionally a toppings lookup table for valid names.</p>`, `<p>Hint 3: Migrate with a recursive CTE that peels text up to the first comma, TRIM it, skip empty items. Then count with <code>WHERE topping = 'pepper'</code>.</p>`],
      tests: { cmp: 'exact', engine: 'sqlite', cases: [
          { cols: ['order_id', 'customer', 'toppings'], rows: [[1, 'Asha', 'cheese, pepper'], [2, 'Ben', 'pepperoni'], [3, 'Chen', 'onion, pepper, pepperoni'], [4, 'Dara', '(plain)']] },
          { after: 'SELECT COUNT(*) FROM order_toppings WHERE topping = \'pepper\'', rows: [[2]] },
          { after: 'SELECT COUNT(*) FROM order_toppings WHERE topping = \'pepperoni\'', rows: [[2]] },
          { after: 'SELECT order_id, topping FROM order_toppings ORDER BY order_id, topping', rows: [[1, 'cheese'], [1, 'pepper'], [2, 'pepperoni'], [3, 'onion'], [3, 'pepper'], [3, 'pepperoni']] },
          { after: 'SELECT name FROM toppings ORDER BY name', rows: [['cheese'], ['onion'], ['pepper'], ['pepperoni']] },
          { after: 'SELECT COUNT(*) FROM orders', rows: [[4]] },
          { after: 'INSERT INTO order_toppings VALUES (1, \'cheese\')', error: 'UNIQUE' },
          { after: 'INSERT INTO order_toppings VALUES (1, \'anchovy\')', error: 'FOREIGN KEY' },
          { after: 'INSERT INTO order_toppings VALUES (99, \'cheese\')', error: 'FOREIGN KEY' },
          { after: 'DELETE FROM orders WHERE order_id = 3; SELECT COUNT(*) FROM order_toppings', rows: [[3]] },
          { after: 'INSERT INTO toppings VALUES (\'anchovy\'); INSERT INTO order_toppings VALUES (4, \'anchovy\'); SELECT COUNT(*) FROM order_toppings WHERE order_id = 4', rows: [[1]] }
        ] },
      solution: {
        approach: `<p>Create a <b>toppings</b> lookup (so only valid names exist), keep <b>orders</b> without the list, and add a junction table <b>order_toppings</b> with PK (order_id, topping) — that PK also prevents duplicate toppings per order. Migrate the old text with a recursive splitting CTE (TRIM handles spaces; the WHERE skips empty strings so zero-topping orders produce no rows but the order itself survives in <code>orders</code>). The question becomes an exact-match count on an indexed column.</p>`,
        code: `PRAGMA foreign_keys = ON;
CREATE TABLE orders_old (order_id INTEGER PRIMARY KEY, customer TEXT NOT NULL, toppings TEXT);
INSERT INTO orders_old VALUES (1, 'Asha', 'cheese, pepper'), (2, 'Ben', 'pepperoni'),
                              (3, 'Chen', 'pepper, onion, pepperoni'), (4, 'Dara', '');

CREATE TABLE toppings (name TEXT PRIMARY KEY);
CREATE TABLE orders   (order_id INTEGER PRIMARY KEY, customer TEXT NOT NULL);
CREATE TABLE order_toppings (
  order_id INTEGER NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
  topping  TEXT    NOT NULL REFERENCES toppings(name),
  PRIMARY KEY (order_id, topping)
);
CREATE INDEX idx_order_toppings_topping ON order_toppings(topping);   -- "orders with X" lookups

INSERT INTO orders SELECT order_id, customer FROM orders_old;

CREATE TEMP TABLE split_rows AS
WITH RECURSIVE split(order_id, item, rest) AS (
  SELECT order_id, '', COALESCE(toppings, '') || ',' FROM orders_old
  UNION ALL
  SELECT order_id, TRIM(SUBSTR(rest, 1, INSTR(rest, ',') - 1)), SUBSTR(rest, INSTR(rest, ',') + 1)
  FROM split WHERE rest <> ''
)
SELECT DISTINCT order_id, LOWER(item) AS topping FROM split WHERE item <> '';

INSERT INTO toppings SELECT DISTINCT topping FROM split_rows;
INSERT INTO order_toppings SELECT order_id, topping FROM split_rows;

SELECT COUNT(*) AS orders_with_pepper FROM order_toppings WHERE topping = 'pepper';   -- 2
SELECT o.order_id, o.customer, COALESCE(GROUP_CONCAT(t.topping, ', '), '(plain)') AS toppings
FROM orders o LEFT JOIN order_toppings t ON t.order_id = o.order_id
GROUP BY o.order_id ORDER BY o.order_id;`,
        complexity: `<p>Migration: O(total characters). Query: an index lookup on <code>topping</code> — O(log N + matches) instead of a full scan with string matching.</p>`,
        followUps: ['Toppings now have prices and an extra-cheese count — where do those columns go?', 'How would you migrate with zero downtime while the old app still writes the text column?']
      }
    }]
  });

  /* =====================================================================
     TOPIC 4 — 2NF: no partial dependencies
     ===================================================================== */
  topics.push({
    title: '2NF: Kill Partial Dependencies (the Whole Key)',
    analogy: `<p>A class attendance sheet is keyed by <b>(student, date)</b> — one tick per student per day. Someone also writes the student's <b>home address</b> on every line. The address has nothing to do with the date; it depends on <b>only half</b> of the key. Thirty school days → thirty copies of the address. 2NF says: <b>a fact must depend on the whole key, not part of it</b>. Move the address to a "students" page.</p>`,
    explain: `<p><b>🟢 The plain idea.</b> 2NF only matters when a table's key has <b>more than one column</b>. A <b>partial dependency</b> is a non-key column that depends on <b>just part</b> of a composite key. The rule:</p>
<p style="padding-left:1em"><b>2NF</b> = 1NF <b>and</b> no non-prime attribute is partially dependent on any candidate key.</p>
<p>Our order-lines table, key = (order_id, sku):</p>
${H.table(['column', 'depends on', 'full or partial?'], [
  ['qty', '(order_id, sku)', H.c('g', 'full ✔')],
  ['order_date, customer', 'order_id only', H.c('r', 'partial ✘')],
  ['product_name, unit_price', 'sku only', H.c('r', 'partial ✘')]])}
<p>Every partial dependency is a redundancy: the order date is copied for every line of the order, the product price for every order that contains it.</p>
<p><b>🔵 How it really works — the recipe:</b></p>
<ol>
<li>Write down the candidate keys (closure, topic 2). If every key is a <b>single column</b>, the table is automatically in 2NF — stop.</li>
<li>For each <b>proper subset</b> S of a composite key, compute S⁺. Any <b>non-prime</b> attribute in S⁺ is partially dependent on the key.</li>
<li>Move S plus everything it determines into a new table with key S. Leave S behind in the original table as a foreign key.</li>
<li>The original table keeps the full key and the fully dependent columns.</li>
</ol>
${H.table(['after the split', 'key', 'columns'], [['orders', 'order_id', 'order_date, customer, city'], ['products', 'sku', 'product_name, unit_price'], ['order_items', '(order_id, sku)', 'qty']])}
<p>Every split here is <b>lossless</b>: the shared column (order_id or sku) is the key of the new table, so joining back gives exactly the original rows (topic 7 proves it).</p>
<p><b>Watch out:</b> 2NF says nothing about dependencies <b>between non-key columns</b>. <code>orders</code> above still has customer → city — that is a <b>transitive</b> dependency, fixed by 3NF in the next topic. Also, prime attributes are exempt: if a part of one key determines a column that belongs to another key, 2NF does not complain (BCNF will).</p>`,
    clues: [
      'A composite primary key (junction / line-item / enrollment / attendance tables) plus descriptive columns → check 2NF',
      '"Product name and price are repeated on every order line" → partial dependency on sku',
      '"Is a table with a single-column primary key always in 2NF?" → yes, if it is in 1NF and has no other composite candidate key',
      '"Convert this to 2NF" — find each proper subset of the key that determines non-prime columns',
      'Interview phrase "every non-key attribute must depend on the whole key" — the 2NF slogan',
      'Exploded 1NF tables (list → rows in the same table) usually violate 2NF immediately'
    ],
    code: [{ lang: 'sql', db: 'messy', title: 'Migrate orders_flat to 2NF and prove nothing was lost', code: `-- 2NF target tables (city still sits in orders: that's a 3NF issue, next topic)
CREATE TABLE products (
  sku TEXT PRIMARY KEY, product_name TEXT NOT NULL, unit_price INTEGER NOT NULL);
CREATE TABLE orders (
  order_id INTEGER PRIMARY KEY, order_date TEXT NOT NULL,
  customer_email TEXT NOT NULL, customer_name TEXT NOT NULL, customer_city TEXT NOT NULL);
CREATE TABLE order_items (
  order_id INTEGER NOT NULL REFERENCES orders(order_id),
  sku      TEXT    NOT NULL REFERENCES products(sku),
  qty      INTEGER NOT NULL,
  PRIMARY KEY (order_id, sku));

-- Each partial dependency becomes a SELECT DISTINCT on (part of key, what it determines)
INSERT INTO products SELECT DISTINCT product_sku, product_name, unit_price FROM orders_flat;
INSERT INTO orders   SELECT DISTINCT order_id, order_date, customer_email, customer_name, customer_city FROM orders_flat;
INSERT INTO order_items SELECT order_id, product_sku, qty FROM orders_flat;
-- (If a SELECT DISTINCT produced two rows for one key, the PK would reject it: the FD was false in the data!)

-- Lossless check: rejoin and compare both directions. Both counts must be 0.
WITH rejoined AS (
  SELECT o.order_id, o.order_date, o.customer_email, o.customer_name, o.customer_city,
         p.sku, p.product_name, p.unit_price, i.qty
  FROM order_items i JOIN orders o USING (order_id) JOIN products p USING (sku))
SELECT (SELECT COUNT(*) FROM (SELECT * FROM orders_flat EXCEPT SELECT * FROM rejoined)) AS rows_lost,
       (SELECT COUNT(*) FROM (SELECT * FROM rejoined EXCEPT SELECT * FROM orders_flat)) AS rows_invented,
       (SELECT COUNT(*) FROM products) AS product_rows,
       (SELECT COUNT(*) FROM orders)   AS order_rows;` },
    { lang: 'sql', db: 'messy', title: 'Detect partial dependencies in data before you split', code: `-- For key (order_id, product_sku): does order_id alone determine the order columns?
SELECT 'order_id -> order_date, customer_email' AS candidate_fd,
       SUM(cnt > 1) AS violating_groups
FROM (SELECT order_id, COUNT(DISTINCT order_date || '|' || customer_email) AS cnt
      FROM orders_flat GROUP BY order_id)
UNION ALL
-- Does product_sku alone determine name and price?
SELECT 'product_sku -> product_name, unit_price', SUM(cnt > 1)
FROM (SELECT product_sku, COUNT(DISTINCT product_name || '|' || unit_price) AS cnt
      FROM orders_flat GROUP BY product_sku);
-- 0 violations = the partial dependency holds in today's data → candidate for a split` }],
    codeTitle: ['Split to 2NF + lossless check', 'Find partial dependencies with GROUP BY'],
    viz: {
      title: 'Order lines → 2NF, one partial dependency at a time',
      gen: function () {
        var cols = ['order_id', 'sku', 'qty', 'order_date', 'customer', 'city', 'product', 'price'];
        var rows = [
          [101, 'P-LAMP', 1, '03-01', 'Asha', 'Pune', 'Desk Lamp', 1200],
          [101, 'P-MUG', 2, '03-01', 'Asha', 'Pune', 'Coffee Mug', 300],
          [102, 'P-MUG', 4, '03-02', 'Ben', 'Delhi', 'Coffee Mug', 300],
          [103, 'P-PEN', 10, '03-05', 'Asha', 'Pune', 'Gel Pen', 50],
          [104, 'P-CHAIR', 1, '03-07', 'Chen', 'Mumbai', 'Ergo Chair', 9000],
          [105, 'P-LAMP', 2, '03-09', 'Ben', 'Delhi', 'Desk Lamp', 1200]
        ];
        var fds = [{ l: ['order_id', 'sku'], r: ['qty'] }, { l: ['order_id'], r: ['order_date', 'customer'] }, { l: ['customer'], r: ['city'] }, { l: ['sku'], r: ['product', 'price'] }];
        var f = [];
        f.push({ narr: 'A 1NF table: atomic cells, key = <b>(order_id, sku)</b>. Is it 2NF? We must check whether any non-key column depends on only <b>part</b> of the key.', parts: [{ type: 'table', label: 'order_lines  KEY (order_id, sku)', columns: cols, rows: rows }] });
        f.push({ narr: 'Draw the FDs. qty needs the whole key (green). But order_id alone → order_date, customer, and sku alone → product, price (red): <b>partial dependencies</b>.', parts: [fdGraph(['order_id', 'sku', 'qty', 'order_date', 'customer', 'city', 'product', 'price'], fds, false, { fdHl: { 0: 'ok', 1: 'bad', 3: 'bad' }, attrHl: { order_id: 'sel', sku: 'sel' } })] });
        f.push({ narr: 'Partial dependency #1 in the data: sku → product, price. "Desk Lamp, 1200" appears in rows 0 and 5; "Coffee Mug, 300" in rows 1 and 2. Change a price → must touch every order line.', parts: [{ type: 'table', label: 'order_lines', columns: cols, rows: rows, hl: { 0: 'bad', 5: 'bad', 1: 'cur', 2: 'cur' } }] });
        var prods = [['P-LAMP', 'Desk Lamp', 1200], ['P-MUG', 'Coffee Mug', 300], ['P-PEN', 'Gel Pen', 50], ['P-CHAIR', 'Ergo Chair', 9000]];
        var r1 = rows.map(function (r) { return r.slice(0, 6); });
        f.push({ narr: 'Split it out: <code>products(sku PK, product, price)</code> = SELECT DISTINCT sku, product, price. sku <b>stays behind</b> as a foreign key so we can join back.', parts: [{ type: 'table', label: 'products (new)', columns: ['sku', 'product', 'price'], rows: prods, hl: { 0: 'ok', 1: 'ok', 2: 'ok', 3: 'ok' } }, { type: 'table', label: 'order_lines (product columns removed)', columns: cols.slice(0, 6), rows: r1 }] });
        f.push({ narr: 'Partial dependency #2: order_id → order_date, customer (and city rides along). Order 101 has two lines, so its date, customer and city are stored twice (red).', parts: [{ type: 'table', label: 'order_lines', columns: cols.slice(0, 6), rows: r1, hl: { 0: 'bad', 1: 'bad' } }] });
        var ords = [[101, '03-01', 'Asha', 'Pune'], [102, '03-02', 'Ben', 'Delhi'], [103, '03-05', 'Asha', 'Pune'], [104, '03-07', 'Chen', 'Mumbai'], [105, '03-09', 'Ben', 'Delhi']];
        f.push({ narr: 'Split it out: <code>orders(order_id PK, order_date, customer, city)</code>. Everything that order_id determines (directly or through customer) goes together.', parts: [{ type: 'table', label: 'orders (new)', columns: ['order_id', 'order_date', 'customer', 'city'], rows: ords, hl: { 0: 'ok', 1: 'ok', 2: 'ok', 3: 'ok', 4: 'ok' } }] });
        var items = rows.map(function (r) { return [r[0], r[1], r[2]]; });
        f.push({ narr: 'What is left: <code>order_items(order_id, sku, qty)</code>. qty depends on the <b>whole</b> key — no partial dependency remains. <b>All three tables are in 2NF.</b>', parts: [{ type: 'table', label: 'order_items  KEY (order_id, sku)', columns: ['order_id', 'sku', 'qty'], rows: items, hl: { 0: 'ok', 1: 'ok', 2: 'ok', 3: 'ok', 4: 'ok', 5: 'ok' } }, { type: 'table', label: 'products', columns: ['sku', 'product', 'price'], rows: prods }, { type: 'table', label: 'orders', columns: ['order_id', 'order_date', 'customer', 'city'], rows: ords }] });
        f.push({ narr: 'Lossless? Join order_items ⋈ orders (on order_id, the key of orders) ⋈ products (on sku, the key of products). Each line finds exactly one partner → the 6 original rows come back, no extras.', parts: [{ type: 'code', label: 'rejoin', lang: 'sql', code: 'SELECT *\nFROM order_items i\nJOIN orders   o USING (order_id)  -- key of orders\nJOIN products p USING (sku);      -- key of products', hl: { 3: 'ok', 4: 'ok' } }, { type: 'table', label: 'rejoined = original (6 rows)', columns: cols, rows: rows, hl: { 0: 'ok', 1: 'ok', 2: 'ok', 3: 'ok', 4: 'ok', 5: 'ok' } }] });
        f.push({ narr: 'But 2NF is not the finish line. In <code>orders</code>, customer → city: Asha + Pune is still stored for orders 101 <b>and</b> 103 (amber). That is a <b>transitive</b> dependency — 3NF fixes it next.', parts: [{ type: 'table', label: 'orders (2NF, not yet 3NF)', columns: ['order_id', 'order_date', 'customer', 'city'], rows: ords, hl: { 0: 'cur', 2: 'cur' } }, fdGraph(['order_id', 'order_date', 'customer', 'city'], [{ l: ['order_id'], r: ['order_date', 'customer'] }, { l: ['customer'], r: ['city'] }], false, { fdHl: { 1: 'cur' } })] });
        return f;
      }
    },
    examples: [
      { title: 'Single-column key → automatically 2NF', html: `<p><code>employees(emp_id PK, name, dept_id, dept_name)</code>. The only key is emp_id — a single column has no proper non-empty subset, so a partial dependency is impossible. The table is in 2NF even though dept_name is clearly redundant: that is a <b>3NF</b> problem (dept_id → dept_name), not a 2NF one. Interviewers love this trap.</p>` },
      { title: 'Two candidate keys: check both', html: `<p><code>flights(flight_no, flight_date, tail_number, departure_ts, aircraft_model)</code> with keys (flight_no, flight_date) <b>and</b> (tail_number, departure_ts) — one plane can't take off twice at the same instant — and tail_number → aircraft_model. aircraft_model depends on <b>part</b> of the second key → 2NF violation, even though it looks fine relative to the primary key you picked. 2NF is defined against <b>every</b> candidate key.</p>` },
      { title: 'Prime attributes are exempt', html: `<p>R(student, subject, tutor) with keys (student, subject) and (student, tutor), and tutor → subject. tutor is part of a key and subject is <b>prime</b>, so 2NF (and even 3NF) is satisfied. The redundancy ("tutor T teaches maths" repeated per student) survives until BCNF. 2NF and 3NF only police <b>non-prime</b> columns.</p>` },
      { title: 'Data check before splitting', html: `<p>Before moving <code>course_title</code> out of <code>enrollments</code>, run <code>SELECT course_id FROM enrollments GROUP BY course_id HAVING COUNT(DISTINCT course_title) &gt; 1</code>. If a course has two spellings, the split's PK will reject the migration — clean the data first (pick the canonical title) and only then run <code>INSERT INTO courses SELECT DISTINCT …</code>.</p>`, code: { lang: 'sql', code: `CREATE TABLE enrollments (student_id INT, course_id TEXT, grade TEXT, course_title TEXT, PRIMARY KEY (student_id, course_id));
INSERT INTO enrollments VALUES (1, 'DB1', 'A', 'Databases'), (2, 'DB1', 'B', 'Data Bases'), (2, 'OS1', 'A', 'Operating Systems');
-- Dirty data: DB1 has two titles, so course_id -> course_title is violated in the data
SELECT course_id, GROUP_CONCAT(DISTINCT course_title) AS titles_seen
FROM enrollments GROUP BY course_id HAVING COUNT(DISTINCT course_title) > 1;` } }
    ],
    deepDive: `<h4>🟣 Full functional dependency, formally</h4>
<p>X → A is <b>full</b> if no proper subset X' ⊂ X has X' → A. A non-prime A violates 2NF iff some candidate key K has a proper subset S with A ∈ S⁺. Algorithmically: for every candidate key K with |K| ≥ 2 and every proper non-empty subset S, compute S⁺ and intersect with the non-prime set. For textbook sizes that is a handful of closures.</p>
<h4>Why 2NF is "historical" but still asked</h4>
<p>Codd introduced 2NF and 3NF together (1971) as stepping stones. In practice designers jump straight to 3NF/BCNF, and 3NF implies 2NF (a partial dependency on a key is a special case of "non-superkey determinant → non-prime attribute"). Interviews still ask about 2NF because it tests whether you understand <b>composite keys</b> and <b>prime vs non-prime</b> attributes.</p>
<h4>Surrogate keys can hide 2NF problems</h4>
<p>If you add <code>id INTEGER PRIMARY KEY</code> to the order-lines table, the "only key" looks single-column and the table appears to be 2NF. It is not: (order_id, sku) is still a <b>candidate key</b> (and should be declared UNIQUE), and sku → price is still a partial dependency on it. A surrogate key changes the label, not the dependencies — normal forms are about <b>all</b> candidate keys.</p>
<h4>Snapshots vs partial dependencies</h4>
<p>Real order lines usually keep <code>unit_price_at_sale</code>. That column depends on (order_id, sku) — the price <b>in that order</b> — so it is fully dependent and perfectly 2NF. Only the <b>current catalogue price</b> depends on sku alone. Name columns so the dependency is obvious.</p>`,
    aiEra: `<p><b>What AI changes:</b> asking an assistant "normalize this to 2NF" usually produces a correct split for textbook tables in seconds. The value you add is checking <b>which</b> dependencies are real and catching the cases models routinely get wrong.</p>
<p><b>Use AI as a partner:</b> give it the column list plus your business rules and ask for (1) candidate keys, (2) each partial dependency with the key subset it uses, (3) the migration SQL with <code>SELECT DISTINCT</code>, and (4) an <code>EXCEPT</code>-based lossless check. Run the check — if a <code>SELECT DISTINCT</code> produces two rows per key, your data disagrees with the "rule".</p>
<p><b>Where AI goes wrong:</b> it calls single-key tables "not 2NF" because of transitive dependencies (mixing up 2NF and 3NF), ignores secondary candidate keys hidden behind a surrogate id, and moves snapshot columns like price-at-sale into the product table. <b>What you must still own:</b> the definitions — whole key, every candidate key, non-prime only.</p>`,
    problems: [{
      title: 'Course Enrollments to 2NF',
      level: 'Medium', tags: ['2NF', 'partial dependency', 'composite key'], companies: ['Infosys', 'Coursera', 'Google'],
      statement: `<p><code>enrollments(student_id, course_id, grade, student_name, student_email, course_title, credits)</code>, key (student_id, course_id). Rules: a student has one name and email; a course has one title and credit value; a grade belongs to a student in a course. Identify every partial dependency and decompose to 2NF with SQL. Show that the rejoin gives back exactly the original rows.</p>`,
      constraints: `<p>SQLite. Use primary and foreign keys so the rules are enforced. Include a lossless check with <code>EXCEPT</code> in both directions.</p>`,
      example: `<p>Rows (1, DB1, A, Asha, a@x, Databases, 4) and (1, OS1, B, Asha, a@x, Operating Systems, 3): ${H.c('r', 'Asha, a@x')} copied twice (student_id → name, email); DB1's title/credits copied for every student in DB1 (course_id → title, credits).</p>`,
      brute: {
        why: `<p>One table means renaming a course touches every enrollment row, a course with no students can't exist, and dropping the last student from a course deletes the course's title and credits. Each partial dependency multiplies a fact by the number of rows sharing that half of the key.</p>`,
        code: `CREATE TABLE enrollments (
  student_id INTEGER NOT NULL, course_id TEXT NOT NULL, grade TEXT,
  student_name TEXT NOT NULL, student_email TEXT NOT NULL,
  course_title TEXT NOT NULL, credits INTEGER NOT NULL,
  PRIMARY KEY (student_id, course_id));
INSERT INTO enrollments VALUES
  (1, 'DB1', 'A', 'Asha', 'a@x', 'Databases', 4),
  (1, 'OS1', 'B', 'Asha', 'a@x', 'Operating Systems', 3),
  (2, 'DB1', 'A', 'Ben',  'b@x', 'Databases', 4);
-- Credits change for DB1: an update that misses rows creates two "truths"
UPDATE enrollments SET credits = 5 WHERE course_id = 'DB1' AND student_id = 1;
SELECT course_id, GROUP_CONCAT(DISTINCT credits) AS credits_on_file FROM enrollments GROUP BY course_id;`
      },
      mcq: { q: 'Which dependency is NOT partial?', options: ['(student_id, course_id) → grade', 'student_id → student_name', 'course_id → credits', 'course_id → course_title'], answer: 0, explain: 'A grade needs both the student and the course — it depends on the whole key.' },
      hints: [`<p>Hint 1: The key has two parts. Ask of each non-key column: "do I need both student_id and course_id to know this?"</p>`, `<p>Hint 2: student_id → name, email (partial). course_id → title, credits (partial). Only grade needs both.</p>`, `<p>Hint 3: Tables: students(student_id PK, …), courses(course_id PK, …), enrollments(student_id FK, course_id FK, grade, PK both). Migrate with SELECT DISTINCT, check with EXCEPT both ways.</p>`],
      tests: { cmp: 'exact', engine: 'sqlite', cases: [
          { cols: ['rows_lost', 'rows_invented'], rows: [[0, 0]] },
          { after: 'SELECT COUNT(*) FROM (SELECT * FROM enrollments_old EXCEPT SELECT e.student_id, e.course_id, e.grade, s.student_name, s.student_email, c.course_title, c.credits FROM enrollments e JOIN students s USING (student_id) JOIN courses c USING (course_id))', rows: [[0]] },
          { after: 'SELECT COUNT(*) FROM (SELECT e.student_id, e.course_id, e.grade, s.student_name, s.student_email, c.course_title, c.credits FROM enrollments e JOIN students s USING (student_id) JOIN courses c USING (course_id) EXCEPT SELECT * FROM enrollments_old)', rows: [[0]] },
          { after: 'SELECT (SELECT COUNT(*) FROM students), (SELECT COUNT(*) FROM courses), (SELECT COUNT(*) FROM enrollments)', rows: [[2, 2, 3]] },
          { after: 'UPDATE students SET student_name = \'Asha K\' WHERE student_id = 1; SELECT COUNT(*) FROM enrollments e JOIN students s USING (student_id) WHERE s.student_name = \'Asha K\'', rows: [[2]] },
          { after: 'UPDATE courses SET credits = 5 WHERE course_id = \'DB1\'; SELECT COUNT(*) FROM enrollments e JOIN courses c USING (course_id) WHERE c.credits = 5', rows: [[2]] },
          { after: 'INSERT INTO courses VALUES (\'NET1\',\'Networks\',3); SELECT COUNT(*) FROM courses', rows: [[3]] },
          { after: 'INSERT INTO enrollments VALUES (2, \'OS1\', NULL); SELECT COUNT(*) FROM enrollments', rows: [[4]] },
          { after: 'INSERT INTO students VALUES (3, \'Clone\', \'a@x\')', error: 'UNIQUE' },
          { after: 'INSERT INTO courses VALUES (\'X1\',\'Zero\',0)', error: 'CHECK' },
          { after: 'INSERT INTO courses VALUES (\'X1\',\'Eleven\',11)', error: 'CHECK' },
          { after: 'INSERT INTO enrollments VALUES (9, \'DB1\', \'A\')', error: 'FOREIGN KEY' },
          { after: 'INSERT INTO enrollments VALUES (1, \'XX9\', \'A\')', error: 'FOREIGN KEY' },
          { after: 'INSERT INTO enrollments VALUES (1, \'DB1\', \'B\')', error: 'UNIQUE' }
        ] },
      solution: {
        approach: `<p>Candidate key: (student_id, course_id). Proper subsets: {student_id}⁺ = {student_id, student_name, student_email}; {course_id}⁺ = {course_id, course_title, credits}. Both contain non-prime attributes → two partial dependencies. Move each subset with what it determines into its own table, keep the full key + grade in enrollments. Because each split shares a column that is a key of the new table, the decomposition is lossless; the EXCEPT queries prove it on the data.</p>`,
        code: `PRAGMA foreign_keys = ON;
CREATE TABLE enrollments_old (
  student_id INTEGER NOT NULL, course_id TEXT NOT NULL, grade TEXT,
  student_name TEXT NOT NULL, student_email TEXT NOT NULL,
  course_title TEXT NOT NULL, credits INTEGER NOT NULL,
  PRIMARY KEY (student_id, course_id));
INSERT INTO enrollments_old VALUES
  (1, 'DB1', 'A', 'Asha', 'a@x', 'Databases', 4),
  (1, 'OS1', 'B', 'Asha', 'a@x', 'Operating Systems', 3),
  (2, 'DB1', 'A', 'Ben',  'b@x', 'Databases', 4);

CREATE TABLE students (student_id INTEGER PRIMARY KEY, student_name TEXT NOT NULL, student_email TEXT NOT NULL UNIQUE);
CREATE TABLE courses  (course_id TEXT PRIMARY KEY, course_title TEXT NOT NULL, credits INTEGER NOT NULL CHECK (credits BETWEEN 1 AND 10));
CREATE TABLE enrollments (
  student_id INTEGER NOT NULL REFERENCES students(student_id),
  course_id  TEXT    NOT NULL REFERENCES courses(course_id),
  grade      TEXT,
  PRIMARY KEY (student_id, course_id));

INSERT INTO students SELECT DISTINCT student_id, student_name, student_email FROM enrollments_old;
INSERT INTO courses  SELECT DISTINCT course_id, course_title, credits FROM enrollments_old;
INSERT INTO enrollments SELECT student_id, course_id, grade FROM enrollments_old;

WITH rejoined AS (
  SELECT e.student_id, e.course_id, e.grade, s.student_name, s.student_email, c.course_title, c.credits
  FROM enrollments e JOIN students s USING (student_id) JOIN courses c USING (course_id))
SELECT (SELECT COUNT(*) FROM (SELECT * FROM enrollments_old EXCEPT SELECT * FROM rejoined)) AS rows_lost,
       (SELECT COUNT(*) FROM (SELECT * FROM rejoined EXCEPT SELECT * FROM enrollments_old)) AS rows_invented;`,
        complexity: `<p>Migration O(N) with DISTINCT (a sort or hash per table). Updates to a course or student are now one row instead of one per enrollment.</p>`,
        followUps: ['Credits can change each semester — how do you model that without losing history?', 'Add a lecturer column: lecturer depends on (course_id, semester). Where does it go?']
      }
    }]
  });

  /* =====================================================================
     TOPIC 5 — 3NF: no transitive dependencies (+ 3NF synthesis)
     ===================================================================== */
  topics.push({
    title: '3NF: Nothing but the Key (Transitive Dependencies & Synthesis)',
    analogy: `<p>Gossip chain: "I know Ravi → Ravi works in Sales → Sales is on floor 3, so Ravi sits on floor 3." If you write "floor 3" next to Ravi's name, you are storing <b>second-hand information</b>. The day Sales moves to floor 4, every second-hand note is stale. 3NF says: <b>store a fact next to the thing it is directly about</b> — the floor belongs with the department, not with each employee.</p>`,
    explain: `<p><b>🟢 The plain idea.</b> A <b>transitive dependency</b> is a chain <code>key → X → Y</code> where X is <b>not</b> a key. Y depends on the key only "through" X. Example: <code>emp_id → dept_id → dept_floor</code>. Storing dept_floor in the employees table repeats it for every employee in that department.</p>
<p><b>3NF</b> (the precise rule, Zaniolo's form): for every non-trivial FD <code>X → A</code> in the table, <b>at least one</b> is true:</p>
<ol>
<li>X is a <b>superkey</b>, or</li>
<li>A is a <b>prime</b> attribute (part of some candidate key).</li>
</ol>
<p>The famous oath: <i>"Every non-key attribute must provide a fact about <b>the key</b> (1NF), <b>the whole key</b> (2NF), and <b>nothing but the key</b> (3NF) — so help me Codd."</i></p>
${H.table(['FD in employees(emp_id, name, dept_id, dept_name, dept_floor)', 'X superkey?', 'A prime?', '3NF ok?'], [
  ['emp_id → name, dept_id', H.c('g', 'yes'), '—', H.c('g', '✔')],
  ['dept_id → dept_name', H.c('r', 'no'), H.c('r', 'no'), H.c('r', '✘ transitive')],
  ['dept_id → dept_floor', H.c('r', 'no'), H.c('r', 'no'), H.c('r', '✘ transitive')]])}
<p><b>Fix:</b> move <code>dept_id → dept_name, dept_floor</code> into <code>departments(dept_id PK, dept_name, dept_floor)</code>; keep dept_id in employees as a foreign key.</p>
<p><b>🔵 How it really works — two ways to reach 3NF.</b></p>
<ul>
<li><b>Decomposition (top-down):</b> repeatedly find a violating FD X → A and split the table into (X ∪ X⁺-stuff) and (the rest with X kept as FK). This is what you do by hand.</li>
<li><b>Synthesis (bottom-up, Bernstein 1976):</b> (1) compute a <b>minimal cover</b> of the FDs; (2) make one table per left side, holding the left side and all its right sides; (3) if no table contains a candidate key of the original relation, add a table that is just a key; (4) drop tables that are subsets of others. The result is <b>always</b> 3NF, <b>lossless</b> and <b>dependency-preserving</b> — a guarantee BCNF cannot give.</li>
</ul>
<p>Worked synthesis on R(A,B,C,D,E), F = {A → BC, B → C, AB → D, D → E}: split right sides → A→B, A→C, B→C, AB→D, D→E. In AB→D, B is extraneous (A⁺ already has D) → A→D. A→C is redundant (A→B→C). Minimal cover: {A→B, B→C, A→D, D→E}. Group by left side: <b>(A, B, D)</b>, <b>(B, C)</b>, <b>(D, E)</b>. A is the key and lives in (A,B,D) → done. Try it in the second visualizer.</p>
<p><b>Derived data is a cousin of transitive dependency.</b> <code>age</code> next to <code>birth_date</code>, or <code>line_total</code> next to <code>qty × unit_price</code>, is a fact you can compute — store it only as a generated column or a deliberate cache.</p>`,
    clues: [
      'A table with a single-column key whose non-key columns describe <b>another</b> thing (department, zip code, category) → transitive dependency',
      '"Employee → department → manager / floor / budget" style chains',
      '"zip → city, state" — the textbook 3NF example (with real-world caveats)',
      '"Every non-key attribute must depend on the key, the whole key and nothing but the key" — 2NF + 3NF in one sentence',
      '"Decompose to 3NF while preserving dependencies" → 3NF synthesis from a minimal cover',
      'Derived/computed columns (age, totals) stored next to their sources — redundancy of the same flavour'
    ],
    code: [{ lang: 'sql', db: 'messy', title: 'emp_flat → 3NF (departments split out)', code: `PRAGMA foreign_keys = ON;
-- emp_id -> dept_id -> (dept_name, dept_floor) is transitive: give departments their own table
CREATE TABLE departments (
  dept_id    TEXT PRIMARY KEY,
  dept_name  TEXT NOT NULL UNIQUE,
  dept_floor INTEGER NOT NULL
);
CREATE TABLE employees (
  emp_id   INTEGER PRIMARY KEY,
  emp_name TEXT NOT NULL,
  dept_id  TEXT NOT NULL REFERENCES departments(dept_id)
);
INSERT INTO departments SELECT DISTINCT dept_id, dept_name, dept_floor FROM emp_flat;
INSERT INTO employees   SELECT emp_id, emp_name, dept_id FROM emp_flat;

UPDATE departments SET dept_floor = 4 WHERE dept_id = 'D1';     -- Sales moves: ONE row
INSERT INTO departments VALUES ('D4', 'Research', 6);           -- no employees yet: allowed
DELETE FROM employees WHERE emp_id = 5;                         -- Legal survives without Eli

SELECT e.emp_name, d.dept_name, d.dept_floor
FROM employees e JOIN departments d USING (dept_id)
ORDER BY e.emp_id;` },
    { lang: 'sql', title: 'Derived data: use a generated column instead of a stored copy', code: `CREATE TABLE order_lines (
  order_id   INTEGER NOT NULL,
  sku        TEXT    NOT NULL,
  qty        INTEGER NOT NULL CHECK (qty > 0),
  unit_price INTEGER NOT NULL CHECK (unit_price > 0),       -- price at time of sale (a real fact)
  line_total INTEGER GENERATED ALWAYS AS (qty * unit_price) VIRTUAL,  -- derived: can never disagree
  PRIMARY KEY (order_id, sku)
);
INSERT INTO order_lines (order_id, sku, qty, unit_price) VALUES (101, 'P-LAMP', 2, 1200), (101, 'P-MUG', 3, 300);
UPDATE order_lines SET qty = 5 WHERE sku = 'P-MUG';            -- line_total follows automatically
SELECT sku, qty, unit_price, line_total FROM order_lines ORDER BY sku;` }],
    codeTitle: ['Split out the transitive dependency', 'Derived columns done right'],
    viz: [{
      title: 'Employees → 3NF: cutting the transitive chain',
      gen: function () {
        var cols = ['emp_id', 'emp_name', 'dept_id', 'dept_name', 'dept_floor'];
        var rows = [[1, 'Asha', 'D1', 'Sales', 3], [2, 'Ben', 'D1', 'Sales', 3], [3, 'Chen', 'D2', 'Engineering', 5], [4, 'Dara', 'D2', 'Engineering', 5], [5, 'Eli', 'D3', 'Legal', 7]];
        var cp = function () { return rows.map(function (r) { return r.slice(); }); };
        var fds = [{ l: ['emp_id'], r: ['emp_name', 'dept_id'] }, { l: ['dept_id'], r: ['dept_name', 'dept_floor'] }];
        var f = [];
        f.push({ narr: 'emp_flat: key = <b>emp_id</b> (one column). It is 1NF and automatically 2NF — no composite key, so no partial dependency. Is it 3NF?', parts: [{ type: 'table', label: 'emp_flat  KEY emp_id', columns: cols, rows: cp() }] });
        f.push({ narr: 'FD arrows: emp_id → dept_id (fine, emp_id is the key) and <b>dept_id → dept_name, dept_floor</b> (red): dept_id is not a key and dept_name/floor are not prime. That chain emp_id → dept_id → floor is a <b>transitive dependency</b>.', parts: [fdGraph(['emp_id', 'emp_name', 'dept_id', 'dept_name', 'dept_floor'], fds, false, { fdHl: { 0: 'ok', 1: 'bad' }, attrHl: { emp_id: 'sel' } })] });
        f.push({ narr: 'In the data: "Sales is on floor 3" is stored twice, "Engineering is on floor 5" twice (amber). Second-hand facts, copied per employee.', parts: [{ type: 'table', label: 'emp_flat', columns: cols, rows: cp(), hl: { 0: 'cur', 1: 'cur', 2: 'win', 3: 'win' } }] });
        var up = cp(); up[0][4] = 4;
        f.push({ narr: '<b>Update anomaly:</b> Sales moves to floor 4; the script updates only Asha\'s row. Ben\'s row still says 3 (red). Which floor is Sales on?', parts: [{ type: 'table', label: 'emp_flat after a partial update', columns: cols, rows: up, hl: { 0: 'ok', 1: 'bad' } }] });
        f.push({ narr: '<b>Delete anomaly:</b> Eli leaves. He is Legal\'s only employee, so deleting his row erases "Legal is on floor 7". <b>Insert anomaly:</b> a new department "Research" can\'t exist until someone joins it.', parts: [{ type: 'table', label: 'emp_flat', columns: cols, rows: cp(), hl: { 4: 'bad' } }, { type: 'table', label: 'cannot insert', columns: cols, rows: [[null, null, 'D4', 'Research', 6]], hl: { 0: 'bad' } }] });
        f.push({ narr: 'Fix: move the violating FD <b>dept_id → dept_name, dept_floor</b> into its own table, keyed by its left side. dept_id stays in employees as a foreign key (it is the "glue" that makes the split lossless).', parts: [
          { type: 'table', label: 'departments  KEY dept_id', columns: ['dept_id', 'dept_name', 'dept_floor'], rows: [['D1', 'Sales', 3], ['D2', 'Engineering', 5], ['D3', 'Legal', 7]], hl: { 0: 'ok', 1: 'ok', 2: 'ok' } },
          { type: 'table', label: 'employees  KEY emp_id', columns: ['emp_id', 'emp_name', 'dept_id'], rows: rows.map(function (r) { return r.slice(0, 3); }) }] });
        f.push({ narr: 'Check every FD against its new home: in each table, the left side of every FD is now that table\'s key → <b>both tables are in 3NF</b> (in fact BCNF).', parts: [{ type: 'table', label: '3NF check', columns: ['table', 'FD', 'left side a superkey?', 'verdict'], rows: [['employees', 'emp_id → emp_name, dept_id', 'yes', '3NF ✔'], ['departments', 'dept_id → dept_name, dept_floor', 'yes', '3NF ✔']], hl: { 0: 'ok', 1: 'ok' } }] });
        f.push({ narr: 'Replay the anomalies: Sales → floor 4 is one row; Research can be added with no employees; deleting Eli leaves Legal intact.', parts: [
          { type: 'table', label: 'departments', columns: ['dept_id', 'dept_name', 'dept_floor'], rows: [['D1', 'Sales', 4], ['D2', 'Engineering', 5], ['D3', 'Legal', 7], ['D4', 'Research', 6]], hl: { 0: 'ok', 2: 'sel', 3: 'ok' } },
          { type: 'table', label: 'employees (Eli removed)', columns: ['emp_id', 'emp_name', 'dept_id'], rows: rows.slice(0, 4).map(function (r) { return r.slice(0, 3); }) }] });
        return f;
      }
    }, {
      title: '3NF synthesis: minimal cover → one table per left side',
      input: 'A B C D E | A->BC; B->C; AB->D; D->E',
      inputLabel: 'attributes | FDs',
      gen: function (input) {
        var S = parseSpec(input, false), L = S.L, R = S.attrs, frames = [];
        frames.push({ narr: 'Input: R(' + fmt(R, L) + ') with ' + S.fds.length + ' FDs. Synthesis guarantees a 3NF result that is lossless <b>and</b> keeps every FD checkable inside one table.', parts: [fdGraph(R, S.fds, L), fdTable(S.fds, L)] });
        var mc = minimalCover(S.fds, L);
        mc.log.forEach(function (st, i) {
          if (i === 0) frames.push({ narr: 'Step 1a — ' + st.what, parts: [fdTable(st.F, L, {}, 'split FDs')] });
          else frames.push({ narr: 'Step 1b — ' + st.what, parts: [{ type: 'text', label: 'minimal cover in progress', html: '<span class="c-y">' + H.esc(st.what) + '</span>' }] });
        });
        var F = mc.F;
        frames.push({ narr: 'Minimal cover: ' + F.map(function (f) { return fdStr(f, L); }).join(', ') + '. No FD can be simplified or removed.', parts: [fdGraph(R, F, L, { label: 'minimal cover' }), fdTable(F, L, {}, 'minimal cover')] });
        var groups = [];
        F.forEach(function (f) {
          var g = groups.filter(function (x) { return sameSet(x.l, f.l); })[0];
          if (!g) { g = { l: f.l.slice(), attrs: f.l.slice() }; groups.push(g); }
          if (!has(g.attrs, f.r[0])) g.attrs.push(f.r[0]);
        });
        var rels = groups.map(function (g) { return { attrs: S.ord(g.attrs), key: g.l, why: 'from ' + fmt(g.l, L) + ' → …' }; });
        var tbl = function (hl) { return { type: 'table', label: 'tables', columns: ['table', 'attributes', 'key', 'reason'], rows: rels.map(function (r, i) { return ['R' + (i + 1), fmt(r.attrs, L), fmt(r.key, L), r.why]; }), hl: hl || {} }; };
        var allOk = {}; rels.forEach(function (_, i) { allOk[i] = 'ok'; });
        frames.push({ narr: 'Step 2 — one table per distinct left side, holding the left side plus everything it determines.', parts: [tbl(allOk)] });
        var keys = keysOf(R, S.fds);
        var holder = -1;
        rels.forEach(function (r, i) { if (holder < 0 && keys.some(function (k) { return subset(k, r.attrs); })) holder = i; });
        if (holder >= 0) {
          var hh = {}; hh[holder] = 'sel';
          frames.push({ narr: 'Step 3 — candidate key(s) of R: ' + keys.map(function (k) { return fmt(k, L); }).join(', ') + '. Table R' + (holder + 1) + ' already contains one, so the join of all tables is lossless. Nothing to add.', parts: [tbl(hh)] });
        } else {
          rels.push({ attrs: keys[0].slice(), key: keys[0].slice(), why: 'key table (lossless join)' });
          var kh = {}; kh[rels.length - 1] = 'ok';
          frames.push({ narr: 'Step 3 — no table contains a candidate key (' + keys.map(function (k) { return fmt(k, L); }).join(', ') + '). Add one table that is just the key <b>' + fmt(keys[0], L) + '</b>; without it the join could invent rows.', parts: [tbl(kh)] });
        }
        var removed = [];
        rels = rels.filter(function (r, i) {
          var sub = rels.some(function (o, j) { return j !== i && subset(r.attrs, o.attrs) && (!sameSet(r.attrs, o.attrs) || j < i); });
          if (sub) removed.push(fmt(r.attrs, L));
          return !sub;
        });
        frames.push({ narr: 'Step 4 — drop any table whose attributes are contained in another table. ' + (removed.length ? 'Removed: ' + removed.join('; ') + '.' : 'None to remove.'), parts: [tbl()] });
        var fin = {}; rels.forEach(function (_, i) { fin[i] = 'sel'; });
        frames.push({ narr: '<b>Result:</b> ' + rels.map(function (r) { return '(' + fmt(r.attrs, L) + ')'; }).join(' ') + '. Every FD of the minimal cover lives inside one table (dependency-preserving), a key table guarantees a lossless join, and each table is in 3NF.', parts: [tbl(fin), fdGraph(R, F, L, { label: 'minimal cover (all preserved)' })] });
        return frames;
      }
    }],
    examples: [
      { title: 'zip → city, state (and its real-world caveat)', html: `<p><code>customers(id, name, street, zip, city, state)</code> with zip → city, state. Textbook answer: <code>zips(zip PK, city, state)</code>. Real-world answer: in the US a ZIP can span several cities and in India a PIN can cover multiple localities, so zip → city is <b>not</b> a true FD everywhere. Many production systems deliberately keep city in the address row (denormalized but correct) and validate with a lookup service. Always confirm the FD is a real rule first.</p>` },
      { title: 'Employee → department → manager', html: `<p><code>employees(emp_id, name, dept_id, dept_manager_id)</code>: dept_id → dept_manager_id is transitive. When a department changes manager, every employee row needs an update. Move it: <code>departments(dept_id, manager_id)</code>. Note manager_id itself references employees — a cycle of foreign keys that is fine and common.</p>` },
      { title: 'A table that is 3NF but has a non-key determinant', html: `<p>R(student, subject, tutor), keys (student, subject) and (student, tutor), FD tutor → subject. tutor is not a superkey, but subject is <b>prime</b>, so 3NF's escape clause applies: R <b>is</b> 3NF. The redundancy survives ("tutor T teaches maths" repeats per student). BCNF (next topic) removes the escape clause.</p>` },
      { title: 'Synthesis adds a key table', html: `<p>R(A, B, C, D), F = {A → B, C → D}. Groups: (A, B), (C, D). Candidate key: AC — not inside either table. Without a key table, joining (A,B) and (C,D) has no common column → a cross join that invents rows. Synthesis adds <b>(A, C)</b>: the "link" table, exactly like an order_items junction table.</p>`, code: { lang: 'sql', code: `CREATE TABLE r_ab (a TEXT PRIMARY KEY, b TEXT NOT NULL);
CREATE TABLE r_cd (c TEXT PRIMARY KEY, d TEXT NOT NULL);
CREATE TABLE r_ac (a TEXT NOT NULL REFERENCES r_ab(a), c TEXT NOT NULL REFERENCES r_cd(c), PRIMARY KEY (a, c));
INSERT INTO r_ab VALUES ('a1', 'b1'), ('a2', 'b2');
INSERT INTO r_cd VALUES ('c1', 'd1'), ('c2', 'd2');
INSERT INTO r_ac VALUES ('a1', 'c1'), ('a2', 'c2');            -- the original R had 2 rows
SELECT COUNT(*) AS without_key_table FROM r_ab, r_cd;          -- 4: invented rows
SELECT COUNT(*) AS with_key_table FROM r_ac JOIN r_ab USING (a) JOIN r_cd USING (c);  -- 2: exact` } }
    ],
    deepDive: `<h4>🟣 Why 3NF has the "prime attribute" escape clause</h4>
<p>Without it, some relations could only be normalized by losing an FD (see BCNF). Bernstein's synthesis proves that 3NF is <b>always</b> reachable while preserving every dependency and keeping a lossless join. The price: a little residual redundancy when a non-key determinant points into a key (overlapping candidate keys).</p>
<h4>Checking 3NF is NP-hard; synthesizing it is polynomial</h4>
<p>Testing whether an attribute is prime requires knowing all candidate keys (NP-complete in general), so "is this relation in 3NF?" is NP-hard. Synthesis sidesteps this: computing a minimal cover is polynomial, and the algorithm needs only <b>one</b> candidate key (found greedily by shrinking R while its closure stays complete). Production designers never hit these limits — real tables have a handful of keys.</p>
<h4>Minimal covers are not unique</h4>
<p>Different removal orders can yield different minimal covers (e.g. F = {A→B, B→A, A→C, B→C}: you may drop either A→C or B→C), hence different but equally valid 3NF schemas. Pick the one that matches how the business talks about entities.</p>
<h4>Snapshot vs transitive</h4>
<p><code>orders.ship_city</code> looks transitive (order → customer → city) but it is a <b>snapshot</b>: "where this order was shipped". It must not change when the customer moves. If the column means "where the customer lives now", it is transitive and belongs with the customer; if it means "where we shipped", it is a fact about the order. Naming (<code>ship_to_city</code>) documents the difference and settles the interview argument.</p>
<h4>Production reality</h4>
<p>3NF/BCNF is the default for OLTP schemas (PostgreSQL, MySQL, SQL Server back ends). Teams typically stop there and denormalize selectively for proven hot paths. Higher forms (4NF, 5NF) matter mainly when a table contains two independent multi-valued facts.</p>`,
    aiEra: `<p><b>What AI changes:</b> assistants can run minimal-cover and synthesis steps quickly and explain them. For schema reviews, an LLM can scan dozens of tables and flag "this column looks transitively dependent (city next to zip)". That makes 3NF review cheap.</p>
<p><b>Use AI as a partner:</b> <code>For each table, list FDs whose left side is not a key, say whether the right side is prime, and propose the split with migration SQL.</code> Then ask the follow-up most models skip: <code>Which of these columns are snapshots that must NOT follow the source?</code> That one question prevents the most common normalization bug — "fixing" a historical record into a live reference.</p>
<p><b>Where AI goes wrong:</b> it forgets the prime-attribute clause (declaring 3NF tables "not 3NF"), skips the key table in synthesis, and treats zip → city as universal truth. <b>What you must still own:</b> the precise definition, the synthesis steps, and the business judgement about snapshots.</p>`,
    problems: [{
      title: 'Shipments with ZIP, City and State',
      level: 'Medium', tags: ['3NF', 'transitive dependency', 'decomposition'], companies: ['FedEx', 'Flipkart', 'Shopify'],
      statement: `<p><code>shipments(shipment_id, customer_id, customer_name, zip, city, state, weight_kg)</code>, key shipment_id. Rules: shipment_id → customer_id, zip, weight_kg; customer_id → customer_name; zip → city, state (assume this holds for your country's data). Which normal form is the table in? Decompose to 3NF in SQL and show that changing a city name is a one-row update.</p>`,
      constraints: `<p>SQLite. Foreign keys enforced. The shipment's destination zip is a fact of the shipment (not the customer's home zip).</p>`,
      example: `<p>Two shipments to 411001 both carry ${H.c('r', 'Pune, MH')}. Renaming the city requires updating every shipment row to that zip; miss one and the same zip maps to two cities.</p>`,
      brute: {
        why: `<p>Keeping the flat table: key is single-column so it is 2NF, but customer_name and city/state are second-hand facts. A city rename or a customer rename touches N rows, and a ZIP with no shipments can't be stored for address validation.</p>`,
        code: `CREATE TABLE shipments (
  shipment_id INTEGER PRIMARY KEY, customer_id INTEGER NOT NULL, customer_name TEXT NOT NULL,
  zip TEXT NOT NULL, city TEXT NOT NULL, state TEXT NOT NULL, weight_kg REAL NOT NULL);
INSERT INTO shipments VALUES
  (1, 10, 'Asha', '411001', 'Pune', 'MH', 2.5),
  (2, 11, 'Ben',  '411001', 'Pune', 'MH', 1.0),
  (3, 10, 'Asha', '110001', 'New Delhi', 'DL', 4.0);
UPDATE shipments SET city = 'Pune City' WHERE shipment_id = 1;   -- forgot shipment 2
SELECT zip, GROUP_CONCAT(DISTINCT city) AS cities FROM shipments GROUP BY zip;  -- 411001 -> two cities`
      },
      mcq: { q: 'Highest normal form of the original shipments table?', options: ['2NF — single-column key, but transitive dependencies exist', '1NF only', '3NF', 'BCNF'], answer: 0, explain: 'No composite key → no partial dependency → 2NF. customer_id → name and zip → city/state are non-key determinants of non-prime attributes → not 3NF.' },
      hints: [`<p>Hint 1: List the FDs whose left side is not shipment_id. Those are your transitive dependencies.</p>`, `<p>Hint 2: Each one becomes a table keyed by its left side: customers(customer_id, name), zips(zip, city, state).</p>`, `<p>Hint 3: shipments keeps shipment_id, customer_id (FK), zip (FK), weight_kg. Migrate with SELECT DISTINCT, then rejoin to verify.</p>`],
      tests: { cmp: 'exact', engine: 'sqlite', cases: [
          { cols: ['shipment_id', 'customer_name', 'zip', 'city', 'state', 'weight_kg'], rows: [[1, 'Asha', '411001', 'Pune City', 'MH', 2.5], [2, 'Ben', '411001', 'Pune City', 'MH', 1], [3, 'Asha', '110001', 'New Delhi', 'DL', 4]] },
          { after: 'SELECT (SELECT COUNT(*) FROM customers), (SELECT COUNT(*) FROM zips), (SELECT COUNT(*) FROM shipments)', rows: [[2, 2, 3]] },
          { after: 'SELECT name FROM pragma_table_info(\'shipments\') ORDER BY cid', rows: [['shipment_id'], ['customer_id'], ['zip'], ['weight_kg']] },
          { after: 'SELECT zip FROM zips GROUP BY zip HAVING COUNT(DISTINCT city) > 1', rows: [] },
          { after: 'UPDATE zips SET city = \'Pune\' WHERE zip = \'411001\'; SELECT COUNT(*) FROM shipments s JOIN zips z USING (zip) WHERE z.city = \'Pune\'', rows: [[2]] },
          { after: 'INSERT INTO shipments VALUES (4, 11, \'110001\', 7.5); SELECT s.shipment_id, z.city FROM shipments s JOIN zips z USING (zip) WHERE s.zip = \'110001\' ORDER BY 1', rows: [[3, 'New Delhi'], [4, 'New Delhi']] },
          { after: 'INSERT INTO shipments VALUES (4, 10, \'999999\', 1)', error: 'FOREIGN KEY' },
          { after: 'INSERT INTO shipments VALUES (4, 99, \'411001\', 1)', error: 'FOREIGN KEY' },
          { after: 'INSERT INTO shipments VALUES (4, 10, \'411001\', 0)', error: 'CHECK' },
          { after: 'INSERT INTO shipments VALUES (1, 10, \'411001\', 1)', error: 'UNIQUE' },
          { after: 'INSERT INTO zips VALUES (\'411001\',\'Other\',\'XX\')', error: 'UNIQUE' },
          { after: 'DELETE FROM customers WHERE customer_id = 10', error: 'FOREIGN KEY' },
          { after: 'SELECT customer_name FROM customers WHERE customer_id = 10', rows: [['Asha']] }
        ] },
      solution: {
        approach: `<p>Key: shipment_id. Non-key determinants: customer_id → customer_name and zip → city, state. Both right sides are non-prime → two 3NF violations. Create <code>customers</code> and <code>zips</code> keyed by those determinants; shipments keeps the determinants as foreign keys. Each split shares a column that is the key of the new table → lossless; each FD sits whole inside one table → dependency-preserving. City rename = one row in <code>zips</code>.</p>`,
        code: `PRAGMA foreign_keys = ON;
CREATE TABLE shipments_old (
  shipment_id INTEGER PRIMARY KEY, customer_id INTEGER NOT NULL, customer_name TEXT NOT NULL,
  zip TEXT NOT NULL, city TEXT NOT NULL, state TEXT NOT NULL, weight_kg REAL NOT NULL);
INSERT INTO shipments_old VALUES
  (1, 10, 'Asha', '411001', 'Pune', 'MH', 2.5),
  (2, 11, 'Ben',  '411001', 'Pune', 'MH', 1.0),
  (3, 10, 'Asha', '110001', 'New Delhi', 'DL', 4.0);

CREATE TABLE customers (customer_id INTEGER PRIMARY KEY, customer_name TEXT NOT NULL);
CREATE TABLE zips      (zip TEXT PRIMARY KEY, city TEXT NOT NULL, state TEXT NOT NULL);
CREATE TABLE shipments (
  shipment_id INTEGER PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(customer_id),
  zip         TEXT    NOT NULL REFERENCES zips(zip),
  weight_kg   REAL    NOT NULL CHECK (weight_kg > 0));

INSERT INTO customers SELECT DISTINCT customer_id, customer_name FROM shipments_old;
INSERT INTO zips      SELECT DISTINCT zip, city, state FROM shipments_old;
INSERT INTO shipments SELECT shipment_id, customer_id, zip, weight_kg FROM shipments_old;

UPDATE zips SET city = 'Pune City' WHERE zip = '411001';     -- one row, every shipment sees it
SELECT s.shipment_id, c.customer_name, z.zip, z.city, z.state, s.weight_kg
FROM shipments s JOIN customers c USING (customer_id) JOIN zips z USING (zip)
ORDER BY s.shipment_id;`,
        complexity: `<p>Migration O(N). Updates of a city or a customer name: O(1) rows via PK. Reads: two indexed joins.</p>`,
        followUps: ['A ZIP can map to two cities after all — how does the schema change?', 'Should a shipment store the city as it was on the shipping date? Why?']
      }
    }]
  });

  /* =====================================================================
     TOPIC 6 — BCNF (and a peek at 4NF/5NF)
     ===================================================================== */
  function preserved(fds, rels) {
    // Standard polynomial test: grow X using only what each table can "see".
    return fds.map(function (f) {
      var res = f.l.slice(), changed = true;
      while (changed) {
        changed = false;
        rels.forEach(function (Ri) {
          var add = minus(inter(closure(inter(res, Ri), fds).res, Ri), res);
          if (add.length) { res = res.concat(add); changed = true; }
        });
      }
      return subset(f.r, res);
    });
  }
  topics.push({
    title: 'BCNF: Every Determinant Is a Key',
    analogy: `<p>A tuition centre: each tutor teaches exactly <b>one</b> subject, and each student has <b>one tutor per subject</b>. The sign-up register lists (student, subject, tutor). "Mr. Rao teaches Maths" gets written on every line where a student picks Mr. Rao — the <b>tutor</b> quietly decides the subject even though the tutor is not the register's key. BCNF says: <b>if a column decides something, it must be a key of that table</b>. Give tutors their own page.</p>`,
    explain: `<p><b>🟢 The plain idea.</b> <b>Boyce–Codd Normal Form</b> is 3NF without the escape clause:</p>
<p style="padding-left:1em"><b>BCNF:</b> for every non-trivial FD X → Y in the table, <b>X is a superkey</b>. Full stop.</p>
<p>3NF allowed a non-key determinant if the thing it determined was <b>prime</b>. That loophole only matters when a table has <b>overlapping candidate keys</b>. The tutoring register:</p>
${H.table(['student', 'subject', 'tutor'], [['Asha', 'Maths', H.c('y', 'Mr. Rao')], ['Ben', 'Maths', H.c('y', 'Mr. Rao')], ['Asha', 'Physics', 'Ms. Iyer'], ['Chen', 'Maths', 'Ms. Sen'], ['Ben', 'Physics', 'Ms. Iyer']])}
<p>FDs: (student, subject) → tutor and tutor → subject. Candidate keys: <b>(student, subject)</b> and <b>(student, tutor)</b>. Every attribute is prime, so the table is <b>3NF</b>. But tutor → subject has a non-superkey left side → <b>not BCNF</b>. Symptom: "Mr. Rao teaches Maths" is stored twice; if Mr. Rao switches to Statistics you must update several rows.</p>
<p><b>🔵 How it really works — BCNF decomposition algorithm:</b></p>
<ol>
<li>Find an FD X → Y that holds in table R (including implied ones) where X is <b>not</b> a superkey of R.</li>
<li>Replace R with <b>R1 = X ∪ Y</b> (X⁺ restricted to R) and <b>R2 = R − (Y − X)</b>. X is in both, and X is a key of R1, so the split is <b>lossless</b>.</li>
<li>Repeat on R1 and R2 until no violations remain.</li>
</ol>
<p>Tutoring: violation tutor → subject → <code>tutors(tutor, subject)</code> + <code>student_tutors(student, tutor)</code>.</p>
<p><b>The catch — dependency preservation.</b> The rule "a student has one tutor per subject" ((student, subject) → tutor) now spans two tables: no single table contains student, subject and tutor together, so no PK/UNIQUE can enforce it. BCNF decomposition is always <b>lossless</b> but <b>not always dependency-preserving</b>. You then choose:</p>
${H.table(['option', 'you get', 'you pay'], [['stay in 3NF', 'every rule enforced by keys', 'a little redundancy (tutor → subject repeated)'], ['go BCNF', 'zero FD redundancy', 'enforce the lost rule with a trigger, a check in the app, or a smarter redesign']])}
<p><b>Rule of thumb:</b> most real tables reach BCNF for free when they reach 3NF (single candidate key ⇒ 3NF = BCNF). Overlapping composite keys are the only place to look.</p>
<p><b>Beyond BCNF.</b> <b>4NF</b> removes <b>multi-valued dependencies</b> — two independent lists in one table (a course's teachers and its textbooks) forcing every combination to be stored. <b>5NF</b> (PJNF) removes join dependencies that can only be rebuilt from three or more projections. Both are rarer, but 4NF shows up in interviews as "why does this junction table have a cross product of rows?".</p>`,
    clues: [
      '"3NF but not BCNF" — look for overlapping composite candidate keys and a non-key determinant pointing into a key',
      '"Each tutor teaches one subject; each student has one tutor per subject" — the textbook BCNF case',
      '"Decompose into BCNF" → find X → Y with X not a superkey, split into (X ∪ Y) and (R − Y)',
      '"Is the decomposition dependency-preserving?" — BCNF may lose an FD; 3NF synthesis never does',
      '"Every determinant is a candidate key" — the one-line BCNF definition',
      'Two independent multi-valued facts in one table (skills × languages, teachers × books) → 4NF, not BCNF'
    ],
    code: [{ lang: 'sql', title: 'Tutoring register → BCNF + a trigger for the lost dependency', code: `PRAGMA foreign_keys = ON;
-- BCNF tables: every determinant is a key
CREATE TABLE tutors (
  tutor   TEXT PRIMARY KEY,
  subject TEXT NOT NULL                       -- tutor -> subject, enforced by the PK
);
CREATE TABLE student_tutors (
  student TEXT NOT NULL,
  tutor   TEXT NOT NULL REFERENCES tutors(tutor),
  PRIMARY KEY (student, tutor)
);
-- Lost FD: (student, subject) -> tutor spans two tables, so no PK/UNIQUE can enforce it.
-- A trigger re-checks it. RAISE(IGNORE) silently skips the bad row so this demo keeps running;
-- in production use RAISE(ABORT, 'student already has a tutor for this subject').
CREATE TRIGGER one_tutor_per_subject
BEFORE INSERT ON student_tutors
WHEN EXISTS (
  SELECT 1 FROM student_tutors st JOIN tutors t ON t.tutor = st.tutor
  WHERE st.student = NEW.student
    AND t.subject = (SELECT subject FROM tutors WHERE tutor = NEW.tutor))
BEGIN
  SELECT RAISE(IGNORE);
END;

INSERT INTO tutors VALUES ('Mr. Rao', 'Maths'), ('Ms. Sen', 'Maths'), ('Ms. Iyer', 'Physics');
INSERT INTO student_tutors VALUES ('Asha', 'Mr. Rao'), ('Ben', 'Mr. Rao'), ('Asha', 'Ms. Iyer'),
                                  ('Chen', 'Ms. Sen'), ('Ben', 'Ms. Iyer');
INSERT INTO student_tutors VALUES ('Asha', 'Ms. Sen');   -- 2nd Maths tutor for Asha: skipped by the trigger

UPDATE tutors SET subject = 'Statistics' WHERE tutor = 'Mr. Rao';   -- one row, not one per student

SELECT st.student, t.subject, st.tutor
FROM student_tutors st JOIN tutors t USING (tutor)
ORDER BY st.student, t.subject;` },
    { lang: 'sql', title: '4NF: two independent lists force a cross product', code: `-- course ->> teacher and course ->> book are independent multi-valued facts.
CREATE TABLE course_teacher_book (course TEXT, teacher TEXT, book TEXT, PRIMARY KEY (course, teacher, book));
INSERT INTO course_teacher_book VALUES
  ('DB', 'Rao', 'Ramakrishnan'), ('DB', 'Rao', 'Silberschatz'),
  ('DB', 'Sen', 'Ramakrishnan'), ('DB', 'Sen', 'Silberschatz');   -- 2 teachers x 2 books = 4 rows
-- Adding a 3rd book means adding one row PER teacher (or the data lies). 4NF split:
CREATE TABLE course_teachers (course TEXT, teacher TEXT, PRIMARY KEY (course, teacher));
CREATE TABLE course_books    (course TEXT, book    TEXT, PRIMARY KEY (course, book));
INSERT INTO course_teachers SELECT DISTINCT course, teacher FROM course_teacher_book;
INSERT INTO course_books    SELECT DISTINCT course, book    FROM course_teacher_book;
INSERT INTO course_books VALUES ('DB', 'Kleppmann');            -- one row, done
SELECT (SELECT COUNT(*) FROM course_teachers) AS teacher_rows,
       (SELECT COUNT(*) FROM course_books)    AS book_rows,
       (SELECT COUNT(*) FROM course_teachers JOIN course_books USING (course)) AS combos_if_rejoined;` }],
    codeTitle: ['BCNF split + trigger for the lost FD', '4NF bonus: multi-valued dependencies'],
    viz: [{
      title: 'Tutoring register: 3NF but not BCNF',
      gen: function () {
        var cols = ['student', 'subject', 'tutor'];
        var rows = [['Asha', 'Maths', 'Mr. Rao'], ['Ben', 'Maths', 'Mr. Rao'], ['Asha', 'Physics', 'Ms. Iyer'], ['Chen', 'Maths', 'Ms. Sen'], ['Ben', 'Physics', 'Ms. Iyer']];
        var fds = [{ l: ['student', 'subject'], r: ['tutor'] }, { l: ['tutor'], r: ['subject'] }];
        var f = [];
        f.push({ narr: 'The register: one row per (student, subject) with the chosen tutor. Rules: a student has one tutor per subject; a tutor teaches one subject.', parts: [{ type: 'table', label: 'register', columns: cols, rows: rows }] });
        f.push({ narr: 'FD arrows: (student, subject) → tutor, and <b>tutor → subject</b>. Candidate keys: (student, subject) <b>and</b> (student, tutor) — they overlap on student.', parts: [fdGraph(cols, fds, false, { fdHl: { 0: 'ok', 1: 'cur' }, attrTags: { student: 'prime', subject: 'prime', tutor: 'prime' } })] });
        f.push({ narr: '3NF test for tutor → subject: tutor is not a superkey, <b>but</b> subject is prime (part of key (student, subject)) → 3NF\'s escape clause lets it pass. <b>The table is in 3NF.</b>', parts: [{ type: 'table', label: 'normal-form check', columns: ['FD', 'left side superkey?', 'right side prime?', '3NF', 'BCNF'], rows: [['student, subject → tutor', 'yes', '—', '✔', '✔'], ['tutor → subject', 'no', 'yes', '✔ (escape clause)', '✘']], hl: { 0: 'ok', 1: 'bad' } }] });
        f.push({ narr: 'BCNF has no escape clause: tutor decides subject but tutor is not a key → <b>violation</b>. In the data, "Mr. Rao teaches Maths" and "Ms. Iyer teaches Physics" are each stored twice (red).', parts: [{ type: 'table', label: 'register', columns: cols, rows: rows, hl: { 0: 'bad', 1: 'bad', 2: 'cur', 4: 'cur' } }, fdGraph(cols, fds, false, { fdHl: { 1: 'bad' } })] });
        var up = rows.map(function (r) { return r.slice(); }); up[0][1] = 'Statistics';
        f.push({ narr: '<b>Update anomaly:</b> Mr. Rao switches to Statistics; only Asha\'s row gets updated. Now Mr. Rao teaches two subjects — breaking the rule the data was supposed to follow.', parts: [{ type: 'table', label: 'register after partial update', columns: cols, rows: up, hl: { 0: 'ok', 1: 'bad' } }] });
        f.push({ narr: 'BCNF split on the violating FD tutor → subject: <b>R1 = (tutor, subject)</b> with key tutor, <b>R2 = R − {subject} = (student, tutor)</b>. tutor is shared and is R1\'s key → lossless.', parts: [
          { type: 'table', label: 'tutors  KEY tutor', columns: ['tutor', 'subject'], rows: [['Mr. Rao', 'Maths'], ['Ms. Iyer', 'Physics'], ['Ms. Sen', 'Maths']], hl: { 0: 'ok', 1: 'ok', 2: 'ok' } },
          { type: 'table', label: 'student_tutors  KEY (student, tutor)', columns: ['student', 'tutor'], rows: rows.map(function (r) { return [r[0], r[2]]; }), hl: { 0: 'ok', 1: 'ok', 2: 'ok', 3: 'ok', 4: 'ok' } }] });
        f.push({ narr: 'The price: the rule (student, subject) → tutor no longer fits inside one table. Insert (Asha, Ms. Sen) — each table looks perfectly valid on its own…', parts: [
          { type: 'table', label: 'tutors', columns: ['tutor', 'subject'], rows: [['Mr. Rao', 'Maths'], ['Ms. Iyer', 'Physics'], ['Ms. Sen', 'Maths']] },
          { type: 'table', label: 'student_tutors', columns: ['student', 'tutor'], rows: rows.map(function (r) { return [r[0], r[2]]; }).concat([['Asha', 'Ms. Sen']]), hl: { 5: 'cur' } }] });
        f.push({ narr: '…but the join reveals Asha now has <b>two Maths tutors</b> (red). The lost dependency must be enforced by a trigger or application check — or you stay in 3NF on purpose.', parts: [{ type: 'table', label: 'student_tutors ⋈ tutors', columns: cols, rows: [['Asha', 'Maths', 'Mr. Rao'], ['Asha', 'Maths', 'Ms. Sen'], ['Asha', 'Physics', 'Ms. Iyer'], ['Ben', 'Maths', 'Mr. Rao'], ['Ben', 'Physics', 'Ms. Iyer'], ['Chen', 'Maths', 'Ms. Sen']], hl: { 0: 'bad', 1: 'bad' } }] });
        f.push({ narr: 'Decision table. Interview answer: "BCNF removes all FD redundancy but may lose dependency preservation; 3NF always preserves dependencies. I pick based on which rule is more costly to enforce."', parts: [{ type: 'table', label: 'trade-off', columns: ['', '3NF (one table)', 'BCNF (two tables)'], rows: [['tutor → subject stored', 'once per student', 'once ✔'], ['one tutor per subject per student', 'PK enforces ✔', 'needs trigger ✘'], ['lossless', '—', 'yes ✔']], hl: { 0: 'sel', 1: 'sel', 2: 'sel' } }] });
        return f;
      }
    }, {
      title: 'BCNF decomposition calculator',
      input: 'A B C D E | A->B; BC->E; ED->A',
      inputLabel: 'attributes | FDs',
      gen: function (input) {
        var S = parseSpec(input, false), L = S.L, frames = [];
        var work = [S.attrs.slice()], done = [], splits = 0;
        var keyOf = function (R) { var k = keysOf(R, S.fds); return k.length ? fmt(k[0], L) : fmt(R, L); };
        var table = function (cur, hl) {
          var rowsT = [], h = {};
          done.forEach(function (R) { rowsT.push([fmt(R, L), keyOf(R), 'BCNF ✔']); h[rowsT.length - 1] = 'ok'; });
          work.forEach(function (R) { rowsT.push([fmt(R, L), keyOf(R), R === cur ? 'checking…' : 'to check']); if (R === cur) h[rowsT.length - 1] = hl || 'cur'; });
          return { type: 'table', label: 'tables so far', columns: ['attributes', 'a candidate key', 'status'], rows: rowsT, hl: h };
        };
        frames.push({ narr: 'Start with R(' + fmt(S.attrs, L) + '). Candidate keys: <b>' + keysOf(S.attrs, S.fds).map(function (k) { return fmt(k, L); }).join(', ') + '</b>. We look for any FD (given or implied) whose left side is not a superkey.', parts: [fdGraph(S.attrs, S.fds, L), table(null)] });
        while (work.length && splits < 10) {
          var R = work[0], v = bcnfViolation(R, S.fds);
          if (!v) {
            frames.push({ narr: 'Table (' + fmt(R, L) + '): every non-trivial FD inside it has a superkey on the left → <b>BCNF</b>.', parts: [table(R, 'ok')] });
            done.push(work.shift());
            continue;
          }
          splits++;
          var R1 = S.ord(v.c), R2 = S.ord(minus(R, v.Y));
          var ah = {}; v.X.forEach(function (a) { ah[a] = 'bad'; }); v.Y.forEach(function (a) { ah[a] = 'cur'; });
          frames.push({ narr: 'In (' + fmt(R, L) + ') the FD <b>' + fmt(v.X, L) + ' → ' + fmt(v.Y, L) + '</b> holds (' + fmt(v.X, L) + '⁺ ∩ table = ' + fmt(v.c, L) + ') but ' + fmt(v.X, L) + ' is not a superkey → violation.', parts: [fdGraph(S.attrs, S.fds, L, { attrHl: ah }), table(R, 'bad')] });
          work.shift();
          work.unshift(R2); work.unshift(R1);
          frames.push({ narr: 'Split into <b>(' + fmt(R1, L) + ')</b> = X ∪ Y with key ' + fmt(v.X, L) + ', and <b>(' + fmt(R2, L) + ')</b> = table − Y. They share ' + fmt(v.X, L) + ', which is a key of the first → lossless.', parts: [table(R1, 'ok')] });
        }
        var rels = done.concat(work);
        var pres = preserved(S.fds, rels), rows = S.fds.map(function (f, i) { return [fdStr(f, L), pres[i] ? 'preserved' : 'LOST — needs a trigger/app check']; }), ph = {};
        pres.forEach(function (p, i) { ph[i] = p ? 'ok' : 'bad'; });
        frames.push({ narr: '<b>Final BCNF schema:</b> ' + rels.map(function (R) { return '(' + fmt(R, L) + ')'; }).join(' ') + '. Lossless by construction. Dependency check: ' + (pres.every(Boolean) ? 'every FD is still enforceable.' : '<span class="c-r">some FDs span several tables and are lost</span> — the classic BCNF trade-off.'), parts: [{ type: 'table', label: 'final tables', columns: ['attributes', 'a candidate key'], rows: rels.map(function (R) { return [fmt(R, L), keyOf(R)]; }), hl: (function () { var h = {}; rels.forEach(function (_, i) { h[i] = 'sel'; }); return h; })() }, { type: 'table', label: 'dependency preservation', columns: ['FD', 'status'], rows: rows, hl: ph }] });
        return frames;
      }
    }],
    examples: [
      { title: 'Identify: 3NF, not BCNF', html: `<p>R(A, B, C, D, E), F = {A → B, BC → E, ED → A}. Keys: ACD, BCD, CDE (topic 2). Every attribute is prime ⇒ every FD has a prime right side ⇒ <b>3NF</b>. But A, BC and ED are not superkeys ⇒ three BCNF violations. Decompose on A → B: (A, B) and (A, C, D, E); continue on (A, C, D, E) with AC → E (implied: A → B, BC → E) … The calculator above shows one valid result and that ED → A is lost.</p>` },
      { title: 'Single candidate key ⇒ 3NF = BCNF', html: `<p>If a table has exactly one candidate key, then "right side prime" can only mean "right side is part of that key", which makes the FD trivial or the left side a superkey. So for single-key tables, passing 3NF means passing BCNF. That is why most well-designed OLTP tables are BCNF without anyone trying.</p>` },
      { title: 'Bank: branch → city inside a loan table', html: `<p><code>loans(loan_no, branch, customer, amount)</code> with keys loan_no and FD branch → (nothing else here) is BCNF. Add <code>branch_city</code>: branch → branch_city, branch is not a key ⇒ not BCNF (and not 3NF either, because branch_city is non-prime). Not every BCNF violation is "3NF-but-not-BCNF" — check the 3NF clause separately.</p>` },
      { title: 'Spotting a 4NF problem', html: `<p><code>employee_skill_language(emp, skill, language)</code> where skills and languages are independent. The key is all three columns, there are no non-trivial FDs at all ⇒ BCNF. Yet adding one new language means inserting one row per skill. That is a <b>multi-valued dependency</b> emp ↠ skill | language; 4NF splits it into (emp, skill) and (emp, language).</p>` }
    ],
    deepDive: `<h4>🟣 Why BCNF decomposition is always lossless</h4>
<p>Each step splits R on X → Y into R1 = XY and R2 = R − (Y − X). The intersection is X, and X → Y means X → R1, i.e. X is a superkey of R1. By the binary lossless-join test (R1 ∩ R2 → R1), the split is lossless; induction covers repeated splits.</p>
<h4>Why it may not preserve dependencies</h4>
<p>Classic proof: R(J, K, L) with JK → L and L → K. Keys: JK and JL. L → K violates BCNF; any BCNF decomposition must separate J, K, L so that no table contains all of JK → L. There is <b>no</b> BCNF decomposition preserving JK → L. Hence the textbook rule: "lossless always, dependency preservation not guaranteed; 3NF guarantees both".</p>
<h4>Testing BCNF on a decomposed table</h4>
<p>To test a sub-table Ri you must consider FDs <b>implied</b> by F and projected onto Ri, not just the ones written down. Shortcut: for each subset X of Ri, check whether X⁺ ∩ Ri adds attributes without covering Ri. That is exponential in |Ri| — fine for interviews and the calculator. For the <b>original</b> relation, checking only the given FDs suffices (Ullman).</p>
<h4>4NF and 5NF in one paragraph each</h4>
<p><b>Multi-valued dependency</b> X ↠ Y: for a given X, the set of Y values is independent of the remaining attributes. 4NF: every non-trivial MVD has a superkey on the left. Typical cause: merging two independent many-to-many relationships into one junction table. <b>5NF / PJNF</b>: every join dependency is implied by the candidate keys; violations look like "supplier supplies part, part used in project, supplier works on project ⇒ supplier supplies that part to that project" (a cyclic business rule). If the rule is real, the 3-way table is redundant and three 2-column tables suffice.</p>
<h4>DKNF and 6NF</h4>
<p>Domain-Key NF (Fagin) — every constraint follows from domains and keys — is mostly theoretical. 6NF (every table has a key plus at most one other attribute) appears in temporal databases and in "anchor modelling" / data-vault style warehouses where each attribute's history is versioned independently.</p>`,
    aiEra: `<p><b>What AI changes:</b> BCNF decomposition is mechanical, so models do it well for small textbook relations — but they routinely skip the step that interviews care about: <b>checking dependency preservation</b>. Tools that auto-normalize schemas (some ER/AI design assistants) tend to produce BCNF and silently drop a business rule.</p>
<p><b>Use AI as a partner:</b> after any proposed decomposition, ask <code>For each original FD, which single table enforces it? If none, write the trigger or constraint that would.</code> And ask for a property-based test: <code>generate random inserts into the decomposed tables and show a case where the original rule is violated</code>. If it can produce one, you have found the lost dependency.</p>
<p><b>Where AI goes wrong:</b> it treats "3NF" and "BCNF" as synonyms, ignores implied FDs when testing sub-tables, and invents MVD violations where facts are not independent. <b>What you must still own:</b> the trade-off decision (3NF + key-enforced rules vs BCNF + trigger) and explaining it in a minute.</p>`,
    problems: [{
      title: 'Court Bookings: 3NF but not BCNF',
      level: 'Hard', tags: ['BCNF', 'overlapping keys', 'redesign'], companies: ['Playo', 'Google', 'Microsoft'],
      statement: `<p>A tennis club stores today's bookings as <code>bookings(court, start_time, end_time, rate_type)</code>. Court 1 uses rate types SAVER and STANDARD; court 2 uses PREMIUM-A and PREMIUM-B (so <b>rate_type → court</b>). A court can't have two bookings starting or ending at the same time. Find the candidate keys, prove the table is 3NF but not BCNF, and design a BCNF schema that <b>still</b> enforces "no double booking" with keys only.</p>`,
      constraints: `<p>SQLite. No triggers in the final design. Show sample data, the anomaly in the original, and that the redesigned tables rebuild the original view.</p>`,
      example: `<p>Rows: (1, 09:30, 10:30, SAVER), (1, 11:00, 12:00, SAVER), (2, 10:00, 11:30, PREMIUM-B). "SAVER belongs to court 1" is stored twice ${H.c('r', '(redundancy)')}; PREMIUM-A's court can't be recorded until someone books it ${H.c('r', '(insert anomaly)')}.</p>`,
      brute: {
        why: `<p>Keeping the single table works for bookings but stores rate_type → court once per booking, cannot list a rate type with no bookings, and a mistaken row (court 2, SAVER) is accepted because nothing ties SAVER to court 1. The naive BCNF split (rate_type, court) + (rate_type, start, end) loses the "no double booking per court" rule, since court and start_time are no longer in the same table.</p>`,
        code: `CREATE TABLE bookings (
  court INTEGER NOT NULL, start_time TEXT NOT NULL, end_time TEXT NOT NULL, rate_type TEXT NOT NULL,
  PRIMARY KEY (court, start_time), UNIQUE (court, end_time));
INSERT INTO bookings VALUES (1, '09:30', '10:30', 'SAVER'), (1, '11:00', '12:00', 'SAVER'),
                            (1, '14:00', '15:30', 'STANDARD'), (2, '10:00', '11:30', 'PREMIUM-B');
INSERT INTO bookings VALUES (2, '16:00', '17:00', 'SAVER');      -- accepted, but SAVER is a court-1 rate!
SELECT rate_type, GROUP_CONCAT(DISTINCT court) AS courts_on_file
FROM bookings GROUP BY rate_type HAVING COUNT(DISTINCT court) > 1;  -- SAVER -> 1,2: rule broken`
      },
      mcq: { q: 'Why is the original table in 3NF even though rate_type is not a key?', options: ['court, the right side of rate_type → court, is a prime attribute', 'rate_type is unique per row', 'Tables with time columns are exempt', 'Because there is no transitive dependency on start_time'], answer: 0, explain: 'court belongs to the candidate key (court, start_time), so the 3NF escape clause applies; BCNF has no such clause.' },
      hints: [`<p>Hint 1: Candidate keys: (court, start_time), (court, end_time), (rate_type, start_time), (rate_type, end_time). Every attribute is prime.</p>`, `<p>Hint 2: rate_type → court violates BCNF. A plain split loses (court, start_time) → … . Is there an attribute that, together with court, determines the rate type?</p>`, `<p>Hint 3: Introduce is_member: (court, is_member) ↔ rate_type. Tables: rate_types(rate_type PK, court, is_member, UNIQUE(court, is_member)) and bookings(court, start_time, end_time, is_member) with PK (court, start_time), UNIQUE (court, end_time), FK (court, is_member).</p>`],
      tests: { cmp: 'exact', engine: 'sqlite', cases: [
          { cols: ['court', 'start_time', 'end_time', 'rate_type'], rows: [[1, '09:30', '10:30', 'SAVER'], [1, '11:00', '12:00', 'SAVER'], [1, '14:00', '15:30', 'STANDARD'], [2, '10:00', '11:30', 'PREMIUM-B']] },
          { after: 'INSERT INTO bookings VALUES (1, \'09:30\', \'09:45\', 0)', error: 'UNIQUE' },
          { after: 'INSERT INTO bookings VALUES (1, \'08:00\', \'10:30\', 0)', error: 'UNIQUE' },
          { after: 'INSERT INTO bookings VALUES (1, \'16:00\', \'16:00\', 0)', error: 'CHECK' },
          { after: 'INSERT INTO bookings VALUES (1, \'17:00\', \'16:00\', 0)', error: 'CHECK' },
          { after: 'INSERT INTO bookings VALUES (3, \'09:00\', \'10:00\', 1)', error: 'FOREIGN KEY' },
          { after: 'INSERT INTO rate_types VALUES (\'SAVER-2\', 1, 1)', error: 'UNIQUE' },
          { after: 'INSERT INTO rate_types VALUES (\'SAVER\', 3, 1)', error: 'UNIQUE' },
          { after: 'SELECT r.rate_type FROM rate_types r LEFT JOIN bookings b ON b.court = r.court AND b.is_member = r.is_member WHERE b.court IS NULL', rows: [['PREMIUM-A']] },
          { after: 'INSERT INTO bookings VALUES (2, \'12:00\', \'13:00\', 1); SELECT rate_type FROM bookings_original WHERE court = 2 AND start_time = \'12:00\'', rows: [['PREMIUM-A']] },
          { after: 'INSERT INTO bookings VALUES (1, \'12:30\', \'13:00\', 1); SELECT COUNT(*) FROM bookings_original', rows: [[5]] },
          { after: 'SELECT rate_type, court FROM rate_types ORDER BY rate_type', rows: [['PREMIUM-A', 2], ['PREMIUM-B', 2], ['SAVER', 1], ['STANDARD', 1]] }
        ] },
      solution: {
        approach: `<p><b>Keys:</b> (court, start), (court, end), (rate_type, start), (rate_type, end) — every column is prime ⇒ <b>3NF</b>. <b>BCNF violation:</b> rate_type → court, rate_type not a superkey. The textbook split (rate_type, court) + (rate_type, start, end) is lossless but makes "court can't be double-booked" unenforceable by keys. <b>Redesign:</b> a rate type is really "court + member/non-member". Store <code>rate_types(rate_type PK, court, is_member)</code> with UNIQUE(court, is_member), and <code>bookings(court, start, end, is_member)</code> with PK (court, start) and UNIQUE (court, end). Both tables are BCNF (every determinant — rate_type, (court,is_member), (court,start), (court,end) — is a key), and the double-booking rule stays a key. The composite FK makes invalid court/rate combos impossible.</p>`,
        code: `PRAGMA foreign_keys = ON;
CREATE TABLE rate_types (
  rate_type TEXT PRIMARY KEY,
  court     INTEGER NOT NULL,
  is_member INTEGER NOT NULL CHECK (is_member IN (0, 1)),
  UNIQUE (court, is_member)                         -- (court, is_member) -> rate_type
);
CREATE TABLE bookings (
  court      INTEGER NOT NULL,
  start_time TEXT    NOT NULL,
  end_time   TEXT    NOT NULL CHECK (end_time > start_time),
  is_member  INTEGER NOT NULL,
  PRIMARY KEY (court, start_time),                  -- no two bookings start together on a court
  UNIQUE (court, end_time),
  FOREIGN KEY (court, is_member) REFERENCES rate_types(court, is_member)
);
INSERT INTO rate_types VALUES ('SAVER', 1, 1), ('STANDARD', 1, 0), ('PREMIUM-A', 2, 1), ('PREMIUM-B', 2, 0);
INSERT INTO bookings VALUES (1, '09:30', '10:30', 1), (1, '11:00', '12:00', 1),
                            (1, '14:00', '15:30', 0), (2, '10:00', '11:30', 0);
-- PREMIUM-A exists with zero bookings (no insert anomaly); a "court 2 SAVER" booking is impossible.

CREATE VIEW bookings_original AS
SELECT b.court, b.start_time, b.end_time, r.rate_type
FROM bookings b JOIN rate_types r ON r.court = b.court AND r.is_member = b.is_member;

SELECT * FROM bookings_original ORDER BY court, start_time;`,
        complexity: `<p>All rules are enforced by unique indexes: O(log N) per insert. The view costs one indexed join per booking. No triggers, no lost dependencies.</p>`,
        followUps: ['How would you prevent overlapping bookings (09:30–10:30 vs 10:00–11:00), not just equal start times?', 'If a third court gets a "junior" rate, does the design still work?']
      }
    }]
  });

  /* =====================================================================
     TOPIC 7 — Lossless join & dependency preservation
     ===================================================================== */
  topics.push({
    title: 'Lossless-Join & Dependency-Preserving Decompositions',
    analogy: `<p>Tearing a class photo into strips to post it in two envelopes. If you tear along a line that every piece can be matched on — say, each strip carries the <b>student's roll number</b> — the receiver tapes the photo back together exactly. Tear along "everyone wearing blue", and when the pieces are matched up, every blue shirt gets glued to every blue-shirted face: the rebuilt photo shows <b>people who were never there</b>. A good decomposition is a tear along a <b>key</b>.</p>`,
    explain: `<p><b>🟢 The plain idea.</b> When you split table R into R1 and R2 (each a projection — a subset of the columns, duplicates removed), you must be able to rebuild R by a <b>natural join</b> on the shared columns. Two properties matter:</p>
<ul>
<li><b>Lossless join</b> (non-additive): R1 ⋈ R2 gives back <b>exactly</b> R. A "lossy" split never loses rows — it <b>adds fake rows</b> (spurious tuples). You lose the <b>information</b> of which combinations were real.</li>
<li><b>Dependency preservation:</b> every FD of R can still be checked inside <b>one</b> of the new tables (with a PK/UNIQUE), without joining.</li>
</ul>
<p><b>🔵 The binary lossless test (memorize it):</b> a split of R into R1 and R2 is lossless <b>iff</b> the common columns R1 ∩ R2 determine all of R1 <b>or</b> all of R2 — i.e. the shared columns are a <b>superkey of at least one side</b>.</p>
<p>Example: employees(emp, dept, loc) with emp → dept and dept → loc.</p>
${H.table(['split', 'common columns', 'common → one side?', 'verdict'], [
  ['(emp, dept) + (dept, loc)', 'dept', 'dept → loc, so dept is a key of (dept, loc)', H.c('g', 'lossless ✔')],
  ['(emp, loc) + (dept, loc)', 'loc', 'loc determines nothing', H.c('r', 'lossy ✘ — spurious rows')],
  ['(emp, dept) + (emp, loc)', 'emp', 'emp → dept and emp → loc', H.c('g', 'lossless ✔')]])}
<p>Why the second split fails: Asha (Sales) and Chen (Eng) are both in Pune. Joining on <code>loc = 'Pune'</code> pairs Asha with Eng and Chen with Sales — rows that never existed.</p>
<p><b>Dependency preservation test:</b> take the FDs that hold <b>inside</b> each new table (projections of F). If their union implies every original FD, the decomposition preserves dependencies. Quick version: if each original FD's columns all sit in one table, it is preserved. In the third split above, dept → loc spans two tables (dept in one, loc in the other — linked only through emp) so it is <b>lost</b>: the database would accept two Sales employees in different cities. The first split is lossless <b>and</b> preserving — the ideal.</p>
${H.table(['algorithm', 'lossless?', 'preserves FDs?', 'result'], [['3NF synthesis', H.c('g', 'always'), H.c('g', 'always'), '3NF'], ['BCNF decomposition', H.c('g', 'always'), H.c('y', 'not always'), 'BCNF'], ['"split by intuition"', H.c('r', 'maybe'), H.c('r', 'maybe'), '???']])}
<p>In SQL terms, you verify losslessness on real data by rejoining and comparing with <code>EXCEPT</code> in both directions — both counts must be zero.</p>`,
    clues: [
      '"Is this decomposition lossless?" → check whether R1 ∩ R2 is a superkey of R1 or of R2 (closure of the common columns)',
      '"The join returned more rows than the original table" → spurious tuples from a lossy split (joined on a non-key column)',
      '"Dependency preserving?" → can every FD be checked with one table\'s keys, without joins?',
      '"Why must the common attribute be a key?" — so each row finds exactly one partner on that side',
      'Multi-way splits (3+ tables) → use the chase / tableau test or rejoin-and-compare',
      '"Joined on a column that is not unique" in a data bug report — same phenomenon in day-to-day SQL (row explosion)'
    ],
    code: [{ lang: 'sql', title: 'Lossy vs lossless split: count the spurious rows', code: `CREATE TABLE emp (emp TEXT PRIMARY KEY, dept TEXT NOT NULL, loc TEXT NOT NULL);
INSERT INTO emp VALUES ('Asha', 'Sales', 'Pune'), ('Ben', 'Sales', 'Pune'),
                       ('Chen', 'Eng', 'Pune'),   ('Dara', 'HR', 'Delhi');

-- Good split: common column dept is a key of (dept, loc)
CREATE TABLE good_r1 AS SELECT DISTINCT emp, dept FROM emp;
CREATE TABLE good_r2 AS SELECT DISTINCT dept, loc FROM emp;
-- Bad split: common column loc is a key of neither side
CREATE TABLE bad_r1 AS SELECT DISTINCT emp, loc FROM emp;
CREATE TABLE bad_r2 AS SELECT DISTINCT dept, loc FROM emp;

SELECT 'good split' AS decomposition,
       (SELECT COUNT(*) FROM good_r1 NATURAL JOIN good_r2) AS rows_after_join,
       (SELECT COUNT(*) FROM (SELECT emp, dept, loc FROM good_r1 NATURAL JOIN good_r2
                              EXCEPT SELECT emp, dept, loc FROM emp)) AS spurious_rows
UNION ALL
SELECT 'bad split',
       (SELECT COUNT(*) FROM bad_r1 NATURAL JOIN bad_r2),
       (SELECT COUNT(*) FROM (SELECT emp, dept, loc FROM bad_r1 NATURAL JOIN bad_r2
                              EXCEPT SELECT emp, dept, loc FROM emp));

-- Show the invented rows
SELECT emp, dept, loc, 'SPURIOUS' AS note FROM bad_r1 NATURAL JOIN bad_r2
EXCEPT SELECT emp, dept, loc, 'SPURIOUS' FROM emp
ORDER BY emp;` },
    { lang: 'sql', title: 'A lost dependency in action (lossless but not preserving)', code: `PRAGMA foreign_keys = ON;
-- Split emp(emp, dept, loc) into (emp, dept) + (emp, loc): lossless (emp is a key of both)
CREATE TABLE emp_dept (emp TEXT PRIMARY KEY, dept TEXT NOT NULL);
CREATE TABLE emp_loc  (emp TEXT PRIMARY KEY REFERENCES emp_dept(emp), loc TEXT NOT NULL);
INSERT INTO emp_dept VALUES ('Asha', 'Sales'), ('Ben', 'Sales');
INSERT INTO emp_loc  VALUES ('Asha', 'Pune'),  ('Ben', 'Mumbai');   -- accepted!
-- dept -> loc is no longer checkable in one table, so Sales now sits in two cities:
SELECT d.dept, COUNT(DISTINCT l.loc) AS cities, GROUP_CONCAT(DISTINCT l.loc) AS which
FROM emp_dept d JOIN emp_loc l USING (emp) GROUP BY d.dept;
-- The preserving design is (emp, dept) + (dept, loc), where departments(dept PK, loc) enforces it.` }],
    codeTitle: ['Spurious rows from a lossy split', 'Lossless but dependency lost'],
    viz: {
      title: 'Split, rejoin, and hunt for spurious rows',
      input: 'emp loc | dept loc',
      inputLabel: 'Pick 2–3 column groups from emp, dept, loc (| separated)',
      gen: function (input) {
        var cols = ['emp', 'dept', 'loc'];
        var data = [['Asha', 'Sales', 'Pune'], ['Ben', 'Sales', 'Pune'], ['Chen', 'Eng', 'Pune'], ['Dara', 'HR', 'Delhi']];
        var fds = [{ l: ['emp'], r: ['dept'] }, { l: ['dept'], r: ['loc'] }];
        var groups = String(input || '').split('|').map(function (g) { return uniq(g.trim().split(/[\s,]+/).filter(Boolean)); }).filter(function (g) { return g.length; });
        if (groups.length < 2 || groups.length > 3) throw new Error('Give 2 or 3 groups, e.g.  emp dept | dept loc');
        groups.forEach(function (g) { g.forEach(function (a) { if (!has(cols, a)) throw new Error('Unknown column "' + a + '" — use emp, dept, loc'); }); });
        groups = groups.map(function (g) { return cols.filter(function (c) { return has(g, c); }); });
        var covered = uniq([].concat.apply([], groups));
        if (covered.length !== 3) throw new Error('Together the groups must cover emp, dept and loc');
        var key = function (r) { return r.join('|'); };
        var proj = function (g) { var seen = {}, out = []; data.forEach(function (r) { var p = g.map(function (c) { return r[cols.indexOf(c)]; }); if (!seen[key(p)]) { seen[key(p)] = 1; out.push(p); } }); return out; };
        var frames = [];
        frames.push({ narr: 'Original table with FDs emp → dept and dept → loc. Note Asha, Ben (Sales) and Chen (Eng) all share loc = Pune.', parts: [{ type: 'table', label: 'emp (original, 4 rows)', columns: cols, rows: data }, fdGraph(cols, fds, false)] });
        var projs = groups.map(proj);
        groups.forEach(function (g, i) {
          var h = {}; projs[i].forEach(function (_, k) { h[k] = 'ok'; });
          frames.push({ narr: 'Projection R' + (i + 1) + ' = SELECT DISTINCT ' + g.join(', ') + ' FROM emp → ' + projs[i].length + ' row(s).', parts: [{ type: 'table', label: 'R' + (i + 1) + '(' + g.join(', ') + ')', columns: g, rows: projs[i], hl: h }] });
        });
        if (groups.length === 2) {
          var common = inter(groups[0], groups[1]);
          var cl = closure(common, fds).res;
          var k1 = subset(groups[0], cl), k2 = subset(groups[1], cl);
          frames.push({ narr: 'Binary test: common columns = <b>' + (common.length ? common.join(', ') : 'none') + '</b>; closure = {' + cl.join(', ') + '}. ' + (common.length && (k1 || k2) ? '<span class="c-g">It covers R' + (k1 ? 1 : 2) + ' → the common columns are a key of that side → LOSSLESS.</span>' : '<span class="c-r">It covers neither side → LOSSY: expect spurious rows.</span>'), parts: [{ type: 'vars', label: 'lossless test', vals: { 'R1 ∩ R2': common.join(', ') || '∅', 'closure': cl.join(', ') || '∅', '→ R1?': k1 ? 'yes' : 'no', '→ R2?': k2 ? 'yes' : 'no' }, hl: { '→ R1?': k1 ? 'ok' : 'bad', '→ R2?': k2 ? 'ok' : 'bad' } }] });
        }
        var res = projs[0].map(function (r) { var o = {}; groups[0].forEach(function (c, i) { o[c] = r[i]; }); return o; });
        var attrsSoFar = groups[0].slice();
        for (var gi = 1; gi < groups.length; gi++) {
          var g = groups[gi], sh = inter(attrsSoFar, g), next = [];
          res.forEach(function (o) {
            projs[gi].forEach(function (r) {
              var ok = sh.every(function (c) { return o[c] === r[g.indexOf(c)]; });
              if (ok) { var n = {}; Object.keys(o).forEach(function (k) { n[k] = o[k]; }); g.forEach(function (c, i) { n[c] = r[i]; }); next.push(n); }
            });
          });
          res = next; attrsSoFar = uniq(attrsSoFar.concat(g));
          if (gi === groups.length - 1) break;
          frames.push({ narr: 'Intermediate join with R' + (gi + 1) + ' on ' + (sh.join(', ') || 'nothing (cross join!)') + ' → ' + res.length + ' rows.', parts: [{ type: 'table', label: 'partial join', columns: attrsSoFar, rows: res.map(function (o) { return attrsSoFar.map(function (c) { return o[c]; }); }) }] });
        }
        var orig = {}; data.forEach(function (r) { orig[key(r)] = 1; });
        var outRows = res.map(function (o) { return cols.map(function (c) { return o[c]; }); });
        var shown = [], hl = {}, spur = 0;
        outRows.forEach(function (r) {
          shown.push(r); var isO = !!orig[key(r)]; if (!isO) spur++;
          hl[shown.length - 1] = isO ? 'ok' : 'bad';
          if (frames.length < 30) frames.push({ narr: 'Join produces (' + r.join(', ') + ') — ' + (isO ? '<span class="c-g">a real row</span>.' : '<span class="c-r">never existed: SPURIOUS</span>.'), parts: [{ type: 'table', label: 'R1 ⋈ … (rebuilt)', columns: cols, rows: shown.map(function (x) { return x.slice(); }), hl: JSON.parse(JSON.stringify(hl)) }] });
        });
        frames.push({ narr: 'Rebuilt ' + outRows.length + ' rows vs 4 original. ' + (spur ? '<span class="c-r">' + spur + ' spurious row(s): the split is LOSSY.</span> We can no longer tell which department each employee is really in.' : '<span class="c-g">Exactly the original rows: LOSSLESS.</span>'), parts: [{ type: 'table', label: 'rebuilt vs original', columns: cols, rows: outRows, hl: hl }, { type: 'table', label: 'original', columns: cols, rows: data }] });
        var pr = preserved(fds, groups);
        frames.push({ narr: 'Dependency preservation: ' + fds.map(function (f, i) { return f.l[0] + ' → ' + f.r[0] + (pr[i] ? ' preserved' : ' LOST'); }).join('; ') + '. Try "emp dept | dept loc" for the ideal split (lossless + preserving), or "emp dept | emp loc" (lossless, but dept → loc is lost).', parts: [{ type: 'table', label: 'FD check', columns: ['FD', 'enforceable inside one table?'], rows: fds.map(function (f, i) { return [f.l[0] + ' → ' + f.r[0], pr[i] ? 'yes' : 'no (lost)']; }), hl: { 0: pr[0] ? 'ok' : 'bad', 1: pr[1] ? 'ok' : 'bad' } }] });
        return frames;
      }
    },
    examples: [
      { title: 'The binary test on paper', html: `<p>R(A, B, C, D), F = {A → B, C → D}. Split into (A, B) and (A, C, D): common = {A}, A⁺ = {A, B} ⊇ (A, B) ✔ lossless. Split (A, B, C) and (C, D): common = {C}, C⁺ = {C, D} ⊇ (C, D) ✔ lossless. Split (A, B) and (C, D): common = ∅ → a cross product → lossy (unless one table has a single row).</p>` },
      { title: 'Three-way split with the chase', html: `<p>R(A, B, C, D), F = {A → B, B → C}, split into R1(A, B), R2(B, C), R3(A, D). Chase tableau (one row per table, plain letters = columns that table has): (a, b, c₁, d₁) / (a₂, b, c, d₂) / (a, b₃, c₃, d). Apply A → B: rows 1 and 3 share a ⇒ make b₃ = b (row 1 has b distinguished). Apply B → C: rows 1, 2, 3 now share b ⇒ c₁ = c₃ = c. Row 3 becomes (a, b, c, d) — all distinguished ⇒ <b>lossless</b>. Equivalent shortcut: join R1 ⋈ R3 on A (A key of R1) then ⋈ R2 on B (B key of R2).</p>` },
      { title: 'Row explosion in everyday SQL is the same bug', html: `<p><code>orders JOIN payments ON orders.customer_id = payments.customer_id</code> joins on a column that is a key of neither table, so a customer with 3 orders and 2 payments yields 6 rows and SUM(amount) is inflated. That is a lossy "rejoin" in disguise. Always join on a column that is a key of at least one side (here: <code>payments.order_id = orders.id</code>).</p>`, code: { lang: 'sql', code: `CREATE TABLE orders   (id INTEGER PRIMARY KEY, customer_id INT, total INT);
CREATE TABLE payments (id INTEGER PRIMARY KEY, order_id INT, customer_id INT, amount INT);
INSERT INTO orders VALUES (1, 7, 100), (2, 7, 50), (3, 7, 30);
INSERT INTO payments VALUES (1, 1, 7, 100), (2, 2, 7, 50);
SELECT 'join on customer_id (non-key both sides)' AS how, COUNT(*) AS rows, SUM(p.amount) AS paid
FROM orders o JOIN payments p ON p.customer_id = o.customer_id
UNION ALL
SELECT 'join on order_id (key of orders)', COUNT(*), SUM(p.amount)
FROM orders o JOIN payments p ON p.order_id = o.id;` } },
      { title: 'Preservation check by "does it fit in one table?"', html: `<p>R(A, B, C), F = {A → B, B → C, A → C}. Split (A, B) + (B, C): A → B fits in R1, B → C fits in R2, and A → C is implied by those two ⇒ <b>preserved</b>. Split (A, B) + (A, C): A → B and A → C fit, but B → C needs both B and C together, which only happens through a join ⇒ <b>lost</b>. Both splits are lossless — the two properties are independent.</p>` }
    ],
    deepDive: `<h4>🟣 Proof of the binary test</h4>
<p>Let t be a row of R1 ⋈ R2 built from u ∈ R1 and v ∈ R2 that agree on X = R1 ∩ R2. If X → R2, then every row of R with X = u[X] has the same R2-part, namely v. Since u came from some real row r of R, r[R2] = v, so t = r ∈ R. Hence no spurious rows. Conversely, if X determines neither side, you can construct an instance with two rows agreeing on X but differing on both sides; the join creates the two "crossed" rows. That's why the condition is <b>iff</b> (for decompositions into two, under FDs only).</p>
<h4>The chase, generally</h4>
<p>For k tables, build a tableau with one row per table: distinguished symbols (a) for its columns, unique subscripted symbols elsewhere. Repeatedly apply FDs (equate symbols, preferring distinguished). Lossless iff some row becomes all-distinguished. The chase also handles MVDs and join dependencies, which is how 4NF/5NF losslessness is proven.</p>
<h4>Projection of FDs is expensive</h4>
<p>Computing the FDs that hold in a projection can require exponentially many FDs (consider all subsets). The polynomial preservation test avoids materializing them: for each X → Y in F, set Z = X and repeat Z := Z ∪ ((Z ∩ Ri)⁺ ∩ Ri) for every table Ri until stable; X → Y is preserved iff Y ⊆ Z. The visualizers in this module use exactly this test.</p>
<h4>Practical verification</h4>
<p>In migrations, the rejoin-and-<code>EXCEPT</code> check is cheap insurance: run it on a production snapshot before the cut-over. A non-zero "rows_invented" count means one of your "keys" is not unique in real data — exactly the dirty-data bugs that design reviews miss. Also compare row counts: rows_lost &gt; 0 typically means an INNER JOIN dropped rows whose FK was NULL or dangling.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI-generated migrations split tables quickly, and AI-generated analytics SQL joins tables quickly — both can be lossy without anyone noticing, because the query still "returns results". The skill of asking "is the join column a key on at least one side?" is more valuable than ever.</p>
<p><b>Use AI as a partner:</b> ask it to write the verification, not just the migration: <code>Generate EXCEPT-based checks in both directions plus row counts per table, and a query listing any join key that is duplicated on both sides.</code> For analytics, ask <code>which joins in this query can multiply rows?</code> — LLMs are decent at spotting fan-out once explicitly asked.</p>
<p><b>Where AI goes wrong:</b> it claims every decomposition is lossless "because both tables share a column", forgets that a shared non-key column causes fan-out, and confuses lossless with dependency preservation. <b>What you must still own:</b> the one-line binary test and the habit of verifying with data.</p>`,
    problems: [{
      title: 'Which Split Is Safe?',
      level: 'Medium', tags: ['lossless join', 'spurious tuples', 'dependency preservation'], companies: ['Amazon', 'SAP', 'Atlassian'],
      statement: `<p>R(student, course, room) with FD course → room (each course meets in one room); a student can take many courses and a room hosts many courses. Two proposals: <b>A</b> = (student, room) + (course, room); <b>B</b> = (student, course) + (course, room). For each, decide lossless or lossy and dependency-preserving or not; then prove it on data with SQL.</p>`,
      constraints: `<p>SQLite. Use the data: (Asha, DB, R1), (Asha, OS, R2), (Ben, AI, R1). Report rows after the join and the number of spurious rows for each split.</p>`,
      example: `<p>Split A joins on room: Asha-R1 matches courses DB and AI (both in R1) → ${H.c('r', '(Asha, AI, R1)')} appears although Asha never took AI. Split B joins on course: each course has one room → exactly the 3 original rows.</p>`,
      brute: {
        why: `<p>"Split by gut feeling" — just pick columns that look related and hope. Split A looks plausible (rooms are shared) but its common column room is a key of neither side, so the join invents enrolments. You only discover it when a report shows students in courses they never took.</p>`,
        code: `CREATE TABLE r (student TEXT, course TEXT, room TEXT, PRIMARY KEY (student, course));
INSERT INTO r VALUES ('Asha', 'DB', 'R1'), ('Asha', 'OS', 'R2'), ('Ben', 'AI', 'R1');
CREATE TABLE a1 AS SELECT DISTINCT student, room FROM r;
CREATE TABLE a2 AS SELECT DISTINCT course, room FROM r;
SELECT student, course, room FROM a1 NATURAL JOIN a2 ORDER BY student, course;   -- 5 rows, 2 fake`
      },
      mcq: { q: 'Why is split B lossless?', options: ['The common column course is a key of (course, room)', 'Both tables have two columns', 'student is a key of the original table', 'Because room appears only once'], answer: 0, explain: 'course → room, so course determines all of R2; each row of R1 finds exactly one partner.' },
      hints: [`<p>Hint 1: For each split, write the common columns and compute their closure under F.</p>`, `<p>Hint 2: A: common = {room}, room⁺ = {room} → covers neither side. B: common = {course}, course⁺ = {course, room} → covers R2.</p>`, `<p>Hint 3: Preservation: course → room must fit inside one table. In both A and B, (course, room) is a table. Then confirm with NATURAL JOIN + EXCEPT counts.</p>`],
      tests: { cmp: 'exact', engine: 'sqlite', cases: [
          { cols: ['split', 'rows_after_join', 'spurious'], rows: [['A: (student,room)+(course,room)', 5, 2], ['B: (student,course)+(course,room)', 3, 0]] },
          { after: 'SELECT student, course, room FROM a1 NATURAL JOIN a2 EXCEPT SELECT student, course, room FROM r ORDER BY 1, 2', rows: [['Asha', 'AI', 'R1'], ['Ben', 'DB', 'R1']] },
          { after: 'SELECT COUNT(*) FROM (SELECT student, course, room FROM b1 NATURAL JOIN b2 EXCEPT SELECT student, course, room FROM r)', rows: [[0]] },
          { after: 'SELECT COUNT(*) FROM (SELECT student, course, room FROM r EXCEPT SELECT student, course, room FROM b1 NATURAL JOIN b2)', rows: [[0]] },
          { after: 'SELECT (SELECT COUNT(*) FROM a1), (SELECT COUNT(*) FROM a2), (SELECT COUNT(*) FROM b1), (SELECT COUNT(*) FROM b2)', rows: [[3, 3, 3, 3]] },
          { after: 'SELECT course FROM b2 GROUP BY course HAVING COUNT(DISTINCT room) > 1', rows: [] },
          { after: 'SELECT student, room FROM a1 ORDER BY 1, 2', rows: [['Asha', 'R1'], ['Asha', 'R2'], ['Ben', 'R1']] },
          { after: 'SELECT COUNT(*) FROM r', rows: [[3]] }
        ] },
      solution: {
        approach: `<p><b>A:</b> common {room}; room⁺ = {room} ⇒ neither side ⇒ <b>lossy</b>. course → room is inside (course, room) ⇒ preserved, but useless because the data can't be rebuilt. <b>B:</b> common {course}; course⁺ = {course, room} ⊇ R2 ⇒ <b>lossless</b>; course → room lives in R2 ⇒ <b>preserved</b>. B is also BCNF: R2's key is course, R1's key is (student, course). The SQL counts rows after each join and the spurious rows via EXCEPT.</p>`,
        code: `CREATE TABLE r (student TEXT NOT NULL, course TEXT NOT NULL, room TEXT NOT NULL, PRIMARY KEY (student, course));
INSERT INTO r VALUES ('Asha', 'DB', 'R1'), ('Asha', 'OS', 'R2'), ('Ben', 'AI', 'R1');

CREATE TABLE a1 AS SELECT DISTINCT student, room   FROM r;   -- split A
CREATE TABLE a2 AS SELECT DISTINCT course,  room   FROM r;
CREATE TABLE b1 AS SELECT DISTINCT student, course FROM r;   -- split B
CREATE TABLE b2 AS SELECT DISTINCT course,  room   FROM r;

SELECT 'A: (student,room)+(course,room)' AS split,
       (SELECT COUNT(*) FROM a1 NATURAL JOIN a2) AS rows_after_join,
       (SELECT COUNT(*) FROM (SELECT student, course, room FROM a1 NATURAL JOIN a2
                              EXCEPT SELECT student, course, room FROM r)) AS spurious
UNION ALL
SELECT 'B: (student,course)+(course,room)',
       (SELECT COUNT(*) FROM b1 NATURAL JOIN b2),
       (SELECT COUNT(*) FROM (SELECT student, course, room FROM b1 NATURAL JOIN b2
                              EXCEPT SELECT student, course, room FROM r));`,
        complexity: `<p>The paper test is one closure per split: O(|F|·|R|). The data check is a join plus EXCEPT: O(N log N) with sorting/hashing.</p>`,
        followUps: ['Add FD room → building. Which split is still preserving?', 'Prove split A is lossy with a 2-row instance only.']
      }
    }]
  });

  /* =====================================================================
     TOPIC 8 — When to denormalize + star schema basics
     ===================================================================== */
  topics.push({
    title: 'Denormalization on Purpose & Star Schema Basics',
    analogy: `<p>A restaurant pantry is <b>normalized</b>: every ingredient in one labelled jar, nothing duplicated. During the Friday dinner rush the chef keeps a <b>prep tray</b> — chopped onions, sauce, garnish — right next to the stove. The tray <b>duplicates</b> what is in the pantry, and someone must refill it and throw out stale bits, but it makes every plate faster. Denormalization is the prep tray: a <b>deliberate, managed copy</b> for speed, with the pantry still the source of truth.</p>`,
    explain: `<p><b>🟢 The plain idea.</b> Normalization optimizes for <b>correct writes</b> (each fact once). Some workloads are dominated by <b>reads</b> — dashboards, feeds, search pages, analytics — where joining six tables on every request is the bottleneck. Denormalization = <b>storing a redundant copy or a precomputed answer</b> so reads get cheaper, and accepting the cost of keeping the copy in sync.</p>
<p><b>Common, legitimate forms:</b></p>
${H.table(['technique', 'example', 'kept in sync by'], [
  ['counter / aggregate column', 'posts.like_count', 'trigger, same transaction, or async job + periodic reconcile'],
  ['duplicated lookup column', 'order_items.product_name for invoices', 'often never — it is a snapshot'],
  ['summary / rollup table', 'daily_sales(day, store, revenue)', 'scheduled refresh, materialized view'],
  ['embedded document', 'order JSON with its line items (MongoDB)', 'written together as one aggregate'],
  ['star schema dimension', 'dim_product with category and brand inline', 'ETL/ELT loads']])}
<p><b>When to denormalize — a checklist:</b></p>
<ol>
<li>You <b>measured</b> a real read bottleneck (EXPLAIN, p95 latency) and indexes / query rewrites did not fix it.</li>
<li>Reads vastly outnumber writes to the copied data (e.g. 1000 : 1).</li>
<li>Slight staleness is acceptable, or you can update the copy in the <b>same transaction</b>.</li>
<li>You can name the <b>single source of truth</b> and the <b>refresh mechanism</b>, and you have a reconciliation query.</li>
<li>Or the data lives in an <b>analytics</b> store (OLAP), where denormalized star schemas are the norm.</li>
</ol>
<p>Slogan: <i>"Normalize until it hurts, denormalize until it works."</i> Default to 3NF/BCNF in OLTP; denormalize specific hot paths with a written reason.</p>
<p><b>🔵 Star schema basics (OLAP).</b> Data warehouses (Snowflake, BigQuery, Redshift, Databricks, DuckDB) model analytics data as a <b>star</b>:</p>
<ul>
<li><b>Fact table</b> — one row per business event at a declared <b>grain</b> ("one row per product per store per day"). Holds foreign keys to dimensions plus numeric <b>measures</b> (qty, revenue). Huge and narrow.</li>
<li><b>Dimension tables</b> — the "who / what / where / when" context: dim_date, dim_product, dim_store, dim_customer. Small and wide, deliberately <b>denormalized</b> (category and brand inline in dim_product, region inline in dim_store) so queries need one join per dimension.</li>
<li><b>Surrogate keys</b> (integers) on dimensions decouple the warehouse from source-system IDs and enable history tracking (<b>SCD Type 2</b>: a new dimension row per change, with valid_from/valid_to).</li>
<li><b>Snowflake schema</b> = dimensions normalized into sub-tables (product → category → department). Less redundancy, more joins; most teams prefer stars.</li>
</ul>
<p>Typical query: <code>SELECT d.month_name, s.region, SUM(f.revenue) FROM fact_sales f JOIN dim_date d … JOIN dim_store s … GROUP BY …</code> — filter and group on dimension columns, aggregate fact measures.</p>`,
    clues: [
      '"The dashboard / feed is slow because it joins many tables on every request" → consider a counter, summary table or materialized view (after measuring)',
      '"Read-heavy, rarely updated" or "1000× more reads than writes" → denormalization candidate',
      '"Design a data warehouse / analytics schema / reporting model" → star schema: fact at a declared grain + dimensions',
      '"Fact vs dimension table" / "what is the grain?" / "slowly changing dimension" → star-schema vocabulary',
      '"Store the price/address as it was at order time" → snapshot column, not a normalization violation',
      '"NoSQL / sharded DB with no joins" → embed or duplicate data per access pattern'
    ],
    code: [{ lang: 'sql', db: 'star', title: 'Star-schema query: revenue by month and region', code: `-- Filter/group on dimensions, aggregate measures from the fact table.
SELECT d.month_name,
       s.region,
       SUM(f.qty)     AS units,
       SUM(f.revenue) AS revenue
FROM   fact_sales f
JOIN   dim_date  d ON d.date_key  = f.date_key
JOIN   dim_store s ON s.store_key = f.store_key
GROUP  BY d.year, d.date_key / 100, d.month_name, s.region
ORDER  BY d.date_key / 100, revenue DESC;

-- Weekend vs weekday revenue per product category (one join per dimension, no snowflaking)
SELECT p.category,
       SUM(CASE WHEN d.is_weekend = 1 THEN f.revenue ELSE 0 END) AS weekend_revenue,
       SUM(CASE WHEN d.is_weekend = 0 THEN f.revenue ELSE 0 END) AS weekday_revenue
FROM fact_sales f
JOIN dim_date d    ON d.date_key = f.date_key
JOIN dim_product p ON p.product_key = f.product_key
GROUP BY p.category ORDER BY p.category;` },
    { lang: 'sql', title: 'Denormalized counter kept exact by triggers + a reconcile query', code: `PRAGMA foreign_keys = ON;
CREATE TABLE posts (
  id         INTEGER PRIMARY KEY,
  title      TEXT NOT NULL,
  like_count INTEGER NOT NULL DEFAULT 0 CHECK (like_count >= 0)   -- denormalized copy of COUNT(likes)
);
CREATE TABLE likes (
  post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL,
  PRIMARY KEY (post_id, user_id)                                  -- source of truth
);
-- Same-transaction maintenance: the copy can never drift
CREATE TRIGGER likes_ai AFTER INSERT ON likes BEGIN
  UPDATE posts SET like_count = like_count + 1 WHERE id = NEW.post_id;
END;
CREATE TRIGGER likes_ad AFTER DELETE ON likes BEGIN
  UPDATE posts SET like_count = like_count - 1 WHERE id = OLD.post_id;
END;

INSERT INTO posts (id, title) VALUES (1, 'Normalization 101'), (2, 'Star schemas');
INSERT INTO likes VALUES (1, 10), (1, 11), (1, 12), (2, 10);
DELETE FROM likes WHERE post_id = 1 AND user_id = 11;

-- Feed query reads one column instead of COUNT(*) over likes
SELECT id, title, like_count FROM posts ORDER BY like_count DESC;

-- Reconcile: any post whose copy disagrees with the truth? (should be empty)
SELECT p.id, p.like_count, COUNT(l.user_id) AS true_count
FROM posts p LEFT JOIN likes l ON l.post_id = p.id
GROUP BY p.id HAVING p.like_count <> COUNT(l.user_id);` },
    { lang: 'sql', db: 'star', title: 'A summary table as a "materialized view" (SQLite has none built in)', code: `-- Rollup at a coarser grain: one row per month per region
CREATE TABLE agg_sales_month_region (
  yyyymm  INTEGER NOT NULL,
  region  TEXT    NOT NULL,
  revenue INTEGER NOT NULL,
  PRIMARY KEY (yyyymm, region)
);
-- Full refresh (PostgreSQL would be: REFRESH MATERIALIZED VIEW CONCURRENTLY ...)
DELETE FROM agg_sales_month_region;
INSERT INTO agg_sales_month_region
SELECT f.date_key / 100, s.region, SUM(f.revenue)
FROM fact_sales f JOIN dim_store s ON s.store_key = f.store_key
GROUP BY f.date_key / 100, s.region;

-- Dashboards now read a handful of rows instead of scanning the fact table
SELECT * FROM agg_sales_month_region ORDER BY yyyymm, revenue DESC;` }],
    codeTitle: ['Star schema query', 'Trigger-maintained counter', 'Summary table refresh'],
    viz: [{
      title: 'Star schema: one fact, many dimensions',
      gen: function () {
        var nodes = [
          { id: 'F', label: 'fact_sales (grain: product × store × day)', x: 50, y: 32, shape: 'box' },
          { id: 'D', label: 'dim_date', x: 16, y: 8, shape: 'box' },
          { id: 'P', label: 'dim_product', x: 84, y: 8, shape: 'box' },
          { id: 'S', label: 'dim_store', x: 16, y: 56, shape: 'box' },
          { id: 'C', label: 'dim_customer', x: 84, y: 56, shape: 'box' }
        ];
        var edges = [['F', 'D', 'date_key'], ['F', 'P', 'product_key'], ['F', 'S', 'store_key'], ['F', 'C', 'customer_key']];
        var G = function (hl, ehl, tags) { return { type: 'graph', label: 'star schema', directed: true, height: 64, nodes: nodes, edges: edges, hl: hl || {}, ehl: ehl || {}, tags: tags || {} }; };
        var f = [];
        f.push({ narr: 'OLTP schemas are normalized for safe writes. Analytics asks different questions: "revenue by month and region", scanning millions of rows. The warehouse uses a <b>star</b>: one central fact table and a ring of dimension tables.', parts: [{ type: 'graph', label: 'normalized (snowflake) chain — 4 joins to reach department', directed: true, height: 30, nodes: [{ id: 's', label: 'sales', x: 10, y: 15, shape: 'box' }, { id: 'p', label: 'products', x: 35, y: 15, shape: 'box' }, { id: 'c', label: 'categories', x: 62, y: 15, shape: 'box' }, { id: 'd', label: 'departments', x: 88, y: 15, shape: 'box' }], edges: [['s', 'p'], ['p', 'c'], ['c', 'd']], hl: { d: 'cur' } }] });
        f.push({ narr: 'The <b>fact table</b> sits in the middle. First decision: the <b>grain</b> — one row per product per store per day. Each row holds dimension keys plus <b>measures</b> (qty, revenue).', parts: [G({ F: 'sel' }), { type: 'table', label: 'fact_sales (sample)', columns: ['date_key', 'product_key', 'store_key', 'qty', 'revenue'], rows: [[20260105, 1, 1, 2, 2400], [20260105, 2, 2, 5, 1500], [20260110, 3, 1, 1, 9000], [20260214, 3, 3, 2, 18000]], hl: { 0: 'cur' } }] });
        f.push({ narr: '<b>Dimensions</b> are deliberately denormalized: dim_product carries category and brand inline; dim_store carries city <b>and</b> region (city → region is a transitive dependency we keep on purpose). One join per dimension, ever.', parts: [G({ P: 'ok', S: 'ok' }), { type: 'table', label: 'dim_store', columns: ['store_key', 'name', 'city', 'region'], rows: [[1, 'MG Road', 'Bengaluru', 'South'], [2, 'Koregaon', 'Pune', 'West'], [3, 'Connaught', 'Delhi', 'North']], hl: { 0: 'ok', 1: 'ok', 2: 'ok' } }] });
        f.push({ narr: 'dim_date is precomputed: one row per day with month, quarter, weekend flag, holiday flag… Analysts filter on "is_weekend = 1" instead of writing date math.', parts: [G({ D: 'ok' }), { type: 'table', label: 'dim_date', columns: ['date_key', 'month', 'quarter', 'is_weekend'], rows: [[20260105, 'Jan', 'Q1', 0], [20260110, 'Jan', 'Q1', 1], [20260214, 'Feb', 'Q1', 1], [20260403, 'Apr', 'Q2', 0]], hl: { 1: 'sel', 2: 'sel' } }] });
        f.push({ narr: 'Query "revenue by month and region": scan the fact table, hop along two edges (date_key, store_key), group by dimension attributes.', parts: [G({ F: 'cur', D: 'ok', S: 'ok' }, { 'F-D': 'ok', 'F-S': 'ok' }), { type: 'code', label: 'query', lang: 'sql', code: 'SELECT d.month_name, s.region, SUM(f.revenue)\nFROM fact_sales f\nJOIN dim_date d  ON d.date_key  = f.date_key\nJOIN dim_store s ON s.store_key = f.store_key\nGROUP BY d.month_name, s.region;', hl: { 3: 'ok', 4: 'ok', 5: 'cur' } }] });
        f.push({ narr: 'Result (from the sample <code>star</code> database). Columnar warehouses read only the columns touched (date_key, store_key, revenue), which is why wide denormalized dimensions are cheap there.', parts: [{ type: 'table', label: 'revenue by month × region', columns: ['month', 'region', 'revenue'], rows: [['Jan', 'South', 11400], ['Jan', 'West', 1500], ['Jan', 'North', 900], ['Feb', 'North', 20000], ['Feb', 'West', 1200], ['Apr', 'North', 3600], ['Apr', 'South', 1800], ['Apr', 'West', 1250]], hl: { 3: 'sel' } }] });
        f.push({ narr: 'History: if store 2 moves from region West to South, <b>SCD Type 1</b> overwrites the row (history rewritten). <b>SCD Type 2</b> adds a new row with a new surrogate key and valid_from/valid_to, so old facts still report under West.', parts: [{ type: 'table', label: 'dim_store with SCD Type 2', columns: ['store_key', 'store_id', 'region', 'valid_from', 'valid_to', 'is_current'], rows: [[2, 'S-KOR', 'West', '2024-01-01', '2026-06-30', 0], [7, 'S-KOR', 'South', '2026-07-01', '9999-12-31', 1]], hl: { 0: 'done', 1: 'ok' } }] });
        f.push({ narr: 'Star vs snowflake: star = fewer joins, simpler SQL, some redundancy in small dimension tables (cheap). Snowflake = normalized dimensions, more joins. Most modern warehouses and BI tools favour the star.', parts: [{ type: 'table', label: 'comparison', columns: ['', 'star', 'snowflake', 'OLTP 3NF'], rows: [['joins per query', '1 per dimension', 'more', 'many'], ['redundancy', 'in dimensions', 'low', 'none'], ['optimized for', 'reads/aggregates', 'storage', 'writes/integrity']], hl: { 0: 'sel' } }] });
        return f;
      }
    }, {
      title: 'Denormalized counter: fast reads, and how copies drift',
      gen: function () {
        var f = [];
        var P = function (rows, hl, label) { return { type: 'table', label: label || 'posts (like_count = denormalized copy)', columns: ['id', 'title', 'like_count'], rows: rows, hl: hl || {} }; };
        var Lk = function (rows, hl) { return { type: 'table', label: 'likes (source of truth)', columns: ['post_id', 'user_id'], rows: rows, hl: hl || {} }; };
        f.push({ narr: 'Normalized: the feed computes <code>COUNT(*) FROM likes GROUP BY post_id</code> for every post shown. With millions of likes and a hot feed, that is a lot of repeated counting.', parts: [Lk([[1, 10], [1, 12], [2, 10]]), { type: 'table', label: 'computed on every request', columns: ['post_id', 'COUNT(*)'], rows: [[1, 2], [2, 1]], hl: { 0: 'cur', 1: 'cur' } }] });
        f.push({ narr: 'Denormalize: store <b>like_count</b> on posts. The feed now reads one integer per post — no aggregation. likes stays the <b>source of truth</b>.', parts: [P([[1, 'Normalization 101', 2], [2, 'Star schemas', 1]], { 0: 'ok', 1: 'ok' }), Lk([[1, 10], [1, 12], [2, 10]])] });
        f.push({ narr: 'User 15 likes post 1. A trigger (or the same transaction) inserts into likes <b>and</b> increments the counter atomically. Both change together (green).', parts: [Lk([[1, 10], [1, 12], [2, 10], [1, 15]], { 3: 'ok' }), P([[1, 'Normalization 101', 3], [2, 'Star schemas', 1]], { 0: 'ok' })] });
        f.push({ narr: '<b>The danger:</b> a cleanup script deletes spam likes with a bulk DELETE that bypasses the app\'s counter logic (no trigger installed). likes loses a row; like_count does not move. The copy has <b>drifted</b> (red).', parts: [Lk([[1, 10], [1, 12], [2, 10]], {}), P([[1, 'Normalization 101', 3], [2, 'Star schemas', 1]], { 0: 'bad' })] });
        f.push({ narr: 'Write amplification: every like is now two writes, and a viral post concentrates them on <b>one hot row</b> (lock contention). At scale teams shard the counter or buffer increments and flush them asynchronously.', parts: [{ type: 'table', label: 'cost of the copy', columns: ['concern', 'normalized', 'denormalized counter'], rows: [['feed read', 'COUNT per post', '1 column read'], ['like write', '1 insert', '1 insert + 1 update (hot row)'], ['risk', 'none', 'drift if any path forgets to update']], hl: { 1: 'cur', 2: 'bad' } }] });
        f.push({ narr: 'Safety net: a scheduled <b>reconcile query</b> compares the copy with the truth and repairs it. Every deliberate copy needs one.', parts: [{ type: 'code', label: 'reconcile', lang: 'sql', code: 'UPDATE posts SET like_count =\n  (SELECT COUNT(*) FROM likes l WHERE l.post_id = posts.id)\nWHERE like_count <>\n  (SELECT COUNT(*) FROM likes l WHERE l.post_id = posts.id);', hl: { 1: 'ok', 3: 'cur' } }, P([[1, 'Normalization 101', 2], [2, 'Star schemas', 1]], { 0: 'ok' })] });
        f.push({ narr: 'Another copy that is <b>not</b> a bug: order_items.unit_price_at_sale. When the catalogue price changes, old orders must keep the old price. It is a separate fact (a snapshot), so there is nothing to reconcile.', parts: [{ type: 'table', label: 'products (current price)', columns: ['sku', 'price'], rows: [['P-LAMP', 1350]], hl: { 0: 'cur' } }, { type: 'table', label: 'order_items (price at sale — must NOT change)', columns: ['order_id', 'sku', 'unit_price_at_sale'], rows: [[101, 'P-LAMP', 1200], [105, 'P-LAMP', 1200]], hl: { 0: 'sel', 1: 'sel' } }] });
        return f;
      }
    }],
    examples: [
      { title: 'Snapshot columns (address and price at order time)', html: `<p>An invoice must show the shipping address and price <b>as they were</b>. Copying <code>ship_to_address</code> and <code>unit_price_at_sale</code> into the order is required for correctness (and often by tax law). Name them clearly so nobody "normalizes" them away and nobody tries to keep them in sync with the live customer row.</p>` },
      { title: 'Materialized view for a heavy dashboard', html: `<p>A sales dashboard runs a 6-table join over 200 M rows every 30 s. A PostgreSQL <code>MATERIALIZED VIEW daily_sales</code> refreshed every 5 minutes with <code>REFRESH MATERIALIZED VIEW CONCURRENTLY</code> (needs a unique index) turns that into reading ~10 K rows. Staleness ≤ 5 min was acceptable to the business — get that in writing.</p>` },
      { title: 'NoSQL: duplicate per access pattern', html: `<p>In DynamoDB/Cassandra there are no joins, so you design tables per query: <code>orders_by_customer</code> and <code>orders_by_status</code> both hold the order data. That is denormalization by design; the writer (or a stream processor via CDC) updates both. The trade-off is identical: faster reads, multiple writes, possible temporary inconsistency.</p>` },
      { title: 'Star query on the sample warehouse', html: `<p>Which brand sold the most units on weekends? One join to dim_date (filter), one to dim_product (group) — no category or brand tables needed, because the dimension is denormalized.</p>`, code: { lang: 'sql', db: 'star', code: `SELECT p.brand, SUM(f.qty) AS weekend_units
FROM fact_sales f
JOIN dim_date d    ON d.date_key = f.date_key AND d.is_weekend = 1
JOIN dim_product p ON p.product_key = f.product_key
GROUP BY p.brand
ORDER BY weekend_units DESC;` } }
    ],
    deepDive: `<h4>🟣 Ways to keep a copy correct, from strongest to weakest</h4>
<ol>
<li><b>Same transaction</b> (trigger or app code in one transaction): never visibly inconsistent; costs write latency and can create hot-row contention.</li>
<li><b>Synchronous materialized view</b> (incrementally maintained: SQL Server indexed views, Oracle fast-refresh MVs, Materialize/RisingWave streaming views): engine-guaranteed; restrictions on allowed SQL.</li>
<li><b>Scheduled refresh</b> (PostgreSQL <code>REFRESH MATERIALIZED VIEW</code>, dbt models, warehouse tasks): simple; bounded staleness.</li>
<li><b>Change Data Capture</b> (Debezium → Kafka → consumer updating a search index/cache): decoupled and scalable; eventual consistency, ordering and replay concerns.</li>
<li><b>Application-level "remember to update both"</b>: weakest; drifts the first time someone writes via another path (scripts, admin tools, another service).</li>
</ol>
<p>Whatever you choose, keep a <b>reconcile job</b> that compares copy vs source and alerts on drift.</p>
<h4>Hot counters at scale</h4>
<p>A single <code>like_count</code> row on a viral post becomes a lock hotspot. Mitigations: sharded counters (N sub-rows summed on read), buffered increments in Redis flushed periodically, approximate counts (HyperLogLog for unique viewers), or CRDT counters in multi-leader systems.</p>
<h4>Why star schemas fit columnar engines</h4>
<p>Column stores compress repeated dimension values (dictionary + run-length encoding), so "redundant" text costs little. Fact tables are scanned with vectorized execution and joined to small dimensions with broadcast hash joins. The <b>grain</b> is the most important design decision: mixing grains (daily and monthly rows in one fact table) causes double counting. Kimball's rules: declare the grain first, use conformed dimensions shared across facts, prefer additive measures, and model history with SCD Type 2 where analysts need "as-was" reporting.</p>
<h4>Modern twists</h4>
<p>"One Big Table" (OBT) — fully pre-joined wide tables — is popular in lakehouses for BI speed; it is a star schema joined in advance, with the same redundancy trade-offs. Data vault and 6NF-style models sit at the other extreme for auditable raw layers, and are later projected into stars for consumption.</p>`,
    aiEra: `<p><b>What AI changes:</b> text-to-SQL agents and BI copilots work dramatically better on <b>star schemas</b> with clear names (<code>fact_sales</code>, <code>dim_customer.region</code>) than on 40-table normalized OLTP schemas — fewer joins means fewer ways for the model to fan out rows or pick the wrong path. Many teams now build a "semantic layer" or OBT specifically so AI assistants can answer business questions reliably.</p>
<p><b>Use AI as a partner:</b> ask an LLM to propose the fact grain, measures and dimensions from a list of business questions, and to generate the dbt/SQL transformations. Then demand the reconcile tests: <code>generate a query that proves SUM(revenue) in the star equals SUM(revenue) in the source for every day</code>.</p>
<p><b>Where AI goes wrong:</b> it denormalizes without a refresh strategy, mixes grains in one fact table, adds non-additive measures (ratios, distinct counts) as if they can be summed, and recommends caching counters without any drift detection. <b>What you must still own:</b> the decision to denormalize (with measurements), the source of truth, the consistency model the business accepts, and the grain.</p>`,
    problems: [{
      title: 'Product Page Rating Summary',
      level: 'Medium', tags: ['denormalization', 'triggers', 'aggregates'], companies: ['Amazon', 'Flipkart', 'Etsy'],
      statement: `<p>A product page shows "★ 4.3 (1,284 reviews)". Computing <code>AVG(rating), COUNT(*)</code> over the reviews table on every page view is the top query in your database. Design a denormalized summary that keeps the page to a single-row read, stays exactly correct on insert, update and delete of reviews, and can be verified.</p>`,
      constraints: `<p>SQLite. Reviews: (product_id, user_id) is unique; rating 1–5; a user can edit or delete a review. Average must be exact (no drift).</p>`,
      example: `<p>Ratings 5, 4, 4 → count 3, sum 13, average ${H.c('g', '4.33')}. Edit the 5 into a 2 → sum 10, average ${H.c('g', '3.33')}. Delete one 4 → count 2, sum 6, average 3.0.</p>`,
      brute: {
        why: `<p>Normalized only: every page view runs an aggregate over that product's reviews. With an index on product_id it is O(k) for k reviews — fine for small k, but best-sellers have hundreds of thousands of reviews and millions of views. Storing <code>avg_rating</code> alone is also wrong: you cannot update an average correctly without the count and sum.</p>`,
        code: `CREATE TABLE reviews (product_id INTEGER NOT NULL, user_id INTEGER NOT NULL,
                      rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
                      PRIMARY KEY (product_id, user_id));
INSERT INTO reviews VALUES (1, 10, 5), (1, 11, 4), (1, 12, 4), (2, 10, 3);
-- Runs on EVERY product page view:
SELECT product_id, ROUND(AVG(rating), 2) AS avg_rating, COUNT(*) AS review_count
FROM reviews WHERE product_id = 1 GROUP BY product_id;`
      },
      mcq: { q: 'Which columns should the summary store to stay exact under inserts, edits and deletes?', options: ['review_count and rating_sum (average computed on read)', 'avg_rating only', 'avg_rating and last_rating', 'Nothing — use a cache with a 1-hour TTL'], answer: 0, explain: 'Count and sum can be adjusted incrementally by +/- deltas; an average alone cannot.' },
      hints: [`<p>Hint 1: Store additive quantities. Count and sum can be adjusted by deltas; the average is sum / count at read time.</p>`, `<p>Hint 2: Three triggers: AFTER INSERT (+1, +rating), AFTER DELETE (−1, −rating), AFTER UPDATE OF rating (sum += new − old).</p>`, `<p>Hint 3: Use an UPSERT in the insert trigger so a product's first review creates its summary row. Finish with a reconcile query comparing to the source.</p>`],
      tests: { cmp: 'exact', engine: 'sqlite', cases: [
          { cols: ['product_id', 'review_count', 'avg_rating'], rows: [[1, 2, 3], [2, 1, 3]] },
          { after: 'INSERT INTO reviews VALUES (1, 13, 5); SELECT review_count, rating_sum FROM product_rating_summary WHERE product_id = 1', rows: [[3, 11]] },
          { after: 'INSERT INTO reviews VALUES (3, 1, 4); SELECT review_count, rating_sum FROM product_rating_summary WHERE product_id = 3', rows: [[1, 4]] },
          { after: 'DELETE FROM reviews WHERE product_id = 2; SELECT review_count, rating_sum, ROUND(rating_sum * 1.0 / NULLIF(review_count, 0), 2) FROM product_rating_summary WHERE product_id = 2', rows: [[0, 0, null]] },
          { after: 'UPDATE reviews SET rating = 5 WHERE product_id = 1 AND user_id = 12; SELECT rating_sum FROM product_rating_summary WHERE product_id = 1', rows: [[7]] },
          { after: 'DELETE FROM reviews WHERE product_id = 1; SELECT review_count, rating_sum FROM product_rating_summary WHERE product_id = 1', rows: [[0, 0]] },
          { after: 'INSERT INTO reviews VALUES (4, 1, 5), (4, 2, 4), (4, 3, 4); UPDATE reviews SET rating = 2 WHERE product_id = 4 AND user_id = 1; SELECT review_count, rating_sum FROM product_rating_summary WHERE product_id = 4', rows: [[3, 10]] },
          { after: 'INSERT INTO reviews VALUES (1, 20, 1), (1, 21, 3), (5, 1, 5); UPDATE reviews SET rating = 4 WHERE product_id = 1 AND user_id = 20; DELETE FROM reviews WHERE product_id = 1 AND user_id = 12; DELETE FROM reviews WHERE product_id = 2 AND user_id = 10; SELECT s.product_id FROM product_rating_summary s LEFT JOIN reviews r ON r.product_id = s.product_id GROUP BY s.product_id HAVING s.review_count <> COUNT(r.rating) OR s.rating_sum <> COALESCE(SUM(r.rating), 0)', rows: [] },
          { after: 'UPDATE reviews SET rating = rating WHERE product_id = 1; SELECT review_count, rating_sum FROM product_rating_summary WHERE product_id = 1', rows: [[2, 6]] },
          { after: 'INSERT INTO reviews VALUES (1, 30, 6)', error: 'CHECK' },
          { after: 'INSERT INTO reviews VALUES (1, 30, 0)', error: 'CHECK' },
          { after: 'INSERT INTO reviews VALUES (1, 10, 3)', error: 'UNIQUE' },
          { after: 'SELECT product_id, review_count, rating_sum FROM product_rating_summary ORDER BY product_id', rows: [[1, 2, 6], [2, 1, 3]] }
        ] },
      solution: {
        approach: `<p>Keep <code>reviews</code> as the source of truth and add <code>product_rating_summary(product_id PK, review_count, rating_sum)</code>. Triggers apply deltas inside the same transaction as the review change, so the summary is never visibly wrong. The page reads one row and computes <code>rating_sum * 1.0 / review_count</code>. A reconcile query (and a scheduled job running it) detects drift from any path that bypasses triggers (bulk loads with triggers disabled, restores).</p>`,
        code: `PRAGMA foreign_keys = ON;
CREATE TABLE reviews (
  product_id INTEGER NOT NULL, user_id INTEGER NOT NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  PRIMARY KEY (product_id, user_id));
CREATE TABLE product_rating_summary (
  product_id   INTEGER PRIMARY KEY,
  review_count INTEGER NOT NULL CHECK (review_count >= 0),
  rating_sum   INTEGER NOT NULL CHECK (rating_sum >= 0));

CREATE TRIGGER rev_ai AFTER INSERT ON reviews BEGIN
  INSERT INTO product_rating_summary (product_id, review_count, rating_sum)
  VALUES (NEW.product_id, 1, NEW.rating)
  ON CONFLICT (product_id) DO UPDATE
    SET review_count = review_count + 1, rating_sum = rating_sum + excluded.rating_sum;
END;
CREATE TRIGGER rev_ad AFTER DELETE ON reviews BEGIN
  UPDATE product_rating_summary
  SET review_count = review_count - 1, rating_sum = rating_sum - OLD.rating
  WHERE product_id = OLD.product_id;
END;
CREATE TRIGGER rev_au AFTER UPDATE OF rating ON reviews BEGIN
  UPDATE product_rating_summary
  SET rating_sum = rating_sum + NEW.rating - OLD.rating
  WHERE product_id = NEW.product_id;
END;

INSERT INTO reviews VALUES (1, 10, 5), (1, 11, 4), (1, 12, 4), (2, 10, 3);
UPDATE reviews SET rating = 2 WHERE product_id = 1 AND user_id = 10;
DELETE FROM reviews WHERE product_id = 1 AND user_id = 11;

-- Product page: one primary-key lookup
SELECT product_id, review_count, ROUND(rating_sum * 1.0 / NULLIF(review_count, 0), 2) AS avg_rating
FROM product_rating_summary ORDER BY product_id;

-- Reconcile (should return no rows)
SELECT s.product_id, s.review_count, COUNT(r.rating) AS true_count, s.rating_sum, SUM(r.rating) AS true_sum
FROM product_rating_summary s LEFT JOIN reviews r ON r.product_id = s.product_id
GROUP BY s.product_id
HAVING s.review_count <> COUNT(r.rating) OR s.rating_sum <> COALESCE(SUM(r.rating), 0);`,
        complexity: `<p>Page read: O(log P) primary-key lookup instead of O(k) aggregation. Each review write adds one indexed UPDATE/UPSERT (O(log P)) — and makes the product's summary row a potential hot spot for very popular items.</p>`,
        followUps: ['A product gets 5,000 reviews per minute during a sale — how do you avoid the hot row?', 'Show a histogram (how many 1★…5★). What extra columns or table?']
      }
    }]
  });

  /* =====================================================================
     PRACTICE — Easy
     ===================================================================== */
  practice.push({
    title: 'Library Loans: Spot and Fix the Anomalies',
    level: 'Easy', tags: ['anomalies', '3NF', 'decomposition'], companies: ['Infosys', 'Wipro', 'Oracle'],
    statement: `<p>A library tracks loans in <code>loans(loan_id, isbn, book_title, author, member_id, member_name, member_phone, loan_date)</code>. Rules: an ISBN has one title and author; a member has one name and phone. Name the update, insert and delete anomaly with a concrete example and write the normalized schema with sample data.</p>`,
    constraints: `<p>SQLite. Key of the original table: loan_id. Enforce rules with primary/foreign keys.</p>`,
    example: `<p>Member 7 (Asha, 98450) borrows 3 books → her phone appears ${H.c('r', '3 times')}. A new book can't be catalogued until it is borrowed. Deleting the only loan of "Dune" forgets the book exists.</p>`,
    brute: {
      why: `<p>The flat table copies book facts per loan and member facts per loan. Asha changing her phone needs N updates; a typo in one of them gives two phones; returning-and-purging old loans wipes book and member records.</p>`,
      code: `CREATE TABLE loans (loan_id INTEGER PRIMARY KEY, isbn TEXT, book_title TEXT, author TEXT,
                    member_id INTEGER, member_name TEXT, member_phone TEXT, loan_date TEXT);
INSERT INTO loans VALUES
  (1, '978-0441', 'Dune', 'Herbert', 7, 'Asha', '98450', '2026-01-02'),
  (2, '978-0547', 'The Hobbit', 'Tolkien', 7, 'Asha', '98450', '2026-01-09'),
  (3, '978-0547', 'The Hobbit', 'Tolkien', 8, 'Ben', '99000', '2026-02-01');
UPDATE loans SET member_phone = '90000' WHERE loan_id = 1;     -- Asha now has 2 phones on file
SELECT member_id, GROUP_CONCAT(DISTINCT member_phone) AS phones FROM loans GROUP BY member_id;`
    },
    mcq: { q: 'Deleting loan 1 also erases the fact that "Dune" is in the catalogue. Which anomaly?', options: ['Delete anomaly', 'Insert anomaly', 'Update anomaly', 'Lost update'], answer: 0, explain: 'Removing one fact (a loan) unintentionally removed another (the book).' },
    hints: [`<p>Hint 1: Columns describe three things: a book (by ISBN), a member (by member_id), and the loan event itself.</p>`, `<p>Hint 2: isbn → title, author and member_id → name, phone are transitive through the loan key — 3NF violations.</p>`, `<p>Hint 3: books(isbn PK), members(member_id PK), loans(loan_id PK, isbn FK, member_id FK, loan_date). Rejoin with a view for reports.</p>`],
    tests: { cmp: 'exact', engine: 'sqlite', cases: [
        { cols: ['title', 'times_borrowed'], rows: [['Dune', 0], ['Neuromancer', 0], ['The Hobbit', 2]] },
        { after: 'SELECT phone FROM members WHERE member_id = 7', rows: [['90000']] },
        { after: 'INSERT INTO loans VALUES (4, \'978-0062\', 7, \'2026-03-01\'); SELECT COUNT(*) FROM loans WHERE member_id = 7', rows: [[2]] },
        { after: 'INSERT INTO books VALUES (\'978-9999\', \'New Book\', \'Anon\'); SELECT COUNT(*) FROM books', rows: [[4]] },
        { after: 'INSERT INTO loans VALUES (9, \'000-0000\', 7, \'2026-03-01\')', error: 'FOREIGN KEY' },
        { after: 'INSERT INTO loans VALUES (9, \'978-0441\', 99, \'2026-03-01\')', error: 'FOREIGN KEY' },
        { after: 'DELETE FROM books WHERE isbn = \'978-0547\'', error: 'FOREIGN KEY' },
        { after: 'DELETE FROM members WHERE member_id = 8', error: 'FOREIGN KEY' },
        { after: 'INSERT INTO books VALUES (\'978-0441\', \'Dup\', \'X\')', error: 'UNIQUE' },
        { after: 'INSERT INTO members (member_id, name) VALUES (9, \'NoPhone\')', error: 'NOT NULL' },
        { after: 'INSERT INTO loans (loan_id, isbn, member_id) VALUES (9, \'978-0441\', 7)', error: 'NOT NULL' },
        { after: 'SELECT loan_id FROM loans ORDER BY loan_id', rows: [[2], [3]] }
      ] },
    solution: {
      approach: `<p>Key loan_id is single-column, so the table is 2NF; isbn and member_id are non-key determinants of non-prime columns → not 3NF. Move each into its own table keyed by the determinant. Update: one row in members. Insert: books can exist with zero loans. Delete: removing a loan touches only loans.</p>`,
      code: `PRAGMA foreign_keys = ON;
CREATE TABLE books   (isbn TEXT PRIMARY KEY, title TEXT NOT NULL, author TEXT NOT NULL);
CREATE TABLE members (member_id INTEGER PRIMARY KEY, name TEXT NOT NULL, phone TEXT NOT NULL);
CREATE TABLE loans (
  loan_id   INTEGER PRIMARY KEY,
  isbn      TEXT    NOT NULL REFERENCES books(isbn),
  member_id INTEGER NOT NULL REFERENCES members(member_id),
  loan_date TEXT    NOT NULL);
INSERT INTO books   VALUES ('978-0441', 'Dune', 'Herbert'), ('978-0547', 'The Hobbit', 'Tolkien'),
                           ('978-0062', 'Neuromancer', 'Gibson');          -- never borrowed: fine
INSERT INTO members VALUES (7, 'Asha', '98450'), (8, 'Ben', '99000');
INSERT INTO loans   VALUES (1, '978-0441', 7, '2026-01-02'), (2, '978-0547', 7, '2026-01-09'), (3, '978-0547', 8, '2026-02-01');
UPDATE members SET phone = '90000' WHERE member_id = 7;                     -- one row
DELETE FROM loans WHERE loan_id = 1;                                       -- Dune survives
SELECT b.title, (SELECT COUNT(*) FROM loans l WHERE l.isbn = b.isbn) AS times_borrowed
FROM books b ORDER BY b.title;`,
      complexity: `<p>Updates touch one row via PK; reports need two indexed joins (index loans.isbn and loans.member_id).</p>`,
      followUps: ['A book has several copies with different shelf locations — add the right table.', 'Several authors per book?']
    }
  });

  practice.push({
    title: 'Survey Answers in Repeating Columns → 1NF',
    level: 'Easy', tags: ['1NF', 'repeating group', 'unpivot'], companies: ['SurveyMonkey', 'Typeform', 'Google'],
    statement: `<p><code>responses(respondent_id, name, answer1, answer2, answer3)</code> stores answers to questions 1–3 in separate columns. The team wants a 4th question and a report "how many people answered 'yes' to each question". Explain why this is 0NF and migrate to a 1NF design.</p>`,
    constraints: `<p>SQLite. Unanswered questions are NULL and must not create rows. A respondent answers each question at most once.</p>`,
    example: `<p>(1, Asha, yes, no, NULL), (2, Ben, yes, yes, yes). Report: question 1 → ${H.c('g', '2 yes')}, question 2 → 1 yes, question 3 → 1 yes.</p>`,
    brute: {
      why: `<p>A repeating group (answer1..answer3) hard-codes the number of questions. Adding question 4 needs ALTER TABLE and changes to every query; the per-question report needs one CASE per column; NULL padding wastes space.</p>`,
      code: `CREATE TABLE responses (respondent_id INTEGER PRIMARY KEY, name TEXT, answer1 TEXT, answer2 TEXT, answer3 TEXT);
INSERT INTO responses VALUES (1, 'Asha', 'yes', 'no', NULL), (2, 'Ben', 'yes', 'yes', 'yes');
SELECT SUM(answer1 = 'yes') AS q1_yes, SUM(answer2 = 'yes') AS q2_yes, SUM(answer3 = 'yes') AS q3_yes FROM responses;`
    },
    mcq: { q: 'What is the 1NF fix for answer1..answer3?', options: ['A child table answers(respondent_id, question_no, answer)', 'Add answer4 and answer5 columns', 'Store all answers as one comma-separated string', 'Make answer1 the primary key'], answer: 0, explain: 'Each answer becomes its own row keyed by (respondent, question).' },
    hints: [`<p>Hint 1: Each answer is a separate fact: "respondent 1 answered question 2 with no". Facts become rows.</p>`, `<p>Hint 2: Unpivot with UNION ALL: SELECT id, 1, answer1 … UNION ALL SELECT id, 2, answer2 …, skipping NULLs.</p>`, `<p>Hint 3: Key the new table by (respondent_id, question_no). The report becomes GROUP BY question_no.</p>`],
    tests: { cmp: 'exact', engine: 'sqlite', cases: [
        { cols: ['question_no', 'yes_count', 'answered'], rows: [[1, 2, 2], [2, 1, 2], [3, 1, 1], [4, 1, 1]] },
        { after: 'SELECT COUNT(*) FROM answers', rows: [[6]] },
        { after: 'SELECT COUNT(*) FROM answers WHERE answer IS NULL', rows: [[0]] },
        { after: 'SELECT question_no, COUNT(*) FROM answers WHERE answer = \'yes\' GROUP BY question_no ORDER BY question_no', rows: [[1, 2], [2, 1], [3, 1], [4, 1]] },
        { after: 'SELECT question_no, answer FROM answers WHERE respondent_id = 1 ORDER BY question_no', rows: [[1, 'yes'], [2, 'no'], [4, 'yes']] },
        { after: 'INSERT INTO respondents VALUES (3, \'Cy\'); SELECT COUNT(*) FROM answers WHERE respondent_id = 3', rows: [[0]] },
        { after: 'INSERT INTO answers VALUES (1, 1, \'maybe\')', error: 'UNIQUE' },
        { after: 'INSERT INTO answers VALUES (1, 0, \'yes\')', error: 'CHECK' },
        { after: 'INSERT INTO answers VALUES (9, 1, \'yes\')', error: 'FOREIGN KEY' },
        { after: 'INSERT INTO answers VALUES (2, 5, NULL)', error: 'NOT NULL' },
        { after: 'INSERT INTO answers VALUES (2, 4, \'no\'), (2, 5, \'yes\'); SELECT COUNT(*) FROM answers WHERE question_no >= 4', rows: [[3]] }
      ] },
    solution: {
      approach: `<p>Keep respondents(respondent_id, name); create answers(respondent_id, question_no, answer) with PK (respondent_id, question_no). Unpivot the three columns with UNION ALL and a NOT NULL filter. New questions are new rows — no schema change — and the report is one GROUP BY.</p>`,
      code: `PRAGMA foreign_keys = ON;
CREATE TABLE responses_old (respondent_id INTEGER PRIMARY KEY, name TEXT, answer1 TEXT, answer2 TEXT, answer3 TEXT);
INSERT INTO responses_old VALUES (1, 'Asha', 'yes', 'no', NULL), (2, 'Ben', 'yes', 'yes', 'yes');

CREATE TABLE respondents (respondent_id INTEGER PRIMARY KEY, name TEXT NOT NULL);
CREATE TABLE answers (
  respondent_id INTEGER NOT NULL REFERENCES respondents(respondent_id),
  question_no   INTEGER NOT NULL CHECK (question_no > 0),
  answer        TEXT    NOT NULL,
  PRIMARY KEY (respondent_id, question_no));

INSERT INTO respondents SELECT respondent_id, name FROM responses_old;
INSERT INTO answers
SELECT respondent_id, 1, answer1 FROM responses_old WHERE answer1 IS NOT NULL
UNION ALL SELECT respondent_id, 2, answer2 FROM responses_old WHERE answer2 IS NOT NULL
UNION ALL SELECT respondent_id, 3, answer3 FROM responses_old WHERE answer3 IS NOT NULL;

INSERT INTO answers VALUES (1, 4, 'yes');          -- question 4: just a row
SELECT question_no, SUM(answer = 'yes') AS yes_count, COUNT(*) AS answered
FROM answers GROUP BY question_no ORDER BY question_no;`,
      complexity: `<p>Migration O(N × Q). The report is a single scan / GROUP BY; adding questions costs no DDL.</p>`,
      followUps: ['Questions have text and a type (yes/no, rating). Where do those live?', 'How would you pivot back for a CSV export?']
    }
  });

  practice.push({
    title: 'Identify the Normal Form: R(A, B, C)',
    level: 'Easy', tags: ['identify normal form', '3NF', 'transitive dependency'], companies: ['TCS', 'Accenture', 'Cognizant'],
    statement: `<p>R(A, B, C) with F = {A → B, B → C}. What is the candidate key, what is the highest normal form, and why? Decompose to BCNF and show the tables in SQL with sample data (A = employee, B = department, C = department head).</p>`,
    constraints: `<p>Answer must name the violating FD. SQL must run in SQLite.</p>`,
    example: `<p>A⁺ = {A, B, C} → key ${H.c('p', 'A')}. Single-column key → no partial dependency → 2NF. B → C: B is not a superkey and C is not prime → ${H.c('r', 'not 3NF')}. Highest: <b>2NF</b>.</p>`,
    brute: {
      why: `<p>Leaving R as one table stores each department head once per employee; changing a head is an N-row update and a department without employees can't record its head.</p>`,
      code: `CREATE TABLE r (emp TEXT PRIMARY KEY, dept TEXT NOT NULL, dept_head TEXT NOT NULL);
INSERT INTO r VALUES ('Asha', 'Sales', 'Meera'), ('Ben', 'Sales', 'Meera'), ('Chen', 'Eng', 'Ravi');
UPDATE r SET dept_head = 'Kiran' WHERE emp = 'Asha';        -- Sales now has two heads
SELECT dept, COUNT(DISTINCT dept_head) AS heads FROM r GROUP BY dept;`
    },
    mcq: { q: 'R(A,B,C), F = {A → B, B → C}. Highest normal form?', options: ['2NF', '1NF', '3NF', 'BCNF'], answer: 0, explain: 'Key is A (single attribute) so 2NF holds; B → C is transitive so 3NF fails.' },
    hints: [`<p>Hint 1: Compute A⁺. If it is everything, A is the key; B and C are not in any key (non-prime).</p>`, `<p>Hint 2: A single-attribute key can't have partial dependencies. Check every FD for 3NF: is the left side a superkey or the right side prime?</p>`, `<p>Hint 3: Split on B → C: (B, C) with key B, and (A, B) with key A. Shared column B is a key of (B, C) → lossless.</p>`],
    tests: { cmp: 'exact', engine: 'sqlite', cases: [
        { cols: ['emp', 'dept', 'dept_head'], rows: [['Asha', 'Sales', 'Kiran'], ['Ben', 'Sales', 'Kiran'], ['Chen', 'Eng', 'Ravi']] },
        { after: 'SELECT dept, dept_head FROM departments ORDER BY dept', rows: [['Eng', 'Ravi'], ['Legal', 'Iqbal'], ['Sales', 'Kiran']] },
        { after: 'UPDATE departments SET dept_head = \'Zed\' WHERE dept = \'Eng\'; SELECT e.emp, d.dept_head FROM employees e JOIN departments d USING (dept) WHERE e.dept = \'Eng\'', rows: [['Chen', 'Zed']] },
        { after: 'INSERT INTO departments VALUES (\'Sales\', \'Other\')', error: 'UNIQUE' },
        { after: 'INSERT INTO employees VALUES (\'Dev\', \'Ops\')', error: 'FOREIGN KEY' },
        { after: 'INSERT INTO employees VALUES (\'Asha\', \'Eng\')', error: 'UNIQUE' },
        { after: 'DELETE FROM departments WHERE dept = \'Sales\'', error: 'FOREIGN KEY' },
        { after: 'INSERT INTO departments (dept) VALUES (\'Ops\')', error: 'NOT NULL' },
        { after: 'INSERT INTO employees (emp) VALUES (\'Dev\')', error: 'NOT NULL' },
        { after: 'SELECT d.dept FROM departments d LEFT JOIN employees e USING (dept) WHERE e.emp IS NULL', rows: [['Legal']] },
        { after: 'INSERT INTO employees VALUES (\'Dev\', \'Legal\'); SELECT COUNT(*) FROM employees WHERE dept = \'Legal\'', rows: [[1]] }
      ] },
    solution: {
      approach: `<p>Key: A. 2NF ✔ (single-column key). B → C violates 3NF (B not a superkey, C non-prime) → highest NF is 2NF. Decompose: R1(B, C), R2(A, B). Each table's only determinant is its key → BCNF; both FDs live in one table each → dependency-preserving; B is R1's key → lossless.</p>`,
      code: `PRAGMA foreign_keys = ON;
CREATE TABLE departments (dept TEXT PRIMARY KEY, dept_head TEXT NOT NULL);      -- R1(B, C)
CREATE TABLE employees   (emp TEXT PRIMARY KEY, dept TEXT NOT NULL REFERENCES departments(dept));  -- R2(A, B)
INSERT INTO departments VALUES ('Sales', 'Meera'), ('Eng', 'Ravi'), ('Legal', 'Iqbal');
INSERT INTO employees   VALUES ('Asha', 'Sales'), ('Ben', 'Sales'), ('Chen', 'Eng');
UPDATE departments SET dept_head = 'Kiran' WHERE dept = 'Sales';               -- one row
SELECT e.emp, e.dept, d.dept_head FROM employees e JOIN departments d USING (dept) ORDER BY e.emp;`,
      complexity: `<p>Closure O(|F|·|R|); decomposition is a single split.</p>`,
      followUps: ['Add C → B (a head runs exactly one department). Does anything change?', 'What if A → C were also given explicitly?']
    }
  });

  practice.push({
    title: 'Two Candidate Keys in a Users Table',
    level: 'Easy', tags: ['candidate keys', 'UNIQUE', 'BCNF'], companies: ['Meta', 'Stripe', 'Razorpay'],
    statement: `<p><code>users(user_id, email, phone, name)</code>: user_id, email and phone are each unique per person. List the candidate keys and prime attributes, state the normal form, and write DDL that enforces <b>all</b> keys — not just the primary key.</p>`,
    constraints: `<p>SQLite. Email comparisons should be case-insensitive (Asha@X.com = asha@x.com).</p>`,
    example: `<p>Candidate keys: ${H.c('p', '{user_id}, {email}, {phone}')}. Prime: user_id, email, phone. Non-prime: name. Every determinant is a key → BCNF — <b>if</b> all three keys are declared.</p>`,
    brute: {
      why: `<p>Declaring only <code>user_id</code> as PRIMARY KEY leaves the other two candidate keys unenforced: duplicate emails slip in (two accounts, password-reset confusion), and the FD email → user_id is silently violated.</p>`,
      code: `CREATE TABLE users (user_id INTEGER PRIMARY KEY, email TEXT, phone TEXT, name TEXT);
INSERT INTO users VALUES (1, 'asha@x.com', '98450', 'Asha');
INSERT INTO users VALUES (2, 'Asha@X.com', '98450', 'Asha again');   -- accepted: duplicate person
SELECT LOWER(email) AS email, COUNT(*) AS accounts FROM users GROUP BY LOWER(email) HAVING COUNT(*) > 1;`
    },
    mcq: { q: 'Which statement is true about this table?', options: ['email and phone are prime attributes', 'Only user_id is a candidate key because it is the PK', 'name is prime because it is NOT NULL', 'A table can have only one candidate key'], answer: 0, explain: 'Each of email and phone is a minimal superkey on its own, so both are candidate keys and therefore prime.' },
    hints: [`<p>Hint 1: Each of user_id, email, phone determines the whole row on its own → three single-column candidate keys.</p>`, `<p>Hint 2: Pick one as PRIMARY KEY (short, stable, never changes: user_id) and declare the others UNIQUE NOT NULL.</p>`, `<p>Hint 3: For case-insensitive email uniqueness use COLLATE NOCASE on the column (or a unique index on LOWER(email)).</p>`],
    tests: { cmp: 'exact', engine: 'sqlite', cases: [
        { cols: ['user_id', 'email', 'phone'], rows: [[1, 'asha@x.com', '98450'], [2, 'ben@x.com', '99000']] },
        { after: 'INSERT INTO users VALUES (3, \'ASHA@X.COM\', \'91111\', \'Clone\')', error: 'UNIQUE' },
        { after: 'INSERT INTO users VALUES (3, \'new@x.com\', \'99000\', \'Clone\')', error: 'UNIQUE' },
        { after: 'INSERT INTO users VALUES (1, \'new@x.com\', \'91111\', \'Clone\')', error: 'UNIQUE' },
        { after: 'INSERT INTO users VALUES (3, NULL, \'91111\', \'NoMail\')', error: 'NOT NULL' },
        { after: 'INSERT INTO users VALUES (3, \'new@x.com\', NULL, \'NoPhone\')', error: 'NOT NULL' },
        { after: 'INSERT INTO users VALUES (3, \'new@x.com\', \'91111\', NULL)', error: 'NOT NULL' },
        { after: 'SELECT user_id FROM users WHERE email = \'BEN@X.COM\'', rows: [[2]] },
        { after: 'INSERT INTO users VALUES (3, \'cy@x.com\', \'91111\', \'Cy\'); SELECT COUNT(*) FROM users', rows: [[3]] },
        { after: 'SELECT COUNT(*) FROM users WHERE name = \'Asha again\' OR name = \'Phone clash\'', rows: [[0]] }
      ] },
    solution: {
      approach: `<p>Keys: {user_id}, {email}, {phone}; prime: those three; name is non-prime. All FDs have a key on the left → BCNF. Enforce every candidate key: PK on user_id, UNIQUE NOT NULL on email (COLLATE NOCASE) and phone. The demo shows the duplicate being rejected.</p>`,
      code: `CREATE TABLE users (
  user_id INTEGER PRIMARY KEY,                    -- chosen key: stable surrogate
  email   TEXT NOT NULL UNIQUE COLLATE NOCASE,    -- candidate key #2
  phone   TEXT NOT NULL UNIQUE,                   -- candidate key #3
  name    TEXT NOT NULL);
INSERT INTO users VALUES (1, 'asha@x.com', '98450', 'Asha'), (2, 'ben@x.com', '99000', 'Ben');
INSERT OR IGNORE INTO users VALUES (3, 'Asha@X.com', '91111', 'Asha again');   -- rejected (email)
INSERT OR IGNORE INTO users VALUES (4, 'new@x.com', '98450', 'Phone clash');    -- rejected (phone)
SELECT user_id, email, phone FROM users ORDER BY user_id;`,
      complexity: `<p>Each UNIQUE adds a B-tree index: inserts cost O(log N) per index; lookups by email/phone become O(log N).</p>`,
      followUps: ['Users may change email. Why is email still a poor primary key?', 'Phone is optional for some users — how do NULLs interact with UNIQUE?']
    }
  });

  /* =====================================================================
     PRACTICE — Medium
     ===================================================================== */
  practice.push({
    title: 'Invoice Lines from 1NF to 3NF',
    level: 'Medium', tags: ['2NF', '3NF', 'migration'], companies: ['SAP', 'Zoho', 'Intuit'],
    statement: `<p><code>invoice_lines(invoice_no, line_no, invoice_date, customer_id, customer_name, product_code, description, list_price, qty, price_charged)</code>, key (invoice_no, line_no). Rules: invoice_no → invoice_date, customer_id; customer_id → customer_name; product_code → description, list_price (current catalogue). price_charged is what this line actually cost. Decompose to 3NF in SQL and verify losslessly.</p>`,
    constraints: `<p>SQLite. price_charged must stay on the line (a snapshot). Include an EXCEPT-based lossless check.</p>`,
    example: `<p>Invoice 9001 with 2 lines repeats ${H.c('r', '(2026-04-01, C1, Asha)')} twice; product P1's description is repeated on every invoice that sells it.</p>`,
    brute: {
      why: `<p>One table: invoice header copied per line (partial dependency on invoice_no), customer name copied per invoice line (transitive through customer_id), product description copied per sale (partial on product_code-via-line). Every copy is an anomaly waiting to happen.</p>`,
      code: `CREATE TABLE invoice_lines (invoice_no INT, line_no INT, invoice_date TEXT, customer_id TEXT, customer_name TEXT,
  product_code TEXT, description TEXT, list_price INT, qty INT, price_charged INT, PRIMARY KEY (invoice_no, line_no));
INSERT INTO invoice_lines VALUES
  (9001, 1, '2026-04-01', 'C1', 'Asha', 'P1', 'USB cable', 300, 2, 280),
  (9001, 2, '2026-04-01', 'C1', 'Asha', 'P2', 'Charger', 900, 1, 900),
  (9002, 1, '2026-04-02', 'C2', 'Ben',  'P1', 'USB cable', 300, 5, 300);
SELECT COUNT(*) AS header_copies FROM invoice_lines WHERE invoice_no = 9001;   -- 2 copies of one header`
    },
    mcq: { q: 'Why does price_charged stay in invoice_lines while list_price moves to products?', options: ['price_charged depends on the specific line (a snapshot); list_price depends only on the product', 'price_charged is numeric', 'list_price is optional', 'Both should move to products'], answer: 0, explain: 'Different facts with different determinants — one per line, one per product.' },
    hints: [`<p>Hint 1: Group columns by determinant: invoice_no; customer_id; product_code; (invoice_no, line_no).</p>`, `<p>Hint 2: Tables: customers, products, invoices(invoice_no, invoice_date, customer_id), invoice_lines(invoice_no, line_no, product_code, qty, price_charged).</p>`, `<p>Hint 3: Migrate with SELECT DISTINCT per table; rebuild with joins and compare to the original using EXCEPT both ways.</p>`],
    tests: { cmp: 'exact', engine: 'sqlite', cases: [
        { cols: ['rows_lost', 'rows_invented'], rows: [[0, 0]] },
        { after: 'SELECT COUNT(*) FROM (SELECT * FROM old_lines EXCEPT SELECT l.invoice_no, l.line_no, i.invoice_date, i.customer_id, c.customer_name, l.product_code, p.description, p.list_price, l.qty, l.price_charged FROM invoice_lines l JOIN invoices i USING (invoice_no) JOIN customers c USING (customer_id) JOIN products p USING (product_code))', rows: [[0]] },
        { after: 'SELECT COUNT(*) FROM (SELECT l.invoice_no, l.line_no, i.invoice_date, i.customer_id, c.customer_name, l.product_code, p.description, p.list_price, l.qty, l.price_charged FROM invoice_lines l JOIN invoices i USING (invoice_no) JOIN customers c USING (customer_id) JOIN products p USING (product_code) EXCEPT SELECT * FROM old_lines)', rows: [[0]] },
        { after: 'SELECT (SELECT COUNT(*) FROM customers), (SELECT COUNT(*) FROM products), (SELECT COUNT(*) FROM invoices), (SELECT COUNT(*) FROM invoice_lines)', rows: [[2, 2, 2, 3]] },
        { after: 'UPDATE products SET list_price = 350 WHERE product_code = \'P1\'; SELECT invoice_no, line_no, price_charged FROM invoice_lines WHERE product_code = \'P1\' ORDER BY 1, 2', rows: [[9001, 1, 280], [9002, 1, 300]] },
        { after: 'UPDATE customers SET customer_name = \'Asha K\' WHERE customer_id = \'C1\'; SELECT COUNT(*) FROM invoices i JOIN customers c USING (customer_id) WHERE c.customer_name = \'Asha K\'', rows: [[1]] },
        { after: 'INSERT INTO invoice_lines VALUES (9001, 1, \'P2\', 1, 900)', error: 'UNIQUE' },
        { after: 'INSERT INTO invoice_lines VALUES (9001, 3, \'P9\', 1, 900)', error: 'FOREIGN KEY' },
        { after: 'INSERT INTO invoice_lines VALUES (9999, 1, \'P1\', 1, 300)', error: 'FOREIGN KEY' },
        { after: 'INSERT INTO invoices VALUES (9003, \'2026-04-03\', \'C9\')', error: 'FOREIGN KEY' },
        { after: 'INSERT INTO invoice_lines VALUES (9001, 3, \'P1\', 0, 300)', error: 'CHECK' },
        { after: 'INSERT INTO invoices VALUES (9001, \'2026-04-09\', \'C2\')', error: 'UNIQUE' }
      ] },
    solution: {
      approach: `<p>Partial dependency: invoice_no → date, customer_id (2NF fix: invoices table). Transitive: customer_id → name (3NF fix: customers) and product_code → description, list_price (products). The line keeps the full key, product_code (FK), qty and price_charged. Every split shares a column that is a key of the new table → lossless; every FD sits in one table → preserving.</p>`,
      code: `PRAGMA foreign_keys = ON;
CREATE TABLE old_lines (invoice_no INT, line_no INT, invoice_date TEXT, customer_id TEXT, customer_name TEXT,
  product_code TEXT, description TEXT, list_price INT, qty INT, price_charged INT, PRIMARY KEY (invoice_no, line_no));
INSERT INTO old_lines VALUES
  (9001, 1, '2026-04-01', 'C1', 'Asha', 'P1', 'USB cable', 300, 2, 280),
  (9001, 2, '2026-04-01', 'C1', 'Asha', 'P2', 'Charger', 900, 1, 900),
  (9002, 1, '2026-04-02', 'C2', 'Ben',  'P1', 'USB cable', 300, 5, 300);

CREATE TABLE customers (customer_id TEXT PRIMARY KEY, customer_name TEXT NOT NULL);
CREATE TABLE products  (product_code TEXT PRIMARY KEY, description TEXT NOT NULL, list_price INT NOT NULL);
CREATE TABLE invoices  (invoice_no INT PRIMARY KEY, invoice_date TEXT NOT NULL,
                        customer_id TEXT NOT NULL REFERENCES customers(customer_id));
CREATE TABLE invoice_lines (
  invoice_no INT NOT NULL REFERENCES invoices(invoice_no), line_no INT NOT NULL,
  product_code TEXT NOT NULL REFERENCES products(product_code),
  qty INT NOT NULL CHECK (qty > 0), price_charged INT NOT NULL,
  PRIMARY KEY (invoice_no, line_no));

INSERT INTO customers SELECT DISTINCT customer_id, customer_name FROM old_lines;
INSERT INTO products  SELECT DISTINCT product_code, description, list_price FROM old_lines;
INSERT INTO invoices  SELECT DISTINCT invoice_no, invoice_date, customer_id FROM old_lines;
INSERT INTO invoice_lines SELECT invoice_no, line_no, product_code, qty, price_charged FROM old_lines;

WITH rebuilt AS (
  SELECT l.invoice_no, l.line_no, i.invoice_date, i.customer_id, c.customer_name,
         l.product_code, p.description, p.list_price, l.qty, l.price_charged
  FROM invoice_lines l JOIN invoices i USING (invoice_no)
  JOIN customers c USING (customer_id) JOIN products p USING (product_code))
SELECT (SELECT COUNT(*) FROM (SELECT * FROM old_lines EXCEPT SELECT * FROM rebuilt)) AS rows_lost,
       (SELECT COUNT(*) FROM (SELECT * FROM rebuilt EXCEPT SELECT * FROM old_lines)) AS rows_invented;`,
      complexity: `<p>Migration O(N log N) for DISTINCT; rebuild = 3 indexed joins.</p>`,
      followUps: ['Customer name on an invoice must be legally frozen — what changes?', 'Should line_no or product_code be part of the line key? Discuss.']
    }
  });

  practice.push({
    title: 'Employee Project Hours to 3NF',
    level: 'Medium', tags: ['2NF', '3NF', 'partial + transitive'], companies: ['Deloitte', 'Capgemini', 'Microsoft'],
    statement: `<p><code>emp_projects(emp_id, project_id, hours, emp_name, dept_id, dept_name, project_name, budget)</code>, key (emp_id, project_id). Rules: emp_id → emp_name, dept_id; dept_id → dept_name; project_id → project_name, budget. Classify each FD (full / partial / transitive) and decompose to 3NF with SQL.</p>`,
    constraints: `<p>SQLite. Four tables expected. Show the hours report per department after the split.</p>`,
    example: `<p>(E1, P1, 10, Asha, D1, Sales, Apollo, 50000), (E1, P2, 5, Asha, D1, Sales, Zeus, 20000): ${H.c('r', 'Asha, D1, Sales')} repeated (partial + transitive); Apollo's budget repeated for every employee on it.</p>`,
    brute: {
      why: `<p>Partial dependencies copy employee and project facts per assignment; the transitive dept_id → dept_name copies department names per assignment. A budget change on a 40-person project = 40 updates.</p>`,
      code: `CREATE TABLE emp_projects (emp_id TEXT, project_id TEXT, hours INT, emp_name TEXT, dept_id TEXT, dept_name TEXT,
  project_name TEXT, budget INT, PRIMARY KEY (emp_id, project_id));
INSERT INTO emp_projects VALUES
  ('E1', 'P1', 10, 'Asha', 'D1', 'Sales', 'Apollo', 50000), ('E1', 'P2', 5, 'Asha', 'D1', 'Sales', 'Zeus', 20000),
  ('E2', 'P1', 8, 'Ben', 'D2', 'Eng', 'Apollo', 50000);
UPDATE emp_projects SET budget = 60000 WHERE emp_id = 'E1' AND project_id = 'P1';
SELECT project_id, GROUP_CONCAT(DISTINCT budget) AS budgets FROM emp_projects GROUP BY project_id;`
    },
    mcq: { q: 'dept_id → dept_name in this table is…', options: ['transitive (via emp_id → dept_id)', 'partial', 'full', 'trivial'], answer: 0, explain: 'dept_name depends on dept_id, which depends on emp_id (part of the key): a transitive chain.' },
    hints: [`<p>Hint 1: hours needs both keys (full). emp_* needs only emp_id, project_* only project_id (partial).</p>`, `<p>Hint 2: After the 2NF split, employees(emp_id, emp_name, dept_id, dept_name) still has dept_id → dept_name (transitive).</p>`, `<p>Hint 3: Final: departments, employees, projects, assignments(emp_id, project_id, hours).</p>`],
    tests: { cmp: 'exact', engine: 'sqlite', cases: [
        { cols: ['dept_name', 'total_hours'], rows: [['Sales', 15], ['Eng', 8]] },
        { after: 'SELECT name FROM sqlite_master WHERE type = \'table\' ORDER BY name', rows: [['assignments'], ['departments'], ['employees'], ['projects']] },
        { after: 'SELECT p.budget FROM assignments a JOIN projects p USING (project_id) WHERE a.emp_id = \'E2\'', rows: [[60000]] },
        { after: 'SELECT emp_id, project_id, hours FROM assignments ORDER BY 1, 2', rows: [['E1', 'P1', 10], ['E1', 'P2', 5], ['E2', 'P1', 8]] },
        { after: 'INSERT INTO projects VALUES (\'P3\', \'Hera\', 0); SELECT COUNT(*) FROM projects', rows: [[3]] },
        { after: 'UPDATE departments SET dept_name = \'Revenue\' WHERE dept_id = \'D1\'; SELECT d.dept_name, SUM(a.hours) FROM assignments a JOIN employees e USING (emp_id) JOIN departments d USING (dept_id) GROUP BY d.dept_name ORDER BY 2 DESC', rows: [['Revenue', 15], ['Eng', 8]] },
        { after: 'INSERT INTO projects VALUES (\'P4\', \'Neg\', -1)', error: 'CHECK' },
        { after: 'INSERT INTO assignments VALUES (\'E2\', \'P2\', -1)', error: 'CHECK' },
        { after: 'INSERT INTO assignments VALUES (\'E1\', \'P1\', 1)', error: 'UNIQUE' },
        { after: 'INSERT INTO assignments VALUES (\'E9\', \'P1\', 1)', error: 'FOREIGN KEY' },
        { after: 'INSERT INTO assignments VALUES (\'E1\', \'P9\', 1)', error: 'FOREIGN KEY' },
        { after: 'INSERT INTO employees VALUES (\'E3\', \'Cy\', \'D9\')', error: 'FOREIGN KEY' },
        { after: 'DELETE FROM departments WHERE dept_id = \'D1\'', error: 'FOREIGN KEY' }
      ] },
    solution: {
      approach: `<p>Full: (emp_id, project_id) → hours. Partial: emp_id → emp_name, dept_id; project_id → project_name, budget. Transitive: dept_id → dept_name. 2NF split gives employees, projects, assignments; 3NF split pulls departments out of employees. All four tables are BCNF; all FDs preserved; all splits along keys → lossless.</p>`,
      code: `PRAGMA foreign_keys = ON;
CREATE TABLE departments (dept_id TEXT PRIMARY KEY, dept_name TEXT NOT NULL);
CREATE TABLE employees   (emp_id TEXT PRIMARY KEY, emp_name TEXT NOT NULL, dept_id TEXT NOT NULL REFERENCES departments(dept_id));
CREATE TABLE projects    (project_id TEXT PRIMARY KEY, project_name TEXT NOT NULL, budget INT NOT NULL CHECK (budget >= 0));
CREATE TABLE assignments (
  emp_id TEXT NOT NULL REFERENCES employees(emp_id),
  project_id TEXT NOT NULL REFERENCES projects(project_id),
  hours INT NOT NULL CHECK (hours >= 0),
  PRIMARY KEY (emp_id, project_id));
INSERT INTO departments VALUES ('D1', 'Sales'), ('D2', 'Eng');
INSERT INTO employees   VALUES ('E1', 'Asha', 'D1'), ('E2', 'Ben', 'D2');
INSERT INTO projects    VALUES ('P1', 'Apollo', 50000), ('P2', 'Zeus', 20000);
INSERT INTO assignments VALUES ('E1', 'P1', 10), ('E1', 'P2', 5), ('E2', 'P1', 8);
UPDATE projects SET budget = 60000 WHERE project_id = 'P1';           -- one row
SELECT d.dept_name, SUM(a.hours) AS total_hours
FROM assignments a JOIN employees e USING (emp_id) JOIN departments d USING (dept_id)
GROUP BY d.dept_name ORDER BY total_hours DESC;`,
      complexity: `<p>Updates O(1) rows; report = 2 indexed joins + aggregation.</p>`,
      followUps: ['An employee can move departments; hours must be reported by the department at the time. Model it.', 'Add a project manager (one per project).']
    }
  });

  practice.push({
    title: 'Clinic Visit Sheet: 0NF All the Way to 3NF',
    level: 'Medium', tags: ['0NF', '1NF', '3NF', 'unpivot'], companies: ['Practo', 'Epic', 'Cerner'],
    statement: `<p>A clinic spreadsheet has one row per patient: <code>patient_id, patient_name, phone, visit1_date, visit1_doctor, visit2_date, visit2_doctor</code>, plus a doctor sheet merged in as <code>visit1_specialty, visit2_specialty</code>. Rules: a doctor has one specialty; a patient has one name and phone; a patient sees at most one doctor per date. Normalize to 3NF in SQL.</p>`,
    constraints: `<p>SQLite. Empty visit slots are NULL. Doctors are identified by name for this exercise.</p>`,
    example: `<p>(P1, Asha, 98450, 2026-01-03, Dr. Mehta, Cardio, 2026-02-10, Dr. Rao, Ortho) → visits ${H.c('g', '(P1, 2026-01-03, Dr. Mehta)')} and (P1, 2026-02-10, Dr. Rao); doctors (Dr. Mehta, Cardio), (Dr. Rao, Ortho).</p>`,
    brute: {
      why: `<p>Repeating groups cap visits at two and copy each doctor's specialty into every patient row that mentions them. A third visit needs new columns; a specialty correction must be applied in two column families across all rows.</p>`,
      code: `CREATE TABLE sheet (patient_id TEXT PRIMARY KEY, patient_name TEXT, phone TEXT,
  visit1_date TEXT, visit1_doctor TEXT, visit1_specialty TEXT, visit2_date TEXT, visit2_doctor TEXT, visit2_specialty TEXT);
INSERT INTO sheet VALUES
  ('P1', 'Asha', '98450', '2026-01-03', 'Dr. Mehta', 'Cardio', '2026-02-10', 'Dr. Rao', 'Ortho'),
  ('P2', 'Ben',  '99000', '2026-01-05', 'Dr. Rao',   'Ortho',  NULL, NULL, NULL);
-- "Which patients saw Dr. Rao?" needs to search both column families:
SELECT patient_id FROM sheet WHERE visit1_doctor = 'Dr. Rao' OR visit2_doctor = 'Dr. Rao';`
    },
    mcq: { q: 'After unpivoting visits into rows, which dependency still blocks 3NF if specialty stays in the visits table?', options: ['doctor → specialty', 'patient_id → patient_name', '(patient_id, visit_date) → doctor', 'visit_date → patient_id'], answer: 0, explain: 'doctor is not a key of visits, and specialty is non-prime — a transitive dependency.' },
    hints: [`<p>Hint 1: 0NF → 1NF: unpivot the visit slots into rows with UNION ALL, skipping NULL slots.</p>`, `<p>Hint 2: The 1NF visit table has key (patient_id, visit_date); patient columns depend on patient_id only (2NF issue); specialty depends on doctor (3NF issue).</p>`, `<p>Hint 3: Final tables: patients, doctors(doctor PK, specialty), visits(patient_id, visit_date, doctor) with PK (patient_id, visit_date).</p>`],
    tests: { cmp: 'exact', engine: 'sqlite', cases: [
        { cols: ['patient_name', 'visit_date', 'doctor', 'specialty'], rows: [['Asha', '2026-01-03', 'Dr. Mehta', 'Cardio'], ['Asha', '2026-02-10', 'Dr. Rao', 'Ortho'], ['Ben', '2026-01-05', 'Dr. Rao', 'Ortho'], ['Ben', '2026-03-01', 'Dr. Mehta', 'Cardio']] },
        { after: 'SELECT doctor, specialty FROM doctors ORDER BY doctor', rows: [['Dr. Mehta', 'Cardio'], ['Dr. Rao', 'Ortho']] },
        { after: 'SELECT COUNT(*) FROM visits', rows: [[4]] },
        { after: 'SELECT COUNT(*) FROM visits WHERE visit_date IS NULL OR doctor IS NULL', rows: [[0]] },
        { after: 'SELECT patient_id, patient_name, phone FROM patients ORDER BY patient_id', rows: [['P1', 'Asha', '98450'], ['P2', 'Ben', '99000']] },
        { after: 'UPDATE doctors SET specialty = \'Sports\' WHERE doctor = \'Dr. Rao\'; SELECT COUNT(*) FROM visits v JOIN doctors d USING (doctor) WHERE d.specialty = \'Sports\'', rows: [[2]] },
        { after: 'INSERT INTO visits VALUES (\'P1\', \'2026-04-01\', \'Dr. Rao\'), (\'P1\', \'2026-05-01\', \'Dr. Rao\'); SELECT COUNT(*) FROM visits WHERE patient_id = \'P1\'', rows: [[4]] },
        { after: 'INSERT INTO visits VALUES (\'P1\', \'2026-01-03\', \'Dr. Rao\')', error: 'UNIQUE' },
        { after: 'INSERT INTO visits VALUES (\'P1\', \'2026-06-01\', \'Dr. Ghost\')', error: 'FOREIGN KEY' },
        { after: 'INSERT INTO visits VALUES (\'P9\', \'2026-06-01\', \'Dr. Rao\')', error: 'FOREIGN KEY' },
        { after: 'INSERT INTO doctors VALUES (\'Dr. Rao\', \'Other\')', error: 'UNIQUE' },
        { after: 'DELETE FROM doctors WHERE doctor = \'Dr. Rao\'', error: 'FOREIGN KEY' }
      ] },
    solution: {
      approach: `<p>Step 1 (1NF): unpivot two visit slots into rows. Step 2 (2NF): patient_name, phone depend only on patient_id → patients table. Step 3 (3NF): specialty depends on doctor → doctors table. visits keeps (patient_id, visit_date) as key and doctor as FK. Use SELECT DISTINCT for doctors from both column families.</p>`,
      code: `PRAGMA foreign_keys = ON;
CREATE TABLE sheet (patient_id TEXT PRIMARY KEY, patient_name TEXT, phone TEXT,
  visit1_date TEXT, visit1_doctor TEXT, visit1_specialty TEXT, visit2_date TEXT, visit2_doctor TEXT, visit2_specialty TEXT);
INSERT INTO sheet VALUES
  ('P1', 'Asha', '98450', '2026-01-03', 'Dr. Mehta', 'Cardio', '2026-02-10', 'Dr. Rao', 'Ortho'),
  ('P2', 'Ben',  '99000', '2026-01-05', 'Dr. Rao',   'Ortho',  NULL, NULL, NULL);

CREATE TABLE patients (patient_id TEXT PRIMARY KEY, patient_name TEXT NOT NULL, phone TEXT NOT NULL);
CREATE TABLE doctors  (doctor TEXT PRIMARY KEY, specialty TEXT NOT NULL);
CREATE TABLE visits (
  patient_id TEXT NOT NULL REFERENCES patients(patient_id),
  visit_date TEXT NOT NULL,
  doctor     TEXT NOT NULL REFERENCES doctors(doctor),
  PRIMARY KEY (patient_id, visit_date));

INSERT INTO patients SELECT patient_id, patient_name, phone FROM sheet;
INSERT INTO doctors
SELECT visit1_doctor, visit1_specialty FROM sheet WHERE visit1_doctor IS NOT NULL
UNION                                         -- UNION (not ALL) removes duplicate doctors
SELECT visit2_doctor, visit2_specialty FROM sheet WHERE visit2_doctor IS NOT NULL;
INSERT INTO visits
SELECT patient_id, visit1_date, visit1_doctor FROM sheet WHERE visit1_date IS NOT NULL
UNION ALL
SELECT patient_id, visit2_date, visit2_doctor FROM sheet WHERE visit2_date IS NOT NULL;

INSERT INTO visits VALUES ('P2', '2026-03-01', 'Dr. Mehta');   -- a 3rd visit is just a row
SELECT p.patient_name, v.visit_date, v.doctor, d.specialty
FROM visits v JOIN patients p USING (patient_id) JOIN doctors d USING (doctor)
ORDER BY p.patient_name, v.visit_date;`,
      complexity: `<p>Migration O(N × slots). Queries by doctor or date are simple indexed lookups.</p>`,
      followUps: ['A doctor can have two specialties — what changes?', 'Two visits on the same day with different doctors are now allowed. Change the key.']
    }
  });

  practice.push({
    title: 'Closure, Keys and Normal Form of R(A, B, C, D, E)',
    level: 'Medium', tags: ['closure', 'candidate keys', '3NF vs BCNF'], companies: ['Oracle', 'Amazon', 'IBM'],
    statement: `<p>R(A, B, C, D, E), F = {A → B, BC → E, ED → A}. (1) Find all candidate keys. (2) Is R in 3NF? BCNF? (3) Give a BCNF decomposition and list which FDs are lost. Provide a runnable SQL check that lists the candidate keys.</p>`,
    constraints: `<p>Bits: A=1, B=2, C=4, D=8, E=16 (31 = all).</p>`,
    example: `<p>C and D never appear on a right side → every key contains CD. CD⁺ = CD. ACD⁺ = ${H.c('g', 'ABCDE')} → key.</p>`,
    brute: {
      why: `<p>Brute force computes the closure of all 31 subsets and keeps superkeys — it finds the answer but also lists every superset (ABCD, ACDE, …) which are not minimal. Minimality must be checked separately.</p>`,
      code: `CREATE TABLE fd (lhs INT NOT NULL, rhs INT NOT NULL);
INSERT INTO fd VALUES (1, 2), (2 | 4, 16), (16 | 8, 1);     -- A->B, BC->E, ED->A
WITH RECURSIVE s(m) AS (SELECT 1 UNION ALL SELECT m + 1 FROM s WHERE m < 31),
clo(start, mask, step) AS (
  SELECT m, m, 0 FROM s
  UNION ALL
  SELECT start, mask | COALESCE((SELECT SUM(DISTINCT rhs) FROM fd WHERE (lhs & clo.mask) = lhs AND (rhs & clo.mask) = 0), 0), step + 1
  FROM clo WHERE step < 5)
SELECT COUNT(*) AS superkeys_found FROM (SELECT start FROM clo GROUP BY start HAVING MAX(mask) = 31);`
    },
    mcq: { q: 'Why is R in 3NF?', options: ['Every attribute is prime, so every FD has a prime right side', 'All left sides are superkeys', 'There are no composite keys', 'R has only three FDs'], answer: 0, explain: 'Keys ACD, BCD, CDE cover all five attributes, so all are prime and the 3NF escape clause always applies.' },
    hints: [`<p>Hint 1: Must-set = {C, D}. Try adding one of A, B, E and compute each closure.</p>`, `<p>Hint 2: Keys: ACD, BCD, CDE → all attributes prime → 3NF. BCNF fails for A → B (A is not a superkey).</p>`, `<p>Hint 3: BCNF: split on A → B → (A, B) + (A, C, D, E); then AC → E holds inside ACDE → (A, C, E) + (A, C, D). Check which original FDs fit in one table.</p>`],
    tests: { cmp: 'exact', engine: 'sqlite', cases: [
        { cols: ['candidate_key'], rows: [['ACD'], ['BCD'], ['CDE']] },
        { after: 'SELECT lhs, rhs FROM fd ORDER BY lhs, rhs', rows: [[1, 2], [6, 16], [24, 1]] },
        { after: 'SELECT name, bit FROM attr ORDER BY bit', rows: [['A', 1], ['B', 2], ['C', 4], ['D', 8], ['E', 16]] },
        { after: 'SELECT COUNT(*) FROM fd', rows: [[3]] },
        { after: 'SELECT MAX(bit) * 2 - 1 FROM attr', rows: [[31]] },
        { after: 'SELECT SUM(bit) FROM attr', rows: [[31]] },
        { after: 'SELECT name FROM attr WHERE bit & (SELECT SUM(rhs) FROM fd) = 0 ORDER BY bit', rows: [['C'], ['D']] }
      ] },
    solution: {
      approach: `<p><b>Keys:</b> ACD, BCD, CDE. <b>3NF:</b> yes (all prime). <b>BCNF:</b> no — A → B, BC → E, ED → A all have non-superkey left sides. <b>Decomposition:</b> R1(A, B) on A → B; remaining (A, C, D, E) has implied AC → E (A → B, BC → E) → R2(A, C, E), R3(A, C, D). All BCNF and lossless. <b>Lost:</b> BC → E and ED → A — that is the textbook reason to stay in 3NF here. The SQL lists the candidate keys.</p>`,
      code: `CREATE TABLE attr (name TEXT PRIMARY KEY, bit INT NOT NULL UNIQUE);
INSERT INTO attr VALUES ('A', 1), ('B', 2), ('C', 4), ('D', 8), ('E', 16);
CREATE TABLE fd (lhs INT NOT NULL, rhs INT NOT NULL);
INSERT INTO fd VALUES (1, 2), (2 | 4, 16), (16 | 8, 1);
WITH RECURSIVE s(m) AS (SELECT 1 UNION ALL SELECT m + 1 FROM s WHERE m < 31),
clo(start, mask, step) AS (
  SELECT m, m, 0 FROM s
  UNION ALL
  SELECT start, mask | COALESCE((SELECT SUM(DISTINCT rhs) FROM fd WHERE (lhs & clo.mask) = lhs AND (rhs & clo.mask) = 0), 0), step + 1
  FROM clo WHERE step < 5),
sk AS (SELECT start FROM clo GROUP BY start HAVING MAX(mask) = 31)
SELECT (SELECT GROUP_CONCAT(name, '') FROM (SELECT name FROM attr WHERE bit & k.start ORDER BY bit)) AS candidate_key
FROM sk k
WHERE NOT EXISTS (SELECT 1 FROM sk t WHERE t.start <> k.start AND (t.start & k.start) = t.start)
ORDER BY k.start;     -- ACD, BCD, CDE`,
      complexity: `<p>2<sup>5</sup> closures, each ≤ 5 rounds × 3 FDs — trivial. By hand: 1 + 3 closures thanks to the must-set shortcut.</p>`,
      followUps: ['Give a 3NF synthesis for the same R and F.', 'Add C → D. Recompute the keys.']
    }
  });

  practice.push({
    title: 'Is the Supplier Split Lossless?',
    level: 'Medium', tags: ['lossless join', 'spurious tuples'], companies: ['Walmart', 'Target', 'Oracle'],
    statement: `<p>R(supplier, city, part) with supplier → city (each supplier is in one city). A junior engineer splits it into S1(supplier, city) and S2(city, part). Is it lossless? If not, propose a lossless, dependency-preserving split and prove both claims on data with SQL.</p>`,
    constraints: `<p>SQLite. Use at least two suppliers in the same city so the problem is visible.</p>`,
    example: `<p>(Acme, Pune, bolt), (Zenith, Pune, nut). S2 = (Pune, bolt), (Pune, nut). Rejoin → ${H.c('r', '(Acme, Pune, nut)')} and ${H.c('r', '(Zenith, Pune, bolt)')} — spurious.</p>`,
    brute: {
      why: `<p>The junior split joins on city, which is a key of neither S1 nor S2: every supplier in Pune gets paired with every part supplied by anyone in Pune. The lost information is "who supplies what".</p>`,
      code: `CREATE TABLE r (supplier TEXT, city TEXT, part TEXT, PRIMARY KEY (supplier, part));
INSERT INTO r VALUES ('Acme', 'Pune', 'bolt'), ('Zenith', 'Pune', 'nut'), ('Orbit', 'Delhi', 'gear');
CREATE TABLE s1 AS SELECT DISTINCT supplier, city FROM r;
CREATE TABLE s2 AS SELECT DISTINCT city, part FROM r;
SELECT supplier, city, part FROM s1 NATURAL JOIN s2 ORDER BY supplier, part;   -- 5 rows instead of 3`
    },
    mcq: { q: 'Which split of R(supplier, city, part) is lossless?', options: ['(supplier, city) + (supplier, part)', '(supplier, city) + (city, part)', '(city, part) + (supplier, part) is always lossy', '(supplier) + (city, part)'], answer: 0, explain: 'Common column supplier is a key of (supplier, city).' },
    hints: [`<p>Hint 1: Binary test: compute the closure of the common columns. {city}⁺ = {city}.</p>`, `<p>Hint 2: Choose a split whose common column is supplier: supplier⁺ = {supplier, city} covers (supplier, city).</p>`, `<p>Hint 3: Verify both splits with NATURAL JOIN row counts and EXCEPT against the original.</p>`],
    tests: { cmp: 'exact', engine: 'sqlite', cases: [
        { cols: ['split', 'rows_after', 'spurious'], rows: [['junior: join on city', 5, 1], ['fixed: join on supplier', 4, 0]] },
        { after: 'SELECT supplier, city, part FROM bad1 NATURAL JOIN bad2 EXCEPT SELECT supplier, city, part FROM r', rows: [['Zenith', 'Pune', 'bolt']] },
        { after: 'SELECT COUNT(*) FROM (SELECT supplier, city, part FROM good1 NATURAL JOIN good2 EXCEPT SELECT supplier, city, part FROM r)', rows: [[0]] },
        { after: 'SELECT COUNT(*) FROM (SELECT supplier, city, part FROM r EXCEPT SELECT supplier, city, part FROM good1 NATURAL JOIN good2)', rows: [[0]] },
        { after: 'SELECT (SELECT COUNT(*) FROM bad1), (SELECT COUNT(*) FROM bad2), (SELECT COUNT(*) FROM good1), (SELECT COUNT(*) FROM good2)', rows: [[3, 3, 3, 4]] },
        { after: 'SELECT supplier FROM good1 GROUP BY supplier HAVING COUNT(DISTINCT city) > 1', rows: [] },
        { after: 'SELECT city, COUNT(DISTINCT supplier) FROM r GROUP BY city HAVING COUNT(DISTINCT supplier) >= 2', rows: [['Pune', 2]] }
      ] },
    solution: {
      approach: `<p>Junior split: common {city}, city⁺ = {city} → neither side → lossy. Correct split: (supplier, city) + (supplier, part). Common {supplier}, supplier⁺ ⊇ (supplier, city) → lossless; supplier → city sits inside the first table → preserving. It is also BCNF (keys: supplier; (supplier, part)).</p>`,
      code: `CREATE TABLE r (supplier TEXT NOT NULL, city TEXT NOT NULL, part TEXT NOT NULL, PRIMARY KEY (supplier, part));
INSERT INTO r VALUES ('Acme', 'Pune', 'bolt'), ('Zenith', 'Pune', 'nut'), ('Orbit', 'Delhi', 'gear'), ('Acme', 'Pune', 'nut');
CREATE TABLE bad1  AS SELECT DISTINCT supplier, city FROM r;
CREATE TABLE bad2  AS SELECT DISTINCT city, part FROM r;
CREATE TABLE good1 AS SELECT DISTINCT supplier, city FROM r;
CREATE TABLE good2 AS SELECT DISTINCT supplier, part FROM r;
SELECT 'junior: join on city' AS split, (SELECT COUNT(*) FROM bad1 NATURAL JOIN bad2) AS rows_after,
       (SELECT COUNT(*) FROM (SELECT supplier, city, part FROM bad1 NATURAL JOIN bad2 EXCEPT SELECT supplier, city, part FROM r)) AS spurious
UNION ALL
SELECT 'fixed: join on supplier', (SELECT COUNT(*) FROM good1 NATURAL JOIN good2),
       (SELECT COUNT(*) FROM (SELECT supplier, city, part FROM good1 NATURAL JOIN good2 EXCEPT SELECT supplier, city, part FROM r));`,
      complexity: `<p>One closure on paper; the SQL check is a join + EXCEPT, O(N log N).</p>`,
      followUps: ['Add part → weight. Where does it go?', 'Prove lossiness of the junior split with a 2-row instance.']
    }
  });

  practice.push({
    title: 'Should We Store the Order Total?',
    level: 'Medium', tags: ['denormalization', 'snapshot', 'decision'], companies: ['Shopify', 'Amazon', 'Uber'],
    statement: `<p>The "My Orders" page lists 50 orders with their totals and runs <code>SUM(qty * unit_price)</code> over order_items for each. Product wants it faster. Options: (A) compute on every read; (B) store <code>orders.total_cents</code>, set once at checkout and frozen after payment; (C) store it and keep it updated by triggers forever. Decide, justify, and implement your choice with a verification query.</p>`,
    constraints: `<p>SQLite. Line items cannot change after an order is paid. Totals must equal the lines exactly.</p>`,
    example: `<p>Order 1: 2 × 1200 + 3 × 300 = ${H.c('g', '3300')}. After payment, a catalogue price change must <b>not</b> change 3300.</p>`,
    brute: {
      why: `<p>Option A is the normalized baseline: correct but re-aggregates the same immutable lines on every page view. Fine at small scale; wasteful when the history page is the most visited page and lines never change after payment.</p>`,
      code: `CREATE TABLE orders (id INTEGER PRIMARY KEY, status TEXT NOT NULL);
CREATE TABLE order_items (order_id INT NOT NULL, sku TEXT NOT NULL, qty INT NOT NULL, unit_price INT NOT NULL, PRIMARY KEY (order_id, sku));
INSERT INTO orders VALUES (1, 'paid'), (2, 'paid');
INSERT INTO order_items VALUES (1, 'LAMP', 2, 1200), (1, 'MUG', 3, 300), (2, 'PEN', 10, 50);
SELECT o.id, SUM(i.qty * i.unit_price) AS total
FROM orders o JOIN order_items i ON i.order_id = o.id GROUP BY o.id;      -- recomputed every view`
    },
    mcq: { q: 'Why is option B (freeze at checkout) a safe denormalization here?', options: ['The source lines are immutable after payment, so the copy can never go stale', 'Totals are small numbers', 'Triggers are always slow', 'SQLite cannot SUM'], answer: 0, explain: 'A copy of immutable data needs no ongoing sync — only a one-time computation and a verification.' },
    hints: [`<p>Hint 1: Ask "can the source change after the copy is made?" If no, a copy is just a precomputed snapshot.</p>`, `<p>Hint 2: Compute the total in the same transaction that marks the order paid: UPDATE orders SET total = (SELECT SUM …).</p>`, `<p>Hint 3: Guard with a trigger that blocks edits to items of paid orders, and keep a reconcile query.</p>`],
    tests: { cmp: 'exact', engine: 'sqlite', cases: [
        { cols: ['id', 'total_cents'], rows: [[1, 3300], [2, 500]] },
        { after: 'SELECT unit_price FROM order_items WHERE order_id = 1 AND sku = \'LAMP\'', rows: [[1200]] },
        { after: 'SELECT o.id FROM orders o WHERE o.total_cents <> (SELECT SUM(qty * unit_price) FROM order_items WHERE order_id = o.id)', rows: [] },
        { after: 'INSERT INTO order_items VALUES (1, \'NEW\', 1, 100); SELECT o.id FROM orders o WHERE o.total_cents <> (SELECT SUM(qty * unit_price) FROM order_items WHERE order_id = o.id)', rows: [] },
        { after: 'DELETE FROM order_items WHERE order_id = 2; SELECT o.id FROM orders o WHERE o.total_cents <> (SELECT COALESCE(SUM(qty * unit_price), 0) FROM order_items WHERE order_id = o.id)', rows: [] },
        { after: 'UPDATE order_items SET qty = 99 WHERE order_id = 2; SELECT qty FROM order_items WHERE order_id = 2', rows: [[10]] },
        { after: 'INSERT INTO orders (id, status) VALUES (3, \'cart\'); INSERT INTO order_items VALUES (3, \'X\', 2, 100); UPDATE order_items SET unit_price = 150 WHERE order_id = 3; SELECT unit_price, (SELECT total_cents IS NULL FROM orders WHERE id = 3) FROM order_items WHERE order_id = 3', rows: [[150, 1]] },
        { after: 'INSERT INTO orders (id, status) VALUES (4, \'shipped\')', error: 'CHECK' },
        { after: 'INSERT INTO orders (id, status) VALUES (3, \'cart\'); INSERT INTO order_items VALUES (3, \'Z\', 0, 10)', error: 'CHECK' },
        { after: 'INSERT INTO orders (id, status) VALUES (3, \'cart\'); INSERT INTO order_items VALUES (3, \'Z\', 1, 10); INSERT INTO order_items VALUES (3, \'Z\', 2, 10)', error: 'UNIQUE' },
        { after: 'SELECT SUM(qty * unit_price) FROM order_items', rows: [[3800]] }
      ] },
    solution: {
      approach: `<p>Choose <b>B</b>. Lines are immutable after payment, so the stored total is a <b>snapshot</b> that never needs syncing. Set it in the checkout transaction; protect immutability with a trigger that rejects item changes on paid orders (RAISE(IGNORE) in this demo, ABORT in production); keep a reconcile query. C would add write cost and complexity for data that never changes; A wastes reads.</p>`,
      code: `CREATE TABLE orders (id INTEGER PRIMARY KEY, status TEXT NOT NULL CHECK (status IN ('cart', 'paid')),
                     total_cents INTEGER);                       -- NULL while in cart
CREATE TABLE order_items (order_id INT NOT NULL REFERENCES orders(id), sku TEXT NOT NULL,
                          qty INT NOT NULL CHECK (qty > 0), unit_price INT NOT NULL, PRIMARY KEY (order_id, sku));
-- Freeze lines of paid orders: no UPDATE, INSERT or DELETE (production: RAISE(ABORT, 'order is paid'))
CREATE TRIGGER items_frozen BEFORE UPDATE ON order_items
WHEN (SELECT status FROM orders WHERE id = OLD.order_id) = 'paid'
BEGIN SELECT RAISE(IGNORE); END;
CREATE TRIGGER items_frozen_ins BEFORE INSERT ON order_items
WHEN (SELECT status FROM orders WHERE id = NEW.order_id) = 'paid'
BEGIN SELECT RAISE(IGNORE); END;
CREATE TRIGGER items_frozen_del BEFORE DELETE ON order_items
WHEN (SELECT status FROM orders WHERE id = OLD.order_id) = 'paid'
BEGIN SELECT RAISE(IGNORE); END;

INSERT INTO orders (id, status) VALUES (1, 'cart'), (2, 'cart');
INSERT INTO order_items VALUES (1, 'LAMP', 2, 1200), (1, 'MUG', 3, 300), (2, 'PEN', 10, 50);

-- Checkout: compute and freeze in one transaction
BEGIN;
UPDATE orders SET status = 'paid',
       total_cents = (SELECT SUM(qty * unit_price) FROM order_items WHERE order_id = orders.id)
WHERE id IN (1, 2);
COMMIT;

UPDATE order_items SET unit_price = 1350 WHERE order_id = 1 AND sku = 'LAMP';   -- ignored: order is paid

SELECT id, total_cents FROM orders ORDER BY id;                                  -- My Orders: no aggregation
SELECT o.id FROM orders o                                                        -- reconcile: expect no rows
WHERE o.status = 'paid' AND o.total_cents <> (SELECT SUM(qty * unit_price) FROM order_items WHERE order_id = o.id);`,
      complexity: `<p>Read: O(orders shown), no aggregation. Write: one extra UPDATE at checkout. No ongoing sync cost.</p>`,
      followUps: ['Refunds and partial returns happen after payment — how do you model them without unfreezing lines?', 'When would option C be the right call?']
    }
  });

  /* =====================================================================
     PRACTICE — Hard
     ===================================================================== */
  practice.push({
    title: 'Street, City, ZIP: Choose 3NF or BCNF',
    level: 'Hard', tags: ['BCNF', '3NF', 'dependency preservation', 'trigger'], companies: ['Google', 'Uber', 'Oracle'],
    statement: `<p>R(street, city, zip) with F = {(street, city) → zip, zip → city}. Find the keys, show R is 3NF but not BCNF, give the BCNF decomposition, name the lost dependency, and implement the BCNF design in SQL with the lost rule enforced. Then argue which design you would ship.</p>`,
    constraints: `<p>SQLite. The lost-rule check must run inside the database (trigger). Show that a violating insert is blocked.</p>`,
    example: `<p>Keys: ${H.c('p', '{street, city}')} and ${H.c('p', '{street, zip}')}. zip → city: zip is not a superkey, city is prime → 3NF ✔, BCNF ✘.</p>`,
    brute: {
      why: `<p>One table in 3NF: PK (street, city) enforces (street, city) → zip, but zip → city is <b>not</b> enforced by any key — two rows can map zip 411001 to Pune and Mumbai. Every pair (street, zip) also repeats the zip's city.</p>`,
      code: `CREATE TABLE addresses (street TEXT NOT NULL, city TEXT NOT NULL, zip TEXT NOT NULL, PRIMARY KEY (street, city));
INSERT INTO addresses VALUES ('MG Road', 'Pune', '411001'), ('FC Road', 'Pune', '411004');
INSERT INTO addresses VALUES ('Link Road', 'Mumbai', '411001');      -- zip -> city broken, accepted
SELECT zip, GROUP_CONCAT(DISTINCT city) AS cities FROM addresses GROUP BY zip HAVING COUNT(DISTINCT city) > 1;`
    },
    mcq: { q: 'In the BCNF design zips(zip, city) + street_zips(street, zip), which FD is lost?', options: ['(street, city) → zip', 'zip → city', 'street → zip', 'None'], answer: 0, explain: 'street and city never appear in the same table any more, so no key can enforce it.' },
    hints: [`<p>Hint 1: street never appears on a right side → in every key. {street}⁺ = {street}; add city or zip.</p>`, `<p>Hint 2: Split on zip → city: (zip, city) with key zip, and (street, zip) with key (street, zip). Lossless because zip is a key of the first.</p>`, `<p>Hint 3: The lost rule says: for one street, at most one zip per city. A BEFORE INSERT trigger joins street_zips to zips to find another zip of the same city on that street.</p>`],
    tests: { cmp: 'exact', engine: 'sqlite', cases: [
        { cols: ['street', 'city', 'zip'], rows: [['FC Road', 'Pune', '411004'], ['Link Road', 'Mumbai', '400050'], ['MG Road', 'Mumbai', '400050'], ['MG Road', 'Pune', '411001']] },
        { after: 'INSERT INTO street_zips VALUES (\'FC Road\', \'411001\'); SELECT COUNT(*) FROM street_zips', rows: [[4]] },
        { after: 'INSERT INTO street_zips VALUES (\'FC Road\', \'400050\'); SELECT COUNT(*) FROM street_zips', rows: [[5]] },
        { after: 'INSERT INTO street_zips VALUES (\'MG Road\', \'411004\'); SELECT COUNT(*) FROM (SELECT s.street, z.city FROM street_zips s JOIN zips z USING (zip) GROUP BY s.street, z.city HAVING COUNT(*) > 1)', rows: [[0]] },
        { after: 'UPDATE street_zips SET zip = \'411004\' WHERE street = \'MG Road\' AND zip = \'400050\'; SELECT COUNT(*) FROM (SELECT s.street, z.city FROM street_zips s JOIN zips z USING (zip) GROUP BY s.street, z.city HAVING COUNT(*) > 1)', rows: [[0]] },
        { after: 'UPDATE zips SET city = \'Pune\' WHERE zip = \'400050\'; SELECT city FROM zips WHERE zip = \'400050\'', rows: [['Mumbai']] },
        { after: 'UPDATE zips SET city = \'Pune City\' WHERE zip = \'411004\'; SELECT city FROM zips WHERE zip = \'411004\'', rows: [['Pune City']] },
        { after: 'UPDATE street_zips SET street = \'MG Road\' WHERE street = \'FC Road\'; SELECT COUNT(*) FROM (SELECT s.street, z.city FROM street_zips s JOIN zips z USING (zip) GROUP BY s.street, z.city HAVING COUNT(*) > 1)', rows: [[0]] },
        { after: 'INSERT INTO street_zips VALUES (\'MG Road\', \'411001\')', error: 'UNIQUE' },
        { after: 'INSERT INTO street_zips VALUES (\'X Road\', \'999999\')', error: 'FOREIGN KEY' },
        { after: 'INSERT INTO zips VALUES (\'411001\', \'Elsewhere\')', error: 'UNIQUE' },
        { after: 'INSERT INTO zips (zip) VALUES (\'500001\')', error: 'NOT NULL' },
        { after: 'SELECT zip FROM zips GROUP BY zip HAVING COUNT(DISTINCT city) > 1', rows: [] }
      ] },
    solution: {
      approach: `<p>Keys: {street, city}, {street, zip}; all attributes prime → 3NF. zip → city violates BCNF. BCNF split: <code>zips(zip PK, city)</code> + <code>street_zips(street, zip, PK both)</code>; (street, city) → zip is lost and enforced by a trigger (RAISE(IGNORE) here, ABORT in production). <b>Which to ship?</b> Both designs leave one rule to a trigger (3NF can't key-enforce zip → city either), so BCNF wins: less redundancy, and zips doubles as a reference table for address validation.</p>`,
      code: `PRAGMA foreign_keys = ON;
CREATE TABLE zips (zip TEXT PRIMARY KEY, city TEXT NOT NULL);                 -- zip -> city by PK
CREATE TABLE street_zips (
  street TEXT NOT NULL,
  zip    TEXT NOT NULL REFERENCES zips(zip),
  PRIMARY KEY (street, zip));
-- Lost FD (street, city) -> zip: one street may not have two zips in the same city
CREATE TRIGGER one_zip_per_street_city BEFORE INSERT ON street_zips
WHEN EXISTS (SELECT 1 FROM street_zips s JOIN zips z ON z.zip = s.zip
             WHERE s.street = NEW.street AND s.zip <> NEW.zip
               AND z.city = (SELECT city FROM zips WHERE zip = NEW.zip))
BEGIN SELECT RAISE(IGNORE); END;
-- the same rule must also hold when a row moves to another street/zip, or a zip changes city
CREATE TRIGGER one_zip_per_street_city_upd BEFORE UPDATE ON street_zips
WHEN EXISTS (SELECT 1 FROM street_zips s JOIN zips z ON z.zip = s.zip
             WHERE s.street = NEW.street AND s.rowid <> OLD.rowid AND s.zip <> NEW.zip
               AND z.city = (SELECT city FROM zips WHERE zip = NEW.zip))
BEGIN SELECT RAISE(IGNORE); END;
CREATE TRIGGER one_zip_per_street_city_zips BEFORE UPDATE OF city ON zips
WHEN EXISTS (SELECT 1 FROM street_zips a JOIN street_zips b ON b.street = a.street AND b.zip <> a.zip
             JOIN zips z ON z.zip = b.zip
             WHERE a.zip = NEW.zip AND z.city = NEW.city)
BEGIN SELECT RAISE(IGNORE); END;

INSERT INTO zips VALUES ('411001', 'Pune'), ('411004', 'Pune'), ('400050', 'Mumbai');
INSERT INTO street_zips VALUES ('MG Road', '411001'), ('FC Road', '411004'), ('Link Road', '400050');
INSERT INTO street_zips VALUES ('MG Road', '411004');      -- 2nd Pune zip for MG Road: blocked
INSERT INTO street_zips VALUES ('MG Road', '400050');      -- MG Road in Mumbai too: allowed (different city)

SELECT s.street, z.city, s.zip FROM street_zips s JOIN zips z USING (zip) ORDER BY s.street, z.city;`,
      complexity: `<p>Key checks O(log N); the trigger adds one indexed join per insert (index street_zips(street) is the PK prefix).</p>`,
      followUps: ['Real ZIPs can span two cities. Which FD disappears, and what normal form is R then?', 'How would you enforce the lost rule under concurrent inserts?']
    }
  });

  practice.push({
    title: 'University Spreadsheet: 0NF → BCNF in One Script',
    level: 'Hard', tags: ['0NF', 'BCNF', 'parsing', 'migration'], companies: ['Coursera', 'Byju\'s', 'Microsoft'],
    statement: `<p>A registrar exports one row per student: <code>student_id, student_name, advisor_id, advisor_name, advisor_office, enrolments</code>, where enrolments looks like <code>'DB1:Databases:A; OS1:Operating Systems:B'</code> (course id : title : grade). Rules: student → name, advisor; advisor → name, office; course → title; (student, course) → grade. Write one SQL script that parses, normalizes to BCNF and verifies.</p>`,
    constraints: `<p>SQLite. Items separated by ';', fields by ':'; extra spaces possible; a student may have no enrolments.</p>`,
    example: `<p>Row (S1, Asha, A7, Dr. Rao, R-101, 'DB1:Databases:A; OS1:Operating Systems:B') → enrollments ${H.c('g', '(S1, DB1, A), (S1, OS1, B)')}, courses (DB1, Databases), (OS1, Operating Systems), advisor (A7, Dr. Rao, R-101).</p>`,
    brute: {
      why: `<p>Querying the export directly means string-parsing on every query, advisor details repeated per student, course titles repeated per student, and "average grade in DB1" requires LIKE '%DB1%' plus substring hacks.</p>`,
      code: `CREATE TABLE export (student_id TEXT PRIMARY KEY, student_name TEXT, advisor_id TEXT, advisor_name TEXT, advisor_office TEXT, enrolments TEXT);
INSERT INTO export VALUES
  ('S1', 'Asha', 'A7', 'Dr. Rao', 'R-101', 'DB1:Databases:A; OS1:Operating Systems:B'),
  ('S2', 'Ben',  'A7', 'Dr. Rao', 'R-101', 'DB1:Databases:B');
SELECT COUNT(*) AS students_in_db1 FROM export WHERE enrolments LIKE '%DB1:%';   -- fragile string matching`
    },
    mcq: { q: 'After parsing, which table holds the grade?', options: ['enrollments(student_id, course_id, grade)', 'courses(course_id, title, grade)', 'students(student_id, grade)', 'advisors(advisor_id, grade)'], answer: 0, explain: 'Grade depends on the full (student, course) key.' },
    hints: [`<p>Hint 1: First split enrolments on ';' with a recursive CTE (1NF), then split each item on ':' using INSTR twice.</p>`, `<p>Hint 2: Determinants → tables: advisors(advisor_id), students(student_id), courses(course_id), enrollments(student_id, course_id).</p>`, `<p>Hint 3: Load parsed items into a TEMP table first, then INSERT … SELECT DISTINCT into each target. Verify by counting enrolments per student against the original.</p>`],
    tests: { cmp: 'exact', engine: 'sqlite', cases: [
        { cols: ['student_id', 'student_name', 'advisor_name', 'courses', 'grades'], rows: [['S1', 'Asha', 'Dr. Rao', 2, 'Databases=A, Operating Systems=B'], ['S2', 'Ben', 'Dr. Rao', 1, 'Databases=B'], ['S3', 'Chen', 'Dr. Sen', 0, null]] },
        { after: 'SELECT advisor_id, advisor_name, office FROM advisors ORDER BY advisor_id', rows: [['A7', 'Dr. Rao', 'R-101'], ['A9', 'Dr. Sen', 'R-205']] },
        { after: 'SELECT course_id, title FROM courses ORDER BY course_id', rows: [['DB1', 'Databases'], ['OS1', 'Operating Systems']] },
        { after: 'SELECT student_id, course_id, grade FROM enrollments ORDER BY 1, 2', rows: [['S1', 'DB1', 'A'], ['S1', 'OS1', 'B'], ['S2', 'DB1', 'B']] },
        { after: 'UPDATE advisors SET office = \'R-999\' WHERE advisor_id = \'A7\'; SELECT DISTINCT a.office FROM students s JOIN advisors a USING (advisor_id) WHERE s.advisor_id = \'A7\'', rows: [['R-999']] },
        { after: 'SELECT COUNT(*) FROM students WHERE student_id NOT IN (SELECT student_id FROM enrollments)', rows: [[1]] },
        { after: 'INSERT INTO enrollments VALUES (\'S1\', \'DB1\', \'C\')', error: 'UNIQUE' },
        { after: 'INSERT INTO students VALUES (\'S9\', \'Zed\', \'A0\')', error: 'FOREIGN KEY' },
        { after: 'INSERT INTO enrollments VALUES (\'S3\', \'NOPE\', \'A\')', error: 'FOREIGN KEY' },
        { after: 'INSERT INTO enrollments VALUES (\'S3\', \'DB1\', NULL)', error: 'NOT NULL' },
        { after: 'INSERT INTO enrollments VALUES (\'S3\', \'OS1\', \'C\'); SELECT COUNT(*) FROM enrollments', rows: [[4]] }
      ] },
    solution: {
      approach: `<p>0NF → 1NF: recursive CTE peels items off the list; each item is split into course_id, title, grade with INSTR/SUBSTR and TRIM. 2NF/3NF/BCNF: student facts (name, advisor_id) → students; advisor facts → advisors (removes the transitive student → advisor → office); course title → courses (removes the partial dependency on course_id); grade stays with the full key in enrollments. Every determinant is a key → BCNF. Verification compares item counts.</p>`,
      code: `PRAGMA foreign_keys = ON;
CREATE TABLE export (student_id TEXT PRIMARY KEY, student_name TEXT, advisor_id TEXT, advisor_name TEXT, advisor_office TEXT, enrolments TEXT);
INSERT INTO export VALUES
  ('S1', 'Asha', 'A7', 'Dr. Rao', 'R-101', 'DB1:Databases:A; OS1:Operating Systems:B'),
  ('S2', 'Ben',  'A7', 'Dr. Rao', 'R-101', 'DB1:Databases:B'),
  ('S3', 'Chen', 'A9', 'Dr. Sen', 'R-205', '');

CREATE TABLE advisors (advisor_id TEXT PRIMARY KEY, advisor_name TEXT NOT NULL, office TEXT NOT NULL);
CREATE TABLE students (student_id TEXT PRIMARY KEY, student_name TEXT NOT NULL,
                       advisor_id TEXT NOT NULL REFERENCES advisors(advisor_id));
CREATE TABLE courses  (course_id TEXT PRIMARY KEY, title TEXT NOT NULL);
CREATE TABLE enrollments (
  student_id TEXT NOT NULL REFERENCES students(student_id),
  course_id  TEXT NOT NULL REFERENCES courses(course_id),
  grade      TEXT NOT NULL,
  PRIMARY KEY (student_id, course_id));

CREATE TEMP TABLE items AS
WITH RECURSIVE split(student_id, item, rest) AS (
  SELECT student_id, '', COALESCE(enrolments, '') || ';' FROM export
  UNION ALL
  SELECT student_id, TRIM(SUBSTR(rest, 1, INSTR(rest, ';') - 1)), SUBSTR(rest, INSTR(rest, ';') + 1)
  FROM split WHERE rest <> ''),
parts AS (
  SELECT student_id,
         TRIM(SUBSTR(item, 1, INSTR(item, ':') - 1))                AS course_id,
         SUBSTR(item, INSTR(item, ':') + 1)                         AS tail
  FROM split WHERE item <> '')
SELECT student_id, course_id,
       TRIM(SUBSTR(tail, 1, INSTR(tail, ':') - 1)) AS title,
       TRIM(SUBSTR(tail, INSTR(tail, ':') + 1))    AS grade
FROM parts;

INSERT INTO advisors SELECT DISTINCT advisor_id, advisor_name, advisor_office FROM export;
INSERT INTO students SELECT student_id, student_name, advisor_id FROM export;
INSERT INTO courses  SELECT DISTINCT course_id, title FROM items;
INSERT INTO enrollments SELECT student_id, course_id, grade FROM items;

-- Verify: enrolments per student match the number of items in the original string
SELECT s.student_id, s.student_name, a.advisor_name, COUNT(e.course_id) AS courses,
       GROUP_CONCAT(c.title || '=' || e.grade, ', ') AS grades
FROM students s JOIN advisors a USING (advisor_id)
LEFT JOIN enrollments e ON e.student_id = s.student_id
LEFT JOIN courses c ON c.course_id = e.course_id
GROUP BY s.student_id ORDER BY s.student_id;`,
      complexity: `<p>Parsing is O(total characters); each INSERT … SELECT DISTINCT is O(N log N). Afterwards, "average grade in DB1" is an indexed lookup.</p>`,
      followUps: ['Two exports disagree on a course title — how does the migration fail, and how do you handle it?', 'Advisors change each year; keep history.']
    }
  });

  practice.push({
    title: 'Build a Star Schema from a Normalized Shop',
    level: 'Hard', tags: ['star schema', 'denormalization', 'ETL'], companies: ['Snowflake', 'Databricks', 'Amazon'],
    statement: `<p>You have a 3NF shop: customers(city_id), cities(region), products(category_id), categories, orders, order_items. Analysts want "revenue by region × category × month". Design a star schema at the grain <b>one row per order line</b>, write the ETL in SQL (INSERT … SELECT), and answer the question from the star.</p>`,
    constraints: `<p>SQLite. Dimensions get surrogate keys; dim_date uses yyyymmdd keys; revenue is stored on the fact row (qty × price at sale).</p>`,
    example: `<p>An order line (order 1, Desk Lamp ×2 at 1200, customer in Pune, 2026-01-05) becomes a fact row ${H.c('g', '(20260105, product_key, customer_key, qty 2, revenue 2400)')}; region West and category Home sit inline in the dimensions.</p>`,
    brute: {
      why: `<p>Querying the OLTP schema directly needs 6 joins (order_items → orders → customers → cities, order_items → products → categories) for every dashboard tile, competes with live transactions for locks and cache, and every analyst re-implements the same joins (and the same mistakes).</p>`,
      code: `CREATE TABLE cities (id INTEGER PRIMARY KEY, name TEXT, region TEXT);
CREATE TABLE customers (id INTEGER PRIMARY KEY, name TEXT, city_id INT);
CREATE TABLE categories (id INTEGER PRIMARY KEY, name TEXT);
CREATE TABLE products (id INTEGER PRIMARY KEY, name TEXT, category_id INT);
CREATE TABLE orders (id INTEGER PRIMARY KEY, customer_id INT, order_date TEXT);
CREATE TABLE order_items (order_id INT, product_id INT, qty INT, unit_price INT);
INSERT INTO cities VALUES (1, 'Pune', 'West'), (2, 'Delhi', 'North');
INSERT INTO customers VALUES (1, 'Asha', 1), (2, 'Ben', 2);
INSERT INTO categories VALUES (1, 'Home'), (2, 'Kitchen');
INSERT INTO products VALUES (1, 'Desk Lamp', 1), (2, 'Coffee Mug', 2);
INSERT INTO orders VALUES (1, 1, '2026-01-05'), (2, 2, '2026-02-14');
INSERT INTO order_items VALUES (1, 1, 2, 1200), (1, 2, 3, 300), (2, 2, 5, 300);
SELECT ci.region, ca.name AS category, SUBSTR(o.order_date, 1, 7) AS month, SUM(oi.qty * oi.unit_price) AS revenue
FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN customers cu ON cu.id = o.customer_id
JOIN cities ci ON ci.id = cu.city_id JOIN products p ON p.id = oi.product_id JOIN categories ca ON ca.id = p.category_id
GROUP BY 1, 2, 3 ORDER BY 3, 1, 2;      -- 6-table join on every dashboard refresh`
    },
    mcq: { q: 'Why does dim_customer store region directly instead of referencing a cities table?', options: ['Star dimensions are denormalized so each dimension needs one join', 'Region never changes', 'Foreign keys are not allowed in warehouses', 'It saves storage'], answer: 0, explain: 'Flattening city → region into the dimension trades a little redundancy for simpler, faster queries (a snowflake would keep it separate).' },
    hints: [`<p>Hint 1: Declare the grain first: one fact row per order line. Measures: qty, revenue.</p>`, `<p>Hint 2: Dimensions: dim_date (from distinct order dates), dim_product (product + category inline), dim_customer (customer + city + region inline).</p>`, `<p>Hint 3: Load dimensions first (INSERT … SELECT with joins), then facts by looking up surrogate keys via natural keys.</p>`],
    tests: { cmp: 'exact', engine: 'sqlite', cases: [
        { cols: ['star_total', 'source_total'], rows: [[5950, 5950]] },
        { after: 'SELECT c.region, p.category, d.yyyymm, SUM(f.revenue) FROM fact_order_lines f JOIN dim_date d ON d.date_key = f.date_key JOIN dim_product p ON p.product_key = f.product_key JOIN dim_customer c ON c.customer_key = f.customer_key GROUP BY c.region, p.category, d.yyyymm ORDER BY d.yyyymm, c.region, p.category', rows: [['West', 'Home', '2026-01', 2400], ['West', 'Kitchen', '2026-01', 900], ['North', 'Kitchen', '2026-02', 1500], ['West', 'Home', '2026-02', 1150]] },
        { after: 'SELECT COUNT(*) FROM fact_order_lines', rows: [[4]] },
        { after: 'SELECT order_id, SUM(revenue) FROM fact_order_lines GROUP BY order_id ORDER BY order_id', rows: [[1, 3300], [2, 1500], [3, 1150]] },
        { after: 'SELECT date_key FROM dim_date ORDER BY date_key', rows: [[20260105], [20260214], [20260220]] },
        { after: 'SELECT name, category FROM dim_product ORDER BY product_id', rows: [['Desk Lamp', 'Home'], ['Coffee Mug', 'Kitchen']] },
        { after: 'SELECT name, city, region FROM dim_customer ORDER BY customer_id', rows: [['Asha', 'Pune', 'West'], ['Ben', 'Delhi', 'North']] },
        { after: 'UPDATE order_items SET unit_price = 9999; SELECT SUM(revenue) FROM fact_order_lines', rows: [[5950]] },
        { after: 'UPDATE cities SET region = \'Central\' WHERE id = 1; SELECT COUNT(*) FROM dim_customer WHERE region = \'West\'', rows: [[1]] },
        { after: 'INSERT INTO fact_order_lines VALUES (19990101, 1, 1, 9, 1, 1)', error: 'FOREIGN KEY' },
        { after: 'INSERT INTO fact_order_lines VALUES (20260105, 99, 1, 9, 1, 1)', error: 'FOREIGN KEY' },
        { after: 'INSERT INTO dim_product (product_id, name, category) VALUES (1, \'Clone\', \'X\')', error: 'UNIQUE' }
      ] },
    solution: {
      approach: `<p>Grain: order line. <b>dim_date</b>(date_key yyyymmdd, month, year), <b>dim_product</b>(product_key, product_id natural key, name, category), <b>dim_customer</b>(customer_key, customer_id, name, city, region) — city → region kept inline on purpose. <b>fact_order_lines</b>(date_key, product_key, customer_key, qty, revenue). ETL flattens joins once at load time; analysts then join each dimension once. Reconcile: SUM(revenue) in the fact equals SUM(qty × unit_price) in the source.</p>`,
      code: `PRAGMA foreign_keys = ON;
-- Source OLTP (3NF)
CREATE TABLE cities (id INTEGER PRIMARY KEY, name TEXT NOT NULL, region TEXT NOT NULL);
CREATE TABLE customers (id INTEGER PRIMARY KEY, name TEXT NOT NULL, city_id INT NOT NULL REFERENCES cities(id));
CREATE TABLE categories (id INTEGER PRIMARY KEY, name TEXT NOT NULL);
CREATE TABLE products (id INTEGER PRIMARY KEY, name TEXT NOT NULL, category_id INT NOT NULL REFERENCES categories(id));
CREATE TABLE orders (id INTEGER PRIMARY KEY, customer_id INT NOT NULL REFERENCES customers(id), order_date TEXT NOT NULL);
CREATE TABLE order_items (order_id INT NOT NULL, product_id INT NOT NULL, qty INT NOT NULL, unit_price INT NOT NULL,
                          PRIMARY KEY (order_id, product_id));
INSERT INTO cities VALUES (1, 'Pune', 'West'), (2, 'Delhi', 'North');
INSERT INTO customers VALUES (1, 'Asha', 1), (2, 'Ben', 2);
INSERT INTO categories VALUES (1, 'Home'), (2, 'Kitchen');
INSERT INTO products VALUES (1, 'Desk Lamp', 1), (2, 'Coffee Mug', 2);
INSERT INTO orders VALUES (1, 1, '2026-01-05'), (2, 2, '2026-02-14'), (3, 1, '2026-02-20');
INSERT INTO order_items VALUES (1, 1, 2, 1200), (1, 2, 3, 300), (2, 2, 5, 300), (3, 1, 1, 1150);

-- Star schema
CREATE TABLE dim_date (date_key INTEGER PRIMARY KEY, full_date TEXT NOT NULL, yyyymm TEXT NOT NULL, year INT NOT NULL);
CREATE TABLE dim_product (product_key INTEGER PRIMARY KEY, product_id INT NOT NULL UNIQUE, name TEXT NOT NULL, category TEXT NOT NULL);
CREATE TABLE dim_customer (customer_key INTEGER PRIMARY KEY, customer_id INT NOT NULL UNIQUE, name TEXT NOT NULL,
                           city TEXT NOT NULL, region TEXT NOT NULL);
CREATE TABLE fact_order_lines (
  date_key INT NOT NULL REFERENCES dim_date(date_key),
  product_key INT NOT NULL REFERENCES dim_product(product_key),
  customer_key INT NOT NULL REFERENCES dim_customer(customer_key),
  order_id INT NOT NULL,                          -- degenerate dimension
  qty INT NOT NULL, revenue INT NOT NULL);

-- ETL: dimensions first (joins flattened once), then facts via natural-key lookups
INSERT INTO dim_date
SELECT DISTINCT CAST(REPLACE(order_date, '-', '') AS INTEGER), order_date, SUBSTR(order_date, 1, 7), CAST(SUBSTR(order_date, 1, 4) AS INTEGER)
FROM orders;
INSERT INTO dim_product (product_id, name, category)
SELECT p.id, p.name, c.name FROM products p JOIN categories c ON c.id = p.category_id;
INSERT INTO dim_customer (customer_id, name, city, region)
SELECT cu.id, cu.name, ci.name, ci.region FROM customers cu JOIN cities ci ON ci.id = cu.city_id;
INSERT INTO fact_order_lines
SELECT CAST(REPLACE(o.order_date, '-', '') AS INTEGER), dp.product_key, dc.customer_key, o.id,
       oi.qty, oi.qty * oi.unit_price
FROM order_items oi
JOIN orders o        ON o.id = oi.order_id
JOIN dim_product dp  ON dp.product_id = oi.product_id
JOIN dim_customer dc ON dc.customer_id = o.customer_id;

-- The analyst question: one join per dimension
SELECT c.region, p.category, d.yyyymm, SUM(f.revenue) AS revenue
FROM fact_order_lines f
JOIN dim_date d ON d.date_key = f.date_key
JOIN dim_product p ON p.product_key = f.product_key
JOIN dim_customer c ON c.customer_key = f.customer_key
GROUP BY c.region, p.category, d.yyyymm
ORDER BY d.yyyymm, c.region, p.category;

-- Reconcile with the source
SELECT (SELECT SUM(revenue) FROM fact_order_lines) AS star_total,
       (SELECT SUM(qty * unit_price) FROM order_items) AS source_total;`,
      complexity: `<p>ETL is O(N) with indexed natural-key lookups; queries scan the fact table once and hash-join small dimensions.</p>`,
      followUps: ['Asha moves from Pune to Delhi. Implement SCD Type 2 for dim_customer.', 'Add a monthly snapshot fact for inventory levels — what is its grain?']
    }
  });

  practice.push({
    title: 'Minimal Cover and 3NF Synthesis',
    level: 'Hard', tags: ['minimal cover', '3NF synthesis', 'dependency preservation'], companies: ['Oracle', 'Microsoft', 'Goldman Sachs'],
    statement: `<p>R(A, B, C, D, E, G), F = {A → BC, B → C, AB → D, D → E, CE → G, A → G}. (1) Compute a minimal cover. (2) Synthesize a 3NF schema. (3) Implement it in SQL with sample data and show the rejoin reproduces a row consistent with every FD.</p>`,
    constraints: `<p>Show every reduction step. SQLite DDL with primary keys matching the FD left sides.</p>`,
    example: `<p>AB → D: A⁺ = ABCDEG already contains D → ${H.c('y', 'B is extraneous')} → A → D. A → C is implied by A → B, B → C → ${H.c('r', 'redundant')}.</p>`,
    brute: {
      why: `<p>Without a minimal cover, "one table per FD" produces overlapping, redundant tables: (A, B, C), (B, C), (A, B, D), (D, E), (C, E, G), (A, G) — six tables, two of which only restate implied facts and must be kept consistent with the others.</p>`,
      code: `-- Naive: one table per given FD (redundant: A->C and A->G are implied by others)
CREATE TABLE t_abc (a TEXT PRIMARY KEY, b TEXT, c TEXT);
CREATE TABLE t_bc  (b TEXT PRIMARY KEY, c TEXT);
CREATE TABLE t_abd (a TEXT, b TEXT, d TEXT, PRIMARY KEY (a, b));
CREATE TABLE t_de  (d TEXT PRIMARY KEY, e TEXT);
CREATE TABLE t_ceg (c TEXT, e TEXT, g TEXT, PRIMARY KEY (c, e));
CREATE TABLE t_ag  (a TEXT PRIMARY KEY, g TEXT);
INSERT INTO t_abc VALUES ('a1', 'b1', 'c1');
INSERT INTO t_bc  VALUES ('b1', 'c2');               -- contradiction is possible: a1 -> c1 vs b1 -> c2
SELECT COUNT(*) AS contradictions FROM t_abc x JOIN t_bc y ON y.b = x.b WHERE y.c <> x.c;`
    },
    mcq: { q: 'In the minimal cover, why does AB → D become A → D?', options: ['A alone already determines D (A⁺ contains D), so B is extraneous', 'B never appears on a right side', 'D is a key', 'Left sides must be single attributes'], answer: 0, explain: 'An attribute in a left side is extraneous if the closure of the remaining left side still contains the right side.' },
    hints: [`<p>Hint 1: Split right sides: A→B, A→C, B→C, AB→D, D→E, CE→G, A→G.</p>`, `<p>Hint 2: Remove extraneous B from AB→D. Then drop A→G (A→B→C, A→D→E, CE→G) and A→C (A→B→C).</p>`, `<p>Hint 3: Minimal cover {A→B, B→C, A→D, D→E, CE→G} → tables (A,B,D), (B,C), (D,E), (C,E,G). Key A is inside (A,B,D) → no key table needed.</p>`],
    tests: { cmp: 'exact', engine: 'sqlite', cases: [
        { cols: ['a', 'b', 'c', 'd', 'e', 'g'], rows: [['a1', 'b1', 'c1', 'd1', 'e1', 'g1'], ['a2', 'b2', 'c2', 'd2', 'e1', 'g2'], ['a3', 'b1', 'c1', 'd2', 'e1', 'g1']] },
        { after: 'SELECT m.name, p.name FROM sqlite_master m, pragma_table_info(m.name) p WHERE m.type = \'table\' AND p.pk > 0 ORDER BY m.name, p.pk', rows: [['r1_abd', 'a'], ['r2_bc', 'b'], ['r3_de', 'd'], ['r4_ceg', 'c'], ['r4_ceg', 'e']] },
        { after: 'INSERT INTO r1_abd VALUES (\'a1\', \'b2\', \'d1\')', error: 'UNIQUE' },
        { after: 'INSERT INTO r2_bc VALUES (\'b1\', \'cX\')', error: 'UNIQUE' },
        { after: 'INSERT INTO r3_de VALUES (\'d1\', \'eX\')', error: 'UNIQUE' },
        { after: 'INSERT INTO r4_ceg VALUES (\'c1\', \'e1\', \'g9\')', error: 'UNIQUE' },
        { after: 'INSERT INTO r1_abd VALUES (\'a9\', \'b9\', \'d1\')', error: 'FOREIGN KEY' },
        { after: 'INSERT INTO r1_abd VALUES (\'a9\', \'b1\', \'d9\')', error: 'FOREIGN KEY' },
        { after: 'INSERT INTO r4_ceg VALUES (\'c1\', \'e2\', \'g3\'); SELECT COUNT(*) FROM r4_ceg', rows: [[3]] },
        { after: 'INSERT INTO r1_abd VALUES (\'a4\', \'b2\', \'d1\'); SELECT r1.a, r2.c, r3.e FROM r1_abd r1 JOIN r2_bc r2 ON r2.b = r1.b JOIN r3_de r3 ON r3.d = r1.d WHERE r1.a = \'a4\'', rows: [['a4', 'c2', 'e1']] }
      ] },
    solution: {
      approach: `<p><b>Minimal cover:</b> {A → B, B → C, A → D, D → E, CE → G}. <b>Synthesis:</b> group by left side → R1(A, B, D) key A; R2(B, C) key B; R3(D, E) key D; R4(C, E, G) key (C, E). Candidate key of R is A (A⁺ = everything); R1 contains it → lossless. No table is a subset of another. Every FD of the cover lives in one table → dependency-preserving; each table's only FDs have key left sides → 3NF (here also BCNF). Try it in the 3NF synthesis visualizer.</p>`,
      code: `PRAGMA foreign_keys = ON;
CREATE TABLE r2_bc  (b TEXT PRIMARY KEY, c TEXT NOT NULL);                       -- B -> C
CREATE TABLE r3_de  (d TEXT PRIMARY KEY, e TEXT NOT NULL);                       -- D -> E
CREATE TABLE r4_ceg (c TEXT NOT NULL, e TEXT NOT NULL, g TEXT NOT NULL, PRIMARY KEY (c, e));  -- CE -> G
CREATE TABLE r1_abd (a TEXT PRIMARY KEY,                                          -- A -> B, A -> D
                     b TEXT NOT NULL REFERENCES r2_bc(b),
                     d TEXT NOT NULL REFERENCES r3_de(d));
INSERT INTO r2_bc  VALUES ('b1', 'c1'), ('b2', 'c2');
INSERT INTO r3_de  VALUES ('d1', 'e1'), ('d2', 'e1');
INSERT INTO r4_ceg VALUES ('c1', 'e1', 'g1'), ('c2', 'e1', 'g2');
INSERT INTO r1_abd VALUES ('a1', 'b1', 'd1'), ('a2', 'b2', 'd2'), ('a3', 'b1', 'd2');

-- Rejoin: every A gets exactly one (B, C, D, E, G) — the universal relation is reconstructed
SELECT r1.a, r1.b, r2.c, r1.d, r3.e, r4.g
FROM r1_abd r1
JOIN r2_bc  r2 ON r2.b = r1.b
JOIN r3_de  r3 ON r3.d = r1.d
LEFT JOIN r4_ceg r4 ON r4.c = r2.c AND r4.e = r3.e
ORDER BY r1.a;`,
      complexity: `<p>Minimal cover: O(|F|² · |R|) closures; synthesis is linear in the cover. Four narrow tables, each FD enforced by a primary key.</p>`,
      followUps: ['Is the result also in BCNF? Prove it.', 'Remove D → E from F. Does the key table step change anything?']
    }
  });

  practice.push({
    title: 'Course Teachers and Textbooks (4NF)',
    level: 'Hard', tags: ['4NF', 'multi-valued dependency', 'BCNF'], companies: ['Pearson', 'Google', 'Chegg'],
    statement: `<p><code>course_offer(course, teacher, textbook)</code> lists every combination: any teacher of a course may use any of its textbooks. There are no FDs at all, so the table is BCNF. Show the insert anomaly anyway, explain the multi-valued dependency, decompose to 4NF and prove the decomposition is lossless.</p>`,
    constraints: `<p>SQLite. Teachers and textbooks of a course are independent of each other.</p>`,
    example: `<p>DB has teachers {Rao, Sen} and books {Ramakrishnan, Silberschatz} → ${H.c('r', '4 rows')}. Adding a 3rd book needs ${H.c('r', '2 more rows')} (one per teacher); forgetting one makes it look like Sen doesn't use that book.</p>`,
    brute: {
      why: `<p>Keeping the 3-column table stores the cross product teachers × books per course. Every new teacher costs |books| rows and every new book costs |teachers| rows; a partial insert creates a false fact ("Sen doesn't use Kleppmann").</p>`,
      code: `CREATE TABLE course_offer (course TEXT, teacher TEXT, textbook TEXT, PRIMARY KEY (course, teacher, textbook));
INSERT INTO course_offer VALUES ('DB', 'Rao', 'Ramakrishnan'), ('DB', 'Rao', 'Silberschatz'),
                                ('DB', 'Sen', 'Ramakrishnan'), ('DB', 'Sen', 'Silberschatz');
INSERT INTO course_offer VALUES ('DB', 'Rao', 'Kleppmann');             -- forgot Sen's row
SELECT teacher, COUNT(*) AS books FROM course_offer GROUP BY teacher;   -- Rao 3, Sen 2: inconsistent`
    },
    mcq: { q: 'Which dependency does the table violate 4NF on?', options: ['course ↠ teacher (independent of textbook)', 'teacher → course', 'textbook → teacher', 'It has no 4NF violation'], answer: 0, explain: 'For each course, the set of teachers is independent of the set of textbooks: a non-trivial MVD whose left side is not a superkey.' },
    hints: [`<p>Hint 1: No column determines another, so BCNF can't help. Look for two independent lists hanging off one column.</p>`, `<p>Hint 2: course ↠ teacher | textbook. Split into (course, teacher) and (course, textbook).</p>`, `<p>Hint 3: Lossless for MVDs: R1 ∩ R2 = course, and course ↠ R1 − R2 holds. Verify: the join of the two tables equals the original cross product.</p>`],
    tests: { cmp: 'exact', engine: 'sqlite', cases: [
        { cols: ['teacher', 'books'], rows: [['Iyer', 1], ['Rao', 3], ['Sen', 3]] },
        { after: 'SELECT COUNT(*) FROM course_offer_all', rows: [[7]] },
        { after: 'SELECT COUNT(*) FROM (SELECT * FROM course_offer EXCEPT SELECT * FROM course_offer_all)', rows: [[0]] },
        { after: 'SELECT COUNT(*) FROM (SELECT * FROM course_offer_all EXCEPT SELECT * FROM course_offer)', rows: [[2]] },
        { after: 'INSERT INTO course_teachers VALUES (\'DB\', \'Kim\'); SELECT COUNT(*) FROM course_offer_all WHERE teacher = \'Kim\'', rows: [[3]] },
        { after: 'SELECT course, teacher FROM course_teachers ORDER BY 1, 2', rows: [['DB', 'Rao'], ['DB', 'Sen'], ['OS', 'Iyer']] },
        { after: 'SELECT course, textbook FROM course_books ORDER BY 1, 2', rows: [['DB', 'Kleppmann'], ['DB', 'Ramakrishnan'], ['DB', 'Silberschatz'], ['OS', 'Tanenbaum']] },
        { after: 'INSERT INTO course_books VALUES (\'OS\', \'Stallings\'); SELECT teacher, COUNT(*) FROM course_offer_all WHERE course = \'OS\' GROUP BY teacher', rows: [['Iyer', 2]] },
        { after: 'INSERT INTO course_teachers VALUES (\'DB\', \'Rao\')', error: 'UNIQUE' },
        { after: 'INSERT INTO course_books VALUES (\'DB\', \'Silberschatz\')', error: 'UNIQUE' }
      ] },
    solution: {
      approach: `<p>MVD course ↠ teacher (equivalently course ↠ textbook): the teacher set and the book set for a course are independent. course is not a superkey of the 3-column table → 4NF violation. Decompose into course_teachers(course, teacher) and course_books(course, textbook). The decomposition is lossless because R1 ∩ R2 = {course} and course ↠ teacher holds (Fagin's theorem). A new book is one row; the "all combinations" view is rebuilt by a join.</p>`,
      code: `CREATE TABLE course_offer (course TEXT, teacher TEXT, textbook TEXT, PRIMARY KEY (course, teacher, textbook));
INSERT INTO course_offer VALUES ('DB', 'Rao', 'Ramakrishnan'), ('DB', 'Rao', 'Silberschatz'),
                                ('DB', 'Sen', 'Ramakrishnan'), ('DB', 'Sen', 'Silberschatz'),
                                ('OS', 'Iyer', 'Tanenbaum');

CREATE TABLE course_teachers (course TEXT NOT NULL, teacher  TEXT NOT NULL, PRIMARY KEY (course, teacher));
CREATE TABLE course_books    (course TEXT NOT NULL, textbook TEXT NOT NULL, PRIMARY KEY (course, textbook));
INSERT INTO course_teachers SELECT DISTINCT course, teacher  FROM course_offer;
INSERT INTO course_books    SELECT DISTINCT course, textbook FROM course_offer;

-- Lossless check BEFORE any new data: rejoin equals original
SELECT (SELECT COUNT(*) FROM (SELECT course, teacher, textbook FROM course_teachers JOIN course_books USING (course)
                              EXCEPT SELECT * FROM course_offer)) AS invented,
       (SELECT COUNT(*) FROM (SELECT * FROM course_offer
                              EXCEPT SELECT course, teacher, textbook FROM course_teachers JOIN course_books USING (course))) AS lost;

INSERT INTO course_books VALUES ('DB', 'Kleppmann');      -- one row; both teachers get it automatically
CREATE VIEW course_offer_all AS
SELECT course, teacher, textbook FROM course_teachers JOIN course_books USING (course);
SELECT teacher, COUNT(*) AS books FROM course_offer_all GROUP BY teacher ORDER BY teacher;`,
      complexity: `<p>Storage drops from Σ |teachers| × |books| to Σ (|teachers| + |books|) per course; inserts are O(1) rows.</p>`,
      followUps: ['If each teacher chooses their own books, is there still an MVD? What is the right design?', 'Explain the difference between an FD and an MVD with one example each.']
    }
  });

  /* =====================================================================
     QUIZ
     ===================================================================== */
  quiz.push(
    { q: 'A product cannot be added to the catalogue until someone orders it. Which anomaly is this?', options: ['Insert anomaly', 'Update anomaly', 'Delete anomaly', 'Phantom read'], answer: 0, explain: 'You cannot record one fact (the product) without an unrelated fact (an order) because the table key needs both.' },
    { q: 'Which query best checks whether the FD <code>email → city</code> is violated in table t?', options: ['<code>SELECT email FROM t GROUP BY email HAVING COUNT(DISTINCT city) &gt; 1</code>', '<code>SELECT DISTINCT email, city FROM t</code>', '<code>SELECT city FROM t GROUP BY city HAVING COUNT(*) &gt; 1</code>', '<code>SELECT COUNT(*) FROM t WHERE city IS NULL</code>'], answer: 0, explain: 'An FD is violated exactly when one left-side value maps to more than one right-side value.' },
    { q: 'R(A, B, C, D), F = {A → B, B → C, C → D}. What is A⁺?', options: ['{A, B, C, D}', '{A, B}', '{A, B, C}', '{A}'], answer: 0, explain: 'A gives B, B gives C, C gives D — transitivity all the way.' },
    { q: 'A table has a single-column primary key and is in 1NF. Which is guaranteed?', options: ['It is in 2NF (if it has no other composite candidate key)', 'It is in 3NF', 'It is in BCNF', 'It has no redundancy'], answer: 0, explain: 'Partial dependencies need a composite key; transitive dependencies are still possible, so 3NF is not guaranteed.' },
    { q: 'employees(emp_id PK, dept_id, dept_name). Highest normal form?', options: ['2NF', '1NF', '3NF', 'BCNF'], answer: 0, explain: 'Single-column key → 2NF. dept_id → dept_name is transitive (non-key determinant, non-prime target) → not 3NF.' },
    { q: 'What is the exact difference between 3NF and BCNF?', options: ['3NF also allows X → A when A is a prime attribute; BCNF requires X to be a superkey always', 'BCNF allows partial dependencies', '3NF forbids composite keys', 'There is no difference'], answer: 0, explain: 'The prime-attribute escape clause is the only difference; it matters with overlapping candidate keys.' },
    { q: 'Splitting R into R1 and R2 is lossless if…', options: ['R1 ∩ R2 is a superkey of R1 or of R2', 'R1 and R2 have the same number of columns', 'R1 ∪ R2 has fewer rows than R', 'R1 ∩ R2 is empty'], answer: 0, explain: 'The common columns must determine one side so each row finds exactly one partner.' },
    { q: 'A lossy decomposition, when re-joined, typically…', options: ['returns extra (spurious) rows', 'returns fewer rows', 'returns NULLs', 'fails with an error'], answer: 0, explain: 'Joins of projections always contain the original rows; lossy ones add fake combinations, losing the information of which ones were real.' },
    { q: 'Which statement about decomposition algorithms is correct?', options: ['3NF synthesis is always lossless and dependency-preserving; BCNF decomposition is always lossless but may lose dependencies', 'Both always preserve dependencies', 'BCNF decomposition may be lossy', '3NF synthesis may be lossy'], answer: 0, explain: 'Classic theorem pair; example: R(J, K, L) with JK → L, L → K has no dependency-preserving BCNF decomposition.' },
    { q: 'In a minimal cover, AB → C is reduced to A → C when…', options: ['C ∈ A⁺ computed with the full FD set', 'B never appears anywhere', 'A is a candidate key', 'C is prime'], answer: 0, explain: 'B is extraneous if A alone already determines C.' },
    { q: 'Storing <code>unit_price_at_sale</code> in order_items while products holds the current price is…', options: ['correct: it is a different fact (a snapshot), not redundancy', 'a 2NF violation', 'a 3NF violation that must be removed', 'only allowed in NoSQL'], answer: 0, explain: 'It depends on the specific order line and must not change when the catalogue changes.' },
    { q: 'In a star schema, the fact table typically contains…', options: ['foreign keys to dimensions plus numeric measures at a declared grain', 'descriptive text attributes like brand and region', 'only surrogate keys and no measures', 'one row per dimension member'], answer: 0, explain: 'Facts are narrow and long (events + measures); dimensions are wide and descriptive.' },
    { q: 'A table (course, teacher, textbook) stores every teacher × textbook combination per course and has no FDs. What normal form fixes it?', options: ['4NF (remove the multi-valued dependency)', 'BCNF', '3NF', '2NF'], answer: 0, explain: 'It is already BCNF; the redundancy comes from the MVD course ↠ teacher | textbook.' },
    { q: 'You keep <code>posts.like_count</code> as a denormalized counter. Which is the most important companion?', options: ['A same-transaction update path and a reconcile query against the likes table', 'A bigger integer type', 'Removing the likes table', 'A UNIQUE index on like_count'], answer: 0, explain: 'Every deliberate copy needs a sync mechanism and drift detection against the source of truth.' }
  );

  /* =====================================================================
     INTERVIEW Q&A
     ===================================================================== */
  interview.push(
    { q: 'What is normalization and why do we do it?', level: 'B', a: `<p>Normalization is organizing tables so that <b>each fact is stored once</b>, guided by functional dependencies. It removes redundancy and therefore the three anomalies: <b>update</b> (a fact stored in many rows can become inconsistent), <b>insert</b> (you can't record one fact without another), and <b>delete</b> (removing one fact removes another). Concretely, a flat orders table repeats each customer's city per order line; moving city into a customers table makes a move a one-row update. Benefits: integrity enforced by keys, smaller rows, simpler writes. Cost: more joins on read.</p>`, followUps: ['Give a delete anomaly from a real system you know.', 'Is all repetition redundancy?'] },
    { q: 'Explain 1NF, 2NF and 3NF in one sentence each, with an example.', level: 'B', a: `<p><b>1NF:</b> atomic values and no repeating groups — no <code>tags = 'a,b,c'</code>, no phone1/phone2/phone3. <b>2NF:</b> 1NF and no non-prime column depends on <b>part</b> of a composite key — in order_items(order_id, sku, qty, product_name), product_name depends only on sku. <b>3NF:</b> 2NF and no non-prime column depends on another non-key column — in employees(emp_id, dept_id, dept_name), dept_name depends on dept_id. Slogan: "the key, the whole key, and nothing but the key".</p>`, followUps: ['Why does a single-column key guarantee 2NF?', 'Can a table be 3NF but not 2NF?'] },
    { q: 'What is a functional dependency? How do you find candidate keys?', level: 'I', a: `<p>X → Y means any two rows equal on X are equal on Y — "X determines Y". It comes from business rules, not from data (data can only disprove it). To find keys: (1) attributes never on a right side must be in every key; (2) attributes only on right sides are in none; (3) start from the must-set, compute its <b>closure</b>; if it covers all attributes it is the only key; otherwise add "maybe" attributes one at a time, then two, skipping supersets of keys already found. Example: R(A,B,C,D), AB → C, C → D, D → A → keys AB, BC, BD.</p>`, followUps: ['How do you compute attribute closure?', 'What is a prime attribute and why does it matter?'] },
    { q: 'Explain BCNF and how it differs from 3NF. Give an example of 3NF but not BCNF.', level: 'I', a: `<p><b>BCNF:</b> for every non-trivial X → Y, X is a superkey. <b>3NF</b> additionally allows X → Y when Y is prime. The gap appears only with overlapping candidate keys. Example: register(student, subject, tutor) with (student, subject) → tutor and tutor → subject. Keys: (student, subject), (student, tutor); subject is prime so tutor → subject passes 3NF, but tutor is not a superkey so BCNF fails. Fix: tutors(tutor, subject) + student_tutors(student, tutor) — but then "one tutor per subject per student" spans two tables and is lost.</p>`, followUps: ['How would you enforce the lost dependency?', 'Which would you ship and why?'] },
    { q: 'What does "lossless join decomposition" mean and how do you test it?', level: 'I', a: `<p>A decomposition is lossless if natural-joining the projections returns exactly the original relation. A lossy one returns <b>extra spurious rows</b>, so the information of which combinations were real is lost. Binary test: R1 ∩ R2 must be a superkey of R1 or R2 (closure of the common attributes covers one side). Example: emp(emp, dept, loc) with dept → loc: (emp, dept) + (dept, loc) is lossless; (emp, loc) + (dept, loc) is lossy because loc determines nothing. For three or more tables use the chase, or verify on data with <code>EXCEPT</code> in both directions.</p>`, followUps: ['Why can a projection-join never lose rows?', 'How does this relate to fan-out in everyday JOINs?'] },
    { q: 'What is dependency preservation and why can BCNF lose it?', level: 'A', a: `<p>A decomposition preserves dependencies if every original FD can be checked inside individual tables (the union of the projected FDs implies F), so keys/UNIQUE enforce all rules without joins. BCNF splitting on X → Y separates attributes; if another FD needs attributes that end up in different tables, it is lost. Classic proof: R(J,K,L), JK → L, L → K; any BCNF decomposition separates J, K, L, so JK → L can't be enforced. 3NF synthesis from a minimal cover always preserves dependencies (each cover FD becomes a table) and stays lossless (by adding a key table if needed).</p>`, followUps: ['Describe the polynomial preservation test.', 'Would you accept a trigger to enforce a lost FD?'] },
    { q: 'Walk me through normalizing a messy order spreadsheet.', level: 'I', a: `<p>1) <b>1NF:</b> split list cells ("lamp, mug") into rows / child tables; ensure a key — here (order_id, sku). 2) Write FDs: order_id → date, customer; customer → city; sku → name, price; (order_id, sku) → qty. 3) <b>2NF:</b> move partial dependencies out: orders(order_id …), products(sku …). 4) <b>3NF:</b> customer → city is transitive inside orders → customers table. 5) Keep order_items(order_id, sku, qty, price_at_sale). 6) Migrate with <code>INSERT … SELECT DISTINCT</code> (the PK rejects rows that contradict an FD — a free data-quality check), then rejoin and compare with <code>EXCEPT</code> both ways.</p>`, followUps: ['What happens if SELECT DISTINCT yields two names for one sku?', 'How would you do this migration with zero downtime?'] },
    { q: 'When would you denormalize? Give concrete examples.', level: 'A', a: `<p>Only after measuring a read bottleneck that indexes and query rewrites can't fix, when reads dwarf writes, and when you can name the source of truth and the sync mechanism. Examples: a <b>like_count</b> counter maintained in the same transaction; an <b>order total</b> frozen at checkout (source is immutable, so no sync needed); a <b>summary table / materialized view</b> refreshed every 5 minutes for a dashboard; <b>duplicated data per access pattern</b> in Cassandra/DynamoDB; a <b>star schema</b> in the warehouse. Always add a reconcile query and alerting for drift. "Normalize until it hurts, denormalize until it works."</p>`, followUps: ['How do you keep a denormalized copy consistent at scale?', 'What breaks if two services update the copy?'] },
    { q: 'Explain star schema vs snowflake schema. What is the grain?', level: 'I', a: `<p>A <b>star</b> has one fact table (events with foreign keys and numeric measures) surrounded by denormalized dimension tables (date, product with category inline, store with region inline). A <b>snowflake</b> normalizes dimensions into sub-tables (product → category → department) — less redundancy, more joins. The <b>grain</b> is what one fact row means ("one row per order line" or "per product per store per day"); declaring it first prevents double counting. Stars dominate in practice because columnar engines compress repeated dimension values cheaply and BI/AI tools generate simpler SQL with fewer joins.</p>`, followUps: ['What is a degenerate dimension?', 'Explain SCD Type 1 vs Type 2.'] },
    { q: 'Is a JSON or array column a violation of 1NF? Would you use one?', level: 'A', a: `<p>Strictly, yes — it holds a non-atomic value. Practically, it depends on usage. I'd use <code>jsonb</code>/arrays for data read as a whole with its parent and filtered at most by containment with a GIN index (tags for display, flexible attributes, raw payloads). I'd normalize when elements need referential integrity, uniqueness across rows, per-element updates by concurrent writers, aggregation by element, or their own attributes. Rule: once an element has relationships or rules, it deserves a row. Also note JSON hides schema drift, so validate with CHECK constraints or JSON schema at the edge.</p>`, followUps: ['How would you migrate a JSON array column to a child table?', 'What indexing does PostgreSQL offer for jsonb?'] },
    { q: 'What are 4NF and 5NF? Have you seen them matter?', level: 'E', a: `<p><b>4NF</b> removes non-trivial <b>multi-valued dependencies</b> X ↠ Y whose left side isn't a superkey — typically two independent many-to-many facts stored in one table, forcing a cross product (course × teachers × textbooks). Split into (course, teacher) and (course, textbook); losslessness follows from the MVD (Fagin). <b>5NF/PJNF</b> removes join dependencies not implied by keys — e.g. a cyclic rule "if supplier S supplies part P and P is used in project J and S works on J, then S supplies P to J"; then three binary tables replace the ternary one. They matter in junction-table design: if a 3-column junction table has no FDs but suspicious duplication, check for an MVD.</p>`, followUps: ['Is every 4NF relation in BCNF?', 'How do you detect an MVD from data?'] },
    { q: 'How do surrogate keys interact with normalization?', level: 'A', a: `<p>A surrogate (auto-increment/UUID) is a convenient identifier but it doesn't remove dependencies. If order_items gets <code>id PK</code>, (order_id, sku) is still a candidate key, and sku → price is still a partial dependency on it. Normal forms consider <b>all</b> candidate keys, so you must still declare natural keys as UNIQUE and still split out dependent facts. Benefits of surrogates: stable references when natural keys change (emails), compact FKs, SCD Type 2 history in warehouses. Danger: teams forget the natural UNIQUE constraint and get duplicate "same" rows with different ids.</p>`, followUps: ['UUIDv4 vs UUIDv7 vs bigint for primary keys?', 'When is a natural key the right primary key?'] },
    { q: 'An LLM generated a schema from a CSV with one wide table. How do you review it?', level: 'E', a: `<p>I'd (1) ask what each column describes and write the business FDs with a domain expert; (2) verify them on full data with <code>GROUP BY x HAVING COUNT(DISTINCT y) &gt; 1</code>; (3) find candidate keys via closure; (4) decompose to 3NF/BCNF, preferring synthesis when preserving rules matters; (5) identify snapshot columns that must not be normalized (price at sale, ship-to address); (6) migrate with SELECT DISTINCT so PKs catch contradictions; (7) prove losslessness with EXCEPT; (8) only then consider deliberate denormalization for measured hot paths. AI accelerates steps 1–2 and the migration SQL, but the FD judgements and snapshot decisions are mine.</p>`, followUps: ['Which mistakes do AI tools typically make here?', 'How would you test the migration before cut-over?'] },
    { q: 'Normalized OLTP vs denormalized analytics: how do they coexist in one company?', level: 'E', a: `<p>The OLTP database (3NF/BCNF) is the <b>system of record</b> optimized for correct concurrent writes. Change Data Capture (e.g. Debezium from the WAL) or batch ELT copies changes into a warehouse/lakehouse, where transformation jobs (dbt) build staging → conformed dimensions and facts (star) → aggregates/OBTs for BI and AI agents. Consistency is <b>eventual</b> with a known lag; reconciliation tests check totals per day between source and warehouse. Caches and search indexes are further denormalized read models fed by the same change stream (CQRS). The rule everywhere: one source of truth per fact, every copy has an owner, a refresh path and a drift check.</p>`, followUps: ['How do you handle deletes in CDC pipelines?', 'What is a conformed dimension?'] }
  );

  registerModule({
    id: 'sql08',
    title: 'Normalization & Denormalization',
    intro: `<p>A table that "has everything in one place" feels convenient — until a customer's city exists in two versions, a new product can't be added without a fake order, and cancelling one order wipes a price from your catalogue. <b>Normalization</b> is the disciplined way to cut a messy table into clean tables so that <b>every fact lives in exactly one place</b>. In this module you will learn to spot the three <b>anomalies</b>, write down <b>functional dependencies</b>, compute <b>closures</b> and <b>candidate keys</b>, and walk any table from <b>0NF → 1NF → 2NF → 3NF → BCNF</b> with decompositions that are provably <b>lossless</b>. Then you will learn the other half of the craft: <b>when to break the rules on purpose</b> — counters, snapshots, materialized summaries and <b>star schemas</b> for analytics.</p>
<p>Every visualizer splits a real table step by step, draws FD arrows, and paints anomalies red. Several visualizers are interactive calculators — type your own FDs and watch closure, keys, BCNF decomposition and 3NF synthesis run. Every SQL snippet runs in SQLite in your browser.</p>`,
    goals: [
      'Explain update, insert and delete anomalies with a concrete row example, and say why constraints alone cannot fix a redundant table',
      'Compute attribute closure, find every candidate key and prime attribute, and build a minimal cover by hand',
      'Identify the highest normal form (1NF, 2NF, 3NF, BCNF) of a relation from its FDs and keys, and name the violating dependency',
      'Decompose any table from 0NF to BCNF (or 3NF via synthesis) with runnable SQL DDL and data-migration scripts',
      'Prove a decomposition is lossless (common attributes form a key of one side) and check dependency preservation',
      'Decide when to denormalize (counters, snapshots, materialized views, star schemas) and how to keep the copies correct'
    ],
    prereqs: `<p>SQL 1 (keys and relationships), SQL 4 (JOINs) and SQL 7 (DDL, constraints &amp; ER modelling). Comfort with <code>GROUP BY … HAVING</code> (SQL 3) helps for the FD-checking queries; recursive CTEs (SQL 5) appear in two optional snippets.</p>`,
    hours: 12,
    databases: { messy: DB_MESSY, star: DB_STAR },
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
