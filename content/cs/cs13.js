(function () {
var topics = [], practice = [], quiz = [], interview = [];

/* ---------- small helpers shared by the visualizers ---------- */
function ints(input, def, lo, hi) {
  var n = parseInt(String(input).trim(), 10);
  if (isNaN(n)) n = def;
  if (n < lo || n > hi) throw new Error('Enter a whole number from ' + lo + ' to ' + hi);
  return n;
}
function blank(r, c) { var g = []; for (var i = 0; i < r; i++) { g.push([]); for (var j = 0; j < c; j++) g[i].push(''); } return g; }
function copyG(g) { return g.map(function (r) { return r.slice(); }); }
function prob(o) {
  return {
    title: o.t, level: o.l, tags: o.tags, companies: o.co,
    statement: o.s, constraints: o.c, example: o.ex,
    brute: { why: o.bw },
    mcq: o.mcq,
    hints: o.h,
    solution: { approach: o.a, complexity: o.cx, followUps: o.f }
  };
}

/* ================= TOPIC 1: HTTP/1.1 -> HTTP/2 -> HTTP/3 ================= */
topics.push({
  title: 'HTTP/1.1 vs HTTP/2 vs HTTP/3: How the Web Talks',
  analogy: `<p><b>HTTP/1.1</b> is a single-lane drive-through: one car (request) is served at a time on that lane. If the car in front orders 40 burgers, everyone waits. Browsers cheat by opening 6 lanes. <b>HTTP/2</b> is one lane but the kitchen hands out food in small trays mixed together, so every car makes progress at once. <b>HTTP/3</b> gives every car its own tiny road next to the big road, so a breakdown on one road does not block the others.</p>`,
  explain: `<p>HTTP is just a request/response conversation: "GET me this page" &rarr; "here it is". What changed over 30 years is <b>how those messages travel</b>.</p>
  <h4>🟢 HTTP/1.1 (1997) &mdash; plain text, one at a time</h4>
  <p>Messages are readable text. On one connection the browser sends a request, waits for the full response, then sends the next. A page with 60 files needs a queue. Browsers open about <b>6 parallel TCP connections per host</b> to cope, and sites used tricks (sprites, bundling, domain sharding).</p>
  <h4>🟢 HTTP/2 (2015) &mdash; binary, many streams, one connection</h4>
  <ul><li><b>Binary framing</b>: messages are cut into small numbered frames (HEADERS, DATA...).</li>
  <li><b>Multiplexing</b>: frames of many <i>streams</i> (one per request) are interleaved on a single TCP connection.</li>
  <li><b>HPACK</b>: headers are compressed with a shared table, so the 500-byte cookie is sent once and later requests say "same as entry 62".</li>
  <li>Server push existed but is basically dead (Chrome removed it).</li></ul>
  <h4>🟢 HTTP/3 (2022, RFC 9114) &mdash; same ideas, over QUIC (UDP)</h4>
  <p>HTTP/2 fixed HTTP-level queueing but all streams still share ONE TCP byte stream. One lost packet stalls every stream until it is re-sent. HTTP/3 runs on <b>QUIC</b>, built on UDP, where each stream is independent, and the transport and TLS 1.3 handshakes are merged. Headers use <b>QPACK</b> (HPACK adapted so it does not depend on ordering).</p>
  ${H.table(['', 'HTTP/1.1', 'HTTP/2', 'HTTP/3'], [
    ['Format', 'text', 'binary frames', 'binary frames'],
    ['Transport', 'TCP', 'TCP', 'QUIC over UDP'],
    ['Parallel requests', '~6 connections', '1 connection, many streams', '1 connection, many streams'],
    ['Header compression', 'none', 'HPACK', 'QPACK'],
    ['HOL blocking', 'at HTTP and TCP', 'at TCP only', 'none across streams'],
    ['Needs TLS?', 'optional', 'in practice yes', 'always (built in)']])}`,
  clues: ['"Why is the page slow even though bandwidth is huge?" &rarr; latency / round trips, not bandwidth', '"Browser limits 6 connections per host" &rarr; HTTP/1.1 workaround', '"One lost packet slows all requests" &rarr; HOL blocking at TCP, the reason for HTTP/3', '"Mobile users switching Wi-Fi to 4G" &rarr; QUIC connection migration', '"Header compression" &rarr; HPACK (h2) / QPACK (h3)', '"Why UDP for HTTP/3?" &rarr; user-space transport, no kernel ossification, per-stream loss recovery'],
  code: [
    { lang: 'http', title: 'HTTP/1.1 request and response are plain text', check: false, code: `GET /index.html HTTP/1.1
Host: example.com
Accept: text/html
Connection: keep-alive

HTTP/1.1 200 OK
Content-Type: text/html
Content-Length: 1256
Cache-Control: max-age=600

<html>...</html>` },
    { lang: 'bash', title: 'See which HTTP version a server speaks', check: false, code: `# --http2 / --http3 ask for that version; -I = headers only; -w prints a field
curl -sI --http2 https://example.com -o /dev/null -w "%{http_version}\\n"
curl -sI --http3 https://cloudflare.com -o /dev/null -w "%{http_version}\\n"
# the Alt-Svc header is how a server tells you "I also speak h3 on UDP 443"
curl -sI https://cloudflare.com | grep -i alt-svc` }
  ],
  viz: {
    title: 'One connection: HTTP/1.1 vs HTTP/2 (time x streams)',
    input: '4',
    inputLabel: 'Number of resources (2-6)',
    gen: function (input) {
      var n = ints(input, 4, 2, 6), T = n * 2, frames = [];
      var rowHead = [], colHead = [];
      for (var i = 0; i < n; i++) rowHead.push('res ' + (i + 1));
      for (var t = 0; t < T; t++) colHead.push('t' + t);
      var g = blank(n, T), hl = {};
      frames.push({ narr: 'We need <b>' + n + '</b> files. Each file takes 2 time-slots of the wire. Rows = requests, columns = time on ONE connection.', parts: [{ type: 'grid', label: 'empty wire', rows: copyG(g), rowHead: rowHead, colHead: colHead }] });
      var g1 = blank(n, T), h1 = {};
      for (var r = 0; r < n; r++) {
        for (var k = 0; k < 2; k++) { g1[r][r * 2 + k] = 'D' + (r + 1); h1[r + ',' + (r * 2 + k)] = 'win'; }
        frames.push({ narr: '<b>HTTP/1.1:</b> file ' + (r + 1) + ' uses the wire during t' + (r * 2) + '-t' + (r * 2 + 1) + '. Files after it must <span class="c-r">wait their turn</span> (one in flight per connection).', parts: [{ type: 'grid', label: 'HTTP/1.1, 1 connection', rows: copyG(g1), rowHead: rowHead, colHead: colHead, hl: JSON.parse(JSON.stringify(h1)) }] });
      }
      frames.push({ narr: 'HTTP/1.1 finished in <b>' + T + '</b> slots. Browsers open ~6 connections to run these rows side by side, at the price of 6 handshakes.', parts: [{ type: 'grid', label: 'HTTP/1.1 result', rows: copyG(g1), rowHead: rowHead, colHead: colHead, hl: JSON.parse(JSON.stringify(h1)) }] });
      var g2 = blank(n, T), h2 = {};
      for (var c = 0; c < T; c++) {
        var row = c % n;
        g2[row][c] = 'F' + (row + 1); h2[row + ',' + c] = 'ok';
        if (c < 4 || c === T - 1) frames.push({ narr: '<b>HTTP/2:</b> slot t' + c + ' carries a frame from stream ' + (row + 1) + '. Streams are interleaved so a slow big file cannot block small ones.', parts: [{ type: 'grid', label: 'HTTP/2, 1 connection, frames interleaved', rows: copyG(g2), rowHead: rowHead, colHead: colHead, hl: JSON.parse(JSON.stringify(h2)) }] });
      }
      var g3 = copyG(g2), h3 = JSON.parse(JSON.stringify(h2)), lost = Math.min(3, T - 1);
      for (var q = lost; q < T; q++) { var rr = q % n; h3[rr + ',' + q] = 'bad'; }
      frames.push({ narr: '<b>Catch:</b> all frames ride ONE TCP byte stream. If the packet at t' + lost + ' is lost, TCP holds back everything after it (<span class="c-r">red</span>) for a retransmit round trip &mdash; even frames of unrelated streams. That is TCP head-of-line blocking; HTTP/3 removes it.', parts: [{ type: 'grid', label: 'HTTP/2 with one lost packet', rows: g3, rowHead: rowHead, colHead: colHead, hl: h3 }] });
      return frames;
    }
  },
  examples: [
    { title: 'Why bundling helped in 2012 and hurts less in 2026', html: `<p>On HTTP/1.1 each file cost a queue slot, so people glued 30 JS files into one. With HTTP/2 requests are cheap and a changed file only invalidates its own cache entry, so moderate splitting is fine. Too many tiny modules still hurts (each needs discovery and a priority decision), so bundlers still make a handful of chunks.</p>` },
    { title: 'Reading an HTTP/2 stream', html: `<p>Stream IDs: client-started streams are <b>odd</b> (1, 3, 5...), server-started (push) are even. Stream 0 is the connection itself (SETTINGS, PING). The browser can send HEADERS for streams 1, 3, 5 in one burst and receive DATA frames back in any interleaving.</p>` },
    { title: 'Alt-Svc: how a browser discovers HTTP/3', html: `<p>The first visit usually goes over TCP (h2). The server replies with <code>Alt-Svc: h3=":443"; ma=86400</code> meaning "also available over QUIC on UDP 443 for a day". The next request races/uses QUIC. HTTPS DNS records (type 65) can announce h3 even earlier.</p>`, code: { lang: 'http', check: false, code: `HTTP/2 200
alt-svc: h3=":443"; ma=86400
content-type: text/html` } }
  ],
  deepDive: `<p><b>HPACK</b> keeps two tables: a static table of 61 common headers (<code>:method GET</code> is entry 2) and a dynamic table both sides update. A repeated header becomes a 1-byte index. Huffman coding shrinks literals. It was designed to resist the CRIME attack, which broke the earlier gzip-based SPDY compression.</p>
  <p><b>Flow control and priority</b>: h2 has per-stream and per-connection windows (default 65,535 bytes, raised with WINDOW_UPDATE) on top of TCP's own window. The old dependency-tree priority scheme was complex and badly implemented; RFC 9218 replaced it with simple <code>Priority: u=1</code> urgency headers.</p>
  <p><b>Why h2 can be slower than h1 on bad networks</b>: one TCP connection means one congestion window and one loss recovery. At 2% packet loss, six parallel h1 connections often beat a single h2 connection. That observation motivated QUIC.</p>
  <p><b>HTTP/3 and QUIC</b>: QUIC packets are encrypted UDP datagrams. A <i>connection ID</i> (not the IP:port tuple) identifies the connection, so changing network does not kill it. Loss recovery is per stream: a hole in stream 4 only blocks stream 4. Downsides: higher CPU (user-space crypto, no TCP offload), UDP blocked by some corporate firewalls (clients fall back to h2), and amplification-attack limits during handshake.</p>
  <p><b>Operational reality</b>: browsers race h3 and h2 and use whichever wins; CDNs terminate h3 and often speak h2 or h1 to your origin. gRPC rides HTTP/2. Request smuggling bugs come from front-end and back-end disagreeing about where an HTTP/1.1 message ends &mdash; one more reason to use h2 end-to-end.</p>`,
  aiEra: `<p><b>What AI changes:</b> LLM APIs stream tokens back, so streaming responses (chunked HTTP/1.1, h2 DATA frames, or SSE) are now the normal way to talk to a model. Time-to-first-token is mostly round trips + model queue time, so everything in this topic shows up in your app's latency.</p>
  <p><b>Use AI as a partner:</b> paste a HAR file or <code>curl -v</code> output and ask <code>Which protocol was used, where did the time go: DNS, connect, TLS, wait, receive?</code></p>
  <p><b>Where AI goes wrong:</b> it often says "HTTP/2 removes head-of-line blocking" without the TCP caveat, or claims server push is a good optimisation. Check both.</p>
  <p><b>What you must own:</b> explaining exactly <i>which layer</i> still blocks and why QUIC moved the fix into the transport.</p>`,
  problems: [prob({
    t: 'Explain HTTP/2 to a Skeptic', l: 'Easy', tags: ['http', 'http2'], co: ['Google', 'Amazon'],
    s: `<p>Your teammate says "we already open 6 connections, why bother with HTTP/2?" Answer in under a minute: what does HTTP/2 give, and what does it NOT fix?</p>`,
    c: `Be concrete: name multiplexing, HPACK and the remaining TCP issue.`,
    ex: `<p>Strong answer: ${H.c('g', 'one connection, many interleaved streams, compressed headers')}, but ${H.c('r', 'still one TCP byte stream, so one loss stalls all streams')}.</p>`,
    bw: `<p>Weak answer: "HTTP/2 is faster because it is newer." No mechanism, no trade-off, and it wrongly implies HTTP/2 solves all blocking.</p>`,
    mcq: { q: 'What does HTTP/2 NOT fix?', options: ['Request queueing within one connection', 'Header repetition', 'A lost TCP segment delaying every stream', 'Needing many connections'], answer: 2, explain: 'All streams share one TCP byte stream; TCP delivers in order, so a loss blocks all of them.' },
    h: [`<p>Hint 1: what is different between "many connections" and "many streams on one connection"?</p>`, `<p>Hint 2: think handshake cost, congestion window sharing, header size.</p>`, `<p>Hint 3: structure: (1) what h1 does, (2) multiplexing + HPACK, (3) one fewer handshake and better congestion behaviour, (4) the TCP HOL caveat and HTTP/3.</p>`],
    a: `<p>HTTP/1.1 can only have one request in flight per connection, so browsers open ~6 connections, each paying a TCP+TLS handshake and each with its own slow-start. HTTP/2 puts many request/response <b>streams</b> on <b>one</b> connection by cutting messages into binary frames and interleaving them, so there is one handshake, one warmed-up congestion window and no application-level queue. HPACK removes repeated header bytes (cookies, user-agent). What it does not fix: all streams share one TCP byte stream, so a single lost packet blocks all of them until retransmitted &mdash; on lossy mobile networks that can make h2 worse than h1. HTTP/3 solves that with QUIC's independent streams.</p>`,
    cx: `<p>Reasoning question; no code.</p>`, f: ['Why did server push die?', 'What is HPACK vulnerable to if done naively?']
  })]
});

/* ================= TOPIC 2: keep-alive, HOL blocking, counting RTTs ================= */
topics.push({
  title: 'Keep-Alive, Head-of-Line Blocking & Counting Round Trips',
  analogy: `<p>Calling a friend: <b>dialing + "hello, can you hear me?"</b> is the handshake. If you hang up after every sentence you re-dial every time. <b>Keep-alive</b> means staying on the call. And a round trip is a <b>question and its answer</b>; your page speed is mostly "how many times did we have to wait for an answer?" &mdash; a 150 ms distance multiplied by the number of waits.</p>`,
  explain: `<p><b>Keep-alive / connection reuse.</b> HTTP/1.0 closed the TCP connection after each response. HTTP/1.1 made <code>Connection: keep-alive</code> the default: the connection stays open for the next request, skipping the TCP handshake (1 RTT) and TLS handshake (1-2 RTT) and keeping the congestion window warm. Servers close idle connections after a timeout (often 5-75 s). Pipelining (sending several requests without waiting) existed but broke too many proxies, so nobody uses it.</p>
  <h4>Head-of-line (HOL) blocking &mdash; at each layer</h4>
  ${H.table(['Layer', 'What blocks', 'Fixed by'], [
    ['HTTP/1.1 (application)', 'Response 2 cannot start until response 1 is fully sent on that connection', 'HTTP/2 multiplexing (or 6 connections)'],
    ['TCP (transport)', 'A lost segment holds back all later bytes until retransmitted, because delivery is in-order', 'QUIC: per-stream ordering over UDP'],
    ['Router/switch queue (network)', 'A big packet in front of a small one in a FIFO queue', 'Fair queueing / QoS (not HTTP&apos;s business)'],
    ['Server (worker)', 'One slow handler blocks the thread/process behind it', 'Async I/O, more workers']])}
  <h4>Counting round trips to first byte (TTFB)</h4>
  <p>Start from a cold client that already knows the IP. Count only network round trips:</p>
  ${H.table(['Stack', 'TCP', 'TLS', 'Request', 'Total RTT to first byte'], [
    ['HTTP/1.1 + TLS 1.2', '1', '2', '1', '<b>4</b>'],
    ['HTTP/2 + TLS 1.3', '1', '1', '1', '<b>3</b>'],
    ['HTTP/3 (QUIC)', '0 (merged)', '1 (merged with transport)', '1 (covered)', '<b>2</b> total: 1 handshake + 1 request'],
    ['HTTP/3 resumed + 0-RTT', '0', '0', '1', '<b>1</b>'],
    ['HTTP/2 + TLS 1.3 resumed + 0-RTT', '1', '0', '1', '<b>2</b>']])}
  <p>Add <b>1 more RTT for an uncached DNS lookup</b> (more if the resolver must walk root &rarr; TLD &rarr; authoritative). At 100 ms RTT, 4 vs 2 round trips is 400 ms vs 200 ms before the server even thinks.</p>`,
  clues: ['"How many round trips before the first byte of the response?"', '"Cold start vs warm connection"', '"Users far from the server / satellite / mobile" &rarr; latency dominated by RTTs', '"Why does a CDN make sites faster?" &rarr; shorter RTT + terminated handshakes at the edge', '"One slow response blocks the rest" &rarr; HOL blocking, ask which layer', '"Connection reuse / pooling / keep-alive timeout mismatch" &rarr; random 502s from stale connections'],
  code: [
    { lang: 'python', run: true, title: 'RTT-to-first-byte calculator', code: `# Count network round trips before the first response byte arrives.
# Assumes the client already holds nothing: no cached DNS, no session ticket.
def rtts(http, tls=None, resumed=False, zero_rtt=False, dns=True):
    steps = []
    if dns:
        steps.append(("DNS lookup (resolver miss, 1 RTT to resolver)", 1))
    if http == "h3":
        # QUIC merges transport + TLS 1.3 into ONE handshake round trip
        if resumed and zero_rtt:
            steps.append(("QUIC 0-RTT: request rides in first flight", 0))
        else:
            steps.append(("QUIC handshake (transport + TLS 1.3)", 1))
    else:
        steps.append(("TCP 3-way handshake", 1))
        if tls == "1.2":
            steps.append(("TLS 1.2 full handshake", 1 if resumed else 2))
        elif tls == "1.3":
            steps.append(("TLS 1.3 handshake", 0 if (resumed and zero_rtt) else 1))
        # tls None = plain HTTP
    steps.append(("HTTP request -> first byte of response", 1))
    return steps

def show(name, **kw):
    steps = rtts(**kw)
    total = sum(n for _, n in steps)
    print("%-38s total = %d RTT" % (name, total))
    for label, n in steps:
        print("    +%d  %s" % (n, label))
    return total

cases = [
    ("HTTP/1.1 + TLS1.2", dict(http="h1", tls="1.2")),
    ("HTTP/2   + TLS1.3", dict(http="h2", tls="1.3")),
    ("HTTP/3 (QUIC)", dict(http="h3")),
    ("HTTP/2 + TLS1.3 resumed 0-RTT", dict(http="h2", tls="1.3", resumed=True, zero_rtt=True)),
    ("HTTP/3 resumed 0-RTT", dict(http="h3", resumed=True, zero_rtt=True)),
]
totals = {}
for name, kw in cases:
    totals[name] = show(name, **kw)
    print()

RTT_MS = 80
print("At %d ms RTT:" % RTT_MS)
for name, t in totals.items():
    print("  %-34s %4d ms to first byte" % (name, t * RTT_MS))` },
    { lang: 'python', run: true, title: 'Connection pool: reuse vs reconnect', code: `# Fetch 10 resources from one host. Compare "new connection per request"
# with keep-alive reuse and with HTTP/2 multiplexing (idealised).
RTT = 50          # ms
SETUP = 3 * RTT        # TCP (1 RTT) + TLS 1.2 (2 RTT)
N = 10
TRANSFER = 20     # ms of data transfer per resource

no_keepalive = N * (SETUP + RTT + TRANSFER)
keepalive_1conn = SETUP + N * (RTT + TRANSFER)          # serial on one connection
keepalive_6conn = SETUP + ((N + 5) // 6) * (RTT + TRANSFER)  # 6 conns (setup in parallel)
http2 = SETUP + RTT + N * TRANSFER                      # all requests sent at once
print("new connection each time :", no_keepalive, "ms")
print("keep-alive, 1 connection :", keepalive_1conn, "ms")
print("keep-alive, 6 connections:", keepalive_6conn, "ms")
print("HTTP/2 multiplexed       :", http2, "ms")` }
  ],
  viz: {
    title: 'Round-trip ladder to first byte',
    input: 'h2-tls13',
    inputLabel: 'Stack: h1-tls12, h2-tls13, h3, h3-0rtt',
    gen: function (input) {
      var key = String(input).trim().toLowerCase();
      var plans = {
        'h1-tls12': { name: 'HTTP/1.1 + TLS 1.2', steps: [['DNS', 'client &rarr; resolver', 'A? example.com'], ['TCP', 'SYN / SYN-ACK / ACK', 'open the pipe'], ['TLS 1.2 #1', 'ClientHello / ServerHello+Cert+KeyExchange', 'agree on cipher, prove identity'], ['TLS 1.2 #2', 'ClientKeyExchange+Finished / Finished', 'keys ready'], ['HTTP', 'GET / 200 first byte', 'finally real data']] },
        'h2-tls13': { name: 'HTTP/2 + TLS 1.3', steps: [['DNS', 'client &rarr; resolver', 'A? example.com'], ['TCP', 'SYN / SYN-ACK / ACK', 'open the pipe'], ['TLS 1.3', 'ClientHello+key_share / ServerHello..Finished', 'keys ready after ONE trip'], ['HTTP', 'GET / 200 first byte', 'real data']] },
        'h3': { name: 'HTTP/3 over QUIC', steps: [['DNS', 'client &rarr; resolver', 'A? example.com (or HTTPS record)'], ['QUIC', 'Initial(ClientHello) / Handshake+1-RTT keys', 'transport + TLS in ONE trip'], ['HTTP', 'GET / 200 first byte', 'real data']] },
        'h3-0rtt': { name: 'HTTP/3 resumed, 0-RTT', steps: [['DNS', 'cached', 'no wait'], ['QUIC 0-RTT', 'Initial + early data (GET)', 'request already inside the first flight'], ['HTTP', '200 first byte', 'arrives after 1 RTT total']] }
      };
      var p = plans[key];
      if (!p) throw new Error('Use one of: h1-tls12, h2-tls13, h3, h3-0rtt');
      var frames = [], rows = [], total = 0;
      frames.push({ narr: 'Stack: <b>' + p.name + '</b>. Each row below is one wait for an answer. Fewer waits = faster first byte.', parts: [{ type: 'table', label: 'round trips', columns: ['step', 'messages', 'purpose', 'RTTs so far'], rows: [['(start)', '', '', 0]] }] });
      for (var i = 0; i < p.steps.length; i++) {
        var s = p.steps[i], cost = (s[1] === 'cached' || s[0] === 'DNS' && s[1] === 'cached') ? 0 : 1;
        if (s[0] === 'TLS 1.2 #1' || s[0] === 'TLS 1.2 #2') cost = 1;
        if (s[0] === 'QUIC 0-RTT') cost = 0;
        total += cost;
        rows.push([s[0], s[1], s[2], total]);
        frames.push({ narr: 'Step <b>' + s[0] + '</b>: ' + s[2] + '. ' + (cost ? 'This costs <span class="c-r">1 RTT</span>.' : '<span class="c-g">No extra wait.</span>') + ' Running total: <b>' + total + '</b>.', parts: [{ type: 'table', label: 'round trips', columns: ['step', 'messages', 'purpose', 'RTTs so far'], rows: rows.map(function (r) { return r.slice(); }), hl: (function () { var o = {}; o[rows.length - 1] = 'cur'; return o; })() }] });
      }
      frames.push({ narr: 'Total network round trips to first byte (including DNS): <b>' + total + '</b>. At 100 ms RTT that is <b>' + (total * 100) + ' ms</b> before the page starts.', parts: [{ type: 'table', label: 'final', columns: ['step', 'messages', 'purpose', 'RTTs so far'], rows: rows, hl: (function () { var o = {}; o[rows.length - 1] = 'sel'; return o; })() }] });
      return frames;
    }
  },
  examples: [
    { title: 'Worked count: HTTP/1.1 + TLS 1.2 on a cold start', html: `<p>DNS 1 + TCP 1 + TLS 2 + request 1 = <b>5 RTT</b> (4 if DNS is cached). With 100 ms RTT that is 400-500 ms of pure waiting.</p>` },
    { title: 'Worked count: HTTP/3 with 0-RTT resumption', html: `<p>DNS cached, QUIC 0-RTT carries the GET in the very first packet, response comes back after <b>1 RTT</b>. That is the best any protocol can do over a network: you cannot get an answer faster than one round trip.</p>` },
    { title: 'The keep-alive 502 mystery', html: `<p>A load balancer closes idle connections after 60 s; your app server keeps them 75 s. The pool reuses a connection the other side already closed, the request hits a dead socket and you see sporadic 502s. <b>Rule: the client-side idle timeout must be shorter than the server-side one</b> (and retry idempotent requests).</p>`, code: { lang: 'bash', check: false, code: `# Typical fix for nginx upstream keep-alive pools:
#   upstream app { server 10.0.0.5:8080; keepalive 64; keepalive_timeout 55s; }
# and make the app server's idle timeout LONGER than the proxy's.` } }
  ],
  deepDive: `<p><b>Why TCP HOL blocking exists.</b> TCP promises "bytes arrive in the order sent". If segment 7 is lost but 8-12 arrive, the kernel buffers 8-12 and does <i>not</i> give them to the application until 7 is retransmitted (one RTT or an RTO later). HTTP/2 puts many streams in that single byte stream, so a loss hits all of them. QUIC numbers packets per connection but orders data <i>per stream</i>, so only streams with a hole wait.</p>
  <p><b>Slow start and connection reuse.</b> A new TCP connection starts with a small congestion window (usually 10 segments &asymp; 14 KB), so even after the handshake the first response needs several round trips to ramp up. Reusing a warm connection is therefore worth more than the handshake savings alone. Idle connections may reset to slow start (<code>tcp_slow_start_after_idle</code>).</p>
  <p><b>0-RTT is not free.</b> Early data is encrypted with a key from a previous session and can be <b>replayed</b> by an attacker (they just resend the captured packets). So servers must only accept idempotent requests (GET) in early data, or keep anti-replay state. TLS 1.3 also limits how long a ticket is valid.</p>
  <p><b>TCP Fast Open</b> can put data in the SYN, but middleboxes broke it, so it saw little adoption. <b>Happy Eyeballs</b>: clients start IPv6 and IPv4 (and h3 vs h2) attempts a few hundred milliseconds apart and keep the winner.</p>
  <p><b>Real-world numbers to remember:</b> light in fibre covers ~200 km per ms, so 100 ms RTT &asymp; 10,000 km round trip; same-region cloud RTT is 1-2 ms; cross-continent 70-150 ms. Saving 2 round trips is a big win only when RTT is big &mdash; which is exactly why edge termination (CDN) matters.</p>`,
  aiEra: `<p><b>What AI changes:</b> an AI chat page makes one long streaming request, so the connection setup is a small share of total time, but tool-calling agents make <i>many</i> small sequential API calls &mdash; connection pooling and keep-alive suddenly decide whether an agent loop takes 3 s or 10 s. Always reuse one HTTP client (session) instead of creating one per call.</p>
  <p><b>Use AI as a partner:</b> give it your waterfall and ask <code>List every round trip before first byte and which one a CDN or 0-RTT could remove</code>.</p>
  <p><b>Where AI goes wrong:</b> it mixes up "RTT" and "request count", forgets DNS, or counts TLS 1.3 as 2 RTT. Do the arithmetic yourself with the table above.</p>
  <p><b>What you must own:</b> a correct RTT count, naming the layer that blocks, and the 0-RTT replay caveat.</p>`,
  problems: [prob({
    t: 'RTT Count Showdown', l: 'Medium', tags: ['latency', 'handshake'], co: ['Cloudflare', 'Google', 'Netflix'],
    s: `<p>A user 120 ms RTT away opens your site for the very first time (no caches). Compare time to first byte for (a) HTTP/1.1 + TLS 1.2, (b) HTTP/2 + TLS 1.3, (c) HTTP/3. DNS resolver is nearby (assume 10 ms) and the resolver has the answer cached.</p>`,
    c: `Count only handshake and request round trips to the origin; ignore server think time.`,
    ex: `<p>(a) 10 + 120&times;(1+2+1) = ${H.c('r', '490 ms')} &nbsp; (b) 10 + 120&times;3 = ${H.c('y', '370 ms')} &nbsp; (c) 10 + 120&times;2 = ${H.c('g', '250 ms')}.</p>`,
    bw: `<p>Weak: "HTTP/3 is about 3x faster". Without counting you cannot say where the saving comes from, and you forget that the DNS hop is to a different (near) server.</p>`,
    mcq: { q: 'Which RTT count is right for TLS 1.2 (full) over TCP, then one GET?', options: ['2', '3', '4', '5'], answer: 2, explain: 'TCP 1 + TLS 1.2 two round trips + request 1 = 4.' },
    h: [`<p>Hint 1: list the handshakes in order: TCP, TLS, then request.</p>`, `<p>Hint 2: TLS 1.2 = 2 RTT, TLS 1.3 = 1 RTT, QUIC merges transport and crypto = 1 RTT.</p>`, `<p>Hint 3: DNS talks to the resolver (10 ms), not the origin (120 ms). Multiply carefully.</p>`],
    a: `<p>Add the near DNS cost (10 ms) separately because it uses a different, close server. HTTP/1.1+TLS1.2: TCP 1, TLS 2, request 1 = 4 round trips &times; 120 = 480 + 10 = 490 ms. HTTP/2+TLS1.3: TCP 1, TLS 1, request 1 = 3 &times; 120 = 360 + 10 = 370 ms. HTTP/3: QUIC handshake 1 (transport and TLS together) + request 1 = 2 &times; 120 = 240 + 10 = 250 ms. The saving comes from fewer sequential handshakes, not faster bytes. Returning visitors can do better: TLS 1.3 resumption with 0-RTT brings HTTP/2 to 2 RTT and HTTP/3 to 1 RTT, but early data must be replay-safe.</p>`,
    cx: `<p>O(1) arithmetic; the insight is the sequence of dependent round trips.</p>`, f: ['What if the user is on a lossy mobile link?', 'How much does a CDN POP 20 ms away change each number?']
  })]
});

/* ================= TOPIC 3: TLS & certificates ================= */
topics.push({
  title: 'TLS 1.2 vs 1.3, Key Exchange & Certificate Chains',
  analogy: `<p>You meet a stranger in a crowded room and want to whisper a secret. <b>Key exchange</b> is two people each mixing a private colour into a shared public colour, swapping the mixes, and mixing again: both end with the same secret colour that no eavesdropper can compute. <b>A certificate</b> is the stranger's passport; you trust it because a border office you already trust (a Certificate Authority) stamped it, and that office was itself vouched for by a higher office up to one you know by heart (the root).</p>`,
  explain: `<p>TLS gives three promises: <b>privacy</b> (encryption), <b>integrity</b> (tampering is detected) and <b>authentication</b> (you are really talking to example.com).</p>
  <h4>🟢 TLS 1.3 handshake in plain steps (1 RTT)</h4>
  <ol><li><b>ClientHello</b>: "I speak TLS 1.3, here are my cipher suites, and here is my ECDHE public key share (guessing x25519)", plus SNI (the hostname I want).</li>
  <li><b>ServerHello</b>: picks the cipher, sends ITS ECDHE share. From here both sides compute the same secret, and <b>everything after is encrypted</b>.</li>
  <li>Server sends (encrypted): <b>Certificate</b>, <b>CertificateVerify</b> (a signature proving it owns the private key), <b>Finished</b>.</li>
  <li>Client checks the chain and signature, sends <b>Finished</b>. Then data flows.</li></ol>
  ${H.table(['', 'TLS 1.2', 'TLS 1.3'], [
    ['Handshake round trips', '2 (1 with session resumption)', '1 (0 with 0-RTT resumption)'],
    ['Key exchange', 'RSA <i>or</i> (EC)DHE', 'Only (EC)DHE &rarr; always forward secret'],
    ['Cipher suites', 'many, some weak (RC4, CBC, static RSA)', '5 strong AEAD suites (AES-GCM, ChaCha20-Poly1305)'],
    ['Certificate visible on wire', 'yes, in clear', 'no, encrypted'],
    ['Compression / renegotiation', 'present (attack surface)', 'removed']])}
  <h4>🟢 Certificates and the chain of trust</h4>
  <p>A <b>certificate</b> binds a name (example.com) to a public key and is <b>signed by an issuer</b>. The server sends <b>leaf + intermediate(s)</b>. The client walks up: leaf signed by intermediate, intermediate signed by a <b>root</b> that is already in the OS/browser <b>trust store</b>. The client also checks: hostname matches (SAN field), dates are valid, not revoked (OCSP stapling / CRLite), and key usage is correct. Roots are rarely used directly; intermediates sign leaves so a root can stay offline.</p>
  <p><b>Forward secrecy</b>: because each session uses fresh ephemeral keys, stealing the server's long-term private key later does not decrypt recorded old traffic.</p>`,
  clues: ['"Is the connection secure? What if the server key leaks later?" &rarr; forward secrecy / ECDHE', '"How does the browser know this is really bank.com?" &rarr; chain of trust to a root in the trust store', '"Why TLS 1.3 is faster" &rarr; 1 RTT, fewer messages, 0-RTT resumption', '"ERR_CERT_AUTHORITY_INVALID / NET::ERR_CERT_DATE_INVALID" &rarr; chain / expiry problems', '"Man-in-the-middle at a corporate proxy" &rarr; custom root installed in the trust store', '"Replay attack" &rarr; 0-RTT early data caveat', '"SNI" &rarr; one IP serving many hostnames'],
  code: [
    { lang: 'python', run: true, title: 'Chain-of-trust verifier over toy certificates', code: `import hashlib, hmac

# TOY model: real TLS uses RSA/ECDSA public-key signatures. Here a "signature"
# is HMAC(issuer_secret, certificate fields). The issuer's secret stands in for
# "only the issuer can sign", and verify() uses the same value for simplicity.
def sign(issuer_secret, subject, pubkey, issuer, not_after):
    msg = "|".join([subject, pubkey, issuer, str(not_after)]).encode()
    return hmac.new(issuer_secret.encode(), msg, hashlib.sha256).hexdigest()[:16]

def make_cert(subject, pubkey, issuer, issuer_secret, not_after, san=None):
    return {"subject": subject, "pubkey": pubkey, "issuer": issuer,
            "not_after": not_after, "san": san or [subject],
            "sig": sign(issuer_secret, subject, pubkey, issuer, not_after)}

SECRETS = {"RootCA": "root-secret", "InterCA": "inter-secret", "EvilCA": "evil-secret"}
TRUST_STORE = {"RootCA": "root-secret"}   # roots we already trust (the OS/browser list)

def verify_chain(chain, hostname, today):
    """chain = [leaf, intermediate, ..., root]. Returns (ok, reasons list)."""
    log = []
    leaf = chain[0]
    if hostname not in leaf["san"]:
        return False, ["BAD: hostname %s not in SAN %s" % (hostname, leaf["san"])]
    for i, cert in enumerate(chain):
        if today > cert["not_after"]:
            return False, log + ["BAD: %s expired (day %d > %d)" % (cert["subject"], today, cert["not_after"])]
        if i + 1 < len(chain):
            parent = chain[i + 1]
            if cert["issuer"] != parent["subject"]:
                return False, log + ["BAD: %s issuer %s != next cert %s" % (cert["subject"], cert["issuer"], parent["subject"])]
            expect = sign(SECRETS[parent["subject"]], cert["subject"], cert["pubkey"], cert["issuer"], cert["not_after"])
            if expect != cert["sig"]:
                return False, log + ["BAD: signature on %s not made by %s" % (cert["subject"], parent["subject"])]
            log.append("ok: %s signed by %s" % (cert["subject"], parent["subject"]))
    root = chain[-1]
    if root["subject"] not in TRUST_STORE:
        return False, log + ["BAD: root %s is not in the trust store" % root["subject"]]
    if sign(TRUST_STORE[root["subject"]], root["subject"], root["pubkey"], root["issuer"], root["not_after"]) != root["sig"]:
        return False, log + ["BAD: root self-signature invalid"]
    log.append("ok: root %s is trusted" % root["subject"])
    return True, log

root = make_cert("RootCA", "kR", "RootCA", "root-secret", 5000)
inter = make_cert("InterCA", "kI", "RootCA", "root-secret", 3000)
leaf = make_cert("shop.example", "kL", "InterCA", "inter-secret", 400, san=["shop.example", "www.shop.example"])
evil_root = make_cert("EvilCA", "kE", "EvilCA", "evil-secret", 5000)
evil_leaf = make_cert("shop.example", "kX", "EvilCA", "evil-secret", 400)
forged = dict(leaf, pubkey="kATTACKER")        # attacker swapped the key, kept the old signature

tests = [
    ("good chain", [leaf, inter, root], "shop.example", 100),
    ("expired leaf", [leaf, inter, root], "shop.example", 401),
    ("wrong hostname", [leaf, inter, root], "evil.example", 100),
    ("untrusted root", [evil_leaf, evil_root], "shop.example", 100),
    ("tampered leaf", [forged, inter, root], "shop.example", 100),
    ("missing intermediate", [leaf, root], "shop.example", 100),
]
for name, chain, host, today in tests:
    ok, log = verify_chain(chain, host, today)
    print("%-22s -> %s" % (name, "TRUSTED" if ok else "REJECTED"))
    for line in log:
        print("      " + line)` },
    { lang: 'bash', title: 'Inspect a real handshake and chain', check: false, code: `# Show negotiated protocol, cipher, and the certificate chain the server sent
openssl s_client -connect example.com:443 -servername example.com -tls1_3 </dev/null 2>/dev/null | head -40

# Read the leaf: subject, issuer, SANs, validity dates
openssl s_client -connect example.com:443 -servername example.com </dev/null 2>/dev/null | openssl x509 -noout -subject -issuer -ext subjectAltName -dates

# curl verbose shows ALPN (h2/h3), TLS version and verification result
curl -sv https://example.com -o /dev/null 2>&1 | grep -E "SSL connection|ALPN|subject|issuer|expire"` }
  ],
  viz: [{
    title: 'TLS 1.3 handshake ladder (client &harr; server)',
    input: '1.3',
    inputLabel: 'TLS version: 1.3 or 1.2',
    gen: function (input) {
      var v = String(input).trim();
      if (v !== '1.3' && v !== '1.2') throw new Error('Type 1.3 or 1.2');
      var steps = v === '1.3' ? [
        ['1', 'C &rarr; S', 'ClientHello', 'versions, cipher suites, SNI, ECDHE key_share (x25519), random', 'clear'],
        ['2', 'S &rarr; C', 'ServerHello', 'chosen cipher, server key_share. Both can now derive handshake keys', 'clear'],
        ['2', 'S &rarr; C', 'EncryptedExtensions + Certificate', 'ALPN choice (h2/h3), cert chain', 'encrypted'],
        ['2', 'S &rarr; C', 'CertificateVerify + Finished', 'signature over the transcript proves key ownership', 'encrypted'],
        ['3', 'C &rarr; S', 'Finished (+ first HTTP request)', 'client verified chain; app data starts after 1 RTT', 'encrypted']
      ] : [
        ['1', 'C &rarr; S', 'ClientHello', 'versions, cipher suites, random', 'clear'],
        ['1', 'S &rarr; C', 'ServerHello + Certificate + ServerKeyExchange + ServerHelloDone', 'cert chain and ECDHE params travel in the clear', 'clear'],
        ['2', 'C &rarr; S', 'ClientKeyExchange + ChangeCipherSpec + Finished', 'client share; keys derived; switch to encrypted', 'clear then enc'],
        ['2', 'S &rarr; C', 'ChangeCipherSpec + Finished', 'server confirms. Only now can HTTP flow', 'encrypted'],
        ['3', 'C &rarr; S', 'Application data', 'first request goes out after 2 full RTT', 'encrypted']
      ];
      var frames = [], shown = [];
      frames.push({ narr: 'TLS <b>' + v + '</b> starts after the TCP connection is open. Watch which messages are readable by anyone on the wire.', parts: [{ type: 'table', label: 'TLS ' + v + ' handshake', columns: ['flight', 'direction', 'message', 'what it carries', 'wire'], rows: [] }] });
      for (var i = 0; i < steps.length; i++) {
        shown.push(steps[i]);
        var hl = {}; hl[shown.length - 1] = 'cur';
        frames.push({ narr: 'Message <b>' + steps[i][2] + '</b>: ' + steps[i][3] + '.', parts: [{ type: 'table', label: 'TLS ' + v + ' handshake', columns: ['flight', 'direction', 'message', 'what it carries', 'wire'], rows: shown.map(function (r) { return r.slice(); }), hl: hl }] });
      }
      frames.push({ narr: v === '1.3' ? 'Done in <b>1 RTT</b> before the request. A resumed session can send early data in the very first flight (0-RTT) &mdash; replayable, so GET only.' : 'Done in <b>2 RTT</b> before the request. TLS 1.3 deleted a whole round trip by guessing the key-exchange group in the first message.', parts: [{ type: 'table', label: 'TLS ' + v + ' handshake', columns: ['flight', 'direction', 'message', 'what it carries', 'wire'], rows: shown, hl: { 4: 'ok' } }] });
      return frames;
    }
  }, {
    title: 'Certificate chain verification (trust ok / broken)',
    input: 'good',
    inputLabel: 'Scenario: good, expired, untrusted, wrong-name, tampered',
    gen: function (input) {
      var sc = String(input).trim().toLowerCase();
      var allowed = ['good', 'expired', 'untrusted', 'wrong-name', 'tampered'];
      if (allowed.indexOf(sc) < 0) throw new Error('Use: ' + allowed.join(', '));
      // tree level-order: 0 Root, 1 Intermediate, 3 Leaf (left-left chain)
      var arr = ['Root CA (in trust store)', 'Intermediate CA', null, 'Leaf: shop.example'];
      if (sc === 'untrusted') arr[0] = 'Unknown Root (NOT in store)';
      var frames = [];
      function f(narr, hl, tags) { frames.push({ narr: narr, parts: [{ type: 'tree', label: 'chain presented by server', arr: arr, hl: hl, tags: tags || {} }] }); }
      f('The server sends <b>leaf + intermediate</b>. The browser already has trusted roots. Goal: walk from the leaf up to a root.', { 3: 'cur' });
      f('Step 1: does the hostname <b>shop.example</b> appear in the leaf\'s SAN list? ' + (sc === 'wrong-name' ? '<span class="c-r">No, the cert is for another name.</span>' : '<span class="c-g">Yes.</span>'), { 3: sc === 'wrong-name' ? 'bad' : 'ok' }, { 3: sc === 'wrong-name' ? 'name mismatch' : 'SAN ok' });
      if (sc === 'wrong-name') { f('Stop. Name mismatch &rarr; <b>reject</b>. A valid cert for someone else proves nothing about you.', { 3: 'bad' }); return frames; }
      f('Step 2: validity dates of the leaf. ' + (sc === 'expired' ? '<span class="c-r">Expired.</span>' : '<span class="c-g">In date.</span>'), { 3: sc === 'expired' ? 'bad' : 'ok' }, { 3: sc === 'expired' ? 'expired' : 'valid dates' });
      if (sc === 'expired') { f('Stop. Expired certificate &rarr; <b>reject</b> (keys may have leaked; revocation lists are not kept forever).', { 3: 'bad' }); return frames; }
      f('Step 3: verify the leaf\'s signature using the intermediate\'s public key. ' + (sc === 'tampered' ? '<span class="c-r">Signature does not match &mdash; someone changed the leaf.</span>' : '<span class="c-g">Signature valid.</span>'), { 3: sc === 'tampered' ? 'bad' : 'ok', 1: 'cur' });
      if (sc === 'tampered') { f('Stop. Tampered certificate &rarr; <b>reject</b>.', { 3: 'bad', 1: 'cur' }); return frames; }
      f('Step 4: verify the intermediate\'s signature using the root\'s public key. <span class="c-g">Valid.</span>', { 3: 'ok', 1: 'ok', 0: 'cur' });
      if (sc === 'untrusted') { f('Step 5: is the root in my trust store? <span class="c-r">No.</span> Anyone can make a root; trust comes only from the store. <b>Reject.</b>', { 3: 'ok', 1: 'ok', 0: 'bad' }); return frames; }
      f('Step 5: root is in the trust store. <b>Chain is trusted.</b> The client now checks CertificateVerify to prove the server holds the leaf\'s private key.', { 3: 'ok', 1: 'ok', 0: 'ok' }, { 0: 'trusted' });
      return frames;
    }
  }],
  examples: [
    { title: 'ECDHE with tiny numbers (Diffie-Hellman idea)', html: `<p>Public: modulus p = 23, base g = 5. Client secret a = 6 &rarr; sends A = 5<sup>6</sup> mod 23 = <b>8</b>. Server secret b = 15 &rarr; sends B = 5<sup>15</sup> mod 23 = <b>19</b>. Client computes 19<sup>6</sup> mod 23 = <b>2</b>; server computes 8<sup>15</sup> mod 23 = <b>2</b>. Same secret, never sent. ECDHE does the same on an elliptic curve with 256-bit numbers.</p>`, code: { lang: 'python', run: true, code: `p, g = 23, 5
a, b = 6, 15
A, B = pow(g, a, p), pow(g, b, p)
print("A sent:", A, " B sent:", B)
print("client secret:", pow(B, a, p), " server secret:", pow(A, b, p))` } },
    { title: 'Why a missing intermediate breaks only some clients', html: `<p>Your server sends only the leaf. Chrome may fetch the intermediate itself (AIA fetching) and works; curl, Java and mobile apps do not, and fail. <b>Always serve the full chain (leaf + intermediates, not the root).</b></p>` },
    { title: 'Corporate TLS inspection', html: `<p>A company proxy terminates your TLS, makes a new certificate for google.com signed by the <i>company root</i> that IT installed in your trust store, and re-encrypts to Google. The chain is "valid" only because your device was told to trust that root. Certificate pinning in apps is designed to detect this.</p>` }
  ],
  deepDive: `<p><b>Key schedule (TLS 1.3).</b> The ECDHE shared secret goes through HKDF to produce separate keys for handshake traffic, client application traffic, server application traffic and the resumption secret. Every key is bound to the full transcript hash, so changing any handshake byte breaks the Finished check &mdash; this defeats downgrade attacks.</p>
  <p><b>Static RSA key exchange (TLS 1.2 option)</b> encrypted the premaster secret with the server's long-term RSA key. Record the traffic today, steal the key in five years, decrypt everything. TLS 1.3 deleted it.</p>
  <p><b>Resumption.</b> After a handshake the server gives a ticket (PSK). Next time the client sends it in ClientHello with a <code>psk_key_exchange_modes</code>; adding an ECDHE share keeps forward secrecy. <b>0-RTT</b> early data is encrypted under a key from that ticket only, so it has no forward secrecy and can be replayed; servers allow only safe, idempotent requests and may reject early data (HTTP 425 Too Early).</p>
  <p><b>Revocation is messy.</b> CRLs are big; OCSP leaks browsing and fails open. Modern practice: short-lived certificates (Let's Encrypt 90 days, moving to 47 days by 2029), <b>OCSP stapling</b> (server attaches a fresh signed "still good"), and Chrome's CRLite. <b>Certificate Transparency</b> logs make every issued certificate public so mis-issuance is detected.</p>
  <p><b>Post-quantum.</b> Key exchange is the urgent part ("harvest now, decrypt later"). Browsers and CDNs already negotiate hybrid <b>X25519MLKEM768</b> in TLS 1.3 key_share; certificate signatures migrate later. Handshakes get larger (about 1 KB more), which interacts with QUIC's initial packet size and amplification limits.</p>
  <p><b>mTLS</b> adds client certificates, the standard for service-to-service identity in meshes (SPIFFE/Istio). <b>ALPN</b> is the extension where client and server agree on h2 vs http/1.1 (or h3 via Alt-Svc) inside the handshake, with no extra round trip. <b>ECH</b> (Encrypted Client Hello) hides the SNI hostname.</p>`,
  aiEra: `<p><b>What AI changes:</b> every call from an agent to an API, MCP server or model endpoint is TLS-protected, and agents make many short-lived connections from cloud networks with strict egress proxies. Expired certs, missing intermediates and corporate-proxy roots are the classic "works on my laptop, fails in the agent sandbox" bugs. Post-quantum hybrid key exchange is also being rolled out because recorded AI traffic (prompts, data) may be valuable years later.</p>
  <p><b>Use AI as a partner:</b> paste the output of <code>openssl s_client -showcerts</code> and ask <code>Is the chain complete and in the right order? Which cert expires first?</code></p>
  <p><b>Where AI goes wrong:</b> suggests <code>verify=False</code> / <code>curl -k</code> / <code>NODE_TLS_REJECT_UNAUTHORIZED=0</code> to "fix" a cert error. That removes authentication entirely. Fix the chain or add the proper CA bundle.</p>
  <p><b>What you must own:</b> explaining each check the client does, forward secrecy, and never turning verification off in production.</p>`,
  problems: [prob({
    t: 'Verify the Chain', l: 'Medium', tags: ['tls', 'certificates', 'pki'], co: ['Cloudflare', 'Google', 'Stripe'],
    s: `<p>A client receives certificates <code>[leaf for api.shop.com, Intermediate X, Root R]</code>. Walk through, in order, every check the client must do before it trusts the connection, and say what failure each check prevents.</p>`,
    c: `Cover: hostname, dates, signatures up the chain, root in store, revocation, proof of key possession.`,
    ex: `<p>${H.c('g', 'SAN contains api.shop.com')} &rarr; ${H.c('g', 'all dates valid')} &rarr; ${H.c('g', 'leaf signed by X, X signed by R')} &rarr; ${H.c('g', 'R in trust store')} &rarr; ${H.c('g', 'not revoked')} &rarr; ${H.c('g', 'CertificateVerify OK')}.</p>`,
    bw: `<p>Weak: "check that the certificate is signed." Signed by whom? For which name? Does the server actually hold the key? A copied valid certificate would pass such a check.</p>`,
    mcq: { q: 'Which check stops an attacker who simply replays a copy of the real server\'s certificate?', options: ['Hostname match', 'Expiry check', 'CertificateVerify signature with the leaf\'s private key', 'Root in trust store'], answer: 2, explain: 'The certificate is public; only the true owner can sign the handshake transcript with the private key.' },
    h: [`<p>Hint 1: three questions: is this cert for the name I asked for, is it still valid, who vouches for it?</p>`, `<p>Hint 2: each link needs a signature check with the parent's public key, ending at a trusted root.</p>`, `<p>Hint 3: the certificate itself is public, so there must be a final proof that the peer holds the private key.</p>`],
    a: `<p>1) Hostname: the name I typed must match a SAN entry (wildcards allowed one label deep); this stops a valid cert for evil.com being used for shop.com. 2) Dates: notBefore &le; now &le; notAfter on every cert; stops use of leaked old keys. 3) Signatures: verify leaf's signature with Intermediate X's public key, and X's with R's; any edit to a cert breaks its signature. Also check issuer/subject names link and that X is allowed to sign certificates (basicConstraints CA:true, key usage). 4) Trust anchor: R must be in the local trust store; anyone can mint a root, trust only comes from the store. 5) Revocation: stapled OCSP or CRLite says the leaf has not been revoked. 6) Proof of possession: CertificateVerify, a signature over the handshake transcript made with the leaf's private key, stops an attacker presenting a copied certificate. Only after all pass does the session key get used.</p>`,
    cx: `<p>One signature verification per link: O(chain length), usually 2-3.</p>`, f: ['What if the server omits the intermediate?', 'How does certificate pinning change this?']
  })]
});

/* ================= TOPIC 4: DNS ================= */
topics.push({
  title: 'DNS Resolution in Depth: Stub, Recursive, Root, TLD, Authoritative',
  analogy: `<p>DNS is the internet's <b>phone book run like a chain of librarians</b>. You ask your local librarian (the recursive resolver) for "www.example.com". She does not know, but she knows who to ask: the head office (root) points her to the ".com" desk (TLD), which points her to example.com's own record-keeper (authoritative server), who finally has the answer. She writes it on a sticky note (cache) for as long as the note's timer (TTL) allows, so the next person asking gets an instant answer.</p>`,
  explain: `<p>Computers route by IP address, humans use names. DNS translates <code>www.example.com</code> into <code>93.184.216.34</code>.</p>
  <h4>🟢 Who is who</h4>
  <ul><li><b>Stub resolver</b>: tiny code in your OS/browser. It asks ONE question to a configured recursive resolver and trusts the answer. It has a small cache.</li>
  <li><b>Recursive resolver</b> (your ISP, 8.8.8.8, 1.1.1.1, your company): does the real hunting and has a big shared cache.</li>
  <li><b>Root servers</b> (13 names a-m, hundreds of anycast instances): know only who runs each TLD.</li>
  <li><b>TLD servers</b> (.com, .org, .in): know which name servers each domain uses (NS records + glue).</li>
  <li><b>Authoritative servers</b>: hold the real records for the domain.</li></ul>
  <h4>🟢 The walk for www.example.com (cold caches)</h4>
  <ol><li>Browser cache &rarr; OS cache &rarr; hosts file: miss.</li>
  <li>Stub &rarr; recursive: "A www.example.com?"</li>
  <li>Recursive &rarr; root: "A www.example.com?" Root: "I do not know, ask the .com servers (NS + glue IPs)".</li>
  <li>Recursive &rarr; .com TLD: "ask ns1.example.com (IP ...)".</li>
  <li>Recursive &rarr; ns1.example.com: "www is <b>93.184.216.34</b>, TTL 300".</li>
  <li>Recursive caches every step (NS for .com is cached for 2 days, so next time root is skipped) and answers the stub.</li></ol>
  <h4>🟢 Record types</h4>
  ${H.table(['Type', 'Meaning', 'Example'], [
    ['A', 'name &rarr; IPv4', 'www  A  93.184.216.34'],
    ['AAAA', 'name &rarr; IPv6', 'www  AAAA  2606:2800:220:1::1'],
    ['CNAME', 'alias to another name (cannot sit at the zone apex)', 'blog  CNAME  site.hosting.net.'],
    ['MX', 'mail servers with priority', '@  MX 10  mail.example.com.'],
    ['NS', 'which servers are authoritative', '@  NS  ns1.example.com.'],
    ['TXT', 'free text: SPF, DKIM, domain verification', '@  TXT  "v=spf1 include:_spf.google.com ~all"'],
    ['PTR / SRV / CAA / HTTPS', 'reverse lookup / service location / who may issue certs / h2-h3 hints', '']])}
  <p><b>TTL</b> = how many seconds a cache may keep the answer. Low TTL (60 s) = changes spread fast but more queries; high TTL (1 day) = fewer queries but slow to change. Failed lookups are cached too (negative caching, from the SOA).</p>`,
  clues: ['"I changed the DNS record but users still see the old site" &rarr; TTL and caches, lower TTL <i>before</i> migration', '"What happens when you type a URL?" &rarr; DNS is step 1', '"Why can&apos;t I put a CNAME on example.com (the apex)?" &rarr; apex needs SOA/NS; use ALIAS/ANAME/flattening', '"DNS-based load balancing / geo routing / failover"', '"DNS runs on UDP 53 (TCP for big answers)"', '"Who knows the IP of a .com domain&apos;s name servers?" &rarr; the TLD, via NS + glue', '"DNS outage took down half the internet" &rarr; central dependence, cache TTLs'],
  code: [
    { lang: 'python', run: true, title: 'Iterative DNS resolver with caching and TTL', code: `# A fake internet: each server answers either with the final record or a referral.
ZONES = {
    "root":            {"referral": {"com": ("tld-com", 172800), "net": ("tld-net", 172800)}},
    "tld-com":         {"referral": {"example.com": ("ns1.example.com", 172800)}},
    "tld-net":         {"referral": {"cdn.net": ("ns1.cdn.net", 172800)}},
    "ns1.example.com": {"records": {"www.example.com": ("CNAME", "edge.cdn.net", 300),
                                    "api.example.com": ("A", "93.184.216.10", 60)}},
    "ns1.cdn.net":     {"records": {"edge.cdn.net": ("A", "151.101.1.69", 20)}},
}

class Resolver:
    def __init__(self):
        self.clock = 0
        self.cache = {}         # key -> (value, expires_at)
        self.queries = 0

    def _get(self, key):
        hit = self.cache.get(key)
        if hit and hit[1] > self.clock:
            return hit[0]
        self.cache.pop(key, None)    # expired entries are dropped
        return None

    def _put(self, key, value, ttl):
        self.cache[key] = (value, self.clock + ttl)

    def ask(self, server, name):
        self.queries += 1
        print("    -> ask %-16s about %s" % (server, name))
        return ZONES[server]

    def resolve(self, name, depth=0):
        if depth > 5:
            raise RuntimeError("CNAME loop")
        cached = self._get(("A", name))
        if cached:
            print("  cache HIT  A %s = %s" % (name, cached))
            return cached
        cname = self._get(("CNAME", name))
        if cname:
            print("  cache HIT  CNAME %s -> %s" % (name, cname))
            return self.resolve(cname, depth + 1)
        # Start at the deepest cached delegation we know (skip root if we can)
        server = "root"
        labels = name.split(".")
        for i in range(len(labels) - 1):          # try example.com, then com
            zone = ".".join(labels[i:])
            ns = self._get(("NS", zone))
            if ns:
                server = ns
                print("  cache HIT  NS %s = %s (skipping higher servers)" % (zone, ns))
                break
        while True:
            z = self.ask(server, name)
            if "records" in z and name in z["records"]:
                rtype, value, ttl = z["records"][name]
                self._put((rtype, name), value, ttl)
                print("       answer %s %s -> %s (ttl %ds)" % (rtype, name, value, ttl))
                return value if rtype == "A" else self.resolve(value, depth + 1)
            if "referral" in z:
                for zone, (ns, ttl) in z["referral"].items():
                    if name == zone or name.endswith("." + zone):
                        self._put(("NS", zone), ns, ttl)
                        print("       referral: %s is handled by %s" % (zone, ns))
                        server = ns
                        break
                else:
                    return "NXDOMAIN"
                continue
            return "NXDOMAIN"

r = Resolver()
for t, name in [(0, "www.example.com"), (5, "www.example.com"), (30, "www.example.com"),
                (400, "www.example.com"), (400, "api.example.com"), (0, "nope.example.com")]:
    r.clock = t
    print("t=%ds  resolve %s" % (t, name))
    print("  result:", r.resolve(name))
print("total queries sent upstream:", r.queries)` },
    { lang: 'bash', title: 'Trace a lookup yourself', check: false, code: `# Walk the hierarchy from the root, printing every referral
dig +trace www.example.com

# Ask a specific resolver; the number before IN is the remaining TTL
dig @1.1.1.1 www.example.com A
dig example.com MX +short
dig example.com NS +short
dig example.com TXT +short

# Run it twice: the TTL counts down because the answer came from cache
dig @8.8.8.8 example.com A | grep -A1 "ANSWER SECTION"` }
  ],
  viz: [{
    title: 'DNS resolution hops (cold cache)',
    input: 'www.example.com',
    inputLabel: 'Hostname (name.domain.tld)',
    gen: function (input) {
      var name = String(input).trim().toLowerCase();
      var parts = name.split('.');
      if (parts.length < 2 || parts.some(function (p) { return !p; })) throw new Error('Enter something like www.example.com');
      var tld = parts[parts.length - 1], dom = parts.slice(-2).join('.');
      var nodes = [
        { id: 'B', label: 'Browser + OS (stub)', x: 12, y: 30, shape: 'box', w: 20 },
        { id: 'R', label: 'Recursive resolver', x: 42, y: 30, shape: 'box', w: 22 },
        { id: 'RT', label: 'Root server', x: 82, y: 6, shape: 'box', w: 18 },
        { id: 'TLD', label: '.' + tld + ' TLD server', x: 82, y: 30, shape: 'box', w: 20 },
        { id: 'AU', label: 'ns1.' + dom + ' (authoritative)', x: 78, y: 54, shape: 'box', w: 28 }
      ];
      var edges = [['B', 'R', '1 query'], ['R', 'RT', '2'], ['R', 'TLD', '4'], ['R', 'AU', '6']];
      var frames = [];
      function f(narr, hl, ehl, map) {
        frames.push({ narr: narr, parts: [{ type: 'graph', label: 'resolution path', directed: true, height: 62, nodes: nodes, edges: edges, hl: hl, ehl: ehl }, { type: 'map', label: 'recursive resolver cache', entries: map.length ? map : [['(empty)', '']], hl: map.length ? { [map[map.length - 1][0]]: 'ok' } : {} }] });
      }
      var cache = [];
      f('You type <b>' + name + '</b>. First the browser cache, then the OS cache, then the hosts file. All empty (cold), so the stub asks the recursive resolver.', { B: 'cur' }, {}, cache);
      f('Step 1: stub &rarr; recursive: "<b>A ' + name + '</b>?" One packet to UDP port 53.', { B: 'cur', R: 'cur' }, { 'B-R': 'cur' }, cache);
      f('Step 2: resolver has no cached delegation, so it asks a <b>root server</b> (IPs are built into the resolver).', { R: 'cur', RT: 'cur' }, { 'R-RT': 'cur' }, cache);
      cache.push(['NS ' + tld, 'TLD servers, ttl 2d']);
      f('Step 3: root says "I do not know the host, but <b>.' + tld + '</b> is run by these servers" (a <i>referral</i>, with glue IPs). Resolver caches it for 2 days.', { R: 'ok', RT: 'ok' }, { 'R-RT': 'ok' }, cache);
      f('Step 4: resolver asks the <b>.' + tld + ' TLD server</b> the same question.', { R: 'cur', TLD: 'cur' }, { 'R-RT': 'ok', 'R-TLD': 'cur' }, cache);
      cache.push(['NS ' + dom, 'ns1.' + dom + ', ttl 2d']);
      f('Step 5: TLD replies with another referral: <b>' + dom + '</b> is handled by ns1.' + dom + '. Cached.', { R: 'ok', TLD: 'ok' }, { 'R-TLD': 'ok' }, cache);
      f('Step 6: resolver asks the <b>authoritative</b> server, the only one allowed to give the final answer.', { R: 'cur', AU: 'cur' }, { 'R-RT': 'ok', 'R-TLD': 'ok', 'R-AU': 'cur' }, cache);
      cache.push(['A ' + name, '93.184.216.34, ttl 300s']);
      f('Step 7: authoritative says <b>A 93.184.216.34, TTL 300</b>. Resolver caches it for 300 s.', { R: 'ok', AU: 'sel' }, { 'R-AU': 'ok' }, cache);
      f('Step 8: resolver returns the answer to the stub, which also caches it (OS and browser). Next lookup within 300 s is answered locally: <span class="c-g">0 network hops</span>.', { B: 'sel', R: 'ok' }, { 'B-R': 'ok' }, cache);
      return frames;
    }
  }, {
    title: 'Cache timeline: TTL expiry',
    input: '300',
    inputLabel: 'TTL in seconds (10-3600)',
    gen: function (input) {
      var ttl = ints(input, 300, 10, 3600), frames = [];
      var times = [0, Math.floor(ttl / 3), ttl - 1, ttl, ttl + 5];
      var cached = false, expires = 0, hits = 0, miss = 0;
      times.forEach(function (t, i) {
        var hit = cached && t < expires;
        if (hit) hits++; else { miss++; cached = true; expires = t + ttl; }
        frames.push({ narr: 'At <b>t = ' + t + ' s</b> the same name is requested again. ' + (hit ? '<span class="c-g">Cache HIT</span> (' + (expires - t) + ' s of life left): answered locally.' : '<span class="c-r">MISS</span> (' + (i === 0 ? 'nothing cached yet' : 'entry expired at ' + (expires - ttl) + '+' + ttl) + '): full walk, new expiry at t = ' + expires + '.'), parts: [{ type: 'map', label: 'cache entry for A www', entries: [['value', '93.184.216.34'], ['expires at', expires + ' s'], ['remaining TTL', Math.max(0, expires - t) + ' s']], hl: { value: hit ? 'ok' : 'bad' } }, { type: 'vars', vals: { hits: hits, misses: miss, time: t }, hl: { hits: 'ok', misses: 'bad' } }] });
      });
      return frames;
    }
  }],
  examples: [
    { title: 'Why does www.example.com take longer the first time?', html: `<p>Cold: stub &rarr; resolver (1 RTT to the nearby resolver) plus up to 3 more round trips from the resolver to root, TLD and authoritative servers. Typical total 50-200 ms. Warm: if the resolver already has <code>NS example.com</code> cached it skips root and TLD (1 upstream query); if it has the final A record it answers immediately.</p>` },
    { title: 'Zero-downtime migration with TTL', html: `<p>Your site is moving from IP A to IP B, TTL is 24 h. <b>Day -2</b>: lower TTL to 60 s (wait one old TTL so old caches expire). <b>Day 0</b>: switch the record to B; within 60 s everyone follows. <b>After</b>: raise TTL again. If you switch first and lower TTL after, some users stay on A for up to a day.</p>` },
    { title: 'CNAME chain and the apex problem', html: `<p><code>www.shop.com CNAME shop.myplatform.io</code> means "ask for that name instead". It costs an extra lookup (cached separately). A CNAME cannot coexist with other records on the same name, but the zone apex <code>shop.com</code> must hold SOA and NS, so you cannot CNAME the apex. Providers offer ALIAS/ANAME or CNAME-flattening: they resolve the target themselves and return plain A records.</p>`, code: { lang: 'text', code: `shop.com.        3600 IN SOA  ns1.dns.net. admin.shop.com. ...
shop.com.        3600 IN NS   ns1.dns.net.
shop.com.        300  IN A    203.0.113.7        ; apex: A only, no CNAME
www.shop.com.    300  IN CNAME shop.myplatform.io.
shop.com.        3600 IN MX 10 mail.shop.com.
shop.com.        3600 IN TXT  "v=spf1 include:_spf.example.net -all"` } }
  ],
  deepDive: `<p><b>Transport.</b> DNS uses UDP/53 for small queries, switching to TCP when the answer is truncated (TC bit) or for zone transfers. EDNS(0) raises the UDP size to ~1232 bytes to avoid fragmentation. <b>DoT</b> (TLS, port 853) and <b>DoH</b> (HTTPS) encrypt the stub-to-resolver hop so your ISP and Wi-Fi cannot read your lookups; the resolver still sees them.</p>
  <p><b>Security.</b> Classic DNS is unauthenticated, so <b>cache poisoning</b> (Kaminsky 2008) can plant a fake record: randomised source ports and query IDs raise the cost, <b>DNSSEC</b> makes records signed (RRSIG, DNSKEY, DS chain from the root) so a resolver can verify authenticity but not privacy. Other abuse: DNS amplification DDoS (small spoofed query, big answer), dangling CNAMEs enabling subdomain takeover, DNS tunnelling for exfiltration.</p>
  <p><b>Negative caching.</b> NXDOMAIN answers are cached for the SOA minimum TTL, so creating a record right after a failed lookup may still appear missing for minutes.</p>
  <p><b>Load balancing and CDNs.</b> Authoritative servers can return different answers by client region (GeoDNS), by health (failover), or several A records (round-robin; clients try them in order and use Happy Eyeballs). Anycast puts the same IP at many locations so root servers and 1.1.1.1 are reached at the nearest site. EDNS Client Subnet lets a CDN see a hint of the user's network through a public resolver. Low-TTL tricks add lookups: with 20 s TTL the resolver goes upstream often.</p>
  <p><b>Practical gotchas.</b> JVM caches DNS forever by default in some security-manager configurations (<code>networkaddress.cache.ttl</code>); long-lived processes then miss failovers. Kubernetes uses CoreDNS with <code>ndots:5</code>, causing several wasted search-domain lookups per external name; use trailing dots or lower ndots. Resolvers may "serve stale" when authoritative servers are down (RFC 8767).</p>`,
  aiEra: `<p><b>What AI changes:</b> agent platforms start thousands of short-lived sandboxes, each making fresh DNS lookups to model APIs, tool servers and package registries. A flaky or slow resolver turns into mysterious "agent timed out" failures; egress allow-lists are often DNS-name based, so a CNAME change at a SaaS vendor can silently break an allowed destination. DNS is also a data-exfiltration path agents must be fenced from.</p>
  <p><b>Use AI as a partner:</b> paste <code>dig +trace</code> output and ask <code>Which server gave each referral and where was the delay or failure?</code> Ask it to draft a TTL-lowering migration checklist, then review it.</p>
  <p><b>Where AI goes wrong:</b> it says DNS "propagation takes 24-48 hours" as if updates were pushed. In reality caches simply expire; the wait is bounded by the old TTL. It also hallucinates record syntax (CNAME at apex).</p>
  <p><b>What you must own:</b> explaining the hierarchy, what each layer caches, and TTL planning.</p>`,
  problems: [prob({
    t: 'Trace a DNS Lookup with Caches', l: 'Medium', tags: ['dns', 'caching'], co: ['Amazon', 'Cloudflare', 'Akamai'],
    s: `<p>A resolver has an empty cache. At t = 0 a client asks for <code>app.shop.com</code>. At t = 100 s another client asks again. At t = 400 s a third asks. The A record has TTL 300 s; the NS records for shop.com and .com have TTL 2 days. How many queries does the resolver send upstream at each of the three times, and to whom?</p>`,
    c: `Count queries from the resolver to other servers, not client queries.`,
    ex: `<p>t=0: ${H.c('r', '3 queries (root, .com, authoritative)')}; t=100: ${H.c('g', '0 (A cached)')}; t=400: ${H.c('y', '1 (A expired, NS for shop.com still cached, go straight to authoritative)')}.</p>`,
    bw: `<p>Weak: "it always asks root, TLD, authoritative." Caching of delegations (NS) is why root servers are hit so rarely.</p>`,
    mcq: { q: 'At t = 400 s, what does the resolver do first?', options: ['Ask a root server', 'Ask the .com TLD server', 'Ask shop.com&apos;s authoritative server directly', 'Return the stale A record'], answer: 2, explain: 'The A record expired (300 s) but the cached NS for shop.com is valid for 2 days, so it skips root and TLD.' },
    h: [`<p>Hint 1: caches store answers AND delegations (NS records).</p>`, `<p>Hint 2: each record has its own expiry clock.</p>`, `<p>Hint 3: at each time, find the deepest unexpired entry and start from there.</p>`],
    a: `<p>At t = 0 nothing is cached: the resolver asks a root server (referral to .com), then a .com TLD server (referral to shop.com's name server), then the authoritative server which returns the A record with TTL 300; it caches the .com NS (2 d), the shop.com NS (2 d) and the A record (expires at 300 s). That is 3 upstream queries. At t = 100 s the A record is still valid so the answer comes straight from cache with 0 upstream queries. At t = 400 s the A record expired at t = 300 but the NS for shop.com is still valid, so the resolver skips root and TLD and asks the authoritative server once: 1 query. Lesson: delegation records have long TTLs, so root and TLD servers see very little traffic and the authoritative server sees only genuine refreshes. A lower A-record TTL means more refreshes against the authoritative servers.</p>`,
    cx: `<p>At most 3 upstream queries per cold lookup; typically 0 or 1.</p>`, f: ['What changes if the app name is a CNAME to another domain?', 'What if the authoritative server is down at t = 400 and serve-stale is enabled?']
  })]
});

/* ================= TOPIC 5: WebSockets, SSE, long polling ================= */
topics.push({
  title: 'WebSockets vs SSE vs Long Polling',
  analogy: `<p><b>Polling</b> is a kid in the back seat asking "are we there yet?" every minute. <b>Long polling</b> is asking once and the driver replying only when something changes, then you ask again. <b>SSE</b> is a radio: the station broadcasts to you, you only listen. <b>WebSocket</b> is a phone call: both sides can talk at any time on the same open line.</p>`,
  explain: `<p>Plain HTTP is request &rarr; response: the server cannot start talking. For chat, live scores or notifications we need "push". Four ways:</p>
  ${H.table(['Technique', 'How', 'Direction', 'Good for', 'Cost'], [
    ['Short polling', 'client asks every N seconds', 'client &rarr; server', 'rarely changing data, simple', 'many empty requests, delay up to N s'],
    ['Long polling', 'request is held open until data or timeout, then repeated', 'server &rarr; client', 'push where nothing else works', 'a request per event, headers each time'],
    ['SSE (Server-Sent Events)', 'one long HTTP response with <code>text/event-stream</code>; browser <code>EventSource</code> auto-reconnects', 'server &rarr; client only', 'notifications, live feeds, LLM token streaming', 'text only, ~6 connections limit on HTTP/1.1'],
    ['WebSocket', 'HTTP Upgrade, then a framed two-way protocol over the same TCP connection', 'both ways, any time', 'chat, games, collaborative editing', 'stateful connections, needs own reconnect/heartbeat logic']])}
  <h4>🟢 The WebSocket upgrade handshake</h4>
  <p>It starts as a normal HTTP/1.1 request with a random <code>Sec-WebSocket-Key</code>. The server proves it understands WebSocket by returning <code>Sec-WebSocket-Accept = base64( SHA-1( key + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11" ) )</code> and status <b>101 Switching Protocols</b>. After that the same TCP connection speaks <b>frames</b>, not HTTP.</p>
  <h4>🟢 Frames</h4>
  <p>Each frame: FIN bit, opcode (text 0x1, binary 0x2, close 0x8, ping 0x9, pong 0xA), mask bit, payload length, mask key (client &rarr; server frames MUST be masked), payload. Messages can be split across frames (fragmentation). Ping/pong keeps the connection alive through proxies and detects dead peers.</p>
  <h4>🟢 Choosing</h4>
  <ul><li><b>Chat</b>: WebSocket (two-way, low latency, typing indicators).</li>
  <li><b>Notifications / news feed / build logs / LLM streaming</b>: SSE (one-way, simpler, auto-reconnect with <code>Last-Event-ID</code>, works over plain HTTP/2).</li>
  <li><b>Stock ticker</b>: WebSocket or SSE for the push; batch/throttle to a few updates per second per user, and the client rarely sends anything.</li>
  <li><b>Dashboard that updates every minute</b>: just poll.</li></ul>`,
  clues: ['"real-time", "push", "server initiates"', '"chat / multiplayer / collaborative editing" &rarr; bidirectional &rarr; WebSocket', '"notifications, one-way updates, must work through corporate proxies" &rarr; SSE', '"millions of idle connections" &rarr; connection state, memory per socket, sticky routing', '"reconnect and resume missed messages" &rarr; Last-Event-ID / sequence numbers', '"load balancer kills idle connections after 60 s" &rarr; heartbeats'],
  code: [
    { lang: 'python', run: true, title: 'Sec-WebSocket-Accept and a frame encoder/decoder', code: `import base64, hashlib, struct

GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11"   # fixed constant from RFC 6455

def accept_key(client_key):
    """base64( sha1( key + GUID ) ), exactly what the server must reply with."""
    digest = hashlib.sha1((client_key + GUID).encode()).digest()
    return base64.b64encode(digest).decode()

# The example from the RFC: this MUST print s3pPLMBiTxaQ9kYGzzhZRbK+xOo=
key = "dGhlIHNhbXBsZSBub25jZQ=="
print("Sec-WebSocket-Key   :", key)
print("Sec-WebSocket-Accept:", accept_key(key))
assert accept_key(key) == "s3pPLMBiTxaQ9kYGzzhZRbK+xOo="

def encode_frame(text, mask_key=None):
    """One unfragmented TEXT frame. Clients must pass a 4-byte mask_key."""
    payload = text.encode()
    b0 = 0x80 | 0x1                      # FIN=1, opcode=1 (text)
    n = len(payload)
    mask_bit = 0x80 if mask_key else 0
    if n < 126:
        header = struct.pack("!BB", b0, mask_bit | n)
    elif n < 65536:
        header = struct.pack("!BBH", b0, mask_bit | 126, n)
    else:
        header = struct.pack("!BBQ", b0, mask_bit | 127, n)
    if mask_key:
        payload = bytes(c ^ mask_key[i % 4] for i, c in enumerate(payload))
        header += bytes(mask_key)
    return header + payload

def decode_frame(data):
    b0, b1 = data[0], data[1]
    fin, opcode = bool(b0 & 0x80), b0 & 0x0F
    masked, n, pos = bool(b1 & 0x80), b1 & 0x7F, 2
    if n == 126:
        n, pos = struct.unpack("!H", data[2:4])[0], 4
    elif n == 127:
        n, pos = struct.unpack("!Q", data[2:10])[0], 10
    mask = data[pos:pos + 4] if masked else None
    pos += 4 if masked else 0
    payload = data[pos:pos + n]
    if masked:
        payload = bytes(c ^ mask[i % 4] for i, c in enumerate(payload))
    return fin, opcode, masked, payload.decode()

client_frame = encode_frame("Hello", mask_key=[0x37, 0xFA, 0x21, 0x3D])
print("client->server bytes:", client_frame.hex())      # RFC example: 818537fa213d7f9f4d5158
print("decoded:", decode_frame(client_frame))
server_frame = encode_frame("Hello")                    # servers never mask
print("server->client bytes:", server_frame.hex())      # 810548656c6c6f
print("decoded:", decode_frame(server_frame))` },
    { lang: 'http', title: 'The upgrade, as raw HTTP', check: false, code: `GET /chat HTTP/1.1
Host: example.com
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==
Sec-WebSocket-Version: 13

HTTP/1.1 101 Switching Protocols
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Accept: s3pPLMBiTxaQ9kYGzzhZRbK+xOo=` },
    { lang: 'http', title: 'SSE: one never-ending response', check: false, code: `GET /notifications HTTP/1.1
Accept: text/event-stream
Last-Event-ID: 41

HTTP/1.1 200 OK
Content-Type: text/event-stream
Cache-Control: no-cache

id: 42
event: order_shipped
data: {"orderId": 981}

: heartbeat comment keeps proxies from closing the connection

id: 43
data: second event` }
  ],
  viz: {
    title: 'WebSocket upgrade, then two-way frames',
    input: '2',
    inputLabel: 'Chat messages each side sends (1-3)',
    gen: function (input) {
      var n = ints(input, 2, 1, 3), frames = [], q = [];
      function f(narr, hl) { frames.push({ narr: narr, parts: [{ type: 'queue', label: 'what is on the wire (oldest first)', items: q.slice(), hl: hl || {}, frontLabel: 'first', backLabel: 'latest' }] }); }
      f('One TCP/TLS connection is open to the server. Nothing has been sent yet.', {});
      q.push('HTTP GET /chat + Upgrade: websocket + Key');
      f('Client sends an ordinary HTTP request asking to <b>upgrade</b>, with a random <code>Sec-WebSocket-Key</code>.', { 0: 'cur' });
      q.push('HTTP 101 Switching Protocols + Accept');
      f('Server answers <b>101</b> with <code>Sec-WebSocket-Accept = base64(sha1(key + GUID))</code>. HTTP is over; the same socket now carries frames.', { 1: 'ok' });
      for (var i = 1; i <= n; i++) {
        q.push('C&rarr;S TEXT(masked) "hi ' + i + '"');
        f('Client frame ' + i + ': <b>text, masked</b> (client frames must be masked to protect proxies from cache-poisoning tricks).', (function () { var o = {}; o[q.length - 1] = 'cur'; return o; })());
        q.push('S&rarr;C TEXT "reply ' + i + '"');
        f('The server pushes a frame <b>without being asked</b>. Both sides can speak at any time; no new request, no headers.', (function () { var o = {}; o[q.length - 1] = 'ok'; return o; })());
      }
      q.push('S&rarr;C PING');
      f('Server sends <b>PING</b> every ~30 s so idle-timeouts on load balancers do not kill the connection.', (function () { var o = {}; o[q.length - 1] = 'sel'; return o; })());
      q.push('C&rarr;S PONG');
      f('Client must answer with <b>PONG</b>. No answer = dead peer, close and reconnect.', (function () { var o = {}; o[q.length - 1] = 'sel'; return o; })());
      q.push('C&rarr;S CLOSE 1000');
      f('Either side sends <b>CLOSE</b> (code 1000 = normal). The other echoes it, then TCP closes.', (function () { var o = {}; o[q.length - 1] = 'bad'; return o; })());
      return frames;
    }
  },
  examples: [
    { title: 'Chat app: WebSocket design points', html: `<p>Each user holds one WebSocket to a gateway node. A message goes to the gateway, onto a pub/sub bus (Redis/Kafka), and the gateways holding the recipient connections deliver it. You need: heartbeats, reconnect with exponential backoff + jitter, message IDs so the client can ask "give me everything after id 981", and auth on connect (token in first message or cookie, not a long-lived URL).</p>` },
    { title: 'Notifications: why SSE wins', html: `<p>Notifications flow only server &rarr; client. SSE is plain HTTP so it works with existing auth, cookies, CDNs and HTTP/2 multiplexing (many streams on one connection removes the 6-connection limit). <code>EventSource</code> reconnects automatically and sends <code>Last-Event-ID</code> so the server can replay missed events. Less code than WebSockets.</p>`, code: { lang: 'js', check: false, code: `const es = new EventSource('/notifications');
es.addEventListener('order_shipped', (e) => console.log(JSON.parse(e.data)));
es.onerror = () => console.log('browser will reconnect automatically');` } },
    { title: 'Stock ticker: push, but throttle', html: `<p>Prices change thousands of times per second but a human eye and a phone screen handle ~10 updates per second. Use WebSocket (or SSE), subscribe per symbol, <b>conflate</b> updates (send only the latest price per symbol every 100 ms), and drop slow consumers or let them skip to latest rather than queue unboundedly (back-pressure). Send trade orders over normal HTTPS POST for auditability.</p>` }
  ],
  deepDive: `<p><b>WebSockets over HTTP/2 and 3.</b> RFC 8441 (h2) and RFC 9220 (h3) carry WebSocket as one stream using extended CONNECT, so many sockets share a connection. In practice most sites still use HTTP/1.1 upgrade, and proxies/CDNs must support it.</p>
  <p><b>Scaling cost.</b> Each connection is a file descriptor plus buffers (tens of KB); one tuned box holds hundreds of thousands to a million idle connections (epoll/io_uring, ulimit, ephemeral ports on the load balancer side). Deploys disconnect everybody, so clients must reconnect with <b>jittered backoff</b> to avoid a thundering herd. Load balancers need long idle timeouts or heartbeats, and connection draining on deploy.</p>
  <p><b>Back-pressure.</b> A browser WebSocket has <code>bufferedAmount</code>; servers must bound per-connection queues. Without it, one slow client eats memory. WebSocket has no built-in delivery guarantee beyond TCP: after a drop, messages in flight are lost, so add sequence numbers and an ack/replay design.</p>
  <p><b>Security.</b> Check the <code>Origin</code> header on upgrade (WebSockets are not covered by CORS, so Cross-Site WebSocket Hijacking is real). Use wss:// always. Authenticate during the handshake or first message; revalidate long-lived sessions.</p>
  <p><b>Alternatives.</b> WebTransport (over HTTP/3) offers streams plus unreliable datagrams for games; gRPC streaming is bidirectional over HTTP/2 for service-to-service; MQTT is common for IoT.</p>`,
  aiEra: `<p><b>What AI changes:</b> LLM chat UIs stream tokens with <b>SSE</b> (<code>text/event-stream</code>, <code>data: {...}</code> lines, a final <code>[DONE]</code>) or fetch streaming; voice agents and realtime APIs use <b>WebSockets or WebRTC</b> because audio goes both ways. Agent platforms push tool progress to the browser the same way. Long streams make idle-timeout, proxy buffering and reconnection bugs very visible.</p>
  <p><b>Use AI as a partner:</b> ask it to generate a reconnect-with-backoff client and a heartbeat design, then test the failure paths (kill the server mid-stream).</p>
  <p><b>Where AI goes wrong:</b> it picks WebSocket for everything, forgets proxy buffering (<code>X-Accel-Buffering: no</code>) for SSE, forgets that client frames must be masked, and ignores resuming after reconnect.</p>
  <p><b>What you must own:</b> the choice rationale (direction, scale, proxies, resume) and the failure semantics.</p>`,
  problems: [prob({
    t: 'Pick the Push Technique', l: 'Easy', tags: ['websocket', 'sse', 'polling', 'design'], co: ['Slack', 'Robinhood', 'Uber'],
    s: `<p>For each product pick WebSocket, SSE, long polling or plain polling, with one reason: (a) a group chat app, (b) a "your order shipped" notification bell, (c) a live stock ticker on a trading page, (d) a weather widget refreshed every 15 minutes.</p>`,
    c: `One-line justification each; mention a risk or caveat for at least two.`,
    ex: `<p>(a) ${H.c('g', 'WebSocket')} two-way &nbsp; (b) ${H.c('b', 'SSE')} one-way, auto-reconnect &nbsp; (c) ${H.c('y', 'WebSocket or SSE with throttling')} &nbsp; (d) ${H.c('m', 'plain polling')}.</p>`,
    bw: `<p>Weak: "use WebSockets for everything, they are real-time." That ignores connection cost, proxies and the fact that most of these are one-way.</p>`,
    mcq: { q: 'Which gives automatic reconnect and event replay via Last-Event-ID built in?', options: ['WebSocket', 'SSE (EventSource)', 'Short polling', 'Raw TCP'], answer: 1, explain: 'EventSource reconnects automatically and sends Last-Event-ID so the server can resume.' },
    h: [`<p>Hint 1: does the client ever need to send data on the same channel?</p>`, `<p>Hint 2: how often does data change?</p>`, `<p>Hint 3: think about proxies, scale and how you recover missed messages.</p>`],
    a: `<p>(a) Group chat: WebSocket. Messages flow both ways with low latency, typing indicators and presence; add heartbeats, message IDs and a resume-from-id API for reconnects. (b) Notification bell: SSE. Strictly server-to-client, plain HTTP so it passes proxies and uses existing cookies, auto-reconnect with Last-Event-ID is free. Caveat: on HTTP/1.1 browsers allow ~6 connections per host, so use HTTP/2. (c) Stock ticker: WebSocket or SSE for pushing prices; the real design work is conflating updates to the latest price every ~100 ms per symbol and dropping or skipping slow clients to avoid unbounded queues; place orders via ordinary HTTPS POST. (d) Weather widget: simple polling or even just cache headers; holding a connection for data that changes every 15 minutes wastes server resources, and long-lived connections complicate deploys.</p>`,
    cx: `<p>Design judgement, no code.</p>`, f: ['How would you scale the chat to 5 million concurrent users?', 'What if users are behind a proxy that buffers streaming responses?']
  })]
});

/* ================= TOPIC 6: what happens when you type a URL ================= */
topics.push({
  title: 'What Happens When You Type a URL (End to End)',
  analogy: `<p>Ordering a parcel to visit a shop: look the shop's <b>address</b> up in the phone book (DNS), <b>phone</b> the shop and confirm they pick up (TCP), agree on a <b>secret code word</b> and check their ID (TLS), <b>place the order</b> (HTTP), then <b>unpack and assemble</b> the goods on your table (browser rendering). Each stage can be skipped if you already did it recently (caches, keep-alive, resumed sessions).</p>`,
  explain: `<p>This is the most-asked networks interview question. A great answer is <b>ordered, layered and mentions caches</b>. Say it in these stages:</p>
  <ol>
  <li><b>Parse the input</b>: is it a URL or a search? Add <code>https://</code> (HSTS list or HTTPS-first upgrade). Check browser cache for a fresh copy (<code>Cache-Control</code>), service worker, and the HSTS preload list.</li>
  <li><b>DNS</b>: browser cache &rarr; OS cache/hosts &rarr; stub asks recursive resolver &rarr; root &rarr; TLD &rarr; authoritative; result cached with TTL. Possibly an HTTPS/SVCB record hints h2/h3.</li>
  <li><b>Routing to the server</b>: the OS decides "same subnet or via default gateway"; <b>ARP</b> finds the gateway's MAC; packets hop through routers (BGP between networks); NAT at your router rewrites the private source address; the CDN/anycast address lands you at the nearest edge.</li>
  <li><b>TCP</b>: SYN, SYN-ACK, ACK (1 RTT). (For HTTP/3: QUIC handshake over UDP instead.)</li>
  <li><b>TLS</b>: ClientHello (SNI, ALPN, key share) &rarr; ServerHello, certificate, Finished; client validates the chain; keys derived; ALPN picks h2.</li>
  <li><b>HTTP request</b>: <code>GET / HTTP/2</code> with Host, cookies, Accept-Encoding. A load balancer / reverse proxy picks a backend; app server may hit cache and database; response 200 with HTML (or 301 redirect, which restarts at DNS if the host changes).</li>
  <li><b>Browser render</b>: parse HTML &rarr; DOM, CSS &rarr; CSSOM, build render tree, layout, paint, composite. Scripts may block parsing; images, CSS, JS each trigger more requests (multiplexed on the same h2 connection). First paint and load events fire.</li></ol>
  ${H.table(['Stage', 'Cost (cold)', 'Skipped when'], [
    ['DNS', '1-4 RTT', 'cached (TTL)'],
    ['TCP', '1 RTT', 'keep-alive connection reused'],
    ['TLS 1.3', '1 RTT', 'connection reused / 0-RTT resumption'],
    ['HTTP request', '1 RTT + server time', 'fresh browser cache / service worker'],
    ['Render', 'CPU time', 'cached subresources']])}`,
  clues: ['"What happens when you type google.com and press Enter?"', '"Walk me through the life of a request"', '"Where can caching occur?" &rarr; browser, OS, resolver, CDN, reverse proxy, app, DB', '"Which protocols are involved?" &rarr; DNS, ARP, IP, TCP/QUIC, TLS, HTTP', '"Why is the first visit slower than the second?"', '"What changes for HTTPS vs HTTP, or for a site behind a CDN?"'],
  code: [
    { lang: 'bash', title: 'Time every stage with curl', check: false, code: `# Each number is cumulative seconds since the start; subtract neighbours to get a stage
curl -s -o /dev/null https://example.com -w \\
"dns:      %{time_namelookup}\\nconnect:  %{time_connect}\\ntls done: %{time_appconnect}\\nfirst byte: %{time_starttransfer}\\ntotal:    %{time_total}\\nhttp:     %{http_version}\\nip:       %{remote_ip}\\n"` },
    { lang: 'python', run: true, title: 'Simulated page-load timeline (no real network)', code: `# Adds up the stages of a page load for a given RTT and cache state.
def page_load(rtt_ms, dns_cached=False, conn_warm=False, h3=False, tls13=True, server_ms=40, render_ms=120):
    t, log = 0, []
    def step(name, ms):
        nonlocal t
        t += ms
        log.append((name, ms, t))
    if not dns_cached:
        step("DNS (resolver walk, cold)", 30 + 2 * rtt_ms // 3)   # nearby resolver + a few upstream hops
    else:
        step("DNS (cached)", 0)
    if not conn_warm:
        if h3:
            step("QUIC handshake (transport+TLS1.3)", rtt_ms)
        else:
            step("TCP handshake", rtt_ms)
            step("TLS handshake", rtt_ms if tls13 else 2 * rtt_ms)
    else:
        step("connection reused (no handshakes)", 0)
    step("HTTP request -> first byte", rtt_ms + server_ms)
    step("HTML download + parse + render", render_ms)
    return log

def report(title, **kw):
    log = page_load(**kw)
    print(title)
    for name, ms, total in log:
        print("   %-38s +%4d ms   (t=%d)" % (name, ms, total))
    print()

report("First ever visit, HTTP/2 + TLS1.3, 100 ms RTT", rtt_ms=100)
report("Same, TLS 1.2", rtt_ms=100, tls13=False)
report("HTTP/3", rtt_ms=100, h3=True)
report("Second visit: DNS cached + warm connection", rtt_ms=100, dns_cached=True, conn_warm=True)` }
  ],
  viz: [{
    title: 'The URL journey (current step highlighted)',
    input: 'https://www.google.com',
    inputLabel: 'URL',
    gen: function (input) {
      var u = String(input).trim();
      var m = /^(https?):\/\/([^\/:\s]+)(\/\S*)?$/i.exec(u);
      if (!m) throw new Error('Enter a URL like https://www.google.com');
      var host = m[2], secure = m[1].toLowerCase() === 'https';
      var steps = [
        ['1. Parse URL + check caches (browser, HSTS' + (secure ? '' : ', upgrade to https?') + ')', 'Browser decides: URL or search? Fresh cached copy? HSTS list says use HTTPS.'],
        ['2. DNS lookup for ' + host, 'stub &rarr; recursive &rarr; root &rarr; TLD &rarr; authoritative. Answer: an IP, cached for its TTL.'],
        ['3. Route to IP (ARP, gateway, NAT, BGP, anycast)', 'Packet leaves via the default gateway, your router NATs the source, ISPs forward by BGP routes to the nearest edge.'],
        ['4. TCP 3-way handshake (or QUIC)', 'SYN, SYN-ACK, ACK. 1 RTT.']
      ];
      if (secure) steps.push(['5. TLS handshake', 'ClientHello (SNI, ALPN), ServerHello, certificate chain verified, keys agreed. 1 RTT in TLS 1.3.']);
      steps.push([(secure ? '6' : '5') + '. HTTP request / response', 'GET / with Host and cookies, passes CDN, load balancer, app server, cache or DB; 200 + HTML comes back (or 301 and we restart).']);
      steps.push([(secure ? '7' : '6') + '. Render: DOM, CSSOM, layout, paint', 'Parse HTML, fetch CSS/JS/images on the same connection, build render tree, lay out, paint pixels.']);
      var frames = [];
      for (var i = 0; i <= steps.length; i++) {
        var items = steps.map(function (s) { return s[0]; }), hl = {};
        for (var j = 0; j < steps.length; j++) hl[j] = j < i ? 'done' : (j === i ? 'cur' : '');
        if (i === steps.length) { for (var k = 0; k < steps.length; k++) hl[k] = 'ok'; }
        frames.push({ narr: i === steps.length ? 'Page is on screen. <b>Every stage is skippable by caching</b>: DNS (TTL), connection (keep-alive), TLS (resumption), content (HTTP cache/CDN).' : '<b>' + steps[i][0] + '</b><br>' + steps[i][1], parts: [{ type: 'queue', label: 'journey of ' + u, items: items, hl: hl, frontLabel: 'start', backLabel: 'screen' }] });
      }
      return frames;
    }
  }, {
    title: 'Where the packets go (architecture view)',
    input: 'cold',
    inputLabel: 'Cache state: cold or warm',
    gen: function (input) {
      var st = String(input).trim().toLowerCase();
      if (st !== 'cold' && st !== 'warm') throw new Error('Type cold or warm');
      var nodes = [
        { id: 'BR', label: 'Browser', x: 8, y: 30, shape: 'box', w: 14 },
        { id: 'DNS', label: 'DNS resolver', x: 32, y: 6, shape: 'box', w: 18 },
        { id: 'CDN', label: 'CDN edge (TLS ends)', x: 52, y: 30, shape: 'box', w: 24 },
        { id: 'LB', label: 'Load balancer', x: 78, y: 12, shape: 'box', w: 20 },
        { id: 'APP', label: 'App + DB', x: 84, y: 48, shape: 'box', w: 16 }
      ];
      var edges = [['BR', 'DNS', 'A?'], ['BR', 'CDN', 'TCP+TLS'], ['CDN', 'LB', 'miss'], ['LB', 'APP']];
      var cold = st === 'cold', frames = [];
      function f(narr, hl, ehl) { frames.push({ narr: narr, parts: [{ type: 'graph', label: 'request path', directed: true, height: 62, nodes: nodes, edges: edges, hl: hl, ehl: ehl }] }); }
      f('Browser has the URL. Cache state: <b>' + st + '</b>.', { BR: 'cur' }, {});
      f(cold ? '1. Ask the DNS resolver for the IP (cold: full walk).' : '1. DNS answer already cached &mdash; skipped.', { BR: 'cur', DNS: cold ? 'cur' : 'done' }, { 'BR-DNS': cold ? 'cur' : 'done' });
      f(cold ? '2. Open TCP and TLS to the nearest CDN edge (anycast IP). 2 round trips.' : '2. A warm keep-alive connection already exists &mdash; reuse it.', { BR: 'ok', CDN: 'cur' }, { 'BR-DNS': 'ok', 'BR-CDN': 'cur' });
      f(cold ? '3. Send GET. The CDN edge has no copy (miss), forwards to the origin.' : '3. Send GET. The CDN edge has a cached copy (hit) and answers immediately.', cold ? { CDN: 'cur', LB: 'cur' } : { CDN: 'sel' }, cold ? { 'BR-CDN': 'ok', 'CDN-LB': 'cur' } : { 'BR-CDN': 'ok' });
      if (cold) f('4. Load balancer picks a healthy backend; app server queries cache/database and builds the response.', { LB: 'ok', APP: 'cur' }, { 'CDN-LB': 'ok', 'LB-APP': 'cur' });
      f('5. HTML flows back along the same path; the CDN stores it for next time. Browser renders and fetches CSS/JS/images on the same connection.', { BR: 'sel', CDN: 'ok' }, { 'BR-CDN': 'ok' });
      return frames;
    }
  }],
  examples: [
    { title: 'The 90-second interview answer (outline)', html: `<p>"Browser checks its cache and HSTS, then resolves the name with DNS (stub &rarr; recursive &rarr; root, TLD, authoritative, all cached by TTL). It opens a TCP connection (3-way handshake) to the IP, routed by ARP to the gateway, NAT and BGP-routed hops, likely landing on a CDN edge via anycast. TLS 1.3 follows: ClientHello with key share and SNI, server certificate chain verified against the trust store, keys derived, ALPN picks h2. The browser sends <code>GET /</code>; the CDN serves from cache or forwards through a load balancer to an app server, which may use cache and database. The HTML returns; the browser builds DOM and CSSOM, fetches subresources over the same multiplexed connection, lays out, paints. Repeat visits skip most stages through caches, keep-alive and session resumption."</p>` },
    { title: 'Redirect and mixed-case: http://google.com', html: `<p>Typing <code>google.com</code> may first go to port 80, receive <code>301 Location: https://www.google.com/</code>, then restart DNS (new host), TCP and TLS. HSTS or the preload list avoids the plain-HTTP hop entirely and the browser upgrades internally (a "307 Internal Redirect" in DevTools).</p>` },
    { title: 'What if it fails? Debug by stage', html: `<p><b>DNS_PROBE_FINISHED_NXDOMAIN</b> &rarr; DNS. <b>Connection timed out / refused</b> &rarr; TCP: firewall, wrong port, server down. <b>ERR_CERT_*</b> &rarr; TLS chain, date or name. <b>502/504</b> &rarr; proxy reached but the backend did not answer. <b>Blank page, 200 OK</b> &rarr; render/JS problem. Using the stage order tells you which tool to reach for: <code>dig</code>, <code>nc -vz</code>, <code>openssl s_client</code>, <code>curl -v</code>, browser DevTools.</p>` }
  ],
  deepDive: `<p><b>Local network part.</b> Your OS compares destination IP with its subnet mask. Off-subnet &rarr; send to the default gateway: ARP "who has 192.168.1.1?" broadcasts, the router replies with its MAC, the frame is addressed to that MAC with the destination IP unchanged. Each router hop strips and rebuilds the Layer-2 header and decrements TTL. NAT rewrites (private IP:port) to (public IP:port) and remembers the mapping for the reply.</p>
  <p><b>Front door at scale.</b> The IP from DNS is typically an anycast address announced from many sites via BGP; the network delivers you to the closest. The edge terminates TLS, applies WAF/DDoS rules, serves cache hits, and uses a persistent pooled connection to the origin. Next come L4/L7 load balancers (ECMP, consistent hashing), the app tier, caches (Redis/Memcached) and databases.</p>
  <p><b>Browser internals.</b> Preload scanner finds resources while the parser is blocked; parser-blocking scripts delay DOM building (use <code>defer</code>/<code>async</code>); CSS blocks rendering; critical rendering path = HTML + CSS + render-blocking JS. Core Web Vitals: LCP (largest content paint), INP (interaction latency), CLS (layout shift). Resource hints: <code>preconnect</code> does DNS+TCP+TLS early, <code>dns-prefetch</code> only DNS, <code>preload</code> fetches a critical file early, <code>103 Early Hints</code> lets the server send hints before the full response.</p>
  <p><b>Edge cases worth naming:</b> proxy autoconfig (PAC), captive portals, IPv6 vs IPv4 race (Happy Eyeballs), HTTP/3 racing via Alt-Svc, connection coalescing in HTTP/2 (one connection serves several hostnames sharing a certificate and IP), service workers that answer without any network, and bfcache restoring pages instantly on back navigation.</p>`,
  aiEra: `<p><b>What AI changes:</b> an AI answer engine inside the browser may fetch the page for you (server-side or headless browser), so the same journey happens many times per question with different caches and bot-detection. Prefetching and speculation rules (<code>&lt;script type="speculationrules"&gt;</code>) pre-render likely next pages, so a "navigation" may have finished before the click. Agents also hit your site without cookies or JS, which changes cache keys and render behaviour.</p>
  <p><b>Use AI as a partner:</b> paste a HAR file or <code>curl -w</code> timings and ask <code>Which stage dominates and what would you change?</code> Ask it to quiz you with random failure symptoms and make you name the stage.</p>
  <p><b>Where AI goes wrong:</b> generic answers that skip DNS caching, TLS details or ARP, or that mix up HTTP/2 and HTTP/3 steps. It may also claim "TCP three-way handshake then TLS takes 3 RTT" for TLS 1.3. Check against the RTT table.</p>
  <p><b>What you must own:</b> a clear, ordered narrative with the right depth for the role &mdash; web dev, SRE or network engineer each emphasise different stages.</p>`,
  problems: [prob({
    t: 'Type google.com: Full Answer', l: 'Medium', tags: ['networking', 'classic', 'end-to-end'], co: ['Google', 'Amazon', 'Meta', 'Microsoft'],
    s: `<p>Explain what happens from pressing Enter on <code>google.com</code> until the page is visible. Name the protocol at each stage and say which stages are skipped on a repeat visit.</p>`,
    c: `Cover DNS, routing/ARP/NAT, TCP, TLS, HTTP, server side and rendering; mention caching.`,
    ex: `<p>${H.c('b', 'URL parse + HSTS')} &rarr; ${H.c('y', 'DNS')} &rarr; ${H.c('m', 'ARP/route/NAT')} &rarr; ${H.c('g', 'TCP')} &rarr; ${H.c('p', 'TLS')} &rarr; ${H.c('b', 'HTTP')} &rarr; ${H.c('y', 'render')}.</p>`,
    bw: `<p>Weak: "The browser sends a request to Google and Google sends back the page." It skips every mechanism the interviewer wants to hear and shows no depth.</p>`,
    mcq: { q: 'On a repeat visit within a minute, which of these is usually still needed?', options: ['A full DNS walk from the root', 'A new TCP + TLS handshake', 'Possibly only an HTTP request (or none if the cache is fresh)', 'ARP for the destination server'], answer: 2, explain: 'DNS is cached, the connection may be kept alive or resumed, and a fresh cached copy needs no request at all.' },
    h: [`<p>Hint 1: order matters; each stage needs the result of the previous one (IP before connect, connect before TLS).</p>`, `<p>Hint 2: for each stage say what is exchanged and where a cache can skip it.</p>`, `<p>Hint 3: finish with server-side path (CDN, load balancer, app, DB) and browser render pipeline.</p>`],
    a: `<p>1) The browser parses the input, adds https://, checks HSTS and the HTTP cache. 2) DNS: browser/OS cache, then the stub asks the recursive resolver, which (if cold) asks root, the .com TLD and Google's authoritative servers; the IP is cached for the TTL. 3) The OS sees the IP is off-subnet, uses ARP to find the default gateway's MAC, and sends the packet; NAT rewrites the source; BGP-routed hops deliver it to the nearest Google edge via anycast. 4) TCP 3-way handshake (or QUIC if the browser knows h3 from Alt-Svc). 5) TLS 1.3: ClientHello with SNI, ALPN and key share; ServerHello, certificate chain validated against the trust store, keys derived, Finished. 6) HTTP/2 GET / with cookies; the edge/load balancer forwards to a backend, which may use caches and databases and returns 200 with HTML. 7) The browser builds DOM and CSSOM, fetches CSS/JS/images over the same multiplexed connection, runs layout, paint and composite. On a repeat visit DNS comes from cache, the connection is reused or TLS resumed, and a fresh HTTP cache entry avoids the request entirely.</p>`,
    cx: `<p>Cold cost about 3-4 RTT plus server and render time; warm can be near zero network time.</p>`, f: ['What if google.com redirects to www.google.com?', 'How does it differ if the site is HTTP/3?', 'Where would you look if only the first visit is slow?']
  })]
});

/* ================= PRACTICE ================= */
practice.push(prob({
  t: 'HTTP Versions Cheat Sheet', l: 'Easy', tags: ['http'], co: ['Amazon'],
  s: `<p>State, in one sentence each, the headline change of HTTP/1.1 (vs 1.0), HTTP/2 and HTTP/3, and the transport each one uses.</p>`,
  c: `Three sentences, one transport each.`,
  ex: `<p>${H.c('b', '1.1')}: keep-alive default, TCP. ${H.c('g', '2')}: binary multiplexing + HPACK, TCP. ${H.c('p', '3')}: same semantics over QUIC/UDP.</p>`,
  bw: `<p>Weak: listing "faster, newer, better" without any mechanism.</p>`,
  mcq: { q: 'HTTP/3 runs over:', options: ['TCP', 'UDP via QUIC', 'SCTP', 'ICMP'], answer: 1, explain: 'QUIC is built on UDP and has TLS 1.3 integrated.' },
  h: [`<p>Hint 1: what was wasted in 1.0 on every request?</p>`, `<p>Hint 2: what could not be parallel in 1.1?</p>`, `<p>Hint 3: what was still shared in 2 that 3 separates?</p>`],
  a: `<p>HTTP/1.1 made persistent connections the default (keep-alive) and added the Host header, so one TCP connection serves many sequential requests, but only one request is in flight at a time. HTTP/2 keeps the same methods and headers but encodes messages as binary frames, multiplexes many streams on a single TCP connection and compresses headers with HPACK, so requests no longer queue behind one another at the HTTP layer. HTTP/3 keeps the same semantics but replaces TCP with QUIC over UDP, giving independent per-stream loss recovery (no TCP head-of-line blocking), a combined transport+TLS 1.3 handshake and connection migration; headers use QPACK.</p>`,
  cx: `<p>Recall question.</p>`, f: ['Which versions require TLS in browsers?']
}));
practice.push(prob({
  t: 'Compute Sec-WebSocket-Accept', l: 'Easy', tags: ['websocket', 'handshake'], co: ['Slack'],
  s: `<p>The client sends <code>Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==</code>. Describe exactly how the server computes the Accept value, and why the protocol bothers.</p>`,
  c: `Name the constant GUID, the hash and the encoding.`,
  ex: `<p>accept = base64(sha1("dGhlIHNhbXBsZSBub25jZQ==" + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11")) = ${H.c('g', 's3pPLMBiTxaQ9kYGzzhZRbK+xOo=')}.</p>`,
  bw: `<p>Weak: "it is some kind of encryption for security". It is not encryption and not authentication; it only proves the server understood the WebSocket handshake.</p>`,
  mcq: { q: 'What is the purpose of Sec-WebSocket-Accept?', options: ['Encrypt the connection', 'Authenticate the user', 'Prove the server understands WebSocket so a plain HTTP server or cache cannot be tricked into accepting it', 'Compress frames'], answer: 2, explain: 'It stops non-WebSocket servers and caching proxies from accidentally appearing to accept the upgrade.' },
  h: [`<p>Hint 1: concatenate key and a fixed GUID from the RFC.</p>`, `<p>Hint 2: SHA-1 the bytes (not hex text).</p>`, `<p>Hint 3: base64 the 20-byte digest.</p>`],
  a: `<p>The server takes the client's Sec-WebSocket-Key string exactly as sent, appends the fixed GUID 258EAFA5-E914-47DA-95CA-C5AB0DC85B11 from RFC 6455, computes the SHA-1 digest of those bytes (20 raw bytes), and base64-encodes it. For the sample key the result is s3pPLMBiTxaQ9kYGzzhZRbK+xOo=. It goes in the 101 Switching Protocols response. It is not security: it simply proves the server knowingly speaks WebSocket, so a cached HTTP response or an unaware server cannot be mistaken for an accepted upgrade, and browsers can reject misbehaving servers. Real protection comes from TLS (wss), the Origin check and authentication.</p>`,
  cx: `<p>O(1).</p>`, f: ['Why must client frames be masked?']
}));
practice.push(prob({
  t: 'DNS Record Matching', l: 'Easy', tags: ['dns'], co: ['Cloudflare'],
  s: `<p>Which DNS record type would you use for: (1) pointing <code>blog.shop.com</code> at a hosted-blog domain, (2) sending email for <code>shop.com</code> to Google, (3) proving domain ownership to a vendor, (4) delegating <code>shop.com</code> to your DNS provider, (5) IPv6 address of the site?</p>`,
  c: `One record type each.`,
  ex: `<p>(1) ${H.c('b', 'CNAME')} (2) ${H.c('g', 'MX')} (3) ${H.c('y', 'TXT')} (4) ${H.c('p', 'NS')} (5) ${H.c('r', 'AAAA')}.</p>`,
  bw: `<p>Weak: using A records everywhere, hard-coding a vendor IP that later changes.</p>`,
  mcq: { q: 'Why can the zone apex not be a CNAME?', options: ['CNAME is slow', 'The apex must also hold SOA/NS records and a CNAME cannot coexist with other records', 'CNAMEs only work for subdomains of .com', 'It can; there is no rule'], answer: 1, explain: 'CNAME means "this name is an alias of another" and forbids any other record on that name.' },
  h: [`<p>Hint 1: alias vs address vs mail vs text vs delegation.</p>`, `<p>Hint 2: names that point to names vs names that point to IPs.</p>`, `<p>Hint 3: TXT holds arbitrary strings used by SPF, DKIM, verification.</p>`],
  a: `<p>(1) CNAME: blog.shop.com becomes an alias for the vendor's hostname, so IP changes at the vendor need no edit. (2) MX: lists mail servers with priorities, e.g. 1 aspmx.l.google.com. (3) TXT: the vendor gives a random token that you publish as a TXT record; they query it to confirm control of the domain. (4) NS: records at the parent (registrar/TLD) and in the zone naming the authoritative servers; the TLD also returns glue A records if the name servers are inside the domain. (5) AAAA: maps a name to an IPv6 address, served along with A so clients can pick either via Happy Eyeballs.</p>`,
  cx: `<p>Recall.</p>`, f: ['What is glue and when is it needed?']
}));
practice.push(prob({
  t: 'Which Layer Blocks Here?', l: 'Medium', tags: ['hol-blocking', 'http2', 'tcp'], co: ['Google', 'Cloudflare'],
  s: `<p>Explain head-of-line blocking at four layers: HTTP/1.1, TCP, a router queue, and a single-threaded server. For each, say what waits behind what, and the standard fix.</p>`,
  c: `Four short paragraphs; name the fix per layer.`,
  ex: `<p>HTTP/1.1: response 2 waits for response 1 &rarr; ${H.c('g', 'multiplexing')}. TCP: later bytes wait for a lost segment &rarr; ${H.c('g', 'QUIC streams')}.</p>`,
  bw: `<p>Weak: "HTTP/2 removes head-of-line blocking" with no mention that TCP still has it.</p>`,
  mcq: { q: 'In HTTP/2 over TCP, one lost packet delays:', options: ['Only the stream it belonged to', 'All streams on that connection', 'Only the headers', 'Nothing, HTTP/2 has no HOL blocking'], answer: 1, explain: 'TCP delivers a single in-order byte stream, so every stream waits for the retransmit.' },
  h: [`<p>Hint 1: HOL blocking = an ordered queue where the first item stalls everything behind it.</p>`, `<p>Hint 2: find the ordered queue at each layer.</p>`, `<p>Hint 3: fix = break the single queue into independent ones.</p>`],
  a: `<p>HTTP/1.1: on one connection responses must come back in request order, so a slow first response blocks later ones; fixes are multiple connections and, properly, HTTP/2 multiplexing. TCP: the stack delivers bytes strictly in order, so a missing segment holds back later segments that already arrived; HTTP/2 inherits this for all of its streams; fix is QUIC, which orders data per stream so only streams with a gap wait. Router/switch: a FIFO output queue makes small latency-sensitive packets wait behind a large burst (also called bufferbloat); fixes are fair queueing, QoS classes and AQM like CoDel. Server: a single-threaded or exhausted worker pool handles requests in order, so one slow request delays the queue; fixes are async I/O, more workers, timeouts and per-request isolation. The general cure is always the same: split the single ordered queue into independent ones.</p>`,
  cx: `<p>Conceptual.</p>`, f: ['Does QUIC remove HOL blocking inside a single stream?', 'What is bufferbloat?']
}));
practice.push(prob({
  t: 'Design the Notification Bell', l: 'Medium', tags: ['sse', 'design'], co: ['LinkedIn', 'Meta'],
  s: `<p>Design the transport for a notification bell on a web app with 2 million simultaneous users. Pick a technique, handle reconnects without losing messages, and discuss what happens during a deploy.</p>`,
  c: `Mention connection cost, heartbeat, resume, backoff, fan-out.`,
  ex: `<p>${H.c('b', 'SSE')} + event ids + replay buffer + jittered reconnect + pub/sub fan-out.</p>`,
  bw: `<p>Weak: "poll every 2 seconds". 2M users &times; 0.5 req/s = 1M requests/s mostly returning nothing.</p>`,
  mcq: { q: 'After a deploy all 2M clients reconnect at the same instant. The standard mitigation is:', options: ['Retry immediately', 'Exponential backoff with random jitter', 'Switch to polling every 1 s', 'Disable heartbeats'], answer: 1, explain: 'Jitter spreads reconnects over time and prevents a thundering herd.' },
  h: [`<p>Hint 1: traffic is one-way.</p>`, `<p>Hint 2: how does a client say "I last saw event 481"?</p>`, `<p>Hint 3: how do you roll out servers without a reconnect storm?</p>`],
  a: `<p>Use SSE over HTTP/2: notifications are server-to-client only, it reuses cookie auth and CDN/proxy infrastructure, and EventSource reconnects automatically. Each event carries a monotonically increasing id per user; the client sends Last-Event-ID on reconnect and the gateway replays from a short per-user buffer in Redis or a log (Kafka). A gateway fleet holds the connections (~100-500k per node tuned with epoll); notification services publish to a pub/sub topic keyed by user and the node holding that user's connection forwards it. Send a heartbeat comment every 15-30 s to defeat idle timeouts, and set proxy buffering off. For deploys, drain nodes gradually (send a "reconnect after N seconds" hint with random jitter) and use exponential backoff with jitter on the client so the 2M reconnects spread out. Fall back to long polling if a network blocks streaming, and cap events per second per user.</p>`,
  cx: `<p>Memory per connection ~10-50 KB; 2M users need roughly 10-20 gateway nodes.</p>`, f: ['How do you handle a user with 5 tabs?', 'What if replay buffer has expired?']
}));
practice.push(prob({
  t: 'Chain of Trust Failures', l: 'Medium', tags: ['tls', 'certificates', 'debugging'], co: ['Stripe', 'Cloudflare'],
  s: `<p>Your API works in Chrome but <code>curl</code> and your Java service say "unable to get local issuer certificate". Give the most likely cause and the fix, then list two other certificate errors and what causes them.</p>`,
  c: `Reason about what the server sends and what clients have.`,
  ex: `<p>Server sends only the leaf. Chrome fetches the intermediate (AIA); curl cannot &rarr; ${H.c('r', 'chain incomplete')}. Fix: serve ${H.c('g', 'leaf + intermediate')}.</p>`,
  bw: `<p>Weak: "disable verification with -k / verify=False". That removes authentication.</p>`,
  mcq: { q: 'Which belongs in the server\'s certificate file?', options: ['Leaf only', 'Leaf + intermediates', 'Leaf + intermediates + root', 'Root only'], answer: 1, explain: 'Clients have roots already; they need the intermediates to link leaf to root.' },
  h: [`<p>Hint 1: who holds the intermediate: server or client?</p>`, `<p>Hint 2: some browsers fetch missing intermediates; libraries do not.</p>`, `<p>Hint 3: other errors: expired date, hostname mismatch, untrusted/self-signed root.</p>`],
  a: `<p>Most likely the server presents only the leaf certificate. Clients must build the path leaf &rarr; intermediate &rarr; trusted root; browsers can download a missing intermediate using the AIA extension or cache one seen before, but curl, Java, Python and mobile clients usually cannot, so they report "unable to get local issuer certificate". Fix: configure the server to send the full chain (leaf followed by intermediates, not the root) and verify with <code>openssl s_client -showcerts</code> or an SSL checker. Other failures: expired certificate (notAfter in the past, often a missed renewal; fix with automated renewal and monitoring), hostname mismatch (SAN lacks the requested name; reissue with the right names or fix the client URL), self-signed or private-CA root not in the client's trust store (install the CA into the trust bundle, never disable verification), and clock skew on the client making a valid cert look not-yet-valid.</p>`,
  cx: `<p>Diagnosis question.</p>`, f: ['How would you monitor certificate expiry?', 'What is OCSP stapling?']
}));
practice.push(prob({
  t: 'TLS 1.3 Saves How Much?', l: 'Medium', tags: ['tls', 'latency'], co: ['Google', 'Netflix'],
  s: `<p>A mobile user is 200 ms RTT from your origin. Compare the time before the first request can be sent for TLS 1.2 (full), TLS 1.3 (full), and TLS 1.3 resumed with 0-RTT, all over TCP. Then list the risk of 0-RTT.</p>`,
  c: `Include the TCP handshake in the count.`,
  ex: `<p>TLS1.2: 200 (TCP) + 400 = ${H.c('r', '600 ms')}; TLS1.3: 200 + 200 = ${H.c('y', '400 ms')}; 0-RTT: 200 + 0 = ${H.c('g', '200 ms')} (request travels in first TLS flight).</p>`,
  bw: `<p>Weak: forgetting TCP, or saying 0-RTT is a pure win with no downside.</p>`,
  mcq: { q: 'Why is 0-RTT data risky?', options: ['It is unencrypted', 'It can be replayed by an attacker', 'It uses weaker ciphers', 'It skips certificate checks'], answer: 1, explain: 'Early data is encrypted but not protected against replay; only idempotent requests should be accepted.' },
  h: [`<p>Hint 1: TCP is 1 RTT before TLS can even start.</p>`, `<p>Hint 2: TLS 1.2 = 2 RTT, 1.3 = 1 RTT, resumed 0-RTT = 0 extra.</p>`, `<p>Hint 3: think "what if the attacker records the first packet and sends it twice?"</p>`],
  a: `<p>Over TCP the handshake itself costs 1 RTT (200 ms) before TLS begins. TLS 1.2 full handshake then needs 2 more round trips (400 ms) so the first request leaves at 600 ms. TLS 1.3 full needs 1 more (200 ms) so the request leaves at 400 ms. TLS 1.3 resumption with 0-RTT sends the request together with the ClientHello (after the TCP handshake), so it departs at 200 ms. The risk of 0-RTT: early data is encrypted with the resumption key and has no server-contributed freshness, so an attacker can capture and replay it; and there is no forward secrecy for that data. Mitigations: accept early data only for safe idempotent methods like GET, add a replay cache or single-use tickets, reply 425 Too Early, and keep ticket lifetimes short. QUIC removes the separate TCP step so 0-RTT there costs 0 handshake round trips.</p>`,
  cx: `<p>Arithmetic on round trips.</p>`, f: ['What is HTTP 425?', 'How does TCP Fast Open relate?']
}));
practice.push(prob({
  t: 'Lower the TTL Before Migrating', l: 'Medium', tags: ['dns', 'ttl', 'operations'], co: ['Amazon', 'Shopify'],
  s: `<p>You will move your site to a new IP at 10:00 on Saturday. The A record has TTL 86400 (24 h). Lay out the plan to minimise users seeing the old server, and estimate the worst-case staleness for your plan vs a naive switch.</p>`,
  c: `Include timing of changes and rollback.`,
  ex: `<p>Naive: up to ${H.c('r', '24 h')} stale. Planned: lower TTL to 60 s on ${H.c('g', 'Thursday 10:00 or earlier')}, switch Saturday, worst case ${H.c('g', '~60 s')}.</p>`,
  bw: `<p>Weak: "change the record and wait 48 hours for propagation". DNS does not propagate; caches expire.</p>`,
  mcq: { q: 'When must you lower the TTL?', options: ['At the same moment as the IP change', 'At least one old-TTL period before the change', 'After the change', 'TTL does not matter'], answer: 1, explain: 'Caches may hold the old record for the old TTL; lowering earlier ensures that all caches now hold short-lived copies.' },
  h: [`<p>Hint 1: caches obey the TTL they received, not the one you set later.</p>`, `<p>Hint 2: when is the last moment a cache could have fetched the 24 h value?</p>`, `<p>Hint 3: keep the old server running until traffic drains; raise TTL again afterwards.</p>`],
  a: `<p>A cache that fetched the record at any time up to the change keeps it for the TTL it saw. So lower the TTL first (to 60-300 s) at least 24 h before the cutover, i.e. by Friday 10:00, preferably earlier, so every cache that holds the old 24 h copy has expired and now re-fetches the short-TTL copy. At 10:00 Saturday switch the A record to the new IP; clients converge within about 60 s (plus misbehaving resolvers that ignore TTL). Keep the old server serving (or proxying to the new one) for a few hours to catch stragglers, verify with <code>dig @resolver</code> from several resolvers and monitor traffic on both servers. Rollback is just switching the record back, which also takes ~60 s. Afterwards raise the TTL back to hours to reduce DNS load and improve resilience. A naive same-time switch leaves some users on the old IP for up to 24 hours.</p>`,
  cx: `<p>Operational plan.</p>`, f: ['What about the NS records or changing DNS provider?', 'What if you use a CDN in front?']
}));
practice.push(prob({
  t: 'Explain Why QUIC Uses UDP', l: 'Medium', tags: ['quic', 'http3', 'design'], co: ['Google', 'Cloudflare'],
  s: `<p>Why did HTTP/3 not just fix TCP? Give at least four reasons QUIC is built on UDP, and two costs of that choice.</p>`,
  c: `Think deployment, kernels, middleboxes, features.`,
  ex: `<p>Reasons: ${H.c('g', 'middlebox ossification, kernel update speed, per-stream recovery, integrated TLS')}. Costs: ${H.c('r', 'CPU, UDP blocking')}.</p>`,
  bw: `<p>Weak: "UDP is faster than TCP". QUIC re-implements reliability; speed is not the reason.</p>`,
  mcq: { q: 'The main reason QUIC is layered on UDP rather than a new IP protocol is:', options: ['UDP is reliable', 'Middleboxes drop unknown protocols but pass UDP', 'UDP has built-in encryption', 'UDP has lower latency than TCP by design'], answer: 1, explain: 'NATs and firewalls pass TCP/UDP; a new protocol number would be blocked everywhere.' },
  h: [`<p>Hint 1: who would need to upgrade to change TCP?</p>`, `<p>Hint 2: what do routers and firewalls do with unknown protocols and with TCP they can inspect?</p>`, `<p>Hint 3: costs: crypto and packet processing in user space; networks that block UDP 443.</p>`],
  a: `<p>Reasons: (1) Deployment: a new transport protocol number is dropped by NATs and firewalls, while UDP passes almost everywhere. (2) Ossification: middleboxes inspect and modify TCP headers/options, which froze TCP evolution; QUIC encrypts nearly everything including transport headers so they cannot meddle. (3) Speed of change: TCP lives in OS kernels which update over years; QUIC lives in the app or library and updates with the browser. (4) Features need new framing: independent streams without HOL blocking, connection IDs for migration, combined transport and TLS 1.3 handshake, better loss recovery and pluggable congestion control. Costs: more CPU (user-space packet handling and encryption, no TCP segmentation offload for years; mitigated by UDP GSO and kernel work), and some enterprise networks block or throttle UDP/443, so clients must fall back to HTTP/2 over TCP. There are also amplification-attack limits during the handshake.</p>`,
  cx: `<p>Design rationale.</p>`, f: ['How does connection migration work?', 'How does QUIC avoid being an amplification vector?']
}));
practice.push(prob({
  t: 'Design a Real-Time Stock Ticker', l: 'Hard', tags: ['websocket', 'system-design', 'back-pressure'], co: ['Robinhood', 'Bloomberg', 'Coinbase'],
  s: `<p>Design the delivery path for a web stock ticker serving 500k concurrent users; the market feed produces 200,000 price updates per second across 8,000 symbols. Cover protocol choice, subscription model, conflation, slow clients, reconnects and scaling the gateway tier.</p>`,
  c: `Users watch about 20 symbols each; eyes cannot use more than ~10 updates/s per symbol.`,
  ex: `<p>Feed &rarr; ${H.c('b', 'symbol-sharded pub/sub')} &rarr; ${H.c('y', 'conflate to latest every 100 ms')} &rarr; ${H.c('g', 'WebSocket gateways')} &rarr; client.</p>`,
  bw: `<p>Weak: forward every update to every user. 500k users &times; 200k updates/s is 10<super>11</super> messages/s &mdash; impossible. Each user only cares about their ~20 symbols.</p>`,
  mcq: { q: 'What do you do with a client that cannot keep up?', options: ['Buffer without limit', 'Conflate: skip to the latest price, drop stale intermediate ticks', 'Block the whole feed', 'Close all connections'], answer: 1, explain: 'Latest value matters for a ticker; bounded buffers with conflation protect memory and everyone else.' },
  h: [`<p>Hint 1: fan-out is per symbol, not per user-per-update.</p>`, `<p>Hint 2: the eye needs the latest price, not every tick.</p>`, `<p>Hint 3: bound every queue; define behavior for slow consumers; plan reconnect with a snapshot.</p>`],
  a: `<p>Ingest the feed into a pub/sub tier sharded by symbol. A conflation stage keeps the latest price per symbol and emits at most one update per symbol per 100 ms (8,000 symbols &times; 10/s = 80k msgs/s, fewer in practice). Gateways hold the WebSockets (SSE is fine for one-way, but WebSocket is convenient for subscribe/unsubscribe messages); each client sends a subscribe list, the gateway subscribes to those symbol channels once per node (not per user) and maintains symbol-to-connections maps, then writes a small binary or JSON frame per client batching all changed symbols in the tick. Per-connection send queues are bounded; if a queue grows, drop older ticks for the same symbol (conflate per connection) and as a last resort disconnect the client. Heartbeats every 15-30 s keep the connection alive and detect dead peers. On reconnect the client gets a snapshot of the latest price for each subscribed symbol followed by the live stream, with sequence numbers to detect gaps. Scale: 500k connections over ~10-20 nodes (tuned epoll servers, 25-50k each), L4 load balancing, gradual drain on deploy with jittered reconnects. Orders and account actions go over authenticated HTTPS, not the ticker socket, for auditability. Monitor lag per node, queue depth and drop counts; throttle to 4 updates/s on mobile to save battery.</p>`,
  cx: `<p>Outbound message rate per node = connections &times; subscribed symbols changing &times; 10 Hz at most, bounded by conflation.</p>`, f: ['How do you guarantee ordering and no gaps?', 'What changes for a trading (order entry) feed?']
}));
practice.push(prob({
  t: 'Debug a Slow First Load by Stage', l: 'Hard', tags: ['debugging', 'latency', 'end-to-end'], co: ['Meta', 'Google', 'Datadog'],
  s: `<p>A curl timing run shows: namelookup 0.380 s, connect 0.520 s, appconnect 0.910 s, starttransfer 1.050 s, total 1.300 s. The server is 40 ms RTT away. Diagnose each stage, say which is abnormal and what you would check or change.</p>`,
  c: `Convert cumulative times into per-stage costs first.`,
  ex: `<p>DNS ${H.c('r', '380 ms')}, TCP ${H.c('g', '140 ms')}, TLS ${H.c('r', '390 ms')}, wait ${H.c('y', '140 ms')}, download ${H.c('g', '250 ms')}.</p>`,
  bw: `<p>Weak: "the server is slow." The server wait is only 140 ms; most time is in DNS and TLS.</p>`,
  mcq: { q: 'appconnect minus connect (390 ms) at 40 ms RTT suggests:', options: ['Normal TLS 1.3', 'Something besides round trips: slow cert chain, OCSP fetch, big chain or CPU', 'DNS problem', 'The page is large'], answer: 1, explain: 'TLS 1.3 should cost about 1 RTT = 40 ms; 390 ms is far above it.' },
  h: [`<p>Hint 1: curl times are cumulative; subtract neighbours.</p>`, `<p>Hint 2: compare each stage with expected RTT multiples (40 ms).</p>`, `<p>Hint 3: for abnormal ones list causes: slow resolver, missing intermediate fetched by AIA, OCSP blocking, TLS 1.2 plus packet loss, CPU-starved server.</p>`],
  a: `<p>Per-stage: DNS = 380 ms; TCP connect = 520 &minus; 380 = 140 ms; TLS = 910 &minus; 520 = 390 ms; time to first byte after TLS = 1050 &minus; 910 = 140 ms; download = 1300 &minus; 1050 = 250 ms. With a 40 ms RTT, TCP should be ~40 ms (1 RTT) and TLS 1.3 ~40 ms (TLS 1.2 ~80 ms), request wait ~40 ms plus server time. Abnormal: DNS 380 ms (slow or distant resolver, packet loss to it, failed first server and retry, long CNAME chain, search-domain expansions) &mdash; check with <code>dig +trace</code> and a different resolver, consider caching or a closer resolver. TCP 140 ms is 3.5 RTT, so likely a SYN retransmission or a path/routing issue; check with tcpdump or mtr. TLS 390 ms means more than round trips: an incomplete chain with the client fetching the intermediate, OCSP checks without stapling, TLS 1.2 with a large chain, or an overloaded CPU doing RSA; check with <code>openssl s_client -showcerts</code>, enable OCSP stapling and TLS 1.3. Server wait of 140 ms is ~100 ms of app time: acceptable but worth profiling. Download 250 ms depends on size and congestion window. Fix order: DNS and TLS first.</p>`,
  cx: `<p>Per-stage subtraction, then compare with RTT multiples.</p>`, f: ['How would a CDN change each stage?', 'What would you log in production to catch this early?']
}));
practice.push(prob({
  t: 'HTTP/2 Over a Lossy Link', l: 'Hard', tags: ['http2', 'http3', 'tcp', 'performance'], co: ['Netflix', 'Cloudflare', 'Google'],
  s: `<p>Mobile users at 3% packet loss report that after migrating from HTTP/1.1 (6 connections) to HTTP/2 (1 connection), pages got slower. Explain why, what you would measure, and what you would do.</p>`,
  c: `Reason from TCP congestion control and head-of-line blocking.`,
  ex: `<p>1 TCP connection halves ${H.c('r', 'cwnd')} on loss and stalls ${H.c('r', 'all streams')}; six connections lose only about 1/6 each time.</p>`,
  bw: `<p>Weak: "HTTP/2 is always faster, the measurement must be wrong."</p>`,
  mcq: { q: 'What best fixes the problem?', options: ['More HTTP/2 streams', 'Enable HTTP/3 (QUIC) with fallback to h2', 'Disable keep-alive', 'Larger headers'], answer: 1, explain: 'QUIC has per-stream loss recovery so a loss only stalls the affected stream.' },
  h: [`<p>Hint 1: what does TCP do on each loss: window, retransmit, in-order delivery?</p>`, `<p>Hint 2: with six connections how much traffic is affected by one loss?</p>`, `<p>Hint 3: measurement and remedy: h3, BBR, fewer bytes, prioritisation.</p>`],
  a: `<p>With six HTTP/1.1 connections, a lost packet stalls only one connection (~1/6 of the transfer) and only that connection's congestion window is halved; the other five continue at full speed and the combined window ramps up faster. With a single HTTP/2 connection every loss halves the one congestion window and, because TCP delivers bytes in order, blocks every multiplexed stream until the retransmission arrives (one RTT or an RTO). At 3% loss losses occur constantly, so the single connection spends most of its time recovering. Also one slow-start ramp instead of six. Measure: per-connection retransmission rate and RTT (tcp_info / ss -ti, server-side metrics), compare time-to-first-byte and load time by connection type and loss bucket, check real-user metrics on h2 vs h1 vs h3. Remedies: enable HTTP/3 (QUIC) with automatic fallback, where loss affects only the stream with the hole and recovery is per-stream; use a loss-tolerant congestion control (BBR) on servers; reduce bytes (compression, image formats), set priorities so critical resources go first; as a stopgap, allow a second h2 connection via domain sharding for lossy clients. The lesson: multiplexing moves the bottleneck from HTTP to TCP.</p>`,
  cx: `<p>Throughput of TCP under loss p scales roughly as MSS / (RTT &times; &radic;p) per connection.</p>`, f: ['Why does BBR help here?', 'How does QUIC pick which streams to retransmit first?']
}));
practice.push(prob({
  t: 'Full Interview: URL to Pixels with Failure Modes', l: 'Hard', tags: ['end-to-end', 'senior', 'networking'], co: ['Google', 'Amazon', 'Stripe', 'Uber'],
  s: `<p>Walk through "user opens https://shop.example/cart" for a site behind a CDN, load balancer and microservices. For every stage name the protocol, the cache that can skip it, and one realistic failure with its symptom and fix.</p>`,
  c: `Cover DNS, connection, TLS, CDN, LB, app/db, render; failures each.`,
  ex: `<p>Stage &rarr; cache &rarr; failure: ${H.c('b', 'DNS &rarr; TTL &rarr; stale IP after migration')}; ${H.c('p', 'TLS &rarr; resumption &rarr; expired cert')}; ${H.c('g', 'CDN &rarr; edge cache &rarr; wrong Vary/cached personalised cart')}.</p>`,
  bw: `<p>Weak: a flat list of protocol names with no failure modes or caches &mdash; reads like memorisation.</p>`,
  mcq: { q: 'A cart page showing another user\'s items is most likely caused by:', options: ['TLS misconfiguration', 'The CDN caching a personalised response (missing Cache-Control: private / Vary: Cookie)', 'DNS TTL too low', 'HTTP/3 packet loss'], answer: 1, explain: 'Shared caches must not store per-user responses; mark them private/no-store or vary on the session.' },
  h: [`<p>Hint 1: use the stage order DNS, route, connect, TLS, HTTP, backend, render.</p>`, `<p>Hint 2: each stage: protocol, what can be skipped, what breaks.</p>`, `<p>Hint 3: choose failures with distinct symptoms (NXDOMAIN, timeout, cert error, 502/504, wrong content, blank page).</p>`],
  a: `<p>DNS: stub &rarr; recursive &rarr; authoritative (cached by TTL); failure: stale IP after migration or resolver outage (symptom NXDOMAIN or old site; fix with TTL planning, multiple providers). Routing: anycast IP reaches nearest CDN edge via BGP; failure: route leak/blackhole (timeouts for a region; fix by traffic steering/failover). Connection and TLS: TCP or QUIC handshake, TLS 1.3 with ALPN; skipped by keep-alive and resumption; failure: expired or incomplete certificate chain (ERR_CERT errors in some clients; fix with automation, full chain, monitoring). CDN: HTTP caching decides hit or miss; the cart is personalised so responses must carry Cache-Control: private or no-store (or Vary: Cookie) and the CDN must bypass cache for it; failure: caching a personalised page shows another user's cart (severe leak). Load balancer and services: L7 LB routes to the cart service, which calls pricing, inventory and cache/DB; failure: a slow downstream causes 504s and retry storms (fix with timeouts, circuit breakers, retry budgets, load shedding). Response: gzip/brotli, HTTP/2 or 3 multiplexing for subresources. Render: DOM/CSSOM, layout, paint; failure: render-blocking JS or hydration error gives a blank page with 200 OK; fix with defer, error boundaries and RUM monitoring. Tie it together with timings at each stage (curl -w, Server-Timing, RUM) so you can say which stage is at fault in minutes.</p>`,
  cx: `<p>End-to-end reasoning; no single complexity.</p>`, f: ['Where do you put timeouts and retries?', 'How would you detect a CDN cache leak before customers do?']
}));

/* ================= QUIZ ================= */
function Q(q, options, answer, explain) { quiz.push({ q: q, options: options, answer: answer, explain: explain }); }
Q('Round trips to first byte (ignoring DNS) for a cold HTTP/1.1 + TLS 1.2 request?', ['2', '3', '4', '5'], 2, 'TCP 1 + TLS 1.2 two + request 1 = 4.');
Q('Round trips to first byte for a cold HTTP/2 over TLS 1.3 (ignoring DNS)?', ['2', '3', '4', '5'], 1, 'TCP 1 + TLS 1.3 one + request 1 = 3.');
Q('Which HTTP version still suffers TCP head-of-line blocking across streams?', ['HTTP/1.0', 'HTTP/2', 'HTTP/3', 'None'], 1, 'HTTP/2 multiplexes on one TCP byte stream; HTTP/3 uses QUIC streams.');
Q('What is HPACK?', ['A TLS cipher', 'Header compression for HTTP/2', 'A DNS record', 'A WebSocket extension'], 1, 'HPACK uses static/dynamic tables plus Huffman coding; QPACK is the HTTP/3 variant.');
Q('Why is forward secrecy provided by TLS 1.3 key exchange?', ['It uses RSA key transport', 'Keys come from ephemeral ECDHE per session', 'It stores keys on disk', 'It uses weaker hashes'], 1, 'Ephemeral keys are discarded, so a later server-key leak cannot decrypt old sessions.');
Q('The browser trusts a server certificate mainly because:', ['It is long', 'A chain of valid signatures leads to a root in the trust store', 'The URL has https', 'The server says so'], 1, 'Signatures link leaf to intermediate to root; the root must already be trusted.');
Q('Which DNS server returns the NS records for example.com when asked by a recursive resolver?', ['Root server', 'The .com TLD server', 'The stub resolver', 'The browser'], 1, 'The TLD server holds the delegation (NS + glue) for domains under it.');
Q('You lowered a record\'s TTL just before changing the IP. Why can users still hit the old IP for up to the OLD TTL?', ['DNS broadcasts are slow', 'Caches already holding the old record keep it until it expires', 'Routers cache DNS', 'TTL is ignored by browsers'], 1, 'Caches obey the TTL they received when they cached the record.');
Q('What status code and header pair completes a WebSocket upgrade?', ['200 OK + Connection: close', '101 Switching Protocols + Sec-WebSocket-Accept', '301 + Location', '204 + Upgrade'], 1, 'The server returns 101 and Accept = base64(sha1(key+GUID)).');
Q('Best fit for one-way server-to-client notifications with automatic reconnect?', ['WebSocket', 'SSE', 'Raw UDP', 'FTP'], 1, 'EventSource handles reconnect and Last-Event-ID.');
Q('Why must WebSocket client-to-server frames be masked?', ['To compress them', 'To prevent cache-poisoning attacks on intermediary proxies', 'To encrypt them', 'To authenticate the user'], 1, 'Masking with a random key stops attackers crafting bytes that look like valid HTTP to proxies.');
Q('A CNAME record cannot be placed at the zone apex because:', ['It is too slow', 'The apex needs SOA/NS records and CNAME excludes other records', 'DNS forbids aliases', 'Browsers reject it'], 1, 'CNAME must be the only record for a name; the apex has mandatory SOA and NS.');
Q('Which statement about 0-RTT is correct?', ['It is replay-safe', 'It is replayable, so only idempotent requests should be accepted', 'It needs no prior connection', 'It disables encryption'], 1, 'Early data can be replayed by an attacker.');

/* ================= INTERVIEW ================= */
function I(q, level, a, f) { interview.push({ q: q, level: level, a: a, followUps: f }); }
I('What happens when you type a URL into the browser and press Enter?', 'B', `<p>Parse the URL and check HSTS and the browser cache; resolve the name via DNS (browser/OS cache, then stub &rarr; recursive resolver &rarr; root, TLD, authoritative, with TTL caching); route packets (ARP to the gateway, NAT, BGP-routed hops, often to a nearby CDN edge via anycast); open a TCP connection (or QUIC); run the TLS handshake (ClientHello with SNI and ALPN, certificate chain validation, key exchange); send the HTTP request through CDN/load balancer to an app server that may use caches and databases; receive the response; the browser builds the DOM and CSSOM, fetches subresources over the same connection, lays out and paints. Repeat visits skip stages via caches, keep-alive and resumption.</p>`, ['Which step is slowest on the first visit?', 'What changes with HTTP/3?', 'What if it is a 301 redirect?']);
I('Compare HTTP/1.1, HTTP/2 and HTTP/3.', 'B', `<p>HTTP/1.1: text, one request in flight per connection, so browsers open ~6 connections; keep-alive reuse. HTTP/2: binary frames, many multiplexed streams on one TCP connection, HPACK header compression; still limited by TCP head-of-line blocking. HTTP/3: same semantics over QUIC (UDP): independent streams (no cross-stream HOL blocking), combined transport+TLS 1.3 handshake (1 RTT, 0-RTT on resumption), connection migration with connection IDs, QPACK headers. Browsers discover h3 via the Alt-Svc header or HTTPS DNS records and fall back to h2 if UDP is blocked.</p>`, ['Why did server push fail?', 'How does a client know a server supports h3?']);
I('What is head-of-line blocking and where does it occur?', 'I', `<p>It is when an ordered queue stalls everything behind its first item. At HTTP/1.1: response 2 waits for response 1 on the same connection. At TCP: later bytes wait for a lost segment because delivery is in order, which hurts HTTP/2 since all streams share it. In routers: a big packet in a FIFO queue delays small ones (bufferbloat). In servers: a slow handler occupying a single worker. Fixes: multiplexing, QUIC per-stream ordering, fair queueing/AQM, async I/O and worker pools. The general remedy is to split one ordered queue into independent ones.</p>`, ['Does HTTP/3 remove HOL blocking entirely?', 'Why can h2 be slower than h1 under loss?']);
I('Walk me through the TLS 1.3 handshake and how it differs from TLS 1.2.', 'I', `<p>TLS 1.3: ClientHello carries supported ciphers, SNI, ALPN and a guessed ECDHE key share; ServerHello picks cipher and sends its share, so both derive handshake keys; the rest of the server flight (EncryptedExtensions, Certificate, CertificateVerify, Finished) is encrypted; the client verifies the chain and signature and sends Finished. 1 RTT, forward secrecy always (static RSA key exchange removed), weak ciphers and compression removed, certificate hidden from eavesdroppers. TLS 1.2 needs 2 RTT, sends the certificate in clear, and allows RSA key transport and legacy ciphers. Resumption in 1.3 uses PSK tickets and allows 0-RTT early data, which is replayable.</p>`, ['What is CertificateVerify for?', 'What is ALPN?', 'What does ECH hide?']);
I('How does a browser verify a certificate chain?', 'I', `<p>It checks that the requested hostname is in the leaf's SAN, that all certificates are within their validity dates, that each certificate's signature verifies with its issuer's public key (leaf by intermediate, intermediate by root), that issuers are allowed to sign (basicConstraints/key usage), that the root is in the local trust store, and that nothing is revoked (stapled OCSP, CRLite/CRLs). Finally CertificateVerify proves the server owns the leaf's private key. Certificate Transparency SCTs are also checked in Chrome. A missing intermediate, expired date or name mismatch each cause a distinct error.</p>`, ['What is a cross-signed root?', 'How does pinning differ?']);
I('Explain forward secrecy and how TLS achieves it.', 'I', `<p>Forward secrecy means compromising long-term keys later does not reveal past session traffic. TLS 1.3 requires ephemeral Diffie-Hellman (ECDHE): each side makes a fresh key pair for the session, derives the shared secret, and discards the private values afterwards. The server's long-term key is used only to sign the handshake (authentication), never to encrypt secrets. In TLS 1.2 static RSA key transport lacked this property; ECDHE suites provide it. 0-RTT early data lacks forward secrecy since it uses a resumption key.</p>`, ['What is harvest-now-decrypt-later?', 'How do hybrid post-quantum key shares fit?']);
I('Describe DNS resolution step by step, including caching.', 'B', `<p>The app asks the stub resolver, which checks its cache then asks the recursive resolver. If the resolver lacks the answer it starts at a root server (hard-coded hints), gets a referral to the TLD servers, asks them, gets a referral to the domain's authoritative servers, and asks them for the record. Each answer carries a TTL; the resolver caches the final record and also the NS delegations (usually long TTLs), so later lookups skip root and TLD. The result returns to the stub, which caches it, and the browser may keep its own cache. Negative answers are cached too. Transport is UDP/53 with TCP fallback; DoH/DoT encrypt the stub hop.</p>`, ['How many queries on a fully cold lookup?', 'What is glue?']);
I('What are the common DNS record types and when would you use each?', 'B', `<p>A and AAAA map names to IPv4/IPv6 addresses. CNAME aliases one name to another (not at the apex). MX lists mail servers with priority. NS names the authoritative servers for a zone and is used for delegation. TXT stores text such as SPF, DKIM, DMARC and domain-verification tokens. SOA holds zone metadata including the serial and negative-cache TTL. PTR does reverse lookups, SRV locates services by host and port, CAA restricts which CAs may issue certificates, and HTTPS/SVCB records advertise h2/h3 and ECH parameters.</p>`, ['Why does email deliverability depend on TXT records?', 'What is CNAME flattening?']);
I('A DNS change is not visible to everyone. Why, and how do you plan changes?', 'I', `<p>DNS does not push changes; every resolver and client caches records until the TTL expires, so users see a mix of old and new answers for up to the old TTL (plus resolvers that stretch TTLs). Plan by lowering the TTL at least one old-TTL period before the change, make the change, keep the old target working while traffic drains, verify from several resolvers with dig, then raise the TTL again. Also remember negative caching and that browsers/OS/JVM add their own caches.</p>`, ['What if you also change name servers?', 'Why do some ISP resolvers ignore low TTLs?']);
I('When would you choose WebSocket, SSE or long polling?', 'I', `<p>WebSocket when both sides send frequently with low latency: chat, multiplayer games, collaborative editing. SSE when only the server pushes: notifications, feeds, progress, LLM token streaming; it is plain HTTP with auto-reconnect and Last-Event-ID. Long polling as a fallback where streaming is blocked or for infrequent events with simple infrastructure. Plain polling when updates are rare and freshness of minutes is fine. Consider scale (connections are stateful and need fd/memory budgeting), proxies and load balancers (idle timeouts, buffering), heartbeats, backoff with jitter, and resuming missed messages with sequence numbers.</p>`, ['How does the upgrade handshake work?', 'How do you scale to a million connections?']);
I('How does the WebSocket handshake and frame format work?', 'I', `<p>The client sends an HTTP/1.1 GET with Upgrade: websocket, Connection: Upgrade, a random Sec-WebSocket-Key and Version 13. The server replies 101 Switching Protocols with Sec-WebSocket-Accept = base64(SHA-1(key + fixed GUID)). Afterwards both sides exchange frames: FIN bit, opcode (text, binary, close, ping, pong, continuation), mask bit, 7/16/64-bit payload length, a 4-byte masking key (mandatory client-to-server) and payload. Messages can be fragmented. Ping/pong act as keepalive; close frames carry a status code.</p>`, ['Why masking?', 'How is it different over HTTP/2?']);
I('Why does HTTP/3 use QUIC over UDP, and what are the trade-offs?', 'A', `<p>TCP cannot be evolved: it lives in kernels, and middleboxes inspect and break new TCP options. QUIC runs in user space on UDP, encrypts almost all metadata, and provides what TCP+TLS+HTTP/2 could not: independent streams without HOL blocking, a merged 1-RTT handshake (0-RTT on resumption), connection IDs for migration across networks, improved loss recovery and pluggable congestion control. Trade-offs: higher CPU cost, UDP blocking on some networks (fallback to h2 needed), debugging difficulty because the transport is encrypted, DDoS/amplification considerations, and a larger initial handshake with post-quantum keys.</p>`, ['How does connection migration work?', 'How does QUIC avoid amplification?']);
I('Design the realtime transport for a chat and notification system at scale.', 'E', `<p>Use WebSockets for chat (bidirectional) terminated at a gateway tier of stateless-ish nodes that hold connections; authenticate at connect; route messages through a pub/sub or log (Kafka/Redis streams) keyed by conversation/user; give every message a monotonic id and persist before ack so clients can resume with "last seen id"; heartbeat via ping/pong; bounded per-connection queues and back-pressure; exponential backoff with jitter for reconnects; drain nodes gradually on deploy; presence and typing events are best-effort. Use SSE (or push channels like APNs/FCM for background mobile) for one-way notifications. Capacity plan memory and file descriptors per node, use L4 load balancing with long idle timeouts, and observe connection counts, lag and drops.</p>`, ['How do you do ordering across devices?', 'How do you handle a region failover?']);

registerModule({
  id: 'cs13',
  title: 'Application Layer: HTTP, TLS, DNS, WebSockets',
  intro: `<p>This module is the part of networking that every product interview touches: <b>how the web actually talks</b>. You will compare HTTP/1.1, HTTP/2 and HTTP/3, count the round trips behind a slow page, see what TLS does for you and how a certificate chain earns trust, follow a DNS lookup from the stub resolver to the authoritative server, choose between WebSocket, SSE and polling, and finally tie everything into the classic "what happens when you type a URL" answer. It builds on the TCP/UDP and IP modules and leads into QUIC, load balancing and security in the next module.</p>`,
  goals: ['Explain what HTTP/2 and HTTP/3 fix compared with HTTP/1.1, and which layer still blocks', 'Count round trips to first byte for any HTTP + TLS + QUIC combination', 'Walk a certificate chain and name every check a client makes', 'Trace a DNS lookup through caches, TTLs and delegations, and plan a safe DNS change', 'Choose WebSocket, SSE, long polling or polling for chat, notifications and tickers', 'Deliver a complete, ordered "type google.com" answer with failure modes'],
  prereqs: `Module cs10 (Networking Basics: OSI &amp; TCP/IP), cs11 (IP addressing, routing, NAT) and cs12 (TCP &amp; UDP deep dive).`,
  hours: 9,
  topics: topics, practice: practice, quiz: quiz, interview: interview
});
})();
