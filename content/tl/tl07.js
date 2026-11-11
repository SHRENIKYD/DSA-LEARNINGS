(function () { var topics = [], practice = [], quiz = [], interview = [];

// Sample database for the runnable SQL snippets (SQLite dialect, runs in the browser).
var SHOP_DB = "CREATE TABLE customers(id INTEGER PRIMARY KEY, name TEXT NOT NULL, city TEXT NOT NULL);\n" +
  "CREATE TABLE orders(id INTEGER PRIMARY KEY, customer_id INTEGER NOT NULL REFERENCES customers(id), status TEXT NOT NULL, total INTEGER NOT NULL, placed_on TEXT NOT NULL);\n" +
  "CREATE TABLE order_items(order_id INTEGER NOT NULL REFERENCES orders(id), product TEXT NOT NULL, qty INTEGER NOT NULL, price INTEGER NOT NULL, PRIMARY KEY(order_id, product));\n" +
  "INSERT INTO customers VALUES (1,'Asha','Pune'),(2,'Ben','Leeds'),(3,'Chen','Austin'),(4,'Dana','Pune');\n" +
  "INSERT INTO orders VALUES (10,1,'Paid',120,'2026-01-05'),(11,1,'Shipped',80,'2026-01-09'),(12,2,'Paid',45,'2026-01-09'),(13,3,'Cancelled',300,'2026-01-12'),(14,3,'Paid',60,'2026-02-01'),(15,1,'Paid',25,'2026-02-03');\n" +
  "INSERT INTO order_items VALUES (10,'Keyboard',1,70),(10,'Mouse',2,25),(11,'Cable',4,20),(12,'Mouse',1,25),(12,'Cable',1,20),(13,'Monitor',1,300),(14,'Cable',3,20),(15,'Mouse',1,25);";

// Scenario problem builder: weak answer first, then the strong one.
function P(o) {
  var sol = { approach: o.a, complexity: o.cx, followUps: o.f };
  if (o.code) sol.code = o.code;
  return {
    title: o.t, level: o.l, tags: o.tags,
    statement: '<p>' + o.s + '</p>',
    constraints: o.c || 'Answer out loud in 2 to 3 minutes. Say what you would check first, what evidence you expect to see, the fix, and how you would prove the fix worked.',
    example: o.ex,
    brute: { why: '<p><b>Weak answer:</b> <i>&ldquo;' + o.weak + '&rdquo;</i></p><p><b>Why it fails:</b> ' + o.why + '</p>' },
    mcq: { q: o.q[0], options: o.q[1], answer: o.q[2], explain: o.q[3] },
    hints: o.h,
    solution: sol
  };
}
// Tiny helpers for the flow diagrams.
function box(id, label, x, y, w) { var n = { id: id, label: label, x: x, y: y, shape: 'box' }; if (w) n.w = w; return n; }

/* ================= Topic 1: modelling, normalization, indexes and plans ================= */
topics.push({
  title: 'Tables, Normalization, Indexes and Execution Plans',
  analogy: `<p>Think of a <b>library</b>. The books stand on the shelves in one order only, by shelf number. That is the <b>clustered index</b>: the data itself, sorted one way. The <b>card catalogue</b> by author is a <b>nonclustered index</b>: a small sorted list that tells you which shelf to walk to. If the card already shows the year you wanted, you never walk to the shelf at all. That is a <b>covering index</b>. And the librarian who decides "catalogue or walk every aisle?" is the <b>query optimizer</b>; the route she picks is the <b>execution plan</b>.</p>`,
  explain: `<p><b>Relational modelling</b> means storing each fact once, in a table, and linking tables with keys. A <b>primary key</b> names one row. A <b>foreign key</b> is a column that points at a primary key in another table, and the database refuses values that point nowhere.</p>
<p><b>Normalization</b> is the tidy-up that removes repeated facts. The three steps interviewers ask for:</p>
${H.table(['Form', 'Plain rule', 'Broken example', 'Fix'], [
  ['1NF', 'One value per cell, no repeating groups', 'Phones = "111, 222"', 'A CustomerPhones table, one row per phone'],
  ['2NF', 'Every column depends on the <b>whole</b> key', 'OrderItems(OrderId, ProductId, ProductName)', 'Move ProductName to Products'],
  ['3NF', 'No column depends on another non-key column', 'Orders(…, CustomerCity)', 'City lives on Customers']
])}
<p>An <b>index</b> is a sorted copy of some columns, stored as a B-tree (a shallow tree of pages) so the engine finds a row in 3 or 4 page reads instead of reading the whole table.</p>
${H.table(['', 'Clustered', 'Nonclustered'], [
  ['What the leaf holds', 'The full rows', 'Index keys + a pointer (the clustered key)'],
  ['How many per table', '1', 'Many (up to 999)'],
  ['Good for', 'Range scans on the key, primary key lookups', 'Other search columns, covering hot queries'],
  ['Cost', 'Decides physical order', 'Extra storage, slower writes']
])}
<p>Three words to know when you read a plan: a <b>scan</b> reads every row, a <b>seek</b> walks the tree straight to the rows, and a <b>key lookup</b> is the extra trip from a nonclustered index back to the table for columns the index does not hold. A <b>covering index</b> removes that trip by carrying the extra columns with <code>INCLUDE</code>.</p>`,
  clues: [
    '"What is the difference between a clustered and a nonclustered index?"',
    '"This query was fine with 10,000 rows and now takes 8 seconds. Where do you start?"',
    '"What is a covering index? What does INCLUDE do?"',
    '"Walk me through how you read an execution plan."',
    '"Is this table in third normal form? When would you break the rule?"',
    '"Why can the same stored procedure be fast for one customer and slow for another?" (parameter sniffing)',
    '"Index seek vs index scan vs key lookup"'
  ],
  code: [
    { lang: 'sql', db: 'shop', title: 'Runnable: the plan before and after an index (SQLite shows the same idea)', code: `-- Before: no index on customer_id, so the engine must read every row.
EXPLAIN QUERY PLAN
SELECT id, total FROM orders WHERE customer_id = 1;

-- Add an index on the search column.
CREATE INDEX IF NOT EXISTS ix_orders_customer ON orders(customer_id);

-- After: the plan now says SEARCH ... USING INDEX (a seek).
EXPLAIN QUERY PLAN
SELECT id, total FROM orders WHERE customer_id = 1;` },
    { lang: 'sql', check: false, title: 'SQL Server (T-SQL): a covering index', code: `-- Query we want to make fast:
--   SELECT OrderId, Total, PlacedOn
--   FROM dbo.Orders
--   WHERE CustomerId = @CustomerId AND Status = 'Paid'
--   ORDER BY PlacedOn DESC;

CREATE NONCLUSTERED INDEX IX_Orders_Customer_Status_PlacedOn
ON dbo.Orders (CustomerId, Status, PlacedOn DESC)   -- key columns: filter first, then sort
INCLUDE (Total);                                    -- carried in the leaf only: no key lookup

-- See what the query really costs:
SET STATISTICS IO, TIME ON;   -- prints logical reads and CPU time per statement` }
  ],
  codeTitle: ['Plan before and after an index', 'Covering index in T-SQL'],
  viz: {
    title: 'One query, three plans: scan, seek + key lookup, covering seek',
    gen: function () {
      var cols = ['OrderId (clustered key)', 'CustomerId', 'Status', 'Total'];
      var rows = [[10, 1, 'Paid', 120], [11, 1, 'Shipped', 80], [12, 2, 'Paid', 45], [13, 3, 'Cancelled', 300], [14, 3, 'Paid', 60], [15, 1, 'Paid', 25]];
      var q = "SELECT OrderId, Total FROM Orders WHERE CustomerId = 1 AND Status = 'Paid'";
      var ix = [['1', 'Paid', '-> 10'], ['1', 'Paid', '-> 15'], ['1', 'Shipped', '-> 11'], ['2', 'Paid', '-> 12'], ['3', 'Cancelled', '-> 13'], ['3', 'Paid', '-> 14']];
      var ixc = [['1', 'Paid', 120, '-> 10'], ['1', 'Paid', 25, '-> 15'], ['1', 'Shipped', 80, '-> 11'], ['2', 'Paid', 45, '-> 12'], ['3', 'Cancelled', 300, '-> 13'], ['3', 'Paid', 60, '-> 14']];
      return [
        { narr: 'The query asks for the paid orders of customer 1. The table is stored in <b>OrderId</b> order (the clustered index). Nothing is sorted by customer yet.', parts: [{ type: 'code', lang: 'sql', code: q }, { type: 'table', label: 'Orders (clustered on OrderId)', columns: cols, rows: rows }] },
        { narr: '<b>Plan 1, clustered index scan.</b> With no helpful index the engine reads <b>every</b> row and tests it. 6 rows read to return 2. On 50 million rows this is the 8-second query.', parts: [{ type: 'table', label: 'Orders: every row is touched', columns: cols, rows: rows, hl: { 0: 'ok', 1: 'bad', 2: 'bad', 3: 'bad', 4: 'bad', 5: 'ok' } }, { type: 'vars', label: 'Cost', vals: { operator: 'Clustered Index Scan', rowsRead: 6, rowsReturned: 2 }, hl: { rowsRead: 'bad' } }] },
        { narr: 'We add a nonclustered index on <code>(CustomerId, Status)</code>. It is a small sorted copy. Each entry also stores the clustered key so the engine can find the full row.', parts: [{ type: 'table', label: 'IX (CustomerId, Status)', columns: ['CustomerId', 'Status', 'pointer (OrderId)'], rows: ix }] },
        { narr: '<b>Plan 2, index seek.</b> The engine walks the tree straight to "1, Paid" and reads only the 2 matching entries. But the query also wants <b>Total</b>, which this index does not hold.', parts: [{ type: 'table', label: 'IX (CustomerId, Status)', columns: ['CustomerId', 'Status', 'pointer (OrderId)'], rows: ix, hl: { 0: 'ok', 1: 'ok' } }, { type: 'vars', label: 'Cost so far', vals: { operator: 'Index Seek', rowsRead: 2 }, hl: { rowsRead: 'ok' } }] },
        { narr: '<b>Key lookup.</b> For each of the 2 entries the engine makes one more trip into the clustered index to fetch Total. 2 trips is fine. 200,000 trips is not, and at some point the optimizer gives up and scans instead.', parts: [{ type: 'table', label: 'Orders: one extra trip per row', columns: cols, rows: rows, hl: { 0: 'cur', 5: 'cur' } }, { type: 'vars', label: 'Cost', vals: { operator: 'Index Seek + Key Lookup', rowsRead: 2, extraTrips: 2 }, hl: { extraTrips: 'cur' } }] },
        { narr: 'We make the index <b>covering</b>: <code>INCLUDE (Total)</code>. Total now rides along in the leaf of the index.', parts: [{ type: 'code', lang: 'sql', code: 'CREATE INDEX IX_Orders_Customer_Status\nON Orders (CustomerId, Status) INCLUDE (Total);', hl: { 2: 'ok' } }, { type: 'table', label: 'IX (CustomerId, Status) INCLUDE (Total)', columns: ['CustomerId', 'Status', 'Total (included)', 'pointer'], rows: ixc }] },
        { narr: '<b>Plan 3, covering seek.</b> Everything the query needs is in the index. 2 entries read, 0 trips to the table. This is the plan you aim for on a hot query.', parts: [{ type: 'table', label: 'IX (CustomerId, Status) INCLUDE (Total)', columns: ['CustomerId', 'Status', 'Total (included)', 'pointer'], rows: ixc, hl: { 0: 'sel', 1: 'sel' } }, { type: 'vars', label: 'Cost', vals: { operator: 'Index Seek (covering)', rowsRead: 2, extraTrips: 0 }, hl: { extraTrips: 'ok' } }] },
        { narr: 'The price: every INSERT, UPDATE and DELETE on Orders must now maintain this index too. Index the queries that matter, not every column.', parts: [{ type: 'table', label: 'Summary', columns: ['Plan', 'Rows read', 'Extra trips', 'When it is OK'], rows: [['Scan', 'all', '0', 'Small tables, or most rows are needed'], ['Seek + key lookup', 'few', '1 per row', 'Few rows returned'], ['Covering seek', 'few', '0', 'Hot queries worth the write cost']], hl: { 2: 'ok' } }] }
      ];
    }
  },
  examples: [
    { title: 'Normalize a flat order sheet', html: `<p>A spreadsheet row holds <code>OrderId, CustomerName, CustomerCity, Product1, Product2, Product3</code>.</p>
<ul><li><b>1NF:</b> Product1..3 is a repeating group. Make <code>OrderItems(OrderId, ProductId, Qty)</code>, one row per product.</li>
<li><b>2NF:</b> a product's name depends only on ProductId, not on the whole (OrderId, ProductId) key. Move it to <code>Products</code>.</li>
<li><b>3NF:</b> CustomerCity depends on the customer, not on the order. Move it to <code>Customers</code> and keep only <code>CustomerId</code> on the order.</li></ul>
<p>Result: 4 tables, each fact stored once. Change a customer's city in one row and every order sees it.</p>`,
      code: { lang: 'sql', db: 'shop', code: `-- The normalized shape, joined back together for a report.
SELECT c.name, o.id AS order_id, i.product, i.qty * i.price AS line_total
FROM orders o
JOIN customers c   ON c.id = o.customer_id
JOIN order_items i ON i.order_id = o.id
WHERE o.status = 'Paid'
ORDER BY c.name, o.id;` } },
    { title: 'Column order in a composite index', html: `<p>Index <code>(CustomerId, PlacedOn)</code> is sorted by customer first, then by date inside each customer, like a phone book sorted by surname then first name.</p>
${H.table(['Query filter', 'Can it seek?', 'Why'], [
  ['CustomerId = 7', 'Yes', 'Leading column'],
  ['CustomerId = 7 AND PlacedOn &gt; \'2026-01-01\'', 'Yes', 'Equality on the first column, range on the second'],
  ['PlacedOn &gt; \'2026-01-01\' only', 'No (scan)', 'Dates are scattered across all customers']
])}
<p>Rule of thumb: equality columns first, then the range or sort column, and put everything else in INCLUDE.</p>` },
    { title: 'A predicate that hides the index (not sargable)', html: `<p><b>Sargable</b> means "the search argument can use an index seek". Wrapping the column in a function breaks it, because the index is sorted by the raw column value, not by the function result.</p>
${H.table(['Slow (scan)', 'Fast (seek)'], [
  ['WHERE YEAR(PlacedOn) = 2026', 'WHERE PlacedOn &gt;= \'2026-01-01\' AND PlacedOn &lt; \'2027-01-01\''],
  ['WHERE Email LIKE \'%@shop.com\'', 'WHERE Email LIKE \'asha%\''],
  ['WHERE CustomerCode = 42 (column is VARCHAR)', 'WHERE CustomerCode = \'42\''],
  ['WHERE Total + 10 &gt; 100', 'WHERE Total &gt; 90']
])}
<p>The third row is an <b>implicit conversion</b>: SQL Server converts every row's value to a number before comparing. It shows as a yellow warning triangle on the plan.</p>` }
  ],
  deepDive: `<p><b>How the optimizer chooses.</b> SQL Server keeps <b>statistics</b> on each index and many columns: a histogram of up to 200 steps that says roughly how many rows hold each value. From that it <i>estimates</i> row counts and picks the cheapest plan. When the estimate is far from the truth (stale statistics after a big load, a table variable, a function on the column) you get the wrong join type or a scan where a seek was right. In an <b>actual</b> plan, compare "estimated rows" with "actual rows" first. A 100x gap is your lead.</p>
<p><b>Parameter sniffing.</b> A stored procedure or parameterized query is compiled once, for the first parameter value it sees, and the plan is cached. If that first customer has 5 orders, the plan uses seek + key lookup. Reused for a customer with 2 million orders, it is terrible. Fixes, mildest first: update statistics, a covering index so one plan suits both, <code>OPTION (RECOMPILE)</code> on that statement, <code>OPTIMIZE FOR</code>, or forcing a known good plan in <b>Query Store</b>. SQL Server 2022 added parameter-sensitive plan optimization, which can keep several plans for one query.</p>
<p><b>Choosing the clustered key.</b> Make it narrow, unique, never updated and ever-increasing (an <code>int</code> or <code>bigint</code> identity, or a sequential GUID). A random GUID as the clustered key inserts into the middle of the tree, which splits pages, fragments the index and makes every nonclustered index wider, because each one stores the clustered key as its pointer.</p>
<p><b>Other index kinds worth naming:</b> a <b>filtered index</b> (<code>WHERE IsActive = 1</code>) indexes only some rows; a <b>unique index</b> enforces a rule and helps the optimizer; a <b>columnstore index</b> stores data by column, compressed, for reporting queries that sum millions of rows.</p>`,
  aiEra: `<p><b>What AI changes:</b> an assistant can read a plan XML or a slow query and suggest an index in seconds, and SQL Server 2025 and Azure SQL now have a native vector type for similarity search, so "store embeddings next to the rows" is a real design option.</p>
<p><b>Use AI as a partner:</b> paste the query, the table definitions and the row counts and ask for <i>two</i> index options with the write cost of each. Ask it to explain a plan operator you do not know.</p>
<p><b>Where AI goes wrong:</b> it has not seen your data distribution. It will happily propose 5 overlapping indexes, add an index for a query that runs once a month, or put the low-selectivity column first.</p>
<p><b>What you must still own:</b> measuring before and after (logical reads, duration), checking the index does not duplicate one that exists, and deciding whether the write cost is worth it for this table.</p>`,
  problems: [P({
    t: 'Design the index for an order history screen', l: 'Medium', tags: ['indexes', 'covering index', 'execution plan'],
    s: 'An online shop has an Orders table with 80 million rows, clustered on OrderId. The "My orders" screen runs this for one customer and shows the newest 20: <code>SELECT TOP (20) OrderId, PlacedOn, Status, Total FROM Orders WHERE CustomerId = @id ORDER BY PlacedOn DESC</code>. It takes 6 seconds. Say which index you would create and why, and how you would prove it worked.',
    ex: `<p><b>What the plan shows today:</b> ${H.c('r', 'Clustered Index Scan, 80,000,000 rows read')}, then a ${H.c('r', 'Sort')} to find the newest 20.</p><p><b>What you want:</b> ${H.c('g', 'Index Seek, about 20 rows read, no Sort, no Key Lookup')}.</p>`,
    weak: 'I would add an index on CustomerId and one on PlacedOn. That should make it faster.',
    why: 'Two single-column indexes do not work together here. The CustomerId index finds the rows but they still need sorting, and every row needs a key lookup for Status and Total. The answer also has no measurement, so nobody knows if it helped.',
    q: ['Which index lets the engine read just the newest 20 rows for one customer with no sort?', ['(PlacedOn) INCLUDE (CustomerId)', '(CustomerId, PlacedOn DESC) INCLUDE (Status, Total)', '(Status, Total)', 'A clustered index on Total'], 1, 'Equality column first, then the sort column. Inside one customer the entries are already in date order, so the engine reads 20 and stops. INCLUDE makes it covering.'],
    h: ['Hint 1: the filter is an equality on one column and the sort is on another. Which should come first in the index key?', 'Hint 2: if the index is already sorted the way ORDER BY wants, the Sort operator disappears and TOP can stop early.', 'Hint 3: look at the SELECT list. Any column not in the index costs a key lookup per row. Recipe: key = (equality columns, sort column), INCLUDE = the other selected columns, then compare logical reads before and after.'],
    a: `<p><b>Strong answer:</b> "The query filters on one customer and wants the newest 20, so I would create one index keyed on <code>(CustomerId, PlacedOn DESC)</code> with <code>INCLUDE (Status, Total)</code>. The equality column goes first so the engine can seek to that customer. Inside that customer the rows are already in date order, so there is no Sort and TOP 20 stops after 20 entries. Status and Total are included so there is no key lookup. OrderId is in the index already because it is the clustered key."</p>
<p>"To prove it I would run the query with <code>SET STATISTICS IO ON</code> before and after and compare logical reads, and check the actual plan shows a single Index Seek. I would also check that no existing index starts with CustomerId that I could widen instead of adding a new one, because each extra index slows inserts."</p>`,
    code: { lang: 'sql', check: false, code: `CREATE NONCLUSTERED INDEX IX_Orders_Customer_PlacedOn
ON dbo.Orders (CustomerId, PlacedOn DESC)
INCLUDE (Status, Total)
WITH (ONLINE = ON);   -- build without blocking writers (Enterprise edition and Azure SQL)` },
    cx: '<p><b>What is being checked:</b> key column order, covering, and the habit of measuring. Reads drop from millions of pages to a handful.</p>',
    f: ['The screen adds a filter on Status. Does your index still work?', 'How would you page to rows 21 to 40 without OFFSET getting slower?']
  })]
});

/* ================= Topic 2: transactions, isolation, locking, deadlocks ================= */
topics.push({
  title: 'Transactions, Isolation Levels, Locks and Deadlocks',
  analogy: `<p>A <b>transaction</b> is like paying at a shop till: the money leaves your card <i>and</i> the goods become yours, or neither happens. <b>Isolation</b> is the fitting room rule: while you are trying a jacket on, nobody else can buy it from under you. A <b>lock</b> is the "occupied" sign on the door. A <b>deadlock</b> is two shoppers in two fitting rooms, each holding the jacket the other one wants and each refusing to come out first. The shop assistant (SQL Server) picks one, sends them out empty-handed, and the other finishes.</p>`,
  explain: `<p>A <b>transaction</b> groups several statements into one unit that fully succeeds or fully fails. The four promises are called <b>ACID</b>:</p>
${H.table(['Letter', 'Promise', 'Bank transfer example'], [
  ['<b>A</b>tomicity', 'All or nothing', 'Debit and credit both happen, or neither'],
  ['<b>C</b>onsistency', 'Rules still hold afterwards', 'No balance below zero, foreign keys valid'],
  ['<b>I</b>solation', 'Concurrent work does not corrupt each other', 'Two transfers do not both spend the same money'],
  ['<b>D</b>urability', 'Committed means saved', 'Survives a power cut, thanks to the transaction log']
])}
<p>The <b>isolation level</b> decides how much one transaction may see of another's unfinished or changing work. Lower levels are faster and allow more odd effects:</p>
${H.table(['Level', 'Dirty read', 'Non-repeatable read', 'Phantom', 'Note'], [
  ['READ UNCOMMITTED (NOLOCK)', H.c('r', 'yes'), H.c('r', 'yes'), H.c('r', 'yes'), 'Reads rows that may be rolled back'],
  ['READ COMMITTED', H.c('g', 'no'), H.c('r', 'yes'), H.c('r', 'yes'), 'SQL Server default'],
  ['REPEATABLE READ', H.c('g', 'no'), H.c('g', 'no'), H.c('r', 'yes'), 'Holds read locks to the end'],
  ['SERIALIZABLE', H.c('g', 'no'), H.c('g', 'no'), H.c('g', 'no'), 'Locks key ranges; most blocking'],
  ['SNAPSHOT', H.c('g', 'no'), H.c('g', 'no'), H.c('g', 'no'), 'Reads row versions, no read locks']
])}
<ul><li><b>Dirty read:</b> you read a change that is later rolled back.</li>
<li><b>Non-repeatable read:</b> you read a row twice and it changed in between.</li>
<li><b>Phantom:</b> you run the same range query twice and new rows appeared.</li></ul>
<p>SQL Server protects rows with <b>locks</b>: <b>shared (S)</b> for reading, <b>exclusive (X)</b> for writing, and <b>update (U)</b> for "I am reading this and intend to write it". Many readers can share; a writer needs the row alone.</p>`,
  clues: [
    '"Explain ACID with an example."',
    '"What isolation levels does SQL Server support and which is the default?"',
    '"What is a deadlock and how do you troubleshoot one in production?"',
    '"Is WITH (NOLOCK) safe? Why do people use it?"',
    '"Two users edit the same record. How do you stop one overwriting the other?"',
    '"What is the difference between blocking and a deadlock?"',
    '"Optimistic vs pessimistic concurrency"'
  ],
  code: [
    { lang: 'sql', check: false, title: 'T-SQL: a safe transfer with TRY/CATCH', code: `SET XACT_ABORT ON;          -- any run-time error rolls the whole transaction back
BEGIN TRY
    BEGIN TRANSACTION;

    UPDATE dbo.Accounts
    SET Balance = Balance - @Amount
    WHERE AccountId = @FromId AND Balance >= @Amount;   -- the check and the write are one statement

    IF @@ROWCOUNT = 0
        THROW 50001, 'Insufficient funds.', 1;

    UPDATE dbo.Accounts
    SET Balance = Balance + @Amount
    WHERE AccountId = @ToId;

    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;                  -- rethrow so the caller knows it failed
END CATCH;` },
    { lang: 'csharp', check: false, title: 'EF Core: one transaction, and a retry for the deadlock victim', code: `// SaveChanges already wraps its own statements in one transaction.
// You only need an explicit one when several SaveChanges calls must succeed together.
var strategy = db.Database.CreateExecutionStrategy();   // retries transient faults when EnableRetryOnFailure is on

await strategy.ExecuteAsync(async () =>
{
    await using var tx = await db.Database.BeginTransactionAsync();

    var from = await db.Accounts.SingleAsync(a => a.Id == fromId);
    var to   = await db.Accounts.SingleAsync(a => a.Id == toId);

    if (from.Balance < amount) throw new InvalidOperationException("Insufficient funds.");
    from.Balance -= amount;
    to.Balance   += amount;

    await db.SaveChangesAsync();     // rowversion on Account catches a concurrent change
    await tx.CommitAsync();
});` }
  ],
  codeTitle: ['Transfer in T-SQL', 'Transaction and retry in EF Core'],
  viz: {
    title: 'A deadlock, step by step',
    gen: function () {
      var nodes = [box('A', 'Session A (place order)', 15, 12, 30), box('B', 'Session B (restock)', 15, 48, 30), box('O', 'Row: Orders #1', 80, 12, 24), box('S', 'Row: Stock #7', 80, 48, 24)];
      function g(edges, hl, ehl, tags) { return { type: 'graph', directed: true, height: 60, nodes: nodes, edges: edges, hl: hl || {}, ehl: ehl || {}, tags: tags || {} }; }
      return [
        { narr: 'Two sessions run at the same time. A places an order: it updates <b>Orders</b> and then <b>Stock</b>. B restocks: it updates <b>Stock</b> and then <b>Orders</b>. Note the opposite order.', parts: [g([]), { type: 'table', label: 'What each session will do', columns: ['Step', 'Session A', 'Session B'], rows: [['1', 'UPDATE Orders #1', 'UPDATE Stock #7'], ['2', 'UPDATE Stock #7', 'UPDATE Orders #1']] }] },
        { narr: 'A runs step 1 and takes an <b>exclusive (X) lock</b> on Orders #1. It keeps that lock until its transaction ends.', parts: [g([['A', 'O', 'holds X']], { A: 'cur', O: 'ok' }, { 'A-O': 'ok' })] },
        { narr: 'B runs its step 1 and takes an X lock on Stock #7. So far nobody is waiting. This is normal.', parts: [g([['A', 'O', 'holds X'], ['B', 'S', 'holds X']], { B: 'cur', S: 'ok' }, { 'A-O': 'ok', 'B-S': 'ok' })] },
        { narr: 'A runs step 2: it wants Stock #7, but B holds it. A <b>waits</b>. This alone is just <b>blocking</b>: it would clear as soon as B commits.', parts: [g([['A', 'O', 'holds X'], ['B', 'S', 'holds X'], ['A', 'S', 'waits']], { A: 'cur' }, { 'A-O': 'ok', 'B-S': 'ok', 'A-S': 'bad' }, { A: 'blocked' })] },
        { narr: 'B runs step 2: it wants Orders #1, but A holds it. Now each waits for the other. That is a <b>cycle</b>, and it can never clear by itself. This is a <b>deadlock</b>.', parts: [g([['A', 'O', 'holds X'], ['B', 'S', 'holds X'], ['A', 'S', 'waits'], ['B', 'O', 'waits']], { A: 'bad', B: 'bad' }, { 'A-S': 'bad', 'B-O': 'bad' }, { A: 'blocked', B: 'blocked' })] },
        { narr: 'SQL Server\'s lock monitor checks for cycles about every 5 seconds. It picks a <b>victim</b> (usually the one that is cheapest to roll back), rolls it back and raises <b>error 1205</b>.', parts: [g([['A', 'O', 'holds X'], ['A', 'S', 'gets X']], { B: 'bad', A: 'ok' }, { 'A-S': 'ok', 'A-O': 'ok' }, { B: 'victim: error 1205' })] },
        { narr: 'A finishes and commits. The application that ran B should <b>catch 1205 and retry</b> the whole transaction. It will succeed the second time.', parts: [g([], { A: 'done', B: 'cur' }, {}, { A: 'committed', B: 'retry' })] },
        { narr: 'The real fix: make both code paths touch tables in the <b>same order</b> (Orders, then Stock). Then the second session simply waits at step 1 and no cycle can form.', parts: [{ type: 'table', label: 'After the fix', columns: ['Step', 'Session A', 'Session B'], rows: [['1', 'UPDATE Orders #1', 'UPDATE Orders #1 (waits briefly)'], ['2', 'UPDATE Stock #7', 'UPDATE Stock #7']], hl: { 0: 'ok', 1: 'ok' } }, { type: 'text', html: 'Also: keep transactions short, add indexes so updates lock fewer rows, and turn on read committed snapshot so readers stop blocking writers.' }] }
      ];
    }
  },
  examples: [
    { title: 'The same read at two isolation levels', html: `<p>Session 1 runs <code>UPDATE Products SET Price = 90 WHERE Id = 5</code> inside an open transaction (old price 100). Session 2 runs <code>SELECT Price FROM Products WHERE Id = 5</code>.</p>
${H.table(['Session 2 isolation', 'What it sees', 'Why'], [
  ['READ UNCOMMITTED / NOLOCK', H.c('r', '90 (dirty)'), 'Ignores the X lock. If session 1 rolls back, 90 never existed.'],
  ['READ COMMITTED (locking)', 'Waits', 'Needs an S lock, blocked by the X lock until commit or rollback.'],
  ['READ COMMITTED SNAPSHOT (RCSI)', H.c('g', '100, at once'), 'Reads the last committed version from the version store.']
])}
<p>RCSI is on by default in Azure SQL Database. On a SQL Server instance you turn it on per database.</p>` },
    { title: 'Lost update, and the one-statement fix', html: `<p>Two requests each buy the last 1 unit. Both run <code>SELECT Qty</code> (see 1), both compute 0, both <code>UPDATE ... SET Qty = 0</code>. Stock says 0 but 2 units were sold. This is a <b>lost update</b>.</p>
<p>Fix 1: let the database do the arithmetic and the check in one statement. The UPDATE takes the lock, so the second request sees Qty = 0 and changes 0 rows.</p>`,
      code: { lang: 'sql', check: false, code: `UPDATE dbo.Stock
SET Qty = Qty - 1
WHERE ProductId = @ProductId AND Qty >= 1;

IF @@ROWCOUNT = 0
    THROW 50002, 'Sold out.', 1;` } },
    { title: 'Optimistic concurrency with rowversion', html: `<p>For an edit screen that stays open for minutes you cannot hold a lock. Instead add a <code>rowversion</code> column: SQL Server changes it on every update. The app sends back the version it read:</p>
<p><code>UPDATE Customers SET Name = @Name WHERE Id = @Id AND RowVer = @RowVerIRead</code></p>
<p>If someone else saved first, the version no longer matches, 0 rows change, and the app tells the user "this record was changed, reload". EF Core does this for you when the property is marked <code>[Timestamp]</code> and throws <code>DbUpdateConcurrencyException</code>.</p>` }
  ],
  deepDive: `<p><b>Row versioning.</b> With <b>read committed snapshot isolation (RCSI)</b> each statement reads the last committed version of a row instead of waiting for a writer. With <b>SNAPSHOT</b> isolation the whole transaction sees the data as of its start, and a write to a row that someone else changed since then fails with error 3960 (an update conflict). Both cost space for the version store (in tempdb, or inside the database when accelerated database recovery is on). Writers still block writers.</p>
<p><b>Lock granularity and escalation.</b> SQL Server locks rows or pages, with <b>intent locks</b> on the levels above so it can tell quickly that something below is locked. When one statement holds roughly 5,000 locks on one table, the engine may <b>escalate</b> to a single table lock to save memory. A "small" batch update of 20,000 rows can then block the whole table. Update in batches of a few thousand rows instead. SQL Server 2025 and Azure SQL add <b>optimized locking</b>, which holds far fewer locks during a transaction and largely removes escalation.</p>
<p><b>Finding a deadlock.</b> The built-in <code>system_health</code> Extended Events session records an <code>xml_deadlock_report</code> for every deadlock. The deadlock graph shows both sessions, the statements they ran and the resources they held and wanted. Common shapes: two transactions that touch tables in opposite order; a reader and a writer on a nonclustered index plus key lookup (fix with a covering index or RCSI); a SELECT followed by an UPDATE of the same row from two sessions (fix with <code>UPDLOCK</code> on the read or a single UPDATE statement).</p>
<p><b>Across services.</b> A database transaction cannot span two microservices that own separate databases. The usual answer is the <b>transactional outbox</b>: write the business row and an "event to publish" row in the same local transaction, and let a background worker publish the event. A multi-step flow is then a <b>saga</b> with compensating steps.</p>`,
  aiEra: `<p><b>What AI changes:</b> a deadlock graph is XML that few people enjoy reading. An assistant can turn it into "session 61 held a lock on index X and wanted Y" in seconds and suggest the usual fixes.</p>
<p><b>Use AI as a partner:</b> paste the two statements and the deadlock XML and ask which resource each session held. Ask it to list the anomalies your chosen isolation level still allows for a given flow.</p>
<p><b>Where AI goes wrong:</b> it reaches for <code>WITH (NOLOCK)</code> or SERIALIZABLE far too quickly, wraps everything in a long transaction that includes an HTTP call, and forgets the retry for error 1205.</p>
<p><b>What you must still own:</b> deciding which business rule needs which guarantee (a balance needs more care than a view counter), keeping transactions short, and testing with two real concurrent sessions rather than trusting a single-threaded unit test.</p>`,
  problems: [P({
    t: 'Stop the last seat being sold twice', l: 'Medium', tags: ['transactions', 'isolation', 'lost update'],
    s: 'A booking system sells seats. The code reads the seat row, checks <code>IsBooked = 0</code> in C#, then updates it to 1. Under load, the same seat is sometimes sold to 2 people. The database runs at the default READ COMMITTED level. Explain why this happens and give 2 ways to fix it.',
    ex: `${H.table(['Time', 'Request 1', 'Request 2'], [['t1', 'SELECT IsBooked → 0', ''], ['t2', '', 'SELECT IsBooked → 0'], ['t3', 'UPDATE IsBooked = 1', ''], ['t4', '', H.c('r', 'UPDATE IsBooked = 1 (double sale)')]])}<p>Both reads happened before either write, so both checks passed.</p>`,
    weak: 'I would wrap the read and the update in a transaction, so it is atomic.',
    why: 'At READ COMMITTED the shared lock from the SELECT is released as soon as the read ends, even inside a transaction. Both transactions still read 0 and both update. A transaction gives all-or-nothing; it does not by itself stop two readers seeing the same value.',
    q: ['Which change makes the check and the write safe with the least locking?', ['Add WITH (NOLOCK) to the SELECT', 'UPDATE ... SET IsBooked = 1 WHERE SeatId = @id AND IsBooked = 0, then check rows affected', 'Add a longer timeout', 'Run the SELECT twice'], 1, 'One statement takes the lock, tests the condition and writes. The second request finds IsBooked = 1 and changes 0 rows.'],
    h: ['Hint 1: when is the shared lock from a SELECT released at READ COMMITTED?', 'Hint 2: can the check live inside the WHERE clause of the UPDATE itself?', 'Hint 3: other tools are a unique constraint on (ShowId, SeatId) in a Bookings table, UPDLOCK on the read, or a rowversion check. Recipe: conditional update, read rows affected, 0 means "someone else got it".'],
    a: `<p><b>Strong answer:</b> "This is a lost update caused by check-then-act. At READ COMMITTED the read lock is released straight after the SELECT, so two requests can both read 0 before either writes."</p>
<p>"Fix 1, my first choice: make it one conditional statement, <code>UPDATE Seats SET IsBooked = 1, BookedBy = @user WHERE SeatId = @id AND IsBooked = 0</code>, and check rows affected. 1 means I got the seat, 0 means it was taken. The row lock makes the two updates queue up."</p>
<p>"Fix 2, a safety net in the schema: insert into a Bookings table with a <b>unique constraint</b> on (ShowId, SeatId). The second insert fails with a duplicate key error, which I translate to 'seat taken'. Even a buggy code path cannot double-book."</p>
<p>"If the flow must read first, I would read with <code>UPDLOCK</code> inside a short transaction, or use a rowversion column for optimistic concurrency. I would not raise the level to SERIALIZABLE for the whole app, because that adds blocking and deadlocks everywhere."</p>`,
    cx: '<p><b>What is being checked:</b> that you know a transaction alone does not prevent a lost update, and that you reach for a constraint or a conditional write before a heavier isolation level.</p>',
    f: ['How would you hold a seat for 10 minutes while the user pays?', 'How does EF Core tell you that 0 rows were affected?']
  })]
});

/* ================= Topic 3: stored procedures vs ORM, EF Core, Dapper ================= */
topics.push({
  title: 'Stored Procedures, EF Core and Dapper',
  analogy: `<p>Three ways to order food. A <b>stored procedure</b> is a set menu the kitchen wrote: you say "number 12" and the kitchen knows exactly what to cook. <b>EF Core</b> is a waiter who speaks both languages: you describe what you want in C#, he writes the order in SQL, brings the plates back as objects and remembers what you changed so he can update the kitchen later. <b>Dapper</b> is handing the kitchen your own handwritten order slip: you write the SQL, and it only saves you the job of carrying the plates.</p>`,
  explain: `<p>An <b>ORM</b> (object-relational mapper) turns table rows into C# objects and back. <b>EF Core</b> is Microsoft's full ORM; EF Core 10 ships with .NET 10. <b>Dapper</b> is a "micro ORM": you write the SQL and it maps the result columns to your class.</p>
<p>The centre of EF Core is the <b>DbContext</b>. It does 3 jobs:</p>
<ul><li>It holds the <b>model</b>: which classes map to which tables (<code>DbSet&lt;Order&gt;</code>).</li>
<li>It translates <b>LINQ</b> queries into SQL and runs them.</li>
<li>It is a <b>unit of work</b>: its <b>change tracker</b> remembers every entity it loaded and what you changed, and <code>SaveChanges</code> writes all of it in one transaction.</li></ul>
${H.table(['', 'Stored procedure', 'EF Core', 'Dapper'], [
  ['Who writes the SQL', 'You, in the database', 'EF Core, from LINQ', 'You, in C#'],
  ['Change tracking', 'No', 'Yes', 'No'],
  ['Migrations', 'Scripts you manage', 'Built in', 'None'],
  ['Speed', 'Fast', 'Good; overhead from tracking', 'Close to raw ADO.NET'],
  ['Best at', 'Heavy set-based work, tight DB security', 'CRUD and business logic', 'Reports, hot read paths, hand-tuned SQL'],
  ['Weak spot', 'Logic hidden from code review and tests', 'Easy to write slow queries by accident', 'More code to write and keep in sync']
])}
<p>All three protect you from <b>SQL injection</b> as long as values travel as <b>parameters</b> and are never glued into the SQL string.</p>
<p>Most real systems mix them: EF Core for 90% of the work, Dapper or a stored procedure for the few queries that need hand-tuning.</p>`,
  clues: [
    '"Stored procedures or an ORM. Which do you prefer and why?"',
    '"What is the N+1 problem and how do you fix it in EF Core?"',
    '"What does AsNoTracking do? When would you not use it?"',
    '"What is the difference between IQueryable and IEnumerable?"',
    '"How do you run EF Core migrations in production?"',
    '"What lifetime should DbContext have? Is it thread safe?"',
    '"When would you pick Dapper over EF Core?"'
  ],
  code: [
    { lang: 'csharp', check: false, title: 'EF Core: model, context and a read query done right', code: `public class Order
{
    public int Id { get; set; }
    public int CustomerId { get; set; }
    public Customer Customer { get; set; } = null!;     // navigation property
    public List<OrderItem> Items { get; set; } = new();
    public decimal Total { get; set; }
    [Timestamp] public byte[] RowVersion { get; set; } = null!;   // optimistic concurrency token
}

public class ShopDbContext : DbContext
{
    public ShopDbContext(DbContextOptions<ShopDbContext> options) : base(options) { }
    public DbSet<Order> Orders => Set<Order>();
    public DbSet<Customer> Customers => Set<Customer>();
}

// Program.cs: scoped lifetime = one context per HTTP request.
builder.Services.AddDbContext<ShopDbContext>(o =>
    o.UseSqlServer(builder.Configuration.GetConnectionString("Shop"),
        sql => sql.EnableRetryOnFailure()));               // retry transient faults

// A read-only list endpoint: no tracking, only the columns the screen needs.
var page = await db.Orders
    .AsNoTracking()
    .Where(o => o.CustomerId == customerId)
    .OrderByDescending(o => o.Id)
    .Select(o => new OrderSummary(o.Id, o.Customer.Name, o.Total, o.Items.Count))
    .Take(20)
    .ToListAsync(ct);                                      // ONE SQL statement with a JOIN and a COUNT` },
    { lang: 'csharp', check: false, title: 'Dapper: your SQL, mapped to a type', code: `using Dapper;
using Microsoft.Data.SqlClient;

public record OrderSummary(int Id, string CustomerName, decimal Total);

public async Task<IReadOnlyList<OrderSummary>> GetRecentAsync(int customerId)
{
    const string sql = @"
        SELECT TOP (20) o.Id, c.Name AS CustomerName, o.Total
        FROM dbo.Orders o
        JOIN dbo.Customers c ON c.Id = o.CustomerId
        WHERE o.CustomerId = @customerId          -- a parameter, never string concatenation
        ORDER BY o.Id DESC;";

    await using var conn = new SqlConnection(_connectionString);
    var rows = await conn.QueryAsync<OrderSummary>(sql, new { customerId });
    return rows.AsList();
}` }
  ],
  codeTitle: ['EF Core basics', 'Dapper basics'],
  viz: {
    title: 'What the change tracker does between a query and SaveChanges',
    gen: function () {
      var src = 'var order = await db.Orders.FirstAsync(o => o.Id == 10);\norder.Status = "Shipped";\nvar note = new OrderNote { OrderId = 10, Text = "Left with neighbour" };\ndb.OrderNotes.Add(note);\nvar old = await db.OrderNotes.FirstAsync(n => n.Id == 3);\ndb.OrderNotes.Remove(old);\nawait db.SaveChangesAsync();';
      function f(narr, line, cls, tracker, sql, hlT) {
        var h = {}; h[line] = cls;
        return { narr: narr, parts: [{ type: 'code', lang: 'csharp', label: 'Request code', code: src, hl: h }, { type: 'table', label: 'Change tracker (inside this DbContext)', columns: ['Entity', 'State', 'Original values kept?'], rows: tracker, hl: hlT || {} }, { type: 'stack', label: 'SQL sent so far (newest on top)', items: sql }] };
      }
      return [
        f('A new request starts with a fresh, empty DbContext. The change tracker holds nothing and no SQL has been sent.', 1, 'done', [['(empty)', '', '']], ['(nothing yet)']),
        f('Line 1 runs a query. EF Core sends a SELECT, builds an Order object and starts <b>tracking</b> it as <b>Unchanged</b>. It keeps a snapshot of the original values.', 1, 'cur', [['Order #10', 'Unchanged', 'yes: Status = "Paid"']], ['SELECT TOP(1) ... FROM Orders WHERE Id = 10'], { 0: 'ok' }),
        f('Line 2 sets a property. No SQL runs. EF Core will notice later, by comparing the object with its snapshot, and mark the entity <b>Modified</b> (only the Status column).', 2, 'cur', [['Order #10', 'Modified (Status)', 'yes: Status = "Paid"']], ['SELECT TOP(1) ... FROM Orders WHERE Id = 10'], { 0: 'cur' }),
        f('Lines 3 and 4 create a new object and call <code>Add</code>. The entity is tracked as <b>Added</b>. Still no SQL.', 4, 'cur', [['Order #10', 'Modified (Status)', 'yes'], ['OrderNote (new)', 'Added', 'n/a']], ['SELECT TOP(1) ... FROM Orders WHERE Id = 10'], { 1: 'ok' }),
        f('Line 5 loads another row (one more SELECT). Line 6 calls <code>Remove</code>, so its state becomes <b>Deleted</b>. The row is still in the database for now.', 6, 'cur', [['Order #10', 'Modified (Status)', 'yes'], ['OrderNote (new)', 'Added', 'n/a'], ['OrderNote #3', 'Deleted', 'yes']], ['SELECT TOP(1) ... FROM Orders WHERE Id = 10', 'SELECT TOP(1) ... FROM OrderNotes WHERE Id = 3'], { 2: 'bad' }),
        f('Line 7: <code>SaveChanges</code> runs <b>DetectChanges</b>, then opens one transaction and sends one command per change, batched into a single round trip.', 7, 'cur', [['Order #10', 'Modified (Status)', 'yes'], ['OrderNote (new)', 'Added', 'n/a'], ['OrderNote #3', 'Deleted', 'yes']], ['SELECT ... Orders', 'SELECT ... OrderNotes', 'BEGIN TRAN', 'UPDATE Orders SET Status = @p0 WHERE Id = @p1', 'INSERT INTO OrderNotes ...', 'DELETE FROM OrderNotes WHERE Id = @p2', 'COMMIT']),
        f('After a successful save every surviving entity is <b>Unchanged</b> again, the new note has its database-generated Id, and the deleted one is no longer tracked.', 7, 'ok', [['Order #10', 'Unchanged', 'yes: Status = "Shipped"'], ['OrderNote #58', 'Unchanged', 'yes']], ['... COMMIT'], { 0: 'ok', 1: 'ok' }),
        { narr: 'Lesson: tracking costs memory and CPU for every loaded entity. For a read-only query use <code>AsNoTracking()</code> or project with <code>Select</code>, and nothing is tracked at all.', parts: [{ type: 'table', label: 'The 5 entity states', columns: ['State', 'Meaning', 'SaveChanges sends'], rows: [['Detached', 'Not tracked by this context', 'nothing'], ['Unchanged', 'Loaded, not touched', 'nothing'], ['Added', 'New object', 'INSERT'], ['Modified', 'Some properties changed', 'UPDATE (changed columns)'], ['Deleted', 'Marked for removal', 'DELETE']] }] }
      ];
    }
  },
  examples: [
    { title: 'N+1: the same screen, 21 queries or 1', html: `<p>The page shows 20 orders with each customer's name.</p>
${H.table(['Code', 'SQL statements', 'Why'], [
  ['<code>foreach (var o in orders) Print(o.Customer.Name)</code> with lazy loading', H.c('r', '1 + 20 = 21'), '1 query for the list, then 1 per order to load its customer'],
  ['<code>.Include(o =&gt; o.Customer)</code>', H.c('g', '1'), 'One SELECT with a JOIN'],
  ['<code>.Select(o =&gt; new { o.Id, o.Customer.Name })</code>', H.c('g', '1'), 'One SELECT with a JOIN and only 2 columns']
])}
<p>How you spot it: the EF Core log (or Application Insights dependency list) shows the same SELECT repeated with a different Id each time.</p>` },
    { title: 'IQueryable vs IEnumerable: where does the filter run?', html: `<p><code>IQueryable</code> is a query that has <b>not run yet</b>; operators you add become part of the SQL. <code>IEnumerable</code> works on rows that are already in memory.</p>`,
      code: { lang: 'csharp', check: false, code: `// Filter runs in SQL Server: WHERE Total > 100. Only matching rows travel.
var big = await db.Orders.Where(o => o.Total > 100).ToListAsync();

// AsEnumerable() switches to in-memory LINQ: the WHOLE table is downloaded, then filtered in C#.
var slow = db.Orders.AsEnumerable().Where(o => o.Total > 100).ToList();

// Classic trap: a repository that returns IEnumerable<Order> hides the same problem from its callers.` } },
    { title: 'Bulk change without loading entities', html: `<p>To mark 50,000 old orders as archived, loading 50,000 entities and calling SaveChanges is slow and uses a lot of memory. Since EF Core 7 you can send one set-based statement:</p>`,
      code: { lang: 'csharp', check: false, code: `var cutoff = DateTime.UtcNow.AddYears(-2);

int rows = await db.Orders
    .Where(o => o.PlacedOn < cutoff && o.Status == "Delivered")
    .ExecuteUpdateAsync(s => s.SetProperty(o => o.Status, "Archived"));
// One UPDATE ... WHERE statement. It runs immediately, skips the change tracker
// and does not need SaveChanges. ExecuteDeleteAsync works the same way for deletes.` } }
  ],
  deepDive: `<p><b>DbContext lifetime.</b> Register it <b>scoped</b>: one per HTTP request. It is cheap to create, <b>not thread safe</b>, and its tracker grows with every entity it loads, so a long-lived or singleton context leaks memory and serves stale data. For background services or parallel work, inject <code>IDbContextFactory&lt;T&gt;</code> and create one context per unit of work. <code>AddDbContextPool</code> reuses context instances to save allocation on very busy APIs.</p>
<p><b>Loading related data.</b> <b>Eager</b> (<code>Include</code>) loads it in the same query. <b>Explicit</b> (<code>Entry(o).Collection(x =&gt; x.Items).LoadAsync()</code>) loads it later on purpose. <b>Lazy</b> loads it silently on first access, which is the classic source of N+1 and is off by default. Several collection Includes in one query multiply rows (a <b>cartesian explosion</b>); <code>AsSplitQuery()</code> sends one query per collection instead.</p>
<p><b>Migrations in production.</b> A migration is a C# class describing a schema change, kept in source control. Do not let each app instance call <code>Database.Migrate()</code> at startup in a scaled-out service. Instead generate an idempotent script (<code>dotnet ef migrations script --idempotent</code>) or a migration bundle, review it, and run it as a pipeline step before the new code deploys. Make changes backward compatible (add a nullable column first, drop the old one a release later) so old and new code can run side by side.</p>
<p><b>Performance checklist:</b> project to DTOs, <code>AsNoTracking</code> for reads, filter and page in SQL, avoid N+1, use <code>ExecuteUpdate</code>/<code>ExecuteDelete</code> for bulk work, add the indexes your LINQ needs, use compiled queries on very hot paths, and read the generated SQL (<code>ToQueryString()</code> or the log).</p>
<p><b>Stored procedures still earn their place</b> for heavy set-based jobs close to the data, when the DBA team controls access with EXECUTE-only permissions, or for a query that needs hints the ORM cannot express. EF Core can call them with <code>FromSql</code> and map inserts, updates and deletes to them.</p>`,
  aiEra: `<p><b>What AI changes:</b> assistants write LINQ, entity classes and migrations quickly, and can translate a stored procedure into EF Core or the other way round.</p>
<p><b>Use AI as a partner:</b> ask it for the SQL a LINQ query will generate, then check with <code>ToQueryString()</code>. Ask it to review a pull request for N+1 loops, missing <code>AsNoTracking</code>, or a <code>ToList()</code> placed before a <code>Where</code>.</p>
<p><b>Where AI goes wrong:</b> it mixes EF6 and EF Core APIs, invents method names, adds <code>Include</code> for everything "to be safe", builds SQL with string concatenation, and writes migrations that drop and re-create a column (losing the data) when a rename was meant.</p>
<p><b>What you must still own:</b> reading every generated migration before it runs, knowing how many queries one request sends, and choosing where EF Core stops and hand-written SQL starts.</p>`,
  problems: [P({
    t: 'Choose the data access approach for a new service', l: 'Medium', tags: ['EF Core', 'Dapper', 'stored procedures', 'trade-offs'],
    s: 'Your team is starting a payroll service on .NET 10 with SQL Server. It has about 40 ordinary CRUD screens, 3 heavy month-end reports over millions of rows, and one nightly job that recalculates leave balances for 200,000 employees. A senior developer wants "stored procedures for everything, because they are faster". As the lead, what do you propose and how do you justify it?',
    ex: `${H.table(['Workload', 'Shape', 'Good fit'], [['40 CRUD screens', 'Small reads and writes, lots of business rules', H.c('g', 'EF Core')], ['3 month-end reports', 'Big joins and aggregates, read only', H.c('b', 'Dapper or a view / stored procedure')], ['Nightly recalculation', 'One set-based update over 200,000 rows', H.c('p', 'Stored procedure or ExecuteUpdate')]])}`,
    weak: 'EF Core is the modern way, so we should use EF Core for everything and avoid stored procedures.',
    why: 'It is a preference, not a decision. It ignores that the three workloads have different shapes, gives the senior developer no reason to change their mind, and will produce a slow nightly job if 200,000 entities are loaded and saved one by one.',
    q: ['Which statement about stored procedures and EF Core is most accurate?', ['Stored procedures are always much faster because they are precompiled', 'Parameterized queries from EF Core also get cached plans; the real difference is who writes the SQL and where the logic lives', 'EF Core cannot call stored procedures', 'Dapper cannot use parameters'], 1, 'SQL Server caches plans for parameterized ad hoc queries too. The trade-off is maintainability, testability and control, not a blanket speed difference.'],
    h: ['Hint 1: do not pick one tool. Split the work by shape first.', 'Hint 2: what is the real cost of "stored procedures for everything" for testing, code review, refactoring and deployments?', 'Hint 3: answer the "faster" claim with facts (plan caching for parameterized queries) and offer a rule: default tool, escape hatch, and how you will decide case by case with measurements.'],
    a: `<p><b>Strong answer:</b> "I would not choose one tool for all three workloads. My proposal is a default plus two escape hatches."</p>
<ul><li>"<b>Default: EF Core</b> for the 40 CRUD screens. The business rules stay in C# where they are unit tested and code reviewed, migrations version the schema, and LINQ is checked by the compiler."</li>
<li>"<b>Reports: hand-written SQL through Dapper</b> (or a view), because those queries need careful joins and index-aware SQL and get no value from change tracking."</li>
<li>"<b>Nightly job: one set-based statement</b>, either a stored procedure or <code>ExecuteUpdate</code>, because updating 200,000 rows as a set takes seconds and loading them as entities takes minutes."</li></ul>
<p>"On 'procedures are faster': SQL Server caches plans for parameterized queries from EF Core as well, so for simple CRUD the difference is small. Where EF Core is slow it is usually N+1 or over-fetching, which we catch by logging SQL in development and reviewing query counts. And I would agree a rule with the team: if a measured query misses its target after tuning the LINQ and the indexes, it moves to SQL. That gives the senior developer's concern a clear path instead of a debate."</p>`,
    cx: '<p><b>What is being checked:</b> trade-off thinking, respect for a colleague\'s view, and a decision rule the team can apply without you.</p>',
    f: ['Where do the Dapper queries live so they do not scatter across the code base?', 'How do you version and deploy the stored procedure together with the app?']
  })]
});

/* ================= Topic 4: Cosmos DB and NoSQL modelling ================= */
topics.push({
  title: 'Cosmos DB and NoSQL Data Modelling',
  analogy: `<p>A relational database is a <b>filing cabinet with strict forms</b>: every form has the same boxes, and to answer a question you pull forms from several drawers and staple them together (a join). A document database is a set of <b>folders</b>: everything about one order sits in one folder, in whatever shape it needs, so you grab one folder and you are done. The <b>partition key</b> is the label that decides which cabinet a folder goes into. If every folder gets the same label, one cabinet overflows while the others stand empty.</p>`,
  explain: `<p><b>NoSQL</b> is a family of databases that give up some relational features (joins, fixed schema, multi-table transactions) to gain easy horizontal scale and flexible data shapes. Four kinds:</p>
${H.table(['Kind', 'Stores', 'Examples', 'Good for'], [
  ['Document', 'JSON documents', 'Azure Cosmos DB (NoSQL API), MongoDB', 'Catalogues, profiles, orders read as a whole'],
  ['Key-value', 'A value by its key', 'Redis, Azure Table Storage', 'Caches, sessions, counters'],
  ['Wide-column', 'Rows with many sparse columns', 'Cassandra', 'Huge write volumes, time series'],
  ['Graph', 'Nodes and edges', 'Neo4j, Cosmos DB Gremlin API', 'Social links, recommendations']
])}
<p><b>Azure Cosmos DB</b> is Microsoft's managed, globally distributed NoSQL database. The words you need:</p>
<ul><li><b>Container:</b> like a table, but items in it can have different shapes.</li>
<li><b>Item:</b> one JSON document, up to 2 MB, with an <code>id</code>.</li>
<li><b>Partition key:</b> one property you choose (for example <code>/customerId</code>). All items with the same value form a <b>logical partition</b> (up to 20 GB) and live together.</li>
<li><b>Request unit (RU):</b> the currency. Reading one 1 KB item by id and partition key costs 1 RU. Writes and queries cost more. You pay for RUs per second.</li></ul>
<p>The big mindset change: in SQL you model the <b>data</b> and write any query later. In NoSQL you list the <b>queries first</b> (the access patterns) and shape the documents so each common query reads one partition.</p>`,
  clues: [
    '"When would you choose NoSQL over a relational database?"',
    '"How do you choose a partition key in Cosmos DB?"',
    '"What is a request unit? Why are we getting 429 errors?"',
    '"Embed or reference? How do you model one-to-many in a document database?"',
    '"Which consistency levels does Cosmos DB offer?"',
    '"What is a hot partition?"',
    '"How do you keep SQL and Cosmos in sync?" (change feed)'
  ],
  code: [
    { lang: 'json', title: 'One order as a document: line items embedded, customer referenced', code: `{
  "id": "order-1015",
  "customerId": "cust-42",
  "type": "order",
  "placedOn": "2026-02-03T10:15:00Z",
  "status": "Paid",
  "total": 95.00,
  "customerName": "Asha",
  "items": [
    { "sku": "KB-01", "name": "Keyboard", "qty": 1, "price": 70.00 },
    { "sku": "MS-02", "name": "Mouse",    "qty": 1, "price": 25.00 }
  ]
}` },
    { lang: 'csharp', check: false, title: 'Cosmos DB .NET SDK: point read vs query', code: `// One CosmosClient for the whole app (singleton). It manages connections.
Container orders = cosmosClient.GetContainer("shop", "orders");

// 1) Point read: id + partition key. About 1 RU for a 1 KB item, the cheapest call there is.
ItemResponse<Order> one = await orders.ReadItemAsync<Order>(
    id: "order-1015", partitionKey: new PartitionKey("cust-42"));
Console.WriteLine("Cost: " + one.RequestCharge + " RU");

// 2) Query inside ONE partition: still cheap, served by a single physical partition.
var q = new QueryDefinition("SELECT * FROM c WHERE c.type = 'order' AND c.status = @s")
    .WithParameter("@s", "Paid");
using FeedIterator<Order> it = orders.GetItemQueryIterator<Order>(q,
    requestOptions: new QueryRequestOptions { PartitionKey = new PartitionKey("cust-42") });

while (it.HasMoreResults)
{
    FeedResponse<Order> page = await it.ReadNextAsync();
    Console.WriteLine(page.Count + " items, " + page.RequestCharge + " RU");
}
// Leave the PartitionKey out and the same query fans out to every partition: slower and dearer.` }
  ],
  codeTitle: ['Order document', 'Point read vs query'],
  viz: {
    title: 'How the partition key routes a request',
    gen: function () {
      var nodes = [box('C', 'API', 8, 30, 12), box('G', 'Cosmos DB', 34, 30, 18), box('P1', 'Partition 1: cust-01..33', 78, 8, 34), box('P2', 'Partition 2: cust-34..66', 78, 30, 34), box('P3', 'Partition 3: cust-67..99', 78, 52, 34)];
      function g(edges, hl, ehl, tags) { return { type: 'graph', directed: true, height: 62, nodes: nodes, edges: edges, hl: hl || {}, ehl: ehl || {}, tags: tags || {} }; }
      return [
        { narr: 'A container with partition key <code>/customerId</code>. Cosmos DB hashes the key value and spreads the logical partitions over 3 <b>physical partitions</b>. Each gets an equal share of the RUs you bought (here 3,000 RU/s, so 1,000 each).', parts: [g([['C', 'G']]), { type: 'vars', label: 'Throughput', vals: { provisioned: '3,000 RU/s', perPartition: '1,000 RU/s' } }] },
        { narr: '<b>Point read</b> with id <code>order-1015</code> and partition key <code>cust-42</code>. Cosmos hashes cust-42, knows it lives on partition 2 and goes straight there.', parts: [g([['C', 'G', 'id + key'], ['G', 'P2']], { P2: 'ok' }, { 'G-P2': 'ok', 'C-G': 'ok' }), { type: 'vars', label: 'Cost', vals: { operation: 'ReadItem', partitionsTouched: 1, RU: 1 }, hl: { RU: 'ok' } }] },
        { narr: '<b>Query inside one partition:</b> "all paid orders of cust-42". The filter includes the partition key, so again only partition 2 does any work.', parts: [g([['C', 'G', 'WHERE customerId = cust-42'], ['G', 'P2']], { P2: 'ok' }, { 'G-P2': 'ok' }), { type: 'vars', label: 'Cost', vals: { operation: 'Query (single partition)', partitionsTouched: 1, RU: 4 }, hl: { RU: 'ok' } }] },
        { narr: '<b>Cross-partition query:</b> "all orders with status = Paid" has no partition key in the filter. Cosmos must ask <b>every</b> partition and merge the answers. Cost and latency grow with the number of partitions.', parts: [g([['C', 'G', 'WHERE status = Paid'], ['G', 'P1'], ['G', 'P2'], ['G', 'P3']], { P1: 'cur', P2: 'cur', P3: 'cur' }, { 'G-P1': 'cur', 'G-P2': 'cur', 'G-P3': 'cur' }), { type: 'vars', label: 'Cost', vals: { operation: 'Query (fan-out)', partitionsTouched: 3, RU: 45 }, hl: { RU: 'bad' } }] },
        { narr: '<b>Hot partition.</b> One huge customer, cust-50, sends most of the traffic. Partition 2 hits its 1,000 RU/s share and answers <b>429 Too Many Requests</b>, while partitions 1 and 3 sit idle. Buying more RUs is spread evenly, so most of it is wasted.', parts: [g([['C', 'G'], ['G', 'P2', '429']], { P2: 'bad', P1: 'done', P3: 'done' }, { 'G-P2': 'bad' }, { P2: '1,000 / 1,000 RU used', P1: '40 / 1,000', P3: '55 / 1,000' })] },
        { narr: 'The fix is a key with <b>many distinct values and even traffic</b>, that still appears in your most common query. For orders, <code>/customerId</code> usually works; for one giant tenant, a hierarchical key such as tenant then user spreads it further.', parts: [{ type: 'table', label: 'Judging a partition key', columns: ['Candidate', 'Distinct values', 'Even load?', 'In most queries?', 'Verdict'], rows: [['/status', '5', 'no', 'sometimes', 'Bad: 5 giant partitions'], ['/placedOn (date)', 'many', 'no: today is hot', 'sometimes', 'Risky for writes'], ['/id', 'very many', 'yes', 'only for point reads', 'Good for key-value use'], ['/customerId', 'many', 'usually', 'yes', 'Good default here']], hl: { 0: 'bad', 3: 'ok' } }] },
        { narr: 'Summary: design so the common reads are point reads or single-partition queries, keep cross-partition queries for rare admin screens, and watch the RU charge that every SDK response reports.', parts: [g([['C', 'G', 'id + key'], ['G', 'P2']], { P2: 'sel' }, { 'G-P2': 'sel' }), { type: 'text', html: 'Cheapest to dearest: point read, single-partition query, cross-partition query.' }] }
      ];
    }
  },
  examples: [
    { title: 'Embed or reference?', html: `<p><b>Embed</b> means put the child data inside the parent document. <b>Reference</b> means store only an id and keep the child as its own document.</p>
${H.table(['Question', 'Embed', 'Reference'], [
  ['Read together almost every time?', H.c('g', 'yes'), 'no'],
  ['Does the child list grow without limit?', 'no (bounded)', H.c('g', 'yes (unbounded)')],
  ['Does the child change often on its own?', 'no', H.c('g', 'yes')],
  ['Shared by many parents?', 'no', H.c('g', 'yes')]
])}
<p>Order + its line items: <b>embed</b> (a small fixed list, always read together, never changes after purchase). Blog post + comments: <b>reference</b> (comments are unbounded and would push the post past the 2 MB item limit).</p>` },
    { title: 'Denormalize on purpose, and keep it in sync', html: `<p>The order document above copies <code>customerName</code> so the order list needs no second read. That is normal in NoSQL: you trade a little storage and a sync job for a cheaper read.</p>
<p>When the customer renames, the <b>change feed</b> (an ordered log of every insert and update in a container) triggers an Azure Function that updates the copies. For an order it is often correct to <i>not</i> update: the invoice should show the name at the time of purchase.</p>` },
    { title: 'The 5 consistency levels on a number line', html: `${H.table(['Level', 'What a reader may see', 'Cost'], [
  ['Strong', 'Always the latest committed write', 'Highest latency; double RU for reads; limited with multi-region writes'],
  ['Bounded staleness', 'At most K versions or T seconds behind', 'High'],
  ['<b>Session</b> (default)', 'Your own writes, always; others\' writes soon', 'Low'],
  ['Consistent prefix', 'Never out of order, may be behind', 'Low'],
  ['Eventual', 'Anything recent, any order', 'Lowest']
])}
<p>Session suits most apps: the user who just saved sees the save, because the SDK passes a <b>session token</b> with each request.</p>` }
  ],
  deepDive: `<p><b>Request units in practice.</b> A point read of a 1 KB item is 1 RU; a write of the same item is about 5 RU, more if many properties are indexed. Every response carries its <code>RequestCharge</code>, so log it. Three capacity modes: <b>provisioned</b> (fixed RU/s, cheapest for steady load), <b>autoscale</b> (scales between 10% and 100% of a maximum), and <b>serverless</b> (pay per request, for spiky or small workloads). A <b>429</b> means you spent the second's budget; the SDK retries automatically, but repeated 429s point to a hot partition or an expensive query, not just "buy more".</p>
<p><b>Indexing.</b> Cosmos DB indexes every property by default, which makes any filter work but raises write cost. Exclude large properties you never filter on, and add a <b>composite index</b> for queries that sort on two properties.</p>
<p><b>Transactions.</b> ACID transactions exist, but only <b>inside one logical partition</b> (transactional batch or a stored procedure). This is another reason to keep things that must change together under one partition key value.</p>
<p><b>Single-container design.</b> Because a transaction and a cheap query both stop at the partition boundary, teams often store several item types (customer, order, address) in one container under the same partition key, with a <code>type</code> property to tell them apart. One query then returns a customer and their recent orders.</p>
<p><b>When not to use it.</b> Many ad hoc joins and reports, strong multi-entity transactions, or a small data set that fits happily in one SQL database: stay relational. Many teams use both: SQL Server as the system of record, Cosmos DB as a read-optimised copy fed by events. EF Core has a Cosmos provider, but the query model is so different that the native SDK is often clearer.</p>`,
  aiEra: `<p><b>What AI changes:</b> Cosmos DB and other document stores now offer <b>vector search</b>, so chat history, documents and their embeddings can live in one place for retrieval-augmented generation. Assistants are also good at turning a list of access patterns into a first document model.</p>
<p><b>Use AI as a partner:</b> give it your 6 most common queries with their frequency and ask for 2 candidate partition keys and the RU cost shape of each query under both.</p>
<p><b>Where AI goes wrong:</b> it models documents like normalized tables with ids everywhere, picks a low-cardinality key such as <code>/type</code> or <code>/country</code>, ignores the 20 GB logical partition limit, and quotes RU prices or limits that are out of date.</p>
<p><b>What you must still own:</b> the real access patterns and their volumes, the consistency level each feature needs, and a load test that shows RU per operation before you go live.</p>`,
  problems: [P({
    t: 'Pick a partition key for a multi-tenant chat app', l: 'Hard', tags: ['Cosmos DB', 'partition key', 'NoSQL modelling'],
    s: 'You are designing the message store for a team chat product on Cosmos DB. There are 5,000 tenants (companies); a few have 50,000 users, most have under 100. Each tenant has channels; each channel holds messages. The top queries are: (1) load the latest 50 messages of a channel, very frequent; (2) post a message, very frequent; (3) search a tenant\'s messages by text, rare. Choose a partition key and defend it.',
    ex: `${H.table(['Candidate key', 'Query 1: latest 50 in a channel', 'Risk'], [['/tenantId', 'Single partition', H.c('r', 'A big tenant passes 20 GB and becomes hot')], ['/messageId', H.c('r', 'Cross-partition fan-out'), 'Even spread, but the main query is slow'], ['/channelId', H.c('g', 'Single partition'), 'One very busy channel could grow large'], ['/tenantId then /channelId (hierarchical)', H.c('g', 'Single partition'), 'Tenant-wide queries stay targeted too']])}`,
    weak: 'I would partition by tenantId, because it is a multi-tenant app and that keeps each tenant\'s data together.',
    why: 'It sounds tidy but ignores the numbers. A tenant with 50,000 users will exceed the 20 GB logical partition limit and will concentrate traffic on one partition, so it gets throttled while the rest is idle. The answer also never checks the key against the top queries.',
    q: ['Which property makes the best partition key for the "latest 50 messages in a channel" query?', ['/messageId, because it is unique', '/channelId (or tenant + channel), because the query filters on it and traffic spreads over many channels', '/sentDate, because messages are time ordered', '/type'], 1, 'The key must appear in the most frequent query and have many values with even load. Channel does both; date concentrates all writes on today.'],
    h: ['Hint 1: write down the filter of the most frequent query. The partition key should be in it.', 'Hint 2: check each candidate against two limits: 20 GB per logical partition and an even spread of traffic.', 'Hint 3: think about hierarchical partition keys (up to 3 levels) and about what to do with a channel that grows for years, for example adding a month bucket to the key. Recipe: list queries, test candidates, pick, then name the risk you accept.'],
    a: `<p><b>Strong answer:</b> "I start from the access patterns. The two frequent operations both work on one channel, so the channel must be in the key. I would use a <b>hierarchical partition key</b>: <code>/tenantId</code>, then <code>/channelId</code>."</p>
<ul><li>"Query 1 supplies both levels, so it is a <b>single-partition query</b>, sorted by a timestamp inside the partition. Cheap and fast."</li>
<li>"Writes spread across thousands of channels, so no single partition is hot, even for the 50,000-user tenant."</li>
<li>"A tenant-wide query supplies only the first level and is still routed to that tenant's partitions rather than the whole container. That also gives a clean answer for tenant data export or deletion."</li></ul>
<p>"I would not use <code>/tenantId</code> alone: the big tenants would pass 20 GB and run hot. I would not use <code>/messageId</code>: perfect spread but the main query fans out."</p>
<p>"The risk I accept is one channel that grows for years. If monitoring shows a channel approaching the limit I add a third level, a month bucket such as <code>2026-02</code>, and the 'latest 50' query reads the current month first. Search by text is rare and a poor fit for Cosmos queries, so I would feed messages through the change feed into a search index (Azure AI Search). I would confirm RU per operation with a load test before launch."</p>`,
    cx: '<p><b>What is being checked:</b> that you derive the key from the queries and the limits, name the risk you accept, and move the awkward query to a tool that suits it.</p>',
    f: ['Which consistency level would you choose for chat, and why?', 'How do you delete all data of one tenant cheaply?']
  })]
});

/* ================= Topic 5: Redis caching and scaling the database ================= */
topics.push({
  title: 'Caching with Redis and Scaling: Replicas, Partitioning, Sharding',
  analogy: `<p>A busy cafe. The <b>cache</b> is the tray of ready-made sandwiches on the counter: most customers are served in seconds without troubling the kitchen. Sandwiches go stale, so each has a "use by" time (a <b>TTL</b>). <b>Read replicas</b> are extra counters that only hand out food, all supplied by one kitchen. <b>Partitioning</b> is splitting one big fridge into labelled drawers so you open only the drawer you need. <b>Sharding</b> is opening a second cafe across town: customers A to M go to one, N to Z to the other. More capacity, but now nobody can easily count all the sandwiches in one go.</p>`,
  explain: `<p>A <b>cache</b> keeps a copy of data that is expensive to fetch, in memory, so the next request gets it fast. <b>Redis</b> is an in-memory key-value store used as a shared cache: every instance of your API sees the same entries. On Azure it is offered as Azure Managed Redis (and the older Azure Cache for Redis).</p>
<p>The standard pattern is <b>cache-aside</b>:</p>
<ol><li>Look in the cache.</li><li><b>Hit:</b> return it.</li><li><b>Miss:</b> read the database, store the result in the cache with a TTL, return it.</li><li>On an <b>update</b>: write the database, then <b>delete</b> the cache key.</li></ol>
<p>In ASP.NET Core you have 3 levels:</p>
${H.table(['API', 'Lives where', 'Use when'], [
  ['<code>IMemoryCache</code>', 'Inside one process', 'One instance, or data that may differ per instance'],
  ['<code>IDistributedCache</code>', 'Redis (or SQL Server)', 'Several instances must share entries'],
  ['<code>HybridCache</code> (.NET 9+)', 'Both: local first, then Redis', 'Default choice now; also stops a stampede']
])}
<p>When the database itself is the limit, you scale in this order, cheapest first:</p>
${H.table(['Step', 'What it is', 'Helps', 'New problem'], [
  ['Tune', 'Indexes, better queries, caching', 'Everything', 'None'],
  ['Scale up', 'Bigger server', 'Reads and writes', 'A ceiling, and cost'],
  ['Read replicas', 'Copies that serve SELECTs', 'Reads', 'Replication lag: slightly stale reads'],
  ['Partitioning', 'One table split into parts by a key, same database', 'Maintenance, archiving, some scans', 'Queries must include the key'],
  ['Sharding', 'Data split across separate databases', 'Reads and writes', 'Cross-shard queries, transactions, rebalancing']
])}`,
  clues: [
    '"Explain the cache-aside pattern. What happens on a cache miss?"',
    '"How do you invalidate a cache? What TTL would you choose?"',
    '"What is a cache stampede and how do you prevent it?"',
    '"IMemoryCache vs IDistributedCache. Which and why?"',
    '"The database CPU is at 95%. What are your options, in order?"',
    '"What is the difference between partitioning and sharding?"',
    '"After we added a read replica, users sometimes do not see what they just saved."'
  ],
  code: [
    { lang: 'csharp', title: 'Plain C#: cache-aside with a TTL, to show the idea (no framework)', code: `using System;
using System.Collections.Generic;

// A tiny in-memory cache with expiry, to show what Redis or IMemoryCache does for you.
public class TtlCache
{
    private class Entry { public string Value; public DateTime ExpiresAt; }
    private readonly Dictionary<string, Entry> _items = new Dictionary<string, Entry>();
    private readonly object _gate = new object();
    public int Hits, Misses;

    // Cache-aside: return the cached value, or load it, store it and return it.
    public string GetOrLoad(string key, TimeSpan ttl, Func<string> loadFromDatabase)
    {
        lock (_gate)
        {
            Entry e;
            if (_items.TryGetValue(key, out e) && e.ExpiresAt > DateTime.UtcNow)
            {
                Hits++;
                return e.Value;                      // hit: no database call
            }
        }

        string fresh = loadFromDatabase();           // miss: the slow call, outside the lock
        lock (_gate)
        {
            Misses++;
            _items[key] = new Entry { Value = fresh, ExpiresAt = DateTime.UtcNow.Add(ttl) };
        }
        return fresh;
    }

    // Call this right after the database row is updated.
    public void Remove(string key)
    {
        lock (_gate) { _items.Remove(key); }
    }
}

public static class Demo
{
    public static void Main()
    {
        var cache = new TtlCache();
        int dbCalls = 0;
        Func<string> load = () => { dbCalls++; return "Keyboard, 70.00"; };

        cache.GetOrLoad("product:7", TimeSpan.FromMinutes(5), load);   // miss
        cache.GetOrLoad("product:7", TimeSpan.FromMinutes(5), load);   // hit
        cache.Remove("product:7");                                     // price changed
        cache.GetOrLoad("product:7", TimeSpan.FromMinutes(5), load);   // miss again

        Console.WriteLine("db calls = " + dbCalls + ", hits = " + cache.Hits + ", misses = " + cache.Misses);
        // db calls = 2, hits = 1, misses = 2
    }
}` },
    { lang: 'csharp', check: false, title: 'ASP.NET Core: HybridCache in front of EF Core', code: `// Program.cs
builder.Services.AddStackExchangeRedisCache(o =>
    o.Configuration = builder.Configuration.GetConnectionString("Redis"));
builder.Services.AddHybridCache();        // L1 = memory, L2 = the Redis cache registered above

public class ProductService(HybridCache cache, ShopDbContext db)
{
    public async Task<ProductDto?> GetAsync(int id, CancellationToken ct) =>
        await cache.GetOrCreateAsync(
            "product:" + id,
            async token => await db.Products.AsNoTracking()
                .Where(p => p.Id == id)
                .Select(p => new ProductDto(p.Id, p.Name, p.Price))
                .FirstOrDefaultAsync(token),
            new HybridCacheEntryOptions { Expiration = TimeSpan.FromMinutes(5) },
            cancellationToken: ct);
    // If 200 requests miss at once, HybridCache runs the factory ONCE and shares the result.

    public async Task UpdatePriceAsync(int id, decimal price, CancellationToken ct)
    {
        await db.Products.Where(p => p.Id == id)
            .ExecuteUpdateAsync(s => s.SetProperty(p => p.Price, price), ct);
        await cache.RemoveAsync("product:" + id, ct);   // database first, then delete the key
    }
}` }
  ],
  codeTitle: ['Cache-aside by hand', 'HybridCache with Redis'],
  viz: {
    title: 'Cache-aside: miss, hit, update, and a read replica',
    gen: function () {
      var nodes = [box('U', 'Browser', 8, 30, 12), box('A', 'API', 32, 30, 10), box('R', 'Redis', 62, 8, 12), box('P', 'SQL primary', 62, 34, 18), box('X', 'Read replica', 90, 52, 18)];
      function g(edges, hl, ehl, tags) { return { type: 'graph', directed: true, height: 62, nodes: nodes, edges: edges, hl: hl || {}, ehl: ehl || {}, tags: tags || {} }; }
      var base = [['P', 'X', 'replication']];
      return [
        { narr: 'The pieces: the API, a Redis cache shared by all API instances, the primary database that takes every write, and a read replica that receives a copy a moment later.', parts: [g(base.concat([['U', 'A']])), { type: 'map', label: 'Redis', entries: [['(empty)', '']] }] },
        { narr: '<b>Request 1: GET /products/7.</b> The API asks Redis for <code>product:7</code>. Nothing there. This is a <b>cache miss</b>.', parts: [g(base.concat([['U', 'A', 'GET'], ['A', 'R', 'GET product:7']]), { R: 'bad' }, { 'A-R': 'bad' }, { R: 'miss' }), { type: 'map', label: 'Redis', entries: [['(empty)', '']] }] },
        { narr: 'On a miss the API reads the database (about 40 ms), then stores the result in Redis with a <b>TTL</b> of 5 minutes and returns it.', parts: [g(base.concat([['A', 'P', 'SELECT'], ['A', 'R', 'SET, TTL 300 s']]), { P: 'cur', R: 'ok' }, { 'A-P': 'cur', 'A-R': 'ok' }), { type: 'map', label: 'Redis', entries: [['product:7', '{ Keyboard, 70.00 } ttl 300 s']], hl: { 'product:7': 'ok' } }, { type: 'vars', vals: { latency: '45 ms', dbCalls: 1 } }] },
        { narr: '<b>Request 2: the same product.</b> Redis has it. A <b>cache hit</b> takes about 1 ms and the database is not touched. With a 95% hit rate the database sees 1 request in 20.', parts: [g(base.concat([['U', 'A', 'GET'], ['A', 'R', 'GET product:7']]), { R: 'ok' }, { 'A-R': 'ok' }, { R: 'hit' }), { type: 'map', label: 'Redis', entries: [['product:7', '{ Keyboard, 70.00 } ttl 262 s']], hl: { 'product:7': 'sel' } }, { type: 'vars', vals: { latency: '2 ms', dbCalls: 1 }, hl: { latency: 'ok' } }] },
        { narr: '<b>An admin changes the price to 65.</b> The API writes the primary first, then <b>deletes</b> the key. Deleting is safer than writing the new value into the cache: two racing updates cannot leave the older one behind.', parts: [g(base.concat([['A', 'P', 'UPDATE'], ['A', 'R', 'DEL product:7']]), { P: 'cur', R: 'bad' }, { 'A-P': 'cur', 'A-R': 'bad' }), { type: 'map', label: 'Redis', entries: [['(empty)', '']] }] },
        { narr: 'The next read misses, loads 65 from the database and caches it again. If the delete had failed, the TTL is the safety net: the stale price disappears after at most 5 minutes.', parts: [g(base.concat([['A', 'P', 'SELECT'], ['A', 'R', 'SET']]), { R: 'ok' }, { 'A-R': 'ok', 'A-P': 'cur' }), { type: 'map', label: 'Redis', entries: [['product:7', '{ Keyboard, 65.00 } ttl 300 s']], hl: { 'product:7': 'ok' } }] },
        { narr: '<b>Scaling reads.</b> Report and list queries go to the <b>read replica</b>; all writes still go to the primary. The replica is a little behind (replication lag, often well under a second, sometimes more).', parts: [g(base.concat([['A', 'P', 'writes'], ['A', 'X', 'reads']]), { X: 'win', P: 'cur' }, { 'A-X': 'win', 'P-X': 'cur' }, { X: 'lag ~200 ms' })] },
        { narr: 'The catch: a user saves, the page reloads from the replica and the change is not there yet. Fix: read your own writes from the <b>primary</b> for a short time after a write, or for screens that must be exact.', parts: [g(base.concat([['A', 'P', 'write, then read back']]), { P: 'ok', X: 'done' }, { 'A-P': 'ok' }), { type: 'table', label: 'Where to read', columns: ['Read', 'Send to'], rows: [['The record the user just saved', 'Primary'], ['Balances, stock at checkout', 'Primary'], ['Search, lists, reports, dashboards', 'Replica'], ['Product page', 'Cache, then replica']], hl: { 0: 'ok' } }] }
      ];
    }
  },
  examples: [
    { title: 'Cache stampede: 500 misses at once', html: `<p>A popular key expires. In the same second 500 requests miss, and all 500 run the same 2-second query. The database falls over, which makes the query slower, which makes it worse. This is a <b>cache stampede</b> (also called thundering herd).</p>
${H.table(['Fix', 'How it helps'], [
  ['Single flight / lock per key', 'The first request loads; the other 499 wait for its result. HybridCache does this.'],
  ['TTL with jitter', 'Expire at 300 s plus or minus a random 30 s, so keys do not all expire together'],
  ['Refresh ahead', 'A background job refreshes hot keys before they expire'],
  ['Serve stale while refreshing', 'Return the old value for a few seconds while one request reloads']
])}` },
    { title: 'Partitioning a table by month (same database)', html: `<p>A 2-billion-row <code>AuditLog</code> table is <b>partitioned</b> on <code>LoggedAt</code> by month. It is still one table to the application.</p>
<ul><li>A query for "last week" touches only 1 or 2 partitions (<b>partition elimination</b>), if the filter includes <code>LoggedAt</code>.</li>
<li>Dropping data older than 7 years is a metadata operation (truncate or switch out one partition) instead of a DELETE of 20 million rows.</li>
<li>Index rebuilds can run one partition at a time.</li></ul>
<p>It does <b>not</b> add servers. Partitioning is mainly a manageability tool; it only speeds up queries that filter on the partition column.</p>`,
      code: { lang: 'sql', check: false, code: `CREATE PARTITION FUNCTION pfMonth (datetime2)
AS RANGE RIGHT FOR VALUES ('2026-01-01', '2026-02-01', '2026-03-01');

CREATE PARTITION SCHEME psMonth
AS PARTITION pfMonth ALL TO ([PRIMARY]);

CREATE TABLE dbo.AuditLog (
    AuditId  bigint IDENTITY NOT NULL,
    LoggedAt datetime2 NOT NULL,
    Message  nvarchar(400) NOT NULL,
    CONSTRAINT PK_AuditLog PRIMARY KEY CLUSTERED (LoggedAt, AuditId)   -- partition column must be in the key
) ON psMonth (LoggedAt);` } },
    { title: 'Sharding by tenant', html: `<p>A SaaS product keeps 4,000 tenants in one database and writes are now the limit. With <b>sharding</b>, tenants are spread over several databases. A small <b>shard map</b> (tenant → database) tells the API which connection string to use.</p>
${H.table(['Strategy', 'How the shard is chosen', 'Trade-off'], [
  ['Range', 'Tenant ids 1 to 1000 → shard 1', 'Simple; new tenants pile onto the last shard'],
  ['Hash', 'hash(tenantId) mod N', 'Even spread; adding a shard moves lots of data unless you use consistent hashing'],
  ['Directory (lookup)', 'A table says where each tenant lives', 'Flexible: move one big tenant alone; the directory must be fast and highly available']
])}
<p>What you lose: joins and transactions across shards, simple global reports, and easy schema changes (every shard needs the migration).</p>` }
  ],
  deepDive: `<p><b>What to cache, and what not to.</b> Cache data that is read often, changes rarely and is costly to produce: product details, reference lists, permission sets, rendered fragments. Do not cache what must be exact at the moment of use (stock at checkout, balances), and do not let a cache hide a missing index. Decide the TTL from "how stale may this be?" and say that number out loud in an interview.</p>
<p><b>Invalidation is the hard part.</b> Delete on write covers the simple case. A race is still possible: request A misses and reads the old row, request B updates and deletes the key, then A stores the old value. A short TTL bounds the damage; versioned keys or tag-based invalidation (HybridCache supports tags) help for groups of keys. Local in-memory copies on other instances need a signal to drop their entry, usually Redis pub/sub or a short local TTL.</p>
<p><b>Redis beyond a cache.</b> It has data types (strings, hashes, lists, sets, sorted sets, streams) and atomic commands, so it also serves as a rate limiter (<code>INCR</code> with an expiry), a leaderboard (sorted set), a session store and a simple distributed lock (<code>SET key value NX PX 30000</code>). It is single threaded for commands, so one slow command (<code>KEYS *</code>) blocks everyone. When memory is full the <b>eviction policy</b> decides what goes, for example <code>allkeys-lru</code>. Treat cached data as disposable: the app must work, slower, when Redis is empty or down.</p>
<p><b>Read replicas on SQL Server and Azure SQL.</b> Always On availability groups provide readable secondaries; Azure SQL Business Critical and Hyperscale offer read scale-out. The app opts in with <code>ApplicationIntent=ReadOnly</code> in the connection string, typically through a second DbContext registration for read-only queries.</p>
<p><b>Connection pooling.</b> ADO.NET keeps a pool of open connections per connection string (100 by default). Opening is then nearly free, but only if you <b>return</b> connections quickly: dispose them, do not hold a DbContext across long work, and use async calls all the way down. "Timeout expired. The timeout period elapsed prior to obtaining a connection from the pool" means the pool is empty, usually because of leaked connections or blocked threads, not because the pool is too small.</p>
<p><b>Sharding last.</b> Before sharding, try tuning, caching, replicas, archiving cold data and moving a hot feature to its own database. Sharding is hard to undo, and the shard key decides everything: choose one that is in nearly every query (tenant id, user id) so most requests touch one shard.</p>`,
  aiEra: `<p><b>What AI changes:</b> large language model calls are slow and cost money per token, so caching moved up the stack: teams now cache model answers, embeddings and retrieved documents in Redis, sometimes keyed by meaning rather than exact text (a <b>semantic cache</b>).</p>
<p><b>Use AI as a partner:</b> describe your read and write mix and ask for a caching plan with key names, TTLs and invalidation points, then ask it to list the race conditions in that plan.</p>
<p><b>Where AI goes wrong:</b> it adds a cache to everything, forgets invalidation entirely, caches per-user data under a shared key (a data leak), suggests sharding at the first sign of load, and uses <code>IMemoryCache</code> in a service that runs on 6 instances.</p>
<p><b>What you must still own:</b> the staleness each screen can tolerate, cache keys that include the tenant or user where needed, hit-rate and latency metrics, and proof that the system still works when the cache is cold.</p>`
});

/* ================= Interview: Section A, modelling and SQL basics ================= */
interview.push({ q: 'What is the difference between a primary key, a foreign key and a unique key?', level: 'B',
  a: `<p>A primary key identifies one row in its own table, a foreign key points at a row in another table, and a unique key simply forbids duplicates in a column.</p>
<table><thead><tr><th></th><th>Primary key</th><th>Unique key</th><th>Foreign key</th></tr></thead><tbody>
<tr><td>Purpose</td><td>Names the row</td><td>No two rows share the value</td><td>Links to a parent row</td></tr>
<tr><td>NULL allowed</td><td>No</td><td>Yes (one NULL in SQL Server)</td><td>Yes, if the link is optional</td></tr>
<tr><td>How many per table</td><td>1</td><td>Many</td><td>Many</td></tr>
<tr><td>Index created for you</td><td>Yes, clustered by default</td><td>Yes, nonclustered</td><td><b>No</b></td></tr></tbody></table>
<p>Example: <code>Customers.Id</code> is the primary key, <code>Customers.Email</code> has a unique key, and <code>Orders.CustomerId</code> is a foreign key to <code>Customers.Id</code>. The database then refuses an order for a customer that does not exist. Because SQL Server does not index foreign key columns automatically, you normally add that index yourself, since joins and cascade deletes use it.</p>
<blockquote><b>Say it in the interview:</b> A primary key names the row, a unique key stops duplicates, and a foreign key guarantees the parent exists. I index my foreign keys by hand because SQL Server does not.</blockquote>`,
  followUps: ['What is a composite key, and when would you use one?', 'Natural key or surrogate key: which do you prefer?', 'What do ON DELETE CASCADE and ON DELETE NO ACTION do?'] });

interview.push({ q: 'What is normalization? Explain 1NF, 2NF and 3NF with an example.', level: 'B',
  a: `<p>Normalization means organising tables so that each fact is stored exactly once, which stops the copies drifting apart.</p>
<ul><li><b>1NF:</b> one value per cell and no repeating columns. <code>Phone1, Phone2, Phone3</code> becomes a <code>CustomerPhones</code> table.</li>
<li><b>2NF:</b> 1NF, and every non-key column depends on the <b>whole</b> key. In <code>OrderItems(OrderId, ProductId, ProductName)</code> the name depends only on ProductId, so it moves to <code>Products</code>.</li>
<li><b>3NF:</b> 2NF, and no non-key column depends on another non-key column. In <code>Orders(OrderId, CustomerId, CustomerCity)</code> the city depends on the customer, so it moves to <code>Customers</code>.</li></ul>
<p>The old memory aid: every column depends on "the key, the whole key, and nothing but the key". What you gain is no <b>update anomaly</b> (changing a city in 400 order rows), no <b>insert anomaly</b> (cannot add a product until it is ordered) and no <b>delete anomaly</b> (deleting the last order loses the customer's city). What you pay is more joins.</p>
<blockquote><b>Say it in the interview:</b> I normalize to third normal form by default so each fact lives in one place, and I only denormalize later for a measured read problem.</blockquote>`,
  followUps: ['What is BCNF and how does it differ from 3NF?', 'Show me an update anomaly in a table you have worked with.', 'Is a JSON column a 1NF violation?'] });

interview.push({ q: 'Rapid fire: SQL basics', level: 'B',
  a: `<p>Short answers to the quick questions that open most database rounds.</p>
<table><thead><tr><th>Question</th><th>Short answer</th></tr></thead><tbody>
<tr><td>DELETE vs TRUNCATE vs DROP?</td><td>DELETE removes chosen rows and logs each one. TRUNCATE empties the table fast and resets identity. DROP removes the table itself.</td></tr>
<tr><td>WHERE vs HAVING?</td><td>WHERE filters rows before grouping. HAVING filters groups after GROUP BY.</td></tr>
<tr><td>UNION vs UNION ALL?</td><td>UNION removes duplicates (extra sort or hash). UNION ALL keeps everything and is faster.</td></tr>
<tr><td>INNER JOIN vs LEFT JOIN?</td><td>INNER returns only matching rows. LEFT keeps every left row and fills missing right columns with NULL.</td></tr>
<tr><td>VARCHAR vs NVARCHAR?</td><td>NVARCHAR stores Unicode (UTF-16). VARCHAR uses the column's code page: 1 byte per character normally, or UTF-8 with a UTF-8 collation.</td></tr>
<tr><td>Temp table vs table variable?</td><td>A #temp table has statistics and can be indexed freely; a table variable is lighter but the optimizer knows little about its row count.</td></tr>
<tr><td>View vs CTE?</td><td>A view is a saved, named query. A CTE is a named query that lives for one statement only.</td></tr></tbody></table>
<blockquote><b>Say it in the interview:</b> Keep each of these to one sentence, then stop. If they want more, they will ask.</blockquote>`,
  followUps: ['Can you roll back a TRUNCATE?', 'What is a correlated subquery?', 'What does COUNT(*) return compared with COUNT(column)?'] });

interview.push({ q: 'When would you denormalize a database on purpose?', level: 'I',
  a: `<p>I denormalize when a read that matters is too slow or too costly with joins, and I have measured it, not before.</p>
<p>Common, safe forms:</p>
<ul><li><b>A stored total:</b> <code>Orders.Total</code> instead of summing the line items on every read.</li>
<li><b>A copied label:</b> the product name on the order line, which is also <i>correct</i> history, because the invoice must show the name at the time of sale.</li>
<li><b>A reporting table or indexed view:</b> pre-joined, pre-aggregated data for dashboards.</li>
<li><b>A read model</b> in another store (a cache or document database) fed by events.</li></ul>
<p>The cost is that the same fact now lives in two places, so I must name the mechanism that keeps them in step: the same transaction, a trigger, a computed column, or an event handler. I also decide how stale the copy may be. Before denormalizing I try the cheaper fixes: a covering index, a better query, or caching.</p>
<blockquote><b>Say it in the interview:</b> Normalize for writes, denormalize for a proven read problem, and always say what keeps the copy in sync.</blockquote>`,
  followUps: ['What is an indexed view in SQL Server and what are its limits?', 'How does a star schema use denormalization?', 'How would you detect that a stored total has drifted from the real sum?'] });

/* ================= Interview: Section B, indexes and execution plans ================= */
interview.push({ q: 'What is an index, and why not put an index on every column?', level: 'B',
  a: `<p>An index is a sorted copy of one or more columns that lets the database find rows without reading the whole table, like the index at the back of a book.</p>
<p>It is stored as a <b>B-tree</b>: a root page, a few levels of signposts and sorted leaf pages. Even with 100 million rows the tree is only 3 or 4 levels deep, so a lookup reads a handful of 8 KB pages.</p>
<p>Why not index everything:</p>
<ul><li><b>Writes get slower.</b> Each INSERT, UPDATE or DELETE must also change every index that contains the affected columns.</li>
<li><b>Storage and memory.</b> Each index is extra pages on disk and in the buffer pool.</li>
<li><b>More to maintain:</b> more fragmentation, longer backups, longer rebuilds.</li>
<li><b>Many are never used.</b> The optimizer ignores an index on a low-selectivity column such as a yes/no flag.</li></ul>
<p>So I index for the queries: columns in WHERE, JOIN and ORDER BY of frequent or slow statements, and I check usage with <code>sys.dm_db_index_usage_stats</code> before adding or dropping.</p>
<blockquote><b>Say it in the interview:</b> An index trades slower writes and more storage for faster reads, so I add one per important query pattern, not per column.</blockquote>`,
  followUps: ['How many levels does a B-tree have for a billion rows?', 'What is selectivity and why does it matter?', 'How do you find unused indexes?'] });

interview.push({ q: 'What is the difference between a clustered and a nonclustered index?', level: 'B',
  a: `<p>A clustered index <b>is</b> the table, stored in key order, while a nonclustered index is a separate sorted structure that points back to the table.</p>
<table><thead><tr><th></th><th>Clustered</th><th>Nonclustered</th></tr></thead><tbody>
<tr><td>Leaf level holds</td><td>The full data rows</td><td>Key columns, included columns and a row locator</td></tr>
<tr><td>Per table</td><td>1 only</td><td>Up to 999</td></tr>
<tr><td>Row locator</td><td>n/a</td><td>The clustered key (or a row id if the table is a heap)</td></tr>
<tr><td>Typical use</td><td>Primary key, range queries on the key</td><td>Other search, join and sort columns</td></tr></tbody></table>
<p>Two points interviewers like:</p>
<ul><li>A table with no clustered index is called a <b>heap</b>.</li>
<li>Because every nonclustered index carries the clustered key as its pointer, a <b>wide</b> clustered key makes every other index bigger. Keep it narrow, unique and ever-increasing.</li></ul>
<p>By default, declaring a PRIMARY KEY creates a clustered index, but the two are separate ideas: you can make the primary key nonclustered and cluster on another column.</p>
<blockquote><b>Say it in the interview:</b> Clustered is the data itself in key order, one per table. Nonclustered is a separate sorted copy that points to it, and you can have many.</blockquote>`,
  followUps: ['When would you cluster on something other than the primary key?', 'What is a heap and when is one acceptable?', 'What happens to nonclustered indexes when you change the clustered key?'] });

interview.push({ q: 'What is a covering index, and what does INCLUDE do?', level: 'I',
  a: `<p>A covering index contains every column a query needs, so the engine answers the query from the index alone and never visits the table.</p>
<p>Without it, a nonclustered index finds the rows and then does a <b>key lookup</b> per row to fetch the missing columns. For a few rows that is fine; for thousands it is the slow part of the plan.</p>
<pre><code>-- Query
SELECT OrderId, Total FROM dbo.Orders
WHERE CustomerId = @id AND Status = 'Paid';

-- Covering index
CREATE INDEX IX_Orders_Customer_Status
ON dbo.Orders (CustomerId, Status)
INCLUDE (Total);</code></pre>
<ul><li><b>Key columns</b> (in brackets) are sorted and usable for seeking and ordering.</li>
<li><b>INCLUDE columns</b> are stored only at the leaf level. They are not sorted, do not count towards the key size limit and add less overhead.</li></ul>
<p>Do not cover <code>SELECT *</code>: you would copy the whole table. Cover the 2 or 3 hottest queries and select only the columns you need.</p>
<blockquote><b>Say it in the interview:</b> Filter and sort columns go in the key, the other selected columns go in INCLUDE, and the key lookup disappears from the plan.</blockquote>`,
  followUps: ['How do you see a key lookup in an execution plan?', 'What is the downside of a very wide INCLUDE list?', 'What is a filtered index?'] });

interview.push({ q: 'How do you decide the column order in a composite index?', level: 'I',
  a: `<p>Put the columns you test with equals first, then the column you range over or sort by, because an index can only be searched from its left-most column onward.</p>
<p>An index on <code>(CustomerId, PlacedOn)</code> is sorted like a phone book: by customer, then by date within each customer.</p>
<table><thead><tr><th>Filter</th><th>Seek?</th></tr></thead><tbody>
<tr><td>CustomerId = 7</td><td>Yes</td></tr>
<tr><td>CustomerId = 7 AND PlacedOn &gt;= '2026-01-01'</td><td>Yes, both columns</td></tr>
<tr><td>CustomerId = 7 ORDER BY PlacedOn DESC</td><td>Yes, and no Sort operator</td></tr>
<tr><td>PlacedOn &gt;= '2026-01-01' only</td><td>No, it scans</td></tr></tbody></table>
<p>My rule: <b>equality, then range or sort, then INCLUDE the rest</b>. Among several equality columns, lead with the one that appears in the most queries, and where that is equal, the more selective one. Once a range column is used, columns after it in the key cannot be used for seeking. One well-ordered composite index usually beats 3 single-column ones.</p>
<blockquote><b>Say it in the interview:</b> Equality columns first, then the range or sort column, and anything else in INCLUDE. An index is only useful from its left edge.</blockquote>`,
  followUps: ['Can one index serve two different queries? Give an example.', 'Does column order matter in the INCLUDE list?', 'What is index intersection and why is it rarely the best plan?'] });

interview.push({ q: 'What does "sargable" mean? Give examples of predicates that are not.', level: 'I',
  a: `<p>A predicate is sargable when the engine can use an index seek to satisfy it; the word is short for "search argument-able".</p>
<p>The index is sorted by the stored column value. If you wrap the column in a function or a calculation, the engine has to compute it for every row, so it scans.</p>
<table><thead><tr><th>Not sargable</th><th>Sargable rewrite</th></tr></thead><tbody>
<tr><td>WHERE YEAR(PlacedOn) = 2026</td><td>WHERE PlacedOn &gt;= '2026-01-01' AND PlacedOn &lt; '2027-01-01'</td></tr>
<tr><td>WHERE Name LIKE '%son'</td><td>WHERE Name LIKE 'John%'</td></tr>
<tr><td>WHERE ISNULL(Status, 'New') = 'New'</td><td>WHERE Status = 'New' OR Status IS NULL</td></tr>
<tr><td>WHERE Price * 1.2 &gt; 100</td><td>WHERE Price &gt; 100 / 1.2</td></tr>
<tr><td>WHERE VarcharCol = N'abc' or = 42</td><td>Compare with the column's own type</td></tr></tbody></table>
<p>The last row is an <b>implicit conversion</b>. From C# it often comes from a string parameter sent as NVARCHAR against a VARCHAR column; in EF Core you fix it by mapping the column type correctly (<code>IsUnicode(false)</code>).</p>
<blockquote><b>Say it in the interview:</b> Keep the column bare on one side of the comparison. A function or a type conversion on the column turns a seek into a scan.</blockquote>`,
  followUps: ['How would you make a "contains" text search fast?', 'What is a computed column and how can indexing it help?', 'How do you spot an implicit conversion in a plan?'] });

interview.push({ q: 'Explain index seek, index scan and key lookup.', level: 'I',
  a: `<p>A seek jumps straight to the matching rows through the B-tree, a scan reads the whole index or table, and a key lookup is an extra trip to the table for columns the index does not carry.</p>
<table><thead><tr><th>Operator</th><th>What it does</th><th>Cost grows with</th></tr></thead><tbody>
<tr><td>Index Seek</td><td>Walks root to leaf, then reads the matching range</td><td>Rows <b>returned</b></td></tr>
<tr><td>Index or Table Scan</td><td>Reads every leaf page</td><td>Rows <b>in the table</b></td></tr>
<tr><td>Key Lookup</td><td>For each row found, fetches the rest from the clustered index</td><td>Rows found, 1 trip each</td></tr></tbody></table>
<p>Two things a good candidate adds:</p>
<ul><li><b>A scan is not always bad.</b> On a 200-row table, or when the query needs most of the rows, a scan is the cheapest plan.</li>
<li><b>A seek is not always good.</b> A seek that returns 2 million rows, each with a key lookup, is worse than one scan. The point where the optimizer switches from seek + lookup to scan is called the <b>tipping point</b>, often at well under 1% of the table.</li></ul>
<blockquote><b>Say it in the interview:</b> Seek cost follows the rows I return, scan cost follows the size of the table, and a key lookup is the sign that my index is not covering.</blockquote>`,
  followUps: ['What is a RID lookup?', 'What join operators do you know and when is each chosen?', 'Why might the optimizer ignore your new index?'] });

interview.push({ q: 'A query is slow in production. How do you find the cause and tune it?', level: 'A',
  a: `<p>I measure first, read the actual execution plan, fix the biggest cost, and measure again.</p>
<ol><li><b>Find it.</b> Query Store (or Azure SQL Query Performance Insight) lists the top queries by duration, CPU and reads, with history. From the app side, Application Insights shows the slow dependency calls.</li>
<li><b>Measure.</b> Run it with <code>SET STATISTICS IO, TIME ON</code> and get the <b>actual</b> plan. Logical reads are my main number.</li>
<li><b>Read the plan right to left.</b> I look for: the thickest arrows, scans on big tables, key lookups, sorts and hash spills to tempdb, warning triangles (implicit conversion, missing statistics), and a large gap between <b>estimated and actual rows</b>.</li>
<li><b>Fix the cause.</b> Rewrite a non-sargable predicate, add or widen an index, update statistics, remove <code>SELECT *</code>, replace a row-by-row loop or scalar function with a set-based query, or deal with parameter sniffing.</li>
<li><b>Prove it.</b> Same test, compare reads and duration, and check write cost if I added an index.</li></ol>
<p>I treat the "missing index" hint in the plan as a suggestion only; it ignores existing indexes and column order.</p>
<blockquote><b>Say it in the interview:</b> I find the query in Query Store, compare estimated with actual rows in the plan, fix the largest operator, and show the reads before and after.</blockquote>`,
  followUps: ['What is the difference between an estimated and an actual plan?', 'The plan looks fine but the query is still slow. What else could it be?', 'How does Query Store help after a deployment made things slower?'] });

interview.push({ q: 'What is parameter sniffing, and how do you fix it when it hurts?', level: 'A',
  a: `<p>Parameter sniffing is SQL Server building a plan for the first parameter value it sees and then reusing that plan for every later value, even ones with very different row counts.</p>
<p>Normally this is good: compiling once saves CPU. It hurts when the data is <b>skewed</b>. A plan built for a customer with 5 orders (seek + key lookup) is reused for a customer with 2 million orders, or the other way round. The typical symptom: "the same procedure is sometimes fast and sometimes slow", or "fast in SSMS, slow from the app".</p>
<p>Fixes, mildest first:</p>
<ul><li>Update statistics, and add a covering index so one plan is good for all values.</li>
<li><code>OPTION (RECOMPILE)</code> on that statement: a fresh plan each run, at a compile cost. Good for infrequent, heavy queries.</li>
<li><code>OPTION (OPTIMIZE FOR (@p = value))</code> or <code>OPTIMIZE FOR UNKNOWN</code> for an average plan.</li>
<li>Force a known good plan in <b>Query Store</b>.</li>
<li>Split the logic into separate procedures for "small" and "large" cases.</li></ul>
<p>SQL Server 2022 added parameter-sensitive plan optimization, which can cache several plans for one statement.</p>
<blockquote><b>Say it in the interview:</b> The plan was compiled for one parameter value and reused for another. I confirm it by comparing the compiled and runtime values in the plan, then fix it with an index, RECOMPILE or a forced plan.</blockquote>`,
  followUps: ['Why can a query be fast in SSMS and slow from the application?', 'What is the cost of OPTION (RECOMPILE) on a query that runs 500 times a second?', 'Does EF Core cause parameter sniffing too?'] });

interview.push({ q: 'What are statistics in SQL Server, and how do you look after indexes over time?', level: 'A',
  a: `<p>Statistics are small summaries of how values are distributed in a column, and the optimizer uses them to guess how many rows each step of a query will return.</p>
<p>Each statistics object holds a <b>histogram</b> (up to 200 steps) and density figures. SQL Server creates them for every index and, by default, automatically for columns used in filters. They refresh automatically after enough rows change, but on a very large table that can lag, and a plan built on old numbers picks the wrong join or a scan.</p>
<p>Care routine:</p>
<ul><li><b>Statistics:</b> keep auto create and auto update on; add a scheduled <code>UPDATE STATISTICS</code> for big, fast-growing tables and after bulk loads.</li>
<li><b>Fragmentation:</b> inserts into the middle of an index split pages and leave them half empty. <code>REORGANIZE</code> is light and online; <code>REBUILD</code> recreates the index and also refreshes its statistics. On SSD storage, rebuild only when page density is really poor, not on a fixed threshold.</li>
<li><b>Fill factor:</b> leave some free space in pages of indexes with random inserts.</li>
<li><b>Housekeeping:</b> drop unused and duplicate indexes found with the index usage DMVs.</li></ul>
<blockquote><b>Say it in the interview:</b> Stale statistics give bad row estimates and bad plans, so on big tables I update statistics on a schedule and rebuild indexes only when page density shows a real need.</blockquote>`,
  followUps: ['What is the ascending key problem?', 'Does rebuilding an index block users?', 'What is the difference between REORGANIZE and REBUILD?'] });

interview.push({ q: 'Should a primary key be an int identity or a GUID?', level: 'A',
  a: `<p>For a clustered primary key in SQL Server I prefer an ever-increasing integer, and I use a GUID only when I need ids created outside the database, ideally a sequential one.</p>
<table><thead><tr><th></th><th>int / bigint identity</th><th>Random GUID</th></tr></thead><tbody>
<tr><td>Size</td><td>4 or 8 bytes</td><td>16 bytes, repeated in every nonclustered index</td></tr>
<tr><td>Insert position</td><td>End of the index</td><td>Random page: page splits, fragmentation</td></tr>
<tr><td>Generated by</td><td>The database</td><td>Anyone: client, offline device, another service</td></tr>
<tr><td>Guessable in URLs</td><td>Yes</td><td>No</td></tr>
<tr><td>Merging data sets</td><td>Collisions</td><td>Easy</td></tr></tbody></table>
<p>Middle paths:</p>
<ul><li>A <b>sequential GUID</b>: <code>NEWSEQUENTIALID()</code> in SQL Server, or a version 7 GUID from <code>Guid.CreateVersion7()</code> in .NET 9 and later, which is time ordered.</li>
<li>An int clustered key for joins plus a separate GUID column with a unique index as the <b>public id</b>.</li></ul>
<p>Note that a very busy identity insert has its own issue, contention on the last page, which SQL Server can ease with <code>OPTIMIZE_FOR_SEQUENTIAL_KEY</code>.</p>
<blockquote><b>Say it in the interview:</b> Narrow and ever-increasing for the clustered key. If I need GUIDs I make them sequential or keep them as a separate public id.</blockquote>`,
  followUps: ['Why does a wide clustered key make other indexes bigger?', 'How does EF Core generate GUID keys for SQL Server?', 'What is last-page insert contention?'] });

interview.push({ q: 'How would you design the indexing for a 500 million row table that serves both the app and reports?', level: 'E',
  a: `<p>I would index for the two workloads separately: narrow row-store indexes for the app's lookups, and a columnstore or a separate copy for the reports.</p>
<ol><li><b>Collect the real workload</b> from Query Store: the top statements by frequency and by total cost, split into point lookups and aggregations.</li>
<li><b>Clustered key:</b> narrow and increasing. If most queries are by date range, cluster or partition on the date.</li>
<li><b>OLTP side:</b> a small set of composite, covering nonclustered indexes for the top lookups. Use <b>filtered indexes</b> where only a slice is hot, for example <code>WHERE Status = 'Open'</code>.</li>
<li><b>Reporting side:</b> a <b>nonclustered columnstore index</b> on the same table. It stores each column separately and compressed, and scans in batch mode, so "sum by month over 500 million rows" takes seconds. Or move reports off the primary: a readable replica, or a warehouse.</li>
<li><b>Partition by month</b> for archiving and partition-level maintenance.</li>
<li><b>Operate it:</b> build with <code>ONLINE = ON</code> and resumable builds, use data compression, review unused and overlapping indexes each quarter, and watch insert latency after every new index.</li></ol>
<p>The trade-off I state out loud: every index added for reporting taxes each order insert, so I set a budget, for example 5 to 7 indexes on the hot table.</p>
<blockquote><b>Say it in the interview:</b> Row-store covering indexes for lookups, columnstore or a replica for aggregates, partitioning for maintenance, and an index budget so writes stay fast.</blockquote>`,
  followUps: ['How does a columnstore index store data differently from a B-tree?', 'What are the downsides of a nonclustered columnstore on a busy OLTP table?', 'How would you add an index to this table without downtime?'] });

/* ================= Interview: Section C, transactions, isolation, locking ================= */
interview.push({ q: 'What is a transaction? Explain ACID.', level: 'B',
  a: `<p>A transaction is a group of statements that the database treats as one unit: either all of them take effect or none do.</p>
<table><thead><tr><th>Property</th><th>Meaning</th><th>How SQL Server delivers it</th></tr></thead><tbody>
<tr><td>Atomicity</td><td>All or nothing</td><td>Rollback using the transaction log</td></tr>
<tr><td>Consistency</td><td>Constraints hold before and after</td><td>Keys, CHECK and UNIQUE constraints, triggers</td></tr>
<tr><td>Isolation</td><td>Concurrent transactions do not corrupt each other</td><td>Locks and row versions</td></tr>
<tr><td>Durability</td><td>A commit survives a crash</td><td>Log records are written to disk before the commit returns (write-ahead logging)</td></tr></tbody></table>
<p>Example: moving 100 from account A to account B is 2 updates. Without a transaction, a crash between them loses 100.</p>
<pre><code>BEGIN TRANSACTION;
UPDATE Accounts SET Balance = Balance - 100 WHERE Id = 1;
UPDATE Accounts SET Balance = Balance + 100 WHERE Id = 2;
COMMIT;   -- or ROLLBACK on error</code></pre>
<p>A single statement is already its own transaction. In EF Core, one <code>SaveChanges</code> call is one transaction.</p>
<blockquote><b>Say it in the interview:</b> A transaction makes several changes succeed or fail together. ACID is atomic, consistent, isolated and durable, and the transaction log is what makes atomic and durable possible.</blockquote>`,
  followUps: ['What does SET XACT_ABORT ON do?', 'What is a savepoint?', 'Why should transactions be kept short?'] });

interview.push({ q: 'What isolation levels does SQL Server support, and which is the default?', level: 'I',
  a: `<p>SQL Server has 5 isolation levels, and the default is READ COMMITTED.</p>
<table><thead><tr><th>Level</th><th>Guarantee</th><th>How</th></tr></thead><tbody>
<tr><td>READ UNCOMMITTED</td><td>None: may read uncommitted data</td><td>Takes no shared locks</td></tr>
<tr><td>READ COMMITTED (default)</td><td>Reads only committed data</td><td>Shared lock held just for the read, or row versions when RCSI is on</td></tr>
<tr><td>REPEATABLE READ</td><td>Rows you read cannot change</td><td>Shared locks held to the end of the transaction</td></tr>
<tr><td>SERIALIZABLE</td><td>As if transactions ran one at a time</td><td>Key-range locks, so no new rows can appear</td></tr>
<tr><td>SNAPSHOT</td><td>A consistent view as of transaction start</td><td>Row versions; write conflicts raise an error</td></tr></tbody></table>
<p>Going up the list gives more correctness and more blocking or more conflict errors. Most applications stay on READ COMMITTED, preferably with <b>read committed snapshot</b> turned on (it is the default in Azure SQL Database), and protect the few critical operations with a conditional update, a constraint or a concurrency token instead of raising the level for everything.</p>
<blockquote><b>Say it in the interview:</b> Five levels, READ COMMITTED by default. I keep the default with snapshot reads and guard the critical writes explicitly rather than running everything as SERIALIZABLE.</blockquote>`,
  followUps: ['How do you set the isolation level from EF Core?', 'Which level would you use for a month-end report that must be consistent?', 'Why does SERIALIZABLE cause more deadlocks?'] });

interview.push({ q: 'What are dirty reads, non-repeatable reads and phantom reads?', level: 'I',
  a: `<p>They are the 3 classic ways one transaction can be confused by another that runs at the same time.</p>
<table><thead><tr><th>Problem</th><th>What happens</th><th>Lowest level that prevents it</th></tr></thead><tbody>
<tr><td>Dirty read</td><td>You read a value another transaction has changed but not committed; it then rolls back</td><td>READ COMMITTED</td></tr>
<tr><td>Non-repeatable read</td><td>You read a row twice in one transaction and its value changed in between</td><td>REPEATABLE READ</td></tr>
<tr><td>Phantom read</td><td>You run the same range query twice and extra rows appear (or vanish)</td><td>SERIALIZABLE or SNAPSHOT</td></tr></tbody></table>
<p>Two more that senior interviews ask for:</p>
<ul><li><b>Lost update:</b> two transactions read the same value, both write, and the second overwrites the first.</li>
<li><b>Write skew:</b> two transactions each read a rule as satisfied ("at least 1 doctor is on call"), each change a different row, and together they break the rule. SNAPSHOT isolation allows this; SERIALIZABLE does not.</li></ul>
<blockquote><b>Say it in the interview:</b> Dirty is reading uncommitted data, non-repeatable is a row changing under me, phantom is new rows appearing in my range. Each higher isolation level removes one of them.</blockquote>`,
  followUps: ['Give a business example where a phantom read causes a real bug.', 'How do you prevent a lost update without raising the isolation level?', 'Which of these can happen under RCSI?'] });

interview.push({ q: 'Which lock types does SQL Server use, and what is lock escalation?', level: 'I',
  a: `<p>SQL Server uses shared locks for reading, exclusive locks for writing and update locks for "read now, write soon", and lock escalation is the engine swapping thousands of small locks for one table lock.</p>
<table><thead><tr><th>Lock</th><th>Taken by</th><th>Compatible with</th></tr></thead><tbody>
<tr><td>Shared (S)</td><td>SELECT</td><td>Other S and U locks</td></tr>
<tr><td>Update (U)</td><td>The search phase of UPDATE and DELETE</td><td>S only. Only 1 U at a time, which avoids a common deadlock</td></tr>
<tr><td>Exclusive (X)</td><td>INSERT, UPDATE, DELETE</td><td>Nothing (except NOLOCK and versioned readers)</td></tr>
<tr><td>Intent (IS, IX)</td><td>Placed on the page and table above a locked row</td><td>Signals "something below is locked"</td></tr></tbody></table>
<p>Locks are taken at row (key), page or table level. Each lock costs memory, so when one statement holds about <b>5,000 locks</b> on one table the engine tries to <b>escalate</b> to a table lock. A large UPDATE can therefore block every other user of the table.</p>
<p>How to avoid that: change rows in batches of a few thousand, make sure the WHERE clause has an index so fewer rows are touched, and keep transactions short. SQL Server 2025 and Azure SQL offer <b>optimized locking</b>, which releases row locks early and largely removes the need to escalate.</p>
<blockquote><b>Say it in the interview:</b> Readers share, writers need the row alone, and a statement that locks thousands of rows can escalate to the whole table, so I batch large updates.</blockquote>`,
  followUps: ['What is the difference between blocking and a deadlock?', 'How do you see who is blocking whom right now?', 'What does the UPDLOCK hint do?'] });

interview.push({ q: 'What is a deadlock? How do you find and fix one in production?', level: 'I',
  a: `<p>A deadlock is two (or more) transactions each holding a lock the other needs, so neither can ever continue; SQL Server detects the cycle, kills one of them and returns error 1205 to it.</p>
<p>It differs from <b>blocking</b>, where one session simply waits and carries on when the other commits.</p>
<p><b>Find it:</b></p>
<ul><li>The built-in <code>system_health</code> Extended Events session stores a <b>deadlock graph</b> for each one. In Azure SQL the same data is in diagnostics and the portal.</li>
<li>The graph shows the 2 sessions, their statements, the locks held and the locks requested.</li></ul>
<p><b>Fix it:</b></p>
<ul><li>Access tables in the <b>same order</b> in every code path.</li>
<li>Keep transactions short; never call an API or wait for a user inside one.</li>
<li>Add or widen an index so statements lock fewer rows, or make it covering to remove the lookup.</li>
<li>Turn on read committed snapshot so readers stop locking.</li>
<li>For read-then-update, take a U lock on the read (<code>UPDLOCK</code>) or use one UPDATE statement.</li>
<li>Always <b>retry</b> on 1205 in the application; EF Core's <code>EnableRetryOnFailure</code> does this.</li></ul>
<blockquote><b>Say it in the interview:</b> I pull the deadlock graph from system_health, see which two statements and resources form the cycle, fix the ordering or the index, and keep a retry for error 1205 as the safety net.</blockquote>`,
  followUps: ['How does SQL Server choose the deadlock victim?', 'Can a single UPDATE and a single SELECT deadlock each other? How?', 'What is SET DEADLOCK_PRIORITY for?'] });

interview.push({ q: 'Is WITH (NOLOCK) safe? What would you use instead?', level: 'A',
  a: `<p>No. NOLOCK means READ UNCOMMITTED, so the query can return data that was never committed, and it can also miss rows or read the same row twice.</p>
<p>People add it because it stops readers being blocked by writers. The cost is wrong results that are almost impossible to reproduce:</p>
<ul><li><b>Dirty data:</b> a row from a transaction that later rolls back.</li>
<li><b>Missing or duplicate rows:</b> a page split moves rows during the scan.</li>
<li>Occasionally an error because data moved under the scan.</li></ul>
<p>The proper tool is <b>row versioning</b>:</p>
<table><thead><tr><th></th><th>READ COMMITTED SNAPSHOT (RCSI)</th><th>SNAPSHOT isolation</th></tr></thead><tbody>
<tr><td>Turned on</td><td>Per database; changes how READ COMMITTED behaves</td><td>Per database, then requested per transaction</td></tr>
<tr><td>Consistent as of</td><td>The start of each <b>statement</b></td><td>The start of the <b>transaction</b></td></tr>
<tr><td>Readers block writers</td><td>No</td><td>No</td></tr>
<tr><td>Write conflicts</td><td>Writers wait as usual</td><td>Error 3960 if the row changed since you started</td></tr></tbody></table>
<p>Both keep old row versions for a while, so watch version store size and long-running transactions. NOLOCK is acceptable only for rough monitoring counts where a wrong number does no harm.</p>
<blockquote><b>Say it in the interview:</b> NOLOCK trades correctness for speed. I turn on read committed snapshot instead, so readers see the last committed version and nobody waits.</blockquote>`,
  followUps: ['Where are row versions stored, and what can make that store grow?', 'Does RCSI remove deadlocks completely?', 'When would you pick SNAPSHOT over RCSI?'] });

interview.push({ q: 'Optimistic vs pessimistic concurrency: what is the difference and when do you use each?', level: 'A',
  a: `<p>Pessimistic concurrency locks the row before editing so nobody else can change it; optimistic concurrency takes no lock and instead checks at save time that nobody changed the row in the meantime.</p>
<table><thead><tr><th></th><th>Optimistic</th><th>Pessimistic</th></tr></thead><tbody>
<tr><td>Assumes</td><td>Conflicts are rare</td><td>Conflicts are likely</td></tr>
<tr><td>Mechanism</td><td>A version column checked in the UPDATE's WHERE</td><td>Locks: <code>UPDLOCK</code>, SERIALIZABLE, or an application lock</td></tr>
<tr><td>On conflict</td><td>The second save fails; reload and retry or ask the user</td><td>The second user waits</td></tr>
<tr><td>Suits</td><td>Web forms, APIs, long "think time"</td><td>Short, hot operations: stock, seats, balances</td></tr></tbody></table>
<p>In SQL Server the version column is a <code>rowversion</code>. In EF Core:</p>
<pre><code>[Timestamp] public byte[] RowVersion { get; set; }

try { await db.SaveChangesAsync(); }
catch (DbUpdateConcurrencyException)
{
    // 0 rows matched: someone saved first. Reload, merge or return HTTP 409 / 412.
}</code></pre>
<p>Over HTTP this pairs with an <b>ETag</b>: the client sends <code>If-Match</code> with the version it read. For a stateless web API pessimistic locks across requests are not possible, because the connection is gone between the read and the save.</p>
<blockquote><b>Say it in the interview:</b> Optimistic by default with a rowversion and a 409 on conflict. Pessimistic only inside one short transaction for hot rows such as stock.</blockquote>`,
  followUps: ['What options do you have when a DbUpdateConcurrencyException happens?', 'How would you do optimistic concurrency without a rowversion column?', 'What is sp_getapplock?'] });

interview.push({ q: 'An order must update the Orders database and tell the Inventory service. How do you keep the two consistent?', level: 'E',
  a: `<p>You cannot wrap two services in one database transaction, so I commit locally and make the message to the other service part of that same local commit: the transactional outbox pattern.</p>
<p>The naive version, "save the order, then publish an event", fails in the gap: the process can crash after the save and before the publish, and the event is lost.</p>
<ol><li>In <b>one</b> local transaction, insert the order row and an <b>Outbox</b> row that holds the event ("OrderPlaced", payload).</li>
<li>A background worker reads unsent outbox rows, publishes them to the broker (Azure Service Bus) and marks them sent.</li>
<li>The worker may publish twice after a crash, so delivery is <b>at least once</b>. The Inventory service must be <b>idempotent</b>: it records processed message ids and ignores repeats.</li>
<li>If inventory cannot reserve the stock, it publishes a failure event and the order service runs a <b>compensating action</b> (cancel, refund). The chain of local transactions plus compensations is a <b>saga</b>.</li></ol>
<p>A distributed transaction (two-phase commit) is not an option: it holds locks across services and most cloud brokers do not take part in one. The price of the outbox is <b>eventual consistency</b>: for a short time the order exists and the stock is not yet reserved, and the UI must show a "pending" state.</p>
<blockquote><b>Say it in the interview:</b> One local transaction writes the order and an outbox row, a worker publishes it at least once, the consumer is idempotent, and failures are handled by compensation rather than rollback.</blockquote>`,
  followUps: ['How does the consumer make itself idempotent?', 'Choreography or orchestration for the saga: how do you choose?', 'How would change data capture replace the polling worker?'] });

/* ================= Interview: Section D, stored procedures, EF Core, Dapper ================= */
interview.push({ q: 'Stored procedures or an ORM: which do you prefer and why?', level: 'B',
  a: `<p>I default to an ORM (EF Core) for ordinary create, read, update and delete work, and I use stored procedures or hand-written SQL for the few heavy or set-based operations.</p>
<table><thead><tr><th></th><th>Stored procedures</th><th>ORM</th></tr></thead><tbody>
<tr><td>Logic lives</td><td>In the database</td><td>In C#, with the rest of the code</td></tr>
<tr><td>Testing and review</td><td>Harder; separate tooling</td><td>Normal unit tests and pull requests</td></tr>
<tr><td>Refactoring</td><td>No compiler help</td><td>Compiler-checked LINQ</td></tr>
<tr><td>Performance control</td><td>Full: hints, temp tables, set-based code</td><td>Good; you must watch the generated SQL</td></tr>
<tr><td>Security</td><td>Grant EXECUTE only; no table access</td><td>The app account needs table permissions</td></tr>
<tr><td>Speed of delivery</td><td>Slower</td><td>Faster</td></tr></tbody></table>
<p>One myth to correct politely: procedures are not automatically faster. SQL Server also caches plans for the parameterized queries an ORM sends. The real gain of a procedure comes from doing a lot of work in one round trip, close to the data.</p>
<p>I avoid putting core business rules in procedures, because they are then split across two languages and two deployment paths.</p>
<blockquote><b>Say it in the interview:</b> ORM for the 90% that is plain CRUD, SQL or a procedure for the 10% that is heavy, and the choice for each query is made with measurements.</blockquote>`,
  followUps: ['How do you call a stored procedure from EF Core?', 'How do you version stored procedures with the application?', 'What is a stored procedure better at than LINQ?'] });

interview.push({ q: 'What is EF Core, and what does DbContext do?', level: 'B',
  a: `<p>EF Core is Microsoft's object-relational mapper for .NET: it lets you read and write database rows as C# objects, and the DbContext is the object you do that through.</p>
<p>A DbContext represents one session with the database. It has 4 jobs:</p>
<ul><li><b>Model:</b> it knows how classes map to tables, through <code>DbSet&lt;T&gt;</code> properties, conventions, attributes and the fluent API in <code>OnModelCreating</code>.</li>
<li><b>Querying:</b> it turns LINQ into SQL, runs it and builds objects from the rows.</li>
<li><b>Change tracking:</b> it remembers the entities it loaded and notices what you changed.</li>
<li><b>Saving:</b> <code>SaveChanges</code> writes all pending inserts, updates and deletes in one transaction. This makes the DbContext a <b>unit of work</b>, and each DbSet a <b>repository</b>.</li></ul>
<pre><code>public class ShopDbContext : DbContext
{
    public ShopDbContext(DbContextOptions&lt;ShopDbContext&gt; o) : base(o) { }
    public DbSet&lt;Order&gt; Orders =&gt; Set&lt;Order&gt;();
}

var order = await db.Orders.FindAsync(10);
order.Status = "Shipped";
await db.SaveChangesAsync();   // UPDATE Orders SET Status = ... WHERE Id = 10</code></pre>
<p>It talks to the database through a provider (SQL Server, PostgreSQL, SQLite, Cosmos DB). EF Core 10 is the version that ships with .NET 10.</p>
<blockquote><b>Say it in the interview:</b> DbContext is a short-lived unit of work: it maps classes to tables, translates LINQ to SQL, tracks changes and saves them in one transaction.</blockquote>`,
  followUps: ['What is the difference between Find, First and Single?', 'Do you still need your own repository layer over DbContext?', 'What is OnModelCreating used for?'] });

interview.push({ q: 'What is SQL injection, and how do you prevent it in .NET?', level: 'B',
  a: `<p>SQL injection is an attack where user input is pasted into a SQL string and the database runs it as code; you prevent it by always sending input as <b>parameters</b>.</p>
<pre><code>// Vulnerable: input becomes part of the SQL text.
var sql = "SELECT * FROM Users WHERE Name = '" + name + "'";
// name = "x' OR '1'='1"   returns every user
// name = "x'; DROP TABLE Users; --"   does worse

// Safe: the value travels separately and is never parsed as SQL.
cmd.CommandText = "SELECT * FROM Users WHERE Name = @name";
cmd.Parameters.AddWithValue("@name", name);</code></pre>
<ul><li><b>EF Core LINQ</b> is parameterized automatically.</li>
<li><b>Raw SQL in EF Core:</b> <code>FromSql</code> with an interpolated string turns each value into a parameter. <code>FromSqlRaw</code> with string concatenation does not; that is the trap.</li>
<li><b>Dapper:</b> pass an object, <code>new { name }</code>, and use <code>@name</code> in the SQL.</li>
<li><b>Dynamic SQL inside procedures:</b> use <code>sp_executesql</code> with parameters, not <code>EXEC('...' + @x)</code>.</li>
<li>Table or column names cannot be parameters: validate them against a fixed allow-list.</li></ul>
<p>Second line of defence: the app's database account has only the permissions it needs, so a hole cannot drop tables.</p>
<blockquote><b>Say it in the interview:</b> Never build SQL by joining strings with user input. Parameters keep data as data, and a least-privilege database account limits the damage.</blockquote>`,
  followUps: ['Is a stored procedure automatically safe from injection?', 'What is the difference between FromSql and FromSqlRaw?', 'How would you let users sort by a column they choose, safely?'] });

interview.push({ q: 'How does change tracking work in EF Core? What are the entity states?', level: 'I',
  a: `<p>When a tracking query returns an entity, the DbContext keeps a reference to it plus a snapshot of its original values, and at save time it compares the two to work out which SQL to send.</p>
<table><thead><tr><th>State</th><th>Meaning</th><th>On SaveChanges</th></tr></thead><tbody>
<tr><td>Detached</td><td>The context does not know this object</td><td>Nothing</td></tr>
<tr><td>Unchanged</td><td>Loaded and not modified</td><td>Nothing</td></tr>
<tr><td>Added</td><td>New, not in the database yet</td><td>INSERT</td></tr>
<tr><td>Modified</td><td>One or more properties changed</td><td>UPDATE of those columns</td></tr>
<tr><td>Deleted</td><td>Marked for removal</td><td>DELETE</td></tr></tbody></table>
<ul><li><code>DetectChanges</code> runs inside <code>SaveChanges</code> and scans every tracked entity. With tens of thousands tracked, this scan is the slow part.</li>
<li><b>Identity resolution:</b> one context returns the same object instance for the same key, however many queries load it.</li>
<li><b>Disconnected entities</b> (an object posted to a Web API) are Detached. <code>Update(entity)</code> marks every column Modified; loading the row and copying the changed values updates only what changed and respects concurrency tokens.</li></ul>
<p>You can inspect all this with <code>db.Entry(entity).State</code> and <code>db.ChangeTracker.DebugView.LongView</code>.</p>
<blockquote><b>Say it in the interview:</b> The context snapshots what it loads, compares at SaveChanges and emits only the needed inserts, updates and deletes. That convenience costs memory and CPU, so I switch it off for read-only queries.</blockquote>`,
  followUps: ['What is the difference between Update and Attach?', 'How would you implement audit columns (ModifiedAt, ModifiedBy) for every entity?', 'What does AutoDetectChangesEnabled = false do and when is it useful?'] });

interview.push({ q: 'What lifetime should a DbContext have? Is it thread safe?', level: 'I',
  a: `<p>A DbContext should be short-lived, one per unit of work, which in a web API means <b>scoped</b>: one per HTTP request. It is not thread safe.</p>
<p><code>AddDbContext</code> registers it as scoped by default. Why the other lifetimes are wrong:</p>
<ul><li><b>Singleton:</b> shared by all requests. Two threads use it at once and you get "A second operation was started on this context instance". The change tracker grows forever and returns stale entities.</li>
<li><b>Transient:</b> two services in the same request get different contexts, so they no longer share a transaction or tracked entities.</li></ul>
<p>Special cases:</p>
<ul><li><b>Background services and singletons</b> have no request scope. Inject <code>IDbContextFactory&lt;T&gt;</code> and create a context per job, or create a scope with <code>IServiceScopeFactory</code>.</li>
<li><b>Parallel queries:</b> never <code>Task.WhenAll</code> over one context. Use one context per task.</li>
<li><b>Blazor Server:</b> a circuit lives for a long time, so use the factory per operation.</li>
<li><b>High throughput:</b> <code>AddDbContextPool</code> resets and reuses instances to save allocations.</li></ul>
<p>A context is cheap to create; the costly database connection is pooled underneath by ADO.NET and is only held while a command runs.</p>
<blockquote><b>Say it in the interview:</b> Scoped, one per request, never shared across threads. For background or parallel work I create contexts from IDbContextFactory.</blockquote>`,
  followUps: ['What error do you get when two threads use the same context?', 'What must you be careful about with context pooling?', 'How do you use a DbContext inside a hosted service?'] });

interview.push({ q: 'How do EF Core migrations work, and how do you apply them in production?', level: 'I',
  a: `<p>A migration is a generated C# class that describes one step of schema change, so the database schema is versioned in source control alongside the code.</p>
<ol><li>Change the model, then run <code>dotnet ef migrations add AddOrderNotes</code>. EF compares the model with its last <b>snapshot</b> and writes <code>Up()</code> and <code>Down()</code> methods.</li>
<li><b>Read the generated code.</b> A property rename may be scaffolded as drop column + add column, which loses data; change it to <code>RenameColumn</code>.</li>
<li>Applied migrations are recorded in the <code>__EFMigrationsHistory</code> table.</li></ol>
<p>Applying in production:</p>
<table><thead><tr><th>Method</th><th>Verdict</th></tr></thead><tbody>
<tr><td><code>Database.Migrate()</code> at app startup</td><td>Fine for dev and small apps. Risky when several instances start together, and the app needs schema-change rights.</td></tr>
<tr><td><code>dotnet ef migrations script --idempotent</code></td><td>A SQL script that can be reviewed by a DBA and run by the pipeline. My usual choice.</td></tr>
<tr><td>Migration bundle (<code>dotnet ef migrations bundle</code>)</td><td>A single executable for the pipeline; no SDK or source needed on the agent.</td></tr></tbody></table>
<p>Run the migration as a deployment step <b>before</b> the new code, and keep each change backward compatible so the old version still works during the rollout.</p>
<blockquote><b>Say it in the interview:</b> Migrations version the schema in code. In production I generate an idempotent script or a bundle, review it, and run it from the pipeline before the app deploys, not from app startup.</blockquote>`,
  followUps: ['How do you roll back a migration that has already run in production?', 'Two developers add migrations on separate branches. What happens at merge?', 'How do you seed reference data?'] });

interview.push({ q: 'What is the N+1 query problem, and how do you fix it in EF Core?', level: 'I',
  a: `<p>N+1 is when code runs 1 query to get a list and then 1 more query for each item in it, so a page of 50 orders sends 51 queries instead of 1.</p>
<pre><code>// N+1: with lazy loading, each o.Customer triggers its own SELECT.
var orders = await db.Orders.Take(50).ToListAsync();
foreach (var o in orders)
    Console.WriteLine(o.Customer.Name);

// Fix 1, eager loading: one query with a JOIN.
var orders = await db.Orders.Include(o =&gt; o.Customer).Take(50).ToListAsync();

// Fix 2, projection: one query, only the columns needed. Usually the best.
var rows = await db.Orders
    .Select(o =&gt; new { o.Id, CustomerName = o.Customer.Name })
    .Take(50).ToListAsync();</code></pre>
<p>Each query is fast alone, so it hides in testing with 5 rows and hurts in production with network latency times N.</p>
<p>How to find it: log the SQL in development, or look for the same statement repeated many times within one request in Application Insights or a profiler. How to prevent it: leave lazy loading off, return DTOs from projections, and watch for a query call inside any loop, including loops hidden in mapping code or a GraphQL resolver.</p>
<blockquote><b>Say it in the interview:</b> One query for the list plus one per row. I spot it as a repeated SELECT in the logs and fix it with Include or, better, a projection that fetches everything in one statement.</blockquote>`,
  followUps: ['Can Include itself cause a performance problem?', 'How would you load related data for 50 orders in exactly 2 queries?', 'How can you make a test fail when a request sends too many queries?'] });

interview.push({ q: 'Explain eager, lazy and explicit loading. What is a split query?', level: 'I',
  a: `<p>They are the 3 ways EF Core can load related data: eager loads it with the main query, explicit loads it later when you ask, and lazy loads it silently the first time you touch the property.</p>
<table><thead><tr><th>Style</th><th>How</th><th>Queries</th><th>Watch out for</th></tr></thead><tbody>
<tr><td>Eager</td><td><code>Include</code> / <code>ThenInclude</code></td><td>1 (or 1 per collection when split)</td><td>Loading more than the screen needs</td></tr>
<tr><td>Explicit</td><td><code>db.Entry(o).Collection(x =&gt; x.Items).LoadAsync()</code></td><td>1 per call, on purpose</td><td>Extra round trips</td></tr>
<tr><td>Lazy</td><td>Proxies package + virtual navigations</td><td>1 per first access</td><td>N+1, and queries fired during JSON serialization</td></tr></tbody></table>
<p><b>Split queries.</b> One query that includes 2 collections joins them, so an order with 10 items and 10 payments returns 100 rows for one order. This is a <b>cartesian explosion</b>. <code>AsSplitQuery()</code> tells EF Core to send one SQL statement per collection instead.</p>
<p>The trade-off of splitting: several round trips, and the statements are not one snapshot, so data can change between them unless you wrap them in a transaction with snapshot isolation. With paging you also need a stable ORDER BY.</p>
<p>For read screens, a <code>Select</code> projection usually beats all three.</p>
<blockquote><b>Say it in the interview:</b> Eager when I know I need the data, explicit when it is conditional, lazy almost never. For several collections I use a split query or a projection to avoid a cartesian explosion.</blockquote>`,
  followUps: ['Why is lazy loading dangerous in a Web API that returns entities?', 'What is a filtered Include?', 'When is a single query better than a split query?'] });

interview.push({ q: 'What is the difference between IQueryable and IEnumerable in EF Core?', level: 'I',
  a: `<p><code>IQueryable</code> describes a query that will be translated to SQL and run in the database; <code>IEnumerable</code> runs LINQ in memory over objects that have already been fetched.</p>
<pre><code>IQueryable&lt;Order&gt; q = db.Orders.Where(o =&gt; o.Total &gt; 100);   // nothing has run yet
q = q.OrderBy(o =&gt; o.Id).Take(10);                           // still building the SQL
var list = await q.ToListAsync();                            // SQL runs here: WHERE, ORDER BY, TOP 10

IEnumerable&lt;Order&gt; e = db.Orders.AsEnumerable();             // from here on, LINQ to Objects
var slow = e.Where(o =&gt; o.Total &gt; 100).Take(10).ToList();    // reads rows from the whole table, filters in C#</code></pre>
<ul><li><b>Deferred execution:</b> an IQueryable runs when you enumerate it: <code>ToList</code>, <code>First</code>, <code>Count</code>, <code>foreach</code>. Enumerate it twice and it runs twice.</li>
<li><b>Expression trees:</b> IQueryable operators take <code>Expression&lt;Func&lt;T,bool&gt;&gt;</code>, which EF Core can inspect and translate. IEnumerable takes a compiled <code>Func</code>, which it cannot.</li>
<li><b>Translation failures:</b> if you call your own C# method inside a Where, EF Core throws instead of silently loading the table.</li></ul>
<p>Design point: a repository that returns <code>IEnumerable</code> or a <code>List</code> ends the SQL there; anything the caller adds runs in memory. One that returns <code>IQueryable</code> lets callers compose but leaks query logic outside.</p>
<blockquote><b>Say it in the interview:</b> IQueryable builds SQL and runs in the database when enumerated. IEnumerable works in memory. Filter, sort and page while it is still IQueryable.</blockquote>`,
  followUps: ['When does an IQueryable actually execute?', 'What happens if you call ToList() before Where()?', 'Should a repository return IQueryable? Argue both sides.'] });

interview.push({ q: 'What does AsNoTracking do, and why are projections often better still?', level: 'I',
  a: `<p><code>AsNoTracking()</code> tells EF Core to return entities without registering them in the change tracker, which makes read-only queries faster and lighter.</p>
<p>A tracking query stores a snapshot of every entity and fixes up relationships. If you are only going to serialize the result to JSON, all of that is wasted.</p>
<table><thead><tr><th>Query style</th><th>Tracked</th><th>Columns fetched</th><th>Use for</th></tr></thead><tbody>
<tr><td>Default</td><td>Yes</td><td>All</td><td>Load, change, save</td></tr>
<tr><td><code>AsNoTracking()</code></td><td>No</td><td>All</td><td>Read-only, whole entity needed</td></tr>
<tr><td><code>Select(o =&gt; new Dto(...))</code></td><td>No (not an entity)</td><td>Only those named</td><td>Lists, API responses, reports</td></tr></tbody></table>
<p>A projection wins twice: nothing is tracked <b>and</b> less data crosses the network, which also lets a covering index satisfy the query.</p>
<p>Details worth knowing:</p>
<ul><li>You cannot just modify a no-tracking entity and call SaveChanges; you must attach it first.</li>
<li>With no tracking there is no identity resolution, so the same customer joined to 20 orders becomes 20 objects. <code>AsNoTrackingWithIdentityResolution()</code> fixes that.</li>
<li>You can make no-tracking the default for a read-only context with <code>UseQueryTrackingBehavior</code>.</li></ul>
<blockquote><b>Say it in the interview:</b> Tracking is for entities I will change. For reads I use AsNoTracking, and where possible a Select into a DTO so I fetch fewer columns as well.</blockquote>`,
  followUps: ['How do you update an entity that was loaded with AsNoTracking?', 'What is identity resolution?', 'How would you set no-tracking as the default for a context?'] });

interview.push({ q: 'Rapid fire: EF Core', level: 'I',
  a: `<p>Quick questions that test whether you have used EF Core for real.</p>
<table><thead><tr><th>Question</th><th>Short answer</th></tr></thead><tbody>
<tr><td>Code first vs database first?</td><td>Code first: classes and migrations define the schema. Database first: scaffold classes from an existing database with <code>dotnet ef dbcontext scaffold</code>.</td></tr>
<tr><td>Find vs FirstOrDefault?</td><td>Find looks up by primary key and checks the change tracker first, so it may not hit the database.</td></tr>
<tr><td>First vs Single?</td><td>First takes the first match. Single throws if there is more than one.</td></tr>
<tr><td>What is a global query filter?</td><td>A WHERE added to every query for an entity, used for soft delete and multi-tenancy. <code>IgnoreQueryFilters()</code> skips it.</td></tr>
<tr><td>What is a shadow property?</td><td>A column in the model with no property on the class, for example a foreign key or audit column.</td></tr>
<tr><td>What is an owned or complex type?</td><td>A value object such as Address that has no identity of its own and is stored with its owner.</td></tr>
<tr><td>How do you see the generated SQL?</td><td><code>ToQueryString()</code>, or log with <code>LogTo</code> / the EF Core logging category.</td></tr>
<tr><td>How do you handle transient failures?</td><td><code>EnableRetryOnFailure()</code> on the provider adds a retrying execution strategy.</td></tr></tbody></table>
<blockquote><b>Say it in the interview:</b> One line each. If I have a short war story for one of them, for example a soft-delete filter that hid rows from a report, I add it.</blockquote>`,
  followUps: ['What is a value converter?', 'How do you map a many-to-many relationship without a join entity class?', 'What is a compiled query?'] });

interview.push({ q: 'How do you update or delete thousands of rows efficiently with EF Core?', level: 'A',
  a: `<p>Use the set-based methods <code>ExecuteUpdateAsync</code> and <code>ExecuteDeleteAsync</code> (EF Core 7 and later), which send a single UPDATE or DELETE statement instead of loading each entity.</p>
<pre><code>// Slow: 50,000 entities loaded, tracked and saved as 50,000 UPDATE commands.
var old = await db.Orders.Where(o =&gt; o.PlacedOn &lt; cutoff).ToListAsync();
foreach (var o in old) o.Status = "Archived";
await db.SaveChangesAsync();

// Fast: one statement, nothing loaded.
await db.Orders.Where(o =&gt; o.PlacedOn &lt; cutoff)
    .ExecuteUpdateAsync(s =&gt; s.SetProperty(o =&gt; o.Status, "Archived"));

await db.AuditLogs.Where(a =&gt; a.LoggedAt &lt; cutoff).ExecuteDeleteAsync();</code></pre>
<p>What to know about them:</p>
<ul><li>They run <b>immediately</b>, not at SaveChanges, and they are not part of its transaction unless you open one yourself.</li>
<li>They <b>bypass the change tracker</b>: entities already in memory are not refreshed, and SaveChanges interceptors or audit logic do not fire.</li>
<li>A very large statement can escalate to a table lock and fill the log, so loop in <b>batches</b> of a few thousand rows.</li></ul>
<p>For bulk <b>inserts</b>, EF Core already batches commands in SaveChanges, which is fine up to tens of thousands of rows. Beyond that use <code>SqlBulkCopy</code> or a table-valued parameter.</p>
<blockquote><b>Say it in the interview:</b> For set-based changes I use ExecuteUpdate or ExecuteDelete in batches, knowing they skip the change tracker. For large inserts I use SqlBulkCopy.</blockquote>`,
  followUps: ['Why batch a large delete instead of running it in one statement?', 'How do audit columns get set when you use ExecuteUpdate?', 'What is a table-valued parameter?'] });

interview.push({ q: 'An EF Core endpoint is slow. How do you diagnose and speed it up?', level: 'A',
  a: `<p>I first find out whether the time goes into too many queries, one bad query, or too much data in memory, and then fix that specific thing.</p>
<ol><li><b>Count and time the SQL.</b> Application Insights or OpenTelemetry shows the dependency calls for one request. In development, log EF Core commands.</li>
<li><b>Many small queries</b> means N+1: fix with a projection or Include.</li>
<li><b>One slow query:</b> copy the SQL (<code>ToQueryString()</code>), run it with the actual plan, and apply normal tuning: missing index, non-sargable filter, implicit conversion from an NVARCHAR parameter against a VARCHAR column.</li>
<li><b>Too much data:</b> page in SQL with <code>Skip/Take</code> or keyset paging, select only needed columns, add <code>AsNoTracking</code>.</li>
<li><b>Client-side work:</b> look for <code>ToList()</code> or <code>AsEnumerable()</code> placed before a filter, and big Includes that create a cartesian explosion.</li>
<li><b>Blocking calls:</b> use the async methods all the way; <code>.Result</code> ties up threads and starves the pool.</li></ol>
<p>Finishing touches for a hot path: compiled queries, context pooling, a cache in front, or replacing that one query with Dapper or a stored procedure. Then I add a test or an alert on query count and duration so it does not regress.</p>
<blockquote><b>Say it in the interview:</b> I look at how many SQL statements the request sends and how long each takes. It is nearly always N+1, a missing index, or fetching too many rows and columns.</blockquote>`,
  followUps: ['What is keyset pagination and why is it faster than OFFSET for deep pages?', 'When is a compiled query worth it?', 'How would you stop this regressing after you fix it?'] });

interview.push({ q: 'When would you choose Dapper over EF Core?', level: 'A',
  a: `<p>I choose Dapper when I want to write the SQL myself and need speed and control more than change tracking and migrations: reports, hot read paths and complex queries.</p>
<p>Dapper is a small library of extension methods on <code>IDbConnection</code>. You give it SQL and parameters; it runs the command and maps columns to properties by name. It does not track, generate SQL or manage schema.</p>
<table><thead><tr><th>Need</th><th>Better fit</th></tr></thead><tbody>
<tr><td>CRUD with business rules, relationships, migrations</td><td>EF Core</td></tr>
<tr><td>A report with 6 joins, window functions or hints</td><td>Dapper</td></tr>
<tr><td>Calling existing stored procedures, multiple result sets</td><td>Dapper (<code>QueryMultiple</code>)</td></tr>
<tr><td>Very high-volume reads where every millisecond counts</td><td>Dapper</td></tr>
<tr><td>LINQ composition, compile-time checking of queries</td><td>EF Core</td></tr></tbody></table>
<p>The gap is smaller than it used to be: a no-tracking EF Core projection is close to Dapper, and EF Core has <code>SqlQuery&lt;T&gt;</code> for raw SQL mapped to any type. The costs of Dapper are SQL in strings (typos found at run time), manual mapping of object graphs and no migrations.</p>
<p>They combine well: both can use the same connection and transaction, so a common design is EF Core for commands (writes) and Dapper for queries (reads), a light form of CQRS.</p>
<blockquote><b>Say it in the interview:</b> EF Core for writes and ordinary reads, Dapper where hand-written SQL clearly wins. They share a connection, so it is not either-or.</blockquote>`,
  followUps: ['How do you run Dapper and EF Core in the same transaction?', 'How does Dapper map a one-to-many result?', 'How do you keep raw SQL strings maintainable and tested?'] });

interview.push({ q: 'How do you make a breaking schema change, such as renaming a column on a large table, with zero downtime?', level: 'E',
  a: `<p>I never change the schema and the code in one step; I use the <b>expand and contract</b> pattern, where every single step is compatible with the version of the app running at that moment.</p>
<p>Example: rename <code>Customers.Phone</code> to <code>MobileNumber</code> on a table with 300 million rows, while old and new app instances overlap during a rolling deploy.</p>
<ol><li><b>Expand:</b> add <code>MobileNumber</code> as a nullable column. This is a quick metadata change. The old code ignores it.</li>
<li><b>Dual write:</b> deploy code that writes both columns and still reads the old one.</li>
<li><b>Backfill:</b> copy old values in small batches (a few thousand rows, short transactions, a pause between batches) so there is no lock escalation, log growth or replica lag.</li>
<li><b>Switch reads:</b> deploy code that reads the new column, ideally behind a feature flag, and verify the two columns match.</li>
<li><b>Stop writing</b> the old column.</li>
<li><b>Contract:</b> one release later, drop <code>Phone</code>.</li></ol>
<p>Rules I follow: a release can always be rolled back one step; no long blocking operations (build indexes with <code>ONLINE = ON</code>, add NOT NULL only after the backfill); migrations run from the pipeline before the code; and destructive steps are never in the same release as the code that stops using the column.</p>
<blockquote><b>Say it in the interview:</b> Expand, dual write, backfill in batches, switch reads, then contract a release later. Each step works with both the old and the new code, so I can stop or roll back at any point.</blockquote>`,
  followUps: ['Why is adding a NOT NULL column with a default sometimes instant and sometimes not?', 'How do you write this as EF Core migrations?', 'How do you verify the backfill is complete and correct?'] });

/* ================= Interview: Section E, Cosmos DB and NoSQL ================= */
interview.push({ q: 'SQL vs NoSQL: what is the difference and how do you choose?', level: 'B',
  a: `<p>A SQL (relational) database stores data in tables with a fixed schema and joins them; a NoSQL database stores data in other shapes, such as documents or key-value pairs, and is built to spread across many servers.</p>
<table><thead><tr><th></th><th>Relational (SQL Server)</th><th>NoSQL (Cosmos DB, MongoDB, Redis)</th></tr></thead><tbody>
<tr><td>Schema</td><td>Fixed, enforced by the database</td><td>Flexible, enforced by the application</td></tr>
<tr><td>Relationships</td><td>Joins and foreign keys</td><td>Embedded data or application-side lookups</td></tr>
<tr><td>Transactions</td><td>ACID across any tables</td><td>Usually limited to one item or one partition</td></tr>
<tr><td>Scaling</td><td>Mostly up; out with effort</td><td>Out by design (partitioning)</td></tr>
<tr><td>Queries</td><td>Any ad hoc query</td><td>Fast for planned access patterns, costly otherwise</td></tr></tbody></table>
<p>I choose relational when the data is highly related, needs strong consistency and will be queried in ways nobody has planned yet: orders, payments, payroll. I choose NoSQL when the access patterns are known and simple, the volume or geographic spread is very large, or the shape varies: product catalogues, user profiles, telemetry, sessions.</p>
<p>It is rarely one or the other. Using each store for what it is good at is called <b>polyglot persistence</b>.</p>
<blockquote><b>Say it in the interview:</b> Relational when I need joins, transactions and flexible queries. NoSQL when I know the access patterns and need scale or a flexible shape. I pick per workload, not per company.</blockquote>`,
  followUps: ['What does "schema-less" really mean for the application code?', 'What are the CAP theorem trade-offs?', 'Name a workload where you would use both in one system.'] });

interview.push({ q: 'What is Azure Cosmos DB? Explain containers, items and request units.', level: 'B',
  a: `<p>Azure Cosmos DB is Microsoft's fully managed NoSQL database that stores JSON documents, spreads them across partitions and regions automatically, and charges you in request units.</p>
<ul><li><b>Account &gt; database &gt; container &gt; item.</b> A container is roughly a table; an <b>item</b> is one JSON document (up to 2 MB) with an <code>id</code>.</li>
<li><b>Partition key:</b> a property chosen when the container is created. Items with the same value are stored together in one logical partition.</li>
<li><b>Request unit (RU):</b> one number that bundles CPU, memory and IO. Reading a 1 KB item by id and partition key costs 1 RU; writing it costs about 5 RU; queries cost more, depending on how much data they touch.</li>
<li><b>Throughput:</b> you buy RUs per second, as provisioned (fixed), autoscale, or serverless (pay per request). Spend more than you have in a second and you get HTTP <b>429</b>.</li></ul>
<p>Other things it is known for: several APIs (NoSQL, MongoDB, Cassandra, Gremlin, Table), replication to any Azure region with a setting, 5 consistency levels, automatic indexing of every property, and single-digit millisecond point reads.</p>
<blockquote><b>Say it in the interview:</b> Cosmos DB is a managed, partitioned document database. You pick a partition key, pay in request units, and the cheapest operation is a point read by id and partition key at 1 RU.</blockquote>`,
  followUps: ['Provisioned, autoscale or serverless: how do you choose?', 'What is the difference between a logical and a physical partition?', 'How do you find out what a query costs in RUs?'] });

interview.push({ q: 'How do you choose a partition key in Cosmos DB?', level: 'I',
  a: `<p>I pick a property that has many distinct values, spreads both storage and traffic evenly, and appears in the filter of my most frequent queries.</p>
<p>The partition key decides where each item lives, and it cannot be changed in place later, so I test candidates against 4 checks:</p>
<table><thead><tr><th>Check</th><th>Why</th></tr></thead><tbody>
<tr><td>High cardinality</td><td>Few values means few, huge partitions</td></tr>
<tr><td>Even request spread</td><td>Throughput is divided between physical partitions; one busy key value is throttled while the rest is idle (a <b>hot partition</b>)</td></tr>
<tr><td>Under 20 GB per value</td><td>That is the logical partition size limit</td></tr>
<tr><td>Present in common queries</td><td>Then the query goes to one partition instead of fanning out to all</td></tr></tbody></table>
<p>Examples: <code>/customerId</code> for orders, <code>/deviceId</code> for telemetry, <code>/id</code> for a pure key-value lookup. Poor choices: <code>/status</code>, <code>/country</code>, or a date (all of today's writes hit one partition).</p>
<p>When no single property fits: a <b>synthetic key</b> (combine two values, such as device id + month) or a <b>hierarchical partition key</b> of up to 3 levels, such as tenant then user.</p>
<blockquote><b>Say it in the interview:</b> Many values, even traffic, under 20 GB each, and present in my main query. I write down the access patterns first and test each candidate key against them.</blockquote>`,
  followUps: ['What can you do if you chose the wrong partition key?', 'What is a cross-partition query and why is it more expensive?', 'When is the item id itself a good partition key?'] });

interview.push({ q: 'How do you model one-to-many data in a document database: embed or reference?', level: 'I',
  a: `<p>I embed the child data inside the parent document when it is read together with the parent and stays small, and I reference it by id when it is large, unbounded, shared or changes on its own.</p>
<table><thead><tr><th>Embed when</th><th>Reference when</th></tr></thead><tbody>
<tr><td>Read together almost always</td><td>Read separately</td></tr>
<tr><td>"One to few": a bounded list</td><td>"One to many, without limit"</td></tr>
<tr><td>Child changes with the parent</td><td>Child is updated often by itself</td></tr>
<tr><td>Child belongs to one parent</td><td>Child is shared by many parents</td></tr></tbody></table>
<p>Examples:</p>
<ul><li>Order + line items + shipping address: <b>embed</b>. One point read returns the lot, and one write is atomic.</li>
<li>Product + reviews: <b>reference</b>. Reviews keep growing and would hit the 2 MB item limit; each review is its own item with a <code>productId</code>.</li>
<li><b>Hybrid:</b> the product document keeps a small summary (average rating, review count, the 3 newest reviews) and the rest are separate.</li></ul>
<p>There are no joins across items, so a reference means a second read. To avoid that I often copy a few stable fields (a name, a thumbnail URL) into the parent, and keep them fresh with the change feed.</p>
<blockquote><b>Say it in the interview:</b> Embed what is read together and bounded, reference what is unbounded or shared, and denormalize a few fields to save a second read.</blockquote>`,
  followUps: ['How do you model many-to-many in a document store?', 'What goes wrong with an unbounded array inside a document?', 'How do you keep a copied field up to date?'] });

interview.push({ q: 'Which consistency levels does Cosmos DB offer, and which would you choose?', level: 'A',
  a: `<p>Cosmos DB offers 5 levels, from strongest to weakest: strong, bounded staleness, session, consistent prefix and eventual. The default, and my usual choice, is <b>session</b>.</p>
<table><thead><tr><th>Level</th><th>Guarantee</th><th>Trade-off</th></tr></thead><tbody>
<tr><td>Strong</td><td>Every read sees the latest committed write</td><td>Higher write latency across regions; not available with multi-region writes; reads cost about double</td></tr>
<tr><td>Bounded staleness</td><td>Reads lag by at most K versions or T time</td><td>Reads cost about double</td></tr>
<tr><td>Session</td><td>Within one session you read your own writes, in order</td><td>Other sessions may be slightly behind</td></tr>
<tr><td>Consistent prefix</td><td>You never see writes out of order</td><td>May be behind</td></tr>
<tr><td>Eventual</td><td>Replicas converge in the end</td><td>Reads can go "back in time" briefly</td></tr></tbody></table>
<p>How I choose: session for user-facing apps, because the person who saved sees the result (the SDK carries a <b>session token</b>). Strong for a single-region system where a stale read is a real business error. Eventual for counters, likes and telemetry where a second of staleness is harmless.</p>
<p>The level is set on the account and can be <b>relaxed per request</b>, never made stronger than the account default.</p>
<blockquote><b>Say it in the interview:</b> Five levels on a line from strong to eventual. Session is the default and fits most apps, because users read their own writes at low cost.</blockquote>`,
  followUps: ['How does a second API instance read the first one\'s writes under session consistency?', 'How does this relate to the CAP theorem and PACELC?', 'What changes when you enable multi-region writes?'] });

interview.push({ q: 'Your Cosmos DB container returns 429 errors and the bill is climbing. How do you investigate?', level: 'A',
  a: `<p>A 429 means requests used more request units in a second than were available, so I find out <b>which</b> operations and <b>which</b> partition are spending them before I buy more.</p>
<ol><li><b>Is it a hot partition?</b> Azure Monitor shows normalized RU consumption per physical partition. One partition at 100% while others sit at 10% means a skewed partition key, and adding throughput is mostly wasted because it is divided evenly.</li>
<li><b>Which operations cost the most?</b> Log <code>RequestCharge</code> from the SDK, or query the diagnostic logs for the top statements by RU.</li>
<li><b>Fix the expensive ones:</b>
<ul><li>Cross-partition queries: add the partition key to the filter, or change the model.</li>
<li>A query by id that should be a <b>point read</b> (<code>ReadItemAsync</code>).</li>
<li><code>SELECT *</code> on large documents, missing composite index for ORDER BY, unbounded result sets without paging.</li>
<li>Write cost: trim the indexing policy to exclude properties never filtered on; shrink large documents.</li></ul></li>
<li><b>Fix the client:</b> one singleton <code>CosmosClient</code>, direct mode, same region as the app, and let the SDK's built-in retry handle brief 429s.</li>
<li><b>Then size capacity:</b> autoscale for spiky load, and bulk mode for batch imports so they do not starve interactive traffic.</li></ol>
<blockquote><b>Say it in the interview:</b> I check RU use per partition and per operation first. A 429 is usually a hot partition or a few expensive cross-partition queries, and the cure is the data model, not more throughput.</blockquote>`,
  followUps: ['How does the SDK behave when it receives a 429?', 'How would you repartition a container with a bad key?', 'What does the indexing policy have to do with write cost?'] });

interview.push({ q: 'SQL Server is your system of record but you want fast, denormalized reads from Cosmos DB. How do you design and keep them in sync?', level: 'E',
  a: `<p>I keep SQL Server as the single place where writes are validated, publish every change as an event, and build the Cosmos DB documents from those events as a <b>read model</b> that is allowed to be slightly behind.</p>
<ol><li><b>Capture changes reliably.</b> Either a transactional <b>outbox</b> table written in the same transaction as the business data, or SQL Server <b>change data capture / change tracking</b>. Never "write SQL, then write Cosmos" in the request: the second write can fail and the two drift apart.</li>
<li><b>Transport:</b> a worker publishes outbox rows to Service Bus or Event Hubs.</li>
<li><b>Projector:</b> an Azure Function consumes each event and <b>upserts</b> a document shaped for the screen, for example one order document with customer name and line items, partitioned by <code>/customerId</code>.</li>
<li><b>Make it safe:</b> upserts are idempotent; each document stores the source row version so an older event arriving late cannot overwrite a newer one; failures go to a dead-letter queue.</li>
<li><b>Make it rebuildable:</b> a job can replay all rows from SQL to recreate the container after a model change.</li>
<li><b>Be honest about staleness:</b> measure the lag, alert on it, and route "read my own write" screens to SQL for a few seconds or show a pending state.</li></ol>
<p>I would only do this after indexes, caching and a read replica were not enough.</p>
<blockquote><b>Say it in the interview:</b> One source of truth, changes captured with an outbox or CDC, an idempotent projector that upserts read-shaped documents, and a way to rebuild the whole read model from scratch.</blockquote>`,
  followUps: ['How do you handle events that arrive out of order?', 'Where does the Cosmos DB change feed fit if Cosmos were the source instead?', 'How do you test that the two stores have not drifted?'] });

/* ================= Interview: Section F, caching with Redis ================= */
interview.push({ q: 'What is caching, and how does the cache-aside pattern work?', level: 'B',
  a: `<p>Caching means keeping a copy of data that is slow or costly to get in a fast place, usually memory, so later requests are served without doing the slow work again.</p>
<p><b>Cache-aside</b> (also called lazy loading) is the most common pattern. The application manages the cache itself:</p>
<ol><li>Ask the cache for the key, for example <code>product:7</code>.</li>
<li><b>Hit:</b> return the value.</li>
<li><b>Miss:</b> read the database, put the result in the cache with an expiry time (<b>TTL</b>, time to live), and return it.</li>
<li>When the data changes: update the database, then <b>remove</b> the key so the next read reloads it.</li></ol>
<pre><code>var json = await cache.GetStringAsync("product:7");
if (json is null)
{
    var product = await db.Products.FindAsync(7);
    json = JsonSerializer.Serialize(product);
    await cache.SetStringAsync("product:7", json, new DistributedCacheEntryOptions
        { AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(5) });
}</code></pre>
<p><b>Redis</b> is the usual shared cache: an in-memory key-value store that all instances of the API talk to, with sub-millisecond reads. Good candidates to cache are read often and change rarely. The data may be a little stale, so always decide how stale is acceptable.</p>
<blockquote><b>Say it in the interview:</b> Check the cache, on a miss load from the database and store it with a TTL, and delete the key when the data changes. Only data that is loaded on demand gets cached.</blockquote>`,
  followUps: ['What are read-through and write-through caching?', 'What should you not cache?', 'What happens to your app if Redis is down?'] });

interview.push({ q: 'IMemoryCache, IDistributedCache and HybridCache: what is the difference and which do you use?', level: 'I',
  a: `<p><code>IMemoryCache</code> stores objects inside one process, <code>IDistributedCache</code> stores bytes in a shared store such as Redis, and <code>HybridCache</code> combines both behind one API.</p>
<table><thead><tr><th></th><th>IMemoryCache</th><th>IDistributedCache</th><th>HybridCache</th></tr></thead><tbody>
<tr><td>Where</td><td>App memory</td><td>Redis, SQL Server, and so on</td><td>Memory first (L1), then Redis (L2)</td></tr>
<tr><td>Shared across instances</td><td>No</td><td>Yes</td><td>Yes, through L2</td></tr>
<tr><td>Survives a restart</td><td>No</td><td>Yes</td><td>L2 does</td></tr>
<tr><td>Serialization</td><td>None: stores the object</td><td>You do it (bytes or strings)</td><td>Built in</td></tr>
<tr><td>Stampede protection</td><td>No</td><td>No</td><td>Yes: one factory call per key</td></tr></tbody></table>
<p>The problem with <code>IMemoryCache</code> on 4 instances: each has its own copy, so a user can see a new price on one request and the old one on the next, and removing a key only clears one instance.</p>
<p>My choice today: <b>HybridCache</b> (generally available since .NET 9) with Redis as the second level. It gives local speed, shared consistency, tag-based removal and protection against many callers loading the same key. For a single-instance tool, plain <code>IMemoryCache</code> with a size limit is enough.</p>
<blockquote><b>Say it in the interview:</b> In-memory is fastest but per instance, distributed is shared but needs a network hop and serialization, and HybridCache gives me both plus stampede protection, so that is my default.</blockquote>`,
  followUps: ['Why must you set a size limit on IMemoryCache?', 'How do local L1 copies on other instances get invalidated?', 'What is output caching and how does it differ from data caching?'] });

interview.push({ q: 'How do you keep a cache correct? Talk about invalidation and TTLs.', level: 'I',
  a: `<p>I combine two things: remove the entry when the data changes, and give every entry an expiry time so that a missed removal heals itself.</p>
<ul><li><b>Delete on write.</b> Update the database first, then delete the key. Deleting is safer than writing the new value into the cache, because two concurrent updates cannot leave the older value behind.</li>
<li><b>TTL as the safety net.</b> Choose it from the business question "how stale may this be?". Reference data: hours. Product details: minutes. Stock at checkout: do not cache.</li>
<li><b>Absolute vs sliding expiry.</b> Absolute removes the entry after a fixed time. Sliding extends it on each read, so always pair it with an absolute limit or hot data never refreshes.</li>
<li><b>Key design.</b> Include everything that changes the answer: <code>tenant:12:product:7:v2</code>. Leaving out the tenant or user is how one customer sees another's data.</li>
<li><b>Groups of keys.</b> A product change also affects list pages. Use tags, a version number in the key prefix, or short TTLs for lists.</li>
<li><b>Changes made elsewhere.</b> If another service or a nightly job updates the table, invalidate from an event, not only from your own code path.</li></ul>
<p>There is still a small race: a reader loads the old row, a writer updates and deletes the key, then the reader stores the old value. The TTL bounds how long that can last.</p>
<blockquote><b>Say it in the interview:</b> Database first, then delete the key, and a TTL on everything as the backstop. I choose each TTL from how stale the business can accept.</blockquote>`,
  followUps: ['Why delete the key rather than update it?', 'What is the difference between absolute and sliding expiration?', 'How would you invalidate all cached pages that contain one product?'] });

interview.push({ q: 'What is a cache stampede, and how do you prevent it?', level: 'A',
  a: `<p>A cache stampede is when a popular entry expires and many requests miss at the same moment, so they all run the same expensive query together and overload the database.</p>
<p>Related problems share the cure, so I name all three:</p>
<table><thead><tr><th>Problem</th><th>Cause</th><th>Fix</th></tr></thead><tbody>
<tr><td>Stampede (thundering herd)</td><td>One hot key expires</td><td>Let 1 caller load, the rest wait (<b>single flight</b>); serve stale while refreshing; refresh ahead of expiry</td></tr>
<tr><td>Avalanche</td><td>Many keys expire together, or the cache restarts empty</td><td>Add random <b>jitter</b> to TTLs; warm the cache on deploy; limit load on the database</td></tr>
<tr><td>Penetration</td><td>Repeated requests for keys that do not exist, so every one misses</td><td>Cache the "not found" result for a short time; validate ids early</td></tr></tbody></table>
<p>In .NET, <code>HybridCache.GetOrCreateAsync</code> already makes concurrent callers for the same key share one factory call within a process. Across many instances I add a short Redis lock per key (<code>SET key value NX PX 10000</code>), or accept one load per instance.</p>
<p>I also protect the database itself with a timeout and a concurrency limit on the expensive query, so a cold cache slows the site instead of taking it down.</p>
<blockquote><b>Say it in the interview:</b> When a hot key expires, only one request should rebuild it. I use single flight, jittered TTLs and stale-while-revalidate, and HybridCache gives me the first one for free.</blockquote>`,
  followUps: ['How would you implement single flight by hand in C#?', 'What are the risks of a distributed lock in Redis?', 'How do you warm a cache safely after a deployment?'] });

/* ================= Interview: Section G, scaling the database ================= */
interview.push({ q: 'How do you scale a database? Explain vertical scaling, horizontal scaling and read replicas.', level: 'B',
  a: `<p>Vertical scaling means giving one server more CPU, memory and faster disks; horizontal scaling means adding more servers and spreading the work; a read replica is the simplest horizontal step, a copy of the database that answers read queries.</p>
<table><thead><tr><th></th><th>Scale up (vertical)</th><th>Read replicas</th><th>Sharding</th></tr></thead><tbody>
<tr><td>Change to the app</td><td>None</td><td>Send reads to a second connection</td><td>Large</td></tr>
<tr><td>Helps reads</td><td>Yes</td><td>Yes</td><td>Yes</td></tr>
<tr><td>Helps writes</td><td>Yes, up to a ceiling</td><td>No</td><td>Yes</td></tr>
<tr><td>Main downside</td><td>Cost and a hard limit</td><td>Replicas lag slightly behind</td><td>Complexity</td></tr></tbody></table>
<p>How replicas work: every write goes to the <b>primary</b>. The primary ships its changes to one or more <b>secondaries</b>. Because that is usually asynchronous, a replica can be a few milliseconds to seconds behind, which is called <b>replication lag</b>. A user who saves and immediately reloads from a replica may not see the change, so "read your own writes" must go to the primary.</p>
<p>The order I work in: tune queries and indexes, add caching, scale up, add read replicas, and only then consider partitioning or sharding. Most systems never need the last step.</p>
<blockquote><b>Say it in the interview:</b> First make the queries cheap, then scale up, then offload reads to replicas. Replicas are slightly stale, so anything a user just wrote is read from the primary.</blockquote>`,
  followUps: ['What is the difference between synchronous and asynchronous replication?', 'How do you direct a query to a readable secondary in Azure SQL?', 'What is the difference between high availability and scaling?'] });

interview.push({ q: 'What is connection pooling, and what causes connection pool exhaustion?', level: 'I',
  a: `<p>Connection pooling keeps a set of open database connections ready for reuse, because opening a new one (network handshake, TLS, login) is slow; pool exhaustion is when all of them are in use and new requests time out waiting.</p>
<p>How it works in .NET: ADO.NET keeps one pool per distinct connection string, by default up to 100 connections. <code>Open()</code> borrows a connection and <code>Dispose()</code> or <code>Close()</code> returns it to the pool rather than closing it. EF Core opens a connection just for each command and returns it straight after.</p>
<p>The classic error is: <i>"Timeout expired. The timeout period elapsed prior to obtaining a connection from the pool."</i> Causes, most common first:</p>
<ul><li><b>Leaked connections:</b> a connection, reader or transaction that is never disposed. Use <code>using</code> / <code>await using</code>.</li>
<li><b>Sync over async:</b> <code>.Result</code> or <code>.Wait()</code> blocks threads; requests pile up, each holding a connection.</li>
<li><b>Slow queries or blocking</b> in the database, so each connection is held for seconds.</li>
<li><b>Long transactions</b> that wrap an HTTP call or a file upload.</li>
<li><b>Too many pools:</b> a slightly different connection string per tenant creates a pool each.</li></ul>
<p>Raising <code>Max Pool Size</code> only hides it and can push the problem onto the database server, which has its own connection limit.</p>
<blockquote><b>Say it in the interview:</b> The pool reuses open connections. Exhaustion nearly always means connections are held too long or never returned, so I look for missing disposal, blocking calls and slow queries before I touch the pool size.</blockquote>`,
  followUps: ['Why is one pool created per connection string?', 'How does pooling work with serverless functions that scale out to hundreds of instances?', 'What does MultipleActiveResultSets do?'] });

interview.push({ q: 'What is the difference between partitioning and sharding?', level: 'A',
  a: `<p>Partitioning splits one large table into pieces inside the same database server, while sharding splits the data across separate database servers.</p>
<table><thead><tr><th></th><th>Table partitioning</th><th>Sharding</th></tr></thead><tbody>
<tr><td>Where the pieces live</td><td>One database, one server</td><td>Many databases, many servers</td></tr>
<tr><td>Seen by the app as</td><td>One table</td><td>Several databases; the app or a routing layer picks one</td></tr>
<tr><td>Adds capacity</td><td>No</td><td>Yes: CPU, memory and write throughput</td></tr>
<tr><td>Main benefit</td><td>Maintenance: fast archive, partition-level rebuilds, partition elimination</td><td>Scale beyond one server; isolate tenants</td></tr>
<tr><td>Joins and transactions</td><td>Unchanged</td><td>Hard or impossible across shards</td></tr></tbody></table>
<p>Terms: splitting rows into groups is <b>horizontal</b> partitioning; moving some columns to another table (for example a large document column) is <b>vertical</b> partitioning. Sharding is horizontal partitioning across servers.</p>
<p>A common mistake is expecting partitioning to make queries faster. It only helps queries that filter on the partition column, and a good index often does as much. Its real value is operational: dropping a month of data in milliseconds through a partition switch or truncate.</p>
<p>NoSQL stores such as Cosmos DB shard for you: the partition key is the shard key and the service moves data between servers.</p>
<blockquote><b>Say it in the interview:</b> Partitioning is one server, many pieces, mainly for manageability. Sharding is many servers and real extra capacity, paid for with cross-shard complexity.</blockquote>`,
  followUps: ['What is partition elimination?', 'What is a sliding window partition scheme?', 'What does Azure SQL offer for scaling out (Hyperscale, elastic pools)?'] });

interview.push({ q: 'You must shard a multi-tenant database. How do you choose the shard key and handle growth and rebalancing?', level: 'E',
  a: `<p>I shard by tenant id, because almost every query already filters on it, and I route with a lookup directory so that any tenant can be moved without rehashing everyone.</p>
<p><b>Choosing the key.</b> It must be present in nearly every query (so one request hits one shard), spread load evenly, and never change. Tenant id fits a SaaS product. The weakness is skew: one giant tenant.</p>
<p><b>Routing options:</b></p>
<ul><li><b>Hash</b> of the key: even spread, but adding a shard remaps most keys unless you use consistent hashing.</li>
<li><b>Range:</b> simple, but new tenants crowd the newest shard.</li>
<li><b>Directory:</b> a shard map table (tenant → database), cached in the app. Most flexible, and my choice here: a whale tenant gets its own database, small tenants share.</li></ul>
<p><b>Moving a tenant online:</b> copy its data to the target, keep it in sync (change tracking or dual writes), briefly block that tenant's writes, switch the map entry, then clean up the source.</p>
<p><b>What gets harder, and my answers:</b></p>
<ul><li>Cross-shard queries and reports: send data to a warehouse rather than querying all shards.</li>
<li>Cross-shard transactions: avoid by keeping one tenant on one shard; use a saga if truly needed.</li>
<li>Global uniqueness: GUIDs or ids with a shard prefix.</li>
<li>Schema migrations: run per shard, tolerant of mixed versions.</li>
<li>Shared reference data: replicate to every shard.</li></ul>
<blockquote><b>Say it in the interview:</b> Shard on the key that is in every query, route through a directory so tenants can move, plan the online move from the start, and push cross-shard reporting to a warehouse.</blockquote>`,
  followUps: ['How does consistent hashing reduce data movement?', 'How do you keep the shard map highly available and fast?', 'Database per tenant or shared database with a tenant column: how do you decide?'] });

/* ================= Practice: 3 Easy, 5 Medium, 4 Hard ================= */
practice.push(P({
  t: 'The order list page sends 101 queries', l: 'Easy', tags: ['EF Core', 'N+1'],
  s: 'A page lists 100 orders with the customer name next to each. It takes 3 seconds. The EF Core log shows one SELECT from Orders followed by 100 nearly identical SELECTs from Customers, each with a different id. What is wrong and how do you fix it?',
  ex: `<pre><code>SELECT TOP(100) ... FROM Orders
SELECT ... FROM Customers WHERE Id = 17
SELECT ... FROM Customers WHERE Id = 4
... 98 more</code></pre><p>${H.c('r', '1 + 100 queries')} should be ${H.c('g', '1 query')}.</p>`,
  weak: 'The database is slow. We should add an index on Customers.Id or get a bigger server.',
  why: 'Customers.Id is the primary key and already indexed; each query is fast. The time is 100 network round trips. The answer did not read the evidence in the log.',
  q: ['Which change turns the 101 queries into 1 and fetches the least data?', ['Add AsNoTracking()', 'Project with Select into a DTO that includes o.Customer.Name', 'Increase the command timeout', 'Call ToList() earlier'], 1, 'A projection makes EF Core generate one SELECT with a JOIN and only the needed columns. AsNoTracking alone does not stop lazy loads.'],
  h: ['Hint 1: look at the pattern in the log: one query for the list, then one per row.', 'Hint 2: what loads Customer when the code touches order.Customer.Name inside a loop?', 'Hint 3: name the problem, then give two fixes (Include, or Select into a DTO) and say how you would stop it coming back: lazy loading off, SQL logging in development, a query count check.'],
  a: `<p><b>Strong answer:</b> "This is the N+1 problem. The list query loads 100 orders, and then touching <code>order.Customer</code> in a loop lazy-loads each customer with its own query. Each one is fast, but 100 round trips add up."</p>
<p>"I would replace it with a single query. For a read-only list my first choice is a projection: <code>db.Orders.Select(o =&gt; new OrderRow(o.Id, o.Total, o.Customer.Name)).Take(100)</code>. EF Core turns that into one SELECT with a JOIN and only 3 columns. If the code really needs full entities, <code>Include(o =&gt; o.Customer)</code> also gives one query."</p>
<p>"To stop it happening again I would turn lazy loading off, keep EF Core SQL logging on in development, and add a check in an integration test that this endpoint sends no more than 2 SQL commands."</p>`,
  cx: '<p><b>What is being checked:</b> you read the log, name N+1, and fix the cause instead of the hardware.</p>',
  f: ['The same page also needs the item count per order. Still 1 query?', 'Where else can N+1 hide besides a visible foreach?']
}));

practice.push(P({
  t: 'A search that got slower as the table grew', l: 'Easy', tags: ['indexes', 'execution plan'],
  s: 'A support screen finds customers by email: <code>SELECT Id, Name, Email FROM Customers WHERE Email = @email</code>. With 20,000 customers it was instant. With 6 million it takes 4 seconds. What do you check and what do you change?',
  ex: `<p>Actual plan: ${H.c('r', 'Clustered Index Scan, 6,000,000 rows read, 1 row returned')}. <code>STATISTICS IO</code>: 85,000 logical reads.</p>`,
  weak: 'I would add caching in front of it so the search is fast.',
  why: 'Caching does not help a search where almost every lookup is a different email, and it hides a simple missing index. The first request for each email is still 4 seconds.',
  q: ['Which index fixes this query best?', ['A nonclustered index on Name', 'A unique nonclustered index on Email, with INCLUDE (Name)', 'A clustered index on Email', 'An index on (Id, Email)'], 1, 'Email is the search column, so it must lead the key. Unique also enforces the business rule, and INCLUDE (Name) makes it covering. Id is already carried as the clustered key.'],
  h: ['Hint 1: 6 million rows read to return 1. Which plan operator does that?', 'Hint 2: which column is in the WHERE clause, and is there an index that starts with it?', 'Hint 3: also check the parameter type against the column type. Recipe: look at the plan, add a (unique) index on Email, include Name, compare logical reads before and after.'],
  a: `<p><b>Strong answer:</b> "I would look at the actual execution plan. Reading 6 million rows to return 1 means a scan: there is no index on Email, so the cost grew with the table."</p>
<p>"The fix is a nonclustered index on <code>Email</code>. Emails should be unique per customer, so I would make it a <b>unique</b> index, which also enforces that rule, and add <code>INCLUDE (Name)</code> so the query is covered. The plan becomes an Index Seek with about 3 logical reads."</p>
<p>"Two more checks. If the Email column is VARCHAR and the app sends an NVARCHAR parameter, the implicit conversion can prevent a seek, so I would align the types in the EF Core mapping. And I would build the index online, since the table is in use. Then I compare the reads and duration before and after."</p>`,
  code: { lang: 'sql', check: false, code: `CREATE UNIQUE NONCLUSTERED INDEX UX_Customers_Email
ON dbo.Customers (Email)
INCLUDE (Name)
WITH (ONLINE = ON);` },
  cx: '<p><b>What is being checked:</b> scan vs seek, choosing the right key column, and measuring. Reads drop from 85,000 to about 3.</p>',
  f: ['The screen changes to "email contains". Does the index still help?', 'What if emails must be unique only among active customers?']
}));

practice.push(P({
  t: 'Relational or document store for a product catalogue?', l: 'Easy', tags: ['NoSQL', 'data modelling', 'trade-offs'],
  s: 'An online shop is building a product catalogue. Products come in very different shapes: a laptop has RAM and screen size, a shirt has size and colour, a book has an author and ISBN. The catalogue is read heavily and changed rarely. Orders and payments already live in SQL Server. A developer asks: "Should the catalogue go in SQL Server or Cosmos DB?" What do you answer?',
  ex: `${H.table(['Fact', 'Points towards'], [['Attributes differ per category', 'Document (flexible shape)'], ['Read heavy, product read as a whole', 'Document or cache'], ['Orders and payments need joins and transactions', 'Relational'], ['Team already runs SQL Server', 'Fewer moving parts']])}`,
  weak: 'NoSQL is more scalable, so we should move everything to Cosmos DB.',
  why: 'It is a slogan. It ignores that orders and payments need transactions, gives no access patterns, and skips the cheaper option of a JSON column in the database the team already runs.',
  q: ['What is the strongest first step before choosing the store?', ['Pick the newest technology', 'List the main read and write patterns with their volumes', 'Ask which database the developers like', 'Start coding and decide later'], 1, 'The store follows the access patterns: what is read together, how often, how big, and what consistency is needed.'],
  h: ['Hint 1: split the problem. Do the catalogue and the orders have the same needs?', 'Hint 2: what does a varying set of attributes look like in tables (many nullable columns, or an attribute-value table) compared with a document?', 'Hint 3: give a recommendation with a condition: when a JSON column in SQL Server is enough, and what would make you choose Cosmos DB. Name the cost of running two stores.'],
  a: `<p><b>Strong answer:</b> "I would decide per workload. Orders and payments stay in SQL Server: they need transactions, constraints and ad hoc reporting."</p>
<p>"The catalogue is a good fit for a document shape: each product is read as a whole, attributes vary by category, and it is read far more than written. That gives two reasonable options:"</p>
<ul><li>"<b>Stay in SQL Server</b> with common columns (Id, Name, Price, CategoryId) plus a JSON column for the category-specific attributes. No new infrastructure, and one backup and security story. Right if the catalogue is modest and one region."</li>
<li>"<b>Cosmos DB</b>, one document per product, partitioned by product id or category. Right if we need very high read volume, global distribution or search over nested attributes."</li></ul>
<p>"I would start with the first, put a cache in front of the product page, and move to Cosmos DB only if measurements show SQL Server is the limit. A second store means a second thing to monitor, secure and keep in sync, so it must earn its place."</p>`,
  cx: '<p><b>What is being checked:</b> a decision made per workload from access patterns, with the simplest option considered first and the cost of the second store named.</p>',
  f: ['How would you query "all laptops with 16 GB RAM" in each option?', 'Where would full-text product search live?']
}));

practice.push(P({
  t: 'Deadlocks every night between two jobs', l: 'Medium', tags: ['deadlock', 'locking', 'troubleshooting'],
  s: 'Since a new nightly "price refresh" job went live, the checkout API logs a few errors per night: <i>Transaction (Process ID 71) was deadlocked on lock resources with another process and has been chosen as the deadlock victim.</i> Customers see a failed order. How do you investigate and what do you change?',
  ex: `${H.table(['', 'Checkout', 'Price refresh job'], [['Step 1', 'UPDATE Stock (row 7)', 'UPDATE Products (row 7)'], ['Step 2', 'SELECT price FROM Products (row 7)', 'UPDATE Stock (row 7)']])}<p>Opposite order: ${H.c('r', 'a cycle is possible')}.</p>`,
  weak: 'I would add WITH (NOLOCK) to the checkout queries so they stop getting locked.',
  why: 'NOLOCK lets checkout read a price that is half-updated or later rolled back, so the customer may be charged a wrong amount. It also does nothing for the two UPDATE statements, which still deadlock.',
  q: ['Where do you find exactly which statements and resources were involved?', ['The Windows event log only', 'The deadlock graph (xml_deadlock_report) in the system_health Extended Events session', 'The EF Core migration history', 'You cannot find out'], 1, 'SQL Server records a deadlock graph for every deadlock, showing both sessions, their statements, and the locks held and requested.'],
  h: ['Hint 1: get the evidence first. Where does SQL Server record each deadlock?', 'Hint 2: compare the order in which the two code paths touch Products and Stock.', 'Hint 3: give layered fixes: an immediate one (retry the victim), a root-cause one (same order, smaller batches, index), and a structural one (read committed snapshot, run the job off-peak).'],
  a: `<p><b>Strong answer:</b> "First I would get the deadlock graph from the <code>system_health</code> Extended Events session, or from Azure SQL diagnostics. It tells me the two statements and which locks each held and wanted, so I am not guessing."</p>
<p>"From the description I expect a lock-order cycle: checkout takes Stock then Products, the job takes Products then Stock. My fixes, in layers:"</p>
<ul><li>"<b>Today:</b> make checkout retry on error 1205. The operation is safe to retry because the victim was fully rolled back. In EF Core that is <code>EnableRetryOnFailure</code> with the transaction inside the execution strategy. Customers stop seeing failures."</li>
<li>"<b>Root cause:</b> change the job to touch tables in the same order as checkout, and to commit in small batches, say 1,000 products, so it holds few locks for a short time and does not escalate to a table lock."</li>
<li>"<b>Structure:</b> turn on read committed snapshot so checkout's price read takes no shared lock, and check the job's UPDATEs have supporting indexes so they lock only the rows they change."</li></ul>
<p>"Then I watch the deadlock count for a week. Zero is the target, and the retry remains as a safety net."</p>`,
  cx: '<p><b>What is being checked:</b> evidence before fixes, a retry for the victim, and a root-cause fix based on lock order and transaction size.</p>',
  f: ['How does SQL Server decide which session is the victim?', 'Could you make the job always lose instead of checkout?']
}));

practice.push(P({
  t: 'Fast in SSMS, slow from the application', l: 'Medium', tags: ['parameter sniffing', 'execution plan', 'Query Store'],
  s: 'A stored procedure <code>GetOrdersByCustomer @CustomerId</code> usually returns in 20 ms. Some mornings it takes 15 seconds for everyone until someone restarts something. When the DBA runs the same procedure in SQL Server Management Studio with the same parameter, it is fast. What is happening and how do you fix it?',
  ex: `${H.table(['Customer', 'Orders', 'Best plan'], [['Typical shop customer', '12', 'Index Seek + Key Lookup'], ['One wholesale customer', '3,000,000', 'Scan / Hash Join']])}<p>One cached plan is being used for both.</p>`,
  weak: 'It is probably the network or the app server. Restarting the service fixes it, so we should schedule a nightly restart.',
  why: 'The restart "works" only because it happens to clear the bad cached plan. It does not explain why SSMS is fast, and the problem returns whenever the plan is recompiled with an unlucky parameter.',
  q: ['Why can SSMS be fast while the app is slow with the same parameter?', ['SSMS has a faster network', 'Different SET options (such as ARITHABORT) give SSMS its own cached plan, compiled for the value you just typed', 'SSMS skips locking', 'The app uses a different database'], 1, 'Session SET options are part of the plan cache key. SSMS compiles a fresh plan for your value, while the app keeps reusing the plan compiled for another value.'],
  h: ['Hint 1: the data is skewed. What does SQL Server do with the first parameter value it sees when it compiles a procedure?', 'Hint 2: SSMS and the application do not share a cached plan. Why not?', 'Hint 3: confirm with Query Store (several plans for one query, very different durations), then choose: covering index, OPTION (RECOMPILE), OPTIMIZE FOR, or force the good plan.'],
  a: `<p><b>Strong answer:</b> "This looks like parameter sniffing on skewed data. The plan is compiled for whichever customer calls first after the cache is cleared or statistics update. If that is the wholesale customer with 3 million orders, everyone gets a scan plan; if it is a small customer, the wholesale customer gets a seek plus millions of key lookups."</p>
<p>"SSMS is fast because its session settings differ from the app's (ARITHABORT is the usual one), so it gets its own plan, compiled for the value just typed."</p>
<p>"To confirm, I would open Query Store and look at this query: I expect 2 or more plans with very different average durations. In the slow plan's properties I can compare the compiled parameter value with the runtime value."</p>
<p>"Fixes: the quick, safe one is to <b>force the good plan in Query Store</b> to stop the incidents. Then a lasting one: a covering index so that one plan suits both cases, or <code>OPTION (RECOMPILE)</code> on that statement since it is not called hundreds of times per second, or a separate code path for the wholesale customer. On SQL Server 2022 or later I would also check that parameter-sensitive plan optimization is active."</p>`,
  cx: '<p><b>What is being checked:</b> recognising skew plus plan reuse, explaining the SSMS difference, and confirming with Query Store before fixing.</p>',
  f: ['What is the cost of OPTION (RECOMPILE)?', 'How would the same issue show up with an EF Core LINQ query?']
}));

practice.push(P({
  t: 'Two support agents overwrite each other\'s edits', l: 'Medium', tags: ['concurrency', 'rowversion', 'EF Core'],
  s: 'In a booking system, two support agents open the same customer record. Agent A changes the phone number and saves. Agent B, who opened the form earlier, changes the address and saves 2 minutes later. The phone number silently goes back to the old value. How do you fix this in an ASP.NET Core API with EF Core?',
  ex: `${H.table(['Time', 'Agent A', 'Agent B', 'Phone in DB'], [['10:00', 'opens form (phone 111)', 'opens form (phone 111)', '111'], ['10:01', 'saves phone 222', '', '222'], ['10:03', '', 'saves address, sends phone 111', H.c('r', '111 (A\'s change lost)')]])}`,
  weak: 'Lock the record when someone opens the form and unlock it when they save.',
  why: 'A web API is stateless: the database connection ends with each request, so there is nothing to hold a lock across a 2-minute edit. An application-level "lock" flag gets stuck when someone closes the browser.',
  q: ['What does EF Core do when a [Timestamp] rowversion no longer matches at save time?', ['Silently overwrites', 'Throws DbUpdateConcurrencyException because 0 rows were affected', 'Retries until it works', 'Deletes the row'], 1, 'The UPDATE includes WHERE RowVersion = the value read. If someone else saved, 0 rows match and EF Core raises the exception.'],
  h: ['Hint 1: this is a lost update with a long "think time". Can a database lock live across two HTTP requests?', 'Hint 2: what if every save had to prove it was based on the latest version of the row?', 'Hint 3: rowversion column, send it to the client, send it back on save, map the failure to HTTP 409 or 412, and decide what the user sees. Also consider sending only changed fields.'],
  a: `<p><b>Strong answer:</b> "This is a lost update, and because the edit spans minutes and separate HTTP requests I would use <b>optimistic concurrency</b>."</p>
<ol><li>"Add a <code>rowversion</code> column to Customers and mark the property <code>[Timestamp]</code> in EF Core. SQL Server changes it on every update."</li>
<li>"The GET returns the version to the client, as a field or as an <b>ETag</b> header."</li>
<li>"The PUT sends it back (<code>If-Match</code>). I set it as the entity's original value, so EF Core generates <code>UPDATE ... WHERE Id = @id AND RowVersion = @v</code>."</li>
<li>"If agent A saved in between, 0 rows match and EF Core throws <code>DbUpdateConcurrencyException</code>. I return <b>409 Conflict</b> (or 412) with the current values."</li>
<li>"The UI tells agent B: 'This record changed while you were editing' and shows the latest data to merge or redo."</li></ol>
<p>"I would also reduce the chance of conflict by sending only the fields that changed (a PATCH), so an address edit never carries a stale phone number. But the version check stays, because it is the guarantee."</p>`,
  cx: '<p><b>What is being checked:</b> choosing optimistic over pessimistic for a stateless API, the rowversion mechanics end to end, and a sensible user experience on conflict.</p>',
  f: ['How would you auto-merge when the two agents changed different fields?', 'How does this work if the table has no rowversion column and you cannot add one?']
}));

practice.push(P({
  t: 'Cosmos DB throttles while most partitions are idle', l: 'Medium', tags: ['Cosmos DB', 'hot partition', 'request units'],
  s: 'An IoT system stores device readings in a Cosmos DB container provisioned at 20,000 RU/s with partition key <code>/readingDate</code> (for example "2026-02-03"). Writes fail with 429 during the day although the average consumption graph shows only 15% of the provisioned throughput in use. The team wants to double the RUs. What do you say?',
  ex: `${H.table(['Physical partition', 'Share of RU/s', 'Used'], [['1 (today\'s date lives here)', '4,000', H.c('r', '100%, throttled')], ['2', '4,000', '3%'], ['3', '4,000', '2%'], ['4', '4,000', '1%'], ['5', '4,000', '2%']])}`,
  weak: 'We are getting 429s, so we need more throughput. Double it to 40,000 RU/s.',
  why: 'Throughput is split evenly across physical partitions. Doubling it gives the hot partition 8,000 instead of 4,000 and wastes the rest, at twice the price. Tomorrow the hot spot simply moves to tomorrow\'s date.',
  q: ['Why is /readingDate a poor partition key for write-heavy telemetry?', ['Dates are too long', 'All of today\'s writes share one key value, so they hit one partition', 'Cosmos DB cannot index dates', 'It has too many distinct values'], 1, 'Every device writes with today\'s date, so the whole write load lands on one logical partition while the others sit idle.'],
  h: ['Hint 1: average use is 15% but you are throttled. What does that tell you about how the load is spread?', 'Hint 2: where do all writes go when the partition key is today\'s date?', 'Hint 3: pick a key from the access pattern (readings of one device over a time range): device id, or device id plus a month bucket. Then explain how to move the data, because the key cannot be changed in place.'],
  a: `<p><b>Strong answer:</b> "I would not double the RUs. An average of 15% with 429s means a <b>hot partition</b>. With <code>/readingDate</code>, every device writes to today's value, so one physical partition takes all the writes and hits its share, 4,000 RU/s, while the other four are idle. Azure Monitor's normalized RU consumption per partition will confirm it."</p>
<p>"The fix is a partition key that spreads writes and matches the main query, which is 'readings for one device over a time range'. I would use <code>/deviceId</code>. Thousands of devices spread the writes evenly, and the query targets one partition. If one device can exceed 20 GB over its life, I would use a synthetic or hierarchical key: device id plus a month bucket."</p>
<p>"A partition key cannot be changed in place, so I would create a new container with the new key, copy the data across with a container copy job or a change feed processor while the app writes to both, then switch reads and delete the old container. I would also set a time-to-live on readings so old data expires by itself, and re-check the RU setting afterwards. I expect we can lower it."</p>`,
  cx: '<p><b>What is being checked:</b> reading "low average, still throttled" as skew, picking a key from the access pattern, and knowing that a key change means a migration.</p>',
  f: ['How do you query "all devices for today" with the new key?', 'When would autoscale help here and when would it not?']
}));

practice.push(P({
  t: 'Customers still see the old price after an update', l: 'Medium', tags: ['Redis', 'cache invalidation', 'IMemoryCache'],
  s: 'A shop API runs on 4 instances behind a load balancer. Product details are cached with <code>IMemoryCache</code> for 30 minutes. When an admin changes a price, the code updates the database and removes the cache entry. Customers report that the price flips between old and new as they refresh the page. Why, and how do you fix it?',
  ex: `${H.table(['Instance', 'Its own memory cache', 'Price shown'], [['1 (handled the admin update)', 'entry removed, reloaded', H.c('g', '65.00')], ['2', 'old entry, 22 min left', H.c('r', '70.00')], ['3', 'old entry, 9 min left', H.c('r', '70.00')], ['4', 'no entry yet', H.c('g', '65.00')]])}`,
  weak: 'Lower the cache time to 1 minute so the stale price goes away sooner.',
  why: 'It shrinks the window but keeps the bug: for up to a minute, instances still disagree. It also throws away most of the benefit of caching by sending far more reads to the database.',
  q: ['Why does removing the entry in the admin request not fix all instances?', ['The remove call is asynchronous', 'IMemoryCache lives inside each process, so only the instance that handled the update is cleared', 'Redis is too slow', 'The TTL overrides Remove'], 1, 'Each instance has a private in-memory cache. A remove on one does nothing to the other three.'],
  h: ['Hint 1: how many separate caches exist in this deployment?', 'Hint 2: which instance runs the cache removal, and what happens on the others?', 'Hint 3: move to a shared cache (Redis through IDistributedCache or HybridCache). If you keep a local layer for speed, say how the other instances learn about the change: a short local TTL or a pub/sub message.'],
  a: `<p><b>Strong answer:</b> "The cache is per process. There are 4 instances, so 4 separate caches. The admin's request reached one instance, which removed its own entry. The other 3 keep serving the old price until their entry expires, and the load balancer sends each refresh to a different instance, so the price flips."</p>
<p>"The fix is a <b>shared</b> cache. I would move product caching to Redis, using <code>HybridCache</code> with Redis as the second level. The update path stays the same in shape: write the database, then remove the key, but now the removal clears the shared copy that every instance reads."</p>
<p>"HybridCache also keeps a small local copy per instance for speed. To stop that copy bringing the bug back, I would give the local layer a short expiry, for example 30 seconds, or publish an invalidation message over Redis pub/sub so each instance drops its local entry. And I would agree with the business how stale a price may be on the product page, while the checkout always reads the price from the database, not the cache."</p>`,
  cx: '<p><b>What is being checked:</b> understanding in-process vs distributed caches, fixing the design instead of shrinking the TTL, and protecting the critical read at checkout.</p>',
  f: ['What if the price is changed by a nightly SQL job, not through the API?', 'How do you test this with more than one instance before going live?']
}));

practice.push(P({
  t: 'Add a required column to a 400 million row table without downtime', l: 'Hard', tags: ['migrations', 'zero downtime', 'expand and contract'],
  s: 'The Orders table has 400 million rows and takes 2,000 writes per second around the clock. Product wants a new required field <code>SalesChannel</code> (values such as "Web", "App", "Store"); old rows should be "Web". A developer has an EF Core migration that adds the column as NOT NULL with a default and runs <code>Database.Migrate()</code> at startup. The app runs on 8 instances with rolling deploys. What worries you and what is your plan?',
  ex: `<p>Risky, single step: ${H.c('r', 'ALTER TABLE ... ADD SalesChannel NOT NULL DEFAULT, run at startup by 8 instances')}.</p><p>Safe: ${H.c('g', 'add nullable → deploy code that writes it → backfill in batches → enforce NOT NULL')}.</p>`,
  weak: 'Run the migration at 3 a.m. when traffic is low. It should only take a few minutes.',
  why: 'The system has no quiet hour, "should" is not a measurement, and it ignores that old app instances that do not know the column are still running during the rollout, plus the race of 8 instances migrating at startup.',
  q: ['During a rolling deploy, which statement must be true for a schema change to be safe?', ['Only the new code needs to work with the new schema', 'Both the old and the new version of the app must work with the schema at every step', 'The database must be offline', 'All instances must restart together'], 1, 'Old and new instances run side by side for minutes, so each schema step must be compatible with both.'],
  h: ['Hint 1: list everything that happens at the same moment: 8 instances starting, old code still serving, a big table under write load.', 'Hint 2: which form of ADD COLUMN is a metadata-only change, and which operations scan or rewrite 400 million rows?', 'Hint 3: plan in steps that can each be rolled back: expand (nullable column), deploy writers, backfill in small batches with pauses, validate, then add the NOT NULL constraint. Move the migration out of app startup into the pipeline.'],
  a: `<p><b>Strong answer:</b> "Three things worry me: running migrations from app startup with 8 instances, a long schema lock on a table that never rests, and old instances that insert rows without the column while the deploy rolls."</p>
<p>"My plan is expand and contract, with migrations run by the pipeline as a reviewed, idempotent script, not by the app:"</p>
<ol><li>"<b>Release 1, expand:</b> add <code>SalesChannel</code> as a <b>nullable</b> column. That is a metadata-only change and takes only a brief schema lock. Old code keeps working because it never mentions the column."</li>
<li>"<b>Release 1, code:</b> the new version writes the channel on every new order and treats NULL as 'Web' when reading."</li>
<li>"<b>Backfill:</b> a background job updates old rows in batches of about 5,000 by primary key range, each in its own short transaction with a small pause, watching log growth, blocking and replica lag. It can be stopped and resumed."</li>
<li>"<b>Validate:</b> count the remaining NULLs until it is 0."</li>
<li>"<b>Release 2, contract:</b> add a default for safety and change the column to NOT NULL. I would test this step on a production-sized copy first, because validating the constraint reads the table, and I would schedule it for the lowest-traffic period with a lock timeout so it fails fast instead of blocking writers."</li></ol>
<p>"Every step works with the previous version of the app, so I can pause or roll back at any point."</p>`,
  cx: '<p><b>What is being checked:</b> backward-compatible steps, batching, moving migrations to the pipeline, and testing on realistic data volume.</p>',
  f: ['How would you express these steps as separate EF Core migrations?', 'How do you throttle the backfill automatically when the system is busy?']
}));

practice.push(P({
  t: 'Timeouts under load: the connection pool is empty', l: 'Hard', tags: ['connection pooling', 'async', 'troubleshooting'],
  s: 'During a sales campaign an ASP.NET Core API starts failing with: <i>Timeout expired. The timeout period elapsed prior to obtaining a connection from the pool. This may have occurred because all pooled connections were in use and max pool size was reached.</i> The SQL Server shows only 30% CPU. A developer proposes setting <code>Max Pool Size=1000</code>. How do you diagnose and fix it?',
  ex: `${H.table(['Signal', 'Value', 'Reading'], [['SQL Server CPU', '30%', 'The database is not overloaded'], ['Sessions from the app', '100, many "sleeping" with open transactions', H.c('r', 'Connections are held but idle')], ['App thread pool queue', 'growing', H.c('r', 'Threads are blocked')]])}`,
  weak: 'Increase Max Pool Size to 1000 so there are enough connections for everyone.',
  why: 'The database is not busy, so connections are being held, not used. A bigger pool delays the failure, uses more memory on the server, and when it fills again the outage is larger. The cause is still unknown.',
  q: ['Which finding best explains pool exhaustion with low database CPU?', ['The database is too small', 'Connections are held while the app does something else, such as a blocking call or an HTTP request inside a transaction', 'Too many indexes', 'The pool is disabled'], 1, 'Idle sessions with open transactions and blocked threads mean connections are checked out but not doing database work.'],
  h: ['Hint 1: the pool is empty but the server is calm. Are the connections working or just being held?', 'Hint 2: look for code that keeps a connection or transaction open across slow non-database work, and for .Result or .Wait() calls.', 'Hint 3: check sleeping sessions with open transactions on the server, take a memory dump or trace of blocked threads, fix disposal, async and transaction scope, and only then review the pool size.'],
  a: `<p><b>Strong answer:</b> "Low database CPU with an empty pool tells me connections are being <b>held</b>, not used. Raising the pool to 1000 would hide that and move the failure to a worse moment, so I would find who holds them."</p>
<p><b>Diagnose:</b></p>
<ul><li>"On SQL Server, list sessions from the app: many in 'sleeping' state with an open transaction means the app took a connection and is busy elsewhere. The last statement each one ran points at the code path."</li>
<li>"In the app, check thread pool queue length and look at traces for the slow requests: what happens between opening the transaction and committing?"</li></ul>
<p><b>Usual causes and fixes:</b></p>
<ul><li>"A transaction that wraps a call to a payment or email service. Move the external call outside the transaction, or use an outbox."</li>
<li>"Sync over async: <code>.Result</code> or <code>.Wait()</code> on database calls blocks threads under load, and each blocked request holds a connection. Make the path async end to end."</li>
<li>"A connection, data reader or DbContext that is not disposed, often a context created by hand or captured in a singleton."</li>
<li>"A slow query or blocking chain that makes every request hold its connection for seconds. Fix the query or the blocking."</li></ul>
<p>"After the fix I would load test at campaign volume, add a metric and alert for pool usage and connection wait time, and set a sensible command timeout. I would only raise the pool size if the measurements show healthy, short-lived connections that are truly at the limit."</p>`,
  cx: '<p><b>What is being checked:</b> separating "database busy" from "connections held", knowing the common leaks, and resisting the quick setting change.</p>',
  f: ['How does this problem change with Azure Functions scaling out to 200 instances?', 'What metrics does Microsoft.Data.SqlClient expose for the pool?']
}));

practice.push(P({
  t: 'After adding a read replica, users cannot see what they just saved', l: 'Hard', tags: ['read replicas', 'replication lag', 'consistency'],
  s: 'To relieve the primary database, the team routed all SELECT queries to a readable secondary. Now support tickets say: "I updated my delivery address, the page reloaded, and it showed the old address. A few seconds later it was right." Occasionally a just-created order returns 404. Explain the cause and design a fix that keeps the benefit of the replica.',
  ex: `${H.table(['Time', 'Event', 'Primary', 'Replica'], [['0 ms', 'POST new address', 'new', 'old'], ['40 ms', 'Redirect, GET profile from replica', 'new', H.c('r', 'old (lag)')], ['900 ms', 'Replication catches up', 'new', H.c('g', 'new')]])}`,
  weak: 'Add a 2-second delay after saving before the page reloads, so the replica has time to catch up.',
  why: 'Lag is not a fixed number: under load it can be 10 seconds. The delay makes every save slower for every user and still fails sometimes. It treats a consistency question as a timing guess.',
  q: ['Which reads should go to the primary rather than the replica?', ['All reads', 'Reads that must reflect a write the same user just made, and reads that feed a decision to write', 'Only reports', 'None'], 1, 'Read-your-own-writes and read-before-write need current data. Lists, search and reports tolerate a little staleness.'],
  h: ['Hint 1: replication to the secondary is asynchronous. What is the name for the gap?', 'Hint 2: not every read needs the same freshness. Sort the reads into "must be current" and "may be slightly stale".', 'Hint 3: options: route by use case (two DbContext registrations), pin a user to the primary for a few seconds after a write, return the saved data from the write itself, and monitor lag with a fallback to the primary.'],
  a: `<p><b>Strong answer:</b> "The secondary is updated asynchronously, so it is behind the primary by the <b>replication lag</b>, usually milliseconds but sometimes seconds. The read straight after the write went to the replica before the change arrived. This is a read-your-own-writes problem."</p>
<p>"I would not send all reads back to the primary. I would route by need:"</p>
<ul><li>"<b>Two contexts:</b> a normal read-write DbContext on the primary and a read-only one with <code>ApplicationIntent=ReadOnly</code>. Each query handler chooses on purpose. Search, lists, dashboards and reports use the replica."</li>
<li>"<b>Read your own writes from the primary:</b> any read that directly follows the user's write, and any read used to decide a write (stock, balance), uses the primary."</li>
<li>"<b>Avoid the read where possible:</b> the POST or PUT returns the saved resource, so the UI shows that instead of fetching again."</li>
<li>"<b>Stickiness for a short time:</b> after a write, mark the user (a cookie or cache entry with a timestamp) so their reads go to the primary for the next few seconds."</li>
<li>"<b>Operate it:</b> monitor replica lag, alert on it, and fall back to the primary automatically when lag passes a threshold."</li></ul>
<p>"The 404 on a new order has the same cause, so the 'get by id straight after create' path reads the primary. I would document the rule for the team: replica by default for queries marked as tolerant of staleness, primary for everything else."</p>`,
  cx: '<p><b>What is being checked:</b> naming replication lag and read-your-own-writes, classifying reads by freshness need, and an explicit routing rule rather than a delay.</p>',
  f: ['Would synchronous replication solve this? At what cost?', 'How does Cosmos DB solve the same problem with session consistency?']
}));

practice.push(P({
  t: 'One giant tenant is slowing everyone down', l: 'Hard', tags: ['sharding', 'multi-tenancy', 'scaling'],
  s: 'A payroll SaaS keeps 3,000 customer companies in one Azure SQL database, every table has a <code>TenantId</code> column. One customer with 400,000 employees now produces 45% of the load; on payroll day their batch run makes the app slow for everyone. The database is already on a large tier. The CTO asks you for a plan. What do you propose?',
  ex: `${H.table(['Tenant', 'Employees', 'Share of load'], [['Tenant A (the giant)', '400,000', H.c('r', '45%')], ['Next 20 tenants', '5,000 to 30,000 each', '35%'], ['Other 2,979 tenants', 'under 1,000 each', '20%']])}`,
  weak: 'We should rewrite the data layer for a NoSQL database, because relational databases do not scale.',
  why: 'Payroll needs transactions and reporting, the rewrite would take a year, and it does not address the actual problem, which is one noisy tenant sharing resources with 2,999 quiet ones.',
  q: ['Which routing approach makes it easiest to give one large tenant its own database?', ['Hash of TenantId modulo the number of shards', 'A directory (shard map) from TenantId to database', 'Range on the tenant name', 'Random assignment per request'], 1, 'A lookup directory can place any single tenant anywhere and move it later, without remapping the others.'],
  h: ['Hint 1: is the problem total size, or one tenant affecting the rest (a noisy neighbour)?', 'Hint 2: what cheaper steps come before splitting data: tuning the batch, moving it off-peak, a replica for reports?', 'Hint 3: propose tenant-based sharding with a shard map: the giant gets its own database, the rest stay put. Cover routing in the app, the online move, migrations across databases, and cross-tenant reporting.'],
  a: `<p><b>Strong answer:</b> "This is a noisy-neighbour problem more than a size problem, so I would act in two phases."</p>
<p><b>Phase 1, weeks:</b> "Look at the giant tenant's payroll batch in Query Store. Tune its top queries and indexes, run it in smaller batches, and schedule or throttle it. Send their heavy reports to a read replica. This may buy a lot of time cheaply."</p>
<p><b>Phase 2, isolate by tenant:</b></p>
<ul><li>"Introduce a <b>shard map</b>: a small, cached directory from TenantId to connection string. Every table already has TenantId, and almost every query filters on it, so it is the natural shard key."</li>
<li>"The app resolves the tenant at the start of each request and builds its DbContext with that tenant's connection, for example through a context factory."</li>
<li>"Move <b>Tenant A to its own database</b>. Copy the data, keep it in sync, pause that tenant's writes for a short window, flip the map entry, verify, then delete the old rows in batches. The other 2,999 tenants do not move at all."</li>
<li>"Later the next 20 large tenants can share a second database, and small tenants stay in an elastic pool."</li></ul>
<p><b>What gets harder, and my answers:</b> "Schema migrations now run against several databases, so the pipeline loops over the shard map and the code tolerates mixed versions. Cross-tenant reports move to a warehouse fed from all shards. Ids must be unique across databases, so new keys are GUIDs or carry a shard prefix."</p>
<p>"I would present the CTO with phase 1 as the immediate relief, phase 2 as a 2 to 3 month project, and the measure of success: payroll day latency for the other tenants."</p>`,
  cx: '<p><b>What is being checked:</b> diagnosing noisy neighbour vs raw size, cheap steps first, directory-based tenant sharding, and an honest list of what sharding makes harder.</p>',
  f: ['How do you guarantee a query can never read another tenant\'s rows?', 'When would database-per-tenant for everyone be the right model?']
}));

/* ================= Quiz ================= */
quiz.push({ q: 'A table can have how many clustered indexes, and why?', options: ['As many as you like', 'Exactly 1, because the clustered index is the table data itself stored in key order', 'None unless there is a primary key', 'Up to 999'], answer: 1, explain: 'The rows can only be physically ordered one way. Nonclustered indexes are separate structures, and you can have up to 999 of them.' });
quiz.push({ q: 'A query filters on <code>CustomerId</code> and returns <code>Total</code>. The plan shows Index Seek + Key Lookup. What removes the Key Lookup?', options: ['Adding WITH (NOLOCK)', 'Adding Total to the index with INCLUDE', 'Updating statistics', 'Making the query a stored procedure'], answer: 1, explain: 'A key lookup fetches columns the index does not hold. Including Total makes the index covering, so the table is never visited.' });
quiz.push({ q: 'Which predicate can use an index seek on <code>PlacedOn</code>?', options: ['WHERE YEAR(PlacedOn) = 2026', 'WHERE CONVERT(date, PlacedOn) = @d', 'WHERE PlacedOn &gt;= @from AND PlacedOn &lt; @to', 'WHERE DATEDIFF(day, PlacedOn, GETDATE()) &lt; 7'], answer: 2, explain: 'The column is left bare and compared with a range, so the predicate is sargable. The other options wrap the column in a function.' });
quiz.push({ q: 'What is the default transaction isolation level in SQL Server?', options: ['READ UNCOMMITTED', 'READ COMMITTED', 'REPEATABLE READ', 'SERIALIZABLE'], answer: 1, explain: 'READ COMMITTED is the default. In Azure SQL Database it uses row versioning (RCSI) by default, so readers do not block writers.' });
quiz.push({ q: 'Two sessions each hold a lock the other needs. What does SQL Server do?', options: ['Waits forever', 'Rolls back both', 'Detects the cycle, rolls back one victim and raises error 1205', 'Restarts the server'], answer: 2, explain: 'The lock monitor finds the cycle, chooses the cheaper transaction as the victim and returns error 1205 to it. The application should retry.' });
quiz.push({ q: 'A web form stays open for minutes. Which approach stops a later save from silently overwriting an earlier one?', options: ['SERIALIZABLE isolation for the whole request', 'A rowversion column checked in the UPDATE (optimistic concurrency)', 'WITH (NOLOCK) on the read', 'A longer command timeout'], answer: 1, explain: 'No lock can be held across separate HTTP requests. A version check makes the second save fail with 0 rows affected, which EF Core reports as DbUpdateConcurrencyException.' });
quiz.push({ q: 'Which service lifetime does <code>AddDbContext</code> use by default, and why does it suit a web API?', options: ['Singleton, to share one connection', 'Scoped, one context per request acting as a unit of work', 'Transient, a new one for every injection', 'It has no lifetime'], answer: 1, explain: 'A DbContext is not thread safe and its change tracker grows, so it should live for one request and then be disposed.' });
quiz.push({ q: 'What is the effect of <code>db.Orders.AsEnumerable().Where(o =&gt; o.Total &gt; 100).ToList()</code>?', options: ['The filter runs in SQL', 'All orders are read from the database and the filter runs in memory', 'It does not compile', 'It runs two SQL queries'], answer: 1, explain: 'AsEnumerable switches from IQueryable to in-memory LINQ, so everything after it runs in C# on rows already fetched.' });
quiz.push({ q: 'Which statement about <code>ExecuteUpdateAsync</code> is true?', options: ['It runs when SaveChanges is called', 'It loads each entity first', 'It sends one UPDATE immediately and does not touch tracked entities', 'It only works with Dapper'], answer: 2, explain: 'It is a set-based statement executed at once. Entities already in the change tracker are not refreshed, and SaveChanges interceptors do not fire.' });
quiz.push({ q: 'In Cosmos DB, which operation is the cheapest in request units?', options: ['A cross-partition query', 'A point read by id and partition key', 'SELECT * with ORDER BY', 'A query filtered on a non-key property'], answer: 1, explain: 'Reading a 1 KB item by id and partition key costs about 1 RU. Queries cost more, and cross-partition queries cost the most.' });
quiz.push({ q: 'An API runs on 5 instances and caches prices with <code>IMemoryCache</code>. After a price update, users see old and new prices at random. What is the root cause?', options: ['The TTL is too short', 'Each instance has its own private cache, and only one was invalidated', 'Redis lost data', 'The database returned stale rows'], answer: 1, explain: 'In-process caches are not shared. A distributed cache such as Redis, or HybridCache on top of it, gives all instances one source.' });
quiz.push({ q: 'What is the main difference between table partitioning and sharding?', options: ['Partitioning is for NoSQL only', 'Partitioning splits a table inside one database; sharding spreads data across separate databases or servers', 'Sharding is always faster', 'There is none'], answer: 1, explain: 'Partitioning helps maintenance and some scans on one server. Sharding adds real capacity but makes cross-shard joins, transactions and migrations harder.' });

registerModule({
  id: 'tl07',
  title: 'Database Questions: SQL Server, EF Core & NoSQL',
  intro: `<p>Almost every full-stack interview has a database round, and for a tech lead it goes past "write a query". You will be asked why a query is slow, why two users overwrote each other, how EF Core really talks to SQL Server, when a document database is the better tool, and what you do when one server is no longer enough.</p>
<p>This module is a question-by-question handbook for that round. It has 53 interview questions in 7 groups: modelling, indexes and plans, transactions and locking, EF Core and Dapper, Cosmos DB, Redis caching, and scaling. Each model answer starts with one plain sentence, then goes deeper, and ends with a line you can say out loud. Read the question, answer it aloud, then open the model answer and compare.</p>
<p>You do not need a SQL Server installation. The runnable SQL examples use a small sample shop database in your browser; SQL Server-only syntax is shown for reading.</p>`,
  goals: [
    'Explain normalization, keys and when to denormalize, with a worked example',
    'Read an execution plan and choose between a scan, a seek and a <b>covering index</b>',
    'Describe ACID, the isolation levels, locks and how to find and fix a <b>deadlock</b>',
    'Use EF Core well: DbContext lifetime, change tracking, migrations, N+1, projections, and when to switch to Dapper or a stored procedure',
    'Model data for Cosmos DB: partition key, request units, consistency levels, embed vs reference',
    'Design caching with Redis and a scaling path from read replicas to partitioning and sharding'
  ],
  prereqs: `<p>You should be able to write a basic <code>SELECT</code> with a <code>JOIN</code> and know C# classes and LINQ. The SQL track covers the query language itself from zero; the earlier module on .NET and ASP.NET Core questions covers dependency injection, which the EF Core answers rely on.</p>`,
  hours: 12,
  langExplain: `<p>Code in this module is C# and T-SQL because the questions are about SQL Server, EF Core, Dapper and the Azure SDKs. The ideas (indexes, isolation, N+1, cache-aside, partition keys) are the same in every stack.</p>`,
  databases: { shop: SHOP_DB },
  topics: topics, practice: practice, quiz: quiz, interview: interview
});
})();
