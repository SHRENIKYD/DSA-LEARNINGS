(function () {
  var topics = [], practice = [], quiz = [], interview = [];
topics.push({
  title: 'The N+1 Query Problem: Spot It and Fix It',
  analogy: `<p>You run a small shop and want to print a list of 50 orders with each customer's name. <b>Way A:</b> you walk to the filing room once, grab the 50 orders, then walk back <b>50 more times</b> — one trip per order — to look up the customer name. <b>Way B:</b> you walk once and ask, "give me the 50 orders <i>with</i> their customers stapled together." Same answer, but Way A is 51 trips and Way B is 1 trip. The database is the filing room, and every trip has a fixed "walking" cost (the network round trip), no matter how small the question is.</p>`,
  explain: `<p><b>N+1</b> means: 1 query to load a list of N parents, then <b>N more queries</b> — one per parent — to load something related (the customer, the items, the tags). It usually hides inside a loop, and the ORM (JPA/Hibernate, Sequelize, Prisma, Django ORM) fires the extra queries quietly when you touch a related field.</p>
  ${H.table(['Step', 'SQL sent', 'Count'], [
    ['1', '<code>SELECT * FROM orders LIMIT 100</code>', '1'],
    ['2…101', '<code>SELECT * FROM customers WHERE id = ?</code> (once per order)', '100'],
    ['Total', '', '<span class="c-r">101 round trips</span>']
  ])}
  <p><b>Why it hurts:</b> each query costs maybe 1–3 ms of network + parsing time, even if the data is tiny. 101 × 2 ms = ~200 ms for a page that could take 3 ms. It also grows with the data: 10,000 rows means 10,001 queries, and your database CPU and connection pool melt long before the code looks "slow".</p>
  <p><b>Why you do not see it:</b> the code looks innocent:</p>
  <pre>for (Order o : orderRepo.findAll()) {
    System.out.println(o.getCustomer().getName()); // hidden SELECT per order
}</pre>
  <p><b>The four standard fixes</b> (pick by situation):</p>
  <ul>
    <li><b>JOIN FETCH</b> (or <code>@EntityGraph</code>) — tell the ORM to load the relation in the <i>same</i> SQL with a JOIN. Best when you need the related data for every row.</li>
    <li><b>Batch fetching</b> (<code>@BatchSize</code> / <code>hibernate.default_batch_fetch_size</code>) — instead of 100 single lookups, it sends <code>WHERE id IN (?, ?, … 16 ids)</code>. 101 queries become ~8. Safe with pagination.</li>
    <li><b>Two explicit queries</b> — load parents, collect their ids, load all children with one <code>IN (…)</code>, group them in memory. Very predictable (2 queries) and what DataLoader does in GraphQL.</li>
    <li><b>DTO projection</b> — write a query that selects just the columns the screen needs (<code>SELECT o.id, c.name …</code>) so no entities and no lazy proxies are involved.</li>
  </ul>
  <p><b>How to catch it:</b> turn on SQL logging in development, count queries per request in tests (<code>assertThat(queryCount).isEqualTo(2)</code>), and look at your APM trace — a "comb" of identical tiny queries is the signature.</p>`,
  clues: [
    '"The list endpoint gets slower as the table grows" — time per request ∝ number of rows',
    'APM trace or SQL log shows the <b>same query repeated</b> with a different id each time',
    '"Why does fetching 100 orders produce 101 queries?" — classic interview opener',
    '"Works fine locally with 5 rows, times out in production with 50,000" — N+1 hides in small data',
    '"LazyInitializationException" or lots of <code>select … where id=?</code> right after a <code>findAll()</code>',
    'GraphQL resolvers calling the database once per parent field — same disease, solved by DataLoader'
  ],
  code: [
    { lang: 'java', check: false, title: 'JPA: the N+1 trap and its fixes', code: `@Entity
class Order {
    @Id Long id;
    @ManyToOne(fetch = FetchType.LAZY)   // LAZY: customer loaded on first touch
    Customer customer;
    @OneToMany(mappedBy = "order")
    List<OrderItem> items = new ArrayList<>();
}

interface OrderRepo extends JpaRepository<Order, Long> {

    // BAD: findAll() = 1 query. Touching o.getCustomer().getName() in a loop = N more.
    // List<Order> findAll();

    // FIX 1: JOIN FETCH - one SQL with a JOIN, customer is already loaded.
    @Query("select o from Order o join fetch o.customer where o.status = :status")
    List<Order> findWithCustomer(@Param("status") String status);

    // FIX 2: EntityGraph - same effect, declared as an annotation.
    @EntityGraph(attributePaths = {"customer"})
    List<Order> findByStatus(String status);

    // FIX 3: DTO projection - select only what the screen needs, no entities at all.
    @Query("select new com.shop.OrderRow(o.id, c.name, o.total) from Order o join o.customer c")
    List<OrderRow> findRows();
}

record OrderRow(Long id, String customerName, int total) {}` },
    { lang: 'js', run: true, title: 'Runnable: count queries for N+1 vs batch (fake DB)', code: `// A tiny fake database that counts how many "round trips" we make.
var customers = { 1: 'Asha', 2: 'Ben', 3: 'Chen', 4: 'Dia', 5: 'Eli' };
var orders = [];
for (var i = 1; i <= 20; i++) orders.push({ id: i, customerId: (i % 5) + 1 });

var queries = 0;
function q(label) { queries++; console.log('  query #' + queries + ': ' + label); }

// BAD: 1 query for orders + 1 query per order for its customer
function nPlusOne() {
  queries = 0; q('SELECT * FROM orders');
  var out = orders.map(function (o) { q('SELECT * FROM customers WHERE id = ' + o.customerId); return o.id + ':' + customers[o.customerId]; });
  return out;
}

// GOOD: 1 query for orders + 1 batched IN query for the DISTINCT customers
function batched() {
  queries = 0; q('SELECT * FROM orders');
  var ids = Array.from(new Set(orders.map(function (o) { return o.customerId; })));
  q('SELECT * FROM customers WHERE id IN (' + ids.join(',') + ')');
  return orders.map(function (o) { return o.id + ':' + customers[o.customerId]; });
}

nPlusOne(); console.log('N+1 total queries =', queries);
batched();  console.log('batched total queries =', queries);` },
    { lang: 'sql', db: 'shop', title: 'Runnable SQL: one JOIN instead of N+1', code: `-- The "N+1" version needs 1 query for orders + 1 per order for the customer.
-- The JOIN version gets everything in a single round trip:
SELECT o.id AS order_id, c.name AS customer, o.status, o.total
FROM orders o
JOIN customers c ON c.id = o.customer_id
WHERE o.status = 'PAID'
ORDER BY o.id
LIMIT 8;

-- Batch loading children: ONE query for the items of many orders (what @BatchSize does)
SELECT order_id, product, qty
FROM order_items
WHERE order_id IN (1, 2, 3, 4, 5)
ORDER BY order_id, product;` },
    { lang: 'java', title: 'Plain JDBC: batch-load children with one IN query', code: `import java.sql.*;
import java.util.*;

class ItemLoader {
    // Loads the items of MANY orders in ONE query and groups them by order id.
    static Map<Long, List<String>> itemsByOrder(Connection con, List<Long> orderIds) throws SQLException {
        Map<Long, List<String>> result = new HashMap<>();
        if (orderIds.isEmpty()) return result;
        // Build "?, ?, ?" - one placeholder per id (never concatenate the ids themselves!)
        String marks = String.join(",", Collections.nCopies(orderIds.size(), "?"));
        String sql = "SELECT order_id, product FROM order_items WHERE order_id IN (" + marks + ")";
        try (PreparedStatement ps = con.prepareStatement(sql)) {
            for (int i = 0; i < orderIds.size(); i++) ps.setLong(i + 1, orderIds.get(i));
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    result.computeIfAbsent(rs.getLong("order_id"), k -> new ArrayList<>())
                          .add(rs.getString("product"));
                }
            }
        }
        return result;
    }
}` }
  ],
  codeTitle: ['JPA: the trap and the fixes', 'Count the queries (runnable)', 'JOIN and IN batch in SQL (runnable)', 'JDBC batch loading'],
  viz: {
    title: 'N+1 query log growing per row vs one JOIN',
    input: '5',
    inputLabel: 'How many orders on the page? (2-8)',
    gen: function (input) {
      var n = parseInt(String(input).trim(), 10);
      if (isNaN(n) || n < 2 || n > 8) throw new Error('Enter a number of orders from 2 to 8');
      var names = ['Asha', 'Ben', 'Chen', 'Dia', 'Eli'];
      var frames = [], log = [], rows = [], i;
      for (i = 1; i <= n; i++) rows.push([i, (i % 5) + 1, '? (lazy proxy)']);
      log.push('#1 SELECT * FROM orders LIMIT ' + n);
      frames.push({
        narr: 'The service asks for <b>' + n + ' orders</b>. That is <b>query #1</b>. Each order only knows its <code>customer_id</code> — the customer itself is a lazy placeholder (a proxy). So far so good: 1 query.',
        parts: [
          { type: 'queue', label: 'SQL sent to the database (oldest to newest)', items: log.slice(), frontLabel: 'first', backLabel: 'latest', hl: { 0: 'cur' } },
          { type: 'table', label: 'Orders page in memory', columns: ['order id', 'customer_id', 'customer name'], rows: rows.map(function (r) { return r.slice(); }) }
        ]
      });
      for (i = 1; i <= n; i++) {
        var cid = (i % 5) + 1;
        log.push('#' + (i + 1) + ' SELECT * FROM customers WHERE id=' + cid);
        rows[i - 1][2] = names[cid - 1];
        var hlq = {}; hlq[log.length - 1] = 'bad';
        var hlt = {}; hlt[i - 1] = 'ok';
        frames.push({
          narr: 'The loop reaches order <b>' + i + '</b> and calls <code>order.getCustomer().getName()</code>. The proxy wakes up and fires <span class="c-r">query #' + (i + 1) + '</span> just for this one customer. The log now has <b>' + log.length + '</b> queries.',
          parts: [
            { type: 'queue', label: 'SQL sent to the database (oldest to newest)', items: log.slice(), frontLabel: 'first', backLabel: 'latest', hl: hlq },
            { type: 'table', label: 'Orders page in memory', columns: ['order id', 'customer_id', 'customer name'], rows: rows.map(function (r) { return r.slice(); }), hl: hlt },
            { type: 'vars', vals: { 'queries so far': log.length, 'rows on page': n } }
          ]
        });
      }
      frames.push({
        narr: 'Done: <b>' + (n + 1) + ' queries</b> for ' + n + ' rows (1 + N). At about 2 ms per round trip that is ~' + ((n + 1) * 2) + ' ms. With 1,000 rows it would be 1,001 queries. The cost grows with the data.',
        parts: [
          { type: 'queue', label: 'SQL sent to the database', items: log.slice(), frontLabel: 'first', backLabel: 'latest', hl: (function () { var h = {}; for (var k = 1; k < log.length; k++) h[k] = 'bad'; return h; })() },
          { type: 'vars', vals: { 'total queries': n + 1, 'approx time (2ms each)': ((n + 1) * 2) + ' ms' }, hl: { 'total queries': 'bad' } }
        ]
      });
      var full = rows.map(function (r, idx) { return [r[0], r[1], names[r[1] - 1]]; });
      frames.push({
        narr: 'Now the fix. <b>JOIN FETCH</b> (or a plain SQL JOIN) asks for orders and customers together. The database does the matching internally — it is built for that — and returns one result set.',
        parts: [
          { type: 'queue', label: 'SQL sent to the database', items: ['#1 SELECT o.*, c.* FROM orders o JOIN customers c ON c.id=o.customer_id LIMIT ' + n], frontLabel: 'first', backLabel: 'latest', hl: { 0: 'ok' } },
          { type: 'table', label: 'Orders page, customers already loaded', columns: ['order id', 'customer_id', 'customer name'], rows: full, hl: (function () { var h = {}; for (var k = 0; k < n; k++) h[k] = 'ok'; return h; })() },
          { type: 'vars', vals: { 'total queries': 1, 'approx time': '2 ms' }, hl: { 'total queries': 'ok' } }
        ]
      });
      frames.push({
        narr: 'Scoreboard: N+1 = <span class="c-r">' + (n + 1) + ' queries</span>, JOIN = <span class="c-g">1 query</span>, batch fetch (IN list) = <span class="c-g">2 queries</span> no matter how many rows. Rule of thumb: <b>queries per request should not depend on the number of rows.</b>',
        parts: [
          { type: 'table', label: 'Strategy comparison', columns: ['strategy', 'queries for ' + n + ' rows', 'queries for 1,000 rows'], rows: [['N+1 (lazy loop)', n + 1, 1001], ['JOIN FETCH', 1, 1], ['Batch fetch (IN, size 16)', 2, 1 + 63], ['Two queries + group in memory', 2, 2]], hl: { 0: 'bad', 1: 'ok', 2: 'ok', 3: 'ok' } }
        ]
      });
      return frames;
    }
  },
  examples: [
    {
      title: 'Spot it in a SQL log',
      html: `<p>This is what Hibernate prints with <code>show_sql</code> after <code>findAll()</code> on 3 orders. Read it like a detective:</p>
      <pre>select o.id, o.customer_id, o.total from orders o
select c.id, c.name from customers c where c.id=1
select c.id, c.name from customers c where c.id=2
select c.id, c.name from customers c where c.id=3</pre>
      <p><b>Clue:</b> the same statement shape repeats, only the id changes. 3 orders gave 4 queries. If the page shows 200 orders you will see 201. The cure is to change <i>how the parents were loaded</i>, not to make each small query faster.</p>`
    },
    {
      title: 'Fix with JOIN FETCH (and the SQL it produces)',
      html: `<p>In JPQL you write <code>select o from Order o join fetch o.customer</code>. Hibernate turns it into one SQL join and fills the <code>customer</code> field with the real row, so no proxy fires later. Here is the same shape as plain SQL, which you can run:</p>
      <p>Use JOIN FETCH when you <b>always</b> need the relation for every row on that screen. For a many-to-one (order → customer) it is perfectly safe: one customer per order means no duplicated order rows.</p>`,
      code: { lang: 'sql', db: 'shop', code: `SELECT o.id, o.total, c.name, c.city
FROM orders o
JOIN customers c ON c.id = o.customer_id
WHERE o.id <= 5
ORDER BY o.id;` }
    },
    {
      title: 'Fix with batch fetching when you cannot JOIN (collections + paging)',
      html: `<p>Say you page through 20 orders and need each order's <b>items</b> (a one-to-many). A JOIN FETCH on a collection multiplies rows (an order with 3 items appears 3 times) and breaks <code>LIMIT</code>-style paging. Instead set <code>hibernate.default_batch_fetch_size=16</code>. Now when the first order's items are touched, Hibernate loads items for up to 16 pending orders in one go:</p>
      <pre>select * from order_items where order_id in (1,2,3,...,16)
select * from order_items where order_id in (17,18,19,20)</pre>
      <p>20 orders → 1 + 2 = 3 queries instead of 21, and paging still works because the parent query stayed simple.</p>`,
      code: { lang: 'sql', db: 'shop', code: `-- What batch fetching sends for 5 orders: one IN query for all their items
SELECT order_id, COUNT(*) AS item_count, SUM(qty * price) AS items_value
FROM order_items
WHERE order_id IN (1, 2, 3, 4, 5)
GROUP BY order_id
ORDER BY order_id;` }
    },
    {
      title: 'The same disease in Node.js and in microservices',
      html: `<p><b>Sequelize/Prisma:</b> <code>const orders = await prisma.order.findMany(); for (const o of orders) { o.customer = await prisma.customer.findUnique({ where: { id: o.customerId } }); }</code> is N+1. The fix is <code>include: { customer: true }</code> (Prisma runs 2 smart queries) or <code>findMany({ where: { id: { in: ids } } })</code>.</p>
      <p><b>Microservices:</b> an Orders service that calls the Customer service once per order over HTTP is N+1 across the network, with 20-50 ms per hop. The fix is a bulk endpoint: <code>GET /customers?ids=1,2,3</code>.</p>`
    }
  ],
  deepDive: `<p><b>Why does the ORM do this?</b> Hibernate keeps a <i>persistence context</i> (an identity map): one Java object per row id per session. A LAZY association is a <i>proxy</i> object that holds only the id. The first time you call a real method on it, Hibernate checks the context; if the row is not there, it fires <code>SELECT … WHERE id=?</code>. Since the loop touches proxies one by one, the queries come one by one.</p>
  <p><b>Join-fetch traps (the part interviews love):</b></p>
  <ul>
    <li><b>Collection fetch + pagination:</b> <code>join fetch o.items</code> with <code>setMaxResults(20)</code> makes Hibernate load <i>everything</i> and cut the page in memory (warning HHH000104 "firstResult/maxResults specified with collection fetch; applying in memory"). Fix: page the parent ids first, then fetch those parents with their items; or use batch fetching.</li>
    <li><b>MultipleBagFetchException:</b> fetching two <code>List</code> collections in one query is rejected, because the row product (orders × items × tags) is ambiguous. Fix: fetch one collection per query, switch one to a <code>Set</code>, or use batch fetching.</li>
    <li><b>Cartesian explosion:</b> an order with 10 items and 5 tags becomes 50 rows in a double join. Memory and network use explode silently.</li>
  </ul>
  <p><b>Batch fetch size:</b> Hibernate rounds the IN list to sizes it has prepared (e.g. 16, 8, 4, 2, 1) so the SQL text repeats and prepared statement caches stay warm. Typical value is 16–100; bigger lists risk database bind-parameter limits (e.g. 65,535 in PostgreSQL, 2,100 in SQL Server).</p>
  <p><b>Detection in CI:</b> libraries like <code>datasource-proxy</code>, <code>p6spy</code> or Hibernate <code>Statistics</code> let a test assert "this endpoint runs at most 3 queries". A budget test catches regressions the day someone adds a field to the DTO. In Node, Prisma's query events and Sequelize's <code>logging</code> hook do the same. In Django, <code>assertNumQueries</code>.</p>
  <p><b>Other forms:</b> N+1 in GraphQL (each field resolver hits the DB) is fixed with DataLoader, which collects ids in one event-loop tick and issues one batched query. N+1 can also hide in <code>@PostLoad</code> hooks, JSON serializers (Jackson walking a lazy graph), and "audit" listeners.</p>
  <p><b>Counter-view:</b> if the list is always tiny (say 3 rows) and the child is rarely used, the lazy loop is fine. The goal is <i>bounded and predictable</i> query count, not zero lazy loading.</p>`,
  aiEra: `<p><b>What AI changes:</b> AI assistants happily write the naive loop (<code>for order in repo.findAll(): order.getCustomer()…</code>) because it is the shortest, most common code in their training data. It passes unit tests with five rows and fails in production at five thousand. Observability tools with AI summaries can now flag "repeated identical query pattern" automatically, but they still need you to understand the fix.</p>
  <p><b>Use AI as a partner:</b> paste a SQL log or an APM trace and ask <code>Which queries repeat with different parameters, and what code shape produces them?</code> Ask for a query-count test: <code>Write a test that fails if this endpoint runs more than 3 SQL statements.</code> Ask it to explain the generated SQL for a JOIN FETCH.</p>
  <p><b>Where AI goes wrong:</b> it "fixes" N+1 by adding <code>FetchType.EAGER</code> everywhere (which makes every query heavier), applies <code>join fetch</code> to two lists at once (MultipleBagFetchException), or combines collection fetch with paging (in-memory paging). It may also silently change a <code>LEFT JOIN</code> into an inner join and drop parents that have no children.</p>
  <p><b>What you must still own:</b> reading the real SQL log, deciding between JOIN FETCH, batching and DTO projection, setting a query budget per endpoint, and knowing when lazy is fine.</p>`,
  problems: [
    {
      title: 'Cut an order-list endpoint from 101 queries to 2',
      level: 'Medium', tags: ['N+1', 'JPA', 'batch fetching'], companies: ['Amazon', 'Flipkart'],
      statement: `<p>The endpoint <code>GET /orders?status=PAID&amp;size=100</code> loads 100 <code>Order</code> entities and returns a JSON row for each with the <b>customer name</b> and the <b>number of items</b>. In the SQL log you see 1 + 100 + 100 = <b>201 queries</b> per request and p95 latency of 900 ms. The entities are <code>@ManyToOne(LAZY) Customer</code> and <code>@OneToMany List&lt;OrderItem&gt;</code>. Reduce the query count so it no longer depends on the page size and keep paging correct.</p>`,
      constraints: `Page size up to 100, one page per request. Spring Boot 3 + Hibernate 6. You may change the repository and one config property, not the database schema.`,
      example: `<p>Before: <code>select orders</code> (1) + <code>select customer where id=?</code> x100 + <code>select items where order_id=?</code> x100 = ${H.c('r', '201 queries')}.</p><p>After: ${H.c('g', '3 queries')}: orders joined with customer, then items for all orders in one <code>IN</code> query (batch fetching), and the page limit still works.</p>`,
      brute: { why: `<p>Leaving lazy loading as is and "making it faster" with a bigger connection pool or a cache. Each of the 200 extra queries is tiny, so each one is fast; the damage is the <b>count</b> (200 network round trips and 200 pool checkouts). More pool connections just lets 200 queries hit the database harder.</p>` },
      mcq: { q: 'Which fix is safe for BOTH the customer (many-to-one) and the items (one-to-many) when you also need LIMIT 100?', options: ['join fetch on both associations with setMaxResults(100)', 'join fetch the customer, and use batch fetching for the items', 'Switch both associations to FetchType.EAGER', 'Add an index on order_items.order_id only'], answer: 1, explain: `Join fetching a many-to-one is safe (no row multiplication). A fetched collection plus paging makes Hibernate page in memory, so for the items use batch fetching (IN lists). EAGER removes your control, and the index only makes each of the 100 queries faster, not fewer.` },
      hints: [
        `<p>Hint 1: the number of queries should not grow with the page size. Separate the two relations: one is "to-one" (customer), the other is "to-many" (items). They need different fixes.</p>`,
        `<p>Hint 2: a to-one relation can be joined into the parent query with no downside. A to-many relation multiplies rows, which fights with LIMIT, so use batch loading with an IN list.</p>`,
        `<p>Hint 3: recipe: add <code>@EntityGraph(attributePaths = "customer")</code> (or <code>join fetch o.customer</code>) on the repository method; set <code>hibernate.default_batch_fetch_size=50</code>; then verify with a query-count test that the endpoint runs 3 statements for 100 rows and for 10 rows.</p>`
      ],
      solution: {
        approach: `<p><b>Plan:</b> (1) The customer is a to-one relation, so load it with the orders using an entity graph or <code>join fetch</code>: 1 query for the page, with the customer columns included. (2) The items are a to-many relation. Joining them would repeat each order once per item and break paging, so leave them lazy but turn on batch fetching with <code>hibernate.default_batch_fetch_size=50</code> (or <code>@BatchSize(size = 50)</code> on the collection). When the first <code>order.getItems().size()</code> is called, Hibernate loads items for up to 50 pending orders in one <code>where order_id in (…)</code> query; 100 orders means 2 such queries. (3) Total is 1 + 2 = 3 statements, independent of anything except the page size divided by 50. (4) Add a test using <code>datasource-proxy</code> or Hibernate statistics that asserts at most 3 queries for 100 rows, so the regression cannot return. (5) Even better for a read-only list, project to a DTO with a count: <code>select o.id, c.name, count(i) from Order o join o.customer c left join o.items i group by o.id, c.name</code>, which is a single query and needs no entities at all.</p>`,
        code: { lang: 'java', check: false, code: `interface OrderRepo extends JpaRepository<Order, Long> {
    @EntityGraph(attributePaths = {"customer"})          // to-one: safe to join
    Page<Order> findByStatus(String status, Pageable page);
}
// application.yml (items stay lazy, loaded 50 orders at a time):
// spring.jpa.properties.hibernate.default_batch_fetch_size: 50` },
        complexity: `<p>Queries per request: 1 (page + count may add 1) + ceil(pageSize / 50) for items = about 3-4, versus 1 + 2N before. Memory is O(page size).</p>`,
        followUps: ['How would a single DTO query with GROUP BY compare?', 'What breaks if you also join fetch o.items with Pageable?']
      }
    }
  ]
});
topics.push({
  title: 'Eager vs Lazy Loading (and LazyInitializationException)',
  analogy: `<p>You order a hotel room. <b>Eager</b> is like the hotel loading your room with the minibar, the spa voucher, the gym pass, and breakfast for four days — whether you want them or not. <b>Lazy</b> is like getting only the room key, and asking the front desk for anything else when you need it. Lazy saves effort — but the front desk only helps you <i>while you are still checked in</i>. Once you check out (the database session closes), asking for the spa voucher gives you an error instead of a voucher.</p>`,
  explain: `<p>When you load an entity, its relations (customer, items, tags…) can be loaded in two ways:</p>
  ${H.table(['', 'EAGER', 'LAZY'], [
    ['When related data loads', 'Immediately, together with the parent', 'Only on first access (a proxy placeholder is used)'],
    ['Cost if you never use it', '<span class="c-r">Paid every time</span>', '<span class="c-g">Zero</span>'],
    ['Risk', 'Huge joins, hidden N+1 on queries, slow startup of every query', 'LazyInitializationException, hidden N+1 in loops'],
    ['Needs open session?', 'No (already loaded)', '<span class="c-r">Yes</span> — the first touch must happen inside the transaction/session']
  ])}
  <p><b>JPA defaults to remember:</b> <code>@ManyToOne</code> and <code>@OneToOne</code> are <b>EAGER</b> by default; <code>@OneToMany</code> and <code>@ManyToMany</code> are <b>LAZY</b>. The common professional advice: <b>make every association LAZY</b> (<code>fetch = FetchType.LAZY</code>) and load exactly what each use case needs with JOIN FETCH, entity graphs, or DTO queries. Eager is a global decision that cannot be turned off per query; lazy is a default you can override per query.</p>
  <p><b>LazyInitializationException</b> ("could not initialize proxy - no Session") happens when you touch a lazy relation <i>after</i> the transaction ended — typically in the controller or the JSON serializer. Fixes, best first:</p>
  <ol>
    <li><b>Load what you need inside the service</b> (JOIN FETCH / <code>@EntityGraph</code>) and return a <b>DTO</b>, not the entity.</li>
    <li>Map entity → DTO inside the <code>@Transactional</code> method so lazy touches happen while the session is open.</li>
    <li>Use <code>Hibernate.initialize(order.getItems())</code> for one-off needs.</li>
    <li>Avoid "fixing" it by turning on EAGER everywhere or by leaning on Open-Session-In-View.</li>
  </ol>
  <p><b>Open Session In View (OSIV)</b> keeps the Hibernate session open for the whole web request so the controller/serializer can still lazy-load. Spring Boot enables it by default (with a startup warning) and many teams turn it off: it holds a database connection during view rendering and hides N+1 queries in places you cannot see them.</p>`,
  clues: [
    '"Could not initialize proxy - no Session" or <code>LazyInitializationException</code> in a controller or JSON response',
    '"A simple findById joins five tables" — somebody marked associations EAGER',
    '"Why does fetching one customer load all their orders, and each order\'s items?" — eager chains',
    '"Should relationships be lazy or eager?" — answer: lazy by default, fetch per use case',
    'Spring Boot warning: <code>spring.jpa.open-in-view is enabled by default</code>',
    '"Connection pool exhausted while the response is being serialized" — OSIV holding connections'
  ],
  code: [
    { lang: 'java', check: false, title: 'JPA fetch defaults and the safe pattern', code: `@Entity
class Order {
    @Id Long id;

    // @ManyToOne defaults to EAGER - always override it to LAZY.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id")
    Customer customer;

    // @OneToMany is LAZY by default - state it anyway so readers know.
    @OneToMany(mappedBy = "order", fetch = FetchType.LAZY)
    List<OrderItem> items = new ArrayList<>();
}

@Service
class OrderService {
    private final OrderRepo repo;
    OrderService(OrderRepo repo) { this.repo = repo; }

    // The transaction is OPEN inside this method: lazy touches are legal here.
    @Transactional(readOnly = true)
    public OrderView view(Long id) {
        Order o = repo.findWithCustomerAndItems(id);   // join fetch / entity graph
        // Map to a plain DTO BEFORE leaving the transaction.
        return new OrderView(o.getId(), o.getCustomer().getName(), o.getItems().size());
    }
}

// The controller only ever sees OrderView (no proxies, no session needed).
record OrderView(Long id, String customerName, int itemCount) {}` },
    { lang: 'js', run: true, title: 'Runnable: a lazy proxy that dies when the session closes', code: `// Simulates what Hibernate does: a proxy that loads on first touch,
// but only while the "session" is still open.
function Session() { this.open = true; this.queries = []; }
Session.prototype.load = function (sql) { this.queries.push(sql); };
Session.prototype.close = function () { this.open = false; };

function LazyCustomer(session, id) {
  var loaded = null;
  return {
    getName: function () {
      if (loaded) return loaded;
      if (!session.open) throw new Error('LazyInitializationException: could not initialize proxy [Customer#' + id + '] - no Session');
      session.load('SELECT * FROM customers WHERE id=' + id);   // the hidden query
      loaded = 'Asha';
      return loaded;
    }
  };
}

// Case 1: touched inside the transaction - works, one hidden query
var s1 = new Session();
var c1 = LazyCustomer(s1, 1);
console.log('inside tx  ->', c1.getName(), '| queries:', s1.queries.length);
s1.close();

// Case 2: returned to the controller, touched after close - explodes
var s2 = new Session();
var c2 = LazyCustomer(s2, 2);
s2.close();                       // transaction ended, entity "detached"
try { c2.getName(); } catch (e) { console.log('after close ->', e.message); }

// Case 3: the fix - copy what you need into a plain object BEFORE closing
var s3 = new Session();
var c3 = LazyCustomer(s3, 3);
var dto = { customerName: c3.getName() };   // inside the session
s3.close();
console.log('DTO fix    ->', dto.customerName, '(no proxy, no session needed)');` },
    { lang: 'sql', db: 'shop', title: 'Runnable SQL: what an EAGER chain costs', code: `-- If Customer -> Order -> OrderItem were all EAGER, loading customers would
-- JOIN all three tables. Look at how many ROWS that single read produces:
SELECT COUNT(*) AS joined_rows,
       COUNT(DISTINCT c.id) AS customers,
       COUNT(DISTINCT o.id) AS orders
FROM customers c
JOIN orders o ON o.customer_id = c.id
JOIN order_items i ON i.order_id = o.id;

-- The lazy alternative: load only the 5 customer rows you actually need
SELECT id, name, city FROM customers ORDER BY id;` }
  ],
  codeTitle: ['Fetch defaults + safe DTO pattern', 'Lazy proxy lifecycle (runnable)', 'Eager chain cost (runnable SQL)'],
  viz: {
    title: 'Lazy vs eager vs "session already closed"',
    input: 'lazy',
    inputLabel: 'Mode: lazy, eager, or closed',
    gen: function (input) {
      var mode = String(input).trim().toLowerCase();
      if (['lazy', 'eager', 'closed'].indexOf(mode) < 0) throw new Error('Type one of: lazy, eager, closed');
      var nodes = [
        { id: 'C', label: 'Controller', x: 10, y: 25, shape: 'box' },
        { id: 'S', label: 'Service (@Transactional)', x: 36, y: 25, shape: 'box', w: 22 },
        { id: 'H', label: 'Hibernate Session', x: 64, y: 25, shape: 'box', w: 20 },
        { id: 'D', label: 'Database', x: 90, y: 25, shape: 'box' }
      ];
      var edges = [['C', 'S'], ['S', 'H'], ['H', 'D']];
      function g(ehl, hl, tags) { return { type: 'graph', directed: true, height: 50, nodes: nodes, edges: edges, ehl: ehl || {}, hl: hl || {}, tags: tags || {} }; }
      var frames = [];
      if (mode === 'eager') {
        frames.push({ narr: 'The controller asks the service for <b>order 1</b>. The mapping says <code>customer</code> and <code>items</code> are <b>EAGER</b>.', parts: [g({ 'C-S': 'cur' }, { C: 'cur' }), { type: 'vars', vals: { 'order.customer': 'not loaded', 'order.items': 'not loaded' } }] });
        frames.push({ narr: 'The session runs <b>one big JOIN</b> (orders + customers + order_items) because eager means "always bring everything".', parts: [g({ 'S-H': 'cur', 'H-D': 'cur' }, { H: 'cur' }), { type: 'table', label: 'Queries', columns: ['#', 'SQL'], rows: [[1, 'SELECT … FROM orders o JOIN customers c … LEFT JOIN order_items i … WHERE o.id=1']] }, { type: 'vars', vals: { 'order.customer': 'loaded', 'order.items': 'loaded (3 rows)' }, hl: { 'order.customer': 'ok', 'order.items': 'ok' } }] });
        frames.push({ narr: 'The service only needed the <b>order total</b>. The customer and items were loaded for nothing. Multiply by every endpoint that touches <code>Order</code> and you get slow queries everywhere.', parts: [g({ 'C-S': 'ok' }, { S: 'sel' }), { type: 'vars', vals: { 'columns fetched': 24, 'columns used': 2 }, hl: { 'columns fetched': 'bad', 'columns used': 'ok' } }] });
        frames.push({ narr: '<b>Verdict:</b> eager is simple and has no LazyInitializationException, but it is a <span class="c-r">global tax</span>: you pay for relations on every query and cannot switch it off per use case. Prefer lazy + explicit fetching.', parts: [g({}, { H: 'bad' }), { type: 'text', html: '<b>Rule:</b> LAZY by default; fetch per use case.' }] });
      } else {
        frames.push({ narr: 'The controller asks the service for <b>order 1</b>. Associations are <b>LAZY</b>.', parts: [g({ 'C-S': 'cur' }, { C: 'cur' }), { type: 'vars', vals: { 'order.customer': 'not loaded', 'session': 'closed' } }] });
        frames.push({ narr: 'The transaction starts, a session opens, and <b>only the order row</b> is selected. <code>order.customer</code> becomes a <b>proxy</b> that knows just the id.', parts: [g({ 'S-H': 'cur', 'H-D': 'cur' }, { H: 'cur' }), { type: 'table', label: 'Queries', columns: ['#', 'SQL'], rows: [[1, 'SELECT * FROM orders WHERE id=1']] }, { type: 'vars', vals: { 'order.customer': 'proxy(id=1, uninitialized)', 'session': 'OPEN' }, hl: { session: 'ok' } }] });
        if (mode === 'lazy') {
          frames.push({ narr: 'Inside the service, <code>order.getCustomer().getName()</code> is called. The proxy asks the <b>still-open</b> session, which runs a second query.', parts: [g({ 'S-H': 'cur', 'H-D': 'cur' }, { H: 'cur' }), { type: 'table', label: 'Queries', columns: ['#', 'SQL'], rows: [[1, 'SELECT * FROM orders WHERE id=1'], [2, 'SELECT * FROM customers WHERE id=1']], hl: { 1: 'ok' } }, { type: 'vars', vals: { 'order.customer': 'loaded: Asha', 'session': 'OPEN' }, hl: { 'order.customer': 'ok' } }] });
          frames.push({ narr: 'The service copies the name into a <b>DTO</b>, the transaction commits and the session closes. The controller receives a plain object — nothing lazy is left to explode.', parts: [g({ 'S-H': 'ok', 'C-S': 'ok' }, { C: 'ok' }), { type: 'vars', vals: { 'DTO': '{ id: 1, customerName: Asha }', 'session': 'closed' }, hl: { DTO: 'ok' } }] });
          frames.push({ narr: '<b>Result:</b> 2 small queries, exactly what was needed. Next step in real code: turn those two into one with JOIN FETCH if every call needs the customer.', parts: [g({}, {}), { type: 'text', html: '<b>Lazy + DTO inside the transaction = predictable.</b>' }] });
        } else {
          frames.push({ narr: 'The service did not touch the customer. It commits, the session <b>closes</b>, and it returns the <b>entity</b> (not a DTO) to the controller.', parts: [g({ 'S-H': 'done', 'C-S': 'cur' }, { C: 'cur' }), { type: 'vars', vals: { 'order.customer': 'proxy(id=1, uninitialized)', 'session': 'CLOSED' }, hl: { session: 'bad' } }] });
          frames.push({ narr: 'Jackson (the JSON serializer) walks the entity and calls <code>getCustomer().getName()</code>. The proxy looks for its session… and it is gone.', parts: [g({ 'C-S': 'bad' }, { H: 'bad', C: 'bad' }), { type: 'vars', vals: { 'proxy asks session': 'no session', 'result': 'LazyInitializationException' }, hl: { result: 'bad' } }] });
          frames.push({ narr: '<b>Fixes:</b> (1) return a DTO built inside the transaction, (2) JOIN FETCH the customer in the service query, (3) as a last resort keep the session open for the whole request (OSIV), which hides problems and holds a connection longer.', parts: [g({}, { S: 'ok' }), { type: 'text', html: '<b>Do not "fix" it by making everything EAGER.</b>' }] });
        }
      }
      return frames;
    }
  },
  examples: [
    {
      title: 'The JPA defaults cheat sheet',
      html: `${H.table(['Annotation', 'Default fetch', 'What to do'], [
        ['<code>@ManyToOne</code>', '<span class="c-r">EAGER</span>', 'Set <code>fetch = LAZY</code> explicitly'],
        ['<code>@OneToOne</code>', '<span class="c-r">EAGER</span>', 'Set LAZY (owner side proxies work; inverse side often cannot be lazy without tricks)'],
        ['<code>@OneToMany</code>', '<span class="c-g">LAZY</span>', 'Keep LAZY; fetch per query'],
        ['<code>@ManyToMany</code>', '<span class="c-g">LAZY</span>', 'Keep LAZY; use Set to avoid bag issues']
      ])}
      <p>Interview shortcut: "<b>to-one is eager, to-many is lazy, and I override to-one to lazy.</b>"</p>`
    },
    {
      title: 'Reproduce and fix LazyInitializationException',
      html: `<p><b>Bug:</b> the service returns an <code>Order</code> entity. The controller serializes it and Jackson calls <code>getItems()</code> after the transaction ended → exception.</p>
      <p><b>Fix A (best):</b> return an <code>OrderView</code> DTO built inside the <code>@Transactional</code> method (see the main code sample). <b>Fix B:</b> a repository method with <code>@EntityGraph(attributePaths = "items")</code> so the items are already loaded when the entity leaves. <b>Fix C:</b> <code>Hibernate.initialize(order.getItems())</code> inside the service when only one endpoint needs it.</p>`,
      code: { lang: 'java', check: false, code: `@Transactional(readOnly = true)
public Order loadWithItems(Long id) {
    Order o = repo.findById(id).orElseThrow();
    Hibernate.initialize(o.getItems());   // forces the lazy load while the session is open
    return o;                             // items are now usable after the session closes
}` }
    },
    {
      title: 'Open Session In View: convenient, but a trap',
      html: `<p>With OSIV on (Spring Boot default), the session stays open until the response is written. That "fixes" lazy errors in controllers, but: (1) a database connection is held while Jackson serializes and while the slow client downloads, so a small pool starves; (2) N+1 queries now happen in the JSON layer where nobody looks; (3) behaviour differs between a test (no web request) and production.</p>
      <p>Most production teams set <code>spring.jpa.open-in-view=false</code> and fix the errors the right way (DTOs / fetch plans). Do it early in a project; retrofitting it into a big app is painful.</p>`,
      code: { lang: 'yaml', title: 'application.yml', code: `spring:
  jpa:
    open-in-view: false            # no hidden lazy loading in controllers/serializers
    properties:
      hibernate:
        default_batch_fetch_size: 50   # safety net for accidental lazy collections
  datasource:
    url: jdbc:postgresql://db:5432/shop
    username: shop_app
    password: \${DB_PASSWORD}        # injected from the environment, never committed` }
    },
    {
      title: 'Lazy in other stacks: Prisma and Sequelize have no hidden lazy loading',
      html: `<p>In Prisma, relations are <b>never</b> loaded unless you ask: <code>prisma.order.findMany({ include: { customer: true } })</code>. You cannot trip over a lazy proxy — but you can still write an N+1 by calling <code>findUnique</code> in a loop. In Sequelize <code>include</code> does the join; its default is also "not loaded". The lesson is the same everywhere: <b>decide, per use case, which relations to load.</b></p>`
    }
  ],
  deepDive: `<p><b>How proxies work:</b> Hibernate generates a subclass of your entity (ByteBuddy) that overrides every method. The first call checks "am I initialized?". If not, it asks the session to load by id. That is why entity classes must not be <code>final</code>, why <code>equals/hashCode</code> should not touch lazy fields, and why <code>==</code> comparisons with proxies can surprise you (use <code>Hibernate.unproxy</code> or compare ids).</p>
  <p><b>Lazy to-one on the inverse side:</b> for <code>@OneToOne(mappedBy=…)</code> Hibernate cannot know whether the other row exists without querying, so it must load eagerly (or use bytecode enhancement / <code>@MapsId</code> to share the primary key). A common hidden N+1: a "lazy" one-to-one that is secretly eager. Check the SQL.</p>
  <p><b>Eager has two flavours:</b> with <code>em.find()</code> Hibernate joins eager associations in one SQL; with a JPQL/Criteria query it <i>ignores the annotation</i> for the join and fires extra selects afterwards — so eager can cause N+1 on queries and wide joins on find. That is why "eager is simpler" is a trap.</p>
  <p><b>Entity graphs</b> (<code>@EntityGraph</code>, <code>fetch graph</code> vs <code>load graph</code>) override the mapping per call: a fetch graph treats everything not listed as lazy; a load graph keeps the mapped defaults for non-listed attributes.</p>
  <p><b>Detached entities and <code>open-in-view</code> in other frameworks:</b> Hibernate's session-per-request pattern exists in other ORMs; in Django, lazy querysets evaluate on first iteration, and a "connection closed" never appears because connections are per-thread. In Entity Framework, lazy loading proxies exist but are opt-in.</p>
  <p><b>Production reality:</b> the two things that bite are (1) JSON serialization of entities (always map to DTOs; also avoids exposing columns by accident and infinite recursion on bidirectional links), and (2) caching entities (second-level cache) with lazy relations. A stable architecture: <i>entities stay inside the service layer; DTOs cross the boundary</i>.</p>`,
  aiEra: `<p><b>What AI changes:</b> assistants frequently "solve" a <code>LazyInitializationException</code> pasted from a stack trace by adding <code>fetch = FetchType.EAGER</code> or <code>@Transactional</code> on the controller, because that makes the red text vanish fastest. Static analysis and AI review bots can now flag EAGER on to-many and entities returned from controllers.</p>
  <p><b>Use AI as a partner:</b> ask <code>Show me which associations in these entities are effectively EAGER and why</code>; ask it to generate DTO records and mapper code (boring and mechanical, ideal for AI); ask <code>Draft an entity graph for the order details screen based on this DTO</code> and then check the SQL.</p>
  <p><b>Where AI goes wrong:</b> it puts <code>@Transactional</code> on the controller (holding connections during HTTP work), returns entities from REST endpoints, or forgets that <code>@ManyToOne</code> defaults to eager. It may also propose OSIV as the solution.</p>
  <p><b>What you must still own:</b> the rule "entities never leave the service layer", the fetch plan for each use case, and verifying with the SQL log that the fix did not just move the problem.</p>`,
  problems: [
    {
      title: 'Fix LazyInitializationException without using EAGER',
      level: 'Easy', tags: ['lazy loading', 'JPA', 'DTO'], companies: ['Infosys', 'TCS'],
      statement: `<p>A Spring Boot endpoint <code>GET /customers/{id}</code> returns a <code>Customer</code> entity that has a lazy <code>List&lt;Order&gt; orders</code>. Jackson throws <code>LazyInitializationException: failed to lazily initialize a collection of role Customer.orders</code>. A teammate proposes changing the mapping to <code>FetchType.EAGER</code>. Explain why that is a bad idea and fix the endpoint properly.</p>`,
      constraints: `Open-in-view is disabled. The response must contain the customer name and the <b>count</b> of orders only. Customers can have thousands of orders.`,
      example: `<p>Input: customer 1 (Asha). Expected JSON: <code>{"id":1,"name":"Asha","orderCount":6}</code>.</p><p>${H.c('r', 'EAGER')} would load all 6 (or 6,000) orders every time any Customer is loaded anywhere. ${H.c('g', 'DTO with count')} loads a number.</p>`,
      brute: { why: `<p>Setting <code>EAGER</code>: it silences the exception but every query that loads a <code>Customer</code> (login, order page, admin list) now also loads all their orders. A customer with 5,000 orders becomes a 5,000-row read on each access, and eager chains can join further tables.</p>` },
      mcq: { q: 'The screen only needs the number of orders per customer. What is the best way to get it?', options: ['Initialize the orders collection and call size()', 'A count query or a DTO query with COUNT/GROUP BY', 'Change the collection to EAGER', 'Turn on Open Session In View'], answer: 1, explain: 'Loading thousands of rows only to call size() wastes memory and time. Ask the database to count: select count(o) from Order o where o.customer.id = :id. A DTO/projection query returns just the numbers needed.' },
      hints: [
        `<p>Hint 1: ask what data the screen really needs. If it is a name and a number, do you need the whole Order list in memory?</p>`,
        `<p>Hint 2: do the work inside a read-only transaction in the service, and return a record (DTO), never the entity.</p>`,
        `<p>Hint 3: recipe: add a repository query <code>select new CustomerView(c.id, c.name, count(o)) from Customer c left join c.orders o where c.id = :id group by c.id, c.name</code>; the controller returns the record; no lazy collection is touched.</p>`
      ],
      solution: {
        approach: `<p><b>Why EAGER is wrong:</b> it is a global setting. Every unrelated query that loads a Customer will also load all their orders (and anything eager beyond), turning cheap lookups into big reads, and it can still cause N+1 when the entity is loaded through JPQL. <b>Right fix:</b> decide what the use case needs (name + order count) and fetch exactly that. Create a DTO record <code>CustomerView(Long id, String name, long orderCount)</code> and a repository projection query that joins and counts in the database. The service method is <code>@Transactional(readOnly = true)</code> and returns the DTO, so there is no lazy proxy outside the transaction. If you needed the actual order rows, use a second, paged query (<code>findByCustomerId(id, pageable)</code>) rather than loading the collection. Keep <code>open-in-view=false</code> so the mistake cannot return silently. Add an integration test that fetches a customer with 1,000 orders and asserts only one SQL statement ran.</p>`,
        code: { lang: 'java', check: false, code: `record CustomerView(Long id, String name, long orderCount) {}

interface CustomerRepo extends JpaRepository<Customer, Long> {
    @Query("select new com.shop.CustomerView(c.id, c.name, count(o)) " +
           "from Customer c left join c.orders o where c.id = :id group by c.id, c.name")
    Optional<CustomerView> viewById(@Param("id") Long id);
}` },
        complexity: `<p>One query; database does COUNT using the index on <code>orders.customer_id</code>. Memory O(1) instead of O(orders).</p>`,
        followUps: ['What if the screen needs the 10 latest orders as well?', 'How would you test that no extra queries run?']
      }
    }
  ]
});
topics.push({
  title: 'Connection Pooling and HikariCP Sizing',
  analogy: `<p>A busy restaurant has 10 tables, not 500. Guests (requests) arrive, sit at a free table, eat, and leave; the next guest takes the same table. Building a brand-new table for every guest (opening a database connection) would be slow, and a kitchen (the database) can only cook for so many tables at once. If you add 200 tables the kitchen does <i>not</i> cook faster — everyone just trips over each other. A <b>connection pool</b> is the fixed set of tables; a small, well-chosen number beats a huge one.</p>`,
  explain: `<p><b>Why a pool?</b> Opening a database connection is expensive: TCP handshake, TLS, login, session setup — often 20–100 ms, and on PostgreSQL each connection is a separate OS process using several MB of memory. A pool opens connections once, keeps them, and <b>lends</b> them: <code>getConnection()</code> borrows, <code>close()</code> gives it back (it does not really close). <b>HikariCP</b> is the default pool in Spring Boot because it is small and fast.</p>
  <p><b>The settings that matter (HikariCP):</b></p>
  ${H.table(['Setting', 'Default', 'Plain meaning'], [
    ['<code>maximumPoolSize</code>', '10', 'Max connections borrowed + idle. The most important number.'],
    ['<code>minimumIdle</code>', 'same as max', 'Keep this many idle ready. Leave default (fixed-size pool) for steady load.'],
    ['<code>connectionTimeout</code>', '30 s', 'How long a thread waits for a free connection before an exception. Lower it (2–5 s) so users get a fast error instead of a hang.'],
    ['<code>maxLifetime</code>', '30 min', 'Retire connections after this age. Must be <b>shorter</b> than any database/proxy/firewall timeout.'],
    ['<code>idleTimeout</code>', '10 min', 'Only applies when minimumIdle &lt; max.'],
    ['<code>keepaliveTime</code>', 'off', 'Ping idle connections so firewalls do not silently drop them.'],
    ['<code>leakDetectionThreshold</code>', 'off', 'Log a stack trace if a connection is held longer than this (e.g. 10 s). Finds forgotten <code>close()</code>.']
  ])}
  <p><b>How big should the pool be?</b> Counter-intuitive truth: <b>smaller than you think.</b> A database with 8 cores can truly run only ~8 queries at a time; extra connections just queue inside the database and add context-switching. The HikariCP guide (from the PostgreSQL community) suggests a start of <code>connections ≈ (cores × 2) + effective disk spindles</code> — about 17 for an 8-core server — for the <i>whole</i> database, shared by all app instances.</p>
  <p><b>Little's Law</b> gives a practical per-service number: <code>connections in use = requests per second × seconds each request holds a connection</code>.</p>
  ${H.table(['Requests/s', 'Hold time', 'Connections busy on average', 'Pool with headroom'], [
    ['100', '20 ms', '100 × 0.02 = <b>2</b>', '~4–5'],
    ['500', '20 ms', '500 × 0.02 = <b>10</b>', '~15–20'],
    ['500', '200 ms (slow query)', '500 × 0.2 = <b>100</b>', '<span class="c-r">pool or query is the problem</span>']
  ])}
  <p>If the answer is "100 connections", the fix is rarely a bigger pool — it is <b>shorter hold times</b> (fix the slow query, do not call other services inside a transaction) or a cache. And remember: <b>total = instances × pool size</b> must stay under the database's <code>max_connections</code>. Ten pods × 20 = 200 connections.</p>`,
  clues: [
    '"HikariPool-1 - Connection is not available, request timed out after 30000ms" — pool starved',
    '"Too many connections" / <code>FATAL: remaining connection slots are reserved</code> — instances × pool &gt; max_connections',
    '"We scaled to 20 pods and the database fell over" — pool size multiplies with pods',
    '"What pool size would you use?" — expect Little\'s Law + cores-based reasoning, not "100"',
    '"Latency spikes under load but database CPU is low" — requests are waiting for a connection, not for the DB',
    '"Connection reset" after idle hours — <code>maxLifetime</code> longer than a firewall/proxy timeout'
  ],
  code: [
    { lang: 'java', check: false, title: 'HikariCP configuration (Java, secrets from environment)', code: `import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;

class Db {
    static HikariDataSource create() {
        HikariConfig cfg = new HikariConfig();
        cfg.setJdbcUrl(System.getenv("DB_URL"));          // e.g. jdbc:postgresql://db:5432/shop
        cfg.setUsername(System.getenv("DB_USER"));
        cfg.setPassword(System.getenv("DB_PASSWORD"));     // never hardcode credentials

        cfg.setMaximumPoolSize(10);          // the most important knob; start small
        cfg.setMinimumIdle(10);              // fixed-size pool = predictable behaviour
        cfg.setConnectionTimeout(3_000);     // fail fast: 3 s, not the default 30 s
        cfg.setMaxLifetime(25 * 60_000);     // below DB/proxy idle limits (e.g. 30 min)
        cfg.setKeepaliveTime(5 * 60_000);    // ping idle connections
        cfg.setLeakDetectionThreshold(10_000); // log stack trace if held more than 10 s
        cfg.setPoolName("orders-pool");
        return new HikariDataSource(cfg);
    }
}` },
    { lang: 'yaml', title: 'Spring Boot application.yml', code: `spring:
  datasource:
    url: \${DB_URL}
    username: \${DB_USER}
    password: \${DB_PASSWORD}
    hikari:
      maximum-pool-size: 10
      minimum-idle: 10
      connection-timeout: 3000      # ms
      max-lifetime: 1500000         # 25 min in ms
      keepalive-time: 300000        # 5 min in ms
      leak-detection-threshold: 10000
      pool-name: orders-pool` },
    { lang: 'java', title: 'Pool-size maths (Little\'s Law and the cores rule)', code: `class PoolMath {
    /** Average number of connections busy at once = arrival rate x hold time. */
    static double busyConnections(double requestsPerSecond, double holdMillis) {
        return requestsPerSecond * (holdMillis / 1000.0);
    }

    /** Add headroom for bursts (2x) and round up; never below 2. */
    static int suggestedPool(double requestsPerSecond, double holdMillis) {
        return Math.max(2, (int) Math.ceil(busyConnections(requestsPerSecond, holdMillis) * 2));
    }

    /** The classic database-wide ceiling: cores * 2 + effective spindles (use 1 for SSD). */
    static int databaseCeiling(int dbCores, int spindles) {
        return dbCores * 2 + spindles;
    }

    /** Pool each app instance may use so the fleet stays under the DB limit. */
    static int perInstance(int dbMaxConnections, int reserved, int instances) {
        return Math.max(1, (dbMaxConnections - reserved) / instances);
    }

    public static void main(String[] args) {
        System.out.println("busy = " + busyConnections(300, 15));            // 4.5
        System.out.println("pool = " + suggestedPool(300, 15));              // 9
        System.out.println("db ceiling = " + databaseCeiling(8, 1));         // 17
        System.out.println("per pod = " + perInstance(100, 10, 6));          // 15
    }
}` },
    { lang: 'js', run: true, title: 'Runnable: a tiny pool simulator (waiting and timeouts)', code: `// Each tick, "arrivals" requests arrive. A request needs a connection for "hold" ticks.
// If no connection is free it waits; if it waits longer than "timeout" it fails.
function simulate(pool, hold, arrivals, ticks, timeout) {
  var free = [], conns = [], waiting = [], served = 0, failed = 0, next = 1;
  for (var i = 0; i < pool; i++) conns.push({ until: 0, req: 0 });
  for (var t = 0; t < ticks; t++) {
    conns.forEach(function (c) { if (c.req && c.until <= t) { c.req = 0; served++; } });
    for (var a = 0; a < arrivals; a++) waiting.push({ id: next++, since: t });
    waiting = waiting.filter(function (w) { if (t - w.since > timeout) { failed++; return false; } return true; });
    conns.forEach(function (c) { if (!c.req && waiting.length) { var w = waiting.shift(); c.req = w.id; c.until = t + hold; } });
    var busy = conns.filter(function (c) { return c.req; }).length;
    console.log('t=' + t + ' busy=' + busy + '/' + pool + ' waiting=' + waiting.length + ' failed=' + failed);
  }
  return { served: served, failed: failed, stillWaiting: waiting.length };
}
console.log('--- pool=3, each request holds 3 ticks, 2 arrive per tick, timeout 2 ---');
console.log(simulate(3, 3, 2, 8, 2));
console.log('--- same load, pool=6 ---');
console.log(simulate(6, 3, 2, 8, 2));` },
    { lang: 'sql', check: false, title: 'PostgreSQL: how many connections are actually in use?', code: `-- Limit configured on the server
SHOW max_connections;

-- Who is connected and what are they doing right now?
SELECT state, count(*)
FROM pg_stat_activity
WHERE datname = 'shop'
GROUP BY state;
-- 'idle in transaction' piling up = code holding connections while doing other work` }
  ],
  codeTitle: ['HikariCP in Java', 'HikariCP in Spring Boot YAML', 'Pool-size maths (Java)', 'Pool simulator (runnable)', 'Inspect live connections (PostgreSQL)'],
  viz: {
    title: 'Connection pool: busy, idle, waiting, timed out',
    input: 'pool=3 hold=3 arrivals=2 ticks=9 timeout=2',
    inputLabel: 'pool, hold (ticks a request keeps a connection), arrivals per tick, ticks (max 12), timeout (ticks a request may wait)',
    gen: function (input) {
      var p = { pool: 3, hold: 3, arrivals: 2, ticks: 9, timeout: 2 }, m, re = /(\w+)\s*=\s*(\d+)/g, s = String(input);
      while ((m = re.exec(s))) { if (p[m[1]] !== undefined) p[m[1]] = parseInt(m[2], 10); }
      if (p.pool < 1 || p.pool > 6) throw new Error('pool must be 1-6');
      if (p.hold < 1 || p.hold > 6) throw new Error('hold must be 1-6');
      if (p.arrivals < 0 || p.arrivals > 4) throw new Error('arrivals must be 0-4');
      if (p.ticks < 4 || p.ticks > 12) throw new Error('ticks must be 4-12');
      if (p.timeout < 0 || p.timeout > 6) throw new Error('timeout must be 0-6');
      var conns = [], hist = [], waiting = [], failed = [], served = 0, next = 1, c, t, a;
      for (c = 0; c < p.pool; c++) { conns.push({ req: 0, until: 0 }); hist.push([]); }
      var frames = [], colHead = [], rowHead = [];
      for (t = 0; t < p.ticks; t++) colHead.push('t' + t);
      for (c = 0; c < p.pool; c++) rowHead.push('conn ' + (c + 1));
      for (t = 0; t < p.ticks; t++) {
        var finished = [], newly = [], timedNow = [];
        conns.forEach(function (cn) { if (cn.req && cn.until <= t) { finished.push('R' + cn.req); cn.req = 0; served++; } });
        for (a = 0; a < p.arrivals; a++) waiting.push({ id: next++, since: t });
        waiting = waiting.filter(function (w) { if (t - w.since > p.timeout) { failed.push('R' + w.id); timedNow.push('R' + w.id); return false; } return true; });
        conns.forEach(function (cn, ci) { if (!cn.req && waiting.length) { var w = waiting.shift(); cn.req = w.id; cn.until = t + p.hold; newly.push(ci); } });
        conns.forEach(function (cn, ci) { hist[ci][t] = cn.req ? 'R' + cn.req : 'idle'; });
        var hl = {}, rows = [], ci2, tt;
        for (ci2 = 0; ci2 < p.pool; ci2++) {
          var row = [];
          for (tt = 0; tt < p.ticks; tt++) {
            row.push(tt <= t ? hist[ci2][tt] : '');
            if (tt <= t) hl[ci2 + ',' + tt] = hist[ci2][tt] === 'idle' ? 'done' : (tt === t && newly.indexOf(ci2) >= 0 ? 'ok' : 'cur');
          }
          rows.push(row);
        }
        var busy = conns.filter(function (cn) { return cn.req; }).length;
        var note = 'Tick <b>' + t + '</b>: ' + p.arrivals + ' new request(s) arrive. ';
        if (finished.length) note += finished.join(', ') + ' finished and returned the connection. ';
        if (newly.length) note += 'Free connection(s) lent to waiting requests. ';
        if (timedNow.length) note += '<span class="c-r">' + timedNow.join(', ') + ' waited too long: "connection is not available, request timed out".</span> ';
        note += 'Busy <b>' + busy + '/' + p.pool + '</b>, waiting <b>' + waiting.length + '</b>.';
        frames.push({
          narr: note,
          parts: [
            { type: 'grid', label: 'Connections over time (green = just lent, amber = in use, faded = idle)', rows: rows, rowHead: rowHead, colHead: colHead, hl: hl },
            { type: 'queue', label: 'Threads waiting for a connection', items: waiting.map(function (w) { return 'R' + w.id + ' (waited ' + (t - w.since) + ')'; }), frontLabel: 'next to get one', backLabel: 'newest', hl: (function () { var h = {}; waiting.forEach(function (w, i) { if (t - w.since >= p.timeout) h[i] = 'bad'; }); return h; })() },
            { type: 'vars', vals: { busy: busy + '/' + p.pool, waiting: waiting.length, 'timed out': failed.length, served: served }, hl: { 'timed out': failed.length ? 'bad' : 'ok' } }
          ]
        });
      }
      var load = p.arrivals * p.hold;
      frames.push({
        narr: 'Reading the result: demand is arrivals x hold = <b>' + load + '</b> connections busy on average (Little\'s Law), and the pool has <b>' + p.pool + '</b>. ' + (load > p.pool ? '<span class="c-r">Demand is higher than the pool, so the waiting line grows and requests time out. A bigger pool only helps if the database can really run that many queries; usually the cure is shorter hold time.</span>' : '<span class="c-g">The pool covers the demand; waits stay short.</span>'),
        parts: [{ type: 'vars', vals: { 'demand (arrivals x hold)': load, 'pool size': p.pool, 'timed out': failed.length }, hl: { 'timed out': failed.length ? 'bad' : 'ok' } }]
      });
      return frames;
    }
  },
  examples: [
    {
      title: 'Size a pool with Little\'s Law',
      html: `<p>A service gets <b>300 requests/s</b> across <b>6 pods</b>. A request holds a connection for <b>15 ms</b> on average (60 ms at the 99th percentile). The database allows <b>100 connections</b> and you must keep 10 for admin tools.</p>
      ${H.table(['Step', 'Calculation', 'Result'], [
        ['Per pod load', '300 / 6', '50 req/s'],
        ['Busy connections per pod', '50 × 0.015', '0.75 on average'],
        ['Burst headroom (p99 hold, 2x)', '50 × 0.06 × 2', '≈ 6'],
        ['Pool per pod', 'round up, keep small', '<b>6</b>'],
        ['Fleet total', '6 pods × 6', '36 &lt; 90 available — <span class="c-g">safe</span>']
      ])}
      <p>A pool of 50 per pod "just in case" would be 300 total — more than the database allows.</p>`
    },
    {
      title: 'The #1 cause of starvation: holding a connection while waiting on something else',
      html: `<p>A method annotated <code>@Transactional</code> calls an external payment API (400 ms) in the middle. The transaction (and therefore the connection) is held the whole time. At 50 requests/s that is 50 × 0.4 = <b>20 connections</b> doing nothing but waiting for the network.</p>
      <p><b>Fix:</b> shrink the transaction. Do the HTTP call before or after the transaction, and keep database work in one short block. After the fix hold time drops to ~10 ms and the same traffic needs 0.5 connections.</p>`,
      code: { lang: 'java', check: false, code: `// BAD: connection held for the full 400 ms HTTP call
@Transactional
public void checkout(Long orderId) {
    Order o = repo.findById(orderId).orElseThrow();
    PaymentResult r = paymentClient.charge(o.getTotal());   // slow network call INSIDE the transaction
    o.markPaid(r.reference());
}

// GOOD: call the API first, then open a short transaction only for the DB write
public void checkoutFast(Long orderId) {
    int total = orderService.totalOf(orderId);               // short read
    PaymentResult r = paymentClient.charge(total);           // no connection held
    orderService.markPaid(orderId, r.reference());           // short @Transactional write
}` }
    },
    {
      title: 'Many pods, one database: use a server-side pooler',
      html: `<p>Autoscaling to 50 pods × pool 10 = <b>500 connections</b>, but PostgreSQL is happiest under ~100–200. The common fix is <b>PgBouncer</b> (or RDS Proxy): a middleman that multiplexes thousands of app connections onto a small number of real database connections. In <i>transaction pooling</i> mode a real connection is lent only for the duration of one transaction. Caveat: session-level features (prepared statements by name, <code>SET</code> variables, advisory locks, <code>LISTEN</code>) may break; check your driver settings.</p>`
    },
    {
      title: 'Leak detection and the "connection closed" confusion',
      html: `<p>With plain JDBC you must always close what you open; the safest form is try-with-resources. With a pool, <code>con.close()</code> means "return it". If code forgets, the pool slowly runs dry: 10 leaks and every new request times out even though the database is idle. Turn on <code>leakDetectionThreshold</code> in staging; the log prints the stack trace of the code that borrowed the connection.</p>`,
      code: { lang: 'java', code: `import java.sql.*;
import javax.sql.DataSource;

class OrderDao {
    private final DataSource pool;   // HikariDataSource behind this interface
    OrderDao(DataSource pool) { this.pool = pool; }

    int countByStatus(String status) throws SQLException {
        // try-with-resources returns the connection to the pool even if an exception is thrown
        try (Connection con = pool.getConnection();
             PreparedStatement ps = con.prepareStatement("SELECT COUNT(*) FROM orders WHERE status = ?")) {
            ps.setString(1, status);
            try (ResultSet rs = ps.executeQuery()) {
                rs.next();
                return rs.getInt(1);
            }
        }
    }
}` }
    }
  ],
  deepDive: `<p><b>Why small pools win (queueing theory):</b> a database is a server with limited parallelism (CPU cores, I/O queues). Past saturation, adding concurrent queries does not raise throughput; it raises <i>latency</i> (each query gets a smaller slice) and adds overhead (locks, context switches, cache thrash). The HikariCP team's famous demo: cutting a pool from 2048 to ~96 connections made response time drop by ~50x. Waiting in the application's pool queue is cheaper and fairer than waiting inside the database.</p>
  <p><b>How HikariCP is fast:</b> a lock-free <code>ConcurrentBag</code> with thread-local caches of recently used connections, a tiny proxy layer, and no per-call bookkeeping on the hot path. Validation uses <code>Connection.isValid()</code> (JDBC4), not a test query, and only if the connection was idle longer than 500 ms.</p>
  <p><b>Timeouts form a chain:</b> HTTP client timeout &gt; service timeout &gt; <code>connectionTimeout</code> &gt; statement/query timeout. If the pool timeout is 30 s but the user gives up at 5 s, threads keep waiting for work nobody wants. Set <code>connectionTimeout</code> to a few seconds, add query timeouts (<code>setQueryTimeout</code>, PostgreSQL <code>statement_timeout</code>) and fail fast.</p>
  <p><b>Threads vs connections:</b> Tomcat's default is 200 threads and Hikari's is 10 connections. That is fine — extra threads wait on the pool. But with <b>virtual threads</b> (Java 21) you can have 100,000 threads; the pool is then the real concurrency limiter, so keep it bounded and make sure code releases connections quickly. Reactive stacks use R2DBC pools with the same math.</p>
  <p><b>Other languages:</b> Node <code>pg.Pool({ max: 10, idleTimeoutMillis, connectionTimeoutMillis })</code>; Python SQLAlchemy <code>pool_size=10, max_overflow=5, pool_pre_ping=True, pool_recycle=1800</code>; Go <code>db.SetMaxOpenConns/SetMaxIdleConns/SetConnMaxLifetime</code>. In serverless (Lambda) every instance has its own pool, so use RDS Proxy or an HTTP data API.</p>
  <p><b>Failover:</b> after a database failover, existing connections point to a dead host. <code>maxLifetime</code> and validation recover from this, and DNS TTLs must be short. A pool full of half-dead connections shows up as long hangs, not errors — another reason for aggressive <code>connectionTimeout</code> and TCP keepalive settings.</p>
  <p><b>Metrics to watch:</b> <code>hikaricp_connections_active</code>, <code>_pending</code> (threads waiting — the most important), <code>_timeout_total</code>, and <code>connection_acquire</code> time. A pending count above zero for long periods is your sign to fix hold time first and raise the pool second.</p>`,
  aiEra: `<p><b>What AI changes:</b> AI coding assistants usually suggest <code>maximumPoolSize=100</code> "to be safe" or copy a config from a blog written for a different workload. AI-driven autoscalers and agents can also multiply pods quickly — and with them the connection count — so a human-set fleet-wide budget matters more than ever. AI workloads (embedding jobs, batch agents) are bursty and long-held: they love to grab connections for minutes.</p>
  <p><b>Use AI as a partner:</b> give it your numbers and ask <code>Compute pool size per pod using Little's Law for 300 rps, p99 hold 60 ms, 6 pods, max_connections 100 — show the arithmetic</code>; paste a Hikari metrics dump and ask what it implies; ask for a Grafana alert on <code>hikaricp_connections_pending</code>.</p>
  <p><b>Where AI goes wrong:</b> it confuses thread-pool size with connection-pool size, forgets that pods multiply the pool, and "fixes" timeouts by raising <code>connectionTimeout</code> to 60 s (hiding the problem and holding threads). It also rarely mentions PgBouncer/RDS Proxy.</p>
  <p><b>What you must still own:</b> the fleet-wide connection budget, hold-time discipline (short transactions, no remote calls inside them), and a load test that shows where throughput stops improving.</p>`,
  problems: [
    {
      title: 'Size the pool for a six-pod service',
      level: 'Medium', tags: ['HikariCP', 'Little\'s Law', 'capacity'], companies: ['Uber', 'Swiggy'],
      statement: `<p>Your Spring Boot service will run on <b>6 pods</b> and must handle <b>420 requests/s</b> at peak. Each request makes 2 queries and holds a connection for about <b>12 ms</b> on average and <b>50 ms</b> at the 99th percentile. The PostgreSQL primary has <b>8 cores</b> and <code>max_connections=100</code>; 15 connections are reserved for migrations, monitoring and a nightly job. Choose <code>maximumPoolSize</code> per pod, a <code>connectionTimeout</code>, and explain what you would do if a deploy later needs 20 pods.</p>`,
      constraints: `Pods are identical. The database is shared with one other small service that uses at most 10 connections. Show the arithmetic.`,
      example: `<p>Per pod: 420 / 6 = <b>70 req/s</b>. Average busy = 70 × 0.012 = ${H.c('b', '0.84')} connections. At p99 hold: 70 × 0.05 = ${H.c('b', '3.5')}. With 2x headroom: ${H.c('g', '7')}. So pool = 7, fleet = 42 connections, budget = 100 − 15 − 10 = 75.</p>`,
      brute: { why: `<p>"Set it to 100 per pod so we never wait." That is <b>600 connections</b> against a limit of 100: the service would fail to start or crash the database. Even if the limit were higher, 8 cores can only run about 17 queries truly in parallel, so extra connections only add queueing inside the database.</p>` },
      mcq: { q: 'Traffic doubles and requests now wait for a connection. What do you check first?', options: ['Raise maximumPoolSize to 200', 'Hold time per connection (slow queries, remote calls inside transactions)', 'Raise connectionTimeout to 60 s', 'Disable the pool'], answer: 1, explain: 'Connections needed = rate x hold time. If hold time grew (slow query, remote call inside a transaction) shrinking it fixes the cause. A bigger pool can overload the database; a longer timeout just makes users wait.' },
      hints: [
        `<p>Hint 1: work out the load per pod first (total rate divided by number of pods), then use connections busy = rate x hold time.</p>`,
        `<p>Hint 2: size for the slow case (p99 hold), double it for bursts, and check that pods x pool stays below the database budget (max_connections minus reserved minus other services).</p>`,
        `<p>Hint 3: recipe: pool = ceil(70 x 0.05 x 2) = 7; fleet 42 &lt; 75 budget OK; connectionTimeout 2-3 s; for 20 pods the fleet becomes 140 &gt; 75, so add PgBouncer or RDS Proxy, or shrink each pod's pool to 3, and scale reads to replicas.</p>`
      ],
      solution: {
        approach: `<p><b>Step 1 – budget:</b> the database allows 100 connections; reserve 15 for operations and 10 for the other service, leaving <b>75</b> for this fleet, i.e. up to 12 per pod with 6 pods. <b>Step 2 – load:</b> 420 / 6 = 70 requests/s per pod. Little's Law gives 70 × 0.012 = 0.84 busy connections on average; using the p99 hold of 50 ms it is 3.5. Double it for bursts and round up: <b>7</b>. That is well under the 12 allowed, so choose 7 (leaves 33 connections of spare budget for deploys where old and new pods overlap). <b>Step 3 – timeouts:</b> <code>connectionTimeout = 2000–3000 ms</code> so overload turns into fast errors/retries, <code>maxLifetime</code> a few minutes below any proxy limit, and a query timeout. <b>Step 4 – check the database:</b> 8 cores means roughly 17 queries run in parallel; 42 connections will mostly sit idle, which is fine. <b>Step 5 – 20 pods:</b> 20 × 7 = 140 exceeds the 75 budget. Options in order: put PgBouncer/RDS Proxy in transaction mode in front of the primary; cut the pool to 3 per pod (still above the 0.84 average); move read traffic to replicas; cache hot reads. Never solve it by raising max_connections without adding memory and CPU. Add alerts on pending threads and acquire time.</p>`,
        code: { lang: 'java', code: `class Sizing {
    public static void main(String[] args) {
        int pods = 6;
        double rpsPerPod = 420.0 / pods;                       // 70
        double p99HoldSec = 0.050;
        int pool = (int) Math.ceil(rpsPerPod * p99HoldSec * 2); // 7
        int budget = 100 - 15 - 10;                             // 75
        System.out.println("pool per pod = " + pool);
        System.out.println("fleet = " + (pool * pods) + " <= budget " + budget + " ? " + (pool * pods <= budget));
        int pods20 = 20;
        System.out.println("20 pods fleet = " + (pool * pods20) + " -> needs a pooler: " + (pool * pods20 > budget));
    }
}` },
        complexity: `<p>Arithmetic only. The key invariant: pods x maximumPoolSize ≤ database budget, and maximumPoolSize ≥ rate per pod x p99 hold.</p>`,
        followUps: ['What changes if the p99 hold time doubles?', 'What does transaction-pooling mode break?']
      }
    }
  ]
});
topics.push({
  title: 'Schema Migrations: Flyway, Liquibase and Zero-Downtime Changes',
  analogy: `<p>Think of your database schema like a <b>git history for tables</b>. Without migrations, every developer and every server changes tables by hand ("I added a column on my laptop, did you?") and nobody knows what version production is on. With migrations, each change is a numbered, saved script: V1, V2, V3. A new server starts empty, replays the scripts in order, and ends up identical to production. And changing a live table is like <b>renovating a bridge while cars drive over it</b>: you build the new lane next to the old one, move traffic, and only then remove the old lane — you never close the whole bridge.</p>`,
  explain: `<p><b>A migration tool</b> keeps a small bookkeeping table in your database that records which scripts have been applied. On app start (or in a deploy step) it compares your scripts folder with that table and runs whatever is missing, in order, once.</p>
  ${H.table(['', 'Flyway', 'Liquibase'], [
    ['Style', 'Plain SQL files (also Java migrations)', 'Changelog of "changesets" in YAML/XML/JSON/SQL'],
    ['Naming', '<code>V3__add_status.sql</code> (version + description)', 'Each changeset has <code>id</code> + <code>author</code>'],
    ['Bookkeeping table', '<code>flyway_schema_history</code>', '<code>DATABASECHANGELOG</code> (+ <code>DATABASECHANGELOGLOCK</code>)'],
    ['Rollback', 'Undo scripts are a paid feature; teams usually roll <i>forward</i>', 'Built-in <code>rollback</code> blocks per changeset'],
    ['Good for', 'SQL-first teams, simple and predictable', 'Many database vendors, preconditions, contexts, diff tooling']
  ])}
  <p><b>The golden rules:</b></p>
  <ol>
    <li><b>Never edit a migration that has already run anywhere.</b> Flyway stores a checksum of each file; if it changes, startup fails with "checksum mismatch". Fix mistakes with a <i>new</i> migration (V7 fixes V6).</li>
    <li><b>Migrations are forward-only and ordered</b> by version number. Keep them small, one concern each.</li>
    <li><b>Schema and code ship separately but compatibly.</b> During a rolling deploy, <i>old and new code run at the same time against the same database</i>, so every schema change must work for both.</li>
    <li><b>Test migrations</b> on a copy of production-sized data (a rename that takes 1 ms on your laptop can lock a 200 GB table for minutes).</li>
  </ol>
  <p><b>Expand → Migrate → Contract</b> (also called "parallel change") is how you make breaking changes safely. Renaming a column <code>name</code> → <code>full_name</code>:</p>
  ${H.table(['Step', 'What ships', 'Old app still works?'], [
    ['1. Expand', 'Migration adds nullable <code>full_name</code> (nothing removed)', '<span class="c-g">yes</span>'],
    ['2. Dual write', 'New app writes <b>both</b> columns, reads old', '<span class="c-g">yes</span>'],
    ['3. Backfill', 'Copy old values into new column in small batches', '<span class="c-g">yes</span>'],
    ['4. Switch reads', 'New app reads <code>full_name</code>', '<span class="c-g">yes</span>'],
    ['5. Contract', 'Later migration drops <code>name</code> (no running code uses it)', '<span class="c-g">yes</span>']
  ])}
  <p>A single-step rename would break every old pod still running during the deploy. Five small safe steps over a few releases beat one risky step at 2 a.m.</p>`,
  clues: [
    '"How do you change the schema without downtime?" — expand/contract, backward-compatible steps',
    '"Flyway: Validate failed: Migration checksum mismatch for migration version 3" — someone edited an applied file',
    '"Two pods started at once and both ran the migration" — need the tool\'s lock or a separate migration job',
    '"Rename / drop a column", "add NOT NULL column", "change a column type" in a live system',
    '"Rollback the migration after a bad deploy" — usually roll forward with a new migration instead',
    '"ALTER TABLE locked our orders table for 10 minutes" — long lock; use online/concurrent techniques'
  ],
  code: [
    { lang: 'sql', db: 'migr', title: 'Runnable: expand, backfill, contract (SQLite)', code: `-- V3__expand_add_full_name.sql   (EXPAND: only adds, never removes)
ALTER TABLE users ADD COLUMN full_name TEXT;

-- V4__backfill_full_name.sql      (MIGRATE: copy data; in big tables do it in batches)
UPDATE users SET full_name = name WHERE full_name IS NULL;

-- Check before contracting: every row copied?
SELECT COUNT(*) AS rows_not_copied FROM users WHERE full_name IS NULL;

-- V5__contract_drop_name.sql      (CONTRACT: ship only after NO running code reads "name")
ALTER TABLE users DROP COLUMN name;

SELECT id, full_name FROM users ORDER BY id;` },
    { lang: 'sql', db: 'migr', title: 'Runnable: what the bookkeeping table looks like', code: `-- Flyway keeps a table like this. Each applied script gets a row.
SELECT installed_rank, version, description, checksum, success
FROM flyway_schema_history
ORDER BY installed_rank;` },
    { lang: 'yaml', title: 'Spring Boot Flyway settings', code: `spring:
  flyway:
    enabled: true
    locations: classpath:db/migration      # V1__init.sql, V2__orders.sql ...
    baseline-on-migrate: false             # true only when adopting Flyway on an existing database
    validate-on-migrate: true              # fail startup on checksum mismatch
    out-of-order: false                    # keep strict ordering
    url: \${DB_URL}
    user: \${DB_MIGRATION_USER}             # a separate account with DDL rights
    password: \${DB_MIGRATION_PASSWORD}     # from the environment or a secret store` },
    { lang: 'yaml', title: 'Liquibase changelog (YAML)', code: `databaseChangeLog:
  - changeSet:
      id: 3-add-full-name
      author: shop-team
      changes:
        - addColumn:
            tableName: users
            columns:
              - column: { name: full_name, type: varchar(200) }
      rollback:
        - dropColumn: { tableName: users, columnName: full_name }
  - changeSet:
      id: 4-backfill-full-name
      author: shop-team
      changes:
        - sql: UPDATE users SET full_name = name WHERE full_name IS NULL` },
    { lang: 'sql', check: false, title: 'PostgreSQL: safe patterns for big tables', code: `-- Adding an index WITHOUT blocking writes (cannot run inside a transaction)
CREATE INDEX CONCURRENTLY idx_orders_created_id ON orders (created_at, id);

-- Adding a NOT NULL column safely in three steps
ALTER TABLE users ADD COLUMN country text;                      -- 1. nullable, instant
-- 2. backfill in batches of 5000 rows from the application or a job
UPDATE users SET country = 'IN' WHERE id BETWEEN 1 AND 5000 AND country IS NULL;
ALTER TABLE users ADD CONSTRAINT users_country_nn CHECK (country IS NOT NULL) NOT VALID;
ALTER TABLE users VALIDATE CONSTRAINT users_country_nn;          -- 3. validates without a long lock

-- Protect the app from waiting forever behind a long-held lock
SET lock_timeout = '3s';` },
    { lang: 'js', run: true, title: 'Runnable: how a migration runner decides what to do', code: `// A mini-Flyway: files on disk vs. the history table.
function checksum(text) { var h = 0; for (var i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) | 0; return h; }

var files = [
  { v: 1, desc: 'create customers', sql: 'CREATE TABLE customers(id INT)' },
  { v: 2, desc: 'create orders',    sql: 'CREATE TABLE orders(id INT)' },
  { v: 3, desc: 'add status',       sql: 'ALTER TABLE orders ADD status TEXT' }
];
var history = [ { v: 1, sum: checksum(files[0].sql) }, { v: 2, sum: checksum(files[1].sql) } ];

function migrate() {
  // 1) validate: applied files must not have changed
  for (var i = 0; i < history.length; i++) {
    var f = files.filter(function (x) { return x.v === history[i].v; })[0];
    if (!f) throw new Error('Applied migration V' + history[i].v + ' is missing from disk');
    if (checksum(f.sql) !== history[i].sum) throw new Error('Validate failed: checksum mismatch for V' + f.v);
  }
  // 2) apply pending in version order
  var last = history.length ? history[history.length - 1].v : 0;
  files.filter(function (f) { return f.v > last; }).sort(function (a, b) { return a.v - b.v; }).forEach(function (f) {
    console.log('applying V' + f.v + ' ' + f.desc);
    history.push({ v: f.v, sum: checksum(f.sql) });
  });
  console.log('schema at version', history[history.length - 1].v);
}

migrate();                                   // applies V3 only
files[0].sql = 'CREATE TABLE customers(id INT, name TEXT)';   // someone edits an old file
try { migrate(); } catch (e) { console.log('ERROR:', e.message); }` }
  ],
  codeTitle: ['Expand / backfill / contract (runnable)', 'Bookkeeping table (runnable)', 'Flyway in Spring Boot', 'Liquibase changelog', 'Safe big-table patterns (PostgreSQL)', 'Mini migration runner (runnable)'],
  viz: [
    {
      title: 'Flyway applying versions (and catching an edited file)',
      input: 'applied=2 tamper=no',
      inputLabel: 'applied = how many versions already ran (0-4); tamper = yes/no (someone edited an applied file)',
      gen: function (input) {
        var s = String(input), ap = 2, tamper = false, m;
        if ((m = /applied\s*=\s*(\d+)/.exec(s))) ap = parseInt(m[1], 10);
        if (/tamper\s*=\s*(yes|true|y)/i.test(s)) tamper = true;
        if (ap < 0 || ap > 4) throw new Error('applied must be 0-4');
        if (tamper && ap < 2) throw new Error('tamper=yes needs applied=2 or more (V2 must already be applied)');
        var V = [['V1', 'create_customers'], ['V2', 'create_orders'], ['V3', 'add_orders_status'], ['V4', 'add_created_index']];
        var cols = ['version', 'script on disk', 'checksum on disk', 'checksum in history', 'state'];
        function sumOf(i) { return String(1000 + i * 111); }
        function build(states, tamperOn) {
          return V.map(function (v, i) {
            var disk = (tamperOn && i === 1) ? '9999 (edited!)' : sumOf(i);
            var hist = i < ap ? sumOf(i) : '-';
            if (states[i] === 'done-now') hist = sumOf(i);
            return [v[0], v[1] + '.sql', disk, hist, states[i]];
          });
        }
        var states = V.map(function (v, i) { return i < ap ? 'applied' : 'pending'; });
        var frames = [];
        frames.push({ narr: 'The app starts and Flyway wakes up. It lists the migration scripts in <code>db/migration</code> (the "disk" side).', parts: [{ type: 'table', label: 'Scripts found on disk', columns: ['version', 'script'], rows: V.map(function (v) { return [v[0], v[1] + '.sql']; }) }] });
        var hl0 = {}; states.forEach(function (st, i) { hl0[i] = st === 'applied' ? 'done' : 'cur'; });
        frames.push({ narr: 'It reads <code>flyway_schema_history</code> from the database. <b>' + ap + '</b> version(s) are already recorded as applied; the rest are <b>pending</b>.', parts: [{ type: 'table', label: 'Disk vs history', columns: cols, rows: build(states, false), hl: hl0 }] });
        if (tamper) {
          var hlt = {}; hlt[1] = 'bad';
          frames.push({ narr: '<b>Validate step:</b> Flyway recomputes each applied file\'s checksum. V2 on disk is <span class="c-r">9999</span> but history remembers <b>' + sumOf(1) + '</b>. Someone edited a migration that already ran.', parts: [{ type: 'table', label: 'Checksum validation', columns: cols, rows: build(states, true), hl: hlt }] });
          frames.push({ narr: '<span class="c-r">Validate failed: Migration checksum mismatch for migration version 2.</span> The app <b>refuses to start</b> — better than running against a schema nobody can describe. The fix is to restore the original file and put the change in a <i>new</i> migration (V5).', parts: [{ type: 'table', label: 'Result', columns: cols, rows: build(states, true), hl: hlt }, { type: 'vars', vals: { 'app startup': 'ABORTED' }, hl: { 'app startup': 'bad' } }] });
          return frames;
        }
        var hlv = {}; states.forEach(function (st, i) { if (st === 'applied') hlv[i] = 'ok'; });
        frames.push({ narr: '<b>Validate step:</b> every applied file still has the checksum recorded in history, so nothing was edited. ' + (ap ? '<span class="c-g">All good.</span>' : 'Nothing applied yet, so nothing to validate.'), parts: [{ type: 'table', label: 'Checksum validation', columns: cols, rows: build(states, false), hl: hlv }] });
        for (var i = ap; i < V.length; i++) {
          states[i] = 'done-now';
          var hn = {}; states.forEach(function (st, k) { if (st === 'applied') hn[k] = 'done'; if (st === 'done-now') hn[k] = 'ok'; });
          frames.push({ narr: 'Applying <b>' + V[i][0] + '</b> (' + V[i][1] + '): take the migration lock, run the script <i>in a transaction</i>, then insert a row into the history table with its checksum. Scripts run strictly in version order.', parts: [{ type: 'table', label: 'Applying pending migrations', columns: cols, rows: build(states, false), hl: hn }] });
          states[i] = 'applied';
        }
        var hf = {}; V.forEach(function (v, i) { hf[i] = 'done'; });
        frames.push({ narr: ap === V.length ? 'Nothing to do: the database is already at <b>V4</b>. The app starts immediately.' : 'Schema is now at <b>V4</b>. Pods that start later will see everything applied and skip straight to booting. If two pods start together, the lock makes one wait.', parts: [{ type: 'table', label: 'Final state', columns: cols, rows: build(states, false), hl: hf }, { type: 'vars', vals: { 'schema version': 'V4', 'app startup': 'OK' }, hl: { 'app startup': 'ok' } }] });
        return frames;
      }
    },
    {
      title: 'Expand and contract: safe vs one-step rename',
      input: 'safe',
      inputLabel: 'Type safe (expand/contract) or unsafe (rename in one step)',
      gen: function (input) {
        var mode = String(input).trim().toLowerCase();
        if (mode !== 'safe' && mode !== 'unsafe') throw new Error('Type safe or unsafe');
        var cols = ['step', 'database columns', 'old app (reads/writes name)', 'new app (uses full_name)'];
        var frames = [];
        if (mode === 'unsafe') {
          frames.push({ narr: 'Starting point: table <code>users(id, name)</code>. A rolling deploy replaces pods one at a time, so for a few minutes <b>old and new code both run</b>.', parts: [{ type: 'table', label: 'Plan: rename in one step', columns: cols, rows: [['0. start', 'id, name', 'OK', 'not deployed']], hl: { 0: 'ok' } }] });
          frames.push({ narr: 'The migration runs <code>ALTER TABLE users RENAME COLUMN name TO full_name</code> at the start of the deploy. Instantly the column <code>name</code> no longer exists.', parts: [{ type: 'table', label: 'After the rename', columns: cols, rows: [['0. start', 'id, name', 'OK', 'not deployed'], ['1. rename', 'id, full_name', '<span class="c-r">FAILS: no such column "name"</span>', 'starting up…']], hl: { 1: 'bad' } }] });
          frames.push({ narr: 'Every request served by an <b>old pod</b> now errors until the last old pod is gone. Users see 500 errors during the whole rolling deploy. Rolling back the app does not help because the schema has already moved.', parts: [{ type: 'table', label: 'During rolling deploy', columns: cols, rows: [['1. rename', 'id, full_name', '<span class="c-r">500 errors</span>', 'OK'], ['2. mixed pods', 'id, full_name', '<span class="c-r">500 errors</span>', 'OK']], hl: { 0: 'bad', 1: 'bad' } }, { type: 'vars', vals: { 'error rate': 'high', 'rollback possible': 'no (schema changed)' }, hl: { 'error rate': 'bad', 'rollback possible': 'bad' } }] });
          frames.push({ narr: '<b>Lesson:</b> breaking schema changes and code changes cannot be released as one step. Use expand/contract: type <b>safe</b> to see it done properly.', parts: [{ type: 'text', html: '<b>Never rename or drop a column that running code still uses.</b>' }] });
          return frames;
        }
        var rows = [
          ['0. start', 'id, name', 'OK', 'not deployed'],
          ['1. expand', 'id, name, full_name (NULL)', 'OK (ignores the new column)', 'not deployed'],
          ['2. deploy dual-write app', 'id, name, full_name', 'OK', 'writes both, reads name'],
          ['3. backfill', 'id, name, full_name (copied)', 'OK', 'OK'],
          ['4. switch reads', 'id, name, full_name', 'OK (still writes name)', 'reads full_name'],
          ['5. contract', 'id, full_name', 'gone (retired)', 'OK']
        ];
        var notes = [
          'Starting point: <code>users(id, name)</code>. Goal: rename to <code>full_name</code> with zero downtime.',
          '<b>Step 1 Expand:</b> add a nullable <code>full_name</code>. Adding a nullable column is instant and invisible to the old app. Nothing removed, so a rollback is trivially safe.',
          '<b>Step 2:</b> deploy the new app version that <b>writes both columns</b>. Old pods and new pods can run together because both columns exist and stay in sync.',
          '<b>Step 3 Backfill:</b> copy <code>name</code> into <code>full_name</code> for old rows, in small batches (e.g. 5,000 rows) so locks stay short.',
          '<b>Step 4:</b> deploy a version that <b>reads</b> <code>full_name</code>. If something is wrong you can still roll back, because <code>name</code> is kept up to date.',
          '<b>Step 5 Contract:</b> only after no running version uses <code>name</code> (often a release or two later), drop it. Done — five small safe steps, zero errors.'
        ];
        for (var i = 0; i < rows.length; i++) {
          var hl = {}; hl[i] = i === rows.length - 1 ? 'sel' : 'ok';
          for (var k = 0; k < i; k++) hl[k] = 'done';
          frames.push({ narr: notes[i], parts: [{ type: 'table', label: 'Safe plan, step by step', columns: cols, rows: rows.slice(0, i + 1), hl: hl }, { type: 'vars', vals: { 'errors during deploy': 0, 'rollback possible': i < 5 ? 'yes' : 'forward-fix only' }, hl: { 'errors during deploy': 'ok' } }] });
        }
        return frames;
      }
    }
  ],
  examples: [
    {
      title: 'A tidy Flyway folder',
      html: `<p>Versions are compared <b>numerically</b>, so use consistent prefixes. A typical project:</p>
      <pre>src/main/resources/db/migration/
  V1__create_customers.sql
  V2__create_orders.sql
  V3__add_orders_status.sql
  V4__add_orders_created_index.sql
  R__refresh_reporting_views.sql      (repeatable: re-runs when its checksum changes)</pre>
      <p><b>V</b> = versioned, runs once. <b>R</b> = repeatable, great for views and stored procedures. Two developers who both create <code>V5</code> on different branches collide: agree on a numbering scheme (timestamps like <code>V20261015_1030__…</code> avoid this) or enable <code>outOfOrder</code> carefully.</p>`
    },
    {
      title: 'Dangerous vs safe schema changes',
      html: `${H.table(['Change', 'Risk on a live system', 'Safe approach'], [
        ['Add nullable column', '<span class="c-g">Low</span>', 'Just do it'],
        ['Add column with default (PostgreSQL 11+)', '<span class="c-g">Low</span> (metadata-only)', 'Older versions rewrite the whole table — check your version'],
        ['Add NOT NULL to existing column', '<span class="c-r">High</span> (scan + lock)', 'Add CHECK ... NOT VALID, backfill, VALIDATE, then SET NOT NULL'],
        ['Drop / rename column', '<span class="c-r">High</span> (breaks old code)', 'Expand → migrate → contract'],
        ['Change column type', '<span class="c-r">High</span> (rewrite)', 'New column + dual write + backfill + switch'],
        ['Create index', '<span class="c-y">Medium</span> (blocks writes)', '<code>CREATE INDEX CONCURRENTLY</code> (PostgreSQL)']
      ])}`
    },
    {
      title: 'Who runs migrations: app startup or a separate job?',
      html: `<p><b>At app startup</b> (default in Spring Boot) is simple, and Flyway/Liquibase take a lock so only one pod migrates while the others wait. Downsides: slow startups, the app needs a powerful DDL database account, and a failed migration crash-loops every pod.</p>
      <p><b>As a separate step</b> (a Kubernetes Job / init container / CI step that runs <code>flyway migrate</code> <i>before</i> deploying the app) is the common production choice: DDL credentials are used only there, failures stop the release before any pod changes, and you can time-box and monitor the migration. Either way, the migration must be backward compatible with the currently running app version.</p>`,
      code: { lang: 'bash', code: `# CI/CD step: run migrations once, before rolling out the new pods
# Credentials come from the pipeline's secret store, never from the repository.
flyway -url="$DB_URL" -user="$DB_MIGRATION_USER" -password="$DB_MIGRATION_PASSWORD" \\
       -locations=filesystem:./db/migration validate
flyway -url="$DB_URL" -user="$DB_MIGRATION_USER" -password="$DB_MIGRATION_PASSWORD" \\
       -locations=filesystem:./db/migration migrate` }
    },
    {
      title: 'Backfilling a large table in batches',
      html: `<p>One <code>UPDATE users SET full_name = name</code> on 50 million rows holds locks for a long time, bloats the write-ahead log, and lags replicas. Run it as a loop of small transactions (a job, not a Flyway script), with a short pause, resumable by primary key range.</p>`,
      code: { lang: 'java', code: `import java.sql.*;

class Backfill {
    /** Copies name -> full_name in id ranges of 5000 so each transaction is short. */
    static void run(Connection con) throws Exception {
        con.setAutoCommit(false);
        long lastId = 0;
        while (true) {
            int updated;
            try (PreparedStatement ps = con.prepareStatement(
                    "UPDATE users SET full_name = name WHERE id > ? AND id <= ? AND full_name IS NULL")) {
                ps.setLong(1, lastId);
                ps.setLong(2, lastId + 5000);
                updated = ps.executeUpdate();
            }
            con.commit();                       // release locks after every batch
            lastId += 5000;
            long max;
            try (Statement st = con.createStatement(); ResultSet rs = st.executeQuery("SELECT COALESCE(MAX(id),0) FROM users")) {
                rs.next(); max = rs.getLong(1);
            }
            if (lastId >= max) break;           // done when we passed the highest id
            Thread.sleep(50);                   // be gentle: let replicas and other traffic breathe
        }
    }
}` }
    }
  ],
  deepDive: `<p><b>How Flyway guarantees "exactly once":</b> before running, it takes a lock (an advisory lock on PostgreSQL, a lock table elsewhere). It then reads the history table, validates checksums (CRC32 of the file contents with line endings normalized), and runs each pending script — in a transaction where the database supports transactional DDL (PostgreSQL does; MySQL does <b>not</b>, so a failed script can leave a half-applied change and a "failed" row you must repair with <code>flyway repair</code>). Liquibase uses an MD5 of the changeset content plus id/author/path, and the <code>DATABASECHANGELOGLOCK</code> table.</p>
  <p><b>Locks are the real danger.</b> A plain <code>ALTER TABLE</code> needs an ACCESS EXCLUSIVE lock in PostgreSQL. If a long-running query holds a lock on the table, your ALTER waits — and every new query queues <i>behind your waiting ALTER</i>, so a 1 ms change can stall the table. Always set <code>lock_timeout</code> (e.g. 3 s) and retry. In MySQL use online DDL (<code>ALGORITHM=INPLACE, LOCK=NONE</code>) or tools like gh-ost / pt-online-schema-change; in PostgreSQL use <code>CONCURRENTLY</code>, <code>NOT VALID</code> constraints, and <code>pg_repack</code>.</p>
  <p><b>Data migrations vs schema migrations:</b> keep big data fixes out of the versioned SQL path when they take minutes. Use a resumable batch job, track progress, and make the app tolerate rows that are not yet migrated (e.g. read <code>COALESCE(full_name, name)</code>).</p>
  <p><b>Rollback strategy:</b> most teams do not write "down" scripts. Instead each release is compatible with the previous one (that is the whole point of expand/contract), so rolling back means deploying the previous app version, with the schema left in its expanded state. A "down" that drops a column loses data and is rarely safe in production.</p>
  <p><b>Testing:</b> run all migrations from scratch in CI against a real database (Testcontainers), then run them again on a snapshot of production schema; compare the resulting schema to the JPA mapping (<code>spring.jpa.hibernate.ddl-auto=validate</code>). Never use <code>ddl-auto=update</code> in production: it guesses, cannot drop or rename, and leaves no history.</p>
  <p><b>Other stacks:</b> Prisma Migrate, Knex/Sequelize migrations, Alembic (Python), Rails/Django migrations, Atlas and sqitch follow the same model: ordered files + history table + (sometimes) declarative diffing. The expand/contract discipline is identical.</p>
  <p><b>Multi-tenant and sharded databases</b> multiply the problem: you may migrate thousands of schemas, some failing halfway, so migrations must be idempotent and the app must tolerate mixed schema versions across tenants for a while.</p>`,
  aiEra: `<p><b>What AI changes:</b> AI can draft migration SQL in seconds, convert JPA entity changes into a diff, and even review a migration for lock risk. It makes it easy to generate <i>many</i> migrations quickly — which makes discipline (small, ordered, immutable) more important. AI-generated schemas also tend to be over-normalized or missing indexes.</p>
  <p><b>Use AI as a partner:</b> ask <code>Rewrite this rename as an expand/contract plan with each step as a separate release</code>; ask <code>Which statements here take an ACCESS EXCLUSIVE lock on PostgreSQL 16?</code>; ask for a Testcontainers test that applies all migrations to an empty database and asserts the schema.</p>
  <p><b>Where AI goes wrong:</b> it happily emits <code>ALTER TABLE ... RENAME COLUMN</code> or <code>DROP COLUMN</code> in one step, suggests editing an old migration to "fix" it, uses <code>ddl-auto=update</code>, or writes a <code>CREATE INDEX</code> that blocks writes on a huge table. It does not know your table sizes or deploy process.</p>
  <p><b>What you must still own:</b> the release order (migrate, deploy, switch, contract), table-size awareness, a review gate for anything that locks, and the rule "applied migrations are immutable". AI agents with database access should get a migration account scoped to a branch/staging database, never production DDL rights by default.</p>`,
  problems: [
    {
      title: 'Rename a column with zero downtime',
      level: 'Medium', tags: ['migrations', 'expand-contract', 'zero downtime'], companies: ['Stripe', 'Atlassian'],
      statement: `<p>The table <code>users(id, name)</code> has 80 million rows and is read and written by a service running 12 pods with rolling deploys (old and new versions overlap for ~10 minutes). Product wants the column renamed to <code>full_name</code> and made <code>NOT NULL</code>. Write the plan as separate releases, state what each migration contains, and say how you would verify before the final step.</p>`,
      constraints: `No downtime, no error spike, no table lock longer than a few seconds. Database: PostgreSQL. You may use several releases over several days.`,
      example: `<p>Bad plan: ${H.c('r', 'one migration: RENAME COLUMN name TO full_name; SET NOT NULL')} — old pods fail instantly.</p><p>Good plan: ${H.c('g', 'expand → dual write → batched backfill → switch reads → verify → contract')}.</p>`,
      brute: { why: `<p>A single <code>ALTER TABLE users RENAME COLUMN name TO full_name</code> plus <code>SET NOT NULL</code> deployed with the new code. During the rolling deploy, old pods still query <code>name</code> and fail, <code>SET NOT NULL</code> scans 80 M rows holding an exclusive lock, and rollback of the app cannot undo the schema.</p>` },
      mcq: { q: 'When is it safe to drop the old column "name"?', options: ['Right after adding full_name', 'After the backfill finishes', 'After no running application version reads or writes it, and the data is verified', 'Whenever the DBA is online'], answer: 2, explain: 'Contract is the last step. Only drop once every deployed version (including rollback targets and background jobs) stopped using the old column and you verified full_name is complete.' },
      hints: [
        `<p>Hint 1: during a rolling deploy two app versions run at once, so every intermediate schema must work for both. Never remove or rename something in the same release that stops using it.</p>`,
        `<p>Hint 2: break it into expand (add a nullable column), dual-write, backfill in batches, switch reads, then contract. NOT NULL must come last and be added without a long lock.</p>`,
        `<p>Hint 3: recipe: V1 add nullable full_name; release A writes both; job backfills by id range (5,000 per batch) with lock_timeout; verify <code>count(*) where full_name is null</code> = 0; release B reads full_name; V2 add CHECK NOT VALID + VALIDATE, then SET NOT NULL; release C stops writing name; V3 drops name.</p>`
      ],
      solution: {
        approach: `<p><b>Release 1 – Expand (migration only):</b> <code>ALTER TABLE users ADD COLUMN full_name text</code> – nullable, instant, invisible to old code. <b>Release 2 – App:</b> new version writes <i>both</i> columns on insert/update and still reads <code>name</code> (or <code>COALESCE(full_name, name)</code>). Old and new pods can overlap safely. <b>Backfill job:</b> copy in id ranges of ~5,000 rows with a short sleep so replicas keep up, committing after each batch, resumable and idempotent (<code>WHERE full_name IS NULL</code>). Set <code>lock_timeout</code> so it never queues behind long transactions. <b>Verify:</b> <code>SELECT count(*) FROM users WHERE full_name IS NULL</code> must be 0 (and compare a checksum sample of name vs full_name). <b>Release 3 – Switch reads:</b> app now reads <code>full_name</code> but still writes both, so a rollback to Release 2 stays safe. <b>NOT NULL without an outage:</b> <code>ALTER TABLE users ADD CONSTRAINT users_full_name_nn CHECK (full_name IS NOT NULL) NOT VALID;</code> then <code>VALIDATE CONSTRAINT</code> (scans without blocking writes), then <code>SET NOT NULL</code> (PostgreSQL 12+ trusts the validated check and skips the scan). <b>Release 4:</b> stop writing <code>name</code>. <b>Contract (migration):</b> after a bake period, confirm in logs and query stats that nothing reads <code>name</code>, then <code>ALTER TABLE users DROP COLUMN name</code> (instant; space is reclaimed later). Each step is independently reversible except the final drop, which is why it is last.</p>`,
        code: { lang: 'sql', db: 'migr', code: `-- The same plan, shrunk to SQLite so you can run it:
ALTER TABLE users ADD COLUMN full_name TEXT;                 -- expand
UPDATE users SET full_name = name WHERE full_name IS NULL;   -- backfill (batched in real life)
SELECT COUNT(*) AS missing FROM users WHERE full_name IS NULL; -- verify: must be 0
ALTER TABLE users DROP COLUMN name;                          -- contract
SELECT * FROM users ORDER BY id;` },
        complexity: `<p>Total work O(rows) but spread over many tiny transactions; the longest lock is milliseconds. Elapsed time: days, by design.</p>`,
        followUps: ['How do you keep the two columns in sync if some service cannot be updated to dual-write (hint: trigger)?', 'What would you do on MySQL where DDL is not transactional?']
      }
    }
  ]
});
topics.push({
  title: 'Pagination: Offset vs Keyset (Cursor)',
  analogy: `<p>You are reading a very long book. <b>Offset pagination</b> is saying "open to page 4,000" by counting 3,999 pages from the front cover every single time — the librarian flips and discards every page before it. <b>Keyset pagination</b> is a <b>bookmark</b>: "continue from where I stopped" — you open straight to the bookmark and read the next page. If someone slips in a few new pages at the front while you read, counting from the cover makes you re-read lines you have already seen; the bookmark does not care.</p>`,
  explain: `<p>Every list screen and every <code>GET /orders</code> endpoint needs pagination, because returning a million rows is never an option. There are two main ways.</p>
  ${H.table(['', 'Offset (LIMIT/OFFSET)', 'Keyset / cursor (seek)'], [
    ['Query', '<code>ORDER BY created_at DESC, id DESC LIMIT 20 OFFSET 4000</code>', '<code>WHERE (created_at, id) &lt; (:ts, :id) ORDER BY created_at DESC, id DESC LIMIT 20</code>'],
    ['Cost of page N', '<span class="c-r">Grows with N</span>: the database reads and throws away N × size rows', '<span class="c-g">Constant</span>: index seek to the bookmark, read 20 rows'],
    ['Data changes while paging', '<span class="c-r">Rows repeat or get skipped</span> (page drift)', '<span class="c-g">Stable</span>: always "after the last row I saw"'],
    ['Jump to page 37?', 'Yes', 'No (only next / previous)'],
    ['Total count / page numbers?', 'Easy (but <code>COUNT(*)</code> is slow on big tables)', 'Usually not provided; "load more" or infinite scroll'],
    ['Best for', 'Small admin tables, "page 1 2 3" UIs, small data', 'Feeds, timelines, exports, APIs, big tables']
  ])}
  <p><b>Rules for keyset to be correct:</b></p>
  <ol>
    <li>The sort must be <b>unique and deterministic</b>. If many rows share <code>created_at</code>, add the primary key as a <b>tie-breaker</b>: <code>ORDER BY created_at DESC, id DESC</code>. Otherwise rows at the page boundary are skipped or repeated.</li>
    <li>Use a <b>composite index</b> in the same order: <code>(created_at, id)</code>. Then the database seeks straight to the bookmark.</li>
    <li>The bookmark ("cursor") is the sort key of the last row, usually packed into an opaque token (Base64 of <code>{"ts":…, "id":…}</code>) so clients do not depend on its format.</li>
    <li>Fetch <b>size + 1</b> rows: if you get the extra one, there is a next page (and you never run a separate COUNT).</li>
  </ol>
  <p><b>A worked picture:</b> 30 orders sorted newest first, page size 5. Page 3 by offset reads 15 rows (10 are discarded). Page 3 by keyset, from the bookmark after the 10th row, reads only 5.</p>
  ${H.arr([30, 29, 28, 27, 26, 25, 24, 23, 22, 21, 20, 19, 18, 17, 16], { label: 'OFFSET 10 LIMIT 5 reads 15 rows', hl: { 0: 'r', 1: 'r', 2: 'r', 3: 'r', 4: 'r', 5: 'r', 6: 'r', 7: 'r', 8: 'r', 9: 'r', 10: 'g', 11: 'g', 12: 'g', 13: 'g', 14: 'g' } })}
  ${H.arr([20, 19, 18, 17, 16], { label: 'Keyset after (…, id 21) reads 5 rows', hl: { 0: 'g', 1: 'g', 2: 'g', 3: 'g', 4: 'g' } })}`,
  clues: [
    '"The list gets slower the deeper you scroll / page 10,000 takes 5 seconds" — offset cost',
    '"Users see the same item twice (or miss one) when they load the next page" — page drift',
    '"Infinite scroll", "timeline", "feed", "export all rows", "sync API" → cursor/keyset',
    '"Design the pagination of a REST API for 100M rows" — next_cursor, stable sort, tie-breaker',
    '<code>SELECT COUNT(*)</code> on every request is slow — return hasNext instead',
    '"Sort by a non-unique column such as created_at or score" — you need the id tie-breaker'
  ],
  code: [
    { lang: 'sql', db: 'shop', title: 'Runnable: page 3 by offset vs by keyset (same rows)', code: `-- OFFSET: reads 15 rows, throws away 10, returns 5
SELECT id, created_at, total
FROM orders
ORDER BY created_at DESC, id DESC
LIMIT 5 OFFSET 10;

-- KEYSET: bookmark = last row of page 2 (created_at '2026-03-07', id 21)
-- A row-value comparison keeps (created_at, id) together as one sort key.
SELECT id, created_at, total
FROM orders
WHERE (created_at, id) < ('2026-03-07', 21)
ORDER BY created_at DESC, id DESC
LIMIT 5;` },
    { lang: 'sql', db: 'shop', title: 'Runnable: the index that makes keyset a seek', code: `-- The database tells you how it will run the query:
EXPLAIN QUERY PLAN
SELECT id, created_at FROM orders
WHERE (created_at, id) < ('2026-03-07', 21)
ORDER BY created_at DESC, id DESC
LIMIT 5;
-- Look for: SEARCH ... USING COVERING INDEX idx_orders_created_id (a seek, not a scan)` },
    { lang: 'sql', db: 'shop', title: 'Runnable: fetch size+1 to learn "has next" without COUNT', code: `-- Page size is 4, so ask for 5 rows. If 5 come back, there is a next page.
SELECT id, created_at, total
FROM orders
WHERE status = 'PAID'
  AND (created_at, id) < ('2026-03-09', 99999)   -- first page: start above the newest key
ORDER BY created_at DESC, id DESC
LIMIT 5;` },
    { lang: 'java', title: 'Opaque cursor encode / decode', code: `import java.nio.charset.StandardCharsets;
import java.util.Base64;

class Cursor {
    final String createdAt;   // sort key 1 (ISO date or timestamp)
    final long id;            // sort key 2: tie-breaker, unique
    Cursor(String createdAt, long id) { this.createdAt = createdAt; this.id = id; }

    /** Pack the last row's sort key into a URL-safe token the client treats as opaque. */
    String encode() {
        String raw = createdAt + "|" + id;
        return Base64.getUrlEncoder().withoutPadding().encodeToString(raw.getBytes(StandardCharsets.UTF_8));
    }

    /** Parse and validate; reject garbage instead of trusting client input. */
    static Cursor decode(String token) {
        try {
            String raw = new String(Base64.getUrlDecoder().decode(token), StandardCharsets.UTF_8);
            String[] parts = raw.split("\\\\|");
            if (parts.length != 2) throw new IllegalArgumentException("bad cursor");
            return new Cursor(parts[0], Long.parseLong(parts[1]));
        } catch (RuntimeException e) {
            throw new IllegalArgumentException("Invalid cursor");   // map to HTTP 400
        }
    }

    public static void main(String[] args) {
        String t = new Cursor("2026-03-07", 21).encode();
        System.out.println(t);                       // opaque token
        Cursor c = Cursor.decode(t);
        System.out.println(c.createdAt + " " + c.id); // 2026-03-07 21
    }
}` },
    { lang: 'java', check: false, title: 'Spring Data JPA: offset Page vs keyset Window (Spring Data 3.1+)', code: `interface OrderRepo extends JpaRepository<Order, Long> {

    // OFFSET style: gives a Page with totalElements (runs an extra COUNT(*))
    Page<Order> findByStatus(String status, Pageable pageable);

    // SLICE: offset, but no COUNT - fetches size+1 and tells you hasNext()
    Slice<Order> findSliceByStatus(String status, Pageable pageable);

    // KEYSET scrolling: Window + ScrollPosition (needs a deterministic sort incl. unique id)
    Window<Order> findFirst20ByStatusOrderByCreatedAtDescIdDesc(String status, ScrollPosition position);
}

// Usage:
// Window<Order> w = repo.findFirst20ByStatusOrderByCreatedAtDescIdDesc("PAID", ScrollPosition.keyset());
// ScrollPosition next = w.positionAt(w.size() - 1);     // bookmark = last element
// Window<Order> w2 = repo.findFirst20ByStatusOrderByCreatedAtDescIdDesc("PAID", next);
// boolean more = w.hasNext();` },
    { lang: 'js', run: true, title: 'Runnable: page drift with OFFSET vs keyset', code: `// 12 rows, newest first. New rows get higher ids and appear at the TOP.
var rows = [12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1];
var size = 4;

function offsetPage(list, page) { return list.slice((page - 1) * size, page * size); }
function keysetPage(list, afterId) { return list.filter(function (id) { return afterId === null || id < afterId; }).slice(0, size); }

var o1 = offsetPage(rows, 1);              // user opens page 1
var k1 = keysetPage(rows, null);
console.log('page 1 (both):', o1.join(','));

rows.unshift(14, 13);                      // two new orders arrive while the user reads
var o2 = offsetPage(rows, 2);              // user taps "next"
var k2 = keysetPage(rows, k1[k1.length - 1]);
console.log('offset page 2:', o2.join(','), ' <- repeats ' + o2.filter(function (id) { return o1.indexOf(id) >= 0; }).join(','));
console.log('keyset page 2:', k2.join(','), ' <- no repeats, nothing skipped');` }
  ],
  codeTitle: ['Offset vs keyset (runnable SQL)', 'Seek plan (runnable SQL)', 'size+1 trick (runnable SQL)', 'Opaque cursor (Java)', 'Spring Data options', 'Page drift (runnable)'],
  viz: [
    {
      title: 'Offset reads and discards rows; keyset seeks',
      input: 'page=3 size=5 total=30',
      inputLabel: 'page (1-6), size (2-6), total rows (up to 30)',
      gen: function (input) {
        var p = { page: 3, size: 5, total: 30 }, m, re = /(\w+)\s*=\s*(\d+)/g, s = String(input);
        while ((m = re.exec(s))) { if (p[m[1]] !== undefined) p[m[1]] = parseInt(m[2], 10); }
        if (p.size < 2 || p.size > 6) throw new Error('size must be 2-6');
        if (p.total < 10 || p.total > 30) throw new Error('total must be 10-30');
        if (p.page < 1 || p.page * p.size > p.total) throw new Error('page x size must be at most total');
        var ids = [], i;
        for (i = p.total; i >= 1; i--) ids.push(i);
        var off = (p.page - 1) * p.size, frames = [];
        frames.push({ narr: 'A table of <b>' + p.total + '</b> orders, newest first. The user wants <b>page ' + p.page + '</b> (' + p.size + ' rows per page).', parts: [{ type: 'array', label: 'orders sorted by created_at DESC, id DESC', values: ids, showIdx: true }] });
        if (off === 0) {
          frames.push({ narr: 'Page 1 is cheap for both styles: nothing to skip. Offset becomes expensive only for deeper pages. Try page=4.', parts: [{ type: 'array', label: 'rows read', values: ids, hl: (function () { var h = {}; for (var k = 0; k < p.size; k++) h[k] = 'ok'; return h; })() }] });
        }
        var skipped = {}, chunk;
        for (chunk = 0; chunk < p.page - 1; chunk++) {
          for (i = chunk * p.size; i < (chunk + 1) * p.size; i++) skipped[i] = 'bad';
          var hl1 = {}; for (var k1 in skipped) hl1[k1] = 'bad';
          frames.push({ narr: '<b>OFFSET ' + off + '</b>: the database walks the index in order and has to <i>count past</i> rows ' + (chunk * p.size + 1) + ' to ' + ((chunk + 1) * p.size) + '. Those rows are read, then thrown away. <span class="c-r">Wasted work: ' + ((chunk + 1) * p.size) + ' rows so far.</span>', parts: [{ type: 'array', label: 'OFFSET scan (red = read then discarded)', values: ids, hl: hl1, ptr: (function () { var q = {}; q[(chunk + 1) * p.size - 1] = 'scan'; return q; })() }, { type: 'vars', vals: { 'rows read': (chunk + 1) * p.size, 'rows returned': 0 }, hl: { 'rows read': 'bad' } }] });
        }
        var hl2 = {}; for (var k2 in skipped) hl2[k2] = 'bad';
        for (i = off; i < off + p.size; i++) hl2[i] = 'ok';
        frames.push({ narr: 'Now the <b>' + p.size + '</b> wanted rows (green) are returned. Total work: <b>' + (off + p.size) + '</b> rows read to return ' + p.size + '. For page 10,000 with size 20 that is 200,000 rows read for 20 returned.', parts: [{ type: 'array', label: 'OFFSET result', values: ids, hl: hl2 }, { type: 'vars', vals: { 'rows read': off + p.size, 'rows returned': p.size }, hl: { 'rows read': off ? 'bad' : 'ok', 'rows returned': 'ok' } }] });
        var lastSeen = ids[off - 1];
        var ptrK = {}; if (off > 0) ptrK[off - 1] = 'bookmark';
        frames.push({ narr: '<b>Keyset</b> starts differently: the client sends a bookmark' + (off > 0 ? ' — the last row it saw, <b>id ' + lastSeen + '</b>' : ' (none yet, this is page 1)') + '. The query says <code>WHERE (created_at, id) &lt; bookmark</code>. The B-tree index <b>jumps</b> straight to that spot.', parts: [{ type: 'array', label: 'KEYSET: index seek to the bookmark (nothing before it is touched)', values: ids, ptr: ptrK, hl: (function () { var h = {}; if (off > 0) h[off - 1] = 'sel'; return h; })() }, { type: 'vars', vals: { 'rows read': 0 } }] });
        var hl3 = {}; for (i = off; i < off + p.size; i++) hl3[i] = 'ok';
        frames.push({ narr: 'It reads just the next <b>' + p.size + '</b> rows in index order and stops (<code>LIMIT ' + p.size + '</code>). Rows read = rows returned = <b>' + p.size + '</b>, whether this is page 2 or page 20,000.', parts: [{ type: 'array', label: 'KEYSET result', values: ids, hl: hl3, ptr: ptrK }, { type: 'vars', vals: { 'rows read': p.size, 'rows returned': p.size }, hl: { 'rows read': 'ok' } }] });
        frames.push({ narr: 'Scoreboard for page <b>' + p.page + '</b>: offset reads <span class="c-r">' + (off + p.size) + '</span> rows, keyset reads <span class="c-g">' + p.size + '</span>. The gap widens linearly with the page number.', parts: [{ type: 'table', label: 'Rows read to return one page', columns: ['method', 'rows read', 'rows returned'], rows: [['OFFSET', off + p.size, p.size], ['KEYSET', p.size, p.size]], hl: { 0: off ? 'bad' : 'ok', 1: 'ok' } }] });
        return frames;
      }
    },
    {
      title: 'Page drift: new rows arrive between page 1 and page 2',
      input: 'insert=2',
      inputLabel: 'How many new orders are inserted while the user reads page 1? (0-4)',
      gen: function (input) {
        var m = /(\d+)/.exec(String(input)), k = m ? parseInt(m[1], 10) : 2;
        if (k < 0 || k > 4) throw new Error('Enter a number from 0 to 4');
        var size = 4, list = [12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1], frames = [], i;
        var p1 = list.slice(0, size);
        frames.push({ narr: 'The user opens <b>page 1</b> (newest first, 4 per page) and sees ids <b>' + p1.join(', ') + '</b>.', parts: [{ type: 'array', label: 'list at time 1', values: list, hl: { 0: 'ok', 1: 'ok', 2: 'ok', 3: 'ok' } }] });
        var nl = list.slice();
        for (i = 0; i < k; i++) nl.unshift(13 + i);
        frames.push({ narr: k ? '<b>' + k + '</b> new order(s) arrive and go to the top of the list. Everything else shifts down by ' + k + ' position(s).' : 'No new orders arrive, so both methods work perfectly. Try insert=2.', parts: [{ type: 'array', label: 'list at time 2', values: nl, hl: (function () { var h = {}; for (var j = 0; j < k; j++) h[j] = 'sel'; return h; })() }] });
        var o2 = nl.slice(size, 2 * size);
        var dup = {}; o2.forEach(function (id, idx) { if (p1.indexOf(id) >= 0) dup[idx] = 'bad'; else dup[idx] = 'ok'; });
        frames.push({ narr: '<b>OFFSET 4 LIMIT 4</b> counts 4 rows from the top of the <i>new</i> list, so it returns <b>' + o2.join(', ') + '</b>. ' + (k ? '<span class="c-r">Rows the user already saw appear again (red).</span>' : 'No repeats.'), parts: [{ type: 'array', label: 'offset page 2', values: o2, hl: dup }, { type: 'vars', vals: { 'duplicates shown': o2.filter(function (id) { return p1.indexOf(id) >= 0; }).length }, hl: { 'duplicates shown': k ? 'bad' : 'ok' } }] });
        var last = p1[p1.length - 1];
        var k2 = nl.filter(function (id) { return id < last; }).slice(0, size);
        frames.push({ narr: '<b>Keyset</b> asks for "rows with id &lt; ' + last + '" (the last row seen). New rows are above the bookmark, so they are ignored. Result: <b>' + k2.join(', ') + '</b> — no repeats, nothing skipped.', parts: [{ type: 'array', label: 'keyset page 2', values: k2, hl: { 0: 'ok', 1: 'ok', 2: 'ok', 3: 'ok' } }, { type: 'vars', vals: { 'duplicates shown': 0 }, hl: { 'duplicates shown': 'ok' } }] });
        frames.push({ narr: 'Deleting rows causes the opposite bug with offset: rows <i>move up</i> and one gets <b>skipped</b> forever. Keyset avoids both because the bookmark is a value, not a position. New items above the bookmark are simply found by refreshing from the top.', parts: [{ type: 'table', label: 'Summary', columns: ['event between pages', 'OFFSET', 'KEYSET'], rows: [['row inserted above', 'duplicate row shown', 'fine'], ['row deleted above', 'a row is skipped', 'fine'], ['same cost on page 1000?', 'no (slower)', 'yes']], hl: { 0: 'bad', 1: 'bad', 2: 'ok' } }] });
        return frames;
      }
    }
  ],
  examples: [
    {
      title: 'Convert an offset endpoint to keyset, step by step',
      html: `<p><b>Before:</b> <code>GET /orders?page=3&amp;size=5</code> → <code>… ORDER BY created_at DESC LIMIT 5 OFFSET 10</code>.</p>
      <ol>
        <li><b>Make the order unique:</b> add <code>id DESC</code> as a tie-breaker (many orders share a date).</li>
        <li><b>Index it:</b> <code>CREATE INDEX … ON orders (created_at, id)</code>.</li>
        <li><b>Change the API:</b> <code>GET /orders?limit=5&amp;after=&lt;cursor&gt;</code>; response <code>{ items: […], nextCursor: "…" }</code>.</li>
        <li><b>Query:</b> <code>WHERE (created_at, id) &lt; (:ts, :id) ORDER BY created_at DESC, id DESC LIMIT 6</code>; if 6 rows came back, drop the last and set <code>nextCursor</code> from the 5th.</li>
      </ol>
      <p>If your database lacks row-value comparison, write it long-hand: <code>created_at &lt; :ts OR (created_at = :ts AND id &lt; :id)</code>.</p>`,
      code: { lang: 'sql', db: 'shop', code: `-- long-hand version of the same keyset condition (works on every database)
SELECT id, created_at, total
FROM orders
WHERE created_at < '2026-03-07'
   OR (created_at = '2026-03-07' AND id < 21)
ORDER BY created_at DESC, id DESC
LIMIT 5;` }
    },
    {
      title: 'Why the tie-breaker is not optional',
      html: `<p>Orders 19, 20, 21 all have <code>created_at = 2026-03-07</code>. If you order only by <code>created_at</code> the database may return them in any order, and may return a <i>different</i> order for the next page query. With bookmark <code>created_at &lt; '2026-03-07'</code> you would skip the unseen ones with the same date; with <code>&lt;=</code> you would repeat the seen ones. Adding <code>id</code> makes every row's position unique, so "everything after this row" is well-defined.</p>`,
      code: { lang: 'sql', db: 'shop', code: `-- Three rows share one created_at. Without id as a second sort key their order is undefined.
SELECT id, created_at FROM orders WHERE created_at = '2026-03-07' ORDER BY id DESC;` }
    },
    {
      title: 'Sorting by something other than the id (score, price)',
      html: `<p>Keyset works for any sort as long as the key is unique with a tie-breaker: <code>ORDER BY price DESC, id DESC</code> → bookmark <code>(price, id)</code>. Mixed directions (<code>price DESC, name ASC</code>) cannot use a single row-value comparison; rewrite as OR conditions or negate numeric columns in an expression index. For user-selectable sorts on many columns, offset on small result sets is often the pragmatic choice. <b>NULL</b> sort values need explicit handling (<code>NULLS LAST</code> and a bookmark flag).</p>`
    },
    {
      title: 'Offset is still fine when…',
      html: `<p>Do not over-engineer. Offset is fine for <b>small tables</b> (a few thousand rows), admin screens where people jump to "page 7", and results already filtered to a handful of pages. A common production compromise: offset for the first few pages, a hard cap on depth (<code>page ≤ 100</code> or <code>offset ≤ 10,000</code>), and keyset (or a search engine's scroll/<code>search_after</code>) for anything deeper or for APIs and exports.</p>`
    }
  ],
  deepDive: `<p><b>Why OFFSET is O(offset):</b> the database has no way to jump to "the 4,000th row" in sorted order. It must walk the sorted index (or sort the rows) and count. Even with a perfect index, the walk is linear in the offset; without an index, it first sorts the whole result. This is also why <code>OFFSET 1000000</code> on a hot table is a classic production incident.</p>
  <p><b>Why keyset is O(log N + size):</b> a B-tree is sorted, so "first key less than (ts, id)" is a binary-search-like descent (a few page reads), after which a range scan reads <i>size</i> consecutive entries. This only works if the index order matches the query order exactly, including direction (PostgreSQL can scan an index backwards, so a single ascending index serves both <code>ASC</code> and <code>DESC</code>, but not mixed directions unless the index mixes them too).</p>
  <p><b>The COUNT problem:</b> <code>SELECT COUNT(*)</code> for "page 1 of 8,214" is a full scan (or index scan) on large tables in PostgreSQL because of MVCC. Options: drop the total ("load more"), cap it ("1000+"), use an approximate count (<code>pg_class.reltuples</code>), or cache it.</p>
  <p><b>Cursor design:</b> make cursors opaque and, if they cross a trust boundary, signed (HMAC) so clients cannot craft queries; version them so the format can change; include the sort/filters in the token or reject mismatches; give them an expiry if they encode snapshot state. For "previous page" reverse the comparison and the sort, fetch, then reverse the rows in memory.</p>
  <p><b>Consistency across pages:</b> keyset gives stable <i>ordering</i>, not a snapshot. A row updated so its sort key changes can still jump position. For exports that must be a consistent snapshot, run inside one repeatable-read transaction with a server-side cursor, or paginate by an immutable key (id) and a captured <code>max(id)</code> at start.</p>
  <p><b>Elsewhere:</b> Elasticsearch <code>search_after</code> (deep <code>from+size</code> is capped at 10,000), DynamoDB <code>LastEvaluatedKey</code>, GraphQL Relay cursor connections, Stripe/GitHub APIs (<code>starting_after</code>, <code>Link</code> headers) are all keyset. Prisma: <code>findMany({ take: 20, skip: 1, cursor: { id } , orderBy: { id: 'desc' } })</code>.</p>
  <p><b>Keyset and joins:</b> if you join one-to-many and paginate, the page is by <i>parent</i> rows. Fetch the page of parent ids first (keyset), then load children with an <code>IN</code> query – the same pattern that fixes N+1 with paging.</p>`,
  aiEra: `<p><b>What AI changes:</b> assistants default to <code>LIMIT ? OFFSET ?</code> and Spring's <code>Pageable</code> because that is what most tutorials show. Agents and LLM tools that consume your API (tool calls, MCP servers) love cursors: a stable "next" token lets a model walk a big dataset safely across multiple calls, whereas page numbers drift and burn context repeating rows. Designing list endpoints for machine consumers is now a normal requirement.</p>
  <p><b>Use AI as a partner:</b> ask <code>Convert this OFFSET query to keyset pagination with a (created_at, id) tie-breaker and give me the matching CREATE INDEX</code>; ask for property tests that insert rows between pages and assert no duplicates or gaps; ask it to generate EXPLAIN output interpretation.</p>
  <p><b>Where AI goes wrong:</b> it forgets the tie-breaker (so boundary rows vanish), uses <code>&lt;=</code> instead of <code>&lt;</code> (duplicates), builds the cursor from the page number, forgets to index, or mixes sort directions inside a row-value comparison (wrong results, not an error). It also tends to return raw ids as cursors without validation.</p>
  <p><b>What you must still own:</b> choosing offset vs keyset per endpoint, the sort key and index, cursor validation/signing, and tests that mutate data between pages.</p>`,
  problems: [
    {
      title: 'Convert an offset query to keyset with a tie-breaker',
      level: 'Medium', tags: ['pagination', 'keyset', 'SQL'], companies: ['Twitter', 'Shopify'],
      statement: `<p>The orders list uses <code>SELECT id, created_at, total FROM orders ORDER BY created_at DESC LIMIT 5 OFFSET 10</code>. Users report duplicates when scrolling, and page 5,000 takes seconds. Rewrite it as keyset pagination so the third page (rows 11-15) is produced from the last row of page 2, state the index you need, and explain what goes wrong if you forget the tie-breaker.</p>`,
      constraints: `Table: orders(id PK, customer_id, status, total, created_at). Many orders share the same created_at date. Runnable on the shop database (SQLite).`,
      example: `<p>Page 2 ends with <code>(created_at '2026-03-07', id 21)</code>. Page 3 must be ids ${H.c('g', '20, 19, 18, 17, 16')}.</p>`,
      brute: { why: `<p>Keep OFFSET and just add an index. The index lets the database avoid sorting, but it still must walk and discard <code>OFFSET</code> index entries, so deeper pages stay slower and rows still shift when data changes (duplicates/skips).</p>`, code: { lang: 'sql', db: 'shop', code: `SELECT id, created_at, total FROM orders ORDER BY created_at DESC, id DESC LIMIT 5 OFFSET 10;` } },
      mcq: { q: 'Why must the keyset ORDER BY include id when many rows share created_at?', options: ['It makes the query use less memory', 'Without a unique sort key, rows at the page boundary can be skipped or repeated', 'Because SQLite requires it', 'To avoid needing an index'], answer: 1, explain: 'A bookmark must identify exactly one position. With ties on created_at, "after this date" is ambiguous, so the unseen rows with the same date vanish (or seen rows repeat). The unique id breaks ties.' },
      hints: [
        `<p>Hint 1: replace "skip N rows" with "start after the last row I saw". What two values identify the last row of page 2 uniquely?</p>`,
        `<p>Hint 2: the sort key is the pair (created_at, id), both DESC. The condition for "rows after the bookmark" in a descending sort is "pair is smaller than the bookmark pair".</p>`,
        `<p>Hint 3: recipe: <code>WHERE (created_at, id) &lt; (:ts, :id) ORDER BY created_at DESC, id DESC LIMIT 5</code>, backed by <code>CREATE INDEX idx_orders_created_id ON orders (created_at, id)</code>; add a cursor token; request limit+1 to detect a next page.</p>`
      ],
      solution: {
        approach: `<p><b>Idea:</b> replace the positional "skip 10" by a value-based bookmark. The last row of page 2 is (created_at = 2026-03-07, id = 21). Because the sort is <code>created_at DESC, id DESC</code>, "rows after the bookmark" means rows whose pair is <i>smaller</i>: <code>WHERE (created_at, id) &lt; ('2026-03-07', 21)</code>. <b>Index:</b> <code>(created_at, id)</code> so the database can seek directly to the bookmark and read 5 entries in order, in O(log N + 5) regardless of how deep the page is. <b>Tie-breaker:</b> many orders share a date; if you sort only by <code>created_at</code>, the bookmark cannot tell which of several equal-date rows were already shown, so the boundary rows are skipped (using <code>&lt;</code>) or repeated (using <code>&lt;=</code>), and the database may even return equal rows in a different order on each run. Adding the unique <code>id</code> makes the order total. <b>API shape:</b> return <code>nextCursor</code> = Base64 of the last row's (created_at, id); request <code>limit + 1</code> rows to know whether more exist without a COUNT; validate the cursor (decode errors → HTTP 400). <b>Trade-off:</b> no random jump to page N; if the UI needs page numbers, keep offset only for shallow pages and cap the depth.</p>`,
        code: { lang: 'sql', db: 'shop', code: `SELECT id, created_at, total
FROM orders
WHERE (created_at, id) < ('2026-03-07', 21)
ORDER BY created_at DESC, id DESC
LIMIT 5;` },
        complexity: `<p>Per page: O(log N + size) with the composite index, versus O(offset + size) for OFFSET. Memory O(size).</p>`,
        followUps: ['How do you implement a "previous page" button with keyset?', 'How would you paginate when sorting by price DESC, name ASC?']
      }
    }
  ]
});
topics.push({
  title: 'Optimistic vs Pessimistic Locking',
  analogy: `<p>Two people edit the same shared document. <b>Pessimistic</b> is a <b>"checked-out" sign on the door</b>: you lock the document, everyone else waits in a queue until you finish. Safe, but slow if many people want it. <b>Optimistic</b> is <b>"everybody edits their own copy, and when saving we check that nobody changed it meanwhile"</b>: the document has a version number written at the top; if you try to save version 5 but the file is already on version 6, the save is rejected and you reload and redo your change. Fast when conflicts are rare, a little annoying when they are common.</p>`,
  explain: `<p><b>The problem: the lost update.</b> Two requests read the same row, each computes a new value, each writes it back. The second write silently overwrites the first.</p>
  ${H.table(['Time', 'Request A', 'Request B', 'balance in DB'], [
    ['1', 'reads balance = 500', '', '500'],
    ['2', '', 'reads balance = 500', '500'],
    ['3', 'writes 500 − 100 = 400', '', '400'],
    ['4', '', 'writes 500 − 50 = 450', '<span class="c-r">450 (A\'s −100 is lost!)</span>']
  ])}
  <p>Correct answer would be 350. Three ways to prevent it:</p>
  <ol>
    <li><b>Make it one atomic statement</b> — <code>UPDATE accounts SET balance = balance − 100 WHERE id = 1 AND balance ≥ 100</code>. No read in the app, no race. Use this whenever the change is a simple calculation. (Check the rows-affected count for the guard.)</li>
    <li><b>Optimistic locking</b> — add a <code>version</code> column. Read it with the row. Write with <code>UPDATE … SET …, version = version + 1 WHERE id = ? AND <b>version = ?</b></code>. If <b>0 rows</b> were updated, someone else changed it first: reload and retry, or return <code>409 Conflict</code>. No database locks are held while the user thinks. JPA: <code>@Version</code>.</li>
    <li><b>Pessimistic locking</b> — <code>SELECT … FOR UPDATE</code> locks the row until the transaction ends; other writers wait. JPA: <code>LockModeType.PESSIMISTIC_WRITE</code>. Use it when conflicts are frequent or retry is expensive or impossible.</li>
  </ol>
  ${H.table(['', 'Optimistic', 'Pessimistic'], [
    ['Assumes', 'Conflicts are <b>rare</b>', 'Conflicts are <b>common</b>'],
    ['Mechanism', 'Version check at write time', 'Row lock at read time'],
    ['Holds DB locks while thinking?', '<span class="c-g">No</span>', '<span class="c-r">Yes (until commit)</span>'],
    ['On conflict', 'Loser gets 0 rows updated → retry / 409', 'Loser waits (or fails fast with NOWAIT)'],
    ['Risks', 'Retry storms on hot rows; need retry logic', 'Blocking, lock waits, <b>deadlocks</b>, pool starvation'],
    ['Typical use', 'Web forms, profile edits, REST updates with ETag', 'Seat booking, inventory of a hot product, job claiming (<code>SKIP LOCKED</code>)']
  ])}
  <p><b>Rule of thumb:</b> start with an atomic update if the logic is a formula; use optimistic locking for user edits and normal CRUD; use pessimistic locks for hot, contended rows or work-queue claiming — keep those transactions tiny.</p>`,
  clues: [
    '"Two users edit the same record — the second one overwrites the first" — lost update',
    '"Balance went wrong under concurrent requests" / "stock went negative / oversold"',
    '"Add a version column", <code>@Version</code>, <code>OptimisticLockException</code>, HTTP <code>409/412</code> with <code>If-Match</code>',
    '"Only one worker should pick each job" → <code>SELECT … FOR UPDATE SKIP LOCKED</code>',
    '"Deadlock detected" in database logs — two transactions lock rows in opposite order',
    '"Reads are many, writes to the same row are rare" → optimistic; "flash sale on one SKU" → pessimistic or atomic update'
  ],
  code: [
    { lang: 'sql', db: 'shop', title: 'Runnable: optimistic update - the second writer loses', code: `-- Both transactions read: balance 500, version 0
-- Transaction A pays 100:
UPDATE accounts SET balance = 400, version = version + 1 WHERE id = 1 AND version = 0;
SELECT changes() AS rows_updated_by_A;      -- 1 : success

-- Transaction B (still holding the OLD version 0) tries to pay 50:
UPDATE accounts SET balance = 450, version = version + 1 WHERE id = 1 AND version = 0;
SELECT changes() AS rows_updated_by_B;      -- 0 : CONFLICT, B must reload and retry

SELECT id, balance, version FROM accounts WHERE id = 1;   -- 400, version 1 (A's write survived)` },
    { lang: 'sql', db: 'shop', title: 'Runnable: B retries with the fresh version', code: `-- A already committed (balance 400, version 1)
UPDATE accounts SET balance = 400, version = 1 WHERE id = 1;

-- B reloads, sees balance 400 / version 1, recomputes 400 - 50 = 350 and writes:
UPDATE accounts SET balance = 350, version = version + 1 WHERE id = 1 AND version = 1;
SELECT changes() AS rows_updated_by_B_retry;   -- 1

SELECT id, balance, version FROM accounts WHERE id = 1;   -- 350, version 2 (both payments kept)` },
    { lang: 'sql', db: 'shop', title: 'Runnable: atomic guarded update (no version needed)', code: `-- Decrement stock only if enough remains. One statement = no race, no oversell.
UPDATE stock SET qty = qty - 2, version = version + 1
WHERE product = 'laptop' AND qty >= 2
RETURNING product, qty;

-- Asking for too many: the guard fails, 0 rows are updated, the app answers "out of stock".
UPDATE stock SET qty = qty - 10 WHERE product = 'laptop' AND qty >= 10;
SELECT changes() AS rows_updated;       -- 0
SELECT product, qty FROM stock WHERE product = 'laptop';` },
    { lang: 'java', check: false, title: 'JPA: @Version and retry', code: `@Entity
class Account {
    @Id Long id;
    long balance;

    @Version                 // Hibernate adds "where id=? and version=?" and bumps it on every update
    int version;
}

@Service
class PaymentService {
    private final AccountRepo repo;
    PaymentService(AccountRepo repo) { this.repo = repo; }

    // Retry the WHOLE transaction (re-read, recompute, re-write) a few times on conflict.
    @Retryable(retryFor = ObjectOptimisticLockingFailureException.class,
               maxAttempts = 3, backoff = @Backoff(delay = 20, multiplier = 2, random = true))
    @Transactional
    public void pay(Long accountId, long amount) {
        Account a = repo.findById(accountId).orElseThrow();
        if (a.balance < amount) throw new IllegalStateException("insufficient funds");
        a.balance -= amount;            // flush => UPDATE ... WHERE id=? AND version=?
    }
}

// Pessimistic alternative: lock the row for the duration of the transaction.
interface AccountRepo extends JpaRepository<Account, Long> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)                     // SELECT ... FOR UPDATE
    @QueryHints(@QueryHint(name = "jakarta.persistence.lock.timeout", value = "3000"))
    @Query("select a from Account a where a.id = :id")
    Optional<Account> findForUpdate(@Param("id") Long id);
}` },
    { lang: 'java', title: 'Plain JDBC: optimistic update with retry', code: `import java.sql.*;

class AccountDao {
    static class ConflictException extends RuntimeException {
        ConflictException(String m) { super(m); }
    }

    /** One attempt: read balance+version, then write only if the version is unchanged. */
    static void payOnce(Connection con, long id, long amount) throws SQLException {
        long balance; int version;
        try (PreparedStatement r = con.prepareStatement("SELECT balance, version FROM accounts WHERE id = ?")) {
            r.setLong(1, id);
            try (ResultSet rs = r.executeQuery()) {
                if (!rs.next()) throw new IllegalArgumentException("no such account");
                balance = rs.getLong(1);
                version = rs.getInt(2);
            }
        }
        if (balance < amount) throw new IllegalStateException("insufficient funds");
        try (PreparedStatement w = con.prepareStatement(
                "UPDATE accounts SET balance = ?, version = version + 1 WHERE id = ? AND version = ?")) {
            w.setLong(1, balance - amount);
            w.setLong(2, id);
            w.setInt(3, version);
            if (w.executeUpdate() == 0) throw new ConflictException("row changed by someone else");
        }
    }

    /** Retry the whole read-modify-write a few times with a small growing pause. */
    static void pay(Connection con, long id, long amount) throws Exception {
        for (int attempt = 1; ; attempt++) {
            try { payOnce(con, id, amount); return; }
            catch (ConflictException e) {
                if (attempt == 3) throw e;             // give up: surface as HTTP 409
                Thread.sleep(20L * attempt);
            }
        }
    }
}` },
    { lang: 'sql', check: false, title: 'PostgreSQL: pessimistic locking variants', code: `BEGIN;
SELECT balance FROM accounts WHERE id = 1 FOR UPDATE;          -- wait until the row is free, then lock it
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
COMMIT;

-- Fail immediately instead of waiting:
SELECT * FROM accounts WHERE id = 1 FOR UPDATE NOWAIT;          -- error 55P03 if locked

-- Work-queue claiming: each worker takes DIFFERENT jobs without blocking each other
SELECT id FROM jobs WHERE status = 'NEW'
ORDER BY id LIMIT 10
FOR UPDATE SKIP LOCKED;` },
    { lang: 'js', run: true, title: 'Runnable: two racing writers with and without a version check', code: `// A tiny in-memory "row" with a version, shared by two interleaved transactions.
function makeRow() { return { balance: 500, version: 0 }; }

// Without a check: last writer wins -> lost update
var row = makeRow();
var aRead = { balance: row.balance }, bRead = { balance: row.balance };   // both read 500
row.balance = aRead.balance - 100;                                         // A writes 400
row.balance = bRead.balance - 50;                                          // B writes 450 (A lost!)
console.log('no version check  ->', row.balance, '(expected 350)');

// With a version check: UPDATE ... WHERE version = ?
function update(r, newBalance, expectedVersion) {
  if (r.version !== expectedVersion) return 0;      // 0 rows affected = conflict
  r.balance = newBalance; r.version++; return 1;
}
row = makeRow();
var a = { balance: row.balance, version: row.version };
var b = { balance: row.balance, version: row.version };
console.log('A updates:', update(row, a.balance - 100, a.version));   // 1
console.log('B updates:', update(row, b.balance - 50, b.version));    // 0 -> conflict
b = { balance: row.balance, version: row.version };                   // B reloads
console.log('B retry  :', update(row, b.balance - 50, b.version));    // 1
console.log('with version check ->', row.balance, 'version', row.version);` }
  ],
  codeTitle: ['Optimistic: loser gets 0 rows (runnable SQL)', 'Retry with fresh version (runnable SQL)', 'Atomic guarded update (runnable SQL)', 'JPA @Version and pessimistic lock', 'JDBC optimistic retry', 'PostgreSQL FOR UPDATE variants', 'Race simulation (runnable)'],
  viz: [
    {
      title: 'Two transactions race: the version check makes one lose',
      input: 'balance=500 a=100 b=50',
      inputLabel: 'balance, a (amount A pays), b (amount B pays)',
      gen: function (input) {
        var p = { balance: 500, a: 100, b: 50 }, m, re = /(\w+)\s*=\s*(\d+)/g, s = String(input);
        while ((m = re.exec(s))) { if (p[m[1]] !== undefined) p[m[1]] = parseInt(m[2], 10); }
        if (p.balance < 1 || p.balance > 100000) throw new Error('balance must be 1-100000');
        if (p.a + p.b > p.balance) throw new Error('a + b must not exceed balance');
        var cols = ['step', 'Transaction A', 'Transaction B', 'row in database (balance, version)'];
        var rows = [], frames = [];
        function add(r, note, hl, vars) { rows.push(r); var h = {}, k; for (k = 0; k < rows.length - 1; k++) h[k] = 'done'; h[rows.length - 1] = hl; for (k in (vars || {})) { } frames.push({ narr: note, parts: [{ type: 'table', label: 'Timeline', columns: cols, rows: rows.map(function (x) { return x.slice(); }), hl: h }].concat(vars ? [{ type: 'vars', vals: vars.vals, hl: vars.hl }] : []) }); }
        var A = p.balance - p.a, B = p.balance - p.b, both = p.balance - p.a - p.b;
        add(['1. both read', 'SELECT → balance ' + p.balance + ', version 0', 'SELECT → balance ' + p.balance + ', version 0', p.balance + ', v0'], 'Both requests load the same row at about the same time. Each remembers the <b>version it saw: 0</b>.', 'cur');
        add(['2. A writes', 'UPDATE … SET balance=' + A + ', version=1 WHERE id=1 <b>AND version=0</b> → <span class="c-g">1 row</span>', 'thinking…', A + ', v1'], 'A is first. Its <code>WHERE version = 0</code> still matches, so the update succeeds and bumps the version to <b>1</b>.', 'ok', { vals: { 'rows updated (A)': 1 }, hl: { 'rows updated (A)': 'ok' } });
        add(['3. B writes', 'committed', 'UPDATE … SET balance=' + B + ', version=1 WHERE id=1 <b>AND version=0</b> → <span class="c-r">0 rows</span>', A + ', v1'], 'B tries with the old version 0. The row is now at version 1, so <code>WHERE version = 0</code> matches <b>nothing</b>. Zero rows updated means: <span class="c-r">someone changed it first</span>. B did <b>not</b> overwrite A.', 'bad', { vals: { 'rows updated (B)': 0 }, hl: { 'rows updated (B)': 'bad' } });
        add(['4. B retries: reload', '-', 'SELECT → balance ' + A + ', version 1', A + ', v1'], 'B reacts to the conflict: it <b>reloads</b> the row (fresh balance and version 1) and recomputes its change from the new state. (An API could return <code>409 Conflict</code> instead.)', 'cur');
        add(['5. B writes again', 'done', 'UPDATE … SET balance=' + both + ', version=2 WHERE id=1 AND version=1 → <span class="c-g">1 row</span>', both + ', v2'], 'The retry matches version 1 and succeeds. Final balance <b>' + both + '</b> = ' + p.balance + ' − ' + p.a + ' − ' + p.b + '. Both payments are kept.', 'ok', { vals: { 'final balance': both, 'version': 2 }, hl: { 'final balance': 'ok' } });
        add(['(without version check)', 'writes ' + A, 'writes ' + B + ' <span class="c-r">overwrites A</span>', '<span class="c-r">' + B + '</span> (A\'s ' + p.a + ' lost)'], 'For comparison, <b>without</b> the version check the last write wins and the final balance would be <b>' + B + '</b> instead of ' + both + '. That is the <b>lost update</b> bug.', 'bad', { vals: { 'expected': both, 'actual without check': B }, hl: { 'actual without check': 'bad' } });
        return frames;
      }
    },
    {
      title: 'Pessimistic lock: the second transaction waits',
      input: 'balance=500 a=100 b=50',
      inputLabel: 'balance, a, b',
      gen: function (input) {
        var p = { balance: 500, a: 100, b: 50 }, m, re = /(\w+)\s*=\s*(\d+)/g, s = String(input);
        while ((m = re.exec(s))) { if (p[m[1]] !== undefined) p[m[1]] = parseInt(m[2], 10); }
        if (p.balance < 1 || p.balance > 100000) throw new Error('balance must be 1-100000');
        if (p.a + p.b > p.balance) throw new Error('a + b must not exceed balance');
        var cols = ['step', 'Transaction A', 'Transaction B', 'row lock', 'balance'];
        var A = p.balance - p.a, both = p.balance - p.a - p.b;
        var rows = [
          ['1. A locks', 'SELECT … FOR UPDATE → gets balance ' + p.balance, 'idle', 'held by A', p.balance],
          ['2. B tries', 'computing…', 'SELECT … FOR UPDATE → <span class="c-y">WAITING</span>', 'held by A (B queued)', p.balance],
          ['3. A writes', 'UPDATE balance=' + A, 'still waiting', 'held by A', A],
          ['4. A commits', 'COMMIT → lock released', 'wakes up', 'free', A],
          ['5. B gets lock', 'done', 'FOR UPDATE returns balance ' + A + ' (fresh!)', 'held by B', A],
          ['6. B writes + commits', 'done', 'UPDATE balance=' + both + '; COMMIT', 'free', both]
        ];
        var notes = [
          'A runs <code>SELECT … FOR UPDATE</code>. The database <b>locks the row</b> for A until A\'s transaction ends.',
          'B runs the same statement. The row is locked, so B simply <b>waits</b> (it holds a connection and a thread the whole time). With <code>NOWAIT</code> it would fail immediately; with a lock timeout it would fail after N seconds.',
          'A does its update. B is still blocked. Nobody can read-modify-write this row in the meantime, so a lost update is impossible.',
          'A commits and releases the lock. The database wakes B.',
          'B\'s <code>SELECT</code> now returns the <b>fresh</b> balance (' + A + '), not the old one. No version check or retry needed.',
          'B writes ' + both + ' and commits. Both payments kept. The price: B <b>waited</b>, held a connection while waiting, and if A and B had locked two rows in opposite orders they could have caused a <span class="c-r">deadlock</span>.'
        ];
        var frames = [];
        for (var i = 0; i < rows.length; i++) {
          var h = {}; for (var k = 0; k < i; k++) h[k] = 'done'; h[i] = (i === 1) ? 'cur' : 'ok';
          frames.push({ narr: notes[i], parts: [{ type: 'table', label: 'Pessimistic timeline', columns: cols, rows: rows.slice(0, i + 1), hl: h }, { type: 'vars', vals: { 'B waiting': i >= 1 && i <= 3 ? 'yes' : 'no', 'lost update possible': 'no' }, hl: { 'B waiting': i >= 1 && i <= 3 ? 'cur' : 'ok' } }] });
        }
        return frames;
      }
    }
  ],
  examples: [
    {
      title: 'Atomic update beats both when the change is a formula',
      html: `<p>For counters, balances and stock, do not read in Java and write back. Let the database do the arithmetic and enforce the rule in the same statement. The <code>WHERE qty &gt;= ?</code> guard prevents overselling, and the rows-affected count tells you whether it worked.</p>`,
      code: { lang: 'sql', db: 'shop', code: `UPDATE accounts SET balance = balance - 100, version = version + 1
WHERE id = 1 AND balance >= 100;
SELECT changes() AS paid;       -- 1 = ok, 0 = insufficient funds
SELECT id, balance FROM accounts WHERE id = 1;` }
    },
    {
      title: 'HTTP with optimistic locking: ETag and If-Match',
      html: `<p>Optimistic locking extends to the web: <code>GET /orders/7</code> returns <code>ETag: "v5"</code> (the version). The client edits and sends <code>PUT /orders/7</code> with <code>If-Match: "v5"</code>. If the row is now at v6, the server answers <code>412 Precondition Failed</code> (or 409 Conflict) and the UI says "someone else changed this; reload". This protects <i>human think time</i> — something a database lock should never cover.</p>`,
      code: { lang: 'http', code: `PUT /orders/7 HTTP/1.1
If-Match: "5"
Content-Type: application/json

{"status":"SHIPPED"}

HTTP/1.1 412 Precondition Failed
Content-Type: application/problem+json

{"title":"Order was modified by someone else","detail":"Reload and try again"}` }
    },
    {
      title: 'Deadlock: why lock order matters',
      html: `<p>Transaction 1 locks account 1 then wants account 2. Transaction 2 locks account 2 then wants account 1. Each waits for the other forever; the database detects it after a moment and kills one with <i>deadlock detected</i>. <b>Prevention:</b> always lock rows in a consistent order (e.g. by ascending id), keep transactions short, and retry the victim. This is the usual shape of money transfers.</p>`,
      code: { lang: 'java', check: false, code: `@Transactional
public void transfer(Long from, Long to, long amount) {
    // Lock both rows in a fixed order (smaller id first) so two opposite transfers cannot deadlock
    Long first = Math.min(from, to), second = Math.max(from, to);
    Account a1 = repo.findForUpdate(first).orElseThrow();
    Account a2 = repo.findForUpdate(second).orElseThrow();
    Account src = a1.getId().equals(from) ? a1 : a2;
    Account dst = src == a1 ? a2 : a1;
    src.debit(amount);
    dst.credit(amount);
}` }
    },
    {
      title: 'Claiming jobs with SKIP LOCKED',
      html: `<p>Ten workers poll a <code>jobs</code> table. With plain <code>FOR UPDATE</code> they all queue behind the same first row. With <code>FOR UPDATE SKIP LOCKED</code> each worker silently skips rows locked by others and takes the next free ones, so the table behaves like a queue without any broker. PostgreSQL, MySQL 8 and Oracle support it. Mark the job <code>IN_PROGRESS</code> in the same transaction and commit quickly.</p>`
    }
  ],
  deepDive: `<p><b>What the database already does for you:</b> inside one statement, an <code>UPDATE</code> locks the rows it changes (row-level lock) until commit, so <code>SET balance = balance − 100</code> is safe. The race happens only when your <i>application</i> splits "read" and "write" into separate statements. Isolation levels matter: under READ COMMITTED (PostgreSQL's default) two transactions can both read 500 and both write; under REPEATABLE READ (MySQL's default) PostgreSQL aborts the second writer with a serialization error; under SERIALIZABLE the database detects dangerous patterns and aborts one — then <i>you</i> must retry. Optimistic locking is "do your own serialization check, on the cheap".</p>
  <p><b>Hibernate details:</b> <code>@Version</code> supports <code>int/long/short</code> or <code>Timestamp/Instant</code> (numbers are safer; clocks can collide). The version also guards <b>deletes</b>. Entities modified through bulk JPQL updates bypass versioning unless you write <code>set version = version + 1</code>. <code>OPTIMISTIC_FORCE_INCREMENT</code> bumps a parent's version when only a child changes (aggregate-wide locking in DDD). A detached entity merged with an old version fails — that is the web-form scenario.</p>
  <p><b>Retry policy:</b> optimistic retries must re-run the <i>whole</i> unit of work (re-read, re-validate business rules, re-compute) — never just re-issue the same UPDATE. Use small bounded retries with jittered backoff; on a hot row, retries multiply load ("retry storm"). If conflict rates exceed ~5-10%, the row is hot: switch to an atomic update, a pessimistic lock, sharding the counter (many rows summed later), or a queue that serializes writes.</p>
  <p><b>Pessimistic costs:</b> a transaction holding a lock holds a pooled connection. If it makes a remote call while locked, throughput of that row drops to 1 / call-time. Set <code>lock_timeout</code>, keep the locked section to read-modify-write only, and never lock during user think time. <code>SELECT FOR UPDATE</code> on a range can create gap locks in MySQL InnoDB, blocking inserts.</p>
  <p><b>Distributed variants:</b> across services or databases there is no single row lock. Options: conditional writes (DynamoDB <code>ConditionExpression</code>, Redis <code>WATCH</code>/Lua), compare-and-set on a version, or a distributed lock with a fencing token (never rely on a lease alone, a paused process can wake up and act on an expired lease). Etag-style versions generalize everywhere.</p>
  <p><b>Testing:</b> concurrency bugs need concurrency tests. Use two threads with a <code>CountDownLatch</code> so both read before either writes, and assert exactly one succeeds the first time and the final value is correct after retries. Add a database constraint (<code>CHECK (qty &gt;= 0)</code>) as the last line of defence.</p>`,
  aiEra: `<p><b>What AI changes:</b> AI-generated CRUD code is almost always "load entity, change field, save" — a textbook lost update. Agents that call your API in parallel (many tool calls at once) raise the conflict rate on rows that used to be touched by one human at a time. Idempotency keys and version/ETag checks become a protocol for machine clients, not just a nicety.</p>
  <p><b>Use AI as a partner:</b> ask <code>Find read-modify-write sequences in this service that could lose updates</code>; ask for a two-thread test that forces the interleaving; ask it to convert a JPA entity to use <code>@Version</code> and show the expected SQL; ask for a lock-ordering review of a transfer method.</p>
  <p><b>Where AI goes wrong:</b> it adds <code>synchronized</code> in Java (useless across multiple app instances), wraps everything in SERIALIZABLE without retries, catches the optimistic exception and silently ignores it, retries only the UPDATE with the same stale version, or uses timestamps as versions (collisions). It rarely mentions deadlock ordering.</p>
  <p><b>What you must still own:</b> choosing the strategy per entity based on contention, defining the retry/409 behaviour in the API contract, the lock order, and a concurrency test that fails without the guard.</p>`,
  problems: [
    {
      title: 'Prevent overselling with optimistic locking',
      level: 'Medium', tags: ['optimistic locking', 'version column', 'SQL'], companies: ['Amazon', 'Flipkart'],
      statement: `<p>The <code>stock</code> table has <code>(product, qty, version)</code>. Two customers each buy 3 laptops at the same moment when only 5 remain. The current code reads <code>qty</code>, checks <code>qty &gt;= 3</code>, and writes <code>qty - 3</code>. Both pass the check and the stock becomes 2 (should be impossible). Write an update that uses the version column so exactly one buyer succeeds, show how the loser detects the conflict, and say what the loser should do.</p>`,
      constraints: `Runnable on the shop database (SQLite). Row: ('laptop', qty 5, version 7). Report rows affected with <code>changes()</code>.`,
      example: `<p>Both read (qty 5, v7). Buyer 1: ${H.c('g', 'UPDATE … WHERE version = 7 → 1 row, qty 2, v8')}. Buyer 2: ${H.c('r', 'UPDATE … WHERE version = 7 → 0 rows')} → reload (qty 2) → "only 2 left" → refuse.</p>`,
      brute: { why: `<p>Read-check-write in application code: <code>if (qty &gt;= 3) save(qty - 3)</code>. Between the read and the write the other request commits, so both pass the check on stale data and the final stock is 2 although 6 units were sold from 5.</p>`, code: { lang: 'sql', db: 'shop', code: `SELECT qty FROM stock WHERE product = 'laptop';
UPDATE stock SET qty = 5 - 3 WHERE product = 'laptop';
UPDATE stock SET qty = 5 - 3 WHERE product = 'laptop';
SELECT product, qty FROM stock WHERE product = 'laptop';` } },
      mcq: { q: 'Buyer 2\'s UPDATE ... WHERE version = 7 reports 0 rows affected. What does that mean and what next?', options: ['The product does not exist; return 404', 'Someone else changed the row first; reload, re-check the rule, retry or return 409', 'The database is down; ignore it', 'Success; the stock was already correct'], answer: 1, explain: 'Zero rows means the WHERE clause (id and the expected version) no longer matches: another transaction bumped the version. The loser must reload the current state, re-run the business check, and retry or report a conflict/out of stock.' },
      hints: [
        `<p>Hint 1: the bug is the gap between reading the quantity and writing it. Something must make the write fail if the row changed in that gap.</p>`,
        `<p>Hint 2: include the version you read in the UPDATE's WHERE clause and increment it in the SET. Then check how many rows were updated.</p>`,
        `<p>Hint 3: recipe: <code>UPDATE stock SET qty = qty - 3, version = version + 1 WHERE product = ? AND version = ? AND qty &gt;= 3</code>; rows = 1 → sold; rows = 0 → reload and decide (retry if enough stock remains, else "out of stock"). An atomic <code>qty &gt;= 3</code> guard alone is even simpler.</p>`
      ],
      solution: {
        approach: `<p><b>Root cause:</b> check-then-act across two statements. <b>Fix:</b> make the write conditional on the state you based your decision on. Read <code>(qty, version)</code>; compute the new qty in code; then run <code>UPDATE stock SET qty = ?, version = version + 1 WHERE product = ? AND version = ?</code> and look at the affected row count. Exactly one of two concurrent buyers matches <code>version = 7</code>; the other gets <b>0 rows</b> because the winner already bumped the version to 8. <b>What the loser does:</b> reload the row (qty 2, version 8), re-run the business rule (<code>qty &gt;= 3</code> is now false) and answer "only 2 left" — or, if enough stock remained, retry the whole read-modify-write with the new version, with a small bounded number of attempts and jittered backoff. If retries are exhausted, return HTTP 409 so the client can try again. <b>Even simpler for a formula:</b> one atomic statement <code>UPDATE stock SET qty = qty - 3 WHERE product = ? AND qty &gt;= 3</code> needs no version at all, because the check and the write happen under the same row lock; use the version when you also protect other fields or user edits. Add <code>CHECK (qty &gt;= 0)</code> as a last safety net, and write a two-thread test that makes both buyers read first.</p>`,
        code: { lang: 'sql', db: 'shop', code: `-- Buyer 1 and buyer 2 both read: qty 5, version 7
UPDATE stock SET qty = 5 - 3, version = version + 1 WHERE product = 'laptop' AND version = 7;
SELECT changes() AS buyer1_rows;     -- 1

UPDATE stock SET qty = 5 - 3, version = version + 1 WHERE product = 'laptop' AND version = 7;
SELECT changes() AS buyer2_rows;     -- 0  -> conflict: reload, qty is 2, refuse the sale

SELECT product, qty, version FROM stock WHERE product = 'laptop';   -- laptop, 2, 8` },
        complexity: `<p>O(1) per attempt (primary-key lookup). Expected attempts ≈ 1 + conflict rate; bounded by the retry limit.</p>`,
        followUps: ['What if 1,000 buyers hit the same SKU in one second?', 'How would you do this with Redis or DynamoDB?']
      }
    }
  ]
});
topics.push({
  title: 'Read Replicas from Code and Read-Your-Writes',
  analogy: `<p>A famous author (the <b>primary</b>) writes the only master copy of a book. Branch libraries (<b>replicas</b>) get photocopies that arrive a little later, by courier. Readers can borrow from any branch, so the author is not swamped — but if you just told the author to fix page 12 and you walk into a branch one minute later, you may still read the <i>old</i> page 12. For your own changes, you should ask the author's desk (or a branch you know is up to date).</p>`,
  explain: `<p>One database server can only handle so many queries. Most apps read far more than they write (often 10:1 or more), so a common way to scale is a <b>primary</b> that accepts all writes and one or more <b>read replicas</b> that copy the primary's changes and serve <code>SELECT</code>s.</p>
  <p><b>The catch is replication lag.</b> Replicas apply changes asynchronously, usually within milliseconds, but under load or during long queries/large transactions it can grow to seconds or minutes. So a replica may return <i>stale</i> data.</p>
  ${H.table(['Time', 'Action', 'Result'], [
    ['t = 0', 'User saves profile (goes to primary)', 'primary has the new name'],
    ['t = 0.05 s', 'Page reloads, read goes to a replica', '<span class="c-r">old name shown</span> (change has not arrived yet)'],
    ['t = 0.3 s', 'Replica catches up', 'new name, too late']
  ])}
  <p>The guarantee users expect is <b>read-your-writes</b>: after I change something, <i>I</i> must see it. Other people can be a bit behind (eventual consistency) — that is usually fine.</p>
  <p><b>Routing from code — safe rules:</b></p>
  <ol>
    <li><b>All writes and anything inside a read-write transaction go to the primary.</b> Only methods marked read-only may use a replica (Spring: <code>@Transactional(readOnly = true)</code> + a routing DataSource).</li>
    <li><b>Read-your-writes:</b> after a user writes, send <i>that user's</i> reads to the primary for a short window (e.g. 5 seconds, longer than typical lag), or compare positions (PostgreSQL LSN / MySQL GTID) and only use a replica that has caught up to the write.</li>
    <li><b>Critical reads go to the primary:</b> balance checks before payment, stock before purchase, login/permission checks right after a role change, anything feeding a write decision.</li>
    <li><b>Monitor lag</b> and stop using a replica that is too far behind (health check with a max-lag threshold, fall back to the primary).</li>
    <li><b>Separate connection pools</b> for primary and replicas, sized separately.</li>
  </ol>
  <p>Replicas also give you <b>failover</b> (promote one if the primary dies) and a safe place for reports and analytics — but a replica is <i>not a backup</i>: a bad <code>DELETE</code> replicates too.</p>`,
  clues: [
    '"I updated my profile and the page still shows the old value (refresh fixes it)" — replica lag, read-your-writes',
    '"Scale reads", "database CPU is 90% with 95% SELECT traffic" → read replicas',
    '"Reports are slowing down the production database" → send them to a replica',
    '"Replica lag is 40 seconds" — long transaction / big batch on primary, or replica under-provisioned',
    '"Order created, but the next page says order not found" — read after write on a replica',
    '"Design for read-heavy 100:1 traffic" — replicas + cache; mention consistency trade-offs'
  ],
  code: [
    { lang: 'java', check: false, title: 'Spring: route read-only transactions to a replica', code: `import org.springframework.jdbc.datasource.lookup.AbstractRoutingDataSource;
import org.springframework.transaction.support.TransactionSynchronizationManager;

// Picks the DataSource per call: replica for read-only transactions, primary otherwise.
class ReadWriteRoutingDataSource extends AbstractRoutingDataSource {
    @Override
    protected Object determineCurrentLookupKey() {
        boolean readOnly = TransactionSynchronizationManager.isCurrentTransactionReadOnly();
        return readOnly && !PinToPrimary.isPinned() ? "replica" : "primary";
    }
}

@Configuration
class DataSourceConfig {
    @Bean
    DataSource dataSource(@Qualifier("primaryPool") DataSource primary,
                          @Qualifier("replicaPool") DataSource replica) {
        ReadWriteRoutingDataSource routing = new ReadWriteRoutingDataSource();
        routing.setTargetDataSources(Map.of("primary", primary, "replica", replica));
        routing.setDefaultTargetDataSource(primary);          // safe default
        return new LazyConnectionDataSourceProxy(routing);    // decide AFTER the readOnly flag is set
    }
}

@Service
class ProfileService {
    @Transactional                       // read-write -> primary
    public void rename(Long userId, String name) { /* update */ }

    @Transactional(readOnly = true)      // read-only -> replica (unless pinned)
    public Profile view(Long userId) { /* select */ return null; }
}` },
    { lang: 'java', title: 'Read-your-writes: pin a user to the primary for a short window', code: `import java.util.concurrent.ConcurrentHashMap;

class PinToPrimary {
    private static final ThreadLocal<Boolean> FORCE = new ThreadLocal<>();
    static boolean isPinned() { return Boolean.TRUE.equals(FORCE.get()); }
    static void set(boolean v) { if (v) FORCE.set(true); else FORCE.remove(); }
}

class RecentWrites {
    private static final long WINDOW_MS = 5_000;               // longer than normal replica lag
    private final ConcurrentHashMap<String, Long> lastWrite = new ConcurrentHashMap<>();

    /** Call after any successful write by this user. */
    void recordWrite(String userId) { lastWrite.put(userId, System.currentTimeMillis()); }

    /** True when this user's reads must go to the primary. */
    boolean mustUsePrimary(String userId) {
        Long t = lastWrite.get(userId);
        if (t == null) return false;
        if (System.currentTimeMillis() - t > WINDOW_MS) { lastWrite.remove(userId); return false; }
        return true;
    }

    public static void main(String[] args) throws Exception {
        RecentWrites rw = new RecentWrites();
        rw.recordWrite("asha");
        System.out.println(rw.mustUsePrimary("asha"));   // true  (just wrote)
        System.out.println(rw.mustUsePrimary("ben"));    // false (no recent write)
    }
}` },
    { lang: 'sql', check: false, title: 'PostgreSQL: measure lag and compare positions', code: `-- On the replica: how far behind is it?
SELECT now() - pg_last_xact_replay_timestamp() AS replication_lag;

-- On the primary right after a write: remember the log position (LSN)
SELECT pg_current_wal_lsn();               -- e.g. 0/3000148

-- On a replica: has it replayed at least that position? Only then read from it.
SELECT pg_last_wal_replay_lsn() >= '0/3000148'::pg_lsn AS caught_up;` },
    { lang: 'yaml', title: 'Two pools, secrets from environment', code: `datasource:
  primary:
    url: \${PRIMARY_DB_URL}
    username: \${DB_USER}
    password: \${DB_PASSWORD}
    hikari: { maximum-pool-size: 10, pool-name: primary-pool }
  replica:
    url: \${REPLICA_DB_URL}          # a read-only endpoint / load balancer over replicas
    username: \${DB_READONLY_USER}   # a user that can only SELECT
    password: \${DB_READONLY_PASSWORD}
    hikari: { maximum-pool-size: 20, pool-name: replica-pool, read-only: true }` },
    { lang: 'js', run: true, title: 'Runnable: stale read vs read-your-writes', code: `// Simulated primary/replica pair; replication applies a write after "lag" ms.
var primary = { name: 'Old name' }, replica = { name: 'Old name' }, now = 0;
var pending = [];
function write(v) { primary.name = v; pending.push({ at: now + 200, v: v }); }   // lag = 200 ms
function tick(t) { now = t; pending = pending.filter(function (p) { if (p.at <= now) { replica.name = p.v; return false; } return true; }); }

var lastWriteAt = -Infinity, WINDOW = 1000;
function read() {
  var usePrimary = now - lastWriteAt < WINDOW;     // read-your-writes window
  return (usePrimary ? primary : replica).name + (usePrimary ? '  [primary]' : '  [replica]');
}

write('New name'); lastWriteAt = now;
tick(50);  console.log('t=50   read ->', read());
tick(300); console.log('t=300  read ->', read());
tick(1500); console.log('t=1500 read ->', read(), '(window over, replica is caught up)');

// Without the window, a replica read at t=50 would have returned the old value:
console.log('stale replica value at t=50 would be: Old name');` }
  ],
  codeTitle: ['Routing DataSource (Spring)', 'Recent-writes window (Java)', 'Measure lag (PostgreSQL)', 'Two pools (YAML)', 'Stale vs fresh (runnable)'],
  viz: {
    title: 'Primary and replica with lag: stale read vs read-your-writes',
    input: 'lag=2 pin=no',
    inputLabel: 'lag in seconds (1-5), pin = yes/no (send my reads to the primary after I write)',
    gen: function (input) {
      var s = String(input), lag = 2, pin = false, m;
      if ((m = /lag\s*=\s*(\d+)/.exec(s))) lag = parseInt(m[1], 10);
      if (/pin\s*=\s*(yes|true|y)/i.test(s)) pin = true;
      if (lag < 1 || lag > 5) throw new Error('lag must be 1-5');
      function g(ehl, hl, tags) {
        return { type: 'graph', directed: true, height: 50, nodes: [
          { id: 'U', label: 'User / App', x: 10, y: 25, shape: 'box' },
          { id: 'P', label: 'Primary (writes)', x: 52, y: 8, shape: 'box', w: 24 },
          { id: 'R', label: 'Replica (reads)', x: 52, y: 42, shape: 'box', w: 24 },
          { id: 'X', label: 'Replica 2', x: 88, y: 42, shape: 'box' }
        ], edges: [['U', 'P', 'write'], ['U', 'R', 'read'], ['P', 'R', 'replicate'], ['P', 'X', 'replicate']], ehl: ehl || {}, hl: hl || {}, tags: tags || {} };
      }
      var f = [];
      f.push({ narr: 'Setup: all writes go to the <b>primary</b>. It copies changes to replicas asynchronously. Replication lag today: <b>' + lag + ' s</b>. The user\'s name is "Old name" everywhere.', parts: [g({}, {}, { P: 'Old name', R: 'Old name' }), { type: 'vars', vals: { time: '0 s', 'replica lag': lag + ' s' } }] });
      f.push({ narr: '<b>t = 0:</b> the user renames themselves to "New name". The app sends the <code>UPDATE</code> to the <b>primary</b>. It commits immediately.', parts: [g({ 'U-P': 'ok' }, { P: 'ok' }, { P: 'New name', R: 'Old name' }), { type: 'vars', vals: { time: '0 s' } }] });
      f.push({ narr: 'The primary starts sending the change to the replicas, but it is still travelling / being applied. Replicas are <b>' + lag + ' s</b> behind.', parts: [g({ 'P-R': 'cur', 'P-X': 'cur' }, { P: 'ok' }, { P: 'New name', R: 'Old name (change in flight)' }), { type: 'vars', vals: { time: '0.2 s' } }] });
      if (pin) {
        f.push({ narr: '<b>t = 0.2 s:</b> the page reloads and reads the profile. The app remembers "this user wrote less than 5 seconds ago" so it routes the read to the <b>primary</b>. The user sees <span class="c-g">New name</span>.', parts: [g({ 'U-P': 'ok' }, { P: 'ok' }, { P: 'New name', R: 'Old name (change in flight)' }), { type: 'vars', vals: { 'read served by': 'primary', 'value seen': 'New name' }, hl: { 'value seen': 'ok' } }] });
        f.push({ narr: '<b>t = ' + lag + ' s:</b> the replicas catch up. After the pin window (a few seconds longer than normal lag) the user\'s reads go back to replicas, which now agree.', parts: [g({ 'U-R': 'ok' }, { R: 'ok', X: 'ok' }, { P: 'New name', R: 'New name', X: 'New name' }), { type: 'vars', vals: { 'read served by': 'replica', 'value seen': 'New name' }, hl: { 'value seen': 'ok' } }] });
        f.push({ narr: '<b>Cost:</b> a little extra load on the primary for a few seconds per writing user. <b>Benefit:</b> no confusing stale pages. Other users, who did not write, may still see "Old name" for up to ' + lag + ' s — that is normal eventual consistency.', parts: [{ type: 'table', label: 'Who sees what at t = 0.2 s', columns: ['reader', 'served by', 'sees'], rows: [['the user who wrote', 'primary', 'New name'], ['everyone else', 'replica', 'Old name (briefly)']], hl: { 0: 'ok', 1: 'cur' } }] });
      } else {
        f.push({ narr: '<b>t = 0.2 s:</b> the page reloads. The read-only request is routed to a <b>replica</b> (as the routing rule says). The replica has not received the change yet.', parts: [g({ 'U-R': 'bad' }, { R: 'bad' }, { P: 'New name', R: 'Old name' }), { type: 'vars', vals: { 'read served by': 'replica', 'value seen': 'Old name' }, hl: { 'value seen': 'bad' } }] });
        f.push({ narr: '<span class="c-r">The user just saved "New name" but the page shows "Old name".</span> They think the save failed, click save again, or file a bug. This is the classic <b>read-your-writes violation</b>.', parts: [{ type: 'table', label: 'What went wrong', columns: ['event', 'where', 'value'], rows: [['write', 'primary', 'New name'], ['read 0.2 s later', 'replica', 'Old name']], hl: { 1: 'bad' } }] });
        f.push({ narr: '<b>t = ' + lag + ' s:</b> replicas catch up, and a refresh would now show "New name" — the bug looks random and vanishes when you debug it. Fix: type <b>pin=yes</b> to route the writer\'s reads to the primary for a short window.', parts: [g({ 'P-R': 'ok', 'P-X': 'ok' }, { R: 'ok' }, { P: 'New name', R: 'New name', X: 'New name' })] });
      }
      return f;
    }
  },
  examples: [
    {
      title: 'Which reads can use a replica?',
      html: `${H.table(['Read', 'Replica OK?', 'Why'], [
        ['Product catalog page', '<span class="c-g">Yes</span>', 'A few seconds stale is invisible'],
        ['Analytics / reports / exports', '<span class="c-g">Yes</span>', 'Heavy scans stay away from the primary'],
        ['"My profile" right after editing it', '<span class="c-r">No (or pinned)</span>', 'Read-your-writes'],
        ['Check balance, then debit', '<span class="c-r">No</span>', 'Decision feeds a write; stale value = wrong decision'],
        ['Stock check at checkout', '<span class="c-r">No</span>', 'Overselling risk; the final guard is the atomic update on primary'],
        ['Permissions after a role change', '<span class="c-r">No</span>', 'Security: a revoked user must not pass']
      ])}`
    },
    {
      title: 'Three ways to get read-your-writes',
      html: `<ol>
        <li><b>Time window:</b> remember the last write per user/session (in the session, a cookie timestamp, or Redis) and use the primary for N seconds. Simple, slightly wasteful.</li>
        <li><b>Position token:</b> after a write, return the primary's LSN/GTID to the client (cookie or header). The next read goes to a replica only if it has replayed at least that position (e.g. <code>pg_last_wal_replay_lsn()</code>), otherwise the primary. Exact, more plumbing. (AWS Aurora, Vitess and ProxySQL have features for this.)</li>
        <li><b>Use the write's response:</b> the <code>POST</code> already returns the saved object; render from that and skip the immediate re-read. Many UIs can do this and need no special routing.</li>
      </ol>`
    },
    {
      title: 'Monitoring and degrading when the replica falls behind',
      html: `<p>Add a health check: if replica lag &gt; 5 s, stop sending traffic (mark unhealthy in the load balancer / remove from the routing map) and fall back to the primary, accepting the extra load, rather than serving very old data. Alert on lag, and look for the usual causes: a long-running transaction or huge batch update on the primary, a replica with fewer resources than the primary, or a query on the replica that conflicts with replication apply (PostgreSQL <code>max_standby_streaming_delay</code>).</p>`,
      code: { lang: 'java', code: `import java.util.*;

class ReplicaPicker {
    static class Replica {
        final String name; final double lagSeconds;
        Replica(String name, double lagSeconds) { this.name = name; this.lagSeconds = lagSeconds; }
    }

    /** Pick a healthy replica (lag under the limit) in round-robin order, else fall back to the primary. */
    static String pick(List<Replica> replicas, double maxLag, int counter) {
        List<Replica> healthy = new ArrayList<>();
        for (Replica r : replicas) if (r.lagSeconds <= maxLag) healthy.add(r);
        if (healthy.isEmpty()) return "primary";             // degrade safely
        return healthy.get(counter % healthy.size()).name;
    }

    public static void main(String[] args) {
        List<Replica> rs = List.of(new Replica("r1", 0.2), new Replica("r2", 40.0));
        System.out.println(pick(rs, 5, 0));   // r1 (r2 is too far behind)
        System.out.println(pick(List.of(new Replica("r2", 40.0)), 5, 0)); // primary
    }
}` }
    },
    {
      title: 'Replicas do not scale writes (and what does)',
      html: `<p>Every replica applies <b>every</b> write, so adding replicas never increases write capacity — it only spreads reads. If writes are the bottleneck you need to cut write volume (batching, fewer indexes, queues), scale the primary vertically, or <b>shard</b> (split data across several primaries, e.g. by customer id). Replicas also cost money and add lag risk: first try indexes, caching and fixing N+1.</p>`
    }
  ],
  deepDive: `<p><b>How replication works:</b> PostgreSQL ships the write-ahead log (WAL) — physical streaming replication copies bytes of changes, logical replication decodes row changes. MySQL replays the binary log (statement, row or mixed). In <b>asynchronous</b> mode the primary commits without waiting for replicas (fast, but a failover can lose the last few commits). <b>Semi-sync / synchronous</b> waits for at least one replica to acknowledge (no loss, higher write latency, and if the sync replica is down writes may stall).</p>
  <p><b>Why lag grows:</b> replicas apply changes mostly on a single thread (parallel apply helps but is limited); a huge transaction (e.g. <code>UPDATE</code> of 50 M rows) arrives as one lump; long read queries on the replica can block replay; network hiccups; the replica being on weaker hardware. Mitigation: batch big writes into small transactions, tune parallel replication, monitor lag in seconds <i>and</i> bytes.</p>
  <p><b>Consistency levels you can offer:</b> eventual (any replica), read-your-writes (session-level), monotonic reads (a user never sees time go backwards — pin a session to one replica), consistent-prefix, and strong (primary only). Pick per endpoint and say it in the API docs. Monotonic reads is the one people forget: two reads on two replicas with different lag can show a comment, then make it disappear on refresh.</p>
  <p><b>Routing options:</b> in the app (Spring <code>AbstractRoutingDataSource</code>, Django DB routers, Rails <code>connected_to</code>, Prisma read replicas extension), in a proxy (ProxySQL, PgBouncer + HAProxy, pgpool-II, RDS Proxy, Aurora reader endpoint), or in the driver (MySQL Connector/J <code>replication:</code> URLs, PostgreSQL <code>targetServerType=preferSecondary</code>). App-level routing knows the intent (<code>readOnly</code>); proxies can be unaware of transactions, so mixed read/write transactions need care.</p>
  <p><b>Transactions pitfall:</b> a transaction that starts as read-only on a replica cannot suddenly write; code that calls a "read" method from a write transaction must use the same connection (the primary). Spring's <code>LazyConnectionDataSourceProxy</code> is needed so the readOnly flag is known before the connection is chosen. Also remember caches: a stale replica read stored in a cache lives longer than the lag itself (cache poisoning) — populate caches from the primary on write paths.</p>
  <p><b>Failover:</b> promoting a replica loses un-replicated commits (async) and changes endpoints; the app must reconnect (short DNS TTL, pool <code>maxLifetime</code>, retry on read-only errors: PostgreSQL 25006 "cannot execute in a read-only transaction" after a flip means the old primary is now a replica).</p>
  <p><b>Beyond replicas:</b> distributed SQL (CockroachDB, Spanner) offers follower reads with bounded staleness; DynamoDB offers a flag for strongly consistent reads; Redis replicas are also asynchronous. The vocabulary of primary/lag/staleness carries over.</p>`,
  aiEra: `<p><b>What AI changes:</b> AI features (RAG indexing, embedding jobs, analytics agents, "chat with your data") add heavy read traffic that should land on replicas or a warehouse, not the primary — a runaway agent running table scans on the primary can take production down. Agents that "write, then immediately verify by reading" will hit stale replicas and conclude their action failed, then repeat it. Idempotency keys and read-your-writes matter for machine clients.</p>
  <p><b>Use AI as a partner:</b> ask it to classify your repository methods into "must use primary" vs "replica OK" with reasons; ask for a chaos-style test that injects 3 s of lag (e.g. with a delayed replica or Toxiproxy) and checks the pages that must be fresh; ask it to draft the lag alert and runbook.</p>
  <p><b>Where AI goes wrong:</b> it routes by HTTP method only (GET = replica) ignoring GETs that follow a write or feed a decision; marks everything <code>readOnly</code> to "optimize"; forgets <code>LazyConnectionDataSourceProxy</code>; treats replicas as backups; and suggests adding replicas for a write-bound problem.</p>
  <p><b>What you must still own:</b> the consistency promise per endpoint, the lag budget, the fallback to primary, and giving AI agents a read-only replica credential with query timeouts instead of primary access.</p>`,
  problems: [
    {
      title: 'Route reads to replicas without showing stale data',
      level: 'Hard', tags: ['read replicas', 'consistency', 'routing'], companies: ['Netflix', 'Uber'],
      statement: `<p>Your e-commerce API sends all <code>@Transactional(readOnly = true)</code> methods to a read replica. After launch: (1) customers who place an order see "order not found" on the confirmation page, (2) the checkout stock check sometimes lets two people buy the last item, (3) replica lag spikes to 45 s every night at 2 a.m. Design the fixes for all three, with the routing rules and monitoring.</p>`,
      constraints: `PostgreSQL primary + 2 async replicas, typical lag 100 ms. Spring Boot with a routing DataSource. Must keep most read traffic on replicas.`,
      example: `<p>(1) ${H.c('r', 'stale read after write')} → pin to primary for 5 s or use the POST response. (2) ${H.c('r', 'decision read on replica')} → read and guard on primary. (3) ${H.c('y', 'lag spike')} → batch the nightly job, lag-based fallback.</p>`,
      brute: { why: `<p>"Disable replicas" or "route every GET to the primary". That throws away the scaling benefit and the primary becomes the bottleneck again; or "make replicas synchronous", which slows every write and stalls them if one replica is down.</p>` },
      mcq: { q: 'A user places an order and the next page shows "order not found". The most likely cause and a minimal fix?', options: ['Primary is down; add more replicas', 'Replica lag: read-your-writes violated; route that user\'s reads to the primary briefly or render from the POST response', 'The ORM cache is full; restart the app', 'Add an index on orders.id'], answer: 1, explain: 'The order exists on the primary but has not replicated yet. Pinning the writer to the primary for a short window (or using the data returned by the write) restores read-your-writes while other reads still use replicas.' },
      hints: [
        `<p>Hint 1: split the three symptoms. Two are about <i>which reads may be stale</i>, one is about <i>why lag spikes</i>.</p>`,
        `<p>Hint 2: classify reads: user-facing right after own write, reads that feed a write decision, and general browsing. Only the last category is safe on any replica.</p>`,
        `<p>Hint 3: recipe: pin writers to the primary for ~5 s (or LSN token); do stock check as <code>UPDATE … WHERE qty &gt;= n</code> on the primary; split the 2 a.m. job into small batches, add lag alerts and a health check that removes replicas over 5 s lag.</p>`
      ],
      solution: {
        approach: `<p><b>Principle:</b> a replica is allowed only where stale data is harmless, and each endpoint must state its consistency level. <b>(1) Order not found:</b> this is a read-your-writes violation. After the order <code>POST</code>, return the created order in the response and render the confirmation from it; additionally record a "last write" timestamp (or the primary's LSN) in the user's session and route that user's reads to the primary for about 5 seconds (longer than normal lag) or until a replica reports a replayed LSN at or beyond the token. Everyone else keeps reading replicas. <b>(2) Stock oversell:</b> the stock check is a decision that feeds a write, so it must never rely on a replica. Do the check and write together on the primary with an atomic guarded update (<code>UPDATE stock SET qty = qty - ? WHERE product = ? AND qty &gt;= ?</code>, checking rows affected) or optimistic locking; showing "in stock" on the product page from a replica is fine because the real guard is at checkout. Mark such methods read-write (not <code>readOnly</code>) so the routing sends them to the primary. <b>(3) 2 a.m. lag:</b> a nightly job running one huge transaction replays as one lump on replicas and blocks apply. Rewrite it in batches of a few thousand rows with short transactions and sleeps, run it off-peak, and make sure heavy reports hit a dedicated analytics replica with <code>hot_standby_feedback</code>/delay settings tuned. <b>Safety net:</b> export lag metrics, alert above 5 s, and have the router stop using any replica over the threshold and fall back to the primary (accepting more load) so users never see 45-second-old data. Also give monotonic reads by pinning a session to one replica, populate caches from write paths, and load test with injected lag.</p>`,
        code: { lang: 'java', check: false, code: `@Transactional                // read-write on purpose: decision + write on the PRIMARY
public boolean reserve(String product, int qty) {
    int rows = jdbc.update(
        "UPDATE stock SET qty = qty - ? WHERE product = ? AND qty >= ?", qty, product, qty);
    return rows == 1;         // 0 rows = not enough stock
}` },
        complexity: `<p>Primary load stays proportional to writes plus a short pinned-read window; replicas absorb the rest. Added cost: O(1) per request for the routing decision.</p>`,
        followUps: ['How would you implement LSN-based routing?', 'What changes if replication is synchronous?']
      }
    }
  ]
});
function P(title, level, tags, statement, constraints, example, bruteWhy, mcq, hints, approach, complexity, followUps, code) {
  var sol = { approach: approach, complexity: complexity, followUps: followUps };
  if (code) sol.code = code;
  return { title: title, level: level, tags: tags, statement: statement, constraints: constraints, example: example, brute: { why: bruteWhy }, mcq: mcq, hints: hints, solution: sol };
}
practice.push(P('Count the queries', 'Easy', ['N+1'],
  `<p>A service loads 25 orders with <code>orderRepo.findAll()</code> and then, in a loop, calls <code>order.getCustomer().getName()</code> on a LAZY many-to-one. How many SQL statements run in the worst case, and how many after adding <code>join fetch</code>? Customers are all different.</p>`,
  `25 orders, 25 distinct customers, open session during the loop.`,
  `<p>Lazy: 1 + 25 = ${H.c('r', '26')}. With join fetch: ${H.c('g', '1')}.</p>`,
  `<p>Assuming "it is only 26 small queries, so it is fine". The count scales with rows: 10,000 rows means 10,001 round trips.</p>`,
  { q: 'If 25 orders belong to only 5 distinct customers, how many queries does the lazy loop run in Hibernate (persistence context caching)?', options: ['26', '6', '1', '5'], answer: 1, explain: 'Hibernate caches loaded entities per session, so each distinct customer is fetched once: 1 + 5 = 6. Still wasteful, and it depends on the data, which is why a predictable fix is better.' },
  [`<p>Hint 1: one query loads the list; each distinct lazy customer touched triggers another.</p>`, `<p>Hint 2: join fetch loads the many-to-one in the same SQL as the orders.</p>`, `<p>Hint 3: answer worst case 1 + N = 26; fixed = 1; mention that identical customers are cached within one session.</p>`],
  `<p>The first query selects the 25 orders. Each order's customer is a lazy proxy; touching the name triggers one SELECT per distinct customer, so with 25 distinct customers the loop adds 25 queries: 26 total. With <code>select o from Order o join fetch o.customer</code> Hibernate joins the tables and fills each customer immediately, so only 1 statement runs and the loop touches no database. If customers repeat, the persistence context returns the already-loaded instance, so the count equals 1 + distinct customers, but relying on that is fragile because it depends on data shape.</p>`,
  `<p>Queries: O(N) lazy vs O(1) join fetch.</p>`, ['How would you assert the query count in a test?']));
practice.push(P('Write the JOIN instead of the loop', 'Easy', ['SQL', 'JOIN'],
  `<p>Using the shop database, write one SQL query returning <code>order id, customer name, city, total</code> for all PAID orders of customers living in Pune, ordered by order id. This replaces a loop that fetched each customer separately.</p>`,
  `Tables customers, orders. SQLite.`,
  `<p>Result rows have columns order_id, name, city, total, only Pune customers (Asha, Dia).</p>`,
  `<p>Loading all PAID orders and calling a customer lookup for each one: one query per row.</p>`,
  { q: 'Which SQL shape removes the per-row customer query?', options: ['SELECT * FROM orders; then SELECT * FROM customers WHERE id=? per row', 'orders JOIN customers ON customers.id = orders.customer_id', 'SELECT * FROM customers, then orders per customer', 'Two queries without a join key'], answer: 1, explain: 'A JOIN on the foreign key returns orders with their customer columns in one round trip.' },
  [`<p>Hint 1: orders.customer_id points at customers.id.</p>`, `<p>Hint 2: filter on both tables: o.status and c.city.</p>`, `<p>Hint 3: SELECT o.id, c.name, c.city, o.total FROM orders o JOIN customers c ON c.id = o.customer_id WHERE ... ORDER BY o.id.</p>`],
  `<p>Join orders to customers on the foreign key and apply both filters in the WHERE clause so the database does the matching: one statement, one round trip, and the existing index on orders(customer_id) helps. The ORM equivalent is a JPQL query with join or a DTO projection. The answer sorts by order id for a stable result and returns only needed columns, which also makes it cheaper than loading full entities.</p>`,
  `<p>One query; cost depends on indexes, not on the number of rows returned.</p>`, ['How does this change if you also need the items?'],
  { lang: 'sql', db: 'shop', code: `SELECT o.id AS order_id, c.name, c.city, o.total
FROM orders o
JOIN customers c ON c.id = o.customer_id
WHERE o.status = 'PAID' AND c.city = 'Pune'
ORDER BY o.id;` }));
practice.push(P('Eager or lazy?', 'Easy', ['lazy loading', 'JPA'],
  `<p>For each association decide LAZY or EAGER default and what you should set: <code>@ManyToOne Customer</code>, <code>@OneToMany List&lt;Item&gt;</code>, <code>@OneToOne Profile</code>, <code>@ManyToMany Set&lt;Tag&gt;</code>. Give one sentence of justification.</p>`,
  `JPA 3 / Hibernate 6.`,
  `<p>ManyToOne and OneToOne default ${H.c('r', 'EAGER')}; OneToMany and ManyToMany default ${H.c('g', 'LAZY')}. Set all four LAZY explicitly.</p>`,
  `<p>Leaving defaults: the to-one associations silently join or trigger extra selects on every query that loads the entity.</p>`,
  { q: 'Which association is EAGER by default in JPA?', options: ['@OneToMany', '@ManyToMany', '@ManyToOne', 'None'], answer: 2, explain: '@ManyToOne and @OneToOne are eager by default. Override them with fetch = LAZY.' },
  [`<p>Hint 1: the JPA spec chooses defaults by cardinality: to-one vs to-many.</p>`, `<p>Hint 2: to-one is eager, to-many is lazy. Eager cannot be turned off per query.</p>`, `<p>Hint 3: answer: set LAZY on all four and fetch per use case with join fetch, entity graphs or DTOs.</p>`],
  `<p>The spec defaults are EAGER for @ManyToOne and @OneToOne and LAZY for @OneToMany and @ManyToMany. Because eager is a global, unconditional cost (it makes every query that loads the entity bring the relation along, and can cause extra selects with JPQL), the recommended practice is to declare all four as <code>fetch = FetchType.LAZY</code> and load what each use case needs with join fetch, <code>@EntityGraph</code>, batch fetching, or DTO projections. Note that a lazy one-to-one on the inverse side may still load eagerly unless bytecode enhancement or a shared primary key is used.</p>`,
  `<p>Conceptual; no complexity cost beyond avoiding unneeded loads.</p>`, ['Why can the inverse side of a OneToOne not be lazy easily?']));
practice.push(P('Is a bigger pool the answer?', 'Easy', ['HikariCP'],
  `<p>Logs show "Connection is not available, request timed out after 30000ms" at peak. Database CPU is 20%. A teammate wants <code>maximumPoolSize=200</code>. List three things to check first and one risk of the 200 setting.</p>`,
  `Spring Boot service, 4 pods, pool 10, PostgreSQL max_connections 100.`,
  `<p>Check: ${H.c('b', 'hold time per request, leaks, remote calls inside transactions')}. Risk: 4 × 200 = 800 connections vs limit 100.</p>`,
  `<p>Just raising the number: it multiplies by the pod count and can exceed max_connections or overload the database.</p>`,
  { q: 'Pool starvation with idle database CPU most likely means…', options: ['The database is too small', 'Connections are held too long by the application (slow calls or leaks)', 'The network is down', 'Indexes are missing'], answer: 1, explain: 'Idle DB CPU means the database is not the bottleneck; the app is holding connections while doing other things or leaking them.' },
  [`<p>Hint 1: if the database is idle, who is holding the connections?</p>`, `<p>Hint 2: look at active vs pending metrics, leakDetectionThreshold logs, and @Transactional scope.</p>`, `<p>Hint 3: answer: check hold time, leaks, remote calls in transactions; raising to 200 gives 800 connections across 4 pods, above the 100 limit.</p>`],
  `<p>Low database CPU with a full pool points at the application holding connections without using them: external HTTP calls inside @Transactional methods, forgotten close() calls, open-session-in-view during slow response writing, or long-running batch jobs sharing the pool. First check hikaricp_connections_active and pending metrics, enable leakDetectionThreshold to get stack traces, and inspect pg_stat_activity for sessions idle in transaction. Raising maximumPoolSize to 200 is dangerous: with 4 pods that is 800 potential connections against max_connections of 100, and it lets more concurrent queries pile onto a database that can only run a handful in parallel.</p>`,
  `<p>Diagnosis step; the fix reduces hold time, restoring connections needed = rate × hold.</p>`, ['What metric would you alert on?']));
practice.push(P('Seek the next page', 'Medium', ['pagination', 'SQL'],
  `<p>Write the keyset query that returns the 5 orders after the cursor (created_at = '2026-03-06', id = 18) in newest-first order, plus the Base64 cursor payload you would return for the last row. Explain how to detect a next page without COUNT.</p>`,
  `Shop database, composite index on (created_at, id).`,
  `<p>Rows with pair smaller than ('2026-03-06', 18): ids 17, 16, 15, 14, 13.</p>`,
  `<p>OFFSET 12 LIMIT 5: reads and discards 12 rows and drifts when rows are inserted.</p>`,
  { q: 'How do you know there is a next page without COUNT(*)?', options: ['Run COUNT(*) every time', 'Request limit+1 rows and check if you got the extra one', 'Guess from the page number', 'Always return a next link'], answer: 1, explain: 'Fetching one extra row costs almost nothing and answers hasNext exactly.' },
  [`<p>Hint 1: use a row-value comparison on (created_at, id).</p>`, `<p>Hint 2: ask for LIMIT 6 and return only 5.</p>`, `<p>Hint 3: cursor = Base64("2026-03-06|13") of the last returned row.</p>`],
  `<p>Use <code>WHERE (created_at, id) &lt; ('2026-03-06', 18) ORDER BY created_at DESC, id DESC LIMIT 6</code>. Return the first 5 rows; if a 6th row came back there is a next page, so no COUNT query is needed. The next cursor is built from the last returned row's sort key (created_at and id), encoded as an opaque Base64 token and validated on the way back in. The composite index (created_at, id) makes this an index seek plus a 6-entry range scan.</p>`,
  `<p>O(log N + size) per page.</p>`, ['How would "previous page" work?'],
  { lang: 'sql', db: 'shop', code: `SELECT id, created_at, total FROM orders
WHERE (created_at, id) < ('2026-03-06', 18)
ORDER BY created_at DESC, id DESC
LIMIT 6;` }));
practice.push(P('Spot the bug in this cursor query', 'Medium', ['pagination', 'debugging'],
  `<p>An API orders by <code>created_at DESC</code> only and uses <code>WHERE created_at &lt; :lastCreatedAt LIMIT 20</code>. Clients report missing orders. Explain the bug and fix it.</p>`,
  `Many rows share a created_at (bulk imports).`,
  `<p>Page ends in the middle of 30 rows with the same timestamp: the other 10 are never returned.</p>`,
  `<p>Switching to <code>&lt;=</code>: now the same rows repeat forever on the boundary.</p>`,
  { q: 'What fixes boundary rows with equal sort values?', options: ['Larger page size', 'Add a unique tie-breaker (id) to ORDER BY and to the bookmark', 'Use OFFSET', 'Remove the index'], answer: 1, explain: 'A unique total order makes "after this row" well defined.' },
  [`<p>Hint 1: what happens to rows that have the same created_at as the last row of the page?</p>`, `<p>Hint 2: strict less-than skips them, less-or-equal repeats them.</p>`, `<p>Hint 3: sort by (created_at DESC, id DESC) and bookmark both values.</p>`],
  `<p>With only created_at in the sort and a strict comparison, every row sharing the last row's timestamp that did not fit in the page is excluded from the next page, so they are skipped forever. Using less-or-equal instead returns the already-seen rows again and can loop. The fix is a unique, deterministic order: ORDER BY created_at DESC, id DESC, bookmark (created_at, id), condition <code>(created_at, id) &lt; (:ts, :id)</code>, and a matching composite index. Add a test that inserts 50 rows with identical timestamps and pages through them, asserting no duplicates and no gaps.</p>`,
  `<p>Same as keyset: O(log N + size).</p>`, ['How do NULL timestamps affect it?']));
practice.push(P('Two admins edit one order', 'Medium', ['optimistic locking', 'REST'],
  `<p>Two admins open the same order form, both change the status and click Save. Today the second save silently wins. Design the fix at database and HTTP level and say what each admin sees.</p>`,
  `REST API, PostgreSQL, orders table.`,
  `<p>Admin A saves OK (version 3 → 4). Admin B sends If-Match 3 and gets ${H.c('r', '412')} with a "reload" message.</p>`,
  `<p>Pessimistic lock while the form is open: locks held for minutes of think time, orphaned locks, pool exhaustion.</p>`,
  { q: 'Which HTTP status is the standard answer to a failed If-Match precondition?', options: ['200', '404', '412', '500'], answer: 2, explain: '412 Precondition Failed signals that the version the client edited is no longer current (409 is also used by many APIs).' },
  [`<p>Hint 1: carry a version from the read to the write.</p>`, `<p>Hint 2: ETag header on GET, If-Match on PUT, WHERE version = ? in SQL.</p>`, `<p>Hint 3: zero rows updated maps to 412/409 and a "reload" UI.</p>`],
  `<p>Add an integer version column (JPA @Version). GET returns it as an ETag. The edit form sends it back in If-Match, and the service runs <code>UPDATE orders SET status=?, version=version+1 WHERE id=? AND version=?</code>. Zero rows updated means someone else saved first, so the API returns 412 (or 409) with a clear message; the UI shows the other admin's changes and lets the user re-apply. Admin A sees success; Admin B is told to reload. No database lock is held while people think, so there are no orphaned locks.</p>`,
  `<p>O(1) per save: one primary-key update.</p>`, ['Should the UI auto-merge non-conflicting fields?']));
practice.push(P('Write a safe expand step', 'Medium', ['migrations'],
  `<p>You must split <code>users.name</code> into <code>first_name</code> and <code>last_name</code> on a live system. Write the ordered list of steps (migrations and releases) and the SQL for the expand and backfill steps.</p>`,
  `Rolling deploys, 30 M rows, PostgreSQL.`,
  `<p>Expand: add two nullable columns. Backfill: split on first space in batches. Contract: drop name later.</p>`,
  `<p>One migration that adds the columns, fills them, drops <code>name</code> and changes the code in the same release.</p>`,
  { q: 'Which step must come LAST?', options: ['Add new columns', 'Dual-write in the app', 'Backfill', 'Drop the old column'], answer: 3, explain: 'Contract happens only after no running version uses the old column.' },
  [`<p>Hint 1: nothing may be removed while any running code might use it.</p>`, `<p>Hint 2: expand, dual write, backfill, switch reads, contract.</p>`, `<p>Hint 3: backfill in id ranges with commits between batches.</p>`],
  `<p>Release plan: (1) migration adds nullable first_name and last_name (instant, backward compatible). (2) Deploy app version that writes name and both new columns. (3) Backfill job updates rows in id ranges of a few thousand, parsing name, committing per batch, idempotent via WHERE first_name IS NULL. (4) Verify no NULLs remain. (5) Deploy version reading the new columns. (6) After a bake period and confirming nothing reads name, a final migration drops it. Each step is backward compatible, so rolling deploys and rollbacks never break old pods.</p>`,
  `<p>O(rows) total spread across small transactions.</p>`, ['How do you handle names with no space?'],
  { lang: 'sql', db: 'migr', code: `ALTER TABLE users ADD COLUMN first_name TEXT;
ALTER TABLE users ADD COLUMN last_name TEXT;
UPDATE users
SET first_name = substr(name, 1, instr(name, ' ') - 1),
    last_name  = substr(name, instr(name, ' ') + 1)
WHERE first_name IS NULL AND instr(name, ' ') > 0;
SELECT id, name, first_name, last_name FROM users ORDER BY id;` }));
practice.push(P('Fix the migration that fails on startup', 'Medium', ['Flyway'],
  `<p>After a deploy every pod crashes with "Migration checksum mismatch for migration version 4". A developer reformatted <code>V4__add_index.sql</code> after it had run in production. What happened, and how do you recover safely?</p>`,
  `Flyway, production already at V5.`,
  `<p>History checksum differs from the file. Restore the original file, put reformatting in no migration at all.</p>`,
  `<p>Running <code>flyway repair</code> blindly or deleting the history row.</p>`,
  { q: 'Best first action?', options: ['Delete flyway_schema_history', 'Revert the file to its original content', 'Disable validation permanently', 'Rename the file'], answer: 1, explain: 'Applied migrations are immutable; restoring the exact original content makes checksums match again.' },
  [`<p>Hint 1: Flyway stores a checksum of every applied file.</p>`, `<p>Hint 2: git history has the original content.</p>`, `<p>Hint 3: repair only when you understand why the checksum changed and the schema is right.</p>`],
  `<p>Flyway compares the checksum stored in flyway_schema_history with the checksum of the file on disk; any edit, even whitespace, changes it and validation aborts startup to protect you from an unknown schema. Recover by restoring V4 byte-for-byte from version control so checksums match. If a real fix is needed, write a new migration V6. Use <code>flyway repair</code> only when the change was deliberate and harmless (for example a comment) after reviewing, and add a CI check that fails on modified applied migrations. Never delete history rows by hand.</p>`,
  `<p>Operational; immediate once the file is restored.</p>`, ['What does baselineOnMigrate do?']));
practice.push(P('Which reads go to the replica?', 'Medium', ['replicas'],
  `<p>Classify these into replica-safe or primary-only and justify: product search, order confirmation page right after checkout, balance check before transfer, monthly sales report, permission check after role change.</p>`,
  `Async replication, lag up to 2 s.`,
  `<p>Replica: search, report. Primary: confirmation (or pinned), balance, permission.</p>`,
  `<p>Route every GET to a replica, regardless of what it is used for.</p>`,
  { q: 'Which read must not use a lagging replica?', options: ['Product catalog', 'Analytics report', 'Balance check that decides a transfer', 'Blog post list'], answer: 2, explain: 'Reads that drive a write decision need current data.' },
  [`<p>Hint 1: can a 2-second-old answer hurt anyone?</p>`, `<p>Hint 2: reads that decide a write, follow your own write, or enforce security need the primary.</p>`, `<p>Hint 3: browsing and reporting tolerate lag.</p>`],
  `<p>Replica-safe: product search (stale by seconds is invisible) and the monthly report (heavy scan, no freshness need). Primary-only or pinned: the confirmation page after checkout (read-your-writes; alternatively render from the POST response), the balance check before a transfer (a stale balance leads to a wrong decision, and the final guard must be an atomic update on the primary), and the permission check after a role change (security: a revoked user must not pass). State the consistency level per endpoint, add lag-based fallback, and monitor lag.</p>`,
  `<p>Design classification; no complexity.</p>`, ['How would you guarantee monotonic reads?']));
practice.push(P('Lazy pool of replicas: find the leak', 'Hard', ['HikariCP', 'transactions'],
  `<p>Metrics: pending threads &gt; 40, active = max, DB idle. Thread dumps show many threads inside <code>paymentClient.charge()</code> while holding a connection. Redesign the method and quantify the improvement at 80 requests/s where the charge takes 400 ms and the DB work 10 ms.</p>`,
  `Spring @Transactional on the service method. Pool 20.`,
  `<p>Before: 80 × 0.41 = ${H.c('r', '32.8')} connections needed (pool 20 → starvation). After: 80 × 0.01 = ${H.c('g', '0.8')}.</p>`,
  `<p>Raising the pool to 50 and the timeout to 60 s: hides the issue, overloads the DB under bursts.</p>`,
  { q: 'What is the right structural fix?', options: ['Bigger pool', 'Move the remote call outside the transaction; keep the DB write short', 'Disable transactions', 'More threads'], answer: 1, explain: 'A connection must be held only while doing database work.' },
  [`<p>Hint 1: compute connections needed = rate × hold time before and after.</p>`, `<p>Hint 2: what part of the method actually needs a transaction?</p>`, `<p>Hint 3: call the API first (or use an outbox) and then a short write transaction; consider idempotency keys for retries.</p>`],
  `<p>Little's Law shows the problem: 80 req/s × 0.41 s = 32.8 busy connections on average, more than the pool of 20, so threads queue and time out while the database sits idle. The transaction wraps a 400 ms remote call. Restructure: read what you need in a short transaction (or no transaction), call the payment API outside any transaction using an idempotency key so retries are safe, then open a short transaction to record the result (10 ms). Connections needed drop to about 80 × 0.01 = 0.8. For atomicity between the charge and the DB update use the transactional outbox or a payment state machine (PENDING, PAID, FAILED) with a reconciliation job. Add leak detection, a 3 s connection timeout and an alert on pending threads.</p>`,
  `<p>Connections needed fall from O(rate × remote latency) to O(rate × DB time).</p>`, ['What if the charge succeeds but the DB write fails?']));
practice.push(P('Batch backfill job design', 'Hard', ['migrations', 'batching'],
  `<p>Design a resumable backfill of 120 M rows that copies <code>legacy_status</code> into <code>status</code> without hurting production or lagging replicas. Specify batch size, ordering, restart behaviour, throttling and verification.</p>`,
  `PostgreSQL, replicas with lag alert at 5 s, peak traffic 9am-9pm.`,
  `<p>Id-range batches of 5,000, commit each, sleep adaptively when replica lag &gt; 2 s.</p>`,
  `<p>One UPDATE for all rows: a huge transaction, long locks, WAL spike, replica lag, and no way to resume.</p>`,
  { q: 'Which makes a backfill safe to restart?', options: ['A single transaction', 'Idempotent updates keyed by id ranges (WHERE status IS NULL) with a stored checkpoint', 'Random batches', 'Disabling indexes'], answer: 1, explain: 'Idempotent batches plus a checkpoint let you resume after a crash without redoing or corrupting work.' },
  [`<p>Hint 1: small transactions release locks and let replicas keep up.</p>`, `<p>Hint 2: iterate by primary key ranges, not OFFSET.</p>`, `<p>Hint 3: throttle on replica lag and time of day; verify with counts and checksum samples.</p>`],
  `<p>Run the backfill as a separate job, not a migration script. Iterate by primary key ranges (WHERE id &gt; :last AND id &lt;= :last + 5000 AND status IS NULL), commit after each batch, and store :last as a checkpoint so a restart resumes. Keep batches small enough that each transaction takes tens of milliseconds, add a pause, and make the pause adaptive: read replica lag and back off when it exceeds ~2 s; optionally restrict to off-peak hours. Set lock_timeout and statement_timeout. The statement is idempotent so duplicates are harmless. The app should tolerate unmigrated rows (COALESCE) until the end. Verify with SELECT count(*) WHERE status IS NULL = 0 and sampled comparisons, then run the contract step. Total runtime is long by design but impact is negligible.</p>`,
  `<p>O(rows) over time; each batch O(log N + batch).</p>`, ['How would you parallelize safely?']));
practice.push(P('Prevent deadlocks in transfers', 'Hard', ['pessimistic locking', 'deadlock'],
  `<p>Concurrent transfers A→B and B→A occasionally fail with "deadlock detected". Explain the cause and give two fixes, one using lock ordering and one using a single atomic statement or optimistic locking.</p>`,
  `Accounts table with balance; PostgreSQL READ COMMITTED.`,
  `<p>T1 locks 1 then wants 2; T2 locks 2 then wants 1. Fix: always lock the lower id first.</p>`,
  `<p>Catching the deadlock exception and ignoring it: the transfer is lost.</p>`,
  { q: 'Which technique prevents lock-order deadlocks?', options: ['Locking rows in a consistent global order', 'Longer transactions', 'Larger pool', 'SERIALIZABLE without retries'], answer: 0, explain: 'If everyone locks in the same order, a cycle of waiting cannot form.' },
  [`<p>Hint 1: draw who waits for whom; a cycle means deadlock.</p>`, `<p>Hint 2: order the lock acquisition by account id.</p>`, `<p>Hint 3: alternatively use two guarded atomic UPDATEs in one transaction ordered by id, and retry the deadlock victim.</p>`],
  `<p>Transaction 1 locks account 1 and requests account 2; transaction 2 locks account 2 and requests account 1. Each holds what the other needs, so the database detects the cycle and aborts one with a deadlock error. Fix 1: acquire locks in a canonical order (SELECT ... FOR UPDATE of min(id) then max(id)) so waiting can never form a cycle. Fix 2: use guarded atomic statements (UPDATE accounts SET balance = balance - ? WHERE id = ? AND balance &gt;= ?, then the credit), still ordering the two statements by id, or optimistic locking with version checks and retries. Always keep transactions short and retry the victim of any residual deadlock with a bounded number of attempts.</p>`,
  `<p>O(1) rows locked per transfer; ordering adds no cost.</p>`, ['How does SKIP LOCKED differ?']));
practice.push(P('Design the order list API end to end', 'Hard', ['N+1', 'pagination', 'pool'],
  `<p>Design <code>GET /orders</code> for 50 M orders, each with a customer and 1-10 items, 2,000 requests/s at peak, infinite scroll. Cover query shape, pagination, N+1 avoidance, indexes, pool sizing and replica use.</p>`,
  `p95 under 100 ms. Postgres primary + replicas. 8 pods.`,
  `<p>Keyset on (created_at, id) + DTO join for customer + one IN query for items + replica with consistency note + small pool.</p>`,
  `<p>Pageable with OFFSET, entities with lazy customer and items, one big pool, all reads on the primary.</p>`,
  { q: 'Which combination best fits?', options: ['OFFSET paging, lazy loops, pool 200', 'Keyset paging, join/batch loading, small tuned pool, replica for reads', 'Load everything and cache in memory', 'COUNT(*) per request and page numbers'], answer: 1, explain: 'It removes deep-offset cost, N+1 round trips, pool oversizing, and offloads reads.' },
  [`<p>Hint 1: three costs: deep paging, per-row queries, connection use.</p>`, `<p>Hint 2: page parent ids by keyset first, then batch-load children by id list.</p>`, `<p>Hint 3: size the pool with Little's Law; replicas for reads with lag awareness and a pinned window for the writer.</p>`],
  `<p>Query: keyset page of order ids and customer columns using WHERE (created_at, id) &lt; cursor ORDER BY created_at DESC, id DESC LIMIT 21, joined to customers (to-one, safe) and projected to a DTO; then one query for items WHERE order_id IN (page ids) grouped in memory: 2 statements per request regardless of page size. Index (created_at, id) and order_items(order_id). Return an opaque signed cursor and hasNext from the extra row; no COUNT. Pool: 2,000 rps / 8 pods = 250 rps per pod × ~8 ms hold × 2 headroom = about 4-6 connections per pod, total under the database budget; connectionTimeout 2 s. Serve from replicas with a lag-based fallback to the primary and pin writers briefly; cache hot first pages for seconds. Test with a query-count assertion and a load test to confirm p95.</p>`,
  `<p>Per request O(log N + page size) with 2 queries.</p>`, ['Where would a cache help most?']));
practice.push(P('Retry policy for optimistic conflicts', 'Hard', ['optimistic locking', 'resilience'],
  `<p>A hot counter row sees 300 optimistic updates per second and 40% fail with version conflicts, causing retry storms. Propose changes to bring it under control and justify each.</p>`,
  `Cannot lose increments. PostgreSQL.`,
  `<p>Replace read-modify-write with <code>UPDATE counters SET n = n + 1</code> or shard the counter across N rows.</p>`,
  `<p>Unlimited immediate retries: each retry adds load and more conflicts.</p>`,
  { q: 'Best fix for a hot counter?', options: ['More retries', 'Atomic increment in SQL (or sharded counters)', 'Longer timeouts', 'Optimistic locking with timestamps'], answer: 1, explain: 'An atomic UPDATE needs no version check; sharding spreads contention across rows.' },
  [`<p>Hint 1: high conflict rate means optimistic locking is the wrong tool for this row.</p>`, `<p>Hint 2: let the database do the arithmetic atomically.</p>`, `<p>Hint 3: if one row is still too hot, use N shard rows and sum them, or batch increments through a queue.</p>`],
  `<p>A 40% conflict rate shows the row is hot, so optimistic locking wastes work. Replace the read-modify-write with a single atomic statement (UPDATE counters SET n = n + 1 WHERE id = ?), which serializes on the row lock for microseconds with no conflicts and no retries. If a single row still limits throughput, shard the counter into N rows (increment a random shard, read the sum) or aggregate increments in memory or a queue and flush in batches. Where retries remain necessary, bound them (3 attempts), add jittered exponential backoff, and re-run the entire unit of work; expose conflicts as a metric and alert when the rate rises.</p>`,
  `<p>Atomic update: O(1) with row-lock contention; sharding divides contention by N.</p>`, ['How does Redis INCR compare?']));

quiz.push({ q: 'A page lists 50 orders and logs show 51 queries. This is…', options: ['Normal pagination', 'The N+1 problem', 'A missing index', 'Connection leak'], answer: 1, explain: 'One query for the list plus one per row for a related entity is the N+1 pattern.' });
quiz.push({ q: 'Which JPA association is EAGER by default?', options: ['@OneToMany', '@ManyToMany', '@ManyToOne', 'All are lazy'], answer: 2, explain: '@ManyToOne and @OneToOne default to EAGER; collections default to LAZY.' });
quiz.push({ q: 'You join fetch a collection and call setMaxResults(20). What does Hibernate do?', options: ['Limits in SQL', 'Loads all rows and paginates in memory (with a warning)', 'Throws immediately', 'Ignores the join'], answer: 1, explain: 'Collection fetch multiplies rows, so Hibernate cannot use SQL LIMIT safely and pages in memory (HHH000104).' });
quiz.push({ q: 'Little\'s Law: 200 requests/s, each holding a connection 25 ms. Average busy connections?', options: ['0.5', '5', '50', '500'], answer: 1, explain: '200 × 0.025 = 5 connections on average, before headroom.' });
quiz.push({ q: 'Why shouldn\'t you set a huge connection pool "to be safe"?', options: ['Memory leak in Java', 'The database can only run a few queries in parallel; extra connections add contention, and pods multiply the total', 'Pools are slower when large because of GC only', 'It is forbidden by JDBC'], answer: 1, explain: 'Throughput does not rise beyond the database\'s parallelism, latency does, and instances × pool can exceed max_connections.' });
quiz.push({ q: 'An already-applied Flyway migration file is edited. What happens on next startup?', options: ['It re-runs', 'Validation fails with a checksum mismatch', 'It is silently ignored', 'Flyway deletes the history'], answer: 1, explain: 'Flyway compares stored and current checksums and aborts to protect schema integrity.' });
quiz.push({ q: 'Safest way to rename a column in a rolling deploy?', options: ['ALTER TABLE RENAME in the release', 'Expand (add new), dual-write, backfill, switch reads, then contract', 'Drop and recreate the table', 'Rename at night with downtime'], answer: 1, explain: 'Old and new code run together, so each step must be compatible with both.' });
quiz.push({ q: 'Why does OFFSET 100000 LIMIT 20 get slow?', options: ['LIMIT is slow', 'The database reads and discards 100,000 rows first', 'Indexes cannot be used', 'JSON is large'], answer: 1, explain: 'There is no way to jump to row 100,001 in sorted order without walking past the earlier rows.' });
quiz.push({ q: 'What is the keyset condition for ORDER BY created_at DESC, id DESC after bookmark (T, I)?', options: ['(created_at, id) > (T, I)', '(created_at, id) < (T, I)', 'created_at = T', 'id < I only'], answer: 1, explain: 'In descending order, rows after the bookmark have a smaller (created_at, id) pair.' });
quiz.push({ q: 'UPDATE ... WHERE id=1 AND version=3 reports 0 rows affected. Meaning?', options: ['Success', 'Another transaction changed the row; reload and retry or return 409', 'The table is empty', 'Deadlock'], answer: 1, explain: 'The version in the WHERE no longer matches, which is the optimistic conflict signal.' });
quiz.push({ q: 'Which is the best fit for pessimistic locking?', options: ['Rarely edited profile pages', 'Claiming jobs from a table with many workers (SKIP LOCKED)', 'Read-only reports', 'Static catalog'], answer: 1, explain: 'High contention on rows where waiting is acceptable suits row locks, and SKIP LOCKED gives queue semantics.' });
quiz.push({ q: 'A user saves a setting and the page shows the old value, fixing itself on refresh. Likely cause?', options: ['Browser cache only', 'Reading from a lagging replica (no read-your-writes)', 'Deadlock', 'Pool exhaustion'], answer: 1, explain: 'The write hit the primary but the read hit a replica that had not yet applied it.' });
quiz.push({ q: 'Are read replicas a backup?', options: ['Yes, fully', 'No, a bad DELETE replicates to them too', 'Only synchronous ones', 'Yes if lag is zero'], answer: 1, explain: 'Replication copies mistakes; backups need point-in-time recovery or snapshots.' });

interview.push({ level: 'B', q: `What is the N+1 query problem and how do you fix it?`, a: `<p>N+1 is when you run 1 query to get N parent rows and then N more queries, one per parent, to get related data (usually via lazy loading in a loop). The cost grows with the number of rows and wastes network round trips. Fixes: JOIN FETCH or @EntityGraph for to-one relations, batch fetching (IN lists) for collections and paging, a DTO query that joins and projects exactly what is needed, or two explicit queries grouped in memory. Detect it by reading the SQL log, APM traces with repeated queries, and test assertions on query counts.</p>`, followUps: ['Why is JOIN FETCH on a collection with paging a problem?', 'How do you detect N+1 in CI?'] });
interview.push({ level: 'B', q: `Explain eager vs lazy loading and the JPA defaults.`, a: `<p>Eager loads a relation together with its parent; lazy loads it on first access through a proxy. JPA defaults: @ManyToOne and @OneToOne are eager, @OneToMany and @ManyToMany are lazy. Best practice is to make everything lazy and fetch per use case (join fetch, entity graph, DTO projections) because eager is a global cost you cannot turn off per query and can cause both huge joins and hidden N+1. The price of lazy is that access must happen inside an open session, otherwise you get LazyInitializationException.</p>`, followUps: ['How do you fix LazyInitializationException properly?', 'What is Open Session In View and why do many teams disable it?'] });
interview.push({ level: 'I', q: `Why use a connection pool, and how do you size it?`, a: `<p>Opening a database connection is expensive (TCP, TLS, auth, a process on PostgreSQL), so a pool keeps connections open and lends them. Sizing starts from Little's Law: connections busy = requests per second × time each request holds a connection, plus headroom for bursts. Cross-check with the database: roughly cores × 2 plus spindles for useful parallelism, and total instances × pool size must stay below max_connections with reserve. A smaller pool is usually faster because extra connections only add contention. If the formula yields large numbers, reduce hold time or add PgBouncer before enlarging the pool.</p>`, followUps: ['What happens when you scale to 50 pods?', 'Which Hikari metrics do you watch?'] });
interview.push({ level: 'I', q: `What causes "Connection is not available, request timed out" in HikariCP?`, a: `<p>Threads waited longer than connectionTimeout for a free connection. Causes: demand above pool capacity (rate × hold time too high), slow queries, connections held during remote calls inside transactions, leaks from unclosed connections, long batch jobs sharing the pool, or open-session-in-view. Diagnose with active vs pending metrics, leakDetectionThreshold stack traces, and pg_stat_activity for idle in transaction sessions. Fix the hold time first; raise the pool only if the database has spare parallelism and the connection budget allows it.</p>`, followUps: ['How would you detect leaks?', 'Why lower connectionTimeout?'] });
interview.push({ level: 'I', q: `Flyway vs Liquibase: how do you choose, and what are the rules for migrations?`, a: `<p>Flyway is SQL-file-first, simple and predictable, with a flyway_schema_history table and checksums; Liquibase uses changelogs with changesets (YAML/XML/SQL), built-in rollback, preconditions and contexts, useful for multi-vendor or complex needs. Rules for both: never edit applied migrations, keep them small and ordered, make every change backward compatible with the currently deployed code, test on production-like data, and prefer rolling forward over down scripts. Run them as a controlled deploy step or rely on the tool's lock so only one instance migrates.</p>`, followUps: ['What happens when two pods start at the same time?', 'Why is ddl-auto=update unsafe?'] });
interview.push({ level: 'A', q: `How do you make a breaking schema change with zero downtime?`, a: `<p>Use expand and contract. Expand: add the new structure (nullable column, new table) without removing anything. Release app code that dual-writes and tolerates both. Backfill old data in small batches with throttling. Switch reads to the new structure while still writing both so rollback is safe. Verify, then contract: drop the old structure only once no running version uses it. Never rename or drop in the same release that stops using it, use lock_timeout, CREATE INDEX CONCURRENTLY, NOT VALID constraints and short transactions to avoid blocking writes.</p>`, followUps: ['How do triggers help dual-writing?', 'What do you do on MySQL without transactional DDL?'] });
interview.push({ level: 'I', q: `Compare offset and keyset pagination.`, a: `<p>Offset (LIMIT/OFFSET) is simple and supports jumping to page N, but the database reads and discards all skipped rows so deep pages are slow, and concurrent inserts or deletes cause duplicates or skipped rows. Keyset uses a bookmark of the last row's sort key (WHERE (created_at, id) &lt; (:ts, :id) ORDER BY created_at DESC, id DESC LIMIT n) and a matching composite index, giving constant cost and stable results, but no random page jumps. It needs a unique tie-breaker, opaque cursors, and size+1 to know about the next page.</p>`, followUps: ['How do you implement a previous page?', 'How do you handle user-selectable sort columns?'] });
interview.push({ level: 'A', q: `A keyset endpoint skips a few rows between pages. What do you check?`, a: `<p>First the sort: it must be total and deterministic, so check for a missing unique tie-breaker (many rows with the same timestamp). Then the comparison operators: strict less-than with the tie-breaker, not less-or-equal. Check the cursor contains all sort keys and uses the same sort direction, that the index order matches, that NULLs in sort columns are handled, and that sort keys are immutable (an updated created_at can move rows across the bookmark). Reproduce with a test that inserts rows with identical timestamps and pages through everything.</p>`, followUps: ['How do NULLs sort in PostgreSQL vs SQLite?', 'What if the sort key is mutable?'] });
interview.push({ level: 'I', q: `Optimistic vs pessimistic locking: when do you use each?`, a: `<p>Optimistic locking assumes conflicts are rare: add a version column and update with WHERE id=? AND version=?; zero rows means someone else changed it, so reload and retry or return 409. No locks are held during think time, so it suits web forms and normal CRUD. Pessimistic locking (SELECT FOR UPDATE) assumes conflicts are common: the second transaction waits. Use it for hot rows, expensive-to-retry work, or queue claiming with SKIP LOCKED, and keep those transactions tiny. For formulas, a single atomic UPDATE with a guard is simplest.</p>`, followUps: ['How does JPA @Version work?', 'How do you test it?'] });
interview.push({ level: 'A', q: `What is a lost update and how do you prevent it?`, a: `<p>A lost update happens when two transactions read the same value, each compute a new value, and the second write overwrites the first. Prevent it by moving the calculation into one atomic statement (SET balance = balance - 100 WHERE balance >= 100), by optimistic locking with a version check, by pessimistic locking with SELECT FOR UPDATE, or by a higher isolation level (REPEATABLE READ or SERIALIZABLE) with retries on serialization failures. Add constraints such as CHECK (qty >= 0) as a safety net and write a concurrency test.</p>`, followUps: ['What does READ COMMITTED allow?', 'How does a distributed system handle this?'] });
interview.push({ level: 'A', q: `How do you avoid deadlocks in code that locks multiple rows?`, a: `<p>A deadlock is a cycle of transactions each waiting for a lock another holds. Prevent cycles by acquiring locks in a consistent global order (for example ascending id) everywhere, keep transactions short, avoid user interaction or remote calls while holding locks, lock only what you need, and prefer atomic statements. The database detects deadlocks and aborts one transaction, so callers must retry the victim a bounded number of times. Use lock timeouts and monitor deadlock counts in logs.</p>`, followUps: ['How does NOWAIT help?', 'What are gap locks in InnoDB?'] });
interview.push({ level: 'I', q: `How do you use read replicas safely from application code?`, a: `<p>Route only read-only work to replicas (writes and read-write transactions always go to the primary), using routing at the DataSource, a proxy, or the driver. Provide read-your-writes by sending a user's reads to the primary for a short window after they write, or by comparing a log position (LSN/GTID) with the replica's replay position. Keep decision reads and security checks on the primary, monitor lag and fall back to the primary when a replica is too far behind, use separate pools, and remember replicas are not backups and do not scale writes.</p>`, followUps: ['What is monotonic read consistency?', 'How would you test behaviour under lag?'] });
interview.push({ level: 'E', q: `The database CPU is high with 95% reads. Walk through your scaling plan.`, a: `<p>First reduce work: fix N+1 and add or correct indexes, check slow queries, use keyset pagination, add caching for hot reads with sensible invalidation. Then offload reads: add replicas with lag-aware routing, read-your-writes handling, and a dedicated analytics replica. Tune pools to the database's parallelism and add PgBouncer when pods multiply connections. Only if writes dominate consider vertical scaling, partitioning, or sharding. Measure at each step with load tests, track replica lag and pool metrics, and document the consistency level per endpoint.</p>`, followUps: ['When would you shard instead of adding replicas?', 'How do you validate the gain?'] });
interview.push({ level: 'E', q: `A new feature caused p99 latency to jump but the database CPU is low. How do you investigate data-access causes?`, a: `<p>Low database CPU with high latency suggests waiting, not computing. Check Hikari pending threads and acquire time (pool starvation), connections held in long transactions or remote calls, lock waits (pg_locks, blocked queries), N+1 round trips visible as hundreds of tiny queries in the trace, replica lag if reads moved to replicas, and network latency to the database. Compare traces before and after the release, look at pg_stat_activity for idle in transaction, and fix hold time, query count or lock scope. Add a query-count budget test and alerts on pending threads.</p>`, followUps: ['Which single graph would you check first?', 'How do you reproduce in staging?'] });
registerModule({
  id: 'be08',
  title: 'Data Access Patterns',
  intro: `<p>Most backend slowness and most backend bugs live where your code meets the database. This module teaches the seven patterns that decide whether your service is fast and correct under real traffic: <b>N+1 queries</b>, <b>eager vs lazy loading</b>, <b>connection pools</b> (HikariCP), <b>schema migrations</b> (Flyway/Liquibase), <b>offset vs keyset pagination</b>, <b>optimistic vs pessimistic locking</b>, and <b>read replicas</b> with read-your-writes. Every idea starts with an everyday analogy, then a visual, then runnable SQL or code, then the production traps interviewers love.</p>`,
  goals: [
    'Spot an N+1 in a SQL log and fix it with JOIN FETCH, batch loading or a DTO query',
    'Choose lazy vs eager per use case and avoid LazyInitializationException without hacks',
    'Size a connection pool with Little\'s Law and keep pods x pool under the database limit',
    'Ship a breaking schema change with zero downtime using expand and contract',
    'Convert offset pagination to keyset with a correct tie-breaker and index',
    'Prevent lost updates with a version column or row locks, and route reads to replicas without stale surprises'
  ],
  prereqs: `Backend 3 (Databases from Code: CRUD &amp; ORM Basics) and Backend 6 (Spring Boot Deep Dive, especially @Transactional). Basic SQL (JOIN, WHERE, ORDER BY) helps.`,
  hours: 12,
  databases: {
    shop: `CREATE TABLE customers(id INTEGER PRIMARY KEY, name TEXT NOT NULL, city TEXT NOT NULL);
INSERT INTO customers VALUES (1,'Asha','Pune'),(2,'Ben','Delhi'),(3,'Chen','Mumbai'),(4,'Dia','Pune'),(5,'Eli','Goa');
CREATE TABLE orders(id INTEGER PRIMARY KEY, customer_id INTEGER NOT NULL REFERENCES customers(id), status TEXT NOT NULL, total INTEGER NOT NULL, created_at TEXT NOT NULL);
WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i+1 FROM n WHERE i < 30)
INSERT INTO orders(id, customer_id, status, total, created_at)
SELECT i, (i % 5) + 1,
       CASE WHEN i % 4 = 0 THEN 'CANCELLED' WHEN i % 3 = 0 THEN 'SHIPPED' ELSE 'PAID' END,
       100 + (i * 37) % 400,
       date('2026-03-01', '+' || ((i - 1) / 3) || ' days')
FROM n;
CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_orders_created_id ON orders(created_at, id);
CREATE TABLE order_items(id INTEGER PRIMARY KEY, order_id INTEGER NOT NULL REFERENCES orders(id), product TEXT NOT NULL, qty INTEGER NOT NULL, price INTEGER NOT NULL);
INSERT INTO order_items(order_id, product, qty, price) SELECT id, 'pen', 1 + id % 3, 20 FROM orders;
INSERT INTO order_items(order_id, product, qty, price) SELECT id, 'notebook', 1, 90 FROM orders WHERE id % 2 = 0;
CREATE INDEX idx_items_order ON order_items(order_id);
CREATE TABLE accounts(id INTEGER PRIMARY KEY, owner TEXT NOT NULL, balance INTEGER NOT NULL, version INTEGER NOT NULL DEFAULT 0);
INSERT INTO accounts VALUES (1,'Asha',500,0),(2,'Ben',300,0);
CREATE TABLE stock(product TEXT PRIMARY KEY, qty INTEGER NOT NULL, version INTEGER NOT NULL DEFAULT 0);
INSERT INTO stock VALUES ('laptop',5,7),('mouse',40,2);`,
    migr: `CREATE TABLE users(id INTEGER PRIMARY KEY, name TEXT NOT NULL);
INSERT INTO users VALUES (1,'Asha Rao'),(2,'Ben Carter'),(3,'Chen Wu');
CREATE TABLE flyway_schema_history(installed_rank INTEGER PRIMARY KEY, version TEXT, description TEXT, checksum INTEGER, success INTEGER);
INSERT INTO flyway_schema_history VALUES (1,'1','create users',1000,1),(2,'2','seed users',1111,1);`
  },
  topics: topics, practice: practice, quiz: quiz, interview: interview
});
})();
