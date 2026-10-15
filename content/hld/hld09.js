(function () {
  var topics = [], practice = [], quiz = [], interview = [];

  /* small shared helpers for the visualizers in this module */
  function num(s, def) { var n = Number(s); return isNaN(n) ? def : n; }
  function parseKV(str) {
    var out = {};
    String(str || '').trim().split(/[\s,]+/).forEach(function (tok) {
      var p = tok.split('=');
      if (p.length === 2 && p[0]) out[p[0].toLowerCase()] = p[1];
    });
    return out;
  }
  function parseTimes(str, maxN) {
    var t = String(str || '').trim().split(/[\s,]+/).filter(function (x) { return x !== ''; }).map(Number);
    if (!t.length || t.some(isNaN)) throw new Error('Times must be numbers separated by spaces, e.g. 0 0 1 2 5');
    if (t.length > maxN) throw new Error('Use at most ' + maxN + ' request times');
    for (var i = 1; i < t.length; i++) if (t[i] < t[i - 1]) throw new Error('Times must be in non-decreasing order (time only moves forward)');
    if (t[0] < 0) throw new Error('Times must be ≥ 0');
    return t;
  }
  function r2(x) { return Math.round(x * 100) / 100; }

  /* ================= TOPIC 1: REST vs gRPC vs GraphQL ================= */
  topics.push({
    title: 'API Styles: REST vs gRPC vs GraphQL',
    analogy: `<p>Think of three ways to order food.</p>
      <ul>
        <li><b>REST</b> is a <b>restaurant with a fixed menu</b>. Each dish (resource) has a name and a number: "one <code>/pizzas/7</code> please". Anyone can read the menu, waiters (HTTP caches, proxies) understand it, but you get the dish exactly as the kitchen makes it — fries included even if you didn't want them.</li>
        <li><b>GraphQL</b> is a <b>build-your-own-bowl counter</b>. You hand over one slip listing exactly what you want — "rice, chicken, no beans, extra salsa" — and get exactly that in one trip.</li>
        <li><b>gRPC</b> is the <b>kitchen intercom between chefs</b>. Short coded messages ("T7-PIZ-2") that are super fast and strict, but a customer off the street can't understand them.</li>
      </ul>`,
    explain: `<p>An <b>API</b> (Application Programming Interface) is the "contract" one program offers another: <i>send me this, I'll send you that</i>. In system design interviews you almost always have to say <b>which style</b> of API you'd use and <b>why</b>. The three big request/response styles:</p>
      ${H.table(['', 'REST', 'GraphQL', 'gRPC'], [
        ['Big idea', 'Resources (nouns) + HTTP verbs', 'One endpoint, client writes a query', 'Call a remote function like a local one'],
        ['Example call', '<code>GET /users/7/orders?limit=10</code>', '<code>POST /graphql { user(id:7){ name orders(first:10){ total } } }</code>', '<code>OrderService.ListOrders(userId=7)</code>'],
        ['Wire format', 'JSON over HTTP/1.1 or HTTP/2', 'JSON over HTTP', 'Protocol Buffers (binary) over HTTP/2'],
        ['Contract', 'OpenAPI spec (optional)', 'Strongly typed schema (SDL)', 'Strongly typed <code>.proto</code> file, code generated'],
        ['Caching', H.c('g', 'Great — HTTP caches, CDNs, ETags'), H.c('y', 'Hard — everything is POST to one URL'), H.c('r', 'Not via HTTP caches')],
        ['Streaming', 'Not built in (use SSE/WebSockets)', 'Subscriptions (usually over WebSockets)', H.c('g', 'Built in: server, client and bidirectional streams')],
        ['Best for', 'Public APIs, CRUD, web/mobile', 'Many screens needing different data shapes', 'Internal service-to-service, low latency']
      ])}
      <p><b>REST in one breath:</b> every "thing" gets a URL (<code>/orders/42</code>), and you act on it with standard verbs: <code>GET</code> (read, safe), <code>POST</code> (create, not idempotent), <code>PUT</code> (replace, idempotent), <code>PATCH</code> (partial update), <code>DELETE</code> (remove, idempotent). Status codes tell the result: <code>200</code> OK, <code>201</code> Created, <code>204</code> No Content, <code>400</code> bad input, <code>401</code> who are you?, <code>403</code> not allowed, <code>404</code> not found, <code>409</code> conflict, <code>429</code> slow down, <code>5xx</code> server broke.</p>
      <p><b>GraphQL in one breath:</b> the server publishes a typed schema; the client sends a query that names exactly the fields it wants, possibly across many related objects, and gets one JSON response in that exact shape. It fixes <b>over-fetching</b> (getting fields you don't need) and <b>under-fetching</b> (needing 4 calls to draw one screen).</p>
      <p><b>gRPC in one breath:</b> you define services and messages in a <code>.proto</code> file; tools generate client and server code in Java, Go, Python, etc. Calls travel as compact binary over HTTP/2, which multiplexes many calls on one connection. Typically 3–10× smaller payloads and cheaper parsing than JSON.</p>
      <p>${H.c('b', 'Rule of thumb')}: <b>REST outside, gRPC inside, GraphQL for rich client screens</b> (often as a "Backend for Frontend" layer sitting on top of internal gRPC/REST services).</p>`,
    clues: [
      '"public API for third-party developers" → REST (+ OpenAPI), easy to learn, cacheable',
      '"microservices talking to each other", "low latency", "polyglot services" → gRPC',
      '"mobile app on slow network", "each screen needs different fields", "too many round trips" → GraphQL or a BFF',
      '"cache responses at the CDN" → REST with GET + Cache-Control/ETag (GraphQL needs persisted queries for that)',
      '"stream results", "bidirectional streaming between services" → gRPC streams',
      '"strict contract, generated clients, backward compatible schema evolution" → protobuf / gRPC'
    ],
    code: [
      { lang: 'http', title: 'REST: create and fetch an order', code: `POST /v1/orders HTTP/1.1
Host: api.shop.example
Authorization: Bearer eyJhbGciOi...
Content-Type: application/json
Idempotency-Key: 6f1c2a9e-1b7d-4a55-9a43-0b2f5e9d1c11

{"customerId": "c_77", "items": [{"sku": "TSHIRT-M", "qty": 2}]}

HTTP/1.1 201 Created
Location: /v1/orders/ord_9001
Content-Type: application/json

{"id": "ord_9001", "status": "PENDING", "total": 3998, "currency": "INR"}

GET /v1/orders/ord_9001 HTTP/1.1
Host: api.shop.example
If-None-Match: "v3-a81f"

HTTP/1.1 304 Not Modified` },
      { lang: 'http', title: 'GraphQL: one round trip, exact fields', code: `POST /graphql HTTP/1.1
Host: api.shop.example
Content-Type: application/json

{"query": "query($id: ID!) { user(id: $id) { name avatarUrl orders(first: 3) { edges { node { id total } } } } }",
 "variables": {"id": "c_77"}}

HTTP/1.1 200 OK
Content-Type: application/json

{"data": {"user": {"name": "Asha", "avatarUrl": "https://cdn.example/a.png",
  "orders": {"edges": [{"node": {"id": "ord_9001", "total": 3998}}]}}}}` },
      { lang: 'text', title: 'gRPC: the .proto contract (code is generated from this)', code: `syntax = "proto3";
package shop.v1;

service OrderService {
  rpc GetOrder (GetOrderRequest) returns (Order);                 // unary
  rpc ListOrders (ListOrdersRequest) returns (stream Order);       // server streaming
  rpc TrackOrders (stream TrackRequest) returns (stream Update);   // bidirectional
}

message GetOrderRequest { string order_id = 1; }
message ListOrdersRequest { string customer_id = 1; int32 page_size = 2; string page_token = 3; }
message Order {
  string id = 1;
  string status = 2;
  int64 total_minor = 3;   // money in paise/cents, never float
  // field numbers are the wire identity: never reuse or renumber them
}
message TrackRequest { string order_id = 1; }
message Update { string order_id = 1; string status = 2; }` }
    ],
    codeTitle: ['REST (HTTP + JSON)', 'GraphQL', 'gRPC (.proto)'],
    viz: {
      title: 'Drawing one screen: REST vs GraphQL vs gRPC',
      input: 'profile posts friends notifications',
      inputLabel: 'Data the mobile screen needs (1-5 words)',
      gen: function (input) {
        var res = String(input || '').trim().split(/[\s,]+/).filter(Boolean);
        if (!res.length) throw new Error('Type 1-5 resource names, e.g. profile posts friends');
        if (res.length > 5) throw new Error('Use at most 5 resources');
        var frames = [], RTT = 120;
        var nodes = [{ id: 'App', label: 'Mobile app', x: 8, y: 35, shape: 'box' }, { id: 'API', label: 'API layer', x: 42, y: 35, shape: 'box' }];
        res.forEach(function (r, i) { nodes.push({ id: 'S' + i, label: r + ' svc', x: 85, y: 6 + i * (58 / Math.max(1, res.length - 1 || 1)), shape: 'box' }); });
        if (res.length === 1) nodes[2].y = 35;
        function g(hl, ehl, edges, tags) { return { type: 'graph', directed: true, height: 70, nodes: nodes, edges: edges, hl: hl || {}, ehl: ehl || {}, tags: tags || {} }; }
        var baseEdges = [['App', 'API']].concat(res.map(function (r, i) { return ['API', 'S' + i]; }));
        frames.push({ narr: 'The app must draw one screen that needs <b>' + res.join(', ') + '</b>. Each piece lives in a different backend service. Let us count round trips over a mobile network where one round trip (RTT) ≈ <b>' + RTT + ' ms</b>.', parts: [g({ App: 'cur' }, {}, baseEdges), { type: 'vars', label: 'Assumptions', vals: { 'mobile RTT': RTT + ' ms', resources: res.length } }] });
        // REST
        var restBytes = 0;
        for (var i = 0; i < res.length; i++) {
          var e = {}; e['App-API'] = 'cur'; e['API-S' + i] = 'ok';
          var hl = { App: 'cur' }; hl['S' + i] = 'ok';
          restBytes += 1.8;
          frames.push({ narr: '<b>REST call ' + (i + 1) + '</b>: <code>GET /v1/' + res[i] + '</code>. The server returns the <i>whole</i> ' + res[i] + ' resource (≈1.8 KB JSON) even if the screen only shows 2 fields → <span class="c-y">over-fetching</span>. ' + (i > 0 ? 'Often this call needs an id from the previous response, so it cannot start early → <span class="c-r">another sequential round trip</span>.' : 'First call.'), parts: [g(hl, e, baseEdges, { App: 'REST' }), { type: 'vars', label: 'REST so far', vals: { 'round trips': i + 1, 'latency ≈': (i + 1) * RTT + ' ms', 'bytes ≈': r2(restBytes) + ' KB' }, hl: { 'round trips': 'cur' } }] });
        }
        // GraphQL
        var ge = { 'App-API': 'ok' }, gh = { App: 'cur', API: 'sel' };
        res.forEach(function (r, i) { ge['API-S' + i] = 'win'; gh['S' + i] = 'ok'; });
        frames.push({ narr: '<b>GraphQL</b>: the app sends ONE query listing exactly the fields it needs: <code>{ ' + res.map(function (r) { return r + ' { …2 fields… }'; }).join(' ') + ' }</code>. The GraphQL server (resolvers) fans out to the services <i>inside the data center</i>, where hops cost ~1 ms instead of ' + RTT + ' ms.', parts: [g(gh, ge, baseEdges, { App: 'GraphQL', API: 'resolvers' }), { type: 'vars', label: 'GraphQL', vals: { 'round trips': 1, 'latency ≈': (RTT + 5 * res.length) + ' ms', 'bytes ≈': r2(0.5 * res.length) + ' KB' }, hl: { 'round trips': 'ok' } }] });
        // gRPC
        var pe = { 'App-API': 'cur' }, ph = { API: 'cur' };
        res.forEach(function (r, i) { pe['API-S' + i] = 'ok'; ph['S' + i] = 'ok'; });
        frames.push({ narr: '<b>gRPC</b> shines on the <i>inside</i> hops (API → services): binary protobuf over one multiplexed HTTP/2 connection, generated stubs, deadlines. Each internal call ≈ 0.3 KB and microseconds to parse. Browsers cannot speak raw gRPC easily (need gRPC-Web or a proxy), so the edge usually stays REST/GraphQL.', parts: [g(ph, pe, baseEdges, { API: 'gRPC client' }), { type: 'vars', label: 'internal hops', vals: { protocol: 'gRPC / HTTP2', 'payload each ≈': '0.3 KB', calls: res.length + ' (in parallel)' } }] });
        frames.push({ narr: 'Summary. REST costs one round trip per resource (unless you build a custom "screen" endpoint, i.e. a BFF). GraphQL collapses them into one. gRPC is the fast internal glue. <b>Pick per audience</b>, not one style for everything.', parts: [{ type: 'table', label: 'This screen', columns: ['style', 'client round trips', 'latency ≈', 'payload ≈', 'HTTP caching'], rows: [
          ['REST', res.length, res.length * RTT + ' ms', r2(restBytes) + ' KB', 'easy (GET + ETag)'],
          ['GraphQL', 1, (RTT + 5 * res.length) + ' ms', r2(0.5 * res.length) + ' KB', 'hard (POST); use persisted queries'],
          ['gRPC (internal)', '—', '~1 ms per hop', r2(0.3 * res.length) + ' KB', 'none (app-level cache)']
        ], hl: { 1: 'ok' } }] });
        return frames;
      }
    },
    examples: [
      { title: 'Designing REST resources for a library', html: `<p>Nouns, not verbs. Plural collections, ids for items, nesting only one level deep.</p>
        ${H.table(['Action', 'Good REST', 'Bad (RPC-ish)'], [
          ['List books', '<code>GET /v1/books?author=tolkien&amp;limit=20</code>', '<code>GET /getAllBooks</code>'],
          ['Borrow a book', '<code>POST /v1/loans {bookId, memberId}</code> → 201', '<code>POST /borrowBook?id=5</code>'],
          ['Return it', '<code>PATCH /v1/loans/88 {returnedAt}</code>', '<code>GET /returnBook?id=5</code> (GET must never change data!)'],
          ['A member\'s loans', '<code>GET /v1/members/12/loans</code>', '<code>POST /searchLoansByMember</code>']
        ])}
        <p>Note "borrow" became <b>creating a Loan resource</b> — when an action feels like a verb, model it as a noun you create.</p>` },
      { title: 'Why the mobile team asked for GraphQL', html: `<p>The home screen needs user name, last 3 orders (id, total), and unread count. With REST: <code>/me</code> (2 KB), <code>/me/orders</code> (40 KB with 50 orders and every field), <code>/me/notifications</code> (15 KB) = 3 round trips, 57 KB. With GraphQL: one query, ~0.6 KB. On a 3G connection with 300 ms RTT that is <b>900 ms → 300 ms</b>.</p><p>The catch: the server team now has to protect against expensive queries (depth limits, cost analysis) and solve the N+1 problem with batching (DataLoader).</p>` },
      { title: 'Payment service talking to fraud service', html: `<p>Called 20,000 times/sec, p99 budget 15 ms. JSON parse + HTTP/1.1 connection churn costs real CPU. gRPC gives: one long-lived HTTP/2 connection, binary messages ~5× smaller, a generated typed client (no hand-written JSON mapping bugs), built-in <b>deadlines</b> that propagate (if the caller only has 10 ms left, the fraud service knows it).</p>`, code: { lang: 'text', code: `service FraudService {
  rpc Score (ScoreRequest) returns (ScoreReply);
}
message ScoreRequest { string payment_id = 1; int64 amount_minor = 2; string card_fingerprint = 3; }
message ScoreReply  { double risk = 1; bool block = 2; }` } },
      { title: 'Versioning without breaking clients', html: `<p><b>REST:</b> put a major version in the URL (<code>/v1/</code>) or a header; only add optional fields in v1; create <code>/v2</code> for breaking changes; announce deprecation with a <code>Sunset</code> header. <b>GraphQL:</b> no versions — add new fields, mark old ones <code>@deprecated</code>, watch usage, remove later. <b>gRPC/protobuf:</b> never reuse or change a field number; new fields are ignored by old readers; use <code>reserved</code> for deleted fields.</p>` }
    ],
    deepDive: `<p><b>HTTP semantics you will be grilled on.</b> <i>Safe</i> = no side effects (GET, HEAD, OPTIONS). <i>Idempotent</i> = doing it twice has the same effect as once (GET, PUT, DELETE, HEAD, OPTIONS — but NOT POST or PATCH in general). This matters because proxies, SDKs and browsers <b>retry</b> idempotent requests automatically. Conditional requests (<code>ETag</code> + <code>If-None-Match</code> → <code>304</code>; <code>If-Match</code> → <code>412</code>) give cheap caching and optimistic concurrency ("only update if nobody changed it since I read it").</p>
      <p><b>REST maturity.</b> Most "REST" APIs are really "HTTP + JSON resources" (Richardson level 2). Full HATEOAS (links telling the client what to do next) is rare outside payments-style APIs. Interviewers care about: clear resources, correct verbs/status codes, pagination, filtering, idempotency, versioning, consistent error bodies (e.g. RFC 9457 <code>application/problem+json</code>).</p>
      <p><b>GraphQL internals.</b> Each field has a resolver. A naive list of 50 posts each resolving its author triggers 1 + 50 DB queries (the <b>N+1 problem</b>); the fix is batching per request (DataLoader collects all author ids, does one <code>WHERE id IN (...)</code>). Security: limit depth, compute query cost before running, rate-limit by cost not by request, and prefer <b>persisted queries</b> (client sends a hash of a pre-approved query) — this also lets CDNs cache GET requests. Federation lets many teams own parts of one graph.</p>
      <p><b>gRPC internals.</b> HTTP/2 streams carry length-prefixed protobuf frames; status travels in trailers. Protobuf encodes each field as (field number, wire type) + value with varints, so <code>id=150</code> takes 3 bytes instead of ~10 in JSON. Load balancing is tricky: one long-lived connection pins all calls to one backend unless you use client-side (look-aside) balancing or an L7 proxy (Envoy) that balances per request. Always set <b>deadlines</b>; a gRPC call without a deadline can hang forever.</p>
      <p><b>Other styles worth one sentence:</b> <i>tRPC</i> (TypeScript end-to-end types), <i>Connect</i> (gRPC-compatible, works over plain HTTP/JSON in browsers), <i>JSON-RPC</i> (used by MCP — the Model Context Protocol — and Ethereum nodes), <i>SOAP</i> (XML, legacy enterprise), async APIs (webhooks, Kafka events, described with AsyncAPI).</p>`,
    aiEra: `<p><b>What AI changes:</b> APIs now have a new consumer: <b>LLM agents</b>. Agents call your API through tool definitions (JSON Schema) or MCP servers, which are JSON-RPC under the hood. Clear resource names, small focused endpoints, descriptive field names and good error messages ("<code>limit must be ≤ 100</code>", not "<code>bad request</code>") make agents succeed — the same things that make humans succeed.</p>
      <p><b>Use AI as a partner:</b> generate an OpenAPI or <code>.proto</code> draft from a requirements paragraph, then review it yourself: <code>Review this OpenAPI spec for non-idempotent PUTs, missing pagination, inconsistent naming and breaking changes vs v1</code>. AI is great at producing client SDKs, mock servers and contract tests from a spec.</p>
      <p><b>Where AI goes wrong:</b> verbs in URLs (<code>/createUser</code>), GET endpoints that mutate, reusing protobuf field numbers, returning floats for money, forgetting auth scopes, and picking GraphQL "because it's modern" for a simple public CRUD API.</p>
      <p><b>What you must still own:</b> choosing the style per audience (public vs internal vs agent), the compatibility promise you make to clients, and the trade-off story in the interview: caching vs flexibility vs performance.</p>`,
    problems: [{
      title: 'Choose API styles for a food-delivery platform',
      level: 'Medium', tags: ['api design', 'rest', 'grpc', 'graphql'], companies: ['Swiggy', 'DoorDash', 'Uber'],
      statement: `<p>A food-delivery company has: a customer mobile app, a restaurant web dashboard, public APIs for partner POS systems, and ~40 internal microservices (orders, menu, pricing, dispatch, payments). Choose the API style for each boundary and design the key customer endpoints.</p>`,
      constraints: `<p>20k orders/min at peak; mobile users on flaky 4G; partners use many languages; internal p99 budget per hop 20 ms.</p>`,
      example: `<p>Home screen needs: nearby restaurants (name, rating, ETA), active order status, and promo banners. ${H.c('r', 'Naive')}: 3 REST calls per screen load. ${H.c('g', 'Better')}: one BFF/GraphQL call that fans out internally over gRPC.</p>`,
      brute: { why: `<p><b>Naive design:</b> "everything is REST + JSON". Mobile apps make 4–6 sequential calls per screen (slow on 4G, wasted bytes), internal services burn CPU on JSON and HTTP/1.1 connection setup, and there's no typed contract between 40 services so a renamed field silently breaks someone. The opposite naive design — "everything gRPC" — breaks partners and browsers, which can't easily speak raw gRPC, and loses HTTP caching for menus.</p>` },
      mcq: { q: 'Partner POS systems in many languages need to push menu updates. Best choice?', options: ['REST + JSON with an OpenAPI spec and webhooks', 'Raw gRPC with bidirectional streaming', 'GraphQL subscriptions', 'Direct database access'], answer: 0, explain: 'Third parties want the lowest barrier: every language has HTTP + JSON; OpenAPI generates SDKs; webhooks notify them of events.' },
      hints: [`<p>Hint 1: Split by <b>audience</b>: who calls this boundary (third party, your own app, your own service)?</p>`, `<p>Hint 2: Public → REST/OpenAPI; your own rich clients → GraphQL or a BFF per client; service-to-service → gRPC with deadlines.</p>`, `<p>Hint 3: Don't forget caching (menus are read-heavy → CDN-cacheable GET), real-time order status (that's the next topic: SSE/WebSocket), and idempotency on order creation.</p>`],
      solution: {
        approach: `<p><b>1. Public partner API → REST + JSON</b>, versioned <code>/v1</code>, OpenAPI spec, OAuth2 client credentials, per-partner rate limits, webhooks for events (order placed/cancelled) signed with HMAC.</p>
          <p><b>2. Customer app and restaurant dashboard → a Backend-for-Frontend (BFF) per client</b>, exposed as GraphQL (or screen-shaped REST). One call per screen; the BFF fans out internally. Persisted queries let the CDN cache public data such as menus.</p>
          <p><b>3. Internal services → gRPC</b> with protobuf contracts in a shared repo, deadlines propagated through the call chain, mTLS via a service mesh, client-side load balancing.</p>
          <p><b>Key customer endpoints (REST view):</b> <code>GET /v1/restaurants?lat=..&amp;lng=..&amp;cursor=..</code> (cursor pagination, cacheable 30 s), <code>GET /v1/restaurants/{id}/menu</code> (ETag, CDN), <code>POST /v1/orders</code> with <code>Idempotency-Key</code> → 201, <code>GET /v1/orders/{id}</code>, and <code>GET /v1/orders/{id}/events</code> as an SSE stream for live status.</p>
          <p><b>Trade-offs:</b> GraphQL adds query-cost limiting and N+1 batching work; gRPC needs L7/client-side load balancing; REST public API needs strict backward compatibility, so changes are additive only.</p>`,
        complexity: `<p>Client round trips per screen: N → 1. Internal hops stay O(services touched), each ~1–5 ms over gRPC. Payloads shrink 3–10× (field selection + protobuf).</p>`,
        followUps: ['How do you deprecate a field in the partner API?', 'How would the BFF handle one slow internal service (partial response vs timeout)?']
      }
    }]
  });

  /* ================= TOPIC 2: Real-time: polling, long polling, SSE, WebSockets ================= */
  topics.push({
    title: 'Real-time APIs: Polling, Long Polling, SSE and WebSockets',
    analogy: `<p>You're waiting for a parcel.</p>
      <ul>
        <li><b>Short polling</b> = walking to the door every 5 minutes to check. Tiring, and the parcel may sit outside for up to 5 minutes.</li>
        <li><b>Long polling</b> = standing at the door until the courier arrives, taking it, then going back to stand there again.</li>
        <li><b>SSE (Server-Sent Events)</b> = a mail slot. The courier drops things in whenever they arrive; you can't send anything back through it.</li>
        <li><b>WebSocket</b> = a phone call that stays open. Either of you can talk at any time.</li>
      </ul>`,
    explain: `<p>Plain HTTP is "client asks, server answers". But chat, live scores, stock tickers, ride tracking and AI token streaming need the <b>server to push</b> data the moment it exists. Four ways to do it:</p>
      ${H.table(['Technique', 'How it works', 'Direction', 'Good for', 'Watch out'], [
        ['Short polling', 'Client sends <code>GET /updates</code> every N seconds', 'client → server', 'Rare updates, simplest possible', 'Wasted empty requests; delay up to N s'],
        ['Long polling', 'Server holds the request open until there is data (or ~30 s timeout), client immediately re-asks', 'server → client (simulated)', 'Fallback when nothing else works', 'One request per message; reconnect overhead'],
        ['SSE', 'One long HTTP response with <code>Content-Type: text/event-stream</code>; server writes <code>data: ...</code> lines forever', 'server → client only', 'Notifications, live feeds, dashboards, <b>LLM token streaming</b>', 'Text only; one-way; browser auto-reconnects with <code>Last-Event-ID</code>'],
        ['WebSocket', 'HTTP request upgrades (<code>101 Switching Protocols</code>) into a full-duplex TCP channel with small frames', 'both ways', 'Chat, multiplayer games, collaborative editing, trading', 'Stateful connections: harder to load-balance, scale and deploy']
      ])}
      <p><b>How to choose (memorise this ladder):</b></p>
      <ol>
        <li>Does the client also need to send frequent messages at low latency (typing, game moves, cursors)? → <b>WebSocket</b>.</li>
        <li>Only the server pushes (notifications, scores, order status, AI responses)? → <b>SSE</b>. It's plain HTTP, so it works through proxies, HTTP/2 multiplexes it, auth headers/cookies work as usual, and reconnect is built in.</li>
        <li>Updates every few minutes and you want zero infrastructure? → <b>short polling</b> (maybe with <code>ETag</code> so empty polls return a cheap <code>304</code>).</li>
        <li>Mobile app in the background? → none of these; use <b>push notifications</b> (APNs/FCM).</li>
        <li>Server-to-server events? → <b>webhooks</b> (the server POSTs to a URL you gave it) or a message queue.</li>
      </ol>
      <p>A <b>webhook</b> is "reverse API": instead of you polling Stripe for "payment succeeded", Stripe calls <i>your</i> URL. You must verify its signature, respond 2xx fast, and handle duplicates (they retry!).</p>`,
    clues: [
      '"chat", "multiplayer", "collaborative editing", "both sides send" → WebSocket',
      '"live notifications", "stock ticker", "order status", "stream LLM tokens" → SSE',
      '"updates every few minutes", "simplest" → short polling with ETag',
      '"notify a third-party system when X happens" → webhooks (signed, retried, idempotent receiver)',
      '"millions of concurrent connections" → connection gateway tier + pub/sub fan-out (Redis/Kafka), sticky nothing else',
      '"app is closed/backgrounded" → mobile push (APNs/FCM), not a socket'
    ],
    code: [
      { lang: 'http', title: 'SSE on the wire', code: `GET /v1/orders/ord_9001/events HTTP/1.1
Accept: text/event-stream
Last-Event-ID: 41

HTTP/1.1 200 OK
Content-Type: text/event-stream
Cache-Control: no-cache

id: 42
event: status
data: {"status": "PREPARING"}

id: 43
event: status
data: {"status": "OUT_FOR_DELIVERY", "etaMin": 12}

: heartbeat comment line keeps proxies from closing the idle connection
` },
      { lang: 'js', title: 'Browser client: SSE and WebSocket', code: `// SSE: one-way server push, auto-reconnects and resends Last-Event-ID
const es = new EventSource('/v1/orders/ord_9001/events');
es.addEventListener('status', (e) => {
  const update = JSON.parse(e.data);
  console.log('order status', update.status);
});
es.onerror = () => console.log('lost connection, browser will retry');

// WebSocket: full duplex, you handle reconnects yourself
function connectChat(roomId, attempt = 0) {
  const ws = new WebSocket('wss://chat.example/rooms/' + roomId);
  ws.onopen = () => { attempt = 0; ws.send(JSON.stringify({ type: 'join', roomId })); };
  ws.onmessage = (msg) => console.log('message', JSON.parse(msg.data));
  ws.onclose = () => {
    // exponential backoff with jitter so 1M clients don't reconnect at the same instant
    const delay = Math.min(30000, 500 * 2 ** attempt) * (0.5 + Math.random() / 2);
    setTimeout(() => connectChat(roomId, attempt + 1), delay);
  };
  return ws;
}
connectChat('general');` }
    ],
    codeTitle: ['SSE stream format', 'Client code (JS)'],
    viz: {
      title: 'Same events, four delivery techniques',
      input: '3 7 8 16',
      inputLabel: 'Seconds when new messages appear on the server (0-30)',
      gen: function (input) {
        var ev = parseTimes(input, 6);
        if (ev[ev.length - 1] > 30) throw new Error('Keep event times between 0 and 30 seconds');
        var P = 5, frames = [];
        var nodes = [{ id: 'C', label: 'Client', x: 12, y: 25, shape: 'box' }, { id: 'S', label: 'Server', x: 85, y: 25, shape: 'box' }];
        function g(edges, ehl, tags) { return { type: 'graph', directed: true, height: 50, nodes: nodes, edges: edges, ehl: ehl || {}, tags: tags || {} }; }
        frames.push({ narr: 'New messages appear on the server at t = <b>' + ev.join(', ') + '</b> s. The client wants each one ASAP. Let us compare how long each message waits (<b>delay</b>) and how many HTTP requests are spent.', parts: [g([['C', 'S']], {}), { type: 'array', label: 'event times (s)', values: ev }] });
        // short polling
        var delivered = 0, polls = 0, empty = 0, delays = [], t;
        for (t = P; delivered < ev.length; t += P) {
          polls++;
          var got = [];
          while (delivered < ev.length && ev[delivered] <= t) { got.push(ev[delivered]); delays.push(t - ev[delivered]); delivered++; }
          if (!got.length) empty++;
          frames.push({ narr: '<b>Short polling</b> at t=' + t + 's: client asks "anything new?". ' + (got.length ? 'Server returns messages from t=' + got.join(', ') + ' (each waited ' + got.map(function (x) { return t - x; }).join(', ') + ' s).' : '<span class="c-r">Empty response</span> — a wasted request.'), parts: [
            g([['C', 'S', 'GET /updates'], ['S', 'C', got.length ? got.length + ' msg' : '[]']], { 'C-S': 'cur', 'S-C': got.length ? 'ok' : 'bad' }, { C: 't=' + t }),
            { type: 'vars', label: 'short polling', vals: { requests: polls, empty: empty, 'delays so far': delays.join(', ') || '—' }, hl: { empty: got.length ? '' : 'bad' } }
          ] });
        }
        var spAvg = r2(delays.reduce(function (a, b) { return a + b; }, 0) / delays.length), spReq = polls;
        // long polling
        frames.push({ narr: '<b>Long polling</b>: the client sends one request and the server <i>holds</i> it. At t=' + ev[0] + 's it answers instantly, then the client re-sends. Delay ≈ 0 (plus one reconnect round trip), but every message still costs a full HTTP request + headers.', parts: [
          g([['C', 'S', 'GET (held open)'], ['S', 'C', 'msg at t=' + ev[0]]], { 'C-S': 'win', 'S-C': 'ok' }),
          { type: 'vars', label: 'long polling', vals: { requests: ev.length + 1, 'avg delay': '≈ 0 s + 1 RTT' } }
        ] });
        // SSE
        ev.forEach(function (x, i) {
          frames.push({ narr: '<b>SSE</b>: one long-lived HTTP response. At t=' + x + 's the server simply writes <code>id: ' + (i + 1) + '\\ndata: …</code> into the open stream. Zero extra requests. If the connection drops, the browser reconnects with <code>Last-Event-ID: ' + i + '</code> so nothing is lost.', parts: [
            g([['C', 'S', 'GET text/event-stream'], ['S', 'C', 'event ' + (i + 1)]], { 'C-S': 'done', 'S-C': 'ok' }, { S: 't=' + x }),
            { type: 'vars', label: 'SSE', vals: { requests: 1, 'events pushed': i + 1, delay: '0 s' } }
          ] });
        });
        frames.push({ narr: '<b>WebSocket</b>: after a one-time HTTP <code>Upgrade</code> (101), both sides send small frames any time. Same zero delay as SSE, <i>plus</i> the client can send (typing indicators, acks) without new requests. Cost: stateful connection servers, custom reconnect logic, harder load balancing.', parts: [
          g([['C', 'S', 'frames'], ['S', 'C', 'frames']], { 'C-S': 'ok', 'S-C': 'ok' }, { C: 'full duplex' }),
          { type: 'vars', label: 'WebSocket', vals: { requests: '1 (upgrade)', delay: '0 s', direction: 'both ways' } }
        ] });
        frames.push({ narr: 'Scoreboard for your events. Short polling trades latency for simplicity; SSE/WebSocket trade simplicity for long-lived connections.', parts: [{ type: 'table', label: 'Result', columns: ['technique', 'HTTP requests', 'avg delay', 'client can send?'], rows: [
          ['Short polling (every ' + P + 's)', spReq, spAvg + ' s', 'yes (separate requests)'],
          ['Long polling', ev.length + 1, '≈ 0 s', 'separate requests'],
          ['SSE', 1, '0 s', 'no (use normal POSTs)'],
          ['WebSocket', 1, '0 s', 'yes, same socket']
        ], hl: { 2: 'ok', 0: 'bad' } }] });
        return frames;
      }
    },
    examples: [
      { title: 'ChatGPT-style token streaming uses SSE', html: `<p>An LLM API generates ~50 tokens/s. Waiting 20 s for the full answer feels broken, so APIs stream with <code>stream: true</code> → the response is <code>text/event-stream</code> and each chunk is a <code>data: {...delta...}</code> line. It's one-way (server → client), plain HTTP (works with existing auth, load balancers, HTTP/2), so SSE is the perfect fit. The user's next prompt is just a new POST.</p>` },
      { title: 'Collaborative document editor → WebSocket', html: `<p>Every keystroke from every editor must reach the others within ~100 ms, and the client sends as much as it receives (operations, cursor positions, presence). Polling would be 10+ requests/s per user. A WebSocket per open document, connected to a "document session" server that orders operations (OT/CRDT), is the standard design.</p>` },
      { title: 'Cricket score widget → polling with ETag is fine', html: `<p>Score changes every ~30 s; 5 s staleness is fine; 10M viewers. Polling a CDN-cached <code>GET /matches/77/score</code> (max-age=5) means the origin sees only ~1 request per edge location every 5 s — the CDN absorbs 10M clients. Holding 10M WebSockets would need a big connection tier. ${H.c('g', 'Simplest thing that meets the requirement wins.')}</p>` },
      { title: 'Webhook receiver done right', html: `<p>Stripe calls <code>POST https://you.example/hooks/stripe</code>. Your handler: (1) verify the <code>Stripe-Signature</code> HMAC over the raw body + timestamp (reject if older than 5 min to stop replays); (2) store the event id with a UNIQUE constraint (duplicates are normal — they retry on any non-2xx); (3) enqueue the work and return <code>200</code> within a couple of seconds; (4) process asynchronously.</p>` }
    ],
    deepDive: `<p><b>Scaling WebSockets.</b> A socket is pinned to one server, so you build a dedicated <b>connection tier</b> (gateway nodes holding sockets, often 100k–1M each with epoll/async I/O) and keep business logic elsewhere. To deliver "message for user 42", you need a registry (user → gateway node) in Redis, or every gateway subscribes to a pub/sub channel (Redis Pub/Sub, Kafka, NATS) and forwards to its local sockets. Load balancers must support the <code>Upgrade</code> handshake and long idle timeouts; send heartbeats (ping/pong) every ~30 s so NAT boxes and proxies don't kill idle connections.</p>
      <p><b>Deploys and thundering herds.</b> Restarting a gateway drops 500k sockets that all reconnect at once. Mitigate with connection draining (send "reconnect later" over minutes), jittered exponential backoff on clients, and resumable sessions (client sends its last seen sequence number so the server replays only missed messages).</p>
      <p><b>SSE details.</b> Under HTTP/1.1 browsers allow ~6 connections per domain, so many SSE tabs can starve; HTTP/2 multiplexes streams and removes this limit. Events have optional <code>id</code>, <code>event</code>, <code>retry</code> fields. Disable proxy buffering (e.g. nginx <code>X-Accel-Buffering: no</code>) or events arrive in clumps. Emit comment heartbeats (<code>: ping</code>).</p>
      <p><b>Ordering and delivery.</b> None of these give exactly-once. Give messages sequence numbers per conversation, let clients dedupe, and re-sync via a normal REST fetch on reconnect. Backpressure: if a slow client can't keep up, buffer a bounded amount then drop/disconnect — never let one slow reader grow server memory without limit.</p>
      <p><b>Newer options:</b> HTTP/3 + <b>WebTransport</b> (QUIC streams and datagrams, no head-of-line blocking) for games/media; gRPC bidirectional streaming between services; MQTT for IoT devices on bad networks.</p>`,
    aiEra: `<p><b>What AI changes:</b> streaming is now the default UX for AI products. Every major LLM API streams via SSE, and agent frameworks stream tool-call progress, partial results and "thinking" updates. MCP servers support streamable HTTP transport (a POST whose response can be an SSE stream). Expect interview questions like "design the streaming layer for a chat assistant with 1M concurrent users".</p>
      <p><b>Use AI as a partner:</b> ask it to generate reconnect/backoff logic, SSE parsers and load-test scripts (e.g. k6 opening 50k sockets), then verify the edge cases yourself: <code>What happens to in-flight tokens if the user's network drops for 3 seconds? Write the resume protocol.</code></p>
      <p><b>Where AI goes wrong:</b> picks WebSockets for one-way streams (more infra for nothing), forgets heartbeats and proxy buffering, writes reconnect loops without jitter (self-inflicted DDoS), and ignores that a load balancer idle timeout of 60 s will silently cut long LLM generations.</p>
      <p><b>What you must still own:</b> the push-vs-pull decision from the requirements (direction, frequency, scale, staleness tolerance) and the operational story: connection tier sizing, deploys, fan-out, and resume semantics.</p>`,
    problems: [{
      title: 'Live order tracking for a ride/food app',
      level: 'Medium', tags: ['sse', 'websocket', 'real-time'], companies: ['Uber', 'Zomato', 'Grab'],
      statement: `<p>Customers watch their courier move on a map and see status changes (accepted → picked up → arriving). Couriers' phones send GPS every 4 s. Design the real-time API for both sides.</p>`,
      constraints: `<p>500k active orders at peak; 500k couriers sending location; customer UI may be web or mobile; status must never be lost; location may be slightly stale.</p>`,
      example: `<p>Courier sends <code>{lat, lng, ts}</code> every 4 s → customer map moves within ~1 s. Status "ARRIVING" must show even if the customer's network blinked during that second.</p>`,
      brute: { why: `<p><b>Naive design:</b> customers poll <code>GET /orders/{id}</code> every second. 500k orders × 1 req/s = 500k req/s mostly returning "no change" — huge waste, and status can still lag. Second naive design: one WebSocket per customer to a random app server — but the courier's update lands on a different server, so there's no way to route it without a pub/sub layer, and deploys disconnect everyone.</p>` },
      mcq: { q: 'Customers only receive updates; they never stream data back. Which transport fits best for the customer side?', options: ['SSE (or a WebSocket if you already run that infra)', 'Short polling every 100 ms', 'gRPC bidirectional stream from the browser', 'SMTP'], answer: 0, explain: 'One-way server push over plain HTTP is exactly what SSE is designed for, with auto-reconnect and Last-Event-ID resume.' },
      hints: [`<p>Hint 1: The two directions have different needs: couriers <b>upload</b> frequently, customers <b>download</b>. They don't need the same protocol.</p>`, `<p>Hint 2: Separate the connection tier (holds sockets/streams) from the logic; connect them with pub/sub keyed by order id.</p>`, `<p>Hint 3: Status changes are important (persist + sequence ids + replay on reconnect); GPS points are disposable (latest-wins, OK to drop).</p>`],
      solution: {
        approach: `<p><b>Courier → server:</b> courier app keeps a WebSocket (or sends small batched <code>POST /v1/couriers/me/locations</code> every 4 s; both work — the socket saves headers). The ingest service writes the latest location to Redis (<code>GEOADD</code> / key per courier with TTL) and publishes <code>order:{id}:location</code> on pub/sub.</p>
          <p><b>Server → customer:</b> <code>GET /v1/orders/{id}/events</code> as <b>SSE</b>. The customer connects to any node of a stateless "stream gateway" tier; that node subscribes to <code>order:{id}</code> channels. Location events are latest-wins and may be coalesced (send at most 1/s). Status events are persisted first in the orders DB with an increasing sequence number, then published; each SSE event carries <code>id: seq</code>.</p>
          <p><b>Reliability:</b> on reconnect the browser sends <code>Last-Event-ID</code>; the gateway fetches missed status events from the DB (seq &gt; last) then resumes live. Heartbeats every 20 s; LB idle timeout 120 s; jittered reconnect. Backgrounded mobile apps get status via push notifications instead.</p>
          <p><b>Scale:</b> 500k streams ÷ ~50k per node ≈ 10–20 gateway nodes plus headroom. Pub/sub fan-out is 1 → 1–2 subscribers per order, cheap. Draining on deploy sends a <code>retry:</code> hint so clients spread reconnects.</p>`,
        complexity: `<p>Requests: ~500k req/s polling → ~0 steady-state requests (one stream per order). Status delivery latency ≈ DB write + pub/sub hop (&lt; 200 ms). Memory ≈ 10–50 KB per open stream.</p>`,
        followUps: ['How would you show the courier location for orders in a region (all couriers near me)?', 'What changes if 5% of customers sit behind proxies that buffer SSE?']
      }
    }]
  });

  /* ================= TOPIC 3: API Gateway ================= */
  topics.push({
    title: 'API Gateway: the Front Door and its Responsibilities',
    analogy: `<p>An <b>API gateway</b> is the <b>reception desk of an office tower</b>. Every visitor comes through one door. The receptionist checks your ID (<b>authentication</b>), checks you're allowed on floor 12 (<b>authorization</b>), stops you if you've already come in 50 times today (<b>rate limiting</b>), tells you which lift to take (<b>routing</b>), and writes your name in the visitor log (<b>logging</b>). The companies upstairs never have to hire their own security guard.</p>`,
    explain: `<p>With microservices, clients would otherwise need to know 40 service addresses, and every service would re-implement login checks, throttling and logging. An <b>API gateway</b> is a reverse proxy (it sits in front of servers and forwards requests to them) that handles these <b>cross-cutting concerns</b> once, at the edge.</p>
      <p><b>The request pipeline</b> (order matters — cheapest rejections first):</p>
      ${H.table(['#', 'Step', 'What it does', 'Typical rejection'], [
        ['1', 'TLS termination', 'Decrypts HTTPS so later steps can read headers', '—'],
        ['2', 'WAF / IP filtering', 'Blocks known-bad IPs, SQL-injection patterns, huge bodies', '<code>403</code>, <code>413</code>'],
        ['3', 'Authentication', 'Validates API key / JWT / OAuth token (signature, expiry)', '<code>401 Unauthorized</code>'],
        ['4', 'Rate limiting / quotas', 'Counts requests per key/user/IP; enforces plan limits', '<code>429 Too Many Requests</code> + <code>Retry-After</code>'],
        ['5', 'Authorization (coarse)', 'Scope check: does this token have <code>orders:write</code>?', '<code>403 Forbidden</code>'],
        ['6', 'Validation &amp; transformation', 'Schema-check body, add headers (<code>X-User-Id</code>, trace id), REST → gRPC translation', '<code>400</code>'],
        ['7', 'Routing &amp; load balancing', '<code>/orders/*</code> → Order service pool, canary 5% to v2', '<code>404</code>, <code>503</code>'],
        ['8', 'Resilience', 'Timeouts, retries (idempotent only), circuit breaker', '<code>504</code>, <code>503</code>'],
        ['9', 'Response handling', 'Caching, compression, CORS headers, aggregate several calls', '—'],
        ['10', 'Observability', 'Access logs, metrics (RPS, p99, error rate), distributed tracing', '—']
      ])}
      <p><b>Gateway vs load balancer vs service mesh</b> — a classic follow-up:</p>
      ${H.table(['', 'Load balancer', 'API gateway', 'Service mesh'], [
        ['Traffic', 'Any (L4 or L7)', 'North-south (outside → in)', 'East-west (service ↔ service)'],
        ['Knows about', 'Servers and health', 'APIs, users, keys, plans', 'Services, mTLS identities'],
        ['Examples', 'AWS ALB/NLB, HAProxy', 'Kong, AWS API Gateway, Apigee, Envoy Gateway', 'Istio, Linkerd (sidecars or ambient)']
      ])}
      <p><b>BFF (Backend for Frontend):</b> instead of one giant gateway, each client type (iOS, web, partner) gets its own thin gateway that shapes responses for that client. Keeps the main gateway generic.</p>
      <p>${H.c('r', 'Golden rule')}: the gateway does <b>generic</b> work. Business logic ("free shipping above ₹499") belongs in services — a gateway stuffed with business rules becomes a new monolith that every team must queue to change.</p>`,
    clues: [
      '"many microservices, many clients" → put an API gateway (and maybe BFFs) at the edge',
      '"authenticate once", "centralised rate limiting / API keys / quotas / monetisation" → gateway',
      '"canary release", "route 5% to v2", "A/B by header" → gateway / L7 routing rules',
      '"service-to-service mTLS, retries, observability" → service mesh, not the edge gateway',
      '"one screen needs data from 4 services" → gateway aggregation or BFF',
      '"single point of failure?" → gateways are stateless and horizontally scaled behind an L4 LB, multi-AZ'
    ],
    code: [
      { lang: 'yaml', title: 'Declarative gateway config (Kong-style)', code: `services:
  - name: orders
    url: http://orders.internal:8080
    connect_timeout: 2000
    read_timeout: 5000
    retries: 2               # only safe because GETs are idempotent; POSTs use Idempotency-Key
    routes:
      - name: orders-route
        paths: ["/v1/orders"]
        methods: ["GET", "POST"]
    plugins:
      - name: jwt                       # authentication
      - name: rate-limiting             # per consumer, shared counters in Redis
        config: { minute: 600, policy: redis, limit_by: consumer }
      - name: request-size-limiting
        config: { allowed_payload_size: 1 }   # MB
      - name: correlation-id
        config: { header_name: X-Request-Id, generator: uuid }
      - name: prometheus` },
      { lang: 'java', title: 'Gateway pipeline as a filter chain (runnable sketch)', code: `import java.util.*;

public class MiniGateway {
    record Request(String method, String path, String token) {}
    record Response(int status, String body) {}

    interface Filter { Response apply(Request r); }   // return null = pass to next filter

    static final Map<String, String> TOKENS = Map.of("tok-alice", "alice", "tok-bob", "bob");
    static final Map<String, Integer> used = new HashMap<>();
    static final int LIMIT = 2;                                  // demo: 2 requests per user
    static final Map<String, String> ROUTES = new LinkedHashMap<>();
    static { ROUTES.put("/v1/orders", "order-svc"); ROUTES.put("/v1/users", "user-svc"); }

    static Response handle(Request r) {
        List<Filter> chain = List.of(
            req -> TOKENS.containsKey(req.token()) ? null : new Response(401, "missing/invalid token"),
            req -> used.merge(TOKENS.get(req.token()), 1, Integer::sum) > LIMIT
                    ? new Response(429, "rate limit exceeded, Retry-After: 60") : null,
            req -> ROUTES.keySet().stream().anyMatch(req.path()::startsWith)
                    ? null : new Response(404, "no route")
        );
        for (Filter f : chain) {
            Response rejected = f.apply(r);
            if (rejected != null) return rejected;     // cheapest rejection wins, upstream never sees it
        }
        String svc = ROUTES.entrySet().stream().filter(e -> r.path().startsWith(e.getKey()))
                .findFirst().get().getValue();
        return new Response(200, "proxied to " + svc);
    }

    public static void main(String[] args) {
        List<Request> reqs = List.of(
            new Request("GET", "/v1/orders/1", "tok-alice"),
            new Request("GET", "/v1/orders/2", "nope"),
            new Request("GET", "/v1/users/7", "tok-alice"),
            new Request("GET", "/v1/orders/3", "tok-alice"),
            new Request("GET", "/v1/admin", "tok-bob"));
        for (Request r : reqs) {
            Response res = handle(r);
            System.out.println(r.method() + " " + r.path() + " -> " + res.status() + " " + res.body());
        }
    }
}` }
    ],
    codeTitle: ['Gateway config (YAML)', 'Filter chain (Java)'],
    viz: {
      title: 'Requests flowing through an API gateway',
      input: 'GET /orders alice; GET /users alice; POST /payments -; GET /orders bob; GET /orders alice; GET /admin bob',
      inputLabel: 'Requests "METHOD PATH USER" separated by ; (USER "-" = no token). Limit: 2 per user',
      gen: function (input) {
        var reqs = String(input || '').split(';').map(function (s) { return s.trim(); }).filter(Boolean).map(function (s) {
          var p = s.split(/\s+/);
          if (p.length < 3 || p[1].charAt(0) !== '/') throw new Error('Each request must look like "GET /orders alice" (use - for no token)');
          return { m: p[0].toUpperCase(), path: p[1], user: p[2] };
        });
        if (!reqs.length) throw new Error('Enter at least one request');
        if (reqs.length > 8) throw new Error('Use at most 8 requests');
        var LIMIT = 2, counts = {}, frames = [];
        var routes = { '/orders': 'ORD', '/users': 'USR', '/payments': 'PAY' };
        var nodes = [
          { id: 'C', label: 'Client', x: 7, y: 15, shape: 'box' },
          { id: 'TLS', label: 'TLS + WAF', x: 26, y: 15, shape: 'box' },
          { id: 'AUTH', label: 'Auth (JWT)', x: 45, y: 15, shape: 'box' },
          { id: 'RL', label: 'Rate limit', x: 64, y: 15, shape: 'box' },
          { id: 'RT', label: 'Router', x: 85, y: 15, shape: 'box' },
          { id: 'ORD', label: 'Orders svc', x: 52, y: 55, shape: 'box' },
          { id: 'USR', label: 'Users svc', x: 70, y: 55, shape: 'box' },
          { id: 'PAY', label: 'Payments svc', x: 89, y: 55, shape: 'box' },
          { id: 'LOG', label: 'Logs/metrics', x: 18, y: 55, shape: 'box' }
        ];
        var edges = [['C', 'TLS'], ['TLS', 'AUTH'], ['AUTH', 'RL'], ['RL', 'RT'], ['RT', 'ORD'], ['RT', 'USR'], ['RT', 'PAY'], ['TLS', 'LOG']];
        function g(hl, ehl, tags) { return { type: 'graph', directed: true, height: 70, nodes: nodes, edges: edges, hl: hl, ehl: ehl, tags: tags || {} }; }
        function cnt() { var e = []; Object.keys(counts).forEach(function (k) { e.push([k, counts[k] + ' / ' + LIMIT]); }); return { type: 'map', label: 'rate-limit counters (per user)', entries: e }; }
        frames.push({ narr: 'Every request enters through one door. The pipeline runs <b>cheapest checks first</b>: TLS/WAF → authentication → rate limit → routing. Demo limit: <b>' + LIMIT + ' requests per user</b>.', parts: [g({ TLS: 'cur', AUTH: 'cur', RL: 'cur', RT: 'cur' }, {}), cnt()] });
        reqs.forEach(function (r, i) {
          var tag = r.m + ' ' + r.path;
          frames.push({ narr: 'Request ' + (i + 1) + ': <code>' + tag + '</code> from <b>' + (r.user === '-' ? 'anonymous (no token)' : r.user) + '</b>. TLS is terminated, WAF sees nothing suspicious, a request id is attached for tracing and an access-log line is written.', parts: [g({ C: 'cur', TLS: 'ok' }, { 'C-TLS': 'cur', 'TLS-LOG': 'win' }, { C: tag }), cnt()] });
          if (r.user === '-') {
            frames.push({ narr: '<span class="c-r">Authentication fails</span>: no valid token → <b>401 Unauthorized</b>. Rejected at the edge — no backend service spent a single CPU cycle on it.', parts: [g({ AUTH: 'bad', C: 'cur' }, { 'TLS-AUTH': 'bad' }, { AUTH: '401' }), cnt(), { type: 'text', label: 'Response', html: '<code>HTTP/1.1 401 Unauthorized</code><br><code>WWW-Authenticate: Bearer</code>' }] });
            return;
          }
          counts[r.user] = (counts[r.user] || 0) + 1;
          var over = counts[r.user] > LIMIT;
          frames.push({ narr: 'Token valid for <b>' + r.user + '</b>. Rate limiter increments ' + r.user + '\'s counter to ' + counts[r.user] + '. ' + (over ? '<span class="c-r">Over the limit of ' + LIMIT + '</span> → <b>429 Too Many Requests</b> with <code>Retry-After</code>.' : '<span class="c-g">Within limit</span> (' + counts[r.user] + '/' + LIMIT + ').'), parts: [
            g({ AUTH: 'ok', RL: over ? 'bad' : 'ok' }, { 'TLS-AUTH': 'ok', 'AUTH-RL': over ? 'bad' : 'ok' }, { RL: over ? '429' : counts[r.user] + '/' + LIMIT }),
            (function () { var m = cnt(); m.hl = {}; m.hl[r.user] = over ? 'bad' : 'ok'; return m; })(),
            { type: 'text', label: 'Headers the gateway adds', html: '<code>X-RateLimit-Limit: ' + LIMIT + '</code><br><code>X-RateLimit-Remaining: ' + Math.max(0, LIMIT - counts[r.user]) + '</code>' + (over ? '<br><code>Retry-After: 60</code>' : '') }
          ] });
          if (over) return;
          var target = null;
          Object.keys(routes).forEach(function (p) { if (r.path.indexOf(p) === 0) target = routes[p]; });
          if (!target) {
            frames.push({ narr: 'Router has no rule for <code>' + r.path + '</code> → <b>404 Not Found</b>. (Internal/admin paths are deliberately not exposed through the public gateway.)', parts: [g({ RT: 'bad' }, { 'RL-RT': 'ok' }, { RT: '404' }), cnt()] });
            return;
          }
          var e = { 'RL-RT': 'ok' }; e['RT-' + target] = 'ok';
          var h = { RT: 'ok' }; h[target] = 'sel';
          frames.push({ narr: 'Router matches prefix <code>' + r.path + '</code> → forwards to <b>' + nodes.filter(function (n) { return n.id === target; })[0].label + '</b> (picks a healthy instance, adds <code>X-User-Id: ' + r.user + '</code>, 5 s timeout). Service replies <b>200</b>; gateway records latency metrics.', parts: [g(h, e, { RT: 'route' }), cnt()] });
        });
        frames.push({ narr: 'Done. Notice how bad traffic (no token, over quota, unknown path) was stopped at the gateway — services only saw legitimate, authenticated, within-quota requests with user identity already attached.', parts: [g({ TLS: 'done', AUTH: 'done', RL: 'done', RT: 'done' }, {}), cnt()] });
        return frames;
      }
    },
    examples: [
      { title: 'JWT validation at the gateway', html: `<p>Client logs in once and gets a JWT signed by the auth service. On every request the gateway checks the signature with the auth service's public key (cached JWKS), checks <code>exp</code>, <code>aud</code> and scopes — <b>no network call</b>, ~50 µs. It then forwards <code>X-User-Id</code> to services. Downside: a JWT can't be revoked before expiry, so keep access tokens short-lived (5–15 min) with refresh tokens, or keep a small revocation list.</p>` },
      { title: 'Canary release via the gateway', html: `<p>Route rule: <code>/v1/orders</code> → 95% <code>orders-v1</code>, 5% <code>orders-v2</code>; plus "if header <code>X-Beta: 1</code> → v2". Watch v2's error rate and p99 in the gateway metrics; if they're bad, flip the weight back to 0% — rollback in seconds without redeploying anything.</p>` },
      { title: 'Aggregation: one call, three services', html: `<p><code>GET /v1/home</code> at the gateway (or BFF) calls user, recommendations and cart services <b>in parallel</b> with 300 ms timeouts each. If recommendations time out, return the page without them (graceful degradation) instead of failing the whole response. Total latency = slowest call, not the sum.</p>` },
      { title: 'Gateway as a single point of failure?', html: `<p>Gateways are <b>stateless</b> (counters live in Redis, config in a control plane), so you run many instances across availability zones behind an L4 load balancer / anycast. Separate gateways for public vs partner traffic stop one abusive tenant from hurting everyone (bulkheads). The real risk is a <b>bad config push</b> taking down everything — use staged config rollouts.</p>` }
    ],
    deepDive: `<p><b>Data plane vs control plane.</b> The data plane (Envoy, NGINX, Kong nodes) handles each request in microseconds; the control plane stores routes, keys and plans and pushes config to the data plane (e.g. Envoy xDS). Keep the data plane working even if the control plane is down — last known config stays active.</p>
      <p><b>Latency budget.</b> Each plugin adds time: TLS handshake (amortised by keep-alive), JWT verify (~50 µs), Redis rate-limit call (~0.5–1 ms in the same AZ), logging (async). A well-run gateway adds 1–5 ms p99. Watch out for synchronous calls to an auth service per request — cache token introspection results.</p>
      <p><b>Retries at the gateway are dangerous.</b> If the gateway retries 2×, the service retries the DB 3×, and the client retries 3×, one failing request becomes 18 calls — a <b>retry storm</b>. Rules: retry only idempotent requests (or ones carrying an <code>Idempotency-Key</code>), use a retry budget (e.g. ≤ 10% extra traffic), exponential backoff with jitter, and circuit breakers to fail fast.</p>
      <p><b>Security at the edge.</b> Strip incoming <code>X-User-Id</code> headers from clients (so nobody can spoof identity), enforce request size and header limits, set CORS precisely, and keep internal routes off the public gateway. Use mTLS between gateway and services so a compromised pod can't pretend to be the gateway.</p>
      <p><b>Managed vs self-hosted.</b> AWS API Gateway/Apigee give usage plans, API keys, developer portals and billing hooks but add cost per million calls and some latency; Envoy/Kong self-hosted give control and lower per-request cost. Kubernetes Gateway API is the modern standard way to configure L7 routing in clusters.</p>`,
    aiEra: `<p><b>What AI changes:</b> a new gateway species — the <b>AI gateway / LLM gateway</b> (e.g. LiteLLM, Kong AI Gateway, Cloudflare AI Gateway, Envoy AI Gateway). It sits between your apps and model providers and does the same jobs with new units: rate limiting by <b>tokens per minute</b> not requests, budgets per team, routing/fallback across providers and models, semantic caching of repeated prompts, prompt-injection and PII filtering, and logging every prompt/response for evaluation. MCP gateways do the same for agent tool calls (auth, allow-lists, audit).</p>
      <p><b>Use AI as a partner:</b> generate route configs and policy rules from a table of services, write test cases for every rejection path (<code>Give me requests that should get 401, 403, 413, 429 for this config</code>), and summarise gateway logs during incidents.</p>
      <p><b>Where AI goes wrong:</b> puts business logic in gateway plugins, enables retries on POST without idempotency, trusts client-supplied identity headers, and forgets that a rate limiter with per-node in-memory counters across 20 gateway nodes allows 20× the limit.</p>
      <p><b>What you must still own:</b> the boundary of responsibilities (gateway vs service vs mesh), the failure modes (gateway outage, Redis outage → fail open or closed?), and the security model.</p>`,
    problems: [{
      title: 'Design the edge layer for an e-commerce platform',
      level: 'Medium', tags: ['api gateway', 'auth', 'routing'], companies: ['Amazon', 'Flipkart', 'Shopify'],
      statement: `<p>Web, iOS, Android and 3rd-party sellers call ~30 microservices. Design the edge: what goes in the gateway, how auth and rate limiting work, how you avoid it becoming a bottleneck or single point of failure.</p>`,
      constraints: `<p>Peak 200k req/s during sales; sellers have plans (free: 10 req/s, pro: 200 req/s); p99 gateway overhead ≤ 5 ms; zero-downtime config changes.</p>`,
      example: `<p>A seller on the free plan sends 50 req/s → 10/s succeed, 40/s get <code>429</code> with <code>Retry-After</code>. A shopper's <code>GET /v1/products/123</code> passes auth (anonymous allowed), is served from gateway cache for 30 s.</p>`,
      brute: { why: `<p><b>Naive design:</b> clients call each microservice directly and every service implements its own auth, CORS, rate limiting and logging. Result: 30 slightly different auth bugs, no global view of a seller's request rate (each service counts separately), clients hard-coded to internal hostnames (can't refactor), and no single place to block an attack. The other extreme — one gateway with business logic and synchronous auth-service calls per request — becomes a bottleneck and a deploy queue for every team.</p>` },
      mcq: { q: 'Gateway nodes each keep rate-limit counters in local memory. With 20 nodes behind a round-robin LB and a 10 req/s limit, what can a seller actually achieve?', options: ['Up to about 200 req/s', 'Exactly 10 req/s', '0 req/s', '10 req/s per minute'], answer: 0, explain: 'Each node allows 10/s independently, so 20 nodes allow ~20× the limit. Counters must be shared (Redis) or the limit split per node with sticky routing.' },
      hints: [`<p>Hint 1: List cross-cutting concerns: TLS, WAF, authN, rate limit/quotas, authZ scopes, routing, timeouts/retries, caching, CORS, logging/tracing.</p>`, `<p>Hint 2: Stateless gateway nodes + shared state in Redis (counters) and a control plane (config). Separate gateways (or BFFs) for public shoppers vs sellers.</p>`, `<p>Hint 3: Decide failure behaviour: if Redis is down, fail open with a local fallback limit; if auth keys can't refresh, keep cached JWKS.</p>`],
      solution: {
        approach: `<p><b>Topology:</b> DNS/anycast → CDN (static + cacheable GETs) → L4 load balancer (multi-AZ) → stateless gateway fleet (Envoy/Kong) → services. Two logical gateways: <b>shopper BFFs</b> (web, mobile, response shaping) and a <b>seller/partner gateway</b> (API keys, plans, developer portal).</p>
          <p><b>Pipeline:</b> TLS termination → WAF (bot rules, size limits) → authentication (JWT verified locally with cached JWKS for users; API key → plan lookup cached 60 s for sellers) → rate limit (token bucket per seller in Redis via an atomic Lua script, plus per-IP limits for anonymous) → scope checks → routing by path prefix with weighted canaries → timeouts (per-route), retries only for GET/idempotent → response cache for public GETs → async access logs, metrics, trace ids.</p>
          <p><b>Scale:</b> 200k req/s ÷ ~10k req/s per node ≈ 20 nodes + 50% headroom, autoscaled on CPU/RPS. Redis cluster for counters (~200k ops/s is fine for a small cluster; shard by seller id). Local in-memory pre-check to shed obvious abuse before touching Redis.</p>
          <p><b>Resilience:</b> config via control plane with staged rollout and instant rollback; if Redis fails → fall back to per-node limits (limit ÷ node count) instead of blocking all sales; circuit breakers per upstream; bulkhead seller traffic from shopper traffic.</p>
          <p><b>Not in the gateway:</b> pricing, cart, inventory rules — those stay in services.</p>`,
        complexity: `<p>Per-request overhead: O(1) — a JWT verify (~50 µs), one Redis round trip (~0.5 ms), a route lookup (prefix trie). Horizontal scaling is linear because nodes share nothing but Redis.</p>`,
        followUps: ['How do you rate limit anonymous shoppers fairly behind carrier-grade NAT (many users, one IP)?', 'Where would you put request/response schema validation?']
      }
    }]
  });

  /* ================= TOPIC 4: Token bucket & leaky bucket ================= */
  topics.push({
    title: 'Rate Limiting I: Token Bucket and Leaky Bucket',
    analogy: `<p><b>Token bucket</b> = an arcade token jar. Every second the attendant drops one token into your jar, but the jar holds at most 10. Each game costs a token. If you saved up, you can play 10 games in a burst; if the jar is empty, you wait. <b>Leaky bucket</b> = a funnel with a small hole. You can pour water (requests) in as fast as you like, but it drips out at a fixed steady rate. If you pour too fast, the funnel overflows and the extra spills on the floor (dropped requests).</p>`,
    explain: `<p><b>Rate limiting</b> means capping how many requests a client may make in some time, e.g. "100 requests per minute per API key". Why: protect servers from overload and abuse (scrapers, brute-force logins, buggy retry loops), keep things fair between tenants, and control cost (each LLM call costs money!). Rejected requests get <code>429 Too Many Requests</code>.</p>
      <p><b>Token bucket</b> — two numbers: <b>capacity</b> <i>b</i> (max burst) and <b>refill rate</b> <i>r</i> (tokens per second).</p>
      <ol>
        <li>Store per client: <code>tokens</code> and <code>lastRefillTime</code>.</li>
        <li>On each request at time <i>now</i>: <code>tokens = min(b, tokens + (now − last) × r)</code>, <code>last = now</code>. (Lazy refill — no background timer needed.)</li>
        <li>If <code>tokens ≥ 1</code>: take one, <span class="c-g">allow</span>. Else <span class="c-r">reject (429)</span>.</li>
      </ol>
      <p>Worked example: b = 4, r = 1/s. Five requests at t=0 → first 4 allowed (bucket 4→0), 5th rejected. At t=2 the bucket has refilled to 2 tokens → two more allowed.</p>
      ${H.table(['t', 'request', 'tokens before', 'result', 'tokens after'], [
        ['0', '#1–#4', '4 → 1', H.c('g', 'allow ×4'), '0'],
        ['0', '#5', '0', H.c('r', 'reject'), '0'],
        ['2', '#6', '0 + 2×1 = 2', H.c('g', 'allow'), '1'],
        ['2', '#7', '1', H.c('g', 'allow'), '0'],
        ['2', '#8', '0', H.c('r', 'reject'), '0']
      ])}
      <p><b>Leaky bucket</b> — two numbers: <b>queue size</b> and <b>leak (processing) rate</b>. Requests join a FIFO queue; a worker removes them at exactly <i>r</i> per second. Full queue → drop. Result: perfectly <b>smooth output</b>, no bursts reach the backend. (A "leaky bucket as a meter" variant doesn't queue: it just tracks a water level that drains at <i>r</i> and rejects if adding one would overflow — mathematically the same as a token bucket viewed upside down. GCRA, used by many CDNs and Redis modules, is this meter variant using one timestamp.)</p>
      ${H.table(['', 'Token bucket', 'Leaky bucket (queue)'], [
        ['Bursts', H.c('g', 'Allowed up to capacity'), 'Absorbed in the queue, output stays smooth'],
        ['Latency', 'None added (allow/deny immediately)', 'Requests wait in the queue'],
        ['State', '2 numbers per key', 'A queue per key (or 1 timestamp for GCRA)'],
        ['Used by', 'AWS API Gateway, Stripe, most public APIs', 'Traffic shaping, NGINX <code>limit_req</code>, network routers']
      ])}`,
    clues: [
      '"allow short bursts but limit the average rate" → token bucket (capacity = burst, rate = average)',
      '"smooth out traffic", "downstream can only handle exactly N/s", "traffic shaping" → leaky bucket',
      '"memory efficient, millions of keys" → token bucket / GCRA (one or two numbers per key)',
      '"limit LLM usage by tokens per minute" → token bucket where each request costs its token count, not 1',
      '"return Retry-After" → compute (1 − tokens) / rate seconds until the next token',
      '"distributed across many gateway nodes" → state in Redis with an atomic Lua script'
    ],
    code: [
      { lang: 'java', title: 'Thread-safe token bucket (Java)', code: `import java.util.*;
import java.util.concurrent.*;

public class TokenBucketLimiter {
    /** One bucket per client key. Lazy refill: no background threads. */
    static final class Bucket {
        private final double capacity;      // max burst size
        private final double refillPerSec;  // average allowed rate
        private double tokens;
        private long lastNanos;

        Bucket(double capacity, double refillPerSec, long nowNanos) {
            this.capacity = capacity;
            this.refillPerSec = refillPerSec;
            this.tokens = capacity;          // start full so new clients aren't punished
            this.lastNanos = nowNanos;
        }

        /** Try to take 'cost' tokens. Returns 0 if allowed, else seconds to wait (for Retry-After). */
        synchronized double tryAcquire(double cost, long nowNanos) {
            double elapsedSec = (nowNanos - lastNanos) / 1e9;
            tokens = Math.min(capacity, tokens + elapsedSec * refillPerSec);
            lastNanos = nowNanos;
            if (tokens >= cost) {
                tokens -= cost;
                return 0;
            }
            return (cost - tokens) / refillPerSec;
        }
    }

    private final ConcurrentHashMap<String, Bucket> buckets = new ConcurrentHashMap<>();
    private final double capacity, rate;

    TokenBucketLimiter(double capacity, double rate) { this.capacity = capacity; this.rate = rate; }

    double tryAcquire(String key, double cost, long nowNanos) {
        Bucket b = buckets.computeIfAbsent(key, k -> new Bucket(capacity, rate, nowNanos));
        return b.tryAcquire(cost, nowNanos);
    }

    public static void main(String[] args) {
        TokenBucketLimiter limiter = new TokenBucketLimiter(4, 1);    // burst 4, 1 req/s
        double[] times = {0, 0, 0, 0, 0, 1, 2, 2, 2, 5};
        for (double t : times) {
            long now = (long) (t * 1e9);                                 // simulated clock for a deterministic demo
            double wait = limiter.tryAcquire("alice", 1, now);
            System.out.printf("t=%.1f -> %s%n", t, wait == 0 ? "ALLOW" : String.format("429 retry after %.2fs", wait));
        }
    }
}` },
      { lang: 'python', title: 'Token bucket + leaky bucket (Python, runnable)', run: true, code: `class TokenBucket:
    """capacity = burst size, rate = tokens added per second (lazy refill)."""
    def __init__(self, capacity, rate, now=0.0):
        self.capacity, self.rate = capacity, rate
        self.tokens, self.last = float(capacity), now

    def allow(self, now, cost=1):
        self.tokens = min(self.capacity, self.tokens + (now - self.last) * self.rate)
        self.last = now
        if self.tokens >= cost:
            self.tokens -= cost
            return True
        return False


class LeakyBucketQueue:
    """Requests wait in a FIFO of size 'size'; they leave at exactly 'rate' per second."""
    def __init__(self, size, rate):
        self.size, self.rate = size, rate
        self.queue, self.next_leak = [], None

    def _leak(self, now):
        # process (remove) queued requests whose scheduled time has come
        while self.queue and self.next_leak <= now:
            done = self.queue.pop(0)
            print(f"    processed {done} at t={self.next_leak:g}")
            self.next_leak += 1 / self.rate
        if not self.queue:
            self.next_leak = None

    def offer(self, req, now):
        self._leak(now)
        if len(self.queue) >= self.size:
            return False                       # overflow: drop
        if self.next_leak is None:
            self.next_leak = now + 1 / self.rate
        self.queue.append(req)
        return True


times = [0, 0, 0, 0, 0, 1, 2, 2, 2, 5]
tb = TokenBucket(capacity=4, rate=1)
print("Token bucket (capacity 4, 1/s):")
for i, t in enumerate(times):
    print(f"  req{i} t={t}: {'ALLOW' if tb.allow(t) else 'REJECT 429'}  tokens left={tb.tokens:.1f}")

lb = LeakyBucketQueue(size=3, rate=1)
print("Leaky bucket (queue 3, leaks 1/s):")
for i, t in enumerate(times):
    ok = lb.offer(f"req{i}", t)
    print(f"  req{i} t={t}: {'QUEUED' if ok else 'DROPPED'}  queue={lb.queue}")` }
    ],
    codeTitle: ['Token bucket (Java)', 'Both algorithms (Python)'],
    viz: [{
      title: 'Token bucket: refill and consume',
      input: 'cap=4 rate=1 | 0 0 0 0 0 1 2 2 2 5 5 5 5 5 5',
      inputLabel: 'cap=<burst> rate=<tokens/sec> | request times in seconds',
      gen: function (input) {
        var halves = String(input || '').split('|');
        if (halves.length !== 2) throw new Error('Format: cap=4 rate=1 | 0 0 0 1 2');
        var kv = parseKV(halves[0]);
        var cap = num(kv.cap, NaN), rate = num(kv.rate, NaN);
        if (!(cap >= 1 && cap <= 10) || !(rate > 0 && rate <= 10)) throw new Error('Use cap between 1 and 10 and rate between 0.1 and 10');
        var times = parseTimes(halves[1], 20);
        var tokens = cap, last = times[0], hist = [], hl = {}, rhl = {}, labels = [], frames = [], allowed = 0, rejected = 0;
        frames.push({ narr: 'The bucket starts <b>full</b> with ' + cap + ' tokens. It refills at <b>' + rate + ' token/s</b> but never above ' + cap + '. Each request costs 1 token.', parts: [
          { type: 'array', label: 'request arrival times (s)', values: times },
          { type: 'vars', label: 'bucket', vals: { time: times[0], tokens: cap, capacity: cap, 'refill rate': rate + '/s', allowed: 0, rejected: 0 } }
        ] });
        for (var i = 0; i < times.length; i++) {
          var t = times[i], before = tokens;
          var refill = (t - last) * rate;
          tokens = Math.min(cap, tokens + refill);
          var afterRefill = tokens;
          last = t;
          var ok = tokens >= 1;
          if (ok) { tokens -= 1; allowed++; } else rejected++;
          hist.push(r2(tokens)); labels.push('t=' + t);
          hl[i] = ok ? 'ok' : 'bad'; rhl[i] = ok ? 'ok' : 'bad';
          var ptr = {}; ptr[i] = 'now';
          var bhl = {}; for (var k in hl) bhl[k] = hl[k]; bhl[i] = ok ? 'ok' : 'bad';
          var narr = 'Request at <b>t=' + t + '</b>. ' + (refill > 0 ? 'Time passed, so refill: ' + r2(before) + ' + ' + r2(t - (t - refill / rate)) + 's × ' + rate + ' = ' + r2(before + refill) + (before + refill > cap ? ' → capped at ' + cap : '') + '. ' : 'No time passed since the last request, no refill. ') +
            (ok ? '<span class="c-g">Has ' + r2(afterRefill) + ' ≥ 1 token → ALLOW</span>, take one (' + r2(tokens) + ' left).' : '<span class="c-r">Only ' + r2(afterRefill) + ' tokens → REJECT with 429</span>. Retry-After ≈ ' + r2((1 - afterRefill) / rate) + ' s.');
          frames.push({ narr: narr, parts: [
            { type: 'array', label: 'requests', values: times, hl: rhl, ptr: ptr },
            { type: 'bars', label: 'tokens left after each request', values: hist.slice(), hl: bhl, idxLabels: labels.slice() },
            { type: 'vars', label: 'bucket', vals: { time: t, 'tokens after refill': r2(afterRefill), 'tokens now': r2(tokens), capacity: cap, allowed: allowed, rejected: rejected }, hl: { 'tokens now': ok ? 'ok' : 'bad', rejected: ok ? '' : 'bad' } }
          ] });
          rhl = JSON.parse(JSON.stringify(rhl));
        }
        frames.push({ narr: 'Finished: <b>' + allowed + '</b> allowed, <b>' + rejected + '</b> rejected. Bursts up to ' + cap + ' were fine; over a long time the average can never exceed ' + rate + ' req/s (+ the initial burst).', parts: [
          { type: 'bars', label: 'tokens left after each request', values: hist.slice(), hl: hl, idxLabels: labels },
          { type: 'vars', label: 'totals', vals: { allowed: allowed, rejected: rejected, 'max long-run rate': rate + '/s' }, hl: { allowed: 'ok', rejected: 'bad' } }
        ] });
        return frames;
      }
    }, {
      title: 'Leaky bucket: queue drains at a steady rate',
      input: 'size=3 rate=1 | 0 0 0 0 0 1 2 2 2 5',
      inputLabel: 'size=<queue slots> rate=<processed per sec> | request times',
      gen: function (input) {
        var halves = String(input || '').split('|');
        if (halves.length !== 2) throw new Error('Format: size=3 rate=1 | 0 0 0 1 2');
        var kv = parseKV(halves[0]);
        var size = num(kv.size, NaN), rate = num(kv.rate, NaN);
        if (!(size >= 1 && size <= 8) || !(rate > 0 && rate <= 5)) throw new Error('Use size 1-8 and rate 0.2-5');
        var times = parseTimes(halves[1], 16);
        var q = [], nextLeak = null, processed = [], frames = [], hl = {}, dropped = 0;
        frames.push({ narr: 'Requests pour into a queue of <b>' + size + '</b> slots. A worker takes exactly one out every ' + r2(1 / rate) + ' s. Full queue = overflow = drop.', parts: [
          { type: 'array', label: 'arrival times', values: times },
          { type: 'queue', label: 'leaky bucket (queue)', items: [], frontLabel: 'leaks out', backLabel: 'pours in' }
        ] });
        for (var i = 0; i < times.length; i++) {
          var t = times[i], leakedNow = [];
          while (q.length && nextLeak !== null && nextLeak <= t) { var d = q.shift(); processed.push(d + '@' + r2(nextLeak)); leakedNow.push(d); nextLeak += 1 / rate; }
          if (!q.length) nextLeak = null;
          var ok = q.length < size;
          if (ok) { if (nextLeak === null) nextLeak = t + 1 / rate; q.push('r' + i); } else dropped++;
          hl[i] = ok ? 'ok' : 'bad';
          var ptr = {}; ptr[i] = 'now';
          var qhl = {}; if (ok) qhl[q.length - 1] = 'ok';
          frames.push({ narr: 'Request <b>r' + i + '</b> at t=' + t + '. ' + (leakedNow.length ? 'First the worker drained ' + leakedNow.join(', ') + ' (steady pace). ' : '') + (ok ? '<span class="c-g">Queue has room → r' + i + ' waits its turn</span> (position ' + q.length + ').' : '<span class="c-r">Queue full → r' + i + ' overflows and is DROPPED</span>.'), parts: [
            { type: 'array', label: 'requests', values: times, hl: JSON.parse(JSON.stringify(hl)), ptr: ptr },
            { type: 'queue', label: 'queue (' + q.length + '/' + size + ')', items: q.slice(), hl: qhl, frontLabel: 'leaks out', backLabel: 'pours in' },
            { type: 'vars', label: 'worker', vals: { time: t, 'next leak at': nextLeak === null ? '—' : r2(nextLeak), processed: processed.length, dropped: dropped }, hl: { dropped: ok ? '' : 'bad' } }
          ] });
        }
        while (q.length) { processed.push(q.shift() + '@' + r2(nextLeak)); nextLeak += 1 / rate; }
        frames.push({ narr: 'After the burst, the worker keeps draining at exactly ' + rate + '/s. Output timeline: <b>' + processed.join(', ') + '</b>. Smooth for the backend, but queued requests waited — and ' + dropped + ' were dropped.', parts: [
          { type: 'array', label: 'requests (green queued, red dropped)', values: times, hl: hl },
          { type: 'set', label: 'processed (request@time)', items: processed },
          { type: 'vars', vals: { processed: processed.length, dropped: dropped }, hl: { dropped: 'bad', processed: 'ok' } }
        ] });
        return frames;
      }
    }],
    examples: [
      { title: 'Picking capacity and rate from a requirement', html: `<p>"Users may make 600 requests per minute, with short bursts of up to 50." → rate = 600/60 = <b>10 tokens/s</b>, capacity = <b>50</b>. A user idle for 5 s has a full bucket and can fire 50 at once; a script hammering continuously gets exactly 10/s.</p>` },
      { title: 'Cost-based limits for an LLM API', html: `<p>Limit = 90,000 tokens/minute. Each request costs its <i>estimated</i> prompt + max_tokens, e.g. 3,000. Bucket: capacity 90,000, rate 1,500/s. After the response, refund unused tokens (actual usage lower than max_tokens). Same algorithm, cost ≠ 1. Many providers combine a requests-per-minute bucket <b>and</b> a tokens-per-minute bucket; a request must pass both.</p>` },
      { title: 'Retry-After math', html: `<p>Bucket has 0.3 tokens, rate 2/s, request costs 1 → need 0.7 more tokens → wait 0.7 / 2 = <b>0.35 s</b>. Return <code>429</code> with <code>Retry-After: 1</code> (header is whole seconds) and <code>RateLimit-Remaining: 0</code>. Good clients sleep instead of hammering.</p>`, code: { lang: 'http', code: `HTTP/1.1 429 Too Many Requests
Content-Type: application/problem+json
Retry-After: 1
RateLimit-Policy: "default";q=600;w=60
RateLimit: "default";r=0;t=1

{"type": "https://api.example/errors/rate-limited", "title": "Too Many Requests", "status": 429,
 "detail": "Limit is 600 requests per 60s. Try again in 1 second."}` } },
      { title: 'Leaky bucket protecting a fragile partner API', html: `<p>Your SMS provider accepts at most 20 messages/s and bans you for bursts. A marketing job enqueues 100k messages instantly. A leaky-bucket worker (queue in Kafka/SQS, consumer paced at 20/s) sends them smoothly over ~83 minutes. A token bucket with capacity 20 would also work, but the leaky queue never drops — it just delays.</p>` }
    ],
    deepDive: `<p><b>Why lazy refill is correct.</b> Refilling continuously with a timer per key is wasteful for millions of keys. Since refill is linear in time, you can compute it at request time from <code>now − last</code>. Use a <b>monotonic clock</b> (Java <code>System.nanoTime()</code>, Python <code>time.monotonic()</code>) on a single machine — wall clocks can jump backwards with NTP. In Redis, use the server's time (<code>TIME</code> inside the script) so all gateway nodes agree.</p>
      <p><b>GCRA (Generic Cell Rate Algorithm).</b> Store just one value per key: the "theoretical arrival time" (TAT). Emission interval T = 1/rate, burst tolerance τ = (capacity − 1) × T. On request at <i>now</i>: <code>tat = max(TAT, now)</code>; if <code>tat − now &gt; τ</code> reject, else <code>TAT = tat + T</code>, allow. Same behaviour as a token bucket with one number of state — used by redis-cell, Cloudflare-style limiters and ATM networks (where it came from).</p>
      <p><b>Distributed token bucket.</b> Two gateway nodes doing read-modify-write on Redis can both read "1 token" and both allow → race. Fix: do the whole refill + check + decrement in a <b>Lua script</b> (atomic in Redis) or with <code>INCR</code>-based algorithms. Shard keys across a Redis cluster; set a TTL (e.g. 2 × capacity / rate) so idle keys vanish. To cut latency, each node can keep a local bucket with a slice of the quota and sync periodically (approximate, but no network call per request).</p>
      <p><b>Hierarchies and fairness.</b> Real APIs stack limits: per-IP (anti-abuse), per-user, per-API-key plan, per-endpoint (expensive search endpoint lower), and a global limit protecting the backend. Check cheap local ones first. For fairness between tenants under overload, combine with <b>weighted fair queuing</b> or concurrency limits (max in-flight requests), because rate limits alone don't account for slow, heavy requests.</p>
      <p><b>Leaky bucket queue sizing.</b> Max added latency = queue size / rate. A queue of 100 at 10/s means a request can wait 10 s — usually longer than the client's timeout, so queued work gets done for clients that have already given up. Keep queues short for interactive traffic.</p>`,
    aiEra: `<p><b>What AI changes:</b> rate limiting moved from "requests per second" to <b>tokens per minute and dollars per day</b>. LLM providers publish RPM and TPM limits; your own AI gateway must enforce per-team and per-user token budgets, and agents that loop can burn a budget in minutes. Token-bucket-with-cost is the standard answer, plus concurrency limits for long streaming calls.</p>
      <p><b>Use AI as a partner:</b> have it write the Redis Lua script and then a property-based test: <code>Simulate 10,000 random request times; assert allowed count ≤ capacity + rate × duration</code>. Ask it to explain GCRA with a numeric trace and check the trace by hand.</p>
      <p><b>Where AI goes wrong:</b> non-atomic Redis GET-then-SET (race lets bursts through), using wall-clock time, forgetting TTL on keys (memory leak), integer division making the refill always 0, and resetting buckets on every deploy (in-memory only).</p>
      <p><b>What you must still own:</b> choosing burst vs smoothness for the business, the units (requests, tokens, cost), where state lives, and what happens when the limiter itself fails.</p>`,
    problems: [{
      title: 'Implement a token bucket rate limiter',
      level: 'Medium', tags: ['rate limiting', 'token bucket', 'concurrency'], companies: ['Stripe', 'Cloudflare', 'Amazon'],
      statement: `<p>Implement <code>allow(clientId, timestampSeconds)</code> that returns true if the request is allowed under a token bucket with capacity <i>b</i> and refill rate <i>r</i> tokens/s per client. Timestamps per client are non-decreasing. Then explain how to make it work across many servers.</p>`,
      constraints: `<p>Up to 10<sup>6</sup> distinct clients; 10<sup>5</sup> calls/s on one node; O(1) time per call; memory O(clients).</p>`,
      example: `<p>b=3, r=1. Calls for "u1" at t = 0, 0, 0, 0, 1.5 → ${H.c('g', 'T, T, T')}, ${H.c('r', 'F')}, ${H.c('g', 'T')} (bucket refilled 1.5 tokens by t=1.5).</p>`,
      brute: { why: `<p><b>Naive:</b> store every request timestamp per client and count those in the last 1/r × b seconds, or run a background thread adding tokens to every bucket each second. The first uses O(requests) memory; the second does O(clients) work per second even for idle clients (a million wake-ups/s) and has drift.</p>`, code: { lang: 'python', code: `import collections

class NaiveLimiter:
    """Background refill of EVERY bucket each second: O(clients) work per tick."""
    def __init__(self, cap, rate):
        self.cap, self.rate = cap, rate
        self.tokens = collections.defaultdict(lambda: cap)

    def tick(self):                      # must be called every second by a timer
        for k in list(self.tokens):
            self.tokens[k] = min(self.cap, self.tokens[k] + self.rate)

    def allow(self, client):
        if self.tokens[client] >= 1:
            self.tokens[client] -= 1
            return True
        return False` } },
      mcq: { q: 'Where should the refill happen?', options: ['Lazily, inside allow(), using now − lastRefill', 'In a timer thread per client', 'Only when the bucket is empty', 'Never — use a counter that resets daily'], answer: 0, explain: 'Refill is linear in elapsed time, so you can compute it on demand in O(1) with no timers.' },
      hints: [`<p>Hint 1: You only need two numbers per client: current tokens and the time you last updated them.</p>`, `<p>Hint 2: On each call: tokens = min(b, tokens + (now − last) × r); last = now; then try to subtract 1.</p>`, `<p>Hint 3: Concurrency: lock per bucket (or a CAS loop). Distributed: same logic inside a Redis Lua script keyed by client, with TTL for idle keys.</p>`],
      solution: {
        approach: `<p>Map clientId → (tokens, last). New clients start with a full bucket. Each call refills lazily, caps at capacity, then consumes one token if available. For many servers, move the state to Redis and run refill + check + decrement atomically in a Lua script using Redis server time; set an expiry so idle clients cost nothing.</p>`,
        code: { lang: 'python', run: true, code: `class TokenBucketLimiter:
    def __init__(self, capacity, rate):
        self.capacity, self.rate = capacity, rate
        self.state = {}                      # client -> [tokens, last_ts]

    def allow(self, client, now):
        tokens, last = self.state.get(client, (self.capacity, now))
        tokens = min(self.capacity, tokens + (now - last) * self.rate)   # lazy refill
        allowed = tokens >= 1
        if allowed:
            tokens -= 1
        self.state[client] = (tokens, now)
        return allowed


lim = TokenBucketLimiter(capacity=3, rate=1)
calls = [("u1", 0), ("u1", 0), ("u1", 0), ("u1", 0), ("u2", 0), ("u1", 1.5), ("u1", 1.6)]
for c, t in calls:
    print(c, t, lim.allow(c, t))
# expected: T T T F (u1 burst), T (u2 independent), T (refilled 1.5), F (0.6 left)` },
        alt: [{ lang: 'text', title: 'Redis Lua (atomic, distributed)', code: `-- KEYS[1] = "rl:{clientId}"   ARGV: capacity, rate, cost
local cap, rate, cost = tonumber(ARGV[1]), tonumber(ARGV[2]), tonumber(ARGV[3])
local t = redis.call('TIME')
local now = tonumber(t[1]) + tonumber(t[2]) / 1000000
local s = redis.call('HMGET', KEYS[1], 'tokens', 'ts')
local tokens = tonumber(s[1]) or cap
local ts = tonumber(s[2]) or now
tokens = math.min(cap, tokens + (now - ts) * rate)
local allowed = 0
if tokens >= cost then tokens = tokens - cost; allowed = 1 end
redis.call('HSET', KEYS[1], 'tokens', tokens, 'ts', now)
redis.call('EXPIRE', KEYS[1], math.ceil(cap / rate) * 2)
return allowed` }],
        complexity: `<p>O(1) time per call, O(clients) memory (two numbers each). Redis version: one round trip (~0.5 ms) per request, atomic thanks to single-threaded script execution.</p>`,
        followUps: ['Return Retry-After when rejecting.', 'Support a per-request cost (e.g. LLM tokens).', 'How do you avoid a Redis round trip on every request?']
      }
    }]
  });

  /* ================= TOPIC 5: Window-based limiters ================= */
  function windowInput(input, maxN) {
    var halves = String(input || '').split('|');
    if (halves.length !== 2) throw new Error('Format: limit=3 window=10 | 1 2 5 11 12');
    var kv = parseKV(halves[0]);
    var limit = num(kv.limit, NaN), W = num(kv.window, NaN);
    if (!(limit >= 1 && limit <= 10) || !(W >= 2 && W <= 60)) throw new Error('Use limit 1-10 and window 2-60 seconds');
    return { limit: limit, W: W, times: parseTimes(halves[1], maxN) };
  }
  function idxRange(times, lo, hiT, upto) {
    // indexes j <= upto with lo < times[j] <= hiT  (or lo <= when lo is inclusive, handled by caller)
    var a = -1, b = -1;
    for (var j = 0; j <= upto; j++) if (times[j] > lo && times[j] <= hiT) { if (a < 0) a = j; b = j; }
    return a < 0 ? [upto, upto] : [a, b];
  }
  topics.push({
    title: 'Rate Limiting II: Fixed Window, Sliding Log and Sliding Window Counter',
    analogy: `<p>A gym allows <b>3 visits per 10 days</b>. <b>Fixed window</b>: the counter resets on day 1, 11, 21… — so you could visit on days 8, 9, 10 and again 11, 12, 13: six visits in six days, technically legal. <b>Sliding log</b>: the front desk keeps your visit diary and counts visits in the last 10 days from <i>today</i> — exact, but they store every visit. <b>Sliding window counter</b>: the desk only remembers "visits last period" and "visits this period" and estimates the overlap — almost exact, tiny memory.</p>`,
    explain: `<p>Window algorithms answer "how many requests in the last <i>W</i> seconds?" and reject when the answer reaches the limit <i>N</i>.</p>
      <p><b>1. Fixed window counter.</b> Key = <code>client:floor(now / W)</code>; <code>INCR</code> it, set expiry W; reject if count &gt; N. Dead simple: one counter per client per window. ${H.c('r', 'Flaw')}: <b>boundary burst</b> — N requests at the end of one window plus N at the start of the next = <b>2N</b> requests in a short span.</p>
      ${H.arr(['t=8', 't=9', 't=9', 't=10', 't=10', 't=11'], { label: 'limit 3 / 10 s — all 6 ALLOWED', hl: { 0: 'g', 1: 'g', 2: 'g', 3: 'y', 4: 'y', 5: 'y' } })}
      <p>Above: window [0,10) allows 8, 9, 9; window [10,20) resets at t=10 and allows 10, 10, 11 → 6 requests within 3 seconds.</p>
      <p><b>2. Sliding window log.</b> Keep a sorted list of each client's accepted timestamps. On a request at <i>now</i>: delete entries ≤ now − W, count the rest; if count &lt; N allow and append now. ${H.c('g', 'Exact')}, but memory is O(N) per client (a 1000/hour limit stores up to 1000 timestamps per user). In Redis: a sorted set with <code>ZREMRANGEBYSCORE</code>, <code>ZCARD</code>, <code>ZADD</code>.</p>
      <p><b>3. Sliding window counter</b> (the popular compromise). Keep only two fixed-window counters: previous and current. Assume requests in the previous window were spread evenly, and weight it by how much of it still overlaps the sliding window:</p>
      <p style="text-align:center"><code>estimate = prev × (1 − elapsed/W) + curr</code></p>
      <p>Example: limit 10 per minute. Previous minute had 8, current minute has 4 so far, and we are 15 s (25%) into the current minute. Estimate = 8 × 0.75 + 4 = <b>10</b> → reject (≥ 10). At 30 s in: 8 × 0.5 + 4 = 8 → allow. Cloudflare reported this approximation was wrong for only ~0.003% of requests across 400M requests, while using two counters per key.</p>
      ${H.table(['Algorithm', 'Memory / key', 'Accuracy', 'Bursts', 'Typical use'], [
        ['Fixed window', '1 counter', 'Up to 2× at boundaries', 'Allowed at window edges', 'Daily/monthly quotas, simple APIs'],
        ['Sliding log', 'N timestamps', H.c('g', 'Exact'), 'Never above N in any W', 'Low limits where precision matters (login attempts)'],
        ['Sliding window counter', '2 counters', '~Exact (assumes even spread)', 'Smoothed', 'High-scale API limits (Cloudflare, many gateways)'],
        ['Token bucket', '2 numbers', 'Exact for its model', 'Up to capacity', 'Public APIs that permit bursts']
      ])}`,
    clues: [
      '"N requests per minute per user" + "simple" → fixed window (mention the boundary burst flaw)',
      '"never exceed N in ANY rolling window" / "exact" / "login attempts" → sliding window log',
      '"millions of users, low memory, accurate enough" → sliding window counter',
      '"daily quota resets at midnight" → fixed window is actually the requirement',
      '"Redis sorted set ZREMRANGEBYSCORE ZCARD" in the question → sliding log implementation',
      '"limit spikes at the start of each minute" → boundary problem of fixed windows'
    ],
    code: [
      { lang: 'python', title: 'All three window limiters (Python, runnable)', run: true, code: `from collections import defaultdict, deque


class FixedWindow:
    def __init__(self, limit, window):
        self.limit, self.window = limit, window
        self.counts = defaultdict(int)            # (client, window_id) -> count

    def allow(self, client, now):
        key = (client, int(now // self.window))
        if self.counts[key] >= self.limit:
            return False
        self.counts[key] += 1
        return True


class SlidingLog:
    def __init__(self, limit, window):
        self.limit, self.window = limit, window
        self.logs = defaultdict(deque)            # client -> accepted timestamps

    def allow(self, client, now):
        log = self.logs[client]
        while log and log[0] <= now - self.window:  # evict timestamps outside (now-W, now]
            log.popleft()
        if len(log) >= self.limit:
            return False
        log.append(now)
        return True


class SlidingWindowCounter:
    def __init__(self, limit, window):
        self.limit, self.window = limit, window
        self.counts = defaultdict(int)            # (client, window_id) -> count

    def allow(self, client, now):
        wid = int(now // self.window)
        elapsed = now - wid * self.window
        prev = self.counts[(client, wid - 1)]
        curr = self.counts[(client, wid)]
        estimate = prev * (1 - elapsed / self.window) + curr
        if estimate >= self.limit:
            return False
        self.counts[(client, wid)] += 1
        return True


times = [8, 9, 9, 10, 10, 11, 15, 19, 21]
for cls in (FixedWindow, SlidingLog, SlidingWindowCounter):
    lim = cls(limit=3, window=10)
    res = ["ok" if lim.allow("u1", t) else "429" for t in times]
    print(f"{cls.__name__:22s}", list(zip(times, res)))` },
      { lang: 'java', title: 'Sliding window counter (Java)', code: `import java.util.*;
import java.util.concurrent.*;

public class SlidingWindowCounterLimiter {
    private final int limit;
    private final long windowMs;
    // per client: [windowId, prevCount, currCount]
    private final ConcurrentHashMap<String, long[]> state = new ConcurrentHashMap<>();

    SlidingWindowCounterLimiter(int limit, long windowMs) { this.limit = limit; this.windowMs = windowMs; }

    boolean allow(String client, long nowMs) {
        long[] s = state.computeIfAbsent(client, k -> new long[]{nowMs / windowMs, 0, 0});
        synchronized (s) {
            long wid = nowMs / windowMs;
            if (wid != s[0]) {                       // roll the windows forward
                s[1] = (wid == s[0] + 1) ? s[2] : 0; // previous = old current only if adjacent
                s[2] = 0;
                s[0] = wid;
            }
            double elapsedFrac = (nowMs - wid * windowMs) / (double) windowMs;
            double estimate = s[1] * (1.0 - elapsedFrac) + s[2];
            if (estimate >= limit) return false;
            s[2]++;
            return true;
        }
    }

    public static void main(String[] args) {
        SlidingWindowCounterLimiter lim = new SlidingWindowCounterLimiter(3, 10_000);
        long[] times = {8_000, 9_000, 9_500, 10_000, 10_500, 11_000, 15_000, 19_000, 21_000};
        for (long t : times) System.out.println("t=" + t / 1000.0 + "s -> " + (lim.allow("u1", t) ? "ok" : "429"));
    }
}` },
      { lang: 'text', title: 'Sliding log in Redis (MULTI/EXEC or Lua)', code: `-- KEYS[1] = "log:{client}"  ARGV: now_ms, window_ms, limit, unique_member
redis.call('ZREMRANGEBYSCORE', KEYS[1], 0, tonumber(ARGV[1]) - tonumber(ARGV[2]))
local count = redis.call('ZCARD', KEYS[1])
if count >= tonumber(ARGV[3]) then return 0 end
redis.call('ZADD', KEYS[1], ARGV[1], ARGV[4])          -- member must be unique (e.g. now_ms..random)
redis.call('PEXPIRE', KEYS[1], ARGV[2])
return 1` }
    ],
    codeTitle: ['Three limiters (Python)', 'Sliding counter (Java)', 'Sliding log (Redis Lua)'],
    viz: [{
      title: 'Fixed window: the boundary burst',
      input: 'limit=3 window=10 | 2 7 8 9 10 11 12 15 21',
      inputLabel: 'limit=<N> window=<seconds> | request times',
      gen: function (input) {
        var o = windowInput(input, 16), L = o.limit, W = o.W, ts = o.times;
        var frames = [], hl = {}, counts = {};
        frames.push({ narr: 'Fixed windows of <b>' + W + ' s</b>: [0,' + W + '), [' + W + ',' + 2 * W + '), … Each window has its own counter that starts at 0. Limit: <b>' + L + '</b> per window.', parts: [{ type: 'array', label: 'request times', values: ts }] });
        for (var i = 0; i < ts.length; i++) {
          var wid = Math.floor(ts[i] / W), c = counts[wid] || 0, ok = c < L;
          if (ok) counts[wid] = c + 1;
          hl[i] = ok ? 'ok' : 'bad';
          var rg = [i, i];
          for (var j = 0; j <= i; j++) if (Math.floor(ts[j] / W) === wid) { rg = [j, i]; break; }
          var ptr = {}; ptr[i] = 'now';
          frames.push({ narr: 't=' + ts[i] + ' falls in window <b>[' + wid * W + ', ' + (wid + 1) * W + ')</b> (blue range). Counter = ' + c + '. ' + (ok ? '<span class="c-g">' + c + ' &lt; ' + L + ' → allow</span>, counter becomes ' + (c + 1) + '.' : '<span class="c-r">Counter already ' + L + ' → reject 429</span>.'), parts: [
            { type: 'array', label: 'request times', values: ts, hl: JSON.parse(JSON.stringify(hl)), ptr: ptr, range: rg },
            { type: 'vars', label: 'fixed window', vals: { 'window id': wid, 'window span': '[' + wid * W + ', ' + (wid + 1) * W + ')', counter: counts[wid] || 0, limit: L }, hl: { counter: ok ? 'ok' : 'bad' } }
          ] });
        }
        // find worst burst: max accepted in any W-length span
        var acc = ts.filter(function (t, k) { return hl[k] === 'ok'; }), worst = 0, ws = 0;
        for (var a = 0; a < acc.length; a++) { var n = 0; for (var b = a; b < acc.length && acc[b] < acc[a] + W; b++) n++; if (n > worst) { worst = n; ws = acc[a]; } }
        frames.push({ narr: 'Look across the boundary: in the rolling span [' + ws + ', ' + (ws + W) + ') the fixed window accepted <b>' + worst + '</b> requests' + (worst > L ? ' — <span class="c-r">more than the limit of ' + L + '</span>. Up to 2× the limit can slip through around a window edge.' : '. No boundary burst in this input — try times clustered just before and after ' + W + '.'), parts: [
          { type: 'array', label: 'accepted (green) vs rejected (red)', values: ts, hl: hl },
          { type: 'vars', vals: { limit: L, 'worst rolling count': worst }, hl: { 'worst rolling count': worst > L ? 'bad' : 'ok' } }
        ] });
        return frames;
      }
    }, {
      title: 'Sliding window log: exact count in the last W seconds',
      input: 'limit=3 window=10 | 2 7 8 9 10 11 12 15 21',
      inputLabel: 'limit=<N> window=<seconds> | request times',
      gen: function (input) {
        var o = windowInput(input, 16), L = o.limit, W = o.W, ts = o.times;
        var frames = [], hl = {}, log = [];
        frames.push({ narr: 'Sliding log keeps every <b>accepted</b> timestamp. For a request at t, it looks only at (t − ' + W + ', t] — a window that slides with time instead of jumping.', parts: [{ type: 'array', label: 'request times', values: ts }, { type: 'set', label: 'log (accepted timestamps)', items: [] }] });
        for (var i = 0; i < ts.length; i++) {
          var t = ts[i], evicted = log.filter(function (x) { return x <= t - W; });
          log = log.filter(function (x) { return x > t - W; });
          var ok = log.length < L;
          if (ok) log.push(t);
          hl[i] = ok ? 'ok' : 'bad';
          var ptr = {}; ptr[i] = 'now';
          var shl = {}; if (ok) shl[String(t)] = 'ok';
          frames.push({ narr: 'Request at <b>t=' + t + '</b>. Window = (' + (t - W) + ', ' + t + ']. ' + (evicted.length ? 'Evict old entries ' + evicted.join(', ') + '. ' : '') + 'Log holds ' + (ok ? log.length - 1 : log.length) + ' entries. ' + (ok ? '<span class="c-g">Below ' + L + ' → allow</span> and append ' + t + '.' : '<span class="c-r">Already ' + L + ' in the last ' + W + ' s → reject</span>.'), parts: [
            { type: 'array', label: 'request times (blue = inside sliding window)', values: ts, hl: JSON.parse(JSON.stringify(hl)), ptr: ptr, range: idxRange(ts, t - W, t, i) },
            { type: 'set', label: 'log (accepted timestamps in window)', items: log.map(String), hl: shl },
            { type: 'vars', vals: { 'window': '(' + (t - W) + ', ' + t + ']', 'count in window': ok ? log.length - 1 : log.length, limit: L } }
          ] });
        }
        frames.push({ narr: 'Exact: no rolling ' + W + '-second span ever contains more than ' + L + ' accepted requests. The cost is memory — up to ' + L + ' timestamps per client (fine for 5 login attempts, heavy for 10,000 requests/hour).', parts: [{ type: 'array', label: 'final decisions', values: ts, hl: hl }] });
        return frames;
      }
    }, {
      title: 'Sliding window counter: two counters + overlap weight',
      input: 'limit=4 window=10 | 1 3 5 8 11 12 13 15 19 21 22 26',
      inputLabel: 'limit=<N> window=<seconds> | request times',
      gen: function (input) {
        var o = windowInput(input, 16), L = o.limit, W = o.W, ts = o.times;
        var frames = [], hl = {}, counts = {};
        frames.push({ narr: 'Only two numbers per client: <b>prev</b> (accepted in the previous fixed window) and <b>curr</b> (accepted so far in this one). Estimate = prev × (1 − elapsed/W) + curr. Limit ' + L + ' per ' + W + ' s.', parts: [{ type: 'array', label: 'request times', values: ts }, { type: 'vars', vals: { prev: 0, curr: 0, estimate: 0, limit: L } }] });
        for (var i = 0; i < ts.length; i++) {
          var t = ts[i], wid = Math.floor(t / W), elapsed = t - wid * W;
          var prev = counts[wid - 1] || 0, curr = counts[wid] || 0;
          var weight = 1 - elapsed / W, est = prev * weight + curr, ok = est < L;
          if (ok) counts[wid] = curr + 1;
          hl[i] = ok ? 'ok' : 'bad';
          var ptr = {}; ptr[i] = 'now';
          frames.push({ narr: 't=' + t + ': current window starts at ' + wid * W + ', we are ' + elapsed + 's in, so ' + Math.round(weight * 100) + '% of the previous window still overlaps the sliding window (t−' + W + ', t]. Estimate = ' + prev + ' × ' + r2(weight) + ' + ' + curr + ' = <b>' + r2(est) + '</b>. ' + (ok ? '<span class="c-g">&lt; ' + L + ' → allow</span> (curr becomes ' + (curr + 1) + ').' : '<span class="c-r">≥ ' + L + ' → reject</span>.'), parts: [
            { type: 'array', label: 'request times (blue = sliding window span)', values: ts, hl: JSON.parse(JSON.stringify(hl)), ptr: ptr, range: idxRange(ts, t - W, t, i) },
            { type: 'vars', label: 'two counters', vals: { 'prev window': '[' + (wid - 1) * W + ',' + wid * W + ')', prev: prev, curr: ok ? curr + 1 : curr, 'overlap weight': r2(weight), estimate: r2(est), limit: L }, hl: { estimate: ok ? 'ok' : 'bad' } }
          ] });
        }
        frames.push({ narr: 'The estimate assumes the previous window\'s requests were spread evenly. It can be slightly off when they were bunched up, but memory stays at 2 counters per client no matter how high the limit — that is why large-scale limiters use it.', parts: [{ type: 'array', label: 'final decisions', values: ts, hl: hl }] });
        return frames;
      }
    }],
    examples: [
      { title: 'Sliding counter worked by hand', html: `<p>Limit 100/min. At 12:01:45 a request arrives. Window 12:00 had 84 accepted, window 12:01 has 37 so far. Elapsed = 45 s → overlap of previous window = 15/60 = 0.25. Estimate = 84 × 0.25 + 37 = <b>58</b> &lt; 100 → allow, curr becomes 38.</p>
        ${H.table(['', 'value'], [['prev', '84'], ['curr', '37'], ['weight', '0.25'], ['estimate', '84×0.25+37 = 58'], ['decision', H.c('g', 'allow')]])}` },
      { title: 'Fixed window is right for quotas', html: `<p>"Free plan: 1,000 API calls per calendar month" — the business literally wants a counter that resets on the 1st. Use key <code>quota:{key}:2026-10</code>, <code>INCR</code>, compare, expire after 35 days. Combine with a per-second token bucket so nobody burns the month in one minute.</p>` },
      { title: 'Login brute-force protection with a sliding log', html: `<p>Rule: max 5 failed logins per account per 15 minutes. Low N, precision matters, and failures are rare → a sorted set of failure timestamps per account is tiny. Add a second, per-IP limit across accounts (credential stuffing tries many accounts from one IP) and exponential lockout.</p>` },
      { title: 'Choosing the key matters as much as the algorithm', html: `<p>Per IP: unfair behind corporate NAT or mobile carriers (thousands of users share an IP). Per user id: needs auth first. Per API key: best for B2B. Per endpoint + key: protects expensive endpoints. Often you use several: <code>ip</code> for anonymous, <code>user</code> for logged-in, <code>org</code> for plan quotas.</p>` }
    ],
    deepDive: `<p><b>Atomicity in Redis.</b> Fixed window: <code>INCR key</code> then <code>EXPIRE key W NX</code> (Redis 7 supports <code>NX</code> so you don't extend it on every call). Do both in a pipeline/Lua; if the process dies between INCR and EXPIRE you get an immortal key. Sliding log: ZREMRANGEBYSCORE + ZCARD + ZADD must be in one Lua script, or two concurrent requests both see "count = N−1" and both add. Members must be unique (timestamp + random suffix), otherwise two requests in the same millisecond collapse into one entry.</p>
      <p><b>Should rejected requests count?</b> In a sliding log, if you also log rejected requests, a client that keeps hammering stays locked out forever (good for abuse, harsh for buggy retries). Most APIs count only accepted requests; anti-abuse limiters often count all attempts.</p>
      <p><b>Error bound of the sliding counter.</b> Worst case: all prev-window requests sat at its very end. Then the true count in the sliding window is prev + curr, while the estimate is prev × weight + curr, so it under-counts by prev × (1 − weight) — it can admit up to roughly N extra in the worst adversarial pattern, but real traffic is spread out, which is why the measured error is tiny.</p>
      <p><b>Multi-region and clock skew.</b> Window ids computed from local clocks on different gateway nodes can disagree by a few hundred ms near boundaries; use Redis server time or tolerate it. Across regions, a single global Redis adds 100 ms+ latency, so use per-region limits (limit ÷ regions, or weighted by traffic) and asynchronously reconcile — accepting small overshoot.</p>
      <p><b>Response headers.</b> IETF's RateLimit header fields draft (<code>RateLimit-Policy</code>, <code>RateLimit</code>) and the common <code>X-RateLimit-Limit/Remaining/Reset</code> tell clients their budget. Always send <code>Retry-After</code> on 429 so well-behaved clients back off precisely.</p>
      <p><b>Load shedding is different.</b> Rate limits are per-client fairness. When the whole service is overloaded you also need adaptive load shedding (reject by priority when CPU/queue latency is high) and concurrency limits — limits that react to server health (e.g. Netflix's adaptive concurrency limits).</p>`,
    aiEra: `<p><b>What AI changes:</b> AI crawlers and agents generate bursty, machine-speed traffic; sites now rate-limit by bot identity (verified user agents, Web Bot Auth signatures) and by cost. For your own LLM features, you often need two windows at once: a short window (tokens per minute) to protect provider limits and a long fixed window (dollars per month) for budgets.</p>
      <p><b>Use AI as a partner:</b> ask for a simulation harness comparing algorithms: <code>Generate bursty traffic (Poisson + spikes at window edges), run fixed, log and sliding counter limiters, and report max requests in any rolling window</code>. Reading the output teaches you the boundary flaw faster than any diagram.</p>
      <p><b>Where AI goes wrong:</b> uses <code>now // W</code> on floats inconsistently, forgets that <code>ZADD</code> with the same member overwrites, counts the current request before checking (off-by-one: allows N−1), and claims the sliding counter is "exact".</p>
      <p><b>What you must still own:</b> which algorithm matches the business promise ("never more than N in any minute" vs "N per calendar minute"), what the key is, and the memory/accuracy math at your scale.</p>`,
    problems: [{
      title: 'Implement a sliding window counter limiter',
      level: 'Medium', tags: ['rate limiting', 'sliding window', 'design'], companies: ['Cloudflare', 'Google', 'Atlassian'],
      statement: `<p>Implement <code>allow(client, nowSeconds)</code> enforcing "at most N requests per W seconds" with the sliding window counter approximation, using O(1) memory per client. Explain the error vs an exact log, and how you'd run it on Redis for 50 gateway nodes.</p>`,
      constraints: `<p>10M active clients; N up to 10,000 per hour; per-call O(1); memory ≤ ~32 bytes of state per client.</p>`,
      example: `<p>N=4, W=10. Accepted at 1, 3, 5, 8 (window 0 has 4). At t=12: prev=4, curr=0, weight=0.8 → est 3.2 → ${H.c('g', 'allow')}. At t=13: est = 4×0.7 + 1 = 3.8 → ${H.c('g', 'allow')}. At t=15: est = 4×0.5 + 2 = 4 → ${H.c('r', 'reject')}.</p>`,
      brute: { why: `<p><b>Naive:</b> a sliding log per client stores up to N timestamps — 10,000 × 8 bytes × 10M clients = 800 GB. Exact, but impossible at this scale. A fixed window fits in memory but allows 2N around boundaries.</p>`, code: { lang: 'python', code: `from collections import deque

class ExactLog:
    """O(N) memory per client: 10k timestamps x 10M clients is far too much."""
    def __init__(self, n, w):
        self.n, self.w, self.logs = n, w, {}

    def allow(self, c, now):
        log = self.logs.setdefault(c, deque())
        while log and log[0] <= now - self.w:
            log.popleft()
        if len(log) >= self.n:
            return False
        log.append(now)
        return True` } },
      mcq: { q: 'Prev window had 50, current has 20, we are 40% into the current window, limit 60. Decision?', options: ['Allow: 50×0.6 + 20 = 50 < 60', 'Reject: 50 + 20 = 70 ≥ 60', 'Allow: 20 < 60, prev is ignored', 'Reject: 50×0.4 + 20 = 40 is wrong formula anyway'], answer: 0, explain: 'Weight is the remaining overlap of the previous window: 1 − 0.4 = 0.6. Estimate 30 + 20 = 50.' },
      hints: [`<p>Hint 1: You only need counts for the current fixed window and the one before it.</p>`, `<p>Hint 2: estimate = prev × (1 − elapsed/W) + curr. Reject if estimate ≥ N, otherwise increment curr.</p>`, `<p>Hint 3: When time jumps by two or more windows, prev must become 0, not the stale current. In Redis use two keys <code>c:{id}:{wid}</code> with TTL 2W, read both, decide and INCR in one Lua script.</p>`],
      solution: {
        approach: `<p>Per client store (windowId, prev, curr). On a call: compute wid = floor(now/W). If wid moved forward by 1, prev = curr, curr = 0; if by more, prev = curr = 0. Compute weight and estimate; allow and increment if below N. On Redis: keys per window with expiry 2W, Lua script reads <code>prev</code> and <code>curr</code>, computes the estimate with server time, INCRs <code>curr</code> if allowed — one round trip, atomic across all 50 nodes.</p>`,
        code: { lang: 'python', run: true, code: `class SlidingWindowCounter:
    def __init__(self, n, w):
        self.n, self.w = n, w
        self.state = {}                       # client -> [wid, prev, curr]

    def allow(self, client, now):
        wid = int(now // self.w)
        s = self.state.get(client)
        if s is None:
            s = [wid, 0, 0]
        elif wid != s[0]:
            s = [wid, s[2] if wid == s[0] + 1 else 0, 0]   # roll forward
        weight = 1 - (now - wid * self.w) / self.w
        estimate = s[1] * weight + s[2]
        allowed = estimate < self.n
        if allowed:
            s[2] += 1
        self.state[client] = s
        return allowed, round(estimate, 2)


lim = SlidingWindowCounter(n=4, w=10)
for t in [1, 3, 5, 8, 9, 12, 13, 15, 19, 35]:
    print(t, lim.allow("c1", t))` },
        complexity: `<p>O(1) time; 3 numbers per client (~24 bytes) → 10M clients ≈ 240 MB, versus 800 GB for the exact log. Worst-case over-admission ≈ prev × (1 − weight) when traffic bunches at the end of the previous window.</p>`,
        followUps: ['Return RateLimit-Remaining and Retry-After for this algorithm.', 'How would you shard the Redis keys and handle a Redis node failure?']
      }
    }]
  });

  /* ================= TOPIC 6: Pagination ================= */
  topics.push({
    title: 'Pagination: Offset vs Cursor (Keyset)',
    analogy: `<p>Reading a long newspaper column. <b>Offset pagination</b> = "start reading at the 41st line". If the editor adds two lines at the top while you're reading, your "41st line" is now a line you already read — duplicates. If they remove lines, you skip some. <b>Cursor pagination</b> = putting a bookmark on the last line you read and saying "continue <i>after this line</i>". New lines on top don't move your bookmark.</p>`,
    explain: `<p>No API should return 10 million rows in one response. <b>Pagination</b> splits a list into pages. Two main styles:</p>
      <p><b>1. Offset / limit</b> — <code>GET /posts?limit=20&amp;offset=40</code> → SQL <code>ORDER BY created_at DESC LIMIT 20 OFFSET 40</code>.</p>
      <ul>
        <li>${H.c('g', 'Pros')}: dead simple; "jump to page 37" and "showing 41–60 of 1,284" are easy.</li>
        <li>${H.c('r', 'Cons')}: the DB still <b>reads and throws away</b> the first <i>offset</i> rows, so page 10,000 is very slow (O(offset + limit)). And when rows are inserted or deleted between requests, items <b>shift</b>: users see duplicates or miss items.</li>
      </ul>
      <p><b>2. Cursor / keyset</b> — the response includes an opaque <code>next_cursor</code> that encodes the position of the last item (e.g. its <code>(created_at, id)</code>). Next request: <code>GET /posts?limit=20&amp;cursor=eyJ0Ijo...</code> → SQL <code>WHERE (created_at, id) &lt; (:t, :id) ORDER BY created_at DESC, id DESC LIMIT 20</code>.</p>
      <ul>
        <li>${H.c('g', 'Pros')}: uses the index to <b>seek</b> straight to the position → every page is equally fast, O(log n + limit). Stable under inserts/deletes: no duplicates, no skips.</li>
        <li>${H.c('r', 'Cons')}: no random "jump to page 37"; no cheap total count; sort key must be unique (add <code>id</code> as a tie-breaker) and indexed.</li>
      </ul>
      ${H.table(['', 'Offset', 'Cursor / keyset'], [
        ['Request', '<code>?page=3&amp;size=20</code>', '<code>?cursor=abc&amp;limit=20</code>'],
        ['Deep page cost', H.c('r', 'O(offset + limit) — gets slower'), H.c('g', 'O(log n + limit) — constant-ish')],
        ['Inserts while paging', H.c('r', 'Duplicates / skipped items'), H.c('g', 'Stable')],
        ['Jump to page N', H.c('g', 'Yes'), H.c('r', 'No (only next/prev)')],
        ['Best for', 'Admin tables, small datasets, search results UI with page numbers', 'Feeds, infinite scroll, public APIs, data exports, sync']
      ])}
      <p>Make the cursor <b>opaque</b> (base64 of JSON, ideally signed or encrypted) so clients don't build their own and you can change its internals later. Return it in the body (<code>"next_cursor"</code>, <code>"has_more"</code>) or in a <code>Link: &lt;...&gt;; rel="next"</code> header.</p>`,
    clues: [
      '"infinite scroll", "news feed", "timeline" → cursor pagination',
      '"new items arrive constantly while the user scrolls" → offset gives duplicates → cursor',
      '"page 50,000 is slow" / "OFFSET 1000000" → keyset pagination with an index',
      '"jump to page 7", "total pages" in an admin UI → offset is acceptable',
      '"export all rows reliably", "sync changes since last time" → cursor / change token',
      '"sort by a non-unique column" → add id as tie-breaker in the cursor'
    ],
    code: [
      { lang: 'sql', title: 'Offset vs keyset in SQL (runs in SQLite)', code: `CREATE TABLE posts (id INTEGER PRIMARY KEY, created_at INTEGER NOT NULL, title TEXT);
CREATE INDEX idx_posts_created ON posts(created_at DESC, id DESC);
INSERT INTO posts(id, created_at, title) VALUES
 (1,100,'a'),(2,105,'b'),(3,105,'c'),(4,110,'d'),(5,120,'e'),
 (6,125,'f'),(7,130,'g'),(8,130,'h'),(9,140,'i'),(10,150,'j');

-- Offset page 2 (size 3): the DB walks past 3 rows and throws them away
SELECT id, created_at, title FROM posts
ORDER BY created_at DESC, id DESC
LIMIT 3 OFFSET 3;

-- Keyset page 2: page 1 ended at (created_at=130, id=7); seek straight past it.
-- Row-value comparison handles the tie on created_at=130 correctly.
SELECT id, created_at, title FROM posts
WHERE (created_at, id) < (130, 7)
ORDER BY created_at DESC, id DESC
LIMIT 3;` },
      { lang: 'python', title: 'Opaque, tamper-evident cursors (Python, runnable)', run: true, code: `import base64, hashlib, hmac, json

SECRET = b"server-side-secret"          # in production: from a secrets manager, rotated


def encode_cursor(created_at, row_id):
    payload = json.dumps({"t": created_at, "id": row_id}, separators=(",", ":")).encode()
    sig = hmac.new(SECRET, payload, hashlib.sha256).digest()[:8]   # short MAC
    return base64.urlsafe_b64encode(payload + sig).decode().rstrip("=")


def decode_cursor(cursor):
    raw = base64.urlsafe_b64decode(cursor + "=" * (-len(cursor) % 4))
    payload, sig = raw[:-8], raw[-8:]
    expected = hmac.new(SECRET, payload, hashlib.sha256).digest()[:8]
    if not hmac.compare_digest(sig, expected):
        raise ValueError("invalid cursor")                   # -> HTTP 400
    d = json.loads(payload)
    return d["t"], d["id"]


POSTS = sorted([(150, 10), (140, 9), (130, 8), (130, 7), (125, 6), (120, 5), (110, 4)], reverse=True)


def list_posts(limit, cursor=None):
    rows = POSTS
    if cursor:
        t, i = decode_cursor(cursor)
        rows = [r for r in POSTS if r < (t, i)]               # keyset: strictly after the bookmark
    page = rows[:limit]
    has_more = len(rows) > limit
    nxt = encode_cursor(*page[-1]) if page and has_more else None
    return {"data": page, "next_cursor": nxt, "has_more": has_more}


p1 = list_posts(3)
print(p1)
p2 = list_posts(3, p1["next_cursor"])
print(p2)
try:
    decode_cursor(p1["next_cursor"][:-2] + "AA")
except ValueError as e:
    print("tampered cursor rejected:", e)` },
      { lang: 'json', title: 'A cursor-paginated response body', code: `{
  "data": [
    {"id": "post_9", "created_at": "2026-10-14T10:20:00Z", "title": "Rate limiting 101"},
    {"id": "post_8", "created_at": "2026-10-14T10:10:00Z", "title": "Idempotency keys"}
  ],
  "has_more": true,
  "next_cursor": "eyJ0IjoxMzAsImlkIjo4fQ",
  "links": {"next": "/v1/posts?limit=2&cursor=eyJ0IjoxMzAsImlkIjo4fQ"}
}` }
    ],
    codeTitle: ['SQL', 'Cursor encoding (Python)', 'Response shape (JSON)'],
    viz: {
      title: 'Offset vs cursor while new posts arrive',
      input: 'posts=10 page=3 new=2',
      inputLabel: 'posts=<5-14> page=<size 2-5> new=<posts inserted between page fetches 0-4>',
      gen: function (input) {
        var kv = parseKV(input);
        var N = num(kv.posts, NaN), P = num(kv.page, NaN), NEW = num(kv['new'], NaN);
        if (!(N >= 5 && N <= 14) || !(P >= 2 && P <= 5) || !(NEW >= 0 && NEW <= 4)) throw new Error('Use posts 5-14, page 2-5, new 0-4 (e.g. posts=10 page=3 new=2)');
        var frames = [];
        function rowsOf(ids) { return ids.map(function (id) { return ['post_' + id, '10:' + (id < 10 ? '0' + id : id), id > N ? 'new!' : '']; }); }
        var cols = ['id', 'created', 'note'];
        var ids = []; for (var i = N; i >= 1; i--) ids.push(i);
        var page1 = ids.slice(0, P), hl1 = {};
        for (i = 0; i < P; i++) hl1[i] = 'sel';
        frames.push({ narr: 'A feed sorted <b>newest first</b>. Page size = ' + P + '. <b>Offset pagination</b>, page 1: <code>LIMIT ' + P + ' OFFSET 0</code> → posts ' + page1.join(', ') + '. The user reads them.', parts: [
          { type: 'table', label: 'posts table (newest first)', columns: cols, rows: rowsOf(ids), hl: hl1 },
          { type: 'vars', label: 'offset client', vals: { 'page shown': 1, offset: 0, 'rows DB scanned': P } }
        ] });
        var ids2 = []; for (i = N + NEW; i >= 1; i--) ids2.push(i);
        var hlNew = {}; for (i = 0; i < NEW; i++) hlNew[i] = 'ok';
        frames.push({ narr: NEW ? '<b>' + NEW + ' new post(s)</b> are published at the top while the user is scrolling. Every old row shifts down by ' + NEW + ' position(s).' : 'No new posts arrive this time (try new=2 to see the problem).', parts: [
          { type: 'table', label: 'posts table now', columns: cols, rows: rowsOf(ids2), hl: hlNew }
        ] });
        var off2 = ids2.slice(P, 2 * P), hl2 = {}, dups = [];
        for (i = P; i < Math.min(2 * P, ids2.length); i++) { var dup = page1.indexOf(ids2[i]) >= 0; hl2[i] = dup ? 'bad' : 'sel'; if (dup) dups.push(ids2[i]); }
        frames.push({ narr: 'Offset page 2: <code>LIMIT ' + P + ' OFFSET ' + P + '</code> → posts ' + off2.join(', ') + '. ' + (dups.length ? '<span class="c-r">Duplicates: post ' + dups.join(', ') + ' were already on page 1!</span> The user sees them twice. (If posts were deleted instead, items would be silently skipped.)' : 'No duplicates because nothing shifted.'), parts: [
          { type: 'table', label: 'offset page 2', columns: cols, rows: rowsOf(ids2), hl: hl2 },
          { type: 'vars', label: 'offset client', vals: { 'page shown': 2, offset: P, duplicates: dups.length, 'rows DB scanned': 2 * P }, hl: { duplicates: dups.length ? 'bad' : 'ok' } }
        ] });
        var cursor = page1[page1.length - 1];
        frames.push({ narr: 'Now the <b>cursor</b> way. Page 1 is the same: ' + page1.join(', ') + ', but the response also returns <code>next_cursor</code> = "after post_' + cursor + '" (encoded as base64 of its sort key).', parts: [
          { type: 'table', label: 'cursor page 1', columns: cols, rows: rowsOf(ids), hl: hl1 },
          { type: 'vars', label: 'cursor client', vals: { 'next_cursor': 'post_' + cursor, 'has_more': N > P } }
        ] });
        var after = ids2.filter(function (id) { return id < cursor && id <= N; }).slice(0, P), hl3 = {};
        ids2.forEach(function (id, k) { if (after.indexOf(id) >= 0) hl3[k] = 'ok'; else if (id > N) hl3[k] = 'done'; });
        frames.push({ narr: 'Cursor page 2: <code>WHERE id &lt; ' + cursor + ' ORDER BY id DESC LIMIT ' + P + '</code> → posts ' + after.join(', ') + '. <span class="c-g">No duplicates, no skips</span> — the new posts at the top do not move the bookmark. The index seeks straight to id ' + cursor + ' instead of scanning skipped rows.', parts: [
          { type: 'table', label: 'cursor page 2', columns: cols, rows: rowsOf(ids2), hl: hl3 },
          { type: 'vars', label: 'cursor client', vals: { 'next_cursor': after.length ? 'post_' + after[after.length - 1] : 'null', duplicates: 0, 'rows DB scanned': after.length }, hl: { duplicates: 'ok' } }
        ] });
        frames.push({ narr: 'Cost at scale: fetching page 50,000 of size 20. Offset makes the database read and discard ~1,000,000 rows; keyset reads ~20 rows after one index seek. (New posts are fetched separately via a "newer than first cursor" call — that is how feeds show "3 new posts ↑".)', parts: [
          { type: 'table', label: 'deep page cost (page 50,000, size 20)', columns: ['method', 'rows read', 'stable under inserts?', 'jump to page N?'], rows: [['OFFSET 999980 LIMIT 20', '~1,000,000', 'no', 'yes'], ['WHERE key < cursor LIMIT 20', '~20 (+ index seek)', 'yes', 'no']], hl: { 0: 'bad', 1: 'ok' } }
        ] });
        return frames;
      }
    },
    examples: [
      { title: 'Feed API with cursor', html: `<p><code>GET /v1/feed?limit=20</code> → 20 items + <code>next_cursor</code>. Scrolling: <code>GET /v1/feed?limit=20&amp;cursor=X</code>. Pull-to-refresh: <code>GET /v1/feed?limit=20&amp;before_cursor=FIRST</code> (items newer than the first one shown). Clients never parse cursors; servers can change the encoding (e.g. from id to a ranking score + id) without breaking anyone.</p>` },
      { title: 'Admin table with page numbers', html: `<p>An internal dashboard with 3,000 refunds, filters, and "page 4 of 150". Offset is fine: max offset is tiny, data rarely changes during a session, and page jumps are a requirement. Cap the max offset (e.g. 10,000) so nobody accidentally runs a terrible query.</p>` },
      { title: 'Non-unique sort key bug', html: `<p>Sorting by <code>created_at</code> only, with a cursor of just the timestamp, when 5 posts share 10:00:00 and the page boundary falls between them: <code>WHERE created_at &lt; '10:00:00'</code> skips the remaining ones. Fix: cursor = <code>(created_at, id)</code>, compare the pair, and index both columns in the same order.</p>
        ${H.table(['cursor', 'query', 'result'], [['created_at only', '<code>created_at &lt; t</code>', H.c('r', 'skips ties')], ['(created_at, id)', '<code>(created_at, id) &lt; (t, id)</code>', H.c('g', 'exact')]])}` },
      { title: 'Stripe-style list endpoints', html: `<p>Stripe uses <code>starting_after=obj_id</code> / <code>ending_before=obj_id</code> plus <code>limit</code> and returns <code>has_more</code>. The cursor is simply the id of a returned object — transparent but still stable. GitHub's REST API uses the <code>Link</code> header with <code>rel="next"</code>; GraphQL APIs use the Relay connection spec (<code>edges</code>, <code>pageInfo { endCursor hasNextPage }</code>).</p>` }
    ],
    deepDive: `<p><b>Why OFFSET is slow.</b> B-tree indexes let you find "the row with key X" in O(log n), but not "the 1,000,000th row" — the engine must walk 1,000,000 index entries (or worse, rows) and discard them. Keyset converts "position" into "key", which the index can seek to. On Postgres/MySQL, ensure the <code>ORDER BY</code> exactly matches a composite index (same columns, same direction) and use row-value comparison <code>(a, b) &lt; (x, y)</code>.</p>
      <p><b>Total counts.</b> <code>COUNT(*)</code> over a big filtered set is expensive and changes constantly. Options: omit it, return an estimate ("about 10,000 results"), cache it, or compute it asynchronously. Search engines return approximate totals for this reason.</p>
      <p><b>Cursor contents and security.</b> A cursor may encode sort keys, filter parameters (so a client can't change filters mid-pagination), a snapshot timestamp and a version number. Sign it (HMAC) or encrypt it so clients can't forge positions or read internal ids; give it an expiry if it refers to server-side state. Never put raw SQL in a cursor.</p>
      <p><b>Sharded / distributed data.</b> With data across shards, offset requires fetching offset+limit from every shard and merging — catastrophic for deep pages. Keyset works per shard: each shard returns limit rows after the cursor, the service merges by sort key and the new cursor holds the last key (or per-shard positions). Elasticsearch offers <code>search_after</code> (keyset) and point-in-time snapshots instead of deep <code>from</code>/<code>size</code> (capped at 10,000 by default).</p>
      <p><b>Consistency of a full scan.</b> Keyset gives "no duplicates, no skips for rows that existed throughout", but a row updated so that its sort key moves can still appear twice or be missed. For exports, sort by an immutable key (id) or paginate over a snapshot. For sync APIs, use a <b>change token</b>: "give me everything modified after token T" sorted by (updated_at, id).</p>`,
    aiEra: `<p><b>What AI changes:</b> agents consume your list endpoints and are notoriously bad at handling pagination — they stop at page 1 and answer from partial data. Make it obvious: <code>has_more</code>, <code>next_cursor</code>, sensible default limits, and tool descriptions that say "results are paginated". MCP defines cursor-based pagination for listing tools and resources (<code>nextCursor</code>). Vector-search APIs paginate by score + id the same way keyset does.</p>
      <p><b>Use AI as a partner:</b> ask it to write a migration from offset to keyset including the composite index, then ask: <code>Show me a dataset with duplicate timestamps where your cursor query skips a row</code>. Use it to generate property tests: paginate through all rows while inserting randomly; assert no duplicates.</p>
      <p><b>Where AI goes wrong:</b> cursor on a non-unique column, forgetting the tie-breaker in the index, using <code>&lt;=</code> instead of <code>&lt;</code> (returns the last item again), exposing raw database offsets inside a "cursor", and computing <code>COUNT(*)</code> on every page.</p>
      <p><b>What you must still own:</b> choosing pagination from the product requirement (page numbers vs infinite scroll vs export), the index design, and the consistency guarantees you promise API users.</p>`,
    problems: [{
      title: 'Design pagination for a social timeline API',
      level: 'Medium', tags: ['pagination', 'api design', 'feeds'], companies: ['Twitter/X', 'Meta', 'LinkedIn'],
      statement: `<p>Design <code>GET /v1/timeline</code> for a home feed: infinite scroll down (older), pull-to-refresh (newer), items ranked by time, new posts arriving every second. Specify request/response, cursor contents, DB query and index.</p>`,
      constraints: `<p>Posts table 5B rows, sharded by author; timeline precomputed per user (list of post ids by time); p99 page latency 100 ms; users may scroll 1,000+ items deep.</p>`,
      example: `<p>First call returns posts 980–961 with <code>next_cursor</code>=C1 and <code>prev_cursor</code>=C0. Ten seconds later 3 new posts exist; <code>?before=C0</code> returns exactly those 3; <code>?cursor=C1</code> returns 960–941 with no duplicates.</p>`,
      brute: { why: `<p><b>Naive:</b> <code>?page=N&amp;size=20</code> with <code>ORDER BY created_at DESC OFFSET (N−1)×20</code>. New posts shift everything, so scrolling shows duplicates; deep pages force the DB to scan and discard thousands of rows; across shards, each shard must return offset+limit rows for a merge. Latency grows with depth and the UX is buggy.</p>` },
      mcq: { q: 'Your cursor encodes only created_at. What breaks?', options: ['Posts with the same timestamp at a page boundary are skipped or duplicated', 'Nothing — timestamps are unique', 'Cursor becomes too long', 'The index cannot be used'], answer: 0, explain: 'Sort keys must be unique; add the post id as a tie-breaker and compare (created_at, id) together.' },
      hints: [`<p>Hint 1: Use a unique, monotonic sort key — (created_at, post_id) or a Snowflake id that already embeds time.</p>`, `<p>Hint 2: Two directions: <code>cursor</code> for older items (key &lt; last), <code>before</code> for newer items (key &gt; first).</p>`, `<p>Hint 3: The timeline store (Redis sorted set per user with score = time) supports range-by-score; the cursor carries the score + id. Make the cursor opaque and signed.</p>`],
      solution: {
        approach: `<p><b>API:</b> <code>GET /v1/timeline?limit=20[&amp;cursor=…|&amp;before=…]</code> → <code>{ data: [...], next_cursor, prev_cursor, has_more }</code>. Default limit 20, max 100.</p>
          <p><b>Sort key:</b> Snowflake-style post ids (time-ordered, unique) so the key is a single 64-bit number; otherwise (created_at, id).</p>
          <p><b>Storage &amp; query:</b> each user's timeline is a Redis sorted set (score = post id) capped at ~800 entries; older pages fall back to a DB table <code>timeline(user_id, post_id)</code> with primary key (user_id, post_id DESC). Older page: <code>ZREVRANGEBYSCORE tl:{u} (cursor -inf LIMIT 0 20</code> (exclusive bound) or SQL <code>WHERE user_id=? AND post_id &lt; ? ORDER BY post_id DESC LIMIT 20</code>. Newer: <code>post_id &gt; first ORDER BY post_id ASC LIMIT 20</code>, then reverse. Hydrate post ids with a batched multi-get from the posts cache.</p>
          <p><b>Cursor:</b> base64url(JSON {v:1, pid:last_id}) + HMAC; invalid → 400. Deleted posts are simply filtered during hydration (page may return fewer than limit; <code>has_more</code> still tells the truth).</p>
          <p><b>Why it meets the constraints:</b> each page is one index seek + 20 reads regardless of depth; inserts at the top never shift the bookmark; works per shard and merges by key.</p>`,
        complexity: `<p>O(log n + limit) per page in both Redis (skip list) and B-tree; hydration O(limit) via multi-get. Memory: 800 ids × 8 B per active user in Redis.</p>`,
        followUps: ['How would ranked (non-chronological) feeds change the cursor?', 'How do you show "12 new posts" without fetching them?']
      }
    }]
  });

  /* ================= TOPIC 7: Idempotency keys ================= */
  topics.push({
    title: 'Idempotency Keys: Making Retries Safe',
    analogy: `<p>You press the lift button five times — the lift still comes once. That button is <b>idempotent</b>: pressing it again changes nothing. A "Pay ₹500" button is <b>not</b> naturally like that: press twice, pay twice. An <b>idempotency key</b> is like writing a unique cheque number on your payment. If the bank sees cheque #8841 again, it says "already cashed — here's the same receipt" instead of paying twice.</p>`,
    explain: `<p>Networks fail in the worst possible spot: your <code>POST /payments</code> reaches the server, the card is charged, and then the <b>response</b> is lost (timeout, Wi-Fi drop, load balancer reset). The client can't tell "never arrived" from "arrived but reply lost". If it retries blindly → <span class="c-r">double charge</span>. If it never retries → lost orders.</p>
      <p><b>Idempotent</b> means: doing the operation once or many times leaves the system in the same state. GET, PUT, DELETE are idempotent by definition; POST and PATCH usually are not. The fix for POST: the client generates a unique <b>Idempotency-Key</b> (a UUID) per <i>logical</i> operation and sends it on every retry of that operation.</p>
      <p><b>Server algorithm:</b></p>
      <ol>
        <li>Look up the key (scoped to the account/user) in an idempotency store.</li>
        <li><b>Not found</b> → atomically insert <code>{key, request_hash, status: IN_PROGRESS}</code> (unique constraint), do the work, save the <b>response</b> (status code + body), mark <code>COMPLETED</code>, return it.</li>
        <li><b>Found, COMPLETED, same request hash</b> → <span class="c-p">replay the stored response</span> without doing the work again.</li>
        <li><b>Found, IN_PROGRESS</b> → the first attempt is still running → <code>409 Conflict</code> ("retry later").</li>
        <li><b>Found, but different request body</b> → client bug (key reused for a different operation) → <code>422</code>.</li>
        <li>Keys expire after e.g. 24 hours.</li>
      </ol>
      ${H.table(['Attempt', 'Key', 'Store says', 'Server does', 'Client gets'], [
        ['1', 'k-8841', 'miss', 'charge ₹500, save response', H.c('y', '(response lost in network)')],
        ['2 (retry)', 'k-8841', 'COMPLETED', 'nothing — replay', H.c('g', '201 + same payment id')],
        ['3 (bug)', 'k-8841 with ₹900', 'hash mismatch', 'reject', H.c('r', '422')]
      ])}
      <p>${H.c('b', 'Key points')}: the key comes from the <b>client</b> (only it knows "this is the same intent"); generate it <b>before</b> the first attempt and reuse it on retries; store the response <b>atomically with</b> the side effect where possible (same DB transaction) so a crash can't leave "charged but not recorded".</p>`,
    clues: [
      '"client may retry", "network timeout", "at-least-once delivery" + "must not double-charge" → idempotency key',
      '"payment", "money transfer", "order placement", "send exactly one email" → idempotent POST',
      '"webhooks / queue consumers receive duplicates" → dedupe by event id (consumer-side idempotency)',
      '"exactly-once" in the question → say: at-least-once delivery + idempotent processing',
      '"two identical requests arrive at the same time" → unique constraint / IN_PROGRESS lock → 409 for the second',
      '"retry safely on 5xx" → only idempotent methods or requests carrying an Idempotency-Key'
    ],
    code: [
      { lang: 'http', title: 'Idempotent POST on the wire', code: `POST /v1/payments HTTP/1.1
Host: api.pay.example
Authorization: Bearer sk_live_...
Idempotency-Key: 3f2b8c1e-7d4a-4f8e-9c55-1a2b3c4d5e6f
Content-Type: application/json

{"amount": 50000, "currency": "INR", "source": "card_tok_123", "description": "Order #9001"}

HTTP/1.1 201 Created
Content-Type: application/json

{"id": "pay_71", "status": "succeeded", "amount": 50000}

# --- client timed out before seeing that, so it retries with the SAME key ---

POST /v1/payments HTTP/1.1
Idempotency-Key: 3f2b8c1e-7d4a-4f8e-9c55-1a2b3c4d5e6f
...same body...

HTTP/1.1 201 Created
Idempotent-Replayed: true

{"id": "pay_71", "status": "succeeded", "amount": 50000}` },
      { lang: 'python', title: 'Idempotent payment handler (Python, runnable)', run: true, code: `import hashlib, json, sqlite3, uuid

db = sqlite3.connect(":memory:", isolation_level=None)
db.executescript("""
CREATE TABLE idempotency (
  account_id TEXT, idem_key TEXT, request_hash TEXT, status TEXT,
  response_code INTEGER, response_body TEXT,
  PRIMARY KEY (account_id, idem_key)
);
CREATE TABLE payments (id TEXT PRIMARY KEY, account_id TEXT, amount INTEGER);
""")


def fingerprint(body):
    return hashlib.sha256(json.dumps(body, sort_keys=True).encode()).hexdigest()


def create_payment(account, key, body):
    h = fingerprint(body)
    db.execute("BEGIN IMMEDIATE")                  # serialise writers for this demo
    try:
        row = db.execute("SELECT request_hash, status, response_code, response_body FROM idempotency "
                         "WHERE account_id=? AND idem_key=?", (account, key)).fetchone()
        if row:
            db.execute("COMMIT")
            if row[0] != h:
                return 422, {"error": "Idempotency-Key reused with a different request"}
            if row[1] == "IN_PROGRESS":
                return 409, {"error": "original request still in progress, retry later"}
            return row[2], json.loads(row[3]) | {"replayed": True}
        # first time: do the side effect AND record the response in ONE transaction
        pay_id = "pay_" + uuid.uuid4().hex[:6]
        db.execute("INSERT INTO payments VALUES (?,?,?)", (pay_id, account, body["amount"]))
        resp = {"id": pay_id, "status": "succeeded", "amount": body["amount"]}
        db.execute("INSERT INTO idempotency VALUES (?,?,?,?,?,?)",
                   (account, key, h, "COMPLETED", 201, json.dumps(resp)))
        db.execute("COMMIT")
        return 201, resp
    except Exception:
        db.execute("ROLLBACK")
        raise


body = {"amount": 50000, "currency": "INR"}
print(create_payment("acct_1", "k-8841", body))          # charges
print(create_payment("acct_1", "k-8841", body))          # retry -> replayed, no new charge
print(create_payment("acct_1", "k-8841", {"amount": 90000, "currency": "INR"}))  # 422
print(create_payment("acct_1", "k-9999", body))          # new intent -> new charge
print("payments rows:", db.execute("SELECT COUNT(*) FROM payments").fetchone()[0])` }
    ],
    codeTitle: ['HTTP exchange', 'Handler with SQL transaction (Python)'],
    viz: {
      title: 'Idempotency key: first call, lost reply, replay',
      input: 'k1:500*, k1:500, k2:200, k1:900, k3:700!, k2:200',
      inputLabel: 'key:amount list. * = reply lost in network, ! = duplicate arrives while first is in flight',
      gen: function (input) {
        var reqs = String(input || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean).map(function (s) {
          var m = /^([A-Za-z0-9_-]{1,12}):(\d{1,7})([*!]?)$/.exec(s);
          if (!m) throw new Error('Each item must look like k1:500 (optionally k1:500* or k1:500!)');
          return { key: m[1], amt: +m[2], flag: m[3] };
        });
        if (!reqs.length || reqs.length > 8) throw new Error('Use 1-8 requests');
        var store = {}, ledger = [], frames = [], pid = 70;
        var nodes = [
          { id: 'C', label: 'Client', x: 8, y: 32, shape: 'box' },
          { id: 'API', label: 'Payments API', x: 36, y: 32, shape: 'box' },
          { id: 'ST', label: 'Idempotency store', x: 70, y: 8, shape: 'box' },
          { id: 'PSP', label: 'Card network', x: 70, y: 56, shape: 'box' },
          { id: 'DB', label: 'Ledger DB', x: 90, y: 32, shape: 'box' }
        ];
        var edges = [['C', 'API'], ['API', 'C'], ['API', 'ST'], ['API', 'PSP'], ['PSP', 'DB']];
        function g(hl, ehl, tags) { return { type: 'graph', directed: true, height: 66, nodes: nodes, edges: edges, hl: hl, ehl: ehl, tags: tags || {} }; }
        function sm(hlKey, cls) {
          var e = Object.keys(store).map(function (k) { var s = store[k]; return [k, s.status + ' | ₹' + s.amt + (s.resp ? ' | ' + s.resp : '')]; });
          var h = {}; if (hlKey) h[hlKey] = cls;
          return { type: 'map', label: 'idempotency store (key → status | request | saved response)', entries: e, hl: h };
        }
        function lt(hlLast) { var h = {}; if (hlLast) h[ledger.length - 1] = 'ok'; return { type: 'table', label: 'ledger (actual charges)', columns: ['payment', 'key', 'amount'], rows: ledger.map(function (l) { return l.slice(); }), hl: h }; }
        frames.push({ narr: 'Each payment request carries an <code>Idempotency-Key</code> chosen by the client. The API checks the store <b>before</b> touching the card network. Watch the ledger: each key should charge <b>at most once</b>.', parts: [g({ API: 'cur' }, {}), sm(), lt()] });
        reqs.forEach(function (r, i) {
          var s = store[r.key], tag = 'POST ₹' + r.amt + ' key=' + r.key;
          if (!s) {
            store[r.key] = { status: 'IN_PROGRESS', amt: r.amt, resp: '' };
            frames.push({ narr: 'Request ' + (i + 1) + ': <code>' + tag + '</code>. Store lookup: <b>miss</b> — first time we see this key. Atomically insert it as <b>IN_PROGRESS</b> (a unique constraint guarantees only one request can win this insert).', parts: [g({ C: 'cur', ST: 'ok' }, { 'C-API': 'cur', 'API-ST': 'ok' }, { C: tag }), sm(r.key, 'ok'), lt()] });
            if (r.flag === '!') {
              frames.push({ narr: 'While the card is still being charged, a <b>duplicate</b> with the same key arrives (user double-tapped, or a proxy retried). Lookup finds <b>IN_PROGRESS</b> → reply <span class="c-r">409 Conflict</span> "still processing, retry later". Without this check both would charge.', parts: [g({ ST: 'bad', API: 'cur' }, { 'API-ST': 'bad', 'API-C': 'bad' }, { C: 'dup → 409' }), sm(r.key, 'bad'), lt()] });
            }
            pid++;
            var payId = 'pay_' + pid;
            ledger.push([payId, r.key, '₹' + r.amt]);
            store[r.key].status = 'COMPLETED';
            store[r.key].resp = '201 ' + payId;
            frames.push({ narr: 'Charge the card (₹' + r.amt + ') and, <b>in the same transaction</b>, write the ledger row and save the response <code>201 {id: ' + payId + '}</code> under the key, marking it <b>COMPLETED</b>.', parts: [g({ PSP: 'ok', DB: 'ok', ST: 'ok' }, { 'API-PSP': 'ok', 'PSP-DB': 'ok', 'API-ST': 'ok' }), sm(r.key, 'ok'), lt(true)] });
            if (r.flag === '*') {
              frames.push({ narr: '<span class="c-r">The reply is lost</span> on the way back (timeout / dropped connection). The client has no idea whether it was charged. The only safe move: <b>retry with the SAME key</b>.', parts: [g({ C: 'bad' }, { 'API-C': 'bad' }, { C: 'timeout ?' }), sm(r.key, 'cur'), lt()] });
            } else {
              frames.push({ narr: 'Client receives <span class="c-g">201 Created, id ' + payId + '</span>.', parts: [g({ C: 'ok' }, { 'API-C': 'ok' }, { C: '201 ' + payId }), sm(r.key, 'ok'), lt()] });
            }
          } else if (s.amt !== r.amt) {
            frames.push({ narr: 'Request ' + (i + 1) + ': <code>' + tag + '</code>. Key found, but the stored request was ₹' + s.amt + ' — <b>different body</b>. The client reused a key for a different operation (a bug). Reply <span class="c-r">422 Unprocessable</span>; never charge.', parts: [g({ ST: 'bad', C: 'bad' }, { 'C-API': 'cur', 'API-ST': 'bad', 'API-C': 'bad' }, { C: '422' }), sm(r.key, 'bad'), lt()] });
          } else {
            frames.push({ narr: 'Request ' + (i + 1) + ': <code>' + tag + '</code>. Key found, same request fingerprint, status COMPLETED → <span class="c-p">replay the saved response</span> <code>' + s.resp + '</code> with header <code>Idempotent-Replayed: true</code>. The card network is <b>not</b> called; the ledger does not change.', parts: [g({ ST: 'sel', C: 'ok', PSP: 'done', DB: 'done' }, { 'C-API': 'cur', 'API-ST': 'sel', 'API-C': 'ok' }, { C: 'replay ' + s.resp }), sm(r.key, 'sel'), lt()] });
          }
        });
        var keys = Object.keys(store).length;
        frames.push({ narr: 'Result: ' + reqs.length + ' requests, <b>' + ledger.length + ' charges</b> for ' + keys + ' distinct keys — every logical payment happened exactly once, even with lost replies, retries and duplicates.', parts: [sm(), lt(), { type: 'vars', vals: { requests: reqs.length, 'distinct keys': keys, charges: ledger.length }, hl: { charges: ledger.length === keys ? 'ok' : 'bad' } }] });
        return frames;
      }
    },
    examples: [
      { title: 'The double-charge timeline without a key', html: `${H.table(['time', 'client', 'server'], [
          ['0 ms', 'POST /payments ₹500', ''],
          ['40 ms', '', 'charges card → pay_71'],
          ['45 ms', '', 'sends 201 … connection resets'],
          ['5,000 ms', 'timeout! retries POST', ''],
          ['5,040 ms', '', H.c('r', 'charges card again → pay_72')]
        ])}<p>Customer is charged ₹1,000. With an idempotency key, the second POST finds the key and replays <code>pay_71</code>.</p>` },
      { title: 'Natural idempotency without a header', html: `<p>Sometimes you can design the operation to be idempotent: <code>PUT /v1/orders/ord_9001</code> with a client-generated id (repeating it just overwrites with the same data), "set balance-reservation for order X" instead of "add ₹500", or a DB unique constraint on <code>(order_id)</code> in the payments table so a second insert fails. Idempotency keys are the general tool when the client cannot pick the resource id.</p>`, code: { lang: 'sql', code: `CREATE TABLE charges (order_id TEXT PRIMARY KEY, amount INTEGER NOT NULL);
INSERT INTO charges(order_id, amount) VALUES ('ord_9001', 500) ON CONFLICT(order_id) DO NOTHING;
INSERT INTO charges(order_id, amount) VALUES ('ord_9001', 500) ON CONFLICT(order_id) DO NOTHING;
SELECT COUNT(*) AS charges_for_order FROM charges WHERE order_id = 'ord_9001';` } },
      { title: 'Idempotent message consumers', html: `<p>Kafka/SQS deliver <b>at least once</b>, so a consumer may see "OrderPaid #42" twice. Keep a <code>processed_events(event_id PRIMARY KEY)</code> table and insert into it in the same transaction as the side effect; a duplicate insert fails → skip. This is the consumer-side twin of the HTTP idempotency key, and together they give "effectively exactly-once".</p>` },
      { title: 'What should the client use as the key?', html: `<p>A random UUID (v4 or v7) generated when the user clicks "Pay", stored with the pending operation so app restarts reuse it. ${H.c('r', 'Not')} a hash of the body (two genuine ₹500 payments to the same shop would collide), ${H.c('r', 'not')} a new UUID per retry (defeats the purpose). Scope keys per account so two customers' keys never clash.</p>` }
    ],
    deepDive: `<p><b>The hard part is atomicity.</b> If the idempotency record lives in Redis but the payment in Postgres, a crash between "charge" and "save response" leaves the key IN_PROGRESS forever, and a retry can't tell whether to charge. Best: store the idempotency row in the <b>same database transaction</b> as the business write. When the side effect is external (card network), split the work into <b>recovery points</b> (Stripe's approach): record each completed phase on the key row (<code>started → charge_created → finished</code>); a retry resumes from the last recovery point. Pass your own idempotency key downstream too (most PSPs accept one) so the external call itself is safe to repeat.</p>
      <p><b>IN_PROGRESS locks need leases.</b> If the worker died, the key stays locked. Store <code>locked_at</code>; a retry after, say, 60 s may take over (with a fencing check) or run reconciliation against the PSP to discover whether the charge happened.</p>
      <p><b>What to store and for how long.</b> Store status code + body + relevant headers; replay exactly. Should you store 5xx responses? Usually no — let the retry actually retry. Store 4xx validation errors? Often yes (deterministic). TTL 24 h–7 days covers realistic retry windows; old keys are purged by a TTL index or partition drop.</p>
      <p><b>Request fingerprint.</b> Hash a canonical form of the body (sorted keys) plus method and path. Mismatch → 422. This catches client bugs that would otherwise silently return a response for a different request.</p>
      <p><b>Exactly-once is a myth; effectively-once is real.</b> Delivery across a network can't be exactly-once, but at-least-once delivery + idempotent processing produces exactly-once <i>effects</i>. The IETF draft "The Idempotency-Key HTTP Header Field" standardises the header; Stripe, Adyen, PayPal and AWS (<code>ClientToken</code>) all follow this pattern.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI agents retry aggressively and sometimes repeat a whole tool call when a step looks uncertain. Any tool that has side effects (send email, place order, transfer money, create ticket) must be idempotent or the agent will do it twice. Good agent tool design: require an idempotency key or a client-generated id, and return clear "already done" responses the model can understand.</p>
      <p><b>Use AI as a partner:</b> ask it to enumerate failure points: <code>List every place this payment handler can crash or time out and what state each leaves behind</code>. Then make it write a fault-injection test that kills the process at each point and retries.</p>
      <p><b>Where AI goes wrong:</b> check-then-insert without a unique constraint (race: two requests both see "miss"), storing the key in a cache with no durability, replaying cached 500 errors forever, hashing the body as the key, and claiming Kafka gives "exactly-once" end-to-end.</p>
      <p><b>What you must still own:</b> the atomicity boundary (what is in one transaction), the behaviour for in-flight duplicates, retention, and the reconciliation story with external systems.</p>`,
    problems: [{
      title: 'Make a payment POST idempotent',
      level: 'Hard', tags: ['idempotency', 'payments', 'consistency'], companies: ['Stripe', 'PayPal', 'Razorpay', 'Adyen'],
      statement: `<p>Design and implement <code>POST /v1/payments</code> so that retries (client timeouts, mobile network drops, gateway retries) never double-charge, concurrent duplicates are handled, and a crash at any point can be recovered.</p>`,
      constraints: `<p>5k payments/s; the card network call takes 200 ms–5 s and accepts its own idempotency key; keys retained 24 h; multi-instance API servers; Postgres as the system of record.</p>`,
      example: `<p>Client sends key K with ₹500 → 201 pay_71 (reply lost). Retry with K → ${H.c('p', '201 pay_71 replayed')}. Duplicate with K while the first is still processing → ${H.c('r', '409')}. K with ₹900 → ${H.c('r', '422')}.</p>`,
      brute: { why: `<p><b>Naive design:</b> check "have I seen this key?" in Redis, then charge, then write the key. Two concurrent retries both see "no" and both charge (race). If the server crashes after charging but before writing the key, the retry charges again. If the key is written first and the server crashes before charging, the retry replays nothing and the payment silently never happens.</p>`, code: { lang: 'python', code: `seen = {}

def naive_create_payment(key, amount, charge):
    if key in seen:                 # check ...
        return seen[key]
    result = charge(amount)         # ... then act: two concurrent calls both get here
    seen[key] = result              # crash before this line -> retry charges again
    return result` } },
      mcq: { q: 'Two requests with the same new key arrive within 1 ms on different servers. What guarantees only one charges?', options: ['An atomic insert of the key row protected by a UNIQUE constraint (the loser sees a conflict)', 'Checking the key in a local in-memory map', 'Sleeping a random time before charging', 'Asking the client not to do that'], answer: 0, explain: 'Only an atomic primitive shared by all servers (DB unique constraint, Redis SET NX) can decide a single winner.' },
      hints: [`<p>Hint 1: The first step must be an <b>atomic claim</b> of the key (INSERT with unique constraint), not a read.</p>`, `<p>Hint 2: Record progress (recovery points) on the key row; pass a derived idempotency key to the card network so even the external call can be repeated safely.</p>`, `<p>Hint 3: Cases: miss → claim + process; COMPLETED + same hash → replay; IN_PROGRESS → 409 (or wait); different hash → 422; stale IN_PROGRESS lease → resume/reconcile.</p>`],
      solution: {
        approach: `<p><b>Table</b> <code>idempotency_keys(account_id, key, request_hash, phase, locked_at, response_code, response_body, created_at, PRIMARY KEY(account_id, key))</code>.</p>
          <p><b>Flow:</b> (1) <code>INSERT … ON CONFLICT DO NOTHING</code>; if inserted → we own it (phase=started, locked_at=now). If not → read row: hash mismatch → 422; COMPLETED → replay; IN_PROGRESS and lease fresh → 409; lease stale → take over and resume from <code>phase</code>. (2) In one transaction create the <code>payments</code> row (status=pending) and set phase=payment_created. (3) Call the card network with idempotency key <code>account:key</code> — repeating it returns the same charge. (4) In one transaction update payment status, write ledger entries, store response, phase=finished. (5) Return response. A background reconciler sweeps stale keys and queries the card network for the truth.</p>`,
        code: { lang: 'java', code: `import java.util.*;
import java.util.concurrent.*;
import java.util.function.*;

public class IdempotentPayments {
    enum Status { IN_PROGRESS, COMPLETED }
    static final class Entry {
        final String requestHash; volatile Status status = Status.IN_PROGRESS; volatile String response;
        Entry(String h) { requestHash = h; }
    }
    // stands in for a DB table with PRIMARY KEY(account, key); putIfAbsent = atomic INSERT
    private final ConcurrentHashMap<String, Entry> store = new ConcurrentHashMap<>();
    private final List<String> ledger = Collections.synchronizedList(new ArrayList<>());

    String createPayment(String account, String key, long amount, Function<Long, String> cardNetwork) {
        String hash = Integer.toHexString(Objects.hash(amount));      // real code: SHA-256 of canonical body
        Entry mine = new Entry(hash);
        Entry existing = store.putIfAbsent(account + ":" + key, mine);
        if (existing != null) {
            if (!existing.requestHash.equals(hash)) return "422 key reused with different body";
            if (existing.status == Status.IN_PROGRESS) return "409 still processing";
            return existing.response + " (replayed)";
        }
        String chargeId = cardNetwork.apply(amount);   // downstream call also gets an idempotency key in real life
        ledger.add(chargeId + " " + amount);
        mine.response = "201 " + chargeId;
        mine.status = Status.COMPLETED;                // publish after response is set
        return mine.response;
    }

    public static void main(String[] args) throws Exception {
        IdempotentPayments api = new IdempotentPayments();
        int[] seq = {70};
        Function<Long, String> card = amt -> "pay_" + (++seq[0]);
        System.out.println(api.createPayment("acct1", "k1", 500, card));
        System.out.println(api.createPayment("acct1", "k1", 500, card));
        System.out.println(api.createPayment("acct1", "k1", 900, card));
        // 8 concurrent duplicates of a new key: exactly one charge
        ExecutorService pool = Executors.newFixedThreadPool(8);
        List<Future<String>> fs = new ArrayList<>();
        for (int i = 0; i < 8; i++) fs.add(pool.submit(() -> api.createPayment("acct1", "k2", 200, card)));
        for (Future<String> f : fs) System.out.println("  concurrent -> " + f.get());
        pool.shutdown();
        System.out.println("ledger = " + api.ledger);
    }
}` },
        complexity: `<p>Extra cost per payment: one indexed insert + one update on the key row (~1–2 ms). Storage: ~1 KB × 5k/s × 86,400 s ≈ 430 GB/day of key rows at 24 h retention — partition by day and drop old partitions (or store only hash + compact response).</p>`,
        followUps: ['Should a cached 500 response be replayed?', 'How does the client persist the key across an app restart?', 'How would you handle the same key arriving at two regions?']
      }
    }]
  });

registerModule({ id: 'hld09', title: 'x', intro: 'x', goals: [], prereqs: 'x', hours: 1, topics: topics, practice: practice, quiz: quiz, interview: interview }); })();
