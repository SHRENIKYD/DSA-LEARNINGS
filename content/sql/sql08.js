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
  function fmt(a, L) { return a.length ? (L ? a.join('') : a.join(', ')) : '∅'; }
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
