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
