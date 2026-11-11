(function () { var topics = [], practice = [], quiz = [], interview = [];

// Scenario problem builder: weak answer vs strong answer.
function P(o) {
  return {
    title: o.t, level: o.l, tags: o.tags,
    statement: '<p>' + o.s + '</p>',
    constraints: o.c || 'Answer out loud in 2 to 3 minutes. Start with one plain sentence, then give the steps in order, then name one trade-off.',
    example: o.ex,
    brute: { why: '<p><b>Weak answer:</b> <i>&ldquo;' + o.weak + '&rdquo;</i></p><p><b>Why it fails:</b> ' + o.why + '</p>' },
    mcq: { q: o.q[0], options: o.q[1], answer: o.q[2], explain: o.q[3] },
    hints: ['<p>Hint 1: ' + o.h[0] + '</p>', '<p>Hint 2: ' + o.h[1] + '</p>', '<p>Hint 3: ' + o.h[2] + '</p>'],
    solution: { approach: o.a, complexity: '<p><b>What the interviewer scores:</b> ' + o.cx + '</p>', followUps: o.f }
  };
}

// Visualizer helper: one fixed box diagram, one frame per step.
function flowViz(title, label, nodes, edges, steps, height) {
  return {
    title: title,
    gen: function () {
      return steps.map(function (s) {
        var parts = [{ type: 'graph', label: label, directed: true, height: height || 60, nodes: nodes, edges: edges, hl: s.hl || {}, ehl: s.ehl || {}, tags: s.tags || {} }];
        (s.parts || []).forEach(function (p) { parts.push(p); });
        return { narr: s.narr, parts: parts };
      });
    }
  };
}

// Visualizer helper: build a comparison table row by row.
function rowViz(title, label, columns, rows, narrs, finalNarr, selRows) {
  return {
    title: title,
    gen: function () {
      var frames = [{ narr: narrs[0], parts: [{ type: 'table', label: label, columns: columns, rows: [] }] }];
      for (var i = 0; i < rows.length; i++) {
        var h = {}; h[i] = 'cur';
        frames.push({ narr: narrs[i + 1] || rows[i][0], parts: [{ type: 'table', label: label, columns: columns, rows: rows.slice(0, i + 1), hl: h }] });
      }
      var fh = {}; (selRows || []).forEach(function (r) { fh[r] = 'sel'; });
      frames.push({ narr: finalNarr, parts: [{ type: 'table', label: label, columns: columns, rows: rows.slice(), hl: fh }] });
      return frames;
    }
  };
}

// ---------- TOPIC 1 ----------
var T1_NODES = [
  { id: 'C', label: 'Client (browser or app)', x: 12, y: 30, shape: 'box' },
  { id: 'G', label: 'API gateway', x: 40, y: 30, shape: 'box' },
  { id: 'A', label: 'Orders API', x: 66, y: 30, shape: 'box' },
  { id: 'D', label: 'Database', x: 90, y: 30, shape: 'box' }
];
var T1_EDGES = [['C', 'G', 'HTTPS'], ['G', 'A'], ['A', 'D']];
function t1Row(req, res, why) { return { type: 'table', label: 'On the wire', columns: ['Request', 'Response', 'Why this status'], rows: [[req, res, why]] }; }

topics.push({
  title: 'REST and HTTP Basics: Resources, Methods and Status Codes',
  analogy: `<p>Think of a <b>library front desk</b>. Every book has a shelf number (the <b>URL</b>). You can ask to look at a book (<b>GET</b>), hand in a new book (<b>POST</b>), swap a book for a new edition (<b>PUT</b>), fix one page (<b>PATCH</b>) or remove the book (<b>DELETE</b>). The clerk answers with a short code: "here it is" (200), "added, it is on shelf 42" (201), "show me your card first" (401), "your card does not allow that room" (403), "no such book" (404). The clerk does not remember you between visits, so you show your card every time. That is what <b>stateless</b> means.</p>`,
  explain: `<p><b>The plain idea:</b> an <b>API</b> (application programming interface) is a set of rules that lets one program ask another program for data or work. <b>REST</b> is a style of API that uses plain HTTP the way it was designed: things are <b>resources</b> with URLs, and you act on them with a small fixed set of <b>methods</b>.</p>
    <p>Three words carry most interview questions:</p>
    <ul>
      <li><b>Safe</b>: the request only reads. GET, HEAD and OPTIONS are safe.</li>
      <li><b>Idempotent</b>: sending the same request 5 times leaves the server in the same state as sending it once. GET, PUT and DELETE are idempotent. POST is not. This is what makes a retry safe.</li>
      <li><b>Stateless</b>: the server keeps no session between calls. Every request carries what it needs, usually a token in the <code>Authorization</code> header.</li>
    </ul>
    ${H.table(['Method', 'Use', 'Safe', 'Idempotent', 'Typical success code'], [
      ['GET', 'read', 'yes', 'yes', '200'],
      ['POST', 'create, or an action', 'no', 'no', '201 + Location header'],
      ['PUT', 'replace the whole resource', 'no', 'yes', '200 or 204'],
      ['PATCH', 'change some fields', 'no', 'not guaranteed', '200 or 204'],
      ['DELETE', 'remove', 'no', 'yes', '204']
    ])}
    <p>Status codes come in families: <b>2xx</b> worked, <b>3xx</b> look elsewhere or use your cached copy, <b>4xx</b> the caller made a mistake, <b>5xx</b> the server failed. The pair interviewers love: <b>401</b> means "I do not know who you are", <b>403</b> means "I know who you are and the answer is no".</p>`,
  clues: ['"What makes an API RESTful?"', '"Is POST idempotent? What about PUT and DELETE?"', '"401 versus 403" or "400 versus 422"', '"Design the endpoints for ..." (they want nouns, plurals, correct verbs and codes)', '"What do you return after a successful create?" (201 and a Location header)', '"Is this API stateless?" (no server session, token on every call)', '"PUT or PATCH for a partial update?"'],
  code: [{ lang: 'http', title: 'Create, then read', code: 'POST /api/v1/orders HTTP/1.1\nHost: shop.example.com\nAuthorization: Bearer eyJhbGciOi\nContent-Type: application/json\n\n{ "productId": 17, "quantity": 2 }\n\nHTTP/1.1 201 Created\nLocation: /api/v1/orders/501\nContent-Type: application/json\n\n{ "id": 501, "productId": 17, "quantity": 2, "status": "Placed" }' }],
  codeTitle: ['One request and its response, as text on the wire'],
  viz: flowViz('Eight requests, eight status codes', 'An online shop API', T1_NODES, T1_EDGES, [
    { narr: 'A client talks to the <b>Orders API</b> through a gateway. We send 8 requests and see which status code comes back and <b>why</b>.', hl: { C: 'cur' }, parts: [{ type: 'text', html: 'Families: <b>2xx</b> worked, <b>3xx</b> redirect or cached, <b>4xx</b> caller error, <b>5xx</b> server error.' }] },
    { narr: '<b>POST /orders</b> creates a new order. The server picks the id, so the answer is <b>201 Created</b> plus a <code>Location</code> header that says where the new order lives.', hl: { A: 'ok', D: 'ok' }, ehl: { 'C-G': 'ok', 'G-A': 'ok', 'A-D': 'ok' }, parts: [t1Row('POST /api/v1/orders', '201 Created, Location: /api/v1/orders/501', 'A new resource now exists')] },
    { narr: '<b>GET /orders/501</b> reads it. GET is safe: nothing changes. The server adds an <code>ETag</code>, a version stamp for this copy.', hl: { A: 'cur' }, ehl: { 'C-G': 'ok', 'G-A': 'ok', 'A-D': 'ok' }, parts: [t1Row('GET /api/v1/orders/501', '200 OK, ETag: "v1"', 'Found, here is the body')] },
    { narr: 'The client asks again and sends the stamp back with <code>If-None-Match</code>. Nothing changed, so the server answers <b>304 Not Modified</b> with no body. The client reuses its copy.', hl: { C: 'ok' }, ehl: { 'C-G': 'win', 'G-A': 'win' }, parts: [t1Row('GET /api/v1/orders/501, If-None-Match: "v1"', '304 Not Modified', 'Your cached copy is still good')] },
    { narr: 'A call arrives with <b>no token</b>. The API does not know who is calling: <b>401 Unauthorized</b>. It never reaches the database.', hl: { G: 'bad' }, ehl: { 'C-G': 'bad' }, parts: [t1Row('GET /api/v1/orders/501 (no Authorization header)', '401 Unauthorized', 'Not signed in, or the token is bad or expired')] },
    { narr: 'A signed-in <b>customer</b> tries an admin action. The API knows who it is, and says no: <b>403 Forbidden</b>.', hl: { A: 'bad' }, ehl: { 'C-G': 'ok', 'G-A': 'bad' }, parts: [t1Row('DELETE /api/v1/orders/501 (customer token)', '403 Forbidden', 'Known caller, not allowed')] },
    { narr: 'The body is missing a required field. That is the caller\'s mistake: <b>400 Bad Request</b> with a Problem Details body that names the field.', hl: { A: 'bad' }, ehl: { 'C-G': 'ok', 'G-A': 'bad' }, parts: [t1Row('POST /api/v1/orders { "quantity": 2 }', '400 Bad Request, application/problem+json', 'productId is required')] },
    { narr: 'An admin deletes the order: <b>204 No Content</b>. Success, nothing to send back.', hl: { A: 'ok', D: 'ok' }, ehl: { 'C-G': 'ok', 'G-A': 'ok', 'A-D': 'ok' }, parts: [t1Row('DELETE /api/v1/orders/501 (admin token)', '204 No Content', 'Removed')] },
    { narr: 'The admin retries the same DELETE. Now the answer is <b>404 Not Found</b>. The <i>response</i> differs but the <i>state</i> is the same (the order is gone), so DELETE is still idempotent.', hl: { A: 'cur', D: 'done' }, ehl: { 'C-G': 'ok', 'G-A': 'ok', 'A-D': 'win' }, parts: [t1Row('DELETE /api/v1/orders/501 (again)', '404 Not Found', 'Already gone: same end state')] }
  ]),
  examples: [
    { title: 'URLs for a shop: nouns, plurals, one level of nesting', html: `<p>Name the <b>thing</b>, not the action. The HTTP method is the verb, and filters go in the query string.</p>`, code: { lang: 'http', code: 'GET    /api/v1/orders?status=shipped&page=2&pageSize=50&sort=-createdAt\nGET    /api/v1/orders/501\nPOST   /api/v1/orders\nPUT    /api/v1/orders/501\nPATCH  /api/v1/orders/501\nDELETE /api/v1/orders/501\nGET    /api/v1/orders/501/items\nPOST   /api/v1/orders/501/cancel' } },
    { title: 'Why the second DELETE can return 404 and still be idempotent', html: `<p>Idempotent is about the <b>state on the server</b>, not about the response text. After 1 DELETE the order is gone. After 3 DELETEs the order is gone. Same state, so a client or a proxy can retry a DELETE after a timeout without fear. A POST that creates an order is different: 3 POSTs can create 3 orders.</p>` },
    { title: '400, 401, 403, 404, 409, 422 on one endpoint', html: `${H.table(['Situation on PUT /orders/501', 'Code'], [['The JSON is broken', '400'], ['No token, or the token expired', '401'], ['Token is fine, but this order belongs to someone else', '403 (or 404 to hide that it exists)'], ['No order with id 501', '404'], ['The order was already shipped, so it cannot be changed', '409'], ['JSON is valid, but quantity is -3', '422 (many teams use 400 for this too)']])}<p>Pick one rule for 400 versus 422 and apply it everywhere. Consistency matters more than the choice.</p>` }
  ],
  deepDive: `<p><b>REST is a style, not a standard.</b> It comes from a set of 6 constraints: client and server are separate, calls are stateless, responses say if they can be cached, the interface is uniform, the system can be layered (gateways and proxies in between), and code on demand, which is optional. Most real "REST APIs" stop at level 2 of the <b>Richardson maturity model</b>: resources plus correct verbs and codes. Level 3 adds links inside responses that tell the client what it can do next (HATEOAS). Few teams build that.</p>
    <p><b>Stateless is what lets you scale.</b> If no server holds a session, any server behind the load balancer can answer any request, and you can add or remove servers freely.</p>
    <p><b>Details that separate senior answers:</b> 307 and 308 redirects keep the method while 301 and 302 may turn a POST into a GET; a 401 response should carry a <code>WWW-Authenticate</code> header; a 405 should carry <code>Allow</code>; a 429 or 503 should carry <code>Retry-After</code>; and PATCH has two body formats, JSON Merge Patch (send the fields that change) and JSON Patch (send a list of operations).</p>`,
  aiEra: `<p><b>What AI changes:</b> an assistant can scaffold a whole CRUD controller in seconds, so writing endpoints is no longer the skill being tested. Judging them is. <b>Use AI as a partner:</b> paste your route table and ask <code>List every place this API breaks HTTP semantics: wrong verb, wrong status code, verbs in URLs</code>. <b>Where AI goes wrong:</b> it often returns 200 for a create, forgets the Location header, puts errors in a 200 body, and writes a PUT that only updates some fields. <b>What you must still own:</b> knowing which methods are safe to retry, the 401 versus 403 line, and explaining the choice in one sentence. Also remember that AI agents now call APIs through tool descriptions, so a clear, predictable API is easier for both people and models to use.</p>`,
  problems: [P({
    t: 'Review a Badly Shaped API', l: 'Easy', tags: ['REST', 'review'],
    s: 'A teammate shows you this API for a booking system and asks for a review: <code>POST /getBooking?id=5</code>, <code>POST /createBooking</code> (returns 200 and the id), <code>GET /deleteBooking?id=5</code>, and every failure returns 200 with <code>{ "success": false }</code>. What do you tell them?',
    ex: '<p>They expect you to name each problem, say why it hurts, and show the fixed version, in under 3 minutes.</p>',
    weak: 'It is not RESTful. They should use proper REST.',
    why: 'It names no specific problem and no fix. A reviewer who cannot say what is wrong is not reviewing.',
    q: ['Which of these is the most dangerous, not just untidy?', ['Verbs in the URL', 'A GET that deletes data', 'Returning the id without a Location header', 'Singular nouns'], 1, 'GET must be safe. Browsers, crawlers, link previews and proxies are allowed to repeat or prefetch a GET, so a GET that deletes can remove data with nobody asking.'],
    h: ['Look at each line and ask: is the method right for what it does?', 'Think about who else can send a GET without a person clicking: caches, crawlers, link previews.', 'Think about what monitoring and client code see when every response is 200.'],
    a: `<p><b>Strong answer:</b> "I see 4 problems, in order of risk."</p><ol><li><b>GET that deletes.</b> GET must be safe. Crawlers, prefetchers and proxies may repeat it. Change to <code>DELETE /bookings/5</code> returning 204.</li><li><b>200 for every failure.</b> Monitoring, retries and gateways all read the status code. Return 400, 401, 403, 404 or 409 with a Problem Details body.</li><li><b>Create returns 200.</b> Return <b>201</b> with a <code>Location: /bookings/5</code> header and the new booking.</li><li><b>Verbs in URLs and POST for reads.</b> A read through POST cannot be cached or bookmarked. Use <code>GET /bookings/5</code>.</li></ol><p>"I would fix 1 and 2 first because they cause real damage, then agree the naming rules as a short team guideline."</p>`,
    cx: 'you rank by risk, you explain each rule by what breaks without it, and you offer a fixed version instead of a label.',
    f: ['How would you roll this change out if clients already use the old routes?', 'When is a POST for a read acceptable? (a search with a very large filter body)']
  })]
});

// ---------- TOPIC 2 ----------
var CS_IDEM = [
  'using System;',
  'using System.Collections.Generic;',
  '',
  '// Idempotency keys in miniature: the same key never charges twice.',
  'public class PaymentApi',
  '{',
  '    private readonly Dictionary<string, string> _saved = new Dictionary<string, string>();',
  '    private int _charges = 0;',
  '',
  '    public string Pay(string idempotencyKey, int amount)',
  '    {',
  '        string earlier;',
  '        if (_saved.TryGetValue(idempotencyKey, out earlier))',
  '        {',
  '            return earlier + " (replayed, no new charge)";   // a retry: answer from the store',
  '        }',
  '        _charges++;                                           // first time: do the real work once',
  '        string response = "201 Created: payment " + _charges + " for " + amount;',
  '        _saved[idempotencyKey] = response;                    // remember the answer under the key',
  '        return response;',
  '    }',
  '',
  '    public static void Main()',
  '    {',
  '        var api = new PaymentApi();',
  '        Console.WriteLine(api.Pay("key-A", 500));   // charged',
  '        Console.WriteLine(api.Pay("key-A", 500));   // retry after a timeout: not charged again',
  '        Console.WriteLine(api.Pay("key-B", 120));   // a different payment: charged',
  '        Console.WriteLine("Total charges: " + api._charges);   // 2',
  '    }',
  '}'
].join('\n');

topics.push({
  title: 'Designing REST APIs That Survive Production: Retries, Paging, Versions, Caching',
  analogy: `<p>Think of a <b>cash machine</b>. You press "withdraw 500" and the screen freezes. Did it work? If you press again, you do not want to be charged twice. A good bank gives each attempt a <b>receipt number</b>: press again with the same number and the bank says "already done, here is the same receipt". That receipt number is an <b>idempotency key</b>. The same care shows up everywhere in API design: do not hand over a million rows at once (paging), do not change the form without telling people (versioning), and do not let two clerks overwrite each other (concurrency checks).</p>`,
  explain: `<p><b>The plain idea:</b> networks fail in the middle of a call. Clients retry. Data grows. Several people edit the same thing. Clients you do not control keep using old versions. A production API plans for all of these.</p>
    ${H.table(['Problem', 'Tool', 'What it looks like'], [
      ['A retried POST creates a duplicate', 'Idempotency key', '<code>Idempotency-Key: 6f1a...</code> header, server stores key and response'],
      ['Two people overwrite each other', 'Optimistic concurrency with ETags', '<code>If-Match: "v7"</code>, server answers 412 if the version moved'],
      ['A list has 50 million rows', 'Pagination', 'Keyset (cursor): <code>?after=abc&amp;limit=50</code>'],
      ['The work takes minutes', '202 pattern', '202 Accepted + a status URL to poll'],
      ['A breaking change is needed', 'Versioning', '<code>/api/v2/orders</code> plus a sunset date for v1'],
      ['The same data is fetched again and again', 'HTTP caching', '<code>Cache-Control</code>, <code>ETag</code> and 304'],
      ['One client floods the API', 'Rate limiting', '429 Too Many Requests + <code>Retry-After</code>'],
      ['Errors look different on every endpoint', 'Problem Details (RFC 9457)', 'One JSON error shape with a trace id']
    ])}
    <p><b>Optimistic concurrency</b> means "assume nobody else is editing, but check before saving". <b>Keyset pagination</b> means "give me the next 50 rows after this last row" instead of "skip 200,000 rows", so the database jumps straight to the place with an index.</p>`,
  clues: ['"The client timed out and retried, and the customer was charged twice"', '"How do you paginate a very large table?" (keyset, not offset)', '"How do you version an API?" and "what counts as a breaking change?"', '"Two users edit the same record" (ETag + If-Match, 412)', '"The request takes 5 minutes" (202 Accepted and a status endpoint)', '"How do you stop one client from overloading the API?" (rate limiting, 429)', '"What does your error response look like?" (Problem Details)'],
  code: [{ lang: 'csharp', title: 'Idempotency keys in 25 lines (plain C#)', code: CS_IDEM }],
  codeTitle: ['The idea behind an idempotency key, without any framework'],
  viz: {
    title: 'Idempotency keys: retry without paying twice',
    input: 'A A B A C',
    inputLabel: 'Idempotency keys of the requests, in order (repeat a letter to simulate a retry)',
    gen: function (input) {
      var keys = String(input).trim().split(/[\s,]+/).filter(function (k) { return k; });
      if (!keys.length) throw new Error('Enter keys separated by spaces, for example: A A B');
      if (keys.length > 10) throw new Error('Use at most 10 requests');
      keys.forEach(function (k) { if (!/^[A-Za-z0-9]{1,4}$/.test(k)) throw new Error('Keys are 1 to 4 letters or digits, for example: A B A'); });
      var nodes = [{ id: 'C', label: 'Client', x: 12, y: 30, shape: 'box' }, { id: 'A', label: 'Payments API', x: 45, y: 30, shape: 'box' }, { id: 'S', label: 'Key store', x: 82, y: 12, shape: 'box' }, { id: 'D', label: 'Payments table', x: 82, y: 48, shape: 'box' }];
      var edges = [['C', 'A', 'POST /payments'], ['A', 'S', 'look up key'], ['A', 'D', 'charge']];
      var store = [], charges = 0, frames = [];
      function g(hl, ehl) { return { type: 'graph', label: 'Payment flow', directed: true, height: 60, nodes: nodes, edges: edges, hl: hl, ehl: ehl }; }
      frames.push({ narr: 'The client sends <b>' + keys.length + '</b> payment requests. Each carries an <code>Idempotency-Key</code> header. A repeated key means "this is a retry of the same payment".', parts: [g({ C: 'cur' }, {}), { type: 'array', label: 'Keys to send', values: keys.slice() }, { type: 'vars', vals: { charges: 0 } }] });
      for (var i = 0; i < keys.length; i++) {
        var k = keys[i], found = -1, ptr = {}, ah = {};
        for (var j = 0; j < store.length; j++) if (store[j][0] === k) found = j;
        ptr[i] = 'now'; ah[i] = 'cur';
        var mh = {};
        if (found >= 0) {
          mh[k] = 'win';
          frames.push({ narr: 'Request ' + (i + 1) + ' has key <b>' + k + '</b>. The key is <span class="c-b">already in the store</span>, so this is a retry. The API returns the saved response and does <b>not</b> charge again.', parts: [g({ A: 'cur', S: 'win' }, { 'C-A': 'ok', 'A-S': 'win' }), { type: 'array', label: 'Keys to send', values: keys.slice(), ptr: ptr, hl: ah }, { type: 'map', label: 'Key store (key, saved response)', entries: store.map(function (e) { return e.slice(); }), hl: mh }, { type: 'vars', vals: { charges: charges, response: store[found][1] + ' (replayed)' }, hl: { response: 'win' } }] });
        } else {
          charges++;
          store.push([k, '201 payment #' + charges]);
          mh[k] = 'ok';
          frames.push({ narr: 'Request ' + (i + 1) + ' has key <b>' + k + '</b>. The key is <span class="c-g">new</span>: the API charges once, then saves the key with the response so a later retry can be answered from the store.', parts: [g({ A: 'cur', S: 'ok', D: 'ok' }, { 'C-A': 'ok', 'A-S': 'ok', 'A-D': 'ok' }), { type: 'array', label: 'Keys to send', values: keys.slice(), ptr: ptr, hl: ah }, { type: 'map', label: 'Key store (key, saved response)', entries: store.map(function (e) { return e.slice(); }), hl: mh }, { type: 'vars', vals: { charges: charges, response: '201 payment #' + charges }, hl: { charges: 'ok' } }] });
        }
      }
      frames.push({ narr: '<b>' + keys.length + '</b> requests arrived but only <b>' + charges + '</b> payment' + (charges === 1 ? ' was' : 's were') + ' made. Without keys there would be ' + keys.length + ' charges. In real systems the key lookup and the charge must be in one transaction, or guarded by a unique index on the key.', parts: [g({ D: 'sel' }, {}), { type: 'map', label: 'Key store (key, saved response)', entries: store.map(function (e) { return e.slice(); }) }, { type: 'vars', vals: { requests: keys.length, charges: charges, duplicatesAvoided: keys.length - charges }, hl: { duplicatesAvoided: 'ok' } }] });
      while (frames.length < 6) frames.push({ narr: 'Try a longer input such as <code>A A B A C</code> to see retries mixed with new payments.', parts: [g({}, {}), { type: 'vars', vals: { charges: charges } }] });
      return frames;
    }
  },
  examples: [
    { title: 'Offset paging versus keyset paging', html: `${H.table(['', 'Offset', 'Keyset (cursor)'], [['Request', '<code>?page=4000&amp;pageSize=50</code>', '<code>?after=199950&amp;limit=50</code>'], ['What the database does', 'reads and throws away 199,950 rows', 'jumps to id 199950 through the index'], ['If rows are added while paging', 'items repeat or get skipped', 'stable'], ['Jump to page 37', 'yes', 'no'], ['Best for', 'small admin tables', 'feeds, exports, mobile lists']])}<p>Always cap the page size on the server, and check sort fields against a fixed list of allowed names.</p>`, code: { lang: 'csharp', check: false, code: '// Keyset paging with EF Core: ask for one extra row to learn if there is a next page\nvar rows = await db.Orders.AsNoTracking()\n    .Where(o => o.Id > afterId)\n    .OrderBy(o => o.Id)\n    .Take(limit + 1)\n    .Select(o => new OrderDto(o.Id, o.Total, o.Status))\n    .ToListAsync(ct);\n\nbool hasMore = rows.Count > limit;\nif (hasMore) rows.RemoveAt(rows.Count - 1);\nint? nextCursor = hasMore ? rows[rows.Count - 1].Id : (int?)null;' } },
    { title: 'Two editors, one record: ETag and If-Match', html: `<ol><li>Ana and Ben both GET product 9. Both receive <code>ETag: "v7"</code>.</li><li>Ana saves with <code>If-Match: "v7"</code>. It matches, the save works, the version becomes v8.</li><li>Ben saves with <code>If-Match: "v7"</code>. The server sees v8, answers <b>412 Precondition Failed</b>, and Ben's screen reloads the latest data instead of silently wiping Ana's change.</li></ol><p>In EF Core the version usually comes from a <code>rowversion</code> column, and a conflict surfaces as <code>DbUpdateConcurrencyException</code>.</p>` },
    { title: 'A long job with 202 Accepted', html: `<p>Report building takes 3 minutes. Do not hold the connection open.</p>`, code: { lang: 'http', code: 'POST /api/v1/reports                -> 202 Accepted\nLocation: /api/v1/reports/jobs/123\nRetry-After: 5\n\nGET /api/v1/reports/jobs/123        -> 200 { "status": "running" }\nGET /api/v1/reports/jobs/123        -> 200 { "status": "succeeded", "resultUrl": "/api/v1/reports/123/file" }' } }
  ],
  deepDive: `<p><b>Idempotency key details.</b> Store the key with a hash of the request body. If the same key arrives with a different body, answer 422 (or 409) because the client is misusing the key. If the same key arrives while the first call is still running, answer 409 so two workers never run the same payment. Keep keys for a fixed time, often 24 hours. The <code>Idempotency-Key</code> header is still an IETF draft, but payment providers have used it for years.</p>
    <p><b>What is a breaking change?</b> Removing or renaming a field, changing a type, making an optional input required, changing a default, or tightening validation. Adding an optional field or a new endpoint is safe, as long as clients ignore fields they do not know. Version only for breaking changes, and announce the end of an old version with the <code>Deprecation</code> and <code>Sunset</code> response headers plus usage numbers per client.</p>
    <p><b>Caching traps.</b> <code>Cache-Control: private</code> keeps a response out of shared caches; <code>no-store</code> keeps it out of every cache; <code>Vary</code> tells a cache which request headers change the response. Never let a CDN cache a per-user response as public.</p>
    <p><b>Rate limiting algorithms.</b> Fixed window is simple but allows a burst at the window edge. Sliding window smooths that. Token bucket allows short bursts with a steady average. A concurrency limiter caps calls in flight. ASP.NET Core ships all four in its rate limiting middleware. Behind several servers the count must live in a shared place, usually the gateway or Redis.</p>`,
  aiEra: `<p><b>What AI changes:</b> AI features made the slow call common. A model answer can take 30 seconds, so the 202 pattern, streaming and timeouts are now everyday design choices, and AI agents retry calls on their own, which makes idempotency more important than before. <b>Use AI as a partner:</b> ask <code>List every way this POST endpoint can create duplicates under retries and concurrent calls</code>. <b>Where AI goes wrong:</b> generated code often uses offset paging with no size cap, checks the idempotency key and inserts in two separate steps (a race), and adds a version number for every small change. <b>What you must still own:</b> deciding what is a breaking change, choosing the retention time for keys, and proving the duplicate cannot happen even when two requests arrive in the same millisecond.</p>`,
  problems: [P({
    t: 'Cache a Product Catalogue Correctly', l: 'Medium', tags: ['caching', 'ETag'],
    s: 'An online shop serves <code>GET /api/v1/products/{id}</code> 2,000 times per second. Product data changes a few times a day. The same API also serves <code>GET /api/v1/me/basket</code>. How do you use HTTP caching for both?',
    ex: '<p>They want the exact headers for each endpoint and what happens on the second request.</p>',
    weak: 'I would add Redis in front of the database and cache everything for an hour.',
    why: 'It skips HTTP caching, which is free and stops requests before they reach your servers. It also risks caching the basket, which is private per user.',
    q: ['Which header set fits the basket endpoint?', ['Cache-Control: public, max-age=3600', 'Cache-Control: private, no-cache (or no-store)', 'No headers, caches will work it out', 'Expires: next year'], 1, 'The basket is per user. It must never be stored by a shared cache such as a CDN, and it should be checked with the server before reuse.'],
    h: ['Split the endpoints into "same for everyone" and "different per user".', 'A cache can hold a response for a time (max-age) and then ask "has it changed?" with a version stamp.', 'Think about what a shared cache needs to know so it never serves one user\'s data to another.'],
    a: `<p><b>Strong answer:</b> "The product is the same for everyone, the basket is not, so they get different rules."</p><ul><li><b>Product:</b> <code>Cache-Control: public, max-age=60</code> and an <code>ETag</code> built from the row version. A CDN serves it for 60 seconds. After that it sends <code>If-None-Match</code> and usually gets a tiny <b>304</b> with no body. When a product changes, I purge that URL or accept up to 60 seconds of old data, and I say that trade-off out loud.</li><li><b>Basket:</b> <code>Cache-Control: private, no-cache</code>, or <code>no-store</code> if it is sensitive. It needs the token, so no shared cache may keep it.</li><li>If a response depends on a header such as language, I add <code>Vary: Accept-Language</code>.</li></ul><p>"Then I measure the cache hit rate at the CDN. A server-side cache such as Redis comes second, for what HTTP caching cannot cover."</p>`,
    cx: 'you separate public from private data, give real header values, explain 304, and state the staleness you accept.',
    f: ['How do you invalidate when a price changes and 60 seconds is too long?', 'What does Vary: Authorization do to a shared cache?']
  })]
});

// ---------- TOPIC 3 ----------
topics.push({
  title: 'SOAP, gRPC and GraphQL: Picking the Right API Style',
  analogy: `<p>Think of four ways to order food. <b>REST</b> is a fixed menu: each dish has a number and comes the way the kitchen plates it. <b>SOAP</b> is a formal catering contract: a long signed document lists every item, and every order goes in a sealed envelope. <b>gRPC</b> is the kitchen's own intercom: short coded messages between staff, very fast, not meant for customers. <b>GraphQL</b> is a buffet with one counter: you say exactly what you want on your plate, and you get that and nothing else.</p>`,
  explain: `<p><b>The plain idea:</b> all four move data between programs. They differ in who decides the shape of the data, how strict the contract is, and how heavy each message is.</p>
    ${H.table(['', 'REST', 'SOAP', 'gRPC', 'GraphQL'], [
      ['Thinks in', 'resources', 'operations', 'methods (remote calls)', 'a graph of types and fields'],
      ['Message format', 'JSON (usually)', 'XML only', 'Protocol Buffers (binary)', 'JSON'],
      ['Contract', 'OpenAPI (optional)', 'WSDL (required)', '.proto file (required)', 'schema (required)'],
      ['Transport', 'HTTP', 'HTTP, TCP, queues', 'HTTP/2', 'HTTP, one endpoint'],
      ['Streaming', 'add-ons (SSE, WebSocket)', 'no', 'built in, both directions', 'subscriptions'],
      ['Browser', 'native', 'awkward', 'needs gRPC-Web', 'native'],
      ['Best for', 'public and web APIs', 'legacy enterprise links', 'service to service', 'screens that need many shapes of data']
    ])}
    <p>New words: a <b>WSDL</b> is an XML file that describes every operation of a SOAP service. <b>Protocol Buffers</b> (protobuf) is a compact binary format where each field has a number. A GraphQL <b>resolver</b> is the function that fetches one field. <b>N+1</b> is the classic GraphQL trap: 1 query for a list, then 1 more query for each of the N rows.</p>`,
  clues: ['"REST versus SOAP" or "have you worked with WCF?"', '"What replaced WCF in modern .NET?"', '"How do your microservices talk to each other?" (gRPC is the expected option)', '"The mobile app makes 6 calls to draw one screen" (over-fetching and under-fetching, GraphQL or a BFF)', '"What is the N+1 problem?" (DataLoader, batching)', '"Can a browser call gRPC?" (gRPC-Web or JSON transcoding)', '"How do you stop an expensive GraphQL query?" (depth and cost limits)'],
  code: [
    { lang: 'text', title: 'gRPC contract (.proto)', code: 'syntax = "proto3";\noption csharp_namespace = "Shop.Grpc";\n\nservice PriceService {\n  rpc GetPrice (PriceRequest) returns (PriceReply);                 // unary: one in, one out\n  rpc WatchPrices (WatchRequest) returns (stream PriceReply);       // server streaming\n  rpc UploadPrices (stream PriceReply) returns (UploadSummary);     // client streaming\n  rpc Negotiate (stream Offer) returns (stream Offer);              // bidirectional\n}\n\nmessage PriceRequest { int32 product_id = 1; }\nmessage PriceReply   { int32 product_id = 1; string currency = 2; double amount = 3; }\nmessage WatchRequest { repeated int32 product_ids = 1; }\nmessage UploadSummary { int32 accepted = 1; }\nmessage Offer { double amount = 1; }' },
    { lang: 'text', title: 'GraphQL: the client shapes the answer', code: 'query HomeScreen {\n  orders(first: 20, status: OPEN) {\n    nodes {\n      id\n      total\n      customer { name }\n      items { title quantity }\n    }\n    pageInfo { hasNextPage endCursor }\n  }\n}' }
  ],
  codeTitle: ['A .proto file with all four call types', 'One GraphQL query replaces several REST calls'],
  viz: [{
    title: 'N+1 queries versus DataLoader',
    input: '5',
    inputLabel: 'How many orders the GraphQL query returns (2 to 8)',
    gen: function (input) {
      var n = parseInt(String(input).trim(), 10);
      if (isNaN(n) || n < 2 || n > 8) throw new Error('Enter a whole number from 2 to 8');
      var nodes = [{ id: 'C', label: 'Client', x: 10, y: 30, shape: 'box' }, { id: 'G', label: 'GraphQL server', x: 38, y: 30, shape: 'box' }, { id: 'L', label: 'DataLoader', x: 66, y: 12, shape: 'box' }, { id: 'D', label: 'SQL database', x: 90, y: 30, shape: 'box' }];
      var edges = [['C', 'G', '1 request'], ['G', 'D', 'query'], ['G', 'L', 'load(id)'], ['L', 'D', 'batch']];
      function g(hl, ehl) { return { type: 'graph', label: 'orders { id customer { name } }', directed: true, height: 60, nodes: nodes, edges: edges, hl: hl, ehl: ehl }; }
      var frames = [], log = [], i;
      frames.push({ narr: 'The client asks for <b>' + n + ' orders</b> and the <b>customer name</b> of each. One HTTP request. Watch how many SQL queries it turns into.', parts: [g({ C: 'cur' }, { 'C-G': 'ok' }), { type: 'vars', vals: { sqlQueries: 0 } }] });
      log.push('SELECT * FROM Orders (returns ' + n + ' rows)');
      frames.push({ narr: '<b>Naive resolvers.</b> The <code>orders</code> resolver runs 1 query and gets ' + n + ' rows.', parts: [g({ G: 'cur', D: 'ok' }, { 'G-D': 'ok' }), { type: 'queue', label: 'SQL sent', items: log.slice(), frontLabel: 'first', backLabel: 'last' }, { type: 'vars', vals: { sqlQueries: 1 } }] });
      for (i = 1; i <= n; i++) {
        log.push('SELECT * FROM Customers WHERE Id = ' + (100 + i));
        var hq = {}; hq[log.length - 1] = 'bad';
        frames.push({ narr: 'The <code>customer</code> resolver runs for order ' + i + ' and fires its <span class="c-r">own query</span>. It knows nothing about the other orders.', parts: [g({ G: 'cur', D: 'bad' }, { 'G-D': 'bad' }), { type: 'queue', label: 'SQL sent', items: log.slice(), hl: hq, frontLabel: 'first', backLabel: 'last' }, { type: 'vars', vals: { sqlQueries: 1 + i }, hl: { sqlQueries: 'bad' } }] });
      }
      frames.push({ narr: 'Total: <b>1 + ' + n + ' = ' + (n + 1) + '</b> queries for one screen. With 200 orders that is 201 round trips. This is the <b>N+1 problem</b>.', parts: [g({ D: 'bad' }, {}), { type: 'bars', label: 'SQL queries per request', values: [n + 1], texts: ['naive: ' + (n + 1)], hl: { 0: 'bad' } }] });
      var ids = [];
      for (i = 1; i <= n; i++) ids.push(100 + i);
      frames.push({ narr: '<b>With a DataLoader.</b> Each <code>customer</code> resolver does not query. It hands its id to the loader and waits. The loader collects all ids from this round.', parts: [g({ G: 'cur', L: 'win' }, { 'G-L': 'win' }), { type: 'set', label: 'Ids collected by the loader', items: ids.slice() }, { type: 'vars', vals: { sqlQueries: 1 } }] });
      frames.push({ narr: 'The loader sends <b>one</b> batched query for all ids, then hands each resolver its customer. It also caches by id for the rest of this request.', parts: [g({ L: 'ok', D: 'ok' }, { 'L-D': 'ok' }), { type: 'queue', label: 'SQL sent', items: ['SELECT * FROM Orders', 'SELECT * FROM Customers WHERE Id IN (' + ids.join(', ') + ')'], hl: { 1: 'ok' }, frontLabel: 'first', backLabel: 'last' }, { type: 'vars', vals: { sqlQueries: 2 }, hl: { sqlQueries: 'ok' } }] });
      frames.push({ narr: 'Result: <b>2</b> queries instead of <b>' + (n + 1) + '</b>, and it stays 2 no matter how many orders come back.', parts: [g({ D: 'sel' }, {}), { type: 'bars', label: 'SQL queries per request', values: [n + 1, 2], texts: ['naive: ' + (n + 1), 'DataLoader: 2'], hl: { 0: 'bad', 1: 'ok' } }] });
      return frames;
    }
  },
  rowViz('Which style for which job?', 'Decision table', ['The job', 'Pick', 'Main reason'],
    [
      ['Public API for partners and browsers', 'REST + OpenAPI', 'Every tool and language speaks HTTP and JSON; HTTP caching works'],
      ['Service-to-service calls, thousands per second', 'gRPC', 'Binary messages over HTTP/2, generated typed clients, deadlines'],
      ['A dashboard where each widget needs a different shape', 'GraphQL', 'The client asks for exactly the fields it needs in one round trip'],
      ['Connecting to a bank or government system from 2008', 'SOAP client', 'The other side dictates it; generate a client from the WSDL'],
      ['Live price ticker between services', 'gRPC server streaming', 'Streaming is built into the protocol'],
      ['A simple CRUD admin screen', 'REST', 'Least moving parts']
    ],
    ['Six common jobs. For each one we pick a style and say <b>why</b> in one line. That one line is the interview answer.',
      'Outside callers you do not control: keep it boring and universal.',
      'Inside your own system, speed and a strict contract win, and nobody needs to read the messages by eye.',
      'Many screen shapes over the same data is the case GraphQL was made for.',
      'You rarely choose SOAP today. You meet it at the edge of older systems.',
      'gRPC can keep a call open and push messages down it.',
      'Do not pick a heavy tool for a light job. Saying this shows judgement.'],
    'There is no best style. A strong answer names the <b>callers</b>, the <b>traffic</b> and the <b>cost</b> of each choice.', [0, 1, 2])],
  examples: [
    { title: 'A SOAP message, so you can recognise one', html: `<p>Every SOAP call is an XML <b>envelope</b> with an optional header (security, routing) and a body (the operation). It is normally sent with POST, which is why HTTP caching does not help.</p>`, code: { lang: 'text', code: '<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope">\n  <soap:Header>\n    <!-- security token, message id -->\n  </soap:Header>\n  <soap:Body>\n    <GetOrder xmlns="http://example.com/shop">\n      <Id>501</Id>\n    </GetOrder>\n  </soap:Body>\n</soap:Envelope>' } },
    { title: 'A gRPC service in ASP.NET Core', html: `<p>The build generates a base class from the .proto file. You override one method per call. <code>ServerCallContext</code> carries the deadline and the cancellation token.</p>`, code: { lang: 'csharp', check: false, code: 'public class PriceGrpcService(IPriceReader prices) : PriceService.PriceServiceBase\n{\n    public override async Task<PriceReply> GetPrice(PriceRequest request, ServerCallContext context)\n    {\n        var price = await prices.FindAsync(request.ProductId, context.CancellationToken);\n        if (price is null)\n            throw new RpcException(new Status(StatusCode.NotFound, "No price for this product"));\n\n        return new PriceReply { ProductId = price.ProductId, Currency = price.Currency, Amount = (double)price.Amount };\n    }\n}\n\n// Program.cs\nbuilder.Services.AddGrpc();\napp.MapGrpcService<PriceGrpcService>();' } },
    { title: 'Fixing N+1 with a DataLoader (Hot Chocolate)', html: `<p>The resolver asks the loader for one id. The loader collects ids and runs one query for the whole batch.</p>`, code: { lang: 'csharp', check: false, code: 'public class CustomerByIdLoader(IBatchScheduler scheduler, IDbContextFactory<ShopDb> factory, DataLoaderOptions options)\n    : BatchDataLoader<int, Customer>(scheduler, options)\n{\n    protected override async Task<IReadOnlyDictionary<int, Customer>> LoadBatchAsync(\n        IReadOnlyList<int> ids, CancellationToken ct)\n    {\n        await using var db = await factory.CreateDbContextAsync(ct);\n        return await db.Customers\n            .Where(c => ids.Contains(c.Id))      // one query for the whole batch\n            .ToDictionaryAsync(c => c.Id, ct);\n    }\n}\n\n[ExtendObjectType<Order>]\npublic class OrderExtensions\n{\n    public Task<Customer> GetCustomerAsync([Parent] Order order, CustomerByIdLoader loader, CancellationToken ct)\n        => loader.LoadAsync(order.CustomerId, ct);\n}' } }
  ],
  deepDive: `<p><b>WCF today.</b> Windows Communication Foundation was the .NET Framework way to host SOAP and other bindings. Modern .NET has no WCF <i>server</i> in the box. Your choices are: keep calling SOAP services with a generated client (<code>dotnet-svcutil</code> and the <code>System.ServiceModel</code> client packages), host existing contracts on <b>CoreWCF</b> (a community project, covered by Microsoft support) while you migrate, or move to gRPC for internal calls and REST for public ones.</p>
    <p><b>Protobuf compatibility rules.</b> The field <i>number</i> is what goes on the wire, not the name. So: never reuse or change a number, mark removed numbers as <code>reserved</code>, and only add new fields. Old clients skip numbers they do not know. Renaming a field is safe on the wire but breaks JSON transcoding and generated code.</p>
    <p><b>gRPC and browsers.</b> Browsers cannot control HTTP/2 frames, so they use <b>gRPC-Web</b> (unary and server streaming only) or the server offers <b>JSON transcoding</b>, which exposes the same gRPC methods as REST-style JSON endpoints.</p>
    <p><b>GraphQL costs.</b> Almost every call is a POST to one URL, so HTTP caching, per-endpoint rate limits and per-endpoint metrics stop working by default. You replace them with persisted queries, cost-based limits and logging by operation name. Errors often come back as 200 with an <code>errors</code> array, so monitoring must read the body.</p>`,
  aiEra: `<p><b>What AI changes:</b> AI agents and tools call APIs by reading a machine-readable contract. A clear OpenAPI document, .proto file or GraphQL schema is now read by models as well as people, so good names and descriptions matter more. <b>Use AI as a partner:</b> ask <code>Compare gRPC and REST for this call pattern: 4,000 calls per second, 300-byte payloads, both ends are .NET services</code> and then challenge each claim. <b>Where AI goes wrong:</b> it recommends GraphQL or gRPC because they sound modern, writes resolvers with N+1 queries, and reuses protobuf field numbers when asked to "clean up" a message. <b>What you must still own:</b> the choice itself. Name who the callers are, what the traffic looks like, what the team already knows, and what each option costs to run.</p>`,
  problems: [P({
    t: 'Six REST Calls for One Mobile Screen', l: 'Medium', tags: ['GraphQL', 'BFF', 'trade-offs'],
    s: 'The mobile home screen of a booking app calls 6 REST endpoints and takes 4 seconds on a slow network. Each response carries 40 fields and the screen uses 5. A developer proposes "move everything to GraphQL". What do you recommend?',
    ex: '<p>They want you to name the real problem first, list 2 or 3 options with costs, and then pick one.</p>',
    weak: 'Yes, GraphQL fixes over-fetching, so we should migrate the whole API to GraphQL.',
    why: 'It jumps to a tool without measuring, ignores cheaper fixes, and does not mention what GraphQL costs: N+1, caching, query limits and a new skill for the team.',
    q: ['Which option gives the mobile screen one small response with the least new technology?', ['Rewrite all services in gRPC', 'A backend-for-frontend endpoint that returns exactly what the screen needs', 'Increase the server count', 'Turn on response compression only'], 1, 'A backend-for-frontend (BFF) is one endpoint built for one client. It joins the 6 calls on the server and returns only the 5 fields the screen uses.'],
    h: ['Name the two problems separately: too many round trips, and too much data per response.', 'There is a middle option between "leave it" and "adopt GraphQL": an endpoint shaped for this one screen.', 'GraphQL earns its cost when many different screens need many different shapes.'],
    a: `<p><b>Strong answer:</b> "There are two problems: 6 round trips (under-fetching) and 40 fields where 5 are used (over-fetching). I see 3 options."</p><ol><li><b>Backend-for-frontend endpoint:</b> one <code>GET /mobile/home</code> that calls the 6 services in parallel on the server and returns the 5 fields. Cheap, cacheable, no new technology. The cost is one more endpoint to maintain per screen.</li><li><b>Sparse fields on REST:</b> <code>?fields=id,title,date</code>. Fixes the size, not the 6 round trips.</li><li><b>GraphQL:</b> fixes both for every screen, but I must add DataLoaders against N+1, depth and cost limits, persisted queries and new monitoring.</li></ol><p>"If only this screen hurts, I ship option 1 this sprint and measure. If we have many screens and several client teams asking for different shapes every week, GraphQL pays for itself and I would introduce it as a gateway over the existing services, not as a rewrite."</p>`,
    cx: 'you separate the two problems, show a cheap option, state the real costs of GraphQL, and tie the choice to how many clients and shapes there are.',
    f: ['How would you measure whether the change worked?', 'How do you keep a BFF from turning into a second monolith?']
  })]
});

// ---------- TOPIC 4 ----------
var T4_NODES = [
  { id: 'B', label: 'Browser', x: 12, y: 14, shape: 'box' },
  { id: 'S', label: 'Shop server', x: 50, y: 14, shape: 'box' },
  { id: 'Q', label: 'Message broker', x: 88, y: 14, shape: 'box' },
  { id: 'P', label: 'Payment provider', x: 50, y: 50, shape: 'box' }
];
var T4_EDGES = [['B', 'S', 'ask'], ['S', 'B', 'push'], ['P', 'S', 'webhook'], ['S', 'Q', 'publish']];
function t4Wire(rows) { return { type: 'table', label: 'What travels', columns: ['Step', 'Message'], rows: rows }; }

topics.push({
  title: 'Real-Time and Messaging: WebSockets, SignalR, SSE, Webhooks and Queues',
  analogy: `<p>You are waiting for a parcel. <b>Polling</b> is walking to the door every 5 minutes to look. <b>Long polling</b> is standing at the door until someone comes. <b>Server-sent events</b> is a radio in your kitchen: the courier company talks, you only listen. A <b>WebSocket</b> is a phone call: both sides can talk at any time. <b>SignalR</b> is a helpful assistant who picks the best of those for you. A <b>webhook</b> is the courier ringing <i>your</i> doorbell: their system calls your system when something happens. A <b>message queue</b> is a parcel locker: the sender drops it off and the receiver collects it when ready.</p>`,
  explain: `<p><b>The plain idea:</b> normal HTTP is "client asks, server answers". Real-time features need the server to speak first. There are several ways to get that, and each has a cost.</p>
    ${H.table(['Technique', 'Direction', 'Good for', 'Watch out for'], [
      ['Polling', 'client asks on a timer', 'job status every few seconds', 'wasted calls, delay up to one interval'],
      ['Long polling', 'client asks, server holds the reply', 'fallback for old networks', 'one held request per client'],
      ['Server-sent events (SSE)', 'server to client only', 'progress bars, live feeds, streaming AI text', 'text only, one direction'],
      ['WebSocket', 'both ways, one open connection', 'chat, games, shared editing', 'stateful connections, harder to scale'],
      ['SignalR', 'both ways, picks a transport', '.NET dashboards and notifications', 'needs a backplane or Azure SignalR to scale out'],
      ['Webhook', 'server to server HTTP callback', 'payment done, build finished', 'verify the signature, expect duplicates'],
      ['Queue or topic', 'through a broker, not live to a person', 'work between services', 'at-least-once delivery, so handlers must be idempotent']
    ])}
    <p>New words: a <b>hub</b> is the SignalR class that clients call and that calls clients back. A <b>backplane</b> is a shared channel (often Redis) that lets several servers pass messages to each other's connected clients. A <b>broker</b> is a server that holds messages between a sender and a receiver.</p>`,
  clues: ['"How would you push updates to the browser?"', '"WebSockets versus server-sent events" (two-way versus one-way)', '"How does SignalR choose a transport?" and "how do you scale SignalR?"', '"Stream the AI answer token by token" (SSE)', '"The payment provider notifies us" (webhook: signature, retries, idempotency)', '"Queue versus topic" and "at-least-once delivery"', '"Service Bus versus Event Grid versus Event Hubs versus Kafka"'],
  code: [
    { lang: 'csharp', check: false, title: 'SignalR hub', code: 'public class OrderHub : Hub\n{\n    // A client calls this to follow one order\n    public Task Follow(string orderId)\n        => Groups.AddToGroupAsync(Context.ConnectionId, "order-" + orderId);\n}\n\n// Anywhere on the server: push to everyone following that order\npublic class OrderNotifier(IHubContext<OrderHub> hub)\n{\n    public Task StatusChanged(string orderId, string status)\n        => hub.Clients.Group("order-" + orderId).SendAsync("statusChanged", orderId, status);\n}\n\n// Program.cs\nbuilder.Services.AddSignalR();\napp.MapHub<OrderHub>("/hubs/orders");' },
    { lang: 'csharp', check: false, title: 'Server-sent events endpoint', code: 'app.MapGet("/api/v1/orders/{id}/events", async (string id, HttpContext http, IOrderFeed feed, CancellationToken ct) =>\n{\n    http.Response.Headers.ContentType = "text/event-stream";\n    http.Response.Headers.CacheControl = "no-cache";\n\n    await foreach (var status in feed.WatchAsync(id, ct))   // ct fires when the browser leaves\n    {\n        await http.Response.WriteAsync("data: " + status + "\\n\\n", ct);\n        await http.Response.Body.FlushAsync(ct);\n    }\n});' }
  ],
  codeTitle: ['SignalR: clients join a group, the server pushes to the group', 'SSE by hand: one long response made of "data:" lines'],
  viz: flowViz('Six ways to learn that the order shipped', 'Who starts the conversation?', T4_NODES, T4_EDGES, [
    { narr: 'An order changes from <b>Paid</b> to <b>Shipped</b>. How does everyone find out? We walk through 6 techniques and watch <b>who speaks first</b>.', hl: { S: 'cur' }, parts: [t4Wire([['start', 'Order 501 is Paid']])] },
    { narr: '<b>Polling.</b> The browser asks every 5 seconds. Most answers are "no change". Simple, but wasteful, and the news can be up to 5 seconds late.', hl: { B: 'cur' }, ehl: { 'B-S': 'cur' }, parts: [t4Wire([['0 s', 'GET /orders/501 -> Paid'], ['5 s', 'GET /orders/501 -> Paid'], ['10 s', 'GET /orders/501 -> Shipped']])] },
    { narr: '<b>Long polling.</b> The browser asks once and the server <i>holds</i> the request until something changes, then answers. The browser asks again right away.', hl: { S: 'win' }, ehl: { 'B-S': 'win', 'S-B': 'ok' }, parts: [t4Wire([['0 s', 'GET /orders/501/wait (server holds it)'], ['8 s', 'reply: Shipped'], ['8 s', 'browser opens the next wait']])] },
    { narr: '<b>Server-sent events.</b> The browser opens one GET. The server keeps the response open and writes a <code>data:</code> line for each event. One direction only. The browser reconnects by itself.', hl: { S: 'ok' }, ehl: { 'S-B': 'ok' }, parts: [t4Wire([['open', 'GET /orders/501/events, Accept: text/event-stream'], ['event', 'data: Packed'], ['event', 'data: Shipped']])] },
    { narr: '<b>WebSocket.</b> The browser sends an HTTP request asking to <i>upgrade</i>. After a <b>101 Switching Protocols</b> reply the same connection carries messages both ways for as long as it stays open.', hl: { B: 'ok', S: 'ok' }, ehl: { 'B-S': 'ok', 'S-B': 'ok' }, parts: [t4Wire([['handshake', 'GET /ws, Upgrade: websocket -> 101'], ['server', 'Shipped'], ['browser', 'show me the tracking link']])] },
    { narr: '<b>SignalR.</b> The client first calls <code>/negotiate</code>, then uses the best transport available: WebSockets, else SSE, else long polling. Your code only says "send to group order-501".', hl: { S: 'sel' }, ehl: { 'B-S': 'ok', 'S-B': 'ok' }, parts: [t4Wire([['1', 'POST /hubs/orders/negotiate'], ['2', 'connect with WebSockets'], ['3', 'server: Clients.Group("order-501").statusChanged']])] },
    { narr: '<b>Webhook.</b> A different system speaks first. The payment provider POSTs to <i>our</i> URL when the payment settles. We check the signature, answer 200 fast, and do the work later.', hl: { P: 'cur', S: 'ok' }, ehl: { 'P-S': 'ok' }, parts: [t4Wire([['provider', 'POST /webhooks/payments, X-Signature: sha256=9c1e'], ['us', 'verify signature, store event id, reply 200'], ['us', 'process in the background']])] },
    { narr: '<b>Queue or topic.</b> The server publishes "OrderShipped" to a broker. Email, invoicing and analytics each read it when they are ready. If one is down, the message waits. Delivery is <b>at least once</b>, so each reader must cope with a duplicate.', hl: { Q: 'ok' }, ehl: { 'S-Q': 'ok' }, parts: [t4Wire([['publish', 'OrderShipped { orderId: 501 }'], ['email service', 'reads it, sends the mail'], ['invoice service', 'reads it 2 minutes later, after a restart']])] }
  ], 64),
  examples: [
    { title: 'Reading server-sent events in the browser', html: `<p><code>EventSource</code> is built into browsers and reconnects on its own. It cannot send custom headers or a POST body. When you need a bearer token or a body, read the stream with <code>fetch</code> instead.</p>`, code: { lang: 'js', code: 'const source = new EventSource("/api/v1/orders/501/events");\n\nsource.onmessage = (event) => {\n  document.querySelector("#status").textContent = event.data;\n};\n\nsource.onerror = () => {\n  // The browser retries by itself. Close only if you are done.\n  console.log("connection lost, the browser will retry");\n};' } },
    { title: 'Receiving a webhook safely', html: `<ol><li><b>Verify the signature.</b> The sender signs the raw body with a shared secret (HMAC-SHA256). Compute the same value and compare in constant time.</li><li><b>Reject old messages.</b> Check the timestamp header so a captured request cannot be replayed later.</li><li><b>Deduplicate.</b> Save the event id with a unique index. A repeat is answered 200 and skipped.</li><li><b>Answer fast.</b> Put the event on a queue, return 200, and process in the background. Slow answers cause the sender to retry.</li></ol>` },
    { title: 'Queue, topic, event: which Azure service?', html: `${H.table(['Need', 'Service', 'Why'], [['One worker should handle each order, in order, with retries', 'Service Bus queue', 'sessions, dead-letter queue, duplicate detection'], ['Several services react to the same business message', 'Service Bus topic with subscriptions', 'publish and subscribe with per-subscriber filters'], ['"A blob was created", react with a function', 'Event Grid', 'lightweight push of events to handlers'], ['Millions of telemetry readings per second', 'Event Hubs (or Kafka)', 'a partitioned log you can replay'], ['Small devices on poor networks', 'MQTT', 'tiny publish and subscribe protocol for IoT']])}` }
  ],
  deepDive: `<p><b>Scaling SignalR.</b> A WebSocket lives on one server. With 3 servers, a message raised on server 1 must reach clients connected to servers 2 and 3. Two fixes: a <b>Redis backplane</b>, where every server publishes each message to Redis and all servers relay it, or <b>Azure SignalR Service</b>, where clients connect to the managed service and your servers only send messages to it. Without Azure SignalR you also need <b>sticky sessions</b> (the load balancer keeps a client on one server) unless every client uses WebSockets and skips negotiation.</p>
    <p><b>SSE in .NET 10.</b> Minimal APIs can return <code>TypedResults.ServerSentEvents(stream)</code> from an <code>IAsyncEnumerable</code>, so you no longer write the <code>data:</code> lines by hand. SSE runs over plain HTTP, passes through most proxies, and under HTTP/2 does not hit the old limit of 6 connections per site.</p>
    <p><b>HTTP versions.</b> HTTP/1.1 handles one request at a time per connection. HTTP/2 runs many streams over one TCP connection and compresses headers, but one lost packet still stalls every stream. HTTP/3 runs on QUIC over UDP, so a lost packet only delays its own stream.</p>
    <p><b>Delivery guarantees.</b> Brokers give you at-least-once delivery. "Exactly once" is achieved by your handler: record the message id in the same transaction as the work, and skip ids you have seen.</p>`,
  aiEra: `<p><b>What AI changes:</b> chat screens made streaming a default. Models produce text piece by piece, and the usual way to show it is server-sent events, with a 202 job and a webhook or queue for long background runs. <b>Use AI as a partner:</b> ask <code>For 50,000 open connections that only receive updates, compare SSE and WebSockets on server memory, proxies and reconnect behaviour</code>. <b>Where AI goes wrong:</b> it reaches for WebSockets when one-way SSE is enough, forgets to pass the cancellation token so the server keeps generating after the user left, and writes webhook handlers with no signature check and no duplicate check. <b>What you must still own:</b> choosing the simplest technique that meets the need, and the scale-out plan: where connections live and what happens when a server restarts.</p>`
});

// ---------- TOPIC 5 ----------
var CS_ITEST = [
  'public class OrdersApiTests(WebApplicationFactory<Program> factory)',
  '    : IClassFixture<WebApplicationFactory<Program>>',
  '{',
  '    [Fact]',
  '    public async Task Post_ReturnsCreated_AndLocation()',
  '    {',
  '        var client = factory.CreateClient();',
  '        var body = new { productId = 17, quantity = 2 };',
  '',
  '        var response = await client.PostAsJsonAsync("/api/v1/orders", body);',
  '',
  '        Assert.Equal(HttpStatusCode.Created, response.StatusCode);',
  '        Assert.NotNull(response.Headers.Location);',
  '    }',
  '}'
].join('\n');

topics.push({
  title: 'API Testing: From Unit Tests to Load Tests',
  analogy: `<p>Think of a <b>car factory</b>. Each bolt is checked on its own (a <b>unit test</b>): fast and cheap, thousands a day. Then the engine is run on a bench with real fuel (an <b>integration test</b>). The supplier and the factory agree on the size of every plug (a <b>contract test</b>). A few finished cars are driven on a track (<b>end-to-end tests</b>): slow, but they prove the whole thing moves. And once in a while a car is driven flat out for hours (a <b>load test</b>) to see what breaks first.</p>`,
  explain: `<p><b>The plain idea:</b> one kind of test cannot catch every kind of bug, so you layer them. The cheap, fast ones are many. The slow, wide ones are few. This shape is called the <b>test pyramid</b>.</p>
    ${H.table(['Level', 'What it runs', 'Speed', 'Usual tools', 'Example'], [
      ['Unit', 'one class, dependencies faked', 'milliseconds', 'xUnit or NUnit, Moq or NSubstitute', 'a discount rule'],
      ['Integration', 'the real API pipeline and a real database', 'seconds', 'WebApplicationFactory, Testcontainers', 'POST returns 201 and the row exists'],
      ['Contract', 'does the response still match what clients expect?', 'seconds', 'Pact, OpenAPI diff', 'a renamed field fails the build'],
      ['End to end', 'screen, API and database together', 'slow', 'Playwright', 'place an order from the UI'],
      ['Load', 'many users at once', 'minutes', 'k6, JMeter, Azure Load Testing', '200 users on the dashboard'],
      ['Security', 'sign-in, permissions, injection', 'varies', 'OWASP ZAP, dependency scanners', 'user A cannot read user B'],
      ['Smoke', 'is the new deployment alive?', 'seconds', 'a pipeline step calling /health', 'after each release']
    ])}
    <p>New words: a <b>mock</b> is a fake object that records how it was called. A <b>test double</b> is any stand-in for a real dependency. <b>p95</b> means 95 out of 100 requests were at least this fast. A <b>flaky test</b> passes and fails with no code change.</p>`,
  clues: ['"What is your testing strategy for an API?"', '"Unit test versus integration test"', '"How do you test a controller without a real database?"', '"How do you know a backend change will not break the front end?" (contract tests)', '"How do you test authorization?" (200, 401 and 403 per endpoint, and user A against user B)', '"How do you load test, and what numbers do you report?" (p95, p99, error rate)', '"How do you deal with flaky tests?"', '"What do you look for in an API code review?"'],
  code: [{ lang: 'csharp', check: false, title: 'Unit test with xUnit and Moq', code: 'public class OrderServiceTests\n{\n    private readonly Mock<IOrderRepository> _orders = new();\n    private readonly Mock<INotifier> _notifier = new();\n    private OrderService CreateService() => new(_orders.Object, _notifier.Object);\n\n    [Fact]\n    public async Task Ship_MarksShipped_AndNotifiesCustomer()\n    {\n        // Arrange: a paid order exists\n        _orders.Setup(r => r.GetAsync(1, default))\n               .ReturnsAsync(new Order { Id = 1, Status = OrderStatus.Paid, Email = "a@example.com" });\n\n        // Act\n        await CreateService().ShipAsync(1, default);\n\n        // Assert: saved once as Shipped, customer told once\n        _orders.Verify(r => r.SaveAsync(It.Is<Order>(o => o.Status == OrderStatus.Shipped), default), Times.Once);\n        _notifier.Verify(n => n.SendAsync("a@example.com", It.IsAny<string>()), Times.Once);\n    }\n\n    [Theory]\n    [InlineData(OrderStatus.Placed)]\n    [InlineData(OrderStatus.Cancelled)]\n    public async Task Ship_Throws_WhenOrderIsNotPaid(OrderStatus status)\n    {\n        _orders.Setup(r => r.GetAsync(1, default)).ReturnsAsync(new Order { Id = 1, Status = status });\n\n        await Assert.ThrowsAsync<InvalidOperationException>(() => CreateService().ShipAsync(1, default));\n        _orders.Verify(r => r.SaveAsync(It.IsAny<Order>(), default), Times.Never);   // nothing saved on failure\n    }\n}' }],
  codeTitle: ['Arrange, act, assert: one happy path and one failure path'],
  viz: {
    title: 'An integration test, line by line',
    gen: function () {
      function f(narr, line, cls, vals, stack, hlv) {
        var h = {}; h[line] = cls;
        return { narr: narr, parts: [
          { type: 'code', label: 'OrdersApiTests.cs', lang: 'csharp', code: CS_ITEST, hl: h },
          { type: 'stack', label: 'Where the request is (bottom = entered first)', items: stack },
          { type: 'vars', label: 'State', vals: vals, hl: hlv || {} }
        ] };
      }
      return [
        f('xUnit creates one <code>WebApplicationFactory</code> for the class. It starts the <b>whole app in memory</b>: real routing, real middleware, real dependency injection. No network port is opened.', 1, 'cur', { app: 'starting in memory', database: 'test database' }, ['test host']),
        f('<code>CreateClient()</code> returns an <code>HttpClient</code> wired straight into that in-memory server.', 7, 'cur', { app: 'running', client: 'ready' }, ['test host']),
        f('The test builds a request body. Nothing is mocked inside the API: this is what makes it an integration test.', 8, 'cur', { app: 'running', body: '{ productId: 17, quantity: 2 }' }, ['test host']),
        f('The POST enters the pipeline. It passes exception handling, authentication and authorization middleware, then routing finds the endpoint.', 10, 'cur', { app: 'running', request: 'POST /api/v1/orders' }, ['test host', 'exception handler', 'authentication', 'authorization', 'routing']),
        f('Model binding and validation run, the endpoint calls the service, and the service saves a row through EF Core.', 10, 'win', { request: 'POST /api/v1/orders', rowsInOrders: 1 }, ['test host', 'exception handler', 'authentication', 'authorization', 'routing', 'endpoint', 'OrderService', 'DbContext'], { rowsInOrders: 'ok' }),
        f('The response travels back out through the same middleware and reaches the test.', 10, 'ok', { status: '201 Created', location: '/api/v1/orders/501' }, ['test host'], { status: 'ok' }),
        f('First assert: the status code is <b>201</b>, not just "some success".', 12, 'ok', { status: '201 Created', location: '/api/v1/orders/501' }, ['test host'], { status: 'ok' }),
        f('Second assert: a <code>Location</code> header exists. A unit test of the service could never catch a missing header, a wrong route or a broken JSON setting. This test can.', 13, 'ok', { status: '201 Created', location: '/api/v1/orders/501', result: 'PASS' }, ['test host'], { location: 'ok', result: 'ok' })
      ];
    }
  },
  examples: [
    { title: 'Swapping real dependencies in an integration test', html: `<p>Replace only what you cannot run in a test: the database connection and the sign-in scheme. Everything else stays real. Use a real database engine in a container when the test touches SQL behaviour, because the EF Core in-memory provider ignores constraints, transactions and SQL translation.</p>`, code: { lang: 'csharp', check: false, code: 'var client = factory.WithWebHostBuilder(host =>\n{\n    host.ConfigureTestServices(services =>\n    {\n        // Point EF Core at a throwaway SQL Server started by Testcontainers\n        services.RemoveAll<DbContextOptions<ShopDb>>();\n        services.AddDbContext<ShopDb>(o => o.UseSqlServer(sqlContainer.GetConnectionString()));\n\n        // Replace real sign-in with a handler that returns known claims\n        services.AddAuthentication("Test")\n                .AddScheme<AuthenticationSchemeOptions, TestAuthHandler>("Test", _ => { });\n    });\n}).CreateClient();' } },
    { title: 'A k6 load test with pass or fail limits', html: `<p>Ramp up, hold, ramp down. The <b>thresholds</b> turn the run into a test: if p95 goes over 500 ms or more than 1% of calls fail, the pipeline step fails.</p>`, code: { lang: 'js', check: false, code: 'import http from "k6/http";\nimport { check, sleep } from "k6";\n\nexport const options = {\n  stages: [\n    { duration: "1m", target: 50 },    // warm up\n    { duration: "3m", target: 200 },   // hold 200 virtual users\n    { duration: "1m", target: 0 }      // ramp down\n  ],\n  thresholds: {\n    http_req_duration: ["p(95)<500"],\n    http_req_failed: ["rate<0.01"]\n  }\n};\n\nexport default function () {\n  const res = http.get(__ENV.BASE_URL + "/api/v1/orders", {\n    headers: { Authorization: "Bearer " + __ENV.TOKEN }\n  });\n  check(res, { "status is 200": (r) => r.status === 200 });\n  sleep(1);\n}' } },
    { title: 'Faking an outside HTTP service', html: `<p>Never call a real third-party API from a unit test. In .NET, <code>HttpClient</code> does its work through an <code>HttpMessageHandler</code>, so you swap in a handler that returns what you choose. In TypeScript, Mock Service Worker (MSW) does the same job at the network layer.</p>`, code: { lang: 'csharp', check: false, code: 'public class StubHandler(Func<HttpRequestMessage, HttpResponseMessage> respond) : HttpMessageHandler\n{\n    protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)\n        => Task.FromResult(respond(request));\n}\n\n// In the test: the "rates service" always answers 503, so we can test our fallback\nvar http = new HttpClient(new StubHandler(_ => new HttpResponseMessage(HttpStatusCode.ServiceUnavailable)))\n{\n    BaseAddress = new Uri("https://rates.example.com")\n};\nvar client = new RatesClient(http);' } }
  ],
  deepDive: `<p><b>Where each test runs in CI.</b> Unit tests on every commit. Integration and contract tests on every pull request. Load and security scans on a schedule or before a release. A smoke test after each deployment. Publish results and coverage as pipeline artifacts.</p>
    <p><b>Contract tests, two flavours.</b> With <b>consumer-driven contracts</b> (Pact) each client records what it needs, and the API build proves it still delivers that. With <b>schema checks</b>, the build compares the new OpenAPI document with the last released one (for example with <code>oasdiff</code>) and fails on a breaking change. The second is cheaper and catches most accidents.</p>
    <p><b>Killing flakiness.</b> The usual causes are shared data, the real clock, random values, test order and real network calls. Fixes: each test builds its own data with small builder helpers, the database is reset or isolated per test, time comes from <code>TimeProvider</code> (built in since .NET 8) so a test can set it, and outside services are stubbed. Quarantine a flaky test at once and fix it within days. Automatic retries hide real bugs.</p>
    <p><b>Load test reporting.</b> Averages lie. Report p95 and p99 latency, requests per second, error rate, and what ran out first: CPU, memory, database capacity or the connection pool. Use data volumes close to production.</p>
    <p><b>Testing in .NET 10.</b> <code>WebApplicationFactory&lt;Program&gt;</code> needs to see the <code>Program</code> class. Older projects add <code>public partial class Program { }</code> at the bottom of Program.cs; in .NET 10 the compiler tooling makes it public for you.</p>`,
  aiEra: `<p><b>What AI changes:</b> assistants write unit tests quickly, so the number of tests is no longer a signal of quality. What the tests <i>prove</i> is. <b>Use AI as a partner:</b> ask <code>List the failure cases this endpoint has no test for: bad input, missing token, wrong role, another user's id, duplicate request, dependency timeout</code>. <b>Where AI goes wrong:</b> it writes tests that repeat the implementation (so they pass even when the logic is wrong), mocks so much that nothing real runs, asserts only "status is success", and uses the EF Core in-memory provider for SQL behaviour. <b>What you must still own:</b> the strategy (which level catches which risk) and the rule that features calling a language model are never unit tested against the real model: stub the client, and keep a small scheduled set of evaluation cases with expected properties.</p>`,
  problems: [P({
    t: 'A Pull Request With Only a Happy-Path Test', l: 'Medium', tags: ['testing', 'code review'],
    s: 'A developer opens a pull request that adds <code>PUT /api/v1/orders/{id}/address</code>. It has one unit test: a valid address on an existing order returns success. As tech lead, which tests do you ask for before you approve, and at which level?',
    ex: '<p>They want a short, ordered list: the test, its level, and the bug it would catch.</p>',
    weak: 'I would ask them to increase code coverage to 80%.',
    why: 'Coverage counts lines that ran, not behaviours that were checked. A single happy-path test can reach 80% and still miss every failure.',
    q: ['Which missing test guards against the most serious bug?', ['A test that the address has a postcode', 'A test that customer A cannot change the address on customer B\'s order', 'A test that the endpoint returns JSON', 'A test with a very long street name'], 1, 'Changing another user\'s order is broken object level authorization, the top item in the OWASP API Security list. It needs an integration test with two different users.'],
    h: ['List the ways this call can fail: the caller, the input, the state of the order, and timing.', 'Some failures only show up when the real pipeline runs: sign-in, routing, validation settings.', 'Think about two requests at once, and about a request that is repeated.'],
    a: `<p><b>Strong answer:</b> "I ask for 6 cases, cheapest level first."</p><ol><li><b>Unit:</b> an order that is already shipped cannot change address (expect the domain error).</li><li><b>Unit:</b> invalid address fields are rejected.</li><li><b>Integration:</b> no token returns <b>401</b>.</li><li><b>Integration:</b> customer A on customer B's order returns <b>403 or 404</b>. This is the one I will not merge without.</li><li><b>Integration:</b> unknown order id returns <b>404</b>, bad body returns <b>400</b> with Problem Details.</li><li><b>Integration:</b> a stale <code>If-Match</code> returns <b>412</b>, if the endpoint uses concurrency checks.</li></ol><p>"I also check the OpenAPI document changed as expected so the front end team sees the new endpoint. I explain the reason for each test in the review, so next time the developer adds them without being asked."</p>`,
    cx: 'you think in failure cases, place each at the cheapest level that can catch it, single out the authorization test, and coach instead of only blocking.',
    f: ['How would you make these cases a checklist the team follows without you?', 'Which of these would you automate as a reusable test helper?']
  })]
});

// ---------- PRACTICE: 3 Easy, 5 Medium, 4 Hard ----------
practice.push(P({
  t: 'Pick the Status Codes for a Booking API', l: 'Easy', tags: ['status codes'],
  s: 'For a room booking API, say which status code you return in each case: (1) a booking is created, (2) the JSON body cannot be parsed, (3) the token has expired, (4) a guest tries to cancel someone else\'s booking, (5) the room is already taken for those dates, (6) the client sent 500 requests in one minute.',
  ex: '<p>They want the 6 codes in order, each with a 5-word reason, in under a minute.</p>',
  weak: '200 when it works, 400 when the client is wrong and 500 when something fails.',
  why: 'Three codes cannot tell a client whether to sign in again, stop, fix the input or retry later. Clients, gateways and dashboards all act on the exact code.',
  q: ['The room is already booked for those dates. Which code fits best?', ['400 Bad Request', '404 Not Found', '409 Conflict', '500 Internal Server Error'], 2, 'The request is well formed and the caller is allowed. It clashes with the current state of the resource, which is what 409 means.'],
  h: ['Sort each case first: did it work, is the caller unknown, is the caller not allowed, or is the input wrong?', 'A clash with data that already exists has its own code in the 4xx family.', 'For "too many requests", also name the header that tells the client when to try again.'],
  a: `<p><b>Strong answer:</b></p><ol><li>Created: <b>201</b> with a <code>Location</code> header pointing at the new booking.</li><li>Unparseable JSON: <b>400</b>.</li><li>Expired token: <b>401</b>. The client should get a new token and try again.</li><li>Someone else's booking: <b>403</b>. Some teams return 404 so they do not reveal that the booking exists. I would pick one rule and keep it.</li><li>Room already taken: <b>409</b>.</li><li>Too many calls: <b>429</b> with <code>Retry-After</code>.</li></ol><p>"All error bodies use the same Problem Details shape with a trace id, so support can find the request in the logs."</p>`,
  cx: 'six precise codes, the 401 versus 403 line, the Location and Retry-After headers, and one consistent error body.',
  f: ['When would you return 422 instead of 400?', 'What does the client do differently on 401 versus 403?']
}));

practice.push(P({
  t: 'The Customer Was Charged Twice', l: 'Easy', tags: ['idempotency', 'retries'],
  s: 'A mobile app calls <code>POST /api/v1/payments</code>. On a weak network the call times out, the app retries, and some customers are charged twice. How do you fix it?',
  ex: '<p>They want the cause in one sentence, then the fix on both the client and the server.</p>',
  weak: 'Remove the retry from the app, or make the timeout longer.',
  why: 'Without a retry, a real failure leaves the customer unpaid and confused. A longer timeout only makes the problem rarer. The server still cannot tell a retry from a new payment.',
  q: ['Why did the retry create a second charge?', ['POST is not idempotent, and the server had no way to recognise the retry', 'The app used HTTPS', 'The database was slow', 'The token had expired'], 0, 'The first request did reach the server and was processed. Only the response was lost. The second POST looked like a brand new payment.'],
  h: ['Ask what really happened to the first request. Did it fail, or did only the answer get lost?', 'The server needs something in the request that is the same on the retry and different for a new payment.', 'Think about two copies of the request arriving at almost the same moment.'],
  a: `<p><b>Strong answer:</b> "The first call succeeded but the response was lost, and POST is not idempotent, so the retry made a second payment. I fix it with an idempotency key."</p><ul><li><b>Client:</b> create one unique id per payment attempt (a GUID) when the user taps Pay, and send it as an <code>Idempotency-Key</code> header on the first call and on every retry.</li><li><b>Server:</b> save the key with a unique index, in the same transaction as the payment. If the key already exists, return the saved response and do no work.</li><li><b>Edge cases:</b> same key while the first call is still running returns 409; same key with a different body returns 422; keys expire after about 24 hours.</li></ul><p>"Then I add an integration test that sends the same request twice and asserts exactly one payment row."</p>`,
  cx: 'you explain that the response was lost, not the request; you put the key on the client and a unique constraint on the server; you cover the concurrent case.',
  f: ['Where do you store the keys, and for how long?', 'How is this different from making the endpoint a PUT?']
}));

practice.push(P({
  t: 'It Works in Postman but Not in the Browser', l: 'Easy', tags: ['CORS'],
  s: 'A React app on <code>https://app.example.com</code> calls an API on <code>https://api.example.com</code>. The browser console shows a CORS error. The same call works from Postman. A developer suggests allowing every origin. What do you check and what do you do?',
  ex: '<p>They want you to explain why Postman works, then give the safe fix.</p>',
  weak: 'Add AllowAnyOrigin, AllowAnyHeader and AllowAnyMethod so the error goes away.',
  why: 'It opens the API to scripts on any website, and it will not even work once the app sends cookies, because browsers refuse a wildcard origin together with credentials.',
  q: ['Why does the call work from Postman?', ['Postman uses a faster network', 'CORS is enforced by browsers only; other clients ignore it', 'Postman adds a secret header', 'The API trusts Postman'], 1, 'CORS is a browser safety rule about which web pages may read a response. Tools and servers do not apply it, which is also why CORS is not a security control for the API itself.'],
  h: ['CORS is checked by one kind of client only. Which one?', 'Look in the browser network tab for a request with the OPTIONS method before the real call.', 'The fix is a server setting that names who may call, as narrowly as possible.'],
  a: `<p><b>Strong answer:</b> "CORS is a browser rule. The browser blocks a page from reading a response from another origin unless the server allows that origin. Postman is not a browser, so it never checks."</p><ol><li>In the network tab I look at the <b>preflight</b>: an <code>OPTIONS</code> request sent before calls that use JSON, custom headers or methods such as PUT. I check whether it returns the <code>Access-Control-Allow-Origin</code>, <code>-Methods</code> and <code>-Headers</code> the real call needs.</li><li>On the API I add a named CORS policy with the <b>exact</b> origin <code>https://app.example.com</code>, the methods and headers in use, and credentials only if cookies are sent.</li><li>I check the middleware order: <code>UseCors</code> goes after routing and before authentication, so the preflight is not rejected with 401.</li><li>If a gateway sits in front, I check it is not stripping the headers.</li></ol><p>"I also remind the team that CORS does not protect the API. Authentication and authorization do."</p>`,
  cx: 'you know CORS is browser-only, you mention the preflight, you allow exact origins, and you say it is not a security boundary.',
  f: ['Which requests do not trigger a preflight?', 'How would you avoid CORS completely? (serve the API under the same origin through a reverse proxy)']
}));

practice.push(P({
  t: 'Page 4,000 Takes 9 Seconds', l: 'Medium', tags: ['pagination', 'performance'],
  s: 'An orders list endpoint uses <code>?page=N&amp;pageSize=50</code> over a table with 30 million rows. The first pages are fast. Page 4,000 takes 9 seconds, and an export job that walks every page sometimes skips or repeats orders. What is going on and what do you change?',
  ex: '<p>They want the cause of both symptoms and a design that fixes both.</p>',
  weak: 'Add an index on the table and increase the database size.',
  why: 'An index does not stop OFFSET from reading and discarding all earlier rows, and it does nothing about rows shifting between pages while new orders arrive.',
  q: ['Why does the export skip or repeat orders?', ['The API has a bug in JSON serialisation', 'New rows shift the positions, so "rows 200 to 250" is a different set on the next call', 'The page size is too small', 'The export runs too slowly'], 1, 'Offset paging addresses rows by position. When rows are inserted or deleted during the walk, every later position moves.'],
  h: ['Think about what the database must do to "skip 199,950 rows".', 'Instead of a position, what could the client send that points at the exact last row it saw?', 'You need a sort order that never ties, plus a way for the response to say "there is more".'],
  a: `<p><b>Strong answer:</b> "Both symptoms come from offset paging. To serve page 4,000 the database reads and throws away 199,950 rows, and because pages are positions, new orders shift everything during the export."</p><ul><li>Switch to <b>keyset (cursor) paging</b>: <code>?after=&lt;cursor&gt;&amp;limit=50</code>. The query is <code>WHERE Id &gt; @last ORDER BY Id</code> with <code>TOP (51)</code>, so it seeks through the index at any depth.</li><li>Sort by a unique, stable key. For "newest first" use <code>(CreatedAt, Id)</code> together so ties cannot reorder.</li><li>Return an opaque <code>nextCursor</code> and <code>hasMore</code>. Fetch one extra row to know if more exist. Skip the total count, or make it optional, because counting 30 million rows is expensive.</li><li>Cap <code>limit</code> on the server and allow only known sort fields.</li><li>Keep the old <code>page</code> parameter working for a while so existing clients do not break.</li></ul><p>"The trade-off is that users cannot jump to page 37. For an export and an infinite list, nobody needs to."</p>`,
  cx: 'you link both symptoms to one cause, give the keyset query, mention the tie-breaker and the size cap, and name the trade-off.',
  f: ['How do you page when the sort column is not unique?', 'What would you put inside the cursor, and why make it opaque?']
}));

practice.push(P({
  t: 'Two Admins, One Product, a Lost Update', l: 'Medium', tags: ['concurrency', 'ETag'],
  s: 'Two admins open the same product page. One changes the price, the other fixes the description and saves 10 seconds later. The price change disappears. Nobody sees an error. How do you stop this?',
  ex: '<p>They want the name of the problem, the HTTP mechanism, and what the second admin sees.</p>',
  weak: 'Lock the record when someone opens the edit page, and unlock it when they save.',
  why: 'Locks held while a person thinks cause trouble: people go to lunch, browsers close, and the record stays locked. It also does not fit a stateless API.',
  q: ['Which status code tells the second admin that the record changed since they loaded it?', ['200 OK', '404 Not Found', '412 Precondition Failed', '503 Service Unavailable'], 2, 'The client sends If-Match with the version it loaded. The version on the server no longer matches, so the precondition failed.'],
  h: ['This is called a lost update. The second save was based on an old copy.', 'The server can hand out a version stamp with each read and ask for it back on each write.', 'Decide what the screen shows when the stamp is out of date.'],
  a: `<p><b>Strong answer:</b> "This is a lost update. I fix it with optimistic concurrency: no locks, but every save proves it was based on the latest version."</p><ol><li>The product table gets a <code>rowversion</code> column. EF Core treats it as a concurrency token.</li><li><code>GET</code> returns the version as an <code>ETag</code> header.</li><li><code>PUT</code> or <code>PATCH</code> must send <code>If-Match</code> with that value. If the header is missing I return <b>428 Precondition Required</b>.</li><li>EF Core adds the version to the UPDATE's WHERE clause. If no row matches it throws <code>DbUpdateConcurrencyException</code>, and I return <b>412 Precondition Failed</b>.</li><li>The front end shows "this product was changed by someone else", reloads, and lets the admin apply the change again.</li></ol><p>"Using PATCH with only the changed fields also reduces how often two edits collide in the first place."</p>`,
  cx: 'you name lost update and optimistic concurrency, connect ETag and If-Match to a database row version, give 412, and describe the user experience.',
  f: ['When would you choose a pessimistic lock instead?', 'What is the difference between a strong and a weak ETag?']
}));

practice.push(P({
  t: 'The Report Times Out at the Gateway', l: 'Medium', tags: ['202', 'async'],
  s: 'A <code>POST /api/v1/reports</code> call builds a large report and takes about 3 minutes. The gateway cuts every request at 30 seconds, so users get 504 errors and click again, which starts another report. Redesign the interaction.',
  ex: '<p>They want the request and response sequence, where the work runs, and how the user learns it is done.</p>',
  weak: 'Raise the gateway timeout to 5 minutes.',
  why: 'Long open requests tie up connections, break on any network blip or deployment, and still give the user no progress. The repeated clicks keep multiplying the load.',
  q: ['What should the first POST return?', ['200 with the report after 3 minutes', '202 Accepted with a URL for the job status', '204 No Content', '408 Request Timeout'], 1, '202 means "accepted, not finished". The Location header points at a status resource the client can check.'],
  h: ['Split "ask for the report" from "receive the report".', 'The work needs to survive a web server restart, so it should not run inside the request.', 'Think about the user who clicks the button 3 times.'],
  a: `<p><b>Strong answer:</b> "I change the shape of the call instead of the timeout."</p><ol><li><code>POST /reports</code> validates the input, saves a job row, puts a message on a queue and returns <b>202 Accepted</b> with <code>Location: /reports/jobs/123</code> and <code>Retry-After: 5</code>. This takes milliseconds.</li><li>A background worker (a hosted service or a queue-triggered function) builds the report and stores the file in blob storage.</li><li><code>GET /reports/jobs/123</code> returns <code>queued</code>, <code>running</code> with a percentage, <code>succeeded</code> with a download URL, or <code>failed</code> with a Problem Details body.</li><li>The client polls every few seconds, or I push progress with SignalR or server-sent events if the screen is open.</li><li>An idempotency key, or a rule such as "one running report per user and filter", stops repeated clicks from starting more jobs.</li></ol><p>"The trade-off is more moving parts: a queue, a worker and a job table. In return the system survives restarts and the user sees progress."</p>`,
  cx: 'you use 202 with a status resource, move the work to a durable worker, handle duplicate clicks, and name the added complexity.',
  f: ['How does the worker report progress?', 'How long do you keep finished reports, and who may download them?']
}));

practice.push(P({
  t: 'Rename a Field Used by 40 Partners', l: 'Medium', tags: ['versioning', 'compatibility'],
  s: 'Your public orders API returns a field called <code>amt</code>. The product team wants it renamed to <code>totalAmount</code> and changed from a number to an object with <code>value</code> and <code>currency</code>. 40 partner companies call this API. How do you make the change?',
  ex: '<p>They want a step-by-step rollout with dates and a way to know when it is safe to remove the old field.</p>',
  weak: 'Release v2 next sprint and email the partners that v1 is switched off.',
  why: 'Partners have their own release cycles. Switching off a version on your schedule breaks their production systems and their trust.',
  q: ['Which change is NOT breaking for existing clients?', ['Renaming a field', 'Changing a number to an object', 'Adding a new optional field next to the old one', 'Making an optional input required'], 2, 'Adding is safe when clients ignore fields they do not know. Renaming, retyping and tightening all break someone.'],
  h: ['Can the old and the new field live side by side for a while?', 'You need to know who still reads the old field. How could you measure that?', 'Partners need a date, a guide and a warning inside the API responses themselves.'],
  a: `<p><b>Strong answer:</b> "Removing or retyping a field is a breaking change, so I expand first and contract much later."</p><ol><li><b>Expand:</b> add <code>totalAmount</code> as a new field and keep <code>amt</code>. This is additive, so it can go into v1 today.</li><li><b>Announce:</b> mark <code>amt</code> as deprecated in the OpenAPI document, publish a short migration guide, and return <code>Deprecation</code> and <code>Sunset</code> headers with the removal date. Give partners months, not weeks.</li><li><b>Measure:</b> log calls per partner key and per version. If needed, offer v2 without <code>amt</code> so I can see who has moved.</li><li><b>Chase:</b> contact the partners still on the old field, starting with the largest.</li><li><b>Contract:</b> remove <code>amt</code> only in a new major version, and switch v1 off after the sunset date when traffic is near zero.</li></ol><p>"A contract check in CI (an OpenAPI diff) stops anyone from making a breaking change by accident in the meantime."</p>`,
  cx: 'you use expand and contract, give partners time and data, measure usage before removal, and automate breaking-change detection.',
  f: ['Where would you put the version: URL, header or query string, and why?', 'A big partner refuses to migrate. What now?']
}));

practice.push(P({
  t: 'Choose the Protocols for a New Platform', l: 'Medium', tags: ['gRPC', 'REST', 'architecture'],
  s: 'You are designing a platform with: (a) a pricing service called about 5,000 times per second by 6 internal .NET services, (b) a browser dashboard that shows live order counts, (c) an API for outside partners, and (d) a link to an old supplier system that only exposes a WSDL. Which protocol do you choose for each, and why?',
  ex: '<p>They want one pick and one reason per part, plus one risk you would watch.</p>',
  weak: 'REST for everything, because the team knows it and it is the standard.',
  why: 'It ignores the different needs: REST polling is a poor fit for live counts, JSON over HTTP/1.1 is heavier than needed for 5,000 internal calls per second, and the supplier does not offer REST at all.',
  q: ['Which pick suits 5,000 internal calls per second between .NET services?', ['SOAP', 'gRPC', 'GraphQL', 'Webhooks'], 1, 'gRPC sends compact binary messages over long-lived HTTP/2 connections, generates typed clients from one contract, and supports deadlines.'],
  h: ['Sort the four parts by who the caller is: your own services, a browser, strangers, a legacy system.', 'One of the four needs the server to speak first.', 'For the legacy link you do not get to choose the protocol, only how you contain it.'],
  a: `<p><b>Strong answer:</b></p><ul><li><b>(a) Pricing, internal:</b> <b>gRPC</b>. Small binary messages, one HTTP/2 connection carrying many calls, generated clients from a shared .proto, and a deadline on every call. Risk: load balancing long-lived connections, so I use a service mesh or client-side balancing.</li><li><b>(b) Live dashboard:</b> <b>SignalR</b> (or SSE, since updates only flow one way). With several servers I add Azure SignalR Service or a Redis backplane.</li><li><b>(c) Partners:</b> <b>REST with OpenAPI</b>, versioned, rate limited, behind an API gateway. Everyone can call it from any language.</li><li><b>(d) Supplier:</b> a <b>generated SOAP client</b> wrapped in one adapter service. The rest of the system calls the adapter, never the WSDL types, so the XML does not spread.</li></ul><p>"I keep the number of styles small on purpose. Each one costs tooling, monitoring and training, so each must earn its place."</p>`,
  cx: 'each pick is tied to the caller and the traffic, each has a named risk, and you show restraint about adding technologies.',
  f: ['How do you debug a gRPC call in production?', 'Would you expose the pricing service to the browser? How?']
}));

practice.push(P({
  t: 'A GraphQL Endpoint Is Hurting the Database', l: 'Hard', tags: ['GraphQL', 'N+1', 'security'],
  s: 'Six weeks after launch, your GraphQL endpoint causes database CPU spikes. Logs show one HTTP request producing 800 SQL queries, and one client sending a query nested 12 levels deep that returns megabytes of data. The API is public. What do you do, and in what order?',
  ex: '<p>They want the immediate containment, the root-cause fixes, and the guard rails that stop it happening again.</p>',
  weak: 'Scale up the database and add caching.',
  why: 'A bigger database only moves the limit. One deep query can still multiply into thousands of lookups, and anyone on the internet can send it.',
  q: ['One request produced 800 SQL queries. What is the most likely cause?', ['A missing index', 'Resolvers that each run their own query per parent row (N+1)', 'Slow JSON serialisation', 'Too many HTTP connections'], 1, 'Each nested field resolver runs once per parent item. Without batching, the query count multiplies at every level of the query.'],
  h: ['Separate "stop the bleeding today" from "fix the cause this sprint".', 'Two different problems are mixed here: the server does too much work per field, and clients are allowed to ask for too much.', 'Normal rate limiting counts requests. Is one request always the same amount of work in GraphQL?'],
  a: `<p><b>Strong answer:</b> "Two problems: N+1 resolvers, and no limit on what a client may ask. I contain first, then fix."</p><ol><li><b>Today:</b> set a maximum query depth and a maximum cost, set a request timeout, and require paging arguments on every list with a capped <code>first</code>. Requests over the limit get a clear error.</li><li><b>This sprint, N+1:</b> add DataLoaders for the hot relationships so each level becomes one batched query. Where possible let the server project only the requested columns.</li><li><b>Limits by cost:</b> rate limit on the calculated cost of a query, not on the request count, because one request can be 1 unit of work or 10,000.</li><li><b>Close the door:</b> for our own apps, use persisted queries so only known queries run. Turn off introspection in production if outsiders do not need the schema.</li><li><b>See it next time:</b> log operation name, cost, duration and SQL count per request, and alert on the top offenders.</li><li><b>Authorization:</b> check permissions per field or resolver, since a deep query can reach data through a side path.</li></ol><p>"Then I add a test that counts SQL queries for the main operations, so N+1 cannot return quietly."</p>`,
  cx: 'containment before cure, DataLoader for N+1, cost-based limits and persisted queries, per-field authorization, and a regression test on query count.',
  f: ['How does a DataLoader know when to send the batch?', 'How would you cache GraphQL responses?']
}));

practice.push(P({
  t: 'Live Order Tracking for 200,000 Users', l: 'Hard', tags: ['SignalR', 'SSE', 'scale'],
  s: 'A delivery company wants a live tracking page. Up to 200,000 customers may have it open at once. Each sees status changes and a courier position every few seconds. Customers only watch; they do not send anything. Design the real-time part on Azure with .NET.',
  ex: '<p>They want the transport, where the connections live, how messages reach the right customer, and what happens on failure.</p>',
  weak: 'Use WebSockets with SignalR on our web servers and add more servers when it gets busy.',
  why: 'It does not say how a message raised on one server reaches a customer connected to another, how 200,000 open connections are held, or how clients recover after a restart.',
  q: ['Customers only receive updates. Which statement is right?', ['WebSockets are required for any live feature', 'A one-way channel such as SSE is enough, and is simpler to run', 'Polling every 100 ms is the best choice', 'Webhooks should be sent to each browser'], 1, 'When data only flows from server to client, server-sent events (or SignalR used one-way) meets the need without two-way connection handling.'],
  h: ['Start with the direction of the data. Do clients ever need to send?', 'With many servers, something shared must route each message to the server holding that customer\'s connection, or hold the connections for you.', 'Plan for the moment a server restarts and 50,000 clients reconnect at once.'],
  a: `<p><b>Strong answer:</b> "The data flows one way, so I do not need full duplex. I would still use SignalR for its groups and reconnect handling, in front of a managed connection service."</p><ul><li><b>Connections:</b> <b>Azure SignalR Service</b> holds the 200,000 connections. My app servers stay stateless and only send messages to the service, so I need no sticky sessions and no backplane.</li><li><b>Routing:</b> on connect, the client joins the group <code>order-{id}</code> after the server checks the order belongs to that user. Updates go to that group only.</li><li><b>Source of events:</b> courier positions arrive on a queue or Event Hubs. A worker reads them, drops updates that are too frequent (one position every few seconds per order is enough), and publishes to the group.</li><li><b>Failure:</b> clients reconnect with backoff and random jitter so a restart does not cause a stampede. After reconnecting, the page calls a normal REST endpoint for the current state, because messages sent while it was offline are gone.</li><li><b>Security:</b> the token is checked at negotiate, and group membership is decided by the server, never by the client.</li><li><b>Cost check:</b> I load test with a tool that opens many connections and watch message rate per unit of the service.</li></ul><p>"A plain SSE endpoint would also work and is cheaper to reason about. I pick SignalR here for groups, fallback transports and the managed scale-out."</p>`,
  cx: 'you start from the data direction, place connections in a managed service, route by server-controlled groups, handle reconnect storms and missed messages, and name an alternative.',
  f: ['How would you do this without Azure SignalR Service?', 'What changes if customers can chat with the courier?']
}));

practice.push(P({
  t: 'Webhooks: Some Lost, Some Delivered Twice', l: 'Hard', tags: ['webhooks', 'reliability'],
  s: 'Your booking platform sends webhooks to partner systems when a booking changes. Partners complain: some events never arrive, some arrive twice, some arrive out of order, and one partner asks how they can be sure a webhook really came from you. Redesign webhook delivery.',
  ex: '<p>They want the sending pipeline, the retry policy, what you promise partners, and what partners must do.</p>',
  weak: 'Call the partner URL inside the booking request, and if it fails, log the error.',
  why: 'The booking then depends on a partner being online, a failure loses the event for good, and the partner has no way to verify the sender or detect a repeat.',
  q: ['What delivery promise can you realistically make?', ['Exactly once, in order', 'At least once, with an event id so receivers can drop repeats', 'At most once, never retried', 'No promise at all'], 1, 'Retries are needed so nothing is lost, and retries mean a receiver may see the same event twice. The event id lets them deduplicate.'],
  h: ['The event must be saved together with the booking change, or one can exist without the other.', 'If you retry, duplicates are unavoidable. What do you give the partner so duplicates are harmless?', 'For "did this really come from you", think of a secret both sides know and a value computed from the message body.'],
  a: `<p><b>Strong answer:</b> "I promise at-least-once delivery with signed, identifiable events, and I make that promise explicit in the docs."</p><ol><li><b>Never lose an event:</b> write the event to an <b>outbox table</b> in the same database transaction as the booking change. A background sender reads the outbox and puts each delivery on a queue.</li><li><b>Deliver with retries:</b> a worker POSTs with a short timeout. On a failure or a non-2xx answer it retries with exponential backoff for up to 24 or 48 hours, then moves the event to a dead-letter store.</li><li><b>Make repeats harmless:</b> each event carries a unique <code>id</code>, a type and a timestamp. Partners store ids they have processed and ignore repeats.</li><li><b>Ordering:</b> I do not promise order. Each event carries a version or sequence number per booking, so the partner can ignore older ones, or fetch the current state from the REST API.</li><li><b>Prove the sender:</b> sign the raw body and timestamp with a per-partner secret using HMAC-SHA256 and send it in a header. Partners verify it and reject old timestamps to block replays. Secrets can be rotated.</li><li><b>Operate it:</b> a delivery log per partner, a manual "resend" action, automatic pausing of an endpoint that keeps failing, and an alert to the partner.</li></ol><p>"I also protect ourselves: partner URLs must be HTTPS and must not point at internal addresses, to avoid server-side request forgery."</p>`,
  cx: 'the outbox for no loss, backoff and dead-letter, event ids for duplicates, sequence numbers for order, HMAC signatures, and operational tooling.',
  f: ['Why not just use a message queue the partner reads from?', 'How do you rotate a signing secret without downtime?']
}));

practice.push(P({
  t: '900 End-to-End Tests and Bugs Still Reach Production', l: 'Hard', tags: ['test strategy', 'leadership'],
  s: 'You join a team as tech lead. The API has 900 UI-driven end-to-end tests that take 3 hours and fail randomly about 1 run in 4. There are few unit or integration tests. Developers re-run the pipeline until it goes green, and bugs still reach production, most often permission bugs and broken responses after backend changes. What is your plan for the next 3 months?',
  ex: '<p>They want a phased plan with a first step this week, the target shape of the test suite, and how you measure progress.</p>',
  weak: 'Rewrite the whole test suite properly with unit tests, and stop releases until it is done.',
  why: 'A big-bang rewrite stops delivery, has no priorities, and ignores the two bug types that actually reach production.',
  q: ['Broken responses after backend changes keep reaching production. Which test level targets that most directly?', ['More end-to-end tests', 'Contract tests, such as an OpenAPI diff or consumer-driven contracts', 'Load tests', 'Manual testing before each release'], 1, 'Contract tests check that the shape of the API still matches what clients expect, in seconds, on every pull request.'],
  h: ['Start from the bugs that escaped. Which test level would have caught each kind most cheaply?', 'A test that fails at random is worse than no test, because it teaches people to ignore red.', 'Plan in phases, keep shipping, and choose 2 or 3 numbers to track.'],
  a: `<p><b>Strong answer:</b> "The pyramid is upside down, and the suite has lost the team's trust. I fix trust first, then shape, guided by the bugs that escaped."</p><ul><li><b>Week 1, stop the re-run habit:</b> find the tests that fail without code changes, move them to a quarantine run that does not block merges, and give each an owner and a deadline. Red must mean a real problem again.</li><li><b>Month 1, aim at the escaped bugs:</b> add integration tests with <code>WebApplicationFactory</code> and a test sign-in handler: for every endpoint, check no token gives 401, wrong role gives 403, and user A cannot reach user B's data. Add an OpenAPI diff step that fails a pull request on a breaking change.</li><li><b>Month 2, move weight down:</b> for each area, replace groups of end-to-end tests with unit and integration tests that cover the same rules, and delete the slow ones. New code needs tests at the lowest level that can catch the bug.</li><li><b>Month 3, keep a thin top:</b> keep 20 to 30 end-to-end tests for the journeys that earn money, running on a stable test dataset. Add a smoke test after each deployment.</li><li><b>Measure:</b> pipeline time (target under 15 minutes for a pull request), share of runs that fail without a code cause, and bugs found in production per month by type.</li></ul><p>"I do this alongside feature work, about 20% of capacity, and I report the 3 numbers every 2 weeks so the business sees why it is worth it."</p>`,
  cx: 'you restore trust in red builds first, target the real escaped bugs, reshape the pyramid in phases without stopping delivery, and track a few numbers.',
  f: ['How do you convince a product manager to give you that 20%?', 'Which tests would you never delete?']
}));

// ---------- QUIZ ----------
quiz.push(
  { q: 'Which set of HTTP methods is idempotent?', options: ['GET, POST, PATCH', 'GET, PUT, DELETE', 'POST, PUT, PATCH', 'POST only'], answer: 1, explain: 'Repeating GET, PUT or DELETE leaves the server in the same state as doing it once. POST is not idempotent, and PATCH is not guaranteed to be.' },
  { q: 'A signed-in user with a valid token calls an endpoint that only admins may use. Which status code is correct?', options: ['400 Bad Request', '401 Unauthorized', '403 Forbidden', '409 Conflict'], answer: 2, explain: '401 means the caller is not identified. Here the caller is known and simply lacks permission, which is 403.' },
  { q: 'What should a successful <code>POST /orders</code> that creates an order return?', options: ['200 with an empty body', '201 with a Location header for the new order', '204 with no body', '302 redirect to the list'], answer: 1, explain: '201 Created says a new resource exists, and the Location header tells the client its URL.' },
  { q: 'Why is keyset (cursor) pagination faster than offset pagination on deep pages?', options: ['It compresses the response', 'It seeks straight to the last seen key through an index instead of reading and discarding earlier rows', 'It caches every page in memory', 'It skips the ORDER BY'], answer: 1, explain: 'OFFSET 199950 makes the database walk past 199,950 rows. A WHERE on the last key lets it jump to the right place.' },
  { q: 'A client sends <code>If-Match: "v7"</code> on a PUT, but the resource is now at version 8. What does the server return?', options: ['200 OK', '304 Not Modified', '412 Precondition Failed', '500 Internal Server Error'], answer: 2, explain: 'The condition in If-Match is not true any more, so the write is refused with 412 and no data is overwritten.' },
  { q: 'What is the purpose of an idempotency key on a POST?', options: ['To encrypt the request body', 'To let the server recognise a retry and return the first result instead of doing the work again', 'To cache the response in the browser', 'To sign the user in'], answer: 1, explain: 'The client sends the same unique key on every retry of one operation. The server stores the key with the response and replays it.' },
  { q: 'Which statement about CORS is true?', options: ['It protects the API from every unauthorised caller', 'It is enforced by browsers and does not stop tools such as curl', 'It encrypts traffic between origins', 'It replaces authentication'], answer: 1, explain: 'CORS tells a browser which web origins may read a response. Non-browser clients ignore it, so it is not a security boundary for the API.' },
  { q: 'Which is a main reason to pick gRPC for calls between internal services?', options: ['It is readable in a browser address bar', 'Compact binary messages over HTTP/2 with a strict contract and generated clients', 'It needs no contract file', 'It uses XML envelopes'], answer: 1, explain: 'gRPC uses Protocol Buffers over HTTP/2. Both ends are generated from one .proto file, and messages are small and fast to parse.' },
  { q: 'In GraphQL, what is the N+1 problem?', options: ['One request needs N+1 HTTP headers', 'One query for a list, then one more query for each item in the list', 'The schema has N+1 types', 'The client sends N+1 mutations'], answer: 1, explain: 'A child field resolver runs once per parent row. Without batching (a DataLoader), 1 list query is followed by N single lookups.' },
  { q: 'A page shows a progress bar that only receives updates from the server. Which is the simplest fit?', options: ['Server-sent events', 'A SOAP service', 'A webhook to the browser', 'gRPC bidirectional streaming from the browser'], answer: 0, explain: 'Data flows one way, server to browser. SSE is plain HTTP, reconnects by itself and needs no two-way channel.' },
  { q: 'Why is the EF Core in-memory provider a poor choice for integration tests that check database behaviour?', options: ['It is too slow', 'It does not enforce constraints, real transactions or SQL translation', 'It cannot store more than 100 rows', 'It needs a licence'], answer: 1, explain: 'It is not a relational database. A query or constraint that fails on SQL Server can pass in memory, so use a real engine in a container.' },
  { q: 'Which pair of results says the most about a load test?', options: ['Average response time and number of tests', 'p95 or p99 latency together with the error rate', 'Lines of code covered', 'The size of the response body'], answer: 1, explain: 'Averages hide the slow requests that users feel. High percentiles plus the error rate show how the system behaves under pressure.' }
);

// ---------- INTERVIEW: 1. REST fundamentals ----------
interview.push({ q: 'What is an API, and what is inside an HTTP request and response?', level: 'B',
  a: `<p>An API is an agreed way for one program to ask another program for data or work, and on the web that conversation is made of HTTP requests and responses.</p>
<p>A <b>request</b> has 4 parts, and a <b>response</b> has 3:</p>
<table><tr><th>Request</th><th>Example</th></tr>
<tr><td>Method</td><td>GET, POST, PUT, PATCH, DELETE</td></tr>
<tr><td>URL</td><td>/api/v1/orders/501?expand=items</td></tr>
<tr><td>Headers</td><td>Authorization, Content-Type, Accept</td></tr>
<tr><td>Body (optional)</td><td>JSON for POST, PUT and PATCH</td></tr></table>
<table><tr><th>Response</th><th>Example</th></tr>
<tr><td>Status code</td><td>200, 201, 404, 500</td></tr>
<tr><td>Headers</td><td>Content-Type, Location, ETag, Cache-Control</td></tr>
<tr><td>Body (optional)</td><td>the JSON result or an error description</td></tr></table>
<p>The URL says <i>which thing</i>, the method says <i>what to do</i>, headers carry extra facts such as who is calling and what format is wanted, and the status code says how it went.</p>
<blockquote><b>Say it in the interview:</b> An API is a contract between programs. Over HTTP every call is a method, a URL, headers and maybe a body, and every answer is a status code, headers and maybe a body.</blockquote>`,
  followUps: ['What is the difference between a path parameter and a query parameter?', 'Which headers do you see on almost every API call?', 'Why should a GET not carry a body?'] });

interview.push({ q: 'What is REST and what are its constraints?', level: 'B',
  a: `<p>REST (Representational State Transfer) is a style for building APIs where every piece of data is a resource with its own URL, and you read or change it with standard HTTP methods.</p>
<p>The style is defined by 6 constraints:</p>
<ol><li><b>Client-server:</b> the screen and the data are separate programs.</li>
<li><b>Stateless:</b> each request carries everything needed. The server keeps no session between calls.</li>
<li><b>Cacheable:</b> a response says whether it may be stored and reused.</li>
<li><b>Uniform interface:</b> resources have URLs, you work with representations of them (usually JSON), messages describe themselves, and responses can link to next actions.</li>
<li><b>Layered system:</b> gateways, proxies and load balancers can sit in between without the client knowing.</li>
<li><b>Code on demand:</b> optional. The server may send code, such as JavaScript.</li></ol>
<p>REST is not a standard and is not tied to JSON. In practice most "REST APIs" are JSON over HTTP with correct methods and status codes, without the hypermedia links.</p>
<blockquote><b>Say it in the interview:</b> REST means resources with URLs, standard HTTP methods and stateless calls. Most real APIs are HTTP JSON APIs at level 2 of the Richardson model; few add hypermedia links.</blockquote>`,
  followUps: ['Why does statelessness help you scale?', 'Where does the user identity live if the server has no session?', 'What is HATEOAS, and have you used it?'] });

interview.push({ q: 'Which HTTP methods are safe, which are idempotent, and why does it matter?', level: 'B',
  a: `<p>A safe method only reads, and an idempotent method can be repeated without changing the result on the server, which tells you which calls are safe to retry.</p>
<table><tr><th>Method</th><th>Use</th><th>Safe</th><th>Idempotent</th></tr>
<tr><td>GET</td><td>read</td><td>yes</td><td>yes</td></tr>
<tr><td>HEAD</td><td>headers only</td><td>yes</td><td>yes</td></tr>
<tr><td>OPTIONS</td><td>what is allowed, CORS preflight</td><td>yes</td><td>yes</td></tr>
<tr><td>POST</td><td>create, or run an action</td><td>no</td><td>no</td></tr>
<tr><td>PUT</td><td>replace the whole resource</td><td>no</td><td>yes</td></tr>
<tr><td>PATCH</td><td>change part of it</td><td>no</td><td>not guaranteed</td></tr>
<tr><td>DELETE</td><td>remove</td><td>no</td><td>yes</td></tr></table>
<p>Idempotent is about the <b>state</b>, not the response. A second DELETE may return 404, yet the resource is gone either way. PATCH is not guaranteed because "add 1 to stock" differs from "set stock to 5".</p>
<p>Why it matters: after a timeout, a client, a proxy or a retry library can repeat an idempotent call without risk. A repeated POST can create a second order, so it needs extra protection such as an idempotency key.</p>
<blockquote><b>Say it in the interview:</b> Safe means read-only; idempotent means repeating it leaves the same state. GET, PUT and DELETE are idempotent, POST is not, and that is what decides which calls I can retry blindly.</blockquote>`,
  followUps: ['Can you make a POST idempotent?', 'Give an example of a PATCH that is not idempotent.', 'What goes wrong if a GET changes data?'] });

interview.push({ q: 'Which HTTP status codes must you know, and what is the difference between 401 and 403?', level: 'B',
  a: `<p>Status codes tell the caller how the request went: 2xx worked, 3xx go elsewhere or use your cache, 4xx the caller made a mistake, 5xx the server failed.</p>
<table><tr><th>Code</th><th>Meaning</th><th>Typical use</th></tr>
<tr><td>200</td><td>OK with a body</td><td>GET, or PUT that returns the resource</td></tr>
<tr><td>201</td><td>Created</td><td>POST, with a Location header</td></tr>
<tr><td>202</td><td>Accepted</td><td>work continues in the background</td></tr>
<tr><td>204</td><td>No Content</td><td>DELETE, PUT with nothing to return</td></tr>
<tr><td>304</td><td>Not Modified</td><td>cached copy is still valid</td></tr>
<tr><td>400</td><td>Bad Request</td><td>broken or invalid input</td></tr>
<tr><td>401</td><td>Unauthorized</td><td>no token, or a bad or expired one</td></tr>
<tr><td>403</td><td>Forbidden</td><td>known caller, not allowed</td></tr>
<tr><td>404</td><td>Not Found</td><td>no such resource</td></tr>
<tr><td>409</td><td>Conflict</td><td>duplicate, or clash with current state</td></tr>
<tr><td>412</td><td>Precondition Failed</td><td>If-Match version is out of date</td></tr>
<tr><td>422</td><td>Unprocessable Content</td><td>valid JSON, invalid meaning</td></tr>
<tr><td>429</td><td>Too Many Requests</td><td>rate limited, send Retry-After</td></tr>
<tr><td>500</td><td>Server error</td><td>a bug on our side</td></tr>
<tr><td>502, 503, 504</td><td>bad gateway, unavailable, gateway timeout</td><td>something behind the gateway failed</td></tr></table>
<p><b>401 versus 403:</b> 401 means "I do not know who you are", so sign in or refresh the token. 403 means "I know who you are and you may not do this", so retrying with the same token will not help.</p>
<blockquote><b>Say it in the interview:</b> 401 is about identity, 403 is about permission. I return the most specific code because clients, gateways and dashboards all act on it.</blockquote>`,
  followUps: ['When do you return 404 instead of 403 on purpose?', 'What is the difference between 502, 503 and 504?', 'Which redirects keep the HTTP method?'] });

interview.push({ q: 'Design the URLs for an order-management API.', level: 'B',
  a: `<p>Good REST URLs name things with plural nouns, and leave the action to the HTTP method.</p>
<pre><code>GET    /api/v1/orders?status=shipped&amp;page=2&amp;pageSize=50&amp;sort=-createdAt
GET    /api/v1/orders/{id}
POST   /api/v1/orders
PUT    /api/v1/orders/{id}
PATCH  /api/v1/orders/{id}
DELETE /api/v1/orders/{id}
GET    /api/v1/orders/{id}/items        (sub-resource)
POST   /api/v1/orders/{id}/cancel       (an action that is not plain CRUD)</code></pre>
<p>The rules I follow:</p>
<ul><li>Nouns, not verbs: <code>/orders</code>, never <code>/getOrders</code>.</li>
<li>Plural collection names, lowercase, hyphens between words.</li>
<li>Filters, sorting and paging go in the query string.</li>
<li>Nest at most 1 or 2 levels. Deeper than that, link by id instead.</li>
<li>When something is truly an action, such as cancel or approve, a POST to a small sub-resource is an accepted compromise.</li>
<li>Ids in the path, never secrets or tokens.</li></ul>
<blockquote><b>Say it in the interview:</b> I use plural nouns for resources, the HTTP method as the verb, the query string for filtering and paging, and shallow nesting. For real actions like cancel I use a POST on a sub-resource.</blockquote>`,
  followUps: ['How would you model "search" with a very large filter?', 'Would you use /customers/{id}/orders or /orders?customerId=? Why?', 'What do you return from the cancel action?'] });

interview.push({ q: 'PUT versus PATCH versus POST: when do you use each?', level: 'B',
  a: `<p>POST creates something new, PUT replaces a whole resource at a known URL, and PATCH changes only some fields.</p>
<table><tr><th></th><th>POST</th><th>PUT</th><th>PATCH</th></tr>
<tr><td>Target</td><td>the collection: /orders</td><td>one item: /orders/5</td><td>one item: /orders/5</td></tr>
<tr><td>Body</td><td>the new item</td><td>the complete item</td><td>only the changes</td></tr>
<tr><td>Who picks the id</td><td>the server</td><td>the client already knows the URL</td><td>not applicable</td></tr>
<tr><td>Idempotent</td><td>no</td><td>yes</td><td>not guaranteed</td></tr></table>
<p>PATCH has two standard body formats. <b>JSON Merge Patch</b> sends just the fields that change. <b>JSON Patch</b> sends a list of operations such as "replace /price".</p>
<pre><code>PATCH /api/v1/products/5
Content-Type: application/merge-patch+json

{ "price": 55.00 }</code></pre>
<p>A common mistake is a PUT that silently keeps fields the client left out. With PUT, a missing field means "clear it". If you want partial updates, call it PATCH.</p>
<blockquote><b>Say it in the interview:</b> POST to a collection creates and is not idempotent. PUT replaces the full resource and is idempotent. PATCH sends only the changes, using merge patch or JSON Patch.</blockquote>`,
  followUps: ['Can PUT create a resource?', 'How do you set a field to null with JSON Merge Patch?', 'How do you validate a PATCH body in ASP.NET Core?'] });

interview.push({ q: 'What is the Richardson Maturity Model?', level: 'I',
  a: `<p>It is a 4-step ladder that describes how fully an API uses HTTP and the ideas of REST.</p>
<table><tr><th>Level</th><th>What it adds</th><th>Example</th></tr>
<tr><td>0</td><td>One endpoint, everything is a remote call</td><td>POST /api with the action name in the body</td></tr>
<tr><td>1</td><td>Resources with their own URLs</td><td>/orders/5</td></tr>
<tr><td>2</td><td>HTTP methods and status codes used correctly</td><td>DELETE /orders/5 returns 204</td></tr>
<tr><td>3</td><td>Hypermedia: responses include links to the next possible actions</td><td>an order response links to "cancel" and "invoice"</td></tr></table>
<p>Level 2 is where most production APIs sit, and it is a sensible target: you get caching, clear errors and tooling support. Level 3 (HATEOAS, "hypermedia as the engine of application state") lets a client discover actions from the response instead of hard-coding URLs. It is rare because front ends are usually built against a known OpenAPI contract, so the links add work with little gain.</p>
<p>The model is a way to describe an API, not a score to maximise.</p>
<blockquote><b>Say it in the interview:</b> Level 0 is one RPC endpoint, level 1 adds resources, level 2 adds proper verbs and status codes, level 3 adds hypermedia links. I aim for a clean level 2 and add links only where clients benefit, such as paging.</blockquote>`,
  followUps: ['Where have you seen level 3 pay off?', 'Is an API at level 0 always bad?', 'How do paging links relate to level 3?'] });

interview.push({ q: 'How do you implement pagination, filtering and sorting?', level: 'I',
  a: `<p>Pagination means returning a large list in small pieces, and the two main ways are by position (offset) or by "everything after this row" (keyset, also called cursor).</p>
<table><tr><th>Strategy</th><th>Request</th><th>Good</th><th>Bad</th></tr>
<tr><td>Offset</td><td>?page=3&amp;pageSize=50</td><td>simple, can jump to any page</td><td>slow on deep pages, items shift when data changes</td></tr>
<tr><td>Keyset (cursor)</td><td>?after=abc&amp;limit=50</td><td>fast at any depth, stable</td><td>no jumping, needs a unique sort key</td></tr>
<tr><td>Time-based</td><td>?since=2026-01-01T00:00Z</td><td>good for sync and feeds</td><td>ties on the timestamp need care</td></tr></table>
<pre><code>var rows = await db.Orders.AsNoTracking()
    .Where(o =&gt; o.Id &gt; afterId)
    .OrderBy(o =&gt; o.Id)
    .Take(limit + 1)          // one extra row tells us if a next page exists
    .ToListAsync(ct);</code></pre>
<p>Rules that apply to every list endpoint:</p>
<ul><li>Cap the page size on the server, whatever the client asks for.</li>
<li>Check sort and filter fields against a fixed list of allowed names. Never paste them into SQL.</li>
<li>Return a total count only when the screen needs it, because counting a big table is costly.</li></ul>
<blockquote><b>Say it in the interview:</b> Offset paging is fine for small tables. For big or fast-changing data I use keyset paging on a unique key, cap the page size, and allow-list the sort fields.</blockquote>`,
  followUps: ['How do you do keyset paging when sorting by a non-unique column?', 'What do you put in the response to describe the next page?', 'Why is OFFSET slow on deep pages?'] });

interview.push({ q: 'What API versioning strategies do you know, and which do you prefer?', level: 'I',
  a: `<p>Versioning lets you make a breaking change without breaking existing clients, and the version can travel in the URL, the query string, a header or the media type.</p>
<table><tr><th>Where</th><th>Example</th><th>Notes</th></tr>
<tr><td>URL path</td><td>/api/v1/orders</td><td>most common, easy to see, route and cache</td></tr>
<tr><td>Query string</td><td>/api/orders?api-version=1.0</td><td>the style Azure APIs use</td></tr>
<tr><td>Header</td><td>Api-Version: 1</td><td>clean URLs, harder to try in a browser</td></tr>
<tr><td>Media type</td><td>Accept: application/vnd.shop.v1+json</td><td>purist, least convenient</td></tr></table>
<p>The more important rule is to need new versions rarely. Additive changes, such as a new optional field or endpoint, do not need one. Version only for breaking changes: removing or renaming a field, changing a type, or making an input required.</p>
<pre><code>// Asp.Versioning.Mvc package
builder.Services.AddApiVersioning(o =&gt;
{
    o.DefaultApiVersion = new ApiVersion(1, 0);
    o.AssumeDefaultVersionWhenUnspecified = true;
    o.ReportApiVersions = true;     // adds api-supported-versions headers
}).AddMvc();</code></pre>
<p>Pair it with a published deprecation policy: Deprecation and Sunset headers, a migration guide, and usage numbers before anything is removed.</p>
<blockquote><b>Say it in the interview:</b> I prefer the version in the URL path because it is visible and simple. I keep changes additive, version only for breaking changes, and retire old versions with a published date and usage data.</blockquote>`,
  followUps: ['What counts as a breaking change?', 'How many versions would you support at once?', 'How do you version a single endpoint without copying the whole controller?'] });

interview.push({ q: 'What should an error response look like? Explain Problem Details (RFC 9457).', level: 'I',
  a: `<p>Every error from an API should have the same JSON shape, and Problem Details is the standard shape for that.</p>
<pre><code>HTTP/1.1 400 Bad Request
Content-Type: application/problem+json

{
  "type": "https://example.com/problems/validation",
  "title": "One or more validation errors occurred.",
  "status": 400,
  "detail": "See the errors field.",
  "instance": "/api/v1/orders",
  "traceId": "00-9f2a41c7-01",
  "errors": { "quantity": ["Quantity must be at least 1."] }
}</code></pre>
<ul><li><b>type</b>: a stable identifier for the kind of problem. <b>title</b>: short text for people. <b>status</b>: the HTTP code. <b>detail</b> and <b>instance</b>: this occurrence.</li>
<li>You may add your own fields, such as <code>traceId</code> and <code>errors</code>.</li>
<li>RFC 9457 replaced the older RFC 7807 with the same core fields.</li></ul>
<p>In ASP.NET Core, <code>AddProblemDetails()</code> plus an exception handler gives this shape for unhandled errors, and <code>[ApiController]</code> produces it for validation failures. Never put stack traces, SQL or internal host names in the body. The trace id is what links the client's error to your logs.</p>
<blockquote><b>Say it in the interview:</b> I return Problem Details for every error: one shape, the right status code, and a trace id support can search for, with no internal details leaked.</blockquote>`,
  followUps: ['How do you map a domain exception to a 409 in ASP.NET Core?', 'Where does the trace id come from?', 'Should error messages be translated on the server?'] });

interview.push({ q: 'How does HTTP caching work, and what are conditional requests?', level: 'I',
  a: `<p>HTTP caching lets a browser, CDN or gateway reuse an earlier response, and a conditional request asks the server "has this changed?" instead of downloading it again.</p>
<table><tr><th>Header</th><th>What it does</th></tr>
<tr><td>Cache-Control: public, max-age=60</td><td>any cache may reuse it for 60 seconds</td></tr>
<tr><td>Cache-Control: private</td><td>only the user's own browser may store it</td></tr>
<tr><td>Cache-Control: no-store</td><td>nobody may store it</td></tr>
<tr><td>ETag: "v7"</td><td>a version stamp for this response</td></tr>
<tr><td>If-None-Match: "v7"</td><td>sent by the client; the server answers 304 if unchanged</td></tr>
<tr><td>Last-Modified / If-Modified-Since</td><td>the same idea using a date</td></tr>
<tr><td>Vary: Accept-Language</td><td>keep separate cached copies per value of this request header</td></tr></table>
<p>The flow: first GET returns 200 with an ETag. Later the client sends <code>If-None-Match</code>. If nothing changed, the server sends <b>304 Not Modified</b> with no body, which saves bandwidth and time.</p>
<p>The safety rule: public GETs such as a product catalogue can be cached at a CDN or gateway. Per-user data must be <code>private</code> or <code>no-store</code>, or a shared cache could hand one user's data to another.</p>
<blockquote><b>Say it in the interview:</b> Cache-Control decides who may store a response and for how long; ETag with If-None-Match gives cheap 304 revalidation. Public data goes to the CDN, user-specific data is marked private or no-store.</blockquote>`,
  followUps: ['What is the difference between no-cache and no-store?', 'How do you invalidate a CDN entry when data changes?', 'How is server-side output caching different from HTTP caching?'] });

interview.push({ q: 'Explain CORS.', level: 'I',
  a: `<p>CORS (cross-origin resource sharing) is the way a server tells a browser which other websites are allowed to call it from JavaScript.</p>
<p>Browsers apply the <b>same-origin policy</b>: a page from one origin (scheme, host and port) may not read responses from a different origin. CORS relaxes that with response headers.</p>
<ul><li><code>Access-Control-Allow-Origin</code>: which origin may read the response.</li>
<li><code>Access-Control-Allow-Methods</code> and <code>-Headers</code>: what the real call may use.</li>
<li><code>Access-Control-Allow-Credentials</code>: whether cookies may be sent.</li></ul>
<p>For anything beyond a simple GET or form-style POST, for example JSON bodies, an Authorization header, PUT or DELETE, the browser first sends a <b>preflight</b>: an OPTIONS request asking for permission.</p>
<pre><code>builder.Services.AddCors(o =&gt; o.AddPolicy("web", p =&gt; p
    .WithOrigins("https://app.example.com")
    .WithMethods("GET", "POST", "PUT", "DELETE")
    .WithHeaders("Authorization", "Content-Type")));

app.UseCors("web");   // after UseRouting, before UseAuthentication</code></pre>
<p>Two points interviewers listen for: CORS is enforced by the browser only, so it is not authentication and does not stop curl or another server. And a wildcard origin cannot be combined with credentials, so list exact origins.</p>
<blockquote><b>Say it in the interview:</b> CORS is a browser rule, not API security. The server lists exact allowed origins, complex calls trigger an OPTIONS preflight, and I never combine any-origin with credentials.</blockquote>`,
  followUps: ['Which requests skip the preflight?', 'How can you cut down the number of preflight requests?', 'A call works in Postman but fails in the browser. Why?'] });

interview.push({ q: 'How do you add rate limiting and throttling to an API?', level: 'I',
  a: `<p>Rate limiting caps how many requests a caller may make in a period, so one client cannot overload the API for everyone else.</p>
<pre><code>builder.Services.AddRateLimiter(o =&gt;
{
    o.RejectionStatusCode = StatusCodes.Status429TooManyRequests;   // the default is 503
    o.AddFixedWindowLimiter("api", w =&gt;
    {
        w.PermitLimit = 100;
        w.Window = TimeSpan.FromMinutes(1);
    });
});
app.UseRateLimiter();
app.MapGet("/api/v1/orders", GetOrders).RequireRateLimiting("api");</code></pre>
<table><tr><th>Algorithm</th><th>Idea</th></tr>
<tr><td>Fixed window</td><td>100 per minute; simple, but allows a burst at the edge of two windows</td></tr>
<tr><td>Sliding window</td><td>smooths the edges by counting in smaller segments</td></tr>
<tr><td>Token bucket</td><td>tokens refill at a steady rate; short bursts are allowed</td></tr>
<tr><td>Concurrency</td><td>caps how many requests run at the same time</td></tr></table>
<p>ASP.NET Core has had this middleware built in since .NET 7. Limit per caller (user id, API key or IP) by using a partitioned limiter, and return 429 with a <code>Retry-After</code> header. With several servers, each one counts on its own, so enforce the shared limit at the gateway, for example Azure API Management policies by subscription key, or keep counters in Redis.</p>
<blockquote><b>Say it in the interview:</b> I limit per client, return 429 with Retry-After, and choose token bucket when short bursts are fine. In a scaled-out system the limit lives at the gateway or in a shared store, not in each instance.</blockquote>`,
  followUps: ['What is the difference between rate limiting and throttling?', 'How should a client react to a 429?', 'How do you rate limit an endpoint whose calls differ a lot in cost?'] });

interview.push({ q: 'Write a complete CRUD controller in ASP.NET Core.', level: 'I',
  a: `<p>A CRUD controller maps each HTTP method to one service call and returns the matching status code.</p>
<pre><code>[ApiController]
[Route("api/v1/orders")]
[Authorize]
public class OrdersController(IOrderService orders) : ControllerBase
{
    [HttpGet]
    public async Task&lt;ActionResult&lt;Page&lt;OrderDto&gt;&gt;&gt; List([FromQuery] OrderQuery q, CancellationToken ct)
        =&gt; Ok(await orders.ListAsync(q with { PageSize = Math.Min(q.PageSize, 100) }, ct));

    [HttpGet("{id:int}", Name = nameof(Get))]
    public async Task&lt;ActionResult&lt;OrderDto&gt;&gt; Get(int id, CancellationToken ct)
        =&gt; await orders.GetAsync(id, ct) is { } dto ? Ok(dto) : NotFound();

    [HttpPost]
    public async Task&lt;ActionResult&lt;OrderDto&gt;&gt; Create(CreateOrder body, CancellationToken ct)
    {
        var created = await orders.CreateAsync(body, ct);
        return CreatedAtRoute(nameof(Get), new { id = created.Id }, created);   // 201 + Location
    }

    [HttpDelete("{id:int}")]
    [Authorize(Policy = "Orders.Delete")]
    public async Task&lt;IActionResult&gt; Delete(int id, CancellationToken ct)
        =&gt; await orders.DeleteAsync(id, ct) ? NoContent() : NotFound();
}</code></pre>
<p>PUT follows the DELETE pattern: 204 or 404. Points to mention: <code>[ApiController]</code> returns 400 for invalid models; DTOs, never entities; a capped page size; a <code>CancellationToken</code> everywhere.</p>
<blockquote><b>Say it in the interview:</b> My controllers are thin: bind, authorize, call a service, map the result to a status code. DTOs at the edge, cancellation tokens everywhere, 201 with Location on create, 204 on delete.</blockquote>`,
  followUps: ['Why not return the EF Core entity directly?', 'Where does validation happen?', 'Where do you check that the order belongs to the caller?'] });

interview.push({ q: 'Show the same API as a minimal API with a route group, validation and OpenAPI.', level: 'I',
  a: `<p>A minimal API declares each endpoint as a small function on the app, with no controller class, and a route group lets you apply shared settings once.</p>
<pre><code>builder.Services.AddOpenApi();
builder.Services.AddValidation();          // .NET 10: validates data annotations on parameters
builder.Services.AddProblemDetails();

var api = app.MapGroup("/api/v1/orders")
             .RequireAuthorization()
             .WithTags("Orders");

api.MapGet("/{id:int}", async Task&lt;Results&lt;Ok&lt;OrderDto&gt;, NotFound&gt;&gt; (int id, IOrderService s, CancellationToken ct) =&gt;
        await s.GetAsync(id, ct) is { } o ? TypedResults.Ok(o) : TypedResults.NotFound())
   .WithName("GetOrder");

api.MapPost("/", async (CreateOrder body, IOrderService s, CancellationToken ct) =&gt;
{
    var o = await s.CreateAsync(body, ct);
    return TypedResults.CreatedAtRoute(o, "GetOrder", new { id = o.Id });
});

app.MapOpenApi();                          // serves /openapi/v1.json</code></pre>
<ul><li><code>TypedResults</code> with <code>Results&lt;...&gt;</code> lets the OpenAPI document list each possible response without extra attributes.</li>
<li>Before .NET 10, validation was done with an <b>endpoint filter</b> (<code>AddEndpointFilter</code>) or a library; filters are still the tool for cross-cutting steps such as logging or idempotency.</li>
<li>The older <code>WithOpenApi()</code> call is deprecated in .NET 10; use <code>AddOpenApi</code> and <code>MapOpenApi</code>.</li></ul>
<blockquote><b>Say it in the interview:</b> Minimal APIs give the same pipeline with less ceremony: a route group for shared rules, typed results for accurate OpenAPI, built-in validation in .NET 10, and endpoint filters for cross-cutting steps.</blockquote>`,
  followUps: ['When would you still choose controllers?', 'What is an endpoint filter and how does it differ from middleware?', 'How do you keep Program.cs small with 80 endpoints?'] });

interview.push({ q: 'What is OpenAPI (Swagger) and why does it matter?', level: 'I',
  a: `<p>OpenAPI is a machine-readable description of an HTTP API: its paths, inputs, outputs, errors and security, written as JSON or YAML.</p>
<p>"Swagger" was the old name of the specification and is still the name of popular tools such as Swagger UI.</p>
<p>What the document gives you:</p>
<ul><li>Browsable documentation that cannot drift far from the code.</li>
<li>Generated client code, for example a typed C# client with NSwag or Kiota, or TypeScript types with openapi-typescript.</li>
<li>Contract checks in CI: compare the new document with the released one and fail on a breaking change.</li>
<li>Mock servers, so front end work can start before the back end is finished.</li>
<li>A contract that API gateways and AI tools can import.</li></ul>
<pre><code>// Front end: types generated from the contract
// npx openapi-typescript https://api.example.com/openapi/v1.json -o src/api/schema.d.ts
import type { paths } from "./schema";
type OrderList = paths["/api/v1/orders"]["get"]["responses"]["200"]["content"]["application/json"];</code></pre>
<p>In .NET: since .NET 9 the framework generates the document itself through <code>Microsoft.AspNetCore.OpenApi</code>, and Swashbuckle is no longer in the project templates. .NET 10 produces OpenAPI 3.1. Older projects use Swashbuckle or NSwag. Azure Functions on the isolated worker use an OpenAPI extension with attributes on each function.</p>
<blockquote><b>Say it in the interview:</b> OpenAPI is the contract for the API. I generate it from code, generate typed clients from it, and diff it in CI so a breaking change fails the build instead of the front end.</blockquote>`,
  followUps: ['Code-first or contract-first: which do you prefer and why?', 'How do you show the document in a UI now that Swashbuckle is not in the template?', 'How do you document authentication in OpenAPI?'] });

interview.push({ q: 'What is content negotiation?', level: 'I',
  a: `<p>Content negotiation is how the client and the server agree on the format of the data, using headers instead of different URLs.</p>
<table><tr><th>Header</th><th>Sent by</th><th>Meaning</th></tr>
<tr><td>Accept: application/json</td><td>client</td><td>the format I want back</td></tr>
<tr><td>Content-Type: application/json</td><td>whoever sends a body</td><td>the format of this body</td></tr>
<tr><td>Accept-Language: de</td><td>client</td><td>the language I prefer</td></tr>
<tr><td>Accept-Encoding: br, gzip</td><td>client</td><td>the compression I can read</td></tr></table>
<p>Two status codes belong to this topic. <b>415 Unsupported Media Type</b>: the server cannot read the body format the client sent. <b>406 Not Acceptable</b>: the server cannot produce any format the client asked for.</p>
<p>In ASP.NET Core, controllers pick an output formatter from the Accept header. JSON is the default. You can add XML with <code>AddXmlSerializerFormatters()</code>, and setting <code>ReturnHttpNotAcceptable = true</code> makes the API answer 406 instead of quietly falling back to JSON. Minimal APIs do not negotiate; they return JSON unless you write a different result.</p>
<p>If the response changes with a request header, add a <code>Vary</code> header so caches keep separate copies.</p>
<blockquote><b>Say it in the interview:</b> The client states what it wants with Accept and what it sends with Content-Type. The server answers in a matching format, or with 406 or 415, and adds Vary so caches do not mix formats.</blockquote>`,
  followUps: ['What is the difference between Accept and Content-Type?', 'How would you serve CSV and JSON from the same endpoint?', 'Why does Vary matter for a CDN?'] });

interview.push({ q: 'How do you implement optimistic concurrency with ETags?', level: 'A',
  a: `<p>Optimistic concurrency means you take no lock, but every update must prove it was based on the latest version, and an ETag is how HTTP carries that version.</p>
<ol><li>GET returns the row's version in an <code>ETag</code> header.</li>
<li>The client sends it back in <code>If-Match</code> on PUT, PATCH or DELETE.</li>
<li>If the version on the server has moved, the server answers <b>412 Precondition Failed</b> and changes nothing.</li></ol>
<pre><code>public class Product
{
    public int Id { get; set; }
    public decimal Price { get; set; }
    [Timestamp] public byte[] RowVersion { get; set; } = [];   // SQL Server rowversion
}

// GET: expose the version
Response.Headers.ETag = "\\"" + Convert.ToBase64String(product.RowVersion) + "\\"";

// PUT: use the version the client sent as the original value
db.Entry(product).Property(p =&gt; p.RowVersion).OriginalValue = versionFromIfMatch;
try { await db.SaveChangesAsync(ct); }
catch (DbUpdateConcurrencyException) { return StatusCode(StatusCodes.Status412PreconditionFailed); }</code></pre>
<p>EF Core adds <code>WHERE RowVersion = @original</code> to the UPDATE. Zero rows affected means someone else saved first. If the client sends no If-Match at all, return <b>428 Precondition Required</b> so updates cannot skip the check. The UI then reloads and lets the user redo the change.</p>
<blockquote><b>Say it in the interview:</b> I return the row version as an ETag, require If-Match on writes, and let EF Core's concurrency token turn a stale write into a 412 instead of a silent lost update.</blockquote>`,
  followUps: ['When would you use a pessimistic lock instead?', 'Strong versus weak ETags: what is the difference?', 'How do you handle this for a PATCH that touches one field?'] });

interview.push({ q: 'How do idempotency keys make POST safe to retry?', level: 'A',
  a: `<p>An idempotency key is a unique id the client attaches to one operation, so that if the request is sent again the server recognises it and returns the first result instead of doing the work twice.</p>
<pre><code>POST /api/v1/payments
Idempotency-Key: 6f1a1b9c-3d1e-4a6a-9e53-1c2a8f0d6b11</code></pre>
<p>Server steps:</p>
<ol><li>Look up the key. If found and finished, return the stored status and body.</li>
<li>If not found, insert the key (a unique index makes this safe when two copies arrive together), do the work, and store the response, ideally in the same database transaction.</li>
<li>If the key exists but the first call is still running, return 409.</li>
<li>If the key is reused with a different body, return 422. Compare a hash of the body.</li>
<li>Expire keys after a set time, commonly 24 hours.</li></ol>
<p>Why it is needed: when a call times out, the client cannot know whether the server did the work. Retrying a plain POST may charge twice; not retrying may charge zero times. The key removes the guess. It matters for payments, orders, sending messages, and any call made by automatic retry policies.</p>
<p>The header name comes from an IETF draft, not a finished standard, but payment APIs have used it for years.</p>
<blockquote><b>Say it in the interview:</b> The client sends one unique key per operation and repeats it on every retry. The server stores key and response atomically, so a retry replays the result instead of running the operation again.</blockquote>`,
  followUps: ['Where do you store the keys, and how do you handle two identical requests in the same millisecond?', 'Who should generate the key, client or server?', 'How is this different from a database unique constraint on the business data?'] });

interview.push({ q: 'How do you design a long-running operation? Explain the 202 pattern.', level: 'A',
  a: `<p>When work takes longer than a request should stay open, the API accepts the job at once, answers 202 Accepted, and gives the client a URL where it can check the status.</p>
<pre><code>POST /api/v1/imports                 -&gt; 202 Accepted
Location: /api/v1/imports/jobs/123
Retry-After: 5

GET /api/v1/imports/jobs/123         -&gt; 200 { "status": "running", "percent": 40 }
GET /api/v1/imports/jobs/123         -&gt; 200 { "status": "succeeded", "resultUrl": "/api/v1/imports/123" }</code></pre>
<p>Behind the endpoint:</p>
<ul><li>The POST validates, saves a job record, puts a message on a queue and returns in milliseconds.</li>
<li>A background worker does the work and updates the job record. A queue keeps the job alive across restarts.</li>
<li>The status resource reports queued, running, succeeded or failed, with a Problem Details body on failure.</li>
<li>Instead of polling, the client can be told through SignalR, server-sent events, or a webhook for server-to-server callers.</li></ul>
<p>Use it for report generation, file imports, video processing and long AI model calls. Holding a connection open for minutes breaks on gateway timeouts, deployments and mobile networks, and invites users to click again. Add an idempotency key so repeated clicks do not start repeated jobs, and let clients cancel with a DELETE on the job.</p>
<blockquote><b>Say it in the interview:</b> For slow work I return 202 with a status URL, run the job on a queue-backed worker, and let the client poll or get pushed updates. The fix for a timeout is changing the shape of the call, not raising the limit.</blockquote>`,
  followUps: ['How does the client know how often to poll?', 'What happens if the worker crashes halfway?', 'When is streaming the response a better fit than a job?'] });

interview.push({ q: 'How do you call another HTTP API reliably from .NET?', level: 'A',
  a: `<p>You create HttpClient through IHttpClientFactory and wrap each call in a timeout, limited retries and a circuit breaker, so a slow or failing dependency cannot take your API down with it.</p>
<pre><code>builder.Services.AddHttpClient&lt;RatesClient&gt;(c =&gt;
{
    c.BaseAddress = new Uri("https://rates.example.com");
})
.AddStandardResilienceHandler();   // Microsoft.Extensions.Http.Resilience</code></pre>
<p>The standard handler adds, in order: a total timeout, retries with exponential backoff and jitter, a circuit breaker, and a per-attempt timeout.</p>
<table><tr><th>Piece</th><th>Why</th></tr>
<tr><td>IHttpClientFactory</td><td>reuses connections; avoids socket exhaustion from <code>new HttpClient()</code> per call and stale DNS from one static client</td></tr>
<tr><td>Timeout</td><td>a hung dependency must not hold your threads and connections</td></tr>
<tr><td>Retry</td><td>only for transient failures (5xx, 408, 429, network errors) and only for idempotent calls or calls with an idempotency key</td></tr>
<tr><td>Circuit breaker</td><td>after repeated failures, stop calling for a while and fail fast</td></tr>
<tr><td>Jitter</td><td>random spread so many clients do not retry at the same instant</td></tr></table>
<p>Also pass the <code>CancellationToken</code> through, respect <code>Retry-After</code>, forward the trace context so logs join up, and decide a fallback: cached data, a default, or a clear 503.</p>
<blockquote><b>Say it in the interview:</b> Typed clients from IHttpClientFactory, with the standard resilience handler: timeouts, backoff with jitter and a circuit breaker. I only retry what is safe to repeat, and I decide the fallback before the outage, not during it.</blockquote>`,
  followUps: ['Why is retrying a POST dangerous?', 'What is a retry storm and how do you prevent it?', 'What states does a circuit breaker have?'] });

interview.push({ q: 'Walk me through your REST API security checklist (OWASP API Security Top 10).', level: 'E',
  a: `<p>Most API breaches are authorization mistakes, not broken encryption, and the OWASP API Security Top 10 (2023 edition) is the checklist I review against.</p>
<table><tr><th>Risk</th><th>What I do</th></tr>
<tr><td>1. Broken object level authorization (BOLA)</td><td>check that <i>this</i> caller may access <i>this</i> id</td></tr>
<tr><td>2. Broken authentication</td><td>validate signature, issuer, audience, expiry</td></tr>
<tr><td>3. Broken object property level authorization</td><td>DTOs in and out; never bind a body straight to an entity (mass assignment)</td></tr>
<tr><td>4. Unrestricted resource consumption</td><td>page size caps, rate limits, body size limits, timeouts</td></tr>
<tr><td>5. Broken function level authorization</td><td>a role or policy on every endpoint, deny by default</td></tr>
<tr><td>6. Unrestricted access to sensitive business flows</td><td>limits on flows such as checkout or sign-up</td></tr>
<tr><td>7. Server-side request forgery</td><td>never fetch a user-supplied URL without an allow-list</td></tr>
<tr><td>8. Security misconfiguration</td><td>HTTPS only, strict CORS, no verbose errors, security headers</td></tr>
<tr><td>9. Improper inventory management</td><td>know every endpoint and version; retire old ones</td></tr>
<tr><td>10. Unsafe consumption of APIs</td><td>validate third-party data and AI model output</td></tr></table>
<p>Injection has no entry of its own now, but parameterised queries remain basic hygiene. I make item 1 testable: user A requests user B's resource and must get 403 or 404.</p>
<blockquote><b>Say it in the interview:</b> Authentication tells me who is calling; the bugs are usually in authorization. I check object-level access on every request, use DTOs to stop over-posting and data leaks, cap everything, and back it with tests where one user asks for another user's data.</blockquote>`,
  followUps: ['Give a concrete BOLA example and its fix.', 'What is mass assignment?', 'How do you find endpoints nobody remembers?'] });

interview.push({ q: 'You must retire a version of a public API that many clients still use. How do you run it?', level: 'E',
  a: `<p>You retire an API version slowly and visibly: keep the old one working, tell clients early in several ways, measure who still uses it, and switch it off only when the numbers say it is safe.</p>
<ol><li><b>Decide the policy once.</b> For example: at most 2 major versions live, and at least 12 months of notice. Publish it.</li>
<li><b>Make the new version easy.</b> A migration guide with before-and-after examples, a changelog, updated client libraries and a sandbox.</li>
<li><b>Signal in the API itself.</b> Return <code>Deprecation</code> and <code>Sunset</code> headers on every old-version response, with a link to the guide. Mark operations as deprecated in OpenAPI.</li>
<li><b>Measure per client.</b> Log version and client id on every call. A dashboard shows who is still on v1 and how much.</li>
<li><b>Reach out.</b> Email is ignored, so contact the top users directly and offer help.</li>
<li><b>Brownouts.</b> Near the date, switch v1 off for short planned windows so remaining users notice before the final day.</li>
<li><b>Switch off.</b> Return 410 Gone with a Problem Details body that points to the guide. Keep the route for a while so the error is clear.</li></ol>
<p>The leadership part is weighing the cost of running two versions (double testing, security fixes twice) against client pain, and being ready to extend the date for a key client with a written exception instead of quietly breaking them.</p>
<blockquote><b>Say it in the interview:</b> Deprecation is a communication project with data behind it: a published policy, Sunset headers, per-client usage numbers, direct outreach, short brownouts, and only then 410 Gone.</blockquote>`,
  followUps: ['A major client says they cannot move in time. What do you do?', 'How do you avoid needing v3 a year later?', 'What does it cost to keep an old version alive?'] });

// ---------- INTERVIEW: 2. SOAP, WSDL and WCF ----------
interview.push({ q: 'What is SOAP and how does it differ from REST?', level: 'B',
  a: `<p>SOAP is an older, stricter way to call a service where every message is an XML envelope and a formal contract file describes every operation.</p>
<pre><code>&lt;soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope"&gt;
  &lt;soap:Header&gt; &lt;!-- security, routing --&gt; &lt;/soap:Header&gt;
  &lt;soap:Body&gt;
    &lt;GetOrder xmlns="http://example.com/shop"&gt;&lt;Id&gt;5&lt;/Id&gt;&lt;/GetOrder&gt;
  &lt;/soap:Body&gt;
&lt;/soap:Envelope&gt;</code></pre>
<table><tr><th></th><th>SOAP</th><th>REST</th></tr>
<tr><td>Thinks in</td><td>operations (remote calls)</td><td>resources</td></tr>
<tr><td>Format</td><td>XML only</td><td>JSON, XML or others</td></tr>
<tr><td>Contract</td><td>WSDL, required and strongly typed</td><td>OpenAPI, optional</td></tr>
<tr><td>Extras</td><td>WS-Security, reliable messaging, transactions</td><td>HTTPS, OAuth, plain HTTP features</td></tr>
<tr><td>Transport</td><td>HTTP, TCP, message queues</td><td>HTTP</td></tr>
<tr><td>Caching</td><td>hard, calls are POSTs</td><td>built into HTTP</td></tr>
<tr><td>Weight</td><td>heavier messages</td><td>lighter</td></tr>
<tr><td>Found in</td><td>banking, government, older enterprise systems</td><td>public, web and mobile APIs</td></tr></table>
<p>The <b>WSDL</b> (Web Services Description Language) is an XML document listing operations, message types and addresses. Tools read it and generate a typed client. SOAP 1.2 no longer treats the name as an acronym; it began as Simple Object Access Protocol.</p>
<blockquote><b>Say it in the interview:</b> SOAP is XML envelopes with a mandatory WSDL contract and the WS-star standards. REST is lighter and uses HTTP itself. I would not start a new API in SOAP, but I can integrate with one by generating a client from its WSDL.</blockquote>`,
  followUps: ['What is in a WSDL file?', 'What does WS-Security give you that HTTPS does not?', 'How do SOAP services report errors?'] });

interview.push({ q: 'What is WCF and what replaced it in modern .NET?', level: 'I',
  a: `<p>WCF (Windows Communication Foundation) is the .NET Framework technology for building SOAP and other service endpoints, and modern .NET does not include a WCF server.</p>
<p>In WCF you wrote a service contract as a C# interface and chose <b>bindings</b> in configuration: HTTP with SOAP, raw TCP, named pipes or message queues.</p>
<p>What to use today:</p>
<table><tr><th>Need</th><th>Choice in modern .NET</th></tr>
<tr><td>Call an existing SOAP service</td><td>generate a client with <code>dotnet-svcutil</code> or Visual Studio Connected Services; it uses the supported <code>System.ServiceModel</code> client packages</td></tr>
<tr><td>Keep hosting existing WCF contracts</td><td>CoreWCF, a community port of the server side, useful for migration</td></tr>
<tr><td>New internal service-to-service calls</td><td>gRPC</td></tr>
<tr><td>New public or browser-facing API</td><td>REST with ASP.NET Core</td></tr></table>
<pre><code>// Calling a SOAP service from modern .NET with a generated client
var client = new ShopServiceClient(ShopServiceClient.EndpointConfiguration.BasicHttpBinding_IShopService);
var order = await client.GetOrderAsync(5);</code></pre>
<p>.NET Framework 4.8 itself is still supported as part of Windows, so an old WCF service does not have to move tomorrow. It simply gets no new features.</p>
<blockquote><b>Say it in the interview:</b> WCF servers stayed on .NET Framework. In modern .NET I consume SOAP with a generated client, use CoreWCF as a bridge when existing contracts must stay, and build new services with gRPC inside and REST outside.</blockquote>`,
  followUps: ['What is a binding in WCF?', 'What does CoreWCF not support?', 'Why did Microsoft recommend gRPC as the successor for internal calls?'] });

interview.push({ q: 'How would you migrate a large WCF service to modern .NET?', level: 'A',
  a: `<p>You move it in small steps behind a stable front, starting by finding out who calls it and which WCF features it really uses.</p>
<ol><li><b>Inventory.</b> List operations, bindings, security mode, callers and call volume. Find operations nobody calls and drop them.</li>
<li><b>Sort the callers.</b> Can they change? Internal .NET callers can move to a new protocol. External partners with SOAP clients often cannot.</li>
<li><b>Choose a target per group.</b>
<ul><li>Callers cannot change: host the same contracts on <b>CoreWCF</b> on modern .NET, so the WSDL stays the same.</li>
<li>Internal callers: <b>gRPC</b>. A service contract maps naturally to a .proto service.</li>
<li>Browser or public callers: <b>REST</b>.</li></ul></li>
<li><b>Separate logic from transport first.</b> Move business code out of the service classes into plain libraries (targeting .NET Standard or multi-targeting), so old and new hosts share it.</li>
<li><b>Strangle, do not rewrite.</b> Put a gateway in front, move one operation at a time, and compare old and new results on real traffic before switching.</li>
<li><b>Watch the gaps.</b> Distributed transactions, some WS-* features, duplex callbacks and MSMQ bindings have no direct match and need redesign, for example callbacks become gRPC streaming or a message queue.</li></ol>
<p>Success is measured per operation moved, with a rollback path at every step.</p>
<blockquote><b>Say it in the interview:</b> Inventory first, then pull the business logic out of the WCF classes, then migrate operation by operation behind a gateway: CoreWCF where clients cannot change, gRPC for internal callers, REST for public ones.</blockquote>`,
  followUps: ['How do you test that the new endpoint behaves like the old one?', 'What do you do about WS-AtomicTransaction?', 'How do you sell this to the business when nothing visible changes?'] });

// ---------- INTERVIEW: 3. gRPC ----------
interview.push({ q: 'What is gRPC and when do you use it?', level: 'B',
  a: `<p>gRPC is a way for one service to call a method on another service as if it were local, using small binary messages over HTTP/2.</p>
<p>You describe the service once in a <b>.proto</b> file. Tools generate the server base class and the client for C#, Java, Go, Python and more.</p>
<pre><code>syntax = "proto3";
service PriceService {
  rpc GetPrice (PriceRequest) returns (PriceReply);
}
message PriceRequest { int32 product_id = 1; }
message PriceReply   { int32 product_id = 1; double amount = 2; }</code></pre>
<table><tr><th></th><th>gRPC</th><th>REST with JSON</th></tr>
<tr><td>Payload</td><td>binary Protocol Buffers, small and fast</td><td>text JSON</td></tr>
<tr><td>Contract</td><td>.proto, required</td><td>OpenAPI, optional</td></tr>
<tr><td>Streaming</td><td>built in, both directions</td><td>needs SSE or WebSockets</td></tr>
<tr><td>Browser</td><td>needs gRPC-Web or transcoding</td><td>works directly</td></tr>
<tr><td>Debugging</td><td>harder, not readable by eye</td><td>easy with curl or a browser</td></tr>
<tr><td>Best for</td><td>service to service, low latency, streaming</td><td>public APIs and browsers</td></tr></table>
<p>Use it between your own back-end services, especially with high call volume, several programming languages, or streaming. Avoid it for public APIs, where callers expect plain HTTP and JSON.</p>
<blockquote><b>Say it in the interview:</b> gRPC is contract-first RPC over HTTP/2 with binary protobuf messages and generated clients. I use it for internal service-to-service calls and streaming, and keep REST for public and browser-facing APIs.</blockquote>`,
  followUps: ['Why is protobuf smaller than JSON?', 'How do you report errors in gRPC?', 'How do you load balance gRPC, given its long-lived connections?'] });

interview.push({ q: 'What are the four kinds of gRPC call, and what are deadlines?', level: 'I',
  a: `<p>A gRPC method can be one request and one response, or either side (or both) can send a stream of messages, and a deadline is the time limit the client sets for the whole call.</p>
<table><tr><th>Kind</th><th>Shape</th><th>Example</th></tr>
<tr><td>Unary</td><td>1 request, 1 response</td><td>get a price</td></tr>
<tr><td>Server streaming</td><td>1 request, many responses</td><td>follow price changes</td></tr>
<tr><td>Client streaming</td><td>many requests, 1 response</td><td>upload a file in chunks</td></tr>
<tr><td>Bidirectional streaming</td><td>many each way, independently</td><td>chat, live negotiation</td></tr></table>
<pre><code>// Client: always set a deadline
var reply = await client.GetPriceAsync(
    new PriceRequest { ProductId = 17 },
    deadline: DateTime.UtcNow.AddSeconds(2));

// Server streaming: write until the client goes away
public override async Task WatchPrices(WatchRequest request,
    IServerStreamWriter&lt;PriceReply&gt; stream, ServerCallContext context)
{
    await foreach (var p in feed.WatchAsync(request.ProductIds, context.CancellationToken))
        await stream.WriteAsync(p);
}</code></pre>
<p><b>Deadlines:</b> without one, a call can wait forever. When the deadline passes, the client gets status <code>DeadlineExceeded</code> and the server's cancellation token fires so it can stop working. A good service passes the remaining time on to the services it calls. Errors use gRPC status codes such as <code>NotFound</code>, <code>InvalidArgument</code>, <code>PermissionDenied</code> and <code>Unavailable</code>, not HTTP status codes.</p>
<blockquote><b>Say it in the interview:</b> Unary, server streaming, client streaming and bidirectional. Every call gets a deadline, and the server honours the cancellation token so abandoned work stops.</blockquote>`,
  followUps: ['What happens on the server when a deadline is exceeded?', 'How do you add authentication to gRPC calls?', 'What is an interceptor?'] });

interview.push({ q: 'Can a browser call a gRPC service?', level: 'I',
  a: `<p>Not directly, because browser JavaScript cannot control HTTP/2 at the level gRPC needs, so you use gRPC-Web or expose the service as JSON.</p>
<table><tr><th>Option</th><th>How it works</th><th>Limits</th></tr>
<tr><td>gRPC-Web</td><td>a browser-friendly variant of the protocol; in ASP.NET Core add <code>app.UseGrpcWeb()</code> and enable it per service</td><td>unary and server streaming only; no client or bidirectional streaming</td></tr>
<tr><td>JSON transcoding</td><td>annotate the .proto with HTTP routes; ASP.NET Core serves the same methods as REST-style JSON endpoints</td><td>JSON is larger and slower than protobuf; streaming support is limited</td></tr>
<tr><td>A REST or GraphQL gateway (backend for frontend)</td><td>the browser calls the gateway, the gateway calls gRPC services</td><td>one more service to run</td></tr></table>
<pre><code>service PriceService {
  rpc GetPrice (PriceRequest) returns (PriceReply) {
    option (google.api.http) = { get: "/v1/prices/{product_id}" };
  }
}</code></pre>
<p>With JSON transcoding, one implementation serves fast protobuf to internal callers and plain JSON to browsers and partners, and the JSON side can produce an OpenAPI document. For two-way real-time needs in the browser, pair gRPC on the inside with SignalR or WebSockets at the edge.</p>
<blockquote><b>Say it in the interview:</b> Browsers cannot speak native gRPC. I pick gRPC-Web when the front end wants generated gRPC clients, JSON transcoding when I want one service to offer both gRPC and REST, or a gateway in front.</blockquote>`,
  followUps: ['Why does native gRPC not work from browser JavaScript?', 'When would you choose a backend-for-frontend over transcoding?', 'Does gRPC work over HTTP/3?'] });

interview.push({ q: 'How do you change a Protocol Buffers contract without breaking clients?', level: 'A',
  a: `<p>You only add, never reuse, because protobuf identifies each field on the wire by its number, not by its name.</p>
<pre><code>message PriceReply {
  reserved 3;                 // an old field that was removed: never reuse number 3
  reserved "discount";
  int32 product_id = 1;
  double amount = 2;
  string currency = 4;        // added later: old clients skip it
}</code></pre>
<table><tr><th>Change</th><th>Safe?</th></tr>
<tr><td>Add a new field with a new number</td><td>yes: old code ignores it, new code sees the default when it is missing</td></tr>
<tr><td>Remove a field</td><td>yes, if you mark its number and name as <code>reserved</code></td></tr>
<tr><td>Rename a field</td><td>safe in binary; breaks generated code and JSON transcoding</td></tr>
<tr><td>Change a field number</td><td>no: it becomes a different field</td></tr>
<tr><td>Change a type (for example int32 to string)</td><td>no, with a few compatible exceptions</td></tr>
<tr><td>Reuse an old number for a new meaning</td><td>no: old data is silently misread</td></tr>
<tr><td>Add an enum value</td><td>yes, if clients handle unknown values</td></tr></table>
<p>Other habits: remember that proto3 fields have default values (0, empty string), so use <code>optional</code> or wrapper types when "not set" must differ from zero. Keep .proto files in one shared repository or package, and run a breaking-change check on them in CI (for example <code>buf breaking</code>). For a real redesign, create a new package version such as <code>shop.v2</code> and run both for a while.</p>
<blockquote><b>Say it in the interview:</b> Field numbers are the contract. I add fields with new numbers, reserve removed ones, never renumber or retype, and let a CI check catch breaking changes to the .proto files.</blockquote>`,
  followUps: ['Why does proto3 not tell you whether a field was set?', 'How do old clients treat an enum value they do not know?', 'Where do you keep shared .proto files?'] });

// ---------- INTERVIEW: 4. GraphQL ----------
interview.push({ q: 'What is GraphQL and why would you pick it over REST?', level: 'B',
  a: `<p>GraphQL is a query language for APIs where the client asks one endpoint for exactly the fields it needs and gets back exactly that shape.</p>
<pre><code>query Dashboard {
  orders(first: 20, status: OPEN) {
    nodes { id total customer { name } items { title quantity } }
    pageInfo { hasNextPage endCursor }
  }
}</code></pre>
<p>It solves two REST pains. <b>Over-fetching</b>: an endpoint returns 40 fields and the screen needs 5. <b>Under-fetching</b>: one screen needs 6 calls to collect its data.</p>
<table><tr><th></th><th>REST</th><th>GraphQL</th></tr>
<tr><td>Endpoints</td><td>many</td><td>one (/graphql)</td></tr>
<tr><td>Response shape</td><td>decided by the server</td><td>decided by the client</td></tr>
<tr><td>Contract</td><td>OpenAPI, optional</td><td>typed schema, required</td></tr>
<tr><td>Caching</td><td>HTTP caching works</td><td>harder: usually POST; use persisted queries and client caches</td></tr>
<tr><td>Versioning</td><td>v1, v2</td><td>evolve the schema, deprecate fields</td></tr>
<tr><td>Errors</td><td>HTTP status codes</td><td>often 200 with an <code>errors</code> array</td></tr>
<tr><td>Main risks</td><td>chatty clients</td><td>expensive queries, N+1, depth attacks</td></tr></table>
<p>Pick it when many screens or client teams need different shapes of the same data, such as a configurable dashboard. Stay with REST for simple CRUD, public partner APIs and anything that leans on HTTP caching. In .NET the usual server is Hot Chocolate.</p>
<blockquote><b>Say it in the interview:</b> GraphQL lets the client shape the response from one typed endpoint, which removes over-fetching and under-fetching. I choose it when clients need many data shapes, and I budget for its costs: N+1, caching and query limits.</blockquote>`,
  followUps: ['What is the difference between a query, a mutation and a subscription?', 'How do you version a GraphQL API?', 'Why is HTTP caching harder with GraphQL?'] });

interview.push({ q: 'How do you call a GraphQL API from TypeScript?', level: 'I',
  a: `<p>A GraphQL call is a normal HTTP POST whose JSON body holds the query text and its variables.</p>
<pre><code>const DASHBOARD = /* GraphQL */ "query Dashboard($status: OrderStatus) { orders(first: 20, status: $status) { nodes { id total } } }";

type Order = { id: string; total: number };

async function loadDashboard(status: string, token: string): Promise&lt;Order[]&gt; {
  const res = await fetch("/graphql", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
    body: JSON.stringify({ query: DASHBOARD, variables: { status } }),
  });
  const { data, errors } = await res.json();
  if (errors?.length) throw new Error(errors.map((e: { message: string }) =&gt; e.message).join("; "));
  return data.orders.nodes;
}</code></pre>
<p>Points to mention:</p>
<ul><li>Pass values as <b>variables</b>. Never build the query by joining strings with user input.</li>
<li>Check the <code>errors</code> array even when the HTTP status is 200. A response can hold both partial <code>data</code> and <code>errors</code>.</li>
<li>In a real app, use a client such as Apollo Client, urql or TanStack Query for caching and retries, and generate TypeScript types from the schema with GraphQL Code Generator so queries are checked at build time.</li></ul>
<blockquote><b>Say it in the interview:</b> It is a POST with query and variables. I always send variables instead of string-building, check the errors array even on 200, and generate types from the schema so a wrong field fails the build.</blockquote>`,
  followUps: ['What does a normalised client cache do?', 'How do you handle partial data with errors?', 'What are persisted queries?'] });

interview.push({ q: 'How do mutations, subscriptions and errors work in GraphQL?', level: 'I',
  a: `<p>GraphQL has three kinds of operation: a query reads, a mutation changes data, and a subscription keeps a connection open so the server can push results.</p>
<table><tr><th>Operation</th><th>Purpose</th><th>Transport</th></tr>
<tr><td>query</td><td>read; fields may be resolved in parallel</td><td>HTTP POST (or GET)</td></tr>
<tr><td>mutation</td><td>write; top-level fields run one after another</td><td>HTTP POST</td></tr>
<tr><td>subscription</td><td>a stream of results when something happens</td><td>WebSocket or server-sent events</td></tr></table>
<pre><code>mutation {
  cancelOrder(input: { orderId: "501" }) {
    order { id status }
    errors { code message }
  }
}</code></pre>
<p><b>Errors</b> come in two layers:</p>
<ul><li><b>Top-level <code>errors</code> array:</b> syntax errors, unknown fields, and exceptions in resolvers. A response can contain partial <code>data</code> with <code>errors</code> beside it. Many servers send HTTP 200 for these. The newer GraphQL over HTTP specification lets a server use 4xx codes when it answers with the <code>application/graphql-response+json</code> type.</li>
<li><b>Business errors in the schema:</b> expected failures such as "order already shipped" are returned as typed fields of the mutation result, as above, so clients handle them with normal code.</li></ul>
<p>Monitoring must read the body, because a dashboard that only counts 5xx responses will miss GraphQL failures.</p>
<blockquote><b>Say it in the interview:</b> Queries read, mutations write in order, subscriptions push over WebSockets or SSE. Unexpected failures go in the errors array, expected business failures are modelled in the schema, and my monitoring reads the body, not just the status code.</blockquote>`,
  followUps: ['Why do top-level mutation fields run in sequence?', 'When would you use a subscription instead of polling a query?', 'How do you return validation errors from a mutation?'] });

interview.push({ q: 'What is the N+1 problem in GraphQL and how does DataLoader solve it?', level: 'A',
  a: `<p>N+1 means one query fetches a list of N items and then a separate query runs for each item, so one request becomes N+1 database calls.</p>
<p>Each field has its own resolver. <code>orders</code> returns 20 rows, then the <code>customer</code> resolver runs 20 times, each with its own lookup: 21 queries.</p>
<p>A <b>DataLoader</b> fixes it with batching and caching, per request:</p>
<ol><li>Each resolver asks the loader for one key and gets a pending task.</li>
<li>The loader collects all keys asked for in the same execution step.</li>
<li>It runs <b>one</b> query: <code>WHERE Id IN (...)</code>.</li>
<li>It hands every resolver its result, and remembers results so the same key is not fetched twice in the request.</li></ol>
<pre><code>public class CustomerByIdLoader(IBatchScheduler s, IDbContextFactory&lt;ShopDb&gt; f, DataLoaderOptions o)
    : BatchDataLoader&lt;int, Customer&gt;(s, o)
{
    protected override async Task&lt;IReadOnlyDictionary&lt;int, Customer&gt;&gt; LoadBatchAsync(
        IReadOnlyList&lt;int&gt; ids, CancellationToken ct)
    {
        await using var db = await f.CreateDbContextAsync(ct);
        return await db.Customers.Where(c =&gt; ids.Contains(c.Id)).ToDictionaryAsync(c =&gt; c.Id, ct);
    }
}</code></pre>
<p>Result: 2 queries instead of 21, and still 2 with 200 orders. Guard it with a test that counts SQL statements per operation.</p>
<blockquote><b>Say it in the interview:</b> Each child resolver runs per parent row, which gives N+1 queries. A DataLoader collects the keys and loads them in one batched query per request, and I keep a test on the SQL count so it stays fixed.</blockquote>`,
  followUps: ['Why is the DataLoader cache scoped to one request?', 'Does REST have N+1 problems too?', 'When is a join through projection better than a DataLoader?'] });

interview.push({ q: 'How do you secure a GraphQL API and keep it fast?', level: 'E',
  a: `<p>With GraphQL the client writes the query, so you must limit what any single query can cost and check permissions at field level, not only at the endpoint.</p>
<table><tr><th>Risk</th><th>Control</th></tr>
<tr><td>Very deep or wide queries</td><td>maximum depth and a cost (complexity) limit calculated before execution</td></tr>
<tr><td>Huge lists</td><td>every list is paged (Relay-style connections) with a capped <code>first</code></td></tr>
<tr><td>Unknown queries from outside</td><td><b>persisted queries</b>: only queries registered at build time may run, sent by hash</td></tr>
<tr><td>Schema discovery</td><td>turn off introspection in production if not public</td></tr>
<tr><td>Data reached through a side path</td><td>authorization on types, fields and resolvers; the same object can be reached from many parents</td></tr>
<tr><td>One request doing the work of thousands</td><td>rate limit by query cost, not by request count; set timeouts</td></tr>
<tr><td>N+1</td><td>DataLoader and projections</td></tr></table>
<p><b>Speed:</b> cache at resolver level for hot data; with persisted queries sent as GET, a CDN can cache public results. <b>Observability:</b> every request needs an operation name, and you log name, cost, duration and error count, because "POST /graphql took 2 s" tells you nothing.</p>
<p>The architectural decision is who the clients are. For your own apps, persisted queries turn the API into a fixed, reviewable set of operations and remove most risk. A truly public GraphQL API needs the full cost model.</p>
<blockquote><b>Say it in the interview:</b> I cap depth and cost, page every list, authorize per field, rate limit by cost, and use persisted queries for first-party clients. Then I log by operation name so I can see which query is the expensive one.</blockquote>`,
  followUps: ['How is query cost calculated?', 'Why is endpoint-level authorization not enough?', 'What is the downside of disabling introspection?'] });

// ---------- INTERVIEW: 5. Other protocols and real-time options ----------
interview.push({ q: 'Compare polling, long polling, server-sent events, WebSockets, SignalR and webhooks.', level: 'B',
  a: `<p>They are all ways for a client to learn about something new on the server, and they differ in who starts the message and whether the channel is one-way or two-way.</p>
<table><tr><th>Technique</th><th>Direction</th><th>Notes</th><th>Good for</th></tr>
<tr><td>Polling</td><td>client asks on a timer</td><td>simple; wasteful if frequent</td><td>job status</td></tr>
<tr><td>Long polling</td><td>client asks, server holds the answer</td><td>works everywhere; one held request per client</td><td>fallback</td></tr>
<tr><td>Server-sent events (SSE)</td><td>server to client</td><td>plain HTTP, <code>text/event-stream</code>, automatic reconnect</td><td>progress, feeds, streaming AI text</td></tr>
<tr><td>WebSocket</td><td>both ways</td><td>one long-lived connection after an HTTP upgrade</td><td>chat, collaboration, games</td></tr>
<tr><td>SignalR</td><td>both ways</td><td>.NET library on top of WebSockets, SSE or long polling; hubs and groups</td><td>dashboards, notifications</td></tr>
<tr><td>Webhook</td><td>server to server</td><td>an HTTP POST to a URL the receiver registered</td><td>"payment completed" events</td></tr></table>
<pre><code>// Browser: reading server-sent events
const source = new EventSource("/api/v1/orders/501/events");
source.onmessage = (e) =&gt; showStatus(e.data);</code></pre>
<p>How to choose: if the client only listens, SSE is the simplest. If both sides talk often, use WebSockets, or SignalR in a .NET stack. If another company's server needs to be told, use a webhook. If a few seconds of delay is fine, plain polling is honest and cheap.</p>
<blockquote><b>Say it in the interview:</b> I start from the direction of the data. One-way to a browser: SSE. Two-way: WebSockets, through SignalR in .NET. Server to server: webhooks. And I do not dismiss polling when a small delay is acceptable.</blockquote>`,
  followUps: ['Why can EventSource not send an Authorization header, and what do you do about it?', 'How does a WebSocket connection start?', 'What does SignalR add over raw WebSockets?'] });

interview.push({ q: 'Compare AMQP, MQTT, Kafka, Azure Service Bus, Event Grid and Event Hubs.', level: 'I',
  a: `<p>These are tools for services to send each other messages through a broker, so the sender does not have to wait for the receiver or even know whether it is running.</p>
<table><tr><th>Name</th><th>What it is</th><th>Use it for</th></tr>
<tr><td>AMQP</td><td>a wire protocol for broker messaging; Service Bus uses it</td><td>rarely chosen directly</td></tr>
<tr><td>MQTT</td><td>a very light publish and subscribe protocol</td><td>IoT devices</td></tr>
<tr><td>Kafka</td><td>a distributed, partitioned log; consumers track their own position and can replay</td><td>high-volume event streams</td></tr>
<tr><td>Azure Service Bus</td><td>enterprise queues and topics: sessions for ordering, dead-letter queue, duplicate detection, scheduled delivery</td><td>business messages that must not be lost</td></tr>
<tr><td>Azure Event Grid</td><td>pushes small events to subscribers</td><td>reacting to "something happened", such as a file upload</td></tr>
<tr><td>Azure Event Hubs</td><td>a partitioned log like Kafka, and it offers a Kafka-compatible endpoint</td><td>telemetry and clickstream ingestion</td></tr></table>
<p>Two ideas to state clearly:</p>
<ul><li><b>Queue versus topic.</b> A queue delivers each message to one receiver (point to point). A topic copies each message to every subscription (publish and subscribe).</li>
<li><b>At-least-once delivery.</b> A message may arrive twice, so every consumer must be <b>idempotent</b>: processing the same message twice has the same effect as once.</li></ul>
<blockquote><b>Say it in the interview:</b> Service Bus for business commands and workflows, Event Grid for lightweight reactive events, Event Hubs or Kafka for high-volume streams, MQTT for devices. Whatever the broker, delivery is at least once, so my handlers are idempotent.</blockquote>`,
  followUps: ['What is a dead-letter queue and who looks at it?', 'How do you keep messages for one order in sequence?', 'What is the outbox pattern?'] });

interview.push({ q: 'Which other API styles and protocol versions might you be asked to compare?', level: 'I',
  a: `<p>Besides REST, gRPC and GraphQL, interviewers like to check that you know a few neighbours and the HTTP versions they run on.</p>
<table><tr><th>Name</th><th>One-line meaning</th></tr>
<tr><td>OData</td><td>a standard for query options on REST: <code>$filter</code>, <code>$select</code>, <code>$expand</code>, <code>$orderby</code>, <code>$top</code>. Common in Microsoft products such as Dynamics and Microsoft Graph.</td></tr>
<tr><td>JSON-RPC</td><td>call a named method with parameters in a JSON body; no resources. It is also the message format of the Model Context Protocol used by AI tools.</td></tr>
<tr><td>tRPC</td><td>RPC for TypeScript where client and server share types, with no separate contract file.</td></tr></table>
<table><tr><th>HTTP version</th><th>Key idea</th></tr>
<tr><td>HTTP/1.1</td><td>text; one request at a time per connection, so browsers open several connections</td></tr>
<tr><td>HTTP/2</td><td>binary; many requests share one TCP connection (multiplexing); header compression. One lost packet still stalls all streams.</td></tr>
<tr><td>HTTP/3</td><td>runs on QUIC over UDP; a lost packet delays only its own stream; faster connection setup</td></tr></table>
<p><b>TLS versus mTLS:</b> TLS encrypts the connection and proves the server's identity with a certificate. In mutual TLS the client presents a certificate too, so both ends are verified. It is common between services inside a network or service mesh.</p>
<blockquote><b>Say it in the interview:</b> OData standardises querying over REST, JSON-RPC and tRPC are procedure-call styles, HTTP/2 multiplexes over one TCP connection and HTTP/3 moves to QUIC to remove head-of-line blocking. mTLS means both sides present certificates.</blockquote>`,
  followUps: ['What is head-of-line blocking?', 'What is the risk of exposing OData $filter and $expand without limits?', 'Where would you terminate TLS in your architecture?'] });

interview.push({ q: 'How do you receive and send webhooks safely and reliably?', level: 'A',
  a: `<p>A webhook is an HTTP POST from one system to a URL another system registered, and because that URL is open to the internet you must verify every call and expect repeats.</p>
<p><b>When you receive webhooks:</b></p>
<ol><li><b>Verify the signature.</b> The sender signs the raw body with a shared secret (HMAC-SHA256). Recompute and compare in constant time.</li>
<li><b>Block replays.</b> Reject messages whose timestamp is older than a few minutes.</li>
<li><b>Deduplicate.</b> Save the event id with a unique index; a repeat gets 200 and is skipped.</li>
<li><b>Answer fast.</b> Queue the event, return 200, process in the background.</li>
<li><b>Do not trust order.</b> Use a version in the event.</li></ol>
<pre><code>var expected = HMACSHA256.HashData(secretBytes, rawBodyBytes);
var given = Convert.FromHexString(signatureHeader);
if (!CryptographicOperations.FixedTimeEquals(expected, given))
    return Results.Unauthorized();</code></pre>
<p><b>When you send webhooks:</b></p>
<ul><li>Write the event to an <b>outbox</b> table in the same transaction as the business change, so it cannot be lost.</li>
<li>Deliver from a queue with a short timeout, exponential backoff for hours or days, then a dead-letter store.</li>
<li>Give each event an id, a type and a timestamp; sign it with a per-receiver secret that can be rotated.</li>
<li>Offer a delivery log and a resend button.</li></ul>
<blockquote><b>Say it in the interview:</b> Receiving: verify the HMAC signature and timestamp, deduplicate by event id, acknowledge quickly and process asynchronously. Sending: outbox, retries with backoff, signed events with ids. The promise is at-least-once, never exactly-once.</blockquote>`,
  followUps: ['Why compare signatures in constant time?', 'Why must you sign the raw body and not the parsed JSON?', 'How do you rotate a webhook secret without dropping events?'] });

interview.push({ q: 'How does SignalR work, and how do you scale it across several servers?', level: 'A',
  a: `<p>SignalR is the ASP.NET Core library that keeps a connection open between server and clients so either side can call the other, and it picks the best transport the network allows.</p>
<ul><li><b>Hub:</b> a class whose methods clients call. The server calls clients back by name: <code>Clients.All</code>, <code>Clients.User(id)</code>, <code>Clients.Group(name)</code>.</li>
<li><b>Transports:</b> WebSockets first, then server-sent events, then long polling. The client finds out through a <code>negotiate</code> request.</li>
<li><b>Groups:</b> named sets of connections, for example one per order or per tenant.</li></ul>
<p><b>The scaling problem:</b> a connection lives on one server. A message raised on server 1 does not reach clients connected to server 2.</p>
<table><tr><th>Option</th><th>How</th><th>Notes</th></tr>
<tr><td>Azure SignalR Service</td><td>clients connect to the managed service; app servers send to it</td><td>no sticky sessions; handles very large connection counts</td></tr>
<tr><td>Redis backplane</td><td>each server publishes messages to Redis; all servers relay them</td><td>needs sticky sessions unless all clients use WebSockets and skip negotiation; Redis must be close and fast</td></tr></table>
<p>Also plan for reconnects: enable automatic reconnect on the client, re-join groups after reconnecting, and load the current state through a normal API call, because messages sent during the gap are not replayed unless you build that.</p>
<blockquote><b>Say it in the interview:</b> SignalR gives hubs, groups and transport fallback. To scale out I use Azure SignalR Service, or a Redis backplane with sticky sessions, and I treat it as a notification channel: after a reconnect the client re-reads state from the API.</blockquote>`,
  followUps: ['Why are sticky sessions needed with a backplane?', 'How do you authenticate a SignalR connection?', 'How do you send a message to one user who has 3 tabs open?'] });

// ---------- INTERVIEW: 6. API testing ----------
interview.push({ q: 'What types of tests do you write for an API, and how many of each?', level: 'B',
  a: `<p>You write many small fast tests, fewer tests that run the real API with its database, and only a handful that go through the whole system, a shape known as the test pyramid.</p>
<table><tr><th>Level</th><th>Scope</th><th>Speed</th><th>Tools</th><th>Example</th></tr>
<tr><td>Unit</td><td>one class, dependencies faked</td><td>ms</td><td>xUnit or NUnit with Moq or NSubstitute; Vitest or Jest</td><td>validation rules, mappers</td></tr>
<tr><td>Integration</td><td>API with a real database or queue</td><td>seconds</td><td>WebApplicationFactory, Testcontainers</td><td>endpoint to service to SQL</td></tr>
<tr><td>Contract</td><td>provider and consumer agree on the shape</td><td>seconds</td><td>Pact, OpenAPI diff</td><td>front end against back end</td></tr>
<tr><td>End to end</td><td>UI through API to database</td><td>slow</td><td>Playwright, Cypress</td><td>create an order from the screen</td></tr>
<tr><td>Load</td><td>speed under many users</td><td>minutes</td><td>k6, JMeter, Azure Load Testing</td><td>dashboard with 200 users</td></tr>
<tr><td>Security</td><td>sign-in, permissions, injection</td><td>varies</td><td>OWASP ZAP, dependency scanners</td><td>user A reading user B's data</td></tr>
<tr><td>Smoke</td><td>is the deployment alive</td><td>seconds</td><td>pipeline step, curl</td><td>call /health after release</td></tr></table>
<p>The reason for the shape: lower levels are fast, stable and point at the exact fault. Higher levels prove the pieces fit but are slow and fail for many reasons. So push each check to the lowest level that can catch that kind of bug.</p>
<blockquote><b>Say it in the interview:</b> Many unit tests, fewer integration tests on the real pipeline and database, a few end-to-end tests for the key journeys, plus targeted contract, load and security tests. Each bug type gets tested at the cheapest level that can catch it.</blockquote>`,
  followUps: ['What is the difference between a unit test and an integration test?', 'What code coverage target do you set, and why?', 'Which tests run on every commit and which before a release?'] });

interview.push({ q: 'Which tools do you use to call and explore an API: curl, Postman, .http files, Newman?', level: 'B',
  a: `<p>These are tools for sending HTTP requests by hand or from a script, so you can try an API without writing an application.</p>
<pre><code># curl: -i shows response headers, -H adds a header, -d sends a body
curl -i https://api.example.com/api/v1/orders/5 -H "Authorization: Bearer $TOKEN"

curl -X POST https://api.example.com/api/v1/orders \\
  -H "Content-Type: application/json" \\
  -d '{"productId":17,"quantity":2}'</code></pre>
<table><tr><th>Tool</th><th>What it is good for</th></tr>
<tr><td>curl</td><td>on every machine; easy to paste into a bug report</td></tr>
<tr><td>Postman</td><td>a visual client with collections, environments and test scripts</td></tr>
<tr><td>.http files</td><td>plain-text requests stored in the repository; run from Visual Studio, Rider or the VS Code REST Client extension</td></tr>
<tr><td>Newman</td><td>runs Postman collections from the command line, for CI</td></tr></table>
<pre><code>// Postman test script, runs after the response arrives
pm.test("status is 201", () =&gt; pm.response.to.have.status(201));
pm.test("has Location header", () =&gt; pm.response.to.have.header("Location"));
pm.collectionVariables.set("orderId", pm.response.json().id);   // use it in the next request</code></pre>
<p>In CI: <code>newman run collection.json -e test-env.json --reporters cli,junit</code>. Keep collections or .http files in source control beside the code, and keep tokens and secrets in environment variables, never in the shared file.</p>
<blockquote><b>Say it in the interview:</b> curl for quick checks and reproducible bug reports, Postman or .http files for exploring, Newman to run collections in the pipeline. The requests live in the repository and the secrets live outside it.</blockquote>`,
  followUps: ['How do you chain requests so the second uses an id from the first?', 'What are the limits of testing with Postman collections compared with code-based tests?', 'How do you get a token for manual testing?'] });

interview.push({ q: 'Write a unit test for a service with xUnit and Moq.', level: 'I',
  a: `<p>A unit test runs one class on its own, replaces its dependencies with fakes, and checks one behaviour in three steps: arrange, act, assert.</p>
<pre><code>public class OrderServiceTests
{
    private readonly Mock&lt;IOrderRepository&gt; _orders = new();
    private readonly Mock&lt;INotifier&gt; _notifier = new();
    private OrderService Sut() =&gt; new(_orders.Object, _notifier.Object);

    [Fact]
    public async Task Ship_NotifiesCustomer_WhenOrderIsPaid()
    {
        _orders.Setup(r =&gt; r.GetAsync(1, default))
               .ReturnsAsync(new Order { Id = 1, Status = OrderStatus.Paid, Email = "a@example.com" });

        await Sut().ShipAsync(1, default);

        _orders.Verify(r =&gt; r.SaveAsync(It.Is&lt;Order&gt;(o =&gt; o.Status == OrderStatus.Shipped), default), Times.Once);
        _notifier.Verify(n =&gt; n.SendAsync("a@example.com", It.IsAny&lt;string&gt;()), Times.Once);
    }
}</code></pre>
<p>What makes it good: the name says method, outcome and condition, and each test checks one behaviour. I add a failure-path test as a <code>[Theory]</code> with <code>[InlineData]</code> for each wrong status: it expects <code>Assert.ThrowsAsync</code> and verifies <code>SaveAsync</code> was called <code>Times.Never</code>. The front end version looks the same in Vitest with <code>vi.fn()</code> fakes and <code>it.each</code>.</p>
<blockquote><b>Say it in the interview:</b> Arrange, act, assert; one behaviour per test; a name that reads like a sentence; and always a failure-path test that proves nothing was persisted.</blockquote>`,
  followUps: ['What is the difference between a mock, a stub and a fake?', 'When does heavy mocking become a problem?', 'Moq or NSubstitute: does the choice matter?'] });

interview.push({ q: 'How do you write an integration test with WebApplicationFactory?', level: 'I',
  a: `<p>WebApplicationFactory starts your whole ASP.NET Core app in memory and gives you an HttpClient that talks to it, so the test runs real routing, middleware, validation and serialisation without a network.</p>
<pre><code>public class OrdersApiTests(WebApplicationFactory&lt;Program&gt; factory)
    : IClassFixture&lt;WebApplicationFactory&lt;Program&gt;&gt;
{
    private readonly HttpClient _client = factory.WithWebHostBuilder(b =&gt;
        b.ConfigureTestServices(s =&gt;
        {
            s.RemoveAll&lt;DbContextOptions&lt;ShopDb&gt;&gt;();
            s.AddDbContext&lt;ShopDb&gt;(o =&gt; o.UseSqlServer(TestDb.ConnectionString));
            s.AddAuthentication("Test")
             .AddScheme&lt;AuthenticationSchemeOptions, TestAuthHandler&gt;("Test", _ =&gt; { });
        })).CreateClient();

    [Fact]
    public async Task Post_ReturnsCreated_AndLocation()
    {
        var res = await _client.PostAsJsonAsync("/api/v1/orders", new { productId = 17, quantity = 2 });
        Assert.Equal(HttpStatusCode.Created, res.StatusCode);
        Assert.NotNull(res.Headers.Location);
    }
}</code></pre>
<p>Add the same for a missing field (400) and for no token (401).</p>
<p><b>Fidelity warning:</b> the EF Core in-memory provider does not enforce constraints, transactions or SQL translation. Use a real engine with Testcontainers.</p>
<blockquote><b>Say it in the interview:</b> I host the real app in memory with WebApplicationFactory, replace only the database connection and the auth scheme, and assert on status codes, headers and bodies. For SQL behaviour I use a real database in a container, not the in-memory provider.</blockquote>`,
  followUps: ['How do you keep database state from leaking between tests?', 'Why is a missing Location header invisible to a unit test?', 'How do you make these tests fast enough for every pull request?'] });

interview.push({ q: 'How do you unit test an HTTP-triggered Azure Function?', level: 'I',
  a: `<p>You keep the function method thin and test it like any other class: create it with fake dependencies, call the method, and check the result it returns.</p>
<pre><code>[Fact]
public async Task GetBooking_Returns404_WhenMissing()
{
    var bookings = new Mock&lt;IBookingService&gt;();
    bookings.Setup(s =&gt; s.GetAsync(9, It.IsAny&lt;CancellationToken&gt;()))
            .ReturnsAsync((BookingDto?)null);

    var fn = new BookingFunctions(bookings.Object, NullLogger&lt;BookingFunctions&gt;.Instance);
    var request = new DefaultHttpContext().Request;

    var result = await fn.Get(request, 9, CancellationToken.None);

    Assert.IsType&lt;NotFoundResult&gt;(result);
}</code></pre>
<p>Why this works:</p>
<ul><li>In the <b>isolated worker model</b> with ASP.NET Core integration, a function is a normal class with constructor injection. Its method takes an <code>HttpRequest</code> and returns an <code>IActionResult</code>, so no Functions host is needed.</li>
<li>The function body only binds input, validates, calls a service and maps the result.</li></ul>
<p>A unit test cannot show routes, authorization level or binding settings. Cover those with a few integration tests against the app running locally (Core Tools with Azurite) or in a test slot. The older in-process model reached the end of support in November 2026.</p>
<blockquote><b>Say it in the interview:</b> My functions are thin adapters over injected services. I unit test the method directly with mocks and a DefaultHttpContext, and cover triggers and bindings with a small set of integration tests against a running host.</blockquote>`,
  followUps: ['How would you test a queue-triggered function?', 'What does the isolated worker model change for testing?', 'How do you test a timer trigger without waiting?'] });

interview.push({ q: 'How do you mock external HTTP dependencies in tests?', level: 'I',
  a: `<p>You replace the piece that actually sends the request, so your code runs normally but the "remote service" answers whatever the test decides.</p>
<p>In .NET, <code>HttpClient</code> delegates sending to an <code>HttpMessageHandler</code>. Swap the handler:</p>
<pre><code>public class StubHandler(Func&lt;HttpRequestMessage, HttpResponseMessage&gt; respond) : HttpMessageHandler
{
    protected override Task&lt;HttpResponseMessage&gt; SendAsync(HttpRequestMessage r, CancellationToken ct)
        =&gt; Task.FromResult(respond(r));
}

var http = new HttpClient(new StubHandler(_ =&gt;
    new HttpResponseMessage(HttpStatusCode.OK) { Content = JsonContent.Create(new { rate = 1.1 }) }));</code></pre>
<table><tr><th>Approach</th><th>When</th></tr>
<tr><td>Stub handler (above)</td><td>unit tests of a typed client: test 200, 404, 500, timeouts and bad JSON</td></tr>
<tr><td>WireMock.Net</td><td>integration tests: a real local HTTP server with scripted responses</td></tr>
<tr><td>Mock Service Worker (MSW)</td><td>TypeScript: intercepts requests in Node tests and in the browser</td></tr>
</table>
<p>Do not mock <code>HttpClient</code> itself; its methods are not virtual. Wrap the remote API in your own interface, and mock that interface in the tests of the code above it.</p>
<p>For AI features: never call the real language model in unit tests. Stub the client interface, and keep a small set of evaluation tests (fixed prompts with expected properties) that run on a schedule.</p>
<blockquote><b>Say it in the interview:</b> I stub at the HttpMessageHandler or with a local mock server, and I test the unhappy answers on purpose: 500, timeout, malformed body. Real third parties and language models are never called from unit tests.</blockquote>`,
  followUps: ['How do you test that your retry policy really retries?', 'What is the risk of stubs drifting from the real API?', 'How do you simulate a timeout?'] });

interview.push({ q: 'What is contract testing, and how do you detect breaking API changes?', level: 'A',
  a: `<p>Contract testing checks that an API still returns what its consumers rely on, so a backend change that would break the front end fails in the build instead of in production.</p>
<table><tr><th>Technique</th><th>How it works</th><th>Strength</th></tr>
<tr><td>Consumer-driven contracts (Pact)</td><td>each consumer records the requests it makes and the fields it needs; the provider's build replays them against the real API</td><td>precise: you know exactly which consumer breaks</td></tr>
<tr><td>Schema validation</td><td>integration tests check each response against the OpenAPI schema</td><td>catches drift between documentation and code</td></tr>
<tr><td>Breaking-change detection</td><td>CI compares the new OpenAPI document with the last released one (for example <code>oasdiff</code>) and fails on removed fields, changed types or new required inputs</td><td>cheap; needs no cooperation from consumers</td></tr></table>
<pre><code>// Vitest: does the response still match the published schema?
import Ajv from "ajv";
const validate = new Ajv().compile(schemas.OrderDto);
expect(validate(await res.json())).toBe(true);</code></pre>
<p>I start with the OpenAPI diff, because it is one pipeline step. I add Pact where teams deploy on their own schedules. Contract tests do not replace integration tests: they check the shape of messages, not whether the business logic is right.</p>
<blockquote><b>Say it in the interview:</b> I generate the OpenAPI document on every build and diff it against the released version, failing on breaking changes. Where independent teams consume the API, consumer-driven contracts with Pact tell us exactly whose expectations a change would break.</blockquote>`,
  followUps: ['Who owns a consumer-driven contract?', 'What is the difference between contract tests and end-to-end tests?', 'How do you handle an intended breaking change in this setup?'] });

interview.push({ q: 'How do you load test an API with k6, and what do you report?', level: 'A',
  a: `<p>A load test sends many requests at once to see how fast the API stays and when it starts to fail, and k6 lets you script that in JavaScript with pass or fail limits.</p>
<pre><code>import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  stages: [
    { duration: "1m", target: 50 },
    { duration: "3m", target: 200 },
    { duration: "1m", target: 0 },
  ],
  thresholds: {
    http_req_duration: ["p(95)&lt;500"],   // fail the run if p95 is 500 ms or more
    http_req_failed: ["rate&lt;0.01"],
  },
};

export default function () {
  const res = http.get(__ENV.BASE_URL + "/api/v1/orders",
    { headers: { Authorization: "Bearer " + __ENV.TOKEN } });
  check(res, { "status 200": (r) =&gt; r.status === 200 });
  sleep(1);
}</code></pre>
<p><b>What to report:</b></p>
<ul><li>Latency as percentiles: p50, p95, p99. Not the average, which hides the slow tail.</li>
<li>Throughput (requests per second) and error rate.</li>
<li>Saturation: which resource ran out first. CPU, memory, database capacity, connection pool, thread pool.</li></ul>
<p><b>What makes it believable:</b> production-like data volume, a realistic mix of endpoints and think time between calls. Run more than one shape: a normal load test, a <b>stress</b> test to find the breaking point, a <b>spike</b> test, and a long <b>soak</b> test to find leaks.</p>
<blockquote><b>Say it in the interview:</b> I script realistic user flows in k6 with thresholds on p95 latency and error rate, so the pipeline fails when we regress. I report percentiles, throughput, errors and the first resource to saturate, tested on production-like data.</blockquote>`,
  followUps: ['Why is the average response time misleading?', 'What is the difference between a stress test and a soak test?', 'The p99 is bad but the p50 is fine. Where do you look?'] });

interview.push({ q: 'How do you test authentication and authorization?', level: 'A',
  a: `<p>You test that every endpoint gives the right answer to four kinds of caller: nobody, the wrong role, the right role, and the right role asking for someone else's data.</p>
<ul><li><b>Unit tests</b> for policies, using a hand-built <code>ClaimsPrincipal</code>.</li>
<li><b>Integration tests</b> with a test authentication handler that produces known claims, asserting 200, 401 and 403 per endpoint.</li>
<li><b>Object-level tests:</b> user A requests user B's resource and must get 403 or 404.</li>
</ul>
<pre><code>public class TestAuthHandler(IOptionsMonitor&lt;AuthenticationSchemeOptions&gt; o, ILoggerFactory l, UrlEncoder e)
    : AuthenticationHandler&lt;AuthenticationSchemeOptions&gt;(o, l, e)
{
    protected override Task&lt;AuthenticateResult&gt; HandleAuthenticateAsync()
    {
        if (!Request.Headers.TryGetValue("X-Test-User", out var user))
            return Task.FromResult(AuthenticateResult.NoResult());        // leads to 401
        var role = Request.Headers["X-Test-Role"].FirstOrDefault() ?? "Reader";
        var id = new ClaimsIdentity(
            [new Claim(ClaimTypes.NameIdentifier, user.ToString()), new Claim(ClaimTypes.Role, role)], "Test");
        return Task.FromResult(AuthenticateResult.Success(new AuthenticationTicket(new ClaimsPrincipal(id), "Test")));
    }
}</code></pre>
<p>A useful extra: one test that lists every endpoint and fails if any lacks an authorization rule.</p>
<blockquote><b>Say it in the interview:</b> A test auth handler lets me call each endpoint as anonymous, wrong role and right role and assert 401, 403 and 200. Then I add the test that matters most: user A asking for user B's data must be refused.</blockquote>`,
  followUps: ['How do you make sure a new endpoint cannot ship without authorization?', 'Why return 404 instead of 403 for another user\'s resource?', 'How do you test token expiry?'] });

interview.push({ q: 'How do you handle test data, flaky tests and tests in CI?', level: 'A',
  a: `<p>A flaky test is one that passes and fails with no code change, and the cure is to make every test build its own data and stop depending on time, order, randomness or the network.</p>
<table><tr><th>Cause</th><th>Fix</th></tr>
<tr><td>Shared data between tests</td><td>each test creates what it needs with small builders, for example <code>new OrderBuilder().Paid().Build()</code>, not one giant fixture</td></tr>
<tr><td>Leftover database state</td><td>roll back a transaction per test, reset tables between tests, or use a fresh container per run</td></tr>
<tr><td>The real clock</td><td>inject <code>TimeProvider</code> (built into .NET since version 8) and set the time in the test</td></tr>
<tr><td>Random values, test order</td><td>fixed seeds; no test may rely on another having run first</td></tr>
<tr><td>Real network calls</td><td>stub outside services</td></tr>
<tr><td>Timing and sleeps</td><td>wait for a condition, never for a fixed delay</td></tr></table>
<p><b>Policy for flaky tests:</b> quarantine at once so the main pipeline stays trustworthy, assign an owner, fix or delete within days. Automatic retries hide real race conditions, so I do not use them as a cure.</p>
<p><b>Where tests run in CI:</b></p>
<ul><li>Every commit: unit tests.</li>
<li>Every pull request: integration and contract tests.</li>
<li>Scheduled or before release: load and security tests.</li>
<li>After deployment: smoke test.</li></ul>
<p>Publish test results and coverage as pipeline artifacts, and track pipeline duration and flake rate as team numbers.</p>
<blockquote><b>Say it in the interview:</b> Tests own their data, never depend on the clock or on each other, and stub the network. A flaky test is quarantined and fixed quickly, because once people re-run red builds out of habit the whole suite stops protecting us.</blockquote>`,
  followUps: ['How do you find out which tests are flaky?', 'How do you run integration tests in parallel against one database?', 'What is wrong with Thread.Sleep in a test?'] });

interview.push({ q: 'What do you check in a REST API code review as a tech lead?', level: 'E',
  a: `<p>I review an API change for the things users and operators will feel later: correctness of the contract, safety of the data, and behaviour under failure, not code style.</p>
<ol><li><b>HTTP contract:</b> right methods and status codes; one error format with a trace id.</li>
<li><b>Data at the edge:</b> DTOs in and out, no entities leaking; validation on every input; sort and filter fields from an allow-list.</li>
<li><b>Security:</b> authentication and authorization on every endpoint, including the object-level check that this caller owns this id.</li>
<li><b>Lists:</b> paging wherever a list can grow, with a capped page size.</li>
<li><b>Async and time:</b> async all the way down, cancellation tokens passed on, timeouts on outbound calls.</li>
<li><b>Writes:</b> idempotency for anything a client may retry; concurrency control for updates.</li>
<li><b>Observability:</b> structured logs with correlation ids; no secrets or personal data in logs.</li>
<li><b>Contract and tests:</b> OpenAPI updated, backward compatibility considered, tests for the happy path and for failures.</li></ol>
<p><b>How I run the review matters too.</b> Machines check formatting, analyzers and the OpenAPI diff. I mark comments as "must fix" or "suggestion" and explain the reason, and when the same remark shows up three times I turn it into a template or an analyzer.</p>
<blockquote><b>Say it in the interview:</b> My checklist is contract, edge data, authorization down to the object, paging, cancellation and timeouts, idempotent and concurrency-safe writes, safe logging, and tests for failures. Repeated comments become automation, so reviews stay about design.</blockquote>`,
  followUps: ['Which of these would block a merge, and which would not?', 'How do you review a 2,000-line pull request?', 'How do you get the team to apply this list without you?'] });

// ---------- INTERVIEW: 7. Rapid-fire ----------
interview.push({ q: 'Rapid fire: HTTP semantics', level: 'B',
  a: `<p>Short questions about what HTTP methods and codes mean; answer each in one sentence.</p>
<table><tr><th>Question</th><th>Short answer</th></tr>
<tr><td>Is GET allowed to change state?</td><td>No. GET must be safe, because browsers, caches and crawlers may repeat it at any time.</td></tr>
<tr><td>PUT or POST to create?</td><td>PUT when the client already knows the full URL (idempotent). POST to the collection when the server assigns the id.</td></tr>
<tr><td>What is the difference between 400 and 422?</td><td>400: the request is malformed. 422: it is well formed but the content breaks a rule. Pick one convention and keep it.</td></tr>
<tr><td>What is an idempotency key?</td><td>A unique value the client sends with an operation so that retries do not run it twice.</td></tr>
<tr><td>What is HATEOAS?</td><td>Responses include links that describe the next valid actions, so clients follow links instead of building URLs.</td></tr>
<tr><td>What does 204 mean?</td><td>Success with no response body, typical for DELETE.</td></tr></table>
<blockquote><b>Say it in the interview:</b> GET never changes state, PUT is for a known URL and POST lets the server choose the id, 400 is malformed and 422 is invalid content, and an idempotency key makes a retried POST safe.</blockquote>`,
  followUps: ['What breaks in practice if a GET deletes something?', 'Give a real example of a PUT that creates.', 'Have you ever used hypermedia links in an API?'] });

interview.push({ q: 'Rapid fire: API design choices', level: 'I',
  a: `<p>Short questions about choosing a style and keeping clients working; give the rule and one reason.</p>
<table><tr><th>Question</th><th>Short answer</th></tr>
<tr><td>REST versus RPC?</td><td>REST models resources behind a uniform interface. RPC models actions as named methods (gRPC, JSON-RPC, SOAP).</td></tr>
<tr><td>What makes an API stateless?</td><td>The server keeps no session between requests. Each call carries what is needed, and the token carries the identity.</td></tr>
<tr><td>How do you avoid breaking clients?</td><td>Additive changes only, versioning for real breaks, a deprecation policy with dates, and contract tests in CI.</td></tr>
<tr><td>gRPC or REST between internal services?</td><td>gRPC for low-latency or streaming internal calls. REST for public and browser clients.</td></tr>
<tr><td>How do you handle large file uploads?</td><td>Do not pass big files through the API. Hand the client a short-lived SAS URL to upload straight to blob storage, in chunks, with size limits and a virus scan before use.</td></tr>
<tr><td>Should an API return a bare JSON array at the top level?</td><td>Prefer an object such as <code>{ "items": [], "nextCursor": null }</code>, so you can add paging fields later without a breaking change.</td></tr></table>
<blockquote><b>Say it in the interview:</b> Resources for REST, methods for RPC. Stateless means no server session. I protect clients with additive changes and contract tests, use gRPC inside and REST outside, and send large uploads directly to blob storage.</blockquote>`,
  followUps: ['What is a SAS token and how long should it live?', 'When is an RPC-style endpoint the better design?', 'How do you resume an upload that failed at 80%?'] });

interview.push({ q: 'Rapid fire: security and infrastructure', level: 'I',
  a: `<p>Short questions about where security and shared concerns live; name the mechanism.</p>
<table><tr><th>Question</th><th>Short answer</th></tr>
<tr><td>Where do you put the access token?</td><td>In the <code>Authorization: Bearer</code> header. Never in the URL, because URLs end up in logs, browser history and referrer headers.</td></tr>
<tr><td>How do you secure service-to-service calls?</td><td>Managed identity or the OAuth client credentials flow for the token, plus mTLS or private networking inside the network.</td></tr>
<tr><td>What is an API gateway for?</td><td>One front door for routing, authentication, throttling, caching, policies and observability, for example Azure API Management.</td></tr>
<tr><td>API key or OAuth token?</td><td>An API key identifies a calling application and is long-lived. An OAuth token is short-lived and can carry a user and scopes. Use keys for simple metering, tokens for real authorization.</td></tr>
<tr><td>What does Retry-After tell a client?</td><td>How long to wait before trying again. It comes with 429 and 503, and with 202 as a polling hint.</td></tr>
<tr><td>Is HTTPS enough to secure an API?</td><td>No. It protects data in transit. You still need authentication, authorization, input validation and limits.</td></tr></table>
<blockquote><b>Say it in the interview:</b> Tokens go in the Authorization header, services authenticate with managed identities or client credentials, the gateway handles cross-cutting policy, and HTTPS only protects the wire, not the endpoint.</blockquote>`,
  followUps: ['What is a managed identity and why is it better than a client secret?', 'What should stay out of the gateway?', 'How do you rotate an API key without downtime?'] });

registerModule({
  id: 'tl04',
  title: 'API Questions: REST, SOAP, gRPC, GraphQL & Real-Time',
  intro: `<p>This module is the API part of a full-stack tech lead interview, question by question. An <b>API</b> is the agreed way one program asks another for data or work. You will cover REST and HTTP from the basics (methods, status codes, URLs) to production concerns (idempotency, paging, versioning, caching, rate limits), then the other styles you are expected to compare: SOAP and WCF, gRPC, GraphQL, and the real-time options such as WebSockets, SignalR, server-sent events and webhooks. It ends with API testing and a rapid-fire round.</p><p><b>How to use it:</b> read a question, say your answer out loud, then open the model answer. Every answer starts with one plain sentence and ends with a line you can say in the interview. Examples use ASP.NET Core on .NET 10.</p>`,
  goals: [
    'Explain REST, HTTP methods, status codes and idempotency in plain words, and get 401 versus 403 right every time',
    'Design a production-ready REST endpoint: paging, versioning, ETags, idempotency keys, the 202 pattern, Problem Details and rate limits',
    'Compare REST, SOAP, gRPC and GraphQL and pick one for a given caller and traffic pattern, naming the cost of the choice',
    'Choose between polling, server-sent events, WebSockets, SignalR, webhooks and queues, and explain how each scales',
    'Describe a layered API test strategy: unit, integration, contract, load and security tests, and where each runs in CI',
    'Answer rapid-fire API questions in one sentence each'
  ],
  prereqs: `<p>You should be comfortable reading C# and know what a web request is. The earlier module on .NET and ASP.NET Core questions (middleware, dependency injection, minimal APIs) helps, as does basic backend knowledge of HTTP and JSON. No earlier API design experience is needed: every term is defined when it first appears.</p>`,
  hours: 11,
  langExplain: `<p>Code samples are in C# with ASP.NET Core because this track prepares for a .NET tech lead interview. The ideas (HTTP semantics, idempotency, paging, protocols, test levels) are the same in every language.</p>`,
  topics: topics, practice: practice, quiz: quiz, interview: interview
}); })();
