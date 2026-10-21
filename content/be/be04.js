(function () {
  var topics = [], practice = [], quiz = [], interview = [];

  function cp(o) { return JSON.parse(JSON.stringify(o)); }
  function hesc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function bx(id, label, x, y, w) {
    var n = { id: id, label: label === undefined ? id : label, x: x, y: y, shape: 'box' };
    if (w) n.w = w;
    return n;
  }

  /* =====================================================================
     TOPIC 1 — REST resource modelling
     ===================================================================== */
  topics.push({
    title: 'REST Resource Modelling: Nouns, Collections and Relationships',
    analogy: `<p>Think of a <b>big public library</b>. The building has sections (<i>books</i>, <i>members</i>), every book has a shelf address, and the librarian only knows a few actions: <i>find it, add it, replace it, remove it</i>. Nobody builds a section called "BorrowABookNow". A good REST API is the same: the <b>URL is the shelf address of a thing (a noun)</b>, and the <b>HTTP method is the action</b> you do to it.</p>`,
    explain: `<p>🟢 <b>The big idea.</b> In REST you split every API into <b>resources</b> (the things your business talks about: a book, a member, an order) and a small, fixed set of <b>verbs</b> (<code>GET</code>, <code>POST</code>, <code>PUT</code>, <code>PATCH</code>, <code>DELETE</code>). You never invent new verbs. You invent new nouns.</p>
      <p><b>Collection vs item.</b> A <i>collection</i> is a list: <code>/books</code>. An <i>item</i> is one member of it: <code>/books/9780135957059</code>. We use plural nouns so the pair reads naturally: <code>GET /books</code> = "give me the books", <code>GET /books/42</code> = "give me book 42".</p>
      ${H.table(['Want to…', 'Bad (verb in URL)', 'Good (noun + method)'], [
        ['List books', '<span class="c-r">GET /getAllBooks</span>', '<span class="c-g">GET /books</span>'],
        ['Add a book', '<span class="c-r">POST /createBook</span>', '<span class="c-g">POST /books</span>'],
        ['Delete a book', '<span class="c-r">GET /deleteBook?id=7</span>', '<span class="c-g">DELETE /books/7</span>'],
        ['Borrow a book', '<span class="c-r">POST /borrowBook</span>', '<span class="c-g">POST /members/5/loans</span> (creates a Loan)'],
        ['Cancel an order', '<span class="c-r">POST /cancelOrder</span>', '<span class="c-g">POST /orders/9/cancellation</span> or <code>PATCH /orders/9 {"status":"cancelled"}</code>']
      ])}
      <p><b>Relationships.</b> If a thing only makes sense <i>inside</i> another thing, nest it: <code>/members/5/loans</code> (loans of member 5). Rule of thumb: <b>nest at most two levels</b>. Beyond that, give the child its own top-level URL once it has an id: <code>/loans/88</code> works fine even though the loan was born under a member.</p>
      <p><b>Actions that are not CRUD.</b> "Borrow", "pay", "ship" feel like verbs. Turn them into a <i>new resource that records the event</i>: a <code>Loan</code>, a <code>Payment</code>, a <code>Shipment</code>. <code>POST /orders/9/payments</code> creates a payment. If the action truly has no result object (rare: "recalculate", "reindex"), a sub-resource like <code>POST /orders/9/recalculation</code> is acceptable and honest.</p>
      <p><b>Query string = view, path = identity.</b> The path says <i>which thing</i>. The query string says <i>how to look at the list</i>: filters, sort, page. <code>/books?genre=scifi&amp;sort=-rating</code> is still "the books collection", just a slice of it.</p>`,
    clues: [
      '"Design a REST API for a library / e-commerce / ride-sharing app" → list the <b>nouns</b> first, then attach methods',
      'A URL containing <code>get</code>, <code>create</code>, <code>delete</code>, <code>do</code> → the interviewer wants you to fix it into noun + method',
      '"How would you model <i>checkout</i> / <i>cancel</i> / <i>approve</i> as REST?" → make the event a resource (<code>/orders/9/payments</code>) or a state field',
      '"Nested vs flat URLs" → nest for ownership, but cap at two levels and expose children by id at top level',
      '"Should the id be in the path or the query?" → identity in the path, filtering in the query',
      '"Plural or singular?" → plural collections (<code>/books</code>), singular only for true singletons (<code>/me</code>, <code>/orders/9/receipt</code>)'
    ],
    code: [
      `// Plain Java: a tiny resource model + one place that builds URLs.
// Keeping URL building in ONE class stops "/books/" vs "/book/" typos.
public class LibraryModel {
    record Book(String isbn, String title, int copiesTotal) {}
    record Member(long id, String name) {}
    record Loan(long id, long memberId, String isbn, String dueDate) {}

    static final String BASE = "/api/v1";

    static String books()               { return BASE + "/books"; }
    static String book(String isbn)     { return books() + "/" + isbn; }
    static String members()             { return BASE + "/members"; }
    static String member(long id)       { return members() + "/" + id; }
    // a loan is BORN under a member...
    static String memberLoans(long id)  { return member(id) + "/loans"; }
    // ...but once it has an id it also lives at the top level (depth stays small)
    static String loan(long loanId)     { return BASE + "/loans/" + loanId; }

    public static void main(String[] args) {
        System.out.println("GET    " + book("9780135957059"));
        System.out.println("POST   " + memberLoans(5));
        System.out.println("DELETE " + loan(88));
    }
}`,
      {
        lang: 'java', check: false, title: 'Spring Boot: the same resource tree as controller routes',
        code: `@RestController
@RequestMapping("/api/v1")
class LibraryController {

    @GetMapping("/books")                       // list the collection (with ?genre=&sort=)
    Page<BookDto> list(@RequestParam(required = false) String genre, Pageable page) {
        return books.search(genre, page);
    }

    @GetMapping("/books/{isbn}")                // one item
    BookDto get(@PathVariable String isbn) {
        return books.findByIsbn(isbn).orElseThrow(() -> new NotFoundException(isbn));
    }

    @PostMapping("/members/{id}/loans")         // "borrow" = create a Loan resource
    ResponseEntity<LoanDto> borrow(@PathVariable long id, @RequestBody BorrowRequest req) {
        LoanDto loan = loans.create(id, req.isbn());
        return ResponseEntity
            .created(URI.create("/api/v1/loans/" + loan.id()))   // 201 + Location header
            .body(loan);
    }

    @GetMapping("/loans/{loanId}")              // top-level address of the child
    LoanDto loan(@PathVariable long loanId) {
        return loans.get(loanId);
    }
}`
      }
    ],
    codeTitle: ['Resource model and URL builder (plain Java)', 'The same tree in Spring Boot'],
    viz: {
      title: 'Build the resource URL tree',
      input: 'library',
      inputLabel: 'Domain: library or shop',
      gen: function (input) {
        var d = String(input || 'library').trim().toLowerCase();
        var M = {
          library: {
            arr: ['/api/v1', '/books', '/members', '/books/{isbn}', null, '/members/{id}', null, '/books/{isbn}/copies', '/books/{isbn}/reviews', null, null, '/members/{id}/loans', '/members/{id}/reservations', null, null],
            notes: {
              0: 'The API root. Everything hangs below one versioned base path.',
              1: '<code>/books</code> is a <b>collection</b> (plural noun). GET lists it, POST adds a book.',
              2: '<code>/members</code> is the second top-level noun. The two are independent things.',
              3: '<code>/books/{isbn}</code> is one <b>item</b>. GET reads it, PUT replaces it, PATCH edits it, DELETE removes it.',
              5: '<code>/members/{id}</code> is one member. Same four methods, same meaning.',
              7: 'Copies only exist <i>inside</i> a book, so they nest: <code>/books/{isbn}/copies</code>. That is two levels of nesting (book, then copies), still fine.',
              8: 'Reviews of a book: another owned child collection.',
              11: '"Borrow a book" becomes <b>POST /members/{id}/loans</b>. The verb turned into a noun (a Loan record).',
              12: 'Reservations work the same way. We stop nesting here; a loan or reservation gets its own top-level URL once it has an id.'
            }
          },
          shop: {
            arr: ['/api/v1', '/products', '/orders', '/products/{sku}', null, '/orders/{id}', null, '/products/{sku}/reviews', '/products/{sku}/inventory', null, null, '/orders/{id}/items', '/orders/{id}/payments', null, null],
            notes: {
              0: 'The API root, versioned.',
              1: '<code>/products</code> is the catalogue collection.',
              2: '<code>/orders</code> is the second top-level noun.',
              3: '<code>/products/{sku}</code> is one product.',
              5: '<code>/orders/{id}</code> is one order.',
              7: 'Reviews belong to a product, so they nest under it.',
              8: 'Inventory is a <b>singleton</b> sub-resource: one stock record per product (singular-ish noun, no id).',
              11: 'Order lines live inside the order: <code>POST /orders/{id}/items</code> adds a line.',
              12: '"Pay for an order" becomes <b>POST /orders/{id}/payments</b>, creating a Payment resource you can GET later.'
            }
          }
        };
        if (!M[d]) throw new Error('Type "library" or "shop"');
        var m = M[d], frames = [], shown = [];
        var idxs = [];
        m.arr.forEach(function (v, i) { if (v !== null) idxs.push(i); });
        idxs.forEach(function (i) {
          shown.push(i);
          var arr = m.arr.map(function (v, j) { return shown.indexOf(j) >= 0 ? v : null; });
          var hl = {};
          shown.forEach(function (j) { hl[j] = 'done'; });
          hl[i] = 'ok';
          frames.push({
            narr: m.notes[i] || ('Add <code>' + m.arr[i] + '</code>.'),
            parts: [{ type: 'tree', label: 'Resource URL tree (' + d + ')', arr: arr, hl: hl, tags: (function () { var t = {}; t[i] = 'new'; return t; })() }]
          });
        });
        var rows = d === 'library'
          ? [['GET', '/books', 'list books'], ['POST', '/books', 'add a book'], ['GET', '/books/{isbn}', 'read one'], ['PUT', '/books/{isbn}', 'replace whole book'], ['PATCH', '/books/{isbn}', 'change some fields'], ['DELETE', '/books/{isbn}', 'remove'], ['POST', '/members/{id}/loans', 'borrow = create Loan']]
          : [['GET', '/products', 'list products'], ['POST', '/orders', 'start an order'], ['GET', '/orders/{id}', 'read one order'], ['POST', '/orders/{id}/items', 'add a line'], ['PATCH', '/orders/{id}', 'change address / status'], ['POST', '/orders/{id}/payments', 'pay = create Payment'], ['DELETE', '/orders/{id}/items/{n}', 'remove a line']];
        frames.push({
          narr: 'Now the <b>verbs</b>: the tree stays the same, only the method changes the meaning. No new verbs were invented; the nouns carry the business meaning.',
          parts: [{ type: 'table', label: 'Method + URL = meaning', columns: ['Method', 'URL', 'Meaning'], rows: rows, hl: { 6: 'sel' } }]
        });
        frames.push({
          narr: 'The anti-pattern: <span class="c-r">verbs in the URL</span>. Every new feature adds a new endpoint name, caches and proxies cannot reason about them, and <code>GET /deleteBook</code> can be triggered by a link prefetcher.',
          parts: [{ type: 'table', label: 'RPC-style URLs to avoid', columns: ['URL', 'Problem'], rows: [['GET /deleteBook?id=7', 'GET must be safe; crawlers delete data'], ['POST /getBooks', 'POST cannot be cached or retried safely'], ['POST /doBorrow', 'No stable noun to GET later']], hl: { 0: 'bad', 1: 'bad', 2: 'bad' } }]
        });
        return frames;
      }
    },
    examples: [
      {
        title: 'Library: from user stories to resources',
        html: `<p>Stories: "browse books", "see one book", "join as member", "borrow a book", "see my loans", "return a book". Underline the nouns: <b>book, member, loan</b>. Now map every story:</p>
          ${H.table(['Story', 'Request', 'Success'], [['browse books', 'GET /books', '200'], ['see one book', 'GET /books/{isbn}', '200 / 404'], ['join', 'POST /members', '201 + Location'], ['borrow', 'POST /members/5/loans', '201 / 409 if no copy left'], ['my loans', 'GET /members/5/loans', '200'], ['return', 'PATCH /loans/88 {"returned":true}', '200']])}
          <p>Notice "return a book" is <i>not</i> a new endpoint. It is a state change of the Loan resource.</p>`
      },
      {
        title: 'E-commerce: orders, items and payments',
        html: `<p>An order has lines, lines have quantities, and payment is a separate event with its own lifecycle (pending, captured, refunded). If we hid payment inside <code>PATCH /orders/9 {"paid":true}</code> we could never store card-network ids, retries, or partial refunds. So: <code>POST /orders/9/payments</code> creates a <b>Payment</b>, <code>GET /payments/31</code> reads it, and <code>POST /payments/31/refunds</code> creates a Refund (again a noun).</p>
          ${H.kv([['Order', '/orders/9'], ['Order line', '/orders/9/items/2'], ['Payment', '/payments/31'], ['Refund', '/payments/31/refunds/1']], { label: 'Four nouns, four URLs' })}`
      },
      {
        title: 'Singletons and "me"',
        html: `<p>Some resources exist exactly once. The logged-in user is <code>/me</code> (not <code>/users/{myId}</code>, which leaks the id format and invites guessing). A product's stock record is <code>/products/{sku}/inventory</code>: no id, because there is one per product. Singletons are singular nouns and support <code>GET</code>/<code>PUT</code>/<code>PATCH</code> but usually not <code>POST</code> (nothing to add to) or collection-style listing.</p>`,
        code: { lang: 'http', code: `GET /api/v1/me HTTP/1.1\nHost: api.example.com\nAuthorization: Bearer <access-token>\n\nHTTP/1.1 200 OK\nContent-Type: application/json\n\n{"id": 5, "name": "Asha", "plan": "pro"}` }
      }
    ],
    deepDive: `<p>🟣 <b>What "REST" actually means.</b> Roy Fielding's 2000 thesis lists constraints: client-server, <b>stateless</b>, cacheable, <b>uniform interface</b>, layered system. "Uniform interface" is the one that gives us nouns plus a few verbs: intermediaries (CDNs, proxies, browsers) can act on a request without knowing your business, because <code>GET</code> always means "safe read". Most real APIs are "REST-ish" (Richardson maturity level 2: resources + verbs + status codes). Level 3 adds hypermedia links (see the HATEOAS topic).</p>
      <p><b>Identifiers.</b> Prefer opaque, stable ids. Sequential integers leak business volume ("we had 4,321 orders") and enable enumeration attacks (IDOR) if authorisation is weak; UUIDv7 or ULIDs are time-sortable and safe to expose. Never put mutable data (an email, a title) in the identity path.</p>
      <p><b>Nesting traps.</b> Deep nesting (<code>/a/1/b/2/c/3/d/4</code>) makes clients build long URLs, couples routes to ownership, and breaks when a child can move between parents. Also decide the "orphan lookup" rule: can a client fetch <code>/loans/88</code> without knowing the member? Usually yes, with an authorisation check.</p>
      <p><b>Trailing slash, case, and naming.</b> Pick one style (lowercase, hyphen-separated, no trailing slash) and make the other form redirect or 404 consistently. JSON field names: pick camelCase or snake_case once and keep it across the API.</p>
      <p><b>Not everything is CRUD.</b> Search (<code>GET /books?q=</code>), batch operations, long-running jobs (<code>POST /exports</code> returns <code>202</code> and a job resource) and state machines (<code>POST /orders/9/cancellation</code>) all fit as resources. If you catch yourself writing a verb, ask "what record does this action leave behind?" and name that record.</p>
      <p><b>Sub-resource vs query.</b> <code>/members/5/loans</code> is "the loans of member 5"; <code>/loans?member=5</code> is the same data seen through a filter. Offer the nested form when the parent is the natural way in, and the filter form when clients need cross-parent queries (all overdue loans).</p>`,
    aiEra: `<p>🤖 <b>What AI changes.</b> A coding assistant can scaffold a whole CRUD API from a one-line prompt in seconds, so the scarce skill is no longer typing routes but <b>naming the nouns and drawing boundaries</b>. Bad models get generated just as fast as good ones.</p>
      <p><b>Work with AI:</b> paste your user stories and ask "list the resources and their relationships, and flag any verb that is not CRUD; do not write code yet". Then argue with the answer. Ask it to produce an OpenAPI skeleton from your tree and diff it against your intent.</p>
      <p><b>Where AI goes wrong:</b> it loves RPC-style names (<code>/api/createUser</code>), invents inconsistent plural/singular mixes across files, and nests four levels deep because "it mirrors the database". It also sometimes exposes internal auto-increment ids.</p>
      <p><b>You must still own:</b> the resource boundaries (they outlive any code), the id strategy, and the rule for what is nested. Also, if LLM <i>agents</i> will call your API as tools, clean noun-based URLs with good descriptions make tool use far more reliable than a pile of verb endpoints.</p>`,
    problems: [
      {
        title: 'Fix the RPC-style Library API',
        level: 'Easy',
        tags: ['rest', 'resource modelling'],
        companies: ['Amazon', 'Atlassian'],
        statement: `<p>A junior wrote this library API. Rewrite it as resource-oriented REST: choose nouns, methods and where nesting belongs.</p>
          <pre>POST /createMember        GET /getBookById?id=7
POST /borrowBook          POST /returnBook
GET  /getLoansOfMember?m=5   POST /deleteMember</pre>`,
        constraints: `Max two nesting levels. Use plural nouns. Methods limited to GET, POST, PUT, PATCH, DELETE.`,
        example: `<p>${H.c('r', 'POST /createMember')} → ${H.c('g', 'POST /members')} (creates a member, returns 201 + Location).</p><p>Why: the method already says "create"; the URL only has to say <i>what</i>.</p>`,
        brute: { why: `<p>Keeping RPC names means a new endpoint for every feature, caches cannot treat <code>GET /getBook...</code> differently from anything else, and <code>POST /deleteMember</code> hides a destructive action behind a vague method. Clients need a manual for every verb.</p>` },
        mcq: { q: 'Best REST shape for "borrow a book"?', options: ['POST /borrowBook', 'POST /members/5/loans with {"isbn":"..."}', 'GET /members/5/borrow?isbn=...', 'PUT /books/isbn/borrowed'], answer: 1, explain: 'Borrowing creates a Loan record, so POST to the loans collection of the member. GET must never change state.' },
        hints: [
          `<p>Underline the nouns in each endpoint: member, book, loan. Those become URL segments; the verbs become methods.</p>`,
          `<p>"Borrow" and "return" are events about a <b>loan</b>. One creates a Loan, the other updates its state. Neither needs its own verb URL.</p>`,
          `<p>Recipe: <code>POST /members</code>, <code>GET /books/{id}</code>, <code>POST /members/{id}/loans</code>, <code>PATCH /loans/{id}</code> with <code>{"returnedAt": ...}</code>, <code>GET /members/{id}/loans</code>, <code>DELETE /members/{id}</code>.</p>`
        ],
        solution: {
          approach: `<p>Map each old endpoint to noun + method: createMember → <code>POST /members</code> (201, Location header). getBookById → <code>GET /books/7</code>. borrowBook → <code>POST /members/5/loans</code> with the isbn in the body, creating a Loan (409 if no copies remain). returnBook → <code>PATCH /loans/88</code> with <code>{"returnedAt":"2026-10-15"}</code> since returning is a state change on the existing Loan, and the loan has its own top-level URL once created. getLoansOfMember → <code>GET /members/5/loans</code>. deleteMember → <code>DELETE /members/5</code> (204). Nesting stays at depth two and each noun is plural.</p>`,
          complexity: `<p>Design exercise: no runtime complexity. The measurable win is fewer endpoint names (6 verbs collapse onto 3 nouns) and cacheable GETs.</p>`,
          followUps: ['What if returning a book must also compute a late fee?', 'Should DELETE /members/5 really delete if loans exist?']
        }
      }
    ]
  });

  /* =====================================================================
     TOPIC 2 — Methods, safety, idempotency, Idempotency-Key
     ===================================================================== */
  topics.push({
    title: 'HTTP Methods, Safety and Idempotency (Idempotency Keys)',
    analogy: `<p>An <b>elevator button</b>. Pressing "3" ten times still takes you to floor 3: that is <b>idempotent</b> (repeat = same end result). A <b>vending machine</b> is different: pressing "buy chips" twice drops two bags and charges you twice. Networks are flaky, so clients <i>will</i> press the button again when no reply arrives. Idempotency is how we make the vending machine behave like the elevator.</p>`,
    explain: `<p>🟢 <b>Two words, two meanings.</b></p>
      <ul><li><b>Safe</b> = the method does not change anything on the server (read-only). Browsers, crawlers and caches may call it freely.</li>
      <li><b>Idempotent</b> = doing it <i>N</i> times leaves the server in the same state as doing it once. (The <i>response</i> may differ: a second <code>DELETE</code> may say 404, but the state "gone" is the same.)</li></ul>
      ${H.table(['Method', 'Safe?', 'Idempotent?', 'Cacheable?', 'Typical use'], [
        ['GET', H.c('g', 'yes'), H.c('g', 'yes'), 'yes', 'read a resource'],
        ['HEAD', H.c('g', 'yes'), H.c('g', 'yes'), 'yes', 'headers only'],
        ['OPTIONS', H.c('g', 'yes'), H.c('g', 'yes'), 'no', 'CORS preflight, allowed methods'],
        ['PUT', H.c('r', 'no'), H.c('g', 'yes'), 'no', 'replace / create at a known URL'],
        ['DELETE', H.c('r', 'no'), H.c('g', 'yes'), 'no', 'remove'],
        ['POST', H.c('r', 'no'), H.c('r', 'NO'), 'rarely', 'create, trigger actions'],
        ['PATCH', H.c('r', 'no'), H.c('y', 'not guaranteed'), 'no', 'partial update']
      ])}
      <p><b>Why it matters.</b> Imagine <code>POST /payments</code>. The server charges the card, but the Wi-Fi drops before the "201 Created" reaches the phone. The app sees a timeout. Retry and you may charge twice; do not retry and you may never get your order. Because the client cannot tell "request lost" from "response lost", the safe design is: <b>make retries harmless</b>.</p>
      <p><b>The Idempotency-Key pattern.</b> The client generates a random key (a UUID) <i>once per user intention</i> and sends it as a header: <code>Idempotency-Key: 7f3c…</code>. The server remembers "key → result". First time: do the work, store the response. Same key again: skip the work and replay the stored response. Same key with a <i>different</i> body: reject with <code>422</code> (a client bug). Same key while the first call is still running: <code>409</code>.</p>
      ${H.table(['Attempt', 'Key', 'Server does', 'Client sees'], [['1', 'abc', 'charge $50, store result', '(response lost)'], ['2 (retry)', 'abc', H.c('g', 'skip, replay stored result'), '201 {paymentId: 31}'], ['3 (retry)', 'abc', H.c('g', 'skip again'), '201 {paymentId: 31}']])}`,
    clues: [
      '"The client times out and retries" / "network is unreliable" → idempotency',
      '"Avoid double charging / duplicate orders / duplicate emails" → Idempotency-Key header',
      '"Which methods are safe to retry automatically?" → GET, PUT, DELETE (idempotent); POST only with a key',
      '"At-least-once delivery" (queues, webhooks) → consumers must be idempotent',
      '"Is PATCH idempotent?" → depends on the patch: <code>{"status":"shipped"}</code> yes, <code>{"stock":"+1"}</code> no',
      '"Two requests arrive at the same instant with the same key" → atomic insert / unique constraint on the key'
    ],
    code: [
      `import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.function.LongSupplier;
import java.util.function.Supplier;

// A small, thread-safe Idempotency-Key store (in memory).
// Production: put the same logic in Redis (SET NX) or a DB table with a UNIQUE(key) constraint.
public class IdempotencyStore {
    enum State { IN_PROGRESS, COMPLETED }

    record Response(int status, String body) {}

    static final class Entry {
        final String fingerprint;   // hash of method + path + body: detects "same key, different request"
        final long createdAtMs;
        volatile State state = State.IN_PROGRESS;
        volatile Response response;
        Entry(String fingerprint, long createdAtMs) { this.fingerprint = fingerprint; this.createdAtMs = createdAtMs; }
    }

    private final ConcurrentHashMap<String, Entry> entries = new ConcurrentHashMap<>();
    private final long ttlMs;
    private final LongSupplier clock;

    IdempotencyStore(long ttlMs, LongSupplier clock) { this.ttlMs = ttlMs; this.clock = clock; }

    static String fingerprint(String method, String path, String body) throws Exception {
        MessageDigest md = MessageDigest.getInstance("SHA-256");
        byte[] h = md.digest((method + " " + path + "\\n" + body).getBytes(StandardCharsets.UTF_8));
        return HexFormat.of().formatHex(h);
    }

    Response execute(String key, String fingerprint, Supplier<Response> action) {
        long now = clock.getAsLong();
        // 1. drop this key if its TTL has passed (client may reuse an old key after 24h)
        entries.computeIfPresent(key, (k, e) -> now - e.createdAtMs > ttlMs ? null : e);

        // 2. atomic claim: exactly ONE caller wins putIfAbsent for a given key
        Entry mine = new Entry(fingerprint, now);
        Entry existing = entries.putIfAbsent(key, mine);

        if (existing == null) {                      // we are the first: do the real work
            try {
                Response r = action.get();
                mine.response = r;
                mine.state = State.COMPLETED;
                return r;
            } catch (RuntimeException ex) {          // crashed before producing a result:
                entries.remove(key, mine);           // free the key so a retry can try again
                throw ex;
            }
        }
        if (!existing.fingerprint.equals(fingerprint)) {
            return new Response(422, "Idempotency-Key was already used with a different request");
        }
        if (existing.state == State.IN_PROGRESS) {
            return new Response(409, "A request with this key is still in progress, retry shortly");
        }
        return existing.response;                    // replay the stored answer, do NOT charge again
    }

    public static void main(String[] args) throws Exception {
        long[] now = {0};
        IdempotencyStore store = new IdempotencyStore(24 * 3600_000L, () -> now[0]);
        AtomicInteger charges = new AtomicInteger();
        Supplier<Response> charge = () -> new Response(201, "{\\"paymentId\\":" + charges.incrementAndGet() + "}");

        String fp = fingerprint("POST", "/payments", "{\\"amount\\":5000}");
        System.out.println(store.execute("key-abc", fp, charge));   // 201 paymentId 1
        System.out.println(store.execute("key-abc", fp, charge));   // 201 paymentId 1 (replayed)
        System.out.println(store.execute("key-abc", fingerprint("POST", "/payments", "{\\"amount\\":9900}"), charge)); // 422
        System.out.println("real charges = " + charges.get());      // 1
    }
}`,
      {
        lang: 'java', check: false, title: 'Spring Boot: reading the header in a controller',
        code: `@PostMapping("/payments")
ResponseEntity<PaymentDto> pay(@RequestHeader("Idempotency-Key") String key,
                               @RequestBody @Valid PaymentRequest body,
                               @AuthenticationPrincipal User user) {
    // scope the key to the caller so two customers can never collide
    String scopedKey = user.id() + ":" + key;
    Response r = store.execute(scopedKey, fingerprintOf(body),
            () -> payments.charge(user, body));          // runs at most once per key
    return ResponseEntity.status(r.status()).body(r.payload());
}`
      },
      {
        lang: 'js', check: false, title: 'Express: the same idea as middleware',
        code: `// Express middleware (needs a shared store such as Redis in real life)
app.post('/payments', async (req, res) => {
  const key = req.get('Idempotency-Key');
  if (!key) return res.status(400).json({ title: 'Idempotency-Key header is required' });

  const scoped = req.user.id + ':' + key;
  // SET key value NX EX 86400  -> only the first caller gets "OK"
  const claimed = await redis.set(scoped, JSON.stringify({ state: 'in_progress' }), { NX: true, EX: 86400 });
  if (!claimed) {
    const saved = JSON.parse(await redis.get(scoped));
    if (saved.state === 'in_progress') return res.status(409).json({ title: 'Request in progress' });
    return res.status(saved.status).json(saved.body);   // replay
  }
  const result = await payments.charge(req.user, req.body);
  await redis.set(scoped, JSON.stringify({ state: 'done', status: 201, body: result }), { EX: 86400 });
  res.status(201).json(result);
});`
      },
      {
        lang: 'http', title: 'On the wire', code: `POST /api/v1/payments HTTP/1.1
Host: api.example.com
Authorization: Bearer <access-token>
Idempotency-Key: 7f3c9a52-18b4-4d2e-9f6a-0b1c2d3e4f50
Content-Type: application/json

{"orderId": 9, "amount": 5000, "currency": "USD"}

HTTP/1.1 201 Created
Location: /api/v1/payments/31
Idempotency-Replayed: false

{"id": 31, "status": "captured"}`
      }
    ],
    codeTitle: ['Idempotency-key store (plain Java, compiles and runs)', 'Spring controller', 'Express middleware', 'Raw HTTP exchange'],
    viz: {
      title: 'Retries with and without an Idempotency-Key',
      input: '3',
      inputLabel: 'Total attempts (2 to 5)',
      gen: function (input) {
        var n = parseInt(String(input).trim(), 10);
        if (isNaN(n) || n < 2 || n > 5) throw new Error('Enter a number of attempts between 2 and 5');
        var cols = ['#', 'Request', 'Idempotency-Key', 'Server action', 'Charges', 'Client sees'];
        var frames = [], rowsA = [], rowsB = [], hlA = {}, hlB = {}, i;
        frames.push({
          narr: 'A customer taps <b>Pay $50</b>. The server will charge the card, but on a flaky network the reply may get lost, so the app retries. We replay the same story twice: first with <b>no key</b>, then <b>with a key</b>.',
          parts: [{ type: 'text', html: '<b>Story:</b> request reaches server, server charges, response is lost. The client cannot tell whether the request or the reply was lost.' }]
        });
        for (i = 1; i <= n; i++) {
          rowsA.push([String(i), 'POST /payments $50', '(none)', 'charge card again', String(i) + ' x $50', i === n ? '201 (finally got a reply)' : 'timeout']);
          hlA[i - 1] = i === 1 ? 'cur' : 'bad';
          frames.push({
            narr: i === 1 ? 'Attempt 1 <b>without a key</b>: server charges $50 and the reply is lost.' : '<span class="c-r">Attempt ' + i + ' looks brand new to the server.</span> Nothing tells it this is a retry, so it charges <b>again</b>. Total charged: $' + (50 * i) + '.',
            parts: [{ type: 'table', label: 'WITHOUT Idempotency-Key', columns: cols, rows: rowsA.map(function (r) { return r.slice(); }), hl: JSON.parse(JSON.stringify(hlA)) }]
          });
        }
        for (i = 1; i <= n; i++) {
          rowsB.push([String(i), 'POST /payments $50', 'key-abc', i === 1 ? 'charge card, store result' : 'found key-abc, replay stored result', '1 x $50', i === n ? '201 {paymentId: 31}' : (i === 1 ? 'timeout' : 'timeout')]);
          hlB[i - 1] = i === 1 ? 'cur' : 'ok';
          frames.push({
            narr: i === 1 ? 'Attempt 1 <b>with key-abc</b>: server charges $50, saves "key-abc to result", reply is lost.' : '<span class="c-g">Attempt ' + i + ' carries the same key.</span> The server finds it, skips the charge and replays the saved reply. Charges still: 1.',
            parts: [
              { type: 'table', label: 'WITHOUT key (finished)', columns: cols, rows: rowsA, hl: hlA },
              { type: 'table', label: 'WITH Idempotency-Key', columns: cols, rows: rowsB.map(function (r) { return r.slice(); }), hl: JSON.parse(JSON.stringify(hlB)) }
            ]
          });
        }
        frames.push({
          narr: 'Result: without a key the customer paid <b class="c-r">$' + (50 * n) + '</b>; with a key they paid <b class="c-g">$50</b>. Same network, same retries, only the header differs.',
          parts: [
            { type: 'vars', vals: { 'charges (no key)': n, 'charges (with key)': 1 }, hl: { 'charges (no key)': 'bad', 'charges (with key)': 'ok' } },
            { type: 'table', label: 'With key, final', columns: cols, rows: rowsB, hl: hlB }
          ]
        });
        return frames;
      }
    },
    examples: [
      {
        title: 'Which methods can a client retry blindly?',
        html: `<p>HTTP clients, proxies and gateways (and your own retry library) will automatically retry <b>idempotent</b> methods but not <code>POST</code>. That is why: <code>PUT /users/5 {"name":"Asha"}</code> twice = same user. <code>DELETE /books/7</code> twice = book gone either way (second reply is 404 or 204; both are fine). <code>POST /orders</code> twice = <b>two</b> orders.</p>
          ${H.table(['Request', 'Retry-safe?', 'Why'], [['PUT /users/5 {"name":"Asha"}', H.c('g', 'yes'), 'same final state'], ['DELETE /books/7', H.c('g', 'yes'), 'already gone is still gone'], ['POST /orders', H.c('r', 'no (needs key)'), 'creates a new row each time'], ['PATCH /items/3 {"qty":5}', H.c('g', 'yes'), 'absolute value'], ['PATCH /items/3 {"qtyDelta":+1}', H.c('r', 'no'), 'relative change adds up']])}`
      },
      {
        title: 'Natural idempotency: let the client choose the id',
        html: `<p>Sometimes you do not need a key header at all. If the client generates the resource id, <code>PUT /payments/{clientUuid}</code> is idempotent by itself: the first call creates it (201), later calls find it exist (200 with the same body). The URL <i>is</i> the key. This also removes the "response lost, where is my resource?" problem because the client already knows the URL.</p>`,
        code: { lang: 'http', code: `PUT /api/v1/payments/0f8fad5b-d9cb-469f-a165-70867728950e HTTP/1.1\nContent-Type: application/json\n\n{"orderId": 9, "amount": 5000}\n\nHTTP/1.1 201 Created   (first time)\nHTTP/1.1 200 OK        (every retry, same body)` }
      },
      {
        title: 'Same key, different body = client bug',
        html: `<p>A key stands for <b>one intention</b>. If the app reuses <code>key-abc</code> for a $99 payment after using it for $50, silently replaying the $50 result would hide a bug (and confuse the user). Store a <b>fingerprint</b> (hash of method, path, normalised body) beside the key and compare. Mismatch → <code>422 Unprocessable Content</code> with a problem document saying the key was reused. Stripe does exactly this.</p>`
      },
      {
        title: 'Webhooks and queues: idempotent consumers',
        html: `<p>Kafka, SQS and payment-provider webhooks promise <b>at-least-once</b> delivery: the same event can arrive twice. The consumer therefore keeps a table of processed event ids: <code>INSERT INTO processed_events(id) VALUES (?)</code> with a primary key; if the insert fails with a duplicate-key error, skip the event. "At-least-once delivery + idempotent handler" is how you get <i>effectively-once</i> processing.</p>`,
        code: { lang: 'sql', code: `CREATE TABLE processed_events (event_id TEXT PRIMARY KEY, handled_at TEXT);
INSERT INTO processed_events VALUES ('evt_1001', '2026-10-15T10:00:00Z');
-- second delivery of the same event: ignore instead of failing
INSERT OR IGNORE INTO processed_events VALUES ('evt_1001', '2026-10-15T10:00:05Z');
SELECT COUNT(*) AS times_recorded FROM processed_events WHERE event_id = 'evt_1001';` }
      }
    ],
    deepDive: `<p>🟣 <b>Race conditions are the whole problem.</b> A naive "check if key exists, then run, then store" has a window where two concurrent retries both pass the check. The fix is an <b>atomic claim</b>: insert the key row <i>first</i> (state IN_PROGRESS) with a unique constraint or <code>SET NX</code>; only the winner proceeds. The loser reads the row: COMPLETED → replay, IN_PROGRESS → <code>409</code> (or wait and poll briefly).</p>
      <p><b>Crash windows.</b> The process may die after the side effect (card charged) but before saving the response. Two defences: (1) run "claim key + business write + store response" in <b>one database transaction</b> when the side effect is in the same DB; (2) for external side effects (card networks), pass <i>your key through</i> to the downstream API (Stripe accepts idempotency keys) so a retry cannot double charge even if your store lost the entry.</p>
      <p><b>Scope and TTL.</b> Scope keys per user/tenant (<code>userId:key</code>), keep them 24 hours to a few days (long enough for every sensible retry, short enough to bound storage), and never let clients choose keys of unbounded length. Return a header like <code>Idempotency-Replayed: true</code> so clients and logs can tell. An IETF draft standardises the <code>Idempotency-Key</code> header; its fine print (422 on mismatch, 409 on concurrent use) matches what is shown here.</p>
      <p><b>Idempotent does not mean "same response".</b> The spec only talks about intended <i>server state</i>. A repeated <code>DELETE</code> may return 404, and logging or metrics are allowed to change. It also does not mean "no side effects ever": <code>PUT</code> may bump a <code>lastModified</code> timestamp.</p>
      <p><b>Retries need friends.</b> Retry with <b>exponential backoff + jitter</b> and a cap, honour <code>Retry-After</code>, and set a total deadline. Otherwise a brief outage is turned into a retry storm that keeps the service down. Only retry <code>POST</code> when a key is present; only retry on network errors, 408, 429, 502, 503, 504, never on a 4xx caused by the request itself.</p>`,
    aiEra: `<p>🤖 <b>What AI changes.</b> LLM-driven <b>agents</b> call your API as tools and are even more retry-happy than humans: a model that sees a timeout will often "just try again", and long agent loops can replay a step after a crash. Idempotency keys are now a first-class requirement for any tool endpoint that spends money, sends mail or writes data.</p>
      <p><b>Work with AI:</b> ask the assistant to list every non-idempotent endpoint in your OpenAPI file and propose which need a key; ask it to write a concurrency test (100 threads, one key) and read what it asserts.</p>
      <p><b>Where AI goes wrong:</b> it generates a "check then insert" key lookup that is not atomic, forgets the fingerprint comparison, forgets TTL cleanup, stores the key <i>after</i> the side effect, or generates a new key on every retry in the client (which defeats the whole idea).</p>
      <p><b>You must still own:</b> choosing where the atomic boundary is, what happens on crash between side effect and save, and which operations genuinely need a key. Also: the model-generated key must be created once per user intention, not once per HTTP attempt.</p>`,
    problems: [
      {
        title: 'Is It Safe to Retry?',
        level: 'Easy',
        tags: ['idempotency', 'http methods'],
        companies: ['Stripe', 'PayPal'],
        statement: `<p>Your mobile app uses an HTTP client that automatically retries on timeouts. For each request below say whether a blind retry is safe, and if not, what you would add.</p>
          <ol><li><code>GET /orders/9</code></li><li><code>PUT /users/5</code> with the full user JSON</li><li><code>POST /orders</code></li><li><code>DELETE /carts/3</code></li><li><code>PATCH /wallets/2</code> with <code>{"balanceDelta": 10}</code></li></ol>`,
        constraints: `Answer per request: safe / unsafe + one-line reason. Network can lose either the request or the response.`,
        example: `<p><code>POST /orders</code> → ${H.c('r', 'unsafe')}: each attempt creates a new order. Add an <code>Idempotency-Key</code> header generated once per checkout click.</p>`,
        brute: { why: `<p>"Never retry anything" is safe but makes every flaky connection a user-visible error; "retry everything" duplicates orders and double-credits wallets. The naive rules waste either reliability or money.</p>` },
        mcq: { q: 'Which statement about DELETE is correct?', options: ['It is not idempotent because the second call returns 404', 'It is idempotent: the end state (resource gone) is the same after one or many calls', 'It is safe because it only removes data', 'It must never be retried'], answer: 1, explain: 'Idempotency is about server state, not identical responses. After one or ten DELETEs the resource is gone.' },
        hints: [
          `<p>Ask: if the request ran twice, would the final state differ from running it once?</p>`,
          `<p>Absolute values ("set balance to X") repeat safely; relative changes ("add 10") accumulate. Creation via POST generates a new id every time.</p>`,
          `<p>Answers: GET safe; PUT safe; POST unsafe (add key); DELETE safe; PATCH with delta unsafe (change to absolute value or add a key / version check).</p>`
        ],
        solution: {
          approach: `<p>1) GET is safe and idempotent, retry freely. 2) PUT replaces the whole resource with the same body, so repeated calls give the same state: safe. 3) POST /orders creates a new row per call: unsafe, so the client generates one UUID per checkout click and sends it as Idempotency-Key; the server dedupes. 4) DELETE is idempotent: first call 204, later calls 404 or 204, state identical; safe. 5) PATCH with a relative delta accumulates, so a retry after a lost response credits twice: unsafe. Fix by sending the absolute target balance with an If-Match version, or by sending a key with the delta.</p>`,
          complexity: `<p>Not algorithmic. Cost of fixing: one header and one key table lookup per mutating request.</p>`,
          followUps: ['How long should the server remember keys?', 'What if two different users send the same key string?']
        }
      }
    ]
  });

  /* =====================================================================
     TOPIC 3 — PUT vs PATCH, JSON Merge Patch, JSON Patch
     ===================================================================== */
  topics.push({
    title: 'PUT vs PATCH: Replacing, Merging and JSON Patch',
    analogy: `<p>You hand a tailor your <b>jacket</b>. <b>PUT</b> is "throw this jacket away and put this <i>brand-new</i> one in its place": whatever you did not bring is gone. <b>PATCH</b> is "just shorten the sleeves": everything else stays as it was. If you meant only to shorten the sleeves but sent a PUT, the jacket comes back with no buttons.</p>`,
    explain: `<p>🟢 <b>PUT = full replacement.</b> The body <i>is</i> the new state of the resource at that URL. Missing fields are removed or reset to defaults. Because the body is the whole truth, repeating it changes nothing: PUT is <b>idempotent</b>. It can also <i>create</i> a resource at a URL the client chose (201 if it did not exist, 200/204 if it did).</p>
      <p><b>PATCH = partial update.</b> The body describes a <i>change</i>, not the whole document. PATCH is not defined to be idempotent; whether it is depends on the patch format.</p>
      ${H.table(['', 'PUT', 'PATCH'], [
        ['Body means', 'the complete new document', 'a set of changes'],
        ['Missing field', H.c('r', 'removed / reset'), H.c('g', 'left alone')],
        ['Idempotent', H.c('g', 'always'), H.c('y', 'depends on the patch')],
        ['Payload size', 'large (everything)', 'small'],
        ['Lost-update risk', 'high (overwrites others\' edits)', 'lower, but still real']
      ])}
      <p><b>Two standard PATCH formats.</b></p>
      <p>1) <b>JSON Merge Patch</b> (RFC 7396, <code>Content-Type: application/merge-patch+json</code>): send a JSON object that looks like the part you want to change. Rules: a value replaces the old one; an object merges recursively; <code>null</code> means <b>delete this key</b>; arrays are replaced whole. Super easy to read.</p>
      <p>2) <b>JSON Patch</b> (RFC 6902, <code>application/json-patch+json</code>): a list of operations like <code>[{"op":"replace","path":"/price/amount","value":3999}]</code> with ops <code>add, remove, replace, move, copy, test</code>. More powerful: it can edit one array element and can <code>test</code> a value first.</p>
      ${H.kv([['Original', '{"title":"Clean Code","tags":["java"],"stock":12}'], ['PUT {"title":"Clean Code 2"}', '{"title":"Clean Code 2"}  ← tags and stock lost'], ['PATCH {"title":"Clean Code 2"}', '{"title":"Clean Code 2","tags":["java"],"stock":12}']], { label: 'Same small body, different verb' })}`,
    clues: [
      '"Update only some fields" / "partial update" / "mobile client sends changes" → PATCH',
      '"Replace the whole resource" / "idempotent update" / "client knows the full state" → PUT',
      '"How do I clear a field with PATCH?" → merge patch uses <code>null</code>, JSON Patch uses <code>remove</code>',
      '"Update one element of an array" → JSON Patch (merge patch replaces arrays whole)',
      '"Old client wipes new field it does not know about" → classic PUT pitfall; use PATCH or round-trip unknown fields',
      '"Two users edit at the same time" → add <code>If-Match</code>/ETag or a version field (see caching topic)'
    ],
    code: [
      {
        lang: 'js', run: true, title: 'JSON Merge Patch (RFC 7396) applier + diff generator',
        code: `// JSON Merge Patch (RFC 7396): apply a patch to a document.
// Rules: non-object patch REPLACES the target; object patch MERGES key by key;
// a null value DELETES the key; arrays are replaced as a whole.
function isObj(v) { return v !== null && typeof v === 'object' && !Array.isArray(v); }

function mergePatch(target, patch) {
  if (!isObj(patch)) return patch;                       // string, number, array, null ... replaces
  var result = isObj(target) ? Object.assign({}, target) : {};   // copy: never mutate the input
  Object.keys(patch).forEach(function (key) {
    if (key === '__proto__' || key === 'constructor') return;    // block prototype pollution
    var value = patch[key];
    if (value === null) delete result[key];                       // null means "remove this key"
    else result[key] = mergePatch(result[key], value);            // recurse for nested objects
  });
  return result;
}

// The inverse: build the smallest merge patch that turns "from" into "to".
function diffPatch(from, to) {
  if (!isObj(from) || !isObj(to)) return to;
  var patch = {};
  Object.keys(to).forEach(function (k) {
    if (!(k in from)) patch[k] = to[k];
    else if (JSON.stringify(from[k]) !== JSON.stringify(to[k])) patch[k] = diffPatch(from[k], to[k]);
  });
  Object.keys(from).forEach(function (k) { if (!(k in to)) patch[k] = null; });
  return patch;
}

var book = { title: 'Clean Code', author: 'R. Martin', tags: ['craft', 'java'],
             price: { amount: 2999, currency: 'USD' }, stock: 12 };
var patch = { title: 'Clean Code, 2nd ed', tags: null, price: { amount: 3999 } };

var once = mergePatch(book, patch);
var twice = mergePatch(once, patch);
console.log('PATCH once :', JSON.stringify(once));
console.log('PATCH twice:', JSON.stringify(twice));
console.log('idempotent?', JSON.stringify(once) === JSON.stringify(twice));
console.log('PUT body   :', JSON.stringify(patch), '<- this would be the whole new document');
console.log('diffPatch  :', JSON.stringify(diffPatch(book, once)));
console.log('original untouched:', JSON.stringify(book));`
      },
      {
        lang: 'python', run: true, title: 'JSON Patch (RFC 6902): add / replace / remove / test',
        code: `import copy

def unescape(tok):
    # JSON Pointer escapes: ~1 is "/", ~0 is "~"
    return tok.replace("~1", "/").replace("~0", "~")

def resolve(doc, path):
    """Return (parent, last_token) for a JSON Pointer like /price/amount or /tags/0."""
    toks = [unescape(t) for t in path.split("/")[1:]]
    parent = doc
    for t in toks[:-1]:
        parent = parent[int(t)] if isinstance(parent, list) else parent[t]
    return parent, toks[-1]

def apply_patch(doc, ops):
    doc = copy.deepcopy(doc)            # patches are atomic: work on a copy, fail = no change
    for op in ops:
        parent, last = resolve(doc, op["path"])
        kind = op["op"]
        if kind == "test":
            cur = parent[int(last)] if isinstance(parent, list) else parent[last]
            if cur != op["value"]:
                raise ValueError("test failed at " + op["path"] + " -> reply 409/422, nothing applied")
        elif kind == "replace":
            if isinstance(parent, list): parent[int(last)] = op["value"]
            else:
                if last not in parent: raise KeyError(op["path"])
                parent[last] = op["value"]
        elif kind == "add":
            if isinstance(parent, list):
                if last == "-": parent.append(op["value"])
                else: parent.insert(int(last), op["value"])
            else: parent[last] = op["value"]
        elif kind == "remove":
            if isinstance(parent, list): parent.pop(int(last))
            else: del parent[last]
        else:
            raise ValueError("unsupported op " + kind)
    return doc

book = {"title": "Clean Code", "tags": ["craft", "java"], "price": {"amount": 2999}, "stock": 12}
ops = [
    {"op": "test", "path": "/stock", "value": 12},            # only continue if stock is still 12
    {"op": "replace", "path": "/price/amount", "value": 3999},
    {"op": "add", "path": "/tags/-", "value": "classic"},       # append to array (merge patch cannot do this)
    {"op": "remove", "path": "/tags/0"},
]
result = apply_patch(book, ops)
print(result)
try:
    apply_patch({"stock": 5}, ops)
except Exception as e:
    print("rejected:", e)
print("applying 'add /tags/-' twice gives", apply_patch(result, [ops[2]])["tags"], "-> not idempotent")`
      },
      `import java.util.*;

// Plain-Java JSON Merge Patch over Map/List trees (what Jackson gives you with readValue(.., Map.class)).
public class MergePatch {
    @SuppressWarnings("unchecked")
    static Object apply(Object target, Object patch) {
        if (!(patch instanceof Map)) return patch;                 // scalar / array / null replaces
        Map<String, Object> result = target instanceof Map
                ? new LinkedHashMap<>((Map<String, Object>) target)  // copy, never mutate input
                : new LinkedHashMap<>();
        for (Map.Entry<String, Object> e : ((Map<String, Object>) patch).entrySet()) {
            if (e.getValue() == null) result.remove(e.getKey());     // null = delete key
            else result.put(e.getKey(), apply(result.get(e.getKey()), e.getValue()));
        }
        return result;
    }

    public static void main(String[] args) {
        Map<String, Object> addr = new LinkedHashMap<>(Map.of("city", "Pune", "zip", "411001"));
        Map<String, Object> user = new LinkedHashMap<>();
        user.put("name", "Asha");
        user.put("address", addr);
        user.put("phone", "123");

        Map<String, Object> patchAddr = new LinkedHashMap<>();
        patchAddr.put("zip", null);                 // delete zip
        patchAddr.put("country", "IN");             // add country
        Map<String, Object> patch = new LinkedHashMap<>();
        patch.put("address", patchAddr);
        patch.put("phone", null);                   // delete phone
        System.out.println(apply(user, patch));     // {name=Asha, address={city=Pune, country=IN}}
    }
}`,
      {
        lang: 'java', check: false, title: 'Spring Boot: PATCH endpoint with Jackson',
        code: `@PatchMapping(path = "/books/{isbn}", consumes = "application/merge-patch+json")
ResponseEntity<BookDto> patch(@PathVariable String isbn,
                              @RequestBody JsonNode patch,
                              @RequestHeader("If-Match") String etag) throws Exception {
    Book current = books.findByIsbn(isbn).orElseThrow(() -> new NotFoundException(isbn));
    if (!etagOf(current).equals(etag)) {
        return ResponseEntity.status(HttpStatus.PRECONDITION_FAILED).build();   // 412: someone else edited it
    }
    // A merge-patch library built on Jackson (java-json-tools json-patch) merges the patch into a copy of the current state (null clears optional fields)
    JsonNode merged = JsonMergePatch.fromJson(patch).apply(mapper.valueToTree(current));
    Book updated = mapper.treeToValue(merged, Book.class);
    validator.validate(updated);               // re-validate the RESULT, not the patch
    return ResponseEntity.ok(BookDto.from(books.save(updated)));
}`
      }
    ],
    codeTitle: ['Merge patch applier in JavaScript (runnable)', 'JSON Patch in Python (runnable)', 'Merge patch in plain Java', 'Spring Boot PATCH endpoint'],
    viz: {
      title: 'PUT vs PATCH: resulting documents',
      input: '{"title":"Clean Code, 2nd ed","tags":null,"price":{"amount":3999}}',
      inputLabel: 'Request body (JSON object)',
      gen: function (input) {
        var body;
        try { body = JSON.parse(String(input)); } catch (e) { throw new Error('Enter a JSON object, e.g. {"title":"New","tags":null}'); }
        if (body === null || typeof body !== 'object' || Array.isArray(body)) throw new Error('The body must be a JSON object');
        if (Object.keys(body).length > 6) throw new Error('Use at most 6 top-level keys');
        function isObj(v) { return v !== null && typeof v === 'object' && !Array.isArray(v); }
        function mp(t, p) {
          if (!isObj(p)) return p;
          var r = isObj(t) ? JSON.parse(JSON.stringify(t)) : {};
          Object.keys(p).forEach(function (k) { if (p[k] === null) delete r[k]; else r[k] = mp(r[k], p[k]); });
          return r;
        }
        function ent(o) { return Object.keys(o).map(function (k) { return [k, JSON.stringify(o[k])]; }); }
        var orig = { title: 'Clean Code', author: 'R. Martin', tags: ['craft', 'java'], price: { amount: 2999, currency: 'USD' }, stock: 12 };
        var frames = [];
        frames.push({ narr: 'The stored <b>book</b> on the server. Five fields. Both requests will try to change it.', parts: [{ type: 'map', label: 'Stored document', entries: ent(orig) }] });
        frames.push({ narr: 'The client sends this JSON body. Same body for <b>PUT</b> and for <b>PATCH</b>. Watch how differently the server treats it.', parts: [{ type: 'map', label: 'Stored document', entries: ent(orig) }, { type: 'map', label: 'Request body', entries: ent(body), hl: (function () { var h = {}; Object.keys(body).forEach(function (k) { h[k] = 'cur'; }); return h; })() }] });
        // PUT
        var lost = Object.keys(orig).filter(function (k) { return !(k in body); });
        var putHl = {}; Object.keys(body).forEach(function (k) { putHl[k] = 'ok'; });
        var putDoc = {}; Object.keys(body).forEach(function (k) { if (body[k] !== null) putDoc[k] = body[k]; });
        var lostHl = {}; lost.forEach(function (k) { lostHl[k] = 'bad'; });
        frames.push({
          narr: '<b>PUT</b> replaces the document with the body. ' + (lost.length ? '<span class="c-r">Fields not in the body vanish: ' + lost.join(', ') + '.</span> The client probably did not mean to delete them.' : 'The body mentioned every field, so nothing is lost this time.'),
          parts: [{ type: 'map', label: 'After PUT', entries: ent(putDoc), hl: putHl }, { type: 'map', label: 'Fields lost by PUT', entries: lost.map(function (k) { return [k, JSON.stringify(orig[k])]; }), hl: lostHl }]
        });
        // PATCH step by step
        var cur = JSON.parse(JSON.stringify(orig));
        Object.keys(body).forEach(function (k) {
          var p = {}; p[k] = body[k];
          var del = body[k] === null;
          var hl = {}; hl[k] = del ? 'bad' : 'ok';
          var shown = ent(cur);
          if (del) { shown = shown.map(function (e) { return e[0] === k ? [k, '(deleted)'] : e; }); }
          var nextDoc = mp(cur, p);
          frames.push({
            narr: '<b>PATCH</b> step: key <code>' + k + '</code> ' + (del ? 'is <b>null</b> = "delete this field".' : (isObj(body[k]) ? 'is an object, so it <b>merges</b> into the existing object (untouched sub-fields stay).' : 'has a value, so it <b>replaces</b> the old value.')),
            parts: [{ type: 'map', label: 'Document while patching', entries: del ? shown : ent(nextDoc), hl: hl }]
          });
          cur = nextDoc;
        });
        var patchHl = {}; Object.keys(cur).forEach(function (k) { if (!(k in orig) || JSON.stringify(orig[k]) !== JSON.stringify(cur[k])) patchHl[k] = 'ok'; });
        frames.push({
          narr: 'Side by side: <b>PATCH</b> keeps everything you did not mention. <b>PUT</b> keeps only what you sent. Applying the same merge patch again would change nothing (idempotent), as it carries absolute values.',
          parts: [{ type: 'map', label: 'Final after PUT', entries: ent(putDoc) }, { type: 'map', label: 'Final after PATCH (merge)', entries: ent(cur), hl: patchHl }]
        });
        return frames;
      }
    },
    examples: [
      {
        title: 'The classic PUT bug: the old app wipes a new field',
        html: `<p>The backend team adds a <code>nickname</code> field to users. The Android app from last year does not know it. It does <code>GET /users/5</code>, parses only the fields it knows into an object, edits the email, and sends a <code>PUT</code> with that object. The server dutifully replaces the document: <code>nickname</code> is now empty. Nothing "failed", data silently disappeared.</p>
          <p>Fixes: (1) mobile app sends <code>PATCH {"email": "..."}</code>; (2) server treats PUT as "replace the <i>client-owned</i> fields"; (3) clients round-trip unknown fields. This is why many public APIs prefer PATCH for edits.</p>`
      },
      {
        title: 'Merge patch gotchas',
        html: `<p>Three limits to remember: (1) <b>arrays are replaced whole</b>: patching <code>{"tags":["c"]}</code> turns <code>["a","b"]</code> into <code>["c"]</code>, you cannot append one tag. (2) <b>You cannot set a value to null</b>, because null already means delete. If you need "explicit null" use JSON Patch or a sentinel. (3) The patch must be a JSON object; a bare array or number would replace the entire document.</p>
          ${H.table(['Target', 'Patch', 'Result'], [['{"a":"b"}', '{"a":"c"}', '{"a":"c"}'], ['{"a":"b"}', '{"b":"c"}', '{"a":"b","b":"c"}'], ['{"a":"b"}', '{"a":null}', '{}'], ['{"a":["x","y"]}', '{"a":["z"]}', '{"a":["z"]}'], ['{"a":{"b":1,"c":2}}', '{"a":{"b":null}}', '{"a":{"c":2}}']])}`
      },
      {
        title: 'JSON Patch for array edits and guarded changes',
        html: `<p>Use <b>JSON Patch</b> when the change is about <i>position</i> or has a condition. Operations run in order and the whole patch is atomic: if any step fails (path missing, <code>test</code> mismatch), nothing is applied and you reply <code>409</code> or <code>422</code>.</p>`,
        code: { lang: 'http', code: `PATCH /api/v1/books/9780135957059 HTTP/1.1\nContent-Type: application/json-patch+json\nIf-Match: "v7"\n\n[\n  {"op": "test",    "path": "/stock",     "value": 12},\n  {"op": "replace", "path": "/stock",     "value": 11},\n  {"op": "add",     "path": "/tags/-",    "value": "borrowed"}\n]\n\nHTTP/1.1 200 OK\nETag: "v8"` }
      },
      {
        title: 'Which verb for which job? A quick decision',
        html: `${H.table(['Situation', 'Use'], [['Client has the full document (form "Save" button)', 'PUT'], ['Toggle one field, edit from a phone, tiny payload', 'PATCH (merge patch)'], ['Add/remove one array element, guarded update', 'PATCH (JSON Patch)'], ['Action with side effects ("send", "approve")', 'POST to an action/sub-resource'], ['Create at a client-chosen URL', 'PUT (201 first time)']])}
          <p>Advertise what you accept with <code>Accept-Patch: application/merge-patch+json</code> on OPTIONS/responses and answer <code>415 Unsupported Media Type</code> for patch formats you do not support.</p>`
      }
    ],
    deepDive: `<p>🟣 <b>PATCH idempotency, precisely.</b> RFC 5789 says PATCH is neither safe nor idempotent by definition. A merge patch with absolute values behaves idempotently in practice; a JSON Patch with <code>add /tags/-</code> or a "+1" style custom patch does not. If you want to retry safely, make the patch absolute, or add <code>If-Match</code> (the second attempt then fails 412 because the version moved on), or use an Idempotency-Key.</p>
      <p><b>Validation happens on the result.</b> After applying a patch, validate the <i>merged document</i> against the schema and business rules (required fields, min/max, state-machine transitions). Validating only the patch lets the client create invalid states, e.g. patching <code>status</code> from <code>shipped</code> back to <code>pending</code>.</p>
      <p><b>Read-only and server-managed fields.</b> <code>id</code>, <code>createdAt</code>, <code>version</code> must be rejected or ignored on both PUT and PATCH. Decide a policy (ignore silently vs 422) and document it; ignoring is friendlier to round-tripping clients, rejecting is safer against mass-assignment attacks (never bind a request body straight onto a JPA entity).</p>
      <p><b>Concurrency.</b> Both verbs suffer lost updates: two clients GET v7, both edit, last write wins. Use optimistic concurrency: return an <code>ETag</code> on GET, require <code>If-Match</code> on PUT/PATCH, answer <code>412 Precondition Failed</code> on mismatch and <code>428 Precondition Required</code> when the header is missing.</p>
      <p><b>Security.</b> Merge-patch appliers that walk keys recursively must block <code>__proto__</code>/<code>constructor</code> in JavaScript (prototype pollution) and cap depth and size to avoid resource exhaustion. In Java, avoid mapping straight onto entities; map to a DTO and copy allowed fields.</p>
      <p><b>PUT creating resources.</b> <code>PUT /books/{isbn}</code> is a legitimate upsert when the client owns the id. Return <code>201 Created</code> the first time and <code>200 OK</code> (or <code>204</code>) after. Use <code>If-None-Match: *</code> to say "only create, fail if exists" (412).</p>`,
    aiEra: `<p>🤖 <b>What AI changes.</b> LLM tool-calling agents tend to send <b>partial</b> argument objects and often omit fields they did not "think about". If your update tool is a PUT, an agent can wipe data in one confident call. Many agent platforms therefore expose PATCH-style or "set field X" tools with narrow schemas, plus a dry-run flag.</p>
      <p><b>Work with AI:</b> give the assistant your OpenAPI schema and ask it to list which fields should be immutable, which are server-managed, and write 10 PATCH edge cases (null, nested object, empty body, wrong content type). Use it to generate property-based tests: "apply patch twice equals apply once".</p>
      <p><b>Where AI goes wrong:</b> it conflates PUT and PATCH, applies a "patch" by overwriting, forgets that null means delete, mutates the stored object instead of a copy, and binds the request body straight onto the entity (mass assignment).</p>
      <p><b>You must still own:</b> the semantics decision (what does a missing field mean?), concurrency control, and the audit trail of who changed what. When agents write data, log the <i>diff</i> not just the final state.</p>`,
    problems: [
      {
        title: 'Apply a JSON Merge Patch by Hand',
        level: 'Easy',
        tags: ['patch', 'rfc7396'],
        companies: ['Google', 'Shopify'],
        statement: `<p>Apply the JSON Merge Patch to the target document and write the final JSON. Then say whether applying the same patch again changes anything.</p>
          <pre>target: {"name":"Asha","address":{"city":"Pune","zip":"411001"},"tags":["a","b"],"phone":"123"}
patch : {"name":"Asha K","address":{"zip":null,"country":"IN"},"tags":["c"],"phone":null}</pre>`,
        constraints: `Follow RFC 7396 exactly: objects merge, null deletes, arrays and scalars replace.`,
        example: `<p>Result: <code>{"name":"Asha K","address":{"city":"Pune","country":"IN"},"tags":["c"]}</code></p><p>${H.c('g', 'zip')} deleted, ${H.c('g', 'country')} added, ${H.c('y', 'tags')} replaced as a whole, ${H.c('r', 'phone')} deleted.</p>`,
        brute: { why: `<p>Treating the patch as a PUT body would drop <code>city</code> (not in patch) and keep <code>phone: null</code> as a literal null. Treating arrays as mergeable would give <code>["c","b"]</code> or <code>["a","b","c"]</code>, which RFC 7396 does not do.</p>` },
        mcq: { q: 'In JSON Merge Patch, what does {"phone": null} mean?', options: ['Set phone to the JSON value null', 'Delete the phone key', 'Ignore the key', 'Return 400'], answer: 1, explain: 'null is the delete marker in RFC 7396. That is why you cannot store an explicit null with merge patch.' },
        hints: [
          `<p>Go key by key through the patch. For each key ask: is the patch value an object, null, or something else?</p>`,
          `<p>Object value → recurse into the matching object. null → remove the key. Anything else (string, number, array) → overwrite.</p>`,
          `<p>name → "Asha K"; address → recurse: zip removed, country added, city untouched; tags → ["c"]; phone → removed. Reapplying gives the same output, so the patch is idempotent.</p>`
        ],
        solution: {
          approach: `<p>Walk the patch keys. <code>name</code> is a string so it replaces "Asha" with "Asha K". <code>address</code> is an object, so merge recursively: <code>zip: null</code> deletes zip, <code>country: "IN"</code> adds a key, and <code>city</code> is absent from the patch so it survives. <code>tags</code> is an array, which merge patch always replaces whole, giving ["c"]. <code>phone: null</code> deletes phone. Final: <code>{"name":"Asha K","address":{"city":"Pune","country":"IN"},"tags":["c"]}</code>. Applying it again: name already equal, zip already absent, country already set, tags equal, phone already gone, so nothing changes: idempotent because every value is absolute.</p>`,
          complexity: `<p>O(size of patch) key visits plus the copy cost of touched objects.</p>`,
          followUps: ['How would you change the tags array by adding one tag?', 'What if the client needs to store an explicit null?']
        }
      }
    ]
  });

  /* =====================================================================
     TOPIC 4 — Status code choice + error format
     ===================================================================== */
  topics.push({
    title: 'Choosing the Right Status Code (and a Good Error Body)',
    analogy: `<p>Status codes are like the <b>colours of a traffic light plus a short sign</b>. Green (2xx) = go, it worked. Amber-ish (3xx) = look somewhere else. Red because <i>you</i> did something wrong (4xx) = fix your request and try again. Red because <i>the road is broken</i> (5xx) = not your fault, try later. A good API driver reads the colour first and the sign second; a good API gives both.</p>`,
    explain: `<p>🟢 <b>The first digit tells who should act.</b> <b>2xx</b> success. <b>3xx</b> redirect or "use your cached copy". <b>4xx</b> the <i>client</i> must change something. <b>5xx</b> the <i>server</i> failed; the same request may work later. Retry logic, alerts and dashboards all key off this digit, so getting it right is not decoration.</p>
      ${H.table(['Code', 'Name', 'Use it when'], [
        ['200', 'OK', 'Success with a body (GET, PATCH, PUT that returns the doc)'],
        ['201', 'Created', 'POST/PUT made a new resource. Add <code>Location: /books/42</code>'],
        ['202', 'Accepted', 'Work queued, not finished (async job). Point to a status URL'],
        ['204', 'No Content', 'Success, nothing to return (DELETE, PUT/PATCH with no body)'],
        ['304', 'Not Modified', 'Conditional GET and the cached copy is still good'],
        ['400', 'Bad Request', 'Request is malformed: broken JSON, wrong types, bad query syntax'],
        ['401', 'Unauthorized', 'No / invalid / expired credentials ("who are you?")'],
        ['403', 'Forbidden', 'Known user, not allowed ("you may not")'],
        ['404', 'Not Found', 'No such resource (or you may not know it exists)'],
        ['405', 'Method Not Allowed', 'URL exists, method does not. Send <code>Allow:</code>'],
        ['409', 'Conflict', 'Valid request clashes with current state: duplicate, version, workflow'],
        ['412', 'Precondition Failed', '<code>If-Match</code> / <code>If-Unmodified-Since</code> check failed'],
        ['415', 'Unsupported Media Type', 'Body format not accepted (wrong Content-Type)'],
        ['422', 'Unprocessable Content', 'JSON is fine but the values break business/validation rules'],
        ['429', 'Too Many Requests', 'Rate limit hit. Send <code>Retry-After</code>'],
        ['500', 'Internal Server Error', 'Unexpected bug. Never leak stack traces'],
        ['502 / 503 / 504', 'Bad Gateway / Unavailable / Gateway Timeout', 'Upstream bad / overloaded or down for maintenance / upstream too slow']
      ])}
      <p><b>The decision order.</b> Check in this order and you rarely go wrong: <b>authenticated?</b> (401) → <b>allowed?</b> (403) → <b>exists?</b> (404) → <b>well-formed?</b> (400) → <b>valid values?</b> (422) → <b>clashes with current state?</b> (409) → success (200/201/204).</p>
      <p><b>Always send an error body.</b> The standard is <b>Problem Details</b> (RFC 9457, <code>application/problem+json</code>): <code>type</code>, <code>title</code>, <code>status</code>, <code>detail</code>, <code>instance</code>, plus your own fields like <code>errors[]</code>. Machines read <code>type</code>; humans read <code>detail</code>.</p>`,
    clues: [
      '"401 vs 403" → 401 = not logged in / bad token; 403 = logged in but not permitted',
      '"400 vs 422" → 400 for syntax/shape problems, 422 for well-formed but invalid business values (teams may use 400 for both: be consistent)',
      '"Duplicate email on sign-up" / "booking slot already taken" / "version mismatch" → 409 Conflict',
      '"Resource created" → 201 + <code>Location</code>; "queued" → 202; "deleted" → 204',
      '"Empty search result" → 200 with <code>[]</code>, not 404',
      '"Rate limiting" → 429 + <code>Retry-After</code>; "maintenance/overload" → 503 + <code>Retry-After</code>',
      '"Hide whether a private resource exists" → return 404 instead of 403'
    ],
    code: [
      `import java.util.*;

// Plain Java 21: map domain failures to HTTP status codes in ONE place,
// and render an RFC 9457 "problem+json" body. Controllers then just throw.
public class StatusMapper {
    sealed interface Failure permits Unauthenticated, Forbidden, NotFound, Malformed, Invalid, Conflict, RateLimited {}
    record Unauthenticated() implements Failure {}
    record Forbidden(String action) implements Failure {}
    record NotFound(String what, String id) implements Failure {}
    record Malformed(String why) implements Failure {}
    record Invalid(Map<String, String> fieldErrors) implements Failure {}
    record Conflict(String why) implements Failure {}
    record RateLimited(int retryAfterSeconds) implements Failure {}

    static int status(Failure f) {
        return switch (f) {
            case Unauthenticated u -> 401;
            case Forbidden fb      -> 403;
            case NotFound nf       -> 404;
            case Malformed m       -> 400;
            case Invalid i         -> 422;
            case Conflict c        -> 409;
            case RateLimited r     -> 429;
        };
    }

    static String title(Failure f) {
        return switch (f) {
            case Unauthenticated u -> "Authentication required";
            case Forbidden fb      -> "You may not " + fb.action();
            case NotFound nf       -> nf.what() + " " + nf.id() + " was not found";
            case Malformed m       -> "Malformed request: " + m.why();
            case Invalid i         -> "Validation failed";
            case Conflict c        -> c.why();
            case RateLimited r     -> "Too many requests, retry in " + r.retryAfterSeconds() + "s";
        };
    }

    static String problemJson(Failure f, String instance) {
        return "{\\"type\\":\\"https://api.example.com/problems/" + f.getClass().getSimpleName().toLowerCase()
             + "\\",\\"title\\":\\"" + title(f).replace("\\"", "'")
             + "\\",\\"status\\":" + status(f)
             + ",\\"instance\\":\\"" + instance + "\\"}";
    }

    public static void main(String[] args) {
        List<Failure> all = List.of(new Unauthenticated(), new Forbidden("delete this book"), new NotFound("Book", "42"),
            new Malformed("unexpected token at line 3"), new Invalid(Map.of("isbn", "must be 13 digits")),
            new Conflict("Email already registered"), new RateLimited(30));
        for (Failure f : all) System.out.println(status(f) + "  " + problemJson(f, "/books/42"));
    }
}`,
      {
        lang: 'java', check: false, title: 'Spring Boot 3: one @RestControllerAdvice using ProblemDetail',
        code: `@RestControllerAdvice
class ApiErrors extends ResponseEntityExceptionHandler {

    @ExceptionHandler(NotFoundException.class)
    ProblemDetail notFound(NotFoundException ex) {
        ProblemDetail pd = ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, ex.getMessage());
        pd.setTitle("Resource not found");
        pd.setType(URI.create("https://api.example.com/problems/not-found"));
        return pd;
    }

    @ExceptionHandler(DuplicateEmailException.class)
    ProblemDetail duplicate(DuplicateEmailException ex) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, "Email already registered");
    }

    @Override   // bean-validation errors -> 422 with a per-field list instead of the default 400
    protected ResponseEntity<Object> handleMethodArgumentNotValid(MethodArgumentNotValidException ex,
            HttpHeaders headers, HttpStatusCode status, WebRequest request) {
        ProblemDetail pd = ProblemDetail.forStatus(HttpStatus.UNPROCESSABLE_ENTITY);
        pd.setProperty("errors", ex.getFieldErrors().stream()
            .map(e -> Map.of("field", e.getField(), "message", String.valueOf(e.getDefaultMessage()))).toList());
        return ResponseEntity.unprocessableEntity().body(pd);
    }
}`
      },
      {
        lang: 'http', title: 'A 422 problem+json response', code: `POST /api/v1/members HTTP/1.1
Content-Type: application/json

{"email": "not-an-email", "age": -3}

HTTP/1.1 422 Unprocessable Content
Content-Type: application/problem+json

{
  "type": "https://api.example.com/problems/validation",
  "title": "Validation failed",
  "status": 422,
  "detail": "2 fields are invalid",
  "instance": "/api/v1/members",
  "errors": [
    {"field": "email", "message": "must be a valid email"},
    {"field": "age",   "message": "must be 0 or more"}
  ]
}`
      },
      {
        lang: 'json', title: 'Problem Details for a rate limit (must parse)', code: `{
  "type": "https://api.example.com/problems/rate-limit",
  "title": "Too many requests",
  "status": 429,
  "detail": "Limit is 100 requests per minute for this API key.",
  "retryAfterSeconds": 30
}`
      }
    ],
    codeTitle: ['Failure to status mapper (plain Java 21)', 'Spring Boot ProblemDetail advice', 'Raw 422 exchange', 'Rate limit problem body'],
    viz: {
      title: 'Status code decision path',
      input: 'invalid-field',
      inputLabel: 'Scenario: no-token, not-owner, missing, bad-json, invalid-field, duplicate, ok',
      gen: function (input) {
        var sc = String(input || 'ok').trim().toLowerCase();
        var fails = { 'no-token': 1, 'not-owner': 2, 'missing': 3, 'bad-json': 4, 'invalid-field': 5, 'duplicate': 6, 'ok': 99 };
        if (!(sc in fails)) throw new Error('Pick one of: no-token, not-owner, missing, bad-json, invalid-field, duplicate, ok');
        var failAt = fails[sc];
        var main = [
          { id: 'Req', label: 'Request', x: 6, y: 8 },
          { id: 'Auth', label: 'Authed?', x: 19, y: 8 },
          { id: 'Perm', label: 'Allowed?', x: 32, y: 8 },
          { id: 'Found', label: 'Exists?', x: 45, y: 8 },
          { id: 'Parse', label: 'Parses?', x: 58, y: 8 },
          { id: 'Valid', label: 'Valid?', x: 71, y: 8 },
          { id: 'State', label: 'No clash?', x: 84, y: 8 },
          { id: 'Done', label: '201', x: 96, y: 8 }
        ];
        var errs = [
          { id: 'E401', label: '401', x: 19, y: 40 }, { id: 'E403', label: '403', x: 32, y: 40 }, { id: 'E404', label: '404', x: 45, y: 40 },
          { id: 'E400', label: '400', x: 58, y: 40 }, { id: 'E422', label: '422', x: 71, y: 40 }, { id: 'E409', label: '409', x: 84, y: 40 }
        ];
        var nodes = main.concat(errs).map(function (n) { return { id: n.id, label: n.label, x: n.x, y: n.y, shape: 'box', w: 11 }; });
        var edges = [['Req', 'Auth'], ['Auth', 'Perm'], ['Perm', 'Found'], ['Found', 'Parse'], ['Parse', 'Valid'], ['Valid', 'State'], ['State', 'Done'],
          ['Auth', 'E401', 'no'], ['Perm', 'E403', 'no'], ['Found', 'E404', 'no'], ['Parse', 'E400', 'no'], ['Valid', 'E422', 'no'], ['State', 'E409', 'no']];
        var q = [
          '', 'Is there a valid, unexpired token? This is about <b>who you are</b>.',
          'The caller is known. Is this user allowed to do this to this resource? This is about <b>what you may do</b>.',
          'Does the target resource exist (and may the caller know it exists)?',
          'Can the body be parsed at all: valid JSON, right Content-Type, right types?',
          'The JSON is fine. Do the <b>values</b> satisfy the rules (email format, age ≥ 0, required fields)?',
          'Values are valid. Does the request clash with the <b>current state</b> (email taken, version moved on, slot booked)?'
        ];
        var codes = { 1: '401 Unauthorized', 2: '403 Forbidden', 3: '404 Not Found', 4: '400 Bad Request', 5: '422 Unprocessable Content', 6: '409 Conflict' };
        var why = {
          1: 'Add a <code>WWW-Authenticate</code> header. The client should log in / refresh the token and retry.',
          2: 'The identity is fine, the permission is not. Retrying with the same token will never help.',
          3: 'Nothing lives at that URL. (If the user must not learn it exists, use 404 even for "forbidden".)',
          4: 'Syntax-level problem. The client has a bug in how it builds the request.',
          5: 'Syntax OK, meaning not OK. Return a list of field errors in a problem+json body.',
          6: 'A perfectly valid request that cannot be applied right now. Say what clashed so the client can resolve it.'
        };
        var frames = [], ehl = {}, hl = {}, order = ['Req', 'Auth', 'Perm', 'Found', 'Parse', 'Valid', 'State'];
        var graph = function (extraHl, extraEhl, tags) {
          return { type: 'graph', label: 'Scenario: ' + sc, directed: true, height: 50, nodes: nodes, edges: edges, hl: extraHl, ehl: extraEhl, tags: tags || {} };
        };
        frames.push({ narr: 'A <b>POST /members</b> request arrives (scenario <code>' + sc + '</code>). The server asks its questions in a fixed order; the first "no" decides the status code.', parts: [graph({ Req: 'cur' }, {})] });
        for (var i = 1; i <= 6; i++) {
          var h = {}; Object.keys(hl).forEach(function (k) { h[k] = hl[k]; });
          h[order[i]] = 'cur';
          var passed = i < failAt;
          if (passed) {
            ehl[order[i - 1] + '-' + order[i]] = 'ok';
            frames.push({ narr: q[i] + ' <span class="c-g">Yes, continue.</span>', parts: [graph(h, JSON.parse(JSON.stringify(ehl)))] });
            hl[order[i]] = 'done';
          } else {
            ehl[order[i - 1] + '-' + order[i]] = 'ok';
            var eid = ['', 'E401', 'E403', 'E404', 'E400', 'E422', 'E409'][i];
            ehl[order[i] + '-' + eid] = 'bad';
            h[eid] = 'bad';
            var t = {}; t[eid] = 'stop';
            frames.push({ narr: q[i] + ' <span class="c-r">No.</span> Reply <b>' + codes[i] + '</b>. ' + why[i], parts: [graph(h, ehl, t), { type: 'text', html: '<b>' + codes[i] + '</b> with body <code>application/problem+json</code>' }] });
            return frames;
          }
        }
        ehl['State-Done'] = 'ok';
        var hh = {}; hh.Done = 'ok';
        frames.push({ narr: 'Every check passed. The member is created: reply <b class="c-g">201 Created</b> with a <code>Location: /members/17</code> header and the new resource in the body.', parts: [graph(hh, ehl, { Done: 'success' })] });
        return frames;
      }
    },
    examples: [
      {
        title: 'Edge cases: what would you return?',
        html: `${H.table(['Situation', 'Good answer', 'Why'], [
          ['Sign-up with an email that already exists', '<b>409</b> (some teams use 422)', 'valid data, clashes with state'],
          ['<code>DELETE /books/7</code> when 7 is already gone', '<b>204</b> or <b>404</b>', 'both OK; pick one and document it'],
          ['Search returns no matches', '<b>200</b> with <code>[]</code>', 'the search endpoint exists and worked'],
          ['<code>GET /orders/9</code> belonging to another customer', '<b>404</b> (or 403)', 'do not confirm that order 9 exists'],
          ['Body is <code>{"name": </code> (broken JSON)', '<b>400</b>', 'cannot even parse'],
          ['Age is -3', '<b>422</b>', 'parses, breaks a rule'],
          ['Export report takes 2 minutes', '<b>202</b> + <code>Location: /exports/12</code>', 'accepted, not done'],
          ['Upload 80 MB when limit is 10 MB', '<b>413</b>', 'body too large'],
          ['Client sends <code>text/xml</code> but you accept JSON', '<b>415</b>', 'unsupported media type'],
          ['Primary DB is down', '<b>503</b> + <code>Retry-After</code>', 'temporary, server side']
        ])}`
      },
      {
        title: '401 or 403? A tiny test',
        html: `<p>Ask: "would logging in <i>differently</i> help?" If the user could fix it by signing in or refreshing the token → <b>401</b> (and send <code>WWW-Authenticate: Bearer</code>). If no sign-in of this user helps because the rule says "admins only" → <b>403</b>. Despite its name, <code>401 Unauthorized</code> means "unauthenticated". Expired JWT → 401. Valid JWT but role <code>USER</code> calling an admin endpoint → 403.</p>`,
        code: { lang: 'http', code: `GET /api/v1/admin/users HTTP/1.1\nAuthorization: Bearer <expired-token>\n\nHTTP/1.1 401 Unauthorized\nWWW-Authenticate: Bearer error="invalid_token", error_description="token expired"\n\n---\n\nGET /api/v1/admin/users HTTP/1.1\nAuthorization: Bearer <valid-user-token>\n\nHTTP/1.1 403 Forbidden\nContent-Type: application/problem+json` }
      },
      {
        title: 'Created, accepted, no content: the 2xx family',
        html: `<p><b>201</b> says "a new resource exists now" and must carry <code>Location</code>. <b>202</b> says "I took your job but have not done it"; give the client a URL to poll and optionally <code>Retry-After</code>. <b>204</b> says "done, nothing to send back": the response must have no body, so do not send JSON with it. A <code>PUT</code> that creates → 201; that updates → 200 (with body) or 204.</p>
          ${H.table(['Operation', 'Typical success'], [['POST /books', '201 + Location + body'], ['PUT /books/7 (exists)', '200 or 204'], ['PUT /books/7 (new)', '201'], ['PATCH /books/7', '200 + updated doc'], ['DELETE /books/7', '204'], ['POST /exports (long job)', '202 + Location: /exports/12']])}`
      }
    ],
    deepDive: `<p>🟣 <b>Retries and codes are linked.</b> Clients, SDKs and gateways decide retry behaviour from the status code: retry 502/503/504 and 429 (after <code>Retry-After</code>), never retry 400/401/403/404/422 unchanged. A bug that returns 500 for a bad input makes clients hammer you with doomed retries; a bug that returns 400 for a transient outage makes them give up. Choosing the class correctly keeps load predictable.</p>
      <p><b>Monitoring.</b> SLOs usually count 5xx as errors and 4xx as the client's fault. If you return 500 for validation errors you burn your error budget on user typos. Conversely, a login endpoint returning 401 at a high rate may signal credential stuffing: alert on 4xx <i>patterns</i> too.</p>
      <p><b>Information leaks.</b> 401 vs 404 vs 403 reveals facts. Login should return the same message and status for "no such user" and "wrong password" (user enumeration). Private resources: use 404 for "not yours". Never put stack traces, SQL or internal hostnames in a 500 body; log them and return a correlation id (<code>traceId</code>) instead.</p>
      <p><b>The 400 vs 422 debate.</b> RFC 9110 defines 422 as "understood the content type and syntax but could not process the instructions". Real APIs differ: GitHub uses 422 for validation errors, while Stripe uses 400. Pick one rule, put it in the API guide, and be consistent: consistency beats purity.</p>
      <p><b>Redirect nuances.</b> 301/302 may let clients change POST to GET; 307 and 308 preserve the method and body. Use 308 for a permanent move of an API route, 303 for "POST done, now GET the result at Location". Do not hide a 200 with <code>{"success": false}</code> inside: that breaks caches, retries, monitoring and every generic client.</p>
      <p><b>Headers that travel with codes.</b> 201 → <code>Location</code>; 401 → <code>WWW-Authenticate</code>; 405 → <code>Allow</code>; 429/503 → <code>Retry-After</code>; 304 → <code>ETag</code>, <code>Cache-Control</code>; 412/428 → the missing precondition; 3xx → <code>Location</code>.</p>`,
    aiEra: `<p>🤖 <b>What AI changes.</b> An LLM agent reads your status code and problem body to decide its next move. A precise <code>detail</code> ("field <code>age</code> must be 0 or more") lets an agent self-correct in one retry; a vague <code>{"error":"bad request"}</code> makes it loop. Error messages are now part of your API's <i>prompt surface</i>.</p>
      <p><b>Work with AI:</b> paste your endpoint list and ask for a table of expected statuses per failure mode, then compare with what your code returns. Ask it to generate negative tests for each row.</p>
      <p><b>Where AI goes wrong:</b> it returns <code>200</code> with <code>{"success":false}</code>, uses 500 for everything, swaps 401/403, returns 404 for empty lists, and invents codes like 420. It also loves echoing exception messages (and stack traces) straight into the body.</p>
      <p><b>You must still own:</b> the error taxonomy and who gets to learn what (enumeration, existence leaks), plus the rule that agent-facing messages must never include secrets, other users' data or raw internals. Also be careful that error text is not an injection channel: content echoed from the request into a message that an LLM later reads can carry prompt injection.</p>`,
    problems: [
      {
        title: '401, 403 or 404? Private Order Lookup',
        level: 'Medium',
        tags: ['status codes', 'security'],
        companies: ['Shopify', 'Flipkart'],
        statement: `<p>Endpoint: <code>GET /orders/{id}</code>. Decide the status for each case and justify it, including whether you would leak that an order exists.</p>
          <ol><li>No Authorization header.</li><li>Token expired.</li><li>Valid token, order belongs to another customer.</li><li>Valid token, support-agent role, order belongs to a customer (agents are allowed).</li><li>Valid token, order id does not exist.</li><li>Valid token, id is <code>abc</code> but ids are integers.</li></ol>`,
        constraints: `Do not allow order-id enumeration. Each case needs a status and a one-line reason.`,
        example: `<p>Case 3: ${H.c('g', '404')} (not 403) so an attacker cannot learn which order ids exist by watching 403 vs 404.</p>`,
        brute: { why: `<p>Returning 403 for "someone else's order" and 404 for "no such order" lets anyone scan ids 1..N and map exactly which orders exist (information leak, and a stepping stone to IDOR attacks). Returning 200 with an error flag breaks clients and monitoring.</p>` },
        mcq: { q: 'A valid user requests an order that belongs to someone else. Best response for a customer-facing API?', options: ['200 with empty body', '403 with "this order belongs to Bob"', '404 Not Found', '500'], answer: 2, explain: '404 hides the existence of the order and prevents enumeration. Never reveal the owner.' },
        hints: [
          `<p>Walk the decision order: authenticated → allowed → exists → well-formed.</p>`,
          `<p>For "not allowed" vs "does not exist", ask whether the difference reveals something the caller should not know.</p>`,
          `<p>1) 401 + WWW-Authenticate; 2) 401 (token expired, refresh and retry); 3) 404; 4) 200; 5) 404; 6) 400 (malformed id; some APIs return 404 here too, just be consistent).</p>`
        ],
        solution: {
          approach: `<p>1) Missing credentials → 401 with <code>WWW-Authenticate: Bearer</code>, the client should authenticate. 2) Expired token → 401 too, with error <code>invalid_token</code> so the client can refresh. 3) Someone else's order → 404, deliberately indistinguishable from a missing order so ids cannot be enumerated; log the attempt internally as an authorisation denial for security monitoring. 4) Support agent with the right role → 200 and an audit log entry. 5) Unknown id → 404 with the same body shape as case 3. 6) Malformed id (<code>abc</code>) → 400 because the request itself is invalid before any lookup; alternatively 404 if your API treats unknown ids uniformly. Keep the problem+json <code>detail</code> generic in cases 3 and 5 so timing and text do not differ.</p>`,
          complexity: `<p>Constant time per check; the authorisation lookup should cost the same in the "not yours" and "not found" paths to avoid timing side channels.</p>`,
          followUps: ['When is 403 the better answer?', 'How do you keep response timing identical for 403-hidden-as-404?']
        }
      }
    ]
  });

  /* =====================================================================
     TOPIC 5 — Pagination, filtering, sorting
     ===================================================================== */
  topics.push({
    title: 'Pagination, Filtering and Sorting (Offset vs Cursor)',
    analogy: `<p>Reading a <b>very long scroll of paper</b>. <b>Offset paging</b> is "go to line 4,000 and read 20 lines": every time you must count 4,000 lines from the top, and if someone inserts a line above while you read, you see a line twice. <b>Cursor paging</b> is a <b>bookmark</b>: "continue right after this sentence". No counting, and inserts above your bookmark cannot move it.</p>`,
    explain: `<p>🟢 <b>Never return an unbounded list.</b> A table with a million rows must come back in <b>pages</b>, with a hard maximum page size (say 100) even if the client asks for more.</p>
      <p><b>Offset pagination</b> (<code>GET /books?page=3&amp;size=20</code> or <code>?offset=40&amp;limit=20</code>): simple, lets you jump to page 50, easy to show "page 3 of 12". Cost: the database still walks past all skipped rows (<code>OFFSET 100000</code> reads and throws away 100,000 rows), and results <b>drift</b> when data changes between requests (duplicates or skipped items).</p>
      <p><b>Cursor (keyset) pagination</b> (<code>GET /books?limit=20&amp;cursor=eyJ...</code>): the server returns an opaque <b>cursor</b> that encodes "the last row you saw". The next query is <code>WHERE (created_at, id) &lt; (:lastTime, :lastId) ORDER BY created_at DESC, id DESC LIMIT 21</code>. It uses an index seek, so page 1 and page 10,000 cost the same, and the list is stable under inserts. You trade away random page jumps and exact totals.</p>
      ${H.table(['', 'Offset', 'Cursor / keyset'], [
        ['Jump to page N', H.c('g', 'yes'), H.c('r', 'no (only next/prev)')],
        ['Cost of deep page', H.c('r', 'O(offset)'), H.c('g', 'O(page size)')],
        ['Stable while data changes', H.c('r', 'no'), H.c('g', 'yes')],
        ['Total count', 'easy but costs a COUNT(*)', 'usually omitted'],
        ['Best for', 'admin tables, small data', 'feeds, timelines, big data, exports']
      ])}
      <p><b>Response shape.</b> Return the page plus how to get the next one: <code>{"data":[...], "page":{"nextCursor":"...","hasMore":true}}</code>, or standard <code>Link: &lt;...?cursor=abc&gt;; rel="next"</code> headers. Treat the cursor as <b>opaque</b>: clients must not parse it, so you can change its insides later.</p>
      <p><b>Filtering</b> = narrowing: <code>?status=open&amp;genre=scifi&amp;published_after=2024-01-01&amp;price_lte=50</code>. <b>Sorting</b> = ordering: <code>?sort=-rating,title</code> (a leading <code>-</code> means descending). Always <b>whitelist</b> the fields clients may filter and sort on, and always add a <b>unique tie-breaker</b> (like <code>id</code>) so the order is total.</p>`,
    clues: [
      '"Millions of rows" / "infinite scroll" / "feed" → cursor (keyset) pagination',
      '"Page 5000 is slow" / "OFFSET gets slower" → the DB walks the skipped rows; switch to keyset',
      '"Duplicates or missing items when new data arrives while paging" → offset drift',
      '"Sort by createdAt but many rows share the same timestamp" → add <code>id</code> as tie-breaker in sort AND cursor',
      '"Let users sort by any column" → allowlist columns, never concatenate the sort parameter into SQL',
      '"Show total pages" → needs COUNT(*): cache it, estimate it, or drop it',
      '"Opaque cursor" → base64url of the sort key values (+ version, + signature)'
    ],
    code: [
      {
        lang: 'js', run: true, title: 'Cursor encoder/decoder + keyset pagination vs offset (runnable)',
        code: `// An opaque cursor = base64url(JSON{ v, c: createdAt, i: id }) + "." + checksum.
// The checksum catches accidental edits. In production use HMAC-SHA256 with a key from configuration.
var SIGNING_KEY = 'replace-with-key-from-config';   // placeholder, never hardcode real keys

function checksum(s) {                  // FNV-1a 32-bit: tiny demo hash, NOT cryptographic
  var h = 0x811c9dc5, t = s + SIGNING_KEY;
  for (var i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16);
}
function b64urlEncode(str) {
  return btoa(str).split('+').join('-').split('/').join('_').split('=').join('');
}
function b64urlDecode(s) {
  s = s.split('-').join('+').split('_').join('/');
  while (s.length % 4) s += '=';
  return atob(s);
}
function encodeCursor(item) {
  var body = JSON.stringify({ v: 1, c: item.createdAt, i: item.id });
  return b64urlEncode(body) + '.' + checksum(body);
}
function decodeCursor(cursor) {           // throws -> API answers 400 "invalid cursor"
  var parts = String(cursor).split('.');
  if (parts.length !== 2) throw new Error('invalid cursor');
  var body;
  try { body = b64urlDecode(parts[0]); } catch (e) { throw new Error('invalid cursor'); }
  if (checksum(body) !== parts[1]) throw new Error('invalid cursor (tampered)');
  var k = JSON.parse(body);
  if (k.v !== 1) throw new Error('unsupported cursor version');
  return k;
}

// Newest first, ties on createdAt broken by id (a TOTAL order).
function sortDesc(all) { return all.slice().sort(function (a, b) { return b.createdAt - a.createdAt || b.id - a.id; }); }

// Keyset page: fetch limit+1 rows to learn "hasMore" without a COUNT(*).
function keysetPage(all, limit, cursor) {
  var rows = sortDesc(all);
  if (cursor) {
    var k = decodeCursor(cursor);
    rows = rows.filter(function (r) { return r.createdAt < k.c || (r.createdAt === k.c && r.id < k.i); }); // (createdAt,id) < (c,i)
  }
  var slice = rows.slice(0, limit + 1);
  var hasMore = slice.length > limit;
  var data = slice.slice(0, limit);
  return { data: data, nextCursor: hasMore ? encodeCursor(data[data.length - 1]) : null, hasMore: hasMore };
}
function offsetPage(all, offset, limit) { return sortDesc(all).slice(offset, offset + limit); }
function ids(rows) { return rows.map(function (r) { return r.id; }).join(','); }

var items = [];
for (var n = 1; n <= 12; n++) items.push({ id: n, createdAt: 1000 + Math.floor(n / 3) });   // many timestamp ties

var p1 = keysetPage(items, 4, null);
console.log('page 1 ids      :', ids(p1.data), ' next =', p1.nextCursor);
var off1 = offsetPage(items, 0, 4);

items.push({ id: 13, createdAt: 1010 });          // somebody posts while we read page 1
var p2 = keysetPage(items, 4, p1.nextCursor);
console.log('cursor page 2   :', ids(p2.data), ' (no duplicates)');
console.log('offset page 2   :', ids(offsetPage(items, 4, 4)), ' (item', off1[off1.length - 1].id, 'shows up AGAIN)');

try { decodeCursor(p1.nextCursor.slice(0, -1) + 'x'); } catch (e) { console.log('tampered cursor ->', e.message, '-> HTTP 400'); }
var last = keysetPage(items, 100, null);
console.log('hasMore on a big page:', last.hasMore, ' nextCursor:', last.nextCursor);`
      },
      {
        lang: 'sql', title: 'Keyset (seek) query in SQL, runnable in SQLite',
        code: `CREATE TABLE posts (id INTEGER PRIMARY KEY, created_at INTEGER NOT NULL, title TEXT);
CREATE INDEX idx_posts_created_id ON posts (created_at DESC, id DESC);   -- the index the seek uses
INSERT INTO posts (id, created_at, title) VALUES
 (1,1000,'a'),(2,1000,'b'),(3,1001,'c'),(4,1001,'d'),(5,1001,'e'),(6,1002,'f'),(7,1002,'g'),(8,1002,'h');

-- Page 1 (no cursor): ask for LIMIT 3+1 to know if there is a next page.
SELECT id, created_at FROM posts ORDER BY created_at DESC, id DESC LIMIT 4;

-- Page 2: the cursor said "last seen = (created_at 1002, id 7)".
-- Row-value comparison keeps BOTH columns together, so ties on created_at are handled.
SELECT id, created_at FROM posts
WHERE (created_at, id) < (1002, 7)
ORDER BY created_at DESC, id DESC
LIMIT 4;

-- The slow alternative: OFFSET still reads and discards the skipped rows.
SELECT id, created_at FROM posts ORDER BY created_at DESC, id DESC LIMIT 3 OFFSET 3;`
      },
      `import java.util.*;

// Safe sorting: the client sends sort=-rating,title ; we translate through an ALLOWLIST.
// The raw parameter is NEVER pasted into SQL (that would be SQL injection).
public class SortParser {
    record SortKey(String column, boolean desc) {}

    static final Map<String, String> ALLOWED = Map.of(
            "rating", "b.rating",
            "title", "b.title",
            "published", "b.published_at");

    static List<SortKey> parse(String sortParam) {
        List<SortKey> keys = new ArrayList<>();
        if (sortParam == null || sortParam.isBlank()) sortParam = "-published";   // default order
        for (String part : sortParam.split(",")) {
            part = part.trim();
            boolean desc = part.startsWith("-");
            String name = desc ? part.substring(1) : part;
            String column = ALLOWED.get(name);
            if (column == null) throw new IllegalArgumentException("Cannot sort by '" + name + "'. Allowed: " + new TreeSet<>(ALLOWED.keySet()));
            keys.add(new SortKey(column, desc));
        }
        keys.add(new SortKey("b.id", true));     // unique tie-breaker => total order => stable pages
        return keys;
    }

    static String orderBy(List<SortKey> keys) {
        StringJoiner sj = new StringJoiner(", ", "ORDER BY ", "");
        for (SortKey k : keys) sj.add(k.column() + (k.desc() ? " DESC" : " ASC"));
        return sj.toString();
    }

    public static void main(String[] args) {
        System.out.println(orderBy(parse("-rating,title")));   // ORDER BY b.rating DESC, b.title ASC, b.id DESC
        try { parse("title; DROP TABLE books"); } catch (IllegalArgumentException e) { System.out.println("400: " + e.getMessage()); }
    }
}`,
      {
        lang: 'http', title: 'Cursor pagination on the wire', code: `GET /api/v1/books?genre=scifi&sort=-rating&limit=2 HTTP/1.1

HTTP/1.1 200 OK
Content-Type: application/json
Link: </api/v1/books?genre=scifi&sort=-rating&limit=2&cursor=eyJ2IjoxfQ.9a1f>; rel="next"

{
  "data": [ {"id": 8, "title": "Dune"}, {"id": 3, "title": "Neuromancer"} ],
  "page": { "limit": 2, "hasMore": true, "nextCursor": "eyJ2IjoxfQ.9a1f" }
}`
      },
      {
        lang: 'java', check: false, title: 'Spring Data: offset (Pageable) vs keyset (Window, Spring Data 3.1+)',
        code: `// Offset: easy, fine for small tables
Page<Book> page = repo.findByGenre("scifi", PageRequest.of(2, 20, Sort.by("rating").descending().and(Sort.by("id"))));

// Keyset with Spring Data's ScrollPosition (Spring Data JPA 3.1+)
Window<Book> first = repo.findFirst20ByGenreOrderByRatingDescIdDesc("scifi", ScrollPosition.keyset());
ScrollPosition next = first.positionAt(first.size() - 1);          // "bookmark" at the last element
Window<Book> second = repo.findFirst20ByGenreOrderByRatingDescIdDesc("scifi", next);
boolean hasMore = second.hasNext();`
      }
    ],
    codeTitle: ['Cursor codec + keyset paging (JavaScript, runnable)', 'Keyset query (SQL, runnable)', 'Safe sort parser (plain Java)', 'HTTP exchange with Link header', 'Spring Data'],
    viz: {
      title: 'Offset vs cursor pagination while data changes',
      input: '4',
      inputLabel: 'Page size (2 to 5)',
      gen: function (input) {
        var size = parseInt(String(input).trim(), 10);
        if (isNaN(size) || size < 2 || size > 5) throw new Error('Enter a page size between 2 and 5');
        var N = 12, arr = [], i;
        for (i = N; i >= 1; i--) arr.push(i);       // newest first
        var frames = [];
        function win(from, len, extra) {
          var h = {};
          for (var j = from; j < from + len; j++) h[j] = 'cur';
          if (extra) Object.keys(extra).forEach(function (k) { h[k] = extra[k]; });
          return h;
        }
        frames.push({
          narr: 'A feed, newest first (ids ' + N + ' down to 1). We read pages of <b>' + size + '</b>. Page 1 is the same for both styles: <code>offset=0</code> / no cursor. The cursor remembers "last seen id = ' + arr[size - 1] + '".',
          parts: [{ type: 'array', label: 'Page 1 (amber window)', values: arr, hl: win(0, size, (function () { var o = {}; o[size - 1] = 'sel'; return o; })()), showIdx: true }]
        });
        // Story A: insert at the front
        var A = [N + 1].concat(arr);
        frames.push({
          narr: 'While you read, someone <b>posts a new item (id ' + (N + 1) + ')</b>. It lands at the front, so every old item shifts one position to the right.',
          parts: [{ type: 'array', label: 'Feed after insert', values: A, hl: (function () { var o = {}; o[0] = 'ok'; return o; })(), showIdx: true }]
        });
        var dup = {}; dup[size] = 'bad';
        frames.push({
          narr: '<b>Offset</b> page 2 = positions ' + size + ' to ' + (2 * size - 1) + '. Position ' + size + ' now holds id <b>' + A[size] + '</b>, which you <span class="c-r">already saw on page 1</span>. A duplicate!',
          parts: [{ type: 'array', label: 'Offset page 2 (offset=' + size + ')', values: A, hl: win(size, size, dup), showIdx: true }]
        });
        var cs = A.indexOf(arr[size - 1]) + 1;
        var cm = {}; cm[cs - 1] = 'sel';
        frames.push({
          narr: '<b>Cursor</b> page 2 = "items older than id ' + arr[size - 1] + '". The bookmark is an item, not a position, so the insert above it does not matter: the window starts at position ' + cs + ' with no repeats.',
          parts: [{ type: 'array', label: 'Cursor page 2 (after id ' + arr[size - 1] + ')', values: A, hl: win(cs, size, cm), showIdx: true }]
        });
        // Story B: delete from page 1
        var delId = arr[0];
        var B = arr.filter(function (v) { return v !== delId; });
        var skipIdx = size - 1;                       // first item of correct page 2 now sits at position size-1
        var sk = {}; sk[skipIdx] = 'bad';
        frames.push({
          narr: 'Different day: you read page 1, then <b>item ' + delId + ' (already seen) is deleted</b>. Everything after it shifts one position to the <b>left</b> (next frame).',
          parts: [{ type: 'array', label: 'Feed before delete (red item is about to vanish)', values: arr, hl: (function () { var o = {}; o[0] = 'bad'; return o; })(), showIdx: true }]
        });
        frames.push({
          narr: '<b>Offset</b> page 2 starts at position ' + size + ', so id <b>' + B[skipIdx] + '</b> at position ' + skipIdx + ' is <span class="c-r">skipped and never shown</span>. Silent data loss in the UI.',
          parts: [{ type: 'array', label: 'Offset page 2 (offset=' + size + ')', values: B, hl: win(size, size, sk), showIdx: true }]
        });
        var cm2 = {}; cm2[skipIdx - 1] = 'sel';
        frames.push({
          narr: '<b>Cursor</b> page 2 still starts right after the bookmark (id ' + arr[size - 1] + '), so id ' + B[skipIdx] + ' appears. Nothing is missed.',
          parts: [{ type: 'array', label: 'Cursor page 2', values: B, hl: win(skipIdx, size, cm2), showIdx: true }]
        });
        var pages = [1, 10, 1000, 100000];
        frames.push({
          narr: 'The cost story with page size ' + size + ': <b>offset</b> must walk every skipped row; <b>keyset</b> jumps straight to the bookmark through the index.',
          parts: [{ type: 'table', label: 'Rows the database touches for page P', columns: ['Page P', 'Offset: rows read', 'Keyset: rows read'], rows: pages.map(function (p) { return [String(p), String(p * size), String(size + 1)]; }), hl: { 3: 'sel' } }]
        });
        return frames;
      }
    },
    examples: [
      {
        title: 'Offset on a small admin table: perfectly fine',
        html: `<p>A back-office screen listing 3,000 customers with "page 1 2 3 … 150" buttons and a column sorted by name. Offset is the right tool: the dataset is small, the user wants to jump, nobody inserts 50 customers per second. Use <code>?page=&amp;size=</code>, cap <code>size</code> at 100, return <code>totalElements</code> and <code>totalPages</code>. Don't over-engineer.</p>`
      },
      {
        title: 'Cursor for a social feed: the tie-breaker matters',
        html: `<p>Posts sorted by <code>created_at</code> (seconds). Ten posts share the same second. If the cursor stores only <code>created_at</code>, the next page uses <code>created_at &lt; X</code> and <b>skips the other posts with that same timestamp</b>; using <code>&lt;=</code> instead repeats them forever. Fix: sort by <code>(created_at DESC, id DESC)</code> and put <b>both</b> values in the cursor. Then <code>(created_at, id) &lt; (X, Y)</code> is a strict total order: no repeats, no gaps.</p>
          ${H.table(['id', 'created_at', 'cursor-only-time', 'cursor (time, id)'], [['9', '1002', 'next page asks &lt; 1002', 'asks &lt; (1002, 9)'], ['8', '1002', H.c('r', 'skipped!'), H.c('g', 'included')], ['7', '1002', H.c('r', 'skipped!'), H.c('g', 'included')]])}`
      },
      {
        title: 'Filtering and sorting parameters done well',
        html: `<p>Design the query string like a tiny language and publish it in OpenAPI. Common conventions: equality <code>?status=open</code>; multiple values <code>?status=open,pending</code>; ranges <code>?price_gte=10&amp;price_lte=50</code> or <code>?price[gte]=10</code>; dates in ISO-8601; text search <code>?q=dune</code>; sort <code>?sort=-rating,title</code>; sparse fields <code>?fields=id,title</code>; relations <code>?include=author</code>. Unknown parameters → <code>400</code> with a message (silently ignoring typos like <code>?stauts=open</code> returns the wrong data with a 200).</p>`,
        code: { lang: 'http', code: `GET /api/v1/books?genre=scifi,fantasy&published_gte=2020-01-01&price_lte=30&sort=-rating,title&fields=id,title,rating&limit=20 HTTP/1.1` }
      },
      {
        title: 'Total counts: expensive, so be deliberate',
        html: `<p><code>SELECT COUNT(*)</code> over a filtered million-row table can cost more than the page itself. Options: (1) omit totals and show "Load more"; (2) return <code>hasMore</code> via fetching <code>limit + 1</code>; (3) return an <b>estimate</b> (<code>"total":"~12k"</code>) from table statistics; (4) compute exact counts only on request (<code>?include=total</code>) or from a cached counter. Products like Google show "about 2 million results" for exactly this reason.</p>`
      }
    ],
    deepDive: `<p>🟣 <b>Why OFFSET is O(offset).</b> A B-tree index can find "the first row after key K" in O(log N), but it cannot find "the 100,000th row" without counting entries, so <code>OFFSET</code> iterates and discards. Keyset pagination turns the page boundary into a <i>key range scan</i>, which the B-tree does natively. The index must match the ORDER BY exactly (same columns and directions) or the planner falls back to sorting.</p>
      <p><b>Multi-column and mixed sorts.</b> <code>ORDER BY rating DESC, id ASC</code> needs a cursor holding (rating, id) and a predicate <code>rating &lt; :r OR (rating = :r AND id &gt; :i)</code> (row-value comparisons only work when all columns sort the same direction). NULLs complicate everything: decide <code>NULLS LAST</code> and encode it. Arbitrary user-chosen sorts multiply the indexes you need; restrict to a handful of supported sorts.</p>
      <p><b>Cursor design.</b> Include a version number, the sort spec (so a cursor from <code>sort=-rating</code> cannot be replayed on <code>sort=title</code>), the filter hash, and a signature (HMAC) so clients cannot forge keys or probe data they should not see. Base64url keeps it URL-safe. Reject invalid cursors with <code>400</code>; expire them if they encode snapshot state.</p>
      <p><b>Consistency models.</b> Plain keyset gives "no dupes, no skips for rows older than the bookmark" but new rows appear only when the client restarts from the head. A true snapshot (all pages as of time T) needs a snapshot id, a transaction-time column, or a stored result set (Elasticsearch's <code>search_after</code> + point-in-time, DynamoDB's <code>LastEvaluatedKey</code>). Say which guarantee you provide.</p>
      <p><b>Other conventions.</b> GraphQL's Relay connections use <code>edges</code>/<code>pageInfo</code> with <code>first/after</code>; GitHub and Stripe use <code>Link</code> headers or <code>starting_after</code>. Whatever you pick: cap page size server-side, make the default sensible (20–50), return the page size you applied, and document ordering. Paging with sharded stores means merging per-shard cursors, so keep the cursor opaque to be able to change that later.</p>`,
    aiEra: `<p>🤖 <b>What AI changes.</b> Agents and RAG pipelines walk APIs page by page, and they are impatient: they will ask for <code>limit=10000</code>, follow <code>next</code> links until memory runs out, or ignore pagination and answer from page 1. A clear <code>hasMore</code>/<code>nextCursor</code> contract, hard max sizes and <code>429</code> limits protect you and make agent loops predictable. Cursor pagination is also what lets embedding/sync jobs resume after a crash.</p>
      <p><b>Work with AI:</b> ask it to review your query plan for the keyset query (<code>EXPLAIN</code> output), to produce a test with ties in the sort column, and to fuzz the cursor decoder with garbage input.</p>
      <p><b>Where AI goes wrong:</b> it defaults to <code>page/size</code> with <code>OFFSET</code> everywhere, forgets the tie-breaker, builds <code>ORDER BY</code> by string concatenation (SQL injection), writes cursors that are just a raw id or a plain base64 of SQL, and returns <code>COUNT(*)</code> on every request.</p>
      <p><b>You must still own:</b> choosing the guarantee (stable vs snapshot), the index that backs it, the maximum page size, and treating cursors as untrusted input. Also: if you return a page of text for an LLM context, paginate by <i>tokens or bytes</i> too, not just row counts.</p>`,
    problems: [
      {
        title: 'Design Cursor Pagination with Timestamp Ties',
        level: 'Medium',
        tags: ['pagination', 'keyset', 'sql'],
        companies: ['Twitter', 'Meta', 'Atlassian'],
        statement: `<p>A <code>GET /v1/posts</code> endpoint returns posts newest first. Posts have <code>id</code> (unique) and <code>created_at</code> (second precision, many ties). Design: (a) the ORDER BY, (b) the query for page 2 given the last row seen, (c) the cursor contents, (d) how you know if there is a next page without COUNT(*), (e) the index.</p>`,
        constraints: `10<sup>8</sup> posts; page size ≤ 100; users scroll thousands of pages; new posts arrive continuously.`,
        example: `<p>Last row seen = (created_at <b>1002</b>, id <b>7</b>).</p><p>Page 2: <code>WHERE (created_at, id) &lt; (1002, 7) ORDER BY created_at DESC, id DESC LIMIT 21</code>. Return 20 rows, and if 21 came back ${H.c('g', 'hasMore = true')}.</p>`,
        brute: { why: `<p><code>LIMIT 20 OFFSET 20000</code> reads and discards 20,000 rows per request, grows linearly with depth, and drifts whenever a post is added or deleted. Using only <code>created_at &lt; X</code> skips tied rows.</p>` },
        mcq: { q: 'Why include id in both the ORDER BY and the cursor?', options: ['To make the cursor longer', 'To break ties so the order is total and no row is skipped or repeated', 'Because SQL requires two columns', 'To allow jumping to a page number'], answer: 1, explain: 'With many equal timestamps, the timestamp alone does not identify a position. (created_at, id) is unique, so it is a precise bookmark.' },
        hints: [
          `<p>A bookmark must identify exactly one position in the sorted order. Is created_at alone unique?</p>`,
          `<p>Sort by (created_at DESC, id DESC) and seek with a row-value comparison. Fetch limit + 1 rows to detect another page.</p>`,
          `<p>Index (created_at DESC, id DESC). Cursor = base64url(JSON with version, created_at, id) plus a signature. Invalid cursor → 400. Never expose raw ids unsigned if you care about guessing.</p>`
        ],
        solution: {
          approach: `<p>(a) <code>ORDER BY created_at DESC, id DESC</code>, a total order because id is unique. (b) Page 2: <code>SELECT ... FROM posts WHERE (created_at, id) &lt; (:ts, :id) ORDER BY created_at DESC, id DESC LIMIT 101</code> when the page size is 100; the extra row is only a probe. (c) The cursor is base64url of <code>{"v":1,"ts":1002,"id":7}</code> plus an HMAC so tampering is rejected with 400; clients treat it as opaque. (d) If 101 rows return, hasMore is true, drop the 101st, and build nextCursor from row 100; otherwise nextCursor is null. (e) A composite B-tree index on <code>(created_at DESC, id DESC)</code> makes each page a short range scan, so page 1 and page 100,000 cost about the same. New posts appear at the head and never shift the bookmark.</p>`,
          code: { lang: 'sql', code: `CREATE TABLE posts (id INTEGER PRIMARY KEY, created_at INTEGER NOT NULL);
CREATE INDEX idx_posts ON posts (created_at DESC, id DESC);
INSERT INTO posts VALUES (1,1000),(2,1000),(3,1001),(4,1001),(5,1002),(6,1002),(7,1002);
-- last row seen = (1002, 6): next page, size 2 (+1 probe row)
SELECT id, created_at FROM posts WHERE (created_at, id) < (1002, 6)
ORDER BY created_at DESC, id DESC LIMIT 3;` },
          complexity: `<p>Per page: O(log N + page size) with the index, versus O(offset + page size) for OFFSET. Space: O(1) cursor.</p>`,
          followUps: ['What if the client wants to sort by like_count?', 'How do you page backwards (previous page)?']
        }
      }
    ]
  });

  /* =====================================================================
     TOPIC 6 — Versioning and API evolution
     ===================================================================== */
  topics.push({
    title: 'API Versioning and Evolution (Breaking vs Non-Breaking)',
    analogy: `<p>A <b>power socket</b> in a wall. Millions of plugs (phones, old apps) depend on its shape. You may add a new USB port next to it (safe), but if you change the main socket shape overnight, every old plug stops working. Versioning is building a <b>second socket</b> so old plugs keep working while new ones use the new design, and announcing a date when the old socket will be removed.</p>`,
    explain: `<p>🟢 <b>Why versions exist.</b> You control your server, but you do <b>not</b> control every client: mobile apps stay installed for years, partners ship on their own schedule. Once an API is public, its shape is a <b>contract</b>. Breaking it breaks other people's products.</p>
      <p><b>What counts as breaking?</b> Anything a correct old client could trip over:</p>
      ${H.table(['Change', 'Breaking?'], [
        ['Add a new endpoint', H.c('g', 'No')],
        ['Add an optional request field or query parameter', H.c('g', 'No')],
        ['Add a new field to a response', H.c('g', 'No (clients must ignore unknown fields)')],
        ['Remove or rename a field / endpoint', H.c('r', 'Yes')],
        ['Make an optional request field required', H.c('r', 'Yes')],
        ['Change a type (number to string) or meaning of a field', H.c('r', 'Yes')],
        ['Tighten validation (max length 100 → 50)', H.c('r', 'Yes')],
        ['Add a new value to an enum the client switches on', H.c('y', 'Risky')],
        ['Change default sort order or page size', H.c('y', 'Risky')]
      ])}
      <p><b>Where to put the version?</b></p>
      ${H.table(['Style', 'Example', 'Good', 'Not so good'], [
        ['URI path', '<code>/v2/books</code>', 'obvious, easy to route, cache, test in a browser', 'URL changes; pollutes links'],
        ['Custom header', '<code>Api-Version: 2026-10-01</code>', 'clean URLs, date-based pins (Stripe)', 'hidden; cache must <code>Vary</code> on it'],
        ['Media type', '<code>Accept: application/vnd.example.v2+json</code>', 'purist REST, per-resource versions', 'harder to try and to document'],
        ['Query param', '<code>/books?version=2</code>', 'simple', 'easy to forget, awkward with caching']
      ])}
      <p>Most teams choose <b>URI major versions</b> (<code>/v1</code>, <code>/v2</code>) for big breaks and rely on <b>additive, backwards-compatible changes</b> inside a version. The best version bump is the one you never need.</p>
      <p><b>Retiring a version politely.</b> Announce, mark responses with <code>Deprecation</code> and <code>Sunset</code> headers, point to the successor with a <code>Link</code> header, watch usage metrics per client, contact the last stragglers, then switch off (finally answer <code>410 Gone</code>).</p>`,
    clues: [
      '"How do you version a public API?" → URI major version + additive changes + deprecation policy',
      '"Mobile apps cannot be force-updated" → must keep old versions alive for months or years',
      '"Rename a field without breaking clients" → add the new field, keep the old, deprecate, remove in next major',
      '"Clients should ignore unknown fields" → tolerant reader (Postel\'s law, carefully)',
      '"Date-based versioning" (Stripe) → clients pin a version, server applies transformations backwards',
      '"Sunset", "deprecation window", "usage by API key" → lifecycle management',
      '"Expand and contract" / "parallel change" → safe migration pattern for fields and endpoints'
    ],
    code: [
      `import java.util.*;

// One internal model, many external representations.
// Versions live at the EDGE (adapters); the domain model stays clean.
public class Versioning {
    record Book(String isbn, String title, List<String> authors) {}

    // v1 contract: a single "author" string.   v2 contract: an "authors" list.
    record BookV1(String isbn, String title, String author) {}
    record BookV2(String isbn, String title, List<String> authors) {}

    static BookV1 toV1(Book b) { return new BookV1(b.isbn(), b.title(), String.join(", ", b.authors())); }
    static BookV2 toV2(Book b) { return new BookV2(b.isbn(), b.title(), List.copyOf(b.authors())); }

    // Which version does this request want?  Path wins, then Accept media type, then header, else default.
    static int resolveVersion(String path, String accept, String apiVersionHeader, int defaultVersion) {
        if (path != null && path.startsWith("/v")) {                      // /v2/books
            int slash = path.indexOf('/', 1);
            String digits = path.substring(2, slash < 0 ? path.length() : slash);
            if (!digits.isEmpty() && digits.chars().allMatch(Character::isDigit)) return Integer.parseInt(digits);
        }
        if (accept != null) {                                             // application/vnd.example.v2+json
            int at = accept.indexOf("vnd.example.v");
            if (at >= 0) {
                int start = at + "vnd.example.v".length(), end = start;
                while (end < accept.length() && Character.isDigit(accept.charAt(end))) end++;
                if (end > start) return Integer.parseInt(accept.substring(start, end));
            }
        }
        if (apiVersionHeader != null && apiVersionHeader.chars().allMatch(Character::isDigit) && !apiVersionHeader.isEmpty())
            return Integer.parseInt(apiVersionHeader);
        return defaultVersion;
    }

    public static void main(String[] args) {
        Book b = new Book("9780135957059", "The Pragmatic Programmer", List.of("Hunt", "Thomas"));
        System.out.println(toV1(b));   // author = "Hunt, Thomas"   (old clients keep working)
        System.out.println(toV2(b));   // authors = [Hunt, Thomas]
        System.out.println(resolveVersion("/v2/books", null, null, 1));
        System.out.println(resolveVersion("/books", "application/vnd.example.v2+json", null, 1));
        System.out.println(resolveVersion("/books", "application/json", "3", 1));
        System.out.println(resolveVersion("/books", null, null, 1));
    }
}`,
      {
        lang: 'http', title: 'Deprecating an old version (headers)', code: `GET /v1/books/9780135957059 HTTP/1.1
Host: api.example.com

HTTP/1.1 200 OK
Deprecation: @1767225600
Sunset: Sun, 31 Jan 2027 23:59:59 GMT
Link: <https://api.example.com/docs/migrate-v1-to-v2>; rel="deprecation"; type="text/html",
      <https://api.example.com/v2/books/9780135957059>; rel="successor-version"
Content-Type: application/json

{"isbn": "9780135957059", "title": "The Pragmatic Programmer", "author": "Hunt, Thomas"}`
      },
      {
        lang: 'json', title: 'Expand-and-contract: ship both fields during the migration (must parse)',
        code: `{
  "isbn": "9780135957059",
  "title": "The Pragmatic Programmer",
  "author": "Hunt, Thomas",
  "authors": ["Hunt", "Thomas"]
}`
      },
      {
        lang: 'java', check: false, title: 'Spring Boot: URI versions side by side',
        code: `@RestController
@RequestMapping("/v1/books")
class BooksV1 {
    @GetMapping("/{isbn}")
    BookV1 get(@PathVariable String isbn) { return Adapters.toV1(service.find(isbn)); }
}

@RestController
@RequestMapping("/v2/books")
class BooksV2 {
    @GetMapping(value = "/{isbn}", produces = "application/json")
    BookV2 get(@PathVariable String isbn) { return Adapters.toV2(service.find(isbn)); }
}

// Spring Framework 7 / Boot 4 also ship first-class API versioning:
//   @GetMapping(path = "/books/{isbn}", version = "2")  plus  spring.mvc.apiversion.use.header=Api-Version`
      }
    ],
    codeTitle: ['Adapters and version resolution (plain Java)', 'Deprecation headers', 'Expand-and-contract payload', 'Spring Boot controllers'],
    viz: [
      {
        title: 'Is this change breaking?',
        gen: function () {
          var changes = [
            ['Add GET /books/{id}/reviews', 'new endpoint', 'No', 'ok', 'Old clients never call it.'],
            ['Add optional ?language= filter', 'new optional parameter', 'No', 'ok', 'Old clients simply do not send it.'],
            ['Add "subtitle" to book response', 'new response field', 'No', 'ok', 'Tolerant clients ignore unknown fields.'],
            ['Remove "author" from response', 'field removed', 'YES', 'bad', 'Old client reads book.author and gets undefined / crashes.'],
            ['Rename "title" to "name"', 'rename = remove + add', 'YES', 'bad', 'Same as removing the old field.'],
            ['Make "isbn" required on POST /books', 'optional became required', 'YES', 'bad', 'Old clients that omit it now get 422.'],
            ['"price" changes number to string', 'type change', 'YES', 'bad', 'JSON parsers in typed clients throw.'],
            ['Add enum value "ARCHIVED" to status', 'new enum value in a response', 'RISKY', 'cur', 'Clients with an exhaustive switch hit the default branch; document that enums may grow.'],
            ['Default sort changes to newest first', 'changed default behaviour', 'RISKY', 'cur', 'Clients that relied on the old order get different data.'],
            ['Max title length 200 → 100', 'tightened validation', 'YES', 'bad', 'Requests valid yesterday are rejected today.']
          ];
          var frames = [], rows = [], hl = {};
          frames.push({ narr: 'Rule of thumb: <b>a change is breaking if a correct old client can fail</b> without being edited. We will classify ten changes one by one.', parts: [{ type: 'table', label: 'Change log', columns: ['Change', 'Kind', 'Breaking?'], rows: [], hl: {} }] });
          changes.forEach(function (c, i) {
            rows.push([c[0], c[1], c[2]]);
            hl[i] = c[3];
            frames.push({ narr: '<b>' + c[0] + '</b>: ' + (c[3] === 'ok' ? '<span class="c-g">safe</span>. ' : c[3] === 'bad' ? '<span class="c-r">breaking</span>. ' : '<span class="c-y">risky</span>. ') + c[4], parts: [{ type: 'table', label: 'Change log', columns: ['Change', 'Kind', 'Breaking?'], rows: rows.map(function (r) { return r.slice(); }), hl: JSON.parse(JSON.stringify(hl)) }] });
          });
          frames.push({ narr: 'Safe changes ship any day. Breaking changes need a <b>new major version</b> or an expand-and-contract migration: add the new thing, keep the old, deprecate, then remove.', parts: [{ type: 'vars', vals: { safe: 3, risky: 2, breaking: 5 }, hl: { safe: 'ok', breaking: 'bad', risky: 'cur' } }] });
          return frames;
        }
      },
      {
        title: 'Two versions, one core: where adapters live',
        gen: function () {
          var nodes = [
            { id: 'A1', label: 'Old app (v1)', x: 10, y: 8, shape: 'box', w: 16 }, { id: 'A2', label: 'New app (v2)', x: 10, y: 40, shape: 'box', w: 16 },
            { id: 'GW', label: 'API Gateway', x: 38, y: 24, shape: 'box', w: 16 },
            { id: 'V1', label: 'v1 adapter', x: 66, y: 8, shape: 'box', w: 14 }, { id: 'V2', label: 'v2 adapter', x: 66, y: 40, shape: 'box', w: 14 },
            { id: 'CORE', label: 'Core domain', x: 90, y: 24, shape: 'box', w: 14 }
          ];
          var edges = [['A1', 'GW', '/v1/books'], ['A2', 'GW', '/v2/books'], ['GW', 'V1'], ['GW', 'V2'], ['V1', 'CORE'], ['V2', 'CORE']];
          function g(ehl, hl, tags) { return { type: 'graph', directed: true, height: 50, nodes: nodes, edges: edges, hl: hl || {}, ehl: ehl || {}, tags: tags || {} }; }
          return [
            { narr: 'Two generations of clients are alive at the same time. The core domain model has <b>one</b> shape that evolves freely.', parts: [g({}, { A1: 'cur', A2: 'cur' })] },
            { narr: 'The old app calls <code>/v1/books</code>. The gateway routes by path (or header) to the v1 adapter.', parts: [g({ 'A1-GW': 'cur', 'GW-V1': 'cur' }, { V1: 'cur' }, { V1: 'author: string' })] },
            { narr: 'The v1 adapter translates core objects into the <b>frozen v1 shape</b> (<code>author</code> as one string) and v1 requests back into core commands.', parts: [g({ 'A1-GW': 'ok', 'GW-V1': 'ok', 'V1-CORE': 'cur' }, { CORE: 'cur' }, { V1: 'author: string' })] },
            { narr: 'The new app calls <code>/v2/books</code> and gets <code>authors</code> as a list. Same core, different representation.', parts: [g({ 'A2-GW': 'cur', 'GW-V2': 'cur' }, { V2: 'cur' }, { V2: 'authors: []' })] },
            { narr: 'Retiring v1 later means deleting <b>one adapter</b> and its routes, not rewriting the system. That is why versions belong at the edge, not scattered through business code.', parts: [g({ 'A2-GW': 'ok', 'GW-V2': 'ok', 'V2-CORE': 'ok' }, { V1: 'done', A1: 'done' }, { V1: 'sunset', V2: 'current' })] }
          ];
        }
      }
    ],
    examples: [
      {
        title: 'Renaming a field without breaking anyone (expand and contract)',
        html: `<p>You want <code>author</code> (string) to become <code>authors</code> (list). Do it in <b>three releases</b>: (1) <b>Expand</b>: return both fields, accept either on writes; (2) <b>Migrate</b>: tell clients, flag <code>author</code> as deprecated in OpenAPI, watch which API keys still read it; (3) <b>Contract</b>: after the sunset date remove <code>author</code> in the next major version. No big-bang day, no surprise outage.</p>`
      },
      {
        title: 'Date-based versions (the Stripe model)',
        html: `<p>Each account is pinned to the API version of its <i>first</i> request, e.g. <code>2026-03-15</code>. Clients can opt in to a newer date with a header. Internally the server keeps one current implementation and a chain of small <b>"downgrade" transformers</b> that reshape the newest response into older shapes. Each breaking change is a tiny transformer, dated; old clients never break and the codebase does not fork. Great for payments; heavy for small teams.</p>`,
        code: { lang: 'http', code: `GET /v1/charges/ch_123 HTTP/1.1\nAuthorization: Bearer <secret-key>\nApi-Version: 2026-03-15\n\nHTTP/1.1 200 OK\nApi-Version: 2026-03-15` }
      },
      {
        title: 'The tolerant reader: being on the receiving side',
        html: `<p>Versioning only works if clients cooperate: <b>ignore unknown JSON fields</b>, do not crash on unknown enum values (map them to an "UNKNOWN" case), and never depend on field order. In Jackson that is <code>FAIL_ON_UNKNOWN_PROPERTIES = false</code>; in Kotlin/TypeScript use lenient decoders. Publish this rule in your API guide ("we may add fields and enum values at any time") so adding things stays non-breaking.</p>`
      }
    ],
    deepDive: `<p>🟣 <b>Semantic versioning for APIs.</b> Major = breaking, minor = additive, patch = fixes. Public HTTP APIs usually expose only the <b>major</b> (<code>/v1</code>) in the URL and publish minor/patch in the spec's <code>info.version</code> and a changelog. A major bump costs everyone a migration, so batch breaking changes and give 6–18 months of overlap.</p>
      <p><b>Caching and versioning.</b> If the version travels in a header, responses depend on it: add <code>Vary: Api-Version</code> (or <code>Vary: Accept</code> for media types) or a shared cache will serve v2 JSON to a v1 client. URI versions avoid this class of bug, which is one reason they dominate.</p>
      <p><b>Contract tests catch accidents.</b> Most breaking changes are accidental (a Java field renamed, a serializer default changed). Diff the OpenAPI spec between main and the PR with a tool like <code>oasdiff</code> in CI; fail the build on breaking changes unless labelled. Consumer-driven contract tests (Pact) tell you which consumer a change would hurt.</p>
      <p><b>Event and database contracts too.</b> The same rules apply to webhook payloads, message schemas (use a schema registry with compatibility modes: backward, forward, full) and database columns. Remove a column only after every reader stopped using it: deploy readers that tolerate both, migrate data, then drop.</p>
      <p><b>Feature flags vs versions.</b> Use a version for a permanent contract break; use flags for gradual rollout of behaviour that is still compatible. Don't use per-customer version forks of the server: that is how you end up maintaining N code bases.</p>
      <p><b>Deprecation headers.</b> <code>Deprecation</code> (RFC 9745) marks when a resource became deprecated; <code>Sunset</code> (RFC 8594) says when it will stop working; <code>Link: rel="successor-version"</code> points to the replacement. Log which clients still call deprecated routes and email them; after the date answer <code>410 Gone</code> with a problem document that links to the migration guide.</p>`,
    aiEra: `<p>🤖 <b>What AI changes.</b> Code generators write clients from your OpenAPI file and agents hard-code your tool schemas into prompts. An unannounced rename now breaks not only apps but also <b>agent workflows that were never re-tested</b>. Treat tool/function schemas as public contracts with versions and a deprecation window. Models also pin to whatever the docs said when they were trained, so keep old versions responding sensibly.</p>
      <p><b>Work with AI:</b> feed two OpenAPI versions to the assistant and ask for a list of breaking vs non-breaking differences, then compare with a real diff tool. Ask it to draft the migration guide and the deprecation email, then edit for accuracy.</p>
      <p><b>Where AI goes wrong:</b> it happily renames fields "for consistency", makes optional fields required in a refactor, adds <code>v2</code> routes by copy-paste (duplicated logic), and forgets <code>Vary</code> and the sunset headers.</p>
      <p><b>You must still own:</b> the compatibility policy (what counts as breaking, how long you support a version) and the decision to break at all. These are product and trust decisions, not code generation tasks.</p>`,
    problems: [
      {
        title: 'Breaking or Not? Plan the Migration',
        level: 'Medium',
        tags: ['versioning', 'api evolution'],
        companies: ['Stripe', 'Twilio'],
        statement: `<p>Your public API returns <code>GET /v1/orders/{id}</code> with <code>"total": 1999</code> (cents, integer). Product wants <code>total</code> as an object <code>{"amount": 1999, "currency": "USD"}</code> for multi-currency. 40% of traffic comes from mobile apps you cannot force to update. (a) Is this breaking? (b) Describe a migration plan with no outage. (c) What headers and metrics do you use?</p>`,
        constraints: `No downtime; old apps must keep working at least 12 months; one core codebase.`,
        example: `<p>Plan: ${H.c('g', 'expand')} (add <code>totalMoney</code> next to <code>total</code>) → ${H.c('y', 'migrate')} (deprecate <code>total</code>, track usage) → ${H.c('r', 'contract')} (remove in /v2).</p>`,
        brute: { why: `<p>Just changing <code>total</code> to an object on <code>/v1</code> instantly breaks every installed app that reads it as a number, and rolling it back later breaks the apps that already migrated. A full copy of the service for v2 doubles maintenance.</p>` },
        mcq: { q: 'Which approach avoids breaking old clients while allowing the new money object?', options: ['Change the type of total in place', 'Add a new field alongside total, deprecate total, remove it in the next major version', 'Return 400 to old clients', 'Ask users to update'], answer: 1, explain: 'Additive change first (expand), then deprecation and finally removal in a new major version (contract).' },
        hints: [
          `<p>Changing a field's type is breaking. Can you introduce the new shape under a <i>different name</i>?</p>`,
          `<p>Expand and contract: ship both fields, mark the old one deprecated in the spec, measure who still reads it.</p>`,
          `<p>Add <code>totalMoney</code>; keep <code>total</code> (in the account's default currency in cents) in v1. New /v2 exposes only the object. Add Deprecation/Sunset headers on v1, count calls per app version, remove after the window.</p>`
        ],
        solution: {
          approach: `<p>(a) Yes, replacing a number with an object is a breaking type change. (b) Use expand and contract. Release 1: add <code>totalMoney: {amount, currency}</code> to the v1 response while keeping <code>total</code> unchanged; new clients read the new field, old clients ignore it (tolerant reader). Release 2: mark <code>total</code> deprecated in OpenAPI, add <code>Deprecation</code> and <code>Sunset</code> headers, and log usage per client/app version. Ship v2 where only <code>total</code> as an object exists, implemented as a thin adapter over the same core service. Release 3: after the 12-month window and when usage is near zero, retire v1, replying 410 with a link to the migration guide. (c) Headers: Deprecation, Sunset, Link rel=successor-version. Metrics: requests per API version and per app version, share of traffic on deprecated fields, error rates after each step.</p>`,
          complexity: `<p>Cost: one extra field and one adapter during the overlap; no data duplication in storage if the amount is derived from the same column.</p>`,
          followUps: ['How would you handle the field for currencies with no minor unit?', 'What if one partner ignores the sunset date?']
        }
      }
    ]
  });

  /* =====================================================================
     TOPIC 7 — HATEOAS and OpenAPI
     ===================================================================== */
  topics.push({
    title: 'HATEOAS (Hypermedia) and OpenAPI (The Contract)',
    analogy: `<p><b>HATEOAS</b> is like a <b>website with buttons</b>: you never memorise URLs, you read the page and click what is offered. If your order is already shipped, the "Cancel" button is simply not there. <b>OpenAPI</b> is the <b>restaurant menu printed in advance</b>: every dish, ingredient and price written down, so waiters, chefs and customers all agree before anyone orders. One tells clients "here is what you can do <i>right now</i>", the other "here is everything this API <i>can ever</i> do".</p>`,
    explain: `<p>🟢 <b>HATEOAS</b> (Hypermedia As The Engine Of Application State) means a response carries <b>links</b> to related resources and to the actions that are <i>currently allowed</i>. A client follows links instead of building URLs from a manual.</p>
      <pre>{
  "id": 9, "status": "PAID", "total": 4999,
  "_links": {
    "self":   { "href": "/orders/9" },
    "items":  { "href": "/orders/9/items" },
    "ship":   { "href": "/orders/9/shipments", "method": "POST" },
    "refund": { "href": "/orders/9/refunds",   "method": "POST" }
  }
}</pre>
      <p>When the order is <code>PENDING</code> the same response has <code>pay</code> and <code>cancel</code> but not <code>ship</code>. The <b>server owns the workflow rules</b>; clients just check "is the link there?". Common formats: <b>HAL</b> (<code>_links</code>), <b>JSON:API</b> (<code>links</code>), <b>Siren</b> (links + actions), and plain <code>Link</code> headers (what pagination and GitHub use).</p>
      <p><b>Honest take:</b> full hypermedia is rare. Most real APIs use a light version: <code>self</code>, <code>next</code>/<code>prev</code> pagination links, <code>Location</code> on creation, and links to related collections. That already removes URL-building bugs.</p>
      <p><b>OpenAPI</b> (formerly Swagger) is a machine-readable description of your HTTP API in YAML or JSON: paths, methods, parameters, request/response schemas, error shapes, auth. From one file you get <b>interactive docs</b>, <b>client SDKs</b>, <b>server stubs</b>, <b>mock servers</b>, <b>contract tests</b> and <b>breaking-change checks</b>.</p>
      <p>Two workflows: <b>contract-first</b> (write the spec, review it with consumers, generate code) and <b>code-first</b> (annotate controllers, generate the spec, e.g. springdoc-openapi). Contract-first is better for public APIs and parallel teams; code-first is faster for internal services. Either way: <b>the spec is checked in, reviewed in PRs and tested in CI</b>.</p>`,
    clues: [
      '"Discoverability", "clients should not hardcode URLs", "Richardson level 3" → HATEOAS',
      '"Which actions are allowed in the current state?" → links only for allowed transitions',
      '"Document the API" / "generate SDKs" / "contract testing" → OpenAPI',
      '"Spec-first vs code-first" → trade-off between review before coding vs speed',
      '"Pagination links" → <code>Link: &lt;...&gt;; rel="next"</code> is lightweight hypermedia',
      '"Prevent breaking changes in CI" → diff the OpenAPI spec between branches',
      '"Expose your API to LLM tools/agents" → OpenAPI operation descriptions become tool descriptions'
    ],
    code: [
      {
        lang: 'yaml', title: 'OpenAPI 3.1 fragment: list books (cursor) and borrow a book (idempotent POST)',
        code: `openapi: 3.1.0
info:
  title: Library API
  version: 1.4.0
servers:
  - url: https://api.example.com/v1
security:
  - bearerAuth: []
paths:
  /books:
    get:
      operationId: listBooks
      summary: List books, newest first (cursor pagination)
      parameters:
        - name: genre
          in: query
          description: Filter by genre. Comma separated for several.
          schema: { type: string, example: "scifi,fantasy" }
        - name: sort
          in: query
          schema: { type: string, default: "-published", pattern: "^-?(published|rating|title)(,-?(published|rating|title))*$" }
        - $ref: '#/components/parameters/Limit'
        - $ref: '#/components/parameters/Cursor'
      responses:
        '200':
          description: One page of books
          headers:
            ETag: { schema: { type: string }, description: Validator for conditional GET }
            Cache-Control: { schema: { type: string, example: "public, max-age=60" } }
          content:
            application/json:
              schema: { $ref: '#/components/schemas/BookPage' }
        '304': { description: Not modified (If-None-Match matched) }
        '400': { $ref: '#/components/responses/Problem' }
  /members/{memberId}/loans:
    post:
      operationId: borrowBook
      summary: Borrow a book (creates a Loan)
      parameters:
        - name: memberId
          in: path
          required: true
          schema: { type: integer, format: int64 }
        - name: Idempotency-Key
          in: header
          required: true
          description: Client-generated UUID, one per user intention. Retries with the same key return the first result.
          schema: { type: string, format: uuid }
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [isbn]
              properties:
                isbn: { type: string, pattern: "^[0-9]{13}$" }
      responses:
        '201':
          description: Loan created
          headers:
            Location: { schema: { type: string }, description: URL of the new loan }
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Loan' }
        '404': { $ref: '#/components/responses/Problem' }
        '409': { $ref: '#/components/responses/Problem' }
        '422': { $ref: '#/components/responses/Problem' }
components:
  securitySchemes:
    bearerAuth: { type: http, scheme: bearer, bearerFormat: JWT }
  parameters:
    Limit:
      name: limit
      in: query
      schema: { type: integer, minimum: 1, maximum: 100, default: 20 }
    Cursor:
      name: cursor
      in: query
      description: Opaque cursor from a previous response (page.nextCursor)
      schema: { type: string }
  responses:
    Problem:
      description: Error (RFC 9457 problem details)
      content:
        application/problem+json:
          schema: { $ref: '#/components/schemas/Problem' }
  schemas:
    Book:
      type: object
      required: [isbn, title]
      properties:
        isbn: { type: string }
        title: { type: string, maxLength: 200 }
        authors: { type: array, items: { type: string } }
    BookPage:
      type: object
      required: [data, page]
      properties:
        data: { type: array, items: { $ref: '#/components/schemas/Book' } }
        page:
          type: object
          properties:
            hasMore: { type: boolean }
            nextCursor: { type: [string, "null"] }
    Loan:
      type: object
      properties:
        id: { type: integer, format: int64 }
        isbn: { type: string }
        dueDate: { type: string, format: date }
    Problem:
      type: object
      required: [title, status]
      properties:
        type: { type: string, format: uri }
        title: { type: string }
        status: { type: integer }
        detail: { type: string }`
      },
      {
        lang: 'json', title: 'HAL representation of a PAID order (must parse)',
        code: `{
  "id": 9,
  "status": "PAID",
  "total": 4999,
  "_links": {
    "self":   { "href": "/api/v1/orders/9" },
    "items":  { "href": "/api/v1/orders/9/items" },
    "ship":   { "href": "/api/v1/orders/9/shipments", "title": "Create a shipment" },
    "refund": { "href": "/api/v1/orders/9/refunds",   "title": "Refund this order" }
  }
}`
      },
      `import java.util.*;

// Server-side rule: which links does an order expose in each state?
// The state machine lives on the SERVER, so clients never re-implement it.
public class OrderLinks {
    enum Status { PENDING, PAID, SHIPPED, DELIVERED, CANCELLED }

    static Map<String, String> links(long id, Status s) {
        String base = "/api/v1/orders/" + id;
        Map<String, String> l = new LinkedHashMap<>();
        l.put("self", base);                                   // always present
        switch (s) {
            case PENDING   -> { l.put("pay", base + "/payments"); l.put("cancel", base + "/cancellation"); }
            case PAID      -> { l.put("ship", base + "/shipments"); l.put("refund", base + "/refunds"); }
            case SHIPPED   -> l.put("track", base + "/tracking");
            case DELIVERED -> l.put("return", base + "/returns");
            case CANCELLED -> { }                                // terminal: no actions
        }
        return l;
    }

    public static void main(String[] args) {
        for (Status s : Status.values()) System.out.println(s + " -> " + links(9, s).keySet());
    }
}`,
      {
        lang: 'java', check: false, title: 'Spring HATEOAS: build links from controller methods',
        code: `@GetMapping("/orders/{id}")
EntityModel<OrderDto> get(@PathVariable long id) {
    OrderDto order = orders.find(id);
    EntityModel<OrderDto> model = EntityModel.of(order,
        linkTo(methodOn(OrderController.class).get(id)).withSelfRel(),     // refactor-safe: no string URLs
        linkTo(methodOn(OrderController.class).items(id)).withRel("items"));
    if (order.status() == Status.PAID) {
        model.add(linkTo(methodOn(ShipmentController.class).create(id, null)).withRel("ship"));
    }
    return model;
}`
      },
      {
        lang: 'yaml', check: false, title: 'CI: lint the spec and block breaking changes (GitHub Actions sketch)',
        code: `name: api-contract
on: [pull_request]
jobs:
  openapi:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }
      - name: Lint the spec (style + security rules)
        run: npx @stoplight/spectral-cli lint openapi.yaml
      - name: Fail on breaking changes vs main
        run: |
          git show origin/main:openapi.yaml > /tmp/base.yaml
          docker run --rm -v "$PWD:/w" -v /tmp:/t tufin/oasdiff breaking /t/base.yaml /w/openapi.yaml --fail-on ERR`
      }
    ],
    codeTitle: ['OpenAPI 3.1 fragment', 'HAL response', 'State-dependent links (plain Java)', 'Spring HATEOAS', 'CI for the contract'],
    viz: [
      {
        title: 'Links change with the order state (HATEOAS)',
        gen: function () {
          var nodes = [
            { id: 'PENDING', label: 'PENDING', x: 10, y: 14, shape: 'box', w: 14 }, { id: 'PAID', label: 'PAID', x: 38, y: 14, shape: 'box', w: 12 },
            { id: 'SHIPPED', label: 'SHIPPED', x: 64, y: 14, shape: 'box', w: 14 }, { id: 'DELIVERED', label: 'DELIVERED', x: 90, y: 14, shape: 'box', w: 15 },
            { id: 'CANCELLED', label: 'CANCELLED', x: 38, y: 46, shape: 'box', w: 15 }
          ];
          var edges = [['PENDING', 'PAID', 'pay'], ['PAID', 'SHIPPED', 'ship'], ['SHIPPED', 'DELIVERED', 'track'], ['PENDING', 'CANCELLED', 'cancel'], ['PAID', 'CANCELLED', 'refund']];
          var states = [
            ['PENDING', ['self', 'pay', 'cancel'], 'A new order. The client may pay or cancel, so only those two action links appear.', { 'PENDING-PAID': 'cur', 'PENDING-CANCELLED': 'cur' }],
            ['PAID', ['self', 'ship', 'refund'], 'Payment succeeded. <code>pay</code> and <code>cancel</code> vanish, <code>ship</code> and <code>refund</code> appear. The client did not need to know the rule.', { 'PAID-SHIPPED': 'cur', 'PAID-CANCELLED': 'cur' }],
            ['SHIPPED', ['self', 'track'], 'Shipped: no refund link any more (the business rule says return instead after delivery).', { 'SHIPPED-DELIVERED': 'cur' }],
            ['DELIVERED', ['self', 'return'], 'Delivered: only <code>return</code> is offered.', {}],
            ['CANCELLED', ['self'], 'Terminal state: just <code>self</code>. A UI built on links shows no buttons at all, without any if-statements about statuses.', {}]
          ];
          var frames = [], seenH = {};
          states.forEach(function (s) {
            var hl = {}; Object.keys(seenH).forEach(function (k) { hl[k] = 'done'; });
            hl[s[0]] = 'cur';
            var json = '{ "status": "' + s[0] + '", "_links": { ' + s[1].map(function (l) { return '"' + l + '": {...}'; }).join(', ') + ' } }';
            frames.push({
              narr: 'Order is <b>' + s[0] + '</b>. ' + s[2],
              parts: [{ type: 'graph', label: 'Order lifecycle', directed: true, height: 60, nodes: nodes, edges: edges, hl: hl, ehl: s[3] }, { type: 'text', html: '<code>' + json.split('<').join('&lt;') + '</code>' }]
            });
            seenH[s[0]] = 1;
          });
          frames.push({ narr: 'Takeaway: the <b>server</b> decides what is possible; the <b>client</b> renders buttons for the links it receives. Add a new state or rule and old clients keep working.', parts: [{ type: 'table', label: 'State to action links', columns: ['State', 'Links offered'], rows: states.map(function (s) { return [s[0], s[1].join(', ')]; }), hl: { 1: 'sel' } }] });
          return frames;
        }
      },
      {
        title: 'One OpenAPI file, many outputs',
        gen: function () {
          var nodes = [
            { id: 'SPEC', label: 'openapi.yaml', x: 50, y: 28, shape: 'box', w: 16 },
            { id: 'DOCS', label: 'Docs UI', x: 12, y: 6, shape: 'box', w: 14 }, { id: 'SDK', label: 'Client SDKs', x: 50, y: 6, shape: 'box', w: 14 },
            { id: 'STUB', label: 'Server stubs', x: 88, y: 6, shape: 'box', w: 14 }, { id: 'MOCK', label: 'Mock server', x: 12, y: 50, shape: 'box', w: 14 },
            { id: 'TEST', label: 'Contract tests', x: 50, y: 50, shape: 'box', w: 15 }, { id: 'DIFF', label: 'Breaking-change CI', x: 88, y: 50, shape: 'box', w: 17 }
          ];
          var edges = [['SPEC', 'DOCS'], ['SPEC', 'SDK'], ['SPEC', 'STUB'], ['SPEC', 'MOCK'], ['SPEC', 'TEST'], ['SPEC', 'DIFF']];
          var steps = [
            ['SPEC', null, 'The spec is the <b>single source of truth</b>, reviewed in pull requests like code.'],
            ['DOCS', 'SPEC-DOCS', 'Swagger UI / Redoc render <b>interactive documentation</b>: try requests from the browser.'],
            ['SDK', 'SPEC-SDK', 'Generators produce typed <b>client SDKs</b> (TypeScript, Java, Python): no hand-written URL strings.'],
            ['STUB', 'SPEC-STUB', 'Server <b>interfaces/stubs</b> are generated, so the implementation must match the contract.'],
            ['MOCK', 'SPEC-MOCK', 'A <b>mock server</b> lets front-end or partner teams build before the backend exists.'],
            ['TEST', 'SPEC-TEST', '<b>Contract tests</b> (Schemathesis, Dredd) fire generated requests at the real server and verify responses match the schema.'],
            ['DIFF', 'SPEC-DIFF', 'CI <b>diffs the spec</b> against main and fails on breaking changes. This is your versioning safety net.']
          ];
          return steps.map(function (s) {
            var hl = {}; hl[s[0]] = 'cur';
            var ehl = {}; if (s[1]) ehl[s[1]] = 'cur';
            return { narr: s[2], parts: [{ type: 'graph', label: 'OpenAPI as a hub', directed: true, height: 60, nodes: nodes, edges: edges, hl: hl, ehl: ehl }] };
          });
        }
      }
    ],
    examples: [
      {
        title: 'Lightweight hypermedia you should always do',
        html: `<p>Even if you never go full HATEOAS, do these four: (1) <code>Location</code> on <code>201</code>; (2) <code>self</code> link or full <code>href</code> for every embedded resource so clients don't assemble URLs; (3) <code>next</code>/<code>prev</code> links (or <code>Link</code> header) for pagination; (4) a link to the related collection, e.g. <code>/members/5/loans</code>. These cost almost nothing and let you move URLs later.</p>`,
        code: { lang: 'http', code: `HTTP/1.1 200 OK\nLink: </books?cursor=abc>; rel="next", </books?cursor=xyz>; rel="prev", </books>; rel="first"` }
      },
      {
        title: 'Why bother with OpenAPI? A broken deploy it prevents',
        html: `<p>A backend dev renames <code>dueDate</code> to <code>due_date</code> in a Java record. The code compiles, unit tests still pass, the mobile app crashes in production. With a spec in the PR, the CI step <code>oasdiff breaking</code> reports "response property <code>dueDate</code> removed" and the build fails <i>before merge</i>. The spec turns an invisible runtime break into a visible review comment.</p>`
      },
      {
        title: 'Write good operation descriptions (for humans and for agents)',
        html: `<p>Each operation needs a unique <code>operationId</code> (<code>borrowBook</code>), a one-line <code>summary</code>, and a <code>description</code> that says <b>when to use it and what the side effects are</b>. Add examples to schemas. Document every error status your handler can return. LLM tool-calling layers (MCP servers, function-calling adapters) read exactly these fields to decide which endpoint to call, so vague text makes agents choose wrongly.</p>
          ${H.table(['Weak', 'Strong'], [['summary: "books"', 'summary: "List books, newest first (cursor paginated)"'], ['no responses beyond 200', '200, 304, 400, 404, 409, 422 with Problem schema'], ['type: string for dates', 'type: string, format: date-time, example: 2026-10-15T10:00:00Z']])}`
      }
    ],
    deepDive: `<p>🟣 <b>Richardson maturity model.</b> Level 0: one endpoint, RPC over HTTP. Level 1: resources. Level 2: HTTP verbs and status codes. Level 3: hypermedia controls. Fielding's REST requires level 3, but the industry settled at level 2 plus OpenAPI. Know the terminology: interviewers ask "is your API truly RESTful?" and the mature answer is "level 2 with some links, and here is why".</p>
      <p><b>Why full HATEOAS rarely wins.</b> Clients are generated from OpenAPI against fixed URLs; UIs hard-code flows; hypermedia needs generic clients that don't exist for most domains; extra link bytes on every response. It shines for long-lived, state-machine workflows (payments, order fulfilment, approvals) and for APIs that must evolve URLs freely. GitHub, PayPal and Spring Data REST use links heavily; Stripe does not.</p>
      <p><b>Link relations and registries.</b> Use registered relation types (<code>self</code>, <code>next</code>, <code>prev</code>, <code>collection</code>, <code>item</code>, <code>edit</code>) and URIs for custom ones (<code>https://api.example.com/rels/refund</code>) so rel names are globally unambiguous. HAL adds <code>_embedded</code> to inline related resources and avoid extra round trips.</p>
      <p><b>OpenAPI 3.1 specifics.</b> 3.1 aligns schemas with JSON Schema 2020-12: <code>type: [string, "null"]</code> replaces <code>nullable: true</code>, <code>examples</code> arrays, <code>$ref</code> with siblings. Use <code>components</code> for reuse (parameters, responses, schemas); <code>oneOf</code> + <code>discriminator</code> for polymorphism; <code>webhooks</code> / <code>callbacks</code> to describe events you send. Keep one spec per API surface, split into files with <code>$ref</code> if large, and bundle in CI.</p>
      <p><b>Security in the spec.</b> Declare <code>securitySchemes</code> (bearer, OAuth2 flows with scopes, API key) and apply them at the top and per-operation. Add <code>maxLength</code>, <code>pattern</code>, <code>maximum</code> to schemas; gateways and validators can reject bad input before it reaches code. Do not put real secrets or internal hostnames in examples.</p>
      <p><b>Drift.</b> Specs rot if only people maintain them. Choose one direction (spec → code via generation or code → spec via annotations) and add a CI check that the running app's generated spec equals the committed one. Contract tests against a real instance close the loop.</p>`,
    aiEra: `<p>🤖 <b>What AI changes.</b> OpenAPI has become the bridge between your API and AI: tools turn an OpenAPI file directly into <b>function-calling schemas or MCP tools</b>, so each <code>summary</code>/<code>description</code> is literally prompt text for an agent. Hypermedia also gets a second life: links in responses are a natural way to tell an agent what it may do next without stuffing the whole manual into a prompt.</p>
      <p><b>Work with AI:</b> generate a first-draft spec from your controllers and then review it line by line; ask the assistant to find endpoints missing error responses, missing examples, or inconsistent naming; have it write consumer-style tests from the spec.</p>
      <p><b>Where AI goes wrong:</b> it produces specs that look plausible but do not match the code (invented fields, wrong status codes, missing auth), over-uses <code>additionalProperties: true</code>, and makes every field required or optional on a whim. It may also leak internal URLs or real keys copied from your repo into examples.</p>
      <p><b>You must still own:</b> that the spec is <i>true</i> (verified by contract tests), the scope of what is exposed to agents (least privilege: not every endpoint should become a tool), and the human-readable descriptions that define behaviour and side effects.</p>`,
    problems: [
      {
        title: 'Which Links Should an Order Expose?',
        level: 'Medium',
        tags: ['hateoas', 'state machine'],
        companies: ['PayPal', 'Amazon'],
        statement: `<p>An order moves PENDING → PAID → SHIPPED → DELIVERED, and can be CANCELLED from PENDING or refunded from PAID. Design the <code>_links</code> object the server returns in each state. Explain what the client UI does with it and what you gain over letting the client check <code>status</code> itself.</p>`,
        constraints: `Always include self. Link names are actions (pay, cancel, ship, refund, track, return). Terminal states expose no actions.`,
        example: `<p>PAID → ${H.c('g', 'self, ship, refund')}. PENDING → ${H.c('g', 'self, pay, cancel')}. CANCELLED → ${H.c('m', 'self only')}.</p>`,
        brute: { why: `<p>If the client hard-codes "show Cancel button when status is PENDING", the business rule is duplicated in web, iOS, Android and the backend. Every rule change (e.g. allow cancel while PAID within 1 hour) needs four releases, and the apps drift apart.</p>` },
        mcq: { q: 'What is the main benefit of state-dependent links?', options: ['Smaller JSON', 'The server owns workflow rules, clients just render the available actions', 'Faster database queries', 'Removes the need for authentication'], answer: 1, explain: 'Links encode which transitions are currently allowed, so rules live in one place.' },
        hints: [
          `<p>List the state transitions as edges. Each outgoing edge becomes one link (action name = link relation).</p>`,
          `<p>Also consider permissions: a support agent may see a <code>refund</code> link that a customer does not. Links can depend on user and state.</p>`,
          `<p>Return PENDING: self, pay, cancel; PAID: self, ship, refund; SHIPPED: self, track; DELIVERED: self, return; CANCELLED: self. Clients render a button per action link.</p>`
        ],
        solution: {
          approach: `<p>Model the order lifecycle as a state machine on the server and derive links from the outgoing transitions allowed for the <i>current state and current user</i>. PENDING exposes pay and cancel; PAID exposes ship (for warehouse roles) and refund; SHIPPED exposes track; DELIVERED exposes return; CANCELLED exposes only self. The UI loops over the action links and renders a button or menu item for each, with no switch on status. If the business later allows cancelling within an hour of payment, only the server's link logic changes and all clients adapt automatically. You also get authorisation hints for free: absence of a link means "not allowed", although the server must still enforce the rule on the endpoint itself (return 409 or 403), because links are advice, not security.</p>`,
          code: `import java.util.*;
class Links {
    static List<String> links(String status) {
        return switch (status) {
            case "PENDING" -> List.of("self", "pay", "cancel");
            case "PAID" -> List.of("self", "ship", "refund");
            case "SHIPPED" -> List.of("self", "track");
            case "DELIVERED" -> List.of("self", "return");
            default -> List.of("self");   // CANCELLED and unknown: no actions
        };
    }
    public static void main(String[] a) { System.out.println(links("PAID")); }
}`,
          complexity: `<p>O(1) per response. The cost is a little extra payload and keeping the state machine authoritative on the server.</p>`,
          followUps: ['Is a missing link a security control?', 'How do you describe these links in OpenAPI?']
        }
      }
    ]
  });

  /* =====================================================================
     TOPIC 8 — HTTP caching: Cache-Control, ETag, conditional requests
     ===================================================================== */
  topics.push({
    title: 'HTTP Caching: Cache-Control, ETag and Conditional Requests',
    analogy: `<p>You ask a friend for the <b>weekly cinema timetable</b>. Rule 1 (<b>Cache-Control: max-age</b>): "this sheet is good for 7 days, don't ask me again before that". After 7 days you call and ask, <b>"my sheet is version B-42; has it changed?"</b> (that's the <b>ETag</b> in <code>If-None-Match</code>). Your friend answers either "still B-42, keep it" (<b>304 Not Modified</b>, a two-second call) or reads out the whole new timetable (<b>200 OK</b>). Fast, cheap, and never stale for long.</p>`,
    explain: `<p>🟢 <b>Two ideas, used together.</b></p>
      <p><b>1) Freshness: "you don't need to ask".</b> <code>Cache-Control: max-age=60</code> tells browsers and CDNs: reuse this response for 60 seconds with <i>no network request at all</i>.</p>
      <p><b>2) Validation: "ask cheaply if it changed".</b> When the copy is stale, the cache sends a <b>conditional request</b> with the validator it holds: <code>If-None-Match: "v1"</code> (an ETag) or <code>If-Modified-Since: &lt;date&gt;</code>. If nothing changed the server replies <code>304 Not Modified</code> with <b>no body</b>, so only headers travel. If it changed: normal <code>200</code> with the new body and a new ETag.</p>
      ${H.table(['Header', 'Meaning', 'Example'], [
        ['<code>Cache-Control: max-age=N</code>', 'fresh for N seconds (any cache)', '<code>max-age=60</code>'],
        ['<code>s-maxage=N</code>', 'same, but only for shared caches (CDN)', '<code>s-maxage=300</code>'],
        ['<code>no-cache</code>', H.c('y', 'store it, but revalidate before every reuse'), 'HTML pages, personal data'],
        ['<code>no-store</code>', H.c('r', 'never keep a copy anywhere'), 'bank statements, tokens'],
        ['<code>private</code> / <code>public</code>', 'only the browser / any cache may store', '<code>private</code> for user-specific JSON'],
        ['<code>immutable</code>', 'will never change; do not even revalidate', 'hashed <code>app.3f9a1c.js</code>'],
        ['<code>stale-while-revalidate=N</code>', 'serve stale instantly, refresh in the background', 'feeds, dashboards'],
        ['<code>ETag: "abc"</code>', 'fingerprint of this version of the resource', 'sent with 200/304'],
        ['<code>Last-Modified</code>', 'date-based validator (1-second resolution)', 'static files']
      ])}
      <p><b>Common trap:</b> <code>no-cache</code> does <i>not</i> mean "don't cache". It means "cache, but check first". The real "never store" is <code>no-store</code>.</p>
      <p><b>Writes use the same trick in reverse.</b> To avoid the lost-update problem, a client sends <code>If-Match: "v7"</code> on <code>PUT</code>/<code>PATCH</code>/<code>DELETE</code>. If the resource is no longer v7, the server refuses with <code>412 Precondition Failed</code>; if the header is missing and you require it, <code>428 Precondition Required</code>. That is <b>optimistic concurrency</b> over plain HTTP.</p>
      ${H.table(['Request', 'Current ETag is "v3"', 'Status'], [['GET + If-None-Match: "v3"', 'match', H.c('g', '304 Not Modified')], ['GET + If-None-Match: "v2"', 'differs', '200 OK + body + ETag "v3"'], ['PUT + If-Match: "v3"', 'match', '200 OK, new ETag "v4"'], ['PUT + If-Match: "v2"', 'differs', H.c('r', '412 Precondition Failed')], ['PUT with no If-Match (required)', '-', H.c('y', '428 Precondition Required')]])}`,
    clues: [
      '"Reduce bandwidth / latency for repeated reads" → Cache-Control + ETag',
      '"Return 304" / "If-None-Match" / "conditional GET" → validators',
      '"Two users editing the same record" / "lost update" over HTTP → ETag + If-Match, 412',
      '"Static assets with hashes in the file name" → <code>public, max-age=31536000, immutable</code>',
      '"Per-user data must not leak through a CDN" → <code>private</code> or <code>Vary: Authorization</code> / <code>no-store</code>',
      '"What is the difference between no-cache and no-store?" → revalidate vs never store',
      '"Stale content for a few seconds is OK" → <code>stale-while-revalidate</code>'
    ],
    code: [
      {
        lang: 'js', run: true, title: 'ETag + conditional GET + If-Match simulation (runnable)',
        code: `// A tiny in-memory "server" that speaks ETag / If-None-Match / If-Match.
var store = { '/books/7': { data: { id: 7, title: 'Dune', stock: 12 } } };

function fnv(str) {                       // demo hash. Production: SHA-256 of the bytes, or a version column
  var h = 0x811c9dc5;
  for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16);
}
function etagOf(doc) { return '"' + fnv(JSON.stringify(doc)) + '"'; }       // strong validator

function parseList(header) {              // '"a", W/"b"'  ->  [{weak:false,tag:'"a"'}, {weak:true,tag:'"b"'}]
  return header.split(',').map(function (s) { s = s.trim(); var weak = s.indexOf('W/') === 0; return { weak: weak, tag: weak ? s.slice(2) : s }; });
}
// If-None-Match uses WEAK comparison (W/ ignored). If-Match uses STRONG comparison.
function noneMatch(header, current) {
  if (header.trim() === '*') return true;
  return parseList(header).some(function (e) { return e.tag === current; });
}
function ifMatch(header, current) {
  if (header.trim() === '*') return true;
  return parseList(header).some(function (e) { return !e.weak && e.tag === current; });
}

function handle(req) {
  var res = store[req.path];
  if (!res) return { status: 404, headers: {}, body: null };
  var etag = etagOf(res.data);
  var cc = 'private, max-age=0, must-revalidate';          // revalidate on every use, cheap thanks to 304
  if (req.method === 'GET') {
    var inm = req.headers['If-None-Match'];
    if (inm && noneMatch(inm, etag)) return { status: 304, headers: { ETag: etag, 'Cache-Control': cc }, body: null };
    return { status: 200, headers: { ETag: etag, 'Cache-Control': cc }, body: res.data };
  }
  if (req.method === 'PUT') {
    var im = req.headers['If-Match'];
    if (!im) return { status: 428, headers: {}, body: { title: 'If-Match header required' } };
    if (!ifMatch(im, etag)) return { status: 412, headers: { ETag: etag }, body: { title: 'Resource changed, re-fetch and retry' } };
    res.data = req.body;
    return { status: 200, headers: { ETag: etagOf(res.data) }, body: res.data };
  }
  return { status: 405, headers: { Allow: 'GET, PUT' }, body: null };
}

function show(label, req) {
  var r = handle(req);
  var bytes = r.body ? JSON.stringify(r.body).length : 0;
  console.log(label.padEnd(34), '->', r.status, (r.headers.ETag || '').padEnd(12), bytes + ' body bytes');
  return r;
}

var first = show('1. GET (no cache yet)', { method: 'GET', path: '/books/7', headers: {} });
var tag = first.headers.ETag;
show('2. GET If-None-Match (same)', { method: 'GET', path: '/books/7', headers: { 'If-None-Match': tag } });
show('3. GET If-None-Match (weak W/)', { method: 'GET', path: '/books/7', headers: { 'If-None-Match': 'W/' + tag } });
show('4. PUT without If-Match', { method: 'PUT', path: '/books/7', headers: {}, body: { id: 7, title: 'Dune', stock: 11 } });
var put = show('5. PUT If-Match (fresh)', { method: 'PUT', path: '/books/7', headers: { 'If-Match': tag }, body: { id: 7, title: 'Dune', stock: 11 } });
show('6. PUT If-Match (stale tag)', { method: 'PUT', path: '/books/7', headers: { 'If-Match': tag }, body: { id: 7, title: 'Dune', stock: 10 } });
show('7. GET with the OLD tag', { method: 'GET', path: '/books/7', headers: { 'If-None-Match': tag } });
show('8. GET with the NEW tag', { method: 'GET', path: '/books/7', headers: { 'If-None-Match': put.headers.ETag } });`
      },
      `import java.util.*;

// Plain-Java evaluation of HTTP preconditions (RFC 9110, section 13).
// Returns the status the server should answer with BEFORE doing any real work.
public class Preconditions {
    static List<String> tags(String header) {
        List<String> out = new ArrayList<>();
        for (String p : header.split(",")) out.add(p.trim());
        return out;
    }
    static boolean weakEquals(String a, String b) {                    // for If-None-Match
        return strip(a).equals(strip(b));
    }
    static String strip(String t) { return t.startsWith("W/") ? t.substring(2) : t; }

    static boolean strongMatch(String header, String current) {       // for If-Match
        if (header.trim().equals("*")) return true;
        for (String t : tags(header)) if (!t.startsWith("W/") && t.equals(current)) return true;
        return false;
    }
    static boolean noneMatchHit(String header, String current) {
        if (header.trim().equals("*")) return true;
        for (String t : tags(header)) if (weakEquals(t, current)) return true;
        return false;
    }

    /** current = ETag of the stored resource (null if it does not exist). */
    static int evaluate(String method, String ifMatch, String ifNoneMatch, String current, boolean requireIfMatchOnWrites) {
        boolean write = method.equals("PUT") || method.equals("PATCH") || method.equals("DELETE");
        if (write && ifMatch == null && requireIfMatchOnWrites) return 428;           // you must send a precondition
        if (ifMatch != null && (current == null || !strongMatch(ifMatch, current))) return 412;
        if (ifNoneMatch != null && current != null && noneMatchHit(ifNoneMatch, current)) {
            return (method.equals("GET") || method.equals("HEAD")) ? 304 : 412;      // 412 stops "create only if absent" races
        }
        return 200;                                                                   // proceed normally
    }

    public static void main(String[] args) {
        String cur = "\\"v3\\"";
        System.out.println(evaluate("GET", null, "\\"v3\\"", cur, true));   // 304
        System.out.println(evaluate("GET", null, "\\"v2\\"", cur, true));   // 200
        System.out.println(evaluate("PUT", "\\"v2\\"", null, cur, true));   // 412
        System.out.println(evaluate("PUT", null, null, cur, true));        // 428
        System.out.println(evaluate("PUT", "\\"v3\\"", null, cur, true));   // 200
        System.out.println(evaluate("PUT", null, "*", cur, false));       // 412 : create-only, but it exists
    }
}`,
      {
        lang: 'java', check: false, title: 'Spring Boot: conditional GET and Cache-Control',
        code: `@GetMapping("/books/{isbn}")
ResponseEntity<BookDto> get(@PathVariable String isbn, WebRequest request) {
    Book book = books.findByIsbn(isbn).orElseThrow(() -> new NotFoundException(isbn));
    String etag = "\\"" + book.version() + "\\"";                 // cheap validator: the @Version column
    if (request.checkNotModified(etag)) {
        return null;                                            // Spring has already written 304 + ETag
    }
    return ResponseEntity.ok()
        .eTag(etag)
        .cacheControl(CacheControl.maxAge(Duration.ofSeconds(60)).cachePublic().staleWhileRevalidate(Duration.ofSeconds(30)))
        .body(BookDto.from(book));
}

// Or let a filter hash the body for you (saves bandwidth, not CPU):
@Bean FilterRegistrationBean<ShallowEtagHeaderFilter> etagFilter() {
    return new FilterRegistrationBean<>(new ShallowEtagHeaderFilter());
}`
      },
      {
        lang: 'js', check: false, title: 'Express: ETags are automatic, Cache-Control is yours',
        code: `const express = require('express');
const app = express();
app.set('etag', 'strong');                    // express computes ETag from the body and answers 304 for you

app.get('/books/:isbn', async (req, res) => {
  const book = await books.find(req.params.isbn);
  if (!book) return res.status(404).json({ title: 'Not found', status: 404 });
  res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=30');
  res.json(book);                             // sets ETag; req.fresh -> 304 with no body
});

// Hashed static files: cache forever
app.use('/assets', express.static('dist/assets', { immutable: true, maxAge: '365d' }));`
      },
      {
        lang: 'http', title: 'The 200 then 304 round trip', code: `GET /api/v1/books/7 HTTP/1.1
Host: api.example.com

HTTP/1.1 200 OK
ETag: "v1"
Cache-Control: public, max-age=60
Content-Type: application/json

{"id": 7, "title": "Dune", "stock": 12}

--- 90 seconds later (copy is stale, ask cheaply) ---

GET /api/v1/books/7 HTTP/1.1
Host: api.example.com
If-None-Match: "v1"

HTTP/1.1 304 Not Modified
ETag: "v1"
Cache-Control: public, max-age=60`
      }
    ],
    codeTitle: ['ETag / If-None-Match / If-Match simulation (JavaScript, runnable)', 'Precondition evaluator (plain Java)', 'Spring Boot', 'Express', 'The round trip on the wire'],
    viz: [
      {
        title: 'Conditional GET: 200, cache hit, 304, then 200 again',
        gen: function () {
          var nodes = [
            { id: 'Client', label: 'Client', x: 12, y: 20, shape: 'box', w: 14 },
            { id: 'Cache', label: 'Browser / CDN cache', x: 50, y: 20, shape: 'box', w: 22 },
            { id: 'Server', label: 'API server', x: 88, y: 20, shape: 'box', w: 15 }
          ];
          function g(e1, e2, hl, ehl, tags) {
            return { type: 'graph', directed: false, height: 40, nodes: nodes, edges: [['Client', 'Cache', e1], ['Cache', 'Server', e2]], hl: hl || {}, ehl: ehl || {}, tags: tags || {} };
          }
          var trace = [];
          function q(item) { trace.push(item); return { type: 'queue', label: 'Message trace (oldest first)', items: trace.slice(), frontLabel: 'first', backLabel: 'latest', hl: (function () { var o = {}; o[trace.length - 1] = 'cur'; return o; })() }; }
          var f = [];
          f.push({ narr: 'The client needs <code>/books/7</code>. The cache is <b>empty</b>, so this will be a miss.', parts: [g('GET /books/7 →', '', { Client: 'cur' }, { 'Client-Cache': 'cur' }), q('Client → GET /books/7')] });
          f.push({ narr: 'Cache miss: the request is forwarded to the server.', parts: [g('', 'GET /books/7 →', { Cache: 'cur' }, { 'Cache-Server': 'cur' }, { Cache: 'MISS' }), q('Cache → Server: GET /books/7')] });
          f.push({ narr: 'Server answers <b>200 OK</b> with the body, <code>ETag: "v1"</code> and <code>Cache-Control: max-age=60</code>.', parts: [g('', '← 200 + body + ETag "v1"', { Server: 'cur' }, { 'Cache-Server': 'ok' }), q('Server → Cache: 200 ETag "v1", max-age=60')] });
          f.push({ narr: 'The cache <b>stores</b> the copy and passes it on. The client has the data; total cost: one full request.', parts: [g('← 200 (body)', '', { Cache: 'ok', Client: 'ok' }, { 'Client-Cache': 'ok' }, { Cache: 'stored v1, age 0s' }), q('Cache → Client: 200 (body)')] });
          f.push({ narr: '<b>30 seconds later</b> the client asks again. The copy is younger than max-age (60s), so the cache answers <b>alone</b>. <span class="c-g">Zero network traffic to the server.</span>', parts: [g('GET → ← 200 (from cache)', '(no request)', { Cache: 'ok' }, { 'Client-Cache': 'ok' }, { Cache: 'fresh, age 30s' }), q('Cache → Client: 200 (cache hit, server not contacted)')] });
          f.push({ narr: '<b>90 seconds</b> after the first fetch the copy is <span class="c-y">stale</span>. The cache does not throw it away; it asks the server <i>"still v1?"</i> using <code>If-None-Match: "v1"</code>.', parts: [g('', 'GET + If-None-Match "v1" →', { Cache: 'cur' }, { 'Cache-Server': 'cur' }, { Cache: 'stale, age 90s' }), q('Cache → Server: GET If-None-Match "v1"')] });
          f.push({ narr: 'Resource unchanged → server replies <b>304 Not Modified</b> with <i>no body</i> (a few hundred bytes instead of the whole document). The cache marks its copy fresh again.', parts: [g('', '← 304 (no body)', { Server: 'ok' }, { 'Cache-Server': 'ok' }, { Cache: 'revalidated, age 0s' }), q('Server → Cache: 304 Not Modified')] });
          f.push({ narr: 'The cache serves its stored body to the client as <b>200</b>. The client cannot tell the difference, but you saved bandwidth and server work.', parts: [g('← 200 (cached body)', '', { Client: 'ok' }, { 'Client-Cache': 'ok' }), q('Cache → Client: 200 (stored body)')] });
          f.push({ narr: 'Later, somebody changes the book: the server now has ETag <b>"v2"</b>. The next revalidation sends <code>If-None-Match: "v1"</code>, which no longer matches.', parts: [g('', 'GET + If-None-Match "v1" →', { Server: 'cur' }, { 'Cache-Server': 'bad' }, { Server: 'now v2' }), q('Cache → Server: If-None-Match "v1" (stale)')] });
          f.push({ narr: 'Server returns a full <b>200 OK</b> with the new body and <code>ETag: "v2"</code>. The cache replaces its copy. The cycle repeats forever.', parts: [g('← 200 (new body)', '← 200 + body + ETag "v2"', { Cache: 'ok', Server: 'ok' }, { 'Cache-Server': 'ok', 'Client-Cache': 'ok' }, { Cache: 'stored v2' }), q('Server → Cache: 200 ETag "v2"')] });
          return f;
        }
      },
      {
        title: 'Freshness timeline with max-age',
        input: '60',
        inputLabel: 'max-age in seconds (10 to 600)',
        gen: function (input) {
          var maxAge = parseInt(String(input).trim(), 10);
          if (isNaN(maxAge) || maxAge < 10 || maxAge > 600) throw new Error('Enter max-age between 10 and 600 seconds');
          var times = [0, 20, 50, 80, 130, 140, 250];
          var rows = [], hl = {}, frames = [], stored = null;
          frames.push({ narr: 'Server sends <code>Cache-Control: max-age=' + maxAge + '</code> and an ETag. We watch one client request the same URL at different moments.', parts: [{ type: 'table', label: 'Request timeline', columns: ['t (s)', 'age of copy', 'cache decision', 'network?', 'status seen by server'], rows: [], hl: {} }] });
          times.forEach(function (t, i) {
            var row, cls;
            if (stored === null) { row = [String(t), '-', 'MISS, nothing stored', 'full request', '200 + body']; cls = 'bad'; stored = t; }
            else {
              var age = t - stored;
              if (age < maxAge) { row = [String(t), age + 's', 'HIT, fresh (age &lt; ' + maxAge + ')', 'none', 'server not contacted']; cls = 'ok'; }
              else { row = [String(t), age + 's', 'STALE, revalidate', 'tiny conditional request', '304 Not Modified']; cls = 'cur'; stored = t; }
            }
            rows.push(row); hl[i] = cls;
            frames.push({ narr: 't = ' + t + 's: ' + (cls === 'ok' ? '<span class="c-g">fresh hit</span>, answered locally with no network.' : cls === 'cur' ? '<span class="c-y">stale</span>: one cheap <code>If-None-Match</code> request returns 304 and the copy is fresh again.' : '<span class="c-r">miss</span>: first request pays full price.'), parts: [{ type: 'table', label: 'Request timeline', columns: ['t (s)', 'age of copy', 'cache decision', 'network?', 'status seen by server'], rows: rows.map(function (r) { return r.slice(); }), hl: JSON.parse(JSON.stringify(hl)) }] });
          });
          var hits = Object.keys(hl).filter(function (k) { return hl[k] === 'ok'; }).length;
          frames.push({ narr: 'Out of ' + times.length + ' requests only <b>' + (times.length - hits) + '</b> reached the server, and only the first carried a full body. A bigger max-age means more hits but staler data: choose it from "how wrong may this be, and for how long?".', parts: [{ type: 'vars', vals: { requests: times.length, 'served from cache': hits, 'hit with 304': Object.keys(hl).filter(function (k) { return hl[k] === 'cur'; }).length }, hl: { 'served from cache': 'ok' } }] });
          return frames;
        }
      }
    ],
    examples: [
      {
        title: 'Which Cache-Control for which response?',
        html: `${H.table(['Response', 'Cache-Control', 'Why'], [
          ['<code>/assets/app.3f9a1c.js</code> (hash in name)', '<code>public, max-age=31536000, immutable</code>', 'content change = new URL, so cache forever'],
          ['<code>index.html</code> (app shell)', '<code>no-cache</code> + ETag', 'must pick up new asset names; revalidate cheaply'],
          ['Public catalogue <code>GET /books</code>', '<code>public, max-age=60, stale-while-revalidate=30</code>', 'minute-old data is fine; CDN absorbs load'],
          ['Logged-in <code>GET /me</code>', '<code>private, no-cache</code> + ETag', 'user-specific; browser may keep, CDN must not'],
          ['Bank statement, access token response', '<code>no-store</code>', 'never write to disk or proxies'],
          ['POST /payments result', '(none needed; not cacheable)', 'unsafe methods are not cached']
        ])}`
      },
      {
        title: 'Lost update prevented with If-Match',
        html: `<p>Asha and Ben both open book 7 (stock 12, ETag <code>"v1"</code>). Asha saves stock 11, the server stores it and returns <code>ETag: "v2"</code>. Ben, still holding <code>"v1"</code>, saves stock 10 with <code>If-Match: "v1"</code>. The server sees the stored version is <code>"v2"</code> and answers <code>412 Precondition Failed</code>. Ben's UI re-fetches, shows "someone changed this", and Ben decides. Without the header, Ben would silently overwrite Asha's change (<b>lost update</b>).</p>`,
        code: { lang: 'http', code: `PUT /api/v1/books/7 HTTP/1.1\nIf-Match: "v1"\nContent-Type: application/json\n\n{"id": 7, "title": "Dune", "stock": 10}\n\nHTTP/1.1 412 Precondition Failed\nETag: "v2"\nContent-Type: application/problem+json\n\n{"title": "Resource was modified", "status": 412}` }
      },
      {
        title: 'Strong vs weak ETags, and cheap ETags',
        html: `<p>A <b>strong</b> ETag <code>"abc"</code> means byte-for-byte identical. A <b>weak</b> one <code>W/"abc"</code> means "semantically the same" (useful when gzip or whitespace differs). <code>If-Match</code> needs strong comparison; <code>If-None-Match</code> may use weak. <b>Cheap ETag source:</b> a row <code>version</code>/<code>updated_at</code> column lets you answer 304 <i>without</i> loading or serialising the whole object; hashing the response body saves bandwidth but not CPU or DB work.</p>`
      },
      {
        title: 'Vary: the header that prevents wrong cache hits',
        html: `<p>If a response depends on a request header (<code>Accept-Language</code>, <code>Accept</code>, <code>Api-Version</code>, <code>Accept-Encoding</code>), you must list it: <code>Vary: Accept-Language</code>. Otherwise a shared cache may serve the French page to an English reader. Avoid <code>Vary: *</code> and <code>Vary: Cookie</code> on public endpoints; they effectively disable shared caching.</p>`
      }
    ],
    deepDive: `<p>🟣 <b>Heuristic freshness.</b> If a response has no <code>Cache-Control</code> but has <code>Last-Modified</code>, caches may guess freshness (often 10% of the age since last modification). That is why "I changed my CSS and users still see the old one". Always set explicit headers on every response you care about.</p>
      <p><b>Reload semantics.</b> A normal browser reload revalidates (sends conditional requests); hard reload bypasses caches; back/forward may reuse stale copies without any check. Cache-busting by URL fingerprint (<code>app.3f9a1c.js</code>) works because a new URL is a new cache key, with no invalidation protocol needed.</p>
      <p><b>Shared caches and privacy.</b> CDNs cache responses keyed by URL + <code>Vary</code> headers. A response that contains personal data must be <code>private</code> or <code>no-store</code>; otherwise one user's data can be served to another (a real, recurring production incident). Responses to requests with an <code>Authorization</code> header are not stored by shared caches unless marked <code>public</code>/<code>s-maxage</code>.</p>
      <p><b>stale-while-revalidate and stale-if-error.</b> <code>max-age=60, stale-while-revalidate=30</code> lets the cache serve a stale copy for 30 more seconds while it refreshes in the background: users never wait, the origin gets one request. <code>stale-if-error=86400</code> keeps the site up when the origin is failing. Both are standardised (RFC 5861, RFC 9111) and well supported by CDNs.</p>
      <p><b>Request collapsing and invalidation.</b> When a hot key expires, thousands of clients may revalidate at once (thundering herd). CDNs "collapse" them into one origin request; you can also add jitter to <code>max-age</code>. For instant invalidation use surrogate keys / purge APIs; for DB writes, bump the version (and thus the ETag), accepting that other caches see it after their TTL.</p>
      <p><b>ETag generation pitfalls.</b> Cluster nodes must agree: if each node hashes a response slightly differently (field order, timestamps), ETags differ between nodes and every request misses. Make serialisation deterministic, or derive the ETag from a version. Also do not use ETags for security (they are guessable fingerprints), and remember some trackers abuse them as cookies.</p>
      <p><b>Conditional requests on unsafe methods.</b> <code>If-None-Match: *</code> on PUT = "create only if absent" (412 if it exists). <code>If-Match</code> on DELETE guards against deleting a newer version. Return <code>428</code> to teach clients to always send it.</p>`,
    aiEra: `<p>🤖 <b>What AI changes.</b> Agents and RAG crawlers re-read the same URLs again and again. Good <code>ETag</code> + <code>Cache-Control</code> headers turn most of those into 304s, saving bandwidth, origin cost and rate-limit budget. AI inference gateways also use <b>response caching</b> (exact and semantic) and <b>prompt caching</b>: same idea, different layer.</p>
      <p><b>Work with AI:</b> paste your response headers and ask "what will a CDN and a browser do with this?"; ask for test cases (browser reload, CDN purge, two users, <code>Vary</code>). Have it write a curl script that checks 200/304/412 flows.</p>
      <p><b>Where AI goes wrong:</b> it suggests <code>Cache-Control: no-cache</code> meaning "disable caching", copies <code>max-age=31536000</code> onto API JSON (stale forever), forgets <code>private</code> on user data, computes ETags from the timestamp of the request (changes every time), or hashes with a random salt per node.</p>
      <p><b>You must still own:</b> the staleness budget per resource (a business decision), privacy boundaries between users, and the invalidation story. If the cache layer serves AI-generated content, add <code>Vary</code> for anything that changes the output (language, model version) and never cache responses containing another user's data.</p>`,
    problems: [
      {
        title: 'Predict 200, 304, 412 and 428',
        level: 'Medium',
        tags: ['etag', 'conditional requests', 'caching'],
        companies: ['Google', 'Cloudflare'],
        statement: `<p>The server currently holds <code>/books/7</code> with ETag <code>"v3"</code> and requires <code>If-Match</code> on writes. Give the status code and the ETag in the response (if any) for each request, in order, assuming successful writes bump the version by one.</p>
          <ol><li><code>GET</code> with <code>If-None-Match: "v3"</code></li><li><code>GET</code> with <code>If-None-Match: "v2"</code></li><li><code>PUT</code> without <code>If-Match</code></li><li><code>PUT</code> with <code>If-Match: "v2"</code></li><li><code>PUT</code> with <code>If-Match: "v3"</code></li><li><code>PUT</code> again with <code>If-Match: "v3"</code> (client retry after losing the response)</li><li><code>GET</code> with <code>If-None-Match: W/"v4"</code></li></ol>`,
        constraints: `Use RFC 9110 semantics: If-Match strong comparison, If-None-Match weak comparison.`,
        example: `<p>1) ${H.c('g', '304')} (ETag "v3"). 2) ${H.c('b', '200')} (ETag "v3" + body). 3) ${H.c('y', '428')}. 4) ${H.c('r', '412')}. 5) ${H.c('g', '200')} (ETag "v4"). 6) ${H.c('r', '412')}. 7) ${H.c('g', '304')}.</p>`,
        brute: { why: `<p>Ignoring preconditions (always 200) means two concurrent editors silently overwrite each other, and every poll downloads the full body. Treating a retried PUT as a fresh success would apply the change twice.</p>` },
        mcq: { q: 'A client retries a PUT whose first attempt succeeded but the response was lost. It sends the old If-Match "v3". What does the server return?', options: ['200 again', '412 Precondition Failed, because the stored ETag is now "v4"', '304', '409 always'], answer: 1, explain: 'The first PUT bumped the version, so the old tag no longer matches. The client should re-GET and see that its change is already there.' },
        hints: [
          `<p>Track the current ETag after each step: v3 until a successful write, then v4.</p>`,
          `<p>GET with If-None-Match matching → 304; non-matching → 200. PUT: missing header → 428; non-matching → 412; matching → write.</p>`,
          `<p>Sequence: 304, 200, 428, 412, 200 (v4), 412 (stale tag), 304 (weak comparison ignores the W/ prefix and v4 now matches).</p>`
        ],
        solution: {
          approach: `<p>Walk the requests while tracking the stored version. (1) GET with If-None-Match "v3" matches the current "v3": 304 with the ETag and no body. (2) "v2" differs: normal 200 with the body and ETag "v3". (3) PUT without If-Match on a resource that requires it: 428 Precondition Required, nothing changes. (4) PUT with "v2": strong comparison fails against "v3": 412 Precondition Failed, nothing changes. (5) PUT with "v3": matches, the write is applied, the version becomes "v4", reply 200 (or 204) with ETag "v4". (6) The retry still carries "v3", which no longer matches "v4": 412. The client should GET and see the update already applied, which makes the retry safe. (7) GET with W/"v4": weak comparison ignores the weak marker, tags equal, so 304.</p>`,
          complexity: `<p>O(1) comparison per request; with a version column the 304 path avoids loading and serialising the resource.</p>`,
          followUps: ['How does this relate to Idempotency-Key?', 'When would you return 409 instead of 412?']
        }
      }
    ]
  });

  /* =====================================================================
     PRACTICE — Easy
     ===================================================================== */
  practice.push({
    title: 'Pick the Status Code: Six Everyday Situations',
    level: 'Easy', tags: ['status codes'], companies: ['Amazon', 'Zomato'],
    statement: `<p>Choose the best HTTP status for each situation: (1) a new user is registered; (2) a user deletes their own comment; (3) the JSON body is cut off mid-way; (4) the request is fine but the email is already taken; (5) a search finds nothing; (6) the caller sends too many requests per minute.</p>`,
    constraints: `One status per situation, plus the one header or body detail it needs.`,
    example: `<p>(1) ${H.c('g', '201 Created')} + <code>Location: /users/17</code>. (3) ${H.c('r', '400 Bad Request')}. (5) ${H.c('g', '200 OK')} with an empty list, not 404.</p>`,
    brute: { why: `<p>Returning <code>200</code> with <code>{"success": false}</code> for every outcome hides failures from caches, retry logic, monitoring and generic HTTP clients; they all key off the status code.</p>` },
    mcq: { q: 'A search for "unicorn" matches no books. Which response is best?', options: ['404 Not Found', '200 OK with an empty data array', '204 No Content', '400 Bad Request'], answer: 1, explain: 'The search endpoint exists and ran correctly; "no results" is a valid result set.' },
    hints: [
      `<p>Decide first whether the client or the server is at fault, then whether the request was syntactically valid.</p>`,
      `<p>Think about creation (201 + Location), deletion (204), syntax (400), state clash (409), empty results (200), rate limit (429 + Retry-After).</p>`,
      `<p>Answers: 201, 204, 400, 409 (or 422), 200 with [], 429 with Retry-After seconds.</p>`
    ],
    solution: {
      approach: `<p>(1) 201 Created with a Location header pointing at the new user. (2) 204 No Content: the delete worked and there is nothing to return. (3) 400 Bad Request because the body cannot be parsed at all. (4) 409 Conflict: valid data that clashes with existing state (many teams use 422 for the same case; pick one and document it). (5) 200 OK with an empty array, since the endpoint worked and the result set is simply empty. (6) 429 Too Many Requests with a Retry-After header telling the client when to try again. Each answer also tells clients how to behave: retry 429 later, fix and resend after 400/409, never retry the same bad body.</p>`,
      complexity: `<p>Not algorithmic. Correct codes cost nothing and make retries, caching and dashboards work.</p>`
    }
  });

  practice.push({
    title: 'Cache-Control for Four Responses',
    level: 'Easy', tags: ['caching', 'cache-control'], companies: ['Cloudflare', 'Netflix'],
    statement: `<p>Pick a <code>Cache-Control</code> value for each response and say who may cache it: (a) <code>/static/app.9c1f2e.js</code>; (b) public product list that changes every few minutes; (c) <code>GET /me</code> (profile of the logged-in user); (d) a one-time password reset token response.</p>`,
    constraints: `Use only: max-age, s-maxage, public, private, no-cache, no-store, immutable.`,
    example: `<p>(a) <code>public, max-age=31536000, immutable</code>: the hash in the file name means a change creates a new URL.</p>`,
    brute: { why: `<p>One global header such as <code>max-age=3600</code> on everything serves yesterday's prices, caches a user's profile in a shared CDN (privacy leak) and may store secrets on disk.</p>` },
    mcq: { q: 'What does Cache-Control: no-cache actually mean?', options: ['The response must never be stored', 'The response may be stored but must be revalidated before reuse', 'The response is cached for 0 bytes', 'Only the CDN may store it'], answer: 1, explain: 'no-cache means "revalidate first". no-store is the directive that forbids storing.' },
    hints: [
      `<p>Ask for each response: how stale may it be, and is it personal to one user?</p>`,
      `<p>Hashed file names never change, so they can be cached for a year. Personal data needs private; secrets need no-store.</p>`,
      `<p>(a) public, max-age=31536000, immutable. (b) public, max-age=60 (add stale-while-revalidate). (c) private, no-cache + ETag. (d) no-store.</p>`
    ],
    solution: {
      approach: `<p>(a) The file name contains a content hash, so the URL changes whenever the content does: <code>public, max-age=31536000, immutable</code>, cached by browsers and CDNs for a year. (b) Data may be a minute stale: <code>public, max-age=60, stale-while-revalidate=30</code> so the CDN absorbs most traffic. (c) Personal data: <code>private, no-cache</code> with an ETag, so the browser stores it but revalidates each time and no shared cache keeps it. (d) A secret one-time token must not be written anywhere: <code>no-store</code>. The pattern: immutable for fingerprinted assets, short TTL for shared data, private for per-user data, no-store for secrets.</p>`,
      complexity: `<p>Not algorithmic. Effect: fewer origin requests for (a) and (b), no cross-user leaks for (c) and (d).</p>`
    }
  });

  practice.push({
    title: 'Model a Bookshop API From User Stories',
    level: 'Easy', tags: ['resource modelling', 'e-commerce'], companies: ['Flipkart', 'Shopify'],
    statement: `<p>Stories: customers browse books, view one book, add a book to their cart, remove it, place an order from the cart, pay for the order, see their orders, and cancel an unpaid order. List the resources, their URLs, and the method + URL for each story.</p>`,
    constraints: `Plural nouns, no verbs in paths, at most two nesting levels.`,
    example: `<p>${H.table(['Story', 'Request'], [['browse', 'GET /books?genre=scifi'], ['add to cart', 'POST /carts/{id}/items'], ['place order', 'POST /orders'], ['pay', 'POST /orders/{id}/payments']])}</p>`,
    brute: { why: `<p>Endpoints like <code>/addToCart</code>, <code>/placeOrder</code>, <code>/payNow</code>, <code>/cancelOrder</code> mean four unrelated routes with ad-hoc semantics; none of them can be GET-ed later to see what happened.</p>` },
    mcq: { q: 'How should "cancel an unpaid order" be modelled?', options: ['GET /cancelOrder?id=9', 'POST /orders/9/cancellation (or PATCH /orders/9 with status cancelled)', 'DELETE /orders with no id', 'PUT /cancel'], answer: 1, explain: 'Cancellation is a state change on the order or a new cancellation record; never a GET and never a verb path.' },
    hints: [
      `<p>Underline nouns in the stories: book, cart, cart item, order, payment.</p>`,
      `<p>Events that leave a record (placing an order, paying) become POSTs to a collection of those records.</p>`,
      `<p>books, carts/{id}/items, orders, orders/{id}/payments. Cancel = PATCH /orders/{id} {"status":"cancelled"} or POST /orders/{id}/cancellation.</p>`
    ],
    solution: {
      approach: `<p>Resources: Book (<code>/books</code>, <code>/books/{isbn}</code>), Cart (<code>/carts/{id}</code>) with CartItem (<code>/carts/{id}/items/{itemId}</code>), Order (<code>/orders</code>, <code>/orders/{id}</code>) and Payment (<code>/orders/{id}/payments</code>). Stories map to: browse <code>GET /books?genre=...</code>; view <code>GET /books/{isbn}</code>; add to cart <code>POST /carts/{id}/items</code>; remove <code>DELETE /carts/{id}/items/{itemId}</code>; place order <code>POST /orders</code> with the cart id (201 + Location); pay <code>POST /orders/{id}/payments</code> with an Idempotency-Key; my orders <code>GET /orders</code> (the server scopes by the caller); cancel unpaid order <code>POST /orders/{id}/cancellation</code> (409 if already paid). Everything is a noun plus one of five methods.</p>`,
      complexity: `<p>Design exercise. Nesting depth is 2 at most; every resource has a stable address.</p>`
    }
  });

  practice.push({
    title: 'PUT or PATCH? Five UI Actions',
    level: 'Easy', tags: ['put', 'patch'], companies: ['Atlassian', 'Spotify'],
    statement: `<p>Choose PUT or PATCH for each action on a user profile resource and say why: (1) a mobile toggle "dark mode" on/off; (2) a settings form that submits every field at once; (3) clearing the phone number only; (4) importing a full profile from a backup file; (5) replacing only the avatar URL.</p>`,
    constraints: `Say what happens to fields that are not sent.`,
    example: `<p>(1) ${H.c('g', 'PATCH')} <code>{"darkMode":true}</code>: only one field changes, others untouched.</p>`,
    brute: { why: `<p>Using PUT for every edit forces clients to send and know every field; an older app that does not know the new <code>nickname</code> field wipes it. Using PATCH for imports leaves stale leftovers from the old document.</p>` },
    mcq: { q: 'With JSON Merge Patch, how do you clear the phone field?', options: ['{"phone": ""}', '{"phone": null}', '{"remove": "phone"}', 'You cannot'], answer: 1, explain: 'In RFC 7396 null means "delete this key". An empty string would store an empty value instead.' },
    hints: [
      `<p>PUT means "this is the whole document"; PATCH means "these are the changes".</p>`,
      `<p>Does the client intend to define every field, or touch just one?</p>`,
      `<p>(1) PATCH, (2) PUT or PATCH (full form can use PUT), (3) PATCH {"phone":null}, (4) PUT, (5) PATCH {"avatarUrl":"..."}.</p>`
    ],
    solution: {
      approach: `<p>(1) PATCH with <code>{"darkMode": true}</code>: tiny, absolute and idempotent, other fields untouched. (2) PUT is fine because the client sends the whole state and wants anything missing reset; PATCH works too. Use PUT only if the form owns every field, otherwise unknown fields get wiped. (3) PATCH with <code>{"phone": null}</code> using JSON Merge Patch, null deletes the key. (4) PUT: a backup file is the complete truth, so replacing the whole resource (and removing stale fields) is exactly right and the call is idempotent. (5) PATCH with the avatar URL only. Rule of thumb: edits from forms of unknown completeness and toggles are PATCH; whole-document replacement and imports are PUT.</p>`,
      complexity: `<p>Not algorithmic. PATCH payloads are smaller; PUT guarantees a known final state.</p>`
    }
  });

  /* =====================================================================
     PRACTICE — Medium
     ===================================================================== */
  practice.push({
    title: 'Apply a JSON Patch (RFC 6902) With a Guard',
    level: 'Medium', tags: ['json patch', 'rfc6902'], companies: ['Google', 'Microsoft'],
    statement: `<p>Apply this JSON Patch to the document and give the result. Then say what the server should reply if the <code>test</code> operation fails.</p>
      <pre>doc  : {"stock": 12, "tags": ["a","b"], "price": {"amount": 2999}}
patch: [
 {"op":"test",    "path":"/stock",        "value": 12},
 {"op":"replace", "path":"/price/amount", "value": 3499},
 {"op":"add",     "path":"/tags/1",       "value": "x"},
 {"op":"remove",  "path":"/tags/0"}
]</pre>`,
    constraints: `Operations apply in order; the whole patch is atomic.`,
    example: `<p>Result: <code>{"stock":12,"tags":["x","b"],"price":{"amount":3499}}</code>. The add at index 1 makes <code>["a","x","b"]</code>, the remove at index 0 drops <code>"a"</code>.</p>`,
    brute: { why: `<p>Treating the patch as a merge patch (an object) is impossible since it is an array of operations. Applying operations out of order or without the <code>test</code> guard lets a stale client overwrite newer data.</p>` },
    mcq: { q: 'If a test operation fails in a JSON Patch, what happens?', options: ['Only that operation is skipped', 'The whole patch is rejected and the document is unchanged', 'The remaining operations still apply', 'The server retries the operation'], answer: 1, explain: 'JSON Patch is atomic: any failing operation aborts the whole patch. Reply 409 or 422 (412 if you use If-Match).' },
    hints: [
      `<p>Apply the operations strictly in order; each one sees the document produced by the previous one.</p>`,
      `<p>In arrays, <code>add</code> at an index inserts and shifts later items; <code>remove</code> at an index deletes and shifts the rest left.</p>`,
      `<p>test passes (stock is 12). replace price. tags a,b → add at 1 → a,x,b → remove 0 → x,b. If the test fails, return 409/422 and change nothing.</p>`
    ],
    solution: {
      approach: `<p>Step by step: 1) <code>test /stock = 12</code> passes, nothing changes. 2) <code>replace /price/amount</code> sets 3499. 3) <code>add /tags/1 "x"</code> inserts at index 1 so tags becomes <code>["a","x","b"]</code>. 4) <code>remove /tags/0</code> deletes "a", leaving <code>["x","b"]</code>. Final document: <code>{"stock":12,"tags":["x","b"],"price":{"amount":3499}}</code>. If the test had failed (someone changed stock to 11 meanwhile), the whole patch is aborted atomically: reply 409 Conflict (or 412 when guarded with If-Match) with a problem document naming the failed path, and leave the stored document untouched so the client can re-read and retry.</p>`,
      complexity: `<p>O(k) operations; array insert/remove cost O(n) each because of shifting.</p>`,
      followUps: ['Is this patch idempotent if applied twice?', 'Why is move/copy dangerous for authorization?']
    }
  });

  practice.push({
    title: 'Write a Merge Patch Generator (diff)',
    level: 'Medium', tags: ['merge patch', 'algorithms'], companies: ['Stripe', 'Atlassian'],
    lang: 'js',
    statement: `<p>Implement <code>diffPatch(from, to)</code> that returns the smallest JSON Merge Patch (RFC 7396) transforming <code>from</code> into <code>to</code>. Deleted keys become <code>null</code>, nested objects recurse, arrays and scalars are replaced whole.</p>`,
    constraints: `Documents are JSON-compatible; depth ≤ 20; do not mutate inputs.`,
    example: `<p>from <code>{"a":1,"b":{"c":2,"d":3}}</code>, to <code>{"a":1,"b":{"c":9}}</code> → patch <code>{"b":{"c":9,"d":null}}</code>. Key <code>a</code> is unchanged so it is omitted.</p>`,
    brute: { why: `<p>Sending the whole <code>to</code> document as the patch works for objects but resends everything and cannot express deletions (a missing key is not a delete in merge patch). Comparing with string equality on the whole tree each time is O(n²) on repeated nesting.</p>`, code: { lang: 'js', code: `function bruteDiff(from, to) { return to; }  // wrong: no deletions, resends everything\nconsole.log(JSON.stringify(bruteDiff({a:1,b:2},{a:1})));` } },
    mcq: { q: 'How do you express "delete key d" in the generated patch?', options: ['Omit d', '{"d": null}', '{"d": ""}', '{"d": false}'], answer: 1, explain: 'null is the delete marker in JSON Merge Patch.' },
    hints: [
      `<p>Three cases per key: only in "to" (add), in both but different (change), only in "from" (delete = null).</p>`,
      `<p>If both values are plain objects, recurse and only keep the key if the nested patch is non-empty. Otherwise compare with JSON.stringify.</p>`,
      `<p>Return {} when nothing differs. Arrays count as scalars: if they differ, put the whole new array in the patch.</p>`
    ],
    solution: {
      approach: `<p>Walk the keys of <code>to</code>: a key absent in <code>from</code> goes in as-is; a key present in both is compared, recursing when both values are plain objects (keeping the entry only if the nested patch is non-empty) and replacing otherwise (arrays and scalars compare by serialised value). Then walk the keys of <code>from</code>: any key missing in <code>to</code> becomes <code>null</code>. The result applied with a standard merge-patch function reproduces <code>to</code>, which the demo asserts. Caveat: a value of <code>null</code> inside <code>to</code> cannot be expressed with merge patch, because null means delete; such documents need JSON Patch.</p>`,
      code: { lang: 'js', run: true, code: `function isObj(v) { return v !== null && typeof v === 'object' && !Array.isArray(v); }

function diffPatch(from, to) {
  var patch = {};
  Object.keys(to).forEach(function (k) {
    if (!(k in from)) { patch[k] = to[k]; return; }                  // new key
    if (isObj(from[k]) && isObj(to[k])) {                           // both objects: recurse
      var inner = diffPatch(from[k], to[k]);
      if (Object.keys(inner).length) patch[k] = inner;
    } else if (JSON.stringify(from[k]) !== JSON.stringify(to[k])) { // scalar/array changed
      patch[k] = to[k];
    }
  });
  Object.keys(from).forEach(function (k) { if (!(k in to)) patch[k] = null; });   // deleted key
  return patch;
}

function mergePatch(t, p) {
  if (!isObj(p)) return p;
  var r = isObj(t) ? Object.assign({}, t) : {};
  Object.keys(p).forEach(function (k) { if (p[k] === null) delete r[k]; else r[k] = mergePatch(r[k], p[k]); });
  return r;
}

var from = { a: 1, b: { c: 2, d: 3 }, tags: ['x', 'y'] };
var to = { a: 1, b: { c: 9 }, tags: ['x'], e: true };
var patch = diffPatch(from, to);
console.log('patch  :', JSON.stringify(patch));
console.log('roundtrip ok:', JSON.stringify(mergePatch(from, patch)) === JSON.stringify(to));
console.log('no change:', JSON.stringify(diffPatch(from, from)));` },
      complexity: `<p>Time O(size of both documents), space O(size of the patch).</p>`,
      followUps: ['How would you support explicit null values?', 'How do you diff arrays of objects with ids?']
    }
  });

  practice.push({
    title: 'Migrate an Offset Endpoint to Cursors Without Breaking Clients',
    level: 'Medium', tags: ['pagination', 'migration'], companies: ['Meta', 'Uber'],
    statement: `<p><code>GET /v1/orders?page=N&amp;size=20</code> is slow beyond page 500 and shows duplicates under load. Mobile apps using it cannot be forced to update. Plan a migration to cursor pagination: new parameters, response shape, compatibility behaviour for old clients, rollout, and how you protect the database from deep offsets meanwhile.</p>`,
    constraints: `No breaking change for v1 clients; 200M rows; 40% of traffic is old apps.`,
    example: `<p>New call: <code>GET /v1/orders?limit=20&amp;cursor=eyJ...</code> returns <code>page.nextCursor</code>. Old call <code>?page=3</code> still works but is capped (e.g. page ≤ 100) with a ${H.c('y', 'Deprecation')} header.</p>`,
    brute: { why: `<p>Ripping out <code>page</code> breaks every installed app. Keeping unbounded OFFSET lets a scraper request <code>page=10000000</code> and make the database scan millions of rows per request, a cheap denial-of-service.</p>` },
    mcq: { q: 'Which change is backwards compatible for old clients?', options: ['Removing the page parameter', 'Adding optional cursor/limit parameters and a nextCursor field next to the old fields', 'Changing the default ordering silently', 'Making cursor mandatory'], answer: 1, explain: 'Additive changes (optional inputs, extra output fields) do not break tolerant clients.' },
    hints: [
      `<p>Make the change additive: new optional parameters, extra response fields, old behaviour intact.</p>`,
      `<p>Protect the database: cap how deep offset can go (for example 1000 rows) and answer 400 with a hint to use cursors beyond that.</p>`,
      `<p>Roll out: ship cursor support, update first-party clients, add Deprecation/Sunset headers to page=, watch usage per app version, tighten caps, retire in the next major version.</p>`
    ],
    solution: {
      approach: `<p>Phase 1 (additive): keep <code>page</code>/<code>size</code> working but add optional <code>limit</code> and <code>cursor</code> parameters and return <code>page.nextCursor</code>, <code>page.hasMore</code> in the response alongside the old fields. Order is made total with <code>(created_at DESC, id DESC)</code> and an index on those columns. Phase 2 (protect): cap the depth of offset requests (for example page ≤ 100 or offset ≤ 2000); beyond that return 400 with a problem document pointing to cursors, and add per-client rate limits. Phase 3 (migrate): switch first-party web and mobile clients to cursors, add <code>Deprecation</code>/<code>Sunset</code> headers when <code>page</code> is used, and log usage per app version. Phase 4 (retire): after the window, remove offset in /v2 and answer 410 on the old form with a migration link. The cursor stays opaque and signed so its content can change later without another migration.</p>`,
      complexity: `<p>Offset cost O(offset) per request versus O(log N + size) per cursor request. The compatibility layer costs one extra branch.</p>`,
      followUps: ['What do you do about total counts that old clients display?', 'How do you handle a cursor issued before a deploy that changed the sort?']
    }
  });

  practice.push({
    title: 'Stop Lost Updates With ETag and If-Match',
    level: 'Medium', tags: ['etag', 'concurrency', 'put'], companies: ['Atlassian', 'Salesforce'],
    statement: `<p>Two editors open the same wiki page and both press Save. Design the HTTP exchange that prevents the second save from silently overwriting the first: which headers on GET, which on PUT, which status codes for each failure, and what the UI does on failure.</p>`,
    constraints: `Pages have a version column; reads vastly outnumber writes; clients may omit headers by mistake.`,
    example: `<p>Both GET ${H.c('b', 'ETag "v5"')}. Editor A: <code>PUT If-Match "v5"</code> → ${H.c('g', '200, ETag "v6"')}. Editor B: <code>PUT If-Match "v5"</code> → ${H.c('r', '412')}.</p>`,
    brute: { why: `<p>Plain "last write wins" PUT: editor B's save replaces the document with B's copy, silently erasing A's edits. Nobody sees an error, so nobody knows data was lost.</p>` },
    mcq: { q: 'The client forgot to send If-Match on a PUT to a resource that requires it. Best status?', options: ['200', '412', '428', '404'], answer: 2, explain: '428 Precondition Required tells the client the request must be conditional.' },
    hints: [
      `<p>Give every version of the page a validator and make writes prove which version they were based on.</p>`,
      `<p>GET returns ETag derived from the version column; PUT must carry If-Match with that tag.</p>`,
      `<p>Mismatch → 412 with the current ETag; missing header → 428; the UI re-fetches, shows a diff or merge screen and retries with the new tag.</p>`
    ],
    solution: {
      approach: `<p>GET /pages/12 returns the body and <code>ETag: "v5"</code> built from the version column (cheap, no hashing). Saving uses <code>PUT /pages/12</code> with <code>If-Match: "v5"</code>. The server performs the comparison and the write atomically, for example <code>UPDATE pages SET body=?, version=version+1 WHERE id=12 AND version=5</code>; zero rows updated means someone else won, so answer 412 Precondition Failed with the current ETag. A request with no If-Match gets 428 so clients cannot forget. On success reply 200 with the new ETag "v6". On 412 the UI re-fetches, shows the other editor's changes (diff or three-way merge) and lets the user retry with the new tag. The atomic conditional UPDATE matters: a separate read-then-write would reintroduce the race.</p>`,
      code: { lang: 'sql', code: `CREATE TABLE pages (id INTEGER PRIMARY KEY, body TEXT, version INTEGER NOT NULL);
INSERT INTO pages VALUES (12, 'hello', 5);
-- editor A saves based on version 5: one row changes
UPDATE pages SET body = 'hello A', version = version + 1 WHERE id = 12 AND version = 5;
SELECT changes() AS rows_updated_for_A;
-- editor B also saves based on version 5: zero rows change => reply 412
UPDATE pages SET body = 'hello B', version = version + 1 WHERE id = 12 AND version = 5;
SELECT changes() AS rows_updated_for_B;` },
      complexity: `<p>O(1) per request; the cost is one extra column compare inside the UPDATE.</p>`,
      followUps: ['What if the resource has no version column?', 'How does this differ from pessimistic locking?']
    }
  });

  practice.push({
    title: 'Write the OpenAPI Fragment for POST /orders',
    level: 'Medium', tags: ['openapi', 'idempotency'], companies: ['Stripe', 'Postman'],
    statement: `<p>Write an OpenAPI 3.1 fragment for <code>POST /orders</code>: required <code>Idempotency-Key</code> header, a JSON body with <code>cartId</code> (uuid) and optional <code>note</code> (max 200 chars), responses 201 (with Location header), 409, 422 and a reusable problem+json error response.</p>`,
    constraints: `Use components and $ref, no duplicated schemas.`,
    example: `<p>201 returns an Order with <code>id</code> and <code>status</code>; the error responses reference one shared <code>Problem</code> component.</p>`,
    brute: { why: `<p>Documenting only the 200 case with a free-form object means generated clients cannot handle errors, nobody learns the key header is mandatory, and contract tests cannot reject bad payloads.</p>` },
    mcq: { q: 'Where should a reusable error response be defined in OpenAPI?', options: ['Inside every operation', 'Under components/responses and referenced with $ref', 'In the servers section', 'In info'], answer: 1, explain: 'components hold reusable definitions that operations reference with $ref.' },
    hints: [
      `<p>Start with paths → /orders → post, then fill parameters, requestBody and responses.</p>`,
      `<p>The header goes in parameters with in: header and required: true. Success response needs a headers block with Location.</p>`,
      `<p>Put Problem schema and Problem response under components and reference them from 409 and 422.</p>`
    ],
    solution: {
      approach: `<p>Define the operation with <code>operationId: createOrder</code>, a required header parameter <code>Idempotency-Key</code> of format uuid, and a request body schema with <code>cartId</code> (required, uuid) and <code>note</code> (maxLength 200). Responses: 201 with a <code>Location</code> header and an Order schema; 409 for a request still in progress or a cart already ordered; 422 for validation or key-reuse-with-different-body; both reference a shared <code>Problem</code> response whose content type is <code>application/problem+json</code>. Reusable parts live under components so every operation shares one error shape, generated clients get typed errors, and contract tests can verify the real server against the schema.</p>`,
      code: { lang: 'yaml', code: `paths:
  /orders:
    post:
      operationId: createOrder
      summary: Place an order from a cart (idempotent with Idempotency-Key)
      parameters:
        - name: Idempotency-Key
          in: header
          required: true
          schema: { type: string, format: uuid }
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [cartId]
              properties:
                cartId: { type: string, format: uuid }
                note: { type: string, maxLength: 200 }
      responses:
        '201':
          description: Order created
          headers:
            Location: { schema: { type: string } }
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Order' }
        '409': { $ref: '#/components/responses/Problem' }
        '422': { $ref: '#/components/responses/Problem' }
components:
  responses:
    Problem:
      description: RFC 9457 problem details
      content:
        application/problem+json:
          schema: { $ref: '#/components/schemas/Problem' }
  schemas:
    Order:
      type: object
      properties:
        id: { type: integer }
        status: { type: string, enum: [PENDING, PAID, SHIPPED] }
    Problem:
      type: object
      required: [title, status]
      properties:
        title: { type: string }
        status: { type: integer }
        detail: { type: string }` },
      complexity: `<p>Documentation exercise: the cost is writing the spec once; it pays back in generated clients, docs and CI checks.</p>`
    }
  });

  practice.push({
    title: 'Find the Bugs in This Cursor Implementation',
    level: 'Medium', tags: ['pagination', 'code review', 'security'], companies: ['Meta', 'Datadog'],
    statement: `<p>Review this design: cursor = base64 of the string <code>"SELECT * FROM posts WHERE created_at &lt; 1002 ORDER BY created_at DESC LIMIT 20"</code>, the server decodes it and runs it. Sorting is by <code>created_at</code> only, and <code>next</code> is returned whenever the page is full. List at least five problems and fix each.</p>`,
    constraints: `Posts have many equal timestamps; the cursor is returned to untrusted clients.`,
    example: `<p>Problem: a client can edit the cursor to <code>... ; DROP TABLE posts</code> → ${H.c('r', 'SQL injection')}. Fix: cursor holds only values, signed, used as bind parameters.</p>`,
    brute: { why: `<p>The cursor carries SQL, so it is both an injection hole and a schema leak. Timestamp-only ordering skips or repeats tied rows, and "full page means next exists" returns an empty last page.</p>` },
    mcq: { q: 'Why must a cursor be treated as untrusted input?', options: ['Clients can modify or forge it', 'It is too long', 'It is always encrypted', 'Browsers block it'], answer: 0, explain: 'Anything the client holds can be edited. Validate, sign and use only as bind parameters.' },
    hints: [
      `<p>Look at what is inside the cursor, what it orders by, and how hasMore is decided.</p>`,
      `<p>Cursor should hold only sort-key values plus a version, never SQL. Add id as tie-breaker. Fetch limit+1 to detect more.</p>`,
      `<p>Also bind the cursor to the filter and sort it was issued for, sign it with HMAC, cap limit, and return 400 for invalid cursors.</p>`
    ],
    solution: {
      approach: `<p>Problems and fixes: (1) The cursor contains SQL: injection and schema leak. Store only <code>{v, createdAt, id}</code> and pass them as bind parameters. (2) No signature: clients can forge cursors to read arbitrary positions; add an HMAC (key from configuration) and reject mismatches with 400. (3) Ordering by created_at alone is not total: rows with equal timestamps are skipped or repeated; order by (created_at, id) and compare with a row value. (4) "Next if the page is full" yields an empty final page; fetch limit+1 rows to know hasMore exactly. (5) The cursor is not tied to the filter/sort it was created for, so replaying it with another sort returns garbage; include a hash of the query shape and verify it. (6) No cap on limit: enforce a maximum such as 100. (7) No versioning of the cursor format, so changing it later breaks in-flight clients; include a version. (8) Cursors never expire; consider a TTL if they encode snapshot state.</p>`,
      complexity: `<p>Each page remains O(log N + page size); HMAC verification is O(cursor length).</p>`,
      followUps: ['How would you make cursors survive a deploy that changes the sort?', 'Where should the signing key live and how is it rotated?']
    }
  });

  /* =====================================================================
     PRACTICE — Hard
     ===================================================================== */
  practice.push({
    title: 'Design the Idempotency Layer for a Payments API',
    level: 'Hard', tags: ['idempotency', 'concurrency', 'payments'], companies: ['Stripe', 'PayPal', 'Razorpay'],
    statement: `<p>Design the server side of <code>POST /payments</code> with <code>Idempotency-Key</code>. Cover: storage and atomic claim, concurrent duplicates, same key with a different body, crash between charging the card and saving the response, key scope and TTL, what is replayed (including errors), and what you pass to the downstream card network.</p>`,
    constraints: `5,000 payments/s peak; retries within 24 h; the card network is an external API that may time out; no double charges ever.`,
    example: `<p>Timeline: request 1 claims key K and charges; the response is lost; request 2 with K arrives ${H.c('g', 'after completion → replay the stored 201')}; request 3 with K while request 1 still runs → ${H.c('y', '409 in progress')}; request 4 with K and another amount → ${H.c('r', '422')}.</p>`,
    brute: { why: `<p>"Look up the key, if missing charge, then save" has a race: two concurrent retries both see no key and both charge. Saving the response only after charging also loses the key if the process crashes in between, so a retry charges again.</p>` },
    mcq: { q: 'Which operation makes the claim of a key safe under concurrency?', options: ['SELECT then INSERT', 'An atomic insert with a unique constraint (or SET NX) that only one caller can win', 'A synchronized getter in the client', 'Retrying the INSERT in a loop'], answer: 1, explain: 'Atomicity is provided by the store: exactly one concurrent insert of the same key succeeds.' },
    hints: [
      `<p>The key row must exist before any side effect, and creating it must be atomic.</p>`,
      `<p>Store state (IN_PROGRESS, COMPLETED), a fingerprint of the request, the response, and a timestamp. Scope by account.</p>`,
      `<p>For crashes: pass your key to the card network as its idempotency key, and run claim + business write + response save in one DB transaction where possible; a recovery job resolves stuck IN_PROGRESS rows by querying the network.</p>`
    ],
    solution: {
      approach: `<p>Table <code>idempotency_keys(account_id, key, fingerprint, state, response_status, response_body, created_at)</code> with a unique index on (account_id, key). Step 1: <code>INSERT ... state=IN_PROGRESS</code>; if it conflicts, read the row. COMPLETED with the same fingerprint: replay the stored status and body (including 4xx results, with an Idempotency-Replayed header). Different fingerprint: 422, a client bug. IN_PROGRESS: 409 with Retry-After (or wait briefly). Step 2: the winner calls the card network passing the same key as the network's own idempotency key, so even if our process dies after the charge, a retry reaches the network with the same key and gets the original result instead of a second charge. Step 3: save response and set COMPLETED, in the same transaction as the local payment row. A reaper job finds IN_PROGRESS rows older than a timeout, asks the network for the outcome by key and completes or releases them. Keep keys 24-72 h, then purge. Never cache 5xx caused by infrastructure failure as final; release the key so the client can retry. Shard by account to keep the unique index hot and small.</p>`,
      complexity: `<p>One indexed insert and one indexed read per request: O(log N). Storage is bounded by rate x TTL x row size (5,000/s x 86,400 s is about 430M rows/day, so use TTL partitions and drop whole partitions).</p>`,
      followUps: ['What if the idempotency store is down?', 'How do you test the crash window deterministically?']
    }
  });

  practice.push({
    title: 'Design an API for a Long-Running Export Job',
    level: 'Hard', tags: ['async', '202', 'api design'], companies: ['Google', 'Salesforce', 'Dropbox'],
    statement: `<p>Users request a CSV export of up to 50M rows that takes 1-20 minutes. Design the HTTP API: starting the job, polling, cancelling, fetching the result, error reporting, retries (idempotency), expiry of results, and how clients avoid hammering the status endpoint.</p>`,
    constraints: `No request may block longer than 30 s; jobs can fail halfway; results are large and must not be proxied through the API servers.`,
    example: `<p><code>POST /exports</code> → ${H.c('g', '202 Accepted')} + <code>Location: /exports/77</code> + <code>Retry-After: 5</code>. <code>GET /exports/77</code> → status RUNNING / SUCCEEDED with a signed download URL.</p>`,
    brute: { why: `<p>Doing the export inside the POST handler holds a connection for minutes: gateways time out at 30-60 s, the client retries and starts a second export, and a deploy kills the job. Polling in a tight loop floods the API.</p>` },
    mcq: { q: 'What should POST /exports return when the job is queued?', options: ['200 with the file', '202 Accepted with a Location to the job resource', '201 with the CSV', '204'], answer: 1, explain: '202 means accepted for processing; the Location header points to a resource that reports progress.' },
    hints: [
      `<p>Turn the job into a resource with its own lifecycle: QUEUED, RUNNING, SUCCEEDED, FAILED, CANCELLED.</p>`,
      `<p>POST returns 202 + Location + Retry-After. GET on the job reports state; on success it links to the result.</p>`,
      `<p>Protect everything: Idempotency-Key on POST, DELETE to cancel, signed expiring result URL on object storage, rate limits and Retry-After on polling.</p>`
    ],
    solution: {
      approach: `<p><code>POST /exports</code> with the filter body and an <code>Idempotency-Key</code> creates a job row and enqueues it; reply <code>202 Accepted</code>, <code>Location: /exports/77</code> and <code>Retry-After: 5</code>. <code>GET /exports/77</code> returns <code>{status, progress, createdAt, error?}</code> plus <code>_links</code>: while RUNNING a <code>cancel</code> link; on SUCCEEDED a <code>download</code> link to a short-lived signed URL on object storage (S3 style) so bytes never pass through API servers, and an <code>expiresAt</code>. Cancel with <code>DELETE /exports/77</code> (or POST /exports/77/cancellation): idempotent, 202 if the worker must stop, 204 when done. Failures are reported as a problem+json inside the job resource (status FAILED) rather than as an HTTP error on GET, because the GET itself succeeded. Workers checkpoint progress so a crash resumes. Polling clients obey Retry-After and back off; optionally offer a webhook on completion (signed callbacks) or SSE. Results expire after a few days and the job answers 410 Gone after that. Per-user concurrency limits return 429.</p>`,
      complexity: `<p>API calls are O(1); the heavy work is in workers, scaled independently via the queue. Polling load is bounded by Retry-After.</p>`,
      followUps: ['Webhooks or polling: how do you choose?', 'How do you guarantee a re-run does not produce a duplicate file?']
    }
  });

  practice.push({
    title: 'Search Endpoint at 100M Rows: Filters, Sorts and Cursors',
    level: 'Hard', tags: ['pagination', 'indexes', 'search'], companies: ['Amazon', 'eBay', 'Airbnb'],
    statement: `<p>Design <code>GET /listings</code> for 100M rows with filters (city, price range, bedrooms), user-chosen sorts (price, newest, rating), cursor pagination and fast responses. Cover the query syntax, index strategy, the cursor contents, consistency while listings change, and how you limit abusive queries.</p>`,
    constraints: `p99 under 200 ms; any filter combination is allowed; users sort by 3 fields; results change constantly.`,
    example: `<p><code>GET /listings?city=pune&amp;price_lte=50000&amp;sort=price,-rating&amp;limit=20&amp;cursor=...</code>: filters are allowlisted, sort gets an <code>id</code> tie-breaker, cursor holds (price, rating, id).</p>`,
    brute: { why: `<p>One table with <code>OFFSET</code> pagination and arbitrary ORDER BY forces a sort of every matching row for each request, deep pages scan millions of rows, and free-form sort strings invite SQL injection.</p>` },
    mcq: { q: 'Why do we restrict sort fields to a small allowlist?', options: ['To save JSON bytes', 'Each supported sort needs a matching index and the input must never reach SQL unchecked', 'HTTP forbids more sorts', 'It makes cursors longer'], answer: 1, explain: 'Every supported (filter, sort) shape needs an index to be fast, and an allowlist prevents injection and expensive scans.' },
    hints: [
      `<p>Decide what is exact-match filtering and what is ranged/sorted; indexes follow equality columns first, then the sort column, then the tie-breaker.</p>`,
      `<p>Cursor holds the sort key values of the last row plus id, signed and bound to the filter hash.</p>`,
      `<p>For free-text or many facets use a search engine (Elasticsearch/OpenSearch with search_after and a point-in-time) and accept eventual consistency.</p>`
    ],
    solution: {
      approach: `<p>API: allowlisted filters (<code>city</code>, <code>price_gte/lte</code>, <code>bedrooms</code>) and an allowlisted <code>sort</code> (price, created, rating) with an implicit <code>id</code> tie-breaker; unknown parameters return 400. Pagination is keyset: the cursor is a signed, versioned token holding the last row's sort values plus id and a hash of the filter and sort so it cannot be replayed on a different query. Storage: for each supported sort add a composite index with equality columns first, then the sort column and id, for example <code>(city, price, id)</code> and <code>(city, created_at DESC, id DESC)</code>; the database then seeks directly and stops after limit+1 rows. When combinations explode (many facets, text search), serve from a search engine using <code>search_after</code> and a point-in-time snapshot so pages are consistent while documents change, replicated from the primary through CDC with seconds of lag. Guardrails: maximum limit 100, query timeouts, per-key rate limits (429 + Retry-After), no unbounded OR lists, no total count by default (offer an estimate), cache popular first pages for 30-60 s with Cache-Control and stale-while-revalidate. Monitor slow queries and add indexes only for shapes users actually use.</p>`,
      complexity: `<p>Per request O(log N + limit) with a matching index; memory is constant. The cost is write amplification from several indexes.</p>`,
      followUps: ['How do you page a result sorted by a score that changes?', 'How do you return facet counts cheaply?']
    }
  });

  practice.push({
    title: 'Review and Redesign a Flawed E-commerce API',
    level: 'Hard', tags: ['api design', 'review', 'rest'], companies: ['Amazon', 'Walmart', 'Shopify'],
    statement: `<p>Review this API and list at least eight flaws with fixes:</p>
      <pre>GET  /getOrders?userId=5&amp;page=2
POST /createOrder        -> always 200 {"success":true,"id":9}
POST /orderPay           (retried by the mobile app on timeout)
GET  /orders/9/cancel    -> cancels the order
PUT  /orders/9           body: {"status":"shipped"} (client wipes other fields)
GET  /products           -> returns all 2M products, no limit
Errors: 200 {"success":false,"msg":"java.lang.NullPointerException at ..."}
Auth: ?apiKey=SECRET in the query string
Version: none; field "price" changed from number to string last week</pre>`,
    constraints: `Give a corrected endpoint list and the rules (status codes, headers, versioning) behind each fix.`,
    example: `<p><code>GET /orders/9/cancel</code> → ${H.c('r', 'GET must be safe')}: a link prefetcher could cancel orders. Fix: <code>POST /orders/9/cancellation</code>.</p>`,
    brute: { why: `<p>Patching symptoms one at a time (adding a retry here, a flag there) keeps the verb-style URLs, 200-for-everything responses and unsafe GETs, so every new feature repeats the same mistakes.</p>` },
    mcq: { q: 'What is the most dangerous item in the list?', options: ['Missing version', 'State-changing GET plus API key and stack traces exposed in responses (security)', 'Plural nouns', 'Slow queries'], answer: 1, explain: 'Unsafe GET, secrets in URLs (logged everywhere) and leaked stack traces are security problems, not style issues.' },
    hints: [
      `<p>Group the flaws: URL design, method semantics, status codes, idempotency, pagination, security, evolution.</p>`,
      `<p>Look for unsafe GET, verbs in paths, 200 for errors, missing idempotency on payment, unbounded list, secret in URL, leaked internals, breaking change without version.</p>`,
      `<p>Write the new endpoint list first (GET /orders, POST /orders, POST /orders/{id}/payments with Idempotency-Key, POST /orders/{id}/cancellation, PATCH /orders/{id}, GET /products?limit&amp;cursor) and then the cross-cutting rules.</p>`
    ],
    solution: {
      approach: `<p>Flaws and fixes: (1) Verbs in URLs (getOrders, createOrder, orderPay): use nouns and methods, <code>GET /orders</code>, <code>POST /orders</code>, <code>POST /orders/{id}/payments</code>. (2) <code>userId</code> in the query lets users read others' orders: derive the user from the token and authorise per resource (IDOR). (3) Offset <code>page=2</code>: use cursor pagination with a capped limit. (4) <code>POST /createOrder</code> returns 200: use 201 with Location. (5) Payment is retried by the app and can double charge: require Idempotency-Key and dedupe. (6) <code>GET /orders/9/cancel</code> changes state: unsafe GET; use <code>POST /orders/9/cancellation</code> (409 if already shipped). (7) PUT with a partial body wipes fields: use PATCH (merge patch) for partial updates and If-Match for concurrency; also status changes should be validated by a state machine. (8) <code>GET /products</code> returns everything: paginate, filter, cap size. (9) Errors as 200 with stack traces: proper 4xx/5xx with problem+json, log internals and return a traceId. (10) API key in the query string ends up in logs and referrers: move it to the Authorization header, use short-lived tokens, rotate the leaked key. (11) Breaking change without versioning: introduce /v1, tolerant-reader rules, OpenAPI diff in CI, expand-and-contract for price (keep number, add priceMoney). (12) Add caching headers (ETag, Cache-Control) on catalogue reads and rate limiting with 429.</p>`,
      complexity: `<p>Review exercise; no algorithmic complexity. Effort is dominated by migrating existing clients, hence versioning and deprecation.</p>`,
      followUps: ['Which fixes can ship without a new version?', 'How do you prioritise: security first, then data loss, then style?']
    }
  });

  /* =====================================================================
     QUIZ
     ===================================================================== */
  quiz.push({ q: 'Which URL best follows REST resource-modelling rules?', options: ['POST /createBook', 'GET /getBook?id=7', 'POST /books', 'POST /books/create'], answer: 2, explain: 'Plural noun for the collection; the method POST already means "create".' });
  quiz.push({ q: 'Which HTTP method is NOT idempotent by definition?', options: ['PUT', 'DELETE', 'POST', 'GET'], answer: 2, explain: 'POST may create a new resource every time. PUT, DELETE and GET are idempotent.' });
  quiz.push({ q: 'A client retries POST /payments after a timeout with the same Idempotency-Key. The first attempt finished. What should the server do?', options: ['Charge again', 'Replay the stored response without charging again', 'Return 404', 'Delete the key and start over'], answer: 1, explain: 'The key maps to the stored result, so the retry returns the same answer and the card is charged once.' });
  quiz.push({ q: 'The same Idempotency-Key arrives with a different request body. Best response?', options: ['Replay the old result silently', 'Process it as a new request', '422 (or 400): the key was reused for a different request', '500'], answer: 2, explain: 'A key stands for one intention. A different body is a client bug and must be rejected.' });
  quiz.push({ q: 'Applying the JSON Merge Patch {"a": null, "b": {"c": 1}} to {"a": 5, "b": {"d": 2}} gives:', options: ['{"a":null,"b":{"c":1}}', '{"b":{"c":1,"d":2}}', '{"b":{"c":1}}', '{"a":5,"b":{"c":1,"d":2}}'], answer: 1, explain: 'null deletes a; b is an object so it merges: c is added and d stays.' });
  quiz.push({ q: 'A valid user requests /orders/9 that belongs to someone else, and you want to avoid revealing which orders exist. Return:', options: ['200', '401', '403 with the owner name', '404 Not Found'], answer: 3, explain: '404 is indistinguishable from a missing order, preventing enumeration.' });
  quiz.push({ q: 'Well-formed JSON, but age is -3 and the API validates business rules. Most precise status?', options: ['400', '422', '409', '500'], answer: 1, explain: '422 means syntax OK, content semantically invalid. (400 is acceptable if your team uses it for all validation, but be consistent.)' });
  quiz.push({ q: 'Why does keyset pagination beat OFFSET on deep pages?', options: ['It returns fewer columns', 'It seeks via an index to the bookmark instead of scanning and discarding skipped rows', 'It disables sorting', 'It caches all pages'], answer: 1, explain: 'OFFSET is O(offset) because skipped rows are read; keyset is a range scan starting at the bookmark.' });
  quiz.push({ q: 'Sorting by created_at where many rows share the same value. What makes the cursor correct?', options: ['Use <= instead of <', 'Add a unique tie-breaker such as id to the sort and cursor', 'Round timestamps', 'Use OFFSET in the cursor'], answer: 1, explain: '(created_at, id) is a total order, so the bookmark identifies exactly one position.' });
  quiz.push({ q: 'Which change is breaking for existing clients?', options: ['Adding an optional query parameter', 'Adding a new field to a response', 'Making an optional request field required', 'Adding a new endpoint'], answer: 2, explain: 'Old clients do not send the newly required field and start failing.' });
  quiz.push({ q: 'What does Cache-Control: no-cache mean?', options: ['Never store the response', 'Store it but revalidate with the origin before each reuse', 'Cache for zero seconds and delete', 'Only CDNs may cache it'], answer: 1, explain: 'no-store is the directive that forbids storing.' });
  quiz.push({ q: 'A cache holds ETag "v1" and the stale copy is requested. The origin still has "v1". What flows over the network?', options: ['GET + If-None-Match: "v1", then 304 with no body', 'GET, then 200 with full body', 'PUT + If-Match', 'Nothing'], answer: 0, explain: 'Conditional GET returns 304 Not Modified, saving the body transfer.' });
  quiz.push({ q: 'A PUT with If-Match: "v2" arrives but the stored ETag is "v3". Status?', options: ['304', '409 always', '412 Precondition Failed', '428'], answer: 2, explain: '412 means the precondition did not hold. 428 is for a missing required precondition.' });
  quiz.push({ q: 'What is the main benefit of HATEOAS links such as ship and refund in an order response?', options: ['They shrink the JSON', 'The server tells clients which actions are currently allowed, keeping workflow rules in one place', 'They replace authentication', 'They make GET cacheable'], answer: 1, explain: 'State-dependent links expose valid transitions without clients re-implementing business rules.' });

  /* =====================================================================
     INTERVIEW
     ===================================================================== */
  interview.push({
    q: 'How do you decide what the resources and URLs of a new REST API should be?',
    level: 'B',
    a: `<p>I start from the business nouns in the user stories (book, member, loan; product, order, payment), not from the screens or database tables. Each noun becomes a plural collection (<code>/books</code>) and an item (<code>/books/{id}</code>). Events that leave a record become resources too: "borrow" creates a Loan, "pay" creates a Payment. I nest only when a child cannot exist without its parent and stop at two levels, exposing children by id at top level. Query strings are for filtering, sorting and paging. Then I attach the five methods and status codes, and write it down in OpenAPI.</p>`,
    followUps: ['How do you model an action that is not CRUD, like "recalculate"?', 'When do you choose singular nouns?']
  });
  interview.push({
    q: 'Explain safe versus idempotent methods, and which of GET, PUT, DELETE, POST, PATCH are which.',
    level: 'B',
    a: `<p>Safe means the method does not change server state (GET, HEAD, OPTIONS). Idempotent means repeating the request leaves the server in the same state as doing it once (GET, HEAD, OPTIONS, PUT, DELETE). POST is neither, because each call can create a new resource. PATCH is not guaranteed idempotent: a merge patch with absolute values behaves idempotently, a patch like "increment by one" does not. Idempotency is about state, not responses: a second DELETE may return 404 and still be idempotent. It matters because clients, proxies and gateways retry idempotent methods automatically after timeouts.</p>`,
    followUps: ['Why can a safe method still write a log line?', 'How do you make POST safe to retry?']
  });
  interview.push({
    q: 'A mobile client times out calling POST /payments. How do you prevent double charging?',
    level: 'I',
    a: `<p>I use an Idempotency-Key header generated once per user intention (one UUID per click, reused across retries). The server atomically claims the key (unique constraint or SET NX) with state IN_PROGRESS and a fingerprint of the request, performs the charge, stores the response and marks it COMPLETED. A retry with a completed key replays the stored response; a retry while in progress gets 409; the same key with a different body gets 422. I pass the key to the downstream card network too, so a crash between the charge and saving the result cannot double charge. Keys are scoped per account and expire after about 24 hours. The client retries with exponential backoff and jitter.</p>`,
    followUps: ['What if the key store is unavailable?', 'Which responses do you cache: errors too?']
  });
  interview.push({
    q: 'PUT versus PATCH: when do you use each, and what are the pitfalls?',
    level: 'B',
    a: `<p>PUT replaces the whole resource at a URL and is idempotent; fields missing from the body are removed or reset. PATCH sends only changes. Use PUT when the client owns the complete state (form save, import, create-at-known-URL) and PATCH for partial edits and toggles. Pitfall with PUT: older clients that don't know a new field wipe it. Pitfalls with PATCH: it is not automatically idempotent, merge patch cannot set null or change one array element, and you must validate the merged result rather than the patch. In both cases protect against lost updates with ETag and If-Match and never bind the body straight onto a database entity.</p>`,
    followUps: ['JSON Merge Patch versus JSON Patch?', 'How do you clear a field with each?']
  });
  interview.push({
    q: 'Explain JSON Merge Patch (RFC 7396). What can it not do?',
    level: 'I',
    a: `<p>A merge patch is a JSON object shaped like the part of the document you want to change. Applying it: if the patch is not an object it replaces the target; for an object, each key is processed in turn: null deletes the key, an object merges recursively, and any other value replaces. It is simple and idempotent when values are absolute. Limits: arrays are replaced wholesale so you cannot append or edit one element; null means delete, so you cannot store an explicit null; and there are no conditional operations. For those, use JSON Patch (RFC 6902), which has add, remove, replace, move, copy and test with JSON Pointer paths and is applied atomically.</p>`,
    followUps: ['How do you block prototype pollution in a JavaScript implementation?', 'How would you generate a merge patch from two documents?']
  });
  interview.push({
    q: 'How do you choose between 400, 401, 403, 404, 409 and 422?',
    level: 'I',
    a: `<p>I follow a decision order. Are you authenticated? If not (missing, bad or expired token): 401 with WWW-Authenticate. Allowed to do this? If not: 403. Does the resource exist (and may the caller know it exists)? If not: 404, and I use 404 instead of 403 for other people's private resources to avoid leaking existence. Is the request well formed (JSON parses, types right)? If not: 400. Do the values satisfy the rules? If not: 422 with a field error list. Does a valid request clash with the current state (duplicate email, version moved, slot booked)? 409. Then success: 200, 201 with Location, 202 for async work, 204 for no body. Every error carries a problem+json body.</p>`,
    followUps: ['400 versus 422: do you really need both?', 'What status for a rate limit and for maintenance?']
  });
  interview.push({
    q: 'Offset versus cursor pagination: trade-offs and when would you pick each?',
    level: 'I',
    a: `<p>Offset (page and size) is simple and allows jumping to page N and showing totals, but the database must read and discard all skipped rows, so deep pages are slow, and results drift when rows are inserted or deleted (duplicates and gaps). Cursor (keyset) pagination encodes the last row's sort key and queries "rows after this key" through an index, so cost is independent of depth and the list is stable, but you can't jump to arbitrary pages and totals are costly. I use offset for small admin tables and cursors for feeds, large datasets and exports. The sort must be a total order, so I add a unique tie-breaker, and the cursor is opaque, versioned and signed.</p>`,
    followUps: ['How do you page backwards?', 'How do you return a total count cheaply?']
  });
  interview.push({
    q: 'How would you implement sorting and filtering safely in a list endpoint?',
    level: 'I',
    a: `<p>I define the allowed filters and sort fields explicitly (an allowlist mapping public names to columns) and reject anything else with 400, which also catches typos that would otherwise silently return wrong data. Values are always passed as bind parameters, never concatenated. Sort syntax like <code>sort=-rating,title</code> is parsed into column and direction pairs, and a unique tie-breaker (id) is appended so pagination is stable. Each supported filter and sort combination must have a suitable composite index, otherwise the endpoint becomes a full-table scan; that is also why I limit sorts to a small set. I cap page size and document the syntax in OpenAPI.</p>`,
    followUps: ['How do you support OR conditions and ranges?', 'What changes if filters come from free text search?']
  });
  interview.push({
    q: 'How do you version a REST API, and what is a breaking change?',
    level: 'I',
    a: `<p>A breaking change is one where a correct old client can fail: removing or renaming fields or endpoints, making optional input required, changing types or meaning, tightening validation. Adding endpoints, optional parameters and response fields is non-breaking if clients follow the tolerant-reader rule. I prefer additive evolution and expand-and-contract migrations, and use URI major versions (<code>/v1</code>, <code>/v2</code>) only for real breaks, with adapters at the edge over one core model. Header or media-type versioning works but needs <code>Vary</code> for caches. I publish a deprecation policy: Deprecation and Sunset headers, usage metrics per client, and 410 after the sunset date. In CI an OpenAPI diff catches accidental breaks.</p>`,
    followUps: ['Explain date-based versioning like Stripe.', 'How long do you keep old versions?']
  });
  interview.push({
    q: 'What is HATEOAS and do you use it?',
    level: 'A',
    a: `<p>HATEOAS means responses include hypermedia links so the client discovers what it may do next instead of hard-coding URLs, the top of the Richardson maturity model. For example an order in state PAID carries ship and refund links, and a PENDING order carries pay and cancel; the server owns the workflow and clients just render the available actions. In practice I use a light version everywhere (Location on creation, self and next links, related-collection links) because it is cheap and lets me move URLs later, and the full version for state-machine-heavy resources. Most clients are generated from OpenAPI against fixed URLs, so full hypermedia is rare. Links are advice, not security: the server must still enforce rules.</p>`,
    followUps: ['HAL versus JSON:API?', 'Does a missing link mean the action is forbidden?']
  });
  interview.push({
    q: 'What is the role of OpenAPI in your workflow?',
    level: 'I',
    a: `<p>OpenAPI is the contract. For public or multi-team APIs I go contract-first: write the spec, review it in a pull request with consumers, then generate server stubs, client SDKs, a mock server and docs from it. Internally, code-first generation (springdoc) is faster, but the generated spec is still committed and reviewed. CI runs a linter (Spectral) for style and security rules, a breaking-change diff against main (oasdiff), and contract tests that fire generated requests at a running instance to verify real responses match the schema. Good operationId, summary, description and examples matter, because docs, SDKs and LLM tool wrappers all consume them.</p>`,
    followUps: ['How do you prevent spec drift?', 'What does OpenAPI 3.1 change relative to 3.0?']
  });
  interview.push({
    q: 'Explain Cache-Control and ETag. How does a conditional GET work?',
    level: 'I',
    a: `<p>Cache-Control controls freshness: max-age lets browsers and CDNs reuse a response without contacting the origin; s-maxage targets shared caches; private restricts storage to the browser; no-cache means store but revalidate every time; no-store forbids storing; immutable suits fingerprinted assets. An ETag is a validator, a fingerprint of the resource version. When a stale copy is needed, the cache sends If-None-Match with its ETag; if unchanged the origin returns 304 Not Modified with no body, otherwise 200 with the new body and ETag. I derive ETags from a version column so a 304 needs no serialisation, and add Vary for any header that changes the representation.</p>`,
    followUps: ['Strong versus weak ETags?', 'How do you purge a CDN after an update?']
  });
  interview.push({
    q: 'How do ETags help with concurrent updates, and what status codes are involved?',
    level: 'A',
    a: `<p>It is optimistic concurrency over HTTP. GET returns an ETag. The client sends it back as If-Match on PUT, PATCH or DELETE. The server compares it with the current version inside the same atomic operation (for example an UPDATE with WHERE version = ?). If it matches, the write succeeds and a new ETag is returned. If not, the server responds 412 Precondition Failed, and the client re-reads, merges and retries. If the API requires the header and it is missing, the answer is 428 Precondition Required. If-None-Match: * on PUT gives create-only semantics. It avoids lost updates without holding locks, and it composes with idempotency: a retried request carrying an old tag fails with 412 instead of applying twice.</p>`,
    followUps: ['When is 409 better than 412?', 'What if the resource has no version column?']
  });
  interview.push({
    q: 'Design the API for a long-running operation such as generating a large report.',
    level: 'A',
    a: `<p>Make the job a resource. POST /reports with an Idempotency-Key returns 202 Accepted, a Location header pointing to /reports/{id}, and Retry-After. GET on the job returns its state (QUEUED, RUNNING, SUCCEEDED, FAILED, CANCELLED), progress, an error problem document if it failed and, when finished, a link to a signed, expiring download URL on object storage so large bytes bypass the API servers. DELETE cancels it. Clients poll with backoff honouring Retry-After, or receive a signed webhook. Workers pull from a queue and checkpoint progress, results expire (410 afterwards), and per-user concurrency is limited with 429. The 30-second request limit is never exceeded because the heavy work is off the request path.</p>`,
    followUps: ['Webhooks versus polling versus SSE?', 'How do you retry a failed job safely?']
  });

  /* =====================================================================
     REGISTER
     ===================================================================== */
  registerModule({
    id: 'be04',
    title: 'HTTP Deep Dive & API Design',
    intro: `<p>You can already build a working REST endpoint. This module teaches you to design APIs that other people can <b>safely depend on</b>: resources that make sense, requests that can be retried without double charges, updates that do not wipe data, status codes that tell the truth, pages that stay stable, versions that do not break clients, and caching that makes everything faster. Every idea comes with a picture, runnable code and the exact phrases interviewers use.</p>`,
    goals: [
      'Model a library or e-commerce domain as resources, URLs and methods without verbs in paths',
      'Decide the safety and idempotency of every HTTP method and build an Idempotency-Key store that prevents duplicate charges',
      'Choose between PUT and PATCH, and apply JSON Merge Patch and JSON Patch correctly',
      'Pick the right status code for edge cases and return RFC 9457 problem+json errors',
      'Design offset and cursor pagination, plus safe filtering and sorting',
      'Evolve an API with versioning, deprecation headers, HATEOAS links and an OpenAPI contract',
      'Use Cache-Control, ETag, If-None-Match (304) and If-Match (412) for caching and lost-update protection'
    ],
    prereqs: `Backend modules 1-3 (How Backends Work &amp; HTTP Basics, Your First REST API, Databases from Code). Comfort reading JSON, basic SQL and a little Java or JavaScript.`,
    hours: 14,
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
