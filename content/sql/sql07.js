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
        ['7', H.c('g', 'stored'), 'stock omitted → DEFAULT 0'], ['8', H.c('r', 'rejected'), 'explicit NULL stock → NOT NULL']])}<p>Answer: rows 1, 4, 7 survive (3 rows).</p>`,
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

INSERT OR IGNORE INTO products VALUES (1, 'A1', 500, 10);   INSERT INTO attempts VALUES (1, changes());
INSERT OR IGNORE INTO products VALUES (2, 'A1', 700, 5);    INSERT INTO attempts SELECT 2, 0 WHERE NOT EXISTS (SELECT 1 FROM products WHERE id = 2);
INSERT OR IGNORE INTO products VALUES (3, 'B2', -100, 1);   INSERT INTO attempts SELECT 3, EXISTS (SELECT 1 FROM products WHERE id = 3);
INSERT OR IGNORE INTO products VALUES (4, 'C3', NULL, 2);   INSERT INTO attempts SELECT 4, EXISTS (SELECT 1 FROM products WHERE id = 4);
INSERT OR IGNORE INTO products VALUES (1, 'D4', 900, 1);    INSERT INTO attempts SELECT 5, EXISTS (SELECT 1 FROM products WHERE sku = 'D4');
INSERT OR IGNORE INTO products VALUES (5, NULL, 100, 1);    INSERT INTO attempts SELECT 6, EXISTS (SELECT 1 FROM products WHERE id = 5);
INSERT OR IGNORE INTO products (id, sku, price_cents) VALUES (6, 'E5', 250);
                                                            INSERT INTO attempts SELECT 7, EXISTS (SELECT 1 FROM products WHERE id = 6);
INSERT OR IGNORE INTO products VALUES (7, 'F6', 300, NULL); INSERT INTO attempts SELECT 8, EXISTS (SELECT 1 FROM products WHERE id = 7);

SELECT n AS attempt, CASE stored WHEN 1 THEN 'stored' ELSE 'rejected' END AS result FROM attempts ORDER BY n;
SELECT * FROM products ORDER BY id;`),
        complexity: `<p>Each insert costs O(1) for NOT NULL/CHECK plus O(log N) per unique index (id and sku). Verification is O(1) per attempt via the PK/UNIQUE indexes.</p>`,
        followUps: ['Which attempts would change if the table were STRICT? (none here — all values are already integers/text)', 'Rewrite attempt #2 as an upsert that updates the price instead of failing.']
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
