(function () {
  var topics = [], practice = [], quiz = [], interview = [];

  /* ---------------- sample databases (SQLite dialect) ---------------- */
  // shop: a realistic e-commerce schema with every constraint type and three different ON DELETE policies.
  var DB_SHOP = `PRAGMA foreign_keys = ON;
CREATE TABLE customers (
  id         INTEGER PRIMARY KEY,
  email      TEXT NOT NULL UNIQUE,
  name       TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE addresses (
  id          INTEGER PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  line1       TEXT NOT NULL,
  city        TEXT NOT NULL,
  is_default  INTEGER NOT NULL DEFAULT 0 CHECK (is_default IN (0, 1))
);
CREATE TABLE categories (
  id        INTEGER PRIMARY KEY,
  name      TEXT NOT NULL UNIQUE,
  parent_id INTEGER REFERENCES categories(id) ON DELETE SET NULL
);
CREATE TABLE products (
  id          INTEGER PRIMARY KEY,
  sku         TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  price_cents INTEGER NOT NULL CHECK (price_cents > 0),
  stock       INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  is_active   INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL
);
CREATE TABLE orders (
  id              INTEGER PRIMARY KEY,
  customer_id     INTEGER NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'paid', 'shipped', 'delivered', 'cancelled')),
  placed_at       TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ship_address_id INTEGER REFERENCES addresses(id) ON DELETE SET NULL
);
CREATE TABLE order_items (
  order_id         INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id       INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  qty              INTEGER NOT NULL CHECK (qty > 0),
  unit_price_cents INTEGER NOT NULL CHECK (unit_price_cents > 0),
  PRIMARY KEY (order_id, product_id)
);
CREATE TABLE reviews (
  id          INTEGER PRIMARY KEY,
  product_id  INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
  rating      INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body        TEXT,
  UNIQUE (product_id, customer_id)
);
CREATE INDEX idx_addresses_customer ON addresses(customer_id);
CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_order_items_product ON order_items(product_id);
CREATE INDEX idx_reviews_customer ON reviews(customer_id);
INSERT INTO customers (id, email, name, created_at) VALUES
  (1, 'asha@mail.com', 'Asha', '2026-01-10 09:00:00'),
  (2, 'ben@mail.com',  'Ben',  '2026-02-03 18:30:00'),
  (3, 'chen@mail.com', 'Chen', '2026-03-21 12:15:00'),
  (4, 'dara@mail.com', 'Dara', '2026-04-02 08:45:00');
INSERT INTO addresses (id, customer_id, line1, city, is_default) VALUES
  (1, 1, '12 MG Road', 'Bengaluru', 1),
  (2, 1, '5 Park Street', 'Kolkata', 0),
  (3, 2, '9 King Street', 'London', 1),
  (4, 4, '1 Elm Avenue', 'Austin', 1);
INSERT INTO categories (id, name, parent_id) VALUES
  (1, 'Electronics', NULL), (2, 'Phones', 1), (3, 'Books', NULL);
INSERT INTO products (id, sku, name, price_cents, stock, category_id) VALUES
  (1, 'PH-001', 'Pixel Phone', 49900, 10, 2),
  (2, 'CB-002', 'USB-C Cable', 999, 200, 1),
  (3, 'BK-003', 'SQL Book', 2999, 15, 3),
  (4, 'HP-004', 'Headphones', 7999, 0, 1);
INSERT INTO orders (id, customer_id, status, placed_at, ship_address_id) VALUES
  (1, 1, 'delivered', '2026-09-01 10:00:00', 1),
  (2, 1, 'paid',      '2026-09-05 14:20:00', 2),
  (3, 2, 'pending',   '2026-09-07 19:05:00', 3),
  (4, 3, 'cancelled', '2026-09-09 08:10:00', NULL);
INSERT INTO order_items (order_id, product_id, qty, unit_price_cents) VALUES
  (1, 1, 1, 49900), (1, 2, 2, 999), (2, 3, 1, 2999),
  (3, 2, 3, 999), (3, 4, 1, 7999), (4, 3, 1, 2999);
INSERT INTO reviews (id, product_id, customer_id, rating, body) VALUES
  (1, 1, 1, 5, 'Great phone'), (2, 3, 1, 4, 'Clear explanations'),
  (3, 3, 4, 5, 'Loved it'),    (4, 2, 2, 3, 'Does the job');`;

  // messy: legacy data with NO constraints - full of rows that would violate the rules you are about to add.
  var DB_MESSY = `CREATE TABLE users_raw (id INTEGER, email TEXT, name TEXT, age INTEGER, country TEXT);
INSERT INTO users_raw VALUES
  (1, 'asha@mail.com', 'Asha', 29, 'IN'),
  (2, 'BEN@mail.com', 'Ben', 17, 'UK'),
  (3, 'ben@mail.com', 'Benjamin', 34, 'UK'),
  (4, NULL, 'Ghost', 40, 'US'),
  (5, 'chen@mail.com', 'Chen', -3, 'CN'),
  (5, 'dup@mail.com', 'Dup Id', 22, 'IN'),
  (6, 'asha@mail.com', 'Asha B', 31, 'IN'),
  (7, 'eve@mail.com', 'Eve', 230, 'india');
CREATE TABLE orders_raw (id INTEGER, user_id INTEGER, amount_cents INTEGER, status TEXT);
INSERT INTO orders_raw VALUES
  (101, 1, 2500, 'paid'), (102, 2, 999, 'PAID'), (103, 9, 4000, 'shipped'),
  (104, 3, -50, 'pending'), (105, NULL, 1200, 'paid'), (106, 8, 300, 'lost');
CREATE TABLE order_lines_flat (
  order_id INTEGER, order_date TEXT, customer_email TEXT, customer_name TEXT,
  customer_city TEXT, product_name TEXT, product_price REAL, qty INTEGER);
INSERT INTO order_lines_flat VALUES
  (1, '2026-09-01', 'asha@mail.com', 'Asha', 'Bengaluru', 'Pixel Phone', 499.00, 1),
  (1, '2026-09-01', 'asha@mail.com', 'Asha', 'Bengaluru', 'USB-C Cable', 9.99, 2),
  (2, '2026-09-05', 'asha@mail.com', 'Asha', 'Mumbai', 'SQL Book', 29.99, 1),
  (3, '2026-09-07', 'ben@mail.com', 'Ben', 'London', 'USB-C Cable', 8.99, 3),
  (4, '2026-09-09', 'ben@mail.com', 'Benjamin', 'London', 'SQL Book', 29.99, 1);`;

  // lab: an EMPTY database with foreign keys switched on - every snippet using it builds its own tables.
  var DB_LAB = `PRAGMA foreign_keys = ON;`;

  /* ---------------- snippet helpers ---------------- */
  function lab(code, title) { return { lang: 'sql', db: 'lab', code: code, title: title || 'Self-contained SQL (empty database, ▶ Run it)' }; }
  function shop(code, title) { return { lang: 'sql', db: 'shop', code: code, title: title || 'Runs on the shop database' }; }
  function messy(code, title) { return { lang: 'sql', db: 'messy', code: code, title: title || 'Runs on the messy legacy database' }; }
  function one(k, cls) { var h = {}; h[k] = cls; return h; }
  function copyRows(rows) { return rows.map(function (r) { return r.slice(); }); }
  /* ======================= TOPIC 1: DATA TYPES ======================= */
  topics.push({
    title: 'Data Types: Choosing the Right Box for Every Value',
    analogy: `<p>Think of a kitchen. You keep <b>eggs in an egg tray</b>, <b>milk in a bottle</b>, and <b>rice in a jar</b>. You <i>could</i> throw everything into one big plastic bag — it would "store" fine — but the eggs crack, the milk leaks, and you can never measure the rice. A column's <b>data type</b> is the shape of the container: it decides what fits, how much space it takes, how it sorts, and what maths you can do with it.</p>`,
    explain: `<p>Every column in a table has a <b>data type</b>: a promise about what kind of value lives there. Picking good types is the cheapest bug-prevention you will ever do, because the database checks the promise on <b>every single write</b>, forever, for free.</p>
<h4>The families you will meet in every database</h4>
${H.table(['Family', 'Standard SQL / Postgres / MySQL', 'SQLite', 'Use it for'], [
  ['Whole numbers', '<code>SMALLINT</code>, <code>INTEGER</code>, <code>BIGINT</code>', '<code>INTEGER</code> (up to 8 bytes)', 'ids, counts, quantities, money in cents'],
  ['Exact decimals', '<code>NUMERIC(p,s)</code> / <code>DECIMAL(p,s)</code>', 'no exact decimal → use INTEGER cents', 'money, tax rates, measurements that must add up exactly'],
  ['Approximate decimals', '<code>REAL</code>, <code>DOUBLE PRECISION</code>, <code>FLOAT</code>', '<code>REAL</code> (8-byte float)', 'science, sensor readings, ML scores — ' + H.c('r', 'never money')],
  ['Text', '<code>CHAR(n)</code>, <code>VARCHAR(n)</code>, <code>TEXT</code>', '<code>TEXT</code> (length NOT enforced)', 'names, emails, codes'],
  ['True / false', '<code>BOOLEAN</code>', 'INTEGER 0/1 + CHECK', 'flags like is_active'],
  ['Dates & times', '<code>DATE</code>, <code>TIMESTAMP</code>, <code>TIMESTAMPTZ</code>', 'TEXT in ISO-8601 (<code>2026-10-14 09:30:00</code>)', 'events, deadlines'],
  ['Binary', '<code>BYTEA</code> / <code>BLOB</code>', '<code>BLOB</code>', 'small files, hashes'],
  ['Semi-structured', '<code>JSON</code> / <code>JSONB</code>', 'TEXT + <code>json_valid()</code>', 'flexible extra attributes'],
  ['Identifiers', '<code>UUID</code>', 'TEXT or BLOB(16)', 'ids that are safe to generate anywhere']
])}
<h4>Four rules of thumb</h4>
<ol>
<li><b>Money is never a float.</b> <code>0.1 + 0.2</code> is <code>0.30000000000000004</code> in floating point. Store <b>integer cents</b> (or <code>NUMERIC(12,2)</code> in Postgres).</li>
<li><b>Dates are dates, not "14/10/2026" strings.</b> Use a real date type, or in SQLite the ISO format <code>YYYY-MM-DD</code>, which sorts correctly as text.</li>
<li><b>Pick the smallest type that will always fit</b> — but ids that might pass 2.1 billion should be <code>BIGINT</code> from day one (changing it later rewrites the whole table).</li>
<li><b>A type is a first filter, not the only one.</b> "age must be 0–150" is a <code>CHECK</code> constraint on top of the INTEGER type.</li>
</ol>
<h4>SQLite is different: type affinity</h4>
<p>Most databases reject a value of the wrong type. Classic SQLite does not: a declared type is only a <b>preference</b> called <b>affinity</b>. SQLite will try to convert <code>'42'</code> into the number 42 for an INTEGER column, but if you insert <code>'hello'</code>, it just stores the text. Since SQLite 3.37 you can add the keyword <code>STRICT</code> after the table definition to get the "real database" behaviour: wrong types are rejected.</p>
${H.table(['Value inserted into an INTEGER column', 'normal SQLite table', 'STRICT table'], [
  ['<code>42</code>', H.c('g', 'integer 42'), H.c('g', 'integer 42')],
  ["<code>'42'</code>", H.c('g', 'converted → integer 42'), H.c('g', 'converted → integer 42')],
  ['<code>3.5</code>', H.c('y', 'kept as real 3.5'), H.c('r', 'rejected')],
  ["<code>'hello'</code>", H.c('y', 'kept as text!'), H.c('r', 'rejected')]
])}`,
    clues: [
      '"store prices / balances / invoice totals" → integer cents or <code>NUMERIC(p,s)</code>, never FLOAT',
      '"the value 0.1 + 0.2 doesn\'t add up" → floating-point column storing money',
      '"sorting dates gives the wrong order" → dates stored as non-ISO text',
      '"ids will exceed 2 billion" / "billions of events" → <code>BIGINT</code> (or UUID) from day one',
      '"VARCHAR(10) but SQLite stored 50 characters" → SQLite ignores length; add <code>CHECK(length(col) &lt;= 10)</code>',
      '"what is type affinity?" / "why did SQLite accept text in an INTEGER column?" → affinity vs <code>STRICT</code>',
      '"timestamps from users in many time zones" → store UTC (<code>TIMESTAMPTZ</code> or ISO with Z)'
    ],
    code: [
      lab(`-- A normal SQLite table: declared types are only "affinity" (a preference)
CREATE TABLE loose (n INTEGER, label VARCHAR(5));

INSERT INTO loose VALUES
  (42,      'ok'),                          -- a real integer
  ('42',    'ok'),                          -- text that looks like a number -> converted to 42
  (3.5,     'x'),                           -- a real number stays real
  ('hello', 'this is far longer than 5');   -- text kept as text; VARCHAR(5) NOT enforced!

-- typeof() shows the storage class SQLite actually used for each value
SELECT n, typeof(n) AS stored_as, label, length(label) AS label_len
FROM loose;`, 'Type affinity: SQLite stores what you give it'),
      lab(`-- The same idea done properly: STRICT table + CHECK constraints
CREATE TABLE payments (
  id           INTEGER PRIMARY KEY,
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),      -- money as whole cents
  currency     TEXT    NOT NULL CHECK (length(currency) = 3),  -- 'INR', 'USD', 'EUR'
  paid_at      TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),  -- ISO-8601 UTC
  is_refunded  INTEGER NOT NULL DEFAULT 0 CHECK (is_refunded IN (0, 1)),       -- boolean
  meta         TEXT    CHECK (meta IS NULL OR json_valid(meta))                 -- JSON text
) STRICT;

INSERT INTO payments (amount_cents, currency, meta) VALUES (129900, 'INR', '{"method":"upi"}');
INSERT INTO payments (amount_cents, currency) VALUES ('2500', 'USD');  -- '2500' converts losslessly -> OK
-- INSERT INTO payments (amount_cents, currency) VALUES ('lots', 'USD');
--   ^ uncomment: "cannot store TEXT value in INTEGER column payments.amount_cents"

SELECT id, amount_cents, typeof(amount_cents) AS t,
       printf('%.2f', amount_cents / 100.0) AS display_amount,
       currency, is_refunded, json_extract(meta, '$.method') AS method
FROM payments;`, 'STRICT table with good types (runnable)')
    ],
    codeTitle: ['Type affinity in action', 'A well-typed payments table'],
    viz: {
      title: 'Same values, two tables: normal (affinity) vs STRICT',
      input: "42 | '42' | 3.0 | 3.5 | 'hello' | NULL | '2026-10-14'",
      inputLabel: "Values separated by | (wrap text in 'single quotes', NULL allowed)",
      gen: function (input) {
        var toks = String(input === undefined || input === null ? '' : input).split('|').map(function (s) { return s.trim(); }).filter(function (s) { return s.length; });
        if (!toks.length) throw new Error("Type some values separated by |, e.g. 42 | '42' | 3.5 | 'hello' | NULL");
        if (toks.length > 10) throw new Error('Use at most 10 values so every step fits on screen');
        var numRe = /^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/;
        var vals = toks.map(function (t) {
          if (/^null$/i.test(t)) return { raw: 'NULL', kind: 'null' };
          var m = t.match(/^'(.*)'$/);
          if (m) return { raw: t, kind: 'text', v: m[1] };
          if (numRe.test(t)) { var n = Number(t); return { raw: t, kind: /^[+-]?\d+$/.test(t) ? 'integer' : 'real', v: n }; }
          throw new Error('Could not read "' + t + "\". Numbers like 42 or 3.5, text in single quotes like 'hi', or NULL");
        });
        function loose(x) {
          if (x.kind === 'null') return { show: 'NULL', type: 'null', note: 'NULL fits anywhere (no NOT NULL here)' };
          if (x.kind === 'integer') return { show: String(x.v), type: 'integer', note: 'already an integer' };
          if (x.kind === 'real') return Number.isInteger(x.v) ? { show: String(x.v), type: 'integer', note: 'real with no fraction → converted to integer' } : { show: String(x.v), type: 'real', note: 'has a fraction → kept as REAL (no error!)' };
          if (numRe.test(x.v.trim())) { var n = Number(x.v); return Number.isInteger(n) ? { show: String(n), type: 'integer', note: 'text looks like a whole number → converted' } : { show: String(n), type: 'real', note: 'text looks like a decimal → converted to REAL' }; }
          return { show: "'" + x.v + "'", type: 'text', note: 'cannot be a number → silently stored as TEXT' };
        }
        function strict(x) {
          if (x.kind === 'null') return { ok: true, show: 'NULL', note: 'NULL allowed (column is nullable)' };
          if (x.kind === 'integer') return { ok: true, show: String(x.v), note: 'integer → accepted' };
          if (x.kind === 'real') return Number.isInteger(x.v) ? { ok: true, show: String(x.v), note: 'converts losslessly → accepted' } : { ok: false, note: 'cannot store REAL value in INTEGER column' };
          if (numRe.test(x.v.trim()) && Number.isInteger(Number(x.v))) return { ok: true, show: String(Number(x.v)), note: 'text converts losslessly → accepted' };
          return { ok: false, note: 'cannot store TEXT value in INTEGER column' };
        }
        var L = [], S = [], frames = [], acc = 0, rej = 0, surprises = 0;
        var ddl = 'CREATE TABLE loose (n INTEGER);\nCREATE TABLE strict_t (n INTEGER) STRICT;\nINSERT INTO loose VALUES (?);\nINSERT INTO strict_t VALUES (?);';
        frames.push({ narr: 'Two tables, both with one column declared <b>INTEGER</b>. The left one is a normal SQLite table (type <b>affinity</b> = a preference). The right one is <b>STRICT</b> (types are rules). We will push the same values into both.', parts: [
          { type: 'code', label: 'DDL', lang: 'sql', code: ddl, hl: { 1: 'cur', 2: 'cur' } },
          { type: 'table', label: 'loose (affinity)', columns: ['inserted', 'stored', 'typeof()'], rows: [] },
          { type: 'table', label: 'strict_t (STRICT)', columns: ['inserted', 'result'], rows: [] }
        ] });
        vals.forEach(function (x) {
          var a = loose(x), b = strict(x);
          L.push([x.raw, a.show, a.type]);
          S.push([x.raw, b.ok ? '✔ ' + b.show : '✗ ' + b.note]);
          if (b.ok) acc++; else rej++;
          if (a.type === 'text' || a.type === 'real') surprises++;
          var lh = {}, sh = {};
          lh[L.length - 1] = a.type === 'integer' || a.type === 'null' ? 'ok' : 'cur';
          sh[S.length - 1] = b.ok ? 'ok' : 'bad';
          frames.push({ narr: 'Insert <code>' + H.esc(x.raw) + '</code>. <b>Normal table:</b> ' + a.note + '. <b>STRICT table:</b> ' + (b.ok ? '<span class="c-g">' + b.note + '</span>' : '<span class="c-r">ERROR — ' + b.note + '</span>, the row never lands') + '.', parts: [
            { type: 'code', label: 'statement', lang: 'sql', code: 'INSERT INTO loose    VALUES (' + x.raw + ');\nINSERT INTO strict_t VALUES (' + x.raw + ');', hl: { 1: 'ok', 2: b.ok ? 'ok' : 'bad' } },
            { type: 'table', label: 'loose (affinity)', columns: ['inserted', 'stored', 'typeof()'], rows: copyRows(L), hl: lh },
            { type: 'table', label: 'strict_t (STRICT)', columns: ['inserted', 'result'], rows: copyRows(S), hl: sh },
            { type: 'vars', label: 'scoreboard', vals: { 'strict accepted': acc, 'strict rejected': rej, 'loose surprises': surprises }, hl: b.ok ? {} : { 'strict rejected': 'bad' } }
          ] });
        });
        frames.push({ narr: 'Done. The normal table accepted <b>everything</b> — ' + surprises + ' value(s) are now not integers even though the column "is" INTEGER. That is how bad data sneaks in. The STRICT table rejected ' + rej + ' bad value(s) at the door. In Postgres/MySQL every table behaves like the STRICT one.', parts: [
          { type: 'table', label: 'loose (affinity)', columns: ['inserted', 'stored', 'typeof()'], rows: copyRows(L) },
          { type: 'table', label: 'strict_t (STRICT)', columns: ['inserted', 'result'], rows: copyRows(S) },
          { type: 'text', html: '<b>Lesson:</b> in SQLite add <code>STRICT</code> (or CHECK(typeof(n) = \'integer\')) when correctness matters.' }
        ] });
        return frames;
      }
    },
    examples: [
      { title: 'Why money must not be a float', html: `<p>Floating point stores numbers in binary, and 0.1 has no exact binary form — like 1/3 has no exact decimal form (0.3333…). Tiny errors appear and add up across millions of rows. Integer cents never drift: 10 + 20 is exactly 30.</p>
${H.table(['expression', 'result', 'verdict'], [['0.1 + 0.2 = 0.3', '0 (false!)', H.c('r', 'float')], ['10 + 20 = 30', '1 (true)', H.c('g', 'integer cents')]])}`,
        code: lab(`SELECT 0.1 + 0.2              AS float_sum,
       (0.1 + 0.2 = 0.3)      AS float_equal,   -- 0 = false
       (10 + 20 = 30)         AS cents_equal,   -- 1 = true
       printf('%.2f', (10 + 20) / 100.0) AS shown_to_user;`) },
      { title: 'Dates: ISO text sorts correctly, "DD/MM/YYYY" does not', html: `<p>Text is compared character by character. <code>'2026-01-05'</code> &lt; <code>'2026-10-01'</code> works because the biggest unit (year) comes first. But <code>'05/01/2026'</code> vs <code>'01/10/2026'</code> compares the <i>day</i> first, so January can land after October. SQLite's date functions (<code>date()</code>, <code>julianday()</code>) also only understand ISO format.</p>`,
        code: lab(`CREATE TABLE events (name TEXT, iso_day TEXT, uk_day TEXT);
INSERT INTO events VALUES ('launch', '2026-01-05', '05/01/2026'), ('review', '2026-10-01', '01/10/2026');
SELECT name, iso_day, uk_day FROM events ORDER BY uk_day;   -- WRONG order: review first
SELECT name, iso_day, date(iso_day, '+30 days') AS due FROM events ORDER BY iso_day;  -- correct`) },
      { title: 'VARCHAR(n) is only a hint in SQLite — enforce length with CHECK', html: `<p>In Postgres <code>VARCHAR(3)</code> rejects <code>'ABCD'</code>. SQLite stores it happily. If length matters (country code, PIN), say it with a CHECK that every database understands.</p>`,
        code: lab(`CREATE TABLE countries (
  code TEXT PRIMARY KEY CHECK (length(code) = 2 AND code = upper(code)),
  name TEXT NOT NULL
);
INSERT INTO countries VALUES ('IN', 'India'), ('GB', 'United Kingdom');
INSERT OR IGNORE INTO countries VALUES ('india', 'bad code');   -- CHECK fails -> row skipped
SELECT * FROM countries;`) },
      { title: 'Booleans in SQLite: 0/1 with a CHECK', html: `<p>SQLite has no BOOLEAN storage class. <code>TRUE</code> and <code>FALSE</code> are just aliases for 1 and 0. Without a CHECK, someone will insert <code>2</code> or <code>'yes'</code>. Add <code>CHECK (flag IN (0,1))</code> and the column behaves like a real boolean.</p>`,
        code: lab(`CREATE TABLE features (name TEXT PRIMARY KEY, enabled INTEGER NOT NULL DEFAULT 0 CHECK (enabled IN (0, 1)));
INSERT INTO features VALUES ('dark_mode', TRUE), ('beta_search', FALSE);
INSERT OR IGNORE INTO features VALUES ('weird', 'yes');  -- rejected by CHECK
SELECT name, enabled, CASE enabled WHEN 1 THEN 'on' ELSE 'off' END AS label FROM features;`) }
    ],
    deepDive: `<h4>Storage size and why it matters at scale</h4>
<p>A <code>BIGINT</code> is 8 bytes, an <code>INTEGER</code> 4 bytes (Postgres/MySQL). On 1 billion rows that is 4 GB of difference <b>per column, per index that contains it</b>. Smaller rows mean more rows per 8 KB page, so more of the table fits in RAM and scans are faster. But ids are the exception: running out of a 32-bit id (2,147,483,647) is a famous outage cause, and changing a primary key type later rewrites the table and every foreign key that points at it. Use BIGINT (or UUID) for ids of anything that grows.</p>
<h4>Exact decimals</h4>
<p><code>NUMERIC(12,2)</code> = up to 12 digits, 2 after the point, stored exactly. Arithmetic is slower than integers but correct. Rounding rules (banker's rounding vs half-up) differ between databases — another reason many payment systems store <b>minor units</b> (cents, paise) as BIGINT and keep the currency in a separate column, because currencies have different minor units (JPY has 0, BHD has 3).</p>
<h4>Text and collation</h4>
<p>Comparing text depends on <b>collation</b> (the sorting/equality rules). <code>'ben@mail.com' = 'BEN@mail.com'</code> is false under the default binary collation. In SQLite you can declare <code>email TEXT COLLATE NOCASE</code>; in Postgres use the <code>citext</code> extension or a unique index on <code>lower(email)</code>. <code>CHAR(n)</code> pads with spaces — almost never what you want; prefer <code>VARCHAR</code>/<code>TEXT</code>. In Postgres <code>TEXT</code> and <code>VARCHAR(n)</code> perform the same; the n is only a check.</p>
<h4>Time</h4>
<p><code>TIMESTAMP</code> (without time zone) stores a wall-clock reading; <code>TIMESTAMPTZ</code> stores an absolute instant (converted to UTC). For events, store the instant in UTC and convert on display. For "the shop opens at 09:00 local time", store the local time plus the zone name (<code>Asia/Kolkata</code>), because offsets change with daylight saving.</p>
<h4>SQLite affinity rules (how the declared name maps)</h4>
<p>Contains "INT" → INTEGER affinity; contains "CHAR", "CLOB" or "TEXT" → TEXT; contains "BLOB" or no type → BLOB; contains "REAL", "FLOA" or "DOUB" → REAL; anything else (e.g. <code>DECIMAL</code>, <code>BOOLEAN</code>, <code>DATE</code>) → NUMERIC. So <code>VARCHAR(255)</code> is TEXT affinity and the 255 is ignored. STRICT tables only accept <code>INT, INTEGER, REAL, TEXT, BLOB, ANY</code>.</p>
<h4>JSON columns — power and danger</h4>
<p>JSON is great for genuinely variable attributes (product specs that differ per category). It is a trap when used to avoid design: you lose types, foreign keys and easy indexing. Rule: anything you filter, join or enforce rules on deserves a real column.</p>`,
    aiEra: `<p><b>What AI changes:</b> an assistant will happily generate a 20-column <code>CREATE TABLE</code> in seconds, and it usually picks <i>plausible</i> types. The weak spots are exactly the ones in this topic: it often reaches for <code>FLOAT</code>/<code>DECIMAL</code> without thinking about currency minor units, writes <code>VARCHAR(255)</code> everywhere out of habit, uses <code>TIMESTAMP</code> instead of <code>TIMESTAMPTZ</code>, and forgets that SQLite ignores lengths unless the table is STRICT.</p>
<p><b>Use AI as a partner:</b> ask <code>"Review these column types for a payments table in Postgres 16. For each column, say what could go wrong at 1 billion rows and with users in 40 countries."</code> — a review prompt gets better answers than a "write it" prompt. Ask it to generate edge-case INSERTs (<code>'1e3'</code>, negative zero, leap-day dates, emoji names) to test your types.</p>
<p><b>Where AI goes wrong:</b> it mixes dialects (Postgres <code>SERIAL</code> in a SQLite script, MySQL <code>TINYINT(1)</code> in Postgres), and it rarely mentions the cost of changing a type later. <b>What you must still own:</b> knowing the data's real range and growth, the money/time rules for your business, and running the DDL against the actual engine you deploy on.</p>`,
    problems: [{
      title: 'Choose Types for a Payments Table',
      level: 'Easy', tags: ['data types', 'money', 'STRICT'], companies: ['Stripe', 'Razorpay', 'Amazon'],
      statement: `<p>A payments service must store: a payment id, the amount (rupees and paise, e.g. ₹1,299.50), a 3-letter currency code, when it was paid (users in many countries), and whether it was refunded. Write a SQLite <code>CREATE TABLE</code> with sensible types and constraints, insert three payments, and show the total paid per currency in a human-readable format.</p>`,
      constraints: `<ul><li>Totals must be exact to the paisa/cent.</li><li>MAX(amount) must return the numerically biggest payment.</li><li>Currency is always exactly 3 upper-case letters.</li></ul>`,
      example: `<p>Payments: ₹1299.50 INR, ₹10.00 INR, $9.99 USD → ${H.table(['currency', 'total'], [['INR', H.c('g', '1309.50')], ['USD', H.c('g', '9.99')]])}<p>Stored as cents: 129950 + 1000 = 130950 → displayed 1309.50. No rounding drift is possible because integers add exactly.</p>`,
      brute: {
        why: `<p>The "just make everything TEXT" schema. It stores anything — and that is the problem. Text compares <b>character by character</b>, so <code>MAX(amount)</code> returns <code>'9.99'</code> (because '9' &gt; '1'), totals are computed by converting text to floats on the fly, and nothing stops <code>'abc'</code> or <code>'rupees'</code> being stored as a currency.</p>`,
        code: lab(`-- Poor schema: no real types, no rules
CREATE TABLE payments_bad (id TEXT, amount TEXT, currency TEXT, paid_at TEXT, refunded TEXT);
INSERT INTO payments_bad VALUES
  ('p1', '1299.50', 'INR', '14/10/2026', 'no'),
  ('p2', '10.00',   'inr', '2026-10-14', 'false'),
  ('p3', '9.99',    'USD', 'yesterday',  '0');
SELECT MAX(amount) AS biggest_payment FROM payments_bad;          -- '9.99'  (text comparison!)
SELECT currency, SUM(amount) AS total FROM payments_bad GROUP BY currency;  -- 'INR' and 'inr' split, float sums`)
      },
      mcq: { q: 'Which type is the safest choice for the amount column?', options: ['REAL (floating point)', 'INTEGER number of minor units (paise/cents)', 'TEXT like "1299.50"', 'VARCHAR(10)'], answer: 1, explain: 'Integers add exactly and compare numerically; floats drift and text compares character by character.' },
      hints: [
        '<p>Hint 1: Money problems are rounding problems. Which number type never rounds when you add?</p>',
        '<p>Hint 2: Store <code>amount_cents INTEGER</code> and a separate <code>currency TEXT</code>. Dates as ISO-8601 UTC text. Refunded as 0/1. Make the table <code>STRICT</code>.</p>',
        '<p>Hint 3: Add CHECKs: amount_cents &gt; 0, currency = upper(currency) AND length 3, is_refunded IN (0,1). Display with <code>printf(\'%.2f\', SUM(amount_cents) / 100.0)</code> — divide only at the very end, for display.</p>'
      ],
      solution: {
        approach: `<p>Use INTEGER minor units for money, TEXT ISO-8601 UTC for time, 0/1 INTEGER for the flag, and lock it all down with <code>STRICT</code> + CHECK constraints. Only convert to a decimal string in the final SELECT, for humans.</p>`,
        code: lab(`CREATE TABLE payments (
  id           INTEGER PRIMARY KEY,
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  currency     TEXT    NOT NULL CHECK (length(currency) = 3 AND currency = upper(currency)),
  paid_at      TEXT    NOT NULL CHECK (paid_at LIKE '____-__-__T__:__:__Z'),  -- ISO-8601 UTC
  is_refunded  INTEGER NOT NULL DEFAULT 0 CHECK (is_refunded IN (0, 1))
) STRICT;

INSERT INTO payments (amount_cents, currency, paid_at) VALUES
  (129950, 'INR', '2026-10-14T04:00:00Z'),
  (1000,   'INR', '2026-10-14T05:30:00Z'),
  (999,    'USD', '2026-10-13T22:10:00Z');

SELECT currency,
       SUM(amount_cents)                           AS total_cents,   -- exact
       printf('%.2f', SUM(amount_cents) / 100.0)   AS total_display, -- only for humans
       MAX(amount_cents)                           AS biggest_cents  -- numeric comparison
FROM payments
WHERE is_refunded = 0
GROUP BY currency
ORDER BY currency;`),
        complexity: `<p>Same O(N) aggregation as the bad version, but every row is validated once on write (O(1) per row) and every later read is correct. Storage: 8-byte integers instead of variable text.</p>`,
        followUps: ['How would you support JPY (no minor unit) and BHD (3 decimals)? (store a minor-unit exponent per currency)', 'How would you store partial refunds? (a separate refunds table, 1-N)']
      }
    }]
  });
  registerModule({
    id: 'sql07',
    title: 'DDL, Constraints & ER Modelling',
    lang: 'sql',
    intro: `<p>So far you have <i>read</i> data with SELECT. This module is about <b>designing the containers</b> the data lives in — and making the database itself refuse bad data. You will learn to pick data types, write <code>CREATE</code> / <code>ALTER</code> / <code>DROP</code> statements, guard every table with constraints (<code>PRIMARY KEY</code>, <code>FOREIGN KEY</code>, <code>UNIQUE</code>, <code>CHECK</code>, <code>NOT NULL</code>, <code>DEFAULT</code>), decide what happens to child rows when a parent is deleted (<code>CASCADE</code>, <code>SET NULL</code>, <code>RESTRICT</code>), draw ER diagrams, and turn a page of business requirements into a real e-commerce schema.</p>
<p>Why it matters: application code changes every week, but a schema lives for years. Interviewers love schema-design rounds ("design the tables for Instagram / a library / Uber Eats") because they reveal whether you think about <b>data integrity</b>, <b>relationships</b> and <b>future change</b>. Every snippet runs in SQLite right in your browser — note that SQLite only enforces foreign keys after <code>PRAGMA foreign_keys = ON;</code>, a classic gotcha.</p>`,
    goals: [
      'Choose correct column types (money as integer cents, ISO dates, BIGINT ids) and explain SQLite type affinity vs <code>STRICT</code> tables',
      'Write and evolve schemas with <code>CREATE</code>, <code>ALTER</code> and <code>DROP</code>, including safe "expand → backfill → contract" migrations',
      'Use every constraint (PK, FK, UNIQUE, CHECK, NOT NULL, DEFAULT) and predict exactly which INSERTs a table will reject',
      'Pick the right <code>ON DELETE</code> / <code>ON UPDATE</code> action and predict the rows left after a cascading delete',
      'Draw an ER diagram with cardinalities and map it to tables (1-1, 1-N, M-N junction tables, self-references)',
      'Design a complete e-commerce schema from written requirements and defend every decision in an interview'
    ],
    prereqs: `<p>SQL 1 (Relational Model: tables, keys, relationships), SQL 2–4 (SELECT, GROUP BY, JOINs) — you should be comfortable reading <code>JOIN</code> and <code>GROUP BY</code> queries. SQL 5 (Subqueries) helps for the validation queries.</p>`,
    hours: 11,
    databases: { shop: DB_SHOP, messy: DB_MESSY, lab: DB_LAB },
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
