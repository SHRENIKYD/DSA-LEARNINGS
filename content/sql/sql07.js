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
  /* ======================= TOPIC 2: CREATE / ALTER / DROP ======================= */
  topics.push({
    title: 'CREATE, ALTER & DROP: Building and Changing the Shape of Data',
    analogy: `<p>A table is like a <b>printed form</b> at a bank. <b>CREATE</b> designs a new form (which boxes, which are mandatory). <b>ALTER</b> reprints the form with a new box or a renamed one — easy if you add an optional box, painful if you suddenly make a box mandatory when thousands of old forms already left it empty. <b>DROP</b> shreds the form design <i>and</i> every filled-in copy. You redesign forms carefully because customers already filled the old ones in.</p>`,
    explain: `<p><b>DDL</b> (Data Definition Language) is the part of SQL that changes the <b>structure</b> — tables, columns, indexes, views — rather than the rows. The three verbs:</p>
${H.table(['Statement', 'What it does', 'Typical use'], [
  ['<code>CREATE TABLE t (...)</code>', 'makes a new, empty table with columns + constraints', 'first version of a schema, new feature'],
  ['<code>CREATE TABLE IF NOT EXISTS</code>', 'does nothing if the table is already there', 'idempotent setup scripts'],
  ['<code>CREATE TABLE t2 AS SELECT ...</code>', 'copies the <b>data</b> of a query — ' + H.c('r', 'but not the constraints'), 'quick backups, reports'],
  ['<code>ALTER TABLE t ADD COLUMN c ...</code>', 'adds a column; old rows get its DEFAULT (or NULL)', 'new attribute'],
  ['<code>ALTER TABLE t RENAME COLUMN a TO b</code>', 'renames; SQLite also fixes indexes/views/triggers that mention it', 'better names'],
  ['<code>ALTER TABLE t RENAME TO t2</code>', 'renames the table', 'refactors, table rebuilds'],
  ['<code>ALTER TABLE t DROP COLUMN c</code>', 'removes a column and its data', 'cleanup'],
  ['<code>DROP TABLE [IF EXISTS] t</code>', 'removes the table structure <b>and</b> every row', 'retiring a feature']
])}
<h4>Anatomy of CREATE TABLE</h4>
<pre>CREATE TABLE customers (
  id    INTEGER PRIMARY KEY,                -- column name, type, column constraint
  email TEXT NOT NULL,
  name  TEXT NOT NULL DEFAULT 'Anonymous',
  CONSTRAINT uq_customers_email UNIQUE (email)   -- table constraint (can span columns)
);</pre>
<p>Column constraints sit next to one column. Table constraints sit at the end and can cover several columns (<code>PRIMARY KEY (order_id, product_id)</code>). Naming them (<code>CONSTRAINT uq_...</code>) gives you readable error messages and lets you drop them later in Postgres/MySQL.</p>
<h4>What SQLite's ALTER TABLE can and cannot do</h4>
${H.table(['Change', 'SQLite', 'Postgres / MySQL'], [
  ['add a nullable column', H.c('g', 'yes, instant'), H.c('g', 'yes, instant')],
  ['add NOT NULL column', H.c('y', 'only with a non-NULL DEFAULT'), H.c('y', 'needs DEFAULT (PG 11+: instant)')],
  ['add UNIQUE / PRIMARY KEY column', H.c('r', 'no'), H.c('g', 'yes (builds an index)')],
  ['change a column type / add CHECK later', H.c('r', 'no → rebuild table'), H.c('g', 'ALTER COLUMN / ADD CONSTRAINT')],
  ['drop a column', H.c('y', 'yes, unless PK / UNIQUE / indexed / FK / used by view'), H.c('g', 'yes')]
])}
<p>When SQLite cannot alter something, you use the official <b>table rebuild</b>: create a new table with the right shape, copy the rows, drop the old one, rename the new one — inside one transaction.</p>
<h4>DROP vs DELETE vs TRUNCATE</h4>
<p><code>DELETE FROM t</code> removes rows (can have WHERE, fires triggers, keeps the table). <code>TRUNCATE t</code> (Postgres/MySQL) empties the whole table fast. <code>DROP TABLE t</code> removes rows <b>and</b> the table definition. In SQLite there is no TRUNCATE; <code>DELETE FROM t</code> without WHERE is optimised to do the same job.</p>`,
    clues: [
      '"add a required column to a table with millions of rows" → expand (nullable) → backfill → contract (NOT NULL)',
      '"zero-downtime migration" / "deploy without locking the table" → small, backward-compatible DDL steps',
      '"rename a column without breaking the app" → add new + dual-write + switch reads + drop old',
      '"SQLite can\'t ALTER this" → 12-step table rebuild inside a transaction',
      '"backup table lost its primary key" → <code>CREATE TABLE AS SELECT</code> copies data, not constraints',
      '"difference between DROP, DELETE and TRUNCATE" → structure vs rows vs fast-empty',
      '"migration failed half-way" → transactional DDL (Postgres/SQLite) vs implicit commits (MySQL)'
    ],
    code: [
      lab(`-- Version 1 of the schema
CREATE TABLE IF NOT EXISTS customers (
  id    INTEGER PRIMARY KEY,
  name  TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE
);
INSERT INTO customers (name, email) VALUES ('Asha', 'asha@mail.com'), ('Ben', 'ben@mail.com');

-- Version 2: evolve it step by step
ALTER TABLE customers ADD COLUMN country TEXT NOT NULL DEFAULT 'IN';  -- old rows get 'IN'
ALTER TABLE customers RENAME COLUMN name TO full_name;
ALTER TABLE customers ADD COLUMN phone TEXT;                          -- nullable: old rows get NULL
ALTER TABLE customers DROP COLUMN phone;                              -- changed our mind

SELECT * FROM customers;

-- Inspect the current shape (works like DESCRIBE in MySQL / \\d in psql)
SELECT name, type, "notnull" AS not_null, dflt_value, pk
FROM pragma_table_info('customers');`, 'Create, then evolve, then inspect'),
      lab(`-- The SQLite "table rebuild": change what ALTER cannot (here: price REAL -> INTEGER cents + CHECK)
CREATE TABLE products (id INTEGER PRIMARY KEY, name TEXT, price REAL);
INSERT INTO products VALUES (1, 'Cable', 9.99), (2, 'Phone', 499.00);

PRAGMA foreign_keys = OFF;          -- must be outside a transaction
BEGIN;
CREATE TABLE products_new (
  id          INTEGER PRIMARY KEY,
  name        TEXT    NOT NULL,
  price_cents INTEGER NOT NULL CHECK (price_cents > 0)
);
INSERT INTO products_new (id, name, price_cents)
  SELECT id, name, CAST(ROUND(price * 100) AS INTEGER) FROM products;
DROP TABLE products;
ALTER TABLE products_new RENAME TO products;
PRAGMA foreign_key_check;           -- should return no rows
COMMIT;
PRAGMA foreign_keys = ON;

SELECT * FROM products;
SELECT sql FROM sqlite_master WHERE name = 'products';`, 'Rebuild a table to change a column type')
    ],
    codeTitle: ['CREATE / ALTER walkthrough', 'The table-rebuild recipe'],
    viz: {
      title: 'Schema evolution: run your own ALTER TABLE migrations',
      input: "ADD country TEXT NOT NULL DEFAULT 'IN'; ADD phone TEXT; RENAME name TO full_name; ADD tier TEXT NOT NULL; DROP email; DROP phone",
      inputLabel: "Commands separated by ; — ADD col TYPE [NOT NULL] [DEFAULT v] [UNIQUE] · RENAME a TO b · DROP col",
      gen: function (input) {
        var cmds = String(input === undefined || input === null ? '' : input).split(';').map(function (s) { return s.trim(); }).filter(function (s) { return s.length; });
        if (!cmds.length) throw new Error("Type commands like: ADD phone TEXT; RENAME name TO full_name; DROP phone");
        if (cmds.length > 10) throw new Error('Use at most 10 commands');
        var cols = [
          { name: 'id', type: 'INTEGER', cons: 'PRIMARY KEY', pk: true },
          { name: 'name', type: 'TEXT', cons: 'NOT NULL' },
          { name: 'email', type: 'TEXT', cons: 'NOT NULL UNIQUE', uq: true }
        ];
        var rows = [[1, 'Asha', 'asha@mail.com'], [2, 'Ben', 'ben@mail.com']];
        var ident = /^[A-Za-z_]\w*$/;
        function schemaRows() { return cols.map(function (c) { return [c.name, c.type, c.cons || '—']; }); }
        function find(n) { for (var i = 0; i < cols.length; i++) if (cols[i].name.toLowerCase() === String(n).toLowerCase()) return i; return -1; }
        function snap(narr, stmt, ok, schemaHl, dataHl) {
          return { narr: narr, parts: [
            { type: 'code', label: 'migration statement', lang: 'sql', code: stmt, hl: { 1: ok ? 'ok' : 'bad' } },
            { type: 'table', label: 'schema of customers', columns: ['column', 'type', 'constraints'], rows: schemaRows(), hl: schemaHl || {} },
            { type: 'table', label: 'rows in customers', columns: cols.map(function (c) { return c.name; }), rows: copyRows(rows).map(function (r) { return r.map(function (v) { return v === null ? 'NULL' : v; }); }), hl: dataHl || {} }
          ] };
        }
        var frames = [snap('Starting point: <b>customers</b> already holds 2 real rows. Every change must keep those rows valid — that is what makes migrations harder than the first CREATE.', 'CREATE TABLE customers (\n  id INTEGER PRIMARY KEY,\n  name TEXT NOT NULL,\n  email TEXT NOT NULL UNIQUE\n);', true)];
        cmds.forEach(function (cmd) {
          var w = cmd.split(/\s+/), verb = w[0].toUpperCase(), m, i;
          if (verb === 'ADD') {
            var name = w[1], type = (w[2] || '').toUpperCase();
            if (!name || !ident.test(name) || !/^[A-Z]+$/.test(type)) throw new Error('ADD needs a name and a type, e.g. ADD phone TEXT');
            var rest = w.slice(3).join(' ');
            var nn = /NOT\s+NULL/i.test(rest), uq = /UNIQUE/i.test(rest), pk = /PRIMARY\s+KEY/i.test(rest);
            var dm = rest.match(/DEFAULT\s+('[^']*'|[^\s]+)/i), def = dm ? dm[1] : null;
            var stmt = 'ALTER TABLE customers ADD COLUMN ' + name + ' ' + type + (rest ? ' ' + rest : '') + ';';
            if (find(name) >= 0) { frames.push(snap('<span class="c-r">Error: duplicate column name "' + H.esc(name) + '".</span> Nothing changed.', stmt, false)); return; }
            if (pk || uq) { frames.push(snap('<span class="c-r">Error: Cannot add a ' + (pk ? 'PRIMARY KEY' : 'UNIQUE') + ' column.</span> SQLite would have to check uniqueness of existing rows in one go; it refuses. Fix: add the column plain, fill it, then <code>CREATE UNIQUE INDEX</code>.', stmt, false)); return; }
            if (nn && (def === null || /^null$/i.test(def))) { frames.push(snap('<span class="c-r">Error: Cannot add a NOT NULL column with default value NULL.</span> The 2 existing rows would instantly break the rule. Fix: give a DEFAULT, or add it nullable → backfill → tighten (expand/contract).', stmt, false)); return; }
            var v = def === null ? null : (/^'.*'$/.test(def) ? def.slice(1, -1) : (isNaN(Number(def)) ? def : Number(def)));
            cols.push({ name: name, type: type, cons: (nn ? 'NOT NULL' : '') + (def !== null ? (nn ? ' ' : '') + 'DEFAULT ' + def : '') });
            rows.forEach(function (r) { r.push(v); });
            frames.push(snap('Added <b>' + H.esc(name) + '</b>. Existing rows got ' + (v === null ? '<b>NULL</b> (no default)' : 'the DEFAULT <b>' + H.esc(String(v)) + '</b>') + '. This is a metadata-only change in SQLite and modern Postgres — instant even on huge tables.', stmt, true, one(cols.length - 1, 'ok'), {}));
          } else if (verb === 'RENAME') {
            m = cmd.match(/^RENAME\s+(\w+)\s+TO\s+(\w+)$/i);
            if (!m) throw new Error('RENAME format: RENAME old_name TO new_name');
            var st = 'ALTER TABLE customers RENAME COLUMN ' + m[1] + ' TO ' + m[2] + ';';
            i = find(m[1]);
            if (i < 0) { frames.push(snap('<span class="c-r">Error: no such column "' + H.esc(m[1]) + '".</span>', st, false)); return; }
            if (find(m[2]) >= 0) { frames.push(snap('<span class="c-r">Error: duplicate column name "' + H.esc(m[2]) + '".</span>', st, false)); return; }
            cols[i].name = m[2];
            frames.push(snap('Renamed <b>' + H.esc(m[1]) + '</b> → <b>' + H.esc(m[2]) + '</b>. Data untouched. SQLite rewrites indexes/views/triggers that mention it — but your <b>application code</b> still says <code>' + H.esc(m[1]) + '</code>, so in production you deploy code that handles both names first.', st, true, one(i, 'cur')));
          } else if (verb === 'DROP') {
            var cn = w[1];
            if (!cn || !ident.test(cn)) throw new Error('DROP format: DROP column_name');
            var sd = 'ALTER TABLE customers DROP COLUMN ' + cn + ';';
            i = find(cn);
            if (i < 0) { frames.push(snap('<span class="c-r">Error: no such column "' + H.esc(cn) + '".</span>', sd, false)); return; }
            if (cols[i].pk || cols[i].uq) { frames.push(snap('<span class="c-r">Error: cannot drop ' + (cols[i].pk ? 'PRIMARY KEY' : 'UNIQUE') + ' column "' + H.esc(cn) + '".</span> SQLite refuses to drop a column that a key/index depends on. You would need the table rebuild recipe.', sd, false, one(i, 'bad'))); return; }
            var before = schemaRows(), hlb = one(i, 'bad');
            frames.push({ narr: 'Dropping <b>' + H.esc(cn) + '</b>: the column and <b>all its values</b> are about to be deleted. There is no undo outside a transaction/backup.', parts: [
              { type: 'code', label: 'migration statement', lang: 'sql', code: sd, hl: { 1: 'cur' } },
              { type: 'table', label: 'schema of customers', columns: ['column', 'type', 'constraints'], rows: before, hl: hlb }
            ] });
            cols.splice(i, 1);
            rows.forEach(function (r) { r.splice(i, 1); });
            frames.push(snap('Column <b>' + H.esc(cn) + '</b> is gone. Any old code still selecting it will now fail — another reason to remove usages from the app <i>before</i> the DROP.', sd, true));
          } else throw new Error('Unknown command "' + w[0] + '". Use ADD, RENAME or DROP.');
        });
        frames.push({ narr: 'Final shape. Compare: <code>DELETE FROM customers</code> would empty the rows but keep this schema; <code>DROP TABLE customers</code> would remove both the schema and the rows.', parts: [
          { type: 'table', label: 'final schema', columns: ['column', 'type', 'constraints'], rows: schemaRows() },
          { type: 'table', label: 'final rows', columns: cols.map(function (c) { return c.name; }), rows: copyRows(rows).map(function (r) { return r.map(function (v) { return v === null ? 'NULL' : v; }); }) },
          { type: 'text', html: 'Rules seen: ADD NOT NULL needs a DEFAULT · no ADD UNIQUE/PK columns · cannot DROP key columns · RENAME keeps data.' }
        ] });
        return frames;
      }
    },
    examples: [
      { title: 'CREATE TABLE AS SELECT copies data, not rules', html: `<p>A "quick backup" made with <code>CREATE TABLE ... AS SELECT</code> has no PRIMARY KEY, no NOT NULL, no UNIQUE. Look at the stored SQL: plain columns only. If you later restore from it, duplicates and NULLs can creep in. For a real copy, write the CREATE TABLE yourself and then <code>INSERT INTO ... SELECT</code>.</p>`,
        code: lab(`CREATE TABLE users (id INTEGER PRIMARY KEY, email TEXT NOT NULL UNIQUE);
INSERT INTO users (email) VALUES ('a@x.com'), ('b@x.com');
CREATE TABLE users_backup AS SELECT * FROM users;
INSERT INTO users_backup VALUES (1, NULL);   -- duplicate id AND null email: accepted!
SELECT name, sql FROM sqlite_master WHERE name IN ('users', 'users_backup');`) },
      { title: 'DDL inside a transaction can be rolled back (SQLite & Postgres)', html: `<p>In SQLite and Postgres, CREATE/ALTER/DROP are transactional: if step 3 of a migration fails you can ROLLBACK and the schema is untouched. MySQL is different — most DDL causes an <b>implicit commit</b>, so a half-applied migration stays half-applied. That is why MySQL teams keep each migration tiny.</p>`,
        code: lab(`CREATE TABLE keep_me (id INTEGER PRIMARY KEY);
BEGIN;
  CREATE TABLE temp_feature (id INTEGER PRIMARY KEY);
  DROP TABLE keep_me;
ROLLBACK;     -- undo both DDL statements
SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name;   -- keep_me is back, temp_feature never existed`) },
      { title: 'Idempotent migrations with a version table', html: `<p>Real projects never run DDL by hand. A migration tool (Flyway, Liquibase, Alembic, Prisma, Rails) stores which versions ran in a table and applies only new ones, in order. <code>IF NOT EXISTS</code> / <code>IF EXISTS</code> make scripts safe to re-run.</p>`,
        code: lab(`CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
-- migration 1
CREATE TABLE IF NOT EXISTS tags (id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE);
INSERT OR IGNORE INTO schema_migrations (version) VALUES (1);
-- running migration 1 again is harmless:
CREATE TABLE IF NOT EXISTS tags (id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE);
INSERT OR IGNORE INTO schema_migrations (version) VALUES (1);
DROP TABLE IF EXISTS old_unused_table;   -- no error even though it never existed
SELECT version FROM schema_migrations;`) },
      { title: 'DROP COLUMN refuses key columns', html: `<p>You can drop a plain column, but SQLite will stop you dropping a column that is a PRIMARY KEY, has a UNIQUE constraint, is indexed, or is used in a foreign key, view, trigger or CHECK. Drop the index first, or rebuild the table. The failing line is left as a comment so the snippet runs.</p>`,
        code: lab(`CREATE TABLE people (id INTEGER PRIMARY KEY, email TEXT UNIQUE, nickname TEXT, bio TEXT);
CREATE INDEX idx_people_nickname ON people(nickname);
ALTER TABLE people DROP COLUMN bio;            -- fine: plain column
-- ALTER TABLE people DROP COLUMN email;       -- error: cannot drop UNIQUE column
DROP INDEX idx_people_nickname;                -- remove the dependency first...
ALTER TABLE people DROP COLUMN nickname;       -- ...then the drop works
SELECT name FROM pragma_table_info('people');`) }
    ],
    deepDive: `<h4>What really happens on ALTER in big databases</h4>
<p>Some changes are <b>metadata-only</b> (instant): adding a nullable column, adding a column with a constant DEFAULT (Postgres 11+, MySQL 8.0 <code>ALGORITHM=INSTANT</code>), renaming. Others <b>rewrite every row</b>: changing a column type, adding a column with a volatile default like <code>now()</code> (Postgres), or rebuilding in SQLite. A rewrite on a 500 GB table can take hours and may hold a lock that blocks writes — an outage.</p>
<h4>Locks: the hidden danger</h4>
<p>In Postgres, almost every ALTER TABLE takes an <code>ACCESS EXCLUSIVE</code> lock, even briefly. If a long-running query is holding a weaker lock, the ALTER waits — and every new query queues <i>behind the ALTER</i>. Production rule: set <code>lock_timeout</code> (e.g. 2s) before DDL and retry. Add constraints in two steps: <code>ADD CONSTRAINT ... NOT VALID</code> (instant, checks only new rows) then <code>VALIDATE CONSTRAINT</code> (scans without blocking writes). Create indexes with <code>CREATE INDEX CONCURRENTLY</code>.</p>
<h4>Expand → migrate → contract</h4>
<p>Zero-downtime schema changes are done in backward-compatible steps, because old and new app versions run at the same time during a deploy: (1) <b>expand</b> — add new nullable columns/tables; (2) deploy code that writes both old and new; (3) <b>backfill</b> old rows in small batches; (4) switch reads to new; (5) <b>contract</b> — add NOT NULL / drop old columns. Renaming a hot column is really "add new, dual-write, backfill, switch, drop old".</p>
<h4>SQLite's 12-step rebuild (the official recipe, simplified)</h4>
<p>Turn off FKs → BEGIN → note dependent indexes/triggers/views → CREATE new table → INSERT ... SELECT → DROP old → RENAME new → recreate indexes/triggers/views → <code>PRAGMA foreign_key_check</code> → COMMIT → FKs back on. Renaming the <i>new</i> table to the old name (not the other way round) keeps foreign keys in other tables pointing at the right name.</p>
<h4>Tools</h4>
<p>gh-ost and pt-online-schema-change (MySQL) copy the table in the background and swap it in. Postgres has pg_repack. Schema-as-code tools (Atlas, Prisma Migrate, Alembic autogenerate) diff the desired schema against the live one and generate migrations — always review the generated SQL for rewrites and locks.</p>`,
    aiEra: `<p><b>What AI changes:</b> ORMs and assistants can now generate migrations from a model diff in one command, and an LLM can write a full rebuild script for SQLite instantly. The typing is no longer the hard part. The hard part is knowing <i>which</i> generated statement will lock a 2-billion-row table at 7 pm on a sale day.</p>
<p><b>Use AI as a partner:</b> paste the generated migration and ask <code>"For Postgres 16, which of these statements rewrites the table or takes an ACCESS EXCLUSIVE lock for long? Rewrite it as an expand/contract sequence with lock_timeout and NOT VALID constraints."</code> Ask it to produce a rollback script for every forward step.</p>
<p><b>Where AI goes wrong:</b> it suggests <code>ALTER TABLE ... ALTER COLUMN TYPE</code> in SQLite (doesn't exist), forgets that MySQL DDL auto-commits, and happily combines "add column NOT NULL" + backfill in one step. <b>What you must still own:</b> the deploy order (code vs schema), backfill batching, verification queries before tightening constraints, and the judgment of when to schedule risky DDL.</p>`,
    problems: [{
      title: 'Add a Required Column to a Live Table',
      level: 'Medium', tags: ['ALTER TABLE', 'migration', 'NOT NULL'], companies: ['Shopify', 'GitHub', 'Atlassian'],
      statement: `<p>The <code>customers</code> table (id, name, email) already has data. Product now says every customer <b>must</b> have a phone number in international format (starts with <code>+</code>). The real phone numbers exist in a CRM export table <code>crm_phones(email, phone)</code>. Write a SQLite migration that ends with <code>phone</code> being <code>NOT NULL</code> with a CHECK, containing the real numbers — without inventing fake data.</p>`,
      constraints: `<ul><li>Existing rows must not be lost or changed (except getting a phone).</li><li>The final column must be <code>NOT NULL</code> and <code>CHECK (phone LIKE '+%')</code>.</li><li>The app must keep working between steps (think zero-downtime).</li></ul>`,
      example: `<p>customers: (1, Asha, asha@mail.com), (2, Ben, ben@mail.com). crm_phones: asha → +91-98450-00001, ben → +44-7700-900002.</p>${H.table(['id', 'name', 'phone'], [['1', 'Asha', H.c('g', '+91-98450-00001')], ['2', 'Ben', H.c('g', '+44-7700-900002')]])}<p>The verification query must return <b>0 missing</b> before the column is tightened.</p>`,
      brute: {
        why: `<p>The tempting one-liner <code>ALTER TABLE customers ADD COLUMN phone TEXT NOT NULL;</code> fails immediately ("Cannot add a NOT NULL column with default value NULL"). The "fix" people reach for — <code>DEFAULT ''</code> — runs, but now every old customer has an <b>empty-string phone that satisfies NOT NULL</b>. The constraint is technically met and the data is garbage; nobody can tell a real missing phone from a placeholder, and the CHECK you wanted can never be added.</p>`,
        code: lab(`CREATE TABLE customers (id INTEGER PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE);
INSERT INTO customers VALUES (1, 'Asha', 'asha@mail.com'), (2, 'Ben', 'ben@mail.com');
-- ALTER TABLE customers ADD COLUMN phone TEXT NOT NULL;   -- ERROR: NOT NULL column with default NULL
ALTER TABLE customers ADD COLUMN phone TEXT NOT NULL DEFAULT '';   -- "works"... with fake data
SELECT id, name, quote(phone) AS phone FROM customers;   -- '' everywhere: NOT NULL satisfied, data useless`)
      },
      mcq: { q: 'What is the safest FIRST step?', options: ['Add phone as NOT NULL DEFAULT \'unknown\'', 'Add phone as a nullable column', 'Drop and recreate customers with the new column', 'Ask users to re-register'], answer: 1, explain: 'A nullable column is instant and backward compatible. Fill it, verify, and only then tighten to NOT NULL.' },
      hints: [
        '<p>Hint 1: You cannot make a column mandatory while old rows have no value. Split the change into steps that are each valid on their own.</p>',
        '<p>Hint 2: Expand (add nullable) → backfill with a correlated <code>UPDATE ... SET phone = (SELECT ... FROM crm_phones WHERE ...)</code> → verify with <code>COUNT(*) WHERE phone IS NULL</code>.</p>',
        '<p>Hint 3: SQLite cannot add NOT NULL/CHECK to an existing column, so the contract step is a table rebuild: FKs off → BEGIN → CREATE new → INSERT SELECT → DROP old → RENAME → foreign_key_check → COMMIT. (Postgres: <code>ALTER COLUMN phone SET NOT NULL</code>.)</p>'
      ],
      solution: {
        approach: `<p>Expand → backfill → verify → contract. Each step leaves the database valid and old code working. The final rebuild bakes in <code>NOT NULL</code> and the CHECK, so from now on the database itself guarantees every customer has a real international phone.</p>`,
        code: lab(`CREATE TABLE customers (id INTEGER PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE);
INSERT INTO customers VALUES (1, 'Asha', 'asha@mail.com'), (2, 'Ben', 'ben@mail.com');
CREATE TABLE crm_phones (email TEXT PRIMARY KEY, phone TEXT NOT NULL);
INSERT INTO crm_phones VALUES ('asha@mail.com', '+91-98450-00001'), ('ben@mail.com', '+44-7700-900002');

-- 1) EXPAND: nullable column, instant, old code unaffected
ALTER TABLE customers ADD COLUMN phone TEXT;

-- 2) BACKFILL from the real source (in production: in batches of a few thousand ids)
UPDATE customers
SET phone = (SELECT p.phone FROM crm_phones p WHERE p.email = customers.email)
WHERE phone IS NULL;

-- 3) VERIFY: must be 0 before tightening
SELECT COUNT(*) AS still_missing FROM customers WHERE phone IS NULL OR phone NOT LIKE '+%';

-- 4) CONTRACT: rebuild with the real rules (Postgres: ALTER TABLE customers ALTER COLUMN phone SET NOT NULL;)
PRAGMA foreign_keys = OFF;
BEGIN;
CREATE TABLE customers_new (
  id    INTEGER PRIMARY KEY,
  name  TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL CHECK (phone LIKE '+%')
);
INSERT INTO customers_new (id, name, email, phone) SELECT id, name, email, phone FROM customers;
DROP TABLE customers;
ALTER TABLE customers_new RENAME TO customers;
PRAGMA foreign_key_check;
COMMIT;
PRAGMA foreign_keys = ON;

SELECT * FROM customers;
SELECT sql FROM sqlite_master WHERE name = 'customers';`),
        complexity: `<p>Expand is O(1) (metadata). Backfill is O(N) updates — batch it to keep locks short. Verify is one O(N) scan. The SQLite rebuild copies the table once, O(N) time and O(N) temporary space; in Postgres <code>SET NOT NULL</code> is a scan (PG 12+ can skip it if a validated CHECK (phone IS NOT NULL) exists).</p>`,
        followUps: ['What if 3% of customers have no phone in the CRM? (keep nullable + app prompt, or a sentinel table of exceptions — never fake data)', 'How would you rename <code>phone</code> to <code>phone_e164</code> with zero downtime?']
      }
    }]
  });
  /* ======================= TOPIC 3: CONSTRAINTS ======================= */
  topics.push({
    title: 'Constraints: PRIMARY KEY, UNIQUE, NOT NULL, CHECK & DEFAULT',
    analogy: `<p>Picture a <b>nightclub bouncer</b> with a checklist. "Do you have ID?" (<b>NOT NULL</b>). "Are you over 18?" (<b>CHECK</b>). "Is your name already on the inside list?" (<b>UNIQUE</b> / <b>PRIMARY KEY</b>). "No jacket? Here, take a free wristband" (<b>DEFAULT</b>). The bouncer checks <i>every</i> person at the door, every night, no matter which entrance they use. Validation in your app is a polite sign on the door; constraints are the bouncer.</p>`,
    explain: `<p>A <b>constraint</b> is a rule the database enforces on every INSERT and UPDATE. If a write breaks a rule, the <b>whole statement fails</b> and nothing is stored. Because the database checks it, the rule holds no matter who writes — your API, a cron job, an admin with a SQL console, or next year's microservice.</p>
${H.table(['Constraint', 'Plain meaning', 'Example', 'Rejects'], [
  ['<code>NOT NULL</code>', 'this box can never be empty', '<code>email TEXT NOT NULL</code>', 'a row with no email'],
  ['<code>UNIQUE</code>', 'no two rows may share this value', '<code>UNIQUE (email)</code>', 'a second asha@mail.com'],
  ['<code>PRIMARY KEY</code>', 'the row\'s identity: UNIQUE + NOT NULL, one per table', '<code>id INTEGER PRIMARY KEY</code>', 'two rows with id 7'],
  ['<code>CHECK (expr)</code>', 'a yes/no rule about this row', '<code>CHECK (age &gt;= 13)</code>', 'age 9'],
  ['<code>DEFAULT v</code>', 'value used when the column is left out', '<code>plan TEXT DEFAULT \'free\'</code>', 'nothing — it fills, not rejects'],
  ['<code>FOREIGN KEY</code>', 'value must exist in another table (next topic)', '<code>REFERENCES customers(id)</code>', 'order for customer 999']
])}
<h4>Keys vocabulary (interviewers love this)</h4>
<ul>
<li><b>Super key</b>: any set of columns that uniquely identifies a row (e.g. {id, email}).</li>
<li><b>Candidate key</b>: a <i>minimal</i> super key — remove any column and it stops being unique (id alone; email alone).</li>
<li><b>Primary key</b>: the one candidate key you choose as the official identity. The others become <b>alternate keys</b> — declare them <code>UNIQUE NOT NULL</code>.</li>
<li><b>Composite key</b>: a key made of several columns, e.g. <code>PRIMARY KEY (order_id, product_id)</code>.</li>
<li><b>Natural key</b> (from the real world: ISBN, email) vs <b>surrogate key</b> (made-up: auto-increment id, UUID). Most schemas use a surrogate PK plus UNIQUE on the natural key.</li>
</ul>
<h4>Three gotchas that catch everyone</h4>
${H.table(['Gotcha', 'Why', 'Fix'], [
  ['<code>CHECK (age &gt;= 13)</code> accepts age = NULL', 'NULL &gt;= 13 is UNKNOWN, and CHECK only rejects FALSE', 'add <code>NOT NULL</code> if the value is required'],
  ['<code>INSERT ... VALUES (NULL)</code> does not use the DEFAULT', 'DEFAULT applies only when the column is <b>omitted</b>', 'omit the column, or <code>COALESCE</code> in the app'],
  ['UNIQUE allows many NULLs', 'NULL is "unknown", and unknown ≠ unknown', 'add NOT NULL, or PG 15 <code>NULLS NOT DISTINCT</code>']
])}`,
    clues: [
      '"must be unique" / "no duplicate emails or usernames" → <code>UNIQUE</code> (often case-insensitive)',
      '"every X must have a Y" / "mandatory field" → <code>NOT NULL</code>',
      '"price must be positive" / "rating between 1 and 5" / "end after start" → <code>CHECK</code>',
      '"only one active / default / primary per user" → partial UNIQUE index (<code>WHERE is_active = 1</code>)',
      '"identify a row by two columns together" → composite PRIMARY KEY or UNIQUE (a, b)',
      '"natural vs surrogate key" / "should email be the primary key?" → surrogate PK + UNIQUE natural key',
      '"which of these INSERTs fail?" → walk NOT NULL → CHECK → PK → UNIQUE; remember NULL passes CHECK'
    ],
    code: [
      lab(`CREATE TABLE users (
  id    INTEGER PRIMARY KEY,                                   -- identity (auto-assigned if omitted)
  email TEXT    NOT NULL COLLATE NOCASE,                       -- required, case-insensitive compare
  age   INTEGER CONSTRAINT chk_users_age CHECK (age >= 13),    -- named CHECK -> readable errors
  plan  TEXT    NOT NULL DEFAULT 'free'
        CONSTRAINT chk_users_plan CHECK (plan IN ('free', 'pro', 'team')),
  CONSTRAINT uq_users_email UNIQUE (email)                     -- table-level constraint
);

-- INSERT OR IGNORE = "skip the row instead of failing the script", so we can watch each rule.
INSERT OR IGNORE INTO users (email, age)       VALUES ('asha@mail.com', 29);   SELECT 'asha'         AS attempt, changes() AS stored;
INSERT OR IGNORE INTO users (email, age)       VALUES ('ASHA@mail.com', 40);   SELECT 'ASHA (dup)'   AS attempt, changes() AS stored;
INSERT OR IGNORE INTO users (email, age)       VALUES ('kid@mail.com', 9);     SELECT 'kid age 9'    AS attempt, changes() AS stored;
INSERT OR IGNORE INTO users (email, age)       VALUES (NULL, 30);              SELECT 'no email'     AS attempt, changes() AS stored;
INSERT OR IGNORE INTO users (email, age, plan) VALUES ('ben@mail.com', 33, 'gold'); SELECT 'plan gold' AS attempt, changes() AS stored;
INSERT OR IGNORE INTO users (email, age)       VALUES ('cy@mail.com', NULL);   SELECT 'age NULL'     AS attempt, changes() AS stored;  -- CHECK passes on NULL!

SELECT * FROM users;`, 'Every constraint, one rejected INSERT each')
    ],
    codeTitle: ['The bouncer at work'],
    viz: {
      title: 'Constraint gate: watch each INSERT get checked (and the bad ones rejected)',
      input: '1,asha@mail.com,29,pro; 2,ben@mail.com,17; ,cy@mail.com,40; 2,dev@mail.com,25; 5,asha@mail.com,31; 6,,50; 7,kid@mail.com,9; 8,eve@mail.com,,gold; 9,fay@mail.com,,NULL; 10,gus@mail.com,',
      inputLabel: 'Rows "id,email,age[,plan]" separated by ; (leave a field empty = NULL/omitted; 4th field missing = DEFAULT; NULL = explicit NULL)',
      gen: function (input) {
        var specs = String(input === undefined || input === null ? '' : input).split(';').map(function (s) { return s.trim(); }).filter(function (s) { return s.length; });
        if (!specs.length) throw new Error('Type rows like: 1,asha@mail.com,29; 2,ben@mail.com,17,pro');
        if (specs.length > 12) throw new Error('Use at most 12 rows');
        var table = [], frames = [], ok = 0, bad = 0;
        var ddl = 'CREATE TABLE users (\n  id    INTEGER PRIMARY KEY,\n  email TEXT NOT NULL UNIQUE,\n  age   INTEGER CHECK (age >= 13),\n  plan  TEXT NOT NULL DEFAULT \'free\'\n        CHECK (plan IN (\'free\',\'pro\',\'team\'))\n);';
        frames.push({ narr: 'The table and its rules. Every INSERT walks past the bouncer: <b>DEFAULT</b> fills omitted columns first, then <b>NOT NULL</b>, <b>CHECK</b>, <b>PRIMARY KEY</b> and <b>UNIQUE</b>. The first broken rule rejects the whole row.', parts: [
          { type: 'code', label: 'DDL', lang: 'sql', code: ddl, hl: { 2: 'cur', 3: 'cur', 4: 'cur', 5: 'cur', 6: 'cur' } },
          { type: 'table', label: 'users', columns: ['id', 'email', 'age', 'plan'], rows: [] }
        ] });
        function show(v) { return v === null ? 'NULL' : v; }
        specs.forEach(function (sp) {
          var f = sp.split(',').map(function (x) { return x.trim(); });
          if (f.length < 3 || f.length > 4) throw new Error('Each row needs 3 or 4 comma-separated fields: id,email,age[,plan] (got "' + sp + '")');
          var idRaw = f[0], email = f[1] === '' || /^null$/i.test(f[1]) ? null : f[1];
          var age = f[2] === '' || /^null$/i.test(f[2]) ? null : Number(f[2]);
          if (age !== null && (!isFinite(age) || Math.floor(age) !== age)) throw new Error('age must be a whole number or empty (row "' + sp + '")');
          if (idRaw !== '' && !/^\d+$/.test(idRaw)) throw new Error('id must be a positive whole number or empty (row "' + sp + '")');
          var planOmitted = f.length === 3, plan = planOmitted ? 'free' : (/^null$/i.test(f[3]) || f[3] === '' ? null : f[3]);
          var id = idRaw === '' ? (table.reduce(function (m, r) { return Math.max(m, r[0]); }, 0) + 1) : Number(idRaw);
          var checks = [], fail = null;
          checks.push(['DEFAULT', planOmitted ? 'plan omitted → \'free\'' : 'plan given: ' + show(plan), 'filled', '']);
          if (idRaw === '') checks.push(['auto id', 'id omitted → max(id)+1 = ' + id, 'filled', '']);
          function rule(name, val, pass, why) { if (fail) { checks.push([name, val, 'not reached', 'done']); return; } checks.push([name, val, pass ? '✔ pass' : '✗ ' + why, pass ? 'ok' : 'bad']); if (!pass) fail = name + ': ' + why; }
          rule('NOT NULL email', show(email), email !== null, 'email is NULL');
          rule('NOT NULL plan', show(plan), plan !== null, 'explicit NULL beats DEFAULT');
          rule('CHECK age >= 13', show(age), age === null || age >= 13, age + ' < 13');
          rule('CHECK plan IN (...)', show(plan), plan === null || ['free', 'pro', 'team'].indexOf(plan) >= 0, '\'' + plan + '\' not allowed');
          rule('PRIMARY KEY id', id, !table.some(function (r) { return r[0] === id; }), 'id ' + id + ' already exists');
          rule('UNIQUE email', show(email), !table.some(function (r) { return r[1] === email; }), email + ' already used');
          var row = [id, show(email), show(age), show(plan)];
          var chkHl = {}; checks.forEach(function (c, k) { if (c[3]) chkHl[k] = c[3]; });
          var stmt = 'INSERT INTO users (' + (idRaw === '' ? '' : 'id, ') + 'email, age' + (planOmitted ? '' : ', plan') + ')\nVALUES (' + (idRaw === '' ? '' : id + ', ') + (email === null ? 'NULL' : "'" + email + "'") + ', ' + show(age) + (planOmitted ? '' : ', ' + (plan === null ? 'NULL' : "'" + plan + "'")) + ');';
          var shown = copyRows(table), thl = {};
          if (fail) { shown.push(row); thl[shown.length - 1] = 'bad'; bad++; }
          else { table.push(row); shown = copyRows(table); thl[shown.length - 1] = 'ok'; ok++; }
          var note = fail ? '<span class="c-r">REJECTED — ' + H.esc(fail) + '.</span> The red row is shown only for comparison; it was never stored.' : '<span class="c-g">ACCEPTED</span> — every rule passed' + (age === null ? ' (note: age NULL passes the CHECK because NULL &gt;= 13 is UNKNOWN, not FALSE)' : '') + (planOmitted ? '; plan came from the DEFAULT' : '') + '.';
          frames.push({ narr: 'Row <code>' + H.esc(sp) + '</code>: ' + note, parts: [
            { type: 'code', label: 'statement', lang: 'sql', code: stmt, hl: { 1: fail ? 'bad' : 'ok', 2: fail ? 'bad' : 'ok' } },
            { type: 'table', label: 'bouncer checklist', columns: ['rule', 'value', 'result'], rows: checks.map(function (c) { return [c[0], c[1], c[2]]; }), hl: chkHl },
            { type: 'table', label: fail ? 'users (red = rejected attempt)' : 'users', columns: ['id', 'email', 'age', 'plan'], rows: shown, hl: thl },
            { type: 'vars', vals: { accepted: ok, rejected: bad }, hl: fail ? { rejected: 'bad' } : { accepted: 'ok' } }
          ] });
        });
        frames.push({ narr: 'Final table: ' + ok + ' row(s) stored, ' + bad + ' rejected. Every stored row is guaranteed to obey every rule — forever, no matter which program writes next.', parts: [
          { type: 'table', label: 'users (final)', columns: ['id', 'email', 'age', 'plan'], rows: copyRows(table) },
          { type: 'text', html: 'Remember: <b>NULL passes CHECK</b>, <b>explicit NULL ignores DEFAULT</b>, and <b>the whole statement fails</b> on the first broken rule (unless you use INSERT OR IGNORE / ON CONFLICT).' }
        ] });
        return frames;
      }
    },
    examples: [
      { title: 'Gotcha: CHECK lets NULL through', html: `<p>A CHECK rejects a row only when the expression is <b>FALSE</b>. With age = NULL, <code>age &gt;= 13</code> is <b>UNKNOWN</b> (three-valued logic), so the row passes. If age is required, you need <code>NOT NULL</code> as well.</p>${H.table(['age', 'age >= 13', 'CHECK result'], [['20', 'TRUE', H.c('g', 'pass')], ['9', 'FALSE', H.c('r', 'reject')], ['NULL', 'UNKNOWN', H.c('y', 'pass!')]])}`,
        code: lab(`CREATE TABLE members (name TEXT, age INTEGER CHECK (age >= 13));
INSERT INTO members VALUES ('Asha', 20), ('Mystery', NULL);   -- both accepted
INSERT OR IGNORE INTO members VALUES ('Kid', 9);               -- skipped
SELECT name, quote(age) AS age FROM members;`) },
      { title: 'Gotcha: explicit NULL does not trigger DEFAULT', html: `<p>DEFAULT is used only when the column is left out of the INSERT. Writing <code>NULL</code> explicitly means "I want NULL" — so a nullable column stores NULL, and a NOT NULL column rejects the row. ORMs that send every column (including NULLs) bump into this all the time.</p>`,
        code: lab(`CREATE TABLE tickets (id INTEGER PRIMARY KEY, priority TEXT DEFAULT 'normal', status TEXT NOT NULL DEFAULT 'open');
INSERT INTO tickets (id) VALUES (1);                          -- both defaults used
INSERT INTO tickets (id, priority) VALUES (2, NULL);          -- priority NULL, NOT 'normal'
INSERT OR IGNORE INTO tickets (id, status) VALUES (3, NULL);  -- NOT NULL rejects explicit NULL
SELECT id, quote(priority) AS priority, status FROM tickets;`) },
      { title: 'Case-insensitive uniqueness for emails', html: `<p><code>'Asha@Mail.com'</code> and <code>'asha@mail.com'</code> are the same mailbox but different strings. Two good fixes: declare the column <code>COLLATE NOCASE</code> (SQLite), or a <b>unique expression index</b> on <code>lower(email)</code> (works in Postgres too).</p>`,
        code: lab(`CREATE TABLE accounts (id INTEGER PRIMARY KEY, email TEXT NOT NULL);
CREATE UNIQUE INDEX uq_accounts_email_ci ON accounts (lower(email));
INSERT INTO accounts (email) VALUES ('asha@mail.com');
INSERT OR IGNORE INTO accounts (email) VALUES ('ASHA@Mail.com');   -- blocked by the expression index
SELECT * FROM accounts;`) },
      { title: 'SQLite quirk: a TEXT PRIMARY KEY can be NULL', html: `<p>Because of an old bug kept for compatibility, a non-INTEGER PRIMARY KEY in a normal SQLite table accepts NULLs — even several. Postgres/MySQL would reject them. Fix: add <code>NOT NULL</code>, or use <code>STRICT</code> / <code>WITHOUT ROWID</code> tables, which enforce it.</p>`,
        code: lab(`CREATE TABLE sku_loose  (sku TEXT PRIMARY KEY, name TEXT);
CREATE TABLE sku_strict (sku TEXT NOT NULL PRIMARY KEY, name TEXT);
INSERT INTO sku_loose VALUES (NULL, 'mystery 1'), (NULL, 'mystery 2');   -- accepted (!)
INSERT OR IGNORE INTO sku_strict VALUES (NULL, 'mystery');               -- rejected
SELECT 'loose' AS t, COUNT(*) AS n FROM sku_loose UNION ALL SELECT 'strict', COUNT(*) FROM sku_strict;`) },
      { title: 'Partial unique index: "only one default address per customer"', html: `<p>A plain UNIQUE(customer_id, is_default) would also forbid two <i>non-default</i> addresses. A <b>partial</b> unique index only covers rows matching its WHERE clause, so it says exactly "at most one row with is_default = 1 per customer".</p>`,
        code: lab(`CREATE TABLE addresses (id INTEGER PRIMARY KEY, customer_id INTEGER NOT NULL, city TEXT NOT NULL,
                        is_default INTEGER NOT NULL DEFAULT 0 CHECK (is_default IN (0, 1)));
CREATE UNIQUE INDEX uq_one_default_address ON addresses (customer_id) WHERE is_default = 1;
INSERT INTO addresses (customer_id, city, is_default) VALUES (1, 'Pune', 1), (1, 'Goa', 0), (1, 'Delhi', 0);
INSERT OR IGNORE INTO addresses (customer_id, city, is_default) VALUES (1, 'Agra', 1);  -- 2nd default: blocked
SELECT * FROM addresses;`) }
    ],
    deepDive: `<h4>How the database enforces them (and what it costs)</h4>
<p><b>NOT NULL</b> and <b>CHECK</b> are evaluated on the single row being written — O(1), essentially free. <b>UNIQUE</b> and <b>PRIMARY KEY</b> are enforced with a <b>unique B-tree index</b>: inserting means one index lookup, O(log N). So every UNIQUE constraint is also an index you pay for in storage and write speed — and get for free when reading by that column.</p>
<h4>Statement-level vs deferred checking</h4>
<p>By default constraints are checked as each row/statement executes. Postgres lets UNIQUE and FK constraints be <code>DEFERRABLE INITIALLY DEFERRED</code>, checked only at COMMIT — useful for swapping two values (<code>UPDATE ... SET pos = CASE ...</code>) or circular references. SQLite defers FKs (<code>DEFERRABLE INITIALLY DEFERRED</code> or <code>PRAGMA defer_foreign_keys</code>) but not UNIQUE.</p>
<h4>Conflict resolution</h4>
<p>SQLite has per-statement resolution: <code>INSERT OR IGNORE</code> (skip row), <code>OR REPLACE</code> (delete the old conflicting row, insert new — careful: deletes fire cascades!), <code>OR ABORT</code> (default), <code>OR FAIL</code>, <code>OR ROLLBACK</code>. The portable modern form is <code>INSERT ... ON CONFLICT (email) DO NOTHING</code> / <code>DO UPDATE SET ...</code> (upsert), supported by SQLite and Postgres (MySQL: <code>ON DUPLICATE KEY UPDATE</code>). Foreign keys are not covered by these clauses.</p>
<h4>CHECK limits</h4>
<p>A CHECK can only look at the current row. It cannot run a subquery ("no more than 5 addresses per customer") — that needs a trigger, a counter column with a CHECK, or app logic in a transaction. Keep CHECK expressions deterministic (no <code>now()</code>): "birth_date &lt; today" becomes false-positive tomorrow for data that was valid when written.</p>
<h4>Surrogate vs natural keys in production</h4>
<p>Natural keys change (people change emails, ISBNs get reissued, countries split) and changing a PK means updating every FK. Surrogates never change. Auto-increment BIGINT is compact and index-friendly but leaks business volume and is hard to merge across shards; random UUIDv4 fragments B-tree inserts; <b>UUIDv7</b> (time-ordered, RFC 9562, 2024) is the modern compromise — globally unique and mostly append-only.</p>
<h4>Naming convention</h4>
<p><code>pk_table</code>, <code>uq_table_cols</code>, <code>chk_table_rule</code>, <code>fk_child_parent</code>, <code>idx_table_cols</code>. When a constraint fails at 3 a.m., <code>violates check constraint "chk_orders_qty_positive"</code> tells the on-call engineer everything.</p>`,
    aiEra: `<p><b>What AI changes:</b> LLM agents now write to databases directly (tool calls, text-to-SQL, autonomous back-office agents). An agent will occasionally generate a plausible but wrong value — a negative quantity, a status string with a typo, a duplicate signup. Constraints are the <b>guardrail that does not depend on the agent being right</b>. The more non-human writers you have, the more valuable database-level rules become.</p>
<p><b>Use AI as a partner:</b> paste a table and ask <code>"List every business rule this table should enforce that it currently doesn't, and give me the CHECK/UNIQUE/partial-index DDL for each, for SQLite and Postgres."</code> Also ask it to write a constraint-violation test suite: one INSERT per rule that must fail.</p>
<p><b>Where AI goes wrong:</b> it forgets that CHECK passes on NULL, assumes UNIQUE blocks duplicate NULLs, writes CHECKs with subqueries (not allowed), and uses <code>INSERT OR REPLACE</code> as an "upsert" without realising it deletes the old row (and cascades). <b>What you must still own:</b> deciding which rules are invariants (belong in the DB) versus policies that change weekly (belong in code), and reading the error messages your users will see.</p>`,
    problems: [{
      title: 'Constraint Puzzle: Which INSERTs Survive?',
      level: 'Medium', tags: ['constraints', 'NULL logic', 'puzzle'], companies: ['Oracle', 'Microsoft', 'Flipkart'],
      statement: `<p>Given this table:</p><pre>CREATE TABLE products (
  id INTEGER PRIMARY KEY,
  sku TEXT NOT NULL UNIQUE,
  price_cents INTEGER CHECK (price_cents &gt; 0),
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock &gt;= 0)
);</pre><p>Predict which of these 8 inserts succeed, then prove it in SQL:</p>
<ol><li><code>(1, 'A1', 500, 10)</code></li><li><code>(2, 'A1', 700, 5)</code></li><li><code>(3, 'B2', -100, 1)</code></li><li><code>(4, 'C3', NULL, 2)</code></li><li><code>(1, 'D4', 900, 1)</code></li><li><code>(5, NULL, 100, 1)</code></li><li><code>(6, 'E5', 250)</code> with stock omitted</li><li><code>(7, 'F6', 300, NULL)</code></li></ol>`,
      constraints: `<ul><li>Run all 8 attempts in one script without it stopping at the first error.</li><li>Explain each rejection by naming the exact constraint.</li></ul>`,
      example: `${H.table(['#', 'result', 'why'], [
        ['1', H.c('g', 'stored'), 'all rules pass'], ['2', H.c('r', 'rejected'), 'UNIQUE sku A1'], ['3', H.c('r', 'rejected'), 'CHECK price &gt; 0'],
        ['4', H.c('g', 'stored'), 'NULL passes CHECK; price is nullable'], ['5', H.c('r', 'rejected'), 'PRIMARY KEY id 1'], ['6', H.c('r', 'rejected'), 'NOT NULL sku'],
        ['7', H.c('g', 'stored'), 'stock omitted → DEFAULT 0'], ['8', H.c('r', 'rejected'), 'explicit NULL stock → NOT NULL']])}<p>Answer: attempts #1, #4 and #7 survive — the table ends with ids 1, 4 and 6 (3 rows).</p>`,
      brute: {
        why: `<p>The "validate in the app" approach: a table with no constraints and a hope that every code path checks. All 8 rows go in — a duplicate SKU, a negative price, a duplicate id and a NULL SKU. Every report built on this table is now wrong, and you only find out when a customer is charged −₹1.</p>`,
        code: lab(`CREATE TABLE products_nocheck (id INTEGER, sku TEXT, price_cents INTEGER, stock INTEGER);
INSERT INTO products_nocheck VALUES (1,'A1',500,10),(2,'A1',700,5),(3,'B2',-100,1),(4,'C3',NULL,2),
                                    (1,'D4',900,1),(5,NULL,100,1),(6,'E5',250,NULL),(7,'F6',300,NULL);
SELECT COUNT(*) AS rows_stored,
       SUM(price_cents < 0) AS negative_prices,
       COUNT(*) - COUNT(DISTINCT id) AS duplicate_ids
FROM products_nocheck;`)
      },
      mcq: { q: 'Insert #4 has price_cents = NULL with CHECK (price_cents > 0). What happens?', options: ['Rejected: NULL is not > 0', 'Stored: the CHECK evaluates to UNKNOWN, which is not FALSE', 'Stored with price 0', 'Error: CHECK cannot reference nullable columns'], answer: 1, explain: 'CHECK rejects only FALSE. NULL > 0 is UNKNOWN, so the row passes.' },
      hints: [
        '<p>Hint 1: For each row walk the list: DEFAULT fill → NOT NULL → CHECK → PRIMARY KEY → UNIQUE. Stop at the first failure.</p>',
        '<p>Hint 2: Watch for the two NULL traps: NULL passes CHECK; an explicit NULL does not trigger DEFAULT.</p>',
        '<p>Hint 3: To run all attempts without the script stopping, use <code>INSERT OR IGNORE</code> per row and <code>SELECT changes()</code> after each to see 1 (stored) or 0 (rejected).</p>'
      ],
      solution: {
        approach: `<p>Create the real table, then run each attempt with <code>INSERT OR IGNORE</code> so a rejection just skips the row. <code>changes()</code> reports 1 or 0 after each attempt — a mechanical proof of your prediction. Final SELECT shows the 3 survivors.</p>`,
        code: lab(`CREATE TABLE products (
  id INTEGER PRIMARY KEY,
  sku TEXT NOT NULL UNIQUE,
  price_cents INTEGER CHECK (price_cents > 0),
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0)
);
CREATE TABLE attempts (n INTEGER, stored INTEGER);

INSERT OR IGNORE INTO products VALUES (1, 'A1', 500, 10);    INSERT INTO attempts VALUES (1, changes());
INSERT OR IGNORE INTO products VALUES (2, 'A1', 700, 5);     INSERT INTO attempts VALUES (2, changes());
INSERT OR IGNORE INTO products VALUES (3, 'B2', -100, 1);    INSERT INTO attempts VALUES (3, changes());
INSERT OR IGNORE INTO products VALUES (4, 'C3', NULL, 2);    INSERT INTO attempts VALUES (4, changes());
INSERT OR IGNORE INTO products VALUES (1, 'D4', 900, 1);     INSERT INTO attempts VALUES (5, changes());
INSERT OR IGNORE INTO products VALUES (5, NULL, 100, 1);     INSERT INTO attempts VALUES (6, changes());
INSERT OR IGNORE INTO products (id, sku, price_cents) VALUES (6, 'E5', 250);
                                                             INSERT INTO attempts VALUES (7, changes());
INSERT OR IGNORE INTO products VALUES (7, 'F6', 300, NULL);  INSERT INTO attempts VALUES (8, changes());
-- changes() = rows written by the PREVIOUS statement: 1 = stored, 0 = rejected

SELECT n AS attempt, CASE stored WHEN 1 THEN 'stored' ELSE 'rejected' END AS result FROM attempts ORDER BY n;
SELECT * FROM products ORDER BY id;`),
        complexity: `<p>Each insert costs O(1) for NOT NULL/CHECK plus O(log N) per unique index (id and sku). Verification is O(1) per attempt via the PK/UNIQUE indexes.</p>`,
        followUps: ['Which attempts would change if the table were STRICT? (none here — all values are already integers/text)', 'Rewrite attempt #2 as an upsert that updates the price instead of failing.']
      }
    }]
  });
  /* ======================= TOPIC 4: FOREIGN KEYS & CASCADES ======================= */
  topics.push({
    title: 'Foreign Keys & Cascading Actions (ON DELETE / ON UPDATE)',
    analogy: `<p>A foreign key is a <b>library card number written on a loan slip</b>. The slip is only valid if that card number exists in the members' register. Now a member leaves. The library must decide: <b>tear up all their loan slips too</b> (CASCADE), <b>keep the slips but blank out the name</b> (SET NULL), or <b>refuse to let them leave until every book is back</b> (RESTRICT). A database makes you choose one of these rules up front, so nobody has to remember at 2 a.m.</p>`,
    explain: `<p>A <b>foreign key (FK)</b> is a column (or columns) in a <b>child</b> table whose value must match a key in a <b>parent</b> table — or be NULL. It guarantees <b>referential integrity</b>: no order can point to a customer that does not exist (no "orphans").</p>
<pre>CREATE TABLE orders (
  id          INTEGER PRIMARY KEY,
  customer_id INTEGER NOT NULL
              REFERENCES customers(id)      -- the parent key (must be PK or UNIQUE)
              ON DELETE RESTRICT            -- what happens when the parent row is deleted
              ON UPDATE CASCADE             -- what happens when the parent key value changes
);</pre>
<p><b>⚠ SQLite gotcha:</b> foreign keys are <b>OFF by default</b> for backward compatibility. Run <code>PRAGMA foreign_keys = ON;</code> on <i>every connection</i>, or SQLite silently accepts orphans. (Postgres and MySQL InnoDB always enforce them.)</p>
<h4>The five referential actions</h4>
${H.table(['Action', 'When the parent row is deleted…', 'Good for'], [
  ['<code>CASCADE</code>', H.c('r', 'child rows are deleted too') + ' (and their children, and theirs…)', 'parts that cannot live alone: order_items of an order, addresses of a user'],
  ['<code>SET NULL</code>', 'child FK is set to NULL; child row stays', 'history worth keeping: reviews by a deleted user ("anonymous")'],
  ['<code>SET DEFAULT</code>', 'child FK is set to its DEFAULT (which must exist in the parent)', 'reassign to an "unassigned" bucket'],
  ['<code>RESTRICT</code>', H.c('y', 'the delete is refused immediately') + ' if any child exists', 'money/legal records: orders, invoices'],
  ['<code>NO ACTION</code> (default)', 'like RESTRICT, but checked at the end of the statement (or at COMMIT if deferred)', 'the safe default']
])}
<p>The same actions exist for <code>ON UPDATE</code> (when the parent's key value changes) — mostly relevant for natural keys like country codes, because surrogate ids never change.</p>
<h4>Two things an FK also does on INSERT/UPDATE of the child</h4>
<ol><li>Inserting <code>orders(customer_id = 999)</code> fails if customer 999 doesn't exist.</li><li>A NULL FK is allowed (it points nowhere) unless the column is also <code>NOT NULL</code>. "Every order must have a customer" = <code>NOT NULL</code> + FK.</li></ol>
<h4>Index the child column!</h4>
<p>When a parent is deleted, the database must find its children: <code>SELECT ... FROM orders WHERE customer_id = ?</code>. Without an index on <code>orders.customer_id</code> that is a full table scan for every parent delete. Postgres and SQLite do <b>not</b> create this index for you (MySQL InnoDB does).</p>`,
    clues: [
      '"what happens to the orders when a user deletes their account?" → choose ON DELETE CASCADE / SET NULL / RESTRICT per relationship',
      '"orphan rows" / "order points to a customer that doesn\'t exist" → missing FK (or SQLite without <code>PRAGMA foreign_keys = ON</code>)',
      '"GDPR: delete all of a user\'s data" → CASCADE on personal data, SET NULL/anonymise on shared history, RESTRICT on financial records',
      '"deleting one row took minutes / locked the table" → unindexed FK column or a huge cascade tree',
      '"keep the review but remove the author" → <code>ON DELETE SET NULL</code> (FK column must be nullable)',
      '"cannot delete product, it is referenced" → RESTRICT working as designed → soft delete (<code>is_active = 0</code>)',
      '"country code changed from UK to GB" → natural key + <code>ON UPDATE CASCADE</code>'
    ],
    code: [
      shop(`-- shop: orders -> order_items is ON DELETE CASCADE
SELECT 'items of order 3 before' AS step, COUNT(*) AS n FROM order_items WHERE order_id = 3;
DELETE FROM orders WHERE id = 3;                       -- one statement...
SELECT 'items of order 3 after'  AS step, COUNT(*) AS n FROM order_items WHERE order_id = 3;  -- ...children gone too

-- See every FK declared on a table and its actions
SELECT "table" AS parent, "from" AS child_col, "to" AS parent_col, on_update, on_delete
FROM pragma_foreign_key_list('order_items');`, 'CASCADE in the shop database'),
      shop(`-- Customer 4 (Dara) has an address (CASCADE) and a review (SET NULL), but no orders.
SELECT 'before' AS step,
       (SELECT COUNT(*) FROM addresses WHERE customer_id = 4) AS dara_addresses,
       (SELECT COUNT(*) FROM reviews WHERE id = 3 AND customer_id = 4) AS dara_reviews;
DELETE FROM customers WHERE id = 4;
SELECT 'after' AS step,
       (SELECT COUNT(*) FROM addresses WHERE customer_id = 4) AS dara_addresses,  -- 0: cascaded
       (SELECT COUNT(*) FROM reviews WHERE id = 3) AS review_3_still_there;      -- 1: kept
SELECT id, product_id, quote(customer_id) AS customer_id, rating, body FROM reviews WHERE id = 3;  -- author NULL

-- Customer 3 has an order, and orders.customer_id is ON DELETE RESTRICT:
-- DELETE FROM customers WHERE id = 3;   -- uncomment: Error: FOREIGN KEY constraint failed
SELECT 'blockers for customer 3' AS note, COUNT(*) AS orders FROM orders WHERE customer_id = 3;`, 'SET NULL, CASCADE and RESTRICT side by side')
    ],
    codeTitle: ['Cascade an order', 'Three policies in one delete'],
    viz: [{
      title: 'ON DELETE in slow motion: CASCADE vs SET NULL vs RESTRICT',
      input: '1 cascade',
      inputLabel: 'customer id (1-4) and action: cascade | setnull | restrict',
      gen: function (input) {
        var w = String(input === undefined || input === null ? '' : input).trim().toLowerCase().split(/\s+/);
        var cid = Number(w[0]), act = (w[1] || 'cascade').replace(/[^a-z]/g, '');
        if (!w[0] || !isFinite(cid) || Math.floor(cid) !== cid) throw new Error('Format: <customer id> <action>, e.g. 1 cascade or 2 restrict');
        if (['cascade', 'setnull', 'restrict'].indexOf(act) < 0) throw new Error('Action must be cascade, setnull or restrict');
        var label = { cascade: 'CASCADE', setnull: 'SET NULL', restrict: 'RESTRICT' }[act];
        var C = [[1, 'Asha'], [2, 'Ben'], [3, 'Chen'], [4, 'Dara']];
        var O = [[10, 1, 'paid'], [11, 1, 'shipped'], [12, 2, 'pending'], [13, 3, 'paid']];
        var I = [[100, 10, 'Phone'], [101, 10, 'Cable'], [102, 11, 'Book'], [103, 12, 'Cable'], [104, 13, 'Lamp']];
        var dc = 0, doo = 0, di = 0, nulled = 0;
        function show(v) { return v === null ? 'NULL' : v; }
        function g(hl, ehl) {
          return { type: 'graph', directed: true, height: 34, label: 'foreign keys (child → parent)', nodes: [
            { id: 'c', label: 'customers', x: 14, y: 17, shape: 'box' }, { id: 'o', label: 'orders', x: 50, y: 17, shape: 'box' }, { id: 'i', label: 'order_items', x: 86, y: 17, shape: 'box' }],
            edges: [['o', 'c', label], ['i', 'o', 'CASCADE']], hl: hl || {}, ehl: ehl || {} };
        }
        function tables(ch, oh, ih) {
          return [
            { type: 'table', label: 'customers', columns: ['id', 'name'], rows: copyRows(C), hl: ch || {} },
            { type: 'table', label: 'orders (customer_id → customers ON DELETE ' + label + ')', columns: ['id', 'customer_id', 'status'], rows: copyRows(O).map(function (r) { return [r[0], show(r[1]), r[2]]; }), hl: oh || {} },
            { type: 'table', label: 'order_items (order_id → orders ON DELETE CASCADE)', columns: ['id', 'order_id', 'product'], rows: copyRows(I), hl: ih || {} }
          ];
        }
        function idxWhere(rows, col, val) { var h = {}; rows.forEach(function (r, k) { if (r[col] === val) h[k] = 'cur'; }); return h; }
        var frames = [];
        frames.push({ narr: 'Three tables in a chain. <b>orders.customer_id</b> uses <b>ON DELETE ' + label + '</b>; <b>order_items.order_id</b> uses ON DELETE CASCADE. (In SQLite this only works after <code>PRAGMA foreign_keys = ON;</code>.)', parts: [g()].concat(tables()) });
        var ci = -1; C.forEach(function (r, k) { if (r[0] === cid) ci = k; });
        if (ci < 0) {
          frames.push({ narr: '<code>DELETE FROM customers WHERE id = ' + cid + '</code> matches <b>no row</b>. Nothing to cascade.', parts: [{ type: 'code', lang: 'sql', code: 'DELETE FROM customers WHERE id = ' + cid + ';', hl: { 1: 'cur' } }].concat(tables()) });
          frames.push({ narr: '0 rows deleted — deleting a missing parent is not an error.', parts: [{ type: 'vars', vals: { deleted: 0 } }] });
          frames.push({ narr: 'Try customer 1 (two orders), 3 (one order) or 4 (no orders).', parts: [{ type: 'text', html: 'Example inputs: <code>1 cascade</code>, <code>1 setnull</code>, <code>1 restrict</code>, <code>4 restrict</code>' }] });
          return frames;
        }
        frames.push({ narr: 'Run <code>DELETE FROM customers WHERE id = ' + cid + '</code>. The target parent row is highlighted.', parts: [{ type: 'code', lang: 'sql', code: 'PRAGMA foreign_keys = ON;\nDELETE FROM customers WHERE id = ' + cid + ';', hl: { 2: 'cur' } }, g({ c: 'cur' })].concat(tables(one(ci, 'cur'))) });
        var kids = idxWhere(O, 1, cid), kidIds = O.filter(function (r) { return r[1] === cid; }).map(function (r) { return r[0]; });
        frames.push({ narr: 'Before removing it, the engine looks for <b>children</b>: <code>SELECT … FROM orders WHERE customer_id = ' + cid + '</code> (fast only if orders.customer_id is indexed). Found <b>' + kidIds.length + '</b> order(s)' + (kidIds.length ? ': ' + kidIds.join(', ') : '') + '.', parts: [g({ c: 'cur', o: kidIds.length ? 'cur' : '' }, { 'o-c': 'cur' })].concat(tables(one(ci, 'cur'), kids)) });
        if (!kidIds.length) {
          C.splice(ci, 1); dc++;
          frames.push({ narr: 'No children, so every action behaves the same: the customer row is simply deleted. ' + (act === 'restrict' ? 'RESTRICT only blocks when children exist.' : ''), parts: [g({}, {})].concat(tables()).concat([{ type: 'vars', label: 'rows removed', vals: { customers: dc, orders: 0, order_items: 0 } }]) });
          frames.push({ narr: 'Done: 1 row deleted in total.', parts: [{ type: 'vars', label: 'rows removed', vals: { customers: dc, orders: 0, order_items: 0 } }] });
          return frames;
        }
        if (act === 'restrict') {
          var bh = {}; Object.keys(kids).forEach(function (k) { bh[k] = 'bad'; });
          frames.push({ narr: '<span class="c-r">RESTRICT: children exist → "FOREIGN KEY constraint failed".</span> The DELETE statement is aborted.', parts: [{ type: 'code', lang: 'sql', code: 'DELETE FROM customers WHERE id = ' + cid + ';\n-- Error: FOREIGN KEY constraint failed', hl: { 1: 'bad', 2: 'bad' } }, g({ c: 'bad', o: 'bad' }, { 'o-c': 'bad' })].concat(tables(one(ci, 'bad'), bh)) });
          frames.push({ narr: 'Nothing changed — the whole statement rolled back. To delete this customer you must first deal with the orders (archive, reassign, or soft-delete the customer instead). For money records this "no" is exactly what you want.', parts: [g()].concat(tables()).concat([{ type: 'vars', label: 'rows removed', vals: { customers: 0, orders: 0, order_items: 0 }, hl: { customers: 'bad' } }]) });
          return frames;
        }
        if (act === 'setnull') {
          var sh = {}; O.forEach(function (r, k) { if (r[1] === cid) { r[1] = null; sh[k] = 'sel'; nulled++; } });
          frames.push({ narr: 'SET NULL: each child order keeps living, but its <b>customer_id becomes NULL</b> (purple). Their order_items are untouched. This only works because customer_id is nullable — with NOT NULL it would fail.', parts: [g({ o: 'sel' }, { 'o-c': 'sel' })].concat(tables(one(ci, 'cur'), sh)) });
          C.splice(ci, 1); dc++;
          frames.push({ narr: 'Now the customer row itself is deleted. Result: ' + nulled + ' order(s) kept as "anonymous" history.', parts: [g()].concat(tables({}, sh)).concat([{ type: 'vars', label: 'effect', vals: { 'customers deleted': dc, 'orders set NULL': nulled, 'items deleted': 0 }, hl: { 'orders set NULL': 'sel' } }]) });
          frames.push({ narr: 'Trade-off: history survives (good for revenue reports), but these orders no longer tell you who bought them. For GDPR that may be exactly the point.', parts: [{ type: 'text', html: 'SET NULL = keep the child, forget the parent. Needs a nullable FK column.' }] });
          return frames;
        }
        kidIds.forEach(function (oid) {
          var ih = idxWhere(I, 1, oid), oi = -1; O.forEach(function (r, k) { if (r[0] === oid) oi = k; });
          var ihb = {}; Object.keys(ih).forEach(function (k) { ihb[k] = 'bad'; });
          frames.push({ narr: 'CASCADE reaches order <b>' + oid + '</b>. It has its own children: order_items with order_id = ' + oid + ' (red). Those cascade too — deletes ripple down the whole tree.', parts: [g({ c: 'cur', o: 'bad', i: 'bad' }, { 'o-c': 'bad', 'i-o': 'bad' })].concat(tables(one(ci, 'cur'), one(oi, 'bad'), ihb)) });
          var n = I.length; I = I.filter(function (r) { return r[1] !== oid; }); di += n - I.length;
          O.splice(oi, 1); doo++;
          frames.push({ narr: 'Order ' + oid + ' and its ' + (n - I.length) + ' item(s) are gone.', parts: [g({ c: 'cur' })].concat(tables(one(ci, 'cur'))).concat([{ type: 'vars', label: 'rows removed so far', vals: { customers: dc, orders: doo, order_items: di } }]) });
        });
        C.splice(ci, 1); dc++;
        frames.push({ narr: 'Finally the customer row goes. <b>One DELETE removed ' + (dc + doo + di) + ' rows</b> across three tables. Powerful — and dangerous: a typo in the WHERE clause cascades just as fast. That is why money tables usually use RESTRICT plus soft deletes.', parts: [g()].concat(tables()).concat([{ type: 'vars', label: 'rows removed', vals: { customers: dc, orders: doo, order_items: di }, hl: { orders: 'bad', order_items: 'bad' } }]) });
        return frames;
      }
    }, {
      title: 'FK guard on INSERT (and what happens with PRAGMA foreign_keys OFF)',
      input: 'ON | 20,1; 21,9; 22,NULL; 23,2; 24,7',
      inputLabel: 'ON or OFF | orders "id,customer_id" separated by ; (customers 1, 2, 3 exist)',
      gen: function (input) {
        var p = String(input === undefined || input === null ? '' : input).split('|');
        if (p.length !== 2) throw new Error('Format: ON | 20,1; 21,9   (or OFF | ...)');
        var mode = p[0].trim().toUpperCase();
        if (mode !== 'ON' && mode !== 'OFF') throw new Error('First part must be ON or OFF');
        var specs = p[1].split(';').map(function (s) { return s.trim(); }).filter(function (s) { return s; });
        if (!specs.length || specs.length > 10) throw new Error('Give 1 to 10 orders like 20,1');
        var parents = [1, 2, 3], orders = [], frames = [], orphans = [];
        frames.push({ narr: 'Parent table <b>customers</b> holds ids 1, 2, 3. Child table <b>orders</b> declares <code>customer_id REFERENCES customers(id)</code>. Foreign key enforcement is <b>' + mode + '</b>.', parts: [
          { type: 'code', lang: 'sql', code: 'PRAGMA foreign_keys = ' + mode + ';\nCREATE TABLE orders (id INTEGER PRIMARY KEY,\n  customer_id INTEGER REFERENCES customers(id));', hl: { 1: mode === 'ON' ? 'ok' : 'bad' } },
          { type: 'set', label: 'customers.id (parent keys)', items: parents.slice() },
          { type: 'table', label: 'orders', columns: ['id', 'customer_id'], rows: [] }
        ] });
        specs.forEach(function (s) {
          var f = s.split(',').map(function (x) { return x.trim(); });
          if (f.length !== 2 || !/^\d+$/.test(f[0]) || !(/^\d+$/.test(f[1]) || /^null$/i.test(f[1]))) throw new Error('Each order must look like id,customer_id (customer_id may be NULL), got "' + s + '"');
          var id = Number(f[0]), cid = /^null$/i.test(f[1]) ? null : Number(f[1]);
          var exists = cid === null || parents.indexOf(cid) >= 0, dupId = orders.some(function (r) { return r[0] === id; });
          var row = [id, cid === null ? 'NULL' : cid], shown = copyRows(orders), hl = {}, narr, sh = {};
          if (cid !== null) sh[cid] = exists ? 'ok' : 'bad';
          if (dupId) { shown.push(row); hl[shown.length - 1] = 'bad'; narr = '<span class="c-r">Rejected: PRIMARY KEY id ' + id + ' already exists.</span>'; }
          else if (cid === null) { orders.push(row); shown = copyRows(orders); hl[shown.length - 1] = 'ok'; narr = 'customer_id is <b>NULL</b> → the FK is not checked at all (NULL points nowhere). Accepted. Add NOT NULL if every order needs a customer.'; }
          else if (exists) { orders.push(row); shown = copyRows(orders); hl[shown.length - 1] = 'ok'; narr = 'Lookup customer ' + cid + ' in the parent key index → found. <span class="c-g">Accepted.</span>'; }
          else if (mode === 'ON') { shown.push(row); hl[shown.length - 1] = 'bad'; narr = 'Lookup customer ' + cid + ' → <b>not found</b>. <span class="c-r">Rejected: FOREIGN KEY constraint failed.</span> The red row never lands.'; }
          else { orders.push(row); orphans.push(id); shown = copyRows(orders); hl[shown.length - 1] = 'bad'; narr = 'Customer ' + cid + ' does not exist, but enforcement is <b>OFF</b> → <span class="c-r">silently accepted as an orphan</span>. No error, no warning.'; }
          frames.push({ narr: 'INSERT order (' + id + ', ' + (cid === null ? 'NULL' : cid) + '): ' + narr, parts: [
            { type: 'code', lang: 'sql', code: 'INSERT INTO orders VALUES (' + id + ', ' + (cid === null ? 'NULL' : cid) + ');', hl: { 1: hl[shown.length - 1] === 'ok' ? 'ok' : 'bad' } },
            { type: 'set', label: 'customers.id (parent keys)', items: parents.slice(), hl: sh },
            { type: 'table', label: 'orders', columns: ['id', 'customer_id'], rows: shown, hl: hl }
          ] });
        });
        if (mode === 'OFF') {
          frames.push({ narr: orphans.length ? 'Detective tool: <code>PRAGMA foreign_key_check;</code> lists every row that breaks a declared FK — it works even while enforcement is off. Here: ' + orphans.length + ' orphan(s).' : 'No orphans this time — but nothing would have stopped them.', parts: [
            { type: 'code', lang: 'sql', code: 'PRAGMA foreign_key_check;', hl: { 1: 'cur' } },
            { type: 'table', label: 'foreign_key_check result', columns: ['table', 'rowid', 'parent'], rows: orphans.map(function (o) { return ['orders', o, 'customers']; }), hl: orphans.reduce(function (h, o, k) { h[k] = 'bad'; return h; }, {}) }
          ] });
        } else {
          frames.push({ narr: 'With enforcement ON the child table can never contain an orphan. Run the same input with <code>OFF | …</code> to see why <code>PRAGMA foreign_keys = ON;</code> is the first line of every SQLite connection.', parts: [
            { type: 'table', label: 'orders (final)', columns: ['id', 'customer_id'], rows: copyRows(orders) },
            { type: 'text', html: 'Postgres/MySQL InnoDB: always ON. SQLite: OFF by default, per connection.' }
          ] });
        }
        return frames;
      }
    }],
    examples: [
      { title: 'The SQLite trap: FKs declared but not enforced', html: `<p>Same schema, enforcement switched off: the orphan goes in without a sound. <code>PRAGMA foreign_key_check</code> finds it afterwards. Many ORMs and drivers turn the pragma on for you — check yours, and make it part of your connection setup.</p>`,
        code: lab(`PRAGMA foreign_keys = OFF;
CREATE TABLE parent (id INTEGER PRIMARY KEY);
CREATE TABLE child (id INTEGER PRIMARY KEY, parent_id INTEGER REFERENCES parent(id));
INSERT INTO parent VALUES (1);
INSERT INTO child VALUES (1, 1), (2, 999);      -- 999 does not exist: accepted while OFF
PRAGMA foreign_key_check;                       -- table, rowid, parent, fkid of each orphan
PRAGMA foreign_keys = ON;
-- INSERT INTO child VALUES (3, 777);           -- now: Error: FOREIGN KEY constraint failed
SELECT COUNT(*) AS orphans FROM child c LEFT JOIN parent p ON p.id = c.parent_id WHERE p.id IS NULL;`) },
      { title: 'ON UPDATE CASCADE with a natural key', html: `<p>Countries are keyed by their 2-letter code. When the code changes, ON UPDATE CASCADE rewrites every child row in the same statement. With surrogate integer ids you rarely need ON UPDATE at all — another argument for surrogates.</p>`,
        code: lab(`CREATE TABLE countries (code TEXT PRIMARY KEY, name TEXT NOT NULL);
CREATE TABLE cities (id INTEGER PRIMARY KEY, name TEXT NOT NULL,
                     country_code TEXT NOT NULL REFERENCES countries(code) ON UPDATE CASCADE ON DELETE RESTRICT);
INSERT INTO countries VALUES ('UK', 'United Kingdom'), ('IN', 'India');
INSERT INTO cities (name, country_code) VALUES ('London', 'UK'), ('Leeds', 'UK'), ('Pune', 'IN');
UPDATE countries SET code = 'GB' WHERE code = 'UK';     -- children follow automatically
SELECT name, country_code FROM cities ORDER BY id;`) },
      { title: 'Self-referencing FK: category tree with SET NULL', html: `<p>A table can reference itself. In the shop, <code>categories.parent_id → categories.id ON DELETE SET NULL</code>. Deleting "Electronics" turns "Phones" into a top-level category, and products in Electronics become uncategorised (their FK is also SET NULL) — nothing is lost.</p>`,
        code: shop(`DELETE FROM categories WHERE id = 1;   -- Electronics
SELECT id, name, quote(parent_id) AS parent_id FROM categories;
SELECT name, quote(category_id) AS category_id FROM products ORDER BY id;`) },
      { title: 'RESTRICT protects history → use soft delete instead', html: `<p><code>order_items.product_id</code> is ON DELETE RESTRICT, so a product that was ever sold cannot be deleted — old invoices would lose their line items. The standard answer is a <b>soft delete</b>: a flag (<code>is_active</code>) or timestamp (<code>deleted_at</code>) that hides the row from the catalogue but keeps it for history.</p>`,
        code: shop(`-- DELETE FROM products WHERE id = 3;   -- Error: FOREIGN KEY constraint failed (it was sold)
SELECT p.name, COUNT(oi.order_id) AS times_sold
FROM products p LEFT JOIN order_items oi ON oi.product_id = p.id
GROUP BY p.id ORDER BY p.id;
UPDATE products SET is_active = 0 WHERE id = 3;          -- soft delete instead
SELECT name, is_active FROM products WHERE is_active = 1; -- catalogue view`) }
    ],
    deepDive: `<h4>How cascades actually execute</h4>
<p>For each parent row deleted, the engine runs an internal lookup on the child table's FK column and applies the action to every match — recursively for multi-level cascades. With an index it is O(log N + k) per parent; without one it is a full scan of the child table <b>per parent row</b>, so deleting 10,000 customers from an unindexed child of 50M rows can take hours. Always index FK columns (or make them the leading column of a composite index).</p>
<h4>RESTRICT vs NO ACTION</h4>
<p>Both refuse to orphan children. <code>RESTRICT</code> checks immediately, row by row. <code>NO ACTION</code> checks at the end of the statement — or at COMMIT if the constraint is <code>DEFERRABLE INITIALLY DEFERRED</code>. That difference matters when one statement or transaction both deletes a parent and fixes its children (e.g. re-pointing them), or for circular references (employee.department_id ↔ department.manager_id) where you must insert both rows before either can be valid.</p>
<h4>Locks and blast radius</h4>
<p>A cascading delete runs inside one transaction and locks every row it touches. Deleting a tenant with 30 million descendant rows in one statement can bloat WAL/undo logs, stall replicas and block other writers. Production pattern: delete leaves first in batches (<code>DELETE ... WHERE id IN (SELECT id ... LIMIT 5000)</code> in a loop), then the parent. Some teams forbid CASCADE on large aggregates for exactly this reason.</p>
<h4>Cascades and triggers / application events</h4>
<p>Cascaded deletes happen inside the database, so your ORM's <code>on_delete</code> hooks, audit logs and search-index updaters never hear about the child rows. If other systems mirror those tables (Elasticsearch, caches, CDC consumers), make sure they listen to the database's change stream (CDC / logical replication) rather than to app events — or avoid CASCADE for those tables.</p>
<h4>When teams skip FKs entirely</h4>
<p>Some very large sharded systems (historically at companies running Vitess/MySQL at huge scale) drop database-level FKs because the parent and child live on different shards, and enforce integrity in application code plus offline orphan-detection jobs. That is a deliberate trade-off at extreme scale, not a default: for a single database, FKs are cheap insurance.</p>
<h4>SQLite specifics</h4>
<p><code>PRAGMA foreign_keys</code> is per connection and is a no-op inside a transaction. The parent key must be PRIMARY KEY or have a UNIQUE index, otherwise you get "foreign key mismatch". <code>PRAGMA foreign_key_list(t)</code> shows declared FKs, <code>PRAGMA foreign_key_check</code> finds violations, <code>PRAGMA defer_foreign_keys = ON</code> defers all checks to COMMIT for the current transaction.</p>`,
    aiEra: `<p><b>What AI changes:</b> agents that "clean up test data" or "delete this user's account" now issue DELETE statements directly. With CASCADE, one confident agent call can remove an entire customer history; with RESTRICT, the database says no and the agent has to ask. Your ON DELETE choices are now also <b>AI safety policy</b>.</p>
<p><b>Use AI as a partner:</b> give the assistant your schema and ask <code>"Draw the delete-dependency tree from customers. For each edge, tell me the current ON DELETE action and whether it is right for GDPR erasure, financial retention (7 years) and analytics."</code> Ask it to generate a pre-flight query that counts every row a given DELETE would cascade into, and run that before any destructive operation.</p>
<p><b>Where AI goes wrong:</b> it sprinkles <code>ON DELETE CASCADE</code> everywhere because it makes tests pass, forgets <code>PRAGMA foreign_keys = ON</code> for SQLite, and rarely adds indexes on FK columns. <b>What you must still own:</b> the data-retention policy per relationship, giving agents a least-privilege role (no DELETE on financial tables), and soft-delete patterns for anything the business may need to explain later.</p>`,
    problems: [{
      title: 'Cascading Delete: What Is Left?',
      level: 'Medium', tags: ['foreign keys', 'ON DELETE', 'cascade'], companies: ['Meta', 'Uber', 'Zomato'],
      statement: `<p>Schema: <code>orders.customer_id</code> → customers <b>CASCADE</b>; <code>order_items.order_id</code> → orders <b>CASCADE</b>; <code>wishlist.customer_id</code> → customers <b>CASCADE</b>; <code>reviews.customer_id</code> → customers <b>SET NULL</b>; <code>invoices.order_id</code> → orders <b>RESTRICT</b>.</p><p>Data: customers 1, 2, 3; orders 10, 11 (customer 1), 12, 13 (customer 2), 14 (customer 3); 7 order items; 4 reviews; 3 wishlist rows; invoices for orders 10 and 14.</p><p>(a) After <code>DELETE FROM customers WHERE id = 2</code>, how many rows remain in each table? (b) What happens with <code>DELETE FROM customers WHERE id = 1</code>? Write SQL that proves (a) and that predicts (b) <i>without</i> running the failing delete.</p>`,
      constraints: `<ul><li>Use SQLite with <code>PRAGMA foreign_keys = ON</code>.</li><li>The script must run without errors.</li></ul>`,
      example: `${H.table(['table', 'before', 'after deleting customer 2'], [['customers', '3', H.c('g', '2')], ['orders', '5', H.c('g', '3')], ['order_items', '7', H.c('g', '4')], ['wishlist', '3', H.c('g', '1')], ['reviews', '4', H.c('y', '4 (2 now anonymous)')], ['invoices', '2', '2']])}<p>(b) Customer 1 → cascades to order 10 → order 10 has an invoice with RESTRICT → <span class="c-r">the whole DELETE fails</span>, nothing is removed — even the rows the cascade had already "planned".</p>`,
      brute: {
        why: `<p>No foreign keys; the application "remembers" to clean up. Someone writes <code>DELETE FROM customers</code> and <code>DELETE FROM orders</code>, forgets order_items and wishlist. The result: orphaned items and wishlist rows pointing to nothing, reports that double-count, and no way for the database to tell you. And nobody notices the invoice that should have blocked the delete.</p>`,
        code: lab(`CREATE TABLE customers (id INTEGER PRIMARY KEY, name TEXT);
CREATE TABLE orders (id INTEGER PRIMARY KEY, customer_id INTEGER);
CREATE TABLE order_items (id INTEGER PRIMARY KEY, order_id INTEGER);
CREATE TABLE wishlist (id INTEGER PRIMARY KEY, customer_id INTEGER);
INSERT INTO customers VALUES (1,'Asha'),(2,'Ben'),(3,'Chen');
INSERT INTO orders VALUES (10,1),(11,1),(12,2),(13,2),(14,3);
INSERT INTO order_items VALUES (1,10),(2,10),(3,11),(4,12),(5,12),(6,13),(7,14);
INSERT INTO wishlist VALUES (1,1),(2,2),(3,2);
-- "app-side cascade" that forgets two tables:
DELETE FROM orders WHERE customer_id = 2;
DELETE FROM customers WHERE id = 2;
SELECT 'orphan order_items' AS problem, COUNT(*) AS n FROM order_items oi LEFT JOIN orders o ON o.id = oi.order_id WHERE o.id IS NULL
UNION ALL
SELECT 'orphan wishlist rows', COUNT(*) FROM wishlist w LEFT JOIN customers c ON c.id = w.customer_id WHERE c.id IS NULL;`)
      },
      mcq: { q: 'Deleting customer 1 cascades to order 10, which has an invoice with ON DELETE RESTRICT. What is deleted?', options: ['Customer 1 only', 'Customer 1 and order 11, but not order 10', 'Nothing — the whole statement fails and rolls back', 'Everything except the invoice'], answer: 2, explain: 'A statement is atomic. One RESTRICT violation anywhere in the cascade tree aborts the entire DELETE.' },
      hints: [
        '<p>Hint 1: Draw the tree from customers: orders (CASCADE) → order_items (CASCADE) and invoices (RESTRICT); wishlist (CASCADE); reviews (SET NULL).</p>',
        '<p>Hint 2: SET NULL keeps rows — only the FK value changes. RESTRICT anywhere below the deleted parent blocks the whole statement.</p>',
        '<p>Hint 3: Prove (a) with one <code>UNION ALL</code> count query after the delete. Predict (b) with a "pre-flight" join: invoices → orders WHERE customer_id = 1; any row means the delete will fail.</p>'
      ],
      solution: {
        approach: `<p>Declare every relationship with the right action, switch FKs on, delete customer 2 and count. For customer 1 run a pre-flight query that walks the same path the cascade would take and looks for RESTRICT blockers — the safe way to check a destructive operation before doing it.</p>`,
        code: lab(`PRAGMA foreign_keys = ON;
CREATE TABLE customers (id INTEGER PRIMARY KEY, name TEXT NOT NULL);
CREATE TABLE orders (id INTEGER PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE);
CREATE TABLE order_items (id INTEGER PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE, product TEXT NOT NULL);
CREATE TABLE wishlist (id INTEGER PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE, product TEXT NOT NULL);
CREATE TABLE reviews (id INTEGER PRIMARY KEY,
  customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL, rating INTEGER NOT NULL);
CREATE TABLE invoices (id INTEGER PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE RESTRICT);
CREATE INDEX idx_orders_cust ON orders(customer_id);
CREATE INDEX idx_items_order ON order_items(order_id);
CREATE INDEX idx_wish_cust ON wishlist(customer_id);
CREATE INDEX idx_reviews_cust ON reviews(customer_id);
CREATE INDEX idx_invoices_order ON invoices(order_id);

INSERT INTO customers VALUES (1,'Asha'),(2,'Ben'),(3,'Chen');
INSERT INTO orders VALUES (10,1),(11,1),(12,2),(13,2),(14,3);
INSERT INTO order_items VALUES (1,10,'Phone'),(2,10,'Cable'),(3,11,'Book'),(4,12,'Lamp'),(5,12,'Cable'),(6,13,'Mug'),(7,14,'Pen');
INSERT INTO wishlist VALUES (1,1,'Watch'),(2,2,'Shoes'),(3,2,'Bag');
INSERT INTO reviews VALUES (1,1,5),(2,2,4),(3,2,3),(4,3,5);
INSERT INTO invoices VALUES (500,10),(501,14);

-- (a) delete customer 2 and count what is left
DELETE FROM customers WHERE id = 2;
SELECT 'customers' AS tbl, COUNT(*) AS n FROM customers
UNION ALL SELECT 'orders', COUNT(*) FROM orders
UNION ALL SELECT 'order_items', COUNT(*) FROM order_items
UNION ALL SELECT 'wishlist', COUNT(*) FROM wishlist
UNION ALL SELECT 'reviews (total)', COUNT(*) FROM reviews
UNION ALL SELECT 'reviews (anonymous)', COUNT(*) FROM reviews WHERE customer_id IS NULL
UNION ALL SELECT 'invoices', COUNT(*) FROM invoices;

-- (b) pre-flight for customer 1: any RESTRICT blocker in the cascade path?
SELECT i.id AS blocking_invoice, o.id AS via_order
FROM invoices i JOIN orders o ON o.id = i.order_id
WHERE o.customer_id = 1;
-- one row returned => DELETE FROM customers WHERE id = 1 would fail and change nothing`),
        complexity: `<p>With FK indexes each cascaded row is found in O(log N); the delete touches O(k) rows where k is the size of the subtree (here 2 orders + 3 items + 2 wishlist + 2 review updates). The pre-flight query is one indexed join.</p>`,
        followUps: ['Change the design so a customer with invoices can still be "deleted" for GDPR (anonymise personal columns + soft delete).', 'How would you delete a customer with 5 million order_items without locking the tables for minutes?']
      }
    }]
  });
  /* ======================= TOPIC 5: ER DIAGRAMS ======================= */
  // Shared ER-diagram builder: turns "A 1-N B verb; ..." into frames that add entities and relationships one by one.
  function erFrames(input, opts) {
    opts = opts || {};
    var specs = String(input === undefined || input === null ? '' : input).split(';').map(function (s) { return s.trim(); }).filter(function (s) { return s; });
    if (!specs.length) throw new Error('Type relationships like: Customer 1-N Order places; Student N-M Course enrolls');
    if (specs.length > 9) throw new Error('Use at most 9 relationships');
    var SLOTS = [[14, 10], [50, 10], [86, 10], [14, 50], [50, 50], [86, 50], [32, 30], [68, 30], [86, 30], [14, 30]];
    var nodes = [], edges = [], tabs = {}, order = [], frames = [];
    function node(name) {
      for (var i = 0; i < nodes.length; i++) if (nodes[i].id === name) return nodes[i];
      if (nodes.length >= SLOTS.length) throw new Error('At most ' + SLOTS.length + ' entities (incl. junction tables)');
      var used = nodes.map(function (n) { return n.x + ',' + n.y; }), s = null;
      for (var k = 0; k < SLOTS.length; k++) if (used.indexOf(SLOTS[k][0] + ',' + SLOTS[k][1]) < 0) { s = SLOTS[k]; break; }
      var n = { id: name, label: name, x: s[0], y: s[1], shape: 'box' };
      nodes.push(n); tabs[name] = { cols: ['id PK'], fks: [] }; order.push(name);
      return n;
    }
    function snakeId(n) { return n.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase() + '_id'; }
    function tagFor() { var t = {}; order.forEach(function (n) { t[n] = tabs[n].fks.length ? 'FK ' + tabs[n].fks.join(', ') : 'PK id'; }); return t; }
    function tableRows() { return order.map(function (n) { return [n, tabs[n].cols.join(', '), tabs[n].fks.length ? tabs[n].fks.map(function (f) { return f + ' → ' + tabs[n].ref[f]; }).join('; ') : '—']; }); }
    function graph(hl, ehl) { return { type: 'graph', directed: false, height: 60, label: opts.label || 'ER diagram', nodes: nodes.map(function (n) { return { id: n.id, label: n.label, x: n.x, y: n.y, shape: 'box' }; }), edges: edges.map(function (e) { return e.slice(); }), hl: hl || {}, ehl: ehl || {}, tags: tagFor() }; }
    function tbl(hl) { return { type: 'table', label: 'tables generated so far', columns: ['table', 'columns', 'foreign keys'], rows: tableRows(), hl: hl || {} }; }
    function addFk(child, parent, extra) {
      var col = snakeId(parent); tabs[child].ref = tabs[child].ref || {};
      if (tabs[child].fks.indexOf(col) < 0) { tabs[child].fks.push(col); tabs[child].cols.push(col + (extra ? ' ' + extra : '')); tabs[child].ref[col] = parent + '.id'; }
      return col;
    }
    frames.push({ narr: opts.intro || 'We build the ER diagram one relationship at a time. Every <b>entity</b> (a noun the business cares about) becomes a box and later a table; every <b>relationship</b> (a verb) becomes a labelled line, and its <b>cardinality</b> decides where the foreign key goes.', parts: [{ type: 'text', html: 'Input: ' + specs.map(function (s) { return '<code>' + H.esc(s) + '</code>'; }).join(' · ') }, { type: 'table', label: 'mapping rules', columns: ['cardinality', 'meaning', 'becomes'], rows: [['1-N', 'one A has many B', 'FK in B → A'], ['1-1', 'one A has at most one B', 'FK in B → A + UNIQUE'], ['N-M', 'many A ↔ many B', 'junction table A_B with two FKs']] }] });
    specs.forEach(function (sp) {
      var m = sp.match(/^([A-Za-z]\w*)\s+(1-1|1-N|N-1|N-M|M-N)\s+([A-Za-z]\w*)\s*(.*)$/i);
      if (!m) throw new Error('Could not read "' + sp + '". Format: EntityA 1-N EntityB verb (cardinality 1-1, 1-N, N-1 or N-M)');
      var a = m[1], card = m[2].toUpperCase(), b = m[3], verb = m[4] || 'relates to';
      if (card === 'N-1') { var t = a; a = b; b = t; card = '1-N'; }
      if (card === 'M-N') card = 'N-M';
      if (a === b && card !== '1-N') throw new Error('Self-relationships are supported as 1-N only (e.g. Employee 1-N Employee manages)');
      var fresh = [];
      [a, b].forEach(function (n) { if (!nodes.some(function (x) { return x.id === n; })) { node(n); fresh.push(n); } });
      if (fresh.length) {
        var fh = {}; fresh.forEach(function (n) { fh[n] = 'ok'; });
        frames.push({ narr: 'New entit' + (fresh.length > 1 ? 'ies' : 'y') + ': <b>' + fresh.join('</b>, <b>') + '</b>. Each one becomes a table with a surrogate primary key <code>id</code>.', parts: [graph(fh), tbl(fresh.reduce(function (h, n) { h[order.indexOf(n)] = 'ok'; return h; }, {}))] });
      }
      var rh = {}; rh[a] = 'cur'; rh[b] = 'cur';
      if (card === '1-N') {
        var col = a === b ? 'parent_id' : addFk(b, a);
        if (a === b) { tabs[a].ref = tabs[a].ref || {}; if (tabs[a].fks.indexOf(col) < 0) { tabs[a].fks.push(col); tabs[a].cols.push(col); tabs[a].ref[col] = a + '.id'; } }
        if (a !== b) edges.push([a, b, '1 : N ' + verb]);
        var eh = {}; eh[a + '-' + b] = 'cur';
        frames.push({ narr: '<b>' + a + ' 1-N ' + b + '</b> ("one ' + a + ' ' + verb + ' many ' + b + '"). Rule: the foreign key goes on the <b>many</b> side → <code>' + b + '.' + col + '</code> references ' + a + '.id.' + (a === b ? ' This is a <b>self-reference</b>: the FK points back to the same table (a tree/hierarchy).' : ' Why not the other way? ' + a + ' would need a list of ids in one cell — that breaks first normal form.'), parts: [graph(rh, eh), tbl(one(order.indexOf(b), 'cur'))] });
      } else if (card === '1-1') {
        var c1 = addFk(b, a, 'UNIQUE');
        edges.push([a, b, '1 : 1 ' + verb]);
        var e1 = {}; e1[a + '-' + b] = 'cur';
        frames.push({ narr: '<b>' + a + ' 1-1 ' + b + '</b>. Put the FK on the dependent side (' + b + ') and make it <b>UNIQUE</b> → <code>' + b + '.' + c1 + ' UNIQUE</code>. UNIQUE is what turns "many" into "at most one". (Alternative: ' + b + ' uses ' + a + '\'s id as its own primary key.)', parts: [graph(rh, e1), tbl(one(order.indexOf(b), 'cur'))] });
      } else {
        edges.push([a, b, 'N : M ' + verb]);
        var e2 = {}; e2[a + '-' + b] = 'cur';
        frames.push({ narr: '<b>' + a + ' N-M ' + b + '</b>: a ' + a + ' ' + verb + ' many ' + b + ', and a ' + b + ' has many ' + a + '. Neither table can hold the FK (it would need a list). We need a third table…', parts: [graph(rh, e2), tbl()] });
        var jn = a + '_' + b, na = node(jn);
        var A = nodes.filter(function (x) { return x.id === a; })[0], B = nodes.filter(function (x) { return x.id === b; })[0];
        var mx = Math.round((A.x + B.x) / 2), my = Math.round((A.y + B.y) / 2);
        if (!nodes.some(function (x) { return x.id !== jn && Math.abs(x.x - mx) < 14 && Math.abs(x.y - my) < 10; })) { na.x = mx; na.y = my; }
        edges = edges.filter(function (e) { return !(e[0] === a && e[1] === b); });
        edges.push([a, jn, '1 : N']); edges.push([jn, b, 'N : 1']);
        addFk(jn, a); addFk(jn, b);
        tabs[jn].cols[0] = 'PK (' + snakeId(a) + ', ' + snakeId(b) + ')';
        var jh = {}; jh[jn] = 'ok'; var je = {}; je[a + '-' + jn] = 'ok'; je[jn + '-' + b] = 'ok';
        frames.push({ narr: 'Resolved with a <b>junction table</b> <code>' + jn + '</code>: two FKs and a composite primary key (' + snakeId(a) + ', ' + snakeId(b) + '), so the same pair cannot be stored twice. Facts about the pair itself (a grade, a date, a quantity) live here.', parts: [graph(jh, je), tbl(one(order.indexOf(jn), 'ok'))] });
      }
    });
    frames.push({ narr: opts.outro || 'Finished diagram: ' + order.length + ' tables. Read every line as two sentences (one per direction) and check them with the business — most schema bugs are a cardinality someone assumed instead of asked.', parts: [graph(), tbl()] });
    return frames;
  }

  topics.push({
    title: 'ER Diagrams: Entities, Relationships & Cardinality',
    analogy: `<p>An ER diagram is the <b>architect's floor plan</b> before the house is built. Rooms are <b>entities</b> (Kitchen, Bedroom), doors are <b>relationships</b> ("kitchen opens into dining room"), and the plan notes how many: "one hallway leads to many rooms". Moving a wall on paper costs an eraser; moving it after the concrete sets costs a fortune. Same with tables and millions of rows.</p>`,
    explain: `<p>An <b>Entity-Relationship (ER) diagram</b> is a picture of the data a business cares about, drawn before writing DDL.</p>
<ul>
<li><b>Entity</b> — a thing you store many of: Customer, Order, Product. (Nouns in the requirements.) Becomes a <b>table</b>.</li>
<li><b>Attribute</b> — a fact about it: name, price, placed_at. Becomes a <b>column</b>. The identifying attribute is the <b>key</b>.</li>
<li><b>Relationship</b> — how entities connect: Customer <i>places</i> Order. (Verbs.) Becomes a <b>foreign key</b> or a <b>junction table</b>.</li>
<li><b>Cardinality</b> — how many on each side: 1-1, 1-N (one-to-many), N-M (many-to-many).</li>
<li><b>Participation / optionality</b> — must it exist? "Every order <b>must</b> have a customer" (mandatory → NOT NULL) vs "a customer <b>may</b> have no orders" (optional).</li>
</ul>
<h4>Crow's foot notation (the one you'll see at work)</h4>
${H.table(['Symbol at the line end', 'Read as', 'In SQL'], [
  ['<code>||</code>', 'exactly one', 'FK NOT NULL'],
  ['<code>o|</code>', 'zero or one', 'nullable FK, or FK + UNIQUE'],
  ['<code>|&lt;</code>', 'one or many', 'needs app logic / trigger to force "at least one"'],
  ['<code>o&lt;</code>', 'zero or many', 'plain FK on the child']
])}
<p>Example: <code>Customer ||——o&lt; Order</code> reads "each order belongs to exactly one customer; a customer has zero or more orders". (Textbooks also use <b>Chen notation</b>: rectangles for entities, diamonds for relationships, ovals for attributes. Same ideas, more ink.)</p>
<h4>Mapping an ER diagram to tables — the five rules</h4>
${H.table(['ER construct', 'Table design'], [
  ['Entity', 'table with a primary key'],
  ['1-N relationship', 'FK column on the <b>N</b> (many) side'],
  ['1-1 relationship', 'FK + <code>UNIQUE</code> on the dependent side (or shared primary key)'],
  ['N-M relationship', '<b>junction table</b> with two FKs + composite PK; relationship attributes (grade, qty) go here'],
  ['Multi-valued attribute (many phones)', 'separate child table (1-N)'],
  ['Weak entity (OrderLine has no meaning without Order)', 'composite PK including the owner\'s FK, ON DELETE CASCADE']
])}`,
    clues: [
      '"design the database for …" / "draw the ER diagram" → list nouns (entities) and verbs (relationships) first',
      '"a student can take many courses and a course has many students" → N-M → junction table',
      '"each user has exactly one profile" → 1-1 → FK + UNIQUE or shared PK',
      '"store the grade / quantity / role for each pair" → attribute of the relationship → column in the junction table',
      '"employees have managers who are employees" → self-referencing FK (recursive relationship)',
      '"a user can have several phone numbers" → multi-valued attribute → child table, not phone1/phone2/phone3',
      '"comments on posts AND on photos" → polymorphic association → separate FKs + CHECK, or a supertype table'
    ],
    code: [
      lab(`PRAGMA foreign_keys = ON;
-- ER: Department 1-N Professor, Professor 1-N Course, Student N-M Course (with grade), Student 1-1 IdCard
CREATE TABLE departments (id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE);
CREATE TABLE professors  (id INTEGER PRIMARY KEY, name TEXT NOT NULL,
                          department_id INTEGER NOT NULL REFERENCES departments(id) ON DELETE RESTRICT);
CREATE TABLE courses     (id INTEGER PRIMARY KEY, code TEXT NOT NULL UNIQUE, title TEXT NOT NULL,
                          professor_id INTEGER REFERENCES professors(id) ON DELETE SET NULL);   -- optional: o|
CREATE TABLE students    (id INTEGER PRIMARY KEY, name TEXT NOT NULL);
CREATE TABLE id_cards    (student_id INTEGER PRIMARY KEY                                       -- shared PK = 1-1
                            REFERENCES students(id) ON DELETE CASCADE,
                          card_no TEXT NOT NULL UNIQUE, issued_on TEXT NOT NULL);
CREATE TABLE enrollments (                                                                      -- N-M junction
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  course_id  INTEGER NOT NULL REFERENCES courses(id)  ON DELETE CASCADE,
  grade      TEXT CHECK (grade IN ('A', 'B', 'C', 'D', 'F')),   -- NULL = not graded yet
  PRIMARY KEY (student_id, course_id)
);
CREATE INDEX idx_enrollments_course ON enrollments(course_id);   -- PK already covers student_id lookups

INSERT INTO departments VALUES (1, 'Computer Science'), (2, 'Mathematics');
INSERT INTO professors VALUES (1, 'Dr. Rao', 1), (2, 'Dr. Lee', 2);
INSERT INTO courses VALUES (1, 'CS101', 'Intro to Databases', 1), (2, 'MA201', 'Linear Algebra', 2), (3, 'CS102', 'Algorithms', 1);
INSERT INTO students VALUES (1, 'Asha'), (2, 'Ben'), (3, 'Chen');
INSERT INTO id_cards VALUES (1, 'CARD-001', '2026-08-01'), (2, 'CARD-002', '2026-08-01');
INSERT INTO enrollments VALUES (1, 1, 'A'), (1, 2, 'B'), (2, 1, NULL), (3, 3, 'A');

SELECT s.name AS student, c.code, p.name AS professor, d.name AS department, COALESCE(e.grade, '-') AS grade
FROM enrollments e
JOIN students s    ON s.id = e.student_id
JOIN courses c     ON c.id = e.course_id
LEFT JOIN professors p ON p.id = c.professor_id
LEFT JOIN departments d ON d.id = p.department_id
ORDER BY s.name, c.code;`, 'ER diagram → tables (university)')
    ],
    codeTitle: ['From ER diagram to DDL'],
    viz: {
      title: 'Build an ER diagram entity by entity (type your own!)',
      input: 'Department 1-N Professor employs; Professor 1-N Course teaches; Student N-M Course enrolls in; Student 1-1 IdCard holds',
      inputLabel: 'Relationships "A 1-N B verb" separated by ; (cardinality 1-1, 1-N, N-1, N-M)',
      gen: function (input) { return erFrames(input); }
    },
    examples: [
      { title: 'Reading cardinality both ways (the interview habit)', html: `<p>Every line on an ER diagram is <b>two sentences</b>. Say both out loud and the FK placement falls out:</p>${H.table(['Relationship', 'Left → right', 'Right → left', 'Design'], [
        ['Customer — Order', 'a customer places <b>many</b> orders', 'an order belongs to <b>one</b> customer', '1-N: orders.customer_id'],
        ['Order — Product', 'an order contains <b>many</b> products', 'a product appears in <b>many</b> orders', 'N-M: order_items'],
        ['User — Profile', 'a user has <b>one</b> profile', 'a profile belongs to <b>one</b> user', '1-1: profiles.user_id UNIQUE'],
        ['Employee — Employee', 'a manager manages <b>many</b>', 'an employee has <b>one</b> manager', 'self 1-N: employees.manager_id']])}<p>If either sentence is unclear, ask the interviewer — that question itself earns points.</p>` },
      { title: 'Self-referencing relationship: employees and managers', html: `<p>One table plays both roles. The CEO has <code>manager_id = NULL</code>. A self-join answers "who reports to whom"; a recursive CTE (SQL 5) walks the whole chain.</p>`,
        code: lab(`PRAGMA foreign_keys = ON;
CREATE TABLE employees (
  id INTEGER PRIMARY KEY, name TEXT NOT NULL,
  manager_id INTEGER REFERENCES employees(id) ON DELETE SET NULL,
  CHECK (manager_id IS NULL OR manager_id <> id)        -- nobody manages themselves
);
INSERT INTO employees VALUES (1, 'Maya (CEO)', NULL), (2, 'Ravi', 1), (3, 'Sara', 1), (4, 'Tom', 2), (5, 'Uma', 2);
SELECT e.name AS employee, COALESCE(m.name, '-') AS manager
FROM employees e LEFT JOIN employees m ON m.id = e.manager_id ORDER BY e.id;`) },
      { title: 'Multi-valued attribute: phone1, phone2, phone3 is a smell', html: `<p>"A contact can have several phone numbers" tempts you to add <code>phone1, phone2, phone3</code>. What about a 4th? How do you search "who has 98450-…"? Three ORs. The ER answer: phone is a <b>multi-valued attribute</b> → its own 1-N child table, with a type and a UNIQUE per contact.</p>`,
        code: lab(`PRAGMA foreign_keys = ON;
CREATE TABLE contacts (id INTEGER PRIMARY KEY, name TEXT NOT NULL);
CREATE TABLE contact_phones (
  contact_id INTEGER NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  kind  TEXT NOT NULL CHECK (kind IN ('mobile', 'home', 'work')),
  phone TEXT NOT NULL,
  PRIMARY KEY (contact_id, phone)
);
INSERT INTO contacts VALUES (1, 'Asha'), (2, 'Ben');
INSERT INTO contact_phones VALUES (1, 'mobile', '+91-98450-00001'), (1, 'work', '+91-80-4000-0001'), (2, 'mobile', '+44-7700-900002');
SELECT c.name, COUNT(*) AS phones, group_concat(p.kind || ':' || p.phone, ' | ') AS numbers
FROM contacts c JOIN contact_phones p ON p.contact_id = c.id GROUP BY c.id;`) },
      { title: 'Inheritance (ISA): card payments vs UPI payments', html: `<p>A Payment is either a CardPayment (last4, network) or a UpiPayment (vpa). Three classic mappings:</p>${H.table(['Strategy', 'Shape', 'Pros / cons'], [
        ['Single table', 'one payments table, nullable subtype columns + <code>kind</code> + CHECK', 'simple, fast; many NULLs, CHECK gets long'],
        ['Class table', 'payments (common) + card_payments / upi_payments sharing the PK', 'clean, normalized; needs joins'],
        ['Concrete table', 'card_payments and upi_payments, no shared table', 'no joins; "all payments" needs UNION, ids may clash']])}<p>The snippet shows the single-table version, with a CHECK making sure each kind fills exactly its own columns.</p>`,
        code: lab(`CREATE TABLE payments (
  id INTEGER PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('card', 'upi')),
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  card_last4 TEXT, card_network TEXT, upi_vpa TEXT,
  CHECK ((kind = 'card' AND card_last4 IS NOT NULL AND card_network IS NOT NULL AND upi_vpa IS NULL)
      OR (kind = 'upi'  AND upi_vpa IS NOT NULL AND card_last4 IS NULL AND card_network IS NULL))
);
INSERT INTO payments VALUES (1, 'card', 129900, '4242', 'VISA', NULL), (2, 'upi', 49900, NULL, NULL, 'asha@okbank');
INSERT OR IGNORE INTO payments VALUES (3, 'upi', 100, '4242', NULL, 'mix@bank');   -- mixed columns: rejected
SELECT * FROM payments;`) },
      { title: 'Weak entity: order lines numbered within an order', html: `<p>Line 1, line 2, line 3 restart for every order — "line 2" means nothing on its own. That is a <b>weak entity</b>: its key is (owner key, partial key) = <code>(order_id, line_no)</code>, and it dies with its owner (CASCADE).</p>`,
        code: lab(`PRAGMA foreign_keys = ON;
CREATE TABLE orders (id INTEGER PRIMARY KEY, placed_at TEXT NOT NULL);
CREATE TABLE order_lines (
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  line_no  INTEGER NOT NULL CHECK (line_no >= 1),
  item     TEXT NOT NULL,
  PRIMARY KEY (order_id, line_no)
);
INSERT INTO orders VALUES (1, '2026-10-01'), (2, '2026-10-02');
INSERT INTO order_lines VALUES (1, 1, 'Phone'), (1, 2, 'Case'), (2, 1, 'Book');   -- line 1 exists twice, in different orders
SELECT * FROM order_lines ORDER BY order_id, line_no;`) }
    ],
    deepDive: `<h4>Conceptual → logical → physical</h4>
<p>Data modelling has three layers. <b>Conceptual</b>: entities and relationships in business words, no types (whiteboard). <b>Logical</b>: attributes, keys, cardinalities, normalized (tool-independent). <b>Physical</b>: actual DDL for one engine — types, indexes, partitioning, storage. In interviews, spend 2 minutes conceptual, 5 logical, then talk physical only where it matters (indexes for the hot queries).</p>
<h4>Ternary relationships</h4>
<p>"A supplier supplies a part to a project" is a three-way fact. Splitting it into three binary relationships (supplier–part, part–project, supplier–project) loses information: you can no longer tell which supplier supplied which part <i>to which</i> project. Model it as one junction table with three FKs, and think carefully about which subset is the key.</p>
<h4>Cardinality constraints SQL cannot express directly</h4>
<p>A FK gives "zero or one parent" (nullable) or "exactly one" (NOT NULL). It cannot force "at least one child" (an order must have ≥ 1 line) or "at most 5 children". Options: create parent and first child in one transaction with a deferred check, a trigger, a counter column with a CHECK, or app logic. Say this out loud in interviews — it shows you know where declarative integrity ends.</p>
<h4>Polymorphic associations</h4>
<p>Rails-style <code>commentable_type + commentable_id</code> cannot have a foreign key, so orphans are guaranteed eventually. Better: one nullable FK per target (<code>post_id</code>, <code>photo_id</code>) with <code>CHECK (exactly one is not NULL)</code>, or a shared supertype table (<code>commentables</code>) that posts and photos both reference.</p>
<h4>Diagrams as code</h4>
<p>Teams keep ER diagrams next to the code with Mermaid <code>erDiagram</code>, dbdiagram.io (DBML), PlantUML, or generate them from the live database (SchemaSpy, DBeaver, DataGrip). A diagram generated from production can't drift out of date — a hand-drawn one usually does.</p>
<h4>Surrogate keys in the diagram</h4>
<p>Conceptual diagrams use natural identifiers ("a course is identified by its code"). The physical design usually adds surrogate ids but must keep the natural one as <code>UNIQUE NOT NULL</code> — otherwise you lose the business rule that two courses cannot share a code.</p>`,
    aiEra: `<p><b>What AI changes:</b> LLMs are genuinely good at the first draft: paste a requirements paragraph and get entities, relationships and Mermaid <code>erDiagram</code> code in seconds. That turns ER modelling from a drawing exercise into a <b>review</b> exercise. Your value is spotting the wrong cardinality, the missing entity, and the rule the model invented.</p>
<p><b>Use AI as a partner:</b> <code>"From these requirements, list entities, relationships and cardinalities as a table. For each relationship, write both directional sentences and flag every cardinality you had to assume."</code> Then challenge it: <code>"What changes if a course can be co-taught by two professors?"</code> — watch 1-N become N-M. Ask for the Mermaid diagram and paste it into your docs.</p>
<p><b>Where AI goes wrong:</b> it collapses N-M into 1-N when the text is ambiguous, models relationship attributes on the wrong entity (grade on Student), invents entities that are really attributes, and loves polymorphic <code>*_type</code> columns. <b>What you must still own:</b> asking the business the cardinality questions, and knowing the ER → table mapping rules cold so you can verify the output in seconds.</p>`,
    problems: [{
      title: 'Model Students, Courses & Enrolments',
      level: 'Medium', tags: ['ER modelling', 'many-to-many', 'junction table'], companies: ['Coursera', 'Byju\'s', 'Google'],
      statement: `<p>Requirements: students enrol in courses; a student can take many courses and a course has many students. Each enrolment records the enrolment date and a grade (A–F, empty until graded). A student cannot enrol twice in the same course. Write the DDL and a query listing each course with its number of students and how many have an A.</p>`,
      constraints: `<ul><li>No duplicate (student, course) pairs.</li><li>Deleting a student removes their enrolments; a course with enrolments cannot be deleted.</li><li>Grade must be A, B, C, D, F or NULL.</li></ul>`,
      example: `<p>Asha → CS101 (A), MA201 (B); Ben → CS101 (not graded); Chen → CS102 (A).</p>${H.table(['course', 'students', 'a_grades'], [['CS101', '2', '1'], ['CS102', '1', '1'], ['MA201', '1', '0']])}`,
      brute: {
        why: `<p>Storing the course list in the student row (<code>courses = 'CS101,MA201'</code>) — a "repeating group". There is nowhere to put a grade per course, no FK can check the codes, and searching uses <code>LIKE '%CS10%'</code> which also matches CS101 <i>and</i> CS102 — false positives. Counting students per course requires string parsing.</p>`,
        code: lab(`CREATE TABLE students_bad (id INTEGER PRIMARY KEY, name TEXT, courses TEXT);
INSERT INTO students_bad VALUES (1, 'Asha', 'CS101,MA201'), (2, 'Ben', 'CS101'), (3, 'Chen', 'CS102');
-- "Who takes CS10?" (a course that does not exist) -> matches everyone with CS101 or CS102
SELECT name FROM students_bad WHERE courses LIKE '%CS10%';
-- grades? enrolment dates? there is simply no place to store them.`)
      },
      mcq: { q: 'Where does the grade column belong?', options: ['students', 'courses', 'the enrollments junction table', 'a separate grades table with only a grade column'], answer: 2, explain: 'A grade describes one (student, course) pair — an attribute of the relationship, so it lives in the junction table.' },
      hints: [
        '<p>Hint 1: Read both directions: a student takes many courses, a course has many students → N-M.</p>',
        '<p>Hint 2: N-M needs a junction table <code>enrollments(student_id, course_id, ...)</code> with a composite PRIMARY KEY — that also blocks double enrolment.</p>',
        '<p>Hint 3: student FK → ON DELETE CASCADE, course FK → ON DELETE RESTRICT, grade CHECK IN (...). Count with <code>COUNT(*)</code> and <code>SUM(grade = \'A\')</code> after a LEFT JOIN from courses.</p>'
      ],
      solution: {
        approach: `<p>Three tables: two entities plus a junction table that holds the relationship's own attributes (date, grade). The composite PK enforces "no double enrolment", the two FKs carry different delete policies, and the CHECK restricts grades.</p>`,
        code: lab(`PRAGMA foreign_keys = ON;
CREATE TABLE students (id INTEGER PRIMARY KEY, name TEXT NOT NULL);
CREATE TABLE courses  (id INTEGER PRIMARY KEY, code TEXT NOT NULL UNIQUE, title TEXT NOT NULL);
CREATE TABLE enrollments (
  student_id  INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  course_id   INTEGER NOT NULL REFERENCES courses(id)  ON DELETE RESTRICT,
  enrolled_on TEXT    NOT NULL DEFAULT (date('now')),
  grade       TEXT    CHECK (grade IN ('A', 'B', 'C', 'D', 'F')),
  PRIMARY KEY (student_id, course_id)
);
CREATE INDEX idx_enrollments_course ON enrollments(course_id);

INSERT INTO students VALUES (1, 'Asha'), (2, 'Ben'), (3, 'Chen');
INSERT INTO courses VALUES (1, 'CS101', 'Databases'), (2, 'MA201', 'Linear Algebra'), (3, 'CS102', 'Algorithms');
INSERT INTO enrollments (student_id, course_id, enrolled_on, grade) VALUES
  (1, 1, '2026-08-01', 'A'), (1, 2, '2026-08-01', 'B'), (2, 1, '2026-08-03', NULL), (3, 3, '2026-08-02', 'A');
INSERT OR IGNORE INTO enrollments (student_id, course_id) VALUES (1, 1);   -- double enrolment: blocked by PK

SELECT c.code,
       COUNT(e.student_id)                   AS students,
       COALESCE(SUM(e.grade = 'A'), 0)       AS a_grades
FROM courses c
LEFT JOIN enrollments e ON e.course_id = c.id
GROUP BY c.id
ORDER BY c.code;`),
        complexity: `<p>Enrol/check duplicate: O(log N) via the composite PK index. "Courses of a student" uses the PK prefix; "students of a course" uses idx_enrollments_course. The report is one O(E) pass over enrollments.</p>`,
        followUps: ['Add multiple attempts at the same course (retakes) — what happens to the primary key?', 'Add a seat limit per course. Can a CHECK enforce it? (no — needs a counter column or trigger)']
      }
    }]
  });
  /* ======================= TOPIC 6: E-COMMERCE SCHEMA ======================= */
  topics.push({
    title: 'Modelling a Real Schema: E-commerce from Requirements to DDL',
    analogy: `<p>Designing a schema from requirements is like <b>planning a restaurant kitchen from the menu</b>. The menu (requirements) tells you which stations you need (entities), which dishes pass between them (relationships), where the fridge must be locked (constraints), and which shelf must be within arm's reach because the chef grabs it 500 times a night (indexes for the hot queries). Nobody starts by buying pans.</p>`,
    explain: `<p>Interviewers say "design the database for an online store" and watch <b>how</b> you get there. Use the same 7-step recipe every time:</p>
<ol>
<li><b>Read requirements → underline nouns and verbs.</b> Nouns become entity candidates, verbs relationships.</li>
<li><b>Entities + keys.</b> Customer, Address, Category, Product, Order, OrderItem, Payment, Review. Surrogate <code>id</code> + UNIQUE natural keys (email, SKU).</li>
<li><b>Relationships + cardinality</b>, both directions. Order ↔ Product is N-M → <code>order_items</code>.</li>
<li><b>Attributes + types</b>: money in integer cents, timestamps in UTC, status as a constrained set.</li>
<li><b>Constraints</b>: NOT NULL for mandatory, CHECK for business rules (qty &gt; 0, rating 1–5, stock ≥ 0), UNIQUE for "only one".</li>
<li><b>Delete policies</b> per FK: CASCADE for parts, SET NULL for optional history, RESTRICT for money.</li>
<li><b>Indexes for access patterns</b>: "my orders" → <code>orders(customer_id, placed_at)</code>; "products in category" → <code>products(category_id)</code>.</li>
</ol>
<h4>The decisions that separate good answers from great ones</h4>
${H.table(['Requirement / risk', 'Decision', 'Why'], [
  ['prices change over time', 'copy <code>unit_price_cents</code> into order_items', 'an old invoice must never change when the catalogue does'],
  ['shipping address can be edited later', 'snapshot the address on the order (or reference an immutable address row)', 'parcels already shipped went to the old address'],
  ['a product that was sold is "deleted"', 'soft delete (<code>is_active = 0</code>) + RESTRICT on order_items', 'history and accounting stay intact'],
  ['one review per customer per product', '<code>UNIQUE (product_id, customer_id)</code>', 'stops spam and double ratings'],
  ['stock must never go negative', '<code>CHECK (stock &gt;= 0)</code> + conditional UPDATE', 'two shoppers buying the last item cannot both win'],
  ['order status', '<code>CHECK (status IN (...))</code> or a lookup table', 'no typos like \'shiped\''],
  ['payments can fail and be retried', 'Order 1-N Payment, with status', 'one order, several attempts/refunds'],
  ['order total', 'compute from items (or store + verify)', 'derived data can drift if stored blindly']
])}
<p>The <b>shop</b> sample database in this module is exactly this design — every runnable query here uses it.</p>`,
    clues: [
      '"design the schema for Amazon / Flipkart / a food-delivery app" → 7-step recipe; start with entities and cardinalities',
      '"the product price changed and old invoices changed too" → snapshot unit price into order_items',
      '"customer deleted, order history disappeared" → RESTRICT / soft delete for financial tables',
      '"two people bought the last item" → <code>CHECK (stock &gt;= 0)</code> + <code>UPDATE ... WHERE stock &gt;= ?</code>',
      '"show a user\'s recent orders fast" → composite index <code>(customer_id, placed_at)</code>',
      '"products have different attributes per category" → core columns + JSON specs (or EAV, carefully)',
      '"support multiple currencies / sellers / warehouses" → extend entities, don\'t widen columns'
    ],
    code: [
      shop(`-- 1) What tables exist, and how many rows each? (the shop DB = this topic's design)
SELECT name AS table_name FROM sqlite_master WHERE type = 'table' ORDER BY name;

-- 2) A real business query across the schema: order totals with customer and city
SELECT o.id AS order_id, c.name AS customer, o.status,
       COALESCE(a.city, '(no address)') AS ship_city,
       SUM(oi.qty)                                        AS items,
       printf('%.2f', SUM(oi.qty * oi.unit_price_cents) / 100.0) AS total
FROM orders o
JOIN customers c        ON c.id = o.customer_id
JOIN order_items oi     ON oi.order_id = o.id
LEFT JOIN addresses a   ON a.id = o.ship_address_id
GROUP BY o.id
ORDER BY o.id;

-- 3) Integrity audit: every check should return 0
SELECT 'orphan order_items' AS check_name, COUNT(*) AS violations
  FROM order_items oi LEFT JOIN orders o ON o.id = oi.order_id WHERE o.id IS NULL
UNION ALL SELECT 'orders without items', COUNT(*)
  FROM orders o WHERE NOT EXISTS (SELECT 1 FROM order_items oi WHERE oi.order_id = o.id)
UNION ALL SELECT 'customers with 2+ default addresses', COUNT(*)
  FROM (SELECT customer_id FROM addresses WHERE is_default = 1 GROUP BY customer_id HAVING COUNT(*) > 1);`, 'Explore and audit the shop schema')
    ],
    codeTitle: ['Shop schema in action'],
    viz: {
      title: 'E-commerce ER diagram, built one requirement at a time',
      gen: function () {
        var N = {
          Customer: { x: 12, y: 10 }, Address: { x: 12, y: 52 }, Category: { x: 88, y: 31 }, Product: { x: 88, y: 52 },
          Order: { x: 50, y: 10 }, OrderItem: { x: 50, y: 52 }, Payment: { x: 88, y: 10 }, Review: { x: 31, y: 31 }
        };
        var steps = [
          { add: ['Customer'], edges: [], req: 'Customers sign up with a unique email', dec: 'customers(id PK, email UNIQUE NOT NULL, name NOT NULL, created_at DEFAULT now)' },
          { add: ['Address'], edges: [['Customer', 'Address', '1:N saves', 'CASCADE']], req: 'Customers save many addresses, one default', dec: 'addresses.customer_id FK ON DELETE CASCADE + partial UNIQUE (customer_id) WHERE is_default = 1' },
          { add: ['Category'], edges: [], req: 'Categories nest (Electronics → Phones)', dec: 'categories.parent_id → categories.id ON DELETE SET NULL (self-reference)', tag: { Category: 'parent_id → self' } },
          { add: ['Product'], edges: [['Category', 'Product', '1:N groups', 'SET NULL']], req: 'Products have a unique SKU, a price and stock', dec: 'products(sku UNIQUE, price_cents CHECK > 0, stock CHECK >= 0, is_active for soft delete, category_id SET NULL)' },
          { add: ['Order'], edges: [['Customer', 'Order', '1:N places', 'RESTRICT']], req: 'Customers place orders; order history is a financial record', dec: 'orders.customer_id NOT NULL ON DELETE RESTRICT; status CHECK IN (pending, paid, shipped, delivered, cancelled)' },
          { add: ['OrderItem'], edges: [['Order', 'OrderItem', '1:N contains', 'CASCADE'], ['Product', 'OrderItem', '1:N sold as', 'RESTRICT']], req: 'An order has many products, each with a quantity', dec: 'Order N-M Product → order_items(order_id, product_id) PK; qty CHECK > 0; unit_price_cents = price snapshot' },
          { add: ['Payment'], edges: [['Order', 'Payment', '1:N paid by', 'RESTRICT']], req: 'Payments can fail and be retried; refunds happen', dec: 'payments(order_id FK RESTRICT, amount_cents, status, provider_ref UNIQUE) — 1-N, not a column on orders' },
          { add: ['Review'], edges: [['Customer', 'Review', '1:N writes', 'SET NULL'], ['Product', 'Review', '1:N receives', 'CASCADE']], req: 'One review per customer per product, rating 1-5', dec: 'reviews UNIQUE(product_id, customer_id), rating CHECK BETWEEN 1 AND 5, author SET NULL on account deletion' }
        ];
        var nodes = [], edges = [], pol = {}, tags = {}, decisions = [], frames = [];
        var polCls = { CASCADE: 'bad', 'SET NULL': 'cur', RESTRICT: 'win' };
        function graph(hl, ehl) {
          return { type: 'graph', directed: false, height: 62, label: 'e-commerce ER diagram', nodes: nodes.map(function (n) { return { id: n, label: n, x: N[n].x, y: N[n].y, shape: 'box' }; }), edges: edges.map(function (e) { return e.slice(); }), hl: hl || {}, ehl: ehl || {}, tags: JSON.parse(JSON.stringify(tags)) };
        }
        frames.push({ narr: 'Requirements first, tables later. Each step reads one requirement, adds the entity it implies, connects it with a labelled relationship, and writes down the design decision.', parts: [
          { type: 'text', html: '<b>Requirements:</b> customers with unique emails · saved addresses · nested categories · products with SKU/price/stock · orders with many items · retryable payments · one review per customer per product.' },
          { type: 'table', label: 'design decisions', columns: ['requirement', 'decision'], rows: [] }
        ] });
        steps.forEach(function (s, k) {
          var hl = {}, ehl = {};
          s.add.forEach(function (n) { nodes.push(n); hl[n] = 'ok'; tags[n] = 'PK id'; });
          if (s.tag) Object.keys(s.tag).forEach(function (n) { tags[n] = s.tag[n]; });
          s.edges.forEach(function (e) { edges.push([e[0], e[1], e[2]]); ehl[e[0] + '-' + e[1]] = 'cur'; pol[e[0] + '-' + e[1]] = e[3]; hl[e[0]] = hl[e[0]] || 'cur'; });
          decisions.push([s.req, s.dec]);
          frames.push({ narr: '<b>Step ' + (k + 1) + ':</b> "' + s.req + '" → ' + s.add.join(', ') + (s.edges.length ? ' + ' + s.edges.map(function (e) { return e[0] + ' ' + e[2] + ' ' + e[1] + ' (ON DELETE ' + e[3] + ')'; }).join(', ') : '') + '.', parts: [graph(hl, ehl), { type: 'table', label: 'design decisions', columns: ['requirement', 'decision'], rows: copyRows(decisions), hl: one(decisions.length - 1, 'ok') }] });
        });
        var ehl = {}; Object.keys(pol).forEach(function (k) { ehl[k] = polCls[pol[k]]; });
        frames.push({ narr: 'Same diagram coloured by <b>ON DELETE policy</b>: <span class="c-r">red = CASCADE</span> (parts die with the whole), <span class="c-y">amber = SET NULL</span> (keep history, forget the parent), <span class="c-b">blue = RESTRICT</span> (money and history: refuse). Notice that every path from Customer to money is blue.', parts: [graph({}, ehl), { type: 'table', label: 'delete policies', columns: ['relationship', 'ON DELETE', 'reason'], rows: [
          ['Customer → Address', 'CASCADE', 'personal data, useless alone'], ['Customer → Order', 'RESTRICT', 'financial record'], ['Order → OrderItem', 'CASCADE', 'part of the order'],
          ['Product → OrderItem', 'RESTRICT', 'invoice lines must survive'], ['Order → Payment', 'RESTRICT', 'audit trail'], ['Category → Product', 'SET NULL', 'product can be re-categorised'],
          ['Customer → Review', 'SET NULL', 'keep the review, anonymise it'], ['Product → Review', 'CASCADE', 'reviews of a removed product are noise']] }] });
        frames.push({ narr: 'Last pass: <b>indexes for the hot queries</b>. Every FK column gets an index (fast joins + fast cascades), plus composites for the screens users hit most.', parts: [{ type: 'table', label: 'access pattern → index', columns: ['screen / query', 'index'], rows: [
          ['My orders, newest first', 'orders(customer_id, placed_at DESC)'], ['Category page', 'products(category_id) WHERE is_active = 1'], ['Order detail', 'order_items PK (order_id, product_id)'],
          ['"Which orders contain product X?"', 'order_items(product_id)'], ['Product reviews', 'reviews UNIQUE(product_id, customer_id)'], ['Login', 'customers UNIQUE(email)']] }] });
        return frames;
      }
    },
    examples: [
      { title: 'Price snapshot: change the catalogue, old orders stay correct', html: `<p>The phone's price drops from ₹499 to ₹449. Order 1 was paid at ₹499 and must still say ₹499 — that is why <code>order_items.unit_price_cents</code> is a copy, not a lookup. (This is deliberate, safe redundancy: the copy is a historical fact, not duplicated current data.)</p>`,
        code: shop(`UPDATE products SET price_cents = 44900 WHERE id = 1;   -- price drop today
SELECT oi.order_id, p.name,
       oi.unit_price_cents AS price_paid,      -- historical fact, unchanged
       p.price_cents       AS price_today
FROM order_items oi JOIN products p ON p.id = oi.product_id
WHERE oi.product_id = 1;`) },
      { title: 'Stock that can never go negative (even with two buyers)', html: `<p>Read-then-write ("SELECT stock; if &gt; 0 then UPDATE") races: two shoppers both read 1 and both buy. Do the check <b>inside</b> the UPDATE: <code>WHERE stock &gt;= qty</code>. If <code>changes()</code> is 0, the item sold out. The CHECK (stock &gt;= 0) is the last line of defence.</p>`,
        code: shop(`-- Headphones (id 4) have stock 0; Cable (id 2) has 200
UPDATE products SET stock = stock - 1 WHERE id = 4 AND stock >= 1;
SELECT 'buy headphones' AS attempt, changes() AS succeeded;    -- 0: sold out, nothing changed
UPDATE products SET stock = stock - 3 WHERE id = 2 AND stock >= 3;
SELECT 'buy 3 cables' AS attempt, changes() AS succeeded;      -- 1
-- UPDATE products SET stock = stock - 500 WHERE id = 2;       -- would hit CHECK (stock >= 0): error
SELECT id, name, stock FROM products ORDER BY id;`) },
      { title: 'Status: CHECK list vs lookup table', html: `<p><code>CHECK (status IN (...))</code> is simple and fast, but adding a status means a migration (a table rebuild in SQLite). A <b>lookup table</b> with an FK lets you add statuses with an INSERT and store extra facts (display name, is_final). Pick lookup tables when the list changes or carries metadata.</p>`,
        code: lab(`PRAGMA foreign_keys = ON;
CREATE TABLE order_statuses (code TEXT PRIMARY KEY, label TEXT NOT NULL, is_final INTEGER NOT NULL CHECK (is_final IN (0, 1)));
INSERT INTO order_statuses VALUES ('pending', 'Awaiting payment', 0), ('paid', 'Paid', 0), ('shipped', 'On the way', 0),
                                  ('delivered', 'Delivered', 1), ('cancelled', 'Cancelled', 1);
CREATE TABLE orders (id INTEGER PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'pending' REFERENCES order_statuses(code) ON UPDATE CASCADE);
INSERT INTO orders (id, status) VALUES (1, 'paid'), (2, 'delivered');
INSERT INTO orders (id) VALUES (3);                                -- status omitted -> DEFAULT 'pending'
INSERT INTO order_statuses VALUES ('returned', 'Returned', 1);      -- new status: no DDL needed
INSERT INTO orders VALUES (4, 'returned');
SELECT o.id, s.label, s.is_final FROM orders o JOIN order_statuses s ON s.code = o.status ORDER BY o.id;`) },
      { title: 'Prove the index is used for "my orders"', html: `<p>Design isn't finished until the hot query is fast. <code>EXPLAIN QUERY PLAN</code> shows whether SQLite uses <code>idx_orders_customer</code> (a SEARCH) or reads the whole table (a SCAN).</p>`,
        code: shop(`EXPLAIN QUERY PLAN
SELECT id, status, placed_at FROM orders WHERE customer_id = 1 ORDER BY placed_at DESC;

-- better for this screen: a composite index matching filter + sort
CREATE INDEX idx_orders_customer_placed ON orders(customer_id, placed_at);
EXPLAIN QUERY PLAN
SELECT id, status, placed_at FROM orders WHERE customer_id = 1 ORDER BY placed_at DESC;`) }
    ],
    deepDive: `<h4>Things a senior engineer adds to the e-commerce design</h4>
<ul>
<li><b>Order address snapshot</b>: copy name/line1/city/postcode onto the order (or into an <code>order_addresses</code> table) so editing or deleting a saved address never rewrites history — in our shop DB the FK is SET NULL, which keeps the order but loses where it shipped; a snapshot is safer.</li>
<li><b>Money</b>: <code>amount_minor BIGINT</code> + <code>currency CHAR(3)</code> everywhere, including order_items and payments. Taxes and discounts as separate line types or columns so totals are explainable.</li>
<li><b>Idempotency</b>: <code>payments.provider_ref UNIQUE</code> and an <code>idempotency_key UNIQUE</code> on order creation, so a retried HTTP request cannot create two orders.</li>
<li><b>Inventory at scale</b>: one <code>stock</code> column becomes a hotspot during sales. Real systems use per-warehouse stock rows, reservations with expiry (<code>reserved_until</code>), and an append-only stock movement ledger whose sum is the stock.</li>
<li><b>Product variants</b>: size/colour → <code>product_variants</code> (the SKU-level entity) under a <code>products</code> parent. Order items reference the variant.</li>
<li><b>Flexible attributes</b>: a JSON <code>specs</code> column for per-category attributes (screen size, pages), with generated columns + indexes for the few that are filtered on. Avoid full EAV (entity-attribute-value) unless attributes are truly user-defined: it destroys types and constraints.</li>
<li><b>Audit</b>: <code>created_at</code>, <code>updated_at</code>, and an <code>order_status_history(order_id, from_status, to_status, changed_at)</code> table — state machines need history.</li>
<li><b>Soft delete + partial unique</b>: <code>deleted_at</code> on customers, with <code>UNIQUE (email) WHERE deleted_at IS NULL</code>, so a deleted user can re-register.</li>
</ul>
<h4>OLTP vs analytics</h4>
<p>This normalized design serves the shop's transactions (OLTP). Dashboards ("revenue by category by month") are run on a separate warehouse in a <b>star schema</b> (fact_order_items + dimension tables), fed by CDC/ETL. Next module (Normalization &amp; Denormalization) explains why the two shapes differ.</p>
<h4>Multi-tenant / marketplace</h4>
<p>Marketplaces add Seller as an entity (Product N-1 Seller, OrderItem carries seller_id, payouts per seller). SaaS adds <code>tenant_id</code> to every table and composite FKs <code>(tenant_id, x_id)</code> so a row can never reference another tenant's data.</p>`,
    aiEra: `<p><b>What AI changes:</b> "Design an e-commerce schema" is a prompt any LLM answers instantly with 8 plausible tables. In 2026 interviews, the bar has moved: interviewers expect you to <b>critique and evolve</b> a design — price snapshots, delete policies, race conditions on stock, idempotency — not just list tables. Some interviews now hand you an AI-generated schema and ask what is wrong with it.</p>
<p><b>Use AI as a partner:</b> generate the first draft, then interrogate it: <code>"For each FK, what is the ON DELETE action and why? What happens to order 123's total if the product price changes? Show me the SQL that two concurrent buyers of the last item would run, and prove stock can't go negative."</code> Ask it to produce seed data and an integrity-audit query (like the one above) so you can test the design immediately.</p>
<p><b>Where AI goes wrong:</b> it stores <code>price</code> only on products (no snapshot), uses <code>FLOAT</code> for money, forgets payments are 1-N, puts <code>ON DELETE CASCADE</code> from customers to orders, and invents an <code>order_total</code> column with nothing keeping it correct. <b>What you must still own:</b> the business conversation (what must never change, what must be deletable), the read/write patterns that drive indexes, and the judgment to stop adding tables before the interview ends.</p>`,
    problems: [{
      title: 'Design an E-commerce Schema from Requirements',
      level: 'Hard', tags: ['schema design', 'ER modelling', 'constraints', 'cascades'], companies: ['Amazon', 'Flipkart', 'Shopify', 'Walmart'],
      statement: `<p>Design a SQLite schema for a small online store. Requirements:</p><ol>
<li>Customers have a unique email (case-insensitive) and a name.</li>
<li>Products have a unique SKU, a name, a price and stock; stock can never be negative; sold products can be retired but not deleted.</li>
<li>An order belongs to one customer and contains one or more products with quantities; the price paid must be preserved forever.</li>
<li>Order status is one of pending, paid, shipped, delivered, cancelled.</li>
<li>Deleting a customer who has orders must be impossible; deleting an order removes its lines.</li></ol>
<p>Write the DDL, load sample data, and write a query that shows each order's total.</p>`,
      constraints: `<ul><li>Must run in SQLite with <code>PRAGMA foreign_keys = ON</code>.</li><li>Every requirement must be enforced by the database, not by comments.</li></ul>`,
      example: `<p>Asha orders 1 phone (₹499.00) + 2 cables (₹9.99): total ₹518.98. Later the cable price changes to ₹12.00 — the order total must still be ₹518.98.</p>${H.table(['order', 'customer', 'status', 'total'], [['1', 'Asha', 'paid', H.c('g', '518.98')], ['2', 'Ben', 'pending', H.c('g', '29.99')]])}`,
      brute: {
        why: `<p>The spreadsheet design: one flat <code>order_lines_flat</code> row per product bought, repeating the customer's email, name, city and the product price on every line. Asha's city is "Bengaluru" on one row and "Mumbai" on another — which is true? Ben is "Ben" and "Benjamin". Prices are floats. Changing a customer's email means updating N rows (update anomaly); a customer with no orders cannot exist (insertion anomaly); deleting the last order deletes the customer (deletion anomaly).</p>`,
        code: messy(`-- The flat "one big table" design and its contradictions
SELECT customer_email,
       COUNT(DISTINCT customer_name) AS different_names,
       COUNT(DISTINCT customer_city) AS different_cities
FROM order_lines_flat GROUP BY customer_email;

SELECT product_name, COUNT(DISTINCT product_price) AS different_prices
FROM order_lines_flat GROUP BY product_name HAVING COUNT(DISTINCT product_price) > 1;

-- float money: totals carry binary noise
SELECT order_id, SUM(product_price * qty) AS total FROM order_lines_flat GROUP BY order_id;`)
      },
      mcq: { q: 'Where should the price the customer actually paid be stored?', options: ['Only in products.price_cents', 'In order_items.unit_price_cents (copied at purchase time)', 'In orders as a JSON blob', 'Recomputed from products at report time'], answer: 1, explain: 'The paid price is a historical fact about that line. Copying it into order_items keeps invoices correct when the catalogue price changes.' },
      hints: [
        '<p>Hint 1: Nouns → customers, products, orders, order_items. Order ↔ Product is N-M, so order_items is the junction carrying qty and the price snapshot.</p>',
        '<p>Hint 2: Map each requirement to a constraint: email <code>COLLATE NOCASE UNIQUE</code>; <code>CHECK (stock &gt;= 0)</code>; <code>is_active</code> flag + order_items.product_id RESTRICT; status CHECK; orders.customer_id RESTRICT; order_items.order_id CASCADE.</p>',
        '<p>Hint 3: Money as integer cents. Total = <code>SUM(qty * unit_price_cents)</code> grouped by order. Test the "price changes later" requirement with an UPDATE and re-run the total.</p>'
      ],
      solution: {
        approach: `<p>Four core tables. Every numbered requirement maps to a declarative rule: (1) NOCASE UNIQUE email; (2) UNIQUE sku, CHECK stock, soft-delete flag + RESTRICT; (3) NOT NULL FK + junction with qty CHECK and price snapshot; (4) status CHECK; (5) RESTRICT on customer, CASCADE on lines. Indexes on FK columns keep joins and cascades fast. The final query proves the snapshot by changing a price and showing totals unchanged.</p>`,
        code: lab(`PRAGMA foreign_keys = ON;

CREATE TABLE customers (
  id    INTEGER PRIMARY KEY,
  email TEXT NOT NULL COLLATE NOCASE UNIQUE,                       -- req 1
  name  TEXT NOT NULL
);
CREATE TABLE products (
  id          INTEGER PRIMARY KEY,
  sku         TEXT    NOT NULL UNIQUE,                             -- req 2
  name        TEXT    NOT NULL,
  price_cents INTEGER NOT NULL CHECK (price_cents > 0),
  stock       INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),       -- never negative
  is_active   INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1))  -- retire, don't delete
);
CREATE TABLE orders (
  id          INTEGER PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,   -- req 3 + 5
  status      TEXT    NOT NULL DEFAULT 'pending'
              CHECK (status IN ('pending', 'paid', 'shipped', 'delivered', 'cancelled')),  -- req 4
  placed_at   TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE order_items (
  order_id         INTEGER NOT NULL REFERENCES orders(id)   ON DELETE CASCADE,   -- req 5
  product_id       INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,  -- req 2
  qty              INTEGER NOT NULL CHECK (qty > 0),
  unit_price_cents INTEGER NOT NULL CHECK (unit_price_cents > 0),                -- req 3 snapshot
  PRIMARY KEY (order_id, product_id)
);
CREATE INDEX idx_orders_customer ON orders(customer_id, placed_at);
CREATE INDEX idx_order_items_product ON order_items(product_id);

INSERT INTO customers VALUES (1, 'asha@mail.com', 'Asha'), (2, 'ben@mail.com', 'Ben');
INSERT INTO products (id, sku, name, price_cents, stock) VALUES
  (1, 'PH-001', 'Pixel Phone', 49900, 10), (2, 'CB-002', 'USB-C Cable', 999, 100), (3, 'BK-003', 'SQL Book', 2999, 5);
INSERT INTO orders (id, customer_id, status) VALUES (1, 1, 'paid'), (2, 2, 'pending');
-- copy the CURRENT price into the line at purchase time
INSERT INTO order_items (order_id, product_id, qty, unit_price_cents)
  SELECT 1, id, CASE id WHEN 1 THEN 1 ELSE 2 END, price_cents FROM products WHERE id IN (1, 2);
INSERT INTO order_items (order_id, product_id, qty, unit_price_cents)
  SELECT 2, id, 1, price_cents FROM products WHERE id = 3;
INSERT OR IGNORE INTO customers (email, name) VALUES ('ASHA@mail.com', 'Impostor');   -- blocked (NOCASE UNIQUE)

UPDATE products SET price_cents = 1200 WHERE id = 2;   -- cable price changes later...

SELECT o.id AS order_id, c.name AS customer, o.status,
       printf('%.2f', SUM(oi.qty * oi.unit_price_cents) / 100.0) AS total   -- ...totals unchanged
FROM orders o
JOIN customers c    ON c.id = o.customer_id
JOIN order_items oi ON oi.order_id = o.id
GROUP BY o.id ORDER BY o.id;`),
        complexity: `<p>Inserts: O(log N) per unique/PK/FK check. Order total: O(lines of that order) via the order_items PK prefix. Customer's orders: O(log N + k) via idx_orders_customer. Deleting an order: O(log N + lines) cascade; deleting a customer with orders is rejected in O(log N) by the FK index.</p>`,
        followUps: ['Add payments that can be retried and partially refunded.', 'Add product variants (size/colour) — which table do order_items point to now?', 'How do you enforce "an order has at least one line"? (transaction + deferred check / trigger / app)']
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
