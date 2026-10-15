(function () {
var topics = [], practice = [], quiz = [], interview = [];

// Tiny deterministic "fake IP" so the visualizer can show a DNS answer for any hostname.
function fakeIp(host) {
  var h = 7;
  for (var i = 0; i < host.length; i++) h = (h * 31 + host.charCodeAt(i)) % 65521;
  return (20 + (h % 200)) + '.' + ((h >> 3) % 250 + 1) + '.' + ((h >> 5) % 250 + 1) + '.' + ((h >> 2) % 250 + 1);
}

/* ===================== TOPIC 1: Browsers, servers, DNS ===================== */
topics.push({
  title: 'Browsers, Servers & the Client–Server Idea',
  analogy: `<p>Think of a <b>restaurant</b>. You (the <b>browser</b>) sit at a table and read a menu. You never walk into the kitchen. You tell a waiter what you want, the <b>kitchen</b> (the <b>server</b>) cooks it, and the dish comes back to your table. The phone book that tells you the restaurant's street address is <b>DNS</b>. The whole web is just billions of people ordering and billions of kitchens answering.</p>`,
  explain: `<p><b>🟢 The plain idea.</b> The web has exactly two kinds of players:</p>
    <ul>
      <li><b>Client</b> — the program that <i>asks</i>. For us it is a <b>browser</b> (Chrome, Safari, Firefox, Edge). It runs on <i>your</i> device.</li>
      <li><b>Server</b> — a computer that is always on, <i>waits</i> for questions and <i>answers</i> them. It runs in a data centre, and you do not control it.</li>
    </ul>
    <p>A browser does three jobs: (1) <b>fetch</b> files from servers, (2) <b>understand</b> HTML, CSS and JavaScript, (3) <b>draw</b> the result on your screen and react to clicks. A server's job is: receive a request, think (maybe ask a database), send back a response.</p>
    <p>Computers find each other by number, called an <b>IP address</b> (like <code>93.184.216.34</code>). Humans prefer names (<code>example.com</code>). <b>DNS</b> (Domain Name System) is the giant phone book that turns names into IP addresses.</p>
    ${H.table(['Question', 'Browser (client)', 'Server'], [
      ['Where does it run?', 'On the visitor\'s device', 'In a data centre / cloud'],
      ['Who controls it?', 'The <b>user</b> (can change anything)', 'The <b>company</b>'],
      ['Main job', 'Ask, show, react to clicks', 'Listen, compute, answer'],
      ['Can you trust it?', '<span class="c-r">No — users can edit everything</span>', '<span class="c-g">Yes — it is your code</span>'],
      ['Examples', 'Chrome, Safari, Firefox', 'Nginx, Node.js, Apache, a cloud function']
    ])}
    <p><b>🔵 The big trick: every web page is the result of a conversation.</b> You type an address, your browser sends a <i>request</i>, the server sends back a <i>response</i> (usually text: HTML), and the browser turns that text into pixels. That is all. Everything else in this track (React, CSS grid, performance) is built on this one loop.</p>
    ${H.kv([['Client', 'asks'], ['Server', 'answers'], ['DNS', 'name → IP'], ['Protocol', 'the agreed language (HTTP)']], { label: 'Four words to remember' })}
    <p><b>Important:</b> "server" is a <i>role</i>, not a special machine. Your laptop becomes a server when you run <code>npm run dev</code> and open <code>localhost:3000</code> — your browser asks your own laptop. The special name <code>localhost</code> (IP <code>127.0.0.1</code>) always means "this very computer".</p>`,
  clues: [
    '"What happens when you type a URL and press Enter?" — the classic opener; they want client → DNS → TCP/TLS → HTTP → render',
    '"Why can\'t we trust data sent from the browser?" — client is controlled by the user, so validate on the <b>server</b>',
    '"Where should this logic live — client or server?" — secrets, money and permissions go on the server; instant feedback goes on the client',
    '"It works on my machine / localhost but not in production" — usually a difference between your local server and the real one (URL, env vars, HTTPS, CORS)',
    '"Why is the first load slow but later loads fast?" — DNS and connection setup cost time once; caches skip repeated work'
  ],
  code: [
    { lang: 'js', run: true, title: 'A pretend DNS phone book (runs in your browser)', code: `// DNS in one picture: a big Map from name -> IP address.
// Real DNS is a worldwide, layered version of this Map with caching.
const phoneBook = new Map([
  ['example.com', '93.184.216.34'],
  ['news.site', '151.101.1.69'],
  ['shop.test', '10.0.0.7'],
]);

function lookup(name) {
  const ip = phoneBook.get(name);
  if (ip === undefined) {
    // Real browsers show "This site can't be reached - DNS_PROBE_FINISHED_NXDOMAIN"
    return { name, ok: false, error: 'NXDOMAIN (no such name)' };
  }
  return { name, ok: true, ip };
}

console.log(lookup('example.com'));
console.log(lookup('shop.test'));
console.log(lookup('does-not-exist.dev'));` },
    { lang: 'bash', title: 'See the real thing from a terminal', code: `# Ask DNS for an address (the "phone book" step)
nslookup example.com

# Talk to a server by hand and print the whole conversation (-v = verbose)
curl -v https://example.com/ 2>&1 | head -30

# A server on YOUR machine: localhost always points back at yourself
curl http://localhost:3000/` }
  ],
  codeTitle: ['DNS as a Map', 'DNS and curl from a terminal'],
  viz: [
    {
      title: 'Browser → DNS → Server: the full round trip',
      input: 'www.example.com',
      inputLabel: 'Website name',
      gen: function (input) {
        var host = String(input).trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
        if (!/^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$/.test(host) || host.length > 60) throw new Error('Type a website name like www.example.com');
        var ip = fakeIp(host);
        var nodes = [
          { id: 'B', label: 'Browser', x: 12, y: 32, shape: 'box' },
          { id: 'C', label: 'Local cache', x: 12, y: 8, shape: 'box' },
          { id: 'D', label: 'DNS server', x: 52, y: 8, shape: 'box' },
          { id: 'S', label: 'Web server', x: 86, y: 32, shape: 'box' }
        ];
        var edges = [['B', 'C', '0 cache?'], ['B', 'D', '1 name?'], ['B', 'S', 'HTTPS']];
        var steps = [
          { n: 'You type <b>' + host + '</b> and press Enter. The browser only knows a <i>name</i>; it cannot reach a name, only a numeric address.', hl: { B: 'cur' }, ehl: {}, tags: { B: 'start' }, row: 0 },
          { n: 'Step 0: look in the <b>local cache</b> (browser, then operating system). If this name was looked up recently the answer is already here. We pretend it is a <span class="c-r">miss</span>.', hl: { C: 'bad', B: 'cur' }, ehl: { 'B-C': 'bad' }, tags: { C: 'miss' }, row: 1 },
          { n: 'Step 1: the browser asks a <b>DNS server</b> (usually run by your ISP or a public one like 1.1.1.1): "What is the address of <b>' + host + '</b>?"', hl: { D: 'cur', B: 'cur' }, ehl: { 'B-D': 'cur' }, tags: { D: 'looking up…' }, row: 2 },
          { n: 'DNS answers: <b>' + ip + '</b>. The browser caches this for a while (the <i>TTL</i>) so it does not ask again soon.', hl: { D: 'ok', B: 'ok' }, ehl: { 'B-D': 'ok' }, tags: { D: ip, B: 'knows IP' }, row: 3 },
          { n: 'Step 2: open a <b>TCP connection</b> to ' + ip + ' (a 3-message handshake: SYN, SYN-ACK, ACK). Think of it as "ring the bell and wait for the door to open".', hl: { S: 'cur', B: 'cur' }, ehl: { 'B-S': 'cur' }, tags: { S: 'TCP handshake' }, row: 4 },
          { n: 'Step 3: for <b>https</b> they also do a <b>TLS handshake</b>: the server shows a certificate (its ID card), both sides agree on a secret key, and everything after this is encrypted.', hl: { S: 'sel', B: 'cur' }, ehl: { 'B-S': 'win' }, tags: { S: 'cert OK, encrypted' }, row: 5 },
          { n: 'Step 4: the browser sends the <b>HTTP request</b>: <code>GET / HTTP/1.1</code> with <code>Host: ' + host + '</code>.', hl: { B: 'cur', S: 'cur' }, ehl: { 'B-S': 'ok' }, tags: { B: 'GET /', S: 'request arrives' }, row: 6 },
          { n: 'Step 5: the server <b>does its work</b> (read a file, ask a database, run code) and builds the answer.', hl: { S: 'cur' }, ehl: { 'B-S': 'done' }, tags: { S: 'building HTML…' }, row: 7 },
          { n: 'Step 6: the response travels <b>back along the same road</b>: <code>200 OK</code> plus the HTML text.', hl: { S: 'ok', B: 'ok' }, ehl: { 'B-S': 'ok' }, tags: { B: '200 OK + HTML', S: 'sent' }, row: 8 },
          { n: 'Step 7: the browser <b>parses the HTML</b>, discovers it needs CSS, JS and images, and repeats steps 4–6 for each of them (connection is reused). Finally it paints the page.', hl: { B: 'sel' }, ehl: {}, tags: { B: 'rendering page' }, row: 9 }
        ];
        var table = [
          ['0', 'You type a name', 'Browser', '—'], ['1', 'Check local cache', 'Browser/OS', '0 ms'], ['2', 'Ask DNS', 'DNS server', '~20 ms'], ['3', 'DNS replies with IP', 'DNS server', 'cached'],
          ['4', 'TCP handshake', 'Web server', '1 round trip'], ['5', 'TLS handshake', 'Web server', '1–2 round trips'], ['6', 'Send HTTP request', 'Web server', '½ round trip'],
          ['7', 'Server builds response', 'Web server', 'server time'], ['8', 'Response comes back', 'Browser', '½ round trip'], ['9', 'Parse + render', 'Browser', 'CPU time']
        ];
        return steps.map(function (s) {
          return { narr: s.n, parts: [
            { type: 'graph', directed: true, height: 46, nodes: nodes, edges: edges, hl: s.hl, ehl: s.ehl, tags: s.tags },
            { type: 'vars', label: 'What the browser knows', vals: { name: host, ip: s.row >= 3 ? ip : '? (not yet)', secure: s.row >= 5 ? 'yes (TLS)' : 'no' }, hl: { ip: s.row === 3 ? 'ok' : '' } },
            { type: 'table', label: 'Timeline', columns: ['#', 'What happens', 'Who works', 'Cost'], rows: table.slice(0, s.row + 1), hl: (function () { var o = {}; o[s.row] = 'cur'; return o; })() }
          ] };
        });
      }
    },
    {
      title: 'Trust boundary: what the user controls',
      gen: function () {
        var rows = [
          ['Button colours, layout', 'Browser', 'Safe to decide here'],
          ['Form validation (is this an email?)', 'Browser AND server', 'Browser = friendly; server = real'],
          ['Is the user an admin?', 'Server', 'Users can edit browser code'],
          ['The price of an item', 'Server', 'A shopper can change a number in DevTools'],
          ['API secret keys', 'Server only', 'Anything shipped to the browser is public']
        ];
        var verdict = ['Pure looks — decide on the client for instant feedback.', 'Do both: client for speed, server for safety.', 'Never decide permissions in the browser; the user can rewrite that code.', 'Always recompute prices on the server. "Trust no client."', 'Secrets in front-end code are not secrets. Keep them behind your server.'];
        var frames = [{ narr: 'Rule of thumb: <b>the browser belongs to the visitor</b>. Anything running there can be viewed and edited by them (View Source, DevTools). Let us test five decisions.', parts: [{ type: 'table', label: 'Where should it live?', columns: ['Decision', 'Lives in', 'Why'], rows: [] }] }];
        for (var i = 0; i < rows.length; i++) {
          var h = {}; h[i] = i >= 2 ? 'bad' : 'ok';
          frames.push({ narr: '<b>' + rows[i][0] + '</b> → ' + verdict[i], parts: [{ type: 'table', label: 'Where should it live?', columns: ['Decision', 'Lives in', 'Why'], rows: rows.slice(0, i + 1), hl: (function () { var o = {}; o[i] = i >= 2 ? 'sel' : 'ok'; return o; })() }] });
        }
        return frames;
      }
    }
  ],
  examples: [
    { title: 'Many websites, one server (virtual hosting)', html: `<p>One server machine, with one IP address, can host hundreds of sites. How does it know which one you want? Your request carries a <code>Host</code> header with the name you typed. The server (e.g. Nginx) reads it and picks the right website folder — like a hotel receptionist who asks "which guest are you visiting?" before pointing you to a room.</p>${H.table(['Request line', 'Host header', 'Served from'], [['GET /', 'blog.me', '/var/www/blog'], ['GET /', 'shop.me', '/var/www/shop'], ['GET /', 'api.me', 'Node.js app on port 4000']])}` },
    { title: 'localhost: you are the client AND the server', html: `<p>When you run a dev server, open <code>http://localhost:5173</code>. Your browser (client) asks your own laptop (server) on <b>port 5173</b>. A <b>port</b> is a numbered door on a computer: one machine can run many servers, each on its own door (80 = http, 443 = https, 3000/5173/8080 = developer favourites).</p><p>Tip: if "localhost refused to connect", it means nobody is listening at that port — the server is not running.</p>`, code: { lang: 'bash', code: `# Start a tiny static server in the current folder (needs Node.js)
npx serve -l 3000
# Now open http://localhost:3000 in a browser` } },
    { title: 'Cached DNS vs fresh DNS', html: `<p>The first visit to <code>news.site</code> pays for a DNS lookup (about 20–120 ms). The second visit within the TTL (say 300 seconds) skips it. This is why developers say "DNS is cached at many layers": browser, operating system, your router, your ISP.</p>${H.table(['Visit', 'DNS cost', 'Reason'], [['1st', '<span class="c-r">~50 ms</span>', 'Cache miss → ask the DNS server'], ['2nd (30 s later)', '<span class="c-g">0 ms</span>', 'Browser cache hit'], ['After TTL expires', '<span class="c-y">~50 ms</span>', 'Entry expired, ask again']])}` },
    { title: 'Static server vs dynamic server', html: `<p>A <b>static</b> server just hands out files that already exist (<code>index.html</code>, <code>logo.png</code>) — like a vending machine. A <b>dynamic</b> server runs code per request (look up your profile, build HTML) — like a chef cooking to order. Modern sites mix both: files from a CDN, data from an API.</p>` }
  ],
  deepDive: `<p><b>🟣 What really happens, layer by layer.</b></p>
    <ul>
      <li><b>DNS is hierarchical.</b> Resolving <code>www.example.com</code> goes: your device's cache → a <i>recursive resolver</i> (ISP or 1.1.1.1/8.8.8.8) → the <i>root</i> servers ("who handles .com?") → the <code>.com</code> servers ("who handles example.com?") → the site's <i>authoritative</i> server (the real answer). Each answer carries a <b>TTL</b> and is cached. Record types you will meet: <code>A</code> (IPv4), <code>AAAA</code> (IPv6), <code>CNAME</code> (alias to another name), <code>MX</code> (email), <code>TXT</code> (verification).</li>
      <li><b>TCP</b> gives a reliable, ordered pipe: lost packets are re-sent. The handshake costs one <i>round-trip time</i> (RTT). <b>TLS 1.3</b> adds one more RTT (TLS 1.2 added two). <b>HTTP/3</b> runs over <b>QUIC</b> (UDP) and merges the transport + encryption handshakes, so a repeat visit can send data in 0-RTT.</li>
      <li><b>CDNs</b> (Cloudflare, Fastly, CloudFront) put copies of your files in hundreds of cities. DNS (or Anycast routing) sends each user to the nearest copy, cutting the physical distance. Light in fibre travels ~200,000 km/s, so a trip across an ocean costs ~70 ms RTT no matter how fast the server is — distance is a bill you can only reduce by moving the server closer.</li>
      <li><b>Browsers are small operating systems.</b> Chrome runs a separate process per site (<i>site isolation</i>) and sandboxes the page so a bad site cannot read another site's data. The "network service", "GPU process" and "renderer" are all separate.</li>
      <li><b>Connection reuse.</b> Opening connections is costly, so browsers keep them alive and multiplex many requests (HTTP/2 and 3) over one. Hints like <code>&lt;link rel="preconnect" href="https://api.example.com"&gt;</code> start DNS+TCP+TLS early.</li>
      <li><b>Failure modes you can name:</b> <code>NXDOMAIN</code> (name does not exist), <code>ERR_CONNECTION_REFUSED</code> (no server listening), <code>ERR_CONNECTION_TIMED_OUT</code> (packets vanish — firewall/outage), <code>ERR_CERT_DATE_INVALID</code> (expired certificate).</li>
    </ul>`,
  aiEra: `<p><b>What AI changes:</b> Assistants (and AI browsers/agents) now click, fetch and read pages <i>for</i> people. To a server they look like one more client — often with an unusual <code>User-Agent</code> — so the client–server model still applies; what changes is the <i>volume</i> and the need for <code>robots.txt</code>, rate limits and bot detection.</p>
    <p><b>Use AI as a partner:</b> paste a failing <code>curl -v</code> output and ask <code>Which layer failed: DNS, TCP, TLS or HTTP, and why?</code> It is excellent at reading error text. Ask it to <i>quiz</i> you on "what happens when I type a URL" until you can narrate every step without notes.</p>
    <p><b>Where AI goes wrong:</b> it sometimes states "the browser sends the page to the server" or mixes up which side owns a secret, or invents DNS record behaviour. It also loves to put API keys directly in front-end code in generated examples.</p>
    <p><b>What you must still own:</b> the mental model — who is the client, who is the server, where each decision must run, and which layer to blame. Interviewers test exactly this, and debugging in production depends on it.</p>`,
  after: `<p><b>Check yourself:</b> can you explain, out loud and in under a minute, what happens between pressing Enter and seeing pixels? If not, replay the first visualizer once more.</p>`,
  problems: [{
    title: 'Pretend DNS Resolver with a Cache',
    level: 'Easy', tags: ['dns', 'caching', 'map'], companies: ['Cloudflare', 'Amazon'],
    statement: `<p>Write <code>makeResolver(authority, ttlMs, now)</code>. <code>authority</code> is an object mapping names to IPs (the "real" DNS servers), <code>ttlMs</code> is how long an answer may be cached, and <code>now</code> is a function returning the current time in ms. It must return a function <code>resolve(name)</code> that returns <code>{ ip, source }</code> where <code>source</code> is <code>'cache'</code> or <code>'network'</code>. Unknown names must return <code>{ ip: null, source: 'network' }</code> (and should not be cached).</p>`,
    constraints: `Up to 10<sup>5</sup> lookups; ttlMs between 1 and 10<sup>6</sup>; names are lowercase strings.`,
    example: `<p>ttl = 1000 ms. Time 0: <code>resolve('a.com')</code> → ${H.c('r', 'network')} (first time). Time 500: → ${H.c('g', 'cache')} (still fresh). Time 1500: → ${H.c('r', 'network')} (older than 1000 ms, expired).</p>`,
    brute: { why: `<p>Ask the "network" every single time. Correct answers, but each lookup costs ~50 ms in real life, so a page with 30 resources wastes over a second just on name lookups. The wasted work is repeating a question whose answer has not changed.</p>`, code: `function makeResolverBrute(authority) {
  return function resolve(name) {
    // Always goes to the (slow) network: no memory of earlier answers
    return { ip: authority[name] || null, source: 'network' };
  };
}` },
    mcq: { q: 'Why does a DNS answer carry a TTL instead of being cached forever?', options: ['So that the browser can sort answers by time', 'Because the site owner may move to a new server, so old answers must expire', 'Because IP addresses are only 4 digits long', 'To make DNS faster than TCP'], answer: 1, explain: 'A TTL (time to live) is the site owner saying "this answer is good for N seconds". After that, ask again, so a changed IP is eventually noticed.' },
    hints: [
      `<p>Hint 1: Remember each answer together with the <b>time you stored it</b>. Fresh means <code>now - storedAt &lt; ttl</code>.</p>`,
      `<p>Hint 2: A <code>Map</code> from name to <code>{ ip, storedAt }</code> is the cache. Check it first, fall back to the authority.</p>`,
      `<p>Hint 3: Recipe: (1) look in cache; if present and fresh return source 'cache'. (2) else read authority[name]. (3) if found, store it with the current time. (4) return source 'network'. Do not cache misses.</p>`
    ],
    solution: {
      approach: `<p>Keep a <code>Map</code> of <code>name → { ip, storedAt }</code>. On each call compare the age of the entry with the TTL. A fresh entry is returned as a cache hit; otherwise ask the authority, store the answer (only if it exists) and report <code>'network'</code>.</p>`,
      code: { lang: 'js', run: true, code: `function makeResolver(authority, ttlMs, now) {
  const cache = new Map(); // name -> { ip, storedAt }
  return function resolve(name) {
    const hit = cache.get(name);
    if (hit && now() - hit.storedAt < ttlMs) {
      return { ip: hit.ip, source: 'cache' }; // fresh: skip the network
    }
    const ip = authority[name] || null;        // "ask the DNS server"
    if (ip) cache.set(name, { ip, storedAt: now() }); // never cache misses
    return { ip, source: 'network' };
  };
}

// Demo with a fake clock we control
let t = 0;
const resolve = makeResolver({ 'a.com': '1.2.3.4' }, 1000, () => t);
console.log(resolve('a.com'));  // network (first time)
t = 500;  console.log(resolve('a.com'));  // cache
t = 1500; console.log(resolve('a.com'));  // network (expired)
console.log(resolve('nope.com')); // { ip: null, source: 'network' }` },
      complexity: `<p>Each lookup is O(1) average time (Map get/set). Memory is O(number of distinct names cached).</p>`,
      followUps: ['Add a size limit with LRU eviction', 'Support per-record TTLs like real DNS', 'Cache negative answers (NXDOMAIN) for a short time']
    }
  }]
});

/* ===================== TOPIC 2: URLs ===================== */
topics.push({
  title: 'URLs: The Address of Everything',
  analogy: `<p>A URL is like a <b>full postal address with delivery notes</b>: the <i>delivery method</i> (courier or post = <code>https</code>), the <i>building</i> (<code>shop.example.com</code>), the <i>door number</i> (port <code>8080</code>), the <i>room inside</i> (path <code>/shoes/42</code>), a <i>sticky note for the staff</i> (query <code>?color=red</code>) and a <i>page marker</i> you use yourself after arriving (<code>#reviews</code>).</p>`,
  explain: `<p><b>🟢 The plain idea.</b> A <b>URL</b> (Uniform Resource Locator) names one thing on the web and says how to get it. Here is one with every part filled in:</p>
    <p><code>https://asha:pw@shop.example.com:8443/shoes/42?color=red&amp;size=9#reviews</code></p>
    ${H.table(['Part', 'Value', 'Plain meaning'], [
      ['scheme (protocol)', '<span class="c-b">https</span>', 'The language/method: http, https, ftp, mailto, file…'],
      ['userinfo', '<span class="c-m">asha:pw</span>', 'Old-style login in the URL. Avoid it.'],
      ['host (hostname)', '<span class="c-g">shop.example.com</span>', 'Which computer. Read it <b>right to left</b>: .com → example → shop'],
      ['port', '<span class="c-y">8443</span>', 'Which door on that computer. Default: 80 for http, 443 for https'],
      ['path', '<span class="c-p">/shoes/42</span>', 'Which thing on that computer'],
      ['query', '<span class="c-b">?color=red&amp;size=9</span>', 'Extra key=value options, joined with &amp;'],
      ['fragment (hash)', '<span class="c-r">#reviews</span>', 'A spot inside the page. <b>Never sent to the server</b>']
    ])}
    <p><b>🔵 Three rules that explain 90% of URL bugs.</b></p>
    <ol>
      <li><b>The origin is scheme + host + port.</b> <code>https://a.com</code> and <code>https://a.com:8443</code> are <i>different origins</i> (this matters for security and CORS later).</li>
      <li><b>Some characters are special</b> (<code>?</code> <code>&amp;</code> <code>#</code> <code>/</code> space). To use them as plain data you must <b>percent-encode</b> them: space becomes <code>%20</code>, <code>&amp;</code> becomes <code>%26</code>, <code>é</code> becomes <code>%C3%A9</code>.</li>
      <li><b>Relative URLs</b> (<code>../img/a.png</code>) are resolved against the page's own URL (the <i>base</i>). Browsers do this for every <code>src</code> and <code>href</code>.</li>
    </ol>
    <p>JavaScript has a built-in <code>URL</code> class that splits a URL for you, and <code>URLSearchParams</code> to read and build the query part. <b>Never glue query strings by hand</b> — the class does the encoding for you.</p>`,
  clues: [
    '"Parse this URL" / "extract query params" — use <code>new URL()</code> and <code>URLSearchParams</code>, not regex',
    '"Same origin?" — compare <b>scheme + host + port</b>, not the path',
    '"Why does my search for <code>C++ &amp; Java</code> break?" — missing <code>encodeURIComponent</code>',
    '"Does the server see the #fragment?" — no, it stays in the browser',
    '"Relative vs absolute path (<code>/a</code> vs <code>a</code> vs <code>../a</code>)" — resolve against the base URL'
  ],
  code: [
    { lang: 'js', run: true, title: 'Take a URL apart with the URL class', code: `const u = new URL('https://shop.example.com:8443/shoes/42?color=red&size=9&tag=a&tag=b#reviews');

console.log('protocol :', u.protocol);   // "https:" (note the colon)
console.log('hostname :', u.hostname);   // "shop.example.com"
console.log('port     :', u.port);       // "8443" ("" when it is the default port)
console.log('origin   :', u.origin);     // scheme + host + port
console.log('pathname :', u.pathname);   // "/shoes/42"
console.log('search   :', u.search);     // "?color=red&size=9&tag=a&tag=b"
console.log('hash     :', u.hash);       // "#reviews"

// URLSearchParams reads the query part for us
console.log('color    :', u.searchParams.get('color'));        // "red"
console.log('all tags :', u.searchParams.getAll('tag'));       // ["a", "b"]
console.log('as object:', Object.fromEntries(u.searchParams)); // last duplicate wins` },
    { lang: 'js', run: true, title: 'Encoding: build a safe query string', code: `// Dangerous: gluing strings by hand. The & inside the value breaks the query.
const bad = '/search?q=' + 'C++ & Java' + '&page=1';
console.log(bad);

// Safe: let URLSearchParams encode every value.
const params = new URLSearchParams({ q: 'C++ & Java', page: 1 });
console.log('/search?' + params.toString()); // q=C%2B%2B+%26+Java&page=1

// Single piece: encodeURIComponent / decodeURIComponent
console.log(encodeURIComponent('café & tea')); // caf%C3%A9%20%26%20tea
console.log(decodeURIComponent('caf%C3%A9%20%26%20tea'));

// Relative URL resolved against a base, exactly like <a href="../img/a.png">
console.log(new URL('../img/a.png', 'https://site.com/blog/post/').href);` }
  ],
  codeTitle: ['Parsing with URL', 'Encoding and resolving'],
  viz: [
    {
      title: 'URL dissection: part by part',
      input: 'https://shop.example.com:8443/shoes/42?color=red&size=9#reviews',
      inputLabel: 'URL',
      gen: function (input) {
        var s = String(input).trim();
        // userinfo is optional; host stops at : / ? #
        var m = /^([a-zA-Z][a-zA-Z0-9+.-]*):\/\/(?:([^@\/?#]*)@)?([^:\/?#]+)(?::(\d+))?([^?#]*)(\?[^#]*)?(#.*)?$/.exec(s);
        if (!m || s.length > 150) throw new Error('Type a full URL such as https://example.com:8080/a/b?x=1#top');
        var scheme = m[1].toLowerCase();
        var def = { http: '80', https: '443', ftp: '21' }[scheme];
        var segs = [
          { k: 'scheme', v: scheme + '://', mean: 'How to talk: the protocol', color: 'win' },
          { k: 'userinfo', v: m[2] ? m[2] + '@' : '', mean: 'Optional login (avoid!)', color: 'done' },
          { k: 'host', v: m[3], mean: 'Which computer (looked up via DNS)', color: 'ok' },
          { k: 'port', v: m[4] ? ':' + m[4] : '', mean: 'Which door' + (def ? ' (default ' + def + ' for ' + scheme + ')' : ''), color: 'cur' },
          { k: 'path', v: m[5] || '/', mean: 'Which thing on the server', color: 'sel' },
          { k: 'query', v: m[6] || '', mean: 'key=value options', color: 'win' },
          { k: 'fragment', v: m[7] || '', mean: 'Spot in the page, stays in the browser', color: 'bad' }
        ];
        var shown = segs.filter(function (x) { return x.v !== ''; });
        var frames = [], rows = [];
        var all = shown.map(function (x) { return x.v; });
        frames.push({ narr: 'We have one long string. Click <b>Next</b> and watch it split into <b>' + shown.length + '</b> meaningful pieces.', parts: [{ type: 'array', label: 'URL pieces', values: all, showIdx: false }] });
        shown.forEach(function (sg, i) {
          var hl = {}; for (var j = 0; j < i; j++) hl[j] = 'done'; hl[i] = sg.color;
          rows.push([sg.k, sg.v, sg.mean]);
          var note = '';
          if (sg.k === 'host') note = ' Read the host right to left: <b>' + sg.v.split('.').reverse().join(' → ') + '</b>.';
          if (sg.k === 'port' && !m[4]) note = '';
          if (sg.k === 'fragment') note += ' The server will <b>never</b> receive this part.';
          frames.push({ narr: '<b>' + sg.k + '</b> = <code>' + H.esc(sg.v) + '</code>. ' + sg.mean + '.' + note, parts: [
            { type: 'array', label: 'URL pieces', values: all, hl: hl, ptr: (function () { var o = {}; o[i] = sg.k; return o; })(), showIdx: false },
            { type: 'table', label: 'Parts found so far', columns: ['part', 'value', 'meaning'], rows: rows.slice(), hl: (function () { var o = {}; o[i] = 'cur'; return o; })() }
          ] });
        });
        if (!m[4] && def) rows.push(['port (implied)', def, 'Browser fills in the default for ' + scheme]);
        var origin = scheme + '://' + m[3] + (m[4] ? ':' + m[4] : '');
        var qs = (m[6] || '').replace(/^\?/, '');
        var entries = qs ? qs.split('&').map(function (kv) { var p = kv.split('='); return [p[0], p.length > 1 ? p.slice(1).join('=') : '']; }) : [];
        frames.push({ narr: 'Two derived facts: the <b>origin</b> (scheme + host + port) = <code>' + H.esc(origin) + '</code> is what browsers use for security checks, and the query turns into <b>' + entries.length + '</b> key/value pair(s) — what <code>URLSearchParams</code> gives you.', parts: [
          { type: 'vars', label: 'Derived', vals: { origin: origin, pathname: m[5] || '/', hasFragment: !!m[7] }, hl: { origin: 'sel' } },
          { type: 'map', label: 'searchParams', entries: entries.length ? entries : [['(none)', '']], hl: {} }
        ] });
        return frames;
      }
    },
    {
      title: 'Percent-encoding: why %20 exists',
      input: 'café & tea?',
      inputLabel: 'Text to put inside a query value',
      gen: function (input) {
        var s = String(input);
        if (!s.length) throw new Error('Type some text');
        if (s.length > 14) throw new Error('Use at most 14 characters');
        var chars = s.split(''), pieces = chars.map(function (c) { return encodeURIComponent(c); });
        var frames = [{ narr: 'Some characters have jobs in a URL: <code>&amp;</code> separates params, <code>?</code> starts the query, <code>#</code> starts the fragment. To send them as <i>plain text</i> we must encode them.', parts: [{ type: 'array', label: 'Your text', values: chars, showIdx: false }] }];
        var out = [];
        chars.forEach(function (c, i) {
          out.push(pieces[i]);
          var changed = pieces[i] !== c;
          var hl = {}; for (var j = 0; j < i; j++) hl[j] = 'done'; hl[i] = changed ? 'bad' : 'ok';
          var why = changed ? (c === ' ' ? 'space is not allowed in URLs → %20' : (c.charCodeAt(0) > 127 ? 'non-ASCII → UTF-8 bytes, each written as %XX' : '<code>' + H.esc(c) + '</code> is a reserved character → %' + c.charCodeAt(0).toString(16).toUpperCase())) : 'letter/digit — safe, stays as is';
          frames.push({ narr: '<b>' + (c === ' ' ? '(space)' : H.esc(c)) + '</b>: ' + why + '. Result so far: <code>' + out.join('') + '</code>', parts: [
            { type: 'array', label: 'Characters', values: chars, hl: hl, showIdx: false },
            { type: 'array', label: 'Encoded pieces', values: out.slice(), hl: (function () { var o = {}; o[i] = changed ? 'bad' : 'ok'; return o; })(), showIdx: false }
          ] });
        });
        frames.push({ narr: 'Final: <code>?q=' + out.join('') + '</code>. The server decodes it back with <code>decodeURIComponent</code> and gets exactly your original text.', parts: [{ type: 'vars', vals: { original: s, encoded: out.join(''), same_as_encodeURIComponent: out.join('') === encodeURIComponent(s) }, hl: { encoded: 'ok' } }] });
        return frames;
      }
    }
  ],
  examples: [
    { title: 'Same origin or not?', html: `<p>Origin = scheme + host + port. Compare these with <code>https://shop.com/home</code>:</p>${H.table(['Other URL', 'Same origin?', 'Why'], [['https://shop.com/cart?x=1', '<span class="c-g">yes</span>', 'Path and query do not matter'], ['http://shop.com/home', '<span class="c-r">no</span>', 'Different scheme'], ['https://www.shop.com/home', '<span class="c-r">no</span>', 'Different host (www. counts)'], ['https://shop.com:8443/home', '<span class="c-r">no</span>', 'Different port']])}`, code: { lang: 'js', run: true, code: `const base = new URL('https://shop.com/home');
const others = ['https://shop.com/cart?x=1', 'http://shop.com/home', 'https://www.shop.com/home', 'https://shop.com:8443/home'];
for (const o of others) {
  console.log(o.padEnd(32), new URL(o).origin === base.origin ? 'same origin' : 'DIFFERENT');
}` } },
    { title: 'Relative links resolved by the browser', html: `<p>Page URL: <code>https://site.com/blog/post/index.html</code>. The browser turns each link into an absolute URL:</p>${H.table(['Written in HTML', 'Becomes'], [['<code>img/a.png</code>', 'https://site.com/blog/post/img/a.png'], ['<code>../b.png</code>', 'https://site.com/blog/b.png'], ['<code>/c.png</code>', 'https://site.com/c.png (starts at the root)'], ['<code>//cdn.com/d.js</code>', 'https://cdn.com/d.js (keeps the scheme)'], ['<code>?page=2</code>', 'https://site.com/blog/post/index.html?page=2']])}`, code: { lang: 'js', run: true, code: `const page = 'https://site.com/blog/post/index.html';
for (const rel of ['img/a.png', '../b.png', '/c.png', '//cdn.com/d.js', '?page=2']) {
  console.log(rel.padEnd(14), '->', new URL(rel, page).href);
}` } },
    { title: 'Fragments stay home (single-page apps)', html: `<p>When you click a link to <code>/docs#install</code>, the browser requests <code>/docs</code> only, then scrolls to the element with <code>id="install"</code>. Older single-page apps used the fragment as a router (<code>#/profile</code>) because changing it does <b>not</b> reload the page. Modern ones use the History API (<code>history.pushState</code>) for clean paths.</p>`, code: { lang: 'js', run: true, code: `const u = new URL('https://site.com/docs?lang=en#install');
// What the server receives in the request line:
console.log('request target sent to server:', u.pathname + u.search);
// What stays in the browser:
console.log('kept locally:', u.hash);` } },
    { title: 'Build a link safely (no string gluing)', html: `<p>Say a user searches for <code>fish &amp; chips</code>. Building <code>"?q=" + text</code> gives a broken query with an extra param called <code> chips</code>. Using <code>URLSearchParams</code> gives <code>q=fish+%26+chips</code>, which the server decodes correctly.</p>`, code: { lang: 'js', run: true, code: `const url = new URL('https://shop.test/search');
url.searchParams.set('q', 'fish & chips');
url.searchParams.set('sort', 'price');
console.log(url.href);
console.log(url.searchParams.get('q')); // fish & chips (decoded for us)` } }
  ],
  deepDive: `<p><b>🟣 Details that separate "I use URLs" from "I understand URLs".</b></p>
    <ul>
      <li><b>Standard:</b> browsers follow the WHATWG URL Standard (not only the old RFC 3986). The <code>URL</code> class is the reference implementation; it lowercases the scheme and host, removes default ports (<code>:443</code> on https), resolves <code>.</code>/<code>..</code> segments and percent-encodes what needs encoding.</li>
      <li><b><code>encodeURI</code> vs <code>encodeURIComponent</code>:</b> <code>encodeURI</code> leaves URL structure characters (<code>/ ? &amp; = #</code>) alone — use it on a whole URL (rare). <code>encodeURIComponent</code> encodes them — use it on a single <i>value</i>. <code>URLSearchParams</code> uses the form style (space becomes <code>+</code>), which servers decode too.</li>
      <li><b>Internationalised domains:</b> <code>münchen.de</code> is stored as Punycode <code>xn--mnchen-3ya.de</code>. Look-alike characters (a Cyrillic "а" vs Latin "a") power phishing, so browsers show Punycode when scripts are mixed.</li>
      <li><b>Length &amp; privacy:</b> practical URL limits are ~2,000 characters for old browsers/proxies; servers often cap at 8 KB. Never put secrets (tokens, passwords) in URLs — they land in browser history, logs, analytics and the <code>Referer</code> header. Use headers or POST bodies.</li>
      <li><b>Data URLs &amp; blob URLs:</b> <code>data:text/plain;base64,SGk=</code> embeds content in the URL; <code>blob:https://site.com/uuid</code> points at in-memory data (e.g. <code>URL.createObjectURL(file)</code>). Revoke blob URLs when done to free memory.</li>
      <li><b>Security trap:</b> <code>new URL(userInput, base)</code> with <code>userInput = "javascript:alert(1)"</code> or <code>"//evil.com"</code> escapes your base. Validate the <code>protocol</code> against an allow-list (<code>http:</code>, <code>https:</code>) and compare <code>origin</code> for redirects (open-redirect bugs).</li>
      <li><b>URL design:</b> good paths are nouns (<code>/users/42/orders</code>), stable, lowercase and human-readable; filters and sort order go in the query. Search engines and users both care.</li>
    </ul>`,
  aiEra: `<p><b>What AI changes:</b> LLM tools that browse or call APIs get their instructions as URLs: a "tool" is often just a base URL + path + query. Clean, predictable URLs make your site easier for AI agents (and search crawlers) to navigate. Agents also follow links you did not expect, so dangerous actions must never be reachable by a plain <code>GET</code> link.</p>
    <p><b>Use AI as a partner:</b> ask <code>Generate 15 tricky URLs (userinfo, IPv6 host, empty query, repeated keys, unicode) to test my parser</code> — then run them through <code>new URL()</code> yourself to see the truth. It is also great at explaining why a redirect or relative link resolved to the wrong place.</p>
    <p><b>Where AI goes wrong:</b> it often writes regex URL parsers that break on edge cases, forgets to encode query values, or concatenates strings (<code>"?q=" + term</code>) instead of using <code>URLSearchParams</code>. It may also say the fragment is sent to the server.</p>
    <p><b>What you must still own:</b> deciding what belongs in a URL (never secrets), validating redirect targets, and knowing exactly which part of a URL is the origin. Those are security decisions an assistant cannot be blamed for.</p>`,
  problems: [{
    title: 'Parse a URL into Parts',
    level: 'Easy', tags: ['url', 'parsing', 'URL class'], companies: ['Google', 'Meta'],
    statement: `<p>Write <code>describeUrl(text)</code> that returns an object with these keys: <code>scheme</code> (without the colon), <code>host</code>, <code>port</code> (a number; use the default port 80/443 when the URL has none), <code>path</code>, <code>query</code> (an object of key → value, last duplicate wins) and <code>hash</code> (without the <code>#</code>, empty string if none). If the text is not a valid URL return <code>null</code>.</p>`,
    constraints: `Input length ≤ 2000 characters. Only http and https schemes need default ports.`,
    example: `<p>Input <code>https://shop.com/a/b?x=1&amp;y=two#top</code></p><p>Output: ${H.c('g', '{ scheme:"https", host:"shop.com", port:443, path:"/a/b", query:{x:"1", y:"two"}, hash:"top" }')} — port 443 was not written, so the default for https is used.</p>`,
    brute: { why: `<p>Split the string manually with <code>indexOf</code> and <code>split</code>. It works for happy paths but breaks on userinfo, IPv6 hosts (<code>[::1]</code>), missing paths and encoded characters. The waste is re-implementing a standard that the platform already ships and tests.</p>`, code: `function describeUrlBrute(text) {
  const [rest, hashPart = ''] = text.split('#');
  const [beforeQuery, qs = ''] = rest.split('?');
  const scheme = beforeQuery.split('://')[0];
  const afterScheme = beforeQuery.split('://')[1] || '';
  const slash = afterScheme.indexOf('/');
  const hostPort = slash === -1 ? afterScheme : afterScheme.slice(0, slash);
  const path = slash === -1 ? '/' : afterScheme.slice(slash);
  const [host, port] = hostPort.split(':');
  const query = {};
  qs.split('&').filter(Boolean).forEach(kv => { const [k, v = ''] = kv.split('='); query[k] = v; });
  return { scheme, host, port: port ? Number(port) : (scheme === 'https' ? 443 : 80), path, query, hash: hashPart };
}` },
    mcq: { q: 'The URL is <code>https://a.com/x?id=7</code>. What does <code>new URL(...).search</code> return?', options: ['"id=7"', '"?id=7"', '"/x?id=7"', '{ id: "7" }'], answer: 1, explain: '<code>search</code> includes the leading question mark. Use <code>searchParams</code> if you want parsed keys and values.' },
    hints: [
      `<p>Hint 1: the platform already ships a correct parser — the <code>URL</code> class. It throws a <code>TypeError</code> on invalid input.</p>`,
      `<p>Hint 2: wrap <code>new URL(text)</code> in <code>try/catch</code>; use <code>Object.fromEntries(u.searchParams)</code> for the query; <code>u.port</code> is an empty string when the port is the default.</p>`,
      `<p>Hint 3: Recipe: try to build the URL, catch → return null. scheme = protocol minus ":". port = u.port ? Number(u.port) : (https → 443, http → 80). hash = u.hash minus "#".</p>`
    ],
    solution: {
      approach: `<p>Let the standard <code>URL</code> class do the parsing. Strip the punctuation JavaScript keeps (<code>:</code> on protocol, <code>#</code> on hash), convert the query with <code>Object.fromEntries</code>, and fill in the default port when <code>u.port</code> is empty.</p>`,
      code: { lang: 'js', run: true, code: `function describeUrl(text) {
  let u;
  try {
    u = new URL(text);               // throws TypeError for invalid URLs
  } catch (e) {
    return null;
  }
  const defaults = { 'http:': 80, 'https:': 443 };
  return {
    scheme: u.protocol.replace(':', ''),
    host: u.hostname,
    port: u.port ? Number(u.port) : (defaults[u.protocol] || null),
    path: u.pathname,
    query: Object.fromEntries(u.searchParams), // last duplicate wins
    hash: u.hash.replace('#', ''),
  };
}

console.log(describeUrl('https://shop.com/a/b?x=1&y=two#top'));
console.log(describeUrl('http://localhost:3000/'));
console.log(describeUrl('not a url'));` },
      complexity: `<p>Time O(L) for a URL of length L; space O(L).</p>`,
      followUps: ['Return an array for repeated keys instead of the last value', 'Reject schemes other than http/https', 'Support relative input with a base URL']
    }
  }]
});

/* ===================== TOPIC 3: HTTP ===================== */
topics.push({
  title: 'HTTP: Requests, Responses, Headers & Status Codes',
  analogy: `<p>HTTP is a <b>polite letter exchange</b>. Your letter (the <b>request</b>) has an envelope with instructions (<i>headers</i>), a first line saying what you want ("please <b>GET</b> me the menu"), and sometimes a note inside (<i>body</i>). The reply (the <b>response</b>) starts with a result code ("<b>200</b> here you go", "<b>404</b> never heard of it"), then its own envelope notes, then the actual content. Both sides must follow the same letter format — that agreed format <i>is</i> the protocol.</p>`,
  explain: `<p><b>🟢 The plain idea.</b> HTTP (HyperText Transfer Protocol) is the format of the conversation between browser and server. It is <b>text-based</b> and <b>request → response</b>: the client always speaks first, the server answers once, and the server forgets you (HTTP is <i>stateless</i>).</p>
    <p><b>A request has four parts:</b></p>
    <pre>GET /products/42?color=red HTTP/1.1      &larr; request line: METHOD  PATH  VERSION
Host: shop.example.com                    &larr; headers: Name: value
Accept: application/json
Cookie: session=abc123
                                          &larr; blank line = end of headers
(optional body, e.g. JSON for POST)</pre>
    <p><b>A response has four parts too:</b></p>
    <pre>HTTP/1.1 200 OK                           &larr; status line: VERSION  CODE  REASON
Content-Type: application/json            &larr; headers
Cache-Control: max-age=60

{"id": 42, "name": "Red shoe"}            &larr; body</pre>
    <p><b>🔵 Methods = the verb.</b> They say what you want to do:</p>
    ${H.table(['Method', 'Meaning', 'Has body?', 'Safe*', 'Idempotent**'], [
      ['GET', 'Read something', 'no', 'yes', 'yes'],
      ['POST', 'Create / run an action', 'yes', 'no', 'no'],
      ['PUT', 'Replace a whole thing', 'yes', 'no', 'yes'],
      ['PATCH', 'Change part of a thing', 'yes', 'no', 'no (usually)'],
      ['DELETE', 'Remove it', 'rarely', 'no', 'yes'],
      ['HEAD', 'Like GET but headers only', 'no', 'yes', 'yes'],
      ['OPTIONS', 'Ask what is allowed (CORS preflight)', 'no', 'yes', 'yes']
    ])}
    <p><small>* Safe = does not change anything on the server. ** Idempotent = doing it 5 times has the same effect as doing it once (important for retries).</small></p>
    <p><b>Status codes = the answer, in five families:</b></p>
    ${H.table(['Range', 'Family', 'Meaning', 'Examples'], [
      ['1xx', 'Informational', 'Hold on, working…', '101 Switching Protocols (WebSocket)'],
      ['2xx', '<span class="c-g">Success</span>', 'It worked', '200 OK · 201 Created · 204 No Content'],
      ['3xx', '<span class="c-b">Redirect</span>', 'Look somewhere else', '301 Moved · 302 Found · 304 Not Modified'],
      ['4xx', '<span class="c-y">Client error</span>', 'Your request is wrong', '400 Bad Request · 401 · 403 · 404 · 429'],
      ['5xx', '<span class="c-r">Server error</span>', 'We broke', '500 · 502 Bad Gateway · 503 · 504']
    ])}
    <p><b>Headers</b> are the envelope notes. Must-know: <code>Host</code>, <code>User-Agent</code>, <code>Accept</code>, <code>Content-Type</code> (what the body is), <code>Content-Length</code>, <code>Authorization</code>, <code>Cookie</code> / <code>Set-Cookie</code>, <code>Cache-Control</code>, <code>ETag</code>, <code>Location</code> (where to redirect).</p>
    <p><b>Remember the blame rule:</b> <b>4xx = fix your request</b>, <b>5xx = the server has a problem</b>. In interviews, that single sentence earns real points.</p>`,
  clues: [
    '"What is the difference between GET and POST?" — safe/idempotent, body, caching, URL visibility',
    '"401 vs 403" — 401 = not logged in (who are you?), 403 = logged in but not allowed',
    '"Why is HTTP called stateless?" — each request stands alone; cookies/tokens carry the identity',
    '"Which status code should this API return?" — 201 on create, 204 on empty success, 404 missing, 409 conflict, 422 validation, 429 rate limit',
    '"Safe to retry?" — idempotent methods (GET, PUT, DELETE) yes; POST needs an idempotency key',
    '"301 vs 302 / 307 vs 308" — permanent vs temporary, and whether the method may change'
  ],
  code: [
    { lang: 'js', run: true, title: 'Build and read HTTP messages with Request / Response / Headers', code: `// These are the exact same objects fetch() uses. No network is needed to try them.
const req = new Request('https://shop.example.com/products/42?color=red', {
  method: 'GET',
  headers: { Accept: 'application/json', 'X-Trace': 'abc' },
});
console.log('METHOD :', req.method);
console.log('URL    :', req.url);
console.log('Accept :', req.headers.get('accept')); // header names are case-insensitive

const res = new Response(JSON.stringify({ id: 42, name: 'Red shoe' }), {
  status: 200,
  headers: { 'Content-Type': 'application/json', 'Cache-Control': 'max-age=60' },
});

async function main() {
  console.log('status :', res.status, res.statusText || '(OK)');
  console.log('ok?    :', res.ok); // true for any 2xx
  for (const [name, value] of res.headers) console.log('header :', name, '=', value);
  const body = await res.json();   // the body is read ONCE, as a stream
  console.log('body   :', body);
}
main();` },
    { lang: 'http', title: 'The raw text on the wire (HTTP/1.1)', code: `POST /api/orders HTTP/1.1
Host: shop.example.com
Content-Type: application/json
Content-Length: 27
Authorization: Bearer eyJhbGciOi...

{"productId":42,"qty":2}

--- the server's answer ---

HTTP/1.1 201 Created
Content-Type: application/json
Location: /api/orders/9001
Set-Cookie: cart=; Max-Age=0

{"id":9001,"status":"paid"}` }
  ],
  codeTitle: ['Request / Response objects', 'Raw HTTP text'],
  viz: [
    {
      title: 'One HTTP round trip: Browser → Server → Database',
      input: 'GET /products/42',
      inputLabel: 'METHOD /path',
      gen: function (input) {
        var m = /^\s*(GET|POST|PUT|PATCH|DELETE|HEAD)\s+(\/\S*)\s*$/i.exec(String(input));
        if (!m) throw new Error('Type METHOD and path, e.g. GET /products/42 or POST /orders or GET /admin/users or GET /missing');
        var method = m[1].toUpperCase(), path = m[2];
        var blocked = /^\/admin/.test(path), missing = /missing|404/.test(path);
        var code = blocked ? 403 : missing ? 404 : method === 'POST' ? 201 : method === 'DELETE' ? 204 : 200;
        var reason = { 200: 'OK', 201: 'Created', 204: 'No Content', 403: 'Forbidden', 404: 'Not Found' }[code];
        var sql = method === 'GET' || method === 'HEAD' ? 'SELECT … WHERE id = ?' : method === 'POST' ? 'INSERT INTO …' : method === 'DELETE' ? 'DELETE FROM …' : 'UPDATE … SET …';
        var hasBody = method === 'POST' || method === 'PUT' || method === 'PATCH';
        var reqRaw = method + ' ' + path + ' HTTP/1.1\nHost: shop.example.com\nAccept: application/json\n' + (hasBody ? 'Content-Type: application/json\n\n{"qty":2}' : '');
        var resRaw = 'HTTP/1.1 ' + code + ' ' + reason + '\nContent-Type: application/json\n' + (code === 204 || method === 'HEAD' ? '' : '\n{"result":"' + (code < 300 ? 'ok' : 'error') + '"}');
        var nodes = [
          { id: 'B', label: 'Browser', x: 12, y: 22, shape: 'box' },
          { id: 'S', label: 'Web server', x: 50, y: 22, shape: 'box' },
          { id: 'DB', label: 'Database', x: 88, y: 22, shape: 'box' }
        ];
        var edges = [['B', 'S', 'HTTP'], ['S', 'DB', 'SQL']];
        function g(hl, ehl, tags) { return { type: 'graph', directed: true, height: 40, nodes: nodes, edges: edges, hl: hl, ehl: ehl, tags: tags }; }
        var cls = code < 300 ? 'ok' : 'bad';
        var frames = [];
        frames.push({ narr: 'The browser writes a request: <b>' + method + ' ' + H.esc(path) + '</b>. The first line says <i>what</i> (method), <i>which</i> (path) and <i>how</i> (version).', parts: [g({ B: 'cur' }, {}, { B: 'writing request' }), { type: 'code', label: 'Request text', lang: 'http', code: reqRaw, hl: { 1: 'cur' } }] });
        frames.push({ narr: 'The text is sent through the already-open (encrypted) connection. The headers (<code>Host</code>, <code>Accept</code>…) travel with it.', parts: [g({ B: 'cur', S: 'cur' }, { 'B-S': 'cur' }, { S: 'receiving' }), { type: 'code', label: 'Request text', lang: 'http', code: reqRaw, hl: { 2: 'win', 3: 'win' } }] });
        frames.push({ narr: blocked ? 'The server <b>routes</b> the request, but <code>/admin</code> needs special permission. It stops here: no database call is needed.' : 'The server <b>routes</b> the request: "method + path" decides which function runs. This function needs data.', parts: [g({ S: blocked ? 'bad' : 'cur' }, { 'B-S': 'done' }, { S: 'routing' }), { type: 'vars', label: 'Server thinks', vals: { method: method, path: path, handler: blocked ? 'auth check' : 'product handler' } }] });
        frames.push({ narr: blocked ? 'No database trip. The check says "not allowed" → status <b>403</b>.' : (missing ? 'The server asks the database (<code>' + sql + '</code>) and finds <b>nothing</b>.' : 'The server asks the database: <code>' + sql + '</code>.'), parts: [g({ S: 'cur', DB: blocked ? 'done' : 'cur' }, blocked ? {} : { 'S-DB': 'cur' }, { DB: blocked ? 'skipped' : (missing ? 'no rows' : 'rows') }), { type: 'text', html: blocked ? 'Auth rule fails → skip DB.' : 'SQL: <code>' + sql + '</code>' }] });
        frames.push({ narr: 'The server picks a <b>status code</b>: <b>' + code + ' ' + reason + '</b> (' + (code < 300 ? 'success' : 'client error — fix the request') + ') and builds the response text.', parts: [g({ S: cls }, { 'S-DB': blocked ? '' : 'ok' }, { S: code + ' ' + reason }), { type: 'code', label: 'Response text', lang: 'http', code: resRaw, hl: { 1: cls } }] });
        frames.push({ narr: 'The response flows back on the same connection. Notice the browser <i>never</i> sees the database — only the server\'s answer.', parts: [g({ B: cls, S: 'done' }, { 'B-S': cls }, { B: code + ' ' + reason }), { type: 'code', label: 'Response text', lang: 'http', code: resRaw, hl: { 1: cls } }] });
        frames.push({ narr: 'The browser reads the status first, then headers, then the body. ' + (code < 300 ? 'Success: it can hand the data to the page.' : 'A 4xx/5xx still has a response; <code>fetch</code> does <b>not</b> throw for it — you must check <code>res.ok</code>.'), parts: [g({ B: 'sel' }, {}, { B: 'done' }), { type: 'vars', label: 'Browser decides', vals: { status: code, ok: code >= 200 && code < 300, nextStep: code < 300 ? 'use body' : 'show error' }, hl: { ok: cls } }] });
        return frames;
      }
    },
    {
      title: 'HTTP headers: the envelope notes',
      gen: function () {
        var reqH = [
          ['Host', 'shop.example.com'], ['User-Agent', 'Chrome/130 (Mac)'], ['Accept', 'application/json'], ['Accept-Language', 'en-IN,en;q=0.9'], ['Cookie', 'session=abc123'], ['Authorization', 'Bearer eyJ…']
        ];
        var why = {
          'Host': 'Which website on this server? (one server hosts many sites)',
          'User-Agent': 'Who is asking? (browser and version)',
          'Accept': 'Which formats I can read (json, html, image…)',
          'Accept-Language': 'My preferred languages, in order',
          'Cookie': 'The small notes you gave me earlier (login session)',
          'Authorization': 'Proof of who I am for an API call'
        };
        var resH = [
          ['Content-Type', 'application/json'], ['Content-Length', '31'], ['Cache-Control', 'max-age=60'], ['ETag', '"v7"'], ['Set-Cookie', 'session=abc; HttpOnly; Secure'], ['Location', '/login (only on 3xx)']
        ];
        var why2 = {
          'Content-Type': 'What the body is, so the browser knows how to read it',
          'Content-Length': 'How many bytes of body follow',
          'Cache-Control': 'How long this answer may be reused without asking again',
          'ETag': 'A version stamp: next time I can ask "still v7?" and get a tiny 304',
          'Set-Cookie': 'Please store this small note and send it back later',
          'Location': 'Go to this address instead (used with 301/302/307/308)'
        };
        var frames = [{ narr: 'Headers are <code>Name: value</code> lines. Names are case-insensitive. Let us add request headers one at a time, then response headers.', parts: [{ type: 'map', label: 'Request headers', entries: [] }] }];
        var i;
        for (i = 0; i < reqH.length; i++) {
          var hl = {}; hl[reqH[i][0]] = 'ok';
          frames.push({ narr: '<b>' + reqH[i][0] + '</b> — ' + why[reqH[i][0]] + '.', parts: [{ type: 'map', label: 'Request headers (browser → server)', entries: reqH.slice(0, i + 1), hl: hl }] });
        }
        for (i = 0; i < resH.length; i++) {
          var hl2 = {}; hl2[resH[i][0]] = 'sel';
          frames.push({ narr: '<b>' + resH[i][0] + '</b> — ' + why2[resH[i][0]] + '.', parts: [{ type: 'map', label: 'Request headers (browser → server)', entries: reqH, hl: {} }, { type: 'map', label: 'Response headers (server → browser)', entries: resH.slice(0, i + 1), hl: hl2 }] });
        }
        return frames;
      }
    },
    {
      title: 'Status code lookup: which family and what to do',
      input: '404',
      inputLabel: 'Status code',
      gen: function (input) {
        var n = parseInt(String(input).trim(), 10);
        if (isNaN(n) || n < 100 || n > 599) throw new Error('Type a status code between 100 and 599, e.g. 404');
        var table = [
          [200, 'OK', 'Success — use the body'], [201, 'Created', 'Success — new thing exists (see Location)'], [204, 'No Content', 'Success — nothing to read'],
          [301, 'Moved Permanently', 'Follow Location; update bookmarks'], [302, 'Found', 'Follow Location this time only'], [304, 'Not Modified', 'Use your cached copy'],
          [400, 'Bad Request', 'Your request is malformed — do not retry as is'], [401, 'Unauthorized', 'Log in (or refresh token)'], [403, 'Forbidden', 'Logged in but not allowed'],
          [404, 'Not Found', 'No such thing at this URL'], [409, 'Conflict', 'Clashes with current state (duplicate, version)'], [429, 'Too Many Requests', 'Slow down; wait Retry-After'],
          [500, 'Internal Server Error', 'Server bug — retry later, report'], [502, 'Bad Gateway', 'Proxy got junk from upstream'], [503, 'Service Unavailable', 'Overloaded or down — retry with backoff'], [504, 'Gateway Timeout', 'Upstream too slow']
        ];
        var fam = ['Informational', 'Success', 'Redirect', 'Client error (your fault)', 'Server error (their fault)'];
        var famTip = ['1xx: hold on, the final answer is coming.', '2xx: it worked.', '3xx: look somewhere else — the browser follows <code>Location</code> automatically.', '4xx: the request is wrong. Retrying the same request will not help.', '5xx: the server failed. Retrying later may help.'];
        var hi = {};
        table.forEach(function (r, i) { if (r[0] === n) hi[i] = 'sel'; });
        var fc = Math.floor(n / 100);
        var rows = table.map(function (r) { return [String(r[0]), r[1], r[2]]; });
        var frames = [];
        frames.push({ narr: 'Look at the <b>first digit</b> of ' + n + ': it is <b>' + fc + '</b>, so the family is <b>' + fam[fc - 1] + '</b>.', parts: [{ type: 'array', label: 'Status code digits', values: String(n).split(''), hl: { 0: 'cur' }, showIdx: false }] });
        frames.push({ narr: famTip[fc - 1], parts: [{ type: 'array', label: 'Family', values: ['1xx', '2xx', '3xx', '4xx', '5xx'], hl: (function () { var o = {}; o[fc - 1] = 'sel'; return o; })(), showIdx: false }, { type: 'text', html: '<b>' + fam[fc - 1] + '</b>' }] });
        var found = table.filter(function (r) { return r[0] === n; })[0];
        frames.push({ narr: found ? 'Exact match in the common-codes table: <b>' + found[0] + ' ' + found[1] + '</b> — ' + found[2] + '.' : 'Not in our short list of common codes, but the family tells you the general meaning: <b>' + fam[fc - 1] + '</b>.', parts: [{ type: 'table', label: 'Common status codes', columns: ['code', 'name', 'what the client should do'], rows: rows, hl: hi }] });
        var action = fc === 2 ? 'Read the body and carry on.' : fc === 3 ? 'Follow the <code>Location</code> header (browser does it for you; <code>fetch</code> follows by default).' : fc === 4 ? (n === 401 ? 'Ask the user to log in or refresh the token, then retry once.' : n === 429 ? 'Wait (<code>Retry-After</code>) then retry.' : 'Show an error. Do <b>not</b> retry the same request.') : fc === 5 ? 'Retry with exponential backoff (safe only if the request is idempotent), then show a friendly error.' : 'Keep waiting for the final response.';
        frames.push({ narr: 'What your code should do: ' + action, parts: [{ type: 'vars', label: 'Decision', vals: { status: n, family: fam[fc - 1], retry: fc === 5 || n === 429 || n === 408 ? 'maybe (with backoff)' : 'no' }, hl: { family: 'sel' } }] });
        return frames;
      }
    }
  ],
  examples: [
    { title: 'GET vs POST — the same login, two ways', html: `<p><b>GET</b> puts data in the URL (<code>/login?user=asha&amp;pw=secret</code>) — it lands in history, logs and the Referer header. <span class="c-r">Never do this.</span> <b>POST</b> puts data in the <b>body</b>, which is not in the URL, is not cached and is not bookmarked. Use GET to <i>read</i> and POST (or PUT/PATCH/DELETE) to <i>change</i> things.</p>`, code: { lang: 'js', run: true, code: `// Same data, two ways of building the request (no network needed)
const viaGet = new Request('https://site.test/login?user=asha&pw=secret');
const viaPost = new Request('https://site.test/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ user: 'asha', pw: 'secret' }),
});
console.log('GET  leaks into the URL :', viaGet.url);
console.log('POST keeps URL clean    :', viaPost.url);
viaPost.text().then(b => console.log('POST body                :', b));` } },
    { title: '401 or 403?', html: `<p>Visit <code>/account</code> while logged out → <b>401 Unauthorized</b> ("I don't know who you are — please authenticate"). Visit <code>/admin</code> while logged in as a normal user → <b>403 Forbidden</b> ("I know who you are, and the answer is no"). The name "Unauthorized" for 401 is a historical mistake: it really means <i>unauthenticated</i>.</p>${H.table(['Situation', 'Code'], [['No token / expired token', '401'], ['Valid token, missing permission', '403'], ['Hiding that a secret page even exists', '404 (some apps do this on purpose)']])}` },
    { title: 'Redirects: 301 vs 302 vs 307 vs 308', html: `<p>A redirect is a response with a <code>3xx</code> code and a <code>Location</code> header. <b>301/308</b> = permanent (browsers and Google remember). <b>302/307</b> = temporary. The difference between 302 and 307: old browsers turn a redirected POST into a GET after 302; <b>307/308 keep the method</b>. Typical use: <code>http://site.com</code> → 301 → <code>https://site.com</code>.</p>`, code: { lang: 'js', run: true, code: `// Build a redirect response and read its parts, exactly as a browser would
const redirect = Response.redirect('https://site.com/new-home', 301);
console.log(redirect.status);                      // 301
console.log(redirect.headers.get('location'));     // https://site.com/new-home` } },
    { title: 'Reading the body only once', html: `<p>A response body is a <b>stream</b>: like a water pipe, once drained it is empty. Calling <code>res.json()</code> twice throws <code>body stream already read</code>. Use <code>res.clone()</code> first if you need two readers.</p>`, code: { lang: 'js', run: true, code: `async function main() {
  const res = new Response('{"a":1}');
  const copy = res.clone();               // make a second reader first
  console.log(await res.json());          // { a: 1 }
  console.log(await copy.text());         // '{"a":1}'
  try { await res.text(); } catch (e) { console.log('second read fails:', e.name); }
}
main();` } }
  ],
  deepDive: `<p><b>🟣 Beyond the basics.</b></p>
    <ul>
      <li><b>Versions.</b> <b>HTTP/1.1</b> is plain text; one request at a time per connection, so browsers open ~6 connections per host and suffer <i>head-of-line blocking</i>. <b>HTTP/2</b> is binary and <i>multiplexed</i>: many requests interleave on one connection, headers are compressed (HPACK). It still runs on TCP, so one lost packet stalls every stream. <b>HTTP/3</b> uses QUIC over UDP: streams are independent, connection setup is faster, and it survives network switches (Wi-Fi → mobile). Your code (<code>fetch</code>, status codes, headers) is identical across versions.</li>
      <li><b>Caching</b> is the biggest free speed-up. <code>Cache-Control: max-age=31536000, immutable</code> on fingerprinted files (<code>app.3f9a1c.js</code>) means "never ask again". <code>Cache-Control: no-cache</code> means "store it, but revalidate first" (not "do not store" — that is <code>no-store</code>). Revalidation sends <code>If-None-Match: "v7"</code>; if unchanged the server answers <b>304 Not Modified</b> with no body.</li>
      <li><b>Content negotiation &amp; compression:</b> <code>Accept-Encoding: gzip, br</code> lets the server send Brotli-compressed HTML/JS — typically 70–80% smaller. <code>Vary: Accept-Encoding</code> tells caches to store separate copies.</li>
      <li><b>Cookies:</b> <code>Set-Cookie</code> stores a note; the browser attaches it to later requests via <code>Cookie</code>. Flags: <code>HttpOnly</code> (JS cannot read it → XSS protection), <code>Secure</code> (HTTPS only), <code>SameSite=Lax/Strict</code> (limits cross-site sending → CSRF protection). Covered fully in the security module.</li>
      <li><b>Idempotency &amp; retries:</b> networks fail after the server already acted. A retried <code>POST /payments</code> can charge twice. The cure is an <b>idempotency key</b> header (<code>Idempotency-Key: uuid</code>) the server uses to detect repeats. Never auto-retry non-idempotent calls without one.</li>
      <li><b>Other things you will meet:</b> <code>Range</code> requests (video seeking, 206 Partial Content), <code>Transfer-Encoding: chunked</code> (stream a response of unknown size), Server-Sent Events and WebSockets (<code>101 Switching Protocols</code>), and HTTPS everywhere (HSTS header forces it).</li>
      <li><b>Status-code design for APIs:</b> be specific and consistent: 201 + <code>Location</code> for create, 204 for delete, 400 vs 422 (malformed vs semantically invalid), 409 for conflicts, 429 + <code>Retry-After</code> for rate limits. Never return 200 with <code>{"error": …}</code> — it breaks caches, monitoring and retries.</li>
    </ul>`,
  aiEra: `<p><b>What AI changes:</b> Every LLM API call is just an HTTP <code>POST</code> with JSON and an <code>Authorization</code> header; streaming answers use <code>Transfer-Encoding: chunked</code> or Server-Sent Events. <code>429</code> (rate limit) and <code>529/503</code> (overloaded) are daily realities, so retry-with-backoff and idempotency matter more than ever. AI "tool calling" and MCP servers are also HTTP request/response at heart.</p>
    <p><b>Use AI as a partner:</b> paste a raw request/response and ask <code>Explain every header and tell me what is missing or risky.</code> Ask it to generate the <code>curl</code> command for a described API call, then <i>run it and read the response yourself</i>.</p>
    <p><b>Where AI goes wrong:</b> it picks the wrong status (200 for errors, 401 vs 403 mixed), forgets <code>res.ok</code> checks with fetch, puts secrets in query strings, or claims POST is "more secure than GET" (it is not — only the logging/history visibility differs; HTTPS is what protects data).</p>
    <p><b>What you must still own:</b> choosing correct methods and status codes, knowing which requests are safe to retry, and checking real responses in the Network panel instead of trusting a generated description.</p>`,
  problems: [{
    title: 'What Should the Client Do Next?',
    level: 'Medium', tags: ['http', 'status codes', 'retry'], companies: ['Stripe', 'Atlassian'],
    statement: `<p>Write <code>nextAction(status, headers)</code> that returns one of these strings based on an HTTP response: <code>'use-body'</code> (200, 201, 204 etc. — any 2xx), <code>'follow:&lt;url&gt;'</code> (301, 302, 303, 307, 308 with a <code>location</code> header), <code>'use-cache'</code> (304), <code>'login'</code> (401), <code>'retry-after:&lt;seconds&gt;'</code> (429 or 503 with a <code>retry-after</code> header, seconds as a number), <code>'retry-backoff'</code> (500, 502, 503 or 504 without a Retry-After), and <code>'fail'</code> for everything else (400, 403, 404, 409, 422…). <code>headers</code> is a plain object with lowercase keys.</p>`,
    constraints: `status is an integer 100–599. headers may be empty. A redirect without a location header counts as <code>'fail'</code>.`,
    example: `<p><code>nextAction(404, {})</code> → ${H.c('r', "'fail'")} (client error, retrying cannot help). <code>nextAction(503, {'retry-after':'30'})</code> → ${H.c('y', "'retry-after:30'")}. <code>nextAction(301, {location:'/new'})</code> → ${H.c('b', "'follow:/new'")}.</p>`,
    brute: { why: `<p>Treat every non-200 as an error and retry up to 3 times. It hides redirects (breaking links), hammers servers with pointless retries on 404/403, and ignores the <code>Retry-After</code> hint the server gave you. The waste is retrying requests that can never succeed.</p>`, code: `function nextActionBrute(status) {
  if (status === 200) return 'use-body';
  return 'retry-backoff'; // wrong for 404, 403, 401, redirects, 304...
}` },
    mcq: { q: 'A <code>POST /payments</code> returns <code>504 Gateway Timeout</code>. What is the safest next step?', options: ['Retry immediately with the same request', 'Retry only with an idempotency key (or check status first), because the payment may have succeeded', 'Show a success message', 'Switch the method to GET'], answer: 1, explain: 'A timeout does not tell you whether the server acted. Retrying a non-idempotent POST without protection can charge the customer twice.' },
    hints: [
      `<p>Hint 1: Start with the <b>family</b> (<code>Math.floor(status / 100)</code>), then handle the special cases inside it.</p>`,
      `<p>Hint 2: Check the specific codes first (304, 401, 429, 503) then the families (2xx, 3xx, 5xx). Order matters: 503 is both "5xx" and "may have Retry-After".</p>`,
      `<p>Hint 3: Recipe: 2xx → use-body; 304 → use-cache; redirect codes → follow if location exists else fail; 401 → login; 429 or 503 with retry-after → 'retry-after:N'; 429 without header → retry-backoff; other 5xx → retry-backoff; else fail.</p>`
    ],
    solution: {
      approach: `<p>Special cases first (304, 401, redirects, the two codes that may carry <code>Retry-After</code>), then broad families. Parse <code>retry-after</code> as a number of seconds; if it is missing or not a number fall back to exponential backoff.</p>`,
      code: { lang: 'js', run: true, code: `function nextAction(status, headers) {
  const h = headers || {};
  if (status === 304) return 'use-cache';
  if (status >= 200 && status < 300) return 'use-body';
  if ([301, 302, 303, 307, 308].includes(status)) {
    return h.location ? 'follow:' + h.location : 'fail';
  }
  if (status === 401) return 'login';
  if (status === 429 || status === 503) {
    const secs = Number(h['retry-after']);
    // the server told us exactly how long to wait: obey it
    return Number.isFinite(secs) && h['retry-after'] !== undefined ? 'retry-after:' + secs : 'retry-backoff';
  }
  if (status >= 500) return 'retry-backoff'; // 500, 502, 504 ...
  return 'fail';                              // other 4xx and 1xx: retrying cannot help
}

console.log(nextAction(200, {}));                          // use-body
console.log(nextAction(301, { location: '/new' }));        // follow:/new
console.log(nextAction(503, { 'retry-after': '30' }));     // retry-after:30
console.log(nextAction(429, {}));                          // retry-backoff
console.log(nextAction(404, {}));                          // fail` },
      complexity: `<p>O(1) time and space.</p>`,
      followUps: ['Parse Retry-After given as an HTTP date', 'Only retry when the method is idempotent', 'Add jitter to the backoff delay']
    }
  }]
});

/* ===================== TOPIC 4: HTML, CSS, JS roles ===================== */
topics.push({
  title: 'HTML, CSS & JavaScript: Three Jobs, One Page',
  analogy: `<p>Build a house. <b>HTML is the skeleton and rooms</b> (walls, doors, windows: what exists). <b>CSS is the paint, furniture and layout</b> (colours, sizes, where things sit). <b>JavaScript is the electricity and plumbing</b> (light switches, doorbells, anything that <i>does</i> something). A house with only walls is bare but you can still enter. A house with no walls but fancy wiring is useless.</p>`,
  explain: `<p><b>🟢 The plain idea.</b> Every web page is built from three languages. Each has one job:</p>
    ${H.table(['Language', 'Job', 'Answers the question', 'Looks like'], [
      ['<b>HTML</b>', 'Structure &amp; meaning', '"<span class="c-b">What is on the page?</span>"', '<code>&lt;h1&gt;Shoes&lt;/h1&gt;</code>'],
      ['<b>CSS</b>', 'Look &amp; layout', '"<span class="c-g">How does it look and where does it sit?</span>"', '<code>h1 { color: green; }</code>'],
      ['<b>JavaScript</b>', 'Behaviour &amp; logic', '"<span class="c-p">What happens when the user does something?</span>"', '<code>btn.onclick = buy;</code>']
    ])}
    <p><b>🔵 How they fit together.</b></p>
    <ol>
      <li>The browser reads <b>HTML</b> and builds a tree of objects called the <b>DOM</b> (Document Object Model). Each tag becomes a node: <code>body</code> contains <code>h1</code>, <code>button</code>, and so on.</li>
      <li>It reads <b>CSS</b> and works out the final style of every node (this is the <b>CSSOM</b>).</li>
      <li><b>JavaScript</b> can read and change the DOM and the styles at any time. When it does, the browser re-draws the page.</li>
    </ol>
    <p>That is why the order of dependencies is strict: <b>CSS needs HTML</b> (nothing to style without elements) and <b>JS usually needs HTML</b> (nothing to click without a button). But <b>HTML never needs CSS or JS</b> — a page of pure HTML still works. This idea is called <b>progressive enhancement</b>: start with content that works for everyone, then layer styling, then behaviour.</p>
    <p>A tiny page showing all three:</p>
    <pre>&lt;button id="buy"&gt;Buy now&lt;/button&gt;          &larr; HTML: a button exists
&lt;style&gt; #buy { background: green; } &lt;/style&gt; &larr; CSS: it is green
&lt;script&gt; buy.onclick = () =&gt; alert('Thanks!') &lt;/script&gt;  &larr; JS: clicking shows a message</pre>
    <p><b>Where do you put each?</b> Real projects keep them in separate files (<code>index.html</code>, <code>styles.css</code>, <code>app.js</code>) and link them: <code>&lt;link rel="stylesheet" href="styles.css"&gt;</code> and <code>&lt;script src="app.js" defer&gt;&lt;/script&gt;</code>. Separate files can be <b>cached</b> and reused across pages.</p>
    <p><b>Debugging by layer:</b> content wrong or missing → HTML. Looks wrong → CSS. Does the wrong thing / nothing → JS (check the Console). Data missing → network/server. This habit makes you fast.</p>`,
  clues: [
    '"Difference between HTML, CSS and JavaScript?" — structure vs presentation vs behaviour (separation of concerns)',
    '"What is the DOM?" — the browser\'s live tree of objects built from HTML; JS reads/writes it',
    '"Is HTML a programming language?" — no: it is a markup language (no logic, loops or variables)',
    '"Why put CSS in the &lt;head&gt; and JS at the end or with <code>defer</code>?" — CSS blocks rendering, JS blocks parsing',
    '"Page looks fine but button does nothing" — JS error or the handler was attached before the element existed',
    '"Progressive enhancement / graceful degradation" — works without JS, better with it'
  ],
  code: [
    { lang: 'html', title: 'All three layers in one file', code: `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Buy button</title>
  <!-- CSS: how it looks -->
  <style>
    #buy { background: seagreen; color: white; border: 0; padding: 12px 20px; border-radius: 8px; }
    #buy:hover { background: darkgreen; }
  </style>
</head>
<body>
  <!-- HTML: what exists -->
  <h1>Red shoe</h1>
  <button id="buy">Buy now</button>
  <p id="msg"></p>

  <!-- JS: what happens on click -->
  <script>
    document.getElementById('buy').addEventListener('click', () => {
      document.getElementById('msg').textContent = 'Added to cart!';
    });
  <\/script>
</body>
</html>` },
    { lang: 'js', run: true, title: 'The three layers as plain data (runs anywhere)', code: `// A toy "browser": HTML is structure, CSS is rules, JS is behaviour.
const html = { tag: 'button', id: 'buy', text: 'Buy now' };      // HTML: what exists
const css  = { '#buy': { background: 'seagreen', color: 'white' } }; // CSS: how it looks
let clicks = 0;
const js   = { '#buy': { click() { clicks++; html.text = 'Added (' + clicks + ')'; } } }; // JS: behaviour

function render() {
  const style = css['#' + html.id] || {};
  console.log('<' + html.tag + ' style="' + JSON.stringify(style) + '">' + html.text + '</' + html.tag + '>');
}

render();                    // first paint
js['#buy'].click(); render(); // user clicks: JS changes the data, browser re-renders
js['#buy'].click(); render();` }
  ],
  codeTitle: ['A complete tiny web page', 'HTML + CSS + JS as data'],
  viz: [
    {
      title: 'Build one button layer by layer',
      gen: function () {
        var htmlOnly = '<button id="buy">Buy now</button>';
        var withCss = '<style>\n  #buy { background: seagreen;\n         color: white; }\n</style>\n<button id="buy">Buy now</button>';
        var withJs = '<style>\n  #buy { background: seagreen;\n         color: white; }\n</style>\n<button id="buy">Buy now</button>\n<script>\n  buy.onclick = () =>\n    buy.textContent = "Added!";\n<\/script>';
        return [
          { narr: 'Start with <b>HTML only</b>. One tag. The browser already shows something useful: a clickable grey button.', parts: [{ type: 'code', label: 'index.html', lang: 'html', code: htmlOnly, hl: { 1: 'sel' } }, { type: 'table', label: 'What the user gets', columns: ['Layer', 'Present?', 'Result'], rows: [['HTML', 'yes', 'A default grey button'], ['CSS', 'no', 'Plain browser style'], ['JS', 'no', 'Clicking does nothing']], hl: { 0: 'ok' } }] },
          { narr: 'Add <b>CSS</b>. We did not change the HTML at all — the rule <code>#buy { … }</code> finds the element by its <code>id</code> and paints it. Same structure, new look.', parts: [{ type: 'code', label: 'index.html + CSS', lang: 'html', code: withCss, hl: { 1: 'ok', 2: 'ok', 3: 'ok', 4: 'ok' } }, { type: 'table', label: 'What the user gets', columns: ['Layer', 'Present?', 'Result'], rows: [['HTML', 'yes', 'A button'], ['CSS', 'yes', 'Green with white text'], ['JS', 'no', 'Clicking does nothing']], hl: { 1: 'ok' } }] },
          { narr: 'Add <b>JavaScript</b>. It finds the same element and attaches a click handler that changes the text. Now the page <i>reacts</i>.', parts: [{ type: 'code', label: 'index.html + CSS + JS', lang: 'html', code: withJs, hl: { 6: 'sel', 7: 'sel', 8: 'sel', 9: 'sel' } }, { type: 'table', label: 'What the user gets', columns: ['Layer', 'Present?', 'Result'], rows: [['HTML', 'yes', 'A button'], ['CSS', 'yes', 'Green with white text'], ['JS', 'yes', 'Click → text becomes "Added!"']], hl: { 2: 'sel' } }] },
          { narr: 'Experiment: <b>remove CSS</b>. The page still works, it is just ugly. CSS is an enhancement.', parts: [{ type: 'table', label: 'If a layer is removed', columns: ['Removed', 'What breaks?', 'Still usable?'], rows: [['CSS', 'Looks plain', 'yes'], ['JS', 'Nothing happens on click', 'content yes, features no'], ['HTML', 'There is nothing to style or click', 'no']], hl: { 0: 'ok' } }] },
          { narr: 'Now <b>remove JavaScript</b>. Content and style survive; only interactive features vanish. This is why important content should be real HTML, not built by JS (search engines and slow phones thank you).', parts: [{ type: 'table', label: 'If a layer is removed', columns: ['Removed', 'What breaks?', 'Still usable?'], rows: [['CSS', 'Looks plain', 'yes'], ['JS', 'Nothing happens on click', 'content yes, features no'], ['HTML', 'There is nothing to style or click', 'no']], hl: { 1: 'cur' } }] },
          { narr: 'Finally <b>remove HTML</b>. CSS and JS have no elements to attach to: everything collapses. HTML is the foundation; the other two are layers on top.', parts: [{ type: 'table', label: 'If a layer is removed', columns: ['Removed', 'What breaks?', 'Still usable?'], rows: [['CSS', 'Looks plain', 'yes'], ['JS', 'Nothing happens on click', 'content yes, features no'], ['HTML', 'There is nothing to style or click', 'no']], hl: { 2: 'bad' } }] }
        ];
      }
    },
    {
      title: 'Which layer is the culprit? (debugging by symptom)',
      input: '3',
      inputLabel: 'Symptom number (1–7)',
      gen: function (input) {
        var n = parseInt(String(input).trim(), 10);
        var S = [
          ['The heading text is spelled wrong', 'HTML', 'Fix the text in the markup (or the data that builds it)'],
          ['The button is the wrong colour', 'CSS', 'Check the Styles pane in the Elements panel'],
          ['Clicking "Buy" does nothing', 'JS', 'Open Console: look for a red error; check the handler is attached'],
          ['The layout breaks on phones', 'CSS', 'Media queries / flexbox; test in device mode'],
          ['The price shows "undefined"', 'JS / Data', 'Network panel: did the API return it? Then check the code reading it'],
          ['Screen readers say "button button"', 'HTML', 'Semantics and ARIA belong to markup'],
          ['The page is blank, Console shows 404 for app.js', 'Network / Server', 'Wrong script path or missing deploy — HTTP layer']
        ];
        if (isNaN(n) || n < 1 || n > S.length) throw new Error('Type a number from 1 to ' + S.length);
        var cls = { 'HTML': 'win', 'CSS': 'ok', 'JS': 'sel', 'JS / Data': 'sel', 'Network / Server': 'bad' };
        var rows = S.map(function (r, i) { return [String(i + 1), r[0], r[1]]; });
        var s = S[n - 1], hlr = {}; hlr[n - 1] = cls[s[1]];
        return [
          { narr: 'Seven common symptoms. Rule: <b>content → HTML, looks → CSS, behaviour → JS, files/data not arriving → network</b>.', parts: [{ type: 'table', label: 'Symptoms', columns: ['#', 'Symptom', 'Layer'], rows: rows.map(function (r) { return [r[0], r[1], '?']; }) }] },
          { narr: 'You picked symptom <b>' + n + '</b>: "' + s[0] + '".', parts: [{ type: 'table', label: 'Symptoms', columns: ['#', 'Symptom', 'Layer'], rows: rows.map(function (r) { return [r[0], r[1], '?']; }), hl: (function () { var o = {}; o[n - 1] = 'cur'; return o; })() }] },
          { narr: 'Ask: is it about <i>what</i> is there (HTML), <i>how</i> it looks (CSS), <i>what it does</i> (JS) or <i>did the files/data arrive</i> (network)? Answer: <b>' + s[1] + '</b>.', parts: [{ type: 'table', label: 'Symptoms', columns: ['#', 'Symptom', 'Layer'], rows: rows, hl: hlr }] },
          { narr: 'First debugging move: ' + s[2] + '.', parts: [{ type: 'vars', vals: { symptom: s[0], layer: s[1], firstMove: s[2] }, hl: { layer: 'sel' } }] }
        ];
      }
    }
  ],
  examples: [
    { title: 'Same HTML, two different looks (CSS only)', html: `<p>CSS Zen Garden proved this years ago: one HTML file, hundreds of designs, just by swapping the stylesheet. Content never changed. This is "separation of concerns" — designers touch CSS, writers touch HTML, programmers touch JS.</p>`, code: { lang: 'css', code: `/* theme-light.css */
body { background: white; color: #222; }

/* theme-dark.css : same HTML, different file */
body { background: #111; color: #eee; }` } },
    { title: 'JavaScript changes the DOM, the browser repaints', html: `<p>The code below finds an element, changes its text and adds a CSS class. You never "redraw" by hand — the browser notices the DOM change and updates the screen. (This snippet needs a real page, so it is shown, not run.)</p>`, code: { lang: 'js', code: `const msg = document.querySelector('#msg');   // find the element (HTML)
msg.textContent = 'Saved!';                    // change its content
msg.classList.add('success');                  // CSS class rule makes it green
msg.addEventListener('click', () => msg.remove()); // behaviour: remove on click` } },
    { title: 'Content that only exists after JavaScript runs', html: `<p>Some sites ship an empty <code>&lt;div id="root"&gt;&lt;/div&gt;</code> and let JS fill it (client-side rendering, e.g. React). Users with fast phones never notice, but the first paint waits for the JS download, and crawlers/link previews may see nothing. Server-side rendering and static generation send finished HTML instead and use JS only to "wake it up" (<i>hydration</i>).</p>${H.table(['Approach', 'First HTML contains', 'Good for'], [['Client-side rendering', '<code>&lt;div id="root"&gt;</code> only', 'Dashboards behind login'], ['Server-side rendering', 'Full page content', 'SEO, fast first paint'], ['Static generation', 'Pre-built HTML files', 'Blogs, docs, marketing']])}` },
    { title: 'Inline, internal and external CSS/JS', html: `<p>Three places to put CSS or JS: <b>inline</b> (<code>style="color:red"</code>) — highest priority but hard to reuse; <b>internal</b> (a <code>&lt;style&gt;</code> / <code>&lt;script&gt;</code> block) — fine for tiny demos; <b>external</b> (<code>.css</code> / <code>.js</code> files) — best: cacheable and shared by many pages. Production sites usually bundle many files into a few, and may inline a small critical CSS chunk for the fastest first paint.</p>` }
  ],
  deepDive: `<p><b>🟣 What is really going on inside the browser.</b></p>
    <ul>
      <li><b>HTML is forgiving.</b> The parser follows a precise algorithm from the HTML Standard that fixes mistakes (a missing <code>&lt;/p&gt;</code>, text outside <code>&lt;body&gt;</code>) the same way in every browser. It never "throws a syntax error" like JS does. That is why "view source" and the <b>Elements</b> panel can differ: the panel shows the repaired live DOM, source shows the original text.</li>
      <li><b>CSS is declarative &amp; cascading.</b> You describe rules; the browser decides which win (by origin, specificity, order) — the "cascade". Values are computed in several stages (specified → computed → used). It is also render-blocking: the browser will not paint until the CSS it can see is loaded, to avoid a flash of unstyled content.</li>
      <li><b>JavaScript is single-threaded per page.</b> One <i>main thread</i> runs JS, style calculation, layout and painting. A long task (say 300 ms of JS) means no clicks, no scrolling feedback, no animations — the page "freezes". Workers (<code>new Worker()</code>) give you extra threads, but they have no DOM access.</li>
      <li><b>The DOM is a live API, not HTML text.</b> <code>innerHTML</code> re-parses a string; <code>createElement</code> builds nodes directly. Setting <code>textContent</code> is safe from injection; <code>innerHTML</code> with user data is the classic XSS hole.</li>
      <li><b>Web platform layers:</b> HTML/CSS/JS are only the visible tip. Under them sit Web APIs: <code>fetch</code>, storage, Web Workers, WebSocket, Canvas/WebGL/WebGPU, Service Workers, Web Components. Frameworks (React, Vue, Svelte) are libraries written <i>in JavaScript</i> that manage the DOM for you; they do not replace the three languages.</li>
      <li><b>Why TypeScript, Sass, JSX exist:</b> they are not new browser languages. Build tools turn them into plain JS/CSS before the browser sees them. The browser only ever understands HTML, CSS, JS (plus WebAssembly bytecode).</li>
      <li><b>Standards:</b> HTML and DOM are maintained by WHATWG ("living standard", no version numbers); CSS by W3C working groups in modules (CSS Grid, CSS Color 4…); JS by TC39 (ECMAScript, a new edition every June). New features pass stages 0–4 and ship behind browser flags first; check <code>caniuse.com</code> or MDN's compatibility tables before relying on them.</li>
    </ul>`,
  aiEra: `<p><b>What AI changes:</b> AI tools generate whole pages of HTML/CSS/JS in seconds, and browser-based assistants can now read the DOM or the page's accessibility tree to "see" a site. Clean semantic HTML therefore helps three audiences at once: users with screen readers, search engines and AI agents.</p>
    <p><b>Use AI as a partner:</b> ask it to explain what each line of a generated page does, split a single file into HTML/CSS/JS, or <code>List 3 ways this page would still work with JavaScript disabled</code>. Then open the Elements and Console panels and verify.</p>
    <p><b>Where AI goes wrong:</b> it loves <code>&lt;div&gt;</code> soup and inline styles, mixes up layers (styling in JS, content in CSS <code>::before</code>), uses <code>innerHTML</code> with unsanitised text and invents browser APIs or CSS properties that do not exist.</p>
    <p><b>What you must still own:</b> knowing which layer owns which concern, choosing semantic markup and accessible behaviour, and being able to debug when the generated page "looks right but does nothing". Interviews will ask you to draw the layer boundaries from memory.</p>`,
  problems: [{
    title: 'Which Resources Block the Page?',
    level: 'Medium', tags: ['html', 'rendering', 'regex'], companies: ['Google', 'Shopify'],
    statement: `<p>Given a string of HTML, write <code>findBlockers(html)</code> that returns a list of <code>{ tag, blocks }</code> for every <code>&lt;link&gt;</code>, <code>&lt;script&gt;</code> and <code>&lt;img&gt;</code>. <code>tag</code> is the original tag text, and <code>blocks</code> is: <code>'render'</code> for <code>&lt;link rel="stylesheet"&gt;</code> (the browser will not paint until it loads), <code>'parser'</code> for a <code>&lt;script src&gt;</code> without <code>defer</code>, <code>async</code> or <code>type="module"</code> (HTML parsing stops), and <code>'none'</code> for everything else (defer/async/module scripts, images, other links).</p>`,
    constraints: `HTML up to 10<sup>4</sup> characters. Tags are well formed and on one line each. Attributes may appear in any order.`,
    example: `<p>Input has a stylesheet link, <code>&lt;script src="a.js"&gt;</code>, <code>&lt;script src="b.js" defer&gt;</code>, and an image.</p><p>Output: ${H.c('y', 'render')}, ${H.c('r', 'parser')}, ${H.c('g', 'none')}, ${H.c('g', 'none')}. Only the first two make the visitor wait.</p>`,
    brute: { why: `<p>Mark everything as blocking ("be safe"). That tells you nothing and leads to wrong advice like "remove all scripts". The wasted work is not distinguishing between resources that stop the parser, resources that stop painting and those that run in the background.</p>`, code: `function findBlockersBrute(html) {
  const tags = html.match(/<(link|script|img)\\b[^>]*>/gi) || [];
  return tags.map(tag => ({ tag, blocks: 'parser' })); // everything marked the same: useless
}` },
    mcq: { q: 'Which script tag lets the browser keep parsing HTML AND runs the script in order after parsing finishes?', options: ['<code>&lt;script src="a.js"&gt;</code>', '<code>&lt;script src="a.js" async&gt;</code>', '<code>&lt;script src="a.js" defer&gt;</code>', '<code>&lt;script src="a.js" blocking&gt;</code>'], answer: 2, explain: '<code>defer</code> downloads in parallel and runs in document order after the HTML is parsed. <code>async</code> runs as soon as it arrives, in any order.' },
    hints: [
      `<p>Hint 1: Only three tag names matter. Extract each opening tag with a regex.</p>`,
      `<p>Hint 2: Test attributes with small regexes: <code>/\\brel\\s*=\\s*["']stylesheet["']/i</code>, <code>/\\bsrc\\s*=/i</code>, <code>/\\b(defer|async)\\b/i</code>, <code>/type\\s*=\\s*["']module["']/i</code>.</p>`,
      `<p>Hint 3: Recipe: for each tag: if link with rel=stylesheet → render. Else if script with src and no defer/async/module → parser. Else none.</p>`
    ],
    solution: {
      approach: `<p>Scan every opening <code>link</code>, <code>script</code> and <code>img</code> tag with one regex, then classify with attribute tests. Order of attributes does not matter because each attribute has its own small test.</p>`,
      code: { lang: 'js', run: true, code: `function findBlockers(html) {
  const tags = html.match(/<(link|script|img)\\b[^>]*>/gi) || [];
  return tags.map(tag => {
    const name = tag.match(/^<(\\w+)/)[1].toLowerCase();
    let blocks = 'none';
    if (name === 'link' && /\\brel\\s*=\\s*["']stylesheet["']/i.test(tag)) {
      blocks = 'render'; // paint waits for CSS
    } else if (name === 'script' && /\\bsrc\\s*=/i.test(tag)) {
      const background = /\\b(defer|async)\\b/i.test(tag) || /type\\s*=\\s*["']module["']/i.test(tag);
      if (!background) blocks = 'parser'; // classic script stops HTML parsing
    }
    return { tag, blocks };
  });
}

const page = '<link rel="stylesheet" href="s.css">\\n<script src="a.js"><\/script>\\n<script src="b.js" defer><\/script>\\n<img src="x.png">';
findBlockers(page).forEach(r => console.log(r.blocks.padEnd(7), r.tag));` },
      complexity: `<p>O(L) time for HTML of length L; O(T) space for T tags.</p>`,
      followUps: ['Treat inline scripts (no src) as parser-blocking too', 'Handle &lt;link rel="preload"&gt; and media queries on stylesheets', 'Return an estimated blocking time given file sizes']
    }
  }]
});

/* ===================== TOPIC 5: How a page loads ===================== */
topics.push({
  title: 'How a Page Loads: From HTML Bytes to Pixels',
  analogy: `<p>Imagine <b>assembling flat-pack furniture</b> while the delivery truck is still unloading boxes. You read the instruction sheet (HTML) top to bottom. When it says "attach panel B (a stylesheet)" you start fetching it but keep reading. If a step says "stop and read the supplement before continuing" (a blocking script), you freeze until it arrives. You only call the furniture "ready to look at" when the paint is dry (CSS applied) and "fully done" when every last screw (image) is in.</p>`,
  explain: `<p><b>🟢 The plain idea.</b> After the HTML arrives, the browser works like an assembly line (the <b>critical rendering path</b>):</p>
    <ol>
      <li><b>Parse HTML → DOM.</b> Read the text top to bottom and build the tree of elements. While reading, whenever it meets <code>&lt;link rel="stylesheet"&gt;</code>, <code>&lt;script src&gt;</code> or <code>&lt;img&gt;</code> it <b>starts downloading</b> that file in parallel.</li>
      <li><b>Parse CSS → CSSOM.</b> Turn the stylesheet(s) into a tree of style rules.</li>
      <li><b>Combine → Render tree.</b> Pair every visible element with its final styles (<code>display:none</code> elements are left out).</li>
      <li><b>Layout (reflow).</b> Calculate the exact size and position of every box.</li>
      <li><b>Paint.</b> Fill in pixels: colours, text, borders, images. Then <b>composite</b> the layers on the GPU.</li>
    </ol>
    ${H.table(['Resource', 'What it blocks', 'Why'], [
      ['<code>&lt;link rel="stylesheet"&gt;</code>', '<span class="c-y">Painting</span>', 'Showing unstyled content then jumping is ugly, so the browser waits'],
      ['<code>&lt;script src="a.js"&gt;</code>', '<span class="c-r">HTML parsing</span>', 'The script might change the page (<code>document.write</code>), so the parser must stop'],
      ['<code>&lt;script defer&gt;</code>', '<span class="c-g">Nothing</span>', 'Downloads in parallel, runs after parsing, in order'],
      ['<code>&lt;script async&gt;</code>', '<span class="c-g">Mostly nothing</span>', 'Runs the moment it arrives, order not guaranteed'],
      ['<code>&lt;img&gt;</code>', '<span class="c-g">Nothing</span>', 'Loads in the background; only the <code>load</code> event waits']
    ])}
    <p><b>🔵 The key events, in order.</b></p>
    ${H.table(['#', 'Event', 'Fires when…', 'Typical use'], [
      ['1', '<code>readystatechange</code> (interactive)', 'HTML finished parsing', 'rarely used directly'],
      ['2', '<code>DOMContentLoaded</code>', 'DOM is built and deferred scripts have run (images/CSS may still load)', 'Start your app: attach handlers'],
      ['3', '<b>First Contentful Paint</b> (FCP)', 'First text or image appears on screen', 'Measure "it started"'],
      ['4', '<b>Largest Contentful Paint</b> (LCP)', 'Biggest element (hero image/heading) is shown', 'Core Web Vital: "it looks loaded"'],
      ['5', '<code>load</code>', 'Everything incl. images, fonts and iframes has finished', 'Late work, analytics']
    ])}
    <p><b>Remember:</b> <code>DOMContentLoaded</code> comes <i>before</i> <code>load</code>. Paint timing is independent of both — a page can paint long before <code>load</code> (good!) or have <code>DOMContentLoaded</code> long before the first paint if CSS is slow.</p>
    <p><b>Quick recipe for fast pages:</b> small HTML · CSS in the <code>&lt;head&gt;</code>, as small as possible · scripts with <code>defer</code> · compress images, set width/height (avoids layout jumps) · cache aggressively.</p>`,
  clues: [
    '"Order of DOMContentLoaded vs load" — DOMContentLoaded first (DOM ready), load last (all assets)',
    '"Why is my page blank for 2 seconds?" — render-blocking CSS or a big blocking script in the head',
    '"defer vs async" — defer keeps order and waits for parsing; async runs ASAP, unordered',
    '"What is the critical rendering path?" — HTML → DOM, CSS → CSSOM, render tree, layout, paint, composite',
    '"Core Web Vitals" — LCP (loading), INP (responsiveness), CLS (visual stability)',
    '"Reflow vs repaint" — geometry change recalculates layout; colour-only change just repaints'
  ],
  code: [
    { lang: 'html', title: 'A well-ordered <head>', code: `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Shoe shop</title>

  <!-- Start the connection to the API early (DNS + TCP + TLS) -->
  <link rel="preconnect" href="https://api.shop.example">

  <!-- CSS blocks rendering, so keep it small and in the head -->
  <link rel="stylesheet" href="/css/app.css">

  <!-- defer: download now, run after the HTML is parsed, keep order -->
  <script src="/js/app.js" defer><\/script>

  <!-- async: for independent scripts (analytics) that don't need the DOM or order -->
  <script src="https://stats.example/track.js" async><\/script>
</head>
<body>
  <h1>Red shoe</h1>
  <!-- width/height reserve space so the page doesn't jump when the image loads -->
  <img src="/img/shoe.jpg" alt="Red running shoe" width="640" height="480">
</body>
</html>` },
    { lang: 'js', title: 'Listening to the page-load events (needs a real page)', code: `// Run this inside a page's <script> to see the order for yourself
console.log('A: inline script, readyState =', document.readyState); // "loading"

document.addEventListener('readystatechange', () => {
  console.log('B: readystatechange ->', document.readyState); // interactive, then complete
});
document.addEventListener('DOMContentLoaded', () => {
  console.log('C: DOMContentLoaded (DOM ready, images may still load)');
});
window.addEventListener('load', () => {
  console.log('D: load (everything finished)');
});

// Measure real paint timings with the Performance API
new PerformanceObserver((list) => {
  for (const e of list.getEntries()) console.log(e.name, Math.round(e.startTime) + ' ms');
}).observe({ type: 'paint', buffered: true });` },
    { lang: 'js', run: true, title: 'A mini "parser" that spots blockers (runs anywhere)', code: `// Simulate how a browser reads a page top to bottom and what it must wait for.
const page = [
  '<link rel="stylesheet" href="app.css">',
  '<script src="vendor.js"><\/script>',
  '<script src="app.js" defer><\/script>',
  '<script src="stats.js" async><\/script>',
  '<img src="hero.jpg">',
];

for (const tag of page) {
  let verdict;
  if (/rel="stylesheet"/.test(tag)) verdict = 'downloads in parallel, BLOCKS PAINT until ready';
  else if (/<script/.test(tag) && /defer/.test(tag)) verdict = 'downloads in parallel, runs after parsing (in order)';
  else if (/<script/.test(tag) && /async/.test(tag)) verdict = 'downloads in parallel, runs as soon as ready (any order)';
  else if (/<script/.test(tag)) verdict = 'BLOCKS PARSER: HTML reading stops until it downloads and runs';
  else verdict = 'downloads in background, delays only the load event';
  console.log(tag.padEnd(42), '->', verdict);
}` }
  ],
  codeTitle: ['Well-ordered head', 'Observe load events', 'Spot blocking resources'],
  viz: [
    {
      title: 'Page-load timeline: HTML parse → CSS → JS → paint',
      input: 'plain',
      inputLabel: 'Script type: plain, defer or async',
      gen: function (input) {
        var mode = String(input).trim().toLowerCase();
        if (['plain', 'defer', 'async'].indexOf(mode) < 0) throw new Error('Type plain, defer or async');
        var ev;
        var head = [
          [0, 'Start', 'You press Enter: navigation starts. Nothing is on screen yet.'],
          [120, 'Connected', 'DNS + TCP + TLS are done. The browser can now send the request.'],
          [220, 'First byte', 'The server\'s first bytes (TTFB) arrive. The browser starts parsing HTML <i>while it is still downloading</i>.'],
          [240, 'Parse HTML', 'The parser builds the DOM from <code>&lt;head&gt;</code> downward.'],
          [245, 'CSS asked', 'It meets <code>&lt;link rel="stylesheet"&gt;</code>: download starts in parallel. CSS will <b>block painting</b> until it arrives.']
        ];
        var tail = [[610, 'load event', 'The last image finished. <code>load</code> fires: <b>everything</b> is done.']];
        if (mode === 'plain') {
          ev = head.concat([
            [260, 'Script found', 'A normal <code>&lt;script src&gt;</code>: the parser <b>STOPS</b> here. The script is downloaded before any more HTML is read.'],
            [410, 'Script loaded', 'The file arrived, but it cannot run yet: scripts wait for the CSS above (they might read styles).'],
            [420, 'CSS ready', 'CSS finished: the CSSOM is complete.'],
            [450, 'Script ran', 'The script ran. Only now does the <b>parser resume</b> reading the body.'],
            [510, 'DOMContentLoaded', 'The parser finished the document. DOM is complete. <code>DOMContentLoaded</code> fires.'],
            [540, 'First paint', 'Render tree → layout → paint. The user finally sees something. <b>(540 ms)</b>']
          ]).concat(tail);
        } else if (mode === 'defer') {
          ev = head.concat([
            [260, 'Script found', '<code>&lt;script defer&gt;</code>: download starts in parallel and the parser <b>keeps going</b>.'],
            [330, 'DOM built', 'The parser finished early: the whole DOM exists, because nothing paused it.'],
            [410, 'Script loaded', 'The deferred file arrived. It waits its turn.'],
            [420, 'CSS ready', 'CSS finished: the CSSOM is complete.'],
            [440, 'First paint', 'The page is painted as soon as the CSS is ready. <b>(440 ms, 100 ms faster)</b>'],
            [450, 'Script ran', 'Deferred scripts run now: after parsing, in document order, before <code>DOMContentLoaded</code>.'],
            [460, 'DOMContentLoaded', '<code>DOMContentLoaded</code> fires right after the deferred scripts.']
          ]).concat(tail);
        } else {
          ev = head.concat([
            [260, 'Script found', '<code>&lt;script async&gt;</code>: download starts in parallel and the parser keeps going.'],
            [330, 'DOM built', 'The parser finished: the whole DOM exists.'],
            [335, 'DOMContentLoaded', '<code>DOMContentLoaded</code> fires immediately: it does <b>not</b> wait for async scripts.'],
            [410, 'Script loaded', 'The async file arrived.'],
            [420, 'CSS ready', 'CSS finished: the CSSOM is complete.'],
            [440, 'First paint', 'First paint as soon as CSS is ready. <b>(440 ms)</b>'],
            [450, 'Script ran', 'The async script runs whenever it is ready: unordered, and it may run even before the DOM is finished.']
          ]).concat(tail);
        }
        ev.sort(function (a, b) { return a[0] - b[0]; });
        var frames = [], times = [], labels = [];
        for (var i = 0; i < ev.length; i++) {
          times.push(ev[i][0]); labels.push(ev[i][1]);
          var hl = {}, ptr = {};
          for (var j = 0; j < i; j++) hl[j] = 'done';
          var nm = ev[i][1];
          hl[i] = /paint/i.test(nm) ? 'ok' : /DOMContent|load/i.test(nm) ? 'sel' : /Script|CSS/.test(nm) ? 'cur' : 'win';
          ptr[i] = ev[i][0] + 'ms';
          var fired = labels.filter(function (l) { return /DOMContent|paint|load/i.test(l); });
          frames.push({ narr: '<b>' + ev[i][0] + ' ms — ' + ev[i][1] + '.</b> ' + ev[i][2], parts: [
            { type: 'bars', label: 'Timeline (ms from start)', values: times.slice(), texts: times.map(function (t) { return t + ''; }), idxLabels: labels.slice(), hl: hl, ptr: ptr },
            { type: 'queue', label: 'Milestones fired so far', items: fired.length ? fired : ['(none yet)'], frontLabel: 'first', backLabel: 'latest' },
            { type: 'vars', label: 'State', vals: { parser: /Script found/.test(nm) && mode === 'plain' ? 'PAUSED' : (labels.indexOf('DOM built') >= 0 || labels.indexOf('DOMContentLoaded') >= 0 ? 'finished' : 'running'), screen: labels.indexOf('First paint') >= 0 ? 'painted' : 'blank', mode: mode }, hl: { screen: labels.indexOf('First paint') >= 0 ? 'ok' : 'bad' } }
          ] });
        }
        return frames;
      }
    },
    {
      title: 'Which event fires first? (console output order)',
      gen: function () {
        var code = 'console.log("A inline script");\ndocument.addEventListener("readystatechange", () =>\n  console.log("B readyState =", document.readyState));\ndocument.addEventListener("DOMContentLoaded", () =>\n  console.log("C DOMContentLoaded"));\nwindow.addEventListener("load", () =>\n  console.log("D load"));\nPromise.resolve().then(() => console.log("E microtask"));';
        var steps = [
          { n: 'The browser parses HTML and reaches this inline script. It runs immediately because the parser is paused for it. <code>readyState</code> is "loading". Line 1 prints <b>A</b>.', hl: { 1: 'cur' }, out: ['A inline script'], tag: 'loading' },
          { n: 'The script registers three listeners (nothing prints yet) and queues a <b>microtask</b>. Microtasks run as soon as the current script ends, before the browser does anything else.', hl: { 2: 'win', 4: 'win', 6: 'win', 8: 'win' }, out: ['A inline script'], tag: 'loading' },
          { n: 'The script finished, so the microtask runs: prints <b>E</b>.', hl: { 8: 'ok' }, out: ['A inline script', 'E microtask'], tag: 'loading' },
          { n: 'The parser finishes the document. <code>readyState</code> becomes "interactive" → <code>readystatechange</code> fires: prints <b>B (interactive)</b>.', hl: { 2: 'ok' }, out: ['A inline script', 'E microtask', 'B readyState = interactive'], tag: 'interactive' },
          { n: 'Right after, <code>DOMContentLoaded</code> fires: prints <b>C</b>. The DOM is ready; images may still be downloading.', hl: { 4: 'ok' }, out: ['A inline script', 'E microtask', 'B readyState = interactive', 'C DOMContentLoaded'], tag: 'interactive' },
          { n: 'All images and sub-resources finish. <code>readyState</code> becomes "complete" (<b>B</b> prints again), and then <code>load</code> fires: <b>D</b>.', hl: { 2: 'sel', 6: 'sel' }, out: ['A inline script', 'E microtask', 'B readyState = interactive', 'C DOMContentLoaded', 'B readyState = complete', 'D load'], tag: 'complete' }
        ];
        return steps.map(function (s) {
          var qh = {}; qh[s.out.length - 1] = 'ok';
          return { narr: s.n, parts: [
            { type: 'code', label: 'Inline script in the page', lang: 'js', code: code, hl: s.hl },
            { type: 'queue', label: 'Console output (in order)', items: s.out, hl: qh, frontLabel: 'first', backLabel: 'latest' },
            { type: 'vars', vals: { 'document.readyState': s.tag } }
          ] };
        });
      }
    }
  ],
  examples: [
    { title: 'A blocking script in the head (the slow way)', html: `<p>A 300 KB analytics file in the <code>&lt;head&gt;</code> without <code>async</code>: the parser stops at that tag, waits for the download (on a 3G phone that can be 2 seconds), then continues. The user stares at a blank page. Fix: add <code>async</code> (independent script) or <code>defer</code> (needs the DOM), or move it to the end of <code>&lt;body&gt;</code>.</p>`, code: { lang: 'html', code: `<!-- BAD: blocks HTML parsing -->
<script src="https://cdn.example/analytics.js"><\/script>

<!-- GOOD: does not block -->
<script src="https://cdn.example/analytics.js" async><\/script>` } },
    { title: 'Layout shift (CLS): the page that jumps', html: `<p>You start reading, then an image loads above and everything slides down. The browser did not know the image size in advance. Add <code>width</code> and <code>height</code> (or CSS <code>aspect-ratio</code>) so space is reserved. Google measures this as <b>CLS</b> (Cumulative Layout Shift); aim for ≤ 0.1.</p>`, code: { lang: 'html', code: `<!-- Space is reserved before the image arrives: no jump -->
<img src="hero.jpg" alt="Sunset" width="800" height="450" style="max-width:100%; height:auto">` } },
    { title: 'Why your script says "element is null"', html: `<p>A script in the <code>&lt;head&gt;</code> runs before the <code>&lt;button&gt;</code> exists (the parser has not reached it). <code>document.querySelector('#buy')</code> returns <code>null</code> and <code>null.addEventListener</code> throws. Three fixes: add <code>defer</code>, move the script to the end of <code>&lt;body&gt;</code>, or wrap code in a <code>DOMContentLoaded</code> listener.</p>`, code: { lang: 'js', code: `// Works no matter where the script tag is placed
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.querySelector('#buy');   // exists now
  btn.addEventListener('click', () => console.log('bought'));
});` } },
    { title: 'Reading Core Web Vitals', html: `<p>Google's three headline numbers: <b>LCP</b> (when the biggest thing shows) good ≤ 2.5 s; <b>INP</b> (delay between a click and the next paint) good ≤ 200 ms; <b>CLS</b> (unexpected movement) good ≤ 0.1. They affect search ranking and, more importantly, whether people stay.</p>${H.table(['Metric', 'Measures', 'Good', 'Typical fix'], [['LCP', 'Loading speed', '≤ 2.5 s', 'Smaller hero image, preload, CDN'], ['INP', 'Responsiveness', '≤ 200 ms', 'Break up long JS tasks'], ['CLS', 'Visual stability', '≤ 0.1', 'Reserve space for images/ads']])}` }
  ],
  deepDive: `<p><b>🟣 Inside the pipeline.</b></p>
    <ul>
      <li><b>Preload scanner.</b> While the main parser is stuck on a blocking script, a second lightweight scanner races ahead through the raw HTML and starts downloads for images, CSS and scripts it spots. So blocking scripts hurt <i>less</i> than the naive picture suggests — but they still block DOM construction and execution order.</li>
      <li><b>Incremental rendering.</b> Browsers may paint partial pages before the HTML finishes (streaming), as long as CSS is ready. <b>Streaming SSR</b> and <code>Transfer-Encoding: chunked</code> exploit this: send the top of the page instantly and the rest as it is computed.</li>
      <li><b>Parser-blocking vs render-blocking.</b> CSS does not block <i>parsing</i> but it blocks <i>script execution</i> (scripts may query styles) and <i>painting</i>. That is why "CSS then script" order matters: a script placed after a slow stylesheet waits for it.</li>
      <li><b>ES modules.</b> <code>&lt;script type="module"&gt;</code> is deferred by default, runs in strict mode, has its own scope, supports <code>import</code>, and is executed once per URL. <code>nomodule</code> was the legacy-fallback trick.</li>
      <li><b>Reflow vs repaint vs composite.</b> Changing <code>width</code>, <code>top</code> or font size forces <b>layout</b> (expensive, can cascade). Changing <code>color</code> forces only <b>paint</b>. Changing <code>transform</code> or <code>opacity</code> can be done purely by the GPU <b>compositor</b> (cheapest) — that is why animations should use them. Reading layout values (<code>offsetHeight</code>) right after writing styles causes <b>layout thrashing</b>.</li>
      <li><b>Resource hints:</b> <code>preconnect</code> (open the connection early), <code>dns-prefetch</code> (just DNS), <code>preload</code> (fetch this critical file now: hero image, font), <code>prefetch</code> (maybe next page), <code>fetchpriority="high"</code> on the LCP image, <code>loading="lazy"</code> on below-the-fold images.</li>
      <li><b>Back/forward cache (bfcache):</b> modern browsers freeze whole pages in memory so the Back button restores instantly. <code>unload</code> handlers and open connections can disable it; use <code>pagehide</code> instead.</li>
      <li><b>Fonts:</b> text may be invisible (FOIT) or swapped (FOUT) while a web font loads. <code>font-display: swap</code> shows fallback text first; preloading the font file shortens the gap.</li>
    </ul>`,
  aiEra: `<p><b>What AI changes:</b> AI-generated sites tend to ship huge JS bundles, many third-party widgets and unoptimised images, so page-load tuning is more valuable than before. Tools like Lighthouse and Chrome's performance insights now include AI-assisted explanations of why LCP is slow, and AI crawlers want fast, server-rendered HTML they can read without running JavaScript.</p>
    <p><b>Use AI as a partner:</b> paste your <code>&lt;head&gt;</code> and a Lighthouse report and ask <code>Which tags are render-blocking and what is the smallest safe change?</code> Ask it to explain a waterfall row by row. Always re-measure after each change.</p>
    <p><b>Where AI goes wrong:</b> it recommends <code>async</code> for scripts that depend on each other (race conditions), puts <code>defer</code> on inline scripts (ignored), suggests lazy-loading the LCP image (makes it slower) or claims <code>DOMContentLoaded</code> waits for images.</p>
    <p><b>What you must still own:</b> measuring on real, slow devices and networks, knowing the event order cold (a favourite interview question) and deciding the trade-offs between a fast first paint, interactivity and developer simplicity.</p>`,
  problems: [{
    title: 'Simulate the Load Order of Scripts',
    level: 'Medium', tags: ['page load', 'defer', 'async', 'simulation'], companies: ['Google', 'Meta'],
    statement: `<p>A page contains scripts in document order. Each is <code>{ name, type, download }</code> where <code>type</code> is <code>'classic'</code>, <code>'defer'</code> or <code>'async'</code> and <code>download</code> is ms to fetch it. Assume: the parser needs 10 ms to read each script tag, starting from the moment it is free; a classic script pauses it until the script has downloaded and run (running takes 0 ms); defer and async start downloading when found; async runs when downloaded (but not while the parser waits on a classic script, ignore that interaction); parsing ends when all tags are read; deferred scripts run in document order after parsing ends (each also only after it downloaded); <code>DOMContentLoaded</code> fires right after the last deferred script. Return an array of event names in the order they happen, using <code>'run:name'</code> for scripts and <code>'DOMContentLoaded'</code>. Break ties by document order.</p>`,
    constraints: `1 ≤ number of scripts ≤ 100, 1 ≤ download ≤ 10<sup>4</sup>.`,
    example: `<p>Scripts: <code>a</code> classic 50, <code>b</code> defer 30, <code>c</code> async 5.</p><p>${H.table(['Time (ms)', 'What happens'], [['10', 'a found: parser pauses while it downloads'], ['60', 'a runs; parser resumes'], ['70', 'b found; downloads until 100; parser keeps going'], ['80', 'c found; downloads until 85; parser has now read everything'], ['85', 'c runs (async)'], ['100', 'b runs (deferred, after parsing); then DOMContentLoaded']])}</p><p>Output: ${H.c('g', '["run:a","run:c","run:b","DOMContentLoaded"]')}.</p>`,
    brute: { why: `<p>Treat all scripts as classic and run them one after another in document order. It ignores that defer and async download in parallel, so it overestimates the load time and gets the event order wrong (async scripts can run before earlier scripts).</p>`, code: `function loadOrderBrute(scripts) {
  const out = scripts.map(s => 'run:' + s.name); // wrong: ignores defer/async timing
  out.push('DOMContentLoaded');
  return out;
}` },
    mcq: { q: 'Two async scripts: <code>big.js</code> (200 ms) appears first, <code>small.js</code> (20 ms) second. Which runs first?', options: ['big.js, because it is first in the document', 'small.js, because async runs as soon as each file is ready', 'They run at the same time', 'Neither: async never runs'], answer: 1, explain: 'Async scripts run in download-completion order. Use defer if order must match the document.' },
    hints: [
      `<p>Hint 1: Walk through the scripts once in document order, keeping a "parser time" clock. Only classic scripts move the clock by their download time.</p>`,
      `<p>Hint 2: Make a list of events <code>{ t, order, name }</code>. Classic and async scripts run at their ready time. Defer scripts run after <code>parseEnd</code>, but not before they downloaded.</p>`,
      `<p>Hint 3: Recipe: clock = 0; for each script i: found = clock + 10; if classic: ready = found + download; event at ready; clock = ready; else ready = found + download; async → event at ready; defer → remember. parseEnd = clock. Then the defers run in order at max(parseEnd, ready, previous deferred time). DOMContentLoaded after the last one. Sort events by (t, order).</p>`
    ],
    solution: {
      approach: `<p>Simulate time with a single parser clock. Classic scripts advance the clock to their completion time, async scripts schedule an event at their own completion time, and deferred scripts wait for the end of parsing. Finally sort events by time, breaking ties with document order.</p>`,
      code: { lang: 'js', run: true, code: `function loadOrder(scripts) {
  let clock = 0;                // when the parser is free to read the next tag
  const events = [];            // { t, order, name }
  const deferred = [];          // defer scripts waiting for the end of parsing
  scripts.forEach((s, i) => {
    const found = clock + 10;   // parser reads one tag every 10 ms
    const ready = found + s.download;
    if (s.type === 'classic') {
      events.push({ t: ready, order: i, name: 'run:' + s.name });
      clock = ready;            // parser was paused until the script ran
    } else {
      clock = found;
      if (s.type === 'async') events.push({ t: ready, order: i, name: 'run:' + s.name });
      else deferred.push({ ready, order: i, name: s.name });
    }
  });
  const parseEnd = clock;
  let last = parseEnd;          // deferred scripts run in document order, one after another
  deferred.forEach(d => {
    last = Math.max(last, d.ready);
    events.push({ t: last, order: d.order, name: 'run:' + d.name });
  });
  events.push({ t: last, order: Infinity, name: 'DOMContentLoaded' }); // after the last deferred script
  events.sort((a, b) => a.t - b.t || a.order - b.order);
  return events.map(e => e.name);
}

console.log(loadOrder([
  { name: 'a', type: 'classic', download: 50 },
  { name: 'b', type: 'defer', download: 30 },
  { name: 'c', type: 'async', download: 5 },
]));` },
      complexity: `<p>O(n log n) for sorting n scripts; O(n) space.</p>`,
      followUps: ['Model the CSS-blocks-script rule', 'Make parse time depend on the HTML size between tags', 'Add the load event after the slowest image']
    }
  }]
});

/* ===================== TOPIC 6: DevTools ===================== */
topics.push({
  title: 'Browser DevTools Tour & Reading the Network Waterfall',
  analogy: `<p>DevTools is the <b>hood of a car</b> that you are allowed to open while the engine runs. Without it you only see the dashboard (the page). With it you can look at the engine layout (<b>Elements</b>), read the warning lights (<b>Console</b>), pause the engine mid-stroke (<b>Sources</b>), and watch every delivery truck come and go from the factory (<b>Network</b>). A mechanic who never opens the hood guesses; a good one measures.</p>`,
  explain: `<p><b>🟢 The plain idea.</b> Every modern browser ships with <b>Developer Tools</b>. Open them with <kbd>F12</kbd>, <kbd>Ctrl+Shift+I</kbd> (Windows/Linux) or <kbd>Cmd+Opt+I</kbd> (Mac), or right-click any element and choose <b>Inspect</b>. Each tab (panel) answers one kind of question:</p>
    ${H.table(['Panel', 'Question it answers', 'First thing to try'], [
      ['<b>Elements</b>', 'What does the page look like <i>right now</i>? What CSS applies?', 'Click an element, edit its text or a colour live'],
      ['<b>Console</b>', 'Did anything go wrong? Let me run JS.', 'Type <code>document.title</code>; read red errors'],
      ['<b>Sources</b>', 'Why does my code behave this way?', 'Click a line number to set a breakpoint'],
      ['<b>Network</b>', 'What was requested, how long, what came back?', 'Reload with the panel open; click a row'],
      ['<b>Performance</b>', 'Why is it janky or slow to respond?', 'Record 5 seconds of scrolling'],
      ['<b>Application</b>', 'What does the page store in my browser?', 'Look at Cookies and Local Storage'],
      ['<b>Lighthouse</b>', 'How good is this page overall?', 'Run an audit, read the top 3 issues']
    ])}
    <p><b>🔵 The Network panel is the one to master.</b> Reload the page with it open and you get one row per request. The columns:</p>
    ${H.table(['Column', 'Meaning', 'Red flag'], [
      ['Name', 'File or endpoint requested', 'A name you do not recognise (third-party script)'],
      ['Status', 'HTTP status code', '<span class="c-r">4xx / 5xx</span> or "(failed)"'],
      ['Type', 'document, script, stylesheet, fetch, png…', 'Huge "fetch" calls on page load'],
      ['Initiator', 'Who caused this request', 'Unexpected scripts firing requests'],
      ['Size', 'Bytes transferred / real size', 'Multi-MB images or JS'],
      ['Time', 'Total duration of the request', 'Anything over 1 s'],
      ['Waterfall', 'A bar showing <i>when</i> and <i>how long</i>', 'Long bars, staircases, big gaps']
    ])}
    <p><b>How to read a waterfall (the part interviewers love):</b></p>
    <ul>
      <li>The x-axis is <b>time</b>. A bar's <b>left edge = when it started</b>, its <b>length = how long it took</b>.</li>
      <li>Inside each bar, colours are phases: <i>Stalled/Queueing</i> (waiting for a free connection), <i>DNS</i>, <i>Connecting</i>, <i>SSL</i>, <i>Request sent</i>, <b>Waiting (TTFB)</b> = the server thinking (green), <b>Content download</b> = bytes arriving (blue).</li>
      <li>A <b>staircase</b> (each bar starts when the previous ends) means requests depend on each other. Parallel bars = fast. A long <b>green</b> part = slow server; a long <b>blue</b> part = big file or slow network.</li>
      <li>The two vertical lines: <span class="c-b">blue = DOMContentLoaded</span>, <span class="c-r">red = load</span>.</li>
    </ul>
    <p>Useful switches: <b>Disable cache</b> (test a first-time visit), <b>Throttling</b> (Fast 4G / Slow 4G / Offline — test a bad phone connection), <b>Preserve log</b> (keep rows across page navigations), filter buttons (Fetch/XHR, JS, CSS, Img), and right-click a row → <b>Copy → Copy as cURL / Copy as fetch</b> to replay the request.</p>`,
  clues: [
    '"The page is slow — how do you investigate?" — open Network, disable cache, throttle, read the waterfall: slow server (green), big file (blue), or chain of dependencies',
    '"API call fails only in the browser" — check Network → Headers/Response and Console for CORS or 401/403',
    '"How do you debug JavaScript?" — console.log, then breakpoints/debugger in Sources, step over / step into, watch variables',
    '"What does the Elements panel show vs View Source?" — the live DOM after JS vs the original HTML text',
    '"Where do I see cookies / localStorage?" — Application panel',
    '"How to test on mobile / slow network without a phone?" — device toolbar + network throttling'
  ],
  code: [
    { lang: 'js', run: true, title: 'Draw a waterfall in text (same idea as DevTools)', code: `// Each entry: name, start time (ms), duration (ms)
const entries = [
  { name: 'index.html', start: 0,   dur: 150 },
  { name: 'style.css',  start: 150, dur: 120 },
  { name: 'app.js',     start: 150, dur: 300 },
  { name: 'logo.png',   start: 270, dur: 200 },
  { name: 'api/products', start: 450, dur: 380 },
];

const total = Math.max(...entries.map(e => e.start + e.dur)); // finish line of the slowest chain
const width = 40;                                              // characters across the chart
const scale = width / total;

for (const e of entries) {
  const pad = Math.round(e.start * scale);               // empty space = waiting to start
  const bar = Math.max(1, Math.round(e.dur * scale));    // filled part = the request itself
  console.log(e.name.padEnd(14), '.'.repeat(pad) + '#'.repeat(bar), e.dur + ' ms');
}
console.log('Page finished at', total, 'ms');
const slowest = entries.reduce((a, b) => (b.dur > a.dur ? b : a));
console.log('Slowest single request:', slowest.name, slowest.dur + ' ms');` },
    { lang: 'js', run: true, title: 'Console tricks beyond console.log', code: `console.log('plain message');
console.warn('yellow warning');
console.error('red error');

// A table is much easier to read than a wall of objects
console.table([
  { file: 'app.js', kb: 310, ms: 420 },
  { file: 'logo.png', kb: 24, ms: 90 },
]);

// Group related lines, and time a piece of code
console.group('Checkout');
console.log('step 1: validate cart');
console.log('step 2: charge card');
console.groupEnd();

console.assert(1 + 1 === 3, 'Assertion only prints when the condition is FALSE');

const start = performance.now();
let sum = 0; for (let i = 0; i < 1e6; i++) sum += i;
console.log('loop took about', Math.round(performance.now() - start), 'ms, sum =', sum);` },
    { lang: 'js', title: 'Real timings for a real page (paste in the Console)', code: `// Every request this page made, with its phases, from the Performance API
const rows = performance.getEntriesByType('resource').map((r) => ({
  name: r.name.split('/').pop() || r.name,
  type: r.initiatorType,                       // script, css, img, fetch ...
  startMs: Math.round(r.startTime),
  totalMs: Math.round(r.duration),
  waitingMs: Math.round(r.responseStart - r.requestStart), // TTFB: server thinking
  kb: Math.round(r.transferSize / 1024),
}));
console.table(rows.sort((a, b) => b.totalMs - a.totalMs).slice(0, 10)); // 10 slowest` },
    { lang: 'bash', title: 'Replay a request from "Copy as cURL"', code: `# Right-click a row in Network > Copy > Copy as cURL, then paste in a terminal
curl 'https://shop.example.com/api/products?limit=10' \\
  -H 'accept: application/json' \\
  -H 'authorization: Bearer <token>' \\
  --compressed -i   # -i prints the response headers too` }
  ],
  codeTitle: ['Text waterfall', 'Console toolbox', 'Performance API', 'Copy as cURL'],
  viz: [
    {
      title: 'Network waterfall, row by row',
      input: 'index.html:0:150 style.css:150:120 app.js:150:300 logo.png:270:200 api/products:450:380',
      inputLabel: 'name:start:duration (ms), space separated',
      gen: function (input) {
        var toks = String(input).trim().split(/\s+/).filter(Boolean);
        if (!toks.length || toks.length > 10) throw new Error('Give 1 to 10 items like app.js:150:300');
        var items = toks.map(function (t) {
          var p = t.split(':');
          if (p.length !== 3 || isNaN(p[1]) || isNaN(p[2]) || Number(p[2]) <= 0 || Number(p[1]) < 0) throw new Error('Each item must look like name:start:duration (numbers)');
          return { name: p[0], start: Number(p[1]), dur: Number(p[2]) };
        });
        var typeOf = function (n) { return /\.html?$/.test(n) ? 'document' : /\.css$/.test(n) ? 'stylesheet' : /\.js$/.test(n) ? 'script' : /\.(png|jpe?g|svg|webp|gif)$/.test(n) ? 'image' : /api|json/.test(n) ? 'fetch' : 'other'; };
        var total = 0; items.forEach(function (it) { total = Math.max(total, it.start + it.dur); });
        var W = 30;
        function bar(it) {
          var pad = Math.round(it.start / total * W), len = Math.max(1, Math.round(it.dur / total * W));
          return '·'.repeat(pad) + '█'.repeat(len);
        }
        function row(it) { return [it.name, typeOf(it.name), /missing|404/.test(it.name) ? '404' : '200', it.dur + '', bar(it)]; }
        var cols = ['Name', 'Type', 'Status', 'Time (ms)', 'Waterfall'];
        var frames = [{ narr: 'The Network panel is open and recording, but nothing has loaded yet. Reload the page and rows will appear <b>in the order requests start</b>.', parts: [{ type: 'table', label: 'Network', columns: cols, rows: [] }] }];
        var rows = [];
        var firstEnd = items[0].start + items[0].dur;
        items.forEach(function (it, i) {
          rows.push(row(it));
          var why = i === 0 ? 'The first request is always the <b>document</b> (the HTML).' :
            it.start >= firstEnd ? 'It starts at <b>' + it.start + ' ms</b>, after the HTML finished (' + firstEnd + ' ms) — the browser only <i>discovered</i> this file while reading the HTML.' :
            'It starts at <b>' + it.start + ' ms</b>: the browser found it early and fetched it in parallel.';
          var hl = {}; hl[i] = 'cur';
          frames.push({ narr: '<b>' + it.name + '</b> (' + typeOf(it.name) + '): ' + why + ' It took <b>' + it.dur + ' ms</b>, ending at ' + (it.start + it.dur) + ' ms.', parts: [{ type: 'table', label: 'Network', columns: cols, rows: rows.slice(), hl: hl }, { type: 'vars', vals: { start: it.start + ' ms', duration: it.dur + ' ms', end: (it.start + it.dur) + ' ms' } }] });
        });
        var si = 0; items.forEach(function (it, i) { if (it.dur > items[si].dur) si = i; });
        var hs = {}; hs[si] = 'bad';
        frames.push({ narr: 'The <b>slowest single request</b> is <b>' + items[si].name + '</b> (' + items[si].dur + ' ms). A long bar means a slow server (green part) or a big download (blue part) — open its <b>Timing</b> tab to tell which.', parts: [{ type: 'table', label: 'Network', columns: cols, rows: rows, hl: hs }] });
        var ci = 0; items.forEach(function (it, i) { if (it.start + it.dur > items[ci].start + items[ci].dur) ci = i; });
        var hc = {}; hc[ci] = 'sel';
        frames.push({ narr: 'The page is done when the <b>last bar ends</b>: <b>' + total + ' ms</b>, set by <b>' + items[ci].name + '</b>. Speeding up anything else will not help; shorten this chain (or start it earlier).', parts: [{ type: 'table', label: 'Network', columns: cols, rows: rows, hl: hc }, { type: 'vars', vals: { total: total + ' ms', requests: items.length, criticalRequest: items[ci].name }, hl: { total: 'sel' } }] });
        var sorted = items.slice().sort(function (a, b) { return b.dur - a.dur; });
        frames.push({ narr: 'Click the <b>Time</b> column header to sort by duration — an easy way to find the top offenders to optimise first.', parts: [{ type: 'table', label: 'Network (sorted by Time, slowest first)', columns: cols, rows: sorted.map(row), hl: { 0: 'bad' } }] });
        return frames;
      }
    },
    {
      title: 'DevTools panel tour',
      gen: function () {
        var P = [
          ['Elements', 'See and edit the live DOM and CSS', 'Click the arrow icon (Ctrl+Shift+C), hover the page, click a button; change its colour in the Styles pane'],
          ['Console', 'Errors, logs, and a live JS prompt', 'Type $0 (the selected element) or document.querySelectorAll("a").length'],
          ['Sources', 'Read code, set breakpoints, step through', 'Click a line number, trigger the action, use Step over (F10)'],
          ['Network', 'Every request, timing and payload', 'Tick Disable cache, reload, click the slowest row, open Timing'],
          ['Performance', 'Record what the browser does each millisecond', 'Press Record, scroll, stop; look for red Long Tasks (over 50 ms)'],
          ['Application', 'Cookies, localStorage, caches, service workers', 'Delete a cookie, reload, and see what changes'],
          ['Lighthouse', 'Automated audit: speed, accessibility, SEO', 'Run it in an incognito window; fix the top opportunity']
        ];
        var rows = P.map(function (p) { return [p[0], p[1]]; });
        var frames = [{ narr: 'Open DevTools with <kbd>F12</kbd> or <kbd>Ctrl/Cmd+Shift+I</kbd>. Press <kbd>Ctrl/Cmd+Shift+P</kbd> inside it for the <b>command menu</b>, where you can type any feature name. Here are the panels you will use daily.', parts: [{ type: 'table', label: 'Panels', columns: ['Panel', 'Use it to…'], rows: rows }] }];
        P.forEach(function (p, i) {
          var hl = {}; hl[i] = 'cur';
          frames.push({ narr: '<b>' + p[0] + '</b> — ' + p[1] + '. <br>Try this: ' + p[2] + '.', parts: [{ type: 'table', label: 'Panels', columns: ['Panel', 'Use it to…'], rows: rows, hl: hl }] });
        });
        return frames;
      }
    }
  ],
  examples: [
    { title: 'Debugging "the button does nothing"', html: `<p>A friend says the Buy button is dead. Your routine: (1) open <b>Console</b> and click — a red <code>TypeError: Cannot read properties of null</code> points to <code>app.js:12</code>. (2) Click that link: the <b>Sources</b> panel opens at the line. (3) Hover the variable: it is <code>null</code>, because the script ran before the button existed. (4) Add <code>defer</code> to the script tag. Four minutes, no guessing.</p>` },
    { title: 'Reading a slow page: three different diagnoses', html: `<p>Same symptom ("slow"), different cause, readable in the waterfall:</p>${H.table(['What you see', 'Diagnosis', 'Fix'], [['Long <span class="c-g">green</span> bar on the first row', 'Slow server (TTFB 1.8 s)', 'Cache, DB index, closer region'], ['Long <span class="c-b">blue</span> bar on a script (2.4 MB)', 'Huge download', 'Compress, code-split, remove unused libraries'], ['Staircase of 6 bars, each after the last', 'Chained dependencies', 'Preload, bundle, flatten the chain'], ['Many thin bars, then a gap', 'Main thread busy (JS running)', 'Performance panel: break up long tasks']])}` },
    { title: 'A failing API call', html: `<p>Console shows <code>Failed to load resource: 401</code>. In Network, click the row → <b>Headers</b>: the request had no <code>Authorization</code> header. In <b>Response</b> you read <code>{"error":"token expired"}</code>. You never had to open server logs. For a CORS problem the row would be red with a message about <code>Access-Control-Allow-Origin</code>.</p>`, code: { lang: 'js', run: true, code: `// The same investigation as code: read the status AND the error body
async function inspect(response) {
  console.log('status :', response.status, response.ok ? '(ok)' : '(NOT ok)');
  console.log('type   :', response.headers.get('content-type'));
  console.log('body   :', await response.text());
}
inspect(new Response('{"error":"token expired"}', { status: 401, headers: { 'content-type': 'application/json' } }));` } },
    { title: 'Test like a user on a bad phone', html: `<p>Your laptop and fibre make every site feel fast. In Network choose <b>Throttling → Slow 4G</b> and tick <b>Disable cache</b>; in the device toolbar choose a mid-range phone and set CPU slowdown to 4×. Reload. Many "fine" pages now take 8+ seconds. This test, not your machine, is what most users experience.</p>` }
  ],
  deepDive: `<p><b>🟣 Power-user and production notes.</b></p>
    <ul>
      <li><b>Timing breakdown.</b> The <b>Timing</b> tab splits a request: Queueing → Stalled → DNS lookup → Initial connection → SSL → Request sent → <b>Waiting for server response (TTFB)</b> → Content download. TTFB over ~600 ms points to the backend; a long Content Download means large payload or low bandwidth. "Queueing" with 6+ parallel requests to one host is HTTP/1.1's per-host connection limit; HTTP/2 mostly removes it.</li>
      <li><b>Size column has two numbers.</b> Top is <i>transferred</i> over the wire (after gzip/Brotli), bottom is the decoded <i>resource size</i>. "(disk cache)" / "(memory cache)" means no request was made at all; a <code>304</code> row means the server confirmed the cached copy was fine.</li>
      <li><b>Debugger skills.</b> <i>Conditional breakpoints</i> (right-click a line number), <i>logpoints</i> (log without editing code), <i>XHR/fetch breakpoints</i> (pause when a URL matches), <i>DOM breakpoints</i> (pause when an element changes), the <i>Call Stack</i> and <i>Scope</i> panes, <i>Blackbox</i> third-party libraries, and <b>source maps</b> so you debug your original TypeScript/JSX instead of the minified bundle. A literal <code>debugger;</code> statement pauses whenever DevTools is open.</li>
      <li><b>Local Overrides.</b> Save changes to a response and the browser replays your edited version on reload — test a fix on production without deploying.</li>
      <li><b>Performance panel.</b> The flame chart shows the main thread. Tasks over 50 ms are "long tasks"; they hurt INP. Look at Scripting (JS), Rendering (style/layout), Painting. A purple "Layout" block repeating after style writes = layout thrashing. The newer "Insights" sidebar summarises LCP breakdown, render-blocking requests, and layout shifts.</li>
      <li><b>Memory.</b> Heap snapshots and the allocation timeline find leaks: detached DOM nodes still referenced by JS, forgotten event listeners and timers.</li>
      <li><b>HAR files.</b> Right-click Network → "Save all as HAR" exports a full recording to share with a teammate or replay in tools. <b>Remove tokens and cookies before sharing</b> — HARs contain secrets.</li>
      <li><b>DevTools is not the user.</b> Opening DevTools changes behaviour slightly (extra CPU, <code>debugger</code> statements fire, some caches disabled). For real-user data use RUM (real-user monitoring) such as the <code>web-vitals</code> library, or Chrome's CrUX report.</li>
    </ul>`,
  aiEra: `<p><b>What AI changes:</b> DevTools now has built-in AI help (for example Chrome's "Ask Gemini" / AI assistance panels that explain a console error, a style or a performance trace), and coding agents can drive a real browser through DevTools protocol servers to read the console, take screenshots and inspect network calls. The data is the same one you learned to read in this module; the AI just narrates it.</p>
    <p><b>Use AI as a partner:</b> copy a console error plus the 5 lines of code around it and ask <code>What is the most likely cause and how can I confirm it in DevTools?</code> — the "how to confirm" part trains you. Paste an exported (secrets removed) request/response pair and ask it to spot bad headers.</p>
    <p><b>Where AI goes wrong:</b> it guesses causes without seeing the actual Network data, blames the wrong layer (CSS for a 404), recommends cache fixes without considering that you ticked "Disable cache", and can leak secrets when you paste raw HAR files or cURL commands with tokens.</p>
    <p><b>What you must still own:</b> hypothesis-driven debugging. Say what you expect to see, check it in the right panel, and change one thing at a time. AI answers are hypotheses; DevTools is the evidence.</p>`,
  problems: [{
    title: 'Summarise a Network Recording',
    level: 'Easy', tags: ['network', 'arrays', 'devtools'], companies: ['Atlassian', 'Adobe'],
    statement: `<p>Each network entry is <code>{ name, start, duration, size, status }</code> (ms and bytes). Write <code>summarize(entries)</code> returning <code>{ count, finishTime, slowest, totalKB, failed }</code>: <code>count</code> number of requests, <code>finishTime</code> the largest <code>start + duration</code>, <code>slowest</code> the <i>name</i> of the entry with the longest duration (the first one if tied), <code>totalKB</code> total size in KB rounded to one decimal place, and <code>failed</code> the names of entries with status ≥ 400 in original order. For an empty list return zeros, <code>null</code> and an empty array.</p>`,
    constraints: `0 ≤ entries ≤ 10<sup>4</sup>; durations ≥ 0; 1 KB = 1024 bytes.`,
    example: `<p>Entries: html (0, 100, 5000 B, 200), app.js (100, 300, 40960 B, 200), bad.png (100, 50, 0 B, 404).</p><p>Output: ${H.c('g', '{ count: 3, finishTime: 400, slowest: "app.js", totalKB: 44.9, failed: ["bad.png"] }')} — app.js ends at 100 + 300 = 400, the latest of all.</p>`,
    brute: { why: `<p>Loop over the entries five separate times, once for each answer. It is correct, but touches the data repeatedly and needlessly sorts to find the slowest. On big recordings (thousands of rows) a single pass is simpler and faster.</p>`, code: `function summarizeBrute(entries) {
  const count = entries.length;
  const finishTime = entries.length ? Math.max(...entries.map(e => e.start + e.duration)) : 0;
  const sorted = [...entries].sort((a, b) => b.duration - a.duration); // O(n log n) just to find max
  const slowest = sorted.length ? sorted[0].name : null;
  const totalKB = Math.round(entries.reduce((s, e) => s + e.size, 0) / 1024 * 10) / 10;
  const failed = entries.filter(e => e.status >= 400).map(e => e.name);
  return { count, finishTime, slowest, totalKB, failed };
}` },
    mcq: { q: 'In a waterfall, a very long <span class="c-g">green</span> section (Waiting / TTFB) inside a bar mostly points at…', options: ['A huge file being downloaded', 'The server taking a long time to produce the response', 'A DNS problem', 'The browser cache'], answer: 1, explain: 'Waiting (TTFB) is the time between sending the request and receiving the first byte: the server (and anything behind it, like a database) is thinking. A long download is the blue part.' },
    hints: [
      `<p>Hint 1: Everything can be computed in one pass with a few running variables.</p>`,
      `<p>Hint 2: Track <code>finish = max(finish, start + duration)</code>, a <code>slowest</code> entry that is replaced only when strictly longer (keeps the first on ties), a <code>bytes</code> sum and a <code>failed</code> array.</p>`,
      `<p>Hint 3: Recipe: loop; update the four trackers; after the loop return the object with <code>totalKB = Math.round(bytes / 1024 * 10) / 10</code>. Empty list: slowest stays null, others zero.</p>`
    ],
    solution: {
      approach: `<p>A single pass keeps running values: latest end time, slowest entry (replace only when strictly greater), total bytes, and failed names. Rounding is done once at the end.</p>`,
      code: { lang: 'js', run: true, code: `function summarize(entries) {
  let finishTime = 0, bytes = 0, slowest = null;
  const failed = [];
  for (const e of entries) {
    finishTime = Math.max(finishTime, e.start + e.duration);
    bytes += e.size;
    if (slowest === null || e.duration > slowest.duration) slowest = e; // strict >: first wins ties
    if (e.status >= 400) failed.push(e.name);
  }
  return {
    count: entries.length,
    finishTime,
    slowest: slowest ? slowest.name : null,
    totalKB: Math.round((bytes / 1024) * 10) / 10,
    failed,
  };
}

console.log(summarize([
  { name: 'html', start: 0, duration: 100, size: 5000, status: 200 },
  { name: 'app.js', start: 100, duration: 300, size: 40960, status: 200 },
  { name: 'bad.png', start: 100, duration: 50, size: 0, status: 404 },
]));
console.log(summarize([]));` },
      complexity: `<p>Time O(n), extra space O(f) where f is the number of failed requests.</p>`,
      followUps: ['Also return the critical path (chain of dependent requests)', 'Group totals by type (script, image, fetch)', 'Report the 95th-percentile duration']
    }
  }]
});

/* ===================== TOPIC 7: fetch ===================== */
topics.push({
  title: 'Talking to Servers from JavaScript: fetch()',
  analogy: `<p>Using <code>fetch</code> is like <b>ordering food through an app</b>. You place the order (the request) and the app instantly hands you a <b>receipt number</b> (a Promise) — not food. You keep scrolling the menu (the page stays responsive). Later the app pings you: "your order arrived" (the Promise resolves with a <b>Response</b>). Opening the bag and reading the contents (<code>res.json()</code>) is a second step. And note: "delivery succeeded" does not mean "the order was right" — a delivery of an apology note (a 404) still counts as delivered.</p>`,
  explain: `<p><b>🟢 The plain idea.</b> Pages become powerful when JavaScript can ask servers for data <i>without reloading</i>. The modern tool is <code>fetch(url, options)</code>. It returns a <b>Promise</b> (an "I will give you the result later" object). You wait for it with <code>await</code> inside an <code>async</code> function.</p>
    <pre>async function loadProduct(id) {
  const res  = await fetch('/api/products/' + id);   // 1. send request, wait for headers
  if (!res.ok) throw new Error('HTTP ' + res.status); // 2. check status yourself!
  const data = await res.json();                      // 3. read + parse the body
  console.log(data.name);
  return data;
}</pre>
    <p><b>🔵 Two awaits, on purpose.</b> The first <code>await fetch()</code> finishes as soon as the response <b>headers</b> arrive (status is known). The body may still be streaming in, so you await again to read it: <code>res.json()</code> for JSON, <code>res.text()</code> for text/HTML, <code>res.blob()</code> for files and images.</p>
    <p><b>The most common beginner bug:</b> <code>fetch</code> only <b>rejects</b> (throws) when the network itself fails (offline, DNS failure, blocked by CORS). A <b>404 or 500 is still a successful fetch</b> — the promise resolves, with <code>res.ok === false</code>. Always check <code>res.ok</code> (true for 200–299).</p>
    ${H.table(['What happened', 'fetch promise', 'res.ok', 'Your job'], [
      ['200 with JSON', '<span class="c-g">resolves</span>', 'true', 'Call <code>res.json()</code>'],
      ['404 / 500', '<span class="c-y">resolves</span>', '<span class="c-r">false</span>', 'Check <code>res.ok</code>, throw or show an error'],
      ['Wi-Fi off / DNS fail / CORS blocked', '<span class="c-r">rejects</span> (TypeError)', '—', '<code>try/catch</code>'],
      ['200 but body is not JSON', 'resolves', 'true', '<code>res.json()</code> rejects: catch it']
    ])}
    <p><b>Sending data:</b> add options. For JSON you need the method, a <code>Content-Type</code> header and a string body:</p>
    <pre>const res = await fetch('/api/orders', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ productId: 42, qty: 2 }),
});</pre>
    <p><b>Remember the whole story:</b> <code>fetch</code> builds a request (method, URL, headers, body) → the browser does DNS, TCP, TLS → the server answers with status, headers, body → you get a <code>Response</code>. It is exactly the HTTP conversation from earlier in this module, wrapped in a friendly function.</p>`,
  clues: [
    '"fetch returns 200 but the page shows an error" / "fetch does not throw on 404" — you must check <code>res.ok</code>',
    '"Why await twice?" — headers arrive first, body is a stream you read separately',
    '"Run several requests at once" — <code>Promise.all</code> (all must succeed) or <code>Promise.allSettled</code>',
    '"Cancel a request / add a timeout" — <code>AbortController</code> (<code>AbortSignal.timeout(ms)</code>)',
    '"Send JSON to an API" — method POST, <code>Content-Type: application/json</code>, <code>JSON.stringify</code>',
    '"Cross-origin request blocked" — CORS: the server must send <code>Access-Control-Allow-Origin</code>'
  ],
  code: [
    { lang: 'js', run: true, title: 'fetch + res.ok + res.json (with a pretend server so it runs offline)', code: `// A fake server so this runs anywhere (no network). It returns real Response objects,
// the same type fetch() gives you.
async function fakeFetch(url) {
  await new Promise(r => setTimeout(r, 30)); // pretend the network takes 30 ms
  if (url.endsWith('/products/42')) {
    return new Response(JSON.stringify({ id: 42, name: 'Red shoe', price: 59 }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });
  }
  return new Response(JSON.stringify({ error: 'not found' }), { status: 404 });
}

// Real code looks the same - only 'fakeFetch' would be 'fetch'.
async function loadProduct(id, fetchFn = fakeFetch) {
  const res = await fetchFn('/api/products/' + id);   // headers arrive
  console.log('status:', res.status, 'ok:', res.ok);
  if (!res.ok) throw new Error('HTTP ' + res.status); // 404 does NOT throw by itself
  const data = await res.json();                       // body arrives
  console.log('got:', data);
  return data;
}

async function main() {
  await loadProduct(42);
  try {
    await loadProduct(7);
  } catch (err) {
    console.log('caught:', err.message);
  }
}
main();` },
    { lang: 'js', title: 'The real thing (needs a network; syntax-checked here)', code: `// GET: read a task from a public test API and log the response
async function showItem() {
  const res = await fetch('https://jsonplaceholder.typicode.com/todos/1');
  console.log('status:', res.status);                        // 200
  console.log('content-type:', res.headers.get('content-type'));
  const item = await res.json();
  console.log(item);                                         // { userId: 1, id: 1, title: "...", completed: false }
}

// POST: send JSON
async function createPost() {
  const res = await fetch('https://jsonplaceholder.typicode.com/posts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'Hello', body: 'First post', userId: 1 }),
  });
  console.log(res.status, await res.json());                // 201 { id: 101, ... }
}

showItem().then(createPost).catch(console.error);` },
    { lang: 'js', run: true, title: 'Timeout and cancel with AbortController', code: `// A slow pretend server that respects cancellation, like real fetch does.
function slowFetch(url, { signal } = {}) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => resolve(new Response('slow data')), 500);
    if (signal) signal.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(signal.reason);                  // real fetch rejects with an AbortError / TimeoutError
    });
  });
}

async function withTimeout(ms) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error('timed out after ' + ms + ' ms')), ms);
  try {
    const res = await slowFetch('/slow', { signal: controller.signal });
    return await res.text();
  } finally {
    clearTimeout(timer);                      // always clean up the timer
  }
}

withTimeout(100).catch(e => console.log('1:', e.message));        // too short -> aborted
withTimeout(2000).then(t => console.log('2:', t));                // long enough -> works` },
    { lang: 'js', run: true, title: 'Several requests at once with Promise.all', code: `const wait = (ms, value) => new Promise(r => setTimeout(() => r(value), ms));
// Pretend these are three fetch(...).then(r => r.json()) calls of different speeds
const user    = () => wait(120, { id: 1, name: 'Asha' });
const orders  = () => wait(200, [{ id: 9 }, { id: 10 }]);
const tips    = () => wait(80,  ['Free shipping over 50']);

async function main() {
  console.time('sequential');
  const a = await user(), b = await orders(), c = await tips(); // waits 120+200+80 = ~400 ms
  console.timeEnd('sequential');

  console.time('parallel');
  const [u, o, t] = await Promise.all([user(), orders(), tips()]); // ~200 ms: the slowest one
  console.timeEnd('parallel');
  console.log(u.name, o.length, t[0]);
}
main();` }
  ],
  codeTitle: ['fetch, ok-check, json', 'Real fetch GET and POST', 'Timeout with AbortController', 'Parallel requests'],
  viz: [
    {
      title: 'Stepping through a fetch call',
      input: 'ok',
      inputLabel: 'Outcome: ok, 404, offline or badjson',
      gen: function (input) {
        var mode = String(input).trim().toLowerCase();
        if (['ok', '404', 'offline', 'badjson'].indexOf(mode) < 0) throw new Error('Type ok, 404, offline or badjson');
        var code = 'async function loadProduct(id) {\n  const res = await fetch("/api/products/" + id);\n  if (!res.ok) throw new Error("HTTP " + res.status);\n  const data = await res.json();\n  console.log(data.name);\n  return data;\n}';
        var nodes = [{ id: 'P', label: 'Your page (JS)', x: 14, y: 20, shape: 'box' }, { id: 'N', label: 'Network', x: 50, y: 20, shape: 'box' }, { id: 'S', label: 'Server', x: 86, y: 20, shape: 'box' }];
        var edges = [['P', 'N', 'request'], ['N', 'S']];
        function g(hl, ehl, tags) { return { type: 'graph', directed: true, height: 36, nodes: nodes, edges: edges, hl: hl, ehl: ehl, tags: tags }; }
        var F = [];
        F.push({ n: 'You call <code>loadProduct(42)</code>. JavaScript runs line 2 and sees <code>fetch(...)</code>: it hands the request to the browser and gets back a <b>Promise</b>, not data.', parts: [g({ P: 'cur' }, { 'P-N': 'cur' }, { P: 'calling' }), { type: 'code', label: 'Code', lang: 'js', code: code, hl: { 2: 'cur' } }, { type: 'vars', vals: { 'fetch() returns': 'Promise (pending)', page: 'still responsive' }, hl: { 'fetch() returns': 'cur' } }] });
        F.push({ n: '<code>await</code> pauses <b>this function only</b> — the page keeps handling clicks and scrolls. Meanwhile the browser runs DNS/TCP/TLS and sends the request.', parts: [g({ N: 'cur', S: 'cur' }, { 'P-N': 'ok', 'N-S': 'cur' }, { N: 'sending…', S: 'working' }), { type: 'code', label: 'Code', lang: 'js', code: code, hl: { 2: 'win' } }, { type: 'vars', vals: { state: 'waiting for response headers' } }] });
        if (mode === 'offline') {
          F.push({ n: 'The network is down. The Promise <b>rejects</b> with <code>TypeError: Failed to fetch</code>. The <code>await</code> on line 2 throws, so the function exits; the caller needs <code>try/catch</code>.', parts: [g({ N: 'bad' }, { 'N-S': 'bad' }, { N: 'no connection' }), { type: 'code', label: 'Code', lang: 'js', code: code, hl: { 2: 'bad' } }, { type: 'vars', vals: { fetch: 'REJECTED (TypeError)', 'res.ok': 'never created' }, hl: { fetch: 'bad' } }] });
          F.push({ n: 'Lines 3–6 never run. Offline is one of the only cases where <code>fetch</code> itself throws. Show the user a friendly "check your connection" message.', parts: [{ type: 'code', label: 'Code', lang: 'js', code: code, hl: { 3: 'done', 4: 'done', 5: 'done', 6: 'done' } }, { type: 'vars', vals: { outcome: 'caught in catch block' }, hl: { outcome: 'bad' } }] });
          return F.map(function (f) { return { narr: f.n, parts: f.parts }; });
        }
        var status = mode === '404' ? 404 : 200;
        F.push({ n: 'The response <b>headers</b> arrive. The Promise resolves with a <code>Response</code>: <code>status = ' + status + '</code>, <code>ok = ' + (status === 200) + '</code>. The body has not been read yet.', parts: [g({ P: 'ok', N: 'ok', S: 'ok' }, { 'P-N': 'ok', 'N-S': 'ok' }, { P: status + (status === 200 ? ' OK' : ' Not Found') }), { type: 'code', label: 'Code', lang: 'js', code: code, hl: { 2: 'ok' } }, { type: 'vars', vals: { 'res.status': status, 'res.ok': status === 200, fetch: 'resolved' }, hl: { 'res.ok': status === 200 ? 'ok' : 'bad' } }] });
        if (mode === '404') {
          F.push({ n: 'Line 3: <code>!res.ok</code> is true (the status is not 2xx), so we <b>throw</b> an Error ourselves. <code>fetch</code> did not throw for the 404 — <b>we</b> had to.', parts: [{ type: 'code', label: 'Code', lang: 'js', code: code, hl: { 3: 'bad' } }, { type: 'vars', vals: { thrown: 'Error: HTTP 404' }, hl: { thrown: 'bad' } }] });
          F.push({ n: 'The async function\'s promise rejects with that error. The caller handles it with <code>catch</code>. Lines 4–6 are skipped. Without the <code>res.ok</code> check you would have tried to read an error page as product data.', parts: [{ type: 'code', label: 'Code', lang: 'js', code: code, hl: { 4: 'done', 5: 'done', 6: 'done' } }, { type: 'vars', vals: { outcome: 'caught: HTTP 404' }, hl: { outcome: 'bad' } }] });
          return F.map(function (f) { return { narr: f.n, parts: f.parts }; });
        }
        F.push({ n: 'Line 3: <code>res.ok</code> is true, so the <code>throw</code> is skipped.', parts: [{ type: 'code', label: 'Code', lang: 'js', code: code, hl: { 3: 'ok' } }, { type: 'vars', vals: { 'res.ok': true, throws: 'no' }, hl: { throws: 'ok' } }] });
        F.push({ n: 'Line 4: <code>await res.json()</code> reads the body (a stream of bytes) and parses the JSON text. The function pauses again until the body is complete.', parts: [{ type: 'code', label: 'Code', lang: 'js', code: code, hl: { 4: 'cur' } }, { type: 'vars', vals: { body: 'streaming…' } }] });
        if (mode === 'badjson') {
          F.push({ n: 'The body was not valid JSON (maybe an HTML error page). <code>res.json()</code> <b>rejects</b> with <code>SyntaxError: Unexpected token &lt;</code>. Another reason to wrap calls in <code>try/catch</code>.', parts: [{ type: 'code', label: 'Code', lang: 'js', code: code, hl: { 4: 'bad' } }, { type: 'vars', vals: { 'res.json()': 'REJECTED (SyntaxError)' }, hl: { 'res.json()': 'bad' } }] });
          F.push({ n: 'Lines 5–6 never run. Defensive tip: check <code>res.headers.get("content-type")</code> before calling <code>json()</code> if the server is not fully trusted.', parts: [{ type: 'code', label: 'Code', lang: 'js', code: code, hl: { 5: 'done', 6: 'done' } }, { type: 'vars', vals: { outcome: 'caught: SyntaxError' }, hl: { outcome: 'bad' } }] });
          return F.map(function (f) { return { narr: f.n, parts: f.parts }; });
        }
        F.push({ n: 'Parsed! <code>data</code> is now a normal JavaScript object: <code>{ id: 42, name: "Red shoe" }</code>.', parts: [{ type: 'map', label: 'data', entries: [['id', 42], ['name', 'Red shoe'], ['price', 59]], hl: { name: 'ok' } }, { type: 'code', label: 'Code', lang: 'js', code: code, hl: { 4: 'ok' } }] });
        F.push({ n: 'Line 5 logs <b>Red shoe</b>; line 6 returns the object, resolving the promise your caller is awaiting.', parts: [{ type: 'code', label: 'Code', lang: 'js', code: code, hl: { 5: 'ok', 6: 'sel' } }, { type: 'queue', label: 'Console', items: ['Red shoe'], hl: { 0: 'ok' } }] });
        return F.map(function (f) { return { narr: f.n, parts: f.parts }; });
      }
    },
    {
      title: 'Does fetch throw? A scenario table',
      gen: function () {
        var S = [
          ['Server answers 200 + JSON', 'resolves', 'true', 'res.json() works'],
          ['Server answers 404', 'resolves', 'false', 'you must check res.ok'],
          ['Server answers 500', 'resolves', 'false', 'you must check res.ok'],
          ['User is offline', 'REJECTS (TypeError)', '—', 'try/catch'],
          ['CORS blocks the response', 'REJECTS (TypeError)', '—', 'fix server headers; check Console'],
          ['You abort with AbortController', 'REJECTS (AbortError)', '—', 'ignore in UI; it was on purpose'],
          ['200 but HTML instead of JSON', 'resolves', 'true', 'res.json() REJECTS (SyntaxError)']
        ];
        var cols = ['Scenario', 'fetch() promise', 'res.ok', 'What to do'];
        var frames = [{ narr: 'Seven situations, one question: <b>does <code>await fetch(...)</code> throw?</b> The surprising answer is "only if the request could not complete".', parts: [{ type: 'table', label: 'fetch behaviour', columns: cols, rows: [] }] }];
        S.forEach(function (r, i) {
          var o = {}; o[i] = /REJECTS/.test(r[1]) ? 'bad' : (r[2] === 'false' || /REJECTS/.test(r[3]) ? 'cur' : 'ok');
          frames.push({ narr: '<b>' + r[0] + '</b> → the fetch promise <b>' + r[1] + '</b>' + (r[2] !== '—' ? ' and <code>res.ok</code> is ' + r[2] : '') + '. Next: ' + r[3] + '.', parts: [{ type: 'table', label: 'fetch behaviour', columns: cols, rows: S.slice(0, i + 1), hl: o }] });
        });
        frames.push({ narr: 'Rule to memorise: <b>"fetch rejects on network failure, not on HTTP failure."</b> Wrap in <code>try/catch</code> <i>and</i> check <code>res.ok</code>.', parts: [{ type: 'table', label: 'fetch behaviour', columns: cols, rows: S }] });
        return frames;
      }
    }
  ],
  examples: [
    { title: 'GET JSON and show it (the classic first fetch)', html: `<p>Ask the server for data, parse it, use it. In a real page you would then put the result into the DOM with <code>textContent</code>.</p>`, code: { lang: 'js', run: true, code: `// Pretend server -> real Response objects
const server = async () => new Response(JSON.stringify([{ id: 1, title: 'Learn HTTP' }, { id: 2, title: 'Learn fetch' }]), {
  headers: { 'Content-Type': 'application/json' },
});

async function main() {
  const res = await server();            // would be: await fetch('/api/todos')
  const todos = await res.json();
  for (const t of todos) console.log('#' + t.id, t.title);
}
main();` } },
    { title: 'POST JSON and read the created resource', html: `<p>Send data in the body, tell the server it is JSON via the header, and expect <b>201 Created</b> with a <code>Location</code> or the new object back. Here we only build and inspect the request (no network), which shows exactly what would go on the wire.</p>`, code: { lang: 'js', run: true, code: `const req = new Request('https://shop.test/api/orders', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ productId: 42, qty: 2 }),
});
async function main() {
  console.log(req.method, new URL(req.url).pathname);
  console.log('Content-Type:', req.headers.get('content-type'));
  console.log('body:', await req.text());
}
main();` } },
    { title: 'Query parameters: build them, do not glue them', html: `<p>Combine the <code>URL</code> class from earlier with <code>fetch</code> so special characters are encoded properly.</p>`, code: { lang: 'js', run: true, code: `function productsUrl(base, { search, page = 1, tags = [] }) {
  const url = new URL('/api/products', base);
  if (search) url.searchParams.set('q', search);
  url.searchParams.set('page', page);
  for (const t of tags) url.searchParams.append('tag', t);
  return url.toString();
}
console.log(productsUrl('https://shop.test', { search: 'red & blue shoes', page: 2, tags: ['sale', 'new'] }));` } },
    { title: 'Reading headers and handling non-JSON replies', html: `<p>Trust but verify: servers sometimes return an HTML error page with status 200, or plain text. Look at <code>Content-Type</code> before parsing.</p>`, code: { lang: 'js', run: true, code: `async function readSmart(res) {
  const type = res.headers.get('content-type') || '';
  if (type.includes('application/json')) return { kind: 'json', data: await res.json() };
  return { kind: 'text', data: (await res.text()).slice(0, 40) };
}
async function main() {
  console.log(await readSmart(new Response('{"a":1}', { headers: { 'content-type': 'application/json' } })));
  console.log(await readSmart(new Response('<html><body>Oops</body></html>', { headers: { 'content-type': 'text/html' } })));
}
main();` } }
  ],
  deepDive: `<p><b>🟣 What a production-grade fetch layer needs.</b></p>
    <ul>
      <li><b>Promises and the event loop.</b> <code>await fetch()</code> hands the work to the browser's network stack (outside JS) and queues a <i>microtask</i> continuation when the response arrives, so JS never blocks. XMLHttpRequest (old, callback style) and <code>fetch</code> (Promise style) do the same job; axios is a library that wraps either and adds JSON and error conveniences.</li>
      <li><b>Timeouts &amp; cancellation.</b> Plain <code>fetch</code> has <b>no timeout</b> — a stalled server hangs forever. Use <code>fetch(url, { signal: AbortSignal.timeout(8000) })</code>, or an <code>AbortController</code> you abort when a component unmounts or the user types a new search (prevents stale results from overwriting fresh ones: the "race condition" bug).</li>
      <li><b>Retries.</b> Retry only idempotent requests (GET/PUT/DELETE) or POSTs with an idempotency key; only for network errors, 429, 502/503/504; with <b>exponential backoff plus jitter</b> (wait 200 ms, 400 ms, 800 ms ± random) and a maximum attempt count. Respect <code>Retry-After</code>.</li>
      <li><b>Credentials &amp; CORS.</b> Same-origin fetches send cookies automatically; cross-origin ones do not unless <code>credentials: 'include'</code> and the server allows it. Browsers block reading cross-origin responses unless the server sends <code>Access-Control-Allow-Origin</code>. "Non-simple" requests (JSON POST, custom headers) trigger a <b>preflight</b> <code>OPTIONS</code> request first. CORS protects <i>users</i>, enforced by the browser — <code>curl</code> and servers ignore it.</li>
      <li><b>Streaming.</b> <code>res.body</code> is a <code>ReadableStream</code>: read chunks as they arrive (progress bars, streamed AI answers via Server-Sent Events). <code>res.clone()</code> lets two readers consume one body. <code>Content-Length</code> may be missing with chunked encoding.</li>
      <li><b>Caching &amp; priority.</b> <code>cache: 'no-store' | 'reload' | 'force-cache'</code> options map to HTTP caching rules. <code>keepalive: true</code> lets a request survive page unload (analytics beacons). <code>priority: 'high'</code> hints importance.</li>
      <li><b>Data layers.</b> Real apps do not call <code>fetch</code> in every component. They wrap it once (base URL, auth header, error normalisation, retries) and use a data library (TanStack Query, SWR) that adds caching, deduplication, background refetch and loading/error states — you will meet these in the React modules.</li>
      <li><b>Security.</b> Never put secrets in front-end <code>fetch</code> calls; validate and encode what you send; treat response data as untrusted before inserting into the DOM (<code>textContent</code> not <code>innerHTML</code>). Tokens in <code>HttpOnly</code> cookies resist XSS theft better than <code>localStorage</code>.</li>
    </ul>`,
  aiEra: `<p><b>What AI changes:</b> Calling an LLM from a web app is just <code>fetch</code> to your backend (never directly with a secret key from the browser). Streaming replies read <code>res.body</code> chunk by chunk and append text as it arrives; <code>AbortController</code> powers the "Stop generating" button. Agents and tool-calling are the same request/response loop, repeated.</p>
    <p><b>Use AI as a partner:</b> ask it to wrap a repetitive pattern into a <code>fetchJson(url, options)</code> helper, then <i>review it against the checklist above</i> (ok check, timeout, content-type, errors). Ask for the exact edge cases to test: offline, 500, slow server, invalid JSON, aborted.</p>
    <p><b>Where AI goes wrong:</b> it writes <code>fetch(...).then(r => r.json())</code> with no <code>res.ok</code> check, no <code>catch</code>, no timeout; forgets <code>JSON.stringify</code> and the <code>Content-Type</code> header on POST; puts API keys in client code; and mixes <code>await</code> with <code>.then</code> chains in confusing ways.</p>
    <p><b>What you must still own:</b> the error model (what rejects, what resolves with a bad status), cancellation and race conditions, and the security decision of what the browser is allowed to call and with which credentials.</p>`,
  problems: [{
    title: 'Safe fetchJson Helper',
    level: 'Medium', tags: ['fetch', 'async', 'error handling'], companies: ['Stripe', 'Airbnb'],
    statement: `<p>Write <code>fetchJson(url, fetchFn)</code> (an <code>async</code> function; <code>fetchFn</code> defaults to the global <code>fetch</code> and is injectable for tests). It must: call <code>fetchFn(url)</code>; if the response is not ok, throw an <code>Error</code> whose message is <code>'HTTP ' + status</code> and which has a <code>status</code> property; if the content type is not JSON, throw <code>Error('Expected JSON')</code>; otherwise return the parsed object. Network failures (rejected promises) must propagate unchanged.</p>`,
    constraints: `Do not read the body more than once. Content type may be <code>application/json; charset=utf-8</code> or missing.`,
    example: `<p>200 + JSON <code>{"a":1}</code> → ${H.c('g', '{ a: 1 }')}. 404 → throws ${H.c('r', 'Error("HTTP 404")')} with <code>status = 404</code>. 200 with <code>text/html</code> → throws ${H.c('r', 'Error("Expected JSON")')}.</p>`,
    brute: { why: `<p>The usual tutorial code: <code>fetch(url).then(r =&gt; r.json())</code>. For a 500 with an HTML error page the caller gets an unhelpful <code>SyntaxError</code>; for a 404 JSON error body the caller receives the error object as if it were valid data and keeps going. The waste is hiding the status behind a parse error.</p>`, code: `async function fetchJsonBrute(url, fetchFn = fetch) {
  const res = await fetchFn(url);
  return res.json(); // no ok check: errors look like data (or SyntaxErrors)
}` },
    mcq: { q: '<code>fetch</code> gets a <code>500</code> response from the server. What happens to the promise?', options: ['It rejects with a TypeError', 'It resolves; <code>res.ok</code> is false', 'It never settles', 'It retries automatically'], answer: 1, explain: 'fetch rejects only when it cannot complete the request (network failure, CORS, abort). Any HTTP response, even 500, resolves.' },
    hints: [
      `<p>Hint 1: The order of checks matters: network (automatic), then <code>res.ok</code>, then content type, then parse.</p>`,
      `<p>Hint 2: Read headers with <code>res.headers.get('content-type')</code> (may be <code>null</code>) and test it with <code>includes('application/json')</code>.</p>`,
      `<p>Hint 3: Recipe: <code>const res = await fetchFn(url)</code>; if <code>!res.ok</code> create an Error('HTTP ' + res.status), attach <code>err.status</code>, throw; check content type; <code>return res.json()</code>.</p>`
    ],
    solution: {
      approach: `<p>Validate the response before parsing: status first (so callers can react to 404 vs 500), then the content type (so an HTML error page produces a clear message instead of a <code>SyntaxError</code>), and only then call <code>json()</code> once.</p>`,
      code: { lang: 'js', run: true, code: `async function fetchJson(url, fetchFn = fetch) {
  const res = await fetchFn(url);            // network failures reject here and propagate
  if (!res.ok) {
    const err = new Error('HTTP ' + res.status);
    err.status = res.status;                 // lets callers branch on 404 vs 500
    throw err;
  }
  const type = res.headers.get('content-type') || '';
  if (!type.includes('application/json')) throw new Error('Expected JSON');
  return res.json();                         // body read exactly once
}

// Tests with fake responses
const json = (body, status = 200) => async () =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });

async function main() {
  console.log(await fetchJson('/a', json({ a: 1 })));
  try { await fetchJson('/b', json({ error: 'nope' }, 404)); } catch (e) { console.log(e.message, e.status); }
  try { await fetchJson('/c', async () => new Response('<h1>oops</h1>', { headers: { 'content-type': 'text/html' } })); } catch (e) { console.log(e.message); }
  try { await fetchJson('/d', async () => { throw new TypeError('Failed to fetch'); }); } catch (e) { console.log(e.name + ': ' + e.message); }
}
main();` },
      complexity: `<p>O(1) extra work beyond reading the body; the cost is the network and JSON parsing, O(size of body).</p>`,
      followUps: ['Add an AbortSignal timeout', 'Add retry with exponential backoff for 5xx', 'Include the server error message from the JSON body in the thrown error']
    }
  }]
});

/* ===================== PRACTICE ===================== */

practice.push({
  title: 'Parse a Query String into an Object', level: 'Easy', tags: ['url', 'URLSearchParams', 'objects'], companies: ['Google', 'Amazon'],
  statement: `<p>Write <code>parseQuery(qs)</code> that turns a query string (with or without the leading <code>?</code>) into an object. A key that appears once maps to a string; a key that appears several times maps to an array of strings in order. Values must be decoded (<code>%20</code> and <code>+</code> become spaces). An empty string gives <code>{}</code>.</p>`,
  constraints: `Length ≤ 10<sup>4</sup>. Keys may be any text, including names like <code>constructor</code>.`,
  example: `<p>Input <code>?q=red+shoes&amp;tag=a&amp;tag=b&amp;size=9</code></p><p>Output ${H.c('g', '{ q: "red shoes", tag: ["a","b"], size: "9" }')} — <code>tag</code> appeared twice, so it became an array; <code>+</code> became a space.</p>`,
  brute: { why: `<p>Split on <code>&amp;</code> and <code>=</code> by hand. It forgets decoding (<code>%20</code>, <code>+</code>), breaks on values that contain <code>=</code>, and silently overwrites repeated keys. The platform class already handles all of these.</p>`, code: `function parseQueryBrute(qs) {
  const out = {};
  qs.replace(/^\\?/, '').split('&').forEach(pair => {
    const [k, v] = pair.split('=');   // loses everything after a second "="
    out[k] = v;                        // overwrites repeated keys, no decoding
  });
  return out;
}` },
  mcq: { q: 'What does <code>new URLSearchParams("a=1&a=2").get("a")</code> return?', options: ['"2"', '["1","2"]', '"1"', 'undefined'], answer: 2, explain: '<code>get</code> returns the first value. Use <code>getAll("a")</code> to receive every value.' },
  hints: [`<p>Hint 1: Do not parse by hand. <code>URLSearchParams</code> accepts the string directly (it ignores one leading "?").</p>`, `<p>Hint 2: Iterate with <code>for (const [k, v] of params)</code>. Keep an object and check whether the key was already set.</p>`, `<p>Hint 3: Recipe: if key already present, turn the stored value into an array and append; otherwise store the string. Use <code>Object.prototype.hasOwnProperty.call</code> so keys like "constructor" work.</p>`],
  solution: {
    approach: `<p>Let <code>URLSearchParams</code> decode and iterate. Track repeats: the first occurrence stores a string, the second converts to an array, later ones append.</p>`,
    code: { lang: 'js', run: true, code: `function parseQuery(qs) {
  const params = new URLSearchParams(qs);   // ignores a single leading "?" and decodes values
  const out = {};
  for (const [key, value] of params) {
    if (Object.prototype.hasOwnProperty.call(out, key)) {
      out[key] = [].concat(out[key], value); // string -> [string, value], array -> longer array
    } else {
      out[key] = value;
    }
  }
  return out;
}

console.log(parseQuery('?q=red+shoes&tag=a&tag=b&size=9'));
console.log(parseQuery(''));
console.log(parseQuery('constructor=1&constructor=2'));` },
    complexity: `<p>O(L) time for a string of length L; O(L) space.</p>`, followUps: ['Convert numeric-looking values to numbers', 'Support bracket syntax like <code>a[]=1&amp;a[]=2</code>']
  }
});

practice.push({
  title: 'Name the Status Code Family', level: 'Easy', tags: ['http', 'status codes'], companies: ['Cloudflare', 'Atlassian'],
  statement: `<p>Write <code>statusFamily(code)</code> returning one of <code>'informational'</code> (1xx), <code>'success'</code> (2xx), <code>'redirect'</code> (3xx), <code>'client error'</code> (4xx), <code>'server error'</code> (5xx), or <code>'invalid'</code> for anything that is not an integer from 100 to 599.</p>`,
  constraints: `Input can be any JavaScript value (numbers, strings, null, floats).`,
  example: `<p><code>statusFamily(404)</code> → ${H.c('y', "'client error'")}; <code>statusFamily(503)</code> → ${H.c('r', "'server error'")}; <code>statusFamily('200')</code> → ${H.c('m', "'invalid'")} (a string is not an integer); <code>statusFamily(99)</code> → <code>'invalid'</code>.</p>`,
  brute: { why: `<p>A long chain of <code>if (code === 200 || code === 201 ...)</code> comparisons for every known code. It misses rare codes and grows forever. The family is determined by the hundreds digit alone.</p>`, code: `function statusFamilyBrute(code) {
  if (code === 200 || code === 201 || code === 204) return 'success';
  if (code === 301 || code === 302) return 'redirect';
  if (code === 404 || code === 403) return 'client error';
  if (code === 500) return 'server error';
  return 'invalid'; // wrong for 202, 307, 429, 502 ...
}` },
  mcq: { q: 'Which family does <code>429 Too Many Requests</code> belong to, and who should change something?', options: ['Server error; the server', 'Client error; the client must slow down', 'Redirect; the browser', 'Success; nobody'], answer: 1, explain: '4xx means the request cannot be served as sent. 429 asks the client to slow down and retry later.' },
  hints: [`<p>Hint 1: The hundreds digit is the family.</p>`, `<p>Hint 2: <code>Math.floor(code / 100)</code> gives 1–5. Use it as an index into an array of names.</p>`, `<p>Hint 3: Validate first with <code>Number.isInteger(code)</code> and the range 100–599, then index with <code>hundreds - 1</code>.</p>`],
  solution: {
    approach: `<p>Validate the input, take the hundreds digit and look it up in an array of five family names.</p>`,
    code: { lang: 'js', run: true, code: `const FAMILIES = ['informational', 'success', 'redirect', 'client error', 'server error'];

function statusFamily(code) {
  if (!Number.isInteger(code) || code < 100 || code > 599) return 'invalid';
  return FAMILIES[Math.floor(code / 100) - 1];
}

for (const c of [101, 200, 301, 404, 429, 503, 99, 600, '200', 404.5, null]) {
  console.log(String(c).padEnd(5), statusFamily(c));
}` },
    complexity: `<p>O(1) time and space.</p>`, followUps: ['Return a human sentence for the 20 most common codes', 'Mark which codes are safe to retry']
  }
});

practice.push({
  title: 'Build a Query String Safely', level: 'Easy', tags: ['url', 'encoding'], companies: ['Shopify', 'Stripe'],
  statement: `<p>Write <code>buildQuery(obj)</code> returning a query string starting with <code>?</code> (or <code>''</code> when there is nothing to send). Skip keys whose value is <code>null</code> or <code>undefined</code>. An array value produces the key repeated once per item. All keys and values must be properly encoded.</p>`,
  constraints: `Values are strings, numbers, booleans, null/undefined, or arrays of those.`,
  example: `<p>Input <code>{ q: "fish &amp; chips", tag: ["a","b"], page: 2, skip: null }</code></p><p>Output ${H.c('g', '?q=fish+%26+chips&tag=a&tag=b&page=2')} — the <code>&amp;</code> inside the value is encoded as <code>%26</code>, and <code>skip</code> disappeared.</p>`,
  brute: { why: `<p>Join <code>key + "=" + value</code> with "&amp;". A value containing <code>&amp;</code>, <code>#</code> or a space corrupts the URL; a <code>null</code> prints as the text "null"; arrays collapse to "a,b".</p>`, code: `function buildQueryBrute(obj) {
  return '?' + Object.keys(obj).map(k => k + '=' + obj[k]).join('&'); // no encoding, nulls become "null"
}` },
  mcq: { q: 'A user searches for <code>C++ &amp; Java</code>. Which is the right way to put it in a URL?', options: ['<code>"?q=" + term</code>', '<code>"?q=" + encodeURIComponent(term)</code>', '<code>"?q=" + escape(term).toLowerCase()</code>', 'No encoding is needed'], answer: 1, explain: '<code>encodeURIComponent</code> (or URLSearchParams) turns "&amp;", "+" and spaces into safe sequences so the server reads exactly what the user typed.' },
  hints: [`<p>Hint 1: Let <code>URLSearchParams</code> do the encoding.</p>`, `<p>Hint 2: Use <code>append</code> (not <code>set</code>) so repeated keys are possible.</p>`, `<p>Hint 3: Loop <code>Object.entries(obj)</code>; skip null/undefined; for arrays append each item (also skip null items); finally <code>toString()</code> and add "?" only when not empty.</p>`],
  solution: {
    approach: `<p>Use <code>URLSearchParams.append</code> for each (key, item), skipping missing values, then prefix a question mark only when the result is non-empty.</p>`,
    code: { lang: 'js', run: true, code: `function buildQuery(obj) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(obj)) {
    const items = Array.isArray(value) ? value : [value];
    for (const item of items) {
      if (item === null || item === undefined) continue; // nothing to send
      params.append(key, item);                          // append => repeated keys allowed
    }
  }
  const text = params.toString();
  return text ? '?' + text : '';
}

console.log(buildQuery({ q: 'fish & chips', tag: ['a', 'b'], page: 2, skip: null }));
console.log(JSON.stringify(buildQuery({})));` },
    complexity: `<p>O(total size of keys and values).</p>`, followUps: ['Sort keys for stable cache keys', 'Support nested objects with dot or bracket notation']
  }
});

practice.push({
  title: 'Same Origin Check', level: 'Easy', tags: ['url', 'security', 'origin'], companies: ['Google', 'Microsoft'],
  statement: `<p>Write <code>sameOrigin(a, b)</code> that returns <code>true</code> when two URL strings have the same origin (scheme, host and port, where a missing port means the default for the scheme) and <code>false</code> otherwise. If either string is not a valid absolute URL, return <code>false</code>.</p>`,
  constraints: `Strings up to 2000 characters. Hosts are case-insensitive.`,
  example: `<p><code>sameOrigin("https://a.com/x", "https://A.com:443/y?z=1")</code> → ${H.c('g', 'true')} (default port 443, host case ignored). <code>sameOrigin("https://a.com", "http://a.com")</code> → ${H.c('r', 'false')} (scheme differs).</p>`,
  brute: { why: `<p>Compare the first N characters or <code>startsWith</code>. <code>https://a.com.evil.io</code> starts with <code>https://a.com</code> yet is a completely different site — a classic security bug in redirect checks.</p>`, code: `function sameOriginBrute(a, b) {
  return b.startsWith(a.split('/').slice(0, 3).join('/')); // "https://a.com.evil.io" passes!
}` },
  mcq: { q: 'Are <code>https://shop.com</code> and <code>https://www.shop.com</code> the same origin?', options: ['Yes, www is optional', 'No, the host differs', 'Yes, same scheme and port is enough', 'Only in Chrome'], answer: 1, explain: 'The host must match exactly. "shop.com" and "www.shop.com" are different hosts, so they are different origins.' },
  hints: [`<p>Hint 1: The platform already knows how to normalise URLs.</p>`, `<p>Hint 2: <code>new URL(x).origin</code> returns scheme + host + port with defaults removed and host lower-cased.</p>`, `<p>Hint 3: Wrap both constructions in <code>try/catch</code> and compare the two origin strings with <code>===</code>.</p>`],
  solution: {
    approach: `<p>Parse both with the <code>URL</code> class, which normalises case and default ports, then compare <code>origin</code> strings. Invalid input throws, which we turn into <code>false</code>.</p>`,
    code: { lang: 'js', run: true, code: `function sameOrigin(a, b) {
  try {
    return new URL(a).origin === new URL(b).origin;
  } catch (e) {
    return false; // not an absolute, valid URL
  }
}

console.log(sameOrigin('https://a.com/x', 'https://A.com:443/y?z=1')); // true
console.log(sameOrigin('https://a.com', 'http://a.com'));              // false
console.log(sameOrigin('https://a.com', 'https://a.com.evil.io'));     // false
console.log(sameOrigin('/relative', 'https://a.com'));                 // false` },
    complexity: `<p>O(L) in the URL lengths.</p>`, followUps: ['Treat www and non-www as the same <i>site</i> (registrable domain)', 'Allow a list of trusted origins for redirects']
  }
});

practice.push({
  title: 'Parse a Raw HTTP Request', level: 'Medium', tags: ['http', 'parsing', 'strings'], companies: ['Cloudflare', 'Netflix'],
  statement: `<p>Write <code>parseRequest(text)</code> that parses a raw HTTP/1.1 request into <code>{ method, path, version, headers, body }</code>. Lines end with <code>\\r\\n</code> (but accept plain <code>\\n</code> too). The request line is <code>METHOD PATH VERSION</code>. Headers are <code>Name: value</code>; store names lowercased and trim values. A blank line ends the headers; everything after it is the body. Return <code>null</code> if the request line or a header line is malformed.</p>`,
  constraints: `Total length ≤ 10<sup>5</sup>. Values may contain colons (for example <code>Host: localhost:3000</code>).`,
  example: `<p>Input</p><pre>POST /api/orders HTTP/1.1
Host: shop.test:3000
Content-Type: application/json

{"qty":2}</pre><p>Output ${H.c('g', '{ method:"POST", path:"/api/orders", version:"HTTP/1.1", headers:{host:"shop.test:3000","content-type":"application/json"}, body:\'{"qty":2}\' }')}. The split on the <i>first</i> colon keeps the port in the host value.</p>`,
  brute: { why: `<p>Split the whole text on every <code>:</code> and every newline. A header value with a colon (<code>Host: localhost:3000</code>) is chopped into pieces, and a body that contains blank lines or colons is corrupted. The waste is not respecting the format's structure: head, blank line, body.</p>`, code: `function parseRequestBrute(text) {
  const lines = text.split('\\n');
  const headers = {};
  lines.slice(1).forEach(l => { const [k, v] = l.split(':'); headers[k] = v; }); // breaks on "localhost:3000"
  return { method: lines[0].split(' ')[0], headers };
}` },
  mcq: { q: 'Where does the HTTP request body start?', options: ['After the request line', 'After the first blank line following the headers', 'After the Content-Length header', 'At the first "{" character'], answer: 1, explain: 'The head (request line + headers) ends with an empty line. Everything after it is the body, whatever it contains.' },
  hints: [`<p>Hint 1: Find the blank line first; it separates the head from the body.</p>`, `<p>Hint 2: Split the head into lines. Line 0 is the request line (check it with a regex). Others are headers: use <code>indexOf(':')</code> for the <i>first</i> colon.</p>`, `<p>Hint 3: Recipe: locate <code>/\\r?\\n\\r?\\n/</code>; head = before it, body = after it (the match length tells you how much to skip); validate; lowercase header names; trim values.</p>`],
  solution: {
    approach: `<p>Cut the text at the first blank line, parse the request line with a strict regex, then parse each header at its first colon. Anything unexpected returns <code>null</code>.</p>`,
    code: { lang: 'js', run: true, code: `function parseRequest(text) {
  const blank = /\\r?\\n\\r?\\n/.exec(text);          // the empty line between head and body
  const head = blank ? text.slice(0, blank.index) : text;
  const body = blank ? text.slice(blank.index + blank[0].length) : '';
  const lines = head.split(/\\r?\\n/);

  const m = /^([A-Z]+) (\\S+) (HTTP\\/\\d(?:\\.\\d)?)$/.exec(lines[0]);
  if (!m) return null;                             // malformed request line

  const headers = {};
  for (const line of lines.slice(1)) {
    const i = line.indexOf(':');                   // first colon only: values may contain colons
    if (i <= 0) return null;                       // no name, or no colon at all
    headers[line.slice(0, i).trim().toLowerCase()] = line.slice(i + 1).trim();
  }
  return { method: m[1], path: m[2], version: m[3], headers, body };
}

const raw = 'POST /api/orders HTTP/1.1\\r\\nHost: shop.test:3000\\r\\nContent-Type: application/json\\r\\n\\r\\n{"qty":2}';
console.log(parseRequest(raw));
console.log(parseRequest('garbage'));` },
    complexity: `<p>O(L) time and space.</p>`, followUps: ['Merge duplicate headers into a comma-separated list', 'Respect Content-Length when the body contains CRLF CRLF', 'Parse the query string from the path']
  }
});

practice.push({
  title: 'Resolve a Relative Path (by hand)', level: 'Medium', tags: ['url', 'paths', 'stack'], companies: ['Amazon', 'Dropbox'],
  statement: `<p>Write <code>resolvePath(base, rel)</code> that mimics how a browser resolves a relative link. <code>base</code> is the path of the current page (like <code>/blog/post/index.html</code>); <code>rel</code> is the link (non-empty, no query or hash). If <code>rel</code> starts with <code>/</code> it is absolute. Otherwise start from the base's folder (everything up to its last <code>/</code>). Process <code>.</code> (stay) and <code>..</code> (go up one folder, never above the root). Keep a trailing slash if the result is a folder reached through a trailing <code>/</code>, <code>.</code> or <code>..</code>.</p>`,
  constraints: `Paths ≤ 1000 characters. Use no URL class: implement it yourself.`,
  example: `<p>base <code>/blog/post/index.html</code>: rel <code>../img/a.png</code> → ${H.c('g', '/blog/img/a.png')}; rel <code>./b.png</code> → <code>/blog/post/b.png</code>; rel <code>/c.png</code> → <code>/c.png</code>; rel <code>..</code> → <code>/blog/</code>.</p>`,
  brute: { why: `<p>Concatenate base folder + rel and leave the dots in: <code>/blog/post/../img/a.png</code>. The browser would still be asked for a path that needs normalising, and caches and servers treat it as a different URL.</p>`, code: `function resolvePathBrute(base, rel) {
  if (rel.startsWith('/')) return rel;
  return base.slice(0, base.lastIndexOf('/') + 1) + rel; // dots are never removed
}` },
  mcq: { q: 'From <code>/a/b/c.html</code>, where does <code>../../x.png</code> point?', options: ['/x.png', '/a/x.png', '/a/b/x.png', '/../x.png'], answer: 0, explain: 'The folder is /a/b/. One ".." goes to /a/, the second goes to /, then x.png: /x.png.' },
  hints: [`<p>Hint 1: Think of the folders as a stack: pushing a name enters a folder, ".." pops one.</p>`, `<p>Hint 2: Start the stack from the base's folder (or empty if rel is absolute), then walk the rel segments.</p>`, `<p>Hint 3: Recipe: split rel by "/"; skip "" and "."; on ".." pop (if possible); else push. Join with "/" and add a leading "/". Add a trailing "/" if the last segment of rel was "", "." or "..".</p>`],
  solution: {
    approach: `<p>A stack of folder names models the path. Dots are handled in one left-to-right pass; popping an empty stack does nothing, which clamps at the root exactly as browsers do.</p>`,
    code: { lang: 'js', run: true, code: `function resolvePath(base, rel) {
  let stack = [];
  if (!rel.startsWith('/')) {
    // start from the base's folder, e.g. "/blog/post/index.html" -> ["blog", "post"]
    stack = base.slice(0, base.lastIndexOf('/') + 1).split('/').filter(Boolean);
  }
  const parts = rel.split('/');
  for (const seg of parts) {
    if (seg === '' || seg === '.') continue;   // stay in the same folder
    if (seg === '..') { stack.pop(); continue; } // up one folder (pop on empty is a no-op)
    stack.push(seg);
  }
  const last = parts[parts.length - 1];
  const folder = last === '' || last === '.' || last === '..';
  return '/' + stack.join('/') + (folder && stack.length ? '/' : '');
}

const base = '/blog/post/index.html';
for (const rel of ['../img/a.png', './b.png', '/c.png', '..', '../../../x', 'sub/']) {
  // compare with the real URL class to double-check
  const real = new URL(rel, 'https://site.com' + base).pathname;
  console.log(rel.padEnd(14), resolvePath(base, rel).padEnd(18), real);
}` },
    complexity: `<p>O(L) time and O(depth) space.</p>`, followUps: ['Add support for query strings and fragments', 'Handle Windows-style backslashes safely (as a security exercise)']
  }
});

practice.push({
  title: 'Fetch with Retry and Exponential Backoff', level: 'Medium', tags: ['fetch', 'retry', 'async'], companies: ['Stripe', 'Uber'],
  statement: `<p>Write <code>fetchWithRetry(url, options)</code> where <code>options = { retries, baseDelay, fetchFn, sleep }</code>. Call <code>fetchFn(url)</code>. If it rejects (network error), or the response status is <code>429</code> or ≥ 500, wait <code>baseDelay * 2^attempt</code> ms using <code>sleep(ms)</code> and try again, up to <code>retries</code> retries. Other responses (including 4xx like 404) are returned immediately. When retries run out, return the last response, or rethrow the last error.</p>`,
  constraints: `retries ≤ 10. <code>sleep</code> and <code>fetchFn</code> are injected so the function is testable without real waiting.`,
  example: `<p>Server answers 503, 503, 200 with <code>retries = 3</code>, <code>baseDelay = 100</code>: sleeps happen for ${H.c('y', '100 ms')} then ${H.c('y', '200 ms')}; the 200 response is returned after 3 calls.</p>`,
  brute: { why: `<p>Retry forever in a tight loop with no delay. If the server is overloaded this multiplies the load (a retry storm) and makes recovery slower; retrying a 404 can never help either.</p>`, code: `async function fetchWithRetryBrute(url, fetchFn = fetch) {
  while (true) {
    try { const res = await fetchFn(url); if (res.ok) return res; } catch (e) { /* try again immediately */ }
  }
}` },
  mcq: { q: 'Why add random "jitter" to the backoff delay?', options: ['To make retries slower', 'So thousands of clients do not all retry at the same instant', 'Because browsers require it', 'To avoid CORS'], answer: 1, explain: 'Without jitter, all clients that failed together retry together and overload the server again (thundering herd).' },
  hints: [`<p>Hint 1: Loop over attempts 0..retries. The decision after each try is: return, or wait and continue.</p>`, `<p>Hint 2: A thrown error and a retryable status are two different "failure" paths; only the first carries an exception to rethrow.</p>`, `<p>Hint 3: Recipe: for attempt: try fetch; on throw: if no retries left rethrow else sleep(base * 2**attempt); on response: if not retryable or no retries left return it else sleep and loop.</p>`],
  solution: {
    approach: `<p>One loop handles both failure types. The delay doubles each attempt. Injecting <code>sleep</code> lets tests assert the exact waits without real time passing.</p>`,
    code: { lang: 'js', run: true, code: `async function fetchWithRetry(url, { retries = 3, baseDelay = 100, fetchFn = fetch,
  sleep = (ms) => new Promise((r) => setTimeout(r, ms)) } = {}) {
  for (let attempt = 0; ; attempt++) {
    let res;
    try {
      res = await fetchFn(url);
    } catch (err) {                                  // network failure
      if (attempt >= retries) throw err;
      await sleep(baseDelay * 2 ** attempt);
      continue;
    }
    const retryable = res.status === 429 || res.status >= 500;
    if (!retryable || attempt >= retries) return res; // success, 4xx, or out of attempts
    await sleep(baseDelay * 2 ** attempt);
  }
}

// Test: 503, 503, then 200
const answers = [503, 503, 200];
const waits = [];
const fakeFetch = async () => new Response('x', { status: answers.shift() });
fetchWithRetry('/x', { fetchFn: fakeFetch, sleep: async (ms) => waits.push(ms) })
  .then((res) => console.log('final status', res.status, 'waits', waits));` },
    complexity: `<p>At most retries + 1 calls; total waiting is baseDelay × (2<sup>retries</sup> − 1).</p>`, followUps: ['Honour the Retry-After header', 'Add full jitter: random between 0 and the delay', 'Only retry idempotent methods']
  }
});

practice.push({
  title: 'Parse the Cookie Header', level: 'Medium', tags: ['http', 'cookies', 'parsing'], companies: ['Okta', 'Cloudflare'],
  statement: `<p>Write <code>parseCookies(header)</code> for the value of a request <code>Cookie</code> header such as <code>session=abc123; theme=dark; note=hello%20world; empty=</code>. Return an object mapping names to <b>decoded</b> values. Pairs are separated by <code>;</code>; split each at its <i>first</i> <code>=</code>; trim spaces; ignore empty pieces; if decoding fails keep the raw value. If a name repeats, the first one wins.</p>`,
  constraints: `Header length ≤ 8000. Values may contain <code>=</code> (for example base64 padding).`,
  example: `<p>Input <code>a=1; token=ab==; note=hello%20world; ;bad=%E0%A4%A</code></p><p>Output ${H.c('g', '{ a:"1", token:"ab==", note:"hello world", bad:"%E0%A4%A" }')} — the value of <code>token</code> keeps its <code>==</code>, the empty piece is ignored, and the broken percent sequence is kept as is.</p>`,
  brute: { why: `<p>Split on <code>;</code> then on <code>=</code> and take positions 0 and 1. Base64 tokens end with <code>=</code>, so everything after the second equals sign is lost, and a malformed <code>%</code> sequence makes <code>decodeURIComponent</code> throw and crash the whole request.</p>`, code: `function parseCookiesBrute(header) {
  const out = {};
  header.split(';').forEach(p => { const [k, v] = p.split('='); out[k.trim()] = decodeURIComponent(v); }); // loses "==" and may throw
  return out;
}` },
  mcq: { q: 'Which cookie flag stops JavaScript from reading a cookie via <code>document.cookie</code>?', options: ['Secure', 'HttpOnly', 'SameSite', 'Path'], answer: 1, explain: 'HttpOnly hides the cookie from JavaScript, which limits what a cross-site scripting (XSS) attack can steal.' },
  hints: [`<p>Hint 1: Split the header on ";" first, and ignore pieces that are empty after trimming.</p>`, `<p>Hint 2: For each piece use <code>indexOf("=")</code> to split at the first equals sign only.</p>`, `<p>Hint 3: Wrap <code>decodeURIComponent</code> in try/catch and fall back to the raw text. Only set a name if it was not seen before.</p>`],
  solution: {
    approach: `<p>Split into pairs, then at the first <code>=</code>. Decode defensively. Use a "first wins" rule because browsers send the more specific cookie first.</p>`,
    code: { lang: 'js', run: true, code: `function parseCookies(header) {
  const out = {};
  for (const piece of String(header).split(';')) {
    const part = piece.trim();
    if (!part) continue;                         // ignore empty pieces
    const eq = part.indexOf('=');
    if (eq <= 0) continue;                       // no name, or no "="
    const name = part.slice(0, eq).trim();
    const raw = part.slice(eq + 1).trim();       // may itself contain "=" (base64 padding)
    if (Object.prototype.hasOwnProperty.call(out, name)) continue; // first wins
    let value;
    try { value = decodeURIComponent(raw); } catch (e) { value = raw; } // never crash on bad input
    out[name] = value;
  }
  return out;
}

console.log(parseCookies('a=1; token=ab==; note=hello%20world; ;bad=%E0%A4%A; a=2'));` },
    complexity: `<p>O(L) time and space.</p>`, followUps: ['Parse a Set-Cookie header with attributes (Max-Age, Path, HttpOnly)', 'Serialize an object back into a Cookie header']
  }
});

practice.push({
  title: 'Critical Path of a Page Load', level: 'Medium', tags: ['waterfall', 'dp', 'dependencies'], companies: ['Google', 'Shopify'],
  statement: `<p>A page's resources form a dependency graph: each is <code>{ id, duration, deps }</code> where <code>deps</code> lists ids that must finish before this one can start (for example the HTML first, then a script it references, then an API call the script makes). Everything else runs in parallel with unlimited connections. Write <code>criticalPath(resources)</code> returning <code>{ total, path }</code>: the time when the last resource finishes, and the chain of ids (first to last) responsible. Break ties by the earliest item in the input. The graph has no cycles.</p>`,
  constraints: `1 ≤ n ≤ 10<sup>3</sup>, durations are positive integers, ids are unique strings. Empty input gives <code>{ total: 0, path: [] }</code>.`,
  example: `<p>html 150 (no deps); css 120 (deps html); js 300 (deps html); api 380 (deps js).</p>${H.table(['id', 'finishes at'], [['html', '150'], ['css', '270'], ['js', '450'], ['api', '830']])}<p>Output ${H.c('g', '{ total: 830, path: ["html","js","api"] }')}. Optimising CSS would not help at all: only the chain html → js → api matters.</p>`,
  brute: { why: `<p>Enumerate every path from every start node and sum durations. On a graph with shared dependencies the number of paths can explode exponentially, and the same sub-chain is recomputed over and over.</p>`, code: `function criticalPathBrute(resources) {
  const byId = new Map(resources.map(r => [r.id, r]));
  function longest(id) { // recomputes shared dependencies every time
    const r = byId.get(id);
    return r.duration + Math.max(0, ...r.deps.map(longest));
  }
  return { total: Math.max(0, ...resources.map(r => longest(r.id))) };
}` },
  mcq: { q: 'In a waterfall, why does shortening a request that is <i>not</i> on the critical path not speed up the page?', options: ['It always runs last', 'The page waits for the longest dependency chain, which it is not part of', 'Browsers ignore short requests', 'It is cached'], answer: 1, explain: 'Total time is set by the longest chain of dependent steps. Parallel work off that chain finishes earlier anyway.' },
  hints: [`<p>Hint 1: A resource finishes at (latest finish of its dependencies) + its own duration.</p>`, `<p>Hint 2: That is a recursive definition: use memoization so every resource is computed once.</p>`, `<p>Hint 3: Store for each id the finish time and the dependency that produced it ("prev"). The answer is the id with the largest finish; follow prev links backwards and reverse.</p>`],
  solution: {
    approach: `<p>Dynamic programming on a DAG: <code>finish(id) = duration + max(finish(dep))</code>. Remember which dependency gave the maximum so the critical chain can be rebuilt by walking backwards from the slowest finisher.</p>`,
    code: { lang: 'js', run: true, code: `function criticalPath(resources) {
  const byId = new Map(resources.map((r) => [r.id, r]));
  const memo = new Map(); // id -> { finish, prev }

  function solve(id) {
    if (memo.has(id)) return memo.get(id);
    const r = byId.get(id);
    let best = { finish: 0, prev: null };
    for (const dep of r.deps) {
      const f = solve(dep).finish;
      if (f > best.finish) best = { finish: f, prev: dep }; // strict > keeps the earliest on ties
    }
    const result = { finish: best.finish + r.duration, prev: best.prev };
    memo.set(id, result);
    return result;
  }

  let endId = null, total = 0;
  for (const r of resources) {
    const f = solve(r.id).finish;
    if (f > total) { total = f; endId = r.id; }
  }
  const path = [];
  for (let id = endId; id !== null; id = memo.get(id).prev) path.push(id);
  return { total, path: path.reverse() };
}

console.log(criticalPath([
  { id: 'html', duration: 150, deps: [] },
  { id: 'css', duration: 120, deps: ['html'] },
  { id: 'js', duration: 300, deps: ['html'] },
  { id: 'api', duration: 380, deps: ['js'] },
]));
console.log(criticalPath([]));` },
    complexity: `<p>Time O(n + e) for n resources and e dependency edges; space O(n).</p>`, followUps: ['Limit parallelism to 6 connections', 'Return slack (how much each resource could slip without delaying the page)']
  }
});

practice.push({
  title: 'HTTP Cache Decision', level: 'Medium', tags: ['http', 'caching', 'headers'], companies: ['Fastly', 'Cloudflare'],
  statement: `<p>Write <code>cacheDecision(headers, ageSeconds)</code> for a cached response whose header names are lowercase. It returns <code>'use-cache'</code>, <code>'revalidate'</code> (send a conditional request with the ETag / Last-Modified) or <code>'fetch'</code> (download again). Rules: <code>no-store</code> → fetch. If <code>no-cache</code> is absent and <code>max-age=N</code> is present and <code>ageSeconds &lt; N</code> → use-cache. Otherwise (stale, <code>no-cache</code>, or no max-age) → revalidate if the response has an <code>etag</code> or <code>last-modified</code>, else fetch.</p>`,
  constraints: `<code>cache-control</code> is a comma-separated list, directives may have spaces and mixed case.`,
  example: `<p><code>{ 'cache-control': 'max-age=60', etag: '"v1"' }</code> at age 30 → ${H.c('g', 'use-cache')}; at age 90 → ${H.c('y', 'revalidate')}; with <code>no-store</code> → ${H.c('r', 'fetch')}.</p>`,
  brute: { why: `<p>Always re-download. It is correct but wastes bandwidth and time: a 2 MB image that never changes would be fetched on every visit, and the server never gets a chance to answer with a tiny <code>304 Not Modified</code>.</p>`, code: `function cacheDecisionBrute() { return 'fetch'; }` },
  mcq: { q: 'What is the difference between <code>no-cache</code> and <code>no-store</code>?', options: ['They are identical', 'no-cache stores but must revalidate before reuse; no-store forbids storing', 'no-store only affects images', 'no-cache disables HTTPS'], answer: 1, explain: 'no-cache lets the browser keep a copy but requires checking with the server first (often a cheap 304). no-store says never keep it.' },
  hints: [`<p>Hint 1: Parse <code>cache-control</code> into a list of lower-case directives.</p>`, `<p>Hint 2: Handle <code>no-store</code> first because it overrides everything.</p>`, `<p>Hint 3: Extract the number from <code>max-age=N</code>; fresh means no <code>no-cache</code> and age &lt; N. If not fresh, the presence of a validator (etag/last-modified) decides between revalidate and fetch.</p>`],
  solution: {
    approach: `<p>Normalize the directives, check hard stops (no-store), then freshness, then whether a validator exists for a cheap conditional request.</p>`,
    code: { lang: 'js', run: true, code: `function cacheDecision(headers, ageSeconds) {
  const cc = (headers['cache-control'] || '').toLowerCase().split(',').map((s) => s.trim()).filter(Boolean);
  const hasValidator = Boolean(headers['etag'] || headers['last-modified']);
  if (cc.includes('no-store')) return 'fetch';            // never reuse
  const dir = cc.find((d) => d.startsWith('max-age='));
  const maxAge = dir ? Number(dir.slice('max-age='.length)) : 0;
  const fresh = !cc.includes('no-cache') && Number.isFinite(maxAge) && ageSeconds < maxAge;
  if (fresh) return 'use-cache';
  return hasValidator ? 'revalidate' : 'fetch';           // stale: ask "has it changed?" if we can
}

const h = { 'cache-control': 'max-age=60', etag: '"v1"' };
console.log(cacheDecision(h, 30), cacheDecision(h, 90));
console.log(cacheDecision({ 'cache-control': 'No-Store' }, 0));
console.log(cacheDecision({ 'cache-control': 'no-cache', etag: '"v1"' }, 5));
console.log(cacheDecision({}, 5));` },
    complexity: `<p>O(d) for d directives.</p>`, followUps: ['Support s-maxage and stale-while-revalidate', 'Compute age from the Date header']
  }
});

practice.push({
  title: 'Schedule Requests on Limited Connections', level: 'Hard', tags: ['http/1.1', 'scheduling', 'simulation', 'waterfall'], companies: ['Google', 'Meta'],
  statement: `<p>HTTP/1.1 browsers open at most <code>k</code> parallel connections per host (usually 6). You get requests in the order the page issues them as <code>{ duration, after }</code>: <code>duration</code> is how long the request occupies a connection, and <code>after</code> is the <i>index of an earlier request</i> that must finish before this one may start (or <code>-1</code> for none). Each request, in input order, takes the connection that becomes free earliest, and starts at the later of that moment and the finish time of its <code>after</code> request. Write <code>schedule(requests, k)</code> returning <code>{ starts, finishes, total }</code> (arrays in input order, and the finish time of the last request to end).</p>`,
  constraints: `1 ≤ n ≤ 10<sup>4</sup>, 1 ≤ k ≤ 100, durations are positive integers, <code>after &lt; index</code>.`,
  example: `<p>k = 2. Requests: A (100, -1), B (200, -1), C (50, 0) i.e. after A, D (50, -1).</p>${H.table(['Request', 'Connection used', 'Start', 'Finish'], [['A', '#1', '0', '100'], ['B', '#2', '0', '200'], ['C', '#1 (free at 100)', '100 (A done)', '150'], ['D', '#1 (free at 150)', '150', '200']])}<p>Output total = ${H.c('g', '200')}. D had to queue behind C because only 2 connections exist.</p>`,
  brute: { why: `<p>Simulate every millisecond with a clock loop. With durations up to 10<sup>9</sup> this takes forever; the state only changes at request start and finish times, so ticking each millisecond wastes almost all of its steps.</p>`, code: `function scheduleBrute(requests, k) {
  const finishes = new Array(requests.length).fill(-1), starts = new Array(requests.length).fill(-1);
  const busyUntil = new Array(k).fill(0);
  let t = 0, done = 0, i = 0;
  while (done < requests.length) {                 // O(total time) iterations
    const r = requests[i];
    const dep = r && r.after >= 0 ? finishes[r.after] : 0;
    const slot = busyUntil.findIndex(b => b <= t);
    if (r && slot >= 0 && dep >= 0 && dep <= t) {
      starts[i] = t; finishes[i] = t + r.duration; busyUntil[slot] = finishes[i]; i++; done++;
    } else t++;
  }
  return { starts, finishes, total: Math.max(...finishes) };
}` },
  mcq: { q: 'Why did HTTP/2 mostly remove the "6 connections per host" bottleneck?', options: ['It uses faster computers', 'It multiplexes many requests over a single connection', 'It removes headers', 'It forbids images'], answer: 1, explain: 'HTTP/2 interleaves many streams on one connection, so requests no longer queue for one of six connection slots.' },
  hints: [`<p>Hint 1: You do not need a clock. For each request only two numbers matter: when a connection is free and when its dependency finished.</p>`, `<p>Hint 2: Keep an array <code>free[0..k-1]</code> with the time each connection becomes free. Pick the smallest.</p>`, `<p>Hint 3: Recipe: for each request i: slot = index of min(free); start = max(free[slot], after &gt;= 0 ? finishes[after] : 0); finishes[i] = start + duration; free[slot] = finishes[i]. Total is the maximum finish.</p>`],
  solution: {
    approach: `<p>Event-driven thinking: only start and finish instants matter. Keep each connection's "free at" time, assign every request to the earliest-free connection, and delay its start until its dependency is done. For small k a linear scan beats a heap.</p>`,
    code: { lang: 'js', run: true, code: `function schedule(requests, k) {
  const free = new Array(k).fill(0);   // when each connection becomes free
  const starts = [], finishes = [];
  requests.forEach((r, i) => {
    let slot = 0;
    for (let c = 1; c < k; c++) if (free[c] < free[slot]) slot = c; // earliest-free connection
    const ready = r.after >= 0 ? finishes[r.after] : 0;              // dependency must be complete
    const start = Math.max(free[slot], ready);
    starts[i] = start;
    finishes[i] = start + r.duration;
    free[slot] = finishes[i];
  });
  let total = 0;
  for (const f of finishes) total = Math.max(total, f);
  return { starts, finishes, total };
}

console.log(schedule([
  { duration: 100, after: -1 }, { duration: 200, after: -1 },
  { duration: 50, after: 0 }, { duration: 50, after: -1 },
], 2));` },
    complexity: `<p>O(n · k) time (O(n log k) with a heap) and O(n + k) space.</p>`, followUps: ['Model HTTP/2: one connection, unlimited streams, shared bandwidth', 'Pick the next ready request by earliest ready time instead of input order']
  }
});

practice.push({
  title: 'Decode a Chunked HTTP Body', level: 'Hard', tags: ['http', 'parsing', 'streaming'], companies: ['Cloudflare', 'Netflix'],
  statement: `<p>With <code>Transfer-Encoding: chunked</code> the server sends a body as pieces: each chunk is a size in <b>hex</b>, optional <code>;extension</code>, <code>\\r\\n</code>, that many characters of data, then <code>\\r\\n</code>. A chunk of size <code>0</code> ends the body (optional trailer headers may follow and must be ignored). Write <code>decodeChunked(raw)</code> returning the joined body string, or <code>null</code> if the data is malformed or incomplete (bad hex size, missing CRLF, data shorter than announced, no final chunk).</p>`,
  constraints: `Total length ≤ 10<sup>6</sup>. Treat the string as ASCII (one character = one byte).`,
  example: `<p>Input <code>"4\\r\\nWiki\\r\\n5\\r\\npedia\\r\\n0\\r\\n\\r\\n"</code></p><p>Output ${H.c('g', '"Wikipedia"')}: chunk sizes 4 and 5, then the terminating 0. The size is hex, so <code>1a</code> means 26 characters.</p>`,
  brute: { why: `<p>Split the whole text on CRLF and take every second line as data. If a chunk's data itself contains a CRLF (or looks like a size), the lines are misread. The size field exists exactly so the reader never has to guess where the data ends.</p>`, code: `function decodeChunkedBrute(raw) {
  const lines = raw.split('\\r\\n');
  let out = '';
  for (let i = 1; i < lines.length; i += 2) out += lines[i]; // breaks when data contains "\\r\\n" or sizes are not on odd lines
  return out;
}` },
  mcq: { q: 'Why would a server use chunked transfer encoding?', options: ['To compress the body', 'To start sending a response before it knows the total length', 'To encrypt the body', 'To make the body cacheable'], answer: 1, explain: 'Without Content-Length the server can stream pieces as it produces them (HTML streaming, server-sent events) and mark the end with a zero-size chunk.' },
  hints: [`<p>Hint 1: Walk through the string with a position pointer instead of splitting it.</p>`, `<p>Hint 2: Each loop: read up to the next CRLF to get the size line, parse the hex (ignore anything after ";"), then take exactly that many characters.</p>`, `<p>Hint 3: Validate at each step (hex regex, enough characters left, CRLF after data). Size 0 means stop and return what you collected. Reaching the end of input without a 0 chunk means incomplete → null.</p>`],
  solution: {
    approach: `<p>A single forward pass with an index. The size line tells exactly how many characters to consume, so data containing newlines is safe. Every structural expectation is checked so truncated or corrupted input produces <code>null</code>.</p>`,
    code: { lang: 'js', run: true, code: `function decodeChunked(raw) {
  let pos = 0;
  let out = '';
  for (;;) {
    const eol = raw.indexOf('\\r\\n', pos);
    if (eol === -1) return null;                              // no size line: incomplete
    const sizeText = raw.slice(pos, eol).split(';')[0].trim(); // drop chunk extensions
    if (!/^[0-9a-fA-F]+$/.test(sizeText)) return null;         // not hex
    const size = parseInt(sizeText, 16);
    pos = eol + 2;
    if (size === 0) return out;                                // last chunk (trailers ignored)
    if (raw.length < pos + size + 2) return null;              // data shorter than announced
    out += raw.slice(pos, pos + size);
    if (raw.slice(pos + size, pos + size + 2) !== '\\r\\n') return null; // data must end with CRLF
    pos += size + 2;
  }
}

console.log(decodeChunked('4\\r\\nWiki\\r\\n5\\r\\npedia\\r\\n0\\r\\n\\r\\n'));
console.log(decodeChunked('a;note=1\\r\\nline1\\r\\nxyz\\r\\n0\\r\\n\\r\\n')); // data contains CRLF
console.log(decodeChunked('4\\r\\nWi\\r\\n'));                           // truncated
console.log(decodeChunked('zz\\r\\nhello\\r\\n0\\r\\n\\r\\n'));              // bad hex` },
    complexity: `<p>O(L) time; O(L) space for the output.</p>`, followUps: ['Handle UTF-8 by counting bytes instead of characters', 'Make it incremental: accept data arriving in arbitrary pieces', 'Parse trailer headers after the zero chunk']
  }
});

practice.push({
  title: 'Build a Mini HTTP Cache with ETag Revalidation', level: 'Hard', tags: ['caching', 'etag', 'async', 'design'], companies: ['Google', 'Netflix'],
  statement: `<p>Implement <code>class HttpCache</code> with <code>constructor(server, now)</code> and <code>async get(url)</code>. <code>server(url, ifNoneMatch)</code> returns a promise of <code>{ status, body, etag, maxAge, noStore }</code>. <code>now()</code> returns ms. Behaviour: a stored entry that is still fresh (<code>now &lt; storedAt + maxAge*1000</code>) is returned without calling the server (<code>source: 'cache'</code>). A stale entry triggers a request with its etag; if the server answers <code>304</code>, keep the stored body, refresh its freshness window (using the new <code>maxAge</code> if provided) and return <code>source: 'revalidated'</code>. A <code>200</code> replaces the entry (<code>source: 'network'</code>); if <code>noStore</code> is true it must not be stored (and any old entry is removed). Return <code>{ body, source }</code>.</p>`,
  constraints: `Up to 10<sup>5</sup> distinct URLs. Time never goes backwards. Do not worry about concurrent calls for the same URL.`,
  example: `<p>maxAge 10 s, etag "v1". t=0 get → ${H.c('r', 'network')}. t=5 s → ${H.c('g', 'cache')}. t=12 s → server sees <code>If-None-Match: "v1"</code>, replies 304 → ${H.c('y', 'revalidated')} (no body downloaded). t=15 s → ${H.c('g', 'cache')} again, because the window was refreshed at 12 s.</p>`,
  brute: { why: `<p>Call the server on every <code>get</code>. Correct but wasteful: each call downloads the full body even when nothing changed, and the server load grows linearly with page views. Without freshness and ETags the cache does no work at all.</p>`, code: `class HttpCacheBrute {
  constructor(server) { this.server = server; }
  async get(url) {
    const res = await this.server(url);          // always the network, always the full body
    return { body: res.body, source: 'network' };
  }
}` },
  mcq: { q: 'What does a <code>304 Not Modified</code> response contain, and why is it good?', options: ['The full body again', 'No body: just headers, saving bandwidth', 'An error message', 'A redirect URL'], answer: 1, explain: 'The server confirms the client\'s copy is still valid by ETag, sending only headers. The browser reuses its stored body.' },
  hints: [`<p>Hint 1: The cache entry needs: body, etag, maxAge and the time until which it is fresh.</p>`, `<p>Hint 2: Three outcomes after consulting the entry: fresh → return; stale + 304 → refresh the window; anything else → store the new response (unless noStore).</p>`, `<p>Hint 3: Use <code>t = now()</code> once per call so all decisions use the same instant. Pass <code>entry ? entry.etag : undefined</code> to the server. On 304 update only freshness, never the body.</p>`],
  solution: {
    approach: `<p>A Map keyed by URL. Check freshness before any network call; otherwise send a conditional request. Splitting the three outcomes (hit, 304, 200) keeps the logic obvious and mirrors how real browser caches work.</p>`,
    code: { lang: 'js', run: true, code: `class HttpCache {
  constructor(server, now) {
    this.server = server;
    this.now = now;
    this.store = new Map(); // url -> { body, etag, maxAge, freshUntil }
  }

  async get(url) {
    const t = this.now();
    const entry = this.store.get(url);
    if (entry && t < entry.freshUntil) {
      return { body: entry.body, source: 'cache' };       // fresh: zero network
    }
    const res = await this.server(url, entry ? entry.etag : undefined); // conditional request
    if (res.status === 304 && entry) {
      entry.maxAge = res.maxAge ?? entry.maxAge;
      entry.freshUntil = t + entry.maxAge * 1000;          // new freshness window, same body
      return { body: entry.body, source: 'revalidated' };
    }
    if (res.noStore) {
      this.store.delete(url);                              // must not keep it
    } else {
      const maxAge = res.maxAge || 0;
      this.store.set(url, { body: res.body, etag: res.etag, maxAge, freshUntil: t + maxAge * 1000 });
    }
    return { body: res.body, source: 'network' };
  }
}

// Fake server: content version "v1", answers 304 when the etag matches
let calls = 0;
const server = async (url, inm) => {
  calls++;
  if (inm === '"v1"') return { status: 304 };
  return { status: 200, body: 'hello', etag: '"v1"', maxAge: 10 };
};
let clock = 0;
const cache = new HttpCache(server, () => clock);

async function main() {
  for (const t of [0, 5000, 12000, 15000]) {
    clock = t;
    const r = await cache.get('/a');
    console.log('t=' + t / 1000 + 's', r.source, '| server calls so far:', calls);
  }
}
main();` },
    complexity: `<p>Each get is O(1) average plus the server round trip; memory O(number of cached URLs).</p>`, followUps: ['Add LRU eviction with a size limit', 'Deduplicate concurrent requests for the same URL (share one promise)', 'Add stale-while-revalidate']
  }
});

practice.push({
  title: 'Fetch Many URLs with a Concurrency Limit', level: 'Hard', tags: ['fetch', 'async', 'promise pool', 'concurrency'], companies: ['Airbnb', 'Uber'],
  statement: `<p>Write <code>fetchAll(urls, limit, fetchFn)</code>. It must call <code>fetchFn(url)</code> for each URL but never have more than <code>limit</code> calls in flight at once. It returns a promise of an array, in the same order as <code>urls</code>, with <code>{ ok: true, value }</code> for each success and <code>{ ok: false, error: message }</code> for each failure. One failure must not stop the others.</p>`,
  constraints: `0 ≤ urls ≤ 10<sup>4</sup>, 1 ≤ limit ≤ 100. Results must keep input order even when later requests finish first.`,
  example: `<p>urls = [a, b, c, d], limit = 2, where a takes 300 ms, b 100 ms, c 100 ms, d 100 ms.</p><p>Start a and b. At 100 ms b finishes, so c starts; at 200 ms c finishes, so d starts; a finishes at 300 ms. Output order is still ${H.c('g', '[a, b, c, d]')}, and the highest number of requests in flight was ${H.c('y', '2')}.</p>`,
  brute: { why: `<p>Two bad options: <code>Promise.all(urls.map(fetch))</code> launches thousands of requests at once (browsers queue them, servers rate-limit you with 429, memory spikes), and a sequential <code>for</code> loop with <code>await</code> uses one connection and takes the sum of all latencies. Also <code>Promise.all</code> rejects on the first failure.</p>`, code: `async function fetchAllBrute(urls, limit, fetchFn) {
  return Promise.all(urls.map(u => fetchFn(u))); // everything at once, and one failure rejects everything
}` },
  mcq: { q: 'Why is <code>Promise.all(urls.map(fetch))</code> risky for 5,000 URLs?', options: ['Promise.all is deprecated', 'It starts all 5,000 requests at once, overloading the browser and server, and fails fast on the first error', 'It runs them sequentially', 'It cannot return results'], answer: 1, explain: 'Unbounded parallelism triggers queuing, rate limits and memory pressure. A small pool of workers keeps throughput high but bounded.' },
  hints: [`<p>Hint 1: Think of <code>limit</code> workers, each repeatedly taking the next unclaimed URL until none are left.</p>`, `<p>Hint 2: A shared counter <code>next</code> hands out indices. Because JavaScript is single-threaded, <code>const i = next++</code> is safe between awaits.</p>`, `<p>Hint 3: Recipe: results = new Array(n); workers = Array.from({length: min(limit, n)}, worker); each worker loops while next &lt; n, claims i, awaits fetchFn, writes results[i] in try/catch; finally await Promise.all(workers).</p>`],
  solution: {
    approach: `<p>A worker-pool: <code>limit</code> async loops pull indices from a shared counter. Writing into <code>results[i]</code> preserves order, and a try/catch inside the loop converts failures to result objects so no worker dies early.</p>`,
    code: { lang: 'js', run: true, code: `async function fetchAll(urls, limit, fetchFn) {
  const results = new Array(urls.length);
  let next = 0;                                    // next unclaimed index

  async function worker() {
    while (next < urls.length) {
      const i = next++;                            // claim synchronously: no two workers share an index
      try {
        results[i] = { ok: true, value: await fetchFn(urls[i]) };
      } catch (err) {
        results[i] = { ok: false, error: err.message };
      }
    }
  }

  const workers = Array.from({ length: Math.min(limit, urls.length) }, worker);
  await Promise.all(workers);                      // workers never reject (errors are caught)
  return results;
}

// Test: track the maximum number of requests in flight
let inFlight = 0, maxInFlight = 0;
const delays = { a: 300, b: 100, c: 100, d: 100, bad: 50 };
const fakeFetch = async (u) => {
  inFlight++; maxInFlight = Math.max(maxInFlight, inFlight);
  await new Promise((r) => setTimeout(r, delays[u]));
  inFlight--;
  if (u === 'bad') throw new Error('boom');
  return u.toUpperCase();
};

fetchAll(['a', 'b', 'c', 'd', 'bad'], 2, fakeFetch).then((res) => {
  console.log(res);
  console.log('max in flight:', maxInFlight);
});` },
    complexity: `<p>Time is about (sum of latencies) / limit; extra space O(n) for results.</p>`, followUps: ['Add per-request timeouts with AbortSignal.timeout', 'Retry failed items once', 'Stop launching new requests when an AbortSignal is aborted']
  }
});

/* ===================== QUIZ ===================== */
quiz.push({ q: 'In the web\'s client–server model, which statement is TRUE?', options: ['The server decides when to send pages to the browser without being asked', 'The client sends a request and the server sends back a response', 'The browser and the server run on the same machine in production', 'DNS stores the web pages'], answer: 1, explain: 'HTTP is request/response: the client always speaks first and the server answers. The server never pushes a page uninvited (WebSockets and SSE are separate mechanisms that start with a client request).' });
quiz.push({ q: 'What is the job of DNS?', options: ['Encrypt the connection', 'Turn a domain name into an IP address', 'Compress images', 'Store cookies'], answer: 1, explain: 'DNS is the internet\'s phone book: it maps names like example.com to IP addresses that computers use to find each other.' });
quiz.push({ q: 'In <code>https://shop.com:8443/a/b?x=1#top</code>, which part is NEVER sent to the server?', options: ['/a/b', '?x=1', '#top', ':8443'], answer: 2, explain: 'The fragment (#top) is handled only by the browser (scroll to an element, or a client-side route). Path and query are in the request line; the port is used to connect.' });
quiz.push({ q: 'Which two URLs have the SAME origin as <code>https://a.com/home</code>?', options: ['<code>http://a.com/home</code> and <code>https://a.com:8443/home</code>', '<code>https://a.com/cart?x=1</code> and <code>https://a.com:443/pay</code>', '<code>https://www.a.com/home</code> and <code>https://a.com.evil.io/</code>', '<code>https://a.com/home</code> and <code>ftp://a.com/home</code>'], answer: 1, explain: 'Origin = scheme + host + port. Path and query do not matter, and :443 is the default for https, so both match. The others differ in scheme, port or host.' });
quiz.push({ q: 'A user is logged in but opens an admin-only page. Which status code is the best answer?', options: ['401 Unauthorized', '403 Forbidden', '404 Not Found', '500 Internal Server Error'], answer: 1, explain: '403 means "I know who you are and you are not allowed". 401 (really "unauthenticated") means the server does not know who you are yet.' });
quiz.push({ q: 'Which HTTP method is both safe (no server change) and idempotent?', options: ['POST', 'PATCH', 'GET', 'DELETE'], answer: 2, explain: 'GET only reads data, so repeating it changes nothing. DELETE is idempotent but not safe; POST is neither.' });
quiz.push({ q: 'Which part of a normal page does the browser treat as BLOCKING PARSING by default?', options: ['<code>&lt;img src="a.png"&gt;</code>', '<code>&lt;link rel="stylesheet"&gt;</code>', '<code>&lt;script src="a.js"&gt;&lt;/script&gt;</code> with no attributes', '<code>&lt;script src="a.js" defer&gt;</code>'], answer: 2, explain: 'A classic script may modify the document, so the HTML parser stops until it is downloaded and executed. CSS blocks rendering (not parsing); defer and images do not block.' });
quiz.push({ q: 'Which order is correct?', options: ['load, DOMContentLoaded, first paint', 'DOMContentLoaded, then load (first paint can be anywhere around them)', 'load, then DOMContentLoaded', 'DOMContentLoaded always waits for images'], answer: 1, explain: 'DOMContentLoaded fires when the DOM (and deferred scripts) are ready; load waits for images and other resources, so it comes later. Painting depends on CSS, not on either event.' });
quiz.push({ q: 'You call <code>await fetch("/api/x")</code> and the server answers 500. What happens?', options: ['The promise rejects with an Error', 'The promise resolves and <code>res.ok</code> is false', 'fetch retries automatically', 'The page reloads'], answer: 1, explain: 'fetch rejects only for network-level failures. Any HTTP response, including 404/500, resolves; you must check res.ok or res.status.' });
quiz.push({ q: 'In the DevTools waterfall a request has a very long BLUE section (content download) but a tiny green one. What is the likely cause?', options: ['The server is slow to start answering', 'A large response or slow connection', 'DNS is broken', 'The request was cached'], answer: 1, explain: 'Green (waiting/TTFB) is the server thinking; blue (content download) is bytes arriving. A long blue part means a big payload or low bandwidth.' });
quiz.push({ q: 'Why should you NOT build query strings with <code>"?q=" + userText</code>?', options: ['It is slower', 'Special characters like &amp; # and spaces are not encoded and break the URL', 'GET requests cannot have a query', 'Browsers forbid the + operator'], answer: 1, explain: 'Characters with special URL meaning must be percent-encoded. Use URLSearchParams or encodeURIComponent so the server receives exactly what the user typed.' });
quiz.push({ q: 'What is the safest first move for a "button does nothing" bug?', options: ['Rewrite the CSS', 'Open the Console and look for a red error', 'Restart the server', 'Clear DNS'], answer: 1, explain: 'A button that does nothing is usually a JavaScript problem: an exception, or a handler attached to an element that did not exist yet. The Console shows the error and the line.' });
quiz.push({ q: 'Which HTTP/1.1 limitation does HTTP/2 mainly fix?', options: ['URLs are too long', 'Only about 6 parallel connections per host and head-of-line blocking at the request level', 'Cookies are too big', 'HTML is text'], answer: 1, explain: 'HTTP/2 multiplexes many requests on one connection and compresses headers, avoiding per-host connection queues. (HTTP/3 additionally fixes TCP-level head-of-line blocking.)' });

/* ===================== INTERVIEW ===================== */
interview.push({ level: 'B', q: 'What happens when you type a URL into the browser and press Enter?',
  a: `<p>In order: (1) the browser <b>parses the URL</b> (scheme, host, path). (2) It checks caches and, for a new host, does a <b>DNS lookup</b> to get an IP address. (3) It opens a <b>TCP connection</b> and, for https, a <b>TLS handshake</b> (certificate check, shared key). (4) It sends an <b>HTTP request</b> (<code>GET /</code> with headers like Host and Cookie). (5) The server processes it (maybe queries a database) and returns a <b>response</b>: status, headers, HTML. (6) The browser <b>parses HTML</b> into the DOM, discovers CSS/JS/images and fetches them in parallel, builds the CSSOM, runs scripts, then <b>layout and paint</b>. (7) Events <code>DOMContentLoaded</code> and <code>load</code> fire.</p><p>A good extra: mention caching at every layer, connection reuse and that HTTP/2/3 multiplex requests.</p>`,
  followUps: ['Which steps get skipped on a repeat visit?', 'Where does a CDN fit in?', 'What changes for HTTP/3?'] });
interview.push({ level: 'B', q: 'Explain the difference between a client and a server. Where should validation happen?',
  a: `<p>The <b>client</b> (browser) asks for things and runs on the user's device, which means the user controls it. The <b>server</b> listens, does work and answers, and the company controls it. Because anything in the browser can be edited (DevTools, curl, scripts), <b>client-side validation is only for convenience</b> (instant feedback). <b>Server-side validation is mandatory</b> for security and data integrity: check types, ranges, permissions and prices on the server regardless of what the form did. Secrets (API keys, database credentials) must never be shipped to the browser.</p>`,
  followUps: ['Give an example of a bug caused by trusting the client', 'Why do we still validate on the client at all?'] });
interview.push({ level: 'B', q: 'Name the parts of a URL and say which one defines the "origin".',
  a: `<p>A URL has a <b>scheme</b> (https), optional <b>userinfo</b>, a <b>host</b> (shop.example.com), an optional <b>port</b> (default 443 for https), a <b>path</b> (/shoes/42), a <b>query</b> (?color=red&amp;size=9) and a <b>fragment</b> (#reviews). The <b>origin is scheme + host + port</b>. Origin matters for the same-origin policy, CORS, cookies' scope and <code>postMessage</code>. The fragment never reaches the server. In code use <code>new URL(text)</code> and <code>URLSearchParams</code> rather than regexes.</p>`,
  followUps: ['Are a.com and www.a.com the same origin?', 'How do you encode a value with an ampersand in a query?'] });
interview.push({ level: 'B', q: 'What are HTTP status code families, and what is the difference between 401 and 403?',
  a: `<p>1xx informational, <b>2xx success</b>, <b>3xx redirect</b>, <b>4xx client error</b> (the request is wrong), <b>5xx server error</b> (the server failed). Common ones: 200 OK, 201 Created, 204 No Content, 301/302/307/308 redirects, 304 Not Modified, 400, 401, 403, 404, 409, 422, 429, 500, 502, 503, 504. <b>401</b> means the request lacks valid credentials ("who are you?" — log in), while <b>403</b> means credentials are valid but permission is missing ("I know you, and no"). A 404 is sometimes returned instead of 403 to hide that a resource exists.</p>`,
  followUps: ['Which codes are safe to retry?', 'What should an API return for a validation error?'] });
interview.push({ level: 'B', q: 'What is the role of HTML, CSS and JavaScript? Which one can a page work without?',
  a: `<p><b>HTML</b> defines structure and meaning (headings, links, forms). <b>CSS</b> controls presentation and layout. <b>JavaScript</b> adds behaviour and logic and can change the DOM. A page can work with HTML alone (content, links and forms still function) — that is <b>progressive enhancement</b>: start with working HTML, enhance with CSS, then JS. CSS and JS depend on HTML having something to attach to. Practical consequence: key content should be in real HTML so it works for crawlers, screen readers and slow devices.</p>`,
  followUps: ['What is the DOM versus the HTML source?', 'What breaks if JavaScript fails to load?'] });
interview.push({ level: 'I', q: 'Walk me through the critical rendering path. What blocks what?',
  a: `<p>The browser parses HTML into the <b>DOM</b>, CSS into the <b>CSSOM</b>, combines them into a <b>render tree</b> (visible elements with computed styles), runs <b>layout</b> to compute boxes, <b>paints</b> pixels and <b>composites</b> layers. Blocking rules: <b>CSS is render-blocking</b> (no first paint until the CSS in view is loaded) and also blocks script execution; a classic <b>script is parser-blocking</b> (HTML parsing pauses to download and execute it); <code>defer</code> scripts download in parallel and run after parsing in order; <code>async</code> scripts run as soon as they arrive; images do not block either. To speed up: inline or minimise critical CSS, defer JS, preconnect to origins, compress and size images.</p>`,
  followUps: ['What does the preload scanner do?', 'How would you improve LCP on this page?', 'Why can transform animations skip layout?'] });
interview.push({ level: 'I', q: 'Compare defer, async and type="module" scripts.',
  a: `<p>A normal script blocks the parser. <code>defer</code>: download in parallel, execute <b>after parsing, in document order</b>, before <code>DOMContentLoaded</code>; ideal for app code. <code>async</code>: download in parallel, execute <b>as soon as ready</b> (possibly before parsing finishes), order not guaranteed, may run before the DOM is complete; ideal for independent scripts like analytics. <code>type="module"</code> is <b>deferred by default</b>, has its own scope and strict mode, supports import/export; adding <code>async</code> to a module makes it run when ready. Inline scripts ignore defer. Avoid async for scripts that depend on each other or on the DOM.</p>`,
  followUps: ['Which one fires before DOMContentLoaded?', 'What happens if a deferred script depends on an async one?'] });
interview.push({ level: 'I', q: 'DOMContentLoaded vs load vs first paint: when does each happen and what do you use them for?',
  a: `<p><code>DOMContentLoaded</code> fires when the HTML is fully parsed and deferred scripts have executed; stylesheets and images may still be loading. Use it to attach event handlers or initialise the app. <code>load</code> fires on <code>window</code> after <b>all</b> resources (images, fonts, iframes) finish — use it for late, non-critical work. <b>First (Contentful) Paint</b> is a rendering milestone, independent of both: it happens as soon as CSS is ready and there is something to draw; <b>LCP</b> is when the largest element is painted. Modern code often avoids both events by placing scripts with <code>defer</code> or modules, and measures paint timings with <code>PerformanceObserver</code>.</p>`,
  followUps: ['Can first paint come after load?', 'How does readyState relate to these events?'] });
interview.push({ level: 'I', q: 'fetch does not throw on a 404. How do you write a correct fetch wrapper?',
  a: `<p><code>fetch</code> rejects only when the request cannot complete (offline, DNS failure, CORS block, abort). HTTP errors resolve with <code>res.ok === false</code>. A correct wrapper: (1) <code>await fetch(url, options)</code> inside <code>try/catch</code>; (2) if <code>!res.ok</code> throw an error that includes <code>status</code> and, ideally, the parsed error body; (3) check <code>Content-Type</code> before <code>res.json()</code>; (4) add a timeout with <code>AbortSignal.timeout()</code> and allow cancellation; (5) set <code>Content-Type</code> and <code>JSON.stringify</code> on POST; (6) optionally retry idempotent calls on network errors/429/5xx with exponential backoff and jitter. Centralising this in one helper avoids repeating mistakes.</p>`,
  followUps: ['How would you cancel an in-flight request when the user types again?', 'Why is a retry on POST dangerous?', 'What is a preflight request?'] });
interview.push({ level: 'I', q: 'How do you diagnose a slow page using the Network panel?',
  a: `<p>Open DevTools → Network, tick <b>Disable cache</b>, optionally throttle to Fast/Slow 4G, and reload. Read the <b>waterfall</b>: the first row's long green section means slow server (TTFB); long blue bars mean large downloads (enable compression, split bundles, resize images); a staircase means dependent requests (preload, bundle or restructure); lots of small requests suggests combining or relying on HTTP/2. Sort by Time and Size to find the worst offenders. Check the blue (DOMContentLoaded) and red (load) lines and cross-check with the Performance panel for main-thread long tasks and Lighthouse for LCP/CLS. Change one thing at a time and re-measure.</p>`,
  followUps: ['What does "(disk cache)" in the Size column mean?', 'How would you measure real users instead of your laptop?'] });
interview.push({ level: 'A', q: 'Explain HTTP caching: Cache-Control, ETag and 304. How would you cache a fingerprinted JS bundle versus an HTML page?',
  a: `<p><code>Cache-Control: max-age=N</code> makes a response fresh for N seconds: the browser reuses it with no request. After that it is <b>stale</b>; if the response had an <code>ETag</code> (or <code>Last-Modified</code>), the browser sends <code>If-None-Match</code> and the server may answer <b>304 Not Modified</b> with no body. <code>no-cache</code> means "store but revalidate every time"; <code>no-store</code> means never store; <code>private</code> vs <code>public</code> controls shared caches; <code>stale-while-revalidate</code> serves stale content while refreshing. For a <b>fingerprinted bundle</b> (<code>app.3f9a1c.js</code>) use <code>max-age=31536000, immutable</code> because a new build gets a new filename. For <b>HTML</b> use <code>no-cache</code> (or a short max-age) with an ETag so users always see fresh references to the latest bundles but still get cheap 304s. Add <code>Vary</code> when content depends on a header like Accept-Encoding.</p>`,
  followUps: ['What breaks if HTML is cached for a year?', 'How does a CDN interact with these headers?', 'What is cache busting?'] });
interview.push({ level: 'A', q: 'What are the differences between HTTP/1.1, HTTP/2 and HTTP/3, and does your front-end code change?',
  a: `<p><b>HTTP/1.1</b>: text protocol, one request in flight per connection, so browsers open ~6 connections per host; head-of-line blocking at the request level; workarounds like sprite sheets and domain sharding. <b>HTTP/2</b>: binary, multiplexed streams on one TCP connection, HPACK header compression, server push (now deprecated in browsers); but a lost TCP packet stalls all streams. <b>HTTP/3</b>: runs on QUIC (UDP) with per-stream loss recovery, faster handshake (TLS 1.3 built in, 0-RTT resumption) and connection migration between networks. Your <code>fetch</code> code, status codes and headers stay the same; what changes is optimisation advice: with HTTP/2+ many small files are fine, so heavy concatenation matters less, while preload, priorities and compression still matter. The server/CDN negotiates the version via ALPN and <code>Alt-Svc</code>.</p>`,
  followUps: ['Why did HTTP/2 push fail in practice?', 'What is 103 Early Hints?', 'How can you tell which version a request used in DevTools?'] });
interview.push({ level: 'E', q: 'A user reports the site is slow only in India on mobile. Describe your investigation end to end.',
  a: `<p>First <b>reproduce and measure</b>: use real-user monitoring (web-vitals, CrUX) segmented by country, device and connection to confirm the problem and see which metric is bad (TTFB, LCP, INP). Then test with Slow 4G throttling, CPU slowdown and a nearby region (WebPageTest from Mumbai). Read the waterfall layer by layer: <b>DNS/TLS/connect</b> (is there a CDN edge close to the user? is HTTP/3 enabled? preconnect to API/CDN?), <b>TTFB</b> (origin far away, uncached HTML, slow backend: add edge caching or regional origins), <b>payload</b> (Brotli, image formats and sizes, code splitting, remove unused JS), <b>main thread</b> (long tasks on low-end CPUs: reduce hydration and third-party scripts). Prioritise fixes by impact on LCP/INP, ship behind flags, verify in field data after rollout, and add performance budgets to CI so regressions are caught.</p>`,
  followUps: ['How do you decide between SSR, SSG and CSR for this case?', 'What would a performance budget look like?', 'How do you avoid regressions from third-party scripts?'] });

registerModule({
  id: 'fe01',
  title: 'How the Web Works',
  intro: `<p>Before React, flexbox or fancy tooling, you need one clear picture: <b>what actually happens between typing an address and seeing a page</b>. This module walks that road in plain English: browsers and servers, DNS and URLs, the HTTP conversation (methods, headers, status codes), the three jobs of HTML, CSS and JavaScript, the order in which a page loads and paints, how to use DevTools to see all of it with your own eyes, and finally how JavaScript talks to servers with <code>fetch</code>. Every idea comes with an analogy, a step-by-step visualizer and runnable code. This is the foundation every later frontend module (and every frontend interview) quietly assumes.</p>`,
  goals: [
    'Narrate, step by step, what happens from pressing Enter to pixels on screen (DNS, TCP/TLS, HTTP, parse, render)',
    'Split any URL into scheme, host, port, path, query and fragment, build query strings safely and decide whether two URLs share an origin',
    'Read and write HTTP requests and responses: methods, headers, status code families, and common codes like 301, 401, 403, 404, 429, 503',
    'Explain what HTML, CSS and JavaScript each do and debug a problem by choosing the right layer',
    'Predict the order of page-load events and explain which resources block parsing or rendering (defer, async, CSS)',
    'Use DevTools (Elements, Console, Sources, Network) and read a Network waterfall to find the slow part',
    'Write correct <code>fetch</code> code: check <code>res.ok</code>, parse JSON, POST data, time out and retry'
  ],
  prereqs: `Nothing technical: if you can use a browser and have seen basic JavaScript (variables, functions) you are ready. A quick look at JS Module 1 (Basics) helps for the code examples, but every snippet is explained.`,
  hours: 8,
  topics: topics,
  practice: practice,
  quiz: quiz,
  interview: interview
});
})();
