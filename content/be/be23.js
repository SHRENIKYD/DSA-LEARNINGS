(function () {
var topics = [], practice = [], quiz = [], interview = [];

/* Shared helper: turn a list of steps into graph frames.
   step = { e: 'u-v' edge to light up (or null), n: node id to highlight, narr: html, tags: {id: text}, extra: [parts] } */
function flowFrames(label, nodes, edges, steps) {
  return steps.map(function (s) {
    var hl = {}, ehl = {};
    if (s.n) hl[s.n] = s.bad ? 'bad' : 'cur';
    if (s.e) ehl[s.e] = s.bad ? 'bad' : 'ok';
    var parts = [{ type: 'graph', label: label, directed: true, height: 60, nodes: nodes, edges: edges, hl: hl, ehl: ehl, tags: s.tags || {} }];
    (s.extra || []).forEach(function (p) { parts.push(p); });
    return { narr: s.narr, parts: parts };
  });
}

/* =====================================================================
   TOPIC 1 — Choosing an API style
   ===================================================================== */
topics.push({
  title: 'Choosing an API Style: REST, GraphQL, gRPC, WebSockets or SSE',
  analogy: `<p>Think of ways to get food. <b>REST</b> is a set menu at a counter: each counter (URL) sells one dish, cheap to run and easy for everyone. <b>GraphQL</b> is a buffet where you fill one plate with exactly what you want. <b>gRPC</b> is a kitchen-to-kitchen dumbwaiter between two restaurants of the same chain: fast and strict, but outsiders cannot use it. <b>WebSockets</b> is a phone line kept open both ways, and <b>SSE</b> is a radio station: the server talks, you listen.</p>`,
  explain: `<p>🟢 <b>The big idea.</b> No API style is "best". Each one is a trade-off between <b>who calls you</b> (browsers, mobile apps, other services, partners), <b>how data flows</b> (one request one reply, or a stream), and <b>what tooling you get</b> (HTTP caching, code generation, schemas). Module 4 covered REST in depth; here we learn the other three and when they win.</p>
  ${H.table(['Style', 'Transport', 'Payload', 'Shines when', 'Hurts when'], [
    ['REST', 'HTTP/1.1 or 2', 'JSON (text)', 'public APIs, CDN caching, simple CRUD', 'clients need many round trips or over-fetch'],
    ['GraphQL', 'usually HTTP POST', 'JSON', 'many different UIs need different shapes of the same graph', 'HTTP caching, rate limiting by cost, N+1'],
    ['gRPC', 'HTTP/2 only', 'Protocol Buffers (binary)', 'service-to-service, low latency, streaming, strict contracts', 'browsers (need gRPC-Web proxy), human debugging'],
    ['WebSockets', 'HTTP/1.1 Upgrade → TCP frames', 'anything', 'chat, games, collaborative editing (both sides talk)', 'stateful connections are hard to scale and load-balance'],
    ['SSE', 'plain HTTP response that never ends', 'UTF-8 text events', 'server → client feeds: notifications, LLM token streams, live scores', 'client → server messages (use normal POSTs)']
  ])}
  <p><b>Three questions decide most cases.</b> (1) <i>Who is the client?</i> Third parties and browsers → REST or GraphQL. Your own back-end services → gRPC. (2) <i>Who speaks first and how often?</i> Only the client asks → request/response. Server pushes → SSE. Both push often → WebSockets. (3) <i>How varied are the read shapes?</i> One or two screens → REST. Ten screens and three apps over one data graph → GraphQL.</p>
  <p><b>Mixing is normal.</b> A typical 2026 company exposes REST (or GraphQL) at the edge, uses gRPC inside, and SSE or WebSockets for live features. A <b>BFF</b> (backend-for-frontend) or GraphQL gateway often translates between them.</p>`,
  clues: [
    '"Mobile app makes 6 calls to render one screen" → over-/under-fetching: GraphQL or a BFF',
    '"Internal microservices, p99 latency matters, polyglot teams" → gRPC with protobuf contracts',
    '"Live chat / multiplayer / collaborative doc" → WebSockets (bidirectional, low latency)',
    '"Notifications, live dashboard, stream LLM tokens to the browser" → SSE (one-way, auto-reconnect, plain HTTP)',
    '"Public API for partners, must be cacheable at the CDN" → REST with Cache-Control/ETag',
    '"Browser needs to call a gRPC service" → gRPC-Web or Connect through a proxy, or a REST/JSON transcoding gateway'
  ],
  code: { lang: 'js', run: true, code: `// A tiny decision helper: encodes the rules of thumb from this topic.
function pickStyle(req) {
  const out = [];
  if (req.serverPush && req.clientPushOften) out.push('WebSockets (both sides talk often)');
  else if (req.serverPush) out.push('SSE (server -> client stream over plain HTTP)');
  if (req.callers === 'internal') out.push('gRPC (binary, typed contracts, HTTP/2 streams)');
  else if (req.distinctReadShapes > 3) out.push('GraphQL (clients pick fields; one endpoint)');
  else out.push('REST (simple, cacheable, universal)');
  return out;
}

const cases = {
  'chat app': { callers: 'public', serverPush: true, clientPushOften: true, distinctReadShapes: 2 },
  'order service -> payment service': { callers: 'internal', serverPush: false, distinctReadShapes: 1 },
  'shop with web + iOS + Android + TV': { callers: 'public', serverPush: false, distinctReadShapes: 8 },
  'stock ticker page': { callers: 'public', serverPush: true, clientPushOften: false, distinctReadShapes: 1 }
};
for (const [name, req] of Object.entries(cases)) console.log(name.padEnd(36), '=>', pickStyle(req).join(' + '));` },
  codeTitle: 'Rules of thumb as code (runnable JS)',
  viz: {
    title: 'Same screen, three styles: count the round trips',
    input: 'rest',
    inputLabel: 'Style: rest, graphql or grpc',
    gen: function (input) {
      var s = String(input || 'rest').trim().toLowerCase();
      var nodes = [
        { id: 'app', label: 'Mobile app', x: 10, y: 30, shape: 'box' },
        { id: 'api', label: s === 'grpc' ? 'BFF (REST)' : (s === 'graphql' ? 'GraphQL server' : 'REST API'), x: 45, y: 30, shape: 'box' },
        { id: 'users', label: 'users svc', x: 85, y: 8, shape: 'box' },
        { id: 'orders', label: 'orders svc', x: 85, y: 30, shape: 'box' },
        { id: 'recs', label: 'recs svc', x: 85, y: 52, shape: 'box' }
      ];
      var edges = [['app', 'api'], ['api', 'users'], ['api', 'orders'], ['api', 'recs']];
      var steps;
      if (s === 'rest') {
        steps = [
          { n: 'app', narr: 'The profile screen needs the user, their last 3 orders and recommendations. With plain REST each is its own resource.', tags: { app: 'trips: 0' } },
          { e: 'app-api', n: 'users', narr: 'Trip 1: <code>GET /users/7</code> returns <b>40 fields</b>; the screen shows 3. That waste is <b>over-fetching</b>.', tags: { app: 'trips: 1' } },
          { e: 'app-api', n: 'orders', narr: 'Trip 2: <code>GET /users/7/orders?limit=3</code>. We could not ask for it in trip 1: that is <b>under-fetching</b>.', tags: { app: 'trips: 2' } },
          { e: 'app-api', n: 'recs', narr: 'Trip 3: <code>GET /users/7/recommendations</code>. On a 300 ms mobile network that is about 900 ms of waiting if done in sequence.', tags: { app: 'trips: 3' } },
          { n: 'app', narr: 'REST is still fine here if one team owns one screen: add a tailored endpoint or a BFF. It keeps HTTP caching for free.', tags: { app: '3 trips, cacheable' } }
        ];
      } else if (s === 'graphql') {
        steps = [
          { n: 'app', narr: 'The app sends <b>one</b> query naming exactly the fields it shows: <code>{ user(id:7){ name orders(first:3){ total } recs{ title } } }</code>.', tags: { app: 'trips: 0' } },
          { e: 'app-api', n: 'api', narr: 'One POST to <code>/graphql</code>. The server validates the query against its schema before running anything.', tags: { app: 'trips: 1' } },
          { e: 'api-users', n: 'users', narr: 'The <code>user</code> resolver fetches the user. Only <code>name</code> goes back to the client.' },
          { e: 'api-orders', n: 'orders', narr: 'The <code>orders</code> resolver runs with the user as its parent. Server-side calls are on a fast data-centre network.' },
          { e: 'api-recs', n: 'recs', narr: 'The <code>recs</code> resolver runs in parallel with orders. The fan-out moved from the phone to the server.' },
          { n: 'app', narr: 'One round trip, exact shape. The price: POST bodies are not cached by CDNs by default, and the server must guard against expensive queries.', tags: { app: '1 trip, exact fields' } }
        ];
      } else if (s === 'grpc') {
        steps = [
          { n: 'app', narr: 'Phones talk REST/JSON to a BFF. Inside the data centre, the BFF talks <b>gRPC</b> to each service.', tags: { app: 'trips: 0' } },
          { e: 'app-api', n: 'api', narr: 'One HTTP call from the phone to <code>GET /screens/profile</code>, shaped for this screen.', tags: { app: 'trips: 1' } },
          { e: 'api-users', n: 'users', narr: '<code>Users.GetUser</code> over one shared HTTP/2 connection. Protobuf body is a few dozen bytes; no JSON parsing.' },
          { e: 'api-orders', n: 'orders', narr: '<code>Orders.ListOrders</code> runs on the same connection as a separate <b>stream</b> (HTTP/2 multiplexing), with a deadline propagated from the BFF.' },
          { e: 'api-recs', n: 'recs', narr: '<code>Recs.Get</code> also runs in parallel. Each stub was generated from a <code>.proto</code> file, so field names cannot be misspelled.' },
          { n: 'api', narr: 'Edge stays simple and public; the inside is fast and strongly typed. This "REST at the edge, gRPC inside" split is the most common pattern.', tags: { app: '1 trip', api: 'gRPC fan-out' } }
        ];
      } else throw new Error('Type rest, graphql or grpc');
      return flowFrames('Profile screen data flow (' + s + ')', nodes, edges, steps);
    }
  },
  examples: [
    { title: 'Ride-hailing app', html: `<p>Rider app ↔ backend: REST/GraphQL for booking, <b>WebSockets</b> (or MQTT) for driver location updates every 2 s, both directions. Dispatch ↔ pricing ↔ maps services: <b>gRPC</b> with tight deadlines. Receipts emailed: async queue. Four styles, each for a reason.</p>` },
    { title: 'Admin dashboard with live order counter', html: `<p>Data tables use REST. The live counter only flows server → browser, so <b>SSE</b> is enough: one <code>EventSource</code> line in the browser, auto-reconnect built in, works through most proxies, no special server library. WebSockets would add complexity for no gain.</p>` },
    { title: 'GitHub and Shopify', html: `<p>Both offer a <b>GraphQL</b> API because their integrators need wildly different slices of a huge object graph (repos, issues, PRs, users). Both still keep REST endpoints and webhooks, and both rate-limit GraphQL by <b>query cost points</b> rather than request count.</p>` }
  ],
  deepDive: `<p>🟣 <b>What really differs underneath.</b> REST and GraphQL are <i>conventions on top of HTTP</i>; gRPC is a <i>framework</i> with a binary format, code generation, HTTP/2 framing and trailers for status codes. WebSocket is a <i>separate protocol</i> that starts as an HTTP/1.1 request with <code>Upgrade: websocket</code> and returns <code>101 Switching Protocols</code>; after that it is framed messages over the raw TCP connection (RFC 8441 also allows WebSockets over HTTP/2 streams). SSE is just a long HTTP response with <code>Content-Type: text/event-stream</code>.</p>
  <p><b>Caching:</b> REST GETs are cached by browsers and CDNs. GraphQL can get the same with <i>persisted queries sent as GET</i> (a hash instead of the query text), plus client normalized caches (Apollo, Relay, urql). gRPC has no HTTP caching story; you cache in the service. <b>Errors:</b> REST uses status codes; GraphQL usually returns 200 with an <code>errors</code> array (partial success is possible); gRPC uses its own codes (<code>NOT_FOUND</code>, <code>DEADLINE_EXCEEDED</code>, <code>UNAVAILABLE</code>...). <b>Load balancing:</b> gRPC keeps long-lived HTTP/2 connections, so an L4 balancer pins all requests to one backend; use an L7 proxy (Envoy) or client-side balancing. WebSockets have the same stickiness problem, at much larger connection counts.</p>`,
  aiEra: `<p>🤖 <b>AI changes the client mix.</b> LLM agents now call APIs as tools. They do best with <b>self-describing</b> contracts: an OpenAPI spec, a GraphQL schema with descriptions, or an MCP server wrapping either. GraphQL's introspection lets an agent discover fields, but also lets it write huge queries, so cost limits matter more. Streaming model output to browsers made <b>SSE</b> popular again: most LLM APIs stream tokens as <code>text/event-stream</code>.</p>
  <p><b>Work with AI:</b> describe callers, traffic shape and latency targets and ask the assistant for a comparison table with risks. Then check its claims: assistants often say "gRPC works in browsers" (only via gRPC-Web/Connect) or "WebSockets are always faster" (not for one-way feeds). The decision and its trade-offs stay yours to defend in the design review.</p>`,
  problems: [
    {
      title: 'Pick the Style for Four Features',
      level: 'Easy', tags: ['api styles', 'trade-offs'], companies: ['Uber', 'Swiggy'],
      statement: `<p>A food-delivery company is building: (1) a partner API for restaurants to update menus; (2) the courier location dot moving on the customer's map; (3) the call from the order service to the payment service; (4) a support-agent chat with customers. Pick a style for each and give one reason.</p>`,
      constraints: `One style per feature; say who calls and which way data flows.`,
      example: `<p>(2) ${H.c('g', 'SSE')}: the customer only <i>listens</i> to location updates; no need for a two-way socket. ${H.c('r', 'Polling every second')} wastes requests when nothing moved.</p>`,
      brute: { why: `<p>"Use GraphQL for everything" or "REST for everything" ignores direction of data flow and caller type. Polling REST for live data multiplies load and adds latency up to the poll interval.</p>` },
      mcq: { q: 'Which feature most clearly needs WebSockets rather than SSE?', options: ['Live order status', 'Agent-customer chat with typing indicators', 'Menu updates by partners', 'Payment call'], answer: 1, explain: 'Chat has frequent messages in both directions, including tiny typing signals.' },
      hints: [
        `<p>For each feature ask: who is the caller (partner, browser, internal service) and who sends data (one side or both)?</p>`,
        `<p>Partners want stable, documented, cacheable contracts. Internal hops want speed and typed contracts.</p>`,
        `<p>Recipe: partner menu → REST; courier dot → SSE (or WebSocket if the app already has one); order→payment → gRPC with a deadline and idempotency key; chat → WebSockets.</p>`
      ],
      solution: {
        approach: `<p>(1) <b>REST</b> with OpenAPI: external partners, easy to test with curl, versioned, idempotent PUTs for menu items. (2) <b>SSE</b>: server pushes positions every few seconds, browser auto-reconnects with <code>Last-Event-ID</code>; WebSockets also work but add bidirectional machinery we do not need. (3) <b>gRPC</b>: internal, latency-sensitive, strict schema shared by both teams; set a deadline (e.g. 800 ms) and pass an idempotency key so retries cannot double charge. (4) <b>WebSockets</b>: both parties send messages and typing signals often; one persistent connection beats a POST per keystroke.</p>`,
        complexity: `<p>Design choice. The measurable outcome is fewer requests (no polling) and lower tail latency on internal hops.</p>`,
        followUps: ['What changes if the courier app is offline half the time?', 'How do you expose the gRPC payment API to an external partner later?']
      }
    }
  ]
});

/* =====================================================================
   TOPIC 2 — GraphQL schema, queries and resolvers
   ===================================================================== */
topics.push({
  title: 'GraphQL Basics: Schema, Queries, Mutations and Resolvers',
  analogy: `<p>A GraphQL schema is a <b>restaurant menu with a strict order form</b>. The menu lists every dish and its options (types and fields). You tick exactly what you want on the form (the query). In the kitchen each dish has its own cook (a resolver); the head chef walks your form top to bottom and asks each cook for their part, then plates it in exactly the shape you ticked.</p>`,
  explain: `<p>🟢 <b>Schema first.</b> A GraphQL API is described by a <b>schema</b> written in SDL (Schema Definition Language). It lists <b>types</b> with <b>fields</b>, and three special root types: <code>Query</code> (reads), <code>Mutation</code> (writes) and <code>Subscription</code> (live events). <code>String!</code> means non-null; <code>[Post!]!</code> means a non-null list of non-null posts.</p>
  <p><b>Queries pick fields.</b> The client sends a document like <code>{ user(id: "7") { name posts { title } } }</code>. The response JSON has <i>exactly</i> that shape: <code>{"data":{"user":{"name":"Asha","posts":[{"title":"Hi"}]}}}</code>. No extra fields, no missing ones.</p>
  <p><b>Resolvers fill fields.</b> Every field can have a resolver function <code>(parent, args, context, info) → value</code>. The engine starts at the root, calls <code>Query.user</code>, then for the returned user calls <code>User.posts</code> with that user as <code>parent</code>, and so on down the tree. Fields without a custom resolver just read <code>parent[fieldName]</code> (the default resolver).</p>
  ${H.table(['Step', 'What the server does'], [
    ['1. Parse', 'text → AST (syntax errors stop here)'],
    ['2. Validate', 'every field exists, args have right types, fragments are valid'],
    ['3. Execute', 'walk the selection set, call resolvers, await promises (sibling fields can run in parallel; mutation root fields run in order)'],
    ['4. Respond', '<code>{ data, errors? }</code>; a failing field becomes null + an error entry, siblings still return']
  ])}
  <p><b>Mutations</b> are fields on <code>Mutation</code> that change data, e.g. <code>createPost(input: CreatePostInput!): CreatePostPayload!</code>. Convention: one <code>input</code> object argument and a payload type that returns the changed object plus user errors.</p>`,
  clues: [
    '"Clients need different fields on different screens" → GraphQL selection sets',
    '"How does GraphQL know how to get <code>user.posts</code>?" → field resolvers with <code>parent</code>',
    '"Partial failure" → GraphQL returns <code>data</code> with nulls plus an <code>errors</code> array, often with HTTP 200',
    '"Schema-first vs code-first" → SDL file vs types generated from code (both end in the same schema)',
    '"Why are mutations executed serially?" → spec: top-level mutation fields run one after another so order is predictable',
    '"Federation / supergraph" → many services each own part of one GraphQL schema behind a router'
  ],
  code: [
    { lang: 'text', check: false, title: 'schema.graphql (SDL)', code: `type Query {
  user(id: ID!): User
  posts(first: Int = 10, after: String): PostConnection!
}

type Mutation {
  createPost(input: CreatePostInput!): CreatePostPayload!
}

type User {
  id: ID!
  name: String!
  posts: [Post!]!          # resolved by User.posts(parent)
}

type Post {
  id: ID!
  title: String!
  author: User!            # resolved by Post.author(parent)
}

input CreatePostInput { title: String!, body: String! }
type CreatePostPayload { post: Post, userErrors: [UserError!]! }
type UserError { field: String, message: String! }` },
    { lang: 'js', run: true, code: `// A tiny GraphQL-style executor: walks a selection tree and calls resolvers.
// Query (as a plain object instead of text): { user(id:1) { name posts { title } } }
const db = {
  users: [{ id: 1, name: 'Asha', email: 'a@x.io' }, { id: 2, name: 'Ben', email: 'b@x.io' }],
  posts: [{ id: 10, title: 'Hello', authorId: 1 }, { id: 11, title: 'GraphQL tips', authorId: 1 }]
};
const resolvers = {
  Query: { user: (_p, args) => db.users.find(u => u.id === args.id) },
  User: { posts: (user) => db.posts.filter(p => p.authorId === user.id) },
  Post: {}   // no custom resolvers: default resolver reads parent[field]
};
const typeOf = { 'Query.user': 'User', 'User.posts': 'Post' };

function execute(type, parent, selection) {
  const out = {};
  for (const [field, sub] of Object.entries(selection)) {
    const fn = (resolvers[type] || {})[field];
    const value = fn ? fn(parent, sub.args || {}) : parent[field];  // default resolver
    const childType = typeOf[type + '.' + field];
    if (!sub.fields) out[field] = value;                  // leaf (scalar)
    else if (value == null) out[field] = null;
    else if (Array.isArray(value)) out[field] = value.map(v => execute(childType, v, sub.fields));
    else out[field] = execute(childType, value, sub.fields);
  }
  return out;
}

const query = { user: { args: { id: 1 }, fields: { name: {}, posts: { fields: { title: {} } } } } };
console.log(JSON.stringify({ data: execute('Query', null, query) }));
// note: email was never sent - the client did not ask for it` }
  ],
  codeTitle: ['GraphQL schema (SDL, not executed)', 'Mini executor with resolvers (runnable JS)'],
  viz: {
    title: 'Watch the executor walk the query tree',
    input: 'name,posts.title,posts.author.name',
    inputLabel: 'Fields under user(id:1), comma separated (paths with dots)',
    gen: function (input) {
      var paths = String(input || '').split(',').map(function (x) { return x.trim(); }).filter(Boolean);
      var allowed = ['id', 'name', 'email', 'posts', 'posts.id', 'posts.title', 'posts.author', 'posts.author.name', 'posts.author.id'];
      if (!paths.length || paths.length > 6) throw new Error('Give 1-6 fields, e.g. name,posts.title');
      paths.forEach(function (p) { if (allowed.indexOf(p) < 0) throw new Error('Unknown field "' + p + '". Try: ' + allowed.join(', ')); });
      var frames = [], log = [], calls = 0;
      function snap(narr, cur) {
        frames.push({ narr: narr, parts: [
          { type: 'code', label: 'Query document', lang: 'text', code: '{ user(id: 1) {\n  ' + paths.join('\n  ') + '\n} }', hl: cur ? (function () { var h = {}; h[cur] = 'cur'; return h; })() : {} },
          { type: 'table', label: 'Resolver calls so far', columns: ['#', 'field', 'parent', 'result'], rows: log.map(function (r) { return r.slice(0, 4); }) },
          { type: 'vars', label: 'Counters', vals: { resolverCalls: calls, dbQueries: log.filter(function (r) { return r[4]; }).length } }
        ] });
      }
      snap('The server parsed and <b>validated</b> the query against the schema. Every field exists, so execution can start at <code>Query</code>.', 0);
      calls++; log.push([calls, 'Query.user', 'root', '{id:1, name:"Asha", ...}', true]);
      snap('Call <code>Query.user(id:1)</code>. It hits the database and returns the whole user row. The client will only see the fields it asked for.', 1);
      paths.forEach(function (p, i) {
        var line = i + 2;
        if (p === 'posts' || p.indexOf('posts') === 0) {
          if (!log.some(function (r) { return r[1] === 'User.posts'; })) {
            calls++; log.push([calls, 'User.posts', 'user 1', '[post 10, post 11]', true]);
            snap('<code>posts</code> has a custom resolver <code>User.posts(parent)</code>. It receives the user as <code>parent</code> and loads their 2 posts (one DB query).', line);
          }
          if (p.indexOf('posts.author') === 0 && !log.some(function (r) { return r[1] === 'Post.author'; })) {
            calls += 2; log.push([calls - 1, 'Post.author', 'post 10', 'user 1', true]); log.push([calls, 'Post.author', 'post 11', 'user 1', true]);
            snap('<code>author</code> runs <b>once per post</b>: two calls, two DB lookups of the same user. This is the seed of the <b>N+1 problem</b> (next topic).', line);
          }
          if (/title$|\.id$|name$/.test(p)) {
            calls++; log.push([calls, p.split('.').slice(-1)[0] + ' (default)', 'each object', 'read parent field', false]);
            snap('<code>' + p + '</code> is a scalar with the <b>default resolver</b>: it just reads <code>parent.' + p.split('.').slice(-1)[0] + '</code>. No I/O.', line);
          }
        } else {
          calls++; log.push([calls, 'User.' + p + ' (default)', 'user 1', 'read parent.' + p, false]);
          snap('<code>' + p + '</code> is a scalar on User: default resolver, free.', line);
        }
      });
      snap('Done. The engine assembles <code>{"data": {...}}</code> in exactly the requested shape. Fields not asked for (like <code>email</code>) never leave the server.', 0);
      return frames;
    }
  },
  examples: [
    { title: 'Same schema, two screens', html: `<p>List screen: <code>{ posts(first: 20) { edges { node { id title } } } }</code>. Detail screen: <code>{ post(id: "10") { title body author { name avatarUrl } } }</code>. No new endpoint needed for either; the backend team does not even know the detail screen was added.</p>` },
    { title: 'Partial failure', html: `<p>The recommendations service is down. Response: <code>{"data":{"user":{"name":"Asha","recs":null}},"errors":[{"message":"recs unavailable","path":["user","recs"]}]}</code>. The page renders with an empty recommendations box instead of failing completely. This only works if <code>recs</code> is <b>nullable</b>; a null in a non-null field bubbles up to the nearest nullable parent.</p>` },
    { title: 'A mutation with user errors', html: `<p><code>mutation { createPost(input:{title:"", body:"x"}) { post { id } userErrors { field message } } }</code> returns <code>{"post": null, "userErrors":[{"field":"title","message":"must not be empty"}]}</code>. Business validation goes in the payload; the top-level <code>errors</code> array is for system failures.</p>`, code: { lang: 'text', check: false, code: `mutation CreatePost($in: CreatePostInput!) {
  createPost(input: $in) {
    post { id title }
    userErrors { field message }
  }
}
# variables: { "in": { "title": "", "body": "x" } }` } }
  ],
  deepDive: `<p>🟣 <b>Execution details that matter.</b> The spec runs sibling fields of a query in any order (implementations run async resolvers concurrently), but the top-level fields of a <b>mutation</b> run serially. <b>Null propagation:</b> if a non-null field resolves to null or throws, the null bubbles up to the nearest nullable ancestor, possibly wiping a large part of the response, so make fields that depend on flaky services nullable. <b>Context</b> is created per request and carries the authenticated user, DataLoaders and DB handles; never store request data in module-level variables.</p>
  <p><b>Transport:</b> the GraphQL-over-HTTP spec uses POST with JSON <code>{query, variables, operationName}</code>; GET is allowed for queries (useful for caching), never for mutations. Responses typically use status 200 even with field errors; newer servers use the <code>application/graphql-response+json</code> media type, which allows non-200 codes when the request could not be executed at all. <b>Federation</b> (Apollo Federation, GraphQL Fusion/composite schemas) composes several service subgraphs into one supergraph; a router plans which subgraph resolves which field.</p>`,
  aiEra: `<p>🤖 <b>Schema as a prompt.</b> A GraphQL schema with good <code>"""descriptions"""</code> is a near-perfect tool spec for an AI agent: typed, discoverable and narrow. Teams expose a curated GraphQL schema (or a set of persisted operations) to agents instead of raw database access.</p>
  <p><b>Work with AI:</b> assistants are great at generating SDL from a domain description and resolvers from SDL. Review three things they often miss: nullability (they make everything <code>!</code>, which turns one failing field into a blank page), per-field authorization (they check auth only on the root), and the N+1 pattern in nested resolvers. Ask for a test that counts DB calls for a nested query.</p>`
});

/* =====================================================================
   TOPIC 3 — N+1 and DataLoader
   ===================================================================== */
topics.push({
  title: 'The GraphQL N+1 Problem and DataLoader Batching',
  analogy: `<p>A teacher has to collect 30 permission slips from 30 parents. The slow way: walk to each house, one trip per student (<b>N</b> trips, after the <b>1</b> trip to fetch the class list). The smart way: wait until the end of the school day, put all 30 names on <b>one</b> letter, and post it once. DataLoader is that teacher: it collects every "please load X" made during one tick, then sends a single batched request.</p>`,
  explain: `<p>🟢 <b>Where N+1 comes from.</b> Resolvers are written per field, per object. For <code>{ posts(first: 50) { title author { name } } }</code>, <code>Query.posts</code> runs 1 query for 50 posts, then <code>Post.author</code> runs <b>once per post</b>: 50 more queries. Total: <b>1 + N = 51</b>. Nest one more level (each author's followers) and it multiplies.</p>
  <p><b>DataLoader fixes it with two tricks.</b></p>
  <ul>
    <li><b>Batching:</b> <code>loader.load(id)</code> does not query right away; it returns a promise and remembers the id. After the current tick (when all sibling resolvers have asked), it calls your <code>batchFn(ids)</code> <b>once</b>, e.g. <code>SELECT * FROM users WHERE id IN (...)</code>.</li>
    <li><b>Caching (per request):</b> asking twice for user 7 returns the same promise; only one key goes to the batch.</li>
  </ul>
  ${H.table(['', 'Naive resolvers', 'With DataLoader'], [
    ['50 posts, 12 distinct authors', '1 + 50 = <span class="c-r">51 queries</span>', '1 + 1 = <span class="c-g">2 queries</span> (IN of 12 ids)'],
    ['plus each author\'s company', '+12..50 more', '+1 query']
  ])}
  <p><b>The batch function contract:</b> given keys <code>[k1, k2, k3]</code>, return an array of the <b>same length, same order</b>, with <code>null</code> (or an Error) for missing keys. The database returns rows in any order, so you must re-order them by key. Getting this wrong silently gives users each other's data.</p>
  <p><b>Scope:</b> create new loaders <b>per request</b> (in the context). A global loader would cache across users, leaking data and serving stale values.</p>`,
  clues: [
    '"GraphQL is slow on nested lists" / "DB gets hundreds of queries per request" → N+1; add DataLoader',
    '"Batch function must return results in key order" → classic interview detail',
    '"Why is the DataLoader created per request?" → cache isolation, authorization, freshness',
    '"How does it know when to send the batch?" → it schedules dispatch after the current tick / microtask queue drains',
    '"Same N+1 in REST/ORMs?" → yes: lazy loading in JPA/Hibernate; fix with JOIN FETCH, entity graphs or batch fetching',
    '"Look-ahead / query planning" → alternative: inspect the selection set (info) and JOIN up front'
  ],
  code: { lang: 'js', run: true, code: `// N+1 vs DataLoader, measured by counting "SQL" calls.
const users = { 1: 'Asha', 2: 'Ben', 3: 'Chen' };
const posts = Array.from({ length: 8 }, (_, i) => ({ id: i + 1, authorId: (i % 3) + 1 }));
let sqlCalls = 0;
const sql = {
  userById: async (id) => { sqlCalls++; return { id, name: users[id] }; },
  usersByIds: async (ids) => {           // rows may come back in ANY order
    sqlCalls++;
    return ids.slice().reverse().map(id => ({ id, name: users[id] }));
  }
};

// A minimal DataLoader: batch keys within one tick + per-request cache
class DataLoader {
  constructor(batchFn) { this.batchFn = batchFn; this.cache = new Map(); this.queue = []; }
  load(key) {
    if (this.cache.has(key)) return this.cache.get(key);   // dedupe
    const p = new Promise((resolve, reject) => {
      this.queue.push({ key, resolve, reject });
      if (this.queue.length === 1) process.nextTick(() => this.dispatch()); // after current tick
    });
    this.cache.set(key, p);
    return p;
  }
  async dispatch() {
    const batch = this.queue; this.queue = [];
    try {
      const values = await this.batchFn(batch.map(b => b.key));
      if (values.length !== batch.length) throw new Error('batchFn must return one value per key');
      batch.forEach((b, i) => b.resolve(values[i]));
    } catch (e) { batch.forEach(b => b.reject(e)); }
  }
}

async function run(label, authorOf) {
  sqlCalls = 1;                                  // the 1 query that loaded the posts
  const names = await Promise.all(posts.map(p => authorOf(p).then(u => u.name)));
  console.log(label.padEnd(12), 'queries =', sqlCalls, '|', names.join(','));
}

(async () => {
  await run('naive', (post) => sql.userById(post.authorId));
  const loader = new DataLoader(async (ids) => {
    const rows = await sql.usersByIds(ids);
    const byId = new Map(rows.map(r => [r.id, r]));
    return ids.map(id => byId.get(id) || null);  // SAME order as keys
  });
  await run('dataloader', (post) => loader.load(post.authorId));
})();` },
  codeTitle: 'Naive N+1 vs a hand-written DataLoader (runnable JS)',
  viz: {
    title: 'Batching author lookups for a list of posts',
    input: '1,2,1,3,2,1',
    inputLabel: 'Author id of each post (2-10 numbers)',
    gen: function (input) {
      var ids = String(input || '').split(/[\s,]+/).filter(Boolean).map(Number);
      if (ids.length < 2 || ids.length > 10 || ids.some(function (x) { return !(x >= 1 && x <= 99) || Math.floor(x) !== x; })) throw new Error('Type 2-10 author ids (1-99), e.g. 1,2,1,3');
      var frames = [], queue = [], cache = [];
      function snap(narr, hlI, q1, q2) {
        var h = {}; if (hlI !== null) h[hlI] = 'cur';
        frames.push({ narr: narr, parts: [
          { type: 'array', label: 'post.authorId for each post', values: ids, hl: h, showIdx: true },
          { type: 'queue', label: 'DataLoader pending keys (this tick)', items: queue.slice(), frontLabel: 'first', backLabel: 'last' },
          { type: 'set', label: 'Per-request cache (keys already promised)', items: cache.slice() },
          { type: 'vars', label: 'Database queries', vals: { naive: q1, dataloader: q2 } }
        ] });
      }
      snap('Query.posts already ran: <b>1 query</b> returned ' + ids.length + ' posts. Now every <code>Post.author</code> resolver fires.', null, 1, 1);
      ids.forEach(function (id, i) {
        if (cache.indexOf(id) >= 0) {
          snap('Post ' + i + ' asks <code>load(' + id + ')</code>. Key ' + id + ' is <b>already in the cache</b>: the same promise is returned, nothing is queued. Naive code would still run a query.', i, 2 + i, 1);
        } else {
          cache.push(id); queue.push(id);
          snap('Post ' + i + ' asks <code>load(' + id + ')</code>. New key: remember it and return a promise. <b>No query yet</b>. Naive code would query now.', i, 2 + i, 1);
        }
      });
      var distinct = queue.slice();
      snap('The tick ends (all sibling resolvers have asked). DataLoader calls <code>batchFn([' + distinct.join(', ') + '])</code> once: <code>SELECT ... WHERE id IN (' + distinct.join(', ') + ')</code>.', null, 1 + ids.length, 2);
      queue = [];
      snap('Rows come back (maybe in another order). The batch function <b>re-orders them to match the keys</b>, and each promise resolves. Total: <b>2 queries vs ' + (1 + ids.length) + '</b>.', null, 1 + ids.length, 2);
      return frames;
    }
  },
  examples: [
    { title: 'Spring for GraphQL: @BatchMapping', html: `<p>Spring for GraphQL turns a batch method into a DataLoader for you. The method receives all parent posts in the current level and returns a Map from post to author.</p>`, code: { lang: 'java', check: false, code: `@Controller
class PostController {
    @QueryMapping
    List<Post> posts(@Argument int first) { return postRepo.findTop(first); }

    // Called ONCE per level with all posts, not once per post
    @BatchMapping
    Map<Post, User> author(List<Post> posts) {
        Set<Long> ids = posts.stream().map(Post::authorId).collect(Collectors.toSet());
        Map<Long, User> byId = userRepo.findAllById(ids).stream()
            .collect(Collectors.toMap(User::id, u -> u));
        return posts.stream().collect(Collectors.toMap(p -> p, p -> byId.get(p.authorId())));
    }
}` } },
    { title: 'One-to-many loader', html: `<p>For <code>User.posts</code> the key is a user id and the value is a <b>list</b>. Batch: <code>SELECT * FROM posts WHERE author_id IN (...)</code>, group by author, return <code>ids.map(id =&gt; groups.get(id) || [])</code>. An empty array, not null, for users with no posts.</p>` },
    { title: 'When DataLoader is not enough', html: `<p><code>posts(first:50) { comments(first:5) }</code> needs "top 5 per post". One <code>IN</code> query cannot limit per group; use a window function (<code>ROW_NUMBER() OVER (PARTITION BY post_id ORDER BY created_at DESC)</code>) or a LATERAL join inside the batch function.</p>` }
  ],
  deepDive: `<p>🟣 <b>Scheduling.</b> The JavaScript DataLoader enqueues dispatch with a microtask/nextTick-like hook, so all <code>load</code> calls made synchronously while resolving one level of the tree land in one batch. Deeper levels form later batches: a query 4 levels deep makes about 4 batched queries, regardless of list sizes. In Java (java-dataloader) dispatch is triggered by the engine's dispatch instrumentation per level.</p>
  <p><b>Correctness traps:</b> (1) wrong order or length in the batch result → mismatched data; (2) <code>IN</code> lists with thousands of keys → set <code>maxBatchSize</code>; (3) a cached value after a mutation in the same request → call <code>loader.clear(key)</code> or <code>prime</code> the new value; (4) loaders keyed only by id when the query also filters by the viewer's permissions → include the auth scope in the loader or create it per request (which you should anyway). <b>Alternatives:</b> look-ahead (inspect <code>info</code> to JOIN up front), or a GraphQL-to-SQL compiler (Hasura, PostGraphile, Join Monster) that turns the whole query into one SQL statement.</p>`,
  aiEra: `<p>🤖 <b>AI writes N+1 code by default.</b> Ask any assistant for "a resolver for Post.author" and you get a one-row lookup, which is correct but becomes N+1 in a list. Make a habit: after generating resolvers, ask it to "write a test that runs a query for 50 posts with authors and asserts at most 2 SQL statements". Query-count tests catch regressions forever.</p>
  <p><b>Observability helps too:</b> APM tools and OpenTelemetry traces show 50 identical spans under one request, a pattern AI log analyzers flag automatically. You still need to understand the batch contract (order, length, per-request scope) to review the fix.</p>`,
  problems: [
    {
      title: 'Count the Queries Before and After DataLoader',
      level: 'Medium', tags: ['graphql', 'n+1', 'dataloader'], companies: ['Shopify', 'Meta'],
      statement: `<p>Query: <code>{ posts(first: 20) { title author { name company { name } } } }</code>. The 20 posts have 8 distinct authors who work at 3 distinct companies. Count database queries (a) with naive resolvers, (b) with DataLoaders for users and companies. Then write the batch function for companies.</p>`,
      constraints: `Each resolver does one primary-key lookup when naive. Loaders are per request.`,
      example: `<p>Naive: 1 (posts) + 20 (author per post) + 20 (company per author resolution) = ${H.c('r', '41')}. With loaders: 1 + 1 + 1 = ${H.c('g', '3')}.</p>`,
      brute: { why: `<p>Naive resolvers repeat the same lookup for the same author many times, and the company lookups multiply the author lookups. Caching alone (no batching) would cut it to 1 + 8 + 3 = 12, still one round trip per distinct key.</p>` },
      mcq: { q: 'Why is the company count 20 and not 8 in the naive version?', options: ['Companies are nested in posts', 'Author.company runs once per author object resolved, and there are 20 author resolutions (one per post)', 'GraphQL retries', 'It is 8'], answer: 1, explain: 'Without a cache each post yields its own author object, so the company resolver runs 20 times.' },
      hints: [
        `<p>Count resolver calls level by level: posts, then one author per post, then one company per author object.</p>`,
        `<p>A loader turns each level into one batched query of the distinct keys at that level.</p>`,
        `<p>Batch function: query all ids with IN, build a map id → row, return <code>ids.map(id =&gt; map.get(id) ?? null)</code>.</p>`
      ],
      solution: {
        approach: `<p>(a) Naive: 1 query for posts, 20 for <code>Post.author</code> (one per post), and 20 for <code>User.company</code> because each post produced its own author object = 41. (b) With a user loader and a company loader: level 2 collects 20 loads, deduped to 8 keys, one <code>IN</code> query; level 3 collects company ids, deduped to 3, one query. Total 3. The batch function must return values aligned to keys.</p>`,
        code: { lang: 'js', run: true, code: `// Company batch function: must return one value per key, in key order.
const companiesTable = [{ id: 30, name: 'Initech' }, { id: 10, name: 'Acme' }, { id: 20, name: 'Globex' }];
async function batchCompanies(ids) {
  // SELECT id, name FROM companies WHERE id IN (...)  -- rows in any order
  const rows = companiesTable.filter(c => ids.includes(c.id));
  const byId = new Map(rows.map(r => [r.id, r]));
  return ids.map(id => byId.get(id) ?? null);   // null for unknown ids
}
batchCompanies([10, 99, 30]).then(r => console.log(JSON.stringify(r)));
// [{"id":10,"name":"Acme"},null,{"id":30,"name":"Initech"}]` },
        complexity: `<p>Queries drop from O(N × depth) to O(depth). Each batch query is O(k) rows for k distinct keys.</p>`,
        followUps: ['What if a company has 10,000 employees and the query asks company.employees?', 'How would you limit the IN list size?']
      }
    }
  ]
});

/* =====================================================================
   TOPIC 4 — Pagination and security limits
   ===================================================================== */
topics.push({
  title: 'GraphQL Pagination (Connections) and Security Limits',
  analogy: `<p>An all-you-can-eat buffet needs rules: one plate at a time (pagination), no plates stacked ten storeys high (depth limit), and a points budget so nobody takes all the lobster (cost limits). Regular guests only order from the printed set menus (persisted queries), and the kitchen door with the full recipe book (introspection) is closed to the public.</p>`,
  explain: `<p>🟢 <b>Pagination: the Connection pattern.</b> GraphQL lists that can grow use the Relay-style <b>Connection</b> shape: <code>posts(first: 10, after: "cursor")</code> returns <code>{ edges { cursor node { ... } } pageInfo { hasNextPage endCursor } }</code>. The cursor is an opaque string (usually base64 of the last sort key + id), which gives stable pages as rows are inserted, exactly like cursor pagination in REST. Offsets (<code>skip</code>) are allowed but suffer the same skipped/duplicated rows and slow deep pages.</p>
  <p><b>Why security needs extra thought.</b> One endpoint, client-written queries. A single request can be harmless or can ask for <code>users(first:100){ friends(first:100){ friends(first:100){ ... } } }</code>, a million objects. Rate limiting "per request" means nothing. Defences:</p>
  ${H.table(['Defence', 'What it stops', 'Typical setting'], [
    ['Max depth', 'deeply nested / cyclic queries', '8-12 levels'],
    ['Cost (complexity) analysis', 'wide queries: multiply list sizes', 'reject if cost &gt; 1000 points; rate limit by points per minute'],
    ['Required page size + max', 'unbounded lists', '<code>first</code> required, ≤ 100'],
    ['Persisted queries / allow-list', 'arbitrary queries from public clients', 'only known query hashes accepted'],
    ['Disable introspection in prod (public APIs)', 'easy schema discovery', 'on for internal tools'],
    ['Alias and batch limits', 'the same expensive field 500 times via aliases, or 100 ops in one batch', 'max ~10-20 aliases / batched ops'],
    ['Timeouts and per-field authorization', 'slow resolvers, data leaks via nested fields', 'auth checked in every resolver or by a directive']
  ])}
  <p><b>Cost formula.</b> A common static estimate: each field costs 1, and a list field multiplies its children by its <code>first</code> argument. <code>users(first:100){ posts(first:50){ title } }</code> ≈ 100 + 100×50 = 5,100 points. The server computes this <i>before</i> running anything.</p>`,
  clues: [
    '"Paginate a GraphQL list" → Relay connections: <code>first/after</code>, <code>edges</code>, <code>pageInfo</code>',
    '"Prevent malicious or expensive queries" → depth limit + cost analysis + max page size + timeouts',
    '"Rate limit a GraphQL API" → by computed cost points, not by request count (GitHub, Shopify)',
    '"Batching attack on login mutation via aliases" → limit aliases/operations per request; rate limit per field',
    '"Make GraphQL cacheable" → persisted queries over GET + CDN, plus client normalized cache',
    '"Introspection in production?" → disable for public schemas, keep for internal tools; it is not real security on its own'
  ],
  code: { lang: 'js', run: true, code: `// Static depth + cost analysis BEFORE execution.
// A query tree: each node = { name, first?, children }
function analyse(node, depth = 1) {
  const kids = node.children || [];
  let childCost = 0, maxDepth = depth;
  for (const k of kids) {
    const r = analyse(k, depth + 1);
    childCost += r.cost;
    maxDepth = Math.max(maxDepth, r.depth);
  }
  const multiplier = node.first || 1;           // list fields multiply their subtree
  return { cost: 1 * multiplier + multiplier * childCost, depth: maxDepth };
}
function check(query, { maxDepth = 6, maxCost = 1000 } = {}) {
  const { cost, depth } = analyse(query);
  const ok = depth <= maxDepth && cost <= maxCost;
  return (ok ? 'ACCEPT' : 'REJECT') + ' depth=' + depth + ' cost=' + cost;
}

const cheap = { name: 'viewer', children: [{ name: 'repos', first: 10, children: [{ name: 'name' }, { name: 'stars' }] }] };
const evil = { name: 'users', first: 100, children: [{ name: 'friends', first: 100, children: [{ name: 'friends', first: 100, children: [{ name: 'name' }] }] }] };
console.log('cheap:', check(cheap));
console.log('evil :', check(evil));` },
  codeTitle: 'Depth and cost limiter (runnable JS)',
  viz: {
    title: 'Compute query cost level by level',
    input: '10,5,20',
    inputLabel: 'first: value at each nested list level (1-5 numbers)',
    gen: function (input) {
      var f = String(input || '').split(/[\s,]+/).filter(Boolean).map(Number);
      if (!f.length || f.length > 5 || f.some(function (x) { return !(x >= 1 && x <= 1000); })) throw new Error('Type 1-5 page sizes between 1 and 1000, e.g. 10,5,20');
      var frames = [], rows = [], objects = 1, total = 0, LIMIT = 1000;
      frames.push({ narr: 'The server walks the query <b>before</b> executing it. Each list level multiplies how many objects the next level will load. Budget: <b>' + LIMIT + '</b> points.', parts: [
        { type: 'table', label: 'Cost per level', columns: ['level', 'first', 'objects at this level', 'running cost'], rows: [] },
        { type: 'bars', label: 'Objects per level', values: [0], idxLabels: ['-'] }
      ] });
      f.forEach(function (n, i) {
        objects = objects * n; total += objects;
        rows.push(['L' + (i + 1), n, objects, total]);
        var over = total > LIMIT;
        var h = {}; h[rows.length - 1] = over ? 'bad' : 'cur';
        frames.push({ narr: 'Level ' + (i + 1) + ': <code>first: ' + n + '</code> under ' + (objects / n) + ' parent object(s) → <b>' + objects + '</b> objects. Running cost ' + total + (over ? '. <span class="c-r">Over budget: reject with a clear error before touching the database.</span>' : '. Still within budget.'), parts: [
          { type: 'table', label: 'Cost per level', columns: ['level', 'first', 'objects at this level', 'running cost'], rows: rows.slice(), hl: h },
          { type: 'bars', label: 'Objects per level', values: rows.map(function (r) { return r[2]; }), idxLabels: rows.map(function (r) { return r[0]; }), hl: (function () { var b = {}; b[rows.length - 1] = over ? 'bad' : 'cur'; return b; })() }
        ] });
      });
      frames.push({ narr: total > LIMIT ? 'Verdict: <b class="c-r">REJECT</b> (cost ' + total + ' &gt; ' + LIMIT + '). Tell the client the cost and the limit so it can lower <code>first</code> or split the query.' : 'Verdict: <b class="c-g">ACCEPT</b> (cost ' + total + '). The points are also charged to the client\'s per-minute budget.', parts: [
        { type: 'vars', label: 'Result', vals: { cost: total, limit: LIMIT, decision: total > LIMIT ? 'reject' : 'accept' }, hl: { decision: total > LIMIT ? 'bad' : 'ok' } }
      ] });
      return frames;
    }
  },
  examples: [
    { title: 'A connection response', html: `<p><code>{ "posts": { "edges": [ { "cursor": "Y3JlYXRlZDoxNzAwfDQy", "node": { "id": "42", "title": "Hi" } } ], "pageInfo": { "hasNextPage": true, "endCursor": "Y3JlYXRlZDoxNzAwfDQy" } } }</code>. The next page is <code>posts(first: 10, after: "Y3Jl...")</code>. The cursor decodes to <code>created:1700|42</code>, i.e. a keyset of (created_at, id).</p>` },
    { title: 'Alias batching attack', html: `<p><code>mutation { a1: login(user:"bob", pass:"0000") { token } a2: login(user:"bob", pass:"0001") { token } ... a1000: ... }</code> brute-forces 1,000 passwords in one HTTP request, sailing past a "10 requests per minute" limit. Fix: limit aliases per operation, and rate limit the <b>login field</b> per username, not per HTTP request.</p>` },
    { title: 'Persisted queries', html: `<p>At build time the app registers each query and gets a hash. At run time it sends <code>GET /graphql?extensions={"persistedQuery":{"sha256Hash":"ab12..."}}&amp;variables=...</code>. The server only runs known hashes (an allow-list), and the GET URL is cacheable at the CDN. Automatic persisted queries (APQ) skip the allow-list and are only a bandwidth/caching optimization.</p>` }
  ],
  deepDive: `<p>🟣 <b>Cursor details.</b> Cursors should encode the full sort key plus a unique tiebreaker (<code>created_at, id</code>), and the server must reject cursors from a different sort order. <code>totalCount</code> is tempting but costs a <code>COUNT(*)</code>; make it a separate, optional field. Backward pagination uses <code>last/before</code>. <b>Cost analysis in practice:</b> GitHub's GraphQL API caps <code>first</code> at 100, limits a query to 500,000 nodes, and charges points per hour; Shopify uses a calculated-cost leaky bucket with the cost returned in <code>extensions</code>. Libraries: graphql-query-complexity / graphql-cost-analysis (JS), max-query-depth and complexity instrumentation in graphql-java.</p>
  <p><b>Authorization</b> belongs in the business layer each resolver calls, not only at the root: <code>user(id:"7"){ privateNotes }</code> must check field access even though <code>user</code> is public. <b>Errors</b> should not leak stack traces or "Did you mean ...?" field suggestions on public APIs. Also set a server <b>execution timeout</b> and a max request body size; static analysis cannot predict a slow resolver.</p>`,
  aiEra: `<p>🤖 <b>Agents are heavy GraphQL users.</b> An LLM agent with an introspected schema will happily write a 6-level query to answer one question. Give agents their own API keys with lower cost budgets, return the computed cost in <code>extensions</code> so the agent can adapt, and prefer a curated set of persisted operations as its tools.</p>
  <p><b>Work with AI:</b> ask an assistant to red-team your schema: "write the 5 most expensive valid queries against this SDL". It finds cyclic paths (user → friends → user) fast. Then verify your limits reject each one in a test. Do not let it "fix" security by only disabling introspection; that hides the schema but stops nothing.</p>`,
  problems: [
    {
      title: 'Design Limits for a Public Social GraphQL API',
      level: 'Medium', tags: ['graphql', 'security', 'rate limiting'], companies: ['GitHub', 'LinkedIn'],
      statement: `<p>Your public GraphQL schema has <code>User.friends</code>, <code>User.posts</code>, <code>Post.comments</code> and <code>Comment.author: User</code>, so queries can cycle forever. Propose concrete limits and how clients learn about them. Compute the cost of <code>users(first:50){ friends(first:50){ posts(first:10){ title } } }</code>.</p>`,
      constraints: `Static cost: each object 1 point, list size from <code>first</code>. Budget 5,000 points per query, 100,000 per hour per client.`,
      example: `<p>Cost = 50 + 50×50 + 50×50×10 = 50 + 2,500 + 25,000 = ${H.c('r', '27,550')} → rejected before execution.</p>`,
      brute: { why: `<p>"Rate limit to 100 requests per minute" lets one request load millions of rows. Disabling introspection alone does nothing against someone who already knows the schema (it is visible in the web app's network tab).</p>` },
      mcq: { q: 'Which limit best stops the friends-of-friends explosion?', options: ['HTTP request rate limit', 'Cost analysis multiplying list sizes', 'Disabling introspection', 'gzip'], answer: 1, explain: 'Cost analysis sees the multiplication before running the query.' },
      hints: [
        `<p>Multiply list sizes as you go down each path; add the objects at each level.</p>`,
        `<p>Combine several limits: depth, cost per query, cost per hour, required <code>first</code> ≤ 100, aliases, timeouts.</p>`,
        `<p>Return cost info in <code>extensions</code> and rate-limit headers so clients can tune queries.</p>`
      ],
      solution: {
        approach: `<p>Limits: (1) every list field requires <code>first</code> or <code>last</code>, max 100; (2) max depth 10; (3) static cost per query ≤ 5,000 (objects × list multipliers, with per-field weights for expensive resolvers like search); (4) points budget per client per hour (100,000), refilled like a token bucket; (5) max 20 aliases and 10 batched operations; (6) 10 s execution timeout and 100 KB body limit; (7) per-field authorization; (8) persisted queries required for first-party apps. Clients see <code>extensions.cost = {requested, remaining, resetAt}</code> plus clear error codes. The example costs 27,550 and is rejected with a message suggesting smaller pages.</p>`,
        complexity: `<p>Cost analysis is O(size of the query document): cheap compared with executing it.</p>`,
        followUps: ['How do you weight a field that calls a search engine?', 'How do you charge actual cost after execution?']
      }
    }
  ]
});

/* =====================================================================
   TOPIC 5 — gRPC and Protocol Buffers
   ===================================================================== */
topics.push({
  title: 'gRPC and Protocol Buffers: Contracts, Wire Format and the Four Call Types',
  analogy: `<p>Protocol Buffers are like a <b>shipping form with numbered boxes</b>. Both companies agree that box 1 is the name and box 2 is the quantity. The form only carries box numbers and contents, never the labels, so it is tiny. gRPC is the <b>courier service</b> that carries those forms over a fast highway (HTTP/2) with many lanes (streams), and every delivery has a "must arrive by" time (deadline).</p>`,
  explain: `<p>🟢 <b>Contract first.</b> You write a <code>.proto</code> file with <b>messages</b> (data) and <b>services</b> (methods). <code>protoc</code> (or <code>buf</code>) generates client stubs and server interfaces for Java, Go, Python, TypeScript, etc. Calling a remote method then looks like a normal function call: <code>stub.getUser(req)</code>.</p>
  <p><b>Wire format.</b> Each field is sent as a <b>tag</b> then a value. Tag = <code>(field_number &lt;&lt; 3) | wire_type</code>. Integers use <b>varints</b>: 7 bits per byte, with the high bit meaning "more bytes follow". Field names are never sent, which is why the <b>field numbers</b> are the real contract.</p>
  ${H.table(['Wire type', 'Used for', 'Encoding'], [
    ['0 VARINT', 'int32, int64, uint, bool, enum', '1-10 bytes, 7 bits each'],
    ['1 I64', 'fixed64, double', '8 bytes'],
    ['2 LEN', 'string, bytes, nested messages, packed repeated', 'varint length + bytes'],
    ['5 I32', 'fixed32, float', '4 bytes']
  ])}
  <p>Example: <code>id = 150</code> in field 1 → tag <code>08</code> (1&lt;&lt;3|0), value <code>96 01</code>. Three bytes. The JSON <code>{"id":150}</code> is 10.</p>
  <p><b>The four call types</b> (all over one HTTP/2 stream per call):</p>
  ${H.table(['Type', 'Shape', 'Example'], [
    ['Unary', '1 request → 1 response', 'GetUser'],
    ['Server streaming', '1 request → many responses', 'ListOrders streams pages, price ticker'],
    ['Client streaming', 'many requests → 1 response', 'upload sensor readings, then get a summary'],
    ['Bidirectional', 'many ↔ many, independent', 'chat, live transcription, game sync']
  ])}
  <p><b>Deadlines.</b> Every call should carry a deadline ("answer within 300 ms"). gRPC sends it as the <code>grpc-timeout</code> header; servers can check it and stop work, and when they call other services they <b>propagate</b> the remaining time. Expired calls fail with <code>DEADLINE_EXCEEDED</code>. Without deadlines, one slow dependency holds threads forever and outages cascade.</p>`,
  clues: [
    '"Low-latency internal service calls, many languages" → gRPC + protobuf codegen',
    '"Stream results / upload a stream / both" → server, client or bidirectional streaming',
    '"A request hangs and threads pile up" → missing deadlines; set and propagate them',
    '"Why is protobuf smaller than JSON?" → field numbers instead of names, varints, no whitespace',
    '"gRPC behind an AWS NLB sends everything to one pod" → long-lived HTTP/2 connections; use L7 or client-side load balancing',
    '"Call gRPC from the browser" → gRPC-Web/Connect via Envoy, or HTTP/JSON transcoding (google.api.http)'
  ],
  code: [
    { lang: 'text', check: false, title: 'orders.proto', code: `syntax = "proto3";
package shop.orders.v1;

option java_multiple_files = true;

service OrderService {
  rpc GetOrder(GetOrderRequest) returns (Order);                        // unary
  rpc WatchOrder(WatchOrderRequest) returns (stream OrderEvent);        // server streaming
  rpc UploadItems(stream Item) returns (UploadSummary);                 // client streaming
  rpc Chat(stream ChatMessage) returns (stream ChatMessage);            // bidirectional
}

message GetOrderRequest { string order_id = 1; }

message Order {
  string id = 1;
  int64 total_cents = 2;
  repeated Item items = 3;
  Status status = 4;
  enum Status { STATUS_UNSPECIFIED = 0; PLACED = 1; SHIPPED = 2; }
}
message Item { string sku = 1; int32 qty = 2; }
message WatchOrderRequest { string order_id = 1; }
message OrderEvent { string order_id = 1; Order.Status status = 2; }
message UploadSummary { int32 count = 1; }
message ChatMessage { string text = 1; }` },
    { lang: 'java', code: `// Protobuf varint + tag encoding by hand (what generated code does for you).
import java.io.ByteArrayOutputStream;

public class Varint {
    static void writeVarint(ByteArrayOutputStream out, long v) {
        while ((v & ~0x7FL) != 0) {            // more than 7 bits left?
            out.write((int) ((v & 0x7F) | 0x80)); // low 7 bits + "more" flag
            v >>>= 7;
        }
        out.write((int) v);                      // last byte, high bit 0
    }

    static long[] readVarint(byte[] buf, int pos) {   // returns {value, newPos}
        long result = 0; int shift = 0;
        while (true) {
            int b = buf[pos++] & 0xFF;
            result |= (long) (b & 0x7F) << shift;
            if ((b & 0x80) == 0) return new long[]{result, pos};
            shift += 7;
            if (shift > 63) throw new IllegalArgumentException("varint too long");
        }
    }

    static String hex(byte[] b) {
        StringBuilder sb = new StringBuilder();
        for (byte x : b) sb.append(String.format("%02x ", x));
        return sb.toString().trim();
    }

    public static void main(String[] args) {
        // message { int64 id = 1; string name = 2; }  with id=150, name="hi"
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        writeVarint(out, (1 << 3) | 0);  writeVarint(out, 150);          // field 1, VARINT
        writeVarint(out, (2 << 3) | 2);  writeVarint(out, 2);            // field 2, LEN, length 2
        out.write('h'); out.write('i');
        byte[] bytes = out.toByteArray();
        System.out.println("encoded: " + hex(bytes) + "  (" + bytes.length + " bytes)");

        int pos = 0;
        while (pos < bytes.length) {
            long[] tag = readVarint(bytes, pos); pos = (int) tag[1];
            int field = (int) (tag[0] >>> 3), wire = (int) (tag[0] & 7);
            long[] v = readVarint(bytes, pos); pos = (int) v[1];
            if (wire == 0) System.out.println("field " + field + " varint = " + v[0]);
            else {
                String s = new String(bytes, pos, (int) v[0]);
                pos += (int) v[0];
                System.out.println("field " + field + " len-delimited = \\"" + s + "\\"");
            }
        }
    }
}` }
  ],
  codeTitle: ['Service and messages (.proto, not executed)', 'Varint and tag encoder/decoder (plain Java)'],
  viz: {
    title: 'Encode a number as a protobuf varint',
    input: '300',
    inputLabel: 'Non-negative integer (0 to 2000000000)',
    gen: function (input) {
      var n = Number(String(input || '').trim());
      if (!(n >= 0 && n <= 2000000000) || Math.floor(n) !== n) throw new Error('Type a whole number from 0 to 2000000000, e.g. 300');
      var frames = [], bytes = [], v = n;
      frames.push({ narr: 'Start with <b>' + n + '</b>. A varint stores it 7 bits at a time, lowest bits first. Small numbers need fewer bytes.', parts: [
        { type: 'bits', label: 'value in binary', value: n % 4294967296, width: 32, showDec: true },
        { type: 'array', label: 'bytes written so far', values: ['-'] }
      ] });
      var guard = 0;
      while (guard++ < 6) {
        var low = v % 128;
        var rest = Math.floor(v / 128);
        var b = rest > 0 ? low + 128 : low;
        bytes.push(b);
        var h = {}; for (var k = 0; k < 7; k++) h[k] = 'y';
        frames.push({ narr: 'Take the low 7 bits of ' + v + ' = <b>' + low + '</b>. ' + (rest > 0 ? 'More bits remain (' + rest + '), so set the high "continue" bit: byte = ' + low + ' + 128 = <b>0x' + b.toString(16) + '</b>.' : 'Nothing remains, so the high bit stays 0: byte = <b>0x' + b.toString(16) + '</b>. Done.'), parts: [
          { type: 'bits', label: 'current value (low 7 bits highlighted)', value: v % 4294967296, width: 32, hl: h, showDec: true },
          { type: 'bits', label: 'byte emitted', value: b, width: 8, hl: { 7: rest > 0 ? 'ok' : 'm' }, showDec: true },
          { type: 'array', label: 'bytes written so far (hex)', values: bytes.map(function (x) { return '0x' + x.toString(16); }), hl: (function () { var o = {}; o[bytes.length - 1] = 'cur'; return o; })() }
        ] });
        if (rest === 0) break;
        v = rest;
      }
      frames.push({ narr: n + ' takes <b>' + bytes.length + ' byte(s)</b> as a varint vs ' + String(n).length + ' characters in JSON. Decoding reverses it: read bytes until one has the high bit 0, then glue the 7-bit groups together, first byte = lowest bits.', parts: [
        { type: 'array', label: 'final varint', values: bytes.map(function (x) { return '0x' + x.toString(16); }) },
        { type: 'vars', label: 'size', vals: { varintBytes: bytes.length, jsonDigits: String(n).length } }
      ] });
      return frames;
    }
  },
  examples: [
    { title: 'Server streaming in Java (grpc-java)', html: `<p>The server pushes events with <code>onNext</code> and finishes with <code>onCompleted</code>; it checks cancellation so it stops when the client goes away or the deadline passes.</p>`, code: { lang: 'java', check: false, code: `public class OrderServiceImpl extends OrderServiceGrpc.OrderServiceImplBase {
  @Override
  public void watchOrder(WatchOrderRequest req, StreamObserver<OrderEvent> out) {
    ServerCallStreamObserver<OrderEvent> call = (ServerCallStreamObserver<OrderEvent>) out;
    for (OrderEvent e : events.subscribe(req.getOrderId())) {
      if (call.isCancelled()) return;          // client left or deadline exceeded
      out.onNext(e);
    }
    out.onCompleted();
  }
}

// client: always set a deadline
OrderServiceGrpc.OrderServiceBlockingStub stub = OrderServiceGrpc.newBlockingStub(channel)
    .withDeadlineAfter(300, TimeUnit.MILLISECONDS);
Order o = stub.getOrder(GetOrderRequest.newBuilder().setOrderId("o-42").build());` } },
    { title: 'Deadline propagation budget', html: `<p>Edge sets 500 ms. API gateway spends 20 ms, calls Orders with ~480 ms left. Orders spends 100 ms, calls Inventory with ~380 ms left. If Inventory is slow, it fails at the <b>same moment</b> the user would have given up, instead of burning CPU for an answer nobody reads.</p>
      ${H.table(['Hop', 'time used', 'deadline passed on'], [['edge', '-', '500 ms'], ['gateway', '20 ms', '480 ms'], ['orders', '100 ms', '380 ms'], ['inventory', '?', 'must finish &lt; 380 ms']])}` },
    { title: 'Status codes worth knowing', html: `<p><code>OK</code>, <code>INVALID_ARGUMENT</code> (like 400), <code>NOT_FOUND</code>, <code>ALREADY_EXISTS</code>, <code>PERMISSION_DENIED</code>, <code>UNAUTHENTICATED</code>, <code>RESOURCE_EXHAUSTED</code> (like 429), <code>FAILED_PRECONDITION</code>, <code>UNAVAILABLE</code> (retryable, like 503), <code>DEADLINE_EXCEEDED</code>. Retry only <code>UNAVAILABLE</code> (and idempotent methods); configure retries in the service config with backoff and a retry budget.</p>` }
  ],
  deepDive: `<p>🟣 <b>Under the hood.</b> A gRPC call is an HTTP/2 POST to <code>/package.Service/Method</code> with <code>content-type: application/grpc</code>. Each message is framed with a 5-byte prefix (1 compressed flag + 4-byte length). The status comes in HTTP <b>trailers</b> (<code>grpc-status</code>, <code>grpc-message</code>), which is why browsers (no trailer access in fetch) need gRPC-Web. Flow control is HTTP/2's per-stream window, which gives streaming natural back-pressure.</p>
  <p><b>Production checklist:</b> deadlines on every call; retries only for idempotent methods with jittered backoff; keepalive pings tuned with the load balancer's idle timeout; client-side load balancing (xDS, round_robin) or an L7 mesh (Envoy/Istio/Linkerd) because one HTTP/2 connection carries all calls; max message size (default 4 MB receive) — stream large data instead; health checking via <code>grpc.health.v1</code>; server reflection for tools like <code>grpcurl</code>. <b>Proto3 defaults:</b> unset scalar fields read as 0/""/false, so you cannot tell "0" from "not sent" unless the field is marked <code>optional</code> (explicit presence) or wrapped. Negative <code>int32</code> values take 10 bytes; use <code>sint32</code> (zigzag) for fields that are often negative.</p>`,
  aiEra: `<p>🤖 <b>Contracts help AI too.</b> A <code>.proto</code> file is precise enough that assistants generate correct stubs, mocks and test clients from it. Tools like <code>buf</code> lint and breaking-change detection run in CI, so AI-generated proto edits are checked mechanically (next topic). Many model-serving systems (Triton, vLLM's gRPC frontends, TensorFlow Serving) use gRPC streaming for inference traffic between services.</p>
  <p><b>Watch out:</b> assistants often forget deadlines, use <code>int32</code> for money totals that overflow, reuse field numbers when "cleaning up" a message, and suggest gRPC to browsers directly. Make "deadline set?" and "field numbers untouched?" standard review questions.</p>`,
  problems: [
    {
      title: 'Choose the gRPC Call Type and Deadline',
      level: 'Easy', tags: ['grpc', 'streaming', 'deadlines'], companies: ['Google', 'Netflix'],
      statement: `<p>For each method pick unary, server streaming, client streaming or bidirectional, and suggest a deadline: (a) <code>GetPrice(sku)</code>; (b) <code>UploadLogs</code> sending 10,000 lines then receiving a count; (c) <code>LiveTranscribe</code> sending audio chunks while receiving partial text; (d) <code>ExportOrders</code> returning 2 million rows.</p>`,
      constraints: `Default max message size is 4 MB; user-facing calls must finish within 1 s end to end.`,
      example: `<p>(d) ${H.c('g', 'server streaming')}: one request, the server sends rows in chunks of ~1,000. A single unary response would exceed the 4 MB limit and buffer everything in memory.</p>`,
      brute: { why: `<p>Making everything unary forces huge messages (memory spikes, 4 MB limit) or thousands of tiny calls. No deadline means a hung dependency holds a thread forever.</p>` },
      mcq: { q: 'LiveTranscribe sends audio and receives text at the same time. Which type?', options: ['Unary', 'Server streaming', 'Client streaming', 'Bidirectional streaming'], answer: 3, explain: 'Both sides stream independently on the same call.' },
      hints: [
        `<p>Count messages each way: one or many from the client, one or many from the server.</p>`,
        `<p>Streaming calls also need deadlines, often longer, or an idle timeout instead.</p>`,
        `<p>(a) unary ~100-200 ms; (b) client streaming, a few seconds; (c) bidi, long deadline + keepalive; (d) server streaming, minutes, with resume token.</p>`
      ],
      solution: {
        approach: `<p>(a) <b>Unary</b>, deadline ~150 ms, safe to retry on UNAVAILABLE because it is a read. (b) <b>Client streaming</b>: the client sends lines with back-pressure, the server returns one <code>UploadSummary</code>; deadline a few seconds, plus an idempotency/batch id so a retried upload is not double counted. (c) <b>Bidirectional streaming</b>: audio in, partial transcripts out, independent; long deadline (e.g. the session max of 30 minutes) plus keepalive pings. (d) <b>Server streaming</b> in chunks; long deadline; include a resume cursor in each chunk so a broken stream can continue instead of restarting.</p>`,
        complexity: `<p>Streaming keeps memory O(chunk) instead of O(total) on both sides.</p>`,
        followUps: ['How do you resume a broken server stream?', 'What does a load balancer see for a 30-minute bidi stream?']
      }
    }
  ]
});

/* =====================================================================
   TOPIC 6 — Backward-compatible schema evolution
   ===================================================================== */
topics.push({
  title: 'Evolving Schemas Safely: Protobuf and GraphQL Compatibility Rules',
  analogy: `<p>Think of numbered post-office boxes. If the post office renames box 4 from "Smith" to "Smith family", mail still arrives (renaming is safe). But if box 4 is given to a new tenant, the old tenant's mail goes to a stranger. Protobuf field numbers are those boxes: rename freely, never hand a number to someone new, and put a "do not reuse" sign on closed boxes (<code>reserved</code>).</p>`,
  explain: `<p>🟢 <b>Why compatibility matters.</b> In a fleet, old and new versions run at the same time: clients you cannot upgrade, services mid-rollout, messages sitting in Kafka for days. A change is <b>backward compatible</b> if new code reads old data, <b>forward compatible</b> if old code reads new data. Protobuf is designed for both, if you follow the rules.</p>
  ${H.table(['Protobuf change', 'Safe?', 'Why'], [
    ['Add a new field with a new number', '<span class="c-g">Yes</span>', 'old readers skip unknown fields; new readers see the default when it is missing'],
    ['Rename a field', '<span class="c-g">Yes (binary)</span>', 'names are not on the wire; breaks JSON mapping and generated code users'],
    ['Delete a field and <code>reserved</code> its number + name', '<span class="c-g">Yes</span>', 'nobody can reuse it later'],
    ['Delete a field, reuse its number for a new field', '<span class="c-r">No</span>', 'old data is decoded as the new field: silent corruption'],
    ['Change type int32 ↔ int64 / uint32 / bool', '<span class="c-y">Mostly</span>', 'same varint wire type; values may truncate'],
    ['Change type int32 → string', '<span class="c-r">No</span>', 'different wire type: parse error or garbage'],
    ['Change field number', '<span class="c-r">No</span>', 'same as delete + add'],
    ['Make singular ↔ repeated', '<span class="c-y">Risky</span>', 'works for some scalar cases; avoid'],
    ['Add an enum value', '<span class="c-y">Careful</span>', 'old readers see an unknown value; always keep <code>X_UNSPECIFIED = 0</code>']
  ])}
  <p><b>GraphQL rules are about clients, not bytes.</b> Adding types, fields and optional arguments is safe. Removing or renaming a field, making a nullable field non-null in an <i>input</i>, adding a required argument, or changing a field from non-null to nullable in <i>output</i> (clients may crash on null) are breaking. GraphQL APIs usually do not version; they <b>deprecate</b> (<code>@deprecated(reason: "use fullName")</code>), watch field usage metrics, and remove when traffic hits zero.</p>`,
  clues: [
    '"Can I rename a protobuf field?" → yes on the wire, no if JSON or generated-code users depend on the name',
    '"We deleted a field and reused its number" → classic data-corruption bug; use <code>reserved</code>',
    '"How do you version a gRPC API?" → package version (<code>shop.orders.v1</code> → v2) only for breaking changes; additive changes in place',
    '"How do you version GraphQL?" → you mostly do not: additive evolution + @deprecated + usage tracking',
    '"Rolling deploy, old and new services at once" → changes must be both backward and forward compatible',
    '"Catch breaking changes in CI" → buf breaking, graphql-inspector, Apollo schema checks'
  ],
  code: { lang: 'java', code: `// A tiny protobuf breaking-change checker (like a mini "buf breaking").
import java.util.*;

public class ProtoCompat {
    record Field(int number, String name, String type) {}
    record Schema(Map<Integer, Field> fields, Set<Integer> reservedNumbers) {}

    // wire type groups: same group = same bytes on the wire
    static String wireGroup(String t) {
        return switch (t) {
            case "int32", "int64", "uint32", "uint64", "bool", "enum" -> "varint";
            case "sint32", "sint64" -> "zigzag";
            case "string", "bytes", "message" -> "len";
            case "fixed32", "sfixed32", "float" -> "i32";
            case "fixed64", "sfixed64", "double" -> "i64";
            default -> "unknown";
        };
    }

    static List<String> check(Schema oldS, Schema newS) {
        List<String> problems = new ArrayList<>();
        for (Field o : oldS.fields().values()) {
            Field n = newS.fields().get(o.number());
            if (n == null) {
                if (!newS.reservedNumbers().contains(o.number()))
                    problems.add("field " + o.number() + " (" + o.name() + ") deleted without 'reserved'");
                continue;
            }
            if (!wireGroup(o.type()).equals(wireGroup(n.type())))
                problems.add("field " + o.number() + " changed wire type " + o.type() + " -> " + n.type());
            else if (!o.type().equals(n.type()))
                problems.add("warning: field " + o.number() + " " + o.type() + " -> " + n.type() + " may truncate values");
            if (!o.name().equals(n.name()))
                problems.add("warning: field " + o.number() + " renamed " + o.name() + " -> " + n.name() + " (breaks JSON clients)");
        }
        for (Field n : newS.fields().values())
            if (oldS.reservedNumbers().contains(n.number()))
                problems.add("field " + n.number() + " (" + n.name() + ") reuses a reserved number");
        return problems;
    }

    static Map<Integer, Field> fields(Field... fs) {
        Map<Integer, Field> m = new TreeMap<>();
        for (Field f : fs) m.put(f.number(), f);
        return m;
    }

    public static void main(String[] args) {
        Schema v1 = new Schema(fields(new Field(1, "id", "string"), new Field(2, "qty", "int32"),
                                      new Field(3, "note", "string")), Set.of(4));
        Schema v2 = new Schema(fields(new Field(1, "id", "string"), new Field(2, "quantity", "int64"),
                                      new Field(4, "gift", "bool"), new Field(5, "price", "string")), Set.of());
        List<String> p = check(v1, v2);
        p.forEach(System.out::println);
        long errors = p.stream().filter(s -> !s.startsWith("warning")).count();
        System.out.println(errors == 0 ? "COMPATIBLE" : "BREAKING (" + errors + " errors)");
    }
}` },
  codeTitle: 'Breaking-change checker for proto fields (plain Java)',
  viz: {
    title: 'Old reader meets new bytes',
    input: 'reuse',
    inputLabel: 'Change: add, rename, reuse or retype',
    gen: function (input) {
      var c = String(input || 'reuse').trim().toLowerCase();
      var S = {
        add: { v1: [['1', 'string id'], ['2', 'int32 qty']], v2: [['1', 'string id'], ['2', 'int32 qty'], ['3', 'string coupon (NEW)']], wire: ['1:"o-9"', '2:3', '3:"SAVE10"'],
          read: ['id = "o-9"', 'qty = 3', 'field 3 unknown → skipped (kept as unknown bytes)'], ok: true,
          end: 'Adding a field with a <b>new number</b> is safe both ways. Old readers skip it; new readers see "" when old writers omit it.' },
        rename: { v1: [['1', 'string id'], ['2', 'int32 qty']], v2: [['1', 'string id'], ['2', 'int32 quantity']], wire: ['1:"o-9"', '2:3'],
          read: ['id = "o-9"', 'qty = 3 (same number, so same field)'], ok: true,
          end: 'Binary is fine: names never travel. But the <b>JSON form</b> uses names (<code>"qty"</code> vs <code>"quantity"</code>) and code that calls <code>getQty()</code> stops compiling. Rename with care.' },
        reuse: { v1: [['1', 'string id'], ['2', 'int32 qty'], ['3', 'int32 discount_pct']], v2: [['1', 'string id'], ['2', 'int32 qty'], ['3', 'int32 loyalty_points (REUSED 3)']], wire: ['1:"o-9"', '2:3', '3:500'],
          read: ['id = "o-9"', 'qty = 3', 'discount_pct = 500 (!)'], ok: false,
          end: '<span class="c-r">Silent corruption:</span> new writer meant 500 loyalty points; an old reader applies a 500% discount. No error is raised. Fix: <code>reserved 3; reserved "discount_pct";</code> and use number 4.' },
        retype: { v1: [['1', 'string id'], ['2', 'int32 qty']], v2: [['1', 'string id'], ['2', 'string qty']], wire: ['1:"o-9"', '2:LEN "3"'],
          read: ['id = "o-9"', 'field 2: expected VARINT, got LEN → error / dropped as unknown'], ok: false,
          end: '<span class="c-r">Wire type changed</span> (varint → length-delimited). Old readers fail or drop the field. Add a new field instead and deprecate the old one.' }
      };
      var s = S[c];
      if (!s) throw new Error('Type add, rename, reuse or retype');
      var frames = [];
      frames.push({ narr: 'The <b>old</b> service (v1) still runs during the rollout. Here is its schema.', parts: [{ type: 'table', label: 'v1 schema (old reader)', columns: ['#', 'field'], rows: s.v1 }] });
      frames.push({ narr: 'The team ships <b>v2</b> with this change: <b>' + c + '</b>.', parts: [{ type: 'table', label: 'v1 schema (old reader)', columns: ['#', 'field'], rows: s.v1 }, { type: 'table', label: 'v2 schema (new writer)', columns: ['#', 'field'], rows: s.v2, hl: (function () { var h = {}; h[s.v2.length - 1] = s.ok ? 'ok' : 'bad'; return h; })() }] });
      frames.push({ narr: 'A v2 service writes a message. On the wire there are only <b>numbers and values</b>, no names.', parts: [{ type: 'array', label: 'bytes on the wire (field:value)', values: s.wire }] });
      s.read.forEach(function (r, i) {
        var h = {}; h[i] = (i === s.read.length - 1 && !s.ok) ? 'bad' : 'ok';
        frames.push({ narr: 'The <b>v1</b> reader decodes field ' + (i + 1) + ' using <i>its own</i> schema: ' + r + '.', parts: [{ type: 'array', label: 'bytes on the wire', values: s.wire, hl: (function () { var o = {}; o[i] = 'cur'; return o; })() }, { type: 'table', label: 'what the old reader sees', columns: ['decoded'], rows: s.read.slice(0, i + 1).map(function (x) { return [x]; }), hl: h }] });
      });
      frames.push({ narr: s.end, parts: [{ type: 'text', html: s.ok ? '<b class="c-g">Compatible</b>' : '<b class="c-r">Breaking</b>' }] });
      return frames;
    }
  },
  examples: [
    { title: 'Deleting a field the right way', html: `<p>Remove the field and fence the number and name so nobody reuses them.</p>`, code: { lang: 'text', check: false, code: `message Order {
  reserved 3, 7 to 9;
  reserved "discount_pct";
  string id = 1;
  int32 qty = 2;
  int32 loyalty_points = 10;   // brand-new number
}` } },
    { title: 'GraphQL rename via deprecation', html: `<p>Add <code>fullName</code>, mark <code>name: String @deprecated(reason: "Use fullName")</code>, keep both resolvers, watch field usage in the schema registry until <code>name</code> has zero clients for 30-90 days, then remove. Mobile apps that cannot be force-upgraded often keep deprecated fields alive for years.</p>` },
    { title: 'Expand-and-contract for a breaking change', html: `<p>Need <code>price</code> as a <code>Money</code> message instead of <code>int64 price_cents</code>? (1) Add <code>Money price = 12</code>; (2) writers fill both; (3) readers move to the new field; (4) writers stop filling the old one; (5) reserve it. Every step is compatible with the previous one, so rollouts and rollbacks are safe. Truly incompatible redesigns go in a new package <code>v2</code> served side by side.</p>` }
  ],
  deepDive: `<p>🟣 <b>Unknown fields.</b> Proto3 parsers (since 3.5) <b>preserve</b> unknown fields and re-serialize them, so a v1 proxy passing a v2 message along does not lose data. Converting to JSON or to your own domain objects does drop them. <b>Enums:</b> proto3 enums are "open": an unknown number is kept as an int; in Java <code>getStatus()</code> returns <code>UNRECOGNIZED</code>. That is why the zero value must be <code>*_UNSPECIFIED</code>, a safe default. <b>Defaults:</b> a removed field reads as zero/empty in old code, so make sure zero means "unknown" and not "free" (a 0 price!).</p>
  <p><b>Tooling.</b> <code>buf breaking --against '.git#branch=main'</code> checks wire, JSON and source compatibility levels (FILE, PACKAGE, WIRE_JSON, WIRE). A schema registry (Confluent, Buf Schema Registry) enforces compatibility modes (BACKWARD, FORWARD, FULL, TRANSITIVE) for messages in Kafka. For GraphQL, graphql-inspector or Apollo GraphOS checks compare the schema diff against real operation usage, so removing an unused field passes and removing a used one fails.</p>`,
  aiEra: `<p>🤖 <b>AI refactors love to renumber.</b> Ask an assistant to "clean up this proto" and it may sort fields and renumber them 1..n, which is a silent wire break. Always run <code>buf breaking</code> in CI so the machine, not reviewer attention, guards field numbers.</p>
  <p><b>Good uses:</b> generating expand-and-contract migration plans, writing the dual-write code, and summarizing usage data from a schema registry ("which clients still read <code>name</code>?"). Your job is choosing the compatibility level for each consumer: mobile apps live for years, internal services for one deploy.</p>`,
  problems: [
    {
      title: 'Review Four Proto Changes',
      level: 'Medium', tags: ['protobuf', 'compatibility'], companies: ['Stripe', 'Uber'],
      statement: `<p>v1: <code>message Payment { string id = 1; int32 amount_cents = 2; string currency = 3; bool refunded = 4; }</code>. A PR proposes: (a) rename <code>currency</code> → <code>currency_code</code>; (b) change <code>amount_cents</code> to <code>int64</code>; (c) delete <code>refunded</code> and add <code>Status status = 4</code>; (d) add <code>string idempotency_key = 5</code>. Classify each and fix the unsafe ones. Services exchange binary protobuf and also log JSON.</p>`,
      constraints: `Rolling deploy; some consumers update a week later.`,
      example: `<p>(d) ${H.c('g', 'safe')}: new number. (c) ${H.c('r', 'breaking')}: number 4 reused with a different meaning; old readers decode status as a bool.</p>`,
      brute: { why: `<p>Approving because "it compiles" misses wire semantics: protoc happily compiles a reused number. Rejecting everything blocks harmless additions.</p>` },
      mcq: { q: 'Changing int32 amount_cents to int64 is...', options: ['Always breaking', 'Wire compatible (both varint) but old readers truncate values above 2^31-1', 'Safe in every case', 'A JSON-only change'], answer: 1, explain: 'Same varint wire type; old int32 readers cast large values and get wrong numbers.' },
      hints: [
        `<p>Check each change against: same number? same wire type? same meaning? names used by JSON?</p>`,
        `<p>Reusing number 4 for something different is the dangerous one; reserve and pick a new number.</p>`,
        `<p>Rename is wire-safe but JSON-breaking; int32→int64 is wire-safe but truncation-risky until all readers update.</p>`
      ],
      solution: {
        approach: `<p>(a) Rename: binary safe, but JSON logs and any JSON/transcoded clients see a new key, and code calling <code>getCurrency()</code> breaks; prefer keeping the name, or add the new name via <code>json_name</code> only after consumers update. (b) int32 → int64: same varint wire type, so parsing works, but old readers truncate amounts above 2,147,483,647 cents; upgrade all readers first, then let writers send large values. (c) Breaking: reserve 4 and "refunded", add <code>Status status = 6</code> with <code>STATUS_UNSPECIFIED = 0</code>; during migration write both. (d) Safe additive change.</p>`,
        complexity: `<p>Review rule set, O(fields). Automate with buf breaking.</p>`,
        followUps: ['What happens to a Kafka message written by v1 and read by v3 a month later?', 'How does json_name help?']
      }
    }
  ]
});

/* =====================================================================
   TOPIC 7 — WebSockets and SSE protocols
   ===================================================================== */
topics.push({
  title: 'Real-Time Basics: Polling, Server-Sent Events and WebSockets',
  analogy: `<p><b>Polling</b> is a child asking "are we there yet?" every minute. <b>Long polling</b> is asking once and the driver only answers when you arrive (then you ask again). <b>SSE</b> is the car radio: the station talks, you listen, and if the signal drops the radio retunes by itself. <b>WebSocket</b> is a walkie-talkie channel kept open: either side can talk any time.</p>`,
  explain: `<p>🟢 <b>Four ways to get fresh data.</b></p>
  ${H.table(['Technique', 'How', 'Good for', 'Cost'], [
    ['Short polling', 'GET every N seconds', 'rare updates, simple infra', 'wasted requests; up to N s delay'],
    ['Long polling', 'GET hangs until data or timeout, then re-ask', 'old proxies, fallback', 'one request per message'],
    ['SSE', 'one GET, response stays open, server writes <code>data:</code> lines', 'server → client feeds, LLM token streams', 'text only, one direction'],
    ['WebSocket', 'HTTP Upgrade, then framed messages both ways', 'chat, games, collaboration', 'stateful; custom protocol on top']
  ])}
  <p><b>SSE in one picture.</b> Response header <code>Content-Type: text/event-stream</code>. Body is a stream of events separated by a blank line:</p>
  <pre>id: 42
event: price
data: {"sym":"ACME","px":101.5}

</pre>
  <p>The browser's <code>EventSource</code> parses this, fires events, and <b>reconnects automatically</b>, sending <code>Last-Event-ID: 42</code> so the server can replay what was missed. <code>retry: 5000</code> sets the reconnect delay.</p>
  <p><b>WebSocket handshake.</b> Client sends <code>GET /chat</code> with <code>Upgrade: websocket</code>, <code>Connection: Upgrade</code>, <code>Sec-WebSocket-Key</code> and <code>Sec-WebSocket-Version: 13</code>. Server answers <code>101 Switching Protocols</code> with <code>Sec-WebSocket-Accept</code> = base64(SHA-1(key + a fixed GUID)). From then on both sides send <b>frames</b>: text, binary, ping, pong, close. Client-to-server frames are <b>masked</b> (XOR with a 4-byte key) to protect proxies from cache poisoning.</p>
  <p><b>What you must build yourself on WebSockets:</b> message types, request ids, acks, reconnection with backoff, resubscription, and missed-message recovery. SSE gives you reconnection and resume (Last-Event-ID) for free.</p>`,
  clues: [
    '"Only the server pushes" → SSE; "both sides push often" → WebSocket',
    '"Stream LLM tokens to the browser" → SSE (<code>text/event-stream</code>) or fetch streaming',
    '"Client reconnects, how do we not lose messages?" → event ids + Last-Event-ID + server-side replay buffer',
    '"Connection drops through a corporate proxy after 60 s" → heartbeats (SSE comment lines / WebSocket ping) under the idle timeout',
    '"Authenticate a WebSocket" → token in cookie or first message / short-lived ticket in the URL; check Origin; browsers cannot set custom headers on WebSocket',
    '"HTTP/1.1 browser limit of 6 connections per host" → multiple SSE tabs exhaust it; use HTTP/2 (multiplexed) or a shared worker'
  ],
  code: [
    { lang: 'js', run: true, code: `// SSE resume with Last-Event-ID, simulated without a network.
// Server keeps a bounded replay buffer of recent events.
class SseServer {
  constructor(bufferSize) { this.buf = []; this.nextId = 1; this.size = bufferSize; this.clients = new Set(); }
  publish(data) {
    const ev = { id: this.nextId++, data };
    this.buf.push(ev);
    if (this.buf.length > this.size) this.buf.shift();       // keep only recent events
    for (const c of this.clients) c.receive(ev);
  }
  connect(client, lastEventId) {
    this.clients.add(client);
    if (lastEventId != null) {
      const oldest = this.buf.length ? this.buf[0].id : this.nextId;
      if (lastEventId + 1 < oldest) client.receive({ id: null, data: 'RESYNC: gap too old, reload full state' });
      for (const ev of this.buf) if (ev.id > lastEventId) client.receive(ev);  // replay missed
    }
  }
  disconnect(client) { this.clients.delete(client); }
}
// Wire format of one event (what really goes on the socket)
const frame = (ev) => (ev.id ? 'id: ' + ev.id + '\\n' : '') + 'data: ' + ev.data + '\\n\\n';

class Client {
  constructor(name) { this.name = name; this.lastId = null; this.got = []; }
  receive(ev) { if (ev.id) this.lastId = ev.id; this.got.push(ev.data); }
}

const server = new SseServer(5);
const tab = new Client('tab');
server.connect(tab, null);
server.publish('score 1-0');
server.publish('score 1-1');
server.disconnect(tab);                         // Wi-Fi drops
server.publish('score 2-1');                     // missed while offline
server.publish('red card');
server.connect(tab, tab.lastId);                 // EventSource sends Last-Event-ID: 2
server.publish('score 3-1');
console.log(tab.got.join(' | '));
console.log(JSON.stringify(frame({ id: 5, data: 'score 3-1' })));` },
    { lang: 'js', check: false, title: 'Browser and Node server (frameworks)', code: `// Browser: SSE
const es = new EventSource('/scores', { withCredentials: true });
es.addEventListener('score', (e) => render(JSON.parse(e.data)));   // e.lastEventId set too
es.onerror = () => console.log('reconnecting...');                // automatic

// Browser: WebSocket with app-level reconnect
function connect(attempt = 0) {
  const ws = new WebSocket('wss://chat.example.com/ws');
  ws.onopen = () => { attempt = 0; ws.send(JSON.stringify({ type: 'join', room: 'r1', since: lastSeq })); };
  ws.onmessage = (m) => handle(JSON.parse(m.data));
  ws.onclose = () => setTimeout(() => connect(attempt + 1), Math.min(30000, 500 * 2 ** attempt) * Math.random());
}

// Node/Express: SSE endpoint
app.get('/scores', (req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
  const last = Number(req.headers['last-event-id'] || 0);
  for (const ev of buffer.since(last)) res.write('id: ' + ev.id + '\\ndata: ' + JSON.stringify(ev.data) + '\\n\\n');
  const hb = setInterval(() => res.write(': ping\\n\\n'), 15000);   // comment line keeps proxies awake
  const off = bus.on('score', (ev) => res.write('id: ' + ev.id + '\\nevent: score\\ndata: ' + JSON.stringify(ev.data) + '\\n\\n'));
  req.on('close', () => { clearInterval(hb); off(); });
});` }
  ],
  codeTitle: ['SSE replay buffer + Last-Event-ID (runnable JS)', 'EventSource, WebSocket reconnect and an SSE endpoint (framework code)'],
  viz: {
    title: 'Polling vs SSE vs WebSocket over 60 seconds',
    input: '5,12,13,40',
    inputLabel: 'Seconds (0-59) when the server has news, comma separated',
    gen: function (input) {
      var t = String(input || '').split(/[\s,]+/).filter(Boolean).map(Number);
      if (!t.length || t.length > 8 || t.some(function (x) { return !(x >= 0 && x < 60) || Math.floor(x) !== x; })) throw new Error('Type 1-8 whole seconds between 0 and 59, e.g. 5,12,40');
      t.sort(function (a, b) { return a - b; });
      var P = 10, frames = [];
      var pollReqs = 6, pollDelays = t.map(function (x) { return (Math.ceil((x + 0.0001) / P) * P) - x; });
      var avg = Math.round(pollDelays.reduce(function (a, b) { return a + b; }, 0) / t.length * 10) / 10;
      frames.push({ narr: 'News arrives at seconds <b>' + t.join(', ') + '</b>. Let us count requests and delay for each technique.', parts: [
        { type: 'array', label: 'news timestamps (s)', values: t }
      ] });
      frames.push({ narr: '<b>Short polling every ' + P + ' s</b>: 6 requests per minute whether or not anything changed. Each piece of news waits until the next poll.', parts: [
        { type: 'table', label: 'short polling', columns: ['news at', 'seen at', 'delay'], rows: t.map(function (x, i) { return [x + 's', (x + pollDelays[i]) + 's', pollDelays[i] + 's']; }) },
        { type: 'vars', label: 'polling totals', vals: { requests: pollReqs, emptyResponses: Math.max(0, pollReqs - new Set(t.map(function (x) { return Math.ceil((x + 0.0001) / P); })).size), avgDelay: avg + 's' }, hl: { avgDelay: 'bad' } }
      ] });
      frames.push({ narr: '<b>Long polling</b>: the request waits on the server; each news item answers it, and the client immediately asks again. Delay is near 0, but every message costs a full HTTP request.', parts: [
        { type: 'vars', label: 'long polling totals', vals: { requests: t.length + 1, avgDelay: '~RTT' } }
      ] });
      frames.push({ narr: '<b>SSE</b>: one request at second 0, the response stays open. Each news item is written as an event (<code>id: n</code>, <code>data: ...</code>). Near-zero delay, one connection, plus automatic resume.', parts: [
        { type: 'queue', label: 'events on one open response', items: t.map(function (x, i) { return 'id:' + (i + 1) + ' @' + x + 's'; }), frontLabel: 'first', backLabel: 'latest' },
        { type: 'vars', label: 'SSE totals', vals: { requests: 1, avgDelay: '~0s', heartbeats: 4 }, hl: { requests: 'ok' } }
      ] });
      frames.push({ narr: '<b>WebSocket</b>: one Upgrade handshake, then small frames in either direction (2-14 bytes of framing each). Same latency as SSE, plus the client can send too. You pay with your own reconnect and replay logic.', parts: [
        { type: 'vars', label: 'WebSocket totals', vals: { handshakes: 1, framesDown: t.length, pingPong: 4, avgDelay: '~0s' }, hl: { handshakes: 'ok' } }
      ] });
      frames.push({ narr: 'Takeaway: polling trades <b>' + avg + ' s</b> average staleness and wasted calls for simplicity. For one-way feeds pick SSE; add WebSockets when clients talk back often.', parts: [
        { type: 'table', label: 'summary', columns: ['technique', 'requests/min', 'avg delay', 'direction'], rows: [['short poll', pollReqs, avg + 's', 'pull'], ['long poll', t.length + 1, '~RTT', 'pull'], ['SSE', 1, '~0', 'server → client'], ['WebSocket', 1, '~0', 'both']], hl: { 2: 'ok', 3: 'ok' } }
      ] });
      return frames;
    }
  },
  examples: [
    { title: 'Streaming LLM tokens', html: `<p>Chat UIs POST the prompt and read the reply as <code>text/event-stream</code>: <code>data: {"delta":"Hel"}</code>, <code>data: {"delta":"lo"}</code>, ... , <code>data: [DONE]</code>. Because <code>EventSource</code> only supports GET, apps read the stream with <code>fetch()</code> + a stream reader and parse the SSE lines themselves.</p>` },
    { title: 'The WebSocket accept key', html: `<p>Key <code>dGhlIHNhbXBsZSBub25jZQ==</code> + GUID <code>258EAFA5-E914-47DA-95CA-C5AB0DC85B11</code> → SHA-1 → base64 = <code>s3pPLMBiTxaQ9kYGzzhZRbK+xOo=</code> (the RFC 6455 example). It proves the server speaks WebSocket; it is <b>not</b> authentication.</p>`, code: { lang: 'js', run: true, code: `const crypto = require('crypto');
const key = 'dGhlIHNhbXBsZSBub25jZQ==';
const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
console.log(crypto.createHash('sha1').update(key + GUID).digest('base64'));  // s3pPLMBiTxaQ9kYGzzhZRbK+xOo=` } },
    { title: 'Securing a WebSocket', html: `<p>Use <code>wss://</code> only. Check the <code>Origin</code> header (prevents cross-site WebSocket hijacking with cookies). Since browsers cannot add an <code>Authorization</code> header, either rely on a SameSite cookie or fetch a <b>short-lived single-use ticket</b> via REST and pass it in the URL or first message. Re-check authorization when the user joins a room, not just at connect, and close sockets when tokens expire.</p>` }
  ],
  deepDive: `<p>🟣 <b>Frames and limits.</b> A WebSocket frame header is 2 bytes plus 0/2/8 bytes of extended length plus a 4-byte mask on client frames. Opcodes: 0x1 text, 0x2 binary, 0x8 close (with a code like 1000 normal, 1001 going away, 1008 policy violation, 1011 server error), 0x9 ping, 0xA pong. <code>permessage-deflate</code> compresses but costs memory per connection (a sliding window per socket), which matters at 1M connections. Set max message size and rate limits per connection; a WebSocket is an open door into your server.</p>
  <p><b>Back-pressure.</b> If a slow client cannot keep up, the server's send buffer grows; check <code>bufferedAmount</code> (browser) or the socket's writable state (server) and drop, coalesce ("latest price only") or disconnect slow consumers. <b>Proxies and LBs</b> must allow Upgrade and long idle times (ALB default idle timeout is 60 s; send heartbeats every ~25-30 s). SSE responses must not be buffered or compressed by proxies (Nginx: <code>proxy_buffering off</code> or <code>X-Accel-Buffering: no</code>). <b>HTTP/2 and HTTP/3:</b> SSE multiplexes nicely over one connection; WebSockets over HTTP/2 (RFC 8441) and the newer WebTransport (over HTTP/3/QUIC) exist but HTTP/1.1 Upgrade is still the most common.</p>`,
  aiEra: `<p>🤖 <b>SSE is the AI streaming default.</b> Most LLM APIs (and MCP's HTTP transport) stream with <code>text/event-stream</code>. Knowing how SSE parses lines, how proxies buffer, and how to resume with ids is now everyday backend work, e.g. "the stream works locally but arrives in one chunk in prod" is almost always proxy buffering or compression.</p>
  <p><b>Voice and realtime agents</b> use WebSockets or WebRTC for bidirectional audio. When an assistant writes your WebSocket code, check reconnect with jittered backoff, heartbeats, Origin checks, max message size and per-room authorization; demos usually skip all five.</p>`,
  problems: [
    {
      title: 'Make an SSE Feed Survive Reconnects',
      level: 'Medium', tags: ['sse', 'reconnect', 'last-event-id'], companies: ['Atlassian', 'Zerodha'],
      statement: `<p>A live-scores SSE endpoint sends <code>data:</code> lines only. Users on trains report missing goals after tunnels. Design the fix: what the server sends, what it stores, what happens on reconnect, and what if the client was offline for an hour.</p>`,
      constraints: `10 events/s per match, 2,000 matches, single-digit seconds of replay are common; 1 hour is rare.`,
      example: `<p>Client saw ${H.c('g', 'id: 812')}, then lost signal. Reconnect sends ${H.c('b', 'Last-Event-ID: 812')}; server replays 813..now from its buffer.</p>`,
      brute: { why: `<p>Without ids the browser reconnects (EventSource does that) but the server has no idea what was missed. Replaying everything since the match started wastes bandwidth and may duplicate effects on the client.</p>` },
      mcq: { q: 'Which header does EventSource send on reconnect?', options: ['If-None-Match', 'Last-Event-ID', 'Retry-After', 'Sec-WebSocket-Key'], answer: 1, explain: 'It carries the id of the last event the browser processed.' },
      hints: [
        `<p>Give every event a monotonic id per stream (per match), and send it with <code>id:</code>.</p>`,
        `<p>Keep a bounded ring buffer per match (e.g. last 5 minutes) in Redis Streams or memory.</p>`,
        `<p>On reconnect: if Last-Event-ID is in the buffer, replay newer events; if it is older, send a "resync" event telling the client to fetch a full snapshot via REST.</p>`
      ],
      solution: {
        approach: `<p>Each event gets <code>id: &lt;matchSeq&gt;</code> (monotonic per match), an <code>event:</code> type, and a JSON <code>data:</code>. Store the last ~5 minutes per match in a ring buffer (Redis Stream with MAXLEN, ~3,000 entries per match). Send <code>retry: 3000</code> and a heartbeat comment every 15 s. On reconnect read <code>Last-Event-ID</code>: if it is within the buffer, replay newer events in order then continue live; if it is too old (the 1-hour case), send <code>event: resync</code> and the client calls <code>GET /matches/{id}/snapshot</code>, then resubscribes from the snapshot's sequence. Clients ignore events with id ≤ last seen (dedupe).</p>`,
        code: { lang: 'js', run: true, code: `function onReconnect(buffer, lastId) {
  if (buffer.length === 0) return { action: 'live' };
  if (lastId < buffer[0].id - 1) return { action: 'resync' };
  return { action: 'replay', events: buffer.filter(e => e.id > lastId).map(e => e.id) };
}
const buf = [{ id: 810 }, { id: 811 }, { id: 812 }, { id: 813 }, { id: 814 }];
console.log(JSON.stringify(onReconnect(buf, 812)));   // replay 813, 814
console.log(JSON.stringify(onReconnect(buf, 700)));   // resync
console.log(JSON.stringify(onReconnect(buf, 814)));   // replay nothing` },
        complexity: `<p>Replay is O(missed events); memory is O(buffer size × matches) ≈ 6M small entries.</p>`,
        followUps: ['How does this change with 20 server instances behind a load balancer?', 'Would WebSockets make this easier or harder?']
      }
    }
  ]
});

/* =====================================================================
   TOPIC 8 — Scaling connections and fan-out
   ===================================================================== */
topics.push({
  title: 'Scaling Real-Time: Millions of Connections, Rooms and Fan-Out',
  analogy: `<p>A stadium announcer cannot shout to 80,000 people alone. The stadium has <b>section speakers</b> (gateway servers), each wired to a central <b>mixing desk</b> (pub/sub bus). The announcer speaks once into the desk; every section speaker plays it to its own seats. Adding seats means adding speakers, not a louder announcer.</p>`,
  explain: `<p>🟢 <b>Connections are state.</b> A REST request lives for 50 ms; a WebSocket lives for hours. Each open connection costs a file descriptor, a few KB to tens of KB of memory (buffers, TLS state), and heartbeat traffic. A well-tuned server (Go, Netty, Node with uWebSockets, Erlang/Elixir) holds <b>hundreds of thousands to ~1M idle connections</b>; real busy chat servers often plan for 50k-200k per box.</p>
  <p><b>The core problem.</b> User A is connected to gateway 1, user B to gateway 7. When A sends to room "r1", how does gateway 7 learn about it? Answer: separate <b>connection handling</b> from <b>message routing</b>.</p>
  ${H.table(['Layer', 'Job', 'Examples'], [
    ['Gateway (edge)', 'terminate WebSocket/SSE, auth, heartbeats, local room membership', 'Netty/Go servers, AWS API Gateway WebSocket, Socket.IO nodes'],
    ['Pub/sub bus', 'deliver each room message to every gateway with members', 'Redis Pub/Sub or Streams, NATS, Kafka, Google Pub/Sub'],
    ['Presence/registry', 'who is online, which gateway holds which user', 'Redis with TTL, consistent hashing'],
    ['History store', 'durable messages for replay and offline users', 'Cassandra/ScyllaDB, DynamoDB, Postgres']
  ])}
  <p><b>Fan-out math.</b> A room with M members, each message reaches M sockets. 10,000 rooms × 50 msgs/min × 20 members = 10M deliveries per minute. A celebrity broadcast to 2M followers is a different shape: <b>publish once per gateway</b>, then each gateway loops over its local members. The bus carries G copies (one per gateway), not M.</p>
  <p><b>Load balancing.</b> Connections are long-lived, so round-robin at connect time slowly gets unbalanced after deploys and scale-outs. Use least-connections, cap connections per node, and on deploy <b>drain</b>: send a "reconnect soon" message with jitter so 1M clients do not stampede back at once (the <b>thundering herd</b>).</p>`,
  clues: [
    '"Design WhatsApp / Slack / live comments / multiplayer lobby" → gateways + pub/sub + presence + history',
    '"User on server A messages user on server B" → pub/sub between gateways or a user → gateway registry',
    '"10M concurrent connections" → ~50-100 gateway nodes, horizontal; state outside gateways',
    '"Deploy without dropping everyone" → connection draining + jittered reconnect + resume tokens',
    '"Slow consumer" → bounded per-connection queue, drop/coalesce, disconnect',
    '"Sticky sessions?" → needed for Socket.IO long-polling fallback; plain WebSockets stick by nature (one TCP connection)'
  ],
  code: [
    { lang: 'js', run: true, code: `// Room fan-out across gateways via a pub/sub bus (in-memory model).
class Bus {                                   // stands in for Redis Pub/Sub / NATS
  constructor() { this.subs = new Map(); this.published = 0; }
  subscribe(topic, fn) { if (!this.subs.has(topic)) this.subs.set(topic, new Set()); this.subs.get(topic).add(fn); }
  unsubscribe(topic, fn) { const s = this.subs.get(topic); if (s) { s.delete(fn); if (!s.size) this.subs.delete(topic); } }
  publish(topic, msg) { this.published++; for (const fn of this.subs.get(topic) || []) fn(msg); }
}

class Gateway {
  constructor(name, bus) { this.name = name; this.bus = bus; this.rooms = new Map(); this.sent = 0; this.handlers = new Map(); }
  join(room, user) {
    if (!this.rooms.has(room)) {
      this.rooms.set(room, new Set());
      const h = (msg) => this.deliverLocal(room, msg);   // ONE bus subscription per room per gateway
      this.handlers.set(room, h);
      this.bus.subscribe('room:' + room, h);
    }
    this.rooms.get(room).add(user);
  }
  leave(room, user) {
    const members = this.rooms.get(room);
    if (!members) return;
    members.delete(user);
    if (members.size === 0) {                      // last local member: stop listening
      this.rooms.delete(room);
      this.bus.unsubscribe('room:' + room, this.handlers.get(room));
      this.handlers.delete(room);
    }
  }
  send(room, from, text) { this.bus.publish('room:' + room, { from, text }); }
  deliverLocal(room, msg) {
    for (const user of this.rooms.get(room) || []) {
      if (user === msg.from) continue;             // do not echo to the sender
      this.sent++;                                 // ws.send(...) in real life
    }
  }
}

const bus = new Bus();
const gws = [new Gateway('gw1', bus), new Gateway('gw2', bus), new Gateway('gw3', bus)];
for (let u = 0; u < 3000; u++) gws[u % 3].join('final-match', 'u' + u);   // 3,000 fans
gws[1].join('dev-chat', 'alice'); gws[2].join('dev-chat', 'bob');

gws[0].send('final-match', 'u0', 'GOAL!');
gws[1].send('dev-chat', 'alice', 'hi bob');
gws[2].leave('dev-chat', 'bob');
gws[1].send('dev-chat', 'alice', 'anyone?');

console.log('bus publishes  :', bus.published);
console.log('socket sends   :', gws.map(g => g.name + '=' + g.sent).join(' '));
console.log('gw3 rooms now  :', [...gws[2].rooms.keys()].join(','));` },
    { lang: 'java', code: `// Per-connection bounded outbox: protects the server from slow consumers.
import java.util.*;

public class SlowConsumerDemo {
    static class Conn {
        final String id; final int cap; final ArrayDeque<String> outbox = new ArrayDeque<>();
        int dropped = 0; boolean closed = false;
        Conn(String id, int cap) { this.id = id; this.cap = cap; }

        void offer(String msg, boolean coalescable) {
            if (closed) return;
            if (outbox.size() < cap) { outbox.add(msg); return; }
            if (coalescable) {                 // e.g. price ticks: keep only the newest
                outbox.pollLast(); outbox.add(msg); dropped++;
            } else {                           // chat: cannot drop silently -> disconnect, client resumes
                closed = true;
                System.out.println(id + " too slow: closing with 1008, client will resume from last seq");
            }
        }
        void drain(int n) { for (int i = 0; i < n && !outbox.isEmpty(); i++) outbox.poll(); }
    }

    public static void main(String[] args) {
        Conn fast = new Conn("fast", 4), slow = new Conn("slow", 4), chatty = new Conn("chat-slow", 4);
        for (int i = 1; i <= 10; i++) {
            fast.offer("tick" + i, true);  fast.drain(1);     // keeps up
            slow.offer("tick" + i, true);                      // never reads
            chatty.offer("msg" + i, false);
        }
        System.out.println("fast outbox=" + fast.outbox + " dropped=" + fast.dropped);
        System.out.println("slow outbox=" + slow.outbox + " dropped=" + slow.dropped);
        System.out.println("chat-slow closed=" + chatty.closed);
    }
}` }
  ],
  codeTitle: ['Room manager with pub/sub fan-out (runnable JS)', 'Slow-consumer protection with a bounded outbox (plain Java)'],
  viz: {
    title: 'One message, many gateways',
    input: '4,3,0,5',
    inputLabel: 'Room members on each gateway gw1..gw4 (0-9 each)',
    gen: function (input) {
      var m = String(input || '').split(/[\s,]+/).filter(Boolean).map(Number);
      if (m.length !== 4 || m.some(function (x) { return !(x >= 0 && x <= 9) || Math.floor(x) !== x; })) throw new Error('Type exactly 4 counts (0-9), e.g. 4,3,0,5');
      if (!m[0]) throw new Error('gw1 needs at least 1 member: the sender is there');
      var nodes = [
        { id: 'A', label: 'sender (on gw1)', x: 8, y: 30, shape: 'box' },
        { id: 'bus', label: 'pub/sub bus', x: 45, y: 30, shape: 'box' },
        { id: 'g1', label: 'gw1: ' + m[0], x: 85, y: 4, shape: 'box' },
        { id: 'g2', label: 'gw2: ' + m[1], x: 85, y: 22, shape: 'box' },
        { id: 'g3', label: 'gw3: ' + m[2], x: 85, y: 40, shape: 'box' },
        { id: 'g4', label: 'gw4: ' + m[3], x: 85, y: 58, shape: 'box' }
      ];
      var edges = [['A', 'bus'], ['bus', 'g1'], ['bus', 'g2'], ['bus', 'g3'], ['bus', 'g4']];
      var steps = [], sends = 0, copies = 0;
      steps.push({ n: 'A', narr: 'A user on gw1 posts to room <b>r1</b>. Gateways that hold r1 members have each subscribed <b>once</b> to <code>room:r1</code> on the bus.', tags: { g3: m[2] ? '' : 'not subscribed' } });
      steps.push({ e: 'A-bus', n: 'bus', narr: 'gw1 publishes the message <b>once</b> to <code>room:r1</code> (after saving it to history with a sequence number).' });
      ['g1', 'g2', 'g3', 'g4'].forEach(function (g, i) {
        if (m[i] === 0) { steps.push({ n: g, narr: g.replace('g', 'gw') + ' has no members in r1, so it never subscribed and gets <b>nothing</b>. That is why gateways unsubscribe when the last local member leaves.' }); return; }
        copies++;
        var local = i === 0 ? m[i] - 1 : m[i];
        sends += local;
        steps.push({ e: 'bus-' + g, n: g, narr: 'Bus delivers 1 copy to ' + g.replace('g', 'gw') + '. It loops over its ' + m[i] + ' local member(s)' + (i === 0 ? ' (skipping the sender)' : '') + ' and writes ' + local + ' frame(s).', tags: { bus: copies + ' copies', A: sends + ' socket writes' } });
      });
      steps.push({ n: 'bus', narr: 'Totals: <b>1</b> publish, <b>' + copies + '</b> bus copies, <b>' + sends + '</b> socket writes. Bus traffic grows with the number of <i>gateways</i>, socket writes with the number of <i>members</i>.', tags: { bus: copies + ' copies', A: sends + ' socket writes' } });
      return flowFrames('Room r1 fan-out', nodes, edges, steps);
    }
  },
  examples: [
    { title: 'Capacity estimate: 10M concurrent users', html: `<p>Assume 100k connections per gateway with headroom → 100 gateways (+30% for failover and deploys). Heartbeat every 30 s → 333k pings/s total, cheap. Memory ≈ 10M × ~20 KB ≈ 200 GB across the fleet. Peak sends: 10M users × 1 msg received per 10 s → 1M socket writes/s, about 10k/s per gateway. Bottleneck is usually the bus and presence store, not the gateways.</p>` },
    { title: 'Direct message routing', html: `<p>For 1:1 chat, a pub/sub topic per user also works: gateway subscribes to <code>user:{id}</code> when that user connects. Alternative: a presence registry <code>user → gateway</code> in Redis (with TTL refreshed by heartbeats) and direct gateway-to-gateway RPC. Users with several devices map to several gateways.</p>` },
    { title: 'Deploying gateways without a stampede', html: `<p>Mark the node draining (LB stops sending new connections), send each client a close code 1001 or an app message <code>{"type":"reconnect","after_ms": random(0, 60000)}</code>, wait, then terminate. Clients resume with their last sequence number, so nothing is lost. Without jitter, 100k clients reconnecting in the same second overload auth and presence.</p>` }
  ],
  deepDive: `<p>🟣 <b>Delivery guarantees.</b> Redis Pub/Sub is fire-and-forget: if a gateway restarts it misses messages. That is acceptable only if clients can resume from a durable log. Common design: persist the message with a per-room sequence (DB or Kafka/Redis Streams) → publish → gateways push → clients ack the highest sequence; on reconnect the client sends its last sequence and the gateway replays from history. This gives <b>at-least-once</b> delivery; clients dedupe by message id to get effectively-once display. Ordering is per room (one partition or sequence per room), not global.</p>
  <p><b>Hot rooms.</b> One room with 1M members (a live event) breaks per-room partitioning: shard the room's fan-out into a tree (bus → regional relays → gateways), sample or rate-limit chatty senders, and coalesce (e.g. send "1,203 new comments" instead of each). <b>OS tuning:</b> raise <code>ulimit -n</code>, ephemeral port ranges on proxies, and TCP keepalive; prefer a non-blocking server (epoll/kqueue) over thread-per-connection. <b>Managed options:</b> AWS API Gateway WebSockets, Azure Web PubSub, Ably, Pusher, Cloudflare Durable Objects move connection state off your fleet at a per-message price.</p>`,
  aiEra: `<p>🤖 <b>AI features are real-time features.</b> Streaming agent progress, collaborative AI editing, and voice assistants all keep connections open for minutes. Long LLM calls (30-120 s) are exactly where proxies time out and where resume tokens and heartbeats pay off.</p>
  <p><b>Work with AI:</b> assistants produce good back-of-envelope estimates if you give them the inputs (connections, message rate, room sizes); ask them to show every multiplication so you can check it. They often forget that pub/sub without persistence loses messages on restarts and that reconnect storms after a deploy can be the biggest load spike of the day. Bring those up yourself in design reviews.</p>`,
  problems: [
    {
      title: 'Design the Fan-Out for Live Match Comments',
      level: 'Hard', tags: ['websockets', 'fan-out', 'pub/sub'], companies: ['Hotstar', 'Twitch'],
      statement: `<p>A cricket final has 20M viewers watching live comments. About 50,000 comments per second are posted at peak. Design connection handling, fan-out and protections. Viewers do not need every comment.</p>`,
      constraints: `200 gateway nodes with 100k connections each; comments must appear within ~2 s; the system must survive one gateway crashing.`,
      example: `<p>Naive: each comment to every viewer = 50,000 × 20M = ${H.c('r', '10<sup>12</sup> writes/s')}: impossible. Sampled: ~20 comments/s per viewer × 20M = ${H.c('g', '4×10<sup>8</sup> writes/s')}, about 2M per gateway per second, batched into ~1 frame/s per viewer.</p>`,
      brute: { why: `<p>Treating it like a chat room (deliver everything to everyone) multiplies posts by viewers. A single Redis Pub/Sub channel delivering 50k msgs/s to 200 subscribers is also 10M deliveries/s through one node.</p>` },
      mcq: { q: 'What makes this feasible?', options: ['Bigger Redis', 'Sampling/aggregating comments and batching frames per viewer', 'Polling every second', 'Sticky sessions'], answer: 1, explain: 'Viewers cannot read 50k comments/s anyway; reduce at the source and batch per frame.' },
      hints: [
        `<p>Compute the naive writes per second. Then ask what a human can actually read per second.</p>`,
        `<p>Reduce before fan-out: moderation + sampling service picks ~20 comments/s; publish that stream to gateways (one copy each).</p>`,
        `<p>Each gateway batches the sampled comments into one frame per viewer per second; slow clients get coalesced frames; crashed gateway's clients reconnect with jitter to others.</p>`
      ],
      solution: {
        approach: `<p><b>Ingest:</b> comments go via REST/WebSocket to an ingest service → Kafka (partitioned by match). <b>Reduce:</b> a sampler/moderation service consumes all 50k/s, filters abuse, and emits a curated stream of ~20/s (plus friends' comments routed per user via a user topic). <b>Fan-out:</b> the curated stream is published to a bus (Kafka/NATS) that each of the 200 gateways subscribes to once: 200 copies, not 20M. <b>Gateways</b> batch everything for the last second into one frame per viewer (~4×10<sup>8</sup> comments/s fleet-wide, 20M frames/s), with bounded per-connection queues that drop old batches for slow clients. <b>Resilience:</b> a gateway crash makes 100k clients reconnect with jittered backoff (spread over ~30 s) to other nodes, which run with 30% headroom; clients do not need replay of sampled comments (gaps are fine). Counts/likes are aggregated server-side and pushed as numbers.</p>`,
        complexity: `<p>Bus traffic O(gateways), socket frames O(viewers per second), independent of raw post rate.</p>`,
        followUps: ['How do you show a user their own comment instantly?', 'How do you rate-limit spammers without blocking the ingest path?']
      }
    }
  ]
});

/* =====================================================================
   PRACTICE ARENA
   ===================================================================== */
practice.push({
  title: 'Write the GraphQL Query for a Screen',
  level: 'Easy', tags: ['graphql', 'queries'], companies: ['Shopify', 'Airbnb'],
  statement: `<p>Schema: <code>type Query { product(id: ID!): Product }</code>, <code>type Product { id: ID! name: String! price: Money! images(first: Int!): [Image!]! reviews(first: Int!, after: String): ReviewConnection! }</code>. The product page shows name, price amount and currency, the first 3 image URLs and the first 5 reviews (rating, text, author name). Write the query using a variable for the id.</p>`,
  constraints: `One operation; no fields the page does not show.`,
  example: `<p>Response shape mirrors the query exactly: <code>{"data":{"product":{"name":"Mug","price":{...},"images":[...],"reviews":{"edges":[...]}}}}</code>.</p>`,
  brute: { why: `<p>Asking for every field "just in case" brings back over-fetching, costs more points under cost limits, and couples the client to fields it never uses (making them harder to deprecate).</p>` },
  mcq: { q: 'Why use a variable ($id) instead of writing the id into the query string?', options: ['It is required by HTTP', 'The query text stays constant, so it can be persisted/cached and is safe from string injection', 'Variables are faster to parse', 'Ids cannot be literals'], answer: 1, explain: 'Constant documents enable persisted queries and avoid building queries by concatenation.' },
  hints: [
    `<p>Start with <code>query ProductPage($id: ID!) { product(id: $id) { ... } }</code>.</p>`,
    `<p>Lists with arguments: <code>images(first: 3)</code>; connections use <code>edges { node { ... } }</code>.</p>`,
    `<p>Nest <code>author { name }</code> inside each review node and add <code>pageInfo { hasNextPage endCursor }</code> for "load more".</p>`
  ],
  solution: {
    approach: `<p>Name the operation (helps logging and persisted queries), declare <code>$id: ID!</code>, and select only displayed fields. Include <code>pageInfo</code> so the "more reviews" button can pass <code>after: endCursor</code>. The server will run <code>Product.reviews</code> once and <code>Review.author</code> per review, so it should batch authors with a DataLoader.</p>`,
    code: { lang: 'text', check: false, code: `query ProductPage($id: ID!) {
  product(id: $id) {
    name
    price { amount currency }
    images(first: 3) { url }
    reviews(first: 5) {
      edges { node { rating text author { name } } }
      pageInfo { hasNextPage endCursor }
    }
  }
}` },
    complexity: `<p>Cost ≈ 1 + 1 + 3 + 5×2 = ~15 points.</p>`
  }
});

practice.push({
  title: 'Decode a Protobuf Message by Hand',
  level: 'Easy', tags: ['protobuf', 'varint', 'wire format'], companies: ['Google', 'Cloudflare'],
  statement: `<p>Message: <code>message Item { string sku = 1; int32 qty = 2; }</code>. Decode the bytes <code>0a 03 41 42 43 10 ac 02</code> into field values.</p>`,
  constraints: `Tag = (field_number &lt;&lt; 3) | wire_type. Wire type 0 = varint, 2 = length-delimited.`,
  example: `<p>${H.c('b', '0a')} = 00001010 → field 1, wire type 2. ${H.c('b', '03')} = length 3. ${H.c('g', '41 42 43')} = "ABC".</p>`,
  brute: { why: `<p>Reading bytes as fixed-size integers fails: varints are variable length and the high bit of each byte is a continuation flag, not part of the number.</p>` },
  mcq: { q: 'What is the value of the varint ac 02?', options: ['172', '300', '556', '44'], answer: 1, explain: '0xac → low 7 bits 0x2c = 44, more follows; 0x02 → 2 × 128 = 256; 44 + 256 = 300.' },
  hints: [
    `<p>Split each tag byte: low 3 bits = wire type, rest = field number.</p>`,
    `<p>Varint: take the low 7 bits of each byte, the first byte is the least significant group; stop at a byte whose high bit is 0.</p>`,
    `<p>0x10 → field 2 varint; ac 02 → 44 + 2×128 = 300. Result: sku = "ABC", qty = 300.</p>`
  ],
  solution: {
    approach: `<p>Read a tag varint, split it, then read the value according to the wire type, repeat until the end.</p>`,
    code: { lang: 'js', run: true, code: `function readVarint(buf, pos) {
  let result = 0, shift = 0, b;
  do {
    b = buf[pos++];
    result += (b & 0x7f) * 2 ** shift;   // multiply avoids 32-bit overflow in JS
    shift += 7;
  } while (b & 0x80);
  return [result, pos];
}
function decode(bytes) {
  const out = {};
  let pos = 0;
  while (pos < bytes.length) {
    let tag; [tag, pos] = readVarint(bytes, pos);
    const field = tag >>> 3, wire = tag & 7;
    if (wire === 0) { let v; [v, pos] = readVarint(bytes, pos); out[field] = v; }
    else if (wire === 2) {
      let len; [len, pos] = readVarint(bytes, pos);
      out[field] = String.fromCharCode(...bytes.slice(pos, pos + len)); pos += len;
    } else throw new Error('wire type ' + wire + ' not handled in this demo');
  }
  return out;
}
const bytes = '0a 03 41 42 43 10 ac 02'.split(' ').map(h => parseInt(h, 16));
console.log(decode(bytes));   // { '1': 'ABC', '2': 300 }` },
    complexity: `<p>O(bytes). Unknown fields can be skipped using the wire type alone, which is what makes additions compatible.</p>`
  }
});

practice.push({
  title: 'SSE or WebSocket? Five Features',
  level: 'Easy', tags: ['sse', 'websockets'], companies: ['Notion', 'Slack'],
  statement: `<p>Pick SSE, WebSocket, or plain polling for: (1) build-log streaming in a CI dashboard; (2) a shared whiteboard; (3) a weekly report "ready" badge; (4) streaming an AI answer token by token; (5) a multiplayer quiz with answer buzzers.</p>`,
  constraints: `Prefer the simplest option that meets latency needs.`,
  example: `<p>(3) ${H.c('g', 'polling')} (or check on page load): updates once a week; an open connection per user is waste.</p>`,
  brute: { why: `<p>"WebSockets everywhere" adds stateful infrastructure, custom reconnect logic and proxy issues for features that only need one-way pushes or rare checks.</p>` },
  mcq: { q: 'Which feature needs client → server messages at high frequency?', options: ['Build logs', 'AI answer stream', 'Shared whiteboard', 'Report badge'], answer: 2, explain: 'Every stroke goes up and must reach others quickly.' },
  hints: [
    `<p>Ask: who sends, how often, how fast must it arrive?</p>`,
    `<p>One-way and frequent → SSE. Two-way and frequent → WebSocket. Rare → poll or fetch on demand.</p>`,
    `<p>Buzzer games need lowest latency both ways; whiteboards too. Logs and AI tokens flow one way.</p>`
  ],
  solution: {
    approach: `<p>(1) <b>SSE</b>: server streams log lines; Last-Event-ID resumes at the right line after a reconnect. (2) <b>WebSocket</b>: strokes and cursors flow both ways continuously (often with CRDTs). (3) <b>Polling</b> or fetch on page load, maybe a push notification. (4) <b>SSE</b> (or a streamed fetch response): the standard for LLM output. (5) <b>WebSocket</b>: buzzes go up instantly and results go down; fairness needs server timestamps.</p>`,
    complexity: `<p>Open connections cost memory per user; choose them only where latency demands it.</p>`
  }
});

practice.push({
  title: 'Spot the Breaking GraphQL Changes',
  level: 'Easy', tags: ['graphql', 'schema evolution'], companies: ['GitHub', 'Meta'],
  statement: `<p>Which of these schema changes break existing clients? (a) add field <code>User.avatarUrl: String</code>; (b) remove <code>User.nickname</code>; (c) add required arg <code>posts(orderBy: PostOrder!)</code>; (d) add optional arg <code>posts(orderBy: PostOrder)</code>; (e) change output <code>User.email: String!</code> to <code>String</code>; (f) change input field <code>CreateUserInput.phone: String</code> to <code>String!</code>.</p>`,
  constraints: `Clients are mobile apps that update slowly.`,
  example: `<p>(a) ${H.c('g', 'safe')}: nobody asks for it yet. (b) ${H.c('r', 'breaking')}: old queries now fail validation.</p>`,
  brute: { why: `<p>Assuming "GraphQL has no versions, so anything goes" breaks old app versions in users' pockets. Validation fails the whole operation, not just one field.</p>` },
  mcq: { q: 'Making an OUTPUT field nullable (String! → String) is...', options: ['Always safe', 'Breaking: clients generated with non-null types may crash on null', 'Only breaking for mutations', 'Impossible'], answer: 1, explain: 'Typed clients assumed it could never be null.' },
  hints: [
    `<p>For outputs, ask: can an old query still validate and can old code handle the values?</p>`,
    `<p>For inputs, ask: can old clients still send what they used to send?</p>`,
    `<p>Sort them: four of the six break old clients; only the purely additive output field and the optional argument are safe.</p>`
  ],
  solution: {
    approach: `<p>Safe: (a) additive output field, (d) optional argument with server default. Breaking: (b) removed field fails validation (deprecate first and remove when usage is zero); (c) old queries omit the required arg; (e) loosening output nullability can crash typed clients; (f) tightening input nullability rejects old mutations that omit phone. Run schema checks (graphql-inspector, Apollo checks) against recorded operations in CI.</p>`,
    complexity: `<p>Diff of two schemas: linear in schema size.</p>`
  }
});

practice.push({
  title: 'Implement a DataLoader With maxBatchSize',
  level: 'Medium', tags: ['dataloader', 'batching', 'promises'], companies: ['Meta', 'Netflix'],
  statement: `<p>Implement <code>createLoader(batchFn, {maxBatchSize})</code> with <code>load(key)</code>: requests made in the same tick are batched, duplicate keys share a promise, batches are split to at most <code>maxBatchSize</code> keys, and errors returned for a single key reject only that key.</p>`,
  constraints: `batchFn(keys) resolves to an array of the same length; an element may be an Error instance.`,
  example: `<p>10 loads of keys 1..5 (each twice), maxBatchSize 2 → batchFn calls: ${H.c('g', '[1,2] [3,4] [5]')}.</p>`,
  brute: { why: `<p>Calling batchFn per load is N+1 again. One unbounded batch may build an <code>IN</code> list with 50,000 ids, exceeding database parameter limits.</p>` },
  mcq: { q: 'When should the loader dispatch?', options: ['Immediately on each load', 'After the current tick, once all synchronous loads are queued', 'Every 100 ms', 'When the queue reaches 1000'], answer: 1, explain: 'Waiting one tick collects all siblings resolved in the same level.' },
  hints: [
    `<p>Keep a cache Map key → promise and a queue of {key, resolve, reject}.</p>`,
    `<p>Schedule dispatch with <code>process.nextTick</code>/<code>queueMicrotask</code> when the queue goes from empty to non-empty.</p>`,
    `<p>On dispatch, slice the queue into chunks; for each chunk call batchFn and resolve/reject per index (reject if the value is an Error).</p>`
  ],
  solution: {
    approach: `<p>Dedupe through a promise cache, queue new keys, dispatch once per tick, chunk by maxBatchSize, and map results back by index. Per-key Errors reject only that promise; a thrown batch rejects the whole chunk.</p>`,
    code: { lang: 'js', run: true, code: `function createLoader(batchFn, { maxBatchSize = Infinity } = {}) {
  const cache = new Map();
  let queue = [];
  function dispatch() {
    const all = queue; queue = [];
    for (let i = 0; i < all.length; i += maxBatchSize) {
      const chunk = all.slice(i, i + maxBatchSize);
      Promise.resolve(batchFn(chunk.map(c => c.key))).then(values => {
        if (!Array.isArray(values) || values.length !== chunk.length) throw new Error('batchFn must return ' + chunk.length + ' values');
        chunk.forEach((c, j) => values[j] instanceof Error ? c.reject(values[j]) : c.resolve(values[j]));
      }).catch(err => chunk.forEach(c => c.reject(err)));
    }
  }
  return {
    load(key) {
      if (cache.has(key)) return cache.get(key);
      const p = new Promise((resolve, reject) => {
        queue.push({ key, resolve, reject });
        if (queue.length === 1) process.nextTick(dispatch);
      });
      cache.set(key, p);
      return p;
    },
    clear(key) { cache.delete(key); }
  };
}

const calls = [];
const loader = createLoader(async (keys) => {
  calls.push(keys);
  return keys.map(k => (k === 4 ? new Error('no user 4') : 'user' + k));
}, { maxBatchSize: 2 });

const keys = [1, 2, 3, 4, 5, 1, 2, 3, 4, 5];
Promise.allSettled(keys.map(k => loader.load(k))).then(rs => {
  console.log('batches:', JSON.stringify(calls));
  console.log(rs.map(r => r.status === 'fulfilled' ? r.value : 'ERR').join(','));
});` },
    complexity: `<p>O(N) per tick for N loads; batch count ⌈distinct / maxBatchSize⌉.</p>`,
    followUps: ['How would you make the cache expire across requests safely?', 'How do you prime the cache after a mutation?']
  }
});

practice.push({
  title: 'Encode a Cursor and Paginate a Connection',
  level: 'Medium', tags: ['graphql', 'pagination', 'cursor'], companies: ['Stripe', 'Twitter'],
  statement: `<p>Implement <code>posts(first, after)</code> over an array sorted by <code>(createdAt DESC, id DESC)</code>. Return a Relay connection with edges, cursors (opaque base64 of <code>createdAt|id</code>) and <code>pageInfo { hasNextPage, endCursor }</code>. A new post inserted at the top between page requests must not cause duplicates.</p>`,
  constraints: `first between 1 and 100; reject malformed cursors.`,
  example: `<p>Page 1 ends at ${H.c('b', '(1700,42)')}. A new post (1800,50) arrives. Page 2 starts strictly after (1700,42), so no post repeats.</p>`,
  brute: { why: `<p>Offset pagination (<code>skip: 10</code>) shows post 10 twice when a new item is inserted at the top, and deep offsets scan many rows.</p>` },
  mcq: { q: 'Why include id in the cursor?', options: ['For logging', 'createdAt is not unique; id breaks ties so the position is exact', 'GraphQL requires it', 'Shorter cursors'], answer: 1, explain: 'Two posts in the same millisecond would otherwise be skipped or repeated.' },
  hints: [
    `<p>Cursor = base64("createdAt|id"). Decode it to a tuple.</p>`,
    `<p>Filter items strictly "after" the tuple in sort order: createdAt &lt; c, or createdAt == c and id &lt; i.</p>`,
    `<p>Fetch first + 1 items to know hasNextPage without a COUNT.</p>`
  ],
  solution: {
    approach: `<p>Keyset pagination wrapped in the connection shape. Fetch one extra row to compute hasNextPage. In SQL: <code>WHERE (created_at, id) &lt; (?, ?) ORDER BY created_at DESC, id DESC LIMIT first+1</code> with an index on (created_at, id).</p>`,
    code: { lang: 'js', run: true, code: `const enc = (p) => Buffer.from(p.createdAt + '|' + p.id).toString('base64');
function dec(c) {
  const parts = Buffer.from(c, 'base64').toString().split('|').map(Number);
  if (parts.length !== 2 || parts.some(Number.isNaN)) throw new Error('bad cursor');
  return parts;
}
function posts(all, first, after) {
  if (!(first >= 1 && first <= 100)) throw new Error('first must be 1..100');
  let rows = all;
  if (after) {
    const [c, i] = dec(after);
    rows = all.filter(p => p.createdAt < c || (p.createdAt === c && p.id < i));
  }
  const page = rows.slice(0, first + 1);            // one extra to detect next page
  const hasNextPage = page.length > first;
  const edges = page.slice(0, first).map(p => ({ cursor: enc(p), node: p }));
  return { edges, pageInfo: { hasNextPage, endCursor: edges.length ? edges[edges.length - 1].cursor : null } };
}
const sortDesc = (a, b) => b.createdAt - a.createdAt || b.id - a.id;
let data = [[1700, 42], [1700, 41], [1650, 40], [1600, 39], [1500, 38]].map(([createdAt, id]) => ({ createdAt, id }));
const p1 = posts(data, 2);
console.log('page1', p1.edges.map(e => e.node.id), p1.pageInfo.hasNextPage);
data = [{ createdAt: 1800, id: 50 }, ...data].sort(sortDesc);   // new post on top
const p2 = posts(data, 2, p1.pageInfo.endCursor);
console.log('page2', p2.edges.map(e => e.node.id), p2.pageInfo.hasNextPage);
const p3 = posts(data, 2, p2.pageInfo.endCursor);
console.log('page3', p3.edges.map(e => e.node.id), p3.pageInfo.hasNextPage);` },
    complexity: `<p>O(log n + first) with the composite index; this demo filters an array in O(n).</p>`
  }
});

practice.push({
  title: 'Build a Proto Breaking-Change Checker',
  level: 'Medium', tags: ['protobuf', 'compatibility', 'ci'], companies: ['Uber', 'Lyft'],
  statement: `<p>Given old and new field lists <code>[number, name, type]</code> and the new schema's reserved numbers, report errors for: deleted fields not reserved, reused reserved numbers, wire-type changes, and a number whose name changed to a different meaning while also changing type. Report renames as warnings.</p>`,
  constraints: `Types: int32, int64, uint32, bool, enum (varint); string, bytes, message (len); fixed32/float (i32); fixed64/double (i64).`,
  example: `<p>Old 3:<code>string note</code>, new 3:<code>int32 count</code> → ${H.c('r', 'error: wire type len → varint')}.</p>`,
  brute: { why: `<p>Diffing field names misses everything that matters: the wire only knows numbers and wire types. A name-based diff would call a renumbering "no change".</p>` },
  mcq: { q: 'Which change passes a WIRE-level check but fails a JSON-level check?', options: ['Reusing a number', 'Renaming a field', 'string → int32', 'Deleting without reserved'], answer: 1, explain: 'JSON uses names; binary uses numbers.' },
  hints: [
    `<p>Index both schemas by field number, never by name, because only numbers travel on the wire.</p>`,
    `<p>Map each type to its wire group; compare groups for the same number.</p>`,
    `<p>Missing in new → must be in reserved; present in new and reserved in old → error.</p>`
  ],
  solution: {
    approach: `<p>Group types by wire encoding, then walk old fields by number: missing → require reserved; present → compare wire group (error) and exact type (warning) and name (warning). Then check new fields against reserved numbers. This is a simplified <code>buf breaking</code>.</p>`,
    code: { lang: 'js', run: true, code: `const GROUP = { int32: 'varint', int64: 'varint', uint32: 'varint', uint64: 'varint', bool: 'varint', enum: 'varint',
  string: 'len', bytes: 'len', message: 'len', fixed32: 'i32', float: 'i32', fixed64: 'i64', double: 'i64' };
function check(oldF, newF, newReserved, oldReserved = []) {
  const byNum = (fs) => new Map(fs.map(([n, name, type]) => [n, { name, type }]));
  const o = byNum(oldF), n = byNum(newF), out = [];
  for (const [num, f] of o) {
    const g = n.get(num);
    if (!g) { if (!newReserved.includes(num)) out.push('ERROR ' + num + ' ' + f.name + ' deleted without reserved'); continue; }
    if (GROUP[f.type] !== GROUP[g.type]) out.push('ERROR ' + num + ' wire ' + GROUP[f.type] + ' -> ' + GROUP[g.type]);
    else if (f.type !== g.type) out.push('WARN  ' + num + ' ' + f.type + ' -> ' + g.type + ' (may truncate)');
    if (f.name !== g.name) out.push('WARN  ' + num + ' renamed ' + f.name + ' -> ' + g.name);
  }
  for (const [num, g] of n) if (oldReserved.includes(num) || newReserved.includes(num)) out.push('ERROR ' + num + ' ' + g.name + ' uses a reserved number');
  return out.length ? out : ['OK'];
}
const v1 = [[1, 'id', 'string'], [2, 'qty', 'int32'], [3, 'note', 'string'], [4, 'gift', 'bool']];
const v2 = [[1, 'id', 'string'], [2, 'qty', 'int64'], [3, 'count', 'int32'], [5, 'coupon', 'string']];
check(v1, v2, []).forEach(l => console.log(l));
console.log('---');
check(v1, [[1, 'id', 'string'], [2, 'quantity', 'int32'], [5, 'coupon', 'string']], [3, 4]).forEach(l => console.log(l));` },
    complexity: `<p>O(F) with maps keyed by number.</p>`
  }
});

practice.push({
  title: 'Propagate a gRPC Deadline Through Three Services',
  level: 'Medium', tags: ['grpc', 'deadlines', 'timeouts'], companies: ['Google', 'Amazon'],
  statement: `<p>The edge gives a request 800 ms. Gateway → Orders → Inventory → Pricing (sequential). Each service does local work then calls the next. Write a function that, given local work times, reports at which hop the deadline is exceeded and how much budget each downstream call was given. Explain why per-hop fixed timeouts (each 500 ms) are worse.</p>`,
  constraints: `Each hop keeps a 20 ms safety margin when passing the deadline on.`,
  example: `<p>Work [100, 250, 300, 200]: Gateway passes 680, Orders passes 410, Inventory passes 90, Pricing needs 200 → ${H.c('r', 'DEADLINE_EXCEEDED at Pricing')}.</p>`,
  brute: { why: `<p>Fixed 500 ms per hop allows up to 2 s total for an 800 ms request: downstream services keep working on answers the user already abandoned, burning capacity during incidents.</p>` },
  mcq: { q: 'What should Inventory do when the remaining deadline is already below its typical latency?', options: ['Do the work anyway', 'Fail fast with DEADLINE_EXCEEDED and skip downstream calls', 'Retry', 'Double the deadline'], answer: 1, explain: 'Failing fast frees capacity; the caller has a fallback path.' },
  hints: [
    `<p>Remaining = deadline − elapsed. Pass on (remaining − margin).</p>`,
    `<p>If a hop's work exceeds its remaining budget, that is where it fails.</p>`,
    `<p>Absolute deadlines (a timestamp) vs relative timeouts: gRPC sends a relative <code>grpc-timeout</code>, each hop converts it to its own absolute deadline.</p>`
  ],
  solution: {
    approach: `<p>Walk the chain subtracting each hop's local work and the margin; the first hop whose work exceeds its budget fails. gRPC clients do this automatically when you derive the outgoing call from the incoming context (Go <code>ctx</code>, Java <code>Context.current()</code> with deadlines).</p>`,
    code: { lang: 'js', run: true, code: `function propagate(totalMs, hops, marginMs = 20) {
  let budget = totalMs;
  for (const [name, work] of hops) {
    if (work > budget) return name + ': DEADLINE_EXCEEDED (needed ' + work + ' ms, had ' + budget + ' ms)';
    const passOn = budget - work - marginMs;
    console.log(name.padEnd(9), 'budget', String(budget).padStart(3), '-> passes', passOn);
    budget = passOn;
  }
  return 'OK with ' + budget + ' ms to spare';
}
console.log(propagate(800, [['Gateway', 100], ['Orders', 250], ['Inventory', 300], ['Pricing', 200]]));
console.log(propagate(800, [['Gateway', 50], ['Orders', 150], ['Inventory', 120], ['Pricing', 100]]));` },
    complexity: `<p>O(hops). The real win is bounded total latency and no wasted downstream work.</p>`
  }
});

practice.push({
  title: 'WebSocket Room Manager With Presence',
  level: 'Medium', tags: ['websockets', 'rooms', 'presence'], companies: ['Discord', 'Slack'],
  statement: `<p>Implement a single-server room manager: <code>connect(userId, socket)</code>, <code>join(userId, room)</code>, <code>leave</code>, <code>disconnect</code>, <code>broadcast(room, fromUser, msg)</code>. Users may have several sockets (phone + laptop). Broadcast should not echo to the sender's sending socket but should reach their other devices. Emit presence events "online"/"offline" only on first connect and last disconnect.</p>`,
  constraints: `All operations O(1) amortized except broadcast O(members' sockets).`,
  example: `<p>Ana has 2 sockets; she closes the laptop → ${H.c('g', 'no offline event')} (phone still open). She closes the phone → ${H.c('y', 'offline')}.</p>`,
  brute: { why: `<p>Storing rooms as arrays of sockets and scanning every room on disconnect is O(rooms × members). Tracking presence per socket fires "offline" when one tab closes.</p>` },
  mcq: { q: 'Where should presence be counted?', options: ['Per socket', 'Per user, by number of live sockets', 'Per room', 'In the client'], answer: 1, explain: 'A user is online while at least one socket is open.' },
  hints: [
    `<p>Maps: user → Set(sockets), room → Set(users), user → Set(rooms).</p>`,
    `<p>Presence changes exactly when the user's socket set goes 0 → 1 or 1 → 0.</p>`,
    `<p>On last disconnect, remove the user from all rooms using user → rooms.</p>`
  ],
  solution: {
    approach: `<p>Three maps give O(1) membership updates. Broadcast loops room users, then each user's sockets, skipping only the originating socket. Presence is per user. For many servers, the room map becomes a local cache and broadcasts go through pub/sub (topic 8).</p>`,
    code: { lang: 'js', run: true, code: `class Rooms {
  constructor() { this.sockets = new Map(); this.members = new Map(); this.userRooms = new Map(); this.events = []; }
  connect(user, sock) {
    if (!this.sockets.has(user)) { this.sockets.set(user, new Set()); this.userRooms.set(user, new Set()); this.events.push(user + ' online'); }
    this.sockets.get(user).add(sock);
  }
  join(user, room) {
    if (!this.members.has(room)) this.members.set(room, new Set());
    this.members.get(room).add(user); this.userRooms.get(user).add(room);
  }
  leave(user, room) {
    const m = this.members.get(room); if (m) { m.delete(user); if (!m.size) this.members.delete(room); }
    this.userRooms.get(user)?.delete(room);
  }
  disconnect(user, sock) {
    const s = this.sockets.get(user); if (!s) return;
    s.delete(sock);
    if (s.size === 0) {
      for (const r of [...this.userRooms.get(user)]) this.leave(user, r);
      this.sockets.delete(user); this.userRooms.delete(user); this.events.push(user + ' offline');
    }
  }
  broadcast(room, fromSock, msg) {
    const out = [];
    for (const u of this.members.get(room) || []) for (const s of this.sockets.get(u)) if (s !== fromSock) out.push(s + ':' + msg);
    return out;
  }
}
const r = new Rooms();
r.connect('ana', 'ana-phone'); r.connect('ana', 'ana-laptop'); r.connect('raj', 'raj-web');
r.join('ana', 'team'); r.join('raj', 'team');
console.log(r.broadcast('team', 'ana-laptop', 'hello').join(' | '));
r.disconnect('ana', 'ana-laptop');
r.disconnect('ana', 'ana-phone');
console.log(r.broadcast('team', 'raj-web', 'still here?').length, 'deliveries');
console.log(r.events.join(', '));` },
    complexity: `<p>connect/join/leave O(1); disconnect O(rooms of that user); broadcast O(sockets in room).</p>`
  }
});

practice.push({
  title: 'Design a Public GraphQL API Gateway Over Microservices',
  level: 'Hard', tags: ['graphql', 'federation', 'grpc'], companies: ['Netflix', 'Expedia'],
  statement: `<p>Five teams own Users, Catalog, Orders, Reviews and Search services (all gRPC). Web, iOS and partners want one GraphQL API. Design the architecture: schema ownership, how <code>Order.items.product.reviews</code> is resolved, N+1 control, auth, limits, caching and how teams ship schema changes independently.</p>`,
  constraints: `p99 &lt; 300 ms for the home page; 30k requests/s at peak; partners get a stricter budget.`,
  example: `<p>A home query touches Users, Orders, Catalog and Reviews. With per-level batching the router makes ~4 batched calls, not 1 + 20 + 20 × 5.</p>`,
  brute: { why: `<p>One monolithic GraphQL server owned by a platform team becomes a bottleneck: every schema change needs that team. Resolvers calling gRPC per object produce N+1 storms across the network, which is much worse than N+1 in one database.</p>` },
  mcq: { q: 'In federation, who decides which subgraph resolves Product.reviews?', options: ['The client', 'The router/gateway query planner using the composed supergraph', 'The Reviews database', 'Each subgraph at random'], answer: 1, explain: 'The router plans fetches across subgraphs from the composed schema.' },
  hints: [
    `<p>Let each team own a subgraph (federation) that extends shared entities by key (<code>Product @key(fields: "id")</code>).</p>`,
    `<p>Entity resolution is batched: the router sends a list of representations per subgraph per level.</p>`,
    `<p>Add schema checks in CI against real operations, cost limits per client tier, persisted queries for first-party apps, and response caching hints.</p>`
  ],
  solution: {
    approach: `<p><b>Architecture:</b> a GraphQL router (Apollo Router / Cosmo / Hive Gateway) in front of five <b>subgraphs</b>, each a thin GraphQL layer owned by its team, calling its own gRPC service. Entities like <code>Product @key(fields: "id")</code> are defined by Catalog and extended by Reviews (<code>Product.reviews</code>). <b>Query planning:</b> for <code>orders → items → product → reviews</code> the router fetches orders (Orders), then sends all product keys in one <code>_entities</code> call to Catalog, then all to Reviews: one batched call per level per subgraph; inside each subgraph, DataLoaders batch gRPC calls (<code>BatchGetProducts</code>). <b>Auth:</b> router validates the JWT and forwards claims; each subgraph enforces field-level authorization. <b>Limits:</b> depth 10, cost analysis with per-tier budgets (partners lower), required <code>first</code> ≤ 50, persisted-query allow-list for web/iOS, 5 s timeout. <b>Caching:</b> persisted GET queries cached at CDN for anonymous data with cache-control hints; entity caching in the router for Catalog. <b>Independent shipping:</b> a schema registry composes subgraphs; CI runs composition and breaking-change checks against 30 days of operation traffic; deprecations tracked by usage. <b>Latency:</b> router and subgraphs in the same region, gRPC deadlines derived from the request budget, partial results with nullable fields when Reviews is slow.</p>`,
    complexity: `<p>Network calls O(query depth × subgraphs touched), independent of list sizes.</p>`,
    followUps: ['How do you handle a subgraph that is down?', 'How would you add a subscription for order status?']
  }
});

practice.push({
  title: 'Design Chat for 50M Daily Users',
  level: 'Hard', tags: ['websockets', 'system design', 'fan-out'], companies: ['Meta', 'Discord'],
  statement: `<p>Design 1:1 and group chat (groups up to 500) with online presence, typing indicators, delivered/read receipts, multi-device sync and offline delivery. 50M DAU, 10M concurrent connections, 2B messages/day.</p>`,
  constraints: `Messages must not be lost; order within a conversation must be preserved; delivery under 500 ms when online.`,
  example: `<p>2B/day ≈ 23k msgs/s average, ~70k peak. With groups averaging 8 recipients, ~560k socket writes/s at peak, about 5.6k per gateway across 100 gateways.</p>`,
  brute: { why: `<p>One server with in-memory rooms dies at a few hundred thousand connections and loses everything on restart. Fire-and-forget pub/sub alone drops messages to users whose gateway restarts.</p>` },
  mcq: { q: 'How do you guarantee order within a conversation?', options: ['Client timestamps', 'A per-conversation sequence number assigned at write time', 'Global clock', 'Gateway arrival order'], answer: 1, explain: 'One sequencer per conversation (e.g. a partition) gives a total order for that conversation.' },
  hints: [
    `<p>Separate gateways (connections) from a chat service (validation, sequencing, storage) and a router (who is where).</p>`,
    `<p>Write first, then fan out: persist with conversation sequence, then push; clients ack sequences and resume from the last one.</p>`,
    `<p>Ephemeral signals (typing, presence) skip storage and can be dropped; receipts are small messages too.</p>`
  ],
  solution: {
    approach: `<p><b>Edge:</b> ~100-130 WebSocket gateways (100k connections each + headroom), authenticated with short-lived tokens; each device is a session. <b>Send path:</b> client sends <code>{clientMsgId, convId, text}</code> → gateway → chat service validates membership, assigns <code>seq</code> per conversation (Kafka partition by convId or a counter in the conversation row), writes to a wide-column store (Cassandra/ScyllaDB keyed by convId, clustered by seq), acks the sender with seq (clientMsgId makes retries idempotent). <b>Fan-out:</b> look up members and each member's online devices in a presence/session registry (Redis: device → gateway, TTL refreshed by heartbeats); publish to each gateway's topic; gateway writes frames. Offline devices get a push notification and fetch on reconnect. <b>Sync:</b> each device stores the last seq per conversation; on reconnect it asks "since seq"; gaps trigger fetches, so pub/sub loss is harmless. <b>Receipts:</b> delivered/read are messages updating per-member watermark seq, not per-message rows. <b>Typing/presence:</b> ephemeral, rate-limited, not stored, dropped under load. <b>Big groups (500):</b> same path; for broadcast channels with millions, use a fan-out-on-read inbox. <b>Ops:</b> drain gateways on deploy with jittered reconnects, bounded outboxes for slow consumers, end-to-end encryption optional (server stores ciphertext).</p>`,
    complexity: `<p>Writes O(1) per message; fan-out O(recipient devices); storage ~2B rows/day partitioned by conversation.</p>`,
    followUps: ['How does multi-device end-to-end encryption change fan-out?', 'How do you search messages?']
  }
});

practice.push({
  title: 'Migrate a REST + Polling Mobile API to GraphQL and SSE Without Breaking Old Apps',
  level: 'Hard', tags: ['migration', 'graphql', 'sse', 'compatibility'], companies: ['Swiggy', 'Booking.com'],
  statement: `<p>A delivery app polls <code>GET /orders/{id}</code> every 5 s and calls 7 REST endpoints to draw the home screen. 30% of users run app versions older than one year. Plan a migration to GraphQL for reads and SSE for order tracking, with metrics that prove it worked and a rollback path.</p>`,
  constraints: `Old apps must keep working for 18 months; backend headcount is small.`,
  example: `<p>Polling cost: 2M active orders × 1 request / 5 s = ${H.c('r', '400k req/s')}. SSE: 2M open streams, ~1 event per 30 s each ≈ ${H.c('g', '67k events/s')} plus heartbeats.</p>`,
  brute: { why: `<p>A big-bang switch (remove REST, force upgrade) breaks old apps and leaves no rollback. Running GraphQL resolvers that call the REST endpoints per field recreates N+1 over HTTP.</p>` },
  mcq: { q: 'How should GraphQL resolvers reuse the existing logic?', options: ['Call the public REST endpoints over HTTP per field', 'Call the same domain/service layer the REST controllers use, with DataLoaders', 'Copy the code', 'Query the DB directly from the client'], answer: 1, explain: 'Both APIs become thin adapters over one domain layer.' },
  hints: [
    `<p>Both REST and GraphQL should be adapters over the same service layer, so old and new clients share logic.</p>`,
    `<p>Roll out behind feature flags per app version; measure requests per session, p95 screen load, errors.</p>`,
    `<p>SSE tracking with Last-Event-ID and a polling fallback; keep REST until traffic from old versions is tiny.</p>`
  ],
  solution: {
    approach: `<p><b>Phase 0:</b> extract a shared domain/service layer; REST controllers become thin. Add metrics per endpoint and per app version. <b>Phase 1 (GraphQL):</b> add <code>/graphql</code> as another adapter: schema for the home screen, DataLoaders over the service layer, cost limits, persisted queries generated at app build time (which also act as an allow-list). New app versions use it behind a remote flag (1% → 10% → 100%); compare screen load p95, requests/session (7 → 1) and error rate; flag off = instant rollback to REST. <b>Phase 2 (SSE):</b> <code>GET /orders/{id}/events</code> as <code>text/event-stream</code> with event ids per order, a Redis Streams replay buffer, 15 s heartbeats, <code>retry:</code>, and proxy buffering disabled. Clients fall back to 15-30 s polling if SSE fails repeatedly (some networks). Measure polling traffic drop (400k → near 0 req/s) and status-update latency. <b>Phase 3:</b> keep REST for old versions, mark deprecated with <code>Deprecation</code>/<code>Sunset</code> headers, show an in-app upgrade prompt at 12 months, remove endpoints when their traffic stays below an agreed threshold. Backward compatibility rules apply to the GraphQL schema from day one (additive changes, @deprecated).</p>`,
    complexity: `<p>Request rate drops roughly 7× for the home screen and ~6× for tracking; connection count rises (2M streams) so plan gateway capacity.</p>`,
    followUps: ['What if the CDN in front of the API buffers responses?', 'How do you load-test 2M SSE connections?']
  }
});

/* =====================================================================
   QUIZ
   ===================================================================== */
quiz.push({ q: 'A dashboard only needs the server to push live counters to the browser. What is the simplest fit?', options: ['WebSockets', 'Server-Sent Events', 'gRPC bidirectional streaming', 'Short polling every 100 ms'], answer: 1, explain: 'SSE is one-way server → client over plain HTTP, with automatic reconnect.' });
quiz.push({ q: 'In GraphQL, what does a resolver receive as its first argument?', options: ['The HTTP request', 'The parent object (result of the enclosing field)', 'The database connection', 'The schema'], answer: 1, explain: 'Signature is (parent, args, context, info).' });
quiz.push({ q: 'Query: 1 query loads 50 posts, then Post.author does one lookup per post. How many DB queries?', options: ['2', '50', '51', '100'], answer: 2, explain: '1 for the list + 50 for authors = the N+1 problem.' });
quiz.push({ q: 'A DataLoader batch function receives keys [3, 1, 2]. What must it return?', options: ['Rows in database order', 'An array of 3 values aligned to [3, 1, 2]', 'A Map keyed by id', 'Only the rows that exist'], answer: 1, explain: 'Same length, same order as the keys; null or Error for missing ones.' });
quiz.push({ q: 'Why are DataLoaders created per request?', options: ['They are expensive to share', 'To avoid caching data across users and serving stale data', 'GraphQL forbids globals', 'To use more memory'], answer: 1, explain: 'A global cache would leak data between users and never refresh.' });
quiz.push({ q: 'Which limit best stops <code>users(first:100){friends(first:100){friends(first:100){name}}}</code>?', options: ['Request-per-minute rate limit', 'Query cost analysis', 'Gzip', 'Disabling mutations'], answer: 1, explain: 'Cost analysis multiplies list sizes (~1M objects) and rejects before execution.' });
quiz.push({ q: 'What is the protobuf tag byte for field 2 with wire type 0 (varint)?', options: ['0x02', '0x10', '0x12', '0x20'], answer: 1, explain: '(2 &lt;&lt; 3) | 0 = 16 = 0x10.' });
quiz.push({ q: 'How many bytes does the value 300 take as a protobuf varint?', options: ['1', '2', '3', '4'], answer: 1, explain: '300 needs 9 bits; 7 bits per byte → 2 bytes (ac 02).' });
quiz.push({ q: 'Which gRPC call type fits "client uploads 10,000 readings, server replies with one summary"?', options: ['Unary', 'Server streaming', 'Client streaming', 'Bidirectional streaming'], answer: 2, explain: 'Many requests, one response.' });
quiz.push({ q: 'You delete protobuf field 3 and later add a new field. What should you do with number 3?', options: ['Reuse it for the new field', 'Mark it reserved and use a new number', 'Renumber all fields', 'Nothing; numbers do not matter'], answer: 1, explain: 'Reusing a number makes old data decode as the new field.' });
quiz.push({ q: 'Renaming a protobuf field while keeping its number is...', options: ['Breaking on the wire', 'Wire-compatible, but can break JSON and generated-code users', 'Always forbidden', 'Equivalent to deleting it'], answer: 1, explain: 'Names are not on the binary wire, but JSON mapping uses them.' });
quiz.push({ q: 'An EventSource reconnects after a network drop. Which header lets the server resume?', options: ['If-Match', 'Last-Event-ID', 'Sec-WebSocket-Key', 'Range'], answer: 1, explain: 'It carries the id of the last event the browser received.' });
quiz.push({ q: 'A message in room r1 must reach members on 40 gateways. With per-room pub/sub subscriptions, how many copies cross the bus?', options: ['1', 'About 40 (one per subscribed gateway)', 'One per member', 'Zero'], answer: 1, explain: 'Each gateway subscribed to the room topic gets one copy and fans out locally.' });
quiz.push({ q: 'Why do gRPC services behind a plain L4 load balancer often get uneven load?', options: ['Protobuf is large', 'HTTP/2 keeps one long-lived connection carrying many calls, so it pins to one backend', 'gRPC uses UDP', 'Deadlines'], answer: 1, explain: 'Balancing happens per connection, not per request; use L7 or client-side balancing.' });

/* =====================================================================
   INTERVIEW
   ===================================================================== */
interview.push({ level: 'B', q: 'When would you choose GraphQL, gRPC, REST, WebSockets or SSE?', a: `<p>Decide by caller, data direction and read variety. <b>REST</b> for public/partner APIs and simple CRUD: universal, cacheable at CDNs, easy to debug. <b>GraphQL</b> when many clients need different shapes of one data graph (web, iOS, Android) and round trips hurt; costs: caching, query cost control, N+1. <b>gRPC</b> for internal service-to-service calls: binary protobuf, generated typed clients, HTTP/2 multiplexing, streaming and deadlines; poor fit for browsers without a proxy. <b>SSE</b> for one-way server pushes (notifications, LLM tokens) with built-in reconnect. <b>WebSockets</b> for frequent two-way traffic (chat, games, collaboration). Many systems combine them: REST/GraphQL at the edge, gRPC inside, SSE/WebSockets for live features.</p>`, followUps: ['What would make you move an internal API from REST to gRPC?', 'Can GraphQL be cached at a CDN?'] });
interview.push({ level: 'B', q: 'Explain how a GraphQL query is executed on the server.', a: `<p>The server <b>parses</b> the query text into an AST, <b>validates</b> it against the schema (fields exist, argument types match, variables are declared), then <b>executes</b> it: starting at the root type it calls each field's resolver with <code>(parent, args, context, info)</code>, and recursively resolves sub-selections on the returned objects. Scalars without custom resolvers use the default resolver that reads <code>parent[field]</code>. Sibling query fields may run concurrently; top-level mutation fields run serially. Errors in a field produce null plus an entry in <code>errors</code>, and nulls in non-null fields bubble up to the nearest nullable parent. The result is <code>{data, errors}</code> shaped exactly like the query.</p>`, followUps: ['Why do mutations run serially?', 'What goes into the context object?'] });
interview.push({ level: 'I', q: 'What is the N+1 problem in GraphQL and how does DataLoader solve it?', a: `<p>Resolvers run per object, so a list of N posts each resolving <code>author</code> does 1 query for the list plus N author queries. DataLoader collects all <code>load(key)</code> calls made during one tick of the event loop (i.e. all siblings at one level), dedupes them, and calls a batch function once with all keys, e.g. <code>WHERE id IN (...)</code>. It also caches per request so repeated keys share one promise. The batch function must return values in the same order and length as the keys. Loaders are created per request to avoid cross-user leaks. Result: queries scale with query depth, not list sizes. Alternatives: look-ahead joins or GraphQL-to-SQL compilers.</p>`, followUps: ['How would you load "latest 5 comments per post" in one batch?', 'What happens if the batch returns rows in DB order?'] });
interview.push({ level: 'I', q: 'How do you protect a public GraphQL API from abusive or expensive queries?', a: `<p>Layer several controls: <b>depth limit</b> (e.g. 10), <b>static cost analysis</b> that multiplies list sizes and rejects queries above a budget before execution, <b>rate limiting by cost points</b> per client per time window (as GitHub and Shopify do), required and capped pagination arguments (<code>first ≤ 100</code>), limits on aliases and batched operations (stops alias-based brute force), execution timeouts and body size limits, <b>persisted queries/allow-lists</b> for first-party clients, per-field authorization, and turning off introspection and field suggestions for public schemas (defence in depth, not real security). Return cost info in <code>extensions</code> so clients can adapt.</p>`, followUps: ['How do you weight a search field?', 'Why is per-request rate limiting insufficient?'] });
interview.push({ level: 'I', q: 'How does Protocol Buffers encode data, and why is it smaller than JSON?', a: `<p>Each field is a <b>tag</b> followed by a value. The tag is a varint of <code>(field_number &lt;&lt; 3) | wire_type</code>. Wire types: 0 varint (ints, bools, enums), 1 64-bit fixed, 2 length-delimited (strings, bytes, nested messages, packed repeated), 5 32-bit fixed. Varints use 7 bits per byte with a continuation bit, so small numbers take 1 byte. Field names are never sent, there is no whitespace or quoting, and unset fields (proto3 defaults) are omitted. That makes payloads typically several times smaller and faster to parse than JSON. Negative int32 takes 10 bytes, so use sint32 (zigzag) for often-negative values.</p>`, followUps: ['How does a parser skip an unknown field?', 'What does "optional" add in proto3?'] });
interview.push({ level: 'I', q: 'Describe the four gRPC call types with a use case for each.', a: `<p><b>Unary</b>: one request, one response, like a function call (<code>GetUser</code>). <b>Server streaming</b>: one request, a stream of responses (exporting large result sets in chunks, watching order status, price ticks). <b>Client streaming</b>: a stream of requests, one response (uploading telemetry or a file in chunks, then receiving a summary). <b>Bidirectional streaming</b>: both sides stream independently on one call (chat, live speech transcription, game state sync). All four ride on a single HTTP/2 stream per call, with HTTP/2 flow control providing back-pressure, and all should have deadlines; streams also need keepalives and resume logic.</p>`, followUps: ['How do you resume a broken server stream?', 'How do load balancers treat long streams?'] });
interview.push({ level: 'I', q: 'What are gRPC deadlines and why must they be propagated?', a: `<p>A deadline is the absolute time by which the client needs an answer; gRPC sends the remaining time as the <code>grpc-timeout</code> header. The server can check it and stop work; when it calls other services it should pass on the <b>remaining</b> budget (derived from the incoming context) rather than starting a fresh timeout. Without propagation, a request the user abandoned at 1 s may keep downstream services busy for seconds, wasting capacity exactly during incidents and causing cascading failures. Expired calls fail with <code>DEADLINE_EXCEEDED</code>; retries must fit in the same budget and only target idempotent methods.</p>`, followUps: ['Deadline vs timeout?', 'How do retries interact with deadlines?'] });
interview.push({ level: 'A', q: 'Which protobuf schema changes are safe, and how do you enforce that in a large org?', a: `<p>Safe: adding fields with new numbers, removing fields while marking the number and name <code>reserved</code>, renaming fields (binary only), adding enum values (with a <code>*_UNSPECIFIED = 0</code> default and readers tolerant of unknown values), and compatible varint type changes like int32→int64 once all readers upgrade. Unsafe: reusing a field number, changing a field number, changing wire type (int32→string), or changing meaning while keeping the number. Breaking redesigns go in a new package version (<code>v2</code>) served side by side, or use expand-and-contract (add new field, dual-write, migrate readers, stop writing, reserve). Enforce with <code>buf lint</code> and <code>buf breaking</code> in CI and a schema registry with compatibility modes for event topics.</p>`, followUps: ['Why does proto3 preserve unknown fields?', 'What breaks if JSON transcoding is used?'] });
interview.push({ level: 'I', q: 'How do you evolve a GraphQL schema without versioning?', a: `<p>Make only additive changes in place: new types, new fields, new optional arguments with defaults. For anything else use deprecation: add the replacement, mark the old field <code>@deprecated(reason: ...)</code>, keep both resolvers, track field usage per client in a schema registry, and remove only when usage reaches zero for an agreed period (mobile apps may need many months). Breaking changes include removing/renaming fields, adding required arguments, tightening input nullability and loosening output nullability. CI runs schema diff checks against recorded operations (graphql-inspector, Apollo checks) so a PR that breaks a live query fails before merge.</p>`, followUps: ['How would you change a field type from Int to Money?', 'What if one partner never upgrades?'] });
interview.push({ level: 'I', q: 'Compare WebSockets and Server-Sent Events in depth.', a: `<p>SSE is a normal HTTP response with <code>text/event-stream</code>: one direction (server → client), UTF-8 text, built-in auto-reconnect with <code>Last-Event-ID</code> and <code>retry</code>, works with standard HTTP auth, proxies and HTTP/2 multiplexing. EventSource only does GET, so POST-based streams (like LLM APIs) use fetch streaming. WebSocket starts with an HTTP Upgrade (101) then sends framed binary or text messages in both directions with low overhead; you build message types, acks, reconnect, resubscription and replay yourself; browsers cannot set custom headers, so auth uses cookies plus Origin checks or a short-lived ticket. Both need heartbeats under proxy idle timeouts and both are long-lived connections to scale. Choose SSE for one-way feeds, WebSockets for frequent two-way traffic.</p>`, followUps: ['How does HTTP/1.1 limit SSE in browsers?', 'What is cross-site WebSocket hijacking?'] });
interview.push({ level: 'A', q: 'How would you scale WebSocket connections to tens of millions of users?', a: `<p>Split responsibilities: stateless-ish <b>gateway</b> nodes terminate connections (each 100k+ sockets with epoll-based servers and tuned file-descriptor limits), a <b>pub/sub bus</b> (Redis, NATS, Kafka) routes room or user topics to the gateways that have subscribers, a <b>presence/session registry</b> maps users/devices to gateways with TTL heartbeats, and a <b>durable store</b> keeps messages with per-conversation sequence numbers. Persist first, then fan out; clients ack sequences and resume on reconnect, so bus loss is recoverable. Protect gateways with bounded per-connection queues (drop, coalesce, or disconnect slow consumers), message size and rate limits. Balance with least-connections, drain nodes on deploy with jittered reconnects to avoid thundering herds, and treat hot rooms specially (hierarchical fan-out, sampling).</p>`, followUps: ['How many gateways for 10M connections?', 'Redis Pub/Sub vs Kafka for this bus?'] });
interview.push({ level: 'E', q: 'Your team wants to expose internal gRPC services to browsers and partners. What are your options and trade-offs?', a: `<p>Options: (1) <b>gRPC-Web or Connect</b> through Envoy or a Connect server: browsers get generated typed clients over HTTP/1.1 or 2; server streaming works but client and bidi streaming are limited in browsers. (2) <b>HTTP/JSON transcoding</b> with <code>google.api.http</code> annotations (Envoy, grpc-gateway, Cloud Endpoints): partners get REST/JSON and OpenAPI generated from the same proto, but the JSON depends on field names, so renames become breaking. (3) A <b>GraphQL or REST BFF</b> that composes several gRPC calls into client-shaped responses with its own auth, caching and rate limits. Partners usually want REST/JSON with stable versioning and docs; first-party web apps benefit from Connect or a BFF. Whatever you choose, keep internal protos separate from public contracts so internal refactors do not leak to partners.</p>`, followUps: ['How do you version the public contract independently?', 'Where does auth happen in each option?'] });

registerModule({
  id: 'be23',
  title: 'API Styles: GraphQL, gRPC & WebSockets',
  intro: `<p>REST is not the only way to build an API. This module covers the other styles you meet in real systems and interviews: <b>GraphQL</b> (clients choose their fields; schemas, resolvers, the N+1 problem with DataLoader, pagination and security limits), <b>gRPC</b> with Protocol Buffers (wire format, the four streaming modes, deadlines, and schema changes that do not break old clients), and <b>WebSockets and Server-Sent Events</b> for real-time features, including how to scale millions of connections and fan messages out. Every topic has a picture, small runnable models in plain JavaScript or Java, and the phrases interviewers use.</p>`,
  goals: [
    'Choose between REST, GraphQL, gRPC, WebSockets and SSE for a feature and defend the trade-offs',
    'Write a GraphQL schema and resolvers, explain execution, and remove N+1 queries with a DataLoader',
    'Paginate GraphQL with connections and protect it with depth, cost, alias and persisted-query limits',
    'Encode and decode protobuf varints and tags, pick the right gRPC call type, and propagate deadlines',
    'Classify protobuf and GraphQL schema changes as safe or breaking and plan expand-and-contract migrations',
    'Build SSE feeds that resume with Last-Event-ID and WebSocket rooms that fan out across many gateway servers'
  ],
  prereqs: `Backend module 4 (HTTP Deep Dive &amp; API Design): REST resources, idempotency, cursor pagination and versioning are assumed. Comfortable reading JavaScript and Java; basic idea of promises and the event loop helps for DataLoader.`,
  hours: 14,
  langExplain: `<p>Runnable models here are plain JavaScript (Node) or Java because they show the mechanics with no libraries. GraphQL SDL, <code>.proto</code> files and framework code (Spring for GraphQL, grpc-java, Express, browser EventSource/WebSocket) are shown for reference only and are not executed.</p>`,
  topics: topics,
  practice: practice,
  quiz: quiz,
  interview: interview
});
})();
