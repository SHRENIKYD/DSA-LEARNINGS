(function () {
var topics = [], practice = [], quiz = [], interview = [];

/* ---------- shared tiny helpers for visualizers ---------- */
function bx(id, label, x, y) { return { id: id, label: label, x: x, y: y, shape: 'box' }; }
function words(input, min, max, fallback) {
  var a = String(input === undefined ? fallback : input).trim().split(/[\s,]+/).filter(function (s) { return s.length; });
  if (a.length < min || a.length > max) throw new Error('Enter ' + min + ' to ' + max + ' words separated by spaces');
  return a.map(function (s) { return s.slice(0, 12); });
}
function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function spread(n, lo, hi) { var r = []; for (var i = 0; i < n; i++) r.push(n === 1 ? (lo + hi) / 2 : lo + i * (hi - lo) / (n - 1)); return r; }

/* =====================================================================
   TOPIC 1 — Decomposition
   ===================================================================== */
topics.push({
  title: 'Why Microservices? Decomposition by Business Capability & Subdomain',
  analogy: `<p>Picture one giant restaurant kitchen where one chef team cooks starters, pizza, desserts and also washes the dishes, all on one shared stove. It works while the restaurant is small. When 200 people order at once, one burnt pan stops <b>everything</b>, and nobody can change the stove without asking everyone.</p>
    <p>Microservices are like a <b>food court</b>: the pizza stall, the juice bar and the dessert counter each have their own cook, own fridge and own cash drawer. They agree on one rule: "customers walk between stalls; stalls never reach into each other's fridge". A broken juice machine does not close the pizza stall.</p>`,
  explain: `<p><b>🟢 The plain idea.</b> A <b>monolith</b> is one program, deployed as one unit, usually with one database. A <b>microservice system</b> is many small programs, each deployed on its own, each owning its own data, talking over the network. The hard part is not "make small programs" — it is <b>deciding where to cut</b>.</p>
    <p>Two time-tested ways to find the cuts:</p>
    <ul>
      <li><b>By business capability</b> — "what does the business <i>do</i>?" An online shop does: browse the catalog, manage the cart, take orders, charge payments, ship parcels, send notifications. Each verb-ish area becomes a candidate service.</li>
      <li><b>By subdomain (Domain-Driven Design)</b> — split the business into <i>bounded contexts</i>, areas where words mean one precise thing. "Product" means a photo-and-description in Catalog but a stock-keeping unit with weight in Shipping. Different meaning = different model = different service.</li>
    </ul>
    <p><b>The golden rule: each service owns its data.</b> No other service may read its tables. If Orders needs a customer's name, it asks the Customer service (or keeps its own copy built from events). A shared database turns your "microservices" into a <i>distributed monolith</i> — all the pain of the network, none of the independence.</p>
    ${H.table(['Capability', 'Owns (data)', 'Changes how often?', 'Scales with…'], [
      ['Catalog', 'products, prices, images', 'weekly (marketing)', 'browse traffic (huge)'],
      ['Cart', 'cart items per user', 'rarely', 'active shoppers'],
      ['Orders', 'orders, order lines, state', 'monthly (rules)', 'checkouts'],
      ['Payments', 'payment attempts, refunds', 'rarely, but must be audited', 'checkouts'],
      ['Shipping', 'parcels, carrier labels', 'when carriers change', 'orders shipped'],
      ['Notifications', 'templates, delivery log', 'daily (copy edits)', 'events fired']
    ])}
    <p><b>How small is "micro"?</b> Small enough that one team (5–9 people, the "two-pizza team") can understand and own it, big enough that it does one business job end to end. "One service per database table" is far too small — you just rebuilt a slow ORM over HTTP.</p>
    <p><b>What you gain:</b> independent deploys, independent scaling, fault isolation, teams moving without meetings, a free choice of tools per service. <b>What you pay:</b> network failures, no cross-service ACID transactions, harder debugging and testing, operational overhead (CI/CD, monitoring, tracing for every service). That bill is why Topic 10 asks "when NOT to?".</p>`,
  clues: [
    '"Monolith deploys take 3 hours / any team change needs everyone\'s sign-off" → organisational scaling pain, microservices (or a modular monolith) is the cure',
    '"Different parts have wildly different load (browse 100× checkout)" → independent scaling per capability',
    '"One slow module takes the whole app down" → fault isolation / bulkheads',
    '"Teams step on each other\'s code" → Conway\'s law: shape services after teams',
    '"Split this monolith" / "design boundaries" → capability + bounded-context thinking, data per service',
    '"Strangler fig", "incremental migration" → extract one edge capability at a time behind a gateway'
  ],
  code: [
    { lang: 'python', title: 'Seam finder: count calls that would cross a boundary (runnable)', run: true, code: `# Each pair is "module A calls module B" with how many calls per request.
calls = {
    ('orders', 'payments'): 1, ('orders', 'catalog'): 3, ('orders', 'shipping'): 1,
    ('cart', 'catalog'): 4, ('shipping', 'orders'): 2, ('notifications', 'orders'): 1,
    ('payments', 'orders'): 1,
}

def cross_calls(grouping):
    """grouping maps module -> service name. Count calls that leave a service."""
    total = 0
    for (a, b), n in calls.items():
        if grouping[a] != grouping[b]:
            total += n
    return total

modules = sorted({m for pair in calls for m in pair})

# Plan A: one service per module (very fine-grained)
plan_a = {m: m for m in modules}
# Plan B: keep tightly talking modules together: orders+payments are one "checkout" service
plan_b = dict(plan_a)
plan_b['payments'] = 'orders'
# Plan C: everything in one (the monolith)
plan_c = {m: 'monolith' for m in modules}

for name, plan in [('A fine-grained', plan_a), ('B checkout merged', plan_b), ('C monolith', plan_c)]:
    services = len(set(plan.values()))
    print(name.ljust(20), 'services =', services, ' network calls per request =', cross_calls(plan))
# Lower cross-calls with a sensible number of services = better seams.` }
  ],
  codeTitle: ['Python (runnable) — measure the cost of a boundary'],
  viz: {
    title: 'Splitting a monolith into services (each owns its data)',
    input: 'catalog cart orders payments shipping',
    inputLabel: 'Capabilities (3-5 words, space separated)',
    gen: function (input) {
      var caps = words(input, 3, 5, 'catalog cart orders payments shipping');
      var xs = spread(caps.length, 14, 86), frames = [], i;
      function row(yS, yD, withDb, sharedDb) {
        var ns = [], es = [];
        for (i = 0; i < caps.length; i++) { ns.push(bx('s' + i, caps[i], xs[i], yS)); if (withDb) { ns.push(bx('d' + i, caps[i] + ' DB', xs[i], yD)); es.push(['s' + i, 'd' + i]); } }
        if (sharedDb) { ns.push(bx('db', 'ONE shared DB', 50, yD)); for (i = 0; i < caps.length; i++) es.push(['s' + i, 'db']); }
        return { ns: ns, es: es };
      }
      frames.push({ narr: '<b>Day 0: the monolith.</b> One program, one deployable file, one database. Every feature lives inside the same box, so one bug or one deploy touches everything.', parts: [{ type: 'graph', directed: true, height: 60, nodes: [bx('c', 'Browser', 50, 6), bx('m', 'Monolith (all features)', 50, 29), bx('db', 'ONE shared DB', 50, 53)], edges: [['c', 'm', 'HTTP'], ['m', 'db', 'SQL']], hl: { m: 'cur' } }] });
      var r = row(26, 52, false, true), h = {}, eh = {};
      for (i = 0; i < caps.length; i++) eh['s' + i + '-db'] = 'bad';
      frames.push({ narr: '<b>Step 1: find the seams.</b> Ask "what does the business do?" and name each capability. But look: they all still read and write the <i>same tables</i>. That shared database is hidden coupling — a column rename in one capability can break all others.', parts: [{ type: 'graph', directed: false, height: 60, nodes: r.ns, edges: r.es, ehl: eh, tags: { db: 'tight coupling' } }] });
      r = row(26, 52, true, false); eh = {};
      for (i = 0; i < caps.length; i++) eh['s' + i + '-d' + i] = 'ok';
      frames.push({ narr: '<b>Step 2: split the data.</b> Every capability gets its own database (or schema nobody else may touch). Now a team can change its tables freely — the only way in is the service\'s API.', parts: [{ type: 'graph', directed: false, height: 60, nodes: r.ns, edges: r.es, ehl: eh }] });
      var ns = r.ns.concat([bx('gw', 'API Gateway', 50, 5)]), es = r.es.slice(), gh = {};
      for (i = 0; i < caps.length; i++) es.push(['gw', 's' + i]);
      frames.push({ narr: '<b>Step 3: one front door.</b> Clients should not know about 5 services. An <b>API gateway</b> receives every request and forwards it to the right service (Topic 2).', parts: [{ type: 'graph', directed: true, height: 60, nodes: ns, edges: es, hl: { gw: 'sel' } }] });
      var es2 = es.slice(), ehl2 = {}, lab = '';
      es2 = []; for (i = 0; i < caps.length; i++) es2.push(['gw', 's' + i]); for (i = 0; i < caps.length; i++) es2.push(['s' + i, 'd' + i]);
      var a = Math.min(2, caps.length - 1), b = Math.min(3, caps.length - 1);
      es2.push(['s' + a, 's' + b, 'sync REST']); ehl2['s' + a + '-s' + b] = 'win';
      if (caps.length >= 5) { es2.push(['s' + a, 's4', 'event']); ehl2['s' + a + '-s4'] = 'sel'; }
      frames.push({ narr: '<b>Step 4: services talk.</b> Where one service must wait for another\'s answer (e.g. ' + caps[a] + ' needs ' + caps[b] + ' to confirm) it makes a <b>synchronous call</b>; where it only wants to announce news it publishes an <b>event</b>. These network hops are the price of splitting (Topic 4).', parts: [{ type: 'graph', directed: true, height: 60, nodes: ns, edges: es2, ehl: ehl2 }] });
      var hbad = { gw: 'sel' }; hbad['s' + b] = 'bad';
      var tg = {}; tg['s' + b] = 'down';
      for (i = 0; i < caps.length; i++) if (i !== b) tg['s' + i] = 'still up';
      frames.push({ narr: '<b>Payoff: fault isolation.</b> ' + caps[b] + ' crashed, but the other services keep serving traffic. In the monolith the same bug would have taken the whole shop down. (Pair this with timeouts and circuit breakers so callers do not hang on the dead service.)', parts: [{ type: 'graph', directed: true, height: 60, nodes: ns, edges: es2, hl: hbad, tags: tg }] });
      return frames;
    }
  },
  examples: [
    { title: 'E-commerce monolith → six services', html: `<p>Our shop monolith has packages <code>catalog</code>, <code>cart</code>, <code>orders</code>, <code>payments</code>, <code>shipping</code>, <code>notifications</code> and one Postgres with 41 tables. Cut by capability:</p>
      ${H.table(['Service', 'Tables it takes with it', 'Public API (sketch)'], [
        ['catalog-svc', 'products, categories, prices', 'GET /products/{id}, GET /products?q='],
        ['cart-svc', 'carts, cart_items', 'PUT /carts/{user}/items'],
        ['orders-svc', 'orders, order_lines, order_status', 'POST /orders, GET /orders/{id}'],
        ['payments-svc', 'payment_attempts, refunds', 'POST /payments, POST /refunds'],
        ['shipping-svc', 'parcels, labels', 'POST /shipments'],
        ['notify-svc', 'templates, delivery_log', 'consumes events, no public API']
      ])}
      <p>The foreign keys that crossed these lines (<code>order_lines.product_id → products.id</code>) become <b>plain ids plus a snapshot</b>: Orders stores the product name and price <i>at the time of purchase</i> — which is the correct business behaviour anyway.</p>` },
    { title: 'Capability vs subdomain: core, supporting, generic', html: `<p>DDD classifies subdomains by how much they matter to winning:</p>
      <ul><li><b class="c-g">Core</b> — your edge (recommendation engine, pricing). Build in-house, best engineers, own service(s).</li>
      <li><b class="c-b">Supporting</b> — needed but not special (order management, inventory). Build simple.</li>
      <li><b class="c-m">Generic</b> — everyone has it (auth, payments gateway, email). <b>Buy or use SaaS</b> (Auth0, Stripe, SES) and wrap it in a thin service.</li></ul>
      <p>Interview tip: saying "payments is generic, so I would wrap a provider rather than build card handling" shows judgement, not just drawing boxes.</p>` },
    { title: 'Strangler fig: migrate without a big bang', html: `<p>Do <b>not</b> rewrite everything. Put a gateway/proxy in front of the monolith, then peel off one capability at a time:</p>
      <ol><li>Pick an <i>edge</i> capability with few inbound dependencies (Notifications, Reviews — not Orders).</li>
      <li>Build the new service; <b>dual-write or sync data</b> from the monolith while both run.</li>
      <li>Switch the gateway route for that path to the new service (use a % rollout / feature flag).</li>
      <li>Delete the old code and tables once traffic is 100% on the new one. Repeat.</li></ol>
      <p>The monolith shrinks like a tree being slowly wrapped by a strangler fig vine until nothing remains — or until what remains is small and stable enough to leave alone.</p>`, code: { lang: 'yaml', check: false, title: 'Gateway route table during migration (illustrative)', code: `routes:
  - path: /notifications/**   # already extracted
    target: http://notify-svc:8080
  - path: /**                  # everything else still hits the monolith
    target: http://legacy-monolith:8080` } }
  ],
  deepDive: `<p><b>🟣 Where do the real boundaries come from?</b></p>
    <ul>
      <li><b>Conway's law:</b> a system's design mirrors the communication structure of the organisation that builds it. Fight it and you lose. The <i>inverse Conway manoeuvre</i>: reorganise into small autonomous teams first, then let the architecture follow.</li>
      <li><b>Event Storming</b> workshops (sticky notes of domain events: "OrderPlaced", "PaymentCaptured") expose where the language changes — those are bounded-context borders.</li>
      <li><b>Change coupling from git history:</b> files that always change together belong together. If a feature always needs edits in three "separate" services, the cut is wrong.</li>
      <li><b>Transaction boundaries:</b> if two things must be atomic (debit and credit), keep them in one service, one database. Anything that spans services becomes a saga (Topic 5) — expensive, so cut where business invariants are loose.</li>
    </ul>
    <p><b>Smells of a bad decomposition:</b> a "distributed monolith" (services must be deployed together), chatty calls (service A calls B ten times per request), shared database or shared "common-models" library that forces lock-step upgrades, and a God-service named <code>utils-service</code>.</p>
    <p><b>Data you need from another context:</b> options in order of preference: (1) hold just the <i>id</i> and ask when needed; (2) keep a read-only <b>local copy</b> fed by the owner's events (denormalised); (3) pass needed data in the request. Avoid cross-service joins; if a screen truly needs a join, build a composition/read model (CQRS, Topic 7).</p>
    <p><b>Granularity rule of thumb:</b> start with fewer, bigger services (a "modular monolith" or ~5–10 coarse services) and split later when a real pressure appears. Merging services is much harder than splitting them, because by then everyone depends on the network contract.</p>`,
  aiEra: `<p><b>What AI changes:</b> AI assistants can read a 500-file monolith and propose "candidate bounded contexts" by clustering imports, table access and git co-change in minutes. That used to take weeks of archaeology.</p>
    <p><b>Use AI as a partner:</b> paste your table list and package tree and ask <code>Group these into bounded contexts and list every foreign key that would cross a boundary. Do not decide the final cuts.</code> Ask it to generate an Event Storming starter list, or a migration checklist for one extracted capability (routes, data sync, rollback).</p>
    <p><b>Where AI goes wrong:</b> it loves splitting too fine ("one service per entity"), it cannot see your team structure or on-call reality, and it will happily keep a shared database "for now". It also tends to ignore data ownership of reports and batch jobs that quietly join across contexts.</p>
    <p><b>What you must still own:</b> the trade-off call (do we even need microservices?), the transaction boundaries, the team ownership map, and the migration order. Also: if you build <i>AI features</i> (LLM calls, embeddings), treat them as their own service with its own budget, timeout and fallback — a slow model must not freeze checkout.</p>`,
  problems: [
    {
      title: 'Split a Monolith E-commerce App',
      level: 'Medium', tags: ['decomposition', 'DDD', 'boundaries'], companies: ['Amazon', 'Flipkart', 'Shopify'],
      statement: `<p>A monolith shop has these modules: <b>users, catalog, inventory, cart, orders, payments, shipping, reviews, recommendations, notifications</b>, all on one Postgres database with many cross-module foreign keys. Propose a first split into services, say which data each owns, which module you extract <i>first</i>, and which pieces you would leave together.</p>`,
      constraints: `Team of 40 engineers in 6 squads · peak browse traffic is 50× checkout traffic · payment data is regulated · no downtime allowed during migration.`,
      example: `<p>Expected shape of an answer:</p>${H.table(['Service', 'Owns', 'Why separate'], [['catalog+inventory read', 'products, stock view', 'huge read load, scales alone'], ['orders', 'orders, lines, status', 'core business flow'], ['payments', 'attempts, refunds', '<span class="c-r">regulated</span>, isolate PCI scope'], ['notifications', 'templates, log', 'low risk, extract first']])}`,
      brute: { why: `<p>"One service per module and per table, big-bang rewrite." You get ten services plus a shared database, every request becomes 8 network calls, and nothing can be released independently — a distributed monolith that is slower than the original. A big-bang rewrite also freezes feature work for a year.</p>` },
      mcq: { q: 'Which module is the safest FIRST extraction?', options: ['orders — it is the most important', 'notifications — few inbound dependencies, failure is tolerable', 'payments — regulated so do it early', 'users — everything depends on it'], answer: 1, explain: 'Start with an edge capability: little depends on it, failures are tolerable, and the team learns the pipeline (CI/CD, tracing, gateway routing) on low-risk ground. Core flows come later.' },
      hints: [
        `<p>Hint 1: the aha is that you decompose by <b>business capability and data ownership</b>, not by technical layer or table.</p>`,
        `<p>Hint 2: group modules that change together and share invariants (inventory reservation and orders often must be consistent); isolate the regulated one (payments) and the high-traffic read side (catalog).</p>`,
        `<p>Hint 3: recipe: list capabilities → assign tables → mark every cross-module foreign key → replace with id + snapshot or event copy → pick extraction order by (few inbound deps, low risk) → run strangler fig behind a gateway.</p>`
      ],
      solution: {
        approach: `<p><b>Proposed first split (5 services, not 10):</b></p>
          <ol>
            <li><b>identity-svc</b> (users) — generic, could be a managed IdP later.</li>
            <li><b>catalog-svc</b> (catalog, reviews read, recommendations read) — read-heavy, cacheable, scales alone; reviews and recommendations stay as modules inside it at first.</li>
            <li><b>order-svc</b> (cart, orders, inventory reservation) — keep cart + orders + reservation together because they share invariants ("do not sell what we do not have"); splitting them now would force sagas immediately.</li>
            <li><b>payment-svc</b> — isolated so the PCI/regulated scope is small, its own database and audit log.</li>
            <li><b>fulfilment-svc</b> (shipping) and <b>notify-svc</b> (notifications) — event driven, consume <code>OrderPlaced</code>.</li>
          </ol>
          <p><b>Extraction order:</b> notify-svc first (edge, tolerant), then catalog-svc (biggest scaling win), then payment-svc, then fulfilment, leave order-svc as the last/core piece. Use a <b>strangler fig</b>: gateway routes by path; the monolith keeps the database until each slice owns its tables.</p>
          <p><b>Cross-module foreign keys:</b> <code>order_lines.product_id</code> becomes a plain id plus a price/name snapshot; <code>reviews.user_id</code> becomes an id with a cached display name fed by <code>UserRenamed</code> events. No cross-service joins.</p>
          <p><b>Risk controls:</b> dual-write or CDC to keep data in sync while migrating, feature-flag the gateway route, shadow traffic for the new service, keep a rollback switch.</p>`,
        dry: { head: ['Step', 'Action', 'Why'], rows: [['1', 'extract notify-svc', 'edge capability, zero core risk, proves the pipeline'], ['2', 'extract catalog-svc', 'scales 50x independently of checkout'], ['3', 'extract payment-svc', 'shrinks regulated scope'], ['4', 'extract fulfilment-svc', 'consumes OrderPlaced event'], ['5', 'leave orders+cart+reservation together', 'shared invariants; avoid early sagas']] },
        complexity: `<p>Cost model: cross-service calls added per request; target at most 2–3 sync hops on the checkout critical path.</p>`,
        followUps: ['What if reporting needs a join across orders and catalog?', 'When would you split cart away from orders?']
      }
    }
  ]
});

/* =====================================================================
   TOPIC 2 — API Gateway
   ===================================================================== */
topics.push({
  title: 'API Gateway: One Front Door (and BFF)',
  analogy: `<p>A big office building has a <b>reception desk</b>. Visitors do not wander the floors looking for the accounts team. They tell the receptionist who they want, show an ID, get a badge, and are pointed to the right floor. The receptionist also turns away people who come 500 times an hour.</p>
    <p>The <b>API gateway</b> is that reception desk for your services: one public address that checks identity, applies limits, finds the right service and sends the answer back.</p>`,
  explain: `<p><b>🟢 The plain idea.</b> Without a gateway, a mobile app must know the address of the catalog, cart, orders and payment services, call each one, and handle each one's login. That is fragile — move one service and every app version breaks. A gateway is a single server in front of all services that <b>routes</b> requests by path or header.</p>
    <p><b>What a gateway typically does (cross-cutting concerns once, not in 30 services):</b></p>
    <ul>
      <li><b>Routing</b> — <code>/orders/**</code> → order-svc, <code>/products/**</code> → catalog-svc.</li>
      <li><b>Authentication</b> — verify the JWT / session once, pass the user id downstream as a trusted header.</li>
      <li><b>Rate limiting & quotas</b> — protect from abusive clients (token bucket per API key).</li>
      <li><b>TLS termination</b>, CORS, request/response logging, request ids for tracing.</li>
      <li><b>Aggregation</b> — one call from the client, several calls behind the scenes (home screen = catalog + cart + recommendations).</li>
      <li><b>Protocol translation</b> — public REST/JSON outside, gRPC inside.</li>
      <li><b>Resilience</b> — timeouts, retries, circuit breaker, canary traffic split.</li>
    </ul>
    ${H.table(['Without gateway', 'With gateway'], [
      ['Client knows 6 hostnames', 'Client knows 1 hostname'],
      ['Auth code copied in every service', 'Auth checked once at the edge'],
      ['Mobile makes 7 calls to paint home screen', 'Mobile makes 1 call; gateway fans out'],
      ['Moving a service breaks apps', 'Change one route table']
    ])}
    <p><b>BFF (Backend For Frontend).</b> A phone, a web page and a partner API need different data shapes. Instead of one fat gateway trying to please all, make one thin gateway per client type: <i>web-bff</i>, <i>mobile-bff</i>. Each is owned by the front-end team, so they can change the response shape without asking backend teams.</p>
    <p><b>Gateway is not a place for business logic.</b> It routes, protects and shapes. The moment it contains "if the cart has a coupon then…", you have rebuilt a monolith in the gateway.</p>`,
  clues: [
    '"Clients should not know internal service addresses" → API gateway / single entry point',
    '"Authenticate once, rate-limit per user" → edge concerns in the gateway',
    '"Mobile app is slow, makes many calls to paint one screen" → aggregation / BFF',
    '"Different clients need different payloads" → BFF pattern (one per client type)',
    '"Gateway is a single point of failure?" → run many stateless replicas behind a load balancer, keep it thin',
    '"Public REST, internal gRPC" → protocol translation at the gateway'
  ],
  code: [
    { lang: 'js', run: true, title: 'Gateway model: auth + rate limit + route (runnable)', code: `// A tiny gateway: checks the token, applies a token-bucket limit, then picks a service.
var routes = [
  { prefix: '/products', target: 'catalog-svc', auth: false },
  { prefix: '/orders',   target: 'order-svc',   auth: true  },
  { prefix: '/payments', target: 'payment-svc', auth: true  }
];

// Token bucket per client key. Time is passed in so the demo is deterministic.
function makeLimiter(capacity, refillPerSecond) {
  var buckets = {};
  return function allow(key, nowMs) {
    var b = buckets[key] || (buckets[key] = { tokens: capacity, last: nowMs });
    b.tokens = Math.min(capacity, b.tokens + ((nowMs - b.last) / 1000) * refillPerSecond);
    b.last = nowMs;
    if (b.tokens >= 1) { b.tokens -= 1; return true; }
    return false;
  };
}

var allow = makeLimiter(3, 1); // burst of 3, then 1 request per second

function handle(req) {
  var route = routes.find(function (r) { return req.path.indexOf(r.prefix) === 0; });
  if (!route) return 404 + ' no route for ' + req.path;
  if (route.auth && !req.token) return 401 + ' missing token';
  if (!allow(req.client, req.t)) return 429 + ' slow down';
  return 200 + ' forwarded to ' + route.target;
}

var requests = [
  { client: 'app-1', path: '/products/7', token: null,  t: 0 },
  { client: 'app-1', path: '/orders/42',  token: null,  t: 10 },
  { client: 'app-1', path: '/orders/42',  token: 'abc', t: 20 },
  { client: 'app-1', path: '/orders/42',  token: 'abc', t: 30 },
  { client: 'app-1', path: '/orders/42',  token: 'abc', t: 40 },
  { client: 'app-1', path: '/orders/42',  token: 'abc', t: 50 },
  { client: 'app-1', path: '/orders/42',  token: 'abc', t: 2100 },
  { client: 'app-2', path: '/health',     token: 'abc', t: 60 }
];
requests.forEach(function (r) { console.log(r.client, r.path, '->', handle(r)); });` },
    { lang: 'yaml', check: false, title: 'Spring Cloud Gateway route config (illustrative)', code: `spring:
  cloud:
    gateway:
      routes:
        - id: orders
          uri: lb://order-svc          # lb:// = look the service up in the registry
          predicates:
            - Path=/orders/**
          filters:
            - name: RequestRateLimiter
              args:
                redis-rate-limiter.replenishRate: 10
                redis-rate-limiter.burstCapacity: 20
            - name: CircuitBreaker
              args:
                name: ordersCb
                fallbackUri: forward:/fallback/orders
        - id: catalog
          uri: lb://catalog-svc
          predicates:
            - Path=/products/**` }
  ],
  codeTitle: ['Plain JS model of a gateway', 'Spring Cloud Gateway config'],
  viz: {
    title: 'One request through the gateway',
    input: '/orders/42',
    inputLabel: 'Request path (/products/.., /orders/.., /payments/.., or anything else)',
    gen: function (input) {
      var path = String(input === undefined ? '/orders/42' : input).trim();
      if (path.charAt(0) !== '/' || path.length > 40) throw new Error('Type a path that starts with /, like /orders/42');
      var table = [['/products', 'catalog-svc', 'public'], ['/orders', 'order-svc', 'JWT'], ['/payments', 'payment-svc', 'JWT']];
      var hit = -1, i;
      for (i = 0; i < table.length; i++) if (path.indexOf(table[i][0]) === 0) hit = i;
      var tg = ['catalog-svc', 'order-svc', 'payment-svc'];
      var nodes = [bx('cl', 'Mobile App', 8, 28), bx('gw', 'API Gateway', 38, 28), bx('catalog-svc', 'catalog-svc', 82, 8), bx('order-svc', 'order-svc', 82, 28), bx('payment-svc', 'payment-svc', 82, 48)];
      var edges = [['cl', 'gw', 'HTTPS'], ['gw', 'catalog-svc'], ['gw', 'order-svc'], ['gw', 'payment-svc']];
      var frames = [];
      var routeRows = table.map(function (r) { return r.slice(); });
      frames.push({ narr: 'The app sends <code>GET ' + esc(path) + '</code> to the <b>one</b> public address. It has no idea how many services exist behind it.', parts: [{ type: 'graph', directed: true, height: 56, nodes: nodes, edges: edges, hl: { cl: 'cur' }, ehl: { 'cl-gw': 'cur' } }] });
      frames.push({ narr: '<b>Edge checks first.</b> The gateway terminates TLS, adds a request id for tracing and rate-limits this client. Doing this once here saves every service from re-implementing it.', parts: [{ type: 'graph', directed: true, height: 56, nodes: nodes, edges: edges, hl: { gw: 'cur' }, tags: { gw: 'TLS + rate limit' } }, { type: 'vars', label: 'request context', vals: { path: path, 'x-request-id': 'req-7f3a', client: 'app-1', tokensLeft: 2 } }] });
      frames.push({ narr: '<b>Look up the route table.</b> The first prefix that matches the path wins.' + (hit < 0 ? ' <span class="c-r">Nothing matches</span> so the gateway itself answers <b>404</b>.' : ' Match: <b>' + table[hit][0] + '</b> → <b>' + table[hit][1] + '</b>.'), parts: [{ type: 'table', label: 'route table', columns: ['prefix', 'target', 'auth'], rows: routeRows, hl: hit < 0 ? {} : (function () { var o = {}; o[hit] = 'ok'; return o; })() }] });
      if (hit < 0) {
        frames.push({ narr: 'No service is bothered. The caller gets <b>404 Not Found</b> straight from the edge — unknown paths never reach your internal network.', parts: [{ type: 'graph', directed: true, height: 56, nodes: nodes, edges: edges, hl: { gw: 'bad' }, tags: { gw: '404' } }] });
        frames.push({ narr: 'Try <code>/products/7</code>, <code>/orders/42</code> or <code>/payments/9</code> to see each path. A protected path would also check the JWT here before forwarding.', parts: [{ type: 'text', html: 'Gateway answered the request alone. <b>Cost: 1 hop, 0 services touched.</b>' }] });
        return frames;
      }
      var needAuth = table[hit][2] === 'JWT';
      frames.push({ narr: needAuth ? '<b>Authentication.</b> This route is protected, so the gateway validates the JWT signature and expiry <i>once</i> and passes <code>X-User-Id</code> downstream. The service trusts the gateway, not the raw token.' : '<b>No authentication needed</b> for public catalog browsing, so the gateway skips the token check.', parts: [{ type: 'graph', directed: true, height: 56, nodes: nodes, edges: edges, hl: { gw: 'sel' }, tags: { gw: needAuth ? 'JWT ok' : 'public' } }] });
      var eh = { 'cl-gw': 'done' }; eh['gw-' + tg[hit]] = 'ok';
      var hh = { gw: 'done' }; hh[tg[hit]] = 'cur';
      frames.push({ narr: '<b>Forward.</b> The gateway sends the request to <b>' + tg[hit] + '</b> (picked from the service registry — see next topic), with a timeout so a slow service cannot hold the caller forever.', parts: [{ type: 'graph', directed: true, height: 56, nodes: nodes, edges: edges, hl: hh, ehl: eh }] });
      frames.push({ narr: '<b>Response travels back</b> through the gateway, which can trim fields, add cache headers and log latency. The client sees one friendly API.', parts: [{ type: 'graph', directed: true, height: 56, nodes: nodes, edges: [['gw', 'cl', '200 OK'], ['gw', 'catalog-svc'], ['gw', 'order-svc'], ['gw', 'payment-svc']], hl: { cl: 'ok', gw: 'done' }, ehl: { 'gw-cl': 'ok' } }] });
      return frames;
    }
  },
  examples: [
    { title: 'Aggregation: one mobile call instead of four', html: `<p>The home screen needs featured products, the user's cart count, order status and recommendations. Without a gateway the phone makes 4 calls over a slow network. With a <b>mobile BFF</b> it makes 1; the BFF calls the four services <i>in parallel</i> inside the data centre (fast LAN) and merges results.</p>
      ${H.table(['', 'Phone → services', 'Phone → BFF → services'], [['Calls over mobile network', '4', '1'], ['Time (4 × 80 ms serial, parallel LAN ≈ 20 ms)', '≈ 320 ms', '≈ 100 ms'], ['Who changes JSON shape?', 'every backend team', 'mobile team']])}` },
    { title: 'Partial failure: degrade, do not crash', html: `<p>The recommendations service is down. The aggregator should return the home screen <b>without</b> the recommendations block (or with a cached one) and a header like <code>X-Degraded: recommendations</code>. Core pieces (catalog, cart) come back normally.</p><p>Rule: classify every downstream call as <b class="c-r">critical</b> (fail the request) or <b class="c-g">optional</b> (skip on failure) <i>before</i> you write the code.</p>` },
    { title: 'Gateway vs load balancer vs service mesh', html: `${H.table(['', 'Load balancer', 'API gateway', 'Service mesh'], [['Layer', 'L4/L7 spread across copies of one service', 'L7, north-south (outside → inside)', 'L7, east-west (service ↔ service)'], ['Knows about', 'healthy instances', 'routes, auth, quotas, API products', 'identity, retries, mTLS between services'], ['Typical tools', 'NGINX, ALB', 'Kong, Spring Cloud Gateway, Apigee', 'Istio, Linkerd']])}<p>They stack: LB → gateway → (mesh sidecars) → services.</p>` }
  ],
  deepDive: `<p><b>🟣 Production reality.</b></p>
    <ul>
      <li><b>Stateless and horizontally scaled.</b> Keep no session state in the gateway; put 3+ replicas behind a cloud load balancer so the "single point of failure" worry goes away. Rate-limit counters live in Redis (shared) or use per-node approximate limits.</li>
      <li><b>Latency tax.</b> Every request pays one extra hop (~1–3 ms in the same region). Use async I/O (Netty/Envoy) so the gateway handles tens of thousands of connections per node, and never do blocking calls in filters.</li>
      <li><b>Token handling.</b> Validate JWT signatures locally using cached JWKS public keys (no call to the auth server on every request); keep tokens short-lived (5–15 min) with refresh. Pass an <i>internal</i> identity (signed header or a re-issued internal token) so services cannot be called with a forged <code>X-User-Id</code> by anyone who bypasses the gateway — pair with network policy or mesh mTLS.</li>
      <li><b>Idempotency & retries at the edge.</b> Retrying a <code>POST /orders</code> is dangerous. Retry only idempotent methods automatically, or require an <code>Idempotency-Key</code> header the order service de-duplicates on.</li>
      <li><b>Versioning.</b> Route <code>/v1/**</code> and <code>/v2/**</code> to different deployments; canary by header or percentage.</li>
      <li><b>Anti-patterns:</b> the "god gateway" with business rules, orchestrating long workflows (that is a saga's job), one shared gateway for every team (bottleneck: use BFF or per-domain gateways), and exposing every internal endpoint by default.</li>
    </ul>
    <p><b>GraphQL federation</b> is the "aggregation gateway" taken further: one schema, resolvers fan out to subgraphs owned by different teams. Powerful for UI teams, but beware N+1 fan-out and unbounded query depth (add depth/cost limits).</p>`,
  aiEra: `<p><b>What AI changes:</b> Gateways are now also the front door for <b>AI traffic</b>. An "AI gateway" sits in front of LLM providers to hold API keys (never in app code), enforce per-team token budgets, cache repeated prompts, redact personal data, fail over between providers, and log prompts/responses for audit. It is the same reception-desk idea with new rules.</p>
    <p><b>Use AI as a partner:</b> have it draft route tables, OpenAPI specs and rate-limit policies from your service list, and ask <code>What abuse cases would break these limits?</code> — then test them yourself.</p>
    <p><b>Where AI goes wrong:</b> generated configs often forget timeouts and body-size limits, allow all CORS origins, or retry non-idempotent POSTs. It may also push business logic into gateway filters because it is "convenient".</p>
    <p><b>What you must still own:</b> the security model (who is trusted where), the failure policy per route (fail vs degrade), and the decision between one gateway, BFFs, or a mesh. Keep secrets such as provider keys in a secret manager, injected at runtime — never in route files or prompts.</p>`
});

/* =====================================================================
   TOPIC 3 — Service Discovery
   ===================================================================== */
topics.push({
  title: 'Service Discovery: Client-Side vs Server-Side, Registry & Heartbeats',
  analogy: `<p>You want to call a plumber. You do not memorise phone numbers of every plumber in town — they change jobs, move and go on holiday. You use a <b>phone directory</b> (the registry). Good directories remove plumbers who stopped answering.</p>
    <p>Two ways to use it: <b>(a)</b> you open the directory yourself, pick a plumber and call (client-side discovery); or <b>(b)</b> you call a <b>dispatcher</b> who looks it up and connects you (server-side discovery).</p>`,
  explain: `<p><b>🟢 The problem.</b> In the cloud, service instances are born and die all the time (autoscaling, deploys, crashes). IPs change. Hard-coding <code>http://10.0.3.17:8080</code> is hopeless. <b>Service discovery</b> lets a caller find the <i>current</i> healthy addresses of a service by <i>name</i> (<code>payment-svc</code>).</p>
    <p><b>Three moving parts:</b></p>
    <ol>
      <li><b>Service registry</b> — a database of "name → list of live instances (host:port, metadata)". Examples: Eureka, Consul, etcd/ZooKeeper, Kubernetes API.</li>
      <li><b>Registration</b> — an instance announces itself when it starts (self-registration) or the platform does it for it (third-party registration, e.g. Kubernetes).</li>
      <li><b>Heartbeat / health check</b> — every few seconds the instance says "I'm alive" (or the registry probes it). No heartbeat for a few intervals (a TTL, "time to live") → the entry is evicted.</li>
    </ol>
    <p><b>Client-side discovery.</b> The caller asks the registry for the list, caches it, and picks one instance itself (round-robin, least-loaded…) — a "smart client" library (Spring Cloud LoadBalancer + Eureka, gRPC client-side LB).</p>
    <p><b>Server-side discovery.</b> The caller sends to a fixed name/address (a load balancer, a Kubernetes <code>Service</code>, a cloud ALB). That router consults the registry and forwards. The caller stays dumb.</p>
    ${H.table(['', 'Client-side', 'Server-side'], [
      ['Who picks the instance?', 'the calling service (library)', 'a router / platform'],
      ['Extra network hop?', 'no (direct)', 'yes (via router)'],
      ['Client complexity', 'higher: library per language', 'lower: just a DNS name'],
      ['Smart balancing (per-request, zone aware)', 'easy', 'depends on router'],
      ['Typical example', 'Eureka + Spring Cloud LoadBalancer, gRPC', 'Kubernetes Service, AWS ALB'],
      ['Failure mode', 'stale cache sends to dead node', 'router is a shared dependency']
    ])}
    <p><b>Today's default:</b> on Kubernetes you usually get server-side discovery for free: a <code>Service</code> gives a stable DNS name (<code>payment-svc.shop.svc.cluster.local</code>) and kube-proxy/EndpointSlices handle the instance list. A <b>service mesh</b> (Topic 9) then adds smart client-side-like balancing via sidecars.</p>`,
  clues: [
    '"Instances come and go (autoscaling), how does A find B?" → service registry + discovery',
    '"Remove crashed instances automatically" → heartbeats / TTL / health checks',
    '"No extra hop, client picks the instance" → client-side discovery',
    '"Client should stay simple, one stable address" → server-side discovery (LB / Kubernetes Service)',
    '"Polyglot services, don\'t want a library in every language" → server-side or mesh',
    '"Registry itself must be highly available" → clustered registry (Consul raft, Eureka peers), clients cache'
  ],
  code: [
    { lang: 'java', title: 'Service registry with heartbeats (plain Java)', code: `import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.*;

/** A tiny in-memory registry: register, heartbeat, evict stale, look up healthy instances. */
public class ServiceRegistry {
    /** One running copy of a service. */
    record Instance(String id, String host, int port) {}

    private final long ttlMillis;
    // service name -> (instanceId -> instance + last heartbeat time)
    private final Map<String, Map<String, Instance>> instances = new ConcurrentHashMap<>();
    private final Map<String, Long> lastBeat = new ConcurrentHashMap<>();
    private final Map<String, AtomicInteger> rr = new ConcurrentHashMap<>(); // round-robin counters

    ServiceRegistry(long ttlMillis) { this.ttlMillis = ttlMillis; }

    /** Instance announces itself (also acts as the first heartbeat). */
    void register(String service, Instance inst, long now) {
        instances.computeIfAbsent(service, k -> new ConcurrentHashMap<>()).put(inst.id(), inst);
        lastBeat.put(inst.id(), now);
    }

    /** Called every few seconds by each instance. Unknown id means it was evicted: it must re-register. */
    boolean heartbeat(String service, String instanceId, long now) {
        Map<String, Instance> m = instances.get(service);
        if (m == null || !m.containsKey(instanceId)) return false;
        lastBeat.put(instanceId, now);
        return true;
    }

    /** Remove every instance whose last heartbeat is older than the TTL. Returns the removed ids. */
    List<String> evictStale(long now) {
        List<String> removed = new ArrayList<>();
        for (Map<String, Instance> m : instances.values()) {
            for (Instance i : new ArrayList<>(m.values())) {
                long age = now - lastBeat.getOrDefault(i.id(), 0L);
                if (age > ttlMillis) { m.remove(i.id()); lastBeat.remove(i.id()); removed.add(i.id()); }
            }
        }
        return removed;
    }

    /** Client-side discovery: return the current healthy list, sorted so round-robin is stable. */
    List<Instance> lookup(String service) {
        Map<String, Instance> m = instances.getOrDefault(service, Map.of());
        List<Instance> list = new ArrayList<>(m.values());
        list.sort(Comparator.comparing(Instance::id));
        return list;
    }

    /** Pick one healthy instance, round-robin. Returns null when none are alive. */
    Instance pick(String service) {
        List<Instance> list = lookup(service);
        if (list.isEmpty()) return null;
        int n = rr.computeIfAbsent(service, k -> new AtomicInteger()).getAndIncrement();
        return list.get(Math.floorMod(n, list.size()));
    }

    public static void main(String[] args) {
        ServiceRegistry reg = new ServiceRegistry(3000);          // evict after 3 s of silence
        reg.register("payments", new Instance("pay-1", "10.0.0.1", 8080), 0);
        reg.register("payments", new Instance("pay-2", "10.0.0.2", 8080), 0);
        System.out.println("t=0   pick -> " + reg.pick("payments").id());
        System.out.println("t=0   pick -> " + reg.pick("payments").id());
        reg.heartbeat("payments", "pay-1", 2000);                  // pay-1 stays alive, pay-2 goes silent
        System.out.println("t=4s  evicted = " + reg.evictStale(4000)); // pay-2 is 4 s old
        System.out.println("t=4s  pick -> " + reg.pick("payments").id());
        System.out.println("pay-2 heartbeat accepted? " + reg.heartbeat("payments", "pay-2", 4100));
    }
}` },
    { lang: 'yaml', check: false, title: 'Eureka client + Kubernetes Service (illustrative)', code: `# application.yml of a Spring Cloud service using Eureka (client-side discovery)
spring:
  application:
    name: payment-svc
eureka:
  client:
    service-url:
      defaultZone: http://eureka-1:8761/eureka/,http://eureka-2:8761/eureka/
  instance:
    lease-renewal-interval-in-seconds: 10     # heartbeat every 10 s
    lease-expiration-duration-in-seconds: 30  # evict after 30 s of silence
---
# Kubernetes: server-side discovery. Callers just use http://payment-svc
apiVersion: v1
kind: Service
metadata: { name: payment-svc }
spec:
  selector: { app: payment-svc }
  ports: [{ port: 80, targetPort: 8080 }]` }
  ],
  codeTitle: ['Registry + heartbeat + round-robin (Java)', 'Eureka and Kubernetes config'],
  viz: {
    title: 'Registry, heartbeats and eviction',
    input: 'pay-1 pay-2 pay-3',
    inputLabel: 'Instances of payment-svc (2-4 names). The LAST one will crash.',
    gen: function (input) {
      var names = words(input, 2, 4, 'pay-1 pay-2 pay-3'), TTL = 3, frames = [], dead = names.length - 1, i;
      var xs = spread(names.length, 14, 86);
      function nodesFor(alive, evicted) {
        var ns = [bx('reg', 'Registry', 50, 6), bx('cl', 'order-svc (client)', 50, 52)];
        for (i = 0; i < names.length; i++) ns.push(bx('n' + i, names[i], xs[i], 30));
        return ns;
      }
      function rows(t, lastSeen, gone) {
        var r = [];
        for (i = 0; i < names.length; i++) { if (gone[i]) continue; var age = t - lastSeen[i]; r.push([names[i], lastSeen[i], age, age > TTL ? 'EXPIRED' : 'UP']); }
        return r;
      }
      var seen = [], gone = [];
      for (i = 0; i < names.length; i++) { seen.push(0); gone.push(false); }
      var ed = []; for (i = 0; i < names.length; i++) ed.push(['n' + i, 'reg', 'register']);
      var eh = {}; for (i = 0; i < names.length; i++) eh['n' + i + '-reg'] = 'ok';
      frames.push({ narr: '<b>t = 0 · Startup.</b> Each instance of <code>payment-svc</code> tells the registry "I exist at this host:port". The registry now holds ' + names.length + ' entries. TTL is <b>' + TTL + ' ticks</b>.', parts: [{ type: 'graph', directed: true, height: 60, nodes: nodesFor(), edges: ed, ehl: eh }, { type: 'table', label: 'registry: payment-svc', columns: ['instance', 'last beat', 'age', 'state'], rows: rows(0, seen, gone) }] });
      var hb = [];
      for (i = 0; i < names.length; i++) hb.push(['n' + i, 'reg', 'beat']);
      for (var t = 1; t <= 6; t++) {
        var beating = [];
        for (i = 0; i < names.length; i++) { var alive = !(i === dead && t >= 2); if (alive && !gone[i]) { seen[i] = t; beating.push(i); } }
        var hlN = {}, ehl = {}, tags = {};
        for (i = 0; i < names.length; i++) { if (gone[i]) continue; if (i === dead && t >= 2) { hlN['n' + i] = 'bad'; tags['n' + i] = 'crashed'; } else { ehl['n' + i + '-reg'] = 'ok'; } }
        var evictedNow = [];
        for (i = 0; i < names.length; i++) if (!gone[i] && t - seen[i] > TTL) { evictedNow.push(i); }
        var narr;
        if (t === 1) narr = '<b>t = 1 · Heartbeat.</b> Every instance pings the registry; "last beat" refreshes. Think of it as a "still here!" wave every few seconds.';
        else if (t === 2) narr = '<b>t = 2 · <span class="c-r">' + names[dead] + ' crashes.</span></b> It stops waving. The registry does not know yet — it only notices silence over time. Until the TTL passes, a client could still be told about it.';
        else if (evictedNow.length) narr = '<b>t = ' + t + ' · Eviction.</b> ' + names[dead] + ' has been silent for ' + (t - seen[dead]) + ' ticks &gt; TTL ' + TTL + '. The registry removes it. New lookups no longer see it.';
        else narr = '<b>t = ' + t + ' · Waiting.</b> The healthy instances keep sending beats. ' + names[dead] + ' is now ' + (t - seen[dead]) + ' tick(s) silent (TTL is ' + TTL + ').';
        var shownRows = rows(t, seen, gone);
        var tHl = {}; for (var q = 0; q < shownRows.length; q++) if (shownRows[q][3] === 'EXPIRED') tHl[q] = 'bad';
        frames.push({ narr: narr, parts: [{ type: 'graph', directed: true, height: 60, nodes: nodesFor(), edges: hb, hl: hlN, ehl: ehl, tags: tags }, { type: 'table', label: 'registry: payment-svc', columns: ['instance', 'last beat', 'age', 'state'], rows: shownRows, hl: tHl }] });
        if (evictedNow.length) { for (i = 0; i < evictedNow.length; i++) gone[evictedNow[i]] = true; break; }
      }
      var healthy = []; for (i = 0; i < names.length; i++) if (!gone[i]) healthy.push(names[i]);
      var cl = []; for (i = 0; i < names.length; i++) if (!gone[i]) cl.push(['cl', 'n' + i, i === 0 ? 'call' : '']);
      cl.unshift(['cl', 'reg', 'lookup']);
      frames.push({ narr: '<b>Lookup.</b> <code>order-svc</code> asks the registry for <code>payment-svc</code> and gets only the healthy list. A client-side load balancer then rotates through it (round-robin). The crashed node never receives a request.', parts: [{ type: 'graph', directed: true, height: 60, nodes: nodesFor(), edges: cl, hl: { cl: 'cur', reg: 'ok' }, ehl: { 'cl-reg': 'ok' } }, { type: 'map', label: 'lookup("payment-svc")', entries: [['healthy instances', healthy.join(', ')]], hl: { 'healthy instances': 'ok' } }] });
      return frames;
    }
  },
  examples: [
    { title: 'Client-side round trip', html: `<ol><li><code>order-svc</code> starts and (via its library) fetches the registry list every 30 s into a local cache.</li><li>To call payments it asks its LoadBalancer: "give me an instance of <code>payment-svc</code>".</li><li>The LB rotates through the cached list and the HTTP client calls <code>http://10.0.0.2:8080/charge</code> directly.</li><li>If that call fails, retry on the <i>next</i> instance (only if the call is safe to retry).</li></ol><p>No middle box, but every client carries discovery logic and a cache that can be briefly stale.</p>` },
    { title: 'Server-side on Kubernetes', html: `<p>You never write discovery code. The platform keeps a list of ready pod IPs behind the Service <code>payment-svc</code>; DNS resolves the name to a virtual IP; kube-proxy (or eBPF) spreads connections across ready pods. <b>Readiness probes</b> decide who is in the list: a pod that fails its probe is removed in seconds, which is the "heartbeat" equivalent.</p><p>Catch: balancing happens per <i>connection</i>, so a long-lived HTTP/2 or gRPC connection pins to one pod. Fix with a headless Service + client-side gRPC LB or a mesh.</p>` },
    { title: 'Why a stale entry hurts: eviction vs speed', html: `${H.table(['Setting', 'Detect crash in', 'Side effect'], [['heartbeat 30 s, TTL 90 s', '~90 s', 'many failed calls during the gap'], ['heartbeat 5 s, TTL 15 s', '~15 s', 'more registry load; network blips evict healthy nodes'], ['plus client retries & circuit breaker', 'first failed call', 'hides the gap; recommended in addition'] ])}<p>Discovery is eventually consistent, so callers still need timeouts, retries and circuit breakers for the window between "crashed" and "evicted".</p>` }
  ],
  deepDive: `<p><b>🟣 What makes registries hard.</b></p>
    <ul>
      <li><b>Availability over consistency (AP).</b> Eureka chooses to stay up during network partitions and may serve slightly stale data; its <i>self-preservation mode</i> stops evicting when too many heartbeats suddenly vanish (it assumes the network is broken, not the services). Consul/etcd/ZooKeeper are CP (Raft/Zab consensus): consistent, but writes pause without a quorum. Either way, clients <b>cache</b> the last known list so the registry being down does not stop calls.</li>
      <li><b>Liveness vs readiness.</b> Liveness = "restart me if stuck". Readiness = "send me traffic only when warmed up and my dependencies work". Register on <i>readiness</i>. De-register on graceful shutdown <i>before</i> closing connections (preStop hook + connection draining) or deploys cause error spikes.</li>
      <li><b>Thundering herd after restart:</b> thousands of clients refreshing at once overload the registry. Add jitter to refresh and heartbeat intervals.</li>
      <li><b>Metadata & zones:</b> instances carry version, zone, weight. Prefer same-zone instances to cut cross-AZ latency and cost; use weights for canaries.</li>
      <li><b>DNS as discovery:</b> simple and universal but cached by OS/JVM (<code>networkaddress.cache.ttl</code>), so changes propagate slowly. SRV records and short TTLs help.</li>
      <li><b>Split brain & zombie instances:</b> a paused JVM (long GC) misses heartbeats, gets evicted, then wakes and keeps serving. Make heartbeat responses tell it to re-register, and guard writes with fencing tokens if correctness matters.</li>
    </ul>
    <p><b>Configuration vs discovery:</b> discovery returns <i>where</i> a service is; config servers/feature flags return <i>how</i> it should behave. Do not mix them in one store without thinking about blast radius.</p>`,
  aiEra: `<p><b>What AI changes:</b> Agent and tool ecosystems need discovery too. MCP servers, tool registries and "agent cards" play the role of a registry: an AI agent asks "which tools can do X?" and gets a catalog with schemas and endpoints. The same questions return: is it healthy, who may call it, which version?</p>
    <p><b>Use AI as a partner:</b> ask it to generate a failure-scenario table for your discovery setup (<code>registry down, partition, GC pause, slow deregistration</code>) and the expected client behaviour for each. Use it to write chaos-test scripts (kill a pod, watch error rate).</p>
    <p><b>Where AI goes wrong:</b> it often shows discovery code with no cache fallback, no jitter and no timeouts, and sets TTL = heartbeat interval so one late beat evicts a healthy node. It may also recommend client-side libraries in a Kubernetes cluster where the platform already does the job.</p>
    <p><b>What you must still own:</b> choosing the TTL and probe thresholds from real traffic and deploy behaviour, deciding what happens when the registry is unreachable, and verifying graceful shutdown with a load test.</p>`,
  problems: [
    {
      title: 'Design a Service Registry with Heartbeats',
      level: 'Medium', tags: ['service discovery', 'heartbeat', 'TTL'], companies: ['Netflix', 'Uber'],
      statement: `<p>Design the core of a service registry. Instances call <code>register(service, id, host)</code> on start and <code>heartbeat(service, id)</code> every 10 s. Callers call <code>lookup(service)</code> which must return only live instances, and <code>pick(service)</code> returns one round-robin. An instance with no heartbeat for 30 s must disappear. Describe data structures, the eviction mechanism, and what happens during a registry outage and a network partition.</p>`,
      constraints: `5,000 instances · 500 services · 20,000 lookups/s · heartbeat every 10 s · lookups may be up to 5 s stale · registry must survive one node loss.`,
      example: `<p>pay-1 and pay-2 register at t=0. pay-1 heartbeats at 10, 20, 30; pay-2 goes silent after t=0. At t=31 the sweeper evicts pay-2: <code>lookup("pay")</code> returns <span class="c-g">[pay-1]</span>.</p>`,
      brute: { why: `<p>Scan the whole instance table on every <code>lookup</code> and compare timestamps, or have each client ping every instance. With 20,000 lookups/s over 5,000 instances that is 100 million timestamp checks per second, and clients doing their own pinging multiplies network chatter. Evicting lazily at lookup time also makes reads slow and non-deterministic.</p>` },
      mcq: { q: 'Which heartbeat/TTL setting is the most sensible?', options: ['heartbeat every 10 s, TTL 10 s', 'heartbeat every 10 s, TTL 30 s', 'heartbeat every 60 s, TTL 30 s', 'no TTL, remove on graceful shutdown only'], answer: 1, explain: 'TTL must be several heartbeat intervals so one lost or late packet does not evict a healthy node. 3x is a common rule. Without TTL, crashed instances (which cannot de-register) stay forever.' },
      hints: [
        `<p>Hint 1: heartbeats are writes (about 500/s); lookups are reads (20,000/s). Optimise reads: keep a ready-made list per service.</p>`,
        `<p>Hint 2: store <code>Map&lt;service, Map&lt;id, Instance&gt;&gt;</code> plus <code>lastBeat</code>; run a background sweeper every few seconds instead of checking on every read; clients cache the lookup result.</p>`,
        `<p>Hint 3: consider outage behaviour: clients keep serving from their cached list; registry nodes replicate (peer-to-peer or Raft); do not mass-evict when heartbeats suddenly drop for everyone (self-preservation).</p>`
      ],
      solution: {
        approach: `<p><b>Data model.</b> <code>ConcurrentHashMap&lt;String, ConcurrentHashMap&lt;String, Entry&gt;&gt;</code> where <code>Entry</code> holds host, port, metadata and <code>lastBeat</code>. A heartbeat is an O(1) update of one field. A <b>sweeper</b> thread runs every 5 s, removes entries older than 30 s and bumps a per-service <i>version number</i>. Lookup returns an immutable snapshot list that is rebuilt only when a service changes (copy-on-write), so 20k lookups/s cost almost nothing.</p>
          <p><b>Clients</b> cache the snapshot for about 5 s (matches the staleness budget) and refresh with jitter; <code>pick</code> is a local atomic counter modulo list size, no registry call. If a call fails they retry the next instance and report/skip the bad one for a few seconds.</p>
          <p><b>Availability.</b> Run 3 registry nodes. Choose AP (Eureka style): each node accepts heartbeats and replicates asynchronously, so a partition keeps working with slightly stale data. Add <b>self-preservation</b>: if more than ~15% of heartbeats vanish at once, assume a network fault and stop evicting. During a total registry outage, clients keep using their last cached list; new instances are invisible until it recovers.</p>
          <p><b>Graceful shutdown:</b> instance deregisters, waits for in-flight requests to drain, then exits. <b>Rejoin:</b> a heartbeat for an unknown id returns "not found", telling the instance to register again (handles GC pauses and evicted-but-alive nodes).</p>`,
        dry: { head: ['t (s)', 'event', 'registry state', 'lookup("pay")'], rows: [['0', 'pay-1, pay-2 register', 'pay-1, pay-2', '[pay-1, pay-2]'], ['10', 'pay-1 beats; pay-2 silent', 'pay-1(10), pay-2(0)', '[pay-1, pay-2]'], ['30', 'pay-1 beats', 'pay-1(30), pay-2(0)', '[pay-1, pay-2]'], ['35', 'sweeper: pay-2 age 35 &gt; 30', 'pay-1 only', '<span class="c-g">[pay-1]</span>']] },
        complexity: `<p>Heartbeat O(1); lookup O(1) from a cached snapshot; sweep O(total instances) every 5 s = 5,000 checks, trivial. Memory: about 5,000 entries x ~200 B = 1 MB.</p>`,
        followUps: ['How do you avoid evicting everything during a network blip?', 'How would you add zone-aware routing?']
      }
    }
  ]
});

/* =====================================================================
   TOPIC 4 — Sync vs async communication
   ===================================================================== */
topics.push({
  title: 'Synchronous (REST/gRPC) vs Asynchronous Messaging',
  analogy: `<p><b>Synchronous = a phone call.</b> You ask, you stay on the line, you get the answer now. If the other person does not pick up, you are stuck. <b>Asynchronous = a letter or a voicemail.</b> You drop the message in a mailbox and go on with your day; the other side handles it when it can, and replies (if needed) later.</p>
    <p>Ordering a pizza: asking "is there a table for two?" needs a phone call (you cannot proceed without the answer). "Please email me the receipt" is a letter — nobody waits for it.</p>`,
  explain: `<p><b>🟢 Two ways services talk.</b></p>
    <ul>
      <li><b>Synchronous request/response</b> — caller sends a request and <i>waits</i> for the reply. Protocols: <b>REST</b> over HTTP/JSON (simple, human-readable, great for public APIs) and <b>gRPC</b> over HTTP/2 with Protocol Buffers (binary, typed contracts, streaming, fast; best for internal calls).</li>
      <li><b>Asynchronous messaging</b> — caller publishes a <i>message</i> or <i>event</i> to a broker (Kafka, RabbitMQ, SQS, Pub/Sub) and continues. Consumers read at their own pace. Two flavours: <b>command</b> ("ReserveStock" — one receiver, expects work) and <b>event</b> ("OrderPlaced" — a fact, any number of listeners).</li>
    </ul>
    ${H.table(['', 'Sync (REST / gRPC)', 'Async (broker)'], [
      ['Caller waits?', 'yes', 'no'],
      ['Both sides up at the same time?', '<span class="c-r">required</span>', 'not required (broker buffers)'],
      ['Coupling', 'temporal + knows the callee', 'knows only the topic/event'],
      ['Latency seen by user', 'sum of all hops', 'only the first hop'],
      ['Availability', 'product of all (99.9% x 3 = 99.7%)', 'caller unaffected by consumer outage'],
      ['Debugging', 'easy: one stack trace', 'harder: follow event trail, need tracing ids'],
      ['Consistency', 'immediate answer', 'eventual: effects happen later'],
      ['Best for', 'queries, "I need the answer to continue"', 'notifications, fan-out, long work, spikes']
    ])}
    <p><b>Rule of thumb for each call:</b> <i>Does the caller need the answer to decide what to do next, right now, while the user waits?</i> Yes → sync. No → publish an event. Also ask: <i>can the callee be down for 10 minutes without hurting the caller?</i> If it must not, decouple with a queue.</p>
    <p><b>Sync calls must be defended:</b> always set a <b>timeout</b>, retry only safe (idempotent) calls with exponential backoff + jitter, add a <b>circuit breaker</b> that fails fast when a callee is sick, and a <b>bulkhead</b> (separate thread pool) so one slow dependency cannot eat all threads. <b>Async consumers must be idempotent</b> because brokers deliver at-least-once.</p>`,
  clues: [
    '"User is waiting for the result" → sync on the critical path',
    '"Notify / log / update analytics / send email" → async event, never block checkout on it',
    '"Downstream is flaky or slow" → circuit breaker, timeout, bulkhead; or move behind a queue',
    '"Traffic spikes, need to smooth load" → queue as buffer (load levelling)',
    '"One action, many interested services" → publish/subscribe event, not N direct calls',
    '"Low latency internal calls, typed contract, streaming" → gRPC over REST',
    '"Public API for partners and browsers" → REST/JSON (or GraphQL) at the edge'
  ],
  code: [
    { lang: 'java', title: 'A minimal circuit breaker around a sync call (plain Java, runnable main)', code: `import java.util.function.*;

/** Closed -> (too many failures) -> Open (fail fast) -> (after cool-down) -> Half-open (try one) -> Closed/Open. */
public class CircuitBreaker {
    enum State { CLOSED, OPEN, HALF_OPEN }

    private final int failureThreshold;
    private final long openMillis;
    private State state = State.CLOSED;
    private int failures = 0;
    private long openedAt = 0;

    CircuitBreaker(int failureThreshold, long openMillis) {
        this.failureThreshold = failureThreshold;
        this.openMillis = openMillis;
    }

    /** Run the call through the breaker. 'now' is passed in so tests are deterministic. */
    synchronized <T> T call(Supplier<T> remote, Supplier<T> fallback, long now) {
        if (state == State.OPEN) {
            if (now - openedAt >= openMillis) state = State.HALF_OPEN; // allow one trial call
            else return fallback.get();                                // fail fast: do not even try
        }
        try {
            T result = remote.get();
            failures = 0;
            state = State.CLOSED;                                      // success closes the circuit
            return result;
        } catch (RuntimeException e) {
            failures++;
            if (state == State.HALF_OPEN || failures >= failureThreshold) {
                state = State.OPEN;
                openedAt = now;
            }
            return fallback.get();
        }
    }

    public static void main(String[] args) {
        CircuitBreaker cb = new CircuitBreaker(2, 1000);
        Supplier<String> broken = () -> { throw new RuntimeException("payments down"); };
        Supplier<String> healthy = () -> "charged";
        Supplier<String> fallback = () -> "PENDING (try later)";
        System.out.println(cb.call(broken, fallback, 0));    // failure 1
        System.out.println(cb.call(broken, fallback, 10));   // failure 2 -> circuit opens
        System.out.println(cb.call(healthy, fallback, 20));  // open: fails fast, remote not called
        System.out.println(cb.call(healthy, fallback, 1100)); // half-open trial succeeds -> closed
        System.out.println(cb.state);
    }
}` },
    { lang: 'java', title: 'Sync call with timeout + idempotency key (java.net.http)', code: `import java.net.URI;
import java.net.http.*;
import java.time.Duration;

public class PaymentClient {
    private final HttpClient http = HttpClient.newBuilder()
            .connectTimeout(Duration.ofMillis(300))      // never wait forever to connect
            .build();

    /** The orderId doubles as the idempotency key, so a retry cannot charge twice. */
    String charge(String baseUrl, String orderId, long cents) throws Exception {
        HttpRequest req = HttpRequest.newBuilder(URI.create(baseUrl + "/payments"))
                .timeout(Duration.ofMillis(800))          // total budget for this hop
                .header("Idempotency-Key", orderId)
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString("{\\"orderId\\":\\"" + orderId + "\\",\\"cents\\":" + cents + "}"))
                .build();
        HttpResponse<String> res = http.send(req, HttpResponse.BodyHandlers.ofString());
        if (res.statusCode() >= 500) throw new RuntimeException("payment service error " + res.statusCode());
        return res.body();
    }
}` },
    { lang: 'text', title: 'gRPC contract (.proto) - typed, versionable', code: `syntax = "proto3";
package payments.v1;

service PaymentService {
  rpc Authorize (AuthorizeRequest) returns (AuthorizeReply);
}
message AuthorizeRequest { string order_id = 1; int64 amount_cents = 2; string currency = 3; }
message AuthorizeReply   { string payment_id = 1; Status status = 2; }
enum Status { UNKNOWN = 0; AUTHORIZED = 1; DECLINED = 2; }` },
    { lang: 'json', title: 'An event on the broker (a fact, past tense)', code: `{
  "eventId": "9f2c1c1e-52c4-4b0e-9a57-0d6c3b9d9a10",
  "type": "OrderPlaced",
  "occurredAt": "2026-10-15T09:30:00Z",
  "orderId": "ord-1001",
  "customerId": "cus-77",
  "totalCents": 5998,
  "lines": [ { "sku": "TSHIRT-M", "qty": 2, "priceCents": 2999 } ]
}` }
  ],
  codeTitle: ['Circuit breaker (Java)', 'HTTP client with timeout (Java)', 'gRPC contract', 'Event JSON'],
  viz: [
    {
      title: 'Checkout: decide sync or async for every call',
      input: '',
      inputLabel: '(no input needed - press Next)',
      gen: function () {
        var calls = [
          ['Orders → Catalog', 'price & availability check', 'SYNC', 'need the answer to continue; cacheable read'],
          ['Orders → Inventory', 'reserve stock', 'SYNC', 'must succeed before we take money'],
          ['Orders → Payments', 'authorize card', 'SYNC', 'user waits for pass/fail; idempotency key + timeout'],
          ['Orders → Shipping', 'create shipment', 'ASYNC', 'happens after payment; customer is not waiting'],
          ['Orders → Notifications', 'confirmation email', 'ASYNC', 'fire-and-forget; must never block checkout'],
          ['Orders → Analytics / Loyalty', 'record sale, add points', 'ASYNC', 'many listeners of one event; can lag']
        ];
        var nodes = [bx('o', 'Orders', 12, 30), bx('cat', 'Catalog', 52, 6), bx('inv', 'Inventory', 52, 20), bx('pay', 'Payments', 52, 34), bx('sh', 'Shipping', 88, 14), bx('no', 'Notify', 88, 28), bx('an', 'Analytics', 88, 42), bx('bus', 'Event Bus', 52, 52)];
        var edgeDefs = [['o', 'cat', 'sync'], ['o', 'inv', 'sync'], ['o', 'pay', 'sync'], ['bus', 'sh', 'event'], ['bus', 'no', 'event'], ['bus', 'an', 'event']];
        var frames = [], rows = [], i;
        frames.push({ narr: 'We are placing an order. Orders must work with six other capabilities. For <b>each</b> call ask: <i>does the user wait for this answer, and may the other side be down for a while?</i>', parts: [{ type: 'graph', directed: true, height: 58, nodes: nodes, edges: [], hl: { o: 'cur' } }] });
        for (i = 0; i < calls.length; i++) {
          var c = calls[i]; rows.push([c[0], c[1], c[2], c[3]]);
          var es = [], eh = {}, hl = { o: 'done' };
          for (var j = 0; j <= i; j++) {
            if (j < 3) { es.push(edgeDefs[j]); eh[edgeDefs[j][0] + '-' + edgeDefs[j][1]] = 'win'; }
            else { if (!es.some(function (e) { return e[0] === 'o' && e[1] === 'bus'; })) es.push(['o', 'bus', 'publish OrderPlaced']); es.push(edgeDefs[j]); eh[edgeDefs[j][0] + '-' + edgeDefs[j][1]] = 'sel'; eh['o-bus'] = 'sel'; }
          }
          var hh = {}; hh[['cat', 'inv', 'pay', 'sh', 'no', 'an'][i]] = 'cur';
          frames.push({ narr: '<b>' + c[0] + '</b> (' + c[1] + '): ' + (c[2] === 'SYNC' ? '<span class="c-b">SYNC</span>' : '<span class="c-p">ASYNC</span>') + '. ' + c[3] + '.', parts: [{ type: 'graph', directed: true, height: 58, nodes: nodes, edges: es, hl: hh, ehl: eh }, { type: 'table', label: 'decision log', columns: ['call', 'purpose', 'mode', 'why'], rows: rows.map(function (r) { return r.slice(); }), hl: (function () { var o = {}; o[rows.length - 1] = c[2] === 'SYNC' ? 'win' : 'sel'; return o; })() }] });
        }
        frames.push({ narr: '<b>Result:</b> only <b>3 sync hops</b> sit on the user-facing critical path (catalog, inventory, payments); everything else hangs off an event. If Shipping, Notify or Analytics is down, checkout still works and they catch up later.', parts: [{ type: 'table', label: 'decision log', columns: ['call', 'purpose', 'mode', 'why'], rows: rows.map(function (r) { return r.slice(); }) }, { type: 'vars', vals: { syncHops: 3, asyncListeners: 3 }, hl: { syncHops: 'win', asyncListeners: 'sel' } }] });
        return frames;
      }
    },
    {
      title: 'Why long sync chains hurt: availability multiplies, latency adds',
      input: '99.9 5',
      inputLabel: 'Per-service availability % and max chain length (e.g. 99.9 5)',
      gen: function (input) {
        var p = String(input === undefined ? '99.9 5' : input).trim().split(/[\s,]+/).map(Number);
        if (p.length < 2 || isNaN(p[0]) || isNaN(p[1]) || p[0] <= 50 || p[0] > 100 || p[1] < 2 || p[1] > 8) throw new Error('Enter availability (51-100) and chain length (2-8), e.g. 99.9 5');
        var a = p[0] / 100, n = Math.floor(p[1]), frames = [], vals = [], txt = [], idx = [], k;
        for (k = 1; k <= n; k++) {
          var av = Math.pow(a, k) * 100;
          vals.push(Math.round(av * 100) / 100); txt.push(av.toFixed(2) + '%'); idx.push(k + ' hop' + (k > 1 ? 's' : ''));
          frames.push({ narr: 'Chain of <b>' + k + '</b> sync service' + (k > 1 ? 's' : '') + ', each ' + p[0] + '% available: all must be up at once, so total = ' + p[0] + '%<sup>' + k + '</sup> = <b>' + av.toFixed(2) + '%</b>. In a month that is about <b>' + Math.round((1 - Math.pow(a, k)) * 43200) + ' minutes</b> of failures. Latency also adds up: ' + k + ' x 40 ms = ' + (k * 40) + ' ms.', parts: [{ type: 'bars', label: 'combined availability (%) as chain grows', values: vals.slice(), texts: txt.slice(), idxLabels: idx.slice() }, { type: 'vars', vals: { hops: k, availability: av.toFixed(2) + '%', latency_ms: k * 40 }, hl: { availability: av < 99.5 ? 'bad' : 'ok' } }] });
        }
        frames.push({ narr: 'Moving non-essential hops behind a broker takes them <b>out of the product</b> above: the user-facing availability depends only on the services still on the sync path.', parts: [{ type: 'bars', label: 'combined availability (%)', values: vals.slice(), texts: txt.slice(), idxLabels: idx.slice() }] });
        return frames;
      }
    }
  ],
  examples: [
    { title: 'REST vs gRPC: which one where?', html: `${H.table(['', 'REST + JSON', 'gRPC + Protobuf'], [['Payload', 'text, bigger, human-readable', 'binary, 3-10x smaller'], ['Contract', 'OpenAPI (optional, drifts)', '.proto (mandatory, generated clients)'], ['Streaming', 'awkward (SSE/WebSocket)', 'built-in: server, client, bi-directional'], ['Browser support', 'native', 'needs gRPC-Web proxy'], ['Debugging', 'curl, browser', 'grpcurl, tooling needed'], ['Use for', 'public APIs, partners, simple CRUD', 'internal hot paths, polyglot teams, streaming']])}<p>Most companies run <b>REST at the edge, gRPC inside, events between domains.</b></p>` },
    { title: 'Command vs event on the broker', html: `<p>A <b>command</b> says "do this": <code>ReserveStock(orderId)</code> goes to <i>one</i> queue and exactly one consumer owns it; the sender cares about the outcome. An <b>event</b> says "this happened": <code>OrderPlaced</code> goes to a topic; Shipping, Notify and Analytics each subscribe independently, and the sender neither knows nor cares who listens.</p><p>Use events to keep services decoupled; use commands inside sagas when a specific service must act.</p>` },
    { title: 'Retry budget: timeouts must shrink downstream', html: `<p>The user-facing request has 2 s. Gateway → Orders → Payments → Bank. If each hop uses a 2 s timeout and 3 retries, one slow bank call can pin threads for 24 s. Pass a <b>deadline</b> down (gRPC does this natively): Orders gets 1.8 s, Payments 1.2 s, Bank 0.8 s. Retry at <b>one layer only</b> (usually the edge or the caller closest to the failure), otherwise retries multiply: 3 x 3 x 3 = 27 attempts against a struggling database.</p><p>Always use <b>exponential backoff with jitter</b>: wait 100 ms, 200 ms, 400 ms times a random 0.5–1.5 so clients do not retry in lock-step.</p>` }
  ],
  deepDive: `<p><b>🟣 Details that separate seniors from juniors.</b></p>
    <ul>
      <li><b>Delivery guarantees.</b> Brokers offer <i>at-most-once</i> (may lose), <i>at-least-once</i> (may duplicate — the practical default) and <i>exactly-once</i> (only inside a closed system like Kafka transactions; across a database + broker it is really at-least-once plus an idempotent consumer). Design handlers so processing the same message twice is harmless: dedupe table keyed by <code>eventId</code>, or naturally idempotent updates (<code>SET status='PAID'</code>).</li>
      <li><b>Ordering.</b> Kafka orders per <i>partition</i>, so choose the key (<code>orderId</code>) so all events of one order land in one partition. Global ordering is not available and rarely needed.</li>
      <li><b>Poison messages & DLQ.</b> A message that always fails blocks a partition forever. Retry a few times with backoff, then park it in a <b>dead-letter queue</b> with an alert.</li>
      <li><b>Backpressure.</b> Sync: bounded queues and 429/503 with <code>Retry-After</code>. Async: consumer lag is your health metric; autoscale consumers on lag.</li>
      <li><b>Schema evolution.</b> Events live forever. Add optional fields only; never rename or repurpose a field. Use a schema registry (Avro/Protobuf/JSON-Schema) with compatibility rules (backward/forward).</li>
      <li><b>Request-reply over a queue</b> is possible (correlation id + reply queue) but it is sync with extra steps; if you need it everywhere you probably want gRPC.</li>
      <li><b>Hybrid:</b> accept a request synchronously, answer <code>202 Accepted</code> with a status URL, do the work async, let the client poll or get a webhook/WebSocket push. Best of both for long jobs (report generation, AI inference).</li>
    </ul>`,
  aiEra: `<p><b>What AI changes:</b> LLM calls are the slowest, flakiest and most expensive sync dependency you will ever add (seconds, rate limits, occasional errors). Treat them as such: stream partial results to the user, put long jobs behind <code>202 Accepted</code> + queue, set tight timeouts, and have a cheap fallback (cached answer, smaller model, "we will email you"). AI agents also call your services as tools — so idempotency keys and clear error codes now protect you from an over-eager agent retrying a payment.</p>
    <p><b>Use AI as a partner:</b> have it generate the sync/async decision table for a flow you describe, then challenge it: <code>What happens to each step if that service is down for 10 minutes?</code> Ask for a .proto from an OpenAPI spec, or a Kafka topic/key design for your events, then review versioning yourself.</p>
    <p><b>Where AI goes wrong:</b> it defaults to "everything is REST", forgets timeouts, retries POSTs blindly, and invents <i>exactly-once</i> guarantees that do not exist end to end.</p>
    <p><b>What you must still own:</b> the failure semantics of each edge in the diagram, the SLO maths for the critical path, and the schema compatibility policy.</p>`,
  problems: []
});

/* =====================================================================
   TOPIC 5 — Saga
   ===================================================================== */
topics.push({
  title: 'Sagas: Orchestration vs Choreography, with Compensations',
  analogy: `<p>Booking a holiday: you book the flight, then the hotel, then the car. The hotel is full! You cannot "roll back time", but you <b>can</b> cancel the flight (and maybe pay a small fee). Each booking has a matching <b>undo</b> action. A <b>travel agent</b> who keeps the checklist and phones each company is <i>orchestration</i>. If instead the airline emails the hotel, the hotel emails the car company, and every firm reacts to the previous one's email with no one in charge, that is <i>choreography</i>.</p>`,
  explain: `<p><b>🟢 The problem.</b> Inside one database, "create order + take payment + reduce stock" is one ACID transaction: all succeed or all vanish. With a database per service you <b>cannot</b> hold one transaction across them (two-phase commit across services is slow, fragile and unsupported by most brokers and SaaS APIs). Yet the business still wants all-or-nothing behaviour.</p>
    <p><b>The saga pattern.</b> Break the big transaction into a sequence of <b>local transactions</b>, each in one service. Each step publishes a result. If a later step fails, run <b>compensating transactions</b> — business-level "undo" actions — for the steps already done, in reverse order.</p>
    ${H.table(['Step', 'Local transaction', 'Compensation (undo)'], [
      ['1', 'Orders: create order (PENDING)', 'Orders: mark CANCELLED'],
      ['2', 'Inventory: reserve stock', 'Inventory: release reservation'],
      ['3', 'Payments: charge card', 'Payments: refund'],
      ['4', 'Shipping: create shipment', 'Shipping: cancel shipment'],
      ['5', 'Orders: mark CONFIRMED', '—']
    ])}
    <p><b>Two coordination styles:</b></p>
    <ul>
      <li><b>Orchestration</b> — a central <i>saga orchestrator</i> (a state machine) tells each service what to do ("ReserveStock!"), waits for the reply, and decides the next step or the rollback. Easy to read, easy to monitor, one place for the logic; the orchestrator is an extra component that must be reliable.</li>
      <li><b>Choreography</b> — no boss. Each service reacts to events: Orders emits <code>OrderCreated</code> → Inventory reserves and emits <code>StockReserved</code> → Payments charges and emits <code>PaymentTaken</code> or <code>PaymentFailed</code> → Inventory listens for <code>PaymentFailed</code> and releases. Low coupling at the start, but the flow is spread across many services and quickly becomes hard to follow ("event spaghetti").</li>
    </ul>
    ${H.table(['', 'Orchestration', 'Choreography'], [['Control flow', 'one place (orchestrator)', 'spread over services'], ['Coupling', 'orchestrator knows all participants', 'participants know events only'], ['Visibility / debugging', 'easy: saga state in one table', 'hard: trace events across services'], ['Cyclic dependencies risk', 'low', 'high as flows grow'], ['Good for', '4+ steps, complex branching, deadlines', '2-3 steps, simple fan-out'], ['Tools', 'Temporal, Camunda, AWS Step Functions, Axon, Spring State Machine', 'Kafka / RabbitMQ + plain consumers']])}
    <p><b>Compensations are not rollbacks.</b> A rollback erases history; a compensation is a <i>new</i> business action that cancels the effect. The customer may already have seen "payment taken", so you issue a refund and send an apology email. Some steps cannot be undone (email sent, parcel shipped): put them <b>last</b> (the "pivot" step, after which the saga only moves forward) or make them reversible by design ("hold" then "capture").</p>`,
  clues: [
    '"Distributed transaction across services" / "no 2PC" → saga',
    '"If payment fails, release the stock" → compensating transaction',
    '"Who coordinates the workflow? a central service or events?" → orchestration vs choreography',
    '"Long-running business process, timeouts, human approval" → orchestrated saga / workflow engine',
    '"Each service reacts to events, no single owner" → choreography',
    '"Exactly once / what if the orchestrator crashes mid-saga?" → persisted saga state + idempotent steps',
    '"Order was cancelled after the customer saw success" → lack of isolation; use semantic locks / PENDING state'
  ],
  code: [
    { lang: 'js', run: true, title: 'Orchestrated order saga with compensations (runnable)', code: `// A saga = list of steps. Each step has do() and undo() (the compensation).
// The orchestrator persists a log so it could resume after a crash (here: an array).
function createSaga(steps, store) {
  return {
    run: function (ctx) {
      var log = store.log = [];          // durable saga log (a table in real life)
      var done = [];                     // steps that completed, in order
      for (var i = 0; i < steps.length; i++) {
        var s = steps[i];
        try {
          log.push('START ' + s.name);
          s.do(ctx);
          log.push('DONE  ' + s.name);
          done.push(s);
        } catch (err) {
          log.push('FAIL  ' + s.name + ' (' + err.message + ')');
          // Compensate in REVERSE order. Compensations must be idempotent and are retried.
          for (var j = done.length - 1; j >= 0; j--) {
            retry(3, function () { done[j].undo(ctx); });
            log.push('UNDO  ' + done[j].name);
          }
          return 'ABORTED';
        }
      }
      return 'COMPLETED';
    }
  };
}

// Retry a compensation up to n times (it may fail transiently).
function retry(n, fn) {
  for (var a = 1; a <= n; a++) {
    try { fn(); return; } catch (e) { if (a === n) throw e; }
  }
}

// Fake services with their own "databases".
function buildWorld(failAt) {
  var world = { orders: {}, stock: { 'tshirt-m': 5 }, charges: {}, shipments: {}, undoFailures: 1 };
  var steps = [
    { name: 'CreateOrder',
      do: function (c) { world.orders[c.id] = 'PENDING'; },
      undo: function (c) { world.orders[c.id] = 'CANCELLED'; } },
    { name: 'ReserveStock',
      do: function (c) { if (failAt === 'ReserveStock') throw new Error('out of stock'); world.stock[c.sku] -= c.qty; },
      undo: function (c) { world.stock[c.sku] += c.qty; } },
    { name: 'ChargeCard',
      do: function (c) { if (failAt === 'ChargeCard') throw new Error('card declined'); world.charges[c.id] = c.total; },
      undo: function (c) {
        // transient failure the first time: the retry loop handles it
        if (world.undoFailures-- > 0 && failAt === 'CreateShipment') throw new Error('refund API timeout');
        delete world.charges[c.id];   // idempotent: deleting twice is harmless
      } },
    { name: 'CreateShipment',
      do: function (c) { if (failAt === 'CreateShipment') throw new Error('no courier'); world.shipments[c.id] = 'LABEL'; },
      undo: function (c) { delete world.shipments[c.id]; } }
  ];
  return { world: world, steps: steps };
}

['none', 'ChargeCard', 'CreateShipment'].forEach(function (failAt) {
  var w = buildWorld(failAt), store = {};
  var result = createSaga(w.steps, store).run({ id: 'ord-1', sku: 'tshirt-m', qty: 2, total: 5998 });
  if (result === 'COMPLETED') w.world.orders['ord-1'] = 'CONFIRMED';
  console.log('--- failure injected at: ' + failAt + ' => ' + result);
  console.log(store.log.join(' | '));
  console.log('order=' + w.world.orders['ord-1'] + ' stock=' + w.world.stock['tshirt-m'] +
              ' charged=' + (w.world.charges['ord-1'] || 0) + ' shipment=' + (w.world.shipments['ord-1'] || 'none'));
});` },
    { lang: 'java', title: 'Same orchestrator in plain Java', code: `import java.util.*;

public class OrderSaga {
    /** One saga step: a local transaction plus its compensation. */
    interface Step {
        String name();
        void execute(Map<String, Object> ctx) throws Exception;
        void compensate(Map<String, Object> ctx);   // must be idempotent
    }

    static Step step(String name, ThrowingRunnable doIt, Runnable undo) {
        return new Step() {
            public String name() { return name; }
            public void execute(Map<String, Object> ctx) throws Exception { doIt.run(); }
            public void compensate(Map<String, Object> ctx) { undo.run(); }
        };
    }
    interface ThrowingRunnable { void run() throws Exception; }

    /** Runs steps in order; on failure undoes completed steps in reverse. Returns the saga log. */
    static List<String> run(List<Step> steps) {
        List<String> log = new ArrayList<>();
        Deque<Step> completed = new ArrayDeque<>();      // stack: last done = first undone
        Map<String, Object> ctx = new HashMap<>();
        for (Step s : steps) {
            try {
                s.execute(ctx);
                completed.push(s);
                log.add("DONE " + s.name());
            } catch (Exception e) {
                log.add("FAIL " + s.name() + ": " + e.getMessage());
                while (!completed.isEmpty()) {
                    Step u = completed.pop();
                    u.compensate(ctx);
                    log.add("UNDO " + u.name());
                }
                log.add("ABORTED");
                return log;
            }
        }
        log.add("COMPLETED");
        return log;
    }

    public static void main(String[] args) {
        List<Step> steps = List.of(
            step("CreateOrder", () -> {}, () -> System.out.println("  order cancelled")),
            step("ReserveStock", () -> {}, () -> System.out.println("  stock released")),
            step("ChargeCard", () -> { throw new Exception("card declined"); }, () -> System.out.println("  refunded"))
        );
        run(steps).forEach(System.out::println);
    }
}` },
    { lang: 'java', check: false, title: 'Choreography with Kafka listeners (Spring, illustrative)', code: `// Inventory service: reacts to events, emits events. No central coordinator.
@KafkaListener(topics = "order-events", groupId = "inventory")
public void onOrderCreated(OrderCreated e) {
    if (inventory.tryReserve(e.orderId(), e.sku(), e.qty())) {
        kafka.send("inventory-events", e.orderId(), new StockReserved(e.orderId()));
    } else {
        kafka.send("inventory-events", e.orderId(), new StockRejected(e.orderId(), "out of stock"));
    }
}

// Compensation by event: Payments failed -> Inventory releases what it reserved.
@KafkaListener(topics = "payment-events", groupId = "inventory")
public void onPaymentFailed(PaymentFailed e) {
    inventory.release(e.orderId());          // idempotent: releasing twice is a no-op
}` }
  ],
  codeTitle: ['Order saga (JS, runnable)', 'Order saga (Java)', 'Choreography listeners'],
  viz: [
    {
      title: 'Order saga: forward steps, then compensations roll back',
      input: '3',
      inputLabel: 'Which step fails? 1-4 (0 = none)',
      gen: function (input) {
        var f = parseInt(String(input === undefined ? '3' : input).trim(), 10);
        if (isNaN(f) || f < 0 || f > 4) throw new Error('Enter a number from 0 (no failure) to 4');
        var steps = ['CreateOrder', 'ReserveStock', 'ChargeCard', 'CreateShipment'];
        var comps = ['CancelOrder', 'ReleaseStock', 'RefundCard', 'CancelShipment'];
        var svc = ['ord', 'inv', 'pay', 'shp'];
        var nodes = [bx('orch', 'Saga Orchestrator', 50, 30), bx('ord', 'Orders', 14, 8), bx('inv', 'Inventory', 86, 8), bx('pay', 'Payments', 14, 52), bx('shp', 'Shipping', 86, 52)];
        var status = ['-', '-', '-', '-'], frames = [], stack = [], i, j;
        function tbl() { return steps.map(function (s, k) { return [k + 1, s, status[k], comps[k]]; }); }
        function tHl() { var o = {}; status.forEach(function (st, k) { if (st === 'DONE') o[k] = 'ok'; else if (st === 'FAILED' || st === 'UNDONE') o[k] = 'bad'; else if (st === 'RUNNING') o[k] = 'cur'; }); return o; }
        function parts(cmdSvc, cmdLabel, bad) {
          var es = [], eh = {};
          if (cmdSvc) { es.push(['orch', cmdSvc, cmdLabel]); eh['orch-' + cmdSvc] = bad ? 'bad' : 'cur'; }
          else es.push(['orch', 'ord']);
          var hl = {}; if (cmdSvc) hl[cmdSvc] = bad ? 'bad' : 'cur'; hl.orch = 'sel';
          return [{ type: 'graph', directed: true, height: 60, nodes: nodes, edges: es, hl: hl, ehl: eh },
                  { type: 'table', label: 'saga log (persisted)', columns: ['#', 'step', 'status', 'compensation'], rows: tbl(), hl: tHl() },
                  { type: 'stack', label: 'completed steps to undo (top = undone first)', items: stack.slice(), hl: stack.length ? (function () { var o = {}; o[stack.length - 1] = 'bad'; return o; })() : {} }];
        }
        frames.push({ narr: 'The orchestrator starts a saga for order <code>ord-1</code>. It will command each service in order and write every state change to its own log table. If anything fails, it knows exactly what to undo.', parts: parts(null, '', false) });
        for (i = 0; i < 4; i++) {
          status[i] = 'RUNNING';
          frames.push({ narr: '<b>Step ' + (i + 1) + ': ' + steps[i] + '</b>. Orchestrator sends the command to the ' + svc[i] + ' service and waits for its reply event.', parts: parts(svc[i], steps[i], false) });
          if (f === i + 1) {
            status[i] = 'FAILED';
            frames.push({ narr: '<b><span class="c-r">' + steps[i] + ' FAILED.</span></b> We cannot go forward. The earlier steps already committed in their own databases, so the orchestrator must now run <b>compensations in reverse order</b>.', parts: parts(svc[i], steps[i] + ' ✗', true) });
            for (j = i - 1; j >= 0; j--) {
              stack = stack.slice(0, j + 1);
              status[j] = 'UNDONE'; var popped = stack.pop();
              frames.push({ narr: '<b>Compensate:</b> send <code>' + comps[j] + '</code> to ' + svc[j] + '. This is a new business action, not a database rollback; it must be <b>idempotent</b> so a retry is safe.', parts: parts(svc[j], comps[j], true) });
            }
            frames.push({ narr: '<b>Saga ABORTED.</b> The system is consistent again: nothing reserved, nothing charged. The customer sees "payment failed, please try again" — the end result matches an all-or-nothing transaction, but only <i>eventually</i>.', parts: parts(null, '', true) });
            return frames;
          }
          status[i] = 'DONE'; stack.push(steps[i]);
          frames.push({ narr: '<span class="c-g">' + steps[i] + ' succeeded</span> and committed locally. Push it on the "to undo" stack in case a later step fails.', parts: parts(svc[i], 'ok', false) });
        }
        frames.push({ narr: '<b>Saga COMPLETED.</b> All four local transactions succeeded; the order moves from PENDING to CONFIRMED. Try failing step 2, 3 or 4 to watch the rollback.', parts: parts(null, '', false) });
        return frames;
      }
    },
    {
      title: 'Choreography: events instead of a boss',
      input: 'fail',
      inputLabel: 'Type ok or fail (payment result)',
      gen: function (input) {
        var mode = String(input === undefined ? 'fail' : input).trim().toLowerCase();
        if (mode !== 'ok' && mode !== 'fail') throw new Error('Type ok or fail');
        var nodes = [bx('ord', 'Orders', 12, 10), bx('bus', 'Event Bus', 50, 30), bx('inv', 'Inventory', 88, 10), bx('pay', 'Payments', 88, 50), bx('log', 'Event log', 12, 50)];
        var events = [], frames = [];
        function p(from, to, label, cls) {
          var eh = {}; eh[from + '-' + to] = cls;
          return [{ type: 'graph', directed: true, height: 60, nodes: nodes, edges: [[from, to, label]], hl: (function () { var o = {}; o[from] = 'cur'; return o; })(), ehl: eh }, { type: 'queue', label: 'events published so far (oldest first)', items: events.slice(), frontLabel: 'first', backLabel: 'latest', hl: events.length ? (function () { var o = {}; o[events.length - 1] = cls === 'bad' ? 'bad' : 'cur'; return o; })() : {} }];
        }
        events.push('OrderCreated');
        frames.push({ narr: '<b>1.</b> Orders saves the order as PENDING and publishes <code>OrderCreated</code>. It does not call anyone.', parts: p('ord', 'bus', 'OrderCreated', 'cur') });
        frames.push({ narr: '<b>2.</b> Inventory is subscribed. It reserves stock locally.', parts: p('bus', 'inv', 'OrderCreated', 'ok') });
        events.push('StockReserved');
        frames.push({ narr: '<b>3.</b> Inventory publishes <code>StockReserved</code>. Payments is listening for exactly this event.', parts: p('inv', 'bus', 'StockReserved', 'cur') });
        if (mode === 'ok') {
          events.push('PaymentTaken');
          frames.push({ narr: '<b>4.</b> Payments charges the card and publishes <code>PaymentTaken</code>. Orders will see it and mark the order CONFIRMED. No coordinator was involved.', parts: p('pay', 'bus', 'PaymentTaken', 'ok') });
          frames.push({ narr: 'Happy path done. The cost: to understand the whole order flow you must read the code of 3 services. With more steps this gets hard to follow.', parts: p('bus', 'ord', 'PaymentTaken', 'ok') });
        } else {
          events.push('PaymentFailed');
          frames.push({ narr: '<b>4. <span class="c-r">Payment declined.</span></b> Payments publishes <code>PaymentFailed</code>.', parts: p('pay', 'bus', 'PaymentFailed', 'bad') });
          events.push('StockReleased');
          frames.push({ narr: '<b>5. Compensation by event:</b> Inventory listens for <code>PaymentFailed</code> and releases the reservation, then publishes <code>StockReleased</code>. Nobody told it to; it knew the rule.', parts: p('inv', 'bus', 'StockReleased', 'bad') });
          events.push('OrderCancelled');
          frames.push({ narr: '<b>6.</b> Orders reacts to <code>PaymentFailed</code> and sets the order to CANCELLED. The saga ended consistently, but the "rollback logic" lives in two different services.', parts: p('ord', 'bus', 'OrderCancelled', 'bad') });
        }
        return frames;
      }
    }
  ],
  examples: [
    { title: 'Orchestrator persists state, so it can resume', html: `<p>The orchestrator keeps a table <code>saga_instance(id, type, state, step, payload, updated_at)</code>. After every reply it writes the new <code>step</code> in the same transaction that decides the next command (and uses the outbox for sending it — Topic 6). If the orchestrator pod dies, another pod loads rows with <code>state='RUNNING'</code> and a stale <code>updated_at</code> and continues. Every command carries <code>sagaId + stepNo</code> as an idempotency key, so a re-sent command is harmless.</p>
      ${H.table(['saga id', 'state', 'step', 'last event'], [['s-91', 'RUNNING', 'ChargeCard', 'StockReserved'], ['s-92', '<span class="c-r">COMPENSATING</span>', 'ReleaseStock', 'PaymentFailed'], ['s-93', '<span class="c-g">COMPLETED</span>', '—', 'ShipmentCreated']])}` },
    { title: 'Order the steps to minimise compensation pain', html: `<p>Put steps that are <b>easy to undo or cannot fail</b> first, and the <b>hard-to-undo</b> step (the pivot) last. Good order: validate order → reserve stock (cheap undo) → authorize card (hold, not capture) → capture payment → ship. A card <i>authorization</i> can be voided with no fee; a <i>capture</i> needs a refund. Pre-validating cheap rules before the first step avoids many sagas starting just to fail.</p>` },
    { title: 'Lack of isolation: the dirty-read trap', html: `<p>Sagas are <b>ACD but not I</b>: other requests see intermediate states. Example: stock is reserved (visible to others) while payment is pending; if payment fails the stock comes back, but meanwhile another customer was told "sold out".</p><ul><li><b>Semantic lock:</b> mark the order <code>PENDING</code> and let other flows treat PENDING rows specially.</li><li><b>Commutative updates:</b> design operations so order does not matter (increment/decrement, not set).</li><li><b>Pessimistic view:</b> reorder steps so risky data is exposed later.</li><li><b>Reread values</b> before overwriting; use version numbers.</li></ul>` }
  ],
  deepDive: `<p><b>🟣 What breaks sagas in production.</b></p>
    <ul>
      <li><b>Compensation can fail too.</b> Retry with backoff forever, make them idempotent, and alert a human after N tries. Never design a compensation that can legitimately fail (e.g. "re-stock" is easy; "un-send an email" is impossible — so send it last).</li>
      <li><b>Idempotency everywhere.</b> Messages are delivered at least once, so every step and compensation must tolerate duplicates: key by <code>(sagaId, step)</code>, store processed keys, and make operations naturally repeatable.</li>
      <li><b>Out-of-order & late events.</b> A <code>PaymentTaken</code> may arrive after the orchestrator already timed out and compensated. Handle "compensation arrived before the action" (the action must then be a no-op — record a tombstone for <code>sagaId</code>).</li>
      <li><b>Timeouts are part of the model.</b> Every wait needs a deadline; expiry triggers compensation. Workflow engines (Temporal, Step Functions) give durable timers, retries and history for free; hand-rolled state machines usually forget one of these.</li>
      <li><b>Atomic send + state change</b> needs the transactional outbox (next topic), otherwise a crash between "update saga row" and "send command" strands the saga.</li>
      <li><b>Observability:</b> a single <code>sagaId</code>/<code>traceId</code> on every message, a dashboard of sagas by state, and an alert on "stuck COMPENSATING longer than 5 min".</li>
      <li><b>Not everything needs a saga.</b> If two things must be strongly consistent, they probably belong in one service. A saga is the price of a boundary — choose boundaries to need few of them.</li>
      <li><b>Alternatives:</b> TCC (Try-Confirm-Cancel) reserves resources explicitly with a confirm phase; two-phase commit (XA) exists but couples availability of all participants and is avoided across services.</li>
    </ul>`,
  aiEra: `<p><b>What AI changes:</b> Agentic AI workflows <i>are</i> sagas: an agent books a flight, reserves a hotel, sends an email — each tool call is a local action with real side effects and (sometimes) no undo. The same discipline applies: make tools idempotent, record every step in a durable log, define compensations, require human approval before the irreversible step, and put the irreversible step last.</p>
    <p><b>Use AI as a partner:</b> ask it to enumerate failure cases for your step list (<code>for each step, what if it times out after succeeding? what if the compensation fails?</code>), to generate property-based tests for idempotency, or to draft a Temporal/Step Functions definition. Have it draw the state machine and look for unreachable or stuck states.</p>
    <p><b>Where AI goes wrong:</b> it writes happy-path sagas with no compensation retries, forgets the "late success after timeout" race, and often claims "exactly once" because a library says so. It may also compensate by deleting rows instead of writing business-level reversal records.</p>
    <p><b>What you must still own:</b> which steps are reversible, the business meaning of every compensation (refund vs. credit note), the timeout values, and the choice between orchestration and choreography for your team size.</p>`,
  problems: [
    {
      title: 'Write an Orchestrated Order Saga with Compensations',
      level: 'Hard', tags: ['saga', 'orchestration', 'compensation', 'idempotency'], companies: ['Uber', 'Amazon', 'Booking.com'],
      statement: `<p>Design an orchestrated saga for <b>PlaceOrder</b> across Orders, Inventory, Payments and Shipping. Define the steps, the compensation for each, the persisted saga state, what happens if the orchestrator crashes after payment succeeded but before shipping started, and what happens if the Payments reply arrives <i>after</i> the orchestrator already timed out and refunded.</p>`,
      constraints: `At-least-once messaging · services may be down for minutes · no distributed transactions · a card may be charged at most once per order · target: no stuck sagas longer than 10 minutes.`,
      example: `<p>Happy path: order PENDING → stock reserved → card captured → shipment created → order CONFIRMED.</p><p>Failure at Shipping: <span class="c-r">no courier</span> → refund card → release stock → cancel order. Final state: CANCELLED, nothing charged.</p>`,
      brute: { why: `<p>One big REST handler in the order service calls inventory, payments and shipping one after another with try/catch, undoing inline. If the process dies in the middle there is no record of what completed, so money can stay charged with no order; retries double-charge; and a slow shipping call blocks the web thread. There is no state to resume from.</p>` },
      mcq: { q: 'The orchestrator crashes right after Payments captured the card. What lets another instance continue correctly?', options: ['Restart the saga from step 1', 'The persisted saga row (step, state) plus idempotent commands keyed by sagaId+step', 'Ask the customer to retry', 'Use a distributed lock only'], answer: 1, explain: 'The saga log records that ChargeCard is DONE. The new instance reads it, continues with CreateShipment, and re-sent commands are de-duplicated by (sagaId, step), so nothing is charged twice.' },
      hints: [
        `<p>Hint 1: the aha is that a saga is a <b>persisted state machine</b>; steps are local transactions, undo actions are new business operations.</p>`,
        `<p>Hint 2: pick the step order (reversible first, pivot last), give each command an idempotency key (sagaId + step), and store state transitions in the same DB transaction as the outbox message.</p>`,
        `<p>Hint 3: write out the state machine: RUNNING(step i) → on success i+1; on failure COMPENSATING(i-1 … 1) → ABORTED; add timeouts per step and a "late reply" rule (record a tombstone so a late success triggers an immediate compensation).</p>`
      ],
      solution: {
        approach: `<p><b>Steps and compensations.</b> (1) Orders.create PENDING / cancel; (2) Inventory.reserve / release; (3) Payments.authorize then capture / void or refund; (4) Shipping.createShipment / cancel; (5) Orders.confirm. Order chosen so that cheap undos are first and the shipment, hardest to undo, is last.</p>
          <p><b>State.</b> Table <code>saga(id, order_id, state, step, deadline_at, version)</code>. Each reply is handled in one local transaction: update <code>step/state</code> <i>and</i> insert the next command into the <b>outbox</b>. A relay publishes it. Commands carry <code>sagaId:step</code> as an idempotency key; each participant stores processed keys and answers duplicates with the original result.</p>
          <p><b>Orchestrator crash.</b> A recovery job (or the workflow engine) picks up RUNNING sagas whose <code>updated_at</code> is stale and replays the next command, which is safe because of idempotency. In the scenario "payment captured, shipping not started" the log says ChargeCard=DONE, so the new instance sends CreateShipment; it never recharges.</p>
          <p><b>Late reply after timeout.</b> At the deadline the orchestrator moves to COMPENSATING and sends RefundCard (idempotent; if Payments never charged, it records a tombstone for the idempotency key). If <code>PaymentCaptured</code> arrives later, the saga row is already ABORTED, so the handler enqueues RefundCard again instead of continuing. Compensations are retried with backoff forever and alert a human after 5 failures.</p>
          <p><b>Isolation.</b> The order stays PENDING (semantic lock) and the UI shows "processing"; stock is held with an expiry so reservations cannot leak.</p>
          <p><b>Observability.</b> sagaId on every log line, dashboard by state, alert if state=COMPENSATING for more than 10 minutes.</p>`,
        dry: { head: ['Event', 'Saga state', 'Command sent (outbox)', 'Note'], rows: [['PlaceOrder', 'RUNNING(1)', 'ReserveStock(s1:2)', 'order PENDING'], ['StockReserved', 'RUNNING(2)', 'ChargeCard(s1:3)', 'stock held'], ['PaymentCaptured', 'RUNNING(3)', 'CreateShipment(s1:4)', 'pivot next'], ['ShipmentFailed', '<span class="c-r">COMPENSATING</span>', 'RefundCard(s1:3u)', 'undo in reverse'], ['CardRefunded', 'COMPENSATING', 'ReleaseStock(s1:2u)', ''], ['StockReleased', '<span class="c-g">ABORTED</span>', 'CancelOrder', 'consistent']] },
        complexity: `<p>Each saga costs 2 messages per step plus compensations; state is one row per saga. Latency is the sum of the steps (the customer sees PENDING meanwhile).</p>`,
        followUps: ['How would you do this with choreography and what do you lose?', 'How do you test compensation failures?']
      }
    }
  ]
});

/* =====================================================================
   TOPIC 6 — Transactional Outbox
   ===================================================================== */
topics.push({
  title: 'Transactional Outbox: Never Lose (or Invent) an Event',
  analogy: `<p>A shop clerk finishes a sale. Two things must happen: <b>write the sale in the ledger</b> and <b>phone the warehouse</b>. If the clerk writes the ledger and the power dies before the call, the warehouse never ships. If the clerk calls first and then the ledger write fails, the warehouse ships something nobody paid for.</p>
    <p>The fix: the clerk writes the sale <b>and a sticky note "call the warehouse"</b> in the same ledger page, in one pen stroke. A second person (the <b>relay</b>) walks the ledger, makes each pending call, and ticks the note as done. The ledger and the note can never disagree.</p>`,
  explain: `<p><b>🟢 The dual-write problem.</b> Your service must update its database <i>and</i> publish an event. These are two different systems, so you cannot make both atomic:</p>
    ${H.table(['Order of operations', 'Crash between the two', 'Result'], [
      ['1. save order  2. publish event', 'after 1, before 2', '<span class="c-r">order exists, event lost</span> → shipping never starts'],
      ['1. publish event  2. save order', 'after 1, before 2 (or save fails)', '<span class="c-r">event exists, order does not</span> → ghost shipment'],
      ['both in one DB transaction', '—', 'impossible: the broker is not part of the DB transaction']
    ])}
    <p><b>The transactional outbox pattern.</b></p>
    <ol>
      <li>In the <b>same local database transaction</b> that saves the business change, insert a row into an <code>outbox</code> table holding the event (id, type, payload, status = PENDING).</li>
      <li>Commit. Now either both the order and its event exist, or neither does. The atomicity comes free from the database.</li>
      <li>A separate <b>relay</b> (message relay / publisher) reads PENDING rows, publishes each to the broker, then marks it SENT (or deletes it).</li>
      <li>Consumers de-duplicate with the event id (the <b>inbox</b> / idempotent consumer).</li>
    </ol>
    <p><b>Two ways to build the relay:</b></p>
    <ul>
      <li><b>Polling publisher</b> — a loop does <code>SELECT … WHERE status='PENDING' ORDER BY id LIMIT 100 FOR UPDATE SKIP LOCKED</code>. Simple, works anywhere; adds a small delay (poll interval) and DB load.</li>
      <li><b>Change Data Capture (CDC)</b> — a tool like <b>Debezium</b> tails the database's write-ahead log and streams new outbox rows to Kafka. Near real time, no polling load, but extra infrastructure to run.</li>
    </ul>
    <p><b>"Exactly once" honesty.</b> The relay can crash <i>after</i> publishing but <i>before</i> marking SENT, so it will publish that row again. So the guarantee is <b>at-least-once publishing</b> from the producer. The producer side stays tidy (each row claimed by one relay at a time, marked sent once per success), and the <b>effect</b> becomes exactly-once because the consumer ignores a repeated <code>eventId</code>.</p>`,
  clues: [
    '"Update the DB and publish an event atomically" → transactional outbox',
    '"Event was lost when the service crashed" / "ghost events" → dual-write problem',
    '"Avoid 2PC between database and Kafka" → outbox + relay',
    '"Duplicates on the consumer side" → idempotent consumer / inbox table keyed by eventId',
    '"Stream DB changes into Kafka without changing the app much" → CDC (Debezium) on the outbox table',
    '"Need ordering per aggregate" → partition key = aggregate id, relay reads in id order'
  ],
  code: [
    { lang: 'js', run: true, title: 'Outbox + relay + idempotent consumer (runnable)', code: `// In-memory "database" with two tables. placeOrder() is ONE atomic transaction.
function createDb() { return { orders: [], outbox: [], seq: 0 }; }

function placeOrder(db, orderId, total, crashInsideTx) {
  var ordersBefore = db.orders.length, outboxBefore = db.outbox.length;
  try {
    db.orders.push({ id: orderId, total: total, status: 'PENDING' });
    if (crashInsideTx) throw new Error('crash inside transaction');
    db.outbox.push({ id: ++db.seq, eventId: 'evt-' + orderId, type: 'OrderPlaced',
                     payload: { orderId: orderId, total: total }, status: 'PENDING', owner: null });
    return true;                                     // COMMIT: both rows exist
  } catch (e) {
    db.orders.length = ordersBefore;                 // ROLLBACK: neither row exists
    db.outbox.length = outboxBefore;
    return false;
  }
}

// Like: SELECT ... WHERE status='PENDING' FOR UPDATE SKIP LOCKED, then mark them as ours.
function claim(db, relayId, limit) {
  var rows = db.outbox.filter(function (r) { return r.status === 'PENDING'; }).slice(0, limit);
  rows.forEach(function (r) { r.status = 'CLAIMED'; r.owner = relayId; });
  return rows;
}

// One relay pass: publish each claimed row, then mark it SENT.
function relayOnce(db, broker, relayId, opts) {
  opts = opts || {};
  claim(db, relayId, 10).forEach(function (row) {
    broker.push({ eventId: row.eventId, type: row.type, payload: row.payload }); // publish
    if (opts.crashAfterPublishOf === row.eventId) throw new Error(relayId + ' crashed after publish, before marking SENT');
    row.status = 'SENT';
  });
}

// If a relay died, its claimed rows are stuck. A lease timeout puts them back to PENDING.
function releaseStaleClaims(db) {
  db.outbox.forEach(function (r) { if (r.status === 'CLAIMED') { r.status = 'PENDING'; r.owner = null; } });
}

// Consumer keeps an inbox of processed event ids, so duplicates do nothing.
function makeConsumer() {
  var inbox = {}, shipped = [];
  return { handle: function (e) { if (inbox[e.eventId]) return 'skip duplicate ' + e.eventId; inbox[e.eventId] = true; shipped.push(e.payload.orderId); return 'shipped ' + e.payload.orderId; }, shipped: shipped };
}

var db = createDb(), broker = [], consumer = makeConsumer();
console.log('place A ok?', placeOrder(db, 'A', 30, false));
console.log('place B ok?', placeOrder(db, 'B', 20, true), '(rolled back: no order, no event)');
console.log('place C ok?', placeOrder(db, 'C', 45, false));
console.log('orders:', db.orders.map(function (o) { return o.id; }).join(','), ' outbox:', db.outbox.map(function (r) { return r.eventId + ':' + r.status; }).join(' '));

// Two relays race for the same rows. The claim step means each row is published once.
relayOnce(db, broker, 'relay-1');
relayOnce(db, broker, 'relay-2');
console.log('after 2 relays, broker has', broker.length, 'messages (no double publish)');

// Now the dangerous case: crash after publish, before SENT.
placeOrder(db, 'D', 10, false);
try { relayOnce(db, broker, 'relay-1', { crashAfterPublishOf: 'evt-D' }); } catch (e) { console.log(e.message); }
releaseStaleClaims(db);                 // lease expired
relayOnce(db, broker, 'relay-2');       // republishes evt-D: at-least-once
console.log('broker eventIds:', broker.map(function (m) { return m.eventId; }).join(' '));
broker.forEach(function (m) { console.log(' consumer ->', consumer.handle(m)); });
console.log('shipments created exactly once each:', consumer.shipped.join(','));` },
    { lang: 'java', title: 'Writing the order and the outbox row in one JDBC transaction', code: `import java.sql.*;
import java.util.UUID;

public class OrderService {
    /** Both inserts commit together or roll back together - that is the whole trick. */
    public String placeOrder(Connection conn, String customerId, long totalCents) throws SQLException {
        String orderId = UUID.randomUUID().toString();
        boolean oldAuto = conn.getAutoCommit();
        conn.setAutoCommit(false);                      // start a local transaction
        try (PreparedStatement o = conn.prepareStatement(
                 "INSERT INTO orders(id, customer_id, total_cents, status) VALUES (?,?,?, 'PENDING')");
             PreparedStatement x = conn.prepareStatement(
                 "INSERT INTO outbox(event_id, aggregate_id, type, payload, status) VALUES (?,?,?,?, 'PENDING')")) {
            o.setString(1, orderId);
            o.setString(2, customerId);
            o.setLong(3, totalCents);
            o.executeUpdate();

            x.setString(1, UUID.randomUUID().toString());  // eventId: consumers dedupe on this
            x.setString(2, orderId);                        // aggregate id = Kafka partition key
            x.setString(3, "OrderPlaced");
            x.setString(4, "{\\"orderId\\":\\"" + orderId + "\\",\\"totalCents\\":" + totalCents + "}");
            x.executeUpdate();

            conn.commit();                                  // order + event become visible together
            return orderId;
        } catch (SQLException e) {
            conn.rollback();                                // neither exists
            throw e;
        } finally {
            conn.setAutoCommit(oldAuto);
        }
    }
}` },
    { lang: 'sql', title: 'Outbox lifecycle in SQL (runs in SQLite)', code: `CREATE TABLE orders (id TEXT PRIMARY KEY, total_cents INTEGER, status TEXT);
CREATE TABLE outbox (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id TEXT UNIQUE,
  aggregate_id TEXT,
  type TEXT,
  payload TEXT,
  status TEXT DEFAULT 'PENDING',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 1) the business write and the event, one transaction
BEGIN;
INSERT INTO orders VALUES ('o-1', 5998, 'PENDING');
INSERT INTO outbox(event_id, aggregate_id, type, payload) VALUES ('e-1', 'o-1', 'OrderPlaced', '{"orderId":"o-1"}');
COMMIT;

-- 2) the relay finds work (oldest first keeps per-aggregate order)
SELECT id, event_id, type FROM outbox WHERE status = 'PENDING' ORDER BY id LIMIT 100;

-- 3) after the broker confirmed the publish
UPDATE outbox SET status = 'SENT' WHERE event_id = 'e-1';
SELECT event_id, status FROM outbox;` },
    { lang: 'sql', check: false, title: 'Postgres relay claim (illustrative)', code: `-- Several relay instances can run safely: SKIP LOCKED makes them take different rows.
BEGIN;
SELECT id, event_id, aggregate_id, type, payload
FROM outbox
WHERE status = 'PENDING'
ORDER BY id
LIMIT 100
FOR UPDATE SKIP LOCKED;
-- publish each row to Kafka (key = aggregate_id), wait for acks, then:
UPDATE outbox SET status = 'SENT' WHERE id = ANY(:ids);
COMMIT;` },
    { lang: 'json', check: false, title: 'Debezium outbox connector config (illustrative)', code: `{
  "name": "orders-outbox",
  "config": {
    "connector.class": "io.debezium.connector.postgresql.PostgresConnector",
    "database.hostname": "orders-db",
    "database.dbname": "orders",
    "table.include.list": "public.outbox",
    "transforms": "outbox",
    "transforms.outbox.type": "io.debezium.transforms.outbox.EventRouter",
    "transforms.outbox.table.field.event.key": "aggregate_id",
    "transforms.outbox.route.by.field": "type"
  }
}` }
  ],
  codeTitle: ['Outbox, relay and consumer (JS, runnable)', 'JDBC transaction (Java)', 'SQL lifecycle', 'Postgres claim', 'Debezium (CDC)'],
  viz: {
    title: 'Outbox rows move PENDING → SENT (and the crash case)',
    input: 'ok',
    inputLabel: 'Type ok, or crash (relay dies after publishing)',
    gen: function (input) {
      var mode = String(input === undefined ? 'ok' : input).trim().toLowerCase();
      if (mode !== 'ok' && mode !== 'crash') throw new Error('Type ok or crash');
      var frames = [], orders = [], outbox = [], broker = [], inbox = [];
      function ordRows() { return orders.map(function (o) { return o.slice(); }); }
      function outRows() { return outbox.map(function (r) { return r.slice(); }); }
      function outHl(map) { return map || {}; }
      function P(narr, hl, extra) {
        var ps = [
          { type: 'table', label: 'orders table (service DB)', columns: ['order', 'status'], rows: ordRows() },
          { type: 'table', label: 'outbox table (same DB)', columns: ['event', 'status', 'owner'], rows: outRows(), hl: outHl(hl) },
          { type: 'queue', label: 'broker topic: orders', items: broker.slice(), frontLabel: 'oldest', backLabel: 'newest' }
        ];
        if (inbox.length || extra) ps.push({ type: 'set', label: 'consumer inbox (processed eventIds)', items: inbox.slice() });
        frames.push({ narr: narr, parts: ps });
      }
      P('<b>Empty start.</b> The service has an <code>orders</code> table and an <code>outbox</code> table in the <i>same</i> database, plus a broker the relay will publish to.', {});
      orders.push(['o-1', 'PENDING']); outbox.push(['e-1 OrderPlaced', 'PENDING', '-']);
      P('<b>One transaction, two inserts.</b> <code>BEGIN; INSERT order; INSERT outbox; COMMIT;</code> Both rows appear together. If the process had died before COMMIT, neither row would exist.', { 0: 'ok' });
      orders.push(['o-2', 'PENDING']); outbox.push(['e-2 OrderPlaced', 'PENDING', '-']);
      P('A second order arrives. Again order and event commit together. Two events are waiting in the outbox.', { 0: 'ok', 1: 'ok' });
      outbox[0][1] = 'CLAIMED'; outbox[0][2] = 'relay-1';
      P('<b>Relay polls.</b> <code>relay-1</code> selects the oldest PENDING row with <code>FOR UPDATE SKIP LOCKED</code> and claims it. A second relay would skip this row, so no two relays publish the same one.', { 0: 'cur', 1: 'ok' });
      broker.push('e-1');
      if (mode === 'crash') {
        P('<b>Published!</b> <code>e-1</code> is in the broker topic. The row is still CLAIMED, not yet SENT.', { 0: 'cur', 1: 'ok' });
        P('<b class="c-r">relay-1 crashes right now</b> (before the UPDATE to SENT). The broker has the message, but the outbox row still says CLAIMED. The relay cannot know the publish worked.', { 0: 'bad', 1: 'ok' });
        outbox[0][1] = 'PENDING'; outbox[0][2] = '-';
        P('<b>Lease expires.</b> The stale claim is put back to PENDING. This is the safe choice: better to publish twice than never.', { 0: 'cur', 1: 'ok' });
        outbox[0][1] = 'CLAIMED'; outbox[0][2] = 'relay-2'; broker.push('e-1');
        P('<b>relay-2 publishes e-1 again.</b> The broker now holds a <span class="c-r">duplicate</span>. This is at-least-once delivery. Producer side did nothing wrong; it just could not tell.', { 0: 'bad', 1: 'ok' });
        outbox[0][1] = 'SENT';
      } else {
        P('<b>Publish to the broker.</b> The relay sends <code>e-1</code> and waits for the broker\'s ack. The row stays CLAIMED until we know the broker has it.', { 0: 'cur', 1: 'ok' });
        outbox[0][1] = 'SENT';
      }
      P('<b>Mark SENT.</b> The relay updates the row to SENT (or deletes it). This one event has now left the building.', { 0: 'win', 1: 'ok' });
      outbox[1][1] = 'CLAIMED'; outbox[1][2] = 'relay-1'; broker.push('e-2'); outbox[1][1] = 'SENT';
      P('The relay repeats for <code>e-2</code>: claim → publish → mark SENT. The outbox drains in id order, which keeps events for one order in order.', { 0: 'win', 1: 'win' });
      var seen = {};
      broker.forEach(function (m) { if (!seen[m]) { seen[m] = true; inbox.push(m); } });
      P(mode === 'crash' ? '<b>Consumer side.</b> It stores each eventId in an inbox. The duplicate <code>e-1</code> is recognised and skipped, so shipping is created <b>once</b>. At-least-once delivery + idempotent consumer = exactly-once <i>effect</i>.' : '<b>Consumer side.</b> It records each eventId in its inbox while processing, so even if a duplicate ever shows up it will be ignored.', { 0: 'win', 1: 'win' }, true);
      return frames;
    }
  },
  examples: [
    { title: 'Polling relay vs CDC', html: `${H.table(['', 'Polling publisher', 'CDC (Debezium)'], [['Latency', 'poll interval (50-500 ms)', 'tens of ms'], ['DB load', 'repeated SELECTs (needs index on status,id)', 'reads the WAL, almost none'], ['Setup', 'a loop in your app', 'Kafka Connect + connector + DB replication permissions'], ['Ordering', 'by id, single reader per aggregate', 'WAL order, preserved'], ['Failure story', 'lease timeout then republish', 'connector offset then replay']])}<p>Start with polling; move to CDC when latency or load demands it.</p>` },
    { title: 'Inbox table for idempotent consumers', html: `<p>The consumer handles a message and records its id <b>in the same local transaction</b> as its own side effects:</p><pre>BEGIN;
INSERT INTO inbox(event_id) VALUES (:id);   -- UNIQUE: fails on a duplicate
UPDATE shipments SET ...;
COMMIT;</pre><p>If the insert violates the unique key, the handler skips the work and acks the message. Clean up old inbox rows after the broker's retention period.</p>` },
    { title: 'Cleaning up', html: `<p>The outbox grows forever if you only flip a flag. Either <b>delete</b> sent rows (cheap in Postgres with partitioning by day, then drop old partitions) or keep them 7 days for audit and then purge. Index <code>(status, id)</code> partial where <code>status='PENDING'</code> so the poll stays instant even with millions of historical rows.</p><p>Monitor <b>oldest PENDING age</b>: if it grows, the relay is stuck. Alert at 1-2 minutes.</p>` }
  ],
  deepDive: `<p><b>🟣 Production details.</b></p>
    <ul>
      <li><b>Why not publish inside the transaction?</b> If you publish before commit and the commit fails, the event is a lie. If you publish after commit and crash, it is lost. Only "write intent in the DB, publish later" survives both crashes.</li>
      <li><b>Ordering.</b> Relay must send rows of one aggregate in order. With several relay threads, partition work by <code>hash(aggregate_id) % N</code> or use one relay per shard; Kafka's partition key = aggregate_id then keeps order downstream. Retries of a failed row must block later rows of the same aggregate.</li>
      <li><b>Kafka idempotent producer</b> (<code>enable.idempotence=true</code>) removes duplicates caused by <i>producer retries inside one session</i>, but not duplicates from a relay restart; you still need consumer-side dedupe (or Kafka transactions with read-committed consumers when the whole pipeline lives in Kafka).</li>
      <li><b>Outbox for sagas.</b> The orchestrator writes "saga state change + next command" in one transaction, so a crash cannot strand the saga. The same pattern gives you reliable <i>reply</i> messages from participants.</li>
      <li><b>Outbox vs Event Sourcing.</b> With event sourcing (Topic 8) the event log <i>is</i> the source of truth, so publishing from that log is the outbox.</li>
      <li><b>Payload design.</b> Include enough data for consumers (avoid callbacks), a schema version, a correlation id and a timestamp. Do not put secrets or full personal data in events that many teams can read.</li>
      <li><b>Alternatives and their traps:</b> "listen to yourself" (publish first, apply the change when the message comes back) is another way to avoid dual writes but delays read-your-own-writes; distributed 2PC/XA with the broker is possible with a few brokers yet hurts availability.</li>
    </ul>`,
  aiEra: `<p><b>What AI changes:</b> AI-driven pipelines (embedding refresh, RAG re-indexing, "notify the agent") are usually triggered by data changes. The outbox gives you a trustworthy change feed: "document updated" events are never lost, so your vector index does not silently drift from your database. It is also how you let an LLM-based worker react to business events without giving it direct database access.</p>
    <p><b>Use AI as a partner:</b> ask it to write the DDL, the polling query and index, plus a chaos test that kills the relay at every line; ask <code>what are the failure modes between each statement?</code> and compare with your own list.</p>
    <p><b>Where AI goes wrong:</b> it likes to call <code>kafka.send()</code> inside the <code>@Transactional</code> method and call it done (that is the bug), forgets lease timeouts for claimed rows, or claims the relay gives "exactly once". Check for: unique <code>event_id</code>, the claim step, the consumer inbox, a purge job.</p>
    <p><b>What you must still own:</b> the delivery-guarantee statement you put in the design doc ("at-least-once, consumers must be idempotent"), ordering requirements per aggregate, and the operational alerts (oldest pending age, relay lag).</p>`,
  problems: [
    {
      title: 'Implement an Outbox and a Relay',
      level: 'Medium', tags: ['outbox', 'relay', 'idempotency', 'at-least-once'], companies: ['Uber', 'Stripe', 'Zalando'],
      statement: `<p>The order service saves an order and must tell the broker <code>OrderPlaced</code>. Currently it does <code>repo.save(order); kafka.send(event);</code> and you see lost events after deploys. Implement the fix: the tables, the write path, a relay that publishes pending rows, how multiple relay instances avoid double publishing, what happens if the relay crashes after sending, and how the consumer stays correct.</p>`,
      constraints: `Postgres + Kafka · 200 orders/s · events for one order must stay in order · up to 3 relay instances · duplicates must never cause two shipments.`,
      example: `<p>Order <b>o-1</b> committed with outbox row <code>e-1</code> (PENDING). Relay publishes, crashes before marking SENT. After restart it publishes <code>e-1</code> again. The consumer's inbox already contains <code>e-1</code>: <span class="c-g">skipped</span>, one shipment.</p>`,
      brute: { why: `<p>Call <code>kafka.send</code> after <code>save</code> in the same method. A crash, a broker timeout or a deploy between the two lines loses the event forever, and nothing records that it should have been sent. Wrapping both in <code>@Transactional</code> does not help: Kafka is not part of the database transaction.</p>` },
      mcq: { q: 'What is the strongest delivery guarantee the outbox relay can give by itself?', options: ['Exactly once, always', 'At-most-once', 'At-least-once (consumers must be idempotent)', 'None'], answer: 2, explain: 'The relay can crash after publish and before marking SENT, so it re-publishes. That gives at-least-once. Consumer-side dedupe by eventId turns it into an exactly-once effect.' },
      hints: [
        `<p>Hint 1: the aha is to turn "send an event" into "insert a row", so the database transaction protects it.</p>`,
        `<p>Hint 2: add an <code>outbox(id, event_id UNIQUE, aggregate_id, type, payload, status)</code> table; relay selects PENDING with <code>FOR UPDATE SKIP LOCKED</code>, publishes with key = aggregate_id, then marks SENT.</p>`,
        `<p>Hint 3: handle the crash window (publish succeeded, mark failed) by accepting a duplicate, and add an inbox table on the consumer keyed by event_id inserted in the same transaction as its effect.</p>`
      ],
      solution: {
        approach: `<p><b>Write path.</b> In one <code>@Transactional</code> method: insert the order and an <code>outbox</code> row (status PENDING, unique <code>event_id</code> = new UUID, <code>aggregate_id</code> = orderId). Remove the direct <code>kafka.send</code>.</p>
          <p><b>Relay.</b> A scheduled loop (every 100 ms) runs: <code>SELECT ... WHERE status='PENDING' ORDER BY id LIMIT 100 FOR UPDATE SKIP LOCKED</code>. Each of the 3 relay instances locks a different slice, so rows are never published concurrently. For each row: <code>producer.send(topic, key=aggregate_id, value=payload)</code>; wait for the ack; then <code>UPDATE ... SET status='SENT'</code> and commit. Using key = orderId puts all events of one order on one partition, preserving order. Failed sends stop processing of that aggregate until success (to keep order) and use exponential backoff.</p>
          <p><b>Crash window.</b> If the relay dies after the ack but before the UPDATE commits, the lock is released with the transaction and the row is still PENDING, so the next pass publishes it again: <b>at-least-once</b>. Enable <code>enable.idempotence=true</code> to de-duplicate producer-internal retries, but do not rely on it for restart duplicates.</p>
          <p><b>Consumer.</b> In one transaction: <code>INSERT INTO inbox(event_id)</code> (primary key) then perform the shipment. A duplicate violates the key, the handler acks and skips. Result: exactly-once <i>effect</i>.</p>
          <p><b>Operations.</b> Index <code>(id) WHERE status='PENDING'</code>; purge SENT rows older than 7 days; alert if oldest PENDING age exceeds 60 s; dashboard for relay throughput and DLQ. At 200 events/s a single relay batch of 100 per 100 ms is plenty; CDC with Debezium is the upgrade path if polling load matters.</p>`,
        dry: { head: ['Step', 'outbox row e-1', 'Broker', 'Consumer inbox'], rows: [['commit order', 'PENDING', '[]', '{}'], ['relay claims + publishes', 'PENDING (lock held)', '[e-1]', '{}'], ['<span class="c-r">relay crashes</span>', 'PENDING (lock released)', '[e-1]', '{}'], ['relay restarts, publishes again', 'PENDING then SENT', '[e-1, e-1]', '{}'], ['consumer handles both', 'SENT', '[e-1, e-1]', '{e-1} (2nd skipped)']] },
        complexity: `<p>Write path adds one insert (same transaction). Relay: O(batch) per poll with an index on pending rows. Throughput scales with the number of relays and Kafka partitions.</p>`,
        followUps: ['How would CDC change the design?', 'How do you keep per-order ordering with 3 relays?']
      }
    }
  ]
});

/* =====================================================================
   TOPIC 7 — CQRS
   ===================================================================== */
topics.push({
  title: 'CQRS: Separate the Write Model from the Read Model',
  analogy: `<p>A library has a <b>back office</b> where librarians carefully log every returned book against strict rules (who, when, fines). It also has a <b>public catalog screen</b> that shows "available / on loan" instantly, sorted and searchable. The screen is not the ledger: it is a <i>copy</i> shaped for quick looking-up and updated shortly after the back office writes.</p>
    <p>Writing needs rules and accuracy. Reading needs speed and convenient shapes. Using one single structure for both makes each job worse.</p>`,
  explain: `<p><b>🟢 The plain idea.</b> <b>CQRS = Command Query Responsibility Segregation.</b> Split your service into two sides:</p>
    <ul>
      <li><b>Commands (write side)</b> — "PlaceOrder", "CancelOrder". They validate business rules and change state. They return success/failure, not data views.</li>
      <li><b>Queries (read side)</b> — "show my last 20 orders with product names". They never change anything and read from a <b>read model</b> built to answer exactly those questions.</li>
    </ul>
    <p>The sides connect through <b>events</b>: when the write side changes state it emits <code>OrderPlaced</code>; a <b>projector</b> on the read side consumes it and updates the read model (a denormalised table, a search index like Elasticsearch, a Redis cache).</p>
    ${H.table(['', 'Write model', 'Read model'], [
      ['Shape', 'normalised, strict, invariants', 'denormalised, pre-joined, per screen'],
      ['Optimised for', 'correct transactions', 'fast reads, search, reporting'],
      ['Store', 'Postgres / event store', 'Elasticsearch, Redis, Mongo, a Postgres view'],
      ['Scale', 'moderate writes', 'scale reads independently, many replicas'],
      ['Consistency', 'strong inside the aggregate', '<span class="c-y">eventual</span> (a short lag)']
    ])}
    <p><b>Why bother in microservices?</b> Because a screen like "order history with product names, seller and delivery status" needs data from four services, and you may not <i>join</i> across service databases. A read model subscribes to events from those services and builds the joined view locally: an <b>API composition</b> done ahead of time, not at request time.</p>
    <p><b>The price:</b> the read side is <b>eventually consistent</b>. A user may place an order, be redirected to "My orders" and not see it for 200 ms. Handle it in the UI (optimistic display, "processing…" row), by reading your own write from the command side for a moment, or by waiting for the projection version.</p>
    <p><b>Levels of CQRS:</b> (1) same database, separate query code/views — a cheap first step; (2) separate read tables updated by events; (3) separate stores with different technology, optionally combined with event sourcing. Use the smallest level that solves the real problem.</p>`,
  clues: [
    '"Read-heavy: 100:1 reads to writes, different shapes" → CQRS read model',
    '"Screen needs data from several services, no cross-service join" → event-fed read model / composition',
    '"Search, filters, full-text" → project into Elasticsearch/OpenSearch',
    '"Reports slow down the transactional database" → separate read store',
    '"Eventually consistent view is acceptable" → projector with lag monitoring',
    '"Rebuild the view from scratch" → replay events into a new projection'
  ],
  code: [
    { lang: 'js', run: true, title: 'CQRS projector with checkpoint, replay and dedupe (runnable)', code: `// Events come from the write side. The projector builds a read model "spend per customer".
var eventLog = [
  { seq: 1, type: 'OrderPlaced',    orderId: 'o1', customer: 'asha', cents: 3000 },
  { seq: 2, type: 'OrderPlaced',    orderId: 'o2', customer: 'ben',  cents: 2000 },
  { seq: 3, type: 'OrderPlaced',    orderId: 'o3', customer: 'asha', cents: 1500 },
  { seq: 4, type: 'OrderCancelled', orderId: 'o2' },
  { seq: 5, type: 'CustomerRenamed', old: 'asha', name: 'Asha K' }
];

function createProjection() {
  return { lastSeq: 0, byCustomer: {}, orders: {} };   // checkpoint + view
}

// Idempotent: if we already applied seq, do nothing. Safe to receive duplicates.
function apply(view, e) {
  if (e.seq <= view.lastSeq) return false;
  if (e.type === 'OrderPlaced') {
    view.orders[e.orderId] = { customer: e.customer, cents: e.cents };
    var c = view.byCustomer[e.customer] || (view.byCustomer[e.customer] = { orders: 0, cents: 0 });
    c.orders += 1; c.cents += e.cents;
  } else if (e.type === 'OrderCancelled') {
    var o = view.orders[e.orderId];
    if (o) { var cc = view.byCustomer[o.customer]; cc.orders -= 1; cc.cents -= o.cents; delete view.orders[e.orderId]; }
  } else if (e.type === 'CustomerRenamed') {
    view.byCustomer[e.name] = view.byCustomer[e.old]; delete view.byCustomer[e.old];
    Object.keys(view.orders).forEach(function (id) { if (view.orders[id].customer === e.old) view.orders[id].customer = e.name; });
  }
  view.lastSeq = e.seq;
  return true;
}

function show(label, view) { console.log(label + ' (lastSeq=' + view.lastSeq + ') ' + JSON.stringify(view.byCustomer)); }

// Live projection: events arrive one by one, with a duplicate delivery of seq 2.
var live = createProjection();
[1, 2, 2, 3].forEach(function (s) { apply(live, eventLog[s - 1]); });
show('live after seq 1,2,2,3', live);

// A query only reads the view; it may be a little behind the log (eventual consistency).
console.log('lag =', eventLog.length - live.lastSeq, 'events behind');
apply(live, eventLog[3]); apply(live, eventLog[4]);
show('live caught up        ', live);

// Rebuild: a brand-new projection replays the whole log (e.g. after a bug fix or a new screen).
var rebuilt = createProjection();
eventLog.forEach(function (e) { apply(rebuilt, e); });
show('rebuilt from scratch  ', rebuilt);
console.log('same result?', JSON.stringify(live.byCustomer) === JSON.stringify(rebuilt.byCustomer));` },
    { lang: 'java', title: 'Command side and query side as separate types (plain Java)', code: `import java.util.*;

public class CqrsDemo {
    // ---- write side: validates rules, emits events ----
    record PlaceOrder(String orderId, String customer, long cents) {}
    record OrderPlaced(String orderId, String customer, long cents) {}

    static class OrderCommandHandler {
        private final Set<String> existing = new HashSet<>();
        List<OrderPlaced> handle(PlaceOrder cmd) {
            if (cmd.cents() <= 0) throw new IllegalArgumentException("total must be positive");
            if (!existing.add(cmd.orderId())) return List.of();   // idempotent: same order id twice = no new event
            return List.of(new OrderPlaced(cmd.orderId(), cmd.customer(), cmd.cents()));
        }
    }

    // ---- read side: a view shaped for one screen; updated by events only ----
    static class SpendView {
        private final Map<String, Long> spendByCustomer = new TreeMap<>();
        void on(OrderPlaced e) { spendByCustomer.merge(e.customer(), e.cents(), Long::sum); }
        Map<String, Long> query() { return Collections.unmodifiableMap(spendByCustomer); }
    }

    public static void main(String[] args) {
        OrderCommandHandler commands = new OrderCommandHandler();
        SpendView view = new SpendView();
        List<PlaceOrder> inbox = List.of(new PlaceOrder("o1", "asha", 3000), new PlaceOrder("o2", "ben", 2000),
                                         new PlaceOrder("o1", "asha", 3000), new PlaceOrder("o3", "asha", 1500));
        for (PlaceOrder cmd : inbox) {
            for (OrderPlaced ev : commands.handle(cmd)) view.on(ev); // in real life: broker in between
        }
        System.out.println(view.query());   // {asha=4500, ben=2000}
    }
}` },
    { lang: 'sql', title: 'A denormalised read table built for one screen (SQLite)', code: `-- Write side tables (normalised)
CREATE TABLE orders (id TEXT PRIMARY KEY, customer_id TEXT, status TEXT);
CREATE TABLE order_lines (order_id TEXT, sku TEXT, qty INTEGER, cents INTEGER);
CREATE TABLE products (sku TEXT PRIMARY KEY, name TEXT);
INSERT INTO products VALUES ('TS-M', 'T-shirt M'), ('MUG', 'Coffee mug');
INSERT INTO orders VALUES ('o1', 'asha', 'PAID'), ('o2', 'asha', 'SHIPPED');
INSERT INTO order_lines VALUES ('o1', 'TS-M', 2, 2999), ('o2', 'MUG', 1, 899);

-- Read side: ONE wide row per order, already joined. The projector keeps it fresh.
CREATE TABLE order_history_view (
  order_id TEXT PRIMARY KEY, customer_id TEXT, status TEXT,
  item_summary TEXT, total_cents INTEGER
);
INSERT INTO order_history_view
SELECT o.id, o.customer_id, o.status,
       GROUP_CONCAT(p.name || ' x' || l.qty, ', '),
       SUM(l.qty * l.cents)
FROM orders o JOIN order_lines l ON l.order_id = o.id JOIN products p ON p.sku = l.sku
GROUP BY o.id;

-- The query side is now a trivial single-table read.
SELECT * FROM order_history_view WHERE customer_id = 'asha' ORDER BY order_id;` }
  ],
  codeTitle: ['Projector (JS, runnable)', 'Command/query types (Java)', 'Read model table (SQL)'],
  viz: {
    title: 'CQRS: command → event → projector → read model (with lag)',
    input: 'asha:30 ben:20 asha:15',
    inputLabel: 'Orders as customer:amount (1-4, space separated)',
    gen: function (input) {
      var toks = words(input, 1, 4, 'asha:30 ben:20 asha:15');
      var evs = toks.map(function (t) { var p = t.split(':'); var n = Number(p[1]); if (p.length !== 2 || !p[0] || isNaN(n) || n <= 0) throw new Error('Use name:amount like asha:30'); return { c: p[0], n: n }; });
      var nodes = [bx('cl', 'Client', 8, 30), bx('cmd', 'Command side', 34, 12), bx('wdb', 'Write DB', 34, 50), bx('bus', 'Event bus', 60, 30), bx('prj', 'Projector', 82, 12), bx('rdb', 'Read model', 82, 50)];
      var frames = [], log = [], view = {}, written = [];
      function viewRows() { return Object.keys(view).map(function (k) { return [k, view[k].n, view[k].sum]; }); }
      function writeRows() { return written.map(function (w, i) { return ['o' + (i + 1), w.c, w.n]; }); }
      function parts(edges, hl, ehl, withView) {
        var ps = [{ type: 'graph', directed: true, height: 60, nodes: nodes, edges: edges, hl: hl || {}, ehl: ehl || {} },
                  { type: 'table', label: 'WRITE model (normalised orders)', columns: ['order', 'customer', 'amount'], rows: writeRows() },
                  { type: 'table', label: 'READ model (spend per customer)', columns: ['customer', '#orders', 'total'], rows: viewRows() }];
        return ps;
      }
      frames.push({ narr: 'Two sides of one service. The <b>write side</b> enforces rules; the <b>read side</b> holds a table shaped for one screen ("spend per customer"). They only talk through events.', parts: parts([['cl', 'cmd'], ['cmd', 'wdb'], ['cmd', 'bus'], ['bus', 'prj'], ['prj', 'rdb']], { cmd: 'cur' }, {}) });
      for (var i = 0; i < evs.length; i++) {
        var e = evs[i], id = 'o' + (i + 1);
        written.push(e);
        frames.push({ narr: '<b>Command ' + id + ':</b> <code>PlaceOrder(' + e.c + ', ' + e.n + ')</code>. The command side validates it (amount &gt; 0, no duplicate id) and saves it to the write DB.', parts: parts([['cl', 'cmd', 'PlaceOrder'], ['cmd', 'wdb', 'INSERT']], { cmd: 'cur', wdb: 'ok' }, { 'cmd-wdb': 'ok' }) });
        log.push(e);
        var stale = Object.keys(view).length ? 'The read model still shows the <i>old</i> numbers for a moment: <b class="c-y">eventual consistency</b>.' : 'A query right now would find the read model empty: the order exists but is not visible yet.';
        frames.push({ narr: '<b>Event published:</b> <code>OrderPlaced ' + id + '</code> goes on the bus. ' + stale, parts: parts([['cmd', 'bus', 'OrderPlaced']], { bus: 'cur' }, { 'cmd-bus': 'sel' }) });
        if (!view[e.c]) view[e.c] = { n: 0, sum: 0 };
        view[e.c].n += 1; view[e.c].sum += e.n;
        var hlRow = {}; Object.keys(view).forEach(function (k, ix) { if (k === e.c) hlRow[ix] = 'ok'; });
        var fp = parts([['bus', 'prj'], ['prj', 'rdb', 'UPSERT']], { prj: 'cur', rdb: 'ok' }, { 'prj-rdb': 'ok' });
        fp[2].hl = hlRow;
        frames.push({ narr: '<b>Projector applies it:</b> it does an upsert into the read table (<code>' + e.c + '</code> now has ' + view[e.c].n + ' order' + (view[e.c].n > 1 ? 's' : '') + ', total ' + view[e.c].sum + '). Queries now see the new data. The view is rebuildable by replaying the events.', parts: fp });
      }
      frames.push({ narr: '<b>Query side:</b> <code>GET /spend</code> reads only the read model: one cheap single-table read, no joins, no locks on the write DB. Reads can scale out with replicas independently from writes.', parts: parts([['cl', 'rdb', 'GET /spend']], { cl: 'cur', rdb: 'sel' }, { 'cl-rdb': 'sel' }) });
      return frames;
    }
  },
  examples: [
    { title: 'Order history across services without a join', html: `<p>The "My orders" screen needs order data (Orders svc), product names/images (Catalog svc) and delivery status (Shipping svc). Instead of calling three services on every page view, a <b>read model service</b> subscribes to <code>OrderPlaced</code>, <code>ProductRenamed</code>, <code>ShipmentUpdated</code> and keeps one document per order in Elasticsearch/Mongo:</p><pre>{ "orderId": "o1", "items": ["T-shirt M x2"], "status": "SHIPPED", "eta": "Oct 18" }</pre><p>The page load becomes one fast lookup, and it still works when Shipping is down (stale status, not an error).</p>` },
    { title: 'Read-your-own-writes in the UI', html: `<p>After <code>POST /orders</code> the server returns <code>201</code> with the order id <b>and a version</b> (the event sequence number). The next <code>GET /orders?minVersion=17</code> waits up to 1 s for the projection to reach version 17, or the UI simply inserts the new order optimistically at the top of the list marked "processing". Both hide the small lag from the user.</p>` },
    { title: 'When one extra index is enough', html: `<p>Your slow report may just need an index or a Postgres read replica. CQRS has real costs: two models, a projector to run and monitor, replay tooling and inconsistency to explain to the product team. Try these first: right indexes, materialised view, read replica, cache. Reach for CQRS when read and write shapes truly differ or reads must scale far beyond writes.</p>` }
  ],
  deepDive: `<p><b>🟣 Making projections production-grade.</b></p>
    <ul>
      <li><b>Idempotent, ordered projectors.</b> Store a <code>last_applied_seq</code> (checkpoint) per partition/aggregate, in the <i>same transaction</i> as the view update. Skip events with a seq ≤ checkpoint; hold back out-of-order ones. This makes at-least-once delivery safe.</li>
      <li><b>Rebuild strategy.</b> Keep events long enough (or snapshots) to replay. Build the new version of the view <i>beside</i> the old one (<code>order_view_v2</code>), catch up, then switch the alias atomically — zero downtime schema changes in the read model.</li>
      <li><b>Measure lag.</b> Export "projection lag = newest event seq − projector seq" and "age of newest applied event". Alert on both; show it on a dashboard. SLO example: p99 lag &lt; 2 s.</li>
      <li><b>Multiple read models.</b> One event stream can feed a search index, a cache, a data warehouse and a recommendation store. Each is independent, so each can fail and be rebuilt alone.</li>
      <li><b>Where does a "query" that needs strong consistency go?</b> To the write side (read by aggregate id), not the read model. Do not route authorisation decisions or inventory-availability checks through an eventually-consistent view.</li>
      <li><b>Commands are not CRUD.</b> Name them after intent (<code>CancelOrder</code>, not <code>UpdateOrderStatus</code>); this keeps the business rules in one place and gives meaningful events.</li>
      <li><b>CQRS ≠ event sourcing.</b> You can do CQRS with a plain relational write DB (events from the outbox), and you can do event sourcing without separate read stores. They combine well but are independent decisions.</li>
      <li><b>Security & PII:</b> read models duplicate data; apply the same retention and deletion rules (GDPR "forget me" must erase every projection, which is easier if projections can be rebuilt from events that exclude or encrypt personal data).</li>
    </ul>`,
  aiEra: `<p><b>What AI changes:</b> The read side is the natural home for AI features. A projector can feed a <b>vector index</b> (embeddings) for semantic search, a recommendation store, or a summarised "customer 360" document an LLM assistant reads. Because the projection is rebuilt by replaying events, switching to a better embedding model means building a new projection and swapping it in — the same replay mechanics as any other read model.</p>
    <p><b>Use AI as a partner:</b> describe a screen and ask <code>propose the read-model schema and the list of events that must update it</code>; ask it to generate replay tests ("apply the same events twice, out of order, with gaps") and compare the final view with a fresh rebuild.</p>
    <p><b>Where AI goes wrong:</b> it creates read models that quietly depend on the write DB (calling it from the projector), forgets idempotency and checkpoints, and treats eventual consistency as a bug to "fix" with distributed locks. Also, LLM answers built on a stale read model can sound confident and be wrong — expose freshness timestamps.</p>
    <p><b>What you must still own:</b> which reads must be strongly consistent, the lag SLO, the rebuild plan, and personal-data deletion across all projections.</p>`,
  problems: [
    {
      title: 'Design the Order-History Read Model',
      level: 'Medium', tags: ['CQRS', 'projection', 'eventual consistency'], companies: ['Amazon', 'Walmart', 'Etsy'],
      statement: `<p>The "My orders" page joins data from Orders, Catalog and Shipping and is slow (4 service calls per page). Design a CQRS read model: its storage, which events update it, how it handles duplicate/out-of-order events, how users see their own new order immediately, and how you would ship a new field (delivery ETA) without downtime.</p>`,
      constraints: `50M orders · page load p99 under 200 ms · 5,000 reads/s but 50 writes/s · lag under 2 s acceptable · must survive projector crashes.`,
      example: `<p>Events: <code>OrderPlaced(o1)</code>, <code>ProductRenamed(TS-M)</code>, <code>ShipmentUpdated(o1, SHIPPED)</code> → read doc for o1 updated three times, final status <span class="c-g">SHIPPED</span>.</p>`,
      brute: { why: `<p>Compose the page at request time: call Orders, then Catalog for each product, then Shipping for each parcel. 4+ network calls per page, p99 is the slowest of all of them, and any outage breaks the whole page. At 5,000 reads/s you also hammer three services for data that rarely changes.</p>` },
      mcq: { q: 'A user places an order and the order list does not show it for a moment. What is this?', options: ['A bug that needs distributed transactions', 'Expected eventual consistency of the read model', 'Data loss', 'A cache stampede'], answer: 1, explain: 'The projector applies the event shortly after the write, so the read model briefly lags. Hide it with optimistic UI or by waiting for the projection version.' },
      hints: [
        `<p>Hint 1: the aha is to do the join <b>ahead of time</b> when events happen, not at read time.</p>`,
        `<p>Hint 2: a document per order keyed by orderId in a store built for reads (Elasticsearch/Mongo/Dynamo); a projector consumes OrderPlaced, ProductRenamed, ShipmentUpdated.</p>`,
        `<p>Hint 3: store lastSeq per order to ignore duplicates and stale events; return the version on writes for read-your-own-writes; build the view v2 side by side for the new field.</p>`
      ],
      solution: {
        approach: `<p><b>Store.</b> One document per order in a read-optimised store (e.g. DynamoDB or Elasticsearch partitioned by customerId so "my orders" is a single-partition query sorted by date). The document already contains item names, thumbnails, status and ETA.</p>
          <p><b>Projector.</b> Consumes three topics (Orders, Catalog, Shipping; keyed by orderId / sku). <code>OrderPlaced</code> creates the doc; <code>ShipmentUpdated</code> patches status; <code>ProductRenamed</code> updates every doc containing the sku via a secondary index (batched, low priority). Every doc stores <code>lastSeq</code> per source stream; an event with seq ≤ lastSeq is ignored (idempotent), a gap is parked briefly then re-fetched. Checkpoint offsets are committed after the write, giving at-least-once safely.</p>
          <p><b>Read-your-own-writes.</b> <code>POST /orders</code> returns <code>{orderId, version}</code>; the client then calls <code>GET /orders</code> with <code>minVersion</code>, which waits up to 1 s for the projection to catch up, otherwise the UI inserts the new order locally marked "processing".</p>
          <p><b>New field without downtime.</b> Deploy projector v2 writing to index <code>order_view_v2</code>, replay the event log from the start (or from a snapshot) until lag is near 0, verify counts against v1, then flip the alias used by the query API and later delete v1. Fall back by flipping the alias back.</p>
          <p><b>Operations.</b> Dashboards for lag (seq and seconds), dead-letter queue for poison events, rebuild runbook, GDPR delete handled by replaying with the user's events removed or tombstoned.</p>`,
        dry: { head: ['Event', 'Doc for o1 after applying', 'lastSeq', 'Note'], rows: [['OrderPlaced(o1) seq 1', '{items: [T-shirt], status: PAID}', '1', 'create'], ['ShipmentUpdated seq 2', '{..., status: SHIPPED}', '2', 'patch'], ['ShipmentUpdated seq 2 (dup)', 'unchanged', '2', '<span class="c-g">ignored: seq ≤ lastSeq</span>'], ['ProductRenamed (sku)', '{items: [Tee Medium], ...}', '2', 'batch fan-out by sku']] },
        complexity: `<p>Read: one partition query, O(page size), p99 about 20-50 ms. Write amplification: 1 event updates 1 doc (renames fan out to many docs, so batch them).</p>`,
        followUps: ['How do you fix a projector bug that corrupted 10% of documents?', 'Would you use event sourcing here? Why or why not?']
      }
    }
  ]
});

/* =====================================================================
   TOPIC 8 — Event Sourcing
   ===================================================================== */
topics.push({
  title: 'Event Sourcing: State Is the Fold of Its History',
  analogy: `<p>Your <b>bank statement</b> does not store "balance = 420". It lists every deposit and withdrawal, and the balance is what you get by adding them up. If a line is disputed, the bank can replay the list and prove the number. A normal database table is like a sticky note with only the latest balance: the history is gone.</p>
    <p>Event sourcing keeps the statement as the truth, and treats the balance as a <b>derived</b> value you can recompute any time, even "as of last Tuesday".</p>`,
  explain: `<p><b>🟢 The plain idea.</b> Normally you store the <i>current state</i> and overwrite it on every change (<code>UPDATE account SET balance = 420</code>). With <b>event sourcing</b> you never overwrite. You append immutable <b>events</b> describing what happened — <code>AccountOpened</code>, <code>MoneyDeposited(100)</code>, <code>MoneyWithdrawn(30)</code> — to an append-only <b>event store</b>. Current state = <b>fold</b> (reduce) of all events: start from empty, apply each event in order.</p>
    ${H.table(['#', 'Event', 'Balance after (fold)'], [['1', 'AccountOpened', '0'], ['2', 'Deposited 100', '100'], ['3', 'Withdrawn 30', '70'], ['4', 'Deposited 50', '120']])}
    <p><b>How a command works:</b></p>
    <ol>
      <li>Load the aggregate's events (e.g. all events of account A-7) and fold them into current state.</li>
      <li>Check the business rule against that state ("withdraw 500 allowed? balance is 120 → no").</li>
      <li>If valid, <b>append</b> new event(s). Use <b>optimistic concurrency</b>: "append only if the stream is still at version 4"; otherwise someone else wrote first → retry.</li>
      <li>Publish the new events (outbox/log tailing) so projections and other services react.</li>
    </ol>
    <p><b>What you get:</b> a perfect <b>audit trail</b>, <b>time travel</b> (state at any moment), the ability to <b>rebuild</b> any read model, easy debugging ("replay what happened"), and natural events for other services. <b>What it costs:</b> a different mindset, eventual consistency with read models (so usually paired with CQRS), event schema versioning forever, and replaying long histories needs <b>snapshots</b> (store the folded state every N events and fold only the tail).</p>
    <p><b>Events are facts in the past tense</b>, named in business language: <code>OrderShipped</code>, not <code>OrderUpdated</code>. A mistake is not edited away; you append a <b>correcting event</b> (<code>DepositReversed</code>), just as accountants post a reversal instead of erasing a line.</p>`,
  clues: [
    '"Full audit trail / who changed what and when" → event sourcing',
    '"Reconstruct state as of a past date" / "time travel" → replay events up to T',
    '"Rebuild the read model / fix a bug in a projection" → replay from the log',
    '"Financial ledger, inventory movements, order lifecycle" → natural event-sourced domains',
    '"Concurrent writers to one aggregate" → optimistic concurrency via expected version',
    '"Replaying 5 million events is slow" → snapshots every N events'
  ],
  code: [
    { lang: 'python', run: true, title: 'Event-sourced account: fold events to balance (runnable)', code: `# Events are immutable facts. State is derived by folding them.
events = []   # the append-only event store for ONE account stream

def append(event, expected_version):
    """Optimistic concurrency: append only if nobody else wrote since we read."""
    if len(events) != expected_version:
        raise RuntimeError('version conflict: expected %d, stream is at %d' % (expected_version, len(events)))
    events.append(event)

def apply(state, e):
    """Pure function: (state, event) -> new state. No I/O, no randomness."""
    kind = e['type']
    if kind == 'Opened':
        return {'balance': 0, 'open': True}
    if kind == 'Deposited':
        return {**state, 'balance': state['balance'] + e['amount']}
    if kind == 'Withdrawn':
        return {**state, 'balance': state['balance'] - e['amount']}
    if kind == 'Closed':
        return {**state, 'open': False}
    return state   # unknown events are ignored (forward compatibility)

def fold(evts, state=None):
    state = state or {'balance': 0, 'open': False}
    for e in evts:
        state = apply(state, e)
    return state

def withdraw(amount):
    """Command handler: load, decide, append."""
    version = len(events)
    state = fold(events)
    if not state['open']:
        return 'rejected: account closed'
    if amount > state['balance']:
        return 'rejected: insufficient funds (balance %d)' % state['balance']
    append({'type': 'Withdrawn', 'amount': amount}, version)
    return 'ok'

append({'type': 'Opened'}, 0)
append({'type': 'Deposited', 'amount': 100}, 1)
print('withdraw 30  ->', withdraw(30))
append({'type': 'Deposited', 'amount': 50}, len(events))
print('withdraw 500 ->', withdraw(500))
print('current state:', fold(events))
print('state after first 3 events (time travel):', fold(events[:3]))

# Snapshot: remember (state, version) and fold only the tail.
snapshot = (fold(events[:3]), 3)
print('from snapshot  :', fold(events[snapshot[1]:], snapshot[0]))

# A stale writer is rejected instead of overwriting.
try:
    append({'type': 'Deposited', 'amount': 1}, 2)
except RuntimeError as err:
    print('conflict ->', err)` },
    { lang: 'java', title: 'Same fold in Java (records + sealed interface)', code: `import java.util.*;

public class AccountEs {
    sealed interface Event permits Opened, Deposited, Withdrawn {}
    record Opened() implements Event {}
    record Deposited(long amount) implements Event {}
    record Withdrawn(long amount) implements Event {}

    record State(long balance, boolean open) {
        State apply(Event e) {
            return switch (e) {
                case Opened o -> new State(0, true);
                case Deposited d -> new State(balance + d.amount(), open);
                case Withdrawn w -> new State(balance - w.amount(), open);
            };
        }
    }

    static State fold(List<Event> events) {
        State s = new State(0, false);
        for (Event e : events) s = s.apply(e);
        return s;
    }

    public static void main(String[] args) {
        List<Event> store = new ArrayList<>(List.of(new Opened(), new Deposited(100), new Withdrawn(30), new Deposited(50)));
        System.out.println(fold(store));                 // State[balance=120, open=true]
        System.out.println(fold(store.subList(0, 3)));   // as of event 3: balance=70
    }
}` },
    { lang: 'sql', title: 'An event store table (SQLite) with optimistic concurrency', code: `CREATE TABLE events (
  stream_id TEXT NOT NULL,          -- aggregate id, e.g. account A-7
  version   INTEGER NOT NULL,       -- 1,2,3... per stream
  type      TEXT NOT NULL,
  data      TEXT NOT NULL,          -- JSON payload
  at        TEXT DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (stream_id, version)  -- two writers cannot both append version 4
);
INSERT INTO events(stream_id, version, type, data) VALUES
  ('A-7', 1, 'Opened', '{}'),
  ('A-7', 2, 'Deposited', '{"amount":100}'),
  ('A-7', 3, 'Withdrawn', '{"amount":30}'),
  ('A-7', 4, 'Deposited', '{"amount":50}');

-- Current balance = fold of the stream (here expressed as a SQL aggregate).
SELECT SUM(CASE type WHEN 'Deposited' THEN json_extract(data, '$.amount')
                     WHEN 'Withdrawn' THEN -json_extract(data, '$.amount') ELSE 0 END) AS balance
FROM events WHERE stream_id = 'A-7';

-- Time travel: balance as of version 3.
SELECT SUM(CASE type WHEN 'Deposited' THEN json_extract(data, '$.amount')
                     WHEN 'Withdrawn' THEN -json_extract(data, '$.amount') ELSE 0 END) AS balance_v3
FROM events WHERE stream_id = 'A-7' AND version <= 3;` }
  ],
  codeTitle: ['Account fold (Python, runnable)', 'Same in Java', 'Event store table (SQL)'],
  viz: {
    title: 'Event log folding into the current balance',
    input: 'd100 w30 d50 w500 w20',
    inputLabel: 'Events: dNN deposit, wNN withdraw (1-8 events)',
    gen: function (input) {
      var toks = words(input, 1, 8, 'd100 w30 d50 w500 w20');
      var evs = toks.map(function (t) { var k = t.charAt(0).toLowerCase(), n = parseInt(t.slice(1), 10); if ((k !== 'd' && k !== 'w') || isNaN(n) || n <= 0) throw new Error('Use d100 or w30 style tokens'); return { k: k, n: n }; });
      var frames = [], rows = [], hl = {}, bal = 0, ver = 0;
      function tbl(extraHl) { return { type: 'table', label: 'event store (append-only)', columns: ['v', 'event', 'result'], rows: rows.map(function (r) { return r.slice(); }), hl: extraHl || {} }; }
      frames.push({ narr: 'The account has an <b>empty event stream</b>. State is not stored anywhere; it is whatever you get by folding the events. Start state: balance 0.', parts: [tbl(), { type: 'vars', label: 'state = fold(events)', vals: { balance: 0, version: 0 } }] });
      rows.push([1, 'Opened', 'ok']); ver = 1;
      frames.push({ narr: '<b>Event 1: Opened.</b> Appended; fold applies it. Events are never edited or deleted, only appended.', parts: [tbl({ 0: 'ok' }), { type: 'vars', label: 'state = fold(events)', vals: { balance: 0, version: ver }, hl: { version: 'ok' } }] });
      evs.forEach(function (e) {
        var name = e.k === 'd' ? 'Deposited ' + e.n : 'Withdrawn ' + e.n;
        if (e.k === 'w' && e.n > bal) {
          frames.push({ narr: '<b>Command: withdraw ' + e.n + '.</b> Load the stream, fold it → balance is ' + bal + '. The rule says no overdraft, so the command is <span class="c-r">REJECTED</span> and <b>no event is appended</b>. History only holds things that actually happened.', parts: [tbl({ [rows.length - 1]: 'cur' }), { type: 'vars', label: 'state = fold(events)', vals: { balance: bal, version: ver, command: 'withdraw ' + e.n + ' → rejected' }, hl: { command: 'bad' } }] });
          return;
        }
        bal += e.k === 'd' ? e.n : -e.n; ver += 1;
        rows.push([ver, name, 'balance ' + bal]);
        var h = {}; h[rows.length - 1] = e.k === 'd' ? 'ok' : 'cur';
        frames.push({ narr: '<b>Event ' + ver + ': ' + name + '.</b> Command checked against the folded state, then the fact is appended. Fold: ' + (e.k === 'd' ? 'balance + ' : 'balance − ') + e.n + ' = <b>' + bal + '</b>.', parts: [tbl(h), { type: 'vars', label: 'state = fold(events)', vals: { balance: bal, version: ver }, hl: { balance: 'ok' } }] });
      });
      var allHl = {}; rows.forEach(function (r, i) { allHl[i] = 'win'; });
      frames.push({ narr: '<b>Replay / rebuild.</b> Throw the balance away and fold the whole log again: you must get <b>' + bal + '</b>. This is also how you build new read models, audit a dispute, or get the balance "as of event 3" by folding only the first three.', parts: [tbl(allHl), { type: 'vars', label: 'rebuilt state', vals: { balance: bal, version: ver, 'as of event 3': (function () { var b = 0; for (var i = 1; i < Math.min(3, rows.length); i++) { var m = rows[i][1].split(' '); b += m[0] === 'Deposited' ? Number(m[1]) : -Number(m[1]); } return rows.length >= 3 ? b : 'n/a'; })() }, hl: { balance: 'sel' } }] });
      return frames;
    }
  },
  examples: [
    { title: 'Snapshots keep replay fast', html: `<p>An account with 2 million events cannot be folded on every command. Every 500 events store a snapshot <code>(version 12000, state)</code>. To load: read the latest snapshot, then fold only events with <code>version &gt; 12000</code> — about 500 reads instead of 2 million. Snapshots are a cache: they can always be deleted and recomputed.</p>${H.table(['Load strategy', 'Events read'], [['No snapshot', '2,000,000'], ['Snapshot every 500', '≤ 500'], ['Snapshot every 100', '≤ 100 but more snapshot writes']])}` },
    { title: 'Event versioning: upcasting', html: `<p>Last year <code>OrderPlaced</code> had a single <code>address</code> string. Now it has a structured address. Old events cannot be changed. Write an <b>upcaster</b> that, on read, converts <code>OrderPlaced v1</code> into the v2 shape (<code>{street: address, city: null}</code>) before the fold. Add fields as optional, never rename, and keep the version in each event.</p>` },
    { title: 'Fixing a mistake: compensating event', html: `<p>An agent deposited 1000 instead of 100. You do not edit event 7. You append <code>DepositCorrected(−900, reason: "typo", by: "agent-12")</code>. The balance is right and the audit trail shows the mistake <i>and</i> the fix. For privacy erasure (GDPR) use <b>crypto-shredding</b>: encrypt personal fields with a per-user key and delete the key.</p>` }
  ],
  deepDive: `<p><b>🟣 Hard parts nobody mentions in the first talk.</b></p>
    <ul>
      <li><b>Aggregates are the consistency boundary.</b> One stream per aggregate (account, order). Invariants spanning several aggregates need sagas. Keep streams small; an unbounded stream (a "global" aggregate) kills concurrency and replay.</li>
      <li><b>Concurrency.</b> Append with <code>expectedVersion</code>; on conflict reload and retry (re-run the decision on fresh state). Primary key <code>(stream_id, version)</code> enforces it in plain SQL. EventStoreDB, Axon, Kafka (with care), DynamoDB and Postgres can all serve as stores.</li>
      <li><b>The log vs the topic.</b> A Kafka topic can hold events, but "load one aggregate's history and append with a version check" is awkward there; most teams use a database as the store and publish via outbox/CDC to Kafka.</li>
      <li><b>Pure apply functions.</b> No clock, random or I/O inside <code>apply</code>, or replays give different results. Put timestamps and ids <i>into</i> the event when it is created.</li>
      <li><b>Schema evolution & migration.</b> Events are your database schema forever. Options: weak schema (JSON) with upcasters, or copy-and-transform migration into a new stream. Test by replaying production history in CI.</li>
      <li><b>Querying.</b> You cannot query "all accounts with balance &gt; 1000" on the event store; that needs a projection (CQRS). Plan the read models up front.</li>
      <li><b>Cost/benefit.</b> Event sourcing is worth it for domains where history <i>is</i> the business (ledgers, orders, compliance, collaborative editing). It is overkill for CRUD admin screens. Many "audit needs" are met by a simple audit-log table or CDC instead.</li>
      <li><b>Related terms:</b> event-carried state transfer (events with full data), event notification (just a ping), change data capture (derives events from state changes — not the same as event sourcing, where events are the source).</li>
    </ul>`,
  aiEra: `<p><b>What AI changes:</b> An immutable event history is gold for AI. It is a labelled sequence of what users and systems did, perfect for anomaly/fraud detection, forecasting, and training or evaluating models. It also makes AI agents auditable: record each tool call and decision as an event, then replay a failed run step by step to understand it, or time-travel to the state the agent saw.</p>
    <p><b>Use AI as a partner:</b> ask it to propose an event catalogue from a user story (<code>list the domain events and invariants for a refund flow</code>), to generate upcasters for a schema change, and to write replay-based tests ("same events, shuffled duplicates, must fold to same state").</p>
    <p><b>Where AI goes wrong:</b> it names events like CRUD (<code>AccountUpdated</code>), lets <code>apply</code> call services or read the clock, ignores versioning and optimistic concurrency, and recommends event sourcing for simple CRUD. It may also put personal data directly into immutable events.</p>
    <p><b>What you must still own:</b> whether history truly matters enough to pay the cost, aggregate boundaries, the privacy design for immutable data, and the snapshot/upcasting strategy.</p>`,
  problems: [
    {
      title: 'Rebuild State from Events (Event-Sourced Cart)',
      level: 'Medium', tags: ['event sourcing', 'fold', 'snapshots'], companies: ['Thoughtworks', 'Shopify'],
      statement: `<p>A shopping cart is event sourced with events <code>ItemAdded(sku, qty)</code>, <code>ItemRemoved(sku)</code>, <code>QtyChanged(sku, qty)</code> and <code>CartCheckedOut</code>. Explain how you derive the current cart, how you reject "add item" after checkout, how two browser tabs writing at once are handled, how you keep loads fast for carts with 10,000 events, and how you evolve <code>ItemAdded</code> to include a price.</p>`,
      constraints: `Cart load p99 under 20 ms · multiple devices per user · events kept 2 years · old events must remain readable.`,
      example: `<p>Events: <code>Added(TS-M,2)</code>, <code>Added(MUG,1)</code>, <code>Removed(MUG)</code>, <code>QtyChanged(TS-M,3)</code> → fold gives <span class="c-g">{TS-M: 3}</span>.</p>`,
      brute: { why: `<p>Store only the current cart row and overwrite it. Two tabs racing overwrite each other (lost update), you cannot explain how an item vanished, and a bug in pricing cannot be repaired because the history is gone. Loading all 10,000 events on every request would also be slow without snapshots.</p>` },
      mcq: { q: 'Two tabs both append an event expecting stream version 5. What should happen?', options: ['Both succeed; last write wins', 'The second append fails on the version check and retries with fresh state', 'The first event is deleted', 'Use a global lock for all carts'], answer: 1, explain: 'Optimistic concurrency: append only if the stream is still at the expected version. The loser reloads, re-decides on the new state, and appends again.' },
      hints: [
        `<p>Hint 1: state is a pure function of the ordered events: fold from an empty cart.</p>`,
        `<p>Hint 2: events table with primary key (cart_id, version) gives optimistic concurrency; the command handler folds, validates (not checked out), then appends.</p>`,
        `<p>Hint 3: add snapshots every ~200 events for speed, and handle the new price field with an upcaster that fills a default for old events.</p>`
      ],
      solution: {
        approach: `<p><b>Derive state.</b> <code>cart = events.fold(emptyCart, apply)</code>: <code>ItemAdded</code> adds or increases a line, <code>ItemRemoved</code> deletes it, <code>QtyChanged</code> sets quantity, <code>CartCheckedOut</code> sets <code>checkedOut = true</code>. <code>apply</code> is pure and ignores unknown events.</p>
          <p><b>Commands.</b> Handler: load snapshot + tail, fold, check rules (<code>checkedOut</code> → reject <code>AddItem</code> and append nothing), then append with <code>expectedVersion</code>. Table <code>cart_events(cart_id, version, type, data, at)</code> with <code>PRIMARY KEY(cart_id, version)</code>. Two tabs: both try version 6, one hits a unique-key violation, reloads, re-runs the decision on the new state and appends version 7. No locks.</p>
          <p><b>Performance.</b> Write a snapshot <code>(cart_id, version, state)</code> every 200 events (async). Load = latest snapshot + at most 200 events. Cache hot carts in Redis keyed by (cart_id, version).</p>
          <p><b>Evolution.</b> Add <code>price</code> as optional in <code>ItemAdded v2</code>; an upcaster maps v1 events to v2 with <code>price = null</code> (look up catalog price at read time if needed). Never rewrite stored events. Keep the event version in the payload and replay all history in CI to prove old data still folds.</p>
          <p><b>Read side.</b> "Abandoned carts" and analytics are projections fed from the event stream, not queries on the event table.</p>`,
        dry: { head: ['v', 'Event', 'Folded cart'], rows: [['1', 'ItemAdded TS-M x2', '{TS-M: 2}'], ['2', 'ItemAdded MUG x1', '{TS-M: 2, MUG: 1}'], ['3', 'ItemRemoved MUG', '{TS-M: 2}'], ['4', 'QtyChanged TS-M 3', '{TS-M: 3}'], ['5', 'CartCheckedOut', '{TS-M: 3} checkedOut=true']] },
        complexity: `<p>Load O(snapshot interval) events; append O(1). Storage grows linearly with history; archive or compact old streams after checkout.</p>`,
        followUps: ['How do you delete a customer\'s data for GDPR?', 'When would you NOT event source a cart?']
      }
    }
  ]
});

/* =====================================================================
   TOPIC 9 — Service Mesh
   ===================================================================== */
topics.push({
  title: 'Service Mesh: Sidecar Proxies, mTLS and Traffic Control',
  analogy: `<p>Imagine every employee gets a <b>personal assistant</b> who sits beside them. When Asha wants to send a document to Ben, she hands it to her assistant, who checks Ben's assistant's ID badge, uses a sealed envelope, retries if the courier is late, and keeps a log of every delivery. Asha only thinks about her work. A <b>head office</b> (the control plane) sends all assistants the same rulebook.</p>
    <p>A <b>service mesh</b> is those assistants: a small proxy next to every service instance, handling the network chores so the application code does not.</p>`,
  explain: `<p><b>🟢 The problem.</b> Every service needs the same network features: retries, timeouts, circuit breaking, encryption, identity, metrics, tracing, canary routing. Implementing them in a library per language (Java, Go, Node, Python) means 5 implementations, 5 sets of bugs, and every upgrade needs every team to redeploy.</p>
    <p><b>The mesh idea.</b> Move those chores out of the application into a <b>sidecar proxy</b> (usually Envoy) that runs in the same pod and intercepts all inbound and outbound traffic. The app just calls <code>http://payments</code>; the sidecar does the rest.</p>
    <p><b>Two planes:</b></p>
    <ul>
      <li><b>Data plane</b> — the fleet of sidecar proxies that actually carry the traffic between services.</li>
      <li><b>Control plane</b> — the brain (Istio's <i>istiod</i>, Linkerd's control plane) that knows all services, issues certificates, and pushes routing/security policy to every proxy.</li>
    </ul>
    ${H.table(['Mesh feature', 'What it does', 'Without a mesh'], [
      ['mTLS', 'both sides prove identity and encrypt traffic automatically', 'each team manages certs, or traffic is plaintext inside the cluster'],
      ['Retries / timeouts / circuit breaking', 'policy in YAML, same for all languages', 'library code per language'],
      ['Traffic splitting', '90% v1 / 10% v2 canary, header-based routing', 'custom gateway tricks'],
      ['Observability', 'uniform metrics (latency, errors), traces, access logs', 'instrument each service by hand'],
      ['Authorization', '"only order-svc may call payment-svc POST /charge"', 'checks in application code'],
      ['Fault injection', 'delay or abort 5% of calls to test resilience', 'chaos tooling per team']
    ])}
    <p><b>Gateway vs mesh:</b> an API gateway handles <i>north-south</i> traffic (outside → in); a mesh handles <i>east-west</i> traffic (service ↔ service inside). They are friends: Istio's ingress gateway is also Envoy.</p>
    <p><b>The cost:</b> every request passes two extra proxies (+1–3 ms), every pod needs extra CPU/RAM for its sidecar, and a new system (control plane, CRDs, upgrades, debugging proxy configs) joins your on-call. Newer options reduce the cost: <b>ambient mode</b> (Istio) uses a shared per-node proxy instead of one sidecar per pod, and eBPF-based meshes (Cilium) move parts into the kernel.</p>`,
  clues: [
    '"mTLS between all services without changing app code" → service mesh',
    '"Consistent retries/timeouts/circuit breaker across languages" → sidecar policy',
    '"Canary 5% of traffic to v2" / "header-based routing" → mesh traffic management (VirtualService)',
    '"Service-to-service authorization, zero trust inside the cluster" → mesh identity (SPIFFE) + AuthorizationPolicy',
    '"Uniform golden-signal metrics for every service" → proxy-generated telemetry',
    '"We only have 5 services" → probably do not need a mesh yet'
  ],
  code: [
    { lang: 'js', run: true, title: 'A sidecar proxy in miniature: mTLS check, retries, canary split (runnable)', code: `// Each service gets a sidecar. The app code only says "call payments"; the proxy adds the chores.
var policy = {
  retries: 2,                 // retry failed calls up to 2 more times
  canary: { v2: 25 },         // 25% of calls go to payments v2
  allowedCallers: { payments: ['orders'] }   // authorization: who may call whom
};

var callCounter = 0;
function pickVersion() {
  callCounter += 1;
  return (callCounter % 4 === 0) ? 'v2' : 'v1';   // every 4th call = 25% to v2 (deterministic)
}

// Pretend upstream instances; v1 flakes on its first call to show retries.
var upstreams = {
  v1: (function () { var n = 0; return function () { n += 1; if (n === 1) throw new Error('503'); return 'charged by v1'; }; })(),
  v2: function () { return 'charged by v2'; }
};

// The sidecar of the CALLER.
function sidecarCall(callerIdentity, target) {
  // 1) mTLS: the peer's certificate identity is checked by the sidecar, not by the app.
  if (policy.allowedCallers[target].indexOf(callerIdentity) < 0) return 'DENIED (' + callerIdentity + ' may not call ' + target + ')';
  var version = pickVersion();
  var attempts = 0, lastErr = null;
  while (attempts <= policy.retries) {
    attempts += 1;
    try { return version + ' -> ' + upstreams[version]() + ' (attempts=' + attempts + ')'; }
    catch (e) { lastErr = e.message; }
  }
  return 'FAILED ' + lastErr;
}

console.log(sidecarCall('orders', 'payments'));
console.log(sidecarCall('orders', 'payments'));
console.log(sidecarCall('shipping', 'payments'));
callCounter = 23;               // advance the counter to see the canary slice
console.log(sidecarCall('orders', 'payments'));` },
    { lang: 'yaml', check: false, title: 'Istio: canary split + retries + strict mTLS (illustrative)', code: `apiVersion: networking.istio.io/v1
kind: VirtualService
metadata: { name: payments }
spec:
  hosts: [payments]
  http:
    - route:
        - destination: { host: payments, subset: v1 }
          weight: 90
        - destination: { host: payments, subset: v2 }
          weight: 10                       # canary: 10% of calls
      retries: { attempts: 2, perTryTimeout: 500ms, retryOn: "5xx,connect-failure" }
      timeout: 2s
---
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata: { name: default, namespace: shop }
spec:
  mtls: { mode: STRICT }                   # plaintext between pods is refused
---
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata: { name: payments-allow-orders, namespace: shop }
spec:
  selector: { matchLabels: { app: payments } }
  rules:
    - from: [{ source: { principals: ["cluster.local/ns/shop/sa/orders"] } }]
      to:   [{ operation: { methods: ["POST"], paths: ["/charge"] } }]` }
  ],
  codeTitle: ['Sidecar logic (JS, runnable)', 'Istio policies'],
  viz: {
    title: 'Sidecars in a mesh: request path, mTLS and canary',
    input: '10',
    inputLabel: 'Canary percent of traffic to payments v2 (0-50)',
    gen: function (input) {
      var pct = parseInt(String(input === undefined ? '10' : input).trim(), 10);
      if (isNaN(pct) || pct < 0 || pct > 50) throw new Error('Enter a canary percentage from 0 to 50');
      var nodes = [bx('cp', 'Control plane (istiod)', 50, 5),
        bx('oa', 'orders app', 10, 33), bx('op', 'orders sidecar', 34, 33),
        bx('p1', 'payments-v1 sidecar', 70, 22), bx('a1', 'payments-v1 app', 90, 22),
        bx('p2', 'payments-v2 sidecar', 70, 50), bx('a2', 'payments-v2 app', 90, 50)];
      var frames = [], base = [['oa', 'op', 'localhost'], ['op', 'p1'], ['p1', 'a1'], ['op', 'p2'], ['p2', 'a2']];
      frames.push({ narr: 'A pod normally holds one app container. The mesh <b>injects a sidecar proxy</b> beside it. Here <code>orders</code> and two versions of <code>payments</code> each have a sidecar. Application code is unchanged.', parts: [{ type: 'graph', directed: true, height: 62, nodes: nodes, edges: base, hl: { op: 'sel', p1: 'sel', p2: 'sel' } }] });
      frames.push({ narr: '<b>Control plane pushes config.</b> istiod gives every sidecar the service list, routing rules (' + (100 - pct) + '% v1 / ' + pct + '% v2), retry policy and a short-lived certificate that proves "I am orders". The control plane is <i>not</i> on the request path, so it can restart without dropping traffic.', parts: [{ type: 'graph', directed: true, height: 62, nodes: nodes, edges: base.concat([['cp', 'op', 'config + cert'], ['cp', 'p1'], ['cp', 'p2']]), hl: { cp: 'cur' }, ehl: { 'cp-op': 'ok', 'cp-p1': 'ok', 'cp-p2': 'ok' } }] });
      frames.push({ narr: '<b>The app makes a plain call:</b> <code>http://payments/charge</code>. It does not know about versions, TLS or retries. The call is silently intercepted by its own sidecar.', parts: [{ type: 'graph', directed: true, height: 62, nodes: nodes, edges: base, hl: { oa: 'cur', op: 'cur' }, ehl: { 'oa-op': 'cur' } }] });
      frames.push({ narr: '<b>mTLS handshake.</b> The orders sidecar and the payments-v1 sidecar present certificates and verify each other\'s identity (orders ↔ payments). The wire is now encrypted, and payments can enforce "only orders may call POST /charge".', parts: [{ type: 'graph', directed: true, height: 62, nodes: nodes, edges: base, hl: { op: 'ok', p1: 'ok' }, ehl: { 'op-p1': 'ok' }, tags: { op: 'cert: orders', p1: 'cert: payments' } }] });
      frames.push({ narr: 'The first try hits an overloaded instance and returns <b>503</b>. The caller\'s sidecar <b>retries</b> after a short delay (policy: 2 attempts, 500 ms each). The app only sees the final success; a metric records the retry.', parts: [{ type: 'graph', directed: true, height: 62, nodes: nodes, edges: base, hl: { p1: 'bad' }, ehl: { 'op-p1': 'bad' }, tags: { p1: '503' } }, { type: 'vars', label: 'sidecar policy', vals: { attempt: 2, retryOn: '5xx', perTryTimeout: '500ms' }, hl: { attempt: 'cur' } }] });
      frames.push({ narr: '<b>Canary split.</b> The sidecar sends ' + (100 - pct) + ' of every 100 calls to <b>v1</b> and ' + pct + ' to <b>v2</b>. Watch v2\'s error rate and latency (the proxies emit these for free); if good, raise the weight; if bad, set it back to 0 in one config change, no redeploy.', parts: [{ type: 'graph', directed: true, height: 62, nodes: nodes, edges: base, hl: { p2: pct > 0 ? 'win' : 'done', p1: 'ok' }, ehl: { 'op-p1': 'ok', 'op-p2': pct > 0 ? 'win' : 'done' }, tags: { p1: (100 - pct) + '%', p2: pct + '%' } }, { type: 'bars', label: 'traffic share (%)', values: [100 - pct, pct], idxLabels: ['v1', 'v2'], texts: [(100 - pct) + '%', pct + '%'] }] });
      frames.push({ narr: '<b>Denied call.</b> A rogue <code>shipping</code> pod tries to call payments. Its certificate says "shipping", the AuthorizationPolicy only allows "orders", so the payments sidecar answers <span class="c-r">403</span> before the request reaches the app. This is zero-trust inside the cluster.', parts: [{ type: 'graph', directed: true, height: 62, nodes: nodes.concat([bx('sh', 'shipping sidecar', 34, 58)]), edges: base.concat([['sh', 'p1', 'denied']]), hl: { sh: 'bad', p1: 'sel' }, ehl: { 'sh-p1': 'bad' } }] });
      return frames;
    }
  },
  examples: [
    { title: 'Mesh vs library (Resilience4j / Spring Cloud)', html: `${H.table(['', 'In-app library', 'Mesh sidecar'], [['Language support', 'one per language', 'any'], ['Upgrade', 'rebuild + redeploy every service', 'roll the proxy / change config'], ['Fine control (business-aware fallback)', '<span class="c-g">excellent</span>', 'limited: it only sees bytes'], ['Overhead', 'in-process', '2 extra hops, RAM per pod'], ['Operations', 'less infrastructure', 'a platform team to run it']])}<p>Common answer: mesh for cross-cutting transport policy, library for business-aware fallbacks (e.g. "return cached recommendations").</p>` },
    { title: 'Zero-downtime canary in 4 steps', html: `<ol><li>Deploy payments-v2 with 0% weight; smoke-test it with a header <code>x-canary: true</code>.</li><li>Shift 5% → watch error rate, p99, business metrics for 15 min.</li><li>25% → 50% → 100%, or flip back to 0 on any alarm.</li><li>Remove v1. Total user-visible downtime: zero; rollback time: seconds.</li></ol>` },
    { title: 'Debugging with the mesh: golden signals', html: `<p>Without writing code, each proxy exposes <b>rate, errors, duration</b> per service pair, plus distributed-trace spans. A dashboard instantly shows "orders → payments p99 jumped from 80 ms to 900 ms starting 14:02, only for payments-v2" — the canary just paid for itself. Traces still need the app to <b>forward trace headers</b> (<code>traceparent</code>), because only the app knows which inbound request caused which outbound call.</p>` }
  ],
  deepDive: `<p><b>🟣 Reality check.</b></p>
    <ul>
      <li><b>Identity.</b> Meshes use SPIFFE IDs (<code>spiffe://cluster.local/ns/shop/sa/orders</code>) in X.509 certs rotated every few hours. The identity is tied to the Kubernetes service account, so permissions follow workloads, not IP addresses.</li>
      <li><b>Traffic interception.</b> In sidecar mode an init container sets iptables (or eBPF/CNI) rules redirecting pod traffic to Envoy. Start-up ordering bugs ("app starts before the sidecar is ready") cause the classic first-seconds connection errors; use hold-application-until-proxy-starts. Jobs/CronJobs need the sidecar to exit when the main container finishes.</li>
      <li><b>Retries are dangerous.</b> A mesh retry on a non-idempotent POST can double-charge. Retry only <code>connect-failure</code>/<code>reset</code> for POSTs, or require idempotency keys. Beware retry storms: set a <b>retry budget</b> (e.g. max 20% extra load) and combine with circuit breaking (outlier detection ejects failing endpoints).</li>
      <li><b>Load balancing.</b> Proxies balance per request (least-request, locality-aware), fixing the "one long gRPC connection pins to one pod" problem from kube-proxy.</li>
      <li><b>Costs.</b> Typical sidecar: 50–100 MB RAM and a fraction of a core, p99 +1–3 ms per hop. At 2,000 pods that is hundreds of GB of RAM. Ambient/ztunnel mode and eBPF dataplanes cut this by sharing proxies per node.</li>
      <li><b>When it pays off:</b> 20+ services, multiple languages, compliance requiring encryption in transit and service-level authz, frequent canary releases. <b>When it does not:</b> a handful of services, a small team without platform engineers — use TLS from your platform, a gateway and in-app libraries.</li>
      <li><b>Multi-cluster / multi-region:</b> meshes can federate identity and route across clusters with failover, but complexity jumps; design DNS, certificate roots and failure domains deliberately.</li>
    </ul>`,
  aiEra: `<p><b>What AI changes:</b> Meshes (and gateways) are where you control <b>agent-to-service and service-to-model traffic</b>: who may call the LLM endpoint, egress allow-lists so a compromised agent cannot post data to arbitrary hosts, per-caller rate limits and budgets, and audit logs of every call. mTLS identity for workloads (not API keys pasted in prompts) is the right base for tool-calling agents. Standards like MCP add their own auth, so combine them with network-level policy.</p>
    <p><b>Use AI as a partner:</b> have it translate "only orders may call POST /charge, 10% canary, retry twice on 5xx" into Istio/Linkerd YAML, then ask <code>what could go wrong with this retry policy?</code> and run <code>istioctl analyze</code> to verify. It is also good at turning proxy access logs into a readable incident timeline.</p>
    <p><b>Where AI goes wrong:</b> it mixes up API versions and field names (Istio changes), enables retries on POSTs, sets <code>PERMISSIVE</code> mTLS "temporarily" and forgets it, and recommends a mesh for a 4-service app.</p>
    <p><b>What you must still own:</b> whether the mesh is worth its operating cost, the security model (STRICT mTLS, default-deny authz), retry/timeout budgets, and rollout/rollback procedures. Test policy in a staging cluster before production.</p>`,
  problems: [
    {
      title: 'Roll Out mTLS and a Canary with a Mesh',
      level: 'Hard', tags: ['service mesh', 'mTLS', 'canary', 'operations'], companies: ['Google', 'Lyft', 'Atlassian'],
      statement: `<p>You operate 60 services on Kubernetes; traffic between pods is plaintext HTTP and releases are all-or-nothing. Plan the introduction of a service mesh: how you adopt it safely service by service, how you reach strict mTLS without outages, how you roll out payments v2 to 5% of traffic with automatic rollback, which problems you expect (retries, startup, cost), and how you decide whether the mesh is worth it.</p>`,
      constraints: `No downtime allowed · mixed Java/Go/Node services · platform team of 4 · compliance audit requires encryption in transit in 6 months · payments is not idempotent today.`,
      example: `<p>Week 1: install control plane, inject sidecars into 2 namespaces in <b>PERMISSIVE</b> mode. Week 6: all namespaces injected, dashboards show 100% mTLS. Week 8: flip to <span class="c-g">STRICT</span> namespace by namespace.</p>`,
      brute: { why: `<p>Turn on sidecar injection and STRICT mTLS for the whole cluster in one change. Any workload that is not yet injected (jobs, legacy pods, health checkers hitting pods directly) instantly fails to connect, rolling restarts bring a wave of start-up race errors, and with no baseline metrics you cannot tell what broke. Rollback means restarting every pod again.</p>` },
      mcq: { q: 'Which mTLS mode is correct while only some workloads have sidecars?', options: ['STRICT everywhere immediately', 'PERMISSIVE (accept both plaintext and mTLS), then move to STRICT once all traffic is mTLS', 'Disable mTLS permanently', 'Use plaintext and a firewall'], answer: 1, explain: 'PERMISSIVE lets injected and non-injected pods keep talking while you migrate. Dashboards show the share of mTLS traffic; when it is 100% you switch to STRICT safely.' },
      hints: [
        `<p>Hint 1: migrate incrementally with a mode that accepts both plaintext and mTLS first, observe, then enforce.</p>`,
        `<p>Hint 2: canary via weighted routes (95/5) plus alerts on error rate and p99 that trigger an automatic weight reset; handle non-idempotent payments with an Idempotency-Key and restricted retry rules.</p>`,
        `<p>Hint 3: list the operational risks (startup ordering, jobs, resource cost, upgrade of the control plane, debugging) and a decision metric to prove value: time to ship canaries, % encrypted traffic, incidents prevented.</p>`
      ],
      solution: {
        approach: `<p><b>Adoption plan.</b> (1) Pilot: install the control plane in staging, inject two low-risk namespaces, measure sidecar overhead (CPU, RAM, p99 +ms). (2) Namespace-by-namespace injection with <code>PeerAuthentication: PERMISSIVE</code>; services keep working with or without sidecars. (3) Use the mesh dashboard to verify 100% of intra-cluster traffic is mTLS and find stragglers (jobs, legacy, kubelet probes, external clients). (4) Switch each namespace to <b>STRICT</b>, with a one-line rollback. (5) Add default-deny <code>AuthorizationPolicy</code> and allow-list callers per service (payments allows only orders).</p>
          <p><b>Canary for payments v2.</b> Deploy v2 with labels, create DestinationRule subsets and a VirtualService with 95/5 weights. Automate promotion with Argo Rollouts/Flagger: promote to 25/50/100 only if error rate stays below 0.5% and p99 below baseline +10% for 15 min; any breach resets weight to 0. Since payments is not idempotent, <b>do not</b> enable mesh retries on POST except for connection-failure; add an <code>Idempotency-Key</code> table in payments first, then allow limited retries with a retry budget.</p>
          <p><b>Known problems.</b> Start-up race (enable hold-until-proxy-ready), CronJobs that never finish because the sidecar keeps running (quit-sidecar hook), extra 1-3 ms per hop and about 60 MB RAM per pod (budget it; consider ambient mode), control-plane upgrades (canary the upgrade with revisions), and debugging complexity (train on-call, keep <code>istioctl</code> runbooks).</p>
          <p><b>Is it worth it?</b> Define success metrics before: 100% encrypted traffic by the audit date, canary lead time from days to hours, uniform golden-signal dashboards for all 60 services. If adoption cost exceeds the benefit, the fallback is platform-level mTLS (CNI encryption) plus a gateway and in-app resilience libraries.</p>`,
        dry: { head: ['Phase', 'mTLS mode', 'Scope', 'Exit criterion'], rows: [['Pilot', 'PERMISSIVE', '2 namespaces', 'overhead measured, no errors'], ['Roll-in', 'PERMISSIVE', 'all namespaces', '100% of traffic shows mTLS'], ['Enforce', '<span class="c-g">STRICT</span>', 'namespace by namespace', 'no 5xx increase for 48 h'], ['Authz', 'STRICT + default-deny', 'per service', 'allow-lists reviewed']] },
        complexity: `<p>Cost: roughly 60 pods x N replicas x 60 MB RAM for sidecars, +1-3 ms p99 per hop, plus one platform engineer-year of care. Benefit: encryption in transit, uniform telemetry, safe canaries.</p>`,
        followUps: ['What changes with ambient (sidecar-less) mode?', 'How do you handle traffic to external third-party APIs?']
      }
    }
  ]
});

/* =====================================================================
   TOPIC 10 — When NOT to use microservices
   ===================================================================== */
topics.push({
  title: 'When NOT to Use Microservices (and the Modular Monolith)',
  analogy: `<p>You do not need a fleet of delivery trucks, a dispatch centre and a fuel contract to carry one box across town. A bicycle is faster, cheaper and cannot break down on a motorway. Microservices are the logistics company; many products are a single box.</p>
    <p>A <b>modular monolith</b> is a well-organised single house: separate rooms with doors (modules with clear interfaces), one roof (one deployment). You can later turn a room into its own building if it really needs to be.</p>`,
  explain: `<p><b>🟢 The honest truth.</b> Microservices solve <i>organisational and scaling</i> problems, not code-quality problems. They add distributed-system problems: network failures, partial failure, data consistency (sagas!), versioned APIs, tracing, deployment pipelines for every service. Many teams that adopted them early went back (famous write-ups: Segment, Amazon Prime Video's monitoring service, and others).</p>
    <p><b>Do NOT go microservices when:</b></p>
    <ul>
      <li><b>You are early.</b> A startup does not yet know its domain; boundaries drawn now will be wrong, and wrong service boundaries are far costlier to fix than wrong module boundaries.</li>
      <li><b>The team is small</b> (fewer than ~10–15 engineers). You will spend more time on platform than product.</li>
      <li><b>There is no pain.</b> Deploys are fine, one database copes, teams do not block each other.</li>
      <li><b>You need strong consistency across the data</b> (everything must be in one ACID transaction). Splitting it creates sagas for no gain.</li>
      <li><b>You lack the operational maturity:</b> CI/CD per service, centralised logging/metrics/tracing, on-call, infrastructure as code, container platform.</li>
      <li><b>The "modules" are chatty.</b> If A calls B ten times per request, the network will cost you.</li>
    </ul>
    <p><b>Do consider them when:</b> many teams (20+) block each other on a shared release train; parts have very different scaling, security or availability needs; different technologies are genuinely needed; or an area must be isolated for compliance (payments).</p>
    ${H.table(['Option', 'Deploy units', 'Data', 'Good until…'], [
      ['Plain monolith', '1', 'one DB', 'code becomes a ball of mud'],
      ['<b>Modular monolith</b>', '1', 'one DB, separate schemas per module', 'teams/scale really need independent deploys'],
      ['Few coarse services (3-8)', 'few', 'per service', 'reasonable middle ground for most companies'],
      ['Fine-grained microservices', 'dozens-hundreds', 'per service', 'you have the organisation and platform to carry them']
    ])}
    <p><b>Modular monolith rules:</b> modules talk only via public interfaces (no reaching into another module's tables), each module owns its schema, dependencies are enforced by tests/tools (ArchUnit, Spring Modulith), and cross-module events are in-process. When one module needs to leave, the boundary is already clean.</p>`,
  clues: [
    '"Startup, 6 engineers, find product-market fit" → monolith / modular monolith',
    '"Should we use microservices?" → answer with trade-offs and context, not a reflex',
    '"Everything needs to be transactionally consistent" → keep in one service/DB',
    '"We split into 40 services and now debugging is a nightmare" → distributed monolith smell',
    '"Teams blocked by a single release train" → real reason to split',
    '"Migrate incrementally, low risk" → strangler fig from a (modular) monolith'
  ],
  code: [
    { lang: 'python', run: true, title: 'A blunt readiness score (runnable thought experiment)', code: `# Not science: a conversation starter. Each factor adds or removes "points for microservices".
def score(team_size, teams, deploys_blocked, uneven_scaling, strong_consistency_needed,
          has_ci_cd, has_observability, domain_stable):
    pts = 0
    pts += 2 if team_size >= 40 else (1 if team_size >= 15 else -2)
    pts += 2 if teams >= 5 else (0 if teams >= 3 else -1)
    pts += 2 if deploys_blocked else -1
    pts += 1 if uneven_scaling else 0
    pts -= 2 if strong_consistency_needed else 0
    pts += 1 if has_ci_cd else -2
    pts += 1 if has_observability else -2
    pts += 1 if domain_stable else -2
    return pts

def verdict(p):
    if p >= 6: return 'microservices are justified (start with coarse services)'
    if p >= 1: return 'modular monolith, extract one or two hot spots later'
    return 'stay with a (modular) monolith'

cases = {
  'seed startup': dict(team_size=6, teams=1, deploys_blocked=False, uneven_scaling=False, strong_consistency_needed=True,  has_ci_cd=True,  has_observability=False, domain_stable=False),
  'scale-up':     dict(team_size=45, teams=6, deploys_blocked=True,  uneven_scaling=True,  strong_consistency_needed=False, has_ci_cd=True,  has_observability=True,  domain_stable=True),
  'mid company':  dict(team_size=20, teams=3, deploys_blocked=True,  uneven_scaling=False, strong_consistency_needed=False, has_ci_cd=True,  has_observability=True,  domain_stable=True),
}
for name, c in cases.items():
    p = score(**c)
    print(name.ljust(14), 'score =', p, '->', verdict(p))` },
    { lang: 'java', check: false, title: 'Module boundary enforced by a test (ArchUnit-style, illustrative)', code: `// The orders module may use payments only through its public API package.
@ArchTest
static final ArchRule orders_use_payments_only_via_api =
    noClasses().that().resideInAPackage("..orders..")
        .should().dependOnClassesThat()
        .resideInAnyPackage("..payments.internal..", "..payments.persistence..");` }
  ],
  codeTitle: ['Readiness score (Python, runnable)', 'Architecture test'],
  viz: {
    title: 'Reading the room: should we split?',
    input: '8 1',
    inputLabel: 'Engineers and number of teams (e.g. 8 1)',
    gen: function (input) {
      var p = String(input === undefined ? '8 1' : input).trim().split(/[\s,]+/).map(Number);
      if (p.length < 2 || p.some(function (x) { return isNaN(x) || x < 1 || x > 500; })) throw new Error('Enter engineers and teams, e.g. 8 1');
      var eng = Math.floor(p[0]), teams = Math.floor(p[1]);
      var rows = [], pts = 0, frames = [];
      var f = [
        ['Team size ' + eng, eng >= 40 ? 2 : eng >= 15 ? 1 : -2, eng >= 15 ? 'enough people to own separate services' : 'too few people to run many services (on-call, pipelines)'],
        ['Teams ' + teams, teams >= 5 ? 2 : teams >= 3 ? 0 : -1, teams >= 5 ? 'teams block each other on one release train' : 'little cross-team coordination pain'],
        ['Platform maturity (assumed: CI/CD only)', -1, 'observability and on-call are weak, each service multiplies the gap'],
        ['Data consistency needs (assumed: strong)', -2, 'splitting forces sagas and eventual consistency']
      ];
      frames.push({ narr: 'Question: <b>should we move to microservices?</b> Instead of guessing, score the real forces. We start at 0 points; positive favours splitting, negative favours staying together.', parts: [{ type: 'table', label: 'factor scorecard', columns: ['factor', 'points', 'why'], rows: [] }, { type: 'vars', vals: { score: 0 } }] });
      f.forEach(function (x) {
        rows.push([x[0], (x[1] > 0 ? '+' : '') + x[1], x[2]]); pts += x[1];
        var h = {}; h[rows.length - 1] = x[1] > 0 ? 'ok' : (x[1] < 0 ? 'bad' : 'cur');
        frames.push({ narr: '<b>' + x[0] + '</b>: ' + (x[1] > 0 ? '<span class="c-g">+' + x[1] + '</span>' : x[1] < 0 ? '<span class="c-r">' + x[1] + '</span>' : '0') + ' — ' + x[2] + '. Running score: <b>' + pts + '</b>.', parts: [{ type: 'table', label: 'factor scorecard', columns: ['factor', 'points', 'why'], rows: rows.map(function (r) { return r.slice(); }), hl: h }, { type: 'vars', vals: { score: pts }, hl: { score: pts > 0 ? 'ok' : 'bad' } }] });
      });
      var v = pts >= 4 ? 'Microservices (coarse) look justified.' : pts >= 0 ? 'Modular monolith; extract only hot spots.' : 'Stay with a modular monolith.';
      frames.push({ narr: '<b>Verdict:</b> total ' + pts + ' → <b>' + v + '</b> Change the numbers (try <code>60 8</code>) and the answer flips: the right architecture depends on the organisation, not fashion.', parts: [{ type: 'bars', label: 'points per factor', values: f.map(function (x) { return Math.abs(x[1]); }), texts: f.map(function (x) { return (x[1] > 0 ? '+' : '') + x[1]; }), idxLabels: ['team', 'teams', 'platform', 'data'] }, { type: 'text', html: '<b>' + v + '</b>' }] });
      return frames;
    }
  },
  examples: [
    { title: 'Back to a monolith: a legitimate move', html: `<p>A video-monitoring team split a pipeline into many small serverless components that passed frames through a message queue. Costs and latency were dominated by the hops. Merging the components into one process on a single machine cut infrastructure cost by about 90% and removed scaling limits. Lesson: <b>the unit of deployment should match the unit of change and scale</b>, not the unit of code.</p>` },
    { title: 'Distributed monolith: spot it', html: `${H.table(['Symptom', 'What it means'], [['Must deploy services A, B, C together', 'they are one unit with network in the middle'], ['Shared database tables across services', 'no real data ownership'], ['One change needs PRs in five repos', 'wrong boundaries'], ['Sync call chain 6 hops deep', 'availability = product of all'], ['A shared "common" library holds all domain models', 'lock-step version coupling']])}<p>Fix by merging services back (yes, really), or re-cutting along real capabilities.</p>` },
    { title: 'Path: monolith → modular monolith → extract', html: `<ol><li>Start as a single deployable with packages per capability.</li><li>Enforce boundaries with module tests; give each module its own schema and in-process events.</li><li>When one module has a real, measured need (separate scaling, team, compliance), extract it: its API becomes HTTP/gRPC, its in-process events go through the broker, its tables move to its own database — using strangler fig and an outbox.</li></ol><p>You pay the distributed-systems tax <b>only where it buys something</b>.</p>` }
  ],
  deepDive: `<p><b>🟣 Interview-level nuance.</b></p>
    <ul>
      <li><b>Costs are multiplicative, not additive.</b> n services means roughly n pipelines, n dashboards, n on-call rotations, n dependency upgrade streams, and O(n²) possible interactions to test. Contract testing (Pact) and consumer-driven contracts exist because integration tests across 40 services do not scale.</li>
      <li><b>Latency and failure budgets.</b> Each hop adds serialisation, network and a failure probability. A request fan-out of 20 calls each with p99 = 100 ms gives a high chance (about 1 − 0.99<sup>20</sup> ≈ 18%) that at least one is slow: tail latency amplification.</li>
      <li><b>Conway's law as a tool:</b> architecture should follow the communication structure you want. If you have one team, one deployable matches reality.</li>
      <li><b>Data gravity & reporting:</b> splitting the database complicates analytics; you must build a data pipeline (CDC to a warehouse) which is its own project.</li>
      <li><b>Team cognitive load:</b> a team can hold a limited amount in its head (Team Topologies). Services should fit one team's cognitive load; a platform team reduces the load of running them.</li>
      <li><b>Serverless / functions are not a free pass:</b> they are even finer-grained services with the same distributed problems plus cold starts and vendor coupling.</li>
      <li><b>The right interview answer</b> is conditional: "I would start with a modular monolith because X; I would split when Y happens, beginning with Z, using strangler fig, an outbox and a gateway."</li>
    </ul>`,
  aiEra: `<p><b>What AI changes:</b> AI code assistants make writing a new service cheap — which tempts teams to create many. But the cost of microservices was never typing code; it is running, securing, observing and coordinating them. Cheap code generation makes <b>modular monoliths even more attractive</b>: a coding agent can navigate one repo with clear module boundaries and make cross-module refactors in one pull request, while 40 repos hide context from it.</p>
    <p><b>Use AI as a partner:</b> ask it to analyse your repo and estimate coupling (<code>which modules change together in git history?</code>), to draft an ADR (architecture decision record) comparing "stay modular" and "extract payments", and to generate the module-boundary tests.</p>
    <p><b>Where AI goes wrong:</b> it pattern-matches to "modern = microservices + Kafka + Kubernetes" and will design a 12-service diagram for a to-do app. It rarely volunteers the operational cost or the option of doing nothing.</p>
    <p><b>What you must still own:</b> saying "not yet", with reasons and a trigger for revisiting. Write that trigger down (for example "extract orders when deploy queue exceeds 2 days or team count passes 5").</p>`,
  problems: []
});

/* =====================================================================
   PRACTICE
   ===================================================================== */
function prob(o) {
  practice.push({
    title: o.title, level: o.level, tags: o.tags, companies: o.companies,
    statement: o.statement, constraints: o.constraints, example: o.example,
    brute: { why: o.brute },
    mcq: o.mcq, hints: o.hints,
    solution: { approach: o.approach, complexity: o.complexity, followUps: o.followUps }
  });
}

prob({
  title: 'Name the Pattern', level: 'Easy', tags: ['patterns', 'vocabulary'], companies: ['Amazon', 'Microsoft'],
  statement: `<p>Match each situation to the best pattern: (1) "Order saved but the OrderPlaced event was lost after a crash." (2) "Cancel the flight booking because the hotel booking failed." (3) "Order history page is slow because it joins four services." (4) "Auditors need to see every change to an account and its balance at any past date." (5) "Add mTLS between all pods without touching application code."</p>`,
  constraints: `One pattern per situation: outbox, saga, CQRS read model, event sourcing, service mesh.`,
  example: `<p>(1) <span class="c-g">transactional outbox</span> · (2) <span class="c-g">saga compensation</span> · (3) <span class="c-g">CQRS read model</span> · (4) <span class="c-g">event sourcing</span> · (5) <span class="c-g">service mesh</span>.</p>`,
  brute: `<p>Answer "microservices" for everything, or reach for two-phase commit and distributed locks. That names the style but not the specific fix, and 2PC across services hurts availability and is unsupported by most brokers.</p>`,
  mcq: { q: 'Which pattern solves the "database write and event publish are not atomic" problem?', options: ['CQRS', 'Transactional outbox', 'API gateway', 'Service mesh'], answer: 1, explain: 'The outbox stores the event in the same local transaction as the business change, and a relay publishes it later.' },
  hints: [`<p>Hint 1: for each sentence find the verb: lost event, undo, slow join, history, encrypt.</p>`, `<p>Hint 2: "undo earlier steps" = compensation; "history/time travel" = events as source of truth.</p>`, `<p>Hint 3: if the problem is about the network between services rather than data, think mesh or gateway.</p>`],
  approach: `<p>(1) Dual-write problem → <b>transactional outbox</b> with a relay. (2) Business-level undo of a completed step → <b>saga</b> with a compensating transaction (cancel flight). (3) Many-service join on a hot read path → <b>CQRS read model</b> fed by events so the join is precomputed. (4) Audit and "state as of date" → <b>event sourcing</b>: fold the events up to the date. (5) Transparent mTLS, retries and identity → <b>service mesh</b> with sidecars. Each pattern fixes one specific force; naming the force first is how you justify the choice in an interview.</p>`,
  complexity: `<p>Conceptual question; no complexity analysis.</p>`
});

prob({
  title: 'Client-Side or Server-Side Discovery?', level: 'Easy', tags: ['service discovery'], companies: ['Netflix', 'Google'],
  statement: `<p>Team A runs Java services with Eureka and Spring Cloud LoadBalancer. Team B runs Go and Python services on Kubernetes and just calls <code>http://payment-svc</code>. For each team name the discovery style, who picks the instance, and one weakness.</p>`,
  constraints: `Answer in three short bullets per team.`,
  example: `<p>Team A: <span class="c-b">client-side</span>, the caller library picks from a cached list, weakness: stale cache can hit dead nodes. Team B: <span class="c-b">server-side</span>, the platform Service picks, weakness: long-lived gRPC connections pin to one pod.</p>`,
  brute: `<p>Hard-code IP addresses or a static list in config files. Instances change on every deploy and autoscale event, so the list is stale within minutes and each change needs a redeploy of every caller.</p>`,
  mcq: { q: 'What removes a crashed instance from the registry?', options: ['The load balancer restarts it', 'Missing heartbeats beyond the TTL (or failed readiness probes)', 'The client deletes it manually', 'Nothing, it stays forever'], answer: 1, explain: 'Registries evict entries whose heartbeat is older than the TTL; Kubernetes removes pods that fail readiness.' },
  hints: [`<p>Hint 1: ask "who decides which instance gets this request?" the caller or a router.</p>`, `<p>Hint 2: Kubernetes Services and cloud load balancers are server-side; Eureka plus a smart client is client-side.</p>`, `<p>Hint 3: weaknesses come from caching (client-side) and from the shared router or connection pinning (server-side).</p>`],
  approach: `<p><b>Team A (client-side).</b> The service registry (Eureka) holds the instance list; each caller caches it and its load balancer picks an instance, so there is no extra hop and balancing can be smart (zone-aware, least-loaded). Weakness: every language needs the library, and a stale cache can route to a dead instance until refresh, so retries and circuit breakers are still required.</p>
    <p><b>Team B (server-side).</b> The Kubernetes Service resolves the name and kube-proxy spreads connections over ready pods, so callers stay simple and polyglot. Weakness: balancing is per connection, so a long-lived HTTP/2 or gRPC connection stays on one pod; fix with a headless Service plus client-side gRPC balancing or a mesh.</p>`,
  complexity: `<p>Not applicable; compare lookup cost: cached local pick O(1) vs one extra network hop through a router.</p>`
});

prob({
  title: 'Sync or Async? Classify the Calls', level: 'Easy', tags: ['sync vs async', 'checkout'], companies: ['Flipkart', 'Uber'],
  statement: `<p>For each call in checkout decide REST/gRPC (sync) or event (async) and give one reason: (a) price check from Catalog, (b) reserve stock, (c) card authorisation, (d) confirmation email, (e) update loyalty points, (f) create shipping label.</p>`,
  constraints: `Customer waits on the screen; payment is the only step that must complete before showing "order confirmed".`,
  example: `<p>(a) <span class="c-b">sync</span> need the number now · (b) <span class="c-b">sync</span> must succeed before charging · (c) <span class="c-b">sync</span> user waits · (d) <span class="c-p">async</span> · (e) <span class="c-p">async</span> · (f) <span class="c-p">async</span>.</p>`,
  brute: `<p>Make every call synchronous inside one request handler. Checkout latency becomes the sum of six services, and if email or loyalty is down the customer cannot buy. Availability is the product of all six.</p>`,
  mcq: { q: 'Which call should NOT block checkout?', options: ['Card authorisation', 'Stock reservation', 'Confirmation email', 'Price check'], answer: 2, explain: 'The email is a side effect nobody waits for; publish an event and let Notifications handle it, retrying on its own.' },
  hints: [`<p>Hint 1: ask "does the next step depend on this answer right now?"</p>`, `<p>Hint 2: side effects after money is taken are events; decisions before money is taken are sync calls.</p>`, `<p>Hint 3: for the sync ones add timeouts, idempotency keys and a circuit breaker.</p>`],
  approach: `<p>Sync (critical path, the answer is needed to continue): <b>price check</b> (cached), <b>reserve stock</b> and <b>authorise card</b>, each with a timeout, circuit breaker and idempotency key. Async (publish <code>OrderPlaced</code> once the order is committed via the outbox): <b>email</b>, <b>loyalty points</b> and <b>shipping label</b>. The async consumers are independent and may lag or be down without affecting the customer, and each must be idempotent because delivery is at-least-once. Result: 3 sync hops on the critical path instead of 6, and checkout survives an outage of any async consumer.</p>`,
  complexity: `<p>Critical-path latency ≈ sum of 3 calls rather than 6; availability = product of 3 services.</p>`
});

prob({
  title: 'Spot the Distributed Monolith', level: 'Easy', tags: ['decomposition', 'anti-patterns'], companies: ['Thoughtworks'],
  statement: `<p>A company "went microservices" and reports: all 12 services share one Postgres database; a release needs services A, B and C deployed in a fixed order; a shared library <code>common-models.jar</code> contains every DTO. List what is wrong and propose first fixes.</p>`,
  constraints: `Give at least three problems and one fix each.`,
  example: `<p>Shared database → <span class="c-r">no data ownership</span>; lock-step deploys → <span class="c-r">coupled release</span>; common-models → <span class="c-r">version coupling</span>.</p>`,
  brute: `<p>Add more services and an API gateway. This adds network hops and operational load without removing the coupling, so every release is still a coordinated event and a table change can break ten services.</p>`,
  mcq: { q: 'What is the strongest sign of a distributed monolith?', options: ['Many repositories', 'Services that must be deployed together', 'Use of Kubernetes', 'Having an API gateway'], answer: 1, explain: 'If services cannot be released independently they are one unit with a network in the middle.' },
  hints: [`<p>Hint 1: independent deploy and own data are the two defining properties of a service.</p>`, `<p>Hint 2: look at what is shared: database, libraries, release schedule.</p>`, `<p>Hint 3: fixes: schema-per-service first, versioned API contracts, remove shared models, merge services that always change together.</p>`],
  approach: `<p><b>Problems.</b> (1) Shared database: any team can read or change another's tables, so schema changes need global agreement. (2) Ordered deploys: services depend on each other's exact versions, so no independent release. (3) Shared <code>common-models</code> library forces lock-step upgrades. <b>Fixes.</b> Give each service its own schema first (then own database), forbidding cross-schema access with permissions; replace cross-service reads with APIs or event-fed local copies. Version APIs and keep backward-compatible changes (add fields, never remove) so deploy order stops mattering; replace the shared jar with per-service DTOs generated from contracts (OpenAPI/Protobuf). If two services always change together, <b>merge them</b>; a smaller number of truly independent services beats many coupled ones.</p>`,
  complexity: `<p>Qualitative; measure with deployment independence rate and cross-service change coupling.</p>`
});

prob({
  title: 'Choreographed Hotel Booking Saga', level: 'Medium', tags: ['saga', 'choreography', 'events'], companies: ['Booking.com', 'Airbnb'],
  statement: `<p>Design a choreographed saga for "book a trip": Flights, Hotels and Payments are separate services. Define the events each service publishes and listens to for the happy path and when the hotel is full. Say what makes choreography risky here.</p>`,
  constraints: `No central orchestrator · at-least-once events · each service has its own database.`,
  example: `<p>TripRequested → FlightReserved → HotelRejected → FlightCancelled → TripFailed.</p>`,
  brute: `<p>One Trip service calls flights, hotels and payments in a try/catch and undoes by hand. If it crashes midway nobody remembers which bookings exist, so flights stay reserved with no trip.</p>`,
  mcq: { q: 'What is the main risk of choreography as steps grow?', options: ['It needs more servers', 'The flow is spread across services and becomes hard to follow and debug', 'It cannot compensate', 'Events cannot be used'], answer: 1, explain: 'Without a central place for the logic, understanding and monitoring the whole flow requires reading many services; cyclic event dependencies appear.' },
  hints: [`<p>Hint 1: each service reacts to the previous service's event.</p>`, `<p>Hint 2: failure events trigger compensation: HotelRejected makes Flights cancel.</p>`, `<p>Hint 3: add a correlation id (tripId) and idempotent handlers; consider moving to orchestration if steps exceed about 4.</p>`],
  approach: `<p><b>Happy path.</b> Trips publishes <code>TripRequested(tripId)</code> → Flights reserves a seat and publishes <code>FlightReserved</code> → Hotels reserves a room and publishes <code>HotelReserved</code> → Payments charges and publishes <code>PaymentCaptured</code> → Trips marks the trip CONFIRMED. <b>Hotel full.</b> Hotels publishes <code>HotelRejected</code>; Flights listens and cancels its reservation, publishing <code>FlightCancelled</code>; Trips listens to <code>HotelRejected</code> and sets FAILED. Every event carries <code>tripId</code> and <code>eventId</code>; each handler is idempotent (cancelling twice is a no-op) and publishes via an outbox.</p>
    <p><b>Risks.</b> The flow exists only as a convention across three codebases, new steps modify several services, cycles are easy to create, and "where is trip 77 stuck?" needs event tracing. With more steps, deadlines or human approval, switch to an orchestrator.</p>`,
  complexity: `<p>2 events per step; compensation adds one event per completed step.</p>`
});

prob({
  title: 'Idempotent Payment Webhook Consumer', level: 'Medium', tags: ['idempotency', 'at-least-once', 'inbox'], companies: ['Stripe', 'PayPal'],
  statement: `<p>A payment provider calls your webhook <code>POST /webhooks/payment</code> with <code>{eventId, orderId, status}</code>. It retries on any non-2xx and sometimes sends the same event twice, out of order. Design the handler so an order is marked PAID exactly once in effect, and a late PENDING event never overwrites PAID.</p>`,
  constraints: `Handler may run on several instances · response within 2 s · events may repeat or arrive out of order.`,
  example: `<p>Events: PAID(e1), PAID(e1 again), PENDING(e0 late) → order stays <span class="c-g">PAID</span>, one fulfilment event.</p>`,
  brute: `<p>Just run <code>UPDATE orders SET status = :status</code> and publish fulfilment each time. A duplicate fulfils twice, and a late PENDING flips a paid order back, so a customer is charged but never shipped.</p>`,
  mcq: { q: 'How do you make duplicate deliveries harmless?', options: ['Ignore errors', 'Record eventId in a unique inbox table in the same transaction as the effect', 'Use a longer timeout', 'Only run on one server'], answer: 1, explain: 'A unique key on eventId turns the second insert into a conflict, so the handler skips the work and still returns 200.' },
  hints: [`<p>Hint 1: the provider's eventId is your idempotency key.</p>`, `<p>Hint 2: one transaction: insert into inbox(event_id) then apply the status change and write an outbox row.</p>`, `<p>Hint 3: define a status order (PENDING &lt; PAID &lt; REFUNDED) and only move forward; return 200 for duplicates.</p>`],
  approach: `<p>In one DB transaction: (1) <code>INSERT INTO webhook_inbox(event_id)</code> with a primary key; on a unique violation, roll back and return <b>200</b> (already handled, so the provider stops retrying). (2) Load the order and apply the transition only if it moves the state forward: <code>UPDATE orders SET status='PAID' WHERE id=:id AND status IN ('NEW','PENDING')</code>; a late PENDING affects 0 rows. (3) If the update changed a row, insert an <code>OrderPaid</code> row into the outbox in the same transaction, so fulfilment is triggered once. Verify the provider's signature header first and reject unsigned calls. Keep processing short; if heavy, store the event and return 200 immediately, then process asynchronously from a queue. Purge inbox rows after the provider's retry window.</p>`,
  complexity: `<p>O(1) database operations per event; the unique index on event_id provides the dedupe.</p>`
});

prob({
  title: 'Mobile BFF and Gateway Limits', level: 'Medium', tags: ['API gateway', 'BFF', 'rate limiting'], companies: ['Spotify', 'Uber'],
  statement: `<p>The mobile home screen needs data from Catalog, Cart, Orders and Recommendations, and users on 3G suffer. Design a mobile BFF behind the gateway: how it fans out, what happens when Recommendations is down, and how you rate-limit abusive clients fairly.</p>`,
  constraints: `p95 under 400 ms · 20k requests/s at peak · recommendations are optional · limit per user: 20 req/s burst 40.`,
  example: `<p>BFF calls the four services in parallel, Recommendations times out at 150 ms → response returns without it and header <code>X-Degraded: recommendations</code>.</p>`,
  brute: `<p>The phone calls the four services one after another over a slow network: four round trips of 100+ ms each, and any single failure breaks the screen. Business rules leak into every app version.</p>`,
  mcq: { q: 'Recommendations is down. What should the BFF do?', options: ['Return 500', 'Return the rest of the screen and mark recommendations as degraded or cached', 'Retry for 30 seconds', 'Block until it recovers'], answer: 1, explain: 'Classify optional data, use a short timeout and fall back to a cached or empty block; core data must still load.' },
  hints: [`<p>Hint 1: fan out in parallel inside the data centre, return one payload.</p>`, `<p>Hint 2: classify each downstream as critical or optional with its own timeout.</p>`, `<p>Hint 3: token bucket per user key in Redis at the gateway; BFF holds no state and scales horizontally.</p>`],
  approach: `<p><b>Flow.</b> Phone → gateway (TLS, JWT check, rate limit) → <code>mobile-bff</code>. The BFF calls Catalog, Cart, Orders and Recommendations <b>in parallel</b> with per-call timeouts (critical ones 300 ms, Recommendations 150 ms). Latency becomes the slowest call, not the sum, and the phone makes a single request with a trimmed JSON payload tailored to the screen.</p>
    <p><b>Degradation.</b> Catalog and Cart are critical (fail the request if both down; return partial if one optional piece fails); Recommendations is optional: on timeout or open circuit return a cached list or an empty block and set <code>X-Degraded</code>. Use circuit breakers per downstream so a sick service does not hold threads.</p>
    <p><b>Rate limiting.</b> A token bucket per user id (fallback IP/API key for anonymous) stored in Redis with a Lua script for atomic refill-and-take: 20 tokens/s, burst 40; respond 429 with <code>Retry-After</code>. Add a lower global limit per expensive route and keep counters local plus periodic sync if Redis latency is a worry. The BFF is stateless and owned by the mobile team, so response shape changes do not need backend team approval.</p>`,
  complexity: `<p>Latency = max of parallel calls plus about 5 ms overhead; gateway rate-limit check is one Redis round trip (about 1 ms).</p>`
});

prob({
  title: 'Event-Sourced Seat Reservation', level: 'Medium', tags: ['event sourcing', 'concurrency', 'snapshots'], companies: ['Ticketmaster', 'BookMyShow'],
  statement: `<p>Model a concert seat map with event sourcing: events <code>SeatHeld(seat, user, expiresAt)</code>, <code>SeatReleased(seat)</code>, <code>SeatSold(seat)</code>. Explain how two users racing for seat A1 are resolved, how holds expire, and how you keep loading a 50,000-seat event fast.</p>`,
  constraints: `10,000 users hitting one show · hold lasts 5 minutes · load map p99 under 50 ms.`,
  example: `<p>Events: Held(A1,u1) → Held(A1,u2) rejected, Released(A1) via expiry → Held(A1,u2) accepted.</p>`,
  brute: `<p>Store a seat row and update it with read-then-write logic without versions. Two users read "free" simultaneously and both write "held", so one seat is sold twice.</p>`,
  mcq: { q: 'How does event sourcing resolve two simultaneous holds on A1?', options: ['Both succeed', 'Append with expectedVersion; one fails the version check and retries, now sees the seat held', 'The later one wins', 'Use a global lock'], answer: 1, explain: 'Optimistic concurrency on the stream: the second append conflicts because the stream version moved, and on retry the folded state shows A1 is held.' },
  hints: [`<p>Hint 1: the aggregate is the show (or a section), the stream of its seat events.</p>`, `<p>Hint 2: command = load, fold, check, append with expectedVersion.</p>`, `<p>Hint 3: expiry is a timer that appends SeatReleased; use snapshots and shard streams per section.</p>`],
  approach: `<p><b>Aggregate boundary.</b> One stream per <i>section</i> (about 500 seats), not one for the whole venue: smaller streams mean fewer conflicts and short replays. <b>Hold command.</b> Load snapshot + tail events, fold to a seat-status map, reject if A1 is held (and not expired) or sold, otherwise append <code>SeatHeld</code> with <code>expectedVersion</code>. Two racers both try version N+1; the primary key (stream_id, version) accepts one, the other gets a conflict, reloads, folds, sees A1 held and is rejected with a friendly message.</p>
    <p><b>Expiry.</b> The fold treats a hold as expired when <code>expiresAt &lt; now</code> (pass the time into the command, not into apply), and a scheduler also appends <code>SeatReleased</code> so projections are updated. <b>Speed.</b> Snapshot each section every 200 events; the "seat map" screen reads a CQRS projection (Redis hash per section) updated from the events, with a few seconds of staleness acceptable because the hold command is the real arbiter. Purchases use a saga with Payments; <code>SeatSold</code> is appended only after payment capture.</p>`,
  complexity: `<p>Command: O(events since snapshot) ≤ 200; conflicts retry at most a few times under normal contention.</p>`
});

prob({
  title: 'Timeout and Retry Budget for the Checkout Chain', level: 'Medium', tags: ['resilience', 'timeouts', 'circuit breaker'], companies: ['Amazon', 'Netflix'],
  statement: `<p>Checkout is Gateway → Orders → Payments → Bank API. The user-facing SLO is 2 s. Each service currently has a 5 s timeout and 3 retries. Show what can go wrong and design a timeout/retry/circuit-breaker scheme.</p>`,
  constraints: `Bank API p99 600 ms · bank sometimes degrades to 10 s · POST /charge must never charge twice.`,
  example: `<p>Deadlines: Gateway 2000 ms → Orders 1800 → Payments 1200 → Bank 800, retries only at Payments with an idempotency key.</p>`,
  brute: `<p>5 s timeouts with 3 retries at every layer. One slow bank call can cause 4 × 4 × 4 = 64 attempts, hold threads for minutes, exhaust pools upstream and charge the card more than once if the POST is not idempotent.</p>`,
  mcq: { q: 'Where should retries happen?', options: ['At every layer', 'At one layer only, with exponential backoff and jitter on idempotent or keyed calls', 'Never', 'Only at the database'], answer: 1, explain: 'Retries multiply across layers; retrying at one layer with backoff+jitter and idempotency keys bounds the extra load.' },
  hints: [`<p>Hint 1: every hop must have a shorter timeout than its caller.</p>`, `<p>Hint 2: a retry at each layer multiplies the load; pick one layer.</p>`, `<p>Hint 3: add a circuit breaker and a bulkhead around the bank client and an idempotency key on the charge.</p>`],
  approach: `<p><b>Problems.</b> Equal 5 s timeouts mean the caller gives up after the callee is still working (wasted work, zombie requests), and 3 retries at 3 layers multiply into dozens of attempts against a struggling bank (retry storm), with threads piling up until Orders and the gateway also fail.</p>
    <p><b>Scheme.</b> Propagate a deadline: gateway 2000 ms, Orders 1800, Payments 1200, Bank call 800 ms (above p99 of 600 ms). Retry <b>only in Payments</b>, at most once, with backoff and jitter, and only inside the remaining budget; the charge carries an <code>Idempotency-Key = orderId</code> so a retry cannot double-charge. Wrap the bank client in a <b>circuit breaker</b> (open after 50% failures in 20 calls, half-open after 10 s) and a <b>bulkhead</b> (separate small thread pool) so a slow bank cannot consume all threads. When open, Payments returns a fast "payment pending" and the order enters an async path (saga continues when the bank recovers, customer informed by email). Add a retry budget (no more than 10% extra requests) and alert on breaker state and queue depth.</p>`,
  complexity: `<p>Worst-case latency bounded by the 2 s deadline; worst-case bank attempts per charge bounded to 2.</p>`
});

prob({
  title: 'Extract Orders from the Monolith with Strangler Fig', level: 'Hard', tags: ['migration', 'strangler fig', 'data sync'], companies: ['Shopify', 'Etsy', 'Zalando'],
  statement: `<p>Orders is the heart of a 10-year-old monolith and still owns tables joined by 30 other queries. Plan its extraction with no downtime: routing, data migration, keeping both systems consistent during the transition, verification and rollback.</p>`,
  constraints: `No downtime · 1,000 orders/min · 30 legacy queries join orders · must be able to roll back for 2 weeks.`,
  example: `<p>Phases: route reads to new service (shadow) → dual-write → backfill → switch writes → retire legacy tables.</p>`,
  brute: `<p>Freeze features, copy tables over a weekend, flip everything and hope. Any mismatch is discovered by customers, rollback means restoring a weekend-old backup, and the 30 joining queries break at once.</p>`,
  mcq: { q: 'Which approach is safest for moving write ownership?', options: ['Big-bang cut-over at midnight', 'Backfill, dual-write or CDC, verify, then flip with a feature flag', 'Delete the old tables first', 'Run two independent copies forever'], answer: 1, explain: 'Incremental migration with verification and a reversible switch keeps risk small and makes rollback a flag change.' },
  hints: [`<p>Hint 1: put a gateway or facade in front so routing is a config change.</p>`, `<p>Hint 2: sync data both ways during migration (CDC from legacy to new, then new back to legacy for old queries).</p>`, `<p>Hint 3: verify with shadow reads and diff reports; replace the 30 joins with APIs or event-fed read models before deleting tables.</p>`],
  approach: `<p><b>1. Facade.</b> Route <code>/orders/**</code> through the gateway/facade still pointing at the monolith. <b>2. Build</b> the new order service with its own database and an anti-corruption layer translating legacy concepts. <b>3. Backfill</b> historical data with a batch job and keep it current with CDC from the legacy tables (Debezium) into the new service; run a reconciliation job that diffs counts and checksums daily. <b>4. Shadow reads:</b> the facade sends reads to both, serves the legacy answer, logs differences; fix until the diff rate is near 0. <b>5. Switch reads</b> to the new service by percentage (1% → 100%). <b>6. Switch writes:</b> the new service becomes the writer, and a reverse sync (outbox events consumed by a legacy adapter) keeps the legacy tables current for the 30 joining queries and for rollback. <b>7. Replace the legacy joins</b> one by one with calls to the Orders API or read models fed by order events. <b>8. Retire:</b> after two stable weeks, remove the reverse sync and drop legacy tables.</p>
    <p><b>Rollback.</b> At every step the flag flips traffic back; because the reverse sync keeps the legacy tables current, the monolith can take over instantly. Use idempotent sync handlers and sequence numbers to survive duplicates, and watch metrics: order success rate, p99, reconciliation diffs.</p>`,
  complexity: `<p>Project risk is managed by small reversible steps; sync lag target under 1 s during dual operation.</p>`
});

prob({
  title: 'Repair a Corrupted Projection', level: 'Hard', tags: ['CQRS', 'replay', 'zero downtime'], companies: ['Amazon', 'Stripe'],
  statement: `<p>A bug in the order-summary projector double-counted cancelled orders for three days. 8% of read documents are wrong. Design the repair with no downtime, no data loss and a guarantee it will not happen silently again.</p>`,
  constraints: `Event log retained 90 days · 5,000 reads/s · projector processes 2,000 events/s · downtime not allowed.`,
  example: `<p>Build view v2 beside v1 → replay from day 0 → compare → flip alias → delete v1.</p>`,
  brute: `<p>Patch documents by hand with ad-hoc scripts guessed from the bug. You cannot be sure which are wrong, new events keep arriving and can undo your fix, and the same bug class can return unnoticed.</p>`,
  mcq: { q: 'Why is rebuilding from events the right fix?', options: ['It is the fastest option always', 'The read model is derived data, so a corrected projector replayed over the log reproduces the correct view deterministically', 'It avoids testing', 'It deletes the write DB'], answer: 1, explain: 'Projections are functions of the event log; fix the function and recompute, rather than patching results.' },
  hints: [`<p>Hint 1: the event log is the truth; the view is disposable.</p>`, `<p>Hint 2: build a second view version beside the live one, catch up, compare, then switch an alias.</p>`, `<p>Hint 3: prevent recurrence with replay tests, invariants checks (sum of cancelled should be zero) and a nightly reconciliation against the write DB.</p>`],
  approach: `<p><b>Fix the code first</b> and add a failing regression test using the sequence that triggered the bug (Placed → Cancelled → Cancelled-duplicate). <b>Rebuild beside, not in place:</b> deploy projector v2 writing to <code>order_summary_v2</code>, start consuming from offset 0 (events are kept 90 days, and older history comes from the latest snapshot or archived log). At 2,000 events/s a 3-day window of say 150M events replays in about 21 hours, so run several parallel consumers partitioned by orderId (aggregate order preserved), cutting this to a couple of hours. Meanwhile v1 keeps serving reads.</p>
    <p><b>Verify.</b> When v2 lag reaches about 0, run a comparison job: sample or full diff v1 vs v2 vs the write DB; expect differences only in the 8% known-bad set. <b>Switch</b> the query API's alias to v2 (instant, reversible), keep v1 for a day, then drop it. <b>Prevent recurrence.</b> Property-based replay tests (duplicates, reordering), idempotent checkpoints per aggregate, invariant monitors (counts of CANCELLED orders vs the write DB), a nightly reconciliation job with an alert threshold, and a documented rebuild runbook that is rehearsed quarterly.</p>`,
  complexity: `<p>Replay cost = events ÷ (consumer throughput × parallelism); reads are unaffected since v1 serves traffic during the rebuild.</p>`
});

prob({
  title: 'Orchestrator or Choreography for an 8-Step Process?', level: 'Hard', tags: ['saga', 'orchestration', 'workflow'], companies: ['Uber', 'Airbnb', 'Temporal'],
  statement: `<p>Loan onboarding has eight steps (KYC, credit check, fraud scoring, manual underwriting that can take two days, contract signing, funds transfer, ledger entry, notification). Some steps are human, some have deadlines, failures need compensation. Choose orchestration or choreography, justify it, and sketch the state, timers and failure handling.</p>`,
  constraints: `Process lasts up to 3 days · must be auditable · steps owned by different teams · exactly-once money transfer effect.`,
  example: `<p>Orchestrated workflow with durable timers: underwriting waits up to 48 h, then escalates; transfer step has an idempotency key.</p>`,
  brute: `<p>Eight services reacting to each other's events with no owner. Nobody can answer "where is application 4711 stuck?", timeouts and escalation are scattered, adding a step means editing several services, and event cycles creep in.</p>`,
  mcq: { q: 'Why choose orchestration here?', options: ['Fewer messages always', 'Long-running steps, timers, human tasks and auditability need one place that owns the state machine', 'Choreography cannot use events', 'It removes the need for idempotency'], answer: 1, explain: 'A workflow engine/orchestrator persists state, schedules timers and shows the whole process in one place, which suits long-running audited flows.' },
  hints: [`<p>Hint 1: count the signals: 8 steps, humans, deadlines, audit need.</p>`, `<p>Hint 2: a durable workflow engine (Temporal, Step Functions, Camunda) gives persisted state, timers and retries.</p>`, `<p>Hint 3: define compensation per step; make money transfer idempotent and place it after all risk checks (pivot).</p>`],
  approach: `<p><b>Choice: orchestration</b> with a workflow engine (Temporal or Camunda). Reasons: eight steps with branching, a human task lasting days, deadlines and escalation, an audit requirement, and ownership spread over teams all argue for a single visible state machine. The engine persists every step, gives durable timers, retries with backoff and a searchable history, so "where is 4711?" has a one-click answer.</p>
    <p><b>Design.</b> Workflow: KYC → credit → fraud (parallel where independent) → underwriting (signal-based wait with 48 h timer; on timeout escalate, after 72 h auto-decline) → contract signing → funds transfer → ledger → notify. Steps are activities calling services through idempotent APIs or commands via outbox, keyed by <code>applicationId:step</code>. Put the irreversible <b>funds transfer after</b> all checks (the pivot) and make it idempotent with the key so a retry cannot pay twice; compensation for steps before the pivot is cheap (cancel credit hold, void contract). After the pivot the workflow only retries forward until success, alerting a human on persistent failure. Ledger and notification are idempotent consumers of an event emitted when the transfer succeeds (or just later workflow steps). Publish workflow events for dashboards and analytics.</p>
    <p><b>Trade-offs.</b> One more critical component to run (use managed or HA workflow service) and a coupling of the orchestrator to each participant's API; accepted because the process is long and audited. Simple fan-out reactions (notify, analytics) can stay choreographed off the final event.</p>`,
  complexity: `<p>State per workflow instance is small and durable; timers are handled by the engine, so cost is dominated by the number of concurrent workflows (millions are fine on Temporal).</p>`
});

prob({
  title: 'Exactly-Once Effect for a Payout Pipeline', level: 'Hard', tags: ['outbox', 'Kafka', 'idempotency', 'ledger'], companies: ['Stripe', 'Razorpay', 'Wise'],
  statement: `<p>Orders emit <code>PayoutRequested</code> events via an outbox to Kafka. A payout service calls a bank API and records the result. Design the pipeline so each payout is sent to the bank at most once in effect, across relay crashes, consumer restarts, rebalances and bank timeouts that leave the outcome unknown.</p>`,
  constraints: `Kafka at-least-once · bank API supports an idempotency key and a status lookup · money must never be sent twice.`,
  example: `<p>Duplicate PayoutRequested(p-1) twice, bank call times out once: bank sees <span class="c-g">one</span> payout with key p-1.</p>`,
  brute: `<p>Consume, call the bank, commit the offset. A crash after the bank call but before the commit replays the message and pays again; a timeout with unknown result is retried blindly with no key, so the bank may pay twice.</p>`,
  mcq: { q: 'The bank call timed out; was money sent? What do you do?', options: ['Assume failure and retry with a new request', 'Retry with the same idempotency key or query status by key before deciding', 'Mark paid', 'Drop the message'], answer: 1, explain: 'An unknown outcome must be resolved with the same idempotency key or a status lookup; a new request may duplicate the payout.' },
  hints: [`<p>Hint 1: every layer is at-least-once, so the effect must be idempotent at the final side effect (the bank call).</p>`, `<p>Hint 2: keep a payout state machine in your DB (REQUESTED → SENDING → SENT/FAILED) updated transactionally; use payoutId as the bank idempotency key.</p>`, `<p>Hint 3: handle UNKNOWN by reconciliation: poll status by key, never blind re-send under a new key.</p>`],
  approach: `<p><b>Producer side.</b> Order service writes the order and an outbox row <code>PayoutRequested(payoutId)</code> in one transaction; the relay publishes with key = payoutId (at-least-once, duplicates possible). <b>Consumer side.</b> The payout service has a table <code>payout(id PK, state, bank_ref, attempts)</code>. On a message it does <code>INSERT ... ON CONFLICT DO NOTHING</code>; if the row already exists in SENT it acks and stops (duplicate). Otherwise it moves REQUESTED → SENDING in a transaction, then calls the bank with <code>Idempotency-Key = payoutId</code>.</p>
    <p><b>Outcomes.</b> Success: store <code>bank_ref</code>, state SENT, write an outbox row <code>PayoutSent</code>, then commit the offset. Definite failure (4xx like invalid account): state FAILED, emit <code>PayoutFailed</code> for compensation. <b>Timeout/5xx = UNKNOWN:</b> keep state SENDING, schedule a retry with backoff using the <i>same key</i>, and a reconciler that queries the bank status by key; only a confirmed "not found" after the bank's idempotency window allows a fresh attempt. Because the key is stable and the bank de-duplicates, a crash after the bank call but before our commit just replays harmlessly. Consumer rebalances are safe for the same reason.</p>
    <p><b>Controls.</b> Daily ledger reconciliation (our SENT payouts vs the bank statement), alert on SENDING older than N minutes, limits per payout, and a manual review queue for UNKNOWN beyond 24 h. The guarantee is "at-least-once messaging + idempotent side effect = exactly-once effect".</p>`,
  complexity: `<p>One DB row and one bank call per payout; retries bounded by backoff; reconciliation scans only SENDING and recent rows.</p>`
});

/* =====================================================================
   QUIZ
   ===================================================================== */
quiz.push(
  { q: 'What is the most important rule when splitting a monolith into services?', options: ['One service per database table', 'Each service owns its data; no other service reads its tables', 'Use as many services as possible', 'Share one database for easy joins'], answer: 1, explain: 'Data ownership is what gives independence. A shared database makes a distributed monolith.' },
  { q: 'Which is client-side service discovery?', options: ['Calling a Kubernetes Service name', 'A caller library fetches the instance list from Eureka and picks one', 'Calling a cloud load balancer DNS name', 'Hard-coded IPs'], answer: 1, explain: 'In client-side discovery the caller queries the registry and chooses the instance itself.' },
  { q: 'A registry sees no heartbeat from an instance for longer than the TTL. What happens?', options: ['The instance is evicted from lookups', 'The instance is restarted by the registry', 'Nothing', 'The registry shuts down'], answer: 0, explain: 'TTL expiry evicts silent instances so callers stop being routed to crashed nodes.' },
  { q: 'Three sync services in a chain each have 99.9% availability. Roughly what is the chain availability?', options: ['99.9%', '99.7%', '99.0%', '100%'], answer: 1, explain: '0.999<sup>3</sup> ≈ 0.997. Availability multiplies along a synchronous chain.' },
  { q: 'Why can a saga not simply "roll back" like a database transaction?', options: ['Sagas forbid undo', 'Each local transaction is already committed, so you run new compensating actions', 'Brokers delete messages', 'Rollback is slower'], answer: 1, explain: 'Local transactions committed in separate databases; undo is a new business action such as a refund.' },
  { q: 'In choreography, who coordinates the saga?', options: ['A central orchestrator', 'No one: services react to each other\'s events', 'The API gateway', 'The database'], answer: 1, explain: 'There is no central coordinator; each service listens and publishes events.' },
  { q: 'What problem does the transactional outbox solve?', options: ['Slow queries', 'Atomically saving a business change and the event that announces it', 'Service discovery', 'Encrypting traffic'], answer: 1, explain: 'Business row and event row are written in one local transaction; a relay publishes later.' },
  { q: 'An outbox relay crashes after publishing but before marking the row sent. What is the result?', options: ['The event is lost', 'The event may be published twice, so consumers must be idempotent', 'The database rolls back', 'Kafka deletes it'], answer: 1, explain: 'This gives at-least-once publishing; dedupe by eventId on the consumer.' },
  { q: 'What is true of a CQRS read model?', options: ['It is always strongly consistent', 'It is a copy shaped for queries, updated from events, usually eventually consistent', 'It must use the same tables as writes', 'It cannot be rebuilt'], answer: 1, explain: 'It is derived data, optimised for reading, and can be rebuilt by replaying events.' },
  { q: 'In event sourcing, how do you get the current state?', options: ['Read a state column', 'Fold (replay) the ordered events, optionally from a snapshot', 'Ask the broker', 'Query the read model only'], answer: 1, explain: 'State is a pure function of the event history; snapshots speed up long histories.' },
  { q: 'What is the purpose of a sidecar proxy in a mesh?', options: ['Store business data', 'Handle mTLS, retries, routing and telemetry for its service without app changes', 'Replace the database', 'Compile the code'], answer: 1, explain: 'Sidecars implement the network policy so app code stays focused on business logic.' },
  { q: 'Which situation argues AGAINST microservices?', options: ['40 engineers in 6 teams blocked on one release train', 'A 6-person startup still discovering its product, needing strongly consistent data', 'Parts with very different scaling needs', 'A compliance-isolated payment module'], answer: 1, explain: 'Small teams with unstable domains and strong consistency needs pay the distributed cost without the benefit; a modular monolith fits better.' },
  { q: 'Where should retries normally be implemented in a call chain?', options: ['At every layer', 'At one layer, with backoff, jitter and idempotency', 'Nowhere', 'Only in the database'], answer: 1, explain: 'Retries multiply across layers (retry storm); one controlled layer keeps load bounded.' }
);

/* =====================================================================
   INTERVIEW
   ===================================================================== */
interview.push(
  { q: 'How do you decide where to cut a monolith into services?', level: 'I', a: `<p>I start from <b>business capabilities</b> and DDD <b>bounded contexts</b>: where the language and the data model change, and which parts change together or scale differently. I check transaction boundaries (things needing one ACID transaction stay together), git change coupling, and team structure (Conway's law). Each service must own its data. I prefer a few coarse services first because merging services later is much harder than splitting, and I migrate with a strangler fig, extracting low-risk edge capabilities first.</p>`, followUps: ['What are the signs a boundary is wrong?', 'How do you handle a foreign key that now crosses services?'] },
  { q: 'What does an API gateway do and what should it not do?', level: 'B', a: `<p>It is the single entry point: routing, authentication, rate limiting, TLS termination, request logging, protocol translation and sometimes aggregation. It should <b>not</b> hold business logic or orchestrate long workflows, or it becomes a bottleneck and a monolith in disguise. Run several stateless replicas to avoid a single point of failure, and use BFFs when different clients need different payloads.</p>`, followUps: ['Gateway vs service mesh?', 'What is a BFF?'] },
  { q: 'Compare client-side and server-side service discovery.', level: 'I', a: `<p>Client-side: the caller queries a registry (Eureka, Consul), caches the list and picks an instance; no extra hop and smart balancing, but each language needs a library and caches can go stale. Server-side: the caller uses a stable name (Kubernetes Service, load balancer) and the platform picks the instance; simpler clients, but an extra component and per-connection balancing issues for long-lived gRPC connections. On Kubernetes server-side is the default; a mesh adds smart per-request balancing.</p>`, followUps: ['How are dead instances removed?', 'What if the registry is down?'] },
  { q: 'When would you choose gRPC, REST or messaging between services?', level: 'I', a: `<p>REST/JSON for public and partner APIs and simple CRUD; gRPC for internal low-latency calls with typed contracts and streaming; messaging (events/commands through a broker) when the caller does not need an immediate answer, when many consumers care, to absorb spikes, or to decouple availability. The deciding question per call: does the caller need the answer now to continue? I keep sync hops on the user-critical path few, protect them with timeouts, circuit breakers and idempotency, and push the rest to events.</p>`, followUps: ['How do you make a retry safe?', 'What happens to availability in a long sync chain?'] },
  { q: 'Explain the saga pattern with an example.', level: 'I', a: `<p>A saga replaces one distributed transaction with a sequence of local transactions, each with a compensating action. For an order: create order, reserve stock, charge card, create shipment. If charging fails, I run the compensations of completed steps in reverse (release stock, cancel order). The system is eventually consistent, compensations must be idempotent and retried, and intermediate states are visible (no isolation), so I use PENDING states and semantic locks. I put hard-to-undo steps last.</p>`, followUps: ['Orchestration or choreography here?', 'What if a compensation fails?'] },
  { q: 'Orchestration vs choreography: how do you choose?', level: 'A', a: `<p>Orchestration puts the flow in one persisted state machine, so it is easier to understand, monitor, time out and change; it suits flows with 4+ steps, branching, timers or human tasks, at the cost of one more component and coupling to participants. Choreography has services react to events, giving loose coupling and no central component, which is fine for 2-3 steps and simple fan-out, but gets hard to follow and can create cyclic dependencies. In practice I orchestrate the core business flow and choreograph side effects like notifications and analytics.</p>`, followUps: ['Which tools support orchestration?', 'How do you observe a choreographed flow?'] },
  { q: 'What is the dual-write problem and how does the outbox fix it?', level: 'I', a: `<p>Updating a database and publishing to a broker are two systems, so a crash between them either loses the event or publishes an event for a change that never committed. The transactional outbox inserts the event into an <code>outbox</code> table in the same local transaction as the business change. A relay (polling with SKIP LOCKED, or CDC like Debezium) publishes pending rows and marks them sent. Publishing is at-least-once, so consumers dedupe on the eventId. Ordering per aggregate is kept by reading in id order and using the aggregate id as the partition key.</p>`, followUps: ['Polling vs CDC?', 'How do you purge the table?'] },
  { q: 'Can you achieve exactly-once delivery across services?', level: 'A', a: `<p>Not end to end over unreliable networks. What you can build is an <b>exactly-once effect</b>: at-least-once delivery plus idempotent processing. Use the outbox on the producer, stable event ids, an inbox or unique constraint on the consumer in the same transaction as the side effect, and idempotency keys when calling external systems. Kafka transactions and idempotent producers give exactly-once semantics inside Kafka pipelines, but a call to a database or bank API still needs idempotency of its own.</p>`, followUps: ['What happens on consumer rebalance?', 'How do you handle an unknown outcome from a bank API?'] },
  { q: 'What is CQRS and when is it worth the cost?', level: 'I', a: `<p>CQRS separates the write model (commands, invariants, normalised) from the read model (queries, denormalised views updated by events). It is worth it when read and write shapes differ a lot, reads vastly outnumber writes, a screen needs data from several services, or search/reporting load hurts the transactional store. Costs are an eventually consistent read side, projectors to operate and monitor, and replay tooling. I start with the cheapest level (separate query code or views in the same database) and add separate stores only when forced.</p>`, followUps: ['How do you give users read-your-own-writes?', 'Does CQRS need event sourcing?'] },
  { q: 'Explain event sourcing, its benefits and its costs.', level: 'A', a: `<p>Instead of storing current state, you store an append-only log of domain events and derive state by folding them. Benefits: full audit trail, time travel, rebuildable read models, natural event publication, and debugging by replay. Costs: a different mindset, event versioning forever (upcasters), eventual consistency with projections (so usually CQRS), snapshots for long streams, awkward ad-hoc queries, and privacy challenges with immutable data (crypto-shredding). I use it where history is the business (ledgers, orders, compliance), not for plain CRUD.</p>`, followUps: ['How do you handle concurrent writers?', 'How do you evolve an event schema?'] },
  { q: 'What does a service mesh give you and what does it cost?', level: 'A', a: `<p>A sidecar proxy per pod (data plane) managed by a control plane gives uniform mTLS and service identity, retries/timeouts/circuit breaking, traffic splitting for canaries, authorisation policies and telemetry, independent of the application language. Costs: extra hops (1-3 ms), CPU and RAM per pod, operational complexity (upgrades, debugging proxy config, startup ordering) and a platform team. It pays off with many services, polyglot stacks and compliance needs; with a handful of services, a gateway plus libraries is simpler. Ambient and eBPF modes reduce the overhead.</p>`, followUps: ['Why are mesh retries dangerous for POSTs?', 'Gateway vs mesh?'] },
  { q: 'When would you NOT choose microservices?', level: 'B', a: `<p>When the team is small, the domain is still being discovered, there is no real scaling or release pain, strong consistency across the data is required, or the organisation lacks CI/CD, observability and on-call maturity. In those cases I would build a <b>modular monolith</b> with clear module boundaries, separate schemas and in-process events, and extract a service only when a measurable need appears (independent scaling, team ownership, compliance isolation). Microservices solve organisational scaling problems; they do not fix messy code.</p>`, followUps: ['What is a modular monolith?', 'What triggers would make you split?'] },
  { q: 'How do you debug a request that crosses ten services?', level: 'I', a: `<p>I rely on a correlation/trace id created at the gateway and propagated in headers and message metadata (W3C <code>traceparent</code>), so logs, metrics and traces can be joined. Distributed tracing (OpenTelemetry to Jaeger/Tempo) shows the call tree and where time or errors occur; structured logs carry the trace id; RED metrics (rate, errors, duration) per service pair show which edge is sick. For async flows, the saga or event id plays the same role. A mesh gives edge metrics for free, but services must still forward trace headers.</p>`, followUps: ['How do you trace through Kafka?', 'What do you alert on?'] },
  { q: 'How do you evolve an API or event schema without breaking consumers?', level: 'A', a: `<p>Make changes backward compatible: add optional fields, never rename or repurpose, never remove until all consumers have moved; keep the version in the contract. Use consumer-driven contract tests (Pact) and, for events, a schema registry enforcing compatibility rules. For breaking changes publish a new version alongside the old (v2 route or topic), migrate consumers gradually, then retire the old one. With event sourcing use upcasters to convert old events on read. Deploy order should never matter; if it does, the services are coupled.</p>`, followUps: ['Why are events harder to change than REST APIs?', 'How do you deprecate a field?'] }
);

registerModule({
  id: 'be10',
  title: 'Microservices Patterns',
  intro: `<p>Microservices are easy to draw and hard to run. This module teaches the <b>patterns that make them work</b>: how to cut a system into services that own their data, how clients find and reach them (gateway and discovery), when to call and when to publish events, how to keep data consistent without distributed transactions (sagas and the transactional outbox), how to separate reads from writes (CQRS) and keep history as the source of truth (event sourcing), and what a service mesh adds. It ends with the most senior skill: knowing when <b>not</b> to use any of it.</p>
    <p>Every pattern starts with an everyday analogy, a visual walk-through you can step through, and small runnable models (a saga orchestrator, an outbox relay, a CQRS projector, an event-sourced account, a sidecar proxy) so you can see the mechanism, not just the box diagram.</p>`,
  goals: [
    'Decompose a monolith by business capability and bounded context, and give every service its own data',
    'Explain API gateway, BFF and client-side vs server-side discovery, including heartbeats and eviction',
    'Decide sync (REST/gRPC) vs async (events) for each call in a flow and defend it with availability and latency reasoning',
    'Design an orchestrated saga with compensations, and compare it with choreography',
    'Implement the transactional outbox with a relay and idempotent consumer, and state honestly what delivery guarantee it gives',
    'Build a CQRS read model projector and rebuild state from an event-sourced stream',
    'Describe what a service mesh does and decide when a modular monolith is the better answer'
  ],
  prereqs: `Backend modules on REST APIs, databases and transactions, and message queues (earlier Backend Engineering modules), plus basic HLD vocabulary (load balancer, cache, replication). Java reading is helpful; the runnable models are JS and Python.`,
  hours: 14,
  topics: topics,
  practice: practice,
  quiz: quiz,
  interview: interview
});
})();
