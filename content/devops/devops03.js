(function () {
  var topics = [], practice = [], quiz = [], interview = [];
  var R = String.raw; // raw template: backslashes in shell code stay exactly as typed
  var LAB = 'Your own Linux machine, WSL, or a throwaway container (<code>docker run -it --rm ubuntu:24.04 bash</code>, then <code>apt-get update && apt-get install -y dnsutils curl iproute2 netcat-openbsd traceroute openssl python3</code>). No cloud account needed.';
  var SKIP = { skip: 'troubleshooting answer, verified by reading' };
  // Compact problem builder. Code is bash unless o.lang says otherwise (python for subnet maths).
  function P(o) {
    var lang = o.lang || 'bash';
    var p = {
      title: o.t, level: o.l, tags: o.tags, companies: o.co,
      statement: o.s, constraints: o.c || LAB, example: o.ex,
      brute: { why: o.bw },
      mcq: { q: o.q[0], options: o.q[1], answer: o.q[2], explain: o.q[3] },
      hints: o.h,
      solution: { approach: o.a, code: { lang: lang, code: o.code }, complexity: o.cx, followUps: o.f },
      tests: o.tests || SKIP
    };
    if (o.bc) p.brute.code = { lang: o.blang || lang, code: o.bc };
    return p;
  }
  function box(id, label, x, y, w) { return { id: id, label: label, x: x, y: y, shape: 'box', w: w || 18 }; }
  function one(k, v) { var h = {}; h[k] = v; return h; }
  // Tiny IPv4 helpers for the visualizers (unsigned 32-bit maths with >>> 0).
  function ip2n(s) {
    var m = String(s).trim().match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (!m) throw new Error('Not an IPv4 address: "' + s + '" (use dotted form like 192.0.2.77)');
    var o = m.slice(1).map(Number);
    if (o.some(function (x) { return x > 255; })) throw new Error('Each octet must be 0-255: "' + s + '"');
    return (((o[0] << 24) >>> 0) + (o[1] << 16) + (o[2] << 8) + o[3]) >>> 0;
  }
  function n2ip(n) { n = n >>> 0; return [n >>> 24, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.'); }
  function maskOf(p) { return p === 0 ? 0 : (0xFFFFFFFF << (32 - p)) >>> 0; }
  function cidr(s) {
    var m = String(s).trim().match(/^([\d.]+)\/(\d{1,2})$/);
    if (!m || Number(m[2]) > 32) throw new Error('Use CIDR like 10.0.0.0/16 (got "' + s + '")');
    var p = Number(m[2]), ip = ip2n(m[1]), mk = maskOf(p);
    var net = (ip & mk) >>> 0, size = Math.pow(2, 32 - p);
    return { ip: ip, p: p, mask: mk, net: net, bc: (net + size - 1) >>> 0, size: size, text: n2ip(net) + '/' + p };
  }
  function inNet(ipn, c) { return ((ipn & c.mask) >>> 0) === c.net; }

  // ───────────────────────── Topic 1: the TCP/IP model in practice ─────────────────────────
  topics.push({
    title: 'The TCP/IP Model in Practice: A Ladder for Every Network Ticket',
    analogy: `<p>Sending data is like <b>posting a parcel</b>. You write a letter (the <b>application</b> data). You put it in an envelope with a flat number on it (the <b>port</b>, transport layer). The post office adds the street address (the <b>IP address</b>, internet layer). Then a van carries it from one depot to the next (the <b>link</b> layer, using MAC addresses). Each depot only reads the label it needs. When a parcel goes missing, you ask the same questions in order: right street? right flat? did someone open the door? That order is the whole trick of network troubleshooting.</p>`,
    explain: `<p>🟢 <b>Four layers, four questions.</b> You met the theory in <b>CS Core 10</b>. Here we use the TCP/IP model as a <b>checklist</b>. Each layer answers one question, and each has its own tools and its own error messages.</p>
      ${H.table(['Layer', 'Question it answers', 'Addresses / names', 'Tools you use', 'Typical error when it breaks'], [
        ['<b>4. Application</b> (HTTP, DNS, SSH, TLS)', 'Did the program understand the request?', 'URLs, host names', '<code>curl -v</code>, <code>dig</code>, <code>openssl s_client</code>', '<code>HTTP 502</code>, <code>certificate has expired</code>, <code>NXDOMAIN</code>'],
        ['<b>3. Transport</b> (TCP, UDP)', 'Is something listening on that port, and can I reach it?', 'ports (443, 22, 5432)', '<code>ss -tlnp</code>, <code>nc -vz</code>', '<code>Connection refused</code>, <code>timed out</code>'],
        ['<b>2. Internet</b> (IP, ICMP)', 'Is there a route to that address?', 'IP addresses, CIDR blocks', '<code>ip route</code>, <code>ping</code>, <code>traceroute</code>', '<code>Network is unreachable</code>, <code>No route to host</code>'],
        ['<b>1. Link</b> (Ethernet, Wi-Fi, the cloud virtual NIC)', 'Is the cable / virtual NIC up and talking to the next hop?', 'MAC addresses', '<code>ip link</code>, <code>ip neigh</code>', 'interface <code>DOWN</code>, no IP address at all']
      ])}
      <p>🟢 <b>Encapsulation in one sentence.</b> Going down the stack, each layer wraps the data from the layer above in its own header. Going up on the other side, each layer removes its header and passes the rest up. A browser's <code>GET /</code> ends up inside TLS, inside a TCP segment (ports), inside an IP packet (addresses), inside an Ethernet frame (MACs).</p>
      <p>🔵 <b>Use it as a ladder.</b> When a ticket says "the website is down", do not guess. Climb: (1) does the <b>name</b> resolve? (2) is there a <b>route</b>? (3) does the <b>port</b> answer? (4) does <b>TLS</b> succeed? (5) what does <b>HTTP</b> return? The first rung that fails tells you which team or setting to look at. The error text alone often names the layer:</p>
      ${H.table(['What the user sees', 'Layer', 'First thing to check'], [
        ['<code>Could not resolve host</code>', 'Application (DNS)', '<code>dig</code> the name, check the record and resolver'],
        ['<code>Network is unreachable</code>', 'Internet', 'no default route: <code>ip route</code>'],
        ['<code>Connection timed out</code>', 'Internet / Transport', 'firewall or security group dropping, wrong route'],
        ['<code>Connection refused</code>', 'Transport', 'host reached, but nothing listens on that port'],
        ['<code>SSL certificate problem</code>', 'Application (TLS)', 'cert expiry, name or chain'],
        ['<code>HTTP 502 / 503 / 504</code>', 'Application', 'the load balancer could not get a good answer from the app']
      ])}`,
    clues: [
      '"the site is down" with no detail → climb the ladder: name → route → port → TLS → HTTP, and stop at the first failure',
      '"works by IP but not by name" → DNS (application layer), not the network',
      '"Connection refused" → transport layer: host reached, nothing listening on that port',
      '"timed out" → packets are being dropped: security group, NACL, host firewall or a missing route',
      '"Network is unreachable" right away → no route on this machine: check <code>ip route</code> for a default route',
      '"which layer does a load balancer work at?" → L4 (TCP/UDP, e.g. NLB) vs L7 (HTTP, e.g. ALB)'
    ],
    code: [R`# Lab: docker run -it --rm ubuntu:24.04 bash
apt-get update -qq && apt-get install -y -qq iproute2 iputils-ping curl dnsutils > /dev/null

# Layer 1 - link: is the interface up? (state UP, and a MAC address)
ip -br link

# Layer 2 - internet: which IP do I have, and where do packets go?
ip -br -4 addr                  # e.g. eth0 UP 172.17.0.2/16 (a private address)
ip route                        # 'default via 172.17.0.1' = the gateway for everything else
ip route get 203.0.113.10       # which interface and gateway this one destination would use
ip neigh                        # ARP cache: IP -> MAC of the gateway (link layer meets IP layer)

# Layer 3 - transport: what is listening on this machine?
ss -tlnp                        # TCP, listening, numeric, with process (empty in a fresh container)

# Layer 4 - application: DNS, then HTTP, with every step printed
dig +short example.com          # name -> address
curl -sv -o /dev/null https://example.com 2>&1 | grep -E '^\* (Trying|Connected|SSL|Server certificate)|^< HTTP'`],
    codeTitle: ['Look at every layer of your own machine'],
    viz: [{
      title: 'Encapsulation: one HTTPS request wrapped layer by layer',
      input: 'https://www.example.com/health',
      inputLabel: 'a URL (https or http)',
      gen: function (input) {
        var m = String(input || '').trim().match(/^(https?):\/\/([a-z0-9.-]+)(:\d+)?(\/[^\s]*)?$/i);
        if (!m) throw new Error('Give a URL like https://www.example.com/health');
        var tls = m[1].toLowerCase() === 'https', host = m[2].toLowerCase(), port = m[3] ? Number(m[3].slice(1)) : (tls ? 443 : 80), path = m[4] || '/';
        if (port < 1 || port > 65535) throw new Error('Port must be 1-65535');
        var sport = 40000 + (host.length * 977) % 20000;
        var layers = [['Application', 'GET ' + path + ' HTTP/1.1, Host: ' + host], ['TLS', tls ? 'encrypted record (only the server can read the GET)' : '(none: plain http, anyone on the path can read it)'], ['Transport (TCP)', 'src port ' + sport + ' → dst port ' + port], ['Internet (IP)', 'src 10.0.1.25 → dst 203.0.113.10'], ['Link (Ethernet)', 'src MAC 0a:11:22:33:44:55 → gateway MAC 0a:aa:bb:cc:dd:01']];
        var f = [];
        function stackUpTo(k) { return layers.slice(0, k + 1).map(function (l) { return l[0] + ': ' + l[1]; }).reverse(); }
        f.push({ narr: 'Before anything is sent, <b>DNS</b> turns <b>' + H.esc(host) + '</b> into an IP address. Say it answers <b>203.0.113.10</b> (a documentation address). Now the browser builds the request at the top layer.', parts: [
          { type: 'table', label: 'what we know so far', columns: ['item', 'value'], rows: [['host name', H.esc(host)], ['IP from DNS', '203.0.113.10'], ['scheme', tls ? 'https' : 'http'], ['port', String(port) + (m[3] ? ' (given in the URL)' : ' (default for ' + (tls ? 'https' : 'http') + ')')]], hl: { 1: 'ok' } }
        ] });
        layers.forEach(function (l, k) {
          var why = [
            'The <b>application</b> writes plain HTTP text: the method, the path and a <code>Host</code> header so one server can host many sites.',
            tls ? '<b>TLS</b> encrypts it. Routers in the middle see only scrambled bytes. The host name still travels in the TLS hello (SNI) so the server can pick the right certificate.' : 'With plain <b>http</b> there is no TLS layer. Every hop can read and change the request, which is why real sites redirect to https.',
            '<b>TCP</b> adds ports. The destination port ' + port + ' picks the program on the server. The source port ' + sport + ' is a random <b>ephemeral</b> port so replies find their way back to this browser tab.',
            '<b>IP</b> adds the source and destination addresses. Routers only look at this header. 10.0.1.25 is a <b>private</b> address, so a NAT device will rewrite it on the way out (see the NAT topic).',
            'The <b>link</b> layer adds MAC addresses for <b>one hop only</b>: from this machine to its default gateway. Every router strips and rebuilds this header.'
          ][k];
          f.push({ narr: 'Layer ' + (k + 1) + ' of 5 going <b>down</b>: ' + why, parts: [
            { type: 'stack', label: 'headers (outermost on top)', items: stackUpTo(k).reverse(), hl: one(k, 'ok') }
          ] });
        });
        f.push({ narr: 'The frame crosses the wire. At each router the link header is replaced, the IP header is read to choose the next hop, and the TTL is lowered by one. Ports and the encrypted payload are untouched (unless a NAT rewrites addresses and ports).', parts: [
          { type: 'graph', directed: true, height: 40, nodes: [box('C', 'client 10.0.1.25', 8, 20, 20), box('G', 'gateway / NAT', 38, 20, 18), box('I', 'internet routers', 64, 20, 18), box('S', 'server 203.0.113.10', 90, 20, 20)], edges: [['C', 'G'], ['G', 'I'], ['I', 'S']], ehl: { 'C-G': 'ok', 'G-I': 'ok', 'I-S': 'ok' } }
        ] });
        f.push({ narr: 'On the server the layers come off in reverse: link → IP (is this my address?) → TCP (which program owns port ' + port + '?) → ' + (tls ? 'TLS (decrypt) → ' : '') + 'HTTP. If any check fails, you get that layer\'s error: no listener on the port gives <b>Connection refused</b>, a bad certificate gives a <b>TLS error</b>, a crashed app behind a load balancer gives <b>502</b>.', parts: [
          { type: 'table', label: 'unwrapping on the server', columns: ['step', 'check', 'error if it fails'], rows: [['1', 'frame for my MAC?', '(silently ignored)'], ['2', 'packet for my IP?', 'dropped / forwarded'], ['3', 'anyone listening on ' + port + '?', 'Connection refused (TCP RST)'], ['4', tls ? 'TLS handshake ok?' : '(no TLS)', tls ? 'certificate / protocol error' : '-'], ['5', 'app handles GET ' + H.esc(path) + '?', '4xx / 5xx status']], hl: { 2: 'cur', 4: 'ok' } }
        ] });
        f.push({ narr: 'Take-away: each layer has its own address and its own errors. When you troubleshoot, test one layer at a time, bottom-up (route, port) or top-down (HTTP, TLS), and the first failing layer is where the fix lives.', parts: [
          { type: 'table', label: 'one tool per rung', columns: ['rung', 'tool'], rows: [['name', 'dig +short ' + H.esc(host)], ['route', 'ip route get 203.0.113.10'], ['port', 'nc -vz ' + H.esc(host) + ' ' + port], ['TLS', tls ? 'openssl s_client -connect ' + H.esc(host) + ':' + port + ' -servername ' + H.esc(host) : '(skip)'], ['HTTP', 'curl -sv ' + H.esc(m[0])]] }
        ] });
        return f;
      }
    }],
    examples: [
      { title: 'Ticket: "the site is down" - classify by the error text', html: `<p>Three users report "the site is down" for <code>shop.example.com</code>. User A sees <code>Could not resolve host</code>: that is DNS (application layer), probably their resolver or a record. User B sees <code>Connection timed out</code>: packets are dropped somewhere, usually a firewall or security group. User C sees <code>502 Bad Gateway</code>: the network is fine all the way to the load balancer; the app behind it is broken. Three different layers, three different fixes, and none of them is "restart the server" by default.</p>`, code: R`curl -sS https://shop.example.com/ -o /dev/null -w '%{http_code}\n'
echo "curl exit code: $?"   # 6 = could not resolve, 7 = failed to connect, 28 = timeout, 60 = bad certificate` },
      { title: 'Which way will a packet go? ip route get', html: `<p>A VM has two network cards and traffic to a partner network goes the wrong way. <code>ip route get</code> asks the kernel to do the routing decision for one address and print the answer: the interface, the gateway and the source IP it would use. It is the fastest way to answer "is this a routing problem?" on the machine itself.</p>`, code: R`ip route
# default via 10.0.1.1 dev eth0
# 10.0.1.0/24 dev eth0 proto kernel scope link src 10.0.1.25
# 198.51.100.0/24 via 10.0.9.1 dev eth1
ip route get 198.51.100.20   # -> via 10.0.9.1 dev eth1 src 10.0.9.14  (partner route)
ip route get 203.0.113.10    # -> via 10.0.1.1 dev eth0 src 10.0.1.25  (default route)` },
      { title: 'Reading curl -v as a layer-by-layer story', html: `<p><code>curl -v</code> prints one line per layer, in order. <code>* Trying 203.0.113.10:443</code> means DNS worked. <code>* Connected to</code> means TCP worked (the port answered). <code>* SSL connection using TLSv1.3</code> and <code>* Server certificate:</code> mean TLS worked. <code>&lt; HTTP/2 200</code> is the application answer. Wherever the story stops is where you dig.</p>`, code: R`curl -sv -o /dev/null https://example.com 2>&1 | grep -E '^\* (Host|Trying|Connected|SSL connection)|^< HTTP'
# * Host example.com:443 was resolved.     <- DNS ok
# *   Trying 203.0.113.10:443...           <- now opening TCP
# * Connected to example.com (...) port 443 <- TCP ok
# * SSL connection using TLSv1.3 / ...      <- TLS ok
# < HTTP/2 200                              <- application ok` },
      { title: 'Works by IP, fails by name', html: `<p>A developer says "the API is down", but <code>curl -k https://203.0.113.10/health</code> answers. If the IP works and the name does not, the network, port and app are fine; only <b>name resolution</b> is broken. Next stop: <code>dig</code> (DNS topic). This one test can save an hour of looking at firewalls. (<code>-k</code> skips certificate checks and is only for this diagnostic; the cert will not match a bare IP.)</p>`, code: R`curl -s -o /dev/null -w '%{http_code}\n' https://api.example.com/health   # fails: exit 6
curl -sk -o /dev/null -w '%{http_code}\n' https://203.0.113.10/health    # 200 -> DNS is the problem
dig +short api.example.com                                                 # empty -> no record / wrong zone` }
    ],
    deepDive: `<p>🟣 <b>OSI vs TCP/IP in the real world.</b> People say "layer 7" (HTTP) and "layer 4" (TCP) using OSI numbers, even though the internet runs TCP/IP. A <b>layer-4 load balancer</b> (AWS NLB, Azure Load Balancer) forwards TCP/UDP connections without reading them; a <b>layer-7</b> one (AWS ALB, Azure Application Gateway) terminates HTTP, reads paths and headers, and returns its own 502/503/504 when targets misbehave.</p>
      <p><b>The link layer in a cloud is virtual.</b> In a VPC there is no real broadcast domain: the hypervisor answers ARP for the gateway itself, broadcast and multicast are not supported by default, and you cannot sniff other instances' traffic. That is why "promiscuous mode" tricks from on-prem networks do not work, and why traffic mirroring is a separate paid feature.</p>
      <p><b>MTU, the hidden layer-2/3 problem.</b> The maximum frame payload is usually 1500 bytes on the internet. Inside an AWS VPC instances use <b>9001</b> (jumbo frames). Traffic that leaves through a VPN, a peering link or the internet must fit 1500 (or less: IPsec adds overhead). Path MTU discovery depends on ICMP "fragmentation needed" messages; if a firewall blocks all ICMP, large packets silently vanish while small ones work. The symptom is famous: SSH logs in, but <code>ls</code> on a big folder hangs, or HTTPS headers arrive but the body never does. Test with <code>ping -M do -s 1472 HOST</code> (1472 + 28 bytes of headers = 1500).</p>
      <p><b>TTL and loops.</b> Every IP packet carries a TTL (time to live) lowered by each router; at zero the router drops it and sends ICMP "time exceeded". traceroute uses exactly this to discover hops. IPv6 calls it hop limit and works the same way.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> an assistant can turn a wall of <code>curl -v</code>, <code>ip route</code> and <code>ss</code> output into "DNS ok, TCP ok, TLS fails on name mismatch" in seconds, and it is good at mapping cryptic errors (<code>curl: (35)</code>, <code>ECONNRESET</code>) to a layer. That makes the first five minutes of a ticket faster.</p>
      <p><b>Where it goes wrong:</b> it often jumps to the most common cause ("open the security group") without evidence, and it may suggest disabling verification (<code>curl -k</code> in production code) or opening <code>0.0.0.0/0</code>. <b>Use it as a partner:</b> paste <i>redacted</i> output (no internal host names, tokens or customer IPs), ask it which layer failed and what single command would confirm it, then run that command yourself. The ladder mental model is what lets you tell a correct suggestion from a confident wrong one.</p>`,
    problems: [P({
      t: 'Five users, one "site down" ticket: which layer?', l: 'Easy', tags: ['tcp/ip', 'triage', 'curl'], co: ['AWS Support', 'Microsoft'],
      s: `<p>A ticket for <code>portal.example.com</code> has five replies. Classify each by the failing layer and name the first command you would run:</p><ol><li><code>curl: (6) Could not resolve host: portal.example.com</code></li><li><code>curl: (7) Failed to connect to portal.example.com port 443: Connection refused</code></li><li><code>curl: (28) Connection timed out after 10001 milliseconds</code></li><li><code>curl: (60) SSL certificate problem: certificate has expired</code></li><li><code>HTTP/1.1 503 Service Unavailable</code> from the load balancer</li></ol>`,
      ex: `<p>Reply 1 → ${H.c('y', 'DNS')} → <code>dig portal.example.com</code>. Reply 3 → ${H.c('r', 'packets dropped')} → check security group / route. Reply 5 → ${H.c('b', 'application')} → target health on the load balancer.</p>`,
      bw: `<p>Treating all five as one problem and restarting the web server. A restart fixes none of DNS, firewall drops or an expired certificate, and it hides evidence for the one case (503) where the app might be involved.</p>`,
      q: ['Which reply proves the network path and TCP port are fine?', ['The 503 from the load balancer', 'Could not resolve host', 'Connection timed out', 'Connection refused'], 0, 'To receive an HTTP 503 at all, DNS, routing, TCP and TLS to the load balancer must have worked. The failure is behind it: no healthy targets.'],
      h: ['<p>Hint 1: curl exit codes map to layers: 6 = DNS, 7 = TCP connect refused or unreachable, 28 = timeout, 35/60 = TLS, and a status code means HTTP itself answered.</p>', '<p>Hint 2: "refused" means a reply came back (TCP RST). "Timed out" means no reply at all. They point to different causes.</p>', '<p>Hint 3: for each reply, write: layer, what it proves works, first command. Then group users by layer to see if this is one incident or several.</p>'],
      a: `<p><b>1 - DNS (application).</b> Nothing below was even tried. Run <code>dig portal.example.com</code> and <code>dig @1.1.1.1 portal.example.com</code> to tell a missing record from a broken local resolver. <b>2 - Transport.</b> The host answered with a reset, so routing and firewalls let the packet in; nothing listens on 443 there (service down, wrong port, or the app is bound to 127.0.0.1). Run <code>nc -vz portal.example.com 443</code>, then <code>ss -tlnp</code> on the server. <b>3 - Packets dropped.</b> Security group, network ACL, host firewall, or a wrong route; also check whether DNS points this user at an old IP. Run <code>nc -vz -w 5</code> and look at the security group inbound rules. <b>4 - TLS.</b> Network fine; the certificate expired. Run <code>openssl s_client -connect portal.example.com:443 -servername portal.example.com | openssl x509 -noout -dates</code>. <b>5 - Application.</b> Everything up to the load balancer works; it has no healthy targets. Check target health and app logs. Conclusion: likely two or three separate issues (an expired cert and an unhealthy target group can both follow a bad deploy), so reply to each user with the layer-specific next step.</p>`,
      code: R`H=portal.example.com
dig +short "$H"                                   # 1: DNS answer? empty = no record
nc -vz -w 5 "$H" 443                              # 2/3: refused (fast) vs timed out (slow)
echo | openssl s_client -connect "$H:443" -servername "$H" 2>/dev/null | openssl x509 -noout -dates   # 4: notAfter
curl -s -o /dev/null -w 'status=%{http_code}\n' "https://$H/"                                    # 5: HTTP status`,
      cx: `<p>Four quick commands, under a minute. Each one isolates one layer, so you never test the same thing twice.</p>`,
      f: ['Could replies 2 and 3 come from the same root cause for two different users?', 'Which of these would a CDN in front of the site change?']
    })]
  });

  // ───────────────────────── Topic 2: ports, listening, refused vs timeout ─────────────────────────
  topics.push({
    title: 'Ports and Listening Sockets: "Connection Refused" vs "Timed Out"',
    analogy: `<p>A server is an <b>office building with numbered doors</b>. The IP address gets you to the building; the <b>port</b> is the door number. Knock on door 443 and someone opens it: connected. Knock on a door where nobody works and a voice says <b>"nobody here"</b> straight away: that is <b>Connection refused</b>. But if a guard at the gate (a firewall) quietly ignores you, you stand there waiting in silence until you give up: that is a <b>timeout</b>. The fast "no" and the slow silence mean completely different things.</p>`,
    explain: `<p>🟢 <b>A port is a number from 1 to 65535</b> that picks one program on a machine. A server program <b>listens</b> on a port; a client connects from a random high <b>ephemeral</b> port. One TCP connection is identified by five things: protocol, source IP, source port, destination IP, destination port (the <b>5-tuple</b>). Ports you must know by heart as a cloud engineer:</p>
      ${H.table(['Port', 'Service', 'Support note'], [
        ['22/tcp', 'SSH', 'never open to 0.0.0.0/0; prefer a bastion or a session manager'],
        ['53/udp + 53/tcp', 'DNS', 'TCP is used for large answers, so allow both'],
        ['80/tcp, 443/tcp', 'HTTP, HTTPS', '443/udp too if you serve HTTP/3 (QUIC)'],
        ['3389/tcp', 'RDP (Windows)', 'same rule as SSH'],
        ['3306, 5432, 1433', 'MySQL, PostgreSQL, SQL Server', 'only from the app tier, never the internet'],
        ['6379, 27017', 'Redis, MongoDB', 'many data leaks were these ports left open'],
        ['25/tcp', 'SMTP', 'cloud providers throttle or block outbound 25 by default'],
        ['123/udp', 'NTP (time)', 'wrong time breaks TLS and logins'],
        ['32768-60999', 'Linux ephemeral range', 'return traffic; matters for stateless NACLs']
      ])}
      <p>🟢 <b>Listening address matters as much as the port.</b> <code>127.0.0.1:8080</code> accepts only connections from the same machine. <code>0.0.0.0:8080</code> (or <code>[::]:8080</code>, <code>*:8080</code>) accepts them on every interface. A fresh app that "works on the server but not from my laptop" is very often bound to 127.0.0.1.</p>
      <p>🔵 <b>Read <code>ss</code> output.</b> <code>sudo ss -tlnp</code> = TCP, listening, numeric, with process. A line like <code>LISTEN 0 511 0.0.0.0:443 0.0.0.0:* users:(("nginx",pid=812,fd=6))</code> tells you who, which address and which port.</p>
      <p>🔵 <b>What the client sees, and what it means.</b> This table is the heart of half of all network tickets:</p>
      ${H.table(['Client sees', 'What happened on the wire', 'Usually means'], [
        ['<b class="c-g">Connected</b>', 'SYN → SYN-ACK → ACK', 'path and listener fine; problem (if any) is higher up'],
        ['<b class="c-r">Connection refused</b> (fast)', 'SYN → <b>RST</b>', 'host reachable, <b>nothing listening</b> on that port/address, or a firewall set to REJECT'],
        ['<b class="c-y">Timed out</b> (slow)', 'SYN → (silence), retries, give up', 'packets <b>dropped</b>: security group, NACL, host firewall DROP, no route, host off'],
        ['<b>No route to host</b>', 'SYN → ICMP host unreachable', 'host firewall REJECT with ICMP, or the host is down on the local subnet'],
        ['<b>Connection reset by peer</b> (after connecting)', 'connected, later RST', 'app crashed mid-request, idle timeout on a load balancer or NAT, or protocol mismatch']
      ])}`,
    clues: [
      '"Connection refused" → the packet arrived; check the listener: <code>ss -tlnp</code>, service status, bind address, port number',
      '"timed out" / "hangs then fails" → something drops packets: security group, NACL, host firewall, route, or the DNS name points at an old IP',
      '"works with curl localhost on the server, not from outside" → app bound to 127.0.0.1, or a firewall in between',
      '"EADDRINUSE / address already in use" → another process owns the port: <code>ss -ltnp \'sport = :PORT\'</code>',
      '"which port does X use?" → know 22, 53, 80, 443, 3389, 3306, 5432, 6379, and that DNS needs TCP too',
      '"connection reset after 350 seconds idle" → a NAT or load balancer idle timeout; use keepalives'
    ],
    code: [R`# Lab: docker run -it --rm ubuntu:24.04 bash
apt-get update -qq && apt-get install -y -qq python3 curl iproute2 netcat-openbsd > /dev/null

# 1. Start a tiny web server bound to localhost only, in the background
python3 -m http.server 8000 --bind 127.0.0.1 > /tmp/http.log 2>&1 &
sleep 1
ss -tlnp                                   # LISTEN ... 127.0.0.1:8000 ... users:(("python3",...))

# 2. Connected: right address, right port
curl -sI http://127.0.0.1:8000/ | head -n 1     # HTTP/1.0 200 OK

# 3. Refused: same host, port with no listener -> instant RST
curl -sS http://127.0.0.1:8001/ ; echo "exit=$?"  # Connection refused, exit=7
nc -vz 127.0.0.1 8001                            # nc: connect ... failed: Connection refused

# 4. Timeout: an address where nobody answers (TEST-NET-1 documentation range)
curl -sS --connect-timeout 3 http://192.0.2.1/ ; echo "exit=$?"   # timed out, exit=28
nc -vz -w 3 192.0.2.1 80                                         # timed out after 3 s

# 5. Without curl or nc: bash can open TCP connections itself
timeout 3 bash -c 'exec 3<>/dev/tcp/127.0.0.1/8000' && echo "port 8000 open"`],
    codeTitle: ['Produce "connected", "refused" and "timed out" yourself'],
    viz: [{
      title: 'What will the client see? Follow one SYN packet',
      input: 'from=remote bind=127.0.0.1 listen=8080 dport=8080 sg=allow hostfw=accept app=up',
      inputLabel: 'from=local|remote bind=0.0.0.0|127.0.0.1 listen=PORT dport=PORT sg=allow|deny hostfw=accept|drop|reject app=up|down',
      gen: function (input) {
        var o = { from: 'remote', bind: '0.0.0.0', listen: '8080', dport: '8080', sg: 'allow', hostfw: 'accept', app: 'up' };
        String(input || '').trim().split(/\s+/).filter(Boolean).forEach(function (kv) {
          var m = kv.match(/^(\w+)=(\S+)$/);
          if (!m || !(m[1] in o)) throw new Error('Use key=value with keys: from bind listen dport sg hostfw app');
          o[m[1]] = m[2].toLowerCase();
        });
        if (['local', 'remote'].indexOf(o.from) < 0) throw new Error('from must be local or remote');
        if (['0.0.0.0', '127.0.0.1'].indexOf(o.bind) < 0) throw new Error('bind must be 0.0.0.0 or 127.0.0.1');
        if (!/^\d{1,5}$/.test(o.listen) || !/^\d{1,5}$/.test(o.dport) || +o.listen > 65535 || +o.dport > 65535 || +o.dport < 1) throw new Error('listen and dport must be ports 1-65535');
        if (['allow', 'deny'].indexOf(o.sg) < 0) throw new Error('sg must be allow or deny');
        if (['accept', 'drop', 'reject'].indexOf(o.hostfw) < 0) throw new Error('hostfw must be accept, drop or reject');
        if (['up', 'down'].indexOf(o.app) < 0) throw new Error('app must be up or down');
        var remote = o.from === 'remote';
        var nodes = [box('C', remote ? 'laptop 198.51.100.7' : 'same VM (curl)', 8, 20, 20), box('SG', 'security group', 34, 20, 18), box('FW', 'host firewall', 58, 20, 18), box('K', 'kernel sockets', 82, 20, 18)];
        var edges = [['C', 'SG'], ['SG', 'FW'], ['FW', 'K']];
        function g(hl, ehl) { return { type: 'graph', directed: true, height: 40, nodes: nodes, edges: edges, hl: hl || {}, ehl: ehl || {} }; }
        var st = { from: o.from, bind: o.bind + ':' + o.listen, 'client dials': 'port ' + o.dport, sg: o.sg, 'host fw': o.hostfw, app: o.app };
        var f = [];
        f.push({ narr: 'The client (' + (remote ? 'a laptop on the internet' : 'curl on the same VM') + ') runs <code>curl http://SERVER:' + o.dport + '/</code>. TCP starts with a <b>SYN</b> packet: "may I connect to port ' + o.dport + '?" Watch where it goes and what comes back.', parts: [g({ C: 'cur' }), { type: 'vars', label: 'scenario', vals: st }] });
        var outcome, why, cls;
        if (remote && o.sg === 'deny') {
          f.push({ narr: 'The <b>security group</b> has no inbound rule allowing tcp/' + o.dport + ' from this source. Security groups never answer: they <b>silently drop</b>. The client hears nothing.', parts: [g({ SG: 'bad' }, { 'C-SG': 'bad' })] });
          outcome = 'Connection timed out'; cls = 'bad'; why = 'A drop gives no reply, so the client retries the SYN (1 s, 2 s, 4 s ...) and finally gives up. Timeouts point to a firewall, a NACL or a route, never to the app.';
        } else {
          if (remote) f.push({ narr: 'The security group has a rule for tcp/' + o.dport + ', so the SYN passes. (A local curl would not cross the security group at all.)', parts: [g({ SG: 'ok' }, { 'C-SG': 'ok' })] });
          else f.push({ narr: 'Traffic from the VM to itself never leaves the machine, so the cloud security group is <b>not involved</b>. This is why "it works locally" proves little about outside access.', parts: [g({ SG: 'done' })] });
          if (o.hostfw === 'drop' && remote) {
            f.push({ narr: 'The <b>host firewall</b> (ufw, firewalld, nftables) has a DROP rule for this port. Like a security group, a DROP is silent.', parts: [g({ FW: 'bad' }, { 'SG-FW': 'bad' })] });
            outcome = 'Connection timed out'; cls = 'bad'; why = 'Same symptom as a security group block, different place. Check both: cloud console and <code>sudo nft list ruleset</code> / <code>ufw status</code>.';
          } else if (o.hostfw === 'reject' && remote) {
            f.push({ narr: 'The host firewall has a <b>REJECT</b> rule. Unlike DROP, REJECT answers at once with an ICMP error or a TCP reset.', parts: [g({ FW: 'bad' }, { 'SG-FW': 'ok' })] });
            outcome = 'Connection refused / No route to host'; cls = 'bad'; why = 'A fast failure even though the app may be running. The ICMP type decides the wording (port-unreachable reads as refused, host-prohibited as "No route to host"). Do not assume the app is down until you check <code>ss</code> on the server.';
          } else {
            f.push({ narr: remote ? 'The host firewall accepts the packet. It reaches the kernel\'s TCP stack.' : 'The packet goes straight to the kernel\'s TCP stack on the loopback interface.', parts: [g({ FW: 'ok' }, { 'SG-FW': 'ok' })] });
            var listening = o.app === 'up' && o.listen === o.dport;
            var addrOk = !remote || o.bind === '0.0.0.0';
            if (!listening) {
              var reason = o.app === 'down' ? 'the app is not running, so no socket listens anywhere' : 'the app listens on ' + o.listen + ', but the client dialed ' + o.dport;
              f.push({ narr: 'The kernel looks for a socket listening on port ' + o.dport + ' and finds none: ' + reason + '. It replies with a TCP <b>RST</b> (reset).', parts: [g({ K: 'bad' }, { 'FW-K': 'ok' }), { type: 'table', label: 'ss -tlnp on the server', columns: ['State', 'Local Address:Port', 'Process'], rows: o.app === 'up' ? [['LISTEN', o.bind + ':' + o.listen, 'app']] : [['(nothing on ' + o.dport + ')', '', '']], hl: { 0: 'bad' } }] });
              outcome = 'Connection refused'; cls = 'bad'; why = 'Refused is good news for the network: the path works end to end. The fix is on the server: start the service, or use the right port.';
            } else if (!addrOk) {
              f.push({ narr: 'A socket listens on port ' + o.listen + ', but only on <b>127.0.0.1</b>. The SYN arrived on the public/private interface address, which has no listener, so the kernel sends <b>RST</b>.', parts: [g({ K: 'bad' }, { 'FW-K': 'ok' }), { type: 'table', label: 'ss -tlnp on the server', columns: ['State', 'Local Address:Port', 'Process'], rows: [['LISTEN', '127.0.0.1:' + o.listen, 'app']], hl: { 0: 'bad' } }] });
              outcome = 'Connection refused'; cls = 'bad'; why = 'Classic new-app bug: it works with curl on the box and fails from everywhere else. Change the bind address to 0.0.0.0 (and keep the security group tight).';
            } else {
              f.push({ narr: 'A socket listens on ' + o.bind + ':' + o.listen + '. The kernel replies <b>SYN-ACK</b>, the client sends <b>ACK</b>: the three-way handshake is done.', parts: [g({ K: 'ok' }, { 'C-SG': 'ok', 'SG-FW': 'ok', 'FW-K': 'ok' }), { type: 'table', label: 'ss -tlnp on the server', columns: ['State', 'Local Address:Port', 'Process'], rows: [['LISTEN', o.bind + ':' + o.listen, 'app']], hl: { 0: 'ok' } }] });
              outcome = 'Connected'; cls = 'ok'; why = 'Transport is fine. If the user still has a problem, move up the ladder: TLS, then the HTTP status and app logs.';
            }
          }
        }
        f.push({ narr: 'Result: <b>' + outcome + '</b>. ' + why, parts: [{ type: 'table', label: 'what the client prints', columns: ['tool', 'output'], rows: [['curl', outcome === 'Connected' ? 'HTTP response (status code)' : 'curl: (' + (outcome.indexOf('timed') >= 0 ? '28) Connection timed out' : '7) Failed to connect: ' + outcome) + ')'], ['nc -vz', outcome === 'Connected' ? 'succeeded!' : outcome], ['time taken', outcome.indexOf('timed') >= 0 ? 'seconds to minutes' : 'milliseconds']], hl: { 0: cls } }] });
        f.push({ narr: 'Try other inputs: <code>sg=deny</code> (timeout), <code>bind=0.0.0.0</code> (connected), <code>app=down</code> (refused), <code>hostfw=reject</code> (fast failure with the app up). The <b>speed</b> of the failure is itself a clue.', parts: [{ type: 'table', label: 'cheat sheet', columns: ['symptom', 'look at'], rows: [['refused (fast)', 'listener: ss -tlnp, service status, port, bind address, REJECT rules'], ['timeout (slow)', 'security group, NACL, host firewall DROP, route, DNS pointing at an old IP'], ['connected', 'go up a layer: TLS and HTTP']] }] });
        return f;
      }
    }],
    examples: [
      { title: 'Works on the server, refused from outside: bound to 127.0.0.1', html: `<p>A developer deploys a Node API on port 3000. <code>curl localhost:3000</code> on the VM works. From the office: <code>Connection refused</code>, instantly. The instant refusal says the packet reached the VM, so the security group is fine. <code>ss -tlnp</code> shows ${H.c('r', '127.0.0.1:3000')}: the app only listens on loopback. Fix the bind address (often a <code>HOST</code> env var or <code>app.listen(3000, '0.0.0.0')</code>), or better, keep it on loopback and put nginx in front on 443.</p>`, code: R`sudo ss -tlnp 'sport = :3000'
# LISTEN 0 511 127.0.0.1:3000 0.0.0.0:* users:(("node",pid=2201,fd=21))   <- loopback only
# after changing HOST=0.0.0.0 and restarting:
# LISTEN 0 511   0.0.0.0:3000 0.0.0.0:* users:(("node",pid=2290,fd=21))` },
      { title: 'Timeout to a database: the security group, not the database', html: `<p>An app server cannot reach PostgreSQL on <code>10.0.3.20:5432</code>; the error is <code>timeout expired</code> after 30 seconds. A timeout means silence, so something dropped the packet. The database is running (<code>ss</code> on the DB host shows <code>0.0.0.0:5432</code>). The DB security group allows 5432 only from the old app subnet ${H.c('r', '10.0.1.0/24')}, but the new app server is in ${H.c('y', '10.0.2.0/24')}. Better fix than adding a CIDR: allow 5432 from the <b>app security group</b> itself (security-group referencing), so new app servers are covered automatically.</p>`, code: R`# From the app server: prove it is a drop, not a refusal
nc -vz -w 5 10.0.3.20 5432        # ... timed out  (a refusal would be instant)
# On the DB server: prove the database listens on a reachable address
sudo ss -tlnp 'sport = :5432'      # LISTEN 0 244 0.0.0.0:5432 ... postgres` },
      { title: 'Fast failure, but the app is up: a REJECT rule', html: `<p>On a RHEL-family VM, <code>curl</code> from another host fails at once with <code>No route to host</code>, although <code>ss</code> shows nginx on <code>0.0.0.0:80</code>. "No route to host" with a working ping usually means a <b>host firewall REJECT</b> (firewalld's default answer is an ICMP "host prohibited" message). Open the service in firewalld rather than turning the firewall off.</p>`, code: R`sudo firewall-cmd --list-all                 # services: ssh dhcpv6-client   (no http)
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --reload
sudo firewall-cmd --list-services            # ssh dhcpv6-client http` },
      { title: 'Check a port with nothing installed', html: `<p>Minimal container images often have no <code>nc</code>, <code>telnet</code> or <code>curl</code>. Bash itself can open a TCP connection through the special path <code>/dev/tcp/HOST/PORT</code>. Wrap it in <code>timeout</code> so a dropped packet does not hang your shell for two minutes.</p>`, code: R`check() { timeout 3 bash -c "exec 3<>/dev/tcp/$1/$2" 2>/dev/null && echo "$1:$2 open" || echo "$1:$2 closed or filtered"; }
check 127.0.0.1 22
check db.internal.example.com 5432` }
    ],
    deepDive: `<p>🟣 <b>How long is a timeout?</b> Linux retries an unanswered SYN <code>net.ipv4.tcp_syn_retries</code> times (default 6) with doubling gaps: 1 + 2 + 4 + 8 + 16 + 32 + 64 = about <b>127 seconds</b> before <code>connect()</code> fails. Most tools set their own shorter limit (<code>curl --connect-timeout</code>, <code>nc -w</code>), which is why the same block shows as "28 seconds" in one tool and "2 minutes" in another.</p>
      <p><b>Ephemeral ports and exhaustion.</b> Each outgoing connection needs a free source port; Linux uses <code>32768-60999</code> (<code>/proc/sys/net/ipv4/ip_local_port_range</code>). A busy proxy that opens thousands of short connections to <b>one</b> backend can run out, especially with sockets stuck in <code>TIME_WAIT</code> (about 60 s on Linux). Symptoms: <code>EADDRNOTAVAIL</code>, "cannot assign requested address". Fixes: connection pooling and keep-alive first, then widening the range. A NAT gateway has the same limit per destination: AWS NAT Gateway supports about 55,000 simultaneous connections to each unique destination IP, port and protocol.</p>
      <p><b>UDP is different.</b> UDP has no handshake, so there is no "connected" or "refused" in the TCP sense. A closed UDP port may answer with ICMP port-unreachable, but firewalls usually drop that, so <code>nc -vzu</code> often reports "succeeded" for ports that are not open. Test UDP services with a real client (<code>dig</code> for DNS, <code>chronyc</code> for NTP).</p>
      <p><b>Resets after connecting.</b> A load balancer, NAT or firewall that forgets an idle connection (AWS NAT Gateway: 350 s idle timeout; ALB default 60 s) will drop or reset the next packet. Long-lived database or SSH connections then fail "randomly". TCP keepalives or application pings shorter than the idle timeout fix it.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> pasting an error like <code>ECONNREFUSED 10.0.3.20:5432</code> into an assistant gets you a decent checklist, and it can write a port-check script for a fleet in seconds. It also explains <code>ss</code> columns well.</p>
      <p><b>Where it goes wrong:</b> it blurs "refused" and "timed out" and suggests opening the security group for both, even though a refusal proves the security group already let the packet in. It may also suggest binding everything to 0.0.0.0 and opening the port to the world as "the fix". <b>Your job:</b> use the refused-vs-timeout distinction to reject the wrong half of the advice, and keep the change minimal: the right bind address, the right source in the rule, one port.</p>`,
    problems: [P({
      t: 'Two tickets: one refused, one timed out', l: 'Easy', tags: ['ports', 'ss', 'nc', 'security groups'], co: ['AWS Support', 'Accenture'],
      s: `<p>Ticket A: "From my laptop, <code>curl http://203.0.113.40:8080</code> fails instantly with <i>Connection refused</i>." Ticket B: "From the app server, <code>psql -h 10.0.3.20</code> hangs for 30 s, then <i>timeout expired</i>." For each: what does the symptom prove, what does it rule out, and what are your exact next steps?</p>`,
      ex: `<p>A: ${H.c('g', 'packet reached the VM')} → check ${H.c('y', 'ss -tlnp')} on the server (nothing on 8080, or bound to 127.0.0.1). B: ${H.c('r', 'packet dropped')} → check the DB security group, NACL and route; the DB process is probably fine.</p>`,
      bw: `<p>Giving both tickets the same answer, such as "open port in the security group" or "restart the service". For A the security group is already passing traffic; for B restarting PostgreSQL changes nothing because packets never reach it.</p>`,
      q: ['Ticket A got an instant "Connection refused". Which cause is now unlikely?', ['A security group silently blocking port 8080', 'Nothing listening on port 8080', 'The app bound to 127.0.0.1 only', 'A host firewall REJECT rule'], 0, 'Security groups only drop; they never send a reset. An instant refusal means something on the host answered, so look at the listener or a REJECT rule.'],
      h: ['<p>Hint 1: refusal = a reply (TCP RST or ICMP). Timeout = no reply at all. Ask "who could have sent that reply?"</p>', '<p>Hint 2: for A, run <code>ss -tlnp</code> on the server and look at both port and address. For B, run <code>nc -vz -w 5 10.0.3.20 5432</code> to confirm the drop without the database client.</p>', '<p>Hint 3: for B, check the DB security group source (CIDR or referenced group), the subnet NACLs both ways, and the route tables. Also check that the name or IP is current.</p>'],
      a: `<p><b>Ticket A (refused).</b> The SYN crossed the internet, the security group and any NACL, and reached the VM; the VM answered with a reset. So networking is fine. On the server: <code>sudo ss -tlnp 'sport = :8080'</code>. Cases: nothing listening (service crashed or not started: <code>systemctl status</code>, journal), listening on <code>127.0.0.1:8080</code> (fix bind address), listening on another port (fix config or URL), or a host firewall REJECT (<code>nft list ruleset</code>). <b>Ticket B (timeout).</b> No reply at all, so something dropped the SYN. Check in order: DB security group inbound 5432 from the app server's security group or subnet; NACLs on both subnets (inbound 5432 and outbound ephemeral return ports); route tables if the two are in different VPCs (peering routes); the DB host firewall; and that 10.0.3.20 is still the DB's address. Confirm with <code>nc -vz -w 5</code> before and after the fix, then let the user retry psql.</p>`,
      code: R`# Ticket A - on the server 203.0.113.40
sudo ss -tlnp 'sport = :8080'              # empty -> not running; 127.0.0.1:8080 -> wrong bind address
systemctl status myapp --no-pager | head -n 5
sudo nft list ruleset 2>/dev/null | grep -n 8080 || true   # any REJECT rule for 8080?

# Ticket B - on the app server
nc -vz -w 5 10.0.3.20 5432                 # "timed out" confirms a silent drop
ip route get 10.0.3.20                     # is there a route, and via which gateway?
# Then in the console or CLI: DB security group inbound tcp/5432 from the app security group,
# and subnet NACLs both ways (5432 in, 1024-65535 out for the replies).`,
      cx: `<p>Minutes. The refused/timeout split removes half the possible causes before you touch anything.</p>`,
      f: ['Why might a timeout really be a DNS problem?', 'How would VPC Flow Logs show the difference between the two tickets?']
    })]
  });

  // ───────────────────────── Topic 3: DNS records and resolution ─────────────────────────
  topics.push({
    title: 'DNS Records and Resolution: Why a Site Resolves Here but Not There',
    analogy: `<p>DNS is the internet's <b>phone book with sticky notes</b>. You want the number for "Example Shop". You ask your <b>receptionist</b> (the recursive resolver). If she does not know, she asks the city directory (root), which sends her to the ".com" directory, which sends her to Example Shop's own front desk (the authoritative server). She writes the number on a <b>sticky note</b> that says "valid for 5 minutes" (the TTL) so next time she answers at once. If the shop changes its number, anyone holding an old sticky note keeps dialling the old number until the note expires. That single idea explains most DNS tickets.</p>`,
    explain: `<p>🟢 <b>Records you will meet every week.</b> A <b>zone</b> (like <code>example.com</code>) is a list of records. Each record has a name, a type, a value and a <b>TTL</b> in seconds.</p>
      ${H.table(['Type', 'Maps', 'Example value', 'Cloud support note'], [
        ['<b>A</b>', 'name → IPv4', '<code>203.0.113.10</code>', 'the most common record'],
        ['<b>AAAA</b>', 'name → IPv6', '<code>2001:db8::10</code>', 'clients prefer it if present: a broken AAAA breaks some users only'],
        ['<b>CNAME</b>', 'name → another name', '<code>shop-lb-123.elb.example.net.</code>', 'not allowed at the zone apex; cannot sit next to other records of the same name'],
        ['<b>Alias / ALIAS</b>', 'apex → cloud resource', 'Route 53 alias to a load balancer', 'provider feature that solves "CNAME at the apex"'],
        ['<b>MX</b>', 'mail for a domain', '<code>10 mail.example.com.</code>', 'lower number = higher priority'],
        ['<b>TXT</b>', 'free text', '<code>"v=spf1 include:... -all"</code>', 'SPF, DKIM, domain ownership checks for certificates'],
        ['<b>NS</b>', 'who is authoritative', '<code>ns-1.example-dns.net.</code>', 'must match at the registrar, or changes "do nothing"'],
        ['<b>SOA</b>', 'zone metadata', 'serial, refresh, negative TTL', 'its last field sets how long "does not exist" is cached'],
        ['<b>PTR</b>', 'IP → name (reverse)', '<code>10.113.0.203.in-addr.arpa.</code>', 'mail servers check it'],
        ['<b>CAA</b>', 'which CAs may issue certs', '<code>0 issue "letsencrypt.org"</code>', 'a wrong CAA blocks certificate renewal']
      ])}
      <p>🟢 <b>How a lookup really travels.</b> Your app calls the OS <b>stub resolver</b>. The OS checks <code>/etc/hosts</code> first (see <code>/etc/nsswitch.conf</code>), then asks the configured <b>recursive resolver</b> (in <code>/etc/resolv.conf</code>; on Ubuntu that is the local systemd-resolved stub at <code>127.0.0.53</code>, which forwards to the real one). The recursive resolver walks root → TLD → authoritative if the answer is not cached. <b>Every layer caches</b>: the browser, the OS, the resolver, and some apps (the JVM) too.</p>
      <p>🔵 <b>The tools.</b></p>
      ${H.table(['Command', 'Answers'], [
        ['<code>dig example.com</code>', 'full answer with TTL, flags and which server replied'],
        ['<code>dig +short example.com</code>', 'just the values, good for scripts'],
        ['<code>dig @1.1.1.1 example.com</code>', 'ask a specific resolver: is it my resolver or the record?'],
        ['<code>dig @ns-1.example-dns.net example.com</code>', 'ask the authoritative server directly: the truth right now, no cache'],
        ['<code>dig +trace example.com</code>', 'walk root → TLD → authoritative yourself'],
        ['<code>dig -x 203.0.113.10</code>', 'reverse lookup (PTR)'],
        ['<code>getent hosts example.com</code>', 'what <b>applications</b> see: honours <code>/etc/hosts</code>, unlike dig'],
        ['<code>resolvectl status</code> / <code>resolvectl flush-caches</code>', 'which resolver Ubuntu uses; clear its cache']
      ])}
      <p>🔵 <b>The golden rule for "works here, not there":</b> compare the <b>authoritative</b> answer with what each machine's resolver returns, and read the TTL. If they differ, someone is serving a cached (old) answer, and the TTL tells you how long it can last.</p>`,
    clues: [
      '"resolves on my machine but not on the customer\'s" / "some users still hit the old server" → caching: compare authoritative answer vs each resolver, read the TTL',
      '"we changed the DNS record an hour ago and nothing happened" → wrong zone or NS mismatch at the registrar, or a high TTL',
      '"NXDOMAIN" right after creating a record → negative caching (SOA minimum) from an earlier failed lookup',
      '"works in the browser but not in the app / container" → <code>/etc/hosts</code>, different resolver, or app-level DNS cache (JVM)',
      '"can I put a CNAME on example.com?" → not at the apex: use an alias/ALIAS record or A records',
      '"inside the VPC the name gives a private IP, outside a public one" → split-horizon / private hosted zone'
    ],
    code: [R`# Lab: docker run -it --rm ubuntu:24.04 bash
apt-get update -qq && apt-get install -y -qq dnsutils > /dev/null

# 1. A full answer: read the ANSWER section, the TTL column and the SERVER line
dig example.com
dig +noall +answer example.com            # just the answer lines: name TTL class type value

# 2. Other record types
dig +short example.com AAAA
dig +short example.com NS
dig +short example.com MX
dig +short example.com TXT
dig +short example.com SOA                # serial refresh retry expire negative-TTL

# 3. Ask a specific resolver, then the authoritative server itself (no cache in the way)
dig +short @1.1.1.1 example.com
NS1=$(dig +short example.com NS | head -n 1)
dig +noall +answer @"$NS1" example.com     # the authoritative TTL is the full TTL

# 4. Walk the tree yourself: root -> .com -> example.com
dig +trace example.com | grep -E 'IN\s+(NS|A)\s' | head -n 12

# 5. dig ignores /etc/hosts, applications do not
echo '192.0.2.50 example.com' >> /etc/hosts
dig +short example.com                    # still the real address
getent hosts example.com                  # 192.0.2.50  <- what curl and your app would use
sed -i '/192.0.2.50 example.com/d' /etc/hosts`],
    codeTitle: ['dig, getent and /etc/hosts side by side'],
    viz: [{
      title: 'Two laptops, one record change, and the TTL',
      input: 'ttl=300 change=120 A=10,200,330 B=150,460',
      inputLabel: 'ttl=SECONDS change=WHEN_RECORD_CHANGES A=query times B=query times (seconds)',
      gen: function (input) {
        var o = {}; String(input || '').trim().split(/\s+/).filter(Boolean).forEach(function (kv) {
          var m = kv.match(/^(ttl|change|A|B)=([\d,]+)$/);
          if (!m) throw new Error('Format: ttl=300 change=120 A=10,200 B=150');
          o[m[1]] = m[2];
        });
        var ttl = Number(o.ttl || 300), change = Number(o.change || 120);
        if (!(ttl > 0 && ttl <= 86400)) throw new Error('ttl must be 1-86400 seconds');
        var qs = [];
        ['A', 'B'].forEach(function (who) { String(o[who] || '').split(',').filter(Boolean).forEach(function (t) { qs.push({ who: who, t: Number(t) }); }); });
        if (!qs.length || qs.length > 12) throw new Error('Give 1-12 query times in total, e.g. A=10,200 B=150');
        qs.sort(function (a, b) { return a.t - b.t || (a.who < b.who ? -1 : 1); });
        var OLD = '198.51.100.10 (old)', NEW = '203.0.113.20 (new)';
        var cache = { A: null, B: null }; // {val, exp}
        var res = { A: 'office resolver', B: 'home ISP resolver' };
        function cacheRows(t) {
          return ['A', 'B'].map(function (w) { var c = cache[w]; return ['laptop ' + w + ' via ' + res[w], c ? c.val : '(empty)', c ? (c.exp > t ? (c.exp - t) + ' s left' : 'expired') : '-']; });
        }
        var f = [];
        f.push({ narr: 'Setup: <code>shop.example.com</code> has an A record with <b>TTL ' + ttl + ' s</b>. At <b>t=' + change + ' s</b> an engineer moves the site to a new server and updates the record. Laptop A uses the office resolver; laptop B uses its home ISP resolver. Each resolver has its own cache.', parts: [
          { type: 'table', label: 'authoritative record over time', columns: ['time', 'shop.example.com A', 'TTL'], rows: [['t < ' + change, OLD, String(ttl)], ['t ≥ ' + change, NEW, String(ttl)]] },
          { type: 'table', label: 'resolver caches', columns: ['who', 'cached answer', 'remaining'], rows: cacheRows(0) }
        ] });
        qs.forEach(function (q) {
          var c = cache[q.who], truth = q.t < change ? OLD : NEW, narr, hit;
          if (c && c.exp > q.t) {
            hit = true;
            narr = 't=' + q.t + ' s: laptop ' + q.who + ' asks. Its resolver has a <b>fresh cached</b> answer (' + (c.exp - q.t) + ' s left), so it answers <b>' + c.val + '</b> without asking anyone. ' + (c.val !== truth ? '<span class="c-r">That is stale</span>: the real record is already ' + truth + '. This user still reaches the old server.' : 'That is still correct.');
          } else {
            hit = false;
            cache[q.who] = { val: truth, exp: q.t + ttl };
            narr = 't=' + q.t + ' s: laptop ' + q.who + ' asks. ' + (c ? 'The cached entry has <b>expired</b>, so the' : 'Cache is empty, so the') + ' resolver goes to the authoritative server and gets <b>' + truth + '</b>, then caches it until t=' + (q.t + ttl) + '.';
          }
          f.push({ narr: narr, parts: [
            { type: 'graph', directed: true, height: 36, nodes: [box('L', 'laptop ' + q.who, 10, 18, 14), box('R', res[q.who], 40, 18, 22), box('AU', 'authoritative NS', 80, 18, 22)], edges: hit ? [['L', 'R']] : [['L', 'R'], ['R', 'AU']], hl: hit ? { R: cache[q.who].val !== truth ? 'bad' : 'ok' } : { AU: 'ok' }, ehl: hit ? { 'L-R': 'cur' } : { 'L-R': 'cur', 'R-AU': 'ok' } },
            { type: 'table', label: 'resolver caches after this query', columns: ['who', 'cached answer', 'remaining'], rows: cacheRows(q.t), hl: one(q.who === 'A' ? 0 : 1, hit && cache[q.who].val !== truth ? 'bad' : 'ok') }
          ] });
        });
        f.push({ narr: 'Lesson: after a change, a resolver can keep serving the old answer for <b>up to one full TTL</b> from the moment it last cached it. Two people can see different answers at the same time, and both are "right" from their resolver\'s point of view. Before a planned migration, <b>lower the TTL</b> (for example to 60 s) at least one old TTL in advance, make the change, then raise it again.', parts: [
          { type: 'table', label: 'how to prove it in a ticket', columns: ['command', 'shows'], rows: [['dig @AUTHORITATIVE shop.example.com', 'the truth right now (full TTL)'], ['dig shop.example.com (on each machine)', 'what that machine\'s resolver serves, and the TTL counting down'], ['resolvectl flush-caches / ipconfig /flushdns', 'clears only the local OS cache, not the ISP resolver']] }
        ] });
        if (f.length < 4) f.push({ narr: 'Add more query times (for example <code>A=10,200,330 B=150,460</code>) to watch caches fill, go stale and expire.', parts: [{ type: 'text', html: 'Each resolver keeps its own copy for up to one TTL.' }] });
        return f;
      }
    }],
    examples: [
      { title: 'Migration ticket: "half the office still sees the old site"', html: `<p>The site moved to <code>203.0.113.20</code> at 10:00. At 10:20 some users still land on the old server. <code>dig @ns1</code> (authoritative) returns the new IP with TTL ${H.c('y', '3600')}. The office resolver returns the old IP with TTL ${H.c('r', '2410')}: it cached the old answer at about 09:40 and will keep it until 10:40. Nothing is broken; the TTL was too high for a migration. Options: wait it out, flush the office resolver if you own it, and keep the old server serving (or redirecting) until the TTL has passed. Next time: lower the TTL to 60 s a day before.</p>`, code: R`dig +noall +answer @ns1.example.com shop.example.com   # shop.example.com. 3600 IN A 203.0.113.20
dig +noall +answer shop.example.com                    # shop.example.com. 2410 IN A 198.51.100.10  (cached, counting down)
dig +noall +answer @1.1.1.1 shop.example.com           # compare a public resolver` },
      { title: 'A forgotten /etc/hosts line', html: `<p>One build server keeps calling the <b>old</b> API IP, while dig shows the new one. dig talks straight to DNS and <b>ignores <code>/etc/hosts</code></b>, but applications go through <code>nsswitch.conf</code> (<code>hosts: files dns</code>), so a line someone added during testing wins. <code>getent hosts</code> shows what the app really gets.</p>`, code: R`dig +short api.example.com           # 203.0.113.30  (new, correct)
getent hosts api.example.com         # 198.51.100.30 api.example.com  <- from /etc/hosts
grep -n 'api.example.com' /etc/hosts # line 7: 198.51.100.30 api.example.com
grep '^hosts:' /etc/nsswitch.conf    # hosts: files dns  -> files (/etc/hosts) first` },
      { title: 'Record created, but NXDOMAIN for another 15 minutes', html: `<p>A developer tested <code>new.example.com</code> <i>before</i> creating the record, got NXDOMAIN, then created it. Their resolver still says NXDOMAIN. Resolvers also cache <b>"does not exist"</b> answers, for the time in the zone's SOA (its last field, often 300-3600 s). The authoritative server already has the record; the negative answer simply has not expired yet.</p>`, code: R`dig +short @ns1.example.com new.example.com    # 203.0.113.44  (authoritative has it)
dig new.example.com | grep -E 'status|SOA'    # status: NXDOMAIN ... SOA ... 900  (negative TTL)
dig +short example.com SOA                    # ns1... hostmaster... 2026101901 7200 900 1209600 900` },
      { title: 'Private vs public answer (split-horizon DNS)', html: `<p>From the office, <code>db.example.com</code> gives nothing; from inside the VPC it gives <code>10.0.3.20</code>. The company uses a <b>private hosted zone</b> attached to the VPC: only resolvers inside the VPC (the VPC resolver at the network's base address plus two, for example <code>10.0.0.2</code>) see it. That is by design. If an on-prem server needs it, you set up a resolver endpoint or conditional forwarding instead of putting private IPs in public DNS.</p>`, code: R`# inside the VPC
cat /etc/resolv.conf | grep nameserver       # nameserver 127.0.0.53 (systemd-resolved stub)
resolvectl status | grep 'DNS Servers'       # DNS Servers: 10.0.0.2  (the VPC resolver)
dig +short db.example.com                    # 10.0.3.20
# from the office laptop
dig +short db.example.com                    # (empty) - the private zone is invisible outside` }
    ],
    deepDive: `<p>🟣 <b>TTL planning for migrations.</b> Caches keep an answer for up to the TTL they saw when they cached it, so lowering a TTL only helps <b>after</b> the old, long TTL has expired everywhere. Recipe: T-48h lower TTL from 3600 to 60; T-0 change the record; keep the old server serving (or proxying) for at least the old TTL; then raise the TTL again. Some clients ignore TTLs (old JVMs cached forever when a security manager was installed; <code>networkaddress.cache.ttl</code> controls it), and browsers keep their own short cache.</p>
      <p><b>Where the time goes.</b> A cold recursive lookup can take several round trips (root, TLD, authoritative, plus any CNAME chain). Cloud resolvers are close and heavily cached, so most lookups are under a few milliseconds. DNS uses UDP 53 first and retries over <b>TCP 53</b> when the answer is truncated (large TXT or DNSSEC answers), so a firewall that allows only UDP 53 causes rare, confusing failures.</p>
      <p><b>Cloud resolvers.</b> In AWS the VPC resolver sits at the VPC base address + 2 and at <code>169.254.169.253</code>; it serves private hosted zones and public DNS. Azure uses <code>168.63.129.16</code>. Instances have per-interface query limits (AWS: about 1024 packets per second per network interface), so very chatty apps should cache locally. Hybrid setups use resolver endpoints or conditional forwarders so on-prem and cloud can resolve each other's private names.</p>
      <p><b>Delegation and NS mismatches.</b> The registrar's NS records for <code>example.com</code> decide which DNS provider is authoritative. A classic ticket: the team edits records in a new provider's zone, but the registrar still points at the old provider, so "nothing changes". <code>dig +trace</code> or <code>dig NS example.com @a.gtld-servers.net</code> shows the real delegation. <b>DNSSEC</b> adds signatures to answers; a broken DNSSEC chain makes validating resolvers return SERVFAIL while non-validating ones work, another "works here, not there" pattern.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> assistants are good at reading <code>dig +trace</code> output, explaining SOA fields, and drafting zone changes or Terraform for records. They can also generate a quick script that compares answers from several resolvers.</p>
      <p><b>Where it goes wrong:</b> the classic myth "DNS takes 24-48 hours to propagate" is repeated by many assistants; in reality it is <b>TTL-driven caching</b>, and you can measure the exact remaining time with dig. They may also suggest a CNAME at the apex or editing <code>/etc/hosts</code> on servers as a fix, which creates the next ticket. <b>Your job:</b> insist on evidence (authoritative answer, resolver answer, TTL), and treat hosts-file edits as a temporary test only.</p>`,
    problems: [P({
      t: 'Works for you, not for the customer, after a DNS change', l: 'Medium', tags: ['dns', 'ttl', 'dig', 'caching'], co: ['AWS Support', 'Cloudflare', 'Google'],
      s: `<p>At 14:00 your team moved <code>app.example.com</code> from <code>198.51.100.10</code> to <code>203.0.113.20</code>. At 14:15 a customer says the site shows an old version for them, while it is fine for you. Prove what is happening with commands, tell the customer how long it can last, and say what the team should change for the next migration.</p>`,
      ex: `<p>Authoritative: ${H.c('g', 'app.example.com. 3600 IN A 203.0.113.20')}. Customer's resolver: ${H.c('r', 'app.example.com. 2520 IN A 198.51.100.10')}. The old answer is cached for another 2520 s (42 minutes).</p>`,
      bw: `<p>"DNS takes 48 hours, please wait", or asking the customer to reboot. The first is vague and usually wrong; the second clears only their OS cache, not their ISP or company resolver, which is where the stale answer lives.</p>`,
      bc: `ping app.example.com     # shows an IP, but not the TTL or which resolver answered`,
      q: ['The authoritative TTL is 3600 s. What is the longest a resolver can serve the old answer after the change?', ['Up to 3600 s after it last cached the old answer, so at most about one hour after the change', '48 hours', 'Until the customer reboots', 'Forever, until someone flushes it'], 0, 'A resolver keeps an answer for the TTL it received. Worst case: it cached the old record a moment before the change, so it serves it for almost the full TTL.'],
      h: ['<p>Hint 1: find the authoritative server with <code>dig NS example.com</code> and query it directly: that is the truth with no cache.</p>', '<p>Hint 2: ask the customer to run <code>dig +noall +answer app.example.com</code> (or <code>nslookup -debug</code> on Windows) and send the TTL column. It counts down to zero.</p>', '<p>Hint 3: the remaining TTL is the maximum wait. Meanwhile keep the old server serving or redirecting. For next time: lower the TTL one full old-TTL before the change.</p>'],
      a: `<p>1) Confirm the truth: <code>dig +noall +answer @NS app.example.com</code> returns the new IP with the full TTL 3600. 2) Compare with the customer's resolver: their dig output shows the old IP with a <b>counting-down TTL</b> (2520). That proves the record is correct and their resolver holds a cached copy from before 14:00. 3) Tell the customer: "Your network's DNS resolver cached the previous address before our change. It expires in about 42 minutes. You can flush your local cache (<code>ipconfig /flushdns</code>, <code>resolvectl flush-caches</code>) but if your company or ISP resolver holds it, it will clear on its own by 15:00." 4) Mitigate on our side: keep the old server running and, if possible, make it proxy or redirect to the new one until the TTL has passed. 5) Process fix: lower TTL to 60 s at least an hour (the old TTL) before the next change, verify with dig, then switch, then raise TTL again.</p>`,
      code: R`# Who is authoritative, and what is the truth right now?
NS=$(dig +short example.com NS | head -n 1)
dig +noall +answer @"$NS" app.example.com        # app.example.com. 3600 IN A 203.0.113.20
# What does a given resolver serve? Compare a few.
for r in 1.1.1.1 8.8.8.8 9.9.9.9; do
  printf '%-8s ' "$r"; dig +noall +answer @"$r" app.example.com
done
# Ask the customer for this exact output (TTL is column 2 and counts down):
dig +noall +answer app.example.com
# Before the next migration, the zone change is simply: TTL 3600 -> 60, wait one hour, then change the A record.`,
      cx: `<p>Two or three dig commands. The key output is the TTL column: it turns "DNS is slow" into an exact number of minutes.</p>`,
      f: ['Why does lowering the TTL at 14:00 (at the same time as the change) not help?', 'How would a CDN or a load balancer in front of the app avoid this problem entirely?']
    })]
  });

  // ───────────────────────── Topic 4: HTTP/HTTPS and TLS certificates ─────────────────────────
  topics.push({
    title: 'HTTP, HTTPS and TLS Certificates: Status Codes, Expiry and Name Mismatch',
    analogy: `<p>A TLS certificate is a <b>passport for a website</b>. A trusted government (a <b>certificate authority</b>, CA) issued it. It shows a <b>name</b> (the host names it is valid for), an <b>expiry date</b>, and a chain of stamps that leads back to a government your browser already trusts. At the border, the officer checks all three: is the passport genuine (chain), is it still valid (dates), and does the name match the person in front of me (host name)? Fail any one and you are not let in, even if everything else is perfect.</p>`,
    explain: `<p>🟢 <b>HTTP in one picture.</b> The client sends a request line (<code>GET /health HTTP/1.1</code>), headers (<code>Host: api.example.com</code>) and maybe a body. The server answers with a <b>status code</b>, headers and a body. The status code family tells you who to blame:</p>
      ${H.table(['Code', 'Meaning', 'What it usually means in a cloud ticket'], [
        ['2xx (200, 204)', 'success', 'fine; if the user still complains, it is content or caching'],
        ['301 / 302 / 308', 'redirect', 'http → https, or a login page; <code>curl -L</code> follows'],
        ['400 / 401 / 403', 'bad request / not logged in / forbidden', 'client side: token, permissions, WAF rule, bucket policy'],
        ['404', 'not found', 'wrong path, wrong Host header, wrong virtual host'],
        ['429', 'too many requests', 'rate limit or API throttling: back off and retry'],
        ['500', 'server error', 'the app crashed on this request: read app logs'],
        ['<b>502</b> Bad Gateway', 'proxy got a bad answer', 'load balancer reached the target but got garbage, a reset, or a TLS mismatch'],
        ['<b>503</b> Service Unavailable', 'nobody to serve', 'no healthy targets behind the load balancer, or overload'],
        ['<b>504</b> Gateway Timeout', 'proxy gave up waiting', 'the target is too slow, or a security group blocks LB → target']
      ])}
      <p>🟢 <b>HTTPS = HTTP inside TLS.</b> Before any HTTP is sent, client and server do a <b>TLS handshake</b>: agree on keys and, crucially, the server proves who it is with its certificate. The client checks:</p>
      ${H.table(['Check', 'Passes when', 'curl error when it fails'], [
        ['<b>Chain</b>', 'the cert is signed by an intermediate, which is signed by a root in the client\'s trust store', '<code>unable to get local issuer certificate</code>'],
        ['<b>Dates</b>', '<code>notBefore</code> ≤ now ≤ <code>notAfter</code>', '<code>certificate has expired</code> / <code>not yet valid</code>'],
        ['<b>Name</b>', 'the host name is in the <b>Subject Alternative Name</b> (SAN) list; <code>*.example.com</code> covers exactly one label', '<code>no alternative certificate subject name matches target host name</code>']
      ])}
      <p>🔵 <b>Tools.</b> <code>curl -sv https://HOST/ -o /dev/null</code> shows the handshake and the certificate summary. <code>openssl s_client -connect HOST:443 -servername HOST</code> shows the full chain the server sends (<code>-servername</code> sets SNI, which servers with many sites need to pick the right cert). Pipe it into <code>openssl x509 -noout -subject -issuer -dates -ext subjectAltName</code> for the important fields. <code>curl --resolve HOST:443:IP</code> tests a specific server <b>with the real name</b>, before or without changing DNS.</p>
      <p>🔵 <b>Who renews?</b> Public certificates now live at most <b>200 days</b> (CA/Browser Forum rule since March 2026, falling to 100 days in 2027 and 47 days in 2029). Let's Encrypt certificates last 90 days. So renewal must be <b>automatic</b>: ACME clients like certbot, or managed certificates (AWS ACM, Azure Key Vault/App Service) that renew themselves as long as their validation record or method still works.</p>`,
    clues: [
      '"certificate has expired" / "NET::ERR_CERT_DATE_INVALID" → check <code>notAfter</code>; also check the client clock if only one machine complains',
      '"works on www but not on the bare domain" → the name is missing from the SAN list (wildcards do not cover the apex)',
      '"works in the browser, fails in curl / Java / Python" → server not sending the intermediate certificate (incomplete chain)',
      '"502 from the load balancer" → LB reached the target and got a bad answer; "503" → no healthy targets; "504" → target too slow or blocked',
      '"test the new server before switching DNS" → <code>curl --resolve name:443:NEW_IP</code>',
      '"managed certificate did not renew" → its DNS validation record was deleted, or it is not attached to anything'
    ],
    code: [R`# Lab (fully offline): make your own certificate, serve it, and break it on purpose.
# docker run -it --rm ubuntu:24.04 bash ; apt-get update -qq && apt-get install -y -qq openssl curl > /dev/null
cd /tmp
# 1. A self-signed lab certificate for www.example.com and example.com, valid 30 days.
#    (A throwaway lab key: never paste a real private key anywhere.)
openssl req -x509 -newkey rsa:2048 -nodes -keyout lab.key -out lab.crt -days 30 \
  -subj "/CN=www.example.com" -addext "subjectAltName=DNS:www.example.com,DNS:example.com"

# 2. Read the fields that matter
openssl x509 -in lab.crt -noout -subject -issuer -dates -ext subjectAltName
openssl x509 -in lab.crt -noout -checkend $((7*24*3600)) && echo "valid for at least 7 more days"

# 3. Serve it on port 8443 in the background
openssl s_server -accept 8443 -cert lab.crt -key lab.key -www -quiet > /dev/null 2>&1 &
sleep 1

# 4. Name in the SAN list: success (we trust our own cert with --cacert)
curl -s -o /dev/null -w '%{http_code}\n' --cacert lab.crt \
  --resolve www.example.com:8443:127.0.0.1 https://www.example.com:8443/

# 5. Name NOT in the SAN list: the classic mismatch error (curl exit 60)
curl -sS -o /dev/null --cacert lab.crt \
  --resolve api.example.com:8443:127.0.0.1 https://api.example.com:8443/ ; echo "exit=$?"

# 6. Not trusted at all (no --cacert): the chain check fails
curl -sS -o /dev/null --resolve www.example.com:8443:127.0.0.1 https://www.example.com:8443/ ; echo "exit=$?"`],
    codeTitle: ['Build, serve and break a TLS certificate locally'],
    viz: [{
      title: 'The three certificate checks, one by one',
      input: 'host=example.com san=www.example.com,*.example.com notAfter=2026-11-20 today=2026-10-19 chain=ok',
      inputLabel: 'host=NAME san=LIST notAfter=YYYY-MM-DD today=YYYY-MM-DD chain=ok|missing (optional notBefore=)',
      gen: function (input) {
        var o = { host: 'example.com', san: 'www.example.com', notBefore: '2026-05-01', notAfter: '2026-11-20', today: '2026-10-19', chain: 'ok' };
        String(input || '').trim().split(/\s+/).filter(Boolean).forEach(function (kv) {
          var m = kv.match(/^(host|san|notBefore|notAfter|today|chain)=(\S+)$/);
          if (!m) throw new Error('Use key=value: host san notBefore notAfter today chain');
          o[m[1]] = m[2];
        });
        function d(s, k) { var m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})$/); if (!m) throw new Error(k + ' must be YYYY-MM-DD'); return Date.UTC(+m[1], +m[2] - 1, +m[3]); }
        var nb = d(o.notBefore, 'notBefore'), na = d(o.notAfter, 'notAfter'), now = d(o.today, 'today');
        var host = o.host.toLowerCase();
        if (!/^[a-z0-9*.-]+$/.test(host)) throw new Error('host must be a DNS name like api.example.com');
        var sans = o.san.toLowerCase().split(',').filter(Boolean);
        if (!sans.length || sans.length > 8) throw new Error('Give 1-8 SAN names separated by commas');
        if (['ok', 'missing'].indexOf(o.chain) < 0) throw new Error('chain must be ok or missing');
        function match(name, pat) {
          if (pat.indexOf('*.') === 0) {
            var rest = pat.slice(2), dot = name.indexOf('.');
            return dot > 0 && name.slice(dot + 1) === rest;
          }
          return name === pat;
        }
        var f = [], fail = null;
        var info = [['subject CN', sans[0]], ['SAN', sans.join(', ')], ['issuer', o.chain === 'ok' ? 'Example Intermediate CA 2 (sent by server)' : 'Example Intermediate CA 2 (NOT sent by server)'], ['notBefore', o.notBefore], ['notAfter', o.notAfter]];
        f.push({ narr: 'The client connects to <b>' + H.esc(host) + '</b>:443 and puts that name in the TLS hello (<b>SNI</b>), so a server hosting many sites can pick the right certificate. The server sends its certificate plus, ideally, the intermediate certificate(s).', parts: [
          { type: 'table', label: 'certificate the server presents', columns: ['field', 'value'], rows: info }
        ] });
        var chainOk = o.chain === 'ok';
        f.push({ narr: 'Check 1 - <b>chain of trust</b>. The client must link the certificate to a <b>root CA in its own trust store</b>. ' + (chainOk ? 'The server sent the intermediate, the intermediate is signed by a trusted root: <span class="c-g">pass</span>.' : 'The server did <b>not</b> send the intermediate. Browsers often fetch or cache it and succeed anyway, but curl, Java and Python fail: <span class="c-r">fail</span>.'), parts: [
          { type: 'stack', label: 'chain (top = leaf)', items: ['Root CA (in trust store)', 'Intermediate CA 2' + (chainOk ? '' : ' (missing!)'), H.esc(sans[0]) + ' (leaf)'], hl: chainOk ? { 0: 'ok', 1: 'ok', 2: 'ok' } : { 0: 'ok', 1: 'bad', 2: 'cur' } }
        ] });
        if (!chainOk) fail = fail || ['SSL certificate problem: unable to get local issuer certificate', 'Install the full chain (leaf + intermediate) on the server or load balancer, e.g. nginx <code>ssl_certificate</code> must point at the fullchain file.'];
        var day = 86400000, left = Math.round((na - now) / day);
        var dateOk = now >= nb && now <= na;
        f.push({ narr: 'Check 2 - <b>dates</b>. Today is ' + o.today + '. The certificate is valid from ' + o.notBefore + ' to ' + o.notAfter + '. ' + (now < nb ? '<span class="c-r">Not yet valid</span> - often a wrong clock on the client.' : now > na ? '<span class="c-r">Expired ' + (-left) + ' day(s) ago.</span>' : '<span class="c-g">Valid</span>, ' + left + ' day(s) left' + (left <= 14 ? ' - <span class="c-y">renew now, alerting should have fired</span>.' : '.')), parts: [
          { type: 'bars', label: 'days: lifetime used vs left', values: [Math.max(0, Math.round((Math.min(now, na) - nb) / day)), Math.max(0, left)], idxLabels: ['used', 'left'], hl: dateOk ? { 1: left <= 14 ? 'cur' : 'ok' } : { 1: 'bad' } }
        ] });
        if (!dateOk && !fail) fail = now > na ? ['SSL certificate problem: certificate has expired', 'Renew and deploy it, then fix the automation (certbot timer, ACM validation record) so it cannot happen again.'] : ['SSL certificate problem: certificate is not yet valid', 'Check the client clock first (<code>timedatectl</code>, NTP). If the clock is right, the new cert was deployed too early.'];
        var rows = sans.map(function (s) { return [H.esc(s), match(host, s) ? 'matches' : 'no']; });
        var hit = sans.some(function (s) { return match(host, s); });
        f.push({ narr: 'Check 3 - <b>name</b>. Clients compare the host name only with the <b>SAN</b> list (the old CN field is ignored). A wildcard <code>*.example.com</code> matches exactly <b>one</b> label: <code>api.example.com</code> yes, <code>example.com</code> no, <code>a.b.example.com</code> no. ' + (hit ? '<span class="c-g">A SAN matches ' + H.esc(host) + '.</span>' : '<span class="c-r">No SAN matches ' + H.esc(host) + '.</span>'), parts: [
          { type: 'table', label: 'SAN entries vs ' + H.esc(host), columns: ['SAN', 'result'], rows: rows, hl: (function () { var h = {}; sans.forEach(function (s, i) { h[i] = match(host, s) ? 'ok' : 'done'; }); return h; })() }
        ] });
        if (!hit && !fail) fail = ['SSL: no alternative certificate subject name matches target host name \'' + H.esc(host) + '\'', 'Reissue the certificate with ' + H.esc(host) + ' in the SAN list (or redirect that name to one that is covered).'];
        if (fail) {
          f.push({ narr: 'Verdict: the handshake is <b>aborted</b> before any HTTP is sent. The user sees a browser warning; scripts see the error below. The fix: ' + fail[1], parts: [
            { type: 'code', label: 'what curl prints', lang: 'text', code: 'curl: (60) ' + fail[0], hl: { 1: 'bad' } }
          ] });
        } else {
          f.push({ narr: 'Verdict: all three checks pass. The handshake finishes, keys are agreed, and the encrypted HTTP request is sent. Any remaining problem is HTTP (status code) or the app.', parts: [
            { type: 'code', label: 'curl -v (excerpt)', lang: 'text', code: '* SSL connection using TLSv1.3\n* Server certificate:\n*  subject: CN=' + sans[0] + '\n*  expire date: ' + o.notAfter + '\n*  SSL certificate verify ok.\n< HTTP/2 200', hl: { 5: 'ok', 6: 'ok' } }
          ] });
        }
        f.push({ narr: 'Try: <code>host=api.example.com</code> (wildcard match), <code>host=a.b.example.com</code> (no match), <code>today=2026-12-01</code> (expired), <code>chain=missing</code> (works in browsers, fails in curl).', parts: [
          { type: 'table', label: 'one command shows all three', columns: ['command'], rows: [['echo | openssl s_client -connect HOST:443 -servername HOST -showcerts 2>/dev/null | openssl x509 -noout -issuer -dates -ext subjectAltName']] }
        ] });
        return f;
      }
    }],
    examples: [
      { title: 'Expired certificate on Monday morning', html: `<p>Monitoring is green, but users get <code>NET::ERR_CERT_DATE_INVALID</code>. <code>openssl ... -dates</code> shows ${H.c('r', 'notAfter=Oct 18 23:59:59 2026 GMT')}. The certbot timer had been failing for weeks because port 80 was closed in a firewall clean-up, so the HTTP-01 challenge could not complete. Fix now: renew (DNS-01 or reopen 80) and reload nginx. Fix forever: alert on days-to-expiry, not just on "site returns 200".</p>`, code: R`H=www.example.com
echo | openssl s_client -connect "$H:443" -servername "$H" 2>/dev/null | openssl x509 -noout -enddate
sudo certbot renew --dry-run          # shows why renewal fails (e.g. challenge on port 80 timed out)
systemctl list-timers | grep certbot  # is the renewal timer even scheduled?
sudo certbot renew && sudo systemctl reload nginx` },
      { title: 'Name mismatch: the apex is not covered by the wildcard', html: `<p>A new certificate for ${H.c('b', '*.example.com')} was installed. <code>www.example.com</code> works; <code>example.com</code> fails with <code>no alternative certificate subject name matches</code>. A wildcard covers exactly one label to the left, never the bare domain. The fix is a certificate whose SAN list has both <code>example.com</code> and <code>*.example.com</code>.</p>`, code: R`echo | openssl s_client -connect example.com:443 -servername example.com 2>/dev/null \
  | openssl x509 -noout -ext subjectAltName
# X509v3 Subject Alternative Name:
#     DNS:*.example.com            <- example.com itself is missing` },
      { title: 'Works in Chrome, fails in curl and Java: missing intermediate', html: `<p>A partner's Java client fails with <code>PKIX path building failed</code>; curl says <code>unable to get local issuer certificate</code>; browsers work. <code>openssl s_client -showcerts</code> shows the server sends only <b>one</b> certificate (the leaf). Browsers often have the intermediate cached or fetch it; most libraries do not. Configure the full chain: in nginx, <code>ssl_certificate</code> must point at <code>fullchain.pem</code>, not <code>cert.pem</code>.</p>`, code: R`echo | openssl s_client -connect api.example.com:443 -servername api.example.com -showcerts 2>/dev/null \
  | grep -c 'BEGIN CERTIFICATE'          # 1 -> leaf only (bad); 2 or more -> chain sent
grep ssl_certificate /etc/nginx/sites-enabled/*   # should be .../fullchain.pem` },
      { title: '502, 503, 504 from a load balancer', html: `<p>Load balancers generate their own errors, and each code points somewhere different. <b>503</b>: no healthy targets, so check target health and the health check path. <b>502</b>: the LB connected but got something it could not use, such as the app closing the connection, a crash mid-response, or the LB speaking HTTPS to a target that speaks HTTP. <b>504</b>: the LB waited too long, so look for a slow app or a security group that lets health checks through but blocks the traffic port. <code>curl -v</code> against the target directly (from inside the network) separates "LB" from "app".</p>`, code: R`curl -s -o /dev/null -w 'via LB: %{http_code}\n' https://shop.example.com/health
# from a host inside the VPC, straight to one target (bypassing the LB):
curl -s -o /dev/null -w 'direct: %{http_code} in %{time_total}s\n' http://10.0.2.15:8080/health` },
      { title: 'Test the new server before switching DNS', html: `<p>You built a replacement server at <code>203.0.113.20</code>. Before touching DNS, test it <b>with the real host name</b> so the Host header, SNI and certificate name are exactly what users will send. <code>--resolve</code> pins the name to an IP for this one command only, no hosts-file edits.</p>`, code: R`curl -sv --resolve www.example.com:443:203.0.113.20 https://www.example.com/ -o /dev/null 2>&1 \
  | grep -E 'Connected to|subject:|expire date:|SSL certificate verify|^< HTTP'` }
    ],
    deepDive: `<p>🟣 <b>The TLS 1.3 handshake.</b> Client hello (supported ciphers, key share, SNI) → server hello (its key share), then the encrypted certificate and a signature proving the server holds the private key → finished. That is one round trip before HTTP can flow (TLS 1.2 needed two). The private key never leaves the server; the certificate is public. HTTP/3 runs TLS 1.3 inside QUIC over <b>UDP 443</b>, so a firewall that only allows TCP 443 silently forces a fallback to HTTP/2.</p>
      <p><b>Where TLS ends.</b> In the cloud, TLS is usually <b>terminated</b> at a load balancer or CDN, which holds the public certificate. Traffic to the targets may be plain HTTP inside the VPC, or re-encrypted with an internal certificate. Mismatched expectations here cause 502s: the LB speaks HTTPS to a target listening for HTTP, or the target's internal certificate is expired. <b>mTLS</b> (mutual TLS) adds a client certificate so the server can verify the caller too; it is common between services and for partner APIs.</p>
      <p><b>Lifetimes keep shrinking.</b> Under CA/Browser Forum ballot SC-081, the maximum life of public TLS certificates dropped to 200 days on 15 March 2026, drops to 100 days in March 2027 and 47 days in March 2029; domain-validation reuse periods shrink too. Manual renewal is not sustainable: use ACME (certbot, cert-manager in Kubernetes) or managed certificates, and monitor days-to-expiry for <b>every</b> endpoint, including internal ones and partner-facing APIs.</p>
      <p><b>Clock skew and revocation.</b> If a client's clock is wrong, a fresh certificate looks "not yet valid" or an old one looks fine; NTP (<code>timedatectl</code>, <code>chronyc tracking</code>) is part of TLS health. Revocation via CRLs and OCSP is soft-fail in most clients, and Let's Encrypt has wound down OCSP in favour of CRLs and short lifetimes, which is one reason lifetimes are shrinking. <b>HSTS</b> tells browsers to always use HTTPS for a domain; once set, users cannot click through certificate warnings, so an expired cert becomes a hard outage.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> pasting <code>openssl s_client</code> output into an assistant gets you a clean summary (issuer, SANs, days left, chain length) and it can draft an expiry-check script or a certbot/cert-manager config quickly. That is a real time-saver during a "cert expired" incident.</p>
      <p><b>Where it goes wrong:</b> the most common bad advice is to "fix" errors with <code>curl -k</code>, <code>verify=False</code> in Python or a trust-all Java TrustManager. That turns off the very check that stops impersonation. Assistants also invent openssl flags or confuse the CN with the SAN. <b>Never paste private keys</b> or full internal certificate bundles into public tools. Use AI to explain and draft; keep verification on, and test with <code>--resolve</code> and <code>openssl</code> yourself.</p>`,
    problems: [P({
      t: 'Certificate expired: fix now, then stop it happening again', l: 'Medium', tags: ['tls', 'certificates', 'openssl', 'monitoring'], co: ['AWS Support', 'Microsoft', 'Infosys'],
      s: `<p>Users of <code>api.example.com</code> see certificate warnings. The server runs nginx with a Let's Encrypt certificate from certbot. Confirm the cause with commands, restore service, find out why automatic renewal failed, and write a small script the team can run daily that warns when any of their host names has fewer than 21 days left.</p>`,
      ex: `<p><code>openssl x509 -noout -enddate</code> → ${H.c('r', 'notAfter=Oct 17 08:12:00 2026 GMT')} (two days ago). <code>certbot renew --dry-run</code> → ${H.c('r', 'Timeout during connect (likely firewall problem)')}: port 80 was closed last month, so the HTTP-01 challenge fails.</p>`,
      bw: `<p>Telling users to click "proceed anyway", or setting <code>verify=False</code> in client code. Both remove the protection TLS gives, and the certificate stays expired for everyone else.</p>`,
      bc: `curl -k https://api.example.com/    # "works" only because verification is switched off`,
      q: ['certbot renewal fails with a connect timeout on the HTTP-01 challenge. What is the most likely cause?', ['Port 80 is blocked, so the CA cannot reach /.well-known/acme-challenge/', 'The private key is too short', 'DNS TTL is too high', 'nginx is using HTTP/2'], 0, 'HTTP-01 validation needs the CA to fetch a token over plain HTTP on port 80. Reopen 80 (it can just redirect everything else to https) or switch to DNS-01 validation.'],
      h: ['<p>Hint 1: confirm with openssl rather than the browser: <code>-enddate</code> and <code>-ext subjectAltName</code> on what the server actually sends.</p>', '<p>Hint 2: <code>certbot renew --dry-run</code> and <code>systemctl list-timers</code> show both whether renewal runs and why it fails.</p>', '<p>Hint 3: for the script, <code>openssl x509 -checkend SECONDS</code> exits non-zero if the cert expires within that many seconds. Loop over host names and report.</p>'],
      a: `<p><b>Confirm:</b> <code>openssl s_client ... | openssl x509 -noout -enddate</code> shows the date has passed. <b>Why renewal failed:</b> <code>certbot renew --dry-run</code> shows the HTTP-01 challenge timing out; a firewall or security group change closed port 80. <b>Restore:</b> reopen tcp/80 (nginx can redirect everything except <code>/.well-known/acme-challenge/</code> to https), or switch to DNS-01 validation; run <code>certbot renew</code>; <code>systemctl reload nginx</code>; verify with openssl again. <b>Make it stick:</b> confirm <code>certbot.timer</code> is active, add a deploy hook that reloads nginx, and add expiry monitoring: the script below checks every host name daily (cron or a CI schedule) and exits non-zero when any has under 21 days. Tell users the incident cause in one line: "automatic renewal was blocked by a firewall change".</p>`,
      code: R`#!/usr/bin/env bash
# cert-check.sh: warn when certificates expire within DAYS days. Usage: ./cert-check.sh api.example.com www.example.com
set -uo pipefail
DAYS=21
rc=0
for host in "$@"; do
  pem=$(echo | timeout 10 openssl s_client -connect "$host:443" -servername "$host" 2>/dev/null | openssl x509 2>/dev/null)
  if [ -z "$pem" ]; then
    echo "ERROR  $host: no certificate (DNS, port 443 or TLS problem)"; rc=2; continue
  fi
  end=$(printf '%s\n' "$pem" | openssl x509 -noout -enddate | cut -d= -f2)
  if printf '%s\n' "$pem" | openssl x509 -noout -checkend $((DAYS*86400)) > /dev/null; then
    echo "OK     $host: expires $end"
  else
    echo "WARN   $host: expires $end (less than $DAYS days)"; rc=1
  fi
done
exit "$rc"`,
      cx: `<p>One TLS handshake per host name, a second or two each. Run it daily; the non-zero exit code plugs straight into cron mail, a CI job or a monitoring check.</p>`,
      f: ['How would you check certificates on an internal load balancer that is not reachable from the internet?', 'Why do shorter certificate lifetimes make monitoring more important, not less?']
    })]
  });

  // ───────────────────────── Topic 5: CIDR and subnet maths ─────────────────────────
  topics.push({
    title: 'CIDR and Subnet Maths, Step by Step: Sizes, Ranges, Splits and Overlaps',
    analogy: `<p>Think of an IP address as a <b>32-digit house number</b> written in binary. A CIDR block like <code>10.0.0.0/16</code> says: "the first <b>16 digits are the street name</b>, and every house on that street can use any value in the remaining 16 digits." A bigger number after the slash means more digits are fixed, so the street is <b>shorter</b> (fewer houses). <code>/16</code> is a long avenue with 65,536 houses; <code>/28</code> is a tiny lane with 16. Splitting a network into subnets is just cutting a street into equal shorter streets.</p>`,
    explain: `<p>🟢 <b>Step 1: an address is 32 bits.</b> We write it as four <b>octets</b> (8 bits each, 0-255) for humans. Here is <code>192.0.2.77</code>:</p>
      ${H.table(['', 'octet 1', 'octet 2', 'octet 3', 'octet 4'], [
        ['decimal', '192', '0', '2', '77'],
        ['binary', '11000000', '00000000', '00000010', '01001101']
      ])}
      <p>🟢 <b>Step 2: the prefix length.</b> In <code>192.0.2.77/27</code> the <b>/27</b> means the first 27 bits are the <b>network part</b>; the last 32 - 27 = <b>5 bits</b> are the <b>host part</b>. The <b>subnet mask</b> is the same idea written as an address: 27 ones then 5 zeros = <code>255.255.255.224</code>.</p>
      <p>🟢 <b>Step 3: size.</b> A block has <b>2<sup>host bits</sup></b> addresses. 5 host bits → 2<sup>5</sup> = <b>32</b> addresses. Classic networks lose 2 (the network address and the broadcast address); clouds lose more: <b>AWS and Azure reserve 5</b> per subnet, GCP reserves 4.</p>
      ${H.table(['Prefix', 'Mask', 'Addresses', 'Classic usable (−2)', 'AWS usable (−5)', 'Typical use'], [
        ['/16', '255.255.0.0', '65,536', '65,534', '65,531', 'a whole VPC / VNet'],
        ['/20', '255.255.240.0', '4,096', '4,094', '4,091', 'a big subnet (Kubernetes nodes and pods)'],
        ['/22', '255.255.252.0', '1,024', '1,022', '1,019', 'a medium subnet'],
        ['/24', '255.255.255.0', '256', '254', '251', 'the "default" subnet size'],
        ['/26', '255.255.255.192', '64', '62', '59', 'a small tier'],
        ['/27', '255.255.255.224', '32', '30', '27', 'a few load balancers or a NAT subnet'],
        ['/28', '255.255.255.240', '16', '14', '11', 'smallest subnet AWS allows'],
        ['/32', '255.255.255.255', '1', '1 (a single host)', '-', 'one IP in a firewall rule']
      ])}
      <p>🔵 <b>Step 4: find the range with the block-size trick.</b> Look at the octet where the mask is not 255 or 0. <b>Block size = 256 − that mask octet</b>. Networks start at multiples of the block size.</p>
      ${H.table(['Mask octet', '128', '192', '224', '240', '248', '252'], [
        ['Block size', '128', '64', '32', '16', '8', '4'],
        ['Prefix (if 4th octet)', '/25', '/26', '/27', '/28', '/29', '/30'],
        ['Prefix (if 3rd octet)', '/17', '/18', '/19', '/20', '/21', '/22']
      ])}
      <p>For <code>192.0.2.77/27</code>: block size 32, multiples are 0, 32, <b>64</b>, 96 ... 77 falls in <b>64-95</b>. So the network is <code>192.0.2.64</code>, the broadcast <code>192.0.2.95</code>, and classic usable hosts <code>.65-.94</code> (30). In AWS, <code>.65</code> (VPC router), <code>.66</code> (DNS) and <code>.67</code> (reserved) are also taken, so instances get <code>.68-.94</code> (27).</p>
      <p>🔵 <b>Step 5: splitting.</b> Every +1 on the prefix <b>halves</b> the block: a /16 is 2 × /17, 4 × /18, 256 × /24. Number of subnets = 2<sup>(new − old)</sup>; each new subnet starts one new block size after the last.</p>
      <p>🔵 <b>Step 6: contains and overlaps.</b> An IP is <b>inside</b> a CIDR when its first <i>n</i> bits equal the network's first <i>n</i> bits (mask both and compare). Because blocks are aligned, two CIDR blocks are either <b>nested</b> or <b>completely separate</b>; they overlap exactly when one contains the other's network address. Overlap is what breaks VPC peering and VPNs.</p>`,
    clues: [
      '"how many usable IPs in a /26" → 2<sup>6</sup> = 64 addresses, 62 classic, 59 in AWS/Azure (5 reserved)',
      '"split this /16 into four equal subnets" → +2 bits → four /18s, block size 64 in the 3rd octet',
      '"is 10.0.12.5 in 10.0.8.0/21" → mask the IP with /21 and compare to the network address',
      '"peering fails / VPN routes conflict" → overlapping CIDR blocks; check before you build',
      '"we ran out of IPs in the subnet" → subnet too small for nodes, pods or Lambda ENIs; plan bigger blocks',
      '"smallest subnet for 50 instances in AWS" → need 55 addresses → 64 → /26'
    ],
    code: [{ lang: 'python', run: true, title: 'Subnet maths with Python\'s ipaddress module (standard library)', code: `import ipaddress

# 1. One address with a prefix: strict=False lets us pass an address that has host bits set
net = ipaddress.ip_network("192.0.2.77/27", strict=False)
print("network     ", net.network_address)      # 192.0.2.64
print("broadcast   ", net.broadcast_address)    # 192.0.2.95
print("netmask     ", net.netmask)              # 255.255.255.224
print("addresses   ", net.num_addresses)        # 32
print("classic hosts", net.num_addresses - 2)   # 30
print("AWS usable  ", net.num_addresses - 5)    # 27 (network, router, DNS, reserved, broadcast)

# 2. The same address in binary, with the network part marked
ip = ipaddress.ip_address("192.0.2.77")
bits = format(int(ip), "032b")
print("bits        ", bits[:27] + "|" + bits[27:], "(27 network bits | 5 host bits)")

# 3. Split a VPC into four equal subnets (+2 bits)
vpc = ipaddress.ip_network("10.0.0.0/16")
for s in vpc.subnets(prefixlen_diff=2):
    print("subnet      ", s, s.num_addresses, "addresses")

# 4. Contains and overlaps
print("10.0.12.5 in 10.0.8.0/21? ", ipaddress.ip_address("10.0.12.5") in ipaddress.ip_network("10.0.8.0/21"))
a, b = ipaddress.ip_network("10.0.0.0/16"), ipaddress.ip_network("10.0.128.0/20")
print("10.0.0.0/16 overlaps 10.0.128.0/20?", a.overlaps(b))` }],
    codeTitle: ['Subnet maths with Python ipaddress'],
    viz: [{
      title: 'Bits view: find network, broadcast and hosts for any CIDR',
      input: '192.0.2.77/27',
      inputLabel: 'IPv4 address with prefix, e.g. 10.0.13.7/22',
      gen: function (input) {
        var c = cidr(input);
        var ipBits = ('00000000000000000000000000000000' + c.ip.toString(2)).slice(-32).split('');
        var mkBits = ('00000000000000000000000000000000' + c.mask.toString(2)).slice(-32).split('');
        var netBits = ('00000000000000000000000000000000' + c.net.toString(2)).slice(-32).split('');
        var bcBits = ('00000000000000000000000000000000' + c.bc.toString(2)).slice(-32).split('');
        function hl(p) { var h = {}; for (var i = 0; i < 32; i++) h[i] = i < p ? 'win' : 'cur'; return h; }
        var octLabels = []; for (var i = 0; i < 32; i++) octLabels.push(i % 8 === 0 ? 'o' + (i / 8 + 1) : '');
        var f = [];
        f.push({ narr: 'Start with <b>' + n2ip(c.ip) + '</b>. Each octet becomes 8 bits, so the whole address is 32 bits. Prefix <b>/' + c.p + '</b> means the first ' + c.p + ' bits (blue) are the network and the last ' + (32 - c.p) + ' bits (amber) are the host part.', parts: [
          { type: 'array', label: 'address bits', values: ipBits, hl: hl(c.p), idxLabels: octLabels },
          { type: 'table', label: 'octets', columns: ['octet', 'decimal', 'binary'], rows: n2ip(c.ip).split('.').map(function (o, k) { return ['o' + (k + 1), o, ('00000000' + Number(o).toString(2)).slice(-8)]; }) }
        ] });
        f.push({ narr: 'The <b>mask</b> is ' + c.p + ' ones followed by ' + (32 - c.p) + ' zeros. Written as an address that is <b>' + n2ip(c.mask) + '</b>. Size of the block: 2<sup>' + (32 - c.p) + '</sup> = <b>' + c.size + '</b> addresses.', parts: [
          { type: 'array', label: 'mask bits', values: mkBits, hl: hl(c.p), idxLabels: octLabels },
          { type: 'vars', label: 'mask', vals: { prefix: '/' + c.p, mask: n2ip(c.mask), 'host bits': 32 - c.p, addresses: c.size } }
        ] });
        f.push({ narr: '<b>Network address</b> = address AND mask: keep the network bits, set every host bit to 0. Result: <b>' + n2ip(c.net) + '</b>.' + (c.net !== c.ip ? ' (Your input had host bits set, which is fine for "which network is this IP in?")' : ''), parts: [
          { type: 'array', label: 'network bits (host part all 0)', values: netBits, hl: hl(c.p), idxLabels: octLabels },
          { type: 'vars', label: 'so far', vals: { network: n2ip(c.net) }, hl: { network: 'ok' } }
        ] });
        f.push({ narr: '<b>Broadcast address</b> = network with every host bit set to 1: <b>' + n2ip(c.bc) + '</b>. It is the last address of the block.', parts: [
          { type: 'array', label: 'broadcast bits (host part all 1)', values: bcBits, hl: hl(c.p), idxLabels: octLabels },
          { type: 'vars', label: 'so far', vals: { network: n2ip(c.net), broadcast: n2ip(c.bc) }, hl: { broadcast: 'ok' } }
        ] });
        var oct = c.p >= 24 ? 4 : c.p >= 16 ? 3 : c.p >= 8 ? 2 : 1;
        var mo = (c.mask >>> (8 * (4 - oct))) & 255, block = 256 - mo;
        var val = (c.ip >>> (8 * (4 - oct))) & 255;
        if (c.p % 8 !== 0 && c.p < 32) {
          f.push({ narr: 'Shortcut without binary: the "interesting" octet is octet ' + oct + ' (mask value ' + mo + '). <b>Block size = 256 − ' + mo + ' = ' + block + '</b>. Blocks start at 0, ' + block + ', ' + (2 * block) + ' ... The input value ' + val + ' falls in the block starting at <b>' + (val - val % block) + '</b>, ending at ' + (val - val % block + block - 1) + '. Same answer, done in your head.', parts: [
            { type: 'bars', label: 'blocks in octet ' + oct + ' (start values)', values: (function () { var v = []; for (var s = 0; s < 256 && v.length < 16; s += block) v.push(s); return v; })(), hl: one(Math.floor(val / block) < 16 ? Math.floor(val / block) : 0, 'sel') }
          ] });
        } else {
          f.push({ narr: 'This prefix falls on an octet boundary (/' + c.p + '), so no binary is needed: the first ' + (c.p / 8) + ' octet(s) are fixed and the rest run from 0 to 255.', parts: [{ type: 'text', html: 'Octet-boundary prefixes: /8, /16, /24, /32.' }] });
        }
        var classic = c.p >= 31 ? c.size : c.size - 2;
        var aws = c.p >= 16 && c.p <= 28 ? (c.size - 5) : null;
        var rows = [['network', n2ip(c.net)], ['broadcast', n2ip(c.bc)], ['mask', n2ip(c.mask)], ['addresses', String(c.size)], ['classic usable', c.p >= 31 ? classic + ' (/31 and /32 are special: no network/broadcast pair)' : classic + ' (' + n2ip(c.net + 1) + ' - ' + n2ip(c.bc - 1) + ')'], ['AWS usable', aws === null ? 'n/a (AWS subnets must be /16 to /28)' : aws + ' (' + n2ip(c.net + 4) + ' - ' + n2ip(c.bc - 1) + '; .+1 router, .+2 DNS, .+3 reserved)']];
        f.push({ narr: 'Summary for <b>' + c.text + '</b>. In a cloud subnet, remember the extra reserved addresses at the start: the first usable instance IP is network + 4 in AWS.', parts: [
          { type: 'table', label: 'result', columns: ['item', 'value'], rows: rows, hl: { 0: 'ok', 1: 'ok', 5: 'sel' } }
        ] });
        return f;
      }
    }, {
      title: 'Split a block into equal subnets',
      input: '10.0.0.0/16 /18',
      inputLabel: 'CIDR then the new prefix, e.g. 192.0.2.0/24 /26',
      gen: function (input) {
        var m = String(input || '').trim().match(/^(\S+)\s+\/?(\d{1,2})$/);
        if (!m) throw new Error('Format: 10.0.0.0/16 /18');
        var c = cidr(m[1]), np = Number(m[2]);
        if (np < c.p || np > 32) throw new Error('New prefix must be between /' + c.p + ' and /32');
        if (np - c.p > 6) throw new Error('Keep it to at most 64 subnets (new prefix ≤ /' + (c.p + 6) + ')');
        var n = Math.pow(2, np - c.p), sz = Math.pow(2, 32 - np), list = [];
        for (var i = 0; i < n; i++) list.push(n2ip(c.net + i * sz) + '/' + np);
        var f = [];
        f.push({ narr: 'We start with <b>' + c.text + '</b> (' + c.size + ' addresses). Going from /' + c.p + ' to /' + np + ' adds <b>' + (np - c.p) + '</b> network bit(s), so we get 2<sup>' + (np - c.p) + '</sup> = <b>' + n + '</b> subnets of ' + sz + ' addresses each.', parts: [
          { type: 'vars', label: 'plan', vals: { parent: c.text, 'new prefix': '/' + np, 'subnets': n, 'addresses each': sz, 'AWS usable each': np <= 28 ? sz - 5 : 'n/a' } }
        ] });
        var shown = Math.min(n, 8);
        for (var k = 0; k < shown; k++) {
          var s = c.net + k * sz;
          f.push({ narr: 'Subnet ' + (k + 1) + ': starts at ' + n2ip(s) + ', ends at ' + n2ip(s + sz - 1) + '. The next one starts exactly one block (' + sz + ' addresses) later, so there are no gaps and no overlaps.', parts: [
            { type: 'table', label: 'subnets so far', columns: ['#', 'CIDR', 'first', 'last'], rows: list.slice(0, k + 1).map(function (x, j) { var st = c.net + j * sz; return [String(j + 1), x, n2ip(st), n2ip(st + sz - 1)]; }), hl: one(k, 'ok') }
          ] });
        }
        if (n > shown) f.push({ narr: '... and so on: ' + (n - shown) + ' more, the last being <b>' + list[n - 1] + '</b>, which ends at ' + n2ip(c.bc) + ', the broadcast of the parent.', parts: [{ type: 'text', html: 'Last subnet: <b>' + list[n - 1] + '</b>' }] });
        if (f.length < 3) f.push({ narr: 'With the same prefix there is nothing to split: the block is its own single subnet. Try a longer new prefix such as /' + Math.min(32, c.p + 2) + '.', parts: [{ type: 'text', html: 'Each +1 on the prefix doubles the number of subnets.' }] });
        f.push({ narr: 'A common cloud layout: give each <b>availability zone</b> and each <b>tier</b> (public, private app, private data) its own subnet, and <b>keep some blocks unused</b> for later. Python does the same split with <code>ip_network("' + c.text + '").subnets(new_prefix=' + np + ')</code>.', parts: [
          { type: 'bars', label: 'addresses per subnet (all equal)', values: list.slice(0, Math.min(n, 16)).map(function () { return sz; }), idxLabels: list.slice(0, Math.min(n, 16)) }
        ] });
        return f;
      }
    }],
    examples: [
      { title: 'By hand: 192.0.2.77/27', html: `${H.table(['Step', 'Work', 'Result'], [
        ['host bits', '32 − 27', '5'],
        ['size', '2<sup>5</sup>', '32 addresses'],
        ['mask octet', '256 − 32', '224 → mask 255.255.255.224'],
        ['block', 'multiples of 32: 0, 32, 64, 96', '77 is in 64-95'],
        ['network / broadcast', '', '192.0.2.64 / 192.0.2.95'],
        ['usable (classic)', '.65 to .94', '30 hosts'],
        ['usable (AWS)', '.68 to .94', '27 hosts']
      ])}<p>Practise until this takes under a minute; it comes up in every cloud interview.</p>`, code: { lang: 'python', run: true, code: `import ipaddress
n = ipaddress.ip_network("192.0.2.77/27", strict=False)
print(n, n.netmask, n.network_address, n.broadcast_address, n.num_addresses - 2, n.num_addresses - 5)` } },
      { title: 'The interesting octet is the third one: 10.0.13.7/22', html: `<p>/22 means 16 + 6 bits: the first two octets are fixed, and 6 bits of the <b>third</b> octet. Mask third octet = 252, block size 256 − 252 = <b>4</b>. Third-octet blocks: 0, 4, 8, <b>12</b>, 16 ... 13 falls in 12-15. Network <code>10.0.12.0</code>, broadcast <code>10.0.15.255</code>, 1,024 addresses (1,019 usable in AWS). The fourth octet runs the full 0-255 inside each third-octet value.</p>`, code: { lang: 'python', run: true, code: `import ipaddress
n = ipaddress.ip_network("10.0.13.7/22", strict=False)
print(n, "->", n.network_address, "to", n.broadcast_address, "|", n.num_addresses, "addresses")` } },
      { title: 'Design: a /16 VPC for three tiers in two availability zones', html: `<p>Take <code>10.20.0.0/16</code>. Split into four /18 "zone blocks" (16,384 each), use two now and keep two for a third zone and growth. Inside each zone block, carve /20s per tier: public (load balancers, NAT), private app, private data. Leaving room is cheaper than re-addressing later.</p>${H.table(['Subnet', 'Zone', 'Tier', 'AWS usable'], [
        ['10.20.0.0/20', 'a', 'public', '4,091'], ['10.20.16.0/20', 'a', 'private app', '4,091'], ['10.20.32.0/20', 'a', 'private data', '4,091'],
        ['10.20.64.0/20', 'b', 'public', '4,091'], ['10.20.80.0/20', 'b', 'private app', '4,091'], ['10.20.96.0/20', 'b', 'private data', '4,091'],
        ['10.20.128.0/17', '-', 'spare (zone c, growth)', '-']
      ])}`, code: { lang: 'python', run: true, code: `import ipaddress
vpc = ipaddress.ip_network("10.20.0.0/16")
zones = list(vpc.subnets(new_prefix=18))          # four /18 zone blocks
for zone, block in zip("ab", zones[:2]):
    tiers = list(block.subnets(new_prefix=20))[:3]   # first three /20s of each zone block
    for name, sub in zip(["public", "private-app", "private-data"], tiers):
        print(f"zone {zone}  {name:13} {sub}  usable={sub.num_addresses - 5}")
print("spare:", list(vpc.subnets(new_prefix=17))[1])` } },
      { title: 'Is this IP inside that range? (security group and route checks)', html: `<p>A security group allows <code>10.0.8.0/21</code>. Is the new app server <code>10.0.12.5</code> covered? /21 has block size 8 in the third octet: 8-15. 12 is inside, so <b>yes</b>. What about <code>10.0.16.4</code>? 16 starts a new block, so <b>no</b>, and that server gets a timeout.</p>`, code: { lang: 'python', run: true, code: `import ipaddress
rule = ipaddress.ip_network("10.0.8.0/21")
for ip in ["10.0.12.5", "10.0.16.4", "10.0.8.0", "10.0.15.255"]:
    print(ip, "allowed" if ipaddress.ip_address(ip) in rule else "NOT covered")` } },
      { title: 'Overlapping CIDRs break peering', html: `<p>Team A's VPC is <code>10.0.0.0/16</code>. Team B created theirs as <code>10.0.128.0/20</code> because "it's a different number". A peering request is rejected: <code>10.0.128.0/20</code> sits entirely inside <code>10.0.0.0/16</code>. Even where a platform accepted it, a router could not know which side owns <code>10.0.130.7</code>. Blocks either nest or are disjoint, so the check is simple. The real fix is planning: one central list (an IPAM) of who owns which block.</p>`, code: { lang: 'python', run: true, code: `import ipaddress
from itertools import combinations
vpcs = {"team-a": "10.0.0.0/16", "team-b": "10.0.128.0/20", "team-c": "10.1.0.0/16", "on-prem": "10.0.200.0/24"}
nets = {k: ipaddress.ip_network(v) for k, v in vpcs.items()}
for (n1, a), (n2, b) in combinations(nets.items(), 2):
    if a.overlaps(b):
        print(f"CONFLICT {n1} {a} overlaps {n2} {b}")` } }
    ],
    deepDive: `<p>🟣 <b>Why blocks are aligned.</b> A /n block always starts at a multiple of its size, because the host bits run over every value from all-zeros to all-ones. That gives the "nested or disjoint" property: two prefixes overlap if and only if the shorter one contains the longer one's network address. It is also why <code>10.0.3.0/22</code> is not a real network (3 is not a multiple of 4) and tools either reject it or round it down to <code>10.0.0.0/22</code>.</p>
      <p><b>Longest prefix match.</b> Route tables and firewalls pick the <b>most specific</b> matching route: for <code>10.0.3.7</code>, a <code>10.0.3.0/24</code> route beats <code>10.0.0.0/16</code>, which beats <code>0.0.0.0/0</code>. That lets a VPC say "local traffic stays here, everything else goes to the NAT or internet gateway". <b>Summarisation</b> is the reverse trick: four adjacent /24s (<code>10.0.0.0/24</code>-<code>10.0.3.0/24</code>) can be announced as one <code>10.0.0.0/22</code> (<code>ipaddress.collapse_addresses</code> does it).</p>
      <p><b>Cloud sizing realities.</b> AWS VPCs and subnets can be /16 to /28, a VPC can add secondary CIDR blocks later, but a subnet cannot be resized, only replaced. Address use grows faster than expected: Kubernetes with the AWS VPC CNI gives every <b>pod</b> a VPC IP, Lambda and managed services drop network interfaces into your subnets, and load balancers need free IPs to scale. Running out shows up as "insufficient free addresses" or pods stuck pending. Plan /20s or larger for compute subnets, keep spare blocks, and track allocations in an IPAM (AWS VPC IPAM, Azure IPAM, or even a reviewed file in Git).</p>
      <p><b>IPv6.</b> Addresses are 128 bits written in hex (<code>2001:db8::/32</code> is the documentation range). Subnets are almost always <b>/64</b>, AWS gives a VPC a /56 (256 subnets), and there is no NAT or scarcity: the maths is the same, the numbers are just huge.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> an assistant can produce a full subnet plan in seconds, and it is great at turning "three tiers, three zones, room to grow" into a table of CIDRs or Terraform <code>cidrsubnet()</code> calls. It also explains masks patiently.</p>
      <p><b>Where it goes wrong:</b> language models still make <b>arithmetic slips</b> with subnet boundaries (a block starting at a non-multiple, a "split" that overlaps, forgetting the 5 reserved IPs in AWS). A subtly wrong plan is worse than none, because it fails months later at peering time. <b>Old school still matters:</b> you should be able to check a /27 in your head. <b>New school:</b> ask the AI for the plan, then verify it with a deterministic tool such as Python's <code>ipaddress</code> (like the snippets above) or <code>terraform console</code> before anything is created.</p>`,
    problems: [P({
      t: 'List every /N subnet inside a block', l: 'Easy', tags: ['cidr', 'subnetting', 'python'], co: ['AWS', 'Oracle', 'TCS'], lang: 'python',
      s: `<p>Write <code>list_subnets(cidr, new_prefix)</code> that returns every subnet of size <code>/new_prefix</code> inside <code>cidr</code>, in order, as strings like <code>"10.0.1.0/24"</code>. The input may have host bits set (treat <code>192.0.2.77/27</code> as <code>192.0.2.64/27</code>). If <code>new_prefix</code> is smaller than the block's prefix or larger than 32, return an empty list.</p>`,
      c: `<p>IPv4 only. Python standard library only. <code>new_prefix − prefix ≤ 12</code> (at most 4096 results).</p>`,
      ex: `<p><code>list_subnets("10.0.0.0/22", 24)</code> → ${H.c('g', '["10.0.0.0/24", "10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]')}: /22 → /24 adds 2 bits, so 2<sup>2</sup> = 4 subnets of 256 addresses.</p>`,
      bw: `<p>Looping over every single address in the block and grouping them: for a /8 that is 16 million iterations to produce a handful of results. The answer only depends on the start address and the block size.</p>`,
      bc: `import ipaddress

def list_subnets(cidr, new_prefix):
    net = ipaddress.ip_network(cidr, strict=False)
    seen = []
    for ip in net:                       # touches every address: slow for big blocks
        s = str(ipaddress.ip_network(f"{ip}/{new_prefix}", strict=False))
        if s not in seen:
            seen.append(s)
    return seen`,
      q: ['How many /26 subnets fit in a /24?', ['4', '2', '26', '64'], 0, '26 − 24 = 2 extra network bits, and 2<sup>2</sup> = 4 subnets of 64 addresses each.'],
      h: ['<p>Hint 1: the number of subnets is 2<sup>(new − old)</sup> and each one has 2<sup>(32 − new)</sup> addresses.</p>', '<p>Hint 2: <code>ipaddress.ip_network(cidr, strict=False)</code> normalises host bits away; <code>.subnets(new_prefix=N)</code> yields the pieces.</p>', '<p>Hint 3: guard the edge cases first: new prefix smaller than the current one (that would be a supernet) or above 32 returns <code>[]</code>.</p>'],
      a: `<p>Parse the block with <code>strict=False</code> so an address with host bits is rounded down to its network. Reject impossible prefixes. Then each subnet starts at <code>network + k × size</code> for k = 0 … 2<sup>(new − old)</sup> − 1; <code>subnets(new_prefix=...)</code> does exactly that. Return them as strings. Manual version: size = 2<sup>32−new</sup>, start = int(network), and format <code>ip_address(start + k*size)</code>.</p>`,
      code: `import ipaddress

def list_subnets(cidr, new_prefix):
    """All /new_prefix subnets inside cidr, in address order."""
    net = ipaddress.ip_network(cidr, strict=False)   # 192.0.2.77/27 -> 192.0.2.64/27
    if new_prefix < net.prefixlen or new_prefix > 32:
        return []                                       # not a split of this block
    return [str(s) for s in net.subnets(new_prefix=new_prefix)]`,
      cx: `<p>O(number of subnets returned). No per-address work.</p>`,
      f: ['How would you return only the first free subnet given a list of used ones?', 'What does Terraform\'s <code>cidrsubnet("10.0.0.0/16", 8, 3)</code> return?'],
      tests: { sig: 'string int -> string[]', fn: 'listSubnets', cases: [
        [['10.0.0.0/22', 24], ['10.0.0.0/24', '10.0.1.0/24', '10.0.2.0/24', '10.0.3.0/24']],
        [['192.0.2.0/24', 26], ['192.0.2.0/26', '192.0.2.64/26', '192.0.2.128/26', '192.0.2.192/26']],
        [['192.0.2.77/27', 27], ['192.0.2.64/27']],
        [['198.51.100.0/24', 23], []],
        [['203.0.113.0/30', 32], ['203.0.113.0/32', '203.0.113.1/32', '203.0.113.2/32', '203.0.113.3/32']],
        [['10.0.0.0/16', 18], ['10.0.0.0/18', '10.0.64.0/18', '10.0.128.0/18', '10.0.192.0/18']],
        [['172.16.0.0/12', 14], ['172.16.0.0/14', '172.20.0.0/14', '172.24.0.0/14', '172.28.0.0/14']],
        [['10.1.2.3/32', 33], []]
      ] }
    })]
  });

  // ───────────────────────── Topic 6: public vs private networks and NAT ─────────────────────────
  topics.push({
    title: 'Public vs Private Networks and NAT: Why a Private Instance Cannot Reach the Internet',
    analogy: `<p>A company has <b>internal phone extensions</b> (private IPs: anyone can reuse 2001 in their own office) and <b>one main public number</b> (a public IP, unique in the world). When an employee calls out, the switchboard places the call from the main number and remembers which extension asked, so the reply reaches the right desk: that is <b>NAT</b>. Outsiders cannot dial extension 2001 directly; they can only reach someone if reception forwards the call (a load balancer or port forward). And if the switchboard is missing, employees can talk to each other but nobody can call out at all.</p>`,
    explain: `<p>🟢 <b>Public vs private addresses.</b> A <b>public</b> IP is unique on the internet and routable from anywhere. <b>Private</b> ranges (RFC 1918) are reused inside millions of networks and are never routed on the internet. Know these ranges cold (<b>CS Core 11</b> covers the theory):</p>
      ${H.table(['Range', 'What it is', 'Where you see it'], [
        ['<code>10.0.0.0/8</code>', 'private (RFC 1918)', 'most VPCs / VNets, corporate networks'],
        ['<code>172.16.0.0/12</code> (172.16-172.31)', 'private (RFC 1918)', 'Docker default bridge 172.17.0.0/16, some VPCs'],
        ['<code>192.168.0.0/16</code>', 'private (RFC 1918)', 'home routers, labs'],
        ['<code>100.64.0.0/10</code>', 'carrier-grade NAT (shared)', 'ISPs, some Kubernetes pod networks'],
        ['<code>169.254.0.0/16</code>', 'link-local', 'cloud metadata at <code>169.254.169.254</code>; "no DHCP answer" on a laptop'],
        ['<code>127.0.0.0/8</code>', 'loopback', 'this machine only'],
        ['<code>192.0.2.0/24</code>, <code>198.51.100.0/24</code>, <code>203.0.113.0/24</code>', 'documentation (TEST-NET)', 'examples like this module; never real hosts']
      ])}
      <p>🟢 <b>What makes a cloud subnet "public" or "private"?</b> Not the addresses: both use private IPs. It is the <b>route table</b>:</p>
      ${H.table(['Subnet', 'Route table', 'Outbound to internet', 'Inbound from internet'], [
        ['<b>Public</b>', '<code>10.0.0.0/16 → local</code><br><code>0.0.0.0/0 → igw-…</code> (internet gateway)', 'yes, if the instance has a public IP', 'yes, if the security group allows'],
        ['<b>Private</b> with NAT', '<code>10.0.0.0/16 → local</code><br><code>0.0.0.0/0 → nat-…</code> (NAT gateway in a public subnet)', 'yes, appears as the NAT gateway\'s public IP', '<b>no</b> (NAT only lets replies back in)'],
        ['<b>Isolated</b>', '<code>10.0.0.0/16 → local</code> only', '<b>no</b>: <code>apt update</code> hangs, then times out', 'no']
      ])}
      <p>🔵 <b>NAT in one picture.</b> A private instance <code>10.0.2.15</code> sends a packet to <code>203.0.113.10:443</code>. The route table sends it to the NAT gateway, which rewrites the <b>source</b> to its own public IP (say <code>198.51.100.7</code>) and a free port, and writes the mapping in a table. The reply comes back to <code>198.51.100.7</code>, the NAT looks up the mapping and rewrites the destination back to <code>10.0.2.15</code>. This is <b>source NAT</b> (SNAT, also called PAT or masquerade). Your home router does the same thing.</p>
      <p>🔵 <b>Public IPs on instances are NAT too.</b> In AWS an instance with a public IP never sees it on its network interface: <code>ip addr</code> shows only <code>10.0.1.25</code>. The internet gateway translates 1:1 between the private and public address. To find the public IP from inside, ask the metadata service or an outside service.</p>`,
    clues: [
      '"private instance cannot reach the internet / apt update hangs / pip install times out" → private subnet route table: is there <code>0.0.0.0/0 → NAT gateway</code>, and is the NAT gateway itself in a <b>public</b> subnet?',
      '"I can\'t SSH to my instance in the private subnet from home" → by design: use a bastion, SSM Session Manager, or a VPN',
      '"partner wants a fixed IP to allowlist our outbound calls" → route egress through a NAT gateway with an Elastic IP',
      '"ip addr does not show my public IP" → normal in AWS: the internet gateway does 1:1 NAT',
      '"NAT gateway bill is huge" → traffic to S3/DynamoDB through NAT: add a gateway VPC endpoint',
      '"is 172.20.5.4 public?" → no: it is inside 172.16.0.0/12'
    ],
    code: [R`# Lab: a Docker container is itself a private host behind NAT.
# docker run -it --rm ubuntu:24.04 bash ; apt-get update -qq && apt-get install -y -qq iproute2 curl > /dev/null
ip -4 -br addr            # eth0 ... 172.17.0.2/16   <- private (inside 172.16.0.0/12)
ip route                  # default via 172.17.0.1     <- the Docker host acts as the NAT gateway
curl -s https://checkip.amazonaws.com   # the PUBLIC IP the internet sees: your router / host, not 172.17.0.2

# On the Docker HOST (not in the container), the NAT rule that makes it work:
#   sudo iptables -t nat -S POSTROUTING | grep MASQUERADE
#   -A POSTROUTING -s 172.17.0.0/16 ! -o docker0 -j MASQUERADE
# and the live translation table (needs the conntrack tool):
#   sudo conntrack -L | grep 172.17.0.2

# On a cloud VM: the public IP is not on the interface; ask the metadata service (AWS IMDSv2)
#   TOKEN=$(curl -s -X PUT http://169.254.169.254/latest/api/token -H 'X-aws-ec2-metadata-token-ttl-seconds: 60')
#   curl -s -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/meta-data/public-ipv4`,
    { lang: 'python', run: true, title: 'Classify addresses: private, CGNAT, link-local, documentation or public', code: `import ipaddress

# Explicit lists, so the rules are visible (Python's is_private also exists, but its
# definition includes more special ranges and changed in Python 3.13).
CLASSES = [
    ("RFC 1918 private", ["10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16"]),
    ("carrier-grade NAT", ["100.64.0.0/10"]),
    ("link-local / metadata", ["169.254.0.0/16"]),
    ("loopback", ["127.0.0.0/8"]),
    ("documentation", ["192.0.2.0/24", "198.51.100.0/24", "203.0.113.0/24"]),
]

def classify(ip_text):
    ip = ipaddress.ip_address(ip_text)
    for name, blocks in CLASSES:
        if any(ip in ipaddress.ip_network(b) for b in blocks):
            return name
    return "public (routable on the internet)"

for ip in ["10.0.2.15", "172.20.5.4", "172.32.0.1", "192.168.1.10", "100.70.1.2",
           "169.254.169.254", "127.0.0.1", "203.0.113.10", "8.8.8.8"]:
    print(f"{ip:16} {classify(ip)}")` }],
    codeTitle: ['Your container is behind NAT', 'Classify any IPv4 address'],
    viz: [{
      title: 'Follow a packet out of a subnet: internet gateway, NAT gateway, or nothing',
      input: 'route=nat publicip=no',
      inputLabel: 'route=igw|nat|none (default route of the subnet) publicip=yes|no (does the instance have a public IP?)',
      gen: function (input) {
        var o = { route: 'nat', publicip: 'no' };
        String(input || '').trim().split(/\s+/).filter(Boolean).forEach(function (kv) {
          var m = kv.match(/^(route|publicip)=(\w+)$/);
          if (!m) throw new Error('Use: route=igw|nat|none publicip=yes|no');
          o[m[1]] = m[2].toLowerCase();
        });
        if (['igw', 'nat', 'none'].indexOf(o.route) < 0) throw new Error('route must be igw, nat or none');
        if (['yes', 'no'].indexOf(o.publicip) < 0) throw new Error('publicip must be yes or no');
        var inst = '10.0.2.15', dst = '203.0.113.10', eip = '198.51.100.7', pub = '198.51.100.25';
        var nodes = [box('I', 'instance ' + inst, 10, 30, 20), box('RT', 'VPC router', 34, 30, 16), box('N', 'NAT gateway (public subnet)', 58, 12, 22), box('G', 'internet gateway', 58, 48, 20), box('S', 'server ' + dst, 88, 30, 20)];
        var edges = [['I', 'RT'], ['RT', 'N'], ['N', 'G'], ['RT', 'G'], ['G', 'S']];
        function g(hl, ehl) { return { type: 'graph', directed: true, height: 60, nodes: nodes, edges: edges, hl: hl || {}, ehl: ehl || {} }; }
        var routes = [['10.0.0.0/16', 'local']];
        if (o.route !== 'none') routes.push(['0.0.0.0/0', o.route === 'igw' ? 'igw-0a1b (internet gateway)' : 'nat-0c2d (NAT gateway)']);
        var f = [];
        f.push({ narr: 'The instance runs <code>apt update</code>, which needs to reach a package mirror at ' + dst + ':443. It builds a packet with its own <b>private</b> source address. ' + (o.publicip === 'yes' ? 'It also has a public IP (' + pub + '), but that lives on the internet gateway, not on its network card.' : 'It has <b>no</b> public IP.'), parts: [
          g({ I: 'cur' }), { type: 'table', label: 'packet', columns: ['src', 'dst'], rows: [[inst + ':41000', dst + ':443']] }
        ] });
        f.push({ narr: 'The VPC router looks up the destination in the subnet\'s <b>route table</b> using longest prefix match. ' + dst + ' is not in 10.0.0.0/16, so only a <code>0.0.0.0/0</code> route can match. ' + (o.route === 'none' ? '<span class="c-r">There is none.</span>' : 'It matches <b>' + routes[1][1] + '</b>.'), parts: [
          g({ RT: 'cur' }, { 'I-RT': 'ok' }), { type: 'table', label: 'route table of this subnet', columns: ['destination', 'target'], rows: routes, hl: o.route === 'none' ? {} : { 1: 'ok' } }
        ] });
        if (o.route === 'none') {
          f.push({ narr: 'No matching route: the packet is <b>dropped</b> silently. The instance retries and <code>apt update</code> eventually prints <i>Connection timed out</i>. This is an <b>isolated</b> subnet: fine for a database, wrong for a server that needs updates.', parts: [g({ RT: 'bad' }, { 'I-RT': 'ok' })] });
          f.push({ narr: 'Fix options: add <code>0.0.0.0/0 → NAT gateway</code> (outbound only), or keep it isolated and use <b>VPC endpoints</b> / an internal package mirror for the few services it needs.', parts: [{ type: 'table', label: 'fix', columns: ['option', 'effect'], rows: [['0.0.0.0/0 → nat-…', 'outbound internet via the NAT\'s Elastic IP'], ['VPC endpoint for S3 / package repo', 'reach specific services privately, no internet at all']] }] });
        } else if (o.route === 'igw' && o.publicip === 'no') {
          f.push({ narr: 'The packet reaches the <b>internet gateway</b>. The IGW only translates for instances that have a public IP. This one has none, so there is nothing to translate the private source into: the packet is <b>dropped</b>. Result: timeout. (A private address can never travel on the internet.)', parts: [g({ G: 'bad' }, { 'I-RT': 'ok', 'RT-G': 'ok' })] });
          f.push({ narr: 'Fix options: give the instance a public IP (it becomes a <b>public</b> instance: think about the security group), or, better for servers, move it to a private subnet whose default route points at a NAT gateway.', parts: [{ type: 'table', label: 'rule of thumb', columns: ['subnet', 'needs'], rows: [['public (0.0.0.0/0 → igw)', 'instance public IP'], ['private (0.0.0.0/0 → nat)', 'NAT gateway in a PUBLIC subnet with an Elastic IP']] }] });
        } else if (o.route === 'igw') {
          f.push({ narr: 'The <b>internet gateway</b> does <b>1:1 NAT</b>: it rewrites the source ' + inst + ' to the instance\'s public IP <b>' + pub + '</b>. The mapping is static, so inbound connections to ' + pub + ' work too (if the security group allows them).', parts: [g({ G: 'ok' }, { 'I-RT': 'ok', 'RT-G': 'ok', 'G-S': 'ok' }), { type: 'table', label: 'packet after the IGW', columns: ['src', 'dst'], rows: [[pub + ':41000', dst + ':443']], hl: { 0: 'ok' } }] });
          f.push({ narr: 'The server replies to ' + pub + '. The IGW translates the destination back to ' + inst + '. <code>apt update</code> works. Note that the instance is now reachable from the internet: security groups are its only shield.', parts: [{ type: 'table', label: 'reply', columns: ['hop', 'src', 'dst'], rows: [['internet → IGW', dst + ':443', pub + ':41000'], ['IGW → instance', dst + ':443', inst + ':41000']], hl: { 1: 'ok' } }] });
        } else {
          f.push({ narr: 'The packet goes to the <b>NAT gateway</b>, which lives in a <b>public</b> subnet. It rewrites the source to its own Elastic IP <b>' + eip + '</b> and picks a free source port, then records the mapping.', parts: [
            g({ N: 'ok' }, { 'I-RT': 'ok', 'RT-N': 'ok' }),
            { type: 'map', label: 'NAT translation table', entries: [[eip + ':50123 ↔ ' + dst + ':443', inst + ':41000']], hl: {} },
            { type: 'table', label: 'packet after NAT', columns: ['src', 'dst'], rows: [[eip + ':50123', dst + ':443']], hl: { 0: 'ok' } }
          ] });
          f.push({ narr: 'The NAT gateway sends it out through the <b>internet gateway</b> of its own public subnet (the NAT has a public IP, so the IGW is happy). The mirror sees the request coming from ' + eip + '; it never sees 10.0.2.15.', parts: [g({ G: 'ok', S: 'ok' }, { 'I-RT': 'ok', 'RT-N': 'ok', 'N-G': 'ok', 'G-S': 'ok' })] });
          f.push({ narr: 'The reply comes back to ' + eip + ':50123. The NAT finds that entry in its table and rewrites the destination to <b>' + inst + ':41000</b>. <code>apt update</code> works.', parts: [
            { type: 'map', label: 'NAT translation table (lookup)', entries: [[eip + ':50123 ↔ ' + dst + ':443', inst + ':41000']], hl: one(eip + ':50123 ↔ ' + dst + ':443', 'ok') },
            { type: 'table', label: 'reply', columns: ['hop', 'src', 'dst'], rows: [['internet → NAT', dst + ':443', eip + ':50123'], ['NAT → instance', dst + ':443', inst + ':41000']], hl: { 1: 'ok' } }
          ] });
          f.push({ narr: 'But a <b>new</b> connection <i>from</i> the internet to ' + eip + ' matches no table entry, so it is dropped. NAT gives private instances <b>outbound-only</b> access: exactly what you want for app and database servers. Inbound traffic should come through a load balancer.', parts: [{ type: 'table', label: 'NAT direction rules', columns: ['direction', 'result'], rows: [['instance → internet (new)', 'allowed, translated'], ['internet → instance (reply)', 'allowed, matches table'], ['internet → instance (new)', 'dropped: no mapping']], hl: { 2: 'bad' } }] });
        }
        f.push({ narr: 'Try the other cases: <code>route=none</code> (isolated subnet, timeout), <code>route=igw publicip=no</code> (the classic "I put it in a public subnet but it has no public IP"), <code>route=igw publicip=yes</code> (public instance).', parts: [{ type: 'table', label: 'summary', columns: ['default route', 'public IP', 'outbound', 'inbound'], rows: [['none', '-', 'timeout', 'no'], ['igw', 'no', 'timeout', 'no'], ['igw', 'yes', 'works (as public IP)', 'possible'], ['nat', '-', 'works (as NAT IP)', 'no']], hl: one(o.route === 'none' ? 0 : o.route === 'nat' ? 3 : o.publicip === 'yes' ? 2 : 1, 'sel') }] });
        return f;
      }
    }],
    examples: [
      { title: 'Ticket: "yum/apt hangs on my new private instance"', html: `<p>A new instance in <code>10.0.2.0/24</code> cannot install packages; <code>curl -m 5 https://example.com</code> times out. <code>ip route</code> on the box shows a normal default route (to the VPC router, <code>10.0.2.1</code>), so the problem is in the <b>subnet's route table</b>: it has only <code>10.0.0.0/16 → local</code>. Someone created the NAT gateway but never added the route. Add <code>0.0.0.0/0 → nat-…</code> to the private route table and the timeout disappears.</p>`, code: R`curl -sS -m 5 -o /dev/null https://example.com ; echo "exit=$?"   # exit=28 (timeout)
ip route    # default via 10.0.2.1 dev eth0  <- always the VPC router; the real decision is in the route table
# Read-only check with the AWS CLI (example IDs):
aws ec2 describe-route-tables --filters Name=association.subnet-id,Values=subnet-0abc1234 \
  --query 'RouteTables[].Routes[].[DestinationCidrBlock,GatewayId,NatGatewayId]' --output table` },
      { title: 'The NAT gateway was placed in the private subnet', html: `<p>A subtle variant: the route <code>0.0.0.0/0 → nat-…</code> exists, but the NAT gateway itself was created in a <b>private</b> subnet. The NAT translates the packet, then follows <b>its own</b> subnet's route table, which has no internet gateway route. Traffic dies one hop later. Rule: the NAT gateway goes in a <b>public</b> subnet (default route to the IGW), and private subnets point at it.</p>`, code: R`# Which subnet is the NAT gateway in, and what is that subnet's default route?
aws ec2 describe-nat-gateways --nat-gateway-ids nat-0c2d5678 --query 'NatGateways[].[SubnetId,State]' --output text
aws ec2 describe-route-tables --filters Name=association.subnet-id,Values=subnet-0nat9999 \
  --query 'RouteTables[].Routes[?DestinationCidrBlock==` + "`0.0.0.0/0`" + `]'` },
      { title: 'A partner needs one fixed IP to allowlist', html: `<p>A payment provider only accepts API calls from allowlisted IPs. Your app runs on an auto-scaling group in private subnets, and instances come and go. Because all their outbound traffic leaves through the NAT gateway, the provider sees exactly one address: the NAT gateway's <b>Elastic IP</b>. Give them that (one per availability zone if you run a NAT gateway per AZ). Verify from an instance with an outside "what is my IP" service.</p>`, code: R`curl -s https://checkip.amazonaws.com    # from any private instance: prints the NAT gateway's Elastic IP` },
      { title: 'Cost trap: S3 traffic through the NAT gateway', html: `<p>A data job in a private subnet copies 20 TB a month from S3. It works, but the NAT gateway charges per GB processed, so the bill is far higher than the S3 cost. S3 and DynamoDB support <b>gateway VPC endpoints</b>: a route-table entry that sends their traffic privately and at no per-GB charge. Other services use interface endpoints (PrivateLink). Endpoints also let an isolated subnet reach just the services it needs without any internet route.</p>`, code: R`# After adding a gateway endpoint for S3, the route table gains a prefix-list route:
#   pl-6ca54005 (com.amazonaws.REGION.s3)  ->  vpce-0123abcd
aws ec2 describe-vpc-endpoints --query 'VpcEndpoints[].[VpcEndpointType,ServiceName,State]' --output table` }
    ],
    deepDive: `<p>🟣 <b>SNAT, DNAT and connection tracking.</b> Source NAT rewrites the sender (outbound sharing of one public IP). Destination NAT rewrites the receiver (port forwarding, and what a load balancer effectively does for inbound traffic). Both rely on <b>connection tracking</b>: a table of active flows (on Linux, <code>conntrack -L</code>; limit <code>nf_conntrack_max</code>). A full conntrack table drops new connections with "nf_conntrack: table full" in the kernel log, a classic problem on busy NAT boxes and Kubernetes nodes.</p>
      <p><b>Managed NAT gateway limits.</b> An AWS NAT gateway is <b>zonal</b>: if its availability zone fails, private subnets in other zones that route to it lose internet, so production uses one NAT gateway per AZ with per-AZ route tables. It supports about 55,000 simultaneous connections to each unique destination (IP, port, protocol), scales bandwidth automatically, and closes flows idle for 350 seconds. It charges per hour and per GB processed. Azure NAT Gateway and Google Cloud NAT play the same role; Azure is retiring "default outbound access", so new Azure subnets increasingly need an explicit NAT gateway or other egress.</p>
      <p><b>Public IPv4 costs money.</b> Since 2024 AWS charges for every public IPv4 address, in use or idle. That pushes designs towards fewer public IPs: instances in private subnets, NAT gateways for egress, load balancers for ingress, and IPv6 where possible. With <b>IPv6</b> every address is globally unique and there is no NAT; "private" behaviour comes from an <b>egress-only internet gateway</b> (outbound only) plus security groups.</p>
      <p><b>NAT breaks some things.</b> Protocols that embed IPs inside the payload (old FTP, SIP) need helpers. Many clients behind one NAT IP share its rate limits on external APIs. Logs on the destination show only the NAT IP, so you need NAT gateway or flow logs to map traffic back to an instance. And when two networks with the <b>same private range</b> must talk, a "private NAT gateway" or PrivateLink can translate between them, but re-addressing is usually cleaner.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> assistants generate VPC layouts (public, private, isolated subnets per AZ, NAT per AZ) in Terraform or CloudFormation in seconds, and explain route tables clearly. They are useful for reviewing a design: "which subnets can reach the internet, and how?"</p>
      <p><b>Where it goes wrong:</b> a frequent "fix" for "private instance cannot reach the internet" is "move it to a public subnet and give it a public IP". That works and quietly exposes a database or app server to the internet. Assistants also forget that a NAT gateway must sit in a public subnet, or design a single NAT gateway for three zones. <b>Your judgement:</b> keep servers private, give them egress through NAT or endpoints, ingress through a load balancer, and check AI-generated route tables line by line.</p>`,
    problems: [P({
      t: 'Private instance cannot reach the internet', l: 'Medium', tags: ['nat', 'route tables', 'vpc', 'private subnet'], co: ['AWS Support', 'Microsoft', 'Capgemini'],
      s: `<p>An instance <code>10.0.2.15</code> in subnet <code>private-a</code> cannot run <code>apt update</code> (it hangs, then times out). It must <b>not</b> be reachable from the internet. Other instances in <code>private-b</code> work fine. List what you check, in order, with the command or console view for each, and give the correct design.</p>`,
      ex: `<p>Route table of <code>private-a</code>: ${H.c('r', '10.0.0.0/16 → local')} only. Route table of <code>private-b</code>: ${H.c('g', '0.0.0.0/0 → nat-0c2d')}. The fix is one route, not a public IP.</p>`,
      bw: `<p>Assigning a public IP or moving the instance to the public subnet. It may "work", but the instance is now internet-facing, which breaks the requirement, and the real cause (missing route) remains for the next instance.</p>`,
      q: ['Which change gives private-a outbound internet without exposing its instances?', ['Add 0.0.0.0/0 → the NAT gateway to private-a\'s route table', 'Add 0.0.0.0/0 → the internet gateway to private-a\'s route table', 'Give the instance an Elastic IP', 'Open all outbound ports in the security group'], 0, 'A NAT gateway route gives outbound-only access. An IGW route or a public IP makes the instance directly reachable; security group outbound is already open by default.'],
      h: ['<p>Hint 1: a timeout means drop; for a private instance the most common drop is "no route out". Compare the working subnet with the broken one.</p>', '<p>Hint 2: check in order: the subnet route table, the NAT gateway state and <b>its</b> subnet (must be public, with a route to the IGW), then security group outbound and NACLs, then DNS.</p>', '<p>Hint 3: the target design: NAT gateway per AZ in public subnets, private route tables per AZ with 0.0.0.0/0 → that AZ\'s NAT, plus gateway endpoints for S3.</p>'],
      a: `<p><b>1. Confirm the symptom on the instance:</b> <code>curl -m 5 https://example.com</code> times out (exit 28) while <code>dig example.com</code> resolves, so DNS works and egress is dropped. <b>2. Route table of private-a:</b> no <code>0.0.0.0/0</code> route → that is the bug. (Also check the subnet is associated with the route table you think; a subnet without an explicit association uses the VPC's main route table.) <b>3. If the route exists:</b> check the NAT gateway is <code>available</code>, sits in a <b>public</b> subnet whose route table has <code>0.0.0.0/0 → igw</code>, and has an Elastic IP. <b>4. Filters:</b> security group outbound (default allows all), NACLs on private-a and on the NAT's subnet (outbound 443, inbound ephemeral 1024-65535). <b>5. Fix:</b> add <code>0.0.0.0/0 → nat-…</code> (the NAT in the same AZ) to private-a's route table, then re-test. <b>Design:</b> one NAT gateway per AZ in public subnets, one private route table per AZ, gateway endpoints for S3/DynamoDB to cut NAT cost, inbound only through a load balancer, admin access through SSM rather than SSH from the internet.</p>`,
      code: R`# On the instance: DNS ok? egress dropped?
dig +short example.com
curl -sS -m 5 -o /dev/null https://example.com ; echo "curl exit=$?"   # 28 = timeout
# Read-only AWS CLI checks (example IDs)
SUBNET=subnet-0priva001
aws ec2 describe-route-tables --filters Name=association.subnet-id,Values="$SUBNET" \
  --query 'RouteTables[].Routes[].[DestinationCidrBlock,NatGatewayId,GatewayId,State]' --output table
aws ec2 describe-nat-gateways --query 'NatGateways[].[NatGatewayId,SubnetId,State,NatGatewayAddresses[0].PublicIp]' --output table
# The fix (one route), then re-test from the instance:
#   aws ec2 create-route --route-table-id rtb-0priva001 --destination-cidr-block 0.0.0.0/0 --nat-gateway-id nat-0c2d5678`,
      cx: `<p>A handful of read-only checks and one route. Total time about ten minutes, with no change to the instance itself.</p>`,
      f: ['What happens to private subnets in zone b if the only NAT gateway lives in zone a and zone a fails?', 'How would you give this instance access to S3 only, with no internet at all?']
    })]
  });

  // ───────────────────────── Topic 7: firewalls and security groups ─────────────────────────
  topics.push({
    title: 'Firewalls and Security Groups: Stateful vs Stateless, and the Rule That Blocks Your Port',
    analogy: `<p>A <b>security group</b> is a <b>bouncer standing next to each server</b> with a guest list. Only people on the list get in, and the bouncer <b>remembers</b> everyone he let out, so when they come back he waves them through (stateful). A <b>network ACL</b> is a <b>toll gate at the entrance of the whole neighbourhood</b> (the subnet). It checks a numbered rule list in order, both for cars going in and cars going out, and it has <b>no memory</b>: a car returning home must match an "out" rule and an "in" rule on its own (stateless). The host firewall is a <b>lock on the server's own door</b>. A visitor must get past all three.</p>`,
    explain: `<p>🟢 <b>Layers of filtering</b>, from outside in. A packet to your instance must pass each layer that exists:</p>
      ${H.table(['Layer', 'Where', 'Examples', 'Default'], [
        ['Network ACL', 'subnet edge', 'AWS NACL', 'default NACL allows all; custom NACLs deny all'],
        ['Security group / NSG', 'each network interface', 'AWS SG, Azure NSG, GCP VPC firewall rules', 'inbound: deny all; outbound: allow all'],
        ['Host firewall', 'inside the OS', 'nftables/iptables, ufw (Ubuntu), firewalld (RHEL), Windows Firewall', 'distro-dependent'],
        ['Application', 'the program', 'nginx <code>allow/deny</code>, PostgreSQL <code>pg_hba.conf</code>', 'app-dependent']
      ])}
      <p>🟢 <b>Security groups (AWS) in five rules.</b> 1) <b>Allow rules only</b>; anything not allowed is denied. 2) <b>Stateful</b>: if a request is allowed in, its reply goes out automatically (and vice versa). 3) All rules are evaluated together; order does not matter. 4) A source can be a CIDR <b>or another security group</b> ("allow 5432 from members of <code>sg-app</code>"), which keeps working as instances come and go. 5) A blocked packet is <b>dropped silently</b>, so the client sees a <b>timeout</b>.</p>
      <p>🟢 <b>Network ACLs in four rules.</b> 1) Numbered rules evaluated <b>lowest first</b>; the first match wins. 2) Both <b>allow and deny</b>. 3) <b>Stateless</b>: replies need their own rule, on the client's <b>ephemeral ports</b> (allow 1024-65535). 4) Apply to the whole subnet. Use them for coarse guard rails (block a bad range); do the fine-grained work in security groups.</p>
      ${H.table(['', 'Security group', 'Network ACL', 'Azure NSG', 'GCP firewall rule'], [
        ['Attached to', 'network interface', 'subnet', 'NIC or subnet', 'VPC (targets by tag / service account)'],
        ['Stateful?', 'yes', '<b>no</b>', 'yes', 'yes'],
        ['Deny rules?', 'no (allow only)', 'yes', 'yes', 'yes'],
        ['Order', 'all evaluated', 'by rule number', 'by priority (100-4096)', 'by priority']
      ])}
      <p>🔵 <b>Host firewalls.</b> Modern Linux uses <b>nftables</b> under the hood (the <code>iptables</code> command on Ubuntu 22.04+ and RHEL 9 is a compatibility layer over it). Friendly front-ends: <code>ufw</code> on Ubuntu (<code>ufw status verbose</code>, <code>ufw allow 443/tcp</code>) and <code>firewalld</code> on RHEL (<code>firewall-cmd --list-all</code>). <code>sudo nft list ruleset</code> shows the real, final rules whatever tool wrote them.</p>
      <p>🔵 <b>Least privilege in practice:</b> 443 from the internet only to the load balancer; app port only from the load balancer's security group; database port only from the app security group; SSH/RDP from nowhere (use SSM Session Manager or a bastion), or from one admin range at most.</p>`,
    clues: [
      '"timeout to port X, the service is running" → a security group, NACL or host firewall is dropping: find the missing allow',
      '"SSH works but the app port does not" → per-port rule missing; compare the SG rules for 22 and the app port',
      '"handshake starts but the connection hangs" / "works one way only" → stateless NACL missing the return rule for ephemeral ports',
      '"load balancer targets unhealthy after a security clean-up" → target SG no longer allows the health check port from the LB SG',
      '"we opened 0.0.0.0/0 on 22 to test" → security finding: restrict, or use SSM / bastion',
      '"ufw says deny but the Docker container port is reachable" → Docker writes its own iptables rules ahead of ufw'
    ],
    code: [R`# Host firewall basics. Run on a VM you own (a container usually lacks the privileges).
# Ubuntu: ufw
sudo ufw status verbose
sudo ufw allow from 10.0.9.0/24 to any port 22 proto tcp   # SSH only from the bastion subnet
sudo ufw allow 443/tcp
sudo ufw default deny incoming && sudo ufw default allow outgoing
sudo ufw enable

# RHEL / Amazon Linux: firewalld
sudo firewall-cmd --list-all
sudo firewall-cmd --permanent --add-service=https && sudo firewall-cmd --reload

# Whatever wrote them, these are the rules the kernel really applies:
sudo nft list ruleset | less

# Cloud side, read-only (example group ID): which ports are open to the world?
aws ec2 describe-security-groups --group-ids sg-0db12345 \
  --query 'SecurityGroups[].IpPermissions[].[IpProtocol,FromPort,ToPort,IpRanges[].CidrIp,UserIdGroupPairs[].GroupId]' --output json`,
    { lang: 'python', run: true, title: 'A tiny stateful security group vs stateless NACL simulator', code: `import ipaddress

# Security group: allow-only, all rules checked, stateful (replies are automatic).
SG_DB = [
    {"proto": "tcp", "port": 5432, "src": "sg-app"},        # app servers, by group reference
    {"proto": "tcp", "port": 22, "src": "10.0.9.0/24"},     # bastion subnet
]
SG_MEMBERS = {"sg-app": ["10.0.1.25", "10.0.1.26"]}

# Network ACL on the DB subnet: numbered, first match wins, stateless (both directions).
NACL_IN = [(100, "allow", "tcp", (5432, 5432), "10.0.0.0/16"), (200, "deny", "all", (0, 65535), "0.0.0.0/0")]
NACL_OUT = [(100, "allow", "tcp", (1024, 65535), "10.0.0.0/16"), (200, "deny", "all", (0, 65535), "0.0.0.0/0")]

def sg_allows(proto, port, src):
    for r in SG_DB:
        if r["proto"] == proto and r["port"] == port:
            if r["src"].startswith("sg-") and src in SG_MEMBERS.get(r["src"], []):
                return True
            if not r["src"].startswith("sg-") and ipaddress.ip_address(src) in ipaddress.ip_network(r["src"]):
                return True
    return False                                              # implicit deny

def nacl(rules, proto, port, peer):
    for num, action, p, (lo, hi), cidr in sorted(rules):
        if p in (proto, "all") and lo <= port <= hi and ipaddress.ip_address(peer) in ipaddress.ip_network(cidr):
            return action, num
    return "deny", "*"

def check(src, port, client_port=50123):
    a_in, n_in = nacl(NACL_IN, "tcp", port, src)
    sg = sg_allows("tcp", port, src)
    a_out, n_out = nacl(NACL_OUT, "tcp", client_port, src)    # the reply goes to the client's ephemeral port
    ok = a_in == "allow" and sg and a_out == "allow"
    print(f"{src:>11} -> :{port:<5} NACL-in {a_in}({n_in})  SG {'allow' if sg else 'deny'}  NACL-out {a_out}({n_out})  => {'CONNECTS' if ok else 'TIMEOUT'}")

check("10.0.1.25", 5432)   # app server: all three layers allow
check("10.0.2.40", 5432)   # new server not in sg-app: SG drops it
check("10.0.9.10", 22)     # bastion: SG allows 22, but the NACL only allows 5432 in
check("10.0.1.26", 5432)` }],
    codeTitle: ['Host firewall and read-only cloud checks', 'Security group vs NACL simulator'],
    viz: [{
      title: 'One packet through a NACL and a security group, and the reply back',
      input: 'port=5432 src=10.0.1.25 naclout=ok',
      inputLabel: 'port=PORT src=IP naclout=ok|missing (app servers in sg-app: 10.0.1.25, 10.0.1.26; bastion subnet 10.0.9.0/24)',
      gen: function (input) {
        var o = { port: '5432', src: '10.0.1.25', naclout: 'ok' };
        String(input || '').trim().split(/\s+/).filter(Boolean).forEach(function (kv) {
          var m = kv.match(/^(port|src|naclout)=(\S+)$/);
          if (!m) throw new Error('Use: port=5432 src=10.0.1.25 naclout=ok|missing');
          o[m[1]] = m[2];
        });
        var port = Number(o.port);
        if (!(port >= 1 && port <= 65535)) throw new Error('port must be 1-65535');
        var srcN = ip2n(o.src);
        if (['ok', 'missing'].indexOf(o.naclout) < 0) throw new Error('naclout must be ok or missing');
        var vpc = cidr('10.0.0.0/16'), bastion = cidr('10.0.9.0/24'), any = cidr('0.0.0.0/0');
        var members = ['10.0.1.25', '10.0.1.26'];
        var naclIn = [[100, 'allow', 'tcp', 5432, 5432, vpc], [110, 'allow', 'tcp', 22, 22, bastion], [200, 'deny', 'all', 0, 65535, any]];
        var naclOut = o.naclout === 'ok' ? [[100, 'allow', 'tcp', 1024, 65535, vpc], [200, 'deny', 'all', 0, 65535, any]] : [[100, 'allow', 'tcp', 5432, 5432, vpc], [200, 'deny', 'all', 0, 65535, any]];
        var sg = [['tcp', 5432, 'sg-app (10.0.1.25, 10.0.1.26)'], ['tcp', 22, '10.0.9.0/24 (bastion)']];
        function rowsN(rs) { return rs.map(function (r) { return [String(r[0]), r[1], r[2], r[3] === r[4] ? String(r[3]) : r[3] + '-' + r[4], r[5].text]; }); }
        var f = [];
        f.push({ narr: 'A client <b>' + o.src + '</b> opens TCP to the database server <b>10.0.3.20:' + port + '</b> from ephemeral port 50123. Two cloud filters stand in the way: the <b>NACL</b> of the DB subnet and the <b>security group</b> on the DB network interface.', parts: [
          { type: 'graph', directed: true, height: 36, nodes: [box('C', 'client ' + o.src, 10, 18, 20), box('NA', 'NACL (subnet)', 38, 18, 18), box('SG', 'security group', 64, 18, 18), box('DB', 'db 10.0.3.20', 90, 18, 16)], edges: [['C', 'NA'], ['NA', 'SG'], ['SG', 'DB']], hl: { C: 'cur' } }
        ] });
        var hitIn = -1;
        for (var i = 0; i < naclIn.length; i++) { var r = naclIn[i]; if ((r[2] === 'all' || r[2] === 'tcp') && port >= r[3] && port <= r[4] && inNet(srcN, r[5])) { hitIn = i; break; } }
        var inOk = naclIn[hitIn][1] === 'allow';
        f.push({ narr: '<b>NACL inbound</b>: rules are checked by number, lowest first, and the <b>first match wins</b>. Rule ' + naclIn[hitIn][0] + ' matches: <b>' + naclIn[hitIn][1] + '</b>.' + (inOk ? '' : ' The packet is dropped here; the security group never sees it.'), parts: [
          { type: 'table', label: 'NACL inbound (DB subnet)', columns: ['#', 'action', 'proto', 'port', 'source'], rows: rowsN(naclIn), hl: one(hitIn, inOk ? 'ok' : 'bad') }
        ] });
        var sgHit = -1;
        if (inOk) {
          if (port === 5432 && members.indexOf(o.src) >= 0) sgHit = 0;
          else if (port === 22 && inNet(srcN, bastion)) sgHit = 1;
          f.push({ narr: '<b>Security group</b>: allow-only, all rules considered together. ' + (sgHit >= 0 ? 'Rule ' + (sgHit + 1) + ' allows it. The connection is recorded in the <b>connection tracking</b> table, so the reply will be allowed out automatically.' : 'No rule allows tcp/' + port + ' from ' + o.src + '. ' + (port === 5432 ? 'It is inside the VPC, but it is not a member of <code>sg-app</code>.' : '') + ' Implicit deny: <b>dropped silently</b>.'), parts: [
            { type: 'table', label: 'security group sg-db inbound', columns: ['proto', 'port', 'source'], rows: sg.map(function (r) { return [r[0], String(r[1]), r[2]]; }), hl: sgHit >= 0 ? one(sgHit, 'ok') : { 0: 'done', 1: 'done' } }
          ] });
        }
        var inbound = inOk && sgHit >= 0;
        var outOk = false, hitOut = -1;
        if (inbound) {
          for (var j = 0; j < naclOut.length; j++) { var q = naclOut[j]; if ((q[2] === 'all' || q[2] === 'tcp') && 50123 >= q[3] && 50123 <= q[4] && inNet(srcN, q[5])) { hitOut = j; break; } }
          outOk = naclOut[hitOut][1] === 'allow';
          f.push({ narr: 'The database answers SYN-ACK from 10.0.3.20:' + port + ' to <b>' + o.src + ':50123</b>. The security group lets it out (stateful). But the <b>NACL is stateless</b>: the reply must match an <b>outbound</b> rule for destination port 50123. Rule ' + naclOut[hitOut][0] + ' matches: <b>' + naclOut[hitOut][1] + '</b>.' + (outOk ? '' : ' <span class="c-r">The reply is dropped.</span> Someone wrote the outbound rule for port 5432, not for the client\'s ephemeral ports.'), parts: [
            { type: 'table', label: 'NACL outbound (DB subnet)', columns: ['#', 'action', 'proto', 'port', 'destination'], rows: rowsN(naclOut), hl: one(hitOut, outOk ? 'ok' : 'bad') }
          ] });
        }
        var res = !inOk ? 'Timeout: NACL inbound denied' : sgHit < 0 ? 'Timeout: security group has no matching allow' : !outOk ? 'Timeout: NACL outbound blocks the reply (stateless!)' : 'Connected';
        f.push({ narr: 'Result: <b>' + res + '</b>. ' + (res === 'Connected' ? 'All three checks passed.' : 'In every failing case the client just sees a timeout: these filters never send a "refused". VPC Flow Logs would show the dropped packets as <code>REJECT</code>.'), parts: [
          { type: 'graph', directed: true, height: 36, nodes: [box('C', 'client ' + o.src, 10, 18, 20), box('NA', 'NACL (subnet)', 38, 18, 18), box('SG', 'security group', 64, 18, 18), box('DB', 'db 10.0.3.20', 90, 18, 16)], edges: [['C', 'NA'], ['NA', 'SG'], ['SG', 'DB']], hl: res === 'Connected' ? { DB: 'ok' } : !inOk || !outOk ? { NA: 'bad' } : { SG: 'bad' }, ehl: res === 'Connected' ? { 'C-NA': 'ok', 'NA-SG': 'ok', 'SG-DB': 'ok' } : {} }
        ] });
        f.push({ narr: 'Try: <code>src=10.0.2.40</code> (not in sg-app), <code>port=22 src=10.0.9.10</code> (bastion), <code>naclout=missing</code> (the classic stateless mistake), <code>src=203.0.113.9</code> (from outside the VPC).', parts: [
          { type: 'table', label: 'fix for each failure', columns: ['failure', 'fix'], rows: [['SG no match', 'allow the port from the right security group (not a wide CIDR)'], ['NACL inbound deny', 'add a numbered allow above the deny, or leave NACLs at default'], ['NACL outbound reply', 'allow tcp 1024-65535 out to the client range']] }
        ] });
        return f;
      }
    }],
    examples: [
      { title: 'A security group blocks the database port after a scale-out', html: `<p>New app servers launched in a new subnet <code>10.0.2.0/24</code> time out on PostgreSQL. The DB security group allows 5432 from ${H.c('r', '10.0.1.0/24')} (the old subnet). The quick fix "add 10.0.2.0/24" repeats the problem next time. The durable fix: allow 5432 from the <b>app security group</b>; every instance launched with that group is covered automatically.</p>`, code: R`# Read-only: what does the DB group allow on 5432?
aws ec2 describe-security-groups --group-ids sg-0db12345 \
  --query "SecurityGroups[].IpPermissions[?FromPort==\`5432\`]" --output json
# The durable fix: reference the app group instead of a CIDR (example IDs)
#   aws ec2 authorize-security-group-ingress --group-id sg-0db12345 \
#     --protocol tcp --port 5432 --source-group sg-0app6789` },
      { title: 'Custom NACL forgot the return traffic', html: `<p>A team added a custom NACL to the web subnet: inbound allow 443, outbound allow 443. Users time out. The <b>reply</b> from the web server goes to the <b>client's ephemeral port</b> (for example 51544), not to 443, and the stateless NACL drops it. Fix: outbound allow tcp 1024-65535 to <code>0.0.0.0/0</code> (and the matching inbound rule for replies to the server's own outbound calls).</p>${H.table(['NACL', 'Before', 'After'], [['inbound 100', 'allow tcp 443 from 0.0.0.0/0', 'allow tcp 443 from 0.0.0.0/0'], ['inbound 110', '-', 'allow tcp 1024-65535 from 0.0.0.0/0 (replies to our outbound calls)'], ['outbound 100', 'allow tcp 443 to 0.0.0.0/0', 'allow tcp 443 to 0.0.0.0/0'], ['outbound 110', '-', H.c('g', 'allow tcp 1024-65535 to 0.0.0.0/0 (replies to clients)')]])}` },
      { title: 'Load balancer targets turned unhealthy after a clean-up', html: `<p>A security review removed "unused" rules. Ten minutes later the ALB returns <b>503</b>: all targets unhealthy. The instances' security group no longer allows the app port (8080) from the <b>load balancer's</b> security group, so health checks time out. Re-add <code>tcp 8080 from sg-alb</code>, and document why each rule exists so the next review does not remove it again.</p>`, code: R`# From a host inside the VPC: is the target alive when tested directly?
curl -s -o /dev/null -m 3 -w '%{http_code}\n' http://10.0.2.15:8080/health    # 200 from inside its own subnet
# Read-only: target health as the load balancer sees it (example ARN shortened)
aws elbv2 describe-target-health --target-group-arn "$TG_ARN" \
  --query 'TargetHealthDescriptions[].[Target.Id,TargetHealth.State,TargetHealth.Reason]' --output table` },
      { title: 'ufw says "deny", yet the Docker port is open', html: `<p>On an Ubuntu VM, <code>ufw status</code> shows only 22 and 443 allowed, but a container published with <code>-p 6379:6379</code> (Redis!) is reachable from outside. Docker inserts its own iptables/nftables rules for published ports, and they are evaluated before ufw's rules. Bind published ports to localhost (<code>-p 127.0.0.1:6379:6379</code>) or a private IP, and keep the cloud security group tight as the outer layer.</p>`, code: R`sudo ufw status | head -n 8          # 22/tcp ALLOW, 443/tcp ALLOW ... (no 6379)
sudo ss -tlnp 'sport = :6379'        # LISTEN 0.0.0.0:6379 docker-proxy   <- exposed on all interfaces
docker run -d --name cache -p 127.0.0.1:6379:6379 redis:7   # publish on loopback only` }
    ],
    deepDive: `<p>🟣 <b>What "stateful" really means.</b> Security groups and most host firewalls keep a <b>connection-tracking</b> entry per flow. Once a flow is allowed, its packets in both directions match the entry and skip the rule list. A consequence: in AWS, removing a rule does not always cut <b>existing tracked</b> connections immediately; they continue until they go idle. Another: very high connection rates can hit tracking limits on the instance; AWS marks some flows "untracked" when rules allow all traffic both ways, which is why <code>0.0.0.0/0</code> on all ports behaves slightly differently from narrower rules.</p>
      <p><b>Evidence, not guesses.</b> <b>VPC Flow Logs</b> (and Azure NSG/VNet flow logs, GCP firewall logs) record accepted and rejected flows per interface: a <code>REJECT</code> for your source and port proves a security group or NACL drop. <b>Reachability Analyzer</b> (AWS) and <b>Network Watcher IP flow verify</b> (Azure) evaluate route tables, SGs and NACLs for a hypothetical packet and tell you which rule blocks it, without sending traffic. On the host, <code>nft list ruleset</code> with counters, or a temporary LOG rule, shows whether packets reach the OS at all, and <code>tcpdump</code> settles it (next topic).</p>
      <p><b>Designing rule sets.</b> Reference security groups instead of CIDRs inside a VPC (it follows auto-scaling); keep one group per role (alb, app, db, bastion); avoid huge "everything" groups; restrict egress for sensitive tiers (a database rarely needs internet access) and remember egress rules are stateful too. Security groups can reference groups in peered VPCs in the same region. Quotas exist (rules per group, groups per interface), so a 400-line allowlist belongs in a prefix list or a WAF, not in a security group.</p>
      <p><b>Defaults matter.</b> Ports often exposed by accident: 22, 3389, 3306, 5432, 6379, 9200 (Elasticsearch), 27017. Automated scanners find them within minutes of an instance getting a public IP. Cloud security tools (AWS Security Hub, Defender for Cloud, Security Command Center) flag <code>0.0.0.0/0</code> on admin ports as high-severity findings.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> AI assistants can read an exported security group or <code>nft list ruleset</code> and explain in plain words who can reach what, which is great for audits. They can draft Terraform for a clean alb → app → db rule chain, and summarise thousands of flow-log lines into "these sources were rejected on these ports".</p>
      <p><b>Where it goes wrong:</b> the path of least resistance in generated configs is <code>0.0.0.0/0</code> and "all traffic". Assistants also mix up security groups (stateful, allow-only) with NACLs (stateless, ordered), and forget ephemeral return ports. Treat every AI-proposed rule as a change request: what is the narrowest source (a security group, not a CIDR), the exact port, and why does it exist? Policy-as-code checks in CI (for example, failing any plan that opens 22 to the world) catch the rest.</p>`,
    problems: [P({
      t: 'Load balancer says all targets are unhealthy after a security review', l: 'Medium', tags: ['security groups', 'load balancer', 'health checks'], co: ['AWS Support', 'Deloitte', 'Wipro'],
      s: `<p>An internet-facing ALB (<code>sg-alb</code>) forwards to instances on port 8080 (<code>sg-app</code>). After a security review removed rules "not used in 30 days", the ALB returns <code>503 Service Unavailable</code> and the target group shows every target <code>unhealthy</code> with reason <code>Target.Timeout</code>. The app is running. Find the cause and give the minimal, durable fix.</p>`,
      ex: `<p><code>sg-app</code> inbound before: ${H.c('g', 'tcp 8080 from sg-alb')}, ${H.c('g', 'tcp 22 from 10.0.9.0/24')}. After the review: ${H.c('r', 'tcp 22 from 10.0.9.0/24')} only. Health checks from the ALB nodes to :8080 are dropped → timeout → unhealthy → 503.</p>`,
      bw: `<p>Allowing <code>0.0.0.0/0</code> on 8080 to "make it work". It fixes the health checks and exposes the app port directly to the internet, bypassing the load balancer, its TLS and any WAF rules.</p>`,
      q: ['The target health reason is Target.Timeout and the app runs fine. Which layer is the prime suspect?', ['A security group or NACL dropping LB → target traffic on 8080', 'An expired certificate on the targets', 'DNS for the load balancer', 'The app returning HTTP 500'], 0, 'A timeout means no reply. An app error would produce a status code (Target.ResponseCodeMismatch), and a certificate on the ALB has nothing to do with LB-to-target health checks over HTTP.'],
      h: ['<p>Hint 1: 503 from an ALB = no healthy targets. The reason code <code>Target.Timeout</code> says the health check got no answer at all.</p>', '<p>Hint 2: test from inside the VPC with <code>curl</code> directly to an instance on 8080 to prove the app is healthy; then look at <code>sg-app</code> inbound rules.</p>', '<p>Hint 3: the minimal fix references the ALB security group as the source, on exactly the health check / traffic port.</p>'],
      a: `<p><b>Why "unused" was wrong:</b> health checks run constantly, but rule-usage reports can miss them, or the review used the wrong data. <b>Prove it:</b> (1) <code>describe-target-health</code> shows <code>Target.Timeout</code>. (2) From another instance in the app subnet, <code>curl http://10.0.2.15:8080/health</code> returns 200, so the app is fine. (3) <code>sg-app</code> inbound has no rule for 8080. <b>Fix:</b> add <code>tcp 8080 from sg-alb</code> (source = the load balancer's security group, not a CIDR, because ALB node IPs change). If the health check uses a different port, allow that too. Within a couple of health-check intervals targets turn healthy and the 503s stop. <b>Prevent:</b> add descriptions to rules ("ALB health checks + traffic"), manage SGs in Terraform with code review, and add a synthetic check that alerts on unhealthy target count.</p>`,
      code: R`# 1. What does the load balancer see? (example ARN in a variable)
aws elbv2 describe-target-health --target-group-arn "$TG_ARN" \
  --query 'TargetHealthDescriptions[].[Target.Id,TargetHealth.State,TargetHealth.Reason]' --output table
# 2. Is the app itself fine? (run from an instance in the same subnet)
curl -s -o /dev/null -m 3 -w 'direct: %{http_code}\n' http://10.0.2.15:8080/health
# 3. What does sg-app allow now?
aws ec2 describe-security-groups --group-ids sg-0app6789 \
  --query 'SecurityGroups[].IpPermissions[].[FromPort,ToPort,UserIdGroupPairs[].GroupId,IpRanges[].CidrIp]' --output json
# 4. Minimal durable fix: 8080 only from the ALB's security group
aws ec2 authorize-security-group-ingress --group-id sg-0app6789 --protocol tcp --port 8080 \
  --source-group sg-0alb1111`,
      cx: `<p>Read-only checks take two minutes; the fix is one rule. Recovery time is about two health-check intervals plus the healthy threshold.</p>`,
      f: ['Why is referencing sg-alb better than allowing the public subnet CIDR?', 'Which flow log fields would have shown the problem immediately?']
    })]
  });

  // ───────────────────────── Topic 8: troubleshooting toolkit ─────────────────────────
  topics.push({
    title: 'The Troubleshooting Toolkit: dig, curl, ss, traceroute, mtr and tcpdump',
    analogy: `<p>A good doctor does not order a brain scan for a headache first. She checks pulse, temperature and blood pressure: <b>cheap tests that rule things out fast</b>. Only then come x-rays. Network troubleshooting works the same way. <code>dig</code> and <code>nc</code> take a second and rule out whole layers. <code>traceroute</code> and <code>mtr</code> are the x-ray of the path. <code>tcpdump</code> is the scan: it shows the truth, but you only reach for it when the cheaper tests disagree.</p>`,
    explain: `<p>🟢 <b>The ladder, with one tool per rung.</b> Run it top to bottom from the <b>client side</b>; the first failing rung is your answer.</p>
      ${H.table(['Rung', 'Question', 'Command', 'Good sign', 'Bad sign'], [
        ['1. Name', 'does the name resolve, to the right IP?', '<code>dig +short NAME</code> / <code>getent hosts NAME</code>', 'expected IP', 'empty, NXDOMAIN, SERVFAIL, old IP'],
        ['2. Route', 'is there a path?', '<code>ip route get IP</code>, <code>traceroute -n IP</code>, <code>mtr -rwc 20 IP</code>', 'hops reach the target', 'stops at a hop, "Network unreachable"'],
        ['3. Port', 'does anything answer on the port?', '<code>nc -vz -w 3 NAME PORT</code>', 'succeeded', 'refused (listener) / timed out (filter)'],
        ['4. TLS', 'is the certificate OK?', '<code>openssl s_client -connect NAME:443 -servername NAME</code>', 'Verify return code: 0 (ok)', 'expired, name mismatch, incomplete chain'],
        ['5. HTTP', 'what does the app say, and how fast?', '<code>curl -sv</code>, <code>curl -w</code> timings', '2xx/3xx, quick', '4xx/5xx, slow first byte'],
        ['6. Server side', 'what does the server see?', '<code>ss -tlnp</code>, <code>journalctl</code>, <code>tcpdump</code>', 'listener present, requests in logs', 'no listener, no packets arriving']
      ])}
      <p>🔵 <b>curl exit codes</b> are a ladder in themselves: <code>6</code> could not resolve host · <code>7</code> failed to connect (refused or unreachable) · <code>28</code> timeout · <code>35</code> TLS handshake failed · <code>60</code> certificate not trusted / mismatch · <code>52</code> empty reply from server · <code>56</code> connection reset while receiving. With <code>-w</code> curl also tells you <b>where the time went</b>: <code>time_namelookup</code> (DNS), <code>time_connect</code> (TCP), <code>time_appconnect</code> (TLS), <code>time_starttransfer</code> (first byte from the app), <code>time_total</code>.</p>
      <p>🔵 <b>Reading traceroute.</b> Each line is one router hop and three round-trip times. <code>* * *</code> means that hop did not answer the probe, which is <b>normal</b> in clouds and many ISPs (they rate-limit or drop the ICMP "time exceeded" replies); it is only a problem if <b>every</b> later hop is also <code>* * *</code> and the target never answers. Linux <code>traceroute</code> sends UDP probes by default; <code>-T -p 443</code> uses TCP SYN to port 443 (needs root), which passes firewalls that only allow web traffic. <code>mtr</code> combines ping and traceroute over many rounds: loss shown at a middle hop but <b>not</b> at later hops is just that router de-prioritising replies, not real loss.</p>
      <p>🔵 <b>tcpdump, the final judge.</b> <code>sudo tcpdump -ni any 'tcp port 5432'</code> on the server shows whether SYNs arrive at all. SYNs arriving with no SYN-ACK leaving: the host itself (no listener, or host firewall). No SYNs arriving: something upstream (security group, NACL, route, wrong IP). Capture only what you need (<code>-c 50</code>, a port filter), because packets can contain customer data.</p>`,
    clues: [
      '"where is it slow?" → <code>curl -w</code> timing breakdown: DNS vs TCP connect vs TLS vs time to first byte',
      '"traceroute shows * * * at hop 4" → usually ICMP filtering, not an outage, unless the destination never answers',
      '"mtr shows 60% loss at hop 6 but 0% at the end" → rate-limited replies at that router; no real loss',
      '"is the problem the client or the server?" → tcpdump on the server: do the SYNs arrive?',
      '"intermittent failures" → loop a check with timestamps (<code>curl -w</code> every second), compare per resolver, per IP, per AZ',
      '"small requests work, big ones hang" → MTU / PMTUD: <code>ping -M do -s 1472</code>'
    ],
    code: [R`#!/usr/bin/env bash
# netcheck.sh - walk the ladder for one host and port. Usage: ./netcheck.sh www.example.com 443
# Safe to run anywhere: read-only, short timeouts. Needs dig, nc, openssl, curl.
set -u
host=$1
port=$2

echo "1) NAME   $(dig +short "$host" | tr '\n' ' ')"
ip=$(getent ahostsv4 "$host" | awk 'NR==1 {print $1}')
if [ -z "$ip" ]; then echo "   FAIL: $host does not resolve (check the record and /etc/resolv.conf)"; exit 1; fi

echo "2) ROUTE  $(ip route get "$ip" 2>&1 | head -n 1)"

if nc -z -w 3 "$host" "$port" 2>/dev/null; then
  echo "3) PORT   $port open"
else
  echo "3) PORT   FAIL: $port closed (refused) or filtered (timeout): try 'nc -vz -w 3 $host $port'"; exit 3
fi

if [ "$port" = 443 ]; then
  verify=$(echo | timeout 5 openssl s_client -connect "$host:$port" -servername "$host" 2>/dev/null | grep 'Verify return code')
  echo "4) TLS    $verify"
fi

scheme=http; [ "$port" = 443 ] && scheme=https
curl -s -o /dev/null --max-time 10 \
  -w '5) HTTP   status=%{http_code} dns=%{time_namelookup}s connect=%{time_connect}s tls=%{time_appconnect}s first_byte=%{time_starttransfer}s total=%{time_total}s\n' \
  "$scheme://$host:$port/"
echo "   curl exit=$?"`],
    codeTitle: ['netcheck.sh: the whole ladder in one script'],
    viz: [{
      title: 'Walk the ladder: where does it break?',
      input: 'fail=tcp',
      inputLabel: 'fail=none|dns|route|tcp|tls|http (which rung is broken)',
      gen: function (input) {
        var m = String(input || '').trim().match(/^fail=(none|dns|route|tcp|tls|http)$/);
        if (!m) throw new Error('Use fail=none, dns, route, tcp, tls or http');
        var fail = m[1], host = 'shop.example.com';
        var rungs = [
          { k: 'dns', name: '1. Name', cmd: 'dig +short ' + host, ok: '203.0.113.10', bad: '(empty)   status: NXDOMAIN', means: 'DNS: the record is missing, wrong zone, or the resolver is broken. Compare <code>dig @1.1.1.1</code> with the authoritative server.' },
          { k: 'route', name: '2. Route', cmd: 'traceroute -n -T -p 443 203.0.113.10', ok: ' 1  10.0.1.1  0.4 ms\n 2  * * *\n 3  198.51.100.1  9.8 ms\n 4  203.0.113.10  11.2 ms', bad: ' 1  10.0.1.1  0.4 ms\n 2  * * *\n 3  * * *\n 4  * * *\n ...\n30  * * *', means: 'No path beyond the first hop: missing route (NAT / internet gateway), VPN or peering route down, or traffic dropped right at the edge. Check route tables and <code>ip route</code>.' },
          { k: 'tcp', name: '3. Port', cmd: 'nc -vz -w 3 ' + host + ' 443', ok: 'Connection to ' + host + ' 443 port [tcp/https] succeeded!', bad: 'nc: connect to ' + host + ' port 443 (tcp) timed out', means: 'Timed out: a security group, NACL or host firewall drops the SYN. (If it said <i>refused</i>, the host answered and nothing listens: check <code>ss -tlnp</code>.)' },
          { k: 'tls', name: '4. TLS', cmd: 'openssl s_client -connect ' + host + ':443 -servername ' + host, ok: 'Verify return code: 0 (ok)', bad: 'Verify return code: 10 (certificate has expired)', means: 'TLS: renew the certificate, fix the SAN list or install the full chain. The network is fine.' },
          { k: 'http', name: '5. HTTP', cmd: "curl -s -o /dev/null -w '%{http_code} %{time_total}s' https://" + host + '/', ok: '200 0.184s', bad: '503 0.012s', means: 'The application layer: a 503 from the load balancer means no healthy targets. Look at target health and app logs.' }
        ];
        var f = [];
        f.push({ narr: 'A user reports <b>' + host + '</b> is down. We test from the client side, one rung at a time, cheapest first. Each rung that passes <b>rules out</b> everything below it, so we never test the same thing twice.', parts: [
          { type: 'table', label: 'the ladder', columns: ['rung', 'tool'], rows: rungs.map(function (r) { return [r.name, r.cmd]; }) }
        ] });
        var done = [];
        for (var i = 0; i < rungs.length; i++) {
          var r = rungs[i], broken = r.k === fail;
          done.push([r.name, broken ? 'FAIL' : 'ok']);
          f.push({ narr: '<b>' + r.name + '</b>: <code>' + H.esc(r.cmd) + '</code>. ' + (broken ? '<span class="c-r">This rung fails.</span> ' + r.means : 'Passes' + (r.k === 'route' ? ' (the <code>* * *</code> at hop 2 is a router that does not answer probes; later hops answer, so it is harmless).' : '.')), parts: [
            { type: 'code', label: 'output', lang: 'text', code: '$ ' + r.cmd + '\n' + (broken ? r.bad : r.ok), hl: broken ? { 2: 'bad' } : { 2: 'ok' } },
            { type: 'table', label: 'results so far', columns: ['rung', 'result'], rows: done.slice(), hl: one(i, broken ? 'bad' : 'ok') }
          ] });
          if (broken) break;
        }
        if (fail === 'none') {
          f.push({ narr: 'Every rung passes from here. The problem may be specific to the user: their resolver (cached old IP), their network (corporate proxy, VPN), or intermittent. Ask for their <code>dig</code> and <code>curl -w</code> output and compare.', parts: [{ type: 'table', label: 'next questions', columns: ['question', 'how'], rows: [['same IP as us?', 'their dig output'], ['intermittent?', 'loop curl -w every second with timestamps'], ['only some backends?', 'curl each target directly from inside the VPC']] }] });
        } else {
          f.push({ narr: 'Stop here and fix this rung. Everything <b>above</b> it passed, so those layers are proven fine; everything below was not even reached. Confirm on the server side if needed: <code>tcpdump</code> shows whether packets arrive at all.', parts: [{ type: 'code', label: 'server-side confirmation', lang: 'bash', code: "sudo tcpdump -ni any -c 20 'tcp port 443'\n# SYNs arrive, no SYN-ACK  -> host: listener or host firewall\n# nothing arrives          -> upstream: SG, NACL, route, wrong IP", hl: { 1: 'cur' } }] });
        }
        if (f.length < 4) f.push({ narr: 'Try <code>fail=tcp</code>, <code>fail=tls</code> or <code>fail=none</code> to see later rungs. The earlier a rung fails, the less of the stack you need to look at.', parts: [{ type: 'text', html: 'Cheap tests first; each passing rung rules out a whole layer.' }] });
        return f;
      }
    }],
    examples: [
      { title: 'Where did the 3 seconds go? curl -w timing', html: `<p>An API "feels slow". Instead of guessing, ask curl for the timeline. Each value is cumulative from the start. Here DNS took 2.0 s of the 2.6 s total: a resolver problem (timeouts against an unreachable first nameserver in <code>/etc/resolv.conf</code> is a classic), not the app.</p>${H.table(['phase', 'cumulative', 'this phase'], [['DNS (namelookup)', '2.012 s', H.c('r', '2.012 s')], ['TCP (connect)', '2.031 s', '0.019 s'], ['TLS (appconnect)', '2.071 s', '0.040 s'], ['first byte (starttransfer)', '2.590 s', '0.519 s (app)'], ['total', '2.602 s', '']])}`, code: R`curl -s -o /dev/null https://api.example.com/v1/orders \
  -w 'dns=%{time_namelookup} connect=%{time_connect} tls=%{time_appconnect} ttfb=%{time_starttransfer} total=%{time_total}\n'
# dns=2.012 connect=2.031 tls=2.071 ttfb=2.590 total=2.602
cat /etc/resolv.conf     # first nameserver unreachable -> every lookup waits for a timeout` },
      { title: 'Reading traceroute and mtr without panicking', html: `<p>A customer sends this and says "your network drops packets at hop 3". Hop 3 shows 40% loss, but hops 4-6 and the destination show <b>0%</b>. Real loss would carry on to every later hop. Routers often rate-limit replies to probes aimed at themselves while forwarding traffic perfectly. The only line that matters is the last one.</p>`, code: R`mtr -rwc 50 203.0.113.10
# HOST                     Loss%  Snt  Last   Avg  Best  Wrst
#  1. 192.168.1.1           0.0%   50   0.9   1.0   0.7   2.1
#  2. 198.51.100.1          0.0%   50   8.1   8.4   7.9  12.0
#  3. 198.51.100.77        40.0%   50  15.2  15.9  14.8  30.1   <- rate-limited replies, not loss
#  4. 203.0.113.1           0.0%   50  16.0  16.2  15.7  18.3
#  5. 203.0.113.10          0.0%   50  16.4  16.5  16.0  19.0   <- destination: no loss
traceroute -n -T -p 443 203.0.113.10    # TCP probes to 443 get through web-only firewalls` },
      { title: 'tcpdump settles "is it the client or the server?"', html: `<p>The app team says "the network is broken"; the network team says "the app is down". On the DB server, capture port 5432 while the client retries. Case A: SYNs arrive and the server answers with <b>RST</b> - the host is reached and refuses: nothing listening on that address. Case B: <b>nothing</b> arrives - the drop is upstream (security group, NACL, route). Ten seconds of capture ends the argument.</p>`, code: R`sudo tcpdump -ni any -c 10 'tcp port 5432'
# Case A (host refuses):
#   IP 10.0.1.25.50123 > 10.0.3.20.5432: Flags [S], seq 1...
#   IP 10.0.3.20.5432 > 10.0.1.25.50123: Flags [R.], seq 0, ack ...      <- RST: no listener
# Case B (upstream drop): no lines at all while the client times out` },
      { title: 'Small requests work, big ones hang: MTU', html: `<p>Over a new site-to-site VPN, SSH logins work but <code>scp</code> stalls and HTTPS pages load only headers. That is the signature of an <b>MTU</b> problem: large packets do not fit the tunnel, and ICMP "fragmentation needed" messages are blocked, so the sender never learns to shrink them. Probe with do-not-fragment pings to find the largest size that passes, then lower the MTU or enable MSS clamping on the VPN device.</p>`, code: R`ping -c 2 -M do -s 1472 198.51.100.20    # 1472 + 28 header bytes = 1500: fails over the tunnel
ping -c 2 -M do -s 1372 198.51.100.20    # works -> path MTU is about 1400
tracepath -n 198.51.100.20               # reports "pmtu 1400" along the path
ip link show eth0 | grep -o 'mtu [0-9]*'  # mtu 9001 inside the VPC, too big for the tunnel` }
    ],
    deepDive: `<p>🟣 <b>How traceroute works.</b> It sends probes with TTL 1, 2, 3 ... Each router that decrements the TTL to zero drops the probe and sends back ICMP "time exceeded", revealing itself. The destination answers differently (ICMP port unreachable for UDP probes, SYN-ACK or RST for TCP probes), which ends the trace. Load-balanced paths (ECMP) can make hops look jumbled; <code>mtr</code> and <code>tracepath</code> show the same ideas over time. Inside a cloud VPC, the virtual network often hides internal hops entirely.</p>
      <p><b>tcpdump in practice.</b> Useful filters: <code>host 10.0.1.25</code>, <code>port 53</code>, <code>'tcp[tcpflags] &amp; (tcp-syn|tcp-rst) != 0'</code> (only handshakes and resets). Write to a file with <code>-w cap.pcap</code> and open it in Wireshark later. Always use <code>-n</code> (no reverse DNS, which can itself hang), limit with <code>-c</code>, and treat captures as sensitive data: they can contain cookies, tokens and personal data, so do not attach them to public tickets. In containers and Kubernetes, capture inside the pod's network namespace (<code>nsenter</code> or an ephemeral debug container).</p>
      <p><b>Cloud-native helpers.</b> When you cannot run tools on both ends: VPC Flow Logs (ACCEPT/REJECT per flow), Reachability Analyzer (AWS) and Network Watcher connection troubleshoot / IP flow verify (Azure) evaluate routes and filters for you, and load balancer access logs show status codes, target and timing for every request. Combine them with the client-side ladder.</p>
      <p><b>Intermittent problems</b> need data over time, not one test: loop <code>curl -w</code> with timestamps into a file, test each backend IP separately (<code>--resolve</code>), each resolver, each availability zone. Patterns like "fails every 350 seconds of idle" (NAT timeout), "fails for one of four IPs" (one bad target) or "fails only on IPv6" jump out of a simple CSV.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> assistants are excellent log readers: paste <code>mtr</code>, <code>tcpdump -n</code> excerpts or <code>curl -v</code> output and ask "which layer failed and what is the next single test?". They can also write the intermittent-failure loop, a flow-log query, or a Wireshark filter in seconds. AI-assisted network tools in cloud consoles increasingly explain Reachability Analyzer findings in plain language.</p>
      <p><b>Where it goes wrong:</b> assistants over-read <code>* * *</code> and mid-path mtr loss as outages, and they may propose captures that grab everything (<code>tcpdump -i any -w all.pcap</code>) on a production host. Redact captures and logs before sharing (IPs, host names, cookies, tokens). The method stays yours: <b>one hypothesis, one cheap test, then the next rung</b>.</p>`,
    problems: [P({
      t: 'The API is "slow": find the slow layer', l: 'Medium', tags: ['curl', 'latency', 'dns', 'troubleshooting'], co: ['AWS Support', 'Datadog', 'Cognizant'],
      s: `<p>Users say <code>https://api.example.com/v1/orders</code> sometimes takes 5 seconds instead of 200 ms. The app team says their server metrics look normal. Using only client-side tools at first, find which layer the time goes to, and say what you would check next for each possible answer.</p>`,
      ex: `<p>Ten runs of <code>curl -w</code>: most show ${H.c('g', 'dns=0.002 connect=0.015 tls=0.040 ttfb=0.190')}; three show ${H.c('r', 'dns=5.004')} with everything after it normal. The slow layer is <b>DNS</b>, not the app.</p>`,
      bw: `<p>Running one <code>time curl</code> and reporting "it took 5 s". That number mixes DNS, TCP, TLS and the app together, and a single run cannot catch an intermittent problem.</p>`,
      bc: `time curl -s -o /dev/null https://api.example.com/v1/orders   # one total number, no breakdown`,
      q: ['A run shows dns=0.003 connect=0.020 tls=0.060 ttfb=4.800. Where is the time spent?', ['In the application (or what it calls) before the first byte', 'In DNS', 'In the TCP handshake', 'In the TLS handshake'], 0, 'curl timings are cumulative. 4.8 − 0.06 ≈ 4.7 s passed between the end of TLS and the first byte: the server was thinking (slow query, slow dependency).'],
      h: ['<p>Hint 1: <code>curl -w</code> gives cumulative times: namelookup, connect, appconnect (TLS), starttransfer (first byte), total. Subtract neighbours to get each phase.</p>', '<p>Hint 2: intermittent means you need many samples with timestamps. Loop it 30 times and look for the column that jumps.</p>', '<p>Hint 3: a 5.0 s DNS time is the default resolver timeout: the first nameserver in <code>/etc/resolv.conf</code> did not answer and the client fell back to the second.</p>'],
      a: `<p><b>Measure:</b> loop curl with <code>-w</code> and timestamps, 30 samples. <b>Read the column that jumps.</b> If <b>DNS</b> jumps to ~5 s: a resolver timeout. Check <code>/etc/resolv.conf</code> / <code>resolvectl status</code> for an unreachable first nameserver, compare <code>dig @each-resolver</code>, and check UDP 53 is allowed (and TCP 53). If <b>connect</b> jumps: network path or SYN drops and retransmits (1 s, 3 s steps), check packet loss with <code>mtr</code>, NAT or conntrack limits. If <b>TLS</b> jumps: overloaded TLS termination or slow certificate status checks. If <b>first byte</b> jumps: the application or its dependencies (database, another API); give the app team the exact timestamps so they can match traces and slow-query logs. Also test each backend directly with <code>--resolve</code> to see whether one target is the slow one. In this ticket DNS was the culprit: the VM's resolv.conf listed a decommissioned on-prem DNS server first.</p>`,
      code: R`# 30 samples, one per second, with a timestamp per line (CSV-like)
for i in $(seq 1 30); do
  printf '%s ' "$(date +%T)"
  curl -s -o /dev/null https://api.example.com/v1/orders \
    -w 'dns=%{time_namelookup} connect=%{time_connect} tls=%{time_appconnect} ttfb=%{time_starttransfer} total=%{time_total} code=%{http_code}\n'
  sleep 1
done | tee timings.txt
# Show only slow runs (total over 1 second)
awk '{split($6, t, "="); if (t[2] > 1) print}' timings.txt
# If DNS is the slow column: which resolvers are configured, and does each one answer quickly?
resolvectl status 2>/dev/null | grep -E 'DNS Servers|Current DNS' || grep nameserver /etc/resolv.conf
for r in $(awk '/^nameserver/ {print $2}' /etc/resolv.conf); do echo "== $r"; dig +tries=1 +time=2 @"$r" api.example.com | grep -E 'Query time|timed out'; done`,
      cx: `<p>30 seconds of sampling. The breakdown points at exactly one team (DNS, network, TLS, or application), which is usually the hardest part of a latency ticket.</p>`,
      f: ['How would you tell whether one of several backend instances is the slow one?', 'Why do TCP retransmissions show up as roughly 1 s or 3 s jumps in connect time?']
    })]
  });

  // ───────────────────────── Practice: Easy ─────────────────────────
  var PYC = '<p>IPv4 only. Python 3 standard library only (the <code>ipaddress</code> module is allowed). Inputs are valid strings in the format shown.</p>';

  practice.push(P({
    t: 'How many usable hosts in a /N?', l: 'Easy', tags: ['cidr', 'subnet maths', 'python'], co: ['AWS', 'Cisco', 'TCS'], lang: 'python', c: PYC,
    s: `<p>Write <code>usable_hosts(prefix)</code> that returns the number of usable host addresses in a classic IPv4 subnet of length <code>/prefix</code> (0-32): all addresses minus the network and broadcast addresses. Two special cases follow RFC 3021 and common practice: a <b>/31</b> (point-to-point link) has <b>2</b> usable addresses and a <b>/32</b> (a single host) has <b>1</b>.</p>`,
    ex: `<p><code>usable_hosts(26)</code> → ${H.c('g', '62')}: 32 − 26 = 6 host bits, 2<sup>6</sup> = 64 addresses, minus network and broadcast = 62. <code>usable_hosts(31)</code> → ${H.c('y', '2')} (special case).</p>`,
    bw: `<p>Building the network with <code>ip_network("0.0.0.0/N")</code> and counting <code>len(list(net.hosts()))</code>. For a /8 that materialises 16 million address objects just to compute a power of two.</p>`,
    bc: `import ipaddress

def usable_hosts(prefix):
    net = ipaddress.ip_network(f"0.0.0.0/{prefix}")
    return len(list(net.hosts()))      # builds every address: very slow for small prefixes`,
    q: ['How many addresses does a /27 contain in total?', ['32', '27', '30', '64'], 0, '32 − 27 = 5 host bits, and 2<sup>5</sup> = 32 addresses. 30 is the classic usable count; in AWS 27 are usable.'],
    h: ['<p>Hint 1: the number of host bits is <code>32 − prefix</code>; the block has 2 to that power addresses.</p>', '<p>Hint 2: subtract 2 for network and broadcast in the normal case.</p>', '<p>Hint 3: handle /31 and /32 before the general formula, otherwise you get 0 and −1.</p>'],
    a: `<p>Host bits = 32 − prefix, addresses = 2<sup>host bits</sup>. For prefixes up to /30 subtract the network (all host bits 0) and broadcast (all host bits 1) addresses. A /31 has no room for that pair, so both addresses are usable on point-to-point links; a /32 is one host. Remember the cloud twist: AWS and Azure reserve 5 addresses per subnet, so a /26 gives 59 usable there.</p>`,
    code: `def usable_hosts(prefix):
    """Classic usable host count for an IPv4 /prefix."""
    if prefix == 32:
        return 1                      # a single host route
    if prefix == 31:
        return 2                      # RFC 3021 point-to-point link: no network/broadcast pair
    return 2 ** (32 - prefix) - 2     # all addresses minus network and broadcast`,
    cx: `<p>O(1): one power of two.</p>`,
    f: ['How would the function change for AWS subnets (5 reserved, /16 to /28 only)?', 'Why do some engineers avoid /31 links in cloud networks?'],
    tests: { sig: 'int -> long', fn: 'usableHosts', cases: [[[24], 254], [[26], 62], [[30], 2], [[31], 2], [[32], 1], [[16], 65534], [[8], 16777214], [[0], 4294967294], [[28], 14]] }
  }));

  practice.push(P({
    t: 'Is this IP inside this CIDR?', l: 'Easy', tags: ['cidr', 'security groups', 'python'], co: ['AWS Support', 'Microsoft', 'Infosys'], lang: 'python', c: PYC,
    s: `<p>A security group rule allows a CIDR, and a user asks whether their server's IP is covered. Write <code>ip_in_cidr(ip, cidr)</code> that returns <code>True</code> if the IPv4 address is inside the block and <code>False</code> otherwise. The CIDR may have host bits set (treat <code>198.51.100.7/24</code> as <code>198.51.100.0/24</code>).</p>`,
    ex: `<p><code>ip_in_cidr("10.0.12.5", "10.0.8.0/21")</code> → ${H.c('g', 'True')}: a /21 has block size 8 in the third octet, so it covers 10.0.8.0 - 10.0.15.255. <code>ip_in_cidr("10.0.16.4", "10.0.8.0/21")</code> → ${H.c('r', 'False')}.</p>`,
    bw: `<p>Comparing strings, for example <code>ip.startswith("10.0.")</code>. That says <code>10.0.200.1</code> is inside <code>10.0.8.0/21</code> and fails for any prefix that is not a multiple of 8.</p>`,
    bc: `def ip_in_cidr(ip, cidr):
    base = cidr.split("/")[0]
    return ip.startswith(base.rsplit(".", 2)[0])   # string tricks: wrong for /21, /27 ...`,
    q: ['Is 172.32.0.1 inside 172.16.0.0/12?', ['No: /12 covers 172.16.0.0 to 172.31.255.255', 'Yes: it starts with 172', 'Yes: all 172.x addresses are private', 'It depends on the mask of the host'], 0, 'A /12 fixes 12 bits: 8 from the first octet and 4 from the second, so the second octet runs 16-31. 172.32.x.x is a public address.'],
    h: ['<p>Hint 1: an address is inside a block when its first <i>n</i> bits equal the block\'s first <i>n</i> bits.</p>', '<p>Hint 2: <code>ipaddress.ip_address(ip) in ipaddress.ip_network(cidr, strict=False)</code> does exactly that.</p>', '<p>Hint 3: manual version: convert both to integers, build the mask <code>(0xFFFFFFFF &lt;&lt; (32 − n)) &amp; 0xFFFFFFFF</code>, and compare <code>ip &amp; mask</code> with <code>net &amp; mask</code>. Watch /0 (mask 0).</p>'],
    a: `<p>Parse the block with <code>strict=False</code> so host bits are ignored, parse the address, and test membership. Under the hood it masks the address with the prefix and compares with the network address. Edge cases: <code>0.0.0.0/0</code> contains everything; a <code>/32</code> contains only itself; the network and broadcast addresses are inside the block (being inside is not the same as being a usable host).</p>`,
    code: `import ipaddress

def ip_in_cidr(ip, cidr):
    """True if the IPv4 address lies inside the CIDR block."""
    return ipaddress.ip_address(ip) in ipaddress.ip_network(cidr, strict=False)`,
    cx: `<p>O(1): a mask and one integer comparison per call.</p>`,
    f: ['How would you check one IP against a security group with 50 CIDR rules?', 'What does Python return for an IPv6 address checked against an IPv4 network?'],
    tests: { sig: 'string string -> bool', fn: 'ipInCidr', cases: [
      [['10.0.12.5', '10.0.8.0/21'], true], [['10.0.16.4', '10.0.8.0/21'], false], [['192.0.2.64', '192.0.2.64/26'], true], [['192.0.2.128', '192.0.2.64/26'], false],
      [['203.0.113.9', '0.0.0.0/0'], true], [['198.51.100.7', '198.51.100.7/32'], true], [['198.51.100.8', '198.51.100.7/32'], false], [['172.31.255.255', '172.16.0.0/12'], true], [['172.32.0.1', '172.16.0.0/12'], false]
    ] }
  }));

  practice.push(P({
    t: 'Network, broadcast, mask and host range', l: 'Easy', tags: ['cidr', 'subnet maths', 'python'], co: ['Cisco', 'AWS', 'Wipro'], lang: 'python', c: PYC,
    s: `<p>Write <code>subnet_info(cidr)</code> returning a list of five strings: <code>[network, broadcast, netmask, first_host, last_host]</code>. The input may have host bits set (<code>192.0.2.77/27</code>). For /0-/30 the host range excludes network and broadcast; for <b>/31</b> and <b>/32</b> the first and last hosts are simply the first and last addresses of the block.</p>`,
    ex: `<p><code>subnet_info("192.0.2.77/27")</code> → ${H.c('g', '["192.0.2.64", "192.0.2.95", "255.255.255.224", "192.0.2.65", "192.0.2.94"]')}. Block size 256 − 224 = 32; 77 lies in 64-95.</p>`,
    bw: `<p>Splitting on dots and only handling /8, /16 and /24 ("replace the last octet with 0 and 255"). It breaks for every other prefix, which is most real cloud subnets.</p>`,
    q: ['What is the network address of 10.0.13.7/22?', ['10.0.12.0', '10.0.13.0', '10.0.8.0', '10.0.0.0'], 0, '/22 has mask 255.255.252.0: block size 4 in the third octet. Blocks start at 0, 4, 8, 12, 16; 13 is in the 12 block.'],
    h: ['<p>Hint 1: <code>ip_network(cidr, strict=False)</code> gives <code>network_address</code>, <code>broadcast_address</code> and <code>netmask</code> directly.</p>', '<p>Hint 2: address objects support <code>+ 1</code> and <code>- 1</code>, which gives the first and last host.</p>', '<p>Hint 3: only apply the +1/−1 when the prefix is 30 or less; /31 and /32 have no separate network/broadcast addresses to skip.</p>'],
    a: `<p>Normalise the block with <code>strict=False</code>. Network = address AND mask; broadcast = network OR inverted mask; the netmask is the prefix as dotted decimal. For normal subnets the first host is network + 1 and the last is broadcast − 1. For /31 and /32 return the block's own first and last addresses. In AWS you would also skip network + 1 to + 3 (router, DNS, reserved).</p>`,
    code: `import ipaddress

def subnet_info(cidr):
    """[network, broadcast, netmask, first_host, last_host] for an IPv4 CIDR."""
    net = ipaddress.ip_network(cidr, strict=False)
    first, last = net.network_address, net.broadcast_address
    if net.prefixlen <= 30:            # normal subnet: skip network and broadcast
        first, last = first + 1, last - 1
    return [str(net.network_address), str(net.broadcast_address), str(net.netmask), str(first), str(last)]`,
    cx: `<p>O(1): a mask and one integer comparison per call.</p>`,
    f: ['Return the AWS first usable address too. What is it for 10.0.12.0/22?', 'How would you print the same information for an IPv6 /64?'],
    tests: { sig: 'string -> string[]', fn: 'subnetInfo', cases: [
      [['192.0.2.77/27'], ['192.0.2.64', '192.0.2.95', '255.255.255.224', '192.0.2.65', '192.0.2.94']],
      [['10.0.13.7/22'], ['10.0.12.0', '10.0.15.255', '255.255.252.0', '10.0.12.1', '10.0.15.254']],
      [['198.51.100.0/24'], ['198.51.100.0', '198.51.100.255', '255.255.255.0', '198.51.100.1', '198.51.100.254']],
      [['203.0.113.9/30'], ['203.0.113.8', '203.0.113.11', '255.255.255.252', '203.0.113.9', '203.0.113.10']],
      [['203.0.113.9/31'], ['203.0.113.8', '203.0.113.9', '255.255.255.254', '203.0.113.8', '203.0.113.9']],
      [['203.0.113.9/32'], ['203.0.113.9', '203.0.113.9', '255.255.255.255', '203.0.113.9', '203.0.113.9']],
      [['10.0.0.0/16'], ['10.0.0.0', '10.0.255.255', '255.255.0.0', '10.0.0.1', '10.0.255.254']]
    ] }
  }));

  practice.push(P({
    t: 'New app works on the server, not from the office', l: 'Easy', tags: ['ports', 'ss', 'bind address'], co: ['AWS Support', 'Accenture'],
    s: `<p>A developer started a Python API on a VM with <code>gunicorn app:app</code>. On the VM, <code>curl http://localhost:8000/health</code> returns 200. From the office, <code>curl http://203.0.113.40:8000/health</code> fails <b>instantly</b> with <code>Connection refused</code>. The security group allows tcp/8000 from the office range. Find the cause and fix it safely.</p>`,
    ex: `<p><code>sudo ss -tlnp 'sport = :8000'</code> → ${H.c('r', 'LISTEN 0 2048 127.0.0.1:8000 ... gunicorn')}. Gunicorn binds to 127.0.0.1 by default. After <code>--bind 0.0.0.0:8000</code> → ${H.c('g', 'LISTEN 0.0.0.0:8000')} and the office gets 200.</p>`,
    bw: `<p>Opening the security group to 0.0.0.0/0 or disabling the host firewall. The instant refusal already proves the packet reached the VM; the filters are not the problem, and widening them only adds risk.</p>`,
    q: ['Why is the failure instant rather than a timeout?', ['The VM\'s kernel answered with a TCP reset because no socket listens on that address', 'The security group rejected it', 'DNS failed', 'The office proxy blocked it'], 0, 'Security groups drop silently (timeout). A fast "refused" comes from the destination host: no listener on that IP and port.'],
    h: ['<p>Hint 1: "works on localhost, refused from outside" is almost always the bind address.</p>', '<p>Hint 2: <code>ss -tlnp</code> shows the local address column: <code>127.0.0.1</code> means loopback only.</p>', '<p>Hint 3: fix the bind (0.0.0.0 or the private IP), or better, put a reverse proxy like nginx in front on 443 and keep the app on loopback.</p>'],
    a: `<p>A refusal in milliseconds means the SYN crossed the internet and the security group and reached the VM, which replied with RST. On the VM, <code>ss -tlnp</code> shows the app listening on <code>127.0.0.1:8000</code> only (gunicorn's default bind), so connections to the VM's private address, which is what the public IP is translated to, find no socket. Fix: run with <code>--bind 0.0.0.0:8000</code> (or the private IP) in the systemd unit, restart, and confirm with ss. Better production pattern: keep gunicorn on 127.0.0.1, put nginx on 443 with TLS in front, and allow only 443 in the security group.</p>`,
    code: R`sudo ss -tlnp 'sport = :8000'                 # 127.0.0.1:8000 -> loopback only
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:8000/health    # 200 locally
# Fix the bind address (in the systemd unit ExecStart line), then restart
#   ExecStart=/srv/api/venv/bin/gunicorn --bind 0.0.0.0:8000 app:app
sudo systemctl daemon-reload && sudo systemctl restart api
sudo ss -tlnp 'sport = :8000'                 # 0.0.0.0:8000 -> all interfaces
# From the office:
curl -s -o /dev/null -w '%{http_code}\n' http://203.0.113.40:8000/health`,
    cx: `<p>One look at ss and one config change. The refused-vs-timeout clue removes the security group from suspicion immediately.</p>`,
    f: ['Why does the public IP not appear in the ss output at all?', 'What would you see if the security group were the problem instead?']
  }));

  // ───────────────────────── Practice: Medium ─────────────────────────
  practice.push(P({
    t: 'Split a block into N equal subnets', l: 'Medium', tags: ['cidr', 'subnetting', 'vpc design', 'python'], co: ['AWS', 'Google', 'Oracle'], lang: 'python', c: PYC,
    s: `<p>Write <code>split_cidr(cidr, n)</code> that splits an IPv4 block into <code>n</code> equal subnets and returns them in order. Equal splits only work for powers of two, so if <code>n</code> is not a power of two (1, 2, 4, 8 ...) return an empty list. Also return an empty list if the split would need a prefix longer than /32. Host bits in the input are ignored.</p>`,
    ex: `<p><code>split_cidr("10.0.0.0/16", 4)</code> → ${H.c('g', '["10.0.0.0/18", "10.0.64.0/18", "10.0.128.0/18", "10.0.192.0/18"]')}: 4 = 2<sup>2</sup>, so add 2 bits (/16 → /18); each piece holds 16,384 addresses. <code>split_cidr("10.0.0.0/16", 3)</code> → ${H.c('r', '[]')}.</p>`,
    bw: `<p>Dividing the address count by n and stepping by that amount (65,536 / 3 = 21,845.33...). The pieces are not aligned to power-of-two boundaries, so they are not valid CIDR blocks at all.</p>`,
    q: ['How many extra prefix bits do you need to split one block into 8 equal subnets?', ['3', '8', '4', '2'], 0, '2<sup>3</sup> = 8. Each extra bit doubles the number of subnets: 1 bit → 2, 2 bits → 4, 3 bits → 8.'],
    h: ['<p>Hint 1: n is a power of two exactly when <code>n &gt; 0 and n &amp; (n − 1) == 0</code>.</p>', '<p>Hint 2: the number of extra bits is <code>n.bit_length() − 1</code> (log<sub>2</sub> n for powers of two).</p>', '<p>Hint 3: <code>net.subnets(prefixlen_diff=bits)</code> yields the pieces; check <code>prefixlen + bits ≤ 32</code> first.</p>'],
    a: `<p>Validate n (power of two), compute bits = log<sub>2</sub> n, check the new prefix fits in 32 bits, then let <code>subnets(prefixlen_diff=bits)</code> produce the aligned blocks. In real VPC design you rarely split evenly into exactly the number you need: split into the next power of two and keep the extra blocks as reserve for new zones or tiers.</p>`,
    code: `import ipaddress

def split_cidr(cidr, n):
    """Split cidr into n equal, aligned subnets (n must be a power of two)."""
    net = ipaddress.ip_network(cidr, strict=False)
    if n < 1 or n & (n - 1):            # 3, 5, 6 ... cannot be split evenly
        return []
    bits = n.bit_length() - 1           # 1 -> 0, 2 -> 1, 4 -> 2, 8 -> 3
    if net.prefixlen + bits > 32:
        return []
    return [str(s) for s in net.subnets(prefixlen_diff=bits)]`,
    cx: `<p>O(n) for the output list.</p>`,
    f: ['A team needs 3 subnets. Which split do you choose and what do you do with the 4th block?', 'How does Terraform\'s <code>cidrsubnets()</code> express the same idea?'],
    tests: { sig: 'string int -> string[]', fn: 'splitCidr', cases: [
      [['10.0.0.0/16', 4], ['10.0.0.0/18', '10.0.64.0/18', '10.0.128.0/18', '10.0.192.0/18']],
      [['192.0.2.0/24', 2], ['192.0.2.0/25', '192.0.2.128/25']],
      [['192.0.2.0/24', 8], ['192.0.2.0/27', '192.0.2.32/27', '192.0.2.64/27', '192.0.2.96/27', '192.0.2.128/27', '192.0.2.160/27', '192.0.2.192/27', '192.0.2.224/27']],
      [['10.0.0.0/16', 1], ['10.0.0.0/16']],
      [['10.0.0.0/16', 3], []],
      [['203.0.113.0/30', 8], []],
      [['203.0.113.0/30', 4], ['203.0.113.0/32', '203.0.113.1/32', '203.0.113.2/32', '203.0.113.3/32']],
      [['172.16.0.0/12', 16], ['172.16.0.0/16', '172.17.0.0/16', '172.18.0.0/16', '172.19.0.0/16', '172.20.0.0/16', '172.21.0.0/16', '172.22.0.0/16', '172.23.0.0/16', '172.24.0.0/16', '172.25.0.0/16', '172.26.0.0/16', '172.27.0.0/16', '172.28.0.0/16', '172.29.0.0/16', '172.30.0.0/16', '172.31.0.0/16']]
    ] }
  }));

  practice.push(P({
    t: 'Will these two networks conflict when peered?', l: 'Medium', tags: ['cidr', 'peering', 'vpn', 'python'], co: ['AWS', 'Microsoft', 'Cisco'], lang: 'python', c: PYC,
    s: `<p>Before peering two VPCs, or connecting a VPC to an office over VPN, you must be sure their address ranges do not overlap. Write <code>cidrs_overlap(a, b)</code> that returns <code>True</code> if the two IPv4 CIDR blocks share at least one address.</p>`,
    ex: `<p><code>cidrs_overlap("10.0.0.0/16", "10.0.128.0/20")</code> → ${H.c('r', 'True')}: the /20 lies entirely inside the /16, so peering is rejected. <code>cidrs_overlap("192.0.2.0/25", "192.0.2.128/25")</code> → ${H.c('g', 'False')}: two halves of a /24 touch but do not overlap.</p>`,
    bw: `<p>Comparing the first two octets ("both start with 10.0, so they conflict"). It flags <code>10.0.4.0/23</code> and <code>10.0.6.0/23</code> as conflicting (they do not) and misses <code>10.0.0.0/8</code> vs <code>10.200.0.0/16</code> (they do).</p>`,
    q: ['Do 10.0.4.0/22 and 10.0.6.0/23 overlap?', ['Yes: 10.0.4.0/22 covers 10.0.4.0-10.0.7.255, which includes 10.0.6.0/23', 'No: they have different prefixes', 'No: 4 and 6 are different', 'Only if they are in the same region'], 0, 'Aligned blocks are either nested or disjoint. The /22 (third octet 4-7) contains the /23 (third octet 6-7).'],
    h: ['<p>Hint 1: two ranges [s1, e1] and [s2, e2] overlap when <code>s1 ≤ e2</code> and <code>s2 ≤ e1</code>.</p>', '<p>Hint 2: CIDR blocks are aligned, so they overlap exactly when one contains the other\'s network address.</p>', '<p>Hint 3: <code>ip_network(a, strict=False).overlaps(ip_network(b, strict=False))</code> does it in one line.</p>'],
    a: `<p>Turn both blocks into integer ranges (network address to broadcast address) and apply the interval-overlap test, or use <code>overlaps()</code>. Because CIDR blocks are aligned powers of two, partial overlap is impossible: either one block contains the other or they are disjoint. In practice, run this check against <b>every</b> network you might ever connect (other VPCs, offices, partners, VPN client pools) before you create a VPC, because re-addressing later is painful.</p>`,
    code: `import ipaddress

def cidrs_overlap(a, b):
    """True if two IPv4 CIDR blocks share any address."""
    na = ipaddress.ip_network(a, strict=False)
    nb = ipaddress.ip_network(b, strict=False)
    # Same as: na.network_address <= nb.broadcast_address and nb.network_address <= na.broadcast_address
    return na.overlaps(nb)`,
    cx: `<p>O(1): a mask and one integer comparison per call.</p>`,
    f: ['If two VPCs already overlap and must talk, what are your options?', 'Why is 10.0.0.0/16 such a risky choice for a new VPC in a large company?'],
    tests: { sig: 'string string -> bool', fn: 'cidrsOverlap', cases: [
      [['10.0.0.0/16', '10.0.128.0/20'], true], [['10.0.0.0/16', '10.1.0.0/16'], false], [['192.0.2.0/25', '192.0.2.128/25'], false], [['192.0.2.0/24', '192.0.2.77/32'], true],
      [['0.0.0.0/0', '203.0.113.0/24'], true], [['10.0.0.0/8', '172.16.0.0/12'], false], [['10.0.4.0/22', '10.0.6.0/23'], true], [['10.0.4.0/23', '10.0.6.0/23'], false]
    ] }
  }));

  practice.push(P({
    t: 'Smallest AWS subnet for N instances', l: 'Medium', tags: ['cidr', 'aws', 'capacity', 'python'], co: ['AWS', 'Accenture', 'Deloitte'], lang: 'python', c: PYC,
    s: `<p>AWS reserves <b>5</b> addresses in every subnet (network, VPC router, DNS, one for future use, and the last address), and subnet sizes must be between <b>/16</b> and <b>/28</b>. Write <code>aws_subnet_prefix(hosts)</code> that returns the <b>longest</b> prefix (smallest subnet) that still gives at least <code>hosts</code> usable addresses, or <code>-1</code> if even a /16 is too small. <code>hosts ≥ 1</code>.</p>`,
    ex: `<p><code>aws_subnet_prefix(50)</code> → ${H.c('g', '26')}: a /27 gives 32 − 5 = 27 (too few); a /26 gives 64 − 5 = 59 ≥ 50. <code>aws_subnet_prefix(60)</code> → ${H.c('y', '25')} (123 usable).</p>`,
    bw: `<p>Using the classic "minus 2" rule: for 60 hosts it picks /26 (62 usable), but in AWS a /26 has only 59, so the 60th instance fails to launch with an "insufficient free addresses" error.</p>`,
    bc: `def aws_subnet_prefix(hosts):
    for p in range(28, 15, -1):
        if 2 ** (32 - p) - 2 >= hosts:   # classic rule: wrong for AWS
            return p
    return -1`,
    q: ['How many usable addresses does an AWS /28 subnet have?', ['11', '14', '16', '13'], 0, '16 addresses minus 5 reserved = 11. That is why a /28 is rarely a good choice for anything that scales.'],
    h: ['<p>Hint 1: usable(p) = 2<sup>32−p</sup> − 5. It doubles (roughly) every time p goes down by one.</p>', '<p>Hint 2: try p from 28 down to 16 and return the first one with enough room.</p>', '<p>Hint 3: if nothing between /28 and /16 works, return −1; in real life you would also leave headroom (pods, load balancer nodes, future growth).</p>'],
    a: `<p>Start at the smallest allowed subnet (/28) and grow one bit at a time until 2<sup>32−p</sup> − 5 ≥ hosts. Thirteen candidates at most. The answer is a <b>minimum</b>; real designs add headroom because auto-scaling, rolling deploys (old and new instances at the same time), Lambda ENIs, load balancer nodes and Kubernetes pods all consume addresses.</p>`,
    code: `def aws_subnet_prefix(hosts):
    """Longest prefix (/16-/28) whose AWS usable count (size - 5) fits hosts, else -1."""
    for p in range(28, 15, -1):          # /28 (smallest) up to /16 (largest allowed)
        if 2 ** (32 - p) - 5 >= hosts:
            return p
    return -1`,
    cx: `<p>O(13) checks at most: constant time.</p>`,
    f: ['How would you size a subnet for an EKS node group whose pods also take VPC IPs?', 'Azure also reserves 5 and GCP 4. How would you parameterise the function?'],
    tests: { sig: 'int -> int', fn: 'awsSubnetPrefix', cases: [[[1], 28], [[11], 28], [[12], 27], [[27], 27], [[28], 26], [[50], 26], [[59], 26], [[60], 25], [[250], 24], [[251], 24], [[252], 23], [[4000], 20], [[65531], 16], [[65532], -1]] }
  }));

  practice.push(P({
    t: 'www works, the bare domain does not', l: 'Medium', tags: ['dns', 'cname', 'tls', 'apex'], co: ['Cloudflare', 'AWS Support', 'GoDaddy'],
    s: `<p>After moving a website behind a cloud load balancer, <code>https://www.example.com</code> works but <code>https://example.com</code> fails. Some users get <i>Could not resolve host</i>, others a certificate warning. The DNS admin says "I tried to add a CNAME for example.com but the console refused". Explain both symptoms and fix them properly.</p>`,
    ex: `<p>${H.c('g', 'www.example.com CNAME shop-lb-123.elb.example.net')} works. ${H.c('r', 'example.com')} has no A record (CNAME not allowed at the apex), and the certificate lists only ${H.c('y', 'www.example.com')}.</p>`,
    bw: `<p>Hard-coding the load balancer's current IP addresses in an A record for <code>example.com</code>. Cloud load balancer IPs change over time, so the apex breaks again weeks later, and the certificate problem is still there.</p>`,
    q: ['Why did the console refuse a CNAME on example.com?', ['A CNAME cannot coexist with the SOA and NS records that must exist at the zone apex', 'CNAMEs only work for www', 'The TTL was too low', 'CNAMEs need DNSSEC'], 0, 'A name with a CNAME may have no other records, but the apex must hold SOA and NS. Providers offer alias/ALIAS/ANAME records or CNAME flattening to point the apex at a load balancer.'],
    h: ['<p>Hint 1: there are two separate problems: a DNS record at the apex, and the name list in the certificate.</p>', '<p>Hint 2: <code>dig example.com</code> vs <code>dig www.example.com</code>, and <code>openssl ... -ext subjectAltName</code> show both at once.</p>', '<p>Hint 3: use an alias/ALIAS record (or CNAME flattening) at the apex, and a certificate with both <code>example.com</code> and <code>www.example.com</code> (or <code>*.example.com</code> + the apex). Then redirect one name to the other.</p>'],
    a: `<p><b>DNS:</b> <code>example.com</code> has no address record because a CNAME is illegal at the zone apex (it would have to coexist with SOA and NS). Use the provider's <b>alias</b> feature (Route 53 alias A/AAAA to the load balancer, Azure alias record, Cloudflare CNAME flattening) so the apex follows the load balancer's changing IPs. <b>TLS:</b> users whose resolver finds an old A record reach the load balancer by the apex name, but the certificate SAN list contains only <code>www.example.com</code>, so they get a name-mismatch warning. Reissue the certificate (ACM, Let's Encrypt) with both names. <b>Then:</b> pick one canonical name and 301-redirect the other at the load balancer. Verify with dig, openssl and <code>curl -I</code> for both names.</p>`,
    code: R`dig +noall +answer www.example.com       # www.example.com. 300 IN CNAME shop-lb-123.elb.example.net.
dig +noall +answer example.com           # (nothing) or a stale A record
dig +short example.com SOA               # the apex holds SOA and NS: no CNAME allowed here
# Which names does the certificate cover?
echo | openssl s_client -connect www.example.com:443 -servername www.example.com 2>/dev/null \
  | openssl x509 -noout -ext subjectAltName          # DNS:www.example.com only
# After: alias record at the apex + certificate for example.com and www.example.com
for h in example.com www.example.com; do curl -sI "https://$h/" | head -n 1; done`,
    cx: `<p>Two record and certificate changes. The DNS change takes effect within the old TTL; certificate issuance with DNS validation takes minutes.</p>`,
    f: ['What is CNAME flattening and how does it differ from an alias record?', 'Why should www and the apex redirect to one canonical name?']
  }));

  practice.push(P({
    t: 'Custom NACL: handshake starts, then everything hangs', l: 'Medium', tags: ['nacl', 'stateless', 'ephemeral ports'], co: ['AWS Support', 'Capgemini'],
    s: `<p>To "tighten security", a team attached this custom network ACL to the public web subnet:</p>${H.table(['Direction', 'Rule', 'Action', 'Proto', 'Port', 'Peer'], [['inbound', '100', 'allow', 'tcp', '443', '0.0.0.0/0'], ['inbound', '*', 'deny', 'all', 'all', '0.0.0.0/0'], ['outbound', '100', 'allow', 'tcp', '443', '0.0.0.0/0'], ['outbound', '*', 'deny', 'all', 'all', '0.0.0.0/0']])}<p>Now users time out, and the web servers can no longer reach the package mirror either. The security groups did not change. Explain why, and write the corrected rule set.</p>`,
    ex: `<p>A user connects from <code>198.51.100.7:51544</code> to port 443. The SYN is allowed in by rule 100. The server's SYN-ACK goes <b>to port 51544</b>, which matches no outbound allow, so it is ${H.c('r', 'dropped')}. NACLs do not remember the connection.</p>`,
    bw: `<p>Allowing "all traffic" in both directions, or deleting the NACL association. It fixes the outage by removing the control entirely instead of writing the two missing rules.</p>`,
    q: ['Which outbound rule lets users\' HTTPS sessions work through this stateless NACL?', ['allow tcp 1024-65535 to 0.0.0.0/0', 'allow tcp 443 to 0.0.0.0/0', 'allow icmp to 0.0.0.0/0', 'No rule: replies are automatic'], 0, 'The reply is addressed to the client\'s ephemeral source port, a high number. Replies are automatic only for stateful filters such as security groups.'],
    h: ['<p>Hint 1: follow both packets of the handshake. Which port does the reply go to?</p>', '<p>Hint 2: there are two flows to fix: users → server (replies go out to ephemeral ports) and server → mirror (replies come in to the server\'s ephemeral ports).</p>', '<p>Hint 3: add outbound tcp 1024-65535 to 0.0.0.0/0 and inbound tcp 1024-65535 from 0.0.0.0/0, numbered before the deny. Keep fine-grained control in security groups.</p>'],
    a: `<p>Network ACLs are <b>stateless</b>: each packet is checked on its own in each direction. A user's request arrives on 443 (allowed), but the reply leaves towards the user's ephemeral port (for example 51544), and outbound only allows destination port 443, so replies die. In the other direction, the server's own call to the package mirror leaves on 443 (allowed), but the mirror's reply arrives at the server's ephemeral port, and inbound allows only 443. Corrected NACL: inbound 100 allow tcp 443 from 0.0.0.0/0; inbound 110 allow tcp 1024-65535 from 0.0.0.0/0 (replies to our outbound calls); outbound 100 allow tcp 443 to 0.0.0.0/0; outbound 110 allow tcp 1024-65535 to 0.0.0.0/0 (replies to users); then the default denies. If the subnet also needs HTTP or DNS to outside resolvers, add those. Lesson: use NACLs for coarse subnet guard rails and let security groups (stateful) do the detailed work.</p>`,
    code: R`# Read-only: show the NACL entries for the subnet (example IDs)
aws ec2 describe-network-acls --filters Name=association.subnet-id,Values=subnet-0web0001 \
  --query 'NetworkAcls[].Entries[].[Egress,RuleNumber,RuleAction,Protocol,PortRange.From,PortRange.To,CidrBlock]' --output table
# The two missing rules (protocol 6 = TCP)
ACL=acl-0web0001
aws ec2 create-network-acl-entry --network-acl-id "$ACL" --ingress --rule-number 110 \
  --protocol 6 --port-range From=1024,To=65535 --cidr-block 0.0.0.0/0 --rule-action allow
aws ec2 create-network-acl-entry --network-acl-id "$ACL" --egress --rule-number 110 \
  --protocol 6 --port-range From=1024,To=65535 --cidr-block 0.0.0.0/0 --rule-action allow`,
    cx: `<p>Two rules. The diagnosis is the hard part: draw both directions of both flows and check each against the table.</p>`,
    f: ['Why does Linux use 32768-60999 as ephemeral ports while the rule allows 1024-65535?', 'When is a NACL deny rule genuinely useful?']
  }));

  practice.push(P({
    t: 'Some users get a certificate warning, others do not', l: 'Medium', tags: ['tls', 'dns', 'load balancer', 'certificates'], co: ['AWS Support', 'Akamai', 'Microsoft'],
    s: `<p>After renewing the certificate for <code>portal.example.com</code> on the new load balancer, about 30% of users still get <i>certificate has expired</i>. Your own tests are clean. The old load balancer, which still has the expired certificate, has not been deleted yet. Explain the pattern, prove it, and fix it.</p>`,
    ex: `<p>Your resolver: ${H.c('g', 'portal.example.com → 203.0.113.20 (new LB)')}. A failing user's resolver: ${H.c('r', 'portal.example.com → 198.51.100.10 (old LB), TTL 6200')}. <code>curl --resolve</code> to each IP shows the old one serves the expired certificate.</p>`,
    bw: `<p>Renewing the certificate on the new load balancer again, or asking users to clear their browser cache. The new LB is already fine; the failing users are not even reaching it.</p>`,
    q: ['Which command tests one specific load balancer IP with the real host name and SNI?', ['<code>curl -sv --resolve portal.example.com:443:198.51.100.10 https://portal.example.com/</code>', '<code>curl -sv https://198.51.100.10/</code>', '<code>ping portal.example.com</code>', '<code>dig -x 198.51.100.10</code>'], 0, '--resolve pins the name to an IP for this request only, so SNI, the Host header and the name check all use the real name. Curling the bare IP sends no useful SNI and always fails the name check.'],
    h: ['<p>Hint 1: "some users, not others" after a change is usually caching: two different answers are being served at once.</p>', '<p>Hint 2: get a failing user\'s <code>dig</code> output (IP and remaining TTL), then test each IP separately with <code>curl --resolve</code> and <code>openssl s_client -connect IP:443 -servername NAME</code>.</p>', '<p>Hint 3: fix the old endpoint too (install the renewed certificate or redirect), and only delete it after the old TTL has expired everywhere.</p>'],
    a: `<p>The DNS record was moved to the new load balancer, but resolvers that cached the old answer (high TTL) still send users to the <b>old</b> load balancer, which still serves the expired certificate. That explains "some users": it depends on which resolver they use and when it last cached. Prove it: a failing user's dig shows the old IP with a TTL still counting down; <code>curl --resolve</code> against each IP shows the new one is valid and the old one expired. Fix immediately: install the renewed certificate on the old load balancer as well (or make it redirect to the new one), so every path is valid. Keep the old LB until its DNS TTL has passed, then delete it. Process: lower TTL before migrations, and include every endpoint in certificate expiry monitoring.</p>`,
    code: R`N=portal.example.com
for ip in 203.0.113.20 198.51.100.10; do
  printf '%-15s ' "$ip"
  echo | openssl s_client -connect "$ip:443" -servername "$N" 2>/dev/null | openssl x509 -noout -enddate
done
# notAfter for the new LB is in the future; the old LB shows the past date
curl -s -o /dev/null -w 'old LB: %{http_code}\n' --resolve "$N:443:198.51.100.10" "https://$N/" || echo "old LB: TLS failure (exit $?)"
dig +noall +answer "$N"        # ask a failing user to run this: IP + remaining TTL`,
    cx: `<p>A few minutes of tests; the fix is a certificate install on the old endpoint. The remaining TTL tells you how long the old LB must live.</p>`,
    f: ['How would a CNAME to the load balancer\'s DNS name (instead of an IP) have changed this migration?', 'What would you add to monitoring so an endpoint is never forgotten again?']
  }));

  // ───────────────────────── Practice: Hard ─────────────────────────
  practice.push(P({
    t: 'Allocate right-sized AWS subnets from one block (VLSM)', l: 'Hard', tags: ['cidr', 'vlsm', 'vpc design', 'python'], co: ['AWS', 'Google', 'Juniper'], lang: 'python', c: PYC + '<p>Each requirement is 1-65531 hosts. Subnets use the AWS rule (usable = size − 5, prefix /16 to /28).</p>',
    s: `<p>Write <code>allocate_subnets(base, hosts)</code>. <code>hosts</code> lists how many instances each subnet must hold. Give every requirement the <b>smallest</b> AWS subnet that fits, allocate them inside <code>base</code> without overlaps, packing the <b>largest first</b> from the start of the block (ties keep input order), and return the CIDRs <b>in the input order</b>. If they do not all fit, return an empty list.</p>`,
    ex: `<p><code>allocate_subnets("10.0.0.0/24", [20, 100, 50])</code> → ${H.c('g', '["10.0.0.192/27", "10.0.0.0/25", "10.0.0.128/26"]')}. Sizes: 100 → /25 (123 usable), 50 → /26 (59), 20 → /27 (27). Largest first: /25 at .0, /26 at .128, /27 at .192. Output follows the input order.</p>`,
    bw: `<p>Allocating in input order: the /27 for 20 hosts goes at .0, then the /25 must start on a multiple of 128, so it jumps to .128, and the /26 no longer fits even though the total (32 + 128 + 64 = 224) is under 256. Small blocks first create alignment gaps.</p>`,
    bc: `import ipaddress

def allocate_subnets(base, hosts):
    net = ipaddress.ip_network(base)
    cursor, out = int(net.network_address), []
    for h in hosts:                                   # input order: leaves alignment holes
        p = next(p for p in range(28, 15, -1) if 2 ** (32 - p) - 5 >= h)
        size = 2 ** (32 - p)
        cursor = (cursor + size - 1) // size * size   # round up to the block boundary
        out.append(f"{ipaddress.ip_address(cursor)}/{p}")
        cursor += size
    return out                                        # never checks the end of the block`,
    q: ['Why allocate the largest subnets first?', ['Blocks must start on a multiple of their size; placing big blocks first keeps every later, smaller block aligned with no gaps', 'Big subnets are more important', 'AWS requires it', 'It makes the output sorted'], 0, 'If the cursor is a multiple of 128 after a /25, it is also a multiple of 64, 32 and 16, so smaller blocks fit right after it. The reverse order wastes space to alignment.'],
    h: ['<p>Hint 1: first convert each requirement to a prefix with the AWS rule (smallest p in /16-/28 with 2<sup>32−p</sup> − 5 ≥ hosts).</p>', '<p>Hint 2: sort by prefix ascending (biggest block first), remembering each one\'s original index; a stable sort on (prefix, index) keeps ties in input order.</p>', '<p>Hint 3: walk a cursor from the network address, add each block\'s size, and fail if the cursor passes the end of the base block. Write results into a list indexed by the original position.</p>'],
    a: `<p><b>1. Size:</b> each requirement becomes the longest AWS-valid prefix whose usable count fits; if any needs more than a /16, fail. <b>2. Order:</b> sort (prefix, index) ascending so the largest blocks come first and ties keep input order. <b>3. Pack:</b> start a cursor at the base network address; because sizes are non-increasing powers of two, the cursor is always aligned for the next block. Place each block at the cursor, advance by its size, and stop with <code>[]</code> if a block would run past the broadcast address of the base. <b>4. Return</b> the CIDRs in the original order. This is variable-length subnet masking (VLSM); in practice also leave spare space per zone for growth.</p>`,
    code: `import ipaddress

def aws_prefix(hosts):
    for p in range(28, 15, -1):                    # /28 is the smallest AWS subnet, /16 the largest
        if 2 ** (32 - p) - 5 >= hosts:              # AWS reserves 5 addresses per subnet
            return p
    return -1

def allocate_subnets(base, hosts):
    """Right-size and pack subnets largest-first; return CIDRs in input order, or [] if they do not fit."""
    net = ipaddress.ip_network(base, strict=False)
    need = []
    for i, h in enumerate(hosts):
        p = aws_prefix(h)
        if p == -1:
            return []
        need.append((p, i))
    cursor = int(net.network_address)
    end = int(net.broadcast_address) + 1
    out = [None] * len(hosts)
    for p, i in sorted(need):                      # biggest block first, ties in input order
        size = 2 ** (32 - p)
        if p < net.prefixlen or cursor + size > end:
            return []                              # does not fit inside base
        out[i] = f"{ipaddress.ip_address(cursor)}/{p}"
        cursor += size                             # still aligned for the next (smaller or equal) block
    return out`,
    cx: `<p>O(k log k) for k requirements (the sort); the packing pass is linear.</p>`,
    f: ['How would you place each tier in a separate availability-zone block instead of one contiguous range?', 'How would you allocate around subnets that already exist?'],
    tests: { sig: 'string int[] -> string[]', fn: 'allocateSubnets', cases: [
      [['10.0.0.0/24', [100, 50, 20]], ['10.0.0.0/25', '10.0.0.128/26', '10.0.0.192/27']],
      [['10.0.0.0/24', [20, 100, 50]], ['10.0.0.192/27', '10.0.0.0/25', '10.0.0.128/26']],
      [['10.0.0.0/24', [120, 120]], ['10.0.0.0/25', '10.0.0.128/25']],
      [['10.0.0.0/24', [251]], ['10.0.0.0/24']],
      [['10.0.0.0/24', [252]], []],
      [['10.0.0.0/22', [500, 200, 200, 50, 10]], []],
      [['192.0.2.0/24', [11, 11, 11]], ['192.0.2.0/28', '192.0.2.16/28', '192.0.2.32/28']],
      [['10.0.0.0/24', [100, 100, 100]], []]
    ] }
  }));

  practice.push(P({
    t: 'Which route wins? Longest prefix match', l: 'Hard', tags: ['routing', 'route tables', 'nat', 'python'], co: ['AWS', 'Cisco', 'Microsoft'], lang: 'python', c: PYC + '<p>Each route is <code>"CIDR=target"</code>. If two matching routes have the same prefix length, the one listed first wins.</p>',
    s: `<p>A VPC route table decides where each packet goes by <b>longest prefix match</b>: of all routes whose CIDR contains the destination, the most specific one wins. Write <code>longest_prefix_match(routes, ip)</code> that returns the target of the winning route, or <code>"drop"</code> if no route matches (the packet is discarded, and the client sees a timeout).</p>`,
    ex: `<p>Routes <code>["10.0.0.0/16=local", "0.0.0.0/0=nat-gw"]</code>: ${H.c('g', '10.0.3.7 → local')} (the /16 is more specific than /0), ${H.c('y', '203.0.113.10 → nat-gw')}. With only <code>["10.0.0.0/16=local"]</code>, <code>198.51.100.1</code> → ${H.c('r', 'drop')}: that is an isolated subnet.</p>`,
    bw: `<p>Taking the first route that matches in list order. With <code>0.0.0.0/0=igw</code> listed first, every packet, including traffic for the VPN and peered networks, would go to the internet gateway.</p>`,
    bc: `import ipaddress

def longest_prefix_match(routes, ip):
    for r in routes:                                  # first match, not most specific: wrong
        dest, target = r.split("=", 1)
        if ipaddress.ip_address(ip) in ipaddress.ip_network(dest):
            return target
    return "drop"`,
    q: ['Routes: 0.0.0.0/0 → igw, 192.0.2.0/24 → vpn, 192.0.2.128/25 → dx. Where does 192.0.2.200 go?', ['dx (the /25 is the most specific match)', 'vpn', 'igw', 'drop'], 0, 'All three contain 192.0.2.200. The /25 has the longest prefix, so it wins. 192.0.2.100 would go to vpn, because it is outside the /25.'],
    h: ['<p>Hint 1: check every route, not just the first match; keep the best prefix length seen so far.</p>', '<p>Hint 2: use a strict "greater than" comparison so that, on a tie, the earlier route stays.</p>', '<p>Hint 3: start with best = "drop" and best length = −1, so even a <code>0.0.0.0/0</code> (length 0) beats "no route".</p>'],
    a: `<p>Parse each route into a network and a target. For the destination address, keep every route that contains it and choose the one with the largest prefix length; equal lengths keep the earlier route. No match → "drop". This is how AWS/Azure route tables, Linux (<code>ip route get</code>) and internet routers all decide: specific routes for local, peered, VPN or endpoint traffic, with <code>0.0.0.0/0</code> as the catch-all to an internet or NAT gateway. Real routers use tries for speed; a linear scan is fine for a route table with tens of entries.</p>`,
    code: `import ipaddress

def longest_prefix_match(routes, ip):
    """Return the target of the most specific route containing ip, or 'drop'."""
    addr = ipaddress.ip_address(ip)
    best, best_len = "drop", -1
    for r in routes:
        dest, target = r.split("=", 1)
        net = ipaddress.ip_network(dest, strict=False)
        if addr in net and net.prefixlen > best_len:   # strictly longer: ties keep the earlier route
            best, best_len = target, net.prefixlen
    return best`,
    cx: `<p>O(R) for R routes per lookup.</p>`,
    f: ['A peered VPC route 10.1.0.0/16 and a transit gateway route 10.0.0.0/8 both exist. Which carries 10.1.4.4, and why might that surprise someone?', 'Why does every VPC route table contain a "local" route that you cannot delete?'],
    tests: { sig: 'string[] string -> string', fn: 'longestPrefixMatch', cases: [
      [[['10.0.0.0/16=local', '0.0.0.0/0=nat-gw'], '10.0.3.7'], 'local'],
      [[['10.0.0.0/16=local', '0.0.0.0/0=nat-gw'], '203.0.113.10'], 'nat-gw'],
      [[['10.0.0.0/16=local', '10.1.0.0/16=pcx-peer', '0.0.0.0/0=igw'], '10.1.4.4'], 'pcx-peer'],
      [[['10.0.0.0/16=local', '10.0.3.0/24=fw-appliance'], '10.0.3.200'], 'fw-appliance'],
      [[['10.0.0.0/16=local'], '198.51.100.1'], 'drop'],
      [[['0.0.0.0/0=igw', '192.0.2.0/24=vpn', '192.0.2.128/25=dx'], '192.0.2.200'], 'dx'],
      [[['0.0.0.0/0=igw', '192.0.2.0/24=vpn', '192.0.2.128/25=dx'], '192.0.2.100'], 'vpn'],
      [[['10.0.0.0/8=tgw', '10.20.0.0/16=local', '10.20.5.0/24=endpoint'], '10.20.5.9'], 'endpoint']
    ] }
  }));

  practice.push(P({
    t: 'Audit a list of networks for peering conflicts', l: 'Hard', tags: ['cidr', 'peering', 'ipam', 'python'], co: ['AWS', 'Google', 'Microsoft'], lang: 'python', c: PYC + '<p>Up to 500 CIDRs. Duplicates count as overlapping.</p>',
    s: `<p>Your company wants to connect all its VPCs and offices through a transit gateway, which needs non-overlapping ranges. Write <code>find_overlaps(cidrs)</code> that returns every conflicting pair as the string <code>"A|B"</code> (A appears earlier in the input than B), ordered by A's position and then B's position.</p>`,
    ex: `<p><code>["10.0.0.0/16", "10.0.128.0/20", "10.1.0.0/16", "10.0.200.0/24"]</code> → ${H.c('r', '["10.0.0.0/16|10.0.128.0/20", "10.0.0.0/16|10.0.200.0/24"]')}. The two smaller blocks sit inside the first /16; 10.1.0.0/16 is clean.</p>`,
    bw: `<p>Expanding every block into its individual addresses and putting them in a set. Two /8s alone are 33 million addresses; the job can be done from the start and end addresses of each block.</p>`,
    bc: `import ipaddress

def find_overlaps(cidrs):
    owner, out = {}, []
    for c in cidrs:
        for ip in ipaddress.ip_network(c):    # every address: hopeless for /8 or /16 blocks
            if ip in owner:
                pair = f"{owner[ip]}|{c}"
                if pair not in out:
                    out.append(pair)
            else:
                owner[ip] = c
    return out`,
    q: ['Your company uses 10.0.0.0/16 for every new VPC by default. What happens when you try to connect them?', ['Every pair conflicts, so none of them can be routed to each other without re-addressing or NAT', 'Nothing: VPCs are isolated', 'The transit gateway renumbers them', 'Only the first two conflict'], 0, 'Identical ranges overlap completely. A router cannot know which VPC 10.0.3.7 belongs to, so peering or transit routing between them is impossible as-is.'],
    h: ['<p>Hint 1: two aligned CIDR blocks overlap exactly when one contains the other: <code>a.overlaps(b)</code>.</p>', '<p>Hint 2: a double loop over i &lt; j gives the required order directly and is fine for a few hundred networks (125,000 checks).</p>', '<p>Hint 3: for thousands of blocks, sort by start address and sweep, keeping the furthest end seen so far; you only compare neighbours that can overlap.</p>'],
    a: `<p>Parse each CIDR once. For every pair i &lt; j, check <code>overlaps</code> (equivalently, start<sub>i</sub> ≤ end<sub>j</sub> and start<sub>j</sub> ≤ end<sub>i</sub>) and record <code>"cidrs[i]|cidrs[j]"</code>. The double loop naturally yields the required order. For a large estate, sort blocks by start address and sweep with a list of "open" blocks to get near O(n log n). The real fix is organisational: a central IPAM that hands out non-overlapping blocks per account, region and environment, plus a CI check like this one on every new network.</p>`,
    code: `import ipaddress

def find_overlaps(cidrs):
    """Every overlapping pair 'A|B' with A before B in the input, in input order."""
    nets = [ipaddress.ip_network(c, strict=False) for c in cidrs]
    out = []
    for i in range(len(nets)):
        for j in range(i + 1, len(nets)):
            if nets[i].overlaps(nets[j]):      # aligned blocks: nested or identical
                out.append(f"{cidrs[i]}|{cidrs[j]}")
    return out`,
    cx: `<p>O(n<sup>2</sup>) pair checks, each O(1). 500 networks → about 125,000 checks, well under a second.</p>`,
    f: ['How would you also report which networks could be summarised into one larger route?', 'Where would you run this check automatically?'],
    tests: { sig: 'string[] -> string[]', fn: 'findOverlaps', cases: [
      [[['10.0.0.0/16', '10.1.0.0/16', '10.2.0.0/16']], []],
      [[['10.0.0.0/16', '10.0.128.0/20', '10.1.0.0/16', '10.0.200.0/24']], ['10.0.0.0/16|10.0.128.0/20', '10.0.0.0/16|10.0.200.0/24']],
      [[['192.168.0.0/16', '192.168.10.0/24', '172.16.0.0/12', '172.31.0.0/16']], ['192.168.0.0/16|192.168.10.0/24', '172.16.0.0/12|172.31.0.0/16']],
      [[['10.0.0.0/8']], []],
      [[[]], []],
      [[['10.0.0.0/24', '10.0.0.0/24']], ['10.0.0.0/24|10.0.0.0/24']],
      [[['10.0.0.0/25', '10.0.0.128/25', '10.0.0.0/24']], ['10.0.0.0/25|10.0.0.0/24', '10.0.0.128/25|10.0.0.0/24']]
    ] }
  }));

  practice.push(P({
    t: 'Two VPCs must talk, but their CIDRs overlap', l: 'Hard', tags: ['peering', 'cidr', 'privatelink', 'nat', 'design'], co: ['AWS', 'Microsoft', 'Infosys'],
    s: `<p>After an acquisition, your <code>payments</code> VPC (<code>10.0.0.0/16</code>) must call one API in the acquired company's <code>ledger</code> VPC (<code>10.0.0.0/16</code> too). The peering request fails with an overlapping-CIDR error. Explain why it cannot work as-is, give three options with trade-offs, and recommend one for "one API, needed next week" and one for the long term.</p>`,
    ex: `<p>${H.c('r', 'payments 10.0.0.0/16')} vs ${H.c('r', 'ledger 10.0.0.0/16')}: identical ranges. A packet to <code>10.0.5.9</code> from payments matches payments' own <code>local</code> route first; it can never leave towards ledger.</p>`,
    bw: `<p>Adding more specific routes for a few ledger IPs in the payments route table. Those IPs also exist (or may exist) inside payments itself, the local route covers the whole VPC, and the provider rejects the peering anyway.</p>`,
    q: ['Which option exposes exactly one service across overlapping VPCs without re-addressing either network?', ['A PrivateLink endpoint service (NLB in ledger, interface endpoint in payments)', 'VPC peering with more specific routes', 'A bigger subnet mask', 'Opening the security group to 10.0.0.0/16'], 0, 'PrivateLink does not route between the networks; the consumer gets an endpoint with an IP from its own range, so overlap does not matter. It is one-directional and per service.'],
    h: ['<p>Hint 1: routing needs every destination address to have one unambiguous owner. Identical ranges break that for every address.</p>', '<p>Hint 2: options either avoid routing (PrivateLink / a public API endpoint), translate addresses (private NAT), or remove the overlap (re-IP).</p>', '<p>Hint 3: judge each by scope (one API vs everything), time, cost, and operational complexity (NAT hides real source IPs from logs).</p>'],
    a: `<p><b>Why not:</b> peering and transit routing need unique addresses. With both VPCs at <code>10.0.0.0/16</code> every destination is ambiguous and the local route always wins, so the provider refuses the peering. <b>Option 1 - PrivateLink (endpoint service):</b> ledger puts its API behind a Network Load Balancer and publishes an endpoint service; payments creates an interface endpoint, which gets an IP from payments' own subnets. No routing between the VPCs, so overlap is irrelevant. One direction, one service, low risk, small per-hour and per-GB cost. <b>Option 2 - translate with NAT:</b> add a non-overlapping secondary CIDR (for example <code>100.64.0.0/24</code>) and a private NAT gateway or appliances on each side so traffic appears from unique addresses. Works for many services but is complex to run and hides real client IPs. <b>Option 3 - re-IP:</b> move one VPC to a unique range from the company IPAM (for example <code>10.48.0.0/16</code>) by building new subnets and migrating workloads. Most work, but the only clean long-term answer. <b>Recommendation:</b> PrivateLink next week for the single API; plan a re-IP of the acquired VPCs into the company's IPAM plan before connecting more services, and add an overlap check to the VPC creation pipeline.</p>`,
    code: R`# Evidence for the ticket: both VPCs and their CIDRs (read-only, example IDs)
aws ec2 describe-vpcs --vpc-ids vpc-0pay0001 vpc-0led0002 --query 'Vpcs[].[VpcId,CidrBlock]' --output table
# Quick overlap proof from the shell
python3 -c 'import ipaddress as i; print(i.ip_network("10.0.0.0/16").overlaps(i.ip_network("10.0.0.0/16")))'   # True
# Option 1 sketch (ledger side publishes, payments side consumes):
#   aws ec2 create-vpc-endpoint-service-configuration --network-load-balancer-arns "$LEDGER_NLB_ARN" --acceptance-required
#   aws ec2 create-vpc-endpoint --vpc-id vpc-0pay0001 --vpc-endpoint-type Interface \
#     --service-name "$LEDGER_SERVICE_NAME" --subnet-ids subnet-0paya001 subnet-0payb001 --security-group-ids sg-0payep01`,
    cx: `<p>PrivateLink: days. Private NAT: a week or two plus ongoing complexity. Re-IP: weeks to months depending on the workloads, but it removes the problem for good.</p>`,
    f: ['How does the ledger team see the real caller when traffic comes through PrivateLink?', 'What would an IPAM policy for a 200-account organisation look like?']
  }));

  practice.push(P({
    t: 'Intermittent 502s and timeouts after a deploy', l: 'Hard', tags: ['troubleshooting', 'load balancer', 'dns', 'security groups', 'tcpdump'], co: ['AWS Support', 'Netflix', 'Atlassian'],
    s: `<p>Since a deploy yesterday, about 1 in 4 requests to <code>https://api.example.com</code> fails: some with <code>502 Bad Gateway</code>, others with a client timeout after 30 s. The deploy added a fourth target instance in a <b>new subnet</b> and changed the app's listen port from 8080 to 8081 on that instance only (a config mistake nobody has noticed yet). Describe a systematic investigation from the client side to the server side, the evidence each step gives, and the fixes.</p>`,
    ex: `<p>Direct tests from a host in the VPC: targets 1-3 ${H.c('g', '200')} on 8080; target 4 ${H.c('r', 'refused')} on 8080 (it listens on 8081). Target 4's subnet NACL also blocks the LB subnets, so its health checks ${H.c('r', 'time out')}. 1 in 4 = one bad target out of four.</p>`,
    bw: `<p>Rolling back the whole deploy without understanding it, or raising the load balancer timeout. Rollback may hide the two real faults until the next scale-out; a longer timeout just makes users wait longer for the same failures.</p>`,
    q: ['"1 in 4 requests fails" with 4 targets behind a load balancer suggests what first?', ['One target is bad; test each target directly', 'DNS is flapping', 'The certificate is expiring', 'The client network is lossy'], 0, 'A failure ratio matching 1/number-of-targets is a strong hint that one backend is broken. Test each one directly from inside the VPC to confirm.'],
    h: ['<p>Hint 1: start with the pattern: failure rate, which status codes, since when, and what changed. Map 502 and timeouts to layers.</p>', '<p>Hint 2: test each target directly from a host in the VPC with <code>curl -m 3</code> and <code>nc -vz</code>, then check target health reasons on the load balancer.</p>', '<p>Hint 3: on the bad target, <code>ss -tlnp</code> shows the listen port; <code>tcpdump</code> shows whether health-check SYNs arrive at all (NACL/SG) and what the host answers.</p>'],
    a: `<p><b>1. Pattern:</b> ~25% failures since the deploy; one new target out of four. 502 = LB reached a target and got a bad answer or a reset; timeouts = something drops packets. Two symptoms, maybe two causes. <b>2. Client side:</b> loop <code>curl -w</code> with status codes to confirm the ratio; dig shows DNS is stable (rules out DNS). <b>3. Load balancer view:</b> target health shows target 4 <code>unhealthy</code> (reason <code>Target.Timeout</code>), but it is still receiving some traffic while health checks settle or because of how the group was registered; LB access logs show the 502s and timeouts all with target 4's IP. <b>4. Direct tests from a VPC host:</b> targets 1-3 return 200 on 8080. Target 4: <code>nc -vz 10.0.4.15 8080</code> → refused (nothing on 8080) → explains the 502s. <b>5. On target 4:</b> <code>ss -tlnp</code> shows the app on <code>:8081</code> (the config mistake). <code>tcpdump -ni any 'tcp port 8080'</code> shows the LB's health-check SYNs from some LB nodes never arriving: the new subnet's custom NACL lacks inbound 8080 from the LB subnets and outbound ephemeral replies → explains the timeouts. <b>6. Fix:</b> deregister target 4 now (instant relief), fix its port to 8080 through config management, add the NACL rules (or use the default NACL and rely on security groups), confirm health checks pass, then re-register. <b>7. Prevent:</b> configuration from one source of truth, a deploy gate on target health, and the same NACL/SG baseline for every app subnet via IaC.</p>`,
    code: R`# 1. Confirm the ratio and codes from outside
for i in $(seq 1 20); do curl -s -o /dev/null -m 10 -w '%{http_code} ' https://api.example.com/health; done; echo
# 2. Test each target directly from a host inside the VPC
for t in 10.0.1.11 10.0.2.12 10.0.3.13 10.0.4.15; do
  printf '%-10s ' "$t"; curl -s -o /dev/null -m 3 -w '%{http_code}\n' "http://$t:8080/health" || echo "fail (curl exit $?)"
done
# 3. On target 4: what is it listening on, and do health checks arrive?
sudo ss -tlnp | grep -E ':808[01]'
sudo tcpdump -ni any -c 20 'tcp port 8080'
# 4. Relief first: take target 4 out of rotation (example ARN in a variable)
aws elbv2 deregister-targets --target-group-arn "$TG_ARN" --targets Id=i-0target4444`,
    cx: `<p>Twenty minutes with a disciplined ladder. Deregistering the bad target restores service in about a minute while you fix the real causes.</p>`,
    f: ['Why did some requests get 502 and others time out, if both came from the same instance?', 'How would connection draining and health-check thresholds change what users saw?']
  }));

  practice.push(P({
    t: 'Design a two-tier network from scratch', l: 'Hard', tags: ['vpc design', 'cidr', 'nat', 'security groups', 'design'], co: ['AWS', 'Microsoft', 'Google'],
    s: `<p>Design the network for a web app: an internet-facing load balancer, app servers that must download packages and call a partner API (the partner allowlists one IP per zone), and a PostgreSQL database. Two availability zones now, a third later. The company IPAM gave you <code>10.40.0.0/16</code>. Produce: the subnet plan with CIDRs, the route tables, the security groups, and how admins get shell access. Explain each choice briefly.</p>`,
    ex: `<p>Public <code>10.40.0.0/22</code> (zone a) holds the ALB and NAT; private app <code>10.40.16.0/20</code> (zone a) routes <code>0.0.0.0/0 → nat-a</code>; private data <code>10.40.32.0/22</code> (zone a) has no internet route; zone b mirrors it at <code>10.40.64.0/18</code>; zone c keeps <code>10.40.128.0/18</code> spare.</p>`,
    bw: `<p>One public subnet for everything with public IPs on all instances and port 5432 open to 0.0.0.0/0 "temporarily". It works on day one, exposes the database to the internet, gives the partner a different source IP every time an instance changes, and has no room to grow.</p>`,
    q: ['Why give each availability zone its own NAT gateway and private route table?', ['A NAT gateway is zonal: if its zone fails, private subnets in other zones that route to it lose internet access', 'AWS requires one per subnet', 'It halves the cost', 'Route tables cannot be shared'], 0, 'Zonal NAT gateways keep each zone independent. It also avoids cross-zone data charges and gives the partner one stable IP per zone.'],
    h: ['<p>Hint 1: split the /16 into four /18 zone blocks (a, b, c, spare), then carve tiers inside each: a small public subnet, a big app subnet, a small data subnet.</p>', '<p>Hint 2: route tables: public → IGW; private app → the NAT gateway in the same zone; data → local only (plus endpoints if needed).</p>', '<p>Hint 3: security groups chain by reference: alb (443 from internet) → app (8080 from alb) → db (5432 from app). No SSH from the internet: SSM Session Manager.</p>'],
    a: `<p><b>Address plan</b> (from <code>10.40.0.0/16</code>): zone a = <code>10.40.0.0/18</code>, zone b = <code>10.40.64.0/18</code>, zone c (future) = <code>10.40.128.0/18</code>, spare = <code>10.40.192.0/18</code>. Inside zone a: public <code>10.40.0.0/22</code> (1,019 usable: ALB nodes, NAT gateway), app <code>10.40.16.0/20</code> (4,091 usable: auto-scaling, rolling deploys, room for containers), data <code>10.40.32.0/22</code> (DB primary/replicas, managed service ENIs). Zone b repeats the pattern at <code>10.40.64.0/22</code>, <code>10.40.80.0/20</code>, <code>10.40.96.0/22</code>. <b>Routing:</b> one public route table (<code>10.40.0.0/16 local</code>, <code>0.0.0.0/0 → igw</code>) for both public subnets; one private-app route table <b>per zone</b> with <code>0.0.0.0/0 → nat-a</code> / <code>nat-b</code>; data route tables with local only, plus a gateway endpoint for S3 backups. NAT gateway per zone with an Elastic IP: these two IPs go to the partner allowlist. <b>Security groups:</b> <code>sg-alb</code>: in 443 from 0.0.0.0/0 (and 80 to redirect); <code>sg-app</code>: in 8080 from sg-alb only; <code>sg-db</code>: in 5432 from sg-app only; egress for sg-db restricted. NACLs left at default (allow), with an optional deny for known-bad ranges. <b>Admin access:</b> no public IPs on instances and no port 22 at all: SSM Session Manager (needs outbound 443 via NAT or SSM VPC endpoints), with sessions logged. <b>DNS/TLS:</b> alias record for the apex and www to the ALB, ACM certificate with both names. <b>Checks:</b> run an overlap check against the IPAM, and define it all in Terraform so zone c is a copy-paste.</p>`,
    code: R`# Verify the plan before building anything: every subnet inside the VPC, no overlaps.
python3 - <<'EOF'
import ipaddress
from itertools import combinations
vpc = ipaddress.ip_network("10.40.0.0/16")
plan = {
    "public-a": "10.40.0.0/22", "app-a": "10.40.16.0/20", "data-a": "10.40.32.0/22",
    "public-b": "10.40.64.0/22", "app-b": "10.40.80.0/20", "data-b": "10.40.96.0/22",
}
nets = {k: ipaddress.ip_network(v) for k, v in plan.items()}
assert all(n.subnet_of(vpc) for n in nets.values()), "a subnet is outside the VPC"
clashes = [(a, b) for (a, x), (b, y) in combinations(nets.items(), 2) if x.overlaps(y)]
print("overlaps:", clashes or "none")
for k, n in nets.items():
    print(f"{k:9} {str(n):15} AWS usable {n.num_addresses - 5}")
EOF`,
    cx: `<p>A design answer: about 30 minutes to plan, minutes to verify with the script, and the whole layout is reproducible in IaC.</p>`,
    f: ['What changes if the app moves to Kubernetes with one VPC IP per pod?', 'How would you add IPv6 to this design, and what replaces the NAT gateway for IPv6?']
  }));

  // ───────────────────────── Quiz ─────────────────────────
  quiz.push({ q: '<code>curl</code> to a server fails instantly with <i>Connection refused</i>. What does that prove?', options: ['The packet reached the host and nothing is listening on that port (or a REJECT rule answered)', 'A security group dropped the packet', 'DNS failed', 'The certificate expired'], answer: 0, explain: 'A refusal is a reply (TCP RST). Security groups never reply, they drop, which looks like a timeout. Check the listener with <code>ss -tlnp</code>.' });
  quiz.push({ q: 'Which symptom usually points to a security group blocking the port?', options: ['The connection hangs and then times out', 'An instant "Connection refused"', 'HTTP 404', 'NXDOMAIN'], answer: 0, explain: 'Security groups silently drop packets that no rule allows, so the client retries the SYN until its timeout.' });
  quiz.push({ q: 'How many addresses does AWS let you use for instances in a /26 subnet?', options: ['59', '62', '64', '61'], answer: 0, explain: '2<sup>6</sup> = 64 addresses, minus 5 reserved by AWS (network, router, DNS, future use, last address) = 59.' });
  quiz.push({ q: 'What is the network address of <code>192.0.2.77/27</code>?', options: ['192.0.2.64', '192.0.2.77', '192.0.2.0', '192.0.2.96'], answer: 0, explain: 'Mask 255.255.255.224, block size 32. Blocks start at 0, 32, 64, 96; 77 is in 64-95, so the network is .64 and the broadcast .95.' });
  quiz.push({ q: 'Which pair of networks overlaps?', options: ['10.0.0.0/16 and 10.0.128.0/20', '10.0.0.0/16 and 10.1.0.0/16', '192.0.2.0/25 and 192.0.2.128/25', '172.16.0.0/16 and 172.17.0.0/16'], answer: 0, explain: '10.0.0.0/16 covers 10.0.0.0-10.0.255.255, which includes all of 10.0.128.0/20. The other pairs are neighbours that do not share addresses.' });
  quiz.push({ q: 'You changed an A record (TTL 3600) at 10:00. One resolver cached the old answer at 09:50. Until when can it serve the old IP?', options: ['About 10:50', '10:00', 'Tomorrow at 10:00 (48 hours)', 'Until the user reboots'], answer: 0, explain: 'A resolver keeps an answer for the TTL it received: 09:50 + 3600 s = 10:50. "Propagation" is just caches expiring.' });
  quiz.push({ q: 'Which command shows what an <b>application</b> on Linux will resolve a name to, including <code>/etc/hosts</code>?', options: ['<code>getent hosts NAME</code>', '<code>dig NAME</code>', '<code>dig +trace NAME</code>', '<code>nslookup NAME 1.1.1.1</code>'], answer: 0, explain: 'getent uses the same NSS path as applications (files, then dns per nsswitch.conf). dig and nslookup query DNS directly and ignore /etc/hosts.' });
  quiz.push({ q: 'A certificate has SAN <code>*.example.com</code>. Which name does it <b>not</b> cover?', options: ['example.com', 'www.example.com', 'api.example.com', 'shop.example.com'], answer: 0, explain: 'A wildcard covers exactly one label to the left. The bare apex example.com (and deeper names like a.b.example.com) need their own SAN entries.' });
  quiz.push({ q: 'curl says <i>unable to get local issuer certificate</i>, but browsers load the site. Most likely cause?', options: ['The server does not send the intermediate certificate', 'The certificate expired', 'DNS points to the wrong IP', 'Port 443 is blocked'], answer: 0, explain: 'Browsers often have the intermediate cached or fetch it themselves; curl, Java and Python do not. Serve the full chain (fullchain.pem).' });
  quiz.push({ q: 'An ALB returns <b>503</b>. What should you check first?', options: ['Target health: there may be no healthy targets', 'The DNS TTL', 'The client\'s browser cache', 'The certificate SAN list'], answer: 0, explain: 'A 503 from the load balancer itself typically means there are no healthy targets to send to. Look at target health reasons and health-check settings.' });
  quiz.push({ q: 'What makes a cloud subnet "private"?', options: ['Its route table has no route to an internet gateway', 'It uses 10.x addresses', 'Its security group denies all inbound traffic', 'It has a NACL'], answer: 0, explain: 'Public and private subnets both use private addresses. A public subnet has 0.0.0.0/0 → internet gateway; a private one does not (it may use a NAT gateway for egress).' });
  quiz.push({ q: 'A private instance needs outbound internet for updates but must not be reachable from the internet. What do you add?', options: ['A route 0.0.0.0/0 → a NAT gateway placed in a public subnet', 'A public IP on the instance', 'A route 0.0.0.0/0 → the internet gateway in its subnet', 'An inbound security group rule for 0.0.0.0/0'], answer: 0, explain: 'NAT gives outbound-only access: replies come back, new inbound connections have no mapping. The NAT gateway itself must sit in a public subnet.' });
  quiz.push({ q: 'Why does a custom network ACL that allows only port 443 in and out break HTTPS?', options: ['NACLs are stateless, so replies to clients\' ephemeral ports (1024-65535) are blocked', 'NACLs cannot filter port 443', 'NACLs need an ICMP rule for TLS', 'It does not break anything'], answer: 0, explain: 'Unlike security groups, NACLs do not track connections. The server\'s reply goes to the client\'s high source port and needs its own outbound rule.' });
  quiz.push({ q: 'mtr shows 50% loss at hop 4 but 0% at hops 5-8 and at the destination. What does it mean?', options: ['Hop 4 rate-limits replies to probes; there is no real loss', 'The path loses half of all packets', 'The destination is down', 'DNS is failing'], answer: 0, explain: 'Real loss continues to every later hop. Loss that appears at one intermediate hop only is that router de-prioritising ICMP replies about itself.' });
  quiz.push({ q: 'Which curl option tests a new server with the real host name before you change DNS?', options: ['<code>--resolve www.example.com:443:203.0.113.20</code>', '<code>-k</code>', '<code>-H "Host: 203.0.113.20"</code>', '<code>--dns-servers 203.0.113.20</code>'], answer: 0, explain: '--resolve pins the name to an IP for that one request, so SNI, the Host header and certificate checks all use the real name. -k only disables verification.' });

  // ───────────────────────── Interview ─────────────────────────
  interview.push({ level: 'B', q: 'What is the difference between "Connection refused" and "Connection timed out"?', a: `<p>Both mean a TCP connection did not open, but they tell you different things. <b>Refused</b> is fast: the client's SYN reached the destination host and the host answered with a TCP reset (or a firewall REJECT answered with ICMP). So routing and cloud filters let the packet through; the problem is on the host: nothing listens on that port, the app listens on 127.0.0.1 only, the service crashed, or a REJECT rule. I check <code>ss -tlnp</code> and the service status. <b>Timed out</b> is slow: no reply at all. Something dropped the packet: a security group (they never reply), a NACL, a host firewall DROP rule, a missing route, a host that is off, or DNS pointing at an old IP. I check the security group, NACLs, route tables and the IP the name resolves to. Confirm with <code>nc -vz -w 3 host port</code> and, if needed, tcpdump on the server.</p>`, followUps: ['Why does a timeout take about two minutes by default on Linux?', 'What would "No route to host" usually mean?'] });
  interview.push({ level: 'B', q: 'Explain what happens, at the network level, when you open https://www.example.com.', a: `<p>1) The browser checks its caches, then the OS resolver (which checks <code>/etc/hosts</code>), then the recursive resolver, which walks root → .com → example.com's authoritative servers if needed, and returns an A/AAAA record with a TTL. 2) The OS picks a route (usually the default gateway) and a random ephemeral source port. 3) TCP three-way handshake to port 443: SYN, SYN-ACK, ACK; on the way, NAT may rewrite the source address. 4) TLS handshake: the client sends SNI (www.example.com); the server sends its certificate chain; the client checks the chain to a trusted root, the dates and that the name is in the SAN list, and they agree on keys. 5) The HTTP request goes inside TLS with a Host header; often a load balancer or CDN terminates TLS and forwards to a backend. 6) The response returns with a status code. Each step has its own failure mode, which is why I troubleshoot in the same order.</p>`, followUps: ['Where can caching happen along the way?', 'What changes with HTTP/3?'] });
  interview.push({ level: 'B', q: 'How many usable IPs are in a /24, a /26 and a /28, in a classic network and in AWS?', a: `<p>A prefix /n leaves 32 − n host bits, so the block has 2<sup>32−n</sup> addresses. <b>/24</b>: 256 addresses, 254 classic usable (minus network and broadcast), 251 in AWS. <b>/26</b>: 64 addresses, 62 classic, 59 in AWS. <b>/28</b>: 16 addresses, 14 classic, 11 in AWS. AWS (and Azure) reserve five addresses per subnet: the network address, base + 1 for the VPC router, base + 2 for DNS, base + 3 reserved for future use, and the last address. GCP reserves four. AWS subnets must be between /16 and /28. In practice I size subnets well above the instance count because auto-scaling, rolling deploys, load balancer nodes, Lambda ENIs and Kubernetes pods also take addresses.</p>`, followUps: ['What is the subnet mask of a /26?', 'Why might a /28 be a bad choice for a load balancer subnet?'] });
  interview.push({ level: 'B', q: 'What DNS record types do you use most, and what is a TTL?', a: `<p><b>A</b> and <b>AAAA</b> map a name to IPv4 and IPv6 addresses. <b>CNAME</b> makes one name an alias for another (not allowed at the zone apex, which is why providers offer alias/ALIAS records for pointing example.com at a load balancer). <b>MX</b> routes mail, <b>TXT</b> carries SPF, DKIM and domain-verification tokens (including for certificates), <b>NS</b> lists the authoritative servers, <b>SOA</b> holds zone metadata including the negative-caching time, <b>PTR</b> is reverse DNS, and <b>CAA</b> restricts which CAs may issue certificates. The <b>TTL</b> is how many seconds resolvers may cache the answer. It is the reason DNS changes are not instant: a resolver that cached the old answer keeps it until the TTL runs out. Before migrations I lower the TTL at least one old-TTL in advance.</p>`, followUps: ['How do you see the remaining TTL on a cached answer?', 'What is negative caching?'] });
  interview.push({ level: 'B', q: 'What is the difference between a public and a private subnet, and how does a private instance reach the internet?', a: `<p>The difference is the <b>route table</b>, not the addresses: both use private IPs from the VPC range. A public subnet has <code>0.0.0.0/0 → internet gateway</code>; instances there with a public IP are reachable from the internet (subject to security groups), and the IGW does 1:1 NAT between private and public addresses. A private subnet has no route to the IGW. For outbound access it routes <code>0.0.0.0/0</code> to a <b>NAT gateway</b> that sits in a public subnet with an Elastic IP; the NAT rewrites the source address, tracks the connection, and lets only replies back in. So private instances can download updates or call APIs, but nothing on the internet can open a connection to them. Inbound traffic comes through a load balancer in the public subnets, and admin access through SSM or a bastion.</p>`, followUps: ['Why is a NAT gateway placed in a public subnet?', 'How would you give private instances access to S3 without NAT?'] });
  interview.push({ level: 'B', q: 'How do you check which ports a Linux server is listening on and whether a remote port is reachable?', a: `<p>On the server: <code>sudo ss -tlnp</code> lists listening TCP sockets with the local address, port and process (<code>-u</code> for UDP). I look at the address too: <code>127.0.0.1:8080</code> is local only, <code>0.0.0.0:8080</code> or <code>[::]:8080</code> is all interfaces. <code>ss -tnp</code> shows established connections, and <code>ss -s</code> gives totals. From a client: <code>nc -vz -w 3 host port</code> tells me "succeeded", "refused" or "timed out" quickly; without nc, <code>timeout 3 bash -c 'exec 3&lt;&gt;/dev/tcp/host/port'</code> works. For HTTP I go straight to <code>curl -v</code>. For UDP services I use the real client (dig for DNS) because UDP port checks are unreliable. If the client and server disagree, tcpdump on the server shows whether the SYNs arrive.</p>`, followUps: ['What does the Recv-Q column mean on a listening socket?', 'Why can nc report success for a closed UDP port?'] });
  interview.push({ level: 'I', q: 'A website resolves on your machine but not on a customer\'s machine. How do you troubleshoot?', a: `<p>I get the facts from both sides. Ask the customer for <code>dig +noall +answer NAME</code> (or <code>nslookup -debug</code> on Windows) and which resolver they use. Compare with the <b>authoritative</b> answer: <code>dig @NS NAME</code>. If they get NXDOMAIN or an old IP with a TTL counting down, it is caching: an old answer or a cached negative answer from before the record existed (the SOA minimum controls that). If their resolver returns SERVFAIL while public ones work, suspect DNSSEC validation problems or a broken corporate resolver. If dig is fine but the app is not, check <code>/etc/hosts</code> (<code>getent hosts</code>), browser caches, VPN split DNS, or a private hosted zone that is only visible inside a VPC. I tell the customer exactly how long a cache will last from the TTL, and for future changes lower TTLs ahead of time.</p>`, followUps: ['How would split-horizon DNS cause this?', 'What would you check at the registrar?'] });
  interview.push({ level: 'I', q: 'Users report a certificate error. Walk me through it.', a: `<p>First I get the exact error, because the TLS client tells you which check failed. Then I look at what the server really sends: <code>echo | openssl s_client -connect HOST:443 -servername HOST -showcerts</code> piped to <code>openssl x509 -noout -subject -issuer -dates -ext subjectAltName</code>. <b>Expired / not yet valid</b>: check notAfter/notBefore, and the client clock if only one machine complains. <b>Name mismatch</b>: the host name is not in the SAN list; wildcards cover one label and not the apex. <b>Untrusted / unable to get local issuer</b>: the intermediate is missing from the chain (works in browsers, fails in curl/Java), or it is a private CA the client does not trust. If only some users fail, I test each endpoint IP with <code>curl --resolve</code>, because an old load balancer or CDN edge may still serve an old certificate. After fixing, I fix the automation: ACME renewals (port 80 or DNS validation), managed certificates whose DNS validation record must stay in place, and expiry monitoring with alerts at 21-30 days.</p>`, followUps: ['Why are certificate lifetimes getting shorter?', 'How does SNI relate to certificate errors on shared IPs?'] });
  interview.push({ level: 'I', q: 'Compare security groups and network ACLs. When do you use each?', a: `<p><b>Security groups</b> attach to network interfaces, contain only allow rules, are evaluated as a whole (no order), and are <b>stateful</b>: return traffic for an allowed connection is automatically allowed. They can reference other security groups as sources, which is how I build tiers: alb → app → db. <b>Network ACLs</b> attach to subnets, have numbered rules evaluated lowest first with allow <b>and</b> deny, and are <b>stateless</b>: replies need explicit rules, typically TCP 1024-65535 for ephemeral ports in the opposite direction. I do almost all access control in security groups, because they are precise and follow instances as they scale. I use NACLs sparingly as a coarse subnet guard rail, for example to deny a known bad range or to enforce that a data subnet can only talk to the app subnet range. Both drop silently, so both produce timeouts; flow logs or Reachability Analyzer tell me which one blocked.</p>`, followUps: ['What happens to established connections when you remove a security group rule?', 'How do Azure NSGs differ?'] });
  interview.push({ level: 'I', q: 'Split 10.0.0.0/16 into subnets for three tiers in two availability zones. Show your reasoning.', a: `<p>I want room to grow, so I first cut the /16 into four /18 blocks (16,384 addresses each): zone a <code>10.0.0.0/18</code>, zone b <code>10.0.64.0/18</code>, and two spare (<code>10.0.128.0/18</code> for a third zone, <code>10.0.192.0/18</code> for anything else). Each step of +1 on the prefix halves the block, so +2 bits gives four pieces, with block size 64 in the third octet. Inside zone a I carve /20s (4,096 addresses, 4,091 usable in AWS): <code>10.0.0.0/20</code> public, <code>10.0.16.0/20</code> private app, <code>10.0.32.0/20</code> private data, leaving <code>10.0.48.0/20</code> spare; zone b repeats at 10.0.64/20, 10.0.80/20, 10.0.96/20. The public tier could be smaller (/22), but uniform sizes are easy to reason about. I verify with Python's <code>ipaddress</code> or <code>terraform console</code>, and check the /16 against the company IPAM so it never overlaps another network we might peer with.</p>`, followUps: ['How would Kubernetes with VPC-native pod IPs change the sizes?', 'What is Terraform\'s cidrsubnet() and how would you use it here?'] });
  interview.push({ level: 'I', q: 'An instance in a private subnet cannot reach the internet. What do you check?', a: `<p>On the instance: does DNS resolve (<code>dig</code>), and does <code>curl -m 5</code> time out (a drop) or fail differently? Then the network path, in order. 1) The subnet's route table (the explicitly associated one, or the VPC main table): is there <code>0.0.0.0/0 → nat-…</code>? 2) The NAT gateway: state available, has an Elastic IP, and sits in a <b>public</b> subnet whose route table sends <code>0.0.0.0/0</code> to the internet gateway; a NAT in a private subnet is a common mistake. 3) Security group outbound rules (default allow all, but hardened groups may restrict). 4) NACLs on both the instance subnet and the NAT subnet, in both directions, including ephemeral ports. 5) For IPv6, an egress-only internet gateway route. 6) For specific AWS services, consider VPC endpoints instead of internet. Reachability Analyzer can evaluate the path from the instance to the IGW and name the blocking component.</p>`, followUps: ['What happens if the NAT gateway\'s availability zone fails?', 'Why might the NAT gateway bill be unexpectedly high?'] });
  interview.push({ level: 'A', q: 'Two VPCs with overlapping CIDRs need to communicate. What are your options?', a: `<p>Routing requires unique addresses, so peering or transit routing is impossible while both use, say, 10.0.0.0/16; the local route always wins and the platform rejects the peering. Options: <b>1) PrivateLink / endpoint services</b>: expose specific services behind an NLB; the consumer gets an endpoint IP from its own range. No routing between VPCs, overlap is irrelevant, one direction per service. Best for a few APIs. <b>2) Address translation</b>: add a non-overlapping secondary CIDR and use private NAT gateways or appliances so each side sees unique addresses. Works broadly but adds cost, complexity and hides real source IPs. <b>3) Re-IP</b> one side into a unique range and migrate workloads; most work, but the clean long-term fix. <b>4) Go via public endpoints</b> with TLS and auth, which is sometimes simplest for partner integrations. Prevention is an IPAM: allocate unique blocks per account and region, and check overlaps automatically when networks are created.</p>`, followUps: ['How do you discover every CIDR in use across 100 accounts?', 'What breaks in logging when you NAT between VPCs?'] });
  interview.push({ level: 'A', q: 'Some API requests are slow or fail intermittently. How do you find the layer at fault?', a: `<p>I measure instead of guessing. First the pattern: what fraction fails, which errors (timeouts, 502, resets), since when, what changed, and whether it matches something structural (1 in N targets, one AZ, IPv6 only, after N seconds idle). Then I sample with <code>curl -w</code> in a loop with timestamps, which splits each request into DNS, TCP connect, TLS and time to first byte. A jump in DNS points at a resolver timeout; in connect at packet loss, SYN drops or conntrack/NAT limits; in TLS at the terminator; in first byte at the app or its dependencies. I test each backend directly with <code>--resolve</code> or from inside the VPC, check load balancer target health and access logs, and use flow logs or tcpdump on a suspect host to see whether packets arrive and what is answered. Patterns like a 350-second idle reset (NAT timeout) or one bad target show up quickly once you have per-request data.</p>`, followUps: ['How would you correlate this with application traces?', 'What does a TCP retransmission look like in the timings?'] });
  interview.push({ level: 'E', q: 'How do AI tools change network troubleshooting for cloud engineers, and where must you be careful?', a: `<p>They are very good at the reading part: summarising <code>dig +trace</code>, <code>openssl s_client</code>, <code>mtr</code>, tcpdump excerpts and thousands of flow-log lines; mapping cryptic errors to layers; and drafting subnet plans, security group Terraform or check scripts. Cloud consoles increasingly add AI explanations to tools like reachability analysis. The risks are specific. Assistants still slip on subnet arithmetic (unaligned blocks, forgotten reserved IPs), confuse stateful and stateless filters, repeat myths like "DNS takes 48 hours", and default to unsafe fixes: <code>0.0.0.0/0</code>, public IPs on private servers, <code>curl -k</code> or <code>verify=False</code>. Data handling matters too: packet captures and logs can hold customer data and tokens, and private keys must never be pasted anywhere. My approach: use AI to explain and draft, verify maths with deterministic tools (Python <code>ipaddress</code>), keep changes minimal and reviewed, and rely on evidence from the troubleshooting ladder.</p>`, followUps: ['How would you build a guard rail that blocks AI-generated rules opening admin ports to the world?', 'What would you redact before sharing a packet capture?'] });

  // ───────────────────────── Module registration ─────────────────────────
  registerModule({
    id: 'devops03',
    title: 'Networking for Cloud Engineers',
    lang: 'bash',
    langExplain: `<p>Commands are <b>bash</b> because that is what you type on cloud servers and in containers. Subnet maths uses <b>Python's standard <code>ipaddress</code> module</b>, because it is exact, available everywhere and easy to run in the browser; every Python snippet uses only the standard library.</p>`,
    intro: `<p>Most cloud tickets that are not about Linux are about the network: "the site is down", "it works for me but not for them", "the certificate expired", "the new server cannot reach the database", "this instance has no internet". This module gives a <b>Cloud Support Engineer or junior network/cloud engineer</b> a calm, repeatable way to answer them. You will use the TCP/IP model as a troubleshooting ladder, read DNS answers and TTLs, inspect HTTP status codes and TLS certificates, tell "connection refused" from "timed out", do CIDR and subnet maths by hand and with Python, and understand public vs private subnets, NAT, security groups and network ACLs.</p>
      <p>Every topic is tied to a real support situation and ends with commands you can run. Labs use <b>your own machine or a throwaway container</b> (<code>docker run -it --rm ubuntu:24.04 bash</code>, then install <code>dnsutils curl iproute2</code>), and no cloud account is needed: cloud CLI commands are shown read-only for reference. All examples use documentation addresses (<code>192.0.2.0/24</code>, <code>198.51.100.0/24</code>, <code>203.0.113.0/24</code>) and <code>example.com</code>.</p>`,
    goals: [
      'Use the TCP/IP model as a ladder (name → route → port → TLS → HTTP) and map any error message to the layer that failed',
      'Explain ports, listening addresses and the difference between "connection refused", "timed out" and "no route to host", and prove which one you have with <code>ss</code>, <code>nc</code> and <code>curl</code>',
      'Read DNS records and TTLs with <code>dig</code> and <code>getent</code>, and explain why a name resolves on one machine but not another',
      'Diagnose HTTP 5xx from load balancers and TLS certificate problems (expiry, name mismatch, missing chain) with <code>curl -v</code>, <code>--resolve</code> and <code>openssl</code>',
      'Do CIDR maths step by step: sizes, network and broadcast addresses, AWS reserved IPs, equal splits, containment and overlaps, and verify it with Python <code>ipaddress</code>',
      'Explain public vs private subnets, NAT gateways and route tables, and fix a private instance that cannot reach the internet',
      'Compare security groups (stateful) with network ACLs (stateless) and host firewalls, and find the rule that blocks a port',
      'Run a full client-to-server investigation with <code>dig</code>, <code>curl -w</code>, <code>traceroute</code>/<code>mtr</code> and <code>tcpdump</code>'
    ],
    prereqs: `<b>Required: Cloud &amp; DevOps 1</b> (Linux for the Cloud) for the shell, <code>ss</code>, <code>systemctl</code> and <code>journalctl</code>. <b>Helpful:</b> <b>CS Core 10</b> (Networking Basics: OSI &amp; TCP/IP) for layers and encapsulation, <b>CS Core 11</b> (IP Addressing, Subnetting, Routing &amp; NAT) for the theory behind CIDR and routing, and <b>CS Core 13</b> (Application Layer: HTTP, TLS, DNS) for protocol internals. This module builds on them with hands-on cloud-support scenarios instead of repeating them.`,
    hours: 12,
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
