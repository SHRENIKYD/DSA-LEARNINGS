(function () {
  var topics = [], practice = [], quiz = [], interview = [];

  /* ------------------------------------------------------------------
     Shared visualizer helpers
     ------------------------------------------------------------------ */
  function cp(o) { return JSON.parse(JSON.stringify(o)); }
  function own(o) { var r = {}; if (o) Object.keys(o).forEach(function (k) { r[k] = o[k]; }); return r; }
  function bx(id, label, x, y, w) {
    var n = { id: id, label: label === undefined ? id : label, x: x, y: y, shape: 'box' };
    if (w) n.w = w;
    return n;
  }
  // Animated flow: every step lights its edges amber and leaves a green trail behind.
  function story(cfg) {
    var trail = {};
    return cfg.steps.map(function (s) {
      if (s.reset) trail = {};
      var ehl = own(trail);
      (s.on || []).forEach(function (k) { ehl[k] = s.cls || 'cur'; });
      Object.keys(s.ehl || {}).forEach(function (k) { ehl[k] = s.ehl[k]; });
      var edges = cp(s.edges || cfg.edges).map(function (e) {
        var k = e[0] + '-' + e[1];
        if (s.labels && s.labels[k] !== undefined) e[2] = s.labels[k];
        return e;
      });
      var g = { type: 'graph', label: s.label || cfg.label, directed: true, height: s.height || cfg.height || 60,
        nodes: cp(s.nodes || cfg.nodes), edges: edges, hl: own(s.hl), ehl: ehl, tags: own(s.tags) };
      (s.on || []).forEach(function (k) { if (s.keep !== false) trail[k] = s.keep || 'ok'; });
      return { narr: s.narr, parts: [g].concat(s.extra || []) };
    });
  }
  function hesc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  // "GET /orders/42" -> { method, path }
  function parseCall(input, defMethod, defPath) {
    var s = String(input || '').trim();
    var m = s.match(/^([A-Za-z]+)\s+(\/\S*)$/);
    if (!s) return { method: defMethod, path: defPath };
    if (!m) throw new Error('Type a method and a path, for example: GET /orders/42');
    return { method: m[1].toUpperCase(), path: m[2].slice(0, 60) };
  }

  /* ================================================================
     TOPIC 1 — Client-server and what a backend does
     ================================================================ */
  topics.push({
    title: 'Client–Server & What a Backend Actually Does',
    analogy: `<p>Think of a <b>restaurant</b>. You (the <b>client</b>) sit at a table and read a menu. You never walk into the kitchen. You tell the <b>waiter</b> what you want, the waiter carries the order to the <b>kitchen</b> (the <b>backend</b>), the kitchen checks the <b>pantry</b> (the <b>database</b>), cooks the dish, and the waiter brings it back.</p>
<p>The menu and the table are the <b>frontend</b> — what you see. The kitchen, the pantry, the rules ("no refunds after 30 minutes") and the bill-keeping are the <b>backend</b> — the part you never see but that makes everything real.</p>`,
    explain: `<p>🟢 <b>Client–server</b> is the simplest idea in the web: one program <b>asks</b> (the client), another program <b>answers</b> (the server). They talk over the network using an agreed language — mostly <b>HTTP</b>. The client could be a browser, a phone app, another backend, a command-line tool like <code>curl</code>, or even an AI agent.</p>
<p><b>What does a backend actually do?</b> Five jobs, in the order they usually happen on every request:</p>
${H.table(['#', 'Job', 'Plain English', 'Example'], [
  ['1', '<b>Listen</b>', 'Wait for requests on a port (like a phone ringing)', 'Port 8080 / 443'],
  ['2', '<b>Check who you are</b>', 'Authentication (who?) and authorization (allowed?)', 'Is this token valid? Is this your order?'],
  ['3', '<b>Apply the rules</b>', 'Business logic — the real reason the company exists', 'Is the item in stock? Is the coupon still valid?'],
  ['4', '<b>Remember</b>', 'Read and write data in a database, cache or file store', 'INSERT the new order row'],
  ['5', '<b>Answer</b>', 'Build a response with a status code and a body', '201 Created + JSON of the order']
])}
<p>🔵 <b>Why not do all this inside the browser?</b> Three reasons: <b>trust</b> (the browser is in the user's hands — anyone can change its code, so prices and permissions must be checked on a machine <i>you</i> control), <b>shared data</b> (all users must see the same stock count, so the data lives in one central place), and <b>power</b> (heavy work such as payments, email and search shouldn't run on a cheap phone).</p>
<p>🔵 <b>The journey of one request</b> — when you type <code>shop.example.com/orders/42</code>:</p>
<ol>
<li>The browser asks <b>DNS</b> (the internet's phone book): "what is the IP address of shop.example.com?"</li>
<li>It opens a connection (TCP, then TLS for https) to that IP and sends an HTTP request.</li>
<li>A <b>web server</b> (like nginx) is the front door. It handles TLS, serves static files and passes dynamic requests onward.</li>
<li>The <b>app server</b> (your Spring Boot / Node.js code) runs your logic.</li>
<li>Your code asks the <b>database</b> for order 42.</li>
<li>The answer travels back the same way: DB → app → web server → browser.</li>
</ol>
<p>Use the visualizer below to watch each hop light up.</p>`,
    clues: [
      '"What happens when you type a URL in the browser?" → the full lifecycle: DNS → TCP/TLS → HTTP → web server → app server → DB → response',
      '"Why validate on the server if the frontend already validates?" → never trust the client; browsers are user-controlled',
      '"Frontend vs backend — who owns what?" → UI/UX on the client; rules, data, security and integrations on the server',
      '"Design a service that other teams / mobile apps will call" → you are the server; think API contract first',
      '"Where does this logic belong?" → anything that must be trusted, shared or secret goes on the server'
    ],
    code: [{ lang: 'http', title: 'The smallest possible client–server conversation', code: `GET /hello HTTP/1.1
Host: shop.example.com
Accept: text/plain

HTTP/1.1 200 OK
Content-Type: text/plain; charset=utf-8
Content-Length: 12

Hello, world` }],
    codeTitle: ['One request line, one response (raw text on the wire)'],
    viz: {
      title: 'Request lifecycle: Client → DNS → Web server → App server → DB → back',
      input: 'GET /orders/42',
      inputLabel: 'Request (METHOD /path)',
      gen: function (input) {
        var c = parseCall(input, 'GET', '/orders/42');
        var req = c.method + ' ' + c.path;
        var nodes = [bx('C', 'Client (browser)', 10, 30), bx('DNS', 'DNS', 30, 6), bx('W', 'Web server (nginx)', 38, 30), bx('A', 'App server (Spring Boot)', 66, 30), bx('D', 'Database', 91, 30)];
        var edges = [['C', 'DNS', ''], ['C', 'W', ''], ['W', 'A', ''], ['A', 'D', '']];
        var tl = function (extra) { return { type: 'table', label: 'What is happening', columns: ['Hop', 'Carries'], rows: extra }; };
        return story({ label: 'One request, five stops', height: 60, nodes: nodes, edges: edges, steps: [
          { narr: 'You send <b>' + hesc(req) + '</b> from a browser. Before anything else the client only knows a <i>name</i> (shop.example.com), not where the server lives.', hl: { C: 'cur' }, tags: { C: 'wants data' } },
          { narr: '<b>Step 1 – DNS.</b> The client asks "what IP is shop.example.com?" DNS answers <code>203.0.113.10</code>. This is just a phone-book lookup; the answer is cached so later requests skip this hop.', on: ['C-DNS'], labels: { 'C-DNS': 'name → IP' }, hl: { DNS: 'cur' }, tags: { DNS: '203.0.113.10' } },
          { narr: '<b>Step 2 – Connect.</b> The client opens a TCP connection to that IP and (for https) does a TLS handshake so nobody on the wire can read the traffic. Then it sends the HTTP request.', on: ['C-W'], labels: { 'C-DNS': 'name → IP', 'C-W': req }, hl: { W: 'cur' }, tags: { W: 'port 443 · TLS ends here' } },
          { narr: '<b>Step 3 – Web server.</b> nginx decrypts TLS, checks the path. Static files (images, CSS) it can answer itself. This is not a static file, so it <i>proxies</i> the request to the app server.', on: ['W-A'], labels: { 'C-DNS': 'name → IP', 'C-W': req, 'W-A': 'proxy_pass :8080' }, hl: { A: 'cur' }, tags: { W: 'forwards', A: 'your code runs' } },
          { narr: '<b>Step 4 – App server.</b> Your code runs: check the login token, validate input, apply business rules. To answer, it needs data, so it asks the database.', on: ['A-D'], labels: { 'C-DNS': 'name → IP', 'C-W': req, 'W-A': 'proxy_pass :8080', 'A-D': 'SELECT … WHERE id=42' }, hl: { D: 'cur' }, tags: { A: 'logic', D: 'stores the truth' } },
          { narr: '<b>Step 5 – Database answers.</b> It finds the row for order 42 and sends it back to the app server. The database does not know about HTTP — it only speaks SQL.', reset: true, on: ['A-D'], cls: 'sel', keep: 'sel', labels: { 'A-D': 'row: {id:42, total:499}' }, hl: { D: 'sel', A: 'cur' }, tags: { D: 'found it' } },
          { narr: '<b>Step 6 – App builds the response.</b> It turns the row into JSON and picks a status code: <b>200 OK</b>. (If the row were missing it would send <b>404</b>.)', on: ['W-A'], cls: 'sel', keep: 'sel', labels: { 'A-D': 'row: {id:42, total:499}', 'W-A': '200 + JSON' }, hl: { A: 'sel' }, tags: { A: 'JSON ready' } },
          { narr: '<b>Step 7 – Web server relays.</b> nginx adds a few headers (and may compress the body), then writes the response back down the same TCP connection.', on: ['C-W'], cls: 'sel', keep: 'sel', labels: { 'W-A': '200 + JSON', 'C-W': '200 OK' }, hl: { W: 'sel' }, tags: { W: 'relays reply' } },
          { narr: '<b>Done.</b> The browser receives <code>200 OK</code> and a JSON body, then the frontend code draws the order on screen. Total time is usually 20–200 ms — most of it network, not your code.', on: [], ehl: { 'C-W': 'ok', 'W-A': 'ok', 'A-D': 'ok', 'C-DNS': 'ok' }, hl: { C: 'ok' }, tags: { C: 'renders order' }, labels: { 'C-W': '200 OK', 'W-A': '200 + JSON', 'A-D': 'row' }, extra: [tl([['Client → DNS', 'name → IP (cached next time)'], ['Client → Web server', req + ' over TLS'], ['Web → App', 'same request, plain HTTP on private network'], ['App → DB', 'SQL query'], ['Back to client', '200 OK + JSON body']])] }
        ] });
      }
    },
    examples: [
      { title: 'Example 1 — Who does what in an "Add to cart" click', html: `<p>You tap <b>Add to cart</b> in a shopping app.</p>
${H.table(['Layer', 'What it does'], [['Frontend (client)', 'Animates the button, sends <code>POST /cart/items</code> with <code>{"productId": 17, "qty": 1}</code>'], ['Web server', 'Terminates TLS, forwards to an app instance'], ['Backend (app server)', 'Checks login, loads product 17, checks stock &gt; 0, calculates price'], ['Database', 'Inserts a row in <code>cart_items</code>'], ['Back to client', '<code>201 Created</code> + the updated cart; frontend updates the cart badge']])}
<p>Notice: the <b>price</b> is calculated on the server. If the frontend sent the price, a user could change it to ₹1 using browser dev tools.</p>` },
      { title: 'Example 2 — The same backend serves many clients', html: `<p>One <code>GET /orders/42</code> endpoint can serve a React website, an Android app, an iOS app, a partner's server and a nightly report script. They are all just <b>clients</b> that speak HTTP. This is why backends are built as <b>APIs</b> — a menu of operations that doesn't care what the client looks like.</p>
${H.table(['Client', 'Looks like', 'Speaks'], [['Browser', 'Website', 'HTTP + JSON'], ['Mobile app', 'Native screen', 'HTTP + JSON'], ['Partner system', 'Another backend', 'HTTP + JSON'], ['curl / test script', 'Terminal', 'HTTP']])}` },
      { title: 'Example 3 — Try it yourself with curl', html: `<p><code>curl</code> is a tiny client. The <code>-v</code> flag shows the raw conversation, so you can see the request and response text yourself. Replace the URL with any site or your own local server.</p>`, code: { lang: 'bash', code: `# -v prints the request (lines starting with >) and response (lines starting with <)
curl -v https://example.com/

# -i prints only the response headers + body
curl -i http://localhost:8080/hello` } }
    ],
    deepDive: `<p>🟣 <b>What really happens before the first byte.</b> A new connection costs round trips: DNS (0–1 RTT if cached), TCP handshake (1 RTT), TLS 1.3 handshake (1 RTT, or 0 with resumption). Add one RTT for the request itself. On a 100 ms mobile link that's 300+ ms before the user sees anything — which is why servers reuse connections (<b>keep-alive</b>, HTTP/2 multiplexing, HTTP/3 over QUIC) and why CDNs put servers near users.</p>
<p><b>Ports and sockets.</b> A server <i>binds</i> to an IP and port and calls <code>accept()</code> to receive connections. The OS keeps a queue of finished handshakes (the <i>backlog</i>). If your app is too slow to accept, the backlog fills and new clients see timeouts or "connection refused". Typical ports: 80 (http), 443 (https), 5432 (Postgres), 6379 (Redis), 3306 (MySQL).</p>
<p><b>Request-per-thread vs event loop.</b> Classic Java servers (Tomcat) give each request a thread from a pool (say 200). Node.js uses one thread with an event loop and non-blocking I/O. Both are valid; the choice decides how you think about slow database calls (a blocked thread vs a pending callback). Java 21 added <b>virtual threads</b> to get thread-per-request simplicity with event-loop scalability.</p>
<p><b>Layers of a real backend.</b> Production backends are rarely one box: CDN → load balancer → web server/reverse proxy → app servers (many copies) → cache (Redis) → database (primary + replicas) → async workers & queues. Module-by-module, this course builds up to all of them. For now: know the five jobs and the six hops.</p>
<p><b>Where latency hides.</b> Rule of thumb: same-datacenter hop ≈ 0.5 ms, cross-region ≈ 70–150 ms, DB query ≈ 1–10 ms if indexed, disk seek ≈ 0.1–10 ms. Most slow endpoints are slow because of <i>too many round trips</i> (the N+1 query problem, chatty microservice calls) rather than slow code.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI assistants can scaffold a "hello world" backend in seconds, and AI products (chatbots, agents) are themselves backends: a user's request goes to your server, which calls a model API, maybe a vector DB, and streams tokens back. Many AI features are simply a normal backend with a slow, expensive dependency.</p>
<p><b>Use AI as a partner:</b> ask <code>Explain what happens when I type a URL, but quiz me at each hop</code> or paste a failing <code>curl -v</code> output and ask <code>which hop failed and why?</code> — great for DNS / TLS / connection-refused puzzles.</p>
<p><b>Where AI goes wrong:</b> it happily generates code that trusts client-sent prices or user ids, or invents library versions and API names. It rarely reminds you about timeouts, limits and auth unless asked.</p>
<p><b>What you must still own:</b> the mental model of who is trusted, where state lives and which hop is slow. Never paste real API keys into a chat; read them from environment variables (<code>System.getenv("API_KEY")</code> / <code>process.env.API_KEY</code>) and keep them out of prompts and repos.</p>`,
    problems: [{
      title: 'Trace a Request Across Every Hop',
      level: 'Easy', tags: ['client-server', 'lifecycle', 'DNS'], companies: ['Amazon', 'Google'],
      statement: `<p>A user opens <code>https://shop.example.com/orders/42</code> in a browser for the very first time. List, in order, every system that touches the request and say <b>what each one does</b>. Then say which hops disappear when the user clicks the same link a minute later.</p>`,
      constraints: `Assume: one nginx web server, one app server running Spring Boot, one PostgreSQL database, HTTPS, and a browser with an empty cache.`,
      example: `<p>Expected answer shape: ${H.c('b', 'Browser')} → ${H.c('y', 'DNS')} → ${H.c('g', 'TCP+TLS')} → ${H.c('p', 'nginx')} → ${H.c('b', 'app server')} → ${H.c('r', 'DB')} → back. <br>On the second click the DNS answer, and usually the TCP/TLS connection, are reused — only HTTP request → app → DB → response remain (or even less if the response is cached).</p>`,
      brute: { why: `<p>A weak answer says "browser sends request to the server and gets a response". It skips DNS, TLS, the web-server/app-server split and the database, so it can't explain where a slow page or a failed connection comes from.</p>` },
      mcq: { q: 'The site loads, but only after a long pause on the very first visit; later visits are fast. Which hop most likely explains it?', options: ['DNS lookup plus new TCP/TLS connection (both get cached or reused later)', 'The database was rebuilt between visits', 'JSON is slower the first time', 'The status code changes to 304'], answer: 0, explain: 'First visits pay for DNS, TCP and TLS set-up. Later visits reuse the cached DNS answer and the open connection, so only the request itself remains.' },
      hints: [
        `<p>Hint 1: start from the name. The browser only knows <code>shop.example.com</code>; it needs an IP address before it can open any connection.</p>`,
        `<p>Hint 2: separate "getting connected" (DNS, TCP, TLS) from "asking the question" (HTTP request) from "answering it" (web server, app, DB).</p>`,
        `<p>Hint 3: for the second click, ask "what did the first click leave behind?" — cached DNS answer, open keep-alive connection, maybe a cached response.</p>`
      ],
      solution: {
        approach: `<p><b>First visit, in order:</b></p><ol><li><b>Browser</b> checks its own and the OS DNS cache, finds nothing.</li><li><b>DNS resolver</b> turns <code>shop.example.com</code> into an IP such as 203.0.113.10.</li><li><b>TCP handshake</b> (1 round trip) opens a connection to port 443.</li><li><b>TLS handshake</b> (1 round trip with TLS 1.3) agrees encryption keys and checks the server's certificate.</li><li>Browser sends <code>GET /orders/42 HTTP/1.1</code> with headers (Host, Accept, Cookie/Authorization).</li><li><b>nginx</b> (web server) ends TLS, applies rules, and proxies the request to the app server because it is not a static file.</li><li><b>Spring Boot app server</b> authenticates the caller, loads order 42 through the service and repository layers, and asks the DB.</li><li><b>PostgreSQL</b> runs the SELECT and returns the row.</li><li>The app serialises the row to JSON and returns <b>200 OK</b>; nginx relays it; the browser parses the JSON and renders.</li></ol><p><b>Second click:</b> DNS and often the TCP/TLS connection are already there (keep-alive / HTTP/2), so only steps 5–9 remain. If the response carries <code>Cache-Control</code> headers, the browser may skip even those.</p>`,
        complexity: `<p>No code here; the cost is round trips: first visit ≈ 3 network round trips before the answer (DNS + TCP + TLS) plus 1 for the request; repeat visits ≈ 1.</p>`,
        followUps: ['Where would a CDN sit in this picture?', 'What changes if there are 5 app servers instead of 1?']
      }
    }]
  });

  /* ================================================================
     TOPIC 2 — Anatomy of an HTTP request and response
     ================================================================ */
  topics.push({
    title: 'Anatomy of an HTTP Request & Response (Raw Text)',
    analogy: `<p>An HTTP message is like a <b>posted letter</b>. The <b>envelope line</b> says what you want and where ("Please GET me /orders/42"). The <b>sticky notes on the envelope</b> are headers (who it's from, what language you read, how long the letter is). Then comes a <b>blank line</b>, and under it the <b>letter itself</b> — the body. The reply uses the same shape: a status line ("200 OK"), sticky notes, a blank line, and the content.</p>`,
    explain: `<p>🟢 HTTP is a <b>plain-text conversation</b> (in HTTP/1.1 — HTTP/2 and 3 send the same ideas in binary, but you think about them the same way). Every request has up to <b>four parts</b>:</p>
${H.table(['Part', 'Example', 'What it tells the server'], [
  ['<b>Request line</b>', '<code>POST /orders?source=app HTTP/1.1</code>', 'Method (what to do) + target (which thing) + protocol version'],
  ['<b>Headers</b>', '<code>Host: shop.example.com</code><br><code>Content-Type: application/json</code>', 'Extra facts about the request: who, what format, how big, credentials'],
  ['<b>Blank line</b>', '(empty line)', 'The signal "headers are over, body starts now"'],
  ['<b>Body</b> (optional)', '<code>{"item":"book","qty":2}</code>', 'The data you are sending (usually JSON) — typical for POST, PUT, PATCH']
])}
<p>A response has the same shape but the first line is a <b>status line</b>: <code>HTTP/1.1 201 Created</code> — version, a 3-digit <b>status code</b>, and a short reason phrase.</p>
<p>🔵 <b>The target has parts too.</b> In <code>/orders/42?expand=items&amp;lang=en</code>:</p>
${H.table(['Piece', 'Value', 'Name', 'Typical use'], [
  ['<code>/orders/42</code>', 'path', 'Path (+ path variable <code>42</code>)', 'Identifies <i>which resource</i>'],
  ['<code>?</code>', 'separator', '—', 'Everything after is the query string'],
  ['<code>expand=items&amp;lang=en</code>', 'two pairs', 'Query parameters', 'Filters, sorting, paging, options']
])}
<p><b>Rule of thumb:</b> path says <i>which thing</i>, query says <i>how to show it</i>, headers say <i>about this request</i>, body carries <i>the data you create or change</i>.</p>
<p>🔵 <b>Headers you will meet every day:</b> <code>Host</code> (which site — one server can host many), <code>Content-Type</code> (what the body is), <code>Content-Length</code> (how many bytes), <code>Accept</code> (what the client wants back), <code>Authorization</code> (credentials), <code>User-Agent</code> (who is asking), <code>Cookie</code> / <code>Set-Cookie</code> (small state the server asked the client to remember).</p>
<p>Open the visualizer and step through a request one piece at a time.</p>`,
    clues: [
      '"Parse this raw HTTP request" → split on the first blank line; first line = method/target/version; then "Name: value" lines',
      '"Where do I put the data — URL or body?" → identity and filters in the URL; sensitive or large data in the body',
      '"How does the server know where the body ends?" → Content-Length (or chunked transfer encoding)',
      '"Header names are case-insensitive" → normalise to lower case before lookup',
      '"One server, many domains" → the Host header picks the virtual host'
    ],
    code: [
      {
        lang: 'java', title: 'Java: parse a raw HTTP/1.1 request by hand', code: `import java.util.*;

class RawHttpRequest {
    String method, target, version, path, body = "";
    Map<String, String> headers = new LinkedHashMap<>();   // keys lower-cased
    Map<String, String> query = new LinkedHashMap<>();

    static RawHttpRequest parse(String raw) {
        // Real HTTP uses CRLF line ends; be forgiving and accept plain \\n too.
        String text = raw.replace("\\r\\n", "\\n");
        int split = text.indexOf("\\n\\n");                       // blank line ends the headers
        String head = split < 0 ? text : text.substring(0, split);
        String rest = split < 0 ? "" : text.substring(split + 2);
        String[] lines = head.split("\\n");

        // 1) request line: METHOD SP TARGET SP VERSION
        String[] first = lines[0].trim().split(" ");
        if (first.length != 3) throw new IllegalArgumentException("400 Bad Request: bad request line");
        RawHttpRequest r = new RawHttpRequest();
        r.method = first[0];
        r.target = first[1];
        r.version = first[2];

        // 2) split target into path and query parameters
        int q = r.target.indexOf('?');
        r.path = q < 0 ? r.target : r.target.substring(0, q);
        if (q >= 0) {
            for (String pair : r.target.substring(q + 1).split("&")) {
                if (pair.isEmpty()) continue;
                int eq = pair.indexOf('=');
                r.query.put(eq < 0 ? pair : pair.substring(0, eq), eq < 0 ? "" : pair.substring(eq + 1));
            }
        }

        // 3) headers: "Name: value"
        for (int i = 1; i < lines.length; i++) {
            int c = lines[i].indexOf(':');
            if (c <= 0) throw new IllegalArgumentException("400 Bad Request: bad header '" + lines[i] + "'");
            r.headers.put(lines[i].substring(0, c).trim().toLowerCase(), lines[i].substring(c + 1).trim());
        }

        // 4) body: exactly Content-Length bytes (characters here, to keep the demo short)
        String len = r.headers.get("content-length");
        if (len != null) {
            int n = Integer.parseInt(len);
            r.body = rest.substring(0, Math.min(n, rest.length()));
        }
        return r;
    }

    public static void main(String[] args) {
        String raw = """
            POST /orders?source=app&gift=true HTTP/1.1
            Host: shop.example.com
            Content-Type: application/json
            Content-Length: 23

            {"item":"book","qty":2}""";
        RawHttpRequest r = parse(raw);
        System.out.println("method  = " + r.method);
        System.out.println("path    = " + r.path);
        System.out.println("query   = " + r.query);
        System.out.println("headers = " + r.headers);
        System.out.println("body    = " + r.body);
    }
}`
      },
      {
        lang: 'python', run: true, title: 'Python: the same parser (runnable)', code: `def parse_request(raw: str) -> dict:
    """Parse a raw HTTP/1.1 request into method, path, query, headers, body."""
    text = raw.replace("\\r\\n", "\\n")
    head, _, rest = text.partition("\\n\\n")          # first blank line splits head and body
    lines = head.split("\\n")

    parts = lines[0].strip().split(" ")
    if len(parts) != 3:
        raise ValueError("400 Bad Request: bad request line")
    method, target, version = parts

    path, _, qs = target.partition("?")
    query = {}
    for pair in filter(None, qs.split("&")):
        k, _, v = pair.partition("=")
        query[k] = v

    headers = {}
    for line in lines[1:]:
        name, sep, value = line.partition(":")
        if not sep or not name.strip():
            raise ValueError("400 Bad Request: bad header " + repr(line))
        headers[name.strip().lower()] = value.strip()

    length = int(headers.get("content-length", 0))
    body = rest[:length]
    return {"method": method, "path": path, "version": version,
            "query": query, "headers": headers, "body": body}


raw = (
    "POST /orders?source=app&gift=true HTTP/1.1\\n"
    "Host: shop.example.com\\n"
    "Content-Type: application/json\\n"
    "Content-Length: 23\\n"
    "\\n"
    '{"item":"book","qty":2}'
)
req = parse_request(raw)
for key, value in req.items():
    print(f"{key:8} = {value}")

# A broken request is rejected instead of crashing the server
try:
    parse_request("GET/orders\\n\\n")
except ValueError as err:
    print("rejected:", err)`
      },
      { lang: 'http', title: 'The response mirrors the request shape', code: `HTTP/1.1 201 Created
Content-Type: application/json
Location: /orders/9001
Content-Length: 54

{"id":9001,"item":"book","qty":2,"status":"CONFIRMED"}` }
    ],
    codeTitle: ['Parser in Java', 'Parser in Python (click Run)', 'A matching response'],
    viz: {
      title: 'Break a raw HTTP request into its parts',
      input: 'POST /orders?source=app',
      inputLabel: 'Request (METHOD /path?query)',
      gen: function (input) {
        var c = parseCall(input, 'POST', '/orders?source=app');
        var hasBody = ['POST', 'PUT', 'PATCH'].indexOf(c.method) >= 0;
        var body = hasBody ? '{"item":"book","qty":2}' : '';
        var lines = [c.method + ' ' + c.path + ' HTTP/1.1', 'Host: shop.example.com', 'Accept: application/json', 'Authorization: Bearer YOUR_TOKEN'];
        if (hasBody) { lines.push('Content-Type: application/json'); lines.push('Content-Length: ' + body.length); }
        lines.push('');
        if (hasBody) lines.push(body);
        var code = lines.join('\n');
        var hdrEnd = hasBody ? 6 : 4, blank = hdrEnd + 1;
        var q = c.path.indexOf('?'), pth = q < 0 ? c.path : c.path.slice(0, q), qs = q < 0 ? '' : c.path.slice(q + 1);
        function codePart(hl, label) { return { type: 'code', label: label || 'Raw request on the wire', lang: 'http', code: code, hl: hl }; }
        var frames = [];
        frames.push({ narr: 'This is what a client really sends: <b>plain text</b>, line by line. Let\'s take it apart. The line numbers refer to the text below.', parts: [codePart({})] });
        frames.push({ narr: '<b>Line 1 – the request line.</b> Three words separated by spaces: what to do, which thing, which protocol version.', parts: [codePart({ 1: 'cur' }),
          { type: 'table', label: 'Request line', columns: ['Piece', 'Value', 'Meaning'], rows: [['Method', c.method, 'The action'], ['Target', c.path, 'Which resource (+ options)'], ['Version', 'HTTP/1.1', 'Rules of the conversation']], hl: {} }] });
        frames.push({ narr: '<b>The method</b> is <code>' + hesc(c.method) + '</code>. ' + (hasBody ? 'This method usually carries a body — the data to create or change.' : 'This method normally has no body; everything needed is in the URL.'), parts: [codePart({ 1: 'cur' }),
          { type: 'table', label: 'Request line', columns: ['Piece', 'Value', 'Meaning'], rows: [['Method', c.method, 'The action'], ['Target', c.path, 'Which resource (+ options)'], ['Version', 'HTTP/1.1', 'Rules of the conversation']], hl: { 0: 'sel' } }] });
        frames.push({ narr: '<b>The target</b> splits into a path (<code>' + hesc(pth) + '</code> — which resource) and an optional query string (' + (qs ? '<code>' + hesc(qs) + '</code> — key=value options' : 'none here') + ').', parts: [codePart({ 1: 'cur' }),
          { type: 'map', label: 'Target split on "?"', entries: [['path', pth], ['query string', qs || '(none)']], hl: { path: 'sel', 'query string': 'win' } }] });
        var hl2 = {}; for (var i = 2; i <= hdrEnd; i++) hl2[i] = 'win';
        var ents = [['Host', 'shop.example.com'], ['Accept', 'application/json'], ['Authorization', 'Bearer YOUR_TOKEN']];
        if (hasBody) { ents.push(['Content-Type', 'application/json']); ents.push(['Content-Length', String(body.length)]); }
        frames.push({ narr: '<b>Lines 2–' + hdrEnd + ' – headers.</b> Each is <code>Name: value</code>. They are a key/value map about the request: which site, which format we want back, who we are' + (hasBody ? ', and what the body is and how big' : '') + '. Names are case-insensitive.', parts: [codePart(hl2), { type: 'map', label: 'Headers as a map', entries: ents, hl: {} }] });
        var h3 = {}; h3[blank] = 'cur';
        frames.push({ narr: '<b>Line ' + blank + ' – the blank line.</b> It looks like nothing, but it is the most important line: it tells the server "headers are finished". Forget it and the server keeps waiting for more headers.', parts: [codePart(h3)] });
        if (hasBody) {
          var h4 = {}; h4[blank + 1] = 'ok';
          frames.push({ narr: '<b>Line ' + (blank + 1) + ' – the body.</b> Exactly <b>' + body.length + '</b> bytes, as promised by <code>Content-Length</code>. Its format is given by <code>Content-Type</code>: JSON. The server uses these two headers to know how to read and decode it.', parts: [codePart(h4), { type: 'table', label: 'How the server reads the body', columns: ['Header', 'Value', 'Used for'], rows: [['Content-Length', String(body.length), 'Stop reading after this many bytes'], ['Content-Type', 'application/json', 'Choose the JSON decoder']], hl: { 0: 'sel', 1: 'sel' } }] });
        } else {
          frames.push({ narr: 'There is <b>no body</b> after the blank line, because <code>' + hesc(c.method) + '</code> asks for information rather than sending any. The request ends here.', parts: [codePart({})] });
        }
        var okStatus = c.method === 'POST' ? '201 Created' : c.method === 'DELETE' ? '204 No Content' : '200 OK';
        var rbody = c.method === 'DELETE' ? '' : '{"id":9001,"item":"book","qty":2}';
        var rl = ['HTTP/1.1 ' + okStatus];
        if (rbody) { rl.push('Content-Type: application/json'); rl.push('Content-Length: ' + rbody.length); }
        rl.push(''); if (rbody) rl.push(rbody);
        var rh = { 1: 'cur' };
        frames.push({ narr: '<b>The response</b> has the same shape: a <b>status line</b> (version, code, reason), headers, a blank line, and an optional body. Here the server answers <b>' + okStatus + '</b>.', parts: [{ type: 'code', label: 'Raw response', lang: 'http', code: rl.join('\n'), hl: rh },
          { type: 'table', label: 'Status line', columns: ['Piece', 'Value'], rows: [['Version', 'HTTP/1.1'], ['Status code', okStatus.split(' ')[0]], ['Reason phrase', okStatus.slice(4)]], hl: { 1: 'sel' } }] });
        return frames;
      }
    },
    examples: [
      { title: 'Example 1 — A GET with query parameters (no body)', html: `<p>Search for books under ₹500, sorted by price, page 2. Everything is in the URL, so there is no body and no <code>Content-Type</code>.</p>`, code: { lang: 'http', code: `GET /books?maxPrice=500&sort=price&page=2 HTTP/1.1
Host: shop.example.com
Accept: application/json
` } },
      { title: 'Example 2 — A POST with a JSON body', html: `<p>Create an order. The path names the <b>collection</b>; the body holds the <b>data</b>. <code>Content-Length</code> counts bytes of the body (here 48).</p>`, code: { lang: 'http', code: `POST /orders HTTP/1.1
Host: shop.example.com
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json
Content-Length: 48

{"customerId":7,"items":[{"sku":"B-1","qty":2}]}` } },
      { title: 'Example 3 — Reading headers like a detective', html: `<p>Given these request headers, what can you tell about the caller?</p>
${H.table(['Header', 'Value', 'What it reveals'], [['<code>Host</code>', 'api.example.com', 'Which service/virtual host is being called'], ['<code>User-Agent</code>', 'okhttp/4.12.0', 'An Android app (OkHttp library), not a browser'], ['<code>Accept-Language</code>', 'hi-IN,en;q=0.8', 'Prefers Hindi, falls back to English'], ['<code>Accept-Encoding</code>', 'gzip, br', 'Can read compressed responses — server should compress'], ['<code>X-Forwarded-For</code>', '198.51.100.7', 'Real client IP, added by a proxy in front of the app']])}
<p>Careful: any header can be faked by the client. Use them as hints, never as proof of identity.</p>` },
      { title: 'Example 4 — Common mistakes in raw messages', html: `<ul><li>Missing <b>blank line</b> before the body → server treats the body as a header and returns <b>400</b>.</li><li><code>Content-Length</code> smaller than the body → body is cut off; larger → server waits for bytes that never come (timeout).</li><li>Sending JSON without <code>Content-Type: application/json</code> → many frameworks answer <b>415 Unsupported Media Type</b>.</li><li>Putting a password in the query string → it ends up in logs, browser history and proxies. Use the body or an Authorization header.</li></ul>` }
    ],
    deepDive: `<p>🟣 <b>Framing is the hard part.</b> HTTP/1.1 runs on a byte stream (TCP), so the parser must know where one message ends and the next begins. Three ways: <code>Content-Length</code>, <code>Transfer-Encoding: chunked</code> (each chunk prefixed by its size, ended by a zero chunk), or closing the connection. When a front proxy and an app server <i>disagree</i> about which header wins, an attacker can smuggle a second hidden request — <b>HTTP request smuggling</b>. That is why real servers reject messages with both headers and why you should never hand-roll a production HTTP parser.</p>
<p><b>HTTP/2 and HTTP/3.</b> Same methods, status codes and headers, different wire format. HTTP/2 is binary, multiplexes many requests on one TCP connection and compresses headers (HPACK). HTTP/3 moves to QUIC over UDP so one lost packet doesn't stall every stream. Your Spring/Express code is mostly unaware of the difference.</p>
<p><b>Case, whitespace and encoding rules.</b> Header <i>names</i> are case-insensitive (<code>content-type</code> = <code>Content-Type</code>); <i>values</i> may not be. URLs allow only a safe set of characters, others are <b>percent-encoded</b> (<code>space → %20</code>, <code>é → %C3%A9</code>), and <code>+</code> in a query string conventionally means space. Always decode query parameters once — decoding twice opens injection bugs.</p>
<p><b>Limits matter.</b> Servers cap the request line (~8 KB), header block (~8–16 KB in nginx/Tomcat), body size (Spring's default multipart limit is 1 MB per file, nginx default <code>client_max_body_size</code> 1 MB) and idle time. A 413 or 431 status usually means you hit one of them.</p>
<p><b>Idempotency keys and tracing.</b> Real systems add headers like <code>Idempotency-Key</code> (safe retries of payments) and <code>traceparent</code> (W3C trace context for distributed tracing). Headers are the extension point of HTTP.</p>`,
    aiEra: `<p><b>What AI changes:</b> LLM APIs are just HTTP: a POST with a JSON body to a <code>/v1/...</code> endpoint, an <code>Authorization: Bearer ...</code> header and — for streaming — a response with <code>Content-Type: text/event-stream</code> that sends tokens as they are generated. Understanding raw HTTP lets you debug any SDK by looking at the wire.</p>
<p><b>Use AI as a partner:</b> paste a raw request and ask <code>what is wrong with this request and what status code will a typical server return?</code>; ask it to generate 10 malformed requests to test your parser's error handling.</p>
<p><b>Where AI goes wrong:</b> it often shows a perfect-looking request with a wrong <code>Content-Length</code>, puts secrets directly into example code, or mixes up which header controls what (<code>Accept</code> vs <code>Content-Type</code>). Run <code>curl -v</code> and look.</p>
<p><b>What you must still own:</b> reading real traffic (browser DevTools Network tab, <code>curl -v</code>), and never logging or pasting <code>Authorization</code> or <code>Cookie</code> values into chat tools — redact them first. Keep real keys in environment variables, e.g. <code>System.getenv("LLM_API_KEY")</code>.</p>`,
    problems: [{
      title: 'Parse a Raw HTTP Request',
      level: 'Easy', tags: ['http', 'parsing', 'headers'], companies: ['Cloudflare', 'Atlassian'],
      statement: `<p>You are given a raw HTTP/1.1 request as one string. Return the <b>method</b>, <b>path</b>, a map of <b>query parameters</b>, a map of <b>headers</b> (names lower-cased) and the <b>body</b>. If the request line does not have exactly three parts, report <code>400 Bad Request</code>.</p>`,
      constraints: `Request text is at most 8 KB. Lines end with \\n or \\r\\n. The body length is given by Content-Length (0 if absent).`,
      example: `${H.table(['Input (abridged)', 'Output'], [['<code>GET /search?q=java&amp;page=2 HTTP/1.1</code><br><code>Host: a.com</code><br><br>', 'method=<b>GET</b>, path=<b>/search</b>, query={q:java, page:2}, headers={host:a.com}, body=""']])}<p>${H.c('g', 'Why')}: line 1 splits into method/target/version; the target splits at <code>?</code>; header lines split at the first <code>:</code>.</p>`,
      brute: { why: `<p>Splitting the whole text on every space or colon breaks immediately: header values like <code>Host: a.com:8080</code> or JSON bodies contain colons and spaces. The first <b>blank line</b> is the only reliable boundary between head and body.</p>` },
      mcq: { q: 'Which split is correct for the header line "Host: a.com:8080"?', options: ['Split at the FIRST colon only', 'Split at every colon', 'Split at the last colon', 'Split on spaces'], answer: 0, explain: 'The name never contains a colon, but the value may (ports, times, URLs). Split once at the first colon.' },
      hints: [
        `<p>Hint 1: find the first blank line (<code>\\n\\n</code>). Everything before it is the "head", everything after is the body.</p>`,
        `<p>Hint 2: the first line of the head is the request line; the rest are headers. Split the target at the first <code>?</code> and then the query at <code>&amp;</code> and <code>=</code>.</p>`,
        `<p>Hint 3: normalise <code>\\r\\n</code> to <code>\\n</code> first, lower-case header names, cut the body to Content-Length, and reject a request line that does not have 3 parts.</p>`
      ],
      solution: {
        approach: `<p>Normalise line endings, then work in four small steps: (1) cut head from body at the first blank line, (2) split the first line into method, target and version (reject if not 3 parts), (3) split the target at <code>?</code> into path and query, then query into pairs, (4) turn each remaining head line into a header by splitting at the <b>first</b> colon and lower-casing the name. Finally read exactly Content-Length characters of the body. This is the same algorithm a real server uses, only with more error cases (duplicate headers, folded lines, huge sizes).</p>`,
        code: { lang: 'python', run: true, code: `def parse(raw):
    text = raw.replace("\\r\\n", "\\n")
    head, _, rest = text.partition("\\n\\n")
    lines = head.split("\\n")
    parts = lines[0].split(" ")
    if len(parts) != 3:
        return "400 Bad Request"
    method, target, _version = parts
    path, _, qs = target.partition("?")
    query = dict(p.partition("=")[::2] for p in qs.split("&") if p)
    headers = {}
    for ln in lines[1:]:
        k, _, v = ln.partition(":")
        headers[k.strip().lower()] = v.strip()
    n = int(headers.get("content-length", 0))
    return method, path, query, headers, rest[:n]

print(parse("GET /search?q=java&page=2 HTTP/1.1\\nHost: a.com:8080\\n\\n"))
print(parse("GET/search\\n\\n"))` },
        complexity: `<p>Time O(n) in the size of the request, space O(n). One pass over the text.</p>`,
        followUps: ['How would you handle duplicate headers such as Set-Cookie?', 'What if Content-Length is bigger than the data received?']
      }
    }]
  });

  /* ================================================================
     TOPIC 3 — HTTP methods
     ================================================================ */
  var METHOD_ROWS = [
    ['GET', 'Read a resource', 'yes', 'yes', 'no'],
    ['POST', 'Create / run an action', 'no', 'no', 'yes'],
    ['PUT', 'Replace a whole resource', 'no', 'yes', 'yes'],
    ['PATCH', 'Change part of a resource', 'no', 'depends', 'yes'],
    ['DELETE', 'Remove a resource', 'no', 'yes', 'rarely'],
    ['HEAD', 'Like GET but headers only', 'yes', 'yes', 'no'],
    ['OPTIONS', 'Ask what is allowed (CORS preflight)', 'yes', 'yes', 'no']
  ];
  topics.push({
    title: 'HTTP Methods: Picking the Right Verb (Safe & Idempotent)',
    analogy: `<p>Think of a <b>library desk</b>. <b>GET</b> = "may I read this book?" (nothing changes). <b>POST</b> = "please add a new book to the shelf" (every time you ask, one more copy appears). <b>PUT</b> = "replace the book at slot 7 with this one" (do it ten times — slot 7 still holds the same book). <b>PATCH</b> = "fix the typo on page 3". <b>DELETE</b> = "remove slot 7" (once it's gone, asking again changes nothing more).</p>
<p>The verb tells everyone — browsers, proxies, caches, retry logic — <b>how dangerous</b> your request is before they even read it.</p>`,
    explain: `<p>🟢 A <b>method</b> (also called a <b>verb</b>) is the first word of a request. It says <b>what you want to do</b> with the resource named in the path. Two vocabulary words make everything click:</p>
<ul>
<li><b>Safe</b> = it does not change anything on the server. Only reading. Browsers, crawlers and caches may call safe methods freely.</li>
<li><b>Idempotent</b> = doing it <b>once or ten times leaves the server in the same state</b>. This matters because networks fail: if you don't get an answer, can you just retry? For idempotent methods, yes.</li>
</ul>
${H.table(['Method', 'Meaning', 'Safe?', 'Idempotent?', 'Has body?'], METHOD_ROWS.map(function (r) { return ['<b>' + r[0] + '</b>', r[1], r[2] === 'yes' ? H.c('g', 'yes') : H.c('r', 'no'), r[3] === 'yes' ? H.c('g', 'yes') : r[3] === 'no' ? H.c('r', 'no') : H.c('y', r[3]), r[4]]; }))}
<p>🔵 <b>The four you use daily — a CRUD map</b> (CRUD = Create, Read, Update, Delete):</p>
${H.table(['I want to…', 'Request', 'Typical success status'], [
  ['<b>C</b>reate an order', '<code>POST /orders</code> + body', '<code>201 Created</code> + <code>Location</code> header'],
  ['<b>R</b>ead one order', '<code>GET /orders/42</code>', '<code>200 OK</code>'],
  ['<b>R</b>ead a list', '<code>GET /orders?status=PAID</code>', '<code>200 OK</code>'],
  ['<b>U</b>pdate (replace)', '<code>PUT /orders/42</code> + full body', '<code>200 OK</code> or <code>204 No Content</code>'],
  ['<b>U</b>pdate (part)', '<code>PATCH /orders/42</code> + changed fields', '<code>200 OK</code>'],
  ['<b>D</b>elete', '<code>DELETE /orders/42</code>', '<code>204 No Content</code>']
])}
<p>🔵 <b>POST vs PUT — the classic confusion.</b> With <b>POST</b> the <i>server</i> decides the new id (<code>POST /orders</code> → "your order is #9001"), so posting twice makes two orders. With <b>PUT</b> the <i>client</i> names the exact resource (<code>PUT /users/7</code>), so sending it twice just sets the same thing again. If a client might retry a POST (bad network, double-click), protect it with an <code>Idempotency-Key</code> header.</p>
<p>🔵 <b>One golden rule:</b> never change data with GET. A link-preview bot, a browser prefetch or a search crawler will happily "click" every GET link on a page — and delete everything if <code>GET /deleteAll</code> exists. Run the visualizer: it sends the same request twice and shows what happens to the data.</p>`,
    clues: [
      '"Safe to retry" / "client may resend" → idempotent methods (GET, PUT, DELETE); POST needs an idempotency key',
      '"Create a new resource and return its id" → POST to the collection, answer 201 + Location',
      '"Replace the whole object" → PUT; "change only the phone number" → PATCH',
      '"Which method should this endpoint use?" → ask: does it change data? is repeating it harmful?',
      '"Crawler / prefetch / cache" must never trigger changes → only safe methods (GET, HEAD) may be cached or prefetched',
      '"Browser sends an OPTIONS request first" → CORS preflight for cross-origin non-simple requests'
    ],
    code: [
      { lang: 'js', run: true, title: 'Runnable: send each method twice and watch the data', code: `// A tiny in-memory "server" so you can SEE safe / idempotent behaviour.
const orders = new Map();      // id -> order
let nextId = 1;

function handle(method, path, body) {
  const id = Number(path.split('/')[2]);
  switch (method) {
    case 'POST':   { const o = { id: nextId++, ...body }; orders.set(o.id, o); return [201, o]; }
    case 'GET':    return orders.has(id) ? [200, orders.get(id)] : [404, { error: 'not found' }];
    case 'PUT':    orders.set(id, { id, ...body }); return [200, orders.get(id)];                 // replace
    case 'PATCH':  if (!orders.has(id)) return [404, { error: 'not found' }];
                   orders.set(id, { ...orders.get(id), ...body }); return [200, orders.get(id)]; // merge
    case 'DELETE': return orders.delete(id) ? [204, null] : [404, { error: 'not found' }];
    default:       return [405, { error: 'method not allowed' }];
  }
}

function twice(method, path, body) {
  const a = handle(method, path, body);
  const b = handle(method, path, body);
  console.log(method.padEnd(6), path.padEnd(10), '1st ->', a[0], '| 2nd ->', b[0], '| orders in store:', orders.size);
}

twice('POST', '/orders', { item: 'book' });       // 2 orders created  (NOT idempotent)
twice('PUT', '/orders/1', { item: 'pen' });       // same state twice  (idempotent)
twice('GET', '/orders/1');                        // no change         (safe)
twice('PATCH', '/orders/1', { qty: 3 });          // same state twice  (idempotent here)
twice('DELETE', '/orders/1');                     // 204 then 404; state same after 1st (idempotent)
console.log([...orders.values()]);` },
      { lang: 'java', check: false, title: 'Spring Boot: one method per verb', code: `@RestController
@RequestMapping("/orders")
class OrderController {
    private final OrderService service;
    OrderController(OrderService service) { this.service = service; }

    @PostMapping                                   // create -> 201 + Location
    ResponseEntity<Order> create(@RequestBody @Valid NewOrder body) {
        Order saved = service.create(body);
        return ResponseEntity.created(URI.create("/orders/" + saved.id())).body(saved);
    }

    @GetMapping("/{id}")                           // read -> 200 or 404
    Order get(@PathVariable long id) { return service.get(id); }

    @PutMapping("/{id}")                           // replace whole resource
    Order replace(@PathVariable long id, @RequestBody @Valid NewOrder body) { return service.replace(id, body); }

    @PatchMapping("/{id}")                         // change some fields
    Order patch(@PathVariable long id, @RequestBody Map<String, Object> changes) { return service.patch(id, changes); }

    @DeleteMapping("/{id}")                        // delete -> 204
    ResponseEntity<Void> delete(@PathVariable long id) { service.delete(id); return ResponseEntity.noContent().build(); }
}` }
    ],
    codeTitle: ['Send each method twice (click Run)', 'The same verbs in Spring Boot (framework code)'],
    viz: [{
      title: 'Method cheat-sheet: what each verb promises',
      gen: function () {
        var rows = METHOD_ROWS.map(function (r) { return r.slice(); });
        var f = [];
        f.push({ narr: 'Seven methods cover almost everything. Two questions sort them: <b>safe?</b> (no change at all) and <b>idempotent?</b> (same result if repeated).', parts: [{ type: 'table', label: 'HTTP methods', columns: ['Method', 'Meaning', 'Safe', 'Idempotent', 'Body'], rows: rows, hl: {} }] });
        var why = [
          '<b>GET</b> only reads. Caches, browsers and crawlers may call it any time, so it must never change data.',
          '<b>POST</b> creates or triggers an action. Repeat it and you get <i>another</i> order, <i>another</i> email, <i>another</i> payment. Not safe, not idempotent.',
          '<b>PUT</b> replaces the whole resource at a known address. Doing it twice writes the same thing twice — same final state. Idempotent.',
          '<b>PATCH</b> changes only some fields. <code>{"qty": 3}</code> is idempotent; <code>{"qtyPlus": 1}</code> is not. So it is idempotent <i>only if you design it that way</i>.',
          '<b>DELETE</b> removes it. The second call finds nothing (404), but the server state is the same as after the first — idempotent.',
          '<b>HEAD</b> = GET without the body. Used to check size or existence cheaply.',
          '<b>OPTIONS</b> asks "what may I do here?". Browsers send it automatically before certain cross-origin calls (CORS preflight).'
        ];
        why.forEach(function (w, i) { f.push({ narr: w, parts: [{ type: 'table', label: 'HTTP methods', columns: ['Method', 'Meaning', 'Safe', 'Idempotent', 'Body'], rows: rows, hl: (function () { var o = {}; o[i] = 'sel'; return o; })() }] }); });
        return f;
      }
    }, {
      title: 'Send the same request twice: what happens to the data?',
      input: 'POST',
      inputLabel: 'Method (GET, POST, PUT, PATCH or DELETE)',
      gen: function (input) {
        var m = String(input || 'POST').trim().toUpperCase();
        if (['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].indexOf(m) < 0) throw new Error('Type one of: GET, POST, PUT, PATCH, DELETE');
        var db = [['1', '{item: book, qty: 1}']];
        function dbPart(ent, hl) { return { type: 'map', label: 'orders table on the server', entries: ent.map(function (e) { return e.slice(); }), hl: hl || {} }; }
        var path = m === 'POST' ? '/orders' : '/orders/1', send = m + ' ' + path;
        var s1 = db.map(function (e) { return e.slice(); }), s2, r1, r2, verdict;
        if (m === 'GET') { r1 = '200 OK'; r2 = '200 OK'; s2 = s1; verdict = 'Nothing changed either time: <b>safe</b> and idempotent.'; }
        if (m === 'POST') { s1.push(['2', '{item: pen, qty: 1}']); s2 = s1.concat([['3', '{item: pen, qty: 1}']]); r1 = '201 Created (id 2)'; r2 = '201 Created (id 3)'; verdict = 'The second call created <b>another</b> order. <span class="c-r">Not idempotent</span> — a retry after a timeout means a duplicate (double charge!). Fix: Idempotency-Key.'; }
        if (m === 'PUT') { s1 = [['1', '{item: pen, qty: 2}']]; s2 = s1; r1 = '200 OK'; r2 = '200 OK'; verdict = 'After the 1st call the order is {pen, 2}. The 2nd call writes the same thing: state identical. <span class="c-g">Idempotent</span> — safe to retry.'; }
        if (m === 'PATCH') { s1 = [['1', '{item: book, qty: 5}']]; s2 = s1; r1 = '200 OK'; r2 = '200 OK'; verdict = 'Body was <code>{"qty":5}</code> ("set qty to 5"), so repeating changes nothing. <span class="c-y">Idempotent only because it sets a value</span> — an "add 1" patch would not be.'; }
        if (m === 'DELETE') { s1 = []; s2 = []; r1 = '204 No Content'; r2 = '404 Not Found'; verdict = 'Responses differ (204 then 404) but the <b>state</b> is the same: order gone. <span class="c-g">Idempotent</span> refers to server state, not to the response text.'; }
        var f = [];
        f.push({ narr: 'Start state: the server has one order. We will send <b>' + send + '</b> and then send the exact same request again, as a client would after a timeout.', parts: [dbPart(db, {}), { type: 'text', html: 'About to send: <code>' + send + '</code>' }] });
        f.push({ narr: '<b>First request</b> arrives. The server answers <b>' + r1 + '</b>.', parts: [dbPart(s1, m === 'POST' ? { '2': 'ok' } : (m === 'DELETE' ? {} : { '1': 'ok' })), { type: 'table', label: 'Responses so far', columns: ['#', 'Request', 'Response'], rows: [['1', send, r1]], hl: { 0: 'cur' } }] });
        f.push({ narr: 'The client never saw that answer (the network dropped it), so it <b>retries</b> with exactly the same request.', parts: [dbPart(s1, {}), { type: 'text', html: 'Retrying <code>' + send + '</code> ...' }] });
        f.push({ narr: '<b>Second request</b> arrives. The server answers <b>' + r2 + '</b>.', parts: [dbPart(s2, m === 'POST' ? { '3': 'bad' } : {}), { type: 'table', label: 'Responses so far', columns: ['#', 'Request', 'Response'], rows: [['1', send, r1], ['2', send, r2]], hl: { 1: m === 'POST' ? 'bad' : 'ok' } }] });
        f.push({ narr: verdict, parts: [dbPart(s2, m === 'POST' ? { '2': 'bad', '3': 'bad' } : {}), { type: 'text', html: verdict }] });
        return f;
      }
    }],
    examples: [
      { title: 'Example 1 — Pick the method (everyday scenarios)', html: `${H.table(['Scenario', 'Method + path', 'Why'], [
        ['Show the user profile', '<code>GET /users/7</code>', 'Read-only, cacheable'],
        ['Sign up a new user', '<code>POST /users</code>', 'Server assigns the id; not idempotent'],
        ['Save the whole settings page', '<code>PUT /users/7/settings</code>', 'Replace, safe to retry'],
        ['Change only my phone number', '<code>PATCH /users/7</code> <code>{"phone":"…"}</code>', 'Partial update'],
        ['Delete my account', '<code>DELETE /users/7</code>', 'Idempotent removal'],
        ['"Send password-reset email"', '<code>POST /users/7/password-reset</code>', 'An action, not a resource; each call sends mail'],
        ['Check if a username is taken', '<code>HEAD /users/alice</code> or <code>GET /users?name=alice</code>', 'Read-only existence check']
      ])}` },
      { title: 'Example 2 — Why GET must never change data', html: `<p>A teammate writes <code>GET /orders/42/cancel</code> because "it's easier to test in the browser". Then an email client pre-fetches links to show previews and a search crawler follows every link. Overnight, hundreds of orders are cancelled by <i>robots</i>. The fix is simple: <code>POST /orders/42/cancel</code> (or <code>DELETE</code>/<code>PATCH</code> status). Safe methods must stay safe because the <b>whole web assumes it</b>.</p>` },
      { title: 'Example 3 — Making POST retry-safe with an Idempotency-Key', html: `<p>A payment POST times out. Did it go through? With an idempotency key the client sends the <i>same key</i> on every retry; the server stores "key → first result" and returns that result again instead of charging twice.</p>`, code: { lang: 'http', code: `POST /payments HTTP/1.1
Host: pay.example.com
Content-Type: application/json
Idempotency-Key: 7f3c2c1e-5d0b-4d0e-9d57-1b1f0a6c9a11

{"orderId": 42, "amount": 49900, "currency": "INR"}` } },
      { title: 'Example 4 — OPTIONS and CORS preflight', html: `<p>When a web page on <code>app.example.com</code> calls an API on <code>api.example.com</code> with a JSON body, the browser first asks permission with an automatic <code>OPTIONS</code> request. The server must answer with headers saying which origins and methods are allowed, otherwise the real request is never sent. You will meet this in your first React + API project.</p>`, code: { lang: 'http', code: `OPTIONS /orders HTTP/1.1
Host: api.example.com
Origin: https://app.example.com
Access-Control-Request-Method: POST
Access-Control-Request-Headers: content-type

HTTP/1.1 204 No Content
Access-Control-Allow-Origin: https://app.example.com
Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE
Access-Control-Allow-Headers: content-type, authorization
Access-Control-Max-Age: 600` } }
    ],
    deepDive: `<p>🟣 <b>What the spec actually says.</b> RFC 9110 defines <i>safe</i> as "read-only semantics" and <i>idempotent</i> as "the intended effect on the server of several identical requests is the same as for a single one". Notice <b>intended effect</b>: logging, metrics and a changed <code>updatedAt</code> don't count. DELETE is idempotent even though the first returns 204 and the next 404.</p>
<p><b>PUT vs PATCH in depth.</b> PUT must send the <i>entire</i> representation; missing fields are meant to be reset. Many APIs treat missing fields as "unchanged", which silently turns PUT into PATCH and confuses clients. For PATCH there are two standard formats: <b>JSON Merge Patch</b> (<code>application/merge-patch+json</code>, send just the changed fields; <code>null</code> removes a field) and <b>JSON Patch</b> (<code>application/json-patch+json</code>, a list of operations like <code>{"op":"replace","path":"/qty","value":5}</code>). Merge patch can't set a field to null deliberately and can't edit single array items; JSON Patch can.</p>
<p><b>Concurrency: lost updates.</b> Two users PUT the same resource; the last write silently wins. Fix with optimistic concurrency: return an <code>ETag</code> on GET, require <code>If-Match: "etag"</code> on PUT/PATCH, and answer <b>412 Precondition Failed</b> on mismatch (or <b>428</b> if the header is missing).</p>
<p><b>Retries and who may do them.</b> HTTP clients, proxies and load balancers may automatically retry idempotent requests on connection errors; they will <i>not</i> retry POST by default. That's why "make your POST idempotent with a key" is a core payments-API pattern (Stripe, Razorpay and others use it). Store keys with a TTL (24 h is common) and the original response.</p>
<p><b>Method override and real-world limits.</b> Old firewalls and HTML forms only know GET and POST, leading to hacks like <code>X-HTTP-Method-Override</code>. Browsers' HTML forms still can't send PUT/DELETE. Also, GET <i>can</i> technically have a body, but most servers and caches ignore or reject it — if you need a complex search, use <code>POST /search</code> (or the newer <code>QUERY</code> method that is being standardised).</p>`,
    aiEra: `<p><b>What AI changes:</b> AI agents call APIs for you ("book a flight", "create a ticket"). An agent may <b>retry</b> automatically when a call times out — so non-idempotent endpoints without keys can create duplicates at machine speed. Tool/function definitions given to models increasingly describe whether a tool is read-only vs has side effects, mirroring safe vs unsafe methods.</p>
<p><b>Use AI as a partner:</b> describe your endpoints and ask <code>for each one, is it safe? idempotent? what breaks if a client retries it?</code> — a quick design review. Or ask it to generate a table of 20 scenarios and quiz yourself on the method choice.</p>
<p><b>Where AI goes wrong:</b> it often picks POST for everything, uses GET with side effects ("/api/deleteUser?id=3"), or marks PATCH as always idempotent. It also forgets the Location header and 201 on create.</p>
<p><b>What you must still own:</b> the contract semantics: which operations are safe to retry, what each method returns on success and failure, and idempotency keys on anything involving money or messages. Review every AI-generated endpoint for these before merging.</p>`,
    problems: [{
      title: 'Pick the Right Method and Path',
      level: 'Easy', tags: ['http methods', 'rest', 'idempotency'], companies: ['Flipkart', 'Stripe'],
      statement: `<p>For each action pick the HTTP method <b>and</b> a sensible path, and say whether a client can safely retry it automatically: (a) list a customer's orders, (b) place a new order, (c) replace a customer's shipping address, (d) change only an order's status to SHIPPED, (e) cancel and remove a draft order, (f) trigger a "resend invoice email".</p>`,
      constraints: `Use REST-style nouns in paths. Justify each answer with "safe?" and "idempotent?".`,
      example: `${H.table(['Action', 'Answer'], [['(a)', '<code>GET /customers/7/orders</code> — safe, retry freely']])}<p>${H.c('g', 'Why')}: reading changes nothing, so any number of repeats is harmless.</p>`,
      brute: { why: `<p>The weak answer uses POST for everything (<code>POST /api/doAction</code>). That throws away what the verbs tell caches, proxies and retry logic, and makes every endpoint look dangerous to retry.</p>` },
      mcq: { q: 'Which of these is safe to retry automatically after a timeout, with no extra protection?', options: ['PUT /customers/7/address', 'POST /orders', 'POST /invoices/9/send-email', 'PATCH /orders/5 {"total": {"add": 10}}'], answer: 0, explain: 'PUT replaces the same resource with the same value, so a repeat gives the same state. POST creates/sends again and an "add 10" patch compounds.' },
      hints: [
        `<p>Hint 1: first decide if the action reads or writes. Reads → GET. Writes → one of the other four.</p>`,
        `<p>Hint 2: does the server choose the new id (POST to a collection) or does the client name the exact resource (PUT/PATCH/DELETE on <code>/thing/{id}</code>)?</p>`,
        `<p>Hint 3: for retry safety ask "if this runs twice, is the final state identical?" Actions like send-email are POST on an action path and need an idempotency key.</p>`
      ],
      solution: {
        approach: `<ul><li><b>(a)</b> <code>GET /customers/7/orders</code> — safe and idempotent; retry freely, cacheable.</li><li><b>(b)</b> <code>POST /orders</code> — server creates the id, answer 201 + Location. Not idempotent: protect with an <code>Idempotency-Key</code> header before retrying.</li><li><b>(c)</b> <code>PUT /customers/7/address</code> — replaces the whole address; same body twice gives same state, so retry is safe.</li><li><b>(d)</b> <code>PATCH /orders/5</code> with <code>{"status":"SHIPPED"}</code> — partial change that <i>sets</i> a value, so it is idempotent as designed.</li><li><b>(e)</b> <code>DELETE /orders/5</code> — idempotent (204, then 404 on repeat), safe to retry; also check the order is still a draft, otherwise answer 409.</li><li><b>(f)</b> <code>POST /invoices/9/emails</code> (an action modelled as creating an "email" resource) — each call sends mail, so not idempotent; use a key or dedupe on the server.</li></ul>`,
        complexity: `<p>Not applicable — a design exercise. The key skill is classifying each action by safe vs idempotent, which decides caching and retry behaviour.</p>`,
        followUps: ['How would you make (b) retry-safe on the server?', 'What status code would (d) return if the order is already SHIPPED?']
      }
    }]
  });

  /* ================================================================
     TOPIC 4 — Status codes and headers
     ================================================================ */
  var FAMILIES = [
    ['1xx', 'Informational', '"Hold on, I got it, keep going"', 'Nobody', '100 Continue, 101 Switching Protocols'],
    ['2xx', 'Success', '"Done, here is your result"', 'Nobody', '200 OK, 201 Created, 204 No Content'],
    ['3xx', 'Redirection', '"Look somewhere else / use your cached copy"', 'Nobody', '301, 302, 304 Not Modified'],
    ['4xx', 'Client error', '"Your request is wrong — fix it and try again"', 'The caller', '400, 401, 403, 404, 409, 429'],
    ['5xx', 'Server error', '"My fault, the request was fine"', 'The server', '500, 502, 503, 504']
  ];
  var CODES = {
    200: ['OK', '2xx', 'The request worked and the body has the result.', 'GET success, PUT/PATCH that returns the updated thing.', 'n/a'],
    201: ['Created', '2xx', 'A new resource was created. Send a Location header pointing to it.', 'Successful POST /orders.', 'n/a'],
    202: ['Accepted', '2xx', 'Got it, but the work happens later (async). Not finished yet.', 'POST /reports that starts a background job.', 'Poll the status URL'],
    204: ['No Content', '2xx', 'Success and there is intentionally no body.', 'Successful DELETE, or PUT that returns nothing.', 'n/a'],
    301: ['Moved Permanently', '3xx', 'This URL has a new permanent home. Caches remember it.', 'http → https, old URL → new URL.', 'Follow Location'],
    302: ['Found', '3xx', 'Temporary redirect; keep using the old URL next time.', 'After login, go to the dashboard.', 'Follow Location'],
    304: ['Not Modified', '3xx', 'Your cached copy is still good; no body is sent.', 'Reply to a conditional GET with If-None-Match.', 'Use cache'],
    400: ['Bad Request', '4xx', 'The request is malformed or fails basic checks.', 'Broken JSON, missing required field, bad number.', 'Do NOT retry unchanged'],
    401: ['Unauthorized', '4xx', 'You are not authenticated: no or invalid credentials. (The name is misleading — it means "unauthenticated".)', 'Missing/expired token.', 'Log in again, then retry'],
    403: ['Forbidden', '4xx', 'I know who you are, and you are not allowed to do this.', 'A normal user calls an admin endpoint.', 'Do NOT retry'],
    404: ['Not Found', '4xx', 'No resource at this address (or hidden on purpose).', 'GET /orders/99999.', 'Do NOT retry'],
    405: ['Method Not Allowed', '4xx', 'The path exists but not for this method. Include an Allow header.', 'DELETE /reports (read-only).', 'Use another method'],
    409: ['Conflict', '4xx', 'The request clashes with the current state.', 'Username already taken; stale version; cancel a shipped order.', 'Resolve conflict, then retry'],
    415: ['Unsupported Media Type', '4xx', 'The body format is not supported (check Content-Type).', 'Sending XML to a JSON-only endpoint.', 'Fix Content-Type'],
    422: ['Unprocessable Content', '4xx', 'Syntax is fine but the values are invalid by business rules.', 'qty = -3, email without @.', 'Fix the data'],
    429: ['Too Many Requests', '4xx', 'Rate limit hit. Look at Retry-After.', 'More than 100 calls per minute.', 'Wait, then retry with backoff'],
    500: ['Internal Server Error', '5xx', 'Unexpected bug or failure inside the server.', 'NullPointerException that nobody handled.', 'Maybe retry later; report it'],
    502: ['Bad Gateway', '5xx', 'A proxy got an invalid answer from the app behind it.', 'nginx cannot talk properly to a crashed app.', 'Retry with backoff'],
    503: ['Service Unavailable', '5xx', 'Temporarily overloaded or down for maintenance.', 'Deploy in progress; queue full.', 'Retry after Retry-After'],
    504: ['Gateway Timeout', '5xx', 'A proxy waited too long for the app behind it.', 'Slow DB query makes nginx give up after 60 s.', 'Retry with backoff']
  };
  topics.push({
    title: 'Status Codes & Headers: The Server\'s Answer Explained',
    analogy: `<p>A status code is like a <b>traffic light plus a short note</b>. Green family (2xx) — go ahead, it worked. Blue arrow (3xx) — go this other way. Yellow, your mistake (4xx) — the form you filled in was wrong, fix it. Red, <i>our</i> mistake (5xx) — the machine broke, not you.</p>
<p>Headers are the <b>labels on the parcel</b>: contents type, weight, fragile, "handle until Friday", return address. The body is the parcel; the labels tell every post office on the way how to treat it.</p>`,
    explain: `<p>🟢 Every response starts with a <b>3-digit status code</b>. You don't need to memorise 60 codes — learn the <b>first digit</b>, then about 15 common codes.</p>
${H.table(['Family', 'Name', 'Meaning', 'Whose fault?', 'Common ones'], FAMILIES.map(function (r) { return ['<b>' + r[0] + '</b>', r[1], r[2], r[3], r[4]]; }))}
<p>🔵 <b>The three confusing pairs</b> (interviewers love these):</p>
${H.table(['Pair', 'Difference in one line'], [
  ['<b>401 vs 403</b>', '401 = "I don\'t know who you are" (log in). 403 = "I know who you are — and the answer is no".'],
  ['<b>400 vs 422</b>', '400 = the request is broken (bad JSON). 422 = the JSON is fine but the values break the rules (qty = -3). Many teams just use 400 for both — pick one and be consistent.'],
  ['<b>502 vs 503 vs 504</b>', '502 = proxy got garbage from the app. 503 = app says "I\'m overloaded/down". 504 = proxy gave up waiting.']
])}
<p>🔵 <b>Headers that matter on the response:</b></p>
${H.table(['Header', 'What it does', 'Example'], [
  ['<code>Content-Type</code>', 'Format of the body', '<code>application/json; charset=utf-8</code>'],
  ['<code>Location</code>', 'Where the new resource lives (201) or where to redirect (3xx)', '<code>/orders/9001</code>'],
  ['<code>Cache-Control</code>', 'How long anyone may reuse this response', '<code>max-age=60</code>, <code>no-store</code>'],
  ['<code>ETag</code>', 'A fingerprint of the content, for cheap "has it changed?" checks', '<code>"v7-a3f9"</code>'],
  ['<code>Set-Cookie</code>', 'Ask the client to remember a small value', '<code>sid=abc; HttpOnly; Secure; SameSite=Lax</code>'],
  ['<code>Retry-After</code>', 'Seconds to wait (429, 503)', '<code>30</code>'],
  ['<code>WWW-Authenticate</code>', 'Sent with 401: how to authenticate', '<code>Bearer</code>']
])}
<p>🔵 <b>Error bodies should be useful.</b> A bare "500" teaches the caller nothing. Return JSON with a stable machine-readable code and a human message — the standard shape is <b>RFC 9457 Problem Details</b> (see the code tab). Never leak stack traces or SQL to the client.</p>
<p>Use the first visualizer to look up any code; the second shows a header (<code>ETag</code>) saving a whole download.</p>`,
    clues: [
      '"Which status code would you return when…?" → name the family first (client mistake or server mistake?), then the specific code',
      '"User is logged in but cannot access" → 403, not 401',
      '"Resource created" → 201 + Location; "deleted" → 204; "accepted for background work" → 202',
      '"Too many requests" / "rate limit" → 429 + Retry-After',
      '"Duplicate email / version mismatch" → 409 Conflict',
      '"Do not retry a 4xx; do retry a 5xx (with backoff)" — the retry rule of thumb',
      '"Not changed since last time" → 304 with ETag / If-None-Match'
    ],
    code: [
      { lang: 'python', run: true, title: 'Runnable: classify a status code and decide whether to retry', code: `def describe(code: int) -> str:
    """Return the family and a retry decision for any HTTP status code."""
    if 100 <= code < 200:
        family, retry = "informational", "wait for the final response"
    elif 200 <= code < 300:
        family, retry = "success", "no retry needed"
    elif 300 <= code < 400:
        family, retry = "redirection", "follow the Location header (or use the cache for 304)"
    elif 400 <= code < 500:
        family = "client error"
        # 408 (timeout), 429 (rate limit) are the usual "try again later" 4xx codes
        retry = "retry later with backoff" if code in (408, 429) else "do NOT retry unchanged - fix the request"
    elif 500 <= code < 600:
        family = "server error"
        retry = "retry with exponential backoff" if code in (502, 503, 504) else "retry carefully; report it if it persists"
    else:
        raise ValueError("not an HTTP status code: " + str(code))
    return f"{code}: {family} -> {retry}"


for c in (200, 201, 204, 304, 400, 401, 404, 409, 429, 500, 503):
    print(describe(c))` },
      { lang: 'json', title: 'A helpful error body (RFC 9457 "problem details" style)', code: `{
  "type": "https://api.example.com/problems/out-of-stock",
  "title": "Item out of stock",
  "status": 409,
  "detail": "SKU B-1 has 0 units left; you asked for 2.",
  "instance": "/orders/draft/118",
  "errors": [
    { "field": "items[0].qty", "message": "must be at most 0" }
  ]
}` },
      { lang: 'java', check: false, title: 'Spring Boot: turn exceptions into the right status codes', code: `@RestControllerAdvice
class ApiErrors {

    @ExceptionHandler(OrderNotFoundException.class)           // -> 404
    ResponseEntity<ProblemDetail> notFound(OrderNotFoundException e) {
        return ResponseEntity.status(404).body(ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, e.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)  // bad input -> 400
    ProblemDetail invalid(MethodArgumentNotValidException e) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, "Validation failed");
    }

    @ExceptionHandler(OutOfStockException.class)              // clashes with current state -> 409
    ProblemDetail conflict(OutOfStockException e) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, e.getMessage());
    }

    @ExceptionHandler(Exception.class)                        // anything unexpected -> 500, never leak the stack trace
    ProblemDetail unexpected(Exception e) {
        log.error("Unhandled error", e);
        return ProblemDetail.forStatusAndDetail(HttpStatus.INTERNAL_SERVER_ERROR, "Something went wrong");
    }
}` }
    ],
    codeTitle: ['Classify a status code (click Run)', 'A helpful JSON error body', 'Exception → status mapping (Spring)'],
    viz: [{
      title: 'Status code families & look-up',
      input: '404',
      inputLabel: 'A status code to look up (e.g. 201, 401, 409, 503)',
      gen: function (input) {
        var code = parseInt(String(input || '404').trim(), 10);
        if (isNaN(code) || code < 100 || code > 599) throw new Error('Enter a 3-digit status code between 100 and 599');
        var rows = FAMILIES.map(function (r) { return [r[0], r[1], r[2], r[3], r[4]]; });
        var head = ['Family', 'Name', 'Meaning', 'Whose fault', 'Examples'];
        function fam(i) { var o = {}; o[i] = 'sel'; return o; }
        var f = [];
        f.push({ narr: 'The <b>first digit</b> tells you everything important. Five families. Learn these and you can read any status code, even one you have never seen.', parts: [{ type: 'table', label: 'Status code families', columns: head, rows: rows, hl: {} }] });
        var nar = [
          '<b>1xx</b> – "informational". Rare in daily work. <code>100 Continue</code> lets a client ask "may I send this big body?" before sending it.',
          '<b>2xx</b> – <span class="c-g">success</span>. 200 for plain success, 201 after creating, 204 when there is nothing to send back.',
          '<b>3xx</b> – redirection. 301/302 send the client elsewhere; 304 says "use your cached copy".',
          '<b>4xx</b> – <span class="c-y">client error</span>. The request is wrong; sending it again unchanged will fail again. Exceptions: 408 and 429 ("try again later").',
          '<b>5xx</b> – <span class="c-r">server error</span>. The request was probably fine; the server failed. Clients may retry (with backoff), and on-call engineers get paged.'
        ];
        nar.forEach(function (t, i) { f.push({ narr: t, parts: [{ type: 'table', label: 'Status code families', columns: head, rows: rows, hl: fam(i) }] }); });
        var fi = Math.floor(code / 100) - 1, info = CODES[code];
        if (info) {
          f.push({ narr: 'You asked about <b>' + code + ' ' + info[0] + '</b>. It belongs to the <b>' + info[1] + '</b> family. ' + info[2], parts: [{ type: 'table', label: 'Status code families', columns: head, rows: rows, hl: fam(fi) },
            { type: 'table', label: 'Look-up: ' + code, columns: ['Code', 'Name', 'When to use', 'Example', 'Client should'], rows: [[String(code), info[0], info[2], info[3], info[4]]], hl: { 0: 'cur' } }] });
        } else {
          f.push({ narr: '<b>' + code + '</b> is not in the short list of common codes, but its first digit still tells you the family: <b>' + FAMILIES[fi][0] + ' – ' + FAMILIES[fi][1] + '</b>, "' + FAMILIES[fi][2].replace(/"/g, '') + '".', parts: [{ type: 'table', label: 'Status code families', columns: head, rows: rows, hl: fam(fi) }] });
        }
        var common = Object.keys(CODES).map(function (k) { return [k, CODES[k][0], CODES[k][1]]; });
        f.push({ narr: 'These are the ~20 codes worth knowing. The highlighted row is your code (if it is in the list).', parts: [{ type: 'table', label: 'Common codes', columns: ['Code', 'Name', 'Family'], rows: common, hl: (function () { var o = {}; common.forEach(function (r, i) { if (Number(r[0]) === code) o[i] = 'sel'; }); return o; })() }] });
        return f;
      }
    }, {
      title: 'Headers at work: ETag and 304 Not Modified',
      gen: function () {
        var nodes = [bx('B', 'Browser (cache)', 14, 30), bx('S', 'API server', 80, 30)];
        var edges = [['B', 'S', '']];
        return story({ label: 'Same URL fetched twice', height: 60, nodes: nodes, edges: edges, steps: [
          { narr: 'The browser wants <code>GET /products/17</code>. Its cache is <b>empty</b>, so it must ask the server.', hl: { B: 'cur' }, tags: { B: 'cache: empty' } },
          { narr: '<b>1st response: 200 OK + body + ETag.</b> The server sends the full 2 KB JSON and a fingerprint header <code>ETag: "v7"</code>. The browser stores both.', on: ['B-S'], labels: { 'B-S': '200 OK · ETag "v7" · 2 KB' }, hl: { S: 'sel' }, tags: { B: 'cache: v7 (stored)', S: 'sent full body' } },
          { narr: 'A minute later the page is opened again. The browser sends the same request, plus <code>If-None-Match: "v7"</code> — "only send the body if it is not v7 anymore".', reset: true, on: ['B-S'], cls: 'cur', keep: false, labels: { 'B-S': 'GET · If-None-Match: "v7"' }, hl: { B: 'cur' }, tags: { B: 'cache: v7' } },
          { narr: 'The server compares: product 17 is still version 7. It answers <b>304 Not Modified</b> with <b>no body</b> — about 200 bytes instead of 2 KB. The browser reuses its cached copy.', on: ['B-S'], cls: 'ok', keep: 'ok', labels: { 'B-S': '304 Not Modified · no body' }, hl: { S: 'ok', B: 'ok' }, tags: { B: 'uses cached v7', S: 'saved 1.8 KB' } },
          { narr: 'Someone edits the product, so it is now version 8. Next conditional request: <code>If-None-Match: "v7"</code> does not match → the server sends <b>200 OK + new body + ETag "v8"</b>.', reset: true, on: ['B-S'], cls: 'sel', keep: false, labels: { 'B-S': '200 OK · ETag "v8" · 2 KB' }, hl: { S: 'sel' }, tags: { B: 'cache: v8 (replaced)' } }
        ] });
      }
    }],
    examples: [
      { title: 'Example 1 — Choose the status code (create, read, delete)', html: `${H.table(['Situation', 'Status', 'Notes'], [
        ['New order saved', '<b>201 Created</b>', 'Add <code>Location: /orders/9001</code>'],
        ['Order 99999 does not exist', '<b>404 Not Found</b>', 'JSON error body with a code'],
        ['Order deleted', '<b>204 No Content</b>', 'No body'],
        ['Request body is not valid JSON', '<b>400 Bad Request</b>', 'Say what is wrong and where'],
        ['qty = -2', '<b>422</b> (or 400)', 'Values break business rules'],
        ['Customer email already registered', '<b>409 Conflict</b>', 'Clashes with existing state'],
        ['Token expired', '<b>401 Unauthorized</b>', 'Client must log in / refresh'],
        ['Normal user opens /admin', '<b>403 Forbidden</b>', 'Authenticated but not allowed'],
        ['Database is down', '<b>503 Service Unavailable</b>', '+ <code>Retry-After</code>']
      ])}` },
      { title: 'Example 2 — Rate limiting response (429)', html: `<p>When a client sends too many requests, tell it exactly how long to wait. Well-behaved clients (and AI agents) read <code>Retry-After</code> instead of hammering the server.</p>`, code: { lang: 'http', code: `HTTP/1.1 429 Too Many Requests
Content-Type: application/json
Retry-After: 30
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0

{"title":"Rate limit exceeded","status":429,"detail":"Max 100 requests per minute. Try again in 30 seconds."}` } },
      { title: 'Example 3 — 401 versus 403 in a real login flow', html: `<ol><li>Call <code>GET /me</code> with no token → <b>401</b> + <code>WWW-Authenticate: Bearer</code>. Meaning: "tell me who you are".</li><li>Log in, retry with a valid token → <b>200</b> with your profile.</li><li>Call <code>GET /admin/users</code> with the same token → <b>403</b>. Meaning: "I know who you are; you are just not allowed".</li></ol><p>Some teams return <b>404</b> instead of 403 for other people's private resources, so attackers can't even learn that an id exists. That's a deliberate security choice.</p>` },
      { title: 'Example 4 — Reading a failure like an on-call engineer', html: `${H.table(['What the user sees', 'Likely layer', 'First thing to check'], [
        ['502 Bad Gateway', 'nginx cannot reach / understand the app', 'Is the app process running? Did it crash on start?'],
        ['504 Gateway Timeout', 'App too slow', 'Slow query? Downstream call hanging? Timeout config?'],
        ['503 from app', 'App is overloaded or shedding load', 'Thread pool / connection pool exhausted?'],
        ['500 with stack trace in logs', 'Bug in app code', 'Search logs by request id']
      ])}` }
    ],
    deepDive: `<p>🟣 <b>Redirect subtleties.</b> 301/302 historically let clients turn a POST into a GET on redirect. <b>307</b> (temporary) and <b>308</b> (permanent) guarantee the method and body are preserved. Use 308/307 for API redirects; use 303 See Other after a form POST to send the browser to a result page (the "Post/Redirect/Get" pattern that prevents double submits on refresh).</p>
<p><b>Caching headers decoded.</b> <code>Cache-Control: max-age=60</code> = reuse for 60 s without asking. <code>no-cache</code> = you may store it, but must revalidate (ETag) before every reuse. <code>no-store</code> = never store (use for sensitive data). <code>private</code> = only the user's browser may store it, not shared proxies/CDNs; <code>public</code> = anyone may. <code>stale-while-revalidate</code> serves the old copy while fetching a fresh one. Vary tells caches which request headers change the response (<code>Vary: Accept-Encoding</code>).</p>
<p><b>Error handling philosophy.</b> Make 4xx errors precise (the caller can fix them) and 5xx errors boring (don't leak internals). Add a <code>requestId</code> / <code>traceId</code> to every error so support can find the exact log lines. Never return 200 with <code>{"success": false}</code> — it fools monitoring, caches, retries and API gateways. A good dashboard alerts on the 5xx rate, not on 4xx (a spike of 4xx often means a client bug or an attack, a different alert).</p>
<p><b>Retries and backoff.</b> On 5xx/429/timeouts use exponential backoff with jitter (wait 200 ms, 400 ms, 800 ms … plus random noise) so thousands of clients don't retry in lock-step and flatten a recovering server (a "thundering herd"). Cap total attempts, honour <code>Retry-After</code>, and only retry idempotent requests or ones with an idempotency key.</p>
<p><b>Security headers worth knowing early.</b> <code>Strict-Transport-Security</code> (always use https), <code>X-Content-Type-Options: nosniff</code>, <code>Content-Security-Policy</code>, and cookie flags <code>HttpOnly; Secure; SameSite</code>. Frameworks (Spring Security, helmet for Express) set many by default — know what they do.</p>`,
    aiEra: `<p><b>What AI changes:</b> LLM provider APIs make status codes part of daily life: <b>429</b> when you exceed token or request limits, <b>529/503</b> when the model is overloaded, <b>400</b> for prompts that exceed the context window, <b>401</b> for a bad key. Good AI clients read <code>Retry-After</code>, back off with jitter and fall back to another model.</p>
<p><b>Use AI as a partner:</b> give it a list of your API's failure cases and ask <code>propose status codes and error bodies; flag where 400/422/409 are ambiguous</code>, then compare to your own table. Ask it to write a retry/backoff helper — and then test it.</p>
<p><b>Where AI goes wrong:</b> it likes <code>200 OK</code> with an error message inside, uses 401 and 403 interchangeably, returns 500 for validation failures and prints full exception messages to the client. It may also suggest retrying every error, including 400.</p>
<p><b>What you must still own:</b> a consistent error contract across all endpoints, correct retry semantics, and never exposing internals. Keep tokens in environment variables (<code>process.env.API_KEY</code>) and make sure logs never contain the <code>Authorization</code> header.</p>`,
    problems: [{
      title: 'Choose Status Codes for 10 Scenarios',
      level: 'Easy', tags: ['status codes', 'errors', 'rest'], companies: ['PayPal', 'Razorpay'],
      statement: `<p>Give the best HTTP status code, and any important header, for each: (1) order created, (2) order deleted, (3) JSON body has a syntax error, (4) no login token supplied, (5) logged-in user opens another user's invoice, (6) product id does not exist, (7) email already registered, (8) client exceeded 100 requests/min, (9) unhandled NullPointerException, (10) database is unreachable during a deploy.</p>`,
      constraints: `One code per scenario. Prefer the most specific standard code.`,
      example: `${H.table(['#', 'Answer'], [['1', '<b>201 Created</b> + <code>Location: /orders/9001</code>'], ['2', '<b>204 No Content</b>']])}<p>${H.c('g', 'Why')}: 201 tells the client a new resource exists and where; 204 says success with nothing to return.</p>`,
      brute: { why: `<p>The lazy design returns <code>200 OK</code> for everything and puts <code>{"success": false}</code> in the body. Monitoring shows 100% success, caches may store errors, and clients cannot decide whether to retry.</p>` },
      mcq: { q: 'A user is logged in but tries to read someone else\'s invoice. Best status?', options: ['403 Forbidden (or 404 to hide existence)', '401 Unauthorized', '400 Bad Request', '500 Internal Server Error'], answer: 0, explain: 'Authentication succeeded, authorization failed: 403. Some APIs return 404 so the id does not leak.' },
      hints: [
        `<p>Hint 1: first digit — is it the caller's mistake (4xx), the server's (5xx), or a success (2xx)?</p>`,
        `<p>Hint 2: for 4xx, ask "does the caller need to log in (401), is it forbidden (403), missing (404), malformed (400), or clashing with existing data (409)?"</p>`,
        `<p>Hint 3: add headers that help the client act: Location on 201, Retry-After on 429/503, WWW-Authenticate on 401.</p>`
      ],
      solution: {
        approach: `<ol><li><b>201 Created</b> + <code>Location</code>.</li><li><b>204 No Content</b>.</li><li><b>400 Bad Request</b> — the body cannot even be parsed.</li><li><b>401 Unauthorized</b> + <code>WWW-Authenticate: Bearer</code> — not authenticated.</li><li><b>403 Forbidden</b> (or 404 to avoid revealing the id exists) — authenticated, not allowed.</li><li><b>404 Not Found</b>.</li><li><b>409 Conflict</b> — clashes with existing data.</li><li><b>429 Too Many Requests</b> + <code>Retry-After</code>.</li><li><b>500 Internal Server Error</b> — log the stack trace and a request id, return a generic body. Also fix the bug: a null should usually have been a 400/404.</li><li><b>503 Service Unavailable</b> + <code>Retry-After</code> — temporary and the client should retry.</li></ol><p>Notice the pattern: 4xx tells the caller to change something, 5xx tells them to wait, and the headers say how.</p>`,
        complexity: `<p>Design exercise; no algorithmic cost. Correct codes make monitoring (alert on 5xx rate), caching and retry logic work automatically.</p>`,
        followUps: ['When would you pick 422 over 400?', 'Why is returning 200 with an error body harmful?']
      }
    }]
  });

  /* ================================================================
     TOPIC 5 — JSON and payload design
     ================================================================ */
  topics.push({
    title: 'JSON: The Language Backends Speak (and Designing Good Payloads)',
    analogy: `<p>JSON is like a <b>labelled filing cabinet</b> that can be sent through the post. A drawer has a <b>label</b> ("customer") and inside is either a single sheet (a string, number, yes/no), a smaller cabinet (an object), or a stack of folders (an array). Both sides agree on the labels, so the receiver can open any drawer by name without guessing.</p>
<p>A bad payload is a drawer labelled "stuff" holding a tangle of papers. A good one is predictable: same labels, same types, every time.</p>`,
    explain: `<p>🟢 <b>JSON</b> (JavaScript Object Notation) is the text format almost every web API uses to send data. It was born from JavaScript but is understood by every language. It has only <b>six kinds of value</b>:</p>
${H.table(['JSON type', 'Looks like', 'Java', 'Python', 'JavaScript'], [
  ['string', '<code>"Asha"</code> (double quotes only)', 'String', 'str', 'string'],
  ['number', '<code>42</code>, <code>3.14</code>, <code>-1e3</code>', 'int / long / double / BigDecimal', 'int / float', 'number'],
  ['boolean', '<code>true</code>, <code>false</code>', 'boolean', 'bool', 'boolean'],
  ['null', '<code>null</code>', 'null', 'None', 'null'],
  ['object', '<code>{"id": 7, "name": "Asha"}</code>', 'class / record / Map', 'dict', 'object'],
  ['array', '<code>[1, 2, 3]</code>', 'List&lt;T&gt;', 'list', 'array']
])}
<p>Rules that bite beginners: keys must be in <b>double quotes</b>; <b>no trailing commas</b>; <b>no comments</b>; no <code>undefined</code>, no dates (use strings), no <code>NaN</code>.</p>
<p>🔵 <b>Serialization and deserialization.</b> Your code works with <b>objects</b> in memory; the network carries <b>text</b>. Turning an object into JSON text is <b>serializing</b> (a.k.a. marshalling); turning JSON text back into an object is <b>deserializing</b> (parsing). In Java, a library such as <b>Jackson</b> does this using field names: the JSON key <code>"qty"</code> fills the Java field <code>qty</code>.</p>
<p>🔵 <b>Designing the JSON for an order</b> — decisions to make on purpose:</p>
${H.table(['Decision', 'Good choice', 'Why'], [
  ['Field names', 'One style everywhere, e.g. <code>camelCase</code>', 'Clients can guess names'],
  ['Money', 'Integer minor units <code>"amountMinor": 49900</code> plus <code>"currency": "INR"</code> (or a decimal string)', 'Floats cannot represent 0.1 exactly — rounding bugs in payments'],
  ['Dates & times', 'ISO 8601 in UTC: <code>"2026-03-14T09:30:00Z"</code>', 'Unambiguous across time zones'],
  ['Ids', 'Strings or numbers consistently; strings if they may exceed 2<sup>53</sup>', 'JavaScript numbers lose precision above 9,007,199,254,740,991'],
  ['Enums', 'Uppercase words: <code>"status": "CONFIRMED"</code>', 'Readable, stable, safe to add new ones'],
  ['Nested vs flat', 'Nest things that belong together (<code>customer</code>, <code>items[]</code>); link big separate things by id', 'Avoids sending huge duplicated blobs'],
  ['Null vs missing', 'Decide and document: null = "known to be empty", missing = "not provided/not changed"', 'Matters a lot for PATCH'],
  ['Collections', 'Always an array (empty <code>[]</code> instead of null)', 'Clients never need a null check before looping'],
  ['Envelope', 'Return the object itself; for lists wrap with paging info', 'Simple clients, room to grow']
])}
<p>Open the visualizer to see how one JSON document becomes a tree of objects in memory.</p>`,
    clues: [
      '"Design the request/response for creating an order" → nested object, array of items, money in minor units, ISO dates, enum status',
      '"Why not use float for money?" → binary floating point cannot store 0.1 exactly; use integers or BigDecimal',
      '"JSON vs XML vs Protobuf" → JSON is human-readable and universal; Protobuf is smaller/faster with a schema (gRPC); XML is verbose and legacy',
      '"Backward-compatible API change" → adding optional fields is safe; renaming or removing fields breaks clients',
      '"Deserialization security" → never trust incoming JSON; validate types, ranges, sizes; beware polymorphic deserialization gadgets',
      '"Large numbers become wrong in the browser" → ids above 2<sup>53</sup> must be strings'
    ],
    code: [
      { lang: 'json', title: 'A well-designed order document', code: `{
  "id": "ord_9001",
  "status": "CONFIRMED",
  "createdAt": "2026-03-14T09:30:00Z",
  "customer": {
    "id": "cus_7",
    "name": "Asha Rao"
  },
  "items": [
    { "sku": "B-1", "name": "Notebook", "qty": 2, "unitPriceMinor": 15000 },
    { "sku": "P-4", "name": "Pen", "qty": 1, "unitPriceMinor": 19900 }
  ],
  "shipping": {
    "method": "STANDARD",
    "address": { "line1": "12 MG Road", "city": "Pune", "postalCode": "411001", "country": "IN" }
  },
  "currency": "INR",
  "totalMinor": 49900,
  "couponCode": null
}` },
      { lang: 'java', check: false, title: 'Jackson: JSON text <-> Java records', code: `import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import java.time.Instant;
import java.util.List;

record Customer(String id, String name) {}
record Item(String sku, String name, int qty, long unitPriceMinor) {}
record Order(String id, String status, Instant createdAt, Customer customer,
             List<Item> items, String currency, long totalMinor, String couponCode) {}

class JsonDemo {
    public static void main(String[] args) throws Exception {
        ObjectMapper mapper = new ObjectMapper().registerModule(new JavaTimeModule());

        String json = "{\\"id\\":\\"ord_1\\",\\"status\\":\\"NEW\\",\\"createdAt\\":\\"2026-03-14T09:30:00Z\\","
                + "\\"customer\\":{\\"id\\":\\"cus_7\\",\\"name\\":\\"Asha\\"},"
                + "\\"items\\":[{\\"sku\\":\\"B-1\\",\\"name\\":\\"Notebook\\",\\"qty\\":2,\\"unitPriceMinor\\":15000}],"
                + "\\"currency\\":\\"INR\\",\\"totalMinor\\":30000,\\"couponCode\\":null}";

        Order order = mapper.readValue(json, Order.class);       // deserialize: text -> object
        System.out.println(order.customer().name() + " ordered " + order.items().size() + " line(s)");

        String back = mapper.writeValueAsString(order);          // serialize: object -> text
        System.out.println(back);
    }
}` },
      { lang: 'js', run: true, title: 'Runnable: JSON in JavaScript - and its traps', code: `const text = '{"id":"ord_1","items":[{"sku":"B-1","qty":2}],"couponCode":null}';

// 1) parse: text -> object
const order = JSON.parse(text);
console.log('first sku:', order.items[0].sku, '| coupon is null:', order.couponCode === null);

// 2) stringify: object -> text (undefined and functions are silently dropped!)
console.log(JSON.stringify({ a: 1, b: undefined, c: () => 1, d: null }));

// 3) trap: dates become strings, not Date objects
const withDate = JSON.parse(JSON.stringify({ at: new Date(Date.UTC(2026, 2, 14, 9, 30)) }));
console.log('date after round trip:', withDate.at, typeof withDate.at);

// 4) trap: floats are not exact - never use them for money
console.log('0.1 + 0.2 =', 0.1 + 0.2, '| in minor units:', 10 + 20);

// 5) trap: big ids lose precision
console.log('JSON.parse("9007199254740993") =', JSON.parse('9007199254740993'), '(should end in ...993)');

// 6) invalid JSON throws - always guard parsing of untrusted input
try { JSON.parse("{'name': 'Asha',}"); } catch (e) { console.log('bad JSON ->', e.name); }` },
      { lang: 'python', run: true, title: 'Runnable: validate an order payload by hand', code: `import json
from decimal import Decimal

def validate_order(text: str) -> list:
    """Return a list of problems (empty list = valid)."""
    try:
        data = json.loads(text)
    except json.JSONDecodeError as e:
        return [f"not valid JSON: {e.msg} at position {e.pos}"]
    problems = []
    if not isinstance(data, dict):
        return ["body must be a JSON object"]
    if not isinstance(data.get("customerId"), str):
        problems.append("customerId must be a string")
    items = data.get("items")
    if not isinstance(items, list) or not items:
        problems.append("items must be a non-empty array")
    else:
        for i, it in enumerate(items):
            if not isinstance(it, dict) or not isinstance(it.get("qty"), int) or it["qty"] < 1:
                problems.append(f"items[{i}].qty must be an integer >= 1")
    return problems

print(validate_order('{"customerId":"cus_7","items":[{"sku":"B-1","qty":2}]}'))
print(validate_order('{"customerId":7,"items":[{"sku":"B-1","qty":0}]}'))
print(validate_order('{"customerId":"cus_7",}'))
print("exact money:", Decimal("0.10") + Decimal("0.20"))` }
    ],
    codeTitle: ['Order JSON', 'Jackson in Java (library code)', 'JSON.parse / stringify and traps (Run)', 'Validate a payload (Run)'],
    viz: {
      title: 'JSON text → objects in memory (tree)',
      input: '2',
      inputLabel: 'Number of order lines (1 or 2)',
      gen: function (input) {
        var n = parseInt(String(input || '2').trim(), 10);
        if (isNaN(n) || n < 1 || n > 2) throw new Error('Enter 1 or 2 order lines');
        var items = [['B-1', 2], ['P-4', 1]].slice(0, n);
        var L = ['{', '  "id": 9001,', '  "status": "CONFIRMED",', '  "customer": {', '    "id": 7,', '    "name": "Asha"', '  },', '  "items": ['];
        items.forEach(function (it, i) { L.push('    { "sku": "' + it[0] + '", "qty": ' + it[1] + ' }' + (i < items.length - 1 ? ',' : '')); });
        L.push('  ],'); L.push('  "total": 499.0'); L.push('}');
        var code = L.join('\n');
        var itemLine = function (i) { return 9 + i; };
        var closeItems = 9 + n, totalLine = 10 + n;
        var arr = ['Order', 'customer', 'items', 'id', 'name', 'items[0]', n > 1 ? 'items[1]' : null, null, null, null, null, 'sku', 'qty', n > 1 ? 'sku' : null, n > 1 ? 'qty' : null];
        function t(hlTree, tags, label) { return { type: 'tree', label: label || 'Objects in memory', arr: arr.slice(), hl: hlTree || {}, tags: tags || {} }; }
        function c(hl) { return { type: 'code', label: 'JSON text', lang: 'json', code: code, hl: hl }; }
        var f = [];
        f.push({ narr: 'A client sends this JSON <b>text</b>. Your server must turn it into <b>objects</b> it can work with. The tree on the next frames shows the structure the parser builds.', parts: [c({})] });
        f.push({ narr: '<b>The outer { } is an object</b> → one <code>Order</code> instance. Its <i>scalar</i> fields (<code>id</code>, <code>status</code>, <code>total</code>) are plain strings and numbers stored directly inside it.', parts: [c((function () { var o = { 1: 'cur', 2: 'win', 3: 'win' }; o[totalLine] = 'win'; return o; })()), t({ 0: 'cur' }, { 0: 'object' }),
          { type: 'table', label: 'Scalar fields of Order', columns: ['JSON key', 'JSON value', 'Java type'], rows: [['id', '9001', 'long'], ['status', '"CONFIRMED"', 'String / enum'], ['total', '499.0', 'BigDecimal (or long minor units)']], hl: {} }] });
        var h2 = {}; for (var i = 4; i <= 7; i++) h2[i] = 'sel';
        f.push({ narr: '<b>"customer": { … }</b> is an object nested inside the order → a child <code>Customer</code> object. The order holds a <i>reference</i> to it.', parts: [c(h2), t({ 1: 'sel' }, { 1: 'Customer' })] });
        f.push({ narr: 'Inside customer, <code>id</code> and <code>name</code> are scalar leaves — nothing nests deeper.', parts: [c({ 5: 'ok', 6: 'ok' }), t({ 3: 'ok', 4: 'ok' }, { 3: 'long', 4: 'String' })] });
        var h4 = {}; for (var j = 8; j <= closeItems; j++) h4[j] = 'win';
        f.push({ narr: '<b>"items": [ … ]</b> is an <b>array</b> → a <code>List&lt;Item&gt;</code>. Order matters in arrays; they hold zero or more elements.', parts: [c(h4), t({ 2: 'win' }, { 2: 'List<Item>' })] });
        var h5 = {}; for (var k = 0; k < n; k++) h5[itemLine(k)] = 'ok';
        var th = { 5: 'ok', 11: 'ok', 12: 'ok' }; if (n > 1) { th[6] = 'ok'; th[13] = 'ok'; th[14] = 'ok'; }
        f.push({ narr: 'Each element of the array is itself an object → ' + n + ' <code>Item</code> object' + (n > 1 ? 's' : '') + ', each with <code>sku</code> (string) and <code>qty</code> (number).', parts: [c(h5), t(th, { 5: 'Item', 11: 'String', 12: 'int' })] });
        f.push({ narr: 'Done. The parser produced one root object, one nested object, one list and ' + n + ' item object' + (n > 1 ? 's' : '') + '. In Jackson all of this is a single call: <code>mapper.readValue(json, Order.class)</code>. If a type does not fit (e.g. <code>"qty": "two"</code>), the call throws and you should answer <b>400</b>.', parts: [c({}), t({ 0: 'ok', 1: 'ok', 2: 'ok', 5: 'ok' }, {}),
          { type: 'table', label: 'JSON → Java mapping', columns: ['JSON', 'Becomes'], rows: [['object { }', 'Order / Customer / Item instance'], ['array [ ]', 'List&lt;Item&gt;'], ['string / number', 'String / long / int / BigDecimal'], ['null', 'null reference']], hl: {} }] });
        return f;
      }
    },
    examples: [
      { title: 'Example 1 — Request vs response: they are not the same shape', html: `<p>When creating an order the client sends <b>only what it knows</b>. The server adds what it owns: id, status, timestamps, totals. Never accept <code>id</code>, <code>status</code> or <code>totalMinor</code> from the client — a user could set their own price.</p>`, code: { lang: 'json', code: `{
  "customerId": "cus_7",
  "items": [
    { "sku": "B-1", "qty": 2 },
    { "sku": "P-4", "qty": 1 }
  ],
  "couponCode": "WELCOME10"
}` } },
      { title: 'Example 2 — Paged list response', html: `<p>Lists should be wrapped so you can add paging info without breaking clients. A cursor lets the client ask for "the next page" without skipping or repeating rows when data changes.</p>`, code: { lang: 'json', code: `{
  "data": [
    { "id": "ord_9001", "status": "CONFIRMED", "totalMinor": 49900 },
    { "id": "ord_9000", "status": "SHIPPED", "totalMinor": 12000 }
  ],
  "page": { "limit": 2, "nextCursor": "b3JkXzg5OTk", "hasMore": true }
}` } },
      { title: 'Example 3 — Safe evolution of an API', html: `${H.table(['Change', 'Safe for old clients?', 'Why'], [
        ['Add optional field <code>"giftWrap": false</code>', '<span class="c-g">yes</span>', 'Old clients ignore unknown fields (if they are written well)'],
        ['Add new enum value <code>"status": "RETURNED"</code>', '<span class="c-y">risky</span>', 'Clients with a strict switch may crash — document "unknown value" handling'],
        ['Rename <code>qty</code> → <code>quantity</code>', '<span class="c-r">no</span>', 'Old clients read a missing field'],
        ['Change <code>total</code> from number to string', '<span class="c-r">no</span>', 'Type changes break parsers'],
        ['Remove a field', '<span class="c-r">no</span>', 'Needs a new API version first']
      ])}` },
      { title: 'Example 4 — Common JSON mistakes (and the error you get)', html: `<ul><li><code>{'name': 'Asha'}</code> — single quotes are invalid; parsers throw.</li><li><code>{"qty": 2,}</code> — trailing comma; invalid.</li><li><code>{"price": 0.1}</code> and <code>{"price": 0.2}</code> read into a Java <code>double</code> and added give 0.30000000000000004; use integer minor units or <code>BigDecimal</code>.</li><li>Sending <code>"createdAt": "14/03/26"</code> — ambiguous (day/month?) and locale-dependent; use ISO 8601.</li><li>Missing <code>Content-Type: application/json</code> → 415 or the body is ignored.</li></ul>` }
    ],
    deepDive: `<p>🟣 <b>Number semantics.</b> JSON itself puts no limit on number size or precision, but implementations do: JavaScript uses IEEE-754 doubles (exact integers up to 2<sup>53</sup> − 1 = 9,007,199,254,740,991), Java's Jackson maps to <code>int</code>/<code>long</code>/<code>double</code> depending on the target type. Twitter famously added <code>id_str</code> alongside <code>id</code> for this reason. Use strings for big ids and decimal strings (<code>"19.99"</code>) or minor units for money.</p>
<p><b>Streaming vs tree parsing.</b> <code>mapper.readValue</code> builds the whole object in memory — fine for kilobytes, dangerous for 500 MB uploads. For big payloads use streaming parsers (Jackson <code>JsonParser</code>) or newline-delimited JSON (NDJSON/JSON Lines), where each line is one record and can be processed as it arrives. Also cap request body size so one client can't exhaust your heap.</p>
<p><b>Security of deserialization.</b> Treat all JSON as hostile: enforce max body size, max nesting depth and array length; validate types and ranges (Bean Validation <code>@Valid</code>, <code>@Min</code>, <code>@NotBlank</code>); never bind JSON straight onto a database entity (<b>mass assignment</b> — a client sets <code>"admin": true</code>). Use separate request DTOs. Disable Jackson default typing / polymorphic deserialization of untrusted classes — historically a source of remote code execution bugs.</p>
<p><b>Performance and alternatives.</b> JSON is text: verbose, no schema, slower to parse than binary. Gzip/Brotli typically shrinks it 5–10×. When throughput matters (service-to-service) teams use <b>Protocol Buffers</b> (gRPC), Avro or MessagePack; for public APIs JSON stays the default. Describe your JSON with <b>JSON Schema</b> / <b>OpenAPI</b> so validation and docs are generated rather than hand-written.</p>
<p><b>Unknown fields and tolerance.</b> Postel's law — "be liberal in what you accept" — applies to <i>reading</i> (ignore unknown fields so new server versions don't break old clients; Jackson: <code>FAIL_ON_UNKNOWN_PROPERTIES=false</code>), but be strict about <i>validating</i> what you do use. Document null vs missing carefully; for PATCH, "missing" must mean "leave unchanged" and "null" must mean "clear it".</p>`,
    aiEra: `<p><b>What AI changes:</b> JSON is the glue of the AI era. LLMs return <b>structured output</b> as JSON that conforms to a JSON Schema; tool/function calls are JSON objects with a name and arguments; MCP messages are JSON-RPC. Your backend often receives JSON <i>written by a model</i> — which can be almost right: missing fields, wrong types, extra prose around it.</p>
<p><b>Use AI as a partner:</b> ask it to draft an OpenAPI/JSON Schema from an example payload, to generate edge-case payloads (null, huge arrays, unicode, wrong types) for your validator, or to convert JSON into Java records and back.</p>
<p><b>Where AI goes wrong:</b> generated examples use <code>double</code> for money, local-format dates, plural/singular name inconsistencies and sometimes invalid JSON (comments, trailing commas). Model-generated JSON must always be parsed defensively and validated before use.</p>
<p><b>What you must still own:</b> the data contract: names, types, nullability, money and time rules, compatibility policy. Validate and sanitise everything that comes from users <i>or</i> from a model, and never put secrets or personal data into prompts or example payloads you paste into chat tools.</p>`,
    problems: [{
      title: 'Design the JSON for an Order',
      level: 'Medium', tags: ['json', 'api design', 'money'], companies: ['Amazon', 'Swiggy'],
      statement: `<p>Design the <b>request</b> JSON a mobile app sends to create an order and the <b>response</b> JSON the server returns. An order has a customer, one or more line items (sku, quantity, unit price), a shipping address, a coupon (optional), a total and a status that changes over time. Explain your choices for money, dates, ids, enums and nulls.</p>`,
      constraints: `The client must never decide the price, id, status or total. Money is INR. The response must be easy to extend later without breaking old clients.`,
      example: `<p>Request: ${H.c('b', '{"customerId":"cus_7","items":[{"sku":"B-1","qty":2}],"couponCode":"WELCOME10"}')}</p><p>${H.c('g', 'Response')}: id, status, createdAt (ISO UTC), items with unitPriceMinor and lineTotalMinor, totalMinor, currency. ${H.c('y', 'Why')}: the server looks up prices, so a tampered client can't change them.</p>`,
      brute: { why: `<p>The naive design sends <code>{"price": 19.99, "total": 59.97, "date": "14/03/26"}</code> from the client and stores it. Floats cause rounding bugs, the user can set their own price, and the date is ambiguous. Flat parallel arrays like <code>skus[]</code>, <code>qtys[]</code> are fragile.</p>` },
      mcq: { q: 'Which is the safest way to represent ₹499.00 in JSON?', options: ['"totalMinor": 49900 with "currency": "INR"', '"total": 499.0', '"total": "four ninety nine"', '"total": 4.99e2'], answer: 0, explain: 'Integers in minor units (paise) avoid floating-point rounding, and a separate currency field removes ambiguity.' },
      hints: [
        `<p>Hint 1: split the problem — what does the client know (customer, skus, quantities, coupon) versus what only the server can know (id, prices, total, status, timestamps)?</p>`,
        `<p>Hint 2: group related data into nested objects (<code>customer</code>, <code>shipping.address</code>) and use an array of line-item objects instead of parallel arrays.</p>`,
        `<p>Hint 3: money → integer minor units + currency; time → ISO 8601 UTC; enum → uppercase strings; empty collections → []; optional things → omit or null, documented.</p>`
      ],
      solution: {
        approach: `<p><b>Request</b> carries only client-owned facts: <code>customerId</code> (string), <code>items[] {sku, qty}</code>, <code>shipping.address</code> (nested object, or an <code>addressId</code>), and optional <code>couponCode</code>. No prices, no total, no status.</p><p><b>Response (201 Created + Location)</b> adds server-owned facts: <code>id</code> as a string (safe for any size), <code>status</code> as an uppercase enum (<code>CREATED, PAID, SHIPPED, CANCELLED</code>), <code>createdAt</code>/<code>updatedAt</code> in ISO 8601 UTC, per-item <code>unitPriceMinor</code> and <code>lineTotalMinor</code>, <code>discountMinor</code>, <code>totalMinor</code> and <code>currency</code>. Prices are read from the catalog at order time and <i>copied</i> into the order so later price changes don't rewrite history.</p><p><b>Extensibility:</b> consistent camelCase, collections are always arrays, new optional fields can be added without breaking clients, and an enum comes with the rule "treat unknown statuses as unknown, don't crash". Validate on the server (400/422) and reject unknown skus or quantities &lt; 1.</p>`,
        code: { lang: 'json', code: `{
  "id": "ord_9001",
  "status": "CREATED",
  "createdAt": "2026-03-14T09:30:00Z",
  "customerId": "cus_7",
  "items": [
    { "sku": "B-1", "qty": 2, "unitPriceMinor": 15000, "lineTotalMinor": 30000 },
    { "sku": "P-4", "qty": 1, "unitPriceMinor": 19900, "lineTotalMinor": 19900 }
  ],
  "discountMinor": 0,
  "totalMinor": 49900,
  "currency": "INR",
  "couponCode": null
}` },
        complexity: `<p>Design question; no big-O. Cost to keep in mind: payload size grows linearly with line items, so cap the item count (for example 100) and the request body size.</p>`,
        followUps: ['How would you add partial shipments without breaking old clients?', 'How would you represent multiple currencies?']
      }
    }]
  });

  /* ================================================================
     TOPIC 6 — Statelessness and sessions
     ================================================================ */
  var SNODES = function (withStore) {
    var n = [bx('C', 'Client', 8, 30), bx('LB', 'Load balancer', 31, 30), bx('A', 'Server A', 62, 10), bx('B', 'Server B', 62, 50)];
    if (withStore) n.push(bx('S', 'Session store (Redis)', 89, 30));
    return n;
  };
  topics.push({
    title: 'HTTP Is Stateless: Sessions, Cookies, Tokens & Why It Scales',
    analogy: `<p>Imagine a <b>coffee shop where every barista has amnesia</b> after each order. If the barista remembers you ("the usual?"), you must always go to <i>that</i> barista — and if she is on break, you wait. That is a <b>stateful</b> server.</p>
<p>Now imagine you hand over a <b>loyalty card</b> with every order that says who you are and what you like. Any of 20 baristas can serve you instantly, and the shop can hire more at lunch time. That is a <b>stateless</b> server: everything needed to answer travels <i>inside the request</i>.</p>`,
    explain: `<p>🟢 <b>HTTP is stateless</b>: each request is independent. The server does not remember your previous request on its own. Yet websites remember you're logged in — so how? By adding state <i>on top</i> of HTTP in one of three ways:</p>
${H.table(['Approach', 'Where the "who is this user" info lives', 'How the client proves it', 'Scales how?'], [
  ['<b>Server memory session</b>', 'In RAM of <i>one</i> app server', 'Cookie with a random session id', '<span class="c-r">Poorly</span> — the user is tied to that server (sticky sessions needed)'],
  ['<b>Shared session store</b>', 'In Redis / DB that all servers use', 'Cookie with session id', '<span class="c-g">Well</span> — any server looks the id up; the store becomes a shared dependency'],
  ['<b>Self-contained token</b> (e.g. JWT)', 'Inside the signed token the client holds', 'Header <code>Authorization: Bearer …</code>', '<span class="c-g">Best</span> — any server verifies the signature; no lookup. Hard to revoke instantly.']
])}
<p>🔵 <b>What does "stateless server" really mean?</b> The <i>application servers</i> keep no per-user data between requests. State still exists — it is moved to the <b>client</b> (token, cookie) or to a <b>shared place</b> (database, Redis). The servers themselves become identical, throw-away boxes.</p>
<p>🔵 <b>Why that makes scaling easy.</b></p>
<ol>
<li>Traffic doubles? Start more identical servers behind a <b>load balancer</b>; any request can go to any server (<b>horizontal scaling</b>).</li>
<li>A server crashes? Nobody loses their login; the next request just goes to another box.</li>
<li>Deploying a new version? Replace servers one by one with no one logged out.</li>
<li>Autoscaling works: add/remove servers by CPU without migrating user data.</li>
</ol>
<p>🔵 <b>Cookies in 30 seconds.</b> A server can reply with <code>Set-Cookie: sid=abc123; HttpOnly; Secure; SameSite=Lax</code>. The browser stores it and automatically sends <code>Cookie: sid=abc123</code> with every later request to that site. Flags matter: <b>HttpOnly</b> (JavaScript can't read it → blunts XSS theft), <b>Secure</b> (https only), <b>SameSite</b> (limits cross-site sending → helps against CSRF).</p>
<p>Watch the two visualizers: first the <b>problem</b> (in-memory sessions + two servers), then the <b>three fixes</b>.</p>`,
    clues: [
      '"Design for 10 million users" / "add more servers" → servers must be stateless so the load balancer can route anywhere',
      '"User gets logged out randomly" → sessions stored in one server\'s memory while requests hit different servers',
      '"Sticky sessions / session affinity" → a workaround for stateful servers; hurts balance and failover',
      '"Where do you store sessions at scale?" → Redis (shared store) or signed tokens',
      '"How do you log a user out of a JWT immediately?" → you can\'t easily: short expiry + refresh tokens or a deny-list',
      '"Idempotent, stateless services restart safely" → good fit for containers, autoscaling and rolling deploys'
    ],
    code: [
      { lang: 'js', run: true, title: 'Runnable: stateful servers vs stateless token (two instances, one load balancer)', code: `// Toy "signature" to show the idea. Real systems use HMAC-SHA256 or a JWT library.
const SECRET = 'secret-' + Math.random();               // shared by all servers, never hard-coded in real code
const sign = (text) => { let h = 7; for (const ch of text + SECRET) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h.toString(16); };

class StatefulServer {                                  // keeps sessions in ITS OWN memory
  constructor(name) { this.name = name; this.sessions = new Map(); }
  login(user) { const sid = 'sid' + Math.floor(Math.random() * 1e6); this.sessions.set(sid, user); return sid; }
  handle(sid) { return this.sessions.has(sid) ? this.name + ': hello ' + this.sessions.get(sid) : this.name + ': 401 who are you?'; }
}
class StatelessServer {                                 // keeps NOTHING between requests
  constructor(name) { this.name = name; }
  login(user) { const body = user; return body + '.' + sign(body); }               // token = data + signature
  handle(token) {
    const [user, sig] = String(token).split('.');
    return sig === sign(user) ? this.name + ': hello ' + user : this.name + ': 401 bad token';
  }
}

function demo(label, A, B) {
  const credential = A.login('asha');                   // the login request happened to hit server A
  const servers = [A, B, A, B];                         // round-robin load balancer
  console.log('--- ' + label);
  servers.forEach((s, i) => console.log('request ' + (i + 1) + ' ->', s.handle(credential)));
}
demo('stateful (sessions in memory)', new StatefulServer('A'), new StatefulServer('B'));
demo('stateless (signed token)', new StatelessServer('A'), new StatelessServer('B'));` },
      { lang: 'python', run: true, title: 'Runnable: a real HMAC-signed token any server can verify', code: `import base64, hashlib, hmac, json, os, time

# All servers share this key (in real life: from an env var / secrets manager, never in source).
SECRET = os.environ.get("TOKEN_SECRET", "").encode() or os.urandom(32)

def b64(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()

def issue_token(user: str, ttl_seconds: int = 900) -> str:
    payload = b64(json.dumps({"sub": user, "exp": int(time.time()) + ttl_seconds}).encode())
    sig = b64(hmac.new(SECRET, payload.encode(), hashlib.sha256).digest())
    return payload + "." + sig

def verify_token(token: str):
    """Return the user if the token is genuine and not expired, else None. No database lookup."""
    try:
        payload, sig = token.split(".")
        expected = b64(hmac.new(SECRET, payload.encode(), hashlib.sha256).digest())
        if not hmac.compare_digest(sig, expected):        # constant-time compare
            return None
        data = json.loads(base64.urlsafe_b64decode(payload + "=" * (-len(payload) % 4)))
        return data["sub"] if data["exp"] > time.time() else None
    except Exception:
        return None

t = issue_token("asha")
print("token  :", t[:40] + "...")
print("server A verifies:", verify_token(t))
print("server B verifies:", verify_token(t))
print("tampered token   :", verify_token(t[:-2] + "xx"))
print("expired token    :", verify_token(issue_token("asha", ttl_seconds=-1)))` },
      { lang: 'java', title: 'Plain Java: session in memory vs signed token (HmacSHA256)', code: `import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

class TokenDemo {
    // Key comes from the environment in real life; random fallback keeps this demo self-contained.
    static final byte[] KEY = keyFromEnv();

    static byte[] keyFromEnv() {
        String env = System.getenv("TOKEN_SECRET");
        if (env != null && !env.isEmpty()) return env.getBytes(StandardCharsets.UTF_8);
        byte[] random = new byte[32];
        new SecureRandom().nextBytes(random);
        return random;
    }

    static String sign(String data) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(KEY, "HmacSHA256"));
        return Base64.getUrlEncoder().withoutPadding().encodeToString(mac.doFinal(data.getBytes(StandardCharsets.UTF_8)));
    }

    // "user|expiryEpochSeconds" + "." + signature
    static String issue(String user, long ttlSeconds) throws Exception {
        String data = user + "|" + (System.currentTimeMillis() / 1000 + ttlSeconds);
        return data + "." + sign(data);
    }

    // Any server instance that knows KEY can verify - no session lookup needed.
    static String verify(String token) throws Exception {
        int dot = token.lastIndexOf('.');
        if (dot < 0) return null;
        String data = token.substring(0, dot);
        byte[] given = token.substring(dot + 1).getBytes(StandardCharsets.UTF_8);
        byte[] expected = sign(data).getBytes(StandardCharsets.UTF_8);
        if (!MessageDigest.isEqual(given, expected)) return null;          // constant-time comparison
        String[] parts = data.split("\\\\|");
        return Long.parseLong(parts[1]) > System.currentTimeMillis() / 1000 ? parts[0] : null;
    }

    public static void main(String[] args) throws Exception {
        String t = issue("asha", 900);
        System.out.println("valid   -> " + verify(t));
        System.out.println("tampered-> " + verify(t.replace("asha", "root")));
        System.out.println("expired -> " + verify(issue("asha", -5)));
    }
}` },
      { lang: 'yaml', check: false, title: 'Spring Boot: keep sessions in Redis instead of server memory', code: `# application.yml  (needs spring-session-data-redis on the classpath)
spring:
  session:
    # no store-type needed: Boot picks Redis from the classpath, so sessions live in Redis and any app instance can read them
    timeout: 30m
  data:
    redis:
      host: \${REDIS_HOST:localhost}
      port: 6379
      password: \${REDIS_PASSWORD}   # injected from the environment, never committed
server:
  servlet:
    session:
      cookie:
        http-only: true
        secure: true
        same-site: lax` }
    ],
    codeTitle: ['Stateful vs stateless (Run)', 'Real HMAC token in Python (Run)', 'Signed token in plain Java', 'Sessions in Redis (Spring config)'],
    viz: [{
      title: 'The problem: sessions in server memory + a load balancer',
      gen: function () {
        var nodes = SNODES(false), edges = [['C', 'LB', ''], ['LB', 'A', ''], ['LB', 'B', '']];
        return story({ label: 'Two servers, session kept in Server A\'s memory', height: 60, nodes: nodes, edges: edges, steps: [
          { narr: 'One user, two app servers behind a load balancer. Each server has its <b>own memory</b>. Right now nobody is logged in.', hl: { C: 'cur' }, tags: { A: 'sessions: {}', B: 'sessions: {}' } },
          { narr: '<b>Request 1: POST /login.</b> The load balancer happens to pick <b>Server A</b>. A checks the password, creates session <code>s1</code> in <i>its own RAM</i> and replies <code>Set-Cookie: sid=s1</code>.', on: ['C-LB', 'LB-A'], labels: { 'C-LB': 'POST /login', 'LB-A': 'POST /login' }, hl: { A: 'sel' }, tags: { A: 'sessions: {s1 → asha}', B: 'sessions: {}' } },
          { narr: 'The browser now stores the cookie <code>sid=s1</code> and will send it with every request. So far so good.', reset: true, on: ['LB-A', 'C-LB'], cls: 'ok', keep: 'ok', labels: { 'C-LB': 'Set-Cookie: sid=s1', 'LB-A': '200 OK' }, hl: { A: 'ok', C: 'ok' }, tags: { A: 'sessions: {s1 → asha}', B: 'sessions: {}', C: 'cookie: sid=s1' } },
          { narr: '<b>Request 2: GET /profile</b> with <code>Cookie: sid=s1</code>. Round-robin sends it to <b>Server B</b> this time.', reset: true, on: ['C-LB', 'LB-B'], labels: { 'C-LB': 'GET /profile · sid=s1', 'LB-B': 'GET /profile · sid=s1' }, hl: { B: 'cur' }, tags: { A: 'sessions: {s1 → asha}', B: 'sessions: {}', C: 'cookie: sid=s1' } },
          { narr: 'Server B looks up <code>s1</code> in <i>its</i> memory: <span class="c-r">not found</span>. It answers <b>401</b> and the user is thrown back to the login page — even though they did nothing wrong.', reset: true, on: ['LB-B', 'C-LB'], cls: 'bad', keep: 'bad', labels: { 'LB-B': '401 no such session', 'C-LB': '401 → login page' }, hl: { B: 'bad', C: 'bad' }, tags: { A: 'sessions: {s1 → asha}', B: 'unknown sid s1 ✗', C: 'logged out?!' } },
          { narr: 'The session is <b>trapped</b> in Server A. Worse: if A crashes or is replaced in a deploy, every logged-in user on it is logged out. That is the cost of a <b>stateful server</b>. Next visualizer: three fixes.', hl: { A: 'sel' }, tags: { A: 'only A knows s1', B: 'knows nothing' } }
        ] });
      }
    }, {
      title: 'The fixes: sticky sessions, shared store, or self-contained token',
      input: 'token',
      inputLabel: 'Fix to show: sticky, store or token',
      gen: function (input) {
        var mode = String(input || 'token').trim().toLowerCase();
        if (['sticky', 'store', 'token'].indexOf(mode) < 0) throw new Error('Type one of: sticky, store, token');
        if (mode === 'sticky') {
          var e1 = [['C', 'LB', ''], ['LB', 'A', ''], ['LB', 'B', '']], n1 = SNODES(false);
          return story({ label: 'Fix 1 – sticky sessions (session affinity)', height: 60, nodes: n1, edges: e1, steps: [
            { narr: '<b>Fix 1: sticky sessions.</b> The load balancer remembers "this client belongs to Server A" (by cookie or client IP) and always sends them there.', hl: { LB: 'cur' }, tags: { A: 'sessions: {s1}', B: 'sessions: {}', LB: 'pins s1 → A' } },
            { narr: 'Request 2 carries <code>sid=s1</code>. The LB reads the pin and routes to <b>Server A</b>. It works!', on: ['C-LB', 'LB-A'], labels: { 'C-LB': 'sid=s1', 'LB-A': 'sid=s1' }, hl: { A: 'ok' }, tags: { A: 'found s1 ✓', B: 'idle', LB: 'pins s1 → A' } },
            { narr: '<b>But:</b> if Server A crashes or is replaced, the pinned users lose their sessions. And traffic can become lopsided — a busy user keeps hammering one box. It is a patch, not a cure.', reset: true, on: ['LB-A'], cls: 'bad', keep: 'bad', hl: { A: 'bad' }, tags: { A: 'crashed ✗ sessions lost', B: 'idle', LB: 'pins s1 → A' } },
            { narr: 'Verdict: acceptable for small systems or legacy apps, but you pay in failover and balance. Try <code>store</code> or <code>token</code> next.', hl: { LB: 'sel' }, tags: { LB: 'avoid at scale' } }
          ] });
        }
        if (mode === 'store') {
          var e2 = [['C', 'LB', ''], ['LB', 'A', ''], ['LB', 'B', ''], ['A', 'S', ''], ['B', 'S', '']], n2 = SNODES(true);
          return story({ label: 'Fix 2 – shared session store', height: 60, nodes: n2, edges: e2, steps: [
            { narr: '<b>Fix 2: move sessions out of the servers</b> into a shared store, usually Redis. The app servers become identical and forgetful; the store remembers.', hl: { S: 'sel' }, tags: { A: 'no local state', B: 'no local state', S: 's1 → asha' } },
            { narr: 'Login hit Server A. A wrote session <code>s1</code> into Redis and set the cookie.', on: ['C-LB', 'LB-A', 'A-S'], labels: { 'LB-A': 'POST /login', 'A-S': 'SET s1', 'C-LB': 'POST /login' }, hl: { S: 'ok' }, tags: { S: 's1 → asha' } },
            { narr: 'Request 2 (<code>sid=s1</code>) is routed to <b>Server B</b>. B asks Redis "who is s1?"', reset: true, on: ['C-LB', 'LB-B', 'B-S'], labels: { 'C-LB': 'sid=s1', 'LB-B': 'sid=s1', 'B-S': 'GET s1' }, hl: { B: 'cur', S: 'cur' }, tags: { S: 's1 → asha' } },
            { narr: 'Redis answers "asha". B serves the page. <span class="c-g">Any server can handle any request</span>, and a crashed server loses nothing.', reset: true, on: ['B-S', 'LB-B', 'C-LB'], cls: 'ok', keep: 'ok', labels: { 'B-S': 'asha', 'LB-B': '200 OK', 'C-LB': '200 OK' }, hl: { B: 'ok', C: 'ok' }, tags: { B: 'served ✓', S: 'one extra hop' } },
            { narr: 'Cost: one extra network hop per request, and Redis is now a critical dependency — run it replicated, set session TTLs, and expect ~1 ms added latency.', hl: { S: 'sel' }, tags: { S: 'must be highly available' } }
          ] });
        }
        var e3 = [['C', 'LB', ''], ['LB', 'A', ''], ['LB', 'B', '']], n3 = SNODES(false);
        return story({ label: 'Fix 3 – self-contained signed token', height: 60, nodes: n3, edges: e3, steps: [
          { narr: '<b>Fix 3: put the session inside a signed token</b> that the client keeps. The token says who you are and when it expires; the signature proves the server (not you) made it.', hl: { C: 'sel' }, tags: { A: 'secret key K', B: 'secret key K', C: 'token: asha.exp.sig' } },
          { narr: 'Request: <code>GET /profile</code> with <code>Authorization: Bearer asha.exp.sig</code>. The LB picks <b>Server B</b> — any server is fine.', on: ['C-LB', 'LB-B'], labels: { 'C-LB': 'Bearer token', 'LB-B': 'Bearer token' }, hl: { B: 'cur' }, tags: { B: 'verifies signature with K' } },
          { narr: 'B recomputes the signature with the shared key. <span class="c-g">It matches and has not expired</span> — so B trusts "asha" without asking any database or store.', reset: true, on: ['LB-B', 'C-LB'], cls: 'ok', keep: 'ok', labels: { 'LB-B': '200 OK', 'C-LB': '200 OK' }, hl: { B: 'ok', C: 'ok' }, tags: { B: 'no lookup needed', A: 'would work too' } },
          { narr: 'Next request lands on <b>Server A</b>: same check, same result. Scaling = start more servers. No shared session memory at all.', reset: true, on: ['C-LB', 'LB-A'], labels: { 'C-LB': 'Bearer token', 'LB-A': 'Bearer token' }, hl: { A: 'ok' }, tags: { A: 'verifies with K ✓' } },
          { narr: '<b>Trade-offs:</b> tokens can be large (sent on every request), and you cannot easily "log out" one early — so keep them short-lived (e.g. 15 min) with a refresh token, and protect the signing key (environment variable / secrets manager).', hl: { C: 'sel' }, tags: { C: 'short expiry + refresh' } }
        ] });
      }
    }],
    examples: [
      { title: 'Example 1 — The shopping cart: where does it live?', html: `${H.table(['Design', 'Cart stored in', 'Result'], [
        ['Server memory', 'RAM of Server A', 'Cart disappears when the user hits Server B or A restarts'],
        ['Browser (localStorage / cookie)', 'The client', 'Works for guests, but the client can edit it — re-price on the server at checkout'],
        ['Database / Redis keyed by user or cart id', 'Shared store', 'Survives restarts and works on every device; the servers stay stateless']
      ])}<p>The server stays stateless in both good options — the <b>data</b> exists, it just isn't stored <i>inside the app server</i>.</p>` },
      { title: 'Example 2 — Anatomy of a session cookie exchange', html: `<p>Login sets the cookie; the browser then sends it automatically on every later request to the same site.</p>`, code: { lang: 'http', code: `POST /login HTTP/1.1
Host: shop.example.com
Content-Type: application/json

{"email":"asha@example.com","password":"correct-horse-battery"}

HTTP/1.1 200 OK
Set-Cookie: sid=s1x9f2; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=1800
Content-Type: application/json

{"user":"asha"}

GET /profile HTTP/1.1
Host: shop.example.com
Cookie: sid=s1x9f2` } },
      { title: 'Example 3 — What must be shared between servers?', html: `<p>Checklist when you add a second server: </p><ul><li><b>Sessions</b> → Redis or tokens.</li><li><b>Uploaded files</b> → object storage (S3), not the local disk of one server.</li><li><b>In-memory caches</b> → ok per server, but may be stale; shared cache (Redis) for correctness.</li><li><b>Scheduled jobs</b> → run on exactly one instance (leader election / distributed lock), otherwise the nightly email goes out twice.</li><li><b>WebSocket connections</b> → inherently stateful; use a pub/sub bus so any server can push to any user.</li></ul>` },
      { title: 'Example 4 — "Stateless" does not mean "no database"', html: `<p>People mix this up. A stateless <i>service</i> can read and write a database all day. What it must not do is keep <b>request-to-request memory that only it holds</b> (login sessions, half-finished wizards, in-progress uploads, counters). Test: <i>kill the process and start a new one — does any user notice?</i> If not, it's stateless.</p>` }
    ],
    deepDive: `<p>🟣 <b>REST's statelessness constraint.</b> Roy Fielding's REST requires each request to contain everything the server needs to understand it. Benefits: <b>visibility</b> (a monitoring tool can understand a request in isolation), <b>reliability</b> (partial failures are easier), <b>scalability</b> (no session memory). Cost: repeated data per request (tokens), and more work for the client.</p>
<p><b>JWT specifics.</b> A JWT is <code>header.payload.signature</code>, each part base64url-encoded. The payload is <i>readable by anyone</i> — never put secrets in it. Verify the signature, <code>exp</code> (expiry), <code>iss</code> (issuer) and <code>aud</code> (audience), and pin the algorithm (reject <code>alg: none</code>, don't let the token choose). Use asymmetric keys (RS256/ES256) when many services verify but only one issues; HMAC (HS256) shares the secret with every verifier. Revocation strategies: short-lived access tokens (5–15 min) + long-lived, rotating refresh tokens stored server-side; or a small deny-list keyed by token id.</p>
<p><b>Session store design.</b> Redis with a TTL gives automatic expiry; sliding expiry extends the TTL on each use. Store a compact payload (user id, roles version), not the whole user object. Rotate the session id at login (prevents <b>session fixation</b>), invalidate on logout and password change, and keep the cookie <code>HttpOnly; Secure; SameSite</code>.</p>
<p><b>Statelessness vs real-time features.</b> WebSockets, SSE and long polling hold a connection open, so the server <i>does</i> hold per-connection state. At scale, use a message bus (Redis Pub/Sub, Kafka) so a message produced on server A reaches a client connected to server C, and make reconnects cheap. Likewise, streaming LLM responses tie up a connection for many seconds — size your connection limits accordingly.</p>
<p><b>Graceful shutdown.</b> Stateless doesn't mean "kill instantly". On deploy: mark the instance unhealthy so the load balancer stops sending new requests, let in-flight requests finish (connection draining, e.g. Spring's <code>server.shutdown=graceful</code>), then stop. Kubernetes sends SIGTERM, waits <code>terminationGracePeriodSeconds</code>, then SIGKILL.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI chat products show a nice contrast. The <i>HTTP layer is stateless</i>, but a conversation has history. Most providers' chat APIs are stateless too: <b>you</b> send the entire message history with every call, and the server forgets it afterwards. Memory features are built on top by storing history in a database or cache and re-sending it — exactly the "move state to the client or a shared store" idea.</p>
<p><b>Use AI as a partner:</b> ask it to review your design for hidden state: <code>here is my service; list everything stored in process memory that would break if I ran 3 copies</code>. It is good at spotting static maps, local file writes and singletons.</p>
<p><b>Where AI goes wrong:</b> generated tutorials often keep sessions in a static <code>HashMap</code> or a module-level dict ("works on my laptop"), or hard-code a JWT secret in source. They also forget cookie flags and token expiry.</p>
<p><b>What you must still own:</b> choosing where each piece of state lives and why, secret handling (read from <code>System.getenv("TOKEN_SECRET")</code> / <code>process.env.TOKEN_SECRET</code>), and the logout / revocation story. Test by actually running two instances behind a load balancer.</p>`,
    problems: [{
      title: 'Why Does a Stateless Server Scale?',
      level: 'Easy', tags: ['stateless', 'scaling', 'sessions'], companies: ['Netflix', 'Uber'],
      statement: `<p>Your login system stores sessions in a <code>HashMap</code> inside the app server. Marketing launches a sale and traffic will be 10x. You add four more servers behind a load balancer and users start complaining about random logouts. (1) Explain why. (2) Explain, in plain words, why a <b>stateless</b> design scales. (3) Give two ways to fix it and the trade-off of each.</p>`,
      constraints: `Assume round-robin load balancing, 5 servers, 200,000 logged-in users, and that deploys happen daily.`,
      example: `<p>${H.c('r', 'Symptom')}: login hits server 1, next click hits server 4 → server 4 has no session → 401. With 5 servers, a given click lands on the right server only ${H.c('y', '1 in 5')} times, so about ${H.c('r', '80%')} of requests look "logged out".</p>`,
      brute: { why: `<p>"Just give the load balancer sticky sessions and move on" works at first, but a crash or deploy of one server logs out all its users, hot users overload one box, and autoscaling can't remove servers without dropping sessions.</p>` },
      mcq: { q: 'Which change makes the application servers stateless?', options: ['Store sessions in Redis (or in signed tokens) instead of server memory', 'Use bigger servers', 'Increase the JVM heap', 'Turn on HTTP keep-alive'], answer: 0, explain: 'Only moving per-user state out of the process (to a shared store or the client) makes servers interchangeable.' },
      hints: [
        `<p>Hint 1: where does session <code>s1</code> physically live after login? Which server's memory?</p>`,
        `<p>Hint 2: what must be true for the load balancer to send a request to <i>any</i> server? The server must be able to answer using only the request plus a shared place.</p>`,
        `<p>Hint 3: compare three fixes — sticky sessions, shared session store, signed tokens — and note what each costs (failover, an extra hop, revocation).</p>`
      ],
      solution: {
        approach: `<p><b>(1) Why logouts:</b> the session lives only in the RAM of the server that handled login. Round-robin sends the next request to a different server, which has never heard of that session id, so it answers 401. With 5 servers roughly 4 of 5 requests hit the wrong box.</p><p><b>(2) Why stateless scales:</b> if no server keeps per-user memory between requests, every server is identical and interchangeable. The load balancer can send any request anywhere, new servers can be added or removed at will (autoscaling), a crashed server loses nothing, and deploys can replace servers one by one without logging anyone out. Capacity then grows almost linearly with the number of servers; the shared pieces (database, cache) are scaled separately.</p><p><b>(3) Two fixes:</b> <b>Shared session store (Redis)</b> — keeps cookies and server-side control (instant logout, easy revocation) but adds one network hop per request and a new critical dependency to run highly available. <b>Signed token (JWT)</b> — no lookup at all and the best horizontal scaling, but tokens are bigger, can't be revoked instantly (so keep them short-lived plus refresh tokens) and the signing key must be protected. Sticky sessions are a stop-gap only: failover and uneven load remain.</p>`,
        complexity: `<p>Design question. Capacity: stateful ≈ limited by the server holding the session; stateless ≈ N servers give about N times the throughput until the shared store or database becomes the bottleneck.</p>`,
        followUps: ['How would you log a user out immediately with JWTs?', 'What other state besides sessions can break when you add a second server?']
      }
    }]
  });

  /* ================================================================
     TOPIC 7 — Web servers vs app servers (nginx in front of an app)
     ================================================================ */
  topics.push({
    title: 'Web Servers vs App Servers (nginx in Front of Your App)',
    analogy: `<p>A busy restaurant has a <b>host at the door</b> and <b>chefs in the kitchen</b>. The host greets everyone, checks reservations, hands out the printed menu (static stuff), keeps the queue orderly, and politely turns away rude guests. Only when someone actually orders a dish does the host pass the ticket to a chef.</p>
<p>The host is the <b>web server</b> (nginx, Apache, Caddy). The chefs are the <b>app servers</b> (Tomcat running your Spring Boot app, Node.js running Express). The host is great at crowds; the chefs are great at cooking — and you'd never make chefs also manage the door.</p>`,
    explain: `<p>🟢 Two different jobs often get mixed up:</p>
${H.table(['', 'Web server / reverse proxy', 'Application server'], [
  ['<b>Examples</b>', 'nginx, Apache httpd, Caddy, HAProxy, Envoy', 'Tomcat/Jetty/Undertow (Spring Boot), Node.js, Gunicorn/uvicorn (Python)'],
  ['<b>Main job</b>', 'Speak HTTP well: connections, TLS, files, routing, limits', 'Run <i>your</i> code: business rules, auth logic, database calls'],
  ['<b>Good at</b>', 'Thousands of idle connections, static files, compression, caching, load balancing', 'Dynamic responses built from your data'],
  ['<b>Knows about</b>', 'URLs, headers, files', 'Users, orders, payments'],
  ['<b>Scale</b>', 'Very cheap per request', 'More CPU/memory per request']
])}
<p>🔵 <b>What a reverse proxy does</b> (a "reverse proxy" stands in front of servers and talks to clients on their behalf):</p>
<ul>
<li><b>TLS termination</b> — handles https so your app speaks plain http on a private network.</li>
<li><b>Static files</b> — serves images, CSS, JS directly from disk or cache; the app never sees these requests.</li>
<li><b>Load balancing</b> — spreads requests over several app instances and stops sending to dead ones.</li>
<li><b>Compression, caching, rate limits, request size limits, timeouts</b> — protects the app from slow or abusive clients (e.g. "slowloris" clients that dribble bytes).</li>
<li><b>One public door</b> — several apps behind one domain: <code>/api</code> → Spring Boot, <code>/</code> → frontend.</li>
</ul>
<p>🔵 <b>Blurred lines.</b> Spring Boot ships an <i>embedded</i> Tomcat (a web server + servlet container in one jar) and Node can serve files itself. For learning, one process is fine. In production you almost always add a reverse proxy, load balancer or cloud gateway in front, because it does the "door" jobs better and independently of your release cycle.</p>
<p>🔵 <b>A tiny app server in plain Java.</b> Understanding what frameworks do for you starts with seeing a bare-bones one — see the code tabs (it uses only the JDK's built-in <code>com.sun.net.httpserver</code>). Frameworks add routing annotations, JSON binding, validation, security and dependency injection around the same idea: <i>accept a request → run a handler → write a response</i>.</p>
<p>Watch a request take the static path and the dynamic path in the visualizer.</p>`,
    clues: [
      '"What is nginx used for?" → reverse proxy, TLS termination, static files, load balancing, rate limiting',
      '"Why not expose Tomcat/Node directly to the internet?" → TLS, slow-client protection, static offload, zero-downtime restarts, one entry point',
      '"502 vs 504" → 502 = bad/no answer from upstream; 504 = upstream too slow',
      '"Real client IP is always 127.0.0.1" → proxy hides it; read X-Forwarded-For / Forwarded and trust only your proxy',
      '"Serve the frontend and API on one domain" → proxy by path prefix',
      '"Embedded server in Spring Boot" → Tomcat inside the jar; java -jar app.jar starts it'
    ],
    code: [
      { lang: 'java', title: 'Plain Java mini HTTP server (JDK only: com.sun.net.httpserver)', code: `import com.sun.net.httpserver.Headers;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.Executors;

public class MiniServer {
    // The app's "database": in memory, so this demo needs no setup.
    // (A real stateless service would keep this in a shared database.)
    private static final List<String> orders = new CopyOnWriteArrayList<>();

    public static void main(String[] args) throws IOException {
        int port = Integer.parseInt(System.getenv().getOrDefault("PORT", "8080"));
        HttpServer server = HttpServer.create(new InetSocketAddress(port), 0);

        server.createContext("/hello", MiniServer::hello);      // GET /hello?name=Asha
        server.createContext("/orders", MiniServer::orders);    // GET list, POST create
        server.setExecutor(Executors.newFixedThreadPool(8));    // 8 worker threads = 8 requests at once
        server.start();
        System.out.println("Listening on http://localhost:" + port);
    }

    // ---- handler 1: reads a query parameter, returns plain text ----
    static void hello(HttpExchange ex) throws IOException {
        if (!ex.getRequestMethod().equals("GET")) { send(ex, 405, "text/plain", "Only GET allowed", "Allow", "GET"); return; }
        String query = ex.getRequestURI().getRawQuery();                 // "name=Asha" or null
        String name = "world";
        if (query != null && query.startsWith("name=")) name = query.substring(5);
        send(ex, 200, "text/plain; charset=utf-8", "Hello, " + name + "!");
    }

    // ---- handler 2: method dispatch, request body, status codes, headers ----
    static void orders(HttpExchange ex) throws IOException {
        String method = ex.getRequestMethod();
        String path = ex.getRequestURI().getPath();
        if (!path.equals("/orders")) { send(ex, 404, "application/json", "{\\"error\\":\\"not found\\"}"); return; }

        if (method.equals("GET")) {
            List<String> quoted = new ArrayList<>();
            for (String item : orders) quoted.add("\\"" + item.replace("\\"", "") + "\\"");
            send(ex, 200, "application/json", "{\\"orders\\":" + quoted + "}");
        } else if (method.equals("POST")) {
            String ctype = ex.getRequestHeaders().getFirst("Content-Type");
            if (ctype == null || !ctype.startsWith("application/json")) {
                send(ex, 415, "application/json", "{\\"error\\":\\"send application/json\\"}");
                return;
            }
            String body = readBody(ex.getRequestBody(), 10_000);          // cap body size
            if (body == null) { send(ex, 413, "application/json", "{\\"error\\":\\"body too large\\"}"); return; }
            orders.add(body.trim());
            send(ex, 201, "application/json", "{\\"id\\":" + orders.size() + "}", "Location", "/orders/" + orders.size());
        } else {
            send(ex, 405, "application/json", "{\\"error\\":\\"method not allowed\\"}", "Allow", "GET, POST");
        }
    }

    static String readBody(InputStream in, int max) throws IOException {
        byte[] data = in.readNBytes(max + 1);
        return data.length > max ? null : new String(data, StandardCharsets.UTF_8);
    }

    // status line + headers + blank line + body: exactly the HTTP message shape
    static void send(HttpExchange ex, int status, String contentType, String body, String... extraHeaders) throws IOException {
        byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
        Headers h = ex.getResponseHeaders();
        h.set("Content-Type", contentType);
        for (int i = 0; i + 1 < extraHeaders.length; i += 2) h.set(extraHeaders[i], extraHeaders[i + 1]);
        ex.sendResponseHeaders(status, bytes.length);                  // writes status line + headers
        try (OutputStream out = ex.getResponseBody()) { out.write(bytes); }
    }
}` },
      { lang: 'java', title: 'Plain Java client: call it with java.net.http.HttpClient', code: `import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

class CallMiniServer {
    public static void main(String[] args) throws Exception {
        HttpClient client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(2)).build();

        HttpRequest create = HttpRequest.newBuilder(URI.create("http://localhost:8080/orders"))
                .timeout(Duration.ofSeconds(3))                       // never call a server without a timeout
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString("{\\"item\\":\\"book\\",\\"qty\\":2}"))
                .build();
        HttpResponse<String> r1 = client.send(create, HttpResponse.BodyHandlers.ofString());
        System.out.println(r1.statusCode() + " " + r1.headers().firstValue("Location").orElse("-") + " " + r1.body());

        HttpRequest list = HttpRequest.newBuilder(URI.create("http://localhost:8080/orders")).GET().build();
        HttpResponse<String> r2 = client.send(list, HttpResponse.BodyHandlers.ofString());
        System.out.println(r2.statusCode() + " " + r2.body());
    }
}` },
      { lang: 'text', title: 'nginx: reverse proxy + static files + load balancing', code: `# /etc/nginx/conf.d/shop.conf
upstream shop_app {                      # the app servers (could be 1 or 20)
    least_conn;                          # send to the instance with the fewest active requests
    server 10.0.1.11:8080 max_fails=3 fail_timeout=10s;
    server 10.0.1.12:8080 max_fails=3 fail_timeout=10s;
    keepalive 32;                        # reuse connections to the app
}

server {
    listen 80;
    server_name shop.example.com;
    return 301 https://$host$request_uri;          # force https
}

server {
    listen 443 ssl;
    http2 on;                                          # nginx 1.25.1+ (older: "listen 443 ssl http2;")
    server_name shop.example.com;

    ssl_certificate     /etc/ssl/shop/fullchain.pem;   # TLS ends here; the app speaks plain http
    ssl_certificate_key /etc/ssl/shop/privkey.pem;

    client_max_body_size 5m;                           # protect the app from huge uploads
    gzip on;
    gzip_types application/json text/css application/javascript;

    # 1) static files: nginx answers by itself, the app never sees them
    location /static/ {
        root /var/www/shop;
        expires 7d;
        add_header Cache-Control "public";
    }

    # 2) dynamic API: pass to the app servers
    location /api/ {
        proxy_pass http://shop_app;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 2s;                      # fail fast if the app is down -> 502
        proxy_read_timeout    30s;                     # app too slow -> 504
    }
}` },
      { lang: 'js', check: false, title: 'Express (Node.js) app server behind the proxy', code: `const express = require('express');
const app = express();

app.set('trust proxy', 1);              // trust ONE proxy hop so req.ip and req.protocol use X-Forwarded-*
app.use(express.json({ limit: '100kb' }));

app.get('/api/health', (req, res) => res.json({ status: 'UP' }));   // used by the load balancer's health check

app.post('/api/orders', (req, res) => {
  if (!Array.isArray(req.body.items) || req.body.items.length === 0) {
    return res.status(400).json({ error: 'items must be a non-empty array' });
  }
  res.status(201).location('/api/orders/9001').json({ id: 9001, client: req.ip });
});

const port = Number(process.env.PORT || 8080);
app.listen(port, () => console.log('listening on', port));` }
    ],
    codeTitle: ['A mini app server (compiles with the JDK only)', 'A plain-Java HTTP client', 'nginx config (not executed here)', 'Express (framework code)'],
    viz: [{
      title: 'nginx in front of two app servers: static vs dynamic requests',
      input: '/api/orders/42',
      inputLabel: 'URL path to request (e.g. /static/logo.png or /api/orders/42)',
      gen: function (input) {
        var p = String(input || '/api/orders/42').trim();
        if (p.charAt(0) !== '/') throw new Error('Start the path with /, for example /static/logo.png or /api/orders/42');
        p = p.slice(0, 50);
        var isStatic = p.indexOf('/static/') === 0 || /\.(png|jpg|css|js|svg|ico)$/i.test(p);
        var nodes = [bx('C', 'Client', 8, 30), bx('N', 'nginx (web server)', 34, 30), bx('F', 'Static files on disk', 60, 6), bx('A1', 'App server 1', 62, 30), bx('A2', 'App server 2', 62, 54), bx('D', 'Database', 90, 42)];
        var edges = [['C', 'N', ''], ['N', 'F', ''], ['N', 'A1', ''], ['N', 'A2', ''], ['A1', 'D', ''], ['A2', 'D', '']];
        var steps;
        if (isStatic) {
          steps = [
            { narr: 'The browser asks for <code>' + hesc(p) + '</code> — a file that rarely changes.', hl: { C: 'cur' }, tags: { C: 'GET ' + p } },
            { narr: 'The request reaches <b>nginx</b>. TLS is decrypted here. nginx matches <code>location /static/</code> (or the file extension) and knows this is a plain file.', on: ['C-N'], labels: { 'C-N': 'GET ' + p }, hl: { N: 'cur' }, tags: { N: 'TLS ends · matches static rule' } },
            { narr: 'nginx reads the file from disk (or its cache) and replies with <code>Cache-Control: public, max-age=…</code>. <b>The app servers never wake up</b> — they are free for real work.', on: ['N-F'], labels: { 'C-N': 'GET ' + p, 'N-F': 'read file' }, hl: { F: 'sel' }, tags: { F: 'logo.png 18 KB', A1: 'idle', A2: 'idle' } },
            { narr: 'Response <b>200 OK</b> goes straight back. A single nginx can serve thousands of such files per second; a CDN can serve them even closer to the user.', reset: true, on: ['N-F', 'C-N'], cls: 'ok', keep: 'ok', labels: { 'N-F': 'file bytes', 'C-N': '200 OK + Cache-Control' }, hl: { C: 'ok', N: 'ok' }, tags: { C: 'image shown', A1: 'idle', A2: 'idle' } }
          ];
        } else {
          steps = [
            { narr: 'The browser asks for <code>' + hesc(p) + '</code> — dynamic data that depends on the database.', hl: { C: 'cur' }, tags: { C: 'GET ' + p } },
            { narr: 'nginx receives it, terminates TLS and matches <code>location /api/</code> → <b>proxy_pass</b> to the upstream group. It also adds <code>X-Forwarded-For</code> so the app can still see the real client IP.', on: ['C-N'], labels: { 'C-N': 'GET ' + p }, hl: { N: 'cur' }, tags: { N: 'adds X-Forwarded-For' } },
            { narr: 'Load balancing: nginx picks <b>App server 1</b> (least busy). If an instance fails health checks or times out, nginx stops sending it traffic.', on: ['N-A1'], labels: { 'C-N': 'GET ' + p, 'N-A1': 'proxy_pass :8080' }, hl: { A1: 'cur' }, tags: { A1: 'picked', A2: 'standby' } },
            { narr: 'The app server runs your code: auth check, validation, business rules. It needs data, so it queries the <b>database</b>.', on: ['A1-D'], labels: { 'C-N': 'GET ' + p, 'N-A1': 'proxy_pass :8080', 'A1-D': 'SELECT …' }, hl: { D: 'cur' }, tags: { A1: 'your code runs', D: 'row found' } },
            { narr: 'The app builds the JSON and returns <b>200 OK</b> to nginx; nginx compresses it with gzip and relays it. <b>Next request</b> may go to App server 2 — both are identical because the app is stateless.', reset: true, on: ['A1-D', 'N-A1', 'C-N'], cls: 'ok', keep: 'ok', labels: { 'A1-D': 'row', 'N-A1': '200 + JSON', 'C-N': '200 (gzip)' }, hl: { C: 'ok', A1: 'ok' }, tags: { C: 'JSON received', A2: 'ready for next' } },
            { narr: '<b>What if App server 1 had crashed?</b> nginx cannot connect within <code>proxy_connect_timeout</code> and tries the next upstream, or returns <b>502 Bad Gateway</b> if none is alive. If it connects but the app is too slow, the answer is <b>504 Gateway Timeout</b>.', reset: true, on: ['N-A1'], cls: 'bad', keep: 'bad', labels: { 'N-A1': 'connection refused → 502' }, hl: { A1: 'bad', N: 'cur' }, tags: { A1: 'down ✗', A2: 'takes over' } }
          ];
        }
        return story({ label: 'GET ' + p, height: 62, nodes: nodes, edges: edges, steps: steps });
      }
    }, {
      title: 'Who does what? Web server vs app server',
      gen: function () {
        var rows = [
          ['Terminate TLS (https)', 'Web server / proxy', 'App can stay plain http'],
          ['Serve logo.png and CSS', 'Web server / CDN', 'No app code needed'],
          ['Gzip compress responses', 'Web server', 'Saves bandwidth'],
          ['Reject bodies &gt; 5 MB', 'Web server', 'Protects the app early'],
          ['Spread load over 3 instances', 'Web server / load balancer', 'Needs health checks'],
          ['Check the login token', 'App server', 'Needs your user data'],
          ['Calculate the order total', 'App server', 'Business logic'],
          ['Query the database', 'App server', 'Only the app knows SQL/schema'],
          ['Rate limit per IP', 'Web server (coarse) + app (per user)', 'Two layers']
        ];
        var f = [];
        f.push({ narr: 'Rule of thumb: <b>anything that does not need to understand your business goes to the web server</b>; anything that needs your data, users or rules stays in the app server.', parts: [{ type: 'table', label: 'Responsibilities', columns: ['Job', 'Who', 'Note'], rows: rows, hl: {} }] });
        var web = {}, app = {}, both = {};
        rows.forEach(function (r, i) { if (r[1].indexOf('Web') === 0) web[i] = 'win'; else if (r[1].indexOf('App') === 0) app[i] = 'sel'; else both[i] = 'cur'; });
        f.push({ narr: 'Blue rows: <b>web server / proxy</b> jobs. These are generic and the same for every website.', parts: [{ type: 'table', label: 'Responsibilities', columns: ['Job', 'Who', 'Note'], rows: rows, hl: web }] });
        f.push({ narr: 'Purple rows: <b>app server</b> jobs. These are the reason your company exists.', parts: [{ type: 'table', label: 'Responsibilities', columns: ['Job', 'Who', 'Note'], rows: rows, hl: app }] });
        f.push({ narr: 'Amber row: some jobs belong to <b>both layers</b> — a coarse limit at the door, a precise one inside.', parts: [{ type: 'table', label: 'Responsibilities', columns: ['Job', 'Who', 'Note'], rows: rows, hl: both }] });
        return f;
      }
    }, {
      title: 'Step through the mini server\'s handler',
      input: 'POST',
      inputLabel: 'Method to send to /orders (GET, POST or DELETE)',
      gen: function (input) {
        var m = String(input || 'POST').trim().toUpperCase();
        if (['GET', 'POST', 'DELETE'].indexOf(m) < 0) throw new Error('Type GET, POST or DELETE');
        var src = ['void orders(HttpExchange ex) {', '  String method = ex.getRequestMethod();', '  if (method.equals("GET")) {', '    send(ex, 200, listJson());', '  } else if (method.equals("POST")) {', '    String body = readBody(ex);', '    orders.add(body);', '    send(ex, 201, newIdJson());', '  } else {', '    send(ex, 405, "method not allowed");', '  }', '}'].join('\n');
        function cd(hl) { return { type: 'code', label: 'Handler code', lang: 'java', code: src, hl: hl }; }
        var f = [];
        f.push({ narr: 'A request <b>' + m + ' /orders</b> arrives. The JDK server picks a worker thread and calls our <code>orders(ex)</code> handler.', parts: [cd({ 1: 'cur' }), { type: 'vars', label: 'Request', vals: { method: '?', path: '/orders' }, hl: {} }] });
        f.push({ narr: 'We read the method from the request line. It is <b>' + m + '</b>.', parts: [cd({ 2: 'cur' }), { type: 'vars', label: 'Request', vals: { method: m, path: '/orders' }, hl: { method: 'cur' } }] });
        if (m === 'GET') {
          f.push({ narr: 'First branch matches: it is a read.', parts: [cd({ 3: 'ok' }), { type: 'vars', label: 'State', vals: { method: m }, hl: { method: 'ok' } }] });
          f.push({ narr: 'We send <b>200</b> with the list as JSON. Nothing on the server changed (GET is safe).', parts: [cd({ 4: 'ok' }), { type: 'text', html: 'Response: <code>200 OK</code> + <code>{"orders":[…]}</code>' }] });
        } else if (m === 'POST') {
          f.push({ narr: 'The GET check fails, the POST branch matches.', parts: [cd({ 3: 'bad', 5: 'ok' }), { type: 'vars', label: 'State', vals: { method: m }, hl: { method: 'ok' } }] });
          f.push({ narr: 'Read the request body (capped at 10 KB so a client cannot exhaust memory), then store it.', parts: [cd({ 6: 'cur', 7: 'cur' }), { type: 'vars', label: 'State', vals: { body: '{"item":"book"}', stored: 1 }, hl: { stored: 'ok' } }] });
          f.push({ narr: 'Reply <b>201 Created</b> with the new id and a <code>Location</code> header.', parts: [cd({ 8: 'ok' }), { type: 'text', html: 'Response: <code>201 Created</code> · <code>Location: /orders/1</code>' }] });
        } else {
          f.push({ narr: 'Neither GET nor POST matches — we reach the final <code>else</code>.', parts: [cd({ 3: 'bad', 5: 'bad', 9: 'cur' }), { type: 'vars', label: 'State', vals: { method: m }, hl: { method: 'bad' } }] });
          f.push({ narr: 'The path exists but this method is not supported there, so the correct answer is <b>405 Method Not Allowed</b> (not 404) with an <code>Allow: GET, POST</code> header.', parts: [cd({ 10: 'bad' }), { type: 'text', html: 'Response: <code>405 Method Not Allowed</code> · <code>Allow: GET, POST</code>' }] });
        }
        return f;
      }
    }],
    examples: [
      { title: 'Example 1 — Trying the mini server with curl', html: `<p>Compile and start <code>MiniServer</code> (with JDK 21: <code>javac MiniServer.java &amp;&amp; java MiniServer</code>), then in a second terminal:</p>`, code: { lang: 'bash', code: `# plain GET with a query parameter
curl -i "http://localhost:8080/hello?name=Asha"

# create an order (POST + JSON body); look for 201 and the Location header
curl -i -X POST http://localhost:8080/orders \\
     -H "Content-Type: application/json" \\
     -d '{"item":"book","qty":2}'

# list orders
curl -i http://localhost:8080/orders

# wrong method on a known path -> 405 with an Allow header
curl -i -X DELETE http://localhost:8080/orders

# wrong content type -> 415
curl -i -X POST http://localhost:8080/orders -d 'item=book'` } },
      { title: 'Example 2 — Why the app sees 127.0.0.1 for every user', html: `<p>Behind nginx, every connection to the app comes <i>from nginx</i>. So <code>request.getRemoteAddr()</code> is nginx's address for all users — rate limits and audit logs become useless. The proxy passes the real address in <code>X-Forwarded-For</code>. Configure the framework to trust <b>only your proxy</b> (Spring: <code>server.forward-headers-strategy=framework</code>; Express: <code>app.set('trust proxy', 1)</code>). If you trust the header blindly, any client can fake it.</p>${H.table(['Header', 'Value', 'Meaning'], [['X-Forwarded-For', '198.51.100.7, 10.0.0.5', 'Original client, then each proxy hop'], ['X-Forwarded-Proto', 'https', 'Client used https (nginx ended TLS)'], ['Host', 'shop.example.com', 'Original host the client asked for']])}` },
      { title: 'Example 3 — Reading the error: 502, 503 or 504?', html: `${H.table(['What you see', 'Meaning', 'First check'], [
        ['<b>502 Bad Gateway</b>', 'nginx could not get a valid answer: app down, wrong port, crashed mid-reply', '<code>systemctl status app</code>, app logs, port in <code>proxy_pass</code>'],
        ['<b>503 Service Unavailable</b>', 'All upstreams marked down, or the app/nginx deliberately shed load', 'Health checks, <code>max_fails</code>, connection limits'],
        ['<b>504 Gateway Timeout</b>', 'The app answered too slowly (<code>proxy_read_timeout</code>)', 'Slow queries, blocked threads, downstream API calls']
      ])}` },
      { title: 'Example 4 — One domain, many apps (path-based routing)', html: `<p>A typical setup: the React build is static files, the API is Spring Boot, an admin tool is a separate service. nginx routes by path so the browser sees one origin (which also avoids CORS headaches).</p>`, code: { lang: 'text', code: `location /        { root /var/www/frontend; try_files $uri /index.html; }   # single-page app
location /api/    { proxy_pass http://shop_app; }                          # Spring Boot
location /admin/  { proxy_pass http://127.0.0.1:9000; auth_basic "admin"; } # internal tool` } }
    ],
    deepDive: `<p>🟣 <b>Connection models.</b> nginx is event-driven: a few worker processes each handle thousands of connections with non-blocking I/O (epoll), so an idle keep-alive connection costs kilobytes. Classic Tomcat (thread-per-request) pays a thread for each active request, hence the importance of tuning <code>server.tomcat.threads.max</code> (default 200). Putting nginx in front lets slow clients (mobile, slowloris) occupy nginx connections instead of your precious app threads — it buffers the whole request before passing it on (<code>proxy_request_buffering</code>) and the response back to the slow client (<code>proxy_buffering</code>).</p>
<p><b>Timeouts are a design decision.</b> Every hop needs a timeout, and they should shrink inward: client 30 s &gt; nginx <code>proxy_read_timeout</code> 25 s &gt; app's DB/HTTP-client timeouts 5–10 s. Otherwise a slow database makes requests pile up until threads run out, and the whole site goes down because of one dependency. Add retries only for idempotent requests, with budgets.</p>
<p><b>Health checks and graceful shutdown.</b> A load balancer needs a cheap <code>/health</code> endpoint (liveness: "process is up"; readiness: "can serve traffic — DB reachable, caches warm"). During a deploy: readiness fails → LB drains → in-flight requests finish → process exits. Without this, every deploy drops a few requests.</p>
<p><b>Real client IP and security.</b> Trust <code>X-Forwarded-For</code> only from known proxy addresses; the <i>last</i> untrusted entry is the client. Strip incoming copies of these headers at the edge. Never route external traffic straight to an admin port. Add security headers (HSTS, CSP) at the proxy and keep TLS config modern (TLS 1.2+ / 1.3).</p>
<p><b>Modern equivalents.</b> In Kubernetes the "web server in front" becomes an <b>Ingress controller</b> (often nginx or Envoy) or a <b>Gateway API</b> implementation; in the cloud it is an Application Load Balancer or API Gateway; a service mesh adds a sidecar proxy to every pod. The concepts — TLS termination, routing, health checks, timeouts, retries — are identical. Also remember the mini server's <code>com.sun.net.httpserver</code> is for demos and tests; production Java uses Tomcat/Jetty/Netty via Spring Boot, Quarkus, Micronaut, etc.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI features lean hard on this layer. Streaming LLM replies (Server-Sent Events) break if a proxy <b>buffers</b> responses — you must disable buffering (<code>proxy_buffering off</code>, <code>X-Accel-Buffering: no</code>) and raise read timeouts for long generations. Model gateways ("LLM gateways") are reverse proxies that add auth, rate limiting, caching, cost tracking and failover across model providers — the same pattern as nginx in front of an app.</p>
<p><b>Use AI as a partner:</b> ask it to explain an nginx config line by line, to convert a config into a Kubernetes Ingress, or to analyse an access log excerpt for slow endpoints. Always ask <code>what could go wrong with this config?</code>.</p>
<p><b>Where AI goes wrong:</b> it invents directives that don't exist, mixes Apache and nginx syntax, forgets to forward <code>Host</code>/<code>X-Forwarded-*</code>, pastes private keys or passwords into example configs, and recommends turning off TLS verification "to make it work". Validate with <code>nginx -t</code> before reload.</p>
<p><b>What you must still own:</b> timeouts, limits, and who is trusted (which proxy, which header). Keep certificates and secrets out of git and chat; load them from the environment or a secrets manager (<code>System.getenv("DB_PASSWORD")</code>).</p>`,
    problems: [{
      title: 'Put nginx in Front of an App Server',
      level: 'Medium', tags: ['nginx', 'reverse proxy', 'deployment'], companies: ['Shopify', 'Cloudflare'],
      statement: `<p>You have a Spring Boot app on port 8080 (two instances: 10.0.1.11 and 10.0.1.12) and a folder of images and JS/CSS. Users type <code>https://shop.example.com</code>. Describe (and sketch the nginx config for) how nginx should: redirect http to https, terminate TLS, serve <code>/static/</code> itself, proxy <code>/api/</code> to both instances, pass the real client IP, and fail fast when an instance is down. Then say what status codes users see in each failure case.</p>`,
      constraints: `No code changes in the app. Certificates exist at /etc/ssl/shop/. Max upload 5 MB. App can take up to 30 s on the slowest endpoint.`,
      example: `<p>${H.c('b', 'GET /static/app.js')} → answered by nginx from disk, app untouched. ${H.c('g', 'GET /api/orders/42')} → proxied to 10.0.1.11 or .12. ${H.c('r', 'Both instances down')} → <b>502</b>/<b>503</b> from nginx.</p>`,
      brute: { why: `<p>Exposing Tomcat directly on port 443: the app must handle TLS, serve every image (burning request threads), has no cheap load balancing, and a slow client can hold a thread for minutes. A deploy restarts the only entry point and users see errors.</p>` },
      mcq: { q: 'The app is up but one endpoint takes 90 s while proxy_read_timeout is 30 s. What do users get from nginx?', options: ['504 Gateway Timeout', '502 Bad Gateway', '404 Not Found', '200 OK with partial data'], answer: 0, explain: 'nginx connected fine but gave up waiting for the upstream response within the read timeout: 504.' },
      hints: [
        `<p>Hint 1: split traffic by path. Anything under <code>/static/</code> is a file; anything under <code>/api/</code> is dynamic.</p>`,
        `<p>Hint 2: define an <code>upstream</code> block with both instances; use <code>proxy_pass</code> to it and set Host and X-Forwarded-* headers so the app sees real info.</p>`,
        `<p>Hint 3: set timeouts in layers — short connect timeout (2 s) so a dead instance fails fast, read timeout slightly above the slowest endpoint (30 s), and <code>client_max_body_size 5m</code>.</p>`
      ],
      solution: {
        approach: `<p><b>Plan:</b> (1) an <code>upstream shop_app</code> listing both instances with <code>max_fails</code>/<code>fail_timeout</code> so a dead one is skipped; (2) a port-80 server that returns <code>301</code> to https; (3) a port-443 server with the certificate paths, <code>client_max_body_size 5m</code> and gzip; (4) <code>location /static/</code> using <code>root</code>, <code>expires 7d</code>; (5) <code>location /api/</code> with <code>proxy_pass http://shop_app</code>, <code>proxy_http_version 1.1</code>, headers <code>Host</code>, <code>X-Forwarded-For</code>, <code>X-Forwarded-Proto</code>, <code>proxy_connect_timeout 2s</code> and <code>proxy_read_timeout 30s</code>. Then configure Spring Boot to trust forwarded headers (<code>server.forward-headers-strategy=framework</code>) and expose <code>/actuator/health</code> for checks.</p><p><b>What users see:</b> one instance down → nginx retries the other, users notice nothing. Both down → <b>502</b> (connection refused) or <b>503</b> if marked unavailable. App too slow (&gt;30 s) → <b>504</b>. Upload larger than 5 MB → <b>413</b> from nginx before the app is touched. Validate the file with <code>nginx -t</code> before <code>nginx -s reload</code>; reload is graceful, so no dropped requests.</p>`,
        code: { lang: 'text', code: `upstream shop_app {
    server 10.0.1.11:8080 max_fails=3 fail_timeout=10s;
    server 10.0.1.12:8080 max_fails=3 fail_timeout=10s;
}
server { listen 80; server_name shop.example.com; return 301 https://$host$request_uri; }
server {
    listen 443 ssl;
    server_name shop.example.com;
    ssl_certificate     /etc/ssl/shop/fullchain.pem;
    ssl_certificate_key /etc/ssl/shop/privkey.pem;
    client_max_body_size 5m;
    location /static/ { root /var/www/shop; expires 7d; }
    location /api/ {
        proxy_pass http://shop_app;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 2s;
        proxy_read_timeout 30s;
    }
}` },
        complexity: `<p>Throughput: nginx handles tens of thousands of connections per core; the app is the limit for dynamic requests (about threads ÷ average latency per instance). Two instances roughly double that limit and add failover.</p>`,
        followUps: ['How would you do a zero-downtime deploy with this setup?', 'How would you add per-IP rate limiting at the proxy?']
      }
    }]
  });

  /* ================================================================
     PRACTICE (14): 4 Easy, 6 Medium, 4 Hard
     ================================================================ */
  practice.push({
    title: 'Read a Response From the Network Tab', level: 'Easy', tags: ['http', 'status codes', 'debugging'], companies: ['Atlassian', 'Zomato'],
    statement: `<p>A teammate pastes these two responses from the browser's Network tab and asks "what happened and who must fix it?". Explain each in two or three sentences: what the status means, which side is at fault, and what the client should do next.</p>
<pre>HTTP/1.1 401 Unauthorized
WWW-Authenticate: Bearer
Content-Type: application/json

{"error":"token expired"}

HTTP/1.1 502 Bad Gateway
Server: nginx
Content-Type: text/html

&lt;html&gt;&lt;h1&gt;502 Bad Gateway&lt;/h1&gt;&lt;/html&gt;</pre>`,
    constraints: `Use only what is visible in the messages (status line, headers, body).`,
    example: `<p>${H.c('y', '401')} → client side: the credential is missing or expired → refresh/log in, retry. ${H.c('r', '502')} → server side: nginx could not get a good answer from the app behind it → not the user's fault.</p>`,
    brute: { why: `<p>A weak answer says "both are errors, try again". That misses that 401 means <i>change something and retry</i> (new token) while retrying a 502 unchanged may work once the app recovers — different actions, different owners.</p>` },
    mcq: { q: 'Which header tells the client how to authenticate after a 401?', options: ['WWW-Authenticate', 'Retry-After', 'Location', 'Allow'], answer: 0, explain: 'WWW-Authenticate describes the accepted scheme (Bearer, Basic...). Retry-After is for 429/503, Location for redirects/201, Allow for 405.' },
    hints: [
      `<p>Hint 1: read the first digit of each status code: 4 = caller must change something, 5 = server side trouble.</p>`,
      `<p>Hint 2: look at the headers — <code>Server: nginx</code> on the 502 tells you the failure is at the proxy, between nginx and the app.</p>`,
      `<p>Hint 3: for each response write: meaning, who fixes it, what the client does next (refresh token vs retry later with backoff).</p>`
    ],
    solution: {
      approach: `<p><b>First response (401, JSON "token expired"):</b> the server does not accept the credential because the access token has expired. It is a client-side issue: the client should use its refresh token (or send the user to log in) to get a new token and then repeat the same request. Retrying the identical request would fail again.</p><p><b>Second response (502, Server: nginx, HTML body):</b> nginx is up but the application behind it returned nothing valid — crashed, restarting, wrong port, or closed the connection mid-reply. The user did nothing wrong. The client may retry a few times with exponential backoff; the owner of the service must check the app process and logs. Note the HTML error page: it came from nginx, not from the app, which would have returned JSON — a useful debugging clue.</p>`,
      complexity: `<p>No code; the skill is reading status family + headers + body source to locate the fault quickly.</p>`
    }
  });

  practice.push({
    title: 'Safe, Idempotent or Neither?', level: 'Easy', tags: ['http methods', 'idempotency'], companies: ['Stripe', 'Amazon'],
    statement: `<p>Classify each operation as <b>safe</b> (no change), <b>idempotent</b> (repeat = same state) or <b>neither</b>: (a) <code>GET /orders/5</code> (b) <code>PUT /users/7 {"name":"Asha"}</code> (c) <code>POST /orders</code> (d) <code>DELETE /orders/5</code> (e) <code>PATCH /cart {"qty": 3}</code> (f) <code>PATCH /cart {"qtyDelta": +1}</code> (g) <code>POST /emails/send</code> (h) <code>HEAD /files/a.pdf</code>.</p>`,
    constraints: `Think about the server state after 1 call versus after 2 identical calls.`,
    example: `<p>${H.c('g', '(a) GET')} → safe (and therefore idempotent). ${H.c('r', '(c) POST /orders')} → neither: two calls make two orders.</p>`,
    brute: { why: `<p>Guessing from the verb alone ("PATCH is always idempotent", "DELETE is unsafe so unsafe to retry") misses that the <b>body</b> matters: setting a value is idempotent, adding a delta is not.</p>` },
    mcq: { q: 'DELETE /orders/5 returns 204 the first time and 404 the second. Is DELETE idempotent?', options: ['Yes - the server state is the same after one or many calls', 'No - the responses differ', 'Only if the second call returns 204', 'Only for GET'], answer: 0, explain: 'Idempotency is about the resulting state on the server, not about getting identical response codes.' },
    hints: [
      `<p>Hint 1: does it change data at all? If not, it is safe.</p>`,
      `<p>Hint 2: for changing operations, apply it twice in your head and compare the final state to applying it once.</p>`,
      `<p>Hint 3: operations that create something new or send something each time (orders, emails, deltas) are not idempotent unless protected by an idempotency key.</p>`
    ],
    solution: {
      approach: `<ul><li><b>(a) GET</b> — safe (and idempotent).</li><li><b>(b) PUT</b> — idempotent: same replacement twice gives the same user.</li><li><b>(c) POST /orders</b> — neither: each call creates another order.</li><li><b>(d) DELETE</b> — idempotent: after the first call the order is gone, further calls change nothing (response may be 404).</li><li><b>(e) PATCH {"qty":3}</b> — idempotent because it sets an absolute value.</li><li><b>(f) PATCH {"qtyDelta":+1}</b> — neither: every repeat adds another unit.</li><li><b>(g) POST /emails/send</b> — neither: every call sends another email; add an idempotency key or dedupe on the server.</li><li><b>(h) HEAD</b> — safe (reads metadata only) and idempotent.</li></ul><p>Rule: safe ⊂ idempotent. Retry automatically only idempotent requests; protect the rest with keys.</p>`,
      complexity: `<p>No code. Mental model: compare state after one call with state after two.</p>`
    }
  });

  practice.push({
    title: 'Take a URL Apart', level: 'Easy', tags: ['url', 'http', 'java'], companies: ['Google', 'Microsoft'],
    statement: `<p>For <code>https://shop.example.com:8443/api/orders/42?expand=items&amp;lang=en#reviews</code> name the scheme, host, port, path, query string and fragment. Which of them are sent to the server in the request line / Host header, and which are not? Verify with a few lines of Java.</p>`,
    constraints: `Use only java.net.URI. Assume HTTP/1.1.`,
    example: `${H.table(['Part', 'Value', 'Sent to server?'], [['scheme', 'https', 'no (chooses TLS + port)'], ['host', 'shop.example.com', 'yes, in Host header'], ['port', '8443', 'in Host header'], ['path', '/api/orders/42', 'yes, request line'], ['query', 'expand=items&amp;lang=en', 'yes, request line'], ['fragment', 'reviews', '<span class="c-r">never</span>']])}`,
    brute: { why: `<p>Cutting the URL with string splits on "/" or ":" fails: the port, the "?" and the "#" appear in unpredictable places and optional parts (user info, missing port) break the logic. A real URI parser handles these cases.</p>` },
    mcq: { q: 'Which URL part never leaves the browser?', options: ['The fragment after #', 'The query string', 'The path', 'The host'], answer: 0, explain: 'The fragment is processed by the browser only (scroll to an element or client-side routing). It is not part of the HTTP request.' },
    hints: [
      `<p>Hint 1: the order is always scheme → host → port → path → query → fragment.</p>`,
      `<p>Hint 2: what does the request line contain? Method, path + query, version. What goes into the Host header? host[:port].</p>`,
      `<p>Hint 3: use <code>URI.create(...)</code> and the getters; <code>getRawQuery()</code> keeps percent-encoding intact.</p>`
    ],
    solution: {
      approach: `<p>Scheme <code>https</code>, host <code>shop.example.com</code>, port <code>8443</code>, path <code>/api/orders/42</code>, query <code>expand=items&amp;lang=en</code>, fragment <code>reviews</code>. The client resolves the host with DNS, connects to port 8443 over TLS (scheme), then sends <code>GET /api/orders/42?expand=items&amp;lang=en HTTP/1.1</code> with <code>Host: shop.example.com:8443</code>. The fragment is kept by the browser and never transmitted. Java's <code>URI</code> class exposes each part directly.</p>`,
      code: `import java.net.URI;

class UrlParts {
    public static void main(String[] args) {
        URI u = URI.create("https://shop.example.com:8443/api/orders/42?expand=items&lang=en#reviews");
        System.out.println("scheme   = " + u.getScheme());
        System.out.println("host     = " + u.getHost());
        System.out.println("port     = " + u.getPort());
        System.out.println("path     = " + u.getPath());
        System.out.println("query    = " + u.getRawQuery());
        System.out.println("fragment = " + u.getFragment() + "  (never sent to the server)");
        System.out.println("request line: GET " + u.getRawPath() + "?" + u.getRawQuery() + " HTTP/1.1");
        System.out.println("Host header : " + u.getHost() + ":" + u.getPort());
    }
}`,
      complexity: `<p>O(length of the URL) to parse.</p>`
    }
  });

  practice.push({
    title: 'Web Server or App Server?', level: 'Easy', tags: ['nginx', 'architecture'], companies: ['Cloudflare', 'Walmart'],
    statement: `<p>Decide whether each job belongs mainly in the <b>web server / reverse proxy</b> (nginx) or the <b>application server</b> (Spring Boot / Node): (1) terminate TLS, (2) serve product images, (3) apply a discount coupon, (4) gzip responses, (5) check if the user may see an order, (6) forward <code>/api</code> to 3 instances, (7) charge a credit card, (8) reject a 200 MB upload.</p>`,
    constraints: `One word per item plus a one-line reason.`,
    example: `<p>(1) ${H.c('b', 'Web server')} — generic, same for every site. (3) ${H.c('p', 'App server')} — business rule.</p>`,
    brute: { why: `<p>Doing everything in the app server wastes expensive application threads on serving files and TLS, and makes every deploy risk the public entry point.</p>` },
    mcq: { q: 'Which task is best left to the app server?', options: ['Deciding whether a coupon is valid for this cart', 'Serving /static/logo.png', 'Compressing JSON', 'Terminating TLS'], answer: 0, explain: 'Coupon rules are business logic that needs your data. The others are generic jobs the proxy does better.' },
    hints: [
      `<p>Hint 1: does the job need to know about your users, products or money? If yes, app server.</p>`,
      `<p>Hint 2: generic HTTP plumbing (TLS, files, compression, balancing, size limits) is the web server's strength.</p>`,
      `<p>Hint 3: for "reject a huge upload" think where it is cheapest to say no — before the request reaches the app.</p>`
    ],
    solution: {
      approach: `<ol><li><b>Web server</b> — TLS termination is generic plumbing; the app can speak plain http inside the private network.</li><li><b>Web server (or CDN)</b> — static files are read from disk with no logic.</li><li><b>App server</b> — the coupon rule needs catalog, cart and customer data.</li><li><b>Web server</b> — compression is generic.</li><li><b>App server</b> — authorization depends on who owns the order.</li><li><b>Web server</b> — load balancing across upstream instances with health checks.</li><li><b>App server</b> — payment logic and calls to the payment provider.</li><li><b>Web server</b> — <code>client_max_body_size</code> rejects with 413 before the app spends threads on it.</li></ol><p>Rule: generic HTTP concerns at the door, business concerns inside.</p>`,
      complexity: `<p>No code. The reasoning pattern: "does this job need business knowledge?"</p>`
    }
  });

  practice.push({
    title: 'Mini Router: 404 vs 405', level: 'Medium', tags: ['routing', 'java', 'http methods'], companies: ['Atlassian', 'Uber'],
    statement: `<p>Write a tiny <code>Router</code> in plain Java. You register handlers with <code>add(method, path, handler)</code>. <code>dispatch(method, path)</code> must return <b>200 + handler result</b> when both match, <b>405 + an Allow header</b> when the path exists for other methods only, and <b>404</b> when the path is unknown. Path matching is exact.</p>`,
    constraints: `Up to 1,000 routes; O(1) average lookup per request. No frameworks.`,
    example: `${H.table(['Registered', 'Request', 'Result'], [['GET /orders, POST /orders', 'GET /orders', '200 list'], ['GET /orders, POST /orders', 'DELETE /orders', '<span class="c-y">405</span> Allow: GET, POST'], ['GET /orders', 'GET /users', '<span class="c-r">404</span>']])}`,
    brute: { why: `<p>A single list of (method, path) pairs scanned for each request is O(routes). Worse, a lookup that only compares method+path cannot tell "path unknown" from "wrong method", so everything becomes 404.</p>` },
    mcq: { q: 'The path /orders exists but only for GET and POST. A client sends DELETE. Correct answer?', options: ['405 Method Not Allowed with Allow: GET, POST', '404 Not Found', '400 Bad Request', '500 Internal Server Error'], answer: 0, explain: '405 means the resource exists but not for this method; Allow lists what is supported.' },
    hints: [
      `<p>Hint 1: first look up the path alone; that tells you whether the path exists at all.</p>`,
      `<p>Hint 2: store <code>Map&lt;String path, Map&lt;String method, Handler&gt;&gt;</code>.</p>`,
      `<p>Hint 3: path missing → 404; path found but method missing → 405 and join the map's keys into the Allow header; otherwise call the handler.</p>`
    ],
    solution: {
      approach: `<p>Use a two-level map: path → (method → handler). Dispatch does at most two hash lookups. If the first lookup misses, the path is unknown (404). If the path exists but the method map has no entry, return 405 and build the <code>Allow</code> header from the sorted method names (also required by the HTTP spec). Otherwise invoke the handler. Normalise the method to upper case first. Real frameworks add path variables (<code>/orders/{id}</code>) using a trie or regex table, but the 404-versus-405 distinction works exactly like this.</p>`,
      code: `import java.util.*;
import java.util.function.Supplier;

class Router {
    record Response(int status, String body, Map<String, String> headers) {}

    private final Map<String, Map<String, Supplier<String>>> routes = new HashMap<>();

    void add(String method, String path, Supplier<String> handler) {
        routes.computeIfAbsent(path, p -> new TreeMap<>()).put(method.toUpperCase(), handler);
    }

    Response dispatch(String method, String path) {
        Map<String, Supplier<String>> byMethod = routes.get(path);
        if (byMethod == null) {
            return new Response(404, "{\\"error\\":\\"not found\\"}", Map.of());          // unknown path
        }
        Supplier<String> handler = byMethod.get(method.toUpperCase());
        if (handler == null) {                                                         // path known, method not
            String allow = String.join(", ", byMethod.keySet());
            return new Response(405, "{\\"error\\":\\"method not allowed\\"}", Map.of("Allow", allow));
        }
        return new Response(200, handler.get(), Map.of());
    }

    public static void main(String[] args) {
        Router r = new Router();
        r.add("GET", "/orders", () -> "[]");
        r.add("POST", "/orders", () -> "{\\"id\\":1}");
        System.out.println(r.dispatch("GET", "/orders"));
        System.out.println(r.dispatch("DELETE", "/orders"));
        System.out.println(r.dispatch("GET", "/users"));
    }
}`,
      complexity: `<p>Time O(1) average per dispatch (two hash lookups); space O(routes).</p>`,
      followUps: ['How would you support path variables like /orders/{id}?', 'How would you answer OPTIONS automatically?']
    }
  });

  practice.push({
    title: 'Which Status Code for Each Broken Request?', level: 'Medium', tags: ['status codes', 'validation', 'http'], companies: ['Cloudflare', 'Shopify'],
    statement: `<p>Your server receives these broken requests. Choose the status code (and header if needed) for each: (1) request line is <code>GET/orders</code> with no spaces, (2) <code>POST /orders</code> with <code>Content-Type: text/plain</code> to a JSON-only endpoint, (3) valid JSON but <code>qty: -2</code>, (4) a 40 MB body when the limit is 5 MB, (5) <code>POST</code> with a body but no <code>Content-Length</code> or chunking, (6) a 20 KB single header line when the limit is 8 KB, (7) <code>PUT /orders/5</code> when the order was changed by someone else since the client read it (If-Match fails), (8) an unknown protocol version <code>HTTP/9.9</code>.</p>`,
    constraints: `Pick the most specific standard code. Explain in one line.`,
    example: `<p>(2) ${H.c('y', '415 Unsupported Media Type')} — the server understands the request but not the body format.</p>`,
    brute: { why: `<p>Returning 400 or 500 for every problem hides what is wrong. A client library (or a human) needs the specific code to know whether to change the format, shrink the body, re-read the resource, or give up.</p>` },
    mcq: { q: 'The client sends If-Match with a stale ETag on PUT. Best status?', options: ['412 Precondition Failed', '404 Not Found', '401 Unauthorized', '304 Not Modified'], answer: 0, explain: 'The precondition the client set (If-Match) is false, so the server refuses with 412.' },
    hints: [
      `<p>Hint 1: classify into "cannot parse at all" (400), "parsed but unacceptable format" (415), "too big" (413/431), "precondition" (412), "bad values" (422/400).</p>`,
      `<p>Hint 2: size limits have dedicated codes: 413 for the body, 431 for headers.</p>`,
      `<p>Hint 3: version problems → 505; missing length on a body-carrying request → 411.</p>`
    ],
    solution: {
      approach: `<ol><li><b>400 Bad Request</b> — the request line is malformed and cannot be parsed.</li><li><b>415 Unsupported Media Type</b> — wrong Content-Type; optionally list accepted types.</li><li><b>422 Unprocessable Content</b> (many teams use 400) — syntax fine, value breaks a rule.</li><li><b>413 Content Too Large</b> — over the body limit; best rejected by nginx before the app.</li><li><b>411 Length Required</b> — the server needs Content-Length or chunked encoding to know where the body ends.</li><li><b>431 Request Header Fields Too Large</b>.</li><li><b>412 Precondition Failed</b> — optimistic-concurrency check failed; the client must re-read and merge. (Use 428 if the If-Match header was required but missing.)</li><li><b>505 HTTP Version Not Supported</b>.</li></ol><p>Always return a small JSON error body (RFC 9457 style) stating the field or limit involved.</p>`,
      complexity: `<p>No code; this table can drive an exception-to-status mapper (e.g. Spring's @ExceptionHandler).</p>`
    }
  });

  practice.push({
    title: 'Cookie Flags: Pick and Defend', level: 'Medium', tags: ['cookies', 'security', 'sessions'], companies: ['Okta', 'Adobe'],
    statement: `<p>Your login endpoint sets a session cookie. Choose the attributes (<code>HttpOnly</code>, <code>Secure</code>, <code>SameSite</code>, <code>Path</code>, <code>Max-Age</code>, <code>Domain</code>) and explain which attack each one blunts. Then show the exact <code>Set-Cookie</code> header and what you would change for a cross-site embedded widget.</p>`,
    constraints: `Site is https only. Frontend and API are both on shop.example.com. Session should last 30 minutes of inactivity.`,
    example: `<p>${H.c('g', 'Set-Cookie: sid=…; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=1800')}</p>`,
    brute: { why: `<p>A plain <code>Set-Cookie: sid=abc</code> can be read by any injected script (XSS), sent over http where it is sniffed, and attached to cross-site requests (CSRF).</p>` },
    mcq: { q: 'Which attribute stops JavaScript from reading the cookie (blunting XSS theft)?', options: ['HttpOnly', 'Secure', 'SameSite', 'Path'], answer: 0, explain: 'HttpOnly hides the cookie from document.cookie. Secure is about https only; SameSite limits cross-site sending.' },
    hints: [
      `<p>Hint 1: think of three attackers — someone sniffing the network, a malicious script on the page, and a malicious other website.</p>`,
      `<p>Hint 2: one attribute defends against each: Secure, HttpOnly, SameSite.</p>`,
      `<p>Hint 3: Domain widens the cookie's reach, which is usually unwanted; omit it. A cross-site widget needs SameSite=None (which requires Secure) plus extra CSRF protection.</p>`
    ],
    solution: {
      approach: `<p><b>Header:</b> <code>Set-Cookie: sid=&lt;random id&gt;; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=1800</code>.</p><ul><li><b>HttpOnly</b> — scripts cannot read it, so an XSS bug can't simply steal the session.</li><li><b>Secure</b> — sent only over https, so a coffee-shop sniffer never sees it.</li><li><b>SameSite=Lax</b> — not sent on cross-site POSTs/subresource requests, which blocks most CSRF while still working when users click a link to your site. (<b>Strict</b> is safer, but the browser does not send the cookie when the user arrives from a link on another site, such as an email. They look logged out on that first page.)</li><li><b>Path=/</b> — whole site; <b>no Domain</b> attribute — the cookie stays host-only and doesn't leak to sibling subdomains.</li><li><b>Max-Age</b> — bounds the lifetime; re-issue on activity for a sliding window.</li></ul><p><b>Cross-site widget:</b> it needs <code>SameSite=None; Secure</code> (third-party contexts), and then you must add real CSRF tokens and keep the cookie as narrow as possible. Also rotate the session id on login (session fixation) and delete it on logout.</p>`,
      complexity: `<p>No code. These attributes are free to add and remove whole attack classes.</p>`
    }
  });

  practice.push({
    title: 'Idempotency-Key for POST /payments', level: 'Medium', tags: ['idempotency', 'java', 'payments'], companies: ['Stripe', 'Razorpay'],
    statement: `<p>Implement the server-side logic that makes <code>POST /payments</code> safe to retry. If the same <code>Idempotency-Key</code> arrives again, return the <b>original response</b> without charging twice. Concurrent duplicates must also charge only once. Write it in plain Java with an in-memory store.</p>`,
    constraints: `Keys up to 64 chars. Single JVM for this exercise (mention what changes with many servers). Charging takes ~200 ms.`,
    example: `${H.table(['Call', 'Key', 'Result'], [['1', 'k-1', 'charges, returns 201 {paymentId:P1}'], ['2 (retry)', 'k-1', 'returns the same 201 {paymentId:P1}, no new charge'], ['3', 'k-2', 'charges again, {paymentId:P2}']])}`,
    brute: { why: `<p>Checking <code>if (!seen.contains(key)) { charge(); seen.add(key); }</code> has a race: two concurrent retries both see "not seen" and both charge. The check and the insert must be one atomic step.</p>` },
    mcq: { q: 'Which Java tool makes "check key, else compute and store" atomic per key?', options: ['ConcurrentHashMap.computeIfAbsent', 'HashMap.get then put', 'a volatile boolean', 'Thread.sleep'], answer: 0, explain: 'computeIfAbsent runs the function at most once per key atomically, so concurrent duplicates wait and share the result.' },
    hints: [
      `<p>Hint 1: store the <i>result</i> against the key, not just the key.</p>`,
      `<p>Hint 2: the first request with a key must "win" and do the work; later ones reuse its result.</p>`,
      `<p>Hint 3: use <code>ConcurrentHashMap&lt;String, CompletableFuture&lt;Result&gt;&gt;</code> or <code>computeIfAbsent</code>. Also store a fingerprint of the body: same key with a different body should be rejected (422/409).</p>`
    ],
    solution: {
      approach: `<p>Keep a map from key to the stored outcome. <code>computeIfAbsent(key, k -> charge(...))</code> guarantees the charge function runs at most once for a key even when many threads race, because the map locks that bin; others block and then read the same value. Store the body hash with the result and, on a repeat with a different body, answer 422 so clients cannot reuse a key by mistake. In production the map becomes a shared store (a database table with a unique key, or Redis <code>SET key value NX EX 86400</code>) so the guarantee holds across many servers, entries get a TTL (24 h), and an "in progress" marker handles crashes between charging and saving the result.</p>`,
      code: `import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

class PaymentService {
    record Result(int status, String body, int bodyHash) {}

    private final ConcurrentHashMap<String, Result> done = new ConcurrentHashMap<>();
    private final AtomicInteger charges = new AtomicInteger();

    Result pay(String idempotencyKey, String requestBody) {
        int hash = requestBody.hashCode();
        Result r = done.computeIfAbsent(idempotencyKey, k -> {       // atomic: runs once per key
            sleep(200);                                              // pretend to call the card network
            int id = charges.incrementAndGet();
            return new Result(201, "{\\"paymentId\\":\\"P" + id + "\\"}", hash);
        });
        if (r.bodyHash() != hash) {                                  // same key, different request: client bug
            return new Result(422, "{\\"error\\":\\"key reused with a different body\\"}", hash);
        }
        return r;
    }

    private static void sleep(long ms) { try { Thread.sleep(ms); } catch (InterruptedException e) { Thread.currentThread().interrupt(); } }

    public static void main(String[] args) throws Exception {
        PaymentService s = new PaymentService();
        ExecutorService pool = Executors.newFixedThreadPool(4);
        List<Future<Result>> futures = new ArrayList<>();
        for (int i = 0; i < 4; i++) futures.add(pool.submit(() -> s.pay("k-1", "{\\"amount\\":499}")));  // 4 concurrent retries
        for (Future<Result> f : futures) System.out.println(f.get());
        System.out.println("actual charges = " + s.charges.get());  // 1
        pool.shutdown();
    }
}`,
      complexity: `<p>O(1) per request plus the charge itself; memory O(keys kept) — bounded by a TTL in production.</p>`,
      followUps: ['What if the server crashes after charging but before storing the result?', 'How long should keys be kept?']
    }
  });

  practice.push({
    title: 'Conditional GET With ETag', level: 'Medium', tags: ['caching', 'etag', 'java'], companies: ['Akamai', 'Netflix'],
    statement: `<p>Write the logic for <code>GET /products/{id}</code> that supports <code>ETag</code> and <code>If-None-Match</code>. If the client's ETag matches the current one answer <b>304</b> with no body; otherwise <b>200</b> with the JSON and a fresh ETag. The header may contain several comma-separated ETags or <code>*</code>.</p>`,
    constraints: `ETag must change whenever the product JSON changes. Compare tags as quoted strings. Plain Java.`,
    example: `${H.table(['If-None-Match', 'Current ETag', 'Response'], [['(none)', '"a1"', '200 + body + ETag: "a1"'], ['"a1"', '"a1"', '<span class="c-g">304</span>, no body'], ['"z9", "a1"', '"a1"', '<span class="c-g">304</span>'], ['"old"', '"a1"', '200 + new body']])}`,
    brute: { why: `<p>Always sending the full body wastes bandwidth and server time on every refresh, even when nothing changed. Comparing the whole JSON strings on both sides instead of a short fingerprint also forces the client to send the full old body.</p>` },
    mcq: { q: 'What must a 304 response NOT contain?', options: ['A body', 'An ETag header', 'A Cache-Control header', 'A Date header'], answer: 0, explain: '304 means "use your cached copy", so the message has no body. Headers like ETag and Cache-Control are fine.' },
    hints: [
      `<p>Hint 1: derive the ETag from the content (a hash), wrapped in double quotes.</p>`,
      `<p>Hint 2: split the If-None-Match header on commas, trim spaces, and strip a weak prefix <code>W/</code> before comparing.</p>`,
      `<p>Hint 3: if any tag equals the current one, or the header is <code>*</code>, reply 304; else 200.</p>`
    ],
    solution: {
      approach: `<p>Compute the ETag from the representation (here the first 16 hex chars of SHA-256 of the JSON, quoted). Parse <code>If-None-Match</code> into a list of tags (split on commas, trim, drop a weak <code>W/</code> prefix). If the list contains <code>*</code> or the current tag, respond 304 with the ETag header but no body; otherwise respond 200 with body and ETag. The server still reads the product (or checks a version column), but skips serialisation and network transfer. Add <code>Cache-Control: no-cache</code> (store, but always revalidate) or <code>max-age</code> if staleness is acceptable. For writes use the same tag with <code>If-Match</code> to prevent lost updates (412 on mismatch).</p>`,
      code: `import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.*;

class ConditionalGet {
    record Resp(int status, String body, String etag) {}

    static String etagOf(String json) throws Exception {
        byte[] d = MessageDigest.getInstance("SHA-256").digest(json.getBytes(StandardCharsets.UTF_8));
        StringBuilder sb = new StringBuilder("\\"");
        for (int i = 0; i < 8; i++) sb.append(String.format("%02x", d[i]));
        return sb.append('"').toString();
    }

    static Resp get(String productJson, String ifNoneMatch) throws Exception {
        String current = etagOf(productJson);
        if (ifNoneMatch != null) {
            for (String raw : ifNoneMatch.split(",")) {
                String tag = raw.trim();
                if (tag.startsWith("W/")) tag = tag.substring(2);          // weak validator
                if (tag.equals("*") || tag.equals(current)) return new Resp(304, null, current);
            }
        }
        return new Resp(200, productJson, current);
    }

    public static void main(String[] args) throws Exception {
        String json = "{\\"id\\":17,\\"name\\":\\"Notebook\\",\\"priceMinor\\":15000}";
        Resp first = get(json, null);
        System.out.println(first.status() + " " + first.etag());
        System.out.println(get(json, first.etag()).status());                       // 304
        System.out.println(get(json.replace("15000", "16000"), first.etag()).status()); // 200 (changed)
    }
}`,
      complexity: `<p>O(size of JSON) to hash plus O(number of tags) to compare. Saves the bandwidth and client parse time of the body on every 304.</p>`
    }
  });

  practice.push({
    title: 'Fix the Broken JSON (Five Bugs)', level: 'Medium', tags: ['json', 'debugging'], companies: ['Postman', 'Twilio'],
    statement: `<p>A client sends this payload and gets <code>400</code>. Find <b>every</b> reason it is invalid JSON, then fix it (and also fix two design problems: the money field and the date).</p>
<pre>{
  'orderId': 9001,
  "customer": {"name": "Asha", "vip": True},
  "items": [
    {"sku": "B-1", "qty": 2,},
  ],
  // express shipping
  "total": 499.00,
  "placedAt": "14/03/26"
}</pre>`,
    constraints: `Output must parse with any standard JSON parser. Money must be exact. Dates must be unambiguous.`,
    example: `<p>${H.c('r', "'orderId'")} uses single quotes → invalid. After fixing all, a JSON parser accepts the text.</p>`,
    brute: { why: `<p>Fixing one error at a time and re-submitting wastes cycles; parsers report only the first error. Knowing the six JSON rules lets you spot all of them at once.</p>` },
    mcq: { q: 'Which is valid JSON?', options: ['{"a": true}', "{'a': true}", '{"a": True}', '{"a": 1,}'], answer: 0, explain: 'Keys and strings need double quotes, booleans are lowercase, and trailing commas are not allowed.' },
    hints: [
      `<p>Hint 1: JSON strings and keys use double quotes only.</p>`,
      `<p>Hint 2: look for trailing commas, comments and Python-style literals (<code>True</code>).</p>`,
      `<p>Hint 3: then fix the design: integer minor units for money and ISO 8601 UTC for the date.</p>`
    ],
    solution: {
      approach: `<p><b>Syntax errors:</b> (1) <code>'orderId'</code> uses single quotes — keys need double quotes; (2) <code>True</code> must be lowercase <code>true</code>; (3) trailing comma after <code>"qty": 2</code> inside the item object; (4) trailing comma after the item object, before the closing <code>]</code>; (5) the <code>// express shipping</code> comment — JSON has no comments. <b>Design problems:</b> <code>499.00</code> as a float risks rounding — send <code>"totalMinor": 49900</code> with <code>"currency": "INR"</code>; <code>"14/03/26"</code> is ambiguous (day/month? century?) — use <code>"2026-03-14T00:00:00Z"</code>. Corrected payload below (it parses).</p>`,
      code: { lang: 'json', code: `{
  "orderId": 9001,
  "customer": { "name": "Asha", "vip": true },
  "items": [
    { "sku": "B-1", "qty": 2 }
  ],
  "shippingMethod": "EXPRESS",
  "totalMinor": 49900,
  "currency": "INR",
  "placedAt": "2026-03-14T00:00:00Z"
}` },
      complexity: `<p>Validation is a linear scan of the text. Real teams add a JSON Schema so these checks run automatically in CI and at the API gateway.</p>`
    }
  });

  practice.push({
    title: 'Incident: 502s and 504s After a Deploy', level: 'Hard', tags: ['nginx', 'incident', 'timeouts', 'debugging'], companies: ['Amazon', 'Netflix'],
    statement: `<p>Right after a deploy of your Spring Boot service (4 instances behind nginx) users see a burst of <b>502</b> for ~20 seconds, then a stream of <b>504</b> on <code>/api/reports</code> that lasts for hours. CPU on the instances is low, database CPU is high. Walk through how you would diagnose and fix both problems, and what you would change so future deploys are invisible to users.</p>`,
    constraints: `Rolling deploy replaces one instance at a time. nginx proxy_read_timeout is 30 s. Tomcat has 200 threads per instance. Reports run a 60 s query.`,
    example: `<p>${H.c('r', '502 burst')}: nginx still sends traffic to an instance that is shutting down or not started yet. ${H.c('y', '504 stream')}: slow report requests occupy threads and exceed nginx's 30 s limit.</p>`,
    brute: { why: `<p>Restarting everything again and raising timeouts to 5 minutes hides the symptoms: threads stay blocked longer, the thread pool exhausts, every endpoint slows down, and the next deploy fails the same way.</p>` },
    mcq: { q: 'The app has low CPU but requests time out and DB CPU is high. What is the most likely cause?', options: ['Request threads are blocked waiting on slow database queries', 'The JSON library is slow', 'DNS is failing', 'nginx has too few workers'], answer: 0, explain: 'Low app CPU with long latency means threads are waiting, not computing. Waiting on a slow, DB-heavy report fits.' },
    hints: [
      `<p>Hint 1: separate the two problems. 502 = bad/no answer from upstream, just after the deploy; 504 = answers too slow, ongoing.</p>`,
      `<p>Hint 2: for the 502s ask how the load balancer learns an instance is ready or going away: readiness checks, connection draining, graceful shutdown.</p>`,
      `<p>Hint 3: for the 504s follow the wait: nginx → Tomcat threads → connection pool → database. Find the slow query and decide between optimising it, making it async, or isolating it.</p>`
    ],
    solution: {
      approach: `<p><b>502 burst (deploy mechanics).</b> During a rolling deploy nginx kept routing to instances that were stopping (connections reset) or starting (port closed or app still warming). Fix: add a <b>readiness</b> endpoint (<code>/actuator/health/readiness</code>) that only turns healthy after the app, DB pool and caches are ready; on shutdown flip readiness to "out of service" first, let nginx/LB drain, enable graceful shutdown (<code>server.shutdown=graceful</code>, <code>spring.lifecycle.timeout-per-shutdown-phase=30s</code>), and give <code>proxy_next_upstream error timeout http_502</code> (only for idempotent requests) so nginx retries the next instance. Deploy one instance at a time with a pause for health to pass.</p><p><b>504 stream (slowness).</b> Low app CPU + high DB CPU + timeouts means threads are blocked on the database. Check metrics: active Tomcat threads close to 200, Hikari pool "pending" connections, and slow-query logs/<code>EXPLAIN</code> for the report query. The 60 s report cannot succeed within a 30 s proxy timeout and while it runs it holds a thread and a DB connection, starving other endpoints. Fix in order: (1) <b>contain</b>: give <code>/api/reports</code> its own limited thread pool or concurrency cap and return 429/503 quickly beyond it; (2) <b>optimise</b>: add an index, pre-aggregate, or read from a replica; (3) <b>redesign</b>: make reports asynchronous — <code>POST /reports</code> returns <b>202 Accepted</b> with a status URL, a worker builds the file, the client polls or gets notified; (4) set timeouts that shrink inward (nginx 30 s &gt; app 25 s &gt; DB statement timeout 20 s).</p><p><b>Prevention.</b> Alert on 5xx rate, p99 latency and thread/pool saturation; run deploy smoke tests; rehearse rollbacks.</p>`,
      complexity: `<p>Capacity maths: with 200 threads and 60 s requests, only 200 / 60 ≈ 3.3 report requests per second per instance can be served before all threads are consumed — one popular endpoint can take the whole service down. Isolation and async processing break that coupling.</p>`,
      followUps: ['How would you find the slow query in production safely?', 'How do bulkheads and circuit breakers help here?']
    }
  });

  practice.push({
    title: 'Stateless Login for 5 Million Users With Instant Revocation', level: 'Hard', tags: ['sessions', 'jwt', 'redis', 'design'], companies: ['Okta', 'Google'],
    statement: `<p>Design the login/session layer for an app with 5 million users, 10 app instances and 20,000 requests/second at peak. Requirements: servers must be stateless, a stolen session must be revocable within seconds, logging out everywhere must work, and the design must survive a Redis outage for short periods. Compare opaque session ids in Redis, pure JWTs, and a hybrid, then recommend one.</p>`,
    constraints: `Latency budget for authentication: under 2 ms per request. Tokens/cookies must be protected from XSS and CSRF.`,
    example: `${H.table(['Option', 'Auth cost per request', 'Revoke in seconds?'], [['Opaque id in Redis', '1 Redis GET (~0.5–1 ms)', '<span class="c-g">yes</span> (delete key)'], ['Pure JWT (15 min)', 'local signature check (~0.05 ms)', '<span class="c-r">no</span> (wait for expiry)'], ['Hybrid: short JWT + refresh in DB', 'local check', '<span class="c-g">yes</span> (≤ JWT lifetime)']])}`,
    brute: { why: `<p>"Use JWTs with a 30-day expiry and no server state" gives perfect scalability but no revocation: a stolen token is valid for a month and "log out everywhere" is impossible. "Hit the database on every request" revokes instantly but adds load and latency, and makes the database the bottleneck.</p>` },
    mcq: { q: 'Which design gives local verification AND revocation within seconds?', options: ['Short-lived access JWT (about 5 min) plus a revocable server-side refresh token', 'A 30-day JWT', 'Session id stored in a static HashMap', 'Cookies with no attributes'], answer: 0, explain: 'Short access tokens limit the damage window; the refresh token is checked server-side, so it can be revoked and rotated.' },
    hints: [
      `<p>Hint 1: the conflict is "no lookup" (fast, scalable) versus "can revoke" (needs server knowledge). You need a compromise.</p>`,
      `<p>Hint 2: make the thing checked on every request very short-lived, and the thing that is checked on the server rare (only when refreshing).</p>`,
      `<p>Hint 3: add a small deny-list of revoked token ids / a per-user "token version" in Redis, and decide what to do (fail open or closed) when Redis is down.</p>`
    ],
    solution: {
      approach: `<p><b>Recommendation: hybrid.</b> On login, issue a <b>short-lived access token</b> (JWT, 5–10 min, signed with ES256/RS256, claims: sub, exp, iss, aud, jti, session id, roles version) and a <b>refresh token</b> (random 256-bit value, stored hashed in the DB/Redis with user, device and expiry). Browsers receive both as <code>HttpOnly; Secure; SameSite</code> cookies (so XSS cannot read them; add CSRF protection for cookie auth); mobile apps keep them in secure storage and send the access token in <code>Authorization: Bearer</code>.</p><p><b>Per request:</b> verify signature, exp, iss, aud locally in microseconds — no lookup, so 20k rps is trivial and servers stay stateless. <b>Refresh:</b> every 5–10 min the client calls <code>/token/refresh</code>; the server checks the refresh token in the store, <i>rotates</i> it (old one invalidated; reuse of an old one means theft, so revoke the whole family), and issues a new access token.</p><p><b>Revocation:</b> deleting the refresh token ends the session after at most the access-token lifetime (5–10 min). For "within seconds" add a tiny <b>deny-list</b> in Redis (jti or session id with TTL = remaining token life) that servers check — one cheap GET, or cache it locally with a short TTL. "Log out everywhere" = bump a per-user <code>tokenVersion</code> compared on refresh (and optionally on sensitive endpoints). <b>Redis outage:</b> for normal endpoints fail open on the deny-list for a short grace period (tokens still expire quickly); for sensitive actions (payments, password change) fail closed and require a fresh login. Keys in a KMS/secrets manager, rotated with <code>kid</code> headers; never hard-coded.</p><p>Compared with pure opaque ids: 1 Redis GET per request at 20k rps and a hard dependency on Redis for every call. Compared with pure JWT: no revocation. The hybrid keeps >99.9% of requests lookup-free while still giving control.</p>`,
      complexity: `<p>Per request: O(1) local crypto (~50 µs for ES256 verify, plus an optional deny-list GET). Refresh traffic: 5M users × 1 refresh per ~10 min ≈ 8k refreshes/s worst case, so spread refresh times with jitter and keep the store sharded.</p>`,
      followUps: ['How do you rotate the JWT signing key without logging everyone out?', 'Where should the SPA keep the access token to limit XSS damage?']
    }
  });

  practice.push({
    title: 'Audit a Service Before Scaling to Three Copies', level: 'Hard', tags: ['stateless', 'scaling', 'architecture'], companies: ['Uber', 'Atlassian'],
    statement: `<p>A single-instance Spring Boot monolith has: (1) the shopping cart in a static <code>Map</code>, (2) uploaded profile photos saved to <code>/tmp/uploads</code>, (3) a <code>@Scheduled</code> nightly email job, (4) a local in-memory product cache, (5) a WebSocket "order status" notification feature, (6) a rate limiter counting requests per user in a local counter, (7) <code>HttpSession</code> login. Management wants three copies behind a load balancer next week. For each item say what breaks and the smallest correct fix.</p>`,
    constraints: `Round-robin load balancer, no sticky sessions allowed. Cloud object storage and Redis are available.`,
    example: `<p>(1) Cart in a static Map → each request may hit a copy with a different (empty) cart → ${H.c('g', 'fix: store carts in Redis/DB keyed by cart id or user id')}.</p>`,
    brute: { why: `<p>"Just scale to three and enable sticky sessions" papers over item (7) only. Photos, the nightly job (sends 3 emails to every user), the rate limiter (limit effectively triples) and WebSocket delivery would all still misbehave.</p>` },
    mcq: { q: 'After scaling to 3 copies, what happens to a @Scheduled job that emails every customer?', options: ['It runs 3 times, so customers get 3 emails, unless you add leader election or a lock', 'Spring automatically runs it once', 'It stops running', 'It runs on the load balancer'], answer: 0, explain: 'Each instance has its own scheduler. Use a distributed lock (ShedLock, DB row lock) or a single job runner.' },
    hints: [
      `<p>Hint 1: for each item ask: "if a request or event lands on a different copy, does it still work?"</p>`,
      `<p>Hint 2: files, sessions, carts and counters need a shared home (object storage, Redis, DB). Jobs need "only one runs" coordination.</p>`,
      `<p>Hint 3: WebSockets are tied to one instance; use pub/sub (Redis, Kafka) so the instance that processes an event can notify the instance holding the connection.</p>`
    ],
    solution: {
      approach: `<ol><li><b>Cart (static Map):</b> each copy has its own carts → empty or wrong carts. Fix: carts in Redis or the database keyed by user/cart id; servers become stateless.</li><li><b>Photos in /tmp:</b> only one copy has the file, others return 404. Fix: store in object storage (S3) and serve via CDN; keep only the URL in the DB.</li><li><b>@Scheduled nightly email:</b> runs on every copy → triple emails. Fix: ShedLock (DB/Redis lock) so only one instance runs per tick, or move to a single worker/cron job; make the job idempotent (record "sent" per customer).</li><li><b>Local product cache:</b> works, but copies can serve different stale values after an update. Fix: short TTLs plus invalidation events, or a shared Redis cache for data that must be consistent.</li><li><b>WebSocket notifications:</b> the event may be processed on copy A while the user is connected to copy C. Fix: publish status events on a Redis Pub/Sub or Kafka topic; every copy forwards to its own connected clients.</li><li><b>Local rate limiter:</b> the real limit becomes 3× because each copy counts separately. Fix: shared counter in Redis (INCR with expiry / token bucket), or enforce at the gateway.</li><li><b>HttpSession:</b> Fix with Spring Session on Redis (or signed tokens), not sticky sessions.</li></ol><p>Then verify: run three instances locally behind nginx, run through every feature, and kill one instance mid-flow — nothing user-visible should break.</p>`,
      complexity: `<p>No code. After the fixes, capacity grows by adding copies; the shared pieces (Redis, DB, object storage) become the next bottlenecks and must be sized and made highly available.</p>`,
      followUps: ['Which of these items needs a distributed lock?', 'How would you test statelessness automatically?']
    }
  });

  practice.push({
    title: 'Harden a Hand-Written HTTP Reader', level: 'Hard', tags: ['security', 'parsing', 'java', 'limits'], companies: ['Cloudflare', 'Akamai'],
    statement: `<p>Your intern wrote an HTTP/1.1 request reader that trusts the input completely. List the attacks and resource-exhaustion problems it allows (slowloris, giant headers, thousands of headers, conflicting <code>Content-Length</code> and <code>Transfer-Encoding</code>, negative lengths, request smuggling) and add the limits and checks in code for the head parsing part.</p>`,
    constraints: `Limits: request line 8 KB, total head 16 KB, at most 100 headers, body at most 1 MB. Reject ambiguous framing.`,
    example: `${H.table(['Input', 'Correct reaction'], [['Content-Length: -5', '400'], ['Both Content-Length and Transfer-Encoding: chunked', '<span class="c-r">400</span> (ambiguous framing)'], ['Content-Length: 5000000', '413'], ['200 headers', '431'], ['Head sent 1 byte per second', 'timeout and close']])}`,
    brute: { why: `<p>Reading until a blank line with no size or time limits lets one client send an endless header block (memory exhaustion) or dribble bytes for hours (each such connection pins a thread). Accepting both framing headers lets proxy and app disagree on where a request ends — request smuggling.</p>` },
    mcq: { q: 'Why must a server reject a request with both Content-Length and Transfer-Encoding?', options: ['Two parsers could split the byte stream differently (request smuggling)', 'It wastes bandwidth', 'Because chunked is deprecated', 'It breaks gzip'], answer: 0, explain: 'If the front proxy honours one header and the app honours the other, an attacker can hide a second request inside the first.' },
    hints: [
      `<p>Hint 1: list resources an attacker can consume: bytes, headers count, time, memory per connection.</p>`,
      `<p>Hint 2: put a hard cap on each (head size, header count, body size) and a read timeout on the socket.</p>`,
      `<p>Hint 3: validate framing headers strictly: reject duplicates with different values, non-numeric or negative lengths, and CL+TE together.</p>`
    ],
    solution: {
      approach: `<p><b>Problems:</b> (1) unbounded head → memory exhaustion; (2) unbounded header count → CPU/memory (hash collisions, huge maps); (3) no read timeout → slowloris ties up threads; (4) negative or huge <code>Content-Length</code> → exceptions or giant allocations; (5) both <code>Content-Length</code> and <code>Transfer-Encoding</code> → request smuggling; (6) duplicate conflicting <code>Content-Length</code> headers; (7) header names with spaces or control chars (response splitting, smuggling variants).</p><p><b>Fixes:</b> enforce size caps while reading (stop at the first byte beyond the limit and answer 431/413 immediately), set socket read timeouts (a total deadline for the head, e.g. 10 s, and an idle timeout for the body), strictly validate framing, reject (don't "fix") ambiguous requests and close the connection, normalise header names, and put a battle-tested server (nginx/Tomcat/Netty) in front instead of hand-rolled parsing. The code below validates a head string against these rules and returns the HTTP status to send.</p>`,
      code: `import java.util.*;

class HeadValidator {
    static final int MAX_LINE = 8 * 1024, MAX_HEAD = 16 * 1024, MAX_HEADERS = 100;
    static final long MAX_BODY = 1_000_000L;

    // Returns 0 when the head is acceptable, otherwise the HTTP status to answer with.
    static int check(String head) {
        if (head.length() > MAX_HEAD) return 431;                              // head too large
        String[] lines = head.replace("\\r\\n", "\\n").split("\\n");
        if (lines[0].length() > MAX_LINE) return 414;                          // URI too long
        String[] rl = lines[0].split(" ");
        if (rl.length != 3 || !rl[2].startsWith("HTTP/1.")) return 400;
        if (lines.length - 1 > MAX_HEADERS) return 431;                        // too many headers

        Set<String> contentLengths = new HashSet<>();
        boolean hasTe = false;
        for (int i = 1; i < lines.length; i++) {
            int c = lines[i].indexOf(':');
            if (c <= 0) return 400;                                            // no name, or no colon
            String name = lines[i].substring(0, c);
            if (!name.equals(name.trim()) || name.chars().anyMatch(ch -> ch < 33 || ch > 126)) return 400; // spaces/control chars in a name
            String value = lines[i].substring(c + 1).trim();
            if (name.equalsIgnoreCase("content-length")) contentLengths.add(value);
            if (name.equalsIgnoreCase("transfer-encoding")) hasTe = true;
        }
        if (contentLengths.size() > 1) return 400;                             // conflicting lengths
        if (hasTe && !contentLengths.isEmpty()) return 400;                    // ambiguous framing -> smuggling risk
        if (!contentLengths.isEmpty()) {
            String v = contentLengths.iterator().next();
            if (!v.matches("[0-9]{1,18}")) return 400;                         // negative, signed or non-numeric
            if (Long.parseLong(v) > MAX_BODY) return 413;
        }
        return 0;
    }

    public static void main(String[] args) {
        System.out.println(check("POST /x HTTP/1.1\\nHost: a\\nContent-Length: 5"));                  // 0
        System.out.println(check("POST /x HTTP/1.1\\nContent-Length: -5"));                           // 400
        System.out.println(check("POST /x HTTP/1.1\\nContent-Length: 5\\nTransfer-Encoding: chunked")); // 400
        System.out.println(check("POST /x HTTP/1.1\\nContent-Length: 5000000"));                      // 413
    }
}`,
      complexity: `<p>O(size of head) with a hard upper bound of 16 KB, so the work per connection before the body is constant.</p>`,
      followUps: ['Where do socket timeouts fit in?', 'Why is a reverse proxy in front still valuable even with this validator?']
    }
  });

  /* ================================================================
     QUIZ (12)
     ================================================================ */
  quiz.push({ q: 'In the request lifecycle for a fresh page load, which step comes first?', options: ['DNS lookup of the host name', 'The database query', 'The app server applies business rules', 'nginx compresses the response'], answer: 0, explain: 'The client only knows a name. It must resolve it to an IP address (DNS) before it can open a connection and send anything.' });
  quiz.push({ q: 'What separates the headers from the body in an HTTP message?', options: ['A blank line', 'A semicolon', 'The Content-Type header', 'A null byte'], answer: 0, explain: 'An empty line (CRLF CRLF) marks the end of the headers; everything after it is the body.' });
  quiz.push({ q: 'Which method is both safe and idempotent?', options: ['GET', 'POST', 'DELETE', 'PATCH with a delta'], answer: 0, explain: 'GET only reads. DELETE is idempotent but not safe (it changes state). POST and delta-PATCH are neither.' });
  quiz.push({ q: 'A client sends valid JSON, but the field qty is -3. Which status fits best?', options: ['422 (or 400) - the values break the rules', '201 Created', '404 Not Found', '502 Bad Gateway'], answer: 0, explain: 'It is the caller\'s mistake (4xx). 422 says "well-formed but semantically invalid"; many APIs use 400 consistently instead.' });
  quiz.push({ q: 'A logged-in normal user opens /admin/users. What should the server return?', options: ['403 Forbidden', '401 Unauthorized', '404 always', '500 Internal Server Error'], answer: 0, explain: 'The user is authenticated but not authorised: 403. 401 is for missing or invalid credentials.' });
  quiz.push({ q: 'Why is HTTP described as stateless?', options: ['The server keeps no memory of earlier requests by itself; each request must carry what is needed', 'It never stores data', 'It cannot use cookies', 'It only works with GET'], answer: 0, explain: 'Statelessness is about the protocol: each request is independent. Apps add state with cookies, tokens and shared stores.' });
  quiz.push({ q: 'Why do stateless app servers scale horizontally more easily?', options: ['Any instance can serve any request, so you can add or remove instances freely', 'They use less memory per request', 'They never touch a database', 'They avoid TLS'], answer: 0, explain: 'No per-user memory lives in an instance, so the load balancer can route anywhere and instances are replaceable.' });
  quiz.push({ q: 'Which is the best way to represent ₹499.00 in a JSON API?', options: ['"totalMinor": 49900, "currency": "INR"', '"total": 499.0', '"total": "499 rupees"', '"total": 4.99E2'], answer: 0, explain: 'Integer minor units avoid binary floating point errors and the explicit currency removes ambiguity.' });
  quiz.push({ q: 'What does a reverse proxy like nginx typically do for you?', options: ['TLS termination, static files, load balancing, request limits', 'Run your Java business logic', 'Store your orders', 'Compile your code'], answer: 0, explain: 'It is the generic "front door": TLS, files, balancing, compression and protection. Business logic stays in the app server.' });
  quiz.push({ q: 'nginx connects to the app fine but the app takes 90 s while proxy_read_timeout is 30 s. What do clients see?', options: ['504 Gateway Timeout', '502 Bad Gateway', '401 Unauthorized', '304 Not Modified'], answer: 0, explain: '504 means the gateway waited too long for the upstream. 502 means it got no valid response (e.g. connection refused).' });
  quiz.push({ q: 'Which cookie attribute prevents JavaScript from reading the cookie?', options: ['HttpOnly', 'Secure', 'SameSite', 'Max-Age'], answer: 0, explain: 'HttpOnly hides the cookie from document.cookie, limiting damage from XSS. Secure restricts to https, SameSite limits cross-site sending.' });
  quiz.push({ q: 'A client retries a POST /orders after a timeout and two orders appear. What is the standard remedy?', options: ['An Idempotency-Key header that the server uses to return the first result', 'Switch the method to GET', 'Increase the timeout to 10 minutes', 'Disable HTTPS'], answer: 0, explain: 'POST is not idempotent. A client-generated key lets the server detect the repeat and return the original response instead of creating a duplicate.' });

  /* ================================================================
     INTERVIEW (13)
     ================================================================ */
  interview.push({ level: 'B', q: 'What happens when you type a URL into the browser and press Enter?', a: `<p>The browser parses the URL, checks caches, and resolves the host name to an IP through <b>DNS</b>. It opens a <b>TCP</b> connection to that IP and port (443 for https) and performs a <b>TLS handshake</b> to agree on encryption keys. Then it sends an <b>HTTP request</b> (method, path, headers). A reverse proxy / web server such as nginx terminates TLS and either serves a static file or forwards the request to an <b>application server</b>, which authenticates the caller, runs business logic and queries the <b>database</b>. The response (status code, headers, body) travels back; the browser parses HTML, fetches more resources (CSS, JS, images) and renders. Caches (DNS, HTTP, CDN) and connection reuse (keep-alive, HTTP/2) remove many of these steps on later visits.</p>`, followUps: ['Which steps can be skipped on the second visit?', 'Where would a CDN fit?', 'What is the difference between TCP and TLS handshake costs?'] });
  interview.push({ level: 'B', q: 'What is the difference between a client and a server, and what does a backend do?', a: `<p>A <b>client</b> starts a conversation by sending a request (browser, mobile app, another service, curl); a <b>server</b> waits for requests and answers. The <b>backend</b> is the code and infrastructure on the server side: it listens for requests, authenticates and authorises callers, applies business rules, reads and writes data in databases or caches, calls other services (payments, email), and returns a response. It lives on machines you control, which is why anything that must be trusted (prices, permissions, secrets) belongs there rather than in the client, which users can modify freely.</p>`, followUps: ['Why validate on the server if the frontend validates?', 'Can a server also be a client?'] });
  interview.push({ level: 'B', q: 'Explain GET, POST, PUT, PATCH and DELETE, and which are safe or idempotent.', a: `<p><b>GET</b> reads a resource — safe and idempotent. <b>POST</b> creates a new resource or triggers an action — neither safe nor idempotent (repeating it creates another). <b>PUT</b> replaces the whole resource at a known URL — idempotent. <b>PATCH</b> changes part of a resource — idempotent only if the change is absolute ("set qty to 3") and not relative ("add 1"). <b>DELETE</b> removes a resource — idempotent in terms of server state, though the second call may return 404. "Safe" means no state change at all; "idempotent" means repeating gives the same final state, which determines whether clients and proxies can retry automatically.</p>`, followUps: ['How would you make POST safe to retry?', 'When would you pick PUT over PATCH?'] });
  interview.push({ level: 'B', q: 'Walk me through the HTTP status code families and the ones you use most.', a: `<p>The first digit gives the family: <b>1xx</b> informational, <b>2xx</b> success (200 OK, 201 Created with a Location header, 202 Accepted for async work, 204 No Content), <b>3xx</b> redirection (301/302/307/308, and 304 Not Modified for cache revalidation), <b>4xx</b> client errors (400 bad request, 401 unauthenticated, 403 forbidden, 404 not found, 409 conflict, 415 unsupported media type, 422 invalid values, 429 too many requests) and <b>5xx</b> server errors (500 unexpected failure, 502 bad gateway, 503 unavailable, 504 gateway timeout). Clients should not retry a 4xx unchanged but may retry 429/5xx with backoff, honouring Retry-After.</p>`, followUps: ['401 versus 403?', '502 versus 504?', 'Why is returning 200 with an error body a bad idea?'] });
  interview.push({ level: 'B', q: 'What is JSON and what are its data types? Why not use floats for money?', a: `<p>JSON is a text format for structured data with six value types: <b>string, number, boolean, null, object and array</b>. Keys and strings use double quotes; there are no comments or trailing commas. Floating-point numbers are binary and cannot represent many decimals exactly (0.1 + 0.2 = 0.30000000000000004), which creates rounding errors in totals. For money use integer <b>minor units</b> (paise/cents) with a currency code, or a decimal string/BigDecimal. Also send timestamps as ISO 8601 in UTC and use strings for ids that might exceed 2<sup>53</sup>, because JavaScript numbers lose precision beyond that.</p>`, followUps: ['How do you evolve a JSON API without breaking clients?', 'What is mass assignment and how do you avoid it?'] });
  interview.push({ level: 'B', q: 'What does "HTTP is stateless" mean, and how do websites remember who you are?', a: `<p>Stateless means the server treats every request independently; nothing in the protocol links request 2 to request 1. Applications add state on top. Common approaches: a <b>session cookie</b> holding a random id, with the data kept server-side (in memory, or better a shared store like Redis); or a <b>self-contained signed token</b> (such as a JWT) sent on every request in the Authorization header, which any server can verify without a lookup. Cookies are protected with <code>HttpOnly</code>, <code>Secure</code> and <code>SameSite</code>. The trade-off is revocation and lookup cost versus scalability.</p>`, followUps: ['What are the downsides of JWTs?', 'What are sticky sessions and why avoid them?'] });
  interview.push({ level: 'I', q: 'Why does a stateless service scale better? What about things that are inherently stateful?', a: `<p>If instances hold no per-user memory between requests, they are interchangeable: a load balancer can send any request to any instance, you can autoscale by adding or removing copies, a crashed instance loses nothing, and rolling deploys do not log anyone out. Capacity grows roughly linearly with instances until a shared dependency (database, cache) becomes the bottleneck. Inherently stateful pieces — databases, WebSocket connections, caches, scheduled jobs, uploaded files — are handled by <b>pushing the state out</b> to shared services (managed databases, Redis, object storage), using pub/sub so any instance can reach a connected client, and using locks or leader election so a job runs once.</p>`, followUps: ['How do you scale the database that holds the state?', 'How do you deploy a stateful WebSocket service without dropping everyone?'] });
  interview.push({ level: 'I', q: 'What is the difference between a web server and an application server? Why put nginx in front of Tomcat or Node?', a: `<p>A web server/reverse proxy (nginx, Apache, Caddy, HAProxy) is excellent at HTTP plumbing: handling thousands of connections, TLS termination, static files, compression, load balancing, rate and size limits. An application server (Tomcat running Spring Boot, Node.js, Gunicorn) runs your business code. Putting nginx in front gives a hardened public entry point, offloads static content and TLS, shields app threads from slow clients (it buffers requests and responses), balances across instances with health checks, enables zero-downtime restarts, and lets several apps share one domain by path. The cost is another hop and another component to configure, monitor and secure.</p>`, followUps: ['How does the app learn the real client IP?', 'What timeouts would you set at each layer?'] });
  interview.push({ level: 'I', q: 'Explain idempotency keys. How would you implement them for POST /payments?', a: `<p>Because POST is not idempotent, a retry after a timeout could charge twice. The client generates a unique <b>Idempotency-Key</b> (a UUID) per logical operation and sends the same key on every retry. The server stores <i>key → result</i> atomically: on first sight it processes the payment and saves the response (plus a hash of the request body); on repeats it returns the saved response without re-executing. Use a unique constraint in the database or Redis <code>SET NX</code> so concurrent duplicates serialise, keep an "in progress" marker for crash recovery, expire keys after ~24 hours, and reject a reused key with a different body (422/409).</p>`, followUps: ['What if the server crashes after charging but before saving?', 'How do you pick the key scope — per user or global?'] });
  interview.push({ level: 'I', q: 'What are 502, 503 and 504, and how do you debug each in a setup with nginx in front of an app?', a: `<p><b>502 Bad Gateway:</b> nginx reached for the app but got no valid response — the process is down, crashed mid-reply, wrong port, or closed the connection. Check app status, logs and the <code>proxy_pass</code> target. <b>503 Service Unavailable:</b> the app or proxy is deliberately refusing — overloaded, in maintenance, all upstreams marked failed, or a rate/connection limit; look at health checks, thread and connection pool saturation. <b>504 Gateway Timeout:</b> the app accepted the request but did not answer within <code>proxy_read_timeout</code>; find slow queries, blocked threads or slow downstream calls using logs, traces and metrics. For all three correlate by request id and check recent deploys.</p>`, followUps: ['What is the right relationship between timeouts at each layer?', 'How do retries make an outage worse?'] });
  interview.push({ level: 'I', q: 'How do ETag and conditional requests save bandwidth? How do they prevent lost updates?', a: `<p>An <b>ETag</b> is a fingerprint of a resource's current representation. The client caches the body with its ETag and revalidates with <code>If-None-Match: "tag"</code>. If unchanged, the server answers <b>304 Not Modified</b> with no body, saving transfer and parse time. For writes, the client sends <code>If-Match: "tag"</code> with PUT/PATCH; if someone else changed the resource, the tag no longer matches and the server answers <b>412 Precondition Failed</b> instead of silently overwriting — optimistic concurrency. Strong ETags mean byte-identical content; weak ones (<code>W/"…"</code>) mean semantically equivalent.</p>`, followUps: ['How would you generate an ETag cheaply?', 'How does this differ from Cache-Control max-age?'] });
  interview.push({ level: 'A', q: 'Design the session/authentication approach for a service with millions of users that must stay stateless but support quick revocation.', a: `<p>Use a hybrid: a <b>short-lived signed access token</b> (5–10 minutes) that every server verifies locally with a public key — no lookup, so it is fast and stateless — and a <b>refresh token</b> stored server-side (hashed, per device) that is rotated on every use. Revocation works by deleting the refresh token (the session ends within one access-token lifetime) and, for faster cut-off, by a small deny-list or per-user token version in Redis checked on sensitive endpoints. Detect refresh-token reuse as theft and revoke the family. Deliver tokens in HttpOnly Secure SameSite cookies for browsers; protect against CSRF. Keep signing keys in a KMS with rotation by <code>kid</code>, and define the behaviour when Redis is down (fail open for low risk, closed for high risk).</p>`, followUps: ['How do you rotate signing keys without forcing re-login?', 'JWT versus opaque tokens: when do you choose each?'] });
  interview.push({ level: 'A', q: 'What risks come from parsing HTTP and JSON from untrusted clients, and how do you mitigate them?', a: `<p>HTTP: oversized request lines, headers or bodies (memory exhaustion), too many headers, slow-drip connections (slowloris) pinning threads, and ambiguous framing (both Content-Length and Transfer-Encoding) enabling <b>request smuggling</b> between proxy and app. Mitigate with hard size and count limits, read timeouts, strict framing validation, rejecting ambiguous requests, and using proven servers rather than hand-written parsers. JSON: huge or deeply nested payloads, type confusion, <b>mass assignment</b> onto entities, unsafe polymorphic deserialization (remote code execution gadgets), and big-number precision issues. Mitigate with body-size and depth limits, DTOs with validation, schema checks, disabling default typing, and treating all input — including model-generated JSON — as untrusted.</p>`, followUps: ['What is request smuggling in one sentence?', 'How do you rate-limit abusive clients early?'] });

  registerModule({
    id: 'be01',
    title: 'How Backends Work & HTTP Basics',
    intro: `<p>Every app you use — a shopping site, a banking app, a chatbot — is a <b>client</b> talking to a <b>backend</b> over <b>HTTP</b>. This module takes you from "what is a server?" to reading raw HTTP messages, choosing the right method and status code, designing JSON, understanding why stateless servers scale, and seeing where nginx fits in front of your app server.</p><p>It is the foundation of the whole Backend track: Spring Boot and Node.js REST APIs (next module), authentication, caching and microservices all build on the ideas here. Everything is explained with everyday analogies first, then raw wire-level detail, then production reality and the AI-era angle.</p>`,
    goals: [
      'Trace one request through <b>client → DNS → web server → app server → database</b> and back, and say what each hop does',
      'Read and write raw <b>HTTP requests and responses</b> (request line, headers, blank line, body) and parse them in code',
      'Pick the right <b>method</b> (GET/POST/PUT/PATCH/DELETE) and <b>status code</b> for any scenario, and explain safe vs idempotent',
      'Design clean <b>JSON</b> payloads (money, dates, ids, enums, nulls) and map JSON to objects',
      'Explain why <b>stateless servers scale</b> and compare sessions, shared stores and signed tokens',
      'Describe the roles of a <b>web server (nginx)</b> and an <b>app server</b>, and write a basic reverse-proxy configuration',
      'Build a tiny HTTP server in plain Java with <code>com.sun.net.httpserver</code>'
    ],
    prereqs: `Basic programming in Java, Python or JavaScript (variables, functions, collections). No web experience needed. A terminal with <code>curl</code> and JDK 21 helps for the hands-on examples.`,
    hours: 8,
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
